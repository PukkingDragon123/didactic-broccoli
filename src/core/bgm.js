// Background music: streamed <audio> tracks played through the Web Audio music bus (so the Settings
// "Music" slider applies), with crossfades, a playlist, ducking and one-shot stingers. Tracks: see CREDITS.md.
import { audio } from './audio.js';

const DIR = 'audio/music/';
/** Track ids. vol = level in the mix; loop:false = plays once (cue); bpm for anything that dances to it. */
export const TRACKS = {
  menu: { vol: 0.7 }, // Kevin MacLeod - Bossa Antigua
  intro: { vol: 0.75, loop: false }, // Kevin MacLeod - Senbazuru
  party: { vol: 0.8, bpm: 120, beat0: 0.235 }, // Kevin MacLeod - Enter the Party (beats at beat0 + n * 0.5 s)
  garage1: { vol: 0.42 }, // Kevin MacLeod - Easy Lemon
  garage2: { vol: 0.42 }, // Kevin MacLeod - Cool Vibes
  garage3: { vol: 0.4 }, // TAD - A cup of tea
};
export const PLAYLISTS = { garage: ['garage1', 'garage2', 'garage3'] };
/** One-shot jingles for bgm.stinger(id). */
export const STINGERS = ['jingle_task', 'jingle_open', 'jingle_new', 'jingle_complete', 'jingle_reveal_rare', 'jingle_reveal_ultra'];
const XF = 2.5; // seconds of crossfade when a track wraps round or the playlist moves on

const live = new Set(); // every streaming element, so they can pause with the page

/** One streamed file -> gain -> dest. Never throws; `failed` is set if the browser can't play it. */
export class Stream {
  constructor(src, dest, vol = 0) {
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.src = src;
    this.node = audio.ctx.createMediaElementSource(this.el);
    this.g = audio.ctx.createGain();
    this.g.gain.value = vol;
    this.node.connect(this.g).connect(dest);
    this.el.addEventListener('error', () => this.fail());
    this.el.addEventListener('ended', () => this.onended?.());
    live.add(this);
  }
  fail() { if (this.failed) return; this.failed = true; this.onfail?.(); }
  play() {
    if (this.dead || document.hidden) { this.wasPlaying = true; return; }
    try { this.el.play()?.catch?.((e) => { if (e?.name !== 'AbortError') this.fail(); }); } catch { this.fail(); }
  }
  /** Start somewhere in the middle (radio tuning in mid-song). */
  seekRandom(max = 0.75) {
    const go = () => { try { if (isFinite(this.el.duration)) this.el.currentTime = Math.random() * this.el.duration * max; } catch { /* not seekable */ } };
    if (this.el.readyState >= 1) go(); else this.el.addEventListener('loadedmetadata', go, { once: true });
  }
  fade(v, sec) {
    const g = this.g.gain, t = audio.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + Math.max(0.02, sec));
  }
  get left() { const d = this.el.duration; return isFinite(d) ? d - this.el.currentTime : Infinity; }
  /** Fade out, then release the element. */
  kill(sec = 0.5) {
    if (this.dead) return;
    this.dead = true;
    this.fade(0, sec);
    setTimeout(() => this.dispose(), sec * 1000 + 150);
  }
  dispose() {
    this.dead = true;
    live.delete(this);
    try { this.el.pause(); this.el.removeAttribute('src'); this.el.load(); this.node.disconnect(); this.g.disconnect(); } catch { /* gone */ }
  }
}

class BGM {
  constructor() {
    this.current = null; // the playing track / playlist id
    this.voices = [];
    this.ducks = new Map(); // key -> level
    this.ends = new Map(); // key -> audio time a timed duck ends
    this.want = null;
    audio.onReady(() => { if (this.want) this.play(...this.want); });
  }

  setup() {
    if (this.bus) return true;
    if (!audio.ready) return false;
    this.bus = audio.ctx.createGain(); // tracks -> duck -> music bus
    this.bus.connect(audio.music);
    this.timer = setInterval(() => this.tick(), 250);
    document.addEventListener('visibilitychange', () => this.visibility());
    audio.onDuck = (sec) => this.duckFor(sec); // long sfx jingles dip the bed too
    for (const id of STINGERS) setTimeout(() => audio.loadBuffer('music/' + id), 3000);
    return true;
  }

  /** Crossfade to a track id or the 'garage' playlist. Calling it again with the playing id only adjusts volume. */
  play(id, { fade = 1.5, loop = true, vol = 1 } = {}) {
    try {
      if (!this.setup()) { this.want = [id, { fade, loop, vol }]; return; }
      this.want = null;
      const list = PLAYLISTS[id];
      if (!list && !TRACKS[id]) { console.warn('bgm: no track', id); return; }
      this.loop = loop; this.vol = vol;
      const cur = this.voice;
      if (id === this.current && cur) { cur.fade(TRACKS[cur.tid].vol * vol, fade); return; }
      this.current = id;
      this.list = list ? [...list].sort(() => Math.random() - 0.5) : null;
      this.idx = 0;
      this.start(this.list ? this.list[0] : id, fade);
    } catch (e) { console.warn('bgm', e); }
  }

  get voice() { return this.voices.find((v) => !v.dead) || null; }
  /** BPM of the playing track (if it has one). */
  get bpm() { return TRACKS[this.voice?.tid]?.bpm || null; }
  /** Seconds into the playing track (null when nothing plays or it failed); sync dancers with time - TRACKS.party.beat0. */
  get time() { const v = this.voice; return v && !v.failed ? v.el.currentTime : null; }

  start(tid, fade) {
    for (const v of this.voices) v.kill(fade);
    const v = new Stream(DIR + tid + '.mp3', this.bus, 0);
    v.tid = tid;
    v.onfail = () => { if (v === this.voice && this.list) setTimeout(() => this.next(), 1000); };
    this.voices = [...this.voices.filter((x) => !x.dead), v];
    v.play();
    v.fade(TRACKS[tid].vol * this.vol, fade);
  }

  next() {
    if (!this.list) return;
    this.idx = (this.idx + 1) % this.list.length;
    this.start(this.list[this.idx], XF);
  }

  tick() {
    this.voices = this.voices.filter((x) => !x.dead || live.has(x));
    const v = this.voice;
    if (!v || v.failed || v.el.paused || v.left > XF + 0.3) return;
    if (this.list) this.next();
    else if (this.loop && TRACKS[v.tid].loop !== false) this.start(v.tid, XF);
    else { v.kill(Math.max(0.1, v.left)); this.current = null; } // a one-off cue ends
  }

  stop(fade = 1.5) {
    this.want = null;
    this.current = null;
    for (const v of this.voices) v.kill(fade);
  }

  /** Dip the music bed (radio on, dialogue...). Several callers can duck at once via `key`; the deepest wins. */
  duck(on, amount = 0.25, key = 'default', until = 0) {
    if (on) { this.ducks.set(key, amount); if (until) this.ends.set(key, until); } else { this.ducks.delete(key); this.ends.delete(key); }
    if (!this.setup()) return;
    const g = this.bus.gain, t = audio.ctx.currentTime;
    const level = (at) => Math.min(1, ...[...this.ducks].filter(([k]) => !(this.ends.get(k) <= at)).map(([, v]) => v));
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(level(t), t + (on ? 0.4 : 1.2));
    // timed ducks (stingers) are released on the audio clock, so a busy main thread can't hold the bed down
    for (const e of [...this.ends.values()].filter((e) => e > t + 0.4).sort((a, b) => a - b)) {
      g.setValueAtTime(level(e - 0.01), e); g.linearRampToValueAtTime(level(e), e + 1.2);
    }
  }

  duckFor(sec, amount = 0.3) {
    if (!this.setup()) return;
    const key = 'st' + Math.random();
    this.duck(true, amount, key, audio.ctx.currentTime + sec);
    setTimeout(() => { this.ducks.delete(key); this.ends.delete(key); }, (sec + 1.5) * 1000);
  }

  /** One-shot jingle over the bed (which dips while it plays). */
  stinger(id, vol = 1) {
    try {
      if (!this.setup()) return;
      audio.loadBuffer('music/' + id).then((buf) => {
        if (!buf || document.hidden) return;
        const ctx = audio.ctx, s = ctx.createBufferSource(), g = ctx.createGain();
        s.buffer = buf; g.gain.value = 0.8 * vol;
        s.connect(g).connect(audio.music);
        s.start(ctx.currentTime + 0.02, buf._head);
        this.duckFor(buf.duration);
      });
    } catch (e) { console.warn('bgm', e); }
  }

  /** Pause all music (and the rest of the audio) while the tab is hidden. */
  visibility() {
    const hidden = document.hidden;
    try { (hidden ? audio.ctx.suspend() : audio.ctx.resume())?.catch?.(() => {}); } catch { /* closed */ }
    for (const s of live) {
      if (hidden) { if (!s.el.paused) { s.wasPlaying = true; s.el.pause(); } }
      else if (s.wasPlaying && !s.dead) { s.wasPlaying = false; s.play(); }
    }
  }
}

export const bgm = new BGM();
if (/[?&](debug|autotest)\b/.test(location.search)) window.__bgm = bgm;
