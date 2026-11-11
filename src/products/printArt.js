// The game's printed matter baked from real photographs (tools/bake-drinks.py, tools/bake-print.py): sheets of panels,
// each sheet a WebP (quality 94) plus a JSON index { key: [x, y, w, h] }. Painters ask for a panel by key and fall back to their own
// drawing when it isn't baked (or with ?oldprint, for before / after shots).
//   await whenPrintReady()      printPx(key) -> Px | null      drawPrint(ctx, key, x, y, w, h) -> bool
//   hasPrint(key)               printImage(key) -> { img, r: [x, y, w, h] } | null (to draw it yourself)
import { Px } from './px.js';

const SHEETS = ['img/drinks/labels', 'img/print/goods', 'img/print/shop', 'img/print/street'];
const keys = new Map(); // key -> { s: sheet, r }
let ready = null;

function load(name, base) {
  return fetch(new URL(name + '.json', base).href).then((r) => (r.ok ? r.json() : null)).then((index) => new Promise((res) => {
    if (!index) return res();
    const img = new Image();
    img.onload = () => {
      const s = { img, index, w: img.width, h: img.height, d: null };
      for (const k in index) keys.set(k, { s, r: index[k] });
      res();
    };
    img.onerror = () => res();
    img.src = new URL(name + '.webp', base).href;
  })).catch(() => {});
}
/** Resolves once every sheet has loaded (or failed: the painters then draw their own). */
export function whenPrintReady() {
  if (ready) return ready;
  if (typeof document === 'undefined') return (ready = Promise.resolve());
  if (/[?&]oldprint\b/.test(location.search)) return (ready = Promise.resolve()); // debug: the old drawings, for before / after shots
  const base = document.baseURI;
  ready = Promise.all(SHEETS.map((n) => load(n, base)));
  return ready;
}
export const hasPrint = (key) => keys.has(key);
export function printImage(key) { const e = keys.get(key); return e ? { img: e.s.img, r: e.r } : null; }
function pixels(s) {
  if (!s.d) {
    const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(s.img, 0, 0);
    s.d = g.getImageData(0, 0, s.w, s.h).data;
  }
  return s.d;
}
/** A baked panel as label-studio pixels (x0, w: a part of it, e.g. the front half of a wrap). */
export function printPx(key, x0 = 0, w = 0) {
  const e = keys.get(key);
  if (!e) return null;
  let d;
  try { d = pixels(e.s); } catch (err) { return null; }
  const [X, Y, W, h] = e.r, ww = w || W - x0, p = new Px(ww, h), sw = e.s.w;
  for (let y = 0; y < h; y++) for (let x = 0; x < ww; x++) { const k = ((Y + y) * sw + X + x0 + x) * 4; p.d[y * ww + x] = (d[k] << 16) | (d[k + 1] << 8) | d[k + 2]; }
  return p;
}
/** Draw a baked panel into a 2D canvas, scaled to w x h without smoothing. */
export function drawPrint(ctx, key, x, y, w, h) {
  const e = keys.get(key);
  if (!e) return false;
  const [X, Y, W, H] = e.r, sm = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = !(w === W && h === H) && (w < W || h < H); // a reduction is filtered, a copy is exact
  ctx.drawImage(e.s.img, X, Y, W, H, x, y, w ?? W, h ?? H);
  ctx.imageSmoothingEnabled = sm;
  return true;
}
