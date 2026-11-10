// Puchi Aquarium (ぷちぷち水族館): small friends from the big blue tank, the squishy, the flat, the ancient and the
// enormous, each on the aquarium shop's clear wave stand. Sculpt programs in millimetres (src/figures/sculpt.js); data: src/data/series/umi.js.
import { spline, ring, swell, QUAL } from '../sculpt.js';
import { head, torso, loaf, blade } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, label, kana, below, above, band, blob, blobs, repeatU, repeatV, spots,
} from '../paint.js';

const MAKER = 'SUIZOKU';
const GA = 2.39996;
const SEA = 0x2f7fc0, ACRYL = 0xe4f2f6, BLUSH = 0xf2a0a8;
const outer = (L) => ({ ...L, prep: (ctx) => { let x = 0, z = 0; for (const p of ctx.pts) { x += p[0]; z += p[2]; } return ctx.n[0] * x + ctx.n[2] * z > 0 ? L.prep(ctx) : null; } });
/** The shop's stand: a blue wave plate under a clear acrylic slab, the name card at the front. Returns its top. */
function stand(S, r, sz = 0.7, name = null) {
  const waves = or(...Array.from({ length: 12 }, (_, k) => arc(-r + (k % 6) * r / 2.6 + (k >= 6 ? r / 5 : 0), (k >= 6 ? -r * 0.3 : r * 0.25), 3, 0.2, Math.PI - 0.2, 0.5)));
  S.paint(fill(SEA, { rough: 0.3 }), proj('top', waves, tint(SEA, 0.45)), outer(vol(band(1, 1.5), 0xf6f4ee)), under(0.2), ...stamp(MAKER, { c: 0xb8d8f0 }));
  S.lathe([[0, 0], [r - 0.6, 0], [r, 0.6], [r, 2.4], [0, 2.4]], { segs: 30, sz });
  S.clear(true);
  S.paint(fill(ACRYL, { rough: 0.05 }));
  S.lathe([[0, 2.4], [r - 0.4, 2.4], [r, 2.8], [r, 4.4], [r - 0.6, 5], [0, 5]], { segs: 30, sz });
  S.clear(false);
  if (name) {
    S.paint(fill(0xf8f6ee, { rough: 0.6 }), proj('front', kana(name, 0, 2.6, 2.6), 0x1f5a8a), proj('front', rbox(0, 0.6, 9, 0.3), SEA), under(0.2));
    S.at([0, 0, r * sz - 0.6], [-0.35, 0, 0], () => S.box(-10, 0, -0.5, 10, 5, 0.5, { bevel: 0.3 }));
  }
  return 5;
}
/** A clear rod from y0 up to p (what the swimmers hang on). */
function rod(S, p, y0, r = 0.6) { S.clear(true); S.paint(fill(ACRYL, { rough: 0.05 })); S.tube([[p[0], y0, p[2]], p], r, { sides: 8 }); S.clear(false); }

// ------------------------------------------------------------------ 1. Mendako
export function mendako(S) {
  const y0 = stand(S, 18, 0.75, 'メンダコ');
  const OCT = 0xe8603a, PALE = 0xf6a080;
  rod(S, [0, y0 + 10, 0], y0);
  const y = y0 + 10;
  // the webbed skirt: eight scallops round the rim, arm tips curled under
  const sk = (yy, k) => { const n = Math.max(16, Math.round(32 * QUAL.k)); return Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, rr = k * (1 - 0.12 * Math.abs(Math.sin(a * 4))); return [Math.cos(a) * rr, yy, Math.sin(a) * rr * 0.92]; }); };
  const freck = or(...Array.from({ length: 9 }, (_, k) => { const a = k * GA, d = 3 + Math.sqrt(k) * 3; return circle(Math.cos(a) * d, Math.sin(a) * d, 0.45); }));
  S.paint(fill(OCT, { rough: 0.45 }), proj('top', freck, tint(OCT, 0.3)), ...face({ at: [0, y + 5.4], gap: 7, r: 1.2, eye: 'bead', mouth: 'smile', mw: 2, my: 2.2, blush: BLUSH, near: 6 }), proj('bottom', or(...Array.from({ length: 8 }, (_, k) => seg(0, 0, Math.cos(k * Math.PI / 4) * 13, Math.sin(k * Math.PI / 4) * 13, 0.5))), tone(OCT, 0.2)), under(0.15), crown(0.06));
  S.loft([sk(y, 6), sk(y + 0.4, 13.4), sk(y + 1.6, 15.4), sk(y + 3, 14.6), sk(y + 5.4, 11), sk(y + 8.6, 7.4), sk(y + 10.8, 3.6), sk(y + 11.4, 0.6)]);
  // the ear fins (they flap)
  for (const s of [-1, 1]) S.joint(s < 0 ? 'earL' : 'earR', { pivot: [s * 4.4, y + 9.6, 1], axis: 'z', min: -0.6, max: 0.6, rest: 0, g: [0, s * 0.5], idle: 0.25 }, () => {
    S.paint(fill(PALE, { rough: 0.45 }), under(0.15));
    S.at([s * 4.4, y + 9.6, 1], [0, 0, -s * 0.5], () => blade(S, 5.4, 4.6, 1, { shape: 'round', cup: 0.6 }));
  });
}

// ------------------------------------------------------------------ 2. Garden Eel Trio
export function chinanago(S) {
  const SAND = 0xe8dcb8, SPOT = 0xf8f6ee, ORA = 0xf08a3a, Y0 = stand(S, 23, 0.74, 'チンアナゴ');
  S.paint(fill(SAND, { rough: 0.9 }), proj('top', or(circle(-10, -2, 2.6), circle(1, 4, 2.6), circle(11, -3, 2.6)), 0x8a7a5a), proj('top', or(...Array.from({ length: 10 }, (_, k) => { const a = k * GA, d = 4 + k * 1.6; return ellipse(Math.cos(a) * d, Math.sin(a) * d * 0.7, 0.8, 0.5, a); })), tone(SAND, 0.12)), under(0.2), under(0.2));
  S.lathe(spline([[0, 0], [21, 0], [21.6, 0.8], [19, 3], [12, 5], [0, 5.6]], 2).map(([r, yy]) => [r, yy + Y0]), { segs: 30, sz: 0.72 });
  S.paint(fill(0xf8f4ec, { rough: 0.3 }), proj('front', seg(-1, 1, 1, 2.4, 0.4), 0xe8a4b0));
  S.at([15, Y0 + 3.2, 8], [0.3, 0.6, 0.4], () => S.lathe(spline([[0, 0], [2.6, 0.4], [3, 1.4], [0, 2]], 2), { segs: 10 }));
  // the three of them (they hide)
  S.part('hide', { rest: 0, move: (t) => swell([0, Y0 + 5, 0], 1, 1 - 0.78 * t, 1) }, () => {
    const eel = (x, z, h, bend, col, pat, eyes) => {
      const b = Y0 + 5, path = spline([[x, Y0 + 2, z], [x, b, z], [x + bend * 0.4, b + h * 0.45, z + 0.6], [x - bend * 0.3, b + h * 0.85, z + 1.2], [x + bend * 0.3, b + h, z + 3]], 3);
      S.paint(fill(col, { rough: 0.35 }), pat, under(0.12));
      S.tube(path, (t) => (t > 0.96 ? 1.8 * Math.sqrt((1 - t) / 0.04) + 0.2 : 1.8), { sides: 10 });
      const tip = path[path.length - 1];
      S.paint(fill(col, { rough: 0.35 }), ...face({ at: [tip[0], tip[1] - 0.2], gap: 2.2, r: 0.55, eye: eyes, mouth: 'smile', mw: 1, my: 1.2, near: tip[2] - 1 }), pat);
      S.ball([tip[0], tip[1] - 0.4, tip[2] - 0.6], [2, 2.2, 2.2], { segs: 12, rings: 7 });
    };
    eel(-10, 2, 22, 3, SPOT, vol(spots(16, { y0: Y0 + 5, y1: Y0 + 30, R: 1.6, r: [0.5, 0.5, 0.5], a0: 0.4 }), EYE), 'dot');
    eel(1, -4, 30, -3, 0xf8f4ec, vol(Object.assign((px, py) => Math.abs(((py + 100) % 3) - 1.5) - 0.6, { box: [-1e4, 6, -1e4, 1e4, 100, 1e4] }), ORA), 'bead');
    eel(11, 3, 7, 1, 0xf8f4ec, vol(Object.assign((px, py) => Math.abs(((py + 100) % 3) - 1.5) - 0.6, { box: [-1e4, 6, -1e4, 1e4, 100, 1e4] }), ORA), 'sad');
  });
}

// ------------------------------------------------------------------ 3. Clione Sea Angel
export function clione(S) {
  const y0 = stand(S, 14, 0.8, 'クリオネ');
  rod(S, [0, y0 + 8, 0], y0);
  const y = y0 + 8;
  // the glassy body: head, plump torso, pointed tail; the red heart and the orange crown inside
  S.paint(fill(0xd8604a, { rough: 0.3 }), crown(0.1));
  S.ball([0, y + 13, 0], [2.6, 2.4, 2.2], { segs: 12, rings: 7 });
  S.paint(fill(0xf28a3a, { rough: 0.3 }));
  for (const s of [-1, 1]) S.ball([s * 1.6, y + 22.4, 0.6], [1, 1.4, 1], { segs: 8, rings: 5 });
  S.clear(true);
  S.paint(fill(0xe8f4f8, { rough: 0.08 }), ...face({ at: [0, y + 20.6], gap: 3.4, r: 0.6, eye: 'dot', mouth: 'smile', mw: 1.2, my: 1.6, blush: BLUSH, near: 2 }));
  S.lathe(spline([[0, 0], [1.2, 1.4], [3.2, 5], [4.6, 10], [4.4, 15], [3.8, 17.4], [4.6, 20], [3.6, 23.4], [0, 24.6]], 3).map(([r, yy]) => [r, yy + y]), { segs: 18 });
  S.clear(false);
  // the wings (they flap)
  for (const s of [-1, 1]) S.joint(s < 0 ? 'wingL' : 'wingR', { pivot: [s * 3.6, y + 15, 0], axis: 'z', min: -0.6, max: 0.6, rest: 0, g: [0, s * 0.5], idle: 0.3 }, () => {
    S.clear(true);
    S.paint(fill(0xf0f6f8, { rough: 0.08 }));
    S.at([s * 3.6, y + 15, 0], [0, 0, -s * 1.2], () => blade(S, 7.6, 5.6, 0.9, { shape: 'wing', cup: 0.8 }));
    S.clear(false);
  });
}

// ------------------------------------------------------------------ 4. Fainting Sunfish
export function manbou(S) {
  const y0 = stand(S, 22, 0.6, 'マンボウ');
  const FISH = 0x9aa8b8, BELLY = 0xe8eef2;
  // the rock it leans on
  S.paint(fill(0x8a8478, { rough: 0.85 }), proj('front', or(seg(-26, 8, -20, 10, 0.4)), tone(0x8a8478, 0.2)), crown(0.1), under(0.2));
  S.at([-17, y0, -3], null, () => S.lathe(spline([[7, 0], [6.6, 4], [4.4, 9], [0, 11]], 2), { segs: 12, sz: 0.8 }));
  // the sunfish, keeling over against it (it faints)
  S.joint('faint', { pivot: [4, y0, 0], axis: 'z', min: 0, max: 0.7, rest: 0.36, g: [0.36, 0.7] }, () => S.at([2, y0 + 17, 0], null, () => {
    const freck = or(...Array.from({ length: 12 }, (_, k) => { const a = k * GA, d = 3 + Math.sqrt(k) * 2.6; return circle(-2 + Math.cos(a) * d, Math.sin(a) * d, 0.5); }));
    S.paint(fill(FISH, { rough: 0.35 }), vol(below(-5), BELLY), proj('front', freck, tint(FISH, 0.3)), proj('back', freck, tint(FISH, 0.3)),
      proj('front', circle(7, 2.4, 2.4), 0xf8f6ee), proj('front', circle(7.5, 2.2, 1.5), EYE), proj('front', circle(7, 2.9, 0.5), 0xffffff), proj('front', ellipse(12, -1.6, 0.9, 1.1), 0x5a6070), proj('front', ellipse(8, -1.8, 1.6, 0.9), BLUSH, { alpha: 0.7 }), under(0.12));
    S.ball([0, 0, 0], [13, 12, 4.4], { segs: 22, rings: 12 });
    S.paint(fill(FISH, { rough: 0.35 }), under(0.12));
    S.ball([11.4, -1.2, 0], [3, 2.4, 2.4], { segs: 10, rings: 6 });
    S.at([0, 9, 0], [0, 0, 0.35], () => blade(S, 15, 7, 1.6, { shape: 'leaf' }));
    S.at([0, -9, 0], [0, 0, Math.PI - 0.35], () => blade(S, 14, 7, 1.6, { shape: 'leaf' }));
    // the clavus: the scalloped not-a-tail
    S.paint(fill(tone(FISH, 0.1), { rough: 0.35 }), proj('front', or(...[-1, 0, 1].map((k) => seg(-14, k * 4, -16, k * 4.6, 0.4))), tone(FISH, 0.3)));
    S.extrude([[-11, -10], [-14, -8], [-16, -5], [-15, -2], [-17, 0], [-15, 2], [-16, 5], [-14, 8], [-11, 10], [-9, 0]], -1.4, 1.4, { bevel: 0.6 });
    S.paint(fill(FISH, { rough: 0.35 }));
    S.at([5, -2, 4], [0, 0.4, Math.PI / 2 + 0.4], () => blade(S, 5, 3.6, 0.8, { shape: 'round', cup: 0.6 }));
    S.clear(true);
    S.paint(fill(0x9ad8f0, { rough: 0.05 }));
    S.at([13, 8, 3], [0, 0, -0.5], () => S.lathe(spline([[0, 0], [1.4, 0.8], [1, 2.4], [0, 3.6]], 2), { segs: 10 }));
    S.clear(false);
  }));
}

// ------------------------------------------------------------------ 5. Giant Isopod
export function gusokumushi(S) {
  const y0 = stand(S, 22, 0.7, 'グソクムシ');
  const SHELL = 0xc8c0b0, LEG = 0xb0a898;
  // the armoured back: seven plates, a tail fan
  const y = y0 + 4.4;
  S.paint(fill(SHELL, { rough: 0.35 }), proj('top', or(...[-9, -6, -3, 0, 3, 6, 9].map((z) => rbox(0, -z, 14, 0.35))), tone(SHELL, 0.3)), proj('top', or(...[-9, -6, -3, 0, 3, 6].map((z) => rbox(0, -z - 1.2, 9, 0.3))), tint(SHELL, 0.25)), under(0.25), crown(0.08));
  S.loft(spline([[-14, 0.3, 0.2], [-12, 0.86, 0.6], [-6, 1, 0.94], [2, 1, 1], [9, 0.9, 0.92], [12.6, 0.62, 0.7], [14, 0.1, 0.2]], 2).map(([z, w, h]) => ring([0, y, z], 10 * w, 1, 18, { pow: 2.2 }).map((p, i, A) => { const a = (i / A.length) * Math.PI * 2 + Math.PI / 2 - Math.PI / A.length; const sn = Math.sin(a); return [p[0], y + (sn > 0 ? sn ** 0.8 * 6.4 * h : sn * 1.6 * h), z]; })));
  S.paint(fill(SHELL, { rough: 0.35 }), proj('top', or(seg(0, 13, 0, 17, 0.3), seg(-2, 15, -4, 17.6, 0.3), seg(2, 15, 4, 17.6, 0.3)), tone(SHELL, 0.3)));
  S.at([0, y + 1, -14], [-Math.PI / 2, 0, 0], () => S.extrude([[-7, 0], [7, 0], [6, 2.6], [4, 3.6], [2.4, 5.4], [0, 4.6], [-2.4, 5.4], [-4, 3.6], [-6, 2.6]], -0.7, 0.7, { bevel: 0.3 }));
  // fourteen legs underneath
  S.paint(fill(LEG, { rough: 0.5 }));
  for (let k = 0; k < 7; k++) for (const s of [-1, 1]) { const z = -9 + k * 3; S.tube(spline([[s * 7, y + 0.4, z], [s * 9.6, y - 1.4, z + 0.6], [s * 10, y - 4.2, z + 1.2]], 2), [0.7, 0.55, 0.3], { sides: 5 }); }
  // the head: compound eyes, antennae (they twitch)
  S.paint(fill(SHELL, { rough: 0.35 }), proj('front', pair(poly([[3.4, y + 3.4], [7, y + 2], [6.4, y + 0.6], [3.6, y + 1.4]])), 0x3a3a40, { rough: 0.15 }), proj('front', pair(circle(5, y + 2.2, 0.4)), 0x8a8a90), under(0.25));
  head(S, [0, y + 1.6, 14], [8.4, 3.6, 4], { muzzle: 0.2, brow: 0.3, cheek: 0.1, chin: 0.2, pow: 2.6 });
  S.joint('feelers', { pivot: [0, y + 2.4, 17], axis: 'x', min: -0.3, max: 0.3, rest: 0, g: [0, -0.25], idle: 0.12 }, () => {
    S.paint(fill(LEG, { rough: 0.5 }));
    for (const s of [-1, 1]) S.tube(spline([[s * 1.6, y + 2.4, 17], [s * 6, y + 3.4, 24], [s * 14, y + 1.6, 27], [s * 20, y - 1.4, 24]], 3), [0.6, 0.3], { sides: 5 });
  });
  // the untouched dinner
  S.paint(fill(0xf6f4ee, { rough: 0.25 }), proj('top', stroke(circle(15, -12, 4.6), 0.4), 0x2f5aa8));
  S.lathe([[0, 0], [3.4, 0], [5.4, 1], [5, 1.2], [0, 0.6]], { segs: 18, at: [15, y0, 12] });
  S.paint(fill(0xa8b4c0, { rough: 0.3 }), proj('front', circle(18, y0 + 2.4, 0.45), EYE), under(0.2));
  S.at([15, y0 + 2, 12], [0, -0.3, 0], () => { S.ball([0, 0, 0], [4, 1.2, 1.6], { segs: 10, rings: 5 }); S.at([-4, 0, 0], [0, 0, Math.PI / 2], () => blade(S, 3, 2.4, 0.4, { shape: 'leaf' })); });
}

// ------------------------------------------------------------------ 6. Moon Jelly Tank
export function kurage(S) {
  const BRASS = 0xc8a050, TANK = 0x2a3a5a;
  // the base: dark, a blue lit band, a brass plate
  S.paint(fill(0x2a2a34, { rough: 0.4 }), outer(vol(band(4, 5), 0x6ac8f0)), proj('front', rbox(0, 2.4, 7, 1.4, 0.3), BRASS, { rough: 0.25 }), proj('front', label('AURELIA', 0, 2.4, 0.26), 0x5a4020, { hard: true }), under(0.2), ...stamp(MAKER, { c: 0x8a8aa0 }));
  S.box(-20, 0, -12, 20, 6, 12, { bevel: 0.8 });
  // gravel and a bubbler stone
  S.paint(fill(0xd8d0c0, { rough: 0.9 }), proj('top', or(...Array.from({ length: 24 }, (_, k) => { const a = k * GA, d = Math.sqrt(k + 0.5) * 3.4; return ellipse(Math.cos(a) * d * 1.4, Math.sin(a) * d * 0.7, 0.8, 0.6, a); })), 0xa8a090));
  S.box(-18.6, 6, -10.6, 18.6, 8, 10.6, { bevel: 0.4 });
  S.paint(fill(0x6a6a74, { rough: 0.8 })); S.ball([12, 8.6, -4], [2.4, 1.4, 1.6], { segs: 10, rings: 5 });
  S.clear(true);
  S.paint(fill(0xe8f4f8, { rough: 0.05 }));
  for (let k = 0; k < 6; k++) S.ball([12 + Math.sin(k) * 0.6, 12 + k * 6, -4], 0.6 + (k % 2) * 0.3, { segs: 8, rings: 5 });
  // the tank walls
  S.paint(fill(0xc8e8f0, { rough: 0.04 }));
  S.box(-19, 6, 10.4, 19, 50, 11); S.box(-19, 6, -11, 19, 50, -10.4); S.box(-19.4, 6, -11, -18.8, 50, 11); S.box(18.8, 6, -11, 19.4, 50, 11);
  S.clear(false);
  S.paint(fill(0x2a2a34, { rough: 0.4 }), proj('bottom', rbox(0, 0, 14, 6), 0x9ae0f8), under(0.2));
  S.box(-20, 50, -12, 20, 53, 12, { bevel: 0.6 });
  // three moon jellies, glassy, four rings on each bell (they drift)
  S.joint('drift', { slide: [0, 2.4, 0], min: -1, max: 1, rest: 0, g: [0, 1], idle: 0.4 }, () => {
    const jelly = (c, r, faceOn) => {
      const rings4 = or(...[0, 1, 2, 3].map((k) => stroke(circle(c[0] + Math.cos(k * Math.PI / 2 + 0.4) * r * 0.35, -c[2] + Math.sin(k * Math.PI / 2 + 0.4) * r * 0.35, r * 0.22), r * 0.08)));
      S.clear(true);
      S.paint(fill(0xe8eef8, { rough: 0.06 }), proj('top', rings4, 0xc8a8e8), faceOn ? face({ at: [c[0], c[1] + r * 0.2], gap: r * 0.5, r: r * 0.08, eye: 'dot', mouth: 'smile', mw: r * 0.16, my: r * 0.2, blush: BLUSH, near: c[2] }) : null);
      S.lathe(spline([[r, 0], [r * 0.95, r * 0.3], [r * 0.7, r * 0.62], [0, r * 0.75]], 3).map(([rr, yy]) => [rr, yy + c[1]]), { segs: 20, at: [c[0], 0, c[2]] });
      S.paint(fill(0xf0e8f8, { rough: 0.06 }));
      S.torus([c[0], c[1], c[2]], r * 0.98, r * 0.06, { segs: 20, sides: 4 });
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3; S.tube(spline([[c[0] + Math.cos(a) * r * 0.2, c[1], c[2] + Math.sin(a) * r * 0.2], [c[0] + Math.cos(a) * r * 0.3, c[1] - r * 0.6, c[2] + Math.sin(a) * r * 0.4], [c[0] + Math.cos(a + 0.5) * r * 0.3, c[1] - r * 1.2, c[2] + Math.sin(a + 0.5) * r * 0.3]], 2), r * 0.06, { sides: 4, flat: [2.4, 0.5] }); }
      S.clear(false);
    };
    jelly([-6, 32, 2], 9, true); jelly([9, 40, -3], 5.6); jelly([7, 20, 4], 4.4);
  });
}

// ------------------------------------------------------------------ 7. Dolphin Show!
export function irukashow(S) {
  const TILE = 0xf6f4ee, BLUE = 0x3a8ac8, DOL = 0x7a9ab8, BELLY = 0xe8eef2;
  // the pool: a tiled rim, the water
  S.paint(fill(TILE, { rough: 0.35 }), outer(wrap(28, repeatU(rbox(0, 0, 0.2, 40), 3.6), 0xb8c4cc)), outer(vol(band(4, 6), BLUE)), proj('top', stroke(circle(0, 0, 26.6), 0.3), 0xb8c4cc), under(0.2), ...stamp(MAKER, { c: 0x6a8aa8 }));
  S.lathe([[0, 0], [28, 0], [28.6, 0.6], [28.6, 9.4], [28, 10], [25.4, 10], [25, 9.4], [25, 8.4], [0, 8.4]], { segs: 32, sz: 0.66 });
  S.clear(true); S.paint(fill(0x6ac0e0, { rough: 0.04 })); S.lathe([[0, 8.4], [25, 8.4], [25, 9], [0, 9]], { segs: 32, sz: 0.66 }); S.clear(false);
  // the hoop on its pole
  S.paint(fill(0xf6f4ee, { rough: 0.3 }), vol(Object.assign((x, y, z) => Math.abs(((Math.atan2(y - 24, z) / Math.PI * 4 + 8) % 2) - 1) - 0.5, { box: [-1e4, -1e4, -1e4, 1e4, 1e4, 1e4] }), 0xd8302a));
  S.at([-9, 24, 0], [0, 0, -0.67], () => S.torus([0, 0, 0], 8, 0.9, { segs: 24, sides: 6 }));
  S.paint(fill(0xc8ced6, { rough: 0.25 })); S.tube([[-2.8, 8.4, 0], [-2.8, 18.6, 0]], 0.6, { sides: 6 });
  // the dolphin, arcing up out of the water (it leaps)
  S.joint('leap', { pivot: [-6, 9, 0], axis: 'z', min: -0.3, max: 0.4, rest: 0, g: [0, 0.3] }, () => {
    const path = spline([[-20, 6, 0], [-14, 16, 0], [-6, 26, 0], [4, 31, 0], [12, 30, 0]], 3);
    S.paint(fill(DOL, { rough: 0.25 }), vol(blob([-6, 22, 0], [10, 3, 4]), BELLY), under(0.1), crown(0.08));
    S.tube(path, (t) => 0.6 + 4.6 * Math.sin(Math.min(1, t * 1.05) * Math.PI) ** 0.6 * (1 - t * 0.35), { sides: 14, flat: [1, 0.86] });
    S.paint(fill(DOL, { rough: 0.25 }), proj('front', circle(9.6, 31.4, 0.8), EYE), proj('front', circle(9.4, 31.7, 0.25), 0xffffff), proj('front', arc(12, 29.6, 2.4, Math.PI * 1.1, Math.PI * 1.6, 0.35), tone(DOL, 0.4)), proj('front', ellipse(9, 29.4, 1, 0.6), BLUSH, { alpha: 0.6 }));
    S.at([13, 29.6, 0], [0, 0, -Math.PI / 2 - 0.15], () => S.lathe(spline([[1.6, 0], [1.2, 2], [0.8, 3.4], [0, 3.8]], 2), { segs: 10 }));
    S.paint(fill(DOL, { rough: 0.25 }), under(0.1));
    S.at([-2, 30, 0], [0, 0, 0.6], () => blade(S, 5, 4.4, 1.2, { shape: 'ear' }));
    for (const s of [-1, 1]) S.at([4, 26.6, s * 3], [s * 0.9, 0, -0.9], () => blade(S, 5, 3, 0.8, { shape: 'leaf' }));
    for (const s of [-1, 1]) S.at([-20, 6, 0], [s * 1.2, 0, 2.6], () => blade(S, 5.4, 4, 0.8, { shape: 'leaf' }));
    // the beach ball on its nose
    S.paint(fill(0xf6f4ee, { rough: 0.3 }), vol(Object.assign((x, y, z) => Math.abs(((Math.atan2(z, x - 17) / Math.PI * 3 + 6) % 2) - 1) - 0.5, { box: [-1e4, -1e4, -1e4, 1e4, 1e4, 1e4] }), 0xf2c23a), vol(blob([17, 35.4, 0], [1.6, 1, 1.6]), 0xd8302a));
    S.ball([17, 32.8, 0], 3.4, { segs: 16, rings: 9 });
  });
  // the splash where it left, a calf peeking up
  S.clear(true);
  S.paint(fill(0xe8f6fa, { rough: 0.05 }));
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; S.at([-19 + Math.cos(a) * 4, 9, Math.sin(a) * 3], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], () => S.lathe(spline([[1.2, 0], [0.8, 2.4], [0, 4.4]], 2), { segs: 8 })); }
  S.clear(false);
  S.paint(fill(DOL, { rough: 0.25 }), ...face({ at: [12, 12.6], gap: 2.6, r: 0.5, eye: 'dot', mouth: null, near: 10 }), under(0.1));
  S.at([12, 8.4, 9], [-0.4, 0, 0], () => { S.ball([0, 3, 0], [3, 3.6, 3], { segs: 12, rings: 7 }); S.at([0, 3.6, 2.6], [Math.PI / 2 - 0.4, 0, 0], () => S.lathe(spline([[1, 0], [0.7, 1.2], [0, 1.8]], 2), { segs: 8 })); });
}

// ------------------------------------------------------------------ 8. Gentle Jinbei-san (secret)
export function jinbei(S) {
  const BODY = 0x3a5a7a, BELLY = 0xe8eef2, DOT = 0xf2f4f0;
  // the wave base
  S.paint(fill(SEA, { rough: 0.25 }), proj('top', or(...Array.from({ length: 16 }, (_, k) => arc(-30 + (k % 8) * 8 + (k >= 8 ? 4 : 0), k >= 8 ? -6 : 6, 3.6, 0.2, Math.PI - 0.2, 0.5))), tint(SEA, 0.45)), under(0.2), ...stamp(MAKER, { c: 0xb8d8f0 }));
  S.lathe([[0, 0], [33.4, 0], [34, 0.6], [34, 3.4], [33, 4], [0, 4]], { segs: 32, sz: 0.5 });
  rod(S, [0, 14, 0], 4, 1);
  const y = 18;
  // the whale shark: a long broad body, a flat wide head, spots and stripes (its tail swishes)
  const dots = or(...Array.from({ length: 40 }, (_, k) => { const x = -20 + (k % 10) * 4.6 + (Math.floor(k / 10) % 2) * 2.3, yy = y + 1 + Math.floor(k / 10) * 1.6; return circle(x, yy, 0.6); }));
  const lines = or(...[-14, -8, -2, 4].map((x) => seg(x, y - 1, x + 1, y + 6, 0.35)));
  const skin = [fill(BODY, { rough: 0.35 }), vol(below(y - 1.6), BELLY), proj('front', dots, DOT), proj('back', dots, DOT), proj('front', lines, tint(BODY, 0.4)), proj('top', or(...Array.from({ length: 24 }, (_, k) => circle(-24 + (k % 8) * 5.6, -3 + Math.floor(k / 8) * 3, 0.6))), DOT), under(0.12)];
  S.paint(...skin);
  S.tube(spline([[26, y, 0], [16, y + 1, 0], [0, y + 1.6, 0], [-14, y + 1, 0], [-24, y + 0.6, 0]], 3), (t) => 1 + 5.8 * Math.sin(Math.min(1, 0.25 + t * 0.8) * Math.PI) ** 0.7, { sides: 16, flat: [1.35, 0.85] });
  S.paint(fill(BODY, { rough: 0.35 }), vol(below(y - 1.6), BELLY), proj('top', or(...Array.from({ length: 6 }, (_, k) => circle(22 + (k % 3) * 2, -2 + Math.floor(k / 3) * 4, 0.6))), DOT), proj('front', or(arc(30, y + 0.4, 4.4, Math.PI * 1.05, Math.PI * 1.45, 0.45)), 0x2a3a4a), proj('front', circle(27, y + 2, 0.7), EYE), proj('front', circle(26.8, y + 2.2, 0.2), 0xffffff), under(0.12));
  S.at([28, y + 0.6, 0], [0, Math.PI / 2, 0], () => head(S, [0, 0, 0], [7.4, 4, 5], { muzzle: 0.2, brow: 0.1, cheek: 0.1, chin: 0.1, pow: 2.8 }));
  S.paint(fill(BODY, { rough: 0.35 }), proj('front', dots, DOT), under(0.12));
  S.at([4, y + 6, 0], [0, 0, 0.5], () => blade(S, 8, 7, 1.4, { shape: 'leaf' }));
  S.at([-10, y + 4.4, 0], [0, 0, 0.6], () => blade(S, 4.4, 3.6, 1, { shape: 'leaf' }));
  for (const s of [-1, 1]) S.at([14, y - 3, s * 5], [s * 1.1, 0, -0.7], () => blade(S, 12, 6, 1.2, { shape: 'leaf' }));
  S.joint('tail', { pivot: [-24, y + 0.6, 0], axis: 'y', min: -0.5, max: 0.5, rest: 0, g: [0, 0.4], idle: 0.18 }, () => {
    S.paint(fill(BODY, { rough: 0.35 }), proj('front', dots, DOT), under(0.12));
    S.at([-24, y + 0.6, 0], [0, 0, 1.2], () => blade(S, 14, 6, 1.4, { shape: 'leaf' }));
    S.at([-24, y + 0.6, 0], [0, 0, 2.4], () => blade(S, 8, 4.4, 1.2, { shape: 'leaf' }));
  });
  // the passengers: a mendako on its head, a remora underneath, a little school alongside
  S.paint(fill(0xe8603a, { rough: 0.45 }), ...face({ at: [22, y + 8.4], gap: 2.4, r: 0.45, eye: 'bead', mouth: null, near: 2 }), under(0.15));
  S.lathe(spline([[3.6, 0], [3.4, 1.4], [2, 3.4], [0, 4]], 2).map(([r, yy]) => [r, yy + y + 5.4]), { segs: 14, at: [22, 0, 0] });
  for (const s of [-1, 1]) S.at([22 + s * 1.6, y + 8.8, 0], [0, 0, -s * 0.6], () => blade(S, 2, 1.8, 0.5, { shape: 'round' }));
  S.paint(fill(0x6a6a74, { rough: 0.4 }), under(0.1));
  S.at([6, y - 6.8, 0], [0, 0, 0], () => S.at([0, 0, 0], [0, Math.PI / 2, 0], () => head(S, [0, 0, 0], [1.4, 1.2, 6], { muzzle: 0.5, brow: 0, cheek: 0, chin: 0.2 })));
  for (const [k, [x, yy, z]] of [[-6, 34, 10], [-1, 36, 12], [-4, 30, 13], [2, 32, 10]].entries()) {
    rod(S, [x, yy, z], y + 4 + (k % 2), 0.3);
    S.paint(fill(0xf2c23a, { rough: 0.3 }), proj('front', circle(x + 1.6, yy + 0.3, 0.35), EYE), vol(slab(x - 0.6, x), 0x3a8ac8));
    S.at([x, yy, z], [0, 0, 0], () => { S.ball([0, 0, 0], [2.4, 1.4, 0.8], { segs: 10, rings: 5 }); S.at([-2.2, 0, 0], [0, 0, Math.PI / 2], () => blade(S, 1.8, 2, 0.4, { shape: 'round' })); });
  }
}
const slab = (x0, x1) => Object.assign((x) => Math.max(x0 - x, x - x1), { box: [x0, -1e4, -1e4, x1, 1e4, 1e4] });
