// Staff sounds (chiptune synth, src/core/audio.js SOUNDS): the gyaru's pager-style phone melody.
import { SOUNDS } from '../core/audio.js';

Object.assign(SOUNDS, {
  keitai(a, t, o) {
    const notes = [1319, 1047, 1319, 1568, 1319, 1047, 1175, 1319];
    for (let r = 0; r < 2; r++) notes.forEach((f, i) => a.tone(o, t + r * 0.9 + i * 0.1, { type: 'square', f, dur: 0.085, vol: 0.035 }));
  },
});
