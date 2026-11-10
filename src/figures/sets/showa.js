// Shōwa Kaden (なつかし家電): tiny treasures from grandma's house, as 1:12 miniatures. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/showa.js. The family look: cream enamel, teal and
// marigold, polished chrome, wood grain, and the small things you remember (the paddle clip, the lace doily, the
// kokeshi on the telly), every one with a part that works.
// (personHead / limb / aim are shared with the sentai and bizarre sets.)
import * as THREE from 'three';
import { spline, ring, chain, slide, hinge, swell, QUAL } from '../sculpt.js';
import { head, torso, loaf, paw, blade, drape } from '../anatomy.js';
import {
  fill, proj, wrap, vol, under, crown, face, stamp, tone, tint, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, cut, stroke, pair, all, halfBelow, halfAbove, repeatU, repeatV, label, kana,
  below, above, band, blob, blobs, slabX, slabZ,
} from '../paint.js';

const DENS = 0.8;
const MAKER = 'SHOWA-DO';
const CREAM = 0xf4ecd6, TEAL = 0x4fa69a, MARI = 0xe8963a, CHROME = 0xd2d6dc, WOOD = 0xb07a48, BLK = 0x2c2a2e;
const or_ = (...fs) => { const f = (x, y, z) => Math.min(...fs.map((g) => g(x, y, z))); f.ys = fs.flatMap((g) => g.ys || []); return f; };
const grain = (c, n = 6, w = 40, h = 40, k = 0) => or(...Array.from({ length: n }, (_, i) => seg(-w, -h + (i + 0.5) * (2 * h / n) + k, w, -h + (i + 0.5) * (2 * h / n) + (i % 2 ? 1.2 : -0.8) + k, 0.3)));

/**
 * A joint definition written in the frame you are in (at()), turned into the figure space joints are defined in:
 * the pivot is placed, the axis turned and the slide turned and scaled with the frame. Use as S.joint(name, L(S, def), fn).
 */
export function L(S, def) {
  const d = { ...def }, v = new THREE.Vector3();
  if (d.pivot) { v.set(...d.pivot).applyMatrix4(S.m); d.pivot = [v.x, v.y, v.z]; }
  if (d.axis) { const a = typeof d.axis === 'string' ? { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[d.axis] : d.axis; v.set(...a).transformDirection(S.m); d.axis = [v.x, v.y, v.z]; }
  if (d.slide) { v.set(...d.slide).applyMatrix3(new THREE.Matrix3().setFromMatrix4(S.m)); d.slide = [v.x, v.y, v.z]; }
  return d;
}
/**
 * A rounded rectangle round c (in the xz plane at c's height): half sizes hw x hd, corner radius r, n points spaced
 * evenly along it (a loft section that unrolls evenly in the atlas, unlike a high-power superellipse).
 */
export function rrect(c, hw, hd, r, n = 24) {
  n = Math.max(8, Math.round(n * QUAL.k));
  const a = hw - r, b = hd - r, P = 4 * a + 4 * b + 2 * Math.PI * r, out = [];
  const segs = [[b, (t) => [hw, t * b]], [Math.PI * r / 2, (t) => [a + Math.cos(t * Math.PI / 2) * r, b + Math.sin(t * Math.PI / 2) * r]], [2 * a, (t) => [a - 2 * a * t, hd]], [Math.PI * r / 2, (t) => [-a + Math.cos(Math.PI / 2 + t * Math.PI / 2) * r, b + Math.sin(Math.PI / 2 + t * Math.PI / 2) * r]], [2 * b, (t) => [-hw, b - 2 * b * t]], [Math.PI * r / 2, (t) => [-a + Math.cos(Math.PI + t * Math.PI / 2) * r, -b + Math.sin(Math.PI + t * Math.PI / 2) * r]], [2 * a, (t) => [-a + 2 * a * t, -hd]], [Math.PI * r / 2, (t) => [a + Math.cos(1.5 * Math.PI + t * Math.PI / 2) * r, -b + Math.sin(1.5 * Math.PI + t * Math.PI / 2) * r]], [b, (t) => [hw, -b + t * b]]];
  for (let i = 0; i < n; i++) {
    let s = (i / n) * P;
    for (const [len, f] of segs) { if (s <= len + 1e-9) { const [x, z] = f(len > 0 ? s / len : 0); out.push([c[0] + x, c[1], c[2] + z]); break; } s -= len; }
  }
  return out;
}
/** Euler angles (the at() frame) that point local +z along d, rolled about it. */
export const aim = (d, roll = 0) => { const l = Math.hypot(d[0], d[1], d[2]); return [-Math.asin(d[1] / l), Math.atan2(d[0], d[2]), roll]; };
/** A limb through points, radius r0 to r1 (smooth). */
export function limb(S, pts, r0, r1 = r0, sides = 10) { return S.tube(spline(pts, 3), (t) => r0 + (r1 - r0) * t, { sides }); }
/**
 * A person's head, centred on the frame, facing +z, about 13 mm tall (scale it with at()). skin; o: paint (extra layers
 * on the skin: eyes, mouth, brows), ears (true), nose (true), r (radii), chin.
 */
export function personHead(S, skin, o = {}) {
  S.paint(fill(skin, { rough: 0.55 }), ...(o.paint || []), under(0.12), crown(0.04));
  head(S, [0, 0, 0], o.r || [6, 6.8, 6.4], { muzzle: 0.12, brow: 0.3, cheek: o.cheek ?? 0.16, chin: o.chin ?? 0.5, crown: 1.05, pow: 2.1 });
  if (o.nose !== false) { S.paint(fill(skin, { rough: 0.55 }), under(0.1)); S.ball([0, -1, 6.1], o.noseR || [0.9, 1.2, 0.9], { segs: 8, rings: 5 }); }
  if (o.ears !== false) for (const s of [1, -1]) { S.paint(fill(skin, { rough: 0.55 }), proj('front', ellipse(0, 1.4, 0.7, 1), tone(skin, 0.2))); S.at([s * 5.7, 0, -0.6], [0, s * 0.5, -s * 0.2], () => blade(S, 3, 2.6, 1, { shape: 'round', cup: 0.6 })); }
}

// ------------------------------------------------------------------ 1. Flower Rice Cooker
export function suihanki(S) {
  S.dens = DENS;
  const BODY = 0xf6f0e0, PETAL = 0xe8703a, LEAF = 0x6a9a4a;
  const flower = (u, v, r) => [wrap(17, or(...[0, 1, 2, 3, 4].map((k) => circle(u + Math.cos(k * 1.257 + 0.3) * r, v + Math.sin(k * 1.257 + 0.3) * r, r * 0.72))), PETAL), wrap(17, circle(u, v, r * 0.5), 0xf2c84a), wrap(17, or(ellipse(u - r * 2, v - r * 1.4, r * 1.1, r * 0.5, 0.6), ellipse(u + r * 1.8, v - r * 1.8, r, r * 0.45, -0.5)), LEAF)];
  const flowers = [[-14, 15, 2.6], [-26, 7, 2], [-38, 16, 2.4], [-46, 6, 1.8], [14, 17, 2.4], [24, 7, 2.2], [36, 15, 2.6], [47, 8, 2], [-20, 20.4, 1.4], [30, 20.6, 1.4], [52, 18, 1.6]].flatMap(([u, v, r]) => flower(u, v, r));
  S.paint(
    fill(BODY, { rough: 0.35 }), vol(below(2.6), 0x7a6a5a, { rough: 0.6 }), vol(band(21.8, 22.6), CHROME, { rough: 0.2 }), ...flowers,
    proj('front', rbox(0, 11, 5.6, 5.8, 1.2), 0xe8dcc0, { near: 10 }), proj('front', kana('炊飯', 0, 13.6, 2.4), 0x7a4a2a, { near: 10 }), proj('front', label('HOON', 0, 9.6, 0.24), 0x7a4a2a, { hard: true, near: 10 }),
    under(0.16), ...stamp(MAKER, { c: 0x8a7a6a }),
  );
  S.lathe(spline([[0, 0], [14.6, 0], [15.6, 0.8], [16.6, 2.6], [17, 6], [17, 21.4], [16.6, 23], [16.4, 23.6], [14, 23.6]], 2), { segs: 28 });
  // the lamp and the switch; the paddle in its clip on the side
  S.paint(fill(0xe83a2a, { rough: 0.2 }));
  S.ball([2.6, 8.4, 16.8], 0.8, { segs: 8, rings: 5 });
  S.paint(fill(0x7a4a2a, { rough: 0.4 }), under(0.2));
  S.at([-1.6, 7.6, 17], [0.3, 0, 0], () => S.box(-1, -0.8, -0.6, 1, 0.8, 1.6, { bevel: 0.3 }));
  S.paint(fill(0xfbfaf6, { rough: 0.4 }), proj('left', ellipse(0, 18, 2.4, 3), tone(0xfbfaf6, 0.08)), under(0.12));
  S.at([17.6, 0, 2], null, () => {
    S.box(-0.6, 8, -2.6, 1.6, 15, 2.6, { bevel: 0.4 });
    S.at([2, 14, 0], [0, 0, 0.05], () => { S.box(-0.4, -6, -1, 0.4, 2, 1, { bevel: 0.3 }); S.at([0, 5.6, 0], null, () => S.ball([0, 0, 0], [0.7, 4, 2.8], { segs: 10, rings: 6 })); });
  });
  // the carry handle, folded back
  S.paint(fill(0x6a4a3a, { rough: 0.35 }), under(0.2));
  for (const s of [1, -1]) S.at([s * 17.2, 19, 0], [0, 0, s * Math.PI / 2], () => S.cyl([0, -0.6, 0], 1.6, 1.6, { segs: 10 }));
  S.tube(spline([[17.6, 19, 0], [18.6, 25, -6], [12, 27.6, -14], [0, 28.2, -16.4], [-12, 27.6, -14], [-18.6, 25, -6], [-17.6, 19, 0]], 3), 1, { sides: 8 });
  // the inner pot and the rice, under the lid
  S.paint(fill(CHROME, { rough: 0.22 }));
  S.lathe([[14, 23.6], [14.6, 23.2], [14, 22.6], [13.4, 21]], { segs: 24, cap: false });
  S.paint(fill(0xfbfaf6, { rough: 0.7 }), proj('top', or(...[[-4, 3], [3, 5], [6, -4], [-6, -6], [0, -1], [8, 2], [-9, 1]].map(([x, y]) => ellipse(x, y, 0.5, 0.25, x * 0.3))), 0xe8e4da));
  S.lathe(spline([[13.4, 21], [9, 22], [0, 22.6]], 2), { segs: 24 });
  // the lid opens on its hinge
  S.rest = 0;
  S.joint('lid', L(S, { pivot: [0, 24.4, -16.6], axis: 'x', min: -1.9, max: 0, rest: 0, g: [0, -1.5] }), () => {
    S.paint(fill(BODY, { rough: 0.32 }), vol(band(23.6, 24.6), CHROME, { rough: 0.2 }), proj('top', or(stroke(circle(0, 0, 11), 0.4), stroke(circle(0, 0, 13.6), 0.3)), tone(BODY, 0.18)), proj('top', circle(-8, -6, 1.2), 0x6a5a4a), under(0.14), crown(0.04));
    S.lathe(spline([[16.6, 23.6], [17, 24.6], [16.2, 26.2], [13, 28.4], [8, 29.8], [0, 30.2]], 3), { segs: 28 });
    S.paint(fill(0xe8e0cc, { rough: 0.4 }), proj('bottom', stroke(circle(0, 0, 12), 0.6), CHROME));
    S.lathe([[0, 24.4], [16.4, 24.4]], { segs: 28, cap: false });
    S.paint(fill(0x6a4a3a, { rough: 0.3 }), crown(0.15));
    S.lathe(spline([[3.4, 29.8], [3.6, 30.6], [2.6, 31.4], [2, 32.6], [2.6, 33.6], [0, 34]], 2), { segs: 14 });
    S.paint(fill(CHROME, { rough: 0.2 }));
    S.cyl([-8, 29, -6], [1.3, 1], 1.4, { segs: 10 });
  });
}

// ------------------------------------------------------------------ 2. Black Rotary Phone
export function kurodenwa(S) {
  S.dens = DENS;
  const LACE = 0xf8f2e2, DIAL = 0xf6f0e4;
  // the lace doily
  const lace = or(...[7, 12, 17].map((r) => stroke(circle(0, 0, r), 0.4)), ...Array.from({ length: 24 }, (_, i) => circle(Math.cos(i * 0.2618) * 19.6, Math.sin(i * 0.2618) * 19.6, 1)), ...Array.from({ length: 16 }, (_, i) => circle(Math.cos(i * 0.3927) * 14.6, Math.sin(i * 0.3927) * 14.6, 0.7)));
  S.with({ dens: 0.6 }, () => {
    S.paint(fill(LACE, { rough: 0.9 }), proj('top', lace, tone(LACE, 0.14)), under(0.1), ...stamp(MAKER, { c: 0x9a907a }));
    S.lathe([[0, 0], [21.6, 0], [22, 0.4], [21.6, 0.8], [0, 0.8]], { segs: 32 });
  });
  // the body: a heavy black bakelite shell
  S.paint(fill(BLK, { rough: 0.2 }), proj('back', label('TEL', 0, 6, 0.4), 0x6a686e, { hard: true }), under(0.14), crown(0.06));
  S.loft([[0.8, 13.6, 11.6], [2, 14, 12], [6, 13.4, 11.2], [10, 11.6, 9.4], [12.6, 9.4, 7.6], [13.6, 7.6, 6.2]].map(([y, rx, rz]) => ring([0, y, -0.4 + (y - 1) * -0.12], rx, rz, 20, { pow: 3.4 })));
  // the cradle and the handset across it
  S.paint(fill(BLK, { rough: 0.2 }), under(0.14));
  for (const s of [1, -1]) S.lathe(spline([[2.2, 12], [2, 14.6], [2.4, 16.4], [1.6, 17.4], [0, 17.6]], 2), { segs: 12, at: [s * 7.6, 0, -1.8] });
  S.tube(spline([[-12.4, 18.6, -1.8], [-8, 20.4, -1.8], [0, 21, -1.8], [8, 20.4, -1.8], [12.4, 18.6, -1.8]], 3), 1.9, { sides: 10 });
  S.paint(fill(BLK, { rough: 0.2 }), proj('bottom', or(...[[0, 0], [1.2, 0.6], [-1.2, 0.6], [0, -1.3], [1.2, -0.6], [-1.2, -0.6]].map(([x, y]) => circle(x, y, 0.35))), 0x5a585e));
  for (const s of [1, -1]) S.at([s * 12.6, 17.8, -1.8], [0, 0, -s * 0.35], () => S.lathe(spline([[0, -0.8], [3.8, -0.6], [3.6, 0.4], [2.6, 1.8], [1.8, 2.6]], 2), { segs: 14 }));
  // the coiled cord from the side to the handset
  S.paint(fill(BLK, { rough: 0.25 }));
  const P = spline([[-13.2, 4.4, -3], [-17, 2, -4], [-20, 1.4, 2], [-18, 6, 6], [-15.2, 15.2, -1.4]], 6), coil = [];
  for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 6; k++) { const t = k / 6, p = P[i].map((c, d) => c + (P[i + 1][d] - c) * t), a = (i * 6 + k) * 0.95; coil.push([p[0] + Math.cos(a) * 0.9, p[1] + Math.sin(a) * 0.9, p[2] + Math.sin(a) * 0.5]); }
  S.tube(coil, 0.32, { sides: 5 });
  // the dial on the sloping front: the gimmick dials a number
  const D = [0, 8.6, 9.4], N = [0, 0.5, 0.866];
  S.at(D, [Math.PI / 2 - 0.52, 0, 0], () => {
    const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((n, i) => { const a = -0.6 - i * 0.5; return label(n, Math.cos(a) * 4.6, Math.sin(a) * 4.6, 0.2); });
    S.paint(fill(DIAL, { rough: 0.4 }), proj('top', or(...nums), BLK, { hard: true }), proj('top', stroke(circle(0, 0, 3.4), 0.25), tone(DIAL, 0.2)));
    S.cyl([0, -0.6, 0], [6.6, 6.4], 1, { segs: 24 });
    S.paint(fill(CHROME, { rough: 0.2 }));
    S.at([6.2, 0.9, -2.4], null, () => S.box(-0.4, -0.4, -1, 0.4, 0.5, 1, { bevel: 0.2 }));
  });
  S.joint('dial', L(S, { pivot: D, axis: N, min: -2.6, max: 0, rest: 0, g: [0, -2.2] }), () => S.at(D, [Math.PI / 2 - 0.52, 0, 0], () => {
    const holes = or(...Array.from({ length: 10 }, (_, i) => { const a = -0.6 - i * 0.5; return circle(Math.cos(a) * 4.6, Math.sin(a) * 4.6, 1); }));
    const nums = or(...['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((n, i) => { const a = -0.6 - i * 0.5; return label(n, Math.cos(a) * 4.6, Math.sin(a) * 4.6, 0.2); }));
    S.paint(fill(BLK, { rough: 0.18 }), proj('top', holes, DIAL), proj('top', stroke(holes, 0.3), 0x4a484e), proj('top', nums, BLK, { hard: true }), proj('top', circle(0, 0, 2.4), 0xfbf8f0), proj('top', label('110', 0, 0, 0.2), 0xc83a2a, { hard: true }));
    S.cyl([0, 0.4, 0], [6.4, 6.2], 0.9, { segs: 24, bevel: 0.3 });
  }));
}

// ------------------------------------------------------------------ 3. Piano-Key Fan
export function senpuki(S) {
  S.dens = DENS;
  const BLADE = 0x9ad0e8;
  // the base with its piano keys
  S.paint(fill(CREAM, { rough: 0.35 }), vol(band(0, 1.2), TEAL), proj('top', stroke(circle(0, 0, 9), 0.4), tone(CREAM, 0.15)), under(0.16), ...stamp(MAKER, { c: 0x8a8070 }));
  S.lathe(spline([[0, 0], [15, 0], [15.6, 1], [15, 3.6], [12, 5], [3, 5.6], [0, 5.6]], 2), { segs: 28, sz: 0.9 });
  const keys = [['切', CREAM], ['弱', TEAL], ['中', TEAL], ['強', TEAL]];
  keys.forEach(([k, c], i) => {
    S.paint(fill(c, { rough: 0.35 }), proj('front', kana(k, -5.4 + i * 3.6, 3.6, 1.6), c === CREAM ? 0xc83a2a : CREAM), under(0.2));
    S.at([-5.4 + i * 3.6, 3.4, 11.6], [i === 2 ? 0.1 : 0.32, 0, 0], () => S.box(-1.5, 0, -2.4, 1.5, 1.6, 2.4, { bevel: 0.4 }));
  });
  // the pole
  S.paint(fill(CHROME, { rough: 0.2 }), vol(band(14, 15), TEAL));
  S.lathe(spline([[3, 5.4], [2, 6.4], [1.4, 8], [1.3, 14], [1.6, 15], [1.1, 16], [1.1, 27.4]], 2), { segs: 14 });
  // the head turns side to side (the gimmick and its idle sway)
  S.joint('head', L(S, { pivot: [0, 28, 0], axis: 'y', min: -0.8, max: 0.8, rest: 0, g: [0, 0.6], idle: 0.25 }), () => {
    S.paint(fill(CREAM, { rough: 0.35 }), under(0.16));
    S.at([0, 29, 0], [0, 0, Math.PI / 2], () => S.cyl([0, -2, 0], 2.2, 4, { segs: 12 }));
    S.paint(fill(TEAL, { rough: 0.35 }), vol(slabZ(-1, 1), CREAM), under(0.14));
    S.at([0, 31.4, -1.6], [Math.PI / 2, 0, 0], () => S.lathe(spline([[0, -6.4], [3, -6.2], [4.6, -4.6], [5, -1], [4.8, 2.4], [3.4, 3.4], [0, 3.6]], 2), { segs: 18 }));
    S.paint(fill(CREAM, { rough: 0.4 }));
    S.at([0, 31.4, -8], [Math.PI / 2, 0, 0], () => S.cyl([0, -1, 0], 1.2, 2, { segs: 10 }));
    // the blades (clear blue plastic) spin with the gimmick
    S.joint('blades', L(S, { pivot: [0, 31.4, 4], axis: 'z', min: -20, max: 20, rest: 0, g: [0, Math.PI * 2], idle: 0.6 }), () => {
      S.clear(true);
      S.paint(fill(BLADE, { rough: 0.15 }));
      for (let k = 0; k < 4; k++) S.at([0, 31.4, 4.4], [0, 0.0, k * Math.PI / 2 + 0.3], () => S.at([0, 0, 0], [0, 0.35, 0], () => blade(S, 10.6, 8.4, 0.8, { shape: 'round', cup: 0.6 })));
      S.clear(false);
      S.paint(fill(CREAM, { rough: 0.3 }), crown(0.1));
      S.at([0, 31.4, 4], [Math.PI / 2, 0, 0], () => S.lathe(spline([[2.4, 0], [2.4, 1.2], [1.6, 2.6], [0, 3]], 2), { segs: 14 }));
    });
    // the guard: front and back rings, curved spokes, a badge in the middle
    S.paint(fill(CHROME, { rough: 0.22 }));
    for (const z of [0.8, 8]) S.at([0, 31.4, z], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 12.4, 0.45, { segs: 36, sides: 6 }));
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8, c = Math.cos(a), s = Math.sin(a);
      S.tube(spline([[c * 12.4, 31.4 + s * 12.4, 8], [c * 9, 31.4 + s * 9, 10.2], [c * 4.4, 31.4 + s * 4.4, 11.2], [c * 2.2, 31.4 + s * 2.2, 11.4]], 2), 0.22, { sides: 4, caps: false });
      S.tube(spline([[c * 12.4, 31.4 + s * 12.4, 0.8], [c * 9, 31.4 + s * 9, -1.6], [c * 5, 31.4 + s * 5, -2.8]], 2), 0.22, { sides: 4, caps: false });
    }
    S.paint(fill(TEAL, { rough: 0.3 }), proj('front', star(0, 31.4, 1.4), CREAM), proj('front', stroke(circle(0, 31.4, 2.2), 0.3), CHROME));
    S.at([0, 31.4, 11.2], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], 2.6, 0.8, { segs: 16, bevel: 0.3 }));
  });
}

// ------------------------------------------------------------------ 4. Wooden TV on Legs
export function terebi(S) {
  S.dens = DENS;
  const W = 0xa86e3e, PANEL = 0xe8dcc0;
  // the legs
  S.paint(fill(tone(W, 0.15), { rough: 0.5 }), vol(below(1.6), CHROME));
  for (const [x, z] of [[-17, 9], [17, 9], [-17, -9], [17, -9]]) S.tube([[x * 1.08, 0, z * 1.1], [x, 10.6, z]], [0.9, 1.4], { sides: 8 });
  // the cabinet, its screen and the panel of dials
  S.paint(fill(W, { rough: 0.45 }), proj('top', grain(W, 6, 30, 14), tone(W, 0.14)), proj('left', grain(W, 5, 20, 14, 25), tone(W, 0.14)), proj('right', grain(W, 5, 20, 14, 25), tone(W, 0.14)), proj('front', rbox(11.6, 25.4, 6.8, 12.6, 1), PANEL, { near: 11 }), under(0.16), ...stamp(MAKER, { c: 0x5a3a20 }));
  S.box(-22, 10.4, -12, 22, 40, 12, { bevel: 2.2 });
  const grille = and(rbox(11.6, 19, 5.4, 4.6, 0.6), repeatV(rbox(0, 0, 8, 0.25, 0), 0.9));
  S.paint(fill(PANEL, { rough: 0.5 }), proj('front', grille, tone(PANEL, 0.4)), proj('front', label('VHF', 9.4, 34.4, 0.22), 0x5a3a20, { hard: true }), proj('front', label('UHF', 14.4, 30.6, 0.22), 0x5a3a20, { hard: true }), proj('front', kana('ゆめカラー', 11.6, 13.6, 1.6), 0x5a3a20));
  S.box(4.8, 12.8, 11.6, 18.4, 38, 12.4, { bevel: 0.3 });
  const bars = [0xf6f6f0, 0xf2e04a, 0x6ad2e0, 0x6ad06a, 0xd86ad0, 0xe84a4a, 0x3a5ad8];
  S.paint(fill(0x2a2e34, { rough: 0.15 }), ...bars.map((c, i) => proj('front', rbox(-20.4 + 1.6 + i * 3.2, 27.4, 1.6, 6.6, 0), c, { near: 12 })), proj('front', rbox(-8.6, 19.6, 11.2, 1.6, 0), 0x22263a, { near: 12 }));
  S.loft([[11.8, 12.4, 11], [12.6, 12, 10.6], [13.2, 11, 9.6], [13.5, 8.6, 7.2]].map(([z, rx, ry]) => ring([-8.6, 25.8, z], rx, ry, 16, { axis: 'z', pow: 5 })), { caps: 'end' });
  S.paint(fill(CHROME, { rough: 0.25 }));
  for (const [x0, y0, x1, y1] of [[-21.4, 36.8, 4.2, 37.8], [-21.4, 13.8, 4.2, 14.8], [-21.4, 13.8, -20.4, 37.8], [3.2, 13.8, 4.2, 37.8]]) S.box(x0, y0, 11.4, x1, y1, 12.8, { bevel: 0.3 });
  // the channel dial clicks round (the gimmick); the fine-tuning knob below it
  S.joint('dial', L(S, { pivot: [9.4, 30, 12], axis: 'z', min: -6.3, max: 6.3, rest: 0, g: [0, -1.57] }), () => {
    S.paint(fill(0x3a3034, { rough: 0.3 }), proj('front', seg(9.4, 30.4, 9.4, 32.4, 0.4), CREAM), under(0.2));
    S.at([9.4, 30, 12.4], [Math.PI / 2, 0, 0], () => S.lathe(spline([[2.8, 0], [2.8, 1.4], [2.2, 2.6], [0, 2.8]], 2), { segs: 16 }));
  });
  S.paint(fill(0x3a3034, { rough: 0.3 }), crown(0.15));
  S.at([14.4, 26, 12.4], [Math.PI / 2, 0, 0], () => S.lathe(spline([[1.8, 0], [1.8, 1.2], [1.2, 2], [0, 2.2]], 2), { segs: 14 }));
  // on top: a lace runner, the rabbit ears, a kokeshi
  S.paint(fill(0xfbf8f0, { rough: 0.9 }), proj('top', or(...Array.from({ length: 9 }, (_, i) => circle(-12 + i * 3, 0, 0.6))), 0xe8e0d0), under(0.06));
  drape(S, -16, -7, 16, 7, 40.4, { nx: 8, nz: 4, th: 0.4, fold: (u, v) => 0.25 * Math.sin(u * 9) * (v > 0.5 ? 1 : -1) });
  S.paint(fill(0x3a3034, { rough: 0.3 }), crown(0.1));
  S.lathe(spline([[4.4, 40.6], [4, 42], [2.6, 43.4], [0, 43.8]], 2), { segs: 16, at: [-10, 0, -2] });
  S.joint('antenna', L(S, { pivot: [-10, 43.6, -2], axis: 'z', min: -0.5, max: 0.5, rest: 0, idle: 0.08 }), () => {
    S.paint(fill(CHROME, { rough: 0.2 }));
    for (const s of [1, -1]) { S.tube([[-10, 43.4, -2], [-10 + s * 12, 64, -4]], [0.55, 0.3], { sides: 6 }); S.ball([-10 + s * 12, 64.2, -4], 0.8, { segs: 8, rings: 5 }); }
  });
  S.paint(fill(0xd8483a, { rough: 0.4 }), wrap(3.2, or(...[[-2, 46], [1.4, 47.6], [2.6, 44.6], [-1, 43.4], [0, 49]].map(([u, v]) => or(circle(u, v, 0.8), circle(u + 0.7, v + 0.5, 0.5)))), 0xf2c84a), vol(above(51.4), 0xf6e2c4), under(0.14));
  S.lathe(spline([[0, 40.4], [3.2, 40.4], [3.4, 41.2], [2.8, 44], [2.6, 48], [2.2, 51.4], [1.4, 52]], 2), { segs: 16, at: [12, 0, 0] });
  S.paint(fill(0xf6e2c4, { rough: 0.5 }), vol(above(56.6), BLK), vol(blob([12, 55.6, -3.6], [4.6, 3, 2.4]), BLK), ...face({ at: [12, 54.2], gap: 2.6, r: 0.5, eye: 'line', mouth: null, near: 0 }), proj('front', ellipse(12, 52.8, 0.4, 0.3), 0xd8483a), under(0.1));
  S.ball([12, 54.6, 0], [4, 3.8, 3.8], { segs: 16, rings: 10 });
}

// ------------------------------------------------------------------ 5. Twin-Tub Washer
export function sentakuki(S) {
  S.dens = DENS;
  const BLUE = 0x9ccce4, WHITE = 0xf8f8f4;
  const waves = or(...[-16, -6, 4, 14].map((x) => arc(x, 7, 5, 0.2, Math.PI - 0.2, 0.7)));
  S.paint(fill(BLUE, { rough: 0.35 }), vol(above(27), WHITE), proj('front', waves, WHITE, { near: 10 }), proj('front', rbox(-9.6, 17.6, 6, 2.2, 0.8), WHITE, { near: 10 }), proj('front', kana('うず潮', -9.6, 17.8, 2.4), 0x3a6ab8, { near: 10 }), proj('front', label('2-TUB', 11, 17.8, 0.3), 0x3a6ab8, { hard: true, near: 10 }), under(0.16), ...stamp(MAKER, { c: 0x5a7a8a }));
  S.box(-22, 2, -12, 22, 30, 12, { bevel: 2.6 });
  S.paint(fill(0x6a7480, { rough: 0.5 }));
  for (const [x, z] of [[-19, 9], [19, 9], [-19, -9], [19, -9]]) S.cyl([x, 0, z], [1.6, 2], 2.2, { segs: 10 });
  // the control panel along the back: the wash timer and the spin timer
  S.paint(fill(WHITE, { rough: 0.35 }), proj('front', or(label('WASH', -9, 33.4, 0.22), label('SPIN', 12, 33.4, 0.22)), 0x3a6ab8, { hard: true }), under(0.16));
  S.at([0, 30, -9], [-0.5, 0, 0], () => S.box(-21.4, 0, -3, 21.4, 6, 3, { bevel: 1 }));
  for (const x of [-15, -6, 12]) {
    S.paint(fill(0x3a6ab8, { rough: 0.3 }), proj('front', seg(x, 34.6, x, 36.4, 0.35), WHITE), crown(0.15));
    S.at([x, 34.6, -6.6], [Math.PI / 2 - 0.5, 0, 0], () => S.lathe(spline([[2, 0], [2, 1.2], [1.4, 2], [0, 2.2]], 2), { segs: 14 }));
  }
  // the drain hose, curled on the floor
  S.paint(fill(0x8a98a8, { rough: 0.55 }), under(0.14));
  S.tube(spline([[-22, 5, 6], [-25, 3, 8], [-26, 1, 2], [-24, 1, -6], [-28, 1, -9]], 3), 1.2, { sides: 8 });
  // the spin lid; the wash lid opens on a tub of suds and the missing sock
  S.paint(fill(WHITE, { rough: 0.3 }), proj('top', stroke(rbox(0, 0, 5.4, 5.4, 1.4), 0.3), tone(WHITE, 0.15)), under(0.14));
  S.box(7.4, 30, -6, 19.4, 31.4, 7, { bevel: 0.6 });
  S.paint(fill(0x8ac4e4, { rough: 0.15 }), proj('top', stroke(circle(-8, -2, 9.6), 1), 0xd8dce0));
  S.lathe(spline([[0, 30.3], [8, 30.2], [10.4, 30]], 2), { segs: 24, at: [-8, 0, 2] });
  S.paint(fill(0xfbfbf8, { rough: 0.6 }), under(0.08));
  for (const [x, z, r] of [[-13, 0, 2.4], [-10, 5, 1.8], [-4, 1, 2.2], [-3, 6, 1.4], [-14, 6, 1.4]]) S.ball([x, 30.1, z], [r, Math.min(1.2, r * 0.5), r], { segs: 10, rings: 5, v0: 0.5 });
  S.paint(fill(0xd8483a, { rough: 0.8 }), vol(blob([-6.6, 30, 1], [2.4, 2, 2.6]), 0xfbf8f0), under(0.1));
  S.tube(spline([[-8.6, 30.4, -3], [-7.4, 30.7, 0], [-6, 30.6, 2.4], [-3.4, 30.4, 3.2]], 2), 0.8, { sides: 8 });
  S.rest = 0;
  S.joint('lid', L(S, { pivot: [0, 31.4, -6.6], axis: 'x', min: -1.8, max: 0, rest: 0, g: [0, -1.5] }), () => {
    S.paint(fill(WHITE, { rough: 0.3 }), proj('top', or(stroke(rbox(-7.8, -1.6, 10.6, 6.6, 1.6), 0.3), rbox(-7.8, -7, 3, 0.6, 0.3)), tone(WHITE, 0.18)), under(0.14));
    S.box(-20.4, 30, -6.6, 4.6, 31.6, 10.4, { bevel: 0.7 });
  });
}

// ------------------------------------------------------------------ 6. Radio-Cassette Boombox (rare)
export function rajikase(S) {
  S.dens = DENS;
  const SILV = 0xc4c8ce, DARK = 0x3a3c42;
  const band_ = and(rbox(0, 23.4, 9, 2, 0), or(repeatU(rbox(0, 0, 0.12, 0.8, 0), 1.6)));
  S.paint(
    fill(SILV, { rough: 0.3 }), vol(below(12), DARK, { rough: 0.4 }), proj('front', rbox(0, 23.4, 9.6, 2.6, 0.5), 0x2a2c30, { near: 6 }), proj('front', band_, 0xe8e0c0, { near: 6 }), proj('front', rbox(2.6, 23.4, 0.25, 2, 0), 0xe84a3a, { near: 6 }),
    proj('front', label('FM  88  92  96  100  108', 0, 21.4, 0.16), 0xe8e0c0, { hard: true, near: 6 }), proj('front', label('STEREO', 0, 27.6, 0.24), DARK, { hard: true, near: 6 }), proj('front', kana('ラジカセ', -19, 28.6, 1.8), DARK, { near: 6 }),
    proj('back', or(stroke(rbox(0, 14, 12, 6, 1), 0.4), label('AC100V', 0, 15, 0.3)), tone(SILV, 0.35)), under(0.16), ...stamp(MAKER, { c: 0x6a6c72 }),
  );
  S.box(-30, 0, -8, 30, 31, 8, { bevel: 2.4 });
  // the speakers
  for (const s of [1, -1]) {
    const mesh = and(circle(s * 18, 13.6, 8.6), or(repeatU(rbox(0, 0, 0.18, 20, 0), 0.8), repeatV(rbox(0, 0, 20, 0.18, 0), 0.8)));
    void mesh;
    const meshL = and(circle(0, 0, 8.6), or(repeatU(rbox(0, 0, 0.18, 20, 0), 0.8), repeatV(rbox(0, 0, 20, 0.18, 0), 0.8)));
    S.paint(fill(0x24262a, { rough: 0.6 }), proj('top', meshL, 0x4a4c52), proj('top', stroke(circle(0, 0, 3), 0.4), 0x4a4c52));
    S.at([s * 18, 13.6, 7.6], [Math.PI / 2, 0, 0], () => S.lathe([[0, 0.2], [8.6, 0.6], [8.6, -0.2]], { segs: 24, cap: false }));
    S.paint(fill(CHROME, { rough: 0.2 }));
    S.at([s * 18, 13.6, 8], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 9.2, 0.7, { segs: 28, sides: 6 }));
  }
  // the cassette deck: a clear door with the mixtape behind it (the gimmick opens it)
  S.paint(fill(0x24262a, { rough: 0.4 }));
  S.box(-6.8, 3, 7, 6.8, 18, 8.2);
  S.rest = 0;
  S.joint('door', L(S, { pivot: [0, 3, 8.4], axis: 'x', min: 0, max: 0.9, rest: 0, g: [0, 0.75] }), () => {
    S.paint(fill(0xf4f0e2, { rough: 0.5 }), proj('front', rbox(0, 12.4, 5.6, 2, 0.3), 0xe8963a), proj('front', label('MIX 87', 0, 12.4, 0.22), DARK, { hard: true }), proj('front', or(stroke(circle(-3, 9, 1.2), 0.5), stroke(circle(3, 9, 1.2), 0.5)), 0x6a5a4a), proj('front', rbox(0, 9, 1.6, 0.9, 0.2), 0x6a5a4a));
    S.box(-5.6, 6, 7.4, 5.6, 15.6, 8.4, { bevel: 0.3 });
    S.clear(true);
    S.paint(fill(0xd8dcd8, { rough: 0.05 }));
    S.box(-6.6, 3.2, 8.6, 6.6, 17.6, 9.2, { bevel: 0.3 });
    S.clear(false);
    S.paint(fill(SILV, { rough: 0.3 }));
    S.box(-6.8, 3, 8.2, 6.8, 4, 9.4, { bevel: 0.3 });
  });
  // the piano keys on top, the handle, the aerial
  const keyCols = [0xe84a3a, DARK, DARK, DARK, DARK, DARK];
  ['REC', 'PLAY', 'REW', 'FF', 'STOP', 'EJ'].forEach((k, i) => { S.paint(fill(keyCols[i], { rough: 0.35 }), proj('top', label(k, -7.5 + i * 3, -1, 0.14), 0xe8e8e0, { hard: true }), under(0.2)); S.box(-8.9 + i * 3, 30.6, -1.6, -6.3 + i * 3, 32.2, 4.6, { bevel: 0.35 }); });
  S.paint(fill(DARK, { rough: 0.35 }), under(0.2));
  for (const s of [1, -1]) S.box(s * 23 - 2, 30, -4, s * 23 + 2, 34, 0, { bevel: 0.8 });
  S.tube(spline([[-23, 33.4, -2], [-20, 38.4, -2], [0, 39.6, -2], [20, 38.4, -2], [23, 33.4, -2]], 3), 1.3, { sides: 10 });
  S.paint(fill(CHROME, { rough: 0.15 }));
  S.joint('aerial', L(S, { pivot: [27, 30, -5], axis: 'z', min: -0.6, max: 0.4, rest: 0, idle: 0.06 }), () => {
    S.tube([[27, 30, -5], [33, 44, -5]], 0.75, { sides: 8 });
    S.tube([[33, 44, -5], [37, 53.4, -5]], 0.5, { sides: 8 });
    S.tube([[37, 53.4, -5], [40, 60.4, -5]], 0.35, { sides: 8 });
    S.ball([40.2, 60.8, -5], 0.7, { segs: 8, rings: 5 });
  });
}

// ------------------------------------------------------------------ 7. Kotatsu & Mikan (ultra)
export function kotatsu(S) {
  S.dens = DENS;
  const TATAMI = 0xd8cc8a, HERI = 0x3a5a3a, FUTON = 0xd8603a, FUTON2 = 0xf2c87a, TOP = 0xb8824a, MIKAN = 0xf2902a;
  S.with({ dens: 0.5 }, () => {
    S.paint(fill(TATAMI, { rough: 0.9 }), proj('top', repeatV(rbox(0, 0, 40, 0.2, 0), 1.4), tone(TATAMI, 0.12)), proj('top', or(rbox(0, 22.6, 32, 1.6, 0), rbox(0, -22.6, 32, 1.6, 0)), HERI), under(0.2), ...stamp(MAKER, { c: 0x7a704a }));
    S.box(-32, 0, -24, 32, 3, 24, { bevel: 0.6 });
  });
  // the futon: a quilt over the frame, its print of big flowers, folds where it meets the mat
  const blooms = (v) => proj(v, or(...[[-14, 9], [8, 6], [20, 11], [-2, 12.4], [-22, 5]].map(([x, y]) => or(...[0, 1, 2, 3, 4].map((k) => circle(x + Math.cos(k * 1.257) * 2.2, y + Math.sin(k * 1.257) * 2.2, 1.6))))), FUTON2);
  S.paint(fill(FUTON, { rough: 0.85 }), blooms('front'), blooms('back'), blooms('left'), blooms('right'), proj('top', or(...[[-10, 6], [10, -8], [0, 14], [-16, -12], [16, 10]].map(([x, y]) => or(...[0, 1, 2, 3, 4].map((k) => circle(x + Math.cos(k * 1.257) * 2.2, y + Math.sin(k * 1.257) * 2.2, 1.6))))), FUTON2), under(0.14));
  const fold = (u, v) => {
    const e = Math.min(u, 1 - u, v, 1 - v), k = Math.max(0, Math.min(1, (0.16 - e) / 0.14));
    return -16 * (1 - Math.cos(k * Math.PI)) / 2 * (k < 1 ? 1 : 1) + 0.7 * Math.sin(u * 23 + v * 7) * k * k;
  };
  drape(S, -29, -22, 29, 22, 19, { nx: 22, nz: 18, th: 1.2, fold });
  // the table top
  S.paint(fill(TOP, { rough: 0.4 }), proj('top', grain(TOP, 7, 26, 20), tone(TOP, 0.12)), vol(below(20.6), tone(TOP, 0.25)), under(0.2));
  S.box(-25, 19.2, -20, 25, 21.6, 20, { bevel: 0.8 });
  // a basket of mikan, a teacup
  S.paint(fill(0xc8a46a, { rough: 0.8 }), wrap(7, or(repeatU(rbox(0, 0, 0.25, 9, 0.1, 0.4), 1.6), repeatV(rbox(0, 0, 40, 0.25, 0), 1.2)), tone(0xc8a46a, 0.2)), under(0.16));
  S.lathe(spline([[0, 21.6], [5, 21.6], [6.6, 23], [7.4, 25.4], [7.8, 26], [7, 26], [6.4, 24.4], [0, 24]], 2), { segs: 18, at: [-6, 0, -3] });
  S.paint(fill(MIKAN, { rough: 0.55 }), crown(0.12), under(0.16));
  for (const [x, y, z] of [[-8.6, 26.2, -4], [-3.6, 26.4, -1.6], [-5, 26.2, -6.4], [-5.8, 30, -3.6]]) {
    S.lathe(spline([[0, -2.8], [3, -2.6], [3.6, -0.6], [3.2, 1.6], [2, 2.7], [0, 3]], 2), { segs: 12, at: [x, y, z] });
  }
  S.paint(fill(0x5a8a3a));
  S.cyl([-5.8, 32.8, -3.6], [0.5, 0.4], 0.6, { segs: 6 });
  S.paint(fill(MIKAN, { rough: 0.55 }), proj('top', or(...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => seg(9, 6, 9 + Math.cos(k * 0.785) * 3, 6 + Math.sin(k * 0.785) * 3, 0.3))), 0xf6e2b4));
  S.lathe(spline([[0, 21.6], [3, 21.6], [3.4, 22.4], [3.2, 22.8], [0, 22.6]], 2), { segs: 12, at: [9, 0, -6] });
  S.paint(fill(0x5a7a8a, { rough: 0.3 }), wrap(3, or(...[0, 1, 2].map((k) => arc(k * 3 - 3, 25, 1.4, 0, Math.PI, 0.4))), 0xf2ecd8), under(0.14));
  S.lathe(spline([[0, 21.6], [2.4, 21.6], [2.6, 22.2], [3, 26.6], [2.5, 26.6], [2.3, 22.8], [0, 22.8]], 2), { segs: 14, at: [10, 0, 6] });
  // the cat under the futon: the gimmick lets it out a little further
  const FUR = 0xf6f2ea, PATCH = 0x7a7480;
  S.joint('cat', L(S, { slide: [0, 0, 5], min: 0, max: 1, rest: 0, g: [0, 1] }), () => {
    S.paint(fill(FUR), vol(blob([5, 10, 22], [5, 4, 5]), PATCH), ...face({ at: [0, 8.6], gap: 6, r: 1.1, eye: 'closed', mouth: null, blush: 0xf4a0a8, near: 24 }), proj('front', or(arc(-0.7, 6, 0.7, Math.PI, Math.PI * 2, 0.3), arc(0.7, 6, 0.7, Math.PI, Math.PI * 2, 0.3)), 0x8a7a80, { near: 24 }), under(0.14), crown(0.05));
    head(S, [0, 8, 21.4], [6.4, 5, 5.6], { muzzle: 0.3, brow: 0.3, cheek: 0.3, chin: 0.2 });
    S.paint(fill(0xf2a6b0, { rough: 0.3 }));
    S.ball([0, 7, 26.8], [0.7, 0.5, 0.4], { segs: 6, rings: 4 });
    for (const s of [1, -1]) {
      S.paint(fill(s > 0 ? PATCH : FUR), proj('front', ellipse(0, 2.4, 1.3, 1.8), 0xf2a6b0));
      S.at([s * 3.6, 11.6, 20.6], [-0.15, 0, -s * 0.36], () => blade(S, 5, 5, 1.5, { shape: 'ear', cup: 0.8 }));
      S.paint(fill(FUR), under(0.12));
      paw(S, [s * 6.4, 3, 23.2], 3.6, 4.4, 2.2, { toes: 3 });
    }
  });
}

// ------------------------------------------------------------------ 8. Ojii-chan's Massage Chair (secret)
export function massage(S) {
  S.dens = DENS;
  const VINYL = 0xc8343a, SKIN = 0xf2c8a4, CARDI = 0x8a8a5a, SLACK = 0x6a6a74;
  const tufts = (v, x0, y0, nx, ny, dx, dy) => proj(v, or(...Array.from({ length: nx * ny }, (_, i) => circle(x0 + (i % nx) * dx, y0 + Math.floor(i / nx) * dy, 0.45))), tone(VINYL, 0.35));
  // the chair: base, seat, back with its rollers' seam, arms, the coin box
  S.paint(fill(0x3a3438, { rough: 0.5 }), under(0.2), ...stamp(MAKER, { c: 0x8a8088 }));
  S.box(-17, 0, -15, 17, 6, 15, { bevel: 1.4 });
  S.paint(fill(VINYL, { rough: 0.4 }), tufts('top', -8, -6, 3, 2, 8, 9), under(0.18), crown(0.06));
  S.box(-13, 6, -12, 13, 14, 13, { bevel: 3 });
  S.paint(fill(VINYL, { rough: 0.4 }), tufts('front', -6, 22, 3, 3, 6, 8), proj('front', or(seg(-1.6, 18, -1.6, 44, 0.4), seg(1.6, 18, 1.6, 44, 0.4)), tone(VINYL, 0.3)), under(0.18), crown(0.06));
  S.at([0, 12, -11], [-0.22, 0, 0], () => S.loft([[0, 13.6, 4], [16, 13.6, 4.4], [30, 13, 4.6], [36, 11.6, 4.4], [38, 8, 3.6]].map(([y, rx, rz]) => ring([0, y, 0], rx, rz, 16, { pow: 4 }))));
  for (const s of [1, -1]) {
    S.paint(fill(VINYL, { rough: 0.4 }), under(0.18), crown(0.08));
    S.loft([[6, 3.4, 13], [16, 3.6, 13.4], [19.6, 3.4, 13], [20.6, 2.6, 12.4]].map(([y, rx, rz]) => ring([s * 15.4, y, 0], rx, rz, 14, { pow: 4 })));
  }
  S.paint(fill(0xc8ccd2, { rough: 0.3 }), proj('front', or(rbox(15.4, 24.6, 1.4, 0.3, 0.1), label('10', 14.6, 22.8, 0.22)), 0x2a2c30, { hard: true }), proj('top', rbox(15.4, 7.6, 0.3, 1.4, 0.1), 0x2a2c30), proj('front', kana('円', 16.6, 22.8, 1), 0x2a2c30));
  S.box(12.4, 20.6, -10.6, 18.4, 26.6, -4.6, { bevel: 0.7 });
  // the remote on its cord
  S.paint(fill(0xf2ecd8, { rough: 0.4 }), proj('front', or(circle(-20.4, 12, 0.5), circle(-20.4, 10.4, 0.5), circle(-20.4, 8.8, 0.5)), 0xc8343a));
  S.box(-21.8, 6.4, 9.6, -19, 14.6, 11, { bevel: 0.6 });
  S.paint(fill(0x3a3438, { rough: 0.4 }));
  S.tube(spline([[-18.6, 18, 6], [-20.4, 17, 9], [-20.4, 14.6, 10.2]], 2), 0.35, { sides: 5 });
  // grandpa, fast asleep: cardigan, slacks, slippers, a hand on the armrest
  S.paint(fill(CARDI, { rough: 0.8 }), proj('front', or(seg(0, 14, 0, 30, 0.4), ...[17, 21, 25].map((y) => circle(0.9, y, 0.5))), tone(CARDI, 0.35)), vol(below(15.4), SLACK), under(0.14));
  torso(S, [0, 14, -2], [9.4, 12, 7.6], { belly: 0.3, hips: 1.05, sit: 0.4, lean: 1 });
  S.paint(fill(SLACK, { rough: 0.8 }), under(0.14));
  for (const s of [1, -1]) {
    limb(S, [[s * 4.4, 16, 2], [s * 4.8, 15.4, 9], [s * 5, 15, 14]], 3.4, 3.1);
    limb(S, [[s * 5, 15, 14], [s * 5.2, 9, 15.6], [s * 5.4, 4, 16.4]], 3, 2.4);
    S.paint(fill(0x6a3a3a, { rough: 0.6 }), under(0.2));
    S.at([s * 5.4, 0.2, 18], null, () => S.loft([[-4, 0.2, 1], [-1, 2.6, 2.6], [2.6, 2.8, 2.6], [4.4, 2.2, 1.6], [5.4, 0.6, 0.8]].map(([z, w, h]) => ring([0, h * 0.5, z], w, h * 0.5 + 0.3, 10, { axis: 'z', pow: 2.4 }))));
    S.paint(fill(SLACK, { rough: 0.8 }), under(0.14));
  }
  S.paint(fill(CARDI, { rough: 0.8 }), under(0.14));
  for (const s of [1, -1]) limb(S, [[s * 8.6, 25, -2], [s * 11.6, 21, 1], [s * 14, 21.4, 7]], 2.4, 2.1);
  S.paint(fill(SKIN, { rough: 0.55 }), under(0.12));
  for (const s of [1, -1]) S.at([s * 14.2, 21.6, 9], aim([0, -0.2, 1]), () => paw(S, [0, -0.8, 0], 3.6, 4, 1.8, { toes: 4 }));
  // his head, nodding (idle); the gimmick blows his sleep bubble up
  S.joint('head', L(S, { pivot: [0, 26, -2], axis: 'x', min: -0.3, max: 0.5, rest: 0.18, idle: 0.07 }), () => S.at([0, 33.6, -1], [0.18, 0, 0.12], () => {
    personHead(S, SKIN, {
      paint: [...face({ at: [0, 1], gap: 5.2, r: 0.9, eye: 'closed', mouth: 'o', my: 3.8, mw: 1.8, near: 2 }), vol(blob([0, 7, -1], [6, 2, 6]), tint(SKIN, 0.2)), proj('front', pair(ellipse(3.6, -1.8, 1.4, 0.8)), 0xec9a8a, { alpha: 0.7, near: 2 })],
    });
    // the white fringe round the back, the eyebrows, the moustache, his glasses pushed up
    S.paint(fill(0xf2f0ea, { rough: 0.8 }), under(0.1));
    S.tube(spline([[5.8, 1, 1.4], [5.4, 3.4, -3], [0, 3.6, -6.4], [-5.4, 3.4, -3], [-5.8, 1, 1.4]], 3), (t) => 1.5 + 0.5 * Math.sin(t * Math.PI), { sides: 8 });
    for (const s of [1, -1]) S.tube([[s * 1.4, 3.2, 5.8], [s * 3.8, 3.6, 5.2]], 0.55, { sides: 5 });
    S.loft([[-3.4, 0.4], [-1.6, 0.8], [0, 0.6], [1.6, 0.8], [3.4, 0.4]].map(([x, r]) => ring([x, -2.6 + Math.abs(x) * -0.12, 6.4 - Math.abs(x) * 0.25], r * 0.7, r, 6, { axis: 'x' })));
    S.paint(fill(0x6a5a4a, { rough: 0.3 }));
    for (const s of [1, -1]) S.at([s * 2.6, 5.4, 4.4], [Math.PI / 2 - 0.9, 0, 0], () => S.torus([0, 0, 0], 1.6, 0.3, { segs: 14, sides: 5 }));
    S.tube([[-1, 5.6, 5], [1, 5.6, 5]], 0.25, { sides: 4 });
    S.part('bubble', { rest: 0, move: (t) => swell([0.6, 31, 6.2], 0.5 + 1.2 * t) }, () => {
      S.clear(true);
      S.paint(fill(0xd8ecf2, { rough: 0.05 }));
      S.ball([1.6, -2.4, 9.4], 2.4, { segs: 14, rings: 8 });
      S.clear(false);
    });
  }));
}

void loaf; void chain; void slide; void hinge; void mix; void cut; void star; void halfBelow; void halfAbove; void slabX; void blobs; void EYE; void above; void or_;
