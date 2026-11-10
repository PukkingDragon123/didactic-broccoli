// Obake Yashiki (おばけ屋敷): the cast and props of a summer-festival haunted house, chibi and only scary-ish, each on
// the attraction's own plum stage disc. Sculpt programs in millimetres (src/figures/sculpt.js); data: src/data/series/obake_yashiki.js.
import { spline, ring, QUAL } from '../sculpt.js';
import { head, torso, blade, drape } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, or, and, stroke, pair, all, label, kana, below, above, band, blob, blobs, repeatU, repeatV,
} from '../paint.js';

const MAKER = 'YOMIYA';
const GA = 2.39996;
const PLUM = 0x3a2c4c, LIME = 0xb6f05a, GHOST = 0xf6f4ee, SKIN = 0xe4ecf0, HAIR = 0x2a2430, WISP = 0x9ae8f0, WOOD = 0x8a6444;
const outer = (L) => ({ ...L, prep: (ctx) => { let x = 0, z = 0; for (const p of ctx.pts) { x += p[0]; z += p[2]; } return ctx.n[0] * x + ctx.n[2] * z > 0 ? L.prep(ctx) : null; } });
/** The attraction's stage disc: plum lacquer, a lime band round the edge, the name on the front. */
function stage(S, r = 21, h = 3.6, o = {}) {
  S.paint(fill(PLUM, { rough: 0.5 }), outer(vol(band(h * 0.4, h * 0.66), LIME)), proj('top', stroke(circle(0, 0, r - 1.8), 0.45), tint(PLUM, 0.2)), o.paint || null, under(0.2), ...stamp(MAKER, { c: 0xb8a8d0 }));
  S.lathe([[0, 0], [r - 0.6, 0], [r, 0.6], [r, h - 0.6], [r - 0.6, h], [0, h]], { segs: 30, sz: o.sz ?? 1 });
  return h;
}
/** A hitodama: a teardrop flame with a curling tail, pale and cold; on a clear rod down to y0 if given. */
function hitodama(S, c, s = 1, o = {}) {
  S.paint(fill(o.col ?? WISP, { rough: 0.3 }), vol(blob([c[0] - 0.8 * s, c[1] + 0.4 * s, c[2] + 1.6 * s], [1.6 * s, 1.6 * s, 1.4 * s]), tint(o.col ?? WISP, 0.5)), o.eyes ? face({ at: [c[0], c[1]], gap: 2 * s, r: 0.45 * s, eye: o.eyes, mouth: null, near: c[2] }) : null);
  S.ball(c, [2.6 * s, 2.4 * s, 2.4 * s], { segs: 12, rings: 7 });
  S.tube(spline([[c[0], c[1] + 1.2 * s, c[2] - 0.6 * s], [c[0] + 1.6 * s, c[1] + 3.6 * s, c[2] - 1.4 * s], [c[0] + 0.4 * s, c[1] + 6 * s, c[2] - 1.8 * s], [c[0] - 1.6 * s, c[1] + 6.8 * s, c[2] - 1.4 * s]], 3), (t) => 1.9 * s * (1 - t) + 0.05, { sides: 8 });
  if (o.rod !== undefined) { S.clear(true); S.paint(fill(0xe8f0f4, { rough: 0.1 })); S.tube([[c[0], o.rod, c[2]], [c[0], c[1] - 2 * s, c[2]]], 0.45, { sides: 6 }); S.clear(false); }
}
/** The yūrei's white triangle headband, on the forehead of a head of radius r at c (facing +z). */
function sankaku(S, c, r) {
  S.paint(fill(GHOST, { rough: 0.7 }), under(0.15));
  S.at([c[0], c[1] + r * 0.58, c[2] + r * 0.86], [-0.55, 0, 0], () => S.extrude([[-r * 0.34, 0], [r * 0.34, 0], [0, r * 0.56]], -0.4, 0.3, { bevel: 0.15 }));
}
/** Hair as a hood over a head of radius r at c: open over the face (open: how much of the ball is left, 0..1), tipped
 *  down by tilt so the rim makes the fringe; long: hair down the back to that length (mm). */
function hairHood(S, c, r, o = {}) {
  S.paint(fill(HAIR, { rough: 0.4 }), crown(0.12), proj('back', or(seg(-1.6, c[1] + r, -2, c[1] - (o.long || 0), 0.3), seg(1.8, c[1] + r, 2.2, c[1] - (o.long || 0), 0.3)), tint(HAIR, 0.15)));
  S.at([c[0], c[1] + r * 0.06, c[2] - r * 0.08], [Math.PI / 2 + (o.tilt ?? 0.45), 0, 0], () => S.ball([0, 0, 0], [r * 1.1, r * 1.1, r * 1.1], { segs: 20, rings: 10, v1: o.open ?? 0.7, cap: false }));
  if (o.long) {
    S.tube(spline([[c[0], c[1] + r * 0.2, c[2] - r * 0.7], [c[0], c[1] - r * 0.6, c[2] - r * 0.95], [c[0], c[1] - o.long, c[2] - r * 0.8]], 3), [r * 0.9, r * 0.95, r * 0.8], { sides: 12, flat: [1.1, 0.5] });
    for (const s2 of [-1, 1]) S.tube(spline([[c[0] + s2 * r * 0.85, c[1], c[2] - r * 0.1], [c[0] + s2 * r * 0.95, c[1] - r * 0.9, c[2] + r * 0.2], [c[0] + s2 * r * 0.9, c[1] - o.long * 0.8, c[2] + r * 0.5]], 3), [r * 0.32, r * 0.3, r * 0.12], { sides: 8, flat: [1, 0.6] });
  }
}

// ------------------------------------------------------------------ 1. Pop-Up Kasa-obake
export function bikkuri(S) {
  const h = stage(S, 20);
  const PAPER = 0x8a4fc0;
  // the crate: planks, a painted "!", dark inside, a crank on the side
  const planks = or(seg(-20, h + 5, 20, h + 5, 0.3), seg(-20, h + 10, 20, h + 10, 0.3));
  S.paint(fill(WOOD, { rough: 0.8 }), proj('front', planks, tone(WOOD, 0.25)), proj('right', planks, tone(WOOD, 0.25)), proj('left', planks, tone(WOOD, 0.25)), proj('back', planks, tone(WOOD, 0.25)),
    proj('front', or(rbox(0, h + 8.6, 1.4, 3, 0.6), circle(0, h + 3.6, 1.3)), 0xd8302a), proj('top', all, 0x2a2230), under(0.2));
  for (const [a, b, c, d] of [[-10, -10, 10, -8.6], [-10, 8.6, 10, 10], [-10, -8.6, -8.6, 8.6], [8.6, -8.6, 10, 8.6]]) S.box(a, h, b, c, h + 15, d, { bevel: 0.4 });
  S.paint(fill(0x2a2230, { rough: 0.8 }));
  S.box(-8.6, h, -8.6, 8.6, h + 2, 8.6);
  S.paint(fill(tone(WOOD, 0.2), { rough: 0.7 }));
  for (const [x, z] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) S.box(x - 1, h, z - 1, x + 1, h + 15.4, z + 1, { bevel: 0.3 });
  S.paint(fill(0xc8a04a, { rough: 0.3 }), crown(0.2));
  S.at([10, h + 7, 0], [0, 0, -Math.PI / 2], () => { S.cyl([0, 0, 0], 1.4, 2, { segs: 10 }); S.box(-0.5, 1.6, -0.5, 0.5, 2.4, 5, { bevel: 0.2 }); });
  S.paint(fill(0xd8302a, { rough: 0.3 }));
  S.tube([[11.8, h + 7, 5], [14.6, h + 7, 5]], 0.8, { sides: 8 });
  // the lid, flung open behind
  S.paint(fill(WOOD, { rough: 0.8 }), proj('top', or(seg(-10, -3, 10, -3, 0.3), seg(-10, 3, 10, 3, 0.3)), tone(WOOD, 0.25)), proj('bottom', all, 0xb83a4a), under(0.0));
  S.at([0, h + 15, -10], [-2.2, 0, 0], () => S.box(-10.4, 0, 0, 10.4, 1.4, 20.6, { bevel: 0.4 }));
  // the spring and the umbrella ghost on it (push it back in)
  S.joint('pop', { slide: [0, -9, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    S.paint(fill(0xc8ced6, { rough: 0.2 }));
    const coil = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 12; coil.push([Math.cos(a) * 3.2, h + 4 + k / 64 * 19, Math.sin(a) * 3.2]); }
    S.tube(coil, 0.55, { sides: 5, caps: false });
    const y = h + 22, ribs = repeatU(rbox(0, 0, 0.25, 60), 4.4);
    S.paint(fill(PAPER, { rough: 0.6 }), outer(wrap(6, ribs, tone(PAPER, 0.28))), outer(vol(band(y + 3.6, y + 5), 0xd8302a)), outer(vol(band(y + 19, y + 20.6), tint(PAPER, 0.3))),
      proj('front', ellipse(0, y + 11, 4, 4.6), 0xf8f6ee, { near: 2 }), proj('front', circle(0.4, y + 10.6, 2.1), EYE, { near: 2 }), proj('front', circle(-0.4, y + 11.8, 0.7), 0xffffff, { near: 2 }),
      proj('front', ellipse(0, y + 5.8, 3.2, 1.2), 0x4a1e3a, { near: 2 }), proj('front', or(seg(-3.6, y + 15.6, -1.2, y + 16.6, 0.5), seg(3.6, y + 15.6, 1.2, y + 16.6, 0.5)), EYE, { near: 2 }), proj('back', or(rbox(2, y + 9, 2, 2.4, 0.4, 0.3)), tone(PAPER, 0.18)), under(0.2));
    S.lathe(spline([[1.6, y - 1], [6.4, y + 1.6], [7.4, y + 5], [6, y + 12], [3, y + 19], [0.8, y + 23], [0, y + 24]], 3), { segs: 20 });
    S.paint(fill(0xf08aa0, { rough: 0.3 }), proj('top', seg(0, -1, 0, -9, 0.3), 0xd85a78));
    S.tube(spline([[0, y + 5.8, 5.2], [0.4, y + 5, 8.6], [-0.6, y + 2.4, 10.6], [0.6, y - 1, 11]], 3), (t) => 1.6 - 0.5 * t, { sides: 6, flat: [1.4, 0.5] });
    S.paint(fill(tone(PAPER, 0.15), { rough: 0.6 }));
    for (const s of [-1, 1]) {
      S.tube(spline([[s * 5.6, y + 7, 0], [s * 10, y + 10, 1], [s * 12, y + 15.4, 1.6]], 2), 0.45, { sides: 5 });
      S.paint(fill(PAPER, { rough: 0.6 })); S.ball([s * 12.2, y + 16, 1.6], 1.4, { segs: 8, rings: 5 });
    }
  });
}

// ------------------------------------------------------------------ 2. Kuroko & Konnyaku
export function konnyaku(S) {
  const h = stage(S, 20);
  const KURO = 0x24202a, BAMBOO = 0xb8b060;
  // the kuroko: a black robe, tabi, an obi, the hood with its mesh veil
  S.paint(fill(KURO, { rough: 0.8 }), proj('front', or(seg(-2, h + 2, -1.4, h + 15, 0.3), seg(3, h + 2, 2.4, h + 14, 0.3)), tint(KURO, 0.12)), vol(band(h + 15, h + 17), 0x3a3448), under(0.2));
  S.lathe(spline([[9, h], [8.6, h + 2], [7, h + 9], [6.4, h + 16], [6.6, h + 20], [5, h + 24], [2, h + 25.4], [0, h + 25.6]], 2), { segs: 18, sz: 0.85 });
  S.paint(fill(0xf2ece0, { rough: 0.7 }), under(0.2));
  for (const s of [-1, 1]) S.ball([s * 3.4, h + 1, 5.4], [2, 1.2, 3], { segs: 10, rings: 5 });
  S.paint(fill(KURO, { rough: 0.8 }), crown(0.08));
  head(S, [0, h + 31, 0], [6.6, 6.4, 6.2], { muzzle: 0.1, brow: 0.2, cheek: 0.1, chin: 0.1 });
  S.paint(fill(0x3a3640, { rough: 0.8 }), proj('front', or(repeatU(rbox(0, 0, 0.12, 20), 0.9), repeatV(rbox(0, 0, 20, 0.12), 0.9)), 0x5a5664), proj('front', or(circle(-2.4, h + 30.6, 0.9), circle(2.4, h + 30.6, 0.9)), 0xf2ece0, { alpha: 0.5 }));
  S.at([0, h + 23, 6.2], [0.12, 0, 0], () => S.box(-5.6, 0, -0.3, 5.6, 11.4, 0.3));
  // arms up holding the rod, the line, the konnyaku (it swings)
  S.paint(fill(KURO, { rough: 0.8 }), under(0.2));
  for (const s of [-1, 1]) S.tube(spline([[s * 5.6, h + 21, 0], [s * 8, h + 25, 4], [s * 3, h + 29, 9]], 2), [2.2, 1.6, 1.4], { sides: 7 });
  S.paint(fill(BAMBOO, { rough: 0.45 }), vol(blobs(...[0.25, 0.5, 0.75].map((t) => blob([lerp3(-6, 22, t), lerp3(h + 26, h + 40, t), lerp3(10, 10, t)], 0.7))), tone(BAMBOO, 0.3)));
  S.tube([[-6, h + 26, 10], [22, h + 40, 10]], [0.9, 0.5], { sides: 7 });
  S.joint('konnyaku', { pivot: [22, h + 40, 10], axis: 'x', min: -0.6, max: 0.6, rest: 0, g: [0, 0.5], idle: 0.2 }, () => {
    S.paint(fill(0xe8eef2, { rough: 0.2 }));
    S.tube([[22, h + 40, 10], [22, h + 18, 10]], 0.18, { sides: 4, caps: false });
    const dots = or(...Array.from({ length: 14 }, (_, k) => { const a = k * GA, d = Math.sqrt(k + 0.5) * 1.3; return circle(Math.cos(a) * d, h + 13 + Math.sin(a) * d * 1.3, 0.3); }));
    S.paint(fill(0x8a8890, { rough: 0.15 }), proj('front', dots, 0x4a4650), proj('back', dots, 0x4a4650), under(0.1));
    S.at([22, h + 13, 10], [0, 0.3, 0], () => S.box(-4.6, -5.6, -1.6, 4.6, 5.6, 1.6, { bevel: 1.4 }));
  });
  // a nervous sweat drop
  S.clear(true);
  S.paint(fill(0x8ad0f0, { rough: 0.05 }));
  S.at([-7.4, h + 35, 3], [0, 0, 0.4], () => S.lathe(spline([[0, 0], [1.4, 0.8], [1, 2.4], [0, 3.6]], 2), { segs: 10 }));
  S.clear(false);
}
const lerp3 = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ 3. Chōchin-obake Signpost
export function chochin(S) {
  const h = stage(S, 20);
  const BAMBOO = 0xa8a050, PAPER = 0xf2e2b8, RIB = 0xc8a878;
  // a mossy stone, the bent bamboo post
  S.paint(fill(0x8a8a8a, { rough: 0.9 }), vol(above(h + 4.6), 0x6a9a4a), proj('front', or(arc(-3, h + 3, 2.4, 0.3, 2.4, 0.4), seg(3, h + 1, 5, h + 3.6, 0.35)), 0x6a6a6e), under(0.2));
  S.lathe(spline([[11, h - 0.4], [10.6, h + 2.6], [8, h + 5.6], [3, h + 7], [0, h + 7.2]], 2), { segs: 18, at: [-2, 0, 0], sz: 0.8 });
  const post = spline([[-4, h + 6, 0], [-4.4, h + 24, 0], [-2.6, h + 40, 0], [3, h + 50, 0], [12, h + 53, 0]], 3);
  S.paint(fill(BAMBOO, { rough: 0.5 }), vol(blobs(...[0.2, 0.45, 0.68, 0.88].map((t) => { const p = post[Math.round(t * (post.length - 1))]; return blob(p, 1.3); })), tone(BAMBOO, 0.3)), crown(0.1));
  S.tube(post, [1.5, 1.4, 1.2, 1], { sides: 8 });
  // the arrow: でぐち, this way (no, the other way)
  S.paint(fill(0xd8c098, { rough: 0.8 }), proj('front', kana('でぐち', -1, h + 30, 4.4), 0x3a2430), proj('front', or(seg(-12, h + 26.6, 7, h + 26.6, 0.5)), 0xd8302a), proj('back', kana('いりぐち', 1, h + 30, 3.6), 0x3a2430), under(0.2));
  S.at([0, 0, 1.6], [0, 0, 0.08], () => S.extrude([[-13, h + 25], [7, h + 25], [11, h + 29.4], [7, h + 33.6], [-13, h + 33.6]], -0.8, 0.8, { bevel: 0.3 }));
  // the lantern ghost on its hook (it sways)
  S.joint('lantern', { pivot: [12, h + 52, 0], axis: 'z', min: -0.4, max: 0.4, rest: 0, idle: 0.14 }, () => {
    const y = h + 30, rib = repeatV(rbox(0, 0, 30, 0.22), 2.2);
    S.paint(fill(PAPER, { rough: 0.75 }), outer(wrap(7, rib, RIB)), proj('front', ellipse(-2.8, y + 11, 3.4, 3.8), 0xf8f6ee, { near: 2 }), proj('front', circle(-2.2, y + 10.6, 1.8), EYE, { near: 2 }), proj('front', ellipse(4, y + 11.4, 1.6, 1.8), 0xf8f6ee, { near: 2 }), proj('front', circle(4.3, y + 11.2, 0.8), EYE, { near: 2 }),
      proj('front', poly([[-6, y + 6], [-3, y + 4.4], [0, y + 5.4], [3, y + 4.2], [6, y + 6.2], [4, y + 1.6], [0, y + 0.6], [-4, y + 1.6]]), 0x6a1e2a, { near: 2 }), proj('front', or(poly([[-4, y + 5], [-3, y + 3.6], [-2, y + 5]]), poly([[2, y + 4.8], [3, y + 3.4], [4, y + 4.8]])), 0xf8f6ee, { near: 2 }),
      proj('back', or(seg(-3, y + 6, 2, y + 12, 0.3), seg(2, y + 12, 0, y + 14, 0.3)), tone(PAPER, 0.3)), under(0.15));
    S.lathe(spline([[3.4, y - 1], [6.4, y + 1.4], [7.4, y + 8], [6.6, y + 14.6], [3.4, y + 17]], 3), { segs: 20, at: [12, 0, 0] });
    S.paint(fill(0x2a2430, { rough: 0.4 }));
    S.cyl([12, y - 2.4, 0], 3.6, 1.6, { segs: 14 }); S.cyl([12, y + 16.6, 0], 3.6, 1.4, { segs: 14 });
    S.tube([[12, y + 18, 0], [12, h + 52, 0]], 0.3, { sides: 4 });
    S.paint(fill(0xf08aa0, { rough: 0.3 }), proj('top', seg(0, -1, 0, -7, 0.3), 0xd85a78));
    S.tube(spline([[12.6, y + 3, 6.4], [12.6, y + 1, 9], [13.4, y - 3, 9.4], [12.4, y - 5.4, 8.6]], 3), (t) => 1.6 - 0.6 * t, { sides: 6, flat: [1.4, 0.5] });
  });
}

// ------------------------------------------------------------------ 4. Rokurokubi-san
export function rokurokubi(S) {
  const h = stage(S, 20);
  const KIMONO = 0xb8a8e0, OBI = 0xd8402e, ZAB = 0x6a3a8a, SKIN = 0xf6e4d6;
  const dots = or(...Array.from({ length: 18 }, (_, k) => { const a = k * GA; return circle(Math.cos(a) * (3 + k * 0.5), h + 9 + Math.sin(a) * 6, 0.6); }));
  // the cushion, the kneeling body, the obi
  S.paint(fill(ZAB, { rough: 0.85 }), vol(band(h + 1.6, h + 2), tone(ZAB, 0.25)), under(0.2));
  S.loft([[0, 0.9], [0.15, 1], [0.8, 1], [1, 0.8]].map(([t, k]) => ring([0, h + t * 3.6, 0], 15 * k, 14 * k, 20, { pow: 3.4 })));
  S.paint(fill(KIMONO, { rough: 0.8 }), proj('front', dots, 0xf6f2ea), proj('right', dots, 0xf6f2ea), proj('left', dots, 0xf6f2ea), vol(band(h + 13.2, h + 17.4), OBI), vol(band(h + 14.6, h + 15.6), 0xf2c23a), under(0.2));
  S.loft(spline([[h + 3.4, 11, 10, 2], [h + 6, 11.4, 11, 2.4], [h + 9, 10, 9, 1.2], [h + 13, 8, 6.6, 0], [h + 18, 7.6, 6, 0], [h + 22, 6.6, 5, -0.4], [h + 24, 3, 2.6, -0.4], [h + 24.4, 0.4, 0.4, -0.4]], 2).map(([y, rx, rz, dz]) => ring([0, y, dz], rx, rz, 18, { pow: 2.4 })));
  S.paint(fill(0xf6f2ea, { rough: 0.7 }));
  S.at([0, h + 22, 2.6], [-0.3, 0, 0], () => S.extrude([[-3, 0], [3, 0], [0, -5]], -0.3, 0.3));
  // the sleeves, the hands and a yunomi on the lap
  S.paint(fill(KIMONO, { rough: 0.8 }), proj('front', dots, 0xf6f2ea), under(0.2));
  for (const s of [-1, 1]) S.tube(spline([[s * 6, h + 21, 0], [s * 8, h + 16, 3], [s * 3, h + 13, 8]], 2), [2.6, 3.2, 2.4], { sides: 9 });
  S.paint(fill(SKIN, { rough: 0.6 }));
  for (const s of [-1, 1]) S.ball([s * 2.4, h + 13, 9.4], [1.6, 1.3, 1.5], { segs: 8, rings: 5 });
  S.paint(fill(0x6a8a6a, { rough: 0.3 }));
  S.lathe([[0, 0], [1.8, 0], [2.2, 3.4], [1.8, 3.4], [1.6, 0.6], [0, 0.6]], { segs: 12, at: [0, h + 12.4, 10] });
  // the neck: up, a full loop (with a ribbon tied on it), then up to the head
  const neck = spline([[0, h + 24, -0.4], [0, h + 30, -1], [4, h + 36, -1.4], [8, h + 41, 0], [5, h + 46, 3], [-1, h + 44, 2], [-2, h + 39, 0], [2, h + 37, -2], [5, h + 44, -3], [3, h + 52, -1.6], [0, h + 58, 0]], 3);
  S.paint(fill(SKIN, { rough: 0.6 }), under(0.12));
  S.tube(neck, 1.5, { sides: 8 });
  S.paint(fill(0xd8302a, { rough: 0.4 }));
  for (const s of [-1, 1]) S.at([6.6, h + 44, 2], [0, 0, s * 1.2 + 0.4], () => S.at([0, 0, 0], [0, 0, 0], () => blade(S, 3.4, 2.6, 0.6, { shape: 'round', cup: 0.6 })));
  S.ball([6.6, h + 44, 2], [1, 0.9, 0.9], { segs: 8, rings: 4 });
  // the head (it leans over the partition)
  S.joint('head', { pivot: [0, h + 58, 0], axis: 'x', min: -0.3, max: 0.6, rest: 0, g: [0, 0.5], idle: 0.08 }, () => {
    const c = [0, h + 63, 0.6];
    S.paint(fill(SKIN, { rough: 0.6 }), ...face({ at: [0, c[1] - 0.4], gap: 4.4, r: 0.85, eye: 'closed', mouth: 'smile', mw: 1.8, my: 2.4, blush: 0xf2a4b4 }), under(0.12));
    head(S, c, [5.6, 5.6, 5.2], { muzzle: 0.1, brow: 0.1, cheek: 0.2, chin: 0.3 });
    hairHood(S, c, 5.6, { open: 0.66, tilt: 0.75 });
    S.paint(fill(HAIR, { rough: 0.4 }), crown(0.12));
    S.ball([0, c[1] + 6.4, -3.4], [3, 2.6, 2.6], { segs: 12, rings: 7 });
    S.paint(fill(0xe2b64a, { rough: 0.25 }));
    S.tube([[-4.4, c[1] + 8, -3], [4, c[1] + 5.4, -3.6]], 0.35, { sides: 5 });
    S.paint(fill(0xf28aa8, { rough: 0.5 }));
    S.ball([4.4, c[1] + 5.2, -3.6], [1.4, 1.4, 0.8], { segs: 8, rings: 5 });
  });
}

// ------------------------------------------------------------------ 5. Haunted Fridge
export function reizoko(S) {
  const h = stage(S, 22);
  const MINT = 0x9ad4c0, IN = 0xeaf2f2, CH = 0xd8dce2;
  const W = 12, D = 9, y0 = h + 3, y1 = y0 + 40, yf = y0 + 27;
  // the body: rounded, on stubby legs; the inside a cold white; the freezer door with a face
  S.paint(fill(EYE, { rough: 0.5 }));
  for (const [x, z] of [[-9, -6], [9, -6], [-9, 6], [9, 6]]) S.cyl([x, h, z], [1.2, 1.6], 3.2, { segs: 8 });
  S.paint(fill(MINT, { rough: 0.4 }), proj('front', all, IN), proj('back', label('SUZUKAZE', 0, y0 + 30, 0.4), tone(MINT, 0.3), { hard: true }), under(0.2), crown(0.12));
  S.box(-W, y0, -D, W, y0 + 1.6, D, { bevel: 0.6 }); S.box(-W, yf - 1, -D, W, y1, D, { bevel: 2.4 });
  S.box(-W, y0, -D, -W + 1.4, yf, D, { bevel: 0.5 }); S.box(W - 1.4, y0, -D, W, yf, D, { bevel: 0.5 }); S.box(-W, y0, -D, W, yf, -D + 1.2);
  S.paint(fill(IN, { rough: 0.4 }), under(0.2));
  S.box(-W + 1.4, y0 + 12, -D + 1.2, W - 1.4, y0 + 12.6, D - 1.6);
  for (const [x, c, hh] of [[-6, 0xf6f4ee, 7], [-2, 0x6ac8e8, 6], [6, 0xe8b04a, 5]]) { S.paint(fill(c, { rough: 0.25 }), vol(above(y0 + 12.6 + hh * 0.75), 0xd8302a)); S.lathe(spline([[1.6, 0], [1.7, hh * 0.5], [1, hh * 0.8], [1, hh]], 2).map(([r, y]) => [r, y + y0 + 12.6]), { segs: 12, at: [x, 0, -3] }); }
  const eye = (x, y, r) => { S.paint(fill(0xf8f6ee, { rough: 0.3 }), proj('front', circle(x + r * 0.2, y - r * 0.15, r * 0.45), EYE, { near: D })); S.ball([x, y, D + 0.6], [r, r, r * 0.7], { segs: 14, rings: 8 }); };
  S.paint(fill(MINT, { rough: 0.4 }), proj('front', or(rbox(0, y1 - 1.6, 9, 0.3)), tone(MINT, 0.2)), under(0.2));
  S.box(-W + 0.4, yf, D - 0.4, W - 0.4, y1 - 1, D + 0.8, { bevel: 0.8 });
  eye(-4.2, yf + 7.4, 3.2); eye(4.6, yf + 7, 2.6);
  S.paint(fill(EYE, { rough: 0.4 }));
  S.at([-4.2, yf + 11.6, D + 1.2], [0, 0, -0.35], () => S.box(-3, -0.5, -0.4, 3, 0.5, 0.4, { bevel: 0.3 })); S.at([4.6, yf + 10.8, D + 1.2], [0, 0, 0.4], () => S.box(-2.6, -0.5, -0.4, 2.6, 0.5, 0.4, { bevel: 0.3 }));
  S.paint(fill(CH, { rough: 0.15 }));
  S.tube([[W - 2.6, yf + 2, D + 1.2], [W - 2.6, yf + 2, D + 2.4], [W - 2.6, yf + 9, D + 2.4], [W - 2.6, yf + 9, D + 1.2]], 0.5, { sides: 6 });
  // ice-cube teeth round the open mouth, the tongue offering up your pudding
  S.clear(true);
  S.paint(fill(0xd8f0f8, { rough: 0.1 }));
  for (let k = 0; k < 6; k++) S.at([-9 + k * 3.6, yf - 2.2, D - 1], [0, 0.2 * (k % 2 ? 1 : -1), 0.15], () => S.box(-1.2, -1.2, -1.2, 1.2, 1.2, 1.2, { bevel: 0.4 }));
  S.clear(false);
  S.paint(fill(0xf08aa0, { rough: 0.3 }), proj('top', seg(0, -2, 0, -14, 0.4), 0xd85a78));
  S.tube(spline([[0, y0 + 4, -2], [0, y0 + 4, 4], [0, y0 + 3.2, 10], [0, y0 + 4.4, 14.6]], 3), [4, 4.4, 4], { sides: 8, flat: [1, 0.3] });
  S.paint(fill(0xf8f6ee, { rough: 0.25 }));
  S.lathe([[0, 0], [3, 0], [4, 0.8], [3.6, 1], [0, 0.6]], { segs: 14, at: [0, y0 + 5.2, 13] });
  S.paint(fill(0xf6d27a, { rough: 0.3 }), vol(above(y0 + 9.4), 0x8a4a1e, { rough: 0.15 }));
  S.lathe([[2.6, 0], [2.4, 2.4], [1.8, 4.2], [0, 4.4]].map(([r, y]) => [r, y + y0 + 5.8]), { segs: 14, at: [0, 0, 13] });
  // the door, hanging open on the right (shut it)
  S.joint('door', { pivot: [W, y0, D], axis: 'y', min: -2.2, max: 0, rest: -1.9, g: [-1.9, -0.5] }, () => {
    S.paint(fill(MINT, { rough: 0.4 }), proj('back', all, IN), proj('front', label('SUZUKAZE', 0, y0 + 22, 0.4), tone(MINT, 0.3), { hard: true }), under(0.2));
    S.box(-W + 0.4, y0 + 0.4, D, W, yf - 0.6, D + 1.4, { bevel: 0.8 });
    S.paint(fill(CH, { rough: 0.15 }));
    S.tube([[-W + 2.6, y0 + 14, D + 1.4], [-W + 2.6, y0 + 14, D + 2.6], [-W + 2.6, y0 + 22, D + 2.6], [-W + 2.6, y0 + 22, D + 1.4]], 0.5, { sides: 6 });
    S.paint(fill(IN, { rough: 0.4 }));
    S.box(-W + 2, y0 + 8, D - 3.4, W - 2, y0 + 8.6, D);
    for (const [k, c] of [0xf6f4ee, 0x8ac048, 0xd8402e].entries()) { S.paint(fill(c, { rough: 0.25 })); S.cyl([-6 + k * 5, y0 + 8.6, D - 1.6], 1.3, 4.4 + k * 0.4, { segs: 10 }); }
  });
}

// ------------------------------------------------------------------ 6. Okiku's Well
export function okiku(S) {
  const NIGHT = 0x2c3444, STONE = 0x9a9a98;
  S.paint(fill(NIGHT, { rough: 0.9 }), proj('top', or(...[[-14, 12], [16, 10], [12, -14], [-18, -6]].map(([x, z]) => ellipse(x, -z, 3, 1.6))), 0x3a4a3a), under(0.2), ...stamp(MAKER, { c: 0x8a92a8 }));
  S.lathe([[0, 0], [25.4, 0], [26, 0.6], [26, 2.4], [25.4, 3], [0, 3]], { segs: 30 });
  S.paint(fill(0x4a7a4a, { rough: 0.8 }));
  for (const [x, z] of [[-18, 13], [17, 12], [-21, -4], [14, -16], [20, 4]]) for (let k = 0; k < 3; k++) S.cone([x + (k - 1) * 1.1, 3, z], 0.6, 3 + k % 2, { segs: 5 });
  // the stone well: rows of dressed stones
  const row = (y, off) => repeatU(stroke(rbox(0, y, 2.6, 1.6, 0.6), 0.32), 6, -200, 200);
  S.paint(fill(STONE, { rough: 0.85 }), outer(wrap(13, or(row(6, 0), { d: (u, v) => row(10.4, 0).d(u + 3, v), b: null }, row(14.8, 0)), tone(STONE, 0.3))), outer(vol(below(5.6), 0x6a8a5a)), crown(0.1), under(0.2));
  S.lathe([[13, 3], [13, 17], [12.6, 17.4], [10.6, 17.4], [10.4, 17], [10.4, 6], [0, 6]], { segs: 28 });
  // the posts, the crossbar, a little roof, the pulley, the bucket on its rope
  S.paint(fill(WOOD, { rough: 0.8 }), under(0.2));
  for (const s of [-1, 1]) S.box(s * 15 - 1.2, 3, -1.2, s * 15 + 1.2, 42, 1.2, { bevel: 0.3 });
  S.box(-17, 38, -1, 17, 40, 1, { bevel: 0.3 });
  S.paint(fill(0x5a5048, { rough: 0.7 }), proj('top', repeatU(rbox(0, 0, 0.25, 20), 3), 0x3a3430), under(0.3));
  for (const s of [-1, 1]) S.at([0, 47, 0], [s * 0.6, 0, 0], () => S.box(-19, -0.8, 0, 19, 0.8, s * 10, { bevel: 0.3 }));
  S.paint(fill(0x6a6a70, { rough: 0.4 }));
  S.at([0, 36, 0], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 2.4, 0.7, { segs: 14, sides: 5 }));
  S.paint(fill(0xc8b08a, { rough: 0.9 }));
  S.tube([[2.4, 36, 0], [6, 24, 4]], 0.3, { sides: 4 });
  S.paint(fill(WOOD, { rough: 0.8 }), outer(vol(band(19.6, 20.6), 0x4a4a4e)), under(0.2));
  S.lathe([[0, 17.6], [2.6, 17.6], [3.2, 18.2], [3.6, 23], [3.1, 23], [2.8, 18.6], [0, 18.6]], { segs: 12, at: [6, 0, 4] });
  // Okiku, rising out of the well, counting plates (send her back down)
  S.joint('okiku', { slide: [0, -12, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    S.paint(fill(GHOST, { rough: 0.7 }), proj('front', or(seg(-1, 30, 2, 18, 0.6), seg(-4.4, 27, -2, 19, 0.4)), tone(GHOST, 0.15)), under(0.15));
    S.lathe(spline([[7, 14], [7, 20], [6, 25], [5.4, 28], [3, 30.4], [0, 30.6]], 2), { segs: 16, at: [0, 0, 1], sz: 0.8 });
    S.at([0, 29.4, 5.4], [-0.3, 0, 0], () => S.extrude([[-2.8, 0], [2.8, 0], [0, -4.4]], -0.2, 0.2));
    const c = [0, 35, 1.4];
    S.paint(fill(SKIN, { rough: 0.6 }), ...face({ at: [0, c[1] - 0.6], gap: 4.2, r: 0.85, eye: 'sad', mouth: 'wavy', mw: 2, my: 2.6, col: 0x3a3048 }), under(0.12));
    head(S, c, [5, 5.2, 4.8], { muzzle: 0.1, brow: 0.2, cheek: 0.1, chin: 0.3 });
    hairHood(S, c, 5.2, { long: 12, open: 0.72 });
    sankaku(S, c, 5.2);
    S.paint(fill(GHOST, { rough: 0.7 }), under(0.15));
    for (const s of [-1, 1]) S.tube(spline([[s * 5, 27.6, 1], [s * 5.6, 26, 5], [s * 3, 25.4, 9.6]], 2), [2.2, 2.4, 2], { sides: 8 });
    S.paint(fill(SKIN, { rough: 0.6 }));
    for (const s of [-1, 1]) S.at([s * 2.4, 24.6, 11], [0.5, 0, 0], () => S.box(-1.3, -2.6, -0.5, 1.3, 0, 0.5, { bevel: 0.4 }));
    S.paint(fill(0xf4f2ec, { rough: 0.25 }), proj('top', stroke(circle(0, -12, 2.6), 0.4), 0x2f5aa8), proj('top', circle(0, -12, 1), 0x2f5aa8));
    S.at([0, 22, 12], [0.2, 0, 0], () => S.lathe([[0, 0], [2.4, 0], [3.8, 0.8], [3.4, 1], [0, 0.4]], { segs: 14 }));
  });
  // the plates she has counted, on the rim: eight, nine...
  S.paint(fill(0xf4f2ec, { rough: 0.25 }), outer(vol(band(0, 100), 0xf4f2ec)), proj('top', or(stroke(circle(10, 9, 2.6), 0.35), circle(10, 9, 1)), 0x2f5aa8));
  for (let k = 0; k < 8; k++) S.at([10, 17.4 + k * 0.8, -9], [0, k * 0.4, 0.02 * (k % 3 - 1)], () => S.lathe([[0, 0], [2.4, 0], [3.8, 0.6], [3.5, 0.8], [0, 0.4]], { segs: 14 }));
  hitodama(S, [-18, 30, 6], 0.9, { rod: 3, eyes: 'dot' });
  hitodama(S, [19, 26, -8], 0.7, { rod: 3 });
}

// ------------------------------------------------------------------ 7. Haunted House Entrance
export function yashiki(S) {
  const DIRT = 0x6a5a4a, BOARD = 0x5a4436, TILE = 0x4a4a54, SHOJI = 0xf6e6b0;
  S.paint(fill(DIRT, { rough: 0.9 }), proj('top', or(...[[-4, -26], [2, -20], [-3, -14]].map(([x, z]) => ellipse(x, z, 3.4, 2.2))), 0x9a948a), under(0.2), ...stamp(MAKER, { c: 0xa89a88 }));
  S.box(-40, 0, -24, 40, 3, 30, { bevel: 0.8 });
  S.paint(fill(0x9a948a, { rough: 0.9 }), crown(0.1));
  for (const [x, z] of [[-4, 26], [2, 20], [-3, 14]]) S.at([x, 3, z], null, () => S.ball([0, 0, 0], [3.4, 1, 2.2], { segs: 12, rings: 4, v0: 0.5 }));
  // the footing, the weathered board walls (a doorway in the middle), the dark inside
  S.paint(fill(0x8a8680, { rough: 0.9 }), under(0.2));
  S.box(-30, 3, -20, 30, 6, 6, { bevel: 0.5 });
  const boards = repeatU(rbox(0, 0, 0.3, 60), 3.4);
  S.paint(fill(BOARD, { rough: 0.85 }), proj('front', boards, tone(BOARD, 0.3)), proj('right', boards, tone(BOARD, 0.3)), proj('left', boards, tone(BOARD, 0.3)), proj('front', or(seg(-24, 20, -18, 14, 0.5), seg(20, 30, 26, 24, 0.4)), tint(BOARD, 0.2)), under(0.2));
  S.box(-29, 6, 3, -8, 40, 5); S.box(8, 6, 3, 29, 40, 5); S.box(-8, 28, 3, 8, 40, 5);
  S.box(-29, 6, -19, -27, 40, 3); S.box(27, 6, -19, 29, 40, 3); S.box(-29, 6, -19, 29, 40, -17);
  for (const x of [-29, 27]) S.at([x + 1, 0, 0], [0, Math.PI / 2, 0], () => S.extrude([[19, 40], [-5, 40], [7, 46]], -1, 1));
  S.paint(fill(0x1a1620, { rough: 0.9 }));
  S.box(-8, 6, -4, 8, 28, -3);
  // shoji windows: lit, torn; an eye at one hole, a shadow in the other
  for (const [x, k] of [[-18, 0], [18, 1]]) {
    const lat = or(rbox(0, 0, 0.4, 20), rbox(-3.4, 0, 0.35, 20), rbox(3.4, 0, 0.35, 20), rbox(0, 3.2, 20, 0.35), rbox(0, -3.2, 20, 0.35));
    S.paint(fill(SHOJI, { rough: 0.8 }), proj('front', { d: (u, v) => lat.d(u - x, v - 22), b: null }, 0x6a5040), k ? proj('front', or(circle(x + 2, 24, 1.8), ellipse(x - 2.6, 21.2, 1.6, 1)), 0x1a1620) : proj('front', or(ellipse(x - 3, 19.4, 2.4, 3.2), circle(x - 3, 24, 2)), 0x8a6a48, { alpha: 0.75 }),
      k ? proj('front', or(ellipse(x + 2, 24, 1.2, 0.9)), 0xf6f2ea) : null, k ? proj('front', circle(x + 2.2, 24, 0.5), 0xd8302a) : null);
    S.box(x - 7, 15, 5, x + 7, 29, 5.6);
  }
  // the crooked roof: heavy tiles, a sag to one side, a hole
  const rows = repeatU(rbox(0, 0, 0.5, 40), 3);
  S.paint(fill(TILE, { rough: 0.55 }), proj('top', rows, tone(TILE, 0.35)), proj('top', and(rows, rbox(0, 0, 1, 1)), tint(TILE, 0.2)), proj('top', ellipse(14, -6, 4, 2.4, 0.3), 0x1a1620), under(0.3), crown(0.06));
  S.at([0, 46.4, -7], [0, 0, 0.04], () => { S.at([0, 0, 0], [0.5, 0, 0], () => S.box(-35, -1, 0, 35, 1.4, 20, { bevel: 0.4 })); S.at([0, 0, 0], [-0.55, 0, 0], () => S.box(-35, -1, -17, 35, 1.4, 0, { bevel: 0.4 })); });
  S.paint(fill(tone(TILE, 0.15), { rough: 0.5 }));
  S.tube([[-35, 47.6, -7], [0, 48, -7], [35, 49.6, -7]], 1.6, { sides: 8 });
  S.paint(fill(TILE, { rough: 0.55 }));
  for (const [x, z, a] of [[12, 3, 0.6], [16, 4, -0.4]]) S.at([x, 4, z + 24], [0.2, a, 0.4], () => S.box(-1.4, -0.4, -1, 1.4, 0.4, 1, { bevel: 0.2 }));
  // the signboard with its dripping letters, the torn noren
  S.paint(fill(0x3a2a20, { rough: 0.7 }), proj('front', rbox(0, 32.2, 13.4, 3.2, 0.4), 0xe8d8b0), proj('front', kana('おばけ屋敷', 0, 32.6, 4.4), 0xc8202a), proj('front', or(seg(-7, 31, -7, 28.6, 0.5), seg(2.4, 31, 2.4, 27.2, 0.45), seg(8, 31, 8, 29.4, 0.4), circle(2.4, 27.2, 0.6)), 0xc8202a), under(0.2));
  S.box(-14.4, 28.4, 5.4, 14.4, 36.4, 6.6, { bevel: 0.4 });
  for (let k = 0; k < 3; k++) {
    const x = -5.4 + k * 5.4;
    S.paint(fill(0x2a2a3a, { rough: 0.9 }), proj('front', kana(['う', 'ら', 'め'][k], x, 24.6, 3.2), 0xf6f2ea));
    S.extrude([[x - 2.5, 28], [x + 2.5, 28], [x + 2.5, 19 + k], [x + 1.2, 20.6 + k], [x, 18 + (k % 2) * 2], [x - 1.4, 20 - k], [x - 2.5, 18.6]], 5.6, 6.2);
  }
  // lanterns under the eaves
  for (const x of [-24, 24]) {
    S.paint(fill(0xd8402e, { rough: 0.6 }), outer(vol(band(23.6, 24.4), tint(0xd8402e, 0.2))));
    S.lathe(spline([[1.4, 21], [3, 22], [3.4, 24.4], [3, 26.6], [1.4, 27.6]], 2), { segs: 12, at: [x, 0, 12] });
    S.paint(fill(EYE)); S.cyl([x, 27.4, 12], 1.6, 0.8, { segs: 8 }); S.tube([[x, 28, 12], [x, 38.6, 12]], 0.25, { sides: 4 });
  }
  // the ticket booth and its sheet-ghost attendant (it pops up), a weeping willow
  S.paint(fill(0xb8302a, { rough: 0.6 }), proj('front', rbox(31, 15, 4.6, 3.4, 0.4), 0x1a1620), proj('front', kana('うけつけ', 31, 8.4, 2.6), 0xf6f2ea), under(0.2));
  S.box(25, 3, 12, 37, 20, 22, { bevel: 0.5 });
  S.paint(fill(0x3a2a20, { rough: 0.6 })); S.box(24, 20, 11, 38, 21.6, 23, { bevel: 0.4 });
  S.joint('ghost', { slide: [0, -5, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    S.paint(fill(GHOST, { rough: 0.7 }), ...face({ at: [31, 16.4], gap: 3.4, r: 0.8, eye: 'dot', mouth: 'o', mw: 1.8, my: 2.4 }), under(0.15));
    S.lathe(spline([[4, 10], [4.2, 13], [3.6, 16.4], [2, 18.6], [0, 19]], 2), { segs: 14, at: [31, 0, 18] });
  });
  S.paint(fill(0x4a3a2e, { rough: 0.85 }));
  S.tube(spline([[-34, 3, 18], [-35, 14, 18], [-33, 26, 17], [-31, 34, 18]], 2), [2.4, 1.8, 1.4, 1], { sides: 8 });
  S.paint(fill(0x6a9a52, { rough: 0.7 }), proj('front', seg(0, 0, 0, 40, 0.25), 0x4a7a3a));
  for (let k = 0; k < 16; k++) { const a = k * GA, d = 2 + (k % 4) * 1.6, x = -31 + Math.cos(a) * d, z = 18 + Math.sin(a) * d; S.tube(spline([[-31 + Math.cos(a) * 0.6, 34, 18 + Math.sin(a) * 0.6], [x, 36, z], [x + Math.cos(a) * 1.4, 28 - (k % 3) * 3, z + Math.sin(a) * 1.4], [x + Math.cos(a) * 1.8, 17 - (k % 5) * 2, z + Math.sin(a) * 1.8]], 2), 0.3, { sides: 4, flat: [2, 0.4] }); }
  hitodama(S, [-16, 52, 12], 0.8, { rod: 38 });
}

// ------------------------------------------------------------------ 8. Yūrei on Lunch Break (secret)
export function kyukei(S) {
  const FLOOR = 0x8a8c90, CHROME = 0xc8ced6, VINYL = 0x8a5a3a;
  S.paint(fill(FLOOR, { rough: 0.85 }), proj('front', and(repeatU(poly([[-2, 0.4], [0, 0.4], [-2, 2.6], [-4, 2.6]]), 4), rbox(0, 1.5, 100, 1.1)), EYE), proj('front', rbox(0, 1.5, 100, 1.1), 0xf2c23a), proj('top', or(seg(-30, 2, 30, 2.4, 0.25), seg(4, -20, 6, 20, 0.25)), tone(FLOOR, 0.15)), under(0.2), ...stamp(MAKER, { c: 0x5a5c60 }));
  S.box(-32, 0, -20, 32, 3, 20, { bevel: 0.5 });
  // the folding pipe chair
  S.paint(fill(CHROME, { rough: 0.2 }));
  for (const s of [-1, 1]) { S.tube([[s * 7, 3, -8], [s * 7, 15, 3]], 0.55, { sides: 6 }); S.tube([[s * 7, 3, 4], [s * 7, 16, -6], [s * 7, 33, -9]], 0.55, { sides: 6 }); }
  S.paint(fill(VINYL, { rough: 0.45 }), crown(0.12), under(0.2));
  S.box(-7.6, 14.6, -6, 7.6, 16.2, 5, { bevel: 0.8 });
  S.at([0, 28, -8.4], [-0.2, 0, 0], () => S.box(-7.4, -3.6, -0.6, 7.4, 3.6, 0.6, { bevel: 0.5 }));
  // the ghost, sitting: the tail over the front of the seat, a white kimono, the headband, an onigiri
  S.paint(fill(GHOST, { rough: 0.7 }), proj('front', or(seg(0, 30, 2.4, 18, 0.5)), tone(GHOST, 0.14)), under(0.15));
  S.lathe(spline([[6, 16], [6.4, 19], [5.6, 24], [5.2, 28], [3, 30.6], [0, 30.8]], 2), { segs: 16, at: [0, 0, -0.6], sz: 0.8 });
  S.tube(spline([[0, 17, 2], [0, 17.4, 6.6], [1, 12, 9], [3, 6, 9.4], [6, 4.2, 12], [9, 4.6, 13]], 3), (t) => 5 * (1 - t) ** 0.8 + 0.3, { sides: 10 });
  S.paint(fill(GHOST, { rough: 0.7 }));
  S.at([0, 29.4, 4.6], [-0.3, 0, 0], () => S.extrude([[-2.6, 0], [2.6, 0], [0, -4.4]], -0.2, 0.2));
  const c = [0, 35.4, 0.6];
  S.paint(fill(SKIN, { rough: 0.6 }), ...face({ at: [0, c[1] - 0.4], gap: 4.4, r: 0.9, eye: 'closed', mouth: null, blush: 0xf2a4b4 }), proj('front', or(ellipse(1.4, c[1] - 2.8, 1.1, 0.8)), 0x6a2a3a), proj('front', or(ellipse(-1.8, c[1] - 1.6, 0.4, 0.25), ellipse(3.6, c[1] - 2.6, 0.4, 0.25)), 0xf8f6ee), under(0.12));
  head(S, c, [5.2, 5.2, 4.8], { muzzle: 0.1, brow: 0.15, cheek: 0.32, chin: 0.25 });
  hairHood(S, c, 5.3, { long: 11, open: 0.72 });
  sankaku(S, c, 5.3);
  S.paint(fill(GHOST, { rough: 0.7 }), under(0.15));
  S.tube(spline([[-5, 28, 0], [-6.6, 24, 3], [-4, 21, 6.6]], 2), [2.2, 2.4, 2], { sides: 8 });
  S.joint('arm', { pivot: [5, 28, 0], axis: 'x', min: -0.4, max: 0.9, rest: 0, g: [0, 0.75] }, () => {
    S.paint(fill(GHOST, { rough: 0.7 }), under(0.15));
    S.tube(spline([[5, 28, 0], [7, 25, 4], [4.6, 27.6, 7.6]], 2), [2.2, 2.4, 2], { sides: 8 });
    S.paint(fill(0xf6f4ec, { rough: 0.6 }), vol(below(27.6), NORI_), proj('front', or(...[0, 1, 2, 3].map((k) => stroke(ellipse(3.4 + (k % 2) * 1.6, 30 + (k >> 1) * 1.4, 0.6, 0.35), 0.15))), 0xd8d4c8));
    S.at([3.6, 26.4, 8.6], [-0.3, 0, 0], () => S.extrude([[-2.8, 0], [2.8, 0], [0.6, 5.6], [-0.6, 5.6]], -1.4, 1.4, { bevel: 0.8 }));
  });
  // the folding table: a keitai (lit), a can of hot tea, a hitodama having a nap
  S.paint(fill(0x6a7a6a, { rough: 0.5 }), crown(0.1), under(0.2));
  S.box(13, 15, -6, 29, 16.4, 8, { bevel: 0.4 });
  S.paint(fill(CHROME, { rough: 0.2 }));
  for (const s of [-1, 1]) S.tube([[21 + s * 7, 3, -5], [21 - s * 7, 15, 7]], 0.45, { sides: 5 });
  S.paint(fill(0xd8c070, { rough: 0.3 }), outer(wrap(2.2, kana('おちゃ', 0, 20.4, 3), 0x2a4a2a)), outer(vol(band(17.4, 18.2), 0x3a8a4a)), crown(0.2));
  S.cyl([16.6, 16.4, 3], 2.2, 7.4, { segs: 14 });
  S.paint(fill(0x5a6a8a, { rough: 0.3 }), proj('top', rbox(0, 0.6, 1.4, 1.6, 0.3), 0xb8f0d8), proj('top', or(...[0, 1, 2].map((k) => rbox(-0.8 + k * 0.8, -2.6, 0.3, 0.3))), 0xd8dce2));
  S.at([22, 16.6, 1], [0, 0.5, 0], () => { S.box(-2, 0, -4.2, 2, 1, 4.2, { bevel: 0.4 }); S.tube([[1.4, 0.8, -4], [1.4, 0.8, -7]], 0.3, { sides: 4 }); });
  hitodama(S, [26, 19.6, 3], 0.65, { eyes: 'sleepy' });
  // the sign: on break
  S.paint(fill(0xf4ead2, { rough: 0.8 }), proj('front', kana('休憩中', 0, 15, 3.6), 0x2a2430), proj('front', or(rbox(0, 9.4, 2.2, 1.6, 0.6), stroke(circle(2.6, 9.8, 1), 0.4)), 0x6a8a6a), proj('front', or(seg(-1, 12, -1.2, 13.4, 0.3), seg(1, 12, 1.2, 13.4, 0.3)), 0x9a9aa0), under(0.2));
  for (const s of [-1, 1]) S.at([-22, 3, 10 + s * 2.6], [s * 0.2, 0, 0], () => S.box(-6, 0, -0.5, 6, 17, 0.5, { bevel: 0.3 }));
}
const NORI_ = 0x25302a;
