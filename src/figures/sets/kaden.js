// Appliance Bugs (こんちゅう家電): the household appliances of 1999, and the insects living as them. Sculpt programs in
// millimetres (src/figures/sculpt.js); the series data is src/data/series/kaden.js.
import { spline, ring } from '../sculpt.js';
import { head, blade } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, stroke, pair, all, repeatU, repeatV, label, kana, band, below, above, blob, blobs, slabZ,
} from '../paint.js';

const MAKER = 'DONDOKO';
const LEG = 0x3a3438, CHROME = 0xd0d5da;

/** An insect's leg: hip, knee, foot (three thin segments), with a little foot pad. */
function leg(S, hip, knee, foot, r = 0.9, c = LEG) {
  S.paint(fill(c, { rough: 0.4 }), crown(0.12));
  S.tube(spline([hip, knee, foot], 2), [r, r * 0.8, r * 0.55], { sides: 6 });
  S.ball(foot, r * 0.8, { segs: 6, rings: 4 });
}
/** Six legs under a body: hips at x = ±hx, along z (z0, z1, z2), feet out to ±fx on the floor. */
function sixLegs(S, hx, y, zs, fx, r, c) {
  for (const s of [1, -1]) zs.forEach((z, i) => leg(S, [s * hx, y, z], [s * (hx + (fx - hx) * 0.6), y + 3, z + (i - 1) * 2], [s * fx, 0.8, z + (i - 1) * 4.6], r, c));
}
/** A cord with a plug, from a along a few points. */
function cord(S, pts, c = 0xf3f0e8) {
  S.paint(fill(c, { rough: 0.5 }), under(0.16));
  S.tube(spline(pts, 3), 0.75, { sides: 6 });
  const e = pts[pts.length - 1];
  S.paint(fill(0xf3f0e8, { rough: 0.5 }), under(0.16));
  S.box(e[0] - 2.2, e[1] - 1.4, e[2] - 2, e[0] + 2.2, e[1] + 1.4, e[2] + 1.2, { bevel: 0.6 });
  S.paint(fill(CHROME, { rough: 0.25 }));
  for (const s of [1, -1]) S.box(e[0] + s * 1.1 - 0.25, e[1] - 0.8, e[2] - 4.6, e[0] + s * 1.1 + 0.25, e[1] + 0.8, e[2] - 2);
}

// ------------------------------------------------------------------ 1. Rice-Cooker Beetle
export function suihanki(S) {
  const BODY = 0xf6f0e2, LID = 0x8fb8a8, PRINT = 0xe8907c, PANEL = 0xe6dccb;
  const flowers = wrap(17, repeatU(or(circle(0, 10.6, 1.3), circle(-1.6, 9.6, 1), circle(1.6, 9.6, 1), circle(0, 8.6, 0.8)), 7.4), PRINT);
  S.paint(fill(BODY), vol(band(7.8, 12.6), tint(PRINT, 0.6)), flowers, wrap(17, repeatU(circle(0, 9.6, 0.55), 7.4), 0xf2d24a), vol(below(2.6), tone(BODY, 0.18)), under(0.16), ...stamp(MAKER, { c: 0x9a948a }));
  S.lathe(spline([[13.4, 0.6], [15.6, 1.6], [16.8, 5], [17, 12], [16.4, 16], [15.6, 17]], 2), { segs: 24 });
  // the front panel: two lamps for eyes, the switch for a mouth
  S.paint(fill(PANEL), proj('front', or(circle(-3.8, 1.4, 1.6), circle(3.8, 1.4, 1.6)), 0x3a3438), proj('front', circle(-3.4, 1.9, 0.5), 0xffffff), proj('front', circle(4.2, 1.9, 0.5), 0xffffff),
    proj('front', kana('炊飯', -3.8, -2.2, 2.4), 0x6a646c), proj('front', kana('保温', 3.8, -2.2, 2.4), 0x6a646c), proj('front', pair(ellipse(6.4, -0.2, 1.2, 0.7)), 0xf2b0a0, { alpha: 0.7 }), under(0.14));
  S.at([0, 10.4, 14.6], [-0.08, 0, 0], () => S.box(-8, -4.4, 0, 8, 4.4, 3, { bevel: 1.4 }));
  S.paint(fill(0xe8706c), under(0.2));
  S.box(-1.8, 3.6, 16.6, 1.8, 6.6, 18.8, { bevel: 0.7 });
  // six legs and the cord for a tail
  sixLegs(S, 12, 3.6, [8, 0, -8], 19, 0.95);
  cord(S, [[0, 4, -16.4], [0, 2.6, -21], [4, 1.4, -24], [8, 1.4, -21.6], [10, 1.4, -26]]);
  // the lid: the beetle's wing cases, a horn for the steam vent; it opens on its hinge
  S.rest = 0;
  S.joint('lid', { pivot: [0, 17.6, -15], axis: 'x', min: -1.6, max: 0, rest: 0, g: [0, -1.2] }, () => {
    S.paint(fill(LID, { rough: 0.35 }), proj('top', rbox(0, 0, 0.35, 15, 0), tone(LID, 0.3)), proj('top', or(ellipse(-6, 4, 1.4, 3, 0.3), ellipse(6, 4, 1.4, 3, -0.3)), tint(LID, 0.4)), under(0.14), crown(0.1));
    S.lathe(spline([[16.4, 16.6], [16.6, 18], [14, 21.6], [8, 23.6], [0, 24.2]], 2), { segs: 24 });
    S.paint(fill(tone(LID, 0.25), { rough: 0.35 }));
    S.lathe([[16.8, 16.4], [16.9, 17.4], [16.2, 17.6], [16.2, 16.4]], { segs: 24, cap: false });
    // the horn: the steam vent's knob, grown out
    S.paint(fill(0x4a4650, { rough: 0.3 }), crown(0.14));
    S.tube(spline([[0, 23.6, 6], [0, 27, 9.4], [0, 32.6, 9.6], [0, 35, 7.4]], 3), [2.2, 1.8, 1.2, 0.5], { sides: 8 });
    S.tube(spline([[0, 31, 9.4], [0, 32.6, 12.4], [0, 32, 13.6]], 2), [0.9, 0.6, 0.3], { sides: 6 });
    // inside the lid: the steam plate
    S.paint(fill(CHROME, { rough: 0.25 }), proj('bottom', stroke(circle(0, 0, 9), 0.5), tone(CHROME, 0.3)));
    S.cyl([0, 16.2, 0], 13.6, 0.6, { segs: 20 });
  });
  // the rice inside, with the paddle stuck in
  S.paint(fill(0xfbfaf4, { rough: 0.7 }), shade(vol(blobs(blob([-4, 17, 3], [1, 0.6, 0.8]), blob([3, 17, -2], [1, 0.6, 0.8]), blob([5, 17, 6], [1, 0.6, 0.8]))), 0.08));
  S.lathe(spline([[0, 17.6], [8, 17.2], [13.8, 16]], 2), { segs: 20, cap: false });
  S.paint(fill(0xf2ead4, { rough: 0.6 }), under(0.12));
  S.at([5, 17, -3], [0.3, 0.4, -0.3], () => { S.box(-0.4, 0, -2.6, 0.4, 7, 2.6, { bevel: 0.3 }); S.box(-0.4, 7, -1, 0.4, 13, 1, { bevel: 0.3 }); });
}

// ------------------------------------------------------------------ 2. Fan Dragonfly
export function senpuki(S) {
  const BODY = 0x6fa8d8, DARK = 0x3f6a9a, BASE = 0xf3f0e8, EYEC = 0x7fd0c4, WING = 0xd8eef0;
  // the base and its push buttons
  S.paint(fill(BASE), proj('top', stroke(ellipse(0, 0, 13, 10), 0.5), tone(BASE, 0.18)), vol(below(1.6), tone(BASE, 0.2)), under(0.16), ...stamp(MAKER, { c: 0x9a948a }));
  S.lathe(spline([[0, 0], [14.6, 0], [15.6, 1.4], [14.6, 4], [10, 5.6], [3.6, 6]], 2), { segs: 22, sz: 0.8 });
  for (const [i, c] of [[0, 0xf3f0e8], [1, 0x8fd0a0], [2, 0xf2d24a], [3, 0xe8706c]].entries()) {
    S.paint(fill(c[1], { rough: 0.4 }), proj('top', label(i === 0 ? '0' : String(i), -6.6 + i * 4.4, -10.6, 0.36), 0x3a3438, { hard: true }), under(0.2));
    S.box(-8.4 + i * 4.4, 3.2, 8.6, -4.8 + i * 4.4, 5.2 - (i === 1 ? 1 : 0), 11.8, { bevel: 0.5 });
  }
  // the stand: the dragonfly's long abdomen, in segments
  S.paint(fill(BODY, { rough: 0.35 }), vol(blobs(...[10, 14, 18, 22, 26, 30].map((y) => blob([0, y, 0], [6, 0.5, 6]))), DARK), under(0.12), crown(0.1));
  S.lathe(spline([[3.4, 5.6], [2.4, 8], [2.1, 18], [2.3, 30], [3.4, 35]], 2), { segs: 14 });
  // the head unit: thorax, two great eyes on top, a deadpan mouth
  S.paint(fill(BODY, { rough: 0.35 }), under(0.12), crown(0.1));
  S.at([0, 39.6, -1.6], null, () => S.loft(spline([[-7, 0.4, 0.4], [-5, 5.6, 5.2], [0, 7.4, 7], [5, 6.6, 6.4], [7.4, 4, 4], [8.6, 0.4, 0.4]], 2).map(([z, rx, ry]) => ring([0, 0, z], rx, ry, 16, { axis: 'z' })), { caps: 'both' }));
  S.paint(fill(BODY), ...face({ at: [0, 41.4], gap: 6.6, r: 0.01, eye: 'line', mouth: 'flat', mw: 2.6, my: 3.4, near: 2 }), under(0.12));
  for (const s of [1, -1]) {
    S.paint(fill(EYEC, { rough: 0.15 }), shade(vol(blob([s * 4, 49, -2.4], [3, 3, 3])), -0.3), proj('front', circle(s * 3.8, 47.6, 1.2), 0x2a2830), proj('front', circle(s * 3.4, 48.2, 0.45), 0xffffff), crown(0.2));
    S.ball([s * 4.2, 47, -0.6], [4.4, 4.2, 4.4], { segs: 14, rings: 8 });
  }
  // the motor hub and the blades: four wings, which spin
  S.paint(fill(CHROME, { rough: 0.25 }));
  S.at([0, 39.6, 6.6], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], 1.2, 2, { segs: 10 }));
  S.rest = 0;
  S.joint('blades', { pivot: [0, 39.6, 9], axis: 'z', min: -100, max: 100, rest: 0, g: [0, Math.PI], idle: 0 }, () => {
    S.paint(fill(BASE, { rough: 0.35 }), under(0.12), crown(0.1));
    S.at([0, 39.6, 8], [Math.PI / 2, 0, 0], () => S.lathe(spline([[0, 0], [3.2, 0.2], [3.4, 1.4], [2.4, 2.8], [0, 3.4]], 2), { segs: 14 }));
    for (let k = 0; k < 4; k++) {
      S.clear(true);
      S.paint(fill(WING, { rough: 0.2 }), proj('front', or(seg(0, 2, 0, 15, 0.3), seg(0, 8, 2.4, 13, 0.25), seg(0, 6, -2.2, 11, 0.25)), tone(WING, 0.3)));
      S.at([0, 39.6, 9.4], [0, 0, k * Math.PI / 2 + 0.4], () => S.at([0, 2.4, 0], [0, 0.25, 0], () => blade(S, 15, 6.4, 0.8, { shape: 'wing', cup: 0.6 })));
      S.clear(false);
    }
  });
}

// ------------------------------------------------------------------ 3. Iron Ladybug
export function iron(S) {
  const RED = 0xe0584a, SPOT = 0x3a3438, PLATE = 0xd8dde2, BODY = 0xf3f0e8, HANDLE = 0x4a4650;
  const sole = [[0, -15], [6.6, -11], [9.4, -2], [9.8, 6], [8.4, 11], [0, 12], [-8.4, 11], [-9.8, 6], [-9.4, -2], [-6.6, -11]];
  // the soleplate and the white lower body (the tip at the front, +z)
  S.paint(fill(PLATE, { rough: 0.25 }), proj('bottom', or(...[[0, -6], [-3, -2], [3, -2], [0, 2], [-3, 6], [3, 6]].map(([x, z]) => circle(x, z, 0.7))), tone(PLATE, 0.4)), ...stamp(MAKER, { c: 0x8a8e96, at: [0, -9] }));
  S.at([0, 0, 0], [-Math.PI / 2, 0, 0], () => S.extrude(sole.map(([x, z]) => [x, z]), 0, 1.6, { bevel: 0.4 }));
  S.paint(fill(BODY), vol(band(1.6, 2.4), tone(BODY, 0.18)), proj('right', kana('スチーム', -2, 4, 2.4), 0x6a8ab0), under(0.12));
  S.at([0, 1.6, 0], [-Math.PI / 2, 0, 0], () => S.extrude(sole.map(([x, z]) => [x * 0.98, z * 0.97]), 0, 4, { bevel: 1 }));
  // the head at the tip, with antennae
  S.paint(fill(SPOT), ...face({ at: [0, 0.2], gap: 4, r: 0.85, eye: 'dot', mouth: 'smile', mw: 1.4, my: 1.8, col: 0xf6f2ea }), proj('front', pair(circle(2.6, 1.6, 0.9)), 0xf6f2ea), under(0.12), crown(0.1));
  S.at([0, 7.6, 12.4], null, () => head(S, [0, 0, 0], [4.6, 3.6, 3.4], { muzzle: 0.1, brow: 0.2, cheek: 0.1, chin: 0.2 }));
  S.paint(fill(SPOT));
  for (const s of [1, -1]) { S.tube(spline([[s * 1.6, 10.4, 12.6], [s * 3.4, 14, 14], [s * 5.6, 14.6, 15]], 2), 0.3, { sides: 4 }); S.ball([s * 5.8, 14.6, 15.1], 0.7, { segs: 6, rings: 4 }); }
  sixLegs(S, 8, 3, [6, 0, -6], 12, 0.7);
  // the handle and the steam dial
  S.paint(fill(HANDLE, { rough: 0.4 }), under(0.12), crown(0.1));
  S.tube(spline([[0, 14, 7], [0, 19, 4], [0, 20.4, -2], [0, 19, -8], [0, 12, -10.6]], 3), [1.8, 2.1, 2.1, 2, 1.8], { sides: 10 });
  S.paint(fill(0xf2d24a, { rough: 0.4 }), proj('top', seg(0, 0, 0, 2.4, 0.5), 0x3a3438));
  S.cyl([0, 20.6, -2], 2.4, 1.4, { segs: 12 });
  cord(S, [[0, 6, -12.4], [0, 5, -17], [-4, 3.6, -20], [-1, 1.4, -24], [3, 1.4, -27]], 0x8aa0c0);
  // the wing cases: the iron's top, in two halves that open
  S.rest = 0;
  const shell = (s) => {
    S.paint(fill(RED, { rough: 0.3 }), vol(blobs(blob([s * 4.6, 11, 4], [2, 2, 2]), blob([s * 6.4, 8, -4], [1.8, 2, 1.8]), blob([s * 2.6, 13, -6], [1.6, 1.6, 1.6])), SPOT), proj('top', rbox(s * 0.2, 0, 0.3, 14, 0), tone(RED, 0.3)), under(0.14), crown(0.12));
    S.lathe(spline([[1, 5.6], [0.97, 8.4], [0.8, 11.6], [0.5, 13.6], [0, 14.6]], 2).map(([k, y]) => [k * 10, y]), { segs: 12, sz: 1.42, arc: s > 0 ? [-Math.PI / 2, Math.PI / 2] : [Math.PI / 2, Math.PI * 1.5], at: [0, 0, -1.6] });
  };
  for (const s of [1, -1]) S.joint(s > 0 ? 'caseR' : 'caseL', { pivot: [0, 14.4, 0], axis: 'z', min: -0.8, max: 0.8, rest: 0, g: [0, s * 0.55] }, () => {
    shell(s);
    S.clear(true);
    S.paint(fill(0xe6f0f0, { rough: 0.2 }), proj('top', or(seg(s * 2, 4, s * 8, -8, 0.3), seg(s * 3, -2, s * 7, 6, 0.25)), 0xb8c8cc));
    S.at([s * 3, 12.6, -4], [0, 0, 0], () => S.ball([0, 0, 0], [5.4, 0.4, 9.4], { segs: 10, rings: 3 }));
    S.clear(false);
  });
}

// ------------------------------------------------------------------ 4. Toaster Pillbug
export function toaster(S) {
  const BODY = 0x9cb4c8, LINE = 0x6a7e96, TOAST = 0xe8b876, CRUST = 0xb0703e, FACE = 0x5a6a80;
  // the body: rounded, banded like a pill bug's armour
  const plates = vol(blobs(...[-12, -6, 0, 6, 12].map((z) => blob([0, 10, z], [30, 30, 0.45]))), LINE);
  S.paint(fill(BODY, { rough: 0.3 }), plates, vol(below(3), tone(BODY, 0.2)), under(0.14), crown(0.12), ...stamp(MAKER, { c: LINE }));
  S.loft(spline([[-16, 0.5, 0.5], [-15, 0.92, 0.9], [-9, 1, 1], [9, 1, 1], [15, 0.92, 0.9], [16, 0.5, 0.5]], 2).map(([z, kx, ky]) => ring([0, 10.4 * ky, z], 11 * kx, 10.4 * ky, 18, { pow: 3.2, axis: 'z' }).map((p) => [p[0], Math.max(0.3, p[1]), p[2]])), { caps: 'both' });
  // the slots
  S.paint(fill(0x3a3438));
  for (const x of [-4, 4]) S.box(x - 1.4, 20, -9.6, x + 1.4, 21.2, 9.6, { bevel: 0.4 });
  // the lever and the dial on the side, many small legs underneath
  S.paint(fill(0x3a3438, { rough: 0.4 }));
  S.box(10.4, 11, 2, 12.6, 13, 6, { bevel: 0.5 });
  S.paint(fill(0xf2d24a), proj('right', seg(0, 7, 0, 9, 0.5), 0x3a3438));
  S.at([11, 7, -4], [0, 0, -Math.PI / 2], () => S.cyl([0, 0, 0], 2.2, 1.6, { segs: 12 }));
  for (const s of [1, -1]) for (let k = 0; k < 6; k++) leg(S, [s * 8, 2.4, -12 + k * 4.8], [s * 10, 1.6, -12 + k * 4.8], [s * 10.6, 0.5, -11.4 + k * 4.8], 0.6, 0x5a6a80);
  // the head at the front end, its antennae, a crumb
  S.paint(fill(FACE), ...face({ at: [0, 0.6], gap: 5, r: 0.95, eye: 'sleepy', mouth: 'flat', mw: 1.6, my: 2.6, col: 0xf6f2ea }), under(0.14), crown(0.1));
  S.at([0, 8.4, 16.6], null, () => head(S, [0, 0, 0], [6.4, 5, 3.6], { muzzle: 0.1, brow: 0.3, cheek: 0.16, chin: 0.2, pow: 2.6 }));
  S.paint(fill(FACE));
  for (const s of [1, -1]) S.tube(spline([[s * 2.4, 12, 18.6], [s * 5, 15.6, 21], [s * 8.6, 15, 22.6], [s * 10, 12.4, 23]], 3), [0.5, 0.4, 0.3, 0.2], { sides: 4 });
  S.paint(fill(CRUST), under(0.2));
  S.box(4, 0, 20, 6, 1, 21.4, { bevel: 0.3 });
  // the toast: two slices, they pop up
  S.rest = 0;
  S.joint('toast', { slide: [0, 9, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    for (const x of [-4, 4]) {
      S.paint(fill(TOAST, { rough: 0.8 }), proj('right', or(...[[-4, 22], [2, 25], [5, 20]].map(([u, v]) => ellipse(u, v, 1.4, 0.8))), tone(TOAST, 0.2)), proj('left', or(...[[-4, 22], [2, 25], [5, 20]].map(([u, v]) => ellipse(u, v, 1.4, 0.8))), tone(TOAST, 0.2)),
        vol(above(26.6), CRUST), proj('right', stroke(rbox(0, 21, 8.6, 6.4, 2.4), 0.8, 0.4), CRUST), proj('left', stroke(rbox(0, 21, 8.6, 6.4, 2.4), 0.8, 0.4), CRUST));
      S.at([x, 21, 0], [0, Math.PI / 2, 0], () => S.extrude([[-8.6, -6.4], [8.6, -6.4], [8.6, 4], [7, 6.4], [3.6, 7.4], [-3.6, 7.4], [-7, 6.4], [-8.6, 4]], -1.1, 1.1, { bevel: 0.4 }));
    }
  });
}

// ------------------------------------------------------------------ 5. TV Stag Beetle (ultra)
export function terebi(S) {
  const WOOD = 0x9a6a46, DARK = 0x5a3a28, SCREEN = 0x9fc8c4, GLOW = 0xd8f2ea, PANEL = 0xd9cfbc;
  // the cabinet: walnut, on six legs
  S.paint(fill(WOOD, { rough: 0.55 }), proj('right', repeatV(rbox(0, 0, 40, 0.18, 0), 1.4), tone(WOOD, 0.1)), proj('left', repeatV(rbox(0, 0, 40, 0.18, 0), 1.4), tone(WOOD, 0.1)), proj('top', repeatU(rbox(0, 0, 0.18, 40, 0), 1.6), tone(WOOD, 0.1)), under(0.18), crown(0.06), ...stamp(MAKER, { c: DARK }));
  S.box(-19, 8, -13, 19, 36, 13, { bevel: 2.4 });
  for (const s of [1, -1]) [9, 0, -9].forEach((z, i) => leg(S, [s * 14, 8.6, z], [s * 19, 6, z + (i - 1) * 2], [s * 22, 0.8, z + (i - 1) * 5], 1, DARK));
  // the screen, with what is on tonight: the beetle's own face
  S.paint(fill(PANEL), under(0.12));
  S.box(-17.4, 10, 12.4, 17.4, 34.4, 13.6, { bevel: 0.8 });
  S.paint(fill(SCREEN, { rough: 0.15 }), proj('front', repeatV(rbox(0, 0, 20, 0.14, 0), 0.7), tint(SCREEN, 0.18)), proj('front', pair(rbox(4, 2.4, 1.4, 2, 0.6)), 0x2e3a40), proj('front', rbox(0, -3.8, 3.2, 0.5, 0.2), 0x2e3a40),
    proj('front', pair(rbox(4.4, 3.2, 0.45, 0.6, 0.1)), GLOW), proj('front', ellipse(-6, 6.8, 3, 1.6, -0.3), tint(SCREEN, 0.4), { alpha: 0.7 }));
  S.at([-3.6, 22.2, 13.4], null, () => S.ball([0, 0, 0], [11.4, 10, 1.6], { segs: 20, rings: 6, v0: 0 }));
  S.paint(fill(DARK, { rough: 0.5 }));
  S.at([-3.6, 22.2, 13.2], null, () => S.torus([0, 0, 0], 11.4, 0.6, { segs: 20, sides: 4 }));
  // the knobs: channel and volume
  for (const [y, c] of [[29, 0xe8e2d4], [21, 0xe8e2d4]]) {
    S.paint(fill(c), proj('front', seg(13.4, y, 13.4, y + 2, 0.5), 0x3a3438), under(0.18));
    S.at([13.4, y, 13.4], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], 2.2, 2.4, { segs: 12, bevel: 0.6 }));
  }
  S.paint(fill(0x3a3438), proj('front', or(...[0, 1, 2].map((k) => rbox(13.4, 13.6 + k * 1.4, 2.4, 0.3, 0))), 0x6a646c));
  S.box(11, 12, 13.4, 15.8, 17, 13.8);
  S.paint(fill(0xe8706c));
  S.ball([13.4, 33, 13.8], 0.6, { segs: 6, rings: 4 });
  // the head on top: the antenna's base, and its mandibles, the rabbit ears; they open and close
  S.paint(fill(DARK, { rough: 0.4 }), ...face({ at: [0, 0.6], gap: 6, r: 0.9, eye: 'bead', mouth: null }), under(0.14), crown(0.12));
  S.at([0, 38.4, 4], null, () => head(S, [0, 0, 0], [8.4, 3.6, 6.6], { muzzle: 0.2, brow: 0.4, cheek: 0.1, chin: 0.1, pow: 2.8 }));
  S.rest = 0;
  for (const s of [1, -1]) S.joint(s > 0 ? 'mandR' : 'mandL', { pivot: [s * 3, 40, 7], axis: 'y', min: -0.5, max: 0.5, rest: 0, g: [0, -s * 0.35] }, () => {
    S.paint(fill(CHROME, { rough: 0.2 }));
    S.tube(spline([[s * 3, 40, 7], [s * 7, 46, 12], [s * 9.4, 54, 14], [s * 7.4, 62, 13], [s * 3.4, 64.6, 11]], 4), [1.1, 0.9, 0.8, 0.6, 0.45], { sides: 8 });
    S.tube(spline([[s * 8.6, 50, 13.4], [s * 6, 52, 14.4], [s * 5.2, 53.4, 14.4]], 2), [0.5, 0.3], { sides: 5 });
    S.ball([s * 3.2, 64.8, 10.8], 1.1, { segs: 8, rings: 5 });
  });
  for (const s of [1, -1]) leg(S, [s * 3, 40.4, 0], [s * 6, 44, -2], [s * 8.4, 44.6, -4], 0.4, LEG);
}

// ------------------------------------------------------------------ 6. Heater Firefly (secret)
export function heater(S) {
  const BODY = 0xe8e2d0, TOP = 0x3a3438, GLOW = 0xf2903a, GLOW2 = 0xffd27a, BUG = 0x302c34;
  // a round convection heater; its window is lit
  S.paint(fill(BODY, { rough: 0.45 }), vol(below(3.4), tone(BODY, 0.25)), wrap(13, label('KEROSENE', 0, 6.6, 0.36), 0x8a8478, { hard: true }), under(0.14), ...stamp(MAKER, { c: 0x8a8478 }));
  S.lathe(spline([[12.6, 0], [13.4, 1.4], [13.4, 30], [12.6, 31.4]], 2), { segs: 28 });
  S.paint(fill(GLOW, { rough: 0.6 }), proj('front', or(...[0, 1, 2, 3].map((k) => rbox(0, 13 + k * 3.4, 6, 0.4, 0))), GLOW2), proj('front', ellipse(0, 18, 3.4, 4.4), 0xfff0b8));
  S.lathe([[13.5, 11], [13.6, 25.4]], { segs: 28, arc: [Math.PI / 2 - 0.5, Math.PI / 2 + 0.5], cap: false });
  S.paint(fill(TOP, { rough: 0.4 }));
  for (let k = 0; k < 5; k++) S.lathe([[13.7, 12 + k * 3.4], [13.7, 12.6 + k * 3.4]], { segs: 28, arc: [Math.PI / 2 - 0.52, Math.PI / 2 + 0.52], cap: false });
  // the door over the window: it swings open on its side hinge
  S.rest = 0;
  S.joint('door', { pivot: [Math.cos(Math.PI / 2 + 0.56) * 14.1, 18, Math.sin(Math.PI / 2 + 0.56) * 14.1], axis: 'y', min: -1.8, max: 0, rest: 0, g: [0, -1.4] }, () => {
    S.paint(fill(CHROME, { rough: 0.25 }), crown(0.1));
    S.lathe([[13.9, 10.4], [14.3, 10.6], [14.3, 25.8], [13.9, 26]], { segs: 28, arc: [Math.PI / 2 - 0.56, Math.PI / 2 + 0.56], cap: false });
    S.paint(fill(CHROME, { rough: 0.25 }));
    for (let k = 0; k < 7; k++) { const a = Math.PI / 2 - 0.5 + k * (1 / 6); S.tube([[Math.cos(a) * 14.2, 11, Math.sin(a) * 14.2], [Math.cos(a) * 14.2, 25.4, Math.sin(a) * 14.2]], 0.3, { sides: 4 }); }
    S.paint(fill(TOP));
    S.at([Math.cos(Math.PI / 2 - 0.42) * 14.8, 18, Math.sin(Math.PI / 2 - 0.42) * 14.8], null, () => S.ball([0, 0, 0], [0.9, 2, 0.9], { segs: 6, rings: 4 }));
  });
  // the top: the firefly's wing cases over the grille, the lamp of its tail is the window below
  S.paint(fill(TOP, { rough: 0.4 }), proj('top', or(...[0, 1, 2, 3, 4, 5].map((k) => stroke(circle(0, 0, 3 + k * 1.8), 0.5))), 0x5a5460), proj('top', rbox(0, 0, 0.4, 13, 0), 0x5a5460));
  S.lathe(spline([[13, 31], [13.2, 32.4], [11, 34], [0, 34.4]], 2), { segs: 28 });
  S.paint(fill(BUG), proj('top', rbox(0, 0, 0.3, 12, 0), tint(BUG, 0.24)), vol(blob([0, 35, 10], [12, 4, 3]), 0xd8604e), crown(0.12), under(0.1));
  S.at([0, 34.6, -1], [0, 0, 0], () => S.ball([0, 0, 0], [10.4, 3.4, 12], { segs: 18, rings: 6, v0: 0.5 }));
  // the head at the front of the lid, with its antennae; the carry handle over it all
  S.paint(fill(BUG), ...face({ at: [0, 0.6], gap: 4.6, r: 0.9, eye: 'sleepy', mouth: null, col: 0xf2ece0 }), under(0.12));
  S.at([0, 36.6, 10.6], null, () => head(S, [0, 0, 0], [4.4, 3.4, 3.4], { muzzle: 0.1, brow: 0.2 }));
  S.paint(fill(BUG));
  for (const s of [1, -1]) S.tube(spline([[s * 1.4, 39.4, 11.6], [s * 3, 42.6, 14], [s * 4.6, 43.2, 16.4]], 2), [0.4, 0.3, 0.2], { sides: 4 });
  S.paint(fill(CHROME, { rough: 0.25 }));
  S.tube(spline([[-13.4, 30, 0], [-12, 38.6, 0], [0, 41.6, 0], [12, 38.6, 0], [13.4, 30, 0]], 3), 0.6, { sides: 6 });
}

void star; void arc; void all; void repeatU; void slabZ; void EYE; void poly; void tone; void ellipse; void kana;
