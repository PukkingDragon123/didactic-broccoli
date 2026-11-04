// A vehicle's pixel atlas: one canvas holding every painted surface of a vehicle (and a parallel roughness map), so
// the whole body draws with one material. Surfaces are painted as orthographic "blueprint" views in metres (the left
// side, the front, the roof...): a face of the model takes its colours from the view along its normal, so a bumper, a
// lamp housing or a door painted in the side view lands exactly where it is on the model. Solid colours (swatches)
// and small box-mapped regions (a seat cover, the tarp, a tyre's tread) cover the rest.
//   const A = new Atlas(1024, 1024)
//   const V = A.view('side+x', { u: (p) => -p.z, v: (p) => p.y, u0, u1, v0, v1, ppm })   paint in metres: V.rect(...)
//   A.swatch(0x2a2a2c, ROUGH.rubber) -> uv function    A.texture() / A.roughTexture()
//   Ink: A.ink(rough) sets the roughness written with every pixel painted after it (0..1).
import * as THREE from 'three';
import { mask5, textW5 } from '../gfx/font5x7.js';

/** Roughness by material: what the paint under each pixel is made of. */
export const ROUGH = { paint: 0.42, chrome: 0.18, glass: 0.05, rubber: 0.92, plastic: 0.68, fabric: 0.97, metal: 0.5, lens: 0.12, matte: 0.85, tarp: 0.62 };

const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

export class Atlas {
  constructor(w = 1024, h = 1024) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
    this.r = new Uint8Array(w * h).fill(Math.round(ROUGH.paint * 255));
    this.cur = Math.round(ROUGH.paint * 255);
    this.shelf = { x: 0, y: 0, h: 0 };
    this.pad = 2;
    this.views = {};
    this.sw = new Map();
    this.swArea = null;
  }

  /** Roughness written with the following pixels (0..1). */
  ink(rough) { this.cur = Math.round(Math.max(0, Math.min(1, rough)) * 255); return this; }

  /** Reserve w x h pixels (shelf packing, padded). */
  alloc(w, h) {
    const P = this.pad, S = this.shelf;
    if (S.x + w + P * 2 > this.w) { S.x = 0; S.y += S.h; S.h = 0; }
    if (S.y + h + P * 2 > this.h) throw new Error(`atlas full (${w}x${h})`);
    const r = { x: S.x + P, y: S.y + P, w, h };
    S.x += w + P * 2; S.h = Math.max(S.h, h + P * 2);
    return r;
  }

  /** Raw pixel write (atlas coordinates, y down). */
  set(x, y, c, a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, [r, g, b] = rgb(c);
    this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = a;
    this.r[y * this.w + x] = this.cur;
  }
  get(x, y) { const i = (y * this.w + x) * 4; return (this.d[i] << 16) | (this.d[i + 1] << 8) | this.d[i + 2]; }

  /** A painted view: maps a model point to (u, v) metres via opts.u / opts.v, covering [u0, u1] x [v0, v1] at ppm. */
  view(name, opts) {
    const ppm = opts.ppm ?? 100;
    const W = Math.round((opts.u1 - opts.u0) * ppm), H = Math.round((opts.v1 - opts.v0) * ppm);
    const r = this.alloc(W, H);
    const v = new View(this, r, opts, ppm);
    this.views[name] = v;
    return v;
  }

  /** A box-mapped texture region w x h px: faces stretch over it whole (seat covers, a tarp, a tread strip). */
  patch(name, w, h) {
    const r = this.alloc(w, h);
    const v = new View(this, r, { u0: 0, u1: w, v0: 0, v1: h }, 1);
    this.views[name] = v;
    return v;
  }

  /** A solid colour (4 x 4 cell): uv function for faces painted one colour. */
  swatch(c, rough = ROUGH.paint) {
    const k = c + ':' + rough;
    let uv = this.sw.get(k);
    if (uv) return uv;
    if (!this.swArea || this.swArea.n >= this.swArea.max) { const r = this.alloc(64, 16); this.swArea = { r, n: 0, max: 16 * 4 }; }
    const A = this.swArea, x = A.r.x + (A.n % 16) * 4, y = A.r.y + Math.floor(A.n / 16) * 4;
    A.n++;
    const prev = this.cur; this.ink(rough);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) this.set(x + i, y + j, c);
    this.cur = prev;
    const t = [(x + 2) / this.w, 1 - (y + 2) / this.h];
    uv = () => t;
    this.sw.set(k, uv);
    return uv;
  }

  /** Atlas uv of a pixel position (x right, y down, may be fractional). */
  uv(x, y) { return [x / this.w, 1 - y / this.h]; }

  canvas() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    c.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return c;
  }
  texture() {
    if (this.tex) return this.tex;
    const t = new THREE.CanvasTexture(this.canvas());
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter;
    t.anisotropy = 4;
    return (this.tex = t);
  }
  /** The roughness map, at half the colour map's resolution (it only changes from part to part). */
  roughTexture() {
    if (this.rtex) return this.rtex;
    const w = this.w >> 1, h = this.h >> 1, d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = this.r[(y * 2) * this.w + x * 2], i = (y * w + x) * 4; d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255; }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(d, w, h), 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter;
    return (this.rtex = t);
  }
}

/** A region painted in its own metres: u to the right, v up. Integer pixel helpers take (i, j) from the bottom-left. */
export class View {
  constructor(atlas, r, o, ppm) {
    this.A = atlas; this.r = r; this.o = o; this.ppm = ppm;
    this.W = r.w; this.H = r.h;
    this.fu = o.u || null; this.fv = o.v || null;
  }
  // ---- metres <-> pixels
  i(u) { return Math.round((u - this.o.u0) * this.ppm); }
  j(v) { return Math.round((v - this.o.v0) * this.ppm); }
  /** Pixel (i, j) from the bottom-left of the region. */
  px(i, j, c, a = 255) {
    if (i < 0 || j < 0 || i >= this.W || j >= this.H) return this;
    this.A.set(this.r.x + i, this.r.y + this.H - 1 - j, c, a);
    return this;
  }
  get(i, j) { i = Math.max(0, Math.min(this.W - 1, i)); j = Math.max(0, Math.min(this.H - 1, j)); return this.A.get(this.r.x + i, this.r.y + this.H - 1 - j); }
  /** Fill pixels [i0, i1) x [j0, j1). */
  box(i0, j0, i1, j1, c, a) { for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) this.px(i, j, typeof c === 'function' ? c(i, j) : c, a); return this; }
  /** Fill a rectangle in metres. */
  rect(u0, v0, u1, v1, c, a) { return this.box(this.i(Math.min(u0, u1)), this.j(Math.min(v0, v1)), this.i(Math.max(u0, u1)), this.j(Math.max(v0, v1)), c, a); }
  fill(c) { return this.box(0, 0, this.W, this.H, c); }
  hline(i0, i1, j, c) { for (let i = Math.min(i0, i1); i <= Math.max(i0, i1); i++) this.px(i, j, c); return this; }
  vline(i, j0, j1, c) { for (let j = Math.min(j0, j1); j <= Math.max(j0, j1); j++) this.px(i, j, c); return this; }
  line(i0, j0, i1, j1, c) {
    const n = Math.max(Math.abs(i1 - i0), Math.abs(j1 - j0), 1);
    for (let k = 0; k <= n; k++) this.px(Math.round(i0 + (i1 - i0) * k / n), Math.round(j0 + (j1 - j0) * k / n), c);
    return this;
  }
  frame(i0, j0, i1, j1, c) { this.hline(i0, i1 - 1, j0, c); this.hline(i0, i1 - 1, j1 - 1, c); this.vline(i0, j0, j1 - 1, c); this.vline(i1 - 1, j0, j1 - 1, c); return this; }
  /** Filled polygon in pixel coordinates (pixel centres inside). */
  polyPx(pts, c, a) {
    let jmin = Infinity, jmax = -Infinity;
    for (const [, y] of pts) { jmin = Math.min(jmin, y); jmax = Math.max(jmax, y); }
    for (let j = Math.floor(jmin); j <= Math.ceil(jmax); j++) {
      const yc = j + 0.5, xs = [];
      for (let k = 0; k < pts.length; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[(k + 1) % pts.length];
        if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + (yc - y0) / (y1 - y0) * (x1 - x0));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let i = Math.round(xs[k]); i < Math.round(xs[k + 1]); i++) this.px(i, j, typeof c === 'function' ? c(i, j) : c, a);
    }
    return this;
  }
  /** Filled polygon in metres. */
  poly(pts, c, a) { return this.polyPx(pts.map(([u, v]) => [(u - this.o.u0) * this.ppm, (v - this.o.v0) * this.ppm]), c, a); }
  /** Pixel outline of a polygon in metres. */
  outline(pts, c) {
    for (let k = 0; k < pts.length; k++) {
      const [u0, v0] = pts[k], [u1, v1] = pts[(k + 1) % pts.length];
      this.line(this.i(u0), this.j(v0), this.i(u1), this.j(v1), c);
    }
    return this;
  }
  /** Filled disc (pixel centre ci, cj; radius in px). */
  disc(ci, cj, r, c, a) { for (let j = Math.floor(cj - r); j <= Math.ceil(cj + r); j++) for (let i = Math.floor(ci - r); i <= Math.ceil(ci + r); i++) if ((i + 0.5 - ci) ** 2 + (j + 0.5 - cj) ** 2 <= r * r) this.px(i, j, typeof c === 'function' ? c(i, j) : c, a); return this; }
  ring(ci, cj, r0, r1, c, a) { for (let j = Math.floor(cj - r1); j <= Math.ceil(cj + r1); j++) for (let i = Math.floor(ci - r1); i <= Math.ceil(ci + r1); i++) { const d = (i + 0.5 - ci) ** 2 + (j + 0.5 - cj) ** 2; if (d <= r1 * r1 && d >= r0 * r0) this.px(i, j, typeof c === 'function' ? c(i, j) : c, a); } return this; }
  /** 5 x 7 bitmap text, (i, j) = top-left of the caps in pixel coordinates (j from the bottom: the top row). */
  text5(str, i, j, c, { align = 'left', s = 1 } = {}) {
    const w = textW5(str, s), x0 = align === 'center' ? i - Math.round(w / 2) : align === 'right' ? i - w : i;
    for (const [x, y] of mask5(str)) for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) this.px(x0 + x * s + a, j - y * s - b, c);
    return w;
  }
  /** A pixel sprite: rows top to bottom, legend char -> colour ('.' or ' ' transparent); (i, j) = top-left. */
  sprite(rows, legend, i, j) {
    rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = legend[ch]; if (c !== undefined && ch !== '.' && ch !== ' ') this.px(i + x, j - y, c); }));
    return this;
  }
  /** Recolour pixels in a box through fn(colour, i, j) -> colour | null (keep). */
  map(i0, j0, i1, j1, fn) {
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) { if (i < 0 || j < 0 || i >= this.W || j >= this.H) continue; const c = fn(this.get(i, j), i, j); if (c !== null && c !== undefined) this.px(i, j, c); }
    return this;
  }

  // ---- geometry side: uv of a model point
  /** Atlas uv of a point (projected with the view's u / v functions). */
  uvOf(p) {
    const u = this.fu(p), v = this.fv(p);
    const x = this.r.x + (u - this.o.u0) * this.ppm, y = this.r.y + this.H - (v - this.o.v0) * this.ppm;
    return this.A.uv(x, y);
  }
  /** uv function for faces mapped through this view. */
  get map3() { return this._m3 ||= (p) => this.uvOf(p); }
  /** Atlas uv of a fractional position (s, t in 0..1 across the region, t up). */
  st(s, t) { return this.A.uv(this.r.x + s * this.W, this.r.y + this.H - t * this.H); }
}
