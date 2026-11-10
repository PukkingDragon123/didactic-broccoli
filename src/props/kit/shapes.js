// Recurring shapes for the prop models, built on the kit (./kit.js): faceted blobs (bushes, rocks, bags), leaves
// and potted plants, signs on posts, wheels, cans and bottles, crates and cardboard boxes, buckets, stools.
// Everything takes the kit K first and sizes in metres.
import * as THREE from 'three';
import { seeded } from '../../vehicles/paint.js';
import { lighten, darken, mix, matte, paint, plastic, metal, rubber, wood, flat, GLASS } from './kit.js';
import { plankTex, dirtTex } from './prints.js';

// ------------------------------------------------------------------ tone by the way a face looks
/** uv function: three tones of one colour chosen by the face's upward tilt (painted form: lit tops, shaded undersides). */
export function tones(K, c, o = {}) {
  const r = o.rough ?? 0.9, lt = K.A.swatch(o.light ?? lighten(c, o.k ?? 0.22), r), md = K.A.swatch(c, r), dk = K.A.swatch(o.dark ?? darken(c, o.k2 ?? 0.2), r);
  return (p, n) => (n[1] > (o.hi ?? 0.45) ? lt : n[1] < (o.lo ?? -0.15) ? dk : md)(p, n);
}

/** Leaf tones: sunlit faces lean yellow-green, undersides blue-green (never minty). */
export function leafy(K, c, o = {}) { return tones(K, c, { light: mix(c, 0xa6cc5a, o.k ?? 0.38), dark: mix(c, 0x1e4038, o.k2 ?? 0.36), hi: o.hi ?? 0.35, lo: o.lo ?? -0.05 }); }

// ------------------------------------------------------------------ faceted blobs
const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((p) => { const l = Math.hypot(...p); return p.map((x) => x / l); });
  const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  return { v, f };
})();
function subdivide(v, f) {
  const nv = v.slice(), nf = [], mid = new Map();
  const m = (a, b) => { const k = a < b ? a + ':' + b : b + ':' + a; if (!mid.has(k)) { const p = [0, 1, 2].map((i) => v[a][i] + v[b][i]); const l = Math.hypot(...p); mid.set(k, nv.push(p.map((x) => x / l)) - 1); } return mid.get(k); };
  for (const [a, b, c] of f) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
  return { v: nv, f: nf };
}
const ICO2 = subdivide(ICO.v, ICO.f);
/**
 * A faceted lump centred on (x, y, z) with radii rx / ry / rz: 20 faces (o.fine: 80), each corner pushed in or out a
 * little (o.jit, seeded) so no two look alike. o.flatY: nothing below this fraction (-1..1) of the height (sits flat).
 */
export function blob(K, c, x, y, z, rx, ry = rx, rz = rx, o = {}) {
  const S = o.fine ? ICO2 : ICO, r = seeded(o.seed ?? Math.round((x * 31 + y * 17 + z * 13 + rx * 7) * 1000)), j = o.jit ?? 0.14;
  const rot = o.turn ?? r() * 6.283, cs = Math.cos(rot), sn = Math.sin(rot);
  const P = S.v.map((p) => {
    const k = 1 + (r() - 0.5) * 2 * j;
    let px = p[0] * cs - p[2] * sn, py = p[1], pz = p[0] * sn + p[2] * cs;
    if (o.flatY !== undefined && py < o.flatY) py = o.flatY;
    return [x + px * rx * k, y + py * ry * k, z + pz * rz * k];
  });
  K.use(c, (G) => { for (const [a, b, d] of S.f) G.tri(P[a], P[b], P[d], [P[a][0] + P[b][0] + P[d][0] - 3 * x, P[a][1] + P[b][1] + P[d][1] - 3 * y, P[a][2] + P[b][2] + P[d][2] - 3 * z]); });
  return K;
}
/** A bush of several blobs in leaf tones inside the box (x0..x1, y0..y1, z0..z1). */
export function bush(K, c, x0, y0, z0, x1, y1, z1, o = {}) {
  const r = seeded(o.seed ?? 7), n = o.n ?? 5, uv = typeof c === 'function' ? c : leafy(K, c, o);
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  for (let k = 0; k < n; k++) {
    const fx = n === 1 ? 0.5 : k / (n - 1), rr = (o.r ?? 0.34) * (0.85 + r() * 0.3);
    const rx = Math.min(w / 2, Math.max(w / n * 0.9, rr * Math.min(w, h * 1.6))), ry = h * (0.36 + r() * 0.14), rz = d * (0.36 + r() * 0.12);
    blob(K, uv, x0 + rx + (w - 2 * rx) * fx, y0 + ry + (h - 2 * ry) * (0.2 + r() * 0.8), z0 + rz + (d - 2 * rz) * r(), rx, ry, rz, { seed: (o.seed ?? 7) * 13 + k, jit: 0.13, fine: o.fine ?? true });
  }
  return K;
}

// ------------------------------------------------------------------ leaves and flowers
/** A leaf: a kite folded along its midrib, from `base` to `tip`, `w` wide at its widest (two-sided). */
export function leaf(K, c, base, tip, w, o = {}) {
  const d = [tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]], L = Math.hypot(...d) || 1;
  // sideways: across the leaf, level if it can be
  let s = [d[2], 0, -d[0]]; const sl = Math.hypot(...s);
  s = sl < 1e-6 ? [1, 0, 0] : s.map((v) => v / sl);
  const up = [d[1] * s[2] - d[2] * s[1], d[2] * s[0] - d[0] * s[2], d[0] * s[1] - d[1] * s[0]].map((v) => v / L); // normal of the blade
  const t = o.at ?? 0.42, fold = o.fold ?? 0.18, m = [base[0] + d[0] * t, base[1] + d[1] * t, base[2] + d[2] * t];
  const a = [m[0] + s[0] * w / 2 + up[0] * w * fold, m[1] + s[1] * w / 2 + up[1] * w * fold, m[2] + s[2] * w / 2 + up[2] * w * fold];
  const b = [m[0] - s[0] * w / 2 + up[0] * w * fold, m[1] - s[1] * w / 2 + up[1] * w * fold, m[2] - s[2] * w / 2 + up[2] * w * fold];
  const dk = o.back ?? c;
  K.use(c, (G) => { G.tri(base, a, tip, up); G.tri(base, tip, b, up); });
  K.use(dk, (G) => { G.tri(base, a, tip, up.map((v) => -v)); G.tri(base, tip, b, up.map((v) => -v)); });
  return K;
}
/** A fan of leaves round a stem top: n leaves of length len drooping by `droop`. */
export function leafRing(K, c, x, y, z, n, len, w, o = {}) {
  const r = seeded(o.seed ?? 3), rise = o.rise ?? 0.35;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 6.283 + (o.turn ?? 0) + (r() - 0.5) * 0.4, l = len * (0.8 + r() * 0.4), up = rise + (r() - 0.5) * 0.3;
    leaf(K, c, [x, y, z], [x + Math.cos(a) * l * Math.cos(up), y + Math.sin(up) * l, z + Math.sin(a) * l * Math.cos(up)], w, o);
  }
  return K;
}
/** A blade (grass, aloe, iris leaf): a tapered three-sided spike from base towards `tip`. */
export function blade(K, c, base, tip, w) {
  return K.tube(c, [base, [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2 + w * 0.2, (base[2] + tip[2]) / 2], tip], w / 2, 3, { radii: [w / 2, w * 0.36, w * 0.04] });
}
/** A flower: five petals round a centre, facing `dir`. */
export function flower(K, c, p, r, o = {}) {
  const dir = new THREE.Vector3(...(o.dir || [0, 0.4, 1])).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  const n = o.n ?? 5, P = (a, rr, zz) => { const v = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, zz).applyQuaternion(q); return [p[0] + v.x, p[1] + v.y, p[2] + v.z]; };
  const h = [dir.x, dir.y, dir.z], ctr = P(0, 0, r * (o.cup ?? 0.25) * -1);
  K.use(c, (G) => { for (let k = 0; k < n; k++) { const a0 = (k / n) * 6.283, a1 = ((k + 1) / n) * 6.283, am = (a0 + a1) / 2; G.tri(ctr, P(a0, r * 0.62, 0), P(am, r, 0), h); G.tri(ctr, P(am, r, 0), P(a1, r * 0.62, 0), h); G.tri(ctr, P(am, r, 0), P(a0, r * 0.62, 0), h.map((v) => -v)); G.tri(ctr, P(a1, r * 0.62, 0), P(am, r, 0), h.map((v) => -v)); } });
  if (o.eye !== undefined) K.use(o.eye, (G) => { const e = r * 0.28; for (let k = 0; k < 4; k++) { const a0 = (k / 4) * 6.283, a1 = ((k + 1) / 4) * 6.283; G.tri(P(0, 0, r * 0.12), P(a0, e, 0.002), P(a1, e, 0.002), h); } });
  return K;
}

// ------------------------------------------------------------------ pots
export const TERRA = 0xb9643c;
/** A flower pot standing on (x, y, z): top radius r, height h. o: { c, taper, rim, soil (colour | false), saucer } */
export function pot(K, x, y, z, r, h, o = {}) {
  const c = o.c ?? matte(TERRA, 0.2), n = o.n ?? 8, tp = o.taper ?? 0.72, rim = o.rim ?? 0.16, t = Math.max(0.004, r * 0.1);
  const cc = typeof c === 'number' ? matte(c, 0.2) : c;
  if (o.saucer) K.cyl(o.saucerC ?? cc, x, y, z, r * 0.92, h * 0.07, n, { r1: r * 1.02 });
  const y0 = y + (o.saucer ? h * 0.04 : 0);
  K.lathe(cc, [x, y0, z], [[0, 0], [r * tp, 0], [r * 0.97, h * (1 - rim)]], n);
  K.lathe(cc.e != null ? flat(cc.e, cc.r) : cc, [x, y0, z], [[r * 0.97, h * (1 - rim)], [r * 1.06, h * (1 - rim)], [r * 1.06, h], [r - t, h]], n);
  K.lathe(flat(darken(cc.c ?? TERRA, 0.3)), [x, y0, z], [[r - t, h], [r - t, h * 0.9]], n);
  if (o.soil !== false) K.lathe(flat(o.soil ?? 0x4a3828, 0.98), [x, y0, z], [[r - t, h * 0.9], [0, h * 0.92]], n);
  return y0 + h * 0.9;
}
/** A rectangular planter (styrofoam box, plastic trough). Returns the soil height. */
export function planter(K, c, x0, y0, z0, x1, y1, z1, o = {}) {
  const t = o.t ?? 0.02;
  K.tub(c, x0, y0, z0, x1, y1, z1, t, { bevel: o.bevel ?? 0.008, inside: flat(darken(c.c ?? c, 0.25)) });
  const ys = y1 - (o.drop ?? 0.03);
  if (o.soil !== false) K.quad(flat(o.soil ?? 0x4a3828, 0.98), [x0 + t, ys, z0 + t], [x1 - t, ys, z0 + t], [x1 - t, ys, z1 - t], [x0 + t, ys, z1 - t], [0, 1, 0]);
  return ys;
}

// ------------------------------------------------------------------ the dirt line at the foot of things
/** A band of ground dirt round a box's foot (h tall, a hair proud of the walls). c: the wall colour (number). */
export function dirtBox(K, c, x0, z0, x1, z1, y0 = 0, h = 0.06, o = {}) {
  const V = dirtTex(K, c, o.dirt), e = o.off ?? 0.0025, sides = o.sides || ['+z', '-z', '+x', '-x'];
  const run = (facing, a0, a1, w) => {
    const n = Math.max(1, Math.min(40, Math.round(Math.abs(a1 - a0) / (Math.max(0.01, h) * 4))));
    for (let k = 0; k < n; k++) K.face(V, facing, a0 + (a1 - a0) * (k / n), y0, a0 + (a1 - a0) * ((k + 1) / n), y0 + h, w, { flip: k % 2 === 1 });
  };
  if (sides.includes('+z')) run('+z', x0, x1, z1 + e);
  if (sides.includes('-z')) run('-z', x0, x1, z0 - e);
  if (sides.includes('+x')) run('+x', z0, z1, x1 + e);
  if (sides.includes('-x')) run('-x', z0, z1, x0 - e);
  return K;
}
/** The same round a post or a drum. */
export function dirtRing(K, c, cx, cz, r, y0 = 0, h = 0.06, n = 10, o = {}) {
  const V = dirtTex(K, c, o.dirt);
  for (let k = 0; k < n; k++) K.wrap(V, cx, y0, y0 + h, cz, r, { n, arc: (Math.PI * 2) / n, turn: (k * Math.PI * 2) / n, r1: o.r1 ?? r, lift: 0.0025, sub: k % 2 ? [1, 0, 0, 1] : [0, 0, 1, 1] });
  return K;
}

// ------------------------------------------------------------------ boards
/** A board with painted grain running along its longest side. c: wood colour (number). o: { bevel, v: variant, axis } */
export function plank(K, c, x0, y0, z0, x1, y1, z1, o = {}) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), dz = Math.abs(z1 - z0);
  const axis = o.axis || (dx >= dy && dx >= dz ? 'x' : dy >= dz ? 'y' : 'z');
  const V = plankTex(K, c, o.v ?? 0), uv = K.along(V, [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)], axis);
  const end = K.A.swatch(darken(c, 0.18), 0.85), L = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  K.use((p, n) => { const a = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])]; return (a[L] > 0.9 ? end : uv)(p, n); }, (G) => G.box(x0, y0, z0, x1, y1, z1, { bevel: o.bevel ?? 0, skip: o.skip }));
  return K;
}

// ------------------------------------------------------------------ signs and posts
/** A galvanised post from the ground: returns K. o: { cap, base (collar radius), c } */
export function post(K, x, z, h, r = 0.03, o = {}) {
  const c = o.c ?? metal(0xa9aeb0, 0.3), n = o.n ?? 8;
  K.cyl(c, x, o.y0 ?? 0, z, r, h, n);
  if (o.base !== false) K.cyl(typeof c === 'object' ? flat(darken(c.c, 0.25), 0.8) : c, x, o.y0 ?? 0, z, r * 1.7, r * 0.8, n, { r1: r * 1.2 });
  if (o.cap !== false) K.cyl(c, x, (o.y0 ?? 0) + h, z, r * 1.08, r * 0.5, n, { r1: r * 0.5 });
  return K;
}
/** Two clamp bands holding a plate to a post (behind the plate at z). */
export function clamps(K, x, ys, z, r, c = metal(0x8a9094)) {
  for (const y of ys) { K.cyl(c, x, y - 0.012, z, r + 0.006, 0.024, 8); K.box(c, x - r * 0.8, y - 0.012, z, x + r * 0.8, y + 0.012, z + r + 0.014); }
  return K;
}

// ------------------------------------------------------------------ wheels
/** A spoked wheel in the yz plane at (x, y, z): tyre radius r, tyre section t; rim, hub and `spokes` thin spokes. */
export function spokeWheel(K, x, y, z, r, t = 0.02, o = {}) {
  const tyre = o.tyre ?? rubber(0x26262a), rim = o.rim ?? metal(0xc2c8cc), n = o.n ?? 14, sp = o.spokes ?? 8;
  K.torus(tyre, x, y, z, r - t, t, n, 5, { axis: 'x', a0: 0 });
  K.lathe(rim, [x, y, z], [[r - t * 1.9, -t * 0.55], [r - t * 1.3, -t * 0.6], [r - t * 1.3, t * 0.6], [r - t * 1.9, t * 0.55]], n, { axis: 'x', a0: 0 });
  K.lathe(rim, [x, y, z], [[r - t * 1.9, -t * 0.55], [r - t * 1.9, t * 0.55]], n, { axis: 'x', a0: 0, flip: true });
  K.cyl(o.hub ?? metal(0x8a9094), x - t * 1.4, y, z, t * 0.9, t * 2.8, 6, { axis: 'x' });
  const sc = o.spoke ?? metal(0xd0d4d6, 0);
  for (let k = 0; k < sp; k++) {
    const a = (k / sp) * 6.283 + (o.turn ?? 0.2), s = k % 2 ? 1 : -1;
    K.rod(sc, [x + s * t * 0.9, y + Math.cos(a) * t * 0.8, z + Math.sin(a) * t * 0.8], [x, y + Math.cos(a + 0.5) * (r - t * 1.9), z + Math.sin(a + 0.5) * (r - t * 1.9)], o.sw ?? 0.0035, 3, { caps: false });
  }
  return K;
}
/** A small solid wheel (scooter, trolley, caster) in the yz plane: tyre + a dished disc. */
export function discWheel(K, x, y, z, r, w, o = {}) {
  const tyre = o.tyre ?? rubber(0x26262a), hub = o.hub ?? metal(0xb8bcc0), n = o.n ?? 12, ri = r * (o.rim ?? 0.58);
  K.lathe(tyre, [x - w / 2, y, z], [[ri, 0], [r * 0.93, 0], [r, w * 0.25], [r, w * 0.75], [r * 0.93, w], [ri, w]], n, { axis: 'x', a0: 0 });
  K.lathe(hub, [x - w / 2, y, z], [[0, w * 0.3], [ri * 0.3, w * 0.3], [ri, w * 0.08]], n, { axis: 'x', a0: 0 });
  K.lathe(hub, [x - w / 2, y, z], [[ri, w * 0.92], [ri * 0.3, w * 0.7], [0, w * 0.7]], n, { axis: 'x', a0: 0 });
  return K;
}

// ------------------------------------------------------------------ cans, bottles, jars
/** A drink can standing on (x, y, z): label = a View wrapped round it (or a colour). o: { r, h, tilt handled by K.at } */
export function can(K, x, y, z, label, o = {}) {
  const r = o.r ?? 0.033, h = o.h ?? 0.122, n = o.n ?? 8, al = metal(0xc8ccd0, 0.3);
  K.lathe(al, [x, y, z], [[0, 0.004], [r * 0.8, 0], [r, h * 0.05]], n);
  if (label && label.map3) { K.wrap(label, x, y + h * 0.05, y + h * 0.93, z, r, { n, turn: o.turn ?? 0 }); } else K.lathe(label ?? paint(0xc8302a), [x, y, z], [[r, h * 0.05], [r, h * 0.93]], n);
  K.lathe(al, [x, y, z], [[r, h * 0.93], [r * 0.86, h], [r * 0.8, h * 0.985], [0, h * 0.985]], n);
  if (o.tab !== false) K.box(flat(0x8a8e92, 0.3), x - r * 0.18, y + h * 0.985, z - r * 0.1, x + r * 0.18, y + h * 0.992, z + r * 0.5);
  return K;
}
/**
 * A bottle standing on (x, y, z): body radius r up to the shoulder at hs, neck radius rn to the lip at h.
 * glass: a tint swatch (K.tint) or an opaque colour; o.label: View wrapped round the body between l0..l1; o.cap: colour.
 */
export function bottle(K, x, y, z, r, h, c, o = {}) {
  const n = o.n ?? 8, hs = (o.shoulder ?? 0.58) * h, rn = o.neck ?? r * 0.36, hn = (o.neckAt ?? 0.74) * h, hc = o.capH ?? h * 0.06;
  const prof = [[0, 0], [r * 0.92, 0], [r, h * 0.03], [r, hs], [rn, hn], [rn, h - hc]];
  if (o.glassy) K.glass(() => K.lathe(c, [x, y, z], prof, n)); else K.lathe(c, [x, y, z], prof, n);
  if (o.fill) K.lathe(o.fill, [x, y, z], [[0, h * 0.02], [r * 0.9, h * 0.03], [r * 0.9, hs * (o.level ?? 0.9)], [0, hs * (o.level ?? 0.9)]], n);
  if (o.label) K.wrap(o.label, x, y + (o.l0 ?? 0.14) * h, y + (o.l1 ?? 0.5) * h, z, r, { n, arc: o.labelArc ?? Math.PI * 2, turn: o.turn ?? 0 });
  if (o.cap !== false) K.cyl(o.cap ?? metal(0xd8b040), x, y + h - hc, z, rn * 1.12, hc, n);
  return K;
}
/** A glass jar with a screw lid: glass walls (see-through), contents as a coloured core. */
export function jar(K, x, y, z, r, h, o = {}) {
  const n = o.n ?? 8, lidH = o.lidH ?? h * 0.14, hb = h - lidH;
  if (o.fill) K.lathe(o.fill, [x, y, z], [[0, 0.004], [r * 0.88, 0.004], [r * 0.88, hb * (o.level ?? 0.75)], [0, hb * (o.level ?? 0.75)]], n);
  K.glass(() => K.lathe(o.glass ?? K.tint(0xcfe4e4, 80), [x, y, z], [[0, 0], [r * 0.94, 0], [r, hb * 0.06], [r, hb * 0.88], [r * 0.86, hb]], n));
  if (o.label) K.wrap(o.label, x, y + hb * 0.25, y + hb * 0.7, z, r, { n, arc: Math.PI, turn: o.turn ?? 0 });
  K.cyl(o.lid ?? paint(0xc8302a), x, y + hb, z, r * 0.92, lidH, n, { bevel: lidH * 0.2 });
  return K;
}

// ------------------------------------------------------------------ boxes and crates
/**
 * A cardboard box (closed): flaps meeting along the top with packing tape over the seam, a darker bottom edge.
 * c: cardboard colour (number). o: { tape: colour | false, label: View on the front, labelSize: [w, h], open }
 */
export function carton(K, x0, y0, z0, x1, y1, z1, o = {}) {
  const c = o.c ?? 0xc49a62, m = matte(c, 0.16), w = x1 - x0, d = z1 - z0, h = y1 - y0, b = Math.min(0.006, w * 0.03);
  K.box(m, x0, y0, z0, x1, y1, z1, { bevel: b });
  // the flap seam and the tape over it (along x)
  const lx = o.seam === 'z' ? false : true;
  if (o.tape !== false) {
    const tc = flat(o.tape ?? 0xc8a878, 0.5), tw = Math.min(0.05, (lx ? d : w) * 0.22), e = 0.0015, drop = Math.min(0.06, h * 0.3);
    if (lx) { K.box(tc, x0 - e, y1 - e, (z0 + z1) / 2 - tw / 2, x1 + e, y1 + e, (z0 + z1) / 2 + tw / 2); K.box(tc, x0 - e, y1 - drop, (z0 + z1) / 2 - tw / 2, x0 + e, y1, (z0 + z1) / 2 + tw / 2); K.box(tc, x1 - e, y1 - drop, (z0 + z1) / 2 - tw / 2, x1 + e, y1, (z0 + z1) / 2 + tw / 2); }
    else { K.box(tc, (x0 + x1) / 2 - tw / 2, y1 - e, z0 - e, (x0 + x1) / 2 + tw / 2, y1 + e, z1 + e); K.box(tc, (x0 + x1) / 2 - tw / 2, y1 - drop, z1 - e, (x0 + x1) / 2 + tw / 2, y1, z1 + e); K.box(tc, (x0 + x1) / 2 - tw / 2, y1 - drop, z0 - e, (x0 + x1) / 2 + tw / 2, y1, z0 + e); }
  } else {
    const sc = flat(darken(c, 0.3));
    if (lx) K.box(sc, x0 + b, y1 - 0.001, (z0 + z1) / 2 - 0.002, x1 - b, y1 + 0.0008, (z0 + z1) / 2 + 0.002);
    else K.box(sc, (x0 + x1) / 2 - 0.002, y1 - 0.001, z0 + b, (x0 + x1) / 2 + 0.002, y1 + 0.0008, z1 - b);
  }
  if (o.label) {
    const [lw, lh] = o.labelSize || [w * 0.6, h * 0.5], cx = (x0 + x1) / 2 + (o.labelDx ?? 0), cy = y0 + h * (o.labelAt ?? 0.5);
    K.face(o.label, '+z', cx - lw / 2, cy - lh / 2, cx + lw / 2, cy + lh / 2, z1 + 0.0012);
    if (o.labelBack) K.face(o.label, '-z', cx - lw / 2, cy - lh / 2, cx + lw / 2, cy + lh / 2, z0 - 0.0012);
  }
  return K;
}
/** A slatted wooden crate (open top): corner posts, `rows` boards a side with gaps, a board floor. */
export function slatCrate(K, c, x0, y0, z0, x1, y1, z1, o = {}) {
  const rows = o.rows ?? 3, t = o.t ?? 0.012, gap = o.gap ?? 0.012, h = y1 - y0, bh = (h - gap * (rows - 1)) / rows, pw = o.post ?? 0.028;
  for (let k = 0; k < rows; k++) {
    const a = y0 + k * (bh + gap), b = a + bh;
    plank(K, c, x0, a, z1 - t, x1, b, z1, { v: k, bevel: 0.002 }); plank(K, c, x0, a, z0, x1, b, z0 + t, { v: k + 1, bevel: 0.002 });
    plank(K, c, x0, a, z0 + t, x0 + t, b, z1 - t, { v: k + 2, bevel: 0.002 }); plank(K, c, x1 - t, a, z0 + t, x1, b, z1 - t, { v: k, bevel: 0.002 });
  }
  const pc = wood(darken(c, 0.12));
  for (const [px, pz] of [[x0 + t, z0 + t], [x1 - t - pw, z0 + t], [x0 + t, z1 - t - pw], [x1 - t - pw, z1 - t - pw]]) K.box(pc, px, y0, pz, px + pw, y1 - 0.004, pz + pw);
  plank(K, darken(c, 0.1), x0 + t, y0, z0 + t, x1 - t, y0 + t, z1 - t, { v: 2 });
  return K;
}
/**
 * A moulded plastic bottle crate (beer / sake / ramune): a tub with a lattice of ribs, hand holes, a brand print on
 * the long sides. c: plastic colour (number); o: { print: View, cells: [nx, nz] dividers inside, ribs }
 */
export function bottleCrate(K, c, x0, y0, z0, x1, y1, z1, o = {}) {
  const m = plastic(c), dk = flat(darken(c, 0.28), 0.7), t = o.t ?? 0.012, h = y1 - y0, w = x1 - x0, d = z1 - z0;
  K.tub(m, x0, y0, z0, x1, y1, z1, t, { bevel: 0.004, inside: dk });
  // the top rail and the corner columns stand a little proud
  const e = 0.004, rail = h * 0.14;
  for (const [a, b, cc, dd] of [[x0 - e, z0 - e, x1 + e, z0 + t], [x0 - e, z1 - t, x1 + e, z1 + e], [x0 - e, z0 + t, x0 + t, z1 - t], [x1 - t, z0 + t, x1 + e, z1 - t]]) K.box(m, a, y1 - rail, b, cc, y1, dd, { bevel: 0.003 });
  for (const [px, pz] of [[x0 - e, z0 - e], [x1 - 0.03 + e, z0 - e], [x0 - e, z1 - 0.03 + e], [x1 - 0.03 + e, z1 - 0.03 + e]]) K.box(m, px, y0, pz, px + 0.03, y1 - rail, pz + 0.03, { bevel: 0.003 });
  // recessed windows between ribs on the long sides (the dark inside shows), hand holes on the short sides
  const ribs = o.ribs ?? 3, y2 = y0 + h * 0.12, y3 = y1 - rail - h * 0.08;
  for (const zz of [z0, z1]) for (let k = 0; k < ribs; k++) {
    const a = x0 + 0.034 + (w - 0.068) * (k / ribs) + 0.006, b = x0 + 0.034 + (w - 0.068) * ((k + 1) / ribs) - 0.006, s = zz === z1 ? 1 : -1;
    if (o.print && k === Math.floor(ribs / 2) && false) continue;
    K.box(dk, a, y2, zz - 0.001 * s, b, y2 + (y3 - y2) * 0.38, zz + 0.0012 * s);
  }
  for (const xx of [x0, x1]) { const s = xx === x1 ? 1 : -1; K.box(flat(0x1a1a1c), xx - 0.001 * s, y1 - rail - h * 0.2, z0 + d * 0.3, xx + 0.0015 * s, y1 - rail - h * 0.04, z1 - d * 0.3); }
  if (o.print) for (const [f, zz] of [['+z', z1 + 0.0015], ['-z', z0 - 0.0015]]) K.face(o.print, f, x0 + 0.04, y2 + (y3 - y2) * 0.46, x1 - 0.04, y3 + h * 0.06, zz);
  // dividers
  const [nx, nz] = o.cells || [0, 0];
  for (let k = 1; k < nx; k++) K.box(dk, x0 + (w * k) / nx - 0.003, y0 + t, z0 + t, x0 + (w * k) / nx + 0.003, y0 + h * 0.6, z1 - t);
  for (let k = 1; k < nz; k++) K.box(dk, x0 + t, y0 + t, z0 + (d * k) / nz - 0.003, x1 - t, y0 + h * 0.6, z0 + (d * k) / nz + 0.003);
  return K;
}

// ------------------------------------------------------------------ buckets
/** A bucket standing on (x, y, z): top radius r, height h, bail handle. o: { c, taper, handle: 'up' | 'down' | false, water } */
export function bucket(K, x, y, z, r, h, o = {}) {
  const c = o.c ?? metal(0xaab0b4, 0.3), n = o.n ?? 10, rb = r * (o.taper ?? 0.78), t = 0.006;
  K.lathe(c, [x, y, z], [[0, 0.006], [rb * 0.9, 0.006], [rb, 0], [r, h]], n);
  K.lathe(c.e != null ? flat(c.e, c.r) : c, [x, y, z], [[r, h], [r + 0.006, h - 0.004], [r + 0.006, h + 0.004], [r - t, h + 0.004]], n);
  K.lathe(o.inside ?? flat(darken(c.c ?? c, 0.3), 0.6), [x, y, z], [[r - t, h + 0.004], [rb - t, 0.012], [0, 0.012]], n);
  if (o.water !== undefined) K.lathe(o.water, [x, y, z], [[0, h * 0.8], [rb + (r - rb) * 0.8 - t, h * 0.8]], n, { flip: true });
  if (o.handle !== false) {
    const hc = o.handleC ?? metal(0x8a9094, 0), up = o.handle !== 'down', R = r + 0.008;
    const pts = [];
    for (let k = 0; k <= 8; k++) { const a = Math.PI * (k / 8); pts.push(up ? [x + Math.cos(a) * R, y + h - 0.02 + Math.sin(a) * R * 0.95, z] : [x + Math.cos(a) * R, y + h - 0.02 - Math.sin(a) * R * 0.25, z + Math.sin(a) * R * 0.97]); }
    K.tube(hc, pts, 0.004, 4);
    for (const s of [-1, 1]) K.box(hc, x + s * R - 0.006, y + h - 0.034, z - 0.008, x + s * R + 0.006, y + h - 0.006, z + 0.008);
  }
  return K;
}

// ------------------------------------------------------------------ misc
/** A neat stack of flat things (papers, cardboard, magazines) between y0 and y1: n layers alternating two tones, slightly shuffled. */
export function stack(K, c, x0, y0, z0, x1, y1, z1, n, o = {}) {
  const r = seeded(o.seed ?? 11), th = (y1 - y0) / n, j = o.jit ?? 0.006, c2 = o.c2 ?? darken(typeof c === 'number' ? c : c.c, 0.12);
  for (let k = 0; k < n; k++) {
    const dx = (r() - 0.5) * 2 * j, dz = (r() - 0.5) * 2 * j;
    K.box(flat(k % 2 ? c2 : (typeof c === 'number' ? c : c.c), 0.9), x0 + dx, y0 + k * th, z0 + dz, x1 + dx, y0 + (k + 1) * th - th * 0.08, z1 + dz, k === n - 1 ? {} : { skip: ['py'] });
  }
  return K;
}
/** String tied round a bundle: one loop across x and one across z (a cross on top), the knot in the middle. */
export function tied(K, x0, y0, z0, x1, y1, z1, o = {}) {
  const c = o.c ?? flat(0xe8e0c8, 0.9), w = o.w ?? 0.004, e = 0.002, cx = (x0 + x1) / 2 + (o.dx ?? 0), cz = (z0 + z1) / 2 + (o.dz ?? 0);
  K.box(c, cx - w, y0, z0 - e, cx + w, y1 + e, z0); K.box(c, cx - w, y0, z1, cx + w, y1 + e, z1 + e); K.box(c, cx - w, y1, z0 - e, cx + w, y1 + e, z1 + e);
  K.box(c, x0 - e, y0, cz - w, x0, y1 + e, cz + w); K.box(c, x1, y0, cz - w, x1 + e, y1 + e, cz + w); K.box(c, x0 - e, y1, cz - w, x1 + e, y1 + e * 1.5, cz + w);
  K.box(c, cx - w * 2.2, y1 + e, cz - w * 2.2, cx + w * 2.2, y1 + e + w * 1.6, cz + w * 2.2, { bevel: w * 0.5 });
  return K;
}
export { GLASS, mix };
