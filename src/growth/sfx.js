// Sounds for the growth features, as synth voices in the shared audio engine (audio.play('elevDing') etc.), plus two
// loops (the escalator's hum and the lift motor) and the lift's muzak for src/room/sfx.js' chiptune player.
import { SOUNDS, LOOPS } from '../core/audio.js';
import { SONGS } from '../room/sfx.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

Object.assign(SOUNDS, {
  /** A hanko pressed onto paper: a dull thunk and a little paper rasp. */
  stampThunk(a, t, o) {
    a.tone(o, t, { f: 140, f2: 60, dur: 0.12, vol: 0.35 });
    a.burst(o, t, { dur: 0.08, vol: 0.25, type: 'lowpass', f: 700, buf: a.pink });
    a.burst(o, t + 0.05, { dur: 0.12, vol: 0.06, type: 'bandpass', f: 3200, q: 2 });
  },
  /** The lift's arrival bell: two soft bell notes. */
  elevDing(a, t, o) {
    a.bell(o, t, NOTE(81), { dur: 1.4, vol: 0.16, partials: [1, 2, 3.01], decays: [1, 0.4, 0.2] });
    a.bell(o, t + 0.32, NOTE(77), { dur: 1.8, vol: 0.14, partials: [1, 2, 3.01], decays: [1, 0.4, 0.2] });
  },
  /** Lift doors sliding: a rumble with a soft thump at the end. */
  elevDoor(a, t, o) {
    a.burst(o, t, { dur: 0.75, vol: 0.07, type: 'bandpass', f: 380, f2: 520, q: 2, buf: a.pink, attack: 0.08 });
    a.tone(o, t + 0.72, { f: 90, f2: 60, dur: 0.12, vol: 0.12 });
  },
  /** A lift button: a click and a beep. */
  elevButton(a, t, o) {
    a.burst(o, t, { dur: 0.02, vol: 0.18, type: 'highpass', f: 2600 });
    a.tone(o, t + 0.02, { type: 'square', f: 1568, dur: 0.07, vol: 0.025, curve: 'lin' });
  },
  /** Stepping onto the escalator: the comb plate clack. */
  escStep(a, t, o) {
    a.burst(o, t, { dur: 0.05, vol: 0.2, type: 'bandpass', f: 1800, q: 3 });
    a.tone(o, t, { f: 220, f2: 120, dur: 0.06, vol: 0.08 });
  },
  /** The department-store announcement chime (ding-dong-dang-dong, pinpon). */
  mallChime(a, t, o) {
    [76, 72, 74, 67].forEach((n, i) => a.bell(o, t + i * 0.38, NOTE(n), { dur: 1.2, vol: 0.12, partials: [1, 2, 3.99], decays: [1, 0.3, 0.12] }));
  },
  /** The bath panel's tune: "the bath is ready" (a little 8-bit jingle, then the chirpy voice blips). */
  ofuroReady(a, t, o) {
    const w = a.pulse(0.25);
    [72, 76, 79, 84, 79, 84].forEach((n, i) => a.tone(o, t + i * 0.16, { wave: w, f: NOTE(n), dur: 0.14, vol: 0.03, curve: 'lin' }));
    for (let i = 0; i < 9; i++) a.tone(o, t + 1.1 + i * 0.09, { wave: w, f: rand(900, 1400), dur: 0.07, vol: 0.018, curve: 'lin' });
  },
  /** Running water into the tub. */
  bathFill(a, t, o) {
    a.burst(o, t, { dur: 2.4, vol: 0.12, type: 'bandpass', f: 1200, f2: 800, q: 0.8, attack: 0.2 });
    a.burst(o, t + 0.1, { dur: 2.2, vol: 0.05, type: 'highpass', f: 4000, attack: 0.3 });
  },
  /** Getting into the bath. */
  bathSplash(a, t, o) {
    a.burst(o, t, { dur: 0.6, vol: 0.18, type: 'bandpass', f: 900, f2: 400, q: 0.7 });
    for (let i = 0; i < 6; i++) a.tone(o, t + 0.2 + i * rand(0.08, 0.18), { f: rand(500, 900), f2: rand(900, 1500), dur: 0.05, vol: 0.03 });
  },
  /** Something sizzling in the pan. */
  sizzle(a, t, o) {
    a.burst(o, t, { dur: 1.1, vol: 0.09, type: 'highpass', f: 3500, attack: 0.05 });
    for (let i = 0; i < 8; i++) a.burst(o, t + rand(0, 1), { dur: 0.02, vol: 0.06, type: 'highpass', f: 5000 });
  },
  /** A gas ring lighting: click-click-whump. */
  gasOn(a, t, o) {
    for (let i = 0; i < 3; i++) a.burst(o, t + i * 0.09, { dur: 0.015, vol: 0.2, type: 'highpass', f: 4000 });
    a.burst(o, t + 0.3, { dur: 0.35, vol: 0.12, type: 'lowpass', f: 400, buf: a.brown, attack: 0.02 });
  },
  /** Junk going into a bag. */
  junkBag(a, t, o) {
    a.burst(o, t, { dur: 0.25, vol: 0.14, type: 'bandpass', f: 1400, f2: 900, q: 1.5 });
    a.burst(o, t + 0.18, { dur: 0.2, vol: 0.1, type: 'lowpass', f: 600, buf: a.pink });
    a.tone(o, t + 0.2, { f: 160, f2: 90, dur: 0.1, vol: 0.12 });
  },
  /** A fluorescent tube starting: ticks, a flicker buzz, then the hum. */
  tubeStart(a, t, o) {
    for (let i = 0; i < 4; i++) a.burst(o, t + i * rand(0.1, 0.22), { dur: 0.02, vol: 0.12, type: 'highpass', f: 3000 });
    a.tone(o, t + 0.6, { type: 'sawtooth', f: 100, dur: 0.6, vol: 0.02, curve: 'lin' });
  },
  /** A roller of paint on a wall. */
  paintRoll(a, t, o) {
    a.burst(o, t, { dur: 0.5, vol: 0.07, type: 'bandpass', f: 600, f2: 900, q: 1.2, buf: a.pink, attack: 0.1 });
  },
});

Object.assign(LOOPS, {
  /** The escalator: a low motor drone and the steps' soft rattle. */
  escalatorHum(a, out) {
    const ctx = a.ctx;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const g = ctx.createGain(); g.gain.value = 0.35;
    o.connect(lp).connect(g).connect(out); o.start();
    const s = ctx.createBufferSource(); s.buffer = a.pink; s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 3;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    s.connect(bp).connect(g2).connect(out); s.start();
    return { stop: () => { o.stop(); s.stop(); } };
  },
  /** The lift's motor while it travels. */
  elevMotor(a, out) {
    const ctx = a.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 72;
    const g = ctx.createGain(); g.gain.value = 0.5;
    const s = ctx.createBufferSource(); s.buffer = a.brown; s.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
    o.connect(g).connect(out); s.connect(lp).connect(out); o.start(); s.start();
    return { stop: () => { o.stop(); s.stop(); } };
  },
});

// the lift's muzak: a sleepy bossa on bells (the Kaikan's own theme)
SONGS.muzak = {
  bpm: 96, div: 2, bell: true,
  lead: 'E5 - G5 - B5 - A5 G5 | F#5 - - - D5 - E5 - | C5 - E5 - G5 - F#5 E5 | D5 - - - - - B4 - | E5 - G5 - B5 - D6 C6 | B5 - A5 - G5 - E5 - | F#5 - G5 - A5 - F#5 D5 | E5 - - - - - - -',
  bass: 'E3 - - B2 E3 - - B2 | D3 - - A2 D3 - - A2 | C3 - - G2 C3 - - G2 | B2 - - F#2 B2 - - F#2 | E3 - - B2 E3 - - B2 | A2 - - E3 A2 - - E3 | D3 - - A2 D3 - - A2 | E3 - - B2 E3 - - -',
  drums: '',
  leadVol: 0.035, bassVol: 0.045,
};
// the Kaikan floor's background music (busy, cheerful chip pop) while you're inside
SONGS.kaikan = {
  bpm: 128, div: 2,
  lead: 'C5 E5 G5 E5 A5 . G5 . | F5 A5 C6 A5 G5 - - . | E5 G5 C6 G5 D6 . C6 . | B5 G5 D5 G5 C6 - - . | A4 C5 E5 C5 F5 . E5 . | D5 F5 A5 F5 G5 - - . | E5 . D5 . C5 . D5 . | C5 - - . G4 - - .',
  bass: 'C3 . C3 . A2 . A2 . | F2 . F2 . G2 . G2 . | C3 . C3 . G2 . G2 . | G2 . G2 . C3 . C3 . | A2 . A2 . F2 . F2 . | D3 . D3 . G2 . G2 . | C3 . G2 . F2 . G2 . | C3 . . . C3 . . .',
  drums: 'k.h.s.h.|k.h.s.hh|k.h.s.h.|k.h.s.h.|k.h.s.h.|k.h.s.hh|k.h.s.h.|k.k.s.s.',
  duty: 0.25, leadVol: 0.012, bassVol: 0.035,
};
