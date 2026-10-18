// Gachapon display banners (台紙 daishi): the printed card inside every machine window.
// A 320×280 pixel-art illustration per series: painted scene, the series' figures standing in it
// (pixel-rendered from the real 3D models), a chunky outlined title logo, catchphrase, price / 全N種
// badges and the numbered lineup strip with the secret silhouette — like real Bandai / Takara Tomy cards.
import * as THREE from 'three';
import { Pix, FONT_EN } from './pix.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { drawPattern } from '../game/cards.js';

// scene painters live in src/gfx/bannerScenes*.js (one file per batch of series); merged here
const sceneMods = Object.values(import.meta.glob('./bannerScenes*.js', { eager: true }));
export const SCENES = Object.assign({}, ...sceneMods.map((m) => m.SCENES || {}));
export const BANNER_TEXT = Object.assign({}, ...sceneMods.map((m) => m.BANNER_TEXT || {}));
export const SCENE_TEXT = sceneMods.map((m) => m.SCENE_TEXT || '').join('');

export const BANNER_W = 320;
export const BANNER_H = 280;
const SCENE_H = 200;

const hex = (s) => parseInt(String(s).replace('#', ''), 16);
const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const toHex = ([r, g, b]) => (Math.max(0, Math.min(255, r | 0)) << 16) | (Math.max(0, Math.min(255, g | 0)) << 8) | Math.max(0, Math.min(255, b | 0));
const shadeC = (c, f) => toHex(rgb(c).map((v) => v * f));
const mixC = (a, b, t) => { const A = rgb(a), B = rgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };

// long titles break onto two lines where a real designer would break them
const TITLE_LINES = { uchu: ['宇宙ねこ', 'ステーション'], heya: ['ミニチュアの', 'お部屋'] };
const FALLBACK_CATCH = {
  mochi: ['もちっと集合！', 'ふわふわ日和'], shokudo: ['本物そっくり！', '昭和の味'], kasa: ['雨の日が楽しみ♪', '街角コレクション'],
  showa: ['なつかしの名機たち', 'あの頃のおうち'], konbini: ['24時間いつでも！', 'いらっしゃいませ'], heya: ['ちいさな暮らし', '6畳一間の物語'],
  yokai: ['こわくないよ？', '夜の神社で…'], onsen: ['いいお湯だな〜', '露天風呂へようこそ'], dajare: ['笑いが止まらない！', '爆笑ステージ'],
  kaiju: ['街がおやつに!?', '夕暮れの大決戦'], uchu: ['宇宙へ出発ニャ！', '星の見える基地'], omamori: ['ご利益たっぷり！', '開運祈願'],
};
/** Break a long title onto two lines where the script changes (kanji / kana / katakana) nearest the middle. */
function splitTitle(t) {
  const c = [...t];
  if (c.length <= 8) return [t];
  const kind = (ch) => (/[\u30a0-\u30ff]/.test(ch) ? 'k' : /[\u3040-\u309f]/.test(ch) ? 'h' : 'x');
  let best = Math.ceil(c.length / 2), bd = 99;
  for (let i = 2; i < c.length - 1; i++) {
    const brk = kind(c[i]) !== kind(c[i - 1]) || c[i - 1] === 'の';
    const d = Math.abs(i - c.length / 2) - (brk ? 2 : 0);
    if (d < bd) { bd = d; best = i; }
  }
  return [c.slice(0, best).join(''), c.slice(best).join('')];
}

const RARITY_COL = { common: 0x9a9a9a, uncommon: 0x3fae5a, rare: 0x2f7fe0, ultra: 0xe04fb0, secret: 0xe8b020 };

export function bannerText(id) {
  const t = BANNER_TEXT[id];
  if (t) return [t.catch, t.sub];
  return FALLBACK_CATCH[id] || ['新登場！', ''];
}

/** Every character a banner may draw (for font preloading). */
export function bannerGlyphs() {
  let s = '全種円回シークレットありもあるよ対象年齢才以上カプセルトイひみつ';
  for (const id of Object.keys(SERIES_BY_ID)) {
    const se = SERIES_BY_ID[id];
    s += se.jp + bannerText(id).join('') + se.items.map((i) => i.jp).join('');
  }
  return s + SCENE_TEXT;
}

// ------------------------------------------------------------------------------------ helpers
/** Rasterise text into a boolean mask (pixel font at 16px, scaled by an integer factor for chunky letters). */
function textMask(str, size = 16, scale = 2, font = '"DotGothic16", monospace') {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.font = `${size}px ${font}`;
  const w = Math.ceil(ctx.measureText(str).width) + 4, h = Math.ceil(size * 1.3) + 4;
  c.width = w; c.height = h;
  ctx.font = `${size}px ${font}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.fillText(str, 2, 2);
  const d = ctx.getImageData(0, 0, w, h).data;
  // trim
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 110) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  if (maxX < 0) return { w: 0, h: 0, on: () => false };
  const mw = (maxX - minX + 1) * scale, mh = (maxY - minY + 1) * scale;
  const bits = new Uint8Array(mw * mh);
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const sx = minX + Math.floor(x / scale), sy = minY + Math.floor(y / scale);
    bits[y * mw + x] = d[(sy * w + sx) * 4 + 3] > 110 ? 1 : 0;
  }
  return { w: mw, h: mh, bits, on: (x, y) => x >= 0 && y >= 0 && x < mw && y < mh && bits[y * mw + x] === 1 };
}

/** Grow a mask by r pixels (square-ish disc). */
function dilate(m, r) {
  const W = m.w + r * 2, H = m.h + r * 2;
  const bits = new Uint8Array(W * H);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!m.bits[y * m.w + x]) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r) continue;
      bits[(y + r + dy) * W + (x + r + dx)] = 1;
    }
  }
  return { w: W, h: H, bits, on: (x, y) => x >= 0 && y >= 0 && x < W && y < H && bits[y * W + x] === 1 };
}

/**
 * Chunky logo text: drop shadow, dark outer outline, white inner outline, two-tone fill with a
 * highlight band. Each character bounces a little like hand-lettered card logos.
 */
function logo(p, str, cx, y, { scale = 2, fill = 0xff6f91, fill2 = null, outer = 0x3a2030, inner = 0xffffff, bounce = 2 }) {
  const chars = [...str];
  const masks = chars.map((ch) => textMask(ch, 16, scale));
  const gap = scale;
  const total = masks.reduce((a, m) => a + m.w + gap, -gap);
  let x = Math.round(cx - total / 2);
  const f2 = fill2 ?? shadeC(fill, 0.78);
  const hi = mixC(fill, 0xffffff, 0.45);
  const layers = [];
  masks.forEach((m, i) => {
    const dy = Math.round(Math.sin(i * 1.9 + 0.6) * bounce);
    layers.push({ m, x, y: y + dy + (16 * scale - m.h) });
    x += m.w + gap;
  });
  const put = (mm, ox, oy, colFn) => {
    for (let j = 0; j < mm.h; j++) for (let i = 0; i < mm.w; i++) if (mm.bits[j * mm.w + i]) p.px(ox + i, oy + j, colFn(i, j, mm));
  };
  // shadow + outer + inner, all characters first so outlines merge into one sticker shape
  for (const L of layers) { const o = dilate(L.m, 4); put(o, L.x - 4 + 3, L.y - 4 + 3, () => shadeC(outer, 0.6)); }
  for (const L of layers) { const o = dilate(L.m, 4); put(o, L.x - 4, L.y - 4, () => outer); }
  for (const L of layers) { const o = dilate(L.m, 2); put(o, L.x - 2, L.y - 2, () => inner); }
  for (const L of layers) {
    put(L.m, L.x, L.y, (i, j, mm) => {
      const t = j / mm.h;
      if (t < 0.18) return hi;
      return t < 0.55 ? fill : f2;
    });
  }
  return total;
}

/** Rounded rectangle fill. */
function rrect(p, x, y, w, h, r, c) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = i < r ? r - i - 0.5 : i >= w - r ? i - (w - r) + 0.5 : 0;
    const dy = j < r ? r - j - 0.5 : j >= h - r ? j - (h - r) + 0.5 : 0;
    if (dx * dx + dy * dy <= r * r) p.px(x + i, y + j, c);
  }
}

/** Dithered ellipse (drop shadows on the ground). */
function shadowEllipse(p, cx, cy, rx, ry, c) {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
    if (d > 1) continue;
    if (d > 0.55 && (x + y) % 2) continue;
    p.px(cx + x, cy + y, c, 150);
  }
}

/** Four-point sparkle. */
function twinkle(p, x, y, k) {
  for (let i = -k * 2; i <= k * 2; i++) { p.px(x + i, y, 0xffffff); p.px(x, y + i, 0xffffff); }
  p.px(x - 1, y - 1, 0xfff4b0); p.px(x + 1, y + 1, 0xfff4b0); p.px(x + 1, y - 1, 0xfff4b0); p.px(x - 1, y + 1, 0xfff4b0);
}

/** Starburst badge. */
function burst(p, cx, cy, r, c, edge) {
  for (let y = -r - 3; y <= r + 3; y++) for (let x = -r - 3; x <= r + 3; x++) {
    const a = Math.atan2(y, x);
    const rr = r + Math.round(Math.cos(a * 12) * 3);
    const d = Math.hypot(x, y);
    if (d <= rr + 1) p.px(cx + x, cy + y, d > rr - 1 ? edge : c);
  }
}

/** Opaque-pixel bounds of a canvas (cached). */
const boundsCache = new WeakMap();
function alphaBounds(cv) {
  if (boundsCache.has(cv)) return boundsCache.get(cv);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  let minX = cv.width, maxX = -1, minY = cv.height, maxY = -1;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 0) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const b = maxX < 0 ? { x: 0, y: 0, w: cv.width, h: cv.height } : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  boundsCache.set(cv, b);
  return b;
}

function fallbackScene(p, x, y, w, h, s) {
  const bg = hex(s.card.bg), ac = hex(s.card.accent);
  p.gradient(x, y, w, Math.round(h * 0.7), mixC(bg, 0xffffff, 0.3), mixC(bg, ac, 0.25));
  p.rect(x, y + Math.round(h * 0.7), w, h - Math.round(h * 0.7), mixC(bg, 0x5a4a3a, 0.35));
  for (let i = 0; i < w; i += 2) p.px(x + i, y + Math.round(h * 0.7), shadeC(bg, 0.7));
}

function qr(p, x, y, seed) {
  const n = 17;
  let h = seed * 9301 + 49297;
  const rnd = () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };
  p.rect(x - 1, y - 1, n + 2, n + 2, 0xffffff);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (rnd() < 0.5) p.px(x + i, y + j, 0x1a1a1a);
  for (const [fx, fy] of [[0, 0], [n - 5, 0], [0, n - 5]]) {
    p.rect(x + fx, y + fy, 5, 5, 0x1a1a1a); p.rect(x + fx + 1, y + fy + 1, 3, 3, 0xffffff); p.px(x + fx + 2, y + fy + 2, 0x1a1a1a);
  }
}

// ------------------------------------------------------------------------------------ banner
const cache = new Map();

/**
 * The banner canvas for a series. opts.faded: sun-bleached old card (the Shōwa machine).
 * @param {import('./thumbs.js').Thumbs} thumbs
 */
export function bannerCanvas(seriesId, thumbs, opts = {}) {
  const key = seriesId + (opts.faded ? ':f' : '');
  if (cache.has(key)) return cache.get(key);
  const s = SERIES_BY_ID[seriesId] || SERIES_BY_ID.mochi;
  const W = BANNER_W, H = BANNER_H;
  const p = new Pix(W, H, 7);
  const bg = hex(s.card.bg), ac = hex(s.card.accent), tx = hex(s.card.text), ac2 = hex(s.card.accent2 || s.card.accent);
  const dark = shadeC(tx, 0.85);

  // ---- scene
  try { (SCENES[s.id] || fallbackScene)(p, 0, 0, W, SCENE_H, s); } catch (e) { console.warn('banner scene', s.id, e); fallbackScene(p, 0, 0, W, SCENE_H, s); }
  p.flush(); p.pull();

  // ---- figures standing in the scene (ultra in the middle, rare & uncommon beside, commons outside)
  const byR = (r, n = 0) => s.items.filter((i) => i.rarity === r)[n];
  const cast = [
    { it: byR('common', 0), x: 38, foot: 188, size: 62 },
    { it: byR('common', 1), x: 282, foot: 188, size: 62 },
    { it: byR('uncommon', 0), x: 98, foot: 178, size: 68 },
    { it: byR('rare', 0), x: 222, foot: 178, size: 68 },
    { it: byR('ultra', 0), x: 160, foot: 196, size: 88, star: true },
  ].filter((c) => c.it);
  if (thumbs) {
    for (const c of cast) {
      const cv = thumbs.item(c.it.key, { size: c.size });
      const b = alphaBounds(cv);
      const dx = Math.round(c.x - (b.x + b.w / 2)), dy = Math.round(c.foot - (b.y + b.h));
      shadowEllipse(p, c.x, c.foot - 1, Math.round(b.w * 0.42), Math.max(2, Math.round(b.w * 0.09)), 0x2a1e1a);
      if (c.star) {
        // a soft halo + twinkles behind the star figure
        for (let r = 30; r > 0; r -= 3) for (let a = 0; a < 6.283; a += 0.06) if ((r + Math.round(a * 20)) % 4 === 0) p.px(c.x + Math.round(Math.cos(a) * r), c.foot - b.h / 2 + Math.round(Math.sin(a) * r * 0.9), 0xfff4b0, 70);
      }
      p.flush();
      p.ctx.drawImage(cv, dx, dy);
      p.pull();
      if (c.star) for (const [sx, sy, k] of [[-30, -46, 3], [28, -36, 2], [-22, -14, 2], [34, -62, 2]]) twinkle(p, c.x + sx, c.foot + sy, k);
    }
  }

  // ---- top: price badge, catchphrase, maker mark, title logo
  const [catchTxt, subTxt] = bannerText(s.id);
  // price badge (top-left)
  rrect(p, 5, 5, 46, 40, 6, 0xffffff);
  rrect(p, 6, 6, 44, 38, 5, 0xe5383b);
  p.text(String(s.price), 28, 6, { size: s.price >= 1000 ? 12 : 16, color: 0xffffff, align: 'center', font: FONT_EN });
  p.text('円', 44, s.price >= 1000 ? 9 : 12, { size: 8, color: 0xffffff, align: 'center' });
  rrect(p, 9, 28, 38, 13, 4, 0xffffff);
  p.text(`全${s.items.length}種`, 28, 28, { size: 10, color: 0xe5383b, align: 'center' });
  // maker mark (top-right): little capsule logo
  rrect(p, W - 36, 5, 31, 24, 5, 0xffffff);
  p.circle(W - 21, 14, 7, 0xff5a5a); p.rect(W - 28, 14, 15, 1, 0x2a2a2a);
  for (let y = 15; y <= 21; y++) for (let x = -7; x <= 7; x++) if (x * x + (y - 14) * (y - 14) <= 50) p.px(W - 21 + x, y, 0xf4f4f4);
  p.frame(W - 36, 5, 31, 24, 0xd0d0d0);
  p.text('GG', W - 21, 21, { size: 8, color: 0x2a2a2a, align: 'center', font: FONT_EN });
  // catchphrase in a ribbon
  const cw = Math.min(W - 104, Math.round(p.measure(catchTxt, 12)) + 14);
  const cx0 = Math.round(W / 2 - cw / 2) + 4;
  rrect(p, cx0, 6, cw, 17, 3, dark);
  rrect(p, cx0 + 1, 7, cw - 2, 15, 3, ac2);
  p.text(catchTxt, cx0 + cw / 2, 8, { size: 12, color: 0xffffff, align: 'center', outline: shadeC(ac2, 0.55) });
  // title
  const lines = TITLE_LINES[s.id] || splitTitle(s.jp);
  const fillC = mixC(ac, 0xffffff, 0.08);
  if (lines.length === 1) {
    const n = [...lines[0]].length;
    logo(p, lines[0], W / 2 + 4, 30, { scale: n <= 7 ? 2 : 2, fill: fillC, outer: dark, bounce: 2 });
  } else {
    logo(p, lines[0], W / 2 + 4, 28, { scale: 2, fill: fillC, outer: dark, bounce: 2 });
    logo(p, lines[1], W / 2 + 4, 62, { scale: 2, fill: ac2 === ac ? fillC : mixC(ac2, 0xffffff, 0.1), outer: dark, bounce: 1 });
  }
  if (subTxt) {
    const sy = lines.length === 1 ? 72 : 102;
    const sw = Math.round(p.measure(subTxt, 10)) + 10;
    rrect(p, Math.round(W / 2 + 4 - sw / 2), sy, sw, 14, 6, 0xffffff);
    p.text(subTxt, W / 2 + 4, sy + 1, { size: 10, color: dark, align: 'center' });
  }
  // secret starburst (right, above the lineup)
  burst(p, W - 34, 116, 24, 0xffe14a, 0xd8382a);
  p.text('シーク', W - 34, 98, { size: 12, color: 0xd8382a, align: 'center' });
  p.text('レット', W - 34, 111, { size: 12, color: 0xd8382a, align: 'center' });
  p.text('あり!', W - 34, 124, { size: 10, color: 0x2a1e1a, align: 'center' });

  // ---- lineup strip
  const ly = SCENE_H;
  drawPattern(p, 0, ly, W, H - ly, s.card.pattern === 'plain' ? 'dots' : s.card.pattern, mixC(ac, 0xffffff, 0.12), mixC(ac, 0xffffff, 0.35));
  p.rect(0, ly, W, 2, dark); p.rect(0, ly + 2, W, 2, 0xffffff);
  const n = s.items.length;
  const tw = 37, gap = 2;
  const ox = Math.round((W - (tw * n + gap * (n - 1))) / 2);
  s.items.forEach((it, i) => {
    const x = ox + i * (tw + gap), y = ly + 7;
    const secret = it.rarity === 'secret';
    rrect(p, x, y, tw, 53, 4, secret ? 0x2a2230 : 0xffffff);
    if (thumbs) {
      p.flush();
      const cv = thumbs.item(it.key, { size: 32, silhouette: secret });
      p.ctx.drawImage(cv, x + 2, y + 2, 33, 33);
      p.pull();
    }
    if (secret) p.text('?', x + tw / 2, y + 6, { size: 16, color: 0xffd23f, outline: 0x2a1e1a, align: 'center', font: FONT_EN });
    // number badge
    p.circle(x + 5, y + 5, 4, RARITY_COL[it.rarity]);
    p.text(String(i + 1), x + 5, y + 1, { size: 8, color: 0xffffff, align: 'center', font: FONT_EN });
    // name (fit to the tile)
    let name = secret ? 'ひみつ' : it.jp;
    const size = 10;
    while (p.measure(name, size) > tw - 3 && name.length > 2) name = name.slice(0, -1);
    p.text(name, x + tw / 2, y + 36, { size, color: secret ? 0xffd23f : dark, align: 'center' });
    p.rect(x + 4, y + 49, tw - 8, 2, RARITY_COL[it.rarity]);
  });
  // footer: microtext, age, copyright, QR
  const fy = ly + 63;
  p.rect(0, fy, W, H - fy, 0xffffff);
  p.rect(0, fy, W, 1, dark);
  p.text('対象年齢15才以上', 5, fy + 3, { size: 10, color: 0xd8382a });
  for (let k = 0; k < 3; k++) for (let i = 0; i < 96; i += 3) if ((i * 7 + k * 13) % 11 > 2) p.rect(100 + i, fy + 4 + k * 4, 2, 1, 0xa8a8a8);
  p.text('©GACHA GARAGE', 250, fy + 3, { size: 10, color: 0x4a4a4a, align: 'center', font: FONT_EN });
  qr(p, W - 22, fy - 1 + 0, s.order || 3);

  // premium series get a gold foil frame; brand-new series a NEW! corner ribbon
  if (s.price >= 500) {
    for (let i = 0; i < W; i++) for (const y of [0, 1, H - 2, H - 1]) p.px(i, y, ((i >> 2) % 3) ? 0xe8c050 : 0xfff2b0);
    for (let j = 0; j < H; j++) for (const x of [0, 1, W - 2, W - 1]) p.px(x, j, ((j >> 2) % 3) ? 0xe8c050 : 0xfff2b0);
  }
  if ((s.order || 0) >= 13) {
    rrect(p, 7, 48, 42, 15, 4, 0xffffff);
    rrect(p, 8, 49, 40, 13, 3, 0xffd23f);
    p.text('NEW!', 28, 49, { size: 10, color: 0xd8282a, align: 'center', font: FONT_EN });
  }
  if (opts.faded) fade(p, 11);
  p.flush();
  cache.set(key, p.canvas);
  return p.canvas;
}

/** Sun-bleached, creased old card. */
function fade(p, seed) {
  const d = p.d;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = (y * p.w + x) * 4;
    const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    const k = 0.8 + (y / p.h) * 0.12; // top faded more (sun from above)
    d[i] = d[i] * k + (l * 0.4 + 255 * 0.6) * (1 - k) * 1.0;
    d[i + 1] = d[i + 1] * k + (l * 0.4 + 240 * 0.6) * (1 - k);
    d[i + 2] = d[i + 2] * k + (l * 0.4 + 200 * 0.6) * (1 - k);
  }
  p.dirty = true;
  // creases + tape
  const crease = (x0, y0, x1, y1) => { p.line(x0, y0, x1, y1, 0xffffff, 120); p.line(x0 + 1, y0, x1 + 1, y1, 0x8a7a60, 70); };
  crease(0, 96 + seed, p.w, 118 + seed);
  crease(205, 0, 196, p.h);
  for (const [tx, ty] of [[2, 2], [p.w - 26, 2], [2, p.h - 12], [p.w - 26, p.h - 12]]) p.rect(tx, ty, 24, 10, 0xf2e6b8, 150);
}

const texCache = new Map();
export function bannerTexture(seriesId, thumbs, opts = {}) {
  const key = seriesId + (opts.faded ? ':f' : '');
  if (texCache.has(key)) return texCache.get(key);
  const t = new THREE.CanvasTexture(bannerCanvas(seriesId, thumbs, opts));
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}
