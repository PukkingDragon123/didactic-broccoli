// Body language for the opening (src/arrival/), registered into the shared gesture library like src/grandpa/poses.js:
//   'arr_light'  lighting a cigar: both hands cupped in front of the mouth round a lighter, the chin tucked in, eyes
//                down on the flame (Mikawa-san in his doorway)
import { GESTURES, EXTRA_POSES } from '../people/gestures.js';

Object.assign(GESTURES, { arr_light: { dur: 3.6 } });

const arm = (x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [x, y, z], p: [px, py, pz], hand: [hx, hy, hz] });

Object.assign(EXTRA_POSES, {
  arr_light(t, h, g) {
    const P = h.P, k = P.H / 1.72, chinY = P.chin - P.waistY, zf = P.zf;
    const flick = t > 1.0 && t < 1.15 ? 0.012 * k : 0; // the thumb rolls the wheel: a little jolt of the hand
    g.R = arm(-0.012 * k, chinY + 0.005 * k - flick, zf + 0.15 * k, -1, -1.1, -0.2, -0.5, -0.3, 0.5);
    g.L = arm(0.035 * k, chinY + 0.02 * k, zf + 0.13 * k, 1, -1.1, -0.2, -0.5, 0.6, -0.4);
    g.head[0] = 0.16; g.neck[0] = 0.05;
    g.eyes = [0, 1.5];
  },
});
