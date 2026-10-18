// Hand-pixelled background scenes for gachapon machine banners (台紙 daishi).
// Each scene paints an opaque 320x200 illustration into region (x, y, w, h) of a Pix painter.
// The title logo, the rendered figures and the lineup strip are composited on top by cards code:
//   y 0-70    title zone      -> calm backdrop (sky / wall / curtain), framing objects at the sides
//   y 150-195 figure feet     -> a readable floor plane (path, counter top, street, tatami, stage...)
import { rng } from '../core/util.js';

// ---------------------------------------------------------------------------------------------
// colour + dithering helpers
// ---------------------------------------------------------------------------------------------
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered (Bayer 4x4) threshold in (0,1) for pixel x,y. */
const bay = (x, y) => (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const cb = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
const hex = (c) => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16));
const rgb = (r, g, b) => (cb(r) << 16) | (cb(g) << 8) | cb(b);
const mix = (a, b, t) => rgb(
  ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t,
  ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t,
  (a & 255) + ((b & 255) - (a & 255)) * t,
);
/** Darken toward a deep violet (pixel-art shadows are hue-shifted, never plain black). */
const dk = (c, t = 0.35, to = 0x1c1230) => mix(c, to, t);
/** Lighten toward warm white. */
const lt = (c, t = 0.35, to = 0xfffbf0) => mix(c, to, t);

/**
 * Pick from a ramp of colours with banded ordered dithering at the transitions.
 * t in [0,1] spans the ramp; `soft` = fraction of each band that is dithered.
 */
function tone(x, y, t, ramp, soft = 0.5) {
  const n = ramp.length - 1;
  const v = clamp01(t) * n;
  const i = Math.floor(v);
  if (i >= n) return ramp[n];
  const f = clamp01((v - i - 0.5) / soft + 0.5);
  return bay(x, y) < f ? ramp[i + 1] : ramp[i];
}

/** 3x5 pixel font (N/M are 4 wide) for tiny Latin signage. */
const TINY = {
  ' ': ['00', '00', '00', '00', '00'],
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '011', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  A: ['010', '101', '111', '101', '101'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], I: ['111', '010', '010', '010', '111'], K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'], N: ['1001', '1101', '1011', '1001', '1001'], O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'], M: ['1001', '1111', '1111', '1001', '1001'],
};

// ---------------------------------------------------------------------------------------------
// G: clipped, offset drawing surface writing straight into the Pix pixel buffer
// ---------------------------------------------------------------------------------------------
class G {
  constructor(p, ox, oy, w, h, seed = 1) {
    this.p = p; this.ox = ox | 0; this.oy = oy | 0; this.w = w | 0; this.h = h | 0;
    this.r = rng(seed);
  }
  rnd(a = 1, b) { return b === undefined ? this.r() * a : a + this.r() * (b - a); }
  ri(a, b) { return Math.floor(this.rnd(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.r() * arr.length)]; }
  px(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const P = this.p, X = x + this.ox, Y = y + this.oy;
    if (X < 0 || Y < 0 || X >= P.w || Y >= P.h) return;
    const i = (Y * P.w + X) * 4, d = P.d;
    d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255;
    P.dirty = true;
  }
  get(x, y) {
    x = Math.max(0, Math.min(this.w - 1, Math.floor(x))); y = Math.max(0, Math.min(this.h - 1, Math.floor(y)));
    const P = this.p, X = Math.min(P.w - 1, x + this.ox), Y = Math.min(P.h - 1, y + this.oy);
    const i = (Y * P.w + X) * 4, d = P.d;
    return (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
  }
  blend(x, y, c, a) { this.px(x, y, mix(this.get(x, y), c, a)); }
  /** Set pixel only where the Bayer threshold is below t (dithered coverage). */
  dpx(x, y, c, t) { if (bay(x, y) < t) this.px(x, y, c); }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c); }
  drect(x, y, w, h, c, t) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.dpx(i, j, c, t); }
  hl(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.px(x, y, c); }
  vl(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.px(x, y, c); }
  frame(x, y, w, h, c) { this.hl(x, x + w - 1, y, c); this.hl(x, x + w - 1, y + h - 1, c); this.vl(x, y, y + h - 1, c); this.vl(x + w - 1, y, y + h - 1, c); }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  /** Filled ellipse; fn may be a colour or (x,y,nx,ny)=>colour (nx,ny = normalised offset). */
  ell(cx, cy, rx, ry, c) {
    const f = typeof c === 'function';
    for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
      const nx = x / Math.max(rx, 0.5), ny = y / Math.max(ry, 0.5);
      if (nx * nx + ny * ny > 1.0 + 0.6 / Math.max(rx, ry)) continue;
      const col = f ? c(cx + x, cy + y, nx, ny) : c;
      if (col != null) this.px(cx + x, cy + y, col);
    }
  }
  /** Ellipse outline (1px). */
  ring(cx, cy, rx, ry, c) {
    const M = new Mask(this.w, this.h); M.ell(cx, cy, rx, ry);
    M.each((x, y) => { if (!M.has(x - 1, y) || !M.has(x + 1, y) || !M.has(x, y - 1) || !M.has(x, y + 1)) this.px(x, y, c); });
  }
  poly(pts, c) {
    const M = new Mask(this.w, this.h); M.poly(pts);
    M.fill(this, typeof c === 'function' ? c : () => c);
    return M;
  }
  /** Banded, Bayer-dithered vertical gradient through a ramp of colours. */
  vgrad(x, y, w, h, ramp, soft = 0.5) {
    for (let j = 0; j < h; j++) {
      const t = j / Math.max(1, h - 1);
      for (let i = 0; i < w; i++) this.px(x + i, y + j, tone(x + i, y + j, t, ramp, soft));
    }
  }
  hgrad(x, y, w, h, ramp, soft = 0.5) {
    for (let i = 0; i < w; i++) {
      const t = i / Math.max(1, w - 1);
      for (let j = 0; j < h; j++) this.px(x + i, y + j, tone(x + i, y + j, t, ramp, soft));
    }
  }
  /** Per-pixel painter over a box: fn(x, y, current) -> colour | null. */
  each(x, y, w, h, fn) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const c = fn(i, j, this.get(i, j));
      if (c != null) this.px(i, j, c);
    }
  }
  /**
   * Dithered light pool: pixels inside the ellipse are tinted toward `col` (amount k) with a
   * Bayer coverage that falls off from the centre. Two passes give a stronger core.
   */
  light(cx, cy, rx, ry, col, k = 0.35, strength = 1, core = 0) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d >= 1) continue;
      const t = (1 - d) * strength;
      if (bay(x, y) < t) {
        let c = mix(this.get(x, y), col, k);
        if (core && bay(x, y) < t - core) c = mix(c, col, k);
        this.px(x, y, c);
      }
    }
  }
  /** Dithered vertical light beam (trapezoid) from (x0..x1 at y0) to (x2..x3 at y1). */
  beam(xa0, xa1, y0, xb0, xb1, y1, col, k = 0.3, strength = 0.7) {
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0);
      const l = xa0 + (xb0 - xa0) * t, r = xa1 + (xb1 - xa1) * t;
      const mid = (l + r) / 2, half = (r - l) / 2;
      for (let x = Math.floor(l); x <= Math.ceil(r); x++) {
        const e = 1 - Math.abs(x - mid) / Math.max(1, half);
        const cov = strength * Math.min(1, e * 2.2) * (1 - t * 0.55);
        if (bay(x, y) < cov) this.px(x, y, mix(this.get(x, y), col, k));
      }
    }
  }
  sprite(rows, legend, x, y) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const c = legend[row[i]];
        if (c != null) this.px(x + i, y + j, c);
      }
    }
  }
  text(str, x, y, opts = {}) { return this.p.text(str, x + this.ox, y + this.oy, opts); }
  /** Hand-pixelled 3x5 caps/digits for tiny Latin signage (crisp at any size via integer scale). */
  tiny(str, x, y, c, { scale = 1, align = 'left', gap = 1 } = {}) {
    const glyphs = [...String(str).toUpperCase()].map((ch) => TINY[ch] || TINY[' ']);
    const width = glyphs.reduce((a, gl) => a + (gl[0].length + gap) * scale, -gap * scale);
    let cx = align === 'center' ? Math.round(x - width / 2) : align === 'right' ? x - width : x;
    for (const gl of glyphs) {
      gl.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') this.rect(cx + i * scale, y + j * scale, scale, scale, c); }));
      cx += (gl[0].length + gap) * scale;
    }
    return width;
  }
  /** Vertical (tategaki) text, each glyph centred on x. */
  vtext(str, x, y, opts = {}) {
    const size = opts.size || 10, step = opts.step || size + 1;
    let yy = y;
    for (const ch of str) {
      if ('ーｰ'.includes(ch)) { this.vl(x, yy + 1, yy + size - 4, opts.color ?? 0); yy += step - 3; continue; }
      this.text(ch, x, yy, { ...opts, align: 'center' });
      yy += step;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Mask: boolean coverage over the scene, used to build shapes, then fill/outline them
// ---------------------------------------------------------------------------------------------
class Mask {
  constructor(w, h) { this.w = w; this.h = h; this.m = new Uint8Array(w * h); this.x0 = w; this.y0 = h; this.x1 = -1; this.y1 = -1; }
  set(x, y, v = 1) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.m[y * this.w + x] = v;
    if (v) { if (x < this.x0) this.x0 = x; if (x > this.x1) this.x1 = x; if (y < this.y0) this.y0 = y; if (y > this.y1) this.y1 = y; }
  }
  has(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.m[y * this.w + x] : 0; }
  rect(x, y, w, h, v = 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, v); return this; }
  ell(cx, cy, rx, ry, v = 1) {
    for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
      const nx = x / Math.max(rx, 0.5), ny = y / Math.max(ry, 0.5);
      if (nx * nx + ny * ny <= 1.0 + 0.6 / Math.max(rx, ry)) this.set(cx + x, cy + y, v);
    }
    return this;
  }
  /** Scalloped blob (foliage / clouds / hydrangea): radius wobbles with angle. */
  blob(cx, cy, r, amp = 0.12, freq = 6, ph = 0, v = 1) {
    const R0 = Math.ceil(r * (1 + amp)) + 1;
    for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) {
      const rr = r * (1 + amp * Math.sin(Math.atan2(y, x) * freq + ph));
      if (Math.hypot(x, y) <= rr) this.set(cx + x, cy + y, v);
    }
    return this;
  }
  poly(pts, v = 1) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) this.set(x, y, v);
    }
    return this;
  }
  /** Thick stroke: stamps discs of radius r along a polyline (r may vary per point: [x,y,r]). */
  stroke(pts, r = 1, v = 1) {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay, ar = r] = pts[k], [bx, by, br = r] = pts[k + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
      for (let i = 0; i <= n; i++) { const t = i / n; this.ell(ax + (bx - ax) * t, ay + (by - ay) * t, ar + (br - ar) * t, ar + (br - ar) * t, v); }
    }
    return this;
  }
  each(fn) { for (let y = this.y0; y <= this.y1; y++) for (let x = this.x0; x <= this.x1; x++) if (this.m[y * this.w + x]) fn(x, y); }
  fill(g, fn) { this.each((x, y) => { const c = fn(x, y, this); if (c != null) g.px(x, y, c); }); return this; }
  /** Outline drawn just outside the mask. cLit is used on the top/left (lit) sides when given. */
  outline(g, c, cLit = c, inner = false) {
    for (let y = this.y0 - 1; y <= this.y1 + 1; y++) for (let x = this.x0 - 1; x <= this.x1 + 1; x++) {
      if (inner) {
        if (!this.has(x, y)) continue;
        const sh = !this.has(x + 1, y) || !this.has(x, y + 1), li = !this.has(x - 1, y) || !this.has(x, y - 1);
        if (sh) g.px(x, y, c); else if (li) g.px(x, y, cLit);
      } else {
        if (this.has(x, y)) continue;
        const sh = this.has(x - 1, y) || this.has(x, y - 1), li = this.has(x + 1, y) || this.has(x, y + 1);
        if (sh) g.px(x, y, c); else if (li) g.px(x, y, cLit);
      }
    }
    return this;
  }
  /** Is (x,y) an edge pixel facing direction (dx,dy)? */
  edge(x, y, dx, dy, n = 1) { for (let i = 1; i <= n; i++) if (!this.has(x + dx * i, y + dy * i)) return true; return false; }
}

// ---------------------------------------------------------------------------------------------
// reusable motifs
// ---------------------------------------------------------------------------------------------

/** Puffy cumulus cloud. puffs: [dx, dy, r]. pal: [highlight, base, shade, deep]. */
function cloud(g, cx, cy, puffs, pal, flatK = 0.5) {
  let bottom = -Infinity;
  for (const [, dy, r] of puffs) bottom = Math.max(bottom, cy + dy + r * flatK);
  bottom = Math.round(bottom);
  const sorted = [...puffs].sort((a, b) => a[1] - b[1] || b[2] - a[2]);
  const M = new Mask(g.w, g.h);
  for (const [dx, dy, r] of sorted) {
    const x0 = cx + dx, y0 = cy + dy;
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const d2 = x * x + y * y;
      if (d2 > r * r + r * 0.8) continue;
      const X = x0 + x, Y = y0 + y;
      if (Y > bottom) continue;
      let t = 0.42 + 0.5 * ((y + x * 0.35) / r);
      if ((x * x + (y + 1.6) * (y + 1.6)) > r * r + r * 0.8 && y < 0) t = 0; // rim light on top arc
      if (Y >= bottom - 1) t = 1; else if (Y >= bottom - 3) t = Math.max(t, 0.8);
      g.px(X, Y, tone(X, Y, t, pal, 0.45));
      M.set(X, Y);
    }
  }
  return M;
}

/** Foliage canopy from scalloped clusters, lit from the upper left. clusters: [cx, cy, r, bias]. */
function foliage(g, clusters, ramp, outline, opt = {}) {
  const M = new Mask(g.w, g.h);
  const amp = opt.amp ?? 0.13, fq = opt.freq ?? 7;
  for (const [cx, cy, r, bias = 0] of clusters) {
    const ph = cx * 0.37 + cy * 0.91;
    const R0 = Math.ceil(r * (1 + amp)) + 1;
    for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) {
      const d = Math.hypot(x, y);
      const rr = r * (1 + amp * Math.sin(Math.atan2(y, x) * fq + ph));
      if (d > rr) continue;
      const X = cx + x, Y = cy + y;
      let t = 0.45 + 0.55 * ((y * 0.85 + x * 0.45) / r) + bias;
      if (d > rr - 1.6 && x + y < -r * 0.3) t -= 0.3;
      g.px(X, Y, tone(X, Y, t, ramp, opt.soft ?? 0.5));
      M.set(X, Y);
    }
  }
  if (outline != null) M.outline(g, outline, opt.outlineLit ?? outline);
  return M;
}

/** Tiny falling sakura petal (two styles). */
function petal(g, x, y, kind, c1, c2) {
  if (kind === 0) { g.px(x, y, c1); g.px(x + 1, y, c1); g.px(x + 1, y + 1, c2); }
  else if (kind === 1) { g.px(x, y, c1); g.px(x, y + 1, c2); g.px(x + 1, y + 1, c1); }
  else if (kind === 2) { g.px(x, y, c2); g.px(x + 1, y, c1); g.px(x, y + 1, c1); }
  else { g.px(x, y, c1); g.px(x + 1, y + 1, c2); }
}

/** Five-pixel blossom. */
function blossom(g, x, y, c, centre) {
  g.px(x, y - 1, c); g.px(x - 1, y, c); g.px(x + 1, y, c); g.px(x, y + 1, c); g.px(x, y, centre);
}

/** Simple bird in flight (3-5 px wide). */
function bird(g, x, y, c, big = false) {
  if (big) g.sprite(['c...c', '.c.c.', '..c..'], { c }, x, y);
  else g.sprite(['c.c', '.c.'], { c }, x, y);
}

/** Rolling ridge line: fills from fy(x) down to yBot with fn(x, y, depthFromTop). */
function ridge(g, x0, x1, fy, yBot, fn) {
  for (let x = x0; x < x1; x++) {
    const top = Math.round(fy(x));
    for (let y = Math.max(0, top); y < yBot; y++) { const c = fn(x, y, y - top); if (c != null) g.px(x, y, c); }
  }
}

/** Dithered drift of steam / mist (soft blob of semi-coverage). */
function mist(g, cx, cy, rx, ry, c, strength = 0.6) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (d >= 1) continue;
    if (bay(x, y) < (1 - d * d) * strength) g.px(x, y, c);
  }
}

// =============================================================================================
// SCENES
// =============================================================================================

// --- mochi: pastel spring park -----------------------------------------------------------------
function mochi(g, s) {
  const W = g.w;
  const pink = hex(s.card.accent), yellow = hex(s.card.accent2);
  // sky
  g.vgrad(0, 0, W, 128, [0x7fc6ec, 0x9fd7f3, 0xc0e7f8, 0xdff3f9, 0xfbeff4], 0.55);
  // soft sun glow behind the top-left canopy
  g.light(108, 14, 70, 40, 0xfffbe6, 0.35, 0.9);
  const cpal = [0xffffff, 0xf7f4fc, 0xe2dcf2, 0xc9c1e6];
  cloud(g, 150, 34, [[-26, 4, 9], [-14, -2, 12], [2, -7, 15], [18, -1, 11], [31, 5, 8], [-4, 6, 10], [12, 6, 10]], cpal);
  cloud(g, 255, 50, [[-12, 2, 7], [-2, -3, 9], [9, 1, 7], [16, 4, 5]], cpal);
  cloud(g, 60, 70, [[-10, 2, 6], [0, -2, 8], [10, 2, 6]], cpal);
  // long thin horizon clouds
  for (const [x, y, w] of [[96, 96, 40], [210, 92, 54], [20, 100, 30]]) {
    g.hl(x, x + w, y, 0xffffff); g.hl(x + 4, x + w - 6, y - 1, 0xffffff); g.hl(x + 3, x + w - 2, y + 1, 0xe7e2f5);
  }
  // birds
  bird(g, 196, 22, 0x6a6a9a, true); bird(g, 206, 28, 0x6a6a9a); bird(g, 186, 30, 0x7e7eae);

  // distant Mt. Fuji: lit west face, shaded east face, snow cap with V-shaped tongues
  const fx = 206, ftop = 84, fbase = 120;
  const tongues = [[-20, 3, 0.16], [-11, 4, 0.24], [-3, 3, 0.12], [7, 4, 0.2], [17, 3, 0.14]];
  const snowAt = (x) => {
    let k = 0.34 + 0.03 * Math.sin(x * 0.3);
    for (const [dx, w, len] of tongues) k += Math.max(0, 1 - Math.abs(x - fx - dx) / w) * len;
    return k;
  };
  for (let y = ftop; y < fbase; y++) {
    const k = (y - ftop) / (fbase - ftop);
    const half = 6 + k * 34 + k * k * 26;
    for (let x = Math.floor(fx - half); x <= fx + half; x++) {
      const side = (x - fx) / half;
      const lit = side < 0.12 + (bay(x, y) - 0.5) * 0.18;
      let c = lit ? (side < -0.55 ? 0xbcd0ee : 0xaec4e8) : 0x98aedc;
      if (k < snowAt(x)) c = lit ? 0xffffff : 0xcfdaf2;
      if (k > 0.62) c = tone(x, y, (k - 0.62) / 0.38 * 0.9, [c, mix(c, 0xdff3f9, 0.5), 0xdff3f9]);
      g.px(x, y, c);
    }
  }
  g.hl(fx - 6, fx + 6, ftop, 0xffffff); g.hl(fx - 4, fx + 4, ftop - 1, 0xffffff);

  // far hills (pale, atmospheric) with tiny trees
  const far = (x) => 112 + 5 * Math.sin(x * 0.035 + 1) + 3 * Math.sin(x * 0.09);
  ridge(g, 0, W, far, 132, (x, y, d) => (d === 0 ? 0xd6efd8 : tone(x, y, d / 18, [0xc2e5c8, 0xaedbb8])));
  for (let x = 6; x < W; x += 9 + ((x * 7) % 5)) {
    const y = Math.round(far(x)) - 2;
    g.sprite(['.a.', 'aab', '.b.'], { a: 0x9ccfa6, b: 0x86bf93 }, x, y);
  }
  // mid hills with sakura rows and a tiny house
  const mid = (x) => 124 + 6 * Math.sin(x * 0.028 + 3.2) + 2 * Math.sin(x * 0.11 + 1);
  ridge(g, 0, W, mid, 142, (x, y, d) => (d === 0 ? 0xc4eaa9 : tone(x, y, d / 16, [0xa6dc8f, 0x8fcf80])));
  for (let x = 30; x < W - 20; x += 13) {
    if (x > 120 && x < 168) continue;
    const y = Math.round(mid(x)) - 4;
    g.sprite(['.pp.', 'pqqp', 'qqrr', '.t..'], { p: 0xffd9e5, q: 0xffbcd0, r: 0xf29fbb, t: 0x8a6464 }, x, y);
  }
  // little red-roof house on the hill
  {
    const hx = 136, hy = Math.round(mid(146)) - 9;
    g.sprite([
      '....rr....',
      '..rrrrrr..',
      'rrRRRRRRrr',
      '.wwwwwwww.',
      '.wwdwwwkw.',
      '.wwdwwwww.',
    ], { r: 0xe86a6a, R: 0xc84f5a, w: 0xfff6ea, d: 0x8a5a4a, k: 0x7fb6e0 }, hx, hy);
  }

  // park lawn
  g.vgrad(0, 136, W, 64, [0x93d47e, 0x84cb72, 0x76c067], 0.6);
  // flower bed (low fence + tulips) behind the path
  const bedY = 141;
  for (let x = 0; x < W; x++) { g.px(x, bedY + 6, 0x6fae5a); g.px(x, bedY + 7, 0x5e9a50); }
  for (let x = 4; x < W; x += 6) {
    const k = Math.floor(x / 6) % 4;
    const col = [pink, yellow, 0xffffff, 0xff9ec0][k];
    const dark = k === 2 ? 0xe2d8ec : dk(col, 0.25);
    const y = bedY - ((x * 13) % 3);
    g.vl(x + 1, y + 3, bedY + 6, 0x4f9a4f);
    g.px(x, y + 5, 0x5fb65a); g.px(x + 2, y + 4, 0x5fb65a);
    g.sprite(['a.a', 'aab', '.b.'], { a: col, b: dark }, x, y);
  }
  // white picket fence segments at the sides
  for (const [x0, x1] of [[0, 46], [262, 320]]) {
    for (let x = x0; x < x1; x += 5) { g.vl(x, 134, 146, 0xfdfaf2); g.vl(x + 1, 134, 146, 0xe8e0d4); g.px(x, 133, 0xfdfaf2); }
    g.hl(x0, x1 - 1, 137, 0xf3ece0); g.hl(x0, x1 - 1, 143, 0xf3ece0); g.hl(x0, x1 - 1, 144, 0xc9bfb4);
  }

  // sandy picnic path (floor band)
  const top = (x) => 151 + 2.5 * Math.sin(x * 0.045 + 0.6);
  const bot = (x) => 194 + 2 * Math.sin(x * 0.05 + 2);
  for (let x = 0; x < W; x++) {
    const t0 = Math.round(top(x)), b0 = Math.round(bot(x));
    for (let y = t0; y <= b0; y++) {
      const d = (y - t0) / (b0 - t0);
      let c = tone(x, y, 0.15 + d * 0.5, [0xfff1d6, 0xf6e1ba, 0xeed3a5]);
      if (y <= t0 + 1) c = 0xd9bd8b; // grass shadow on the path edge
      else if (y === t0 + 2 && bay(x, y) < 0.5) c = 0xe6cc9c;
      if (y >= b0 - 1) c = 0xe2c695;
      g.px(x, y, c);
    }
  }
  // pebbles + footprints of texture
  const pr = rng(31);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(pr() * W), y = Math.floor(156 + pr() * 36);
    if (y > bot(x) - 3 || y < top(x) + 4) continue;
    const big = pr() < 0.3;
    if (big) { g.px(x, y, 0xfff6e6); g.px(x + 1, y, 0xfdeccd); g.px(x, y + 1, 0xd8bb8a); g.px(x + 1, y + 1, 0xc9a978); }
    else { g.px(x, y, 0xd3b480); g.px(x + 1, y, 0xfff6e6); }
  }
  // grass tufts overhanging the path edges
  for (let x = 3; x < W; x += 7 + (x % 5)) {
    const y = Math.round(top(x));
    g.sprite(['.g..g', 'gGg.G', 'GGGGG'], { g: 0x9ede7f, G: 0x6fb95f }, x, y - 1);
    const yb = Math.round(bot(x + 3));
    g.sprite(['.g.g.', 'gGgGg'], { g: 0x9ede7f, G: 0x76c067 }, x + 3, yb - 1);
  }
  // lawn texture: deliberate grass strokes
  for (let x = 2; x < W; x += 5) for (const y0 of [149, 197]) {
    const y = y0 + ((x * 7) % 3) - 1;
    if (y < 147 || (y0 === 149 && y >= top(x) - 1)) continue;
    g.px(x, y, 0x6caf5c); g.px(x + 1, y - 1, 0xa2db86);
  }

  // soft canopy shadows on the lawn + path edge
  for (const [cx, cy, rx, ry] of [[24, 154, 30, 5], [298, 154, 30, 5]]) {
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1 && bay(x, y) < 0.5) g.px(x, y, dk(g.get(x, y), 0.18, 0x4a3a6a));
  }
  // left sakura tree (trunk + canopy)
  const sakura = [0xfff3f7, 0xffdbe7, 0xffc0d4, 0xf59fbd, 0xd97b9f];
  const trunk = (pts, base) => {
    const M = new Mask(g.w, g.h).stroke(pts);
    M.fill(g, (x, y) => (!M.has(x - 1, y) ? 0xa47468 : !M.has(x + 1, y) || !M.has(x + 2, y) ? 0x5d3a40 : base));
    M.outline(g, 0x3f2530);
    for (let i = 0; i < 26; i++) { // bark marks
      const [x, y] = pts[Math.floor(pr() * (pts.length - 1))];
      if (M.has(x + 1, y + 2) && M.has(x + 1, y + 4)) { g.px(x + 1, y + 2, 0x5d3a40); g.px(x + 1, y + 3, 0x5d3a40); }
    }
  };
  trunk([[18, 152, 5], [19, 130, 4], [22, 108, 4], [26, 86, 3], [36, 66, 2]], 0x7a4f50);
  trunk([[22, 110, 3], [10, 92, 2], [4, 76, 2]], 0x7a4f50);
  trunk([[26, 88, 2], [48, 74, 2], [62, 62, 1]], 0x7a4f50);
  const leftCan = [
    [6, 8, 24, -0.05], [34, 2, 20, -0.05], [60, 12, 16, 0], [80, 22, 11, 0.05],
    [-4, 36, 20, 0.1], [22, 30, 22, 0], [48, 34, 18, 0.05], [70, 42, 12, 0.1],
    [6, 58, 16, 0.15], [30, 56, 15, 0.12], [52, 58, 11, 0.15], [-6, 72, 12, 0.2],
  ];
  foliage(g, leftCan, sakura, 0xb85a82, { amp: 0.14, freq: 8 });
  // right sakura tree
  trunk([[302, 152, 5], [300, 128, 4], [296, 104, 4], [292, 84, 3], [280, 66, 2]], 0x7a4f50);
  trunk([[297, 106, 3], [312, 86, 2], [318, 72, 2]], 0x7a4f50);
  trunk([[293, 86, 2], [270, 74, 2], [256, 64, 1]], 0x7a4f50);
  const rightCan = [
    [312, 6, 24, -0.05], [284, 2, 20, -0.05], [260, 14, 15, 0], [242, 24, 10, 0.05],
    [322, 34, 20, 0.1], [296, 30, 22, 0], [270, 36, 17, 0.05], [250, 44, 11, 0.1],
    [312, 58, 16, 0.15], [288, 56, 15, 0.12], [266, 58, 11, 0.15], [324, 72, 12, 0.2],
  ];
  foliage(g, rightCan, sakura, 0xb85a82, { amp: 0.14, freq: 8 });
  // blossom details on canopies
  const br = rng(77);
  for (const can of [leftCan, rightCan]) for (const [cx, cy, r] of can) {
    for (let i = 0; i < r * 0.7; i++) {
      const a = br() * Math.PI * 2, d = br() * r * 0.8;
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      const lit = Math.cos(a) * d + Math.sin(a) * d < 0;
      if (lit) blossom(g, x, y, 0xfff8fb, 0xffb0c8); else { g.px(x, y, 0xe58aab); g.px(x + 1, y, 0xffd0de); }
    }
  }

  // wooden bench under the left tree
  {
    const bx = 52, by = 132;
    g.rect(bx, by, 30, 2, 0xc8875a); g.hl(bx, bx + 29, by, 0xe0a678);
    g.rect(bx, by + 4, 30, 2, 0xb8784f); g.hl(bx, bx + 29, by + 4, 0xd89a6c);
    g.rect(bx - 1, by + 8, 32, 2, 0xc8875a); g.hl(bx - 1, bx + 30, by + 8, 0xe7b083); g.hl(bx - 1, bx + 30, by + 10, 0x7b4a3a);
    for (const lx of [bx + 2, bx + 26]) { g.vl(lx, by + 2, by + 16, 0x5b4a5a); g.vl(lx + 1, by + 2, by + 16, 0x7a6878); }
  }
  // picnic blanket (gingham in perspective) + wicker basket, bottom-right
  {
    const top = 178, x0 = 262;
    const B = new Mask(g.w, g.h).poly([[x0, top], [W + 2, top - 4], [W + 2, 201], [x0 - 18, 201]]);
    B.fill(g, (x, y) => {
      const v = Math.floor((y - top) / 5);
      const u = Math.floor((x - x0 + (y - top) * 0.75) / 8);
      const a = v % 2 === 0, b = u % 2 === 0;
      return a && b ? pink : a || b ? 0xffadc4 : 0xfff6f9;
    });
    B.outline(g, dk(pink, 0.4), 0xffffff);
    const bx = 284, by = 172;
    g.ell(bx + 10, by + 15, 14, 3, (x, y) => (bay(x, y) < 0.6 ? dk(pink, 0.3) : null));
    for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) {
      const weave = ((x >> 1) + (y >> 1)) % 2;
      let c = weave ? 0xd8a060 : 0xc08848;
      if (y === 0) c = 0xf0c080; if (y === 13 || x === 19) c = 0x8a5a30; if (x === 0) c = 0xe8b878;
      g.px(bx + x, by + y, c);
    }
    g.hl(bx - 1, bx + 20, by, 0x8a5a30); g.hl(bx - 1, bx + 20, by - 1, 0xf0c080);
    for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; g.px(Math.round(bx + 10 - Math.cos(a) * 9), Math.round(by - 1 - Math.sin(a) * 9), 0x8a5a30); }
    g.rect(bx + 4, by - 3, 6, 3, 0xfff6f0); g.px(bx + 5, by - 4, 0xfff6f0); g.rect(bx + 11, by - 3, 4, 3, 0xe84a5a); g.px(bx + 13, by - 4, 0x5aa05a);
  }
  // butterflies
  g.sprite(['a.a', '.b.', 'a.a'], { a: yellow, b: 0x6a4a3a }, 104, 128);
  g.sprite(['a.a', '.b.'], { a: 0xffffff, b: 0x6a4a3a }, 230, 132);

  // falling petals everywhere (deliberately placed drift)
  const fr = rng(5);
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(fr() * W), y = Math.floor(fr() * 196);
    petal(g, x, y, i % 4, 0xffc4d6, 0xf59fbd);
  }
}

// --- shokudo: Showa-era taishu shokudo interior ----------------------------------------------
function shokudo(g, s) {
  const W = g.w;
  const red = hex(s.card.accent), blue = hex(s.card.accent2);
  const ink = 0x3a2418;
  // plaster wall with warm falloff from the lamps
  g.vgrad(0, 0, W, 122, [0xe9d6b0, 0xf1e2c2, 0xf3e6c8, 0xe9d6b0, 0xd9c296], 0.5);
  g.light(56, 24, 80, 70, 0xfff2cc, 0.4, 1.2);
  g.light(302, 24, 70, 70, 0xfff2cc, 0.4, 1.2);
  // ceiling beam
  g.rect(0, 0, W, 6, 0x4a2e22); g.hl(0, W, 5, 0x6e4630); g.hl(0, W, 6, 0x8a6a4a);
  for (let x = 12; x < W; x += 40) { g.hl(x, x + 9, 2, 0x5e3b2a); }
  // vertical posts at the far edges
  for (const x0 of [0, W - 7]) { g.rect(x0, 6, 7, 134, 0x6a4430); g.vl(x0 + (x0 ? 0 : 6), 6, 140, 0x4a2e22); g.vl(x0 + (x0 ? 1 : 1), 6, 140, 0x8a5c3c); }

  // menu tags (お品書き) on a rail, right side of the upper wall
  const tags = [['ラーメン', 0], ['カレー', 1], ['定食', 0], ['餃子', 1], ['おでん', 0], ['かつ丼', 1], ['ビール', 0]];
  const railY = 7, tx0 = 180;
  g.hl(tx0 - 4, W - 8, railY, 0x5e3b2a); g.hl(tx0 - 4, W - 8, railY + 1, 0x8a5c3c);
  tags.forEach(([name, alt], i) => {
    const x = tx0 + i * 17, y = railY + 2, h = 50;
    g.rect(x + 1, y + 1, 15, h, 0xc9ae84); // drop shadow on plaster
    g.rect(x, y, 15, h, 0xfbf3e0);
    g.vl(x + 14, y, y + h - 1, 0xe6dac0); g.hl(x, x + 14, y + h - 1, 0xe6dac0);
    g.hl(x, x + 14, y, 0xffffff);
    g.vtext(name, x + 8, y + 1, { size: 12, step: 12, color: alt ? red : ink });
    g.rect(x + 6, y + h - 4, 3, 2, red);
  });
  // small price card + calendar on the left wall
  {
    const cx = 18, cy = 18;
    g.rect(cx + 1, cy + 1, 24, 30, 0xc9ae84); g.rect(cx, cy, 24, 30, 0xfbf6ea); g.rect(cx, cy, 24, 7, red);
    g.tiny('10', cx + 12, cy + 10, ink, { scale: 3, align: 'center' });
    g.hl(cx + 3, cx + 20, cy + 26, 0xd8ccb4); g.px(cx + 12, cy - 2, 0x6a4a3a); g.line(cx + 12, cy - 2, cx + 6, cy, 0x6a4a3a); g.line(cx + 12, cy - 2, cx + 18, cy, 0x6a4a3a);
  }

  // pendant lamps
  const lamp = (x) => {
    g.vl(x, 6, 17, 0x3a2a22);
    g.sprite([
      '....aa....',
      '...abba...',
      '..abbbca..',
      '.abbbbbca.',
      'abbbbbbbca',
      'dddddddddd',
      '..eeffee..',
    ], { a: 0x2f5a46, b: 0x3f7a5c, c: 0x2a4a3c, d: 0x1f3a2e, e: 0xffe9a8, f: 0xffffff }, x - 5, 18);
    g.px(x - 3, 20, 0x6fae8c); g.px(x - 4, 21, 0x6fae8c);
  };
  lamp(56); lamp(302);
  g.beam(49, 63, 25, 16, 98, 138, 0xfff0c0, 0.25, 0.6);
  g.beam(295, 309, 25, 262, 320, 138, 0xfff0c0, 0.25, 0.6);

  // beer poster on the left wall
  {
    const x = 16, y = 58;
    g.rect(x + 1, y + 1, 32, 44, 0xb59a72);
    g.rect(x, y, 32, 44, 0xfff4dc); g.frame(x, y, 32, 44, 0xd8c4a0);
    g.rect(x + 2, y + 2, 28, 26, 0x7cc0e6); g.rect(x + 2, y + 20, 28, 8, 0xf0c060);
    // mug
    g.rect(x + 10, y + 8, 11, 15, 0xf4b232); g.rect(x + 10, y + 6, 11, 4, 0xffffff); g.px(x + 9, y + 7, 0xffffff); g.px(x + 21, y + 7, 0xffffff);
    g.vl(x + 11, y + 10, y + 21, 0xffd56a); g.vl(x + 19, y + 10, y + 21, 0xd8901e);
    g.frame(x + 21, y + 11, 4, 8, 0xd8e8f0); g.hl(x + 10, x + 20, y + 23, 0xc07a18);
    g.text('ビール', x + 16, y + 29, { size: 10, color: red, align: 'center' });
  }
  // pink public telephone on a shelf (right wall)
  {
    const x = 264, y = 82;
    g.rect(x - 4, y + 22, 44, 3, 0x8a5c3c); g.hl(x - 4, x + 39, y + 22, 0xb07a50); g.hl(x - 4, x + 39, y + 25, 0x5e3b2a);
    g.sprite([
      '....kkkkkkkkkkkk....',
      '...kppppppppppppk...',
      '..kpPPPPPPPPPPPPpk..',
      '..kpkkkkkkkkkkkkpk..',
      '.kpppppppppppppppqk.',
      '.kpPPPPPPPPPPPPPPqk.',
      '.kpPPwwwwwwwPPPPPqk.',
      '.kpPPwdwdwdwPPsPPqk.',
      '.kpPPwwwwwwwPPPPPqk.',
      '.kpPPwdwdwdwPPPPPqk.',
      '.kpPPwwwwwwwPPPPPqk.',
      '.kpPPPPPPPPPPPPPPqk.',
      '.kqqqqqqqqqqqqqqqqk.',
      '..kkkkkkkkkkkkkkkk..',
    ], { k: 0x8a3c5a, p: 0xffb8cf, P: 0xf690b4, q: 0xd8708f, w: 0xfff2f6, d: 0x8a3c5a, s: 0x3a2a2a }, x, y + 8);
    // cord to handset
    g.line(x + 3, y + 14, x - 1, y + 20, 0x8a3c5a);
    // maneki-neko beside the phone
    g.sprite([
      '.......kk.',
      '.k...kkwwk',
      'kwk.kwwwwk',
      'kwwkkwwwk.',
      'kwwwwwwwk.',
      'kwkwwwkwk.',
      'kwwwpwwwk.',
      '.krrrrrk..',
      'kwwwGwwwk.',
      'kwwwwwwwk.',
      'kwwwwwwwk.',
      '.kkkkkkk..',
    ], { k: 0x5a4a4a, w: 0xfffaf2, p: 0xff8aa0, r: red, G: 0xffd23f }, x + 23, y + 10);
  }

  // kitchen pass opening
  const kx0 = 92, kx1 = 236, ky0 = 65, ky1 = 118;
  g.rect(kx0 - 3, ky0 - 3, kx1 - kx0 + 6, ky1 - ky0 + 6, 0x5e3b2a);
  g.hl(kx0 - 3, kx1 + 2, ky0 - 3, 0x8a5c3c);
  // kitchen interior: tiled wall in warm shadow
  for (let y = ky0; y < ky1; y++) for (let x = kx0; x < kx1; x++) {
    const grout = (x - kx0) % 8 === 0 || (y - ky0) % 8 === 0;
    let c = grout ? 0x6e5a48 : tone(x, y, (y - ky0) / (ky1 - ky0), [0xb8a68c, 0x9e8a70], 0.6);
    g.px(x, y, c);
  }
  g.light(160, 100, 70, 26, 0xffd890, 0.35, 0.9);
  // shelf with stacked bowls (right) and stock pot (left)
  g.rect(kx0, 101, kx1 - kx0, 2, 0x7a5a40); g.hl(kx0, kx1 - 1, 101, 0xa07a58);
  for (let i = 0; i < 3; i++) {
    const bx = 178 + i * 16;
    for (let k = 0; k < 3; k++) {
      const by = 96 - k * 4;
      g.sprite([
        'kwwwwwwwwwwk',
        'kWrWrWrWrWWk',
        '.kwwwwwwwwk.',
        '..kkkkkkkk..',
      ], { k: 0x8a7a6a, w: 0xfdfaf2, W: 0xece4d6, r: red }, bx, by);
    }
  }
  // ladle hanging on the tiles
  g.vl(150, 66, 88, 0xc8ccd2); g.vl(151, 66, 88, 0x8a9098); g.ell(150, 91, 3, 2, 0xb8bec6); g.hl(148, 152, 90, 0xe6eaee);
  // stock pot
  g.rect(104, 103, 26, 13, 0xb8bec6); g.vl(105, 103, 115, 0xe6eaee); g.vl(128, 103, 115, 0x80868e); g.vl(129, 103, 115, 0x80868e);
  g.hl(102, 131, 103, 0xd4d8dc); g.hl(102, 131, 104, 0x8a9098); g.px(101, 106, 0x80868e); g.px(132, 106, 0x80868e);
  // steam curling from the pot up through the pass
  // steam rising from the pot
  mist(g, 117, 98, 13, 5, 0xfff8ee, 0.6); mist(g, 113, 91, 10, 5, 0xfff8ee, 0.45); mist(g, 120, 84, 9, 5, 0xfff8ee, 0.35); mist(g, 116, 78, 8, 4, 0xfff8ee, 0.25);
  // ticket rail
  g.hl(kx0 + 4, kx1 - 5, ky0 + 2, 0xc8ccd0);

  // noren over the pass: 4 panels 「大衆食堂」
  g.rect(kx0 - 6, ky0 - 1, kx1 - kx0 + 12, 2, 0x8a5c3c); g.hl(kx0 - 6, kx1 + 5, ky0 - 1, 0xc08a5c);
  g.px(kx0 - 7, ky0 - 1, 0x4a2e22); g.px(kx1 + 6, ky0 - 1, 0x4a2e22);
  const pw = (kx1 - kx0) / 4;
  ['大', '衆', '食', '堂'].forEach((ch, i) => {
    const x0 = Math.round(kx0 + i * pw) + 1, x1 = Math.round(kx0 + (i + 1) * pw) - 1;
    for (let x = x0; x <= x1; x++) {
      const len = 30 + Math.round(1.2 * Math.sin((x - x0) * 0.35 + i));
      for (let y = ky0 + 1; y <= ky0 + len; y++) {
        const fold = Math.sin((x - x0) * 0.55 + i * 1.3);
        let c = fold > 0.55 ? 0x3e5aa8 : fold < -0.55 ? 0x22336a : 0x2c4486;
        if (y < ky0 + 4) c = 0x22336a;
        if (x === x0) c = 0x4c68b8;
        if (x === x1) c = 0x1a2858;
        if (y === ky0 + len) c = 0x1a2858;
        g.px(x, y, c);
      }
    }
    g.text(ch, (x0 + x1) / 2 + 1, ky0 + 11, { size: 16, color: 0xf6f2e6, align: 'center' });
  });
  // shadow under the noren on the kitchen view
  // lower wall: wainscot boards
  for (let y = ky1 + 3; y < 140; y++) for (let x = 7; x < W - 7; x++) {
    const seam = (x % 14) === 0;
    let c = seam ? 0x5e3420 : (x % 14) === 1 ? 0xb87c48 : tone(x, y, (y - ky1) / 22, [0x9a6038, 0x84502e], 0.6);
    g.px(x, y, c);
  }
  g.hl(7, W - 8, ky1 + 3, 0x5e3420); g.hl(7, W - 8, ky1 + 4, 0xc08a5c);
  // stainless pass ledge
  g.rect(kx0 - 6, ky1, kx1 - kx0 + 12, 3, 0xc8ccd2); g.hl(kx0 - 6, kx1 + 5, ky1, 0xf2f4f6); g.hl(kx0 - 6, kx1 + 5, ky1 + 2, 0x8a9098);

  // counter top (floor band)
  const cy0 = 139, cy1 = 192;
  for (let y = cy0; y < cy1; y++) {
    const t = (y - cy0) / (cy1 - cy0);
    for (let x = 0; x < W; x++) {
      const plank = Math.floor((y - cy0) / 18);
      const gy = y + Math.round(1.5 * Math.sin(x * 0.045 + plank * 2.1) + Math.sin(x * 0.13 + plank));
      let c = tone(x, y, 0.2 + t * 0.6, [0xe8b070, 0xd99c5c, 0xc8884a]);
      if (gy % 6 === 0) c = dk(c, 0.18);
      if ((y - cy0) % 18 === 17) c = 0x8a5430;
      if ((y - cy0) % 18 === 0 && y > cy0) c = 0xf0c086;
      g.px(x, y, c);
    }
  }
  g.hl(0, W, cy0, 0x7a4a2a); g.hl(0, W, cy0 + 1, 0xa86e3e);
  // knots
  for (const [x, y] of [[74, 150], [218, 170], [140, 182], [290, 152]]) { g.ell(x, y, 3, 1, 0xa8703e); g.px(x, y, 0x7a4a2a); }
  // lamp reflections + warm pools
  g.light(56, 158, 70, 22, 0xfff0c8, 0.32, 1.2, 0.5);
  g.light(302, 158, 60, 22, 0xfff0c8, 0.32, 1.2, 0.5);
  // near edge lip + underside
  g.hl(0, W, cy1, 0xf4c890); g.hl(0, W, cy1 + 1, 0xd08e52); g.rect(0, cy1 + 2, W, 2, 0x8a5430); g.rect(0, cy1 + 4, W, 4, 0x4a2a1a);

  // counter props: soy sauce, chopstick holder (left); shichimi, toothpicks, water glass (right)
  const shadow = (x, y, w) => { for (let i = 0; i < w; i++) if (bay(x + i, y) < 0.7) g.px(x + i, y, 0xa86e3e); g.hl(x + 1, x + w - 2, y + 1, 0xb87a46); };
  // soy sauce dispenser (glass teardrop with red cap)
  shadow(8, 176, 22);
  g.sprite([
    '......rr.....',
    '.....rRRr....',
    '....rRRRrr...',
    '....rrrrrr.r.',
    '...rRRRRRRr..',
    '...rrrrrrrr..',
    '....kGggk....',
    '...kGgdddk...',
    '..kGgddddbk..',
    '.kGgdddddddk.',
    '.kGddddddddk.',
    'kGgdddddddbdk',
    'kGddddddddddk',
    'kGddddddddbdk',
    'kGddddddddddk',
    'kgddddddddbdk',
    '.kddddddddddk',
    '.kkdddddddkk.',
    '..kkkkkkkkk..',
  ], { r: red, R: lt(red, 0.35), k: 0x2a1410, g: 0xd8e2e8, G: 0xffffff, d: 0x4a160e, b: 0x7a2e1c }, 10, 158);
  // chopstick holder
  shadow(30, 174, 14);
  for (let i = 0; i < 6; i++) g.line(33 + i * 2, 154 + (i % 2), 32 + i * 2 + (i > 2 ? 1 : 0), 164, i % 2 ? 0xe8c890 : 0xf4dca8);
  g.rect(31, 162, 12, 12, 0xb8783c); g.vl(32, 162, 173, 0xe0a060); g.vl(41, 162, 173, 0x7a4a24); g.vl(42, 162, 173, 0x6a3a1c);
  g.hl(31, 42, 162, 0xf0b878); g.hl(32, 41, 166, 0x9a5e2c); g.hl(32, 41, 169, 0x9a5e2c);
  // water glass
  shadow(282, 178, 14);
  for (let y = 163; y < 179; y++) for (let x = 284; x < 295; x++) {
    let c = y < 166 ? null : 0xcfe6ee;
    if (x === 284 || x === 294) c = 0xeaf6fa; if (x === 285) c = 0xffffff;
    if (y === 178) c = 0xb8d0d8;
    if (c == null) { if (x === 284 || x === 294) c = 0xeaf6fa; else continue; }
    g.px(x, y, c);
  }
  g.rect(287, 168, 3, 3, 0xffffff); g.rect(290, 171, 2, 2, 0xf0fafc);
  // shichimi can
  shadow(300, 177, 12);
  g.rect(302, 163, 8, 14, red); g.vl(303, 163, 176, lt(red, 0.4)); g.vl(309, 163, 176, dk(red, 0.3));
  g.rect(302, 161, 8, 2, 0x3a2a22); g.hl(302, 309, 168, 0xffd23f); g.hl(302, 309, 172, 0xffd23f);
  // toothpick jar
  shadow(266, 178, 10);
  for (let i = 0; i < 5; i++) g.vl(268 + i, 162 - (i % 2), 168, 0xf4e2b8);
  g.rect(267, 168, 7, 10, 0xd8eef4); g.vl(267, 168, 177, 0xffffff); g.hl(267, 273, 167, 0x9ab8c0);
}

/** Hydrangea bush: big florets heads over pointed leaves. hues: [light, base, shade, deep]. */
function hydrangea(g, heads, leafPal, seed = 3) {
  const r = rng(seed);
  // leaves first
  for (const [cx, cy, rad] of heads) {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI + Math.PI * 0.1 + r() * 0.4;
      const lx = cx + Math.cos(a) * rad * 1.2 * (k % 2 ? 1 : -1), ly = cy + rad * 0.6 + Math.sin(a) * rad * 0.5;
      leaf(g, lx, ly, rad * 0.75, (k % 2 ? 0.5 : -0.5) + (r() - 0.5) * 0.4, leafPal);
    }
  }
  for (const [cx, cy, rad, pal] of heads) {
    const M = new Mask(g.w, g.h).blob(cx, cy, rad, 0.14, 9, cx);
    M.fill(g, (x, y) => tone(x, y, 0.55 + ((y - cy) * 0.8 + (x - cx) * 0.4) / rad * 0.5, [pal[1], pal[2], pal[3]]));
    M.outline(g, dk(pal[3], 0.35), pal[2]);
    // florets: little 4-petal crosses in the light colour on a jittered grid
    for (let y = cy - rad; y <= cy + rad; y += 3) for (let x = cx - rad + ((y / 3) % 2 ? 1 : 0); x <= cx + rad; x += 3) {
      const fx = Math.round(x + r() * 1.4 - 0.7), fy = Math.round(y + r() * 1.4 - 0.7);
      if (!M.has(fx, fy) || !M.has(fx + 1, fy + 1) || !M.has(fx - 1, fy - 1)) continue;
      const lit = (fx - cx) + (fy - cy) < rad * 0.5;
      const c = lit ? pal[0] : pal[1];
      g.px(fx, fy - 1, c); g.px(fx - 1, fy, c); g.px(fx + 1, fy, c); g.px(fx, fy + 1, lit ? pal[1] : pal[2]);
      g.px(fx, fy, lit ? 0xffffff : pal[2]);
    }
  }
}

/** Pointed leaf with a centre vein. ang: tilt (-1..1). pal: [light, base, dark, outline]. */
function leaf(g, cx, cy, len, ang, pal) {
  const M = new Mask(g.w, g.h);
  // leaf axis from base (cx,cy+len/2) to tip (cx+ang*len, cy-len/2)
  const bx = cx, by = cy + len * 0.5, tx = cx + ang * len, ty = cy - len * 0.5;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, w = Math.sin(t * Math.PI) * len * 0.36;
    M.ell(bx + (tx - bx) * t, by + (ty - by) * t, w, w);
  }
  M.fill(g, (x, y) => {
    const t = ((x - bx) * (tx - bx) + (y - by) * (ty - by)) / ((tx - bx) ** 2 + (ty - by) ** 2);
    const px = bx + (tx - bx) * t, py = by + (ty - by) * t;
    const side = (x - px) * (ty - by) - (y - py) * (tx - bx);
    if (Math.abs(x - px) < 0.6 && Math.abs(y - py) < 0.9 && t > 0.05 && t < 0.9) return pal[0];
    return side < 0 ? pal[1] : pal[2];
  });
  M.outline(g, pal[3]);
}

// --- kasa: rainy shotengai with hydrangeas ---------------------------------------------------
function kasa(g, s) {
  const W = g.w;
  const red = hex(s.card.accent), yellow = hex(s.card.accent2), navy = hex(s.card.text);
  // overcast sky with rain-haze strata
  g.vgrad(0, 0, W, 70, [0x8a9db4, 0x9fb1c6, 0xb4c3d4, 0xc6d2de], 0.6);
  for (const [x, y, w] of [[10, 8, 70], [120, 14, 90], [230, 6, 80], [60, 26, 60], [190, 30, 70]]) {
    for (let i = 0; i < w; i++) { if (bay(x + i, y) < 0.6) g.px(x + i, y, 0x8496ad); if (bay(x + i, y + 1) < 0.3) g.px(x + i + 3, y + 1, 0x8496ad); }
  }
  g.rect(0, 70, W, 75, 0xa9b7c8);
  // distant buildings through the rain haze
  const far = [[0, 30, 26], [24, 22, 18], [96, 26, 30], [150, 12, 24], [176, 20, 34], [236, 28, 22], [262, 18, 30], [300, 24, 20]];
  for (const [x, y, w] of far) {
    g.rect(x, y, w, 70, 0xa9b7c8);
    for (let wy = y + 4; wy < y + 60; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) g.rect(wx, wy, 2, 3, 0x9aa9bc);
  }
  g.rect(158, 4, 2, 10, 0xa9b7c8); g.px(158, 3, red);

  // shop row
  const shopTop = 92, shopBot = 140;
  const wetWall = (x, y, w, h, base) => { g.rect(x, y, w, h, base); for (let i = 0; i < w; i += 3) g.drect(x + i, y + h - 6, 1, 6, dk(base, 0.15), 0.6); };
  // 1. umbrella shop (wood, kawara roof)
  {
    const x0 = 0, x1 = 62;
    wetWall(x0, 36, x1 - x0, shopTop - 36, 0x6a4a3a);
    for (let x = x0 + 2; x < x1; x += 4) g.vl(x, 38, shopTop - 1, 0x5a3c30);
    // roof (kawara)
    for (let y = 26; y < 36; y++) for (let x = x0; x < x1 + 4; x++) {
      const row = Math.floor((y - 26) / 3);
      let c = (x + row * 2) % 5 === 0 ? 0x4a5468 : 0x667088;
      if ((y - 26) % 3 === 0) c = 0x8a94a8;
      g.px(x, y, c);
    }
    g.hl(x0, x1 + 3, 36, 0x2e3446);
    // upper lattice window, faintly lit
    g.rect(10, 46, 40, 28, 0xe8d8a8); g.light(30, 60, 26, 20, 0xfff0c0, 0.4, 1);
    for (let x = 10; x < 50; x += 3) g.vl(x, 46, 73, 0x4a3226);
    g.frame(9, 45, 42, 30, 0x3a261e); g.hl(9, 50, 59, 0x3a261e);
    // shop eave
    g.rect(x0, shopTop - 4, x1 + 2, 4, 0x4a5468); g.hl(x0, x1 + 1, shopTop - 4, 0x8a94a8); g.hl(x0, x1 + 1, shopTop - 1, 0x2e3446);
    // open front, warm interior
    g.vgrad(x0, shopTop, x1 - x0, shopBot - shopTop, [0x8a6440, 0xd8a868, 0xf0c888], 0.6);
    // hanging opened umbrellas (domes)
    const umb = (cx, cy, r, c) => {
      g.ell(cx, cy, r, r * 0.6, (x, y, nx, ny) => (ny > 0.05 ? null : (Math.floor((nx + 1) * 3) % 2 ? c : lt(c, 0.3))));
      g.hl(cx - r, cx + r, cy, dk(c, 0.35)); g.vl(cx, cy - Math.round(r * 0.6) - 2, cy - Math.round(r * 0.6), 0x3a261e);
      g.vl(cx, cy, cy + 4, 0x3a261e);
    };
    umb(12, 104, 9, red); umb(32, 101, 8, yellow); umb(50, 105, 9, 0x4a8ad8);
    // umbrella stand with folded umbrellas
    for (let i = 0; i < 9; i++) {
      const ux = 6 + i * 6, c = [red, yellow, 0x4a8ad8, 0x56b86a, 0xf08ab8, navy][i % 6];
      g.vl(ux, 116, 136, c); g.vl(ux + 1, 117, 136, dk(c, 0.3)); g.px(ux, 114, 0x3a261e); g.px(ux, 115, 0x3a261e); g.px(ux + 1, 114, 0x3a261e);
    }
    g.rect(2, 130, 56, 10, 0x7a5a3a); g.hl(2, 57, 130, 0xa07a50); g.hl(2, 57, 139, 0x4a3226);
    // vertical hanging sign 「傘」
    g.rect(52, 40, 14, 40, 0xf4ead4); g.frame(51, 39, 16, 42, 0x3a261e);
    g.vtext('傘', 59, 43, { size: 12, color: red }); g.vtext('かさ', 59, 57, { size: 10, color: navy });
  }
  // 2. dagashi with red scalloped awning
  {
    const x0 = 64, x1 = 122;
    wetWall(x0, 44, x1 - x0, shopTop - 44, 0xc8c0b0);
    g.hl(x0, x1 - 1, 44, 0xe8e2d4); g.rect(x0 - 2, 40, x1 - x0 + 4, 4, 0x8a8478); g.hl(x0 - 2, x1 + 1, 40, 0xb8b2a8);
    // upstairs window with railing
    g.rect(74, 52, 38, 20, 0x6a7a90); g.light(93, 62, 18, 10, 0xb0c0d8, 0.4, 1);
    g.frame(73, 51, 40, 22, 0x4a4a4a); g.vl(93, 52, 71, 0x4a4a4a);
    for (let x = 72; x < 115; x += 3) g.vl(x, 66, 74, 0x3a3e48); g.hl(71, 115, 65, 0x5a5e68);
    // signboard
    g.rect(x0 + 4, 77, 50, 12, 0xfff6e0); g.frame(x0 + 3, 76, 52, 14, 0x3a261e);
    g.text('だがし', x0 + 29, 77, { size: 12, color: red, align: 'center' });
    // awning
    for (let y = 92; y < 101; y++) for (let x = x0 - 2; x < x1 + 2; x++) {
      const stripe = Math.floor((x - x0) / 6) % 2;
      let c = stripe ? 0xfff2ee : red;
      if (y < 94) c = dk(c, 0.12);
      g.px(x, y, c);
    }
    for (let x = x0 - 2; x < x1 + 2; x += 6) g.ell(x + 3, 101, 3, 1.5, (xx, yy, nx, ny) => (ny < 0 ? null : (Math.floor((x - x0) / 6) % 2 ? 0xfff2ee : red)));
    g.hl(x0 - 2, x1 + 1, 91, dk(red, 0.4));
    // lit interior with candy jars
    g.vgrad(x0, 104, x1 - x0, 36, [0xf6dca0, 0xe8c080], 0.5);
    for (let i = 0; i < 6; i++) {
      const jx = x0 + 4 + i * 9, jc = [0xff8ab0, yellow, 0x8ad86a, 0xff9a4a, 0x8ac8ff, 0xd8a0ff][i];
      g.rect(jx, 116, 7, 9, 0xdff0f4); g.rect(jx + 1, 119, 5, 5, jc); g.hl(jx + 1, jx + 5, 115, 0x8a6440); g.vl(jx, 116, 124, 0xffffff);
    }
    g.rect(x0, 125, x1 - x0, 15, 0x9a7a54); g.hl(x0, x1 - 1, 125, 0xc8a070);
    for (let i = 0; i < 5; i++) g.rect(x0 + 3 + i * 11, 128, 9, 9, [0xff6a6a, 0x6ab0ff, yellow, 0xff9ad0, 0x7ad87a][i]);
  }
  // 3. three-storey building with a closed shutter
  {
    const x0 = 124, x1 = 200;
    wetWall(x0, 18, x1 - x0, shopTop - 18, 0x9aa2ae);
    g.hl(x0, x1 - 1, 18, 0xc0c8d2); g.rect(x0 - 1, 16, x1 - x0 + 2, 2, 0x7a828e);
    for (const wy of [24, 52]) for (let i = 0; i < 3; i++) {
      const wx = x0 + 6 + i * 24;
      const lit = (i + wy) % 3 === 0;
      g.rect(wx, wy, 18, 20, lit ? 0xf0d890 : 0x5a6a80);
      if (lit) g.rect(wx + 1, wy + 1, 16, 4, 0xfff0c0); else { g.line(wx + 2, wy + 15, wx + 8, wy + 3, 0x7a8aa0); }
      g.frame(wx - 1, wy - 1, 20, 22, 0x5a6270); g.vl(wx + 9, wy, wy + 19, 0x5a6270);
      g.hl(wx - 2, wx + 19, wy + 21, 0xd0d6de);
    }
    // aircon unit
    g.rect(x0 + 52, 76, 16, 11, 0xdedad0); g.frame(x0 + 52, 76, 16, 11, 0x6a6e78); for (let y = 78; y < 86; y += 2) g.hl(x0 + 54, x0 + 61, y, 0x9a9ea8); g.ell(x0 + 64, 81, 2, 3, 0x8a8e98);
    // shutter
    g.rect(x0, shopTop - 3, x1 - x0, 3, 0x5a6270);
    for (let y = shopTop; y < shopBot; y++) for (let x = x0 + 2; x < x1 - 2; x++) g.px(x, y, (y - shopTop) % 3 === 0 ? 0x8a929e : (y - shopTop) % 3 === 1 ? 0xc4cad2 : 0xaab2bc);
    g.vl(x0 + 1, shopTop, shopBot - 1, 0x5a6270); g.vl(x1 - 2, shopTop, shopBot - 1, 0x5a6270);
    // paper notice 「本日休業」
    g.rect(x0 + 13, 104, 50, 16, 0xfdfaf0); g.frame(x0 + 13, 104, 50, 16, 0xd8d0c0);
    g.px(x0 + 14, 105, 0xc0b8a8); g.px(x0 + 61, 105, 0xc0b8a8);
    g.text('本日休業', x0 + 38, 106, { size: 12, color: 0x2a2a3a, align: 'center' });
  }
  // 4. kissa (brick, striped awning)
  {
    const x0 = 202, x1 = 262;
    for (let y = 38; y < shopTop; y++) for (let x = x0; x < x1; x++) {
      const row = Math.floor((y - 38) / 4), off = row % 2 ? 4 : 0;
      const mortar = (y - 38) % 4 === 3 || (x - x0 + off) % 8 === 7;
      g.px(x, y, mortar ? 0x8a6a5a : ((x + off) >> 3) % 3 === 0 ? 0xa04a3a : 0xb45a44);
    }
    g.rect(x0 - 2, 34, x1 - x0 + 4, 4, 0x5a3a30); g.hl(x0 - 2, x1 + 1, 34, 0x8a6050);
    // bay window upstairs
    g.rect(x0 + 10, 46, 40, 24, 0xf2d48c); g.light(x0 + 30, 58, 22, 14, 0xfff6d0, 0.5, 1);
    g.frame(x0 + 9, 45, 42, 26, 0xf4f0e6); g.vl(x0 + 23, 46, 69, 0xf4f0e6); g.vl(x0 + 36, 46, 69, 0xf4f0e6);
    g.rect(x0 + 7, 71, 46, 2, 0xf4f0e6); g.hl(x0 + 7, x0 + 52, 73, 0x6a4a40);
    // awning stripes
    for (let y = 80; y < 92; y++) for (let x = x0 - 2 - Math.floor((y - 80) / 3); x < x1 + 2 + Math.floor((y - 80) / 3); x++) {
      let c = Math.floor((x - x0) / 5) % 2 ? 0xf4f0e6 : 0x2f8a5a;
      if (y === 91) c = dk(c, 0.25);
      g.px(x, y, c);
    }
    // warm shop window + door
    g.rect(x0, shopTop, x1 - x0, shopBot - shopTop, 0x5a3a30);
    g.vgrad(x0 + 3, shopTop + 3, 36, 30, [0xffe4a0, 0xf0c070], 0.6);
    g.frame(x0 + 2, shopTop + 2, 38, 32, 0x3a261e);
    // cups silhouette on the counter inside
    g.rect(x0 + 3, shopTop + 24, 36, 2, 0x8a5a40);
    for (const cx of [x0 + 8, x0 + 20, x0 + 30]) { g.rect(cx, shopTop + 19, 5, 5, 0xffffff); g.px(cx + 5, shopTop + 20, 0xffffff); g.px(cx + 5, shopTop + 21, 0xffffff); g.hl(cx, cx + 4, shopTop + 23, 0xd8c8b0); }
    g.rect(x0 + 44, shopTop + 4, 13, 44, 0xe8c080); g.frame(x0 + 43, shopTop + 3, 15, 45, 0x3a261e); g.px(x0 + 46, shopTop + 26, yellow);
    g.tiny('OPEN', x0 + 50, shopTop + 8, red, { align: 'center' });
  }
  // 5. bookshop (wood, navy awning)
  {
    const x0 = 264, x1 = W;
    wetWall(x0, 30, x1 - x0, shopTop - 30, 0xd8ccb4);
    for (let y = 22; y < 30; y++) for (let x = x0 - 3; x < x1; x++) g.px(x, y, (y - 22) % 3 === 0 ? 0x8a94a8 : (x + y) % 5 === 0 ? 0x4a5468 : 0x667088);
    g.hl(x0 - 3, x1, 30, 0x2e3446);
    g.rect(x0 + 8, 40, 26, 22, 0x5a6a80); g.frame(x0 + 7, 39, 28, 24, 0x4a3226); g.hl(x0 + 7, x0 + 34, 50, 0x4a3226);
    g.rect(x0 + 4, 70, 46, 14, 0x2e3a5a); g.frame(x0 + 3, 69, 48, 16, 0xe8dcc0);
    g.text('本と文具', x0 + 27, 71, { size: 12, color: 0xfff6e0, align: 'center' });
    for (let y = 86; y < 94; y++) for (let x = x0 - 2; x < x1; x++) g.px(x, y, y === 93 ? 0x1a2440 : (x % 8) < 4 ? navy : 0x34507a);
    g.vgrad(x0, 94, x1 - x0, 46, [0xffeab0, 0xf2cc84], 0.5);
    for (let i = 0; i < 9; i++) { const bx = x0 + 4 + i * 5; g.rect(bx, 100 + (i % 3), 4, 18 - (i % 3), [0xd84a4a, 0x4a7ad8, 0x5ab86a, 0xf0b040, 0x8a5ad8][i % 5]); g.vl(bx, 100 + (i % 3), 117, 0xffffff); }
    g.rect(x0, 118, x1 - x0, 3, 0x8a5a3a);
    g.rect(x0 + 2, 124, 40, 16, 0x9a6a44); g.hl(x0 + 2, x0 + 41, 124, 0xc8946a);
    for (let i = 0; i < 4; i++) g.rect(x0 + 5 + i * 9, 121, 7, 4, [0xfff6e0, 0xff9a9a, 0xa0d0ff, 0xfff6e0][i]);
  }
  // kissa's protruding sign overlaps the neighbour
  {
    g.rect(257, 36, 16, 54, 0x2e3a5a); g.frame(256, 35, 18, 56, 0xd8c890); g.vl(257, 36, 89, 0x46527a);
    g.vtext('喫茶', 265, 38, { size: 12, step: 13, color: 0xfff0c0 });
    g.hl(259, 270, 65, 0xd8c890);
    g.vtext('あめ', 265, 67, { size: 10, step: 11, color: yellow });
  }
  // utility pole + sagging wires
  {
    const px0 = 197;
    g.rect(px0, 0, 5, 142, 0x8a8e96); g.vl(px0, 0, 141, 0xb4b8c0); g.vl(px0 + 4, 0, 141, 0x5a5e68);
    g.rect(px0 - 9, 10, 23, 3, 0x6a6e78); g.hl(px0 - 9, px0 + 13, 10, 0x9a9ea8);
    g.rect(px0 + 6, 16, 8, 12, 0x7a7e88); g.vl(px0 + 6, 16, 27, 0xa0a4ac);
    g.rect(px0 - 2, 96, 9, 28, 0xf2d24a); for (let y = 98; y < 122; y += 4) g.hl(px0 - 2, px0 + 6, y, 0x2a2a2a);
    for (const [y0, sag, xa] of [[11, 9, -9], [11, 7, 13], [14, 6, -9]]) {
      for (let x = 0; x < W; x++) {
        const t = xa < 0 ? (x - (px0 + xa)) / (px0 + xa) : (x - (px0 + xa)) / (W - px0 - xa);
        const yy = y0 + sag * (1 - (2 * t + (xa < 0 ? 1 : -1)) ** 2) * 0 + sag * Math.sin(Math.PI * Math.abs(t)) ;
        if ((xa < 0 && x <= px0 + xa) || (xa > 0 && x >= px0 + xa)) g.px(x, Math.round(yy), 0x3a3e4a);
      }
    }
  }

  // sidewalk + curb
  for (let y = shopBot; y < 147; y++) for (let x = 0; x < W; x++) g.px(x, y, (x % 20 === 0) ? 0x6a7484 : y === shopBot ? 0x5a6474 : tone(x, y, (y - shopBot) / 7, [0x8e98a8, 0xa0aab8]));
  g.hl(0, W, 147, 0xc8d0dc); g.hl(0, W, 148, 0x9aa4b2); g.hl(0, W, 149, 0x3e4858);

  // wet stone setts (floor band)
  const rows = [150, 155, 161, 168, 176, 185, 195, 206];
  const sr = rng(19);
  for (let k = 0; k < rows.length - 1; k++) {
    const y0 = rows[k], y1 = rows[k + 1], hgt = y1 - y0;
    const sw = Math.round(hgt * 2.2) + 4, off = (k % 2) * Math.round(sw / 2);
    for (let x = -off; x < W; x += sw) {
      const base = [0x5e6c80, 0x566478, 0x667488][Math.floor(sr() * 3)];
      for (let y = y0; y < y1; y++) for (let xx = x; xx < x + sw; xx++) {
        let c = base;
        if (y === y0) c = 0x8ea0b6; else if (y === y0 + 1 && bay(xx, y) < 0.5) c = lt(base, 0.15);
        if (y === y1 - 1 || xx === x + sw - 1) c = 0x353f50;
        if (xx === x) c = 0x7888a0;
        g.px(xx, y, c);
      }
    }
  }
  // warm reflections of lit shop fronts on the wet stones
  for (const [xa, xb] of [[4, 58], [66, 120], [204, 240], [266, 318]]) {
    for (let x = xa; x < xb; x++) for (let y = 150; y < 200; y++) {
      const t = 1 - (y - 150) / 50;
      if (bay(x, y) < t * 0.55 && (x + Math.floor(y / 2)) % 3 !== 0) g.px(x, y, mix(g.get(x, y), 0xf2c878, 0.35));
    }
  }
  // puddles reflecting the street
  const axis = 147;
  // puddles: sky sheen, mirrored shop silhouettes and warm streaks under lit windows
  const lit = [[4, 58], [66, 120], [204, 240], [266, 318]];
  const puddle = (cx, cy, rx, ry) => {
    const M = new Mask(g.w, g.h);
    M.ell(cx, cy, rx, ry); M.ell(cx - rx * 0.3, cy + 1, rx * 0.75, ry); M.ell(cx + rx * 0.3, cy, rx * 0.7, ry * 0.9);
    M.fill(g, (x, y) => {
      if (!M.has(x, y - 1)) return 0x2a3242;
      const v = (y - (cy - ry)) / (2 * ry);
      const warm = lit.some(([a, b]) => x > a + 3 && x < b - 3);
      let c = tone(x, y, v * 0.9, [0x7c8ea6, 0xa4b4c8, 0xc4d2e0], 0.6);
      if (v < 0.35) c = 0x4a5870;
      if (warm && v >= 0.35 && x % 3 === 1 && bay(x, y) < 0.75) c = v > 0.7 ? 0xd8b070 : 0xf4d490;
      return c;
    });
    M.outline(g, 0x323c4e, 0x9aaabe);
    for (let i = 0; i < 2; i++) {
      const rx2 = Math.round(cx + (i ? rx * 0.45 : -rx * 0.35)), ry2 = cy + 1 + i;
      g.px(rx2 - 3, ry2, 0xe8f0f8); g.px(rx2 + 3, ry2, 0xe8f0f8); g.hl(rx2 - 2, rx2 + 2, ry2 - 1, 0xe8f0f8); g.hl(rx2 - 2, rx2 + 2, ry2 + 1, 0x8a9cb4);
    }
  };
  puddle(96, 178, 30, 6); puddle(222, 190, 36, 6); puddle(160, 160, 18, 3); puddle(276, 166, 14, 3);

  // hydrangeas framing the bottom corners
  const leafPal = [0x9ad08a, 0x4f9a5a, 0x2f6e44, 0x1e4430];
  const blue = [0xd4e2ff, 0x9ab4f4, 0x6a86dc, 0x4a5cb4], purple = [0xf0dcff, 0xc6a0f0, 0x9a70d6, 0x6e4aac], pinkH = [0xffe6f2, 0xf4a8d0, 0xd878b0, 0xa8508a];
  hydrangea(g, [[8, 170, 11, blue], [26, 184, 10, purple], [4, 194, 9, pinkH], [40, 197, 8, blue]], leafPal, 7);
  hydrangea(g, [[312, 168, 11, purple], [294, 184, 10, blue], [316, 192, 9, blue], [280, 197, 8, pinkH]], leafPal, 9);

  // rain streaks
  const rr = rng(23);
  for (let gy = -6; gy < 200; gy += 11) for (let gx = 0; gx < W + 20; gx += 13) {
    const x = gx + Math.floor(rr() * 9), y = gy + Math.floor(rr() * 7), len = 4 + Math.floor(rr() * 4);
    for (let k = 0; k < len; k++) {
      const xx = x - Math.floor((k + (y % 3)) / 3), yy = y + k, bg = g.get(xx, yy);
      const L = ((bg >> 16) & 255) * 0.3 + ((bg >> 8) & 255) * 0.59 + (bg & 255) * 0.11;
      g.px(xx, yy, k === len - 1 ? 0xf4f8fc : L > 150 ? 0xdde6f0 : 0xa4b4c8);
    }
  }
  // splashes on the street
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rr() * W), y = 152 + Math.floor(rr() * 46);
    g.px(x - 1, y - 1, 0xdfe8f4); g.px(x + 1, y - 1, 0xdfe8f4); g.px(x, y, 0xb8c8dc);
  }
}

// --- showa: 1970s living room at sunset --------------------------------------------------------
function showa(g, s) {
  const W = g.w;
  const orange = hex(s.card.accent), teal = hex(s.card.accent2);
  // floral wallpaper with warm light falling off to the right
  const wallA = 0xf2d8a4, wallB = 0xe6c690, wallC = 0xd4ac74;
  for (let y = 0; y < 132; y++) for (let x = 0; x < W; x++) {
    const t = clamp01((x - 60) / 300 + (y / 132) * 0.25);
    g.px(x, y, tone(x, y, t, [wallA, wallB, wallC], 0.5));
  }
  const motif = (cx, cy, alt) => {
    const lit = cx < 200;
    const pet = alt ? (lit ? 0xe89a5a : 0xcc7e46) : (lit ? 0xd8b070 : 0xbc9458);
    const pet2 = alt ? (lit ? 0xd27a3e : 0xb46636) : (lit ? 0x6fa898 : 0x5a8c80);
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 + (alt ? 0 : 0.5);
      const px = Math.round(cx + Math.cos(a) * 3.2), py = Math.round(cy + Math.sin(a) * 3.2);
      g.px(px, py, pet); g.px(px + 1, py, pet); g.px(px, py + 1, pet2); g.px(px + 1, py + 1, pet);
    }
    g.px(cx, cy, 0xf4c24a); g.px(cx + 1, cy, 0xf4c24a); g.px(cx, cy + 1, 0xe0a030); g.px(cx + 1, cy + 1, 0xe0a030);
  };
  for (let row = 0; row < 8; row++) for (let col = 0; col < 18; col++) {
    const cx = col * 20 + (row % 2) * 10 + 4, cy = 20 + row * 15;
    if (cy > 124) continue;
    motif(cx, cy, (row + col) % 2);
    if ((row + col) % 2) { g.px(cx + 10, cy + 7, 0xc89a60); g.px(cx + 11, cy + 8, 0xc89a60); }
  }
  // nageshi beam + ceiling strip
  g.rect(0, 0, W, 6, 0xc8a070); g.hl(0, W, 0, 0xe0bc88);
  g.rect(0, 9, W, 5, 0x8a5a36); g.hl(0, W, 9, 0xb07a4a); g.hl(0, W, 13, 0x5a3820); g.hl(0, W, 14, 0xb08a5a);
  g.rect(0, 6, W, 3, 0xe8c890);

  // sliding window with sunset view
  const wx0 = 12, wx1 = 120, wy0 = 22, wy1 = 104;
  const sky = [0x5a4a8a, 0x8a5a9a, 0xc86a8a, 0xf08a6a, 0xffae5a, 0xffd27a];
  g.vgrad(wx0, wy0, wx1 - wx0, wy1 - wy0, sky, 0.6);
  // sun + glow
  g.light(70, 88, 40, 26, 0xfff0b0, 0.4, 1.2);
  g.ell(70, 90, 9, 9, (x, y, nx, ny) => (ny < -0.4 ? 0xfffbe0 : ny < 0.2 ? 0xfff0b0 : 0xffd890));
  // thin clouds
  for (const [x, y, w] of [[22, 50, 30], [64, 58, 44], [30, 70, 22], [90, 40, 24]]) { g.hl(x, x + w, y, 0xffc89a); g.hl(x + 3, x + w + 4, y + 1, 0xe8846a); }
  // rooftop silhouettes + pole + crows
  const roofs = [[wx0, 92], [26, 88], [40, 94], [54, 90], [84, 86], [100, 93], [112, 89]];
  for (let i = 0; i < roofs.length; i++) {
    const [rx, ry] = roofs[i], rx1 = i + 1 < roofs.length ? roofs[i + 1][0] : wx1;
    for (let x = rx; x < rx1; x++) {
      const peak = ry - Math.min(x - rx, rx1 - x) * 0.4;
      for (let y = Math.round(peak); y < wy1; y++) g.px(x, y, y < peak + 1 ? 0x6a3a5a : 0x4a2a48);
    }
  }
  g.rect(98, 50, 2, 54, 0x3a2240); g.hl(93, 104, 54, 0x3a2240); g.hl(95, 102, 58, 0x3a2240);
  for (let x = wx0; x < 98; x++) g.px(x, Math.round(55 + 4 * Math.sin((x - wx0) / (98 - wx0) * Math.PI)), 0x3a2240);
  bird(g, 40, 40, 0x3a2240, true); bird(g, 52, 46, 0x3a2240); bird(g, 30, 47, 0x3a2240);
  // window frame (wooden, two sliding panes with crossbars)
  const fr = 0x7a4a2a, frL = 0xa8703e, frD = 0x4a2a18;
  g.rect(wx0 - 4, wy0 - 4, wx1 - wx0 + 8, 4, fr); g.hl(wx0 - 4, wx1 + 3, wy0 - 4, frL);
  g.rect(wx0 - 4, wy1, wx1 - wx0 + 8, 5, fr); g.hl(wx0 - 4, wx1 + 3, wy1, frL); g.hl(wx0 - 5, wx1 + 4, wy1 + 4, frD);
  g.rect(wx0 - 4, wy0, 4, wy1 - wy0, fr); g.rect(wx1, wy0, 4, wy1 - wy0, fr); g.vl(wx1, wy0, wy1, frD);
  const mid = (wx0 + wx1) >> 1;
  g.rect(mid - 2, wy0, 4, wy1 - wy0, fr); g.vl(mid - 2, wy0, wy1, frL); g.vl(mid + 1, wy0, wy1, frD);
  for (const yy of [48, 76]) { g.hl(wx0, wx1 - 1, yy, fr); g.hl(wx0, wx1 - 1, yy + 1, frD); }
  // frosted lower strip on the right pane
  for (let y = 78; y < wy1; y++) for (let x = mid + 2; x < wx1; x++) if ((x + y) % 2 === 0) g.px(x, y, mix(g.get(x, y), 0xfff0e0, 0.5));
  // lace curtain bunched at the left
  for (let y = wy0 - 2; y < wy1 + 6; y++) for (let x = wx0 - 6; x < wx0 + 14 - Math.round(Math.sin((y - wy0) / 90 * Math.PI) * 6); x++) {
    const fold = Math.sin(x * 1.2 + y * 0.05);
    let c = fold > 0.3 ? 0xfffaf0 : fold < -0.4 ? 0xe2d4c4 : 0xf4ecdf;
    if ((x + y * 2) % 7 === 0) c = 0xd8c8b8;
    g.px(x, y, c);
  }
  g.rect(wx0 - 8, wy0 - 7, wx1 - wx0 + 16, 2, 0xc8ccd4); g.hl(wx0 - 8, wx1 + 7, wy0 - 7, 0xf0f2f6);
  // warm light falling from the window onto the wall
  g.light(wx1 + 30, 70, 50, 60, 0xffc070, 0.25, 0.8);

  // pendulum wall clock
  {
    const cx = 196, cy = 30;
    g.rect(cx - 12, cy - 12, 24, 58, 0x6a3a22); g.frame(cx - 12, cy - 12, 24, 58, 0x3a1e12); g.vl(cx - 11, cy - 11, cy + 44, 0x9a5e38);
    g.rect(cx - 14, cy - 15, 28, 4, 0x8a4e2c); g.hl(cx - 14, cx + 13, cy - 15, 0xb87448);
    g.ell(cx, cy, 9, 9, 0xfff8e6); g.ring(cx, cy, 9, 9, 0xc8a050);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.px(Math.round(cx + Math.cos(a) * 7), Math.round(cy + Math.sin(a) * 7), 0x3a2a22); }
    g.line(cx, cy, cx + 4, cy - 3, 0x2a1a12); g.line(cx, cy, cx - 1, cy - 6, 0x2a1a12); g.px(cx, cy, 0xc8302a);
    g.rect(cx - 7, cy + 13, 14, 26, 0x3a2418); g.frame(cx - 7, cy + 13, 14, 26, 0xc8a050);
    g.vl(cx + 1, cy + 14, cy + 30, 0xd8b060); g.ell(cx + 1, cy + 32, 3, 3, 0xf0c860); g.px(cx, cy + 31, 0xfff0b0);
  }
  // pennant (tourist souvenir) pinned to the wall
  {
    const x = 142, y = 30, L = 36;
    for (let i = 0; i < L; i++) {
      const hh = Math.max(0, Math.round(8 * (1 - i / L)));
      for (let yy = y + 8 - hh; yy <= y + 8 + hh; yy++) {
        let c = i < 4 ? 0xfff4e0 : (yy === y + 8 - hh || yy === y + 8 + hh) ? 0x8a1a26 : 0xc8303a;
        if (i > 18 && yy === y + 8) c = 0xffe080; // gold stripe toward the tip
        g.px(x + i, yy, c);
      }
    }
    g.vl(x, y - 1, y + 17, 0xa07a50); g.px(x + 1, y - 1, 0xd8d0c0); g.px(x + 1, y + 17, 0xd8d0c0);
    // Fuji emblem
    g.sprite(['....w....', '...www...', '..wwbbb..', '.wbbbbbb.', 'bbbbbbbbb'], { w: 0xffffff, b: 0x7a9ae0 }, x + 6, y + 4);
    g.px(x + 17, y + 5, 0xffe080); g.px(x + 16, y + 6, 0xffe080); g.px(x + 18, y + 6, 0xffe080); g.px(x + 17, y + 7, 0xffe080);
  }

  // tansu (chest of drawers) on the right
  {
    const x0 = 236, x1 = 316, y0 = 66, y1 = 138;
    g.rect(x0, y0, x1 - x0, y1 - y0, 0x8a5430);
    g.rect(x0 - 2, y0 - 3, x1 - x0 + 4, 3, 0xa86a3c); g.hl(x0 - 2, x1 + 1, y0 - 3, 0xc88a54);
    const rowsY = [y0 + 3, y0 + 21, y0 + 39, y0 + 55];
    rowsY.forEach((ry, k) => {
      const h = k === 0 ? 16 : k === 3 ? 14 : 16;
      const split = k === 0 ? 2 : 1;
      for (let sidx = 0; sidx < split; sidx++) {
        const dx0 = x0 + 3 + sidx * ((x1 - x0 - 6) / split), dw = (x1 - x0 - 6) / split - (split > 1 ? 2 : 0);
        for (let y = ry; y < ry + h; y++) for (let x = Math.round(dx0); x < dx0 + dw; x++) {
          const grain = Math.sin(x * 0.4 + y * 1.7 + k) > 0.92;
          g.px(x, y, grain ? 0x9a5e34 : tone(x, y, (x - x0) / (x1 - x0) * 0.8, [0xc07a44, 0xae6c3a]));
        }
        g.hl(Math.round(dx0), Math.round(dx0 + dw - 1), ry, 0xdc9a60); g.hl(Math.round(dx0), Math.round(dx0 + dw - 1), ry + h - 1, 0x5a3418);
        // iron ring handles
        const hx = Math.round(dx0 + dw / 2);
        g.rect(hx - 3, ry + 4, 7, 2, 0x3a2a22); g.ring(hx, ry + 9, 3, 2, 0x2a1e18); g.px(hx - 1, ry + 7, 0x8a7a6a);
      }
    });
    g.vl(x1 - 1, y0, y1, 0x5a3418);
    g.rect(x0 + 2, y1, 4, 3, 0x5a3418); g.rect(x1 - 6, y1, 4, 3, 0x5a3418);
    // kokeshi + carved bear + vase on top
    g.sprite([
      '..kkk..',
      '.khhhk.',
      'khfffhk',
      'kfefefk',
      'kfffffk',
      '.kfrfk.',
      '..kkk..',
      '.kyyyk.',
      '.krrrk.',
      '.kyyyk.',
      '.krrrk.',
      '.kyyyk.',
      '.kkkkk.',
    ], { k: 0x3a2418, h: 0x2a1a14, f: 0xfff0dc, e: 0x2a1a14, r: 0xd84a3a, y: 0xf4d8a0 }, 244, y0 - 16);
    g.sprite([
      '...........kk.....',
      '..........kbbk....',
      '.kkkkkkkkkbbbbk...',
      'kbBBBBBbbbbbebbk..',
      'kbBBbbbbbbbbbbbbk.',
      'kbbbbbbbbbbbbbbsssk',
      'kbbbbbbbbbbbbkkssk.',
      '.kbbbbbbbbbbbk.kk..',
      '.kbbk.kbbk.kbbk....',
      '.kbbk.kbbk.kbbk....',
      'kkkkkkkkkkkkkkkk...',
      'kddddddddddddddk...',
    ], { k: 0x2a1a10, b: 0x6a4a30, B: 0x8a6a48, e: 0x1a1008, s: 0xc0c8d0, d: 0x8a5a36 }, 258, y0 - 12);
    g.sprite([
      '..kk..',
      '.kttk.',
      '.kttk.',
      'kttTtk',
      'ktttTk',
      'ktttTk',
      '.kkkk.',
    ], { k: 0x1e4a44, t: teal, T: dk(teal, 0.2) }, 292, y0 - 10);
    g.line(294, y0 - 10, 291, y0 - 18, 0x5a8a3a); g.line(295, y0 - 10, 298, y0 - 19, 0x5a8a3a); g.px(290, y0 - 19, 0xffffff); g.px(298, y0 - 20, 0xf4c24a);
  }

  // baseboard
  g.rect(0, 128, W, 4, 0x8a5a36); g.hl(0, W, 128, 0xb07a4a); g.hl(0, W, 131, 0x4a2a18);

  // tatami floor (floor band): two rows of mats, weave lines, heri on the long sides only
  const ty0 = 132, vpx = 160, vpy = 40;
  for (let y = ty0; y < 200; y++) {
    const t = (y - ty0) / 68;
    for (let x = 0; x < W; x++) {
      let c = tone(x, y, 0.25 + t * 0.35 + (x / W) * 0.3, [0xe6d08a, 0xd8c078, 0xc8ae66, 0xb49a5a], 0.5);
      if (y % 2 === 0) c = dk(c, 0.07, 0x5a4020);
      g.px(x, y, c);
    }
  }
  const heriRow = (yA, h) => { for (let x = 0; x < W; x++) for (let k = 0; k < h; k++) g.px(x, yA + k, k === 0 ? 0x16201a : k === h - 1 ? 0x2a3a2e : ((x >> 1) % 3 === 0 && k === (h >> 1)) ? 0x8a9a6a : 0x2e4a38); };
  const seam = (xb, y0, y1) => {
    for (let y = y0; y <= y1; y++) {
      const x = Math.round(vpx + (xb - vpx) * (y - vpy) / (199 - vpy));
      g.px(x, y, 0x8a7442); g.px(x + 1, y, 0xf0dc9a);
    }
  };
  heriRow(132, 2); heriRow(157, 4);
  for (const xb of [-40, 210]) seam(xb, 134, 156);
  for (const xb of [88, 380]) seam(xb, 161, 199);
  // sunset light patch through the window (crisp-edged, with mullion shadows)
  for (let y = 135; y < 199; y++) {
    const t = (y - 135) / 64;
    const xa = 30 + t * 60, xb = 128 + t * 118;
    for (let x = Math.floor(xa); x < xb; x++) {
      const u = (x - xa) / (xb - xa);
      if (Math.abs(u - 0.5) < 0.035) continue;
      if (Math.abs(t - 0.36) < 0.035 || Math.abs(t - 0.72) < 0.03) continue;
      const fade = 1 - t * 0.5;
      if (bay(x, y) < fade * (u < 0.06 || u > 0.94 ? 0.5 : 1)) g.px(x, y, mix(g.get(x, y), 0xffb060, 0.38));
    }
  }

  // round-cornered TV on legs, backlit by the window
  {
    const x0 = 10, y0 = 98, x1 = 66, y1 = 136;
    // antenna (rabbit ears) against the window
    g.line(38, y0 - 1, 24, 72, 0x3a2a2a); g.line(39, y0 - 1, 54, 70, 0x3a2a2a);
    g.px(24, 71, 0xe8d8c0); g.px(54, 69, 0xe8d8c0); g.rect(35, y0 - 3, 7, 3, 0x3a2a2a);
    // legs
    for (const [lx, d] of [[16, -2], [58, 2]]) for (let y = y1; y < 152; y++) { const xx = lx + Math.round(d * (y - y1) / 16); g.px(xx, y, 0x3a2418); g.px(xx + 1, y, 0x6a4026); }
    for (let i = 0; i < 52; i++) if (bay(12 + i, 152) < 0.8) g.px(12 + i, 152, 0x9a8048);
    const M = new Mask(g.w, g.h);
    M.rect(x0 + 2, y0, x1 - x0 - 4, y1 - y0); M.rect(x0, y0 + 2, x1 - x0, y1 - y0 - 4);
    M.rect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
    M.fill(g, (x, y) => (y < y0 + 2 ? 0xc88a50 : tone(x, y, (x - x0) / (x1 - x0), [0x8a5430, 0x744426, 0x5e341c])));
    M.outline(g, 0x2a160c, 0x2a160c);
    // screen (CRT bulge) with window reflection
    const S = new Mask(g.w, g.h); S.rect(x0 + 5, y0 + 5, 32, 26); S.rect(x0 + 4, y0 + 6, 34, 24);
    S.fill(g, (x, y) => tone(x, y, ((x - x0 - 4) + (y - y0 - 5)) / 60, [0x6a7e7a, 0x4a5c5a, 0x2e3c3c], 0.6));
    S.outline(g, 0x1e1410, 0xd8a868);
    g.line(x0 + 8, y0 + 14, x0 + 14, y0 + 8, 0xa8c0b8); g.line(x0 + 8, y0 + 16, x0 + 16, y0 + 8, 0x8aa49c);
    // dials + speaker
    g.ell(x0 + 47, y0 + 9, 4, 4, 0xd8ccb0); g.ring(x0 + 47, y0 + 9, 4, 4, 0x2a1e18); g.line(x0 + 47, y0 + 9, x0 + 49, y0 + 6, 0x2a1e18);
    g.ell(x0 + 47, y0 + 19, 3, 3, 0xd8ccb0); g.ring(x0 + 47, y0 + 19, 3, 3, 0x2a1e18); g.px(x0 + 47, y0 + 17, 0xc83a2a);
    for (let y = y0 + 25; y < y0 + 33; y += 2) g.hl(x0 + 43, x0 + 51, y, 0x3a2216);
    // lace doily + little vase on top
    for (let x = x0 + 8; x < x0 + 34; x++) g.px(x, y0 - 1, (x % 2) ? 0xfffaf0 : 0xe8dcc8);
    g.rect(x0 + 18, y0 - 8, 5, 7, teal); g.vl(x0 + 18, y0 - 8, y0 - 2, lt(teal, 0.4)); g.px(x0 + 20, y0 - 10, 0xff8a5a); g.px(x0 + 19, y0 - 11, 0xff8a5a); g.px(x0 + 21, y0 - 11, 0xffd23f);
  }

  // mosquito-coil pig (kayari buta) with a smoke curl, bottom left on the tatami
  {
    const x = 12, y = 172;
    for (let i = 0; i < 22; i++) if (bay(x + i, y + 21) < 0.7) g.px(x + i, y + 21, 0x8a7040);
    const px0 = x + 11, py0 = y + 13;
    g.sprite(['kk', 'kck', 'kcck'], { k: 0x223034, c: 0x7a9ea2 }, px0 - 9, py0 - 11);
    g.sprite(['..kk', '.kck', 'kcck'], { k: 0x223034, c: 0x7a9ea2 }, px0 + 5, py0 - 11);
    g.ell(px0, py0, 11, 8, (xx, yy, nx, ny) => tone(xx, yy, 0.5 + (nx * 0.4 + ny * 0.6) * 0.6, [0xa8c8ca, 0x7a9ea2, 0x5a7e84], 0.5));
    g.ring(px0, py0, 11, 8, 0x223034);
    g.ell(px0, py0 + 1, 5, 4, 0x2a1810); g.ring(px0, py0 + 1, 5, 4, 0x3e5a5e);
    g.px(px0 - 1, py0 + 1, 0xff7a3a); g.px(px0, py0 + 1, 0xffb060); g.px(px0 + 1, py0 + 1, 0xff7a3a); g.px(px0, py0 + 2, 0xc83a20); g.px(px0 - 2, py0, 0xc83a20);
    g.px(px0 - 6, py0 - 3, 0x1a2024); g.px(px0 + 6, py0 - 3, 0x1a2024);
    g.rect(px0 - 7, py0 + 8, 3, 2, 0x223034); g.rect(px0 + 5, py0 + 8, 3, 2, 0x223034);
    for (let i = 0; i < 24; i++) { const yy = y + 4 - i, xx = x + 11 + Math.round(2.5 * Math.sin(i * 0.45)); if (bay(xx, yy) < 0.9 - i * 0.03) g.px(xx, yy, 0xf8f4ee); if (i > 8 && bay(xx + 1, yy) < 0.4) g.px(xx + 1, yy, 0xe8e0d8); }
  }
  // zabuton cushion corner, bottom right
  {
    const M = new Mask(g.w, g.h).poly([[268, 180], [324, 174], [324, 204], [258, 204]]);
    M.fill(g, (x, y) => tone(x, y, (y - 174) / 30 + (x - 258) / 260, [0xc8586a, 0xa8445a, 0x84304a]));
    M.outline(g, 0x5a1e2c, 0xe88a94);
    g.line(270, 190, 320, 184, 0x84304a); g.line(281, 182, 290, 200, 0x84304a);
    g.px(286, 187, 0xf4c24a); g.px(287, 187, 0xf4c24a); g.px(286, 188, 0xd09a2a); g.px(287, 188, 0xd09a2a);
    g.px(266, 180, 0xf4c24a); g.px(265, 181, 0xd09a2a); g.px(264, 182, 0xd09a2a);
  }
}

// --- konbini: bright convenience-store aisle --------------------------------------------------
function konbini(g, s) {
  const W = g.w;
  const green = hex(s.card.accent), orange = hex(s.card.accent2), ink = hex(s.card.text);
  const pr = rng(41);
  // ceiling with fluorescent tubes
  g.vgrad(0, 0, W, 18, [0xdfe6e6, 0xeef3f2], 0.5);
  for (let x = 0; x < W; x += 40) g.vl(x, 0, 17, 0xcbd4d4);
  g.hl(0, W, 9, 0xcbd4d4);
  for (const [x0, x1] of [[24, 136], [184, 296]]) {
    g.rect(x0 - 2, 3, x1 - x0 + 4, 5, 0xc8d2d2); g.rect(x0, 4, x1 - x0, 3, 0xffffff); g.hl(x0, x1 - 1, 7, 0xe6fbff);
    g.light((x0 + x1) / 2, 6, (x1 - x0) / 2 + 14, 9, 0xffffff, 0.5, 1);
  }
  // store livery stripes
  g.rect(0, 18, W, 4, green); g.rect(0, 22, W, 3, 0xffffff); g.rect(0, 25, W, 4, orange); g.hl(0, W, 18, lt(green, 0.3)); g.hl(0, W, 28, dk(orange, 0.25));
  // back wall
  g.vgrad(0, 29, W, 111, [0xf2f5f2, 0xe6ecea, 0xd8e0de], 0.5);

  // walk-in drink cooler (3 glass doors)
  const fx0 = 24, fx1 = 178, fy0 = 44, fy1 = 138;
  g.rect(fx0 - 4, fy0 - 13, fx1 - fx0 + 8, fy1 - fy0 + 15, 0x8e989a); g.hl(fx0 - 4, fx1 + 3, fy0 - 13, 0xc8d0d2);
  g.rect(fx0 - 3, fy0 - 12, fx1 - fx0 + 6, 11, 0x24343a); g.hl(fx0 - 3, fx1 + 2, fy0 - 2, 0x5a6a70);
  g.text('つめた～い', fx0 + 4, fy0 - 12, { size: 10, color: 0x8fd8ff });
  g.tiny('COLD DRINKS', fx1 - 5, fy0 - 9, 0xffffff, { align: 'right' });
  for (let x = fx0 + 60; x < fx1 - 56; x += 6) g.px(x, fy0 - 7, 0x8fd8ff);
  const doorW = (fx1 - fx0) / 3;
  const bottleCols = [[0x6ab04a, 0xd8f0b0], [0xff8a2e, 0xffe0a0], [0xd83a3a, 0xffffff], [0x4ab0e8, 0xe8f8ff], [0xc8a070, 0xfff0d8], [0xf0d040, 0xffffff], [0x8a5ad0, 0xf0e0ff], [0x2fae66, 0xffffff]];
  for (let d = 0; d < 3; d++) {
    const x0 = Math.round(fx0 + d * doorW), x1 = Math.round(fx0 + (d + 1) * doorW) - 1;
    // interior glow
    g.vgrad(x0, fy0, x1 - x0 + 1, fy1 - fy0, [0xf8feff, 0xe2f2fa, 0xcfe4ee], 0.5);
    // shelves of bottles / cans
    for (let sy = fy0 + 4, row = 0; sy < fy1 - 12; sy += 20, row++) {
      const can = row % 2 === 1;
      for (let bx = x0 + 3; bx < x1 - 6; bx += 7) {
        const [c, lab] = bottleCols[(Math.floor(pr() * 8) + d) % 8];
        if (can) {
          g.rect(bx, sy + 8, 6, 9, c); g.hl(bx, bx + 5, sy + 7, 0xc8d0d4); g.vl(bx, sy + 8, sy + 16, lt(c, 0.4)); g.vl(bx + 5, sy + 8, sy + 16, dk(c, 0.3));
          g.hl(bx, bx + 5, sy + 11, lab);
        } else {
          g.rect(bx + 2, sy + 1, 2, 2, lab === 0xffffff ? c : 0xffffff); g.rect(bx + 1, sy + 3, 4, 2, 0xe8f4f8);
          g.rect(bx, sy + 5, 6, 12, mix(c, 0xffffff, 0.15)); g.rect(bx, sy + 9, 6, 4, lab); g.vl(bx, sy + 5, sy + 16, 0xffffff); g.vl(bx + 5, sy + 5, sy + 16, dk(c, 0.25));
          g.px(bx + 2, sy + 10, c); g.px(bx + 3, sy + 11, c);
        }
      }
      g.rect(x0, sy + 17, x1 - x0 + 1, 3, 0xf4f8fa); g.hl(x0, x1, sy + 19, 0xa0aeb4);
      for (let px0 = x0 + 4; px0 < x1 - 8; px0 += 14) g.rect(px0, sy + 17, 7, 3, 0xfff060);
    }
    // aluminium frame + handle + glass glare
    g.frame(x0, fy0, x1 - x0 + 1, fy1 - fy0, 0xb8c2c6); g.vl(x0 + 1, fy0, fy1 - 1, 0xf0f4f6); g.vl(x1 - 1, fy0, fy1 - 1, 0x8a969a);
    const hx = d === 1 ? x1 - 5 : x0 + 4;
    g.rect(hx, fy0 + 36, 2, 30, 0xe8eef0); g.vl(hx + 1, fy0 + 36, fy0 + 65, 0x8a969a);
    for (let k = 0; k < 18; k++) { g.px(x0 + 8 + k, fy0 + 40 - k * 2, 0xffffff); g.px(x0 + 9 + k, fy0 + 40 - k * 2, 0xffffff); g.px(x0 + 14 + k, fy0 + 42 - k * 2, 0xf4fcff); }
  }
  g.light(100, 90, 90, 60, 0xe8f8ff, 0.25, 0.8);

  // snack gondola (right half)
  const sx0 = 184, sx1 = 298;
  g.rect(sx0, 32, sx1 - sx0, 108, 0xdfe5e4); g.frame(sx0 - 1, 31, sx1 - sx0 + 2, 110, 0xb8c2c2);
  for (let x = sx0 + 4; x < sx1; x += 6) for (let y = 34; y < 138; y += 6) g.px(x, y, 0xc8d0d0); // pegboard holes
  const shelfY = [56, 82, 108, 134];
  // top: hanging snack bags on hooks
  for (let i = 0; i < 7; i++) {
    const bx = sx0 + 4 + i * 16, c = [0xff5a3a, orange, 0xffd23f, 0x3a8ae0, 0xd84ab0, 0x2fae66, 0xff8aa0][i];
    g.hl(bx + 5, bx + 8, 33, 0x8a9494); g.vl(bx + 6, 33, 36, 0x8a9494);
    const M = new Mask(g.w, g.h).rect(bx, 37, 14, 16); M.set(bx, 37, 0); M.set(bx + 13, 37, 0); M.set(bx, 52, 0); M.set(bx + 13, 52, 0);
    M.fill(g, (x, y) => (y < 39 || y > 50 ? lt(c, 0.25) : x - bx < 3 ? lt(c, 0.35) : x - bx > 11 ? dk(c, 0.25) : c));
    M.outline(g, dk(c, 0.5));
    g.ell(bx + 7, 45, 3, 3, i % 2 ? 0xffffff : 0xffe080); g.px(bx + 6, 44, dk(c, 0.3));
  }
  // shelves: cup noodles, boxes, chips
  shelfY.slice(1).forEach((y, row) => {
    for (let x = sx0 + 3; x < sx1 - 6; x += row === 1 ? 12 : 10) {
      const c = [0xff5a3a, 0xffd23f, 0x3a8ae0, orange, 0x2fae66, 0xd84ab0][Math.floor(pr() * 6)];
      if (row === 0) { // cup noodles
        for (let yy = 0; yy < 15; yy++) { const inset = Math.floor((15 - yy) / 6); g.hl(x + 1 + inset, x + 8 - inset, y - 15 + yy, yy < 3 ? 0xfdfdf8 : yy < 6 ? c : yy < 12 ? 0xf8f4ea : dk(c, 0.2)); }
        g.hl(x, x + 9, y - 16, 0xf0f0e8); g.px(x + 4, y - 9, c); g.px(x + 5, y - 9, c);
      } else if (row === 1) { // boxes
        g.rect(x, y - 16, 10, 16, c); g.rect(x + 1, y - 12, 8, 5, 0xffffff); g.vl(x, y - 16, y - 1, lt(c, 0.3)); g.vl(x + 9, y - 16, y - 1, dk(c, 0.3)); g.px(x + 4, y - 10, dk(c, 0.2)); g.px(x + 5, y - 10, dk(c, 0.2));
      } else { // chips bags standing
        const M = new Mask(g.w, g.h).rect(x, y - 18, 9, 18); M.set(x, y - 18, 0); M.set(x + 8, y - 18, 0);
        M.fill(g, (xx, yy) => (yy < y - 16 ? lt(c, 0.3) : xx === x ? lt(c, 0.3) : xx === x + 8 ? dk(c, 0.3) : c));
        g.ell(x + 4, y - 9, 2, 2, 0xffe8a0);
      }
    }
  });
  shelfY.forEach((y) => {
    g.rect(sx0, y, sx1 - sx0, 3, 0xf6f8f8); g.hl(sx0, sx1 - 1, y + 2, 0x9aa6a6);
    for (let x = sx0 + 6; x < sx1 - 10; x += 22) { g.rect(x, y, 10, 3, 0xffffff); g.hl(x, x + 9, y + 1, ink); g.px(x + 1, y, orange); }
  });
  // POP card on the shelf
  g.rect(sx0 + 40, 62, 26, 16, orange); g.frame(sx0 + 40, 62, 26, 16, dk(orange, 0.35));
  g.text('新発売', sx0 + 53, 64, { size: 10, color: 0xffffff, align: 'center' });

  // hanging welcome sign
  {
    const x0 = 196, x1 = 296, y0 = 34;
    g.vl(x0 + 8, 29, y0, 0x6a7474); g.vl(x1 - 8, 29, y0, 0x6a7474);
    g.rect(x0 + 1, y0 + 1, x1 - x0, 17, 0x8a9a96);
    g.rect(x0, y0, x1 - x0, 17, green); g.frame(x0, y0, x1 - x0, 17, dk(green, 0.4)); g.hl(x0 + 1, x1 - 2, y0 + 1, lt(green, 0.35));
    g.text('いらっしゃいませ', (x0 + x1) / 2, y0 + 2, { size: 12, color: 0xffffff, align: 'center' });
  }

  // near end caps framing the sides
  for (const [x0, x1, side] of [[0, 22, -1], [298, W, 1]]) {
    for (let y = 26; y < 160; y++) for (let x = x0; x < x1; x++) {
      const e = side < 0 ? x1 - 1 - x : x - x0;
      g.px(x, y, e === 0 ? 0xf4f8f8 : e === 1 ? 0x9aa6a6 : tone(x, y, (y - 26) / 140, [0xc8d2d2, 0xb4bebe]));
    }
    // products on the end cap
    for (let y = 40; y < 150; y += 22) {
      g.rect(x0, y + 16, x1 - x0, 3, 0xf0f4f4); g.hl(x0, x1 - 1, y + 18, 0x7a8686);
      for (let x = x0 + (side < 0 ? 0 : 3); x < x1 - 3; x += 8) {
        const c = [0xd84ab0, 0x3a8ae0, orange, 0xffd23f, green][Math.floor(pr() * 5)];
        g.rect(x, y + 4, 7, 12, c); g.vl(x, y + 4, y + 15, lt(c, 0.35)); g.hl(x, x + 6, y + 8, 0xffffff);
      }
    }
  }
  g.rect(300, 60, 20, 24, 0xe5383b); g.frame(300, 60, 20, 24, 0x8a1e22); g.vtext('特価', 310, 61, { size: 10, step: 11, color: 0xfff060 });

  // glossy tile floor (floor band) with reflections
  const fy = 140, vpx = 160, vpy = 70;
  for (let y = fy; y < 200; y++) {
    const d = (y - fy) / 60;
    for (let x = 0; x < W; x++) {
      // reflection of the wall above (mirrored around y=fy)
      const sy = fy - (y - fy) * 1.6 - 1;
      const src = g.get(x, Math.max(30, sy));
      let c = mix(src, (x + y) % 2 ? 0xeef3f2 : 0xe6eceb, 0.78 + d * 0.18);
      c = c & 0xf0f0f0 | 0x080808; // coarse steps keep the reflection on a small set of tints
      // tile grout in perspective
      const u = (x - vpx) / ((y - vpy) / (200 - vpy));
      const grid = ((Math.round(u) % 34) + 34) % 34 === 0;
      const rowK = Math.log((y - vpy) / (fy - vpy)) / Math.log(1.16);
      const hor = Math.abs(y - Math.round(vpy + (fy - vpy) * Math.pow(1.16, Math.round(rowK)))) < 0.5;
      if (grid || hor) c = mix(c, 0xa8b2b2, 0.6);
      g.px(x, y, c);
    }
  }
  g.hl(0, W, fy, 0x8a9494); g.hl(0, W, fy + 1, 0xb8c2c2);
  // ceiling light glints on the floor
  for (const [x0, x1, y] of [[60, 100, 186], [216, 260, 186], [76, 96, 162], [232, 252, 162]]) { g.hl(x0, x1, y, 0xffffff); g.hl(x0 + 4, x1 - 4, y + 1, 0xf4fafa); }
  // stack of green shopping baskets, bottom left
  for (let k = 0; k < 3; k++) {
    const bx = 4, by = 176 - k * 4;
    g.rect(bx, by, 34, 14, dk(green, 0.1)); g.hl(bx, bx + 33, by, lt(green, 0.35));
    for (let x = bx + 2; x < bx + 32; x += 4) g.rect(x, by + 3, 2, 8, dk(green, 0.45));
    g.vl(bx, by, by + 13, lt(green, 0.2)); g.vl(bx + 33, by, by + 13, dk(green, 0.4));
  }
  g.rect(4, 190, 34, 6, dk(green, 0.2)); g.hl(4, 37, 196, 0x7a8686);
  g.line(8, 164, 14, 156, 0x1f3a2c); g.hl(14, 28, 156, 0x1f3a2c); g.line(28, 156, 34, 164, 0x1f3a2c);
}

// --- heya: cozy six-tatami room at night ------------------------------------------------------
function heya(g, s) {
  const W = g.w;
  const brown = hex(s.card.accent), green = hex(s.card.accent2);
  const lampX = 284, lampY = 92;
  // wall: night-dim plaster warming toward the desk lamp
  for (let y = 0; y < 132; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - lampX) / 150, (y - lampY) / 110);
    g.px(x, y, tone(x, y, d, [0xd8a874, 0xb08068, 0x84646c, 0x5e4c64, 0x4a3e58], 0.5));
  }
  g.rect(0, 0, W, 5, 0x3a2e40); g.hl(0, W, 5, 0x5a4458);
  // window with night city view
  const wx0 = 98, wx1 = 222, wy0 = 16, wy1 = 102;
  g.vgrad(wx0, wy0, wx1 - wx0, wy1 - wy0, [0x141a40, 0x1e2658, 0x2e3470, 0x4a3e80, 0x6a4a88], 0.6);
  const sr = rng(61);
  for (let i = 0; i < 40; i++) {
    const x = wx0 + 2 + Math.floor(sr() * (wx1 - wx0 - 4)), y = wy0 + 2 + Math.floor(sr() * 50);
    g.px(x, y, sr() < 0.3 ? 0xffffff : 0xb8c0f0);
    if (i % 9 === 0) { g.px(x - 1, y, 0x8890d0); g.px(x + 1, y, 0x8890d0); g.px(x, y - 1, 0x8890d0); g.px(x, y + 1, 0x8890d0); }
  }
  // crescent moon
  g.light(126, 34, 22, 22, 0x8a90d8, 0.35, 0.9);
  g.ell(126, 34, 8, 8, 0xfff6d0);
  // bite out the crescent with the sky colour sampled just right of the moon
  for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) if ((x - 4) ** 2 + (y + 3) ** 2 < 46 && x * x + y * y <= 68) g.px(126 + x, 34 + y, g.get(126 + x + 9, 34 + y));
  // skyline
  const blds = [[98, 72, 14], [112, 80, 10], [122, 66, 12], [134, 76, 16], [150, 58, 10], [160, 70, 14], [174, 78, 12], [186, 64, 14], [200, 74, 10], [210, 68, 12]];
  for (const [x, y, w] of blds) {
    g.rect(x, y, w, wy1 - y, 0x1a1a3c); g.vl(x, y, wy1 - 1, 0x26285a);
    for (let wy = y + 3; wy < wy1 - 4; wy += 4) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (sr() < 0.35) g.px(wx, wy, sr() < 0.7 ? 0xffd890 : 0xff9a6a);
  }
  g.vl(155, 46, 58, 0x1a1a3c); g.px(155, 45, 0xff4a4a); g.px(154, 45, 0xa83a4a); g.px(156, 45, 0xa83a4a);
  // passing train at the bottom of the view
  g.rect(wx0, 94, wx1 - wx0, 6, 0x2a2a50); for (let x = wx0 + 3; x < wx1 - 4; x += 6) g.rect(x, 95, 4, 2, 0xfff0b0); g.hl(wx0, wx1 - 1, 99, 0x14142e);
  // window frame + crossbar
  const fr = 0x6a4a3a;
  g.rect(wx0 - 4, wy0 - 4, wx1 - wx0 + 8, 4, fr); g.rect(wx0 - 4, wy1, wx1 - wx0 + 8, 5, fr); g.hl(wx0 - 4, wx1 + 3, wy1, 0x9a6a50);
  g.rect(wx0 - 4, wy0, 4, wy1 - wy0, fr); g.rect(wx1, wy0, 4, wy1 - wy0, fr);
  g.rect(159, wy0, 3, wy1 - wy0, fr); g.vl(159, wy0, wy1, 0x8a604a);
  // sill with a small cactus and a cat-shaped figurine
  g.rect(wx0 - 8, wy1 + 4, wx1 - wx0 + 16, 3, 0x8a6048); g.hl(wx0 - 8, wx1 + 7, wy1 + 4, 0xb08060);
  g.sprite(['.g.g.', '.ggg.', 'gGggg', '.ggg.', 'kkkkk', 'krrrk', '.kkk.'], { g: 0x6aa860, G: 0xb8e090, k: 0x6a3a2a, r: 0xc86a4a }, 196, wy1 - 3);
  // curtains on a rail with fairy lights
  g.rect(wx0 - 22, wy0 - 9, wx1 - wx0 + 44, 2, 0x8a7a6a);
  const drape = (x0, x1, open) => {
    for (let y = wy0 - 7; y < wy1 + 14; y++) {
      const sway = Math.round(Math.sin((y - wy0) / 110 * Math.PI) * open);
      for (let x = x0 + (open < 0 ? sway : 0); x < x1 + (open > 0 ? sway : 0); x++) {
        const f = Math.sin((x - x0) * 0.9);
        g.px(x, y, f > 0.4 ? lt(green, 0.15) : f < -0.4 ? dk(green, 0.45) : dk(green, 0.2));
      }
    }
  };
  drape(wx0 - 22, wx0 + 4, 4); drape(wx1 - 4, wx1 + 22, -4);
  for (let x = wx0 - 20; x < wx1 + 22; x++) {
    const y = wy0 - 6 + Math.round(3 * Math.abs(Math.sin((x - wx0 + 20) / 20 * Math.PI)));
    g.px(x, y, 0x3a2e2a);
    if ((x - wx0 + 20) % 10 === 5) { g.light(x, y + 1, 5, 5, 0xffd890, 0.4, 1); g.px(x, y + 1, [0xffd890, 0xff9ab0, 0x9ae0ff][Math.floor((x / 10) % 3)]); g.px(x, y + 2, 0xffffff); }
  }
  // moonlight falling on the wall below the window
  // bookshelf on the left
  {
    const x0 = 4, x1 = 66, y0 = 26, y1 = 152;
    g.rect(x0, y0, x1 - x0, y1 - y0, dk(brown, 0.35)); g.frame(x0, y0, x1 - x0, y1 - y0, dk(brown, 0.6));
    g.vl(x0 + 1, y0 + 1, y1 - 2, brown); g.vl(x1 - 2, y0 + 1, y1 - 2, dk(brown, 0.45));
    g.rect(x0 - 2, y0 - 3, x1 - x0 + 4, 3, brown); g.hl(x0 - 2, x1 + 1, y0 - 3, lt(brown, 0.3));
    const br = rng(9);
    for (let sy = y0 + 4; sy < y1 - 20; sy += 30) {
      let x = x0 + 3;
      while (x < x1 - 6) {
        const w = 3 + Math.floor(br() * 3), h = 17 + Math.floor(br() * 8);
        const c = [0xc85a4a, 0x4a7ab0, 0xe0b04a, 0x5a9a6a, 0x9a6ac0, 0xe8dcc8, 0x3a4a6a][Math.floor(br() * 7)];
        const sh = mix(c, 0x2a2040, 0.35);
        g.rect(x, sy + 26 - h, w, h, sh); g.vl(x, sy + 26 - h, sy + 25, mix(c, 0x2a2040, 0.15)); g.hl(x, x + w - 1, sy + 28 - h, mix(c, 0xffffff, 0.2));
        x += w + (br() < 0.12 ? 3 : 0);
        if (br() < 0.08 && x < x1 - 14) { // leaning book
          for (let k = 0; k < 18; k++) g.hl(x + Math.floor(k / 3), x + Math.floor(k / 3) + 3, sy + 26 - k, mix(0xd87a5a, 0x2a2040, 0.3));
          x += 10;
        }
      }
      g.rect(x0 + 2, sy + 26, x1 - x0 - 4, 3, brown); g.hl(x0 + 2, x1 - 3, sy + 26, lt(brown, 0.25)); g.hl(x0 + 2, x1 - 3, sy + 28, dk(brown, 0.5));
    }
    // bottom cubby: small plant + photo frame + alarm clock
    g.sprite(['..g.g..', '.gGgGg.', 'gGgggGg', '.ggggg.', '..kkk..', '.krrrk.', '.krrrk.', '..kkk..'], { g: 0x5a9a5a, G: 0x9ad07a, k: 0x5a2a20, r: 0xb85a3a }, x0 + 6, y1 - 30);
    g.rect(x0 + 20, y1 - 28, 12, 14, 0xe8d8b8); g.rect(x0 + 22, y1 - 26, 8, 10, 0x8ab8d8); g.rect(x0 + 22, y1 - 20, 8, 4, 0x6a9a5a);
    g.ell(x0 + 44, y1 - 20, 5, 5, 0xe85a4a); g.ell(x0 + 44, y1 - 20, 3, 3, 0xfff6e8); g.px(x0 + 44, y1 - 21, 0x2a2020); g.px(x0 + 45, y1 - 20, 0x2a2020);
    g.px(x0 + 41, y1 - 26, 0xc84a3a); g.px(x0 + 47, y1 - 26, 0xc84a3a);
  }
  // poster on the right wall
  {
    const x = 240, y = 22;
    g.rect(x, y, 34, 44, 0x2a3a6a); g.frame(x, y, 34, 44, 0xf0e6d4);
    for (let i = 0; i < 9; i++) g.px(x + 4 + ((i * 13) % 26), y + 4 + ((i * 7) % 18), 0xfff0b0);
    g.ell(x + 17, y + 30, 9, 7, 0xffb85a); g.ell(x + 17, y + 30, 9, 1, 0xffe0a0);
    g.px(x + 1, y + 1, 0xc8c0b0); g.px(x + 32, y + 1, 0xc8c0b0);
  }

  // tatami floor (night)
  const ty0 = 132;
  g.rect(0, 128, W, 4, 0x4a3428); g.hl(0, W, 128, 0x6a4a38);
  for (let y = ty0; y < 200; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - lampX) / 190, (y - 140) / 90);
    let c = tone(x, y, d, [0xd0b06a, 0xa8925a, 0x847652, 0x625a48], 0.5);
    if (y % 2 === 0) c = dk(c, 0.07);
    g.px(x, y, c);
  }
  for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) g.px(x, 158 + k, k === 1 ? 0x2a3a30 : 0x1a2420);
  for (let y = ty0; y < 158; y++) { const x = Math.round(180 + (y - ty0) * 0.3); g.px(x, y, 0x5a4a38); }
  for (let y = 161; y < 200; y++) { const x = Math.round(100 - (y - 161) * 0.6); g.px(x, y, 0x5a4a38); }
  // moonlight patch on the tatami (window shape with the mullion shadow)
  for (let y = 134; y < 176; y++) {
    const k = (y - 134) / 42, xa = 104 - k * 22, xb = 210 - k * 4, mid = (xa + xb) / 2;
    for (let x = Math.ceil(xa); x < xb; x++) {
      if (Math.abs(x - mid) < 1.6) continue;
      if ((x + y) % 2 === 0) g.px(x, y, mix(g.get(x, y), 0x9aa6f0, 0.3));
    }
  }

  // desk with lamp, mug and notebook on the right
  {
    const x0 = 238, y0 = 112;
    g.rect(x0, y0, W - x0, 4, lt(brown, 0.15)); g.hl(x0, W, y0, lt(brown, 0.4)); g.hl(x0, W, y0 + 4, dk(brown, 0.5));
    g.rect(x0 + 2, y0 + 5, 4, 46, dk(brown, 0.4)); g.vl(x0 + 2, y0 + 5, y0 + 50, brown);
    g.rect(x0 + 40, y0 + 5, W - x0 - 40, 22, dk(brown, 0.25)); g.frame(x0 + 40, y0 + 5, W - x0 - 40, 22, dk(brown, 0.55)); g.rect(x0 + 56, y0 + 15, 8, 2, 0xd8b070);
    // arm lamp
    g.rect(lampX + 12, y0 - 3, 14, 3, 0x2e4a3a); g.line(lampX + 18, y0 - 3, lampX + 8, y0 - 20, 0x2e4a3a); g.line(lampX + 8, y0 - 20, lampX - 2, y0 - 22, 0x2e4a3a);
    g.sprite(['...kkkk..', '..kgggGk.', '.kgggggGk', 'kgggggggk', 'kkkkkkkkk', '.yyyyyyy.'], { k: 0x1e3a2a, g: green, G: lt(green, 0.4), y: 0xfff4c0 }, lampX - 10, lampY - 12);
    g.beam(lampX - 9, lampX - 2, lampY - 6, lampX - 26, lampX + 14, y0, 0xfff0b0, 0.3, 0.75);
    g.light(lampX - 6, y0, 34, 6, 0xfff4d0, 0.35, 1);
    // notebook + pencil
    g.rect(250, y0 - 2, 20, 3, 0xfffaf0); g.vl(259, y0 - 2, y0, 0xd8c8b0); g.line(252, y0 - 4, 262, y0 - 2, 0xf0c040); g.px(262, y0 - 2, 0x2a2020);
    // mug with steam
    g.rect(305, y0 - 9, 8, 9, 0xf4f0e8); g.vl(305, y0 - 9, y0 - 1, 0xffffff); g.vl(312, y0 - 9, y0 - 1, 0xc8c0b0); g.frame(313, y0 - 7, 3, 5, 0xf4f0e8); g.hl(305, 312, y0 - 9, 0x6a3a2a);
    for (let i = 0; i < 12; i++) { const yy = y0 - 11 - i, xx = 309 + Math.round(1.5 * Math.sin(i * 0.6)); if (bay(xx, yy) < 0.8 - i * 0.05) g.px(xx, yy, 0xfff8ee); }
  }
  // potted monstera next to the bookshelf
  {
    const px0 = 82, py0 = 150;
    const lp = [0x9ad07a, 0x5a9a5a, 0x3a6a44, 0x22402c];
    leaf(g, 72, 112, 22, -0.7, lp); leaf(g, 92, 108, 24, 0.6, lp); leaf(g, 80, 98, 22, -0.1, lp); leaf(g, 98, 124, 18, 0.9, lp); leaf(g, 68, 128, 16, -1, lp);
    // monstera splits
    for (const [x, y, dx] of [[66, 108, 1], [64, 114, 1], [96, 102, -1], [99, 108, -1], [74, 92, 1], [86, 92, -1], [101, 120, -1], [62, 126, 1]]) {
      for (let k = 0; k < 4; k++) g.px(x + k * dx, y + (k >> 1), g.get(x - 6 * dx, y - 8));
    }
    for (const [x, y] of [[80, 104], [90, 112], [72, 118]]) { g.px(x, y, 0x3a6a44); g.px(x + 1, y, 0x2a4a34); }
    g.rect(px0 - 10, py0 - 16, 20, 16, 0xe8dcc8); g.vl(px0 - 10, py0 - 16, py0 - 1, 0xfff6e8); g.vl(px0 + 9, py0 - 16, py0 - 1, 0xb8a890);
    g.rect(px0 - 11, py0 - 18, 22, 3, 0xf4ecdc); g.hl(px0 - 9, px0 + 8, py0, 0x4a3a2a);
  }
  // futon corner with pillow, bottom right
  {
    const M = new Mask(g.w, g.h).poly([[214, 184], [324, 170], [324, 204], [206, 204]]);
    M.fill(g, (x, y) => {
      const sheet = y < 186 - (x - 214) * 0.13 + 6;
      if (sheet) return tone(x, y, (y - 170) / 30, [0xf8f2e6, 0xe0d8cc]);
      const dot = ((x + Math.floor(y / 6) * 4) % 8 === 0) && y % 6 === 0;
      const flower = dot ? 0xf8f0e0 : null;
      return flower ?? tone(x, y, 0.2 + (y - 176) / 40 + (x - 206) / 400, [0x7a9ad0, 0x5a7ab8, 0x445e9a], 0.5);
    });
    M.outline(g, 0x2a3048, 0xfff8ec);
    for (let x = 212; x < W; x++) { const y = Math.round(192 - (x - 214) * 0.13); g.px(x, y, 0x3a4a80); g.px(x, y - 1, 0xa8bce8); }
    const P = new Mask(g.w, g.h).ell(266, 181, 18, 5);
    P.fill(g, (x, y) => tone(x, y, 0.3 + (y - 176) / 12, [0xfffaf0, 0xe8dcc8, 0xc8bca8]));
    P.outline(g, 0x6a5a58, 0xffffff);
  }
}

/** Four-point twinkle star. */
function twinkle(g, x, y, c, c2, big = false) {
  g.px(x, y, c); g.px(x - 1, y, c2); g.px(x + 1, y, c2); g.px(x, y - 1, c2); g.px(x, y + 1, c2);
  if (big) { g.px(x - 2, y, c2); g.px(x + 2, y, c2); g.px(x, y - 2, c2); g.px(x, y + 2, c2); }
}

/** Stone lantern (ishi-doro) with a lit fire box. s = scale (1 = ~30px tall). */
function toro(g, cx, by, sc, lit, pal) {
  const [hi, base, sh, ol] = pal;
  const S = (v) => Math.round(v * sc);
  const part = (w, h, y, roof = false) => {
    const M = new Mask(g.w, g.h);
    if (roof) M.poly([[cx - S(w / 2), y + S(h)], [cx + S(w / 2), y + S(h)], [cx + S(w / 4), y], [cx - S(w / 4), y]]);
    else M.rect(cx - S(w / 2), y, S(w), S(h));
    M.fill(g, (x) => (x < cx - S(w / 2) + Math.max(1, S(2)) ? hi : x > cx + S(w / 2) - Math.max(2, S(4)) ? sh : base));
    M.outline(g, ol);
    return y + S(h);
  };
  let y = by - S(34);
  // hoju (finial), roof, fire box, platform, pole, base
  g.ell(cx, y + S(1), S(2), S(2), base); g.px(cx - 1, y, hi);
  y = part(18, 6, y + S(3), true);
  const fbY = y;
  part(10, 8, y);
  // fire box window
  g.rect(cx - S(3), fbY + S(2), S(6), S(5), lit);
  g.rect(cx - S(2), fbY + S(3), S(4), S(3), 0xfff4c8);
  y = part(14, 3, fbY + S(8));
  y = part(6, 10, y);
  part(14, 4, y);
}

// --- yokai: moonlit shrine path ------------------------------------------------------------------
function yokai(g, s) {
  const W = g.w;
  const cyan = hex(s.card.accent), orange = hex(s.card.accent2);
  const sr = rng(71);
  // night sky
  g.vgrad(0, 0, W, 126, [0x120e26, 0x1c1636, 0x2a2248, 0x3a2e5c, 0x4e3a6c], 0.6);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(sr() * W), y = Math.floor(sr() * 100);
    g.px(x, y, sr() < 0.3 ? 0xffffff : sr() < 0.5 ? 0xb8f0ff : 0x8a80c0);
  }
  for (const [x, y, b] of [[40, 14, 1], [168, 22, 1], [110, 48, 0], [212, 10, 0], [300, 70, 0], [80, 70, 0], [150, 8, 0]]) twinkle(g, x, y, 0xffffff, 0x9ae8ff, b);
  // full moon with halo and craters
  const mx = 238, my = 40, mr = 20;
  g.light(mx, my, 60, 50, 0x6a6aa8, 0.35, 0.9);
  g.light(mx, my, 36, 34, 0xa8b0e0, 0.3, 0.8);
  g.ell(mx, my, mr, mr, (x, y, nx, ny) => tone(x, y, 0.15 + (nx * 0.6 + ny * 0.4) * 0.5 + 0.3, [0xfffbe8, 0xfff0c8, 0xe8d8a8, 0xc8b890], 0.5));
  for (const [dx, dy, r] of [[-6, -5, 4], [5, 3, 5], [-8, 8, 3], [8, -9, 2], [-1, 12, 2]]) g.ell(mx + dx, my + dy, r, r, (x, y, nx, ny) => (nx + ny < -0.3 ? 0xd8c8a0 : 0xe8dcb4));
  g.ring(mx, my, mr, mr, 0xfff8e0);
  // wispy clouds across the moon
  for (const [x, y, w] of [[196, 50, 70], [214, 56, 50], [150, 34, 40], [20, 40, 60], [60, 46, 30]]) {
    for (let i = 0; i < w; i++) { const yy = y + Math.round(Math.sin(i * 0.08) * 1.5); g.px(x + i, yy, 0x4a3e74); if (i > 3 && i < w - 3) g.px(x + i, yy + 1, 0x3a2e5c); if (i > 6 && i < w - 8) g.px(x + i, yy - 1, 0x7a6aa8); }
  }

  // distant wooded hills + shrine hall
  const hill = (x) => 100 + 6 * Math.sin(x * 0.03 + 1) + 3 * Math.sin(x * 0.1);
  ridge(g, 0, W, hill, 126, (x, y, d) => (d === 0 ? 0x4a3e6e : (x * 3 + y * 5) % 11 === 0 ? 0x2a2048 : 0x2e244c));
  {
    const hx = 160, hy = 96;
    g.poly([[hx - 40, hy + 8], [hx + 40, hy + 8], [hx + 26, hy - 4], [hx - 26, hy - 4]], 0x1e1834);
    g.hl(hx - 40, hx + 40, hy + 8, 0x4a3e6e); g.line(hx - 26, hy - 4, hx - 40, hy + 8, 0x5a4e80); g.hl(hx - 26, hx + 26, hy - 4, 0x5a4e80);
    g.px(hx - 41, hy + 7, 0x5a4e80); g.px(hx + 41, hy + 7, 0x5a4e80);
    g.rect(hx - 30, hy + 9, 60, 16, 0x241c3e); for (let x = hx - 28; x < hx + 30; x += 8) g.vl(x, hy + 9, hy + 24, 0x3a2e58);
    g.rect(hx - 10, hy + 13, 20, 12, 0x6a3a3a); g.light(hx, hy + 19, 16, 8, orange, 0.4, 1);
    g.px(hx - 14, hy + 11, orange); g.px(hx + 14, hy + 11, orange);
  }

  // gravel path in perspective (floor band)
  const pathL = (y) => 146 - (y - 118) * 4.2, pathR = (y) => 174 + (y - 118) * 4.2;
  for (let y = 118; y < 200; y++) for (let x = 0; x < W; x++) {
    const inPath = x >= pathL(y) && x <= pathR(y);
    const t = (y - 118) / 82;
    if (inPath) {
      g.px(x, y, tone(x, y, 0.15 + t * 0.55, [0x5a5480, 0x4e4872, 0x433d64], 0.5));
    } else {
      // dark moss + low grass
      let c = tone(x, y, t * 0.6 + 0.2, [0x2e3a4e, 0x243042, 0x1a2436], 0.5);
      if ((x * 5 + y * 3) % 13 === 0) c = 0x3e5260;
      g.px(x, y, c);
    }
  }
  // pebbles: jittered grid, larger and sparser toward the viewer
  {
    const pr2 = rng(75);
    for (let y = 120; y < 200;) {
      const sc = 1 + (y - 118) / 40, step = Math.round(3 + sc * 3);
      for (let x = Math.round(pathL(y)); x < pathR(y); x += step) {
        const px2 = x + Math.floor(pr2() * step), py2 = y + Math.floor(pr2() * 2);
        if (px2 < pathL(py2) + 2 || px2 > pathR(py2) - 2) continue;
        const w2 = sc > 2 ? 2 : 1;
        g.hl(px2, px2 + w2, py2, 0x8a84b0); g.hl(px2, px2 + w2, py2 + 1, 0x6a6490); g.px(px2 + w2, py2 + 1, 0x2e2a48);
        if (w2 > 1) g.hl(px2 + 1, px2 + w2, py2 + 2, 0x2e2a48);
      }
      y += Math.max(2, Math.round(sc * 1.6));
    }
  }
  // path edge stones
  for (let y = 120; y < 200; y += 2) {
    const sz = Math.max(1, Math.round((y - 112) / 22));
    for (const x of [Math.round(pathL(y)), Math.round(pathR(y))]) if ((y >> 1) % (sz + 1) === 0) { g.rect(x - sz, y, sz * 2, sz, 0x6a6488); g.hl(x - sz, x + sz - 1, y, 0x9a94b8); }
  }
  // stepping stones (ishidatami) down the centre
  for (let k = 0; k < 7; k++) {
    const y = Math.round(120 + Math.pow(k / 6, 1.5) * 74), sz = 2 + (y - 118) / 7;
    const M = new Mask(g.w, g.h).ell(160 + ((k % 2) ? 2 : -2) * (sz / 4), y, sz * 1.8, sz * 0.45);
    M.fill(g, (x, yy) => (yy < y - sz * 0.15 ? 0x9a94bc : 0x7a7498)); M.outline(g, 0x2a2640);
  }

  // torii (mid distance)
  {
    const tl = 126, tr = 194, top = 66;
    const ver = 0x8a2a3a, verL = 0xc84a5a, verD = 0x5a1a2a, ink = 0x1a0e1a;
    // pillars
    for (const px of [tl + 8, tr - 13]) { g.rect(px, top + 10, 5, 50, ver); g.vl(px + 4, top + 10, top + 59, verL); g.vl(px, top + 10, top + 59, verD); g.rect(px - 1, top + 56, 7, 4, ink); }
    // kasagi with upturned ends
    for (let x = tl - 6; x <= tr + 6; x++) {
      const e = Math.max(0, Math.abs(x - 160) - 30) / 8;
      const y0 = Math.round(top - e * e);
      g.px(x, y0, ink); g.px(x, y0 + 1, ink); g.px(x, y0 + 2, ver); g.px(x, y0 + 3, verL); g.px(x, y0 + 4, ver); g.px(x, y0 + 5, verD);
    }
    g.rect(tl, top + 14, tr - tl, 3, ver); g.hl(tl, tr - 1, top + 14, verL); g.hl(tl, tr - 1, top + 16, verD);
    g.rect(157, top + 6, 6, 8, ink); g.rect(158, top + 7, 4, 6, 0x3a2a3a);
  }

  // bamboo groves framing the sides
  const bamboo = (x, w, top, lit) => {
    for (let y = top; y < 160; y++) for (let i = 0; i < w; i++) {
      let c = i === w - 1 ? (lit ? 0x6ab89a : 0x3a6a5a) : i === 0 ? 0x16302a : i === 1 ? 0x22443a : 0x2e5a4c;
      if ((y - top) % 16 === 0) c = 0x162a24; else if ((y - top) % 16 === 1) c = 0x4a8a72;
      g.px(x + i, y, c);
    }
  };
  for (const [x, w, top, lit] of [[2, 6, -2, 1], [16, 5, 6, 1], [30, 4, 18, 0], [46, 6, -4, 1], [62, 3, 30, 0], [254, 3, 28, 0], [266, 6, -6, 1], [282, 4, 12, 0], [294, 6, -2, 1], [310, 5, 8, 1]]) bamboo(x, w, top, lit);
  // bamboo leaf sprays
  const lr = rng(73);
  for (let i = 0; i < 38; i++) {
    const left = i % 2 === 0;
    const x = left ? Math.floor(lr() * 80) : 240 + Math.floor(lr() * 80), y = Math.floor(lr() * 110);
    const dir = lr() < 0.5 ? -1 : 1;
    for (let k = 0; k < 6; k++) { g.px(x + k * dir, y + (k >> 1), k < 2 ? 0x3e7a62 : 0x24483c); g.px(x + k * dir, y + (k >> 1) + 1, 0x16302a); }
  }

  // stone lanterns, lit
  const stone = [0x9a94b8, 0x6e6890, 0x4a4468, 0x1a1428];
  for (const [x, y, sc] of [[100, 132, 0.8], [220, 132, 0.8], [36, 168, 1.5], [284, 168, 1.5]]) {
    g.light(x, y - 22 * sc, 26 * sc, 20 * sc, orange, 0.3, 0.9);
    g.light(x, y + 2, 34 * sc, 8 * sc, orange, 0.3, 0.9);
    toro(g, x, y, sc, orange, stone);
  }

  // hitodama wisps
  const wisp = (x, y, r) => {
    g.light(x, y, r * 4, r * 4, cyan, 0.3, 0.9);
    for (let k = 1; k <= r * 3; k++) { const tx = x + Math.round(Math.sin(k * 0.5) * 1.5) + Math.floor(k / 3), ty = y - k; if (bay(tx, ty) < 1 - k / (r * 3)) g.px(tx, ty, k < r ? 0xd8fbff : cyan); }
    g.ell(x, y, r, r, (xx, yy, nx, ny) => (nx * nx + ny * ny < 0.3 ? 0xffffff : nx + ny < 0 ? 0xd8fbff : cyan));
  };
  wisp(84, 88, 3); wisp(250, 104, 3); wisp(190, 58, 2); wisp(120, 150, 2);
  // fireflies
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(sr() * W), y = 110 + Math.floor(sr() * 88);
    g.px(x, y, 0xe8ff9a); if (i % 3 === 0) { g.px(x - 1, y, 0x8ab86a); g.px(x + 1, y, 0x8ab86a); g.px(x, y - 1, 0x8ab86a); g.px(x, y + 1, 0x8ab86a); }
  }
  // moonlight sheen on the path
  g.light(160, 172, 90, 26, 0xa8b0e0, 0.18, 0.8);
}

// --- onsen: snowy outdoor rotenburo ----------------------------------------------------------
function onsen(g, s) {
  const W = g.w;
  const red = hex(s.card.accent);
  // winter sky
  g.vgrad(0, 0, W, 110, [0x8ec6e4, 0xaed6ec, 0xcae6f2, 0xe2f2f8, 0xf4fafc], 0.6);
  g.light(200, 20, 80, 30, 0xfffbe8, 0.35, 0.8);
  // snowy mountain ranges: lit (left) faces in snow-white, shadow faces in ice blue
  const peak = (px, py, sl, sr, base, pal, seed) => {
    const [lit, litB, shade, rockC] = pal;
    for (let y = py; y < base; y++) {
      const d = y - py;
      const xl = px - d * sl - 2 * Math.sin(d * 0.35 + seed), xr = px + d * sr + 2 * Math.sin(d * 0.3 + seed * 2);
      const ridgeX = px + Math.sin(d * 0.18 + seed) * 3 + d * 0.15;
      for (let x = Math.floor(xl); x <= xr; x++) {
        let c = x < ridgeX ? (x < xl + 2 ? litB : lit) : shade;
        const u = x < ridgeX ? (x - px + d * sl * 0.85) : (x - px - d * sr * 0.85);
        const gully = Math.sin(u * 0.7 + seed) > 0.82 && Math.sin(d * 0.21 + u) > -0.3;
        if (d > 8 && gully) c = x < ridgeX ? litB : rockC;
        if (d > (base - py) * 0.75 && bay(x, y) < (d - (base - py) * 0.75) / ((base - py) * 0.25)) c = rockC;
        g.px(x, y, c);
      }
    }
  };
  const farPal = [0xf4f8fc, 0xdde8f4, 0xbccde4, 0xaabcd8];
  peak(30, 54, 1.1, 1.3, 104, farPal, 1); peak(250, 40, 1.4, 1.1, 104, farPal, 4); peak(300, 58, 1, 1, 104, farPal, 7);
  const midPal = [0xffffff, 0xe8f0f8, 0xa8c0dc, 0x8aa4c8];
  peak(110, 46, 1.25, 1.5, 104, midPal, 2); peak(186, 28, 1.5, 1.35, 104, midPal, 3);
  g.hl(184, 188, 28, 0xffffff);
  // forested foothills: tiered snow-dusted conifers in two rows
  ridge(g, 0, W, (x) => 100 + 3 * Math.sin(x * 0.05), 116, (x, y, d) => (d < 2 ? 0xffffff : tone(x, y, d / 14, [0xe8f0f8, 0xd0dcea])));
  const conifer = (x, base, h, col, colD, snow) => {
    const tiers = 3;
    for (let k = 0; k < tiers; k++) {
      const ty = base - h + Math.round(k * h / (tiers + 0.5)), th = Math.round(h / tiers) + 2;
      for (let j = 0; j < th; j++) {
        const hw = Math.round((j + 1) * (2 + k) / th * 1.6);
        for (let i = -hw; i <= hw; i++) g.px(x + i, ty + j, j === 0 || (i < 0 && j < 2) ? snow : i < 0 ? col : colD);
        g.px(x - hw, ty + j, snow);
      }
    }
    g.px(x, base, 0x5a4a4a); g.px(x, base - h - 1, snow);
  };
  for (let x = 4; x < W; x += 13) conifer(x + ((x * 7) % 5), 104 + ((x * 3) % 3), 12 + ((x * 5) % 5), 0x7c98a8, 0x6a8698, 0xf4f8fc);
  for (let x = 10; x < W; x += 11) conifer(x + ((x * 3) % 4), 113 + ((x * 7) % 3), 15 + ((x * 11) % 6), 0x4e7280, 0x3a5c6a, 0xffffff);

  // bamboo fence behind the pool
  const fy0 = 110, fy1 = 136;
  for (let x = 0; x < 250; x++) {
    const pole = x % 6;
    for (let y = fy0 + ((x * 5) % 3); y < fy1; y++) {
      let c = pole === 0 ? 0x5a6a3a : pole === 1 ? 0xc8c87a : pole < 4 ? 0xa8ac5e : 0x8a904c;
      if ((y + x * 3) % 22 === 0) c = 0x6a7040;
      g.px(x, y, c);
    }
  }
  for (const y of [115, 127]) { g.rect(0, y, 250, 3, 0x6a5038); g.hl(0, 249, y, 0x9a7a54); g.hl(0, 249, y + 2, 0x3e2e22); for (let x = 8; x < 250; x += 24) { g.px(x, y + 1, 0x2a1e18); g.px(x + 1, y, 0x2a1e18); } }
  // snow along the fence top
  for (let x = 0; x < 250; x++) { const y = fy0 + ((x * 5) % 3) - 1; g.px(x, y, 0xffffff); g.px(x, y - 1, (x % 7) < 4 ? 0xffffff : 0xe8f2f8); }

  // bathhouse with 「ゆ」 noren on the right
  {
    const x0 = 248, y0 = 58;
    g.rect(x0, y0 + 10, W - x0, 80, 0x7a5a40);
    for (let x = x0; x < W; x += 5) g.vl(x, y0 + 10, y0 + 89, 0x5e4430);
    // roof with snow
    g.poly([[x0 - 10, y0 + 12], [W + 4, y0 + 12], [W + 4, y0], [x0 + 6, y0]], 0x4a4e5e);
    for (let x = x0 - 10; x < W; x += 4) g.vl(x, y0 + 2, y0 + 11, 0x3a3e4e);
    g.hl(x0 - 10, W, y0 + 12, 0x2a2e3a);
    const snowRoof = new Mask(g.w, g.h).poly([[x0 - 12, y0 + 4], [W + 4, y0 + 2], [W + 4, y0 - 6], [x0 + 4, y0 - 5]]);
    snowRoof.fill(g, (x, y) => (y < y0 - 3 ? 0xffffff : tone(x, y, (y - y0 + 3) / 6, [0xf4f8fc, 0xd8e4f0])));
    for (let x = x0 - 10; x < W; x += 7) { g.vl(x + 3, y0 + 3, y0 + 4 + ((x * 3) % 4), 0xe8f2fa); g.px(x + 3, y0 + 6 + ((x * 3) % 4), 0xffffff); } // icicles
    // entrance + noren
    g.rect(x0 + 14, y0 + 22, 48, 68, 0x2e2420);
    g.light(x0 + 38, y0 + 70, 24, 22, 0xffc070, 0.4, 1);
    g.rect(x0 + 10, y0 + 18, 56, 3, 0x5e4430); g.hl(x0 + 10, x0 + 65, y0 + 18, 0x9a7a54);
    for (let p = 0; p < 2; p++) {
      const nx0 = x0 + 15 + p * 24, nx1 = nx0 + 22;
      for (let x = nx0; x < nx1; x++) for (let y = y0 + 21; y < y0 + 50 + ((x - nx0) % 2); y++) {
        let c = red; if (x === nx0) c = lt(red, 0.25); if (x === nx1 - 1) c = dk(red, 0.3); if (y < y0 + 24) c = dk(red, 0.25);
        g.px(x, y, c);
      }
    }
    g.text('ゆ', x0 + 38, y0 + 26, { size: 16, color: 0xffffff, align: 'center' });
    // lantern
    g.vl(x0 + 6, y0 + 13, y0 + 22, 0x2a1e18);
    g.ell(x0 + 6, y0 + 30, 5, 7, (x, y, nx) => (nx < -0.4 ? 0xfff0c0 : nx > 0.5 ? 0xe89a3a : 0xffd27a));
    for (const yy of [y0 + 26, y0 + 30, y0 + 34]) g.hl(x0 + 2, x0 + 10, yy, 0xc8782a);
    g.rect(x0 + 3, y0 + 22, 7, 2, 0x2a1e18); g.rect(x0 + 3, y0 + 37, 7, 2, 0x2a1e18);
    g.light(x0 + 6, y0 + 30, 16, 16, 0xffd27a, 0.3, 0.8);
  }

  // snow-laden pine branch (top-left framing)
  {
    const M = new Mask(g.w, g.h).stroke([[-4, 18, 3], [40, 24, 2], [86, 20, 1]]);
    M.fill(g, (x, y) => (M.edge(x, y, 0, -1) ? 0x8a6a5a : 0x5a3e38)); M.outline(g, 0x2e2026);
    const clumps = [[8, 12, 12], [30, 18, 11], [52, 20, 10], [72, 18, 8], [18, 30, 9], [44, 30, 8], [64, 28, 6], [-2, 30, 8]];
    for (const [cx, cy, r] of clumps) {
      const C = new Mask(g.w, g.h).blob(cx, cy, r, 0.25, 11, cx);
      C.fill(g, (x, y) => (((x + y * 2) % 3 === 0) ? 0x1e3e3a : tone(x, y, 0.4 + (y - cy) / r * 0.5, [0x4a7a6a, 0x2e5a50, 0x1e3e3a])));
      C.outline(g, 0x142a28);
      for (let k = 0; k < 9; k++) { // needle fringe along the underside
        const a = Math.PI * (0.15 + 0.7 * k / 8), ex = Math.round(cx + Math.cos(a) * (r + 1)), ey = Math.round(cy + Math.sin(a) * (r * 0.9 + 1));
        g.px(ex, ey, 0x1e3e3a); g.px(ex + (k % 2 ? 1 : -1), ey + 1, 0x142a28);
      }
      // snow cap
      const S = new Mask(g.w, g.h).ell(cx - 1, cy - r * 0.45, r * 0.95, r * 0.45);
      S.each((x, y) => { if (C.has(x, y + 2) || C.has(x, y)) g.px(x, y, y < cy - r * 0.6 ? 0xffffff : 0xe2eef8); });
    }
  }

  // steam over the pool (behind the near rocks)
  // back rocks
  const rock = (cx, cy, rx, ry, snow) => {
    const M = new Mask(g.w, g.h).ell(cx, cy, rx, ry); M.ell(cx - rx * 0.3, cy + ry * 0.2, rx * 0.8, ry * 0.9);
    M.fill(g, (x, y) => tone(x, y, 0.45 + ((x - cx) / rx * 0.4 + (y - cy) / ry * 0.6) * 0.5, [0xa8a8b0, 0x84848e, 0x62626e, 0x4a4a58], 0.5));
    M.outline(g, 0x2e2e3a, 0x6a6a76);
    if (snow) {
      M.each((x, y) => { if (!M.has(x, y - 2) || !M.has(x, y - 1)) g.px(x, y, 0xffffff); else if (!M.has(x, y - 3) && bay(x, y) < 0.6) g.px(x, y, 0xe2eef8); });
    }
    // crack line
    g.line(cx - rx * 0.2, cy - ry * 0.1, cx + rx * 0.1, cy + ry * 0.4, 0x5a5a66);
  };
  // pool water (floor band)
  const wy0 = 140, wy1 = 192;
  for (let y = wy0 - 5; y < 200; y++) {
    const t = clamp01((y - wy0) / (wy1 - wy0));
    for (let x = 0; x < W; x++) {
      let c = tone(x, y, 0.15 + t * 0.7, [0xa8e4e0, 0x6cc8c4, 0x40aaa8, 0x2e8a8e], 0.5);
      const rip = Math.sin(x * 0.12 + y * 0.9) + Math.sin(x * 0.05 - y * 0.4);
      if (rip > 1.55) c = 0xc8f2ee; else if (rip < -1.6) c = 0x2a7c82;
      g.px(x, y, c);
    }
  }
  // sky reflection streaks
  for (const [x, y, w] of [[60, 150, 40], [150, 158, 50], [230, 152, 30], [100, 172, 36], [200, 178, 44]]) { g.hl(x, x + w, y, 0xe2fbf8); g.hl(x + 6, x + w - 8, y + 1, 0xa8e4e0); }
  // back rocks ring
  for (const [x, y, rx, ry] of [[10, 140, 16, 8], [40, 138, 14, 7], [70, 141, 12, 6], [98, 139, 15, 7], [128, 141, 12, 6], [156, 138, 14, 7], [186, 140, 13, 6], [214, 138, 15, 7], [244, 141, 12, 6], [270, 139, 15, 7], [300, 141, 14, 7], [322, 138, 12, 7]]) rock(x, y, rx, ry, true);
  // water line along the back rocks
  for (let x = 0; x < W; x++) if (bay(x, 146) < 0.5) g.px(x, 146, 0xd8f6f2);
  // bamboo water spout pouring into the pool
  {
    g.rect(0, 120, 30, 4, 0x8a9a4a); g.hl(0, 29, 120, 0xc8d07a); g.hl(0, 29, 123, 0x5a6a2a); g.vl(29, 120, 123, 0x5a6a2a);
    g.rect(14, 124, 3, 16, 0x6a7a3a);
    for (let y = 124; y < 150; y++) { const x = 31 + Math.floor((y - 124) / 8); g.px(x, y, 0xffffff); g.px(x + 1, y, (y % 3) ? 0xd8f6ff : 0xffffff); }
    g.ring(33, 151, 5, 2, 0xffffff); g.ring(33, 151, 8, 3, 0xd8f6f2);
  }
  // steam wisps rising from the water
  for (const [x, y, rx, ry, st] of [[70, 138, 26, 10, 0.4], [86, 128, 14, 9, 0.3], [176, 134, 30, 11, 0.38], [190, 120, 14, 10, 0.26], [262, 140, 22, 9, 0.4], [124, 126, 14, 8, 0.25], [40, 124, 12, 8, 0.24], [110, 160, 22, 7, 0.22], [226, 166, 24, 7, 0.22]]) mist(g, x, y, rx, ry, 0xf4fbfc, st);
  // steam curls
  for (const [x, y, ph] of [[90, 140, 0], [190, 138, 2], [250, 142, 4], [140, 150, 1]]) {
    for (let i = 0; i < 26; i++) { const yy = y - i, xx = x + Math.round(4 * Math.sin(i * 0.25 + ph)); if (bay(xx, yy) < 0.9 - i * 0.03) { g.px(xx, yy, 0xffffff); } }
  }
  // near rocks + props
  for (const [x, y, rx, ry] of [[-2, 194, 22, 10], [36, 198, 18, 8], [292, 196, 20, 9], [322, 190, 14, 10], [150, 202, 26, 7]]) rock(x, y, rx, ry, true);
  // wooden bucket + folded towel on the right rock
  {
    const bx = 284, by = 177;
    g.rect(bx, by, 16, 10, 0xe8b070); g.vl(bx, by, by + 9, 0xf8d098); g.vl(bx + 15, by, by + 9, 0xa8703e);
    for (let x = bx + 3; x < bx + 15; x += 4) g.vl(x, by + 1, by + 9, 0xd09858);
    g.hl(bx, bx + 15, by + 2, 0x6a4a3a); g.hl(bx, bx + 15, by + 7, 0x6a4a3a); g.ell(bx + 8, by, 8, 2, (x, y, nx, ny) => (ny < 0 ? 0xf8d098 : 0x6ab8b8)); g.hl(bx + 1, bx + 14, by - 1, 0xffe0b0);
    g.rect(bx - 22, by + 4, 18, 6, 0xffffff); g.hl(bx - 22, bx - 5, by + 6, 0x4a8ad8); g.hl(bx - 22, bx - 5, by + 9, 0xd8e4ee); g.vl(bx - 5, by + 4, by + 9, 0xd8e4ee);
  }
  // falling snow
  const fr = rng(83);
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(fr() * W), y = Math.floor(fr() * 190);
    if (i % 5 === 0) { g.px(x, y, 0xffffff); g.px(x + 1, y, 0xffffff); g.px(x, y + 1, 0xffffff); g.px(x + 1, y + 1, 0xe8f0f8); }
    else g.px(x, y, 0xffffff);
  }
}

/** Theatre curtain with vertical folds. dir: which side is gathered (for the hem curve). */
function curtain(g, x0, x1, y0, y1, pal, period = 9, hem = 0) {
  const [hi, base, sh, deep] = pal;
  for (let x = x0; x < x1; x++) {
    const f = Math.sin(((x - x0) / period) * Math.PI * 2);
    const yb = y1 + Math.round(hem * Math.sin(((x - x0) / (x1 - x0)) * Math.PI));
    for (let y = y0; y < yb; y++) {
      let c = f > 0.75 ? hi : f > 0.1 ? base : f > -0.6 ? sh : deep;
      if (f > 0.1 && f <= 0.75 && bay(x, y) < (f - 0.1) * 0.6) c = hi;
      g.px(x, y, c);
    }
    g.px(x, yb, deep);
  }
}

// --- dajare: manzai stage with gold folding screen ---------------------------------------------
function dajare(g, s) {
  const W = g.w;
  const orange = hex(s.card.accent), teal = hex(s.card.accent2), cream = hex(s.card.bg);
  const redPal = [0xe84a4a, 0xc02a32, 0x8a1824, 0x5a0c16];
  // dark stage back
  g.vgrad(0, 0, W, 150, [0x2a1620, 0x3a1e28, 0x4a2630], 0.6);
  // gold folding screen (kinbyobu), six panels zig-zag
  const bx0 = 50, bx1 = 270, by0 = 40, by1 = 148, n = 6, pw = (bx1 - bx0) / n;
  for (let i = 0; i < n; i++) {
    const x0 = Math.round(bx0 + i * pw), x1 = Math.round(bx0 + (i + 1) * pw);
    const lit = i % 2 === 0;
    for (let y = by0; y < by1; y++) for (let x = x0; x < x1; x++) {
      const u = (x - x0) / (x1 - x0);
      const t = lit ? 0.15 + u * 0.35 : 0.55 + (1 - u) * 0.3;
      let c = tone(x, y, t + (y - by0) / (by1 - by0) * 0.15, [0xfbe08a, 0xeec05a, 0xd8a440, 0xb8862a], 0.5);
      // gold-leaf squares
      if ((y - by0) % 11 === 0 || (x - x0) % 11 === 5) c = mix(c, 0xa87a28, 0.25);
      g.px(x, y, c);
    }
    g.vl(x0, by0, by1 - 1, lit ? 0xfff0b0 : 0x8a6020);
  }
  // pine painted across the screen + golden mist bands
  {
    const M = new Mask(g.w, g.h).stroke([[150, 146, 4], [146, 120, 3], [156, 100, 3], [148, 82, 2], [170, 70, 2]]);
    M.stroke([[147, 116, 2], [118, 104, 2], [96, 98, 1]]); M.stroke([[154, 98, 2], [190, 90, 2], [214, 84, 1]]);
    M.fill(g, (x, y) => (M.edge(x, y, -1, 0) ? 0x9a6a4a : 0x6a3e2e)); M.outline(g, 0x3a2018);
    for (const [cx, cy, rx, ry] of [[96, 94, 18, 6], [124, 100, 14, 5], [168, 66, 22, 7], [204, 82, 20, 6], [228, 78, 12, 5], [140, 80, 14, 5], [186, 92, 10, 4]]) {
      const C = new Mask(g.w, g.h);
      for (let k = -2; k <= 2; k++) C.ell(cx + k * rx * 0.4, cy - (2 - Math.abs(k)) * 1.2, rx * 0.42, ry);
      C.fill(g, (x, y) => (y < cy - ry * 0.3 ? 0x5a8a4a : (x + y) % 3 === 0 ? 0x2e5a34 : 0x3e6e3e));
      C.outline(g, 0x1e3a24, 0x7aa85a);
    }
    for (const [x, y, w] of [[52, 128, 64], [196, 122, 70], [58, 54, 44], [214, 48, 52]]) {
      const K = new Mask(g.w, g.h).rect(x + 2, y, w - 4, 4).rect(x, y + 1, w, 2);
      K.fill(g, (xx, yy) => (yy === y ? 0xfffbe0 : 0xfff0b0)); K.outline(g, 0xc89a38, 0xc89a38);
    }
  }
  // lacquer frame top + bottom
  g.rect(bx0 - 2, by0 - 3, bx1 - bx0 + 4, 3, 0x1a1012); g.hl(bx0 - 2, bx1 + 1, by0 - 3, 0x5a3a3a);
  g.rect(bx0 - 2, by1, bx1 - bx0 + 4, 3, 0x1a1012);
  for (let i = 0; i <= n; i++) { const x = Math.round(bx0 + i * pw); g.px(x, by0 - 2, 0xe8c050); g.px(x, by1 + 1, 0xe8c050); }

  // stage floor: planks converging to the vanishing point
  const fy = 150, vpx = 160, vpy = 30;
  for (let y = fy; y < 194; y++) for (let x = 0; x < W; x++) {
    const u = (x - vpx) / ((y - vpy) / (194 - vpy));
    const plank = Math.floor(u / 22);
    const lineX = ((u % 22) + 22) % 22 < 1.2;
    let c = tone(x, y, 0.25 + (y - fy) / 44 * 0.4 + (plank % 3 === 0 ? 0.12 : 0), [0xe0a464, 0xc8884a, 0xb07038, 0x94582a], 0.5);
    if (Math.sin(u * 0.9 + plank * 7) > 0.96) c = dk(c, 0.15);
    if (lineX) c = 0x6a3a20;
    g.px(x, y, c);
  }
  g.hl(0, W, fy, 0x3a2018); g.hl(0, W, fy + 1, 0xf0c080);
  // stage apron edge + footlights
  g.rect(0, 194, W, 6, 0x2a1418); g.hl(0, W, 194, 0xd89a5a); g.hl(0, W, 195, 0x7a4424);
  for (let x = 12; x < W; x += 24) { g.rect(x, 197, 6, 2, 0xffe6a0); g.hl(x + 1, x + 4, 196, 0xfff6d0); g.light(x + 3, 192, 14, 5, 0xffe0a0, 0.3, 0.9); }
  // spotlight beams + pools
  // soft spill of the spotlights on the screen
  g.light(120, 110, 60, 50, 0xfff8e0, 0.22, 0.8);
  g.light(200, 110, 60, 50, 0xfff8e0, 0.22, 0.8);
  g.light(120, 174, 70, 15, 0xfff4d0, 0.3, 1.2, 0.5);
  g.light(200, 174, 70, 15, 0xfff4d0, 0.3, 1.2, 0.5);
  // tape marks (bami)
  for (const [x, y, c] of [[106, 170, teal], [214, 170, orange], [160, 182, cream]]) { g.line(x - 3, y - 1, x + 3, y + 1, c); g.line(x - 3, y + 1, x + 3, y - 1, c); }

  // lighting batten with spot lamps above the screen
  g.rect(44, 24, 232, 2, 0x1a1012); g.hl(44, 275, 24, 0x5a4a4a);
  for (const lx of [76, 124, 196, 244]) {
    g.vl(lx, 26, 28, 0x1a1012);
    g.sprite(['.kkkk.', 'kgggGk', 'kggggk', 'kkkkkk', '.yyyy.'], { k: 0x1a1012, g: 0x3a3238, G: 0x6a5a60, y: 0xfff4c0 }, lx - 3, 28);
    g.light(lx, 34, 9, 5, 0xfff4c0, 0.35, 1);
  }
  // centre microphone stand (sanpachi mic) at stage left
  {
    const x = 58, base = 166;
    g.ell(x, base, 9, 2, 0x2a2228); g.hl(x - 8, x + 8, base - 2, 0x6a6470); g.ell(x, base - 1, 7, 1, 0x3e3a44);
    g.vl(x, 104, base - 2, 0x9a96a4); g.vl(x + 1, 104, base - 2, 0x4e4a58); g.vl(x - 1, 124, base - 4, 0xd8d4e0);
    g.rect(x - 1, 126, 4, 3, 0x2a2228);
    // mic head
    g.sprite([
      '.kkkk.',
      'kSsssk',
      'kSsdsk',
      'kSsssk',
      'kSsdsk',
      'kSsssk',
      '.kkkk.',
      '..kk..',
    ], { k: 0x2a2630, S: 0xf4f4f8, s: 0xb8b8c4, d: 0x6a6a78 }, x - 2, 95);
    g.line(x + 1, 128, x + 10, 140, 0x1a1418); g.line(x + 10, 140, x + 6, 166, 0x1a1418);
  }
  // mekuri (name card stand) at stage right
  {
    const x0 = 240, y0 = 104;
    g.rect(x0, y0, 26, 46, 0x8a5a36); g.frame(x0, y0, 26, 46, 0x4a2a18);
    g.rect(x0 + 3, y0 + 3, 20, 38, cream); g.hl(x0 + 3, x0 + 22, y0 + 3, 0xfffbe8);
    g.vtext('ダジャレ', x0 + 13, y0 + 4, { size: 10, step: 9, color: 0x1a1012 });
    g.rect(x0 + 2, y0 - 2, 22, 2, 0x5a3a24);
    g.line(x0 + 3, y0 + 46, x0 - 1, 160, 0x4a2a18); g.line(x0 + 23, y0 + 46, x0 + 27, 160, 0x4a2a18);
    g.line(x0 + 13, y0 + 46, x0 + 13, 162, 0x4a2a18);
  }

  // side curtains + valance
  curtain(g, 0, 40, 0, 156, redPal, 10, 0);
  curtain(g, 280, W, 0, 156, redPal, 10, 0);
  for (const [x0, x1] of [[0, 40], [280, W]]) { // gathered tie-backs
    g.rect(x0, 108, x1 - x0, 4, 0xe8b84a); g.hl(x0, x1 - 1, 108, 0xfff0a0); g.hl(x0, x1 - 1, 111, 0x8a5a18);
    const tx = x0 === 0 ? 34 : 286;
    g.vl(tx, 112, 124, 0xe8b84a); g.vl(tx + 1, 112, 124, 0xb8862a); g.rect(tx - 2, 124, 6, 6, 0xe8b84a); for (let i = 0; i < 6; i++) g.vl(tx - 2 + i, 130, 134, i % 2 ? 0xb8862a : 0xf8dc7a);
  }
  // valance with swags
  curtain(g, 0, W, 0, 14, redPal, 8, 0);
  for (let k = 0; k < 5; k++) {
    const x0 = k * 64, x1 = x0 + 64;
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / 64, yb = 14 + Math.round(10 * Math.sin(u * Math.PI));
      for (let y = 10; y <= yb; y++) {
        const band = (y - 10 - 8 * Math.sin(u * Math.PI)) ;
        g.px(x, y, band > -1 ? redPal[2] : (Math.floor((y + 10 * Math.sin(u * Math.PI)) / 3) % 2 ? redPal[0] : redPal[1]));
      }
      g.px(x, yb + 1, 0xf8dc7a); g.px(x, yb + 2, (x % 2) ? 0xe8b84a : 0xb8862a); if (x % 3 === 0) g.px(x, yb + 3, 0xb8862a);
    }
    // tassel between swags
    g.vl(x0, 14, 26, 0xe8b84a); g.rect(x0 - 2, 26, 5, 4, 0xf8dc7a); for (let i = -2; i <= 2; i++) g.vl(x0 + i, 30, 34, i % 2 ? 0xb8862a : 0xe8b84a);
  }
}

// --- kaiju: miniature city at sunset ----------------------------------------------------------
function kaiju(g, s) {
  const W = g.w;
  const green = hex(s.card.accent), orange = hex(s.card.accent2);
  // sunset sky
  g.vgrad(0, 0, W, 132, [0x3e3070, 0x6a3c80, 0xa8508a, 0xe0687a, 0xf88c64, 0xffb45a, 0xffd878], 0.55);
  // big low sun
  const sx = 214, sy = 112;
  g.light(sx, sy, 90, 50, 0xffe8a0, 0.3, 0.9);
  g.ell(sx, sy, 18, 18, (x, y, nx, ny) => (ny < -0.6 ? 0xfffbe0 : ny < 0 ? 0xfff2b0 : 0xffe08a));
  for (const yy of [104, 110, 115]) g.hl(sx - 20, sx + 20, yy, 0xffb45a);
  // clouds lit from below
  for (const [x, y, w] of [[10, 30, 80], [120, 18, 70], [230, 40, 84], [60, 58, 60], [180, 70, 56], [270, 84, 40]]) {
    for (let i = 0; i < w; i++) {
      const th = Math.round(2 + 2 * Math.sin((i / w) * Math.PI));
      for (let k = 0; k < th; k++) g.px(x + i, y - k, k === th - 1 ? 0x9a5a8a : 0x7a4a7a);
      g.px(x + i, y + 1, (i + y) % 3 ? 0xffb07a : 0xffd090);
      if (i > 4 && i < w - 6) g.px(x + i, y + 2, 0xf88c64);
    }
  }
  // birds heading home
  bird(g, 140, 46, 0x4a2a5a, true); bird(g, 152, 52, 0x4a2a5a); bird(g, 130, 54, 0x4a2a5a);

  // far skyline silhouettes
  const fr = rng(97);
  let x = 0;
  while (x < W) {
    const w = 8 + Math.floor(fr() * 14), h = 14 + Math.floor(fr() * 26);
    g.rect(x, 124 - h, w, h + 10, 0x8a5a8a);
    if (fr() < 0.3) g.vl(x + 2, 124 - h - 5, 124 - h, 0x8a5a8a);
    for (let wy = 124 - h + 3; wy < 130; wy += 4) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (fr() < 0.18) g.px(wx, wy, 0xffd890);
    x += w + Math.floor(fr() * 3);
  }
  g.rect(0, 124, W, 16, 0x5a3e68);
  // lattice tower
  {
    const tx = 66, ty = 22, by = 132;
    for (let y = ty; y < by; y++) {
      const k = (y - ty) / (by - ty), hw = Math.round(1 + k * k * 22 + k * 4);
      const band = Math.floor((y - ty) / 9) % 2 === 0;
      const col = band ? 0xe84a3a : 0xfff0e0, colD = band ? 0xa82a2a : 0xd8c8c0;
      g.px(tx - hw, y, colD); g.px(tx + hw, y, col);
      if (hw > 2) { g.px(tx - hw + 1, y, colD); g.px(tx + hw - 1, y, col); }
      // lattice cross-bracing
      for (let i = -hw + 2; i < hw - 1; i++) if (((i + y) % 6 === 0) || ((i - y) % 6 === 0)) g.px(tx + i, y, i < 0 ? colD : col);
    }
    for (const [y, w] of [[70, 9], [96, 14]]) { g.rect(tx - w, y, w * 2 + 1, 4, 0xfff0e0); g.hl(tx - w, tx + w, y, 0xffffff); g.hl(tx - w, tx + w, y + 3, 0xa8909a); for (let i = -w + 1; i < w; i += 2) g.px(tx + i, y + 1, 0xffd890); }
    g.vl(tx, 6, ty, 0xfff0e0); g.px(tx, 5, 0xff3a3a); g.px(tx, 4, 0xffa0a0);
    g.light(tx, 5, 6, 6, 0xff6a6a, 0.4, 1);
  }
  // mid miniature buildings with lit windows (warm side faces toward the sun)
  const bl = [[0, 112, 18], [20, 120, 14], [36, 108, 16], [88, 116, 16], [106, 104, 20], [130, 114, 14], [146, 100, 18], [168, 118, 14], [240, 110, 16], [258, 98, 20], [282, 114, 14], [298, 106, 22]];
  for (const [bx, by, bw] of bl) {
    g.rect(bx, by, bw, 140 - by, 0x5a3e68);
    g.vl(bx + bw - 1, by, 139, 0xe0806a); g.vl(bx + bw - 2, by, 139, 0xa85a6a);
    g.hl(bx, bx + bw - 1, by, 0x8a5a7a);
    for (let wy = by + 3; wy < 136; wy += 4) for (let wx = bx + 2; wx < bx + bw - 3; wx += 3) {
      const r = fr();
      g.px(wx, wy, r < 0.45 ? 0xffd27a : r < 0.55 ? 0xffa060 : 0x46304e);
      g.px(wx + 1, wy, r < 0.45 ? 0xffe8a8 : 0x46304e);
    }
    if (bw > 16) { g.rect(bx + 3, by - 4, 5, 4, 0x5a3e68); g.px(bx + 5, by - 5, 0xff4a4a); }
  }
  // elevated expressway with tiny cars
  g.rect(0, 128, W, 4, 0x6a5470); g.hl(0, W, 128, 0xb88a8a); g.hl(0, W, 131, 0x3a2a44); g.rect(0, 126, W, 2, 0x7a6480);
  for (let px0 = 14; px0 < W; px0 += 46) { g.rect(px0, 132, 4, 10, 0x5a4460); g.vl(px0 + 3, 132, 141, 0x3a2a44); }
  for (const [cx, c] of [[30, 0xfff0a0], [90, 0xff6a5a], [150, 0xfff0a0], [196, 0x8ad0ff], [262, 0xff6a5a]]) { g.rect(cx, 124, 7, 3, c); g.px(cx + 1, 123, c); g.px(cx + 5, 123, c); g.px(cx, 125, 0xffffff); }
  // sidewalk with tiny trees + street lamps
  g.rect(0, 140, W, 7, 0xa8909a); g.hl(0, W, 140, 0xd8b8b0); g.hl(0, W, 146, 0x5a4a5a); for (let x2 = 0; x2 < W; x2 += 8) g.vl(x2, 141, 145, 0x948090);
  for (let tx2 = 8; tx2 < W; tx2 += 26) {
    g.vl(tx2 + 2, 136, 141, 0x5a3a3a);
    g.sprite(['.ggg.', 'gGggg', 'gggGg', '.ggg.'], { g: dk(green, 0.3), G: lt(green, 0.25) }, tx2, 131);
  }
  for (const lx of [40, 132, 224, 300]) { g.vl(lx, 128, 141, 0x3a3044); g.hl(lx, lx + 3, 128, 0x3a3044); g.px(lx + 3, 129, 0xfffbe0); g.px(lx + 2, 129, 0xffd890); g.px(lx + 3, 130, 0xffb45a); }

  // street (floor band)
  for (let y = 147; y < 200; y++) for (let x2 = 0; x2 < W; x2++) {
    let c = tone(x2, y, 0.2 + (y - 147) / 53 * 0.6, [0x6a5a78, 0x5a4c6a, 0x4a3e5c], 0.5);
    if ((x2 * 7 + y * 13) % 29 === 0) c = 0x7a6a88;
    g.px(x2, y, c);
  }
  // sunset reflection on the asphalt
  for (let y = 149; y < 196; y += 2) {
    const w2 = Math.round(14 - (y - 149) * 0.12 + ((y * 7) % 5));
    const off = ((y * 13) % 7) - 3;
    for (let i = -w2; i <= w2; i++) if (Math.abs(i) < w2 - 2 || bay(sx + i, y) < 0.5) g.px(sx + i + off, y, mix(g.get(sx + i + off, y), 0xffb45a, Math.abs(i) < w2 / 2 ? 0.5 : 0.3));
  }
  // lane markings: centre dashes + crosswalk
  for (let x2 = 0; x2 < W; x2 += 24) { if (x2 > 104 && x2 < 216) continue; g.rect(x2, 165, 13, 2, 0xf4ecdc); g.hl(x2, x2 + 12, 167, 0x8a7a88); }
  for (let k = 0; k < 9; k++) {
    const x0 = 106 + k * 12;
    for (let y = 150; y < 196; y++) {
      const sk = Math.round((y - 150) * ((x0 - 160) / 160));
      for (let i = 0; i < 7; i++) g.px(x0 + i + sk, y, y === 150 ? 0xe8dce4 : (y + i) % 9 === 0 ? 0xb4a4b8 : 0xcfc0d0);
    }
  }
  g.hl(0, W, 147, 0x3a3044); g.hl(0, W, 148, 0x7a6a88);
  // curbside drains
  for (const dx of [60, 270]) { g.rect(dx, 148, 10, 2, 0x2e2638); for (let i = 0; i < 10; i += 2) g.px(dx + i, 148, 0x7a6a88); }
  // tiny cars at the edges
  const car = (cx, cy, col, flip) => {
    const rows = [
      '....kkkkkkk.....',
      '...kwwwkwwwk....',
      '..kwWwwkwWwwk...',
      'kkccccccccccckkk',
      'kcCCCCCCCCCCCCck',
      'kycccccccccccc' + 'rk',
      'kcccccccccccccck',
      '.kkook.kk.kookk.',
      '...kk......kk...',
    ];
    g.sprite(flip ? rows.map((r) => [...r].reverse().join('')) : rows, { k: 0x2a1e2e, w: 0x9ad0f0, W: 0xe0f4ff, c: col, C: lt(col, 0.35), y: 0xfff6c0, r: 0xff4a3a, o: 0x6a6070 }, cx, cy);
    for (let i = 0; i < 16; i++) if (bay(cx + i, cy + 9) < 0.7) g.px(cx + i, cy + 9, 0x3a3048);
  };
  car(4, 170, 0xe84a3a, false); car(20, 184, orange, false); car(300, 172, 0x4a8ad8, true); car(282, 186, 0xfff0e0, true);
  // utility pole + power lines (right edge)
  {
    const px0 = 306;
    g.rect(px0, 20, 4, 128, 0x2e2436); g.vl(px0, 20, 147, 0x5a4a5a);
    g.rect(px0 - 10, 30, 22, 2, 0x2e2436); g.rect(px0 - 6, 40, 16, 2, 0x2e2436);
    for (const [y0, sag, xs] of [[30, 16, 150], [40, 14, 190]]) for (let x2 = xs; x2 < px0; x2++) { const t2 = (x2 - xs) / (px0 - xs); g.px(x2, Math.round(y0 + 30 - 30 * t2 + sag * Math.sin(t2 * Math.PI) * 0.3), 0x4a3058); }
    g.rect(px0 + 5, 46, 7, 10, 0x3e3446);
  }
}

// --- uchu: space-station observation deck ------------------------------------------------------
function uchu(g, s) {
  const W = g.w;
  const yellow = hex(s.card.accent), cyan = hex(s.card.accent2);
  const wx0 = 26, wx1 = 294, wy0 = 14, wy1 = 126;
  // station hull walls
  for (let y = 0; y < 146; y++) for (let x = 0; x < W; x++) {
    let c = tone(x, y, 0.3 + y / 300 + Math.abs(x - 160) / 600, [0x5e6a9a, 0x4e5888, 0x40497a, 0x343c68], 0.5);
    if (x % 40 === 0 || y % 36 === 0) c = 0x2a3058; else if (x % 40 === 1 || y % 36 === 1) c = 0x6e7aaa;
    if ((x % 40 === 4 || x % 40 === 36) && (y % 36 === 4 || y % 36 === 32)) c = 0x8a96c4;
    g.px(x, y, c);
  }
  // ceiling pipe + light strip
  g.rect(0, 0, W, 6, 0x2a3058); g.hl(0, W, 6, 0x6e7aaa);
  g.rect(0, 2, W, 2, 0x8a96c4); for (let x = 20; x < W; x += 50) { g.rect(x, 1, 4, 4, 0x2a3058); }
  // space view
  const M = new Mask(g.w, g.h);
  M.rect(wx0 + 6, wy0, wx1 - wx0 - 12, wy1 - wy0); M.rect(wx0, wy0 + 6, wx1 - wx0, wy1 - wy0 - 12);
  M.ell(wx0 + 6, wy0 + 6, 6, 6); M.ell(wx1 - 7, wy0 + 6, 6, 6); M.ell(wx0 + 6, wy1 - 7, 6, 6); M.ell(wx1 - 7, wy1 - 7, 6, 6);
  M.fill(g, (x, y) => tone(x, y, (y - wy0) / (wy1 - wy0), [0x080a20, 0x0e1230, 0x161a44, 0x1e2456], 0.6));
  // nebula: a soft diagonal band, dithered through three tones
  const nb = (x, y) => {
    const cy = 30 + x * 0.32 + 10 * Math.sin(x * 0.03);
    const d = (y - cy) / (16 + 8 * Math.sin(x * 0.05 + 1));
    const n = 0.5 + 0.18 * Math.sin(x * 0.11 + y * 0.07) + 0.14 * Math.sin(x * 0.05 - y * 0.13 + 2) + 0.08 * Math.sin(x * 0.23 - y * 0.19);
    return Math.exp(-d * d) * n;
  };
  M.each((x, y) => {
    const v = nb(x, y);
    if (v < 0.12) return;
    const t2 = v + (bay(x, y) - 0.5) * 0.22;
    const c = t2 > 0.74 ? 0x9ae4f4 : t2 > 0.62 ? 0x5a9ac8 : t2 > 0.46 ? 0x6e48a4 : t2 > 0.3 ? 0x3e2c78 : t2 > 0.18 ? 0x241d58 : null;
    if (c != null) g.px(x, y, c);
  });
  // stars
  const sr = rng(113);
  for (let i = 0; i < 110; i++) {
    const x = wx0 + Math.floor(sr() * (wx1 - wx0)), y = wy0 + Math.floor(sr() * (wy1 - wy0));
    if (M.has(x, y)) g.px(x, y, sr() < 0.4 ? 0xffffff : sr() < 0.5 ? 0xc8e8ff : 0xfff0c0);
  }
  for (const [x, y, b] of [[60, 30, 1], [140, 22, 0], [196, 52, 1], [100, 64, 0], [276, 96, 0], [170, 84, 0], [44, 90, 0]]) twinkle(g, x, y, 0xffffff, cyan, b);
  // little grey moon
  g.ell(58, 52, 6, 6, (x, y, nx, ny) => (nx + ny > 0.6 ? 0x6a6e88 : nx + ny > -0.2 ? 0xa8acc0 : 0xd8dce8));
  g.px(56, 50, 0x8a8ea4); g.px(60, 54, 0x8a8ea4);
  // ringed planet
  {
    const px0 = 236, py0 = 50, r = 17;
    const ringPx = (front) => {
      for (let a = 0; a < Math.PI * 2; a += 0.004) {
        const isFront = Math.sin(a) > 0;
        if (isFront !== front) continue;
        for (const [rr, c] of [[30, 0xe8c890], [28, 0xffe0a8], [26, 0xc8a070], [24, 0xf4d098]]) {
          const x = Math.round(px0 + Math.cos(a) * rr), y = Math.round(py0 + Math.sin(a) * rr * 0.28 - Math.cos(a) * 4);
          g.px(x, y, c);
        }
      }
    };
    ringPx(false);
    g.ell(px0, py0, r, r, (x, y, nx, ny) => {
      const band = Math.floor((ny + 1) * 6 + Math.sin(nx * 3) * 0.6) % 3;
      let c = [0xffd27a, 0xf0b060, 0xffe4a0][band];
      if (nx * 0.7 + ny * 0.7 > 0.45) c = dk(c, 0.35, 0x2a1e48);
      else if (nx * 0.7 + ny * 0.7 > 0.15 && bay(x, y) < 0.5) c = dk(c, 0.35, 0x2a1e48);
      if (nx * 0.7 + ny * 0.7 < -0.75) c = lt(c, 0.4);
      return c;
    });
    ringPx(true);
  }
  // earth curve at the bottom of the window with atmosphere glow
  {
    const ex = 150, ey = 330, er = 222;
    M.each((x, y) => {
      const d = Math.hypot(x - ex, y - ey);
      if (d > er + 8) return;
      if (d > er) { if (bay(x, y) < (er + 8 - d) / 9) g.px(x, y, d > er + 4 ? 0x3a6ab8 : cyan); return; }
      const ang = Math.atan2(y - ey, x - ex), u = ang * 22, v = d * 0.1;
      let c = tone(x, y, (er - d) / 24, [0x5ab4f0, 0x3a8ad8, 0x2a64b0], 0.5);
      const land = Math.sin(u * 1.3 + v * 0.8) + Math.sin(u * 0.7 - v * 1.6 + 2) > 1.05;
      if (land) c = (er - d) < 3 ? 0x9ad08a : 0x5aa060;
      const cloudy = Math.sin(u * 2.6 + v * 6 + 1) + Math.sin(u * 1.1 - v * 3.2) > 1.25;
      if (cloudy) c = bay(x, y) < 0.7 ? 0xffffff : 0xd8ecff;
      if (d > er - 1.5) c = 0xbfeaff;
      // night side to the right
      if (x > 230 && bay(x, y) < (x - 230) / 70) c = dk(c, 0.55, 0x0e1230);
      g.px(x, y, c);
    });
    // city lights on the night side
    for (let i = 0; i < 12; i++) { const x = 250 + Math.floor(sr() * 40), y = wy1 - 2 - Math.floor(sr() * 12); if (M.has(x, y) && Math.hypot(x - ex, y - ey) < er - 2) g.px(x, y, 0xffd890); }
  }
  // tiny shuttle passing
  g.sprite(['....kk....', '..kkwwk...', 'kkwwwwwkkb', 'kwwwwwwwwc', 'kkwwwwwkkb', '..kkk.....'], { k: 0x6a7090, w: 0xe8ecf8, b: cyan, c: 0xffffff }, 104, 40);
  g.hl(96, 103, 42, 0x4a5aa0); g.hl(92, 103, 43, 0x3a4888);
  // window frame (thick, bevelled) + bolts
  M.outline(g, 0x8a96c4, 0x8a96c4);
  const F = new Mask(g.w, g.h);
  for (let k = 1; k <= 6; k++) {
    for (let y = M.y0 - 6; y <= M.y1 + 6; y++) for (let x = M.x0 - 6; x <= M.x1 + 6; x++) {
      if (M.has(x, y) || F.has(x, y)) continue;
      let near = false;
      for (let dy = -k; dy <= k && !near; dy++) for (let dx = -k; dx <= k; dx++) if (M.has(x + dx, y + dy)) { near = true; break; }
      if (near) F.set(x, y);
    }
  }
  F.fill(g, (x, y) => {
    const lit = !F.has(x - 1, y - 1) && !M.has(x - 1, y - 1);
    const dark = !F.has(x + 1, y + 1) && !M.has(x + 1, y + 1);
    if (lit) return 0xc8d0ec;
    if (dark) return 0x1e2244;
    const inner = M.has(x + 1, y + 1) || M.has(x + 2, y + 2);
    return inner ? 0x5e6898 : 0x8a94c0;
  });
  for (const [x, y] of [[wx0 - 3, 40], [wx0 - 3, 100], [wx1 + 2, 40], [wx1 + 2, 100], [100, wy0 - 3], [220, wy0 - 3], [100, wy1 + 2], [220, wy1 + 2]]) { g.px(x, y, 0xe8ecff); g.px(x + 1, y + 1, 0x2a3058); }
  // hazard stripe sill
  for (let x = wx0 - 6; x < wx1 + 6; x++) for (let y = wy1 + 8; y < wy1 + 13; y++) g.px(x, y, Math.floor((x + y) / 4) % 2 ? yellow : 0x22263e);
  g.hl(wx0 - 6, wx1 + 5, wy1 + 7, 0x1e2244); g.hl(wx0 - 6, wx1 + 5, wy1 + 13, 0x1e2244);
  // side consoles
  for (const [x0, side] of [[2, 1], [W - 22, -1]]) {
    g.rect(x0, 40, 20, 80, 0x2a3058); g.frame(x0, 40, 20, 80, 0x1a1e3a); g.vl(side > 0 ? x0 + 19 : x0, 41, 118, 0x6e7aaa);
    g.rect(x0 + 3, 44, 14, 18, 0x0e2430); g.frame(x0 + 3, 44, 14, 18, 0x4a5888);
    for (let i = 0; i < 12; i++) g.px(x0 + 4 + i, 56 - Math.round(4 * Math.abs(Math.sin(i * 0.8 + x0))), cyan);
    g.hl(x0 + 4, x0 + 15, 58, 0x3a8a8a);
    for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) { const c = [0xff5a5a, yellow, 0x6ae08a, cyan][(k + j + x0) % 4]; g.rect(x0 + 4 + j * 7, 68 + k * 7, 4, 3, c); g.hl(x0 + 4 + j * 7, x0 + 7 + j * 7, 68 + k * 7, lt(c, 0.5)); }
    g.light(x0 + 10, 53, 14, 14, cyan, 0.2, 0.8);
  }
  // paw-print station emblem + deck sign
  {
    const ex = 160, ey = 136;
    g.rect(ex - 30, ey - 5, 60, 10, 0x22263e); g.frame(ex - 30, ey - 5, 60, 10, 0x6e7aaa);
    g.tiny('DECK 3', ex - 3, ey - 2, cyan, { align: 'center' });
    g.sprite(['.y.y.', 'y...y', '.yyy.', '.yyy.'], { y: yellow }, ex + 18, ey - 3);
  }

  // metal deck (floor band)
  const fy = 146, vpx = 160, vpy = 40;
  for (let y = fy; y < 200; y++) for (let x = 0; x < W; x++) {
    const u = (x - vpx) / ((y - vpy) / (200 - vpy));
    const rowK = Math.log((y - vpy) / (fy - vpy)) / Math.log(1.22);
    const seamV = ((Math.round(u) % 40) + 40) % 40 === 0;
    const seamH = Math.abs(y - Math.round(vpy + (fy - vpy) * Math.pow(1.22, Math.round(rowK)))) < 0.5;
    const plate = Math.floor(u / 40) + Math.floor(rowK);
    let c = tone(x, y, 0.2 + (y - fy) / 54 * 0.5 + (plate % 2 ? 0.08 : 0), [0x8a94b8, 0x7682a8, 0x626e96, 0x525c84], 0.5);
    // diamond tread
    if (((x + y * 2) % 6 === 0 && y % 3 === 0) || ((x - y * 2) % 6 === 3 && y % 3 === 1)) c = lt(c, 0.18);
    if (seamV || seamH) c = 0x2e3458;
    g.px(x, y, c);
  }
  g.hl(0, W, fy, 0x1e2244); g.hl(0, W, fy + 1, 0xa8b0d8);
  // rivets beside each plate seam crossing
  for (let k = 0; k < 6; k++) {
    const y = Math.round(vpy + (fy - vpy) * Math.pow(1.22, k)) + 2;
    if (y < fy + 2 || y > 192) continue;
    const sc = (y - vpy) / (200 - vpy);
    for (let u = -200; u <= 200; u += 40) for (const du of [-4, 4]) {
      const x = Math.round(vpx + (u + du) * sc);
      g.px(x, y, 0xc8d0ec); g.px(x, y + 1, 0x343c64);
    }
  }
  // glowing guide strips
  for (const y of [151, 189]) { for (let x = 0; x < W; x++) g.px(x, y, (x >> 2) % 3 === 0 ? 0x2a3058 : cyan); g.hl(0, W, y + 1, 0x5a6aa0); g.light(160, y, 200, 3, cyan, 0.2, 0.8); }
  // window light on the deck
  g.light(160, 170, 120, 16, 0xa8c8ff, 0.18, 0.8);
  // hazard edge at the very front
  for (let x = 0; x < W; x++) for (let y = 195; y < 200; y++) g.px(x, y, Math.floor((x - y) / 5) % 2 ? yellow : 0x22263e);
  g.hl(0, W, 194, 0x1e2244);
}

// --- omamori: spring shrine in golden light ----------------------------------------------------
function omamori(g, s) {
  const W = g.w;
  const red = hex(s.card.accent), gold = hex(s.card.accent2), ink = hex(s.card.text);
  // golden spring sky
  g.vgrad(0, 0, W, 130, [0x9fd2ee, 0xc4e2ee, 0xe8eedc, 0xfff0c8, 0xffe2a4], 0.55);
  // sun glow + rays from the upper right
  g.light(250, 10, 110, 70, 0xfffbe0, 0.4, 1.1);
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (0.55 + k * 0.09);
    for (let r = 20; r < 150; r++) {
      const x = Math.round(250 + Math.cos(a) * r), y = Math.round(10 + Math.sin(a) * r);
      for (let w = -2; w <= 2; w++) if (bay(x + w, y) < 0.35 * (1 - r / 150)) g.px(x + w, y, mix(g.get(x + w, y), 0xfffbe8, 0.4));
    }
  }
  const cpal = [0xffffff, 0xfffaf0, 0xf4e6d4, 0xe8d0c0];
  cloud(g, 150, 30, [[-18, 2, 7], [-6, -2, 10], [8, -4, 11], [22, 1, 8], [0, 4, 8]], cpal);
  cloud(g, 60, 58, [[-8, 1, 5], [1, -2, 7], [10, 1, 5]], cpal);
  // distant hills
  ridge(g, 0, W, (x) => 112 + 6 * Math.sin(x * 0.03 + 0.5), 140, (x, y, d) => (d === 0 ? 0xc8dcb0 : tone(x, y, d / 20, [0xb4cfa0, 0x9cc08c])));
  // shrine grove behind the hall
  foliage(g, [[110, 104, 18, 0.1], [140, 92, 20, 0.05], [176, 88, 22, 0], [210, 94, 20, 0.05], [236, 104, 16, 0.1]], [0x9ac878, 0x6aa85a, 0x4a8a4a, 0x346a3c], 0x24502e);

  // shrine hall (haiden)
  const hx = 172;
  {
    const ver = red, verL = lt(red, 0.3), verD = dk(red, 0.35);
    // body
    g.rect(hx - 58, 92, 116, 46, 0xfaf2e2);
    for (const px0 of [hx - 58, hx - 30, hx + 26, hx + 54]) { g.rect(px0, 92, 5, 46, ver); g.vl(px0, 92, 137, verL); g.vl(px0 + 4, 92, 137, verD); }
    // lattice doors
    for (const [dx0, dx1] of [[hx - 53, hx - 30], [hx + 31, hx + 54]]) {
      g.rect(dx0, 98, dx1 - dx0, 36, 0x9a6a3a);
      for (let x = dx0 + 2; x < dx1; x += 3) g.vl(x, 98, 133, 0x6a4424);
      for (let y = 100; y < 134; y += 3) g.hl(dx0, dx1 - 1, y, 0x6a4424);
    }
    g.rect(hx - 25, 98, 51, 36, 0x3a2418); g.light(hx, 118, 26, 16, 0xffd890, 0.3, 0.8);
    g.rect(hx - 60, 92, 120, 4, ver); g.hl(hx - 60, hx + 59, 92, verL); g.hl(hx - 60, hx + 59, 95, verD);
    // offering box
    g.rect(hx - 14, 126, 28, 12, 0x7a4a28); g.hl(hx - 14, hx + 13, 126, 0xb07a48); for (let x = hx - 12; x < hx + 13; x += 3) g.vl(x, 128, 131, 0x4a2a18);
    g.text('奉納', hx, 126, { size: 8, color: gold, align: 'center' });
    // bell + rope
    g.ell(hx, 102, 4, 4, (x, y, nx, ny) => (nx + ny < -0.4 ? 0xfff0a0 : nx + ny < 0.5 ? gold : dk(gold, 0.35)));
    g.hl(hx - 1, hx + 1, 105, 0x5a3a18);
    for (let y = 106; y < 126; y++) { g.px(hx, y, (y >> 1) % 2 ? red : 0xffffff); g.px(hx + 1, y, (y >> 1) % 2 ? 0xffffff : red); }
    // steps
    for (let k = 0; k < 3; k++) { const y = 138 + k * 3; g.rect(hx - 30 - k * 6, y, 60 + k * 12, 3, 0xd8d0c4); g.hl(hx - 30 - k * 6, hx + 29 + k * 6, y, 0xf4ece0); g.hl(hx - 30 - k * 6, hx + 29 + k * 6, y + 2, 0x9a9080); }
    // roof: verdigris copper, sweeping eaves
    const R = new Mask(g.w, g.h);
    for (let x = hx - 74; x <= hx + 74; x++) {
      const u = Math.abs(x - hx) / 74;
      const eave = 90 - Math.round(Math.pow(Math.max(0, u - 0.6) / 0.4, 2) * 7);
      const top = u < 0.42 ? 56 : 56 + Math.round((u - 0.42) / 0.58 * 30 + Math.pow((u - 0.42) / 0.58, 2) * -4);
      for (let y = top; y <= eave; y++) R.set(x, y);
    }
    R.fill(g, (x, y) => {
      const u = (x - hx) / 74;
      let c = tone(x, y, 0.3 + (y - 56) / 40 * 0.5 + (u > 0 ? 0.15 : 0), [0x8acab4, 0x5aa894, 0x3e8a7a, 0x2e6a60], 0.5);
      const col = (x - hx + 200) % 4;
      if (col === 0) c = dk(c, 0.22); else if (col === 1 && y % 2) c = lt(c, 0.18);
      if (y > 86) c = 0x6aaa94;
      if (y >= 88) c = 0x2e5a50;
      return c;
    });
    R.outline(g, 0x1e3e38, 0xb8e8d4);
    g.hl(hx - 74, hx + 74, 91, 0x2a1e18);
    // ridge + gold ornaments + gable
    g.rect(hx - 32, 52, 64, 4, 0x2e4a44); g.hl(hx - 32, hx + 31, 52, 0x6a9a8a);
    for (const ox of [hx - 34, hx + 32]) g.sprite(['.gg.', 'gGgg', 'gggd', '.dd.'], { g: gold, G: 0xfff0a0, d: dk(gold, 0.35) }, ox - 1, 49);
    g.poly([[hx - 12, 74], [hx + 12, 74], [hx, 60]], 0xfaf2e2); g.line(hx - 12, 74, hx, 60, gold); g.line(hx + 12, 74, hx, 60, gold); g.hl(hx - 12, hx + 12, 74, gold);
    g.ell(hx, 69, 2, 2, gold);
    // shimenawa rope with shide
    for (let x = hx - 56; x <= hx + 56; x++) {
      const u = (x - hx) / 56, y = Math.round(97 + 4 * (1 - u * u));
      const tw = (x + 200) % 4;
      g.px(x, y - 1, 0x8a6a2a); g.px(x, y, tw < 2 ? 0xf0d890 : 0xc8a85a); g.px(x, y + 1, tw < 2 ? 0xc8a85a : 0xa8883a); g.px(x, y + 2, 0x6a5020);
    }
    for (const sx of [hx - 40, hx - 14, hx + 14, hx + 40]) {
      const sy = Math.round(99 + 4 * (1 - ((sx - hx) / 56) ** 2)) + 2;
      g.sprite(['ww..', 'wwww', '..ww', 'wwww', 'ww..', 'wwww', '..ww'], { w: 0xffffff }, sx - 2, sy);
      g.vl(sx - 3, sy, sy + 6, 0xd8d0c4);
    }
  }
  // torii (left, partly framed)
  {
    const tl = 8, tr = 84, top = 30;
    const ver = red, verL = lt(red, 0.3), verD = dk(red, 0.35), blk = 0x2a1418;
    for (const px0 of [tl + 6, tr - 14]) {
      g.rect(px0, top + 12, 8, 120, ver); g.vl(px0, top + 12, top + 131, verL); g.vl(px0 + 1, top + 12, top + 131, lt(red, 0.15)); g.vl(px0 + 7, top + 12, top + 131, verD);
      g.rect(px0 - 1, top + 120, 10, 12, blk); g.vl(px0, top + 120, top + 131, 0x5a3a3a);
    }
    for (let x = tl - 10; x <= tr + 10; x++) {
      const e = Math.max(0, Math.abs(x - (tl + tr) / 2) - 34) / 6;
      const y0 = Math.round(top - e * e * 0.8);
      g.px(x, y0, blk); g.px(x, y0 + 1, blk); g.px(x, y0 + 2, 0x4a2a2a); g.px(x, y0 + 3, verL); g.px(x, y0 + 4, ver); g.px(x, y0 + 5, ver); g.px(x, y0 + 6, verD);
    }
    g.rect(tl - 2, top + 18, tr - tl + 4, 5, ver); g.hl(tl - 2, tr + 1, top + 18, verL); g.hl(tl - 2, tr + 1, top + 22, verD);
    // plaque (gakuzuka)
    g.rect((tl + tr) / 2 - 8, top + 5, 16, 15, blk); g.rect((tl + tr) / 2 - 6, top + 6, 12, 13, gold); g.hl((tl + tr) / 2 - 6, (tl + tr) / 2 + 5, top + 6, 0xfff0a0);
    g.text('神', (tl + tr) / 2, top + 7, { size: 12, color: blk, align: 'center' });
  }
  // ema rack (right)
  {
    const x0 = 254, x1 = 318, y0 = 106;
    g.rect(x0 - 4, y0 - 6, x1 - x0 + 8, 4, 0x6a4a30); g.hl(x0 - 4, x1 + 3, y0 - 6, 0x9a7048);
    g.poly([[x0 - 6, y0 - 6], [x1 + 6, y0 - 6], [x1 - 4, y0 - 12], [x0 + 4, y0 - 12]], 0x5a4a3a);
    g.hl(x0 + 4, x1 - 5, y0 - 12, 0x8a7a6a);
    for (const px0 of [x0, x1 - 3]) { g.rect(px0, y0 - 2, 3, 48, 0x7a5434); g.vl(px0, y0 - 2, y0 + 45, 0xa87a50); }
    for (const ry of [y0 + 2, y0 + 20]) {
      g.hl(x0, x1, ry, 0x5a3a24);
      for (let ex = x0 + 3, i = 0; ex < x1 - 8; ex += 9, i++) {
        const ey = ry + 2 + (i % 2);
        g.sprite([
          '...kk...',
          '..kwwk..',
          '.kwwwwk.',
          'kwwwwwwk',
          'kwwrrwwk',
          'kwwwwwdk',
          'kwwwwwdk',
          'kkkkkkkk',
        ], { k: 0x6a4424, w: 0xf0d8a4, r: i % 3 === 0 ? red : i % 3 === 1 ? ink : 0x3a8a5a, d: 0xd8b880 }, ex, ey);
        g.px(ex + 3, ey + 6, ink); g.px(ex + 4, ey + 6, ink);
      }
    }
  }
  // stone lanterns flanking the hall
  const stone = [0xe8e0d0, 0xc8c0b0, 0xa09888, 0x6a6058];
  toro(g, 100, 146, 0.9, 0xffd890, stone); toro(g, 244, 146, 0.9, 0xffd890, stone);

  // ground: raked gravel + stone path (floor band)
  for (let y = 140; y < 200; y++) for (let x = 0; x < W; x++) {
    let c = tone(x, y, 0.2 + (y - 140) / 60 * 0.5, [0xfcf0d4, 0xf2e0bc, 0xe4cfa6], 0.5);
    const ry = y + Math.round(1.5 * Math.sin(x * 0.06));
    if (ry % 5 === 0 && (x + y) % 4 !== 0) c = mix(c, 0xc8b490, 0.45); else if (ry % 5 === 1 && x % 3 === 0) c = 0xfffaf0; // raked lines
    g.px(x, y, c);
  }
  // stone path slabs in perspective toward the steps
  const pl = (y) => hx - 26 - (y - 147) * 1.6, prr = (y) => hx + 26 + (y - 147) * 1.6;
  const rowsY = [147, 153, 160, 168, 177, 187, 198];
  for (let k = 0; k < rowsY.length - 1; k++) {
    const y0 = rowsY[k], y1 = rowsY[k + 1];
    const n = 2 + (k % 2);
    for (let i = 0; i < n; i++) {
      const xa = (y) => pl(y) + (prr(y) - pl(y)) * (i / n), xb = (y) => pl(y) + (prr(y) - pl(y)) * ((i + 1) / n);
      for (let y = y0; y < y1; y++) for (let x = Math.round(xa(y)); x < Math.round(xb(y)); x++) {
        let c = tone(x, y, ((i * 7 + k * 3) % 4) / 5 + (y - y0) / (y1 - y0) * 0.3, [0xd4ccbc, 0xc6bcaa, 0xb8ae9a], 0.6);
        if (y === y0) c = 0xf4ecde; else if (x === Math.round(xa(y))) c = 0xe6decf;
        if (y === y1 - 1 || x === Math.round(xb(y)) - 1) c = 0x7a7060;
        g.px(x, y, c);
      }
    }
  }
  // rounded edging stones along both sides of the path
  for (let y = 148; y < 200; y += 0) {
    const sz = 2 + (y - 146) / 14;
    for (const x of [pl(y) - sz * 1.2, prr(y) + sz * 0.2]) {
      const S = new Mask(g.w, g.h).ell(Math.round(x + sz / 2), Math.round(y), sz, sz * 0.55);
      S.fill(g, (xx, yy) => (yy < y - sz * 0.15 ? 0xd8d0c0 : 0xb0a694)); S.outline(g, 0x7a7060, 0xf4ecde);
    }
    y += Math.max(3, Math.round(sz * 1.2));
  }
  // omikuji rack between the torii pillars: fortunes tied on cords
  {
    const x0 = 26, x1 = 66, y0 = 126;
    for (const px0 of [x0, x1]) { g.rect(px0, y0, 2, 22, 0x7a5434); g.vl(px0, y0, y0 + 21, 0xa87a50); }
    for (const cy of [y0 + 3, y0 + 11]) {
      g.hl(x0, x1 + 1, cy, 0x8a6a4a);
      for (let x = x0 + 3; x < x1 - 1; x += 3) { g.rect(x, cy + 1, 2, 4, 0xffffff); g.px(x + 1, cy + 4, 0xe0dcd4); g.px(x, cy, 0xffffff); }
    }
    for (let i = 0; i < 40; i++) if (bay(x0 + i, y0 + 22) < 0.6) g.px(x0 + i, y0 + 22, 0xc8b898);
  }
  // golden light + tree shadow dapples on the ground
  g.light(180, 168, 120, 22, 0xfff0b0, 0.25, 1);
  for (const [x, y, rx, ry] of [[30, 186, 22, 5], [64, 194, 18, 4], [290, 188, 24, 5], [256, 196, 14, 3]]) {
    for (let yy = y - ry; yy <= y + ry; yy++) for (let xx = x - rx; xx <= x + rx; xx++) if (((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2 < 1 && bay(xx, yy) < 0.5) g.px(xx, yy, mix(g.get(xx, yy), 0x8a7a8a, 0.25));
  }
  for (let i = 0; i < 18; i++) { const r2 = rng(200 + i); const x = Math.floor(r2() * W), y = 150 + Math.floor(r2() * 48); g.px(x, y, 0xffb8cc); g.px(x + 1, y, 0xf59fbd); }

  // sakura branches framing the top corners + falling petals
  const sakura = [0xfff3f7, 0xffdbe7, 0xffc0d4, 0xf59fbd, 0xd97b9f];
  const br = new Mask(g.w, g.h).stroke([[W + 4, 6, 3], [270, 16, 2], [236, 12, 1]]);
  br.fill(g, () => 0x6a3e3a); br.outline(g, 0x3e2228);
  foliage(g, [[316, 4, 16, -0.05], [292, 14, 13, 0], [266, 20, 11, 0.05], [240, 14, 9, 0.05], [306, 26, 12, 0.1]], sakura, 0xb85a82, { amp: 0.16, freq: 8 });
  foliage(g, [[96, 0, 10, 0], [116, 6, 8, 0.05]], sakura, 0xb85a82, { amp: 0.16, freq: 8 });
  const pr = rng(131);
  for (const [cx, cy, r] of [[316, 4, 16], [292, 14, 13], [266, 20, 11], [306, 26, 12], [96, 0, 10]]) for (let i = 0; i < r * 0.6; i++) {
    const a = pr() * Math.PI * 2, d = pr() * r * 0.8;
    const bx = Math.round(cx + Math.cos(a) * d), by = Math.round(cy + Math.sin(a) * d);
    if (Math.cos(a) + Math.sin(a) < 0) { g.px(bx, by, 0xfff8fb); g.px(bx + 1, by, 0xffe4ee); } else { g.px(bx, by, 0xe58aab); }
  }
  for (let i = 0; i < 34; i++) petal(g, Math.floor(pr() * W), Math.floor(pr() * 196), i % 4, 0xffc4d6, 0xf59fbd);
}

// =============================================================================================
// palette reduction: keeps each scene on a limited, cohesive palette
// =============================================================================================
/**
 * Conservative palette cleanup: colours are ranked by pixel count; a colour joins the palette only
 * if it is used on at least `minCount` pixels and is not a near-duplicate of an already chosen
 * colour. Everything else (stray blends from light pools, reflections, anti-aliased glyph edges)
 * snaps to its nearest palette entry. Distinct hues are never collapsed, so every deliberately
 * painted colour survives exactly while the palette loses its accidental in-betweens.
 */
function reducePalette(g, minCount = 12, near = 300) {
  const hist = new Map();
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); hist.set(c, (hist.get(c) || 0) + 1); }
  const cols = [...hist.entries()].map(([c, k]) => ({ c, k, r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255 })).sort((a, b) => b.k - a.k);
  const dist = (a, q) => 2 * (a.r - q.r) ** 2 + 4 * (a.g - q.g) ** 2 + 3 * (a.b - q.b) ** 2;
  const pal = [];
  for (const e of cols) if (e.k >= minCount && !pal.some((q) => dist(e, q) < near)) pal.push(e);
  if (!pal.length) return;
  const map = new Map();
  for (const e of cols) {
    let bd = Infinity, bc = e.c;
    for (const q of pal) { const d = dist(e, q); if (d < bd) { bd = d; bc = q.c; } }
    map.set(e.c, bc);
  }
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y), m = map.get(c); if (m !== c) g.px(x, y, m); }
}

// =============================================================================================
// exports
// =============================================================================================
const wrap = (fn, seed) => (p, x, y, w, h, s) => {
  const g = new G(p, x, y, w, h, seed);
  g.rect(0, 0, g.w, g.h, hex(s.card.bg)); // opaque base (scenes cover it fully)
  fn(g, s);
  reducePalette(g);
  p.dirty = true;
};

export const SCENES = {
  mochi: wrap(mochi, 11),
  shokudo: wrap(shokudo, 12),
  kasa: wrap(kasa, 13),
  showa: wrap(showa, 14),
  konbini: wrap(konbini, 15),
  heya: wrap(heya, 16),
  yokai: wrap(yokai, 17),
  onsen: wrap(onsen, 18),
  dajare: wrap(dajare, 19),
  kaiju: wrap(kaiju, 20),
  uchu: wrap(uchu, 21),
  omamori: wrap(omamori, 22),
};

export const BANNER_TEXT = {
  mochi: { catch: 'ぷにっと春のおさんぽ日和！', sub: 'さくら公園でひとやすみ' },
  shokudo: { catch: '本物そっくり！ミニチュア食堂', sub: 'いらっしゃい、毎度！' },
  kasa: { catch: '雨の日だってウキウキ気分！', sub: 'あじさい通り商店街' },
  showa: { catch: 'なつかしの昭和家電が大集合！', sub: '夕焼けのお茶の間で' },
  konbini: { catch: 'いつでも開いてるあの場所！', sub: '24時間ずっと営業中' },
  heya: { catch: 'てのひらサイズのマイルーム', sub: '六畳一間のしあわせ' },
  yokai: { catch: 'ゆるっと妖怪、参上ですぞ！', sub: '月夜の参道でまってるよ' },
  onsen: { catch: 'いい湯だな～♨どうぶつ温泉', sub: '雪見の露天風呂' },
  dajare: { catch: 'ダジャレで笑いの渦を巻け！', sub: '本日の高座は満員御礼' },
  kaiju: { catch: '怪獣だっておやつが大好き！', sub: '夕焼け街のおやつどき' },
  uchu: { catch: 'にゃんと宇宙へ出発進行！', sub: 'ねこステーション到着' },
  omamori: { catch: 'ご利益たっぷり開運祈願！', sub: '春の神社でおまいり' },
};

/** Every glyph the scenes draw with p.text in DotGothic16 (preload with document.fonts.load). */
export const SCENE_TEXT = 'ラーメンカレー定食餃子おでんかつ丼ビール大衆食堂傘かさだがし本日休業喫茶あめ本と文具つめた～い新発売いらっしゃいませ特価ゆダジャレ奉納神';
