// Neko Kissaten Hidamari (ねこ喫茶ひだまり): chibi cats running a Shōwa coffee shop. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/neko_cafe.js. The family look: every cat is the same
// chibi sculpt (cat() below, also used by the other sets), each stands on the shop's wooden coaster.
import { spline, ring, QUAL } from '../sculpt.js';
import { loaf, paw, blade, eggShape } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, or, and, cut, stroke, pair, label, kana, below, above, band, blob, blobs,
} from '../paint.js';

const MAKER = 'HIDAMARI';
const lerp = (a, b, t) => a + (b - a) * t;
/** A lathe profile cut so no step is longer than `step` mm (a painted lathe's atlas patch is sized by its longest cell). */
/**
 * A smooth body lofted through rows [y, rx, rz, dz] (dz: that row pushed forward) round c, n points round, evenly cut:
 * a figure's atlas patch is sized by its largest cell, so even rows keep a painted head or body cheap.
 */
export function form(S, c, rows, o = {}) {
  const Z = o.axis === 'z';
  const R = spline(rows, o.steps ?? 2).map(([t, rx, ry, d = 0]) => (Z ? ring([c[0], c[1] + d, c[2] + t], Math.max(0.05, rx), Math.max(0.05, ry), o.n ?? 16, { pow: o.pow ?? 2.1, axis: 'z' }) : ring([c[0], c[1] + t, c[2] + d], Math.max(0.05, rx), Math.max(0.05, ry), o.n ?? 16, { pow: o.pow ?? 2.1 })));
  // which way the cells face, judged on the widest row (the loft's own guess, from the first cell, can go either way on a flat base)
  let j = 0, w = -1;
  R.forEach((r, k) => { if (k < R.length - 1 && Math.abs(r[0][0] - c[0]) > w) { w = Math.abs(r[0][0] - c[0]); j = k; } });
  const q = [R[j][0], R[j][1], R[j + 1][1], R[j + 1][0]], cen = R[j].reduce((a, p) => [a[0] + p[0] / R[j].length, a[1] + p[1] / R[j].length, a[2] + p[2] / R[j].length], [0, 0, 0]);
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
  const m = [(q[0][0] + q[2][0]) / 2 - cen[0], (q[0][1] + q[2][1]) / 2 - cen[1], (q[0][2] + q[2][2]) / 2 - cen[2]];
  S.grid(R, { closedU: true, flip: (Z ? nx * m[0] + ny * m[1] : nx * m[0] + nz * m[2]) < 0 });
  // flat ends (planar: they get an exact patch of the atlas, good for a painted face)
  const ctr = (r) => r.reduce((a, p) => [a[0] + p[0] / r.length, a[1] + p[1] / r.length, a[2] + p[2] / r.length], [0, 0, 0]), sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  if (o.caps === 'both' || o.caps === 'start') S.emit([R[0]], sub3(ctr(R[0]), ctr(R[1])));
  if (o.caps === 'both' || o.caps === 'end') S.emit([R[R.length - 1]], sub3(ctr(R[R.length - 1]), ctr(R[R.length - 2])));
  return S;
}
const HEAD = [[-8.8, 0.05, 0.05, 0.8], [-8.3, 4.2, 3.6, 0.8], [-6.8, 7.8, 6.6, 0.7], [-4.4, 10.2, 8.4, 0.5], [-1.4, 11, 8.9, 0.3], [1.6, 10.8, 8.8, 0], [4.6, 9.7, 8.1, -0.2], [7, 7.6, 6.7, -0.3], [8.6, 4.6, 4.3, -0.3], [9.3, 0.05, 0.05, -0.3]];
const BODY = [[7.4, 0.05, 0.05, 0], [7.7, 4.6, 4, 0], [9.2, 6.9, 6, 0.2], [11.8, 7.6, 6.6, 0.6], [15, 7.3, 6.4, 1], [18.2, 6.4, 5.6, 0.8], [21, 5, 4.4, 0.4], [23, 3.4, 3.1, 0.2], [23.9, 0.05, 0.05, 0]];
const SEAT = [[0.6, 0.05, 0.05, -0.8], [0.9, 5.4, 5, -0.8], [2.6, 8.2, 7.2, -0.6], [6, 8.6, 7.6, -0.2], [10.6, 7.8, 6.8, 0.4], [14.6, 6.6, 5.8, 0.4], [18.4, 4.8, 4.2, 0.2], [20.6, 3, 2.8, 0], [21.4, 0.05, 0.05, 0]];
/** Build something small (a figure at a fraction of its size) with fewer segments in the hand: fn() at QUAL x k. */
export function fine(k, fn) { const q = QUAL.k; QUAL.k = Math.max(1, q * k); try { fn(); } finally { QUAL.k = q; } }
export const dense = (prof, step = 2.5) => prof.flatMap((p, i) => { if (!i) return [p]; const q = prof[i - 1], n = Math.max(1, Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) / step)); return Array.from({ length: n }, (_, k) => [q[0] + (p[0] - q[0]) * (k + 1) / n, q[1] + (p[1] - q[1]) * (k + 1) / n]); });
const PINK = 0xf0a2a6, CREAM = 0xf4ead2, GREEN = 0x3f8f6a, WOOD = 0x9b6b47, BROWN = 0x6a4430, COFFEE = 0x5a3424;

/**
 * A chibi cat at the origin of the frame, facing +z, feet on y = 0 (about 42 mm tall standing, 37 sitting).
 * o: coat, light (muzzle, paws), pose 'stand' | 'sit', eye / eyeR / eyeCol / blush, headMarks / bodyMarks (extra paint
 * layers in the head's / the body's frame), outfit (layers on the torso only), sleeve, hand, feet, legCol, ear: [+x, -x],
 * arms: [hand at +x, hand at -x] (null: at rest, false: none), tail (path) | false, legs: false (a cat in a cup),
 * headRot, headJoint (joint def | false), onHead(S) (built in the head's frame: hats, glasses), face (more layers).
 */
export function cat(S, o = {}) {
  const C = o.coat ?? 0xeea456, L = o.light ?? 0xf8f3e8, sit = o.pose === 'sit', bm = o.bodyMarks || [], hm = o.headMarks || [];
  const hy = o.hy ?? (sit ? 27 : 31.5), sh = sit ? 17.6 : 20.4;
  if (o.legs !== false) {
    S.paint(fill(o.feet ?? L), under(0.2));
    if (!sit) for (const s of [1, -1]) paw(S, [s * 4.2, 0, 0.6], 5.8, 7.4, 3.1, { toes: 3 });
    else for (const s of [1, -1]) paw(S, [s * 6.4, 0, 2.6], 5.2, 6.8, 2.8, { toes: 3 });
    S.paint(fill(o.legCol ?? C), ...bm, under(0.15));
    if (!sit) for (const s of [1, -1]) S.tube([[s * 4.2, 1.6, -0.2], [s * 4.3, 5.4, -0.1], [s * 4.1, 9.6, 0]], [2.7, 3.3], { sides: 8, caps: false });
    else for (const s of [1, -1]) S.ball([s * 5.6, 5, -1.6], [3.9, 4.8, 6.2], { segs: 10, rings: 6 });
  }
  S.paint(fill(C), ...bm, ...(o.outfit || []), under(0.12));
  form(S, [0, 0, sit ? 0 : 0], sit ? SEAT : BODY);
  // arms (sitting with no arms given: the front legs)
  const hands = o.arms || [null, null];
  for (const [i, s] of [[0, 1], [1, -1]]) {
    const h = hands[i] ?? (sit ? [s * 3.3, 2.4, 5.2] : [s * 8.2, 12.6, 1.8]);
    if (h === false) continue;
    const a = [s * 5.6, sh, 0.6], m = [(a[0] + h[0]) / 2 + s * 1.4, (a[1] + h[1]) / 2 - 0.8, (a[2] + h[2]) / 2];
    S.paint(fill(o.sleeve ?? (sit ? o.legCol ?? C : C)), ...bm, under(0.15));
    S.tube(spline([a, m, h], 2), [2.6, 2.2], { sides: 8 });
    S.paint(fill(o.hand ?? L), proj('front', pair(seg(0.7, -1.2, 0.7, -2.2, 0.2)), tone(o.hand ?? L, 0.3)), under(0.2));
    S.ball(h, [2.5, 2.3, 2.6], { segs: 10, rings: 6 });
  }
  if (o.tail !== false && o.legs !== false) {
    const tp = o.tail || (sit ? [[0, 3.4, -7.4], [5.4, 2.2, -9.4], [10, 2.4, -5.4], [11.2, 2.6, 0.6]] : [[0, 9.4, -5.4], [0.8, 7.6, -10], [3, 11, -13], [4.4, 16.4, -12.4]]);
    S.paint(fill(o.tailCol ?? C), ...(o.tailMarks || []), under(0.15));
    S.tube(spline(tp, 3), (t) => lerp(2.3, 1.5, t), { sides: 8 });
  }
  const build = () => S.at([0, hy, 0.4], o.headRot || null, () => catHead(S, o));
  if (o.headJoint === false) build();
  else S.joint(o.headJoint?.name || 'head', { pivot: [0, hy - 8, 0.4], axis: 'z', min: -0.3, max: 0.3, rest: 0, idle: 0.06, ...(o.headJoint || {}) }, build);
}

/** A chibi cat's head in its own frame (centre at the origin, facing +z): the options of cat(). */
export function catHead(S, o = {}) {
  const C = o.coat ?? 0xeea456, L = o.light ?? 0xf8f3e8, hm = o.headMarks || [];
  S.paint(
    fill(C), ...hm, vol(blobs(blob([-2.3, -3.4, 7.8], [3.6, 3, 3.2]), blob([2.3, -3.4, 7.8], [3.6, 3, 3.2])), L),
    ...face({ at: [0, 0.8], gap: 9.2, r: o.eyeR ?? 1.6, eye: o.eye || 'dot', mouth: null, blush: o.blush === undefined ? 0xf09a9a : o.blush, col: o.eyeCol }),
    ...(o.face || []),
    o.whisker === false ? null : proj('front', pair(or(seg(6.6, -2.2, 10.2, -1.4, 0.34), seg(6.6, -3.3, 10.4, -3.7, 0.34))), o.whisker ?? tone(L, 0.45), { facing: 0.05 }),
    under(0.14), crown(0.06),
  );
  form(S, [0, 0, 0], HEAD, { pow: 2.3 });
  const mc = o.mouthCol ?? tone(L, 0.6);
  S.paint(fill(L), proj('front', or(seg(0, -2.4, 0, -3.3, 0.34), arc(-0.95, -3.3, 0.95, Math.PI, Math.PI * 2, 0.34), arc(0.95, -3.3, 0.95, Math.PI, Math.PI * 2, 0.34)), mc), under(0.15));
  for (const s of [1, -1]) S.ball([s * 1.7, -3.2, 8.3], [2.3, 1.9, 1.7], { segs: 10, rings: 6 });
  S.paint(fill(o.nose ?? PINK, { rough: 0.35 }));
  S.ball([0, -1.95, 9.55], [1, 0.72, 0.6], { segs: 8, rings: 5 });
  for (const s of [1, -1]) {
    S.paint(fill(o.ear?.[s > 0 ? 0 : 1] ?? C), proj('front', ellipse(0, 3, 1.9, 2.8), PINK), under(0.15));
    S.at([s * (o.earX ?? 5.4), 6.4, -0.6], [0.05, 0, -s * (o.earTilt ?? 0.4)], () => blade(S, ...(o.earSize ?? [7.6, 8, 2.2]), { shape: o.earShape || 'ear', cup: 0.9 }));
  }
  o.onHead?.(S);
}

/** The shop's coaster every figure stands on: walnut, a cream enamel face with the shop's name; the top is at y = 3.2. */
function coaster(S, r = 20) {
  S.paint(
    fill(WOOD), proj('top', circle(0, 0, r - 2.1), CREAM), proj('top', stroke(circle(0, 0, r - 3.1), 0.7), GREEN), proj('top', stroke(circle(0, 0, r - 4.3), 0.3), GREEN),
    proj('top', kana('ねこ喫茶', 0, -(r - 7.2), 3.2), BROWN), proj('top', or(ellipse(0, r - 7.6, 1.5, 1.2), circle(-1.6, r - 5.8, 0.6), circle(0, r - 5.3, 0.6), circle(1.6, r - 5.8, 0.6)), tone(CREAM, 0.3)),
    shade(vol(below(1)), 0.12), under(0.2), ...stamp(MAKER, { c: 0x5a3a26, px: 0.3 }),
  );
  S.lathe([...dense([[8, 0.5], [r - 1.4, 0.5]], 3), [r - 0.8, 0], [r, 0.8], [r, 3], [r - 0.6, 3.6], [r - 1.6, 3.6], [r - 1.8, 3.2]], { segs: 24, cap: true });
}
const TOP = 3.2;

/** A cup of coffee on its saucer standing on at[1]; o.col, o.rim, o.yaw, o.k (scale). */
function cup(S, at, o = {}) {
  const col = o.col ?? 0xf8f3e8, rim = o.rim ?? GREEN;
  S.at(at, [0, o.yaw || 0, 0], () => {
    S.paint(fill(col, { rough: 0.35 }), proj('top', stroke(circle(0, 0, 4.9), 0.4), rim), under(0.2));
    S.lathe([[4, 0], [5.3, 0.5], [5.6, 1], [5.1, 1.1], [2.6, 0.7]], { segs: 16, cap: true });
    S.paint(fill(col, { rough: 0.35 }), vol(band(5.1, 5.6), rim), under(0.2));
    S.lathe([[1.9, 0.7], [2.5, 1], [3.2, 2.6], [3.5, 5.4], [3.6, 6.2], [3.15, 6.2], [3.05, 5.2]], { segs: 16, cap: false });
    S.paint(fill(COFFEE, { rough: 0.15 }), proj('top', stroke(circle(-0.3, 0.4, 1.6), 0.5), tint(COFFEE, 0.4)));
    S.cyl([0, 5.4, 0], 3.1, 0.2, { segs: 16, bevel: 0 });
    S.paint(fill(col, { rough: 0.35 }));
    S.tube(spline([[3.3, 5, 0], [5.3, 4.9, 0], [5.6, 3.3, 0], [3.2, 2.4, 0]], 3), 0.55, { sides: 6 });
  }, o.k ?? 1);
}

/** A cream-soda goblet, its foot at the origin, about 21 mm tall: clear glass, melon soda, a scoop and a cherry. */
function creamSoda(S, k = 1) {
  S.at([0, 0, 0], null, () => {
    S.paint(fill(0x8fd88e, { rough: 0.2 }), proj('front', or(circle(-1, 8, 0.5), circle(1.4, 10.6, 0.4), circle(-0.4, 12, 0.35)), tint(0x8fd88e, 0.5)));
    S.lathe([[0, 5.3], [1.3, 5.3], [2.8, 8], [3.3, 12.5], [3.35, 13.6], [0, 13.6]], { segs: 14 });
    S.paint(fill(0xf8f0dc), under(0.12));
    S.ball([0, 14.2, 0], [3.4, 2.5, 3.4], { segs: 12, rings: 7 });
    for (const a of [0.4, 2.3, 4.1]) S.ball([Math.sin(a) * 2.9, 12.7, Math.cos(a) * 2.9], [1.1, 1.3, 1.1], { segs: 8, rings: 5 });
    S.paint(fill(0xd8323a, { rough: 0.2 }));
    S.ball([0.6, 17.4, 0.4], 1.25, { segs: 10, rings: 6 });
    S.paint(fill(0x5f8a3a));
    S.tube(spline([[0.6, 18.4, 0.4], [0.2, 19.8, -0.2], [-0.8, 20.6, -0.8]], 2), 0.18, { sides: 4 });
    S.paint(fill(0xf6f2ea), vol((x, y) => Math.abs(((y * 0.9) % 2) - 1) - 0.5, 0xe04a4a));
    S.tube([[-1.2, 9, -0.8], [-2.6, 22.6, -2]], 0.42, { sides: 8 });
    S.clear(true);
    S.paint(fill(0xe8f4ee));
    S.lathe([[2.6, 0], [2.6, 0.5], [0.8, 1.1], [0.7, 3.6], [1.6, 4.7], [3.2, 8], [3.7, 12.5], [3.8, 15], [3.45, 15], [3.4, 12.5], [2.9, 8], [1.4, 5.1], [0, 5.1]], { segs: 14, cap: 'bottom' });
    S.clear(false);
  }, k);
}

// ------------------------------------------------------------------ 1. Barista Tora
export function tora(S) {
  const ORANGE = 0xeda45c, DARK = 0xc8743a, KETTLE = 0xe9e4da;
  coaster(S, 21);
  const stripes = [proj('back', or(seg(-5, 21, 5, 20, 1), seg(-6, 17, 6, 16.4, 1), seg(-6, 13, 6, 12.6, 1)), DARK), proj('right', or(seg(-3, 19, 2, 18, 0.8), seg(-3, 15, 3, 14.6, 0.8)), DARK), proj('left', or(seg(-3, 19, 2, 18, 0.8), seg(-3, 15, 3, 14.6, 0.8)), DARK)];
  S.at([-6, TOP, -1.5], [0, 0.3, 0], () => {
    cat(S, {
      coat: ORANGE, eye: 'dot', bodyMarks: stripes,
      headMarks: [proj('front', or(seg(-1.7, 7.4, -1.3, 4.8, 0.75), seg(0, 8, 0, 5.2, 0.75), seg(1.7, 7.4, 1.3, 4.8, 0.75)), DARK), proj('right', or(seg(-4, 3, 1, 2, 0.9), seg(-4, -0.5, 1, -1, 0.9)), DARK), proj('left', or(seg(-1, 2, 4, 3, 0.9), seg(-1, -1, 4, -0.5, 0.9)), DARK), proj('back', or(seg(-4, 5, 4, 5, 1), seg(-5, 1, 5, 1, 1)), DARK)],
      outfit: [proj('front', or(rbox(0, 13.2, 6.2, 6.4, 1.6), rbox(0, 20.6, 3.4, 2.2, 0.6)), GREEN, { facing: 0.25 }), proj('front', rbox(0, 12.4, 2.8, 1.6, 0.4), tone(GREEN, 0.2), { facing: 0.25 }), proj('front', pair(seg(3.2, 22.6, 5.4, 24.6, 0.7)), GREEN), proj('back', seg(-7, 15.6, 7, 15.6, 0.8), GREEN)],
      tailMarks: [vol(band(14, 18), DARK)],
      arms: [[8.4, 19.4, 6.4], [5.6, 14.8, 7.6]],
      headRot: [0.22, 0.12, 0],
    });
    // the drip kettle: enamel, a gooseneck spout; the cat tips it a drop at a time
    S.joint('kettle', { pivot: [8.4, 19.4, 6.4], axis: [-0.3, 0, 1], min: -0.6, max: 0.1, rest: 0, g: [0, -0.42], idle: 0.03 }, () => {
      S.paint(fill(KETTLE, { rough: 0.35 }), vol(band(14.6, 15.4), GREEN), proj('front', kana('ドリップ', 0, 18.4, 2), BROWN), under(0.2), crown(0.06));
      S.lathe(dense([[0, 14.2], [3.6, 14.2], [4.5, 15], [4.8, 17.4], [4.1, 19.6], [2.4, 20.8], [0, 21]], 1.6), { segs: 16, at: [11.8, 0, 8.2] });
      S.paint(fill(0x3a3438));
      S.lathe([[1.8, 20.6], [1.8, 21.2], [1.2, 21.6], [0.5, 21.8], [0.5, 22.6], [0, 23]], { segs: 10, at: [11.8, 0, 8.2] });
      S.tube(spline([[9.4, 20.2, 7.2], [8, 20.8, 6.8], [7.4, 18.6, 6.6], [8.4, 16, 7.2]], 3), 0.65, { sides: 6 });
      S.paint(fill(KETTLE, { rough: 0.35 }));
      S.tube(spline([[14.4, 15.6, 9.6], [16.2, 16.4, 10.8], [17.2, 19.6, 11.6], [17.6, 21.2, 12], [17.8, 20.2, 12.4]], 3), (t) => lerp(0.85, 0.5, t), { sides: 6 });
    });
    // the pour-over: a dripper on a cup, on its saucer
    cup(S, [17.6, 0, 12.4], { yaw: -0.4 });
    S.paint(fill(0xf4f0e8, { rough: 0.35 }), vol(band(6.8, 7.4), GREEN), under(0.2));
    S.lathe([[3.9, 6.2], [3.9, 6.9], [1.7, 7.1], [4.3, 11.6], [3.8, 11.6], [1.4, 7.8], [0, 7.8]], { segs: 16, at: [17.6, 0, 12.4] });
    S.paint(fill(0x6e4a32), proj('top', or(circle(16.8, -12.4, 0.5), circle(18.4, -11.6, 0.4), circle(17.4, -13.6, 0.4)), 0x4a3024));
    S.cyl([17.6, 10.6, 12.4], 3.4, 0.3, { segs: 16, bevel: 0 });
  });
}

// ------------------------------------------------------------------ 2. Waiter Shiro
export function shiro(S) {
  const WHITE = 0xf7f3ec, VEST = 0x2e2c3a, SILVER = 0xc9ccd2, RED = 0xd23a3a;
  coaster(S, 19);
  S.at([0, TOP, -1], null, () => {
    const vest = or(poly([[-8, 6], [-0.8, 6], [-0.8, 15], [-3.2, 22.6], [-8, 22.6]]), poly([[8, 6], [0.8, 6], [0.8, 15], [3.2, 22.6], [8, 22.6]]));
    cat(S, {
      coat: WHITE, light: 0xfdfbf6, eye: 'line', eyeR: 1.7, blush: 0xf2a8a8, ear: [0xf0e6dc, WHITE],
      outfit: [proj('front', vest, VEST, { facing: 0.05 }), proj('back', rbox(0, 14.4, 8, 8.4, 0), VEST), proj('right', rbox(0, 14.4, 8, 8.4, 0), VEST), proj('left', rbox(0, 14.4, 8, 8.4, 0), VEST), proj('front', or(circle(0, 9, 0.5), circle(0, 11.6, 0.5), circle(0, 14.2, 0.5)), 0xd9b25a)],
      legCol: 0x3a3846, feet: 0x2a2830, sleeve: WHITE,
      arms: [[5.4, 13.2, -4.8], [-9.6, 27.4, 2.8]],
    });
    // the bow tie
    S.paint(fill(RED, { rough: 0.45 }), proj('front', pair(seg(1.2, 23.2, 3.4, 23.6, 0.3)), tone(RED, 0.25)), under(0.2));
    for (const s of [1, -1]) S.at([s * 2.3, 23.1, 6.2], [0, 0, s * Math.PI / 2], () => S.at([0, -2.2, 0], null, () => blade(S, 4.4, 3.4, 1.4, { shape: 'round' })));
    S.ball([0, 23.1, 6.6], [1.1, 1, 0.9], { segs: 8, rings: 5 });
    // the tray, at shoulder height, perfectly level, going nowhere
    S.joint('tray', { pivot: [-9.6, 28.8, 2.8], axis: 'x', min: -0.25, max: 0.25, rest: 0, g: [0, 0.16], idle: 0.04 }, () => {
      S.paint(fill(SILVER, { rough: 0.25 }), proj('top', stroke(circle(-10.4, -2.8, 5.6), 0.3), tone(SILVER, 0.15)), under(0.15));
      S.lathe([[0, 0], [6.2, 0], [7, 0.4], [7.2, 1.2], [6.8, 1.2], [6.5, 0.6], [0, 0.6]], { segs: 18, at: [-10.4, 29, 2.8] });
      S.at([-10.4, 29.6, 2.8], null, () => creamSoda(S, 1.05));
    });
  });
}

// ------------------------------------------------------------------ 3. Kuro & Hot Cake
export function kuro(S) {
  const BLACK = 0x3a3442, CAKE = 0xf0d39a, CRUST = 0xbb7a40, SYRUP = 0x9a4e1e;
  coaster(S, 19);
  S.at([0, TOP, -3], null, () => {
    cat(S, {
      coat: BLACK, light: 0x4a4454, eye: 'bead', eyeCol: 0xf0c64a, eyeR: 1.75, blush: 0xc87a8a, whisker: 0x8a8296, mouthCol: 0x8a8296, nose: 0x8a6a7a,
      face: [proj('front', pair(ellipse(4.6, 0.8, 0.5, 1.35)), EYE)],
      arms: [[5, 14.2, 9], [-5, 14.2, 9]],
      headJoint: { axis: 'x', pivot: [0, 23.5, 0.4], min: -0.1, max: 0.35, g: [0, 0.3], idle: 0.03 },
      tail: [[0, 9.4, -5.4], [-1.4, 7.6, -10], [-5, 10, -12.6], [-8, 14, -10], [-8.6, 17.4, -8]],
      onHead: (S) => { S.paint(fill(0xf28a96, { rough: 0.35 })); S.ball([1.5, -4.6, 8.4], [1.2, 0.9, 0.9], { segs: 8, rings: 5 }); },
    });
    // collar and bell
    S.paint(fill(0xd23a3a, { rough: 0.45 }));
    S.torus([0, 22.6, 0.6], 4.6, 0.8, { segs: 16, sides: 6 });
    S.paint(fill(0xe2b84a, { rough: 0.25 }), proj('front', seg(0, 20.6, 0, 21.6, 0.3), 0x8a6a2a));
    S.ball([0, 21.6, 5.6], 1.3, { segs: 10, rings: 6 });
    // the hot cakes: three, a butter, the syrup
    S.paint(fill(0xf8f4ec, { rough: 0.35 }), proj('top', stroke(circle(0, -10.6, 6.4), 0.5), 0x3f6fb0), under(0.2));
    S.lathe([[0, 0], [3.6, 0], [4, 0.5], [6.6, 1.2], [7, 1.6], [6.6, 1.6], [3.8, 0.9], [0, 0.9]], { segs: 18, at: [0, 14.6, 10.6] });
    for (let i = 0; i < 3; i++) S.at([0, 15.6 + i * 2.1, 10.6], [0, i * 0.7, 0], () => {
      S.paint(fill(CAKE), vol(below(0.45), CRUST), vol(above(1.6), CRUST), under(0.1));
      S.lathe([[0, 0], [4.8, 0], [5.3, 0.4], [5.5, 1.1], [5.2, 1.8], [4.6, 2.05], [0, 2.05]], { segs: 16 });
    });
    S.paint(fill(SYRUP, { rough: 0.12 }));
    S.ball([0, 21.8, 10.6], [4.6, 0.55, 4.6], { segs: 14, rings: 4 });
    for (const [a, l] of [[0.5, 3.6], [1.9, 2.4], [-0.9, 4.4]]) S.tube(spline([[Math.sin(a) * 4.4, 21.8, 10.6 + Math.cos(a) * 4.4], [Math.sin(a) * 5.5, 20.6, 10.6 + Math.cos(a) * 5.5], [Math.sin(a) * 5.6, 21.6 - l, 10.6 + Math.cos(a) * 5.6]], 2), (t) => lerp(0.75, 0.55, t), { sides: 6 });
    S.paint(fill(0xf8e28a, { rough: 0.3 }), crown(0.1));
    S.at([0.4, 22.2, 10.4], [0, 0.4, 0.06], () => S.box(-1.6, 0, -1.3, 1.6, 1.2, 1.3, { bevel: 0.35 }));
  });
}

// ------------------------------------------------------------------ 4. Cream Soda Mike
export function mike(S) {
  const WHITE = 0xf8f4ec, ORANGE = 0xe99a52, BLACK = 0x3a3442, SODA = 0x8fd88e;
  coaster(S, 15);
  // the soda and its ice
  S.paint(fill(SODA, { rough: 0.2 }), proj('front', or(circle(-4, 22, 0.8), circle(3, 28, 0.6), circle(-1, 33, 0.7), circle(5, 37, 0.5), circle(-6, 38, 0.6)), tint(SODA, 0.5)), proj('top', stroke(circle(0, 0, 10.6), 0.6), tint(SODA, 0.3)));
  S.lathe(dense([[3.4, 14.4], [7.6, 20], [10.2, 30], [11, 39.6]], 2.4), { segs: 18, at: [0, TOP, 0], cap: true });
  S.paint(fill(0xe4f2f4, { rough: 0.12 }), crown(0.1), shade(vol(below(TOP + 39.8)), 0.12));
  for (const [x, z, r] of [[-7, 2, 0.4], [6.4, -3.6, -0.5], [-2.4, -7.4, 0.9], [4.6, 5.4, 0.2]]) S.at([x, TOP + 40.2, z], [0.3, r, 0.25], () => S.box(-2.2, -2.2, -2.2, 2.2, 2.2, 2.2, { bevel: 0.8 }));
  // the straw
  S.paint(fill(0xf6f2ea), vol((x, y) => Math.abs(((y * 0.7) % 2) - 1) - 0.5, 0xe04a4a));
  S.tube([[5.4, 26, -3], [9.6, 60, -8]], 0.7, { sides: 8 });
  // Mike, in it to the shoulders
  S.joint('mike', { slide: [0, 7, 0], min: 0, max: 1, rest: 0, g: [0, 1], idle: 0.05 }, () => S.at([0, TOP + 17, -1], null, () => cat(S, {
    coat: WHITE, light: 0xfdfaf4, legs: false, eye: 'dot', ear: [ORANGE, BLACK],
    headMarks: [vol(blob([5.4, 3.6, 3], [5, 5, 7]), ORANGE), vol(blob([-6.4, 5, 1], [4.6, 4.6, 6]), BLACK), vol(blob([-1.4, 8.4, -4], [4, 3, 6]), ORANGE)],
    bodyMarks: [vol(blob([-5, 20, -3], [4, 4, 5]), ORANGE)],
    arms: [[8.4, 23.4, 6.2], [-8.4, 23.4, 6.2]],
    onHead: (S) => {
      S.paint(fill(0xfaf3e0), under(0.12));
      S.ball([0, 9.6, -0.6], [6.4, 4.2, 6.2], { segs: 14, rings: 7 });
      for (const a of [0.6, 2.2, 3.6, 5]) S.ball([Math.sin(a) * 5.4, 7.8, -0.6 + Math.cos(a) * 5.2], [1.6, 1.8, 1.6], { segs: 8, rings: 5 });
      S.paint(fill(0xd8323a, { rough: 0.2 }));
      S.ball([0.8, 14.6, 0], 1.7, { segs: 10, rings: 6 });
      S.paint(fill(0x5f8a3a));
      S.tube(spline([[0.8, 16, 0], [0, 18, -0.6], [-1.4, 19, -1.2]], 2), 0.22, { sides: 4 });
    },
  })));
  // the goblet
  S.clear(true);
  S.paint(fill(0xe8f4ee));
  S.lathe([[8.4, 0], [8.4, 1.2], [2.2, 2.4], [1.6, 10], [3.6, 14], [8, 19.6], [10.8, 30], [11.7, 40.4], [12, 46], [11.3, 46], [11, 40.4], [10.1, 30], [7.4, 20], [3.2, 14.2], [0, 14.2]], { segs: 18, at: [0, TOP, 0], cap: 'bottom' });
  S.clear(false);
}

// ------------------------------------------------------------------ 5. Siphon Master Hachi
export function hachi(S) {
  const BLACK = 0x3a3442, WHITE = 0xf8f4ec, VEST = 0x8a5a3a, BRASS = 0xc9a24a, GLASS = 0xe8f4f2;
  coaster(S, 21);
  S.at([-7, TOP, -1], [0, 0.35, 0], () => {
    const mask = (x, y, z) => Math.max(y - (4.2 - 0.7 * Math.abs(x)), 2 - z);
    cat(S, {
      coat: BLACK, light: WHITE, eye: 'dot', eyeR: 1.5, whisker: 0xb0a8b0, ear: [BLACK, BLACK], legCol: BLACK, feet: WHITE,
      headMarks: [vol(mask, WHITE)],
      outfit: [vol(blob([0, 20, 5.6], [3.6, 4.4, 2.6]), WHITE), proj('front', cut(rbox(0, 14.4, 8, 6.8, 1), poly([[-2.6, 21.6], [2.6, 21.6], [0, 14.4]])), VEST, { facing: 0.05 }), proj('back', rbox(0, 14.4, 8, 6.8, 0), VEST), proj('right', rbox(0, 14.4, 8, 6.8, 0), VEST), proj('left', rbox(0, 14.4, 8, 6.8, 0), VEST), proj('front', or(circle(1.4, 12, 0.45), circle(1.4, 9.6, 0.45)), BRASS)],
      arms: [[10.4, 25.6, 7.4], [-6.6, 13.6, 6]],
      onHead: (S) => {
        // the glasses (frames only: no lenses, for the science look)
        S.paint(fill(0x6a4a2a, { rough: 0.3 }));
        for (const s of [1, -1]) S.at([s * 4.6, 0.8, 9.4 - 0.2], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 2.7, 0.34, { segs: 16, sides: 5 }));
        S.tube(spline([[-1.9, 1.2, 9.6], [0, 1.9, 10], [1.9, 1.2, 9.6]], 2), 0.3, { sides: 5 });
        for (const s of [1, -1]) S.tube([[s * 7.2, 1, 8], [s * 9.6, 1.4, 3.4], [s * 9.4, 1.2, -1.6]], 0.28, { sides: 4 });
      },
    });
    // the bamboo paddle
    S.paint(fill(0xd9c08a), under(0.2));
    S.tube([[10.4, 27.6, 7.6], [15.2, 19.4, 9.2]], 0.45, { sides: 6, flat: [1.8, 0.6] });
  });
  // the siphon: stand, lamp, flask, funnel
  const X = 9.6, Z = 5;
  S.paint(fill(0x3a3438, { rough: 0.4 }), crown(0.1), under(0.2));
  S.cyl([X, TOP, Z], 5.6, 1.4, { segs: 16, bevel: 0.4 });
  S.tube([[X, TOP + 1.2, Z - 5.2], [X, TOP + 32, Z - 5.2]], 0.7, { sides: 8 });
  S.paint(fill(BRASS, { rough: 0.25 }));
  S.tube([[X, TOP + 22, Z - 5.2], [X, TOP + 22, Z - 3.4]], 0.5, { sides: 6 });
  S.torus([X, TOP + 22, Z], 3.4, 0.45, { segs: 14, sides: 5 });
  S.torus([X, TOP + 12.4, Z], 3.6, 0.45, { segs: 14, sides: 5 });
  S.tube([[X, TOP + 12.4, Z - 5.2], [X, TOP + 12.4, Z - 3.6]], 0.5, { sides: 6 });
  // the alcohol lamp and its flame (a solid, painted flame: no glow)
  S.paint(fill(0xe86a2a, { rough: 0.5 }), vol(above(TOP + 7.9), 0xf6c84a));
  S.lathe(spline([[0, 0], [0.9, 0.6], [0.7, 1.8], [0.2, 2.9], [0, 3.2]], 2), { segs: 8, at: [X, TOP + 6, Z] });
  S.paint(fill(0xf6f2ea));
  S.cyl([X, TOP + 5.2, Z], 0.4, 1, { segs: 6 });
  // coffee in the flask, and rising in the funnel
  S.paint(fill(COFFEE, { rough: 0.15 }));
  S.ball([X, TOP + 15.8, Z], [4.4, 4.4, 4.4], { segs: 14, rings: 8, v1: 0.55 });
  S.paint(fill(0x8a5a3a), proj('top', or(circle(X - 1, -Z + 0.6, 0.6), circle(X + 1.2, -Z - 0.6, 0.5)), tint(0x8a5a3a, 0.3)));
  S.lathe([[0, 21], [0.6, 21], [0.6, 24.4], [2.4, 26], [2.9, 30.4], [0, 30.4]], { segs: 14, at: [X, TOP, Z] });
  S.clear(true);
  S.paint(fill(GLASS));
  S.lathe([[1.4, 1.4], [2.6, 1.4], [2.8, 2.6], [2.4, 4.6], [0, 4.6]], { segs: 12, at: [X, TOP, Z] });
  S.ball([X, TOP + 16.4, Z], [5, 5.2, 5], { segs: 16, rings: 9 });
  S.lathe([[0.9, 9], [0.9, 23.6], [2.9, 25.6], [3.3, 33], [3.6, 33.6], [3.1, 33.6], [2.7, 26], [0, 24.4]], { segs: 14, at: [X, TOP, Z], cap: false });
  S.clear(false);
}

// ------------------------------------------------------------------ 6. Morning Set Counter
export function morning(S) {
  const GREY = 0xb8b4bc, GDARK = 0x8a8692, TOAST = 0xe8b064, CRUSTC = 0xa86a34;
  // the counter: a wood top over green-and-cream tiles
  S.paint(fill(0x6a4a34), under(0.2), ...stamp(MAKER, { c: 0xc8b090 }));
  S.box(-27, 0, -14, 27, 2.4, 14, { bevel: 0.8 });
  const checker = { d: (u, v) => (((Math.floor((u + 60) / 3.3) + Math.floor(v / 3.3)) % 2) ? -0.5 : 0.5), b: null };
  S.paint(fill(CREAM), proj('front', and(checker, rbox(0, 11.3, 23, 8.2, 0)), GREEN), proj('front', stroke(rbox(0, 11.3, 23, 8.2, 0), 0.4), tone(CREAM, 0.3)), under(0.2));
  S.box(-24, 2.4, -9, 24, 20, 8.4, { bevel: 0.4 });
  S.paint(fill(WOOD), proj('front', seg(-25.5, 21.2, 25.5, 21.2, 0.3), tone(WOOD, 0.25)), proj('top', or(arc(-14, 30, 26, -1.9, -1.2, 0.25), arc(6, -30, 28, 1.3, 1.9, 0.25)), tone(WOOD, 0.15)), crown(0.06), under(0.2));
  S.box(-26, 20, -10.4, 26, 22.6, 10.6, { bevel: 0.8 });
  const T = 22.6;
  // the morning set: thick toast with butter, a boiled egg, the coffee
  S.paint(fill(0xf8f4ec, { rough: 0.35 }), proj('top', stroke(circle(-15, -2.4, 6.6), 0.4), 0xd8a03a), under(0.2));
  S.lathe(dense([[0, 0], [4.4, 0], [4.8, 0.4], [7, 0.9], [7.4, 1.3], [7, 1.3], [4.6, 0.8], [0, 0.8]], 2), { segs: 18, at: [-15, T, 2.4] });
  S.at([-15, T + 0.9, 2.4], [0, 0.3, 0], () => {
    S.paint(fill(CRUSTC), proj('top', rbox(0, 0, 4.6, 4.2, 1.2), TOAST), proj('top', or(seg(-3, -2, 2, 3, 0.25), seg(-1, -3.6, 3.6, 1, 0.25)), tone(TOAST, 0.2)));
    S.box(-5.2, 0, -4.8, 5.2, 4.2, 4.8, { bevel: 1.1 });
    S.paint(fill(0xf8e28a, { rough: 0.25 }));
    S.at([0.6, 4.2, 0.2], [0, 0.6, 0], () => S.box(-1.5, 0, -1.3, 1.5, 0.9, 1.3, { bevel: 0.3 }));
    S.ball([0.6, 4.2, 0.2], [2.8, 0.25, 2.4], { segs: 10, rings: 3 });
  });
  S.paint(fill(0xf8f4ec, { rough: 0.35 }), vol(band(T + 3.2, T + 3.7), 0xd8a03a), under(0.2));
  S.lathe([[2.4, 0], [2.6, 0.6], [1, 1.2], [1, 2.4], [2.6, 3.2], [3, 5.6], [2.6, 5.6], [0, 4]], { segs: 14, at: [-4.6, T, 4.6] });
  S.paint(fill(0xf8f2e6, { rough: 0.4 }), crown(0.06));
  eggShape(S, [-4.6, T + 3.6, 4.6], 2.4, 6.4);
  cup(S, [5, T, 4], { yaw: 0.5, rim: 0xd8a03a });
  // a bud vase with one flower
  S.paint(fill(0x6aa04a));
  S.tube(spline([[21, T + 7, -6], [21.4, T + 11, -6.2], [21, T + 14.6, -5.8]], 2), 0.3, { sides: 4 });
  S.paint(fill(0xf2c83a), crown(0.1));
  for (let k = 0; k < 5; k++) S.at([21, T + 14.8, -5.8], [0.5, k * 1.257, 0], () => blade(S, 2.6, 1.8, 0.5, { shape: 'round' }));
  S.paint(fill(0xd88a2a));
  S.ball([21, T + 14.9, -5.6], 0.8, { segs: 8, rings: 5 });
  S.clear(true);
  S.paint(fill(0xdcefe8));
  S.lathe([[0, 0], [1.8, 0], [2.4, 2.4], [1.4, 5.6], [0.9, 7.4], [1.2, 8], [0.7, 8], [0, 7]], { segs: 12, at: [21, T, -6] });
  S.clear(false);
  // the grey tabby who came with the set, asleep on the counter in a red neckerchief
  S.paint(fill(GREY), proj('top', or(seg(-2.4, 6, -2.4, -6, 1), seg(0.4, 7, 0.4, -7, 1), seg(3, 6, 3, -6, 1)), GDARK), under(0.15));
  S.at([12, T, -3], [0, Math.PI / 2 + 0.15, 0], () => {
    loaf(S, [0, 4.4, -1], [6.4, 4.6, 10], { flat: 0.9 });
    S.paint(fill(GREY), vol(band(T - T + 1.2, 2.4), GDARK), under(0.15));
    S.tube(spline([[0, 2.4, -10], [-4, 1.6, -13], [-9, 1.6, -11], [-11, 1.8, -6]], 3), (t) => lerp(2, 1.4, t), { sides: 8 });
    S.paint(fill(0xf4f0e8), under(0.2));
    for (const s of [1, -1]) paw(S, [s * 2.6, 0, 8.4], 4, 5.6, 2.4, { toes: 3 });
  });
  S.joint('head', { pivot: [18, T + 6, -2], axis: [0.15, 0, 1], min: -0.1, max: 0.6, rest: 0, g: [0, 0.5], idle: 0.03 }, () => S.at([19.6, T + 5.8, -0.4], [-0.1, -0.5, 0.35], () => {
    catHead(S, { coat: GREY, light: 0xf4f0e8, eye: 'closed', headMarks: [proj('front', or(seg(-1.7, 7.4, -1.3, 4.8, 0.75), seg(0, 8, 0, 5.2, 0.75), seg(1.7, 7.4, 1.3, 4.8, 0.75)), GDARK), proj('right', or(seg(-4, 3, 1, 2, 0.9), seg(-4, -0.5, 1, -1, 0.9)), GDARK), proj('left', or(seg(-1, 2, 4, 3, 0.9), seg(-1, -1, 4, -0.5, 0.9)), GDARK)] });
    S.paint(fill(0xd23a3a, { rough: 0.6 }), proj('front', or(circle(-3, -8.6, 0.5), circle(2.4, -9.2, 0.5), circle(0, -7.6, 0.5)), 0xf6f2ea));
    S.loft([ring([0, -8.2, -0.4], 7, 6.4, 14), ring([0, -6.8, -0.2], 7.4, 6.8, 14)]);
  }, 0.8));
}

// ------------------------------------------------------------------ 7. Kissaten Storefront
export function store(S) {
  const BRICK = 0xb8644a, MORTAR = 0xe6d8c4, TILE = 0x7a5a44, FRAME = 0x5a3a2a, RED = 0xd8443a;
  // the pavement
  S.paint(fill(0xbcb6ac), proj('top', or(...[-18, -6, 6, 18].map((x) => seg(x, -18, x, 2, 0.3)), seg(-28, -6, 28, -6, 0.3)), tone(0xbcb6ac, 0.2)), under(0.2), ...stamp(MAKER, { c: 0x6a6460 }));
  S.box(-28, 0, -16, 28, 2, 18, { bevel: 0.7 });
  // the house: brick above, tiles below, a dark warm room behind the glass
  const bricks = { d: (u, v) => { const r = Math.floor(v / 2.2), uu = u + (r % 2) * 2.4; const du = Math.abs(((uu % 4.8) + 4.8) % 4.8 - 2.4), dv = Math.abs(((v % 2.2) + 2.2) % 2.2 - 1.1); return Math.max(-(2.4 - du) + 0.25, -(1.1 - dv) + 0.25) > 0 ? -1 : 1; }, b: null };
  S.paint(fill(BRICK), proj('front', bricks, MORTAR, { near: -2.4 }), proj('front', rbox(0, 5, 30, 3.2, 0), TILE, { near: -2.4 }), proj('front', stroke(rbox(0, 5, 30, 3.2, 0), 0.25), tone(TILE, 0.3), { near: -2.4 }), shade(vol(below(9)), 0.05), under(0.2));
  // the front wall, with real openings for the window and the door
  for (const [a, b, c, d] of [[-26, 2, -23, 46], [5, 2, 7.6, 46], [23, 2, 26, 46], [-23, 2, 5, 8.4], [-23, 31.6, 7.6, 46], [7.6, 33, 23, 46]]) S.box(a, b, -4.4, c, d, -2);
  S.box(-26, 2, -14, 26, 46, -12.6, { bevel: 0.5 });
  for (const x of [-26, 24.6]) S.box(x, 2, -12.6, x + 1.4, 46, -4.4);
  // inside: a warm brown room, a shelf of cups, the floor
  S.paint(fill(0x7a4a34), proj('front', or(seg(-24, 24, 22, 24, 0.5), seg(-24, 17, 3, 17, 0.4)), 0x5a3424, { far: -12 }), shade(vol(below(12)), 0.15));
  S.box(-24.6, 2, -12.6, 24.6, 45, -12.4);
  S.paint(fill(0x8a6a4a));
  S.box(-24.6, 2, -12.4, 24.6, 2.4, -4.4); S.box(-24.6, 44.6, -12.4, 24.6, 45, -4.4);
  S.paint(fill(0xf4f0e8, { rough: 0.35 }));
  for (const x of [-20, -16.4, -12.8, 13, 16.6]) S.cyl([x, 24.4, -11.4], [0.9, 1.1], 1.8, { segs: 10 });
  // window frame, sill, and the cat on the sill
  S.paint(fill(FRAME, { rough: 0.5 }), under(0.2), crown(0.08));
  for (const [a, b, c, d] of [[-23, 9, 5, 10.6], [-23, 30, 5, 31.6], [-23, 9, -21.4, 31.6], [3.4, 9, 5, 31.6], [-9.8, 10.6, -8.6, 30]]) S.box(a, b, -2.6, c, d, -0.8);
  S.box(-23.6, 8.4, -2.6, 5.6, 9.4, 1.4, { bevel: 0.3 });
  S.paint(fill(0xc89a6a));
  S.box(-22.4, 9.4, -9.4, 4, 10.6, -4.4);
  fine(0.6, () => S.at([-14, 10.6, -7.2], [0, 0.4, 0], () => cat(S, { coat: 0xeda45c, pose: 'sit', eye: 'closed', headJoint: { idle: 0.04 }, headMarks: [proj('front', or(seg(-1.7, 7.4, -1.3, 4.8, 0.75), seg(0, 8, 0, 5.2, 0.75), seg(1.7, 7.4, 1.3, 4.8, 0.75)), 0xc8743a)] }), 0.5));
  S.clear(true);
  S.paint(fill(0xdcefe8));
  S.box(-21.6, 10.6, -1.9, 3.6, 30, -1.5);
  S.clear(false);
  // the awning, red and cream
  S.paint(fill((x, y, z) => (Math.floor((z + 60) / 4.4) % 2 ? RED : CREAM)), under(0.18));
  S.at([0, 0, 0], [0, -Math.PI / 2, 0], () => S.extrude([[-2, 38.6], [1, 37.8], [5, 35.4], [8.4, 32], [8.4, 29.6], [7.6, 29.6], [7.6, 31.6], [4.4, 34.6], [0.6, 36.8], [-2, 37.4]], -25, 25));
  // the name board
  S.paint(fill(0x3f6a52), proj('front', stroke(rbox(0, 42.4, 15, 2.8, 0.6), 0.45, 0.6), 0xe8d8a8), proj('front', kana('ねこ喫茶', -5.6, 42.4, 3.6), 0xf4ead2), proj('front', label('COFFEE', 8.6, 42.4, 0.42), 0xf2c84a, { hard: true }), under(0.2));
  S.box(-16, 39, -2.4, 16, 45.8, -0.6, { bevel: 0.5 });
  // the roof edge
  S.paint(fill(0x4a4a56), crown(0.1), under(0.2));
  S.box(-27.4, 46, -15, 27.4, 48.4, -0.4, { bevel: 0.6 });
  // the door (it opens), its bell
  S.paint(fill(FRAME, { rough: 0.5 }), under(0.2));
  S.box(7.6, 2, -2.6, 9, 33, -0.6); S.box(21.6, 2, -2.6, 23, 33, -0.6); S.box(7.6, 31.6, -2.6, 23, 33, -0.6);
  S.joint('door', { pivot: [21.6, 0, -1.4], axis: 'y', min: 0, max: 1.4, rest: 0, g: [0, 1.25], idle: 0 }, () => {
    S.paint(fill(0x8a5a3a, { rough: 0.5 }), proj('front', stroke(rbox(15.3, 9, 4.8, 5, 0.4), 0.4), tone(0x8a5a3a, 0.25)), proj('front', rbox(15.3, 26, 4.6, 0.8, 0), 0xf4ead2), proj('front', label('OPEN', 15.3, 26, 0.32), RED, { hard: true }), under(0.2));
    S.box(9, 2, -1.9, 21.6, 31.6, -0.9);
    S.paint(fill(0xd8b04a, { rough: 0.25 }));
    S.tube([[10.6, 17, -0.9], [10.6, 17, 0.6], [10.6, 13.6, 0.6], [10.6, 13.6, -0.9]], 0.4, { sides: 6 });
    S.clear(true);
    S.paint(fill(0xdcefe8));
    S.box(10.6, 15.6, -1.6, 20, 29, -1.2);
    S.clear(false);
  });
  S.paint(fill(0xd8b04a, { rough: 0.25 }));
  S.lathe([[0, 0], [1.2, 0.2], [1.6, 1.6], [0.5, 2.4], [0, 2.4]], { segs: 10, at: [10.4, 29.4, 0.2] });
  // the A-board menu and a potted plant
  S.at([-17.6, 2, 10.4], [0, 0.4, 0], () => {
    S.paint(fill(0x8a5a3a), under(0.2));
    for (const s of [1, -1]) S.at([0, 0, s * 1.2], [s * 0.2, 0, 0], () => S.box(-5.4, 0, -0.5, 5.4, 15, 0.5, { bevel: 0.3 }));
    S.paint(fill(0x2e3a34), proj('front', label('MENU', 0, 12, 0.36), 0xf4f0e8, { hard: true }), proj('front', or(stroke(rbox(0, 6.4, 2, 1.6, 0.5), 0.35), arc(2.4, 6.6, 1, -1.4, 1.4, 0.3), seg(-2.6, 4.2, 2.6, 4.2, 0.3)), 0xf4f0e8), proj('front', label('Y300', 0, 2.4, 0.3), 0xf2c84a, { hard: true }));
    S.at([0, 0, 1.25], [0.2, 0, 0], () => S.box(-4.4, 1, 0.45, 4.4, 14, 0.75));
  });
  S.paint(fill(0xc8643a), vol(band(5.6, 6.6), tone(0xc8643a, 0.2)), under(0.2));
  S.lathe([[2.6, 2], [3.6, 6.6], [3.2, 6.6], [0, 6]], { segs: 12, at: [24.4, 0, 12] });
  S.paint(fill(0x4f8a4a), proj('front', seg(0, 0.4, 0, 8, 0.3), tone(0x4f8a4a, 0.25)), under(0.15));
  for (let k = 0; k < 6; k++) S.at([24.4, 7, 12], [0.55 + (k % 2) * 0.25, k * 1.05, 0], () => blade(S, 8 + (k % 3), 3.4, 0.8, { shape: 'leaf', cup: 0.8 }));
}

// ------------------------------------------------------------------ 8. Latte Art Neko (secret)
export function latte(S) {
  const CUP = 0xf2b4c0, FOAM = 0xf6ecd8, LATTE = 0xb07a4a;
  coaster(S, 18);
  S.paint(fill(CUP, { rough: 0.35 }), proj('top', stroke(circle(0, 0, 14.6), 0.5), 0xf8f0e8), under(0.2));
  S.lathe([[12.6, 0], [15.6, 0.8], [16.2, 1.6], [15.6, 1.8], [9, 1.4]], { segs: 24, at: [0, TOP, 0], cap: true });
  S.paint(fill(CUP, { rough: 0.35 }), vol(band(TOP + 16, TOP + 17), 0xf8f0e8), proj('front', or(...[-6, 0, 6].map((x) => circle(x, TOP + 9, 1)), ...[-3, 3].map((x) => circle(x, TOP + 12, 0.8))), 0xf8f0e8), under(0.2));
  S.lathe(dense([[7.6, 1.4], [9.6, 2], [11.8, 5.6], [12.8, 11], [13.2, 17.4], [12.5, 17.4], [12.1, 11]], 2.4), { segs: 24, at: [0, TOP, 0], cap: false });
  S.tube(spline([[12.6, TOP + 14.8, 0], [17, TOP + 14.4, 0], [17.8, TOP + 9.6, 0], [12.2, TOP + 6, 0]], 3), 1.1, { sides: 8 });
  // the latte, its rosetta round the cat
  S.paint(fill(LATTE, { rough: 0.3 }), proj('top', or(stroke(circle(0, 0, 10), 0.9), stroke(circle(0, 0, 8.2), 0.6)), FOAM), proj('top', or(...[0.4, 1.4, 2.4, 3.6, 4.6, 5.6].map((a) => ellipse(Math.sin(a) * 9.1, Math.cos(a) * 9.1, 1.6, 0.8, -a))), FOAM));
  S.cyl([0, TOP + 15.2, 0], 12.2, 0.6, { segs: 24, bevel: 0 });
  // the cat latte art: a whole cat, of foam
  S.joint('cat', { slide: [0, 8, 0], min: 0, max: 1, rest: 0, g: [0, 1], idle: 0.04 }, () => S.at([0, TOP + 4, -0.6], null, () => cat(S, {
    coat: FOAM, light: 0xfffaf2, legs: false, eye: 'dot', blush: 0xf2a8a8, whisker: LATTE, mouthCol: LATTE, nose: LATTE,
    headMarks: [proj('front', or(arc(0, 9.6, 3, Math.PI * 1.15, Math.PI * 1.85, 0.6), arc(0, 11, 4.2, Math.PI * 1.2, Math.PI * 1.8, 0.6)), LATTE)],
    outfit: [proj('front', or(circle(-1.2, 15.4, 1.5), circle(1.2, 15.4, 1.5), poly([[-2.6, 14.9], [2.6, 14.9], [0, 12.2]])), LATTE)],
    arms: [[8.6, 13.6, 6.6], [-8.6, 13.6, 6.6]],
    ear: [FOAM, FOAM],
  }), 0.82));
  // the heart pick
  S.paint(fill(0xd9c08a));
  S.tube([[-9.6, TOP + 10, 2], [-11.6, TOP + 28, 4]], 0.35, { sides: 5 });
  const heart = Array.from({ length: 24 }, (_, i) => { const t = (i / 24) * Math.PI * 2; return [16 * Math.sin(t) ** 3 * 0.16, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.16]; });
  S.paint(fill(0xee6a8a, { rough: 0.3 }));
  S.at([-11.7, TOP + 29.6, 4.1], [0, 0.3, 0.1], () => S.extrude(heart, -0.6, 0.6, { bevel: 0.3 }));
}

void shade; void wrap; void tint; void label; void tone; void above; void band; void and;
