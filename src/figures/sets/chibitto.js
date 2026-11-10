// Chibitto Heroes (ちびっとヒーローズ): eight original anime heroes and a secret, as crisp low-poly chibi figures on
// the game's human base model (the chibi kit, src/figures/chibi.js: hand-written person specs in the people kit's
// format). Sculpt programs in millimetres; the series data is src/data/series/chibitto.js. All characters are original.
import { chibi, lock, bow, cape, star3d, base } from '../chibi.js';
import { fill, proj, vol, under, crown, tone, circle, rbox, seg, star, or, stroke, below, above, band } from '../paint.js';

const MAKER = 'HOSHIMARU';
const heroBase = (text, col, o = {}) => ({ shape: 'hex', r: 15.5, col, rim: o.rim ?? tone(col, 0.45), mark: 'star', text, maker: MAKER, ...o });
const girl = (o) => ({ sex: 'f', age: 'teen', H: 1.58, build: 0.94, bust: 0.6, skin: 0xf8dcca, legs: 'skin', acc: [], ...o, face: { lid: 'double', tilt: 0.85, blush: 0.3, ...(o.face || {}) } });
const boy = (o) => ({ sex: 'm', age: 'teen', H: 1.72, build: 1, skin: 0xf2d2b6, legs: 'skin', acc: [], ...o, face: { lid: 'double', tilt: 0.8, blush: 0.12, ...(o.face || {}) } });
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ------------------------------------------------------------------ 1. Starfall Kirara: a magical girl mid-transformation
function wand(S) {
  const PINK = 0xf06aa0, GOLD = 0xf6cc4a;
  S.paint(fill(0xfbf6fa, { rough: 0.3 }), vol((x, y) => Math.abs(((y % 1.6) + 1.6) % 1.6 - 0.8) - 0.3, PINK), crown(0.15));
  S.cyl([0, -2.6, 0], [0.42, 0.5], 16, { segs: 6 });
  S.paint(fill(GOLD, { rough: 0.25 }), under(0.2), crown(0.2));
  S.cyl([0, 13, 0], [0.9, 0.6], 1, { segs: 6 });
  S.paint(fill(PINK, { rough: 0.2 }), proj('front', star(0, 0, 1.6, 5, 0.48), 0xffe6f2), proj('back', star(0, 0, 1.6, 5, 0.48), 0xffe6f2), under(0.2), crown(0.2));
  S.at([0, 17.4, 0], [0, 0, 0], () => star3d(S, 4, 1.5));
  S.paint(fill(GOLD, { rough: 0.2 }));
  for (const s of [1, -1]) S.at([s * 1.6, 14.6, 0], [0, 0, -s * 0.9], () => lock(S, [[0, 0, 0], [s * 1.4, 1.2, 0], [s * 2.6, 0.6, 0]], 1.6, 0.5, { prof: 'diamond', out: [0, 0, 1] }));
}
function ribbons(ctx, col) {
  // ribbons of light spiralling up her legs as the dress forms: clear pink plastic
  const { S, P } = ctx;
  S.clear(true);
  S.paint(fill(col, { rough: 0.1 }));
  for (const [ph, r0, y1] of [[0, 1, P.hipY + 1.5], [Math.PI, 0.86, P.pelvisY + 2]]) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10, a = ph + t * Math.PI * 3.2, r = (P.hipsX * 1.9 - t * 2.2) * r0; pts.push([Math.cos(a) * r, 0.6 + t * (y1 - 0.6), Math.sin(a) * r * 0.9]); }
    lock(S, pts, 2.6, 0.5, { prof: 'diamond', out: (p) => [p[0], 0, p[2]], steps: 1, taper: (t) => Math.min(1, 0.4 + t * 3) * (1 - t ** 4) });
  }
  for (const [x, y, z, r] of [[-7.4, 6, 4, 1.6], [7, 11, -2, 1.3], [-5, 15, -5, 1.1]]) S.at([x, y, z], [0, 0.4, 0.2], () => star3d(S, r * 1.4, 0.6));
  S.clear(false);
}
export function kirara(S) {
  const PINK = 0xf06aa0;
  const spec = girl({
    hair: { style: 'twintails', col: 0xf490c0, hi: 0xffe4f2, volume: 1.15 }, face: { iris: 0xe0407a, eyeH: 1.08, blush: 0.35 },
    top: { kind: 'blouse', col: 0xfdf8fb, sleeve: 'short' }, bottom: { kind: 'skirt', cut: 'mini', col: PINK, hem: 0xfdf8fb },
    shoes: { kind: 'boots', col: 0xfdf8fb },
  });
  chibi(S, spec, {
    pose: { chest: [-0.06, 0.18, 0.05], head: [-0.12, -0.22, -0.12], armR: [-0.45, 0, 2.05], foreR: [-0.3, 0, 0.25], armL: [0.1, 0.4, 0.75], foreL: [-1.6, 0.3, -0.6], thighL: [-0.08, 0, 0.1], thighR: [0.35, 0, 0.06], shinR: [1.0, 0, 0], footR: [0.45, 0, 0] },
    expr: { eye: 'open', eyeR: 'happy', mouth: 'grin', brow: 'up', blush: 1 }, bangs: { split: 0.22, n: 7, seed: 2 }, tieCol: 0xf6cc4a, swing: [3, 0, -6],
    props: [{ hand: 'R', build: wand, rot: [Math.PI / 2, 0, 0] }],
    parts: { armR: { name: 'wand', axis: 'z', g: [0, -0.6], idle: 0.05 } },
    base: heroBase('KIRARA', 0xf6a8c8),
    extra: (ctx) => {
      const { P } = ctx;
      ctx.in('chest', () => { S.paint(fill(PINK, { rough: 0.35 }), under(0.2), crown(0.15)); bow(S, [0, P.bustY + 0.2, P.chestZ + P.bust + 0.5], 2.4, { tails: 1.2 }); S.paint(fill(0xf6cc4a, { rough: 0.2 })); S.at([0, P.bustY + 0.1, P.chestZ + P.bust + 1.2], null, () => star3d(S, 1.3, 0.6)); });
      ctx.in('hips', () => { S.paint(fill(PINK, { rough: 0.35 }), under(0.2)); bow(S, [0, P.waistY + 0.6, -P.waistZ - 1], 2.2, { rot: [0, Math.PI, 0], tails: 2.4 }); });
      ribbons(ctx, 0xff9ac8);
    },
  });
}

// ------------------------------------------------------------------ 2. Pilot Ren: plugsuit, helmet under the arm, visor up
function helmet(S) {
  const W = 0xf4f2ee, OR = 0xe86a2a, DK = 0x2a2a34;
  S.at([-1.4, 1.2, 3.4], [0.15, -0.9, 0.2], () => {
    S.paint(fill(W, { rough: 0.3 }), vol((x, y, z) => Math.abs(x) - 0.9, OR), under(0.2), crown(0.12));
    const ring8 = (y, rx, rz, cz = 0) => Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 2 - Math.PI / 8 + (i / 8) * Math.PI * 2; return [Math.cos(a) * rx, y, cz + Math.sin(a) * rz]; });
    S.loft([ring8(-4.4, 3.6, 3.9, -0.4), ring8(-2.4, 4.6, 4.9), ring8(0.8, 4.9, 5.1), ring8(3.2, 4.2, 4.4, -0.2), ring8(4.8, 2.4, 2.8, -0.4), ring8(5.4, 0.6, 0.8, -0.4)]);
    S.paint(fill(DK, { rough: 0.4 }), under(0.2));
    S.loft([ring8(-4.8, 3.3, 3.6, -0.4), ring8(-4.3, 3.7, 4.0, -0.4)]);
    for (const s of [1, -1]) { S.paint(fill(OR, { rough: 0.3 }), under(0.2)); S.at([s * 4.6, 0.4, -1], [0, 0, 0], () => S.extrude([[0, -1.6], [0, 1.6], [s * 0.2, 4.4], [s * 0.9, -1.2]].map(([a, b]) => [b, a]), -0.4 + s * 0, 0.4)); }
    S.rest = 1;
    S.joint('visor', { local: true, pivot: [0, 3.4, 1], axis: 'x', min: -1.3, max: 0, rest: -1.1, g: [-1.1, 0] }, () => {
      S.paint(fill(0x3ab8d8, { rough: 0.05 }), proj('front', or(seg(-2.6, 1.6, -0.6, 2.4, 0.4), seg(-2.2, 0.6, -1.2, 1.0, 0.3)), 0xd8f6ff), under(0.2));
      S.loft([[-1.6, 0.86], [0.2, 1], [2.4, 0.92], [3.2, 0.7]].map(([y, k]) => Array.from({ length: 7 }, (_, i) => { const a = Math.PI * 0.12 + (i / 6) * Math.PI * 0.76; return [Math.cos(a) * 5.2 * k, y, Math.sin(a) * 5.4 * k + 0.2]; }).concat(Array.from({ length: 7 }, (_, i) => { const a = Math.PI * 0.88 - (i / 6) * Math.PI * 0.76; return [Math.cos(a) * 4.8 * k, y, Math.sin(a) * 5.0 * k]; }))));
    });
  });
}
export function ren(S) {
  const W = 0xf4f2ee, OR = 0xe86a2a, DK = 0x2a2a34;
  const spec = boy({
    hair: { style: 'messy', col: 0x2a3456, hi: 0x8aa2e0 }, face: { iris: 0x3a7ac8, tilt: 0.8 },
    top: { kind: 'bodysuit', col: W, col2: DK, col3: OR }, bottom: { kind: 'bodysuit', col: W }, shoes: { kind: 'boots', col: DK },
  });
  chibi(S, spec, {
    pose: { chest: [0, -0.12, 0.03], head: [0.04, 0.18, 0.1], armL: [0.12, 0.25, 0.32], foreL: [-1.2, 0.5, 0], armR: [-0.35, 0.35, 1.55], foreR: [-2.35, 0.1, 0], handR: [0, 0, 0.3], thighL: [0, 0, 0.14], thighR: [-0.1, 0, 0.02], shinR: [0.25, 0, 0], hands: { R: 'flat' } },
    expr: 'grin', gloves: DK,
    props: [{ hand: 'L', build: helmet }],
    base: heroBase('REN', 0x3a4a6a),
    extra: (ctx) => { // shoulder pads, knee guards, the chest light
      const { P } = ctx;
      S.paint(fill(OR, { rough: 0.3 }), under(0.2), crown(0.12));
      ctx.in('chest', () => { for (const s of [1, -1]) S.at([s * (P.shX - 0.4), P.shoulderY + 0.2, 0], [0, 0, -s * 0.5], () => S.box(-1.5, -0.6, -1.9, 1.5, 0.6, 1.9, { bevel: 0.4 })); });
      for (const s of [1, -1]) ctx.in(s > 0 ? 'shinL' : 'shinR', () => S.box(s * P.hipX - 1.3, P.kneeY - 1.2, P.thighR * 0.6, s * P.hipX + 1.3, P.kneeY + 1.4, P.thighR * 0.6 + 1.6, { bevel: 0.45 }));
    },
  });
}

// ------------------------------------------------------------------ 3. Kagerō: a kunoichi crouched on a roof ridge
function kunai(S) {
  S.paint(fill(0x3a3a44, { rough: 0.4 }), crown(0.2));
  S.cyl([0, -2.6, 0], 0.4, 3.6, { segs: 6 });
  S.paint(fill(0xc8ccd4, { rough: 0.15 }), under(0.2));
  S.extrude([[0, 7.6], [-1.1, 2.6], [0, 1.2], [1.1, 2.6]], -0.25, 0.25, { bevel: 0.15 });
  S.paint(fill(0x8a2a3a, { rough: 0.5 }));
  S.torus([0, -3.4, 0], 0.9, 0.25, { segs: 6, sides: 4 });
}
function roofBase(S) {
  const TILE = 0x5a6070, RIDGE = 0x4a505e;
  base(S, { shape: 'hex', r: 15.5, col: 0x2a2e48, rim: 0x1e2030, mark: null, text: 'KAGERO', maker: MAKER });
  // a chunk of tiled roof: wave-section tiles down the slope, the ridge beam along the top
  S.paint(fill(TILE, { rough: 0.35 }), crown(0.12), under(0.25));
  const wave = [];
  for (let i = 0; i <= 28; i++) { const x = -12 + i * (24 / 28); wave.push([x, 1.6 + 1.1 * Math.abs(Math.sin((x + 12) * Math.PI / 4))]); }
  S.at([0, -0.3, 0], [0.2, 0, 0], () => S.extrude([[12, 0], ...wave.slice().reverse(), [-12, 0]].reverse(), -10, 9.5));
  S.paint(fill(RIDGE, { rough: 0.3 }), crown(0.12), under(0.25));
  S.at([0, 3.4, -9], [0, Math.PI / 2, 0], () => S.cyl([0, -2, 0], 2.2, 4, { segs: 6 }));
  S.at([0, 3.6, -8.6], [0, 0, Math.PI / 2], () => S.cyl([0, -12.4, 0], 2, 24.8, { segs: 6 }));
  S.paint(fill(0xc8a040, { rough: 0.2 }));
  for (const s of [1, -1]) S.at([s * 12.6, 3.6, -8.6], [0, 0, Math.PI / 2], () => S.cyl([0, -0.3, 0], 2.3, 0.6, { segs: 6 }));
}
export function kagero(S) {
  const NAVY = 0x2a2e48, RED = 0xc8343e;
  const spec = girl({
    hair: { style: 'ponytail', col: 0x4a2a5e, hi: 0xa878cc, volume: 1.05 }, face: { iris: 0xd8344a, tilt: 1.2, blush: 0.1 },
    top: { kind: 'wrap', col: NAVY, col2: 0x8a2a3a, sleeve: 'long' }, bottom: { kind: 'tobi', col: NAVY }, shoes: { kind: 'tabi', col: 0x1e2030 },
  });
  roofBase(S);
  chibi(S, spec, {
    base: false,
    pose: { root: { at: [0, 2.4, 1.6] }, hipsAt: [0, -5.2, 0], chest: [0.42, 0.1, 0], head: [-0.42, -0.1, 0], thighL: [-1.75, 0.2, 0.25], shinL: [2.1, 0, 0], footL: [-0.2, 0, 0], thighR: [-0.5, -0.2, 0.3], shinR: [2.4, 0, 0], footR: [0.8, 0, 0], armR: [-1.0, 0.2, 0.6], foreR: [-0.9, 0, 0], armL: [-0.6, 0, 0.3], foreL: [-0.4, 0, 0], hands: { L: 'flat' } },
    expr: { eye: 'sharp', mouth: 'small', brow: 'angry', blush: 0 }, bangs: { sweep: -0.3, seed: 3, ragged: 1.4 }, tieCol: RED, swing: [0, 0, -5],
    facePaint: (ctx) => [vol(below(ctx.P.hc[1] - ctx.P.hh * 0.4), NAVY), vol(band(ctx.P.hc[1] - ctx.P.hh * 0.42, ctx.P.hc[1] - ctx.P.hh * 0.4), tone(NAVY, 0.3))],
    props: [{ hand: 'R', build: kunai, rot: [0.3, 0, 0] }],
    extra: (ctx) => {
      const { P } = ctx;
      // the scarf round her neck and its two long tails flying out behind (they flip)
      S.paint(fill(RED, { rough: 0.5 }), under(0.2), crown(0.1));
      ctx.in('chest', () => S.loft([[P.neckBase - 0.6, 2.9, 2.6], [P.neckBase + 0.6, 2.7, 2.5], [P.neckBase + 1.6, 2.2, 2.1]].map(([y, rx, rz]) => Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 2 - Math.PI / 8 + i / 8 * Math.PI * 2; return [Math.cos(a) * rx, y, Math.sin(a) * rz - 0.3]; }))));
      const root = ctx.pt('chest', [0.8, P.neckBase, -2.4]);
      S.joint('scarf', { pivot: root, axis: ctx.dir('chest', [0, 1, 0]), min: -1, max: 1, rest: 0, g: [0, 0.7], idle: 0.12 }, () => {
        S.paint(fill(RED, { rough: 0.5 }), under(0.2), crown(0.1));
        for (const [k, l] of [[1, 1], [-1, 0.8]]) lock(S, [root, add3(root, [k * 2, 0.5, -4]), add3(root, [k * 4 + 3, 2.6 * l, -9 * l]), add3(root, [k * 3 + 6, 1.4, -14 * l]), add3(root, [k * 2 + 10, 3.4, -18 * l])], 4.4, 0.9, { prof: 'diamond', out: [0, 1, 0], steps: 2, taper: (t) => Math.min(1, 0.7 + t) * (1 - t ** 3) });
      });
    },
  });
}

// ------------------------------------------------------------------ 4. Sayo: a shrine maiden holding out an ofuda
function ofuda(S) {
  S.at([0, 3.6, 0.2], [0, 0, 0], () => {
    const RED = 0xd8343a;
    S.paint(fill(0xfbf8ee, { rough: 0.8 }), proj('front', stroke(rbox(0, 0, 1.45, 3.9, 0.1), 0.25, 0.3), RED), proj('front', or(stroke(circle(0, 1.4, 0.9), 0.24), seg(0, 0.2, 0, -3, 0.3), seg(-0.8, -1, 0.8, -1, 0.26), seg(-0.6, -2, 0.6, -2, 0.22), circle(0, 1.4, 0.32)), 0x2a2030), proj('back', stroke(rbox(0, 0, 1.45, 3.9, 0.1), 0.25, 0.3), RED));
    S.box(-1.7, -4.2, -0.1, 1.7, 4.2, 0.1);
  });
}
export function sayo(S) {
  const RED = 0xd8343a, WHITE = 0xfbf8f2;
  const spec = girl({
    hair: { style: 'hime', col: 0x1e1a26, hi: 0x6a6aa0 }, face: { iris: 0x6a3a8a, tilt: 0.6, blush: 0.25 },
    top: { kind: 'wrap', col: WHITE, col2: RED, sleeve: 'wide' }, bottom: { kind: 'hakama', col: RED }, shoes: { kind: 'sandal', col: RED }, socks: { col: WHITE }, legs: 'socks',
  });
  chibi(S, spec, {
    pose: { chest: [0, 0.3, 0], head: [0.02, -0.2, 0.05], armR: [-1.35, -0.25, 0.1], foreR: [-0.3, 0, 0], handR: [0, -1.4, 0], armL: [-0.2, -0.3, 0.2], foreL: [-1.8, -0.5, 0], thighL: [-0.25, 0, 0.12], thighR: [0.2, 0, 0.1], hands: { L: 'flat' } },
    expr: 'determined', hairLen: 13,
    props: [{ hand: 'R', build: ofuda, rot: [0, 0, 0] }],
    parts: { armR: { name: 'ofuda', axis: 'y', g: [0, 0.5], idle: 0.03 } },
    base: heroBase('SAYO', 0xd8343a, { rim: 0x6a1e22 }),
    extra: (ctx) => { // a white paper tie low on her hair, a red ribbon above it; the hakama ties
      const { P } = ctx;
      ctx.in('head', () => {
        S.paint(fill(WHITE, { rough: 0.7 }), under(0.2));
        S.box(-2.4, P.chin - 4.2, P.hc[2] - P.hb * 0.62 - 3.2, 2.4, P.chin - 1.4, P.hc[2] - P.hb * 0.62 - 2.2, { bevel: 0.3 });
        S.paint(fill(RED, { rough: 0.4 }), under(0.2));
        bow(S, [0, P.chin - 0.6, P.hc[2] - P.hb * 0.62 - 3.1], 2, { rot: [0, Math.PI, 0], tails: 1.6 });
      });
      ctx.in('hips', () => { S.paint(fill(RED, { rough: 0.5 }), under(0.2)); bow(S, [0, P.waistY + 0.4, P.waistZ * 1.15 + 0.6], 1.5, { tails: 2.6 }); });
    },
  });
}

// ------------------------------------------------------------------ 5. Banchō Gōda: the long coat on his shoulders, a leaf between his teeth
export function goda(S) {
  const BLK = 0x1e2030;
  const spec = boy({
    H: 1.86, build: 1.14, hair: { style: 'wild', col: 0x1e1a22, hi: 0x6a6a90 }, face: { iris: 0x4a2e22, tilt: 1.15, lid: 'mono', browW: 1.7, blush: 0 },
    top: { kind: 'gakuran', col: BLK, open: true, inner: 0xf6f4ee }, bottom: { kind: 'slacks', col: BLK, wide: true }, shoes: { kind: 'sandal', col: 0x9a7650 }, socks: null,
    hat: { kind: 'cap', col: BLK, col2: 0x121218 },
  });
  chibi(S, spec, {
    pose: { chest: [-0.06, 0, 0], head: [-0.06, 0.2, -0.05], armL: [0.22, 0, 0.32], foreL: [0.1, 0, -0.55], armR: [0.22, 0, 0.32], foreR: [0.1, 0, -0.55], thighL: [0, 0, 0.3], thighR: [0, 0, 0.3], shinL: [0, 0, -0.18], shinR: [0, 0, -0.18], hands: { L: 'none', R: 'none' } },
    expr: 'smug',
    base: heroBase('GODA', 0x3a3a46),
    torsoPaint: (ctx) => [proj('front', or(...[0, 1, 2, 3].map((i) => seg(-2.4, ctx.P.bustY + 0.8 - i * 1.4, 2.4, ctx.P.bustY + 0.8 - i * 1.4, 0.18))), 0xd8d4c8, { near: 0 })],
    head: (ctx) => { // a cap badge; a leaf between his teeth
      const { P } = ctx;
      S.paint(fill(0xe0c050, { rough: 0.2 }));
      S.at([0, P.hc[1] + P.hh * 0.6, ctx.faceZ(0.6, 2.5)], [-0.3, 0, 0], () => star3d(S, 1.6, 0.5, { n: 6, k: 0.55 }));
      S.paint(fill(0x5a9a4a, { rough: 0.4 }), proj('front', seg(-3, 0, 3, 0, 0.18), 0x3a6a30), under(0.2));
      const m = [1.1, P.mouthY, ctx.faceZ((P.mouthY - P.hc[1]) / P.hh) + 0.2];
      lock(S, [m, add3(m, [2.2, 0.8, 1]), add3(m, [4.6, 1.8, 1.4])], 1.8, 0.4, { prof: 'diamond', out: [0, 1, 0], steps: 2, taper: (t) => Math.sin(Math.min(1, t * 1.1) * Math.PI) + 0.1 });
    },
    extra: (ctx) => {
      const { P } = ctx;
      cape(ctx, { col: BLK, lining: 0xa0242a, len: P.shoulderY - P.ankleY - 1.4, back: 4, flare: 1.15, gap: 0.62, part: { name: 'coat', g: [0, -0.55] } });
      // the coat's stand-up collar and its empty sleeves hanging behind the arms
      S.paint(fill(BLK, { rough: 0.55 }), under(0.2), crown(0.12));
      ctx.in('chest', () => S.loft([[P.neckBase, 2.8, 2.5], [P.neckBase + 2.4, 3.1, 2.8]].map(([y, rx, rz]) => Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 2 - Math.PI / 8 + i / 8 * Math.PI * 2; return [Math.cos(a) * rx, y, Math.sin(a) * rz - 0.6]; })), { caps: 'none' }));
    },
  });
}

// ------------------------------------------------------------------ 6. Mimi: an idol mid-song, on her little stage
function mic(S) {
  S.paint(fill(0xf4f2f6, { rough: 0.2 }), crown(0.2), under(0.2));
  S.cyl([0, -2.4, 0], [0.55, 0.75], 6, { segs: 6 });
  S.paint(fill(0x8a8a96, { rough: 0.25 }), vol(band(4.6, 5.0), 0xf06aa0), crown(0.2), under(0.25));
  S.lathe([[0, 3.6], [1.0, 3.8], [1.45, 4.8], [1.4, 5.8], [0.8, 6.6], [0, 6.8]], { segs: 6 });
}
export function mimi(S) {
  const TEAL = 0x46c0c0, PINK = 0xf27aa8;
  const spec = girl({
    hair: { style: 'sideponytail', col: 0xf2a65a, hi: 0xfff0c8, part: -1, volume: 1.1 }, face: { iris: 0x2aa0b0, tilt: 0.9, blush: 0.4, eyeH: 1.06 },
    top: { kind: 'blouse', col: TEAL, sleeve: 'short' }, bottom: { kind: 'skirt', cut: 'mini', col: TEAL, hem: 0xfbf8f0 }, legs: 'kneesocks', socks: { col: 0xfbf8f0 }, shoes: { kind: 'boots', col: 0xfbf8f0 },
  });
  chibi(S, spec, {
    pose: { chest: [-0.05, -0.2, -0.06], head: [-0.08, 0.15, -0.14], armR: [-0.85, 0.5, 0.35], foreR: [-2.05, 0.4, 0], armL: [-0.35, 0, 2.45], foreL: [-0.2, 0, 0.15], thighL: [0.35, 0, 0.04], shinL: [0.95, 0, 0], footL: [0.4, 0, 0], thighR: [-0.05, 0, 0.1], hands: { L: 'point' } },
    expr: { eye: 'open', eyeL: 'happy', mouth: 'shout', brow: 'up', blush: 1 }, bangs: { split: 0.16, seed: 4 }, tieCol: PINK, swing: [-4, 0, 1],
    props: [{ hand: 'R', build: mic, rot: [0.6, 0, 0] }],
    parts: { armL: { name: 'point', axis: 'z', g: [0, -0.5], idle: 0.05 } },
    base: heroBase('MIMI', 0xf27aa8, { rim: 0x8a2a5a, mark: null, top: [proj('top', or(...Array.from({ length: 12 }, (_, i) => circle(Math.cos(i / 12 * Math.PI * 2) * 11.6, Math.sin(i / 12 * Math.PI * 2) * 11.6, 0.8))), 0xffe680, { near: -1 })] }),
    extra: (ctx) => {
      const { P } = ctx;
      ctx.in('chest', () => { S.paint(fill(PINK, { rough: 0.35 }), under(0.2), crown(0.15)); bow(S, [0, P.bustY + 0.5, P.chestZ + P.bust + 0.6], 2.2, { tails: 1.4 }); });
      ctx.in('hips', () => { S.paint(fill(0xfbf8f0, { rough: 0.5 }), under(0.2)); S.loft([[P.waistY + 0.2, 1.18], [P.waistY + 1.2, 1.12]].map(([y, k]) => Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 - Math.PI / 10 + i / 10 * Math.PI * 2; return [Math.cos(a) * P.waistX * k, y, Math.sin(a) * P.waistZ * k * 1.05]; })), { caps: 'none' }); });
    },
  });
}

// ------------------------------------------------------------------ 7. Aoi of the sword school, drawing her bokken
function bokken(S) {
  const OAK = 0xc89a5a;
  S.paint(fill(0x2a2a34, { rough: 0.6 }), vol((x, y) => Math.abs(((y % 1.2) + 1.2) % 1.2 - 0.6) - 0.22, 0xf0ece0), crown(0.15));
  S.cyl([0, -3.6, 0], 0.7, 5.4, { segs: 6 });
  S.paint(fill(0x3a2a20, { rough: 0.3 }), under(0.2));
  S.at([0, 1.9, 0], [0, 0, 0], () => S.cyl([0, 0, 0], 1.7, 0.5, { segs: 8 }));
  S.paint(fill(OAK, { rough: 0.45 }), proj('right', seg(-0.6, 3, -0.6, 22, 0.2), tone(OAK, 0.2)), proj('left', seg(0.6, 3, 0.6, 22, 0.2), tone(OAK, 0.2)), crown(0.18), under(0.2));
  lock(S, [[0, 2.3, 0], [0, 9, 0.35], [0, 16, 0.6], [0, 23, 0.3]], 1.6, 1.2, { prof: 'hex', out: [0, 0, 1], steps: 2, taper: (t) => (t < 0.9 ? 1 - t * 0.2 : 0.82 * (1 - (t - 0.9) / 0.1) + 0.1) });
}
export function aoi(S) {
  const NAVY = 0x22283c;
  const spec = girl({
    hair: { style: 'ponytail', col: 0x22283a, hi: 0x6a7ab0, volume: 1.15 }, face: { iris: 0x2a5aa0, tilt: 1.05, blush: 0.15 },
    top: { kind: 'wrap', col: 0xf6f4ee, col2: NAVY, sleeve: 'elbow' }, bottom: { kind: 'hakama', col: NAVY }, shoes: { kind: 'sandal', col: 0x3a2a20 }, socks: { col: 0xf6f4ee }, legs: 'socks',
  });
  chibi(S, spec, {
    pose: { hipsAt: [0, -0.8, 0], chest: [0.1, 0.35, 0], head: [-0.05, -0.3, -0.05], armR: [-0.35, 0.2, 1.45], foreR: [-0.15, 0, 0], handR: [0, 0, 0], armL: [0.2, -0.3, 0.2], foreL: [-1.4, -0.3, 0], thighL: [-0.7, 0, 0.12], shinL: [0.65, 0, 0], footL: [0.1, 0, 0], thighR: [0.5, 0, 0.15], shinR: [0.25, 0, 0] },
    expr: 'determined', bangs: { sweep: 0.38, fan: 0.12, seed: 1 }, tieCol: 0xd8343a, swing: [2, 0, -5],
    props: [{ hand: 'R', build: bokken, rot: [Math.PI / 2, 0, 0] }],
    parts: { armR: { name: 'draw', axis: 'y', g: [0, -0.7], idle: 0.03 } },
    base: heroBase('AOI', 0x2a5aa0),
    extra: (ctx) => {
      const { P } = ctx;
      // the empty scabbard at her left hip
      S.paint(fill(0x2a2228, { rough: 0.3 }), crown(0.15), under(0.2));
      ctx.in('hips', () => S.tube([[P.hipsX * 0.7, P.waistY - 0.2, P.hipsZ + 0.8], [P.hipsX + 0.6, P.hipY + 0.4, 0], [P.hipsX + 1.2, P.hipY - 3.2, -8]], 0.9, { sides: 6 }));
    },
  });
}

// ------------------------------------------------------------------ 8. Detective Kei: trench coat, a HUD visor, a hologram in hand
function holo(S) {
  S.at([0, 4.6, 0], [0.2, 0, 0], () => {
    S.clear(true);
    S.paint(fill(0x40d8e8, { rough: 0.05 }), proj('front', or(stroke(rbox(0, 0, 3.2, 2.2, 0.3), 0.2), seg(-2.4, 1.2, 0.6, 1.2, 0.25), seg(-2.4, 0.4, 1.6, 0.4, 0.2), seg(-2.4, -0.4, 0, -0.4, 0.2), circle(1.8, -0.9, 0.7)), 0xe8ffff));
    S.box(-3.4, -2.4, -0.15, 3.4, 2.4, 0.15);
    S.clear(false);
  });
  S.paint(fill(0x2a2a34, { rough: 0.3 }));
  S.cyl([0, -0.2, 0], [1.0, 0.8], 1.2, { segs: 6 });
}
export function kei(S) {
  const COAT = 0xb89c72, CYAN = 0x30d0e0;
  const spec = boy({
    hair: { style: 'short', col: 0xd8dce8, hi: 0xffffff, part: -1 }, face: { iris: CYAN, tilt: 0.85 },
    top: { kind: 'coat', col: COAT, shirt: 0x2a2a34, tie: CYAN }, bottom: { kind: 'slacks', col: 0x2a2a34 }, shoes: { kind: 'boots', col: 0x2a2a30 },
    garb: { coat: { len: 1.1 } },
  });
  chibi(S, spec, {
    pose: { chest: [0, 0.25, 0], head: [0, -0.25, 0.05], armR: [-1.4, -0.3, 0.2], foreR: [-0.2, 0, 0], armL: [-0.35, 0.3, 0.25], foreL: [-1.35, 0.3, 0], thighL: [0, 0, 0.14], thighR: [0.1, 0, 0.12], hands: { R: 'point' } },
    expr: 'smug', coat: { len: 1.1, flare: 1.3, back: 2.4 },
    torsoPaint: (ctx) => [vol(band(ctx.P.waistY - 0.5, ctx.P.waistY + 0.5), tone(COAT, 0.2)), proj('front', rbox(0, ctx.P.waistY, 0.7, 0.5, 0.15), 0xc8b070, { near: 0 })],
    props: [{ hand: 'L', build: holo, rot: [-1.0, 0, 0] }],
    base: heroBase('KEI', 0x24343e, { textCol: 0x8af0f8 }),
    head: (ctx) => { // the HUD visor on its hinge: it lifts off the eyes
      const { P } = ctx, y = P.eyeY + 0.4, z = ctx.faceZ((y - P.hc[1]) / P.hh, 1.6);
      const temple = [P.hw * 0.86, y + 0.4, P.hc[2] + 2];
      S.rest = 0;
      S.joint('visor', { local: true, pivot: temple, axis: 'x', min: -1.2, max: 0, rest: 0, g: [0, -1.0] }, () => {
        S.paint(fill(0x2a2a34, { rough: 0.3 }), under(0.2));
        for (const s of [1, -1]) S.box(s * P.hw * 0.86 - 0.6, y - 1.1, P.hc[2] + 0.4, s * P.hw * 0.86 + 0.6, y + 1.6, P.hc[2] + 3.6, { bevel: 0.25 });
        S.clear(true);
        S.paint(fill(CYAN, { rough: 0.05 }), proj('front', or(seg(-5, 1.2, -1.8, 1.2, 0.2), stroke(circle(4.2, y - y + 0.2, 1.1), 0.2)), 0xe8ffff));
        S.loft([-2.4, 2.6].map((dy) => Array.from({ length: 9 }, (_, i) => { const a = Math.PI * 0.08 + (i / 8) * Math.PI * 0.84; return [Math.cos(a) * P.hw * 0.92, y + dy * 0.8, P.hc[2] + Math.sin(a) * (z - P.hc[2])]; }).flatMap((p, i, arr) => (i === arr.length - 1 ? [p, ...arr.slice().reverse().map((q) => [q[0] * 0.97, q[1], P.hc[2] + (q[2] - P.hc[2]) * 0.96])] : [p]))));
        S.clear(false);
      });
    },
  });
}

// ------------------------------------------------------------------ secret: Demon Lord Puchi
export function puchi(S) {
  const BLK = 0x2a2030, RED = 0xb02a3c, GOLD = 0xf0c040;
  const spec = girl({
    age: 'teen', H: 1.48, hair: { style: 'bob', col: 0x6a4aa8, hi: 0xc8a8f8 }, face: { iris: 0xf0b020, tilt: 1.25, blush: 0.35 },
    top: { kind: 'blouse', col: BLK }, bottom: { kind: 'skirt', cut: 'mini', col: BLK, hem: RED }, legs: 'tights', tights: 0x2a2030, shoes: { kind: 'boots', col: 0x3a1e30 },
  });
  chibi(S, spec, {
    pose: { from: 'hips', chest: [-0.12, 0, 0], head: [-0.16, 0.1, 0.12], thighL: [0, 0, 0.2], thighR: [0, 0, 0.2] },
    expr: { eye: 'half', mouth: 'cat', brow: 'up', blush: 1 }, bangs: { sweep: 0.28, seed: 5, ragged: 1.3 },
    base: heroBase('PUCHI', 0x3a2050, { rim: 0x1e1028, textCol: GOLD }),
    head: (ctx) => { // horns, curling up and back
      const { P } = ctx;
      S.paint(fill(0x3a3040, { rough: 0.3 }), vol(above(P.hc[1] + P.hh * 1.2), GOLD), crown(0.2), under(0.2));
      for (const s of [1, -1]) { const r = ctx.headPt(0.62, s > 0 ? 0.7 : Math.PI - 0.7, 0.4); lock(S, [add3(r, [-s * 0.6, -1.2, 0]), add3(r, [s * 1.6, 2.2, -0.4]), add3(r, [s * 2.2, 5.4, -1.6]), add3(r, [s * 0.8, 7.6, -3.4])], 3.4, 3.2, { prof: 'hex', out: [s, 0.3, 0.3], steps: 2, taper: (t) => 1 - t ** 1.1 }); }
    },
    extra: (ctx) => {
      const { P } = ctx;
      cape(ctx, { col: BLK, lining: RED, len: P.shoulderY - P.ankleY + 0.6, back: 3, flare: 1.25, gap: 0.7, jag: 1.2, part: { name: 'cape', g: [0, -0.6] } });
      // the tall flaring collar of the cape
      S.paint(fill(RED, { rough: 0.4 }), under(0.2));
      ctx.in('chest', () => { for (const s of [1, -1]) S.at([s * 2.2, P.neckBase + 0.4, -1.4], [-0.25, -s * 0.5, -s * 0.35], () => S.extrude([[0, 0], [s * 3.2, 0.4], [s * 3.8, 5.6], [s * 0.4, 3.6]], -0.25, 0.25, { bevel: 0.1 })); });
      ctx.in('chest', () => { S.paint(fill(GOLD, { rough: 0.2 }), under(0.2)); S.at([0, P.bustY + 0.4, P.chestZ + P.bust + 0.4], null, () => star3d(S, 1.5, 0.6, { n: 6, k: 0.5 })); });
    },
  });
}
