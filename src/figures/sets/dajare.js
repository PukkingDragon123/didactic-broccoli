// Dajare Daisakusen (ダジャレ大作戦): terrible Japanese puns, in tiny 3D. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/dajare.js. The family look: every pun stands on the same
// round yellow stage, an orange rim, and the pun itself printed round the front of it in black kana.
import { spline, ring } from '../sculpt.js';
import { blade, paw, loaf, drape } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, cut, stroke, pair, repeatU, repeatV, label, kana, below, above, band, blob, blobs,
} from '../paint.js';
import { cat, catHead, form, dense, fine } from './neko_cafe.js';
import { kid } from './yokai.js';

const MAKER = 'DAJARE-YA';
const lerp = (a, b, t) => a + (b - a) * t;
const YEL = 0xf6d03a, ORANGE = 0xf28c2e, CREAM = 0xf8f2e0, INK = 0x2e2a30, BLUSH = 0xf2a0a0, WHITE = 0xf8f6f0;
const TOP = 4;

/** The family's stage: yellow, an orange rim, the pun in kana on a cream band round the front. Top at y = 4. */
function stage(S, r, pun, o = {}) {
  const h = o.kh ?? 2.1;
  S.paint(
    fill(YEL, { rough: 0.45 }), vol(below(0.8), ORANGE), vol(band(3.4, 3.9), ORANGE), wrap(r, rbox(0, 2.1, pun.length * h * 0.56 + 2.4, 1.3, 0.4), CREAM), wrap(r, kana(pun, 0, 2.1, h), INK),
    wrap(r, or(star(-pun.length * h * 0.56 - 4.6, 2.1, 1.1, 5, 0.45), star(pun.length * h * 0.56 + 4.6, 2.1, 1.1, 5, 0.45)), ORANGE),
    proj('top', or(...(o.dots ?? [[-0.6, 0.55], [0.5, -0.6], [0.65, 0.3]]).map(([x, z]) => circle(x * r, z * r, 0.9))), tint(YEL, 0.35)),
    under(0.2), ...stamp(MAKER, { c: 0x8a6a2a, px: 0.3 }),
  );
  S.lathe([...dense([[8, 0.4], [r - 0.7, 0.4]], 3), [r, 1], [r, 3.4], [r - 0.6, 4], [r - 1.6, 4]], { segs: 26, sx: o.sx ?? 1, cap: true });
}
const fface = (cx, cy, o = {}) => face({ at: [cx, cy], gap: o.gap ?? 7, r: o.r ?? 1.3, eye: o.eye || 'dot', mouth: o.mouth ?? 'smile', mw: o.mw ?? 2.2, blush: o.blush ?? BLUSH, near: o.near, my: o.my, view: o.view, col: o.col });

/** An octopus sitting at the origin, about 16 mm tall: a mantle, eight arms, o.wave: the arm a joint swings. */
function octopus(S, o = {}) {
  const C = o.col ?? 0xf27a6a;
  S.paint(fill(C, { rough: 0.4 }), ...fface(0, 7.4, { gap: 5.6, r: 1.15, eye: o.eye || 'dot', mouth: null, blush: 0xf2c0b8 }), proj('back', or(circle(-2, 10, 1), circle(2.4, 12, 0.8), circle(0, 8, 0.7)), tint(C, 0.25)), under(0.12), crown(0.06));
  form(S, [0, 0, 0], [[2.6, 0.05, 0.05, 0], [3, 4.6, 4.4, 0], [5.6, 6.8, 6.4, 0], [9.6, 7, 6.6, -0.6], [13.4, 5.8, 5.6, -1], [15.6, 2.6, 2.6, -1], [16.2, 0.05, 0.05, -1]], { n: 16 });
  S.paint(fill(C, { rough: 0.4 }));
  S.lathe([[0, 4.4], [1.7, 4.2], [2, 5], [1.5, 5.4], [0.6, 5]], { segs: 10, at: [0, 0, 6.4], cap: false });
  S.paint(fill(C, { rough: 0.4 }), vol(below(0.6), tint(C, 0.35)));
  for (let k = 0; k < 8; k++) {
    if (k === o.skip) continue;
    const a = (k / 8) * Math.PI * 2 + 0.2, sgn = k % 2 ? 1 : -1;
    S.tube(spline([[Math.sin(a) * 4, 3.2, Math.cos(a) * 4], [Math.sin(a) * 7.4, 0.9, Math.cos(a) * 7.4], [Math.sin(a + sgn * 0.3) * 9.6, 0.6, Math.cos(a + sgn * 0.3) * 9.6], [Math.sin(a + sgn * 0.6) * 10.4, 1.6, Math.cos(a + sgn * 0.6) * 10.4]], 2), (t) => lerp(1.5, 0.4, t), { sides: 6 });
  }
}

// ------------------------------------------------------------------ 1. Mikan on an Alumi-can
export function mikan(S) {
  const CAN = 0xc8ccd2, BLUE = 0x3f7fc6, MIK = 0xf2902e;
  stage(S, 15, 'アルミ缶の上にあるミカン', { kh: 1.7 });
  S.paint(
    fill(CAN, { rough: 0.25 }), vol(band(TOP + 8, TOP + 16), BLUE), vol(band(TOP + 16, TOP + 16.6), 0xf6f2ea), wrap(7.4, kana('アルミ', 0, TOP + 12, 3.4), 0xf6f2ea), wrap(7.4, label('ALUMI', 12, TOP + 12, 0.3), 0xf6f2ea, { hard: true }),
    wrap(7.4, or(circle(-9, TOP + 21, 1.8), circle(-6.4, TOP + 22.6, 1.2)), 0xf2a0c0), wrap(7.4, label('SODA', -8, TOP + 5, 0.3), BLUE, { hard: true }), vol(below(TOP + 1.6), tone(CAN, 0.2)),
  );
  S.lathe(dense([[5.4, TOP], [7, TOP + 1.2], [7.4, TOP + 2.6], [7.4, TOP + 24], [6.8, TOP + 26], [5.8, TOP + 26.8], [6, TOP + 27.4], [5.6, TOP + 27.6]], 2), { segs: 20, cap: true });
  S.paint(fill(0xd8dce2, { rough: 0.25 }));
  S.at([0, TOP + 27.6, 1.6], [-Math.PI / 2, 0, 0], () => S.extrude([[-1.4, 0], [1.4, 0], [1.6, 2.6], [0.9, 3.8], [-0.9, 3.8], [-1.6, 2.6]], -0.2, 0.2));
  // the mikan, sitting on it, pleased about it
  S.joint('mikan', { pivot: [0, TOP + 27.6, 0], axis: 'z', min: -0.3, max: 0.3, rest: 0, g: [0, 0.25], idle: 0.05 }, () => {
    S.paint(fill(MIK, { rough: 0.6 }), ...fface(0, TOP + 34.4, { gap: 7.4, r: 1.35, mouth: 'w', mw: 2.4, near: 4 }), proj('front', or(circle(-5.6, TOP + 37.6, 0.35), circle(4.4, TOP + 39, 0.35), circle(6, TOP + 33, 0.3), circle(-6.8, TOP + 32, 0.3)), tone(MIK, 0.14)), proj('top', stroke(circle(0, 0, 1.6), 0.4), tone(MIK, 0.25)), crown(0.1), under(0.15));
    S.lathe(spline([[0, 0], [5.2, 0.6], [8.4, 3.4], [9.2, 6.6], [8, 9.8], [4.6, 12], [1.2, 12.4], [0, 12.2]], 3).map(([r, y]) => [r, TOP + 27.2 + y]), { segs: 22, sz: 0.94 });
    S.paint(fill(0x6a8a3a));
    S.cyl([0, TOP + 39.2, 0], 0.7, 1.4, { segs: 8 });
    S.paint(fill(0x5f9a4a, { rough: 0.45 }), proj('front', seg(0, 0.4, 0, 5, 0.25), tint(0x5f9a4a, 0.3)));
    S.at([0.6, TOP + 40, 0], [0.3, 0.4, -1.1], () => blade(S, 6.4, 3.6, 0.6, { shape: 'leaf', cup: 0.6 }));
  });
}

// ------------------------------------------------------------------ 2. The Cat Lay Down
export function neko(S) {
  const COAT = 0xeda45c, DARK = 0xc8743a, ZAB = 0x3f5aa8;
  stage(S, 19, 'ネコがねころんだ');
  // the zabuton cushion, tassels at the corners
  S.paint(fill(ZAB, { rough: 0.85 }), proj('top', or(...[[-9, 6], [-3, -7], [6, 8], [10, -4], [-11, -5], [2, 1]].map(([x, z]) => star(x, z, 1.3, 4, 0.4, 0.4))), 0xf2efe4), proj('top', stroke(rbox(0, 0, 13, 11, 4), 0.3, 1.2), tone(ZAB, 0.2)), under(0.2));
  form(S, [0, TOP, 0], [[0, 12, 10, 0], [1, 13.6, 11.6, 0], [2.6, 14, 12, 0], [3.8, 13.4, 11.4, 0], [4.4, 12.2, 10.2, 0]], { pow: 3, n: 30, caps: 'both' });
  S.paint(fill(0xf2c83a));
  for (const [x, z] of [[-13, -11], [13, -11], [-13, 11], [13, 11]]) S.ball([x, TOP + 2.6, z], [1, 1.4, 1], { segs: 8, rings: 5 });
  // the cat, flat out, belly up a little
  const B = TOP + 4.4;
  S.paint(fill(COAT), vol(blob([0, B + 2, 3.4], [5, 2.6, 7]), 0xf8f2e6), proj('top', or(seg(-6, 4, 6, 3, 1), seg(-6, -1, 6, -1.6, 1), seg(-6, -6, 6, -6.6, 1)), DARK), under(0.15));
  S.at([1, B + 3.6, 0], [0, -Math.PI / 2, 0.3], () => loaf(S, [0, 0, 0], [5.6, 4.2, 10], { flat: 0.9 }));
  S.paint(fill(COAT), vol(band(B + 4, B + 5), DARK), under(0.15));
  S.tube(spline([[11, B + 3, 0], [15, B + 2.4, -2], [16, B + 2.4, -7], [13, B + 2.6, -10]], 3), (t) => lerp(2, 1.4, t), { sides: 8 });
  S.paint(fill(0xf8f2e6), under(0.2));
  for (const [x, z, a] of [[-2, 6.6, 0.4], [3.6, 6.4, -0.2], [7.6, 5, -0.9], [8.6, -4, 2.6]]) S.at([x, B + 1, z], [0, a, 0], () => paw(S, [0, 0, 0], 3.4, 4.6, 2.2, { toes: 3 }));
  S.joint('head', { pivot: [-7, B + 4, 0], axis: 'x', min: -0.3, max: 0.3, rest: 0, g: [0, 0.25], idle: 0.03 }, () => S.at([-10.4, B + 6.4, 1.4], [-0.2, 0.5, 1.2], () => catHead(S, { coat: COAT, eye: 'sleepy', headMarks: [proj('front', or(seg(-1.7, 7.4, -1.3, 4.8, 0.75), seg(0, 8, 0, 5.2, 0.75), seg(1.7, 7.4, 1.3, 4.8, 0.75)), DARK)] }), 0.82));
}

// ------------------------------------------------------------------ 3. The Frog Goes Home
export function kaeru(S) {
  const FROG = 0x7fc85a, BELLY = 0xf2f4c8, SHIRT = 0xf8f6f0, TIE = 0xd8423a, CASE = 0x8a5a3a;
  stage(S, 17, 'カエルがかえる');
  S.paint(fill(FROG, { rough: 0.35 }), under(0.15));
  for (const s of [1, -1]) paw(S, [s * 4.6, TOP, 1.4], 7, 8, 2.6, { toes: 3 });
  S.paint(fill(FROG, { rough: 0.35 }), vol(blob([0, TOP + 9, 5], [4.6, 5, 3]), BELLY), vol(above(TOP + 11), SHIRT), proj('front', poly([[-1.2, TOP + 21], [1.2, TOP + 21], [1.6, TOP + 13], [0, TOP + 11.4], [-1.6, TOP + 13]]), TIE, { facing: 0.3 }), under(0.15));
  form(S, [0, TOP, 0], [[1.6, 0.05, 0.05, 0], [2, 5.6, 5, 0], [4.4, 7.6, 6.6, 0.4], [8.6, 7.8, 6.8, 0.8], [13, 7, 6.2, 0.6], [17, 5.6, 5, 0.2], [19.4, 3.2, 3, 0], [20, 0.05, 0.05, 0]]);
  // the head: wide, the eyes up on top, a grin from side to side
  S.at([0, TOP + 25.4, 0.6], null, () => {
    S.paint(fill(FROG, { rough: 0.35 }), vol(below(-2.6), BELLY), proj('front', arc(0, 1.4, 7.6, Math.PI * 1.2, Math.PI * 1.8, 0.6), 0x3a6a2a), proj('front', pair(ellipse(6.6, -1, 1.8, 1)), BLUSH, { alpha: 0.8 }), under(0.12));
    form(S, [0, 0, 0], [[-6.4, 0.05, 0.05, 0.6], [-6, 6.6, 5, 0.6], [-4, 10, 7.4, 0.5], [-1, 11, 8, 0.3], [2.4, 10.4, 7.6, 0], [4.6, 8, 6, -0.2], [5.8, 0.05, 0.05, -0.2]], { pow: 2.4, n: 18 });
    for (const s of [1, -1]) {
      S.paint(fill(FROG, { rough: 0.35 }), under(0.12));
      S.ball([s * 5.2, 4.6, 1.8], [3.8, 3.4, 3.6], { segs: 12, rings: 7 });
      S.paint(fill(0xfaf8f2, { rough: 0.2 }), proj('front', circle(s * 5.2 + s * 0.3, 5.6, 1.4), INK), proj('front', circle(s * 5.2 - 0.2, 6.2, 0.45), 0xffffff));
      S.ball([s * 5.2, 5.4, 3.6], [2.6, 2.6, 2.4], { segs: 12, rings: 7 });
    }
  });
  // one hand waving (otsukaresama!), the other with the briefcase
  S.paint(fill(SHIRT), under(0.15));
  S.tube(spline([[-6.2, TOP + 17.4, 0.6], [-8.4, TOP + 13, 1.4], [-8.4, TOP + 10, 2]], 2), [2, 1.8], { sides: 8 });
  S.paint(fill(FROG, { rough: 0.35 }));
  S.ball([-8.4, TOP + 9.4, 2], [1.9, 1.9, 1.9], { segs: 10, rings: 6 });
  S.joint('wave', { pivot: [6.2, TOP + 17.4, 0.6], axis: 'z', min: -0.6, max: 0.5, rest: 0, g: [0, 0.4], idle: 0.18 }, () => {
    S.paint(fill(SHIRT), under(0.15));
    S.tube(spline([[6.2, TOP + 17.4, 0.6], [9.4, TOP + 21, 1], [10.4, TOP + 26, 1.6]], 2), [2, 1.8], { sides: 8 });
    S.paint(fill(FROG, { rough: 0.35 }));
    S.at([10.4, TOP + 27.4, 1.6], [0, 0, -0.2], () => { S.ball([0, 0, 0], [2.2, 2, 1.4], { segs: 10, rings: 6 }); for (const a of [-0.6, 0, 0.6]) S.ball([Math.sin(a) * 2.8, Math.cos(a) * 2.8, 0], 0.9, { segs: 8, rings: 5 }); });
  });
  S.paint(fill(CASE, { rough: 0.5 }), proj('front', stroke(rbox(-11.4, TOP + 4.6, 4.4, 3.4, 0.6), 0.3), tone(CASE, 0.25)), crown(0.08), under(0.2));
  S.box(-16, TOP, -0.6, -6.8, TOP + 8.6, 4.6, { bevel: 0.8 });
  S.paint(fill(0xd8b45a, { rough: 0.25 }));
  S.tube(spline([[-13.4, TOP + 8.6, 2], [-12.4, TOP + 10.6, 2], [-10.4, TOP + 10.6, 2], [-9.4, TOP + 8.6, 2]], 2), 0.5, { sides: 6 });
}

// ------------------------------------------------------------------ 4. Octopus Flies a Kite
export function tako(S) {
  const KITE = 0xf6f0e0, RED = 0xd8423a, SAND = 0xe8d4a0;
  stage(S, 17, 'タコがタコをあげる', { kh: 1.9 });
  S.paint(fill(SAND, { rough: 0.95 }), proj('top', or(ellipse(4, 3, 0.8, 0.5), ellipse(-5, -2, 0.7, 0.4)), tone(SAND, 0.2)));
  S.lathe(dense([[14, TOP], [11, TOP + 1.6], [6, TOP + 2.6], [0, TOP + 3]], 2), { segs: 22, cap: false });
  S.at([-3, TOP + 2.6, 2], [0, 0.4, 0], () => octopus(S, { eye: 'dot' }));
  // the string from its arm to the kite; the kite, a little octopus painted on it, two tails
  S.paint(fill(0xf6f2ea, { rough: 0.7 }));
  S.tube(spline([[2.6, TOP + 9.4, 6], [6, TOP + 22, 4], [9.4, TOP + 34, 1.4], [11, TOP + 41, 0]], 3), 0.18, { sides: 4 });
  S.joint('kite', { pivot: [11, TOP + 41, 0], axis: 'z', min: -0.4, max: 0.4, rest: 0, g: [0, 0.3], idle: 0.1 }, () => S.at([11, TOP + 47, -1], [0.1, -0.3, -0.2], () => {
    S.paint(fill(KITE, { rough: 0.8 }), proj('front', stroke(rbox(0, 0, 6.6, 8, 0), 0.5), RED), proj('front', or(ellipse(0, 1.4, 3.6, 3.4), ...[-2.6, -0.9, 0.9, 2.6].map((x) => seg(x, -1.4, x * 1.3, -5.4, 0.7))), RED), proj('front', or(circle(-1.2, 1.4, 0.6), circle(1.2, 1.4, 0.6)), KITE), proj('front', kana('タコ', 0, 6, 2), INK));
    S.box(-6.6, -8, -0.25, 6.6, 8, 0.25);
    S.paint(fill(0xd8c08a));
    S.tube([[-6.6, -8, -0.4], [6.6, 8, -0.4]], 0.25, { sides: 4 }); S.tube([[6.6, -8, -0.4], [-6.6, 8, -0.4]], 0.25, { sides: 4 });
    S.paint(fill(RED, { rough: 0.7 }));
    for (const s of [1, -1]) S.tube(spline([[s * 5, -8, 0], [s * 6.4, -12, 0.6], [s * 4.6, -16, 1.2], [s * 6, -20, 1.6]], 3), 0.35, { sides: 4, flat: [2.4, 0.5] });
  }));
}

// ------------------------------------------------------------------ 5. Squid on a Raft
export function ika(S) {
  const SQUID = 0xf6c0c8, LOG = 0xb08050, SEA = 0x6ab0e0;
  stage(S, 19, 'イカのいかだ');
  S.paint(fill(SEA, { rough: 0.15 }), proj('top', or(arc(-8, 6, 4, 0.3, 2, 0.4), arc(9, -7, 3, 3.4, 5, 0.4), arc(-11, -6, 2.4, 0.4, 2.4, 0.3)), 0xd8f0f8));
  S.cyl([0, TOP - 0.2, 0], 17.2, 1.2, { segs: 24, bevel: 0.3 });
  S.joint('bob', { pivot: [0, TOP + 1, 0], axis: [1, 0, 0.5], min: -0.15, max: 0.15, rest: 0, g: [0, 0.1], idle: 0.05 }, () => {
    // the raft: five logs, tied with rope; a mast with a striped flag
    S.paint(fill(LOG, { rough: 0.8 }), proj('right', stroke(circle(0, 0, 1), 0.2), tone(LOG, 0.25)), vol((x) => Math.abs(x) - 11.4, tint(LOG, 0.2)), under(0.2));
    for (let i = 0; i < 5; i++) S.at([0, TOP + 2.4, -8 + i * 4], [0, 0, Math.PI / 2], () => S.cyl([0, -12, 0], 2, 24, { segs: 10, bevel: 0.6 }));
    S.paint(fill(0xd8c08a, { rough: 0.9 }));
    for (const x of [-8, 8]) S.tube([[x, TOP + 4.5, -10.4], [x, TOP + 4.5, 10.4]], 0.45, { sides: 5 });
    S.paint(fill(0xb08050));
    S.tube([[-9, TOP + 4, -6], [-9, TOP + 32, -6]], 0.6, { sides: 6 });
    S.paint(fill((x, y) => (Math.floor((y + 60) / 1.8) % 2 ? 0x2e4a86 : WHITE), { rough: 0.7 }));
    S.at([-9, TOP + 25, -6], [0, -0.2, 0], () => S.extrude([[0, 0], [10, 0.8], [10.6, 6.4], [0, 6.6]], -0.2, 0.2));
    // the squid, just drifting
    S.at([2, TOP + 4.4, 1], [0, -0.3, 0], () => {
      S.paint(fill(SQUID, { rough: 0.35 }), ...fface(0, 6, { gap: 6, r: 1.4, eye: 'sleepy', mouth: null }), proj('back', or(circle(-2, 14, 0.9), circle(2, 18, 0.7), circle(0, 22, 0.8)), tone(SQUID, 0.2)), under(0.12), crown(0.06));
      form(S, [0, 0, 0], [[2.4, 0.05, 0.05, 0], [2.8, 4.8, 4.4, 0], [6, 5.8, 5.2, 0], [12, 5.4, 4.8, -0.4], [18, 4, 3.6, -0.8], [23, 2.2, 2, -1.2], [25.2, 0.05, 0.05, -1.4]], { n: 16 });
      S.paint(fill(SQUID, { rough: 0.35 }), under(0.12));
      for (const s of [1, -1]) S.at([s * 2.6, 21, -1], [0, 0, -s * 1.25], () => blade(S, 6.4, 6.6, 0.8, { shape: 'leaf', cup: 0.4 }));
      S.paint(fill(SQUID, { rough: 0.35 }), vol(below(0.8), tint(SQUID, 0.3)));
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; S.tube(spline([[Math.sin(a) * 3, 2.6, Math.cos(a) * 3], [Math.sin(a) * 5.6, 0.6, Math.cos(a) * 5.6], [Math.sin(a + 0.4) * 8, 0.6, Math.cos(a + 0.4) * 8]], 2), (t) => lerp(1, 0.35, t), { sides: 5 }); }
      for (const s of [1, -1]) S.tube(spline([[s * 2, 2.4, 3], [s * 6, 1, 7.6], [s * 9, 1.2, 10]], 2), (t) => lerp(0.8, 0.5, t), { sides: 5 });
      for (const s of [1, -1]) S.ball([s * 9.2, 1.2, 10.2], [1.4, 0.7, 1.8], { segs: 8, rings: 4 });
    });
  });
}

// ------------------------------------------------------------------ 6. Panda's Bakery
export function panda(S) {
  const BLACK = 0x2e2a30, PWHITE = 0xf8f6f0, WOOD = 0xc8a070, CRUST = 0xd8964a, MELON = 0xf2d27a;
  stage(S, 21, 'パンダのパン屋');
  // the display counter: wood, a glass front, a striped valance
  S.paint(fill(WOOD, { rough: 0.6 }), proj('front', or(seg(-15, TOP + 3, 15, TOP + 3, 0.25)), tone(WOOD, 0.2)), under(0.2), crown(0.06));
  S.box(-17, TOP, 0, 17, TOP + 12, 10, { bevel: 0.6 });
  S.paint(fill((x) => (Math.floor((x + 60) / 3.4) % 2 ? 0xd8423a : PWHITE), { rough: 0.7 }), under(0.2));
  S.box(-17.2, TOP + 9.4, 9.6, 17.2, TOP + 12, 10.6, { bevel: 0.2 });
  // the bread: melon-pan, an-pan, a croissant, a loaf of shokupan, a basket of baguettes
  const T = TOP + 12;
  S.paint(fill(MELON, { rough: 0.6 }), proj('top', or(...[-1, 1].flatMap((d) => [-2, 0, 2].map((k) => seg(-11.6 + k - 3 * d, -6 - 3, -11.6 + k + 3 * d, -6 + 3, 0.25)))), tone(MELON, 0.2)), crown(0.06));
  S.lathe(spline([[0, 0], [3.6, 0.2], [4, 1.6], [3.2, 3], [0, 3.6]], 2), { segs: 16, at: [-11.6, T, 6] });
  S.paint(fill(CRUST, { rough: 0.5 }), proj('top', circle(-4, -6, 0.6), 0x2e2a30), crown(0.15));
  S.lathe(spline([[0, 0], [3.4, 0.2], [3.6, 1.4], [2.6, 2.8], [0, 3.2]], 2), { segs: 16, at: [-4, T, 6] });
  S.paint(fill(0xe8a85a, { rough: 0.5 }), vol((x) => Math.abs(Math.sin((x - 4) * 1.6)) - 0.85, tone(0xe8a85a, 0.25)), crown(0.15));
  S.tube(spline([[0.6, T + 1.4, 4.4], [3, T + 2.4, 6.4], [6, T + 2.6, 6.6], [8.6, T + 1.4, 4.6]], 3), (t) => 0.8 + 1.8 * Math.sin(t * Math.PI), { sides: 10 });
  S.paint(fill(0xf6e8c8, { rough: 0.7 }), vol(above(T + 4.2), CRUST));
  S.box(10, T, 3, 16, T + 5.4, 9, { bevel: 1.6 });
  // the panda, chef's hat, apron, with a tray of fresh rolls
  S.at([0, TOP, -6], null, () => cat(S, {
    coat: PWHITE, light: PWHITE, eye: 'dot', eyeCol: BLACK, blush: BLUSH, whisker: false, nose: BLACK, mouthCol: 0x6a6670, legCol: BLACK, sleeve: BLACK, hand: BLACK, feet: BLACK, tail: false,
    ear: [BLACK, BLACK], earShape: 'round', earSize: [5.4, 6, 2], earX: 6.6, earTilt: 0.7,
    headMarks: [vol(blobs(blob([-4.6, 0.6, 7], [2.6, 3.2, 3]), blob([4.6, 0.6, 7], [2.6, 3.2, 3])), BLACK)],
    face: [proj('front', or(circle(-4.4, 1.2, 0.6), circle(4.8, 1.2, 0.6)), 0xffffff)],
    outfit: [vol(band(18.6, 23.6), BLACK), proj('front', rbox(0, 13, 6.4, 6.6, 1.4), 0xf2e2c4, { facing: 0.2 }), proj('front', pair(seg(3.4, 19.4, 4.6, 23.6, 0.8)), 0xf2e2c4), proj('front', kana('パン', 0, 13.4, 3), 0xd8423a, { facing: 0.2 })],
    arms: [[7.4, 21.4, 7], [-7.4, 21.4, 7]],
    onHead: (S) => {
      S.paint(fill(WHITE, { rough: 0.7 }), vol(below(8.6), tone(WHITE, 0.06)), crown(0.05));
      S.cyl([0, 6.6, -0.6], [7, 7.4], 3, { segs: 18, bevel: 0.4 });
      for (const [x, z, r] of [[0, 0, 5.4], [-4.4, 0.4, 3.8], [4.4, 0, 3.8], [0, -3.6, 4], [0, 3.4, 3.6]]) S.ball([x, 12.6, z - 0.6], [r, r * 0.82, r], { segs: 12, rings: 7 });
    },
  }));
  S.joint('tray', { pivot: [0, TOP + 21.4, 1], axis: 'x', min: -0.3, max: 0.3, rest: 0, g: [0, -0.2], idle: 0.03 }, () => {
    S.paint(fill(0xc8ccd2, { rough: 0.3 }), crown(0.1));
    S.box(-9.6, TOP + 22, -2.6, 9.6, TOP + 22.8, 6, { bevel: 0.3 });
    S.paint(fill(CRUST, { rough: 0.5 }), crown(0.2));
    for (const [x, z] of [[-6, 0], [-2, 3], [2, 0], [6, 3], [-6, 3.6], [6, -0.4]]) S.ball([x, TOP + 24, z], [1.9, 1.5, 1.7], { segs: 10, rings: 6 });
  });
}

// ------------------------------------------------------------------ 7. The Futon Flew Away
export function futon(S) {
  const RAIL = 0xe8e8e4, FUTON = 0xf2a0b8, PATTERN = 0xf8e0e8;
  stage(S, 21, 'ふとんがふっとんだ');
  // the balcony rail and the drying pole
  S.paint(fill(RAIL, { rough: 0.4 }), crown(0.1), under(0.2));
  S.box(-18, TOP + 15, -8.6, 18, TOP + 16.4, -6.6, { bevel: 0.4 });
  for (let x = -16; x <= 16; x += 3.2) S.box(x - 0.4, TOP, -8, x + 0.4, TOP + 15, -7.2);
  S.box(-18, TOP, -8.6, 18, TOP + 1.4, -6.6, { bevel: 0.3 });
  S.paint(fill(0x8a8e96, { rough: 0.3 }));
  for (const x of [-16, 16]) S.tube([[x, TOP + 16.4, -7.6], [x, TOP + 34, -7.6]], 0.6, { sides: 6 });
  S.tube([[-17, TOP + 34, -7.6], [17, TOP + 34, -7.6]], 0.7, { sides: 6 });
  // the futon, airborne, one peg still hanging on
  S.joint('futon', { pivot: [6, TOP + 34, -7.6], axis: 'x', min: -0.4, max: 0.4, rest: 0, g: [0, -0.3], idle: 0.08 }, () => {
    const dots = (x, y, z) => { const i = Math.round(x / 3.2), j = Math.round(z / 3.2); return Math.hypot(x - i * 3.2, z - j * 3.2) < 0.9 ? PATTERN : FUTON; };
    S.paint(fill(dots, { rough: 0.85 }), under(0.12));
    S.at([8, TOP + 39, -12.6], [-1.05, -0.2, 0.3], () => drape(S, -12, -8, 12, 8, 0, { nx: 10, nz: 8, th: 3, fold: (u, v) => 3.6 * Math.sin(u * Math.PI * 1.4 + v * 2) + 2 * Math.sin(v * Math.PI) }));
    S.paint(fill(0x5fae5a, { rough: 0.4 }));
    S.box(5.4, TOP + 32.4, -9, 6.6, TOP + 36, -6.2, { bevel: 0.3 });
  });
  // the kid with the futon beater, too late
  S.at([-9, TOP, 7], [0, 0.45, 0], () => kid(S, {
    cloth: 0x5a8ad8, shoes: 'shoes', shoeCol: 0xf6f2ea, hair: 'short', eye: 'stare', mouth: 'o', legCol: 0xf8d8c2,
    body: [[5.4, 0.05, 0.05, 0], [5.6, 5.6, 4.8, 0], [7, 6, 5.2, 0], [10, 5.8, 5, 0.2], [14, 5.8, 5, 0.4], [18.2, 6, 5, 0.3], [21.2, 5.4, 4.4, 0.2], [23.2, 3.4, 3, 0], [24, 0.05, 0.05, 0]],
    outfit: [vol(below(10.4), 0x3a3a52), proj('front', star(0, 17, 2, 5, 0.45), 0xf6d03a)],
    sleeve: 0x5a8ad8, arms: [[8, 28, 2], [-7.4, 14, 4]],
  }));
  S.paint(fill(0xd8b478, { rough: 0.5 }));
  S.tube([[-0.9, TOP + 27.6, 5.3], [2.4, TOP + 40, 3.6]], 0.5, { sides: 6 });
  S.at([3, TOP + 42.6, 3.2], [0.3, 0.3, -0.25], () => { S.torus([0, 0, 0], 2.6, 0.45, { segs: 14, sides: 5 }); S.at([0, 0, 0], [0, 0, 0], () => S.tube(spline([[-2.6, 0, 0], [-1, 0, 1.4], [1, 0, -1.4], [2.6, 0, 0]], 2), 0.35, { sides: 4 })); });
}

// ------------------------------------------------------------------ 8. Samui Oyaji (secret)
export function samui(S) {
  const SUIT = 0x4a4a5a, SHIRT = 0xf8f6f0, TIE = 0xd8423a, ICE = 0xd8f0f8;
  stage(S, 22, '寒いオヤジギャグ');
  // a little stand-mic stage for the pun
  S.paint(fill(0x8a5a3a, { rough: 0.6 }), crown(0.06), under(0.2));
  S.box(-14, TOP, -9, 2, TOP + 3, 7, { bevel: 0.5 });
  // dad: suit trousers, shirtsleeves, the necktie round his head, very pleased
  S.at([-6, TOP + 3, -1], [0, 0.4, 0], () => kid(S, {
    cloth: SHIRT, shoes: 'shoes', shoeCol: 0x2e2a30, hair: 'bald', eye: 'closed', mouth: 'smile', legCol: SUIT, skin: 0xf2c8a8,
    body: [[3.6, 0.05, 0.05, 0], [3.8, 6.2, 5.4, 0], [5, 6.8, 6, 0], [8.6, 7.6, 7, 0.6], [12.4, 8.2, 7.8, 1.2], [16.4, 7.4, 6.8, 1], [20.4, 6, 5, 0.4], [23, 3.6, 3.2, 0], [24, 0.05, 0.05, 0]],
    outfit: [vol(below(9.6), SUIT), vol(band(9.6, 10.6), 0x2e2a30)],
    sleeve: SHIRT, arms: [[7.8, 26, 3], [-6, 18.6, 7]],
    onHead: (S) => {
      S.paint(fill(0x6a6a72, { rough: 0.6 }));
      for (const s of [1, -1]) S.ball([s * 9, 1.6, -2.6], [2, 3.4, 4], { segs: 10, rings: 6 });
      S.tube(spline([[-6, 7.4, 2], [-2, 9.6, 3], [3, 9.4, 2], [6, 7, 0.6]], 3), 0.5, { sides: 5 });
      S.paint(fill(0x3a3a42, { rough: 0.6 }));
      S.tube(spline([[-3.6, -2.4, 9.2], [-1.4, -1.6, 9.8], [0, -2, 9.9], [1.4, -1.6, 9.8], [3.6, -2.4, 9.2]], 2), (t) => 0.5 + 0.5 * Math.sin(t * Math.PI), { sides: 6 });
      S.paint(fill(TIE, { rough: 0.5 }), vol((x, y, z) => Math.abs(((x + z + 60) % 2.4) - 1.2) - 0.4, 0xf2c83a));
      S.torus([0, 6.6, -0.6], 9.2, 0.8, { segs: 22, sides: 5, sy: 0.7 });
      S.at([-8.4, 6.6, -4], [0.2, 0.4, 1.9], () => blade(S, 7, 2.4, 0.6, { shape: 'leaf', cup: 0.6 }));
    },
  }));
  S.joint('mic', { pivot: [2.4, TOP + 29, -1.2], axis: 'z', min: -0.3, max: 0.4, rest: 0, g: [0, 0.3], idle: 0.05 }, () => {
    S.paint(fill(0x3a3a42, { rough: 0.3 }));
    S.at([2.6, TOP + 30.6, -0.4], [0.4, 0, -0.3], () => { S.cyl([0, -4, 0], [0.6, 0.9], 4, { segs: 10 }); S.paint(fill(0xc8ccd2, { rough: 0.3 })); S.ball([0, 1, 0], [1.6, 1.8, 1.6], { segs: 12, rings: 7 }); });
  });
  // the audience: frozen solid, in a block of ice
  S.at([11, TOP, 2], [0, -0.4, 0], () => {
    fine(0.5, () => { for (const [x, c, a] of [[-3.4, 0x5fae5a, 0.1], [3.4, 0xf2a0b8, -0.1]]) S.at([x, 0.4, 0], [0, a, 0], () => kid(S, { cloth: c, shoes: 'shoes', hair: x < 0 ? 'short' : 'okappa', eye: 'stare', mouth: 'o', headJoint: false, arms: [[6, 22, 4], [-6, 22, 4]] }), 0.42); });
    S.clear(true);
    S.paint(fill(ICE));
    S.box(-8, 0, -5, 8, 22, 5, { bevel: 1.6 });
    S.clear(false);
    S.paint(fill(0xf8fcff, { rough: 0.2 }), crown(0.1));
    for (const [x, z, h] of [[-6, 4.4, 2], [5, 4.6, 1.6], [7, -3, 2.4]]) S.cone([x, 0, z], 1.2, h, { segs: 6 });
  });
}

void ring; void shade; void tint; void and; void cut; void repeatU; void repeatV; void above; void EYE; void label;
