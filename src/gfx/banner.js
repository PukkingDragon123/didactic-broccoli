// Gachapon display banners (台紙 daishi): the printed card inside every machine window, laid out like a real capsule-toy
// flyer (src/figures/flyer.js) at 640 x 560 pixel art: the maker's mark, the logo, the price disc, 全N種, a hero shot of the
// series' figures (pixel-rendered from the real 3D models) on a photograph or the series' painted scene, the line-up with
// the secret's silhouette and the small print.
import * as THREE from 'three';
import { Pix, FONT_EN } from './pix.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { drawFlyer, FLYER_W, FLYER_H } from '../figures/flyer.js';

// scene painters live in src/gfx/bannerScenes*.js (one file per batch of series); merged here
const sceneMods = Object.values(import.meta.glob('./bannerScenes*.js', { eager: true }));
export const SCENES = Object.assign({}, ...sceneMods.map((m) => m.SCENES || {}));
export const BANNER_TEXT = Object.assign({}, ...sceneMods.map((m) => m.BANNER_TEXT || {}));
export const SCENE_TEXT = sceneMods.map((m) => m.SCENE_TEXT || '').join('');
// backgrounds of the flyer-style cards (series with a `flyer` spec, see src/figures/flyer.js)
export const FLYER_SCENES = Object.assign({}, ...sceneMods.map((m) => m.FLYER_SCENES || {}));
const FLYER_PHOTOS = sceneMods.filter((m) => m.flyerPhotos).map((m) => ({ when: m.flyerPhotos, ready: m.flyerPhotosReady }));

export const BANNER_W = 320; // (the card's proportions, 8:7; drawn at twice this)
export const BANNER_H = 280;

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

export function bannerText(id) {
  const t = BANNER_TEXT[id];
  if (t) return [t.catch, t.sub];
  return FALLBACK_CATCH[id] || ['新登場！', ''];
}

/** Every character a banner may draw (for font preloading). */
export function bannerGlyphs() {
  let s = '全種円回シークレットありもあるよ対象年齢才以上カプセルトイひみつ注意';
  for (const id of Object.keys(SERIES_BY_ID)) {
    const se = SERIES_BY_ID[id], F = flyerSpec(se);
    s += se.jp + bannerText(id).join('') + se.items.map((i) => i.jp + (i.jpLines || []).join('')).join('');
    s += [F.catch, F.sub, F.gimmick, ...(F.title || []).map((t) => t[0])].filter(Boolean).join('');
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

const FLYER_KIT = { hex, shadeC, mixC, textMask, dilate, rrect, shadowEllipse, twinkle, burst, alphaBounds };

// ------------------------------------------------------------------------------------ banner
const cache = new Map();

// Every card is laid out as a real capsule-toy flyer (src/figures/flyer.js). A series' own `flyer` spec wins key by key;
// the rest is made up from its data: its maker (all invented), its hero (the ultra) and two figures beside it, its title
// broken where a designer would break it, the catch copy, and its painted scene enlarged as the backdrop.
const FLYER_MAKER = {
  mochi: 'tsukushi', shokudo: 'manpuku', kasa: 'kamenoko', showa: 'nejimaki', konbini: 'hoshimaru', omocha: 'nejimaki', heya: 'kamenoko', yokai: 'dondoko',
  onsen: 'tsukushi', dajare: 'dondoko', pachimon: 'hoshimaru', kaiju: 'mogura', uchu: 'hoshimaru', omamori: 'dondoko', neko_cafe: 'kamenoko', wagashi: 'manpuku',
  matsuri: 'dondoko', sentai: 'hoshimaru', densha: 'nejimaki', umi: 'kamenoko', obake_yashiki: 'mogura', bizarre: 'mogura',
};
/** A series' painted banner scene (320 wide) printed twice the size behind a flyer. */
function legacyScene(p, K, s, h) {
  const q = new Pix(320, Math.ceil(h / 2), 5);
  try { (SCENES[s.id] || fallbackScene)(q, 0, 0, 320, q.h, s); } catch (e) { console.warn('banner scene', s.id, e); fallbackScene(q, 0, 0, 320, q.h, s); }
  q.flush(); p.flush();
  p.ctx.imageSmoothingEnabled = false;
  p.ctx.drawImage(q.canvas, 0, 0, 640, q.h * 2);
  p.pull();
}
const specs = new Map();
/** The flyer spec of a series (its own, filled in). */
export function flyerSpec(s) {
  let F = specs.get(s.id);
  if (F) return F;
  const own = s.flyer || {}, regular = s.items.filter((i) => i.rarity !== 'secret');
  const by = (r) => regular.filter((i) => i.rarity === r);
  const hero = (own.hero && s.items.find((i) => i.id === own.hero)) || by('ultra')[0] || regular[regular.length - 1];
  const side = [...by('rare'), ...by('uncommon'), ...by('common')].filter((i) => i !== hero).slice(0, 2).map((i) => i.id);
  const lines = TITLE_LINES[s.id] || splitTitle(s.jp), [c, sub] = bannerText(s.id);
  F = {
    maker: FLYER_MAKER[s.id] || 'mogura', scene: FLYER_SCENES[s.id] ? s.id : legacyScene, hero: hero.id, side,
    title: lines.map((t, i) => [t, [...t].length <= 4 && lines.length < 3 ? 4 : 2, i === lines.length - 1 ? 'a' : 'b']), catch: c, sub,
    ...own,
  };
  specs.set(s.id, F);
  return F;
}

/**
 * The banner canvas for a series (a 640 x 560 flyer). opts.faded: sun-bleached old card (the Shōwa machine).
 * @param {import('./thumbs.js').Thumbs} thumbs
 */
export function bannerCanvas(seriesId, thumbs, opts = {}) {
  const key = seriesId + (opts.faded ? ':f' : '');
  if (cache.has(key)) return cache.get(key);
  const s0 = SERIES_BY_ID[seriesId] || SERIES_BY_ID.mochi, s = { ...s0, flyer: flyerSpec(s0) };
  const fp = new Pix(FLYER_W, FLYER_H, 7);
  const draw = () => { drawFlyer(fp, s, thumbs, FLYER_KIT, FLYER_SCENES); if (opts.faded) fade(fp, 22); fp.flush(); };
  const ready = FLYER_PHOTOS.every((f) => f.ready());
  draw();
  // (drawn before its photograph arrived: drawn again, on the same canvas, when it has)
  if (!ready) Promise.all(FLYER_PHOTOS.map((f) => f.when())).then(() => { draw(); const t = texCache.get(key); if (t) t.needsUpdate = true; });
  cache.set(key, fp.canvas);
  return fp.canvas;
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
