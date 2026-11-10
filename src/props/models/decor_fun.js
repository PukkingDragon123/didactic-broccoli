// The museum's "fun" decor (ids from src/data/props/decor_fun.js), part one: the candy set (a giant swirl lollipop, a
// cupcake, a donut seat, a candy-cane heart, a gumdrop tree, a soft-serve stand, a macaron tower), the space set (a
// retro rocket on its pad, a Saturn lamp, a UFO taking a cow, an astronaut statue, a moon rock, a star lamp) and the
// city set (a neon ガチャ sign, a capsule statue, an arcade cabinet, a green payphone, an old street lamp, a bus stop).
// Facing +z, bottom-centre origin, each filling its old voxel box (src/props/bounds.js). Every design is original.
import { mat, paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { tones, leaf, flower, plank, blade } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot, hazard, sticker } from '../kit/prints.js';
import { capsule } from './garage.js';

export const TAU = Math.PI * 2;
/** Candy / glossy sugar: a soft highlight. */
export const candy = (c, k = 0.25) => mat(c, 0.38, lighten(c, k));
/** Build fn in a frame whose +y points along n, at p. */
export function stick(K, p, n, fn, o = {}) {
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  K.at(p, fn, { rx: Math.acos(Math.max(-1, Math.min(1, n[1] / l))), ry: Math.atan2(n[0], n[2]), s: o.s });
}
/** A grid surface P(u, v) (u round, v along), nu x nv quads; out(u, v): the outward direction (or the centre's opposite). */
export function surf(K, c, nu, nv, P, out) {
  if (!K.detail) { nu = Math.max(3, Math.ceil(nu / 2)); nv = Math.max(1, Math.ceil(nv / 2)); }
  K.use(c, (G) => {
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const u0 = i / nu, u1 = (i + 1) / nu, v0 = j / nv, v1 = (j + 1) / nv;
      G.quad(P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), out((u0 + u1) / 2, (v0 + v1) / 2));
    }
  });
  return K;
}
/** A flat round face in the local xy plane facing +z (or -z with back), a colour or a painted region V. */
export function disc(K, c, x, y, z, r, n = 12, o = {}) {
  n = K.seg(n);
  const s = o.back ? -1 : 1, P = (a) => [x + Math.cos(a) * r, y + Math.sin(a) * r, z], h = [0, 0, s];
  if (c && c.st) { for (let k = 0; k < n; k++) { const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, T = (a) => [0.5 + Math.cos(a) * 0.49 * s, 0.5 + Math.sin(a) * 0.49]; K.triUV(c, [x, y, z], P(a0), P(a1), [[0.5, 0.5], T(a0), T(a1)], h); } return K; }
  K.use(c, (G) => { for (let k = 0; k < n; k++) G.tri([x, y, z], P((k / n) * TAU), P(((k + 1) / n) * TAU), h); });
  return K;
}
/** A tube in bands of alternating colours (candy stripes), rounded at both ends. */
export function striped(K, pts, r, cols, band, o = {}) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  const at = (s) => { let i = 1; while (i < pts.length - 1 && L[i] < s) i++; const t = (s - L[i - 1]) / (L[i] - L[i - 1] || 1); return pts[i - 1].map((v, k) => v + (pts[i][k] - v) * t); };
  const total = L[L.length - 1], nb = Math.max(1, Math.round(total / band));
  for (let b = 0; b < nb; b++) {
    const s0 = (b / nb) * total, s1 = ((b + 1) / nb) * total, sub = [at(s0)];
    for (let i = 1; i < pts.length - 1; i++) if (L[i] > s0 && L[i] < s1) sub.push(pts[i]);
    sub.push(at(s1));
    K.tube(cols[b % cols.length], sub, r, o.n ?? 8, { caps: false });
  }
  if (o.ends !== false) { K.ball(cols[0], ...pts[0], r, r, r, o.n ?? 8, 3); K.ball(cols[(nb - 1) % cols.length], ...pts[pts.length - 1], r, r, r, o.n ?? 8, 3); }
  return K;
}
/** Points on the sphere (golden angle), from the top down to y >= ymin (as a fraction of the radius). */
export function sphereDots(n, ymin = -1) {
  const out = [];
  for (let i = 0; i < n; i++) { const y = 1 - (2 * (i + 0.5)) / n; if (y < ymin) continue; const r = Math.sqrt(1 - y * y), a = i * 2.39996; out.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
  return out;
}
/** A gumdrop / jelly: a sugared dome. */
function gumdrop(K, c, s = 1) { K.lathe(candy(c, 0.3), [0, 0, 0], [[0, 0], [0.048 * s, 0], [0.05 * s, 0.012 * s], [0.044 * s, 0.038 * s], [0.026 * s, 0.056 * s], [0, 0.062 * s]], 7); }
/** A macaron with its flat face down at the origin (shell, ruffled foot, filling, shell). */
function macaron(K, c, fill, s = 1) {
  // (the face pressed against the tower's cone is never seen: it starts at the bottom shell's rim)
  const sh = matte(c, 0.2);
  K.lathe(sh, [0, 0, 0], [[0.03 * s, 0.002 * s], [0.045 * s, 0.01 * s], [0.048 * s, 0.017 * s]], 5);
  K.lathe(matte(darken(c, 0.06), 0.1), [0, 0, 0], [[0.048 * s, 0.017 * s], [0.042 * s, 0.02 * s]], 5);
  K.cyl(fabric(fill), 0, 0.02 * s, 0, 0.041 * s, 0.009 * s, 5, { caps: false });
  K.lathe(matte(darken(c, 0.06), 0.1), [0, 0, 0], [[0.042 * s, 0.029 * s], [0.048 * s, 0.032 * s], [0.045 * s, 0.036 * s]], 5);
  K.lathe(sh, [0, 0, 0], [[0.045 * s, 0.036 * s], [0.044 * s, 0.045 * s], [0.03 * s, 0.052 * s], [0, 0.054 * s]], 5);
}
/** A round plinth with a moulded rim. */
function plinth(K, c, r, h, o = {}) {
  K.lathe(c, [0, 0, 0], [[0, 0], [r, 0], [r, h * 0.6], [r - h * 0.15, h * 0.75], [r - h * 0.15, h], [0, h]], o.n ?? 14);
  return h;
}
/** Sprinkles: little sugar rods hand-set over a surface given as points with their normals. */
function sprinkles(K, list, cols, len = 0.034, r = 0.0065) {
  list.forEach(([p, n], i) => {
    const t = [n[2], 0, -n[0]], l = Math.hypot(...t) || 1, a = i * 1.7, q = [t[0] / l * Math.cos(a), Math.sin(a) * 0.6, t[2] / l * Math.cos(a)];
    K.rod(candy(cols[i % cols.length], 0.2), [p[0] - q[0] * len / 2, p[1] - q[1] * len / 2, p[2] - q[2] * len / 2], [p[0] + q[0] * len / 2, p[1] + q[1] * len / 2, p[2] + q[2] * len / 2], r, 4);
  });
}
const SPR = [0xf2efe6, 0xf2c21c, 0x5aa8e8, 0x7ac86a, 0xe86a8a, 0xb88ae8];
/** A ribbon bow (two loops, a knot, two tails) in the xy plane at p. */
function bow(K, c, p, s = 1) {
  K.at(p, () => {
    K.sym((d) => {
      K.at([d * 0.045 * s, 0.005 * s, 0], () => K.torus(c, 0, 0, 0, 0.034 * s, 0.011 * s, 10, 4, { axis: 'z' }), { s: [1.25, 0.7, 0.8], rz: d * 0.25 });
      K.tube(c, [[0, -0.005 * s, 0.006 * s], [d * 0.025 * s, -0.05 * s, 0.01 * s], [d * 0.045 * s, -0.09 * s, 0.006 * s]], 0.01 * s, 4, { flat: [0.026 * s, 0.006 * s], up: [0, 0, 1] });
    });
    K.ball(c, 0, 0, 0.004 * s, 0.018 * s, 0.016 * s, 0.014 * s, 8, 4);
  });
}

export default {
  family: 'fun',
  models: {
    // ------------------------------------------------------------- a giant swirl lollipop on a frosted base (0.53 x 1.83 x 0.43)
    lollipop: (K, B) => {
      const cy = B.y1 - 0.262, R = 0.262, ri = 0.2;
      plinth(K, candy(0xf2a6c0), 0.2, 0.08);
      K.torus(candy(0xfaf0f2, 0.15), 0, 0.075, 0, 0.17, 0.016, 16, 4); // a piped icing ring
      K.cyl(matte(0xf4f0e8, 0.06), 0, 0.08, 0, 0.022, cy - 0.08, 10);
      const sw = K.patch('swirl', 64, 64, (V) => {
        const C = [0xf06a9a, 0xfaf4ee, 0xf2c84a, 0xfaf4ee, 0x5aa8e8, 0xfaf4ee, 0x7ac86a, 0xfaf4ee];
        for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const dx = i + 0.5 - 32, dy = j + 0.5 - 32, r = Math.hypot(dx, dy) / 32, a = Math.atan2(dy, dx) / TAU; V.px(i, j, C[((Math.floor((a + r * 1.25) * 8) % 8) + 8) % 8]); }
        V.ring(32, 32, 30.5, 32, 0xf06a9a);
      }, { rough: 0.38 });
      K.lathe(candy(0xf06a9a), [0, cy, 0], [[ri, -0.048], [0.235, -0.044], [0.255, -0.026], [R, 0], [0.255, 0.026], [0.235, 0.044], [ri, 0.048]], 14, { axis: 'z' });
      disc(K, sw, 0, cy, 0.048, ri, 14); disc(K, sw, 0, cy, -0.048, ri, 14, { back: true });
      bow(K, candy(0x5a8ad8, 0.2), [0, cy - R - 0.02, 0.03]);
    },

    // ------------------------------------------------------------- a giant cupcake (0.66 x 0.96 x 0.66)
    cupcake: (K) => {
      // the pleated paper cup: 24 pleats, flaring out, a rolled rim
      const N = 24, cup = matte(0x9ad8c0, 0.12), cupD = matte(0x7ac0a8, 0.1);
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * TAU, a1 = ((k + 0.5) / N) * TAU, a2 = ((k + 1) / N) * TAU, P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
        K.quad(cup, P(a0, 0.24, 0), P(a1, 0.232, 0), P(a1, 0.3, 0.4), P(a0, 0.31, 0.4), [Math.cos(a0 + 0.1), -0.15, Math.sin(a0 + 0.1)]);
        K.quad(cupD, P(a1, 0.232, 0), P(a2, 0.24, 0), P(a2, 0.31, 0.4), P(a1, 0.3, 0.4), [Math.cos(a2 - 0.1), -0.15, Math.sin(a2 - 0.1)]);
      }
      K.cyl(cupD, 0, 0, 0, 0.24, 0.006, 12);
      // the sponge peeking over the paper, then the piped frosting: three tiers turning into a peak
      K.lathe(matte(0xd8a868, 0.12), [0, 0.38, 0], [[0.3, 0], [0.315, 0.04], [0.3, 0.07]], 14);
      const fr = candy(0xf4a6c4, 0.22);
      K.lathe(fr, [0, 0.42, 0], [[0.3, 0], [0.33, 0.045], [0.31, 0.1], [0.25, 0.13], [0.26, 0.17], [0.24, 0.23], [0.17, 0.26], [0.18, 0.3], [0.15, 0.35], [0.08, 0.38], [0.06, 0.41], [0, 0.43]], 14);
      // sprinkles over the frosting, a cherry with its stem
      const FR = [[0.33, 0.045], [0.31, 0.1], [0.25, 0.13], [0.26, 0.17], [0.24, 0.23], [0.17, 0.26], [0.18, 0.3], [0.15, 0.35], [0.08, 0.38]];
      const rAt = (t) => { for (let k = 1; k < FR.length; k++) if (t <= FR[k][1]) { const f = (t - FR[k - 1][1]) / (FR[k][1] - FR[k - 1][1]); return FR[k - 1][0] + (FR[k][0] - FR[k - 1][0]) * f; } return 0.08; };
      const sp = sphereDots(90, 0.0).map(([x, y, z]) => { const t = 0.05 + y * 0.32, r = rAt(t) + 0.003, l = Math.hypot(x, z) || 1; return [[(x / l) * r, 0.42 + t, (z / l) * r], [x / l, 0.7, z / l]]; });
      sprinkles(K, sp, SPR);
      K.ball(candy(0xd8283a, 0.35), 0, 0.88, 0, 0.05, 0.047, 0.05, 10, 5);
      K.tube(matte(0x5a3a22), [[0, 0.92, 0], [0.01, 0.94, 0.0], [0.03, 0.96, -0.01]], 0.005, 4);
    },

    // ------------------------------------------------------------- a donut seat: iced, with sprinkles (0.86 x 0.38 x 0.86)
    donut_seat: (K, B) => {
      const R = 0.27, r = 0.16, cy = B.y1 / 2;
      K.torus(matte(0xd8a060, 0.16), 0, cy, 0, R, r, 18, 6);
      K.torus(matte(0xeacb8a, 0.1), 0, cy - 0.03, 0, R + r - 0.012, 0.016, 24, 4); // the pale ring where it floated in the fryer
      // the icing: over the top, a little down each side, with drips on the outside
      const e = 0.007, prof = [];
      for (let k = 0; k <= 14; k++) { const b = -0.12 + (k / 14) * (Math.PI + 0.1); prof.push([R + Math.cos(b) * (r + e), Math.sin(b) * (r + e)]); }
      K.lathe(candy(0xf08ab0, 0.25), [0, cy, 0], prof, 18);
      for (let k = 0; k < 11; k++) { const a = (k / 11) * TAU + 0.2, l = 0.03 + ((k * 7) % 5) * 0.012, x = Math.cos(a), z = Math.sin(a), ro = R + r * Math.cos(-0.12) + e; K.tube(candy(0xf08ab0, 0.25), [[x * (ro - 0.004), cy + Math.sin(-0.12) * (r + e) + 0.01, z * (ro - 0.004)], [x * (ro - 0.006), cy + Math.sin(-0.12) * (r + e) - l, z * (ro - 0.006)]], 0.016, 6, { r1: 0.012 }); K.ball(candy(0xf08ab0, 0.25), x * (ro - 0.006), cy + Math.sin(-0.12) * (r + e) - l, z * (ro - 0.006), 0.012, 0.012, 0.012, 6, 3); }
      // sprinkles on the icing's crown
      const sp = [];
      for (let i = 0; i < 64; i++) { const a = i * 2.39996, t = ((i * 0.618) % 1) * 1.6 - 0.8 + Math.PI / 2, rr = R + Math.cos(t) * (r + e + 0.002); sp.push([[Math.cos(a) * rr, cy + Math.sin(t) * (r + e + 0.002), Math.sin(a) * rr], [Math.cos(a) * Math.cos(t), Math.sin(t), Math.sin(a) * Math.cos(t)]]); }
      sprinkles(K, sp, SPR, 0.04, 0.0075);
    },

    // ------------------------------------------------------------- two candy canes leaning into a heart (0.58 x 1.6 x 0.48)
    candy_cane: (K, B) => {
      const tr = 0.032, cy = B.y1 - tr - 0.13, cols = [candy(0xd8283a), candy(0xf6f2ea, 0.1)];
      plinth(K, candy(0xf6f2ea, 0.1), 0.2, 0.09);
      K.torus(candy(0x3a9a5a), 0, 0.09, 0, 0.18, 0.018, 16, 4);
      for (const [a, c] of [[0.3, 0xd8283a], [2.4, 0xd8283a], [4.4, 0xd8283a]]) { K.ball(candy(c, 0.35), Math.cos(a) * 0.13, 0.11, Math.sin(a) * 0.1, 0.022, 0.022, 0.022, 8, 4); leaf(K, matte(0x3a8a4a), [Math.cos(a) * 0.13, 0.1, Math.sin(a) * 0.1], [Math.cos(a + 0.4) * 0.19, 0.1, Math.sin(a + 0.4) * 0.15], 0.04); }
      K.sym((s) => {
        const z = s * 0.022, pts = [[s * 0.02, 0.12, z], [s * 0.1, 0.62, z], [s * 0.2, 1.12, z], [s * 0.245, 1.32, z]];
        for (let k = 1; k <= 12; k++) { const a = (k / 12) * (Math.PI + 0.75); pts.push([s * (0.13 + Math.cos(a) * 0.13), cy + Math.sin(a) * 0.13, z]); }
        striped(K, pts, tr, cols, 0.07, { n: 8 });
      });
      bow(K, candy(0xf06a9a, 0.2), [0, 0.3, 0.035], 1.5);
    },

    // ------------------------------------------------------------- a gumdrop tree in a frosted tub (1.03 x 1.83 x 0.73)
    gumdrop_tree: (K, B) => {
      // the tub: pink with a piped white rim
      K.lathe(candy(0xf2a6c0), [0, 0, 0], [[0, 0], [0.2, 0], [0.24, 0.3], [0, 0.3]], 14);
      K.torus(candy(0xfaf0f2, 0.1), 0, 0.3, 0, 0.235, 0.02, 16, 4);
      K.cyl(matte(0x6a4630), 0, 0.29, 0, 0.21, 0.02, 14);
      // a barley-sugar trunk: brown and cream bands, a gentle S
      striped(K, [[0, 0.3, 0], [0.03, 0.6, 0.01], [-0.02, 0.9, 0], [0, 1.05, 0]], 0.045, [candy(0x8a5432, 0.2), candy(0xf2e2c8, 0.1)], 0.06, { n: 8, ends: false });
      // the crown: a frosted green dome studded with gumdrops in every colour
      const cy = 1.35, rx = B.x1 - 0.06, ry = B.y1 - cy - 0.05, rz = B.z1 - 0.06;
      K.ball(matte(0x6ab86a, 0.18), 0, cy, 0, rx * 0.86, ry * 0.88, rz * 0.86, 14, 7);
      const G = [0xf06a9a, 0xf2c84a, 0x5aa8e8, 0xe8842a, 0xb88ae8, 0xf2efe6, 0xd8283a, 0x7ac86a];
      sphereDots(46, -0.75).forEach(([x, y, z], i) => stick(K, [x * rx * 0.85, cy + y * ry * 0.87, z * rz * 0.85], [x / rx, y / ry, z / rz], () => gumdrop(K, G[i % G.length], 1 + (i % 3) * 0.12)));
    },

    // ------------------------------------------------------------- a soft-serve stand: pink base, chrome pole, a waffle cone (0.48 x 1.7 x 0.48)
    softserve: (K, B) => {
      plinth(K, candy(0xf2a6c0), 0.22, 0.07);
      K.cyl(chrome(), 0, 0.07, 0, 0.03, 0.85, 10);
      K.torus(chrome(), 0, 0.92, 0, 0.04, 0.01, 12, 4);
      // the waffle cone: a grid pressed into it, a rolled lip
      const waf = K.patch('waffle', 48, 48, (V) => { V.fill(0xd8a868); for (let k = -48; k < 96; k += 8) { V.line(k, 0, k + 48, 48, 0xb07a40); V.line(k + 48, 0, k, 48, 0xb07a40); } }, { rough: 0.85 });
      K.lathe(matte(0xd8a868, 0.12), [0, 0.9, 0], [[0, 0], [0.04, 0.03], [0.17, 0.42]], 12);
      K.wrap(waf, 0, 0.93, 1.32, 0, 0.04, { r1: 0.17, n: 12, lift: 0.002 });
      K.torus(matte(0xc8945a, 0.12), 0, 1.32, 0, 0.17, 0.02, 14, 4);
      // the swirl: one fat rope of pink and cream spiralling up to a curl
      const pts = [], radii = [];
      for (let k = 0; k <= 60; k++) { const t = k / 60, a = t * TAU * 3.1, rr = 0.15 * (1 - t) + 0.01, y = 1.36 + t * (B.y1 - 1.42) - Math.sin(t * Math.PI) * 0.0; pts.push([Math.cos(a) * rr, y, Math.sin(a) * rr]); radii.push(0.062 * (1 - t) + 0.022); }
      K.tube(candy(0xf6c4d4, 0.2), pts, 0.06, 9, { radii });
      K.tube(candy(0xf6c4d4, 0.2), [pts[60], [0.02, B.y1 - 0.04, 0.0], [0.05, B.y1 - 0.02, 0.01]], 0.02, 8, { radii: [0.022, 0.016, 0.006] });
    },

    // ------------------------------------------------------------- a macaron tower on a cake stand (0.5 x 1.3 x 0.5)
    macaron_tower: (K, B) => {
      K.lathe(ceramic(0xf4f0e8), [0, 0, 0], [[0, 0], [0.14, 0], [0.14, 0.01], [0.04, 0.03], [0.035, 0.1], [0.05, 0.11], [0.24, 0.12], [0.245, 0.135], [0, 0.135]], 14);
      K.lathe(matte(0xf6e2c8, 0.1), [0, 0.135, 0], [[0, 0], [0.2, 0], [0.04, 0.98], [0, 1.0]], 12); // the cream cone behind
      const C = [[0xf4b4c8, 0xfaf0f2], [0xb4d8a8, 0xf6f0e0], [0xf6dc8a, 0xfaf4e8], [0xc8b4e8, 0xf4eef8], [0xa8d0ec, 0xfaf8f4], [0xf6c4a0, 0x8a5432]];
      const rows = 8;
      for (let r = 0; r < rows; r++) {
        const t = r / (rows - 1), y = 0.19 + t * 0.88, R = 0.205 * (1 - t) + 0.05 * t, n = Math.max(3, Math.round((TAU * R) / 0.118)), slope = 0.16;
        for (let k = 0; k < n; k++) { const a = (k / n) * TAU + r * 0.4, x = Math.cos(a), z = Math.sin(a); stick(K, [x * R, y, z * R], [x, slope, z], () => macaron(K, C[(r + k) % C.length][0], C[(r + k) % C.length][1], 1.2)); }
      }
      K.ball(candy(0xd8283a, 0.3), 0, B.y1 - 0.065, 0, 0.045, 0.06, 0.045, 10, 5);
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; leaf(K, matte(0x4a9a4a), [0, B.y1 - 0.012, 0], [Math.cos(a) * 0.04, B.y1 - 0.004, Math.sin(a) * 0.04], 0.022); }
    },

    // ------------------------------------------------------------- a retro rocket on its launch pad (0.93 x 2.43 x 0.93)
    rocket: (K, B) => {
      const W = paint(0xeeeae0, 0.2), RD = paint(0xc8402a, 0.25);
      // the pad: a ring of hazard stripes on concrete, four clamps
      const hz = K.patch('padband', 96, 8, (V) => hazard(V, 0, 0, 96, 8, 0xf2c21c, 0x24221e, 6), { rough: 0.7 });
      K.lathe(stone(0x9a9a96), [0, 0, 0], [[0, 0], [0.44, 0], [0.44, 0.06], [0.4, 0.09], [0, 0.09]], 16);
      K.wrap(hz, 0, 0.012, 0.055, 0, 0.44, { n: 16 });
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; K.at([Math.cos(a) * 0.3, 0.09, Math.sin(a) * 0.3], () => { K.box(metal(0x6a6e72), -0.03, 0, -0.03, 0.03, 0.12, 0.03); K.rod(metal(0x6a6e72), [0, 0.1, 0], [-Math.cos(a) * 0.08, 0.22, -Math.sin(a) * 0.08], 0.012, 5); }); }
      // the nozzle, the fuselage (an ogive), the red nose
      K.lathe(metal(0x4a4e52, 0.3), [0, 0.09, 0], [[0.08, 0], [0.13, 0], [0.1, 0.12], [0.16, 0.2]], 14);
      K.lathe(W, [0, 0.29, 0], [[0, 0], [0.17, 0], [0.205, 0.08], [0.235, 0.35], [0.24, 0.7], [0.23, 1.05], [0.2, 1.35], [0.175, 1.5]], 14);
      K.lathe(RD, [0, 1.79, 0], [[0.175, 0], [0.15, 0.16], [0.11, 0.33], [0.06, 0.5], [0.015, 0.62], [0, B.y1 - 1.79]], 14);
      K.torus(RD, 0, 0.92, 0, 0.237, 0.014, 18, 4); K.torus(RD, 0, 1.0, 0, 0.237, 0.014, 18, 4);
      // portholes: chrome rims, blue glass
      for (const y of [1.25, 1.52]) {
        const R = 0.233 - (y - 1.25) * 0.12;
        K.at([0, y, R - 0.006], () => { K.torus(chrome(), 0, 0, 0, 0.055, 0.012, 14, 4, { axis: 'z' }); K.glass(() => K.ball(K.tint(0x6a9ad0, 170, 0.1), 0, 0, -0.004, 0.05, 0.05, 0.018, 12, 3)); });
      }
      const dec = K.patch('rocketname', 16, 64, (V) => { V.fill(0xeeeae0); kana(K, V, 'ツキ', 1, 62, 0xc8402a, { size: 14, vert: true }); V.text5('7', 8, 22, 0x24221e, { align: 'center', s: 2 }); }, { rough: 0.6 });
      K.wrap(dec, 0, 0.42, 0.85, 0, 0.236, { n: 14, arc: 0.5, turn: 0.9 });
      // four swept fins
      for (let k = 0; k < 4; k++) K.at([0, 0, 0], () => K.prism(RD, [[0.2, 0.62], [0.24, 0.92], [0.33, 0.6], [B.x1 - 0.005, 0.18], [B.x1 - 0.02, 0.1], [0.37, 0.18], [0.16, 0.3]], { plane: 'xy', a: -0.018, b: 0.018 }), { ry: (k * TAU) / 4 });
    },

    // ------------------------------------------------------------- a Saturn lamp: banded globe lit inside, a tilted ring (0.82 x 1.3 x 0.78)
    planet_lamp: (K, B) => {
      K.lathe(wood(0x6a4630), [0, 0, 0], [[0, 0], [0.17, 0], [0.17, 0.035], [0.13, 0.06], [0, 0.06]], 14);
      K.cyl(metal(0xc8a44a, 0.3), 0, 0.06, 0, 0.016, 0.74, 8);
      K.lathe(metal(0xc8a44a, 0.3), [0, 0.78, 0], [[0.016, 0], [0.05, 0.03], [0.05, 0.05], [0.02, 0.06]], 10);
      const cy = B.y1 - 0.25, R = 0.22;
      // the globe: bands of warm cream and amber, lit from inside
      const bands = [0x9a7a5a, 0xa88a62, 0x8a6a4e, 0xa48a6c, 0x94704e, 0xa88a62, 0x8a6a4e, 0x9a7a5a];
      K.glow(() => { for (let k = 0; k < bands.length; k++) { const p = []; for (let j = 0; j <= 2; j++) { const b = -Math.PI / 2 + ((k + j / 2) / bands.length) * Math.PI; p.push([Math.cos(b) * R, Math.sin(b) * R]); } K.lathe(flat(bands[k], 0.5), [0, cy, 0], p, 14); } });
      // the ring: a flat band, tilted, on two little posts
      K.at([0, cy, 0], () => { K.lathe(matte(0xb8a8d8, 0.15), [0, 0, 0], [[B.x1 - 0.005, -0.008], [B.x1 - 0.005, 0.008], [0.29, 0.008], [0.29, -0.008], [B.x1 - 0.005, -0.008]], 20); K.lathe(matte(0x9a88c0, 0.1), [0, 0.0005, 0], [[0.355, 0.009], [0.33, 0.009]], 20); for (const s of [-1, 1]) K.rod(metal(0xc8a44a, 0.3), [s * 0.2, 0, 0], [s * 0.3, 0, 0], 0.008, 4); }, { rz: 0.32, rx: 0.12 });
    },

    // ------------------------------------------------------------- a UFO beaming up a cow (1.13 x 1.5 x 1.13)
    ufo: (K, B) => {
      // the base: a disc of turf with a crop ring pressed into it
      K.lathe(matte(0x6a9a4a, 0.12), [0, 0, 0], [[0, 0], [0.5, 0], [0.52, 0.03], [0.48, 0.06], [0, 0.06]], 18);
      K.torus(matte(0x8ab05a, 0.1), 0, 0.058, 0, 0.32, 0.03, 18, 3, { s: 1 });
      // the beam (glass, the clear rod inside it holds the saucer up)
      K.glass(() => K.cyl(K.tint(0xe8f4f4, 60), 0, 0.06, 0, 0.025, 1.1, 8));
      K.glass(() => K.lathe(K.tint(0x80e8c8, 60, 0.2), [0, 0.06, 0], [[0.36, 0], [0.12, 1.08]], 16, { caps: false }));
      // the cow, rising, legs dangling
      K.at([0.02, 0.55, 0], () => {
        const cow = K.patch('cowspots', 48, 24, (V) => { V.fill(0xf2efe6); for (const [i, j, r] of [[6, 14, 5], [19, 6, 4], [30, 16, 6], [42, 8, 4], [12, 3, 3], [38, 21, 3]]) V.disc(i, j, r, 0x2a2624); }, { rough: 0.9 });
        K.at([0, 0, 0], () => { K.lathe(matte(0xf2efe6), [0, -0.1, 0], [[0, 0], [0.05, 0.01], [0.075, 0.05], [0.08, 0.12], [0.07, 0.19], [0.03, 0.21], [0, 0.215]], 10); K.wrapProfile(cow, 0, 0, [[0.077, -0.06], [0.08, 0.02], [0.074, 0.08]], { n: 10 }); }, { rz: Math.PI / 2, rx: 0.3 });
        K.at([0.13, 0.05, 0], () => { K.ball(matte(0xf2efe6), 0, 0, 0, 0.05, 0.045, 0.042, 10, 5); K.ball(matte(0xf0b8b0), 0.045, -0.02, 0, 0.03, 0.025, 0.035, 8, 4); K.sym((s) => { K.cyl(matte(0xe8e2d0), 0, 0.035, s * 0.03, 0.008, 0.04, 6, { r1: 0.003 }); K.ball(matte(0x2a2624), 0.035, 0.015, s * 0.028, 0.008, 0.008, 0.006, 6, 3); }); }, { rz: -0.3 });
        for (const [x, z] of [[-0.07, -0.04], [-0.07, 0.04], [0.06, -0.04], [0.06, 0.04]]) K.tube(matte(0xf2efe6), [[x, -0.04, z], [x + 0.01, -0.12, z * 1.2], [x + 0.025, -0.17, z * 1.3]], 0.013, 6, { radii: [0.016, 0.013, 0.012] });
        K.tube(matte(0xf2efe6), [[-0.11, 0.02, 0], [-0.15, -0.02, 0.01], [-0.16, -0.08, 0.02]], 0.006, 4);
      }, { rz: 0.25, ry: 0.4 });
      // the saucer: a chrome hull, a band of lights, a glass dome with a little green pilot
      const y0 = B.y1 - 0.34;
      K.lathe(chrome(0xb8c4c8), [0, y0, 0], [[0.12, 0], [0.3, 0.04], [B.x1 - 0.01, 0.12], [B.x1 - 0.005, 0.135], [0.5, 0.16], [0.3, 0.21], [0.2, 0.23], [0, 0.23]], 20);
      K.glow(() => { K.cyl(flat(0x3a8a6a, 0.5), 0, y0 - 0.02, 0, 0.12, 0.022, 14); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; K.ball(flat(k % 2 ? 0x9a8a3a : 0x3a8a7a, 0.5), Math.cos(a) * 0.43, y0 + 0.13, Math.sin(a) * 0.43, 0.022, 0.018, 0.022, 6, 3); } });
      K.ball(plastic(0x7ac87a), 0, y0 + 0.25, 0.0, 0.045, 0.05, 0.045, 10, 5); K.sym((s) => { K.ball(flat(0x1a1a1a, 0.3), s * 0.018, y0 + 0.26, 0.04, 0.009, 0.012, 0.006, 6, 3); K.rod(plastic(0x7ac87a), [s * 0.02, y0 + 0.29, 0], [s * 0.04, y0 + 0.33, 0], 0.003, 4); });
      K.glass(() => K.ball(K.tint(0xc8f0e8, 70, 0.08), 0, y0 + 0.22, 0, 0.12, 0.11, 0.12, 14, 5, { y0: 0 }));
    },

    // ------------------------------------------------------------- an astronaut statue waving from a moon-rock plinth (0.72 x 1.59 x 0.57)
    astronaut: (K, B) => {
      const suit = matte(0xeeeae2, 0.1), grey = matte(0x9a9ca0, 0.1), band = matte(0xc8c4ba, 0.1);
      K.lathe(stone(0x8a8c88), [0, 0, 0], [[0, 0], [0.32, 0], [0.33, 0.05], [0.3, 0.13], [0.26, 0.15], [0, 0.15]], 11, { sz: 0.8 });
      for (const [x, z, r] of [[0.15, 0.12, 0.04], [-0.12, 0.08, 0.03], [0.02, -0.12, 0.035]]) { K.torus(stone(0x7a7c78), x, 0.148, z, r, 0.008, 10, 3); K.cyl(flat(0x6a6c68, 0.95), x, 0.146, z, r, 0.003, 10); }
      // boots and puffy legs (bands at the knees)
      K.sym((s) => {
        K.lathe(grey, [s * 0.09, 0.15, 0.01], [[0, 0], [0.065, 0], [0.07, 0.04], [0.06, 0.1], [0, 0.11]], 10, { sz: 1.3 });
        K.tube(suit, [[s * 0.09, 0.24, 0], [s * 0.095, 0.45, 0], [s * 0.085, 0.7, 0]], 0.065, 9, { radii: [0.06, 0.068, 0.075] });
        K.torus(band, s * 0.093, 0.45, 0, 0.067, 0.012, 12, 3);
        // the arms: the right one waving overhead, the left at the side holding a helmet lamp
        if (s > 0) { K.tube(suit, [[0.17, 1.08, 0], [0.27, 1.2, 0.02], [0.28, 1.42, 0.04]], 0.05, 9, { radii: [0.058, 0.05, 0.045] }); K.torus(band, 0.27, 1.22, 0.02, 0.05, 0.01, 12, 3); K.ball(grey, 0.285, 1.49, 0.045, 0.045, 0.06, 0.035, 10, 5); }
        else { K.tube(suit, [[-0.17, 1.08, 0], [-0.23, 0.92, 0.02], [-0.22, 0.75, 0.06]], 0.05, 9, { radii: [0.058, 0.05, 0.045] }); K.torus(band, -0.23, 0.92, 0.02, 0.05, 0.01, 12, 3); K.ball(grey, -0.22, 0.7, 0.07, 0.045, 0.055, 0.04, 10, 5); }
      });
      // the torso, the chest panel, the backpack
      K.lathe(suit, [0, 0.66, 0], [[0, 0], [0.15, 0.02], [0.18, 0.14], [0.19, 0.3], [0.17, 0.44], [0.08, 0.49], [0, 0.5]], 12, { sz: 0.78 });
      const panel = K.patch('chest', 32, 24, (V) => { V.fill(0xc8c4ba); V.frame(0, 0, 32, 24, 0x8a8a86); V.box(3, 13, 13, 20, 0x2a3a5a); V.text5('GG', 8, 19, 0xf2efe6, { align: 'center' }); for (const [i, c] of [[17, 0xd8402a], [22, 0xf2c21c], [27, 0x3a9a5a]]) V.disc(i + 1, 16, 2.2, c); V.box(4, 3, 28, 8, 0x5a5e62); for (let i = 6; i < 27; i += 4) V.box(i, 4, i + 2, 7, 0xd8d4c8); }, { rough: 0.6 });
      K.at([0, 0.9, 0.142], () => { K.box(band, -0.09, -0.065, -0.03, 0.09, 0.065, 0.012, { bevel: 0.008 }); K.face(panel, '+z', -0.08, -0.055, 0.08, 0.055, 0.0125); }, { rx: -0.08 });
      K.box(matte(0xd8d4ca, 0.12), -0.15, 0.74, -0.27, 0.15, 1.12, -0.1, { bevel: 0.03 });
      for (const s of [-1, 1]) K.cyl(grey, s * 0.07, 1.12, -0.19, 0.03, 0.05, 8);
      // the helmet: a white shell, a gold visor, the neck ring
      K.torus(grey, 0, 1.15, 0, 0.11, 0.02, 14, 4);
      K.ball(suit, 0, 1.3, -0.005, 0.165, 0.165, 0.16, 14, 7);
      K.ball(mat(0x8a6a2a, 0.12, 0xd8b45a), 0, 1.31, 0.045, 0.128, 0.105, 0.135, 14, 6); // the gold visor
      K.at([0, 1.31, 0.03], () => K.torus(band, 0, 0, 0, 0.13, 0.014, 16, 3, { axis: 'z' }), { s: [1, 0.84, 1] });
    },

    // ------------------------------------------------------------- a moon rock with craters and a little flag (0.74 x 0.68 x 0.56)
    moon_rock: (K, B) => {
      const rk = tones(K, 0x86847e, { light: 0xa09e96, dark: 0x5e5e5c, hi: 0.6, lo: 0.15, rough: 0.95 });
      const LUMP = [[[0.7, 0.4, 0.5], 0.2], [[-0.8, 0.3, -0.2], 0.16], [[0.1, 0.9, -0.3], 0.1], [[-0.3, 0.2, 0.9], 0.15], [[0.5, -0.1, -0.85], 0.18], [[-0.6, 0.7, 0.4], -0.12], [[0.9, 0.1, -0.2], -0.1], [[0.2, 0.6, 0.8], -0.08], [[-0.9, -0.2, 0.5], 0.12]];
      const rock = (d) => { let k = 1; for (const [v, w] of LUMP) { const l = Math.hypot(...v), c = (d[0] * v[0] + d[1] * v[1] + d[2] * v[2]) / l; if (c > 0.25) k += w * 1.8 * ((c - 0.25) / 0.75) ** 1.4; } return k; };
      const RX = 0.33, RY = 0.36, RZ = 0.25, CY = 0.06, Pt = (u, v) => { const th = u * TAU, ph = -Math.PI / 2 + v * Math.PI, d = [Math.cos(ph) * Math.cos(th), Math.sin(ph), Math.cos(ph) * Math.sin(th)], k = rock(d) * (1 + 0.12 * Math.cos(3 * th + 0.5) * Math.cos(ph) + 0.08 * Math.sin(2 * th + 1.3)); return [d[0] * RX * k - 0.05 * Math.max(0, d[1]), Math.max(0, CY + d[1] * RY * k * (1 - 0.22 * d[0])), d[2] * RZ * k]; };
      K.crease = 28; // a rock keeps its facets
      surf(K, rk, 13, 7, Pt, (u, v) => { const p = Pt(u, v); return [p[0], p[1] - CY, p[2]]; });
      K.at([0.27, 0, 0.14], () => surf(K, rk, 9, 5, (u, v) => Pt((u + 0.4) % 1, v).map((x, i) => x * (i === 1 ? 0.5 : 0.38)), (u, v) => { const p = Pt((u + 0.4) % 1, v); return [p[0], p[1] - CY, p[2]]; }), { ry: 1.3 });
      K.lathe(flat(0x6a6a66, 0.95), [0, 0, 0], [[0, 0.02], [0.27, 0.02], [0, 0.021]], 10, { sz: 0.75 });
      // craters: raised rims, darker floors, set into the surface
      for (const [u, v, r] of [[0.28, 0.85, 0.06], [0.2, 0.68, 0.04], [0.9, 0.74, 0.04], [0.6, 0.62, 0.035]]) {
        const p = Pt(u, v), q = Pt(u + 0.01, v), w = Pt(u, v + 0.01), a = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], b = [w[0] - p[0], w[1] - p[1], w[2] - p[2]];
        let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; if (n[0] * p[0] + n[2] * p[2] + n[1] * (p[1] - CY) < 0) n = n.map((x) => -x);
        stick(K, p, n, () => { K.lathe(stone(0xa6a69e), [0, -0.008, 0], [[r * 1.3, 0], [r * 1.05, 0.009], [r * 0.95, 0.007]], 9); K.lathe(flat(0x7c7c76, 0.95), [0, -0.008, 0], [[r * 0.95, 0.007], [r * 0.5, 0.0], [0, -0.002]], 9); });
      }
      // the flag: an original mission flag on a thin pole
      K.cyl(chrome(), -0.12, 0.25, 0.02, 0.006, B.y1 - 0.25, 6);
      const fl = K.patch('moonflag', 32, 20, (V) => { V.fill(0xf2efe6); V.box(0, 0, 32, 4, 0x3a5a9a); V.box(0, 16, 32, 20, 0x3a5a9a); V.disc(11, 10, 5, 0xd8402a); V.disc(11, 10, 3, 0xf2efe6); V.disc(11, 10, 1.6, 0xd8402a); V.text5('GG', 23, 13, 0x3a5a9a, { align: 'center' }); }, { rough: 0.95 });
      K.quadUV(fl, [-0.12, B.y1 - 0.12, 0.02], [0.05, B.y1 - 0.13, 0.04], [0.05, B.y1 - 0.02, 0.04], [-0.12, B.y1 - 0.01, 0.02], [0.1, 0, 1], { both: true });
      K.rod(chrome(), [-0.12, B.y1 - 0.01, 0.02], [0.05, B.y1 - 0.02, 0.04], 0.004, 4);
    },

    // ------------------------------------------------------------- a star lamp with a hanging crescent (0.5 x 1.5 x 0.33)
    star_lamp: (K, B) => {
      K.lathe(paint(0x2a3a6a), [0, 0, 0], [[0, 0], [0.14, 0], [0.14, 0.03], [0.1, 0.05], [0, 0.05]], 14);
      K.cyl(metal(0xc8a44a, 0.3), 0, 0.05, 0, 0.014, 1.05, 8);
      // the crescent moon on a little arm, hanging from a chain
      K.rod(metal(0xc8a44a, 0.3), [0, 0.95, 0], [0.13, 0.95, 0], 0.006, 4);
      for (let k = 0; k < 4; k++) K.torus(metal(0xc8a44a, 0.3), 0.13, 0.93 - k * 0.02, 0, 0.008, 0.002, 6, 3, { axis: k % 2 ? 'x' : 'z' });
      const cres = []; for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + (k / 12) * Math.PI; cres.push([Math.cos(a) * 0.09, Math.sin(a) * 0.09]); } for (let k = 12; k >= 0; k--) { const a = -Math.PI / 2 + (k / 12) * Math.PI; cres.push([Math.cos(a) * 0.05 + 0.015, Math.sin(a) * 0.075]); }
      K.at([0.11, 0.78, 0], () => K.prism(candy(0xf2d26a, 0.2), cres.map(([x, y]) => [x, y]), { plane: 'xy', a: -0.015, b: 0.015 }), { rz: 0.4 });
      // the star: a puffy five-pointer lit from inside, a sleepy face
      const cy = B.y1 - 0.25, st = [];
      for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k / 10) * TAU, r = k % 2 ? 0.105 : 0.245; st.push([Math.cos(a) * r, Math.sin(a) * r]); }
      K.glow(() => {
        K.at([0, cy, 0], () => { K.prism(flat(0x9a8a3a, 0.5), st, { plane: 'xy', a: -0.04, b: 0.04, side: flat(0x8a7a34, 0.5) }); K.prism(flat(0xa8963e, 0.5), st.map(([x, y]) => [x * 0.75, y * 0.75]), { plane: 'xy', a: -0.055, b: 0.055 }); });
      });
      K.sym((s) => { K.tube(flat(0x3a2a1a, 0.6), [[s * 0.06, cy + 0.02, 0.056], [s * 0.045, cy + 0.008, 0.057], [s * 0.03, cy + 0.02, 0.056]], 0.004, 4); K.ball(flat(0xe88a8a, 0.8), s * 0.075, cy - 0.015, 0.054, 0.016, 0.01, 0.004, 8, 2); });
      K.tube(flat(0x3a2a1a, 0.6), [[-0.015, cy - 0.02, 0.056], [0, cy - 0.03, 0.057], [0.015, cy - 0.02, 0.056]], 0.004, 4);
    },

    // ------------------------------------------------------------- a neon ガチャ sign in a black box on two feet (1.38 x 0.93 x 0.23)
    neon_gacha: (K, B) => {
      const W = B.x1 - 0.01, y0 = 0.14, y1 = B.y1 - 0.005, blk = paint(0x24242a, 0.2);
      // the box: a black frame round a dark navy backboard, the transformer behind, two T feet
      K.box(blk, -W, y0, -0.05, W, y1, 0.0, { bevel: 0.012 });
      K.box(flat(0x1a2034, 0.7), -W + 0.035, y0 + 0.035, 0.0, W - 0.035, y1 - 0.035, 0.004);
      for (const [a, b, c, d] of [[-W, y0, W, y0 + 0.035], [-W, y1 - 0.035, W, y1], [-W, y0, -W + 0.035, y1], [W - 0.035, y0, W, y1]]) K.box(blk, a, b, 0, c, d, 0.03);
      K.box(metal(0x5a5e62), -0.12, 0.4, -0.11, 0.12, 0.56, -0.05, { bevel: 0.01 });
      K.sym((s) => { K.box(blk, s * 0.45 - 0.025, 0.02, -0.03, s * 0.45 + 0.025, y0, 0.0); K.box(blk, s * 0.45 - 0.05, 0, -B.z1 + 0.005, s * 0.45 + 0.05, 0.025, B.z1 - 0.005, { bevel: 0.008 }); });
      K.tube(rubber(), [[0.12, 0.45, -0.08], [0.3, 0.3, -0.07], [0.4, 0.05, -0.04], [0.6, 0.012, 0.05]], 0.008, 5);
      // the tubes: ガチャ in pink, a rounded cyan border, on little clear standoffs
      const neon = (pts, col, s = 1) => { K.glow(() => K.tube(flat(col, 0.4), pts, 0.012 * s, 6)); };
      const P = (cx, cy, sc) => (p) => [cx + (p[0] - 0.5) * sc, cy + (p[1] - 0.5) * sc, 0.04];
      const pink = 0xa83a7a, sc = 0.44, cy = (y0 + y1) / 2 + 0.01;
      const GA = [[[0.08, 0.62], [0.72, 0.62], [0.66, 0.2], [0.52, 0.1]], [[0.42, 0.9], [0.38, 0.45], [0.1, 0.05]], [[0.8, 0.95], [0.84, 0.8]], [[0.93, 0.92], [0.97, 0.78]]];
      const CHI = [[[0.28, 0.82], [0.72, 0.94]], [[0.08, 0.6], [0.92, 0.6]], [[0.5, 0.88], [0.5, 0.36], [0.28, 0.06]]];
      const YA = [[[0.12, 0.42], [0.8, 0.52], [0.66, 0.32]], [[0.34, 0.66], [0.48, 0.0]]];
      for (const [glyph, cx, s] of [[GA, -0.42, 1], [CHI, 0.02, 1], [YA, 0.42, 0.8]]) for (const st of glyph) neon(st.map(P(cx, cy - (s < 1 ? 0.04 : 0), sc * s)), pink);
      const rr = []; const bx = W - 0.08, by = (y1 - y0) / 2 - 0.08, rc = 0.05;
      for (const [cx2, cy2, a0] of [[bx - rc, by - rc, 0], [-bx + rc, by - rc, Math.PI / 2], [-bx + rc, -by + rc, Math.PI], [bx - rc, -by + rc, Math.PI * 1.5]]) for (let k = 0; k <= 4; k++) { const a = a0 + (k / 4) * (Math.PI / 2); rr.push([cx2 + Math.cos(a) * rc, (y0 + y1) / 2 + cy2 + Math.sin(a) * rc, 0.04]); }
      K.glow(() => K.tube(flat(0x2a8a9a, 0.4), rr, 0.01, 6, { closed: true }));
      K.glass(() => { for (const [x, y] of [[-bx, (y0 + y1) / 2], [bx, (y0 + y1) / 2], [0, y1 - 0.11], [0, y0 + 0.11], [-0.42, cy], [0.02, cy], [0.42, cy - 0.04]]) K.cyl(K.tint(0xe8f0f0, 120), x, y, 0.004, 0.006, 0.034, 6, { axis: 'z' }); });
    },

    // ------------------------------------------------------------- a giant capsule on a pedestal with a brass plaque (0.78 x 1.15 x 0.78)
    capsule_statue: (K, B) => {
      const ped = 0.46, w = 0.3;
      K.box(matte(0xf2ece0, 0.1), -w - 0.03, 0, -w - 0.03, w + 0.03, 0.06, w + 0.03, { bevel: 0.012 });
      K.box(matte(0xf6f0e4, 0.1), -w, 0.06, -w, w, ped - 0.05, w, { bevel: 0.01 });
      K.box(matte(0xf2ece0, 0.1), -w - 0.025, ped - 0.05, -w - 0.025, w + 0.025, ped, w + 0.025, { bevel: 0.012 });
      for (const y of [0.1, ped - 0.09]) K.box(metal(0xc8a44a, 0.3), -w - 0.003, y, -w - 0.003, w + 0.003, y + 0.012, w + 0.003);
      const pl = K.patch('capplaque', 48, 20, (V) => { V.fill(0xc8a44a); V.frame(0, 0, 48, 20, 0x8a6a2a); V.frame(2, 2, 46, 18, 0xe0c070); V.text5('GACHA', 24, 15, 0x4a3418, { align: 'center' }); V.text5('NO.1', 24, 7, 0x4a3418, { align: 'center' }); }, { rough: 0.35 });
      K.box(metal(0xc8a44a, 0.3), -0.13, 0.17, w, 0.13, 0.28, w + 0.008);
      K.face(pl, '+z', -0.122, 0.175, 0.122, 0.275, w + 0.0085);
      // the capsule: pink top, cream bottom, the seam band, tipped a touch to show it off
      const R = Math.min(0.33, (B.y1 - ped - 0.04) / 2);
      K.lathe(matte(0xe8e2d4), [0, ped, 0], [[0, 0], [0.12, 0], [0.12, 0.03], [0, 0.03]], 12);
      K.at([0, ped + 0.03 + R, 0], () => {
        K.ball(candy(0xf07aa0, 0.3), 0, 0, 0, R, R, R, 16, 6, { y0: 0.02, cap: false });
        K.ball(candy(0xf2ece0, 0.15), 0, 0, 0, R * 0.995, R * 0.995, R * 0.995, 16, 6, { y1: -0.02, cap: false });
        K.lathe(candy(0xe0d8c8, 0.1), [0, 0, 0], [[R * 0.998, -R * 0.03], [R * 1.012, -R * 0.02], [R * 1.012, R * 0.02], [R * 0.998, R * 0.03]], 16);
        K.lathe(candy(0xd86a90, 0.2), [0, 0, 0], [[R * 1.0, R * 0.02], [R * 1.02, R * 0.025], [R * 1.02, R * 0.07], [R * 0.995, R * 0.08]], 16); // the lip of the lid
      }, { rx: 0.12 });
    },

    // ------------------------------------------------------------- an upright arcade cabinet (0.68 x 1.68 x 0.7)
    arcade_cabinet: (K, B) => {
      const X = B.x1, side = paint(0x3a2a6a, 0.2), body = paint(0x24242a, 0.2);
      const prof = [[-0.34, 0], [0.26, 0], [0.26, 0.76], [0.345, 0.82], [0.345, 0.87], [0.16, 0.92], [0.2, 1.33], [0.26, 1.4], [0.26, B.y1], [-0.34, B.y1]];
      // the two side panels with their art, the body between
      const art = K.patch('arcadeside', 48, 96, (V) => { V.fill(0x3a2a6a); V.box(0, 0, 48, 10, 0x24242a); for (let k = 0; k < 4; k++) V.box(0, 40 + k * 10, 48, 44 + k * 10, [0xd8402a, 0xe8842a, 0xf2c21c, 0x3a9ac8][k]); V.text5('STAR', 24, 88, 0xf2c21c, { align: 'center', s: 1 }); V.text5('CAPSULE', 24, 79, 0xf2c21c, { align: 'center' }); }, { rough: 0.5 });
      K.sym((s) => { K.prism(side, prof.map(([z, y]) => [z, y]), { plane: 'zy', a: s * X, b: s * (X - 0.022) }); K.quadUV(art, [s * (X + 0.0008), 0.1, s > 0 ? 0.2 : -0.3], [s * (X + 0.0008), 0.1, s > 0 ? -0.3 : 0.2], [s * (X + 0.0008), 1.55, s > 0 ? -0.3 : 0.2], [s * (X + 0.0008), 1.55, s > 0 ? 0.2 : -0.3], [s, 0, 0]); K.box(chrome(0xb8bcc0), s * X - 0.004, 0, -0.34, s * X + 0.004, 0.02, 0.26); });
      K.prism(body, [[-0.33, 0.01], [0.25, 0.01], [0.25, 0.76], [0.33, 0.815], [0.33, 0.865], [0.15, 0.91], [0.19, 1.33], [0.25, 1.4], [0.25, B.y1 - 0.01], [-0.33, B.y1 - 0.01]], { plane: 'zy', a: -X + 0.022, b: X - 0.022 });
      // the coin door, the kick plate
      const door = K.patch('coindoor', 32, 32, (V) => { V.fill(0x5a5e62); V.frame(0, 0, 32, 32, 0x3a3e42); for (const i of [8, 22]) { V.box(i - 3, 14, i + 4, 27, 0x2a2a2e); V.box(i, 17, i + 1, 24, 0xd8402a); } V.disc(16, 7, 3, 0x9aa0a4); V.text5('100', 16, 30, 0xf2efe6, { align: 'center' }); }, { rough: 0.5 });
      K.box(metal(0x5a5e62), -0.1, 0.3, 0.25, 0.1, 0.52, 0.262);
      K.face(door, '+z', -0.1, 0.3, 0.1, 0.52, 0.2625);
      K.glow(() => { for (const x of [-0.055, 0.045]) K.box(flat(0x8a2a1a, 0.5), x, 0.46, 0.262, x + 0.012, 0.49, 0.266); });
      // the control panel: a ball-top stick and four buttons, P1 / P2
      const cp = (u, h = 0) => [0, 0.87 + (0.92 - 0.87) * u + h, 0.345 + (0.16 - 0.345) * u];
      K.at(cp(0.45, 0.005), () => { K.cyl(chrome(), -0.14, 0, 0, 0.006, 0.07, 6); K.ball(plastic(0xd8283a, 0.3), -0.14, 0.08, 0, 0.022, 0.022, 0.022, 10, 5); K.cyl(plastic(0x1a1a1a), -0.14, -0.002, 0, 0.03, 0.006, 10); for (let k = 0; k < 4; k++) K.cyl(plastic([0xf2c21c, 0x3a9ac8, 0x3a9a5a, 0xd8402a][k], 0.3), 0.0 + (k % 2) * 0.06 + (k > 1 ? 0.03 : 0), 0, (k > 1 ? -0.035 : 0.01), 0.017, 0.012, 10); }, { rx: Math.atan2(0.05, 0.185) });
      // the screen (a pixel game, lit) behind its bezel, the marquee
      const scr = K.patch('arcadescreen', 64, 64, (V) => {
        V.fill(0x0a0e1a); for (const [i, j] of [[7, 55], [50, 48], [30, 60], [58, 20], [12, 30]]) V.px(i, j, 0x8a9ab8);
        const inv = ['..#....#..', '...#..#...', '..######..', '.##.##.##.', '##########', '#.######.#', '#.#....#.#', '...##.##..'];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) V.sprite(inv, { '#': [0x7ae87a, 0xe87ab8, 0x7ac8e8][r] }, 6 + c * 14, 52 - r * 10);
        V.sprite(['....#....', '...###...', '.#######.', '#########'], { '#': 0xe8e87a }, 27, 9); V.box(31, 12, 32, 18, 0xf2efe6);
        V.text5('SCORE 01500', 2, 63, 0xf2efe6); for (const i of [8, 26, 44]) V.box(i, 15, i + 9, 19, 0x3a9a5a);
      }, { rough: 0.2, bright: true });
      const s0 = [0, 0.935, 0.165], s1 = [0, 1.31, 0.196];
      K.prism(paint(0x1a1a1e, 0.1), [[0.152, 0.912], [0.192, 1.335], [0.205, 1.335], [0.165, 0.912]], { plane: 'zy', a: -X + 0.02, b: X - 0.02 });
      K.glow(() => K.quadUV(scr, [-0.24, s0[1], s0[2] + 0.004], [0.24, s0[1], s0[2] + 0.004], [0.24, s1[1], s1[2] + 0.004], [-0.24, s1[1], s1[2] + 0.004], [0, -0.1, 1]));
      const mq = K.patch('marquee', 96, 24, (V) => { V.fill(0x2a1a4a); V.box(0, 0, 96, 3, 0xe8842a); V.box(0, 21, 96, 24, 0xe8842a); V.text5('STAR CAPSULE', 48, 15, 0xf2c21c, { align: 'center', s: 1 }); kana(K, V, 'スター', 34, 10, 0xf2efe6, { size: 9 }); }, { bright: true });
      K.glow(() => K.face(mq, '+z', -X + 0.025, 1.42, X - 0.025, B.y1 - 0.03, 0.262));
      K.box(chrome(0xb8bcc0), -X + 0.02, 1.4, 0.25, X - 0.02, 1.415, 0.27); K.box(chrome(0xb8bcc0), -X + 0.02, B.y1 - 0.03, 0.25, X - 0.02, B.y1 - 0.015, 0.27);
      K.box(flat(0x2a2a2e, 0.9), -X + 0.03, 0, 0.0, X - 0.03, 0.02, 0.27);
    },

    // ------------------------------------------------------------- the green payphone on its little wooden cabinet (0.5 x 1.55 x 0.4)
    phone_booth: (K, B) => {
      const WD = 0x9a6a40, top = 0.78, gr = enamel(0x5a9a5a);
      plank(K, WD, -0.24, 0.04, -0.19, 0.24, top - 0.03, 0.17, { axis: 'y', bevel: 0.008 });
      plank(K, darken(WD, 0.15), -0.25, top - 0.03, -0.2, 0.25, top, 0.19, { bevel: 0.008 });
      for (const [x, z] of [[-0.22, -0.17], [0.2, -0.17], [-0.22, 0.13], [0.2, 0.13]]) K.box(wood(darken(WD, 0.25)), x, 0, z, x + 0.02, 0.04, z + 0.03);
      for (let k = 0; k < 3; k++) { const y = 0.08 + k * 0.22; plank(K, lighten(WD, 0.08), -0.215, y, 0.17, 0.215, y + 0.19, 0.185, { bevel: 0.005, v: k + 1 }); K.cyl(metal(0xc8a44a, 0.3), 0, y + 0.095, 0.185, 0.012, 0.016, 8, { axis: 'z' }); }
      // the phone: a rounded green body, the receiver on its cradle (left), a curly cord, a keypad and a tiny LCD
      const y0 = top;
      K.box(gr, -0.13, y0, -0.1, 0.13, y0 + 0.38, 0.06, { bevel: 0.03 });
      K.box(enamel(0x4a8a4a), -0.12, y0, -0.09, 0.12, y0 + 0.03, 0.07, { bevel: 0.01 });
      const face = K.patch('phoneface', 40, 64, (V) => {
        V.fill(0x5a9a5a); V.box(6, 46, 34, 58, 0x9aa89a); V.box(8, 48, 32, 56, 0x2a3a2a); V.text5('100', 30, 55, 0x9ae89a, { align: 'right' });
        for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { V.box(7 + c * 9, 8 + r * 9, 14 + c * 9, 14 + r * 9, 0xeeeae0); V.px(10 + c * 9, 11 + r * 9, 0x2a2a2a); }
        V.box(34, 30, 37, 44, 0x2a2a2a); V.box(2, 40, 5, 44, 0xc8a44a);
      }, { rough: 0.5 });
      K.face(face, '+z', -0.1, y0 + 0.08, 0.06, y0 + 0.34, 0.0605);
      K.box(metal(0xb8bcc0), 0.08, y0 + 0.3, 0.05, 0.11, y0 + 0.31, 0.065);
      K.box(gr, -0.2, y0 + 0.2, -0.04, -0.13, y0 + 0.24, 0.04, { bevel: 0.01 }); // the cradle
      K.tube(enamel(0x4a8a4a), [[-0.165, y0 + 0.12, 0.0], [-0.17, y0 + 0.2, 0.01], [-0.17, y0 + 0.3, 0.01], [-0.165, y0 + 0.37, 0.0]], 0.018, 8, { radii: [0.028, 0.017, 0.017, 0.028] });
      const coil = []; for (let k = 0; k <= 60; k++) { const t = k / 60, a = t * TAU * 14; coil.push([-0.15 + Math.cos(a) * 0.012, y0 + 0.12 - t * 0.06 - Math.sin(t * Math.PI) * 0.03, 0.02 + Math.sin(a) * 0.012 + t * 0.02]); }
      K.tube(rubber(0x2a3a2a), coil, 0.0035, 4);
      // the TEL sign on top: 電話 and TEL on a cream plate
      K.cyl(metal(0x9aa0a4), 0, y0 + 0.38, -0.02, 0.012, 0.18, 6);
      const tel = K.patch('telsign', 48, 24, (V) => { V.fill(0xf2efe6); V.frame(0, 0, 48, 24, 0x3a7a3a); V.text5('TEL', 24, 20, 0x3a7a3a, { align: 'center', s: 2 }); kana(K, V, '電話', 13, 9, 0x2a2a2a, { size: 9 }); }, { rough: 0.7 });
      K.box(enamel(0x3a7a3a), -0.12, y0 + 0.55, -0.035, 0.12, B.y1, -0.005, { bevel: 0.006 });
      K.face(tel, '+z', -0.11, y0 + 0.56, 0.11, B.y1 - 0.01, -0.0045); K.face(tel, '-z', -0.11, y0 + 0.56, 0.11, B.y1 - 0.01, -0.0355);
    },

    // ------------------------------------------------------------- an old cast-iron street lamp, a lantern head (0.39 x 2.43 x 0.33)
    street_lamp: (K, B) => {
      const iron = paint(0x2a4a3a, 0.2);
      K.lathe(iron, [0, 0, 0], [[0, 0], [0.13, 0], [0.13, 0.03], [0.1, 0.05], [0.1, 0.15], [0.07, 0.2], [0.065, 0.32], [0.05, 0.36], [0.045, 0.4], [0, 0.4]], 12);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; K.rod(iron, [Math.cos(a) * 0.1, 0.06, Math.sin(a) * 0.1], [Math.cos(a) * 0.1, 0.14, Math.sin(a) * 0.1], 0.008, 4); }
      K.lathe(iron, [0, 0.4, 0], [[0.04, 0], [0.032, 1.4], [0.045, 1.42], [0.045, 1.46], [0.03, 1.48]], 10);
      K.rod(iron, [-0.15, 1.6, 0], [0.15, 1.6, 0], 0.012, 6); for (const s of [-1, 1]) K.ball(iron, s * 0.15, 1.6, 0, 0.018, 0.018, 0.018, 8, 3);
      for (const s of [-1, 1]) K.tube(iron, [[0, 1.55, 0], [s * 0.06, 1.6, 0], [s * 0.04, 1.66, 0], [0, 1.7, 0]], 0.008, 5);
      // a small enamel notice on the pole (a pink one, like in the old prop)
      const no = K.patch('lampno', 16, 40, (V) => { V.fill(0xf0b8c8); V.frame(0, 0, 16, 40, 0xc86a8a); kana(K, V, '子供', 1, 36, 0x3a2a3a, { size: 13, vert: true }); }, { rough: 0.6 });
      K.box(enamel(0xf0b8c8), -0.035, 0.95, 0.035, 0.035, 1.15, 0.042); K.face(no, '+z', -0.032, 0.955, 0.032, 1.145, 0.0425);
      // the lantern: a tapered square of glass in a frame, a lamp inside, the cap and a finial
      const yl = 1.86, yh = 2.22, r0 = 0.07, r1 = 0.12;
      K.lathe(iron, [0, 1.84, 0], [[0.03, -0.06], [0.05, 0], [0.09, 0.02], [0.09, 0.03], [0, 0.03]], 4, { a0: Math.PI / 4 });
      for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k / 4) * TAU; K.rod(iron, [Math.cos(a) * r0 * 1.414, yl, Math.sin(a) * r0 * 1.414], [Math.cos(a) * r1 * 1.414, yh, Math.sin(a) * r1 * 1.414], 0.008, 4); }
      K.glass(() => K.lathe(K.tint(0xf4ecd0, 90, 0.1), [0, yl, 0], [[r0 * 1.414, 0], [r1 * 1.414, yh - yl]], 4, { a0: Math.PI / 4, caps: false }));
      K.glow(() => { K.ball(flat(0x9a8a5a, 0.5), 0, yl + 0.14, 0, 0.04, 0.06, 0.04, 10, 5); });
      K.cyl(iron, 0, yl, 0, 0.02, 0.07, 6);
      K.lathe(iron, [0, yh, 0], [[0, -0.01], [r1 * 1.414 + 0.03, -0.01], [r1 * 1.414 + 0.03, 0.01], [0.05, 0.11], [0.03, 0.12], [0, 0.12]], 4, { a0: Math.PI / 4 });
      K.lathe(iron, [0, yh + 0.12, 0], [[0.02, 0], [0.03, 0.03], [0.012, 0.06], [0.02, 0.075], [0, B.y1 - yh - 0.12]], 8);
    },

    // ------------------------------------------------------------- a bus stop: the round sign on its weighted base and a bench (1.48 x 1.93 x 0.38)
    bus_stop: (K, B) => {
      const px = B.x0 + 0.13;
      // the base: a concrete drum with a rubber edge (it is rolled into place), the pole, the round plate on top
      K.lathe(stone(0xa8a49a), [px, 0, 0], [[0, 0], [0.13, 0], [0.135, 0.02], [0.135, 0.09], [0.11, 0.11], [0, 0.11]], 14);
      K.torus(rubber(), px, 0.02, 0, 0.133, 0.012, 14, 3);
      K.cyl(paint(0xeeeae0, 0.2), px, 0.11, 0, 0.022, 1.55, 8);
      const plate = K.patch('busplate', 48, 48, (V) => { V.fill(0xeeeae0); V.ring(24, 24, 18, 24, 0xc8302a); V.box(13, 17, 35, 31, 0x3a6aa8); V.box(15, 26, 33, 30, 0xeeeae0); V.box(13, 15, 35, 17, 0x24221e); V.disc(17, 15, 2.5, 0x24221e); V.disc(31, 15, 2.5, 0x24221e); kana(K, V, 'バス停', 9, 44, 0xeeeae0, { size: 9 }); }, { rough: 0.5 });
      K.at([px, B.y1 - 0.19, 0], () => { K.cyl(enamel(0xc8302a), 0, 0, -0.012, 0.18, 0.024, 16, { axis: 'z' }); disc(K, plate, 0, 0, 0.0125, 0.172, 16); disc(K, plate, 0, 0, -0.0125, 0.172, 16, { back: true }); });
      // the timetable in its box
      const tt = K.patch('timetable', 32, 48, (V) => { V.fill(0xf6f2e8); V.box(0, 40, 32, 48, 0x3a6aa8); V.text5('TIME', 16, 46, 0xf6f2e8, { align: 'center' }); for (let r = 0; r < 8; r++) { V.text5(String(6 + r * 2).padStart(2, '0'), 2, 37 - r * 4.5 | 0, 0x24221e); V.hline(12, 30, 35 - r * 4.5 | 0, 0x9a9a96); } }, { rough: 0.6 });
      K.box(paint(0xeeeae0, 0.2), px - 0.11, 0.95, 0.022, px + 0.11, 1.3, 0.05, { bevel: 0.006 });
      K.face(tt, '+z', px - 0.095, 0.965, px + 0.095, 1.285, 0.0505);
      K.glass(() => K.box(K.tint(0xdce8ec, 50), px - 0.1, 0.96, 0.051, px + 0.1, 1.29, 0.054));
      // the bench: three slats on two cast legs
      const bx0 = px + 0.25, bx1 = B.x1 - 0.02, leg = paint(0x3a4a5a, 0.2), WD = 0xb08050;
      for (const x of [bx0 + 0.12, bx1 - 0.12]) { K.prism(leg, [[-0.17, 0], [-0.14, 0], [0.0, 0.36], [0.14, 0], [0.17, 0], [0.04, 0.4], [0.06, 0.43], [-0.06, 0.43], [-0.04, 0.4]], { plane: 'zy', a: x - 0.02, b: x + 0.02 }); K.box(leg, x - 0.02, 0.43, -0.16, x + 0.02, 0.45, 0.16); }
      for (let k = 0; k < 3; k++) plank(K, WD, bx0, 0.45, -0.16 + k * 0.11, bx1, 0.475, -0.07 + k * 0.11, { bevel: 0.005, v: k });
    },
  },
};
