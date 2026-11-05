// Pixel-art painting for the title screen's 2D pieces (the enamel shop sign, the paper tags, the receipt). Everything is
// painted texel by texel into a small "art" grid and shown at a whole-number scale with nearest filtering, so every art
// pixel is a crisp square. Text comes from the pixel fonts as hard masks (Alagard and DotGothic16 at their native 16 px,
// thresholded: no anti-aliasing), the 5x7 bitmap font, or the hand-pixelled katakana below.
//   const a = art(w, h);  a.px(x, y, rgb);  a.mask(m, x, y, rgb);  a.canvas(scale) -> <canvas>
//   textMask(str, font = 'Alagard', size = 16) -> { w, h, base, at(x, y) }      mask5(str)
//   kanaMask(str)  (ガチャガレージ and friends, 7 px tall)
import { mask5 as mask5raw, textW5 } from '../gfx/font5x7.js';

export const INK = [26, 18, 22];
export const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
export const shade = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

/** An art grid of w x h texels (RGBA). */
export function art(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  const A = {
    w, h, data,
    px(x, y, c, a = 255) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = (y * w + x) * 4;
      if (a < 255) { const k = a / 255, j = 1 - k; data[i] = data[i] * j + c[0] * k; data[i + 1] = data[i + 1] * j + c[1] * k; data[i + 2] = data[i + 2] * j + c[2] * k; data[i + 3] = Math.max(data[i + 3], a); return; }
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
    },
    get(x, y) { if (x < 0 || y < 0 || x >= w || y >= h) return 0; return data[(y * w + x) * 4 + 3]; },
    rect(x, y, rw, rh, c, a) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) A.px(x + i, y + j, c, a); },
    clear(x, y) { if (x < 0 || y < 0 || x >= w || y >= h) return; data[(y * w + x) * 4 + 3] = 0; },
    /** Paint a mask's lit texels at (x, y). */
    mask(m, x, y, c, a) { for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.at(i, j)) A.px(x + i, y + j, c, a); },
    /** Paint the 8-neighbour rim around a mask (an outline `t` texels thick) at (x, y). */
    outline(m, x, y, c, t = 1) {
      for (let j = -t; j < m.h + t; j++) for (let i = -t; i < m.w + t; i++) {
        if (m.at(i, j)) continue;
        let near = false;
        for (let dy = -t; dy <= t && !near; dy++) for (let dx = -t; dx <= t; dx++) if (m.at(i + dx, j + dy)) { near = true; break; }
        if (near) A.px(x + i, y + j, c);
      }
    },
    /** A <canvas> showing the art at `scale` CSS px per texel (drawn at devicePixelRatio for crispness). */
    canvas(scale = 2, cv = document.createElement('canvas')) {
      const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
      const src = document.createElement('canvas'); src.width = w; src.height = h;
      src.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
      cv.width = w * scale * dpr; cv.height = h * scale * dpr;
      cv.style.width = `${w * scale}px`; cv.style.height = `${h * scale}px`;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, cv.width, cv.height);
      g.drawImage(src, 0, 0, cv.width, cv.height);
      cv.dataset.scale = scale;
      return cv;
    },
  };
  return A;
}

/** Wrap a lit-texel test into a mask object. */
export function maskOf(w, h, lit, base = h) { return { w, h, base, at: (x, y) => x >= 0 && y >= 0 && x < w && y < h && lit[y * w + x] === 1 }; }

const tmCache = new Map();
/** A hard mask of `str` in a pixel font at its native size (1 texel per font pixel), trimmed to the ink, with the
 *  baseline row offset (base: texels from the top of the mask to the baseline). */
export function textMask(str, font = 'Alagard', size = 16) {
  const key = `${font}|${size}|${str}`;
  if (tmCache.has(key)) return tmCache.get(key);
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = `${size}px "${font}"`;
  const W = Math.ceil(g.measureText(str).width) + 8, H = size * 2;
  c.width = W; c.height = H;
  g.font = `${size}px "${font}"`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#000';
  const by = Math.round(size * 1.4);
  g.fillText(str, 2, by);
  const d = g.getImageData(0, 0, W, H).data;
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  const lit = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 110) { lit[y * W + x] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) { const m = maskOf(0, 0, new Uint8Array(0)); tmCache.set(key, m); return m; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = lit[(y + y0) * W + x + x0];
  const m = maskOf(w, h, out, by - y0);
  tmCache.set(key, m);
  return m;
}

/** The 5x7 bitmap font as a mask. */
export function mask5(str) {
  const pts = mask5raw(str), w = Math.max(1, textW5(str, 1)), h = 7, lit = new Uint8Array(w * h);
  for (const [x, y] of pts) if (x < w) lit[y * w + x] = 1;
  return maskOf(w, h, lit);
}

// ------------------------------------------------------------------ a tiny hand-pixelled katakana (7 px tall)
// Just the glyphs the title screen needs. '゛' marks are part of the glyph (top right).
const KANA = {
  'ガ': ['..#..#.#', '#######.', '..#...#.', '..#...#.', '.#....#.', '.#...#..', '#..##...'],
  'カ': ['..#.....', '######..', '..#...#.', '..#...#.', '.#....#.', '.#...#..', '#..##...'],
  'チ': ['....##..', '.###....', '...#....', '#######.', '...#....', '..#.....', '##......'],
  'ャ': ['........', '........', '..#.....', '.#####..', '..#.#...', '...#....', '...#....'],
  'レ': ['.#......', '.#......', '.#......', '.#....#.', '.#...#..', '.#.##...', '.##.....'],
  'ー': ['........', '........', '........', '#######.', '........', '........', '........'],
  'ジ': ['#....#.#', '.#......', '#.....#.', '.#...#..', '....#...', '..##....', '##......'],
  'シ': ['#.......', '.#......', '#.....#.', '.#...#..', '....#...', '..##....', '##......'],
  'プ': ['.....###', '######.#', '.....###', '.....#..', '....#...', '..##....', '##......'],
  'セ': ['.#......', '.#...##.', '.####.#.', '.#...#..', '.#......', '.#......', '..####..'],
  'ル': ['.#..#...', '.#..#...', '.#..#...', '.#..#..#', '#...#.#.', '#...##..', '........'],
  'ト': ['..#.....', '..#.....', '..###...', '..#..#..', '..#.....', '..#.....', '..#.....'],
  'イ': ['.....#..', '....#...', '..##....', '##.#....', '...#....', '...#....', '...#....'],
  '・': ['........', '........', '........', '...##...', '...##...', '........', '........'],
  ' ': ['....', '....', '....', '....', '....', '....', '....'],
};
/** A mask of a katakana string in the 7 px hand-pixelled set (1 texel gap). */
export function kanaMask(str) {
  const gl = [...str].map((ch) => KANA[ch] || KANA[' ']);
  const w = gl.reduce((s, g) => s + g[0].length, 0), h = 7, lit = new Uint8Array(w * h);
  let x0 = 0;
  for (const g of gl) { g.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') lit[y * w + x0 + x] = 1; }); x0 += g[0].length; }
  return maskOf(w, h, lit);
}

/** Paper grain over a region inside a shape test: the base colour with a few quantised shades and fibres. */
export function grain(a, x0, y0, w, h, base, seed, inside = () => true) {
  const r = rng(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    let k = [0.97, 1, 1, 1, 1.02][Math.floor(r() * 5)];
    if (r() < 0.025) k = 0.91;
    if (r() < 0.005) k = 0.84;
    a.px(x0 + x, y0 + y, shade(base, k));
  }
  // short pressed fibres
  for (let i = 0; i < (w * h) / 60; i++) {
    const fx = Math.floor(r() * w), fy = Math.floor(r() * h), len = 2 + Math.floor(r() * 4), k = r() < 0.5 ? 0.94 : 1.03;
    for (let j = 0; j < len; j++) if (inside(fx + j, fy)) a.px(x0 + fx + j, y0 + fy, shade(base, k));
  }
}
