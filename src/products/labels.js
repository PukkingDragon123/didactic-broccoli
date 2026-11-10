// Every drink's label, front and back, set with the studio kit: a kana / kanji wordmark first (romaji small under it,
// as on a real 1999 Japanese can), the brand's mascot in one of its poses, a picture of what's inside, a burst
// (新発売 / 果汁10% / 無果汁), and on the back the 品名 box, あき缶はくずかごへ, the material mark, a JAN code and the price.
//   paintFront(id) -> Px (one half of the wrap)     paintBack(id) -> Px     paintWrap(id) -> Px (front | back)
// Panel sizes come from the container (src/products/spec.js). All brands, names of makers and mascots are invented.
import { Px, dk, lt, on, mix } from './px.js';
import { m5, m3, mk, bold, shear, arc, wave, x2, label, join } from './type.js';
import { MASCOTS } from './mascots.js';
import { ART } from './art.js';
import { PAT, burst, roundel, ribbon, pill, seal, infoBox, barcode, recycle, binNote, price, wrapJP } from './print.js';
import { BRANDS, DRINKS, janOf } from './brands.js';
import { CONT, panelSize } from './spec.js';
import { FOODS } from '../needs/foods.js';
import { framed } from './photos.js';

const INK = 0x2e1f28, W0 = 0xfffaf0, RED = 0xc8302a, GOLD = 0xe8c040;
const memo = new Map();
/** A mascot sprite (cached): spr('puku', 'blow', { col }), big(...) = twice the size, smoothed. */
export function spr(name, pose, o) { const k = name + '|' + pose + '|' + JSON.stringify(o || 0); if (!memo.has(k)) memo.set(k, MASCOTS[name](pose, o)); return memo.get(k); }
export function big(name, pose, o) { const k = '2x' + name + '|' + pose + '|' + JSON.stringify(o || 0); if (!memo.has(k)) memo.set(k, spr(name, pose, o).x2()); return memo.get(k); }
const art = (name, ...a) => { const k = 'art' + name + JSON.stringify(a); if (!memo.has(k)) memo.set(k, ART[name](...a)); return memo.get(k); };

/** A real photo of the thing in a round (or square) window, or the drawing if the photo is not there. */
const pic = (name, w, h, alt, o = {}) => framed(name, w, h, { shape: o.rect ? 'rect' : 'circle', ...o }) || alt();
/** Bubbles rising through a fizzy drink: each one placed by hand (x, y, radius) for a 208 x 220 can; flip mirrors them. */
const FIZZ = [[18, 196, 4], [34, 150, 2], [12, 96, 3], [30, 44, 2], [58, 208, 2], [96, 182, 3], [150, 204, 2], [188, 168, 4], [198, 96, 2], [176, 40, 3], [120, 20, 2], [70, 14, 3], [196, 14, 2], [8, 20, 2]];
function fizz(p, c, flip = false, sx = 1, sy = 1) { for (const [x, y, r] of FIZZ) { const bx = Math.round((flip ? 208 - x : x) * sx), by = Math.round(y * sy); p.ring(bx, by, r, r, 1, c); p.set(bx - 1, by - 1, 0xfffaf0); } }
const K = (s, z = 16) => mk(s, z), KB = (s) => bold(mk(s, 16)), K2 = (s) => x2(bold(mk(s, 16))), K4 = (s) => x2(x2(bold(mk(s, 16))));
const put = (p, m, cx, y, c, out, sh, ow) => label(p, m, cx, y, { c, out, sh, ow, align: 'c' });
/** A sprite with its bottom-centre at (cx, by). */
const at = (p, s, cx, by, flip) => p.blit(s, Math.round(cx - s.w / 2), by - s.h, { flip });
/** The maker's name in a small tag (top of most fronts). */
function brandTag(p, b, cx, y, o = {}) { return pill(p, cx, y, K(b.jp, 12), { c: o.c ?? b.paper, text: o.text ?? b.ink, ink: o.ink ?? b.ink, align: 'c', pad: 10, padY: 3 }); }
/** A band across the label with a romaji line (and the contents at the right). */
function foot(p, c, y, h, col, text, tc, right) {
  p.rect(0, y, c.W, h, col);
  const m = m5(text); const fits = m.w <= c.W - 12 - (right ? m5(right).w + 8 : 0);
  label(p, fits ? m : m3(text), right ? 6 : c.cx, y + Math.round((h - (fits ? 7 : 5)) / 2), { c: tc, align: right ? 'l' : 'c' });
  if (right) label(p, m5(right), c.W - 6, y + Math.round((h - 7) / 2), { c: tc, align: 'r' });
}
const juice = (n) => (n > 0 ? [K('果汁', 12), m5(n + '%', 2)] : [K('無果汁', 12)]);

const F = {};
// ============================================================ 番長珈琲 (190 g cans, 168 x 184)
F.vd_bancho = (p, c) => {
  const { W, H, cx, b } = c, BK = 0x1e1c22, CREAM = 0xf4ead2;
  p.fill(PAT.stripes(BK, 0x282530, 4, 'd'));
  p.rect(0, 0, W, 4, GOLD); p.rect(0, 6, W, 1, GOLD);
  brandTag(p, b, cx, 12, { c: GOLD, text: BK, ink: BK });
  put(p, K4('番長'), cx, 34, CREAM, BK, [4, 4, RED], 2);
  ribbon(p, cx - 42, 104, 84, 20, KB('ブラック'), { c: RED, text: CREAM, ink: 0x0c0a0e });
  at(p, spr('bancho', 'cross'), cx, 174);
  seal(p, 10, 132, '無糖', { c: RED, paper: CREAM, size: 12 });
  at(p, pic('beans', 44, 44, () => art('beans'), { ink: 0x0c0a0e, line: GOLD }), W - 30, 172);
  pill(p, W - 30, 112, K('深煎', 12), { c: GOLD, text: BK, ink: BK, align: 'c', pad: 6, padY: 2 });
  foot(p, c, H - 12, 12, GOLD, 'BANCHO BLACK', BK, '190G');
};
F.vd_morning = (p, c) => {
  const { W, H, cx, b } = c, CR = 0xf6e8c8, BR = 0x6a3a1e;
  p.fill(CR);
  p.rect(0, 0, W, 134, PAT.rays(0xf8c848, 0xf08a2a, cx, 134, 14));
  p.ell(cx, 134, 50, 50, 0xfff0a0); p.ell(cx, 134, 44, 44, 0xffd23f);
  p.rect(0, 134, W, H - 134, CR); p.rect(0, 134, W, 3, BR); p.rect(0, 139, W, 1, BR);
  brandTag(p, b, cx, 6);
  put(p, K4('朝'), cx, 24, BR, W0, [3, 3, 0xe0443a], 2);
  put(p, shear(K2('ショット'), 0.2), cx, 92, W0, BR, [2, 2, BR], 2);
  at(p, spr('bancho', 'thumb'), cx + 44, 172);
  burst(p, 34, 150, 23, [K('ミルク', 12), K('入り', 12)], { c: W0, text: 0xc8302a, ink: BR, n: 14 });
  foot(p, c, H - 12, 12, BR, 'MORNING SHOT', CR, '190G');
};
F.vd_maxsweet = (p, c) => {
  const { W, H, cx, b } = c, Y = 0xf4c81a, BR = 0x5a3018;
  p.fill(Y);
  const zig = (y) => { for (let x = 0; x < W; x++) { const d = Math.abs((x % 16) - 8); p.rect(x, y + d, 1, 6, BR); } };
  zig(22); zig(H - 42);
  brandTag(p, b, cx, 5);
  put(p, K2('マキシマム'), cx, 40, BR, W0, [2, 2, 0xe0443a], 2);
  p.ell(48, 114, 31, 31, BR); p.ell(48, 114, 28, 28, RED); p.ring(48, 114, 25, 25, 1, 0xf8a8a0);
  put(p, K4('甘'), 49, 82, W0, BR, null, 1);
  at(p, spr('bancho', 'cup'), cx + 38, 148);
  ribbon(p, cx - 50, 150, 100, 18, K('練乳たっぷり', 12), { c: W0, text: RED, ink: BR });
  foot(p, c, H - 12, 12, BR, 'MAXIMUM SWEET', Y, '190G');
};
F.vd_aulait = (p, c) => {
  const { W, H, cx, b } = c, CR = 0xf6ecd6, BR = 0x7a4a26, LB = 0xc89a6a;
  p.fill(LB);
  p.shape(0, 0, W, H, (x, y) => y < 96 + Math.sin(x * 0.075) * 9, CR);
  p.shape(0, 0, W, H, (x, y) => { const t = 96 + Math.sin(x * 0.075) * 9; return y >= t && y < t + 3; }, W0);
  brandTag(p, b, cx, 6);
  put(p, K2('カフェオレ'), cx, 28, BR, W0, [2, 2, 0xe8b070], 2);
  put(p, m5('CAFE AU LAIT'), cx, 68, BR);
  at(p, pic('coffee', 62, 62, () => art('cup', 0xc8946a, RED, { steam: W0, milk: true })), 46, 164);
  at(p, spr('bancho', 'cup'), cx + 40, 168);
  pill(p, 10, 76, K('ミルクたっぷり', 12), { c: 0x3a8ae0, text: W0, ink: BR });
  foot(p, c, H - 12, 12, BR, 'HOT OR COLD', CR, '190G');
};
F.vd_cocoa = (p, c) => {
  const { W, H, cx, b } = c, DB = 0x4a2618, CR = 0xf0d8a8;
  p.fill(PAT.dots(DB, 0x5c3220, 12, 2.4));
  p.rect(0, 30, W, 50, CR); p.rect(0, 30, W, 2, RED); p.rect(0, 78, W, 2, RED);
  brandTag(p, b, cx, 8, { c: CR, text: DB, ink: 0x1e0e08 });
  put(p, K2('ココア'), cx, 38, DB, null, [2, 2, 0xe8a070]);
  at(p, art('cocoa'), 46, 150);
  at(p, spr('bancho', 'cup'), cx + 40, 168);
  burst(p, W - 30, 104, 20, [K('ミルク', 12)], { c: W0, text: RED, ink: 0x1e0e08 });
  foot(p, c, H - 12, 12, CR, 'MILK COCOA', DB, '190G');
};

// ============================================================ ちゃこ園 (PET labels, 208 x 136)
function teaLabel(p, c, o) {
  const { W, H, b } = c;
  p.fill(o.bg);
  if (o.pat) p.rect(0, 0, W, H, o.pat);
  // the name down the left in big brush-weight kanji on a paper slip
  const m = x2(x2(mk(o.v, 16, { vert: true })));
  const sw = m.w + 12;
  p.rect(8, 0, sw, H, o.slip ?? b.paper); p.rect(8, 0, 2, H, o.rule ?? o.ink); p.rect(8 + sw - 2, 0, 2, H, o.rule ?? o.ink);
  p.mask(m, 8 + Math.round((sw - m.w) / 2), Math.round((H - m.h) / 2), o.ink);
  return 8 + sw;
}
F.vd_ocha = (p, c) => {
  const { W, H, b } = c, G = 0x3a8a3a;
  const x0 = teaLabel(p, c, { bg: G, pat: PAT.seigaiha(G, 0x46a046, 12), v: 'お茶', ink: 0x14361a });
  const mx = x0 + (W - x0) / 2;
  at(p, spr('chako', 'stand'), mx + 16, H - 16);
  // "はい！" in a balloon
  p.rrect(x0 + 8, 8, 62, 26, 8, 0x14361a); p.rrect(x0 + 10, 10, 58, 22, 7, W0); p.poly([[x0 + 54, 30], [x0 + 64, 44], [x0 + 62, 30]], W0); p.line(x0 + 54, 32, x0 + 64, 44, 0x14361a, 1); p.line(x0 + 64, 44, x0 + 63, 32, 0x14361a, 1);
  label(p, KB('はい！'), x0 + 39, 13, { c: RED, align: 'c' });
  at(p, pic('teafield', 54, 38, () => art('leaves'), { rect: true, fy: 0.7 }), x0 + 32, H - 18);
  seal(p, W - 24, 8, '無糖', { c: RED, paper: W0, size: 12 });
  foot(p, c, H - 14, 14, b.paper, 'HAI! OCHA', 0x14361a, '500ML');
};
F.vd_mugi = (p, c) => {
  const { W, H, b } = c, T = 0xb8742a;
  const x0 = teaLabel(p, c, { bg: T, pat: PAT.stripes(T, 0xc4803a, 6, 'd'), v: '麦茶', ink: 0x3a2008, slip: 0xf4e4b0 });
  const mx = x0 + (W - x0) / 2;
  at(p, pic('wheat', 50, 44, () => art('barley'), { rect: true }), x0 + 32, H - 18);
  at(p, spr('chako', 'leaf'), mx + 22, H - 16);
  pill(p, mx, 8, K('ノンカフェイン', 12), { c: 0xf4e4b0, text: 0x3a2008, ink: 0x3a2008, align: 'c' });
  foot(p, c, H - 14, 14, 0xf4e4b0, 'MUGICHA', 0x3a2008, '500ML');
};
F.vd_jasmine = (p, c) => {
  const { W, H, cx, b } = c, Y = 0xe8e4b8, G = 0x4a8a5a;
  p.fill(Y); p.rect(0, 0, W, 6, G); p.rect(0, 8, W, 1, G);
  put(p, K2('ジャスミン茶'), cx, 14, G, W0, [2, 2, 0xb8c890], 2);
  put(p, m5('JASMINE TEA'), cx, 54, 0x2a4a2a);
  at(p, pic('teacup', 50, 50, () => art('jasmine')), 46, H - 16);
  at(p, spr('chako', 'sip'), cx + 30, H - 15);
  seal(p, W - 26, 66, '茉莉花', { c: RED, paper: W0, size: 12, cols: 1 });
  brandTag(p, b, 40, 66, { c: W0 });
  foot(p, c, H - 14, 14, G, 'CHAKO-EN', Y, '500ML');
};
F.vd_milktea = (p, c) => {
  const { W, H, cx, b } = c, BU = 0x8a2a3a, CR = 0xf0e0c4, GD = 0xd8b060;
  p.fill(CR);
  p.rect(0, 0, W, 54, BU); p.rect(0, 54, W, 2, GD); p.rect(0, 58, W, 1, GD); p.rect(0, 3, W, 1, GD);
  put(p, K2('午後遅い紅茶'), cx, 12, CR, null, [2, 2, 0x4a1420]);
  put(p, m5('LATE AFTERNOON TEA'), cx, 64, BU);
  at(p, art('teacup'), 52, H - 16);
  at(p, spr('chako', 'sip'), cx + 44, H - 15);
  pill(p, cx - 8, 78, K('ミルクティー', 12), { c: GD, text: 0x4a1420, ink: 0x4a1420, align: 'c' });
  foot(p, c, H - 14, 14, BU, 'CHAKO-EN', CR, '500ML');
};

// ============================================================ プクポップ (350 ml cans 208 x 220, one PET, one 250)
function popBrand(p, c, y = 6) { const b = c.b; put(p, shear(KB(b.jp), 0.25), c.cx, y, 0xffd23f, 0x14285a, null, 1); }
F.vd_melon = (p, c) => {
  const { W, H, cx, d } = c, G = 0x3ac850, DG = 0x0a5a1e;
  p.fill(G); fizz(p, 0x8aec98);
  popBrand(p, c);
  put(p, shear(K4('メロン'), 0.12), cx, 28, W0, DG, [4, 4, DG], 2);
  put(p, shear(K2('ソーダ'), 0.2), cx + 36, 96, 0xff6f91, W0, [2, 2, DG], 2);
  at(p, pic('melon', 84, 84, () => art('melon')), 52, H - 20);
  at(p, big('puku', 'float', { col: 0x58c06c, fin: 0xff8aa8 }), cx + 46, H - 18);
  burst(p, 38, 112, 24, juice(d.juice), { c: 0xffd23f, text: RED, ink: DG });
  foot(p, c, H - 14, 14, DG, 'MELON SODA', W0, '350ML');
};
F.vd_kora = (p, c) => {
  const { W, H, cx } = c, R = 0xd02a2a, BK = 0x1e1418;
  p.fill(R);
  p.shape(0, 0, W, H, (x, y) => { const t = 118 + Math.sin(x * 0.06 + 1) * 12; return y > t && y < t + 26; }, W0);
  p.shape(0, 0, W, H, (x, y) => { const t = 148 + Math.sin(x * 0.06 + 1) * 12; return y > t && y < t + 3; }, W0);
  popBrand(p, c);
  put(p, arc(K4('コーラ'), 8), cx, 26, W0, BK, [4, 4, BK], 2);
  put(p, m5('KORA KOLA', 2), cx, 104, BK, W0);
  at(p, art('glass', 0x4a1e14), 44, H - 18);
  at(p, big('puku', 'pop'), cx + 42, H - 18);
  pill(p, 12, 12, K('強炭酸', 12), { c: BK, text: 0xffd23f, ink: W0 });
  foot(p, c, H - 14, 14, BK, 'THE OTHER COLA', W0, '350ML');
};
F.vd_grape = (p, c) => {
  const { W, H, cx, d } = c, PU = 0x6a2a9a, Y = 0xf4d030;
  p.fill(PU); fizz(p, 0x9a5aca, true);
  p.rect(0, 100, W, 30, Y); p.rect(0, 98, W, 2, 0x58c06c); p.rect(0, 130, W, 2, 0x58c06c);
  popBrand(p, c);
  put(p, shear(K2('ファント'), 0.2), cx - 20, 26, Y, 0x2a0a4a, [3, 3, 0x2a0a4a], 2);
  put(p, shear(K2('グレープ'), 0.2), cx + 14, 62, W0, 0x2a0a4a, [3, 3, 0x2a0a4a], 2);
  put(p, m5('FANTO GRAPE', 2), cx, 108, 0x2a0a4a);
  at(p, pic('grapes', 78, 78, () => art('grapes')), 46, H - 18);
  at(p, big('puku', 'blow', { col: 0x9a5ad8 }), cx + 44, H - 18);
  burst(p, W - 32, 152, 22, juice(d.juice), { c: W0, text: RED, ink: 0x2a0a4a });
  foot(p, c, H - 14, 14, 0x2a0a4a, 'PUKU POP', Y, '350ML');
};
F.vd_cclemon = (p, c) => {
  const { W, H, cx, d } = c, Y = 0xf8e040, G = 0x3aa04a;
  p.fill(PAT.rays(Y, 0xfbec78, cx, H + 20, 18));
  p.rect(0, 0, W, 5, G); p.rect(0, 7, W, 1, G);
  const t = join(m5('CC', 4), K2('レモネード'), 4);
  put(p, t, cx, 12, G, W0, [2, 2, 0x3a4a08], 2);
  at(p, pic('lemon', 58, 58, () => art('lemon')), 40, H - 17);
  at(p, spr('puku', 'float', { col: 0xf0b820, fin: 0x58c06c }), cx + 18, H - 16);
  burst(p, W - 40, 86, 34, [K('レモン', 12), m5('70', 2), K('個分のC', 12)], { c: W0, text: RED, ink: 0x3a4a08, n: 16 });
  foot(p, c, H - 14, 14, G, 'VITAMIN LEMONADE', W0, '500ML');
  void d;
};
F.vd_ramunecan = (p, c) => {
  const { W, H, cx, d } = c, LB = 0x8ad8f0, B = 0x2a6ad8;
  p.fill(PAT.waves(LB, 0xa4e4f6, 30, 4, 14));
  popBrand(p, c);
  put(p, K4('ラムネ'), cx, 28, B, W0, [4, 4, 0x0a2a6a], 3);
  ribbon(p, cx - 54, 102, 108, 20, K('なつかしの味', 12), { c: RED, text: W0, ink: 0x0a2a6a });
  at(p, art('marble'), 46, H - 20);
  at(p, big('puku', 'blow'), cx + 44, H - 18);
  seal(p, W - 30, 132, '缶', { c: B, paper: W0, size: 16 });
  burst(p, 30, 140, 22, [K('新発売', 12)], { c: 0xffd23f, text: RED, ink: 0x0a2a6a, n: 14 });
  foot(p, c, H - 14, 14, 0x0a2a6a, 'RAMUNE SODA', W0, '350ML');
  void d;
};
F.vd_cider = (p, c) => {
  const { W, H, cx } = c, SV = 0xf4f8f8, G = 0x2a8a4a, B = 0x1a5ad0;
  p.fill(SV);
  fizz(p, 0xb8dcec, false, 168 / 208, 242 / 220);
  p.rect(0, 0, W, 8, G); p.rect(0, 10, W, 2, B); p.rect(0, H - 34, W, 2, B);
  put(p, shear(KB('プクポップ'), 0.25), cx, 18, B, null);
  put(p, K2('ミッツ'), cx, 44, G, W0, [3, 3, 0x0a3a1a], 2);
  put(p, K2('サイダー'), cx, 82, B, W0, [3, 3, 0x0a2a6a], 2);
  at(p, art('bubbles', 3), 44, 196);
  at(p, spr('puku', 'float'), cx + 34, 200);
  pill(p, cx, 122, K('すっきり透明', 12), { c: G, text: W0, ink: 0x0a3a1a, align: 'c' });
  foot(p, c, H - 14, 14, G, 'MITTSU CIDER', W0, '250ML');
};

// ============================================================ モーベル牧場
F.vd_karupiko = (p, c) => {
  const { W, H, cx, b } = c, B = 0x2a5ad8;
  p.fill(PAT.raw.dots(0xf8f8f4, 0x9ac8f8, 16, 4));
  p.rect(0, 0, W, 5, B);
  put(p, K2('カルピコ'), cx - 26, 12, B, W0, [2, 2, 0x9ac8f8], 2);
  put(p, KB('ウォーター'), cx - 26, 50, B, W0, null, 1);
  at(p, art('splash'), 58, H - 16);
  at(p, spr('momo', 'drink'), W - 38, H - 16);
  pill(p, 10, 72, K('乳酸菌飲料', 12), { c: B, text: W0, ink: 0x0a2a6a });
  brandTag(p, b, 46, 96);
  foot(p, c, H - 14, 14, B, 'KARUPIKO WATER', W0, '500ML');
};
F.vd_warmmilk = (p, c) => {
  const { W, H, cx, b } = c, NV = 0x24346e, CR = 0xf8f4e8;
  p.fill(NV);
  for (const [x, y] of [[14, 20], [150, 14], [128, 60], [22, 76], [156, 96], [60, 12], [98, 40], [12, 116]]) { p.rect(x, y - 1, 1, 3, 0xffe070); p.rect(x - 1, y, 3, 1, 0xffe070); }
  p.shape(0, 100, W, 84, (x, y) => y > 122 - Math.cos((x - cx) * 0.035) * 14, CR);
  at(p, art('moon'), W - 34, 62);
  brandTag(p, b, cx, 6);
  put(p, K2('ホット'), cx - 22, 28, CR, null, [2, 2, 0x0a1438]);
  put(p, K2('ミルク'), cx + 4, 64, 0xffe070, null, [2, 2, 0x0a1438]);
  at(p, spr('momo', 'sleep'), cx - 22, 170);
  pill(p, cx + 40, 132, K('はちみつ', 12), { c: 0xf4c040, text: 0x3a2408, ink: NV, align: 'c' });
  put(p, K('入り', 12), cx + 40, 152, NV);
  foot(p, c, H - 12, 12, 0x4a8ad8, 'HOT MILK', CR, '190G');
};

// ============================================================ ナミノリ
F.vd_ponkari = (p, c) => {
  const { W, H, cx, b } = c, B = 0x1a5ad0;
  p.fill(0xf4f8fc);
  p.shape(0, 0, W, H, (x, y) => { const t = x * 0.5 + y; return t > 150 && t < 190; }, B);
  p.shape(0, 0, W, H, (x, y) => { const t = x * 0.5 + y; return (t > 142 && t < 146) || (t > 194 && t < 198); }, 0x5aa8f0);
  put(p, shear(K2('ポンカリ'), 0.25), cx - 22, 10, B, W0, [2, 2, 0x5aa8f0], 2);
  put(p, shear(K2('スエット'), 0.25), cx + 2, 46, B, W0, [2, 2, 0x5aa8f0], 2);
  at(p, spr('shizuku', 'run'), W - 34, H - 16);
  pill(p, 10, 86, K('水分ほきゅう', 12), { c: RED, text: W0, ink: 0x0a2a6a });
  brandTag(p, b, 34, 106, { c: W0 });
  foot(p, c, H - 14, 14, 0x0a2a6a, 'PONKARI SWEAT', W0, '500ML');
};
F.vd_aquaria = (p, c) => {
  const { W, H, cx, b } = c, LB = 0x9ad8f8, B = 0x1e6ae0;
  p.fill(PAT.halftone(LB, 0xc4eafc, 30, 30, 150, 8));
  p.rect(0, 0, W, 4, B);
  put(p, arc(K2('アクアリア'), 5), cx, 10, W0, B, [3, 3, 0x0a2a5a], 2);
  put(p, m5('AQUARIA', 2), cx, 54, 0x0a2a5a, W0);
  at(p, pic('grapefruit', 50, 50, () => art('citrus')), 40, H - 16);
  at(p, spr('shizuku', 'flex'), cx + 14, H - 15);
  burst(p, W - 32, 96, 26, [K('ハイドロ', 12), K('パワー', 12)], { c: 0xffd23f, text: B, ink: 0x0a2a5a });
  foot(p, c, H - 14, 14, B, 'SPORTS DRINK', W0, '500ML');
  void b;
};
F.vd_water = (p, c) => {
  const { W, H, cx, b } = c, PB = 0xd8eef8, B = 0x2a6ad8;
  p.fill(PAT.fade(0xbfe2f6, PB, 0, 70));
  at(p, pic('fuji', 96, 44, () => art('mountain'), { rect: true, n: 10 }), cx + 2, 114);
  p.rect(0, 112, W, H - 112, 0xf4fafc); p.rect(0, 112, W, 2, 0x2a7a4a);
  put(p, K4('天然水'), cx, 4, B, W0, [3, 3, 0x9ad0f0], 2);
  label(p, K('奥ノ山の', 12), 6, 76, { c: 0x14306a }); label(p, K('しみず', 12), 6, 90, { c: 0x14306a });
  seal(p, W - 28, 74, '軟水', { c: B, paper: W0, size: 12 });
  at(p, spr('shizuku', 'cheer'), W - 62, H - 15);
  brandTag(p, b, 34, 104, { c: W0 });
  foot(p, c, H - 14, 14, B, 'TENNEN WATER', W0, '500ML');
};

// ============================================================ ゲンキン製薬 (little brown bottles, 120 x 90)
const peekTop = (name, pose, h) => { const m = spr(name, pose); return m.sub(0, 0, m.w, h); };
F.vd_realbold = (p, c) => {
  const { W, H } = c, G = 0xe8b830;
  p.fill(PAT.rays(G, 0xf0c848, 92, 70, 12)); p.rect(0, 0, W, 4, RED); p.rect(0, H - 4, W, 4, RED); p.frame(3, 7, W - 6, H - 14, 0x8a5a10);
  label(p, KB('リアル'), 8, 11, { c: 0x2a1004, out: W0 });
  label(p, KB('ボールド'), 8, 31, { c: RED, out: W0 });
  at(p, peekTop('kokekko', 'flex', 40), W - 28, H - 7);
  seal(p, 8, 54, '元気', { c: RED, paper: W0, size: 12, cols: 2 });
  label(p, m3('REAL BOLD'), 42, 60, { c: 0x2a1004 }); label(p, m3('120ML'), 42, 68, { c: 0x2a1004 });
};
F.vd_lipovita = (p, c) => {
  const { W, H } = c, B = 0x2a6ad8;
  p.fill(0xf4f0e8); p.rect(0, 0, W, 16, B); p.rect(0, H - 6, W, 6, B); p.rect(0, 18, W, 1, RED);
  label(p, K('ゲンキン製薬', 12), W / 2, 2, { c: W0, align: 'c' });
  label(p, KB('リポビタ'), 5, 24, { c: 0x101e5a });
  label(p, m5('Z', 3), 76, 22, { c: RED, out: 0x101e5a });
  at(p, peekTop('kokekko', 'crow', 38), W - 24, H - 6);
  label(p, K('めざめの', 12), 5, 46, { c: 0x101e5a }); label(p, K('一本！', 12), 5, 60, { c: RED });
  label(p, m3('100ML'), 5, 76, { c: 0x101e5a });
};
F.vd_kurozu = (p, c) => {
  const { W, H } = c, BK = 0x1a1414, G = 0xc8a050;
  p.fill(BK); p.frame(2, 2, W - 4, H - 4, G); p.frame(4, 4, W - 8, H - 8, 0x6a5020);
  label(p, K2('黒酢'), 9, 9, { c: G });
  label(p, K('はちみつ入り', 12), 9, 46, { c: 0xf4e4c0 });
  label(p, m3('KUROZU 120ML'), 26, 68, { c: G });
  at(p, art('crock'), W - 24, H - 8);
  seal(p, 8, 62, '健', { c: RED, paper: 0xf4e4c0, size: 12 });
};

// ============================================================ ホーホー酒造
function sakeMark(p, x, y, alc) { p.rrect(x, y, 34, 18, 3, W0); p.frame(x, y, 34, 18, INK); label(p, K('お酒', 12), x + 17, y + 3, { c: RED, align: 'c' }); if (alc !== undefined) label(p, m3('ALC.' + alc + '%'), x + 17, y + 21, { c: INK, align: 'c' }); }
F.vd_morio = (p, c) => {
  const { W, H, cx, b, d } = c, GD = 0xd8a830, NV = 0x1e2a6a, CR = 0xf4f0e0;
  p.fill(PAT.stripes(GD, 0xe2b848, 3, 'v'));
  p.rect(0, 84, W, 44, NV); p.rect(0, 82, W, 2, CR); p.rect(0, 128, W, 2, CR);
  brandTag(p, b, cx, 6, { c: CR });
  p.ell(cx, 50, 30, 30, NV); p.ell(cx, 50, 27, 27, CR); p.ring(cx, 50, 24, 24, 1, GD);
  put(p, K4('生'), cx + 1, 18, NV);
  put(p, K2('杜王ドラフト'), cx, 90, CR, null, [2, 2, 0x0a1038]);
  at(p, pic('wheat', 58, 58, () => art('hops')), 60, H - 16);
  at(p, big('fukuro', 'mug'), cx + 48, H - 18);
  sakeMark(p, 6, 134, d.alc);
  foot(p, c, H - 14, 14, NV, 'MORIO DRAFT BEER', CR, '350ML');
};
F.vd_dryy = (p, c) => {
  const { W, H, cx, b, d } = c, SV = 0xc8ccd2, BK = 0x1a1a1e;
  p.fill(PAT.stripes(SV, 0xd6dae0, 2, 'h'));
  p.rect(0, 0, W, 6, BK); p.rect(0, 8, W, 2, RED);
  p.shape(0, 0, W, H, (x, y) => { const t = y - x * 0.35; return t > 84 && t < 112; }, BK);
  p.shape(0, 0, W, H, (x, y) => { const t = y - x * 0.35; return (t > 80 && t < 82) || (t > 114 && t < 116); }, RED);
  put(p, K4('辛口'), cx, 16, BK, W0, [3, 3, RED], 2);
  put(p, shear(KB('スーパードライイ'), 0.3), cx, 96, W0, null);
  at(p, big('fukuro', 'wink'), cx + 40, H - 18);
  put(p, m5('SUPER', 2), 44, 140, BK); put(p, m5('DRYY', 3), 44, 158, RED, BK);
  sakeMark(p, 10, 184, undefined);
  brandTag(p, b, 44, 122, { c: W0 });
  foot(p, c, H - 14, 14, BK, 'KARAKUCHI BEER', SV, '350ML');
  void d;
};
F.vd_strong = (p, c) => {
  const { W, H, cx, b, d } = c, SV = 0xdde2e6, BK = 0x1e1e22, Y = 0xf8d830;
  p.fill(SV);
  p.rect(0, 0, W, H, PAT.halftone(SV, Y, cx, 250, 150, 8));
  p.shape(0, 0, W, H, (x, y) => { const t = y + x * 0.4; return t > 60 && t < 104; }, BK);
  brandTag(p, b, cx, 8, { c: W0 });
  put(p, shear(K2('ストロング'), 0.2), cx, 36, Y, null, [2, 2, 0x0a0a0c]);
  put(p, K4('零'), 50, 104, BK, null, [3, 3, Y]);
  put(p, m5('9%', 7), cx + 46, 118, RED, W0, [3, 3, BK], 2);
  put(p, K('レモン', 12), cx + 46, 174, BK);
  at(p, pic('lemon', 72, 72, () => art('lemon')), 54, 254);
  at(p, big('fukuro', 'wink'), cx + 46, 282);
  sakeMark(p, 10, 258, undefined);
  foot(p, c, H - 14, 14, BK, 'STRONG NOUGHT CHU-HI', Y, '500ML');
  void d;
};
F.vd_highball = (p, c) => {
  const { W, H, cx, b, d } = c, AM = 0xe8a040, BK = 0x1e1418, CR = 0xf4ead2;
  p.fill(AM); fizz(p, 0xf6c878, true);
  p.rect(0, 0, W, 26, BK); p.rect(0, 26, W, 2, CR);
  put(p, K(b.jp, 12), cx, 7, CR);
  put(p, K2('ハイボール'), cx, 38, BK, CR, [3, 3, 0x8a4a10], 2);
  put(p, m5('WHISKY & SODA'), cx, 80, BK);
  at(p, pic('whisky', 70, 70, () => art('tumbler')), 46, H - 20);
  at(p, big('fukuro', 'mug'), cx + 44, H - 18);
  sakeMark(p, 8, 96, d.alc);
  foot(p, c, H - 14, 14, BK, 'HIGHBALL', CR, '350ML');
};
F.vd_onecup = (p, c) => {
  const { W, H, cx, b, d } = c, B = 0x1e4aa8, CR = 0xf4f0e0;
  p.fill(B); p.rect(0, 0, W, 3, CR); p.rect(0, H - 3, W, 3, CR); p.rect(0, 5, W, 1, CR); p.rect(0, H - 6, W, 1, CR);
  put(p, K2('ワンカップ'), cx + 8, 12, CR, null, [2, 2, 0x0a1e5a]);
  put(p, m5('ONE KAPPU'), cx + 8, 50, 0x9ac0f8);
  seal(p, 10, 12, '清酒', { c: RED, paper: CR, size: 16 });
  at(p, spr('fukuro', 'doze'), W - 34, H - 8);
  at(p, pic('sake', 58, 40, () => art('sake'), { rect: true }), 60, H - 9);
  label(p, K(b.jp, 12), cx + 6, 64, { c: CR, align: 'c' });
  label(p, m3('ALC.' + d.alc + '%  180ML'), cx + 6, 82, { c: CR, align: 'c' });
};
F.vd_ume = (p, c) => {
  const { W, H, cx, b, d } = c, PK = 0xf4a8b8, BU = 0x8a2a3a;
  p.fill(PAT.dots(PK, 0xf8c0cc, 14, 3));
  p.rect(0, 0, W, 6, BU); p.rect(0, H - 40, W, 2, BU);
  brandTag(p, b, cx, 12, { c: W0, text: BU, ink: BU });
  put(p, K4('梅酒'), cx, 36, BU, null, [3, 3, W0]);
  put(p, K2('ソーダ'), cx, 106, W0, BU, null, 2);
  at(p, pic('plum', 66, 66, () => art('plum')), cx - 26, 196);
  at(p, spr('fukuro', 'wink'), cx + 46, 198);
  sakeMark(p, 8, 204, d.alc);
  foot(p, c, H - 14, 14, BU, 'UMESHU SODA', W0, '250ML');
};
F.vd_nonal = (p, c) => {
  const { W, H, cx, b } = c, B = 0x2a6ad8, CR = 0xf4f0e0, GD = 0xd8a830;
  p.fill(B); p.rect(0, 0, W, H, PAT.stripes(B, 0x3276e0, 6, 'e'));
  p.rect(0, 70, W, 46, CR); p.rect(0, 68, W, 2, GD); p.rect(0, 116, W, 2, GD);
  brandTag(p, b, cx, 6, { c: CR });
  put(p, K2('ノンアル'), cx, 30, CR, null, [3, 3, 0x0a2a6a]);
  put(p, m5('0.00%', 4), cx, 79, RED, null, [2, 2, 0x0a2a6a]);
  at(p, big('fukuro', 'doze'), cx + 40, H - 18);
  pill(p, 8, 126, K('ビールテイスト', 12), { c: GD, text: 0x1e1408, ink: 0x0a2a6a });
  label(p, K('アルコール', 12), 12, 152, { c: CR }); label(p, K('ゼロっぽい', 12), 12, 168, { c: CR });
  foot(p, c, H - 14, 14, 0x0a2a6a, 'ZERO-ISH', CR, '350ML');
};

// ============================================================ ほこほこ堂
F.vd_cornsoup = (p, c) => {
  const { W, H, cx, b } = c, Y = 0xf8d830, G = 0x2a8a3a;
  p.fill(PAT.checks(Y, 0xfbe058, 10));
  p.rect(0, 0, W, 22, G); p.rect(0, 22, W, 2, W0);
  put(p, K(b.jp, 12), cx, 5, W0);
  put(p, K2('コーン'), cx - 24, 30, G, W0, [2, 2, 0x2a3a10], 2);
  put(p, K2('スープ'), cx + 20, 64, RED, W0, [2, 2, 0x2a3a10], 2);
  at(p, pic('cornsoup', 58, 58, () => art('corn')), 38, 170);
  at(p, spr('nabe', 'ladle'), cx + 30, 172);
  burst(p, W - 30, 44, 20, [K('つぶ', 12), K('入り', 12)], { c: W0, text: RED, ink: 0x2a3a10 });
  foot(p, c, H - 12, 12, G, 'CORN POTAGE', W0, '190G');
};
F.vd_shiruko = (p, c) => {
  const { W, H, cx, b } = c, MR = 0x7a1e2a, CR = 0xf4ead2;
  p.fill(PAT.seigaiha(MR, 0x8a2836, 12));
  p.rrect(14, 26, W - 28, 48, 6, CR); p.frame(17, 29, W - 34, 42, 0xd8a040);
  brandTag(p, b, cx, 6, { c: CR });
  put(p, K2('おしるこ'), cx, 34, MR, null, [2, 2, 0xd8a040]);
  at(p, art('shiruko'), 46, 170);
  at(p, spr('nabe', 'steam'), cx + 34, 172);
  seal(p, 12, 84, 'つぶあん', { c: RED, paper: CR, size: 12 });
  foot(p, c, H - 12, 12, CR, 'OSHIRUKO', MR, '190G');
};
F.vd_oden = (p, c) => {
  const { W, H, cx, b } = c, CR = 0xf4ead2, BR = 0x8a5a2a;
  p.fill(CR); p.rect(0, 0, W, H, PAT.stripes(CR, 0xeedfc0, 8, 'v'));
  p.rect(0, 0, W, 30, RED); p.rect(0, 30, W, 3, BR);
  put(p, KB(b.jp), cx, 7, CR);
  put(p, K4('おでん'), cx, 44, RED, W0, [4, 4, 0x3a1408], 3);
  ribbon(p, cx - 50, 122, 100, 20, K('だし自慢', 12), { c: BR, text: CR, ink: 0x3a1408 });
  at(p, pic('oden', 92, 92, () => art('oden').x2()), 54, 288);
  at(p, big('nabe', 'steam'), cx + 42, 282);
  burst(p, W - 34, 168, 26, [K('牛すじ', 12), K('入り', 12)], { c: 0xffd23f, text: RED, ink: 0x3a1408 });
  foot(p, c, H - 14, 14, RED, 'ODEN IN A CAN', CR, '280G');
};

// ============================================================ 謎商会
F.vd_natto = (p, c) => {
  const { W, H, cx, b } = c, T = 0xb08a3a, BK = 0x1e1a14, CR = 0xf4ead2;
  p.fill(T);
  p.rect(0, 92, W, 40, BK);
  brandTag(p, b, cx, 6, { c: CR, text: BK, ink: BK });
  put(p, K4('納豆'), cx, 24, CR, null, [3, 3, BK]);
  put(p, K2('コーラ'), cx, 96, T, null);
  at(p, art('natto'), 44, H - 20);
  at(p, big('nazo', 'shrug'), cx + 44, H - 18);
  pill(p, 8, 138, K('ねばねば', 12), { c: CR, text: RED, ink: BK });
  foot(p, c, H - 14, 14, BK, 'NATTO COLA', CR, '350ML');
};
F.vd_mystery = (p, c) => {
  const { W, H, cx } = c;
  p.fill(0xf6f6f2);
  put(p, m5('?', 14), cx, 36, 0x1e1e1e);
  put(p, K('なぞのドリンク', 12), cx, 150, 0x1e1e1e);
  p.rect(cx - 30, 168, 60, 1, 0xc8302a);
  at(p, spr('nazo', 'peek'), cx, H - 2);
};
F.vd_peppo = (p, c) => {
  const { W, H, cx, b } = c, MR = 0x6a1420, CR = 0xf4ead2, BK = 0x1e1418;
  p.fill(PAT.diamonds(MR, 0x7a1c2a, 16, 20));
  p.rect(0, 0, W, 5, CR); p.rect(0, 7, W, 1, CR);
  put(p, KB('ミスター'), cx, 12, CR);
  put(p, K4('ペッポ'), cx, 30, CR, BK, [4, 4, BK], 2);
  at(p, MASCOTS.peppo().x2(), cx + 40, H - 18);
  burst(p, 42, 142, 30, [K('ふしぎな', 12), m5('23', 2), K('の味', 12)], { c: 0xffd23f, text: MR, ink: BK, n: 16 });
  brandTag(p, b, 44, 184, { c: CR, text: BK, ink: BK });
  foot(p, c, H - 14, 14, BK, 'Mr. PEPPO', CR, '350ML');
};

// ============================================================ ガチャラムネ (the glass bottle's paper label, 176 x 120)
F.ramune = (p, c) => {
  const { W, H, cx, d } = c, B = 0x2a6ad8;
  p.fill(W0); p.rect(0, 0, W, H, PAT.waves(W0, 0xd8f0fa, 26, 3, 12));
  p.frame(2, 2, W - 4, H - 4, B, 2); p.frame(6, 6, W - 12, H - 12, RED);
  put(p, K2('ラムネ'), cx, 14, B, W0, [2, 2, 0x8ad8f0], 2);
  put(p, K('ガチャ鉱泉所', 12), cx, 52, 0x14285a);
  at(p, art('marble'), 36, H - 12);
  at(p, spr('puku', 'blow'), cx + 40, H - 10);
  burst(p, cx - 4, 90, 18, juice(d.juice), { c: 0xffd23f, text: RED, ink: 0x14285a });
};

// ------------------------------------------------------------------ the back: small print
const POSE3 = { bancho: 'thumb', puku: 'pop', chako: 'leaf', momo: 'wave', shizuku: 'cheer', kokekko: 'point', fukuro: 'wink', nabe: 'bow', nazo: 'float' };
/** The back half of a drink's wrap. */
export function paintBack(id) {
  const d = DRINKS[id], b = BRANDS[d.brand], f = FOODS[id] || {}, [W, H] = panelSize(d.cont), cont = CONT[d.cont];
  const p = new Px(W, H), paper = d.backPaper ?? b.paper, ink = d.backInk ?? b.ink;
  p.fill(paper);
  const jan = janOf(d.brand, d.item);
  const date = cont.kind === 'can' ? '缶底に記載' : cont.kind === 'pet' ? 'キャップに記載' : 'ラベルに記載';
  if (W < 140) {
    // a little bottle's label: the box and the code, nothing else fits
    const y = infoBox(p, 3, 3, W - 6, [['品名', d.kind], ['内容量', d.vol], ['製造者', b.maker]], { ink, paper: lt(paper, 0.5), size: 10, lh: 12, max: H - 30 });
    barcode(p, Math.round((W - 113) / 2), Math.max(y, H - 29), jan, { h: 13 });
    return p;
  }
  const m = 6, tall = cont.kind === 'can', wide = W >= 200;
  // the maker's strip
  const sh = tall && H >= 200 ? 24 : tall ? 18 : 14;
  p.rect(0, 0, W, sh, b.main); p.rect(0, sh, W, 2, b.accent);
  label(p, sh >= 24 ? bold(mk(b.jp, 16)) : mk(b.jp, 12), m + 2, sh >= 24 ? 4 : sh >= 18 ? 3 : 1, { c: on(b.main) });
  label(p, m3(b.en), W - m - 2, Math.round(sh / 2) - 2, { c: on(b.main), align: 'r' });
  // the bottom block: the code, the price
  const bh = H >= 200 ? 20 : 14, yb = H - bh - 16, priceLine = !wide && f.price;
  barcode(p, m, yb, jan, { h: bh });
  if (f.price && wide) {
    const px = m + 113 + 5;
    label(p, mk('希望小売価格', 10), px, yb, { c: ink });
    const pm = m5('¥' + f.price, 2);
    label(p, pm, px, yb + 12, { c: RED });
    label(p, mk('税別', 10), px + pm.w + 3, yb + 16, { c: ink });
  } else if (priceLine) {
    const yl = yb - 13;
    label(p, mk('希望小売価格', 10), m, yl, { c: ink });
    label(p, m5('¥' + f.price), m + 64, yl + 2, { c: RED });
    label(p, mk('（税別）', 10), m + 64 + m5('¥' + f.price).w + 2, yl, { c: ink });
  }
  const lim = (priceLine ? yb - 15 : yb - 2);
  // the 品名 box (the date row goes first if the can is too short for everything)
  const rows = [['品名', d.kind], ['原材料名', d.ing], ['内容量', d.vol], ['賞味期限', date], ['製造者', b.maker + ' ' + b.addr]];
  const lh = H >= 200 ? 14 : 13, need = tall ? 26 : 0;
  const lines = (rs) => rs.reduce((a, [h, t]) => { const first = wrapJP(t, W - 2 * m - h.length * 12 - 10, 12); return a + 1 + (first.length > 1 ? wrapJP([...t].slice([...first[0]].length).join(''), W - 2 * m - 6, 12).length : 0); }, 0);
  let use = rows;
  if (sh + 4 + lines(use) * lh + rows.length + need > lim) use = rows.filter((r) => r[0] !== '賞味期限');
  let y = infoBox(p, m, sh + (tall ? 4 : 3), W - 2 * m, use, { ink, paper: lt(paper, 0.5), size: 12, lh, max: lim });
  if (!tall) { if (y + 27 <= lim + 2 && wide) recycle(p, W - m - 27, Math.min(y, lim - 26), d.mat, { ink, paper: null, caption: false }); return p; }
  // あき缶はくずかごへ, the material mark, the notes, and the mascot at the foot of it all
  if (y + 25 <= lim) { binNote(p, m, y, W - 2 * m - 30, { ink }); recycle(p, W - m - 27, y, d.mat, { ink, paper: null, caption: false }); y += 28; }
  const ms = POSE3[b.mascot] && lim - y >= 50 ? spr(b.mascot, POSE3[b.mascot]) : null;
  if (ms) at(p, ms, W - m - Math.round(ms.w / 2), lim - 1);
  const notes = [];
  if (d.alc > 0) notes.push('お酒は20歳になってから。');
  if (d.shake) notes.push('よくふってからあけてください。');
  if (d.hot) notes.push('あたためすぎに注意。');
  notes.push('プルタブをおこしてあけます。', 'あけたらすぐにのんでね。', '直射日光をさけて保存。');
  for (const n of notes) { const ls = wrapJP(n, W - 2 * m - (ms ? ms.w + 4 : 0), 12); if (y + ls.length * 14 > lim) break; for (const l of ls) { label(p, mk(l, 12), m, y, { c: ink }); y += 14; } }
  return p;
}

/** The front half of a drink's wrap. */
export function paintFront(id) {
  const d = DRINKS[id], b = BRANDS[d.brand], [W, H] = panelSize(d.cont);
  const p = new Px(W, H);
  p.fill(b.paper);
  const fn = F[id];
  if (fn) fn(p, { W, H, cx: W / 2, b, d, f: FOODS[id] || {} });
  else { put(p, KB((FOODS[id] || {}).jp || id), W / 2, 20, b.ink); }
  return p;
}
/** The whole wrap: front | back, the printer's overlap seam where they meet at the side. */
export function paintWrap(id) {
  const d = DRINKS[id], [W, H] = panelSize(d.cont);
  const p = new Px(W * 2, H);
  p.blit(paintFront(id), 0, 0); p.blit(paintBack(id), W, 0);
  // the seam: a lap line and a row of registration ticks where the sheet meets itself
  p.rect(W * 2 - 1, 0, 1, H, dk(p.get(W * 2 - 1, 4), 0.35));
  return p;
}
export const LABEL_IDS = Object.keys(DRINKS);
export { F as FRONTS, mix, m3 };
