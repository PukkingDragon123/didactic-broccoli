// Synth sounds for Grandpa's scenes, registered into the shared audio tables at import (as src/life/sfx.js does):
// knuckles on the van window, his cane on concrete, the stool creaking, the taxi's horn, its automatic door and its
// engine idling, a wet old-man cough and the bus-stop chime of the phone ringing far away is the PC's own.
import { SOUNDS, LOOPS } from '../core/audio.js';

const rand = (a, b) => a + Math.random() * (b - a);

Object.assign(SOUNDS, {
  /** Knuckles on glass: three dull taps with a ring. */
  knockGlass(a, t, o) {
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.16 + Math.random() * 0.02;
      a.burst(o, tt, { dur: 0.03, vol: 0.32, type: 'bandpass', f: 1300, q: 2 });
      a.tone(o, tt, { type: 'triangle', f: rand(560, 640), f2: 420, dur: 0.07, vol: 0.12 });
    }
  },
  /** The rubber foot of a cane on concrete. */
  caneTap(a, t, o) {
    a.burst(o, t, { dur: 0.025, vol: 0.12, type: 'bandpass', f: rand(700, 900), q: 1.5 });
    a.tone(o, t, { type: 'triangle', f: rand(180, 220), f2: 120, dur: 0.05, vol: 0.06 });
  },
  /** A wooden stool taking his weight. */
  stoolCreak(a, t, o) {
    a.tone(o, t, { type: 'sawtooth', f: rand(240, 300), f2: rand(150, 190), dur: 0.32, vol: 0.035, attack: 0.04 });
    a.burst(o, t + 0.02, { dur: 0.18, vol: 0.05, type: 'bandpass', f: 900, q: 4 });
  },
  /** Two short toots of a small car horn. */
  taxiHorn(a, t, o) {
    for (let i = 0; i < 2; i++) {
      a.tone(o, t + i * 0.22, { type: 'square', f: 392, dur: 0.14, vol: 0.06 });
      a.tone(o, t + i * 0.22, { type: 'square', f: 494, dur: 0.14, vol: 0.05 });
    }
  },
  /** The taxi's automatic rear door: a pneumatic hiss and a clunk. */
  taxiDoor(a, t, o, p) {
    a.burst(o, t, { dur: 0.35, vol: 0.12, type: 'highpass', f: 2600, f2: 1800, attack: 0.03 });
    a.tone(o, t + (p.close ? 0.3 : 0.32), { f: p.close ? 120 : 160, f2: 70, dur: 0.15, vol: p.close ? 0.4 : 0.2 });
  },
  /** An old man's cough (two hacks). */
  cough(a, t, o) {
    for (let i = 0; i < 2; i++) {
      a.burst(o, t + i * 0.28, { dur: 0.16, vol: 0.18, type: 'bandpass', f: rand(500, 700), q: 1.2, buf: a.pink, attack: 0.01 });
      a.tone(o, t + i * 0.28, { type: 'sawtooth', f: 120, f2: 80, dur: 0.12, vol: 0.04 });
    }
  },
  /** Paper fan flaps. */
  fanFlap(a, t, o) { a.burst(o, t, { dur: 0.08, vol: 0.05, type: 'bandpass', f: rand(1100, 1500), q: 1, buf: a.pink }); },
});

Object.assign(LOOPS, {
  /** A taxi idling: a smoother, higher engine than the van's. */
  taxiEngine(a, out) {
    const ctx = a.ctx;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 46;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 1.4;
    const amp = ctx.createGain(); amp.gain.value = 0.5;
    o.connect(lp).connect(amp).connect(out);
    o.start();
    return { stop: () => { try { o.stop(); } catch { /* stopped */ } }, osc: o };
  },
});
