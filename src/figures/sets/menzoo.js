// Men-Zoo (めんズー): animals made of noodles. Sculpt programs, in millimetres (src/figures/sculpt.js); the series data
// is src/data/series/menzoo.js.
import { spline, ring, hinge } from '../sculpt.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, or, and, stroke, pair, halfBelow, halfAbove, repeatU, repeatV, label, kana,
  below, above, band, blob, blobs,
} from '../paint.js';

const MAKER = 'MANPUKU';
const lerp = (a, b, t) => a + (b - a) * t;
const LO = { dens: 0.76 }; // big noodle surfaces are painted all over: a little coarser there keeps the atlas small
/** Noodles as paint: wavy strands running round the y axis (period p, line width w), in a darker tone. */
const strands = (base, dark, { p = 2.3, w = 0.5, amp = 0.8, k = 5, f = 0.5 } = {}) => (x, y, z) => {
  const v = y + amp * Math.sin(Math.atan2(x, z) * k + y * f), m = ((v % p) + p) % p;
  return mix(base, dark, Math.max(0, Math.min(1, 0.5 - (Math.abs(m - p / 2) - w / 2) / 0.2)));
};
const NARUTO = (cx, cy, r, view = 'top') => [
  proj(view, circle(cx, cy, r), 0xf6f2ea), proj(view, arc(cx, cy, r * 0.55, 0.4, 5.2, r * 0.2), 0xee8a9c), proj(view, arc(cx + r * 0.12, cy, r * 0.22, 2.6, 7.4, r * 0.17), 0xee8a9c),
];
const negi = (pts, view = 'top') => proj(view, or(...pts.map(([x, y, r = 1.1]) => stroke(circle(x, y, r), 0.5))), 0x6fae58);

// ------------------------------------------------------------------ 1. Kitsune Udon (an actual fox)
export function kitsune(S) {
  const NAVY = 0x2e426a, CREAM = 0xf3ecdc, FOX = 0xe9964a, AGE = 0xdba545, WHITE = 0xf7f3e8;
  // the bowl
  S.paint(fill(NAVY), vol(below(2.6), 0xe9e2d2), wrap(21.5, repeatU(or(arc(0, 16.4, 3, 0, Math.PI, 0.6), arc(0, 16.4, 1.7, 0, Math.PI, 0.6)), 6.4), CREAM), vol(band(20.6, 21.3), CREAM), under(0.16), ...stamp(MAKER, { px: 0.36, c: 0x8a8478 }));
  S.lathe([[8.6, 0], [9.2, 2.6], [14.8, 5], [20.4, 12], [22.4, 19.4], [23, 22], [22.2, 22.4]], { segs: 14, cap: 'bottom' });
  S.paint(fill(CREAM), shade(vol(below(19)), 0.08));
  S.lathe([[22.2, 22.4], [21.2, 22], [20.4, 17.6]], { segs: 14, cap: false });
  // the soup: spring onion, a slice of naruto, beads of oil
  S.paint(fill(0xe3bb6c, { rough: 0.4 }), proj('top', stroke(circle(0, 0, 19.6), 1.4), tint(0xe3bb6c, 0.3)), negi([[-15, 3], [-12, -9, 0.9], [-5, 15.5], [14, -11], [-16.5, -3.5, 0.8], [3, -16]]),
    proj('top', or(circle(-8, 11, 0.7), circle(-13.5, 8.5, 0.5), circle(8.5, -15.5, 0.6), circle(16.5, -5, 0.5)), tint(0xe3bb6c, 0.4)), ...NARUTO(-11.5, -1.5, 3.6));
  S.cyl([0, 17.3, 0], 20.4, 0.4, { segs: 14 });
  // udon: fat loops breaking the surface
  S.paint(fill(WHITE), under(0.14));
  for (const [x, z, r, a] of [[-13, -8, 5, 0.4], [-9, -13, 4.4, 1.9], [-15.5, 9, 4, -0.6], [-6, 16, 3.6, 0.2]]) {
    const pts = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6 * Math.PI; pts.push([x + Math.cos(a) * Math.cos(t) * r, 17.2 + Math.sin(t) * 2.3, z + Math.sin(a) * Math.cos(t) * r]); }
    S.tube(pts, 1.5, { sides: 6, caps: false, flat: [1, 0.85] });
  }
  // the fox, asleep in it: a haunch, the tail over the far rim, the chin on the near one
  S.paint(fill(FOX), under(0.16));
  S.ball([3.5, 18.6, -3.5], [12, 5.2, 9.5], { segs: 12, rings: 6, v0: 0.42 });
  S.paint(fill(FOX), vol(blob([-22.5, 23, 4], [5, 4.6, 6.4]), WHITE), under(0.16), crown(0.1));
  S.tube(spline([[-3, 19, -8.5], [-13, 21.6, -11.5], [-20.6, 24.4, -5], [-22.6, 23.8, 3], [-21.4, 21.6, 8.4]], 3), (t) => (t < 0.7 ? lerp(3, 4.7, t / 0.7) : lerp(4.7, 0.9, (t - 0.7) / 0.3)), { sides: 8 });
  S.at([9.5, 25.2, 16.2], [0.12, -0.3, 0.1], () => {
    S.paint(fill(FOX), vol(blobs(blob([0, -3.4, 3], [5.4, 3, 4.6]), blob([-4.6, -1.6, 2.6], [2.4, 2.6, 3]), blob([4.6, -1.6, 2.6], [2.4, 2.6, 3])), WHITE), under(0.14), crown(0.1),
      ...face({ at: [0, 0.4], gap: 6.4, r: 1.25, eye: 'closed', mouth: null, blush: 0xf2a6a0 }));
    S.ball([0, 0, 0], [6.4, 5.3, 5.6], { segs: 12, rings: 7 });
    S.paint(fill(WHITE), under(0.14));
    S.at([0, -1.8, 4.6], [Math.PI / 2 - 0.15, 0, 0], () => S.cone([0, 0, 0], 2.7, 4.4, { segs: 8, tip: 0.9, sz: 0.8 }));
    S.paint(fill(0x3a3038, { rough: 0.2 }));
    S.ball([0, -2.1, 9], [1.05, 0.85, 0.9], { segs: 6, rings: 4 });
    for (const s of [1, -1]) {
      S.paint(fill(FOX), vol(above(4.6), 0x6a4030), proj('front', poly([[-1.4, 0.6], [1.4, 0.6], [0, 4.2]]), 0xf6dcc8));
      S.at([s * 4, 3.6, -0.6], [0, 0, -s * 0.36], () => S.cone([0, 0, 0], 2.5, 6, { segs: 6, sz: 0.6 }));
    }
  });
  S.paint(fill(WHITE), under(0.16));
  for (const [x, z, a] of [[3.6, 21.9, 0.1], [15.6, 16.6, -0.75]]) S.at([x, 22.4, z], [0, a, 0], () => S.ball([0, 0.6, 0], [1.9, 1.3, 2.4], { segs: 6, rings: 4 }));
  // the fried tofu it sleeps under
  S.part('age', { rest: 0, move: (t) => hinge([2, 23.4, -12.5], 'x', -1.05 * t) }, () => {
    const dots = (x, y, z) => (Math.hypot(((x + (Math.round(z / 2.6) % 2) * 1.6) % 3.2 + 3.2) % 3.2 - 1.6, (z % 2.6 + 2.6) % 2.6 - 1.3) < 0.42 ? tone(AGE, 0.2) : AGE);
    S.paint(fill(dots), proj('top', stroke(rbox(2, 3, 11.4, 9.4, 2.4), 1.5, 0.9), tone(AGE, 0.22)), under(0.2));
    S.at([2, 23.6, -3], [0.1, 0, -0.04], () => S.box(-12, -0.4, -10, 12, 1.5, 10, { bevel: 0.9 }));
  });
}

// ------------------------------------------------------------------ 2. Zaru-soba Sloth
export function soba(S) {
  const LACQ = 0x2e2529, VERM = 0xb93a2c, STRAW = 0xdccd92, SOBA = 0xa08f7b, DARK = tone(SOBA, 0.3), WOOD = 0x9a6a44, MASK = 0xece1cb;
  const mat = rbox(0, 0, 19.6, 15.6, 0.5);
  S.paint(fill(LACQ), vol(above(5.4), VERM), proj('top', mat, STRAW), proj('top', and(mat, repeatV(rbox(0, 0, 30, 0.16, 0), 1.5)), tone(STRAW, 0.22)),
    proj('top', and(mat, repeatU(rbox(0, 0, 0.3, 30, 0), 9.6)), tone(STRAW, 0.38)), under(0.2), ...stamp(MAKER, { c: 0x7a6c6e }));
  S.box(-22, 0, -18, 22, 7, 18, { bevel: 0.8 });
  // the heap, shreds of nori, a dab of wasabi, the dipping cup
  S.paint(fill(strands(SOBA, DARK, { p: 1.9, w: 0.42, amp: 0.7, k: 7 })), proj('top', or(seg(-6, 3, -2.5, 4.4, 0.7), seg(2, -2.6, 5.5, -1.2, 0.7), seg(-1, -5.5, 1.6, -7.4, 0.7), seg(6.5, 4.6, 9, 3, 0.7), seg(-9.5, -3, -7, -4.6, 0.7)), 0x2e4034));
  S.with(LO, () => S.ball([0, 7, 0], [15.2, 5.2, 11.2], { segs: 12, rings: 10, v0: 0.5 }));
  S.paint(fill(0x8fbf62), under(0.2));
  S.ball([-17.6, 7.9, 13.6], [1.9, 1.3, 1.7], { segs: 6, rings: 4 });
  S.paint(fill(0x33507e), vol(band(3.4, 4.4), 0xf1ece0), under(0.15));
  S.at([16.6, 7, 12.6], null, () => S.lathe([[3, 0], [3.7, 5.6], [3.2, 5.6], [3, 4.6]], { segs: 10 }));
  S.paint(fill(0x4a2e22, { rough: 0.15 }));
  S.cyl([16.6, 11.3, 12.6], 3.05, 0.3, { segs: 10 });
  // the lift: a curtain of noodles up to the chopsticks
  S.paint(fill(SOBA), shade(vol(above(48)), 0.1));
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 1.5, z = -1.6 + (i % 2) * 1.2, ph = i * 1.3;
    S.tube(spline([[x * 1.6, 9.5, z], [x * 1.2 + Math.sin(ph) * 0.8, 24, z + 0.4], [x + Math.cos(ph) * 0.7, 40, z], [x * 0.8, 56.6, z + 0.3]], 3), 0.85, { sides: 5, caps: false });
  }
  S.paint(fill(WOOD), vol(slabZcap(), tone(WOOD, 0.3)), under(0.18));
  for (const dz of [-0.9, 1.3]) S.tube([[-21, 60.4, -2.4 + dz], [10.5, 55.8, 0.2 + dz]], (t) => lerp(1.1, 0.6, t), { sides: 6 });
  // the sloth, hanging by its arms
  S.part('sloth', { rest: 0.5, move: (t) => hinge([0, 57.4, 0.4], 'x', lerp(-0.3, 0.3, t)) }, () => {
    const FUR = strands(SOBA, DARK, { p: 2.1, w: 0.4, amp: 0.6, k: 6 });
    S.paint(fill(FUR), vol(blob([0, 37, 11], [4.6, 6, 3.4]), tint(SOBA, 0.3)), under(0.16));
    S.with(LO, () => S.ball([0, 37.6, 4.8], [8, 10, 7], { segs: 12, rings: 8 }));
    S.paint(fill(SOBA), under(0.18));
    for (const s of [1, -1]) {
      S.tube(spline([[s * 6, 43.6, 4.4], [s * 8, 50.5, 3.6], [s * 6, 57, 2.2], [s * 5.4, 59.2, 0], [s * 5.2, 57.6, -1.6]], 3), (t) => lerp(2.2, 1.5, t), { sides: 7 });
      S.tube(spline([[s * 4.6, 30.6, 4.6], [s * 6.2, 25, 5.6], [s * 5.4, 19.6, 5.2]], 3), (t) => lerp(2.4, 1.6, t), { sides: 7 });
    }
    S.paint(fill(0xe9dfc8));
    for (const s of [1, -1]) for (const d of [-0.9, 0.9]) { S.tube([[s * 5.3 + d, 57.8, -1.4], [s * 5.3 + d, 55.6, -2]], (t) => lerp(0.55, 0.2, t), { sides: 4 }); S.tube([[s * 5.4 + d, 19.8, 5.4], [s * 5.4 + d, 17.6, 6.2]], (t) => lerp(0.55, 0.2, t), { sides: 4 }); }
    S.at([0, 47, 7.8], [0.1, 0, 0.14], () => {
      S.paint(fill(FUR), proj('front', ellipse(0, -0.2, 5, 4.3), MASK), proj('front', pair(ellipse(3.3, 0.2, 2.5, 1.2, -0.5)), 0x5c4838),
        ...face({ at: [0, 0.5], gap: 5.8, r: 0.95, eye: 'sleepy', mouth: 'smile', my: 3.1, mw: 2.6, col: 0x2e2420 }), proj('front', ellipse(0, -0.9, 1.15, 0.8), 0x3a2e2a, { rough: 0.2 }), under(0.14));
      S.ball([0, 0, 0], [6.5, 5.7, 5.6], { segs: 12, rings: 7 });
    });
  });
}
// (the lacquered tips of the chopsticks: everything towards their thin end)
function slabZcap() { const f = (x) => 3 - x; f.box = [3, -1e4, -1e4, 1e4, 1e4, 1e4]; return f; }

// ------------------------------------------------------------------ 3. Ramen Mammoth
export function ramen(S) {
  const BOWL = 0xd94a30, CREAM = 0xf3ecdc, SOUP = 0xc98b4c, NOODLE = 0xf2d27c, ND = 0xd9ae52, NORI = 0x26392f;
  const key = repeatU(or(stroke(rbox(0, 5.6, 1.5, 1.5, 0), 0.55), rbox(0, 5.6, 0.5, 0.5, 0)), 4.6);
  S.paint(fill(BOWL), vol(below(1.6), 0xe9e2d2), vol(band(3.2, 8), CREAM), wrap(24, key, BOWL), under(0.16), ...stamp(MAKER, { c: 0x8a8478 }));
  S.lathe([[11, 0], [11.6, 1.6], [20, 3.2], [24.4, 8], [25, 9.6], [24.2, 10]], { segs: 16, cap: 'bottom' });
  S.paint(fill(CREAM));
  S.lathe([[24.2, 10], [23.2, 9.6], [22.6, 7.6]], { segs: 16, cap: false });
  S.paint(fill(SOUP, { rough: 0.4 }), proj('top', stroke(circle(0, 0, 21.6), 1.6), tint(SOUP, 0.3)), negi([[-17, -9], [15.5, -12, 0.9], [18.5, 3], [-18, 6, 0.9], [-10, -17.5], [8, -18.5, 0.8]]),
    proj('top', or(circle(-14.5, -13, 1), circle(-12.6, -14.6, 0.6), circle(17, -7, 0.8), circle(-19, -1, 0.6), circle(13, -16.5, 0.6)), tint(SOUP, 0.42)));
  S.cyl([0, 7.3, 0], 22.6, 0.4, { segs: 16 });
  // the mammoth: a shaggy dome of noodles on four stumps
  const SHAG = strands(NOODLE, ND, { p: 2.5, w: 0.5, amp: 1, k: 6 });
  S.paint(fill(SHAG), proj('front', or(arc(-2.3, 0.3, 1.1, 0.3, 2.84, 0.5), arc(0, 0.3, 1.1, 0.3, 2.84, 0.5), arc(2.3, 0.3, 1.1, 0.3, 2.84, 0.5)), 0xf9efcc), under(0.16));
  S.with(LO, () => { for (const [x, z] of [[-8, 7], [8, 7], [-8.5, -10], [8.5, -10]]) S.at([x, 7.4, z], null, () => S.cyl([0, 0, 0], [4.8, 4.4], 11, { segs: 8 })); });
  S.paint(fill(SHAG), negi([[-5, 8, 1], [6, 11, 0.9], [2, 3.4, 1], [-8, -1, 0.9], [7.5, -4, 1]]), under(0.18), crown(0.08));
  S.with(LO, () => S.ball([0, 26.5, -3], [14.6, 13.4, 15.4], { segs: 14, rings: 9 }));
  S.paint(fill(NORI), proj('back', or(seg(-5, 3, -1, 5, 0.4), seg(2, -2, 6, -0.5, 0.4), seg(-3, -4.5, 0, -3.6, 0.4)), tint(NORI, 0.2)), proj('front', or(seg(-5, 3, -1, 5, 0.4), seg(2, -2, 6, -0.5, 0.4)), tint(NORI, 0.2)));
  S.at([0, 36.4, -14.6], [-0.42, 0, 0], () => S.box(-8.4, -7.4, -0.45, 8.4, 8.6, 0.45));
  S.paint(fill(0xc9a070), under(0.2));
  S.tube(spline([[0, 24, -18], [0, 19, -20.6], [1.4, 15, -19.6]], 3), [1.3, 1.1, 1, 0.9, 0.8, 0.7, 0.5], { sides: 5, flat: [1.5, 0.6] });
  // head: tired eyes, slices of pork for ears, bean sprouts for tusks, half an egg worn as a cap
  S.paint(fill(SHAG), ...face({ at: [0, 35.4], gap: 10.6, r: 1.35, eye: 'tired', mouth: null }), under(0.16), crown(0.08));
  S.ball([0, 32.5, 12.5], [10.2, 10.6, 9.4], { segs: 12, rings: 8 });
  S.ball([0, 41.6, 10], [6.8, 5.4, 6.2], { segs: 10, rings: 6 });
  for (const s of [1, -1]) {
    S.paint(fill(0xc98c6c), proj('top', circle(0, 0, 6.2), 0xd9a184), proj('top', or(arc(0.6, 0, 3.8, 0.6, 4.6, 1.3), arc(-0.4, 0.4, 1.4, 3, 8, 1)), 0xf2d8c0), proj('top', stroke(circle(0, 0, 6.3), 0.9, 0.5), 0xa9684c));
    S.at([s * 12.6, 33.4, 9.4], [Math.PI / 2, s * 0.62, 0], () => S.cyl([0, -0.7, 0], 6.4, 1.4, { segs: 10, bevel: 0.4 }));
    S.paint(fill(0xf7f3e4), under(0.14));
    S.tube(spline([[s * 5.4, 27, 19.6], [s * 9.4, 21.8, 22.6], [s * 10.6, 22.6, 25], [s * 9.6, 26.4, 26]], 3), (t) => lerp(1.25, 0.6, t), { sides: 6 });
    S.paint(fill(0xf2d568));
    S.ball([s * 9.5, 27.2, 26.2], [1.2, 1.5, 1.2], { segs: 6, rings: 4 });
  }
  S.paint(fill(0xf8f4ea), proj('top', circle(0, 0, 2.7), 0xf2a23a, { rough: 0.2 }), proj('top', circle(-0.7, 0.7, 0.8), 0xf9c66a));
  S.at([0, 46.6, 10.4], [0.75, 0, 0], () => S.ball([0, 0, 0], [4.5, 2.8, 5.6], { segs: 10, rings: 8, v1: 0.5 }));
  // the trunk, with a slice of naruto it has no plans for
  S.part('trunk', { rest: 0.12, move: (t) => hinge([0, 30.5, 19.5], 'x', -1.15 * t) }, () => {
    S.paint(fill(strands(NOODLE, ND, { p: 2.2, w: 0.5, amp: 0.3, k: 2 })), under(0.16));
    S.tube(spline([[0, 31, 19.6], [0, 25, 23.4], [0, 19, 23.8], [0, 15.4, 21], [0, 16.6, 18.2]], 4), (t) => lerp(3.4, 2.1, t), { sides: 8 });
    S.paint(fill(0xf6f2ea), ...NARUTO(0, 0, 3.4), under(0.14));
    S.at([0, 14.6, 16.6], [0.5, 0, 0], () => S.cyl([0, -0.5, 0], 3.5, 1, { segs: 10 }));
  });
}

// ------------------------------------------------------------------ 4. Hiyashi-chuka Peacock
export function hiyashi(S) {
  const DISH = 0xc4e4e6, NOODLE = 0xf2d476, ND = 0xd8b050, CUKE = 0x86c462, HAM = 0xf2a4a0, EGG = 0xf7d95c, TOMATO = 0xe2503c;
  S.paint(fill(DISH), proj('top', stroke(circle(0, 0, 21.4), 0.8), tone(DISH, 0.2)), proj('top', stroke(circle(0, 0, 16.5), 0.5), tint(DISH, 0.4)), under(0.16), ...stamp(MAKER, { c: 0x7c9a9c }));
  S.lathe([[10.5, 0], [11.5, 1.2], [21, 2.4], [24, 4.4], [23.2, 5], [19.5, 3.6], [0, 3.2]], { segs: 16 });
  const N = strands(NOODLE, ND, { p: 2, w: 0.45, amp: 0.7, k: 6 });
  S.paint(fill(N), under(0.16));
  S.with(LO, () => {
    S.ball([0, 3.6, 2], [12, 9.4, 10.6], { segs: 12, rings: 10, v0: 0.5 });
    S.tube(spline([[0, 9.5, 6], [0, 17.5, 11.4], [0, 24.5, 9.6], [0, 29.6, 10.8]], 4), (t) => lerp(3.3, 2.3, t), { sides: 8 });
  });
  S.paint(fill(N), ...face({ at: [0, 32.6], gap: 4.4, r: 0.85, eye: 'smug', mouth: null }), under(0.14));
  S.ball([0, 32, 11.4], [3.8, 3.6, 4.2], { segs: 10, rings: 6 });
  S.paint(fill(0xf2903a), under(0.2));
  S.at([0, 31.4, 15], [Math.PI / 2 + 0.15, 0, 0], () => S.cone([0, 0, 0], 1.5, 3.6, { segs: 6 }));
  S.paint(fill(0xf4f2e6));
  for (const [x, a] of [[-1.6, 0.35], [0, 0], [1.6, -0.35]]) { S.tube([[x, 34.8, 10.6], [x - a * 4, 39.6, 10.2]], 0.35, { sides: 4 }); }
  S.paint(fill(0x6fb650));
  for (const [x, a] of [[-1.6, 0.35], [0, 0], [1.6, -0.35]]) S.ball([x - a * 4, 40.2, 10.2], [1.3, 0.9, 0.5], { segs: 6, rings: 4 });
  // sliced egg for wings
  for (const s of [1, -1]) {
    S.paint(fill(0xf8f5ec), proj('top', circle(0, 0, 2.5), 0xf2b23e), proj('top', circle(-0.6, 0.7, 0.7), 0xf8cf6c));
    S.at([s * 10.6, 8.4, 3.6], [Math.PI / 2, s * 1.2, 0], () => S.cyl([0, -0.6, 0], 4.6, 1.2, { segs: 10, sx: 0.85, bevel: 0.3 }));
  }
  // red ginger and a dab of mustard on the rim
  S.paint(fill(0xe04a5a), under(0.2));
  for (const [x, z, a] of [[-15, 12, 0.4], [-13.4, 13.6, -0.5], [-16, 13.6, 1.4], [-14.4, 11.4, 2.2]]) S.tube([[x - Math.cos(a) * 2.6, 4.9, z - Math.sin(a) * 2.6], [x, 5.9, z], [x + Math.cos(a) * 2.6, 4.9, z + Math.sin(a) * 2.6]], 0.55, { sides: 4 });
  S.paint(fill(0xe8c63a), under(0.2));
  S.ball([16, 5.4, 12], [2.2, 1.2, 1.8], { segs: 6, rings: 4 });
  // the fan: cucumber, ham and shredded omelette, each ending in a slice of tomato
  const fan = [CUKE, HAM, EGG, CUKE, EGG, HAM, CUKE];
  fan.forEach((c, k) => {
    const a = (k - 3) * 0.37, len = 30 - Math.abs(k - 3) * 1.6, z = -5.4 - (k % 2) * 0.9;
    S.part(`f${k}`, { rest: 1, move: (t) => hinge([0, 8, z], 'z', a * 0.9 * (1 - t)) }, () => {
      S.paint(fill(c), proj('front', seg(0, 2, 0, len - 4, 0.5), tone(c, 0.16)), c === CUKE ? proj('front', or(rbox(-1.75, len / 2, 0.35, len / 2, 0), rbox(1.75, len / 2, 0.35, len / 2, 0)), 0x4f8f40) : null,
        under(0.14));
      S.at([0, 8, z], [0, 0, -a], () => {
        S.loft([[0, 1.3], [len * 0.55, 2.1], [len - 3, 1.9]].map(([y, w]) => ring([0, y, 0], w, 0.55, 6, { pow: 4 })));
        S.paint(fill(TOMATO), proj('top', circle(0, 0, 2.3), 0xf08a6a), proj('top', or(circle(-0.9, -0.5, 0.42), circle(0.9, -0.5, 0.42), circle(0, 1, 0.42)), 0xf8dc9a));
        S.at([0, len, 0], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.6, 0], 3.4, 1.2, { segs: 10, bevel: 0.3 }));
      });
    });
  });
}

// ------------------------------------------------------------------ 5. Yakisoba Lion
export function yakisoba(S) {
  const WOOD = 0xbd8958, IRON = 0x2c2c33, SOBA = 0xb8763a, SD = 0x8a5226, TAN = 0xeabb7c, GINGER = 0xe0485a;
  S.paint(fill(WOOD), proj('top', or(seg(-22, -11, 22, -12, 0.35), seg(-22, 4, 22, 3, 0.35), seg(-22, 12, 22, 13, 0.35), arc(-12, -3, 3.2, 0, Math.PI * 2, 0.35)), tone(WOOD, 0.2)), under(0.2), ...stamp(MAKER, { c: 0x7a5636 }));
  S.box(-26, 0, -18, 26, 3.6, 18, { bevel: 1 });
  S.paint(fill(IRON, { rough: 0.35 }), proj('top', stroke(ellipse(0, 0, 21.6, 13.6), 0.7), tint(IRON, 0.22)), under(0.2), crown(0.06));
  S.lathe([[17, 3.6], [22.6, 4.2], [23.6, 6.4], [22.4, 6.8], [21, 5.6], [0, 5.4]], { segs: 16, sz: 0.66 });
  for (const s of [1, -1]) S.box(s * 22.6, 5, -3, s * 25.6, 6.6, 3, { bevel: 0.6 });
  const N = strands(SOBA, SD, { p: 2.2, w: 0.5, amp: 0.9, k: 6 });
  // the loaf of a body: cabbage, flecks of green laver, a fried egg on its back
  S.paint(fill(N), vol(blobs(blob([-9, 12, -8], [3, 2.4, 3]), blob([9.5, 9, -2], [2.6, 2.6, 3.2]), blob([4, 17, -12], [3, 2, 2.6])), 0xcfe0a0), proj('top', or(circle(-4, 9, 0.5), circle(6, 4, 0.5), circle(-8, 0, 0.5), circle(3, 12, 0.5), circle(8, 9.5, 0.5), circle(-6, 12.5, 0.5)), 0x4f8a48), under(0.18));
  S.with(LO, () => S.ball([0, 11.4, -3.5], [11.4, 7.6, 12], { segs: 12, rings: 8 }));
  S.paint(fill(0xf8f5ec), proj('top', stroke(ellipse(0, 0, 6.4, 5.4), 0.8, 0.3), 0xe8d9b4), under(0.14));
  S.at([0.5, 18.6, -6], [0.12, 0.3, 0], () => S.ball([0, 0, 0], [7, 1.1, 6], { segs: 10, rings: 4 }));
  S.paint(fill(0xf2a030, { rough: 0.15 }), proj('top', circle(-0.5, 6.3, 0.8), 0xf8d070));
  S.ball([0.2, 19.6, -5.6], [2.9, 1.7, 2.9], { segs: 8, rings: 5 });
  S.paint(fill(TAN), under(0.18), proj('top', or(seg(-1.1, -3.6, -1.1, -2.2, 0.4), seg(1.1, -3.6, 1.1, -2.2, 0.4)), tone(TAN, 0.3)));
  for (const s of [1, -1]) S.at([s * 5.4, 5.6, 9.6], null, () => S.ball([0, 1.6, 0], [3, 2.1, 4], { segs: 8, rings: 4 }));
  S.paint(fill(SOBA), under(0.18));
  S.tube(spline([[0, 9, -14.6], [8, 6.6, -17], [15.4, 7, -12.4], [16.4, 8.6, -8.6]], 3), 0.9, { sides: 5 });
  S.paint(fill(N));
  S.ball([16.6, 9.2, -7.8], [2.4, 2.2, 2.4], { segs: 6, rings: 4 });
  // a turner leaning on the board
  S.paint(fill(0xc9ced4, { rough: 0.3 }), under(0.2));
  S.at([20, 3.6, 12.6], [0.18, 0.5, 0], () => S.box(-3, 0, -3.4, 3, 0.5, 3.4));
  S.paint(fill(0x8a5a38));
  S.tube([[20.8, 4.4, 10.2], [24, 7.4, 3.6]], 0.9, { sides: 5 });
  // the head: a smug face in a mane of fried noodles, pickled ginger for a crown
  S.part('head', { rest: 0.5, move: (t) => hinge([0, 10, 8], 'z', lerp(-0.34, 0.34, t)) }, () => {
    S.paint(fill(N), under(0.18));
    S.dens = LO.dens;
    S.ball([0, 18.4, 6.6], [11, 10.6, 5], { segs: 14, rings: 7 });
    for (let k = 0; k < 13; k++) {
      const a = (k / 13) * Math.PI * 2 + 0.24, c = Math.cos(a), s = Math.sin(a), tw = k % 2 ? 0.5 : -0.5;
      const P = (r, da, z) => [Math.cos(a + da) * r, 18.4 + Math.sin(a + da) * r, z];
      void c; void s;
      S.tube(spline([P(7, 0, 8.4), P(10.4, tw * 0.3, 9.6), P(12.8, tw * 0.7, 8), P(12, tw * 1.1, 5.6)], 3), 2, { sides: 6 });
    }
    S.dens = 1;
    S.paint(fill(TAN), vol(blob([0, 15.2, 13.6], [4.4, 3.2, 3.6]), tint(TAN, 0.5)), ...face({ at: [0, 19.6], gap: 6.4, r: 1.3, eye: 'smug', mouth: 'w', my: 4.5, mw: 3 }), under(0.14));
    S.ball([0, 18, 10.4], [7, 6.4, 5.6], { segs: 12, rings: 7 });
    S.paint(fill(0x4a3028, { rough: 0.2 }));
    S.ball([0, 17.1, 15.9], [1.5, 1.05, 0.9], { segs: 6, rings: 4 });
    for (const s of [1, -1]) {
      S.paint(fill(TAN), proj('front', circle(s * 5.6, 26.2, 1.3), 0x9a5a3a));
      S.ball([s * 5.6, 26, 9.6], [2.4, 2.4, 1.6], { segs: 8, rings: 5 });
    }
    S.paint(fill(GINGER), under(0.2));
    for (const [x, a, z] of [[-2.4, 0.5, 9], [0, -0.2, 10], [2.2, -0.7, 8.6], [-0.6, 1.2, 8], [1.2, 0.3, 11]]) S.tube([[x - Math.cos(a) * 2.6, 29.4, z - Math.sin(a) * 1.2], [x, 30.8, z], [x + Math.cos(a) * 2.6, 29.6, z + Math.sin(a) * 1.2]], 0.6, { sides: 4 });
  });
}

// ------------------------------------------------------------------ 6. Three Hours Later (secret)
export function nobi(S) {
  const CUP = 0xf5f1e6, RED = 0xd9412f, NOODLE = 0xf4e4b2, ND = 0xdcc88a;
  const CR = (y) => 13 + y * (4 / 30);
  S.paint(fill(CUP), vol(band(7, 23), RED), vol(band(8.2, 8.9), 0xf2c23a), vol(band(21.1, 21.8), 0xf2c23a),
    proj('front', circle(0, 15, 5.4), CUP), proj('front', kana('三分', 0, 15, 5.4), RED), proj('back', label('INSTANT', 0, 16.6, 0.5), CUP, { hard: true }), proj('back', label('NOODLE', 0, 12.6, 0.5), CUP, { hard: true }),
    under(0.16), ...stamp(MAKER, { c: 0x8a8478 }));
  S.lathe([[11.4, 0], [CR(0), 1], [CR(29), 29], [17.9, 29.4], [17.9, 30.4], [16.4, 30.4], [16.2, 29.4]], { segs: 14, cap: 'bottom' });
  // what three minutes turned into
  const N = strands(NOODLE, ND, { p: 3, w: 0.6, amp: 1.1, k: 5 });
  S.paint(fill(N), ...face({ at: [0, 40.6], gap: 13, r: 1.8, eye: 'tired', mouth: 'wavy', my: 5.6, mw: 4.4 }), proj('front', poly([[10.5, 44.6], [12, 41.4], [9, 41.4]]), 0xbfe0ee), proj('front', circle(10.5, 41.6, 1.5), 0xbfe0ee),
    proj('top', or(circle(-8, -6, 1), circle(6, 9, 0.9), circle(-3, 10, 0.8)), 0xf2c84a), proj('top', or(circle(9, -4, 0.9), circle(-11, 3, 0.8), circle(2, -10, 0.9)), 0x79b85c), under(0.14), crown(0.06));
  S.ball([0, 37.5, 0], [18.6, 11.4, 17.6], { segs: 14, rings: 9 });
  S.paint(fill(N), under(0.16));
  S.with(LO, () => {
    S.ball([-9.5, 29.4, 13], [9, 7, 6.6], { segs: 10, rings: 6 });
    S.ball([12.5, 29, 9.4], [7.4, 6, 6], { segs: 10, rings: 6 });
    S.ball([-13, 30, -9], [7, 5.6, 7], { segs: 10, rings: 6 });
  });
  S.paint(fill(NOODLE), under(0.16));
  for (const [a, y1, r] of [[-0.75, 16, 1.3], [-0.42, 20.5, 1.1], [0.62, 18, 1.2], [1.05, 22, 1]]) {
    const R = 17.6, c = Math.sin(a), s = Math.cos(a);
    S.tube(spline([[c * (R - 2), 30.5, s * (R - 2)], [c * (R + 0.8), 28, s * (R + 0.8)], [c * (CR(y1) + r), y1, s * (CR(y1) + r)]], 3), (t) => r * (t > 0.85 ? 1.25 : 1), { sides: 6 });
  }
  // a fork someone gave up on, and the lid
  S.clear(true);
  S.paint(fill(0xf4f6f4));
  S.at([8.5, 45.4, -4], [0.35, 0.3, -0.55], () => { S.box(-1.7, 0, -0.5, 1.7, 15, 0.5, { bevel: 0.3 }); S.box(-2.3, 15, -0.5, 2.3, 18, 0.5, { bevel: 0.3 }); });
  S.clear(false);
  S.part('lid', { rest: 0.35, move: (t) => hinge([0, 30.4, -16.4], 'x', lerp(0.3, -0.75, t)) }, () => {
    const half = [];
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; half.push([Math.cos(a) * 17.6, Math.sin(a) * 17.6]); }
    S.paint(fill(0xd9dbe2, { rough: 0.25 }), proj('back', circle(0, 0, 19), RED), proj('back', stroke(circle(0, 0, 14.6), 0.8), 0xf2c23a), proj('back', kana('三分', 0, 7.4, 5), CUP),
      proj('front', or(seg(-8, 5, 5, 8, 0.4), seg(-4, 11, 9, 12.4, 0.4)), 0xbfc2cc));
    S.at([0, 30.4, -16.4], null, () => S.extrude(half, -0.25, 0.25));
  });
}

void wrap; void band; void halfAbove; void label; void repeatU;
