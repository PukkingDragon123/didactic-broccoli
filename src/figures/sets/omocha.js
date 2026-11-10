// Dagashi-ya Omocha (駄菓子屋おもちゃ): old-school toys you can really play with. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/omocha.js, the play is src/game/toys.js. The family
// look: the toys themselves at toy size, glossy enamel and lacquer, printed tin, hand-painted rings, a little shop tag.
// The parts the play moves are joints: the robot's key, arms and legs, the kendama's ball, the blaster's loaded dart;
// the points the play needs (where the ball sits, the muzzle, the LCD window) are exported below, in millimetres.
import { spline, ring } from '../sculpt.js';
import { head, torso, paw, blade } from '../anatomy.js';
import {
  fill, proj, wrap, vol, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, halfBelow, halfAbove, repeatU, repeatV, label, kana,
  below, above, band, blob, blobs,
} from '../paint.js';
import { L } from './showa.js';

const DENS = 0.85;
const MAKER = 'DAGASHI';
const RED = 0xe8453c, BLUE = 0x3f86e8, YEL = 0xf7d046, GREEN = 0x58c06c, CREAM = 0xf6f0e0, DARK = 0x2a2a2e, TIN = 0xc8ccd4;
const or_ = (...fs) => { const f = (x, y, z) => Math.min(...fs.map((g) => g(x, y, z))); f.ys = fs.flatMap((g) => g.ys || []); return f; };

/** Points the play uses (figure millimetres). */
export const KENDAMA = { rest: [0, 62, 0], big: [-28, 42, 0], small: [26, 42.4, 0], spike: [0, 62, 0], miss: [7, 16, 9], string: [0, 41, 3.4], r: 10 };
export const BLASTER = { muzzle: [0, 34.6, 33] };
export const LCD = { x0: -17.6, y0: 15.4, x1: 13.6, y1: 37.4, z: 7.2 };
export const YOYO = { centre: [0, 20.6, 0] };

// ------------------------------------------------------------------ 1. Melon-pan Squishy
export function squishy(S) {
  S.dens = DENS;
  const CRUST = 0xf2c66a, TOP = 0xf6d68a, GROOVE = 0xd8a24a;
  const grid = (k) => or(...[-3, -2, -1, 0, 1, 2, 3].map((i) => seg(-30, i * 8 - 30 * k, 30, i * 8 + 30 * k, 0.6)));
  S.paint(fill(TOP, { rough: 0.75 }), proj('top', and(circle(0, 0, 24), or(grid(1), grid(-1))), GROOVE), vol(below(6), CRUST), proj('top', or(...[[-6, 4], [5, -9], [10, 7], [-12, -6], [2, 14]].map(([x, y]) => circle(x, y, 0.5))), 0xfbf6e8),
    ...face({ at: [0, 12], gap: 12, r: 1.6, eye: 'closed', mouth: 'w', mw: 3, my: 3.4, blush: 0xf4a0a8, near: 14 }), under(0.12), ...stamp(MAKER, { c: 0x9a7a4a }));
  S.lathe(spline([[0, 0], [21, 0], [25, 1.6], [27.6, 5.6], [27.4, 10], [24, 16], [17, 21.4], [8, 24.4], [0, 25]], 3), { segs: 30, sz: 0.9 });
  // the shop tag on a loop of thread
  S.paint(fill(0xfbf8f0, { rough: 0.85 }), proj('front', label('SQUISHY', 0, 1.2, 0.3), RED, { hard: true }), proj('front', label('¥100', 0, -1.6, 0.3), DARK, { hard: true }), proj('front', circle(0, 3.6, 0.6), 0xc8c0b0));
  S.at([20, 13, -14], [0, -0.7, 0.2], () => S.box(-4.4, -3.6, -0.3, 4.4, 4.4, 0.3, { bevel: 0.2 }));
  S.paint(fill(0xf4f0e0, { rough: 0.9 }));
  S.tube(spline([[17.6, 18, -15], [19.6, 18.6, -14.4], [20.4, 16.6, -14.2]], 2), 0.3, { sides: 4 });
}

// ------------------------------------------------------------------ 2. Super Ball
export function superball(S) {
  S.dens = DENS;
  // a marbled core of four colours swirling round, inside a clear skin
  const swirl = (x, y, z) => { const a = Math.atan2(z, x) + y * 0.16 + Math.sin(y * 0.3) * 0.5; const k = (((Math.floor((a / (Math.PI * 2)) * 6 + 60)) % 4) + 4) % 4; return [RED, YEL, BLUE, GREEN][k]; };
  S.paint(fill(swirl, { rough: 0.3 }));
  S.ball([0, 19, 0], 16.6, { segs: 22, rings: 14 });
  S.clear(true);
  S.paint(fill(0xf4f8fa, { rough: 0.06 }));
  S.ball([0, 19, 0], 19, { segs: 24, rings: 14 });
  S.clear(false);
}

// ------------------------------------------------------------------ 3. Spinning Top
export function koma(S) {
  S.dens = DENS;
  const WOOD = 0xe8c48a;
  const rings = or(stroke(circle(0, 0, 21), 2.4), stroke(circle(0, 0, 14.6), 2), stroke(circle(0, 0, 8.6), 1.6));
  S.paint(fill(WOOD, { rough: 0.45 }), proj('top', stroke(circle(0, 0, 21), 2.4), RED), proj('top', stroke(circle(0, 0, 14.6), 2), BLUE), proj('top', stroke(circle(0, 0, 8.6), 1.6), GREEN), proj('top', stroke(circle(0, 0, 18), 0.6), YEL), vol(band(9, 10.6), RED), vol(band(6.4, 7.4), BLUE), under(0.12), crown(0.06));
  void rings;
  S.lathe(spline([[0.4, 0], [1.6, 0.6], [4, 3], [10, 5.4], [19, 7.6], [24.6, 9.2], [25.4, 10.4], [24.6, 11.6], [20, 12.2], [8, 12.8], [4.4, 13.2]], 3), { segs: 32 });
  S.paint(fill(WOOD, { rough: 0.45 }), vol(band(18, 19), RED), crown(0.1));
  S.lathe(spline([[4.4, 13.2], [3.2, 14], [2.8, 17], [3, 20.6], [2.6, 22.4], [0, 22.8]], 2), { segs: 16 });
  S.paint(fill(0xc8ccd4, { rough: 0.2 }));
  S.lathe([[0, -0.4], [0.9, 0.2], [1.6, 1]], { segs: 10, cap: false });
}

// ------------------------------------------------------------------ 4. Champion Yo-yo
export function yoyo(S) {
  S.dens = DENS;
  const C = YOYO.centre;
  // two lacquered halves facing front and back, the string wound in the gap
  S.at(C, [Math.PI / 2, 0, 0], () => {
    for (const s of [1, -1]) {
      const deco = or(star(0, 0, 5.6, 5, 0.42), stroke(circle(0, 0, 8), 0.6), stroke(circle(0, 0, 17.4), 0.6));
      S.paint(fill(RED, { rough: 0.25 }), proj(s > 0 ? 'top' : 'bottom', deco, YEL), proj(s > 0 ? 'top' : 'bottom', circle(0, 0, 3), 0xfbf8f0), ...(s > 0 ? [proj('top', label('CHAMP', 0, 11.6, 0.32), YEL, { hard: true })] : []), crown(0.08), under(0.12));
      S.lathe(spline(s > 0 ? [[2, 1.2], [10, 1.6], [17, 3.2], [19.6, 5.6], [20.2, 8], [19, 9.6], [12, 10.2], [0, 10.4]] : [[0, -10.4], [12, -10.2], [19, -9.6], [20.2, -8], [19.6, -5.6], [17, -3.2], [10, -1.6], [2, -1.2]], 3), { segs: 32 });
    }
    S.paint(fill(0xf8f4e8, { rough: 0.85 }), wrap(6, repeatV(rbox(0, 0, 40, 0.15, 0), 0.5), 0xd8d0c0));
    S.lathe([[6, -1.3], [6.4, 0], [6, 1.3]], { segs: 20, cap: false });
  });
  S.paint(fill(RED), ...stamp(MAKER, { c: 0x8a2a2a }));
}

// ------------------------------------------------------------------ 5. Wind-up Tin Robot
export function robot(S) {
  S.dens = DENS;
  const gauges = [proj('front', or(stroke(circle(-3.6, 26, 2.6), 0.5), stroke(circle(3.6, 26, 2.6), 0.5)), DARK, { near: 6 }), proj('front', or(seg(-3.6, 26, -2, 27.4, 0.4), seg(3.6, 26, 5, 25, 0.4)), RED, { near: 6 }), proj('front', rbox(0, 19.4, 6.6, 1.6, 0.6), YEL, { near: 6 }), proj('front', or(...[-4.6, -2.3, 0, 2.3, 4.6].map((x) => circle(x, 19.4, 0.6))), [RED, GREEN, BLUE, RED, GREEN][0], { near: 6 }), proj('front', label('ROBO', 0, 31.6, 0.3), RED, { hard: true, near: 6 })];
  const rivets = (v) => proj(v, or(...[[-8, 16], [8, 16], [-8, 33], [8, 33]].map(([x, y]) => circle(x, y, 0.45))), tint(TIN, 0.4));
  // legs and feet (they step while it walks)
  for (const s of [1, -1]) S.joint(s > 0 ? 'legR' : 'legL', L(S, { pivot: [s * 4.6, 13, 0], axis: 'x', min: -0.5, max: 0.5, rest: 0 }), () => {
    S.paint(fill(0x6a7078, { rough: 0.3 }), proj('front', or(...[5, 7.6, 10.2].map((y) => seg(s * 4.6 - 2, y, s * 4.6 + 2, y, 0.35))), tone(0x6a7078, 0.3)), under(0.2));
    S.lathe(spline([[2.2, 3], [2.6, 7], [2.4, 13.4]], 2), { segs: 12, at: [s * 4.6, 0, 0] });
    S.paint(fill(RED, { rough: 0.3 }), under(0.2));
    S.box(s * 4.6 - 3.4, 0, -4, s * 4.6 + 3.4, 3.6, 6.4, { bevel: 1.4 });
  });
  // the body: pressed tin, its seam, gauges printed on the chest
  S.paint(fill(TIN, { rough: 0.25 }), vol(band(13, 14.6), RED), vol(band(34.4, 35.6), RED), ...gauges, rivets('front'), rivets('back'), proj('back', rbox(0, 24, 5, 6, 1), tone(TIN, 0.15)), under(0.16), crown(0.06), ...stamp(MAKER, { c: 0x6a6e78 }));
  S.loft([[13, 9.6, 6.4], [14, 10.4, 7], [24, 10.6, 7.2], [34, 10.2, 6.8], [35.6, 9.4, 6.2]].map(([y, rx, rz]) => ring([0, y, 0], rx, rz, 20, { pow: 4 })));
  // the head: a dome with a clear visor and a red antenna bulb
  S.paint(fill(TIN, { rough: 0.25 }), vol(band(36, 37), RED), proj('front', pair(circle(2.8, 42.4, 1)), DARK, { near: 4 }), proj('front', rbox(0, 39.4, 3, 0.6, 0.3), DARK, { near: 4 }), under(0.14), crown(0.1));
  S.lathe(spline([[5, 35.6], [7.4, 36.4], [8, 40], [7.4, 44.6], [5, 47.4], [0, 48.4]], 3), { segs: 20 });
  S.clear(true);
  S.paint(fill(0x9ad8ec, { rough: 0.05 }));
  S.at([0, 42.2, 5.8], [0, 0, 0], () => S.ball([0, 0, 0], [5.6, 3, 2.6], { segs: 14, rings: 7, v0: 0.5 - 0.0 }));
  S.clear(false);
  S.paint(fill(0x6a7078, { rough: 0.3 }));
  S.tube([[0, 48, 0], [0, 54, 0]], 0.6, { sides: 8 });
  S.paint(fill(RED, { rough: 0.15 }));
  S.ball([0, 55, 0], 1.6, { segs: 10, rings: 6 });
  for (const s of [1, -1]) { S.paint(fill(YEL, { rough: 0.3 })); S.at([s * 7.6, 42, 0], [0, 0, -s * Math.PI / 2], () => S.cyl([0, 0, 0], [2.2, 1.6], 2, { segs: 12 })); }
  // arms, swinging as it walks: tin tubes, red claws
  for (const s of [1, -1]) S.joint(s > 0 ? 'armR' : 'armL', L(S, { pivot: [s * 10.6, 31, 0], axis: 'x', min: -0.6, max: 0.6, rest: 0 }), () => {
    S.paint(fill(YEL, { rough: 0.3 }));
    S.at([s * 10.4, 31, 0], [0, 0, -s * Math.PI / 2], () => S.cyl([0, 0, 0], 2.6, 2, { segs: 12 }));
    S.paint(fill(0x6a7078, { rough: 0.3 }), proj('front', or(...[20, 23, 26].map((y) => seg(s * 13.8 - 2, y, s * 13.8 + 2, y, 0.35))), tone(0x6a7078, 0.3)));
    S.tube([[s * 13, 31, 0], [s * 13.8, 18, 1]], 1.8, { sides: 10 });
    S.paint(fill(RED, { rough: 0.3 }), under(0.2));
    for (const k of [1, -1]) S.at([s * 13.8, 17.4, 1 + k * 1.2], [k * 0.4, 0, 0], () => S.box(-0.9, -4, -0.6, 0.9, 0, 0.6, { bevel: 0.4 }));
  });
  // the key in its back (the play winds it)
  S.joint('key', L(S, { pivot: [0, 24, -7], axis: 'z', min: -100, max: 100, rest: 0, idle: 0.2 }), () => {
    S.paint(fill(0xd8b04a, { rough: 0.2 }), under(0.2));
    S.tube([[0, 24, -6.8], [0, 24, -11]], 0.8, { sides: 8 });
    S.at([0, 24, -11.6], null, () => { for (const s of [1, -1]) S.extrude([[s * 0.8, -1], [s * 0.8, 1], [s * 4.6, 2.6], [s * 6, 0], [s * 4.6, -2.6]], -0.5, 0.5, { bevel: 0.25 }); });
  });
}

// ------------------------------------------------------------------ 6. Lacquer Kendama
export function kendama(S) {
  S.dens = DENS;
  const WOOD = 0xe8c48a, LACQ = 0xc8282c;
  const grain = (v) => proj(v, or(seg(-1.4, 10, -1, 40, 0.25), seg(1.2, 12, 1.6, 44, 0.25)), tone(WOOD, 0.14));
  // the ken: the base cup, the handle with its red bands, the spike
  S.paint(fill(WOOD, { rough: 0.45 }), vol(or_(band(14, 15.6), band(18, 19.6)), LACQ), grain('front'), grain('back'), under(0.12), crown(0.05), ...stamp(MAKER, { c: 0x8a6a3a }));
  S.lathe(spline([[0, 0], [5, 0], [6.8, 1.4], [7.4, 5], [7.6, 8], [6.6, 8.4], [5, 6.6], [0, 6]], 2), { segs: 22 });
  S.lathe(spline([[3.6, 6.6], [3.4, 10], [3.2, 24], [3.4, 34], [3.8, 38]], 2), { segs: 16, cap: false });
  // the cross-piece: the big cup to the left, the small cup to the right
  S.at([0, 42, 0], [0, 0, Math.PI / 2], () => {
    S.paint(fill(WOOD, { rough: 0.45 }), under(0.12), crown(0.05));
    S.lathe(spline([[4.6, -13], [5.4, -6], [5.4, 6], [4.6, 13]], 2), { segs: 16, cap: false });
    S.lathe(spline([[4.6, 13], [6.4, 16.4], [8.4, 19.6], [9.2, 21], [8.6, 21.2], [6, 19], [0, 18.6]], 2), { segs: 20 });
    S.lathe(spline([[0, -17.2], [5, -17.4], [6.6, -19.4], [7.2, -20], [7.6, -19.2], [5.8, -16], [4.6, -13]], 2), { segs: 18 });
  });
  S.paint(fill(WOOD, { rough: 0.45 }), crown(0.08));
  S.lathe(spline([[3.8, 46.4], [3.2, 48], [2.6, 52], [1.8, 55], [0.6, 56.6], [0, 57]], 2), { segs: 16 });
  // a short tail of string tied at the cross-piece
  S.paint(fill(0xf4f0e0, { rough: 0.9 }));
  S.tube(spline([[0, 41, 4.8], [1, 37, 6], [0.4, 33, 5.6], [-1, 30, 6.6]], 3), 0.35, { sides: 4 });
  // the ball, resting on the spike (the play flips it into the cups)
  S.joint('tama', { slide: [0, 0, 0], min: 0, max: 0, rest: 0 }, () => {
    S.paint(fill(LACQ, { rough: 0.15 }), vol(band(61.2, 62.8), 0xf4ead0), crown(0.12), under(0.1));
    S.lathe(spline([[1.8, 53.4], [5, 54.2], [8, 56.4], [9.6, 59.4], [10, 62], [9.6, 64.8], [8, 67.8], [5, 70.4], [0, 72]], 3), { segs: 26 });
    S.paint(fill(0x3a1a1e));
    S.lathe([[0, 56], [1.8, 53.4]], { segs: 12, cap: false });
  });
}

// ------------------------------------------------------------------ 7. Foam Dart Blaster
export function dartgun(S) {
  S.dens = DENS;
  const ORANGE = 0xff8c2e, FOAM = 0xff6f2e;
  // the body: a chunky shell with a blue racing stripe, the barrel out to the front
  S.paint(fill(ORANGE, { rough: 0.3 }), vol(band(36.4, 37.6), BLUE), proj('right', label('ZOOM-7', 4, 31, 0.34), DARK, { hard: true }), proj('left', label('ZOOM-7', -4, 31, 0.34), DARK, { hard: true }), proj('right', kana('スポンジ', 4, 27.6, 2.4), BLUE), under(0.16), crown(0.06), ...stamp(MAKER, { c: 0x8a5a2a, at: [0, -10] }));
  S.loft([[-26, 6, 7], [-24, 7.4, 8.6], [-10, 8, 9.4], [6, 7.6, 9], [12, 6.4, 7.6], [13, 5, 6]].map(([z, w, h]) => ring([0, 32, z], w, h, 16, { axis: 'z', pow: 3.2 })));
  S.paint(fill(ORANGE, { rough: 0.3 }), vol(band(33.8, 35.4), BLUE), under(0.16));
  S.at([0, 34.6, 12], [Math.PI / 2, 0, 0], () => S.lathe(spline([[3.6, 0], [3.6, 14], [4.4, 16], [4.4, 21], [3.4, 21.4]], 2), { segs: 16 }));
  S.paint(fill(DARK, { rough: 0.3 }));
  S.at([0, 34.6, 33.3], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.4, 0], 2.6, 0.4, { segs: 14 }));
  // the grip, the trigger in its guard, the priming handle on top, a sight
  S.paint(fill(BLUE, { rough: 0.35 }), proj('right', repeatV(rbox(0, 0, 3, 0.4, 0.2), 2.2, 4, 18), tone(BLUE, 0.25)), proj('left', repeatV(rbox(0, 0, 3, 0.4, 0.2), 2.2, 4, 18), tone(BLUE, 0.25)), under(0.16));
  S.loft([[0, 3.4, 5, -21], [6, 3.6, 5.6, -19.6], [14, 3.6, 5.6, -17.6], [22, 3.6, 5.4, -15.6], [25, 3.4, 5, -15]].map(([y, w, d, z]) => ring([0, y, z], w, d, 14, { pow: 2.6 })));
  S.paint(fill(DARK, { rough: 0.35 }), under(0.2));
  S.tube(spline([[0, 24, -14], [0, 18.4, -12.4], [0, 17.6, -7], [0, 19.6, -3.4], [0, 23.4, -3]], 3), 0.75, { sides: 8 });
  S.at([0, 23, -9.4], [0.5, 0, 0], () => S.box(-0.9, -4.4, -1, 0.9, 0, 1, { bevel: 0.4 }));
  S.paint(fill(YEL, { rough: 0.3 }), proj('top', repeatV(rbox(0, 0, 3, 0.35, 0), 1.4, -10, -2), tone(YEL, 0.25)), under(0.16));
  S.box(-4.2, 40, -8, 4.2, 43.6, 6, { bevel: 1.2 });
  S.paint(fill(DARK, { rough: 0.35 }));
  S.box(-1, 41, -24, 1, 45, -20, { bevel: 0.4 });
  // the loaded dart (the play fires it from here)
  S.joint('dart', { slide: [0, 0, 0], min: 0, max: 0, rest: 0 }, () => {
    S.paint(fill(FOAM, { rough: 0.85 }), proj('top', repeatV(rbox(0, 0, 3, 0.2, 0), 2.2), tone(FOAM, 0.15)));
    S.at([0, 34.6, 26], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], 1.8, 11, { segs: 12, bevel: 0.3 }));
    S.paint(fill(BLUE, { rough: 0.3 }), crown(0.1));
    S.at([0, 34.6, 37], [Math.PI / 2, 0, 0], () => S.lathe(spline([[1.8, 0], [3.4, 1.4], [3.6, 2.6], [2.8, 3.2], [0, 3]], 2), { segs: 14 }));
  });
}

// ------------------------------------------------------------------ 8. Pocket LCD Game (secret)
export function lcdgame(S) {
  S.dens = DENS;
  const SHELL = 0xd8d4c8, TRIM = 0x9a2a2a, LCDC = 0x9aa88a;
  // the shell, landscape, leaning back on its kickstand
  S.paint(fill(SHELL, { rough: 0.35 }), vol(above(43), TRIM), vol(band(41.6, 43), 0xd8b04a), proj('front', label('CAPSULE DASH', -2, 40.2, 0.3), TRIM, { hard: true }), proj('front', rbox(-2, 26.4, 18.6, 13.2, 1.4), 0x3a3a40, { near: 6 }),
    proj('front', label('GAME & TIME', -2, 11.4, 0.26), 0x6a6a70, { hard: true, near: 6 }), proj('front', or(...[0, 1, 2, 3].map((i) => rbox(22.6, 9 + i * 1.6, 2.4, 0.35, 0.2))), 0x6a6a70, { near: 6 }), proj('back', label('MADE IN JAPAN', 0, 24, 0.3), 0x8a8678, { hard: true }), under(0.16), crown(0.06), ...stamp(MAKER, { c: 0x6a6a70, at: [0, -3] }));
  S.box(-30, 5, -1, 26, 47, 6.4, { bevel: 2 });
  // the LCD window (the play lights the live screen over it)
  S.paint(fill(LCDC, { rough: 0.3 }), proj('front', or(rbox(-14, 20, 1.6, 2.6, 0), rbox(-2, 20.6, 1.6, 2, 0), rbox(8, 21, 1.6, 1.6, 0)), tone(LCDC, 0.1)));
  S.box(LCD.x0, LCD.y0, 6, LCD.x1, LCD.y1, LCD.z - 0.2);
  // the cross pad, the A and B buttons
  S.paint(fill(DARK, { rough: 0.3 }), under(0.2), crown(0.1));
  for (const [x0, y0, x1, y1] of [[-26.4, 18.6, -24.6, 24], [-28.2, 20.4, -22.8, 22.2]]) S.box(x0, y0, 6, x1, y1, 7.8, { bevel: 0.4 });
  S.paint(fill(RED, { rough: 0.2 }), proj('front', or(label('A', 22.6, 25.6, 0.22), label('B', 18, 21.6, 0.22)), 0xfbf8f0, { hard: true }), crown(0.15));
  for (const [x, y] of [[21, 22.4], [16.4, 18.6]]) S.at([x, y, 6.2], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], 1.8, 1.4, { segs: 14, bevel: 0.4 }));
  // the kickstand
  S.paint(fill(0x8a8678, { rough: 0.4 }), under(0.2));
  S.at([0, 6, -1], [-0.55, 0, 0], () => S.box(-16, -6, -1.2, 14, 0, 0, { bevel: 0.4 }));
  S.box(-24, 0, -6, 20, 5.2, 5.4, { bevel: 1.2 });
}

void head; void torso; void paw; void blade; void tint; void EYE; void ellipse; void arc; void poly; void all; void halfBelow; void halfAbove; void repeatU; void blob; void blobs; void above; void wrap;
