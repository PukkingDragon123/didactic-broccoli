// Tiny crisp text for stamps, stickers and tags: the 5x7 bitmap font (src/gfx/font5x7.js) drawn into a canvas at one
// texel per font pixel, as an <img> shown at a whole-number scale with pixelated scaling (no font smoothing, no
// effects; an optional hard 1-texel drop shadow).
//   pixText(str, { col, shadow, s }) -> '<img ...>' HTML      pixTextURL(str, opts) -> { url, w, h }
import { draw5, textW5 } from '../gfx/font5x7.js';

const cache = new Map();

export function pixTextURL(str, { col = '#241a1e', shadow = null } = {}) {
  const key = `${str}|${col}|${shadow}`;
  if (cache.has(key)) return cache.get(key);
  const w = textW5(str) + (shadow ? 1 : 0), h = 7 + (shadow ? 1 : 0);
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = h;
  const g = c.getContext('2d');
  if (shadow) draw5(g, str, 1, 1, { col: shadow });
  draw5(g, str, 0, 0, { col });
  const out = { url: c.toDataURL(), w: c.width, h: c.height };
  cache.set(key, out);
  return out;
}

export function pixText(str, { s = 2, cls = 'dr-px', ...o } = {}) {
  const t = pixTextURL(str, o);
  return `<img class="${cls}" src="${t.url}" width="${t.w * s}" height="${t.h * s}" alt="${String(str).replace(/"/g, '&quot;')}" draggable="false">`;
}
