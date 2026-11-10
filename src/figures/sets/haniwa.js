// Haniwa Pets (はにわん): the household animals of the burial-mound age, in red clay, exactly as surprised as the day
// they were fired. Each stands on a museum plinth with its exhibit card. Sculpt programs in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/haniwa.js.
import { spline, ring } from '../sculpt.js';
import { head, torso, loaf, blade } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, or, stroke, pair, all, repeatU, repeatV, label, kana, band, below, above, blob, blobs, spots,
} from '../paint.js';

const MAKER = 'MOGURA';
const CLAY = 0xcf8f62, HOLE = 0x4a2a22;
const clay = (c = CLAY, extra = []) => [fill(c, { rough: 0.9 }), shade(vol(spots(18, { y0: 6, y1: 40, R: 9, r: [0.6, 0.5, 0.6] })), 0.1), ...extra, under(0.16), crown(0.08)];
/** Hole eyes and mouth, punched into the clay (front-projected at (cx, cy) in the frame you are in). */
function holes(cx, cy, { gap = 5, r = 1.2, mouth = [1.4, 0.9], my = 3.4, near } = {}) {
  const P = { near, facing: 0.1 };
  return [
    proj('front', pair(ellipse(gap / 2, cy, r, r * 0.8)), HOLE, P), proj('front', pair(ellipse(gap / 2, cy - r * 0.15, r * 0.6, r * 0.45)), 0x2a1814, P),
    proj('front', ellipse(cx, cy - my, mouth[0], mouth[1]), HOLE, P), proj('front', ellipse(cx, cy - my - mouth[1] * 0.15, mouth[0] * 0.55, mouth[1] * 0.5), 0x2a1814, P),
  ];
}
/** The museum plinth: walnut, with a printed exhibit card. */
function plinth(S, r, card, d = r) {
  S.paint(fill(0x5a3a2a, { rough: 0.5 }), proj('front', repeatV(rbox(0, 0, 40, 0.15, 0), 1.2), tone(0x5a3a2a, 0.12)), under(0.2), crown(0.12), ...stamp(MAKER, { c: 0x2a1e18 }));
  S.box(-r, 0, -d, r, 4.4, d, { bevel: 1 });
  S.paint(fill(0xf6f0e0, { rough: 0.8 }), proj('front', kana(card, 0, 2.6, 2.6), 0x3a3034), proj('front', label('5TH C.', 0, 0.9, 0.3), 0x6a6470, { hard: true }));
  S.at([r - 7, 4.4, d - 1], [-0.5, 0, 0], () => S.box(-5, 0, -0.3, 5, 4.2, 0.3));
}

// ------------------------------------------------------------------ 1. Haniwa Dog
export function inu(S) {
  plinth(S, 22, 'いぬ形埴輪', 13);
  S.paint(...clay(CLAY, [wrap(5, repeatV(rbox(0, 0, 40, 0.2, 0), 2.2), tone(CLAY, 0.06))]));
  for (const [x, z] of [[-9, 4.6], [9, 4.6], [-9, -4.6], [9, -4.6]]) S.lathe(spline([[3, 4.4], [2.8, 6], [2.6, 12], [3, 15]], 2), { segs: 14, at: [x, 0, z] });
  S.paint(...clay());
  S.at([0, 18.6, 0], [0, Math.PI / 2, 0], () => loaf(S, [0, 0, 0], [6.6, 5.4, 13], { flat: 0.9 }));
  // the collar and its bell
  S.paint(...clay(tone(CLAY, 0.06), [wrap(4, repeatU(circle(0, 0, 0.4), 2), tone(CLAY, 0.3))]));
  S.at([10, 21.6, 0], [0, 0, -0.9], () => S.torus([0, 0, 0], 4.6, 0.9, { segs: 16, sides: 5 }));
  S.ball([13.4, 18, 0], 1.6, { segs: 10, rings: 6 });
  // the tail: curled up and over
  S.joint('tail', { pivot: [-12, 21, 0], axis: 'x', min: -0.5, max: 0.5, rest: 0, idle: 0.35 }, () => {
    S.paint(...clay());
    S.tube(spline([[-12, 21, 0], [-15, 25, 0], [-14, 29.4, 0], [-10.6, 29, 0], [-10.4, 26, 0]], 4), [2.2, 2, 1.6, 1.3, 0.9], { sides: 8 });
  });
  // the head: it turns to look at you
  S.rest = 0;
  S.joint('head', { pivot: [10, 24, 0], axis: 'y', min: -1.2, max: 0.4, rest: 0, g: [0, 1.0] }, () => S.at([13.6, 28.4, 0], [0, Math.PI / 2, 0], () => {
    S.paint(...clay(CLAY, holes(0, 1.6, { gap: 5.4, r: 1.2, mouth: [1.2, 0.8], my: 4 })));
    head(S, [0, 0, 0], [5.4, 5.4, 6], { muzzle: 0.7, brow: 0.3, cheek: 0.1, chin: 0.2, pow: 2.2 });
    S.paint(...clay());
    for (const s of [1, -1]) S.at([s * 3.4, 4.2, -1.4], [-0.15, 0, -s * 0.25], () => blade(S, 5.4, 4, 1.6, { shape: 'ear', cup: 0.4 }));
  }));
}

// ------------------------------------------------------------------ 2. Haniwa Rooster
export function tori(S) {
  plinth(S, 15, 'にわとり形埴輪');
  // the cylinder it stands on, with its band of holes
  S.paint(...clay(CLAY, [vol(band(13, 14.6), tone(CLAY, 0.12)), wrap(7.2, repeatU(circle(0, 9, 1.3), 11.3), HOLE)]));
  S.lathe(spline([[7, 4.4], [7.4, 5.2], [6.8, 12], [7.4, 15], [7.2, 16]], 2), { segs: 18 });
  // the bird: a round body, a fan of tail feathers
  S.paint(...clay(CLAY, [proj('left', or(arc(0, 23, 4, 0.4, 2.4, 0.5), arc(1.4, 21.6, 4, 0.6, 2.2, 0.5)), tone(CLAY, 0.2)), proj('right', or(arc(0, 23, 4, 0.7, 2.7, 0.5), arc(-1.4, 21.6, 4, 0.9, 2.5, 0.5)), tone(CLAY, 0.2))]));
  S.at([0, 22.4, 0], [0, 0, 0], () => S.ball([0, 0, 0], [7, 7, 9.4], { segs: 18, rings: 9 }));
  S.paint(...clay());
  for (let k = 0; k < 5; k++) S.at([0, 23, -6.4], [-0.5 - k * 0.22, 0, 0], () => S.at([0, 0, 0], [0, Math.PI / 2, 0], () => blade(S, 12 - Math.abs(k - 2) * 1.4, 4.4, 1.6, { shape: 'leaf', cup: 0.4 })));
  for (const s of [1, -1]) S.at([s * 6.4, 23, 0], [0.2, 0, s * 2.6], () => S.at([0, 0, 0], [Math.PI / 2, 0, 0], () => blade(S, 8, 5.4, 1.4, { shape: 'wing', cup: 0.4 })));
  // the head on its neck, the comb and the wattle; it nods
  S.rest = 0;
  S.joint('head', { pivot: [0, 26, 6], axis: 'x', min: -0.2, max: 0.7, rest: 0, g: [0, 0.6] }, () => {
    S.paint(...clay());
    S.tube(spline([[0, 26, 6], [0, 30, 7.6], [0, 33, 8]], 2), [3.4, 2.8, 2.6], { sides: 10 });
    S.at([0, 35, 8.4], null, () => {
      S.paint(...clay(CLAY, holes(0, 0.6, { gap: 4, r: 0.9, mouth: [0.01, 0.01] })));
      head(S, [0, 0, 0], [3.6, 3.6, 3.8], { muzzle: 0.2, brow: 0.3, cheek: 0.1 });
      S.paint(...clay(tone(CLAY, 0.06)));
      S.at([0, -0.6, 3.6], [Math.PI / 2 - 0.3, 0, 0], () => S.cone([0, 0, 0], 1.3, 2.6, { segs: 8, sz: 0.7 }));
      S.at([0, 2.6, -0.6], [0, Math.PI / 2, 0], () => S.extrude([[-3, 0], [3.4, 0], [3.6, 2.6], [2.2, 1.6], [1.2, 3.4], [0, 1.8], [-1, 3.6], [-2, 1.6], [-3.4, 2.8]], -0.9, 0.9, { bevel: 0.4 }));
      S.at([0, -3, 2.4], null, () => S.ball([0, 0, 0], [1.2, 1.8, 0.9], { segs: 8, rings: 5 }));
    });
  });
}

// ------------------------------------------------------------------ 3. Haniwa Cat
export function neko(S) {
  plinth(S, 14, 'ねこ形埴輪');
  S.paint(...clay(CLAY, [wrap(8, repeatV(rbox(0, 0, 40, 0.2, 0), 2.4), tone(CLAY, 0.06))]));
  torso(S, [0, 15, -1], [9, 10.6, 7.6], { belly: 0.12, hips: 1.12, sit: 0.44 });
  // front legs as two stubby columns, the tail round the feet
  for (const s of [1, -1]) S.lathe(spline([[2, 4.4], [2.2, 6], [2, 12], [2.2, 15]], 2), { segs: 12, at: [s * 3.4, 0, 4.6] });
  S.tube(spline([[-7, 6, -6], [-9, 5.6, 0], [-6, 5.4, 6], [-1, 5.6, 7.4]], 3), [2, 1.8, 1.4, 1], { sides: 8 });
  // a clay fish it is keeping for later
  S.paint(...clay(tone(CLAY, 0.08), [proj('front', circle(4.6, 7.2, 0.5), HOLE)]));
  S.at([1.6, 7, 7.4], [0, 0, 0.1], () => S.extrude([[5, 0], [2, 1.8], [-1.6, 1.6], [-3.4, 0.4], [-5, 1.8], [-5, -1.8], [-3.4, -0.4], [-1.6, -1.6], [2, -1.8]], -1.2, 1.2, { bevel: 0.6 }));
  S.rest = 0;
  S.joint('head', { pivot: [0, 24, 0], axis: 'z', min: -0.4, max: 0.4, rest: 0, g: [0, 0.3] }, () => S.at([0, 30.4, 0.6], null, () => {
    S.paint(...clay(CLAY, [...holes(0, 0.6, { gap: 5.6, r: 1.25, mouth: [0.9, 0.7], my: 3.6 }), proj('front', pair(or(seg(3.4, -2.2, 6.6, -1.6, 0.35), seg(3.4, -3, 6.4, -3.6, 0.35))), tone(CLAY, 0.3))]));
    head(S, [0, 0, 0], [6.4, 5.6, 5.4], { muzzle: 0.3, brow: 0.2, cheek: 0.3, chin: 0.2, pow: 2.3 });
    for (const s of [1, -1]) S.at([s * 3.8, 4, -0.6], [0, 0, -s * 0.42], () => blade(S, 5, 4.6, 1.6, { shape: 'ear', cup: 0.5 }));
  }));
}

// ------------------------------------------------------------------ 4. Haniwa Boar and piglet
export function buta(S) {
  const DARKC = tone(CLAY, 0.1);
  plinth(S, 22, 'いのしし形埴輪', 13);
  S.paint(...clay(DARKC));
  for (const [x, z] of [[-8, 4], [8, 4], [-8, -4], [8, -4]]) S.lathe(spline([[2.6, 4.4], [2.4, 6], [2.4, 10], [2.8, 13]], 2), { segs: 12, at: [x, 0, z] });
  // the boar: a barrel of a body with a bristle ridge
  S.paint(...clay(DARKC, [proj('top', repeatU(rbox(0, 0, 0.3, 1.4, 0), 1.6, -12, 10), tone(DARKC, 0.3))]));
  S.at([0, 17, 0], [0, Math.PI / 2, 0], () => loaf(S, [0, 0, 0], [7.4, 6.4, 13.6], { flat: 0.95 }));
  S.at([-1, 23, 0], [0, 0, 0], () => S.extrude([[-10, 0], [-6, 1.6], [-2, 2.2], [3, 2.2], [7, 1.4], [10, 0]], -1, 1, { bevel: 0.5 }));
  S.tube(spline([[-13, 18, 0], [-15, 16.6, 0], [-15.6, 14, 0.4]], 2), [0.9, 0.5], { sides: 6 });
  S.rest = 0;
  S.joint('head', { pivot: [10, 18, 0], axis: 'y', min: -0.6, max: 0.6, rest: 0, g: [0, 0.5] }, () => S.at([15, 17.6, 0], [0, Math.PI / 2, 0], () => {
    S.paint(...clay(DARKC, holes(0, 2.2, { gap: 5.4, r: 1, mouth: [0.01, 0.01] })));
    head(S, [0, 0, 0], [5.6, 5.6, 6.4], { muzzle: 0.9, brow: 0.3, cheek: 0.1, chin: 0.1, pow: 2.4 });
    S.paint(...clay(DARKC, [proj('front', pair(ellipse(1, -1.6, 0.6, 0.8)), HOLE)]));
    S.at([0, -1.4, 6.4], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.6, 0], 2.6, 1.6, { segs: 12 }));
    S.paint(...clay(0xf2e2c4));
    for (const s of [1, -1]) S.tube(spline([[s * 2.4, -3.2, 5.6], [s * 3.6, -2.4, 7], [s * 3.6, -0.6, 7.6]], 2), [0.8, 0.3], { sides: 5 });
    S.paint(...clay(DARKC));
    for (const s of [1, -1]) S.at([s * 4, 4, -1.6], [0, 0, -s * 0.5], () => blade(S, 4, 3.4, 1.4, { shape: 'ear', cup: 0.4 }));
  }));
  // the piglet at its feet: striped, the same face
  S.paint(...clay(tint(CLAY, 0.1), [vol(blobs(...[-2, 0.4, 2.8].map((z) => blob([8, 7, z + 8], [4, 4, 0.5]))), tone(CLAY, 0.2)), ...holes(12.4, 8, { gap: 2.4, r: 0.5, mouth: [0.01, 0.01], near: 12 })]));
  S.at([0, 0, 0], [0, -0.6, 0], () => {
    S.at([6, 7.4, 13], [0, Math.PI / 2, 0], () => loaf(S, [0, 0, 0], [3.2, 2.8, 5.6], { flat: 0.9 }));
    for (const [x, z] of [[3.4, 11.6], [8.6, 11.6], [3.4, 14.4], [8.6, 14.4]]) S.lathe([[1, 4.4], [0.9, 5.4], [1, 6.6]], { segs: 10, at: [x, 0, z] });
    S.at([12, 8, 13], [0, Math.PI / 2, 0], () => { head(S, [0, 0, 0], [2.6, 2.6, 2.8], { muzzle: 0.8, brow: 0.2 }); S.cyl([0, -0.4, 2.6], 1.2, 0.8, { segs: 10 }); });
  });
}

// ------------------------------------------------------------------ 5. Haniwa Horse (ultra)
export function uma(S) {
  const SADDLE = tone(CLAY, 0.08);
  plinth(S, 26, 'かざり馬形埴輪', 14);
  S.paint(...clay());
  for (const [x, z] of [[-11, 5], [11, 5], [-11, -5], [11, -5]]) S.lathe(spline([[3, 4.4], [2.6, 6], [2.4, 14], [2.8, 18]], 2), { segs: 14, at: [x, 0, z] });
  // the body, the saddle and its fringe of bells
  S.paint(...clay(CLAY, [wrap(7, repeatV(rbox(0, 0, 40, 0.2, 0), 2.4), tone(CLAY, 0.05))]));
  S.at([0, 22, 0], [0, Math.PI / 2, 0], () => loaf(S, [0, 0, 0], [7.4, 6.4, 16], { flat: 0.95 }));
  S.paint(...clay(SADDLE, [proj('right', or(...[-6, -2, 2, 6].map((u) => circle(u, 24, 0.7))), HOLE), proj('left', or(...[-6, -2, 2, 6].map((u) => circle(u, 24, 0.7))), HOLE), proj('top', stroke(rbox(0, 0, 5, 7.4, 2), 0.6), tone(SADDLE, 0.3))]));
  S.at([-1, 28, 0], null, () => S.ball([0, 0, 0], [7, 2.6, 8.4], { segs: 16, rings: 6 }));
  S.box(-1.6, 28, -8.6, -0.4, 31.4, 8.6, { bevel: 0.5 });
  S.box(-6.4, 28, -1.2, -5, 30.6, 1.2, { bevel: 0.4 });
  for (const s of [1, -1]) for (let k = 0; k < 4; k++) { S.paint(...clay(tone(CLAY, 0.12))); S.ball([-6 + k * 4, 22.6, s * 7.4], 1.2, { segs: 8, rings: 5 }); }
  S.paint(...clay());
  S.tube(spline([[-15.6, 24, 0], [-18.4, 21, 0], [-19, 15, 0.4]], 2), [1.6, 1.2, 0.6], { sides: 8 });
  // the neck, the head with its bridle and the plaited forelock; it nods
  S.rest = 0;
  S.joint('head', { pivot: [12, 24, 0], axis: 'z', min: -0.5, max: 0.2, rest: 0, g: [0, -0.4] }, () => {
    S.paint(...clay(CLAY, [proj('top', repeatU(rbox(0, 0, 0.6, 2, 0), 1.6, 10, 22), tone(CLAY, 0.18))]));
    S.tube(spline([[11, 24, 0], [15, 30, 0], [18, 35, 0]], 2), [4.4, 3.6, 3.2], { sides: 12 });
    S.at([19.4, 37.6, 0], [0, Math.PI / 2, 0.55], () => {
      S.paint(...clay(CLAY, [...holes(0, 1.4, { gap: 5.6, r: 1, mouth: [0.01, 0.01] }), proj('front', pair(ellipse(1.2, -5.2, 0.5, 0.7)), HOLE)]));
      head(S, [0, 0, 0], [4.4, 4.6, 7.6], { muzzle: 0.9, brow: 0.3, cheek: 0.1, chin: 0.2, pow: 2.4 });
      S.paint(...clay(SADDLE, [wrap(4.6, repeatU(circle(0, 0, 0.45), 2.2), tone(SADDLE, 0.3))]));
      S.at([0, -1, 2.4], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 4.6, 0.7, { segs: 16, sides: 5 }));
      S.ball([4.6, -1, 2.4], 1.1, { segs: 8, rings: 5 });
      S.paint(...clay());
      for (const s of [1, -1]) S.at([s * 2.6, 4, -2.6], [0, 0, -s * 0.2], () => blade(S, 4, 2.4, 1.2, { shape: 'ear', cup: 0.3 }));
      S.at([0, 4.6, -0.6], [-0.6, 0, 0], () => S.extrude([[-1.4, 0], [1.4, 0], [0.8, 4.6], [-0.8, 4.6]], -0.8, 0.8, { bevel: 0.3 }));
    });
  });
}

// ------------------------------------------------------------------ 6. The Golden Goggle Cat (secret)
export function dogu(S) {
  const GOLD = 0xd8b04a, DEEP = 0x9a7428;
  const incise = (view) => proj(view, or(...[[-3, 14], [3, 14], [0, 9], [-4, 4.6], [4, 4.6]].map(([u, v]) => or(arc(u, v, 1.8, 0, Math.PI * 1.6, 0.4), arc(u, v, 0.8, 0, Math.PI * 1.4, 0.35)))), DEEP);
  plinth(S, 13, '遮光器ねこ土偶');
  // a squat seated figure: wide hips, a patterned body, stubby arms out
  S.paint(fill(GOLD, { rough: 0.3 }), incise('front'), incise('back'), vol(band(7, 7.6), DEEP), under(0.2), crown(0.12));
  S.lathe(spline([[0, 4.4], [8.4, 4.6], [9.6, 7], [8, 12], [6.4, 17], [5.6, 21]], 3), { segs: 22 });
  S.paint(fill(GOLD, { rough: 0.3 }), proj('front', or(arc(0, 0, 1.4, 0, Math.PI * 1.6, 0.35)), DEEP), under(0.2), crown(0.12));
  for (const s of [1, -1]) S.tube(spline([[s * 6, 17, 0], [s * 10, 18.6, 0.6], [s * 12, 17, 1.2]], 2), [2.4, 2, 1.6], { sides: 8 });
  for (const s of [1, -1]) S.at([s * 4.6, 4.4, 4], null, () => S.ball([0, 0, 0], [2.6, 1.8, 3.4], { segs: 10, rings: 5, v0: 0.5 }));
  // the head: goggle eyes, cat ears, a crown of knobs; it turns
  S.rest = 0;
  S.joint('head', { pivot: [0, 21, 0], axis: 'y', min: -0.7, max: 0.7, rest: 0, g: [0, 0.6] }, () => S.at([0, 27, 0.4], null, () => {
    S.paint(fill(GOLD, { rough: 0.3 }), proj('front', or(seg(-2.4, -3.6, 2.4, -3.6, 0.4), seg(0, -2, 0, -3.2, 0.4)), DEEP), under(0.2), crown(0.12));
    head(S, [0, 0, 0], [7, 6, 5.6], { muzzle: 0.1, brow: 0.2, cheek: 0.2, chin: 0.2, pow: 2.4 });
    for (const s of [1, -1]) {
      S.paint(fill(GOLD, { rough: 0.25 }), proj('front', rbox(s * 3.2, 1.2, 2.6, 0.35, 0.2), DEEP), crown(0.2));
      S.at([s * 3.2, 1.2, 4.4], [Math.PI / 2, 0, 0], () => S.lathe(spline([[0, 0], [2.4, 0.4], [3.2, 1.4], [2.8, 2.4], [0, 2.6]], 2), { segs: 16, sz: 0.62 }));
      S.paint(fill(GOLD, { rough: 0.3 }), under(0.16));
      S.at([s * 4.2, 4.6, -0.4], [0, 0, -s * 0.4], () => blade(S, 4.6, 4.4, 1.6, { shape: 'ear', cup: 0.5 }));
    }
    S.paint(fill(GOLD, { rough: 0.3 }), crown(0.15));
    for (let k = -2; k <= 2; k++) S.ball([k * 1.8, 6 - Math.abs(k) * 0.5, -1], 1, { segs: 8, rings: 5 });
  }));
}

void EYE; void face; void ring; void all; void label; void below; void above; void poly; void circle;
