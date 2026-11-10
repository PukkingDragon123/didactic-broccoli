// Real photographs as label art. What is inside a pack (melons, grapes, a cup of coffee, a tea field, a bowl of ramen,
// the cat on the cat food) comes from small CC BY photos (Google Open Images, public/img/photos/products, credited one
// by one in CREDITS.md), turned into pixel art at label size: cropped to fill its window, box-filtered down, pushed a
// little in contrast and colour as print is, reduced to a dozen inks (median cut) and ordered-dithered. The brands,
// wordmarks and mascots around them stay drawn by hand; no photo shows real packaging or a logo.
//   await whenPhotosReady()          photo(name, w, h, { shape, n, fx, fy }) -> Px | null (not loaded: draw by hand)
//   framed(name, w, h, o) -> Px | null     the same with a white keyline and an ink rim, like a sticker on the label
import { Px, NONE } from './px.js';

export const PHOTO_NAMES = ['melon', 'grapes', 'lemon', 'orange', 'mikan', 'beans', 'coffee', 'teafield', 'teacup', 'cows', 'corn', 'cornsoup', 'plum', 'whisky', 'sake', 'ramen_shoyu', 'ramen_tonkotsu', 'ramen_miso', 'onigiri', 'pudding', 'cat', 'fuji', 'wave', 'choco', 'wheat', 'buns', 'asagao', 'oden', 'grapefruit', 'gyoza', 'strawberry', 'sardines', 'curry'];
const data = new Map(), cache = new Map();
let ready = null;
/** Resolves when every photo has loaded (or failed: those are simply drawn by hand). */
export function whenPhotosReady() {
  if (ready) return ready;
  if (typeof document === 'undefined') return (ready = Promise.resolve());
  ready = Promise.all(PHOTO_NAMES.map((n) => new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      try { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); data.set(n, { w: img.width, h: img.height, d: g.getImageData(0, 0, img.width, img.height).data }); } catch (e) { /* drawn by hand instead */ }
      res();
    };
    img.onerror = () => res();
    img.src = new URL('img/photos/products/' + n + '.jpg', document.baseURI).href;
  }))).then(() => { cache.clear(); });
  return ready;
}
export const hasPhoto = (name) => data.has(name);

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** n inks for a set of pixels (flat r, g, b array): median cut, each box's mean. */
function inks(px, n) {
  let boxes = [Array.from({ length: px.length / 3 }, (_, i) => i)];
  const range = (b, k) => { let lo = 255, hi = 0; for (const i of b) { const v = px[i * 3 + k]; if (v < lo) lo = v; if (v > hi) hi = v; } return hi - lo; };
  while (boxes.length < n) {
    let bi = -1, bk = 0, br = -1;
    boxes.forEach((b, i) => { if (b.length < 2) return; for (let k = 0; k < 3; k++) { const r = range(b, k) * Math.sqrt(b.length); if (r > br) { br = r; bi = i; bk = k; } } });
    if (bi < 0) break;
    const b = boxes[bi].sort((p, q) => px[p * 3 + bk] - px[q * 3 + bk]), m = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, m), b.slice(m));
  }
  return boxes.filter((b) => b.length).map((b) => { let r = 0, g = 0, bl = 0; for (const i of b) { r += px[i * 3]; g += px[i * 3 + 1]; bl += px[i * 3 + 2]; } return [r / b.length, g / b.length, bl / b.length]; });
}
/**
 * A photo as pixel art, w x h. o: { shape: 'circle' | 'rect' (default), n: inks (12), fx, fy: where to look (0..1,
 * default the middle), spread: dither strength (36), sat, con }
 */
export function photo(name, w, h, o = {}) {
  const src = data.get(name);
  if (!src) return null;
  const key = name + '|' + w + '|' + h + '|' + JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const sc = Math.min(src.w / w, src.h / h), cw = w * sc, chh = h * sc, x0 = (src.w - cw) * (o.fx ?? 0.5), y0 = (src.h - chh) * (o.fy ?? 0.5);
  const sat = o.sat ?? 1.25, con = o.con ?? 1.12, px = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // the mean of the source pixels under this one
    const ax = Math.floor(x0 + x * sc), bx = Math.max(ax + 1, Math.floor(x0 + (x + 1) * sc)), ay = Math.floor(y0 + y * sc), by = Math.max(ay + 1, Math.floor(y0 + (y + 1) * sc));
    let r = 0, g = 0, b = 0, n = 0;
    for (let j = ay; j < by && j < src.h; j++) for (let i = ax; i < bx && i < src.w; i++) { const k = (j * src.w + i) * 4; r += src.d[k]; g += src.d[k + 1]; b += src.d[k + 2]; n++; }
    r /= n || 1; g /= n || 1; b /= n || 1;
    const l = 0.3 * r + 0.59 * g + 0.11 * b, k = (y * w + x) * 3;
    px[k] = Math.max(0, Math.min(255, ((l + (r - l) * sat) - 128) * con + 132)); px[k + 1] = Math.max(0, Math.min(255, ((l + (g - l) * sat) - 128) * con + 132)); px[k + 2] = Math.max(0, Math.min(255, ((l + (b - l) * sat) - 128) * con + 132));
  }
  const pal = inks(px, o.n ?? 12), spread = o.spread ?? 36, p = new Px(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (o.shape === 'circle' && ((x + 0.5 - w / 2) / (w / 2)) ** 2 + ((y + 0.5 - h / 2) / (h / 2)) ** 2 > 1) continue;
    const k = (y * w + x) * 3, t = (B4[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * spread, r = px[k] + t, g = px[k + 1] + t, b = px[k + 2] + t;
    let best = 0, bd = Infinity;
    for (let i = 0; i < pal.length; i++) { const d = (r - pal[i][0]) ** 2 + (g - pal[i][1]) ** 2 + (b - pal[i][2]) ** 2; if (d < bd) { bd = d; best = i; } }
    p.d[y * w + x] = (Math.round(pal[best][0]) << 16) | (Math.round(pal[best][1]) << 8) | Math.round(pal[best][2]);
  }
  cache.set(key, p);
  return p;
}
/** The photo with a white keyline and an ink rim round it. o.ink, o.line (keyline colour; null: none). */
export function framed(name, w, h, o = {}) {
  const ph = photo(name, w, h, o);
  if (!ph) return null;
  const p = new Px(w + 6, h + 6); p.blit(ph, 3, 3);
  if (o.line !== null) p.outline(o.line ?? 0xfffaf0, true);
  p.outline(o.ink ?? 0x2e1f28, true);
  return p.trim();
}
export { NONE };
