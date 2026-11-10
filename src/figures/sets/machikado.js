// Street-Corner Mimics (まちかど擬態図鑑): animals that pass themselves off as the furniture of a back lane.
// Sculpt programs, in millimetres (src/figures/sculpt.js); the series data is src/data/series/machikado.js.
import { spline, ring, hinge, slide, chain } from '../sculpt.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, ink, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, cut, stroke, pair, halfBelow, halfAbove, repeatU, label, kana,
  below, band, blob, blobs, rod, spots,
} from '../paint.js';

const MAKER = 'MOGURA';
const ASPHALT = 0x5e5c64, CONCRETE = 0xbab5aa, LINE = 0xe9e5da, IRON = 0x56525c;
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ 1. Cone Penguin
export function cone(S) {
  const ORANGE = 0xea5b3c, WHITE = 0xf3efe4, RUBBER = 0x302e34, PENG = 0x2c3644, BEAK = 0xf2a53a;
  const R = (y) => 17 - (y - 7.4) * (11.2 / 50.6);
  // the rubber foot
  S.paint(fill(RUBBER), crown(0.1), proj('top', stroke(rbox(0, 0, 19.5, 19.5, 3), 0.8), tint(RUBBER, 0.16)), ...stamp(MAKER, { c: 0x77727a }));
  S.box(-22, 0, -22, 22, 5, 22, { bevel: 1.6 });
  // the cone, with the hole they cut for the face
  S.paint(
    fill(ORANGE), vol(band(22.5, 30), WHITE), vol(band(42.5, 48.5), WHITE),
    shade(vol(band(22.5, 23.2)), 0.14), shade(vol(band(42.5, 43.2)), 0.14),
    shade(vol(below(10.5)), 0.2), shade(vol(blobs(blob([-13, 12, 8], [5, 3, 5]), blob([10, 9.5, -11], [6, 2.4, 6]))), 0.16),
    proj('front', ellipse(0, 36.8, 8.4, 9.4), ink(ORANGE, 0.45), { facing: 0.05 }),
    proj('front', ellipse(0, 36.8, 7.6, 8.6), PENG, { facing: 0.05 }),
    proj('front', or(circle(-2.9, 35.4, 3.9), circle(2.9, 35.4, 3.9), ellipse(0, 32.6, 4.8, 3.6)), 0xf6f2ea, { facing: 0.05 }),
    ...face({ at: [0, 36.9], gap: 6.4, r: 1.05, eye: 'dot', mouth: null }),
    proj('back', kana('安全第一', 0, 15.6, 4.6), WHITE), proj('back', stroke(rbox(0, 15.6, 11.6, 3.9, 1), 0.5), WHITE),
  );
  S.lathe([[19, 5], [19, 6.4], [17, 7.4], [R(32), 32], [5.8, 58], [5.3, 60.6], [3.9, 60.6], [3.9, 57.5]], { segs: 12, cap: false });
  S.paint(fill(ink(ORANGE, 0.6)));
  S.cyl([0, 57.3, 0], 3.9, 0.3, { segs: 12 });
  // beak, feet, flippers
  S.paint(fill(BEAK), under(0.22));
  S.at([0, 33.5, R(33.5) - 0.9], [Math.PI / 2, 0, 0], () => S.cone([0, 0, 0], 2.4, 4.4, { segs: 6, sx: 1.3, sz: 0.72 }));
  S.paint(fill(BEAK), under(0.22), proj('top', or(seg(-1.6, -4, -1.6, -2, 0.5), seg(1.6, -4, 1.6, -2, 0.5)), ink(BEAK, 0.4)));
  for (const s of [1, -1]) S.at([s * 6.6, 5, 19.2], null, () => S.ball([0, 1.3, 0], [4.3, 1.9, 4.4], { segs: 8, rings: 4 }));
  for (const s of [1, -1]) {
    S.part(`flip${s}`, { rest: 0, move: (t) => hinge([s * 12.6, 31, 0], 'z', s * 1.15 * t) }, () => {
      S.paint(fill(PENG), proj(s > 0 ? 'right' : 'left', ellipse(0, -6.5, 2.6, 4.6), tint(PENG, 0.12)));
      S.at([s * 12.6, 31, 0], [0, 0, s * 0.32], () => S.ball([s * 1.3, -6.2, 0], [1.9, 7.2, 4.6], { segs: 8, rings: 5 }));
    });
  }
}

// ------------------------------------------------------------------ 2. Post Owl
export function post(S) {
  const RED = 0xd9432f, CREAM = 0xf5ead2, DEEP = tone(RED, 0.22);
  S.paint(fill(CONCRETE), shade(vol(below(1.8)), 0.22), crown(0.1), ...stamp(MAKER));
  S.cyl([0, 0, 0], 16, 5, { segs: 12, bevel: 1 });
  const eyes = pair(circle(5.3, 40.6, 3.6));
  S.paint(
    fill(RED), shade(vol(band(45, 46.2)), 0.3), shade(vol(below(8.6)), 0.14), crown(0.12, 0.5),
    wrap(12.5, repeatU(arc(0, 16, 2.5, Math.PI, Math.PI * 2, 0.6), 5), DEEP), wrap(12.5, repeatU(arc(2.5, 12, 2.5, Math.PI, Math.PI * 2, 0.6), 5), DEEP),
    proj('front', rbox(0, 26, 6.2, 4.6, 0.7), tone(RED, 0.35)), proj('front', rbox(0, 26, 5.7, 4.1, 0.5), CREAM),
    proj('front', label('POST', 0, 27.6, 0.46), 0x7a3028, { hard: true }), proj('front', or(seg(-4, 25.2, 4, 25.2, 0.4), seg(-4, 23.8, 1.5, 23.8, 0.4)), 0xa8968a),
    proj('front', rbox(0, 33.6, 6.8, 1.7, 1.1), tone(RED, 0.3)), proj('front', rbox(0, 33.6, 6.2, 1.15, 0.8), 0x3a1a1e),
    proj('front', eyes, CREAM, { rough: 0.3 }), proj('front', stroke(eyes, 0.7), DEEP),
    proj('front', pair(circle(5.1, 40.1, 1.55)), EYE, { rough: 0.15 }), proj('front', pair(circle(4.6, 40.7, 0.5)), 0xffffff),
    proj('front', and(eyes, halfAbove(41.9)), DEEP), proj('front', and(stroke(eyes, 0.7), halfAbove(41.9)), tone(RED, 0.4)),
  );
  S.lathe([[13.7, 5], [13.7, 7.6], [12.5, 8.6], [12.5, 44.6], [14.7, 45.2], [14.7, 46.6], [13.4, 47.2], [12.7, 50.4], [10.6, 54.4], [6.6, 57.5], [0, 58.7]], { segs: 12 });
  // brow over the slot, ear tufts, folded wings, talons
  S.paint(fill(RED), under(0.25), crown(0.1));
  S.box(-7.8, 35.3, 11.4, 7.8, 36.9, 15.2, { bevel: 0.6 });
  for (const s of [1, -1]) S.at([s * 7.2, 55.4, 0], [0, 0, -s * 0.5], () => S.cone([0, 0, 0], 3.1, 7.4, { segs: 6 }));
  for (const s of [1, -1]) {
    S.paint(fill(DEEP), proj(s > 0 ? 'right' : 'left', or(arc(0, 31, 5.5, Math.PI * 1.1, Math.PI * 1.9, 0.6), arc(0, 25, 5.5, Math.PI * 1.1, Math.PI * 1.9, 0.6), arc(0, 19, 4.6, Math.PI * 1.1, Math.PI * 1.9, 0.6)), tone(RED, 0.42)));
    S.ball([s * 12.5, 26, -1], [2.5, 11.5, 7.6], { segs: 8, rings: 6 });
  }
  S.paint(fill(0xe6b23c), under(0.2), proj('top', or(seg(-1.2, -3, -1.2, -1.2, 0.5), seg(1.2, -3, 1.2, -1.2, 0.5)), 0xa87a20));
  for (const s of [1, -1]) S.at([s * 5.6, 5, 13], null, () => S.ball([0, 1, 0], [3, 1.6, 3.2], { segs: 8, rings: 4 }));
  // a letter on its way in
  S.part('letter', { rest: 0, move: (t) => slide(0, 0, -7.6 * t) }, () => {
    S.paint(fill(0xf7f3e8), proj('top', rbox(3, -16.6, 1.1, 1.1, 0.1), 0xd8553f), proj('top', or(seg(-3.6, -16.2, 0.4, -16.2, 0.35), seg(-3.6, -15, -0.6, -15, 0.35)), 0x9aa0b0));
    S.box(-5.2, 33.1, 8, 5.2, 34.1, 18.4);
  });
}

// ------------------------------------------------------------------ 3. Pole Koala
export function pole(S) {
  const GREY = 0x9fa5ae, FUR = tint(GREY, 0.42), METAL = 0x6f6b66;
  // a square of the lane
  S.paint(fill(ASPHALT), crown(0.08), proj('top', rbox(-11.5, 0, 1.7, 20, 0), LINE), proj('top', or(seg(4, 12, 9, 7, 0.4), seg(9, 7, 12.5, 8.5, 0.4)), tone(ASPHALT, 0.3)), ...stamp(MAKER, { c: 0x8a8690 }));
  S.box(-17, 0, -17, 17, 4, 17, { bevel: 1 });
  // the pole: hazard wrap, number plate
  const hazard = (x, y, z) => ((((Math.atan2(x, z) * 5.3 + y) % 6) + 6) % 6 < 3 ? 0xf2c230 : 0x2e2c30);
  const PR = (y) => 5.4 - (y - 4) * (1.2 / 76);
  S.paint(fill(CONCRETE), vol(band(6, 19), hazard), shade(vol(band(19, 19.6)), 0.25), shade(vol(below(6)), 0.2));
  S.lathe([[PR(4), 4], [PR(23.5), 23.5]], { segs: 10, cap: 'bottom' });
  S.with({ dens: 1.7 }, () => {
    S.paint(fill(CONCRETE), proj('front', rbox(0, 28.6, 2.9, 4.2, 0.4), 0x2f7d74), proj('front', label('3', 0, 30.4, 0.5), 0xf4f0e4, { hard: true }), proj('front', label('12', 0, 26.6, 0.4), 0xf4f0e4, { hard: true }));
    S.lathe([[PR(23.5), 23.5], [PR(33.5), 33.5]], { segs: 10, cap: false });
  });
  S.paint(fill(CONCRETE), shade(wrap(4.8, repeatU(rbox(0, 56, 0.25, 22, 0), 7.5)), 0.08));
  S.lathe([[PR(33.5), 33.5], [PR(80), 80]], { segs: 10, cap: 'top' });
  S.paint(fill(METAL), under(0.2));
  for (const [s, y] of [[-1, 50.5], [1, 60], [-1, 68.5]]) S.tube([[s * 4, y, 0], [s * 9.6, y, 0]], 0.8, { sides: 5 });
  S.box(-16, 72, -1.5, 16, 74.6, 1.5, { bevel: 0.4 });
  S.paint(fill(0xf1eee6), under(0.18), shade(vol(band(75.6, 76.4)), 0.12));
  for (const x of [-13, -6.5, 13]) S.at([x, 74.6, 0], null, () => S.lathe([[1.3, 0], [2.2, 1.2], [2.2, 2.2], [1.4, 3], [2, 3.8], [1.3, 5], [0, 5.3]], { segs: 8 }));
  // the transformer
  S.paint(fill(0x8f97a0), under(0.2), crown(0.12), shade(wrap(5.3, repeatU(rbox(0, 61, 0.5, 4.2, 0.2), 2.8)), 0.2), proj('left', rbox(0, 60.5, 2.2, 1.6, 0.2), 0xf2e9c8));
  S.at([-10.6, 0, 0], null, () => S.lathe([[4.6, 54.4], [5.3, 55.2], [5.3, 66], [4.4, 67], [1.6, 67.4], [1.6, 68.6], [0, 68.6]], { segs: 10 }));
  S.paint(fill(METAL));
  S.box(-6.4, 59, -1.3, -4, 62, 1.3);
  // the koala, asleep against it
  S.paint(fill(GREY), under(0.2), crown(0.12), vol(blob([1.5, 22, -12], [5, 4, 5]), FUR));
  S.ball([1.5, 31, -8.5], [10.6, 12.6, 9], { segs: 12, rings: 7 });
  const limb = (pts, r) => S.tube(spline(pts, 3), (t) => r * (t > 0.86 ? 0.82 : 1), { sides: 7 });
  S.paint(fill(GREY), under(0.22), vol(blob([-4.8, 40, 5.4], 2.6), tone(GREY, 0.3)), vol(blob([4.8, 35, 5.2], 2.6), tone(GREY, 0.3)));
  limb([[9.4, 39, -6], [10, 39.5, 1], [6.4, 40, 5.8], [0.5, 40.2, 6.8], [-4.6, 40, 5.2]], 2.7);
  limb([[-8.4, 36, -7], [-9, 35.5, 0], [-5.4, 35, 5.6], [0.3, 34.8, 6.6], [4.6, 35, 5.2]], 2.7);
  S.paint(fill(GREY), under(0.22), vol(blob([0.4, 22, 6.4], 2.8), tone(GREY, 0.3)), vol(blob([1.6, 23.4, 6.6], 2.8), tone(GREY, 0.3)));
  limb([[-9.4, 25, -7], [-9.6, 22.8, 0], [-5.4, 22, 5.6], [0.2, 22, 6.4]], 3.2);
  limb([[10.4, 26, -6], [10.6, 24, 0.5], [6.4, 23.4, 5.8], [1.8, 23.4, 6.6]], 3.2);
  S.at([11, 47.4, -0.6], [0, 0, -0.24], () => {
    S.paint(fill(GREY), under(0.18), crown(0.1), ...face({ at: [0, 1.4], gap: 9.4, r: 1.35, eye: 'sleepy', mouth: 'smile', my: 6.4, mw: 2.2, blush: 0xe8b4b8 }));
    S.ball([0, 0, 0], [9.6, 8.3, 8.3], { segs: 12, rings: 7 });
    for (const s of [1, -1]) {
      S.paint(fill(GREY), proj('front', circle(s * 9, 5.6, 3.3), FUR), proj('front', or(seg(s * 7.6, 4.6, s * 8.4, 6.8, 0.5), seg(s * 9.4, 4, s * 9.6, 6.6, 0.5), seg(s * 10.8, 4.8, s * 10.2, 6.8, 0.5)), tint(FUR, 0.5)));
      S.ball([s * 9, 5.6, -0.6], [5.2, 5.2, 2.6], { segs: 10, rings: 5 });
    }
    S.paint(fill(0x3c3642, { rough: 0.25 }), proj('front', ellipse(-0.6, 0, 0.6, 1.2, 0.3), 0x7a7482), under(0.2));
    S.ball([0, -1.4, 7.7], [2.5, 3.5, 1.9], { segs: 8, rings: 5 });
  });
}

// ------------------------------------------------------------------ 4. Manhole Seal
export function seal(S) {
  const SKIN = 0xece9e2, SOIL = 0x80604a, UP = 23;
  // the roadbed: a course of crushed stone, the stones set out by rule along each face
  const stones = [];
  for (let i = 0; i < 9; i++) { const u = -21 + i * 5.2 + (i % 2) * 0.8, y = 17.2 + (i % 3) * 0.9, r = [1.5 + (i % 2) * 0.5, 0.9 + (i % 3) * 0.2, 2]; stones.push(blob([u, y, 24], r), blob([-u, y + 0.5, -24], r), blob([24, y, u], [2, r[1], r[0]]), blob([-24, y + 0.4, -u], [2, r[1], r[0]])); }
  // a block of the lane, cut through: asphalt, roadbed, soil, an old pipe
  S.paint(
    fill(ASPHALT), vol(band(15.6, 20.6), 0x8f8a82), vol(blobs(...stones), 0xb1aca2), vol(band(4.4, 15.6), SOIL), vol(below(4.4), tone(SOIL, 0.22)),
    shade(vol(band(20.6, 21.1)), 0.3), shade(vol(band(15.2, 15.6)), 0.18),
    vol(blobs(blob([10, 11, 24], [3.4, 2.2, 2]), blob([-24, 8, 6], [2, 2.6, 3.6]), blob([24, 12, -9], [2, 1.8, 2.8]), blob([-6, 7, -24], [3, 2, 2])), 0xa59a8c),
    proj('front', circle(-11, 9.5, 5.2), 0xb0694a), proj('front', circle(-11, 9.5, 3.6), 0x2b2028), proj('front', and(circle(-11, 9.5, 5.2), halfAbove(12.4)), tint(0xb0694a, 0.25)),
    proj('top', rbox(-18.6, 0, 1.6, 30, 0), LINE), proj('top', or(seg(14, 21, 20, 15, 0.45), seg(20, 15, 22.5, 16.5, 0.45), seg(17, 18, 16, 14, 0.4)), tone(ASPHALT, 0.3)),
    proj('top', rbox(19.5, -17, 3, 5, 0.6), tone(ASPHALT, 0.14)),
    ...stamp(MAKER, { c: 0x4e3c30 }),
  );
  S.box(-24, 0, -24, 24, 24, 24, { bevel: 1 });
  S.paint(fill(IRON), crown(0.14));
  S.lathe([[20.2, 24], [20.2, 25.3], [19.2, 25.8], [17.2, 25.8], [16.7, 25.2], [16.7, 24]], { segs: 16, cap: false });
  S.paint(fill(0x241e28));
  S.cyl([0, 24, 0], 16.7, 0.35, { segs: 16 });
  const rise = (t) => slide(0, -UP * (1 - t), 0);
  S.part('seal', { rest: 0.86, move: rise }, () => {
    S.paint(
      fill(SKIN), under(0.14),
      shade(vol(blobs(blob([-6, 41, -8], [3.2, 2.4, 3.2]), blob([5, 38, -11], [2.6, 3, 2.6]), blob([9.5, 43, -3], [2.4, 2, 2.4]), blob([-10.5, 35, -6], [2.2, 2.8, 2.6]), blob([-2, 33, -12.5], [3, 2.6, 2]), blob([11, 33, -7], [2, 2.4, 2.4]))), 0.24),
      ...face({ at: [0, 39.4], gap: 11.6, r: 2.05, eye: 'bead', mouth: 'w', my: 4.9, mw: 3.6, blush: 0xf3c2c0 }),
      proj('front', ellipse(0, 36.2, 1.6, 1.05), 0x3a3038, { rough: 0.2 }),
      proj('front', pair(or(circle(4, 34.8, 0.36), circle(5.4, 35.6, 0.36), circle(5.2, 34, 0.36))), 0x8a848c),
      proj('front', pair(ellipse(5.4, 43.2, 0.9, 0.5, 0.3)), 0xb9b4b0),
    );
    S.lathe(spline([[13, 24], [14.6, 30], [14, 37.5], [12, 42.6], [8.6, 45.2], [0, 46]], 2), { segs: 12, sz: 0.92, cap: false });
    S.paint(fill(SKIN), under(0.16), proj('top', or(seg(-2, -1.5, -4, -2.4, 0.45), seg(0, -1.8, 0, -3, 0.45), seg(2, -1.5, 4, -2.4, 0.45)), 0xb9b2aa));
    for (const s of [1, -1]) S.at([s * 13.4, 26.6, 6.4], [0, -s * 0.6, s * 0.08], () => S.ball([0, 0.9, 0], [5.6, 1.9, 3.6], { segs: 8, rings: 4 }));
  });
  S.part('lid', { rest: 0.86, move: (t) => chain(slide(0, -20.6 * (1 - t), 0), hinge([0, 44.2, 0], 'x', 0.22 * (1 - t))) }, () => {
    const bars = [];
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 + 0.2; bars.push(seg(Math.cos(a) * 9.6, Math.sin(a) * 9.6, Math.cos(a) * 12.4, Math.sin(a) * 12.4, 1)); }
    const hi = tint(IRON, 0.26);
    S.paint(fill(IRON), under(0.25), proj('top', stroke(circle(0, 0, 13.6), 0.9), hi), proj('top', or(...bars), hi), proj('top', stroke(circle(0, 0, 8.4), 0.9), hi),
      proj('top', kana('げすい', 0, 0.2, 3.4), hi), proj('top', or(circle(-5.6, 5, 0.7), circle(5.6, -5, 0.7)), 0x2a242c), shade(proj('top', and(circle(0, 0, 15), halfBelow(-9)), 0), 0.1));
    S.at([0, 44.2, -0.8], [-0.22, 0, 0], () => S.cyl([0, 0, 0], 15.6, 2.4, { segs: 16, bevel: 0.6 }));
  });
}

// ------------------------------------------------------------------ 5. Mirror Giraffe
export function mirror(S) {
  const GIR = 0xf0b142, BROWN = 0xa5632f, RIM = 0xf08a2c, GLASS = 0xc2e2ef;
  S.paint(fill(CONCRETE), shade(vol(below(1.8)), 0.22), crown(0.1), ...stamp(MAKER));
  S.cyl([0, 0, 0], [10.4, 8.6], 6, { segs: 10, bevel: 0.8 });
  S.paint(fill(0x4a3428, { rough: 0.35 }), proj('front', pair(seg(2.9, 6.6, 2.9, 8.6, 0.4)), 0x2e2018));
  for (const s of [1, -1]) S.ball([s * 2.9, 7, 5.6], [2.3, 1.7, 2.8], { segs: 8, rings: 4 });
  S.with({ dens: 1.3, maxFacet: 7 }, () => {
    S.paint(fill(GIR), vol(spots(11, { y0: 9, y1: 60, R: 3.4, r: [2.5, 2, 2.5] }), BROWN), shade(vol(below(8)), 0.2));
    S.lathe([[3.6, 6], [3.3, 61]], { segs: 10 });
  });
  S.paint(fill(tone(BROWN, 0.18)));
  S.box(-0.7, 13, -5.4, 0.7, 60, -2.9, { bevel: 0.4 });
  S.paint(fill(GIR));
  S.tube(spline([[0, 12.5, -3.2], [0, 9.5, -6], [0.6, 6.2, -7]], 3), 0.7, { sides: 5 });
  S.paint(fill(tone(BROWN, 0.2)));
  S.ball([0.7, 5.2, -7.2], [1.4, 1.9, 1.4], { segs: 6, rings: 4 });
  // the warning plate bolted to its neck
  S.paint(fill(0xf4f0e2), proj('front', stroke(rbox(0, 34, 4.4, 5.6, 0.7), 0.55, 0.5), 0xd8402f), proj('front', kana('注意', 0, 35.6, 3.2), 0xd8402f), proj('front', poly([[-2.4, 31.4], [2.4, 31.4], [0, 29.4]]), 0x2e2c30));
  S.box(-5, 28, 3.3, 5, 40, 4.3, { bevel: 0.3 });
  S.part('head', { rest: 0.5, move: (t) => hinge([0, 0, 0], 'y', lerp(-0.75, 0.75, t)) }, () => {
    S.paint(fill(RIM));
    S.box(-2, 60, -1.2, 2, 70, 2.6, { bevel: 0.5 });
    // the mirror: its glass is the giraffe's forehead; local +y looks out of the glass, local -z is up
    S.at([0, 71.6, 3.2], [Math.PI / 2 + 0.1, 0, 0], () => {
      const G = circle(0, 0, 12.9);
      S.paint(
        fill(RIM), under(0.2),
        proj('top', G, GLASS, { rough: 0.12 }), proj('top', and(G, halfBelow(-1)), 0xa6cfe4, { rough: 0.12 }), proj('top', and(G, halfBelow(-6.4)), 0x93939f, { rough: 0.12 }),
        proj('top', and(G, poly([[-13, -6.4], [-7.5, -6.4], [-7.5, -1.6], [-10, -1.6], [-10, -3.6], [-13, -3.6]])), 0x8fb4c8), proj('top', and(G, poly([[6, -6.4], [13, -6.4], [13, -2.6], [9, -2.6], [9, -0.4], [6, -0.4]])), 0x8fb4c8),
        proj('top', poly([[-0.5, -6.4], [0.5, -6.4], [1.7, -12.8], [-1.7, -12.8]]), 0xe9e7df),
        proj('top', and(G, poly([[-10.5, 5.5], [-8, 8.5], [-1.5, 0.5], [-4, -2.5]])), 0xe4f3fa, { alpha: 0.75 }),
        proj('top', stroke(G, 0.9, 0.4), tone(RIM, 0.35)),
        ...face({ view: 'top', at: [0, 3], gap: 11.6, r: 2.3, eye: 'smug', mouth: null }),
        proj('top', pair(or(seg(8.6, 3.8, 10.2, 4.8, 0.5), seg(8.5, 2.8, 10.4, 3, 0.5))), EYE),
      );
      S.lathe([[0, -3.2], [10.6, -3.2], [14.2, -1], [14.4, 2.2], [12.9, 2.7], [12.9, 1.5], [8.6, 2.5], [4.4, 3], [0, 3.2]], { segs: 16 });
    });
    S.paint(fill(tint(GIR, 0.3)), under(0.18), proj('front', pair(ellipse(2.2, 61.2, 0.85, 1.25, 0.35)), tone(BROWN, 0.2)), proj('front', arc(0, 60.6, 3.4, Math.PI * 1.25, Math.PI * 1.75, 0.5), tone(BROWN, 0.1)));
    S.ball([0, 60.6, 7.2], [6, 4.3, 4.6], { segs: 10, rings: 6 });
    for (const s of [1, -1]) {
      S.paint(fill(GIR));
      S.at([s * 5.4, 84.6, 1.4], [0, 0, -s * 0.2], () => S.cyl([0, 0, 0], [1.6, 1.3], 4.6, { segs: 6 }));
      S.paint(fill(tone(BROWN, 0.15)));
      S.at([s * 5.4, 84.6, 1.4], [0, 0, -s * 0.2], () => S.ball([0, 5.4, 0], 2, { segs: 6, rings: 4 }));
      S.paint(fill(GIR), proj('front', ellipse(0, 3.4, 1.3, 3), 0xf4c9b4));
      S.at([s * 14.4, 78.4, 1.2], [0, 0, -s * 1.15], () => S.ball([0, 3.4, 0], [2.7, 5.2, 1.6], { segs: 6, rings: 5 }));
    }
  });
}

// ------------------------------------------------------------------ 6. Jizo Capybara (secret)
export function jizo(S) {
  const STONE = 0xb0aca2, MOSS = 0x86a062, CAPY = 0xba8a5c, RED = 0xd5412f, DARK = tone(CAPY, 0.32);
  S.paint(fill(STONE), vol(below(2.6), MOSS), vol(blobs(blob([-19, 4, 9], [2, 2.6, 4]), blob([14, 3.4, -15], [4, 2.2, 2])), MOSS), crown(0.1),
    proj('front', kana('一九六四', 0, 4.2, 2.6), tone(STONE, 0.34)), ...stamp(MAKER));
  S.box(-19, 0, -15, 19, 7, 15, { bevel: 1.4 });
  // the body, with its bib
  const bib = poly([[-10, 32.5], [10, 32.5], [11, 24], [6.4, 17.4], [0, 15.4], [-6.4, 17.4], [-11, 24]]);
  S.paint(fill(CAPY), under(0.18), shade(vol(below(10.5)), 0.14), vol(blob([-10.5, 25, -6.5], [5.5, 5, 6.5]), MOSS), vol(blob([-6, 31, -9], [3, 2.4, 3]), MOSS),
    proj('front', bib, RED, { facing: 0.05 }), proj('front', stroke(bib, 0.7, 0.9), tint(RED, 0.28), { facing: 0.05 }), proj('front', and(bib, halfAbove(30.4)), tone(RED, 0.18), { facing: 0.05 }));
  S.lathe(spline([[12, 7], [14.2, 12.5], [13.5, 22], [11, 29.5], [7.4, 33.6]], 2), { segs: 12, sz: 0.92, cap: 'bottom' });
  S.paint(fill(DARK), under(0.2), proj('top', or(seg(-1.2, -3.3, -1.2, -1.6, 0.4), seg(1.2, -3.3, 1.2, -1.6, 0.4)), tone(CAPY, 0.5)));
  for (const s of [1, -1]) S.at([s * 5.2, 7, 11.4], null, () => S.ball([0, 1.5, 0], [3, 2, 3.5], { segs: 8, rings: 4 }));
  S.paint(fill(RED), under(0.2));
  S.ball([8.6, 31.6, 5.4], [1.9, 1.6, 1.7], { segs: 6, rings: 4 });
  // the head: blunt, square-nosed; one eye is not as shut as the other
  const eyeL = [[-8.5, 41.6, 3], [-7.5, 41.9, 7.4]], eyeR = [[8.5, 41.6, 3], [7.5, 41.9, 7.4]];
  S.paint(
    fill(CAPY), under(0.18), crown(0.08), vol(blob([0, 38.6, 14], [7, 3.2, 3]), tint(CAPY, 0.2)),
    vol(rod(eyeL[0], eyeL[1], 0.48), EYE), vol(blob([8, 41.7, 5.2], 1.45), EYE, { rough: 0.15 }), vol(blob([8.6, 42.3, 5.7], 0.5), 0xffffff),
    proj('front', pair(ellipse(2, 40, 0.75, 1.1, 0.4)), 0x4a3428), proj('front', or(seg(0, 38.8, 0, 37.2, 0.5), arc(-1.5, 37.4, 1.5, Math.PI * 1.1, Math.PI * 2, 0.5), arc(1.5, 37.4, 1.5, Math.PI, Math.PI * 1.9, 0.5)), 0x6a4a34),
  );
  S.loft([[-9, 5.6, 5], [-5, 8.7, 7.8], [2, 9.3, 8.3], [8.5, 8.1, 7], [13, 6.5, 5.8]].map(([z, rx, ry]) => ring([0, 38.5, z], rx, ry, 10, { pow: 2.7, axis: 'z' })));
  S.part('lid', { rest: 0, move: (t) => hinge([7.4, 43.6, 5.2], [0.25, 0, 1], 1.5 * t) }, () => {
    S.paint(fill(CAPY), vol(rod([8.9, 41.6, 3], [7.9, 41.9, 7.4], 0.48), EYE));
    S.ball([7.7, 41.7, 5.2], [1.75, 2, 2.6], { segs: 8, rings: 5 });
  });
  S.paint(fill(DARK));
  for (const s of [1, -1]) S.ball([s * 8.8, 44.4, -4.4], [2.4, 2.3, 1.7], { segs: 6, rings: 4 });
  // the knitted cap
  S.paint(fill(RED), wrap(8.5, repeatU(rbox(0, 46.4, 0.4, 1.3, 0), 2.2), tone(RED, 0.26)), shade(vol(band(47.7, 48.2)), 0.22), crown(0.1));
  S.ball([0, 45.2, -0.6], [8.6, 6.6, 8.6], { segs: 12, rings: 8, v0: 0.5 });
  S.paint(fill(0xf3efe6), under(0.15));
  S.ball([0, 52.6, -0.6], 2.5, { segs: 8, rings: 5 });
  // offerings: a mandarin on a dish, a cup, a coin
  S.paint(fill(0xf4f1ea), under(0.14));
  S.at([-11.4, 7, 10.6], null, () => S.lathe([[4.2, 0], [5.2, 0.9], [4.4, 0.9], [0, 0.5]], { segs: 10 }));
  S.paint(fill(0xf29a30), under(0.18), crown(0.12), proj('top', star(-11.4, -10.6, 1.5, 5, 0.4), 0x5f8a44));
  S.ball([-11.4, 10.5, 10.6], [3.4, 2.9, 3.4], { segs: 10, rings: 6 });
  S.paint(fill(0x3f6ea8), vol(band(2.6, 3.6), 0xf4f1ea));
  S.at([11, 7, 10.4], null, () => S.lathe([[2.5, 1.2], [2.72, 5]], { segs: 10, cap: false }));
  S.clear(true);
  S.paint(fill(0xdff0f4));
  S.at([11, 7, 10.4], null, () => S.lathe([[2.5, 0], [2.95, 6.6], [2.6, 6.6], [2.3, 0.7], [0, 0.7]], { segs: 10 }));
  S.clear(false);
  S.paint(fill(0xd9b450, { rough: 0.3 }), proj('top', circle(2.6, -12.4, 0.55), 0x6a5420));
  S.cyl([2.6, 7, 12.4], 1.9, 0.5, { segs: 10 });
}

void cut; void mix; void ink;
