// Mochi Mochi Animals (もちもちアニマル): squishy soft-vinyl mochi animals on ball-chain keychains. Sculpt programs, in
// millimetres (src/figures/sculpt.js); the series data is src/data/series/mochi.js. The family look: one daifuku body
// (flat underneath, soft shoulders), dot eyes with a catch-light, pink cheeks, toe-beans in front, and the same screw
// eye, jump ring and ball chain on top, which swings.
import { spline } from '../sculpt.js';
import { head, paw, blade, drape } from '../anatomy.js';
import {
  fill, proj, vol, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, stroke, pair, all, kana, label,
  below, band, blob, blobs,
} from '../paint.js';
import { L } from './showa.js';

const DENS = 0.9; // texel density (the series atlas holds every figure, full and light versions)
const MAKER = 'POYOPOYO';
const SILVER = 0xc9cdd3, BLUSH = 0xf4a0a8;

/** The daifuku body: r wide, h tall, sz deep (x r), standing on y = 0 at x, z. */
export function mochiBody(S, r, h, o = {}) {
  const prof = spline([[0, 0], [r * 0.68, 0], [r * 0.92, h * 0.07], [r, h * 0.25], [r * 0.95, h * 0.5], [r * 0.78, h * 0.75], [r * 0.46, h * 0.94], [0, h]], 3);
  return S.lathe(prof, { segs: o.segs ?? 18, sz: o.sz ?? 0.88, at: o.at || [0, 0, 0] });
}

/** Screw eye, jump ring and a ball-chain loop on top at y = top (the chain is a joint: it swings). */
export function keychain(S, top, o = {}) {
  const [x, z] = o.at || [0, 0];
  S.paint(fill(SILVER, { rough: 0.28 }), under(0.2));
  S.cyl([x, top - 1.2, z], [1.5, 1.2], 2, { segs: 10 });
  S.at([x, top + 2.4, z], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 1.8, 0.55, { segs: 12, sides: 6 }));
  S.joint('chain', L(S, { pivot: [x, top + 4, z], axis: 'z', min: -1, max: 1, rest: 0, g: o.g || [0, 0.6], idle: 0.4 }), () => {
    S.at([x, top + 4, z], [0, 0, Math.PI / 2], () => S.torus([0, 0, 0], 1.6, 0.45, { segs: 12, sides: 6 }));
    const N = 22, y0 = top + 5.4, H = o.h ?? 17, W = o.w ?? 6.6;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      if (Math.abs(a - Math.PI) < 0.32) continue; // (the connector sits there)
      const px = x + Math.sin(a) * W * (0.72 + 0.28 * (1 - Math.cos(a)) / 2), py = y0 + H * (1 - Math.cos(a)) / 2;
      S.ball([px, py, z], 1.02, { segs: 6, rings: 4 });
    }
    S.at([x, y0 + H, z], [0, 0, Math.PI / 2], () => S.lathe(spline([[0, -2.4], [0.9, -2.3], [1.15, -1.4], [1.15, 1.4], [0.9, 2.3], [0, 2.4]], 2), { segs: 8 }));
  });
}
/** Toe-beans: two little front paws on the floor. */
function feet(S, c, x, z, w = 5.4) { S.paint(fill(c), proj('bottom', all, tone(c, 0.12)), under(0.16)); for (const s of [1, -1]) paw(S, [s * x, 0, z], w, w * 1.2, w * 0.56, { toes: 3 }); }
const ear = (S, at, rot, len, w, th, shape = 'ear', cup = 1) => S.at(at, rot, () => blade(S, len, w, th, { shape, cup }));

// ------------------------------------------------------------------ 1. Mochi Shiba
export function shiba(S) {
  S.dens = DENS;
  const TAN = 0xe8a252, CREAM = 0xfaecd2;
  S.paint(
    fill(TAN), vol(blobs(blob([0, 7, 13], [12.5, 10, 9]), blob([0, 2, 0], [16, 4, 15])), CREAM), proj('front', pair(ellipse(5.6, 19.8, 1.7, 1.05, 0.2)), CREAM, { near: 6 }),
    ...face({ at: [0, 15.2], gap: 12.6, r: 1.85, eye: 'dot', mouth: null, blush: BLUSH, near: 6 }), under(0.14), crown(0.06), ...stamp(MAKER, { c: 0x9a6a3a }),
  );
  mochiBody(S, 19, 30);
  // the muzzle, the nose and the little "w" of a mouth
  S.paint(fill(CREAM), proj('front', or(arc(-1.1, 11.4, 1.1, Math.PI, Math.PI * 2, 0.5), arc(1.1, 11.4, 1.1, Math.PI, Math.PI * 2, 0.5), seg(0, 12.6, 0, 11.4, 0.5)), 0x4a3430), under(0.12));
  head(S, [0, 12.4, 13.4], [5.2, 3.6, 3.6], { muzzle: 0.7, brow: 0, cheek: 0.2, chin: 0.2 });
  S.paint(fill(0x3a2c2c, { rough: 0.25 }));
  S.ball([0, 13.4, 16.8], [1.5, 1.05, 0.9], { segs: 8, rings: 4 });
  for (const s of [1, -1]) { S.paint(fill(TAN), proj('front', ellipse(0, 3.6, 2.2, 3), CREAM)); ear(S, [s * 8.6, 25.4, 3], [-0.2, 0, -s * 0.42], 9.4, 8.4, 2.6, 'ear', 1.4); }
  feet(S, CREAM, 6.2, 9);
  // the curled tail wags
  S.rest = 0;
  S.joint('tail', L(S, { pivot: [0, 13, -15.5], axis: 'z', min: -0.5, max: 0.5, rest: 0, g: [0, 0.4], idle: 0.2 }), () => {
    S.paint(fill(TAN), vol(blob([1, 12, -18], [3, 4, 3]), CREAM), under(0.12));
    S.tube(spline([[0, 11, -14.6], [0, 15.4, -18.6], [2.6, 19.4, -18.4], [4.4, 17.8, -16.6], [3, 15.4, -16.8]], 3), (t) => 2.6 - 1.4 * t, { sides: 8 });
  });
  keychain(S, 30);
}

// ------------------------------------------------------------------ 2. Mochi Mike-neko
export function mike(S) {
  S.dens = DENS;
  const WHITE = 0xfbf8f2, ORANGE = 0xec9a48, CHAR = 0x4a4448, PINK = 0xf2a6b0;
  const patches = blobs(blob([-11, 25, 2], [11, 9, 13]), blob([12, 9, -8], [9, 8, 11]), blob([7, 27, -6], [6, 5, 7]));
  S.paint(
    fill(WHITE), vol(patches, ORANGE), vol(blob([13, 17, -3], [7, 9, 9]), CHAR),
    ...face({ at: [0, 15.4], gap: 12.6, r: 1.8, eye: 'dot', mouth: 'w', my: 4.6, mw: 3, blush: BLUSH, near: 6 }),
    proj('front', poly([[-1.2, 12.9], [1.2, 12.9], [0, 11.8]]), PINK, { near: 6 }),
    proj('front', or(seg(-9.5, 12.8, -15.5, 13.8, 0.36), seg(-9.5, 11.6, -15.4, 11.2, 0.36), seg(9.5, 12.8, 15.5, 13.8, 0.36), seg(9.5, 11.6, 15.4, 11.2, 0.36)), 0xb4aeb4, { near: 6 }),
    under(0.12), crown(0.06), ...stamp(MAKER, { c: 0x8a8488 }),
  );
  mochiBody(S, 19, 29.5);
  ear(S, [-8.8, 24.6, 2.6], [-0.15, 0, 0.45], 8.6, 8.6, 2.4, 'ear', 1.2);
  S.paint(fill(ORANGE), proj('front', ellipse(0, 3.2, 2.2, 2.8), PINK));
  ear(S, [-8.8, 24.6, 2.6], [-0.15, 0, 0.45], 8.6, 8.6, 2.4, 'ear', 1.2);
  S.paint(fill(WHITE), proj('front', ellipse(0, 3.2, 2.2, 2.8), PINK));
  ear(S, [8.8, 24.6, 2.6], [-0.15, 0, -0.45], 8.6, 8.6, 2.4, 'ear', 1.2);
  feet(S, WHITE, 6, 9.4);
  // the tail curls round the side to the front, and flicks
  S.joint('tail', L(S, { pivot: [-12, 3, -12], axis: 'y', min: -0.4, max: 0.4, rest: 0, g: [0, -0.3], idle: 0.15 }), () => {
    S.paint(fill(CHAR), vol(blob([-19, 3, 8], [4, 4, 4]), ORANGE), under(0.14));
    S.tube(spline([[-6, 3.2, -15.6], [-14, 3, -13.4], [-19.2, 2.8, -4], [-18.4, 2.6, 6], [-14, 3.4, 11]], 3), (t) => 2.1 - 0.6 * t, { sides: 8 });
  });
  keychain(S, 29.5);
}

// ------------------------------------------------------------------ 3. Mochi Hamster
export function hamu(S) {
  S.dens = DENS;
  const GOLD = 0xefb45c, WHITE = 0xfbf6ec, PINK = 0xf2a6b0, SEED = 0x3e3638;
  S.paint(
    fill(GOLD), vol(blobs(blob([0, 6, 12], [14, 12, 9]), blob([0, 2, 0], [15, 4, 14])), WHITE),
    ...face({ at: [0, 17.2], gap: 11, r: 1.75, eye: 'bead', mouth: null, near: 6 }), proj('front', pair(ellipse(7, 13.6, 2.2, 1.3)), BLUSH, { alpha: 0.8, near: 6 }),
    proj('front', or(arc(-0.8, 14.4, 0.8, Math.PI, Math.PI * 2, 0.4), arc(0.8, 14.4, 0.8, Math.PI, Math.PI * 2, 0.4)), 0x8a5a4a, { near: 6 }),
    under(0.12), crown(0.06), ...stamp(MAKER, { c: 0x9a7a4a }),
  );
  mochiBody(S, 18, 29, { sz: 0.92 });
  S.paint(fill(PINK, { rough: 0.3 }));
  S.ball([0, 15.4, 16.1], [1, 0.7, 0.6], { segs: 6, rings: 4 });
  // the cheek pouches, full
  S.paint(fill(WHITE), under(0.1));
  for (const s of [1, -1]) S.ball([s * 9.4, 12.6, 11], [4.6, 4, 4.2], { segs: 10, rings: 6 });
  for (const s of [1, -1]) { S.paint(fill(GOLD), proj('front', ellipse(0, 3, 2.2, 2.4), PINK)); ear(S, [s * 8.6, 25.2, 1.6], [-0.1, 0, -s * 0.55], 6, 7, 2, 'round', 1.4); }
  feet(S, PINK, 5.8, 9.6, 4.6);
  // the seed, held up in both paws: the gimmick lifts it to the mouth
  S.joint('seed', L(S, { pivot: [0, 10, 8], axis: 'x', min: -0.6, max: 0.2, rest: 0, g: [0, -0.42] }), () => {
    S.paint(fill(SEED), proj('front', or(seg(-1.1, 4, -1.1, 13, 0.5), seg(1.1, 4, 1.1, 13, 0.5), seg(0, 3.6, 0, 13.4, 0.4)), 0xf2ede2), proj('back', or(seg(-1.1, 4, -1.1, 13, 0.5), seg(1.1, 4, 1.1, 13, 0.5)), 0xf2ede2), under(0.14));
    S.lathe(spline([[0, 3.4], [1.6, 4.4], [2.5, 7.4], [2.2, 10.6], [1, 12.8], [0, 13.6]], 2), { segs: 10, sz: 0.62, at: [0, 0, 16.4] });
    S.paint(fill(PINK), under(0.14));
    for (const s of [1, -1]) {
      S.tube(spline([[s * 7.6, 10.4, 12.6], [s * 4.6, 9.4, 15.2], [s * 2.6, 8.6, 16.4]], 2), (t) => 2 - 0.5 * t, { sides: 6 });
      paw(S, [s * 2.3, 7.4, 15.4], 2.8, 3.2, 1.6, { toes: 3 });
    }
  });
  S.paint(fill(GOLD));
  S.ball([0, 6, -15.4], [1.8, 1.6, 1.4], { segs: 6, rings: 4 });
  keychain(S, 29);
}

// ------------------------------------------------------------------ 4. Mochi Penguin
export function pen(S) {
  S.dens = DENS;
  const NAVY = 0x324c7e, WHITE = 0xfbf8f2, ORANGE = 0xf29a3a;
  const mask = blobs(blob([-5.6, 16, 13], [6.4, 7.4, 6]), blob([5.6, 16, 13], [6.4, 7.4, 6]), blob([0, 8, 13], [12.6, 9.6, 8]), blob([0, 1, 0], [16, 3, 15]));
  S.paint(
    fill(NAVY), vol(mask, WHITE), ...face({ at: [0, 16.4], gap: 10.8, r: 1.75, eye: 'dot', mouth: null, blush: BLUSH, near: 6 }),
    under(0.16), crown(0.08), ...stamp(MAKER, { c: 0x5a6a8a }),
  );
  mochiBody(S, 18.6, 31.5, { sz: 0.86 });
  // the beak, and a tuft of three feathers on top
  S.paint(fill(ORANGE, { rough: 0.4 }), proj('front', seg(-2.2, 12.9, 2.2, 12.9, 0.35), tone(ORANGE, 0.3)), under(0.2));
  S.at([0, 12.9, 15.2], [Math.PI / 2 - 0.15, 0, 0], () => S.lathe(spline([[3, 0], [2.2, 1.8], [1, 3.4], [0, 4.2]], 2), { segs: 10, sz: 0.62 }));
  S.paint(fill(NAVY), under(0.14));
  for (const [a, l] of [[-0.4, 4.4], [0, 5.6], [0.45, 4]]) S.tube(spline([[0, 30.6, 0], [Math.sin(a) * 1.6, 32.6, 0.4], [Math.sin(a) * l, 33.6 + l * 0.3, -0.6]], 2), (t) => 0.9 - 0.6 * t, { sides: 5 });
  feet(S, ORANGE, 5.4, 10.6, 5.6);
  // the flippers flap
  for (const s of [1, -1]) {
    S.joint(s > 0 ? 'flipR' : 'flipL', L(S, { pivot: [s * 16.4, 17, 0], axis: 'z', min: -0.8, max: 0.8, rest: 0, g: [0, 0.62 * s], idle: 0.08 }), () => {
      S.paint(fill(NAVY), proj('front', ellipse(0, 8, 2, 5), tint(NAVY, 0.14)), under(0.16));
      S.at([s * 16.4, 18, 0.6], [0, 0, Math.PI + s * 0.5], () => blade(S, 12, 6.4, 2.4, { shape: 'wing', cup: -0.6 }));
    });
  }
  keychain(S, 31.5);
}

// ------------------------------------------------------------------ 5. Mochi Red Panda
export function lesser(S) {
  S.dens = DENS;
  const RUST = 0xcc5a30, WHITE = 0xfbf3e6, DARK = 0x4c2c26, RING = 0xe9a26a;
  const mask = blobs(blob([0, 10.6, 14], [7.6, 5, 5]), blob([-6.4, 19.6, 13], [2.6, 1.8, 3]), blob([6.4, 19.6, 13], [2.6, 1.8, 3]));
  S.paint(
    fill(RUST), vol(mask, WHITE), vol(below(7), DARK), proj('front', or(seg(-6, 13.6, -4.4, 9, 1), seg(6, 13.6, 4.4, 9, 1)), tone(RUST, 0.3), { near: 8 }),
    ...face({ at: [0, 15.4], gap: 12, r: 1.8, eye: 'dot', mouth: null, near: 6 }),
    proj('front', or(arc(-1.1, 9.8, 1.1, Math.PI, Math.PI * 2, 0.45), arc(1.1, 9.8, 1.1, Math.PI, Math.PI * 2, 0.45)), 0x5a3a34, { near: 6 }),
    under(0.14), crown(0.06), ...stamp(MAKER, { c: 0x8a4a2a }),
  );
  mochiBody(S, 19, 30);
  S.paint(fill(0x2c2428, { rough: 0.25 }));
  S.ball([0, 11.6, 16.8], [1.6, 1.1, 0.9], { segs: 8, rings: 4 });
  for (const s of [1, -1]) {
    S.paint(fill(RUST), proj('front', ellipse(0, 3.2, 3.2, 3.2), WHITE), proj('front', ellipse(0, 2.8, 2.1, 2.2), DARK));
    ear(S, [s * 9.4, 24.6, 2.4], [-0.15, 0, -s * 0.6], 7.4, 9, 2.4, 'round', 1.2);
  }
  feet(S, DARK, 6.4, 9.4);
  // stands up to look scary: the paws go up
  for (const s of [1, -1]) {
    S.joint(s > 0 ? 'armR' : 'armL', L(S, { pivot: [s * 15, 14, 6], axis: 'z', min: -0.6, max: 0.6, rest: 0, g: [0, s * 0.38], idle: 0.06 }), () => {
      S.paint(fill(DARK), under(0.16));
      S.tube(spline([[s * 14.6, 14, 6.4], [s * 18.6, 19, 8], [s * 19.6, 23.6, 8.8]], 3), (t) => 2.8 - 0.5 * t, { sides: 8 });
      S.paint(fill(DARK), proj('bottom', or(circle(0, 1.4, 1.3), circle(-1.4, 3.2, 0.6), circle(0, 3.6, 0.6), circle(1.4, 3.2, 0.6)), 0xe89aa4));
      S.at([s * 19.6, 22.6, 8.8], [-Math.PI / 2 + 0.2, 0, -s * 0.2], () => paw(S, [0, 0, 0], 4.8, 5, 2.6, { toes: 3 }));
    });
  }
  // the ringed tail
  const pts = spline([[6, 4, -14], [14, 6, -19], [19.4, 12, -17], [21, 20, -12.6], [19.6, 26, -9.6]], 4);
  for (let i = 0; i + 1 < pts.length; i += 2) {
    S.paint(fill((i / 2) % 2 ? RING : RUST), under(0.12));
    const r = (t) => 3.6 + 1.2 * Math.sin(Math.PI * t);
    S.tube(pts.slice(i, i + 3), [r(i / pts.length), r((i + 2) / pts.length)], { sides: 9, caps: i === 0 || i + 3 >= pts.length });
  }
  keychain(S, 30);
}

// ------------------------------------------------------------------ 6. Leaf Tanuki
export function tanuki(S) {
  S.dens = DENS;
  const FUR = 0xa27c58, MASK = 0x4c3a30, BELLY = 0xf2e2c4, LEAF = 0x6faa48;
  const mask = blobs(blob([-5.8, 15, 14], [5, 3.8, 4]), blob([5.8, 15, 14], [5, 3.8, 4]));
  S.paint(
    fill(FUR), vol(blob([0, 6, 13], [11, 8, 8]), BELLY), vol(blob([0, 11.4, 15], [5.4, 3, 3]), BELLY), vol(mask, MASK),
    proj('front', pair(circle(5.8, 15.4, 1.9)), 0xf6efe2, { near: 6 }), ...face({ at: [0, 15.4], gap: 11.6, r: 1.45, eye: 'dot', mouth: null, near: 6 }),
    proj('front', or(arc(-1, 9.6, 1, Math.PI, Math.PI * 2, 0.45), arc(1, 9.6, 1, Math.PI, Math.PI * 2, 0.45)), 0x6a4a3a, { near: 6 }),
    proj('front', pair(ellipse(10.6, 10.6, 2, 1.1)), BLUSH, { alpha: 0.8, near: 6 }), under(0.14), crown(0.06), ...stamp(MAKER, { c: 0x7a5a3a }),
  );
  mochiBody(S, 19, 28);
  S.paint(fill(0x2c2428, { rough: 0.25 }));
  S.ball([0, 11, 17], [1.5, 1.05, 0.9], { segs: 8, rings: 4 });
  for (const s of [1, -1]) { S.paint(fill(MASK), proj('front', ellipse(0, 2.6, 1.8, 2), tint(MASK, 0.3))); ear(S, [s * 9.8, 23, 2], [-0.1, 0, -s * 0.62], 5.6, 7.4, 2.4, 'round', 1); }
  feet(S, MASK, 6.2, 9.2);
  // the striped tail
  S.paint(fill(FUR), vol(or_(band(4.4, 6), band(9, 10.6)), MASK), vol(above(13.2), MASK), under(0.14));
  S.tube(spline([[8, 3.6, -13], [15, 4.6, -17], [19, 9, -14.6], [19, 14, -10]], 3), (t) => 3.2 + 1.4 * Math.sin(Math.PI * Math.min(1, t * 1.3)), { sides: 10 });
  // the leaf on its head: transformation pending (the gimmick lifts it, as if about to)
  S.joint('leaf', L(S, { pivot: [0, 26, -6], axis: 'x', min: -0.3, max: 0.9, rest: 0, g: [0, 0.7] }), () => {
    const veins = or(seg(0, 0, 0, 14, 0.5), seg(0, 6, -3, 9, 0.35), seg(0, 6, 3, 9, 0.35), seg(0, 3, -3.2, 5.6, 0.35), seg(0, 3, 3.2, 5.6, 0.35), seg(0, 9.4, -2.2, 11.4, 0.3), seg(0, 9.4, 2.2, 11.4, 0.3));
    S.paint(fill(LEAF, { rough: 0.45 }), proj('front', veins, tint(LEAF, 0.35)), proj('back', veins, tone(LEAF, 0.2)), under(0.2));
    S.at([0, 25.4, -6], [-0.55, 0, 0.12], () => blade(S, 15, 9.6, 1, { shape: 'leaf', cup: 1.6 }));
    S.paint(fill(tone(LEAF, 0.2)));
    S.tube(spline([[0, 26.4, -5.6], [0.2, 24.6, -3.6], [1.2, 24.2, -2.4]], 2), 0.45, { sides: 5 });
  });
  keychain(S, 28, { at: [0, 3] });
}
const or_ = (a, b) => { const f = (x, y, z) => Math.min(a(x, y, z), b(x, y, z)); f.ys = [...a.ys, ...b.ys]; return f; };
const above = (y0) => { const f = (x, y) => y0 - y; f.ys = [y0]; return f; };

// ------------------------------------------------------------------ 7. Moon Rabbit Mochi-tsuki (ultra)
export function tsukiusa(S) {
  S.dens = DENS;
  const MOON = 0xf6e6a2, CLOUD = 0xf4f2fa, WHITE = 0xfbf9f6, PINK = 0xf2a6b0, WOOD = 0xc08a58, DARK = 0x7a5232;
  // a cloud to stand on
  S.paint(fill(CLOUD), under(0.18), crown(0.04), proj('front', or(arc(-14, 3.2, 4, 0.3, 2.8, 0.45), arc(8, 3, 5, 0.3, 2.8, 0.45)), tone(CLOUD, 0.12)), ...stamp(MAKER, { c: 0x8a8aa0 }));
  for (const [x, z, rx, ry, rz] of [[-12, 2, 12, 5, 9], [4, 4, 14, 6, 10], [15, -2, 9, 4.6, 8], [-2, -6, 13, 5, 8]]) S.ball([x, 2.6, z], [rx, ry, rz], { segs: 14, rings: 6, v0: 0.42 });
  // the full moon behind, its seas painted
  // (the disc is turned up to face the front: in its own frame 'top' is the front, v = height above its centre)
  const seas = (k) => or(ellipse(-7 * k, 1, 6, 4.6, 0.4 * k), ellipse(5 * k, 7, 5, 3.4, -0.3 * k), ellipse(8 * k, -5, 4, 3), circle(-2 * k, 11, 2.2), ellipse(-10 * k, -9, 3, 2), stroke(circle(-4 * k, -3, 2), 0.5), stroke(circle(9 * k, 3, 1.4), 0.4));
  S.paint(fill(MOON, { rough: 0.5 }), proj('top', seas(1), tone(MOON, 0.14)), proj('bottom', flipV(seas(-1)), tone(MOON, 0.14)));
  S.at([0, 33, -8], [Math.PI / 2, 0, 0], () => S.lathe(spline([[0, -2.6], [19, -2.6], [20.6, -1.6], [21, 0], [20.6, 1.6], [19, 2.6], [0, 2.6]], 2), { segs: 28 }));
  // the mortar and the mochi in it
  S.paint(fill(WOOD, { rough: 0.7 }), vol(or_(band(7.4, 7.9), band(13.2, 13.7)), tone(WOOD, 0.22)), crown(0.05), under(0.18));
  S.lathe(spline([[5.2, 6], [6.2, 7], [5.8, 10], [6.8, 14.4], [7.6, 15.6], [6.6, 16.2], [5.2, 14.4], [0, 13.6]], 2), { segs: 16, at: [10, 0, 6] });
  S.paint(fill(0xfbf8f0, { rough: 0.5 }), under(0.08));
  S.ball([10, 15.2, 6], [5.4, 2.6, 5.2], { segs: 12, rings: 5 });
  // the rabbit
  S.paint(fill(WHITE), vol(blob([-8, 10, 12], [5, 4, 3]), 0xf2eee8), ...face({ at: [-8, 16.6], gap: 6.6, r: 1.15, eye: 'bead', col: 0xd2404a, mouth: 'w', my: 3, mw: 2, blush: BLUSH, near: 6 }), under(0.12));
  mochiBody(S, 10, 18, { at: [-8, 6, 4], sz: 0.9 });
  S.paint(fill(PINK, { rough: 0.3 }));
  S.ball([-8, 15.6, 12.9], [0.7, 0.5, 0.4], { segs: 6, rings: 4 });
  for (const s of [1, -1]) { S.paint(fill(WHITE), proj('front', ellipse(0, 7, 1.5, 5.4), PINK)); ear(S, [-8 + s * 3.2, 22.6, 3], [0.1, 0, -s * 0.16], 14, 5.2, 1.8, 'leaf', 0.8); }
  // the kine, raised; the gimmick brings it down on the mochi
  S.rest = 0;
  S.joint('kine', L(S, { pivot: [-3, 14, 9], axis: 'z', min: -1.2, max: 0.2, rest: 0, g: [0, -0.95] }), () => {
    S.paint(fill(WHITE), under(0.12));
    for (const [y, z] of [[14.6, 10.6], [13.4, 8.4]]) S.tube(spline([[-6.6, y, z - 1.6], [-3.4, y + 2, z], [-1, y + 4.4, z + 0.4]], 2), 1.4, { sides: 6 });
    S.paint(fill(tint(WOOD, 0.1), { rough: 0.7 }), under(0.16));
    S.tube([[-3, 15, 10.2], [2.4, 26, 10.2]], 0.9, { sides: 8 });
    S.paint(fill(WOOD, { rough: 0.7 }), vol(or_(band(-3.9, -3.3), band(3.3, 3.9)), tone(WOOD, 0.25)), crown(0.05));
    S.at([3, 27.4, 10.2], [0, 0, 1.11], () => S.lathe(spline([[0, -4.6], [2.4, -4.6], [2.9, -3.6], [2.6, 0], [2.9, 3.6], [2.4, 4.6], [0, 4.6]], 2), { segs: 14 }));
  });
  keychain(S, 54, { at: [0, -8], h: 13, w: 5.4 });
}

// ------------------------------------------------------------------ 8. Kagami-Mochi Shiba (secret)
export function kagami(S) {
  S.dens = DENS;
  const WOOD = 0xe0b878, GRAIN = tone(0xe0b878, 0.16), PAPER = 0xfbf8f0, RED = 0xd8382c, RICE = 0xfbf7ee, TAN = 0xe8a252, CREAM = 0xfaecd2, MIKAN = 0xf2902a;
  // the sanbō: a stand with lobed openings, the tray on top
  const grain = (v) => proj(v, or(seg(-14, 2.6, 14, 2.8, 0.3), seg(-14, 6.2, 14, 6, 0.3), seg(-14, 9.4, 14, 9.5, 0.3)), GRAIN);
  S.paint(fill(WOOD, { rough: 0.6 }), grain('front'), grain('back'), grain('left'), grain('right'), under(0.2), ...stamp(MAKER, { c: 0x8a6a3a }));
  const arch = (x) => 6.4 + 3.6 * Math.sqrt(Math.max(0, 1 - (x / 5) ** 2));
  for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) S.at([0, 0, 0], [0, r, 0], () => {
    S.box(-13, 0, 11.6, -5, 12, 13); S.box(5, 0, 11.6, 13, 12, 13); S.box(-5, 0, 11.6, 5, 2.4, 13);
    for (let i = 0; i < 8; i++) { const x0 = -5 + i * 1.25, x1 = x0 + 1.25; S.extrude([[x0, arch(x0)], [x1, arch(x1)], [x1, 12], [x0, 12]], 11.6, 13); }
  });
  S.paint(fill(WOOD, { rough: 0.6 }), proj('top', or(seg(-16, -9, 16, -9.4, 0.3), seg(-16, 4, 16, 4.4, 0.3)), GRAIN), under(0.2));
  S.box(-16.4, 12, -16.4, 16.4, 13.6, 16.4, { bevel: 0.4 });
  for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) S.at([0, 0, 0], [0, r, 0], () => S.box(-16.4, 13.6, 15.2, 16.4, 17, 16.4, { bevel: 0.3 }));
  // the paper with its red border, laid in the tray with a soft cockle
  const border = (x, y, z) => 12.6 - Math.max(Math.abs(x), Math.abs(z));
  S.paint(fill(PAPER, { rough: 0.85 }), vol(border, RED), under(0.1));
  drape(S, -14.6, -14.6, 14.6, 14.6, 14.4, { nx: 7, nz: 7, th: 0.5, fold: (u, v) => 0.4 * Math.sin(u * 7) * Math.sin(v * 5) * (Math.abs(u - 0.5) > 0.3 || Math.abs(v - 0.5) > 0.3 ? 1 : 0) });
  // the two mochi: plain rice below, a shiba on top
  S.paint(fill(RICE, { rough: 0.55 }), under(0.08), crown(0.04));
  S.lathe(spline([[0, 0], [12, 0], [14.2, 1.6], [14.4, 4.6], [12.4, 8], [6, 9.6], [0, 9.8]], 3), { segs: 22, at: [0, 14.8, 0] });
  S.paint(
    fill(TAN), vol(blob([0, 27, 9.6], [7.6, 5, 4]), CREAM), proj('front', pair(ellipse(4.2, 32.4, 1.3, 0.8, 0.2)), CREAM, { near: 4 }),
    ...face({ at: [0, 29.4], gap: 8.6, r: 1.4, eye: 'closed', mouth: null, blush: BLUSH, near: 4 }),
    proj('front', or(arc(-0.8, 26.6, 0.8, Math.PI, Math.PI * 2, 0.4), arc(0.8, 26.6, 0.8, Math.PI, Math.PI * 2, 0.4)), 0x4a3430, { near: 4 }), under(0.12),
  );
  mochiBody(S, 12.4, 15, { at: [0, 23.6, 0], sz: 0.9 });
  S.paint(fill(0x3a2c2c, { rough: 0.25 }));
  S.ball([0, 27.9, 11.3], [1.1, 0.8, 0.7], { segs: 6, rings: 4 });
  for (const s of [1, -1]) { S.paint(fill(TAN), proj('front', ellipse(0, 2.6, 1.6, 2.2), CREAM)); ear(S, [s * 5.8, 34.6, 1.4], [-0.15, 0, -s * 0.5], 6.4, 6, 2, 'ear', 1); }
  // the mikan, worn as a hat at a jaunty angle, its leaf to one side
  S.at([0, 37.2, 0], [0, 0, 0.12], () => {
    S.paint(fill(MIKAN, { rough: 0.55 }), proj('top', or(...[0, 1, 2, 3, 4].map((k) => circle(Math.cos(k * 1.26) * 3.4, Math.sin(k * 1.26) * 3.4, 0.4))), tone(MIKAN, 0.12)), under(0.14), crown(0.1));
    S.lathe(spline([[0, 0], [4.6, 0.4], [6.4, 2.6], [6.2, 5], [4.2, 6.8], [0, 7.2]], 3), { segs: 16 });
    S.paint(fill(0x5fa046, { rough: 0.45 }), proj('front', seg(0, 0.6, 0, 6.4, 0.35), 0x8ac46a));
    S.at([-1.6, 6.6, 0.6], [0.3, 0.3, 1.2], () => blade(S, 7, 4.2, 0.8, { shape: 'leaf', cup: -0.6 }));
  });
  // a lucky gold coin on a red cord at the corner
  S.paint(fill(RED, { rough: 0.8 }));
  S.tube(spline([[13.6, 17, 13.6], [15.6, 14, 15.4], [16.2, 10.6, 15.6]], 2), 0.4, { sides: 5 });
  S.paint(fill(0xe8c25a, { rough: 0.3 }), proj('top', or(rbox(0, 0, 0.9, 0.9, 0.1), stroke(circle(0, 0, 2.4), 0.35)), 0xb08a2a), proj('bottom', or(rbox(0, 0, 0.9, 0.9, 0.1), stroke(circle(0, 0, 2.4), 0.35)), 0xb08a2a));
  S.at([16.2, 7.6, 15.8], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.5, 0], 3, 1, { segs: 16, bevel: 0.3 }));
  keychain(S, 44.2, { h: 13, w: 5.4 });
}
const flipV = (s) => ({ d: (u, v) => s.d(u, -v), b: null });

void label; void kana; void rbox; void star; void EYE; void tint; void ellipse; void circle;
