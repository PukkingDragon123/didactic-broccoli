// Konbini Life (コンビニライフ): a corner shop, open 24 hours, in your pocket. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/konbini.js. The family look: every piece stands on a length
// of the shop's white shelf with its green price rail, an orange line and a price tag; the shop's livery (KADO 24: green,
// orange, cream) runs through the packaging.
import { spline, ring, swell } from '../sculpt.js';
import { blade, eggShape } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, cut, stroke, pair, repeatU, repeatV, label, kana, below, above, band, blob, blobs,
} from '../paint.js';
import { cat, form, dense } from './neko_cafe.js';

const MAKER = 'KADO 24';
const lerp = (a, b, t) => a + (b - a) * t;
const GREEN = 0x2fae66, ORANGE = 0xf28c2e, CREAM = 0xf8f4e8, WHITE = 0xf2f2ee, INK = 0x2e2a30, BLUSH = 0xf2a0a0, RICE = 0xfaf8f0, NORI = 0x2a3a30;
const all_ = { d: () => -1, b: null };
const TOP = 4;

/** The family's shelf: white enamel, the green price rail along the front with its orange line and a price tag. */
function shelf(S, w, d, price, o = {}) {
  S.paint(fill(WHITE, { rough: 0.45 }), proj('top', or(seg(-w + 2, d - 1.4, w - 2, d - 1.4, 0.2)), tone(WHITE, 0.1)), under(0.25), ...stamp(MAKER, { c: 0x9a9a9a, px: 0.32 }));
  S.box(-w, 0, -d, w, TOP, d, { bevel: 0.6 });
  S.paint(fill(GREEN, { rough: 0.4 }), vol(band(2.4, 3), ORANGE), crown(0.1), under(0.2));
  S.box(-w - 0.2, -0.4, d - 0.2, w + 0.2, 4.4, d + 1.4, { bevel: 0.4 });
  S.paint(fill(o.tag ?? CREAM), proj('front', label(`Y${price}`, 0.6, 2.6, 0.32), INK, { hard: true }), proj('front', rbox(0, 0.9, 4, 0.35, 0), o.tagLine ?? ORANGE), proj('front', label('TAX', -3.4, 2.6, 0.16), INK, { hard: true }));
  S.box(-5, 0.2, d + 1.4, 5, 4, d + 1.8, { bevel: 0.15 });
}
/** A face for the food (kawaii, front-projected). */
const fface = (cx, cy, o = {}) => face({ at: [cx, cy], gap: o.gap ?? 7, r: o.r ?? 1.3, eye: o.eye || 'dot', mouth: o.mouth ?? 'smile', mw: o.mw ?? 2.2, blush: o.blush ?? BLUSH, near: o.near, my: o.my, view: o.view });
/** A rounded triangle (onigiri), centred on x = 0, base on y0, w wide and h tall, corners rounded by r. */
function tri(w, h, r, y0 = 0, n = 6) {
  const C = [[-w / 2 + r, y0 + r], [w / 2 - r, y0 + r], [0, y0 + h - r]], aR = Math.atan2(w / 2 - r, h - 2 * r), aL = Math.PI - aR, P = [];
  for (const [k, a0, a1] of [[0, aL, Math.PI * 1.5], [1, -Math.PI / 2, aR], [2, aR, aL]]) for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; P.push([C[k][0] + Math.cos(a) * r, C[k][1] + Math.sin(a) * r]); }
  return P;
}

// ------------------------------------------------------------------ 1. Salmon Onigiri
export function onigiri(S) {
  const SALMON = 0xf28a6a, RED = 0xd8323a;
  shelf(S, 20, 11, 130);
  // the rice, with a face
  S.paint(fill(RICE, { rough: 0.8 }), ...fface(0, TOP + 21, { near: 5, gap: 8, r: 1.4 }), proj('front', or(ellipse(-6, 28, 0.5, 0.3, 0.4), ellipse(5, 31, 0.5, 0.3, -0.3), ellipse(1, 34, 0.5, 0.3, 0.2), ellipse(-3, 23.6, 0.4, 0.25, 0.6), ellipse(7.4, 24, 0.45, 0.28, -0.4)), tone(RICE, 0.12)));
  S.extrude(tri(36, 32, 6, TOP), -6.4, 6.4, { bevel: 3 });
  // the salmon peeping out of the top
  S.paint(fill(SALMON, { rough: 0.45 }), proj('front', or(seg(-1.6, TOP + 31, 1, TOP + 33, 0.25), seg(0.6, TOP + 30.4, 2.4, TOP + 32.2, 0.25)), 0xf8c8b4));
  S.at([0, TOP + 30.6, 0.6], [0.2, 0, 0.1], () => S.ball([0, 0, 0], [3.2, 2.2, 2.6], { segs: 12, rings: 6 }));
  // the nori, kept apart by the film until you pull the tab
  S.paint(fill(NORI, { rough: 0.55 }), proj('front', or(seg(-14, TOP + 3, -9, TOP + 12, 0.25), seg(10, TOP + 2, 13, TOP + 8, 0.25)), tint(NORI, 0.12)), crown(0.1));
  S.extrude(tri(37.4, 33, 6.6, TOP - 0.2).map(([x, y]) => [x, Math.min(y, TOP + 12.4)]), -7, 7, { bevel: 1.2 });
  // the film: clear, its red tab down the middle, the label
  S.joint('tab', { slide: [0, 6, 1.6], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    S.paint(fill(RED, { rough: 0.4 }), proj('front', or(label('1', 0, TOP + 32, 0.3), label('2', 0, TOP + 18, 0.3)), 0xf6f2ea, { hard: true }));
    S.box(-1.4, TOP + 4, 6.6, 1.4, TOP + 30.6, 7.1, { bevel: 0.2 });
    S.at([0, TOP + 30.6, 6.8], [-0.7, 0, 0], () => S.box(-1.4, 0, -0.25, 1.4, 6, 0.25, { bevel: 0.2 }));
  });
  S.paint(fill(0xf6f0e0), proj('front', stroke(rbox(-8.6, TOP + 6.6, 5.4, 3.4, 0.6), 0.4), RED), proj('front', kana('鮭', -11, TOP + 6.6, 4.4), RED), proj('front', label('SALMON', -6.2, TOP + 7.8, 0.2), INK, { hard: true }), proj('front', label('Y130', -6.4, TOP + 5, 0.2), INK, { hard: true }));
  S.box(-14.2, TOP + 3, 7, -3, TOP + 10.2, 7.3);
}

// ------------------------------------------------------------------ 2. Melon Soda
export function melonsoda(S) {
  const SODA = 0x6fd86a, RED = 0xd8323a;
  shelf(S, 14, 11, 110);
  const B = TOP;
  // the soda, the paper label with its melon mascot, the glass
  S.paint(fill(SODA, { rough: 0.15 }), proj('front', or(circle(-2, B + 34, 0.6), circle(2, B + 36, 0.5), circle(0.4, B + 39, 0.4), circle(-1, B + 41, 0.35)), tint(SODA, 0.5)));
  S.lathe(dense([[0, B + 1], [7.2, B + 1], [7.4, B + 2], [7.4, B + 28], [6.4, B + 34], [3.6, B + 39], [3, B + 44]], 2), { segs: 18, cap: true });
  S.paint(
    fill(CREAM, { rough: 0.6 }), wrap(7.8, rbox(0, B + 12.5, 30, 1.3, 0), GREEN), wrap(7.8, rbox(0, B + 22, 30, 0.7, 0), ORANGE),
    wrap(7.8, circle(-3.6, B + 15.6, 4.6), 0x9ad46a), wrap(7.8, or(arc(-3.6, B + 15.6, 3.4, 0.4, 2.6, 0.3), arc(-3.6, B + 15.6, 2, 0.2, 2.9, 0.3), seg(-3.6, B + 11.2, -3.6, B + 20, 0.3), seg(-7.6, B + 15.6, 0.4, B + 15.6, 0.3)), 0x6aa84a),
    wrap(7.8, or(circle(-5.2, B + 15.4, 0.6), circle(-2, B + 15.4, 0.6)), INK), wrap(7.8, arc(-3.6, B + 14.6, 0.9, Math.PI * 1.15, Math.PI * 1.85, 0.3), INK), wrap(7.8, poly([[-4.4, B + 20.2], [-2.8, B + 20.2], [-3.6, B + 22]]), 0x8a5a3a),
    wrap(7.8, kana('メロン', 6, B + 17.4, 3.4), GREEN), wrap(7.8, kana('ソーダ', 6, B + 14, 2.6), ORANGE), wrap(7.8, label('MELON SODA', 18, B + 15.6, 0.24), INK, { hard: true }),
  );
  S.lathe([[7.75, B + 9], [7.75, B + 24]], { segs: 18, cap: false });
  S.clear(true);
  S.paint(fill(0xe4f4ea));
  S.lathe(dense([[6.4, B], [7.6, B + 0.4], [7.7, B + 1.6], [7.7, B + 28], [6.7, B + 34.4], [3.9, B + 39.4], [3.3, B + 45.4], [3.8, B + 46.4], [3.4, B + 47]], 2), { segs: 18, cap: 'bottom' });
  S.clear(false);
  // the crown cap: it pops off
  S.joint('cap', { slide: [0.6, 6, 0.4], min: 0, max: 1, rest: 0, g: [0, 1], idle: 0.03 }, () => {
    S.paint(fill(RED, { rough: 0.3 }), proj('top', stroke(circle(0, 0, 2.2), 0.3), 0xf6f2ea), proj('top', label('K', 0, 0, 0.3), 0xf6f2ea, { hard: true }), crown(0.1));
    S.lathe([[4.3, B + 46], [4.4, B + 47], [4.1, B + 48.4], [3.4, B + 48.8]], { segs: 21, cap: true });
  });
}

// ------------------------------------------------------------------ 3. Hot Canned Coffee
export function cancoffee(S) {
  const BROWN = 0x6a3a26, BEAN = 0x8a5a36;
  shelf(S, 13, 11, 130, { tag: 0xf6e0c8, tagLine: 0xd8323a });
  const B = TOP;
  S.paint(
    fill(BROWN, { rough: 0.35 }), vol(band(B + 22, B + 27), CREAM), vol(band(B + 27, B + 27.6), 0xd8b45a), vol(band(B + 21.4, B + 22), 0xd8b45a), vol(below(B + 3), 0xb8bcc4), vol(above(B + 33), 0xb8bcc4),
    wrap(9.4, ellipse(0, B + 13.4, 4.4, 5.6, 0.3), BEAN), wrap(9.4, arc(-1.4, B + 13.4, 4.2, -0.8, 0.8, 0.5), BROWN), wrap(9.4, or(circle(-1.4, B + 14.2, 0.6), circle(1.4, B + 13.4, 0.6)), INK), wrap(9.4, ellipse(0, B + 11.2, 0.8, 0.5), 0xf28a96),
    wrap(9.4, kana('コーヒー', 0, B + 24.6, 3.6), BROWN), wrap(9.4, label('HOT', 9, B + 13, 0.4), 0xf28c2e, { hard: true }), wrap(9.4, label('190G', 9, B + 9.6, 0.26), CREAM, { hard: true }),
    wrap(9.4, label('COFFEE', -14, B + 29.6, 0.3), CREAM, { hard: true }), wrap(9.4, kana('ホット', -14, B + 13, 3), 0xf28c2e),
  );
  S.lathe(dense([[6.6, B], [8.4, B + 1.2], [8.6, B + 3], [8.6, B + 31], [8, B + 33.4], [6.8, B + 34.6], [7, B + 35.2], [6.6, B + 35.4]], 2.4), { segs: 20, cap: false });
  S.paint(fill(0xc8ccd2, { rough: 0.3 }), proj('top', stroke(circle(0, 0, 5.4), 0.3), 0x9a9ea6));
  S.lathe([[6.6, B + 35.4], [6, B + 34.6]], { segs: 20, cap: 'top' });
  S.lathe([[6.6, B], [5.6, B + 1.6], [0, B + 2.2]], { segs: 20, cap: false });
  // the tab: it lifts
  S.joint('tab', { pivot: [0, B + 34.8, 0.6], axis: 'x', min: -1, max: 0, rest: 0, g: [0, -0.8], idle: 0.02 }, () => {
    S.paint(fill(0xd8dce2, { rough: 0.25 }));
    S.at([0, B + 35, 1.4], [-Math.PI / 2, 0, 0], () => S.extrude([[-1.6, 0], [1.6, 0], [1.9, 3], [1, 4.6], [-1, 4.6], [-1.9, 3]], -0.2, 0.2));
    S.cyl([0, B + 34.8, 0.6], 0.6, 0.4, { segs: 8 });
  });
}

// ------------------------------------------------------------------ 4. Konbini Oden
export function oden(S) {
  const STEEL = 0xc8ccd2, BROTH = 0xd8a85a, DAIKON = 0xe8c890, EGG = 0xb87a42, KONNYAKU = 0x8a8690, RED = 0xd8323a;
  shelf(S, 24, 15, 100);
  const B = TOP;
  // the pot: brushed steel, the front printed おでん
  S.paint(fill(STEEL, { rough: 0.3 }), proj('front', rbox(0, B + 6.8, 12, 3.6, 1), RED, { near: 12 }), proj('front', kana('おでん', -2, B + 6.8, 5), 0xf8f4e8, { near: 12 }), proj('front', circle(8, B + 6.8, 2.2), 0xf8f4e8, { near: 12 }), proj('front', label('24H', 8, B + 6.8, 0.22), RED, { near: 12, hard: true }), under(0.2), crown(0.1));
  S.box(-21, B, -12.6, 21, B + 13, 12.6, { bevel: 1 });
  S.paint(fill(BROTH, { rough: 0.15 }), proj('top', or(...[[-14, 4], [3, -7], [12, 8], [-5, 9]].map(([x, z]) => stroke(circle(x, z, 1.2), 0.3))), tint(BROTH, 0.4)));
  S.box(-19.6, B + 10.6, -11.2, 19.6, B + 11.4, 11.2);
  S.paint(fill(STEEL, { rough: 0.3 }));
  S.box(-19.6, B + 11.4, -0.4, 19.6, B + 13, 0.4); S.box(-0.4, B + 11.4, -11.2, 0.4, B + 13, 11.2); S.box(-10.4, B + 11.4, -11.2, -9.6, B + 13, 0); S.box(9.6, B + 11.4, 0, 10.4, B + 13, 11.2);
  // the stock: daikon, eggs, konnyaku, chikuwa, a skewer of tsukune
  const D = B + 12.4;
  S.paint(fill(DAIKON, { rough: 0.5 }), vol(above(D + 3.6), tint(DAIKON, 0.15)), proj('top', or(seg(-1.4, 0, 1.4, 0, 0.25), seg(0, -1.4, 0, 1.4, 0.25)), tone(DAIKON, 0.2)), ...fface(-14.4, D + 2.4, { near: 9, gap: 4.4, r: 0.8, mw: 1.4, my: 1.6 }));
  S.cyl([-14.4, D - 1, 5.6], 4.2, 4.8, { segs: 16, bevel: 0.8 });
  S.cyl([-4.6, D - 1.2, 6.2], 3.6, 4.2, { segs: 16, bevel: 0.8 });
  S.paint(fill(EGG, { rough: 0.35 }), crown(0.15), ...fface(5, D + 2.4, { near: 7, gap: 3.6, r: 0.7, mw: 1.2, my: 1.4, eye: 'closed' }));
  S.at([5, D + 2, 5.4], [Math.PI / 2 - 0.2, 0, 0], () => eggShape(S, [0, -3.4, 0], 2.8, 7));
  S.at([-14.6, D + 1, -5.6], [Math.PI / 2, 0.4, 0], () => eggShape(S, [0, -3.2, 0], 2.7, 6.6));
  S.paint(fill(KONNYAKU, { rough: 0.6 }), proj('front', or(circle(-1, 1, 0.3), circle(1.2, -0.4, 0.25), circle(0, -1.6, 0.3)), tone(KONNYAKU, 0.3)));
  S.at([14.6, D + 1.8, 6], [-0.5, 0.3, 0], () => S.extrude([[-4.4, -2.6], [4.4, -2.6], [0, 4]], -1.3, 1.3, { bevel: 0.5 }));
  S.paint(fill(0xe8c890), vol((x, y, z) => -Math.abs(Math.sin((x + 3) * 1.2)) + 0.75 - (z > -2.6 ? 0 : 1), 0xa8683a));
  S.at([-2, D + 1.2, -6.4], [0, 0, Math.PI / 2], () => S.lathe([[1.4, -7], [2.6, -6.6], [2.8, 0], [2.6, 6.6], [1.4, 7]], { segs: 14, cap: false }));
  S.paint(fill(0x8a5a3a, { rough: 0.45 }), crown(0.15));
  for (const y of [2.6, 7.2, 11.8]) S.ball([12, D + y, -5.6], [2.4, 2.1, 2.4], { segs: 10, rings: 6 });
  S.paint(fill(0xd8c08a));
  S.tube([[12, D - 1, -5.6], [12, D + 18, -5.6]], 0.35, { sides: 5 });
  // the ladle
  S.joint('ladle', { pivot: [20, B + 13.4, 10], axis: 'z', min: -0.5, max: 0.2, rest: 0, g: [0, -0.4], idle: 0.03 }, () => {
    S.paint(fill(STEEL, { rough: 0.25 }));
    S.tube([[20, B + 13.4, 10], [26, B + 27, 10]], 0.6, { sides: 6 });
    S.lathe([[0, B + 9.6], [2.6, B + 10.6], [3.4, B + 13], [3, B + 13], [2.2, B + 11], [0, B + 10.4]], { segs: 14, at: [16.8, 0, 10] });
  });
}

// ------------------------------------------------------------------ 5. Makunouchi Bento
export function bento(S) {
  const TRAY = 0x2a2830, RED = 0xb8323a;
  shelf(S, 24, 16, 498);
  const B = TOP;
  // the tray: black outside, red inside, five rooms
  S.paint(fill(TRAY, { rough: 0.35 }), vol(above(B + 1.4), RED), crown(0.06), under(0.2));
  S.box(-22, B, -14, 22, B + 1.4, 14, { bevel: 0.6 });
  S.paint(fill(TRAY, { rough: 0.35 }), proj('top', all_, RED));
  for (const [a, b, c, d] of [[-22, -14, -20.8, 14], [20.8, -14, 22, 14], [-20.8, -14, 20.8, -12.8], [-20.8, 12.8, 20.8, 14], [-2, -12.8, -1.2, 12.8], [-1.2, -0.4, 20.8, 0.4], [9.6, 0.4, 10.4, 12.8]]) S.box(a, B + 1.4, b, c, B + 6, d, { bevel: 0.2 });
  // rice, sesame, an umeboshi
  S.paint(fill(RICE, { rough: 0.8 }), proj('top', or(...[[-16, 6], [-10, -4], [-6, 8], [-14, -9], [-5, -10], [-17, 0], [-9, 3]].map(([x, z]) => ellipse(x, z, 0.4, 0.22, x))), 0x2e2a2a), ...fface(-11.4, B + 6, { near: 12, gap: 6, r: 1.2 }));
  S.box(-20.4, B + 1.4, -12.4, -2.4, B + 6.4, 12.4, { bevel: 1.6 });
  S.paint(fill(0xc8323a, { rough: 0.3 }), crown(0.15));
  S.ball([-11.4, B + 6.8, 0], [2, 1.5, 2], { segs: 10, rings: 6 });
  // grilled salmon, tamagoyaki, karaage, kamaboko, pickles, simmered vegetables
  S.paint(fill(0xf09a7a, { rough: 0.5 }), proj('top', or(seg(1, -4, 8, -6, 0.3), seg(1, -2.4, 8, -4.4, 0.3)), 0xf8d0b8), vol(above(B + 4.2), 0xd8784a));
  S.at([4.6, B + 1.4, -5.8], [0, 0.2, 0], () => S.extrude([[-4.6, 0], [4.6, 0], [4, 3], [-2, 4.2], [-4.4, 2.6]], -1.8, 1.8, { bevel: 0.5 }));
  S.paint(fill(0xf6d25a, { rough: 0.5 }), proj('front', arc(0, 0, 1.2, 0, 6.2, 0.22), tone(0xf6d25a, 0.18)));
  for (const x of [13.2, 17.6]) S.at([x, B + 1.4, -6.4], null, () => S.box(-2, 0, -4.6, 2, 3.6, 4.6, { bevel: 0.7 }));
  S.paint(fill(0xb8742e, { rough: 0.7 }), crown(0.2));
  for (const [x, z, r] of [[3.6, 4.6, 2.6], [7, 8.4, 2.4], [4, 9.4, 2.2]]) S.ball([x, B + 3, z], [r, r * 0.8, r], { segs: 10, rings: 6 });
  S.paint(fill(0xf6f0e8), vol(above(B + 3.6), 0xf28a9a));
  S.at([15.6, B + 1.4, 4.4], [0, 0.3, 0], () => S.extrude([[-2.6, 0], [2.6, 0], [2.4, 2.4], [1.4, 3.6], [-1.4, 3.6], [-2.4, 2.4]], -1, 1));
  S.paint(fill(0xe8d84a), proj('top', repeatU(rbox(0, 0, 0.2, 3, 0), 1.1), tone(0xe8d84a, 0.2)));
  S.box(13, B + 1.4, 8, 19.4, B + 3.6, 11.6, { bevel: 0.4 });
  // the tiny fish of soy sauce
  S.paint(fill(0x3a2018, { rough: 0.15 }), vol((x) => x - 18.4, 0xd8323a));
  S.at([15.4, B + 4.4, 0], [Math.PI / 2, 0, -Math.PI / 2 + 0.3], () => S.lathe(spline([[0, -3.4], [1, -2.6], [1.3, -0.4], [0.7, 1.6], [0.4, 2.2], [0.9, 3], [0, 3.2]], 2), { segs: 10, sz: 0.6 }));
  // the clear lid and its paper band
  S.rest = 0.8;
  S.joint('lid', { pivot: [0, B + 7, -15], axis: 'x', min: -1.6, max: 0, rest: 0, g: [0, -1.3] }, () => {
    S.clear(true);
    S.paint(fill(0xe4f1f2));
    S.box(-22.6, B + 6.2, -14.6, 22.6, B + 9, 14.6, { bevel: 1.4 });
    S.clear(false);
    S.paint(fill(0xf6f0e0), proj('top', kana('幕の内', 0, 2, 4.6), INK), proj('top', or(rbox(0, -2.6, 6, 0.4, 0), rbox(0, 5.6, 6, 0.4, 0)), RED), proj('top', label('Y498', 0, -4.6, 0.26), INK, { hard: true }), proj('front', rbox(0, B + 7.6, 7, 0.4, 0), RED));
    S.box(-7.4, B + 6.1, -14.8, 7.4, B + 9.2, 14.8, { bevel: 0.2 });
  });
}

// ------------------------------------------------------------------ 6. Nikuman Steamer
export function nikuman(S) {
  const RED = 0xd8423a, STEEL = 0xc8ccd2, BUN = 0xf8f4ea;
  shelf(S, 19, 13, 150);
  const B = TOP;
  // the cabinet: a red sign on top, steel frame, glass all round, two wire shelves
  S.paint(fill(STEEL, { rough: 0.3 }), crown(0.1), under(0.2));
  S.box(-16.6, B, -11, 16.6, B + 4, 11, { bevel: 0.8 });
  for (const [x, z] of [[-16, -10.4], [16, -10.4], [-16, 10.4], [16, 10.4]]) S.box(x - 0.6, B + 4, z - 0.6, x + 0.6, B + 42, z + 0.6);
  S.paint(fill(0xe0e4e8), proj('top', repeatU(rbox(0, 0, 0.2, 12, 0), 1.6), 0xa8acb4));
  S.box(-15.4, B + 21.6, -10, 15.4, B + 22.2, 10);
  S.paint(fill(RED, { rough: 0.4 }), proj('front', kana('中華まん', 0, B + 46.4, 4.6), CREAM, { near: 10 }), proj('front', or(seg(-15, B + 43.4, 15, B + 43.4, 0.4), seg(-15, B + 49.6, 15, B + 49.6, 0.4)), 0xf2c84a, { near: 10 }), proj('right', label('HOT', 0, B + 46.4, 0.4), CREAM, { hard: true }), crown(0.12), under(0.2));
  S.box(-17, B + 42, -11.4, 17, B + 51, 11.4, { bevel: 1 });
  // the buns: nikuman with its twist, an anman with its dot, pizzaman, curryman
  const bun = (x, y, z, col, o = {}) => {
    S.paint(fill(col, { rough: 0.8 }), proj('top', or(...[0, 1, 2, 3, 4, 5].map((k) => arc(x + Math.cos(k * 1.05) * 0.6, -z - Math.sin(k * 1.05) * 0.6, 2, k * 1.05 + 0.3, k * 1.05 + 1.3, 0.25))), tone(col, 0.12)), ...(o.dot ? [proj('top', circle(x, -z, 0.8), o.dot)] : []), under(0.15));
    S.lathe(spline([[0, 0], [4.4, 0.2], [5, 1.6], [4.2, 3.8], [2.2, 5.4], [0.8, 6], [0, 6.3]], 2), { segs: 16, at: [x, y, z] });
  };
  bun(-9, B + 4, -3, BUN); bun(1, B + 4, -4, BUN, { dot: 0xb8323a }); bun(10, B + 4, 2, 0xf2a85a); bun(-6, B + 4, 5, 0xf2d26a);
  bun(-9, B + 22.2, 2, BUN); bun(9, B + 22.2, -3, BUN, { dot: 0xb8323a }); bun(9, B + 22.2, 6, 0xf2a85a);
  // the one that is looking at you
  S.joint('watcher', { pivot: [-0.6, B + 22.2, 3.4], axis: 'y', min: -1.6, max: 1.6, rest: 0, g: [-0.9, 0.3], idle: 0.08 }, () => {
    S.paint(fill(BUN, { rough: 0.8 }), ...fface(-0.6, B + 26, { near: 6, gap: 4, r: 0.85, mouth: 'o', mw: 1.2, my: 2 }), under(0.15));
    S.lathe(spline([[0, 0], [4.4, 0.2], [5, 1.6], [4.2, 3.8], [2.2, 5.4], [0.8, 6], [0, 6.3]], 2), { segs: 16, at: [-0.6, B + 22.2, 3.4] });
  });
  // the steam's water tray and the glass
  S.paint(fill(0x9ad0e8, { rough: 0.1 }));
  S.box(-15.4, B + 4, -10, 15.4, B + 4.4, 10);
  S.clear(true);
  S.paint(fill(0xe4f1f2));
  S.box(-16, B + 4, 10.2, 16, B + 42, 10.6); S.box(-16, B + 4, -10.6, 16, B + 42, -10.2); S.box(-16.2, B + 4, -10.2, -15.8, B + 42, 10.2); S.box(15.8, B + 4, -10.2, 16.2, B + 42, 10.2);
  S.clear(false);
}

// ------------------------------------------------------------------ 7. Corner Konbini
export function storefront(S) {
  const BLUE = 0x3a6ab8, GLASS = 0xdcefe8, TILE = 0xd8d4cc;
  // the forecourt: tiles, a parking line, a kerb
  S.paint(fill(0x8a8890, { rough: 0.9 }), proj('top', or(seg(-26, 8, -26, 18, 0.5), seg(-10, 8, -10, 18, 0.5)), 0xf2f2ee), under(0.2), ...stamp(MAKER, { c: 0xd8d8d8, px: 0.34 }));
  S.box(-30, 0, -18, 30, 2.4, 20, { bevel: 0.6 });
  S.paint(fill(TILE, { rough: 0.8 }), proj('top', or(...[-20, -10, 0, 10, 20].map((x) => seg(x, 4, x, 16, 0.2)), seg(-28, 10, 28, 10, 0.2)), tone(TILE, 0.15)));
  S.box(-28, 2.4, -16, 28, 3.2, 4);
  // the shop: cream walls, the livery stripes, the glass front with its sliding doors
  S.paint(fill(CREAM, { rough: 0.6 }), vol(band(32, 34), GREEN), vol(band(34, 35), ORANGE), vol(band(35, 36), BLUE), shade(vol(below(6)), 0.08), under(0.2));
  for (const [a, b, c, d] of [[-27, 3.2, -24, 38], [24, 3.2, 27, 38], [-24, 31, 24, 38], [-24, 3.2, 24, 5.4]]) S.box(a, b, -16, c, d, -2);
  S.box(-27, 3.2, -16, 27, 38, -13.6);
  // inside: shelves of stock in a warm light
  S.paint(fill(0xf6f2e6), proj('front', or(...[10, 17, 24].map((y) => rbox(-12, y, 9, 2.2, 0)), ...[10, 17, 24].map((y) => rbox(13, y, 8, 2.2, 0))), 0xd8d4cc, { far: -13 }));
  S.box(-23, 5.4, -13.6, 23, 31, -13.4);
  const goods = [0xd8423a, 0x3f7fc6, 0xf2c83a, 0x5fae5a, 0xf28c2e, 0xf6f2ea];
  for (const [x0, x1] of [[-21, -3], [5, 21]]) for (const y of [10, 17, 24]) {
    S.paint(fill((x) => goods[(Math.floor((x + 40) / 1.8) + Math.round(y)) % goods.length], { rough: 0.5 }), crown(0.1));
    S.box(x0, y - 1.6, -13.4, x1, y + 1.4, -11.4);
  }
  // the glass front and the doors (they slide: いらっしゃいませ)
  S.paint(fill(0x8a8e96, { rough: 0.3 }));
  S.box(-24, 5.4, -2.6, -23, 31, -1.6); S.box(23, 5.4, -2.6, 24, 31, -1.6); S.box(-24, 30, -2.6, 24, 31, -1.6); S.box(-24, 5.4, -2.6, 24, 6.4, -1.6); S.box(-10, 5.4, -2.6, -9.2, 31, -1.6); S.box(9.2, 5.4, -2.6, 10, 31, -1.6);
  S.clear(true);
  S.paint(fill(GLASS));
  S.box(-23, 6.4, -2.3, -10, 30, -1.9); S.box(10, 6.4, -2.3, 23, 30, -1.9);
  S.clear(false);
  for (const s of [1, -1]) S.joint(`door${s}`, { slide: [s * 8, 0, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    S.paint(fill(0x8a8e96, { rough: 0.3 }), proj('front', rbox(s * 4.6, 18, 0.4, 2, 0), 0x5a5e66));
    S.box(s * 0.2, 6.4, -1.4, s * 9.2, 7.2, -0.8); S.box(s * 0.2, 29.2, -1.4, s * 9.2, 30, -0.8); S.box(s * 0.2, 6.4, -1.4, s * 0.9, 30, -0.8); S.box(s * 8.4, 6.4, -1.4, s * 9.2, 30, -0.8);
    S.clear(true);
    S.paint(fill(GLASS));
    S.box(s * 0.9, 7.2, -1.2, s * 8.4, 29.2, -1);
    S.clear(false);
  });
  // the fascia sign
  S.paint(fill(0xf8f8f4), proj('front', rbox(0, 40.6, 9, 2.6, 0.6), GREEN), proj('front', label('KADO 24', 0, 40.6, 0.4), 0xf8f8f4, { hard: true }), proj('front', star(-12, 40.6, 2.2, 5, 0.45), ORANGE), proj('front', kana('コンビニ', 14.6, 40.6, 2.8), GREEN), under(0.2), crown(0.06));
  S.box(-27.6, 38, -16.4, 27.6, 43.4, -1.4, { bevel: 0.6 });
  S.paint(fill(0x9a9ea6, { rough: 0.5 }), crown(0.1));
  S.box(-8, 43.4, -12, 0, 46.6, -6, { bevel: 0.6 });
  // the pole sign by the road, the bins, a bicycle stand
  S.paint(fill(0x8a8e96, { rough: 0.4 }));
  S.cyl([25, 2.4, 14], 0.8, 30, { segs: 10 });
  S.paint(fill(0xf8f8f4), proj('front', or(rbox(25, 39, 3.4, 3.4, 0.6)), GREEN), proj('front', label('24', 25, 39, 0.46), 0xf8f8f4, { hard: true }), proj('front', rbox(25, 34, 3.4, 0.6, 0), ORANGE), proj('front', label('OPEN', 25, 32, 0.28), INK, { hard: true }), crown(0.06), under(0.2));
  S.box(20.6, 30, 13.4, 29.4, 43.6, 14.6, { bevel: 0.4 });
  // two capsule-toy machines by the door
  for (const [x, c] of [[13.6, 0xd8423a], [19.4, 0x3f7fc6]]) {
    S.paint(fill(c, { rough: 0.4 }), proj('front', rbox(x, 9.4, 1.8, 1.4, 0.3), 0xf8f8f4), proj('front', label('Y100', x, 9.4, 0.18), INK, { hard: true }), crown(0.1), under(0.2));
    S.box(x - 2.6, 3.2, 3, x + 2.6, 13.4, 8, { bevel: 0.5 });
    S.box(x - 2.6, 19.6, 3, x + 2.6, 21, 8, { bevel: 0.5 });
    S.paint(fill(0xc8ccd2, { rough: 0.3 }));
    S.at([x, 11.4, 8], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], 1.3, 0.8, { segs: 12 }));
    for (const [dx, dy, cc] of [[-1, 15, 0xf2c83a], [1, 14.6, 0x5fae5a], [0, 16.6, 0xf28c2e], [-1.2, 17.6, 0xf6f2ea], [1.2, 17.8, 0xd8423a]]) { S.paint(fill(cc, { rough: 0.3 })); S.ball([x + dx, dy, 5.6], 1.1, { segs: 10, rings: 6 }); }
    S.clear(true); S.paint(fill(GLASS)); S.box(x - 2.4, 13.4, 3.2, x + 2.4, 19.6, 7.8); S.clear(false);
  }
  for (const [x, c, l] of [[-24.4, 0x3f7fc6, 'CAN'], [-20.2, 0x5fae5a, 'PET'], [-16, 0xf2c83a, 'BURN']]) {
    S.paint(fill(c, { rough: 0.45 }), proj('front', label(l, x, 9.4, 0.24), 0xf8f8f4, { hard: true }), proj('top', circle(x, -3.6, 1), INK), crown(0.1), under(0.2));
    S.box(x - 1.9, 3.2, 1.6, x + 1.9, 12.4, 5.6, { bevel: 0.6 });
  }
}

// ------------------------------------------------------------------ 8. Night-Shift Cat Clerk (secret)
export function nekotenin(S) {
  const ORANGE_C = 0xeda45c, DARK = 0xc8743a, STRIPE = 0x3a6ab8;
  // the counter: white, the livery stripes, a tray of fish (the accepted currency)
  S.paint(fill(WHITE, { rough: 0.5 }), vol(band(4.6, 6), GREEN), vol(band(6, 6.8), ORANGE), shade(vol(below(2)), 0.15), under(0.2), ...stamp(MAKER, { c: 0x9a9a9a, px: 0.32 }));
  S.box(-26, 0, -4, 26, 16, 8, { bevel: 0.6 });
  S.paint(fill(0xd8d4cc, { rough: 0.5 }), crown(0.05));
  S.box(-27, 16, -4.6, 27, 17.4, 9.4, { bevel: 0.5 });
  S.paint(fill(0x6a6a72), under(0.2));
  S.box(-26, 0, -16, 26, 1.2, -4);
  const T = 17.4;
  // the register: a screen, a keypad, the cash drawer
  S.paint(fill(0x3a3a42, { rough: 0.4 }), proj('top', repeatU(repeatV(rbox(0, 0, 0.6, 0.5, 0.15), 1.6), 1.6), 0x8a8e96), crown(0.08));
  S.at([-15, T, 2], [0, 0.3, 0], () => {
    S.box(-5, 0, -4, 5, 3.4, 4, { bevel: 0.6 });
    S.paint(fill(0x3a3a42, { rough: 0.4 }));
    S.box(-0.8, 3.4, -2.4, 0.8, 8, -1.2);
    S.paint(fill(0x3a3a42, { rough: 0.4 }), proj('front', rbox(0, 10.4, 3.6, 2.4, 0.3), 0x4ab89a, { near: -2 }), proj('front', label('Y180', 0, 10.8, 0.3), 0x1e3a30, { near: -2, hard: true }));
    S.at([0, 10.4, -1.4], [-0.25, 0, 0], () => S.box(-4.6, -3, -0.6, 4.6, 3, 0.6, { bevel: 0.4 }));
  });
  // the fish he is being paid in, and a rack of snacks
  S.paint(fill(0xa8b4c4, { rough: 0.3 }), vol((x) => -x - 7.6 + 4, 0x7a8698), proj('top', circle(-2.4, -3.6, 0.4), INK));
  S.at([-1, T + 1.2, 4.6], [Math.PI / 2, 0, Math.PI / 2 + 0.2], () => S.lathe(spline([[0, -6], [1.2, -4.6], [1.9, -1], [1.2, 2.6], [0.4, 4], [1.6, 5.4], [0, 5.6]], 2), { segs: 10, sz: 0.5 }));
  S.paint(fill(0x9a9ea6, { rough: 0.4 }));
  S.box(14, T, -2, 24, T + 0.6, 6);
  for (const [x, c] of [[15.6, 0xd8423a], [18.6, 0xf2c83a], [21.6, 0x3f7fc6]]) { S.paint(fill(c, { rough: 0.5 }), proj('front', circle(x, T + 4, 0.8), 0xf8f8f4), crown(0.1)); S.box(x - 1.3, T + 0.6, 0, x + 1.3, T + 7.6, 4.4, { bevel: 0.4 }); }
  // the clerk, behind the counter, scanner up
  S.at([2, 1.2, -10], null, () => {
    cat(S, {
      coat: ORANGE_C, eye: 'closed', legs: true,
      headMarks: [proj('front', or(seg(-1.7, 7.4, -1.3, 4.8, 0.75), seg(0, 8, 0, 5.2, 0.75), seg(1.7, 7.4, 1.3, 4.8, 0.75)), DARK)],
      outfit: [vol(above(9), 0xf6f6f2), vol((x, y) => (y > 9 ? Math.abs(((x + 30) % 2.4) - 1.2) - 0.45 : 1), STRIPE), proj('front', rbox(-3.4, 18.6, 2, 1.2, 0.3), 0xf8f8f4, { facing: 0.3 }), proj('front', label('NEKO', -3.4, 18.6, 0.16), INK, { hard: true, facing: 0.3 })],
      sleeve: 0xf6f6f2, arms: [[8.4, 24, 7.4], [-7, 21.4, 8.4]],
      hy: 33.4, headRot: [0, 0.2, 0.08],
    });
    // the scanner (beep)
    S.joint('scanner', { pivot: [8.4, 24, 7.4], axis: 'x', min: -0.6, max: 0.3, rest: 0, g: [0, -0.5], idle: 0.05 }, () => {
      S.paint(fill(0x3a3a42, { rough: 0.4 }), proj('front', rbox(0, 0, 1.2, 0.5, 0), 0xd8423a));
      S.at([8.6, 25.4, 9.4], [0.5, 0, 0], () => { S.box(-1.4, -1, -1, 1.4, 1.4, 4.6, { bevel: 0.5 }); S.box(-0.9, -4.6, -0.6, 0.9, -1, 1.2, { bevel: 0.4 }); });
      S.paint(fill(0xd8323a, { rough: 0.2 }));
      S.at([8.6, 25.4, 9.4], [0.5, 0, 0], () => S.box(-1.1, -0.6, 4.6, 1.1, 1, 4.9));
    });
  });
}

void swell; void blade; void form; void shade; void tint; void and; void cut; void pair; void blobs; void blob; void above; void ring; void repeatV; void EYE;
