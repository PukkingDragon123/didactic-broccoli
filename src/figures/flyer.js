// Display cards (台紙) laid out like real capsule-toy flyers, as pixel art at 640 x 560: the maker's mark, a big kana /
// kanji logo over a small romaji line, the price disc (1回 ¥300), 全5種 + シークレット, a hero shot of the figures on a
// themed background with a gimmick call-out, the numbered line-up with names and the secret's silhouette, a 注意 box,
// the age mark, a barcode and the maker's address line. Makers, names, addresses and codes are all made up.
// Drawn by bannerCanvas (src/gfx/banner.js) for any series with a `flyer` spec:
//   flyer: { maker, scene, hero, side: [id, id], title: [[text, scale]...], catch, sub, gimmick }
// Series without one get a spec made up from their data (src/gfx/banner.js flyerSpec): every card is a flyer.
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
  kamenoko: {
    jp: 'かめのこ舎', en: 'KAMENOKO-SHA', addr: '森尾市石だたみ4-2-16', tel: '0990-48-5510', col: 0x4f8a4a,
    mark(p, x, y) {
      // a tortoise, shell up, walking right
      const sh = 0x4f8a4a, dk = 0x2f5a30, lt = 0x8fc06a;
      for (let j = 0; j < 14; j++) for (let i = -14; i <= 14; i++) if ((i * i) / 196 + ((13 - j) * (13 - j)) / 169 <= 1) p.px(x + 16 + i, y + 6 + j, sh);
      for (const [cx, cy] of [[10, 13], [16, 10], [22, 13], [16, 16]]) { p.rect(x + cx - 2, y + cy - 2, 5, 4, lt); p.frame(x + cx - 3, y + cy - 3, 7, 6, dk); }
      p.rect(x + 2, y + 19, 29, 2, dk);
      p.rect(x + 29, y + 13, 5, 5, 0xb9c88a); p.px(x + 32, y + 14, INK);
      for (const fx of [5, 12, 20, 26]) p.rect(x + fx, y + 21, 3, 4, 0xb9c88a);
      for (let i = 0; i < 35; i += 3) p.px(x + i, y + 28, dk);
    },
  },
  tsukushi: {
    jp: 'つくし企画', en: 'TSUKUSHI KIKAKU', addr: '森尾市土手下1-9', tel: '0990-12-3304', col: 0xb07a3a,
    mark(p, x, y) {
      // two horsetail sprouts out of a bank
      const st = 0xd9b07a, hd = 0xa0683a, dk = 0x6a4428;
      for (const [cx, top] of [[11, 3], [23, 8]]) {
        p.rect(x + cx - 1, y + top + 9, 3, 26 - top - 9, st);
        for (let k = 0; k < 3; k++) p.rect(x + cx - 2, y + top + 12 + k * 4, 5, 1, dk);
        for (let j = 0; j < 9; j++) { const w = j < 2 ? 1 : j < 7 ? 3 : 2; p.rect(x + cx - w, y + top + j, w * 2 + 1, 1, (j % 3 === 1) ? dk : hd); }
      }
      for (let j = 0; j < 5; j++) p.rect(x + 2 + j, y + 25 + j, 31 - j * 2, 1, j ? 0x7aa04a : 0x9ac05a);
    },
  },
  hoshimaru: {
    jp: 'ほしまる玩具', en: 'HOSHIMARU GANGU', addr: '森尾市たなばた町5-5-1', tel: '0990-70-0707', col: 0x3a5aa8,
    mark(p, x, y) {
      // a five-pointed star in a ring
      p.circle(x + 17, y + 15, 14, 0x3a5aa8); p.circle(x + 17, y + 15, 12, PAPER);
      for (let j = -11; j <= 11; j++) for (let i = -11; i <= 11; i++) {
        const a = Math.atan2(j, i) + Math.PI / 2, r = Math.hypot(i, j), k = Math.cos(((((a % (Math.PI * 0.4)) + Math.PI * 0.4) % (Math.PI * 0.4)) - Math.PI * 0.2));
        if (r <= 10 * (0.48 + 0.52 * Math.pow(k, 9))) p.px(x + 17 + i, y + 15 + j, j < -2 ? 0xffd23f : 0xf2b62a);
      }
    },
  },
  dondoko: {
    jp: 'どんどこ屋', en: 'DONDOKO-YA', addr: '森尾市みやしろ2-11', tel: '0990-63-1188', col: 0xb8402e,
    mark(p, x, y) {
      // a taiko drum and its sticks
      const rd = 0xb8402e, dk = 0x6a2418, sk = 0xf2dcae;
      for (let j = 0; j < 18; j++) { const w = 12 + Math.round(2 * Math.sin((j / 17) * Math.PI)); p.rect(x + 17 - w, y + 9 + j, w * 2, 1, j < 3 || j > 14 ? dk : rd); }
      for (let i = -12; i <= 12; i++) { p.px(x + 17 + i, y + 8, sk); p.px(x + 17 + i, y + 7, sk); }
      for (let i = -10; i <= 10; i += 4) { p.px(x + 17 + i, y + 12, 0xf2c23a); p.px(x + 17 + i, y + 23, 0xf2c23a); }
      p.line(x + 6, y + 1, x + 15, y + 7, 0xa0683a); p.line(x + 28, y + 1, x + 19, y + 7, 0xa0683a);
      p.rect(x + 5, y, 2, 2, 0xe8e0c8); p.rect(x + 28, y, 2, 2, 0xe8e0c8);
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

/** A filled polygon (scanline, pixel centres). */
function fillPoly(p, pts, col) {
  const ys = pts.map((q) => q[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const xs = [], yc = y + 0.5;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) * (bx - ax) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) p.px(x, y, col);
  }
}
const overlap = (a, b, m = 0) => a[0] < b[0] + b[2] + m && a[0] + a[2] + m > b[0] && a[1] < b[1] + b[3] + m && a[1] + a[3] + m > b[1];
const area = (a, b) => Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
/** Wrap a name into at most `rows` lines of `max` characters (breaking where the script changes, near the middle). */
function wrapName(name, max, rows) {
  const out = [];
  let rest = name;
  while (rest && out.length < rows) {
    if ([...rest].length <= max) { out.push(rest); break; }
    const [a] = twoLines(rest, Math.min(max, Math.ceil([...rest].length / Math.max(1, rows - out.length))));
    const head = [...a].length <= max ? a : [...rest].slice(0, max).join('');
    out.push(head); rest = [...rest].slice([...head].length).join('');
  }
  return out;
}

/**
 * Draw the flyer for series s onto p (a 640 x 560 Pix). K: banner.js's pixel helpers; scenes: the scene painters. The
 * call-out and the sub line are placed where they cover neither the hero nor the lettering (the first free spot of a
 * few a designer would try), and the line-up fits any number of figures.
 */
export function drawFlyer(p, s, thumbs, K, scenes) {
  const W = FLYER_W, H = FLYER_H, F = s.flyer, M = MAKERS[F.maker] || MAKERS.mogura;
  const ac = K.hex(s.card.accent), ac2 = K.hex(s.card.accent2 || s.card.accent), bg = K.hex(s.card.bg);
  const item = (id) => s.items.find((i) => i.id === id);
  const regular = s.items.filter((i) => i.rarity !== 'secret'), secret = s.items.filter((i) => i.rarity === 'secret');
  const taken = []; // what the call-outs keep off: [x, y, w, h]
  const thumb = (key, o) => { try { return thumbs.item(key, o); } catch (e) { console.warn('flyer thumb', key, e.message); return null; } };
  const stick = (cv, cx, foot, shadow = true) => {
    if (!cv) return [cx - 40, foot - 80, 80, 80];
    const b = K.alphaBounds(cv), dx = Math.round(cx - (b.x + b.w / 2)), dy = Math.round(foot - (b.y + b.h));
    if (shadow) K.shadowEllipse(p, cx, foot - 1, Math.round(b.w * 0.44), Math.max(3, Math.round(b.w * 0.08)), 0x2a1e2a);
    p.flush(); p.ctx.drawImage(cv, dx, dy); p.pull();
    return [dx + b.x, dy + b.y, b.w, b.h];
  };

  // ---- the scene and the hero shot
  try { (typeof F.scene === 'function' ? F.scene : scenes[F.scene] || scenes.plain)(p, K, s, SCENE_H); } catch (e) { console.warn('flyer scene', s.id, e); p.rect(0, 0, W, SCENE_H, bg); }
  p.flush(); p.pull();
  const hero = item(F.hero) || regular[regular.length - 1], sides = (F.side || []).map(item).filter(Boolean);
  let heroR = [HERO_X - 110, 110, 220, 210];
  if (thumbs) {
    const foot = SCENE_H - 22;
    sides.forEach((it, i) => taken.push(stick(thumb(it.key, { size: 124 }), i === 0 ? 72 : 190, foot + 2 - i * 8)));
    heroR = stick(thumb(hero.key, { size: 240 }), HERO_X, foot);
  }
  taken.push(heroR);

  // ---- the top: maker, logo, romaji, catch copy
  K.rrect(p, 8, 8, 132, 42, 6, INK); K.rrect(p, 9, 9, 130, 40, 5, PAPER);
  M.mark(p, 14, 13);
  p.text(M.jp, 54, 11, { size: 16, color: INK });
  p.tinyText(M.en, 55, 34, { color: M.col });
  taken.push([8, 8, 132, 42]);
  const title = F.title || [[s.jp, [...s.jp].length > 4 ? 2 : 4]];
  let ty = 60, tw = 0;
  title.forEach(([t, sc, which], i) => {
    const colr = (which ? which === 'a' : i === title.length - 1) ? ac : ac2, opt = { fill: K.mixC(colr, 0xffffff, 0.06), outer: INK, bounce: sc >= 4 ? 3 : 2 };
    const w = logo(p, K, t, 0, 0, sc, { ...opt, measure: true }), x0 = 16 + (sc >= 4 ? 0 : 6);
    logo(p, K, t, x0 + w / 2, ty, sc, opt);
    tw = Math.max(tw, x0 + w + 6);
    ty += 16 * sc + (sc >= 4 ? 12 : 9);
  });
  const rom = s.romaji || s.name.toUpperCase(), rw = p.measure(rom, 8, FONT_EN) + 16;
  K.rrect(p, 12, ty - 1, rw, 13, 3, INK);
  p.tinyText(rom, 12 + Math.round(rw / 2), ty + 1, { color: PAPER, align: 'center' });
  taken.push([8, 52, Math.max(tw, rw + 14), ty + 14 - 52]);
  const romB = ty + 14;
  if (F.catch) {
    const cw = Math.round(p.measure(F.catch, 16)) + 22, cx = Math.max(150 + cw / 2, Math.min(W - 140 - cw / 2, 328));
    K.rrect(p, cx - cw / 2, 12, cw, 26, 4, INK); K.rrect(p, cx - cw / 2 + 2, 14, cw - 4, 22, 3, ac2);
    p.text(F.catch, cx, 16, { size: 16, color: INK, align: 'center' });
    taken.push([cx - cw / 2, 12, cw, 26]);
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
  taken.push([px - 54, 8, 108, 108], [W - 138, 122, 132, 62]);

  // ---- free spots: the first candidate that keeps off everything, else the one that covers the hero least
  const inside = (r) => r[0] >= 4 && r[1] >= 4 && r[0] + r[2] <= W - 4 && r[1] + r[3] <= LINE_Y - 12;
  const place = (cands) => {
    let best = null, bs = Infinity;
    for (const r of cands) {
      if (!inside(r)) continue;
      if (!taken.some((t) => overlap(r, t, 3))) return r;
      if (taken.some((t) => t !== heroR && overlap(r, t, 3))) continue;
      const sc = area(r, heroR);
      if (sc < bs) { bs = sc; best = r; }
    }
    return best;
  };
  const scan = (x0, x1, y0, y1, w, h, step = 6) => { const out = []; for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) out.push([Math.round(x), Math.round(y), w, h]); return out; };

  // ---- the gimmick call-out, pointing at the hero
  if (F.gimmick) {
    const one = [F.gimmick], two = twoLines(F.gimmick, Math.ceil([...F.gimmick].length / 2));
    const size = (L) => [Math.round(Math.max(...L.map((l) => p.measure(l, 16)))) + 26, 16 * L.length + 14];
    let spot = null, lines = one;
    for (const L of [one, two]) {
      const [w, h] = size(L), hx = heroR[0] + heroR[2] / 2;
      spot = place([
        ...scan(W - 8 - w, W - 8 - w, 190, LINE_Y - 12 - h, w, h),
        [Math.round(hx - w / 2), heroR[1] - h - 18, w, h], [Math.round(hx + 10 - w), heroR[1] - h - 18, w, h], [Math.round(hx - 10), heroR[1] - h - 18, w, h],
        ...scan(tw + 4, W - 146 - w, 44, 150, w, h, 8),
        ...scan(heroR[0] + heroR[2] + 4, W - 8 - w, 190, LINE_Y - 12 - h, w, h),
        ...scan(8, heroR[0] - w - 4, romB + 4, LINE_Y - 12 - h, w, h),
      ]);
      lines = L;
      if (spot && !overlap(spot, heroR, 3)) break;
    }
    if (spot) {
      const [gx, gy, gw, gh] = spot, cx = gx + gw / 2, cy = gy + gh / 2;
      // the tail: from the bubble's edge nearest the hero towards it, stopping just short
      const tx = Math.max(heroR[0] + heroR[2] * 0.25, Math.min(heroR[0] + heroR[2] * 0.75, cx)), tyy = Math.max(heroR[1] + 14, Math.min(heroR[1] + heroR[3] * 0.5, cy));
      const cl = (v, a, b) => Math.max(a, Math.min(b, v)), under = tx > gx + 10 && tx < gx + gw - 10;
      const ex = under ? cl(tx, gx + 16, gx + gw - 16) : tx > cx ? gx + gw - 8 : gx + 8, ey = under ? (tyy > cy ? gy + gh - 6 : gy + 6) : cl(tyy, gy + 10, gy + gh - 10);
      let dx = tx - ex, dy = tyy - ey;
      const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const L = Math.max(14, Math.min(30, dl - 4)), tip = [ex + dx * (L + (under ? 6 : 8)), ey + dy * (L + (under ? 6 : 8))], nx = -dy * 8, ny = dx * 8;
      const base = [[ex + nx, ey + ny], [ex - nx, ey - ny]];
      fillPoly(p, [[base[0][0] + nx * 0.25, base[0][1] + ny * 0.25], [base[1][0] - nx * 0.25, base[1][1] - ny * 0.25], [tip[0] + dx * 3, tip[1] + dy * 3]], INK);
      K.rrect(p, gx, gy, gw, gh, 10, INK);
      fillPoly(p, [base[0], base[1], tip], PAPER);
      K.rrect(p, gx + 2, gy + 2, gw - 4, gh - 4, 9, PAPER);
      lines.forEach((l, k) => p.text(l, cx, gy + 7 + k * 16, { size: 16, color: RED, align: 'center' }));
      taken.push(spot);
    }
  }
  if (F.sub) {
    const sw = Math.round(p.measure(F.sub, 16)) + 20, sh = 26;
    const spot = place([
      [12, romB + 4, sw, sh], [W - 12 - sw, 296, sw, sh], ...scan(W - 12 - sw, W - 12 - sw, 190, 296, sw, sh),
      ...scan(8, W - 12 - sw, LINE_Y - 12 - sh, LINE_Y - 12 - sh, sw, sh, 8), ...scan(tw + 4, W - 146 - sw, 44, 160, sw, sh, 8),
    ]) || [W - 12 - sw, 296, sw, sh];
    const [sx, sy] = spot;
    K.rrect(p, sx, sy, sw, sh, 12, INK); K.rrect(p, sx + 2, sy + 2, sw - 4, sh - 4, 11, ac);
    p.text(F.sub, sx + sw / 2, sy + 4, { size: 16, color: PAPER, align: 'center' });
  }

  // ---- the line-up (any number of figures: the tiles narrow, names wrap onto up to three lines)
  p.rect(0, LINE_Y, W, FOOT_Y - LINE_Y, K.mixC(ac, 0xffffff, 0.82));
  for (let j = LINE_Y; j < FOOT_Y; j++) for (let i = (j % 6) * 2; i < W; i += 12) if ((i + j) % 4 === 0) p.px(i, j, K.mixC(ac, 0xffffff, 0.62));
  p.rect(0, LINE_Y, W, 3, INK); p.rect(0, LINE_Y + 3, W, 2, ac2);
  K.rrect(p, 8, LINE_Y - 9, 128, 22, 5, INK); K.rrect(p, 10, LINE_Y - 7, 124, 18, 4, ac);
  p.text('ラインナップ', 72, LINE_Y - 7, { size: 16, color: PAPER, align: 'center' });
  const all = [...regular, ...secret], n = all.length, tileW = Math.min(98, Math.floor((W - 16 - 4 * (n - 1)) / n)), gap = n > 1 ? Math.floor((W - 16 - tileW * n) / (n - 1)) : 0, ox = Math.round((W - (tileW * n + gap * (n - 1))) / 2);
  const maxCh = Math.max(2, Math.floor((tileW - 6) / 16));
  all.forEach((it, i) => {
    const x = ox + i * (tileW + gap), y = LINE_Y + 18, sec = it.rarity === 'secret';
    const lines = sec ? wrapName('シークレット', maxCh, 2) : (it.jpLines && it.jpLines.every((l) => [...l].length <= maxCh) ? it.jpLines : wrapName(it.jp, maxCh, 3));
    const ts = Math.max(40, Math.min(72, tileW - 8, 104 - lines.length * 16)), ty0 = y + 4 + ts;
    K.rrect(p, x, y, tileW, 112, 7, INK); K.rrect(p, x + 2, y + 2, tileW - 4, 108, 6, sec ? 0x2e2838 : PAPER);
    if (sec) for (let j = 4; j < ts; j += 4) for (let q = 4 + (j % 8); q < tileW - 4; q += 8) p.px(x + q, y + j, 0x4a4258);
    const cv = thumbs && thumb(it.key, { size: ts, silhouette: sec });
    if (cv) { p.flush(); p.ctx.drawImage(cv, x + Math.round((tileW - ts) / 2), y + 3); p.pull(); }
    if (sec) p.text('?', x + tileW / 2, y + Math.round(ts * 0.28), { size: 32, color: 0xffe14a, align: 'center', font: FONT_EN, outline: INK });
    p.circle(x + 11, y + 11, 8, INK); p.circle(x + 11, y + 11, 7, sec ? 0xffe14a : ac);
    p.tinyText(sec ? '?' : String(i + 1), x + 12, y + 7, { color: sec ? INK : PAPER, align: 'center' });
    p.rect(x + 6, ty0, tileW - 12, 1, sec ? 0x5a5268 : K.mixC(ac, 0xffffff, 0.5));
    const room = y + 110 - ty0, top = ty0 + Math.max(1, Math.round((room - lines.length * 16) / 2)) - 1;
    lines.forEach((l, k) => p.text(l, x + tileW / 2, top + k * 16, { size: 16, color: sec ? 0xffe14a : INK, align: 'center' }));
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
  barcode(p, 446, fy + 4, 88, 34, s.order * 77 + s.price + s.id.length * 13, `49${String(s.order * 3917 + 10000 + s.id.length * 7).slice(0, 5)} ${String(s.price * 271 + 10007).slice(0, 5)}${s.order % 10}`);
  M.mark(p, 572, fy - 1);
  p.text(M.jp, 590, fy + 32, { size: 16, color: INK, align: 'center' });
  p.rect(8, fy + 60, W - 16, 1, 0xb8b0a8);
  p.text(`発売元 ${M.jp} ${M.addr}`, 8, H - 19, { size: 16, color: 0x4a4450 });
  p.tinyText(`TEL ${M.tel} (C)1999 ${M.en} MADE IN JAPAN`, W - 8, H - 13, { color: 0x4a4450, align: 'right' });
  // a keyline round the sheet
  p.frame(0, 0, W, H, INK);
}
