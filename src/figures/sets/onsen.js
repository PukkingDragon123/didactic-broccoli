// Onsen Friends (おんせんどうぶつ): animals melting happily into hot springs. Clear hot water, hinoki and stone, folded
// towels on heads, eyes shut in bliss. Sculpt programs in millimetres (src/figures/sculpt.js); data: src/data/series/onsen.js.
import { spline, ring, QUAL } from '../sculpt.js';
import { head, torso, loaf, paw, blade } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, label, kana, below, above, band, blob, blobs, repeatU, repeatV,
} from '../paint.js';

const MAKER = 'YUKEMURI';
const GA = 2.39996;
const WATER = 0x9ad8dc, HINOKI = 0xecd2a4, STONE = 0x9a9890, MOSS = 0x6a9a4a, TOWEL = 0xf6f4ee, CAPY = 0xb0784a, GOLD = 0xe2b448;
const outer = (L) => ({ ...L, prep: (ctx) => { let x = 0, z = 0; for (const p of ctx.pts) { x += p[0]; z += p[2]; } return ctx.n[0] * x + ctx.n[2] * z > 0 ? L.prep(ctx) : null; } });
/** Hot water: a clear slab, top at y (a disc of radius r squashed by sz, or a box w x d). */
function water(S, y, r, o = {}) {
  S.clear(true);
  S.paint(fill(o.col ?? WATER, { rough: 0.04 }));
  if (o.box) S.box(-o.box[0], o.y0 ?? y - 4, -o.box[1], o.box[0], y, o.box[1]);
  else S.lathe([[0, o.y0 ?? y - 4], [r, o.y0 ?? y - 4], [r, y], [0, y]], { segs: o.segs ?? 28, sz: o.sz ?? 1, at: o.at });
  S.clear(false);
}
/** A folded towel (white, a blue stripe), sat on a head at c, turned by yaw. */
function towel(S, c, yaw = 0, s = 1, col = TOWEL) {
  S.paint(fill(col, { rough: 0.9 }), proj('front', rbox(0, 0.4 * s, 10, 0.35 * s), 0x5a8ac8), proj('right', rbox(0, 0.4 * s, 10, 0.35 * s), 0x5a8ac8), proj('top', or(seg(-4 * s, -2 * s, 4 * s, -2 * s, 0.25), seg(-4 * s, 1.6 * s, 4 * s, 1.4 * s, 0.25)), tone(col, 0.12)), under(0.15));
  S.at(c, [0.08, yaw, -0.06], () => S.box(-4.6 * s, -0.6 * s, -3.2 * s, 4.6 * s, 1.4 * s, 3.2 * s, { bevel: 0.9 * s }));
}
/** A capybara's head: boxy, a long blunt snout, small round ears, eyes shut in bliss. s: scale, col: its fur. */
function capyHead(S, c, s = 1, col = CAPY, o = {}) {
  const lid = (sd) => arc(-(c[2] + 0.6 * s), c[1] + 2.4 * s, 1.1 * s, Math.PI * 1.15, Math.PI * 1.85, 0.5 * s);
  S.paint(fill(col, o.rough ? { rough: o.rough } : { rough: 0.85 }), proj('right', lid(1), tone(col, 0.6), { near: c[0] }), proj('left', { d: (u, v) => lid(-1).d(-u, v), b: null }, tone(col, 0.6), { near: -c[0] }),
    proj('front', or(ellipse(c[0] - 1.6 * s, c[1] - 1.4 * s, 0.9 * s, 0.6 * s, 0.4), ellipse(c[0] + 1.6 * s, c[1] - 1.4 * s, 0.9 * s, 0.6 * s, -0.4)), tone(col, 0.55), { near: c[2] + 5 * s }),
    proj('front', arc(c[0], c[1] - 1.6 * s, 1.6 * s, Math.PI * 1.25, Math.PI * 1.75, 0.35 * s), tone(col, 0.5), { near: c[2] + 5 * s }), o.blush ? proj('right', ellipse(-(c[2] + 3 * s), c[1] - 0.4 * s, 1.4 * s, 0.8 * s), 0xe89a80, { alpha: 0.6 }) : null, under(0.15), crown(0.08));
  head(S, c, [5 * s, 4.8 * s, 7.4 * s], { muzzle: 0.9, brow: 0.2, cheek: 0.12, chin: 0.25, pow: 2.8, crown: 0.95 });
  S.paint(fill(tone(col, 0.15), o.rough ? { rough: o.rough } : { rough: 0.85 }), proj('front', ellipse(0, 1.4 * s, 0.8 * s, 1 * s), tone(col, 0.4)));
  for (const sd of [1, -1]) S.at([c[0] + sd * 3.6 * s, c[1] + 4 * s, c[2] - 2.6 * s], [-0.2, sd * 0.4, -sd * 0.3], () => blade(S, 2.6 * s, 2.8 * s, 0.8 * s, { shape: 'round', cup: 0.6 * s }));
}

// ------------------------------------------------------------------ 1. Yuzu-yu Capybara
export function yuzucapy(S) {
  // the wooden tub: staves and two copper hoops
  S.paint(fill(HINOKI, { rough: 0.75 }), outer(wrap(20, repeatU(rbox(0, 0, 0.25, 40), 3.6), tone(HINOKI, 0.15))), outer(vol(band(3, 4.6), 0xb8784a, { rough: 0.35 })), outer(vol(band(12.6, 14.2), 0xb8784a, { rough: 0.35 })), proj('top', all, tint(HINOKI, 0.12)), under(0.2), ...stamp(MAKER, { c: 0x8a6a3a }));
  S.lathe([[0, 0], [19, 0], [19.4, 0.6], [20.4, 18], [19.8, 18.6], [18.4, 18.6], [17.8, 18], [17, 2.6], [0, 2.6]], { segs: 32 });
  const wl = 15.4;
  // the capybara, up to its shoulders, a towel on its head
  S.paint(fill(CAPY, { rough: 0.85 }), under(0.15));
  loaf(S, [0, wl - 5, -2], [9, 6.4, 11], { flat: 0.8 });
  capyHead(S, [0, wl + 5.4, 6.2], 1.05);
  towel(S, [0, wl + 10.6, 3.6], 0.15);
  water(S, wl, 17.6, { y0: 2.6 });
  // the yuzu bobbing round it
  const yuzu = (x, z, r, leaf) => {
    S.paint(fill(0xf2c230, { rough: 0.5 }), proj('top', circle(x, -z, 0.5), 0x8a8a3a), crown(-0.1));
    S.ball([x, wl + r * 0.15, z], [r, r * 0.86, r], { segs: 14, rings: 8 });
    if (leaf) { S.paint(fill(0x4a8a3a, { rough: 0.4 }), proj('top', seg(0, 0, 0, 3, 0.2), 0x8ac06a)); S.at([x, wl + r * 0.95, z], [-1.3, 0.6, 0], () => blade(S, 3.6, 2.4, 0.4, { shape: 'leaf', cup: 0.5 })); }
  };
  yuzu(-11, 8, 3, true); yuzu(11, 6, 2.8); yuzu(-9, -9, 2.6); yuzu(12, -8, 2.9, true);
  S.joint('yuzu', { slide: [0, 1.2, 0], min: -1, max: 1, rest: 0, g: [0, 1], idle: 0.7 }, () => yuzu(4, 13, 2.7, true));
}

// ------------------------------------------------------------------ 2. Snow Monkey Soak
export function saru(S) {
  const FUR = 0xb4a490, FACE = 0xe88a80, SNOW = 0xf8f8f6;
  S.paint(fill(0x5a6a4a, { rough: 0.9 }), under(0.2), ...stamp(MAKER, { c: 0xb8c0a8 }));
  S.lathe([[0, 0], [25, 0], [25.6, 0.8], [25, 2.6], [0, 2.6]], { segs: 30, sz: 0.85 });
  // the rocks round the pool, snow on their tops
  const rocks = [[-18, 6, 7, 5], [-12, -12, 8, 6], [2, -17, 9, 7], [16, -10, 7, 6], [19, 6, 6, 5], [8, 15, 6, 4], [-8, 16, 6, 4.4]];
  for (const [k, [x, z, r, h]] of rocks.entries()) {
    S.paint(fill(STONE, { rough: 0.85 }), vol(above(2.6 + h * 1.3), SNOW, { rough: 0.6 }), vol(below(3.3), tone(MOSS, 0.3)), proj('front', or(seg(x - r * 0.6, 3 + h * 0.6, x + r * 0.2, 2.6 + h, 0.35)), tone(STONE, 0.2)), under(0.15));
    S.at([x, 2.6, z], [0, k * 1.3, 0], () => S.lathe(spline([[r, 0], [r * 1.02, h * 0.5], [r * 0.8, h * 1.3], [r * 0.4, h * 1.7], [0, h * 1.8]], 2), { segs: 12, sz: 0.8 }));
  }
  S.paint(fill(SNOW, { rough: 0.6 }));
  S.ball([20, 2.6 + 5 * 1.8 + 1.6, 6], 1.8, { segs: 10, rings: 6 });
  // the monkey: a fluffy head over the water, red face, hands on the rock
  const wl = 8;
  S.paint(fill(FUR, { rough: 0.9 }), under(0.12));
  torso(S, [0, wl - 2, -1], [8, 7, 7], { belly: 0.1, sit: 0.4 });
  S.joint('head', { pivot: [0, wl + 4, 0], axis: 'z', min: -0.3, max: 0.3, rest: 0, g: [0, 0.25], idle: 0.05 }, () => {
    const c = [0, wl + 9, 1];
    S.paint(fill(FUR, { rough: 0.9 }), proj('front', or(...Array.from({ length: 10 }, (_, k) => { const a = Math.PI * (0.1 + k * 0.09); return seg(Math.cos(a) * 6.4, c[1] + Math.sin(a) * 6.4, Math.cos(a) * 7.4, c[1] + Math.sin(a) * 7.6, 0.3); })), tone(FUR, 0.2)), under(0.12));
    head(S, c, [7, 6.6, 6.4], { muzzle: 0.05, brow: 0.3, cheek: 0.3, chin: 0.2 });
    S.paint(fill(FACE, { rough: 0.6 }), ...face({ at: [0, c[1] + 0.4], gap: 3.4, r: 0.7, eye: 'closed', mouth: 'smile', mw: 1.6, my: 2.6, col: 0x4a2a2a }), proj('front', or(circle(-0.5, c[1] - 1, 0.3), circle(0.5, c[1] - 1, 0.3)), 0x8a4a4a));
    head(S, [0, c[1] - 0.4, c[2] + 3.4], [4.6, 4.4, 3.2], { muzzle: 0.3, brow: 0.3, cheek: 0.1, chin: 0.2 });
    towel(S, [0, c[1] + 6.4, c[2] - 0.6], -0.12, 1);
    S.paint(fill(FACE, { rough: 0.6 }));
    for (const s of [-1, 1]) S.ball([s * 6.8, c[1], c[2] - 0.4], [0.8, 1.6, 1.2], { segs: 8, rings: 5 });
  });
  S.paint(fill(FUR, { rough: 0.9 }));
  for (const s of [-1, 1]) S.tube(spline([[s * 6, wl - 1, 2], [s * 8, wl + 1, 8], [s * 7, wl + 1.6, 13]], 2), 1.8, { sides: 8 });
  S.paint(fill(FACE, { rough: 0.6 }));
  for (const s of [-1, 1]) S.at([s * 7, wl + 1.6, 14], null, () => S.ball([0, 0, 0], [1.8, 0.9, 2.2], { segs: 8, rings: 5 }));
  water(S, wl, 16, { y0: 2.6, sz: 0.85 });
}

// ------------------------------------------------------------------ 3. Bath Pail Penguin
export function penguin(S) {
  const BLACK = 0x2e3440, BELLY = 0xf6f4ee, FEET = 0xf0a0a0, PAIL = 0xf2c830, TOWELP = 0xf4a0b4;
  // the sunoko duckboard
  S.paint(fill(HINOKI, { rough: 0.8 }), proj('front', repeatU(rbox(0, 0, 0.25, 4), 6), tone(HINOKI, 0.3)), under(0.2), ...stamp(MAKER, { c: 0x8a6a3a }));
  for (let k = 0; k < 7; k++) S.box(-22 + k * 6.3, 2, -16, -17.4 + k * 6.3, 3.6, 16, { bevel: 0.4 });
  S.paint(fill(tone(HINOKI, 0.1), { rough: 0.8 }));
  for (const z of [-12, 12]) S.box(-22, 0, z - 1.4, 22, 2, z + 1.4, { bevel: 0.3 });
  const y = 3.6;
  // the penguin: black back, white front, white eye-rings, pink feet
  S.paint(fill(BLACK, { rough: 0.4 }), vol(blob([-8, y + 14, 4.4], [6, 11, 3.6]), BELLY), under(0.12), crown(0.06));
  S.at([-8, 0, 0], null, () => S.lathe(spline([[0.1, y], [5, y + 0.6], [7.4, y + 6], [7.6, y + 12], [6.4, y + 18], [4.6, y + 21.6], [2, y + 23], [0, y + 23.2]], 3), { segs: 22, sz: 0.85 }));
  S.paint(fill(BLACK, { rough: 0.4 }), proj('front', pair(stroke(circle(2.2, y + 25.6, 1.3), 0.6)), BELLY), proj('front', pair(circle(2.2, y + 25.6, 0.7)), EYE), under(0.1));
  head(S, [-8, y + 25, 0.6], [5.4, 5.2, 5], { muzzle: 0.1, brow: 0.2, cheek: 0.2, chin: 0.1 });
  S.paint(fill(0x2a2a2e, { rough: 0.3 }));
  S.at([-8, y + 24, 5.6], [Math.PI / 2 - 0.3, 0, 0], () => S.cone([0, 0, 0], 1.2, 2.6, { segs: 8 }));
  S.paint(fill(FEET, { rough: 0.5 }));
  for (const s of [-1, 1]) paw(S, [-8 + s * 2.6, y, 4], 3.2, 4.6, 1.4, { toes: 3 });
  // the towel scarf
  S.paint(fill(TOWELP, { rough: 0.9 }), proj('front', repeatU(rbox(0, 0, 0.2, 10), 1.6), tone(TOWELP, 0.12)), under(0.15));
  S.lathe([[5.6, y + 18], [6, y + 19.6], [5.2, y + 21], [4.8, y + 19.4]], { segs: 20, at: [-8, 0, 0.4], sz: 0.9, cap: false });
  S.tube(spline([[-4, y + 19, 4.4], [-3, y + 15, 6], [-3.4, y + 11, 6.4]], 2), 1.2, { sides: 6, flat: [1.6, 0.5] });
  // flippers reaching for the pail (flap)
  for (const s of [-1, 1]) S.joint(s < 0 ? 'flipL' : 'flipR', { pivot: [-8 + s * 6.4, y + 17, 0], axis: 'z', min: -0.6, max: 0.6, rest: 0, g: [0, s * 0.5], idle: 0.1 }, () => {
    S.paint(fill(BLACK, { rough: 0.4 }), under(0.12));
    S.at([-8 + s * 6.6, y + 17, 0.4], [0, s * 0.3, Math.PI + s * 0.35], () => S.at([0, 0, 0], [0, Math.PI / 2, 0], () => blade(S, 10, 4.4, 1.4, { shape: 'wing', cup: 0.4 })));
  });
  // the yellow pail: soap, shampoo, a hand towel
  S.paint(fill(PAIL, { rough: 0.35 }), outer(vol(band(y + 7, y + 8), tone(PAIL, 0.15))), proj('top', all, tint(PAIL, 0.1)), under(0.2));
  S.lathe([[0, y], [6.4, y], [6.8, y + 0.6], [7.8, y + 9.6], [7.2, y + 9.6], [6.2, y + 1.4], [0, y + 1.4]], { segs: 22, at: [10, 0, 2] });
  S.paint(fill(0xf8f4f0, { rough: 0.4 }), proj('top', kana('せっけん', 7, 0, 1.4), 0x8ac0d8));
  S.box(4, y + 1.4, -2, 10, y + 4, 2, { bevel: 1 });
  S.paint(fill(0x8ac8a8, { rough: 0.3 }), proj('front', rbox(13, y + 7, 1.6, 2.4, 0.4), 0xf8f4f0), proj('front', kana('ゆ', 13, y + 7, 2.4), 0x3a8a6a));
  S.lathe([[0, y + 1.4], [2.4, y + 1.4], [2.6, y + 10], [1.4, y + 11.4], [0, y + 11.4]], { segs: 14, at: [13, 0, 3] });
  S.paint(fill(0xf8f4f0, { rough: 0.4 }));
  S.cyl([13, y + 11.4, 3], 0.7, 1.6, { segs: 8 }); S.tube([[13, y + 12.8, 3], [13, y + 12.8, 5.6]], 0.35, { sides: 5 });
  towel(S, [10, y + 10.4, 0], 0.4, 0.8, 0xa8d8f0);
}

// ------------------------------------------------------------------ 4. Coffee Milk Tanuki
export function tanukimilk(S) {
  const FUR = 0x9a7a5a, MASK = 0x3a3036, CREAM = 0xf2e6cc, YUKATA = 0xf4f2ec, INDIGO = 0x3a4a8a;
  // the changing room floor
  S.paint(fill(0xc89a64, { rough: 0.6 }), proj('top', repeatV(rbox(0, 0, 40, 0.25), 6.4), tone(0xc89a64, 0.25)), under(0.2), ...stamp(MAKER, { c: 0x6a4a2a }));
  S.box(-20, 0, -16, 20, 3, 16, { bevel: 0.5 });
  const y = 3;
  // feet, the yukata (a pattern of indigo wells), the obi, the bushy tail
  S.paint(fill(MASK, { rough: 0.8 }));
  for (const s of [-1, 1]) paw(S, [s * 3.6, y, 2], 3.6, 5, 2, { toes: 3 });
  S.paint(fill(FUR, { rough: 0.9 }), vol(above(y + 9), MASK));
  S.tube(spline([[0, y + 8, -5], [-3, y + 5, -10], [-6, y + 4, -12], [-8, y + 6, -13]], 3), (t) => 2.4 + 2 * Math.sin(t * Math.PI), { sides: 10 });
  const igeta = or(...Array.from({ length: 10 }, (_, k) => { const a = k * GA, x = Math.cos(a) * (2 + k * 0.6), yy = y + 9 + Math.sin(a) * 6; return or(seg(x - 1, yy - 0.4, x + 1, yy - 0.4, 0.25), seg(x - 1, yy + 0.4, x + 1, yy + 0.4, 0.25), seg(x - 0.4, yy - 1, x - 0.4, yy + 1, 0.25), seg(x + 0.4, yy - 1, x + 0.4, yy + 1, 0.25)); }));
  S.paint(fill(YUKATA, { rough: 0.85 }), proj('front', igeta, INDIGO), proj('back', igeta, INDIGO), proj('right', igeta, INDIGO), proj('left', igeta, INDIGO), vol(band(y + 12, y + 15), 0x8a3a3a), proj('front', or(seg(-4, y + 22, 1, y + 15, 0.5)), INDIGO), under(0.15));
  S.lathe(spline([[6.4, y + 2.4], [6.6, y + 8], [7.4, y + 13], [7, y + 19], [5, y + 22.4], [0, y + 23]], 2), { segs: 20, sz: 0.85 });
  S.paint(fill(CREAM, { rough: 0.8 }));
  S.at([0, y + 19, 5.2], [-0.25, 0, 0], () => S.extrude([[-2.4, 3], [2.4, 3], [0, -2.6]], -0.3, 0.3));
  // the towel round the neck
  towel(S, [0, y + 21.6, 0], 0, 0.1);
  S.paint(fill(TOWEL, { rough: 0.9 }), proj('front', rbox(0, y + 17, 10, 0.4), 0x5a8ac8), under(0.15));
  S.lathe([[5.6, y + 21], [6.2, y + 22.4], [5.2, y + 23.6], [4.6, y + 22]], { segs: 20, sz: 0.9, cap: false });
  for (const s of [-1, 1]) S.tube(spline([[s * 3.4, y + 22, 4.4], [s * 3.8, y + 18, 5.6], [s * 3.6, y + 14, 6]], 2), 1, { sides: 6, flat: [1.8, 0.5] });
  // the head, tipped back, eyes shut; the mask, the cream muzzle
  const c = [0, y + 28, 0];
  S.at(c, [-0.35, 0, 0], () => {
    S.paint(fill(FUR, { rough: 0.9 }), vol(blobs(blob([-2.6, 0.6, 4], [2.6, 1.8, 2]), blob([2.6, 0.6, 4], [2.6, 1.8, 2])), MASK), vol(blob([0, -2.2, 5], [3, 2.2, 2]), CREAM), proj('front', pair(arc(2.6, 1.4, 1.2, Math.PI * 1.15, Math.PI * 1.85, 0.45)), CREAM), under(0.12));
    head(S, [0, 0, 0], [6.4, 5.6, 5.6], { muzzle: 0.45, brow: 0.25, cheek: 0.35, chin: 0.2 });
    S.paint(fill(MASK, { rough: 0.3 })); S.ball([0, -1, 6.6], [1.1, 0.8, 0.7], { segs: 8, rings: 4 });
    for (const s of [1, -1]) { S.paint(fill(MASK, { rough: 0.85 }), proj('front', ellipse(0, 1.8, 1.2, 1.4), CREAM)); S.at([s * 4.2, 3.6, -0.8], [0, 0, -s * 0.5], () => blade(S, 3.6, 4.4, 1.2, { shape: 'round', cup: 0.6 })); }
  });
  // hand on hip: the left arm in its wide sleeve
  S.paint(fill(YUKATA, { rough: 0.85 }), proj('front', igeta, INDIGO), under(0.15));
  S.tube(spline([[-5.4, y + 20, 0], [-9, y + 16, 1], [-7, y + 12.6, 2]], 2), [2.4, 3, 2.4], { sides: 8 });
  S.paint(fill(MASK, { rough: 0.85 })); S.ball([-6.4, y + 12.6, 2.4], 1.6, { segs: 8, rings: 5 });
  // the right arm, the bottle tipped up to the mouth (drink up)
  S.joint('arm', { pivot: [5.4, y + 20, 0], axis: 'x', min: -0.6, max: 0.6, rest: 0, g: [0.45, 0] }, () => {
    S.paint(fill(YUKATA, { rough: 0.85 }), proj('front', igeta, INDIGO), under(0.15));
    S.tube(spline([[5.4, y + 20, 0], [8.6, y + 24, 2.6], [6, y + 28.4, 5]], 2), [2.4, 2.6, 2], { sides: 8 });
    S.paint(fill(MASK, { rough: 0.85 })); S.ball([5, y + 29, 5.6], 1.6, { segs: 8, rings: 5 });
    S.at([3, y + 32.6, 6.4], [-0.6, 0, 0.5], () => {
      S.clear(true);
      S.paint(fill(0xe8f0f0, { rough: 0.05 }));
      S.lathe([[0, 0], [2, 0], [2.2, 4], [1.4, 6.4], [1.2, 8.2], [1.4, 8.6], [0, 8.6]], { segs: 14 });
      S.clear(false);
      S.paint(fill(0xb8845a, { rough: 0.3 }), wrap(1.9, kana('コーヒー', 0, 2.4, 1.2), 0x6a3a1a));
      S.lathe([[0, 0.2], [1.9, 0.2], [2, 3.8], [0, 3.8]], { segs: 14 });
      S.paint(fill(0xf6f2e6, { rough: 0.6 }), proj('top', circle(0, 0, 0.6), 0xd8302a));
      S.cyl([0, 8.4, 0], 1.5, 0.6, { segs: 12 });
    });
  });
}

// ------------------------------------------------------------------ 5. Hinoki Tub Frog
export function kaeru(S) {
  const FROG = 0x7ac04a, BELLY = 0xf2eab8, SPOT = 0x4a8a3a;
  const T = 2.6, W = 18, D = 14, H = 18;
  const boards = or(seg(-40, 6, 40, 6, 0.25), seg(-40, 12, 40, 12, 0.25));
  S.paint(fill(HINOKI, { rough: 0.75 }), proj('front', boards, tone(HINOKI, 0.15)), proj('right', boards, tone(HINOKI, 0.15)), proj('left', boards, tone(HINOKI, 0.15)), proj('top', all, tint(HINOKI, 0.12)), under(0.2), ...stamp(MAKER, { c: 0x8a6a3a }));
  S.box(-W, 0, -D, W, 2.4, D, { bevel: 0.4 });
  S.box(-W, 0, D - T, W, H, D, { bevel: 0.4 }); S.box(-W, 0, -D, W, H, -D + T, { bevel: 0.4 });
  S.box(-W, 0, -D + T, -W + T, H, D - T, { bevel: 0.4 }); S.box(W - T, 0, -D + T, W, H, D - T, { bevel: 0.4 });
  const wl = H - 3;
  // the frog: chest under water, arms over the front rim, eyes on top
  const spots = blobs(blob([-4, wl + 4, -2], [1.6, 1.4, 1.6]), blob([3.6, wl + 5.6, -3], [1.2, 1, 1.2]), blob([5, wl + 2, 3], [1.4, 1.2, 1.4]));
  S.paint(fill(FROG, { rough: 0.35 }), vol(blob([0, wl - 2, 6], [7, 4, 3]), BELLY), vol(spots, SPOT), under(0.12));
  S.ball([0, wl - 1, 2], [9, 7, 7.6], { segs: 18, rings: 10 });
  S.paint(fill(FROG, { rough: 0.35 }), ...face({ at: [0, wl + 1], gap: 0.1, r: 0.1, eye: 'dot', mouth: 'smile', mw: 7, my: 0.2, col: 0x2a4a2a }), proj('front', pair(ellipse(5.6, wl + 1.4, 1.4, 0.8)), 0xf2a0a0, { alpha: 0.7 }), vol(spots, SPOT), under(0.12));
  head(S, [0, wl + 3, 3.4], [8.4, 5.4, 7], { muzzle: 0.3, brow: 0.1, cheek: 0.2, chin: 0.3, pow: 2.4 });
  for (const s of [-1, 1]) {
    S.paint(fill(FROG, { rough: 0.35 }), proj('front', arc(s * 4.4, wl + 8.6, 1.4, Math.PI * 1.15, Math.PI * 1.85, 0.45), 0x2a4a2a), crown(0.1));
    S.ball([s * 4.4, wl + 7.4, 4], [2.6, 2.4, 2.4], { segs: 12, rings: 7 });
    S.paint(fill(FROG, { rough: 0.35 }), under(0.12));
    S.tube(spline([[s * 7, wl - 1, 5], [s * 8, wl + 1, 10], [s * 6, wl + 2.6, 14.6]], 2), 1.6, { sides: 8 });
    S.at([s * 5.4, wl + 3, 15.2], [0, 0, 0], () => paw(S, [0, 0, -1], 3.4, 4, 1.2, { toes: 3 }));
  }
  towel(S, [0, wl + 10.6, 3], 0.1, 0.8);
  water(S, wl, 0, { box: [W - T, D - T], y0: 2.4 });
  // the sake tray, drifting by (it floats)
  S.joint('tray', { slide: [5, 0.6, 0], min: -1, max: 1, rest: 0, g: [0, 1], idle: 0.3 }, () => {
    S.paint(fill(0x8a5a3a, { rough: 0.4 }), proj('top', stroke(rbox(-8, 7, 5.4, 4, 0.6), 0.3, 0.6), 0x5a3a24), under(0.2));
    S.box(-14, wl - 0.6, -11.6, -2, wl + 0.6, -2.4, { bevel: 0.4 });
    S.paint(fill(0xf4f0e6, { rough: 0.25 }), outer(wrap(2.6, kana('酒', 0, wl + 5.6, 2.6), 0x2a3a6a)));
    S.lathe(spline([[0, 0], [2.4, 0.2], [3, 2.4], [1.4, 5.4], [0.9, 7.6], [1.3, 8.2], [0, 8.2]], 2).map(([r, yy]) => [r, yy + wl + 0.6]), { segs: 14, at: [-11, 0, -7] });
    for (const x of [-6.4, -4]) S.lathe([[0, wl + 0.6], [1, wl + 0.6], [1.6, wl + 2.2], [1.3, wl + 2.2], [0, wl + 1.2]], { segs: 12, at: [x, 0, -5 + (x + 6.4) * 1.2] });
  });
}

// ------------------------------------------------------------------ 6. Sea Otter Family Bath
export function kawauso(S) {
  const FUR = 0x7a5a44, FACE = 0xe8dcc8, KELP = 0x6a8a3a;
  // the shallow oval tarai
  S.paint(fill(HINOKI, { rough: 0.75 }), outer(wrap(22, repeatU(rbox(0, 0, 0.25, 40), 3.6), tone(HINOKI, 0.15))), outer(vol(band(5, 6.4), 0x8a8a90, { rough: 0.3 })), proj('top', all, tint(HINOKI, 0.12)), under(0.2), ...stamp(MAKER, { c: 0x8a6a3a }));
  S.lathe([[0, 0], [23, 0], [23.4, 0.6], [24.4, 10], [23.8, 10.6], [22.4, 10.6], [21.8, 10], [21, 2.4], [0, 2.4]], { segs: 32, sz: 0.66 });
  const wl = 8.4;
  // two otters on their backs, holding hands; dad's rock, the pup asleep on mum
  const otter = (x, yaw, k) => S.at([x, wl, 0], [0, yaw, 0], () => {
    S.paint(fill(FUR, { rough: 0.85 }), vol(blob([0, 2.4, 0], [4, 1.6, 7]), tint(FUR, 0.15)), under(0.12));
    S.at([0, 0, 0], [-Math.PI / 2 + 0.25, 0, 0], () => torso(S, [0, 0, 0], [5 * k, 8 * k, 4 * k], { belly: 0.1, sit: 0.3 }));
    S.at([0, 2.2 * k, 9.4 * k], [-0.45, 0, 0], () => {
      S.paint(fill(FUR, { rough: 0.85 }), vol(blob([0, -0.8 * k, 2.4 * k], [3.4 * k, 2.6 * k, 2.4 * k]), FACE), ...face({ at: [0, 0.6 * k], gap: 3.6 * k, r: 0.6, eye: 'closed', mouth: 'w', mw: 1.4, my: 2.4 * k, near: 1 }), under(0.12));
      head(S, [0, 0, 0], [4.4 * k, 4 * k, 3.8 * k], { muzzle: 0.35, brow: 0.15, cheek: 0.35, chin: 0.2 });
      S.paint(fill(EYE, { rough: 0.3 })); S.ball([0, -0.8 * k, 3.9 * k], [0.8, 0.5, 0.5], { segs: 6, rings: 4 });
      S.paint(fill(FUR, { rough: 0.85 }));
      for (const s of [-1, 1]) S.ball([s * 3.6 * k, 2 * k, -0.6 * k], [1, 1, 0.6], { segs: 6, rings: 4 });
    });
    S.paint(fill(FUR, { rough: 0.85 }));
    for (const s of [-1, 1]) S.ball([s * 2.2 * k, 1.6, -8.4 * k], [1.2, 1.4, 1.8], { segs: 8, rings: 5 });
  });
  otter(-7.4, 0.15, 1); otter(7.6, -0.12, 0.92);
  S.paint(fill(FUR, { rough: 0.85 }));
  S.tube(spline([[-4, wl + 2.6, 4], [0, wl + 3.4, 4.6], [4, wl + 2.6, 4]], 2), 1.2, { sides: 7 });
  S.paint(fill(0x8a8a90, { rough: 0.8 }), proj('top', seg(-1, -1, 1, 1, 0.3), 0x6a6a70)); S.ball([-7.4, wl + 4, -1], [2.6, 1.4, 2], { segs: 10, rings: 5 });
  S.at([7.6, wl + 3.4, -1], [0, 0.3, 0], () => {
    S.paint(fill(0x9a7a60, { rough: 0.85 }), ...face({ at: [0, -4.4], gap: 2, r: 0.45, eye: 'closed', mouth: null, view: 'top' }), under(0.12));
    S.ball([0, 1, 0], [2.6, 1.6, 3.6], { segs: 12, rings: 6 }); S.ball([0, 1.4, 3.6], [2.2, 1.6, 2], { segs: 10, rings: 6 });
    S.paint(fill(0xe8c8b8, { rough: 0.4 }), proj('top', repeatU(rbox(0, 0, 0.15, 3), 0.7), 0xc89a8a)); S.ball([0, 2.4, 1.6], [1.6, 0.6, 1.2], { segs: 8, rings: 4 });
  });
  water(S, wl, 21.4, { y0: 2.4, sz: 0.66 });
  // kelp, so nobody drifts off
  S.paint(fill(KELP, { rough: 0.5 }), proj('top', seg(0, -10, 0, 10, 0.25), tone(KELP, 0.25)));
  S.tube(spline([[-18, wl + 0.2, 4], [-10, wl + 0.4, 7.6], [0, wl + 0.6, 7], [10, wl + 0.4, 8], [17, wl + 0.2, 4]], 3), 0.3, { sides: 4, flat: [6, 1] });
  S.joint('bob', { slide: [0, 1, 0], min: -1, max: 1, rest: 0, g: [0, 1], idle: 0.5 }, () => { S.paint(fill(KELP, { rough: 0.5 })); S.ball([18, wl + 0.4, 5], [1.4, 1, 1.4], { segs: 8, rings: 5 }); });
}

// ------------------------------------------------------------------ 7. Rotenburo Retreat
export function rotenburo(S) {
  const BAMBOO = 0xb8b062, MOMIJI = 0xd8402e;
  S.paint(fill(0x5a6a4a, { rough: 0.9 }), proj('top', or(...[[-22, 18], [24, 16], [-26, -4]].map(([x, z]) => ellipse(x, -z, 3, 1.6))), MOSS), under(0.2), ...stamp(MAKER, { c: 0xb8c0a8 }));
  S.box(-34, 0, -24, 34, 3, 24, { bevel: 0.6 });
  // the bamboo fence at the back
  S.paint(fill(BAMBOO, { rough: 0.45 }), vol(blobs(...[8, 18, 28].map((y) => blob([0, y, -20], [60, 0.7, 3]))), tone(BAMBOO, 0.3)), crown(0.1));
  for (let k = 0; k < 22; k++) S.cyl([-32 + k * 3.05, 3, -20], 1.4, 30 + (k % 3) * 0.8, { segs: 6 });
  S.paint(fill(0x6a5038, { rough: 0.8 }));
  for (const y of [10, 24]) S.tube([[-33, y, -18.4], [33, y, -18.4]], 0.7, { sides: 6 });
  // the rock pool
  const rocks = [[-24, 6, 6, 4], [-18, -6, 6, 4.4], [-8, -12, 7, 4], [6, -12, 7, 4.6], [18, -8, 6, 4], [24, 4, 6, 4], [16, 14, 6, 3.4], [2, 17, 6, 3], [-12, 15, 6, 3.4]];
  for (const [k, [x, z, r, h]] of rocks.entries()) {
    S.paint(fill(STONE, { rough: 0.85 }), vol(below(3.6), tone(MOSS, 0.3)), proj('front', seg(x - r * 0.5, 4 + h * 0.4, x + r * 0.3, 3 + h, 0.3), tone(STONE, 0.2)), crown(0.08), under(0.15));
    S.at([x, 3, z], [0, k * 1.1, 0], () => S.lathe(spline([[r, 0], [r * 1.02, h * 0.5], [r * 0.7, h * 1.2], [0, h * 1.4]], 2), { segs: 9, sz: 0.8 }));
  }
  const wl = 7;
  // the capybara family soaking
  S.paint(fill(CAPY, { rough: 0.85 }), under(0.15));
  loaf(S, [-4, wl - 3, 0], [7, 4.4, 9], { flat: 0.8 });
  capyHead(S, [-4, wl + 4, 6], 0.9);
  towel(S, [-4, wl + 8.6, 4], 0.2, 0.75);
  loaf(S, [9, wl - 2, 2], [4, 2.6, 5.4], { flat: 0.8 });
  capyHead(S, [9, wl + 2, 5.6], 0.55, tint(CAPY, 0.1));
  water(S, wl, 20, { y0: 3, sz: 0.62 });
  // the bamboo spout pouring in
  S.paint(fill(BAMBOO, { rough: 0.45 }), vol(blob([24, 18, -14], 1), tone(BAMBOO, 0.3)));
  S.tube([[26, 3, -14], [26, 20, -14]], 1.2, { sides: 8 }); S.tube([[27, 18, -14], [14, 16, -8]], 1, { sides: 8 });
  S.clear(true); S.paint(fill(0xd8f0f4, { rough: 0.05 })); S.tube(spline([[14, 16, -8], [13, 13, -7.6], [12.6, wl, -7.4]], 2), 0.6, { sides: 6 }); S.clear(false);
  // the stone lantern, a little maple, leaves on the water, a wash bucket
  S.at([-27, 3, -12], null, () => {
    S.paint(fill(0xb0aca4, { rough: 0.85 }), proj('front', rbox(0, 14.4, 1.4, 1.4), 0xf6e6a0), proj('right', rbox(0, 14.4, 1.4, 1.4), 0xf6e6a0), crown(0.08), under(0.2));
    S.cyl([0, 0, 0], 3.6, 2, { segs: 6 }); S.cyl([0, 2, 0], 1.3, 9, { segs: 8 }); S.box(-3, 11, -3, 3, 12.2, 3, { bevel: 0.3 }); S.box(-2.2, 12.2, -2.2, 2.2, 16, 2.2, { bevel: 0.2 }); S.cone([0, 16, 0], 4.4, 3.4, { segs: 6 }); S.ball([0, 19.8, 0], 1, { segs: 6, rings: 4 });
  });
  S.paint(fill(0x5a4030, { rough: 0.85 }));
  S.tube(spline([[28, 3, 12], [27, 14, 12], [25, 24, 13], [22, 30, 13]], 2), [1.4, 1.1, 0.8, 0.5], { sides: 7 });
  S.tube(spline([[27, 14, 12], [30, 22, 11]], 2), 0.5, { sides: 5 });
  S.paint(fill(MOMIJI, { rough: 0.6 }), proj('front', star(0, 1.6, 1.6, 5, 0.5), tint(MOMIJI, 0.2)), crown(0.1));
  for (let k = 0; k < 14; k++) { const a = k * GA, d = 2 + (k % 4) * 1.3; S.at([24 + Math.cos(a) * d, 27 + (k % 3) * 1.6 - 1, 12.6 + Math.sin(a) * d], [-1.2 + (k % 2) * 0.6, a, 0.3], () => blade(S, 3.6, 3.6, 0.5, { shape: 'round', cup: 0.6 })); }
  S.paint(fill(MOMIJI, { rough: 0.6 }));
  for (const [x, z, a] of [[-14, 8, 0.4], [12, -2, 1.6], [0, 9, 2.6]]) S.at([x, wl + 0.1, z], [-Math.PI / 2, a, 0], () => S.extrude(Array.from({ length: 10 }, (_, k) => { const r = k % 2 ? 0.8 : 2.2, an = k * Math.PI / 5; return [Math.cos(an) * r, Math.sin(an) * r]; }), -0.15, 0.15));
  S.paint(fill(HINOKI, { rough: 0.75 }), outer(vol(band(5, 5.8), 0x9a8a6a)), under(0.2));
  S.lathe([[0, 3], [3.4, 3], [4, 9.4], [3.4, 9.4], [3, 4], [0, 4]], { segs: 14, at: [-26, 0, 16] });
}

// ------------------------------------------------------------------ 8. Golden Kapi-sama (secret)
export function kinkapi(S) {
  const G = (o = {}) => fill(GOLD, { rough: 0.22, ...o });
  // the two-tier stone platform, the rock-ringed sacred pool
  S.paint(fill(0xb0aca4, { rough: 0.85 }), crown(0.08), under(0.2), ...stamp(MAKER, { c: 0x6a6a64 }));
  S.box(-24, 0, -20, 24, 3, 20, { bevel: 0.6 }); S.box(-20, 3, -16, 20, 5.4, 16, { bevel: 0.5 });
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; S.paint(fill(STONE, { rough: 0.85 }), crown(0.1)); S.at([Math.cos(a) * 14, 5.4, Math.sin(a) * 11], [0, a, 0], () => S.ball([0, 0, 0], [3.2, 2.6, 2.6], { segs: 10, rings: 5, v0: 0.5 })); }
  water(S, 7, 13, { y0: 5.4, sz: 0.8, col: 0xb8e4e0 });
  const y = 6.4;
  // the aureole behind the head: a gold ring with sun-ray tips
  S.paint(G());
  S.at([0, y + 30, -6], [Math.PI / 2, 0, 0], () => { S.torus([0, 0, 0], 13, 1, { segs: 32, sides: 6 }); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; S.at([Math.cos(a) * 14, 0, Math.sin(a) * 14], [0, -a, -Math.PI / 2], () => S.cone([0, 0, 0], 1, 3, { segs: 6 })); } });
  // the golden capybara, sitting up like a lucky cat
  S.paint(G(), under(0.15), crown(0.08));
  torso(S, [0, y + 10, 0], [9.6, 10, 8], { belly: 0.26, hips: 1.08, sit: 0.42 });
  for (const s of [-1, 1]) paw(S, [s * 4.6, y, 5.4], 4.6, 6, 2.4, { toes: 3 });
  S.paint(fill(0xd8302a, { rough: 0.5 }), proj('front', stroke(and(circle(0, y + 17, 6), { d: (u, v) => v - (y + 17), b: null }), 0.6, 0.6), GOLD), under(0.15));
  S.at([0, y + 17.6, 6], [-0.35, 0, 0], () => S.extrude(Array.from({ length: 13 }, (_, k) => { const a = Math.PI + k / 12 * Math.PI; return [Math.cos(a) * 6.6, Math.sin(a) * 6.6]; }), -0.4, 0.4, { bevel: 0.2 }));
  S.paint(G(), proj('front', seg(0, y + 13, 0, y + 13.8, 0.3), 0x6a4a1a)); S.ball([0, y + 13.8, 7.6], 1.6, { segs: 10, rings: 6 });
  S.paint(G(), under(0.15));
  S.tube(spline([[-6, y + 15, 3], [-6, y + 10, 6], [-3, y + 9, 8]], 2), 2, { sides: 8 });
  S.ball([-3, y + 9, 8.6], [2.2, 2, 2], { segs: 10, rings: 6 });
  capyHead(S, [0, y + 25, 2.6], 1.2, GOLD, { rough: 0.22, blush: true });
  S.joint('paw', { pivot: [6.6, y + 15, 1.6], axis: 'x', min: -0.6, max: 0.3, rest: 0, g: [0, -0.55], idle: 0.12 }, () => {
    S.paint(G(), under(0.15));
    S.tube(spline([[6.6, y + 15, 1.6], [10, y + 20, 2.6], [10, y + 26, 3.6]], 2), [2.4, 2.2, 2], { sides: 8 });
    S.ball([10, y + 27, 4], [2.6, 2.8, 2.2], { segs: 12, rings: 7 });
  });
}
