// Animal Shopping Street (どうぶつ商店街): the shops of a back-lane shotengai, each run by an animal with a straight face.
// Little shop-front dioramas: pavement, walls, a sign, an awning, the goods and the keeper; the roller shutter comes
// down. Sculpt programs in millimetres (src/figures/sculpt.js); the series data is src/data/series/shotengai.js.
import { spline, ring, swell } from '../sculpt.js';
import { head, torso, blade, eggShape } from '../anatomy.js';
import { sweep } from '../forms.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, EYE,
  circle, ellipse, rbox, seg, arc, poly, or, and, stroke, pair, all, repeatU, repeatV, label, kana, band, below, above, blob, blobs, star,
} from '../paint.js';

const MAKER = 'TSUKUSHI';
const W = 17, D = 11, H = 38; // half width, half depth, wall height

/**
 * The shop: pavement, floor, walls, roof, the sign, the shutter box and the awning. o: wall, sign [text, colour, paper],
 * awn [a, b] (stripes), shutter (true: the roller shutter is a part that comes down), en (small English line).
 */
function shop(S, o) {
  const wall = o.wall, [txt, sc, sp] = o.sign, [a1, a2] = o.awn || [0xd9483a, 0xf6f2ea];
  // pavement tiles and the kerb
  S.paint(fill(0xb4b0aa), proj('top', or(repeatU(rbox(0, 0, 0.25, 40, 0), 6), repeatV(rbox(0, 0, 40, 0.25, 0), 6)), tone(0xb4b0aa, 0.16)), under(0.2), ...stamp(MAKER, { c: 0x6a6670 }));
  S.box(-W - 3, 0, -D - 1, W + 3, 2.4, D + 9, { bevel: 0.6 });
  S.paint(fill(o.floor ?? 0x8a7a68), proj('top', repeatU(rbox(0, 0, 0.2, 40, 0), 3.4), tone(o.floor ?? 0x8a7a68, 0.14)));
  S.box(-W + 1.4, 2.4, -D + 1.4, W - 1.4, 2.9, D);
  // walls and roof
  const wallPaint = [fill(wall, { rough: 0.8 }), ...(o.wallPaint || []), vol(below(5), tone(wall, 0.12)), under(0.16)];
  S.paint(...wallPaint);
  S.box(-W, 2.4, -D - 1, W, H, -D + 1.4, { bevel: 0.4 });
  for (const s of [1, -1]) S.box(s > 0 ? W - 1.4 : -W - 0.4, 2.4, -D - 1, s > 0 ? W + 0.4 : -W + 1.4, H, D + 1.4, { bevel: 0.4 });
  S.paint(fill(0x6a6670, { rough: 0.6 }), proj('top', repeatU(rbox(0, 0, 0.25, 40, 0), 3), tone(0x6a6670, 0.2)), under(0.2));
  S.box(-W - 1.6, H, -D - 2, W + 1.6, H + 1.8, D + 2.4, { bevel: 0.5 });
  // the sign over the front
  S.paint(fill(sp ?? 0xf6f2ea, { rough: 0.6 }), proj('front', kana(txt, 0, H + 6.8, 6.6), sc), proj('front', stroke(rbox(0, H + 6.7, W - 0.6, 4.4, 0.6), 0.5), sc), under(0.2));
  S.box(-W, H + 1.8, D + 0.6, W, H + 11.6, D + 2.2, { bevel: 0.5 });
  // the shutter box under the roof
  S.paint(fill(0xc9ced4, { rough: 0.4 }), ...(o.en ? [proj('front', label(o.en, 0, H - 1.7, 0.36), 0x4a4650, { hard: true })] : []), under(0.2));
  S.box(-W + 0.4, H - 3.4, D, W - 0.4, H, D + 2, { bevel: 0.6 });
  // the awning, stripes across it, a scalloped valance
  const stripes = repeatU(rbox(0, 0, 1.7, 30, 0), 6.8);
  S.at([0, H - 3.2, D + 2], [0.32, 0, 0], () => {
    S.paint(fill(a2, { rough: 0.8 }), proj('top', stripes, a1), proj('bottom', stripes, a1), under(0.1));
    S.box(-W - 0.6, -0.6, 0, W + 0.6, 0, 7.4, { bevel: 0.2 });
    const sc2 = []; sc2.push([-W - 0.6, 0]);
    const n = 10, step = (2 * W + 1.2) / n;
    for (let i = 0; i < n; i++) for (let k = 0; k <= 6; k++) { const a = Math.PI + (k / 6) * Math.PI; sc2.push([-W - 0.6 + step * (i + 0.5) + Math.cos(a) * step / 2, -2.2 + Math.sin(a) * 1.4]); }
    sc2.push([W + 0.6, 0]);
    S.paint(fill(a2, { rough: 0.8 }), proj('front', stripes, a1), proj('back', stripes, a1));
    S.at([0, -0.4, 7.4], [-0.32, 0, 0], () => S.extrude(sc2, -0.3, 0.3));
  });
  // the roller shutter: rolled up in its box, it comes down when you work it
  if (o.shutter !== false) {
    S.rest = 0;
    S.part('shutter', { rest: 0, move: (t) => swell([0, H - 3.4, D + 1], 1, Math.max(0.025, t), 1) }, () => {
      S.paint(fill(0xc9ced4, { rough: 0.45 }), proj('front', repeatV(rbox(0, 0, 40, 0.22, 0), 1.6), tone(0xc9ced4, 0.22)), proj('front', rbox(0, 5.4, 3, 0.6, 0.3), 0x6a6670), proj('front', kana('本日休業', 0, 17, 4), 0xd9483a), under(0.2));
      S.box(-W + 1.4, 2.9, D + 0.4, W - 1.4, H - 3.4, D + 1.2);
    });
  }
}
/** A shopkeeper behind a counter: torso and head, ears, apron. o: fur, belly, ears ('round' | 'cat' | 'none'), eye, mouth, apron. */
function keeper(S, at, o) {
  const [x, y, z] = at, fur = o.fur;
  S.paint(fill(fur), ...(o.apron ? [vol(blob([x, y + 3, z + 5], [8, 7, 4]), o.apron)] : []), ...(o.bellyC ? [vol(blob([x, y + 4, z + 4], [5, 6, 3]), o.bellyC)] : []), under(0.14));
  torso(S, [x, y + 4, z], [7.4, 8, 5.6], { belly: 0.16, hips: 1, sit: 0.4 });
  S.joint('head', { pivot: [x, y + 11, z], axis: 'y', min: -0.6, max: 0.6, rest: 0, idle: 0.2 }, () => S.at([x, y + 16.4, z + 0.6], null, () => {
    S.paint(fill(fur), ...(o.muzzleC ? [proj('front', ellipse(0, -2, 3.4, 2.4), o.muzzleC)] : []), ...face({ at: [0, 0.8], gap: o.gap ?? 6, r: o.r ?? 1.1, eye: o.eye || 'dot', mouth: o.mouth ?? null, mw: 2, my: 2.8, blush: o.blush }), ...(o.facePaint || []), under(0.12), crown(0.06));
    head(S, [0, 0, 0], o.headR || [6.6, 5.8, 5.6], { muzzle: o.muzzle ?? 0.3, brow: 0.25, cheek: 0.22, chin: 0.2 });
    if (o.nose) { S.paint(fill(o.nose, { rough: 0.3 })); S.ball([0, -0.8, (o.headR?.[2] ?? 5.6) + 0.2], [1, 0.7, 0.6], { segs: 6, rings: 4 }); }
    for (const s of [1, -1]) {
      if (o.ears === 'round') { S.paint(fill(fur), proj('front', circle(0, 1.6, 1.2), o.earIn || tint(fur, 0.3))); S.at([s * 4.6, 4.4, -0.6], [0, 0, -s * 0.5], () => blade(S, 3.6, 4.2, 1.4, { shape: 'round', cup: 0.5 })); }
      if (o.ears === 'cat') { S.paint(fill(fur), proj('front', ellipse(0, 2, 1, 1.8), o.earIn || 0xf2b0a8)); S.at([s * 4.2, 4.2, -0.6], [0, 0, -s * 0.42], () => blade(S, 4.6, 4.6, 1.3, { shape: 'ear', cup: 0.6 })); }
    }
    if (o.hat) o.hat();
  }));
}
/** A counter: wooden, with a top board. */
function counter(S, x0, x1, z0, z1, h, c = 0xa8784e) {
  S.paint(fill(c, { rough: 0.6 }), proj('front', repeatU(rbox(0, 0, 0.2, 40, 0), 4), tone(c, 0.16)), under(0.18));
  S.box(x0, 2.9, z0, x1, h, z1, { bevel: 0.4 });
  S.paint(fill(tint(c, 0.2), { rough: 0.5 }), under(0.2));
  S.box(x0 - 0.6, h, z0 - 0.6, x1 + 0.6, h + 1, z1 + 0.8, { bevel: 0.4 });
}
const fishShape = (L, h) => [[L / 2, 0], [L * 0.3, h * 0.45], [-L * 0.1, h * 0.5], [-L * 0.32, h * 0.2], [-L / 2, h * 0.42], [-L / 2, -h * 0.42], [-L * 0.32, -h * 0.2], [-L * 0.1, -h * 0.5], [L * 0.3, -h * 0.45]];

// ------------------------------------------------------------------ 1. Taiyaki Sea Bream
export function taiyaki(S) {
  const TAI = 0xe8766c, TAIL = 0xf2c0a8, GOLD = 0xd9a04a;
  shop(S, { wall: 0xf3ead6, sign: ['たいやき', 0xc8402e], en: 'HOT  10 YEN', awn: [0xd9483a, 0xf6f2ea] });
  counter(S, -W + 1.4, W - 1.4, 2, 7, 11);
  // the iron: two rows of fish moulds; a tray of the finished ones
  S.paint(fill(0x3a3438, { rough: 0.4 }), proj('top', or(...[-9, -4].flatMap((x) => [-3.4, -6.6].map((z) => ellipse(x, z, 2.2, 1.2)))), 0x221e24), crown(0.12));
  S.box(-12, 12, 2.6, -1, 14, 7.6, { bevel: 0.5 });
  S.paint(fill(0x8a8e96, { rough: 0.4 }));
  S.tube([[-12, 13, 5], [-15.4, 14, 5]], 0.6, { sides: 5 });
  S.paint(fill(0xc9ced4, { rough: 0.3 }));
  S.box(2, 12, 2.6, 13, 12.6, 7.6, { bevel: 0.3 });
  for (const [x, z, r] of [[4.6, 5, 0.2], [8.6, 4.4, -0.3], [11, 6.6, 0.4], [6.6, 7, 0.1]]) {
    S.paint(fill(GOLD, { rough: 0.6 }), proj('top', or(circle(2.6, 0.4, 0.5), seg(-1.6, 0.6, 0.6, -0.4, 0.3)), tone(GOLD, 0.3)), crown(0.15), under(0.2));
    S.at([x, 13.3, z], [-Math.PI / 2, r, 0], () => S.extrude(fishShape(6.4, 3.4), -0.7, 0.7, { bevel: 0.5 }));
  }
  // the sea bream, upright on its tail, a headband on; it turns to see who is there
  S.joint('head', { pivot: [0, 12, -3], axis: 'y', min: -0.6, max: 0.6, rest: 0, idle: 0.2 }, () => {
    const scales = proj('front', or(...[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => arc(-3 + c * 3 + (r % 2) * 1.5, 10 + r * 2.4, 1.4, Math.PI * 1.1, Math.PI * 1.9, 0.3)))), tone(TAI, 0.18));
    S.paint(fill(TAI), scales, vol(blob([0, 8, 0], [8, 3, 6]), tint(TAI, 0.35)), proj('front', circle(1.6, 22.2, 1.7), 0xf8f4ec), proj('front', circle(1.8, 22.1, 0.9), EYE), proj('front', circle(1.4, 22.6, 0.3), 0xffffff),
      proj('front', seg(-2.4, 26.2, 0.4, 27.4, 0.5), tone(TAI, 0.4)), under(0.12), crown(0.08));
    S.loft(spline([[4, 0.5, 0.4], [7, 3.4, 1.6], [12, 6.4, 2.6], [18, 7.2, 3], [23, 6, 2.6], [26.4, 3.6, 1.8], [28, 0.6, 0.5]], 2).map(([y, rx, rz]) => ring([0, y, -3], rx, rz, 14)), { caps: 'both' });
    S.paint(fill(TAIL), proj('front', repeatV(rbox(0, 0, 3, 0.15, 0), 1), tone(TAIL, 0.2)), under(0.1));
    S.at([5.6, 16, -3], [0, 0, -1.2], () => blade(S, 7, 5.4, 0.8, { shape: 'wing', cup: 0.4 }));
    S.at([-5.4, 20, -3], [0, 0, 1.0], () => blade(S, 5, 4, 0.8, { shape: 'leaf', cup: 0.3 }));
    S.paint(fill(0xf8f4ec), proj('front', kana('祭', -3.4, 24, 2.4), 0xd9483a), under(0.1));
    S.torus([0, 24.4, -3], 5.8, 0.8, { segs: 18, sides: 5, sy: 1.4 });
    S.at([0, 24.4, -3], [0.2, 0, 0], () => S.at([0, 0, 0], [0, 0, 0], () => S.ball([5.6, 0, -2.4], [1.4, 1, 1], { segs: 6, rings: 4 })));
  });
}

// ------------------------------------------------------------------ 2. Lottery-Booth Tortoise
export function kuji(S) {
  const SKIN = 0x9ab86a, SHELL = 0x8a6a46, PLATE = 0xb8905a, BLUE = 0x6fa0d0;
  shop(S, { wall: 0xdfe8f0, sign: ['宝くじ', 0xd9483a, 0xfff2b0], en: 'LUCKY ONE', awn: [BLUE, 0xf6f2ea], wallPaint: [proj('front', rbox(0, 9, 14, 4, 0.6), 0xf2d24a)] });
  counter(S, -W + 1.4, W - 1.4, 3, 8, 13, 0xd9c8a8);
  // the glass over the counter with its little arched window
  S.clear(true);
  S.paint(fill(0xdcecf0, { rough: 0.1 }));
  S.box(-W + 1.4, 14, 7.6, W - 1.4, 24, 8.2);
  S.clear(false);
  S.paint(fill(0xf6f2ea), proj('top', kana('当', 0, 0, 6), 0xd9483a), proj('top', stroke(circle(0, 0, 4.4), 0.5), 0xd9483a));
  S.at([-10, 22, 8.4], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.2, 0], 5.6, 0.4, { segs: 16 }));
  S.paint(fill(0xf2ead6), proj('top', repeatU(rbox(0, 0, 0.2, 2, 0), 2.6), 0xd9483a));
  for (let k = 0; k < 3; k++) S.box(2 + k * 4.2, 14, 4 + k * 0.6, 5.6 + k * 4.2, 14.4 + k * 0.4, 6.6 + k * 0.6, { bevel: 0.2 });
  // the tortoise in its shell, spectacles on the end of its nose
  S.paint(fill(SHELL), proj('front', or(...[[-4, 15], [4, 15], [0, 19]].map(([u, v]) => stroke(poly([[u - 3, v], [u - 1.6, v + 2.6], [u + 1.6, v + 2.6], [u + 3, v], [u + 1.6, v - 2.6], [u - 1.6, v - 2.6]]), 0.5))), PLATE), under(0.14), crown(0.1));
  S.at([0, 10, -5], [0.25, 0, 0], () => S.ball([0, 0, 0], [9, 8, 6], { segs: 16, rings: 8 }));
  keeper(S, [0, 3.6, -0.6], {
    fur: SKIN, eye: 'sleepy', mouth: 'flat', headR: [5, 4.6, 5.4], muzzle: 0.45, ears: 'none', gap: 4.8,
    hat: () => { S.paint(fill(0x6a5444, { rough: 0.3 })); for (const s of [1, -1]) S.at([s * 1.9, 0.8, 5], [Math.PI / 2, 0, 0], () => S.torus([0, 0, 0], 1.3, 0.22, { segs: 12, sides: 4 })); S.tube([[-0.6, 0.8, 5.6], [0.6, 0.8, 5.6]], 0.2, { sides: 4 }); },
  });
}

// ------------------------------------------------------------------ 3. Fishmonger Cat
export function sakana(S) {
  const CAT = 0x9a9aa4, WHITE = 0xf6f2ea, APRON = 0x3f6fb8, SILVER = 0xb8c8d8, BLUEB = 0x5a7aa8;
  shop(S, { wall: 0xf2f4f2, sign: ['さかな', 0x2f4a8a], en: 'FRESH TODAY', awn: [0x3f6fb8, 0xf6f2ea], wallPaint: [proj('front', or(repeatU(rbox(0, 0, 0.2, 40, 0), 3), repeatV(rbox(0, 0, 40, 0.2, 0), 3)), 0xd8dcdc)], floor: 0x7a8a8a });
  // the slanted display: polystyrene boxes on ice, fish in rows
  S.paint(fill(0xf8f8f4, { rough: 0.9 }), under(0.2));
  S.at([0, 2.9, 5], [-0.35, 0, 0], () => {
    S.box(-W + 1.6, 0, -4, W - 1.6, 9, 4, { bevel: 0.4 });
    S.paint(fill(0xf0f4f8, { rough: 0.5 }), proj('top', or(...[[-10, 1], [4, -2], [12, 2]].map(([u, v]) => circle(u, v, 0.6))), 0xd8e4ec));
    S.box(-W + 2.4, 9, -3.4, W - 2.4, 9.6, 3.4);
    for (const [x, z, c, L] of [[-10, -1.6, SILVER, 10], [-10, 1.8, SILVER, 10], [0, -1.4, 0xe8766c, 11], [0, 2, 0xe8766c, 9.4], [10, 0, BLUEB, 12]]) {
      S.paint(fill(c, { rough: 0.3 }), vol(below(10.2), tint(c, 0.4)), proj('top', circle(L / 2 - 1.6, -0.2, 0.5), EYE), crown(0.15));
      S.at([x, 10, z], [-Math.PI / 2, 0, 0], () => S.extrude(fishShape(L, 3.4), -0.9, 0.9, { bevel: 0.7 }));
    }
    S.paint(fill(0xf8f4ec), proj('front', kana('298円', 0, 0, 2.4), 0xd9483a));
    S.box(-14, 9.2, 3.4, -6, 12.6, 3.8);
  });
  // the cat: twisted headband, rubber apron, a fish of its own in its mouth
  keeper(S, [0, 4.6, -3.4], {
    fur: CAT, apron: APRON, eye: 'line', ears: 'cat', muzzleC: WHITE, nose: 0xd98b8e, gap: 6.4,
    facePaint: [vol(blobs(blob([0, 5, 0], [1.4, 2, 6]), blob([-2.6, 4.4, 0], [0.8, 1.6, 6]), blob([2.6, 4.4, 0], [0.8, 1.6, 6])), tone(CAT, 0.3))],
    hat: () => {
      S.paint(fill(0xf8f4ec), proj('front', or(...[0, 1, 2, 3, 4].map((k) => seg(-6 + k * 3, 1.6, -4.6 + k * 3, 3.4, 0.5))), 0x3f6fb8), under(0.1));
      S.torus([0, 2.6, -0.4], 6.2, 0.9, { segs: 20, sides: 5, sy: 1.2 });
      S.paint(fill(SILVER, { rough: 0.3 }), proj('front', circle(5, -1.8, 0.4), EYE), crown(0.15));
      S.at([3.4, -2.6, 5.6], [0, 0, 0.15], () => S.extrude(fishShape(8, 2.6), -0.6, 0.6, { bevel: 0.5 }));
    },
  });
}

// ------------------------------------------------------------------ 4. Flower-Shop Bear
export function hanaya(S) {
  const BEAR = 0xb8845a, MUZ = 0xf0dcc0, APRON = 0x6fae7a, PAIL = 0xc9ced4;
  shop(S, { wall: 0xe6efe0, sign: ['はなや', 0x3f7f4a], en: 'FLOWERS', awn: [0x6fae7a, 0xf6f2ea], floor: 0x8a8070 });
  // pails of flowers out front and on a stand inside
  const bunch = (x, y, z, cols) => {
    S.paint(fill(PAIL, { rough: 0.3 }), vol(band(y + 3, y + 3.6), tone(PAIL, 0.2)), under(0.18));
    S.lathe([[2.6, 0], [2.8, 0.4], [3.4, 5.2], [3.1, 5.4], [0, 4.6]], { segs: 14, at: [x, y, z] });
    S.paint(fill(0x5a8a4a));
    for (let k = 0; k < cols.length; k++) { const a = k * 2.4, r = k ? 1.6 : 0; S.tube([[x + Math.cos(a) * r * 0.5, y + 4, z + Math.sin(a) * r * 0.5], [x + Math.cos(a) * r, y + 9 + (k % 2), z + Math.sin(a) * r]], 0.3, { sides: 4 }); }
    for (let k = 0; k < cols.length; k++) {
      const a = k * 2.4, r = k ? 1.6 : 0, c = [x + Math.cos(a) * r, y + 9.6 + (k % 2), z + Math.sin(a) * r];
      S.paint(fill(cols[k], { rough: 0.6 }), proj('top', circle(c[0], -c[2], 0.5), 0xf2d24a), crown(0.15), under(0.2));
      S.ball(c, [1.6, 1.1, 1.6], { segs: 8, rings: 4 });
    }
  };
  bunch(-12, 2.4, 14, [0xe86a7a, 0xf2a0b0, 0xe86a7a, 0xf6f2ea]);
  bunch(-5, 2.4, 15.4, [0xf2d24a, 0xf2a03a, 0xf2d24a]);
  bunch(12, 2.4, 14.6, [0x8a6ad0, 0xb89ae0, 0xf6f2ea, 0x8a6ad0]);
  counter(S, -W + 1.4, -2, 2, 7, 11, 0x8a6a4a);
  bunch(-10, 12, 4.6, [0xf6f2ea, 0xe86a7a, 0xf2d24a]);
  // the bear with its watering can
  keeper(S, [6, 2.9, -1.6], { fur: BEAR, apron: APRON, eye: 'dot', ears: 'round', earIn: MUZ, muzzleC: MUZ, nose: 0x3a3034, mouth: 'flat', gap: 6 });
  S.paint(fill(0x6fa8d8, { rough: 0.35 }), crown(0.12), under(0.16));
  S.lathe([[3.4, 0], [3.6, 0.4], [3.4, 6], [3, 6.4], [0, 6.4]], { segs: 14, at: [11.6, 6.6, 3.2] });
  S.tube(spline([[14, 8, 3.2], [17, 11.4, 3.6], [18.6, 13.4, 4]], 2), [0.9, 0.5], { sides: 6 });
  S.tube(spline([[9, 12.4, 3.2], [11.6, 15, 3.2], [14.2, 12.4, 3.2]], 2), 0.5, { sides: 5 });
  S.paint(fill(BEAR), under(0.14));
  S.tube(spline([[10, 14, -1], [10.6, 14.4, 2], [11.4, 14.6, 3.2]], 2), 1.6, { sides: 6 });
}

// ------------------------------------------------------------------ 5. Coffee-Shop Owl (ultra)
export function kissa(S) {
  const OWL = 0x9a7a5a, FACE = 0xf2e2c8, BRICK = 0xc8785a, GLASS = 0xe6f2f2;
  shop(S, { wall: BRICK, sign: ['喫茶', 0xf6eedc, 0x5a3a2a], en: 'COFFEE  HOOT', awn: [0x7a4a32, 0xf2e2c8], floor: 0x6a4a3a,
    wallPaint: [proj('front', or(repeatV(rbox(0, 0, 40, 0.25, 0), 2.4), repeatU(rbox(0, 0, 0.25, 0.9, 0), 4.8)), tone(BRICK, 0.2)), proj('right', repeatV(rbox(0, 0, 40, 0.25, 0), 2.4), tone(BRICK, 0.2)), proj('left', repeatV(rbox(0, 0, 40, 0.25, 0), 2.4), tone(BRICK, 0.2))] });
  counter(S, -W + 1.4, W - 1.4, 1, 5.6, 12, 0x6a4430);
  // the siphon on the counter, the cups, and the sample case out front
  S.paint(fill(0x3a3438, { rough: 0.4 }));
  S.box(5.6, 13, 2, 10.6, 13.8, 4.6, { bevel: 0.3 });
  S.tube([[10, 13.8, 3.3], [10, 24, 3.3]], 0.4, { sides: 5 });
  S.clear(true);
  S.paint(fill(GLASS, { rough: 0.1 }));
  S.ball([8, 16.4, 3.3], [2.4, 2.6, 2.4], { segs: 12, rings: 6 });
  S.lathe([[0.4, 19], [2, 20.4], [2.2, 24.6], [2.4, 25]], { segs: 12, at: [8, 0, 3.3], cap: 'top' });
  S.clear(false);
  S.paint(fill(0x5a3424, { rough: 0.15 }));
  S.ball([8, 15.8, 3.3], [2.1, 1.6, 2.1], { segs: 12, rings: 5 });
  for (const x of [-6, -2.4]) { S.paint(fill(0xf6f2ea, { rough: 0.3 }), vol(band(13.6, 14), 0x3f6fb8)); S.cyl([x, 13, 3.6], 2.2, 0.4, { segs: 12 }); S.lathe([[1.1, 13.4], [1.5, 13.6], [1.6, 15.6]], { segs: 12, at: [x, 0, 3.6], cap: 'bottom' }); }
  // the sample case: a cream soda and a pudding under glass
  S.paint(fill(0x6a4430, { rough: 0.6 }), under(0.18));
  S.box(-15, 2.4, 11.6, -3, 7.4, 17, { bevel: 0.4 });
  S.paint(fill(0x8ad08a, { rough: 0.15 }));
  S.lathe([[1, 7.4], [1.4, 8.6], [2, 12.4], [2.2, 13]], { segs: 12, at: [-11.6, 0, 14.4], cap: 'top' });
  S.paint(fill(0xf8f4ec, { rough: 0.6 }));
  S.ball([-11.6, 13.4, 14.4], [1.8, 1.4, 1.8], { segs: 10, rings: 5 });
  S.paint(fill(0xd9483a));
  S.ball([-11.2, 15.2, 14.4], 0.7, { segs: 6, rings: 4 });
  S.paint(fill(0xf2d070, { rough: 0.3 }), vol(above(10.4), 0x8a4a2a), crown(0.1));
  S.lathe([[2.6, 7.4], [2.4, 9], [1.6, 10.8], [0, 11]], { segs: 14, at: [-6, 0, 14.4] });
  S.clear(true);
  S.paint(fill(GLASS, { rough: 0.1 }));
  S.box(-15, 7.4, 11.6, -3, 16.6, 17);
  S.clear(false);
  // the owl, master of the house, in a bow tie
  keeper(S, [-4, 3.6, -3], {
    fur: OWL, bellyC: FACE, eye: 'stare', r: 1.4, gap: 6, ears: 'none', headR: [7, 6.4, 5.6], muzzle: 0.1,
    facePaint: [proj('front', pair(circle(3, 0.8, 2.8)), FACE), proj('front', poly([[-0.9, -0.6], [0.9, -0.6], [0, -2.6]]), 0xe8a040)],
    hat: () => { S.paint(fill(OWL)); for (const s of [1, -1]) S.at([s * 4, 4.6, 0], [0, 0, -s * 0.3], () => blade(S, 3, 2.6, 1, { shape: 'ear' })); },
  });
  S.paint(fill(0x3a3438, { rough: 0.4 }));
  S.at([-4, 10.8, 2.4], null, () => { for (const s of [1, -1]) S.extrude([[0, 0], [s * 2.6, 1.2], [s * 2.6, -1.2]], -0.4, 0.4, { bevel: 0.2 }); S.ball([0, 0, 0.2], 0.6, { segs: 6, rings: 3 }); });
}

// ------------------------------------------------------------------ 6. Bathhouse Capybara (secret)
export function sento(S) {
  const CAPY = 0xa8805a, DARK = 0x6a4a34, WOOD = 0x8a5a3a, NOREN = 0x2f4a7e, TOWEL = 0xf6f2ea;
  shop(S, { wall: 0xe8dcc4, sign: ['ゆ', 0xf6f2ea, WOOD], en: 'BATHS', awn: [WOOD, tint(WOOD, 0.3)], shutter: false, floor: 0x8a8070,
    wallPaint: [proj('front', repeatU(rbox(0, 0, 0.3, 40, 0), 4), tone(0xe8dcc4, 0.12))] });
  // the bandai: the raised desk at the entrance, a stack of wooden pails and a bucket of soap
  S.paint(fill(WOOD, { rough: 0.6 }), proj('front', repeatU(rbox(0, 0, 0.2, 40, 0), 3), tone(WOOD, 0.18)), under(0.18));
  S.box(-14, 2.9, -2, 2, 10, 4, { bevel: 0.4 });
  S.paint(fill(0xd9b47a, { rough: 0.7 }), vol(band(4, 4.6), 0x6a4a34), vol(band(7.6, 8.2), 0x6a4a34), under(0.18));
  for (const [x, y, z] of [[9, 2.9, 3], [9, 7.6, 3], [13, 2.9, 1]]) S.lathe([[3, 0], [3.4, 4.6], [3.1, 4.8], [2.6, 0.4]], { segs: 14, at: [x, y, z] });
  // the capybara at the desk with a towel on its head, an orange balanced on that
  keeper(S, [-6, 3.6, -5], {
    fur: CAPY, eye: 'sleepy', ears: 'round', earIn: DARK, headR: [6, 6, 7], muzzle: 0.9, mouth: null, gap: 6.8, nose: DARK,
    hat: () => {
      S.paint(fill(TOWEL, { rough: 0.85 }), proj('top', repeatU(rbox(0, 0, 0.3, 4, 0), 2.2), tone(TOWEL, 0.12)), vol(band(6.2, 6.8), 0xe8706c), under(0.14));
      S.box(-3.6, 4.6, -3, 3.6, 7, 3, { bevel: 1 });
      S.paint(fill(0xf2a03a, { rough: 0.5 }), crown(0.15));
      S.ball([0, 8.8, 0], 2, { segs: 10, rings: 6 });
      S.paint(fill(0x5a8a4a));
      S.ball([0.4, 10.6, 0], [0.8, 0.4, 0.5], { segs: 5, rings: 3 });
    },
  });
  // the noren over the door, split in two: it sways as someone goes in
  S.rest = 0;
  for (const s of [1, -1]) S.joint(s > 0 ? 'norenR' : 'norenL', { pivot: [s * 7.6, H - 4, D + 0.6], axis: 'x', min: -0.6, max: 0.2, rest: 0, g: [0, -0.5], idle: 0.08 }, () => {
    S.paint(fill(NOREN, { rough: 0.85 }), proj('front', kana('ゆ', s * 7.6, H - 8.4, 5.6), 0xf6f2ea), proj('back', kana('ゆ', -s * 7.6, H - 8.4, 5.6), 0xf6f2ea), proj('front', rbox(s * 7.6, H - 5, 8, 0.8, 0), tone(NOREN, 0.2)), under(0.1));
    S.box(s * 7.6 - 7.2, H - 13, D + 0.4, s * 7.6 + 7.2, H - 4, D + 1);
  });
  S.paint(fill(0x6a4a34, { rough: 0.5 }));
  S.tube([[-W + 1, H - 3.6, D + 0.7], [W - 1, H - 3.6, D + 0.7]], 0.7, { sides: 6 });
}

void sweep; void eggShape; void wrap; void and; void all; void star; void shade; void ellipse;
