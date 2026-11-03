// Work poses for shop staff, registered into the shared gesture library (src/people/gestures.js EXTRA_POSES, like
// src/npc/poses.js). Arm targets are wrist positions in chest space (+x = own left, +y up from the waist, +z forward,
// metres for a 1.72 m adult, scaled by m()); hand = wrist euler; g.hands = finger directions (cosmetics.js).
//   haul      a carton / bag held in front with both hands (the real object rides on the chest bone; no built-in box)
//   sweep     both hands on a broom, swishing side to side
//   texting   phone at chest height, head down, thumbs going (the gyaru, and anyone on a break)
//   stock     reaching up and forward into a machine's open top, one capsule after another
//   reach     bent over a machine's coin box drawer
//   tie       tying off a trash bag low in front
//   doze      asleep on one's feet, head nodding
//   slip      arms flung up, losing balance (the kappa with a dry dish)
//   patrol    hands clasped behind the back, looking around
//   drum      the tanuki patting his belly
import { GESTURES, EXTRA_POSES } from '../people/gestures.js';

Object.assign(GESTURES, {
  haul: { dur: Infinity },
  sweep: { dur: Infinity },
  texting: { dur: Infinity, expr: 'smile' },
  stock: { dur: Infinity },
  reach: { dur: Infinity },
  tie: { dur: 1.6 },
  doze: { dur: Infinity, expr: 'sleepy' },
  slip: { dur: 1.5, expr: 'surprised' },
  patrol: { dur: Infinity },
  drum: { dur: 2.4, expr: 'happy' },
});

const arm = (x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [x, y, z], p: [px, py, pz], hand: [hx, hy, hz] });
function frame(h) {
  const P = h.P, k = P.H / 1.72;
  return { P, sx: P.shX, sy: P.shoulderY - P.waistY, eye: P.eyeY - P.waistY, zf: P.zf, m: (v) => v * k };
}
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

Object.assign(EXTRA_POSES, {
  haul(t, h, g) {
    const { m } = frame(h);
    const C = h.boxPos;
    g.R = arm(-m(0.19), C[1] - m(0.04), C[2], -1, -1, -0.2, 0, -1.57, 0);
    g.L = arm(m(0.19), C[1] - m(0.04), C[2], 1, -1, -0.2, 0, 1.57, 0);
    g.spine[0] = -0.06;
  },
  sweep(t, h, g) {
    const { m } = frame(h);
    const s = Math.sin(t * 5.2), c = Math.cos(t * 5.2);
    g.R = arm(-m(0.06) + s * m(0.1), -m(0.2), m(0.3) + c * m(0.02), -1, -0.6, -0.4, 0.4, 0, 0.2);
    g.L = arm(m(0.03) + s * m(0.06), m(0.06), m(0.22), 1, -0.8, -0.4, 0.2, 0, -0.2);
    g.spine[0] = 0.14; g.chest[0] = 0.08; g.chest[1] = s * 0.12;
    g.head[0] = 0.28; g.head[1] = -s * 0.08;
    g.eyes = [0, 1.2];
  },
  texting(t, h, g) {
    const { m, sy } = frame(h);
    const th = Math.sin(t * 17) * m(0.006), up = (t % 7) > 6.2 ? 1 : 0;
    const y = sy - m(0.2), z = m(0.24);
    g.R = arm(-m(0.03) + th, y, z, -1, -1, -0.2, -0.6, -0.3, 0);
    g.L = arm(m(0.04) - th, y - m(0.02), z - m(0.01), 1, -1, -0.2, -0.6, 0.3, 0);
    g.prop = [0, y + m(0.05), z + m(0.02)];
    g.head[0] = 0.42 * (1 - up) - 0.05 * up; g.neck[0] = 0.12 * (1 - up);
    g.eyes = [Math.sin(t * 3) * 0.5, 1.6 * (1 - up)];
  },
  stock(t, h, g) {
    const { m, sy } = frame(h);
    const a = (t * 1.3) % 1, put = a < 0.5 ? smooth(a * 2) : 1 - smooth((a - 0.5) * 2);
    g.R = arm(-m(0.07), sy - m(0.02) + put * m(0.1), m(0.32) + put * m(0.1), -1, -0.8, -0.3, -0.4, 0, 0);
    g.L = arm(m(0.12), sy - m(0.12), m(0.3), 1, -0.8, -0.3, -0.2, 0, 0);
    g.chest[0] = 0.04 + put * 0.04; g.head[0] = -0.12 + put * 0.06;
    g.eyes = [0, -0.6];
  },
  reach(t, h, g) {
    const { m } = frame(h);
    const w = Math.sin(t * 6) * m(0.02);
    g.R = arm(-m(0.08) + w, -m(0.36), m(0.36), -1, -0.2, -0.6, 0.3, 0, 0);
    g.L = arm(m(0.1) - w, -m(0.34), m(0.32), 1, -0.2, -0.6, 0.3, 0, 0);
    g.spine[0] = 0.42; g.chest[0] = 0.2; g.head[0] = 0.18;
    g.hips[2] = -m(0.04);
  },
  tie(t, h, g) {
    const { m } = frame(h);
    const a = t * 9, r = m(0.03);
    g.R = arm(-m(0.05) + Math.cos(a) * r, -m(0.3) + Math.sin(a) * r, m(0.32), -1, -0.2, -0.6, 0.4, 0, 0);
    g.L = arm(m(0.05) - Math.cos(a) * r, -m(0.3) - Math.sin(a) * r, m(0.32), 1, -0.2, -0.6, 0.4, 0, 0);
    g.spine[0] = 0.36; g.chest[0] = 0.16; g.head[0] = 0.3;
  },
  doze(t, h, g) {
    const { m } = frame(h);
    const nod = Math.max(0, Math.sin(t * 0.9)) ** 3;
    g.L = arm(m(0.12), -m(0.28), m(0.05), 1, 0.2, -0.6);
    g.R = arm(-m(0.12), -m(0.28), m(0.05), -1, 0.2, -0.6);
    g.head[0] = 0.32 + nod * 0.22; g.neck[0] = 0.14; g.head[2] = Math.sin(t * 0.4) * 0.12;
    g.chest[0] = 0.05; g.spine[0] = -0.04;
  },
  slip(t, h, g) {
    const { m, sx, sy } = frame(h);
    const k = smooth(t / 0.25) * (1 - smooth((t - 1.1) / 0.4));
    const w = Math.sin(t * 22) * m(0.05) * k;
    g.R = arm(-sx - m(0.25) * k, sy + m(0.3) * k + w, m(0.05), -1, -0.2, -0.3);
    g.L = arm(sx + m(0.25) * k, sy + m(0.32) * k - w, m(0.05), 1, -0.2, -0.3);
    g.spine[0] = -0.22 * k; g.chest[2] = Math.sin(t * 9) * 0.12 * k; g.head[0] = -0.2 * k;
    g.hips[1] = -m(0.04) * k;
  },
  patrol(t, h, g) {
    const { m } = frame(h);
    g.L = arm(m(0.05), -m(0.2), -m(0.13), 1, 0.2, 0.9);
    g.R = arm(-m(0.05), -m(0.21), -m(0.13), -1, 0.2, 0.9);
    g.chest[0] = -0.04; g.head[1] = Math.sin(t * 0.5) * 0.5; g.head[0] = -0.05;
  },
  drum(t, h, g) {
    const { m, P } = frame(h);
    const a = Math.max(0, Math.sin(t * 12)), b = Math.max(0, Math.sin(t * 12 + Math.PI));
    const z = P.chestZ + (h.spec.belly || 0) * 0.04 + m(0.07);
    g.R = arm(-m(0.08), -m(0.06), z + a * m(0.05), -1, -0.4, -0.6, 0.6, 0, 0);
    g.L = arm(m(0.08), -m(0.06), z + b * m(0.05), 1, -0.4, -0.6, 0.6, 0, 0);
    g.head[0] = -0.12; g.chest[0] = -0.06;
  },
});
