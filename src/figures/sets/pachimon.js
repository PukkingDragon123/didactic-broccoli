// Pachimon Paradise (パチモンパラダイス): "totally official" bootleg blob friends. Original designs, played for the
// bootleg jokes: a mould seam down every side, paint a little off its mark, a misspelt sticker on every base.
// Sculpt programs in millimetres (src/figures/sculpt.js); data: src/data/series/pachimon.js.
import { spline, ring, QUAL } from '../sculpt.js';
import { head, torso, blade } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, label, kana, below, above, band, blob, blobs, repeatU, repeatV,
} from '../paint.js';

const MAKER = 'HAPY FRENDS';
const GA = 2.39996;
const PINK = 0xf6a8b8, TEAR = 0x9ad8f8, GOLD = 0xe8c050;
const outer = (L) => ({ ...L, prep: (ctx) => { let x = 0, z = 0; for (const p of ctx.pts) { x += p[0]; z += p[2]; } return ctx.n[0] * x + ctx.n[2] * z > 0 ? L.prep(ctx) : null; } });
/** The cheap round base with its sticker: たぶん公式 (probably official), HAPY FRENDS. Returns its top. */
function base(S, col, r = 15) {
  S.paint(fill(col, { rough: 0.4 }), proj('top', stroke(circle(0, 0, r - 1.6), 0.4), tone(col, 0.18)), under(0.2), ...stamp(MAKER, { c: tone(col, 0.5), px: 0.36 }));
  S.lathe([[0, 0], [r - 0.6, 0], [r, 0.6], [r - 0.3, 3], [r - 0.9, 3.4], [0, 3.4]], { segs: 28 });
  S.paint(fill(0xfaf6e8, { rough: 0.6 }), proj('front', kana('たぶん公式', 0, 2.2, 1.6), 0xd8302a), proj('front', label('HAPY FRENDS', 0.4, 0.5, 0.2), 0x3a3a8a, { hard: true }), under(0.2));
  S.at([0, 0.4, r - 0.6], [-0.15, 0, 0], () => S.box(-6, 0, -0.2, 6, 3.2, 0.3, { bevel: 0.15 }));
  return 3.4;
}
/** A mochi blob body standing on y0: radius r, h tall; the mould seam runs down both sides. */
function blobBody(S, y0, r, h, o = {}) {
  const prof = spline([[0.01, 0], [0.72, 0.015], [0.95, 0.18], [1, 0.42], [0.95, 0.66], [0.78, 0.86], [0.44, 0.98], [0.01, 1]], 3).map(([k, t]) => [k * r, y0 + t * h]);
  S.lathe(prof, { segs: o.segs ?? 22, sz: o.sz ?? 0.92 });
  if (o.seam !== false) for (const s of [-1, 1]) S.tube(prof.slice(2, -1).map(([x, y]) => [s * (x + 0.05), y, 0]), 0.22, { sides: 4, caps: false });
  return prof;
}
/** Stubby feet at y0. */
function feet(S, y0, x, col) { S.paint(fill(col, { rough: 0.4 }), under(0.2)); for (const s of [-1, 1]) S.ball([s * x, y0 + 1, 3], [2.6, 1.4, 3], { segs: 10, rings: 5 }); }

// ------------------------------------------------------------------ 1. Teary Chibikuma
export function chibikuma(S) {
  const BEAR = 0xfaf8f2;
  const y0 = base(S, 0xc8e8a8);
  feet(S, y0, 4, BEAR);
  // the bear: round, white; the eyes a little off their mark (it's that kind of toy)
  S.paint(fill(BEAR, { rough: 0.4 }), ...face({ at: [0.4, y0 + 11.4], gap: 6.6, r: 1.2, eye: 'sad', mouth: 'frown', mw: 2.4, my: 3, blush: PINK }), proj('front', ellipse(0.2, y0 + 9.6, 1.1, 0.8), 0x5a4a4a), under(0.12));
  blobBody(S, y0, 10, 18);
  for (const s of [-1, 1]) { S.paint(fill(BEAR, { rough: 0.4 }), proj('front', circle(s * 6.4, y0 + 18.6, 1.4), PINK)); S.ball([s * 6.4, y0 + 18, -0.4], [2.6, 2.6, 1.6], { segs: 12, rings: 7 }); }
  // the tears: two streams down to two puddles
  S.clear(true);
  S.paint(fill(TEAR, { rough: 0.05 }));
  for (const s of [-1, 1]) {
    S.tube(spline([[s * 3.5 + 0.4, y0 + 10.4, 8.4], [s * 4.6, y0 + 7, 9.4], [s * 6, y0 + 2.6, 9.6], [s * 7.4, y0 + 0.4, 10.4]], 3), [0.9, 1.1, 1.3, 0.8], { sides: 8 });
    S.lathe([[0, y0], [3.4, y0], [3.6, y0 + 0.3], [0, y0 + 0.4]], { segs: 14, at: [s * 7.6, 0, 10.6], sz: 0.6 });
  }
  S.clear(false);
  // arms, the sickle, the weeds (it keeps weeding)
  S.paint(fill(BEAR, { rough: 0.4 }), under(0.12));
  S.ball([-9.6, y0 + 8, 2], [2, 2.6, 2], { segs: 10, rings: 6 });
  S.joint('arm', { pivot: [9, y0 + 9, 1], axis: 'x', min: -0.5, max: 0.5, rest: 0, g: [0, 0.4], idle: 0.15 }, () => {
    S.paint(fill(BEAR, { rough: 0.4 }), under(0.12));
    S.ball([9.8, y0 + 8, 3], [2, 2.6, 2], { segs: 10, rings: 6 });
    S.paint(fill(0xc89a5a, { rough: 0.7 }));
    S.tube([[10, y0 + 6, 3.6], [11, y0 + 11.6, 6]], 0.6, { sides: 6 });
    S.paint(fill(0xc8ced6, { rough: 0.2 }), crown(0.2));
    S.at([11, y0 + 11.6, 6], [0, 0.4, 0], () => S.extrude([[0, -0.6], [0, 0.6], [3, 1.2], [5.4, 0], [5, -0.6], [3, 0]], -0.25, 0.25));
  });
  S.paint(fill(0x6aa848, { rough: 0.5 }), proj('front', seg(0, 0, 0, 6, 0.2), 0x8ac868));
  for (let k = 0; k < 7; k++) { const a = k * GA; S.at([-10 + Math.cos(a) * 2.4, y0, 8 + Math.sin(a) * 1.6], [Math.sin(a) * 0.5, a, Math.cos(a) * 0.4], () => blade(S, 4 + (k % 3), 1.6, 0.4, { shape: 'leaf' })); }
}

// ------------------------------------------------------------------ 2. Splitface Kitty
export function wareneko(S) {
  const BLUE = 0x4a6ab8, WHITE = 0xfaf8f2;
  const y0 = base(S, 0xf8e0a8);
  feet(S, y0, 4, WHITE);
  // half blue, half white, split down the middle with a V at the brow (the blue strays over the line a bit)
  const split = Object.assign((x, y) => { const v = y > y0 + 13 ? Math.max(0, 2.4 - Math.abs(x) * 0.9) : 0; return y > y0 + 13 - v ? x + 0.6 + (y > y0 + 15 ? 0 : 0) : x - 0.5; }, { box: [-1e4, -1e4, -1e4, 1e4, 1e4, 1e4] });
  S.paint(fill(WHITE, { rough: 0.4 }), vol(split, BLUE), ...face({ at: [0, y0 + 11], gap: 7, r: 1.3, eye: 'dot', mouth: 'o', mw: 3.4, my: 3.6, blush: PINK }),
    proj('front', pair(or(seg(5.6, y0 + 8.4, 9.4, y0 + 9.4, 0.3), seg(5.6, y0 + 7.4, 9.4, y0 + 6.8, 0.3))), 0x6a6a7a), under(0.12));
  blobBody(S, y0, 10, 18);
  for (const s of [-1, 1]) { S.paint(fill(s < 0 ? BLUE : WHITE, { rough: 0.4 }), proj('front', ellipse(0, 2.4, 1.4, 1.8), PINK)); S.at([s * 5.4, y0 + 15.4, 0], [0, 0, -s * 0.45], () => blade(S, 5.4, 5.4, 1.6, { shape: 'ear', cup: 0.6 })); }
  // arms up: "it'll be fine!" (wave them)
  for (const s of [-1, 1]) S.joint(s < 0 ? 'armL' : 'armR', { pivot: [s * 9, y0 + 9, 1], axis: 'z', min: -0.5, max: 0.5, rest: 0, g: [0, s * 0.4], idle: 0.12 }, () => {
    S.paint(fill(s < 0 ? BLUE : WHITE, { rough: 0.4 }), under(0.12));
    S.tube(spline([[s * 9, y0 + 9, 1], [s * 12, y0 + 13, 1.4], [s * 12.6, y0 + 17, 1.6]], 2), [2, 1.8, 1.8], { sides: 8 });
    S.ball([s * 12.6, y0 + 17.6, 1.6], 2.2, { segs: 10, rings: 6 });
  });
  S.paint(fill(BLUE, { rough: 0.4 }));
  S.tube(spline([[-2, y0 + 3, -8], [-6, y0 + 4, -11], [-6, y0 + 10, -12], [-3.6, y0 + 12, -11]], 3), [1.4, 1.3, 1.2, 1], { sides: 7 });
}

// ------------------------------------------------------------------ 3. Wahoo Bunny
export function wahoousa(S) {
  const YEL = 0xfff0b0;
  const y0 = base(S, 0xc8d8f8);
  feet(S, y0, 3.8, YEL);
  S.paint(fill(YEL, { rough: 0.4 }), ...face({ at: [0, y0 + 10.6], gap: 6.4, r: 1.2, eye: 'dot', mouth: 'o', mw: 4.4, my: 3.8, blush: PINK }),
    proj('front', or(seg(-5.6, y0 + 14, -2.4, y0 + 13, 0.6), seg(5.6, y0 + 14, 2.4, y0 + 13, 0.6)), EYE), under(0.12));
  blobBody(S, y0, 9.4, 17);
  // the ears (they flop)
  for (const s of [-1, 1]) S.joint(s < 0 ? 'earL' : 'earR', { pivot: [s * 2.8, y0 + 16, 0], axis: 'z', min: -0.8, max: 0.8, rest: 0, g: [0, s * 0.7], idle: 0.1 }, () => {
    S.paint(fill(YEL, { rough: 0.4 }), proj('front', ellipse(0, 7, 1.4, 5.4), PINK), under(0.12));
    S.at([s * 2.8, y0 + 15.6, 0], [0, 0, -s * 0.12], () => blade(S, 15, 4.4, 2.2, { shape: 'round', cup: 0.8 }));
  });
  // arms up, a stolen bag of snacks in one paw
  S.paint(fill(YEL, { rough: 0.4 }), under(0.12));
  for (const s of [-1, 1]) S.tube(spline([[s * 8.4, y0 + 8, 1], [s * 11.4, y0 + 12, 2], [s * 12, y0 + 16, 2.4]], 2), [1.9, 1.7, 1.7], { sides: 8 });
  for (const s of [-1, 1]) S.ball([s * 12, y0 + 16.6, 2.4], 2, { segs: 10, rings: 6 });
  S.paint(fill(0xd84a3a, { rough: 0.3 }), proj('front', rbox(-12, y0 + 22, 2.6, 2, 0.4), 0xf6f0d8), proj('front', kana('せん', -12, y0 + 22, 2.4), 0xd84a3a), proj('front', or(rbox(-12, y0 + 25.6, 3.4, 0.4)), 0xf2c23a));
  S.at([-12, y0 + 18, 2.4], [0, 0.2, 0.15], () => S.loft([[0, 2.6, 0.6], [0.5, 3.4, 1.6], [7, 3.4, 1.6], [8.6, 3.6, 0.3], [9, 3.6, 0.1]].map(([yy, w, d]) => ring([0, yy, 0], w, d, 12, { pow: 3 }))));
}

// ------------------------------------------------------------------ 4. Menacing Mochi
export function gogomochi(S) {
  const MOCHI = 0xf2e6ff, SHADE = 0x6a3aa8;
  const y0 = base(S, 0xe0d0f0, 16);
  // the pose: hips cocked, one foot out, one arm over the head, the other on the hip
  S.paint(fill(MOCHI, { rough: 0.4 }), under(0.2));
  S.ball([-3, y0 + 1, 4], [2.6, 1.4, 3], { segs: 10, rings: 5 }); S.ball([5, y0 + 1, -1], [2.6, 1.4, 3], { segs: 10, rings: 5 });
  S.paint(fill(MOCHI, { rough: 0.4 }), proj('front', or(seg(-6, y0 + 15.2, 6, y0 + 15.2, 1.8)), mix(MOCHI, SHADE, 0.35)), ...face({ at: [0, y0 + 12.4], gap: 6, r: 1, eye: 'smug', mouth: 'flat', mw: 2.4, my: 3 }), proj('front', or(seg(-5, y0 + 14.2, -1.6, y0 + 13.4, 0.6), seg(5, y0 + 14.2, 1.6, y0 + 13.4, 0.6)), EYE), proj('front', circle(0, y0 + 5, 1), 0xf2c23a), under(0.15));
  S.at([0, 0, 0], [0, 0.35, -0.12], () => blobBody(S, y0, 9.6, 19));
  S.paint(fill(MOCHI, { rough: 0.4 }), under(0.15));
  S.tube(spline([[-7, y0 + 14, 1], [-11, y0 + 19, 0], [-6, y0 + 25, -1], [0, y0 + 24.4, -1]], 3), [2, 1.8, 1.8, 1.8], { sides: 8 });
  S.ball([0.6, y0 + 24.4, -1], 2.2, { segs: 10, rings: 6 });
  S.tube(spline([[8, y0 + 10, 0], [11.6, y0 + 8, 2], [9.4, y0 + 5, 3.6]], 2), [1.9, 1.8, 1.8], { sides: 8 });
  S.ball([9.2, y0 + 4.6, 3.6], 2, { segs: 10, rings: 6 });
  // the air says ゴゴゴ: cut-out letters on clear stems (they rumble)
  S.joint('gogogo', { pivot: [0, y0, 0], axis: 'y', min: -0.08, max: 0.08, rest: 0, g: [0, 0.06], idle: 0.03 }, () => {
    for (const [k, [x, y, z, a]] of [[12, 22, -3, -0.3], [15, 14, -6, -0.5], [-14, 14, -4, 0.4], [-12, 27, -6, 0.2]].entries()) {
      S.clear(true); S.paint(fill(0xe8f0f4, { rough: 0.05 })); S.tube([[x, y0, z], [x, y0 + y - 2.6, z]], 0.4, { sides: 6 }); S.clear(false);
      S.paint(fill(0xf6f2fa, { rough: 0.5 }), proj('front', kana('ゴ', 0, 0, 6.4), 0x7a3ad6), proj('back', kana('ゴ', 0, 0, 6.4), 0x7a3ad6), proj('front', stroke(rbox(0, 0, 3.4, 3.4, 0.6), 0.3, 0.3), 0xc8b0f0));
      S.at([x, y0 + y, z], [0, a, 0.15 * (k % 2 ? 1 : -1)], () => S.box(-3.8, -3.8, -0.4, 3.8, 3.8, 0.4, { bevel: 0.3 }));
    }
  });
}

// ------------------------------------------------------------------ 5. Stand-in Spirit
export function standsan(S) {
  const BLOB = 0xffe0c8, CAP = 0x2a2440, SPIRIT = 0xb8e4f8;
  const y0 = base(S, 0xf8d8e0, 17);
  // the spirit: an enormous, very polite bruiser, all shoulders, a headband (punch!)
  S.clear(true);
  S.paint(fill(SPIRIT, { rough: 0.15 }), ...face({ at: [0, y0 + 33], gap: 4, r: 0.8, eye: 'line', mouth: 'flat', mw: 2, my: 2.4, col: 0x2a4a6a, near: 0 }), proj('front', or(seg(-3.4, y0 + 34.4, -0.8, y0 + 34, 0.6), seg(3.4, y0 + 34.4, 0.8, y0 + 34, 0.6)), 0x2a4a6a));
  S.at([0, 0, -6], null, () => torso(S, [0, y0 + 20, 0], [12, 10, 7], { belly: 0.05, hips: 0.7, sit: 0.7 }));
  S.ball([0, y0 + 33, -4.6], [4.4, 4.6, 4.2], { segs: 14, rings: 8 });
  for (const s of [-1, 1]) S.ball([s * 11, y0 + 26, -6], [5, 4.4, 4.4], { segs: 12, rings: 7 });
  S.paint(fill(0xf8f0f4, { rough: 0.2 }));
  S.lathe([[4.5, y0 + 34.6], [4.6, y0 + 36], [4.1, y0 + 36.2], [4, y0 + 34.8]], { segs: 18, at: [0, 0, -4.6], cap: false });
  S.part('punch', { slide: [0, 0, 8], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    S.paint(fill(SPIRIT, { rough: 0.15 }));
    for (const s of [-1, 1]) { S.tube(spline([[s * 12, y0 + 25, -5], [s * 10, y0 + 21, 1], [s * 6, y0 + 20, 6]], 2), [3, 2.6, 2.4], { sides: 10 }); S.ball([s * 5.6, y0 + 20, 8], [3.6, 3.4, 3.4], { segs: 12, rings: 7 }); }
  });
  S.clear(false);
  // the shy little blob in front, in a school cap
  feet(S, y0, 3, BLOB);
  S.paint(fill(BLOB, { rough: 0.4 }), ...face({ at: [0, y0 + 7], gap: 4.4, r: 0.8, eye: 'tired', mouth: 'wavy', mw: 1.8, my: 2.4, blush: PINK }), under(0.12));
  S.at([0, 0, 4], null, () => blobBody(S, y0, 6.6, 12));
  S.paint(fill(CAP, { rough: 0.5 }), proj('front', circle(0, y0 + 11.2, 0.8), GOLD), crown(0.12));
  S.at([0, 0, 4], null, () => { S.lathe([[6.4, y0 + 8.6], [6.4, y0 + 10.6], [4.6, y0 + 12.4], [0, y0 + 12.6]], { segs: 18, sz: 0.94 }); });
  S.at([0, y0 + 9, 9.6], [-0.15, 0, 0], () => S.ball([0, 0, 0], [4.4, 0.5, 2.4], { segs: 12, rings: 4, v0: 0.5 }));
}

// ------------------------------------------------------------------ 6. It Was Me, Roller!
export function roadroller(S) {
  const YEL = 0xf7d046, DARK = 0x2a2a2e, BLOND = 0xf2c94a, SKIN = 0xffe0c8;
  const y0 = base(S, 0xd0d8e0, 20);
  // the roller rolls (forward a little)
  S.joint('roll', { slide: [0, 0, 6], min: -1, max: 1, rest: 0, g: [0, 1] }, () => {
    S.paint(fill(DARK, { rough: 0.4 }), proj('right', stroke(circle(0, y0 + 6, 4.4), 0.6), 0x8a8a90), proj('left', stroke(circle(0, y0 + 6, 4.4), 0.6), 0x8a8a90));
    S.at([0, y0 + 6, 8], [0, 0, Math.PI / 2], () => S.cyl([0, -10, 0], 6, 20, { segs: 22, bevel: 0.6 }));
    S.at([0, y0 + 4, -9], [0, 0, Math.PI / 2], () => S.cyl([0, -9, 0], 4, 18, { segs: 18, bevel: 0.5 }));
    S.paint(fill(YEL, { rough: 0.3 }), proj('right', kana('ローラー', 0, y0 + 10, 2.6), DARK), proj('left', kana('ローラー', 0, y0 + 10, 2.6), DARK), proj('front', rbox(0, y0 + 12.6, 6, 0.4), DARK), under(0.2), crown(0.08));
    S.box(-8, y0 + 5, -13, 8, y0 + 14, 3, { bevel: 1.2 });
    S.box(-10.6, y0 + 12.6, 3, 10.6, y0 + 13.6, 13, { bevel: 0.4 });
    for (const s of [-1, 1]) S.box(s * 10.6 - 0.5, y0 + 6, 6.6, s * 10.6 + 0.5, y0 + 13.6, 9.4, { bevel: 0.3 });
    S.paint(fill(0xc8ced6, { rough: 0.2 }));
    S.tube([[6, y0 + 14, -8], [6, y0 + 22, -8]], 0.6, { sides: 6 }); S.ball([6, y0 + 22.4, -8], 0.9, { segs: 8, rings: 4 });
  });
  // the blond blob on top, arms flung wide, yelling, a green scarf flying
  const y = y0 + 14;
  S.paint(fill(SKIN, { rough: 0.4 }), ...face({ at: [0, y + 6.4], gap: 4.6, r: 0.9, eye: 'stare', mouth: 'o', mw: 3, my: 3, blush: PINK }), under(0.12));
  blobBody(S, y, 7, 12, { segs: 20 });
  S.paint(fill(BLOND, { rough: 0.35 }), crown(0.15));
  S.lathe(spline([[7.2, y + 7], [6.6, y + 10.6], [4, y + 12.6], [0, y + 13]], 2), { segs: 18, sz: 0.94 });
  for (let k = 0; k < 5; k++) { const a = -0.8 + k * 0.4; S.at([Math.sin(a) * 5, y + 11.6, Math.cos(a) * 5 * 0.9], [0.6, a, 0], () => S.cone([0, 0, 0], 1.4, 3.4, { segs: 6 })); }
  S.paint(fill(SKIN, { rough: 0.4 }), under(0.12));
  for (const s of [-1, 1]) { S.tube(spline([[s * 6, y + 5, 0], [s * 10, y + 7, 0.6], [s * 13, y + 10, 1]], 2), 1.4, { sides: 7 }); S.ball([s * 13.4, y + 10.4, 1], 1.7, { segs: 10, rings: 6 }); }
  S.paint(fill(0x3cae5a, { rough: 0.6 }), proj('front', seg(0, 0, 0, 40, 0.25), tone(0x3cae5a, 0.2)));
  S.lathe([[6.4, y + 3.4], [6.8, y + 4.6], [6.2, y + 5.4], [5.8, y + 4.2]], { segs: 18, sz: 0.94, cap: false });
  S.tube(spline([[2, y + 4.4, -5], [3, y + 5.4, -10], [6, y + 7, -14], [9, y + 6, -17]], 3), 0.6, { sides: 5, flat: [3, 0.6] });
}

// ------------------------------------------------------------------ 7. Golden Wind Bunny
export function kinusa(S) {
  const G = (o = {}) => fill(GOLD, { rough: 0.2, ...o });
  const y0 = base(S, 0xf6e8c8);
  feet(S, y0, 3.8, GOLD);
  S.paint(G(), ...face({ at: [0, y0 + 10.6], gap: 6.4, r: 1.1, eye: 'smug', mouth: 'smirk', mw: 2.6, my: 3.2, col: 0x5a3a14 }), under(0.15), crown(0.15));
  blobBody(S, y0, 9.4, 17);
  // one very specific forelock: a single swooping curl
  S.paint(G({ rough: 0.18 }), shade(vol(blob([0, y0 + 18, 6], [3, 3, 3])), -0.15));
  S.tube(spline([[-2, y0 + 16.4, 3], [2, y0 + 18.6, 5.6], [4.4, y0 + 17, 8], [2.4, y0 + 14.6, 9], [0.4, y0 + 15.6, 8.6], [1.2, y0 + 16.8, 7.6]], 4), (t) => 1.6 * (1 - t) + 0.4, { sides: 8 });
  // ears (one twitches), a pointing paw, the ladybug brooch
  S.joint('ear', { pivot: [2.4, y0 + 16, -1], axis: 'z', min: -0.5, max: 0.5, rest: 0, g: [0, -0.4], idle: 0.1 }, () => { S.paint(G(), proj('front', ellipse(0, 6, 1.2, 4.4), 0xd8a030)); S.at([2.4, y0 + 15.6, -1], [-0.3, 0, -0.18], () => blade(S, 13, 4, 2, { shape: 'round', cup: 0.7 })); });
  S.paint(G(), proj('front', ellipse(0, 6, 1.2, 4.4), 0xd8a030)); S.at([-2.4, y0 + 15.6, -1], [-0.3, 0, 0.18], () => blade(S, 13, 4, 2, { shape: 'round', cup: 0.7 }));
  S.paint(G(), under(0.15));
  S.tube(spline([[-8, y0 + 8, 1], [-11, y0 + 7, 3], [-12, y0 + 6.6, 6]], 2), 1.8, { sides: 8 }); S.ball([-12, y0 + 6.6, 6.6], 2, { segs: 10, rings: 6 });
  S.tube(spline([[8, y0 + 9, 1], [12, y0 + 12, 4], [15, y0 + 15, 6]], 2), 1.8, { sides: 8 }); S.ball([15.4, y0 + 15.4, 6.4], 1.9, { segs: 10, rings: 6 });
  S.at([16.4, y0 + 16.6, 7.4], [0, 0, -0.8], () => S.tube([[0, 0, 0], [0, 2.4, 0]], [0.8, 0.6], { sides: 6 }));
  // the ladybug brooch, pinned on the left of the chest
  S.at([-4.6, y0 + 5.6, 8.2], [0, -0.45, 0.3], () => {
    S.paint(fill(0xd8302a, { rough: 0.15 }), proj('front', or(circle(-0.9, 0.3, 0.42), circle(0.9, 0.3, 0.42), circle(-0.7, -1, 0.38), circle(0.7, -1, 0.38), seg(0, -1.9, 0, 1.6, 0.2)), EYE), crown(-0.15));
    S.ball([0, 0, 0], [2, 2.2, 1.2], { segs: 12, rings: 7, v0: 0.5 });
    S.paint(fill(EYE, { rough: 0.2 }), proj('front', pair(circle(0.4, 2.4, 0.22)), 0xffffff)); S.ball([0, 2.2, 0.2], [1, 0.8, 0.7], { segs: 8, rings: 5 });
  });
}

// ------------------------------------------------------------------ 8. Time-Stop Clock Blob (secret)
export function tokitome(S) {
  const BODY = 0xfff4d6, BAND = 0xf7d046;
  const y0 = base(S, 0xe8e0f8, 16);
  feet(S, y0, 4.2, BODY);
  S.paint(fill(BODY, { rough: 0.4 }), ...face({ at: [0, y0 + 14.6], gap: 6.6, r: 1.1, eye: 'smug', mouth: 'smirk', mw: 2.6, my: 2.6, blush: PINK }), vol(band(y0 + 17.4, y0 + 19.4), BAND, { rough: 0.25 }), proj('front', pair(star(3.4, y0 + 18.4, 0.8, 4, 0.5, 0)), 0xf05a8a), under(0.12));
  blobBody(S, y0, 10.4, 20);
  // the belly clock: 12:00, always (try to start it)
  const tick = or(...Array.from({ length: 12 }, (_, k) => circle(Math.sin(k * Math.PI / 6) * 3.4, y0 + 7 + Math.cos(k * Math.PI / 6) * 3.4, k % 3 ? 0.25 : 0.45)));
  S.paint(fill(0xfaf8f2, { rough: 0.2 }), proj('front', tick, EYE), proj('front', label('XII', 0, y0 + 9.4, 0.22), 0x8a6a2a, { hard: true }));
  S.at([0, y0 + 7, 9.4], null, () => S.extrude(Array.from({ length: 28 }, (_, k) => [Math.cos(k / 28 * Math.PI * 2) * 4.2, Math.sin(k / 28 * Math.PI * 2) * 4.2]), -1, 0.4));
  S.paint(fill(GOLD, { rough: 0.2 }));
  S.at([0, y0 + 7, 9.6], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 4.5, 0.55, { segs: 24, sides: 5 }));
  S.paint(fill(EYE, { rough: 0.3 }));
  S.at([0, y0 + 7, 9.9], null, () => S.box(-0.3, 0, -0.2, 0.3, 2.4, 0.2));
  S.joint('hand', { pivot: [0, y0 + 7, 10], axis: 'z', min: -6.3, max: 0, rest: 0, g: [0, -0.3] }, () => S.at([0, y0 + 7, 10.2], null, () => S.box(-0.2, 0, -0.15, 0.2, 3.4, 0.15)));
  // arms up, and the motion lines that stopped in the air
  S.paint(fill(BODY, { rough: 0.4 }), under(0.12));
  for (const s of [-1, 1]) { S.tube(spline([[s * 9.4, y0 + 10, 1], [s * 12.6, y0 + 15, 1.4], [s * 13, y0 + 19, 1.6]], 2), [2, 1.8, 1.8], { sides: 8 }); S.ball([s * 13, y0 + 19.6, 1.6], 2.2, { segs: 10, rings: 6 }); }
  for (const [x, y, z, a] of [[-15, 24, 0, 0.3], [-17, 20, -2, 0.1], [15.6, 25, 0, -0.3], [17.4, 21, -2, -0.1]]) {
    S.clear(true); S.paint(fill(0xe8f0f4, { rough: 0.05 })); S.tube([[x, y0, z - 4], [x, y0 + y, z - 4]], 0.35, { sides: 6 }); S.clear(false);
    S.paint(fill(0xfff080, { rough: 0.3 }));
    S.at([x, y0 + y, z - 4], [0, 0, a], () => S.box(-2.6, -0.4, -0.4, 2.6, 0.4, 0.4, { bevel: 0.3 }));
  }
}
