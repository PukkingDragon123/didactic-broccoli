// Yurui Yōkai (ゆるい妖怪): cute, slightly spooky folklore spirits. Sculpt programs, in millimetres
// (src/figures/sculpt.js); the series data is src/data/series/yokai.js. The family look: every spirit stands on the same
// indigo night stage (a gold line, a crescent moon, little will-o'-wisps round the side), chibi heads, soft pastels.
import { spline, ring } from '../sculpt.js';
import { loaf, paw, blade, drape } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, cut, stroke, pair, repeatU, repeatV, label, kana, below, above, band, blob, blobs,
} from '../paint.js';
import { cat, form, dense } from './neko_cafe.js';

const MAKER = 'YOMICHI';
const lerp = (a, b, t) => a + (b - a) * t;
const INDIGO = 0x3e3866, GOLD = 0xd9b45a, MOON = 0xf6e8b8, SKIN = 0xf8d8c2, BLUSH = 0xf2a0a0;

// ------------------------------------------------------------------ the chibi kid (also used by other sets)
const KHEAD = [[-9.4, 0.05, 0.05, 0.6], [-8.8, 4.4, 4, 0.6], [-7, 7.6, 7, 0.5], [-4, 9.6, 8.8, 0.3], [-0.6, 10.2, 9.4, 0.1], [3, 9.9, 9.2, 0], [6, 8.4, 7.9, -0.1], [8.4, 5.4, 5.2, -0.2], [9.6, 0.05, 0.05, -0.2]];
const KHAIR = [[-7.2, 0.05, 0.05, -2], [-6.9, 8.6, 7.4, -1.8], [-4, 10.8, 9.4, -1.5], [-0.6, 11.2, 9.9, -1.4], [3, 10.8, 9.8, -1.2], [6, 9.3, 8.7, -1.1], [8.6, 6.1, 5.9, -1], [10.2, 0.05, 0.05, -0.9]];
const ROBE = [[3.6, 0.05, 0.05, 0], [3.8, 6.6, 5.8, 0], [5, 7.3, 6.3, 0], [8.6, 6.7, 5.7, 0.2], [13.4, 6.2, 5.2, 0.4], [18.2, 6.1, 5, 0.3], [21.2, 5.4, 4.4, 0.2], [23.2, 3.4, 3, 0], [24, 0.05, 0.05, 0]];
const KNEEL = [[0, 0.05, 0.05, 1], [0.2, 8.4, 9.6, 1], [2.4, 9, 10, 0.9], [5.4, 8, 8, 0.3], [9.4, 6.4, 5.6, 0.2], [14, 6, 5, 0.3], [17, 5.3, 4.4, 0.2], [19, 3.4, 3, 0], [19.8, 0.05, 0.05, 0]];
/**
 * A chibi kid at the origin of the frame, facing +z, about 44 mm tall (kneeling 38). o: skin, cloth, outfit (layers on the
 * robe / body), body (rows for form(): a raincoat, a pinafore), pose 'stand' | 'kneel', shoes 'geta' | 'boots' | 'zori' |
 * null, shoeCol, legCol, hair 'okappa' | 'short' | 'bald', hairCol, eye, mouth, eyes (count: 1 for a hitotsume), sleeve,
 * cuff, arms: [hand at +x, hand at -x] (null: at rest), headRot, headJoint, onHead(S), face (more layers), hm (layers on
 * the head).
 */
export function kid(S, o = {}) {
  const SK = o.skin ?? SKIN, CL = o.cloth ?? 0x3f6fb0, kneel = o.pose === 'kneel';
  const hy = o.hy ?? (kneel ? 28.4 : 33.2), sh = kneel ? 17 : 21;
  if (!kneel) {
    const shoe = o.shoes === undefined ? 'zori' : o.shoes;
    S.paint(fill(o.legCol ?? SK), under(0.15));
    for (const s of [1, -1]) S.tube([[s * 2.7, 2, 0.2], [s * 2.8, 5.6, 0], [s * 2.8, 7.4, 0]], [1.7, 1.9], { sides: 8 });
    for (const s of [1, -1]) {
      if (shoe === 'geta') {
        S.paint(fill(0xc89a64), proj('top', rbox(s * 2.8, -1.4, 1.6, 3.4, 0.6), tone(0xc89a64, 0.12)), under(0.2));
        S.box(s * 2.8 - 2, 1.4, -2.4, s * 2.8 + 2, 2.4, 5.2, { bevel: 0.35 });
        S.paint(fill(0x8a5e3a));
        for (const z of [-1.2, 3.6]) S.box(s * 2.8 - 1.8, 0, z - 0.5, s * 2.8 + 1.8, 1.4, z + 0.5, { bevel: 0.2 });
        S.paint(fill(o.shoeCol ?? 0xd8423a));
        S.tube(spline([[s * 2.8 - 1.6, 2.4, 0.4], [s * 2.8, 3.4, 2.8], [s * 2.8 + 1.6, 2.4, 0.4]], 2), 0.32, { sides: 5 });
      } else if (shoe === 'boots') {
        S.paint(fill(o.shoeCol ?? 0xd8423a, { rough: 0.35 }), vol(below(0.9), tone(o.shoeCol ?? 0xd8423a, 0.3)), crown(0.1));
        S.lathe(dense([[2.3, 0], [2.5, 0.9], [2.3, 4], [2.5, 6.6], [2.7, 7], [2.3, 7]], 1.4), { segs: 12, sz: 1.1, at: [s * 2.8, 0, 0.2], cap: true });
        paw(S, [s * 2.8, 0, 0.6], 4.4, 6, 2.6, { toes: 1 });
      } else if (shoe === 'zori' || shoe === 'shoes') {
        S.paint(fill(o.shoeCol ?? 0xe8dcc4), under(0.2));
        paw(S, [s * 2.8, 0, 0.4], 4.2, 6, 2.4, { toes: 1 });
      }
    }
  }
  S.paint(fill(CL), ...(o.outfit || []), under(0.12));
  form(S, [0, 0, 0], o.body || (kneel ? KNEEL : ROBE));
  const hands = o.arms || [null, null];
  for (const [i, s] of [[0, 1], [1, -1]]) {
    const h = hands[i] ?? (kneel ? [s * 4, 11.4, 6.6] : [s * 7.4, 13.4, 2.4]);
    if (h === false) continue;
    const a = [s * 4.6, sh, 0.2], m = [(a[0] + h[0]) / 2 + s * 1.2, (a[1] + h[1]) / 2 - 0.6, (a[2] + h[2]) / 2];
    S.paint(fill(o.sleeve ?? CL), ...(o.sleeveMarks || []), under(0.15));
    S.tube(spline([a, m, h], 2), o.sleeveR ?? [2.2, 2.6, 2.9], { sides: 8 });
    S.paint(fill(o.hand ?? SK), under(0.15));
    S.ball(h, [1.9, 1.8, 1.9], { segs: 10, rings: 6 });
  }
  const build = () => S.at([0, hy, 0.2], o.headRot || null, () => {
    const one = o.eyes === 1;
    S.paint(
      fill(SK), ...(o.hm || []),
      ...(one ? [] : face({ at: [0, -0.6], gap: 7.6, r: o.eyeR ?? 1.45, eye: o.eye || 'dot', mouth: o.mouth === undefined ? 'smile' : o.mouth, mw: 2.2, blush: o.blush === undefined ? BLUSH : o.blush })),
      ...(o.face || []), under(0.12), crown(0.04),
    );
    form(S, [0, 0, 0], KHEAD, { pow: 2.2 });
    S.paint(fill(SK), under(0.15));
    for (const s of [1, -1]) S.ball([s * 9.9, -1.4, 0], [1.3, 2, 1.6], { segs: 8, rings: 5 });
    const HC = o.hairCol ?? 0x2e2a34;
    if (o.hair === 'okappa' || o.hair === 'short') {
      S.paint(fill(HC, { rough: 0.45 }), proj('back', or(seg(-6, 6, -4, -5, 0.3), seg(-1, 7, 0, -6, 0.3), seg(4, 6.6, 5, -5.4, 0.3)), tint(HC, 0.14)), crown(0.12), under(0.15));
      form(S, [0, 0, 0], o.hair === 'short' ? KHAIR.map(([y, rx, rz, dz]) => [Math.max(y, -3.4), rx * (y < -3 ? 0.9 : 1), rz, dz - (y < -3 ? 0.6 : 0)]) : KHAIR, { pow: 2.2 });
      S.paint(fill(HC, { rough: 0.45 }), proj('front', or(seg(-5, 3.4, -4.6, 8, 0.3), seg(-1.4, 3.4, -1.2, 8.6, 0.3), seg(2.6, 3.4, 2.8, 8.4, 0.3)), tint(HC, 0.14)), crown(0.12));
      S.ball([0, 0.4, 0.3], [10.7, 10.2, 10.2], { segs: 16, rings: 9, v0: o.hair === 'short' ? 0.66 : 0.6 });
    }
    o.onHead?.(S);
  });
  if (o.headJoint === false) build();
  else S.joint(o.headJoint?.name || 'head', { pivot: [0, hy - 9, 0.2], axis: 'z', min: -0.3, max: 0.3, rest: 0, idle: 0.05, ...(o.headJoint || {}) }, build);
}

/** The family's stage: an indigo lacquer disc with a gold line, a moon and will-o'-wisps; its top is at y = 3. */
function stage(S, r = 18, o = {}) {
  const wisp = (u) => or(circle(u, 1.6, 0.7), poly([[u - 0.7, 1.7], [u + 0.7, 1.7], [u + 0.2, 3.2]]));
  S.paint(
    fill(INDIGO, { rough: 0.4 }), vol(band(0.6, 0.9), GOLD), wrap(r, or(...[-0.9, 0.2, 1.4, 2.5, 3.6, 4.8].map((a) => wisp(a * r))), tint(INDIGO, 0.45)),
    proj('top', cut(circle(-r + 7, r - 8, 3.4), circle(-r + 8.6, r - 7, 3)), MOON), proj('top', or(circle(r - 6, r - 6.4, 0.5), circle(r - 9.4, r - 4.4, 0.35), circle(-r + 12, r - 3.6, 0.35)), MOON),
    proj('top', stroke(circle(0, 0, r - 2.6), 0.4), GOLD), ...(o.print || []), under(0.2), ...stamp(MAKER, { c: 0xb0a8c8, px: 0.3 }),
  );
  S.lathe([...dense([[8, 0.5], [r - 1.4, 0.5]], 3), [r - 0.8, 0], [r, 0.8], [r, 2.3], [r - 0.7, 3], [r - 2.1, 3]], { segs: 24, cap: true, sx: o.sx ?? 1 });
}
const TOP = 3;

/** A solid teardrop flame (painted, no glow) standing on c, h tall. */
function flame(S, c, h, outer = 0x8fd8f2, core = 0xf4fbff, rot = 0) {
  S.paint(fill(outer, { rough: 0.5 }), vol(blob([c[0], c[1] + h * 0.28, c[2] + h * 0.1], [h * 0.22, h * 0.26, h * 0.22]), core));
  S.at(c, [0, 0, rot], () => S.lathe(spline([[0, 0], [h * 0.3, h * 0.12], [h * 0.34, h * 0.32], [h * 0.2, h * 0.6], [h * 0.06, h * 0.86], [0, h]], 2), { segs: 10 }));
}

// ------------------------------------------------------------------ 1. Chōchin-obake
export function chochin(S) {
  const PAPER = 0xf6ecd4, RIB = 0xd9c49c, RED = 0xd6463a, LAC = 0x2e2a32, BRASS = 0xd9a441;
  stage(S, 17);
  const R = (y) => 4.6 + 9.6 * Math.sin(Math.PI * (y - 4.6) / 31.6) ** 0.8; // the lantern's profile, y from 4.6 to 36.2
  S.joint('sway', { pivot: [0, TOP, 0], axis: 'z', min: -0.2, max: 0.2, rest: 0, g: [0, 0.12], idle: 0.05 }, () => {
    // lacquered foot and cap
    S.paint(fill(LAC, { rough: 0.35 }), vol(band(TOP + 1.6, TOP + 2.2), BRASS), under(0.2), crown(0.1));
    S.lathe([[5.4, TOP], [6, TOP + 0.6], [6, TOP + 2.8], [5.2, TOP + 3.2]], { segs: 18, cap: true });
    S.lathe([[5.2, TOP + 33.6], [6, TOP + 34], [6, TOP + 36.4], [5, TOP + 37], [2.4, TOP + 37.2]], { segs: 18, cap: true });
    S.paint(fill(BRASS, { rough: 0.25 }));
    S.at([0, TOP + 39.8, 0], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 2.4, 0.5, { segs: 14, sides: 6 }));
    // the paper body: one big eye, a torn grin, the family crest on the back
    const ys = []; for (let y = 4.6; y <= 36.2; y += 1.4) ys.push(y);
    S.paint(
      fill(PAPER, { rough: 0.8 }), vol(band(TOP + 9.2, TOP + 10.4), RED), shade(vol(band(TOP + 4.6, TOP + 7)), 0.08), shade(vol(band(TOP + 33.6, TOP + 36.2)), 0.08),
      proj('front', ellipse(0, TOP + 25.6, 5.6, 4.6), 0xfdfaf2), proj('front', stroke(ellipse(0, TOP + 25.6, 5.6, 4.6), 0.5), 0x5a4a3a), proj('front', circle(0.6, TOP + 25, 2.7), 0x3a2a30), proj('front', circle(0.6, TOP + 25, 1.3), 0x1e161c), proj('front', circle(-0.3, TOP + 26, 0.8), 0xffffff),
      proj('front', or(seg(-5.2, TOP + 31.2, -1.6, TOP + 30.4, 0.6), seg(5.6, TOP + 31.4, 2.2, TOP + 30.6, 0.6)), 0x5a4a3a),
      proj('front', poly([[-8.4, TOP + 17.8], [8.4, TOP + 17.8], [6, TOP + 14], [3.4, TOP + 12.2], [0, TOP + 11.6], [-3.4, TOP + 12.2], [-6, TOP + 14]]), 0xe8702a),
      proj('front', stroke(poly([[-8.4, TOP + 17.8], [8.4, TOP + 17.8], [6, TOP + 14], [3.4, TOP + 12.2], [0, TOP + 11.6], [-3.4, TOP + 12.2], [-6, TOP + 14]]), 0.5), 0x5a3a2a),
      proj('front', or(poly([[-4.4, TOP + 17.8], [-2, TOP + 17.8], [-3.2, TOP + 15.6]]), poly([[2.2, TOP + 17.8], [4.6, TOP + 17.8], [3.4, TOP + 15.4]])), PAPER),
      proj('front', pair(ellipse(9.4, TOP + 19.6, 2, 1.1)), BLUSH, { alpha: 0.8 }),
      proj('back', stroke(circle(0, TOP + 22, 4.6), 0.7), RED), proj('back', or(circle(0, TOP + 22, 1.4), ...[0, 1, 2].map((k) => circle(Math.cos(k * 2.09 + 1.57) * 2.6, TOP + 22 + Math.sin(k * 2.09 + 1.57) * 2.6, 1))), RED),
      proj('right', or(seg(2, TOP + 27, 4, TOP + 24, 0.3), seg(4, TOP + 24, 3, TOP + 21, 0.3)), tone(PAPER, 0.25)),
    );
    S.lathe(ys.map((y) => [R(y), TOP + y]), { segs: 20, cap: false });
    S.paint(fill(RIB, { rough: 0.7 }));
    for (let y = 7.4; y < 34; y += 2.8) S.torus([0, TOP + y, 0], R(y) + 0.1, 0.32, { segs: 20, sides: 4 });
  });
  // the tongue, lolling
  S.joint('tongue', { pivot: [0, TOP + 13.6, 12.6], axis: 'x', min: -0.3, max: 0.6, rest: 0, g: [0, 0.45], idle: 0.08 }, () => {
    S.paint(fill(0xf08a96, { rough: 0.3 }), proj('front', seg(0, TOP + 12.6, 0, TOP + 5, 0.35), tone(0xf08a96, 0.25)), under(0.15));
    S.tube(spline([[0, TOP + 13.6, 12.4], [0, TOP + 12.4, 14.6], [0.4, TOP + 8.6, 15.6], [0.8, TOP + 4.8, 15], [1, TOP + 3.8, 14]], 3), (t) => lerp(2.6, 2, t), { sides: 8, flat: [1.6, 0.55] });
  });
}

// ------------------------------------------------------------------ 2. Kappa & Cucumber
export function kappa(S) {
  const G = 0x8fcf6a, GD = 0x5fa04a, HAIR = 0x2f6a46, BELLY = 0xeef2b4, BEAK = 0xf0c24a, SHELL = 0x8c6a3e, PLATE = 0xf4f1e6;
  stage(S, 17);
  S.paint(fill(0xd8c24a), under(0.2));
  for (const s of [1, -1]) paw(S, [s * 4.4, TOP, 1], 6.4, 7.6, 2.8, { toes: 3 });
  S.joint('bow', { pivot: [0, TOP + 6, 0], axis: 'x', min: 0, max: 0.6, rest: 0, g: [0, 0.5], idle: 0.03 }, () => {
    S.paint(fill(G), vol(blob([0, TOP + 13, 6], [5.4, 7, 3]), BELLY), proj('front', or(...[10, 13, 16].map((y) => seg(-3.6, TOP + y, 3.6, TOP + y, 0.25))), tone(BELLY, 0.2)), under(0.14));
    form(S, [0, TOP, 0], [[2, 0.05, 0.05, 0], [2.3, 5, 4.4, 0], [4.4, 7.4, 6.4, 0.4], [8.6, 7.8, 6.8, 0.8], [13, 7, 6.2, 0.8], [17, 5.6, 5, 0.4], [19.4, 3.6, 3.2, 0], [20.2, 0.05, 0.05, 0]]);
    // the shell, hexagons painted on, a cream rim modelled round it
    const hexes = or(...[[0, 14], [-4, 11], [4, 11], [0, 8], [-4, 17], [4, 17]].map(([x, y]) => stroke(star(x, TOP + y, 2.6, 6, 0.9, 0), 0.35)));
    S.paint(fill(SHELL, { rough: 0.45 }), proj('back', hexes, tone(SHELL, 0.3)), crown(0.1));
    S.ball([0, TOP + 12.6, -5.4], [7, 8, 3.8], { segs: 16, rings: 9, v0: 0 });
    S.paint(fill(0xe8d4a0));
    S.at([0, TOP + 12.6, -5.2], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 7, 0.8, { segs: 20, sides: 5, sy: 1.1 }));
    // arms round the cucumber
    S.paint(fill(G), under(0.15));
    for (const s of [1, -1]) S.tube(spline([[s * 5.6, TOP + 15.6, 1.4], [s * 7.4, TOP + 12, 4.6], [s * 3.4, TOP + 10.4, 8]], 2), [2, 1.7], { sides: 8 });
    S.paint(fill(0xd8c24a));
    for (const s of [1, -1]) S.ball([s * 3.4, TOP + 10.4, 8], [1.9, 1.7, 1.9], { segs: 8, rings: 5 });
    // the cucumber
    const CU = 0x4f8f3a;
    S.paint(fill(CU, { rough: 0.45 }), vol((x, y, z) => Math.abs(Math.sin(Math.atan2(y - TOP - 9, z - 9) * 5)) - 0.75, tint(CU, 0.3)), vol(blob([-12.4, TOP + 13, 9], [1.4, 2.4, 2.4]), 0xe6f0b4));
    S.tube(spline([[-12.4, TOP + 13, 9], [-6, TOP + 10.6, 9.6], [2, TOP + 9.4, 9.2], [10, TOP + 10.6, 8.6], [13, TOP + 12.8, 8]], 3), (t) => (t < 0.06 ? lerp(1.6, 2.3, t / 0.06) : t > 0.9 ? lerp(2.3, 1, (t - 0.9) / 0.1) : 2.3), { sides: 10 });
    S.paint(fill(0xb8a03a));
    S.ball([13.2, TOP + 13, 8], [0.8, 0.8, 0.8], { segs: 6, rings: 4 });
    // the head: a duck's bill, a bob of hair round the dish
    S.at([0, TOP + 27.6, 0.4], null, () => {
      S.paint(fill(G), ...face({ at: [0, 1], gap: 9, r: 1.9, eye: 'dot', mouth: null, blush: BLUSH }), under(0.14));
      form(S, [0, 0, 0], [[-8, 0.05, 0.05, 0.4], [-7.4, 4.4, 4, 0.4], [-5.4, 8, 7, 0.3], [-2, 9.8, 8.6, 0.2], [1.6, 9.8, 8.6, 0], [4.8, 8.6, 7.8, -0.2], [7.2, 6, 5.6, -0.3], [8.4, 0.05, 0.05, -0.3]]);
      S.paint(fill(BEAK, { rough: 0.35 }), proj('front', seg(-3.4, -3.4, 3.4, -3.4, 0.3), tone(BEAK, 0.35)), under(0.2), crown(0.12));
      S.loft(spline([[6.2, 4.4, 2.4, -3.2], [8.2, 4.6, 2, -3.4], [10.2, 4, 1.4, -3.4], [11.2, 3, 0.8, -3.3]], 2).map(([z, w, h, y]) => ring([0, y, z], w, h, 12, { axis: 'z', pow: 2.6 })));
      S.paint(fill(HAIR, { rough: 0.5 }), under(0.15));
      for (let k = 0; k < 15; k++) { const a = (k / 15) * Math.PI * 2; if (Math.cos(a) > 0.8) continue; S.at([Math.sin(a) * 7.4, 4.2, Math.cos(a) * 6.6], [Math.cos(a) * 0.95, 0, -Math.sin(a) * 0.95], () => blade(S, 4.2, 3.6, 1.6, { shape: 'leaf', cup: 0.3 })); }
      // the dish, full of water (it spills when it bows)
      S.paint(fill(PLATE, { rough: 0.35 }), crown(0.05));
      S.lathe([[5, 6.6], [5.6, 7.6], [5.5, 8.6], [4.7, 8.6], [4.3, 8.1]], { segs: 18, cap: false });
      S.paint(fill(0x8fd0ea, { rough: 0.1 }), proj('top', ellipse(-1.4, 1.4, 1.6, 0.8, 0.5), 0xd8f2fa));
      S.cyl([0, 7, 0], 4.4, 1.1, { segs: 18, bevel: 0 });
    });
  });
}

// ------------------------------------------------------------------ 3. Hitotsume-kozō
export function hitotsume(S) {
  const BLUE = 0x3f62a8, OBI = 0xf2c84a, WHITE = 0xf6f2ea;
  stage(S, 16);
  S.at([0, TOP, 0], null, () => kid(S, {
    cloth: BLUE, shoes: 'geta', hair: 'bald', eyes: 1,
    outfit: [vol(band(12.6, 15.4), OBI), proj('front', or(seg(-3.2, 23.6, 1, 15.6, 1), seg(3.2, 23.6, -0.4, 18, 1)), WHITE), proj('front', or(...[-4.4, 4.4].map((x) => circle(x, 8, 1.1)), circle(0, 6, 0.9)), tint(BLUE, 0.4)), proj('back', or(...[[-3, 9], [3, 10], [0, 19], [-4, 18], [4, 20]].map(([x, y]) => circle(x, y, 1))), tint(BLUE, 0.4))],
    arms: [[8.6, 20.6, 6.4], [-8.6, 20.6, 6.4]], sleeveR: [2.2, 2.8, 3.2],
    headJoint: { axis: 'x', pivot: [0, 24.4, 0.2], min: -0.1, max: 0.45, g: [0, 0.4], idle: 0.03 },
    face: [
      proj('front', ellipse(0, 0.4, 4.2, 3.8), 0xfdfaf4), proj('front', stroke(ellipse(0, 0.4, 4.2, 3.8), 0.45), 0x6a4a3a), proj('front', circle(0, 0, 2.4), 0x6a3a26), proj('front', circle(0, 0, 1.3), 0x1e161c), proj('front', or(circle(-0.8, 0.9, 0.7), circle(0.7, -0.6, 0.3)), 0xffffff),
      proj('front', arc(0, 0.6, 5.2, Math.PI * 0.25, Math.PI * 0.75, 0.5), 0x6a4a3a), proj('front', pair(ellipse(5.4, -4.2, 1.7, 0.9)), BLUSH, { alpha: 0.8 }),
      proj('front', arc(0, -4.2, 1.8, Math.PI * 1.15, Math.PI * 1.85, 0.4), 0x6a4a3a),
    ],
    onHead: (S) => {
      S.paint(fill(0xf08a96, { rough: 0.3 }), proj('front', seg(0, -5.6, 0, -8, 0.3), tone(0xf08a96, 0.25)));
      S.tube(spline([[0, -5.4, 8.4], [0, -6.6, 9.6], [0, -8.4, 9.8]], 2), [1.2, 1.1], { sides: 8, flat: [1.5, 0.6] });
      S.paint(fill(tone(SKIN, 0.1)));
      S.ball([0, 9.2, -0.4], [1.2, 0.8, 1.2], { segs: 8, rings: 4 });
    },
  }));
}

// ------------------------------------------------------------------ 4. Fox-fire Kitsune
export function kitsune(S) {
  const WHITE = 0xf8f4ec, RED = 0xd8423a, STONE = 0xb4b0a8;
  stage(S, 17);
  // a stone plinth with moss
  S.paint(fill(STONE, { rough: 0.9 }), proj('front', or(seg(-6, TOP + 2, -5, TOP + 6, 0.3), seg(4, TOP + 4, 6, TOP + 3, 0.3)), tone(STONE, 0.2)), vol(blobs(blob([-8, TOP + 6.6, 4], [4, 1.6, 4]), blob([7, TOP + 6.4, -5], [4, 1.4, 4])), 0x7a9a5a), crown(0.08), under(0.2));
  S.box(-10, TOP, -8, 10, TOP + 6.4, 8, { bevel: 1.2 });
  const B = TOP + 6.4;
  // three tails, each lit at the tip
  for (const [k, ang, len] of [[0, -0.9, 1], [1, 0, 1.12], [2, 0.9, 1]]) S.joint(`tail${k}`, { pivot: [0, B + 3, -5], axis: [0, Math.cos(ang), Math.sin(ang) * 0.4], min: -0.3, max: 0.3, rest: 0, idle: 0.12 }, () => {
    const ex = Math.sin(ang) * 13 * len, top = B + 33 * len;
    S.paint(fill(WHITE), vol(above(top - 4), 0xf2c8a8), under(0.12));
    S.tube(spline([[0, B + 3, -5], [ex * 0.3, B + 4, -10], [ex * 0.7, B + 12, -12.4], [ex, top - 8, -10], [ex * 1.05, top, -8.6]], 3), (t) => (t < 0.6 ? lerp(2.4, 3.6, t / 0.6) : lerp(3.6, 1.2, (t - 0.6) / 0.4)), { sides: 10 });
    flame(S, [ex * 1.05, top - 0.4, -8.6], 7.4, 0x7fd0ee, 0xeefaff, -Math.sin(ang) * 0.3);
  });
  S.at([0, B, 0], null, () => cat(S, {
    coat: WHITE, light: 0xfffdf8, pose: 'sit', eye: 'closed', blush: 0xf2a8a8, ear: [WHITE, WHITE], whisker: 0xd8b0a8, tail: false,
    headMarks: [proj('front', or(poly([[-2.4, 6.2], [-1.2, 4.4], [-0.4, 6.8]]), poly([[2.4, 6.2], [1.2, 4.4], [0.4, 6.8]])), RED), proj('front', pair(seg(5.6, 1.4, 8.8, 2.8, 0.7)), RED)],
    outfit: [proj('front', poly([[-6.4, 21.6], [6.4, 21.6], [0, 12.6]]), RED, { facing: 0.05 }), proj('front', stroke(poly([[-6.4, 21.6], [6.4, 21.6], [0, 12.6]]), 0.4), 0xf2c84a, { facing: 0.05 })],
    arms: [[3.2, 2.4, 5.4], [-6, 15.6, 9.8]],
    onHead: (S) => {
      // a long fox muzzle
      S.paint(fill(WHITE), under(0.14));
      S.loft(spline([[5, 4.4, 3.4, -2.6], [8, 3.6, 2.8, -2.8], [10.6, 2.4, 2, -2.8], [11.8, 1.2, 1.1, -2.8]], 2).map(([z, w, h, y]) => ring([0, y, z], w, h, 10, { axis: 'z' })));
      S.paint(fill(0x3a3034, { rough: 0.2 }));
      S.ball([0, -2.3, 11.8], [1, 0.8, 0.7], { segs: 8, rings: 5 });
    },
  }));
  // the skewer of fried tofu, toasting over the left tail's flame
  S.paint(fill(0xd9c08a));
  S.tube([[-6, B + 15.6, 9.8], [-9.4, B + 22, 2], [-10, B + 23.4, -1]], 0.3, { sides: 5 });
  S.paint(fill(0xdba545), proj('front', or(ellipse(-9, B + 22.6, 1, 0.6), ellipse(-8, B + 21.6, 0.8, 0.5)), tone(0xdba545, 0.2)), under(0.2), crown(0.08));
  S.at([-8.6, B + 21.6, 3], [0.6, 0.2, 0.4], () => S.box(-2.6, -1.6, -0.8, 2.6, 1.6, 0.8, { bevel: 0.5 }));
}

// ------------------------------------------------------------------ 5. Karasu-tengu
export function tengu(S) {
  const CROW = 0x2e3248, BEAK = 0xf0b43a, ROBE = 0xf4efe4, HAKAMA = 0x3a4a72, POM = 0xe8504a, ROCK = 0x8a8690;
  stage(S, 17);
  S.paint(fill(ROCK, { rough: 0.9 }), vol(blobs(blob([-4, TOP + 5, 3], [5, 1.6, 4]), blob([5, TOP + 4.6, -3], [4, 1.6, 4])), 0x7a9a5a), proj('front', or(seg(-6, TOP + 1, -3, TOP + 3.6, 0.3), seg(3, TOP + 1.4, 6, TOP + 2.4, 0.3)), tone(ROCK, 0.25)), crown(0.06), under(0.2));
  S.lathe(dense([[10.4, 0], [11, 1.4], [9.4, 4], [6, 5.2], [3, 5.6]], 1.6), { segs: 12, sx: 1.1, sz: 0.9, at: [0, TOP, 0], cap: true });
  const B = TOP + 5;
  S.at([0, B, 0], null, () => {
    // one-toothed geta
    for (const s of [1, -1]) {
      S.paint(fill(0xc89a64), under(0.2));
      S.box(s * 2.9 - 2, 2.2, -2.6, s * 2.9 + 2, 3.2, 4.6, { bevel: 0.35 });
      S.paint(fill(0x8a5e3a));
      S.box(s * 2.9 - 0.6, 0, -0.6, s * 2.9 + 0.6, 2.2, 2.6, { bevel: 0.2 });
    }
    S.at([0, 1.2, 0], null, () => kid(S, {
      skin: CROW, cloth: ROBE, shoes: null, legCol: 0xf0c060, hair: 'bald', eye: 'bead', eyeR: 1.4, mouth: null, blush: 0x8a6a8a,
      body: [[3.6, 0.05, 0.05, 0], [3.8, 6.8, 6, 0], [5, 7.4, 6.4, 0], [8.6, 7, 6, 0.2], [13.4, 6.6, 5.6, 0.4], [18.2, 6.4, 5.2, 0.3], [21.2, 5.6, 4.6, 0.2], [23.2, 3.4, 3, 0], [24, 0.05, 0.05, 0]],
      outfit: [vol(below(12.4), HAKAMA), proj('front', or(seg(-3.2, 23.6, 1, 15.6, 1), seg(3.2, 23.6, -0.4, 18, 1)), tone(ROBE, 0.2)), proj('front', or(seg(0, 4, 0, 12, 0.35), seg(-3, 4, -2.6, 12, 0.3), seg(3, 4, 2.6, 12, 0.3)), tone(HAKAMA, 0.3))],
      sleeve: ROBE, arms: [[9.6, 24, 5], [-7, 14.6, 6]], sleeveR: [2.2, 3, 3.4],
      onHead: (S) => {
        S.paint(fill(BEAK, { rough: 0.35 }), proj('right', seg(4.6, -2.6, 13, -3.6, 0.3), tone(BEAK, 0.35)), proj('left', seg(-13, -3.6, -4.6, -2.6, 0.3), tone(BEAK, 0.35)), crown(0.12), under(0.2));
        S.loft(spline([[6.8, 3.6, 3, -1.8], [9.6, 3, 2.6, -2.2], [12.4, 1.9, 1.8, -2.8], [14.4, 0.7, 0.8, -3.6], [15, 0.1, 0.1, -4.2]], 2).map(([z, w, h, y]) => ring([0, y, z], w, h, 10, { axis: 'z', pow: 2.2 })));
        // the tokin cap
        S.paint(fill(0x1e1e26, { rough: 0.35 }), crown(0.15));
        S.at([0, 8.4, 2.4], [-0.35, 0, 0], () => S.lathe([[3, 0], [3.2, 0.6], [2.4, 2.6], [1.2, 3.2]], { segs: 6, cap: true }));
        S.paint(fill(CROW), vol(above(7), tint(CROW, 0.2)), under(0.15));
        for (const s of [-1, 0, 1]) S.at([s * 1.8, 7.6, -5 - Math.abs(s)], [-0.9, 0, s * 0.3], () => blade(S, 5, 2.6, 1, { shape: 'leaf', cup: 0.6 }));
      },
    }));
    // the pom-poms of the yamabushi sash
    S.paint(fill(POM, { rough: 0.9 }), under(0.15));
    for (const [x, y] of [[-2.6, 21.4], [2.6, 21.4], [-2.4, 17.6], [2.4, 17.6]]) S.ball([x, y + 1.2, 5.8], [1.6, 1.6, 1.4], { segs: 10, rings: 6 });
    // the wings
    for (const s of [1, -1]) S.joint(`wing${s}`, { pivot: [s * 3, 22, -4], axis: 'y', min: -0.4, max: 0.4, rest: 0, idle: 0.08 }, () => {
      S.paint(fill(CROW), proj('front', or(seg(0, 4, 0, 18, 0.4), seg(-3, 6, -2, 16, 0.3), seg(3, 6, 2.4, 16, 0.3)), tint(CROW, 0.16)), proj('back', or(seg(0, 4, 0, 18, 0.4), seg(-3, 6, -2, 16, 0.3), seg(3, 6, 2.4, 16, 0.3)), tint(CROW, 0.16)), under(0.15));
      S.at([s * 4, 21, -4.4], [0.3, s * 0.5, -s * 1.15], () => blade(S, 19, 10, 1.6, { shape: 'wing', cup: 1.6 }));
    });
    // the leaf fan, raised
    S.joint('fan', { pivot: [9.6, 25.2, 5], axis: 'z', min: -0.6, max: 0.4, rest: 0, g: [0, -0.5], idle: 0.06 }, () => {
      S.paint(fill(0x8a5e3a));
      S.tube([[9.6, 22.4, 5.4], [10.6, 30, 6]], 0.45, { sides: 6 });
      S.paint(fill(0x5f9a4a, { rough: 0.5 }), proj('front', or(...[0, 1, 2, 3, 4, 5, 6].map((k) => { const a = -1.4 + k * 0.47; return seg(0, 0, Math.sin(a) * 8, Math.cos(a) * 8, 0.3); })), tint(0x5f9a4a, 0.3)), under(0.15));
      S.at([10.6, 30, 6.1], [0, 0, -0.1], () => {
        for (let k = 0; k < 7; k++) { const a = -1.4 + k * 0.47; S.at([0, 0, 0], [0, 0, -a], () => S.at([0, 0, 0], null, () => blade(S, k === 3 ? 9.4 : 8.4, 3.6, 0.7, { shape: 'leaf' }))); }
        S.ball([0, 0, 0], [2.4, 2, 0.6], { segs: 10, rings: 4 });
      });
    });
  });
}

// ------------------------------------------------------------------ 6. Zashiki-warashi
export function zashiki(S) {
  const RED = 0xd8423a, PINKK = 0xf2a8b4, TATAMI = 0xd8cc8c, HERI = 0x2e3a52, GOLDP = 0xe2c26a;
  // a tatami mat, a two-panel gold screen behind her
  S.paint(fill(TATAMI, { rough: 0.85 }), proj('top', repeatV(rbox(0, 0, 30, 0.12, 0), 1.2), tone(TATAMI, 0.08)), proj('top', or(rbox(0, 14.6, 26, 1.6, 0), rbox(0, -14.6, 26, 1.6, 0)), HERI), proj('top', or(...[-12, 0, 12].map((x) => circle(x, 14.6, 0.5)), ...[-12, 0, 12].map((x) => circle(x, -14.6, 0.5))), GOLDP), under(0.2), ...stamp(MAKER, { c: 0x7a6e4a, px: 0.3 }));
  S.box(-24, 0, -16, 24, 3, 16, { bevel: 0.5 });
  const pine = (x0) => or(seg(x0 - 4, 6, x0 + 3, 22, 0.8), seg(x0 + 1, 17, x0 + 7, 21, 0.6), ellipse(x0 + 3, 23, 5, 2), ellipse(x0 + 7, 21, 3.6, 1.6), ellipse(x0 - 1, 18, 3.4, 1.5));
  for (const [x, a] of [[-9.6, 0.25], [9.6, -0.25]]) S.at([x, TOP, -12], [0, a, 0], () => {
    S.paint(fill(GOLDP, { rough: 0.4 }), proj('front', pine(-2), 0x3f6a3a), proj('front', or(ellipse(-6, 9, 6, 1.2), ellipse(5, 12, 5, 1)), 0xf4ead2, { alpha: 0.8 }), proj('front', stroke(rbox(0, 14, 9.4, 13.4, 0), 0.5), 0x3a2a26));
    S.box(-9.8, 0, -0.6, 9.8, 28, 0.6, { bevel: 0.3 });
  });
  // her, kneeling, a rice cracker in hand and a spinning top in front
  S.at([0, TOP, 0], null, () => kid(S, {
    pose: 'kneel', cloth: RED, hair: 'okappa', eye: 'smug', mouth: 'smile',
    outfit: [vol(band(10.4, 13.2), 0xf2c84a), proj('front', or(seg(-3, 19, 1, 12.6, 1), seg(3, 19, -0.4, 14.6, 1)), 0xf6f2ea), proj('front', or(...[[-6, 4], [5, 6], [-3, 7.6], [7, 2.4], [0, 3]].map(([x, y]) => star(x, y, 1.3, 5, 0.5))), PINKK), proj('back', or(...[[-4, 5], [3, 8], [5, 15], [-5, 16]].map(([x, y]) => star(x, y, 1.3, 5, 0.5))), PINKK)],
    arms: [[5.4, 16.4, 7.4], [-4.2, 11.4, 7.2]], sleeveR: [2.2, 3, 3.6],
    headRot: [0.08, 0.1, 0.08],
    onHead: (S) => { S.paint(fill(0xd8423a), crown(0.1)); S.at([-5.6, 8.4, 2.6], [0.3, 0, 0.6], () => { for (let k = 0; k < 4; k++) S.at([0, 0, 0], [0, 0, k * 1.57], () => blade(S, 2.2, 1.8, 0.6, { shape: 'round' })); }); },
  }));
  S.paint(fill(0xd8a35a), proj('front', or(circle(6.4, TOP + 19.6, 0.4), circle(4.6, TOP + 18, 0.35), circle(7.2, TOP + 17.4, 0.3)), 0x9a6a34), under(0.15));
  S.at([5.8, TOP + 18.4, 8], [0.2, 0, 0.2], () => S.cyl([0, -0.4, 0], 2.8, 0.8, { segs: 14 }));
  // a bowl of more crackers
  S.paint(fill(0x3a3034, { rough: 0.35 }), vol(below(TOP + 1.4), RED));
  S.lathe(dense([[2.6, 0], [3, 0.6], [4.4, 1.6], [5.6, 4], [5.2, 4], [4, 2.2], [0, 2]], 1.5), { segs: 16, at: [-12, TOP, 8] });
  S.paint(fill(0xd8a35a), under(0.15));
  for (const [x, z, a] of [[-12.6, 7.4, 0.3], [-11, 9.2, -0.4], [-12, 8.2, 1.1]]) S.at([x, TOP + 4, z], [a, 0, 0.4], () => S.cyl([0, 0, 0], 2.4, 0.7, { segs: 12 }));
  // the spinning top
  S.joint('koma', { pivot: [10, TOP, 10], axis: 'y', min: -10, max: 10, rest: 0, g: [0, 6.28], idle: 0.6 }, () => {
    S.paint(fill(0xc89a64), vol(band(TOP + 2.6, TOP + 3.2), RED), vol(band(TOP + 3.6, TOP + 4.2), 0x3f6fb0), vol(band(TOP + 4.6, TOP + 5), 0x5fa04a), crown(0.1));
    S.lathe(dense([[0, 0.4], [1.2, 1.4], [4, 3.4], [4.2, 4.4], [3, 5.2]], 1), { segs: 16, at: [10, TOP, 10], cap: true });
    S.paint(fill(0x8a5e3a));
    S.tube([[10, TOP + 5, 10], [10, TOP + 8.4, 10]], 0.6, { sides: 8 });
  });
}

// ------------------------------------------------------------------ 7. Dancing Nekomata
export function nekomata(S) {
  const BLACK = 0x3a3442, WHITE = 0xf8f4ec, TOWEL = 0xf4f0e6, NAVY = 0x2e4a86;
  stage(S, 18);
  // two tails, both lit
  for (const s of [1, -1]) S.joint(`tail${s}`, { pivot: [0, TOP + 9, -5], axis: 'z', min: -0.3, max: 0.3, rest: 0, idle: 0.14 }, () => {
    S.paint(fill(BLACK), vol(above(TOP + 26), WHITE), under(0.14));
    S.tube(spline([[0, TOP + 9, -5], [s * 3, TOP + 8, -10], [s * 8, TOP + 14, -12], [s * 11, TOP + 22, -10], [s * 12, TOP + 28.4, -8]], 3), (t) => lerp(2.2, 1.4, t), { sides: 8 });
    flame(S, [s * 12, TOP + 28.6, -8], 7, 0x8fd8f2, 0xf0fbff, -s * 0.3);
  });
  S.joint('dance', { pivot: [0, TOP, 0], axis: 'z', min: -0.25, max: 0.25, rest: 0, g: [0, 0.18], idle: 0.08 }, () => S.at([0, TOP, 0], null, () => {
    cat(S, {
      coat: BLACK, light: WHITE, eye: 'closed', blush: BLUSH, legCol: BLACK, whisker: 0xb0a8b8, tail: false,
      headMarks: [vol((x, y, z) => Math.max(y - (3.6 - 0.75 * Math.abs(x)), 2 - z), WHITE)],
      bodyMarks: [vol(blob([0, 15, 6], [4.4, 6.6, 3]), WHITE)],
      outfit: [proj('front', or(seg(-5.6, 23.4, 0.6, 12.6, 1.1), seg(5.6, 23.4, -0.6, 12.6, 1.1)), 0xd8423a), vol(band(12, 13.6), 0xd8423a)],
      arms: [[9.6, 33, 3], [-9.4, 22, 6.4]],
      headRot: [0, 0, 0.12], mouthCol: 0x8a8296,
      onHead: (S) => {
        // the tenugui towel, knotted under the chin
        const dots = (x, y, z) => { const i = Math.round(x / 2.2), j = Math.round(z / 2.2); return ((i + j) & 1) === 0 && Math.hypot(x - i * 2.2, z - j * 2.2) < 0.55 ? NAVY : TOWEL; };
        S.paint(fill(dots), under(0.15));
        S.at([0, 6.4, -1.4], [-0.08, 0, 0], () => drape(S, -10.6, -9.6, 10.6, 9.6, 0, { nx: 10, nz: 9, th: 0.8, fold: (u, v) => 3.4 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) ** 0.6 - 2.4 * (Math.abs(u - 0.5) * 2) ** 3 - 1.4 * (v < 0.25 ? (0.25 - v) * 4 : 0) }));
        S.paint(fill(TOWEL), under(0.15));
        for (const s of [1, -1]) S.tube(spline([[s * 9.8, 4.6, -1], [s * 10.6, -1, 1], [s * 9, -6, 3.6], [s * 4, -8.6, 5.6], [0, -9, 6]], 3), 0.9, { sides: 6, flat: [1.6, 0.6] });
        S.ball([0, -9, 6.2], [1.6, 1.2, 1.1], { segs: 8, rings: 5 });
      },
    });
  }));
}

// ------------------------------------------------------------------ 8. Nurikabe (secret)
export function nurikabe(S) {
  const PLASTER = 0xf2ece0, TILE = 0x5a6478, STAIN = 0xd8ccb4, FOOT = 0xe8dcc8;
  stage(S, 20, { sx: 1.25 });
  S.paint(fill(FOOT), under(0.2));
  for (const s of [1, -1]) paw(S, [s * 7.4, TOP, 3], 6.4, 7, 3, { toes: 3 });
  S.joint('shuffle', { slide: [9, 0, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    // the wall: a plaster slab on a stone footing, stains placed where rain runs, a few cracks
    S.paint(fill(0x9a948a, { rough: 0.9 }), proj('front', or(seg(-12, TOP + 3, -12, TOP + 5.6, 0.3), seg(0, TOP + 3, 0, TOP + 5.6, 0.3), seg(12, TOP + 3, 12, TOP + 5.6, 0.3)), tone(0x9a948a, 0.25)), under(0.2));
    S.box(-20, TOP + 2.6, -5.4, 20, TOP + 6, 5.4, { bevel: 0.6 });
    S.paint(
      fill(PLASTER, { rough: 0.9 }),
      vol(blobs(blob([-14, TOP + 36, 4.2], [1.1, 4, 1]), blob([-11.6, TOP + 35, 4.2], [0.7, 5, 1]), blob([9.4, TOP + 36, 4.2], [1, 4.4, 1]), blob([12.4, TOP + 35, 4.2], [0.7, 5.4, 1])), STAIN), shade(vol(below(TOP + 9)), 0.08),
      proj('front', or(seg(13, TOP + 22, 15, TOP + 18, 0.3), seg(15, TOP + 18, 14, TOP + 14, 0.3), seg(-15, TOP + 12, -12.6, TOP + 15, 0.3)), tone(PLASTER, 0.3)),
      ...face({ at: [0, TOP + 24], gap: 13, r: 1.5, eye: 'sleepy', mouth: 'flat', mw: 4, blush: BLUSH, my: 6 }),
      proj('back', or(rbox(-8, TOP + 16, 3.6, 4.6, 0.4)), 0xe8d8a8), proj('back', kana('ぬりかべ', -8, TOP + 16, 2.6), 0x6a5a4a),
      under(0.15),
    );
    S.box(-18.4, TOP + 6, -4.2, 18.4, TOP + 40, 4.2, { bevel: 1.2 });
    // the tiled cap: a ridge, round eave tiles end-on
    S.paint(fill(TILE, { rough: 0.45 }), crown(0.12), under(0.25));
    S.at([0, TOP + 40, 0], [0, -Math.PI / 2, 0], () => S.extrude([[-6.4, 0], [6.4, 0], [6.4, 0.8], [1.6, 3.6], [-1.6, 3.6], [-6.4, 0.8]], -20, 20));
    S.box(-20.6, TOP + 43, -1.4, 20.6, TOP + 45, 1.4, { bevel: 0.6 });
    for (let x = -18; x <= 18; x += 4) for (const z of [6.2, -6.2]) S.at([x, TOP + 40.8, z], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.6, 0], 1.2, 1.2, { segs: 10 }));
    // stubby arms
    S.paint(fill(FOOT), under(0.2));
    for (const s of [1, -1]) S.tube(spline([[s * 18, TOP + 18, 0], [s * 21, TOP + 15, 1.6], [s * 21.4, TOP + 12, 2.6]], 2), [1.8, 1.5], { sides: 8 });
    for (const s of [1, -1]) S.ball([s * 21.4, TOP + 11.6, 2.6], 1.8, { segs: 8, rings: 5 });
    // a snail on its travels: a coiled shell, a soft body, two horns
    const coil = []; for (let t = 0; t <= 2.2; t += 0.05) { const r = 2.6 * (1 - t / 2.6), a = t * Math.PI * 2; coil.push([-11 + Math.cos(a) * r, TOP + 29 + Math.sin(a) * r, 5.4]); }
    S.paint(fill(0xc89a64, { rough: 0.4 }), under(0.2), crown(0.1));
    S.tube(coil, (t) => 1.25 * (1 - t * 0.75), { sides: 8 });
    S.paint(fill(0xd8d0c0), under(0.2));
    S.tube(spline([[-14.4, TOP + 26.4, 4.6], [-10, TOP + 26.2, 4.8], [-7.6, TOP + 27, 4.8]], 2), (t) => lerp(0.6, 1, Math.sin(t * Math.PI)), { sides: 8 });
    for (const dz of [-0.5, 0.5]) S.tube([[-7.8, TOP + 27.4, 4.8 + dz], [-6.8, TOP + 30, 4.8 + dz * 2]], 0.22, { sides: 4 });
  });
  // the stick you tap its feet with
  S.paint(fill(0xa0784a), under(0.2));
  S.tube([[22, TOP, 9], [17, TOP + 30, 7.6]], 0.7, { sides: 6 });
}

void tint; void mix; void shade; void and; void loaf; void label; void repeatU; void band; void cut; void tone; void wrap; void EYE;
