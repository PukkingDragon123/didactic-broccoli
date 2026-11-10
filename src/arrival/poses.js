// Body language for the opening (src/arrival/), registered into the shared gesture library like src/grandpa/poses.js:
//   'arr_drive'  at the wheel of the van: both hands up on the rim of a steep cab-over wheel (ten to two), the back a
//                little off the seat, eyes on the road; opts.steer (a function -> front wheel angle) feeds the wheel
//                round a little under the hands
import { GESTURES, EXTRA_POSES } from '../people/gestures.js';

Object.assign(GESTURES, { arr_drive: { dur: Infinity } });

const arm = (x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [x, y, z], p: [px, py, pz], hand: [hx, hy, hz] });

Object.assign(EXTRA_POSES, {
  arr_drive(t, h, g, opts) {
    const k = h.P.H / 1.72, m = (v) => v * k;
    const s = Math.max(-0.5, Math.min(0.5, (opts?.steer?.() || 0) * 3)); // the rim turning under the hands
    g.L = arm(m(0.15), m(0.3 + s * 0.05), m(0.34 - Math.abs(s) * 0.02), 1, -0.9, -0.3);
    g.R = arm(-m(0.15), m(0.3 - s * 0.05), m(0.34 - Math.abs(s) * 0.02), -1, -0.9, -0.3);
    g.spine[0] = 0.07; g.head[0] = -0.05;
    g.eyes = [0, 0];
  },
});
