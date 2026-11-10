// Display cards (台紙) laid out like real capsule-toy flyers, as pixel art at 640 x 560: the maker's mark, a big kana /
// kanji logo over a small romaji line, the price disc (1回 ¥300), 全5種 + シークレット, a hero shot of the figures on a
// themed background with a gimmick call-out, the numbered line-up with names and the secret's silhouette, a 注意 box,
// the age mark, a barcode and the maker's address line. Makers, names, addresses and codes are all made up.
// Drawn by bannerCanvas (src/gfx/banner.js) for any series with a `flyer` spec:
//   flyer: { maker, scene, hero, side: [id, id], title: [[text, scale]...], catch, sub, gimmick }
import { FONT_EN } from '../gfx/pix.js';

export const FLYER_W = 640;
export const FLYER_H = 560;
const SCENE_H = 338, LINE_Y = 338, FOOT_Y = 474, HERO_X = 392;
const INK = 0x2a2430, PAPER = 0xfffdf6, RED = 0xd8382c;

/** The makers (all invented): name, romaji, address line, and a little pixel mark drawn at (x, y), about 30 px tall. */
export const MAKERS = {
  mogura: {
    jp: 'もぐら工房', en: 'MOGURA KOBO', addr: '森尾市うら町3-12-8', tel: '0990-31-2008', col: 0x8a5a3a,
    mark(p, x, y) {
      // a mole coming up out of its heap
      for (let j = 0; j < 12; j++) for (let i = -17; i <= 17; i++) if ((i * i) / 289 + ((11 - j) * (11 - j)) / 132 <= 1) p.px(x + 17 + i, y + 18 + j, j < 2 ? 0xb07a4e : 0x8a5a3a);
      p.circle(x + 17, y + 13, 9, 0x4a3a44); p.circle(x + 17, y + 13, 8, 0x5c4a56);
      p.rect(x + 12, y + 11, 2, 2, 0xfffdf6); p.rect(x + 21, y + 11, 2, 2, 0xfffdf6); p.rect(x + 13, y + 12, 1, 1, INK); p.rect(x + 22, y + 12, 1, 1, INK);
      p.rect(x + 15, y + 15, 5, 3, 0xf2a0a8); p.rect(x + 16, y + 14, 3, 1, 0xf2a0a8);
      p.rect(x + 6, y + 20, 5, 3, 0xf2c8b8); p.rect(x + 24, y + 20, 5, 3, 0xf2c8b8);
      for (let i = 0; i < 35; i += 3) p.px(x + i, y + 29, 0x6a4428);
    },
  },
  manpuku: {
    jp: 'まんぷく堂', en: 'MANPUKUDO', addr: '森尾市のれん通り2-5', tel: '0990-52-1129', col: 0xd8382c,
    mark(p, x, y) {
      // a bowl, full, under a round seal
      p.circle(x + 17, y + 15, 15, 0xd8382c); p.circle(x + 17, y + 15, 13, PAPER);
      for (let j = 0; j < 8; j++) { const w = 10 - Math.round(j * j / 9); p.rect(x + 17 - w, y + 16 + j, w * 2, 1, 0xd8382c); }
      p.rect(x + 8, y + 14, 18, 2, 0xf2c23a); p.rect(x + 10, y + 12, 14, 2, 0xf2d27c); p.rect(x + 13, y + 10, 8, 2, 0xf2d27c);
      p.line(x + 20, y + 4, x + 14, y + 12, INK); p.line(x + 23, y + 5, x + 17, y + 12, INK);
    },
  },
  nejimaki: {
    jp: 'ねじまき堂', en: 'NEJIMAKI-DO', addr: '森尾市ぜんまい町7-1', tel: '0990-77-0401', col: 0x2f8f8a,
    mark(p, x, y) {
      // a wind-up key
      const c = 0x2f8f8a, d = 0x1f6a66;
      for (const cx of [8, 26]) { p.circle(x + cx, y + 10, 8, d); p.circle(x + cx, y + 10, 7, c); p.circle(x + cx, y + 10, 4, PAPER); }
      p.rect(x + 14, y + 8, 6, 5, c); p.rect(x + 15, y + 13, 4, 14, c); p.rect(x + 13, y + 26, 8, 3, d); p.rect(x + 15, y + 17, 4, 1, d); p.rect(x + 15, y + 21, 4, 1, d);
    },
  },
};

/** Every character the flyers may draw (font preloading, together with the series' own text). */
export const FLYER_TEXT = '全種＋シークレット回円対象年齢才以上注意小さな部品があります。口の中には絶対に入れないでください。カプセルは遊び終わったら店頭の回収箱へ。写真と実際の商品は多少異なる場合があります。発売元ラインナップひみつ新登場！' + Object.values(MAKERS).map((m) => m.jp + m.addr).join('');

// ---- pixel lettering
/** EPX (Scale2x) on a 1-bit mask: doubles it with rounded diagonals instead of fat blocks. */
function epx(m) {
  const W = m.w * 2, H = m.h * 2, bits = new Uint8Array(W * H), at = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : m.bits[y * m.w + x]);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    bits[(y * 2) * W + x * 2] = C === A && C !== D && A !== B ? A : P;
    bits[(y * 2) * W + x * 2 + 1] = A === B && A !== C && B !== D ? B : P;
    bits[(y * 2 + 1) * W + x * 2] = D === C && D !== B && C !== A ? C : P;
    bits[(y * 2 + 1) * W + x * 2 + 1] = B === D && B !== A && D !== C ? D : P;
  }
  return { w: W, h: H, bits };
}
/**
 * A sticker logo: each character a little off the line, a dark outline round the whole word, a paper keyline inside
 * it, a two-tone fill with a lit top edge. scale: 1, 2 or 4 (x 16 px). Returns its width.
 */
function logo(p, K, str, cx, y, scale, { fill, fill2, outer = INK, inner = PAPER, bounce = 2, measure = false }) {
  // (kana are rounded off as they are doubled; kanji are too dense for that at 16 px and stay square)
  const kanaCh = (ch) => /[\u3040-\u30ff0-9A-Za-z]/.test(ch);
  const gap = Math.max(1, scale), masks = [...str].map((ch) => { if (!kanaCh(ch)) return K.textMask(ch, 16, scale); let m = K.textMask(ch, 16, 1); for (let s = scale; s > 1; s >>= 1) m = epx(m); return m; });
  const total = masks.reduce((a, m) => a + m.w + gap, -gap);
  if (measure) return total;
  let x = Math.round(cx - total / 2);
  const hi = K.mixC(fill, 0xffffff, 0.4), lo = fill2 ?? K.shadeC(fill, 0.86), o1 = Math.max(2, scale + 1), o2 = Math.max(1, scale >> 1);
  const L = masks.map((m, i) => { const r = { m, x, y: y + Math.round(Math.sin(i * 1.9 + 0.6) * bounce) + (16 * scale - m.h) }; x += m.w + gap; return r; });
  const put = (mm, ox, oy, col) => { for (let j = 0; j < mm.h; j++) for (let i = 0; i < mm.w; i++) if (mm.bits[j * mm.w + i]) p.px(ox + i, oy + j, typeof col === 'function' ? col(i, j, mm) : col); };
  const grown = L.map((l) => ({ a: K.dilate(l.m, o1 + o2), b: K.dilate(l.m, o2) }));
  L.forEach((l, i) => put(grown[i].a, l.x - o1 - o2 + scale, l.y - o1 - o2 + scale + 1, K.shadeC(outer, 0.55)));
  L.forEach((l, i) => put(grown[i].a, l.x - o1 - o2, l.y - o1 - o2, outer));
  L.forEach((l, i) => put(grown[i].b, l.x - o2, l.y - o2, inner));
  L.forEach((l) => put(l.m, l.x, l.y, (i, j, mm) => { const t = j / mm.h; return t < 0.12 ? hi : t < 0.62 ? fill : lo; }));
  return total;
}

/** Break a figure's name onto two lines where the script changes, nearest the middle. */
function twoLines(name, max) {
  const c = [...name];
  if (c.length <= max) return [name];
  const kind = (ch) => (/[゠-ヿ]/.test(ch) ? 'k' : /[぀-ゟ]/.test(ch) ? 'h' : /[（(]/.test(ch) ? 'p' : 'x');
  let best = Math.ceil(c.length / 2), bd = 99;
  for (let i = 2; i < c.length - 1; i++) { const d = Math.abs(i - c.length / 2) - (kind(c[i]) !== kind(c[i - 1]) ? 2.5 : 0); if (d < bd) { bd = d; best = i; } }
  return [c.slice(0, best).join(''), c.slice(best).join('')];
}

function barcode(p, x, y, w, h, seed, digits) {
  p.rect(x - 4, y - 3, w + 8, h + 13, 0xffffff);
  let a = seed * 2654435761 >>> 0, i = 0;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  while (i < w) {
    const guard = i < 3 || i > w - 4 || Math.abs(i - w / 2) < 2, bw = guard ? 1 : 1 + Math.floor(rnd() * 3), on = guard ? i % 2 === 0 : rnd() < 0.5;
    if (on) p.rect(x + i, y, Math.min(bw, w - i), guard ? h + 4 : h, 0x18161c);
    i += bw;
  }
  p.tinyText(digits, x + Math.round(w / 2), y + h + 1, { color: 0x18161c, align: 'center' });
}

/** Draw the flyer for series s onto p (a 640 x 560 Pix). K: banner.js's pixel helpers; scenes: the scene painters. */
export function drawFlyer(p, s, thumbs, K, scenes) {
  const W = FLYER_W, H = FLYER_H, F = s.flyer, M = MAKERS[F.maker] || MAKERS.mogura;
  const ac = K.hex(s.card.accent), ac2 = K.hex(s.card.accent2 || s.card.accent), bg = K.hex(s.card.bg);
  const item = (id) => s.items.find((i) => i.id === id);
  const regular = s.items.filter((i) => i.rarity !== 'secret'), secret = s.items.filter((i) => i.rarity === 'secret');
  const stick = (cv, cx, foot, shadow = true) => {
    const b = K.alphaBounds(cv), dx = Math.round(cx - (b.x + b.w / 2)), dy = Math.round(foot - (b.y + b.h));
    if (shadow) K.shadowEllipse(p, cx, foot - 1, Math.round(b.w * 0.44), Math.max(3, Math.round(b.w * 0.08)), 0x2a1e2a);
    p.flush(); p.ctx.drawImage(cv, dx, dy); p.pull();
    return b;
  };

  // ---- the scene and the hero shot
  try { (scenes[F.scene] || scenes.plain)(p, K, s, SCENE_H); } catch (e) { console.warn('flyer scene', s.id, e); p.rect(0, 0, W, SCENE_H, bg); }
  p.flush(); p.pull();
  const hero = item(F.hero) || regular[regular.length - 1], sides = (F.side || []).map(item).filter(Boolean);
  if (thumbs) {
    const foot = SCENE_H - 22;
    sides.forEach((it, i) => stick(thumbs.item(it.key, { size: 124 }), i === 0 ? 72 : 190, foot + 2 - i * 8));
    stick(thumbs.item(hero.key, { size: 240 }), HERO_X, foot);
  }

  // ---- the top: maker, logo, romaji, catch copy
  K.rrect(p, 8, 8, 132, 42, 6, INK); K.rrect(p, 9, 9, 130, 40, 5, PAPER);
  M.mark(p, 14, 13);
  p.text(M.jp, 54, 11, { size: 16, color: INK });
  p.tinyText(M.en, 55, 34, { color: M.col });
  const title = F.title || [[s.jp, [...s.jp].length > 4 ? 2 : 4]];
  let ty = 60;
  title.forEach(([t, sc, which], i) => {
    const colr = (which ? which === 'a' : i === title.length - 1) ? ac : ac2, opt = { fill: K.mixC(colr, 0xffffff, 0.06), outer: INK, bounce: sc >= 4 ? 3 : 2 };
    logo(p, K, t, 16 + logo(p, K, t, 0, 0, sc, { ...opt, measure: true }) / 2 + (sc >= 4 ? 0 : 6), ty, sc, opt);
    ty += 16 * sc + (sc >= 4 ? 12 : 9);
  });
  const rom = s.romaji || s.name.toUpperCase(), rw = p.measure(rom, 8, FONT_EN) + 16;
  K.rrect(p, 12, ty - 1, rw, 13, 3, INK);
  p.tinyText(rom, 12 + Math.round(rw / 2), ty + 1, { color: PAPER, align: 'center' });
  if (F.catch) {
    const cw = Math.round(p.measure(F.catch, 16)) + 22, cx = 328;
    K.rrect(p, cx - cw / 2, 12, cw, 26, 4, INK); K.rrect(p, cx - cw / 2 + 2, 14, cw - 4, 22, 3, ac2);
    p.text(F.catch, cx, 16, { size: 16, color: INK, align: 'center' });
  }

  // ---- the price disc and the count
  const px = W - 70, py = 62;
  K.burst(p, px, py, 50, RED, 0x7a1810);
  p.circle(px, py, 43, PAPER); p.circle(px, py, 40, RED);
  p.text('1回', px, py - 36, { size: 16, color: 0xffe14a, align: 'center' });
  p.text(`¥${s.price}`, px, py - 22, { size: 32, color: 0xffffff, align: 'center', font: FONT_EN, shadow: 0x7a1810 });
  p.rect(px - 22, py + 14, 44, 1, 0xffd0c8);
  p.tinyText('1 PLAY', px, py + 19, { color: 0xffe14a, align: 'center' });
  K.rrect(p, W - 138, 122, 132, 62, 8, INK); K.rrect(p, W - 136, 124, 128, 58, 7, 0xffe14a);
  logo(p, K, `全${regular.length}種`, W - 72, 126, 2, { fill: RED, outer: INK, bounce: 1 });
  if (secret.length) { K.rrect(p, W - 130, 162, 116, 17, 4, INK); p.text('＋シークレット', W - 72, 162, { size: 16, color: 0xffe14a, align: 'center' }); }

  // ---- the gimmick call-out, pointing at the hero
  if (F.gimmick) {
    const gw = Math.round(p.measure(F.gimmick, 16)) + 28, gx = W - 14 - gw + 24, gy = 196;
    for (let k = 0; k < 14; k++) { p.line(gx - 30 - k, gy + 32 + k, gx - 12, gy + 28, INK); p.line(gx - 30 - k, gy + 32 + k, gx + 6, gy + 28, INK); }
    K.rrect(p, gx - 24, gy, gw, 34, 10, INK); K.rrect(p, gx - 22, gy + 2, gw - 4, 30, 9, PAPER);
    for (let k = 0; k < 11; k++) p.line(gx - 28 - k, gy + 32 + k - 1, gx - 8 + k * 0.6, gy + 30, PAPER);
    p.text(F.gimmick, gx - 24 + gw / 2, gy + 8, { size: 16, color: RED, align: 'center' });
  }
  if (F.sub) {
    const sw = Math.round(p.measure(F.sub, 16)) + 20, sx = W - 12 - sw, sy = 296;
    K.rrect(p, sx, sy, sw, 26, 12, INK); K.rrect(p, sx + 2, sy + 2, sw - 4, 22, 11, ac);
    p.text(F.sub, sx + sw / 2, sy + 4, { size: 16, color: PAPER, align: 'center' });
  }

  // ---- the line-up
  p.rect(0, LINE_Y, W, FOOT_Y - LINE_Y, K.mixC(ac, 0xffffff, 0.82));
  for (let j = LINE_Y; j < FOOT_Y; j++) for (let i = (j % 6) * 2; i < W; i += 12) if ((i + j) % 4 === 0) p.px(i, j, K.mixC(ac, 0xffffff, 0.62));
  p.rect(0, LINE_Y, W, 3, INK); p.rect(0, LINE_Y + 3, W, 2, ac2);
  K.rrect(p, 8, LINE_Y - 9, 128, 22, 5, INK); K.rrect(p, 10, LINE_Y - 7, 124, 18, 4, ac);
  p.text('ラインナップ', 72, LINE_Y - 7, { size: 16, color: PAPER, align: 'center' });
  const all = [...regular, ...secret], n = all.length, tw = 98, gap = Math.floor((W - 16 - tw * n) / (n - 1)), ox = 8;
  all.forEach((it, i) => {
    const x = ox + i * (tw + gap), y = LINE_Y + 18, sec = it.rarity === 'secret';
    K.rrect(p, x, y, tw, 112, 7, INK); K.rrect(p, x + 2, y + 2, tw - 4, 108, 6, sec ? 0x2e2838 : PAPER);
    if (sec) for (let j = 4; j < 74; j += 4) for (let q = 4 + (j % 8); q < tw - 4; q += 8) p.px(x + q, y + j, 0x4a4258);
    if (thumbs) { const cv = thumbs.item(it.key, { size: 72, silhouette: sec }); p.flush(); p.ctx.drawImage(cv, x + 13, y + 3); p.pull(); }
    if (sec) p.text('?', x + tw / 2, y + 20, { size: 32, color: 0xffe14a, align: 'center', font: FONT_EN, outline: INK });
    p.circle(x + 11, y + 11, 8, INK); p.circle(x + 11, y + 11, 7, sec ? 0xffe14a : ac);
    p.tinyText(sec ? '?' : String(i + 1), x + 12, y + 7, { color: sec ? INK : PAPER, align: 'center' });
    p.rect(x + 6, y + 75, tw - 12, 1, sec ? 0x5a5268 : K.mixC(ac, 0xffffff, 0.5));
    const lines = sec ? ['シークレット'] : (it.jpLines || twoLines(it.jp, 6));
    lines.slice(0, 2).forEach((l, k) => p.text(l, x + tw / 2, y + (lines.length === 1 ? 84 : 77) + k * 16, { size: 16, color: sec ? 0xffe14a : INK, align: 'center' }));
  });

  // ---- the small print
  p.rect(0, FOOT_Y, W, H - FOOT_Y, PAPER); p.rect(0, FOOT_Y, W, 2, INK);
  const fy = FOOT_Y + 8;
  p.rect(8, fy, 316, 56, RED); p.rect(10, fy + 2, 312, 52, PAPER);
  p.rect(8, fy, 46, 56, RED);
  for (let k = 0; k < 9; k++) p.rect(31 - k, fy + 6 + k * 2, k * 2 + 1, 2, 0xffe14a);
  p.rect(30, fy + 11, 2, 7, RED); p.rect(30, fy + 20, 2, 2, RED);
  p.text('注意', 31, fy + 30, { size: 16, color: PAPER, align: 'center' });
  ['小さな部品があります。口の中には', '絶対に入れないでください。', 'カプセルは店頭の回収箱へ。'].forEach((l, k) => p.text(l, 60, fy + 2 + k * 17, { size: 16, color: INK }));
  p.rect(332, fy, 100, 56, INK); p.rect(334, fy + 2, 96, 52, PAPER);
  p.text('対象年齢', 382, fy + 3, { size: 16, color: INK, align: 'center' });
  p.rect(338, fy + 21, 88, 1, INK);
  p.text('15', 360, fy + 20, { size: 32, color: RED, align: 'center', font: FONT_EN });
  p.text('才以上', 402, fy + 30, { size: 16, color: INK, align: 'center' });
  barcode(p, 446, fy + 4, 88, 34, s.order * 77 + s.price, `49${String(s.order * 3917 + 10000).slice(0, 5)} ${String(s.price * 271 + 10007).slice(0, 5)}${s.order % 10}`);
  M.mark(p, 572, fy - 1);
  p.text(M.jp, 590, fy + 32, { size: 16, color: INK, align: 'center' });
  p.rect(8, fy + 60, W - 16, 1, 0xb8b0a8);
  p.text(`発売元 ${M.jp} ${M.addr}`, 8, H - 19, { size: 16, color: 0x4a4450 });
  p.tinyText(`TEL ${M.tel} (C)1999 ${M.en} MADE IN JAPAN`, W - 8, H - 13, { color: 0x4a4450, align: 'right' });
  // a keyline round the sheet
  p.frame(0, 0, W, H, INK);
}
