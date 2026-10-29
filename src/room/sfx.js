// 8-bit sounds for your room, the desktop and the PC games (registered as synth voices in the shared audio engine,
// so audio.play('chipJump') etc. work like any other sound), plus a tiny chiptune sequencer for game music,
// jingles and the bedtime lullaby (played through the Music bus so the Music slider applies).
import { audio, SOUNDS } from '../core/audio.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

const V = {
  // ---------------------------------------------------------------- room
  roomDoorOpen(a, t, o) {
    a.burst(o, t, { dur: 0.05, vol: 0.25, type: 'highpass', f: 2200 }); // latch
    a.tone(o, t, { type: 'square', f: 1900, f2: 1500, dur: 0.03, vol: 0.02 });
    a.burst(o, t + 0.08, { dur: 0.5, vol: 0.05, type: 'bandpass', f: 700, f2: 1100, q: 6 }); // hinge creak
    a.tone(o, t + 0.1, { type: 'sawtooth', f: 180, f2: 260, dur: 0.4, vol: 0.012, curve: 'lin' });
  },
  roomDoorClose(a, t, o) {
    a.tone(o, t, { f: 110, f2: 55, dur: 0.22, vol: 0.4 });
    a.burst(o, t, { dur: 0.16, vol: 0.3, type: 'lowpass', f: 900, buf: a.pink });
    a.burst(o, t + 0.05, { dur: 0.03, vol: 0.2, type: 'highpass', f: 2600 });
    a.tone(o, t + 0.05, { type: 'square', f: 2100, dur: 0.02, vol: 0.015 });
  },
  roomPull(a, t, o) {
    a.burst(o, t, { dur: 0.02, vol: 0.2, type: 'highpass', f: 3000 });
    a.burst(o, t + 0.06, { dur: 0.025, vol: 0.14, type: 'highpass', f: 2400 });
    a.tone(o, t, { f: 90, f2: 50, dur: 0.06, vol: 0.05 });
  },
  roomAlarm(a, t, o) {
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) a.tone(o, t + r * 0.55 + i * 0.09, { type: 'square', f: 2093, dur: 0.06, vol: 0.025, curve: 'lin' });
  },
  roomBirds(a, t, o) {
    for (let i = 0; i < 7; i++) {
      const tt = t + i * rand(0.14, 0.3), f = rand(2600, 3800);
      a.tone(o, tt, { f, f2: f * rand(1.2, 1.5), dur: rand(0.05, 0.09), vol: 0.02 });
      a.tone(o, tt + 0.07, { f: f * 1.3, f2: f * 0.9, dur: 0.05, vol: 0.015 });
    }
  },
  roomSnore(a, t, o) {
    a.burst(o, t, { dur: 0.9, vol: 0.05, type: 'lowpass', f: 300, f2: 500, buf: a.brown, attack: 0.4 });
  },
  // ---------------------------------------------------------------- desktop
  osBoot(a, t, o) {
    // a warm four-note start-up chime
    [60, 67, 72, 76].forEach((n, i) => a.bell(o, t + i * 0.13, NOTE(n + 12), { dur: 1.4 - i * 0.2, vol: 0.05, partials: [1, 2, 3], decays: [1, 0.5, 0.3] }));
    a.tone(o, t + 0.39, { type: 'triangle', f: NOTE(48), dur: 1.2, vol: 0.06, attack: 0.05 });
  },
  osOff(a, t, o) {
    [76, 72, 67, 60].forEach((n, i) => a.tone(o, t + i * 0.09, { type: 'triangle', f: NOTE(n), dur: 0.25, vol: 0.05 }));
    a.tone(o, t + 0.36, { f: 12000, f2: 200, dur: 0.25, vol: 0.01 });
  },
  osClick(a, t, o) { a.tone(o, t, { type: 'square', f: 1800, dur: 0.012, vol: 0.02 }); },
  osOpen(a, t, o) { a.tone(o, t, { wave: a.pulse(0.25), f: NOTE(79), dur: 0.05, vol: 0.03 }); a.tone(o, t + 0.05, { wave: a.pulse(0.25), f: NOTE(86), dur: 0.08, vol: 0.03 }); },
  osClose(a, t, o) { a.tone(o, t, { wave: a.pulse(0.25), f: NOTE(84), dur: 0.05, vol: 0.025 }); a.tone(o, t + 0.05, { wave: a.pulse(0.25), f: NOTE(77), dur: 0.07, vol: 0.025 }); },
  osError(a, t, o) { a.tone(o, t, { wave: a.pulse(0.5), f: 196, dur: 0.18, vol: 0.04 }); a.tone(o, t, { wave: a.pulse(0.5), f: 207, dur: 0.18, vol: 0.03 }); },
  osMail(a, t, o) { a.bell(o, t, NOTE(88), { dur: 0.6, vol: 0.05, partials: [1, 2.4], decays: [1, 0.4] }); a.bell(o, t + 0.12, NOTE(93), { dur: 0.9, vol: 0.05, partials: [1, 2.4], decays: [1, 0.4] }); },
  osCoin(a, t, o) { a.tone(o, t, { type: 'square', f: NOTE(83), dur: 0.07, vol: 0.03 }); a.tone(o, t + 0.07, { type: 'square', f: NOTE(88), dur: 0.25, vol: 0.03 }); },
  omikujiShake(a, t, o) { for (let i = 0; i < 10; i++) a.burst(o, t + i * 0.045 + rand(0, 0.01), { dur: 0.03, vol: 0.12, type: 'bandpass', f: rand(1800, 3200), q: 3 }); },
  omikujiDraw(a, t, o) { a.burst(o, t, { dur: 0.12, vol: 0.12, type: 'bandpass', f: 1400, f2: 2600, q: 2 }); a.tone(o, t + 0.1, { type: 'triangle', f: NOTE(81), dur: 0.15, vol: 0.04 }); },
  fortuneGood(a, t, o) { [72, 76, 79, 84, 88].forEach((n, i) => a.tone(o, t + i * 0.07, { wave: a.pulse(0.25), f: NOTE(n), dur: 0.12, vol: 0.03 })); a.bell(o, t + 0.36, NOTE(96), { dur: 1.2, vol: 0.04 }); },
  fortuneBad(a, t, o) { [67, 63, 60].forEach((n, i) => a.tone(o, t + i * 0.16, { wave: a.pulse(0.5), f: NOTE(n), dur: 0.2, vol: 0.03 })); },
  paintDot(a, t, o) { a.tone(o, t, { type: 'square', f: rand(900, 1300), dur: 0.01, vol: 0.006 }); },
  // ---------------------------------------------------------------- games
  chipMove(a, t, o) { a.tone(o, t, { wave: a.pulse(0.125), f: 520, dur: 0.025, vol: 0.02 }); },
  chipRotate(a, t, o) { a.tone(o, t, { wave: a.pulse(0.25), f: 700, f2: 1050, dur: 0.05, vol: 0.022 }); },
  chipLand(a, t, o) { a.tone(o, t, { type: 'triangle', f: 160, f2: 80, dur: 0.08, vol: 0.12 }); a.burst(o, t, { dur: 0.03, vol: 0.05, type: 'lowpass', f: 900 }); },
  chipPop(a, t, o, p) {
    const n = 72 + PENTA[Math.min(PENTA.length - 1, (p.n || 1) - 1 + (p.k || 0))];
    a.tone(o, t, { wave: a.pulse(0.25), f: NOTE(n), dur: 0.08, vol: 0.035 });
    a.tone(o, t + 0.06, { wave: a.pulse(0.25), f: NOTE(n + 7), dur: 0.14, vol: 0.03 });
    a.burst(o, t, { dur: 0.06, vol: 0.06, type: 'highpass', f: 3000 });
  },
  chipChain(a, t, o, p) {
    const base = 72 + Math.min(12, (p.n || 2) * 2);
    [0, 4, 7, 12].forEach((iv, i) => a.tone(o, t + i * 0.05, { wave: a.pulse(0.125), f: NOTE(base + iv), dur: 0.08, vol: 0.03 }));
  },
  chipLevel(a, t, o) { [67, 72, 76, 79, 84].forEach((n, i) => a.tone(o, t + i * 0.06, { wave: a.pulse(0.25), f: NOTE(n), dur: 0.1, vol: 0.03 })); },
  chipOver(a, t, o) { [72, 67, 64, 60, 55].forEach((n, i) => a.tone(o, t + i * 0.14, { wave: a.pulse(0.5), f: NOTE(n), dur: 0.16, vol: 0.035, curve: 'lin' })); a.tone(o, t + 0.7, { type: 'triangle', f: NOTE(43), dur: 0.6, vol: 0.1 }); },
  chipStart(a, t, o) { [60, 64, 67, 72].forEach((n, i) => a.tone(o, t + i * 0.08, { wave: a.pulse(0.25), f: NOTE(n + 12), dur: 0.1, vol: 0.03 })); },
  chipSelect(a, t, o) { a.tone(o, t, { wave: a.pulse(0.25), f: NOTE(84), dur: 0.04, vol: 0.025 }); },
  chipJump(a, t, o) { a.tone(o, t, { wave: a.pulse(0.25), f: 330, f2: 880, dur: 0.12, vol: 0.03 }); },
  chipJump2(a, t, o) { a.tone(o, t, { wave: a.pulse(0.125), f: 520, f2: 1400, dur: 0.12, vol: 0.03 }); a.tone(o, t + 0.04, { wave: a.pulse(0.125), f: 700, f2: 1800, dur: 0.1, vol: 0.02 }); },
  chipCoin(a, t, o, p) { const k = p.k || 0; a.tone(o, t, { type: 'square', f: NOTE(83 + k), dur: 0.05, vol: 0.025 }); a.tone(o, t + 0.05, { type: 'square', f: NOTE(88 + k), dur: 0.12, vol: 0.025 }); },
  chipPower(a, t, o) { for (let i = 0; i < 8; i++) a.tone(o, t + i * 0.04, { wave: a.pulse(0.125), f: NOTE(64 + i * 3), dur: 0.05, vol: 0.025 }); },
  chipHit(a, t, o) { a.burst(o, t, { dur: 0.25, vol: 0.2, type: 'lowpass', f: 1800, f2: 200 }); a.tone(o, t, { wave: a.pulse(0.5), f: 300, f2: 60, dur: 0.3, vol: 0.05 }); },
  chipShield(a, t, o) { a.tone(o, t, { wave: a.pulse(0.5), f: 900, f2: 300, dur: 0.2, vol: 0.03 }); a.burst(o, t, { dur: 0.15, vol: 0.08, type: 'highpass', f: 2500 }); },
  chipCatch(a, t, o, p) { const n = 76 + PENTA[Math.min(PENTA.length - 1, p.k || 0)]; a.tone(o, t, { wave: a.pulse(0.25), f: NOTE(n), dur: 0.06, vol: 0.03 }); a.tone(o, t + 0.05, { wave: a.pulse(0.25), f: NOTE(n + 12), dur: 0.08, vol: 0.02 }); },
  chipMiss(a, t, o) { a.tone(o, t, { wave: a.pulse(0.5), f: 260, f2: 130, dur: 0.18, vol: 0.035 }); },
  chipBolt(a, t, o) { a.burst(o, t, { dur: 0.12, vol: 0.15, type: 'bandpass', f: 1200, q: 4 }); a.tone(o, t, { type: 'square', f: 150, f2: 90, dur: 0.2, vol: 0.04 }); },
};
for (const [k, fn] of Object.entries(V)) if (!SOUNDS[k]) SOUNDS[k] = fn;

export const sfx = (name, opts = {}) => { try { audio.play(name, opts); } catch { /* audio not ready */ } };

// ------------------------------------------------------------------ chiptune sequencer
const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "C5 . E5 - G#4" -> [midi|null|'-'] (one token per step). */
function parse(str) {
  return str.replace(/\|/g, ' ').trim().split(/\s+/).map((tk) => {
    if (tk === '.' || tk === '-') return tk === '-' ? '-' : null;
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(tk);
    if (!m) return null;
    return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  });
}

/** Songs: bpm, steps per beat, channels (lead/bass/arp as note strings; drums as k/s/h strings). */
export const SONGS = {
  drop: {
    bpm: 150, div: 2,
    lead: 'E5 . G5 E5 C5 . D5 E5 | F5 - E5 D5 C5 - - . | D5 . F5 D5 B4 . C5 D5 | E5 - D5 C5 G4 - - . | E5 . G5 E5 C6 - B5 A5 | G5 - A5 G5 E5 - - . | F5 E5 D5 . E5 D5 C5 . | D5 - G4 - C5 - - .',
    bass: 'C3 . G3 . C3 . G3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | E2 . B2 . E2 . B2 . | F2 . C3 . G2 . D3 . | G2 . D3 . C3 . G2 .',
    drums: 'k.s.k.s.|k.s.k.s.|k.s.k.s.|k.s.kks.|k.s.k.s.|k.s.k.s.|k.s.k.s.|k.s.k.ss',
    duty: 0.25, leadVol: 0.022, bassVol: 0.07,
  },
  run: {
    bpm: 164, div: 2,
    lead: 'A4 . C5 E5 A5 - G5 E5 | F5 - E5 C5 D5 - - . | G4 . B4 D5 G5 - F5 D5 | E5 - D5 B4 C5 - - . | A4 . C5 E5 A5 - B5 C6 | B5 - A5 G5 A5 - E5 . | F5 . G5 A5 G5 F5 E5 D5 | E5 - - - E4 . G#4 B4',
    bass: 'A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . | G2 . G3 . G2 . G3 . | C3 . C4 . C3 . C4 . | A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . | D3 . D4 . D3 . D4 . | E2 . E3 . E2 . E3 .',
    drums: 'k.s.kks.|k.s.kks.|k.s.kks.|k.s.ksss|k.s.kks.|k.s.kks.|k.s.kks.|k.s.ssss',
    duty: 0.125, leadVol: 0.02, bassVol: 0.07,
  },
  catch: {
    bpm: 136, div: 2,
    lead: 'G5 . E5 . C5 E5 G5 . | A5 . G5 . E5 - - . | F5 . D5 . B4 D5 F5 . | G5 . F5 . D5 - - . | E5 . G5 . C6 . B5 A5 | G5 . E5 . C5 - D5 E5 | F5 . A5 . G5 . F5 D5 | C5 - - . G4 - - .',
    bass: 'C3 . . C3 G2 . . . | A2 . . A2 E2 . . . | D3 . . D3 A2 . . . | G2 . . G2 D3 . . . | C3 . . C3 G2 . . . | A2 . . A2 E2 . . . | F2 . . F2 G2 . . . | C3 . G2 . C3 . . .',
    drums: 'k.h.s.h.|k.h.s.h.|k.h.s.h.|k.h.s.hh|k.h.s.h.|k.h.s.h.|k.h.s.h.|k.k.s.ss',
    duty: 0.25, leadVol: 0.02, bassVol: 0.065,
  },
  lullaby: {
    bpm: 76, div: 2, bell: true, loop: false,
    lead: 'E5 - G5 - E5 - D5 C5 | D5 - E5 - G5 - - - | A5 - G5 - E5 - D5 C5 | D5 - - - - - - - | E5 - G5 - E5 - D5 C5 | A4 - C5 - D5 - E5 - | D5 - C5 - A4 - G4 - | C5 - - - - - - -',
    bass: 'C3 - - - G3 - - - | G2 - - - D3 - - - | A2 - - - E3 - - - | G2 - - - D3 - - - | C3 - - - G3 - - - | F2 - - - C3 - - - | G2 - - - - - - - | C3 - - - - - - -',
    drums: '',
    leadVol: 0.05, bassVol: 0.05,
  },
};

/** Play a song; returns a handle { stop(fade), setRate(k) }. Loops unless song.loop === false. */
export function playSong(id, { vol = 1, rate = 1 } = {}) {
  const song = SONGS[id];
  if (!song || !audio.ready) return { stop() {}, setRate() {} };
  const ctx = audio.ctx;
  const outG = ctx.createGain(); outG.gain.value = vol;
  outG.connect(audio.music);
  const lead = parse(song.lead), bass = parse(song.bass), drums = (song.drums || '').replace(/\|/g, '');
  const n = lead.length;
  const h = { step: 0, rate, next: ctx.currentTime + 0.08, dead: false };
  const stepDur = () => 60 / (song.bpm * h.rate) / song.div;
  const len = (arr, i) => { let k = 1; while (arr[(i + k) % n] === '-' && k < n) k++; return k; };
  const tick = () => {
    if (h.dead) return;
    while (h.next < ctx.currentTime + 0.2) {
      const i = h.step % n, t = h.next, sd = stepDur();
      if (song.loop === false && h.step >= n) { h.stop(0.5); return; }
      const ln = lead[i];
      if (typeof ln === 'number') {
        const d = len(lead, i) * sd;
        if (song.bell) audio.bell(outG, t, NOTE(ln), { dur: d * 1.8 + 0.4, vol: song.leadVol, partials: [1, 2, 3.99], decays: [1, 0.35, 0.15] });
        else audio.tone(outG, t, { wave: audio.pulse(song.duty || 0.25), f: NOTE(ln), dur: d * 0.92, vol: song.leadVol, attack: 0.004, curve: 'lin' });
      }
      const bn = bass[i % bass.length];
      if (typeof bn === 'number') {
        const d = len(bass, i % bass.length) * sd;
        audio.tone(outG, t, { type: song.bell ? 'sine' : 'triangle', f: NOTE(bn), dur: d * 0.95, vol: song.bassVol, attack: 0.005, curve: 'lin' });
      }
      const dr = drums[i % Math.max(1, drums.length)];
      if (dr === 'k') audio.tone(outG, t, { type: 'sine', f: 150, f2: 45, dur: 0.12, vol: 0.12 });
      else if (dr === 's') audio.burst(outG, t, { dur: 0.08, vol: 0.06, type: 'bandpass', f: 2600, q: 0.9 });
      else if (dr === 'h') audio.burst(outG, t, { dur: 0.03, vol: 0.025, type: 'highpass', f: 7000 });
      h.step++;
      h.next += sd;
    }
  };
  const timer = setInterval(tick, 30);
  tick();
  h.setRate = (k) => { h.rate = k; };
  h.stop = (fade = 0.3) => {
    if (h.dead) return;
    h.dead = true;
    clearInterval(timer);
    const t = ctx.currentTime;
    outG.gain.cancelScheduledValues(t); outG.gain.setValueAtTime(outG.gain.value, t); outG.gain.linearRampToValueAtTime(0, t + Math.max(0.02, fade));
    setTimeout(() => { try { outG.disconnect(); } catch { /* gone */ } }, fade * 1000 + 3000);
  };
  return h;
}
