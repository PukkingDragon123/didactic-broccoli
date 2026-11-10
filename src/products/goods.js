// Mikawa-ya's stock as real packs: a gable-top carton of milk, cup noodles, three rice balls in their film, two buns in
// bags, a pudding, a puff stick, a wrapped sweet, a card of batteries, a boxed light tube, a bamboo broom with its
// paper tag, a packet of seeds and a box of plant food. Low-poly at the old props' sizes, every face printed with full
// packaging (maker, mascot, the 品名 box, a JAN code, the price) on one atlas: one material for the whole shelf.
//   goodsMesh(propId, opts) -> Mesh | null     GOODS: the prop ids this module models
import * as THREE from 'three';
import { Sheet, Build, skin, R_PAINT, R_PAPER, R_METAL, R_PLASTIC, R_GLASS } from './containers.js';
import { Px, dk, lt, on } from './px.js';
import { m5, m3, mk, bold, x2, shear, label } from './type.js';
import { PAT, burst, ribbon, pill, seal, infoBox, barcode, recycle, wrapJP } from './print.js';
import { BRANDS, janOf } from './brands.js';
import { spr, big } from './labels.js';
import { ART } from './art.js';
import { framed } from './photos.js';

const MM = 0.001, INK = 0x2e1f28, W0 = 0xfffaf0, RED = 0xc8302a;
const K = (s, z = 16) => mk(s, z), KB = (s) => bold(mk(s, 16)), K2 = (s) => x2(bold(mk(s, 16))), K4 = (s) => x2(x2(bold(mk(s, 16))));
const put = (p, m, cx, y, c, out, sh, ow) => label(p, m, cx, y, { c, out, sh, ow, align: 'c' });
const at = (p, s, cx, by) => p.blit(s, Math.round(cx - s.w / 2), by - s.h);
const tag = (p, b, cx, y, o = {}) => pill(p, cx, y, K(b.jp, 12), { c: o.c ?? b.paper, text: o.text ?? b.ink, ink: o.ink ?? b.ink, align: 'c', pad: 10, padY: 3 });
const priceTag = (p, x, y, yen) => { p.rect(x, y, 46, 18, 0xfff8a0); p.frame(x, y, 46, 18, RED); label(p, m5(String(yen)), x + 30, y + 6, { c: RED, align: 'r' }); label(p, K('円', 12), x + 31, y + 3, { c: RED }); };
/** A back panel: the box of facts, the code, the price. */
function backPanel(p, b, rows, item, yen, o = {}) {
  const W = p.w, H = p.h, m = 6;
  p.fill(o.paper ?? b.paper);
  p.rect(0, 0, W, 18, b.main); p.rect(0, 18, W, 2, b.accent);
  label(p, K(b.jp, 12), m + 2, 3, { c: on(b.main) }); label(p, m3(b.en), W - m - 2, 7, { c: on(b.main), align: 'r' });
  let y = infoBox(p, m, 24, W - 2 * m, rows, { ink: b.ink, paper: lt(o.paper ?? b.paper, 0.5), size: 12, lh: 14, max: H - 44 });
  for (const n of o.notes || []) for (const l of wrapJP(n, W - 2 * m, 12)) { if (y + 13 > H - 42) break; label(p, K(l, 12), m, y, { c: b.ink }); y += 14; }
  if (W >= 130) barcode(p, m, H - 38, janOf(o.brand, item), { h: 18 });
  if (yen && W >= 200) { label(p, K('希望小売価格', 10), m + 118, H - 38, { c: b.ink }); label(p, m5('¥' + yen, 2), m + 118, H - 26, { c: RED }); label(p, K('税別', 10), m + 118 + m5('¥' + yen, 2).w + 3, H - 22, { c: b.ink }); }
  if (o.mark && W >= 200) recycle(p, W - m - 27, H - 74, o.mark, { ink: b.ink, paper: null, caption: false });
  return p;
}

// ------------------------------------------------------------------ painters (each returns a Px)
const P = {
  // ---- モーベル牛乳: four panels of 140 x 322, side by side (front, right, back, left)
  milk() {
    const b = BRANDS.moobell, B = 0x2456b0, SKY = 0x9ad0f4, p = new Px(560, 322);
    p.fill(W0);
    for (const x0 of [0, 280]) {
      p.clip(x0, 0, 140, 322);
      p.rect(x0, 0, 140, 190, PAT.fade(SKY, 0xdff0fa, 20, 170));
      for (const [cx, cy] of [[x0 + 28, 36], [x0 + 108, 58]]) { p.ell(cx, cy, 14, 6, W0); p.ell(cx - 8, cy - 4, 8, 6, W0); p.ell(cx + 6, cy - 5, 9, 7, W0); }
      { const cw = framed('cows', 128, 60, { shape: 'rect', fy: 0.6 }); if (cw && !x0) p.blit(cw, x0 + 3, 96); }
      p.shape(x0, 150, 140, 80, (x, y) => y > 196 - Math.sin((x - x0) * 0.03 + 0.4) * 16, 0x7ac86a);
      p.shape(x0, 150, 140, 80, (x, y) => y > 214 - Math.sin((x - x0) * 0.045 + 2) * 10, 0x58b050);
      for (let x = x0 + 6; x < x0 + 140; x += 22) { p.rect(x, 196, 3, 18, 0xf4ead2); } p.rect(x0, 200, 140, 2, 0xf4ead2); p.rect(x0, 207, 140, 2, 0xf4ead2);
      p.rect(x0, 0, 140, 26, B); p.rect(x0, 26, 140, 2, 0xffd23f);
      put(p, KB(b.jp), x0 + 70, 5, W0);
      put(p, K4('牛乳'), x0 + 70, 36, B, W0, [3, 3, 0x8cc6ee], 2);
      at(p, big('momo', x0 ? 'drink' : 'wave'), x0 + 70, 222);
      p.rect(x0, 232, 140, 90, B);
      pill(p, x0 + 70, 240, K('成分無調整', 12), { c: W0, text: B, ink: 0x10244a, align: 'c' });
      put(p, K('生乳100%使用', 12), x0 + 70, 264, W0);
      put(p, m5('1000ML', 2), x0 + 70, 284, 0xffd23f);
      put(p, m3('MOOBELL FARM FRESH MILK'), x0 + 70, 306, W0);
      p.clip();
    }
    // the right panel: nutrition; the left: the legal box and the code
    const n = p; let y = 12;
    n.rect(140, 0, 140, 322, W0); n.rect(140, 0, 140, 6, B); n.rect(140, 316, 140, 6, B);
    put(n, K('栄養成分表示', 12), 210, y, B); y += 14; put(n, K('（200mlあたり）', 10), 210, y, B); y += 14;
    for (const [a, v] of [['エネルギー', '137kcal'], ['たんぱく質', '6.8g'], ['脂質', '7.8g'], ['炭水化物', '9.9g'], ['ナトリウム', '85mg'], ['カルシウム', '227mg']]) { n.rect(146, y, 128, 1, 0x9ab0d8); label(n, K(a, 12), 148, y + 2, { c: 0x10244a }); label(n, m5(v.toUpperCase()), 272, y + 5, { c: 0x10244a, align: 'r' }); y += 16; }
    n.rect(146, y, 128, 1, 0x9ab0d8); y += 8;
    at(n, spr('momo', 'sleep'), 210, y + 56); y += 62;
    for (const l of ['開封後は賞味期限', 'にかかわらず', 'お早めにお飲み', 'ください。']) { put(n, K(l, 12), 210, y, 0x10244a); y += 14; }
    recycle(n, 197, 280, 'paper', { ink: B, paper: null });
    const q = new Px(140, 322);
    backPanel(q, b, [['種類別', '牛乳'], ['商品名', 'モーベル牛乳'], ['乳脂肪分', '3.6%以上'], ['原材料名', '生乳100%'], ['殺菌', '130℃ 2秒間'], ['内容量', '1000ml'], ['賞味期限', '上部に記載'], ['保存方法', '要冷蔵10℃以下'], ['製造者', b.maker + ' ' + b.addr]], '00901', 0, { brand: 'moobell' });
    p.blit(q, 420, 0);
    for (const x of [140, 280, 420]) p.rect(x, 0, 1, 322, 0xd8dce8);
    return p;
  },
  /** The gable: front slope (あけぐち), back slope (the date), and the fin. 140 x 100 each, side by side + fin 140 x 24. */
  milkTop() {
    const p = new Px(280, 126), B = 0x2456b0;
    p.fill(W0);
    p.rect(0, 0, 280, 100, W0); p.rect(0, 92, 280, 8, B);
    put(p, KB('あけぐち'), 70, 22, B); p.poly([[20, 62], [44, 50], [44, 74]], RED); p.poly([[120, 62], [96, 50], [96, 74]], RED); p.rect(44, 58, 52, 8, RED); put(p, K('左右にひらく', 12), 70, 76, 0x10244a);
    put(p, K('賞味期限', 12), 210, 16, 0x10244a);
    const dots = (s, y) => { const m = m5(s); for (let j = 0; j < 7; j++) for (let i = 0; i < m.w; i++) if (m.b[j * m.w + i]) p.rect(210 - m.w + i * 2, y + j * 2, 1, 1, INK); };
    dots('99.04.18', 36); dots('MB7 14:20', 58);
    p.rect(0, 100, 280, 26, 0xeeeee6); for (let x = 3; x < 280; x += 6) p.rect(x, 104, 1, 18, 0xd8d8ce);
    return p;
  },
  // ---- ねこ印 カップめん: the wrap (front | back), 528 x 190
  cupnoodle() {
    const b = BRANDS.neko, p = new Px(528, 190), R = 0xd8362a, GD = 0xf4c040;
    p.fill(W0);
    p.rect(0, 0, 264, 190, W0); p.rect(0, 0, 528, 14, R); p.rect(0, 14, 528, 3, GD); p.rect(0, 172, 528, 18, R); p.rect(0, 169, 528, 3, GD);
    p.rect(0, 17, 264, 152, PAT.rays(W0, 0xfbeed0, 132, 110, 20));
    at(p, big('neko', 'slurp'), 54, 166);
    put(p, shear(K2('しょうゆ味'), 0.15), 176, 24, R, W0, [3, 3, 0x6a1410], 2);
    put(p, K2('カップめん'), 176, 66, 0x3a1408, W0, null, 2);
    at(p, framed('ramen_shoyu', 64, 64, { shape: 'circle' }) || ART.ramen(), 150, 168);
    burst(p, 228, 138, 26, [K('お湯で', 12), m5('3', 2), K('分', 12)], { c: GD, text: R, ink: 0x3a1408, n: 14 });
    put(p, KB('ねこ印'), 50, 22, R, W0);
    put(p, m5('NEKO-JIRUSHI SOY SAUCE NOODLES'), 132, 178, W0);
    const q = new Px(264, 190);
    backPanel(q, b, [['名称', '即席カップめん'], ['原材料名', 'めん（小麦粉、植物油脂、食塩）、スープ（しょうゆ、食塩、糖類）、かやく（ねぎ、なると）'], ['内容量', '77g（めん65g）'], ['賞味期限', '底面に記載'], ['製造者', b.maker]], '00455', 180, { brand: 'neko', notes: ['①ふたを半分まではがす ②熱湯を線まで ③3分まつ', 'やけどに注意！'] });
    p.blit(q, 264, 0);
    return p;
  },
  cupLid() {
    const D = 192, p = new Px(D, D), c = D / 2, R = 0xd8362a;
    p.fill(0xf4f0e6); p.ell(c, c, c, c, 0xf4f0e6); p.ring(c, c, c - 2, c - 2, 6, R); p.ring(c, c, c - 12, c - 12, 2, 0xf4c040);
    put(p, K2('しょうゆ味'), c, 34, R, W0, null, 1);
    at(p, spr('neko', 'slurp'), c, 126);
    put(p, KB('ねこ印 カップめん'), c, 130, 0x3a1408);
    put(p, K('熱湯3分', 12), c, 152, R);
    p.poly([[c - 8, D - 12], [c + 8, D - 12], [c, D - 2]], R); put(p, K('ここからあける', 10), c, D - 26, 0x3a1408);
    return p;
  },
  // ---- 三河屋のおにぎり: the front and the back of one, 192 x 168 each
  onigiri(kind) {
    const F = { ume: ['梅', 0xd8302a, 'うめぼし', 120, '00121'], tuna: ['ツナマヨ', 0x2a6ad8, 'ツナマヨネーズ', 130, '00122'], shake: ['鮭', 0xf08a3a, '焼きさけ', 140, '00123'] }[kind];
    const p = new Px(384, 168), b = BRANDS.omusubi, NORI = 0x26342a, col = F[1];
    for (const x0 of [0, 192]) {
      p.rect(x0, 0, 192, 168, 0xfaf8f2);
      for (let i = 0; i < 120; i++) { const x = x0 + (i * 53) % 192, y = (i * 37) % 80; p.rect(x, y, 2, 1, 0xe6e2d8); }
      p.rect(x0, 78, 192, 90, NORI); for (let i = 0; i < 60; i++) p.rect(x0 + (i * 47) % 192, 80 + (i * 29) % 86, 3, 1, 0x34463a);
      // the film's shine: two hard streaks
      for (let k = 0; k < 168; k++) { const x = x0 + 36 + Math.round(k * 0.45); if (k % 2 === 0) { p.set(x, k, lt(p.get(x, k), 0.55)); p.set(x + 1, k, lt(p.get(x + 1, k), 0.55)); } }
    }
    // front: the pull strip down the middle with its numbers, the flavour sticker
    p.rect(92, 0, 8, 168, col); p.rect(91, 0, 1, 168, dk(col, 0.3)); p.rect(100, 0, 1, 168, dk(col, 0.3));
    roundelNum(p, 96, 22, '1', col); roundelNum(p, 36, 150, '2', col); roundelNum(p, 156, 150, '3', col);
    p.rrect(46, 84, 100, 56, 6, W0); p.frame(49, 87, 94, 50, col);
    put(p, [...F[0]].length > 1 ? KB(F[0]) : K2(F[0]), 96, [...F[0]].length > 1 ? 94 : 88, col);
    put(p, K('手づくりおにぎり', 10), 96, 122, INK);
    at(p, spr('omusubi', 0, { dot: col }), 96, 76);
    // back: the facts sticker, the price
    const q = new Px(150, 78); q.fill(W0);
    infoBox(q, 2, 2, 146, [['名称', 'おにぎり（' + F[2] + '）'], ['消費期限', '99.4.18 午前3時'], ['製造者', b.maker + ' ' + b.addr]], { ink: INK, paper: W0, size: 10, lh: 12 });
    p.blit(q, 192 + 21, 86);
    priceTag(p, 192 + 126, 60, F[3]);
    label(p, m3('JAN ' + janOf('omusubi', F[4])), 192 + 24, 68, { c: W0 });
    return p;
  },
  // ---- かめパン: the bun from above (200 x 200) with its sticker; the bag's crimped ends
  bun(kind) {
    const melon = kind === 'melon', p = new Px(200, 200), c = 100, b = BRANDS.kamepan;
    const top = melon ? 0xf4d070 : 0xa85c24, side = melon ? 0xe8b058 : 0xc88440;
    p.fill(side);
    p.ell(c, c, 98, 98, side); p.ell(c, c, 84, 84, top); p.crescent(c, c, 84, 84, -14, -14, dk(top, 0.14));
    if (melon) p.shape(16, 16, 168, 168, (x, y) => (x - c) ** 2 + (y - c) ** 2 < 82 * 82 && (Math.round(x + y) % 22 < 2 || Math.round(x - y + 400) % 22 < 2), dk(top, 0.22));
    else { p.ell(c - 26, c - 30, 26, 14, lt(top, 0.3)); for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 8 + (i * 7) % 20; p.rect(Math.round(c + Math.cos(a) * r), Math.round(c + Math.sin(a) * r), 3, 2, 0xf4ead2); } }
    // the printed film over it: a band and a round sticker with the turtle
    p.rect(0, 132, 200, 30, b.accent); p.rect(0, 130, 200, 2, W0); p.rect(0, 162, 200, 2, W0);
    put(p, KB(melon ? 'メロンパン' : 'あんぱん'), c, 139, W0, 0x2a5a2a);
    p.ell(c + 44, c - 34, 37, 37, 0x4a2a14); p.ell(c + 44, c - 34, 35, 35, b.paper);
    at(p, spr('kamepan', 0), c + 44, c - 20);
    put(p, K('かめパン', 10), c + 44, c - 16, 0x4a2a14);
    priceTag(p, 12, 26, melon ? 130 : 120);
    for (let k = 0; k < 200; k++) { const x = 30 + Math.round(k * 0.5); if (k % 2 === 0 && k < 128) { p.set(x, k, lt(p.get(x, k), 0.5)); p.set(x + 1, k, lt(p.get(x + 1, k), 0.5)); } }
    return p;
  },
  bunFin() { const p = new Px(64, 120); p.fill(0xf0eee6); for (let y = 4; y < 120; y += 5) p.rect(2, y, 60, 1, 0xd6d4c8); p.rect(0, 0, 64, 3, BRANDS.kamepan.accent); p.rect(0, 117, 64, 3, BRANDS.kamepan.accent); return p; },
  // ---- モーベル プリン: side (224 x 104), lid (144)
  purinSide() {
    const p = new Px(224, 104), b = BRANDS.moobell;
    p.fill(0xf8dc80); p.rect(0, 78, 224, 26, 0x6a3210); p.rect(0, 76, 224, 2, 0x8a4a1a);
    p.rect(0, 0, 224, 6, 0xf4f0e6);
    p.rect(0, 22, 224, 40, W0); p.rect(0, 22, 224, 2, b.main); p.rect(0, 60, 224, 2, b.main);
    put(p, KB('なめらかプリン'), 56, 34, 0x6a3210); put(p, K(b.jp, 12), 168, 28, b.main); put(p, m3('CUSTARD PUDDING 90G'), 168, 46, b.main);
    return p;
  },
  purinLid() {
    const D = 144, p = new Px(D, D), c = D / 2, b = BRANDS.moobell;
    p.fill(0xe8e4d8); p.ell(c, c, c, c, 0xf4f0e6); p.ring(c, c, c - 3, c - 3, 5, 0xf4c040); p.ring(c, c, c - 11, c - 11, 1, 0x6a3210);
    put(p, K2('プリン'), c, 20, 0x6a3210, W0, null, 1);
    at(p, framed('pudding', 60, 44, { shape: 'rect' }) || spr('momo', 'wave'), c, 108);
    put(p, K('カスタード', 12), c, 110, b.main); put(p, m3('MOOBELL'), c, 126, b.main);
    return p;
  },
  // ---- チュー太 サクサク棒: the wrap (front | back), 188 x 220
  puff() {
    const b = BRANDS.chuta, p = new Px(188, 220), Y = 0xffd23f, R = 0xe0443a;
    p.fill(PAT.stripes(Y, 0xffdf68, 8, 'd'));
    p.rect(0, 0, 188, 10, R); p.rect(0, 210, 188, 10, R);
    const v = x2(mk('サクサク棒', 16, { vert: true }));
    p.mask(v, 8 + 2, 26 + 2, 0x7a1a10); p.mask(v, 8, 26, R);
    at(p, spr('chuta', 0), 66, 110);
    put(p, KB('チーズ味'), 62, 116, 0x3a1408, W0);
    burst(p, 62, 164, 22, [m5('10', 2), K('円', 12)], { c: W0, text: R, ink: 0x3a1408 });
    put(p, K('チュー太', 10), 62, 196, 0x3a1408);
    pill(p, 62, 12, K('あたり付き', 10), { c: W0, text: R, ink: 0x3a1408, align: 'c', pad: 6, padY: 2 });
    const q = new Px(94, 200);
    q.fill(Y); infoBox(q, 2, 4, 90, [['名称', 'スナック菓子'], ['原材料名', 'コーン、植物油脂、チーズパウダー、食塩'], ['内容量', '6g'], ['製造者', b.maker]], { ink: 0x3a1408, paper: W0, size: 10, lh: 12 });
    label(q, m3('JAN ' + janOf('chuta', '00010')), 47, 186, { c: 0x3a1408, align: 'c' });
    for (let i = 0; i < 44; i++) if ((i * 7 + 3) % 5 < 3) q.rect(25 + i, 158, 1, 24, 0x1e1820);
    p.blit(q, 94, 10);
    return p;
  },
  candy() { const p = new Px(96, 48); p.fill(PAT.stripes(RED, W0, 8, 'd')); p.rect(0, 16, 96, 16, W0); put(p, K('フルーツあめ', 10), 48, 19, RED); return p; },
  // ---- ビリビリ電池: the card front | back (168 x 248 each), a cell's wrap (88 x 100)
  battery() {
    const b = BRANDS.hotaru, p = new Px(336, 248), Y = 0xfbe25c, R = 0xe0302c;
    p.fill(Y); p.rect(0, 0, 168, 248, PAT.halftone(Y, 0xffd23f, 84, 150, 130, 7));
    p.rect(0, 0, 168, 56, R); p.rect(0, 56, 168, 3, INK);
    p.rrect(68, 6, 32, 10, 5, 0x3a1010);
    put(p, shear(K2('ビリビリ'), 0.2), 84, 20, 0xffd23f, INK, null, 2);
    at(p, spr('biri', 0), 138, 110);
    label(p, KB('単3形'), 10, 64, { c: INK }); label(p, m5('4', 3), 62, 62, { c: R, out: W0 }); label(p, K('本', 12), 80, 70, { c: INK });
    label(p, K('マンガン乾電池', 12), 10, 84, { c: INK });
    p.rect(0, 232, 168, 16, 0x2a4aa0); put(p, m5('BIRIBIRI R6 1.5V'), 84, 236, W0);
    priceTag(p, 8, 208, 300);
    const q = new Px(168, 248);
    backPanel(q, b, [['品名', 'マンガン乾電池 単3形'], ['入数', '4本'], ['使用推奨期限', '2001年3月'], ['製造者', b.maker + ' ' + b.addr]], '00730', 0, { brand: 'hotaru', paper: 0xfffaf0, notes: ['＋－を正しく入れてください。', '充電しないこと。', '使いおわった電池は自治体のきまりにしたがって。'] });
    p.blit(q, 168, 0);
    return p;
  },
  cell() {
    const p = new Px(88, 100); p.fill(0x1e1c22);
    p.rect(0, 0, 88, 14, 0xd8b040); p.rect(0, 86, 88, 14, 0xd8b040); p.rect(0, 14, 88, 2, RED); p.rect(0, 84, 88, 2, RED);
    for (const x0 of [0, 44]) { const v = mk('ビリビリ', 12, { vert: true }); p.mask(v, x0 + 6, 20, 0xffd23f); label(p, m3('R6'), x0 + 26, 30, { c: W0 }); label(p, m3('1.5V'), x0 + 24, 40, { c: W0 }); label(p, m5('+'), x0 + 28, 18, { c: RED }); label(p, m5('-'), x0 + 29, 72, { c: W0 }); }
    return p;
  },
  // ---- ホタル印 蛍光ランプ: one 200 mm stretch of the sleeve, logo face and spec face (400 x 80 each), the end (80)
  tube() {
    const b = BRANDS.hotaru, p = new Px(400, 160), B = 0x2a5ab0;
    p.fill(W0);
    p.rect(0, 0, 400, 80, W0); p.rect(0, 0, 400, 8, B); p.rect(0, 72, 400, 8, B); p.rect(0, 8, 400, 2, 0xd8f060); p.rect(0, 70, 400, 2, 0xd8f060);
    at(p, spr('hotaru', 0), 34, 66);
    label(p, K2('蛍光ランプ'), 66, 16, { c: B });
    label(p, KB('ホタル印'), 246, 14, { c: RED }); label(p, m5('FL40S·D  40W'), 246, 36, { c: INK }); label(p, K('昼光色', 12), 246, 50, { c: INK });
    burst(p, 368, 40, 24, [K('長寿命', 12)], { c: 0xd8f060, text: B, ink: INK });
    p.rect(0, 80, 400, 80, 0xf0f4f8); p.rect(0, 80, 400, 6, B); p.rect(0, 154, 400, 6, B);
    // a drawing of the lamp itself, and the particulars
    p.rrect(14, 104, 180, 14, 7, 0xe8f8fc); p.frame(14, 104, 180, 14, 0x8a9aa8); p.rect(14, 104, 10, 14, 0x9aa4ae); p.rect(184, 104, 10, 14, 0x9aa4ae); p.rect(8, 108, 6, 2, INK); p.rect(8, 113, 6, 2, INK); p.rect(194, 108, 6, 2, INK); p.rect(194, 113, 6, 2, INK);
    label(p, K('直管スタータ形 1198mm', 12), 16, 126, { c: INK });
    label(p, K('われもの注意', 12), 216, 96, { c: RED }); label(p, K(b.maker, 12), 216, 112, { c: INK }); label(p, m3('JAN ' + janOf('hotaru', '00740') + '  ¥400'), 216, 130, { c: INK });
    for (let i = 0; i < 60; i++) if ((i * 7 + 3) % 5 < 3) p.rect(330 + i, 94, 1, 30, 0x1e1820);
    return p;
  },
  tubeEnd() { const p = new Px(80, 80); p.fill(0xf2ead0); p.frame(0, 0, 80, 80, 0xc8b88a); p.ell(40, 40, 26, 26, 0x2a5ab0); p.ell(40, 40, 22, 22, 0xf0f4f8); put(p, m5('FL40'), 40, 30, 0x2a5ab0); put(p, m3('40W'), 40, 44, INK); p.rect(0, 36, 80, 8, 0xe8dcb8); return p; },
  // ---- the bamboo broom: its head (twigs, bindings), the handle's cane, the paper tag
  broomHead() {
    const p = new Px(160, 320); p.fill(0x8e6e40);
    for (let x = 0; x < 160; x += 2) { const c = [0x6e5030, 0x8e6e40, 0xb08e56, 0x7a5c36][(x * 7 + ((x * x) % 5)) % 4]; p.rect(x, 0, 2, 320, c); if ((x * 13) % 7 < 2) p.rect(x, 0, 1, 320, 0x5a4026); }
    for (let i = 0; i < 70; i++) { const x = (i * 37) % 158, y = 250 + (i * 53) % 70; p.rect(x, y, 2, 320 - y, 0x5a4026); }
    for (const y of [56, 60, 120, 124]) p.rect(0, y, 160, 3, 0x2e3a2c);
    for (let x = 4; x < 160; x += 8) { p.rect(x, 54, 2, 12, 0x3e4e3a); p.rect(x, 118, 2, 12, 0x3e4e3a); }
    return p;
  },
  cane() { const p = new Px(32, 128); p.fill(0xd4bc72); p.rect(20, 0, 8, 128, 0xbca25a); p.rect(6, 0, 3, 128, 0xe8d490); for (let y = 12; y < 128; y += 38) { p.rect(0, y, 32, 3, 0xa89048); p.rect(0, y + 3, 32, 1, 0xe8d490); } return p; },
  broomTag() {
    const p = new Px(96, 150), G = 0x2a6a3a; p.fill(0xf4ead2); p.frame(0, 0, 96, 150, G, 2); p.frame(4, 4, 88, 142, RED);
    p.ell(48, 14, 5, 5, 0x8a7a5a); p.ell(48, 14, 3, 3, 0x3a2a1a);
    const v = x2(mk('竹ぼうき', 16, { vert: true })); p.mask(v, 30, 24, G);
    seal(p, 66, 28, '松印', { c: RED, paper: 0xf4ead2, size: 12, cols: 1 });
    label(p, K('職人', 10), 68, 70, { c: INK }); label(p, K('手づ', 10), 68, 82, { c: INK }); label(p, K('くり', 10), 68, 94, { c: INK });
    priceTag(p, 44, 124, 600); label(p, m3('MATSU-JIRUSHI'), 8, 136, { c: G });
    return p;
  },
  // ---- モグ園芸: the seed packet (front | back, 170 x 240 each), the plant food box (front | side | back | side)
  seeds() {
    const b = BRANDS.mogu, p = new Px(340, 240);
    p.fill(0xdff0fa); p.rect(0, 0, 170, 240, PAT.fade(0xbfe2f6, 0xf4fafc, 30, 200));
    p.rect(0, 0, 170, 30, b.main); p.rect(0, 30, 170, 2, 0xffd23f); put(p, KB('あさがお'), 85, 6, W0, 0x1e4a24);
    at(p, framed('asagao', 112, 112, { shape: 'circle' }) || ART.asagao(0x5a5ae0).x2(), 66, 194); at(p, ART.asagao(0xd85aa8), 140, 196);
    p.rect(0, 200, 170, 40, W0); p.rect(0, 198, 170, 2, b.main);
    label(p, K('花のタネ', 12), 8, 206, { c: b.ink }); label(p, K(b.jp, 12), 8, 222, { c: b.main }); priceTag(p, 116, 212, 200);
    burst(p, 140, 60, 22, [K('大輪', 12)], { c: 0xffd23f, text: RED, ink: b.ink });
    const q = new Px(170, 240);
    backPanel(q, b, [['品名', 'あさがお（大輪咲き混合）'], ['数量', '1.5ml'], ['発芽率', '80%以上'], ['生産地', '高原村'], ['販売者', b.maker]], '00820', 0, { brand: 'mogu' });
    // the sowing calendar
    const y0 = 150; label(q, K('まきどき', 10), 8, y0 - 12, { c: b.ink });
    for (let mth = 0; mth < 12; mth++) { q.frame(8 + mth * 13, y0, 14, 14, b.ink); label(q, m3(String(mth + 1)), 15 + mth * 13, y0 + 16, { c: b.ink, align: 'c' }); if (mth >= 4 && mth <= 5) q.rect(9 + mth * 13, y0 + 1, 12, 12, b.main); if (mth >= 6 && mth <= 9) q.rect(9 + mth * 13, y0 + 1, 12, 12, 0xd85aa8); }
    p.blit(q, 170, 0);
    return p;
  },
  fert() {
    const b = BRANDS.mogu, p = new Px(624, 276), G = b.main;
    p.fill(0xf4f0d8);
    for (const x0 of [0, 312]) {
      p.rect(x0, 0, 204, 276, PAT.stripes(0xf4f0d8, 0xeae6c8, 10, 'v')); p.rect(x0, 0, 204, 40, G); p.rect(x0, 40, 204, 3, 0xffd23f); p.rect(x0, 236, 204, 40, 0x8a5a2a);
      put(p, KB(b.jp), x0 + 102, 12, W0);
      if (!x0) { put(p, K2('草花の肥料'), 102, 54, 0x2a3a10, W0, null, 2); at(p, big('mogu', 0), 70, 226); burst(p, 158, 130, 30, [m5('N-P-K'), m5('6-10-5', 1)], { c: 0xffd23f, text: 0x2a3a10, ink: 0x2a3a10 }); put(p, K('よく咲く！', 12), 158, 172, RED); put(p, m5('500G', 2), 150, 246, W0); }
    }
    const q = new Px(204, 233);
    backPanel(q, b, [['肥料の名称', '草花の肥料'], ['保証成分量', 'ちっそ6 りんさん10 カリ5'], ['正味重量', '500g'], ['生産者', b.maker + ' ' + b.addr]], '00830', 400, { brand: 'mogu', notes: ['月に一度、株もとにひとさじ。', 'こどもの手のとどかない所に。'] });
    p.blit(q, 312, 43);
    for (const x0 of [204, 516]) { p.rect(x0, 0, 108, 276, G); const v = x2(mk('草花の肥料', 16, { vert: true })); p.mask(v, x0 + 38, 50, W0); p.rect(x0, 236, 108, 40, 0x8a5a2a); }
    return p;
  },
};
/** Ramen Yamada's meal ticket: front | back (114 x 84 each). */
P.ticket = () => {
  const p = new Px(228, 84), B = 0x2a6ad8;
  p.fill(0xf4f0e4);
  p.rect(0, 0, 114, 22, B); put(p, KB('食券'), 26, 3, W0); label(p, K('らーめん山田', 12), 50, 5, { c: W0 });
  for (let y = 26; y < 84; y += 4) p.rect(88, y, 1, 2, 0x8a8a8a);
  label(p, K('おひとり様', 12), 6, 30, { c: INK }); label(p, K('一品', 12), 6, 46, { c: INK }); label(p, m5('NO.0417'), 6, 66, { c: RED });
  seal(p, 60, 44, '山田', { c: RED, paper: 0xf4f0e4, size: 12, cols: 1, round: true });
  label(p, m3('99'), 94, 34, { c: INK }); label(p, m3('04'), 94, 44, { c: INK }); label(p, m3('18'), 94, 54, { c: INK });
  p.frame(0, 0, 114, 84, 0xb8b0a0);
  p.rect(114, 0, 114, 84, 0xeeeade); for (let y = 8; y < 84; y += 9) p.rect(122, y, 98, 1, 0xd8d2c0); label(p, K('当日限り有効', 12), 171, 34, { c: 0x8a8478, align: 'c' }); p.frame(114, 0, 114, 84, 0xb8b0a0);
  return p;
};
function roundelNum(p, cx, cy, n, c) { p.ell(cx, cy, 9, 9, INK); p.ell(cx, cy, 8, 8, W0); label(p, m5(n), cx, cy - 3, { c, align: 'c' }); }

// ------------------------------------------------------------------ the sheet and the models
let SHEET = null;
function sheet() {
  if (SHEET) return SHEET;
  const S = SHEET = new Sheet(2048, 1024, 'goods');
  S.preload = Object.values(BRANDS).map((b) => b.jp + b.maker + b.addr).join('') + '牛乳成分無調整生乳使用栄養表示種類別商品名乳脂肪分殺菌賞味期限保存方法要冷蔵以下開封後早飲名称即席原材料小麦粉植物油脂食塩糖類熱湯線注意梅鮭焼手消費午前時単形本乾電池推奨蛍光昼色直管長寿命竹職人松印花数量発芽率生産地販売者草肥保証正味重量月度株';
  const R = (k, w, h, f, rough = R_PAPER, hold = 0xf4f0e6) => S.region(k, w, h, f, rough, hold);
  // (tall ones first: the shelf packer fills rows left to right)
  const g = S.g = { oni: {}, bun: {} };
  g.milk = R('milk', 560, 322, P.milk); g.milkTop = R('milkTop', 280, 126, P.milkTop); g.broomHead = R('broomHead', 160, 320, P.broomHead, 0.95);
  g.fert = R('fert', 624, 276, P.fert); g.battery = R('battery', 336, 248, P.battery);
  g.noodle = R('noodle', 528, 190, P.cupnoodle); g.noodleLid = R('noodleLid', 192, 192, P.cupLid);
  for (const k of ['ume', 'tuna', 'shake']) g.oni[k] = R('oni:' + k, 384, 168, () => P.onigiri(k), 0.4);
  g.seeds = R('seeds', 340, 240, P.seeds);
  g.bun.melon = R('bun:melon', 200, 200, () => P.bun('melon'), 0.45); g.bun.an = R('bun:an', 200, 200, () => P.bun('an'), 0.45);
  g.puff = R('puff', 188, 220, P.puff, 0.4); g.purin = R('purin', 224, 104, P.purinSide, 0.35); g.purinLid = R('purinLid', 144, 144, P.purinLid, 0.4);
  g.tube = R('tube', 400, 160, P.tube); g.bunFin = R('bunFin', 64, 120, P.bunFin, 0.4); g.cell = R('cell', 88, 100, P.cell, R_PAINT);
  g.ticket = R('ticket', 228, 84, P.ticket);
  g.tubeEnd = R('tubeEnd', 80, 80, P.tubeEnd); g.cane = R('cane', 32, 128, P.cane, 0.6); g.broomTag = R('broomTag', 96, 150, P.broomTag); g.candy = R('candy', 96, 48, P.candy, 0.35);
  return S;
}
/** A part of a view as a uv rectangle: sub(v, s0, t0, s1, t1) -> (s, t) => uv. */
const part = (v, s0, t0, s1, t1) => (s, t) => v.st(s0 + (s1 - s0) * s, t0 + (t1 - t0) * t);
/** One flat face: corners bottom-left, bottom-right, top-right, top-left as seen from outside; f(s, t) -> uv. */
function face(B, a, b, c, d, n, f) { B.quad({ p: a, n, t: f(0, 0) }, { p: b, n, t: f(1, 0) }, { p: c, n, t: f(1, 1) }, { p: d, n, t: f(0, 1) }); }
/** A printed box: w x h x d (metres), faces from f = { front, back, left, right, top, bottom } (each (s, t) -> uv). */
/** A pinked edge: little teeth from a to b (both [x, y, z]) pointing along `out`, both sides, in one colour. */
function teeth(B, a, b, out, n, t) {
  for (let i = 0; i < n; i++) {
    const p = (k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], q0 = p(i / n), q1 = p((i + 1) / n), m = p((i + 0.5) / n).map((v, k) => v + out[k]);
    for (const nz of [1, -1]) B.tri({ p: q0, n: [0, 0, nz], t }, { p: q1, n: [0, 0, nz], t }, { p: m, n: [0, 0, nz], t });
  }
}
function pack(B, w, h, d, f, y0 = 0) {
  const x = w / 2, z = d / 2, y1 = y0 + h;
  if (f.front) face(B, [-x, y0, z], [x, y0, z], [x, y1, z], [-x, y1, z], [0, 0, 1], f.front);
  if (f.back) face(B, [x, y0, -z], [-x, y0, -z], [-x, y1, -z], [x, y1, -z], [0, 0, -1], f.back);
  if (f.right) face(B, [x, y0, z], [x, y0, -z], [x, y1, -z], [x, y1, z], [1, 0, 0], f.right);
  if (f.left) face(B, [-x, y0, -z], [-x, y0, z], [-x, y1, z], [-x, y1, -z], [-1, 0, 0], f.left);
  if (f.top) face(B, [-x, y1, z], [x, y1, z], [x, y1, -z], [-x, y1, -z], [0, 1, 0], f.top);
  if (f.bottom) face(B, [-x, y0, -z], [x, y0, -z], [x, y0, z], [-x, y0, z], [0, -1, 0], f.bottom);
}
const flat = (S, c, r) => { const t = S.swatch(c, r)(); return () => t; };

const MODEL = {
  milk_carton(B, S, g) {
    const w = 0.07, h = 0.161, hw = w / 2, ridge = h + 0.035, fin = ridge + 0.011, v = g.milk;
    pack(B, w, h, w, { front: part(v, 0, 0, 0.25, 1), right: part(v, 0.25, 0, 0.5, 1), back: part(v, 0.5, 0, 0.75, 1), left: part(v, 0.75, 0, 1, 1), bottom: flat(S, 0xe8e6de, R_PAPER) });
    // the gable: two slopes up to the ridge, the folded-in sides, the sealed fin
    const t = g.milkTop, sl = 100 / 126;
    face(B, [-hw, h, hw], [hw, h, hw], [hw, ridge, 0.001], [-hw, ridge, 0.001], [0, 0.7, 0.7], (s, tt) => t.st(s * 0.5, (1 - sl) + tt * sl));
    face(B, [hw, h, -hw], [-hw, h, -hw], [-hw, ridge, -0.001], [hw, ridge, -0.001], [0, 0.7, -0.7], (s, tt) => t.st(0.5 + s * 0.5, (1 - sl) + tt * sl));
    const wht = S.swatch(0xf6f4ee, R_PAPER)();
    for (const sx of [-1, 1]) B.tri({ p: [sx * hw, h, hw], n: [sx, 0.3, 0], t: wht }, { p: [sx * hw, h, -hw], n: [sx, 0.3, 0], t: wht }, { p: [sx * hw * 0.55, ridge, 0], n: [sx, 0.3, 0], t: wht });
    for (const sz of [1, -1]) face(B, [-hw * sz, ridge, sz * 0.0012], [hw * sz, ridge, sz * 0.0012], [hw * sz, fin, sz * 0.0012], [-hw * sz, fin, sz * 0.0012], [0, 0, sz], (s, tt) => t.st(s * 0.5, tt * (1 - sl)));
  },
  room_cupnoodle(B, S, g) {
    const m = MM, r0 = 35 * m, r1 = 47 * m, h = 104 * m, wht = skin.sw(S.swatch(0xf4f0e6, 0.5));
    B.lathe([[0, 2 * m], [r0 * 0.8, 2 * m], [r0 * 0.86, 0], [r0, 2 * m], [r0 + (r1 - r0) * 0.06, 8 * m], [r1 - 1 * m, h - 4 * m], [r1 + 1.5 * m, h - 3 * m], [r1 + 1.5 * m, h - 0.6 * m], [r1, h], [0, h]], 32,
      [wht, wht, wht, wht, skin.wrap(g.noodle, 0, 1), wht, wht, wht, skin.top(g.noodleLid, r1)]);
    // the lid's pull tab
    const t = S.swatch(0xd8362a, 0.5)(); face(B, [-0.012, h + 0.0004, r1 - 0.002], [0.012, h + 0.0004, r1 - 0.002], [0.009, h + 0.0004, r1 + 0.012], [-0.009, h + 0.0004, r1 + 0.012], [0, 1, 0], () => t);
  },
  onigiri(kind) {
    return (B, S, g) => {
      const v = g.oni[kind], W = 0.096, H = 0.084, d = 0.03, hw = W / 2;
      // a rounded triangle: its outline in (x, y), point up
      // a rounded triangle: three corner arcs (eight points each), point up
      const O = [], rc = 0.016, C3 = [[-hw + rc, rc], [hw - rc, rc], [0, H - rc * 1.1]], A0 = [Math.PI, -Math.PI / 2, Math.PI / 6].map((a, i) => [[Math.PI * 0.84, Math.PI * 1.5], [-Math.PI / 2, Math.PI * 0.16], [Math.PI * 0.16, Math.PI * 0.84]][i]);
      C3.forEach(([cx, cy], i) => { for (let k = 0; k <= 7; k++) { const a = A0[i][0] + (A0[i][1] - A0[i][0]) * k / 7; O.push([cx + Math.cos(a) * rc, cy + Math.sin(a) * rc]); } });
      const uvF = (x, y) => v.st((0.5 + x / W) * 0.5, y / H), uvB = (x, y) => v.st(0.5 + (0.5 - x / W) * 0.5, y / H);
      const c = [0, H * 0.4], inn = (q) => [c[0] + (q[0] - c[0]) * 0.8, c[1] + (q[1] - c[1]) * 0.8];
      for (let k = 0; k < O.length; k++) {
        const a = O[k], b = O[(k + 1) % O.length], ai = inn(a), bi = inn(b);
        for (const sz of [1, -1]) {
          // the flat of the face, then the pillowed shoulder down to the edge
          const uv = sz > 0 ? uvF : uvB, zf = sz * d / 2, ze = sz * (d / 2 - 0.005), nf = [0, 0, sz], ne = (q) => { const l = Math.hypot(q[0] - c[0], q[1] - c[1]) || 1; return [(q[0] - c[0]) / l * 0.6, (q[1] - c[1]) / l * 0.6, sz * 0.8]; };
          B.tri({ p: [c[0], c[1], zf], n: nf, t: uv(...c) }, { p: [ai[0], ai[1], zf], n: nf, t: uv(...ai) }, { p: [bi[0], bi[1], zf], n: nf, t: uv(...bi) });
          B.quad({ p: [ai[0], ai[1], zf], n: nf, t: uv(...ai) }, { p: [a[0], a[1], ze], n: ne(a), t: uv(...a) }, { p: [b[0], b[1], ze], n: ne(b), t: uv(...b) }, { p: [bi[0], bi[1], zf], n: nf, t: uv(...bi) });
        }
        // the edge takes the colour beside it (rice above, nori below)
        const nx = b[1] - a[1], ny = -(b[0] - a[0]), l = Math.hypot(nx, ny) || 1, n = [nx / l, ny / l, 0];
        B.quad({ p: [a[0], a[1], d / 2 - 0.005], n, t: uvF(a[0] * 0.96, Math.max(0.002, a[1] * 0.97)) }, { p: [a[0], a[1], -d / 2 + 0.005], n, t: uvF(a[0] * 0.96, Math.max(0.002, a[1] * 0.97)) }, { p: [b[0], b[1], -d / 2 + 0.005], n, t: uvF(b[0] * 0.96, Math.max(0.002, b[1] * 0.97)) }, { p: [b[0], b[1], d / 2 - 0.005], n, t: uvF(b[0] * 0.96, Math.max(0.002, b[1] * 0.97)) });
      }
    };
  },
  bun(kind) {
    return (B, S, g) => {
      const v = g.bun[kind], m = MM, R = 50 * m, top = skin.top(v, R * 1.02), under = skin.sw(S.swatch(kind === 'melon' ? 0xe0a850 : 0xb87a3a, 0.7));
      B.lathe([[0, 0], [R * 0.84, 0], [R * 0.96, 4 * m], [R, 11 * m], [R * 0.97, 20 * m], [R * 0.88, 29 * m], [R * 0.72, 37 * m], [R * 0.48, 42.5 * m], [R * 0.22, 44.6 * m], [0, 45 * m]], 24, [under, top, top, top, top, top, top, top, top]);
      // the bag's crimped ends
      for (const sx of [-1, 1]) {
        // gathered into a pleat where it leaves the bun, flat and pinked at the end
        for (const nz of [1, -1]) { face(B, [sx * (R - 0.006), 0.008, nz * 0.006], [sx * (R + 0.008), 0.004, nz * 0.0008], [sx * (R + 0.008), 0.03, nz * 0.0008], [sx * (R - 0.006), 0.024, nz * 0.006], [sx * 0.4, 0, nz], (s, t) => g.bunFin.st(s * 0.3, t)); face(B, [sx * (R + 0.008), 0.004, nz * 0.0008], [sx * (R + 0.024), 0.002, nz * 0.0006], [sx * (R + 0.024), 0.032, nz * 0.0006], [sx * (R + 0.008), 0.03, nz * 0.0008], [0, 0, nz], (s, t) => g.bunFin.st(0.3 + s * 0.7, t)); }
        teeth(B, [sx * (R + 0.024), 0.002, 0], [sx * (R + 0.024), 0.032, 0], [sx * 0.003, 0, 0], 6, g.bunFin.st(0.5, 0.5));
      }
    };
  },
  food_purin(B, S, g) {
    const m = MM, r0 = 27 * m, r1 = 35 * m, h = 56 * m, lip = skin.sw(S.swatch(0xf4f0e6, 0.4));
    B.lathe([[0, 1.5 * m], [r0 * 0.8, 1.5 * m], [r0 * 0.9, 0], [r0, 2 * m], [r1, h - 3 * m], [r1 + 2.5 * m, h - 2 * m], [r1 + 2.5 * m, h - 0.5 * m], [r1 + 1.5 * m, h], [0, h]], 28, [lip, lip, lip, skin.wrap(g.purin, 0, 1), lip, lip, lip, skin.top(g.purinLid, r1 + 2.5 * m)]);
  },
  puff_stick(B, S, g) {
    const m = MM, r = 15 * m, y0 = 12 * m, y1 = 128 * m, end = skin.wrap(g.puff, 0, 0.02);
    B.lathe([[r * 0.25, y0 - 2 * m], [r, y0 + 5 * m], [r, y1 - 5 * m], [r * 0.25, y1 + 2 * m]], 20, [end, skin.wrap(g.puff, 0.03, 0.97), skin.wrap(g.puff, 0.98, 1)]);
    const fin = (s, t) => g.puff.st(0.02 + s * 0.2, t * 0.04);
    for (const [ya, yb] of [[2 * m, y0], [y1, 138 * m]]) for (const nz of [1, -1]) face(B, [-r * 0.95 * nz, ya, nz * 0.0006], [r * 0.95 * nz, ya, nz * 0.0006], [r * 0.95 * nz, yb, nz * 0.0006], [-r * 0.95 * nz, yb, nz * 0.0006], [0, 0, nz], fin);
    teeth(B, [-r * 0.95, 2 * m, 0], [r * 0.95, 2 * m, 0], [0, -2 * m, 0], 7, fin(0.5, 0.5)); teeth(B, [-r * 0.95, 138 * m, 0], [r * 0.95, 138 * m, 0], [0, 2 * m, 0], 7, fin(0.5, 0.5));
  },
  candy_piece(B, S, g) {
    const m = MM, v = g.candy;
    // a wrapped sweet lying along x: the lathe is built upright, then turned
    const L = new Build();
    L.lathe([[0, -11 * m], [5 * m, -10 * m], [9 * m, -6.5 * m], [11 * m, 0], [9 * m, 6.5 * m], [5 * m, 10 * m], [0, 11 * m]], 16, [skin.wrap(v, 0, 0.15), skin.wrap(v, 0.15, 0.32), skin.wrap(v, 0.32, 0.5), skin.wrap(v, 0.5, 0.68), skin.wrap(v, 0.68, 0.85), skin.wrap(v, 0.85, 1)]);
    for (let i = 0; i < L.p.length; i += 3) { const x = L.p[i], y = L.p[i + 1]; L.p[i] = y; L.p[i + 1] = -x + 11 * m; const nx = L.n[i], ny = L.n[i + 1]; L.n[i] = ny; L.n[i + 1] = -nx; }
    B.p.push(...L.p); B.n.push(...L.n); B.t.push(...L.t);
    for (const sx of [-1, 1]) for (const nz of [1, -1]) B.tri({ p: [sx * 10 * m, 11 * m, 0], n: [0, 0, nz], t: v.st(0.5, 0.5) }, { p: [sx * 30 * m, 22 * m, nz * 0.0005], n: [0, 0, nz], t: v.st(0.1, 0.9) }, { p: [sx * 30 * m, 0, nz * 0.0005], n: [0, 0, nz], t: v.st(0.1, 0.1) });
  },
  battery_pack(B, S, g) {
    const v = g.battery, w = 0.084, h = 0.124, d = 0.0016;
    pack(B, w, h, d, { front: part(v, 0, 0, 0.5, 1), back: part(v, 0.5, 0, 1, 1), left: flat(S, 0xe8e0c8), right: flat(S, 0xe8e0c8), top: flat(S, 0xe8e0c8), bottom: flat(S, 0xe8e0c8) });
    // four cells standing in a row on the card (under a blister you can't see for the glare)
    const m = MM, r = 7 * m, cap = skin.sw(S.swatch(0xc9ced4, R_METAL)), L = new Build();
    L.lathe([[0, 0], [r * 0.9, 0], [r, 1 * m], [r, 47 * m], [r * 0.9, 48 * m], [r * 0.34, 48 * m], [r * 0.34, 50 * m], [0, 50 * m]], 16, [cap, cap, skin.wrap(g.cell, 0, 1), cap, cap, cap, cap]);
    for (let k = 0; k < 4; k++) { const ox = (k - 1.5) * 0.0152, oz = d / 2 + r, oy = 0.012; for (let i = 0; i < L.p.length; i += 3) { B.p.push(L.p[i] + ox, L.p[i + 1] + oy, L.p[i + 2] + oz); B.n.push(L.n[i], L.n[i + 1], L.n[i + 2]); } B.t.push(...L.t); }
  },
  tube_box(B, S, g) {
    // 1.22 m along x, 40 mm square: six stretches of the printed sleeve on each long face
    const L = 1.22, s = 0.04, n = 6, v = g.tube, hy = s;
    for (let k = 0; k < n; k++) {
      const x0 = -L / 2 + (k / n) * L, x1 = x0 + L / n, A = part(v, 0, 0.5, 1, 1), Bf = part(v, 0, 0, 1, 0.5);
      face(B, [x0, 0, s / 2], [x1, 0, s / 2], [x1, hy, s / 2], [x0, hy, s / 2], [0, 0, 1], A);
      face(B, [x1, 0, -s / 2], [x0, 0, -s / 2], [x0, hy, -s / 2], [x1, hy, -s / 2], [0, 0, -1], A);
      face(B, [x0, hy, s / 2], [x1, hy, s / 2], [x1, hy, -s / 2], [x0, hy, -s / 2], [0, 1, 0], Bf);
      face(B, [x0, 0, -s / 2], [x1, 0, -s / 2], [x1, 0, s / 2], [x0, 0, s / 2], [0, -1, 0], Bf);
    }
    const e = (ss, t) => g.tubeEnd.st(ss, t);
    face(B, [L / 2, 0, s / 2], [L / 2, 0, -s / 2], [L / 2, hy, -s / 2], [L / 2, hy, s / 2], [1, 0, 0], e);
    face(B, [-L / 2, 0, -s / 2], [-L / 2, 0, s / 2], [-L / 2, hy, s / 2], [-L / 2, hy, -s / 2], [-1, 0, 0], e);
  },
  broom(B, S, g) {
    // the head: a fan of twigs, wide and thin at the tips, bound tight where it meets the cane
    const v = g.broomHead, y1 = 0.62, w0 = 0.15, w1 = 0.035, d0 = 0.045, d1 = 0.022;
    const F = (s, t) => v.st(s, 1 - (1 - t) * 1), E = (s, t) => v.st(0.02 + s * 0.06, t);
    face(B, [-w0, 0, d0], [w0, 0, d0], [w1, y1, d1], [-w1, y1, d1], [0, 0.05, 1], F);
    face(B, [w0, 0, -d0], [-w0, 0, -d0], [-w1, y1, -d1], [w1, y1, -d1], [0, 0.05, -1], F);
    face(B, [w0, 0, d0], [w0, 0, -d0], [w1, y1, -d1], [w1, y1, d1], [1, 0.2, 0], E);
    face(B, [-w0, 0, -d0], [-w0, 0, d0], [-w1, y1, d1], [-w1, y1, -d1], [-1, 0.2, 0], E);
    face(B, [-w0, 0, -d0], [w0, 0, -d0], [w0, 0, d0], [-w0, 0, d0], [0, -1, 0], E);
    // the cane, a red hanging loop, the maker's paper tag on a string
    B.lathe([[0.013, 0.42], [0.013, 1.3], [0.008, 1.316], [0, 1.316]], 12, [skin.wrap(g.cane, 0, 1), skin.sw(S.swatch(0xa89048, 0.6)), skin.sw(S.swatch(0xa89048, 0.6))]);
    B.lathe([[0.04, 0.6], [0.04, 0.64], [0.014, 0.66]], 12, [skin.sw(S.swatch(0x2e3a2c, 0.9)), skin.sw(S.swatch(0x2e3a2c, 0.9))]);
    const red = S.swatch(0xd83a2a, 0.8)();
    face(B, [-0.002, 1.25, 0.014], [0.002, 1.25, 0.014], [0.014, 1.2, 0.02], [0.01, 1.2, 0.02], [0, 0, 1], () => red);
    const tagF = [[-0.004, 0.655, 0.052], [0.044, 0.655, 0.052], [0.044, 0.73, 0.032], [-0.004, 0.73, 0.032]], paper = S.swatch(0xf4ead2, R_PAPER)();
    face(B, tagF[0], tagF[1], tagF[2], tagF[3], [0, 0.25, 1], (s, t) => g.broomTag.st(s, t));
    face(B, tagF[1].map((q, i) => q - (i === 2 ? 0.0006 : 0)), tagF[0].map((q, i) => q - (i === 2 ? 0.0006 : 0)), tagF[3].map((q, i) => q - (i === 2 ? 0.0006 : 0)), tagF[2].map((q, i) => q - (i === 2 ? 0.0006 : 0)), [0, -0.25, -1], () => paper);
    face(B, [0.019, 0.73, 0.032], [0.021, 0.73, 0.032], [0.003, 0.77, 0.014], [0.001, 0.77, 0.014], [0, 0, 1], () => red);
  },
  rm_ticket(B, S, g) {
    const v = g.ticket, e = flat(S, 0xe8e4d8, R_PAPER);
    pack(B, 0.057, 0.042, 0.0008, { front: part(v, 0, 0, 0.5, 1), back: part(v, 0.5, 0, 1, 1), left: e, right: e, top: e, bottom: e });
  },
  seed_packet(B, S, g) {
    const v = g.seeds, e = flat(S, 0xe8e4d0, R_PAPER);
    pack(B, 0.085, 0.12, 0.004, { front: part(v, 0, 0, 0.5, 1), back: part(v, 0.5, 0, 1, 1), left: e, right: e, top: e, bottom: e });
  },
  fertiliser(B, S, g) {
    const v = g.fert, a = 204 / 624, b = 312 / 624, c = 516 / 624, e = flat(S, 0x58a84a, R_PAPER);
    pack(B, 0.102, 0.138, 0.054, { front: part(v, 0, 0, a, 1), right: part(v, a, 0, b, 1), back: part(v, b, 0, c, 1), left: part(v, c, 0, 1, 1), top: e, bottom: flat(S, 0x8a5a2a, R_PAPER) });
  },
};
const MODELS = {
  milk_carton: MODEL.milk_carton, room_cupnoodle: MODEL.room_cupnoodle, battery_pack: MODEL.battery_pack, tube_box: MODEL.tube_box, broom: MODEL.broom,
  food_onigiri_ume: MODEL.onigiri('ume'), food_onigiri_tuna: MODEL.onigiri('tuna'), food_onigiri_shake: MODEL.onigiri('shake'),
  food_melonpan: MODEL.bun('melon'), food_anpan: MODEL.bun('an'), food_purin: MODEL.food_purin,
  puff_stick: MODEL.puff_stick, candy_piece: MODEL.candy_piece, seed_packet: MODEL.seed_packet, fertiliser: MODEL.fertiliser, rm_ticket: MODEL.rm_ticket,
};
export const GOODS = Object.keys(MODELS);
const geos = new Map();
export function goodsGeometry(id) {
  if (geos.has(id)) return geos.get(id);
  const S = sheet(), B = new Build();
  MODELS[id](B, S, S.g);
  const g = B.geometry();
  geos.set(id, g);
  return g;
}
/** One of Mikawa-ya's goods as a mesh (bottom-centre origin, front to +z), or null if this module doesn't model it. */
export function goodsMesh(id, opts = {}) {
  if (!MODELS[id]) return null;
  const m = new THREE.Mesh(goodsGeometry(id), sheet().material());
  m.castShadow = opts.castShadow ?? true; m.receiveShadow = opts.receiveShadow ?? true;
  m.name = 'goods:' + id;
  return m;
}
export const goodsSheet = sheet;
export { P as GOODS_ART, R_GLASS, R_PLASTIC, dk, ribbon, Px };
