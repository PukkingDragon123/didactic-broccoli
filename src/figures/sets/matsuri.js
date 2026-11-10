// Natsu Matsuri Yomise (夏まつり夜店): summer festival stalls under paper lanterns. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/matsuri.js. The family look: every piece stands on the same
// round shrine-ground base: packed earth on top, the red-and-white festival curtain round its side, a little lantern.
import { spline, ring } from '../sculpt.js';
import { blade, paw } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, cut, stroke, pair, repeatU, repeatV, label, kana, below, above, band, blob, blobs,
} from '../paint.js';
import { form, dense, fine } from './neko_cafe.js';
import { kid } from './yokai.js';

const MAKER = 'OMATSURI';
const lerp = (a, b, t) => a + (b - a) * t;
const RED = 0xd8423a, WHITE = 0xf8f4ec, EARTH = 0xd8c4a0, INDIGO = 0x2e3a66, FISH = 0xf26a3a, BLUSH = 0xf2a0a0, INK = 0x2e2a30;
const TOP = 4;

/** The family's base: packed earth on top (a few pebbles placed by hand), the kōhaku curtain round the side. */
function ground(S, r = 18, o = {}) {
  S.paint(
    fill(WHITE, { rough: 0.8 }), wrap(r, repeatU(rbox(0, 2, 1.6, 3, 0), 6.4), RED), vol(below(0.7), INDIGO), vol(above(3.3), INDIGO),
    proj('top', or(ellipse(r * 0.5, r * 0.3, 0.9, 0.6, 0.3), ellipse(-r * 0.4, -r * 0.5, 0.7, 0.5, -0.4), ellipse(-r * 0.62, r * 0.2, 0.8, 0.5, 1), ellipse(r * 0.2, -r * 0.7, 0.6, 0.4)), tone(EARTH, 0.18)),
    ...(o.print || []), under(0.2), ...stamp(MAKER, { c: 0x8a7a6a, px: 0.3 }),
  );
  S.lathe([...dense([[8, 0.4], [r - 0.6, 0.4]], 3), [r, 0.8], [r, 3.4], [r - 0.6, 4], [r - 1.9, 3.6]], { segs: 26, sx: o.sx ?? 1, cap: true });
  S.paint(fill(EARTH, { rough: 0.95 }), proj('top', or(ellipse(r * 0.5, r * 0.3, 0.9, 0.6, 0.3), ellipse(-r * 0.4, -r * 0.5, 0.7, 0.5, -0.4), ellipse(-r * 0.62, r * 0.2, 0.8, 0.5, 1)), tone(EARTH, 0.18)));
  S.cyl([0, 3.4, 0], [r - 1.9, r - 2.1], 0.6, { segs: 26, sx: o.sx ?? 1, bevel: 0 });
}

/** A goldfish (wakin), nose towards +z, its middle at the origin, about 14 mm long. o.k scale, o.col, o.face. */
export function goldfish(S, o = {}) {
  const C = o.col ?? FISH;
  S.paint(fill(C, { rough: 0.3 }), vol(blob([0, -2.6, 1], [2.6, 2, 6]), WHITE), vol(above(1.6), tone(C, 0.12)), ...(o.face || []), under(0.12), crown(0.1));
  form(S, [0, 0, 0], [[-6, 0.4, 0.5, 0.2], [-5, 1.6, 2, 0.2], [-2.6, 2.8, 3.8, 0], [0.6, 3.2, 4.2, 0], [3.4, 2.8, 3.4, -0.2], [5.4, 1.8, 2.2, -0.4], [6.4, 0.05, 0.05, -0.5]], { axis: 'z', n: 14 });
  S.paint(fill(C, { rough: 0.3 }), vol(above(0), tint(C, 0.3)));
  for (const s of [1, -1]) S.at([s * 0.6, 0.2, -5.6], [-Math.PI / 2 - 0.4, s * 0.55, 0], () => blade(S, 7.2, 6, 0.6, { shape: 'wing', cup: s * 1.2 }));
  S.at([0, 3.4, 0], [-0.5, 0, 0], () => blade(S, 4.4, 6, 0.5, { shape: 'leaf', cup: 0.3 }));
  for (const s of [1, -1]) S.at([s * 2.6, -1.4, 2], [0.5, 0, s * 2.2], () => blade(S, 3, 2, 0.4, { shape: 'round' }));
  S.paint(fill(0xf8f4ec, { rough: 0.2 }), proj('right', circle(-3.6, 0.6, 0.6), EYE), proj('left', circle(3.6, 0.6, 0.6), EYE));
  for (const s of [1, -1]) S.ball([s * 2.2, 0.6, 3.6], [0.9, 1, 1], { segs: 8, rings: 5 });
}

// ------------------------------------------------------------------ 1. Goldfish in a Bag
export function kingyo(S) {
  ground(S, 16);
  // the water's surface, the goldfish (Captain), the clear bag tied off with a red string loop
  S.joint('fish', { pivot: [0, TOP + 12, 0], axis: 'y', min: -0.6, max: 0.6, rest: 0, g: [0, 0.5], idle: 0.2 }, () => S.at([0.6, TOP + 11, 0.4], [0, 0.7, 0.1], () => goldfish(S, { face: [proj('right', arc(-4.4, -0.6, 0.7, Math.PI * 1.2, Math.PI * 1.8, 0.25), INK)] }), 1.15));
  S.paint(fill(0xa8d8ea, { rough: 0.1 }), proj('top', or(arc(-2, 1, 3, 0.4, 2.2, 0.3), arc(3, -2, 2.4, 3.4, 5, 0.3)), 0xd8f0f8));
  S.cyl([0, TOP + 22.2, 0], 10.6, 0.2, { segs: 20, bevel: 0 });
  S.clear(true);
  S.paint(fill(0xe4f2f4));
  S.lathe(spline([[0, 0], [6, 0.6], [10.4, 4.4], [12.4, 11], [11.6, 19], [8.2, 25.6], [3.4, 30], [1.2, 32.6], [1.6, 35]], 3).map(([r, y]) => [r, TOP + y]), { segs: 22, sz: 0.88, cap: false });
  S.clear(false);
  S.paint(fill(RED, { rough: 0.6 }));
  S.torus([0, TOP + 32.6, 0], 1.5, 0.45, { segs: 12, sides: 5 });
  S.tube(spline([[0, TOP + 32.6, 1.4], [3, TOP + 37, 1.6], [3.4, TOP + 44, 0.8], [0, TOP + 46.6, 0], [-3.4, TOP + 44, -0.8], [-3, TOP + 37, -1.4], [0, TOP + 32.6, -1.4]], 3), 0.45, { sides: 5 });
  S.paint(fill(0xeef6f6, { rough: 0.3 }));
  S.lathe([[1.4, TOP + 33], [2, TOP + 35.6], [1.4, TOP + 36.2]], { segs: 10, cap: true });
  // the paper scoop that finally did it, torn, lying by the bag
  S.paint(fill(0xf2a0b8, { rough: 0.4 }), proj('top', circle(10.4, -6.6, 2.6), 0xf6f2ea), proj('top', cut(circle(10.4, -6.6, 2.6), circle(11.4, -7.4, 1.6)), 0xf8f8f6));
  S.at([10.4, TOP + 0.4, 6.6], null, () => S.torus([0, 0, 0], 3.1, 0.55, { segs: 16, sides: 5 }));
  S.box(12.8, TOP, 8.4, 14.6, TOP + 0.9, 12.8, { bevel: 0.3 });
  S.paint(fill(0xf6f2ea));
  S.cyl([10.4, TOP + 0.2, 6.6], 2.7, 0.2, { segs: 16, bevel: 0 });
}

// ------------------------------------------------------------------ 2. Yo-yo Balloon
export function yoyo(S) {
  const TUB = 0x3f7fc6, YEL = 0xf6e08a;
  ground(S, 18);
  // the tub of water with the others floating in it
  S.paint(fill(TUB, { rough: 0.35 }), vol(band(TOP + 6.2, TOP + 7), WHITE), under(0.2), crown(0.1));
  S.lathe(dense([[13, TOP], [14.6, TOP + 0.6], [15.4, TOP + 7], [14.6, TOP + 7], [14, TOP + 1.2]], 1.6), { segs: 24, cap: 'bottom' });
  S.paint(fill(0x8ac8ea, { rough: 0.08 }), proj('top', or(arc(-4, 3, 6, 0.3, 1.6, 0.35), arc(6, -5, 4, 3.6, 5, 0.35)), 0xd0ecf8));
  S.cyl([0, TOP + 5.2, 0], 14.2, 0.2, { segs: 24, bevel: 0 });
  for (const [x, z, c] of [[-8, -5, 0xf2a0c0], [7, -7, 0x9ad46a], [-9, 6, 0x8ac0f2]]) {
    S.paint(fill(c, { rough: 0.3 }), wrap(4, or(seg(-1, 0, -1, 30, 0.4), seg(2.4, 0, 2.4, 30, 0.4)), WHITE), crown(0.15));
    S.ball([x, TOP + 7.6, z], [4.2, 3.6, 4.2], { segs: 14, rings: 7 });
  }
  // the one you caught, bouncing on its elastic, a face on it
  S.joint('bounce', { slide: [0, 6, 0], min: -0.3, max: 1, rest: 0, g: [0, 1], idle: 0.12 }, () => {
    const L = [proj('front', or(...[-5.4, 0.6, 6.6].map((x) => seg(x, TOP + 12, x - 1, TOP + 34, 0.9))), 0x3f7fc6), proj('front', or(...[-2.4, 3.6].map((x) => seg(x, TOP + 12, x - 1, TOP + 34, 0.6))), RED)];
    S.paint(fill(YEL, { rough: 0.25 }), ...L, wrap(9.6, or(seg(8, 0, 8, 40, 1), seg(14, 0, 14, 40, 0.7), seg(20, 0, 20, 40, 1)), 0x3f7fc6), ...face({ at: [1.2, TOP + 23.6], gap: 6, r: 1.4, eye: 'dot', mouth: 'w', mw: 2.4, blush: BLUSH, near: 4 }), crown(0.12), under(0.12));
    S.lathe(spline([[0, 10.8], [5.4, 11.6], [9.2, 15], [10.2, 21], [9, 27], [5.4, 31.4], [1.2, 33.6], [0, 33.8]], 3).map(([r, y]) => [r, TOP + y]), { segs: 22 });
    S.paint(fill(YEL, { rough: 0.25 }));
    S.lathe([[1.2, TOP + 33.4], [0.6, TOP + 34.4], [1.1, TOP + 35.2], [0, TOP + 35.6]], { segs: 10 });
    S.paint(fill(0xf6f2ea, { rough: 0.6 }));
    S.tube(spline([[0, TOP + 35.4, 0], [0.4, TOP + 40, 0.2], [-0.2, TOP + 45, 0], [0, TOP + 48.4, 0]], 3), 0.32, { sides: 5 });
    S.at([0, TOP + 50.4, 0], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 2, 0.4, { segs: 14, sides: 5 }));
  });
}

// ------------------------------------------------------------------ 3. Fox Mask
export function kitsune(S) {
  const MASK = 0xfaf6ee, GOLD = 0xe2b84a, WOOD = 0xb08050;
  ground(S, 16);
  // the stand
  S.paint(fill(WOOD, { rough: 0.6 }), crown(0.1), under(0.2));
  S.cyl([0, TOP, -2], [5, 4.4], 1.8, { segs: 16, bevel: 0.5 });
  S.cyl([0, TOP + 1.8, -2], 1.1, 22, { segs: 10 });
  // the mask, tilted a little, the way it hangs off a stall
  S.joint('mask', { pivot: [0, TOP + 24, -2], axis: 'z', min: -0.5, max: 0.5, rest: 0, g: [0, 0.35], idle: 0.04 }, () => S.at([0, TOP + 26, -1], [-0.1, 0, 0.12], () => {
    S.paint(
      fill(MASK, { rough: 0.35 }),
      proj('front', or(poly([[-6.6, 3], [-2.2, 1.6], [-3, 0.4], [-6.4, 1.4]]), poly([[6.6, 3], [2.2, 1.6], [3, 0.4], [6.4, 1.4]])), INK),
      proj('front', or(seg(-7.4, 4.2, -2, 2.8, 0.7), seg(7.4, 4.2, 2, 2.8, 0.7)), RED), proj('front', or(poly([[-1.6, 8], [0, 4.6], [1.6, 8], [0, 9.4]])), RED), proj('front', or(circle(-1.2, 6.8, 0.4), circle(1.2, 6.8, 0.4)), GOLD),
      proj('front', or(...[-1, 1].flatMap((s) => [seg(s * 3, -3.4, s * 6.8, -2.4, 0.3), seg(s * 3, -4.4, s * 6.8, -4.8, 0.3)])), RED),
      proj('front', arc(0, -3.6, 2.6, Math.PI * 1.15, Math.PI * 1.85, 0.4), RED), under(0.12),
    );
    form(S, [0, 0, 0], [[0, 8.8, 9.4, 0.4], [1.6, 9.4, 9.8, 0.2], [3.8, 9, 9, 0], [5.6, 7.2, 7, -0.8], [7.4, 4.6, 4.4, -2.4], [9.6, 3, 2.6, -3.4], [11.8, 1.8, 1.6, -3.6], [12.6, 0.05, 0.05, -3.6]], { axis: 'z', n: 18, caps: 'start' });
    S.paint(fill(INK, { rough: 0.25 }));
    S.ball([0, -3.6, 12.4], [1.1, 0.8, 0.7], { segs: 8, rings: 5 });
    for (const s of [1, -1]) {
      S.paint(fill(MASK, { rough: 0.35 }), proj('front', ellipse(0, 3.6, 1.8, 3.2), RED), proj('front', ellipse(0, 7, 0.9, 1.2), GOLD));
      S.at([s * 5.2, 7.2, 1.6], [0.1, 0, -s * 0.35], () => blade(S, 9, 7.4, 1.6, { shape: 'ear', cup: 0.9 }));
    }
    // the cords
    S.paint(fill(RED, { rough: 0.7 }), vol(below(-14), GOLD));
    for (const s of [1, -1]) S.tube(spline([[s * 8.8, 1, 0.6], [s * 10.4, -4, 0.8], [s * 10.8, -10, 1.6], [s * 10.6, -16.4, 2]], 3), 0.5, { sides: 5 });
  }));
}

// ------------------------------------------------------------------ 4. Choco Banana Trio
export function chocoban(S) {
  const FOAM = 0xf6f4ee, BAN = 0xf6e2a0;
  ground(S, 17);
  // the styrofoam block they stand in, the janken sign
  S.paint(fill(FOAM, { rough: 0.9 }), proj('front', or(seg(-10, TOP + 4, -6, TOP + 6, 0.2), seg(5, TOP + 3, 9, TOP + 5, 0.2)), tone(FOAM, 0.08)), under(0.15));
  S.box(-13, TOP, -6, 13, TOP + 9, 6, { bevel: 1 });
  S.paint(fill(0xf6f0e0), proj('front', kana('チョコバナナ', 0, TOP + 6.4, 1.8), RED), proj('front', label('JANKEN', -3.4, TOP + 3.4, 0.2), INK, { hard: true }), proj('front', label('Y200', 3.6, TOP + 3.4, 0.26), INK, { hard: true }), under(0.2));
  S.at([0, 0, 6.8], [-0.12, 0, 0], () => S.box(-7.4, TOP + 1.4, -0.3, 7.4, TOP + 8.4, 0.3, { bevel: 0.3 }));
  S.paint(fill(0xd8c08a));
  // three bananas: milk chocolate, strawberry, white, with sprinkles placed one by one
  const sprinkles = (cx, cz, seed) => or(...[[1.2, 30], [-1.6, 28], [0.6, 26], [-0.8, 33], [1.8, 34.6], [-1.6, 24], [0.2, 36.4], [1.4, 22.6]].map(([x, y], i) => seg(cx + x, TOP + y + seed, cx + x + (i % 2 ? 0.7 : -0.6), TOP + y + seed + 0.6, 0.3)));
  const cols = [0xf2c83a, 0x3f7fc6, 0x5fae5a, 0xf6f2ea, 0xd8423a];
  for (const [k, x, c, ang] of [[0, -7.6, 0x6a3a26, 0.22], [1, 0, 0xf2a0b8, 0.04], [2, 7.6, 0xf6f0e4, -0.24]]) S.joint(`ban${k}`, { pivot: [x, TOP + 9, 0], axis: 'z', min: -0.3, max: 0.3, rest: 0, g: [0, k === 1 ? 0.2 : -0.15], idle: 0.06 }, () => {
    S.paint(fill(0xd8c08a));
    S.tube([[x, TOP + 4, 0], [x, TOP + 18, 0]], 0.45, { sides: 6 });
    S.paint(fill(c, { rough: 0.25 }), ...cols.map((cc, i) => proj('front', sprinkles(x, 0, i * 0.37 - (k * 0.9)), cc, { near: 0 })).filter((_, i) => i % 3 !== k % 3 || true).slice(0, 3), vol(above(TOP + 31 + k), BAN),
      ...face({ at: [x + 0.6, TOP + 22 + k], gap: 3.8, r: 0.8, eye: k === 1 ? 'closed' : 'dot', mouth: 'smile', mw: 1.4, blush: BLUSH, near: 1 }), under(0.1), crown(0.1));
    S.at([x, TOP + 9, 0], [0, 0, ang], () => S.tube(spline([[0, 3, 0], [1.6, 11, 0.6], [1.8, 18 + k, 0.4], [0, 24 + k, -0.6], [-1.4, 26 + k, -0.8]], 3), (t) => (t < 0.06 ? lerp(2.6, 3.6, t / 0.06) : t > 0.78 ? lerp(3.4, 1, (t - 0.78) / 0.22) : 3.6), { sides: 10, flat: [1, 0.86] }));
  });
}

// ------------------------------------------------------------------ 5. Wataame Girl
export function wataame(S) {
  const YUKATA = 0x2e4a86, FLOWER = 0xf2a0b8, OBI = 0xf2c83a, CANDY = 0xf6c6d8;
  ground(S, 17);
  const flowers = (v) => proj(v, or(...[[-4, 6], [3, 9], [-2, 14], [5, 4], [0, 19], [-5, 20]].map(([x, y]) => star(x, y, 1.4, 5, 0.55))), FLOWER);
  S.at([0, TOP, 0], null, () => kid(S, {
    cloth: YUKATA, shoes: 'geta', shoeCol: RED, hair: 'okappa', eye: 'dot', mouth: 'o',
    outfit: [vol(band(12.4, 15.4), OBI), flowers('front'), flowers('back'), proj('front', or(seg(-3.2, 23.6, 1, 15.6, 1), seg(3.2, 23.6, -0.4, 18, 1)), WHITE)],
    arms: [[7.6, 20, 6], [-7.4, 14.6, 5.4]], sleeveR: [2.2, 3, 3.6],
    sleeveMarks: [proj('front', or(star(6, 18, 1.2, 5, 0.55), star(-6, 16, 1.2, 5, 0.55)), FLOWER)],
    onHead: (S) => {
      // the fox mask, worn on the side of the head (the official way)
      S.at([-8.4, 3.4, 2], [0, -1.2, 0.3], () => {
        S.paint(fill(0xfaf6ee, { rough: 0.35 }), proj('front', or(seg(-3.4, 1.6, -1, 0.8, 0.5), seg(3.4, 1.6, 1, 0.8, 0.5)), RED), proj('front', poly([[-0.8, 4], [0.8, 4], [0, 2.4]]), RED));
        form(S, [0, 0, 0], [[0, 4.4, 4.6, 0.2], [1.4, 4.4, 4.4, 0], [3, 3.2, 3, -0.6], [4.6, 1.4, 1.2, -1.6], [5.2, 0.05, 0.05, -1.8]], { axis: 'z', n: 14, caps: 'start' });
        for (const s of [1, -1]) S.at([s * 2.6, 3.4, 0.6], [0, 0, -s * 0.35], () => blade(S, 4, 3.4, 0.8, { shape: 'ear', cup: 0.4 }));
      });
      S.paint(fill(RED, { rough: 0.6 }));
      S.at([5.6, 7.4, 3], [0.2, 0, -0.5], () => { for (let k = 0; k < 5; k++) S.at([0, 0, 0], [0, 0, k * 1.257], () => blade(S, 2, 1.6, 0.5, { shape: 'round' })); });
    },
  }));
  // the cotton candy, bigger than her head
  S.paint(fill(0xd8c08a));
  S.tube([[7.6, TOP + 18, 6.4], [9.6, TOP + 36, 7.4]], 0.4, { sides: 6 });
  S.joint('candy', { pivot: [7.6, TOP + 20, 6], axis: 'z', min: -0.3, max: 0.3, rest: 0, g: [0, -0.2], idle: 0.04 }, () => {
    S.paint(fill(CANDY, { rough: 0.95 }), vol(blobs(blob([6, TOP + 44, 6], [5, 4, 5]), blob([13, TOP + 40, 9], [4, 4, 4])), tint(CANDY, 0.35)), under(0.12));
    form(S, [9.8, TOP + 33, 7.4], [[0, 0.05, 0.05, 0], [1, 4.4, 4, 0.4], [3.4, 8.2, 7.4, 0.6], [6.6, 9.8, 9, 0.2], [9.8, 9.4, 8.8, -0.4], [12.4, 7, 6.6, -0.6], [14.4, 3.6, 3.4, -0.4], [15.2, 0.05, 0.05, -0.2]], { n: 18, pow: 1.9 });
    for (const [x, y, z, r] of [[16, TOP + 41, 8, 3.2], [4.4, TOP + 42.4, 9, 3], [9, TOP + 47, 5.4, 2.6], [12.4, TOP + 36, 13.4, 2.8], [6, TOP + 37.6, 12.6, 2.4]]) S.ball([x, y, z], [r, r * 0.86, r], { segs: 12, rings: 7 });
  });
  // the goldfish bag in the other hand
  S.paint(fill(RED, { rough: 0.6 }));
  S.tube(spline([[-7.4, TOP + 14.6, 5.4], [-7.6, TOP + 12, 6], [-7.8, TOP + 9.4, 6.4]], 2), 0.3, { sides: 4 });
  S.at([-7.8, TOP + 3.4, 6.4], [0, 0.5, 0], () => goldfish(S), 0.36);
  S.clear(true);
  S.paint(fill(0xe4f2f4));
  S.lathe(spline([[0, 0], [2.4, 0.4], [3.4, 2.6], [3, 5.4], [1.4, 7], [0.5, 8]], 2), { segs: 14, at: [-7.8, TOP + 1.4, 6.4], cap: false });
  S.clear(false);
}

// ------------------------------------------------------------------ 6. Takoyaki Stall
export function takoyaki(S) {
  const WOOD = 0xc8a070, IRON = 0x3a3a42, BALL = 0xd8a05a, SAUCE = 0x6a3a26, OCTO = 0xf27a6a;
  ground(S, 24, { sx: 1.1 });
  // the stall: a wooden counter, posts, the striped roof
  S.paint(fill(WOOD, { rough: 0.6 }), proj('front', or(seg(-18, TOP + 4, 18, TOP + 4, 0.2), seg(-18, TOP + 10, 18, TOP + 10, 0.2)), tone(WOOD, 0.2)), under(0.2), crown(0.06));
  S.box(-20, TOP, -8, 20, TOP + 15, 8, { bevel: 0.6 });
  S.paint(fill(0xf2c83a, { rough: 0.5 }), proj('front', circle(0, TOP + 7.6, 4.6), RED, { near: 8 }), proj('front', kana('たこ焼', 0, TOP + 7.6, 3), 0xf8f4ec, { near: 8 }), proj('front', or(rbox(-12.6, TOP + 7.6, 4.4, 4, 0.6), rbox(12.6, TOP + 7.6, 4.4, 4, 0.6)), 0xf8f4ec, { near: 8 }), proj('front', or(label('8 PCS', -12.6, TOP + 8.6, 0.24), label('Y500', -12.6, TOP + 6.2, 0.26), label('MAYO', 12.6, TOP + 8.6, 0.24), label('OK', 12.6, TOP + 6.2, 0.26)), INK, { near: 8, hard: true }));
  S.box(-19.4, TOP + 1, 8, 19.4, TOP + 14, 8.6);
  S.paint(fill(WOOD, { rough: 0.6 }), under(0.2));
  for (const [x, z] of [[-19, -7], [19, -7], [-19, 7], [19, 7]]) S.box(x - 0.8, TOP + 15, z - 0.8, x + 0.8, TOP + 34, z + 0.8);
  S.paint(fill((x, y, z) => (Math.floor((z + 60) / 4.2) % 2 ? RED : WHITE), { rough: 0.7 }), under(0.2));
  S.at([0, 0, 0], [0, -Math.PI / 2, 0], () => S.extrude([[-12, TOP + 33], [-12, TOP + 31.6], [0, TOP + 36.6], [12, TOP + 31.6], [12, TOP + 33], [0, TOP + 38]], -22, 22));
  // the hanging noren, cut into strips
  S.paint(fill(INDIGO, { rough: 0.8 }), proj('front', kana('たこ焼', 0, TOP + 28.6, 3.6), 0xf8f4ec));
  for (const x of [-18, -12, -6, 0, 6, 12]) S.box(x + 0.2, TOP + 25, 9.6, x + 5.8, TOP + 32, 10);
  // the griddle: an iron plate of half-round cups, the balls turning in them
  S.paint(fill(IRON, { rough: 0.4 }), crown(0.1));
  S.box(-16, TOP + 15, -6.4, 2, TOP + 16.6, 4, { bevel: 0.4 });
  S.paint(fill(BALL, { rough: 0.6 }), vol(above(TOP + 18), tint(BALL, 0.2)), proj('top', or(...[-1, 1].map((d) => arc(0, 0, 0.8, d, d + 1.4, 0.2))), tone(BALL, 0.3)));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) S.ball([-13.4 + i * 4.2, TOP + 17, -3.6 + j * 4.6], 1.9, { segs: 10, rings: 6 });
  // a boat of eight: sauce, mayonnaise, aonori, bonito
  S.paint(fill(0xe8d8b0, { rough: 0.8 }), under(0.2));
  S.at([10, TOP + 15, 1.6], [0, 0.3, 0], () => S.extrude([[-4.8, 0], [4.8, 0], [5.8, 1.6], [-5.8, 1.6]], -3.2, 3.2));
  S.paint(fill(BALL, { rough: 0.6 }), vol(above(TOP + 18.2), SAUCE), proj('top', or(...[0, 1, 2].map((k) => seg(6 + k * 3, -3, 6.6 + k * 3, 0, 0.3))), 0xf8f4e8), proj('top', or(circle(8, -1.2, 0.3), circle(11, -2.4, 0.3), circle(13, -0.6, 0.3)), 0x5f8a3a));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) S.ball([10 + (i - 1.5) * 2.4 * 0.95 + j * 0.7, TOP + 17.6, 1.6 + (j - 0.5) * 2.6 + (i - 1.5) * 0.7], 1.25, { segs: 10, rings: 6 });
  // the octopus on the roof, headband on, waving
  S.at([0, TOP + 37, 0], null, () => {
    S.paint(fill(OCTO, { rough: 0.4 }), ...face({ at: [0, 6], gap: 5, r: 1.1, eye: 'closed', mouth: null, blush: 0xf2c0b8 }), under(0.12), crown(0.06));
    form(S, [0, 0, 0], [[1.6, 0.05, 0.05, 0], [2, 4, 3.8, 0], [4.6, 6.2, 5.8, 0], [8.4, 6.6, 6.2, -0.4], [12, 5.4, 5.2, -0.8], [14.2, 2.4, 2.4, -0.8], [14.8, 0.05, 0.05, -0.8]], { n: 16 });
    S.paint(fill(OCTO, { rough: 0.4 }));
    S.lathe([[0, 3.8], [1.6, 3.6], [1.9, 4.4], [1.4, 4.8], [0.6, 4.4]], { segs: 10, at: [0, 0, 5.8], cap: false });
    S.paint(fill(WHITE), wrap(6.6, rbox(0, 9.4, 0.6, 0.6, 0), RED));
    S.torus([0, 9.4, -0.2], 6.5, 0.7, { segs: 18, sides: 5 });
    S.paint(fill(OCTO, { rough: 0.4 }), vol(below(0.4), tint(OCTO, 0.3)));
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + 0.4; S.tube(spline([[Math.sin(a) * 4, 2.4, Math.cos(a) * 4], [Math.sin(a) * 7.6, 0.6, Math.cos(a) * 7.6], [Math.sin(a + 0.4) * 9.6, 0.4, Math.cos(a + 0.4) * 9.6]], 2), (t) => lerp(1.4, 0.4, t), { sides: 6 }); }
    S.joint('wave', { pivot: [4.6, 4, 2], axis: 'z', min: -0.6, max: 0.6, rest: 0, g: [0, 0.5], idle: 0.2 }, () => S.tube(spline([[4.6, 4, 2], [8, 6.6, 2.4], [9.4, 10.6, 2.4], [8.4, 12.6, 2]], 3), (t) => lerp(1.4, 0.4, t), { sides: 6 }));
  });
}

// ------------------------------------------------------------------ 7. Bon Odori Yagura
export function yagura(S) {
  const WOOD = 0xb08a5a, LANT = 0xf26a4a, TAIKO = 0x8a4a2a, SKIN = 0xf2e8d0, HAPPI = 0x2e4a86;
  ground(S, 26);
  // the tower: four legs, a platform wrapped in the kōhaku curtain, a railing, the ladder
  S.paint(fill(WOOD, { rough: 0.7 }), under(0.2));
  for (const s of [1, -1]) for (const t of [1, -1]) S.box(s * 15 - 1, TOP, t * 12 - 1, s * 15 + 1, TOP + 34, t * 12 + 1, { bevel: 0.3 });
  for (const y of [TOP + 9]) { S.box(-15, y, -12.6, 15, y + 1.2, -11.4); S.box(-15.6, y, -12, -14.4, y + 1.2, 12); S.box(14.4, y, -12, 15.6, y + 1.2, 12); }
  S.paint(fill(WOOD, { rough: 0.7 }), crown(0.08), under(0.2));
  S.box(-16.6, TOP + 22, -13.6, 16.6, TOP + 23.6, 13.6, { bevel: 0.4 });
  S.paint(fill((x, y, z) => (Math.floor((Math.abs(x) > 15.6 ? z : x) / 2.6 + 60) % 2 ? RED : WHITE), { rough: 0.8 }), vol(above(TOP + 21.4), INDIGO));
  for (const [a, b, c, d] of [[-16.4, -13.4, 16.4, -12.8], [-16.4, 12.8, 16.4, 13.4], [-16.4, -12.8, -15.8, 12.8], [15.8, -12.8, 16.4, 12.8]]) S.box(a, TOP + 15, b, c, TOP + 22, d);
  S.paint(fill(0xd8423a, { rough: 0.5 }), under(0.2));
  for (const s of [1, -1]) S.box(s * 15 - 0.5, TOP + 23.6, -13, s * 15 + 0.5, TOP + 28.6, 13);
  S.box(-15, TOP + 28, -13.4, 15, TOP + 29.2, -12.4); S.box(-15, TOP + 28, 12.4, 15, TOP + 29.2, 13.4);
  S.paint(fill(WOOD, { rough: 0.7 }));
  for (const s of [1, -1]) S.box(s * 4 - 0.6, TOP, 14.4, s * 4 + 0.6, TOP + 23, 15.6);
  for (let y = TOP + 3; y < TOP + 22; y += 3.6) S.box(-4, y, 14.6, 4, y + 0.7, 15.4);
  // the lanterns, strung out to the corners
  S.paint(fill(0x3a3034));
  for (const s of [1, -1]) S.tube(spline([[s * 15, TOP + 34, 12], [s * 19, TOP + 28, 16], [s * 23, TOP + 22, 19]], 3), 0.2, { sides: 4 });
  for (const [x, y, z] of [[17.6, TOP + 29, 14.4], [21.6, TOP + 24.4, 17.6], [-17.6, TOP + 29, 14.4], [-21.6, TOP + 24.4, 17.6]]) {
    S.paint(fill(LANT, { rough: 0.7 }), vol(band(y - 2.6, y - 2), 0x3a3034), vol(band(y + 2, y + 2.6), 0x3a3034), proj('front', kana('夏', x, y, 2.2), INK));
    S.lathe(dense([[1.4, y - 2.6], [2.4, y - 1.4], [2.6, y], [2.4, y + 1.4], [1.4, y + 2.6]], 0.8), { segs: 12, at: [x, 0, z], cap: true });
  }
  // the taiko, on its stand
  const DY = TOP + 31, DZ = 2;
  S.paint(fill(TAIKO, { rough: 0.35 }), under(0.2));
  S.at([0, DY, DZ], [Math.PI / 2 - 0.35, 0, 0], () => S.lathe(dense([[3.8, -3], [4.5, -1.5], [4.7, 0], [4.5, 1.5], [3.8, 3]], 0.9), { segs: 18, cap: false }));
  S.paint(fill(0xd8b45a, { rough: 0.3 }));
  S.at([0, DY, DZ], [Math.PI / 2 - 0.35, 0, 0], () => { for (const y of [-2.6, 2.6]) for (let k = 0; k < 10; k++) { const a = k * 0.628; S.ball([Math.cos(a) * 4.1 * (1 - Math.abs(y) * 0.02), y * 1.05, Math.sin(a) * 4.1], 0.35, { segs: 5, rings: 3 }); } });
  S.paint(fill(SKIN, { rough: 0.5 }), proj('front', stroke(circle(0, 0, 2.4), 0.3), tone(SKIN, 0.2)), proj('front', or(circle(-0.7, 0.4, 0.6), circle(0.7, 0.4, 0.6), circle(0, -0.6, 0.6)), 0x2e2a30));
  S.at([0, DY, DZ], [Math.PI / 2 - 0.35, 0, 0], () => { S.cyl([0, 2.9, 0], 4, 0.25, { segs: 18, bevel: 0 }); S.cyl([0, -3.15, 0], 4, 0.25, { segs: 18, bevel: 0 }); });
  S.paint(fill(0x6a4a3a));
  for (const s of [1, -1]) S.tube([[s * 3.6, TOP + 23.6, DZ + 2.4], [s * 3.4, DY - 2, DZ + 0.6]], 0.45, { sides: 6 });
  S.box(-3.8, TOP + 23.6, DZ - 1.6, 3.8, TOP + 24.4, DZ + 3.4, { bevel: 0.2 });
  // the kid drummer: happi coat, a twisted headband, both sticks up
  S.at([0, TOP + 23.6, -6.4], null, () => {
    kid(S, {
      cloth: HAPPI, shoes: 'zori', hair: 'short', eye: 'closed', mouth: 'smile', legCol: 0xf6f2ea,
      body: [[3.6, 0.05, 0.05, 0], [3.8, 6.2, 5.4, 0], [5, 6.6, 5.8, 0], [8.6, 6.4, 5.4, 0.2], [13.4, 6.2, 5.2, 0.4], [18.2, 6.1, 5, 0.3], [21.2, 5.4, 4.4, 0.2], [23.2, 3.4, 3, 0], [24, 0.05, 0.05, 0]],
      outfit: [vol(below(9), 0xf6f2ea), proj('front', or(seg(-3, 23.6, -1.4, 9, 1.2), seg(3, 23.6, 1.4, 9, 1.2)), WHITE), proj('back', kana('まつり', 0, 17, 3.4), WHITE), vol(band(11.2, 12.6), RED)],
      sleeve: HAPPI, arms: [[7.4, 27.6, 4.6], [-7.4, 27.6, 4.6]], sleeveR: [2.2, 2.6, 2.8],
      headJoint: { idle: 0.08 },
      onHead: (S) => {
        S.paint(fill(WHITE, { rough: 0.8 }), vol((x, y, z) => Math.abs(Math.sin((Math.atan2(x, z) * 6))) - 0.8, RED));
        S.torus([0, 3.6, -0.6], 10.6, 0.9, { segs: 22, sides: 5, sy: 0.9 });
        S.at([0, 3.6, -11], [0.3, 0, 0], () => { for (const s of [1, -1]) S.at([0, 0, 0], [0, 0, s * 0.6], () => blade(S, 3.4, 2, 0.6, { shape: 'leaf' })); });
      },
    });
    S.joint('drum', { pivot: [0, 27.6, 4.6], axis: 'x', min: -0.6, max: 0.4, rest: 0, g: [0, 0.35], idle: 0.15 }, () => {
      S.paint(fill(0xe8d4a0));
      for (const s of [1, -1]) S.tube([[s * 7.4, 27, 4.6], [s * 2.6, 21.4, 12.4]], 0.6, { sides: 6 });
    });
  }, 0.62);
}

// ------------------------------------------------------------------ 8. Goldfish Strikes Back (secret)
export function gyakuten(S) {
  const POOL = 0x3f7fc6, KID = 0x5fae5a;
  ground(S, 22, { sx: 1.1 });
  // the scooping pool, water up to the brim
  S.paint(fill(POOL, { rough: 0.35 }), crown(0.1), under(0.2));
  S.at([0, TOP, 0], null, () => {
    for (const [a, b, c, d] of [[-21, -14, 21, -12.4], [-21, 12.4, 21, 14], [-21, -12.4, -19.4, 12.4], [19.4, -12.4, 21, 12.4]]) S.box(a, 0, b, c, 7.4, d, { bevel: 0.6 });
    S.box(-19.4, 0, -12.4, 19.4, 1, 12.4);
    S.paint(fill(0x8ac8ea, { rough: 0.08 }), proj('top', or(arc(-10, 4, 6, 0.3, 1.6, 0.35), arc(10, -5, 4, 3.6, 5, 0.35), arc(4, 6, 3, 0.4, 2.4, 0.3)), 0xd0ecf8));
    S.box(-19.4, 1, -12.4, 19.4, 6.2, 12.4);
  });
  // two little ones watching from the water
  for (const [x, z, a] of [[-12, 6, 0.8], [-7, -6, -0.6]]) S.at([x, TOP + 6.6, z], [0, a, 0], () => goldfish(S), 0.42);
  // the goldfish, up on its tail, holding the scoop
  S.at([6, TOP + 6.2, 0], null, () => {
    S.at([0, 13.6, 2], [-0.85, 0, 0], () => goldfish(S, { face: [proj('right', arc(-4.4, -1.2, 0.8, Math.PI * 1.15, Math.PI * 1.85, 0.25), INK), proj('left', arc(4.4, -1.2, 0.8, Math.PI * 1.15, Math.PI * 1.85, 0.25), INK)] }), 2.2);
    S.joint('scoop', { pivot: [-6, 15, 3], axis: 'z', min: -0.4, max: 0.6, rest: 0, g: [0, 0.45], idle: 0.04 }, () => {
      S.paint(fill(0xf2a0b8, { rough: 0.4 }));
      S.tube([[-5.6, 14.6, 4], [-12, 20, 4.4]], 0.6, { sides: 6 });
      S.at([-17, 22.6, 4.6], [0.2, 0, 0.3], () => {
        S.torus([0, 0, 0], 5.4, 0.7, { segs: 20, sides: 5 });
        S.paint(fill(0xf6f2ea, { rough: 0.9 }), proj('top', cut(all_, circle(2, -1.4, 1.8)), 0xf6f2ea));
        S.cyl([0, -0.2, 0], 5.2, 0.2, { segs: 20, bevel: 0 });
      });
      // the prize: one very surprised child, sitting in the scoop
      fine(0.5, () => S.at([-17, 23, 4.6], [0.2, 0.3, 0.3], () => kid(S, {
        pose: 'kneel', cloth: KID, hair: 'short', eye: 'stare', mouth: 'o', eyeR: 1.6,
        outfit: [proj('front', or(seg(-3, 19, 1, 12.6, 1), seg(3, 19, -0.4, 14.6, 1)), WHITE), vol(band(10.4, 12.6), 0xf2c83a)],
        arms: [[7.6, 24, 3], [-7.6, 24, 3]], headJoint: false,
      }), 0.34));
    });
  });
}
const all_ = { d: () => -1, b: null };

void ring; void paw; void shade; void tint; void and; void pair; void repeatV;
