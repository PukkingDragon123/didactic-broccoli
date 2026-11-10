// Line-Dried Animals (干したてどうぶつ): animals pegged out on the balcony to dry, resigned to it. Each stands on a
// little plank deck with its own drying rig. Sculpt programs in millimetres (src/figures/sculpt.js); the series data is
// src/data/series/hoshitate.js.
import { spline } from '../sculpt.js';
import { head, torso, paw, blade } from '../anatomy.js';
import { sweep, peg, coil, rail } from '../forms.js';
import {
  fill, proj, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, or, stroke, pair, all, repeatU, repeatV, label, kana, band, below, blob, blobs,
} from '../paint.js';

const MAKER = 'KAMENOKO';
const POLE = 0x8fbcd2, FOOT = 0xeef0ea, DECK = 0xc99a68;
const PEGS = [[0xf2a7b0], [0x9fd6c2], [0xf6d77a], [0xb7c6ee]];
const pegPaint = (i) => [[fill(PEGS[i % 4][0], { rough: 0.45 }), under(0.18), crown(0.1)], [fill(0xc9ced4, { rough: 0.3 })]];

/** The plank deck every figure stands on (top at y = 4). */
function deck(S, w, d, c = DECK) {
  S.paint(fill(c), proj('top', repeatU(rbox(0, 0, 0.35, 40, 0), 9.6), tone(c, 0.22)), proj('top', or(circle(-w + 6, d - 4, 0.6), circle(w - 7, -d + 5, 0.6), circle(3, d - 4, 0.5)), tone(c, 0.35)),
    proj('front', repeatV(rbox(0, 0, 60, 0.25, 0), 2), tone(c, 0.12)), under(0.2), ...stamp(MAKER, { c: tone(c, 0.4) }));
  S.box(-w, 0, -d, w, 4, d, { bevel: 1 });
}
/** A water-weighted foot and a post up to y = h, standing on the deck at (x, z). */
function post(S, x, z, h, c = POLE) {
  S.paint(fill(FOOT), proj('top', stroke(circle(x, -z, 4.2), 0.4), tone(FOOT, 0.2)), under(0.2));
  S.lathe([[6.2, 4], [6.4, 4.8], [5.6, 6.6], [3.4, 7.6], [1.8, 8.6]], { segs: 14, at: [x, 0, z] });
  S.paint(fill(c, { rough: 0.4 }), shade(vol(band(h - 3, h)), 0.12));
  S.tube([[x, 7, z], [x, h, z]], 1.25, { sides: 8 });
}
/** A post with an arm reaching forward to a hook over (0, h, 0). */
function hookStand(S, h, back = 12) {
  post(S, 0, -back, h + 4);
  S.paint(fill(POLE, { rough: 0.4 }));
  S.tube(spline([[0, h + 4, -back], [0, h + 7.5, -back + 3], [0, h + 8, -4], [0, h + 7, 0.4]], 3), 1.1, { sides: 8 });
  S.paint(fill(0xd9dde2, { rough: 0.3 }));
  S.tube(spline([[0, h + 7, 0.4], [0, h + 4.6, 0.6], [0, h + 3.6, -1.4], [0, h + 4.6, -2.8]], 3), 0.5, { sides: 6 });
}
/** A wire hanger's hook, hung at (0, y, 0): the curl, the twist, down to y - 5. */
function hangerHook(S, y, c = 0xc9ced4) {
  S.paint(fill(c, { rough: 0.3 }));
  S.tube(spline([[0, y - 1.6, 0.4], [0, y + 0.4, 0.6], [0, y + 0.8, -1.4], [0, y - 0.6, -2.4], [0, y - 2.6, -1.2], [0, y - 5, 0]], 3), 0.42, { sides: 6 });
}

// ------------------------------------------------------------------ 1. Towel Cat
export function towel(S) {
  const FUR = 0xf4e3c6, TABBY = 0xe2a066, PINK = 0xf2b3ae, WHITE = 0xfbf7ee;
  deck(S, 31, 13);
  for (const x of [-25, 25]) post(S, x, 0, 50);
  S.paint(fill(POLE, { rough: 0.4 }), under(0.12));
  rail(S, [-28, 50, 0], [28, 50, 0], 1.5, 1.9, [fill(0xe6eaee)]);
  // the cat, folded over the line like a bath towel: stripes across its back, the tail end turned into a fringe
  const stripes = vol(blobs(...[16, 22, 28, 34, 40].map((y) => blob([0, y, 6], [14, 1.4, 6])), ...[30, 36, 42].map((y) => blob([0, y, -6], [14, 1.4, 6]))), TABBY);
  S.paint(fill(FUR), stripes, under(0.12), crown(0.06));
  sweep(S, [[0, 15, 6.4], [0, 28, 4.6], [0, 42, 3.2], [0, 49.4, 2.6], [0, 53.2, 0], [0, 49.4, -2.6], [0, 41, -3.2], [0, 30, -3.8]], (v) => 10.5 - 2.5 * Math.abs(v - 0.5), (v) => 2.7 - 0.5 * v, { sides: 12, steps: 3 });
  // hind legs and the tail, hanging at the back
  S.paint(fill(FUR), shade(vol(below(26)), 0.06), under(0.14));
  for (const s of [1, -1]) {
    S.tube(spline([[s * 6.8, 36, -4], [s * 7.4, 30, -4.6], [s * 7, 25.4, -4.4]], 2), [2.2, 1.9, 1.7], { sides: 8 });
    S.paint(fill(WHITE), under(0.14));
    S.ball([s * 7, 24.4, -4.2], [2.1, 1.7, 2.2], { segs: 8, rings: 5 });
    S.paint(fill(FUR), shade(vol(below(26)), 0.06), under(0.14));
  }
  S.joint('tail', { pivot: [0, 31, -4], axis: 'z', min: -0.5, max: 0.5, rest: 0, idle: 0.3 }, () => {
    S.paint(fill(FUR), vol(blobs(blob([0, 24, -4.6], [3, 1.2, 3]), blob([0, 17, -4.6], [3, 1.2, 3])), TABBY), under(0.12));
    S.tube(spline([[0, 31, -4], [0.6, 24, -5], [-0.6, 16, -4.8], [0.4, 12.6, -4]], 3), (t) => 1.7 - 0.5 * t, { sides: 8 });
  });
  // two pegs on the line
  peg(S, [-9, 50.6, 0], [0, 0, 0], pegPaint(0), 1.1);
  peg(S, [9, 50.6, 0], [0, 0, 0], pegPaint(1), 1.1);
  // front legs dangling, the head hung upside down at the front, giving up
  S.paint(fill(FUR), under(0.14));
  for (const s of [1, -1]) {
    S.tube(spline([[s * 6.2, 22, 6], [s * 7.2, 15, 6.8], [s * 7.4, 9.6, 6.4]], 2), [2, 1.8, 1.6], { sides: 8 });
    S.paint(fill(WHITE), proj('front', or(seg(s * 7.4 - 0.7, 7.4, s * 7.4 - 0.7, 8.4, 0.3), seg(s * 7.4 + 0.7, 7.4, s * 7.4 + 0.7, 8.4, 0.3)), tone(WHITE, 0.3)), under(0.14));
    S.ball([s * 7.4, 8.6, 6.5], [2.1, 1.8, 2.2], { segs: 8, rings: 5 });
    S.paint(fill(FUR), under(0.14));
  }
  S.rest = 0;
  S.joint('head', { pivot: [0, 17, 6.4], axis: 'x', min: -0.9, max: 0.2, rest: 0, g: [0, -0.85] }, () => S.at([0, 12.4, 8.4], [0.32, 0, 0], () => {
    S.paint(fill(FUR), vol(blobs(blob([0, 5.6, 0], [2.6, 1.6, 7]), blob([-3, 4.6, 0], [1.2, 1.4, 7]), blob([3, 4.6, 0], [1.2, 1.4, 7])), TABBY), proj('front', ellipse(0, -2.6, 3.6, 2.6), WHITE),
      ...face({ at: [0, 0.6], gap: 6.2, r: 1.15, eye: 'line', mouth: 'w', mw: 2.2, my: 2.8 }), proj('front', ellipse(0, -1.4, 0.7, 0.5), 0xd98b8e), under(0.12), crown(0.06));
    head(S, [0, 0, 0], [7.2, 6.2, 6.2], { muzzle: 0.25, brow: 0.2, cheek: 0.24, chin: 0.25, pow: 2.4 });
    for (const s of [1, -1]) {
      S.paint(fill(FUR), proj('front', ellipse(0, 2.2, 1, 1.8), PINK));
      S.at([s * 4.4, 4.4, -0.6], [0, 0, -s * 0.45], () => blade(S, 4.6, 4.8, 1.3, { shape: 'ear', cup: 0.6 }));
    }
    S.paint(fill(0xf8f4ec));
    for (const s of [1, -1]) for (const dy of [0, 0.9]) S.tube([[s * 3.6, -1.6 + dy, 5.4], [s * 8.4, -1.2 + dy * 1.6, 5.6]], 0.14, { sides: 3, caps: false });
  }));
}

// ------------------------------------------------------------------ 2. Sock Ferret
export function sock(S) {
  const RIB = 0xf6f1e6, RED = 0xd9655a, NAVY = 0x46557e, FERRET = 0xe9dcc4, MASK = 0x7a5a4a;
  deck(S, 22, 20);
  hookStand(S, 56, 13);
  S.joint('hanger', { pivot: [0, 58, 0], axis: 'y', min: -1.4, max: 1.4, rest: 0, g: [0, 1.2], idle: 0.18 }, () => {
    // a round pinch hanger: a hook, four spokes, a ring, six pegs
    hangerHook(S, 60.4);
    S.paint(fill(0xf3f1ec, { rough: 0.45 }), under(0.12));
    S.tube([[0, 55.4, 0], [0, 50, 0]], 1, { sides: 8 });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; S.tube(spline([[0, 50.6, 0], [Math.cos(a) * 8, 48.6, Math.sin(a) * 8], [Math.cos(a) * 15, 47, Math.sin(a) * 15]], 2), 0.7, { sides: 6 }); }
    S.torus([0, 47, 0], 15.5, 0.9, { segs: 24, sides: 6 });
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 2 + k * Math.PI / 3, x = Math.cos(a) * 15.5, z = Math.sin(a) * 15.5;
      S.paint(fill(0xf3f1ec, { rough: 0.45 }));
      S.tube([[x, 46.2, z], [x, 44, z]], 0.4, { sides: 4 });
      peg(S, [x, 31.8, z], [0, -a + Math.PI / 2, 0], pegPaint(k), 0.95);
    }
    // the sock: the ferret, pegged by the toe of its tail, cuff round its neck
    const fz = 15.5, wear = vol(blobs(blob([0, 30, fz + 2.6], [4, 3, 1.4])), tone(RIB, 0.08));
    S.paint(fill(RIB), vol(band(23, 25.6), RED), vol(band(27.4, 28.8), NAVY), vol(band(18, 19.4), RED), wear, shade(vol(band(9.6, 13.4)), 0.07), under(0.1));
    sweep(S, [[0, 33.6, fz], [0, 27, fz + 0.4], [0, 20, fz + 1.4], [0.4, 14, fz + 2], [0, 10.4, fz + 2.2]], (v) => 3.8 + 0.6 * v, (v) => 2.6 + 0.4 * v, { sides: 12 });
    S.paint(fill(RIB), proj('front', repeatU(rbox(0, 0, 0.22, 9, 0), 1.1), tone(RIB, 0.16)), under(0.12));
    S.cyl([0, 8.2, fz + 2.2], [4.6, 4.5], 2.6, { segs: 14, sz: 0.72, bevel: 0.6 });
    // the ferret's head out of the cuff, looking at you upside down; front paws hanging out under it
    S.at([0, 4.4, fz + 3.4], [Math.PI - 0.25, 0, 0], () => {
      S.paint(fill(FERRET), vol(blobs(blob([-2.4, 0.8, 3.2], [2.2, 1.6, 2]), blob([2.4, 0.8, 3.2], [2.2, 1.6, 2])), MASK), proj('front', ellipse(0, -1.6, 2.4, 1.6), 0xfbf6ee),
        ...face({ at: [0, 1.1], gap: 4.6, r: 0.95, eye: 'bead', mouth: null, col: 0x2a2028 }), under(0.12), crown(0.05));
      head(S, [0, 0, 0], [4.6, 4.2, 4.8], { muzzle: 0.6, brow: 0.2, cheek: 0.14, chin: 0.25 });
      S.paint(fill(0xd9858a, { rough: 0.3 }));
      S.ball([0, -0.5, 4.9], [0.9, 0.7, 0.7], { segs: 6, rings: 4 });
      for (const s of [1, -1]) { S.paint(fill(FERRET), proj('front', circle(0, 1.6, 1.1), 0xe8b8b0)); S.at([s * 3.4, 3, -0.8], [0, 0, -s * 0.5], () => blade(S, 2.8, 3.6, 1, { shape: 'round', cup: 0.4 })); }
    });
    S.paint(fill(FERRET), under(0.14));
    for (const s of [1, -1]) {
      S.tube(spline([[s * 2.8, 8.4, fz + 3], [s * 4, 6, fz + 4.2], [s * 4.4, 4.2, fz + 4.4]], 2), 1.05, { sides: 6 });
      S.paint(fill(0xf8f2e8));
      S.ball([s * 4.4, 3.8, fz + 4.4], [1.2, 1, 1.3], { segs: 6, rings: 4 });
      S.paint(fill(FERRET), under(0.14));
    }
    // a small sock on the left peg, a mitten on the right
    const lx = Math.cos(Math.PI / 2 + Math.PI / 3) * 15.5, lz = Math.sin(Math.PI / 2 + Math.PI / 3) * 15.5;
    S.paint(fill(0x9fc4e6), vol(band(26, 27.4), 0xf6f1e6), under(0.12));
    sweep(S, [[lx, 33.4, lz], [lx, 27, lz], [lx - 0.4, 22.2, lz + 0.6], [lx - 1.6, 20.6, lz + 3]], 2.8, 1.6, { sides: 10 });
    const rx = Math.cos(Math.PI / 2 - Math.PI / 3) * 15.5, rz = Math.sin(Math.PI / 2 - Math.PI / 3) * 15.5;
    S.paint(fill(0xf2c97a), proj('front', repeatV(rbox(rx, 0, 3, 0.25, 0), 1.6, 20, 26), tone(0xf2c97a, 0.16)), under(0.12));
    sweep(S, [[rx, 33.4, rz], [rx, 28, rz], [rx, 24, rz]], (v) => 3.4 - 0.4 * v, 1.6, { sides: 10 });
    S.ball([rx + 3.2, 27, rz], [1.2, 2.2, 1.2], { segs: 6, rings: 4 });
  });
}

// ------------------------------------------------------------------ 3. Octopus Pinch-Hanger
export function octo(S) {
  const OCT = 0xee8e7c, SUCK = 0xf8d0c0;
  deck(S, 26, 20);
  hookStand(S, 58, 14);
  S.joint('octo', { pivot: [0, 60, 0], axis: 'y', min: -1.6, max: 1.6, rest: 0, g: [0, 1.4], idle: 0.2 }, () => {
    hangerHook(S, 62.4);
    // the mantle is the hub; eight arms reach out and down, four holding the washing
    S.paint(fill(OCT), vol(blobs(blob([-3.4, 52, 4.6], [1.2, 1.2, 2]), blob([3.8, 54.4, 4], [1, 1, 2]), blob([-1, 56, 3.6], [0.8, 0.8, 2])), tint(OCT, 0.3)), under(0.12), crown(0.1));
    S.lathe(spline([[0, 44.6], [5.6, 45.6], [7.6, 49], [7.4, 53.6], [5.4, 57.2], [0, 58.4]], 3), { segs: 16 });
    S.paint(fill(OCT), ...face({ at: [0, 46.6], gap: 6.4, r: 1.2, eye: 'tired', mouth: null, near: 3 }), under(0.16));
    S.lathe(spline([[0, 41.4], [5.6, 42], [6.6, 44], [5.6, 46.6], [0, 47.6]], 2), { segs: 16, sz: 0.94 });
    S.paint(fill(OCT), under(0.14));
    S.at([0, 42.6, 6.6], [Math.PI / 2, 0, 0], () => S.cyl([0, -1, 0], [1.3, 1], 2.6, { segs: 8 }));
    const loads = [
      [0, (x, y, z) => { S.paint(fill(0xf6f1e6), vol(band(y - 4, y - 2.6), 0x6aa0d8), under(0.12)); sweep(S, [[x, y, z], [x, y - 7, z], [x - 0.6, y - 11, z + 0.8], [x - 2.2, y - 12.4, z + 3]], 2.4, 1.5, { sides: 10 }); }],
      [2, (x, y, z) => { S.paint(fill(0xf2a7b0), proj('front', repeatU(circle(0, y - 5, 0.6), 2.4), 0xfbf6ee), under(0.12)); sweep(S, [[x, y, z], [x, y - 8, z]], (v) => 4.4 - 1.2 * v, 1.4, { sides: 10, pow: 4 }); }],
      [4, (x, y, z) => { S.paint(fill(0xb9d98a), vol(band(y - 9.4, y - 8.4), 0xfbf6ee), under(0.12)); sweep(S, [[x, y, z], [x, y - 10, z]], 3.6, 0.9, { sides: 10, pow: 5 }); }],
      [6, (x, y, z) => { S.paint(fill(0xf6d77a), under(0.12)); sweep(S, [[x, y, z], [x, y - 6, z]], 3.2, 1.6, { sides: 10 }); S.ball([x + 3, y - 3.4, z], [1.2, 2, 1.2], { segs: 6, rings: 4 }); }],
    ];
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 2 + (k + 0.5) * Math.PI / 4, c = Math.cos(a), s = Math.sin(a), held = k % 2 === 0;
      const tip = held ? [c * 19, 38, s * 19] : [c * 16.4, 40.6, s * 16.4];
      S.paint(fill(OCT), vol(blob([c * 11, 39.6, s * 11], [40, 1.1, 40]), SUCK), under(0.18));
      S.tube(spline([[c * 4.4, 43.6, s * 4.4], [c * 10, 41, s * 10], [c * 15.4, 41.2, s * 15.4], held ? [c * 18.6, 39.4, s * 18.6] : [c * 17.6, 43, s * 17.6], tip], 3), (t) => 1.9 - 1.3 * t, { sides: 8 });
      if (held) {
        peg(S, [tip[0], 26, tip[2]], [0, -a + Math.PI / 2, 0], pegPaint(k / 2), 0.92);
        const L = loads.find((l) => l[0] === k);
        L[1](tip[0], 25.6, tip[2]);
      } else { S.paint(fill(OCT)); S.tube(spline([tip, [c * 15.4, 42.6, s * 15.4], [c * 15, 41.6, s * 15]], 2), 0.55, { sides: 6 }); }
    }
  });
}

// ------------------------------------------------------------------ 4. Futon Tanuki
export function futon(S) {
  const RAIL = 0x7e8a96, TAN = 0xbf8f5e, DARK = 0x5a4234, CREAM = 0xf2e4c6, BEATER = 0xd9b47a;
  deck(S, 32, 14, 0xb9b4ac);
  // a balcony railing: two posts, rails, balusters
  S.paint(fill(RAIL, { rough: 0.5 }), under(0.16), crown(0.08));
  for (const x of [-29, 29]) S.box(x - 1.6, 4, -1.6, x + 1.6, 38, 1.6, { bevel: 0.5 });
  S.box(-30, 6.4, -1.1, 30, 8.2, 1.1, { bevel: 0.4 });
  for (let x = -24; x <= 24; x += 6) S.tube([[x, 8, 0], [x, 35.4, 0]], 0.6, { sides: 6 });
  rail(S, [-31, 36.6, 0], [31, 36.6, 0], 1.8, 2, [fill(tone(RAIL, 0.1), { rough: 0.5 })]);
  // the futon: the tanuki, aired over the rail belly down; quilted across the back, head and paws hanging at the front
  const quilt = (v) => proj(v, or(repeatU(rbox(0, 22, 0.25, 30, 0), 10.5), repeatV(rbox(0, 0, 40, 0.25, 0), 9, 14, 40)), tone(TAN, 0.16));
  S.paint(fill(TAN), quilt('front'), quilt('back'), vol(blobs(blob([0, 38, 0], [26, 3, 9])), tint(TAN, 0.08)), under(0.12), crown(0.05));
  sweep(S, [[0, 19.6, 5.2], [0, 28, 4.6], [0, 35, 3.8], [0, 38.4, 2.6], [0, 40.1, 0], [0, 38.4, -2.6], [0, 32, -3.8], [0, 22, -4.6], [0, 14, -5]], (v) => 20 - 1.6 * Math.abs(v - 0.5), (v) => 2 + 0.6 * Math.sin(v * Math.PI), { sides: 14, pow: 3 });
  S.paint(fill(TAN), under(0.12));
  S.at([0, 18, 6.6], [Math.PI / 2 + 0.5, 0, 0], () => S.cyl([0, -1.6, 0], [3.6, 4.4], 3.6, { segs: 12 }));
  S.at([0, 14.2, 9.6], [0.3, 0, 0], () => {
    S.paint(fill(TAN), vol(blobs(blob([-2.9, 0.9, 4], [2.6, 2, 3]), blob([2.9, 0.9, 4], [2.6, 2, 3])), DARK), proj('front', ellipse(0, -2, 3.4, 2.2), CREAM), proj('front', pair(ellipse(4.4, 3.4, 1.8, 1)), CREAM),
      ...face({ at: [0, 1.1], gap: 5.8, r: 1.05, eye: 'closed', mouth: null, col: 0xf6eedc }), under(0.12), crown(0.06));
    head(S, [0, 0, 0], [6.6, 5.4, 5.6], { muzzle: 0.5, brow: 0.3, cheek: 0.28, chin: 0.2 });
    S.paint(fill(DARK, { rough: 0.3 }));
    S.ball([0, -0.9, 5.6], [1.2, 0.9, 0.9], { segs: 6, rings: 4 });
    for (const s2 of [1, -1]) { S.paint(fill(DARK), proj('front', ellipse(0, 1.6, 0.9, 1.2), tint(DARK, 0.3))); S.at([s2 * 4.2, 3.6, -1.2], [0, 0, -s2 * 0.7], () => blade(S, 3.4, 4.2, 1.3, { shape: 'round', cup: 0.5 })); }
  });
  S.paint(fill(DARK), under(0.14));
  for (const s of [1, -1]) {
    S.tube(spline([[s * 11, 21, 6.2], [s * 12, 16, 7.4], [s * 12.4, 12.6, 8]], 2), 1.8, { sides: 8 });
    S.ball([s * 12.4, 11.8, 8.2], [2.2, 1.8, 2.4], { segs: 8, rings: 5 });
  }
  S.paint(fill(TAN), vol(blobs(blob([0, 9.4, -9], [3, 1.4, 3]), blob([0, 6.2, -10.2], [3, 1.4, 3])), DARK), under(0.12));
  S.tube(spline([[0, 14.4, -5.2], [0.6, 11, -8], [-0.4, 7.4, -9.8], [0, 4.8, -10.4]], 3), [2.4, 3.2, 3, 2], { sides: 10 });
  // the futon clips
  peg(S, [-12, 36.6, 0], [0, 0, 0], pegPaint(0), 1.5);
  peg(S, [12, 36.6, 0], [0, 0, 0], pegPaint(3), 1.5);
  // the beater, hanging by its loop from the post: swings in for a whack
  S.rest = 0;
  S.joint('beater', { pivot: [29, 36, 2.6], axis: 'z', min: -0.2, max: 1.1, rest: 0, g: [0, 1] }, () => {
    S.paint(fill(BEATER, { rough: 0.75 }), shade(vol(below(22)), 0.1), under(0.16));
    S.tube([[29, 34.4, 2.6], [29.4, 20, 2.8]], 1.1, { sides: 6 });
    S.paint(fill(0xd6503e, { rough: 0.7 }));
    S.tube([[29.4, 22, 2.8], [29.6, 17, 2.9]], 1.4, { sides: 8 });
    S.paint(fill(BEATER, { rough: 0.75 }), under(0.16));
    const trefoil = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2, r = 4.6 + 2.2 * Math.cos(a * 3); trefoil.push([29.6 + Math.sin(a) * r, 10.4 + Math.cos(a) * r, 2.9 + 0.3 * Math.sin(a * 6)]); }
    S.tube(trefoil, 0.55, { sides: 5, caps: false });
    S.paint(fill(0xd9dde2, { rough: 0.3 }));
    S.torus([29, 36, 2.6], 1.4, 0.3, { segs: 10, sides: 4 });
  });
}

// ------------------------------------------------------------------ 5. Hanger Penguin (ultra)
export function shirt(S) {
  const BLACK = 0x3a3f52, WHITE = 0xf8f6f0, TIE = 0xd2504a, TIE2 = 0x2f4a7e, BEAK = 0xf2a84a;
  deck(S, 22, 20);
  hookStand(S, 66, 13);
  S.joint('hanger', { pivot: [0, 68, 0], axis: 'y', min: -1, max: 1, rest: 0, idle: 0.14 }, () => {
    hangerHook(S, 70.4);
    // the wire hanger: shoulders out to the sides, a bar across the bottom
    S.paint(fill(0xc9ced4, { rough: 0.3 }));
    S.tube(spline([[0, 65.4, 0], [-8, 61, 0], [-17, 56.6, 0], [-19.6, 55, 0], [-17, 54.2, 0], [0, 54.2, 0], [17, 54.2, 0], [19.6, 55, 0], [17, 56.6, 0], [8, 61, 0], [0, 65.4, 0]], 3), 0.5, { sides: 6, caps: false });
    // the penguin, hung by the shoulders like a good shirt: collar, buttons, a tie
    const front = proj('front', ellipse(0, 40, 8.6, 14), WHITE, { near: 2 });
    const buttons = proj('front', or(...[48, 43, 38, 33].map((y) => circle(0, y, 0.55))), tone(WHITE, 0.25), { near: 6 });
    S.paint(fill(BLACK), front, buttons, under(0.14), crown(0.06));
    torso(S, [0, 40.4, 0], [11.2, 17.6, 8.2], { belly: 0.2, hips: 0.86, sit: 0.6 });
    S.paint(fill(TIE), proj('front', repeatV(rbox(0, 0, 4, 0.5, 0, -0.5), 2.4), TIE2), under(0.14));
    S.at([0, 51, 7.4], [0.14, 0, 0], () => { S.extrude([[-1.4, 0], [1.4, 0], [2.1, -10], [0, -12.6], [-2.1, -10]], -0.5, 0.5, { bevel: 0.3 }); S.box(-1.7, -0.2, -0.6, 1.7, 2, 0.7, { bevel: 0.5 }); });
    S.paint(fill(WHITE), under(0.1));
    for (const s of [1, -1]) S.at([s * 2.6, 53.6, 6.2], [0.5, 0, s * 1.1], () => S.extrude([[0, 0], [3.6, 0.6], [4.6, -1.8], [0.6, -2.6]], -0.4, 0.4, { bevel: 0.2 }));
    // the head above the collar
    S.paint(fill(BLACK), proj('front', pair(ellipse(2.8, 1.1, 2.4, 2.8)), WHITE), ...face({ at: [0, 1.3], gap: 5.6, r: 1, eye: 'line', mouth: null }), under(0.12), crown(0.06));
    S.at([0, 61.6, 0.4], null, () => {
      head(S, [0, 0, 0], [6.4, 6, 6.2], { muzzle: 0.1, brow: 0.25, cheek: 0.12, chin: 0.2 });
      S.paint(fill(BEAK), under(0.2));
      S.at([0, -0.6, 5.6], [Math.PI / 2 - 0.15, 0, 0], () => S.cone([0, 0, 0], 1.6, 3.2, { segs: 8, sz: 0.62 }));
    });
    // flippers along the hanger's arms like sleeves (they flap)
    S.rest = 0;
    for (const s of [1, -1]) S.joint(s > 0 ? 'flipR' : 'flipL', { pivot: [s * 8.6, 53.4, 0], axis: 'z', min: -0.3, max: 0.9, rest: 0, g: [0, s * 0.7] }, () => {
      S.paint(fill(BLACK), proj('front', ellipse(s * 13, 50, 1.2, 6), WHITE, { far: 2 }), under(0.14));
      S.at([s * 8.6, 53.4, 1.4], [0, 0, -s * 2.15], () => blade(S, 13, 5.2, 2, { shape: 'leaf', cup: -0.4 }));
    });
    // feet dangling under the hem
    S.paint(fill(BEAK), under(0.2));
    for (const s of [1, -1]) S.at([s * 4, 22.4, 2.6], [0.6, 0, 0], () => paw(S, [0, 0, 0], 3.4, 4.6, 1.8, { toes: 3 }));
  });
}

// ------------------------------------------------------------------ 6. The Peg Crocodile (secret)
export function wani(S) {
  const GREEN = 0x7fbf8a, BELLY = 0xe8edc6, TOOTH = 0xfbf8ee, SOCK = 0xf2a7b0;
  deck(S, 30, 13);
  // the body and tail behind the spring: a peg's handles that turned into a crocodile
  // (a sweep runs in yz: the crocodile lies along x, so it is built turned)
  S.at([0, 0, 0], [0, Math.PI / 2, 0], () => {
    S.paint(fill(GREEN), proj('top', repeatV(rbox(0, 0, 1.4, 0.9, 0.4), 4.2, -14, 26), tone(GREEN, 0.18)), vol(below(7.2), BELLY), under(0.14), crown(0.08));
    sweep(S, [[0, 9.6, 6], [0, 9.8, -2], [0, 9.2, -12], [0, 7.6, -22], [0, 6, -29]], (v) => 6.4 - 5.6 * v ** 1.2, (v) => 4.8 - 3.6 * v, { sides: 12, caps: 'end' });
    for (const [z, s] of [[2, 1], [2, -1], [-8.6, 1], [-8.6, -1]]) {
      S.paint(fill(GREEN), under(0.16));
      S.tube(spline([[s * 4.6, 8, z], [s * 7.4, 6, z + 0.6], [s * 8.4, 4.4, z + 1.4]], 2), 1.4, { sides: 6 });
      paw(S, [s * 8.4, 4, z + 1.8], 3.6, 3.8, 1.8, { toes: 3 });
    }
  });
  // the spring, at the hinge of the jaw
  S.paint(fill(0xc9ced4, { rough: 0.3 }));
  S.at([6.6, 11.4, 0], [0, Math.PI / 2, 0], () => coil(S, [0, 0, 0], -4.6, 4.6, 2.6, 0.45, 5));
  // the lower jaw: a peg's prong, flat-topped, with a sock in it
  S.paint(fill(GREEN), proj('top', repeatU(rbox(0, 0, 0.6, 0.6, 0.3), 3.2, 10, 26, 0), tone(GREEN, 0.14)), vol(below(6.2), BELLY), under(0.14));
  S.extrude([[6, 4.6], [27, 4.6], [30, 6.2], [29.4, 8.2], [8, 10.4], [5, 8.6]], -4.6, 4.6, { bevel: 1.2 });
  S.paint(fill(TOOTH));
  for (let x = 12; x <= 27; x += 3) for (const s of [1, -1]) S.cone([x, 8.6 - (x - 12) * 0.03, s * 3.6], 0.6, 1.4, { segs: 5 });
  S.paint(fill(SOCK), vol(band(12, 13.2), 0xf6f1e6), under(0.12));
  S.at([22, 9.6, 0], [0, 0, 0], () => sweep(S, [[0, 2, 3], [0, 4.6, 0.4], [0, 2.6, -3], [0, -1.4, -5], [-1, -4.2, -7.4]], 3, 1.4, { sides: 10 }));
  // the upper jaw opens on the spring
  S.rest = 0;
  S.joint('jaw', { pivot: [6.6, 11.4, 0], axis: 'z', min: 0, max: 0.75, rest: 0, g: [0, 0.6] }, () => {
    S.paint(fill(GREEN), vol(blobs(blob([21, 17.4, 2.4], [1.6, 1.4, 1.6]), blob([21, 17.4, -2.4], [1.6, 1.4, 1.6])), tone(GREEN, 0.1)), under(0.14), crown(0.08));
    S.extrude([[5, 12.8], [8.6, 11], [29.6, 11.4], [31, 12.6], [30, 14.4], [22, 16], [11, 17], [6.6, 16]], -4.8, 4.8, { bevel: 1.4 });
    S.paint(fill(TOOTH));
    for (let x = 13; x <= 28; x += 3) for (const s of [1, -1]) S.at([x, 11.4, s * 3.8], [Math.PI, 0, 0], () => S.cone([0, 0, 0], 0.6, 1.4, { segs: 5 }));
    for (const s of [1, -1]) S.at([20.4, 17.2, s * 2.7], null, () => {
      S.paint(fill(0xf4f0dc), proj('right', rbox(0, 0.1, 0.32, 0.9, 0.3), EYE), under(0.1));
      S.ball([0.5, 0, 0], [1.5, 1.5, 1.5], { segs: 8, rings: 5 });
      S.paint(fill(GREEN), under(0.1), crown(0.1));
      S.ball([0.3, 0.1, 0], [1.9, 1.6, 1.85], { segs: 8, rings: 5, v0: 0.52 });
    });
    S.paint(fill(tone(GREEN, 0.2)));
    for (const s of [1, -1]) S.ball([30.4, 14.2, s * 1.2], [0.45, 0.3, 0.45], { segs: 5, rings: 3 });
  });
}

void tint; void kana; void label; void arc; void all; void ellipse; void EYE; void torso;
