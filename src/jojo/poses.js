// More dramatic manga poses (an affectionate homage to a certain bizarre manga's body language; every pose here is an
// original design): full-body stances that step the feet out, cock the hips and twist the spine, struck with a snap and
// held with a slow, proud sway. Registered into the gesture library like src/people/bizarre.js (chest space: +x = own
// left, +y up from the waist, +z forward; metres for a 1.72 m adult, scaled by height).
//   h.gesture('pose_tower')    MORE_BIZARRE: the menu-worthy ones     POSE_INFO[name] = { name, style, blurb }
// style is the pose-off element: 'power' beats 'mystery', 'mystery' beats 'grace', 'grace' beats 'power'.
import { GESTURES, EXTRA_POSES } from '../people/gestures.js';

export const MORE_BIZARRE = ['pose_tower', 'pose_frame', 'pose_reach', 'pose_coil', 'pose_sweep', 'pose_guard'];
export const POSE_INFO = {
  pose_point: { name: 'Menacing Point', style: 'power', blurb: 'Finger out, chin up, torso turned away.' },
  pose_lean: { name: 'Dramatic Lean', style: 'grace', blurb: 'Lean back, hand across the face.' },
  pose_cross: { name: 'Hand Behind', style: 'mystery', blurb: 'One hand behind the head, hips cocked.' },
  pose_tower: { name: 'Skyward Finger', style: 'power', blurb: 'One finger to the sky, the other hand on the hip.' },
  pose_frame: { name: 'Picture Frame', style: 'grace', blurb: 'Both hands frame the face. Knees together.' },
  pose_reach: { name: 'Grasp of Fate', style: 'power', blurb: 'Lunge in and reach for the lens.' },
  pose_coil: { name: 'The Coil', style: 'mystery', blurb: 'Twist until the spine creaks. Look back.' },
  pose_sweep: { name: 'Curtain Call', style: 'grace', blurb: 'A theatrical bow, one arm swept wide.' },
  pose_guard: { name: 'Ready Stance', style: 'mystery', blurb: 'Fists up, weight low, eyes steady.' },
  pose_shock: { name: 'Shock!', style: null, blurb: 'Clutch your head. Lean back. Scream inside.' },
  dab: { name: 'Dab', style: null }, flex: { name: 'Flex', style: null }, peace: { name: 'Double Peace', style: null },
};

Object.assign(GESTURES, {
  pose_tower: { dur: 3.6, expr: 'grin', legs: true },
  pose_frame: { dur: 3.6, expr: 'cool', legs: true },
  pose_reach: { dur: 3.4, expr: 'angry', legs: true },
  pose_coil: { dur: 3.6, expr: 'cool', legs: true },
  pose_sweep: { dur: 3.6, expr: 'smile', legs: true },
  pose_guard: { dur: 3.6, expr: 'angry', legs: true },
  pose_shock: { dur: 2.4, expr: 'surprised' },
});

const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const arm = (x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [x, y, z], p: [px, py, pz], hand: [hx, hy, hz] });
function frame(h) {
  const P = h.P, k = P.H / 1.72;
  return { sx: P.shX, sy: P.shoulderY - P.waistY, eye: P.eyeY - P.waistY, zf: P.zf, m: (v) => v * k };
}
const settle = (t, f = 1.6, a = 0.03) => Math.sin(t * f) * a;

/**
 * The legs of a pose: step each foot out to its mark on a little lift arc as the pose is struck, hold it, and step home
 * before the pose ends (the leg channel only lets the feet join and leave while they are home, so they never slide).
 * marks: [[dx, dz, pitch] (left), [dx, dz, pitch] (right)] in metres off the idle stance, pitch > 0 = heel up.
 * Returns the stance weight 0..1 (for the hips and anything else that should ride it).
 */
function stance(t, h, g, marks, { inT = 0.28, outT = 0.32, lift = 0.07 } = {}) {
  const rec = h.gestures?.find((r) => r.pose === g);
  const dur = rec ? rec.dur : 3.4;
  // cleared early (or a held pose released): step home from here
  if (rec?.stop && g._stopAt === undefined && !(t > dur - outT)) g._stopAt = t;
  const outAt = g._stopAt ?? dur - outT;
  // the first frames stay home so the leg channel picks the feet up (it only does that while they're home)
  const ti = t - 0.05;
  const kIn = smooth(ti / inT), kOut = t > outAt ? smooth((t - outAt) / outT) : 0;
  const w = Math.max(0, kIn * (1 - kOut));
  const arcIn = ti > 0 && ti < inT ? Math.sin(Math.PI * ti / inT) : 0;
  const tOut = t - outAt;
  const arcOut = tOut > 0 && tOut < outT ? Math.sin(Math.PI * tOut / outT) : 0;
  const m = h.P.H / 1.72;
  for (let s = 0; s < 2; s++) {
    const f = g.feet[s], mk = marks[s];
    // the lead foot (the one that moves furthest) steps first, the other a beat later
    f[0] = mk[0] * m * w; f[1] = mk[1] * m * w; f[3] = (mk[2] || 0) * w;
    f[2] = (arcIn + arcOut) * lift * m * (Math.abs(mk[0]) + Math.abs(mk[1]) > 0.04 ? 1 : 0.3);
  }
  g.home = w < 0.004 && arcIn < 0.01 && arcOut < 0.01;
  if (g.home) for (const f of g.feet) f[0] = f[1] = f[2] = f[3] = 0;
  g.fwHint = w;
  return w;
}
// struck with a snap: a quick overshoot on the way in, then the hold
const snapIn = (t) => (t < 0.18 ? smooth(t / 0.18) * 1.12 : t < 0.32 ? 1.12 - 0.12 * smooth((t - 0.18) / 0.14) : 1);

Object.assign(EXTRA_POSES, {
  // one finger to the sky, the other hand on the hip; chin up, chest open, a wide proud stance
  pose_tower(t, h, g) {
    const { sx, sy, eye, m } = frame(h), s = settle(t), k = snapIn(t);
    g.hands = { L: null, R: null };
    g.R = arm(-sx - m(0.03), sy + m(0.6) * k, m(0.06), -1, 0.1, -0.5);
    g.hands.R = [0.05, 1, 0.05, 0, 0, 1];
    g.L = arm(sx + m(0.05), m(0.02), m(0.0), 1, 0.1, -0.8);
    g.hands.L = [0, -1, 0.3, -1, 0, 0];
    g.chest[1] = 0.32 + s; g.chest[0] = -0.08; g.spine[2] = -0.12 * k; g.spine[0] = -0.06;
    g.head[0] = -0.3 * k; g.head[1] = -0.22; g.head[2] = 0.08;
    g.eyes = [-1, 2];
    const w = stance(t, h, g, [[0.15, -0.05, 0], [-0.1, 0.11, 0]]);
    g.hipsR[1] = -0.18 * w; g.hipsR[2] = 0.07 * w; g.hips[0] = 0.02 * w;
    void eye;
  },
  // both hands frame the face (thumbs and fingers at the corners), knees together, the head tilted against the twist
  pose_frame(t, h, g) {
    const { eye, zf, m } = frame(h), s = settle(t, 1.3, 0.025), k = snapIn(t);
    g.hands = { L: null, R: null };
    g.R = arm(-m(0.12), eye + m(0.07), zf + m(0.17) * k, -1, -0.6, -0.2);
    g.hands.R = [0.55, 0.8, 0.1, 0, 0, 1];
    g.L = arm(m(0.11), eye - m(0.13), zf + m(0.21) * k, 1, -0.9, 0.1);
    g.hands.L = [-0.6, -0.75, 0.1, 0, 0, 1];
    g.chest[1] = -0.34 + s; g.spine[2] = 0.1; g.spine[0] = 0.04;
    g.head[1] = 0.26; g.head[2] = 0.2; g.head[0] = 0.04;
    g.eyes = [-2, 0];
    const w = stance(t, h, g, [[-0.03, -0.06, 0.35], [0.06, 0.12, 0]]);
    g.hipsR[1] = 0.22 * w; g.hipsR[2] = -0.08 * w; g.hips[0] = -0.03 * w;
  },
  // a lunge: the right hand reaches for the lens with the fingers spread, the left flung back, the back heel up
  pose_reach(t, h, g) {
    const { sx, sy, m } = frame(h), s = settle(t, 2.1, 0.02), k = snapIn(t);
    g.hands = { L: null, R: null };
    g.R = arm(-sx * 0.55, sy + m(0.06), m(0.6) * k, -1, -0.7, 0.1);
    g.hands.R = [0.1, 0.9, 0.35, 0, 0.2, 1];
    g.L = arm(sx + m(0.34), sy - m(0.44), -m(0.26), 1, 0.2, 0.4);
    g.hands.L = [0.3, -1, -0.4, 1, 0, 0];
    g.spine[0] = 0.16 * k + s; g.chest[1] = 0.24; g.chest[0] = 0.06;
    g.head[0] = -0.06; g.head[1] = -0.12;
    g.eyes = [0, 0];
    const w = stance(t, h, g, [[0.05, -0.2, 0.5], [-0.05, 0.24, 0]], { lift: 0.09 });
    g.hipsR[1] = 0.2 * w; g.hipsR[0] = 0.08 * w; g.hips[2] = 0.05 * w;
  },
  // the spine twisted until it creaks: one arm wrapped across to the far shoulder, the other hand splayed over an eye,
  // the head turned back over the shoulder, the feet crossed
  pose_coil(t, h, g) {
    const { sx, sy, eye, zf, m } = frame(h), s = settle(t, 1.2, 0.035), k = snapIn(t);
    g.hands = { L: null, R: null };
    g.R = arm(sx * 0.85, sy - m(0.05), m(0.17), -1, -0.9, 0.5);
    g.hands.R = [1, 0.25, 0, 0, 0, -1];
    g.L = arm(m(0.08), eye + m(0.05), zf + m(0.07), 1, -0.4, 0.4);
    g.hands.L = [-0.45, 1, 0.15, 0, 0, -1];
    g.chest[1] = -0.5 * k + s; g.spine[1] = -0.12; g.spine[2] = 0.12; g.chest[2] = 0.06;
    g.head[1] = 0.62 * k; g.head[2] = -0.14; g.head[0] = 0.05;
    g.eyes = [-2.5, 0];
    const w = stance(t, h, g, [[-0.1, 0.09, 0], [0.01, -0.05, 0.45]]);
    g.hipsR[1] = 0.3 * w; g.hipsR[2] = 0.06 * w;
  },
  // a theatrical bow: one arm across the stomach, the other swept wide; looking up at you through the bow
  pose_sweep(t, h, g) {
    const { sx, sy, m } = frame(h), k = snapIn(t);
    const bow = smooth((t - 0.15) / 0.5) * (0.9 + 0.1 * Math.sin(t * 1.4));
    g.hands = { L: null, R: null };
    g.R = arm(m(0.05), m(0.07), m(0.2), -1, -0.4, 0.6);
    g.hands.R = [1, 0, 0.25, 0, 0, -1];
    g.L = arm(sx + m(0.52) * k, sy + m(0.14), -m(0.06), 0.4, 1, -0.4);
    g.hands.L = [1, 0.25, 0, 0, -1, 0.2];
    g.spine[0] = 0.34 * bow; g.chest[0] = 0.1 * bow; g.chest[1] = 0.1;
    g.head[0] = -0.34 * bow; g.head[2] = 0.08;
    g.eyes = [0, 2.5];
    const w = stance(t, h, g, [[0.04, 0.05, 0], [-0.02, -0.17, 0.55]]);
    g.hipsR[0] = 0.06 * w; g.hips[2] = -0.04 * w * bow;
  },
  // fists up, weight low, chin down and eyes up: the stance before the first move
  pose_guard(t, h, g) {
    const { sy, m } = frame(h), s = settle(t, 2.4, 0.02), k = snapIn(t);
    g.hands = { L: null, R: null };
    g.R = arm(-m(0.07), sy - m(0.05), m(0.25), -1, -1, 0.1);
    g.hands.R = [0, 0.4, 1, 1, 0, 0];
    g.L = arm(m(0.09), sy + m(0.02) * k, m(0.38) * k, 1, -1, 0);
    g.hands.L = [0, 0.4, 1, -1, 0, 0];
    g.chest[1] = 0.32 + s; g.spine[0] = 0.1; g.head[0] = 0.12; g.head[1] = -0.2;
    g.eyes = [0, 2];
    const w = stance(t, h, g, [[0.1, 0.15, 0], [-0.1, -0.12, 0.3]]);
    g.hipsR[1] = 0.26 * w; g.hips[1] = -0.035 * w * (h.P.H / 1.72);
  },
  // clutching the head, leaning back: the losing face
  pose_shock(t, h, g) {
    const { eye, zf, m } = frame(h), shake = Math.sin(t * 40) * 0.015 * (t < 0.8 ? 1 : 0);
    g.hands = { L: null, R: null };
    g.R = arm(-m(0.11), eye + m(0.02), zf - m(0.03), -1, -0.5, 0.4);
    g.hands.R = [0.1, 1, 0, 1, 0, 0];
    g.L = arm(m(0.11), eye + m(0.02), zf - m(0.03), 1, -0.5, 0.4);
    g.hands.L = [-0.1, 1, 0, -1, 0, 0];
    g.spine[0] = -0.2 + shake; g.chest[0] = -0.06; g.head[0] = -0.14; g.head[2] = shake * 4;
    g.eyes = [0, 1];
  },
});
