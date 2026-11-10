// Oden Friends (おでんぶつ): the things simmering in the oden pot at the corner stall, and the animals they are. Each
// sits on its own little dish with a dab of mustard. Sculpt programs in millimetres (src/figures/sculpt.js); the series
// data is src/data/series/oden.js.
import { spline, ring, hinge } from '../sculpt.js';
import { head, torso, loaf, paw, blade, eggShape } from '../anatomy.js';
import { sweep } from '../forms.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, or, and, stroke, pair, all, repeatU, repeatV, label, kana, band, below, above, blob, blobs, spots,
} from '../paint.js';

const MAKER = 'MANPUKUDO';
const DISH = 0xf6f3ea, INDIGO = 0x3a4f8a, BROTH = 0xc89a4a, KARASHI = 0xf2c43a;

/** A little dish (rim r) with an indigo band, broth in the bottom and a dab of mustard on the rim. */
function dish(S, r, { broth = true, mustard = [0.6, 0.7] } = {}) {
  const pattern = wrap(r * 0.95, repeatU(or(circle(0, 2.2, 0.6), seg(-1.2, 2.2, 1.2, 2.2, 0.3)), 4.2), INDIGO);
  S.paint(fill(DISH, { rough: 0.35 }), vol(band(3.2, 3.8), INDIGO), pattern, proj('top', stroke(circle(0, 0, r - 1.4), 0.5), INDIGO), under(0.18), ...stamp(MAKER, { c: 0x8a96b8 }));
  S.lathe(spline([[r * 0.55, 0], [r * 0.6, 1], [r * 0.85, 1.6], [r, 4], [r - 0.6, 4.2], [r * 0.82, 2.6], [0, 2.2]], 2), { segs: 28 });
  if (broth) { S.paint(fill(BROTH, { rough: 0.15 }), proj('top', or(circle(r * 0.3, r * 0.2, 1), circle(-r * 0.4, -r * 0.3, 0.7)), tint(BROTH, 0.3))); S.lathe([[0, 2.6], [r * 0.8, 2.6]], { segs: 24, cap: false }); }
  if (mustard) {
    const [a, k] = mustard, x = Math.cos(a) * r * k, z = Math.sin(a) * r * k;
    S.paint(fill(KARASHI, { rough: 0.5 }), crown(0.2), under(0.1));
    S.lathe(spline([[2.4, 0], [2, 0.9], [1, 1.6], [0.3, 2.6], [0, 2.9]], 2), { segs: 10, at: [x, 2.6, z] });
  }
}

// ------------------------------------------------------------------ 1. Daikon Seal
export function daikon(S) {
  const RAD = 0xead6a6, EDGE = 0xd9b77a, SEAL = 0xd8c8a4;
  dish(S, 20);
  // the daikon round: soft, simmered amber at the rim, scored across the top; it is the seal's body
  S.paint(fill(RAD, { rough: 0.45 }), vol(below(5.4), EDGE), shade(vol(blob([0, 13, 0], [9, 2, 9])), -0.1), proj('top', or(seg(-6, 0, 6, 0, 0.6), seg(0, -6, 0, 6, 0.6)), tone(RAD, 0.18)), under(0.14));
  S.lathe(spline([[0, 2.6], [11.6, 2.8], [13, 4.6], [13.2, 9], [12.4, 12.4], [10, 13.4], [0, 13.6]], 2), { segs: 28 });
  // the seal out of the front of it: head, whiskers, flippers; the tail flippers behind
  S.joint('head', { pivot: [0, 9, 10], axis: 'x', min: -0.5, max: 0.3, rest: 0, g: [0, -0.45] }, () => S.at([0, 12, 14], [-0.15, 0, 0], () => {
    S.paint(fill(RAD, { rough: 0.45 }), vol(blob([0, -3, 0], [8, 3, 8]), EDGE), ...face({ at: [0, 1.4], gap: 6, r: 1.15, eye: 'bead', mouth: null }), proj('front', or(seg(0, -1, 0, -2, 0.4), arc(-1, -1.8, 1, Math.PI, Math.PI * 1.9, 0.4), arc(1, -1.8, 1, Math.PI * 1.1, Math.PI * 2, 0.4)), tone(RAD, 0.5)), under(0.1));
    head(S, [0, 0, 0], [7, 6.2, 6.2], { muzzle: 0.5, brow: 0.2, cheek: 0.26, chin: 0.2 });
    S.paint(fill(0x6a5444, { rough: 0.3 }));
    S.ball([0, -0.4, 6.4], [1.2, 0.8, 0.8], { segs: 6, rings: 4 });
    S.paint(fill(0xf8f2e6));
    for (const s of [1, -1]) for (const dy of [0, 1]) S.tube([[s * 2.4, -1.2 + dy, 5.6], [s * 7.4, -1.6 + dy * 2, 5.4]], 0.14, { sides: 3, caps: false });
  }));
  S.paint(fill(RAD, { rough: 0.45 }), vol(below(5), EDGE), under(0.12));
  for (const s of [1, -1]) S.at([s * 11.6, 5, 9], [0.4, 0, -s * 1.7], () => blade(S, 7, 5, 1.6, { shape: 'leaf', cup: 0.4 }));
  for (const s of [1, -1]) S.at([s * 3, 4.6, -12.4], [-1.2, s * 0.5, 0], () => blade(S, 7, 6, 1.6, { shape: 'round', cup: -0.5 }));
  void SEAL;
}

// ------------------------------------------------------------------ 2. Egg Penguin
export function tamago(S) {
  const WHITE = 0xf4ece0, STAIN = 0xc79b5e, DEEP = 0x9a6a3e, BEAK = 0xf2a84a;
  dish(S, 15, { mustard: [2.4, 0.66] });
  // the egg, stood up, simmered brown on its back like a penguin's coat
  // the egg, stood up, simmered brown on its back like a penguin's coat; the face high on the front
  S.paint(fill(WHITE, { rough: 0.35 }), vol(blob([0, 18, -6], [12, 16, 9]), STAIN), vol(blob([0, 30, -1], [8, 4, 8]), STAIN), proj('front', ellipse(0, 15, 6, 9), WHITE, { near: 2 }),
    ...face({ at: [0, 22.4], gap: 5.4, r: 1.1, eye: 'dot', mouth: null, near: 4 }), proj('front', pair(ellipse(4.2, 20, 1.4, 0.8)), 0xf2b0a0, { alpha: 0.6, near: 4 }), under(0.14), crown(0.1));
  eggShape(S, [0, 2.6, 0], 9.6, 26, { segs: 22 });
  S.paint(fill(BEAK), under(0.2));
  S.at([0, 20.2, 8.2], [Math.PI / 2 - 0.2, 0, 0], () => S.cone([0, 0, 0], 1.5, 3, { segs: 8, sz: 0.7 }));
  // feet and flippers; one flipper waves
  S.paint(fill(BEAK), under(0.2));
  for (const s of [1, -1]) paw(S, [s * 3.4, 2.6, 5.6], 3.6, 4.2, 1.6, { toes: 3 });
  S.paint(fill(STAIN), proj('front', ellipse(0, 4, 1.2, 3.6), tint(STAIN, 0.3)), under(0.14));
  S.at([-8.6, 15.6, 0.4], [0, 0, 2.7], () => S.at([0, 0, 0], [0, Math.PI / 2, 0], () => blade(S, 8.4, 4.4, 1.6, { shape: 'leaf', cup: 0.4 })));
  S.rest = 0;
  S.joint('wave', { pivot: [8.6, 17, 0.4], axis: 'z', min: -0.4, max: 1.6, rest: 0, g: [0, 1.4] }, () => {
    S.paint(fill(STAIN), under(0.14));
    S.at([8.6, 17, 0.4], [0, 0, -2.7], () => S.at([0, 0, 0], [0, Math.PI / 2, 0], () => blade(S, 8.4, 4.4, 1.6, { shape: 'leaf', cup: 0.4 })));
  });
  void DEEP;
}

// ------------------------------------------------------------------ 3. Chikuwa Otter
export function chikuwa(S) {
  const FISH = 0xf6ecd6, GRILL = 0xb8783e, OTTER = 0x8a6448, PALE = 0xe6d2b4;
  dish(S, 22, { mustard: [-0.6, 0.72] });
  // the chikuwa: a tube of fish paste, grilled brown in patches along the top, lying across the dish
  S.push(hinge([0, 0, 0], 'y', -0.55));
  const grilled = vol(blobs(...[-12, -6, 0, 6, 12].map((x, i) => blob([-6.6, x, 0], [2.8, 3.6 + (i % 2), 5.6]))), GRILL);
  S.paint(fill(FISH, { rough: 0.5 }), grilled, vol(blob([-6.6, 0, 0], [2, 20, 6]), tone(GRILL, 0.1)), under(0.12));
  S.at([0, 9.2, 0], [0, 0, -Math.PI / 2], () => S.lathe([[6.4, -16], [6.6, -15.2], [6.6, 15.2], [6.4, 16], [3, 16], [3, -16], [6.4, -16]], { segs: 22, cap: false }));
  S.paint(fill(tone(FISH, 0.1)));
  for (const s of [1, -1]) S.at([s * 16, 9.2, 0], [0, 0, -Math.PI / 2], () => S.torus([0, 0, 0], 4.7, 1.6, { segs: 18, sides: 6 }));
  // the otter inside: its head and paws out of the front end; it slides out
  S.rest = 0;
  S.joint('otter', { slide: [7, 0, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => S.at([17.6, 9.6, 0], [0, Math.PI / 2 - 0.35, 0], () => {
    S.paint(fill(OTTER), proj('front', ellipse(0, -1.6, 3.6, 2.6), PALE), ...face({ at: [0, 1], gap: 4.6, r: 0.95, eye: 'bead', mouth: null }), under(0.12), crown(0.06));
    head(S, [0, 0, 0], [4.6, 4.2, 4.4], { muzzle: 0.4, brow: 0.2, cheek: 0.24, chin: 0.2 });
    S.paint(fill(0x3a3034, { rough: 0.3 }));
    S.ball([0, -0.4, 4.6], [1.1, 0.8, 0.7], { segs: 6, rings: 4 });
    S.paint(fill(OTTER), under(0.12));
    for (const s of [1, -1]) { S.ball([s * 3.6, 3, -1], [1.2, 1.1, 0.8], { segs: 6, rings: 4 }); S.tube(spline([[s * 2.6, -3.6, -2], [s * 3.2, -4.6, 1.4], [s * 2.4, -4.6, 3.4]], 2), 1, { sides: 6 }); }
    S.paint(fill(PALE));
    for (const s of [1, -1]) for (const dy of [0, 0.8]) S.tube([[s * 1.8, -1.2 + dy, 4], [s * 5.2, -1 + dy * 1.6, 3.8]], 0.12, { sides: 3, caps: false });
    S.paint(fill(OTTER), under(0.12));
    S.tube([[0, -1, -2], [0, -1.2, -9]], 3.4, { sides: 10 });
  }));
  // its tail out of the back end
  S.paint(fill(OTTER), under(0.14));
  S.tube(spline([[-14, 8.4, 0], [-18.6, 6.8, 0.6], [-22, 4.6, 2], [-24, 3.4, 4.6]], 3), [2.4, 2.2, 1.6, 0.6], { sides: 8 });
  S.pop();
}

// ------------------------------------------------------------------ 4. Konnyaku Ray (on a skewer)
export function konnyaku(S) {
  const KON = 0x8a8a90, SPECK = 0x5a5a64, BELLY = 0xb8b8bc, STICK = 0xe0c08a;
  // a cup of broth to stand the skewer in
  S.paint(fill(DISH, { rough: 0.35 }), vol(band(4, 5), INDIGO), wrap(9.4, kana('おでん', 0, 11, 4), INDIGO), under(0.18), ...stamp(MAKER, { c: 0x8a96b8 }));
  S.lathe(spline([[6.6, 0], [7.4, 0.6], [9.6, 14], [9.2, 14.6], [8.4, 13.6], [0, 13]], 2), { segs: 22 });
  S.paint(fill(BROTH, { rough: 0.15 }));
  S.lathe([[0, 13.4], [8.6, 13.4]], { segs: 18, cap: false });
  S.paint(fill(STICK, { rough: 0.8 }), vol(below(13), tone(STICK, 0.2)));
  S.tube([[0, 6, 0], [0, 50, 0]], 0.9, { sides: 6 });
  S.ball([0, 50, 0], 0.9, { segs: 6, rings: 3 });
  // the ray: a triangle of konnyaku, speckled, scored in a lattice, gliding up its skewer
  const speck = vol(spots(28, { y0: 22, y1: 44, R: 1.6, r: [0.45, 0.45, 2.6], turn: 2.4 }), SPECK), score = proj('front', and(poly([[0, 46], [14, 25], [-14, 25]]), or(repeatU(rbox(0, 0, 0.2, 40, 0, 0.6), 4), repeatU(rbox(0, 0, 0.2, 40, 0, -0.6), 4))), tone(KON, 0.24));
  S.rest = 0;
  S.joint('glide', { slide: [0, 5, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
  S.paint(fill(KON, { rough: 0.4 }), speck, score, proj('back', or(...[[-4, 30], [3, 34], [-1, 38], [5, 28]].map(([u, v]) => circle(u, v, 0.5))), SPECK), under(0.1), crown(0.08));
  S.extrude([[0, 45], [5, 41.6], [11, 36.4], [17.4, 30.6], [18.4, 28.6], [15, 27.6], [9, 27], [3.4, 25], [0, 23.4], [-3.4, 25], [-9, 27], [-15, 27.6], [-18.4, 28.6], [-17.4, 30.6], [-11, 36.4], [-5, 41.6]], -2.2, 2.2, { bevel: 1.4 });
  S.tube(spline([[0, 24, -0.6], [0.4, 19, -1], [-0.4, 14, -1.6]], 2), [1, 0.3], { sides: 5 });
  // the face low on the front, the little horns (cephalic fins) either side of it
  S.paint(fill(BELLY), ...face({ at: [0, 30.6], gap: 6, r: 0.95, eye: 'line', mouth: 'flat', mw: 2.4, my: 2.6, near: 1.8 }), under(0.1));
  S.at([0, 27.6, 1.6], null, () => S.ball([0, 0, 0], [3.6, 2.4, 1.2], { segs: 10, rings: 4 }));
  S.paint(fill(KON), under(0.12));
  for (const s of [1, -1]) S.tube(spline([[s * 3.4, 25.6, 1], [s * 4.4, 23, 2.6], [s * 3.6, 21.6, 3.4]], 2), [1, 0.6], { sides: 5 });
  });
}

// ------------------------------------------------------------------ 5. Kinchaku Hamster (ultra)
export function kinchaku(S) {
  const AGE = 0xd9a24a, DEEP = 0xb07834, KANPYO = 0xe8cc8a, MOCHI = 0xfaf6ee, PINK = 0xf2a8a0;
  dish(S, 20, { mustard: [0.2, 0.72] });
  // the pouch: fried tofu, puffed round, its pores placed in rows; it is the hamster
  const pores = vol(spots(40, { y0: 5, y1: 22, R: 11.4, r: [0.5, 0.4, 0.5], turn: 2.4 }), tone(AGE, 0.18));
  S.paint(fill(AGE, { rough: 0.55 }), pores, vol(blob([0, 9, 9], [7, 6, 4]), 0xf2dcae), shade(vol(below(7)), 0.1), ...face({ at: [0, 17], gap: 7, r: 1.2, eye: 'dot', mouth: null, near: 7 }),
    proj('front', pair(ellipse(5.4, 14.6, 1.6, 0.9)), PINK, { alpha: 0.7, near: 7 }), under(0.14), crown(0.06));
  S.lathe(spline([[0, 2.6], [9, 3], [12.6, 7], [13.2, 13], [11.4, 19.6], [7, 23.6], [4, 24.6]], 3), { segs: 24 });
  S.paint(fill(0xf2dcae), proj('front', or(seg(0, 0.2, 0, -0.8, 0.4), arc(-0.9, -0.8, 0.9, Math.PI, Math.PI * 1.9, 0.4), arc(0.9, -0.8, 0.9, Math.PI * 1.1, Math.PI * 2, 0.4)), DEEP), under(0.1));
  S.at([0, 14, 11.2], null, () => S.ball([0, 0, 0], [3.4, 2.6, 2], { segs: 12, rings: 6 }));
  S.paint(fill(0xd9858a, { rough: 0.3 }));
  S.ball([0, 14.8, 13.1], [0.8, 0.6, 0.5], { segs: 6, rings: 4 });
  for (const s of [1, -1]) { S.paint(fill(AGE), proj('front', ellipse(0, 2.4, 1.4, 1.8), PINK)); S.at([s * 8.4, 20.6, 3], [0, -s * 0.3, -s * 0.75], () => blade(S, 4.6, 5, 1.4, { shape: 'round', cup: 0.7 })); }
  S.paint(fill(AGE), under(0.14));
  for (const s of [1, -1]) { S.ball([s * 4.4, 8.6, 10.8], [1.7, 1.4, 1.4], { segs: 8, rings: 5 }); S.ball([s * 6.4, 3.8, 9.6], [2, 1.3, 2.4], { segs: 8, rings: 5 }); }
  // the kanpyo tie round the neck of the pouch, its ends hanging like a bow
  S.paint(fill(KANPYO, { rough: 0.5 }), under(0.14));
  S.torus([0, 24.4, 0], 4.4, 0.9, { segs: 16, sides: 5, sy: 0.6 });
  for (const s of [1, -1]) S.tube(spline([[s * 2, 24.6, 4.2], [s * 4.6, 23, 6], [s * 5.4, 20, 7]], 2), 0.8, { sides: 4, flat: [1.6, 0.5] });
  // the top of the pouch: the frilled neck with the ears; it lifts to show the mochi inside
  S.rest = 0;
  S.joint('top', { pivot: [0, 24.6, -5], axis: 'x', min: -1.2, max: 0, rest: 0, g: [0, -0.95] }, () => {
    S.paint(fill(AGE, { rough: 0.55 }), vol(spots(10, { y0: 25, y1: 30, R: 3.6, r: [0.45, 0.4, 0.45] }), tone(AGE, 0.18)), under(0.12), crown(0.08));
    S.lathe(spline([[4.2, 24.4], [3.8, 25.6], [5.2, 27], [6.6, 27.8], [5.4, 28.4], [2, 27.6], [0, 27.8]], 2), { segs: 18 });
  });
  S.paint(fill(MOCHI, { rough: 0.6 }), crown(0.1));
  S.ball([0, 24, 0], [3.4, 2.2, 3.4], { segs: 12, rings: 5 });
}

// ------------------------------------------------------------------ 6. The Oden Pot (secret)
export function nabe(S) {
  const POT = 0xc9ced4, RIM = 0xa8aeb6, CAT = 0xf2ecde, TOWEL = 0xf6f2ea;
  // the square pot, its partitions, the broth
  S.paint(fill(POT, { rough: 0.3 }), proj('front', kana('おでん', 0, 8.4, 5), 0xd9483a), proj('front', label('SINCE 1964', 0, 3.4, 0.36), 0x6a6e78, { hard: true }), under(0.16), crown(0.1), ...stamp(MAKER, { c: 0x6a6e78 }));
  S.box(-21, 0, -15, 21, 13, 15, { bevel: 1.2 });
  S.paint(fill(RIM, { rough: 0.3 }), crown(0.1));
  for (const [a, b, c, d] of [[-22, -16, 22, -14], [-22, 14, 22, 16], [-22, -14, -20, 14], [20, -14, 22, 14]]) S.box(a, 13, b, c, 14.4, d, { bevel: 0.5 });
  S.box(-0.5, 9, -14, 0.5, 14, 14);
  S.box(-20, 9, -0.5, 0, 14, 0.5);
  S.paint(fill(BROTH, { rough: 0.12 }), proj('top', or(circle(-12, -6, 1), circle(8, 8, 1.4), circle(14, -9, 0.8)), tint(BROTH, 0.3)));
  S.box(-20, 11, -14, 20, 12.4, 14);
  // what simmers: an egg, a daikon round, a skewer of konnyaku, a chikuwa
  S.paint(fill(0xc79b5e, { rough: 0.35 }), crown(0.1));
  S.at([-14, 12, 6], [0.9, 0.4, 0], () => eggShape(S, [0, -4, 0], 3.6, 9.6));
  S.paint(fill(0xead6a6, { rough: 0.45 }), proj('top', or(seg(-3, 7, 3, 7, 0.4), seg(-6, 4, -6, 10, 0.4)), tone(0xead6a6, 0.2)));
  S.cyl([-6, 10.6, 7], 5.6, 3.6, { segs: 18, bevel: 1.2 });
  S.paint(fill(0x8a8a90, { rough: 0.4 }));
  S.at([-11, 13.4, -7], [0, 0.4, 0.3], () => { S.box(-3, -2, -1.4, 3, 4, 1.4, { bevel: 0.8 }); S.paint(fill(0xe0c08a)); S.tube([[0, -3, 0], [0, 14, 0]], 0.6, { sides: 5 }); });
  S.paint(fill(0xf6ecd6), vol(blob([0, 14, 0], [30, 2, 30]), 0xb8783e));
  S.at([-14, 12.6, -7], [0, 0, -Math.PI / 2], () => S.cyl([0, -9, 0], 2.6, 3, { segs: 12 }));
  // the cat: in to the shoulders, a folded towel on its head; it sinks and comes up again
  S.rest = 0;
  S.joint('cat', { slide: [0, -3, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    S.paint(fill(CAT), proj('front', or(ellipse(-3, 21.4, 1.6, 1.1), ellipse(3, 21.4, 1.6, 1.1)), 0xf2b0a0, { alpha: 0.6 }), ...face({ at: [0, 23.2], gap: 6, r: 1.1, eye: 'closed', mouth: 'w', mw: 2, my: 2.6 }), under(0.12), crown(0.06));
    S.at([10, 0, 0], null, () => {
      torso(S, [0, 13, 0], [7, 4, 5.4], { belly: 0.1, hips: 1.1 });
      head(S, [0, 22, 0.6], [6.6, 5.8, 5.6], { muzzle: 0.25, brow: 0.2, cheek: 0.28, chin: 0.2 });
      for (const s of [1, -1]) { S.paint(fill(CAT), proj('front', ellipse(0, 2.2, 1, 1.6), 0xf2b0a0)); S.at([s * 4.2, 26, 0], [0, 0, -s * 0.45], () => blade(S, 4.2, 4.6, 1.3, { shape: 'ear', cup: 0.6 })); }
      S.paint(fill(TOWEL, { rough: 0.85 }), proj('top', repeatU(rbox(0, 0, 0.3, 4, 0), 2.2), tone(TOWEL, 0.12)), vol(band(29.6, 30.2), 0x8ab0d8), under(0.14));
      S.box(-4, 28, -3, 4, 30.4, 3, { bevel: 1 });
      S.paint(fill(CAT), under(0.12));
      for (const s of [1, -1]) S.ball([s * 6.4, 13.6, 4], [1.8, 1.4, 1.8], { segs: 8, rings: 5 });
    });
  });
}

void loaf; void sweep; void ring; void tint; void EYE; void all; void repeatV; void above; void band; void poly; void label;
