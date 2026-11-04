// Everyday gestures for life on the lane (registered into the shared gesture library, see gestures.js EXTRA_POSES).
// Arm targets are wrist positions in chest space (+x own left, +y up from the waist, +z forward; metres for a 1.72 m
// adult, scaled by m()).
//   gasp        both hands to the mouth                 crank     turning a gacha handle (a full circle per second)
//   purse       counting coins out of a coin purse      insert    feeding coins into a slot
//   reach_low   bending to take the capsule from the chute
//   twist_open  twisting a capsule open at chest height show      holding something up to show a friend
//   sigh        shoulders drop, head down               beckon    calling a friend over (palm down, Japanese style)
//   drink       sipping from a can now and then         hold_can  a can held at the side (walking)
//   smoke       a cigarette: a drag, then the hand down by the hip, the other hand in a pocket
//   read_board  hands behind the back, reading a notice at eye level
//   pull_cart   the right hand back on a shopping cart's handle      leash    holding a dog's lead
//   post        pushing a letter into a post box        water     tipping a watering can
//   sweep       sweeping with a broom                   handlebar both hands forward on handlebars
//   stretch     arms up overhead                        yawn      a hand over a yawn
//   phone_call  a phone at the ear, the other hand in a pocket
import { GESTURES, EXTRA_POSES } from './gestures.js';

Object.assign(GESTURES, {
  gasp: { dur: 1.9, expr: 'surprised' },
  crank: { dur: Infinity },
  purse: { dur: Infinity },
  insert: { dur: Infinity },
  reach_low: { dur: 1.1 },
  twist_open: { dur: 1.0 },
  show: { dur: 2.4, expr: 'happy' },
  sigh: { dur: 2.2, expr: 'sad' },
  beckon: { dur: 2.0, expr: 'smile' },
  drink: { dur: Infinity },
  hold_can: { dur: Infinity },
  smoke: { dur: Infinity },
  read_board: { dur: Infinity },
  pull_cart: { dur: Infinity },
  leash: { dur: Infinity },
  post: { dur: 1.6 },
  water: { dur: Infinity },
  sweep: { dur: Infinity },
  handlebar: { dur: Infinity },
  stretch: { dur: 2.6 },
  yawn: { dur: 2.2, expr: 'sleepy' },
  phone_call: { dur: Infinity },
});

const arm = (x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [x, y, z], p: [px, py, pz], hand: [hx, hy, hz] });
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
function frame(h) {
  const P = h.P, k = P.H / 1.72;
  return { P, k, sx: P.shX, sy: P.shoulderY - P.waistY, eye: P.eyeY - P.waistY, chin: P.chin - P.waistY, zf: P.zf, m: (v) => v * k };
}
const pocketL = (F) => arm(F.m(0.135), -F.m(0.105), F.m(0.065), 1, 0.15, -0.8);

Object.assign(EXTRA_POSES, {
  gasp(t, h, g) {
    const { chin, zf, m } = frame(h);
    g.hands = { L: null, R: null };
    const k = smooth(t / 0.18);
    g.L = arm(m(0.035), chin - m(0.02) - (1 - k) * m(0.2), zf + m(0.07), 1, -1, 0.1);
    g.R = arm(-m(0.035), chin - m(0.04) - (1 - k) * m(0.2), zf + m(0.07), -1, -1, 0.1);
    g.hands.L = [0, 1, 0.1, 0, 0, 1]; g.hands.R = [0, 1, 0.1, 0, 0, 1];
    g.head[0] = -0.12 * k; g.chest[0] = -0.06 * k; g.spine[0] = -0.03 * k;
    g.eyes = [0, -0.5];
  },
  crank(t, h, g) {
    const F = frame(h), { m, sx } = F;
    g.hands = { L: null, R: null };
    const a = -t * Math.PI * 2 * 1.05, r = m(0.055);
    g.R = arm(-m(0.07) + Math.cos(a) * r, -m(0.03) + Math.sin(a) * r, m(0.42), -1, -0.6, -0.3, 0, -1.2, 0);
    g.hands.R = [0, 0.2, 1, -0.3, -1, 0];
    g.L = arm(sx * 0.7, m(0.02), m(0.36), 1, -0.6, -0.3);
    g.hands.L = [0, 0.3, 1, 0, -1, 0.2];
    g.spine[0] = 0.12; g.chest[0] = 0.05; g.head[0] = 0.2; g.chest[1] = Math.sin(a) * 0.03;
    g.eyes = [0, 1];
  },
  purse(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    const pick = Math.max(0, Math.sin(t * 5.5)) ** 2;
    g.L = arm(m(0.04), -m(0.09), m(0.24), 1, -0.4, -0.6, 0, 0.5, 0);
    g.hands.L = [-0.2, 0.2, 1, 0, 1, 0];
    g.R = arm(-m(0.02), -m(0.06) + pick * m(0.03), m(0.25), -1, -0.4, -0.6);
    g.hands.R = [0.3, -0.3, 1, 0, -1, 0];
    g.head[0] = 0.4; g.neck[0] = 0.1; g.chest[0] = 0.06;
    g.eyes = [0, 1.5];
  },
  insert(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    const push = Math.max(0, Math.sin(t * 7.5));
    g.R = arm(-m(0.03), m(0.1), m(0.4) + push * m(0.04), -1, -0.8, -0.3);
    g.hands.R = [0, 0.2, 1, 0, -1, 0];
    g.L = arm(m(0.05), -m(0.09), m(0.22), 1, -0.4, -0.6, 0, 0.5, 0);
    g.spine[0] = 0.1; g.head[0] = 0.15;
    g.eyes = [0, 0.5];
  },
  reach_low(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    const k = t < 0.45 ? smooth(t / 0.45) : t < 0.7 ? 1 : 1 - smooth((t - 0.7) / 0.4);
    g.R = arm(-m(0.06), -m(0.1) - k * m(0.34), m(0.25) + k * m(0.1), -1, -0.3, -0.6);
    g.hands.R = [0, -0.6, 0.8, -0.5, -0.8, 0];
    g.L = arm(m(0.16), -m(0.2) - k * m(0.1), m(0.12), 1, -0.3, -0.6);
    g.spine[0] = 0.45 * k; g.chest[0] = 0.18 * k; g.head[0] = 0.2 * k;
  },
  twist_open(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    const tw = Math.sin(t * 14) * 0.5;
    g.L = arm(m(0.045), m(0.02), m(0.27), 1, -0.6, -0.5, 0, 0.6 + tw, 0);
    g.R = arm(-m(0.045), m(0.02), m(0.27), -1, -0.6, -0.5, 0, -0.6 - tw, 0);
    g.hands.L = [-1, 0.1, 0.2, 0, 0, 1]; g.hands.R = [1, 0.1, 0.2, 0, 0, 1];
    g.head[0] = 0.32; g.chest[0] = 0.04;
    g.eyes = [0, 1.5];
  },
  show(t, h, g) {
    const { m, sx, sy } = frame(h);
    g.hands = { L: null, R: null };
    const k = smooth(t / 0.3), bob = Math.sin(t * 6) * m(0.01);
    g.R = arm(-sx - m(0.02), sy - m(0.05) * (1 - k) + bob, m(0.3) * k + m(0.12), -1, -0.8, -0.2);
    g.hands.R = [0, 1, 0.2, 0, 0, 1];
    g.head[2] = 0.1; g.head[0] = -0.06; g.chest[1] = -0.1;
  },
  sigh(t, h, g) {
    const { m } = frame(h);
    const k = t < 0.5 ? smooth(t / 0.5) : t < 1.6 ? 1 : 1 - smooth((t - 1.6) / 0.6);
    g.lift = -m(0.03) * k;
    g.head[0] = 0.32 * k; g.chest[0] = 0.12 * k; g.spine[0] = 0.04 * k; g.neck[0] = 0.06 * k;
    g.eyes = [0, 1];
  },
  beckon(t, h, g) {
    const { m, sx, sy } = frame(h);
    g.hands = { L: null, R: null };
    const f = Math.sin(t * 11);
    g.R = arm(-sx - m(0.12), sy + m(0.06), m(0.16), -1, -1, -0.4, 0.6 + f * 0.6, 0, 0);
    g.hands.R = [0, 0.3 + f * 0.6, 1, 0, -1, 0];
    g.head[2] = 0.06; g.chest[1] = -0.08;
  },
  drink(t, h, g) {
    const { m, chin, zf } = frame(h);
    g.hands = { L: null, R: null };
    const c = t % 6.5, up = c > 4.2 && c < 5.8 ? smooth((c - 4.2) / 0.4) * (1 - smooth((c - 5.4) / 0.4)) : 0;
    const lo = [-m(0.09), -m(0.04), m(0.2)], hi = [-m(0.03), chin - m(0.03), zf + m(0.07)];
    g.R = arm(lo[0] + (hi[0] - lo[0]) * up, lo[1] + (hi[1] - lo[1]) * up, lo[2] + (hi[2] - lo[2]) * up, -1, -1, -0.4, -1.2 * up, 0, 0);
    g.hands.R = [0, 1, 0.2, 1, 0, 0];
    g.head[0] = -0.28 * up; g.neck[0] = -0.06 * up;
    g.L = pocketL(frame(h));
    h.sipping = up > 0.6;
  },
  hold_can(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    g.R = arm(-m(0.13), -m(0.14), m(0.12), -1, -0.2, -0.8);
    g.hands.R = [0, 1, 0.2, 1, 0, 0];
  },
  smoke(t, h, g) {
    const F = frame(h), { m, sx, chin, zf } = F;
    g.hands = { L: null, R: null };
    const c = t % 7.5, up = c < 1.6 ? smooth(c / 0.4) * (1 - smooth((c - 1.2) / 0.4)) : 0;
    const lo = [-sx - m(0.0), -m(0.16), m(0.12)], hi = [-m(0.02), chin + m(0.0), zf + m(0.05)];
    g.R = arm(lo[0] + (hi[0] - lo[0]) * up, lo[1] + (hi[1] - lo[1]) * up, lo[2] + (hi[2] - lo[2]) * up, -1, -0.8, -0.4, -0.6 * up, 0, 0);
    g.hands.R = [0, 1, 0.3, 1, 0, 0];
    g.L = pocketL(F);
    g.head[0] = -0.06 * up + (1 - up) * 0.04; g.chest[0] = -0.02;
    h.puffing = up > 0.5;
  },
  read_board(t, h, g) {
    const { m, P } = frame(h);
    g.hands = { L: null, R: null };
    const z = -P.chestZ - m(0.1);
    g.L = arm(m(0.05), -m(0.18), z, 1, 0.2, 0.6);
    g.R = arm(-m(0.05), -m(0.18), z, -1, 0.2, 0.6);
    g.head[0] = -0.04 + Math.sin(t * 0.5) * 0.05; g.head[1] = Math.sin(t * 0.33) * 0.22; g.chest[0] = -0.04;
    g.eyes = [Math.sin(t * 0.33 + 0.5) * 1.5, -0.3];
  },
  pull_cart(t, h, g) {
    const { m, sx } = frame(h);
    g.hands = { L: null, R: null };
    g.R = arm(-sx - m(0.04), -m(0.22), -m(0.16), -1, 0.2, 0.8, 0.4, 0, 0);
    g.hands.R = [0, -1, -0.3, -1, 0, 0];
  },
  leash(t, h, g) {
    const { m, sx } = frame(h);
    g.hands = { L: null, R: null };
    const tug = h.leashTug ? Math.sin(t * 9) * m(0.02) * h.leashTug : 0;
    g.R = arm(-sx + m(0.0), -m(0.13), m(0.2) + tug, -1, -0.3, -0.7);
    g.hands.R = [0, 0.2, 1, -1, 0, 0];
  },
  post(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    const k = t < 0.5 ? smooth(t / 0.5) : t < 1.0 ? 1 : 1 - smooth((t - 1.0) / 0.5);
    g.R = arm(-m(0.05), m(0.06), m(0.18) + k * m(0.26), -1, -0.8, -0.3);
    g.hands.R = [0, 0, 1, 0, -1, 0];
    g.head[0] = 0.12;
  },
  water(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    const sway = Math.sin(t * 0.8) * m(0.05);
    g.R = arm(-m(0.12) + sway, -m(0.12), m(0.34), -1, -0.4, -0.6, 0.5, 0, 0);
    g.hands.R = [0, 0.3, 1, -1, 0, 0];
    g.L = arm(m(0.12), -m(0.2), m(0.12), 1, -0.3, -0.7);
    g.spine[0] = 0.16; g.head[0] = 0.35;
  },
  sweep(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    const s = Math.sin(t * 3.2) * m(0.14);
    g.L = arm(m(0.02) + s * 0.4, m(0.06), m(0.24), 1, -0.6, -0.5);
    g.R = arm(-m(0.03) + s, -m(0.18), m(0.3), -1, -0.5, -0.6);
    g.hands.L = [0, -1, 0.3, -1, 0, 0]; g.hands.R = [0, -1, 0.3, -1, 0, 0];
    g.spine[0] = 0.22; g.head[0] = 0.25; g.chest[1] = s * 1.2;
  },
  handlebar(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    g.L = arm(m(0.21), -m(0.02), m(0.4), 1, -0.6, -0.3);
    g.R = arm(-m(0.21), -m(0.02), m(0.4), -1, -0.6, -0.3);
    g.hands.L = [0, 0, 1, 0, -1, 0]; g.hands.R = [0, 0, 1, 0, -1, 0];
    g.spine[0] = 0.24; g.chest[0] = 0.08; g.head[0] = -0.18;
  },
  stretch(t, h, g) {
    const { m, sy } = frame(h);
    g.hands = { L: null, R: null };
    const k = t < 0.6 ? smooth(t / 0.6) : t < 1.9 ? 1 : 1 - smooth((t - 1.9) / 0.7);
    g.L = arm(m(0.08), sy + m(0.1) + k * m(0.42), m(0.05), 1, 0.2, -0.3);
    g.R = arm(-m(0.08), sy + m(0.1) + k * m(0.42), m(0.05), -1, 0.2, -0.3);
    g.head[0] = -0.2 * k; g.chest[0] = -0.08 * k; g.spine[0] = -0.05 * k;
  },
  yawn(t, h, g) {
    const { chin, zf, m } = frame(h);
    g.hands = { L: null, R: null };
    const k = t < 0.4 ? smooth(t / 0.4) : t < 1.6 ? 1 : 1 - smooth((t - 1.6) / 0.6);
    g.R = arm(-m(0.03), chin - m(0.02) - (1 - k) * m(0.25), zf + m(0.06), -1, -1, 0);
    g.head[0] = -0.18 * k;
  },
  phone_call(t, h, g) {
    const F = frame(h), { m, eye, zf } = F;
    g.hands = { L: null, R: null };
    const w = [-m(0.075), eye - m(0.1), zf - m(0.05)];
    g.R = arm(w[0], w[1], w[2], -1, -0.9, -0.4);
    g.hands.R = [0, 1, 0, 1, 0, 0];
    g.prop = [w[0] - m(0.01), w[1] + m(0.05), w[2] + m(0.01)];
    g.L = pocketL(F);
    g.head[2] = -0.08 + Math.sin(t * 0.7) * 0.04; g.head[0] = 0.05;
  },
});
