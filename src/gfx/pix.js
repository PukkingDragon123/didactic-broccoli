// Pixel-art painter on a canvas: per-pixel ops + crisp (alpha-thresholded) pixel-font text.
import * as THREE from 'three';
import { rng } from '../core/util.js';
import { textWPx, maskPx } from './pixfont.js';

// Pixel fonts are only crisp at their grid sizes (other sizes come out with uneven strokes once thresholded):
//   FONT_EN / FONT_KEY / FONT_DISPLAY: Alagard (src/ui/fonts.css), crisp at 16 / 32 / 48 / 64 px; text() and
//   measure() snap Alagard to the nearest of those, and anything asked for smaller is set at Alagard's native 16 px
//   (src/gfx/pixfont.js; no tiny bitmap faces). FONT_JP (DotGothic16, 16 px) for Japanese decorative art.
// English text should use FONT_EN / FONT_DISPLAY; Japanese is kept for in-world decorative art only.
export const FONT_JP = '"DotGothic16", "Pixelify Sans"';
export const FONT_EN = '"Alagard", "DotGothic16", "Pixelify Sans"';
export const FONT_DISPLAY = '"Alagard", "DotGothic16", "Pixelify Sans"';
export const FONT_KEY = '"Alagard", "Pixelify Sans", "DotGothic16"';
const ALAGARD = /Alagard|GG Display|GG Bold/;
/** Alagard's crisp size for a requested size (never under its native 16 px). */
export function crispSize(size, font) {
  if (!ALAGARD.test(font)) return size;
  return 16 * Math.max(1, Math.round((size - 1) / 16));
}

const toRGB = (c) => (Array.isArray(c) ? c : [(c >> 16) & 255, (c >> 8) & 255, c & 255]);

export class Pix {
  /** w x h logical pixels; k: texels per logical pixel (k = 2 gives the pixel type room to sit at its native size
   *  in a small sign: the art keeps its k x k blocks, the type is set on the finer grid). */
  constructor(w, h, seed = 1, k = 1) {
    this.w = w; this.h = h; this.k = k; this.W = w * k; this.H = h * k;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.W; this.canvas.height = this.H;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.ctx.imageSmoothingEnabled = false;
    this.img = this.ctx.getImageData(0, 0, this.W, this.H);
    this.d = this.img.data;
    this.dirty = false; // pixel buffer newer than canvas
    this.r = rng(seed);
  }

  // keep canvas and pixel buffer in sync when mixing APIs
  flush() { if (this.dirty) { this.ctx.putImageData(this.img, 0, 0); this.dirty = false; } return this; }
  pull() { this.img = this.ctx.getImageData(0, 0, this.W, this.H); this.d = this.img.data; return this; }

  px(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    if (this.k === 1) return this.pp(x, y, c, a);
    for (let j = 0; j < this.k; j++) for (let i = 0; i < this.k; i++) this.pp(x * this.k + i, y * this.k + j, c, a);
    return this;
  }
  /** One texel (physical pixel), for the type. */
  pp(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return this;
    const [r, g, b] = toRGB(c);
    const i = (y * this.W + x) * 4;
    if (a >= 255) { this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255; }
    else {
      const k = a / 255;
      this.d[i] = this.d[i] * (1 - k) + r * k; this.d[i + 1] = this.d[i + 1] * (1 - k) + g * k; this.d[i + 2] = this.d[i + 2] * (1 - k) + b * k;
      this.d[i + 3] = Math.max(this.d[i + 3], a);
    }
    this.dirty = true;
    return this;
  }
  get(x, y) {
    x = ((x % this.w) + this.w) % this.w; y = ((y % this.h) + this.h) % this.h;
    const i = (y * this.k * this.W + x * this.k) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2]];
  }
  fill(c) { return this.rect(0, 0, this.w, this.h, c); }
  rect(x, y, w, h, c, a = 255) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c, a);
    return this;
  }
  frame(x, y, w, h, c) {
    for (let i = x; i < x + w; i++) { this.px(i, y, c); this.px(i, y + h - 1, c); }
    for (let j = y; j < y + h; j++) { this.px(x, j, c); this.px(x + w - 1, j, c); }
    return this;
  }
  line(x0, y0, x1, y1, c, a = 255) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c, a);
    return this;
  }
  circle(cx, cy, r, c, a = 255) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.px(cx + x, cy + y, c, a);
    return this;
  }
  /** Multiply every pixel's brightness by 1 ± amt (noise). */
  noise(amt = 0.08, x = 0, y = 0, w = this.w, h = this.h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const k = 1 + (this.r() * 2 - 1) * amt;
      for (let b = 0; b < this.k; b++) for (let a = 0; a < this.k; a++) {
        const p = ((j * this.k + b) * this.W + i * this.k + a) * 4;
        this.d[p] = Math.min(255, this.d[p] * k); this.d[p + 1] = Math.min(255, this.d[p + 1] * k); this.d[p + 2] = Math.min(255, this.d[p + 2] * k);
      }
    }
    this.dirty = true;
    return this;
  }
  /** Scatter single pixels of the given colours. */
  speckle(density, colors, a = 255, x = 0, y = 0, w = this.w, h = this.h) {
    const n = Math.round(w * h * density);
    for (let k = 0; k < n; k++) this.px(x + Math.floor(this.r() * w), y + Math.floor(this.r() * h), colors[Math.floor(this.r() * colors.length)], a);
    return this;
  }
  /** Soft blotch (stain) of colour with falloff. */
  blotch(cx, cy, rad, c, strength = 0.4) {
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
      const d = Math.sqrt(x * x + y * y) / rad;
      if (d > 1) continue;
      if (this.r() > 1 - d * 0.6) continue; // dithered edge
      this.px(cx + x, cy + y, c, 255 * strength * (1 - d * d));
    }
    return this;
  }
  /** Bayer-dithered vertical gradient. */
  gradient(x, y, w, h, c1, c2) {
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const a = toRGB(c1), b = toRGB(c2);
    for (let j = 0; j < h; j++) {
      const t = j / Math.max(1, h - 1);
      for (let i = 0; i < w; i++) {
        const th = (B[(j % 4) * 4 + (i % 4)] + 0.5) / 16;
        const steps = 6;
        const q = Math.floor(t * steps + th) / steps;
        this.px(x + i, y + j, [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q]);
      }
    }
    return this;
  }
  /** Draw a sprite from string rows with a legend. */
  sprite(rows, legend, x, y, scale = 1) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      const c = legend[ch];
      if (c === undefined || ch === '.' || ch === ' ') return;
      this.rect(x + i * scale, y + j * scale, scale, scale, c);
    }));
    return this;
  }
  /**
   * Crisp text: rendered with the pixel font, then alpha-thresholded so edges stay pixel-sharp.
   * opts: size, color, font, align('left'|'center'|'right'), outline (colour), shadow (colour), weight
   */
  text(str, x, y, opts = {}) {
    this.flush();
    const font = opts.font || FONT_JP, K = this.k;
    const size = crispSize((opts.size || 16) * K, font);
    const tmp = document.createElement('canvas');
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    tctx.font = `${opts.weight || ''} ${size}px ${font}`;
    const m = tctx.measureText(str);
    const tw = Math.ceil(m.width) + 4, th = Math.ceil(size * 1.4) + 4;
    tmp.width = tw; tmp.height = th;
    tctx.font = `${opts.weight || ''} ${size}px ${font}`;
    tctx.textBaseline = 'top';
    tctx.fillStyle = '#fff';
    tctx.fillText(str, 2, 2);
    const td = tctx.getImageData(0, 0, tw, th).data;
    let ox = Math.round(x * K);
    if (opts.align === 'center') ox -= Math.round(m.width / 2);
    else if (opts.align === 'right') ox -= Math.round(m.width);
    const oy = Math.round(y * K);
    const col = toRGB(opts.color ?? 0xffffff);
    const mask = [];
    for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) if (td[(j * tw + i) * 4 + 3] > 110) mask.push([i, j]);
    const put = (dx, dy, c) => { for (const [i, j] of mask) this.pp(ox + i - 2 + dx, oy + j - 2 + dy, c); };
    if (opts.outline !== undefined) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) put(dx, dy, opts.outline);
    if (opts.shadow !== undefined) put(1, 1, opts.shadow);
    put(0, 0, col);
    this.flush();
    return m.width / K;
  }
  /** Width of a line in logical pixels. */
  measure(str, size = 16, font = FONT_JP) {
    const cs = crispSize(size * this.k, font);
    this.ctx.font = `${cs}px ${font}`;
    return this.ctx.measureText(str).width / this.k;
  }

  /** Small labels in Alagard at its native 16 px via src/gfx/pixfont.js (same options as text(); y = top of the caps). */
  tinyText(str, x, y, opts = {}) {
    const K = this.k, w = textWPx(str), mask = maskPx(str), col = toRGB(opts.color ?? 0xffffff);
    const X = Math.round(x * K), ox = opts.align === 'center' ? X - Math.round(w / 2) : opts.align === 'right' ? X - w : X, oy = Math.round(y * K) + 1;
    const put = (dx, dy, c) => { for (const [i, j] of mask) this.pp(ox + i + dx, oy + j + dy, c); };
    if (opts.outline !== undefined) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) put(dx, dy, opts.outline);
    if (opts.shadow !== undefined) put(1, 1, opts.shadow);
    put(0, 0, col);
    this.flush();
    return w / K;
  }

  texture({ repeat = null, nearest = true, srgb = true } = {}) {
    this.flush();
    const t = new THREE.CanvasTexture(this.canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; }
    t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
}

/** Grey-scale height map from a Pix (for bumpMap). */
export function bumpFrom(pix, invert = false) {
  pix.flush();
  const b = new Pix(pix.w, pix.h, 1, pix.k);
  for (let i = 0; i < pix.d.length; i += 4) {
    let l = (pix.d[i] * 0.3 + pix.d[i + 1] * 0.59 + pix.d[i + 2] * 0.11);
    if (invert) l = 255 - l;
    b.d[i] = b.d[i + 1] = b.d[i + 2] = l; b.d[i + 3] = 255;
  }
  b.dirty = true;
  return b.texture({ srgb: false });
}
