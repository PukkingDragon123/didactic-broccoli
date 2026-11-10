// Extra synth sounds for the machines, capsule boxes, coins and toys (registered into the shared sound bank).
import { SOUNDS } from '../core/audio.js';

const rand = (a, b) => a + Math.random() * (b - a);

Object.assign(SOUNDS, {
  /** Packing tape torn off a carton. */
  tapeRip(a, t, o) {
    a.burst(o, t, { dur: 0.32, vol: 0.22, type: 'bandpass', f: 1400, f2: 3800, q: 0.9 });
    for (let i = 0; i < 6; i++) a.burst(o, t + i * 0.045 + rand(0, 0.01), { dur: 0.03, vol: 0.12, f: 2600 + i * 200, q: 4 });
  },
  /** A shrink band peeling off a capsule: one crackle of film letting go (played in a run as it comes off). */
  tapePeel(a, t, o, p) {
    const k = p.pitch || 1;
    a.burst(o, t, { dur: 0.05, vol: 0.14, type: 'bandpass', f: 2600 * k, f2: 4200 * k, q: 1.4 });
    a.burst(o, t + 0.018, { dur: 0.02, vol: 0.1, type: 'highpass', f: 5200 });
  },
  /** The band's last corner letting go. */
  tapeSnap(a, t, o) {
    a.burst(o, t, { dur: 0.035, vol: 0.3, type: 'highpass', f: 3400 });
    a.tone(o, t, { f: 1900, f2: 700, dur: 0.05, vol: 0.07, type: 'triangle' });
  },
  /** A tamper sticker splitting on the seam: a dry paper snap. */
  sealCrack(a, t, o, p) {
    const k = p.pitch || 1;
    a.burst(o, t, { dur: 0.03, vol: 0.4, type: 'highpass', f: 2400 * k });
    a.burst(o, t + 0.012, { dur: 0.07, vol: 0.2, type: 'bandpass', f: 1500 * k, f2: 600, q: 1.2 });
    a.tone(o, t, { f: 520 * k, f2: 260, dur: 0.05, vol: 0.1, type: 'square' });
  },
  /** A wax seal breaking: a short brittle crack and crumbs. */
  waxCrack(a, t, o, p) {
    const k = p.pitch || 1;
    a.burst(o, t, { dur: 0.025, vol: 0.45, type: 'bandpass', f: 1800 * k, q: 3 });
    a.tone(o, t, { f: 340 * k, f2: 180, dur: 0.07, vol: 0.16, type: 'triangle' });
    for (let i = 0; i < 4; i++) a.burst(o, t + 0.04 + i * 0.03 + rand(0, 0.015), { dur: 0.015, vol: 0.12, f: rand(2200, 3600), q: 6 });
  },
  /** The locking lugs letting go: one hard plastic click, the top running free after it. */
  lugClick(a, t, o) {
    a.burst(o, t, { dur: 0.018, vol: 0.5, type: 'highpass', f: 2800 });
    a.tone(o, t, { f: 1250, f2: 820, dur: 0.045, vol: 0.14, type: 'square' });
    a.burst(o, t + 0.05, { dur: 0.16, vol: 0.1, type: 'bandpass', f: 900, f2: 1700, q: 1.5 });
  },
  /** The halves coming apart before the foil: a soft suck and pop. */
  capPull(a, t, o) {
    a.tone(o, t, { f: 240, f2: 520, dur: 0.07, vol: 0.2, type: 'sine' });
    a.burst(o, t + 0.06, { dur: 0.03, vol: 0.32, type: 'lowpass', f: 1400 });
  },
  /** Foil tearing: a bright crinkle. */
  foilTear(a, t, o, p) {
    const k = p.pitch || 1;
    for (let i = 0; i < 5; i++) a.burst(o, t + i * 0.022 + rand(0, 0.01), { dur: 0.02, vol: 0.16, type: 'highpass', f: rand(4200, 7000) * k });
    a.burst(o, t, { dur: 0.1, vol: 0.1, type: 'bandpass', f: 3000 * k, f2: 5200, q: 0.8 });
  },
  /** Cardboard flaps folded open. */
  flapFold(a, t, o) {
    a.burst(o, t, { dur: 0.12, vol: 0.18, type: 'lowpass', f: 900, buf: a.pink });
    a.tone(o, t + 0.02, { f: 180, f2: 120, dur: 0.08, vol: 0.12, type: 'triangle' });
  },
  /** One capsule dropped into the machine window. */
  capsuleIn(a, t, o) {
    const f = rand(1700, 2300);
    a.burst(o, t, { dur: 0.04, vol: 0.3, f, q: 5 });
    a.tone(o, t, { f: f * 0.5, f2: f * 0.35, dur: 0.06, vol: 0.14, type: 'triangle' });
    a.burst(o, t + 0.07, { dur: 0.03, vol: 0.14, f: f * 1.1, q: 5 });
  },
  /** Lid hinge. */
  lidCreak(a, t, o, p) {
    const up = p.up !== false;
    a.tone(o, t, { type: 'sawtooth', f: up ? 210 : 260, f2: up ? 330 : 170, dur: 0.32, vol: 0.035 });
    a.burst(o, t + 0.28, { dur: 0.05, vol: up ? 0.12 : 0.3, type: 'lowpass', f: 700 });
  },
  /** A small lock clicking shut / open. */
  lockClick(a, t, o) {
    a.burst(o, t, { dur: 0.02, vol: 0.35, type: 'highpass', f: 2600 });
    a.tone(o, t, { f: 1500, f2: 900, dur: 0.04, vol: 0.08, type: 'square' });
    a.burst(o, t + 0.06, { dur: 0.015, vol: 0.25, type: 'highpass', f: 3200 });
  },
  /** The coin drawer sliding on its runners. */
  drawer(a, t, o, p) {
    a.burst(o, t, { dur: 0.22, vol: 0.12, type: 'bandpass', f: p.out ? 500 : 650, f2: p.out ? 800 : 400, q: 2, buf: a.brown, rate: 2 });
    a.burst(o, t + 0.2, { dur: 0.04, vol: 0.2, type: 'lowpass', f: 900 });
  },
  /** A handful of coins scooped up. */
  coinScoop(a, t, o) {
    for (let i = 0; i < 9; i++) {
      const f = rand(2400, 3600);
      const tt = t + rand(0, 0.3);
      [1, 2.6].forEach((q, k) => a.tone(o, tt, { f: f * q, dur: 0.1 / (k + 1), vol: 0.05 / (k + 1) }));
    }
  },
  /** Button click on the price plate. */
  btnClick(a, t, o) {
    a.burst(o, t, { dur: 0.012, vol: 0.3, type: 'highpass', f: 3000 });
    a.tone(o, t, { f: 900, dur: 0.03, vol: 0.06, type: 'square' });
  },
  /** Squishy toy squeeze. */
  squeak(a, t, o, p) {
    const f = (p.pitch || 1) * rand(700, 900);
    a.tone(o, t, { type: 'square', f, f2: f * 1.5, dur: 0.16, vol: 0.05, glide: 'lin' });
    a.tone(o, t + 0.02, { type: 'sine', f: f * 2, f2: f * 2.6, dur: 0.14, vol: 0.06 });
  },
  /** Foam dart fired. */
  dartPop(a, t, o) {
    a.burst(o, t, { dur: 0.05, vol: 0.4, type: 'lowpass', f: 800 });
    a.tone(o, t, { f: 300, f2: 90, dur: 0.07, vol: 0.2 });
    a.burst(o, t + 0.01, { dur: 0.12, vol: 0.1, type: 'bandpass', f: 1200, f2: 300, q: 1 });
  },
  /** Suction cup sticking. */
  thwack(a, t, o) {
    a.tone(o, t, { f: 420, f2: 160, dur: 0.06, vol: 0.18, type: 'triangle' });
    a.burst(o, t, { dur: 0.03, vol: 0.18, type: 'lowpass', f: 1200 });
  },
  /** Bouncy ball. */
  boing(a, t, o, p) {
    const v = Math.min(1, p.v ?? 1);
    a.tone(o, t, { f: 520, f2: 260, dur: 0.12, vol: 0.18 * v, type: 'triangle' });
    a.burst(o, t, { dur: 0.02, vol: 0.2 * v, type: 'highpass', f: 1800 });
  },
  /** Wind-up key ratchet. */
  windup(a, t, o) {
    for (let i = 0; i < 5; i++) {
      a.burst(o, t + i * 0.07, { dur: 0.025, vol: 0.18, f: 2600 + i * 80, q: 8 });
      a.tone(o, t + i * 0.07, { f: 1300, dur: 0.02, vol: 0.03, type: 'square' });
    }
  },
  /** Tin robot steps. */
  robotStep(a, t, o) {
    a.burst(o, t, { dur: 0.02, vol: 0.14, f: 3200, q: 6 });
    a.tone(o, t, { f: 600, dur: 0.03, vol: 0.04, type: 'square' });
  },
  /** Kendama ball landing in a cup / on the spike. */
  kendamaClack(a, t, o, p) {
    const f = p.spike ? 1100 : 800;
    a.burst(o, t, { dur: 0.04, vol: 0.4, f, q: 6 });
    a.tone(o, t, { f: f * 0.6, f2: f * 0.4, dur: 0.08, vol: 0.18, type: 'triangle' });
  },
  /** Spinning top hum. */
  topSpin(a, t, o, p) {
    a.tone(o, t, { type: 'triangle', f: 180, f2: 120, dur: p.dur || 2, vol: 0.03, curve: 'lin' });
  },
  /** LCD game beeps. */
  lcdBeep(a, t, o, p) {
    a.tone(o, t, { wave: a.pulse(0.25), f: p.f || 1760, dur: p.dur || 0.05, vol: 0.05 });
  },
  /** Blister pack sealed. */
  blister(a, t, o) {
    a.burst(o, t, { dur: 0.18, vol: 0.18, type: 'bandpass', f: 2200, f2: 1200, q: 1.2 });
    a.burst(o, t + 0.2, { dur: 0.05, vol: 0.2, type: 'lowpass', f: 1000 });
  },
});
