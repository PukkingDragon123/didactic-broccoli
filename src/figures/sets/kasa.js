// Kasa Collection (傘コレクション): tiny umbrellas for the rainy season. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/kasa.js. The family look: every umbrella stands on the
// same wet slate with a puddle in it, held up by a clear display post; canopies are real panels between real ribs.
import { spline, ring, swell, QUAL } from '../sculpt.js';
import { blade, paw } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, cut, stroke, pair, repeatU, label, kana, below, above, band, blob, blobs,
} from '../paint.js';
import { form, dense } from './neko_cafe.js';
import { kid } from './yokai.js';

const MAKER = 'AMAOTO';
const lerp = (a, b, t) => a + (b - a) * t;
const SLATE = 0x5e6672, WATER = 0x9ac8e2, CHROME = 0xc8ccd2, INK = 0x2e2a30, BLUSH = 0xf2a0a0, RED = 0xd8423a;
const TOP = 3;
const all_ = { d: () => -1, b: null };

/** The family's base: wet slate, a puddle with its rings; the top is at y = 3. */
function slate(S, r = 18, o = {}) {
  const pud = or(ellipse(1, -1, r * 0.62, r * 0.5, 0.3), ellipse(-r * 0.3, r * 0.24, r * 0.4, r * 0.3, -0.5));
  S.paint(
    fill(SLATE, { rough: 0.5 }), proj('top', pud, WATER, { rough: 0.08 }), proj('top', or(stroke(ellipse(r * 0.24, -r * 0.2, 2.4, 1.8), 0.25), stroke(ellipse(r * 0.24, -r * 0.2, 4.4, 3.2), 0.2), stroke(ellipse(-r * 0.36, r * 0.2, 1.6, 1.2), 0.2)), 0xd8eef8),
    proj('top', stroke(pud, 0.5), tone(SLATE, 0.2)), ...(o.print || []), vol(below(1), tone(SLATE, 0.15)), under(0.2), ...stamp(MAKER, { c: 0xb8c0c8, px: 0.3 }),
  );
  S.lathe([...dense([[8, 0.4], [r - 0.8, 0.4]], 3), [r, 1.2], [r, 2.4], [r - 0.7, 3]], { segs: 24, cap: true, sx: o.sx ?? 1 });
}
/** The clear display post that holds an umbrella up by its shaft. */
function post(S, x, z, y1) {
  S.clear(true); S.paint(fill(0xe8f4f6));
  S.cyl([x, TOP, z], [2.4, 2], 1, { segs: 14 });
  S.tube([[x, TOP + 0.8, z], [x, y1, z]], 0.9, { sides: 8 });
  S.clear(false);
}
/**
 * An umbrella's canopy round the shaft at c = [x, z]: its hem at y0, its tip H above (negative: blown inside out). o: R,
 * ribs, per / rows (cut), pow (profile), scallop, th, top / under (paint layers, or (panel) -> layers), clear (panel
 * indices of clear vinyl), ribCol, tipCol (the ferrules on the rib ends).
 */
function canopy(S, c, y0, o) {
  const R = o.R, H = o.H, ribs = o.ribs ?? 8, per = Math.max(2, Math.round((o.per ?? 3) * QUAL.k)), rows = Math.max(3, Math.round((o.rows ?? 5) * QUAL.k)), th = o.th ?? 0.5, step = (Math.PI * 2) / ribs, chord = Math.cos(Math.PI / ribs);
  const P = (t, a, dn = 0) => {
    const k = (1 - Math.cos((((a % step) + step) % step) / step * Math.PI * 2)) / 2, f = 1 - k * (1 - chord) - k * (o.scallop ?? 0.05) * t ** 5;
    const r = R * t, y = y0 + H * (1 - t ** (o.pow ?? 1.8)) - k * (o.sag ?? 0.4) * Math.sin(t * Math.PI) * Math.sign(H || 1);
    return [c[0] + Math.cos(a) * r * f, y - dn, c[1] + Math.sin(a) * r * f];
  };
  const L = (v, p) => (typeof v === 'function' ? v(p) : v);
  for (let p = 0; p < ribs; p++) {
    const cols = Array.from({ length: per + 1 }, (_, i) => p * step + (i / per) * step), top = [], und = [];
    for (let j = 0; j <= rows; j++) { const t = 0.04 + 0.96 * (j / rows) ** 0.9; top.push(cols.map((a) => P(t, a))); und.push(cols.map((a) => P(t, a, th))); }
    const clear = o.clear?.includes(p);
    if (clear) S.clear(true);
    S.paint(...L(o.top, p));
    S.grid(top, { hint: [0, 1, 0] });
    if (!clear) { S.paint(...L(o.under ?? o.top, p), under(0)); S.grid(und, { hint: [0, -1, 0] }); }
    S.paint(...L(o.top, p));
    S.grid([top[rows], und[rows]], { hint: (q) => [q[0][0] - c[0], 0, q[0][2] - c[1]] });
    if (clear) S.clear(false);
  }
  // ribs under the fabric, their stretchers, the ferrules on the rib ends
  const runner = [c[0], Math.min(y0, y0 + H) - (o.runner ?? 5), c[1]];
  S.paint(fill(o.ribCol ?? CHROME, { rough: 0.3 }));
  for (let p = 0; p < ribs; p++) {
    const a = p * step, pts = [0.1, 0.4, 0.7, 1].map((t) => P(t, a, th + 0.25));
    S.tube(pts, 0.28, { sides: 4 });
    S.tube([runner, P(0.55, a, th + 0.3)], 0.22, { sides: 4 });
  }
  S.paint(fill(o.tipCol ?? CHROME, { rough: 0.3 }));
  for (let p = 0; p < ribs; p++) S.ball(P(1.02, p * step, th * 0.5), 0.6, { segs: 6, rings: 4 });
  S.cyl([runner[0], runner[1] - 1.4, runner[2]], 1, 2.8, { segs: 10 });
  return { tip: [c[0], y0 + H, c[1]], runner, P };
}
/** A J handle hanging from (x, y, z), its crook towards +z (or -z), r thick. */
const crook = (x, y, z, r = 1.3, d = 1, len = 9) => spline([[x, y, z], [x, y - len * 0.6, z], [x, y - len, z + d * 1.4], [x, y - len - 1.6, z + d * 4.4], [x, y - len + 0.4, z + d * 7], [x, y - len + 2, z + d * 6.6]], 3);

// ------------------------------------------------------------------ 1. Konbini Vinyl Umbrella
export function vinyl(S) {
  slate(S, 18);
  const Y = 31, SH = 12;
  post(S, 0, -2, Y - 6);
  S.part('canopy', { rest: 0, move: (t) => swell([0, Y + 9, 0], 1 - 0.74 * t, 1 + 0.5 * t, 1 - 0.74 * t) }, () => {
    canopy(S, [0, 0], Y, { R: 22, H: 9, ribs: 8, top: [fill(0xe8f2f4)], clear: [0, 1, 2, 3, 4, 5, 6, 7], ribCol: 0xd8dce0, tipCol: 0xf6f6f2 });
    S.paint(fill(0xf6f6f2, { rough: 0.4 }));
    for (let p = 0; p < 8; p++) { const a = p * Math.PI / 4, b = a + Math.PI / 4, r = 22 * 0.995; S.tube([[Math.cos(a) * r, Y + 0.1, Math.sin(a) * r], [Math.cos(b) * r * 0.99, Y + 0.1, Math.sin(b) * r * 0.99]], 0.35, { sides: 4 }); }
    // the price sticker they never peel off
    S.paint(fill(0xf8f4e8), proj('top', label('Y500', 0, 0, 0.18), RED, { hard: true }));
    S.at([9, Y + 6.6, 4], [-0.25, 0.4, 0.38], () => S.box(-2.2, 0, -1.2, 2.2, 0.2, 1.2));
  });
  S.paint(fill(0xf6f6f2, { rough: 0.4 }));
  S.cyl([0, Y + 8.6, 0], [1.3, 0.5], 3.4, { segs: 10 });
  S.paint(fill(CHROME, { rough: 0.25 }));
  S.tube([[0, Y + 9, 0], [0, SH, 0]], 0.55, { sides: 8 });
  S.paint(fill(0xf6f6f2, { rough: 0.45 }), vol(below(SH - 2), tone(0xf6f6f2, 0.06)));
  S.tube(crook(0, SH, 0, 1.3, 1, 7), 1.3, { sides: 8 });
}

// ------------------------------------------------------------------ 2. Frog Kids Umbrella
export function kaeru(S) {
  const GREEN = 0x7fc85a, DARK = 0x5a9a42, YEL = 0xf6d03a;
  slate(S, 18);
  const Y = 30, SH = 11;
  post(S, 0, -2, Y - 6);
  S.part('canopy', { rest: 0, move: (t) => swell([0, Y + 10, 0], 1 - 0.72 * t, 1 + 0.5 * t, 1 - 0.72 * t) }, () => {
    const top = (p) => [fill(GREEN, { rough: 0.35 }), proj('top', or(ellipse(-5, -15, 2.2, 1.4), ellipse(5, -15, 2.2, 1.4)), 0xf2a0a0, { alpha: 0.8 }), proj('top', arc(0, -11.6, 6, Math.PI * 1.2, Math.PI * 1.8, 0.7), DARK), proj('top', or(...[[8, 6], [-10, 8], [12, -4], [-4, 14]].map(([x, z]) => circle(x, z, 1.3))), DARK), crown(0.06)];
    canopy(S, [0, 0], Y, { R: 21, H: 10, ribs: 8, top, under: [fill(0xd8f0c4)], clear: [5], ribCol: YEL, tipCol: YEL });
    // the eyes on top
    for (const s of [1, -1]) {
      S.paint(fill(GREEN, { rough: 0.35 }), under(0.15));
      S.ball([s * 5.2, Y + 9, 4.6], [3.6, 3, 3.4], { segs: 12, rings: 7 });
      S.paint(fill(0xfaf8f2, { rough: 0.2 }), proj('front', circle(s * 5.2, Y + 10.2, 1.3), INK), proj('front', circle(s * 5.2 - 0.4, Y + 10.6, 0.4), 0xffffff));
      S.ball([s * 5.2, Y + 10, 6.2], [2.4, 2.4, 2.2], { segs: 12, rings: 7 });
    }
  });
  S.paint(fill(YEL, { rough: 0.35 }));
  S.cyl([0, Y + 9.4, 0], [1.2, 0.5], 3, { segs: 10 });
  S.tube([[0, Y + 10, 0], [0, SH, 0]], 0.6, { sides: 8 });
  S.paint(fill(YEL, { rough: 0.35 }), proj('right', rbox(1.6, SH - 3, 1, 1.6, 0.3), 0xf8f4e8), proj('right', label('KERO', 1.6, SH - 3, 0.12), INK, { hard: true }));
  S.tube(crook(0, SH, 0, 1.5, 1, 7), 1.5, { sides: 8 });
}

// ------------------------------------------------------------------ 3. Bamboo-Handle Umbrella (closed, in its stand)
export function tatami(S) {
  const NAVY = 0x2e3a66, GLAZE = 0x3f5a8a, BAMBOO = 0xc8a464;
  slate(S, 15);
  // the umbrella stand: glazed earthenware, a white band
  S.paint(fill(GLAZE, { rough: 0.3 }), vol(band(TOP + 12, TOP + 14), 0xf2efe4), vol(below(TOP + 2), 0x8a6a4a), wrap(8.6, or(...[0, 8, 16, 24, 32, 40, 48].map((u) => circle(u - 24, TOP + 13, 0.6))), GLAZE), crown(0.1), under(0.2));
  S.lathe(dense([[6.6, TOP], [7.6, TOP + 1], [8.2, TOP + 8], [8.4, TOP + 18], [8.8, TOP + 19.2], [8.2, TOP + 19.4], [7.6, TOP + 18.6], [7.4, TOP + 6]], 1.6), { segs: 20, cap: 'bottom' });
  S.joint('lean', { pivot: [0, TOP + 19, 0], axis: 'z', min: -0.2, max: 0.2, rest: 0, g: [0, 0.15], idle: 0.02 }, () => S.at([0, TOP + 2, 0], [0, 0, -0.12], () => {
    // the furled canopy: eight folds round the shaft, strapped and buttoned
    const rows = [], N = Math.round(32 * QUAL.k);
    for (let j = 0; j <= 8; j++) { const y = 10 + j * 4.4, r0 = j === 8 ? 0.6 : lerp(1.6, 3.4, Math.sin(Math.min(1, (j + 0.5) / 7) * Math.PI * 0.6)) * (j > 6 ? 0.7 : 1); const row = []; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; row.push([Math.cos(a) * r0 * (1 + 0.16 * Math.abs(Math.sin(a * 4))), y, Math.sin(a) * r0 * (1 + 0.16 * Math.abs(Math.sin(a * 4)))]); } rows.push(row); }
    S.paint(fill(NAVY, { rough: 0.6 }), vol(band(29.6, 31.4), tone(NAVY, 0.2)), under(0.15));
    S.grid(rows, { closedU: true, hint: (q) => [q[0][0], 0, q[0][2]] });
    S.paint(fill(0xd8dce0, { rough: 0.3 }));
    S.tube([[0, 45, 0], [0, 49.4, 0]], 0.5, { sides: 6 });
    S.tube([[0, 0, 0], [0, 10.4, 0]], 0.45, { sides: 6 });
    S.paint(fill(0x1e2440, { rough: 0.5 }));
    S.torus([0, 30.4, 0], 3.9, 0.55, { segs: 16, sides: 5 });
    S.paint(fill(0xd8b45a, { rough: 0.25 }));
    S.at([3.9, 30.4, 1.2], [0, 0, Math.PI / 2], () => S.cyl([0, -0.3, 0], 0.7, 0.6, { segs: 8 }));
    // the bamboo crook, its nodes
    S.paint(fill(BAMBOO, { rough: 0.45 }), vol((x, y, z) => Math.abs(((y + 60) % 4.6) - 2.3) - 2.05, tone(BAMBOO, 0.25)), crown(0.1));
    S.tube(spline([[0, 50.4, 0], [0, 54, 0], [0.4, 57, 1.6], [0, 58.4, 4.4], [0, 57, 7.2], [0, 54.6, 7.6]], 3), 1.3, { sides: 8 });
    S.paint(fill(0xd8dce0, { rough: 0.3 }));
    S.cyl([0, 49.4, 0], [1, 1.4], 1.2, { segs: 10 });
  }));
  S.paint(fill(0x8a6a4a), proj('front', label('1987', 0, TOP + 4.6, 0.26), 0xf2efe4, { hard: true }));
  S.box(-3, TOP + 3.2, 7.9, 3, TOP + 6, 8.3, { bevel: 0.2 });
}

// ------------------------------------------------------------------ 4. Janome-gasa
export function janome(S) {
  const RED = 0xc8323a, RING = 0xf6f0e0, BAMBOO = 0xd8b478, OIL = 0xe8d8b4;
  slate(S, 18);
  const Y = 31;
  post(S, 0, 0, Y - 9);
  S.part('canopy', { rest: 0, move: (t) => swell([0, Y + 8, 0], 1 - 0.8 * t, 1 + 0.6 * t, 1 - 0.8 * t) }, () => {
    const top = [fill(RED, { rough: 0.45 }), proj('top', cut(circle(0, 0, 16), circle(0, 0, 10.6)), RING), proj('top', circle(0, 0, 3.6), 0x2a2830), crown(0.05)];
    const und = [fill(OIL, { rough: 0.6 }), proj('bottom', or(...Array.from({ length: 32 }, (_, k) => { const a = k * Math.PI / 16; return seg(Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * 21, Math.sin(a) * 21, 0.22); })), tone(OIL, 0.3)), proj('bottom', or(stroke(circle(0, 0, 6.6), 1.2), stroke(circle(0, 0, 8.4), 0.6)), 0x3f7fc6), proj('bottom', stroke(circle(0, 0, 7.6), 0.6), 0xf2c83a)];
    canopy(S, [0, 0], Y, { R: 22, H: 8, ribs: 32, per: 1, rows: 6, pow: 1.3, scallop: 0.02, sag: 0.1, top, under: und, ribCol: BAMBOO, tipCol: 0x2a2830 });
    S.paint(fill(0x2a2830, { rough: 0.4 }), crown(0.1));
    S.lathe([[3.4, Y + 7.4], [3.6, Y + 8], [2.2, Y + 9], [0.8, Y + 9.6]], { segs: 18, cap: true });
  });
  S.paint(fill(BAMBOO, { rough: 0.45 }), vol((x, y) => Math.abs(((y + 60) % 7) - 3.5) - 3.2, tone(BAMBOO, 0.25)));
  S.tube([[0, Y + 9, 0], [0, 12, 0]], 0.75, { sides: 8 });
  S.paint(fill(0x6a4a2a, { rough: 0.7 }), vol((x, y) => Math.abs(((y + 60) % 1.1) - 0.55) - 0.4, tone(0x6a4a2a, 0.3)));
  S.cyl([0, 4, 0], [1.1, 1.2], 8.6, { segs: 10 });
  S.paint(fill(RED, { rough: 0.7 }));
  S.tube(spline([[0, 4.6, 0], [0.6, 3.6, 1.6], [0, 3.2, 3], [-0.6, 3.6, 1.6], [0, 4.6, 0]], 3), 0.3, { sides: 4 });
}

// ------------------------------------------------------------------ 5. Inside-Out Umbrella
export function uragaeri(S) {
  const ORANGE = 0xf28c2e, YEL = 0xf6d03a;
  slate(S, 18);
  const Y = 30, SH = 12;
  post(S, 0, -2, Y - 8);
  S.joint('gust', { pivot: [0, SH, 0], axis: [1, 0, 0.4], min: -0.3, max: 0.3, rest: 0, g: [0, 0.2], idle: 0.08 }, () => {
    const top = (p) => [fill(p % 2 ? YEL : ORANGE, { rough: 0.4 }), crown(0.06)];
    const g = canopy(S, [0, 0], Y + 4, { R: 20, H: -12, ribs: 8, pow: 1.4, scallop: 0.12, sag: 0.8, top, under: (p) => [fill(tone(p % 2 ? YEL : ORANGE, 0.12), { rough: 0.4 })], ribCol: 0x3a3a42, tipCol: 0x3a3a42 });
    // one rib has had enough
    S.paint(fill(0x3a3a42, { rough: 0.3 }));
    S.tube(spline([g.P(0.7, Math.PI * 0.25, 0.8), [13, Y + 16, 15], [12, Y + 21, 19.6]], 2), 0.3, { sides: 4 });
    S.paint(fill(0x3a3a42, { rough: 0.3 }));
    S.tube([[0, Y - 8.6, 0], [0.4, SH, 0.2]], 0.55, { sides: 8 });
    S.paint(fill(0x6a4a3a, { rough: 0.4 }));
    S.tube(crook(0.4, SH, 0.2, 1.4, -1, 7), 1.4, { sides: 8 });
  });
}

// ------------------------------------------------------------------ 6. Sakura Nodate Parasol
export function nodate(S) {
  const RED = 0xc8323a, FELT = 0xd8423a, WOOD = 0x6a4a3a, BAMBOO = 0xd8b478, PETAL = 0xf6c6d2, MATCHA = 0x8ab04a;
  slate(S, 24, { sx: 1.05 });
  // the bench under red felt, the tea things on it
  S.paint(fill(WOOD, { rough: 0.6 }), under(0.2));
  for (const s of [1, -1]) for (const t of [1, -1]) S.box(s * 15 - 1, TOP, t * 6 - 1, s * 15 + 1, TOP + 9, t * 6 + 1, { bevel: 0.3 });
  const petals = (pts) => or(...pts.map(([x, z, a]) => ellipse(x, z, 1, 0.6, a)));
  S.paint(fill(FELT, { rough: 0.95 }), proj('top', petals([[-12, 2, 0.4], [-6, -4, 1.2], [10, 3, 2], [13, -4, 0.2], [4, 5, 2.6]]), PETAL), under(0.2));
  S.box(-17.6, TOP + 9, -8, 17.6, TOP + 11, 8, { bevel: 0.6 });
  S.box(-17.6, TOP + 5, 7.6, 17.6, TOP + 9.4, 8.2);
  const T = TOP + 11;
  S.paint(fill(0x3a3034, { rough: 0.3 }), vol(above(T + 3.4), 0x6a8a3a), crown(0.08));
  S.lathe(dense([[2, 0], [2.6, 0.4], [3.8, 2], [4.2, 4.2], [3.8, 4.2], [3.4, 2.6], [0, 2.4]], 1), { segs: 16, at: [-6, T, 3] });
  S.paint(fill(MATCHA, { rough: 0.4 }), proj('top', stroke(circle(-6.4, -3.4, 1.2), 0.4), tint(MATCHA, 0.3)), proj('top', petals([[-5, -2, 0.7]]), PETAL));
  S.cyl([-6, T + 3, 3], 3.6, 0.3, { segs: 16, bevel: 0 });
  S.paint(fill(0xe8d4a0, { rough: 0.6 }), vol((x, y, z) => Math.abs(Math.sin(Math.atan2(x - 3, z - 4) * 8)) - 0.6, tone(0xe8d4a0, 0.2)));
  S.lathe(dense([[0.8, 0], [1.6, 0.4], [1.9, 2.6], [1.2, 3.2], [0.6, 6.4], [0, 6.6]], 1), { segs: 14, at: [3, T, 4] });
  S.paint(fill(0xf8f4ec, { rough: 0.4 }), under(0.2));
  S.lathe([[0, 0], [3.6, 0], [4.4, 0.6], [4, 0.6], [0, 0.4]], { segs: 16, at: [10, T, -1] });
  S.paint(fill(PETAL, { rough: 0.5 }), proj('top', seg(9, 2, 11, 0, 0.2), tone(PETAL, 0.2)));
  S.at([10, T + 0.6, -1], [0, 0.4, 0], () => S.extrude([[-2.4, 0], [2.4, 0], [2.6, 1.2], [2, 2.2], [-2, 2.2], [-2.6, 1.2]], -1.4, 1.4, { bevel: 0.5 }));
  S.paint(fill(0x5f8a3a, { rough: 0.5 }));
  S.at([10.6, T + 0.6, -1], [Math.PI / 2, 0.4, 0], () => S.extrude([[-2.6, -1.6], [2.6, -1.6], [2.8, 1.6], [-2.8, 1.6]], -0.1, 0.1));
  // the parasol: a great red wagasa on a long bamboo pole
  S.paint(fill(BAMBOO, { rough: 0.45 }), vol((x, y) => Math.abs(((y + 60) % 8) - 4) - 3.7, tone(BAMBOO, 0.25)));
  S.tube([[-15, TOP, -9.6], [-15, TOP + 52, -9.6]], 0.9, { sides: 8 });
  S.part('canopy', { rest: 0, move: (t) => swell([-15, TOP + 52, -9.6], 1 - 0.78 * t, 1 + 0.6 * t, 1 - 0.78 * t) }, () => {
    const top = [fill(RED, { rough: 0.5 }), proj('top', petals([[-24, 2, 0.4], [-8, -4, 1.2], [-20, 14, 2], [-4, 12, 0.2], [-30, -6, 2.6], [-12, 26, 1], [-26, 22, 0.3]]), PETAL), crown(0.05)];
    const und = [fill(0xe86a5a, { rough: 0.6 }), proj('bottom', or(...Array.from({ length: 28 }, (_, k) => { const a = k * Math.PI / 14; return seg(-15 + Math.cos(a) * 4, -9.6 + Math.sin(a) * 4, -15 + Math.cos(a) * 30, -9.6 + Math.sin(a) * 30, 0.25); })), tone(0xe86a5a, 0.25)), proj('bottom', or(stroke(circle(-15, -9.6, 7), 1.4), stroke(circle(-15, -9.6, 9.4), 0.6)), 0x3f7fc6)];
    canopy(S, [-15, -9.6], TOP + 44, { R: 30, H: 8.6, ribs: 28, per: 1, rows: 6, pow: 1.3, scallop: 0.02, sag: 0.1, top, under: und, ribCol: BAMBOO, tipCol: 0x2a2830 });
    S.paint(fill(0x2a2830, { rough: 0.4 }));
    S.lathe([[3.2, TOP + 52], [3.4, TOP + 52.6], [2, TOP + 53.6], [0.6, TOP + 54.2]], { segs: 16, at: [-15, 0, -9.6], cap: true });
  });
}

// ------------------------------------------------------------------ 7. Puddle Jumper
export function amefuri(S) {
  const COAT = 0xf6d03a, BOOT = 0xd8423a, UMB = 0x6ab0e8;
  slate(S, 19);
  // the splash she made
  S.clear(true);
  S.paint(fill(0xd8eef8));
  for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + 0.3; S.at([Math.cos(a) * 7.4, TOP, Math.sin(a) * 6.4 + 1], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], () => blade(S, 4 + (k % 3), 2.4, 0.8, { shape: 'leaf' })); }
  for (const [x, y, z] of [[-8.6, TOP + 8, 4], [9, TOP + 9, 2], [3, TOP + 10, 8.4], [-4, TOP + 9.6, -6]]) S.ball([x, y, z], 0.9, { segs: 8, rings: 5 });
  S.clear(false);
  S.joint('hop', { slide: [0, 5, 0], min: 0, max: 1, rest: 0, g: [0, 1], idle: 0.04 }, () => {
    S.at([0, TOP + 0.4, 0], null, () => kid(S, {
      cloth: COAT, shoes: 'boots', shoeCol: BOOT, hair: 'short', hairCol: 0x6a4a3a, eye: 'closed', mouth: 'smile',
      body: [[3.2, 0.05, 0.05, 0], [3.4, 7.4, 6.6, 0], [4.6, 7.8, 7, 0], [8.6, 7, 6, 0.2], [13.4, 6.4, 5.4, 0.4], [18.2, 6.1, 5, 0.3], [21.2, 5.4, 4.4, 0.2], [23.2, 3.4, 3, 0], [24, 0.05, 0.05, 0]],
      outfit: [proj('front', or(...[8, 12, 16, 20].map((y) => circle(1.4, y, 0.7))), 0xf6f2ea), proj('front', seg(0, 4, 0, 22.4, 0.4), tone(COAT, 0.2)), proj('front', or(rbox(-4, 9.6, 2, 0.4, 0), rbox(4.6, 9.6, 2, 0.4, 0)), tone(COAT, 0.25))],
      sleeve: COAT, hand: 0xf8d8c2, arms: [[7, 24, 3], [-8.4, 15.4, 5]], legCol: BOOT,
      onHead: (S) => {
        // the hood, up
        S.paint(fill(COAT, { rough: 0.4 }), crown(0.1), under(0.15));
        form(S, [0, 0, 0], [[-7.8, 0.05, 0.05, -3.4], [-7.4, 9.6, 8.4, -3.4], [-3.6, 11.6, 10.4, -3.2], [0.6, 11.8, 10.8, -3], [5, 10.8, 10, -2.6], [8.4, 7.2, 7, -2], [10.6, 0.05, 0.05, -1.6]], { pow: 2.2 });
        S.at([0, 0.2, 6.6], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 8.2, 1.1, { segs: 24, sides: 6, sy: 1 }));
      },
    }));
    // her umbrella, blue with clouds, over her shoulder
    S.at([7, TOP + 24.4, 3], [0.3, 0, -0.5], () => {
      S.paint(fill(0xf8f4ec, { rough: 0.4 }));
      S.tube([[0, -4, 0], [0, 15, 0]], 0.5, { sides: 6 });
      S.paint(fill(0xf8f4ec, { rough: 0.4 }));
      S.tube(crook(0, -4, 0, 0.9, 1, 4), 0.9, { sides: 6 });
      canopy(S, [0, 0], 9, { R: 13, H: 6, ribs: 8, top: [fill(UMB, { rough: 0.4 }), proj('top', or(ellipse(-5, 2, 3, 1.6), ellipse(-3, 1, 2.2, 1.8), ellipse(5, -5, 2.6, 1.4), ellipse(6.6, -4, 2, 1.6)), 0xf8f8f4)], under: [fill(0xc8e4f8)], tipCol: 0xf8f4ec });
    });
  });
}

// ------------------------------------------------------------------ 8. Kasa-Obake (secret)
export function obake(S) {
  const PAPER = 0x7a5aa8, BAMBOO = 0xd8b478, SKINL = 0xe8c8a8;
  slate(S, 17);
  S.joint('hop', { slide: [0, 6, 0], min: 0, max: 1, rest: 0, g: [0, 1], idle: 0.05 }, () => {
    // the one hairy leg and its geta
    S.paint(fill(0xc89a64), under(0.2));
    S.box(-3, TOP + 1.4, -3.6, 3, TOP + 2.6, 5, { bevel: 0.4 });
    S.paint(fill(0x8a5e3a));
    for (const z of [-2, 3.4]) S.box(-2.6, TOP, z - 0.6, 2.6, TOP + 1.4, z + 0.6, { bevel: 0.2 });
    S.paint(fill(RED));
    S.tube(spline([[-2.4, TOP + 2.6, 1], [0, TOP + 3.6, 3.6], [2.4, TOP + 2.6, 1]], 2), 0.35, { sides: 5 });
    S.paint(fill(SKINL, { rough: 0.6 }), under(0.15));
    paw(S, [0, TOP + 2.6, 0.4], 4, 6, 2.6, { toes: 3 });
    S.tube(spline([[0, TOP + 4, -0.4], [0.6, TOP + 9, 0.4], [-0.4, TOP + 14, 0]], 2), [1.8, 1.5, 1.7], { sides: 8 });
    S.paint(fill(0x3a3034, { rough: 0.9 }));
    for (const [y, a] of [[TOP + 7, 0.6], [TOP + 9, 2.4], [TOP + 11, 4.2], [TOP + 8, 5.4], [TOP + 12.4, 1.4]]) S.tube([[Math.cos(a) * 1.5, y, Math.sin(a) * 1.5], [Math.cos(a) * 2.8, y + 0.6, Math.sin(a) * 2.8]], 0.18, { sides: 3 });
    // the body: a half-shut paper umbrella with an eye and a tongue
    S.paint(
      fill(PAPER, { rough: 0.6 }), vol((x, y, z) => Math.abs(Math.sin(Math.atan2(x, z) * 8)) - 0.97, tone(PAPER, 0.3)),
      proj('front', ellipse(0, TOP + 30, 4.4, 4), 0xfaf8f2), proj('front', stroke(ellipse(0, TOP + 30, 4.4, 4), 0.45), INK), proj('front', circle(0.6, TOP + 29.6, 2.2), 0x2a1e26), proj('front', circle(-0.2, TOP + 30.6, 0.8), 0xffffff),
      proj('front', arc(0, TOP + 30.4, 5.6, Math.PI * 0.2, Math.PI * 0.8, 0.5), INK), proj('front', or(ellipse(-5.6, TOP + 24.6, 1.6, 0.9), ellipse(5.6, TOP + 24.6, 1.6, 0.9)), BLUSH, { alpha: 0.8 }),
      proj('front', poly([[-4, TOP + 22.6], [4, TOP + 22.6], [2.6, TOP + 20.6], [-2.6, TOP + 20.6]]), 0x4a1e2a), under(0.12),
    );
    S.lathe(dense([[1.2, TOP + 14], [3.6, TOP + 16], [7.4, TOP + 21], [8.6, TOP + 26], [8, TOP + 32], [5.6, TOP + 38], [2.4, TOP + 42], [0.6, TOP + 43.4]], 1.4), { segs: 24, sz: 0.86, cap: true });
    S.paint(fill(0x2a2830, { rough: 0.4 }));
    S.lathe([[1.2, TOP + 42.8], [1.4, TOP + 43.6], [0.4, TOP + 47.4], [0, TOP + 47.6]], { segs: 12 });
    S.paint(fill(0xf08a96, { rough: 0.3 }), proj('front', seg(0, TOP + 19.6, 0, TOP + 14, 0.3), tone(0xf08a96, 0.25)));
    S.joint('tongue', { pivot: [0, TOP + 21.4, 7], axis: 'x', min: -0.3, max: 0.6, rest: 0, idle: 0.1 }, () => S.tube(spline([[0, TOP + 21.4, 6.8], [0, TOP + 20, 8.8], [0.6, TOP + 16.4, 9.6], [1, TOP + 13, 8.6]], 3), (t) => lerp(1.8, 1.4, t), { sides: 8, flat: [1.6, 0.55] }));
    // two rib-arms
    S.paint(fill(BAMBOO, { rough: 0.45 }));
    for (const s of [1, -1]) S.tube(spline([[s * 7, TOP + 23, 0], [s * 11, TOP + 22, 1], [s * 13, TOP + 25, 2.4]], 2), 0.45, { sides: 5 });
    S.paint(fill(SKINL));
    for (const s of [1, -1]) S.ball([s * 13.2, TOP + 25.4, 2.4], 1.2, { segs: 8, rings: 5 });
  });
}

void ring; void wrap; void shade; void tint; void face; void EYE; void star; void pair; void repeatU; void kana; void above; void blobs; void blob; void and; void stroke;
