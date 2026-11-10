// Kaiun Omamori (開運おまもり): a premium run of lucky shrine charms in deep lacquer reds and gold leaf, each on a
// black lacquer display dais. Sculpt programs in millimetres (src/figures/sculpt.js); data: src/data/series/omamori.js.
import { spline, ring, QUAL } from '../sculpt.js';
import { head, torso, paw, blade } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, label, kana, below, above, band, blob, blobs, repeatU, repeatV,
} from '../paint.js';

const MAKER = 'KAIUNDO';
const GA = 2.39996;
const LAQ = 0x1e1a1e, GOLD = 0xe2b448, RED = 0xc8202c, VERM = 0xd8482e, CREAM = 0xf6f0e2, WOOD = 0xd8b88a;
const G = (o = {}) => fill(GOLD, { rough: 0.22, ...o });
const outer = (L) => ({ ...L, prep: (ctx) => { let x = 0, z = 0; for (const p of ctx.pts) { x += p[0]; z += p[2]; } return ctx.n[0] * x + ctx.n[2] * z > 0 ? L.prep(ctx) : null; } });
/** The display dais: black lacquer in two tiers with a gold line; round (r) or square (w x d half sizes). Returns its top. */
function dais(S, w, d = null, o = {}) {
  S.paint(fill(LAQ, { rough: 0.22 }), outer(vol(band(1.6, 2.1), GOLD, { rough: 0.2 })), proj('top', d ? stroke(rbox(0, 0, w - 1.2, d - 1.2, 1), 0.4) : stroke(circle(0, 0, w - 1.2), 0.4), GOLD, { rough: 0.2 }), o.paint || null, under(0.2), ...stamp(MAKER, { c: 0xb89a5a }));
  if (d) { S.box(-w, 0, -d, w, 3.4, d, { bevel: 0.6 }); S.box(-w + 2, 3.4, -d + 2, w - 2, 4.6, d - 2, { bevel: 0.4 }); }
  else { S.lathe([[0, 0], [w - 0.6, 0], [w, 0.6], [w, 2.8], [w - 0.6, 3.4], [w - 2, 3.4], [w - 2, 4.2], [w - 2.4, 4.6], [0, 4.6]], { segs: 30 }); }
  return 4.6;
}
/** A gold tassel hanging from p (length l). */
function tassel(S, p, l, c = GOLD) {
  S.paint(fill(c, { rough: 0.35 }), proj('front', repeatU(rbox(0, 0, 0.15, 30), 0.6), tone(c, 0.25)), vol(band(p[1] - 2.4, p[1] - 1.6), tone(c, 0.3)));
  S.lathe(spline([[0.6, p[1] - 0.2], [1.1, p[1] - 1.6], [1.5, p[1] - l + 1.6], [1.6, p[1] - l]], 2), { segs: 10, at: [p[0], 0, p[2]], cap: true });
}

// ------------------------------------------------------------------ 1. Brocade Omamori
export function pouch(S) {
  const y0 = dais(S, 16);
  const BRO = 0xb8202c, PURP = 0x5a2a7a;
  // the pouch: its shoulders, the woven panel 御守, gold clouds on the brocade; a gold crest on the back
  const clouds = or(...[[-5, 10], [5, 18], [-4, 26], [5, 6], [-5, 33]].map(([x, y]) => or(arc(x, y0 + y, 1.6, 0, Math.PI, 0.45), arc(x + 2.4, y0 + y, 1.2, 0, Math.PI, 0.45), seg(x - 1.6, y0 + y, x + 4, y0 + y, 0.45))));
  S.paint(fill(BRO, { rough: 0.55 }), proj('front', clouds, GOLD, { rough: 0.3 }), proj('back', clouds, GOLD, { rough: 0.3 }), proj('front', rbox(0, y0 + 21, 4.4, 9.4, 0.4), PURP), proj('front', stroke(rbox(0, y0 + 21, 4.4, 9.4, 0.4), 0.7, 0.3), GOLD, { rough: 0.25 }),
    proj('front', kana('御', 0, y0 + 25.4, 5), GOLD, { rough: 0.25 }), proj('front', kana('守', 0, y0 + 17.6, 5), GOLD, { rough: 0.25 }), proj('back', star(0, y0 + 20, 5, 4, 0.5, 0), GOLD), proj('back', star(0, y0 + 20, 2.6, 4, 0.5, 0), BRO), under(0.15));
  S.extrude([[-8, y0 + 3], [8, y0 + 3], [8.4, y0 + 30], [5.4, y0 + 35.6], [-5.4, y0 + 35.6], [-8.4, y0 + 30]], -1.9, 1.9, { bevel: 1.1 });
  // the purple cord: a knot, a loop, two tassels down the shoulders
  S.paint(fill(PURP, { rough: 0.5 }), proj('front', repeatU(rbox(0, 0, 0.2, 40, 0, 0.6), 1.2), tint(PURP, 0.2)));
  S.at([0, y0 + 37.2, 0], [Math.PI / 2, 0, 0], () => { S.torus([-1.6, 0, 0], 1.6, 0.7, { segs: 12, sides: 5 }); S.torus([1.6, 0, 0], 1.6, 0.7, { segs: 12, sides: 5 }); });
  S.at([0, y0 + 41.4, 0], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 3.2, 0.55, { segs: 16, sides: 5 }));
  for (const s of [-1, 1]) S.tube(spline([[s * 1.6, y0 + 36, 1.6], [s * 5.4, y0 + 33, 2.6], [s * 7.4, y0 + 27, 2.6]], 2), 0.55, { sides: 5 });
  for (const s of [-1, 1]) tassel(S, [s * 7.4, y0 + 27, 2.6], 7.4, PURP);
  // its stand: a little lacquer slot block
  S.paint(fill(LAQ, { rough: 0.22 }), proj('front', rbox(0, y0 + 1.4, 6, 0.3), GOLD));
  S.box(-9.4, y0, -3.4, 9.4, y0 + 3.6, 3.4, { bevel: 0.6 });
}

// ------------------------------------------------------------------ 2. Ema Horse Plaque
export function ema(S) {
  const y0 = dais(S, 18, 10);
  const BOARD = 0xe8cfa0, CHEST = 0x9a4a2a;
  // the stand
  S.paint(fill(WOOD, { rough: 0.7 }), under(0.2));
  S.box(-12, y0, -3, -8, y0 + 3, 3, { bevel: 0.4 }); S.box(8, y0, -3, 12, y0 + 3, 3, { bevel: 0.4 });
  // the plaque (turn it round to read the wish)
  S.joint('ema', { pivot: [0, 0, 0], axis: 'y', min: 0, max: Math.PI, rest: 0, g: [0, Math.PI] }, () => {
    const y = y0 + 2, sun = circle(6, y + 15.6, 4.2);
    const horse = or(ellipse(-1.6, y + 9.6, 6, 2.6, -0.08), seg(3.4, y + 10.4, 6.6, y + 14.4, 1.7), ellipse(7.6, y + 14.6, 2.4, 1.3, -0.5), seg(-5.2, y + 8, -9.6, y + 4.8, 0.8), seg(-3.4, y + 8, -2.4, y + 4.4, 0.8), seg(1.6, y + 8, 4.2, y + 5.4, 0.8), seg(3, y + 8.6, 6.4, y + 7.6, 0.8), seg(-7.2, y + 10.4, -10.4, y + 8.4, 0.9), seg(-10.4, y + 8.4, -11, y + 6, 0.7));
    const mane = or(seg(3, y + 12, 6, y + 16, 0.7), seg(3.6, y + 11.2, 5.4, y + 15.8, 0.5));
    const wish = or(...['どうか', 'シークレットが', 'でますように'].map((t, k) => kana(t, 6 - k * 4.6, y + 10, 2.6)));
    S.paint(fill(BOARD, { rough: 0.75 }), proj('front', sun, 0xd8302a), proj('front', or(ellipse(-12, y + 2.6, 5, 2.2), ellipse(-2, y + 2.2, 7, 1.8), ellipse(10, y + 2.6, 5, 2)), 0x6a9a4a), proj('front', horse, CHEST), proj('front', mane, 0x3a2a24),
      proj('front', circle(7.8, y + 15, 0.4), 0xf6f0e2), proj('front', kana('奉納', -9.4, y + 16.4, 3.2), 0x2a2430), proj('back', { d: (u, v) => wish.d(u, v), b: wish.b }, 0x2a2430), proj('back', rbox(-9, y + 3.6, 1.6, 1.6, 0.3), 0xd8302a), under(0.15));
    S.extrude([[-15, y], [15, y], [15, y + 17], [0, y + 23.6], [-15, y + 17]], -1, 1, { bevel: 0.4 });
    S.paint(fill(0x6a4428, { rough: 0.6 }), under(0.2));
    for (const s of [-1, 1]) S.extrude([[s * 16.2, y + 16.3], [0, y + 23.4], [0, y + 25], [s * 16.2, y + 17.9]], -1.6, 1.6, { bevel: 0.3 });
    S.paint(fill(0xd8302a, { rough: 0.5 }), proj('front', repeatU(rbox(0, 0, 0.5, 40, 0, 0.6), 2), 0xf6f2ea));
    S.at([0, y + 20.6, 0], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 1.4, 0.4, { segs: 12, sides: 4 }));
    S.tube(spline([[0, y + 19.4, 1], [1.6, y + 15, 2], [2.4, y + 12, 1.6]], 2), 0.4, { sides: 5 });
    S.tube(spline([[0, y + 19.4, 1], [-1.6, y + 15.4, 2], [-1.6, y + 11.6, 1.6]], 2), 0.4, { sides: 5 });
  });
}

// ------------------------------------------------------------------ 3. Omikuji Box
export function omikuji(S) {
  const y0 = dais(S, 22, 14);
  // the red tray
  S.paint(fill(RED, { rough: 0.25 }), crown(0.08), under(0.2));
  S.box(-20, y0, -12, 20, y0 + 1.2, 12, { bevel: 0.4 });
  for (const [a, b, c, d] of [[-20, -12, 20, -11], [-20, 11, 20, 12], [-20, -11, -19, 11], [19, -11, 20, 11]]) S.box(a, y0 + 1.2, b, c, y0 + 3, d, { bevel: 0.3 });
  const t = y0 + 1.2, hex = (y, r) => ring([-6, y, -1], r, r, 6, { exact: true, pow: 2 });
  // the hexagonal box, its paper label, the lid with a brass-rimmed hole
  S.paint(fill(WOOD, { rough: 0.6 }), proj('front', or(seg(-12, t + 6, 0, t + 6.6, 0.3), seg(-12, t + 22, 0, t + 21.4, 0.3)), tone(WOOD, 0.14)), proj('front', rbox(-6, t + 14, 3.4, 7, 0.2), CREAM), proj('front', or(kana('み', -6, t + 18.2, 3.6), kana('く', -6, t + 14, 3.6), kana('じ', -6, t + 9.8, 3.6)), 0x2a2430), under(0.2));
  S.loft([hex(t, 7.6), hex(t + 26, 7.6)]);
  S.paint(fill(tone(WOOD, 0.12), { rough: 0.6 }), proj('top', circle(-6, 1, 1.4), 0x2a2018), crown(0.1));
  S.loft([hex(t + 26, 8.2), hex(t + 27.6, 8.2), hex(t + 28, 7.4)]);
  S.paint(G(), crown(0.2));
  S.torus([-6, t + 28.1, -1], 1.7, 0.4, { segs: 12, sides: 4 });
  // a stick, half out (shake it out), and the fortune: 大吉
  S.part('stick', { slide: [0, 6, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    S.paint(fill(0xead9b0, { rough: 0.7 }), proj('front', kana('三十一', 0, t + 31, 1.4), 0x2a2430));
    S.at([-6, t + 22, -1], [0.04, 0, 0.06], () => S.box(-0.7, 0, -0.35, 0.7, 12, 0.35));
  });
  S.paint(fill(0xf8f6ee, { rough: 0.85 }), proj('top', kana('大吉', 11, 0, 4.4), 0xd8302a), proj('top', or(...[0, 1, 2, 3].map((k) => rbox(7 + k * 2, -6.6, 0.25, 1.8))), 0x6a6470), proj('top', or(...[0, 1, 2, 3].map((k) => rbox(7 + k * 2, 6, 0.25, 1.4))), 0x6a6470), proj('top', stroke(rbox(11, 0, 5, 9.4, 0), 0.3, 0.6), 0xd8302a));
  S.at([11, t + 0.2, 0.4], [0, 0.2, 0], () => { S.at([0, 0, -4.8], [-0.05, 0, 0], () => S.box(-5, 0, -4.8, 5, 0.3, 4.8)); S.at([0, 0, 4.8], [0.05, 0, 0], () => S.box(-5, 0, -4.8, 5, 0.3, 4.8)); });
}

// ------------------------------------------------------------------ 4. One-Eyed Daruma
export function daruma(S) {
  const y0 = dais(S, 16);
  // he rocks back up, whatever you do
  S.joint('rock', { pivot: [0, y0, 0], axis: 'z', min: -0.5, max: 0.5, rest: 0, g: [0, 0.45], idle: 0.05 }, () => {
    const y = y0, c = y + 14;
    const brows = or(arc(-3.6, c + 5.4, 3.6, 0.5, 2.1, 1.3), arc(3.6, c + 5.4, 3.6, 1.04, 2.64, 1.3));
    const beard = or(...[-1, 1].flatMap((s) => [arc(s * 6, c - 1, 1.8, 0, Math.PI * 1.6, 0.7), arc(s * 6.6, c + 2.6, 1.4, 0, Math.PI * 1.6, 0.6), arc(s * 4.2, c - 3.6, 1.6, 0, Math.PI * 1.6, 0.7)]));
    const swirls = (s) => or(arc(s * 2, c + 2, 3, 0, 5, 0.8), arc(s * 2, c + 2, 1.4, 0, 5, 0.6), arc(s * -3, c - 4, 2, 0.4, 4, 0.7));
    const nf = { near: 6 };
    S.paint(fill(RED, { rough: 0.25 }), proj('front', ellipse(0, c + 3, 8.6, 7.4), CREAM, nf), proj('front', brows, EYE, nf), proj('front', beard, GOLD, { ...nf, rough: 0.2 }),
      proj('front', pair(circle(3.4, c + 3.8, 2.3)), 0xfdfbf6, nf), proj('front', pair(stroke(circle(3.4, c + 3.8, 2.3), 0.35)), EYE, nf), proj('front', circle(-3.4, c + 3.8, 1.7), EYE, nf), proj('front', circle(-3.9, c + 4.4, 0.45), 0xffffff, nf),
      proj('front', or(arc(0, c + 0.8, 0.9, Math.PI * 1.15, Math.PI * 1.85, 0.4), arc(-1.4, c - 1.2, 1.6, 0.25, 1.4, 0.55), arc(1.4, c - 1.2, 1.6, 1.74, 2.9, 0.55)), EYE, nf),
      proj('front', kana('福', 0, y + 6, 5), GOLD, { ...nf, rough: 0.2 }), proj('right', swirls(1), GOLD, { rough: 0.2 }), proj('left', swirls(-1), GOLD, { rough: 0.2 }), proj('back', rbox(0, c, 20, 1.2), GOLD, { rough: 0.2 }), proj('back', kana('必勝', 0, c - 5, 4.6), GOLD), under(0.25), crown(0.1));
    S.lathe(spline([[0, 0], [8, 0.4], [11.4, 3.6], [12, 9], [11, 15], [9, 19.6], [5.6, 22.6], [0, 23.8]], 3).map(([r, yy]) => [r, yy + y]), { segs: 26 });
  });
}

// ------------------------------------------------------------------ 5. Maneki-neko
export function maneki(S) {
  const y0 = dais(S, 19);
  const CAT = 0xf8f4ec, ORA = 0xe8a050, BLK = 0x3a3436, PINK = 0xf2aab0;
  // the red cushion with gold tassels
  S.paint(fill(RED, { rough: 0.7 }), proj('top', or(seg(-12, -12, 12, 12, 0.4), seg(-12, 12, 12, -12, 0.4)), tint(RED, 0.25)), vol(band(y0 + 1.8, y0 + 2.2), tone(RED, 0.25)), under(0.2));
  S.loft([[0, 0.86], [0.15, 0.98], [0.5, 1], [0.85, 0.96], [1, 0.82]].map(([t, k]) => ring([0, y0 + t * 4, 0], 14 * k, 14 * k, 24, { pow: 3.6 })));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tassel(S, [x * 12.6, y0 + 3, z * 12.6], 4);
  const y = y0 + 4;
  // the cat, sitting: calico patches, a red collar with a bell
  const patches = blobs(blob([-5, y + 12, -3], [4, 4.4, 5]), blob([5, y + 4, -4], [4.4, 3, 5]));
  S.paint(fill(CAT, { rough: 0.3 }), vol(patches, ORA), vol(blob([6, y + 14, 0], [2.4, 2.6, 6]), BLK), under(0.12), crown(0.05));
  torso(S, [0, y + 9, 0], [9.4, 9.4, 8], { belly: 0.24, hips: 1.06, sit: 0.42 });
  for (const s of [-1, 1]) paw(S, [s * 4.2, y, 5.6], 4.4, 5.6, 2.6, { toes: 3 });
  S.paint(fill(CAT, { rough: 0.3 }), vol(blob([-6, y + 3, -7], [3, 3, 3]), BLK));
  S.tube(spline([[0, y + 2, -7.4], [6, y + 1.6, -9], [9, y + 5, -8], [8, y + 8, -6.6]], 3), (t) => 1.8 - 0.5 * t, { sides: 8 });
  S.paint(fill(RED, { rough: 0.35 }), under(0.2));
  S.lathe([[6.6, y + 15.4], [6.8, y + 16.6], [6.2, y + 17.2], [6, y + 16]], { segs: 22, at: [0, 0, 0.4], sz: 0.9, cap: false });
  S.paint(G(), proj('front', seg(0, y + 13.6, 0, y + 14.4, 0.3), 0x5a3a1a), crown(0.2));
  S.ball([0, y + 14.6, 6.8], 1.5, { segs: 10, rings: 6 });
  // the koban in its right paw
  S.paint(fill(CAT, { rough: 0.3 }), under(0.12));
  S.tube(spline([[-6, y + 14, 3], [-6, y + 10, 6], [-3, y + 9, 8]], 2), 2, { sides: 8 });
  S.paint(G(), proj('front', or(kana('千', -2, y + 13.4, 2.6), kana('万', -2, y + 10, 2.6)), 0x8a6420), proj('front', or(...[0, 1, 2, 3].map((k) => seg(-4, y + 7.4 + k * 2.4, -0.2, y + 7.4 + k * 2.4, 0.2))), tone(GOLD, 0.2)), crown(0.15));
  S.at([-2, y + 11.6, 8.4], [0.1, 0, 0], () => S.at([0, 0, 0], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.5, 0], 3.4, 1, { segs: 18, sz: 1.5 })));
  // the head, then the beckoning paw (beckon)
  S.paint(fill(CAT, { rough: 0.3 }), vol(blob([-4, y + 27, 0], [4, 3, 4]), ORA), vol(blob([4.6, y + 27.4, -1], [3, 2.4, 4]), BLK), ...face({ at: [0, y + 23.4], gap: 6.4, r: 1.2, eye: 'closed', mouth: 'w', mw: 2.4, my: 3, blush: 0xf2a0a8 }),
    proj('front', pair(or(seg(3.4, y + 20.6, 8, y + 21.4, 0.25), seg(3.4, y + 19.6, 8, y + 19, 0.25))), 0x8a8488), under(0.12));
  head(S, [0, y + 23, 1], [8.6, 7.4, 7.2], { muzzle: 0.25, brow: 0.2, cheek: 0.26, chin: 0.2, pow: 2.2 });
  S.paint(fill(PINK, { rough: 0.3 }));
  S.ball([0, y + 21.8, 8.1], [1, 0.7, 0.5], { segs: 6, rings: 4 });
  for (const s of [1, -1]) { S.paint(fill(s > 0 ? BLK : ORA, { rough: 0.3 }), proj('front', ellipse(0, 3, 1.6, 2.4), PINK)); S.at([s * 5.6, y + 28, 0.6], [0, 0, -s * 0.4], () => blade(S, 6, 6.4, 1.6, { shape: 'ear', cup: 0.7 })); }
  S.joint('paw', { pivot: [6, y + 14, 2], axis: 'x', min: -0.6, max: 0.3, rest: 0, g: [0, -0.55], idle: 0.12 }, () => {
    S.paint(fill(CAT, { rough: 0.3 }), proj('front', or(ellipse(0, 0, 1.4, 1.2), circle(-1.6, 1.6, 0.6), circle(0, 2.2, 0.6), circle(1.6, 1.6, 0.6)), PINK), under(0.12));
    S.tube(spline([[6, y + 14, 2], [9, y + 19, 3], [9, y + 25, 4]], 2), [2.2, 2, 2], { sides: 8 });
    S.at([9, y + 26, 4.6], null, () => S.ball([0, 0, 0], [2.6, 2.8, 2.2], { segs: 12, rings: 7 }));
  });
}

// ------------------------------------------------------------------ 6. Inari Kitsune Guardian
export function kitsune(S) {
  const STONE = 0xa8a8a2, MOSS = 0x6a9a4a, FOX = 0xf8f4ec;
  // the plinth: three tiers of stone, moss creeping up
  for (const [k, [w, h0, h1]] of [[22, 0, 5], [18, 5, 9], [14, 9, 14]].entries()) {
    S.paint(fill(STONE, { rough: 0.85 }), proj('front', or(seg(-w, h0 + 1, -w + 6, h0 + 2.6, 0.3), arc(w - 4, h0 + 1, 3, 0.4, 2, 0.3)), tone(STONE, 0.2)), vol(blobs(blob([-w, h0, w * 0.6], [6, 2.4, 6]), blob([w * 0.7, h0, -w], [6, 2, 5])), MOSS), crown(0.08), under(0.2), k ? null : stamp(MAKER, { c: 0x6a6a64 }));
    S.box(-w, h0, -w * 0.7, w, h1, w * 0.7, { bevel: 0.7 });
  }
  const y = 14;
  // the fox: white, sitting tall, red markings, a red bib, the jewel between its paws
  S.paint(fill(FOX, { rough: 0.35 }), vol(blob([0, y + 6, 6.4], [4, 6, 3]), tint(FOX, 0.1)), under(0.15));
  torso(S, [0, y + 10, -1], [7, 10, 6.4], { belly: 0.2, hips: 1.1, sit: 0.42, lean: 1.4 });
  for (const s of [-1, 1]) { S.tube(spline([[s * 3.4, y + 14, 3], [s * 3, y + 7, 5.4], [s * 2.8, y + 1.6, 6]], 2), [1.8, 1.4, 1.3], { sides: 8 }); paw(S, [s * 2.8, y, 5.2], 3.4, 4.6, 2, { toes: 3 }); }
  for (const s of [-1, 1]) S.at([s * 6, y + 3, -2], [0, s * 0.2, 0], () => S.ball([0, 0, 0], [3, 3.2, 5.6], { segs: 12, rings: 7 }));
  S.paint(fill(RED, { rough: 0.6 }), proj('front', or(seg(-3, y + 14, 3, y + 14, 0.3)), tint(RED, 0.3)), under(0.15));
  S.at([0, y + 17, 4.4], [-0.25, 0, 0], () => S.extrude([[-5.4, 0], [5.4, 0], [0, -6.6]], -0.5, 0.5, { bevel: 0.2 }));
  S.paint(G(), proj('front', or(arc(0, y + 5.6, 1.2, 0, Math.PI, 0.3)), tint(GOLD, 0.4)), crown(0.2));
  S.lathe(spline([[0, 0], [2, 0.6], [2.6, 2.4], [1.6, 4.4], [0.4, 5.6], [0, 6.4]], 2).map(([r, yy]) => [r, yy + y + 1]), { segs: 14, at: [0, 0, 8.6] });
  // the tail sweeping up behind like a flame
  S.paint(fill(FOX, { rough: 0.35 }), vol(above(y + 30), 0xe2b448), shade(vol(blob([0, y + 20, -12], [4, 8, 3])), 0.08));
  S.tube(spline([[0, y + 3, -6], [0, y + 8, -11], [1, y + 18, -12], [0, y + 27, -9.6], [-1.6, y + 32, -8]], 3), (t) => 2 + 3.6 * Math.sin(Math.min(1, t * 1.25) * Math.PI) ** 0.8 * (1 - t * 0.4), { sides: 12 });
  // the head (it turns to watch you)
  S.joint('head', { pivot: [0, y + 20, 0], axis: 'y', min: -0.6, max: 0.6, rest: 0, g: [0, 0.5], idle: 0.06 }, () => {
    const c = [0, y + 23.6, 1.4];
    const marks = or(seg(-3.8, c[1] + 1.2, -1.4, c[1] + 0.2, 0.5), seg(3.8, c[1] + 1.2, 1.4, c[1] + 0.2, 0.5), seg(-2.6, c[1] + 2.6, -1, c[1] + 2.2, 0.4), seg(2.6, c[1] + 2.6, 1, c[1] + 2.2, 0.4));
    S.paint(fill(FOX, { rough: 0.35 }), proj('front', marks, RED, { near: 2 }), proj('front', or(seg(-2.6, c[1] + 0.8, -1.8, c[1] + 0.6, 0.35), seg(2.6, c[1] + 0.8, 1.8, c[1] + 0.6, 0.35)), EYE, { near: 2 }), proj('front', or(arc(0, c[1] - 2.6, 1.6, Math.PI * 1.2, Math.PI * 1.8, 0.35)), RED, { near: 4 }), under(0.12));
    head(S, c, [5, 5, 4.6], { muzzle: 0.15, brow: 0.3, cheek: 0.1, chin: 0.2 });
    S.paint(fill(FOX, { rough: 0.35 }), under(0.12));
    head(S, [0, c[1] - 1.8, c[2] + 4], [2.4, 2.2, 4.2], { muzzle: 0.95, brow: 0, cheek: 0, chin: 0.2, pow: 2.4 });
    S.paint(fill(EYE, { rough: 0.2 })); S.ball([0, c[1] - 1, c[2] + 8.2], [0.9, 0.7, 0.6], { segs: 6, rings: 4 });
    for (const s of [1, -1]) { S.paint(fill(FOX, { rough: 0.35 }), proj('front', ellipse(0, 3.4, 1.2, 3), RED)); S.at([s * 3, c[1] + 3.4, c[2] - 1], [0, 0, -s * 0.22], () => blade(S, 7.6, 4.4, 1.2, { shape: 'ear', cup: 0.8 })); }
  });
}

// ------------------------------------------------------------------ 7. Tiny Inari Shrine
export function jinja(S) {
  const y0 = dais(S, 30, 26, { paint: proj('top', all, 0x6a8a52) });
  const WALL = 0xf6f2e6, ROOF = 0x5a9a84, STONE = 0xb0aca4;
  // gravel path, stone steps, the platform
  S.paint(fill(0xd8d4cc, { rough: 0.9 }), proj('top', or(...Array.from({ length: 12 }, (_, k) => circle(-3 + (k % 4) * 2, -18 - Math.floor(k / 4) * 2.4 + (k % 2), 0.4))), 0xb0aca4));
  S.box(-5, y0, 6, 5, y0 + 0.4, 25);
  S.paint(fill(STONE, { rough: 0.85 }), crown(0.08), under(0.2));
  S.box(-20, y0, -18, 20, y0 + 4, 4, { bevel: 0.4 });
  for (let k = 0; k < 2; k++) S.box(-5, y0, 4 + k * 0, 5, y0 + 2.6 - k * 1.4, 6.4 + k * 2.4, { bevel: 0.3 });
  const y = y0 + 4;
  // the shrine: vermilion posts, white walls, the gold-latticed doors (open them)
  S.paint(fill(WALL, { rough: 0.8 }), under(0.2));
  S.box(-13, y, -15, 13, y + 17, -1, { bevel: 0.2 });
  S.paint(fill(VERM, { rough: 0.4 }), under(0.2));
  for (const [x, z] of [[-14, -16], [14, -16], [-14, 0], [14, 0], [-14, -8], [14, -8]]) S.cyl([x, y, z], 1.1, 18, { segs: 10 });
  S.box(-15, y + 16, -16.6, 15, y + 18, 1.4, { bevel: 0.3 });
  S.box(-15, y, -16.6, 15, y + 1.2, 1.4, { bevel: 0.2 });
  S.paint(fill(0x2a1a14, { rough: 0.8 })); S.box(-8, y + 1.2, -1.4, 8, y + 15, -1);
  const lat = and(or(repeatU(rbox(0, 0, 0.3, 40), 2), repeatV(rbox(0, 0, 40, 0.3), 2)), rbox(0, y + 8, 3.4, 6.2));
  for (const s of [-1, 1]) S.joint(s < 0 ? 'doorL' : 'doorR', { pivot: [s * 8, y, -0.4], axis: 'y', min: -1.6, max: 1.6, rest: 0, g: [0, -s * 1.4] }, () => {
    S.paint(fill(VERM, { rough: 0.4 }), proj('front', { d: (u, v) => lat.d(u - s * 4, v), b: null }, GOLD, { rough: 0.2 }), proj('front', rbox(s * 4, y + 8, 3.4, 6.2), 0x2a1a14), proj('front', { d: (u, v) => lat.d(u - s * 4, v), b: null }, GOLD, { rough: 0.2 }));
    S.box(s < 0 ? -8 : 0, y + 1.2, -1.2, s < 0 ? 0 : 8, y + 15, -0.2, { bevel: 0.2 });
  });
  // the copper roof, gold-capped logs on the ridge, crossed chigi at the ends
  S.paint(fill(ROOF, { rough: 0.45 }), proj('top', repeatU(rbox(0, 0, 0.3, 40), 2.4), tone(ROOF, 0.25)), under(0.3), crown(0.06));
  for (const s of [-1, 1]) S.at([0, y + 27, -7.6], [s * 0.72, 0, 0], () => S.box(-19, -0.8, 0, 19, 0.9, s * 15, { bevel: 0.4 }));
  S.paint(fill(ROOF, { rough: 0.45 })); S.tube([[-19, y + 27.6, -7.6], [19, y + 27.6, -7.6]], 1.4, { sides: 8 });
  for (const x of [-10, -3.4, 3.4, 10]) { S.paint(fill(0x5a3a2a, { rough: 0.6 }), vol(slabX(x - 4, x - 2.6), GOLD), vol(slabX(x + 2.6, x + 4), GOLD)); S.at([x, y + 29.2, -7.6], [0, Math.PI / 2, 0], () => S.at([0, 0, 0], [0, 0, Math.PI / 2], () => S.cyl([0, -4, 0], 1.2, 8, { segs: 10 }))); }
  S.paint(fill(0x5a3a2a, { rough: 0.6 }), vol(above(y + 32), GOLD));
  for (const x of [-18.6, 18.6]) for (const s of [-1, 1]) S.at([x, y + 27.6, -7.6], [s * 0.7, 0, 0], () => S.box(-0.5, 0, -0.8, 0.5, 7, 0.8));
  // shimenawa with its shide, the bell and its rope, the offering box
  S.paint(fill(0xd8c48a, { rough: 0.85 }), proj('front', repeatU(rbox(0, 0, 0.3, 4, 0, 0.7), 1.6), tone(0xd8c48a, 0.25)));
  S.tube(spline([[-14, y + 15.4, 2], [-7, y + 13.6, 2.6], [0, y + 13, 2.8], [7, y + 13.6, 2.6], [14, y + 15.4, 2]], 3), (t) => 1 + 0.6 * Math.sin(t * Math.PI), { sides: 8 });
  S.paint(fill(0xf8f8f4, { rough: 0.8 }));
  for (const x of [-8, 0, 8]) S.at([x, y + 12.2, 3.2], null, () => S.extrude([[-0.8, 0], [0.8, 0], [0.8, -2], [-0.2, -2], [-0.2, -3.2], [0.8, -3.2], [0.8, -5.4], [-0.8, -5.4], [-0.8, -3.6], [0.2, -3.6], [0.2, -2.4], [-0.8, -2.4]], -0.15, 0.15));
  S.paint(G(), crown(0.2)); S.ball([0, y + 11, 3.4], [1.6, 1.8, 1.6], { segs: 10, rings: 6 });
  S.paint(fill(VERM, { rough: 0.6 }), proj('front', repeatV(rbox(0, 0, 4, 0.4, 0, 0.5), 1.4), 0xf6f2ea));
  S.tube([[0, y + 9.4, 3.4], [0.4, y + 2, 3.8]], 0.5, { sides: 6 });
  S.paint(fill(0x8a6040, { rough: 0.6 }), proj('top', repeatU(rbox(0, 0, 0.3, 4), 1.2), 0x2a1a14), proj('front', kana('奉納', 0, y + 2.4, 2.2), GOLD), under(0.2));
  S.box(-5.4, y, 4.4, 5.4, y + 4.4, 9, { bevel: 0.4 });
  // two stone lanterns and the torii
  for (const s of [-1, 1]) S.at([s * 23, y0, 14], null, () => {
    S.paint(fill(STONE, { rough: 0.85 }), proj('front', rbox(0, 13.4, 1.4, 1.4), 0xf6e6a0), crown(0.08), under(0.2));
    S.cyl([0, 0, 0], 3.4, 2, { segs: 6 }); S.cyl([0, 2, 0], 1.2, 9, { segs: 8 }); S.box(-2.8, 11, -2.8, 2.8, 12, 2.8, { bevel: 0.3 }); S.box(-2.2, 12, -2.2, 2.2, 15, 2.2, { bevel: 0.2 }); S.cone([0, 15, 0], 4, 3, { segs: 6 }); S.ball([0, 18.4, 0], 0.9, { segs: 6, rings: 4 });
  });
  S.paint(fill(VERM, { rough: 0.4 }), vol(below(y0 + 2.4), EYE), under(0.2));
  for (const s of [-1, 1]) S.cyl([s * 9, y0, 21], [1.5, 1.2], 26, { segs: 12 });
  S.paint(fill(VERM, { rough: 0.4 }), vol(above(y0 + 26.6), EYE), under(0.2));
  S.tube(spline([[-14.6, y0 + 28, 21], [-6, y0 + 26.6, 21], [6, y0 + 26.6, 21], [14.6, y0 + 28, 21]], 3), 1.3, { sides: 6, flat: [1, 0.9] });
  S.box(-12, y0 + 21.4, 20.2, 12, y0 + 23.2, 21.8, { bevel: 0.3 });
  S.paint(fill(LAQ, { rough: 0.3 }), proj('front', kana('稲荷', 0, y0 + 24.6, 3), GOLD)); S.box(-1.8, y0 + 23.2, 21.6, 1.8, y0 + 26.2, 22.4);
}
const slabX = (x0, x1) => Object.assign((x) => Math.max(x0 - x, x - x1), { box: [x0, -1e4, -1e4, x1, 1e4, 1e4] });

// ------------------------------------------------------------------ 8. Golden Takarabune (secret)
export function takarabune(S) {
  const SEA = 0x2a5aa8, FOAM = 0xf2f4f0;
  // the sea: a gloss wave base with seigaiha arcs, crests curling up round the hull
  const seig = or(...Array.from({ length: 30 }, (_, k) => { const x = -30 + (k % 10) * 6.6 + (Math.floor(k / 10) % 2) * 3.3, z = -10 + Math.floor(k / 10) * 9; return or(arc(x, z, 3, 0, Math.PI, 0.35), arc(x, z, 1.8, 0, Math.PI, 0.3)); }));
  S.paint(fill(SEA, { rough: 0.25 }), proj('top', seig, tint(SEA, 0.35)), outer(vol(band(1.4, 2.2), GOLD)), under(0.2), ...stamp(MAKER, { c: 0xb8c8e8 }));
  S.lathe([[0, 0], [33.4, 0], [34, 0.6], [34, 4.4], [33, 5], [0, 5]], { segs: 32, sz: 0.62 });
  void FOAM;
  // the ship rocks on the swell
  S.joint('ship', { pivot: [0, 5, 0], axis: 'z', min: -0.2, max: 0.2, rest: 0, g: [0, 0.15], idle: 0.05 }, () => {
    const y = 5;
    // the hull: gold, a red lacquer band, waves along it
    const hull = (x) => { const t = (x + 26) / 52, w = 10 * Math.sin(Math.min(1, t * 1.1) * Math.PI) ** 0.55 + 0.5, lift = 4 * (Math.abs(t - 0.48) * 2) ** 2.2; return [w, lift]; };
    S.paint(G(), outer(vol(band(y + 6, y + 8.4), RED, { rough: 0.25 })), proj('front', or(...[-18, -10, -2, 6, 14].map((x) => arc(x, y + 4, 3, 0.2, Math.PI - 0.2, 0.5))), tone(GOLD, 0.25)), under(0.2));
    S.loft(Array.from({ length: Math.round(14 * QUAL.k) + 1 }, (_, i) => { const x = -26 + 52 * i / Math.round(14 * QUAL.k), [w, lift] = hull(x); return spline([[w * 0.2, y + 1 + lift], [w * 0.8, y + 2 + lift], [w, y + 8 + lift * 1.2], [w * 1.04, y + 11 + lift * 1.4]], 2).map(([zz, yy]) => [x, yy, zz]).concat(spline([[w * 1.04, y + 11 + lift * 1.4], [w, y + 8 + lift * 1.2], [w * 0.8, y + 2 + lift], [w * 0.2, y + 1 + lift]], 2).map(([zz, yy]) => [x, yy, -zz])); }), { caps: 'both' });
    S.paint(fill(0x8a5a2a, { rough: 0.6 }));
    S.box(-20, y + 10.8, -7.6, 20, y + 11.4, 7.6);
    // the dragon-head prow
    S.paint(G(), proj('front', or(circle(28, y + 21, 0.9)), EYE), under(0.2));
    S.tube(spline([[24, y + 10, 0], [28, y + 15, 0], [29, y + 20, 0], [32, y + 22, 0]], 3), [2.6, 2.2, 2, 1.6], { sides: 10 });
    S.at([31, y + 21.6, 0], [0, Math.PI / 2, 0], () => head(S, [0, 0, 0], [2.4, 2.4, 3.6], { muzzle: 0.8, brow: 0.6, cheek: 0.1, chin: 0.2 }));
    S.paint(fill(RED, { rough: 0.3 }));
    for (const s of [-1, 1]) S.tube(spline([[30, y + 23.6, s * 1], [28, y + 27, s * 2], [26, y + 28, s * 2.4]], 2), [0.6, 0.4, 0.2], { sides: 5 });
    // the stern cabin, the mast and its red sail
    S.paint(fill(RED, { rough: 0.25 }), proj('front', rbox(-19, y + 14.4, 2.4, 2, 0.3), GOLD), under(0.2));
    S.box(-24, y + 10, -6, -14, y + 18, 6, { bevel: 0.4 });
    S.paint(G(), proj('top', repeatU(rbox(0, 0, 0.3, 8), 1.6), tone(GOLD, 0.25)));
    S.at([-19, y + 18, 0], null, () => { S.at([0, 0, 0], [0.5, 0, 0], () => S.box(-6.4, 0, -0.5, 6.4, 0.8, 7.6)); S.at([0, 0, 0], [-0.5, 0, 0], () => S.box(-6.4, 0, -7.6, 6.4, 0.8, 0.5)); });
    S.paint(fill(0x6a4428, { rough: 0.6 }));
    S.tube([[4, y + 9, 0], [4, y + 52, 0]], 0.9, { sides: 8 });
    S.tube([[4, y + 50, -14], [4, y + 50, 14]], 0.5, { sides: 6 }); S.tube([[4, y + 24, -14], [4, y + 24, 14]], 0.5, { sides: 6 });
    S.paint(fill(0xd8302a, { rough: 0.6 }), proj('front', kana('宝', 0, y + 37, 12), GOLD, { rough: 0.25 }), proj('back', kana('宝', 0, y + 37, 12), GOLD, { rough: 0.25 }), proj('front', or(rbox(0, y + 44, 20, 0.4), rbox(0, y + 30, 20, 0.4)), tone(0xd8302a, 0.25)));
    S.at([4.6, 0, 0], [0, Math.PI / 2, 0], () => S.with({ crease: 70 }, () => { const rows = [], n = Math.round(6 * QUAL.k); for (let j = 0; j <= n; j++) { const yy = y + 24.6 + j / n * 25; rows.push([[-13.6, yy, 0], [-6, yy, 2.4 * Math.sin(j / n * Math.PI)], [0, yy, 3 * Math.sin(j / n * Math.PI)], [6, yy, 2.4 * Math.sin(j / n * Math.PI)], [13.6, yy, 0]]); } S.grid(rows, { hint: [0, 0, 1] }); S.grid(rows.map((r) => r.slice().reverse().map((p) => [p[0], p[1], p[2] - 0.4])), { hint: [0, 0, -1] }); }));
    // the cargo: koban, rice bales, coral, pearls, the money bag and the mallet
    S.paint(G(), proj('top', or(...[0, 1, 2].map((k) => seg(-1.4, k * 0.9 - 0.9, 1.4, k * 0.9 - 0.9, 0.18))), tone(GOLD, 0.25)), crown(0.15));
    for (let k = 0; k < 12; k++) { const a = k * GA, d = Math.sqrt(k + 0.5) * 1.8; S.at([8 + Math.cos(a) * d, y + 10.6 + (3.4 - d) * 0.8, Math.sin(a) * d], [0.25 * Math.cos(a), a, 0.25 * Math.sin(a)], () => S.cyl([0, 0, 0], 1.9, 0.6, { segs: 12, sz: 1.5 })); }
    S.paint(fill(0xe2c88a, { rough: 0.8 }), outer(vol(slabX(-2.6, -1.8), 0x8a6a3a)), outer(vol(slabX(1.8, 2.6), 0x8a6a3a)), proj('right', stroke(circle(0, 0, 1.2), 0.3), 0xc8a868));
    for (const [x, z, yy] of [[-6, -3, 0], [-6, 3, 0], [-6, 0, 3.6]]) S.at([x, y + 12 + yy, z], [0, 0, Math.PI / 2], () => S.lathe(spline([[1.6, -4], [2.2, -3.4], [2.4, 0], [2.2, 3.4], [1.6, 4]], 2), { segs: 12 }));
    S.paint(fill(0xd8384a, { rough: 0.4 }));
    for (const [a, b] of [[[14, y + 10, -4], [16, y + 18, -5]], [[15, y + 14, -4.6], [18, y + 17, -3]], [[15, y + 15, -4.8], [13, y + 19, -6]]]) S.tube([a, b], [0.8, 0.4], { sides: 6 });
    S.paint(fill(0xf8f4ec, { rough: 0.15 }));
    for (let k = 0; k < 4; k++) S.ball([12 + k * 1.6, y + 11, 4 + (k % 2)], 1.2, { segs: 8, rings: 5 });
    S.paint(fill(0x6a3a8a, { rough: 0.5 }), proj('front', kana('寶', 0, y + 14, 3), GOLD), vol(band(y + 16.4, y + 17.2), GOLD));
    S.lathe(spline([[0, 0], [3, 0.6], [3.6, 3], [2.4, 6], [1, 6.6], [2, 8.4], [0, 8.6]], 2).map(([r, yy]) => [r, yy + y + 10]), { segs: 14, at: [-10, 0, 4] });
    S.paint(fill(RED, { rough: 0.3 }), vol(slabZ(-0.6, 0.6), GOLD));
    S.at([0, y + 17, 4], [0.3, 0.4, 0.2], () => { S.at([0, 0, 0], [Math.PI / 2, 0, 0], () => S.cyl([0, -3, 0], 2.2, 6, { segs: 12 })); S.paint(fill(0x8a5a2a, { rough: 0.6 })); S.tube([[0, 0, 0], [0, -9, 2]], 0.7, { sides: 6 }); });
  });
}
const slabZ = (z0, z1) => Object.assign((x, y, z) => Math.max(z0 - z, z - z1), { box: [-1e4, -1e4, z0, 1e4, 1e4, z1] });
