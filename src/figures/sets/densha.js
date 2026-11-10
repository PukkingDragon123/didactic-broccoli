// Chibi Densha (ちびでんしゃ大集合): pocket trains with very big faces. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/densha.js. The family look: every piece stands on the same
// walnut plinth with a length of track (ballast, sleepers, real rail sections) and a brass name plate; the trains are
// squashed to chibi proportions, with a face on the front.
import { spline, ring } from '../sculpt.js';
import { paw, blade } from '../anatomy.js';
import {
  fill, proj, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, repeatU, repeatV, label, kana, below, above, band, blob, blobs,
} from '../paint.js';
import { cat, catHead, form, dense, fine } from './neko_cafe.js';

const MAKER = 'KISHA-DO';
const lerp = (a, b, t) => a + (b - a) * t;
const WALNUT = 0x6a4632, BRASS = 0xd8b45a, BALLAST = 0x9a948c, SLEEPER = 0x7a5a42, RAIL = 0x8a8a92, NAVY = 0x2a3448, BLUSH = 0xf2a0a0;
const RT = 10.2; // the top of the rails

/** A rounded rectangle centred on x = 0 from y0 up h: top corners rt, bottom corners rb (counter-clockwise). */
function rr(w, h, rt, rb, y0 = 0, n = 5) {
  const P = [], a = (cx, cy, r, a0, a1) => { for (let k = 0; k <= n; k++) { const t = a0 + (a1 - a0) * k / n; P.push([cx + Math.cos(t) * r, y0 + cy + Math.sin(t) * r]); } };
  a(w / 2 - rb, rb, rb, -Math.PI / 2, 0); a(w / 2 - rt, h - rt, rt, 0, Math.PI / 2); a(-w / 2 + rt, h - rt, rt, Math.PI / 2, Math.PI); a(-w / 2 + rb, rb, rb, Math.PI, Math.PI * 1.5);
  return P;
}
/** The family's plinth and track along z (half length L), the name plate on the front. o.k: the track's width scale, o.x. */
function track(S, L, name, o = {}) {
  const W = o.w ?? 17;
  S.paint(fill(WALNUT, { rough: 0.5 }), proj('front', rbox(0, 1.6, 10.4, 1.1, 0.3), BRASS), proj('front', label(name, 0, 1.6, 0.26), 0x4a3424, { hard: true }), crown(0.08), under(0.2), ...stamp(MAKER, { c: 0xc8a888, px: 0.34 }));
  S.box(-W, 0, -L, W, 3.2, L, { bevel: 0.8 });
  S.at([o.x ?? 0, 0, 0], null, () => {
    S.paint(fill(BALLAST, { rough: 0.95 }), proj('right', or(ellipse(-8, 4.6, 1.2, 0.7), ellipse(3, 4.2, 1, 0.6), ellipse(12, 4.8, 1.3, 0.7), ellipse(-16, 4, 0.9, 0.5)), tone(BALLAST, 0.18)), proj('left', or(ellipse(-6, 4.4, 1.2, 0.7), ellipse(5, 4.6, 1, 0.6), ellipse(14, 4.2, 1.3, 0.7)), tone(BALLAST, 0.18)), crown(0.08));
    S.extrude([[-14, 3.2], [14, 3.2], [11, 6], [-11, 6]], -L + 0.6, L - 0.6);
    S.paint(fill(SLEEPER, { rough: 0.8 }), proj('top', or(seg(-9, 0, 9, 0, 0.18)), tone(SLEEPER, 0.12)), crown(0.06));
    for (let z = -L + 3.4; z < L - 1.4; z += 5.6) S.box(-11.4, 6, z - 1.3, 11.4, 7.4, z + 1.3, { bevel: 0.25 });
    S.paint(fill(RAIL, { rough: 0.4 }), proj('top', all_, 0xc8ccd2));
    const sec = [[-1.1, 0], [1.1, 0], [1.1, 0.4], [0.35, 0.7], [0.35, 2], [0.8, 2.2], [0.8, 2.8], [-0.8, 2.8], [-0.8, 2.2], [-0.35, 2], [-0.35, 0.7], [-1.1, 0.4]];
    for (const s of [1, -1]) S.at([s * 7.6, 7.4, 0], null, () => S.extrude(sec, -L + 0.8, L - 0.8));
  }, o.k ? [o.k, 1, 1] : 1);
}
const all_ = { d: () => -1, b: null };
/** A bogie under a car at z: a side frame, springs, four wheels on the rails. */
function bogie(S, z, o = {}) {
  S.paint(fill(0x3a3a42, { rough: 0.5 }), proj('right', or(circle(z - 3.4, 13.8, 2.6), circle(z + 3.4, 13.8, 2.6)), 0x2e2e34), proj('left', or(circle(-z - 3.4, 13.8, 2.6), circle(-z + 3.4, 13.8, 2.6)), 0x2e2e34), crown(0.1));
  for (const s of [1, -1]) S.box(s * 9.2 - 0.8, 12, z - 6, s * 9.2 + 0.8, 15.4, z + 6, { bevel: 0.4 });
  S.box(-9, 14.4, z - 2, 9, 16, z + 2, { bevel: 0.4 });
  S.paint(fill(o.wheel ?? 0x56565e, { rough: 0.4 }), vol((x) => Math.abs(x) - 7.2, 0x9a9aa2));
  for (const s of [1, -1]) for (const dz of [-3.4, 3.4]) S.at([s * 7.9, RT + 3.6, z + dz], [0, 0, Math.PI / 2], () => S.cyl([0, -0.9, 0], [3.9, 3.5], 1.8, { segs: 14, bevel: 0.3 }));
}
/** A single-arm pantograph standing on the roof at (y, z); a joint that folds it. */
function panta(S, y, z, name = 'panta') {
  S.paint(fill(0xe8e4dc), vol(band(y, y + 0.8), 0x8a8a92));
  for (const x of [-4, 4]) for (const dz of [-3, 3]) S.cyl([x, y, z + dz], [0.8, 0.6], 1.6, { segs: 8 });
  S.paint(fill(0x5a5a64, { rough: 0.4 }));
  S.box(-4.6, y + 1.4, z - 3.6, 4.6, y + 2, z + 3.6, { bevel: 0.2 });
  S.joint(name, { pivot: [0, y + 2.4, z - 3], axis: 'x', min: -0.6, max: 0, rest: 0, g: [0, -0.5], idle: 0.02 }, () => {
    for (const x of [-1.4, 1.4]) S.tube([[x, y + 2.4, z - 3], [x * 0.5, y + 7.6, z + 3]], 0.38, { sides: 6 });
    S.tube([[0, y + 7.6, z + 3], [0, y + 12.4, z - 1.6]], 0.34, { sides: 6 });
    S.paint(fill(0x3a3a42, { rough: 0.4 }));
    S.tube(spline([[-6.6, y + 11, z - 1.6], [-5.6, y + 12.6, z - 1.6], [5.6, y + 12.6, z - 1.6], [6.6, y + 11, z - 1.6]], 2), 0.42, { sides: 6 });
  });
}
/** A car body: a rounded section extruded from z0 to z1 (rims chamfered), its floor at y0. */
const body = (S, w, h, z0, z1, o = {}) => S.extrude(rr(w, h, o.rt ?? 5, o.rb ?? 1.6, o.y0 ?? 15.6), z0, z1, { bevel: o.bevel ?? 1.4 });
/** The big face on a train's front (proj front, z >= near). */
const tface = (cx, cy, o = {}) => face({ at: [cx, cy], gap: o.gap ?? 10, r: o.r ?? 2, eye: o.eye || 'dot', mouth: o.mouth ?? 'smile', mw: o.mw ?? 3.4, blush: o.blush ?? BLUSH, near: o.near, col: o.col });
const lamp = (S, x, y, z, r = 1.4, c = 0xf8f2d8) => { S.paint(fill(0xc8ccd2, { rough: 0.3 })); S.at([x, y, z], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], r + 0.4, 0.8, { segs: 12 })); S.paint(fill(c, { rough: 0.15 })); S.at([x, y, z + 0.6], [Math.PI / 2, 0, 0], () => S.ball([0, 0, 0], [r, 0.5, r], { segs: 12, rings: 4, v0: 0.5 })); };

// ------------------------------------------------------------------ 1. Loop Line Densha
export function loop(S) {
  const SILVER = 0xd8dce0, GREEN = 0x8cc63f, DOOR = 0xc4c8ce;
  track(S, 26, 'LOOP LINE');
  for (const z of [-11, 11]) bogie(S, z);
  const win = (v) => [proj(v, repeatU(rbox(0, 30.2, 3, 3.2, 0.6), 9.6, -17, 17), NAVY), proj(v, or(rbox(-9.6, 25.6, 2.6, 8.4, 0.4), rbox(9.6, 25.6, 2.6, 8.4, 0.4)), DOOR), proj(v, or(rbox(-9.6, 30.2, 1.8, 3, 0.4), rbox(9.6, 30.2, 1.8, 3, 0.4)), NAVY)];
  S.paint(
    fill(SILVER, { rough: 0.4 }), vol(band(19.6, 22), GREEN), vol(band(35.6, 36.4), GREEN), ...win('right'), ...win('left'),
    proj('front', rbox(0, 31.6, 9.4, 4.2, 1.6), NAVY, { near: 21 }), proj('front', rbox(0, 34.2, 4.6, 0.9, 0.2), 0xf2a03a, { near: 21 }), proj('front', label('LOOP', 0, 34.2, 0.2), 0x3a2a1a, { near: 21, hard: true }),
    proj('front', ellipse(-5, 32, 1.8, 0.9, -0.5), 0x4a5468, { near: 21 }),
    ...tface(0, 25.6, { near: 21 }), under(0.2), crown(0.06),
  );
  body(S, 24, 22, -21, 21);
  for (const s of [1, -1]) lamp(S, s * 8.4, 18.4, 21);
  // roof gear, the front skirt and coupler
  S.paint(fill(0xb8bcc2, { rough: 0.5 }), proj('top', repeatU(rbox(0, 0, 0.3, 3, 0), 1.2), tone(0xb8bcc2, 0.2)), crown(0.08));
  for (const z of [7, -15]) S.box(-6, 37.4, z - 3.6, 6, 39.6, z + 3.6, { bevel: 0.8 });
  S.paint(fill(0x3a3a42, { rough: 0.5 }), under(0.2));
  S.extrude([[-10.6, 0], [10.6, 0], [8.4, -3.4], [-8.4, -3.4]].map(([x, y]) => [x, y + 16.4]), 19.4, 20.8);
  S.box(-1.2, 13, 20, 1.2, 14.6, 24, { bevel: 0.3 });
  panta(S, 37.4, -4);
}

// ------------------------------------------------------------------ 2. Chin-Chin Tram
export function tram(S) {
  const GREEN = 0x3f8f5a, CREAM = 0xf2e8c8, ROOF = 0x6a6a72;
  track(S, 22, 'CHIN-CHIN');
  for (const z of [-8.4, 8.4]) bogie(S, z, { wheel: 0x4a4a52 });
  const win = (v) => [proj(v, repeatU(rbox(0, 31, 2.4, 3.6, 0.8), 6.4, -14, 14), 0x34404e), proj(v, repeatU(rbox(0, 34.8, 2.2, 0.5, 0), 6.4, -14, 14), tone(CREAM, 0.15)), proj(v, label('2', 10, 22, 0.32), CREAM, { hard: true })];
  S.paint(
    fill(CREAM, { rough: 0.5 }), vol(below(26.4), GREEN), vol(band(26.4, 27), 0xd8b45a), ...win('right'), ...win('left'),
    proj('front', or(rbox(0, 31, 3.6, 3.8, 1), rbox(-7.6, 31, 2.6, 3.8, 1), rbox(7.6, 31, 2.6, 3.8, 1)), 0x34404e, { near: 18 }),
    ...tface(0, 22.4, { near: 18, gap: 11, mouth: null }), proj('front', arc(0, 20.8, 2.6, Math.PI * 1.2, Math.PI * 1.8, 0.55), EYE, { near: 18 }), under(0.2),
  );
  body(S, 22, 23, -18, 18, { rt: 3.2, rb: 2.4, bevel: 2.4 });
  // the clerestory roof and its little windows
  S.paint(fill(ROOF, { rough: 0.6 }), proj('right', repeatU(rbox(0, 40.4, 1.2, 0.5, 0.2), 4, -12, 12), 0xd8dce0), proj('left', repeatU(rbox(0, 40.4, 1.2, 0.5, 0.2), 4, -12, 12), 0xd8dce0), crown(0.1));
  S.box(-7, 38.4, -14.6, 7, 41.4, 14.6, { bevel: 0.8 });
  // the destination board
  S.paint(fill(0x2e2a30), proj('front', rbox(0, 37.2, 5, 1.3, 0.2), 0xf6f2e6), proj('front', kana('ちんちん', 0, 37.2, 2), 0x2e2a30));
  S.box(-5.6, 35.6, 17.8, 5.6, 38.8, 18.6, { bevel: 0.3 });
  // the headlamp (its nose), the lifeguard tray
  lamp(S, 0, 22.4, 18.2, 2.2);
  S.paint(fill(0x3a3a42), proj('top', repeatU(rbox(0, 0, 0.35, 3, 0), 2), 0x5a5a64));
  S.box(-9, 13.4, 18, 9, 14.2, 22.4, { bevel: 0.3 });
  // the trolley pole
  S.paint(fill(0x3a3a42, { rough: 0.4 }));
  S.box(-1.6, 41.4, -5.6, 1.6, 42.6, -2.4, { bevel: 0.3 });
  S.tube([[0, 42.4, -4], [0, 50.6, -19.6]], 0.45, { sides: 6 });
  S.at([0, 50.8, -19.8], [Math.PI / 2, 0, Math.PI / 2], () => S.cyl([0, -0.8, 0], 1.3, 1.6, { segs: 10 }));
  // the bell: chin-chin
  S.joint('bell', { pivot: [0, 42.6, 15.6], axis: 'z', min: -0.5, max: 0.5, rest: 0, g: [0, 0.4], idle: 0.05 }, () => {
    S.paint(fill(BRASS, { rough: 0.25 }), vol(band(39.4, 39.9), tone(BRASS, 0.25)), crown(0.15));
    S.lathe(dense([[2.4, 38.6], [2.2, 39.4], [1.6, 41], [0.6, 41.8], [0, 42]], 1), { segs: 14, at: [0, 0, 15.6] });
    S.tube([[0, 42, 15.6], [0, 41.4, 15.6]], 0.4, { sides: 6 });
  });
}

// ------------------------------------------------------------------ 3. Ekiben-chan
export function ekiben(S) {
  const WOOD = 0xe8c890, RICE = 0xf8f6ee, RED = 0xd8423a;
  track(S, 20, 'EKIBEN');
  for (const z of [-9, 9]) bogie(S, z);
  // the box: hinoki, with a face on the front
  S.paint(fill(WOOD, { rough: 0.6 }), proj('right', or(seg(-14, 20, 14, 20.4, 0.2), seg(-14, 23, 14, 22.8, 0.2)), tone(WOOD, 0.12)), proj('left', or(seg(-14, 20, 14, 20.4, 0.2), seg(-14, 23, 14, 22.8, 0.2)), tone(WOOD, 0.12)), ...tface(0, 22, { near: 16, gap: 11, r: 1.9 }), under(0.2));
  S.box(-12.6, 16.4, -16.6, 12.6, 17.8, 16.6, { bevel: 0.5 });
  for (const [a, b, c, d] of [[-12.6, -16.6, -11.4, 16.6], [11.4, -16.6, 12.6, 16.6], [-11.4, -16.6, 11.4, -15.4], [-11.4, 15.4, 11.4, 16.6]]) S.box(a, 17.8, b, c, 27, d, { bevel: 0.3 });
  S.box(-11.4, 17.8, -1.4, 0, 26, -0.6); S.box(0, 17.8, -15.4, 0.8, 26, 15.4);
  // the rice: sesame, a pickled plum
  S.paint(fill(RICE, { rough: 0.8 }), proj('top', or(...[[-8, 3], [-4, 7], [-6, 11.6], [-2, 4], [-9, 9]].map(([x, z]) => ellipse(x, -z, 0.35, 0.2, x))), 0x2e2a2a));
  S.ball([-5.6, 24.4, 8], [5.6, 2.4, 7.2], { segs: 14, rings: 6, v0: 0.5 });
  S.paint(fill(0xc8323a, { rough: 0.3 }), crown(0.15));
  S.ball([-5.6, 26.4, 8], [1.8, 1.4, 1.8], { segs: 10, rings: 6 });
  // the side: grilled salmon, rolled omelette, simmered things, pickles
  S.paint(fill(0xf09a7a, { rough: 0.5 }), proj('top', or(seg(-9, 4, -2, 2, 0.3), seg(-9, 6, -2, 4.6, 0.3)), 0xf8d0b8), vol(above(24.4), 0xd8784a));
  S.at([-5.6, 18, -4.6], [0, 0.2, 0], () => S.extrude([[-4.6, 0], [4.6, 0], [4, 4.6], [-2, 6.4], [-4.4, 4]], -1.6, 1.6, { bevel: 0.4 }));
  S.paint(fill(0xf6d25a, { rough: 0.5 }), proj('front', or(arc(0, 0, 1.4, 0, 6.2, 0.25)), tone(0xf6d25a, 0.18)), vol(above(23.4), 0xd8a03a));
  for (const z of [-11, -6.4]) S.at([5.6, 17.8, z], null, () => S.box(-4.4, 0, -2, 4.4, 5.4, 2, { bevel: 0.8 }));
  S.paint(fill(0x9a6a3a, { rough: 0.4 }), crown(0.2));
  S.ball([4, 20.4, -0.4], [2.4, 2.2, 2.2], { segs: 10, rings: 6 }); S.ball([8, 20, 1], [2, 1.8, 2], { segs: 10, rings: 6 });
  S.paint(fill(0xe8d84a), proj('top', repeatU(rbox(0, 0, 0.2, 3, 0), 1.2), tone(0xe8d84a, 0.2)));
  S.box(2.6, 17.8, 5.6, 9.6, 21.4, 9.4, { bevel: 0.5 });
  S.paint(fill(0x6aa04a));
  S.box(2.6, 17.8, 10.6, 9.6, 21, 14.6, { bevel: 0.6 });
  // the lid, wrapped in its printed paper, tied with string; it lifts at the back
  S.rest = 0.42;
  S.joint('lid', { pivot: [0, 27, -16.6], axis: 'x', min: -1.9, max: 0, rest: 0, g: [0, -1.85] }, () => {
    S.paint(
      fill(0xf6f0e0), proj('top', rbox(0, 0, 11, 15, 0.6), 0xf6f0e0), proj('top', stroke(rbox(0, 0, 10.4, 14.4, 0.6), 0.6), RED), proj('top', or(ellipse(-4, -8, 4, 2), ellipse(3, -9.6, 5, 1.6)), 0x8cc06a), proj('top', circle(5.4, 7.6, 2.6), RED),
      proj('top', kana('駅弁', -2.6, 4, 5.6), 0x2e2a30), proj('top', label('BENTO', -2.6, -2.6, 0.32), RED, { hard: true }), proj('top', label('Y980', 6.6, -12.4, 0.26), 0x2e2a30, { hard: true }),
      proj('bottom', all_, WOOD), under(0.0), crown(0.04),
    );
    S.box(-12.8, 27, -16.8, 12.8, 28.6, 16.8, { bevel: 0.5 });
    S.paint(fill(0xd8423a, { rough: 0.7 }));
    for (const x of [-4, 4]) S.tube([[x, 28.6, -16.9], [x, 28.8, 0], [x, 28.6, 16.9]], 0.32, { sides: 4, caps: false });
    // chopsticks under the string
    S.paint(fill(0xf6f2ea), proj('top', label('HASHI', 9.6, 0, 0.18), RED, { hard: true }));
    S.box(8.4, 28.6, -12, 10.8, 29.4, 12, { bevel: 0.3 });
  });
}

// ------------------------------------------------------------------ 4. Station Master Mike
export function ekicho(S) {
  const NAVY_U = 0x2e3a66, GOLD = 0xe2c26a, WHITE = 0xf8f4ec, ORANGE = 0xe99a52, BLACK = 0x3a3442, RED = 0xd8423a;
  track(S, 18, 'EKICHO', { x: 9.6, k: 0.62, w: 18.6 });
  // the platform: concrete, a yellow tactile strip along the edge
  S.paint(fill(0xc8c2b6, { rough: 0.9 }), proj('top', rbox(1.4, 0, 1.6, 18, 0), 0xf2c83a), proj('top', repeatV(or(circle(0.9, 0, 0.3), circle(1.9, 0, 0.3)), 1.4, -17, 17), tone(0xf2c83a, 0.2)), proj('top', or(seg(-17, 6, 0, 6, 0.2), seg(-17, -8, 0, -8, 0.2)), tone(0xc8c2b6, 0.2)), crown(0.04), under(0.2));
  S.box(-18, 3.2, -17.6, 3.2, 12.6, 17.6, { bevel: 0.5 });
  const P = 12.6;
  // the platform's sign post
  S.paint(fill(0x3a3a42));
  S.cyl([-15.6, P, -14.6], 0.6, 20, { segs: 8 });
  S.paint(fill(0xf6f2ea), proj('front', kana('駅長', -15.6, P + 18, 3), 0x2e2a30), proj('front', rbox(-15.6, P + 15.4, 4, 0.4, 0), 0x2f5fb8), under(0.2));
  S.box(-20.4, P + 14.4, -14, -10.8, P + 21, -13.2, { bevel: 0.3 });
  S.at([-7.6, P, 1], [0, 0.35, 0], () => {
    cat(S, {
      coat: WHITE, light: 0xfdfaf4, eye: 'dot', ear: [ORANGE, BLACK], legCol: NAVY_U, feet: 0x2e2a30, sleeve: NAVY_U,
      headMarks: [vol(blob([5.6, 3.6, 3], [5, 5, 7]), ORANGE), vol(blob([-6.4, 4.6, 1], [4.6, 4.6, 6]), BLACK)],
      outfit: [vol(above(8), NAVY_U), proj('front', poly([[-3, 23.6], [3, 23.6], [0, 17]]), WHITE, { facing: 0.05 }), proj('front', seg(0, 22.6, 0, 18.6, 0.8), RED), proj('front', or(...[10, 13, 16].map((y) => circle(-2.4, y, 0.55)), ...[10, 13, 16].map((y) => circle(2.4, y, 0.55))), GOLD), vol(band(11.2, 12.4), 0x1e2440)],
      arms: [[8.6, 22.6, 4.4], [-7.6, 13, 3]],
      onHead: (S) => {
        // the station master's cap
        S.paint(fill(NAVY_U, { rough: 0.5 }), vol(band(6.6, 8.2), RED), proj('front', star(0, 10.4, 1.5, 5, 0.45), GOLD), proj('front', or(rbox(0, 7.4, 3, 0.35, 0)), GOLD), crown(0.1), under(0.2));
        S.lathe(dense([[8.2, 6.4], [8.4, 8.4], [9.8, 11.4], [9.6, 12.4], [7, 12.8], [0, 12.9]], 1.4), { segs: 18, sz: 0.94, at: [0, 0, -0.6] });
        S.paint(fill(0x1e1e26, { rough: 0.2 }));
        S.at([0, 6.6, 6.4], [-0.25, 0, 0], () => S.ball([0, 0, 0], [6.6, 0.8, 4.4], { segs: 14, rings: 4, v0: 0.5 }));
      },
    });
    // the flag
    S.joint('flag', { pivot: [8.6, 22.6, 4.4], axis: 'z', min: -0.3, max: 0.9, rest: 0, g: [0, 0.8], idle: 0.04 }, () => {
      S.paint(fill(0xd8c08a));
      S.tube([[8.6, 18.6, 4.4], [8.8, 38, 4.6]], 0.45, { sides: 6 });
      S.paint(fill(RED, { rough: 0.7 }), under(0.1));
      S.at([8.8, 37.4, 4.6], [0, -0.3, 0], () => S.extrude([[0, 0], [11, 0.6], [11.6, -3.2], [10.6, -7.2], [0, -7]], -0.3, 0.3));
    });
  });
}

// ------------------------------------------------------------------ 5. Dango-Nose Shinkansen
export function dango(S) {
  const IVORY = 0xf6f2e6, BLUE = 0x2f5fb8;
  track(S, 26, 'DANGO-HANA');
  for (const z of [-14, 7]) bogie(S, z);
  const side = (v) => [proj(v, repeatU(rbox(0, 31.4, 1.6, 2, 0.5), 4.2, -22, 4), 0x2a3448), proj(v, rbox(-4, 25.2, 1.8, 6.8, 0.4), tone(IVORY, 0.12))];
  S.paint(fill(IVORY, { rough: 0.4 }), vol(band(28.6, 34.2), BLUE), vol(below(19.6), BLUE), ...side('right'), ...side('left'), under(0.2), crown(0.06));
  body(S, 24, 22, -24, 12, { rt: 7, rb: 2 });
  // the round nose: windscreen on top, a face below, the light at the tip
  S.paint(
    fill(IVORY, { rough: 0.4 }), vol(below(19.6), BLUE),
    vol((x, y, z) => Math.max(28 - y, 13.6 - z, Math.abs(x) - 9.4), 0x2a3448, { facing: [0, 0.3, 0.95, 0.5] }), vol((x, y, z) => Math.max(27.2 - y, y - 28, 13.6 - z), BLUE, { facing: [0, 0.3, 0.95, 0.3] }),
    ...tface(0, 23.4, { near: 18, gap: 12.6, r: 2.1 }), under(0.2),
  );
  form(S, [0, 26.6, 0], [[11.4, 11.9, 10.9, 0], [14, 11.6, 10.6, -0.4], [17.6, 10.6, 9.2, -1.2], [21, 8.8, 7, -2.2], [23.6, 6.2, 4.6, -3], [25.2, 3.4, 2.6, -3.4], [25.8, 0.05, 0.05, -3.6]], { axis: 'z', pow: 2.8, n: 18 });
  S.paint(fill(0xd8dce0, { rough: 0.3 }));
  S.at([0, 23.1, 25.6], [Math.PI / 2, 0, 0], () => S.ball([0, 0, 0], [1.8, 0.9, 1.4], { segs: 10, rings: 4, v0: 0.5 }));
  S.paint(fill(0x3a3a42), under(0.2));
  S.extrude([[-11, 0], [11, 0], [8, -3.6], [-8, -3.6]].map(([x, y]) => [x, y + 16.4]), 18, 20.4);
  panta(S, 37.6, -12);
  // the wipers: it waves with them
  for (const s of [1, -1]) S.joint(`wiper${s}`, { pivot: [s * 3.4, 27, 19.4], axis: [0, 0.42, 1], min: -0.9, max: 0.9, rest: 0, g: [0, s * 0.8], idle: 0.04 }, () => {
    S.paint(fill(0x2e2e34, { rough: 0.4 }));
    S.tube([[s * 3.4, 27, 19.4], [s * 6.4, 31.6, 17.6]], 0.3, { sides: 4 });
  });
}

// ------------------------------------------------------------------ 6. Kan-Kan Crossing
export function fumikiri(S) {
  const YEL = 0xf2c83a, BLK = 0x2e2c34, ROAD = 0x6a6870, RED = 0xd8423a, SHIBA = 0xd98a46, CREAMS = 0xf6ecd8;
  // the plinth: the track runs across, the road comes towards you over it
  S.paint(fill(WALNUT, { rough: 0.5 }), proj('front', rbox(0, 1.6, 10.4, 1.1, 0.3), BRASS), proj('front', label('KAN-KAN', 0, 1.6, 0.26), 0x4a3424, { hard: true }), crown(0.08), under(0.2), ...stamp(MAKER, { c: 0xc8a888, px: 0.34 }));
  S.box(-26, 0, -17, 26, 3.2, 17, { bevel: 0.8 });
  S.at([0, 0, -3], [0, Math.PI / 2, 0], () => {
    S.paint(fill(BALLAST, { rough: 0.95 }), crown(0.08));
    S.extrude([[-12.4, 3.2], [12.4, 3.2], [9.6, 6], [-9.6, 6]], -25.4, 25.4);
    S.paint(fill(SLEEPER, { rough: 0.8 }), crown(0.06));
    for (let z = -23; z < 24; z += 5.6) if (Math.abs(z) > 9) S.box(-10, 6, z - 1.2, 10, 7.4, z + 1.2, { bevel: 0.25 });
    S.paint(fill(RAIL, { rough: 0.4 }), proj('top', all_, 0xc8ccd2));
    const sec = [[-1.1, 0], [1.1, 0], [1.1, 0.4], [0.35, 0.7], [0.35, 2], [0.8, 2.2], [0.8, 2.8], [-0.8, 2.8], [-0.8, 2.2], [-0.35, 2], [-0.35, 0.7], [-1.1, 0.4]];
    for (const s of [1, -1]) S.at([s * 6.8, 7.4, 0], null, () => S.extrude(sec, -25, 25));
  });
  // the road: asphalt, the crossing's boards between the rails, the stop line
  S.paint(fill(ROAD, { rough: 0.9 }), proj('top', or(rbox(0, -12, 7.6, 0.5, 0), seg(-8.6, 16.6, -8.6, 4, 0.4), seg(8.6, 16.6, 8.6, 4, 0.4)), 0xe8e4dc), proj('top', rbox(0, -4, 8, 4.6, 0), 0x56545c), crown(0.04));
  S.box(-9.4, 3.2, 4.6, 9.4, 7.6, 17, { bevel: 0.3 });
  S.box(-9.4, 3.2, -17, 9.4, 7.6, -9.6, { bevel: 0.3 });
  S.paint(fill(0x8a6a4a, { rough: 0.8 }), proj('top', repeatU(rbox(0, 0, 0.15, 10, 0), 3), tone(0x8a6a4a, 0.25)));
  S.box(-9.4, 7, -9.6, 9.4, 9.4, 4.6, { bevel: 0.2 });
  // the crossing signal: tiger-striped post, the crossbuck, two red lamps with hoods, the arrow, a bell
  const X0 = -13, Z0 = 8;
  S.paint(fill(BLK, { rough: 0.45 }), vol((x, y) => Math.sin((y - x * 0.4) * 0.9) - 0.1, YEL), vol(above(22), 0x3a3a42), crown(0.1));
  S.cyl([X0, 3.2, Z0], 1.4, 44, { segs: 12 });
  S.paint(fill(0x3a3a42), under(0.2));
  S.cyl([X0, 3.2, Z0], 3, 1.4, { segs: 12 });
  S.paint(fill(YEL, { rough: 0.4 }), vol((x, y, z) => Math.abs(Math.sin((x - X0) * 1.1)) - 0.62, BLK), under(0.15));
  for (const a of [0.6, -0.6]) S.at([X0, 41.4, Z0 + 1.4], [0, 0, a], () => S.box(-8.4, -1.1, -0.4, 8.4, 1.1, 0.4, { bevel: 0.2 }));
  S.paint(fill(BLK, { rough: 0.45 }));
  S.box(X0 - 8.6, 31.6, Z0 + 0.4, X0 + 8.6, 33, Z0 + 1.6, { bevel: 0.3 });
  for (const s of [1, -1]) {
    S.paint(fill(BLK, { rough: 0.45 }));
    S.at([X0 + s * 6.4, 31, Z0 + 2], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.6, 0], 3.4, 1.2, { segs: 16 }));
    S.at([X0 + s * 6.4, 31, Z0 + 3.4], [Math.PI / 2, 0, 0], () => S.lathe([[3.6, 0], [3.6, 1.8], [3.2, 1.8], [3.2, 0.4]], { segs: 16, arc: [Math.PI * 1.05, Math.PI * 1.95], cap: false }));
    S.paint(fill(RED, { rough: 0.2 }), vol(blob([X0 + s * 6.4 - 0.8, 31.8, Z0 + 3.6], [1, 1, 1]), 0xf8a090));
    S.at([X0 + s * 6.4, 31, Z0 + 2.4], [Math.PI / 2, 0, 0], () => S.ball([0, 0, 0], [2.6, 1.2, 2.6], { segs: 14, rings: 5, v0: 0.5 }));
  }
  S.paint(fill(0x2e2c34), proj('front', poly([[-3, 0], [1, 0], [1, 1.2], [3.4, -1], [1, -3.2], [1, -2], [-3, -2]].map(([x, y]) => [X0 + x, 26 + y])), 0xf6f2e6));
  S.box(X0 - 4, 22.6, Z0 + 0.8, X0 + 4, 27.8, Z0 + 2, { bevel: 0.4 });
  S.paint(fill(0x3a3a42, { rough: 0.35 }), crown(0.15));
  S.lathe(dense([[2.6, 45.6], [2.4, 46.6], [1.4, 48], [0, 48.4]], 0.8), { segs: 14, at: [X0, 0, Z0] });
  S.cyl([X0, 44.8, Z0], 1, 1, { segs: 10 });
  // the gate arm: it comes down (kan-kan-kan)
  S.paint(fill(0x3a3a42), under(0.2));
  S.box(X0 + 1.2, 12, Z0 - 1.6, X0 + 4, 16, Z0 + 1.6, { bevel: 0.5 });
  S.joint('gate', { pivot: [X0 + 3, 14, Z0], axis: 'z', min: 0, max: 1.4, rest: 0, g: [0, 1.3] }, () => {
    S.paint(fill(YEL, { rough: 0.4 }), vol((x) => Math.abs(Math.sin((x - X0) * 0.75)) - 0.55, BLK), under(0.15));
    S.box(X0 + 3, 13.1, Z0 - 0.9, X0 + 29, 14.9, Z0 + 0.9, { bevel: 0.4 });
    S.paint(fill(0x3a3a42));
    S.box(X0 - 1, 12.6, Z0 - 1.2, X0 + 3, 15.4, Z0 + 1.2, { bevel: 0.4 });
  });
  // Shiba, waiting since breakfast
  S.at([7, 7.6, 11.4], [0, -0.5, 0], () => cat(S, {
    coat: SHIBA, light: CREAMS, pose: 'sit', eye: 'dot', ear: [SHIBA, SHIBA], blush: 0xf2a0a0, whisker: SHIBA, nose: 0x3a3034,
    headMarks: [vol(blobs(blob([0, -3, 6], [6.4, 4.4, 4]), blob([-3.8, 1.4, 8], [1.4, 0.9, 1]), blob([3.8, 1.4, 8], [1.4, 0.9, 1])), CREAMS)],
    bodyMarks: [vol(blob([0, 14, 6], [4.6, 7, 3.6]), CREAMS)],
    tail: [[0, 7, -7], [0, 12, -10.6], [0, 16.4, -9.4], [0.6, 16.6, -6.4], [1.2, 14.6, -5.8]], tailMarks: [vol(above(15.6), CREAMS)],
    headJoint: { axis: 'y', pivot: [0, 19, 0.4], min: -0.6, max: 0.6, g: [0, 0.5], idle: 0.06 },
    onHead: (S) => { S.paint(fill(CREAMS), under(0.14)); S.loft(spline([[5.4, 4.2, 3.2, -2.6], [8, 3.4, 2.6, -2.8], [10, 2.2, 1.8, -2.8], [10.8, 1, 0.9, -2.8]], 2).map(([z, w, h, y]) => ring([0, y, z], w, h, 10, { axis: 'z' }))); S.paint(fill(0x2e2a30, { rough: 0.2 })); S.ball([0, -2.2, 10.8], [1.1, 0.8, 0.7], { segs: 8, rings: 5 }); },
  }), 0.62);
  S.paint(fill(RED, { rough: 0.5 }));
  S.at([7, 7.6 + 0.62 * 22.6, 11.4], [0, -0.5, 0], () => S.torus([0, 0, 0.3], 4.2 * 0.62 * 1.3, 0.5, { segs: 14, sides: 5 }));
}

// ------------------------------------------------------------------ 7. Countryside Station
export function mujineki(S) {
  const PLAT = 0xc8c2b6, TIN = 0x8a3a32, TIMBER = 0x8a6a4a, CREAMC = 0xf2e8c8, MAROON = 0xb8423a;
  S.paint(fill(WALNUT, { rough: 0.5 }), proj('front', rbox(0, 1.6, 12, 1.1, 0.3), BRASS), proj('front', label('MUJIN-EKI', 0, 1.6, 0.26), 0x4a3424, { hard: true }), crown(0.08), under(0.2), ...stamp(MAKER, { c: 0xc8a888, px: 0.34 }));
  S.box(-28, 0, -18, 28, 3.2, 18, { bevel: 0.8 });
  // the track along the back
  S.at([0, 0, -8.6], [0, Math.PI / 2, 0], () => {
    S.paint(fill(BALLAST, { rough: 0.95 }), crown(0.08));
    S.extrude([[-9.4, 3.2], [9.4, 3.2], [7, 5.6], [-7, 5.6]], -27.4, 27.4);
    S.paint(fill(SLEEPER, { rough: 0.8 }));
    for (let z = -25; z < 26; z += 5) S.box(-8, 5.6, z - 1, 8, 6.6, z + 1, { bevel: 0.2 });
    S.paint(fill(RAIL, { rough: 0.4 }), proj('top', all_, 0xc8ccd2));
    for (const s of [1, -1]) S.box(s * 5.2 - 0.6, 6.6, -27, s * 5.2 + 0.6, 8.6, 27, { bevel: 0.2 });
  });
  // the platform, a little grass at its foot
  S.paint(fill(PLAT, { rough: 0.9 }), proj('top', rbox(0, 1.2, 26, 0.6, 0), 0xf6f2e6), proj('front', or(seg(-20, 8, -20, 4, 0.2), seg(6, 9, 6, 4, 0.2)), tone(PLAT, 0.2)), crown(0.04), under(0.2));
  S.box(-27, 3.2, -1.8, 27, 11, 17, { bevel: 0.6 });
  S.paint(fill(0x7aa45a, { rough: 0.9 }), under(0.2));
  for (const [x, z] of [[-24, 16.6], [-10, 17], [14, 16.8], [24, 16.4]]) for (let k = 0; k < 4; k++) S.at([x + k * 0.8, 3.2, z], [0.4 - k * 0.25, k, 0.2], () => blade(S, 4 + (k % 2) * 1.6, 1, 0.4, { shape: 'leaf' }));
  // the shelter: four posts, a tin roof, a bench, the cat who knows the timetable
  S.paint(fill(TIMBER, { rough: 0.8 }), under(0.2));
  for (const [x, z] of [[-24, 2], [-8, 2], [-24, 12], [-8, 12]]) S.box(x - 0.7, 11, z - 0.7, x + 0.7, 30, z + 0.7);
  S.box(-25, 18, 1.2, -7, 19, 2.8);
  S.paint(fill(TIN, { rough: 0.55 }), proj('top', repeatV(rbox(0, 0, 40, 0.3, 0), 2.2), tone(TIN, 0.2)), crown(0.08), under(0.25));
  S.at([0, 0, 0], [0, -Math.PI / 2, 0], () => S.extrude([[-0.6, 32.4], [16.6, 29], [16.6, 28], [-0.6, 31.4]], 6, 26.4));
  S.paint(fill(0xb07a4a, { rough: 0.6 }), proj('top', repeatV(rbox(0, 0, 10, 0.12, 0), 1.6), tone(0xb07a4a, 0.2)), under(0.2));
  S.box(-23, 15.2, 3.6, -9, 16.2, 8.4, { bevel: 0.3 });
  S.box(-23, 16.2, 3.4, -9, 20.6, 4.2, { bevel: 0.3 });
  for (const x of [-22, -10]) S.box(x - 0.6, 11, 4.4, x + 0.6, 15.2, 7.6);
  fine(0.6, () => S.at([-14, 16.2, 6.2], [0, 0.2, 0], () => cat(S, { coat: 0xb8b4bc, pose: 'sit', eye: 'sleepy', headMarks: [proj('front', or(seg(-1.7, 7.4, -1.3, 4.8, 0.75), seg(0, 8, 0, 5.2, 0.75), seg(1.7, 7.4, 1.3, 4.8, 0.75)), 0x8a8692)], headJoint: { axis: 'x', pivot: [0, 19, 0.4], min: -0.4, max: 0.2, g: [0, -0.3], idle: 0.03 } }), 0.42));
  // the name board: this station in big kana, the neighbours small
  S.paint(fill(0xf6f2ea), proj('front', kana('いなか', 0, 25.6, 3.4), 0x2e2a30), proj('front', rbox(0, 22.4, 7.4, 0.6, 0), 0x2f5fb8), proj('front', label('<  YAMA', -4.4, 20.6, 0.2), 0x2e2a30, { hard: true }), proj('front', label('UMI  >', 4.6, 20.6, 0.2), 0x2e2a30, { hard: true }), under(0.2));
  S.box(-0.4 - 7.6, 19.4, 9.6, 7.6 - 0.4, 28.4, 10.4, { bevel: 0.3 });
  S.paint(fill(0x3a3a42));
  for (const x of [-6, 5.2]) S.cyl([x, 11, 10], 0.5, 19, { segs: 8 });
  // the cherry tree at the end of the platform
  S.paint(fill(0x6a4a3a, { rough: 0.9 }), under(0.2));
  S.tube(spline([[18, 11, 8], [17, 18, 7], [18.6, 26, 6], [20, 30, 5]], 3), (t) => lerp(2, 1, t), { sides: 8 });
  S.tube(spline([[17.4, 21, 7], [14, 26, 7.6], [12.6, 29, 8]], 2), 0.7, { sides: 6 });
  S.paint(fill(0xf6c6d2), proj('front', or(...[[14, 33], [20, 35], [24, 31], [17, 29]].map(([x, y]) => star(x, y, 1, 5, 0.45))), 0xfbe4ea), under(0.15), crown(0.08));
  for (const [x, y, z, r] of [[19, 33, 5, 4.2], [15.4, 31.6, 8, 3.2], [12.4, 29.6, 8.4, 2.6], [23.4, 31, 6, 3.4], [17, 36, 6.6, 3.4], [21.4, 36.4, 4.4, 2.8], [21.4, 29, 9.6, 2.8], [25.6, 28.4, 5, 2.2], [14.6, 34.6, 4.6, 2.6], [18.6, 28.4, 10, 2.4]]) S.ball([x, y, z], [r, r * 0.74, r * 0.9], { segs: 12, rings: 7 });
  // the two-a-day railcar, pulling in
  S.joint('train', { slide: [-14, 0, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => S.at([14, 0, -8.6], [0, Math.PI / 2, 0], () => S.at([0, -1.6, 0], null, () => {
    S.paint(fill(CREAMC, { rough: 0.45 }), vol(below(22), MAROON), vol(band(34, 35), MAROON), proj('left', repeatU(rbox(0, 28.6, 1.8, 2.6, 0.5), 5, -20, 4), 0x34404e), proj('front', or(rbox(-5, 29, 3.4, 3, 0.8), rbox(5, 29, 3.4, 3, 0.8)), 0x34404e, { near: 6 }), ...tface(0, 22.4, { near: 6, gap: 10, r: 1.7, col: 0x2e2a30 }), under(0.2));
    body(S, 20, 21, -24, 7.6, { rt: 4.6 });
    lamp(S, 0, 33.6, 7.6, 1.2);
    S.paint(fill(0x3a3a42), crown(0.1));
    S.box(-3, 36.6, -12, 3, 38, -4, { bevel: 0.4 });
    S.paint(fill(0x3a3a42, { rough: 0.5 }));
    for (const s of [1, -1]) S.box(s * 5.2 - 0.6, 10.2, -18, s * 5.2 + 0.6, 15.6, 4, { bevel: 0.2 });
    S.paint(fill(0x4a4a52, { rough: 0.4 }));
    for (const s of [1, -1]) for (const z of [-16, -10, -2]) S.at([s * 5.6, 12.8, z], [0, 0, Math.PI / 2], () => S.cyl([0, -0.6, 0], 2.6, 1.2, { segs: 12 }));
  })));
}

// ------------------------------------------------------------------ 8. Lucky Yellow Inspector (secret)
export function yellow(S) {
  const YEL = 0xf6d03a, BLUE = 0x2f5fb8, GREENL = 0x5fae5a;
  track(S, 28, 'LUCKY YELLOW');
  for (const z of [-17, 5]) bogie(S, z);
  const side = (v) => [proj(v, repeatU(rbox(0, 29, 1.4, 1.6, 0.5), 3.6, -24, 2), 0x2a3448), proj(v, or(circle(-12, 22.4, 1.1), circle(-10.2, 22.4, 1.1), circle(-11.1, 23.3, 1.1), circle(-11.1, 21.5, 1.1)), GREENL), proj(v, seg(-11.1, 21.6, -10.4, 19.8, 0.3), GREENL)];
  S.paint(fill(YEL, { rough: 0.35 }), vol(band(25.2, 26.6), BLUE), vol(below(18.4), BLUE), ...side('right'), ...side('left'), under(0.2), crown(0.06));
  body(S, 22, 18.6, -26, 7, { rt: 6.4, rb: 2 });
  // the long, flat nose
  S.paint(
    fill(YEL, { rough: 0.35 }), vol(below(18.4), BLUE), vol((x, y, z) => Math.max(25.6 - y, 8.6 - z, Math.abs(x) - 8.6, z - 19.6), 0x2a3448, { facing: [0, 0.5, 0.86, 0.55] }),
    ...tface(0, 21.4, { near: 22, gap: 9, r: 1.6, eye: 'smug' }), under(0.2),
  );
  form(S, [0, 24.9, 0], [[6.6, 10.9, 9.2, 0], [10, 10.8, 8.6, -0.5], [15, 10.6, 6.8, -1.6], [20, 10, 4.8, -2.8], [24, 8.6, 3.2, -3.6], [26.4, 6, 2.2, -4], [27.6, 0.05, 0.05, -4.2]], { axis: 'z', pow: 3, n: 18 });
  S.paint(fill(0x3a3a42), under(0.2));
  S.extrude([[-10.6, 0], [10.6, 0], [8, -3], [-8, -3]].map(([x, y]) => [x, y + 16.2]), 20.6, 23.6);
  // the observation dome and its camera, which inspects your luck
  S.paint(fill(0x3a3a42, { rough: 0.4 }), crown(0.1));
  S.cyl([0, 33.8, -8], 4.6, 1, { segs: 18 });
  S.joint('camera', { pivot: [0, 34.8, -8], axis: 'y', min: -3.2, max: 3.2, rest: 0, g: [0, 3.14], idle: 0.3 }, () => {
    S.paint(fill(0xe8e4dc, { rough: 0.4 }), crown(0.1));
    S.box(-1.6, 34.8, -9.8, 1.6, 37.6, -6.4, { bevel: 0.5 });
    S.paint(fill(0x1e1e26, { rough: 0.1 }));
    S.at([0, 36.2, -6.4], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], 0.9, 1.2, { segs: 10 }));
  });
  S.clear(true);
  S.paint(fill(0xdcefe8));
  S.ball([0, 34.8, -8], [4.4, 4.4, 4.4], { segs: 18, rings: 8, v0: 0.5 });
  S.clear(false);
  panta(S, 33.8, -19);
}

void shade; void tint; void and; void tone; void blobs; void paw; void pair; void catHead; void above; void lerp; void poly;
