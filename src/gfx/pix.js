// Pixel-art painter on a canvas: per-pixel ops + crisp (alpha-thresholded) pixel-font text.
import * as THREE from 'three';
import { rng } from '../core/util.js';

export const FONT_JP = '"DotGothic16", "Pixelify Sans", monospace';
export const FONT_EN = '"Pixelify Sans", "DotGothic16", monospace';

const toRGB = (c) => (Array.isArray(c) ? c : [(c >> 16) & 255, (c >> 8) & 255, c & 255]);

export class Pix {
  constructor(w, h, seed = 1) {
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.ctx.imageSmoothingEnabled = false;
    this.img = this.ctx.getImageData(0, 0, w, h);
    this.d = this.img.data;
    this.dirty = false; // pixel buffer newer than canvas
    this.r = rng(seed);
  }

  // keep canvas and pixel buffer in sync when mixing APIs
  flush() { if (this.dirty) { this.ctx.putImageData(this.img, 0, 0); this.dirty = false; } return this; }
  pull() { this.img = this.ctx.getImageData(0, 0, this.w, this.h); this.d = this.img.data; return this; }

  px(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    const [r, g, b] = toRGB(c);
    const i = (y * this.w + x) * 4;
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
    const i = (y * this.w + x) * 4;
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
      const p = (j * this.w + i) * 4;
      this.d[p] = Math.min(255, this.d[p] * k); this.d[p + 1] = Math.min(255, this.d[p + 1] * k); this.d[p + 2] = Math.min(255, this.d[p + 2] * k);
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
    const size = opts.size || 16;
    const font = opts.font || FONT_JP;
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
    let ox = x;
    if (opts.align === 'center') ox = x - Math.round(m.width / 2);
    else if (opts.align === 'right') ox = x - Math.round(m.width);
    const col = toRGB(opts.color ?? 0xffffff);
    const mask = [];
    for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) if (td[(j * tw + i) * 4 + 3] > 110) mask.push([i, j]);
    const put = (dx, dy, c) => { for (const [i, j] of mask) this.px(ox + i - 2 + dx, y + j - 2 + dy, c); };
    if (opts.outline !== undefined) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) put(dx, dy, opts.outline);
    if (opts.shadow !== undefined) put(1, 1, opts.shadow);
    put(0, 0, col);
    this.flush();
    return m.width;
  }
  measure(str, size = 16, font = FONT_JP) {
    this.ctx.font = `${size}px ${font}`;
    return this.ctx.measureText(str).width;
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
  const b = new Pix(pix.w, pix.h);
  for (let i = 0; i < pix.d.length; i += 4) {
    let l = (pix.d[i] * 0.3 + pix.d[i + 1] * 0.59 + pix.d[i + 2] * 0.11);
    if (invert) l = 255 - l;
    b.d[i] = b.d[i + 1] = b.d[i + 2] = l; b.d[i + 3] = 255;
  }
  b.dirty = true;
  return b.texture({ srgb: false });
}
