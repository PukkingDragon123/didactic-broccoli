// Synth sounds for the opening (src/arrival/), registered into the audio engine's tables at import time.
//   arrIgnition  the key turned back in the ignition: the barrel's click and a detent
//   arrSettle    the van settling on its springs as the engine dies: a low creak and a body knock
import { SOUNDS } from '../core/audio.js';

const rand = (a, b) => a + Math.random() * (b - a);

Object.assign(SOUNDS, {
  arrIgnition(a, t, o) {
    a.burst(o, t, { dur: 0.025, vol: 0.22, type: 'highpass', f: 2600 });
    a.tone(o, t + 0.01, { type: 'triangle', f: 1450, f2: 1100, dur: 0.05, vol: 0.05 });
    a.burst(o, t + 0.13, { dur: 0.03, vol: 0.18, type: 'bandpass', f: 1900, q: 3 });
  },
  arrSettle(a, t, o) {
    a.tone(o, t, { f: 95, f2: 60, dur: 0.18, vol: 0.18 });
    a.burst(o, t + 0.05, { dur: 0.35, vol: 0.05, type: 'bandpass', f: 380, f2: 260, q: 4, buf: a.brown });
    a.burst(o, t + 0.12, { dur: 0.04, vol: 0.06, type: 'bandpass', f: rand(700, 900), q: 2 });
  },
});
