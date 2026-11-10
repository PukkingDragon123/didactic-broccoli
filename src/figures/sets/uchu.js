// Space Neko (うちゅうねこ): cats on a mission to nap in orbit. Sculpt programs, in millimetres (src/figures/sculpt.js);
// the series data is src/data/series/uchu.js. The family look: chibi cats (one head, one sitting body), 1960s toy-rocket
// space gear in cream, red and teal, clear bubble helmets, each on the same navy display base with hand-placed stars.
import { spline, ring } from '../sculpt.js';
import { head, torso, loaf, paw, blade } from '../anatomy.js';
import {
  fill, proj, vol, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, halfBelow, halfAbove, repeatU, repeatV, label, kana,
  below, above, band, blob, blobs,
} from '../paint.js';
import { L } from './showa.js';

const DENS = 0.8;
const MAKER = 'HOSHIZORA';
const CREAM = 0xf6f0e2, RED = 0xd8443a, TEAL = 0x3fa6a0, NAVY = 0x23305e, GOLD = 0xf2c84a, PINK = 0xf2a6b0, BLUSH = 0xf4a0a8;
const aim = (d, roll = 0) => { const l = Math.hypot(d[0], d[1], d[2]); return [-Math.asin(d[1] / l), Math.atan2(d[0], d[2]), roll]; };
const or_ = (...fs) => { const f = (x, y, z) => Math.min(...fs.map((g) => g(x, y, z))); f.ys = fs.flatMap((g) => g.ys || []); return f; };

/** The display base: a navy drum with a gold rim and its own constellation. stars: [[x, y, r]] in top view. */
function base(S, R = 20, stars = [[-12, 6, 1.6], [9, 11, 1.2], [13, -6, 1.8], [-6, -13, 1.1], [3, 15, 0.9], [-15, -4, 0.9], [15, 3, 0.8]]) {
  S.with({ dens: 0.5 }, () => {
    S.paint(fill(NAVY, { rough: 0.45 }), vol(band(4.3, 5), GOLD, { rough: 0.3 }), proj('top', or(...stars.map(([x, y, r]) => star(x, y, r, 5, 0.45))), GOLD), proj('top', or(...stars.map(([x, y], i) => circle(-x * 0.7 + (i % 3), y * 0.6 - 3, 0.35))), 0xd8e0f8), under(0.2), ...stamp(MAKER, { c: 0x8a92b8 }));
    S.lathe(spline([[0, 0], [R - 0.6, 0], [R, 0.6], [R, 4.3], [R - 0.3, 5], [R - 1, 5.2], [0, 5.2]], 2), { segs: 28 });
  });
}
/** A cat's head, centred on the frame and facing +z. C: { fur, marks: [layers], ear: [l, r] colours, muzzle }. */
function catHead(S, C, o = {}) {
  const N = { near: 2 }, eye = o.eye || 'dot';
  const whisk = or(seg(-4.4, -1.6, -8.4, -1, 0.3), seg(-4.4, -2.6, -8.2, -3, 0.3), seg(4.4, -1.6, 8.4, -1, 0.3), seg(4.4, -2.6, 8.2, -3, 0.3));
  S.paint(
    fill(C.fur), ...(C.marks || []), vol(blob([0, -2.6, 5.8], [4.4, 2.6, 2.6]), C.muzzle ?? 0xfbf8f2),
    ...face({ at: [0, 0.9], gap: 7, r: eye === 'stare' ? 1.7 : 1.45, eye, mouth: null, blush: C.blush === null ? null : BLUSH, near: 2, col: C.eyeCol }),
    proj('front', or(arc(-0.8, -2.3, 0.8, Math.PI, Math.PI * 2, 0.35), arc(0.8, -2.3, 0.8, Math.PI, Math.PI * 2, 0.35)), tone(C.fur, 0.5), N), proj('front', whisk, tone(C.fur, 0.3), N),
    under(0.14), crown(0.06),
  );
  head(S, [0, 0, 0], o.r || [8, 6.8, 7], { muzzle: 0.32, brow: 0.3, cheek: 0.28, chin: 0.2, pow: 2.2 });
  S.paint(fill(PINK, { rough: 0.3 }));
  S.ball([0, -1.4, 6.9], [0.8, 0.55, 0.45], { segs: 6, rings: 4 });
  for (const s of [1, -1]) {
    S.paint(fill(C.ear?.[s > 0 ? 1 : 0] ?? C.fur), proj('front', ellipse(0, 2.6, 1.6, 2.2), PINK));
    S.at([s * 4.6, 4.6, -0.8], [-0.12, 0, -s * 0.34], () => blade(S, 6.2, 6.4, 1.8, { shape: 'ear', cup: 1 }));
  }
}
/** The sitting chibi body (feet on y = 0), with front paws and a tail (pts). */
function catBody(S, C, o = {}) {
  S.paint(fill(C.suit ?? C.fur), ...(C.bodyMarks || []), under(0.14), crown(0.04));
  torso(S, [0, 6.8, 0], [6.2, 6.8, 5.4], { belly: 0.2, hips: 1.12, sit: 0.42 });
  S.paint(fill(C.boot ?? C.fur), under(0.14));
  for (const s of [1, -1]) paw(S, [s * 2.6, 0, 4], 3.6, 4.4, 2.4, { toes: 3 });
  if (o.tail !== false) {
    S.paint(fill(C.tailCol ?? C.fur), under(0.12));
    S.tube(spline(o.tail || [[0, 2.4, -4.6], [3.6, 1.6, -8], [8, 1.6, -7], [9.4, 4.6, -4]], 3), (t) => 1.5 - 0.3 * t, { sides: 8 });
  }
}
/** A spacesuit over a cat: collar ring, chest panel, backpack; the clear bubble helmet round the head at hy. */
function suit(S, hy, o = {}) {
  S.paint(fill(TEAL, { rough: 0.35 }), under(0.2));
  S.torus([0, 12.6, 0.2], 4.6, 1.1, { segs: 16, sides: 8 });
  S.paint(fill(CREAM, { rough: 0.45 }), proj('back', or(stroke(rbox(0, 9.4, 3, 3.4, 0.8), 0.4), rbox(0, 11.4, 2, 0.4, 0)), tone(CREAM, 0.25)), under(0.2));
  S.box(-4.4, 4.6, -8.6, 4.4, 13, -4.4, { bevel: 1.2 });
  S.paint(fill(0xc9ced6, { rough: 0.3 }));
  for (const s of [1, -1]) S.cyl([s * 2.6, 2.6, -6.8], [1.6, 1.1], 2.2, { segs: 10 });
  if (o.helmet !== false) {
    S.clear(true);
    S.paint(fill(0xdcecf4, { rough: 0.05 }));
    S.ball([0, hy + 0.6, 0.4], [10.4, 10.4, 10], { segs: 18, rings: 10, v0: 0.12 });
    S.clear(false);
    S.paint(fill(RED, { rough: 0.4 }));
    S.tube([[4, hy + 7, -2], [6.6, hy + 13, -3]], 0.4, { sides: 5 });
    S.ball([6.6, hy + 13.4, -3], 1.1, { segs: 8, rings: 5 });
  }
}

// ------------------------------------------------------------------ 1. Astro-Neko
export function astro(S) {
  S.dens = DENS;
  const C = { fur: 0xfbf8f2, marks: [vol(blobs(blob([-5, 4, 2], [5, 4.4, 6]), blob([5.6, 5.4, -3], [4, 3.6, 4])), 0xec9a48), vol(blob([6, 2, 1], [2.6, 3, 4]), 0x4a4448)], ear: [0xec9a48, 0xfbf8f2], suit: CREAM, boot: RED, tailCol: 0xec9a48 };
  C.bodyMarks = [proj('front', or(rbox(0, 8, 2.6, 2.2, 0.5)), 0x3a4a6a, { near: 2 }), proj('front', or(circle(-1.2, 8.6, 0.6), circle(0.4, 8.6, 0.6)), RED, { near: 2 }), proj('front', rbox(1.4, 7.2, 0.8, 0.4, 0), GOLD, { near: 2 }), vol(below(2.2), RED)];
  base(S);
  S.at([0, 5.2, 0], null, () => {
    catBody(S, C);
    suit(S, 19);
    S.at([0, 19, 0.6], null, () => catHead(S, C), 0.88);
    // one arm up in a wave (the gimmick waves it), the other holding the Moon it knocked off the shelf
    S.paint(fill(CREAM, { rough: 0.45 }), vol(above(-100), CREAM), under(0.14));
    S.tube(spline([[-5, 11, 1], [-7.4, 8, 3.6], [-5.6, 6.6, 6.4]], 3), 1.6, { sides: 8 });
    S.paint(fill(RED, { rough: 0.4 }));
    S.at([-5.4, 6.6, 6.6], aim([0.3, -0.3, 1]), () => paw(S, [0, -0.8, 0], 3, 3.2, 1.7, { toes: 3 }));
    S.paint(fill(0xf6e6a2, { rough: 0.5 }), proj('front', or(stroke(circle(-6.4, 9.4, 0.9), 0.3), circle(-4.4, 7.6, 0.6), circle(-7.2, 6.8, 0.5)), tone(0xf6e6a2, 0.2)), ...face({ at: [-5.2, 8.2], gap: 2.2, r: 0.4, eye: 'closed', mouth: 'smile', mw: 0.8, my: 0.8, near: 9 }), under(0.12), crown(0.06));
    S.ball([-5.6, 8.4, 7.6], 3.2, { segs: 16, rings: 10 });
    S.joint('wave', L(S, { pivot: [5, 11, 1], axis: 'z', min: -0.5, max: 0.5, rest: 0, g: [0, 0.4], idle: 0.12 }), () => {
      S.paint(fill(CREAM, { rough: 0.45 }), under(0.14));
      S.tube(spline([[5, 11, 1], [8.4, 14, 2], [9.6, 19, 2.6]], 3), 1.6, { sides: 8 });
      S.paint(fill(RED, { rough: 0.4 }));
      S.at([9.6, 19.4, 2.6], [-Math.PI / 2, 0, -0.2], () => paw(S, [0, -1, -1.2], 3.2, 3.4, 1.8, { toes: 3 }));
    });
  }, 1.25);
}

// ------------------------------------------------------------------ 2. Planet Nap
export function nap(S) {
  S.dens = DENS;
  const SEA = 0x7ac0e8, LAND = 0x8ccf6a, SAND = 0xf2dc96;
  base(S, 16);
  S.paint(fill(GOLD, { rough: 0.3 }), under(0.2));
  S.lathe(spline([[3.4, 5.2], [2.2, 6.4], [1.2, 9], [1.2, 13], [2, 14]], 2), { segs: 12 });
  // the planet turns under the cat (the gimmick spins it)
  S.joint('planet', L(S, { pivot: [0, 0, 0], axis: 'y', min: -7, max: 7, rest: 0, g: [0, Math.PI], idle: 0.3 }), () => {
    const land = blobs(blob([-8, 28, 8], [7, 5, 6]), blob([6, 22, 9], [5, 6, 5]), blob([9, 31, -6], [5, 4, 6]), blob([-6, 20, -9], [6, 4, 5]), blob([0, 36, 2], [7, 2.6, 7]));
    S.paint(fill(SEA, { rough: 0.35 }), vol(land, LAND), vol(blobs(blob([6, 22, 9], [3, 3, 3]), blob([-6, 20, -9], [3, 2, 3])), SAND), vol(blob([0, 37.6, 0], [6, 1.6, 6]), 0xfbfbf8), under(0.1), crown(0.05));
    S.ball([0, 26, 0], 12, { segs: 24, rings: 14 });
    S.paint(fill(0xfbfbf8, { rough: 0.6 }), under(0.1));
    for (const [a, y] of [[0.4, 24], [2.6, 30], [4.4, 21]]) S.at([Math.sin(a) * 12.4, y, Math.cos(a) * 12.4], [0, a, 0], () => S.ball([0, 0, 0], [3.4, 1.2, 1], { segs: 8, rings: 4 }));
  });
  // the cat, curled on top, a flag it planted and forgot
  const FUR = 0xf2b46a;
  S.paint(fill(FUR), vol(blobs(blob([-3, 41, 2], [3, 2, 3]), blob([4, 40, -3], [3, 2, 4])), tone(FUR, 0.2)), under(0.14), crown(0.05));
  loaf(S, [0, 39.2, -1], [6, 3.4, 7.4], { flat: 0.6 });
  S.paint(fill(FUR), under(0.12));
  S.tube(spline([[4, 37.8, -7], [7.4, 38, -2], [6, 38.4, 4], [2, 38.6, 6.4]], 3), 1.3, { sides: 8 });
  S.at([-1.6, 40.4, 5.6], [0.25, -0.2, 0.6], () => catHead(S, { fur: FUR, muzzle: 0xfbf2e2, marks: [vol(blob([0, 6, 0], [4, 2, 6]), tone(FUR, 0.2))] }, { eye: 'closed' }), 0.78);
  S.paint(fill(0xc9ced6, { rough: 0.3 }));
  S.tube([[6, 36.4, 3], [8.6, 48, 4]], 0.4, { sides: 6 });
  S.paint(fill(CREAM, { rough: 0.8 }), proj('front', or(ellipse(10.2, 45.8, 1.4, 0.8), poly([[11.3, 45.8], [12.2, 46.6], [12.2, 45]])), 0x3a6ab8), proj('back', or(ellipse(-10.2, 45.8, 1.4, 0.8), poly([[-11.3, 45.8], [-12.2, 45], [-12.2, 46.6]])), 0x3a6ab8));
  S.at([0, 0, 4.2], [0, 0, 0], () => S.extrude([[8.5, 47.6], [12.6, 47.2], [12.6, 44], [8.3, 44.4]], -0.2, 0.2));
}

// ------------------------------------------------------------------ 3. Neko Rocket No.1
export function rocket(S) {
  S.dens = DENS;
  base(S, 17, [[-12, 4, 1.4], [10, 9, 1.1], [-5, -12, 1.6], [12, -6, 0.9]]);
  // the rocket lifts off (a slide), with its flame of clear orange plastic
  S.rest = 0;
  S.joint('lift', L(S, { slide: [0, 9, 0], min: 0, max: 1, rest: 0, g: [0, 1] }), () => {
    S.clear(true);
    S.paint(fill(0xf6a03a, { rough: 0.2 }));
    S.lathe(spline([[0, 5.6], [2.6, 6.6], [4.2, 9], [4.6, 12], [3.6, 14]], 2), { segs: 14 });
    S.clear(false);
    const fins = [0, 1, 2].map((k) => k * Math.PI * 2 / 3 + Math.PI / 2);
    // the body: cream with a red nose, a porthole with a cat in it, rivets in rows
    const rivets = or(...[-1, 1].flatMap((s) => [16, 22, 34, 40].map((y) => circle(s * 4.8, y, 0.3))));
    S.paint(fill(CREAM, { rough: 0.4 }), vol(above(41), RED, { rough: 0.35 }), vol(band(14, 15.6), RED, { rough: 0.35 }), vol(band(40, 41), 0xc9ced6), proj('front', rivets, tone(CREAM, 0.25)), proj('back', label('NEKO-1', 0, 30, 0.4), RED, { hard: true }), proj('back', kana('ねこ号', 0, 24, 3.2), RED), under(0.14), crown(0.06));
    S.lathe(spline([[3.6, 14], [5.4, 15], [6.6, 20], [6.8, 28], [6.2, 36], [4.6, 43], [2.4, 49], [0.6, 52.4], [0, 53]], 3), { segs: 22 });
    S.paint(fill(RED, { rough: 0.35 }), under(0.16));
    for (const a of fins) S.at([Math.cos(a) * 5.6, 0, Math.sin(a) * 5.6], [0, -a, 0], () => S.extrude([[-1.6, 26], [-1.6, 12], [1, 7.4], [6.8, 4.6], [8.2, 6.6], [6.8, 13.4], [2, 22]], -0.9, 0.9, { bevel: 0.4 }));
    S.paint(fill(0xc9ced6, { rough: 0.25 }), under(0.2));
    S.at([0, 29, 6.2], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 3.4, 0.8, { segs: 18, sides: 8 }));
    S.paint(fill(0x2c3a5a, { rough: 0.3 }));
    S.at([0, 29, 5.6], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.4, 0], 3, 0.8, { segs: 16 }));
    S.at([0, 28.4, 4.6], null, () => catHead(S, { fur: 0xb8b4bc, marks: [vol(blob([0, 4, 2], [2, 3, 3]), 0x6a646c)], ear: [0xb8b4bc, 0xb8b4bc] }), 0.36);
    S.clear(true);
    S.paint(fill(0xdcecf4, { rough: 0.05 }));
    S.at([0, 29, 6.4], [Math.PI / 2, 0, 0], () => S.ball([0, 0, 0], [3, 1.2, 3], { segs: 14, rings: 6, v0: 0.5 }));
    S.clear(false);
  });
}

// ------------------------------------------------------------------ 4. Fish Abduction UFO
export function ufo(S) {
  S.dens = DENS;
  const GRASS = 0x7cbf5a, HULL = 0xd6dae2, RIM = 0x8a5bd6;
  S.with({ dens: 0.5 }, () => {
    S.paint(fill(GRASS, { rough: 0.85 }), proj('top', or(...[[-9, 6], [7, -9], [11, 7], [-12, -6], [2, 12]].map(([x, y]) => or(seg(x, y, x - 0.6, y + 2, 0.4), seg(x + 1, y, x + 1.6, y + 2.2, 0.4)))), tone(GRASS, 0.2)), vol(below(3.6), 0x8a6a48, { rough: 0.9 }), under(0.2), ...stamp(MAKER, { c: 0x5a7a4a }));
    S.lathe(spline([[0, 0], [16.4, 0], [17, 1.4], [16.6, 4], [15, 5.4], [0, 5.6]], 2), { segs: 24 });
  });
  // the beam (clear), the fish in it
  S.clear(true);
  S.paint(fill(0xf2f6b0, { rough: 0.1 }));
  S.lathe([[11.6, 5.6], [5.4, 33], [0, 33]], { segs: 20, cap: false });
  S.clear(false);
  S.paint(fill(0x6a9ac8, { rough: 0.35 }), vol(blob([0, 15, 2], [6, 2, 3]), 0xe8eef4), proj('front', or(circle(4.6, 17, 0.7)), EYE), proj('front', arc(3, 16.4, 2.2, -0.9, 0.9, 0.3), tone(0x6a9ac8, 0.3)), under(0.1));
  S.at([0, 16.6, 1], [0, 0, 0.3], () => {
    S.loft([[-5, 0.6, 0.4], [-3, 1.8, 1], [0, 2.8, 1.5], [3.4, 2.4, 1.4], [5.6, 1, 0.8], [6.2, 0.2, 0.3]].map(([x, h, t]) => ring([x, 0, 0], t, h, 10, { axis: 'x' })));
    S.extrude([[-4.6, 0], [-7.6, 2.6], [-7.2, 0], [-7.6, -2.6]], -0.3, 0.3);
  });
  // the saucer turns (the gimmick spins it), its pilot under the dome
  S.joint('saucer', L(S, { pivot: [0, 0, 0], axis: 'y', min: -7, max: 7, rest: 0, g: [0, Math.PI], idle: 0.4 }), () => {
    const lights = or(...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => circle(Math.cos(k * 0.785) * 13.4, -Math.sin(k * 0.785) * 13.4, 0.9)));
    S.paint(fill(HULL, { rough: 0.3 }), vol(band(35.6, 36.6), RIM), proj('bottom', or(stroke(circle(0, 0, 8), 0.6), stroke(circle(0, 0, 11.6), 0.4)), tone(HULL, 0.3)), proj('top', stroke(circle(0, 0, 10.6), 0.4), tone(HULL, 0.25)), under(0.16), crown(0.06));
    S.lathe(spline([[0, 32.2], [6, 32.4], [12, 33.6], [17, 35.6], [17.6, 36.2], [16, 37.4], [10, 38.8], [7.4, 39.4], [0, 39.4]], 2), { segs: 26 });
    S.paint(fill(GOLD, { rough: 0.25 }), proj('top', lights, GOLD));
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; S.ball([Math.cos(a) * 15.4, 36.6, Math.sin(a) * 15.4], [1.1, 0.8, 1.1], { segs: 8, rings: 4 }); }
    S.paint(fill(RIM, { rough: 0.35 }), under(0.2));
    S.cyl([0, 30.6, 0], [3.4, 5.4], 1.8, { segs: 16 });
    S.at([0, 39.6, 0], null, () => {
      S.paint(fill(TEAL, { rough: 0.35 }));
      torso(S, [0, 1.8, 0], [4, 2.6, 3.6], { belly: 0.1 });
      S.at([0, 7.2, 0.4], null, () => catHead(S, { fur: 0x4a4448, muzzle: 0x6a646a, eyeCol: 0xf2d24a, ear: [0x4a4448, 0x4a4448] }), 0.68);
    });
    S.clear(true);
    S.paint(fill(0xdcecf4, { rough: 0.05 }));
    S.ball([0, 39, 0], [8.6, 10.4, 8.6], { segs: 20, rings: 10, v0: 0.5 });
    S.clear(false);
  });
}

// ------------------------------------------------------------------ 5. Moon Rabbit Landing
export function usagi(S) {
  S.dens = DENS;
  const DUST = 0xc8c6c2, WHITE = 0xfbf9f6;
  S.with({ dens: 0.5 }, () => {
    S.paint(fill(DUST, { rough: 0.9 }), proj('top', or(stroke(circle(-9, 7, 3.4), 0.8), stroke(circle(10, -8, 2.4), 0.7), stroke(circle(12, 9, 1.6), 0.5)), tone(DUST, 0.22)), proj('top', or(circle(-9, 7, 2.6), circle(10, -8, 1.7)), tone(DUST, 0.12)), under(0.2), ...stamp(MAKER, { c: 0x7a7a80 }));
    S.lathe(spline([[0, 0], [19, 0], [19.6, 1.4], [18.6, 4.4], [16, 5.6], [8, 6.2], [0, 6.4]], 2), { segs: 24, sz: 0.86 });
  });
  const C = { fur: WHITE, muzzle: 0xfbf4ee, eyeCol: 0xd2404a, suit: CREAM, boot: 0xc9ced6, tailCol: WHITE, ear: [WHITE, WHITE] };
  C.bodyMarks = [proj('front', rbox(0, 8, 2.2, 1.8, 0.5), RED, { near: 2 }), proj('front', circle(0, 8, 0.8), GOLD, { near: 2 }), vol(below(2.4), 0xc9ced6)];
  S.at([-3, 6, 0], [0, 0.25, 0], () => {
    catBody(S, C, { tail: [[0, 3, -5], [0, 4, -6.6], [0.4, 4.4, -7.4]] });
    suit(S, 19.6);
    S.at([0, 19.6, 0.6], null, () => {
      S.paint(fill(WHITE), vol(blob([0, -2.6, 5.8], [4.4, 2.6, 2.6]), 0xfbf4ee), ...face({ at: [0, 0.9], gap: 7, r: 1.45, eye: 'bead', col: 0xd2404a, mouth: 'w', my: 3.4, mw: 2, blush: BLUSH, near: 2 }), under(0.14));
      head(S, [0, 0, 0], [7.6, 6.6, 6.8], { muzzle: 0.3, brow: 0.25, cheek: 0.3, chin: 0.2 });
      S.paint(fill(PINK, { rough: 0.3 }));
      S.ball([0, -1.4, 6.6], [0.7, 0.5, 0.4], { segs: 6, rings: 4 });
      // the ears fold down inside the helmet
      for (const s of [1, -1]) { S.paint(fill(WHITE), proj('front', ellipse(0, 4, 1, 3.2), PINK)); S.at([s * 2.6, 5, -1.6], [-0.45, 0, -s * 0.25], () => blade(S, 9, 3.8, 1.4, { shape: 'leaf', cup: 0.6 })); }
    });
    S.paint(fill(CREAM, { rough: 0.45 }), under(0.14));
    S.tube(spline([[-5, 11, 1], [-7.4, 9, 4], [-5.4, 7.6, 6.4]], 3), 1.6, { sides: 8 });
    S.tube(spline([[5, 11, 1], [7.6, 12, 3.4], [8.6, 14.6, 4.6]], 3), 1.6, { sides: 8 });
  });
  // the flag with a carrot on it: the gimmick makes it flap
  S.paint(fill(0xc9ced6, { rough: 0.25 }), under(0.2));
  S.tube([[6, 4, 4], [6, 34, 4]], 0.55, { sides: 8 });
  S.ball([6, 34.4, 4], 0.9, { segs: 8, rings: 5 });
  S.paint(fill(0xc9ced6, { rough: 0.3 }));
  S.at([5.4, 18.6, 4.8], aim([1, 0, 0.4]), () => paw(S, [0, -1, -0.6], 3.2, 3.2, 1.8, { toes: 3 }));
  S.joint('flag', L(S, { pivot: [6, 30, 4], axis: 'y', min: -0.6, max: 0.6, rest: 0, g: [0, 0.4], idle: 0.18 }), () => {
    const carrot = or(poly([[2.6, 1.6], [4, 3], [10.6, -4.4], [9.4, -5]]), ellipse(3.6, 2.4, 1.6, 1.2, 0.8));
    S.paint(fill(0xfbfaf6, { rough: 0.85 }), proj('front', poly([[13.4, 26.4], [14.6, 27.6], [19.8, 21.4], [18.8, 20.8]]), 0xf2902a), proj('front', or(seg(13.6, 27.6, 12.4, 30, 0.6), seg(14.2, 27.8, 14.6, 30.4, 0.6), seg(13, 27.2, 11, 28.6, 0.6)), 0x5fa046), proj('back', poly([[-13.4, 26.4], [-14.6, 27.6], [-19.8, 21.4], [-18.8, 20.8]]), 0xf2902a), under(0.1));
    void carrot;
    const W = (x) => 0.7 * Math.sin(x * 0.5);
    S.loft([0, 1, 2, 3, 4, 5, 6].map((i) => { const x = 6.4 + i * 2.6; return [[x, 33.6, 4 + W(x) - 0.25], [x, 33.6, 4 + W(x) + 0.25], [x, 19.6 + i * 0.2, 4 + W(x) + 0.25], [x, 19.6 + i * 0.2, 4 + W(x) - 0.25]]; }));
  });
}

// ------------------------------------------------------------------ 6. Neko Space Station (rare)
export function station(S) {
  S.dens = DENS;
  base(S, 18);
  S.paint(fill(GOLD, { rough: 0.3 }), under(0.2));
  S.lathe(spline([[3.4, 5.2], [2, 6.6], [1.1, 10], [1.1, 20]], 2), { segs: 12 });
  // the module: a cream drum with four portholes, a crew member in each
  const crew = [[0xec9a48, -9], [0x4a4448, -3], [0xfbf8f2, 3], [0xb8b4bc, 9]];
  S.at([0, 27, 0], [0, 0, Math.PI / 2], () => {
    S.paint(fill(CREAM, { rough: 0.4 }), vol(or_(band(-14, -13), band(13, 14)), RED), vol(or_(band(-5, -4.4), band(4.4, 5)), 0xc9ced6), under(0.12));
    S.lathe(spline([[0, -17.6], [4.4, -17.4], [6, -15.6], [6.6, -13], [6.6, 13], [6, 15.6], [4.4, 17.4], [0, 17.6]], 2), { segs: 20 });
  });
  for (const [c, x] of crew) {
    S.paint(fill(0xc9ced6, { rough: 0.25 }));
    S.at([x, 27, 6.5], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 2.2, 0.55, { segs: 14, sides: 6 }));
    S.paint(fill(0x2c3a5a, { rough: 0.3 }));
    S.at([x, 27, 6.1], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.3, 0], 1.9, 0.6, { segs: 14 }));
    S.at([x, 26.8, 4.4], null, () => catHead(S, { fur: c, ear: [c, c], marks: c === 0xfbf8f2 ? [vol(blob([3, 3, 0], [3, 3, 4]), 0xec9a48)] : [] }, { eye: c === 0x4a4448 ? 'sleepy' : 'dot' }), 0.26);
  }
  // the docking port and its dish
  S.paint(fill(0xc9ced6, { rough: 0.3 }), under(0.2));
  S.cyl([0, 33.4, 0], [2.6, 2], 3.4, { segs: 14 });
  S.paint(fill(0xfbfaf6, { rough: 0.4 }), proj('top', stroke(circle(0, 0, 2.2), 0.3), 0xc9ced6));
  S.lathe(spline([[0.6, 36.8], [3, 37.6], [5, 39.6], [5.4, 40.4]], 2), { segs: 16, cap: false });
  S.lathe(spline([[5.2, 40.4], [4.8, 39.8], [2.8, 38], [0, 37.4]], 2), { segs: 16, cap: false });
  // the solar wings turn to the sun (the gimmick)
  for (const s of [1, -1]) {
    S.paint(fill(0xc9ced6, { rough: 0.3 }));
    S.tube([[s * 17.4, 27, 0], [s * 21.6, 27, 0]], 0.7, { sides: 8 });
    S.joint(s > 0 ? 'wingR' : 'wingL', L(S, { pivot: [0, 27, 0], axis: 'x', min: -1.6, max: 1.6, rest: 0, g: [0, 0.9 * s], idle: 0.1 }), () => {
      const cells = and(rbox(0, 0, 9, 7, 0), or(repeatU(rbox(0, 0, 0.25, 9, 0), 3), repeatV(rbox(0, 0, 12, 0.25, 0), 3.5)));
      S.paint(fill(0x3a5ab8, { rough: 0.2 }), proj('front', cells, 0xc9ced6), proj('back', cells, 0xc9ced6), under(0.2));
      S.at([s * 31, 27, 0], null, () => S.box(-9.6, -7.6, -0.4, 9.6, 7.6, 0.4, { bevel: 0.2 }));
    });
  }
}

// ------------------------------------------------------------------ 7. Saturn Ring Ride (ultra)
export function saturn(S) {
  S.dens = DENS;
  base(S, 20);
  S.paint(fill(GOLD, { rough: 0.3 }), under(0.2));
  S.lathe(spline([[3.4, 5.2], [2, 6.6], [1.2, 10], [1.2, 16]], 2), { segs: 12 });
  const P = [0, 31, 0], TILT = 0.38;
  S.paint(fill(0xf2c27a, { rough: 0.4 }), vol(or_(band(-6, -3.6), band(3, 4.6)), 0xe2925a), vol(or_(band(-1.4, 0), band(7.4, 9)), 0xf6dca8), vol(above(10.4), 0xe8b06a), under(0.1), crown(0.04));
  S.at(P, [0, 0, TILT], () => S.ball([0, 0, 0], 14, { segs: 24, rings: 14 }), 1);
  // the ring turns round the planet (the gimmick), with the crew riding it
  S.joint('ring', L(S, { pivot: P, axis: [-Math.sin(TILT), Math.cos(TILT), 0], min: -7, max: 7, rest: 0, g: [0, 1.6], idle: 0.3 }), () => S.at(P, [0, 0, TILT], () => {
    S.paint(fill(0xd8c8f4, { rough: 0.35 }), proj('top', or(stroke(circle(0, 0, 21), 0.5), stroke(circle(0, 0, 24.4), 0.7)), 0xb8a4e4), proj('bottom', stroke(circle(0, 0, 22.6), 0.8), 0xb8a4e4), under(0.14));
    S.lathe([[18, -0.7], [27.4, -0.4], [27.8, 0], [27.4, 0.4], [18, 0.7], [18, -0.7]], { segs: 36, cap: false });
    const cat = (a, fur, marks, collar) => S.at([Math.cos(a) * 23, 0.6, Math.sin(a) * 23], [0, -a + Math.PI / 2, 0], () => {
      catBody(S, { fur, bodyMarks: marks }, { tail: [[0, 2.2, -4.4], [2, 3.6, -8], [3, 7.6, -9]] });
      S.paint(fill(collar, { rough: 0.4 }));
      S.torus([0, 12, 0.2], 3.6, 0.7, { segs: 14, sides: 6 });
      S.paint(fill(GOLD, { rough: 0.25 }));
      S.ball([0, 11.2, 3.8], 0.9, { segs: 8, rings: 5 });
      S.at([0, 17.4, 0.6], null, () => catHead(S, { fur, marks, ear: [fur, fur] }, { r: [6.6, 5.6, 5.8] }));
    }, 0.72);
    cat(1.2, 0xec9a48, [vol(blob([0, 20, 2], [2, 3, 5]), tone(0xec9a48, 0.25))], TEAL);
    cat(3.4, 0x4a4448, [], RED);
    cat(5.2, 0xb8b4bc, [vol(blob([3, 6, 0], [3, 4, 4]), 0xfbf8f2)], GOLD);
  }));
}

// ------------------------------------------------------------------ 8. Cosmic Cat (secret)
export function cosmic(S) {
  S.dens = DENS;
  const COAT = 0x2a2448, MOON = 0xf6e6a2;
  base(S, 18, [[-12, 5, 1.6], [11, 10, 1.3], [12, -7, 1.9], [-7, -12, 1.2], [3, 14, 1]]);
  // the crescent it sits in, cradle-wise, on a gold stem
  S.paint(fill(GOLD, { rough: 0.3 }), under(0.2));
  S.lathe(spline([[3.4, 5.2], [2, 6.6], [1.2, 10], [1.2, 14.6]], 2), { segs: 12 });
  S.paint(fill(MOON, { rough: 0.45 }), proj('front', or(stroke(circle(-11, 22, 1.4), 0.4), circle(9, 17.6, 1), circle(13.4, 24, 0.8), circle(-6, 16.4, 0.7)), tone(MOON, 0.16)), under(0.12), crown(0.05));
  const C0 = [0, 30], R = 17, N = 16, P = (t, w) => { const a = Math.PI - 0.25 + t * (Math.PI + 0.5); return [C0[0] + Math.cos(a) * (R - w), C0[1] + Math.sin(a) * (R - w)]; };
  for (let i = 0; i < N; i++) { const t0 = i / N, t1 = (i + 1) / N, w = (t) => 0.5 + 5.4 * Math.sin(Math.PI * t); S.extrude([P(t0, 0), P(t1, 0), P(t1, w(t1)), P(t0, w(t0))], -4.4, 4.4, { bevel: 1 }); }
  // the cat: a coat full of galaxy, the face of one who has seen it all
  const galaxy = [vol(blobs(blob([-3, 8, -4], [4, 3, 3]), blob([3, 14, -3], [3, 4, 3])), 0x5a3a8a), proj('back', or(star(-2, 9, 0.8, 4, 0.3), star(2, 13, 0.6, 4, 0.3), circle(0, 5, 0.3), circle(-3, 14, 0.3), circle(3, 7, 0.3)), 0xf8f0d8), proj('left', or(star(0, 9, 0.7, 4, 0.3), circle(2, 12, 0.3), circle(-2, 5, 0.3)), 0xf8f0d8), proj('right', or(star(-1, 11, 0.7, 4, 0.3), circle(2, 6, 0.3), circle(-2, 13, 0.3)), 0xf8f0d8)];
  S.at([0, 18.4, 0.6], [0, -0.2, 0], () => {
    catBody(S, { fur: COAT, bodyMarks: [...galaxy, vol(blob([0, 8, 5], [3.4, 4, 2]), 0x8a7ac8)] }, { tail: [[0, 2.4, -4.6], [-4, 2, -7], [-8, 5, -5], [-9, 10, -3]] });
    S.joint('head', L(S, { pivot: [0, 13, 0], axis: 'y', min: -0.6, max: 0.6, rest: 0, g: [0, 0.5], idle: 0.03 }), () => S.at([0, 18.4, 0.6], [0.05, 0, 0], () => catHead(S, {
      fur: COAT, muzzle: 0x8a7ac8, blush: null, ear: [COAT, COAT],
      marks: [vol(blobs(blob([-3, 3, -3], [3, 2, 3]), blob([4, 1, -4], [2, 3, 3])), 0x5a3a8a), proj('back', or(star(-2, 2, 0.7, 4, 0.3), circle(2, 4, 0.3), circle(1, -1, 0.3)), 0xf8f0d8)],
    }, { eye: 'stare' })));
  });
  // a little orbit of its own
  S.paint(fill(GOLD, { rough: 0.25 }));
  S.at([0, 38.4, 1], [0.35, 0, 0.1], () => S.torus([0, 0, 0], 9.4, 0.35, { segs: 28, sides: 5 }));
  S.paint(fill(0x8fd3ff, { rough: 0.3 }), crown(0.2));
  S.ball([9.2, 38.6, 4.6], 1.3, { segs: 10, rings: 6 });
  S.paint(fill(0xff9fd0, { rough: 0.3 }), crown(0.2));
  S.ball([-7.6, 37.6, -2.8], 1, { segs: 10, rings: 6 });
}

void tint; void halfBelow; void halfAbove; void label; void kana; void ellipse; void arc; void all;
