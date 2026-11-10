// Boxed-In Animals (箱入りどうぶつ): animals that live in, or simply are, the boxes around the house; every box opens.
// Sculpt programs, in millimetres (src/figures/sculpt.js); the series data is src/data/series/hakoiri.js.
import { spline, ring, hinge, slide, swell, chain } from '../sculpt.js';
import { head, torso, loaf, paw, blade, drape, eggShape } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, cut, stroke, pair, all, halfBelow, halfAbove, repeatU, repeatV, label, kana,
  below, above, band, blob, blobs,
} from '../paint.js';

const MAKER = 'NEJIMAKI';
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ 1. Matchbox Firefly
export function match(S) {
  const CARD = 0xdccba2, LABEL = 0xf3e7c4, RED = 0xd4402e, INK = 0x2e3a52, STRIKE = 0x6c4a38, BUG = 0x302c34;
  const grit = STRIKE; // the striker: plain, with the scratches of a few matches (below)
  const moon = cut(circle(-6.5, 10, 4.4), circle(-4.6, 11.2, 3.9));
  const reeds = or(seg(5, -3, 6.5, 10, 0.5), seg(8, -3, 8.4, 13, 0.5), seg(10.6, -3, 12, 7, 0.5), ellipse(6.6, 11.2, 0.9, 2.2, -0.12), ellipse(8.5, 14.4, 0.9, 2.4), ellipse(12.2, 8.2, 0.9, 2.1, -0.15));
  const K = 1.3, d2 = (b, d) => (d - b < 2 ? 6.6 : 8.4); // (the tray's end walls are lower than its sides, so you can see in)
  S.at([0, 0, 0], null, () => {
    // the sleeve: the label on top, strikers down the sides
    S.paint(
      fill(LABEL), proj('top', stroke(rbox(0, 0, 13.4, 20.4, 1), 0.7, 0.6), RED), proj('top', stroke(rbox(0, 0, 12.2, 19.2, 0.6), 0.3, 0.3), RED),
      proj('top', moon, 0xf2c64a), proj('top', reeds, 0x4a6a4a), proj('top', circle(-1.5, 4, 2.6), 0xf6f0a8, { alpha: 0.6 }), proj('top', circle(-1.5, 4, 1.1), 0xbfdc3a),
      proj('top', or(circle(3, 14.5, 0.5), circle(-9.5, 2, 0.5), circle(-3.5, 15.6, 0.4)), 0xbfdc3a),
      proj('top', kana('ほたる印', 0, -7.6, 4.6), INK), proj('top', label('SAFETY MATCHES', 0, -13, 0.42), RED, { hard: true }), proj('top', label('45 STICKS', 0, -16.6, 0.36), INK, { hard: true }),
      proj('right', all, grit), proj('left', all, grit), proj('right', or(seg(-12, 9.6, -3, 5.4, 0.5), seg(2, 10.4, 9, 6.2, 0.45), seg(-4, 4.4, 4, 3.2, 0.4)), tint(STRIKE, 0.24)), proj('left', or(seg(-10, 8.6, -2, 5, 0.5), seg(4, 9.8, 12, 6.6, 0.45)), tint(STRIKE, 0.24)), proj('bottom', all, CARD), ...stamp(MAKER, { c: 0x8a7a5c }),
    );
    S.box(-15, 13, -22, 15, 14, 22); S.box(-15, 0, -22, 15, 1, 22); S.box(-15, 1, -22, -14, 13, 22); S.box(14, 1, -22, 15, 13, 22);
    S.rest = 0.62;
    S.joint('drawer', { slide: [0, 0, 25 * K], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
      S.paint(fill(CARD), proj('top', all, tint(CARD, 0.2)), under(0.2));
      S.box(-13.7, 1.2, -21, 13.7, 2, 21);
      for (const [a, b, c, d] of [[-13.7, -21, -12.9, 21], [12.9, -21, 13.7, 21], [-12.9, -21, 12.9, -20.2], [-12.9, 20.2, 12.9, 21]]) S.box(a, 2, b, c, d2(b, d), d);
      // three matches for company
      for (const [i, x] of [6.4, 9, 11.4].entries()) {
        S.paint(fill(0xead8a8), under(0.15));
        S.tube([[x, 3, -18.5 + i], [x, 3, 14 + i]], 0.95, { sides: 5 });
        S.paint(fill(RED, { rough: 0.5 }));
        S.ball([x, 3, 15.2 + i], [1.5, 1.5, 2], { segs: 6, rings: 4 });
      }
      // the firefly, tucked in: pillow, quilt, its lamp left on
      S.paint(fill(0xf5f2ea), under(0.15));
      S.ball([-3.2, 3.4, 15.6], [5.2, 1.8, 3.4], { segs: 8, rings: 4 });
      S.paint(fill(BUG), proj('top', seg(-3.2, 8, -3.2, -7, 0.4), tint(BUG, 0.22)), under(0.2));
      loaf(S, [-3.2, 5.6, 1.5], [4.9, 3.7, 10.5], { flat: 0.9 });
      S.paint(fill(0xd9f070, { rough: 0.3 }), vol(band(4.7, 5.3), 0xb9d44a), crown(0.2));
      S.ball([-3.2, 5.4, -9.6], [4.3, 3.4, 3.6], { segs: 8, rings: 6 });
      S.paint(fill(0xe8706c), proj('top', rbox(-3.2, -12.4, 0.8, 2.2, 0.6), BUG), under(0.18));
      S.ball([-3.2, 6.2, 12], [4.5, 3.5, 3.2], { segs: 8, rings: 5 });
      S.paint(fill(BUG), ...face({ at: [-3.2, 7.2], gap: 3, r: 0.75, eye: 'sleepy', mouth: null, col: 0xf2ece0 }), under(0.2));
      head(S, [-3.2, 6.6, 15.2], [3.1, 2.7, 2.8], { muzzle: 0.1, brow: 0.2, cheek: 0.1 });
      for (const s of [1, -1]) S.tube(spline([[-3.2 + s * 1.2, 8.6, 16.6], [-3.2 + s * 3.4, 10.4, 18.4], [-3.2 + s * 5.4, 9.6, 20.4]], 3), 0.32, { sides: 4 });
      const gingham = (x, y, z) => { const a = Math.floor((x + 40) / 2.2) % 2, b = Math.floor((z + 40) / 2.2) % 2; return a && b ? 0xd9544a : a || b ? 0xeea49a : 0xf8f0e6; };
      S.paint(fill(gingham), under(0.18));
      S.at([-3.2, 8.3, 0.5], [0, 0, 0.05], () => drape(S, -6.6, -7, 6.6, 7, 0, { nx: 7, nz: 6, th: 1.3, fold: (u, v) => 1.5 * Math.sin(u * Math.PI) ** 0.7 + 0.35 * Math.sin(v * 3.4 + 0.6) * Math.sin(u * Math.PI) - 2.6 * (Math.abs(u - 0.5) > 0.4 ? (Math.abs(u - 0.5) - 0.4) / 0.1 : 0) }));
    });
  }, K);
}

// ------------------------------------------------------------------ 2. Milk-Carton Calf
export function milk(S) {
  const WHITE = 0xf6f3ea, BLUE = 0x3f7fc6, GREEN = 0x7fbf6a, HIDE = 0xf8f5ee, SPOT = 0x3a3438, PINK = 0xf2b4ae;
  const hole = star(0, 31, 11.4, 11, 0.84, 0.3), hills = or(ellipse(-9, 9, 9, 5), ellipse(6, 8, 11, 6.5));
  const side = [
    proj('right', stroke(rbox(0, 27, 8.6, 9.6, 0.6), 0.4), BLUE), proj('right', repeatV(rbox(0, 0, 7.4, 0.2, 0), 2.6, 19, 35.4), BLUE), proj('right', label('500ML', 0, 39.4, 0.44), BLUE, { hard: true }),
    proj('left', circle(0, 30, 6.6), BLUE), proj('left', or(ellipse(-2, 32, 2.2, 1.6, 0.4), ellipse(2.4, 28.6, 2, 1.5, -0.3), circle(-2.6, 27.6, 1)), WHITE), proj('left', kana('まきば', 0, 18.6, 3.6), BLUE),
    proj('back', kana('牛乳', 0, 28, 8), BLUE), proj('back', label('KEEP COLD', 0, 18.6, 0.4), BLUE, { hard: true }),
  ];
  S.paint(
    fill(WHITE), vol(band(3, 11.6), BLUE), proj('front', and(hills, halfAbove(11.6)), GREEN), proj('back', and(hills, halfAbove(11.6)), GREEN),
    proj('front', kana('牛乳', 0, 7.5, 4.6), WHITE), proj('front', grow_(hole, 0.9), 0xe6e0d0), proj('front', hole, 0x2e3648), ...side, ...stamp(MAKER, { c: 0x9aa4b4, px: 0.4 }),
  );
  S.box(-13, 3, -13, 13, 44, 13, { bevel: 0.5 });
  // the gable and its sealed ridge
  S.paint(fill(WHITE), proj('front', label('OPEN', 0, 49.4, 0.44), BLUE, { hard: true }), proj('front', poly([[-2.2, 46.6], [2.2, 46.6], [0, 44.8]]), BLUE), proj('back', kana('あけぐち', 0, 48.4, 2.8), BLUE));
  S.loft([ring([0, 44, 0], 13, 13, 4, { pow: 60, a0: Math.PI / 4 }), ring([0, 54, 0], 13, 0.7, 4, { pow: 60, a0: Math.PI / 4 })], { caps: 'none' });
  S.paint(fill(WHITE), proj('front', label('99.04.12', 0, 56.2, 0.34), 0x6a6470, { hard: true }), shade(vol(band(54, 54.5)), 0.14));
  S.box(-13, 54, -0.7, 13, 58, 0.7);
  // hooves through the bottom, the tail through the back
  S.paint(fill(HIDE), vol(below(1.7), SPOT));
  for (const [x, z] of [[-7.6, 7.6], [7.6, 7.6], [-7.6, -7.6], [7.6, -7.6]]) S.cyl([x, 0, z], 2.7, 4, { segs: 8, bevel: 0.5 });
  S.paint(fill(HIDE), under(0.14));
  S.joint('tail', { pivot: [0, 20, -12.6], axis: 'z', min: -0.6, max: 0.6, rest: 0, idle: 0.25 }, () => {
    S.tube(spline([[0, 20, -12.6], [0, 17, -17.4], [1.6, 11, -18.6]], 3), 0.8, { sides: 6 });
    S.paint(fill(SPOT));
    S.loft(spline([[11.4, 0.6], [10, 1.5], [8.4, 1.4], [7.2, 0.2]], 2).map(([y, r]) => ring([1.8, y, -18.6], r, r, 6)));
  });
  S.rest = 1;
  S.joint('head', { slide: [0, 0, -13.5], min: 0, max: 1, rest: 0, g: [1, 0] }, () => {
    S.paint(fill(HIDE), vol(blobs(blob([-6.4, 35.6, 16.6], [4.4, 5, 5]), blob([7.4, 28.6, 14.6], [3.4, 3.6, 4])), SPOT), ...face({ at: [0, 33.6], gap: 8.4, r: 1.2, eye: 'dot', mouth: null }), under(0.14), crown(0.06));
    head(S, [0, 32, 15.4], [8.6, 7.6, 7], { muzzle: 0.1, brow: 0.35, cheek: 0.16, chin: 0.35 });
    S.paint(fill(PINK), proj('front', pair(ellipse(2, 29.6, 0.8, 1.15, 0.3)), 0xb9706e), proj('front', arc(0, 28.6, 2.4, Math.PI * 1.2, Math.PI * 1.8, 0.5), 0xb9706e), under(0.16));
    head(S, [0, 28.9, 19.4], [5.6, 3.9, 4.6], { muzzle: 0.85, brow: 0, cheek: 0.12, chin: 0, pow: 2.6 });
    for (const s of [1, -1]) {
      S.paint(fill(s > 0 ? HIDE : SPOT), proj('front', ellipse(0, 3.2, 1.1, 2.2), PINK));
      S.at([s * 7.6, 35.6, 14.4], [0, 0, -s * 1.3], () => blade(S, 6.8, 4.6, 1.6, { shape: 'leaf', cup: 0.7 }));
      S.paint(fill(0xe9dcc0), under(0.2));
      S.tube(spline([[s * 4.4, 38.2, 14.6], [s * 5.6, 40.2, 14.4], [s * 5.2, 42.2, 14.6]], 3), (t) => 1.4 - 1.2 * t, { sides: 6 });
    }
    S.paint(fill(HIDE));
    S.ball([0, 39.6, 15.6], [2.4, 1.8, 2], { segs: 6, rings: 4 });
  });
}
function grow_(s, r) { return { d: (u, v) => s.d(u, v) - r, b: s.b ? [s.b[0] - r, s.b[1] - r, s.b[2] + r, s.b[3] + r] : null }; }

// ------------------------------------------------------------------ 3. Tissue-Box Sheep
export function tissue(S) {
  const MINT = 0xbfe4d6, PINK = 0xf2a4b4, WOOL = 0xf8f6f0, FACE = 0x4c444c;
  const daisy = (x0, y0) => [or(...[0, 1, 2, 3, 4].map((k) => circle(x0 + Math.cos(k * 1.257) * 1.5, y0 + Math.sin(k * 1.257) * 1.5, 1))), circle(x0, y0, 0.8)];
  const daisies = (view, pts) => pts.flatMap(([x, y]) => { const [p, c] = daisy(x, y); return [proj(view, p, 0xffffff), proj(view, c, 0xf2c84a)]; });
  S.paint(
    fill(MINT), vol(band(4, 7.6), PINK), vol(band(7.6, 8.2), 0xffffff),
    ...daisies('front', [[-16, 19], [-6, 21.5], [13, 12], [17, 21], [5, 22]]), ...daisies('back', [[-14, 13], [-4, 20], [9, 13.6], [16, 21]]), ...daisies('right', [[-4, 13], [4, 20]]), ...daisies('left', [[-4, 20], [4, 13]]),
    proj('front', kana('ふわふわ', -7, 13.4, 4.6), 0xd9607c), proj('front', label('200 SHEETS', -7, 9.8, 0.36), 0x5a8a7a, { hard: true }),
    proj('top', ellipse(0, 0, 14.4, 6.4), 0xffffff), proj('top', ellipse(0, 0, 13, 5.2), 0x7a9a90), ...stamp(MAKER, { c: 0x7a9a90 }),
  );
  S.box(-22, 4, -12, 22, 26, 12, { bevel: 0.7 });
  S.paint(fill(0x3a3438), under(0.2));
  for (const [x, z] of [[-15, 7], [15, 7], [-15, -7], [15, -7]]) S.cyl([x, 0, z], [1.8, 2.3], 4.4, { segs: 8 });
  S.paint(fill(WOOL));
  S.ball([0, 14, -12.6], [2.6, 2.6, 2], { segs: 6, rings: 4 });
  // the wool: the next tissue, coming up
  S.part('wool', { rest: 0, move: (t) => swell([0, 26, 0], 1 - 0.1 * t, 1 + 0.42 * t, 1 - 0.1 * t) }, () => {
    const folds = [proj('front', or(arc(-6, 36, 7, 0.3, 1.3, 0.5), arc(7, 33, 6, 1.9, 2.9, 0.5), arc(0, 44, 5, 3.6, 5, 0.5), arc(-8, 28, 4, 0.2, 1.4, 0.5)), tone(WOOL, 0.14)), proj('back', or(arc(-4, 36, 8, 0.4, 1.6, 0.5), arc(6, 31, 6, 1.7, 2.9, 0.5), arc(1, 43, 5, 3.4, 5.2, 0.5)), tone(WOOL, 0.14))];
    S.paint(fill(WOOL), ...folds, under(0.12));
    S.ball([0, 34, 0], [10.6, 9.6, 7.6], { segs: 12, rings: 7 });
    S.ball([-7.4, 30.6, 0.8], [6.6, 6, 6], { segs: 10, rings: 6 });
    S.ball([7.8, 31, -0.6], [6.3, 5.8, 5.8], { segs: 10, rings: 6 });
    S.ball([1, 42.4, -0.4], [6.2, 5.2, 5.2], { segs: 10, rings: 6 });
    S.ball([-5, 39.6, -1], [4.6, 4.2, 4.4], { segs: 8, rings: 5 });
    S.paint(fill(FACE), ...face({ at: [0, 34.2], gap: 5.6, r: 1.1, eye: 'sleepy', mouth: null, col: 0xf6f2ea }), proj('front', or(seg(0, 32.2, 0, 31.4, 0.5), arc(-0.8, 31.2, 0.8, Math.PI, Math.PI * 2, 0.45), arc(0.8, 31.2, 0.8, Math.PI, Math.PI * 2, 0.45)), 0xe89aa4), under(0.16));
    head(S, [0, 33.4, 5.6], [5.6, 5.2, 4.4], { muzzle: 0.45, brow: 0.25, cheek: 0.18, chin: 0.1 });
    for (const s of [1, -1]) {
      S.paint(fill(FACE), proj('front', ellipse(0, 2.6, 0.9, 1.9), 0xe8a4ac));
      S.at([s * 4.8, 35.8, 6], [0, 0, -s * 1.85], () => blade(S, 5.8, 3.6, 1.5, { shape: 'leaf', cup: 0.5 }));
    }
  });
}

// ------------------------------------------------------------------ 4. Egg-Pack Chicks
export function egg(S) {
  const PULP = 0xd9d2c0, SHELL = 0xf7f2e8, BROWN = 0xdcae84, CHICK = 0xf8d44c, BEAK = 0xf2903a;
  const cups = []; for (const z of [6.6, -6.6]) for (const x of [-13.2, 0, 13.2]) cups.push([x, z]);
  S.paint(fill(PULP), under(0.18), crown(0.08), shade(vol(below(1.2)), 0.12), ...stamp(MAKER, { c: 0x8a8272 }));
  S.box(-21, 0, -14.4, 21, 5, 14.4, { bevel: 1.6 });
  for (const [x, z] of cups) S.lathe([[6.2, 4], [6.7, 11], [5.7, 11], [4.9, 6.4]], { segs: 10, at: [x, 0, z] });
  const eggAt = (x, z, c, extra = []) => { S.paint(fill(c, { rough: 0.45 }), ...extra, under(0.12), crown(0.1)); eggShape(S, [x, 7, z], 5, 13.4); };
  // back row: a brown one, one with a face drawn on in marker, a white one
  eggAt(-13.2, -6.6, BROWN, [vol(blobs(blob([-15, 16, -2.4], 0.5), blob([-11.4, 13, -2], 0.4), blob([-13.6, 11.4, -1.8], 0.45)), tone(BROWN, 0.25))]);
  eggAt(0, -6.6, SHELL, [...face({ at: [0, 15], gap: 3.6, r: 0.6, eye: 'dot', mouth: null, col: 0x3a4a8a }), proj('front', poly([[-0.9, 13.4], [0.9, 13.4], [0, 12.2]]), 0x3a4a8a)]);
  eggAt(13.2, -6.6, SHELL);
  // front row: one keeping quiet, one on its way out, one that is out and regrets it
  eggAt(-13.2, 6.6, SHELL, [proj('front', or(seg(-15.4, 15.4, -14, 14.2, 0.35), seg(-14, 14.2, -13, 15.6, 0.35), seg(-13, 15.6, -11.8, 14.6, 0.35)), 0xb9ae9c)]);
  S.paint(fill(SHELL), vol(band(13.4, 14.1), 0xd9cfbc), under(0.12));
  eggShape(S, [0, 7, 6.6], 5, 13.4, { v1: 0.5 });
  S.paint(fill(CHICK), ...face({ at: [0, 17.6], gap: 4, r: 0.8, eye: 'dot', mouth: null }), under(0.14));
  head(S, [0, 17, 6.4], [4.4, 4.2, 4.2], { muzzle: 0.1, brow: 0.25, cheek: 0.3, chin: 0.2 });
  S.paint(fill(BEAK), under(0.2));
  S.at([0, 16.2, 10.4], [Math.PI / 2, 0, 0], () => S.cone([0, 0, 0], 1.1, 1.9, { segs: 5 }));
  S.paint(fill(SHELL), under(0.14));
  S.joint('cap', { pivot: [-2.6, 19.4, 6.2], axis: 'z', min: -0.5, max: 0.3, rest: 0, idle: 0.1 }, () => S.at([0.6, 13.2, 6.2], [-0.25, 0, -0.3], () => eggShape(S, [0, -6.4, 0], 5, 13.4, { v0: 0.74 })));
  S.paint(fill(CHICK), ...face({ at: [13.2, 15.4], gap: 4.4, r: 0.85, eye: 'line', mouth: null }), proj('front', pair_(13.2, seg(1.2, 17.6, 3.4, 16.9, 0.45)), EYE), under(0.14), crown(0.08));
  torso(S, [13.2, 14.4, 6.6], [4.9, 5, 4.8], { belly: 0.14, hips: 1.04, sit: 0.4 });
  S.paint(fill(BEAK), under(0.2));
  S.at([13.2, 13.9, 11], [Math.PI / 2, 0, 0], () => S.cone([0, 0, 0], 1.2, 2, { segs: 5 }));
  S.paint(fill(tone(CHICK, 0.1)));
  for (const s of [1, -1]) S.at([13.2 + s * 4.6, 15.6, 6.8], [0, 0, Math.PI + s * 0.3], () => S.at([0, 0, 0], [0, Math.PI / 2, 0], () => blade(S, 4.4, 3.8, 1.2, { shape: 'wing' })));
  for (const a of [-0.4, 0.3]) S.tube([[13.2, 19.2, 6.4], [13.2 + a * 3, 21.4, 6.2]], 0.3, { sides: 4 });
  S.paint(fill(SHELL));
  for (const [x, z, r] of [[9.6, 10.6, 0.3], [16.6, 10.2, -0.4], [15.4, 2.6, 0.9]]) S.at([x, 11.4, z], [0.3, r, 0.5], () => S.box(-1.2, 0, -0.9, 1.2, 0.5, 0.9));
  // the lid: clear, with the shop's label on it
  S.rest = 0.56;
  S.joint('lid', { pivot: [0, 11, -14.4], axis: 'x', min: -2, max: 0, rest: 0, g: [0, -1.95] }, () => {
    S.clear(true);
    S.paint(fill(0xe4f1f2));
    S.loft([[11, 21, 14.4], [18, 20.6, 14], [22.6, 18.6, 11.8], [24.6, 14.5, 8]].map(([y, rx, rz]) => ring([0, y, 0], rx, rz, 12, { pow: 5 })), { caps: 'end' });
    S.box(-4, 10.2, 14.2, 4, 11.4, 16.4, { bevel: 0.3 });
    S.clear(false);
    S.paint(fill(0xf8f4ea), proj('top', stroke(rbox(0, 0, 9.4, 5.4, 0.8), 0.8, 0.5), 0xd9412f), proj('top', kana('たまご', 0, 1, 4), 0xd9412f), proj('top', label('6 PACK', 0, -3.2, 0.36), 0x5a5460, { hard: true }));
    S.box(-10, 24.5, -6, 10, 24.9, 6);
  });
}
// (a shape mirrored about u = x0 instead of 0)
function pair_(x0, s) { return { d: (u, v) => s.d(Math.abs(u - x0), v), b: null }; }

// ------------------------------------------------------------------ 5. Tin Pencil-Case Dachshund
export function kanpen(S) {
  const DOG = 0xa9572f, DARK = tone(DOG, 0.3), TIN = 0xcdd2d8, TEAL = 0x3f9a9a, CREAM = 0xf3ead2, RED = 0xd4402e;
  const stripes = [proj('front', rbox(0, 9, 31, 0.5, 0), CREAM), proj('front', rbox(0, 7.9, 31, 0.3, 0), TEAL), proj('back', rbox(0, 9, 31, 0.5, 0), CREAM), proj('back', rbox(0, 7.9, 31, 0.3, 0), TEAL)];
  // the tin: enamel outside, bare inside
  S.paint(fill(DOG), ...stripes, proj('front', label('NAGAINU', -12, 10.8, 0.36), CREAM, { hard: true }), proj('top', all, TIN, { rough: 0.3 }), proj('bottom', all, DOG), under(0.2), ...stamp(MAKER, { c: 0x6a3418 }));
  S.box(-30, 6, -10, 30, 7.2, 10);
  for (const [a, b, c, d, v] of [[-30, 9, 30, 10, 'back'], [-30, -10, 30, -9, 'front'], [-30, -9, -29, 9, 'right'], [29, -9, 30, 9, 'left']]) {
    S.paint(fill(DOG), ...stripes, proj('front', label('NAGAINU', -12, 10.8, 0.36), CREAM, { hard: true }), proj(v, all, TIN, { rough: 0.3 }), proj('top', all, TIN));
    S.box(a, 7.2, b, c, 12, d);
  }
  // what it carries: three pencils, a rubber, a sharpener, a ruler
  for (const [z, c, x0] of [[-6, 0xf2c23a, -24], [-3, 0x4f9a5a, -22], [0, RED, -25]]) {
    S.paint(fill(c), proj('top', repeatU(rbox(0, -z, 0.2, 1.4, 0), 9), tone(c, 0.2)), under(0.2));
    S.tube([[x0, 8.6, z], [x0 + 40, 8.6, z]], 1.35, { sides: 6, caps: false });
    S.paint(fill(0xe9cf9c));
    S.tube([[x0 + 40, 8.6, z], [x0 + 44, 8.6, z]], [1.35, 0.35], { sides: 6 });
    S.paint(fill(0x3a3438));
    S.tube([[x0 + 44, 8.6, z], [x0 + 45.2, 8.6, z]], [0.35, 0], { sides: 6 });
    S.paint(fill(0xe8a4a4));
    S.tube([[x0 - 2, 8.6, z], [x0, 8.6, z]], 1.35, { sides: 6 });
  }
  S.paint(fill(0xf8f6f0), vol(band_x(14.4, 21.6), 0x5fa86a), proj('top', star(18, -5.8, 1.5), 0xf8f6f0), under(0.16));
  S.box(13, 7.2, 3.4, 25, 10.6, 8.2, { bevel: 0.5 });
  S.paint(fill(RED), proj('top', rbox(-24, -5.8, 1.2, 1, 0.2), 0x3a3438), under(0.18));
  S.box(-27, 7.2, 3.6, -21, 10.2, 8, { bevel: 0.4 });
  S.clear(true);
  S.paint(fill(0x9ad4a4));
  S.box(-18, 7.3, 4.2, 10, 8, 7.6);
  S.clear(false);
  // the dog at either end of it
  S.paint(fill(DOG), under(0.18));
  for (const [x, z] of [[-21, 6], [21, 6], [-21, -6], [21, -6]]) { S.lathe(spline([[2.3, 1.6], [2.2, 3], [2.6, 4.8], [3, 6.2]], 2), { segs: 8, at: [x, 0, z], cap: false }); paw(S, [x, 0, z + 1.4], 5.6, 7.2, 3.2, { toes: 3 }); }
  S.joint('tail', { pivot: [-30, 10.4, 0], axis: 'y', min: -0.7, max: 0.7, rest: 0, idle: 0.4 }, () => S.tube(spline([[-30, 10.4, 0], [-35.4, 12.4, 0], [-38.6, 17.4, 0.4], [-38, 22, 0.8]], 3), (t) => lerp(1.5, 0.5, t), { sides: 6 }));
  S.paint(fill(0x3f6fb8), proj('right', circle(0, 9.4, 1.2), 0xe6c04a), under(0.16));
  S.at([30.6, 11, 0.4], [0, 0, Math.PI / 2 - 0.25], () => S.torus([0, 0, 0], 4.6, 1.1, { segs: 10, sides: 5 }));
  S.joint('head', { pivot: [31, 12, 0.5], axis: 'y', min: -0.7, max: 0.5, rest: 0, idle: 0.07 }, () => S.at([34.5, 14.4, 1.4], [0, 0.95, 0], () => {
    S.paint(fill(DOG), vol(blob([0, -3.4, 6], [3.4, 2.6, 4]), tint(DOG, 0.34)), ...face({ at: [0, 1.5], gap: 6.2, r: 1.15, eye: 'bead', mouth: null }), proj('front', pair(ellipse(3.1, 3.9, 0.9, 0.6, 0.3)), tint(DOG, 0.4)), under(0.16), crown(0.06));
    head(S, [0, 0, 0], [5.9, 5.6, 6], { muzzle: 0.15, brow: 0.55, cheek: 0.1, chin: 0.3 });
    S.paint(fill(tint(DOG, 0.14)), proj('front', or(seg(0, -1.6, 0, -2.8, 0.45), arc(-1.3, -2.6, 1.3, Math.PI * 1.1, Math.PI * 2, 0.45), arc(1.3, -2.6, 1.3, Math.PI, Math.PI * 1.9, 0.45)), DARK), under(0.18));
    head(S, [0, -1.5, 6], [3.3, 3, 5.2], { muzzle: 0.9, brow: 0, cheek: 0.05, chin: 0.1 });
    S.paint(fill(0x3a3034, { rough: 0.2 }));
    S.ball([0, -0.7, 10.7], [1.4, 1.15, 1], { segs: 6, rings: 4 });
    S.paint(fill(DARK), under(0.2));
    for (const s of [1, -1]) S.at([s * 5.5, 3, -0.8], [0.1, 0, Math.PI + s * 0.12], () => S.at([0, 0, 0], [0, Math.PI / 2, 0], () => blade(S, 11, 7, 1.9, { shape: 'round', cup: 0.9 })));
  }));
  // the lid: racing stripes outside, last term's timetable inside
  S.rest = 0.4;
  S.joint('lid', { pivot: [0, 12, -10], axis: 'x', min: -2.1, max: 0, rest: 0, g: [0, -2.05] }, () => {
    const grid = and(rbox(0, 0, 26, 7, 0), or(repeatU(rbox(0, 0, 0.18, 8, 0), 7.4), repeatV(rbox(0, 0, 30, 0.18, 0), 2.8)));
    S.paint(
      fill(DOG), proj('top', rbox(0, 0, 30.5, 2.2, 0), CREAM), proj('top', rbox(0, 3.4, 30.5, 0.5, 0), TEAL), proj('top', rbox(0, -3.4, 30.5, 0.5, 0), RED),
      proj('top', rbox(-12, 0, 13, 4.6, 1.2), DOG), proj('top', stroke(rbox(-12, 0, 13, 4.6, 1.2), 0.5, 0.4), CREAM), proj('top', kana('ながいぬ', -12, 0.4, 5.2), CREAM),
      proj('top', label('SUPER LONG', 16, -6.6, 0.36), CREAM, { hard: true }), proj('top', star(22, 5.8, 1.8), 0xf2c23a), proj('top', star(26, 5.8, 1.1), 0xf2c23a),
      ...stripes.map((l) => l), proj('bottom', rbox(0, 0, 27.4, 8.2, 0.6), CREAM), proj('bottom', grid, 0x9a9488), proj('bottom', rbox(0, 5.8, 26, 1.3, 0), 0xe8b4a4), under(0.0),
    );
    S.box(-30, 12, -10, 30, 15.6, 10, { bevel: 1.2 });
  });
}
function band_x(x0, x1) { const f = (x) => Math.max(x0 - x, x - x1); f.box = [x0, -1e4, -1e4, x1, 1e4, 1e4]; return f; }

// ------------------------------------------------------------------ 6. The Biscuit Tin (secret)
export function kan(S) {
  const NAVY = 0x2c4a86, GOLD = 0xe2c26a, CREAM = 0xf3ead2, INSIDE = 0xd9cc9c, MOUSE = 0xbdb8bc, PINK = 0xf2b0b4;
  const fleur = repeatU(or(circle(0, 8, 1.1), circle(-1.5, 6.6, 0.8), circle(1.5, 6.6, 0.8), seg(0, 6.6, 0, 4.6, 0.5)), 6.9);
  S.paint(fill(NAVY), vol(band(1.6, 2.2), GOLD), vol(band(12.6, 13.2), GOLD), wrap(21, fleur, CREAM), wrap(21, label('BUTTER BISCUITS', 0, 10.8, 0.4), GOLD, { hard: true }), under(0.18), proj('bottom', all, 0xb9bcc4), ...stamp(MAKER, { c: 0x6a6e78 }));
  S.lathe([[20.4, 0], [21, 1], [21, 15], [20.2, 15.6]], { segs: 16, cap: 'bottom' });
  S.paint(fill(INSIDE, { rough: 0.35 }), shade(vol(below(6)), 0.1));
  S.lathe([[20.2, 15.6], [19.6, 15.4], [19.4, 2], [0, 2]], { segs: 16, cap: false });
  // what is in it: reels of thread, a pincushion, buttons, a tape measure over the side
  const spool = (x, z, c) => {
    S.paint(fill(0xd9b888), vol(band(3.1, 6.1), c), shade(wrap(3.6, repeatV(rbox(0, 0, 30, 0.14, 0), 0.75, 3.1, 6.1)), 0.14));
    S.lathe([[4.1, 2], [4.1, 3.1], [3.5, 3.1], [3.5, 6.1], [4.1, 6.1], [4.1, 7.2], [1.2, 7.2], [1.2, 6.6]], { segs: 10, at: [x, 0, z] });
  };
  spool(10.4, 5.6, 0xd9482e); spool(9.6, -7.4, 0x3f7fc6); spool(-12.4, -5.6, 0xf2c23a);
  S.paint(fill(0xd9482e), proj('top', star(9.6, 7.4, 2.6, 6, 0.4), 0x5f9a4a), under(0.16));
  S.ball([9.6, 10, -7.4], [3.9, 3, 3.9], { segs: 10, rings: 6 });
  for (const [dx, dz, c] of [[-1.4, 0.6, 0xf2c23a], [1.2, -1, 0xf6f2ea], [0.4, 1.6, 0x3f7fc6]]) {
    S.paint(fill(0xc9ced4, { rough: 0.3 }));
    S.tube([[9.6 + dx, 11.6, -7.4 + dz], [9.6 + dx * 2.2, 15.4, -7.4 + dz * 2.2]], 0.22, { sides: 4 });
    S.paint(fill(c));
    S.ball([9.6 + dx * 2.2, 15.6, -7.4 + dz * 2.2], 0.65, { segs: 5, rings: 3 });
  }
  for (const [x, z, c, r] of [[-12, 8.6, 0xe8706c, 2.2], [-6.6, 13.4, 0xf6f2ea, 1.7], [1.4, 14.6, 0x6fae8a, 1.9], [-15.4, 2.4, 0x3a3438, 1.5]]) {
    S.paint(fill(c), proj('top', or(circle(x - 0.5, -z, 0.3), circle(x + 0.5, -z, 0.3)), tone(c, 0.4)), proj('top', stroke(circle(x, -z, r), 0.35, 0.4), tone(c, 0.18)));
    S.cyl([x, 2, z], r, 0.7, { segs: 8 });
  }
  S.paint(fill(0xf2d04a), proj('right', repeatV(rbox(0, 0, 0.5, 0.12, 0), 1.1), 0x3a3438), proj('top', repeatU(rbox(0, 0, 0.12, 0.6, 0), 1.1), 0x3a3438), under(0.14));
  S.tube(spline([[4, 2.6, 13.6], [12, 6, 12.6], [20.6, 16.3, 8.6], [23.4, 12, 7.4], [23.2, 2, 6.6]], 4), 1, { sides: 4, flat: [1.6, 0.3] });
  // the tailor
  S.joint('mouse', { slide: [0, 8.6, 0], min: -1, max: 0, rest: 0, g: [-1, 0] }, () => {
    S.paint(fill(MOUSE), vol(blob([-2, 9.6, 6.4], [3.4, 4, 2.6]), tint(MOUSE, 0.4)), under(0.16));
    torso(S, [-2, 10.6, 2], [5.2, 5.6, 4.8], { belly: 0.2, hips: 1.06, sit: 0.36 });
    S.joint('head', { pivot: [-2, 16, 2.4], axis: 'z', min: -0.3, max: 0.3, rest: 0, idle: 0.08 }, () => S.at([-2, 19.6, 3], null, () => {
      S.paint(fill(MOUSE), ...face({ at: [0, 0.8], gap: 5, r: 1.05, eye: 'bead', mouth: null }), proj('front', pair(or(seg(2.2, -1.7, 5.6, -1.2, 0.3), seg(2.2, -2.4, 5.4, -3, 0.3))), 0x7a747c), under(0.14), crown(0.08));
      head(S, [0, 0, 0], [5, 4.5, 4.9], { muzzle: 0.8, brow: 0.2, cheek: 0.1, chin: 0.1, pow: 2.1 });
      S.paint(fill(PINK, { rough: 0.3 }));
      S.ball([0, -1.4, 4.9], [0.95, 0.8, 0.8], { segs: 6, rings: 4 });
      for (const s of [1, -1]) {
        S.paint(fill(MOUSE), proj('front', ellipse(0, 3.4, 2.2, 2.5), PINK));
        S.at([s * 3.2, 2.2, -0.6], [0, 0, -s * 0.55], () => blade(S, 6.4, 7, 1, { shape: 'round', cup: 0.9 }));
      }
    }));
    S.paint(fill(MOUSE), under(0.16));
    S.tube(spline([[2, 12.6, 3.4], [4, 13.4, 6], [3, 14.6, 7.6]], 2), 1.1, { sides: 6 });
    S.joint('arm', { pivot: [-6, 12.6, 3.4], axis: 'x', min: -0.5, max: 0.4, rest: 0, idle: 0.14 }, () => {
      S.tube(spline([[-6, 12.6, 3.4], [-8.6, 15, 5.4], [-9.4, 18.4, 6]], 2), 1.1, { sides: 6 });
      S.paint(fill(0xcfd4da, { rough: 0.2 }));
      S.tube([[-9.6, 16.6, 6.2], [-9.2, 27.4, 6.4]], [0.42, 0.12], { sides: 6 });
    });
    S.paint(fill(0xd9482e));
    S.tube(spline([[-9.5, 19.6, 6.3], [-6.4, 16.6, 7.6], [-1, 14.4, 8.2], [3, 14.6, 7.8]], 3), 0.28, { sides: 4, caps: false });
    S.paint(fill(PINK));
    S.tube(spline([[-2, 6.6, -2.4], [3, 4, -5.4], [6.4, 3.4, -2.4]], 3), (t) => lerp(0.7, 0.3, t), { sides: 4 });
  });
  // the lid, lifted
  S.part('lid', { rest: 0.45, move: (t) => chain(slide(0, 15 * t, -5 * t), hinge([0, 17, -21], 'x', -0.95 * t)) }, () => {
    const scallop = star(0, 0, 12.4, 16, 0.86, 0);
    S.paint(
      fill(NAVY), proj('top', stroke(circle(0, 0, 18.6), 0.7), GOLD), proj('top', stroke(circle(0, 0, 16.8), 0.35), GOLD), proj('top', scallop, CREAM), proj('top', stroke(scallop, 0.5, 0.9), GOLD),
      proj('top', label('BISCUITS', 0, 3.4, 0.6), NAVY, { hard: true }), proj('top', kana('ビスケット', 0, -2.8, 3.2), 0xb9483a), proj('top', or(circle(-9, 0.4, 0.6), circle(9, 0.4, 0.6)), GOLD),
      vol(band(15.9, 16.5), GOLD), proj('bottom', all, INSIDE), under(0.0),
    );
    S.lathe([[21.7, 15.2], [21.7, 17.7], [20.7, 18.7], [0, 19.2]], { segs: 16, cap: false });
    S.paint(fill(INSIDE, { rough: 0.35 }));
    S.lathe([[0, 18.6], [20.4, 18.2], [21.1, 17.6], [21.1, 15.2], [21.7, 15.2]], { segs: 16, cap: false });
  });
}

void wrap; void shade; void mix; void above; void halfBelow; void cut; void hinge; void slide; void loaf; void paw;
