// Bizarre Pose Collection (キメポーズ): an affectionate homage to dramatic-pose manga, with original characters only.
// Sculpt programs, in millimetres (src/figures/sculpt.js); the series data is src/data/series/bizarre.js. The family
// look: long-legged figures (four heads tall) in impossible poses, sharp hair, faces with heavy brows and hatched
// shadow lines, saturated purples and golds, sound-effect letters you can hold; every figure on a little base.
import { spline, ring } from '../sculpt.js';
import { torso, head, paw, blade } from '../anatomy.js';
import {
  fill, proj, wrap, vol, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, halfBelow, halfAbove, repeatU, repeatV, label, kana,
  below, above, band, blob, blobs,
} from '../paint.js';
import { aim, limb, personHead, L } from './showa.js';

const DENS = 0.8;
const MAKER = 'KIMEPOSE';
const SKIN = 0xf2c8a4, PURPLE = 0x8a35d8, GOLD = 0xf2c43a, INK = 0x2a1e30;
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const R = (r) => ({ rough: r });

/** A hand at the wrist, along dir: 'fist', 'point' (index out) or 'open'. */
function hand(S, skin, at, dir, kind = 'fist', roll = 0) {
  S.paint(fill(skin, R(0.55)), under(0.12));
  S.at(at, aim(dir, roll), () => {
    if (kind === 'open') { paw(S, [0, -0.7, 0.6], 3.2, 3.8, 1.4, { toes: 4 }); S.tube([[1.4, 0, 0.6], [2.4, 0.2, 2]], 0.5, { sides: 6 }); return; }
    S.box(-1.4, -1.2, 0, 1.4, 1.2, 2.6, { bevel: 0.9 });
    S.tube([[1.3, 0.3, 0.6], [1.5, 0.9, 2.2]], 0.5, { sides: 6 });
    if (kind === 'point') S.tube([[0.7, 0.5, 2], [0.7, 0.5, 5.6]], (t) => 0.5 - 0.08 * t, { sides: 6 });
  });
}
/** Shoes / boots: a sole and toe cap along local z. */
function shoe(S, at, yaw, c, pitch = 0) {
  S.paint(fill(c, R(0.4)), vol(below(0.7), tone(c, 0.5)), under(0.16));
  S.at(at, [pitch, yaw, 0], () => S.loft([[-2.4, 1.6, 2.2], [-1, 2, 2.6], [1.8, 1.9, 2], [3.6, 1.6, 1.4], [4.6, 1, 0.9]].map(([z, w, h]) => ring([0, h, z], w, h, 12, { axis: 'z', pow: 2.5 }))));
}
/** A leg: hip, knee, ankle in trousers (c), the shoe under it. */
function leg(S, c, hip, knee, ank, yaw = 0, sc = 0x2a2428, o = {}) {
  S.paint(fill(c, R(0.7)), under(0.14));
  limb(S, [hip, knee, ank], o.r0 ?? 2.6, o.r1 ?? 1.9);
  shoe(S, [ank[0], ank[1] - 2.4, ank[2]], yaw, sc, o.pitch ?? 0);
}
/** An arm in a sleeve (c) from the shoulder through el to the wrist, then the hand. */
function arm(S, c, sh, el, wr, kind = 'fist', roll = 0, skin = SKIN) {
  S.paint(fill(c, R(0.7)), under(0.14));
  limb(S, [sh, el, wr], 2.1, 1.6);
  hand(S, skin, wr, sub3(wr, el), kind, roll);
}
/** A face in this style: lashes, heavy brows, hatching on the cheek. */
function mangaFace(o = {}) {
  const N = { near: 2 }, col = o.col ?? INK;
  return [
    ...face({ at: [0, 0.6], gap: 5, r: o.r ?? 0.95, eye: o.eye ?? 'smug', mouth: o.mouth ?? 'flat', my: 3.6, mw: 1.8, near: 2, col }),
    proj('front', or(seg(-3.8, 2.6, -1.2, 2.2, 0.55), seg(3.8, 2.6, 1.2, 2.2, 0.55)), col, N),
    proj('front', or(seg(-4.6, -1, -3.6, -2.4, 0.25), seg(-4, -1, -3, -2.4, 0.25), seg(-3.4, -1, -2.4, -2.4, 0.25)), tone(o.skin ?? SKIN, 0.35), N),
    proj('front', or(seg(0.2, -0.6, 0.6, -1.6, 0.25)), tone(o.skin ?? SKIN, 0.3), N),
  ];
}
/** Spikes of hair: [x, y, z, rx, ry, rz, len, width]. */
function spikes(S, c, list) { S.paint(fill(c, R(0.45)), under(0.14), crown(0.1)); for (const [x, y, z, a, b, cc, l, w] of list) S.at([x, y, z], [a, b, cc], () => blade(S, l, w, w * 0.5, { shape: 'ear', cup: 0.4 })); }
/** A round base: dark purple with a gold rim and a starburst. */
function base(S, r = 16, c = 0x3a1e5a) {
  S.with({ dens: 0.5 }, () => {
    S.paint(fill(c, R(0.4)), vol(band(2.6, 3.2), GOLD, R(0.25)), proj('top', star(0, 0, r * 0.7, 12, 0.7), tint(c, 0.12)), under(0.2), ...stamp(MAKER, { c: 0x9a8ab8 }));
    S.lathe(spline([[0, 0], [r - 0.6, 0], [r, 0.6], [r, 2.6], [r - 0.4, 3.4], [0, 3.4]], 2), { segs: 28 });
  });
}

// ------------------------------------------------------------------ 1. The Pointer
export function pointer(S) {
  S.dens = DENS;
  const JACKET = 0x6a3ac8, PANTS = 0x2a2a48, HAIR = 0xf27a2a;
  base(S, 15);
  S.at([0, 3.4, 0], [0, 0.25, 0], () => {
    leg(S, PANTS, [3.2, 21, 0], [6.4, 11.6, 2.6], [8.4, 3, 1], 0.5, 0xe8483a);
    leg(S, PANTS, [-3.2, 21, 0], [-4, 12, -2], [-5, 3, -4.4], -0.3, 0xe8483a);
    S.paint(fill(JACKET, R(0.55)), proj('front', or(seg(0, 21, 0, 35, 0.4), ...[24, 28, 32].map((y) => circle(0.9, y, 0.55))), GOLD, { near: 1 }), vol(below(21.6), PANTS), under(0.14), crown(0.05));
    torso(S, [0, 28, 0], [6.4, 8.4, 4.2], { belly: 0.02, hips: 0.86, sit: 0.26 });
    S.paint(fill(JACKET, R(0.55)), under(0.14));
    S.lathe(spline([[4, 35], [4.4, 36], [3.6, 38], [3.2, 38.4]], 2), { segs: 14, cap: false });
    S.paint(fill(GOLD, R(0.3)));
    S.ball([0, 36.6, 3.6], [1.2, 1, 0.6], { segs: 8, rings: 5 });
    arm(S, JACKET, [-6, 34, 0], [-10.4, 29, -1], [-7, 24.4, 2], 'fist', 1.4);
    // the point, straight at you (the gimmick thrusts it)
    S.joint('point', L(S, { pivot: [6, 34, 0], axis: 'y', min: -0.4, max: 0.3, rest: 0, g: [0, -0.25], idle: 0.03 }), () => arm(S, JACKET, [6, 34, 0], [5.6, 34.6, 7.4], [1.6, 35.8, 13.8], 'point', 0));
    S.at([0, 43.6, 0.6], [-0.1, -0.2, 0.08], () => {
      personHead(S, SKIN, { paint: mangaFace({ eye: 'stare', mouth: 'smirk' }) });
      S.paint(fill(HAIR, R(0.45)), under(0.14));
      S.ball([0, 2.4, -0.8], [6.6, 6, 6.8], { segs: 16, rings: 8, v0: 0.5 });
      spikes(S, HAIR, [[0, 6, 2, -0.3, 0, 0, 7, 4], [-3.6, 5, 1, -0.2, 0, 0.6, 6.4, 3.6], [3.6, 5, 1, -0.2, 0, -0.6, 6.4, 3.6], [-5.2, 2, -1, 0, 0, 1.2, 5.6, 3.4], [5.2, 2, -1, 0, 0, -1.2, 5.6, 3.4], [0, 5, -4, -1, 0, 0, 6.6, 4], [-3, 3, -5, -1.4, 0, 0.6, 5.4, 3.4], [3, 3, -5, -1.4, 0, -0.6, 5.4, 3.4], [-2, 4.6, 5, 0.7, 0, 0.3, 4, 3], [2, 4.6, 5, 0.7, 0, -0.3, 4, 3]]);
    });
  });
}

// ------------------------------------------------------------------ 2. Leaning Salaryman
export function salaryman(S) {
  S.dens = DENS;
  const SUIT = 0x6a7088, TIE = 0xd8343a, HAIR = 0x2a2428;
  base(S, 15, 0x2a2a3a);
  // knees bent, the whole of him tipped back from the shins at an angle physics does not allow
  leg(S, SUIT, [3, 17.6, -6], [3.6, 10, 2.4], [3.6, 5.8, 1], 0, 0x3a2a24);
  leg(S, SUIT, [-3, 17.6, -6], [-3.6, 10, 3.2], [-4, 5.8, 1.6], 0, 0x3a2a24);
  S.at([0, 17.6, -6], [-0.75, 0, 0.1], () => {
    S.paint(fill(0xf6f4ee, R(0.6)), vol(below(2), SUIT), proj('front', poly([[-1, 15.6], [1, 15.6], [1.2, 6], [0, 4.6], [-1.2, 6]]), TIE, { near: 2 }), proj('front', or(poly([[-6, 16], [-1.4, 16], [-1.4, 6], [-6, 4]]), poly([[6, 16], [1.4, 16], [1.4, 6], [6, 4]])), SUIT, { near: 1 }), under(0.14));
    torso(S, [0, 9, 0], [6.2, 8.8, 4.2], { belly: 0.12, hips: 0.9, sit: 0.26 });
    S.paint(fill(SUIT, R(0.7)), under(0.14));
    // one arm thrown over his face, the other still holding the briefcase out behind
    arm(S, SUIT, [6, 14.6, 0], [10.6, 20, 3], [3.4, 24.8, 6.4], 'open', -2.4);
    arm(S, SUIT, [-6, 14.6, 0], [-9.6, 8, -2], [-10.6, 2.6, -4], 'fist', 1.4);
    S.paint(fill(0x6a3a24, R(0.4)), proj('front', rbox(-10.6, -2.4, 1.6, 0.6, 0.3), GOLD), under(0.18));
    S.box(-12.4, -6.4, -8.6, -8.8, 2, -0.4, { bevel: 0.8 });
    S.at([0, 24, 0.8], [0.35, 0, 0], () => {
      personHead(S, SKIN, { paint: mangaFace({ eye: 'stare', mouth: 'o' }) });
      S.paint(fill(HAIR, R(0.4)), under(0.12));
      S.ball([0, 1.6, -0.6], [6.5, 6.2, 6.8], { segs: 16, rings: 8, v0: 0.56 });
      S.at([0, 5.6, 3.6], [0.4, 0, 0.3], () => blade(S, 5, 4, 1.6, { shape: 'leaf', cup: 0.6 }));
      S.paint(fill(0x8a8c94, R(0.25)));
      for (const s of [1, -1]) S.at([s * 2.5, 0.6, 6.2], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 1.7, 0.3, { segs: 14, sides: 5 }));
    });
  });
}

// ------------------------------------------------------------------ 3. Menacing Calico
export function gogo_cat(S) {
  S.dens = DENS;
  const WHITE = 0xfbf8f2, ORANGE = 0xec9a48, CHAR = 0x4a4448;
  base(S, 18);
  // the cat: perfectly still, chest out, tail round her feet
  S.at([-6, 3.4, 2], null, () => {
    S.paint(fill(WHITE, R(0.6)), vol(blobs(blob([-5, 16, -3], [5, 6, 6]), blob([4, 6, -5], [5, 4, 6])), ORANGE), vol(blob([5, 14, -4], [4, 5, 5]), CHAR), under(0.14), crown(0.04));
    torso(S, [0, 10, -1], [7, 10, 7.6], { belly: 0.24, hips: 1.14, sit: 0.44, lean: 2 });
    S.paint(fill(WHITE, R(0.6)), under(0.14));
    for (const s of [1, -1]) { limb(S, [[s * 3, 12, 4], [s * 3.2, 6, 5.4], [s * 3.2, 1.6, 5.6]], 1.9, 1.6); paw(S, [s * 3.2, 0, 6.6], 3.8, 4.4, 2.2, { toes: 3 }); }
    S.paint(fill(CHAR, R(0.6)), vol(blob([6, 2, 6], [3, 3, 3]), ORANGE), under(0.12));
    S.tube(spline([[0, 2, -7], [6, 1.6, -6], [8.4, 1.6, 0], [7, 1.6, 6], [3, 2, 8.4]], 3), (t) => 1.7 - 0.4 * t, { sides: 8 });
    S.at([0, 22.6, 2], [0.1, 0.2, 0], () => {
      S.paint(fill(WHITE, R(0.6)), vol(blob([-4, 4, -1], [4, 3.4, 6]), ORANGE), vol(blob([4.4, 4, -2], [3, 2.6, 4]), CHAR), vol(blob([0, -2.4, 5.6], [4, 2.4, 2.4]), 0xfbf8f2),
        ...face({ at: [0, 0.9], gap: 6.6, r: 1.4, eye: 'smug', mouth: null, near: 2, col: 0x6a8a2a }), proj('front', or(arc(-0.8, -2.4, 0.8, Math.PI, Math.PI * 2, 0.35), arc(0.8, -2.4, 0.8, Math.PI, Math.PI * 2, 0.35)), 0x8a7a80, { near: 2 }),
        proj('front', or(seg(-4.4, -1.6, -8.6, -1, 0.3), seg(-4.4, -2.6, -8.4, -3, 0.3), seg(4.4, -1.6, 8.6, -1, 0.3), seg(4.4, -2.6, 8.4, -3, 0.3)), 0xb4aeb4, { near: 2 }), under(0.14));
      head(S, [0, 0, 0], [7.6, 6.4, 6.6], { muzzle: 0.32, brow: 0.5, cheek: 0.28, chin: 0.2 });
      S.paint(fill(0xf2a6b0, R(0.3)));
      S.ball([0, -1.4, 6.5], [0.8, 0.55, 0.45], { segs: 6, rings: 4 });
      for (const [s, c] of [[1, CHAR], [-1, ORANGE]]) { S.paint(fill(c, R(0.6)), proj('front', ellipse(0, 2.6, 1.6, 2.2), 0xf2a6b0)); S.at([s * 4.4, 4.4, -0.6], [-0.12, 0, -s * 0.3], () => blade(S, 6, 6.2, 1.8, { shape: 'ear', cup: 1 })); }
    });
  });
  // ゴゴゴ: three letters on a clear stand, rumbling (the gimmick and the idle sway)
  const go = (S2) => {
    S2.extrude([[-3, 3], [3, 3], [3, 4.4], [-3, 4.4]], -0.9, 0.9, { bevel: 0.4 });
    S2.extrude([[1.6, -3.2], [3, -3.2], [3, 3], [1.6, 3]], -0.9, 0.9, { bevel: 0.4 });
    S2.extrude([[-3, -3.2], [1.6, -3.2], [1.6, -1.8], [-3, -1.8]], -0.9, 0.9, { bevel: 0.4 });
    S2.extrude([[3.6, 4.2], [4.4, 3.8], [5.2, 6], [4.4, 6.4]], -0.9, 0.9, { bevel: 0.3 });
    S2.extrude([[5.4, 3.6], [6.2, 3.2], [7, 5.4], [6.2, 5.8]], -0.9, 0.9, { bevel: 0.3 });
  };
  S.clear(true);
  S.paint(fill(0xe8f0f4, R(0.05)));
  S.tube([[11, 3, -2], [11, 52, -2]], 0.7, { sides: 10 });
  S.clear(false);
  S.joint('gogo', L(S, { pivot: [11, 3, -2], axis: 'z', min: -0.12, max: 0.12, rest: 0, g: [0, 0.06], idle: 0.03 }), () => {
    S.paint(fill(PURPLE, R(0.25)), proj('front', all, tint(PURPLE, 0.1)), under(0.2), crown(0.2));
    for (const [y, x, k, rz] of [[20, 13, 1, 0.15], [32, 10, 1.2, -0.1], [46, 13, 1.4, 0.12]]) S.at([x, y, -2], [0, -0.2, rz], () => go(S), k);
  });
}

// ------------------------------------------------------------------ 4. Pompadour Senpai
export function pompadour(S) {
  S.dens = DENS;
  const COAT = 0x22223a, HAIR = 0x1e1a28, LINING = 0xb8282c;
  base(S, 15);
  S.at([0, 3.4, 0], null, () => {
    leg(S, COAT, [3, 21, 0], [3.4, 12, 1], [3.8, 3, 0.6], 0.25, 0x2a2428, { r0: 3, r1: 2.6 });
    leg(S, COAT, [-3, 21, 0], [-3.4, 12, 1], [-3.8, 3, 0.6], -0.25, 0x2a2428, { r0: 3, r1: 2.6 });
    // the long coat: buttons, a high collar, red lining showing at the open hem
    S.paint(fill(COAT, R(0.6)), proj('front', or(...[25, 28.4, 31.8].map((y) => circle(0.9, y, 0.6))), GOLD, { near: 1 }), proj('front', or(seg(0, 8, 0, 36, 0.4)), tone(COAT, 0.4), { near: 1 }), under(0.14), crown(0.05));
    torso(S, [0, 28, 0], [6.6, 8.4, 4.4], { belly: 0.04, hips: 0.88, sit: 0.26 });
    S.paint(fill(COAT, R(0.6)), vol(below(8), LINING), proj('front', seg(0, 7, 0, 22, 0.5), LINING, { near: 4 }), under(0.14));
    S.lathe(spline([[5.8, 22], [7, 16], [8.4, 10], [9.4, 7.4]], 2), { segs: 20, cap: false, sz: 0.85 });
    S.lathe(spline([[9.2, 7.4], [8.2, 10], [6.8, 16], [5.6, 22]], 2), { segs: 20, cap: false, sz: 0.85 });
    S.paint(fill(COAT, R(0.6)), under(0.14));
    S.lathe(spline([[4.2, 35], [4.8, 36.6], [4.6, 39], [4, 39.6]], 2), { segs: 16, cap: false });
    // arms folded across the chest
    S.paint(fill(COAT, R(0.6)), under(0.14));
    limb(S, [[6.2, 34, 0], [8, 28, 3], [3, 28.6, 6.2]], 2.4, 2.1);
    limb(S, [[-6.2, 34, 0], [-8, 28, 3], [-3, 29.8, 6.4]], 2.4, 2.1);
    hand(S, SKIN, [-3.6, 28.6, 6.4], [1, 0, 0.3], 'open', 1.6);
    hand(S, SKIN, [3.6, 29.8, 6.6], [-1, 0, 0.3], 'open', -1.6);
    S.at([0, 43.6, 0.6], [0.05, 0, 0], () => {
      personHead(S, SKIN, { paint: mangaFace({ eye: 'line', mouth: 'flat' }) });
      // the pompadour: never mention it
      S.paint(fill(HAIR, R(0.25)), proj('top', or(seg(-3, -2, -2, 9, 0.4), seg(0, -2, 0.6, 10, 0.4), seg(3, -2, 3, 9, 0.4)), tint(HAIR, 0.25)), under(0.12), crown(0.1));
      S.ball([0, 1.8, -1], [6.5, 6.2, 6.8], { segs: 16, rings: 8, v0: 0.55 });
      S.loft([[-5, 0.6, 2], [-1.6, 4, 5.6], [3, 5.6, 6.2], [8, 6, 6], [13, 5.4, 5.2], [17, 4, 3.6], [19.4, 2, 1.6]].map(([z, h, w]) => ring([0, 4.6 + h * 0.45 + z * 0.16, z], w, h * 0.55 + 0.6, 14, { axis: 'z', pow: 2.2 })));
      for (const s of [1, -1]) S.at([s * 5.6, 0.2, 0.6], [0, 0, 0], () => S.box(-0.7, -3.6, -1.2, 0.7, 1, 1.2, { bevel: 0.5 }));
    });
  });
}

// ------------------------------------------------------------------ 5. To Be Continued (in sepia)
export function tbc(S) {
  S.dens = DENS;
  const S1 = 0x5a3e28, S2 = 0x8a6440, S3 = 0xb08a5a, S4 = 0xd8b88a, S5 = 0xf0dcb8;
  // the arrow sign: つづく
  S.paint(fill(S3, R(0.7)), proj('front', or(seg(-24, 4.4, 14, 4.4, 0.3), seg(-24, 8.6, 14, 8.2, 0.3)), tone(S3, 0.15)), proj('front', kana('つづく', -6, 6.8, 7), S1), proj('back', label('TO BE CONTINUED', 4, 6.6, 0.4), S1, { hard: true }), under(0.2), ...stamp(MAKER, { c: S1 }));
  S.extrude([[-26, 1.4], [14, 1.4], [14, 12.2], [-26, 12.2]], -3, 3, { bevel: 0.8 });
  S.extrude([[14, -1.6], [24, 6.8], [14, 15.2]], -3, 3, { bevel: 0.8 });
  S.paint(fill(S2, R(0.8)), under(0.2));
  for (const x of [-20, 8]) S.box(x - 1.6, 0, -4, x + 1.6, 1.6, 4, { bevel: 0.4 });
  // a clear rod holds him mid-jump
  S.clear(true);
  S.paint(fill(0xf0e8d8, R(0.05)));
  S.tube([[-6, 12, 0], [-6, 40, 0]], 0.8, { sides: 10 });
  S.clear(false);
  S.joint('jump', L(S, { pivot: [-6, 40, 0], axis: 'z', min: -0.15, max: 0.15, rest: 0, g: [0, 0.1], idle: 0.03 }), () => S.at([-6, 20, 0], [0, 0.3, 0.12], () => {
    leg(S, S2, [3, 21, 0], [8, 18, 4], [7, 12, 7], 0, S1, { pitch: 0.6 });
    leg(S, S2, [-3, 21, 0], [-5, 13, -2], [-8, 7.6, -6], -0.4, S1, { pitch: -0.4 });
    S.paint(fill(S3, R(0.6)), proj('front', or(seg(0, 21, 0, 35, 0.4)), S2, { near: 1 }), vol(below(21.6), S2), under(0.14));
    torso(S, [0, 28, 0], [6.2, 8.2, 4.2], { belly: 0.04, hips: 0.88, sit: 0.26 });
    arm(S, S3, [6, 34, 0], [11, 38, 1], [15, 42, 2], 'open', -0.6, S4);
    arm(S, S3, [-6, 34, 0], [-11.4, 31, 1], [-15, 34, 2.6], 'open', 0.6, S4);
    S.at([0, 43.6, 0.6], [0.2, -0.3, -0.1], () => {
      personHead(S, S4, { paint: [...mangaFace({ eye: 'closed', mouth: 'smile', col: S1, skin: S4 })] });
      spikes(S, S1, [[0, 6, 0, -0.4, 0, 0, 5.6, 4.4], [-4, 4.6, 0, -0.3, 0, 0.8, 5, 4], [4, 4.6, 0, -0.3, 0, -0.8, 5, 4], [0, 4, -4.6, -1.2, 0, 0, 5.6, 4.6], [-3, 2, -5.4, -1.4, 0, 0.7, 4.6, 3.6], [3, 2, -5.4, -1.4, 0, -0.7, 4.6, 3.6]]);
      S.paint(fill(S1, R(0.5)), under(0.12));
      S.ball([0, 1.6, -0.8], [6.5, 6.2, 6.8], { segs: 16, rings: 8, v0: 0.55 });
    });
    void S5;
  }));
}

// ------------------------------------------------------------------ 6. Phantom Partner (rare)
export function phantom(S) {
  S.dens = DENS;
  const NAVY = 0x2a3a6a, WHITE = 0xf8f6f0, RED = 0xd8343a, HAIR = 0x2a1e24, SPIRIT = 0x6ad8c8;
  base(S, 18);
  /** The pose they share: the arm up and pointing, the other on the hip. */
  const pose = (S2, C, sp) => {
    leg(S2, C.leg, [3, 21, 0], [4.6, 12, 1.6], [6, 3, 0.4], 0.4, C.shoe, { r0: 2.3, r1: 1.7 });
    leg(S2, C.leg, [-3, 21, 0], [-3.2, 12, 0.2], [-3.4, 3, -0.6], -0.2, C.shoe, { r0: 2.3, r1: 1.7 });
    S2.paint(fill(C.top, R(0.6)), ...(C.topPaint || []), under(0.14), crown(0.04));
    torso(S2, [0, 28, 0], [5.6, 8, 3.8], { belly: 0.02, hips: 0.84, sit: 0.26 });
    if (C.skirt) { S2.paint(fill(C.skirt, R(0.7)), wrap(6.6, repeatU(rbox(0, 0, 0.2, 20, 0), 2.2), tone(C.skirt, 0.25)), under(0.16)); S2.lathe(spline([[5, 24], [6.4, 20], [8, 16], [8.4, 15.4]], 2), { segs: 22, cap: false }); S2.lathe(spline([[8.2, 15.4], [7.6, 16], [6, 20], [4.8, 24]], 2), { segs: 22, cap: false }); }
    arm(S2, C.sleeve, [5.4, 34, 0], [10, 39, 1 + sp], [13, 45, 3 + sp], 'point', -0.4, C.skin);
    arm(S2, C.sleeve, [-5.4, 34, 0], [-10, 29.6, -1], [-6.4, 25.4, 2], 'fist', 1.4, C.skin);
  };
  // her guardian spirit, behind and a little late, in clear teal
  S.joint('spirit', L(S, { pivot: [0, 10, -10], axis: 'z', min: -0.2, max: 0.2, rest: 0, g: [0, 0.12], idle: 0.04 }), () => S.at([0, 8, -11], [0, 0, 0.08], () => {
    S.clear(true);
    pose(S, { leg: SPIRIT, shoe: SPIRIT, top: SPIRIT, sleeve: SPIRIT, skin: SPIRIT, topPaint: [proj('front', or(seg(-4, 32, 4, 22, 0.8), seg(4, 32, -4, 22, 0.8)), tint(SPIRIT, 0.4), { near: 1 })] }, 2);
    S.paint(fill(SPIRIT, R(0.1)), proj('front', rbox(0, 1.4, 4.6, 1.2, 0.6), 0xf24a8a, { near: 2 }), proj('front', pair(seg(2, 4, 5, 6, 0.5)), tint(SPIRIT, 0.4), { near: 2 }), under(0.1));
    S.at([0, 43.6, 0.6], [0, 0, 0], () => { head(S, [0, 0, 0], [6.4, 7.4, 6.6], { muzzle: 0.1, brow: 0.6, cheek: 0.1, chin: 0.4, crown: 1.15 }); spikes(S, SPIRIT, [[0, 7, -1, -0.3, 0, 0, 6, 3], [-3, 6, -2, -0.5, 0, 0.5, 5, 3], [3, 6, -2, -0.5, 0, -0.5, 5, 3]]); });
    S.clear(false);
  }, 1.22));
  // her: sailor uniform, a red scarf, long black hair
  S.at([0, 3.4, 3], [0, 0.15, 0], () => {
    pose(S, { leg: SKIN, shoe: 0x3a2a24, top: WHITE, sleeve: WHITE, skin: SKIN, skirt: NAVY, topPaint: [proj('back', rbox(0, 32, 5.6, 4, 0.4), NAVY), proj('back', stroke(rbox(0, 32, 4.6, 3.2, 0.4), 0.3), WHITE), proj('front', poly([[-4.6, 36], [4.6, 36], [0, 28.6]]), NAVY, { near: 1 }), proj('front', poly([[-1.6, 30.4], [1.6, 30.4], [2.4, 26.6], [0, 27.6], [-2.4, 26.6]]), RED, { near: 2 })] }, 0);
    S.at([0, 43.6, 0.6], [0, -0.1, 0.05], () => {
      personHead(S, SKIN, { paint: [...mangaFace({ eye: 'dot', mouth: 'smirk', r: 1.1 }), proj('front', pair(seg(1.4, 1.8, 3.6, 2.4, 0.3)), INK, { near: 2 })], chin: 0.6 });
      S.paint(fill(HAIR, R(0.4)), under(0.12), crown(0.12));
      S.ball([0, 1.6, -0.8], [6.6, 6.4, 6.9], { segs: 16, rings: 8, v0: 0.46 });
      S.at([0, 2, -4.4], [0.25, 0, Math.PI], () => blade(S, 18, 12, 2.4, { shape: 'round', cup: -2 }));
      S.at([0, 5.2, 4.6], [0.6, 0, 0], () => blade(S, 4, 9, 1.4, { shape: 'round', cup: 1 }));
      S.paint(fill(0xf24a8a, R(0.3)));
      S.at([4.6, 4.4, 2.4], [0, 0, 0.4], () => S.box(-1.2, -0.5, -0.4, 1.2, 0.5, 0.4, { bevel: 0.2 }));
    });
  });
}

// ------------------------------------------------------------------ 7. Time-Stop Pocket Watch (ultra)
export function watch(S) {
  S.dens = DENS;
  const CUSH = 0x6a2a8a, ENAMEL = 0xfbf8f0, BLACK = 0x26242c;
  // a purple cushion with gold tassels
  S.with({ dens: 0.5 }, () => {
    S.paint(fill(CUSH, R(0.6)), proj('top', or(seg(-24, 0, 24, 0, 0.5), seg(0, -16, 0, 16, 0.5)), tone(CUSH, 0.25)), under(0.2), crown(0.08), ...stamp(MAKER, { c: 0x9a8ab8 }));
    S.loft([[0, 22, 15], [2, 26, 18], [5, 27, 19], [8, 25, 17], [9.4, 19, 12]].map(([y, rx, rz]) => ring([0, y, 0], rx, rz, 24, { pow: 3 })));
  });
  S.paint(fill(GOLD, R(0.35)), under(0.2));
  for (const [x, z] of [[25, 17], [-25, 17], [25, -17], [-25, -17]]) S.lathe(spline([[0.6, 7], [1.6, 5], [1.8, 2], [0.4, 1.6]], 2).reverse(), { segs: 10, at: [x, 0, z] });
  // the watch, standing open
  const W = [0, 31, -4];
  S.at(W, [Math.PI / 2 - 0.15, 0, 0], () => {
    const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].map((n, i) => { const a = Math.PI / 2 - i * Math.PI / 6; return label(n, Math.cos(a) * 15.4, Math.sin(a) * 15.4, 0.3); });
    S.paint(fill(GOLD, R(0.25)), proj('bottom', or(stroke(circle(0, 0, 16), 0.6), stroke(circle(0, 0, 10), 0.5), star(0, 0, 8, 8, 0.5)), tone(GOLD, 0.3)), under(0.1), crown(0.1));
    S.lathe(spline([[0, -3.4], [16, -3.4], [19.6, -2.4], [20.6, -0.6], [20.6, 1.4], [19.6, 2.4]], 3), { segs: 40 });
    S.paint(fill(ENAMEL, R(0.3)), proj('top', or(...roman), BLACK, { hard: true }), proj('top', or(...Array.from({ length: 60 }, (_, i) => { const a = i * Math.PI / 30; return seg(Math.cos(a) * 17.6, Math.sin(a) * 17.6, Math.cos(a) * (i % 5 ? 18.2 : 18.6), Math.sin(a) * (i % 5 ? 18.2 : 18.6), 0.25); })), BLACK), proj('top', kana('世界', 0, -7.6, 2.2), 0xb8282c));
    S.lathe([[19.6, 2.4], [18.8, 1.8], [0, 1.6]], { segs: 40 });
    // the stopped hands (the gimmick nudges them by a second)
    S.paint(fill(BLACK, R(0.2)));
    S.cyl([0, 1.6, 0], 1, 0.8, { segs: 10 });
  });
  S.joint('hands', L(S, { pivot: [0, 31, -4], axis: [0, Math.cos(Math.PI / 2 - 0.15), Math.sin(Math.PI / 2 - 0.15)], min: -0.2, max: 0.2, rest: 0, g: [0, -0.1] }), () => S.at(W, [Math.PI / 2 - 0.15, 0, 0], () => {
    S.paint(fill(BLACK, R(0.2)));
    S.at([0, 2, 0], [0, -0.5, 0], () => S.box(-0.4, 0, 0, 0.4, 0.3, 11));
    S.at([0, 2.2, 0], [0, -2.4, 0], () => S.box(-0.5, 0, 0, 0.5, 0.3, 15));
  }));
  // the crown and its bow, the chain trailing over the cushion
  S.paint(fill(GOLD, R(0.25)), under(0.16), crown(0.1));
  S.at([0, W[1] + 20.4, W[2] - 20.6 * Math.sin(0.15)], null, () => {
    S.cyl([0, -1, 0], [2.2, 2.2], 3.4, { segs: 14 });
    S.cyl([0, 2.4, 0], [3, 3], 2, { segs: 14 });
    S.at([0, 9, 0], [0, Math.PI / 2, 0], () => S.at([0, 0, 0], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 4.4, 0.9, { segs: 20, sides: 8 })));
  });
  const chain = spline([[-2.6, 57.6, -7], [-10, 52, -4], [-17, 40, 0], [-21, 26, 6], [-19, 14, 12], [-12, 10.6, 16]], 4);
  for (let i = 0; i < chain.length - 1; i += 1) S.at(chain[i], aim(sub3(chain[i + 1], chain[i]), (i % 2) * Math.PI / 2), () => S.at([0, 0, 1.3], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 1.4, 0.38, { segs: 8, sides: 4 })));
  // the lid, swung open on its hinge at nine o'clock
  S.at(W, [Math.PI / 2 - 0.15, 0, 0], () => S.at([-20.6, 2.4, 0], [0, 0, 2.3], () => {
    S.paint(fill(GOLD, R(0.25)), proj('bottom', or(stroke(circle(20.6, 0, 15), 0.5), star(20.6, 0, 9, 6, 0.5), stroke(circle(20.6, 0, 4), 0.4)), tone(GOLD, 0.3)), proj('top', or(stroke(circle(20.6, 0, 16), 0.6), kana('止', 20.6, 0, 10)), tone(GOLD, 0.3)), under(0.1));
    S.lathe(spline([[0, 0], [17, 0], [19.6, 0.8], [20.4, 1.8], [19.6, 2.6], [16, 3.2], [0, 3.4]], 2), { segs: 36, at: [20.6, 0, 0] });
    S.paint(fill(GOLD, R(0.25)));
    S.at([0, 1.2, 0], [Math.PI / 2, 0, 0], () => S.cyl([0, -3, 0], 1.2, 6, { segs: 10 }));
  }));
  // the butler, bowing since Tuesday; the tea, stopped in mid-air
  S.at([11, 9.4, 10], [0, -0.5, 0], () => {
    leg(S, BLACK, [2.2, 21, 0], [2.4, 12, 0.6], [2.4, 3, 0], 0.1, BLACK, { r0: 2.2, r1: 1.7 });
    leg(S, BLACK, [-2.2, 21, 0], [-2.4, 12, 0.6], [-2.4, 3, 0], -0.1, BLACK, { r0: 2.2, r1: 1.7 });
    S.at([0, 21, 0], [0.9, 0, 0], () => {
      S.paint(fill(BLACK, R(0.5)), proj('front', poly([[-2.6, 14], [2.6, 14], [0, 4]]), 0xf8f6f0, { near: 1 }), proj('front', rbox(0, 13, 1.4, 0.6, 0.3), BLACK, { near: 2 }), under(0.14));
      torso(S, [0, 7, 0], [5.2, 7.6, 3.6], { belly: 0.04, hips: 0.9, sit: 0.26 });
      S.paint(fill(BLACK, R(0.5)), under(0.14));
      S.extrude([[-4, 2], [4, 2], [3, -6], [-3, -6]], -3.8, -2.6);
      arm(S, BLACK, [-5, 12.4, 0], [-6, 7, 2], [-2, 4, 4.6], 'open', 1.4, 0xf8f6f0);
      arm(S, BLACK, [5, 12.4, 0], [8, 10, 4], [8.4, 9, 9], 'open', -0.2, 0xf8f6f0);
      S.paint(fill(0xc9ced6, R(0.2)), under(0.2));
      S.lathe([[0, 0], [5, 0], [5.4, 0.6], [0, 0.4]], { segs: 18, at: [8.4, 9.6, 11] });
      S.at([0, 18.4, 0.8], [0.3, 0, 0], () => {
        personHead(S, SKIN, { paint: [...mangaFace({ eye: 'closed', mouth: 'flat' })], r: [5.6, 6.4, 6] });
        S.paint(fill(0xd8d6d0, R(0.4)), under(0.12));
        S.ball([0, 1.6, -0.8], [6, 5.8, 6.4], { segs: 16, rings: 8, v0: 0.55 });
      });
    });
  });
  // the cup tipping off its saucer in front of the watch, its tea frozen in a ribbon of clear amber
  S.paint(fill(0xfbf8f0, R(0.3)), vol(band(17.4, 18), GOLD), under(0.14));
  S.at([-8, 12, 16], [0, 0, 0.5], () => S.lathe(spline([[0, 0], [2, 0], [2.6, 1], [3.6, 4.4], [3.8, 5], [3.4, 5], [3.2, 4.6], [0, 4.4]], 2), { segs: 16 }));
  S.clear(true);
  S.paint(fill(0xd8902a, R(0.05)));
  S.tube(spline([[-10, 16.4, 16], [-12.6, 18.6, 15.4], [-14.6, 15, 14.6], [-15.4, 11, 14.4]], 3), (t) => 1.2 - 0.5 * t, { sides: 8 });
  S.clear(false);
}

// ------------------------------------------------------------------ 8. Ghost Alley Girl (secret)
export function alley(S) {
  S.dens = DENS;
  const STONE = 0xb8b4ac, GHOST = 0xc8e8f4;
  // the back-alley pavement, a kerbside drain cover, a signboard
  S.with({ dens: 0.5 }, () => {
    const slabs = or(...[-14, 0, 14].map((x) => stroke(rbox(x, 4, 6.6, 7.6, 0.6), 0.5)), ...[-7, 7, 21].map((x) => stroke(rbox(x - 14, -11, 6.6, 7.4, 0.6), 0.5)));
    S.paint(fill(STONE, R(0.85)), proj('top', slabs, tone(STONE, 0.25)), proj('top', and(rbox(14, -11, 6, 3, 0.4), repeatU(rbox(0, 0, 0.5, 9, 0), 1.6)), 0x5a5a60), under(0.2), ...stamp(MAKER, { c: 0x6a6a70 }));
    S.box(-24, 0, -18, 24, 3.4, 18, { bevel: 0.6 });
  });
  S.paint(fill(0x8a6a4a, R(0.8)), under(0.2));
  for (const x of [8, 22]) S.box(x - 0.9, 3.4, -14, x + 0.9, 30, -12.2, { bevel: 0.3 });
  S.paint(fill(0xfbf8f0, R(0.8)), proj('front', kana('ふりかえるな', 15, 24.4, 3.6), 0xc8282c), proj('front', stroke(rbox(15, 24.4, 8.6, 4, 0.4), 0.4), 0xc8282c), proj('back', label('NO.7', 15, 24, 0.4), 0x6a6a70, { hard: true }), under(0.2));
  S.box(5, 19, -12.2, 25, 29.6, -11.2, { bevel: 0.3 });
  // the guide, in pale clear plastic: the gimmick makes her glance back
  S.clear(true);
  S.paint(fill(GHOST, R(0.1)), under(0.1));
  S.at([-6, 3.4, 2], [0, 0.4, 0], () => {
    S.lathe(spline([[0, 6], [5.4, 6], [6.4, 8], [5.4, 16], [4.4, 24], [3.6, 28], [0, 28.4]], 2), { segs: 20 });
    for (const s of [1, -1]) limb(S, [[s * 1.8, 7, 0], [s * 2, 3, 0.4], [s * 2, 0.6, 0.4]], 1.3, 1.1);
    limb(S, [[4, 25, 0], [7, 20.6, 2], [9, 17.6, 4.6]], 1.3, 1.1);
    limb(S, [[-4, 25, 0], [-6, 20, 1], [-5, 16, 3]], 1.3, 1.1);
    S.joint('look', L(S, { pivot: [0, 28, 0], axis: 'y', min: -2.8, max: 0.3, rest: 0, g: [0, -2.4] }), () => S.at([0, 35, 0.4], null, () => {
      S.paint(fill(GHOST, R(0.1)), ...face({ at: [0, 0.4], gap: 5, r: 1, eye: 'dot', mouth: 'smile', mw: 1.6, my: 3, near: 2, col: 0x3a5a8a, blush: 0xf2b8c8 }), under(0.1));
      head(S, [0, 0, 0], [5.6, 6.4, 5.8], { muzzle: 0.1, brow: 0.25, cheek: 0.2, chin: 0.5 });
      S.paint(fill(tone(GHOST, 0.2), R(0.15)), under(0.1));
      S.ball([0, 1.4, -0.6], [6.2, 6.4, 6.4], { segs: 16, rings: 8, v0: 0.42 });
      S.at([0, 3, 4.2], [0.9, 0, 0], () => S.box(-5.6, -1.4, -0.6, 5.6, 1.4, 0.6, { bevel: 0.5 }));
    }));
  });
  // and her dog
  S.at([6, 3.4, 8], [0, -0.6, 0], () => {
    S.paint(fill(GHOST, R(0.1)), ...face({ at: [0, 10.6], gap: 3.4, r: 0.7, eye: 'dot', mouth: null, near: 5, col: 0x3a5a8a }), under(0.1));
    torso(S, [0, 5, -2], [3.6, 3.6, 6], { belly: 0.1, hips: 1, sit: 0.3 });
    for (const [x, z] of [[2, 1.6], [-2, 1.6], [2, -5], [-2, -5]]) limb(S, [[x, 4, z], [x, 0.6, z + 0.4]], 1.1, 0.9);
    head(S, [0, 10, 2.4], [3.6, 3.4, 3.8], { muzzle: 0.7, brow: 0.3, chin: 0.2 });
    for (const s of [1, -1]) S.at([s * 2.6, 12, 1.6], [0, 0, -s * 0.5], () => blade(S, 3.6, 2.6, 0.9, { shape: 'round', cup: 0.4 }));
    S.tube(spline([[0, 6, -8], [0, 8.6, -10], [0.6, 11, -9.4]], 2), 0.6, { sides: 6 });
  });
  S.clear(false);
}

void tint; void EYE; void halfBelow; void halfAbove; void repeatV; void above; void circle; void ellipse;
