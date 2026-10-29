// Bizarre poses: flamboyant manga stances for anyone who feels dramatic (an affectionate nod to a certain bizarre
// adventure). Registered with the gesture library like poses.js; arm targets are in chest space (+x = own left,
// +y up from the waist, +z forward), scaled for height.
//   h.gesture('pose_point' | 'pose_lean' | 'pose_cross')      BIZARRE: the list, for picking one at random
import { GESTURES, EXTRA_POSES } from './gestures.js';

export const BIZARRE = ['pose_point', 'pose_lean', 'pose_cross'];
Object.assign(GESTURES, {
  pose_point: { dur: 3.4, expr: 'grin' },
  pose_lean: { dur: 3.4, expr: 'smile' },
  pose_cross: { dur: 3.4, expr: 'grin' },
});

const arm = (x, y, z, px, py, pz) => ({ t: [x, y, z], p: [px, py, pz], hand: [0, 0, 0] });
function frame(h) {
  const P = h.P, k = P.H / 1.72;
  return { sx: P.shX, sy: P.shoulderY - P.waistY, eye: P.eyeY - P.waistY, zf: P.zf, m: (v) => v * k };
}
// strike the pose with a snap, hold it with a slow, proud sway
const settle = (t) => Math.sin(t * 1.6) * 0.03;

Object.assign(EXTRA_POSES, {
  // pointing straight at you, the other hand splayed over the brow, torso twisted away
  pose_point(t, h, g) {
    const { sy, eye, zf, m } = frame(h), s = settle(t);
    g.hands = { L: null, R: null };
    g.R = arm(-m(0.12), sy - m(0.02), m(0.5), -1, -0.2, 0.2);
    g.hands.R = [0.05, 0.05, 1, 0, -1, 0];
    g.L = arm(m(0.06), eye + m(0.03), zf + m(0.09), 1, -0.4, 0.3);
    g.hands.L = [-0.7, 0.6, 0.1, 0, 0, -1];
    g.chest[1] = -0.38 + s; g.spine[2] = 0.08; g.hipsR[1] = 0.22;
    g.head[0] = -0.12; g.head[1] = 0.28; g.head[2] = -0.14;
    g.eyes = [0, 0];
  },
  // leaning back, one hand across the face with the fingers spread, the other on the hip
  pose_lean(t, h, g) {
    const { eye, zf, m } = frame(h), s = settle(t);
    g.hands = { L: null, R: null };
    g.R = arm(-m(0.02), eye - m(0.02), zf + m(0.07), -1, -0.5, 0.1);
    g.hands.R = [0.35, 1, 0.1, 0, 0, -1];
    g.L = arm(m(0.17), m(0.03), m(0.03), 1, 0, -0.6);
    g.hands.L = [0, -1, 0.3, -1, 0, 0];
    g.spine[0] = -0.2 + s; g.chest[0] = -0.12; g.chest[1] = 0.18; g.hipsR[1] = -0.2;
    g.head[0] = -0.28; g.head[2] = 0.1;
    g.eyes = [0, 2];
  },
  // one hand behind the head, the other flung down and out, hips cocked, head tilted
  pose_cross(t, h, g) {
    const { sy, eye, m } = frame(h), s = settle(t);
    g.hands = { L: null, R: null };
    g.L = arm(m(0.09), eye + m(0.1), -m(0.06), 1, 0.6, -0.2);
    g.hands.L = [-1, 0.3, 0, 0, 0, 1];
    g.R = arm(-m(0.4), sy - m(0.36), m(0.14), -1, 0, 0.3);
    g.hands.R = [-0.5, -1, 0.2, 0, 0, 1];
    g.chest[2] = 0.12 + s; g.hipsR[1] = 0.3; g.hipsR[2] = 0.06;
    g.head[1] = -0.3; g.head[2] = 0.18;
    g.eyes = [-2, 0];
  },
});
