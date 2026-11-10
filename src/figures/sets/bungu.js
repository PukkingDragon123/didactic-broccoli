// Stationery Zoo (ぶんぐどうぶつ): the things in a school desk, and the animals they turned out to be. Sculpt programs
// in millimetres (src/figures/sculpt.js); the series data is src/data/series/bungu.js.
import { spline, ring } from '../sculpt.js';
import { head, loaf, paw, blade, torso } from '../anatomy.js';
import { sweep } from '../forms.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, or, and, stroke, pair, all, repeatU, repeatV, label, kana, band, below, above, blob, blobs,
} from '../paint.js';

const MAKER = 'HOSHIMARU';
const SHAV = 0xe6c494, LEAD = 0x4a4650;

/** A rounded-rectangle sleeve along z (a paper band round an eraser): outside hw x hh, wall th, from z0 to z1. */
function sleeve(S, c, hw, hh, z0, z1, th) {
  const R = (w, h, z) => ring([c[0], c[1], z], w, h, 16, { pow: 7, axis: 'z' });
  const o0 = R(hw, hh, z0), o1 = R(hw, hh, z1), i0 = R(hw - th, hh - th, z0), i1 = R(hw - th, hh - th, z1);
  S.loft([o0, o1], { caps: 'none' });
  S.loft([i0, i1], { caps: 'none' });
  const polys = [];
  for (let k = 0; k < o0.length; k++) { const n = (k + 1) % o0.length; polys.push({ pts: [o0[k], o0[n], i0[n], i0[k]], hint: [0, 0, -1] }, { pts: [o1[k], o1[n], i1[n], i1[k]], hint: [0, 0, 1] }); }
  S.emit(polys);
}
/** A pencil along a path a -> b (round, hexagonal paint stripes), sharpened at b. */
function pencil(S, a, b, c, r = 1.3, sharp = 0.22) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], at = (t) => [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t];
  S.paint(fill(c), under(0.16));
  S.tube([a, at(1 - sharp)], r, { sides: 6, caps: true });
  S.paint(fill(0xe8cc96), under(0.12));
  S.tube([at(1 - sharp), at(1 - sharp * 0.25)], [r, r * 0.3], { sides: 6, caps: false });
  S.paint(fill(LEAD, { rough: 0.4 }));
  S.tube([at(1 - sharp * 0.25), b], [r * 0.3, 0], { sides: 6 });
}

// ------------------------------------------------------------------ 1. Eraser Seal
export function eraser(S) {
  const RUB = 0xf6f4ee, BLUE = 0x3f6fb8, SKY = 0x9cc8ec, WORN = 0xd8d2c8;
  // the seal, an eraser: lying on its belly, one end worn round where it has been used
  S.paint(fill(RUB, { rough: 0.85 }), vol(blob([0, 3, -22], [10, 8, 5]), WORN), shade(vol(blob([0, 9, -16], [12, 6, 4])), 0.04), under(0.1), crown(0.05), ...stamp(MAKER, { c: 0xb0aaa4, px: 0.4 }));
  loaf(S, [0, 9.4, -2], [10.6, 9.4, 21], { flat: 0.82, pow: 2.6 });
  // the tail flippers, rubbed down
  for (const s of [1, -1]) S.at([s * 3, 3.4, -21.6], [-1.3, s * 0.5, 0], () => blade(S, 7, 6.4, 1.8, { shape: 'round', cup: -0.6 }));
  S.joint('head', { pivot: [0, 12, 14], axis: 'x', min: -0.4, max: 0.25, rest: 0, idle: 0.08 }, () => S.at([0, 12.6, 18], null, () => {
    S.paint(fill(RUB, { rough: 0.85 }), ...face({ at: [0, 1.4], gap: 6.6, r: 1.2, eye: 'bead', mouth: null }), proj('front', or(seg(0, -1, 0, -2.2, 0.4), arc(-1, -2, 1, Math.PI, Math.PI * 1.9, 0.4), arc(1, -2, 1, Math.PI * 1.1, Math.PI * 2, 0.4)), tone(RUB, 0.45)),
      proj('front', pair(or(circle(2.6, -1.2, 0.3), circle(3.4, -0.6, 0.3), circle(3.2, -2, 0.3))), tone(RUB, 0.3)), under(0.1), crown(0.06));
    head(S, [0, 0, 0], [7.6, 6.8, 7], { muzzle: 0.55, brow: 0.2, cheek: 0.26, chin: 0.2 });
    S.paint(fill(0x6a5a5c, { rough: 0.3 }));
    S.ball([0, -0.4, 7.4], [1.3, 0.9, 0.8], { segs: 6, rings: 4 });
  }));
  S.paint(fill(RUB, { rough: 0.85 }), under(0.12));
  for (const s of [1, -1]) S.at([s * 9.6, 4, 8], [0.3, 0, -s * 1.95], () => blade(S, 8, 5.4, 1.8, { shape: 'leaf', cup: 0.5 }));
  // eraser crumbs
  S.paint(fill(0xe0dad2));
  for (const [x, z, r] of [[14, 14, 0.8], [16, 9, 1], [-14.6, -6, 0.9], [13, -12, 0.7]]) S.tube([[x - 1.6, r, z], [x + 1.6, r, z + 0.6]], r, { sides: 5 });
  // the paper sleeve: it slides off towards the tail
  S.rest = 0;
  S.joint('sleeve', { slide: [0, 0, -15], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    const pr = [proj('right', or(rbox(0, 9.4, 12, 3, 0)), BLUE), proj('left', rbox(0, 9.4, 12, 3, 0), BLUE), proj('right', label('NO.1', 0, 9.4, 0.42), 0xffffff, { hard: true }), proj('left', label('PLASTIC', 0, 9.4, 0.36), 0xffffff, { hard: true }),
      proj('top', or(rbox(0, 6.2, 12, 1.1, 0), rbox(0, -6.2, 12, 1.1, 0)), BLUE), proj('top', rbox(0, 0, 12, 4.4, 0.6), SKY), proj('top', kana('ふわけし', 0, 0.4, 4.4), BLUE), proj('front', label('MOMOI', 0, 10, 0.4), BLUE, { hard: true })];
    S.paint(fill(0xfbfaf4, { rough: 0.8 }), ...pr, under(0.1));
    sleeve(S, [0, 9.2, 0], 12.4, 9.6, -3, 8, 0.7);
  });
}

// ------------------------------------------------------------------ 2. Tape Snail
export function tape(S) {
  const BODY = 0x6cc0b0, DARK = 0x3f8a80, TAPE = 0xf2d79a, CORE = 0xf3ead8, SKIN = 0xeed8b4;
  // the dispenser: a weighted foot, the snail's own
  S.paint(fill(BODY, { rough: 0.4 }), proj('top', stroke(rbox(0, 0, 9, 22, 6), 0.5), tone(BODY, 0.2)), vol(below(2.2), DARK), under(0.16), crown(0.08), ...stamp(MAKER, { c: DARK }));
  S.loft(spline([[-24, 1.2, 0.3], [-20, 5, 0.9], [-6, 8.6, 1], [10, 9, 1], [18, 7.4, 0.9], [22, 4.2, 0.7], [23, 1.6, 0.3]], 2).map(([z, h, w]) => ring([0, h / 2, z], 9 * w, h / 2 + 0.01, 14, { pow: 3.4 })), { caps: 'both' });
  // the hub cheeks and the axle
  S.paint(fill(BODY, { rough: 0.4 }), under(0.16), crown(0.08));
  for (const s of [1, -1]) S.at([s * 7.4, 17.4, -5], [0, 0, s * Math.PI / 2], () => S.cyl([0, -1.2, 0], [4.6, 4], 2.4, { segs: 14, bevel: 0.6 }));
  S.box(-8.6, 6, -9, 8.6, 13, -1, { bevel: 2.4 });
  // the shell: the roll of tape, which turns
  S.rest = 0;
  S.joint('roll', { pivot: [0, 17.4, -5], axis: 'x', min: -6.3, max: 6.3, rest: 0, g: [0, -2.4] }, () => {
    S.at([0, 17.4, -5], [0, 0, Math.PI / 2], () => {
      S.clear(true);
      S.paint(fill(TAPE, { rough: 0.25 }));
      S.lathe([[6.2, -5.8], [12.4, -5.8], [12.6, -5.6], [12.6, 5.6], [12.4, 5.8], [6.2, 5.8]], { segs: 28, cap: false });
      S.clear(false);
      S.paint(fill(CORE, { rough: 0.8 }), proj('top', kana('セロ', 0, 1, 3), 0xd9604a), proj('bottom', kana('セロ', 0, 1, 3), 0xd9604a));
      S.lathe([[5, -6], [6.2, -6], [6.2, 6], [5, 6], [5, -6]], { segs: 20, cap: false });
      S.paint(fill(tone(TAPE, 0.2), { rough: 0.3 }), shade(wrap(12.6, repeatV(rbox(0, 0, 80, 0.12, 0), 0.9)), 0.08));
      S.lathe([[11.6, -5.9], [12.5, -5.9]], { segs: 28, cap: false });
      S.lathe([[12.5, 5.9], [11.6, 5.9]], { segs: 28, cap: false });
    });
  });
  // the tape running off the roll to the cutter
  S.clear(true);
  S.paint(fill(TAPE, { rough: 0.25 }));
  S.box(-5.6, 12.6, 6.8, 5.6, 13, 17.6);
  S.clear(false);
  // the cutter: a tin blade with teeth under the snail's chin
  S.paint(fill(0xc9ced4, { rough: 0.3 }), proj('front', repeatU(poly([[-0.5, 0], [0.5, 0], [0, -1]]), 1, -6, 6), tone(0xc9ced4, 0.3)));
  S.box(-6.2, 9.6, 17, 6.2, 13.2, 18.6, { bevel: 0.3 });
  // the snail's head and stalks, reaching over it
  S.paint(fill(SKIN), proj('front', or(seg(-1.4, 21.6, -0.2, 21, 0.45), seg(1.4, 21.6, 0.2, 21, 0.45)), tone(SKIN, 0.4)), shade(vol(below(17)), 0.08), under(0.12), crown(0.08));
  S.loft(spline([[12, 3.6, 3.4], [16, 4.4, 4.2], [20, 4.6, 4.6], [23.6, 4, 4], [25.2, 2.6, 2.6], [25.8, 0.4, 0.4]], 2).map(([y, rx, rz], i) => ring([0, y, 18.6 + i * 0.6], rx, rz, 12)), { caps: 'both' });
  S.joint('stalks', { pivot: [0, 24, 21.6], axis: 'x', min: -0.4, max: 0.4, rest: 0, idle: 0.12 }, () => {
    for (const s of [1, -1]) {
      S.paint(fill(SKIN), under(0.1));
      S.tube(spline([[s * 1.6, 24, 21.6], [s * 3.2, 28.6, 22.4], [s * 4.6, 32, 22]], 2), [1, 0.7], { sides: 6 });
      S.paint(fill(SKIN), ...face({ at: [s * 4.6, 32], gap: 0.01, r: 0.8, eye: 'line', mouth: null, near: 22.6 }));
      S.ball([s * 4.6, 32.2, 22], 1.3, { segs: 8, rings: 5 });
    }
  });
}

// ------------------------------------------------------------------ 3. Stapler Shark
export function stapler(S) {
  const BLUE = 0x6f8fb8, BELLY = 0xf2efe6, STEEL = 0xc9ced4, GUM = 0xd9858a;
  // the base: the lower jaw and the belly, on a rubber foot
  S.paint(fill(0x4a4650, { rough: 0.9 }));
  S.box(-30, 0, -6.6, 22, 1.2, 6.6, { bevel: 0.5 });
  S.paint(fill(BELLY), vol(above(5.4), BLUE), under(0.16), crown(0.08), ...stamp(MAKER, { c: 0x8a8690 }));
  S.loft(spline([[-30, 4, 4.2], [-24, 5.6, 6], [-6, 6, 6.6], [10, 5.6, 6.2], [20, 4.4, 5], [27, 2.6, 3]], 2).map(([x, h, w]) => ring([x, 1.2 + h / 2, 0], h / 2, w, 12, { pow: 3, axis: 'x' })), { caps: 'both' });
  S.paint(fill(STEEL, { rough: 0.3 }), proj('top', repeatU(rbox(0, 0, 0.12, 2, 0), 1.2, 6, 22), tone(STEEL, 0.25)));
  S.box(4, 6.6, -1.8, 24, 7.4, 1.8, { bevel: 0.3 });
  S.paint(fill(GUM), under(0.2));
  S.box(-2, 6.4, -4, 4, 7.2, 4, { bevel: 0.6 });
  // the tail fin at the back
  S.paint(fill(BLUE), under(0.16));
  S.at([-31, 6.4, 0], [0, 0, 0.35], () => S.extrude([[0, 0], [-8, 9.6], [-6.4, 2.4], [-9.6, -2.6], [-1.6, -1.2]], -1.2, 1.2, { bevel: 0.6 }));
  // the upper arm: the shark's head and back, with the dorsal fin; it opens
  S.rest = 0;
  S.joint('jaw', { pivot: [-26, 9, 0], axis: 'z', min: 0, max: 0.7, rest: 0, g: [0, 0.55] }, () => {
    S.paint(fill(BLUE), proj('front', or(...[0, 1, 2].map((k) => seg(15.6 + k * 1.6, 11.6, 15 + k * 1.6, 14.8, 0.4))), tone(BLUE, 0.3)), vol(below(10.4), BELLY), under(0.14), crown(0.1),
      proj('front', label('HC-10', -8, 14.6, 0.36), tint(BLUE, 0.5), { hard: true }));
    S.loft(spline([[-28, 4, 4.4], [-22, 6.2, 6], [-6, 7, 6.6], [12, 6.8, 6.4], [22, 5.6, 5.6], [28, 3.4, 4], [30.4, 1, 1.6]], 2).map(([x, h, w]) => ring([x, 8.6 + h / 2, 0], h / 2, w, 14, { pow: 2.6, axis: 'x' })), { caps: 'both' });
    S.paint(fill(BLUE), under(0.14));
    S.at([0, 15.4, 0], [0, 0, 0], () => S.extrude([[-6, 0], [4, 0], [-1.4, 9], [-4, 8.4]], -1.3, 1.3, { bevel: 0.6 }));
    for (const s of [1, -1]) S.at([12, 10, s * 5.6], [s * 1.2, 0, -0.9], () => blade(S, 7, 3.8, 1.2, { shape: 'leaf' }));
    // teeth: a row of staples under the snout
    S.paint(fill(STEEL, { rough: 0.3 }));
    for (let x = 14; x <= 27; x += 2.2) S.box(x - 0.3, 8, -3.4 + (x - 14) * 0.08, x + 0.3, 9, 3.4 - (x - 14) * 0.08);
    // the eyes, dead level
    for (const s of [1, -1]) {
      S.paint(fill(EYE, { rough: 0.15 }), proj(s > 0 ? 'front' : 'back', circle(s * 20.6, 13.8, 0.3), 0xffffff));
      S.at([20.6, 13.6, s * 4.6], [0, 0, 0], () => S.ball([0, 0, 0], [1, 1, 0.6], { segs: 8, rings: 5 }));
    }
  });
}

// ------------------------------------------------------------------ 4. Sharpener Hedgehog
export function sharpener(S) {
  const BODY = 0xb88a62, DARK = 0x6a4a34, FACE = 0xf2dcc0, STEEL = 0xc9ced4, TRAY = 0xd9c8a0;
  // the body: a desk sharpener, rounded, on a clamp foot
  S.paint(fill(BODY), vol(below(6.4), tone(BODY, 0.14)), under(0.16), crown(0.06), ...stamp(MAKER, { c: DARK }));
  S.loft(spline([[0, 13.6, 0.6], [2, 14, 0.9], [8, 14.6, 1], [16, 13.6, 0.96], [22, 11, 0.86], [25.6, 6, 0.6], [26.6, 0.4, 0.1]], 2).map(([y, r, k]) => ring([0, y, -2], r * 1.05, r * k * 1.12, 16, { pow: 2.3 })), { caps: 'both' });
  // the shavings drawer at the front, pulled out a little
  S.joint('tray', { slide: [0, 0, 8], min: 0, max: 1, rest: 0, idle: 0 }, () => {
    S.paint(fill(TRAY, { rough: 0.5 }), proj('front', rbox(0, 4.6, 4, 1, 0.8), tone(TRAY, 0.3)), under(0.14));
    S.box(-9, 1, 6, 9, 8.4, 14.4, { bevel: 1 });
    S.paint(fill(SHAV), proj('top', or(...[[-4, -10], [2, -12], [5, -9]].map(([x, y]) => stroke(circle(x, y, 1.6), 0.5))), 0xd9604a));
    S.box(-7.6, 8.4, 7.4, 7.6, 9, 13);
  });
  // the face at the front: the pencil hole is its nose
  S.at([0, 15.6, 10.4], null, () => {
    S.paint(fill(FACE), ...face({ at: [0, 2.2], gap: 7.6, r: 1.25, eye: 'dot', mouth: null }), proj('front', ellipse(0, -0.2, 2.6, 2.6), STEEL), proj('front', circle(0, -0.2, 1.4), 0x2e2830), proj('front', pair(ellipse(5, -0.6, 1.6, 0.9)), 0xf2b0a8, { alpha: 0.7 }), under(0.12));
    head(S, [0, 0, 0], [9, 8, 6.4], { muzzle: 0.7, brow: 0.2, cheek: 0.2, chin: 0.3 });
    for (const s of [1, -1]) { S.paint(fill(FACE), proj('front', ellipse(0, 1.6, 0.9, 1.3), 0xe8b0a0)); S.at([s * 6.6, 5.8, -2.4], [0, 0, -s * 0.5], () => blade(S, 3, 3.4, 1, { shape: 'round', cup: 0.4 })); }
  });
  // spines: pencils stuck in, every colour in the tin
  const cols = [0xd9483a, 0xf2c23a, 0x4f9a5a, 0x3f6fb8, 0x8a5aa8, 0xf28a3a, 0x3a3438, 0xe86a9a];
  let k = 0;
  for (let row = 0; row < 3; row++) for (let i = 0; i < 5 - (row === 2 ? 2 : 0); i++) {
    const az = -0.9 + (i / (4 - (row === 2 ? 2 : 0))) * 1.8, el = 0.55 + row * 0.33, base = [Math.sin(az) * 10 * Math.cos(el * 0.8), 14 + Math.sin(el) * 9.6, -4 - row * 2.6 + Math.cos(az) * 1.4];
    const dir = [Math.sin(az) * 0.8, 0.5 + row * 0.25, -0.55 - row * 0.1], L = 13 + (k % 3) * 2, tip = [base[0] + dir[0] * L, base[1] + dir[1] * L, base[2] + dir[2] * L];
    pencil(S, base, tip, cols[k++ % cols.length], 1.15, 0.2);
  }
  // the crank: it turns
  S.rest = 0;
  S.joint('crank', { pivot: [14.6, 15, -2], axis: 'x', min: -6.3, max: 6.3, rest: 0, g: [0, 6.28] }, () => {
    S.paint(fill(STEEL, { rough: 0.3 }));
    S.at([13.6, 15, -2], [0, 0, -Math.PI / 2], () => S.cyl([0, 0, 0], 2.2, 2, { segs: 12 }));
    S.tube([[15.4, 15, -2], [16, 15, -2], [16, 23, -2], [17.4, 23, -2]], 0.7, { sides: 6 });
    S.paint(fill(0xd9483a, { rough: 0.4 }), under(0.16));
    S.at([17.2, 23, -2], [0, 0, -Math.PI / 2], () => S.cyl([0, 0, 0], [1.5, 1.3], 4.4, { segs: 10 }));
  });
  S.paint(fill(BODY), under(0.16));
  for (const s of [1, -1]) paw(S, [s * 8, 0, 8], 4, 4, 2.2, { toes: 3 });
}

// ------------------------------------------------------------------ 5. Compass Flamingo (ultra)
export function compass(S) {
  const PINK = 0xf2a0a8, DEEP = 0xd9707e, STEEL = 0xd0d5da, PAPER = 0xf8f6ee, BEAK = 0x3a3438;
  // a sheet of graph paper with the circle it has been drawing
  const grid = or(repeatU(rbox(0, 0, 0.12, 40, 0), 3), repeatV(rbox(0, 0, 40, 0.12, 0), 3));
  S.paint(fill(PAPER, { rough: 0.9 }), proj('top', grid, 0xcfdce8), proj('top', arc(0, 0, 16, -0.6, 4.2, 0.5), 0x6a6670), proj('top', label('R=16', 15, 13.6, 0.36), 0x6a6670), ...stamp(MAKER, { c: 0x9a9690 }));
  S.box(-26, 0, -22, 26, 0.6, 22);
  // the legs: one with the needle, one holding the lead; they open
  S.rest = 0;
  for (const s of [1, -1]) S.joint(s > 0 ? 'legR' : 'legL', { pivot: [0, 50, 0], axis: 'z', min: -0.5, max: 0.5, rest: 0, g: [0, s * 0.16] }, () => {
    const foot = [s * 16, 0.6, 0];
    S.paint(fill(PINK), under(0.16));
    S.tube(spline([[s * 2.4, 49, 0], [s * 6.6, 34, 0], [s * 9.4, 26, 0.4]], 2), 1.1, { sides: 8 });
    S.paint(fill(DEEP), under(0.12));
    S.ball([s * 9.6, 25.4, 0.4], [1.6, 1.8, 1.6], { segs: 8, rings: 5 });
    S.paint(fill(STEEL, { rough: 0.25 }));
    S.tube([[s * 9.8, 25, 0.4], [s * 13.6, 9, 0.2]], 1, { sides: 8 });
    if (s > 0) { S.tube([[13.6, 9, 0.2], [16, 0.6, 0]], [0.6, 0], { sides: 6 }); void foot; }
    else {
      S.paint(fill(0x8a8e96, { rough: 0.3 }));
      S.at([-13.8, 9.6, 0.2], [0, 0, 0.23], () => S.cyl([0, -2, 0], 1.6, 4.4, { segs: 10 }));
      S.paint(fill(LEAD, { rough: 0.4 }));
      S.tube([[-14.2, 8, 0.2], [-16, 0.6, 0]], [0.5, 0.2], { sides: 6 });
    }
  });
  // the hinge and the knurled grip on top
  S.paint(fill(STEEL, { rough: 0.25 }), wrap(1.6, repeatU(rbox(0, 0, 0.2, 40, 0), 0.8), tone(STEEL, 0.3)));
  S.cyl([0, 62, -1], 1.6, 7, { segs: 12 });
  S.paint(fill(STEEL, { rough: 0.25 }));
  S.at([0, 50, 0], [Math.PI / 2, 0, 0], () => S.cyl([0, -2.8, 0], 3.2, 5.6, { segs: 14 }));
  // the flamingo: its body is the compass head, its neck curls up to look at what it drew
  S.paint(fill(PINK), proj('left', or(arc(0, 52, 5, 0.2, 2.2, 0.5), arc(-2, 50, 5, 0.3, 2, 0.5)), DEEP), proj('right', or(arc(0, 52, 5, 0.9, 2.9, 0.5), arc(2, 50, 5, 1.1, 2.8, 0.5)), DEEP), under(0.14), crown(0.08));
  S.at([0, 54, -1.4], [0.2, 0, 0], () => S.ball([0, 0, 0], [6.6, 5.4, 8.4], { segs: 14, rings: 8 }));
  S.paint(fill(DEEP), under(0.14));
  for (const s of [1, -1]) S.at([s * 5.4, 55, -2], [0.1, s * 0.15, s * 1.2], () => S.at([0, 0, 0], [0, Math.PI / 2, 0], () => blade(S, 8.6, 5.6, 1.6, { shape: 'wing', cup: 0.6 })));
  S.paint(fill(PINK), under(0.12));
  S.tube(spline([[0, 57, -6.4], [0, 61, -9.6], [0, 66, -4], [0, 66.4, 2.6], [0, 70, 4.6]], 4), [2, 1.5, 1.4, 1.5, 1.9], { sides: 8 });
  S.at([0, 72, 4.6], [0.6, 0, 0], () => {
    S.paint(fill(PINK), ...face({ at: [0, 0.6], gap: 3.6, r: 0.8, eye: 'line', mouth: null }), under(0.1), crown(0.08));
    head(S, [0, 0, 0], [2.8, 2.8, 3], { muzzle: 0.2, brow: 0.2, cheek: 0.1 });
    S.paint(fill(0xf8f2e6), vol(above(-0.6), 0xf8f2e6), vol(blob([0, -1.6, 7.2], [2, 2, 2.4]), BEAK));
    S.tube(spline([[0, -0.4, 2.2], [0, -0.6, 5], [0, -2.2, 7.6], [0, -3.4, 8.2]], 2), [1.3, 1, 0.7, 0.3], { sides: 6 });
  });
}

// ------------------------------------------------------------------ 6. Abacus Caterpillar (secret)
export function abacus(S) {
  const WOOD = 0x8a5a3a, DARKW = 0x5a3a2a, BEAD = 0x3a3034, CAT = 0x8fc06a, SPOT = 0xf2d24a;
  // a soroban stood on its long edge, on two little feet
  S.paint(fill(WOOD, { rough: 0.5 }), proj('front', repeatV(rbox(0, 0, 40, 0.15, 0), 1.6), tone(WOOD, 0.1)), under(0.18), crown(0.08), ...stamp(MAKER, { c: DARKW }));
  for (const s of [1, -1]) S.box(s * 30 - 2.4, 0, -5, s * 30 + 2.4, 2, 5, { bevel: 0.6 });
  S.box(-34, 2, -1.8, 34, 4.4, 1.8, { bevel: 0.6 });
  S.box(-34, 33.6, -1.8, 34, 36, 1.8, { bevel: 0.6 });
  for (const s of [1, -1]) S.box(s * 32.8 - 1.2, 4.4, -1.8, s * 32.8 + 1.2, 33.6, 1.8, { bevel: 0.4 });
  S.box(-32, 24.4, -1.4, 32, 26, 1.4, { bevel: 0.4 });
  S.paint(fill(0xf2e6c6), proj('front', or(...[-18, 0, 18].map((x) => circle(x, 25.2, 0.45))), DARKW));
  S.box(-32, 25, 1.3, 32, 25.4, 1.5);
  // the rods and the beads (a plain row, a caterpillar row, a plain row)
  const rods = [-24, -14, -4, 6, 16, 26];
  S.paint(fill(0xb0a090, { rough: 0.4 }));
  for (const x of rods) S.tube([[x, 4.4, 0], [x, 33.6, 0]], 0.45, { sides: 5, caps: false });
  const bead = (x, y, c) => { S.paint(fill(c, { rough: 0.35 }), crown(0.12), under(0.2)); S.lathe([[0.5, -1.6], [2.4, -0.6], [2.6, 0], [2.4, 0.6], [0.5, 1.6]], { segs: 12, at: [x, y, 0] }); };
  for (const x of rods) { if (x === 6) continue; bead(x, 28.6, BEAD); for (let k = 0; k < 4; k++) bead(x, 6.4 + k * 3.3 + (x % 20 === 4 ? 4 : 0), BEAD); }
  // the caterpillar: five beads of a rod, which slides up and looks round
  S.rest = 0;
  S.joint('cater', { slide: [0, 1.4, 0], min: 0, max: 1, rest: 0, idle: 0.6 }, () => {
    for (let k = 0; k < 4; k++) {
      S.paint(fill(CAT, { rough: 0.45 }), proj('front', circle(6, 7 + k * 3.3, 0.7), SPOT), proj('back', circle(-6, 7 + k * 3.3, 0.7), SPOT), crown(0.12), under(0.2));
      S.lathe([[0.5, -1.6], [2.6, -0.6], [2.8, 0], [2.6, 0.6], [0.5, 1.6]], { segs: 12, at: [6, 6.4 + k * 3.3, 0] });
      S.paint(fill(tone(CAT, 0.3)));
      for (const s of [1, -1]) S.tube([[6 + s * 2.4, 6.2 + k * 3.3, 0.6], [6 + s * 3.2, 5.6 + k * 3.3, 0.9]], 0.35, { sides: 4 });
    }
    S.joint('look', { pivot: [6, 19.8, 0], axis: 'y', min: -0.9, max: 0.9, rest: 0, g: [0, 0.8], idle: 0.3 }, () => {
      S.paint(fill(CAT, { rough: 0.45 }), ...face({ at: [6, 20], gap: 3, r: 0.75, eye: 'dot', mouth: 'smile', mw: 1.4, my: 1.6 }), crown(0.1), under(0.14));
      S.ball([6, 19.8, 0.4], [3, 2.8, 2.8], { segs: 12, rings: 7 });
      S.paint(fill(tone(CAT, 0.35)));
      for (const s of [1, -1]) { S.tube(spline([[6 + s * 1.2, 22, 1.2], [6 + s * 2, 23.4, 2.6], [6 + s * 2.8, 23.8, 3.6]], 2), 0.3, { sides: 4 }); S.ball([6 + s * 2.9, 23.9, 3.7], 0.6, { segs: 6, rings: 4 }); }
    });
  });
}

void sweep; void torso; void tint; void and; void all; void band; void blobs; void ellipse;
