// Nikoniko Wagashi (にこにこ和菓子): smiling traditional Japanese sweets. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/wagashi.js. The family look: soft, matte sweets with
// tiny ink faces and pink cheeks, real proportions, served the proper way (kaishi paper, a plate, a tray, a stand).
import { spline, ring, swell } from '../sculpt.js';
import { head, paw, blade, drape } from '../anatomy.js';
import {
  fill, proj, wrap, vol, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, halfBelow, halfAbove, repeatU, repeatV, label, kana,
  below, above, band, blob, blobs, slabZ,
} from '../paint.js';
import { aim, limb, L, rrect } from './showa.js';

const DENS = 0.85;
const MAKER = 'AMAMI-DO';
const BLUSH = 0xf4a0a8, INK = 0x3a2a2e, ANKO = 0x5a2a30, PAPER = 0xfbf8f0;
const or_ = (...fs) => { const f = (x, y, z) => Math.min(...fs.map((g) => g(x, y, z))); f.ys = fs.flatMap((g) => g.ys || []); return f; };
const smile = (x, y, o = {}) => face({ at: [x, y], gap: o.gap ?? 4.4, r: o.r ?? 0.7, eye: o.eye ?? 'dot', mouth: o.mouth ?? 'smile', mw: o.mw ?? 1.4, my: o.my ?? 1.8, blush: o.blush === null ? null : BLUSH, near: o.near ?? 0, col: o.col ?? INK, view: o.view });
/** Kaishi: a sheet of folded paper, its folded corner turned up, under a sweet. */
function kaishi(S, w, d, y = 0, edge = 0xf2a6bc) {
  S.paint(fill(PAPER, { rough: 0.9 }), proj('top', stroke(rbox(0, 0, w - 1.6, d - 1.6, 0), 0.5), edge), under(0.08));
  drape(S, -w, -d, w, d, y + 0.6, { nx: 6, nz: 6, th: 0.5, fold: (u, v) => (u > 0.8 && v > 0.8 ? (u - 0.8) * (v - 0.8) * 40 : 0) });
}

// ------------------------------------------------------------------ 1. Hanami Dango Trio
export function dango(S) {
  S.dens = DENS;
  const WOOD = 0xc8925a;
  S.paint(fill(WOOD, { rough: 0.7 }), proj('top', or(seg(-7, -3, 7, -2.6, 0.3), seg(-7, 2.4, 7, 2.8, 0.3)), tone(WOOD, 0.16)), proj('front', kana('花見', 0, 2.4, 2.4), tone(WOOD, 0.4)), under(0.2), ...stamp(MAKER, { c: 0x7a5a3a }));
  S.box(-8, 0, -6, 8, 4.6, 6, { bevel: 1 });
  S.paint(fill(tone(WOOD, 0.3)));
  S.cyl([0, 4.4, 0], 1.6, 0.4, { segs: 10 });
  // the skewer turns in its stand (the gimmick): pink leads, white keeps the peace, green naps
  S.joint('skewer', L(S, { pivot: [0, 0, 0], axis: 'y', min: -1, max: 1, rest: 0, g: [0, 0.7], idle: 0.06 }), () => {
    S.paint(fill(0xe8d4a4, { rough: 0.75 }), proj('front', seg(0, 52, 0, 54, 0.4), tone(0xe8d4a4, 0.2)));
    S.tube([[0, 2, 0], [0, 56, 0]], 0.75, { sides: 8 });
    for (const [y, c, e, m] of [[12.4, 0xb8d89a, 'sleepy', null], [24.2, 0xfbf8f2, 'closed', 'smile'], [36, 0xf6b6c8, 'dot', 'smile']]) {
      S.paint(fill(c, { rough: 0.6 }), ...smile(0, y + 0.6, { eye: e, mouth: m, gap: 5, r: 0.8, near: 3 }), proj('front', pair(ellipse(1.2, y - 2.6, 0.7, 0.4)), tone(c, 0.12), { near: 3 }), under(0.1), crown(0.05));
      S.lathe(spline([[0, -5.4], [3.2, -5.1], [5.4, -3.4], [6, 0], [5.4, 3.4], [3.2, 5.1], [0, 5.4]], 2), { segs: 18, at: [0, y, 0] });
    }
    S.paint(fill(0x5a8a3a, { rough: 0.5 }), proj('front', seg(0, 0.4, 0, 3.6, 0.3), 0x8ac46a));
    S.at([0, 41.6, 0.4], [-0.3, 0, 0.9], () => blade(S, 4.4, 2.6, 0.5, { shape: 'leaf', cup: 0.4 }));
  });
}

// ------------------------------------------------------------------ 2. Taiyaki-kun
export function taiyaki(S) {
  S.dens = DENS;
  const GOLD = 0xdc9c4c, CRUST = 0xae6a2e, RED = 0xd8382c;
  // the paper sleeve
  S.paint(fill(PAPER, { rough: 0.85 }), vol(or_(band(4, 5), band(7, 7.6)), RED), proj('front', kana('たい焼', 0, 12.8, 3.2), RED, { near: 4 }), proj('back', label('HOT!', 0, 12, 0.36), RED, { hard: true }), under(0.1), ...stamp(MAKER, { c: 0x9a8a7a }));
  S.loft([[0, 13.6, 6.4], [1, 14, 6.8], [17, 15, 7.6], [17.4, 15.2, 7.8]].map(([y, rx, rz]) => ring([0, y, 0], rx, rz, 16, { pow: 3.6 })), { caps: 'start' });
  // the fish, standing on its tail-end in the sleeve; the bitten-off tail shows the anko (the gimmick wiggles it)
  S.joint('fish', L(S, { pivot: [0, 12, 0], axis: 'z', min: -0.3, max: 0.3, rest: 0, g: [0, 0.2], idle: 0.05 }), () => {
    const scales = or(...[[0, 22], [-3.4, 26], [3.4, 26], [0, 30], [-3.4, 34], [3.4, 34]].map(([x, y]) => arc(x, y, 2.2, Math.PI * 1.15, Math.PI * 1.85, 0.4)));
    S.paint(fill(GOLD, { rough: 0.62 }), proj('front', scales, CRUST, { near: 3 }), proj('back', scales, CRUST), vol(slabX_(-0.35, 0.35), CRUST), ...smile(0, 41, { gap: 6, r: 0.9, near: 3 }), proj('front', arc(0, 37.4, 6, 0.6, Math.PI - 0.6, 0.45), CRUST, { near: 3 }), proj('right', or(ellipse(0, 33, 3.4, 4.6)), CRUST), proj('right', or(ellipse(0, 33, 2.4, 3.6)), ANKO, { rough: 0.4 }), crown(0.08), under(0.16));
    S.loft([[5, 3, 3.6], [8, 9.6, 5.4], [14, 12.6, 6.6], [24, 13.6, 7], [34, 13, 6.8], [42, 10.4, 6], [48, 6, 4.4], [51.4, 1.4, 2]].map(([y, w, t]) => ring([0, y, 0], w, t, 18, { pow: 2.3 })));
    S.paint(fill(ANKO, { rough: 0.5 }), proj('bottom', or(circle(-2, 0, 0.5), circle(1.6, 1, 0.4), circle(0.6, -1.4, 0.5)), tone(ANKO, 0.25)));
    S.lathe(spline([[0, 4], [2.6, 4.2], [2.8, 5]], 2), { segs: 12, sz: 1.3 });
    S.paint(fill(GOLD, { rough: 0.62 }), vol(band(47.6, 48.4), CRUST), under(0.16));
    for (const s of [1, -1]) S.at([s * 12.4, 28, 0], [0, 0, -s * 1.4], () => S.extrude([[-3, 0], [3, 0], [1.6, 5.4], [-1.6, 4.2]], -0.8, 0.8, { bevel: 0.4 }));
  });
}
function slabX_(x0, x1) { const f = (x, y, z) => Math.max(z - x1, x0 - z); f.box = [-1e4, -1e4, x0, 1e4, 1e4, x1]; return f; }

// ------------------------------------------------------------------ 3. Ichigo Daifuku
export function ichigo(S) {
  S.dens = DENS;
  const MOCHI = 0xfbf8f2, BERRY = 0xe2343e;
  kaishi(S, 20, 18);
  // the daifuku: soft, dusted, a strawberry pushed into the top with the anko showing round it
  S.paint(fill(MOCHI, { rough: 0.75 }), ...smile(0, 15.4, { gap: 8, r: 1.1, mw: 2.2, my: 2.6, near: 6 }), vol(above(26), ANKO, { rough: 0.5 }), under(0.08), crown(-0.02));
  S.lathe(spline([[0, 1.1], [13, 1.1], [16, 2.6], [17.6, 6], [17, 12], [14.6, 19], [10, 24.6], [7, 26.4], [5.4, 27]], 3), { segs: 26 });
  S.paint(fill(ANKO, { rough: 0.5 }));
  S.lathe([[5.4, 27], [4.8, 26.6], [0, 26.4]], { segs: 18 });
  S.joint('berry', L(S, { pivot: [0, 26.4, 0], axis: 'z', min: -0.4, max: 0.4, rest: 0, g: [0, 0.3], idle: 0.05 }), () => {
    const seeds = or(...Array.from({ length: 14 }, (_, i) => circle(((i * 37) % 13) - 6, 28.6 + (i % 5) * 2.4, 0.35)));
    S.paint(fill(BERRY, { rough: 0.3 }), wrap(4.4, seeds, 0xf6e6a0), vol(below(28), tint(BERRY, 0.3)), crown(0.1), under(0.12));
    S.lathe(spline([[3, 26.6], [5.4, 28.6], [6, 31.4], [5.2, 34.6], [3, 37.4], [1, 39], [0, 39.4]], 3), { segs: 18 });
    S.paint(fill(0x5f9a3a, { rough: 0.5 }), proj('front', seg(0, 0.4, 0, 3.4, 0.3), 0x8ac46a));
    for (let k = 0; k < 5; k++) S.at([0, 38.6, 0], [1.2, k * 1.2566, 0], () => blade(S, 4.2, 2.2, 0.5, { shape: 'leaf', cup: -0.4 }));
    S.cyl([0, 38.6, 0], [0.5, 0.35], 2.4, { segs: 6 });
  });
}

// ------------------------------------------------------------------ 4. Dorayaki Walker
export function dorayaki(S) {
  S.dens = DENS;
  const CAKE = 0xc8783a, EDGE = 0xf0c27a, SHOE = 0xd8382c;
  // the walking legs (the gimmick takes a step)
  for (const [s, ph] of [[1, 1], [-1, -1]]) S.joint(s > 0 ? 'legR' : 'legL', L(S, { pivot: [s * 4, 13, 0], axis: 'x', min: -0.5, max: 0.5, rest: 0.25 * ph, g: [0.25 * ph, -0.25 * ph] }), () => {
    S.paint(fill(EDGE, { rough: 0.6 }), under(0.16));
    limb(S, [[s * 4, 14, 0], [s * 4.4, 8, 0], [s * 4.6, 3.6, 0]], 1.3, 1.1);
    S.paint(fill(SHOE, { rough: 0.4 }), vol(below(0.8), 0xf8f6f0), under(0.2));
    S.at([s * 4.6, 0, 0.8], null, () => S.loft([[-2.6, 1.6, 2], [-1, 2.2, 2.6], [1.8, 2, 2.2], [3.4, 1.4, 1.4], [4, 0.6, 0.7]].map(([z, w, h]) => ring([0, h, z], w, h, 10, { axis: 'z', pow: 2.4 }))));
  });
  // the dorayaki on its edge: two pancakes, the anko between them
  S.at([0, 30.6, 0], [Math.PI / 2, 0, 0], () => {
    const pan = (k) => {
      S.paint(fill(CAKE, { rough: 0.6 }), vol(k > 0 ? below(1.6) : above(-1.6), EDGE), under(0.0));
      S.lathe(spline(k > 0 ? [[0, 1], [12, 1.2], [15, 1.8], [16.4, 3], [15.6, 5], [11, 6.6], [0, 7.2]] : [[0, -7.2], [11, -6.6], [15.6, -5], [16.4, -3], [15, -1.8], [12, -1.2], [0, -1]], 3), { segs: 30 });
    };
    // (in this frame 'top' is the front: v = height above the centre)
    S.paint(fill(CAKE, { rough: 0.6 }), proj('top', stroke(circle(0, 0, 13), 0.5), tone(CAKE, 0.12)), ...smile(0, 0.4, { gap: 8.6, r: 1.3, mouth: 'o', mw: 2.4, my: 3.2, view: 'top' }), proj('top', pair(ellipse(7, -3, 2, 1.1)), BLUSH, { alpha: 0.7 }), proj('top', or(arc(-4.4, 6, 2, 0.4, 2.8, 0.5), arc(4.4, 6, 2, 0.4, 2.8, 0.5)), tone(CAKE, 0.4)), vol(below(1.6), EDGE), under(0.0));
    S.lathe(spline([[0, 1], [12, 1.2], [15, 1.8], [16.4, 3], [15.6, 5], [11, 6.6], [0, 7.2]], 3), { segs: 30 });
    void pan;
    S.paint(fill(CAKE, { rough: 0.6 }), proj('bottom', stroke(circle(0, 0, 13), 0.5), tone(CAKE, 0.12)), proj('bottom', rot180(kana('どら', 0, 0, 5)), tone(CAKE, 0.35)), vol(above(-1.6), EDGE));
    S.lathe(spline([[0, -7.2], [11, -6.6], [15.6, -5], [16.4, -3], [15, -1.8], [12, -1.2], [0, -1]], 3), { segs: 30 });
    S.paint(fill(ANKO, { rough: 0.45 }), wrap(15, or(...[[-10, 0.2], [-3, -0.3], [4, 0.3], [12, -0.2], [20, 0.2], [28, -0.3], [-18, 0]].map(([u, v]) => ellipse(u, v, 0.8, 0.5))), tone(ANKO, 0.3)));
    S.lathe([[0, -1.2], [14.8, -1.2], [15.4, 0], [14.8, 1.2], [0, 1.2]], { segs: 30 });
  });
  // little arms, mid-stride
  S.paint(fill(EDGE, { rough: 0.6 }), under(0.16));
  for (const [s, k] of [[1, -1], [-1, 1]]) {
    limb(S, [[s * 15.4, 30, 0], [s * 19.4, 26, k * 2.6], [s * 20.4, 21.6, k * 4]], 1.2, 1);
    S.at([s * 20.4, 21, k * 4.2], aim([0, -1, k * 0.3]), () => S.ball([0, 0, 0.8], [1.6, 1.4, 1.8], { segs: 8, rings: 5 }));
  }
}
const rot180 = (s) => ({ d: (u, v) => s.d(-u, -v), b: null });

// ------------------------------------------------------------------ 5. Sakura Mochi
export function sakura(S) {
  S.dens = DENS;
  const PINK = 0xf2a6bc, LEAF = 0x7aa456, PLATE = 0xf6f6f2, BLUE = 0x3a6ab8;
  // the plate: white with a blue wave rim
  S.with({ dens: 0.6 }, () => {
    S.paint(fill(PLATE, { rough: 0.3 }), proj('top', or(...Array.from({ length: 14 }, (_, i) => arc(Math.cos(i * 0.4488) * 17.4, Math.sin(i * 0.4488) * 17.4, 1.6, i * 0.4488 + 1, i * 0.4488 + 4, 0.5))), BLUE), proj('top', stroke(circle(0, 0, 14.6), 0.4), BLUE), under(0.16), ...stamp(MAKER, { c: 0x5a6a8a }));
    S.lathe(spline([[0, 0], [12, 0], [13, 0.8], [17, 1.6], [20, 3.4], [19.4, 3.8], [15, 2.4], [0, 2.2]], 2), { segs: 30 });
  });
  // the mochi: domyōji grains, a sleepy face, fast asleep
  const grains = or(...Array.from({ length: 30 }, (_, i) => { const a = i * 2.39996, r = 2 + (i % 6) * 2; return ellipse(Math.cos(a) * r, 13 + Math.sin(a) * r * 0.6 + (i % 3) - 4, 0.9, 0.6, a); }));
  S.paint(fill(PINK, { rough: 0.7 }), proj('front', grains, tint(PINK, 0.25), { near: 2 }), proj('back', grains, tint(PINK, 0.25)), ...smile(-3, 11, { eye: 'closed', mouth: null, gap: 6.4, r: 1, near: 6 }), proj('front', ellipse(-2.6, 7.6, 0.8, 0.6), INK, { near: 6 }), under(0.1), crown(0.04));
  S.at([0, 2.2, 0], [0, 0.2, 0], () => {
    S.loft([[-12, 0.6, 0.6], [-10.4, 5, 5.4], [-6, 8, 8.4], [0, 9, 9.4], [6, 8.4, 8.6], [10.4, 5.4, 5.6], [12, 0.6, 0.6]].map(([x, w, h]) => ring([x, h * 0.92, 0], w, h, 18, { axis: 'x', pow: 2.2 })));
    // the leaf, tucked over it like a futon: the gimmick turns it back
    S.joint('leaf', L(S, { pivot: [0, 1, -8], axis: 'x', min: -1.4, max: 0.1, rest: 0, g: [0, -1] }), () => {
      const veins = or(seg(0, 0, 0, 26, 0.45), ...[5, 10, 15, 20].flatMap((y) => [seg(0, y, -6, y + 4, 0.3), seg(0, y, 6, y + 4, 0.3)]));
      S.paint(fill(LEAF, { rough: 0.5 }), proj('front', veins, tint(LEAF, 0.3)), proj('back', veins, tone(LEAF, 0.2)), under(0.14));
      S.at([3, 1, -8.4], [-1.2, 0, -1.4], () => blade(S, 28, 17, 0.8, { shape: 'leaf', cup: 9 }));
    });
  });
}

// ------------------------------------------------------------------ 6. Uji Kintoki Kakigori (rare)
export function kakigori(S) {
  S.dens = DENS;
  const ICE = 0xf6f8f6, MATCHA = 0x8ab45a, SHIRA = 0xfbf8f2;
  // the glass on its foot
  S.clear(true);
  S.paint(fill(0xe4f0f4, { rough: 0.05 }));
  S.lathe(spline([[0, 0], [9, 0], [9.2, 0.8], [3, 2], [2.4, 6], [6, 8], [13, 11.6], [17, 17], [17.6, 18]], 2), { segs: 24, cap: 'bottom' });
  S.clear(false);
  // the mountain: matcha syrup on top, anko down one side, condensed milk running
  S.paint(fill(ICE, { rough: 0.8 }), vol(above(24), MATCHA, { rough: 0.5 }), vol(blob([9, 22, 8], [6, 7, 6]), ANKO), proj('front', or(seg(-6, 26, -7, 20, 0.9), seg(2, 30, 3, 22, 0.8)), 0xfbfaf2, { near: 6 }), under(0.08), crown(-0.02));
  S.lathe(spline([[0, 8.6], [5.6, 9], [12.6, 12.6], [16.4, 17.6], [16, 21.6], [13, 26], [8.4, 31.6], [4, 35.4], [0, 36.4]], 3), { segs: 26 });
  // three shiratama climbers; the gimmick sends the last one up to the summit
  const tama = (p, e, m) => { S.paint(fill(SHIRA, { rough: 0.6 }), ...smile(p[0], p[1] + 0.4, { eye: e, mouth: m, gap: 2.6, r: 0.5, mw: 1, my: 1.3, near: p[2] - 1 }), under(0.08)); S.ball(p, [3, 2.7, 2.8], { segs: 12, rings: 8 }); };
  tama([-6.6, 29.6, 9.4], 'closed', 'smile');
  tama([7.4, 25, 12.6], 'dot', 'o');
  S.joint('climb', L(S, { slide: [-4.4, 8, -4.6], min: 0, max: 1, rest: 0, g: [0, 1] }), () => tama([4.4, 30.6, 9.6], 'dot', 'smile'));
  // the 氷 flag
  S.paint(fill(0xc8925a, { rough: 0.7 }));
  S.tube([[-9, 24, -4], [-12, 55, -6]], 0.6, { sides: 6 });
  S.joint('flag', L(S, { pivot: [-12, 52, -6], axis: 'y', min: -0.5, max: 0.5, rest: 0, idle: 0.15 }), () => {
    S.paint(fill(PAPER, { rough: 0.85 }), proj('front', kana('氷', -20.6, 46, 8), 0xd8382c), proj('front', or(...[-27, -23, -19, -15].map((x) => arc(x, 37.6, 2, 0, Math.PI, 0.6))), 0x3a6ab8), proj('front', rbox(-20.6, 36.2, 8.4, 1, 0), 0x3a6ab8), proj('back', kana('氷', 20.6, 46, 8), 0xd8382c));
    S.extrude([[-12.4, 53], [-12.4, 35.2], [-29, 35.2], [-29, 53]], -6.3, -5.7);
  });
  S.paint(fill(PAPER), ...stamp(MAKER, { c: 0x8a8a8a }));
}

// ------------------------------------------------------------------ 7. Tea Ceremony Set (ultra)
export function chakai(S) {
  S.dens = DENS;
  const LACQ = 0xb8282c, BOWL = 0x3e5a4a, MATCHA = 0x9ac25a, NERI = 0xf2b6c8, BAMBOO = 0xe8d4a0;
  // the lacquer tray
  S.with({ dens: 0.55 }, () => {
    S.paint(fill(LACQ, { rough: 0.25 }), vol(below(1.2), 0x2a1a1e), proj('top', stroke(rbox(0, 0, 33, 19, 3), 0.4), 0xd8a84a), under(0.2), ...stamp(MAKER, { c: 0x8a5a5a }));
    S.loft([[0, 34, 20], [1.2, 34.6, 20.6], [3, 35, 21], [3.6, 34.4, 20.4]].map(([y, rx, rz]) => rrect([0, y, 0], rx, rz, rz * 0.3, 40)), { caps: 'start' });
    S.paint(fill(tone(LACQ, 0.1), { rough: 0.25 }));
    S.loft([[3.6, 34.4, 20.4], [3.4, 33.4, 19.4], [1.4, 33, 19]].map(([y, rx, rz]) => rrect([0, y, 0], rx, rz, rz * 0.3, 40)), { caps: 'end' });
  });
  // matcha-bowl-san bows (the gimmick); the nerikiri bows back
  S.joint('bowl', L(S, { pivot: [-2, 1.4, 0], axis: 'z', min: -0.5, max: 0, rest: 0, g: [0, -0.32] }), () => {
    const drips = or(...[[-6, 9], [-1, 7.6], [4, 9.4], [8, 8]].map(([u, v]) => rbox(u, v, 0.9, 1.6, 0.9)));
    S.paint(fill(BOWL, { rough: 0.35 }), wrap(10, drips, tint(BOWL, 0.3)), vol(below(3), 0xc8a07a, { rough: 0.8 }), vol(band(11.6, 12.6), tint(BOWL, 0.35)), ...smile(-10, 6.4, { gap: 6, r: 1, eye: 'closed', near: 9, col: 0xf6f0dc }), under(0.12));
    S.lathe(spline([[0, 1.4], [4.6, 1.4], [4.8, 3], [7, 3.4], [10, 6], [11.2, 10], [11.4, 12.6], [10.8, 12.8], [10.4, 10.6]], 3), { segs: 28, at: [-10, 0, 0] });
    S.paint(fill(MATCHA, { rough: 0.6 }), proj('top', or(...[[-12, 1], [-8, -2], [-9.6, 3], [-11.4, -3]].map(([x, y]) => circle(x, y, 0.6))), tint(MATCHA, 0.35)));
    S.lathe([[10.4, 10.6], [6, 10.8], [0, 11]], { segs: 28, at: [-10, 0, 0] });
  });
  // the whisk on its stand
  S.paint(fill(0xf2f0e8, { rough: 0.4 }), under(0.14));
  S.lathe(spline([[0, 1.4], [3.6, 1.4], [3.8, 2.2], [2, 3.4], [2.6, 6.4], [3.4, 8], [0, 8.4]], 2), { segs: 16, at: [13, 0, -10] });
  S.paint(fill(BAMBOO, { rough: 0.6 }), wrap(3.6, repeatU(rbox(0, 0, 0.15, 40, 0), 0.9, -12, 12), tone(BAMBOO, 0.3)), vol(above(16), tone(BAMBOO, 0.15)), under(0.14));
  S.lathe(spline([[0, 8.4], [3.4, 8.6], [3.8, 11], [3.4, 13.6], [2, 15], [1.4, 15.6], [1.4, 22], [1.6, 22.6], [0, 22.8]], 3), { segs: 18, at: [13, 0, -10] });
  // the nerikiri: a five-petalled flower of white bean paste, pink at the heart
  S.joint('neri', L(S, { pivot: [7, 1.4, 8], axis: 'z', min: 0, max: 0.5, rest: 0, g: [0, 0.3] }), () => {
    S.paint(fill(PAPER, { rough: 0.9 }), proj('top', stroke(rbox(12, -8, 6, 6, 0), 0.4), 0x9ac25a), under(0.08));
    S.at([12, 1.4, 8], [0, 0.4, 0], () => S.box(-6.4, 0, -6.4, 6.4, 0.5, 6.4));
    const flower = (y, k) => { const pts = []; for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, r = (6.4 - 0.9 * Math.abs(Math.cos(a * 2.5))) * k; pts.push([12 + Math.cos(a) * r, y, 8 + Math.sin(a) * r]); } return pts; };
    S.paint(fill(0xfbf2f2, { rough: 0.7 }), vol(blob([12, 7.4, 8], [4, 3, 4]), NERI), ...smile(12, 5.4, { gap: 3.4, r: 0.55, eye: 'closed', mouth: 'w', mw: 1.2, my: 1.2, near: 12 }), under(0.1));
    S.loft([flower(1.9, 0.92), flower(3, 1), flower(5.4, 0.96), flower(7.4, 0.72), flower(8.2, 0.3)], { caps: 'both' });
    S.paint(fill(0xf2c84a, { rough: 0.5 }));
    S.ball([12, 8.3, 8], [1, 0.5, 1], { segs: 8, rings: 4 });
    S.paint(fill(0x8a5a3a, { rough: 0.7 }));
    S.tube([[16, 2.4, 13], [8.6, 2.4, 14.4]], 0.4, { sides: 5 });
  });
}

// ------------------------------------------------------------------ 8. Shiratama Onsen (secret)
export function shiruko(S) {
  S.dens = DENS;
  const LACQ = 0x2a1a1e, RED = 0xb8282c, SOUP = 0x6a2a2e, SHIRA = 0xfbf8f2;
  // the lacquer bowl: black outside, red inside, a gold rim
  S.paint(fill(LACQ, { rough: 0.22 }), vol(band(19.6, 20.4), 0xd8a84a, { rough: 0.25 }), wrap(22, or(...[-24, -8, 8, 24].map((u) => or(circle(u, 12, 1.6), ...[0, 1, 2, 3, 4].map((k) => circle(u + Math.cos(k * 1.257) * 1.9, 12 + Math.sin(k * 1.257) * 1.9, 1.1))))), 0xd8a84a), under(0.16), ...stamp(MAKER, { c: 0x8a6a5a }));
  S.lathe(spline([[0, 0], [10, 0], [10.4, 2.6], [12, 3], [18, 6], [21.4, 12], [22.4, 18], [22.6, 20.4], [21.8, 20.6]], 3), { segs: 32 });
  S.paint(fill(RED, { rough: 0.22 }));
  S.lathe([[21.8, 20.6], [21.4, 18.6]], { segs: 32, cap: false });
  // the soup, beans in it
  const beans = or(...Array.from({ length: 16 }, (_, i) => { const a = i * 2.39996, r = 4 + (i % 5) * 3.4; return ellipse(Math.cos(a) * r, Math.sin(a) * r, 1, 0.65, a); }));
  S.paint(fill(SOUP, { rough: 0.2 }), proj('top', beans, tone(SOUP, 0.3)), proj('top', stroke(beans, 0.25), tint(SOUP, 0.25)));
  S.lathe(spline([[21.4, 18.6], [12, 18.8], [0, 18.8]], 2), { segs: 32 });
  // the bathers, towels on their heads; the gimmick bobs them
  const bather = (x, z, r, e, rot) => S.at([x, 18.6, z], [0, rot, 0], () => {
    S.paint(fill(SHIRA, { rough: 0.6 }), ...smile(0, 2, { eye: e, mouth: 'smile', gap: r * 0.9, r: r * 0.13, mw: r * 0.3, my: r * 0.3, near: 0 }), under(0.08), crown(0.04));
    S.ball([0, 1, 0], [r, r * 0.85, r], { segs: 14, rings: 8, v0: 0.3 });
    S.paint(fill(PAPER, { rough: 0.9 }), vol(band(r * 0.85 + 1.4, r * 0.85 + 1.8), 0x3a6ab8), under(0.1));
    S.at([0, r * 0.85 + 1, -0.4], [0, 0.3, 0.1], () => S.box(-r * 0.5, 0, -r * 0.4, r * 0.5, 1.2, r * 0.4, { bevel: 0.4 }));
  });
  S.joint('bob', L(S, { slide: [0, 1.4, 0], min: -1, max: 1, rest: 0, g: [0, 1], idle: 0.2 }), () => {
    bather(-7, 4, 5.6, 'closed', 0.2);
    bather(7, 2, 5, 'sleepy', -0.3);
    bather(0, -8, 4.6, 'closed', 0);
  });
  // a little wooden bucket floating, a wisp or two of steam (moulded in clear plastic)
  S.paint(fill(0xd8b07a, { rough: 0.7 }), vol(or_(band(19.6, 20.1), band(22, 22.5)), 0x6a5a4a), under(0.14));
  S.lathe(spline([[0, 18.4], [2.6, 18.4], [3, 19], [3.4, 22.8], [3, 22.8], [2.6, 19.6], [0, 19.6]], 2), { segs: 14, at: [12, 0, 10] });
  S.clear(true);
  S.paint(fill(0xf4f6f8, { rough: 0.2 }));
  for (const [x, z, h] of [[-12, 0, 14], [10, -6, 12], [2, 10, 10]]) {
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([x + Math.sin(t * 7) * 2, 24 + t * h, z + Math.cos(t * 7) * 1]); }
    S.tube(pts, (t) => 1.1 * (1 - t) + 0.2, { sides: 6 });
  }
  S.clear(false);
}

void ring; void swell; void head; void paw; void tint; void EYE; void star; void halfBelow; void halfAbove; void repeatV; void blobs; void slabZ; void all;
