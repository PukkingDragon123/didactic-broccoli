// Capsule Sentai Kapuranger (カプレンジャー): tiny henshin heroes. Sculpt programs, in millimetres (src/figures/sculpt.js);
// the series data is src/data/series/sentai.js. The family look: chibi suits on one body (big capsule helmet with a
// stripe over the top, ear discs and a silver mouth plate, a capsule emblem on the chest, white gloves and boots, a
// black belt with a gold capsule buckle); each hero's visor is its own shape and each has a pose and a prop.
import { spline, ring, swell } from '../sculpt.js';
import { torso, head, paw, blade } from '../anatomy.js';
import {
  fill, proj, vol, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, halfBelow, halfAbove, repeatU, repeatV, label, kana,
  below, above, band, blob, blobs,
} from '../paint.js';
import { aim, limb, personHead, L } from './showa.js';

const DENS = 0.8;
const MAKER = 'KAPU-TOY';
const WHITE = 0xf8f6f0, BLACK = 0x26242c, GOLD = 0xf2c43a, SILVER = 0xc9ced6, VISOR = 0x1e2236;
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const VISORS = {
  red: or(rbox(0, 1.6, 7.4, 2, 1.4), poly([[-2.4, 0.4], [2.4, 0.4], [0, -2.8]])),
  blue: poly([[-7.6, 3.6], [-5, 3.6], [0, -0.6], [5, 3.6], [7.6, 3.6], [0, -3.6]]),
  yellow: or(ellipse(-3.3, 1, 2.9, 2.7), ellipse(3.3, 1, 2.9, 2.7), rbox(0, 1.4, 2, 0.8, 0)),
  pink: or(circle(-2.3, 1.8, 2.6), circle(2.3, 1.8, 2.6), poly([[-4.7, 1], [4.7, 1], [0, -4]])),
  grunt: rbox(0, 1, 7, 0.9, 0.4),
};

/** A white glove at the wrist, along dir: a fist, or open (o.open), the palm turned by roll. */
function glove(S, at, dir, roll = 0, o = {}) {
  S.paint(fill(o.c ?? WHITE, { rough: 0.45 }), under(0.14));
  S.at(at, aim(dir, roll), () => {
    S.at([0, 0, -0.6], [Math.PI / 2, 0, 0], () => S.lathe(spline([[1.7, 0], [2.5, 1.4], [2.5, 2], [1.9, 2.2]], 2), { segs: 12 }));
    if (o.open) { paw(S, [0, -0.9, 1.6], 3.8, 4.4, 1.7, { toes: 4 }); S.tube([[1.6, 0, 2], [2.8, 0.2, 3.6]], 0.7, { sides: 6 }); }
    else { S.box(-1.8, -1.6, 1.4, 1.8, 1.6, 5, { bevel: 1.2 }); S.tube([[1.7, 0.6, 2.2], [1.9, 1.5, 3.8]], 0.7, { sides: 6 }); }
  });
}
/** An arm from the shoulder (side s) through el to the wrist, then the glove. */
function arm(S, C, s, el, wr, o = {}) {
  const sh = [s * 5.4, 25.8, 0];
  S.paint(fill(C.suit, { rough: 0.45 }), vol(blob(sh, [2.6, 2.6, 2.6]), C.trim ?? WHITE), under(0.14));
  limb(S, [sh, el, wr], 2.1, 1.75);
  glove(S, wr, sub3(wr, el), o.roll ?? 0, o);
}
/** The capsule helmet, centred on the frame. */
export function helmet(S, C, visor) {
  S.paint(
    fill(C.suit, { rough: 0.3 }), proj('top', rbox(0, 0, 1.3, 20, 0), C.trim ?? WHITE), proj('back', rbox(0, 4, 1.3, 6, 0), C.trim ?? WHITE),
    proj('front', visor, VISOR, { near: 2, rough: 0.1 }), proj('front', rbox(0, -5, 3, 1.5, 1.2), SILVER, { near: 2, rough: 0.25 }), proj('front', rbox(0, -5, 1.6, 0.25, 0), tone(SILVER, 0.3), { near: 2 }),
    under(0.12), crown(0.08),
  );
  head(S, [0, 0, 0], [8.2, 8.6, 8.2], { muzzle: 0.05, brow: 0.02, cheek: 0.04, chin: 0.15, pow: 2.05 });
  S.paint(fill(SILVER, { rough: 0.25 }), proj('right', stroke(circle(0, 0, 1.6), 0.4), tone(SILVER, 0.3)), proj('left', stroke(circle(0, 0, 1.6), 0.4), tone(SILVER, 0.3)));
  for (const s of [1, -1]) S.at([s * 7.8, 0, 0], [0, 0, -s * Math.PI / 2], () => S.cyl([0, 0, 0], [2.8, 2.4], 1.4, { segs: 16, bevel: 0.4 }));
  S.paint(fill(BLACK, { rough: 0.5 }));
  S.cyl([0, -9.6, -0.6], [3.4, 3.2], 2, { segs: 14 });
}
/** The suit from the boots to the collar (arms and head are posed by each figure). legs: [[hip, knee, ankle, yaw] x 2]. */
function body(S, C, o = {}) {
  const R = { rough: 0.45 };
  const legs = o.legs || [[[3, 15, 0], [3.4, 9.6, 0.8], [3.6, 5, 0], 0.2], [[-3, 15, 0], [-3.4, 9.6, 0.8], [-3.6, 5, 0], -0.2]];
  for (const [hip, knee, ank, yaw] of legs) {
    S.paint(fill(C.suit, R), under(0.14));
    limb(S, [hip, knee, ank], 2.6, 2.1);
    S.paint(fill(C.boot ?? WHITE, R), vol(above(6.4), tone(C.boot ?? WHITE, 0.06)), under(0.16));
    S.at([ank[0], ank[1] - 5, ank[2]], [0, yaw, 0], () => {
      S.loft([[-3.2, 1.8, 2.4], [-1.4, 2.4, 2.8], [1.6, 2.3, 2.4], [3.6, 1.9, 1.6], [4.6, 1.1, 1]].map(([z, w, h]) => ring([0, h, z], w, h, 12, { axis: 'z', pow: 2.6 })));
      S.lathe(spline([[2.2, 2.4], [2.4, 4.4], [2.8, 6.6], [3, 7.2], [2.2, 7.4]], 2), { segs: 12 });
    });
  }
  const emblem = [proj('front', circle(0, 22.4, 2.8), WHITE, { near: 2 }), proj('front', stroke(circle(0, 22.4, 2.8), 0.5), GOLD, { near: 2 }), proj('front', and(rbox(0, 22.4, 1.2, 1.9, 1.2), halfAbove(22.4)), C.suit, { near: 2 }), proj('front', stroke(rbox(0, 22.4, 1.2, 1.9, 1.2), 0.35), BLACK, { near: 2 })];
  S.paint(fill(C.suit, R), vol(band(14.2, 15.8), BLACK), proj('front', or(seg(-6, 27.6, 0, 25, 1.1), seg(6, 27.6, 0, 25, 1.1)), C.trim ?? WHITE, { near: 1 }), ...(o.emblem === false ? [] : emblem), ...(o.paint || []), under(0.14), crown(0.04), ...stamp(MAKER, { c: tone(C.suit, 0.4) }));
  torso(S, [0, 20.8, 0], [5.8, 7.6, 4.4], { belly: 0.06, hips: 0.92, sit: 0.3 });
  S.paint(fill(GOLD, { rough: 0.25 }), proj('front', stroke(rbox(0, 15, 1, 0.6, 0.6), 0.3), tone(GOLD, 0.3)), under(0.2));
  S.box(-2, 13.8, 3.4, 2, 16.2, 5, { bevel: 0.5 });
}

// ------------------------------------------------------------------ 1. Kapu Red: the leader, fist in the air
export function red(S) {
  S.dens = DENS;
  const C = { suit: 0xe0383a };
  S.at([0, 0, 0], null, () => {
    body(S, C, { legs: [[[3, 15, 0], [4.4, 9.4, 1.2], [5, 5, 0], 0.4], [[-3, 15, 0], [-3.8, 9.6, 0.2], [-4.2, 5, -0.4], -0.3]] });
    arm(S, C, -1, [-9.4, 22, 0.6], [-7.4, 17.4, 2.6], { roll: 1.4 });
    S.joint('arm', L(S, { pivot: [5.4, 25.8, 0], axis: 'z', min: -0.6, max: 0.4, rest: 0, g: [0, 0.32], idle: 0.05 }), () => arm(S, C, 1, [9.6, 29.4, 1.4], [10.6, 36, 2.4], { roll: -0.4 }));
    S.at([0, 37, 0.6], [0.05, 0.12, 0.06], () => helmet(S, C, VISORS.red));
  }, 1.15);
}

// ------------------------------------------------------------------ 2. Kapu Blue: cool, calm, blaster ready
export function blue(S) {
  S.dens = DENS;
  const C = { suit: 0x2f6fd6 };
  S.at([0, 0, 0], [0, -0.35, 0], () => {
    body(S, C, { legs: [[[3, 15, 0], [5, 9.6, 2.6], [6, 5, 3], 0.1], [[-3, 15, 0], [-4.2, 9.4, -2], [-4.6, 5, -3.4], -0.5]] });
    S.joint('aim', L(S, { pivot: [0, 25.8, 0], axis: 'x', min: -0.5, max: 0.3, rest: 0, g: [0, -0.28] }), () => {
      arm(S, C, 1, [7, 22.6, 5.6], [2.8, 24, 10.4], { roll: -1.4 });
      arm(S, C, -1, [-6.6, 22.4, 5], [0.6, 22.6, 10.8], { roll: 1.4 });
      // the Kapu Blaster: a capsule with a barrel
      S.paint(fill(SILVER, { rough: 0.3 }), vol(above(26.4), 0x2f6fd6), under(0.2));
      S.at([1.6, 26.2, 15], [Math.PI / 2, 0, 0], () => S.lathe(spline([[0, -5], [2.4, -4.4], [2.9, -2], [2.9, 1.4], [2.2, 3.6], [0, 4.2]], 2), { segs: 14 }));
      S.paint(fill(BLACK, { rough: 0.3 }), proj('front', circle(1.6, 26.2, 0.6), 0x8ad0f0));
      S.at([1.6, 26.2, 19], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], [1.2, 1], 4, { segs: 12 }));
      S.paint(fill(BLACK, { rough: 0.4 }), under(0.2));
      S.at([1.6, 22.4, 13.2], [-0.3, 0, 0], () => S.box(-1, -3.6, -1.2, 1, 1, 1.2, { bevel: 0.4 }));
    });
    S.at([0, 37, 0.6], [0.08, 0.3, 0], () => helmet(S, C, VISORS.blue));
  }, 1.15);
}

// ------------------------------------------------------------------ 3. Kapu Yellow: curry before battle
export function yellow(S) {
  S.dens = DENS;
  const C = { suit: 0xf2b81f };
  S.at([0, 0, 0], null, () => {
    body(S, C);
    // the plate of curry rice in the left hand
    arm(S, C, -1, [-8.6, 21.6, 3.6], [-6, 20.4, 8.6], { roll: 1.6, open: true });
    S.paint(fill(0xfbfaf6, { rough: 0.3 }), proj('top', stroke(circle(0, 0, 6.4), 0.4), 0x3a6ab8), under(0.14));
    S.lathe(spline([[0, 0], [4, 0], [6.4, 0.8], [7.4, 1.6], [7, 1.8], [5, 1.2], [0, 1.1]], 2), { segs: 20, at: [-5.4, 20.6, 10.4] });
    S.paint(fill(0xc8762a, { rough: 0.4 }), proj('top', or(...[[-1, 1], [1.4, -1.6], [-2.2, -1.4]].map(([x, y]) => rbox(x - 5.4, y - 10.4, 0.9, 0.7, 0.3))), 0xe8a84a), under(0.1));
    S.ball([-4, 21.8, 11.6], [4.2, 1.2, 3.6], { segs: 14, rings: 5, v0: 0.5 });
    S.paint(fill(0xfbfaf6, { rough: 0.6 }), proj('top', or(...[[-1, 0], [1, 1], [0.4, -1.2]].map(([x, y]) => ellipse(x - 7.2, y - 9, 0.4, 0.2))), 0xe8e4da), under(0.08));
    S.ball([-7.2, 21.8, 9], [3, 2.2, 2.8], { segs: 12, rings: 7, v0: 0.4 });
    // the spoon goes to the mouth plate (the gimmick)
    S.joint('spoon', L(S, { pivot: [5.4, 25.8, 0], axis: [-0.3, 0, 1], min: -0.4, max: 0.9, rest: 0, g: [0, 0.75] }), () => {
      arm(S, C, 1, [9.4, 21.6, 3], [7.6, 25, 7.4], { roll: -1.2 });
      S.paint(fill(SILVER, { rough: 0.2 }), under(0.2));
      S.tube([[7.6, 24.6, 8.6], [5.6, 29.4, 9.6]], 0.45, { sides: 6 });
      S.at([5.2, 30.8, 9.8], [-0.3, 0, 0.4], () => S.ball([0, 0, 0], [1.4, 1.9, 0.6], { segs: 10, rings: 6 }));
    });
    S.at([0, 37, 0.6], [0.12, 0, 0.04], () => helmet(S, C, VISORS.yellow));
  }, 1.15);
}

// ------------------------------------------------------------------ 4. Kapu Pink: heart baton
export function pink(S) {
  S.dens = DENS;
  const C = { suit: 0xf27ab0 };
  S.at([0, 0, 0], null, () => {
    body(S, C, { legs: [[[3, 15, 0], [3.6, 9.6, 0.6], [3.4, 5, 0], 0.3], [[-3, 15, 0], [-1.8, 9.8, 2.6], [-0.6, 5.4, 2.4], 0.2]], paint: [vol(band(12.6, 14.2), WHITE)] });
    // a little skirt
    S.paint(fill(C.suit, { rough: 0.45 }), vol(band(11.4, 12.2), WHITE), under(0.16));
    S.lathe(spline([[4.6, 15], [5.6, 13.4], [7, 11.4], [6.8, 11]], 2), { segs: 18, cap: false });
    arm(S, C, -1, [-9.2, 22.8, 0], [-7, 17.8, 2.4], { roll: 1.4 });
    S.joint('baton', L(S, { pivot: [5.4, 25.8, 0], axis: 'z', min: -0.5, max: 0.5, rest: 0, g: [0, -0.4], idle: 0.08 }), () => {
      arm(S, C, 1, [9.6, 28.6, 2], [11.6, 34, 3.4], { roll: -0.6 });
      S.paint(fill(WHITE, { rough: 0.3 }), vol(band(40, 41), GOLD));
      S.tube([[11.6, 31, 4.4], [12, 44, 4.6]], 0.6, { sides: 8 });
      S.paint(fill(0xf24a8a, { rough: 0.25 }), proj('front', stroke(or(circle(-1.6, 1, 2), circle(1.6, 1, 2), poly([[-3.4, 0.2], [3.4, 0.2], [0, -3.4]])), 0.5), GOLD), proj('front', ellipse(-1.8, 1.8, 0.8, 0.5, 0.5), 0xfbd0e4), under(0.14));
      S.at([12.2, 48, 4.6], [0, 0, 0], () => S.extrude([[0, -4.6], [3.6, -0.6], [4.4, 1.4], [3.6, 3.2], [1.6, 3.6], [0, 2.4], [-1.6, 3.6], [-3.6, 3.2], [-4.4, 1.4], [-3.6, -0.6]], -1.2, 1.2, { bevel: 0.6 }));
    });
    S.at([0, 37, 0.6], [0.06, -0.15, -0.1], () => helmet(S, C, VISORS.pink));
  }, 1.15);
}

// ------------------------------------------------------------------ 5. Combatant Grunt: "Iii!"
export function grunt(S) {
  S.dens = DENS;
  const C = { suit: BLACK, trim: 0x8a4ad8, boot: BLACK };
  const ribs = or(...[19, 21.4, 23.8].map((y) => seg(-3.6, y, 3.6, y, 0.7)), seg(0, 18, 0, 25, 0.7));
  S.at([0, 0, 0], null, () => {
    body(S, C, { emblem: false, paint: [proj('front', ribs, 0xe8e4f0, { near: 2 }), proj('back', ribs, 0xe8e4f0)], legs: [[[3, 15, 0], [5.4, 10, 1.4], [6.2, 5, 0], 0.5], [[-3, 15, 0], [-5.4, 10, 1.4], [-6.2, 5, 0], -0.5]] });
    S.joint('arms', L(S, { pivot: [0, 25.8, 0], axis: 'x', min: -0.3, max: 0.3, rest: 0, g: [0, -0.2], idle: 0.04 }), () => {
      for (const s of [1, -1]) arm(S, C, s, [s * 10, 28, 1], [s * 11.6, 34.6, 2.4], { roll: s * 0.4, open: true, c: 0x3a3840 });
    });
    S.at([0, 37, 0.6], [-0.08, 0, 0], () => {
      S.paint(fill(BLACK, { rough: 0.35 }), proj('front', VISORS.grunt, 0xd8343a, { near: 2 }), proj('front', rbox(0, 1, 5.4, 0.35, 0), GOLD, { near: 2 }), proj('front', or(...[-2, 0, 2].map((x) => seg(x, -3.4, x, -6, 0.4))), 0x8a4ad8, { near: 2 }), under(0.12), crown(0.06));
      head(S, [0, 0, 0], [7.8, 8.6, 7.8], { muzzle: 0.1, brow: 0.2, cheek: 0.08, chin: 0.25, pow: 2.1 });
      // the purple crest
      S.paint(fill(0x8a4ad8, { rough: 0.35 }), under(0.16));
      S.at([0, 0, 0], [0, Math.PI / 2, 0], () => S.extrude([[-5, 6], [-4.6, 9.2], [-1.4, 12], [3, 12.6], [6.6, 9.4], [7.4, 6.4], [0, 5.6]], -0.9, 0.9, { bevel: 0.4 }));
    });
  }, 1.15);
}

// ------------------------------------------------------------------ 6. Five-Colour Explosion (rare)
export function bakuhatsu(S) {
  S.dens = DENS;
  const C = { suit: 0xe0383a };
  // the quarry: a slab of rock
  S.with({ dens: 0.5 }, () => {
    S.paint(fill(0xb8aa94, { rough: 0.9 }), proj('top', or(seg(-14, 4, -2, 2, 0.4), seg(4, -6, 16, -2, 0.4), seg(-6, -9, -1, -4, 0.35)), tone(0xb8aa94, 0.2)), under(0.2), crown(0.06), ...stamp(MAKER, { c: 0x7a6a5a }));
    for (const [x, z, rx, ry, rz] of [[-6, 2, 16, 4.4, 13], [9, -2, 13, 3.8, 12], [0, -9, 16, 3.4, 8], [-12, -6, 8, 3, 8]]) S.ball([x, 1.6, z], [rx, ry, rz], { segs: 14, rings: 6, v0: 0.36 });
  });
  // five puffs of smoke behind him; the gimmick makes them bloom
  const puff = (c, cx, cz, h, k) => {
    S.paint(fill(c, { rough: 0.7 }), under(0.16), crown(0.12));
    for (const [dx, dy, dz, r] of [[0, 0, 0, 1], [0.7, 0.6, 0.2, 0.75], [-0.6, 0.7, -0.1, 0.8], [0.1, 1.3, 0, 0.7], [0.5, -0.5, 0.4, 0.62], [-0.5, -0.4, 0.3, 0.6]]) S.ball([cx + dx * k, h + dy * k, cz + dz * k], [r * k, r * k * 0.9, r * k * 0.85], { segs: 12, rings: 7 });
  };
  S.part('boom', { rest: 0, move: (t) => swell([0, 4, -12], 1 + 0.18 * t) }, () => {
    puff(0xe8483a, 0, -14, 26, 7.4);
    puff(0x3a7ae0, -15, -9, 16, 6);
    puff(0xf2c43a, 15, -9, 16, 6);
    puff(0xf27ab0, -10, -13, 34, 5);
    puff(0x4ac25a, 10, -13, 34, 5);
  });
  // the leader in his henshin pose
  S.at([0, 5, 2], null, () => {
    body(S, C, { legs: [[[3, 15, 0], [6, 10, 1], [8, 5, 0.6], 0.6], [[-3, 15, 0], [-6, 10, 1], [-8, 5, 0.6], -0.6]] });
    arm(S, C, 1, [10, 25, 3], [12.6, 30.6, 5], { roll: -0.6 });
    arm(S, C, -1, [-7.6, 27.6, 5.4], [-1.6, 30.4, 8.4], { roll: 1.2 });
    S.at([0, 37, 0.6], [0, 0.15, 0], () => helmet(S, C, VISORS.red));
  });
}

// ------------------------------------------------------------------ 7. Gattai Robo Kapu-Oh (ultra)
export function robo(S) {
  S.dens = DENS;
  const NAVY = 0x23305e;
  // the stand
  S.with({ dens: 0.5 }, () => {
    S.paint(fill(NAVY, { rough: 0.45 }), vol(band(3.2, 4), GOLD), proj('top', or(star(-14, 8, 1.6), star(14, 8, 1.6), star(0, -12, 1.4)), GOLD), under(0.2), ...stamp(MAKER, { c: 0x8a92b8 }));
    S.lathe(spline([[0, 0], [21.4, 0], [22, 0.6], [22, 3.6], [21.4, 4.2], [0, 4.2]], 2), { segs: 28 });
  });
  /** A capsule machine as a body part: cabinet, a clear window of capsules, the coin plate. */
  const machine = (x0, y0, z0, x1, y1, z1, col, win = true) => {
    S.paint(fill(col, { rough: 0.35 }), proj('front', rbox((x0 + x1) / 2, y0 + (y1 - y0) * 0.3, (x1 - x0) * 0.32, (y1 - y0) * 0.16, 0.6), SILVER, { near: z1 - 1 }), proj('front', rbox((x0 + x1) / 2, y0 + (y1 - y0) * 0.3, 0.3, (y1 - y0) * 0.08, 0.2), BLACK, { near: z1 - 1 }), under(0.16), crown(0.06));
    S.box(x0, y0, z0, x1, y1, z1, { bevel: 1.2 });
    if (!win) return;
    const cx = (x0 + x1) / 2, cy = y0 + (y1 - y0) * 0.7, w = (x1 - x0) * 0.34, h = (y1 - y0) * 0.2;
    for (const [dx, dy, c] of [[-0.5, -0.4, 0xe8483a], [0.5, -0.5, 0x3a7ae0], [0, 0.3, 0xf2c43a], [-0.6, 0.5, 0x4ac25a], [0.6, 0.4, 0xf27ab0]]) { S.paint(fill(c, { rough: 0.3 }), vol(above(cy + dy * h), WHITE)); S.ball([cx + dx * w, cy + dy * h, z1 - 1.6], 1.6, { segs: 10, rings: 6 }); }
    S.clear(true);
    S.paint(fill(0xdcecf4, { rough: 0.05 }));
    S.box(cx - w * 1.4, cy - h * 1.6, z1 - 0.4, cx + w * 1.4, cy + h * 1.6, z1 + 0.4, { bevel: 0.4 });
    S.clear(false);
  };
  S.at([0, 4.2, 0], null, () => {
    // legs: the blue and the yellow machines, feet below
    for (const [s, c] of [[1, 0xf2c43a], [-1, 0x3a7ae0]]) {
      S.paint(fill(SILVER, { rough: 0.3 }), under(0.2));
      S.box(s * 7 - 5, 0, -5, s * 7 + 5, 3.6, 7.4, { bevel: 1 });
      machine(s * 7 - 4.4, 3.6, -4, s * 7 + 4.4, 20, 4, c);
    }
    // the chest: the big red machine, its crank turns (the gimmick)
    machine(-10.6, 21, -6, 10.6, 41, 6, 0xe0383a, false);
    S.paint(fill(WHITE, { rough: 0.35 }), proj('front', or(star(0, 35.4, 3.2), stroke(circle(0, 35.4, 4.4), 0.6)), GOLD), proj('front', kana('カプオー', 0, 29.4, 2.6), 0xe0383a));
    S.box(-7, 27, 5.6, 7, 39.4, 6.8, { bevel: 0.6 });
    S.paint(fill(BLACK, { rough: 0.4 }));
    S.box(-3, 22.4, 5.4, 3, 25.6, 6.6, { bevel: 0.4 });
    S.joint('crank', L(S, { pivot: [0, 24, 7.4], axis: 'z', min: -7, max: 7, rest: 0, g: [0, Math.PI * 2], idle: 0.1 }), () => {
      S.paint(fill(SILVER, { rough: 0.25 }));
      S.at([0, 24, 6.6], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], 1.6, 1.6, { segs: 12 }));
      S.box(-5.6, 23.2, 7.6, 5.6, 24.8, 8.8, { bevel: 0.6 });
      S.paint(fill(BLACK, { rough: 0.35 }));
      for (const s of [1, -1]) S.at([s * 5, 24, 8.8], [Math.PI / 2, 0, 0], () => S.lathe(spline([[0.9, 0], [1, 1.2], [0.8, 2.4], [0, 2.6]], 2), { segs: 10 }));
    });
    // arms: the pink and the green machines, fists at the end
    for (const [s, c] of [[1, 0x4ac25a], [-1, 0xf27ab0]]) {
      S.paint(fill(SILVER, { rough: 0.3 }), under(0.2));
      S.at([s * 12.6, 37, 0], [0, 0, -s * Math.PI / 2], () => S.cyl([0, -1, 0], 3, 3, { segs: 14 }));
      S.at([s * 16, 30, 0], [0, 0, s * 0.12], () => machine(-3.6, -9, -3.6, 3.6, 9, 3.6, c));
      S.paint(fill(SILVER, { rough: 0.3 }), under(0.2));
      S.box(s * 17 - 3.4, 15, -3.2, s * 17 + 3.4, 20.6, 3.2, { bevel: 1.6 });
    }
    // the head: a capsule with a V crest
    S.paint(fill(WHITE, { rough: 0.3 }), vol(above(49), 0xe0383a), proj('front', rbox(0, 46.4, 4.6, 1.4, 0.8), VISOR, { near: 2, rough: 0.1 }), proj('front', pair(rbox(2.2, 46.4, 1.2, 0.5, 0.3)), GOLD, { near: 2 }), proj('front', rbox(0, 43.4, 2, 1.2, 0.6), SILVER, { near: 2 }), under(0.12), crown(0.08));
    S.lathe(spline([[3, 41], [5.6, 41.6], [6.6, 44], [6.6, 49], [5.4, 52.4], [3, 54.2], [0, 54.6]], 3), { segs: 18 });
    S.paint(fill(GOLD, { rough: 0.25 }), under(0.2));
    S.extrude([[0, 51], [-1.4, 51.4], [-7, 58.4], [-6, 59], [0, 53.4], [6, 59], [7, 58.4], [1.4, 51.4]].map(([x, y]) => [x, y]).slice(0, 4).concat([[0, 53.4]]), 5.4, 7.4, { bevel: 0.3 });
    S.extrude([[0, 51], [1.4, 51.4], [7, 58.4], [6, 59], [0, 53.4]], 5.4, 7.4, { bevel: 0.3 });
  });
}

// ------------------------------------------------------------------ 8. Suit Actor on Break (secret)
export function break_(S) {
  S.dens = DENS;
  const C = { suit: 0xe0383a }, SKIN = 0xeec29c, HAIR = 0x2a2428;
  S.at([0, 0, 0], null, () => {
    // the folding stool
    S.paint(fill(SILVER, { rough: 0.3 }));
    for (const s of [1, -1]) { S.tube([[s * 6, 0, -5], [s * 6, 12.6, 5]], 0.55, { sides: 6 }); S.tube([[s * 6, 0, 5], [s * 6, 12.6, -5]], 0.55, { sides: 6 }); }
    S.paint(fill(0x3a5a8a, { rough: 0.85 }), under(0.2));
    S.box(-7, 12.4, -5.4, 7, 13.4, 5.4, { bevel: 0.3 });
    // the suit, sitting: thighs forward, knees up
    S.paint(fill(C.suit, { rough: 0.45 }), under(0.14));
    for (const s of [1, -1]) {
      limb(S, [[s * 3, 15.4, 0], [s * 4, 15.6, 6], [s * 4.4, 15, 10]], 2.7, 2.4);
      limb(S, [[s * 4.4, 15, 10], [s * 4.8, 10, 10.6], [s * 5, 5.4, 10.4]], 2.4, 2.1);
      S.paint(fill(WHITE, { rough: 0.45 }), under(0.16));
      S.at([s * 5, 0, 10.4], [0, s * 0.2, 0], () => { S.loft([[-3.2, 1.8, 2.4], [-1.4, 2.4, 2.8], [1.6, 2.3, 2.4], [3.6, 1.9, 1.6], [4.6, 1.1, 1]].map(([z, w, h]) => ring([0, h, z], w, h, 12, { axis: 'z', pow: 2.6 }))); S.lathe(spline([[2.2, 2.4], [2.4, 4.4], [2.8, 6.6], [3, 7.2], [2.2, 7.4]], 2), { segs: 12 }); });
      S.paint(fill(C.suit, { rough: 0.45 }), under(0.14));
    }
    S.paint(fill(C.suit, { rough: 0.45 }), vol(band(14.6, 16.2), BLACK), proj('front', or(seg(-6, 28, 0, 25.4, 1.1), seg(6, 28, 0, 25.4, 1.1)), WHITE, { near: 1 }), under(0.14), ...stamp(MAKER, { c: 0x8a2a2a }));
    torso(S, [0, 21.2, -0.6], [5.8, 7.6, 4.4], { belly: 0.12, hips: 0.92, sit: 0.3, lean: 1.4 });
    // a towel round his neck
    S.paint(fill(WHITE, { rough: 0.9 }), vol(band(-0.25, 0.25), 0x3a6ab8), under(0.12));
    S.at([0, 28.4, 0.4], [0.2, 0, 0], () => S.torus([0, 0, 0], 4.2, 1.3, { segs: 18, sides: 8, sy: 0.6 }));
    for (const s of [1, -1]) S.at([s * 2.4, 27, 4.6], [0.1, 0, s * 0.1], () => S.box(-1.4, -7, -0.5, 1.4, 0, 0.5, { bevel: 0.4 }));
    // the helmet, off, resting by the stool
    S.at([-12, 8.4, 4], [0.3, 0.6, 0.2], () => helmet(S, C, VISORS.red), 0.9);
    // left glove on the knee; right hand brings the coffee up (the gimmick)
    arm(S, C, -1, [-8.6, 21, 3], [-5.6, 17.4, 8], { roll: 1.5 });
    S.joint('coffee', L(S, { pivot: [5.4, 25.8, 0], axis: [1, 0.2, 0], min: -1.2, max: 0.2, rest: 0, g: [0, -0.8] }), () => {
      arm(S, C, 1, [8.4, 20.6, 4.6], [5.6, 20.4, 9.8], { roll: -1.6 });
      S.paint(fill(0x8a5a3a, { rough: 0.3 }), vol(band(22.6, 24.8), 0xf2e8d0), proj('front', kana('珈琲', 4.6, 23.7, 1.4), 0x8a5a3a), vol(above(25.6), SILVER, { rough: 0.2 }), under(0.2));
      S.lathe(spline([[0, 18], [1.8, 18], [2, 18.6], [2, 25], [1.6, 26.2], [0, 26.2]], 2), { segs: 14, at: [4.6, 0, 10.6] });
    });
    // his own head: tired, sweaty, a moustache of his own
    S.joint('head', L(S, { pivot: [0, 28.4, 0], axis: 'z', min: -0.2, max: 0.2, rest: 0, idle: 0.04 }), () => S.at([0, 35.4, 0.6], [0.1, -0.1, 0.08], () => {
      personHead(S, SKIN, { paint: [...face({ at: [0, 1.2], gap: 5.2, r: 0.9, eye: 'tired', mouth: null, near: 2 }), proj('front', pair(ellipse(4.8, 3.2, 0.5, 0.8)), 0xbfe0f0, { near: 2 })] });
      S.paint(fill(HAIR, { rough: 0.7 }), under(0.1));
      S.ball([0, 1.6, -0.6], [6.4, 6.2, 6.6], { segs: 16, rings: 8, v0: 0.62 });
      for (const s of [1, -1]) S.tube([[s * 1.2, 3, 6.1], [s * 3.6, 3.4, 5.4]], 0.5, { sides: 5 });
      S.loft([[-3.2, 0.5], [-1.4, 0.9], [0, 0.7], [1.4, 0.9], [3.2, 0.5]].map(([x, r]) => ring([x, -2.4 - Math.abs(x) * 0.2, 6.3 - Math.abs(x) * 0.25], r * 0.7, r, 6, { axis: 'x' })));
    }));
  }, 1.15);
}

void swell; void blade; void tint; void EYE; void arc; void all; void halfBelow; void repeatU; void repeatV; void label; void below; void blobs;
export { break_ as break };
