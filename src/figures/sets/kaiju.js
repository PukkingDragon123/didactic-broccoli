// Kaiju Snack Attack: baby soft-vinyl monsters on a sugar rampage. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/kaiju.js. The family look: one chubby sofubi baby (a pear
// of a body on its haunches, stubby three-toed feet, a tail that props it up, a row of back plates, a big round head
// with ear fins and a gummy grin), sprayed darker down the back the way soft vinyl is, each with its snack.
import { spline, ring, swell } from '../sculpt.js';
import { head, torso, paw, blade } from '../anatomy.js';
import {
  fill, proj, vol, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, halfBelow, halfAbove, repeatU, repeatV, label, kana,
  below, above, band, blob, blobs, slabX, slabZ,
} from '../paint.js';
import { L } from './showa.js';

const DENS = 0.72; // texel density (the series atlas holds every figure, full and light versions)
const MAKER = 'GAOGAO-YA';
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
/** Euler angles (the at() frame) that point local +z along d, rolled about it. */
export const aim = (d, roll = 0) => { const l = Math.hypot(d[0], d[1], d[2]); return [-Math.asin(d[1] / l), Math.atan2(d[0], d[2]), roll]; };
/** A three-clawed hand at `at`, fingers along dir. */
function hand(S, at, dir, roll = 0, w = 4.6) { S.at(at, aim(dir, roll), () => paw(S, [0, -w * 0.3, w * 0.32], w, w * 1.05, w * 0.6, { toes: 3 })); }
/** An arm: shoulder, elbow, wrist (a smooth tube), then the hand. */
function arm(S, sh, el, wr, roll = 0, r = 2.7) { S.tube(spline([sh, el, wr], 3), (t) => r - 0.5 * t, { sides: 9 }); hand(S, wr, sub3(wr, el), roll, r * 1.75); }
const or_ = (...fs) => { const f = (x, y, z) => Math.min(...fs.map((g) => g(x, y, z))); f.ys = fs.flatMap((g) => g.ys || []); return f; };

/** The baby kaiju's body (head excluded). C: { body, belly, plate, spray, claw, rough }. o.feet: which feet ([1, -1]). */
function kaijuBody(S, C, o = {}) {
  const R = { rough: C.rough ?? 0.5 }, belly = and(ellipse(0, 11, 6.4, 9.4), repeatV(rbox(0, 0, 8, 0.24, 0), 2.7, 3.4, 19.4));
  S.paint(
    fill(C.body, R), vol(blob([0, 11, 8], [7, 10.4, 5]), C.belly), proj('front', belly, tone(C.belly, 0.22), { near: 4 }), vol(blob([0, 18, -10], [11, 13, 5.4]), C.spray),
    ...(C.extra || []), under(0.16), crown(0.05), ...stamp(MAKER, { c: tone(C.body, 0.45) }),
  );
  torso(S, [0, 13, 0], [10.4, 13, 9.2], { belly: 0.26, hips: 1.16, sit: 0.42 });
  for (const s of o.feet || [1, -1]) {
    S.paint(fill(C.body, R), vol(blob([0, 18, -10], [11, 13, 5.4]), C.spray), under(0.14));
    S.ball([s * 7.4, 5.6, 1], [4.6, 5.4, 6], { segs: 12, rings: 7 });
    S.paint(fill(C.body, R), proj('top', or(...[-1, 0, 1].map((k) => ellipse(s * 6.2 + k * 2, -10.9, 0.95, 0.8))), C.claw), under(0.14));
    paw(S, [s * 6.2, 0, 6.4], 6.6, 8, 3.8, { toes: 3 });
  }
  S.paint(fill(C.body, R), vol(blobs(blob([0, 6, -14], [6, 5, 7])), C.spray), under(0.16));
  S.tube(spline(o.tail || [[0, 7, -5], [0, 4.6, -12], [3, 2.8, -18.6], [8.4, 2.2, -21], [13, 2.4, -19]], 3), (t) => 5.6 * (1 - t) + 0.9, { sides: 12 });
  S.paint(fill(C.plate, { rough: 0.45 }), under(0.12));
  for (const [x, y, z, a, l, r] of [[0, 24.4, -6.4, -0.55, 4.6, 0], [0, 19, -8.8, -0.95, 5.4, 0], [0, 13, -9.6, -1.25, 5.4, 0], [0, 7.6, -9.6, -1.5, 4.8, 0], [1.2, 4.4, -15, -1.6, 3.8, 0.3], [5.6, 3.2, -19.6, -1.65, 3, 1]]) S.at([x, y, z], [a, r, 0], () => blade(S, l, l * 0.92, 1.8, { shape: 'ear' }));
}
/** The head, centred on the frame (faces +z). o: eye, mouth ('grin' | 'chomp' | 'o' | 'gnash'), horn (colour). */
function kaijuHead(S, C, o = {}) {
  const R = { rough: C.rough ?? 0.5 }, N = { near: 3 }, M = [];
  const m = o.mouth ?? 'grin';
  if (m === 'grin') M.push(proj('front', and(ellipse(0, -3.4, 3.9, 2.7), halfBelow(-2.8)), 0x7a2a36, N), proj('front', ellipse(0, -5, 2, 0.9), 0xf08a9a, N), proj('front', or(poly([[-3.1, -2.8], [-1.9, -2.8], [-2.5, -4.2]]), poly([[3.1, -2.8], [1.9, -2.8], [2.5, -4.2]])), 0xfbf8ee, N));
  if (m === 'chomp') M.push(proj('front', or(arc(-1.4, -2.6, 1.6, Math.PI * 1.1, Math.PI * 1.9, 0.5), arc(1.4, -2.6, 1.6, Math.PI * 1.1, Math.PI * 1.9, 0.5)), tone(C.body, 0.5), N), proj('front', poly([[1.5, -4.1], [2.5, -4.1], [2, -2.9]]), 0xfbf8ee, N));
  if (m === 'o') M.push(proj('front', ellipse(0, -3.8, 1.8, 2.1), 0x7a2a36, N), proj('front', ellipse(0, -4.6, 1.1, 0.9), 0xf08a9a, N));
  if (m === 'gnash') M.push(proj('front', rbox(0, -3.6, 4, 1.6, 0.6), 0x3a3440, N), proj('front', and(rbox(0, -3.6, 3.6, 1.2, 0), or(repeatU(rbox(0, 0, 0.4, 3, 0), 1.2))), 0xe8ecf0, N));
  S.paint(
    fill(C.body, R), vol(blob([0, -4, 8], [6, 3.4, 4]), C.belly), ...(m === 'gnash' ? [] : face({ at: [0, 2], gap: 9.6, r: 2.3, eye: o.eye || 'dot', mouth: null, blush: C.blush ?? 0xf49aa8, near: 3 })), ...(o.paint || []),
    ...M, proj('front', pair(ellipse(1.3, -0.9, 0.45, 0.3)), tone(C.body, 0.45), N), under(0.14), crown(0.06),
  );
  head(S, [0, 0, 0], [9.8, 8.6, 9.2], { muzzle: 0.6, brow: 0.45, cheek: 0.24, chin: 0.25 });
  for (const s of [1, -1]) { S.paint(fill(C.plate, { rough: 0.45 }), proj('front', ellipse(0, 2.6, 1.3, 1.8), tone(C.plate, 0.18)), under(0.1)); S.at([s * 8.4, 2, -3.2], [0, s * 0.3, -s * 1.2], () => blade(S, 5, 5.4, 1.4, { shape: 'round', cup: 0.6 })); }
  S.paint(fill(C.plate, { rough: 0.45 }), under(0.12));
  for (const [y, z, a, l] of [[6.6, -6.2, -0.75, 4.2], [2.2, -9.4, -1.25, 3.6]]) S.at([0, y, z], [a, 0, 0], () => blade(S, l, l * 0.92, 1.8, { shape: 'ear' }));
  S.paint(fill(o.horn ?? C.plate, { rough: 0.4 }), under(0.12), crown(0.1));
  S.at([0, 7.8, -0.6], [-0.15, 0, 0], () => blade(S, 5.2, 4.6, 2.4, { shape: 'ear' }));
}
const SCALE = 1.36; // the babies are sculpted at 1:1.36 of these numbers (a 6 cm figure)

// ------------------------------------------------------------------ props
/** A taiyaki along x (head at +x), centred on the frame, upright. */
function taiyaki(S) {
  const GOLD = 0xdc9c4c, CRUST = 0xae6a2e;
  const scales = (k) => or(...[[-2, 0], [0.4, 1.6], [0.4, -1.6], [2.8, 0], [-4.2, 1.4], [-4.2, -1.4]].map(([x, y]) => arc(x * k, y, 1.6, k > 0 ? -1.1 : Math.PI - 1.1 + 2.2 - 2.2, k > 0 ? 1.1 : Math.PI + 1.1, 0.35)));
  const eye = (k) => or(stroke(circle(5.6 * k, 1.4, 0.8), 0.35), arc(3.6 * k, 0, 2.6, k > 0 ? -1 : Math.PI - 1, k > 0 ? 1 : Math.PI + 1, 0.35));
  S.paint(fill(GOLD, { rough: 0.62 }), proj('front', or(scales(1), eye(1)), CRUST), proj('back', or(scales(-1), eye(-1)), CRUST), vol(slabZ(-0.35, 0.35), CRUST), crown(0.08), under(0.16));
  S.loft([[-7, 1.4, 0.7], [-5.6, 2.8, 1.5], [-2.6, 4.2, 2], [1.4, 4.6, 2.1], [5, 4, 2], [7.4, 2.6, 1.6], [8.6, 0.8, 0.7]].map(([x, h, t]) => ring([x, 0, 0], t, h, 12, { axis: 'x', pow: 2.3 })));
  for (const s of [1, -1]) S.extrude([[-6.4, 0], [-6.6, s * 1.4], [-11.2, s * 4.4], [-11.8, s * 1.8], [-10.6, 0]].map(([x, y]) => [x, y]), -0.9, 0.9, { bevel: 0.4 });
}
/** A ring doughnut lying flat, frosted on top, sprinkles placed by hand. */
function donut(S, c, R = 5, r = 2.4) {
  const sprinkles = or(...[[0.3, 0], [1.2, 1], [2.3, 0], [3.1, 1], [4, 0], [5.1, 1], [5.9, 0]].map(([a, k]) => rbox(Math.cos(a) * R, -Math.sin(a) * R, 0.75, 0.22, 0.2, a + k)));
  S.paint(fill(0xd9a05a, { rough: 0.7 }), vol(above(c[1] + 0.6), 0xf4a6c4), proj('top', sprinkles, 0xfbf6e8), proj('top', or(...[[0.8, 0], [2.7, 1], [4.6, 0]].map(([a, k]) => rbox(Math.cos(a) * (R + 0.6), -Math.sin(a) * (R + 0.6), 0.7, 0.22, 0.2, a - k))), 0x6ac4e8), under(0.12));
  S.torus(c, R, r, { segs: 16, sides: 10 });
}

// ------------------------------------------------------------------ 1. Gao-chan & Taiyaki
export function taiyaki_(S) {
  S.dens = DENS;
  const C = { body: 0x7cc65a, belly: 0xf4eba4, plate: 0xf2de6e, spray: 0x5aa246, claw: 0xfbf6e0 };
  S.at([0, 0, 0], null, () => {
    kaijuBody(S, C);
    S.paint(fill(C.body, { rough: 0.5 }), under(0.14));
    arm(S, [8.4, 20.4, 3], [11.2, 18.4, 8.4], [7.4, 23.4, 12.2], 1.6);
    arm(S, [-8.4, 20.4, 3], [-10, 18.6, 9], [-5.2, 22.8, 12.8], -1.6);
    S.joint('head', L(S, { pivot: [0, 24, 1], axis: 'x', min: -0.3, max: 0.3, rest: 0, g: [0, 0.16], idle: 0.04 }), () => {
      S.at([0, 31, 1.6], null, () => kaijuHead(S, C, { mouth: 'chomp' }));
      S.at([4.2, 26.2, 12.8], [0, -0.35, 0.18], () => taiyaki(S));
    });
  }, SCALE);
}

// ------------------------------------------------------------------ 2. Hanami Dango Kaiju
export function dango(S) {
  S.dens = DENS;
  const C = { body: 0xf4a2bc, belly: 0xfbeee2, plate: 0xfbf2f4, spray: 0xe07c9c, claw: 0xfbf6e0 };
  S.at([0, 0, 0], null, () => {
    kaijuBody(S, C);
    S.paint(fill(C.body, { rough: 0.5 }), under(0.14));
    arm(S, [-8.4, 20.4, 3], [-11.6, 16.6, 5.4], [-9.4, 13.6, 9.2], 0.6);
    S.joint('arm', L(S, { pivot: [8.4, 20.4, 3], axis: 'z', min: -0.2, max: 0.9, rest: 0, g: [0, 0.62] }), () => {
      S.paint(fill(C.body, { rough: 0.5 }), under(0.14));
      arm(S, [8.4, 20.4, 3], [12.6, 23.6, 5.6], [12.6, 29.4, 8], -1.4);
      // the skewer: green, white, pink from the bottom (pink is the leader)
      S.paint(fill(0xe6cf98, { rough: 0.75 }));
      S.tube([[12.6, 25, 9.2], [12.6, 50.4, 9.2]], 0.55, { sides: 6 });
      for (const [y, c, e] of [[36.2, 0xa8d08a, 'sleepy'], [41.2, 0xfbf8f0, 'dot'], [46.2, 0xf6b6c8, 'closed']]) {
        S.paint(fill(c, { rough: 0.55 }), ...face({ at: [12.6, y + 0.4], gap: 2.6, r: 0.55, eye: e, mouth: e === 'dot' ? 'smile' : null, mw: 1, my: 1.4, near: 10 }), under(0.12), crown(0.05));
        S.lathe(spline([[0, -2.5], [1.9, -2.3], [2.7, -1], [2.8, 0.4], [2.2, 1.9], [0, 2.6]], 2), { segs: 14, at: [12.6, y, 9.2] });
      }
    });
    S.joint('head', L(S, { pivot: [0, 24, 1], axis: 'x', min: -0.3, max: 0.3, rest: 0, idle: 0.04 }), () => S.at([0, 31, 1.6], [-0.12, 0.25, 0], () => {
      kaijuHead(S, C, { mouth: 'grin', horn: 0xf6c6d4 });
      // a blossom it has not noticed, caught on its head
      S.paint(fill(0xfbe2ea, { rough: 0.5 }), proj('front', seg(0, 0.4, 0, 2.6, 0.5), 0xf2a6bc), under(0.1));
      for (let k = 0; k < 5; k++) S.at([-4.2, 7.6, 2.4], [-0.5, 0, k * 1.2566], () => S.at([0, 0, 0], [0.25, 0, 0], () => blade(S, 3.4, 3, 0.7, { shape: 'round', cup: 0.6 })));
      S.paint(fill(0xf2c84a));
      S.ball([-4.2, 7.9, 2.6], [0.9, 0.6, 0.9], { segs: 6, rings: 4 });
    }));
  }, SCALE);
}

// ------------------------------------------------------------------ 3. Ramune Gulp Kaiju
export function ramune(S) {
  S.dens = DENS;
  const C = { body: 0x62b6ec, belly: 0xeaf6fb, plate: 0xbfe4fa, spray: 0x3a8ec8, claw: 0xfbf6e0 };
  S.at([0, 0, 0], null, () => {
    kaijuBody(S, C);
    S.joint('head', L(S, { pivot: [0, 24, 1], axis: 'x', min: -0.4, max: 0.3, rest: 0, g: [0, -0.22], idle: 0.04 }), () => S.at([0, 31, 1.6], [0.12, 0, 0], () => kaijuHead(S, C, { mouth: 'o', eye: 'stare' })));
    // both hands up, the bottle tipped to look down its neck at the marble
    S.joint('arms', L(S, { pivot: [0, 20.4, 3], axis: 'x', min: -0.6, max: 0.3, rest: 0, g: [0, -0.4] }), () => {
      S.paint(fill(C.body, { rough: 0.5 }), under(0.14));
      arm(S, [8.4, 20.4, 3], [11.4, 17.8, 8.6], [6.2, 19.4, 13.4], 1.4);
      arm(S, [-8.4, 20.4, 3], [-11.4, 17.8, 8.6], [-6.2, 19.4, 13.4], -1.4);
      S.at([0, 15.2, 14.4], [0.5, 0, 0], () => {
        S.clear(true);
        S.paint(fill(0xc8ecec, { rough: 0.08 }));
        S.lathe(spline([[0, 0], [3.4, 0], [3.9, 0.7], [3.9, 7.6], [3.5, 9.4], [2.3, 10.8], [1.7, 12], [2.3, 13.2], [1.6, 14.4], [1.3, 16.2], [1.55, 16.8], [0, 16.9]], 2), { segs: 16 });
        S.clear(false);
        S.paint(fill(0x9fd8e4, { rough: 0.08 }));
        S.ball([0, 12.8, 0], 1.45, { segs: 10, rings: 6 });
        S.paint(fill(0x2f7ad8, { rough: 0.4 }), under(0.1));
        S.cyl([0, 16.4, 0], [1.75, 1.65], 1.4, { segs: 12 });
        S.paint(fill(0xfbf8f0, { rough: 0.8 }), proj('front', kana('ラムネ', 0, 4.6, 2.2), 0x2f7ad8), proj('front', label('SODA', 0, 2.2, 0.26), 0x2f7ad8, { hard: true }));
        S.lathe([[4.02, 1.2], [4.02, 6.8]], { segs: 16, arc: [Math.PI / 2 - 0.9, Math.PI / 2 + 0.9], cap: false });
      });
    });
  }, SCALE);
}

// ------------------------------------------------------------------ 4. Purin Funjatta!
export function purin(S) {
  S.dens = DENS;
  const C = { body: 0xb9a2e8, belly: 0xf6eefc, plate: 0xf6d870, spray: 0x8e74c8, claw: 0xfbf6e0 };
  const CUSTARD = 0xf6d468, CARAMEL = 0x8a4a1e;
  // the plate and the giant purin, squashed by the gimmick
  S.paint(fill(0xfbfaf6, { rough: 0.35 }), proj('top', stroke(circle(16, -4, 13.4), 0.8, 0.6), 0x4a86c8), proj('top', stroke(circle(16, -4, 9.6), 0.3), 0xa8c4e4), under(0.16), ...stamp(MAKER, { c: 0x8a8a9a, at: [16, 4] }));
  S.with({ dens: 0.6 }, () => S.lathe(spline([[0, 0], [9, 0], [12.6, 1.2], [15, 2.4], [14.4, 2.8], [10, 1.8], [0, 1.6]], 2), { segs: 24, at: [16, 0, 4] }));
  S.part('purin', { rest: 0, move: (t) => swell([16, 1.6, 4], 1 + 0.1 * t, 1 - 0.16 * t, 1 + 0.1 * t) }, () => {
    const drips = or(...[[-6, 2.2], [-2.4, 3.2], [1.6, 2], [5.2, 2.8], [8, 1.8]].map(([x, l]) => rbox(x, 17.6 - l / 2, 0.8, l / 2 + 0.4, 0.8)));
    S.paint(fill(CUSTARD, { rough: 0.3 }), vol(above(15.4), CARAMEL, { rough: 0.15 }), proj('front', drips, CARAMEL, { rough: 0.15 }), under(0.12), crown(0.05));
    S.lathe(spline([[0, 1.6], [10.4, 1.6], [10.8, 2.4], [9.6, 9], [8, 15], [7.4, 17.6], [6.2, 18.2], [0, 18.2]], 2), { segs: 24, at: [16, 0, 4] });
    S.paint(fill(0xfbf8f0, { rough: 0.5 }), under(0.1));
    S.lathe(spline([[0, 18], [3.6, 18], [3.4, 19.6], [2.4, 21], [1.2, 22.4], [0, 23.4]], 2), { segs: 12, at: [17.4, 0, 6] });
    S.paint(fill(0xd8283a, { rough: 0.25 }), crown(0.15));
    S.ball([17.4, 24.8, 6], [1.9, 1.7, 1.9], { segs: 10, rings: 6 });
    S.paint(fill(0x5a8a3a));
    S.tube(spline([[17.4, 26.2, 6], [17.8, 28.6, 5.4], [19.4, 30, 4.6]], 2), 0.3, { sides: 4 });
  });
  // the monster, one foot up on it, very pleased
  S.at([-6, 0, 0], [0, 0.3, -0.06], () => {
    kaijuBody(S, C, { feet: [-1] });
    S.paint(fill(C.body, { rough: 0.5 }), under(0.14));
    S.tube(spline([[7, 7, 2], [12, 11.6, 5], [16, 16, 6.4]], 3), (t) => 4.4 - 1.2 * t, { sides: 10 });
    S.paint(fill(C.body, { rough: 0.5 }), vol(below(17.2), CARAMEL), under(0.14));
    S.at([17, 16.4, 6], [0, -0.3, 0.05], () => paw(S, [0, 0, -1.6], 6.6, 8, 3.8, { toes: 3 }));
    S.paint(fill(C.body, { rough: 0.5 }), under(0.14));
    arm(S, [8.4, 20.4, 3], [12, 19.6, 3.6], [14.6, 22.4, 2.8], -0.6);
    arm(S, [-8.4, 20.4, 3], [-12, 22.6, 4], [-13.6, 27.4, 5.4], 0.4);
    S.joint('head', L(S, { pivot: [0, 24, 1], axis: 'z', min: -0.3, max: 0.3, rest: 0, idle: 0.06 }), () => S.at([0, 31, 1.6], [0.1, -0.2, 0.1], () => kaijuHead(S, C, { mouth: 'grin', eye: 'closed', horn: 0xf6d870 })));
  });
}

// ------------------------------------------------------------------ 5. Wind-up Tin Kaiju
export function buriki(S) {
  S.dens = DENS;
  const RED = 0xd8442e, YEL = 0xf2c43a, TIN = 0xc9ced6, BLUE = 0x3a6ab8;
  const C = {
    body: RED, belly: YEL, plate: TIN, spray: tone(RED, 0.25), claw: TIN, rough: 0.32, blush: null,
    // lithographed tin: the seam where the two pressed halves meet, its tabs, printed scales and stars
    extra: [vol(slabX(-0.3, 0.3), tone(RED, 0.45)), proj('left', or(...[[0, 14], [-4, 9], [4, 9], [-2, 19], [3, 21], [-5, 15], [5, 15]].map(([u, v]) => arc(u, v, 1.8, Math.PI * 1.15, Math.PI * 1.85, 0.4))), tone(RED, 0.25)), proj('right', or(...[[0, 14], [-4, 9], [4, 9], [-2, 19], [3, 21], [-5, 15], [5, 15]].map(([u, v]) => arc(u, v, 1.8, Math.PI * 1.15, Math.PI * 1.85, 0.4))), tone(RED, 0.25)), proj('front', or(star(-4.6, 16.6, 1.4), star(4.4, 6.6, 1.2)), 0xfbf6e8, { near: 4 })],
  };
  S.at([0, 0, 0], null, () => {
    kaijuBody(S, C);
    // the tabs that hold the halves together, folded over at the back
    S.paint(fill(TIN, { rough: 0.3 }));
    for (const y of [9, 15, 21]) S.at([0, y, -9.2 - (y > 20 ? -2.2 : 0)], [0.3, 0, 0], () => S.box(-1.4, -0.6, -0.5, 1.4, 0.6, 0.3, { bevel: 0.2 }));
    S.paint(fill(RED, { rough: 0.32 }), under(0.14));
    arm(S, [8.4, 20.4, 3], [11, 18, 8], [6.4, 19.6, 12.6], 1.4);
    arm(S, [-8.4, 20.4, 3], [-11, 18, 8], [-6.4, 19.6, 12.6], -1.4);
    S.at([0, 19.4, 13.4], [Math.PI / 2 - 0.2, 0, 0], () => donut(S, [0, 0, 0], 4.6, 2.2));
    // the key in its side: the gimmick winds it
    S.joint('key', L(S, { pivot: [10.6, 15, 0], axis: 'x', min: -7, max: 7, rest: 0, g: [0, Math.PI * 1.5], idle: 0.3 }), () => {
      S.paint(fill(TIN, { rough: 0.25 }), under(0.2));
      S.tube([[9.6, 15, 0], [14.4, 15, 0]], 0.7, { sides: 8 });
      S.at([15.6, 15, 0], null, () => {
        S.at([0, 0, 0], [0, 0, Math.PI / 2], () => S.cyl([0, -1.2, 0], 1.3, 2.4, { segs: 10 }));
        for (const s of [1, -1]) S.extrude([[-1, s * 0.8], [1, s * 0.8], [2.6, s * 4.6], [0, s * 6], [-2.6, s * 4.6]], -0.5, 0.5, { bevel: 0.2 });
      });
    });
    S.joint('head', L(S, { pivot: [0, 24, 1], axis: 'x', min: -0.3, max: 0.3, rest: 0, idle: 0.05 }), () => S.at([0, 31, 1.6], [0.05, 0, 0], () => kaijuHead(S, C, {
      mouth: 'gnash', horn: YEL,
      paint: [proj('front', pair(circle(4.6, 2.2, 2.6)), YEL, { near: 3 }), proj('front', pair(circle(4.6, 2.2, 1.7)), 0xfbf8ee, { near: 3 }), proj('front', pair(circle(4.2, 2, 0.9)), EYE, { near: 3 }), proj('front', pair(rbox(4.6, 5.4, 2.6, 0.5, 0.2, -0.3)), 0x2a2028, { near: 3 }), proj('front', label('MADE IN JAPAN', 0, -7.6, 0.18), YEL, { hard: true, near: 3 })],
    })));
    void BLUE;
  }, SCALE);
}

// ------------------------------------------------------------------ 6. Biscuit Tower Attack (rare)
export function tower(S) {
  S.dens = DENS;
  const C = { body: 0x4fb3a2, belly: 0xf2ecc4, plate: 0xf6d65a, spray: 0x2f8a7c, claw: 0xfbf6e0 };
  const ASPH = 0x6a6c74, BISC = 0xe2b46a, CHOC = 0x5a3424;
  // a city block: road, zebra crossing, kerb, a street tree, a little house
  const zebra = or(...[0, 1, 2, 3, 4].map((k) => rbox(-22 + k * 5, 12, 1.5, 6, 0)));
  S.paint(fill(ASPH, { rough: 0.85 }), proj('top', zebra, 0xf2f0e8), proj('top', or(rbox(0, -0.4, 34, 0.35, 0), rbox(30, 12, 0.35, 6, 0)), 0xf2d24a), under(0.2), ...stamp(MAKER, { c: 0x4a4c54 }));
  S.with({ dens: 0.45 }, () => {
    S.box(-36, 0, -22, 36, 4, 22, { bevel: 1 });
    S.paint(fill(0xc8c4b8, { rough: 0.85 }), proj('top', repeatU(rbox(0, 0, 0.2, 9, 0), 6), tone(0xc8c4b8, 0.18)), under(0.2));
    S.box(-36, 4, -22, 36, 5.2, -12, { bevel: 0.3 });
  });
  S.paint(fill(0x8a5a38, { rough: 0.85 }));
  S.cyl([-28, 5.2, -17], [1.1, 0.8], 7, { segs: 8 });
  S.paint(fill(0x5f9a4a, { rough: 0.8 }), under(0.2), crown(0.1));
  for (const [x, y, z, r] of [[-28, 14, -17, 4.4], [-30.4, 12.4, -16, 3], [-25.6, 12.6, -18, 3.2], [-28, 16.8, -17.6, 2.8]]) S.ball([x, y, z], [r, r * 0.86, r], { segs: 10, rings: 6 });
  S.paint(fill(0xf2e8d4, { rough: 0.8 }), proj('front', or(rbox(27, 10, 1.6, 1.6, 0), rbox(32, 10, 1.6, 1.6, 0)), 0x8ab4d4), proj('front', rbox(29.5, 7.4, 1.2, 2.2, 0), 0x8a5a38), under(0.18));
  S.box(24, 5.2, -21, 35, 14, -14, { bevel: 0.3 });
  S.paint(fill(0x3a6ab8, { rough: 0.55 }), under(0.2));
  S.extrude([[23, 14], [36, 14], [29.5, 19]], -21.6, -13.4, { bevel: 0.3 });
  // the tower: four biscuit sticks dipped in chocolate (a corner to the front), braced and cross-braced, a wafer deck;
  // bitten off at the top
  const TX = 11, R = (y) => 8.4 - y * 0.17, P = (k, y) => { const a = k * Math.PI / 2; return [TX + Math.cos(a) * R(y), y, Math.sin(a) * R(y)]; };
  S.paint(fill(BISC, { rough: 0.7 }), vol(below(22), CHOC, { rough: 0.35 }), under(0.14));
  for (let k = 0; k < 4; k++) S.tube(spline([P(k, 4), P(k, 16), P(k, 28), P(k, 38.6)], 2), 1, { sides: 8 });
  for (let k = 0; k < 4; k++) for (const [y0, y1] of [[5, 15], [15, 25]]) { S.tube([P(k, y0), P(k + 1, y1)], 0.5, { sides: 6 }); S.tube([P(k + 1, y0), P(k, y1)], 0.5, { sides: 6 }); }
  S.paint(fill(BISC, { rough: 0.7 }), under(0.14));
  for (const y of [15, 31]) for (let k = 0; k < 4; k++) S.tube([P(k, y), P(k + 1, y)], 0.6, { sides: 6 });
  for (let k = 0; k < 4; k++) S.tube([P(k, 31), P(k + 1, 37)], 0.45, { sides: 6 });
  S.paint(fill(tint(BISC, 0.3), { rough: 0.8 }));
  for (let k = 0; k < 4; k++) { const [x, y, z] = P(k, 38.6); S.at([x, y + 0.6, z], [0.3 * k, k, 0.5], () => S.box(-0.9, -0.5, -0.8, 0.9, 0.4, 0.8, { bevel: 0.25 })); }
  const grid = or(repeatU(rbox(0, 0, 0.18, 9, 0), 1.6), repeatV(rbox(0, 0, 9, 0.18, 0), 1.6));
  S.paint(fill(0xeec88a, { rough: 0.7 }), proj('top', grid, tone(0xeec88a, 0.2)), vol(band(1, 2.2), 0xf6e2b4), under(0.16));
  S.at([TX, 22, 0], [0, Math.PI / 4, 0], () => S.box(-3.8, 0, -3.8, 3.8, 2.2, 3.8, { bevel: 0.4 }));
  S.paint(fill(BISC, { rough: 0.8 }));
  for (const [x, z, r] of [[20, 9, 0.2], [24, 4, 1], [17, 14, 2], [7, 13, 0.6], [-16, 14, 1.4]]) S.at([x, 4.6, z], [0.4, r, 0.2], () => S.box(-0.9, -0.4, -0.7, 0.9, 0.4, 0.7, { bevel: 0.2 }));
  // the kaiju, arms round it, mouth full
  S.at([-9, 4, 3], [0, 0.45, -0.16], () => {
    kaijuBody(S, C);
    S.paint(fill(C.body, { rough: 0.5 }), under(0.14));
    arm(S, [8.4, 20.4, 3], [12.4, 18.6, 0.4], [14.6, 23.4, 1.6], -1.4);
    arm(S, [-8.4, 20.4, 3], [1, 19, 12.4], [13.6, 24.4, 9.6], 0.9);
    S.joint('head', L(S, { pivot: [0, 24, 1], axis: 'x', min: -0.3, max: 0.3, rest: 0, g: [0, 0.18], idle: 0.04 }), () => S.at([0, 31, 1.6], [0.1, 0.6, 0], () => kaijuHead(S, C, { mouth: 'chomp' })));
  });
}

// ------------------------------------------------------------------ 7. Triple-Head Parfait (ultra)
export function parfait(S) {
  S.dens = DENS;
  const C = { body: 0xb6a0e6, belly: 0xf6eefc, plate: 0xf2d06a, spray: 0x8c72c8, claw: 0xfbf6e0 };
  // a gingham mat
  const gingham = (x, y, z) => { const a = Math.floor((x + 80) / 3.4) % 2, b = Math.floor((z + 80) / 3.4) % 2; return a && b ? 0xe8607a : a || b ? 0xf4a8b8 : 0xfbf2f2; };
  S.paint(fill(gingham, { rough: 0.85 }), under(0.2), ...stamp(MAKER, { c: 0x9a6a7a }));
  S.with({ dens: 0.5 }, () => S.lathe(spline([[0, 0], [24, 0], [25, 0.8], [24.6, 1.4], [0, 1.4]], 2), { segs: 28 }));
  // the glass and what is in it
  const G = [0, 1.4, 7];
  S.paint(fill(0xe8c66a, { rough: 0.5 }), vol(band(13, 18), 0xd8344a, { rough: 0.3 }), vol(band(18, 24.6), 0xfbf6ee), vol(band(24.6, 29.4), 0x8a5a3a), under(0.1));
  S.lathe([[0, 9.6], [2.2, 9.8], [4.6, 13], [6, 20], [7.2, 29.4], [0, 29.4]], { segs: 18, at: G });
  S.clear(true);
  S.paint(fill(0xe4f0f4, { rough: 0.06 }));
  S.lathe(spline([[0, 0], [7, 0], [7, 0.8], [1.4, 1.6], [1.1, 6], [2.6, 9.4], [5.2, 12.6], [6.6, 20], [8, 30.4], [8.6, 31]], 2), { segs: 20, at: G, cap: 'bottom' });
  S.clear(false);
  S.paint(fill(0xfbf6ea, { rough: 0.5 }), under(0.1));
  S.ball([G[0] - 3, G[1] + 33.4, G[2]], [5, 4.4, 5], { segs: 14, rings: 8 });
  S.paint(fill(0xf6b0c4, { rough: 0.5 }), under(0.1));
  S.ball([G[0] + 3.4, G[1] + 33, G[2] + 1], [4.6, 4, 4.6], { segs: 14, rings: 8 });
  // the cream: a twisted star of a swirl
  S.paint(fill(0xfbfaf6, { rough: 0.45 }), under(0.08));
  const swirl = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6, R = 4.6 * (1 - t * 0.9), pts = []; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 + t * 2.2, rr = R * (k % 2 ? 0.8 : 1); pts.push([G[0] + Math.cos(a) * rr, G[1] + 35 + t * 9, G[2] + Math.sin(a) * rr]); } swirl.push(pts); }
  S.loft(swirl, { caps: 'start' });
  S.paint(fill(0xe8c07a, { rough: 0.6 }), proj('front', or(repeatV(seg(-1, 0, 1, 0.8, 0.3), 1.6)), tone(0xe8c07a, 0.2)), under(0.12));
  S.at([G[0] - 5, G[1] + 36, G[2] - 1], [0.1, 0, 0.42], () => S.box(-1.2, 0, -0.6, 1.2, 12, 0.6, { bevel: 0.3 }));
  S.paint(fill(0xe2b06a, { rough: 0.6 }), vol(below(G[1] + 42), 0x5a3424, { rough: 0.35 }));
  S.tube([[G[0] + 4, G[1] + 33, G[2] - 2], [G[0] + 8.4, G[1] + 48, G[2] - 3.6]], 0.8, { sides: 8 });
  // the three heads: left and right gaze at it, the middle one gets the cherry
  S.at([0, 0, -9], null, () => {
    kaijuBody(S, C, { tail: [[0, 7, -5], [0, 4.6, -12], [-4, 2.8, -17.6], [-10, 2.2, -19], [-15, 2.4, -16]] });
    S.paint(fill(C.body, { rough: 0.5 }), under(0.14));
    arm(S, [8.4, 20.4, 3], [12, 18, 8.4], [8.4, 20.6, 12.6], 1.2);
    arm(S, [-8.4, 20.4, 3], [-12, 18, 8.4], [-8.4, 20.6, 12.6], -1.2);
    for (const [x, rz, rx, hx, hy, hz, ry] of [[-6, 0.5, -0.1, -15, 40, 8, 0.65], [6, -0.5, -0.1, 15, 40, 8, -0.65]]) {
      S.paint(fill(C.body, { rough: 0.5 }), vol(blob([hx * 0.5, 30, 8], [4, 8, 3]), C.belly), under(0.14));
      S.tube(spline([[x * 0.6, 22, 0], [x * 1.4, 30, 2], [hx * 0.9, hy - 6, hz - 2]], 3), (t) => 5.2 - 1.4 * t, { sides: 10 });
      void rz; void rx;
      S.at([hx, hy, hz], [0.08, ry, x > 0 ? -0.15 : 0.15], () => kaijuHead(S, C, { mouth: 'grin', eye: 'dot' }), 0.78);
    }
    S.paint(fill(C.body, { rough: 0.5 }), under(0.14));
    S.tube(spline([[0, 22, 0], [0, 34, 0], [0, 45, 2]], 3), (t) => 5.6 - 1.4 * t, { sides: 10 });
    S.paint(fill(0xd8283a, { rough: 0.2 }), crown(0.15));
    S.ball([0, 47.2, 16], [1.9, 1.7, 1.9], { segs: 10, rings: 6 });
    S.paint(fill(0x5a8a3a));
    S.tube(spline([[0, 48.6, 16], [0.6, 51, 15.4], [1.8, 52.4, 14.6]], 2), 0.3, { sides: 4 });
    S.joint('middle', L(S, { pivot: [0, 44, 2], axis: 'x', min: -0.3, max: 0.5, rest: 0, g: [0, 0.3], idle: 0.04 }), () => {
      S.at([0, 52, 4], [0.36, 0, 0], () => kaijuHead(S, C, { mouth: 'grin', eye: 'dot', horn: 0xf2a6c0 }), 0.86);
    });
    S.paint(fill(C.plate, { rough: 0.45 }), proj('front', or(seg(0, 2, 0, 9, 0.3)), tone(C.plate, 0.2)), under(0.12));
    for (const s of [1, -1]) S.at([s * 8, 26, -6], [-0.3, 0, -s * 0.9], () => blade(S, 12, 9, 1.2, { shape: 'wing', cup: -1.6 }));
  });
}

// ------------------------------------------------------------------ 8. Mecha-Kaiju ULTIMATE (secret)
export function mecha(S) {
  S.dens = DENS;
  const NAVY = 0x2e3c6c, STEEL = 0x8a929e, GUN = 0x4a4e58, YEL = 0xf2c43a, CYAN = 0x6ad8e8;
  const rivets = (v, pts) => proj(v, or(...pts.map(([x, y]) => circle(x, y, 0.35))), tint(STEEL, 0.3));
  const C = {
    body: NAVY, belly: STEEL, plate: STEEL, spray: tone(NAVY, 0.25), claw: YEL, rough: 0.38, blush: null,
    extra: [proj('front', or(stroke(rbox(0, 12, 5, 6.6, 1.2), 0.35), seg(-6, 4.6, 6, 4.6, 0.35)), tone(STEEL, 0.35), { near: 4 }), proj('front', and(rbox(0, 9.6, 4, 2.6, 0.6), repeatV(rbox(0, 0, 4, 0.3, 0), 1.2)), GUN, { near: 4 }), rivets('front', [[-4, 18], [4, 18], [-4, 5.8], [4, 5.8]]), proj('left', stroke(rbox(0, 14, 5, 7, 1.4), 0.35), tone(NAVY, 0.35)), proj('right', stroke(rbox(0, 14, 5, 7, 1.4), 0.35), tone(NAVY, 0.35)), vol(band(0, 1.6), YEL)],
  };
  // a hexagonal launch pad with hazard stripes
  const hazard = and(stroke(circle(0, 0, 26), 2.6), repeatU(rbox(0, 0, 1.2, 40, 0, 0.6), 4.8));
  S.paint(fill(0x3a3e48, { rough: 0.6 }), proj('front', stroke(circle(0, 0, 26), 2.6), YEL), proj('front', hazard, 0x2a2c34), proj('front', kana('最終兵器', 0, -14.6, 3.6), YEL), proj('back', label(MAKER, 0, 0, 0.5), 0x8a8e98, { hard: true }), under(0.2));
  const hex = [0, 1, 2, 3, 4, 5].map((k) => [Math.cos(k * Math.PI / 3) * 29, Math.sin(k * Math.PI / 3) * 29]);
  S.with({ dens: 0.5 }, () => S.at([0, 0, 0], [-Math.PI / 2, 0, 0], () => S.extrude(hex, 0, 5, { bevel: 1 })));
  S.at([0, 5, 0], null, () => {
    kaijuBody(S, C);
    // armour: shoulder pods, a clear chest dome with its reactor, a back pack with exhausts
    S.paint(fill(STEEL, { rough: 0.3 }), proj('top', stroke(circle(0, 0, 3), 0.4), GUN), under(0.2));
    for (const s of [1, -1]) S.lathe(spline([[0, 0], [4.6, 0], [5.2, 1.4], [4.4, 3.4], [2, 4.6], [0, 4.8]], 2), { segs: 14, at: [s * 9.6, 20.8, 2] });
    S.paint(fill(GUN, { rough: 0.3 }), proj('back', or(stroke(rbox(0, 17, 5, 5, 1), 0.4), rbox(0, 21, 3, 0.4, 0)), STEEL), under(0.2));
    S.box(-6, 11, -13, 6, 23, -8, { bevel: 1.2 });
    S.paint(fill(STEEL, { rough: 0.25 }), proj('bottom', circle(0, 0, 1.2), 0x2a2c34));
    for (const s of [1, -1]) S.cyl([s * 3.4, 8.4, -11], [2.4, 1.6], 2.8, { segs: 12 });
    S.paint(fill(0xf28a2a, { rough: 0.4 }));
    S.ball([0, 16.4, 9.6], [3, 3, 1.6], { segs: 12, rings: 6 });
    S.clear(true);
    S.paint(fill(CYAN, { rough: 0.05 }));
    S.ball([0, 16.4, 9.8], [3.8, 3.8, 2.6], { segs: 14, rings: 7, v0: 0 });
    S.clear(false);
    S.paint(fill(NAVY, { rough: 0.38 }), under(0.14));
    arm(S, [-8.4, 20.4, 3], [-12.4, 15, 4.4], [-10.6, 10.8, 8.6], 0.6);
    // the right arm holds the melon pan aloft: the gimmick raises it higher
    S.joint('arm', L(S, { pivot: [8.4, 20.4, 3], axis: 'z', min: -0.3, max: 0.6, rest: 0, g: [0, 0.4] }), () => {
      S.paint(fill(NAVY, { rough: 0.38 }), under(0.14));
      arm(S, [8.4, 20.4, 3], [14.4, 24.6, 4.6], [15.6, 31.6, 5.6], -1.7);
      const crust = and(circle(0, 0, 6.4), or(repeatU(rbox(0, 0, 0.25, 9, 0, 0.7), 2.4), repeatU(rbox(0, 0, 0.25, 9, 0, -0.7), 2.4)));
      S.paint(fill(0xf2d48a, { rough: 0.7 }), proj('top', crust, 0xd8a85a), vol(below(36), 0xe8b468), under(0.1));
      S.lathe(spline([[0, 34.4], [6, 34.4], [6.8, 35.4], [6.4, 37.4], [4.6, 39], [0, 39.8]], 2), { segs: 18, at: [15.6, 0, 6] });
    });
    S.joint('head', L(S, { pivot: [0, 24, 1], axis: 'y', min: -0.5, max: 0.5, rest: 0, idle: 0.08 }), () => S.at([0, 31, 1.6], null, () => {
      kaijuHead(S, C, {
        mouth: 'gnash', horn: YEL,
        paint: [proj('front', and(rbox(0, 2.4, 7.2, 1.7, 1.2), halfAbove(-10)), 0x1e2232, { near: 3 }), proj('front', pair(rbox(3.4, 2.4, 2, 0.9, 0.5)), YEL, { near: 3 }), rivets('front', [[-6, -1.2], [6, -1.2]]), proj('front', label('MK-II', 0, 6, 0.22), YEL, { hard: true, near: 3 })],
      });
      S.paint(fill(STEEL, { rough: 0.25 }), under(0.2));
      for (const s of [1, -1]) { S.tube([[s * 6.4, 6, -2], [s * 8.4, 12.4, -4]], 0.4, { sides: 5 }); S.ball([s * 8.4, 12.6, -4], 0.9, { segs: 6, rings: 4 }); }
    }));
  });
}

void tint; void stroke; void star; void label; void kana; void halfAbove;
export { taiyaki_ as taiyaki };
