// Real voices: the browser's text-to-speech (speechSynthesis) layered over the 8-bit blips. Every character has a
// voice profile (gender, pitch, rate, a seed that picks one of the matching system voices so they always sound the
// same); Japanese lines use a Japanese voice when the system has one (and stay blips-only when it doesn't).
// Switched off in Settings ("Real voices": game.state.settings.voice === false).
//   speech.speak(text, profile, { priority: 'talk' | 'self' | 'ambient' })   -> true if it was spoken
//   speech.stop()   speech.busy   speech.enabled
//   profile: { gender: 'm' | 'f' | 'x', pitch (0.1..2), rate (0.5..2), seed, lang: 'en' | 'ja' (forced), volume }
// Priority: chat lines ('talk') cut everything else; your own murmurs ('self') cut ambient chatter; ambient lines
// (people on the street) only play when nobody else is speaking, so the voices never pile up behind the text.

const FEMALE = /female|woman|samantha|victoria|karen|moira|tessa|fiona|veena|zira|susan|hazel|heera|kyoko|haruka|ayumi|nanami|sayaka|mizuki|google uk english female|serena|allison|ava|kate|joanna|salli|kimberly|ivy|emma|amy|aria|jenny|libby|sonia|natasha/i;
const MALE = /\bmale\b|man\b|alex|daniel|fred|rishi|david|mark|george|james|otoya|ichiro|keita|hattori|google uk english male|tom|aaron|arthur|oliver|ryan|guy|christopher|eric|brian|matthew|joey|justin|kevin/i;
const JA = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;

export class Speech {
  constructor(game) {
    this.game = game;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.current = null; // { priority, utt }
    this.load();
    if (this.synth) {
      try { this.synth.addEventListener?.('voiceschanged', () => this.load()); } catch { /* old browsers */ }
      // stop talking when the tab goes away or the game pauses
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); });
    }
  }

  load() {
    try { this.voices = this.synth?.getVoices?.() || []; } catch { this.voices = []; }
    this.cache = new Map();
  }

  // (automated browsers have no voices and can block on the speech service: stay silent there)
  get enabled() { return !!this.synth && this.game.state.settings?.voice !== false && !navigator.webdriver; }
  get busy() { return !!this.synth && (this.synth.speaking || this.synth.pending); }

  /** The system voice for a profile + language (null: none fits). */
  pick(profile, lang) {
    if (!this.voices.length) this.load();
    const key = `${lang}|${profile.gender || 'x'}|${profile.seed || 0}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const pre = lang === 'ja' ? /^ja/i : /^en/i;
    let pool = this.voices.filter((v) => pre.test(v.lang || ''));
    if (!pool.length && lang === 'en') pool = this.voices.filter((v) => !JA.test(v.name) && !/^(ja|zh|ko)/i.test(v.lang || ''));
    let out = null;
    if (pool.length) {
      const g = profile.gender;
      const want = g === 'f' ? pool.filter((v) => FEMALE.test(v.name)) : g === 'm' ? pool.filter((v) => MALE.test(v.name) && !FEMALE.test(v.name)) : [];
      const list = want.length ? want : pool;
      // prefer local voices (no network round trip), then the seed picks one of them
      const local = list.filter((v) => v.localService);
      const L = local.length ? local : list;
      out = L[Math.abs(profile.seed | 0) % L.length];
    }
    this.cache.set(key, out);
    return out;
  }

  /** Speak a line. Returns true if speech started (false: off, no voice, or politely skipped). */
  speak(text, profile = {}, { priority = 'ambient' } = {}) {
    if (!this.enabled) return false;
    const clean = String(text || '')
      .replace(/\*[^*]+\*/g, ' ') // *yawn* stage directions
      .replace(/[ゴドメ]{3,}/g, ' ')
      .replace(/\.\.\./g, ', ')
      .replace(/\s+/g, ' ').trim();
    if (!clean || !/[a-z0-9぀-鿿]/i.test(clean)) return false;
    const lang = profile.lang || (JA.test(clean) ? 'ja' : 'en');
    if (!this.voices.length) this.load();
    if (!this.voices.length) return false; // no system voices (yet): the blips carry it
    const voice = this.pick(profile, lang);
    if (!voice && lang === 'ja') return false; // no Japanese voice: the blips carry it
    const s = this.synth;
    const rank = { ambient: 0, self: 1, talk: 2 };
    if (this.busy) {
      const cur = this.current && !this.current.done ? this.current.priority : 'ambient';
      if (rank[priority] < rank[cur] || (priority === 'ambient')) return false;
      s.cancel();
    }
    let u;
    try { u = new SpeechSynthesisUtterance(clean); } catch { return false; }
    if (voice) u.voice = voice;
    u.lang = voice?.lang || (lang === 'ja' ? 'ja-JP' : 'en-US');
    u.pitch = Math.max(0.1, Math.min(2, profile.pitch ?? 1));
    u.rate = Math.max(0.5, Math.min(2, profile.rate ?? 1.05));
    const master = this.game.state.settings?.master ?? 1;
    u.volume = Math.max(0, Math.min(1, master * (profile.volume ?? 0.9)));
    const rec = { priority, utt: u, done: false };
    u.onend = u.onerror = () => { rec.done = true; };
    this.current = rec;
    try { s.speak(u); } catch { return false; }
    return true;
  }

  stop() { try { this.synth?.cancel(); } catch { /* ignore */ } if (this.current) this.current.done = true; }
}

/** A stable voice profile for a Human (gender from the spec, pitch from height and age). */
export function profileOf(h, extra = {}) {
  const sp = h?.spec || {};
  const g = sp.sex === 'f' ? 'f' : sp.sex === 'm' ? 'm' : 'x';
  const H = h?.height || sp.H || 1.65;
  const age = sp.age;
  let pitch = g === 'f' ? 1.15 : 0.92;
  pitch += (1.68 - H) * 0.9;
  if (age === 'kid') pitch += 0.35;
  if (age === 'elder') pitch -= 0.08;
  const rate = age === 'elder' ? 0.9 : age === 'kid' ? 1.12 : 1.04;
  return { gender: g, pitch: Math.max(0.5, Math.min(1.9, pitch)), rate, seed: Math.abs((sp.seed ?? 3) | 0), ...extra };
}
