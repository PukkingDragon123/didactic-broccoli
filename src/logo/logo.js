// The shop's own logo and name: a small pixel drawing (32 x 32 or 64 x 64, one of 24 print-shop inks per pixel) and the
// name on the sign, in Japanese and in English. Saved compactly (ensureState(game, 'logo'), run-length bytes in base64),
// shown on the sign and the noren (src/gfx/garageArt.js), the capsule prints (src/gachakit/capsulePrint.js), the price
// plates on the machines and the day's receipt. Until the player draws one, the shop keeps Grandpa's crest
// (丸に割り菱カプセル) and the name ガチャガレージ / GACHA GARAGE, painted exactly as before.
//   logoState(game)               the save record { v, size, px (packed), jp, en, rev }
//   readLogo(game) -> L            { size, px: Uint8Array | null, custom, jp, en, named, rev }  (px null: the crest)
//   writeLogo(game, { size, px, jp, en })   save + make it the active logo + emit 'logo:changed'
//   activeLogo() / setActiveLogo(L)         what the printers draw (module-level, so gfx code needs no game)
//   paintLogo(pix, x, y, s, { L, mono, bg })   the logo into a Pix at s x s pixels (nearest; mode-downsampled)
//   logoCanvas(L, scale), logoURL(L, scale)    for HTML (receipts, the PC app)
//   crestPixels(size)             Grandpa's crest as ink indices (the editor starts from it)
import { ensureState } from '../game/stateExt.js';

export const LOGO_SIZES = [32, 64];
export const NAME_MAX = { jp: 8, en: 16 };
export const DEFAULT_NAME = { jp: 'ガチャガレージ', en: 'GACHA GARAGE' };

// 24 inks of a small-town print shop in 1999 (index 0 = no ink: the paper, or whatever the logo is printed on)
export const INKS = [
  null,
  0x241a1e, 0x5e5046, 0x9a9488, 0xf8f6ee, 0xf2e6c8, // sumi, soft ink, grey, gofun white, cream
  0xc8322c, 0xe8483a, 0x8a2226, 0xf08a6a, 0xf2a6b8, // shu red, bright red, deep red, coral, peach pink
  0xe8761c, 0xf2c830, 0xd8a640, 0x9a6234, 0x5a3a2a, // orange, yellow, ochre, tea brown, dark brown
  0x2f8a4e, 0x86bc5a, 0x1f5a3a, 0x3a9a92, 0x8cc0e0, // green, leaf, deep green, celadon teal, sky
  0x2f5fa8, 0x25355c, 0x7a4a9a, 0xb8a0d8, // ruri blue, indigo, purple, wisteria
];
export const INK_NAMES = [null, 'Sumi', 'Soft ink', 'Grey', 'White', 'Cream', 'Shu red', 'Red', 'Deep red', 'Coral', 'Peach', 'Orange', 'Yellow', 'Ochre', 'Tea', 'Brown', 'Green', 'Leaf', 'Pine', 'Celadon', 'Sky', 'Blue', 'Indigo', 'Purple', 'Wisteria'];
export const RED_INK = 6;

// ------------------------------------------------------------------ packing: [run - 1, ink] byte pairs, base64
export function packPixels(px) {
  const out = [];
  for (let i = 0; i < px.length;) {
    const c = px[i];
    let n = 1;
    while (n < 256 && i + n < px.length && px[i + n] === c) n++;
    out.push(n - 1, c);
    i += n;
  }
  let s = '';
  for (const b of out) s += String.fromCharCode(b);
  return btoa(s);
}
export function unpackPixels(str, size) {
  const px = new Uint8Array(size * size);
  try {
    const s = atob(str);
    let k = 0;
    for (let i = 0; i + 1 < s.length && k < px.length; i += 2) {
      const n = s.charCodeAt(i) + 1, c = s.charCodeAt(i + 1) < INKS.length ? s.charCodeAt(i + 1) : 0;
      for (let j = 0; j < n && k < px.length; j++) px[k++] = c;
    }
  } catch { return null; }
  return px;
}

// ------------------------------------------------------------------ Grandpa's crest
/** The crest's shape at radius r around (0, 0): 0 off, 1 on (the same rule as the sign's crest in garageArt.js). */
function crestOn(i, j, r) {
  const r1 = Math.round(r * 0.84), r2 = Math.round(r * 0.66), t = Math.max(1, Math.round(r * 0.09)), d = Math.round(r * 0.26), my = -Math.round(r * 0.36), d2 = Math.round(d * 0.45);
  const q = i * i + j * j;
  if (q > r * r + r * 0.6) return false;
  let on = q > r1 * r1 + r1 * 0.6;
  if (!on && q <= r2 * r2 + r2 * 0.6) { on = Math.abs(j) > t; const a = Math.abs(i) / 1.5 + Math.abs(j - my); if (a <= d) on = a <= d2; }
  return on;
}
/** Grandpa's crest as ink indices (shu red on nothing), size x size. */
export function crestPixels(size = 32) {
  const px = new Uint8Array(size * size), c = size / 2, r = size / 2 - 1;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (crestOn(x - c, y - c, r)) px[y * size + x] = RED_INK;
  return px;
}

// ------------------------------------------------------------------ the record
export function logoState(game) {
  return ensureState(game, 'logo', { v: 1, size: 32, px: null, jp: null, en: null, rev: 0 });
}
const cleanJP = (s) => [...String(s || '').replace(/[\r\n\t]/g, '').trim()].slice(0, NAME_MAX.jp).join('');
const cleanEN = (s) => String(s || '').replace(/[^\x20-\x7e]/g, '').toUpperCase().trim().slice(0, NAME_MAX.en);
export const nameJP = cleanJP, nameEN = cleanEN;

export function readLogo(game) {
  const s = logoState(game);
  const size = LOGO_SIZES.includes(s.size) ? s.size : 32;
  const px = s.px ? unpackPixels(s.px, size) : null;
  const jp = cleanJP(s.jp) || DEFAULT_NAME.jp, en = cleanEN(s.en) || DEFAULT_NAME.en;
  return { size, px, custom: !!px, jp, en, named: jp !== DEFAULT_NAME.jp || en !== DEFAULT_NAME.en, rev: s.rev || 0 };
}

let ACTIVE = { size: 32, px: null, custom: false, jp: DEFAULT_NAME.jp, en: DEFAULT_NAME.en, named: false, rev: 0 };
export const activeLogo = () => ACTIVE;
export function setActiveLogo(L) { ACTIVE = L || ACTIVE; return ACTIVE; }

/** Save a logo (px null: back to the crest) and tell everyone. */
export function writeLogo(game, { size = 32, px = null, jp = null, en = null } = {}) {
  const s = logoState(game);
  s.size = LOGO_SIZES.includes(size) ? size : 32;
  s.px = px && px.some((v) => v) ? packPixels(px) : null;
  s.jp = cleanJP(jp) && cleanJP(jp) !== DEFAULT_NAME.jp ? cleanJP(jp) : null;
  s.en = cleanEN(en) && cleanEN(en) !== DEFAULT_NAME.en ? cleanEN(en) : null;
  s.rev = (s.rev || 0) + 1;
  const L = setActiveLogo(readLogo(game));
  game.events?.emit('logo:changed', { logo: L });
  game.save?.();
  return L;
}

// ------------------------------------------------------------------ painting
/** The ink index of the logo at (u, v) in 0..1 (nearest), or of the crest when there is no drawing. */
function sampler(L, s) {
  if (L.px) {
    const n = L.size, px = L.px;
    if (s >= n) return (x, y) => px[Math.min(n - 1, Math.floor(y * n / s)) * n + Math.min(n - 1, Math.floor(x * n / s))];
    // smaller than drawn: the most common ink in each block (ink wins over paper on a tie), so thin lines survive
    const k = n / s;
    return (x, y) => {
      const x0 = Math.floor(x * k), y0 = Math.floor(y * k), x1 = Math.max(x0 + 1, Math.floor((x + 1) * k)), y1 = Math.max(y0 + 1, Math.floor((y + 1) * k));
      const cnt = new Map();
      let inked = 0;
      for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) { const c = px[j * n + i]; if (c) { inked++; cnt.set(c, (cnt.get(c) || 0) + 1); } }
      if (inked * 4 < (x1 - x0) * (y1 - y0)) return 0;
      let best = 0, bn = 0;
      for (const [c, m] of cnt) if (m > bn) { bn = m; best = c; }
      return best;
    };
  }
  const c = s / 2, r = s / 2 - Math.max(1, Math.round(s / 32));
  return (x, y) => (crestOn(x - c, y - c, r) ? RED_INK : 0);
}

/** Draw the logo into a Pix (src/gfx/pix.js) at (x, y), s x s pixels. opts: L (default the active one), mono (paint
 *  every inked pixel this colour: a dye-resist mark, a foil stamp), bg (fill the square first). */
export function paintLogo(p, x, y, s, opts = {}) {
  const L = opts.L || ACTIVE, at = sampler(L, s);
  if (opts.bg !== undefined) p.rect(x, y, s, s, opts.bg);
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
    const c = at(i, j);
    if (c) p.px(x + i, y + j, opts.mono ?? INKS[c]);
  }
  return p;
}

/** The logo on a canvas, scale x its own size (nearest), transparent where there's no ink. */
export function logoCanvas(L = ACTIVE, scale = 1, size = null) {
  const n = size || (L.px ? L.size : 32), S = n * scale;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const x = cv.getContext('2d'), at = sampler(L, n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const c = at(i, j);
    if (!c) continue;
    x.fillStyle = '#' + INKS[c].toString(16).padStart(6, '0');
    x.fillRect(i * scale, j * scale, scale, scale);
  }
  return cv;
}
const urlCache = new Map();
export function logoURL(L = ACTIVE, scale = 1, size = null) {
  const k = `${L.rev}|${L.custom}|${scale}|${size}`;
  if (!urlCache.has(k)) { if (urlCache.size > 24) urlCache.clear(); urlCache.set(k, logoCanvas(L, scale, size).toDataURL()); }
  return urlCache.get(k);
}
