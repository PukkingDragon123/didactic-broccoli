// Fun poses for the menu crew and the closet (registered into GESTURES; see gestures.js EXTRA_POSES):
//   phone_idle  looking down at the phone, other hand in a pocket (cool, relaxed)
//   selfie      arm stretched out with the phone, peace sign by the cheek (with 'duck' face)
//   groupie     leaning into somebody's selfie with a peace sign   (opts.side: +1 lean to own left, -1 right)
//   peace       double peace signs by the cheeks
//   film        filming with the phone held sideways at eye level
//   dab, flex   exactly what they sound like
//   nope / yep  turning away with a hand up / pointing happily to the own left (two-panel memes)
//   hug         arms around something big in front of the chest;  explain  one hand raised, making a point
//   read_flyer  holding a sheet in both hands at chest height and reading it
// Poses can also set pose.propRot (extra phone rotation, chest frame) and pose.vsign ('L' | 'R' | 'LR': peace
// fingers); avatar humans (cosmetics.js dressHuman) honour both.
import { GESTURES, EXTRA_POSES } from './gestures.js';
import { EXPRESSIONS } from './face.js';

Object.assign(EXPRESSIONS, {
  duck: { round: 1.1, open: 1.3, mouthW: 0.52, brow: 0.9, cheek: 0.5, upper: 0.92 },
  cool: { corner: 0.9, upper: 0.74, brow: -0.2, cheek: 0.3 },
  grin: { corner: 2.6, cheek: 1.2, lower: 0.8, teeth: 1, open: 1.4, mouthW: 1.16, brow: 0.6, upper: 0.82 },
});

Object.assign(GESTURES, {
  phone_idle: { dur: Infinity },
  selfie: { dur: Infinity },
  groupie: { dur: Infinity, expr: 'happy' },
  peace: { dur: 3.2, expr: 'happy' },
  film: { dur: Infinity },
  dab: { dur: 2.2, expr: 'smile' },
  flex: { dur: 2.6, expr: 'grin' },
  // meme poses (flyer art, src/gfx/flyers.js) and reading a flyer you were handed
  nope: { dur: Infinity, expr: 'angry' },
  yep: { dur: Infinity, expr: 'grin' },
  hug: { dur: Infinity, expr: 'happy' },
  explain: { dur: Infinity },
  read_flyer: { dur: Infinity },
});

const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const arm = (x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [x, y, z], p: [px, py, pz], hand: [hx, hy, hz] });
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const along = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];

/** The common frame: chest-space shoulder (sx, sy), eye height, face plane; m() scales a 1.72 m adult's metres. */
function frame(h) {
  const P = h.P, k = P.H / 1.72;
  return { P, k, sx: P.shX, sy: P.shoulderY - P.waistY, eye: P.eyeY - P.waistY, zf: P.zf, m: (v) => v * k };
}
/** A peace sign beside the cheek on side s (+1 own left, -1 right): fingers up, palm to the front. */
function peace(F, g, s, wob = 0) {
  const { m, eye, zf } = F;
  const A = arm(s * m(0.165), eye - m(0.19) + wob, zf - m(0.005), s, -1, -0.2);
  if (s > 0) { g.L = A; g.hands.L = [s * 0.12, 1, 0.1, s * 0.25, 0, 1]; } else { g.R = A; g.hands.R = [s * 0.12, 1, 0.1, s * 0.25, 0, 1]; }
}
const H0 = () => ({ L: null, R: null });

Object.assign(EXTRA_POSES, {
  phone_idle(t, h, g) {
    const F = frame(h), { m } = F;
    g.hands = H0();
    const swipe = Math.max(0, Math.sin(t * 2.3)) ** 6 * m(0.01);
    const w = [-m(0.075), m(0.075) + swipe, m(0.215)], f = nrm([0.3, 0.42, 0.85]), n = nrm([0.05, 0.85, -0.5]);
    g.R = arm(w[0], w[1], w[2], -1, -0.6, -0.6);
    g.hands.R = [...f, ...n];
    g.prop = along(along(w, f, m(0.065)), n, m(0.018));
    g.phone = { up: f, face: n };
    // other hand in the front pocket, elbow relaxed out
    g.L = arm(m(0.135), -m(0.105), m(0.065), 1, 0.15, -0.8);
    g.hands.L = [0.1, -0.7, 0.7, -1, 0, 0];
    g.chest[0] = 0.06; g.chest[2] = -0.03; g.neck[0] = 0.1; g.head[2] = 0.08; g.head[0] = 0.22;
    g.eyes = [0, 1.5];
  },
  selfie(t, h, g) {
    const F = frame(h), { m, sx, sy, eye, zf } = F;
    g.hands = H0();
    const bob = Math.sin(t * 1.7) * m(0.01);
    const w = [-sx - m(0.15), sy + m(0.2) + bob, m(0.36)];
    const n = nrm([-w[0] - m(0.04), eye - w[1], zf - w[2]]), f = nrm([0.12, 1, 0.1]);
    g.R = arm(w[0], w[1], w[2], -1, -1, 0.1);
    g.hands.R = [...f, ...n];
    g.prop = along(along(w, f, m(0.075)), n, m(0.02));
    g.phone = { up: f, face: n };
    peace(F, g, 1, Math.sin(t * 3.1) * m(0.005));
    g.vsign = 'L';
    g.head[0] = -0.12; g.head[1] = -0.3; g.head[2] = 0.16; g.chest[2] = 0.05; g.spine[1] = -0.08;
    g.eyes = [-1.5, -0.6];
  },
  groupie(t, h, g, o) {
    const F = frame(h), { m } = F, s = o.side || 1;
    g.hands = H0();
    const sway = Math.sin(t * 1.3) * 0.02;
    g.spine[2] = -s * 0.1 + sway; g.chest[2] = -s * 0.08; g.head[2] = -s * 0.2; g.head[1] = s * 0.1; g.head[0] = -0.06;
    // the outer hand does the peace sign, the inner one rests on the hip
    const out = -s;
    peace(F, g, out);
    g.vsign = out > 0 ? 'L' : 'R';
    const hip = arm(-out * m(0.2), -m(0.075), m(0.0), -out, 0.4, -0.8);
    if (out > 0) { g.R = hip; g.hands.R = [-0.2, -0.5, 0.85, 1, 0, 0]; } else { g.L = hip; g.hands.L = [0.2, -0.5, 0.85, -1, 0, 0]; }
    g.eyes = [s * 1.2, -0.5];
  },
  peace(t, h, g) {
    const F = frame(h), b = Math.sin(t * 7) * F.m(0.008);
    g.hands = H0();
    peace(F, g, 1, b); peace(F, g, -1, -b);
    g.vsign = smooth(t / 0.25) > 0.5 ? 'LR' : null;
    g.head[2] = 0.16 * Math.sin(t * 2.2); g.chest[0] = -0.03;
  },
  film(t, h, g) {
    const F = frame(h), { m, eye, zf } = F;
    g.hands = H0();
    const y = eye - m(0.15), z = zf + m(0.2);
    g.R = arm(-m(0.075), y, z, -1, -1, -0.2); g.L = arm(m(0.075), y, z, 1, -1, -0.2);
    g.hands.R = [0.25, 0.7, 0.6, 1, 0, 0.3]; g.hands.L = [-0.25, 0.7, 0.6, -1, 0, 0.3];
    g.prop = [0, y + m(0.065), z + m(0.04)];
    g.phone = { up: [1, 0, 0], face: [0, 0.15, -1] };
    g.chest[1] = Math.sin(t * 0.6) * 0.12; g.head[1] = Math.sin(t * 0.6) * 0.08; g.head[0] = 0.04;
    g.eyes = [0, 0.5];
  },
  dab(t, h, g) {
    const F = frame(h), { m, sx, sy } = F;
    g.hands = H0();
    const e = smooth(t / 0.18) * (1 - smooth((t - 1.8) / 0.4));
    g.L = arm(sx + m(0.36), sy + m(0.32), m(0.12), 1, -0.4, -0.6);
    g.hands.L = [0.75, 0.62, 0.2, 0, 0.3, 1];
    g.R = arm(sx * 0.55, sy + m(0.2), m(0.16), -0.6, 0.4, 1);
    g.hands.R = [0.8, 0.5, 0.2, 0, -0.3, -1];
    g.head[0] = 0.5 * e; g.head[1] = 0.45 * e; g.neck[0] = 0.12 * e; g.chest[1] = 0.12 * e; g.chest[2] = -0.05 * e;
  },
  flex(t, h, g) {
    const F = frame(h), { m, sx, sy } = F;
    g.hands = H0();
    const p = Math.sin(t * 5) * m(0.01);
    g.L = arm(sx + m(0.13), sy + m(0.2) + p, m(0.03), 1, -0.25, -0.4);
    g.R = arm(-sx - m(0.13), sy + m(0.2) + p, m(0.03), -1, -0.25, -0.4);
    g.hands.L = [-0.3, 1, 0, 0, 0, -1]; g.hands.R = [0.3, 1, 0, 0, 0, -1];
    g.chest[0] = -0.08; g.head[0] = -0.08; g.lift = m(0.012);
  },
  nope(t, h, g) {
    const F = frame(h), { m, eye, zf } = F;
    g.hands = H0();
    g.L = arm(m(0.2), eye - m(0.2), zf + m(0.12), 1, -1, -0.3);
    g.hands.L = [0.1, 1, 0.15, 1, 0, 0.55];
    g.head[1] = -0.6; g.head[0] = -0.14; g.head[2] = 0.12; g.chest[1] = -0.18; g.neck[1] = -0.15;
    g.eyes = [-2, -0.5];
  },
  yep(t, h, g) {
    const F = frame(h), { m, sx, sy, P } = F;
    g.hands = H0();
    const d = nrm([0.85, 0.32, 0.5]), reach = (P.shoulderY - P.wristY) * 0.9;
    g.L = arm(sx + d[0] * reach, sy + d[1] * reach, d[2] * reach, 1, -1, -0.4);
    g.hands.L = [...d, 0, -0.4, 1];
    g.head[1] = 0.42; g.head[0] = -0.06; g.chest[1] = 0.14;
    g.eyes = [2, 0];
    void m;
  },
  hug(t, h, g) {
    const F = frame(h), { m } = F;
    g.hands = H0();
    const sq = Math.sin(t * 2.2) * m(0.006);
    g.L = arm(m(0.1) - sq, m(0.02), m(0.33), 1, -0.3, -0.4);
    g.R = arm(-m(0.1) + sq, m(0.02), m(0.33), -1, -0.3, -0.4);
    g.hands.L = [-1, 0.05, 0.25, 0, 0, -1]; g.hands.R = [1, 0.05, 0.25, 0, 0, -1];
    g.chest[0] = 0.1; g.head[0] = 0.12; g.head[2] = 0.22; g.spine[0] = 0.04;
    g.eyes = [0, 0];
  },
  explain(t, h, g) {
    const F = frame(h), { m, sy } = F;
    g.hands = H0();
    const b = Math.sin(t * 2.6) * m(0.008);
    g.R = arm(-m(0.2), sy - m(0.08) + b, m(0.22), -1, -1, -0.3);
    g.hands.R = [0.1, 0.8, 0.55, 0.65, 0.35, 0.6];
    g.head[2] = 0.08; g.head[0] = 0.03; g.chest[1] = -0.06;
  },
  read_flyer(t, h, g) {
    // the sheet sits at chest height in front of you (h.flyerAt, chest space); a hand on either side of it
    const F = frame(h), { m } = F, at = h.flyerAt || [0, m(0.12), m(0.3)];
    const w = m(0.105), shake = Math.sin(t * 9) * m(0.002) * (h.laughing ? 3 : 0);
    g.L = arm(at[0] + w, at[1] - m(0.06) + shake, at[2] - m(0.02), 1, -0.6, -0.5);
    g.R = arm(at[0] - w, at[1] - m(0.06) - shake, at[2] - m(0.02), -1, -0.6, -0.5);
    g.head[0] = 0.32 + (h.laughing ? Math.sin(t * 11) * 0.04 : 0); g.neck[0] = 0.1; g.chest[0] = 0.04;
    g.eyes = [0, 1.5];
  },
});
