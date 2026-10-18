// Hand-pixelled banner background scenes (台紙 daishi) for series 17-19: densha, umi, obake_yashiki.
// Same contract as bannerScenes.js: each scene paints an opaque 320x200 illustration into (x, y, w, h).
//   y 0-70    title zone      -> calm backdrop, framing objects only at the sides
//   y 150-195 figure feet     -> a readable floor plane
// Helpers below are copied from bannerScenes.js so this module stays self-contained.
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
  E: ['111', '100', '110', '100', '111'], G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'], K: ['101', '101', '110', '101', '101'],
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

/** Small four-point sparkle. */
function twinkle(g, x, y, c, c2, big = false) {
  g.px(x, y, c); g.px(x - 1, y, c2); g.px(x + 1, y, c2); g.px(x, y - 1, c2); g.px(x, y + 1, c2);
  if (big) { g.px(x - 2, y, c2); g.px(x + 2, y, c2); g.px(x, y - 2, c2); g.px(x, y + 2, c2); }
}

// --- densha: sunny station platform, bullet train passing Mt Fuji ------------------------------
function densha(g, s) {
  const W = g.w;
  const blue = hex(s.card.accent), green = hex(s.card.accent2);
  const ink = 0x1e2430;
  // sky + soft sun
  g.vgrad(0, 0, W, 120, [0x58aee8, 0x74c0f0, 0x96d0f2, 0xbde2f6, 0xe2f2f6], 0.55);
  g.light(262, 18, 80, 40, 0xfffbe6, 0.25, 0.8);
  const cpal = [0xffffff, 0xf2f7fc, 0xd8e6f4, 0xbcd0e8];
  cloud(g, 54, 40, [[-16, 3, 8], [-5, -2, 11], [8, -5, 13], [21, 0, 10], [32, 5, 6], [2, 5, 9]], cpal);
  cloud(g, 288, 30, [[-12, 2, 7], [-2, -3, 10], [10, 0, 8], [19, 4, 5]], cpal);
  for (const [x, y, w] of [[118, 62, 30], [196, 54, 40]]) { g.hl(x, x + w, y, 0xffffff); g.hl(x + 4, x + w - 5, y - 1, 0xf4f8fc); g.hl(x + 2, x + w - 2, y + 1, 0xd8e6f4); }
  bird(g, 222, 40, 0x4a6a90, true); bird(g, 234, 46, 0x4a6a90);

  // Mt Fuji far right
  const fx = 248, fpk = 66;
  ridge(g, 150, W, (x) => {
    const d = Math.abs(x - fx);
    return d < 6 ? fpk + d * 0.2 : fpk + 1.2 + (d - 6) * 0.5 + Math.max(0, d - 34) * 0.22;
  }, 112, (x, y, d) => {
    const snow = y < fpk + 13 + Math.round(2 * Math.sin(x * 0.7)) + ((x & 3) === 0 ? 2 : 0);
    if (d === 0) return snow ? 0xffffff : 0xbccae0;
    if (snow) return x < fx ? 0xf6f9fc : 0xd6e0ee;
    return tone(x, y, (y - fpk) / 46, x < fx ? [0xa6badc, 0x94aad0] : [0x92a6cc, 0x8498c2], 0.5);
  });
  // pale far skyline
  const fr = rng(171);
  for (let x = 0; x < W;) {
    const w = 7 + Math.floor(fr() * 12), h = 6 + Math.floor(fr() * 16);
    const top = 112 - h;
    g.rect(x, top, w, h, 0xb2c6dc);
    g.vl(x + w - 1, top, 111, 0x9eb4ce); g.hl(x, x + w - 1, top, 0xcadaea);
    for (let wy = top + 2; wy < 110; wy += 3) for (let wx = x + 2; wx < x + w - 2; wx += 2) if (fr() < 0.3) g.px(wx, wy, 0xd6e4f0);
    if (fr() < 0.25) g.vl(x + 2, top - 4, top - 1, 0x9eb4ce);
    x += w + (fr() < 0.3 ? 1 : 0);
  }
  // viaduct with a bullet train heading left
  g.rect(0, 100, W, 4, 0xdfe4ea); g.hl(0, W, 100, 0xf6f8fa); g.hl(0, W, 103, 0xa8b2c0); g.hl(0, W - 1, 104, 0x8c98aa);
  for (let px0 = 8; px0 < W; px0 += 36) { g.rect(px0, 105, 5, 7, 0xc8d0da); g.vl(px0 + 4, 105, 111, 0xa0aabb); }
  for (let px0 = 6; px0 < W; px0 += 20) g.vl(px0, 89, 99, 0x98a4b8);
  g.hl(0, W, 90, 0x8a98ae);
  {
    const nx = 176, tx1 = 304;
    for (let x = nx; x <= tx1; x++) {
      const i = x - nx;
      const top = i < 16 ? 93 + Math.round(4.4 * Math.pow(1 - i / 16, 1.6)) : 93;
      for (let y = top; y <= 99; y++) {
        let c = y === top ? 0xffffff : 0xf4f6f8;
        if (y === 98) c = blue;
        if (y === 99) c = 0xc8d0dc;
        if (y === 95 && i > 18 && x % 3 === 0) c = 0x4a5a78;
        if (i >= 5 && i <= 9 && y === top + 1) c = 0x2a3a58;
        if (i > 16 && (x - nx) % 26 === 0 && y < 98) c = 0xb8c2d0;
        g.px(x, y, c);
      }
      g.px(x, top - 1, 0x7d8eaa);
    }
    g.px(nx - 1, 98, 0x7d8eaa); g.px(nx - 1, 99, 0x7d8eaa);
    g.px(nx + 1, 97, 0xfff4c0); // headlight
  }

  // opposite platform
  g.rect(0, 112, W, 14, 0xc6c1b6);
  g.hl(0, W, 112, 0xf2eee6); g.hl(0, W, 113, 0xe2ddd2);
  g.rect(0, 115, W, 2, 0xf2c83a);
  for (let x = 1; x < W; x += 3) g.px(x, 115, 0xffe27a);
  g.hl(0, W, 118, 0xa8a296);
  g.rect(0, 119, W, 7, 0x7e786e);
  g.hl(0, W, 119, 0x9a9488);
  for (let x = 12; x < W; x += 24) g.vl(x, 120, 125, 0x6a645c);
  // canopy over the left half of the opposite platform
  {
    const r0 = 74, x1 = 112;
    g.rect(0, r0, x1, 3, 0x7a8c88); g.hl(0, x1 - 1, r0, 0x9eb0aa);
    g.rect(0, r0 + 3, x1 - 2, 3, 0x4e5e5c);
    for (let x = 0; x < x1 - 2; x++) if ((x >> 1) % 2 === 0) g.px(x, r0 + 6, 0x3e4a4a);
    g.px(x1 - 1, r0 + 3, 0x4e5e5c);
    for (const px0 of [18, 60, 102]) { g.rect(px0, r0 + 6, 3, 106 - r0 + 6, 0x5a6a6a); g.vl(px0, r0 + 6, 111, 0x7e908e); g.vl(px0 + 2, r0 + 6, 111, 0x3e4a4a); }
    for (const lx of [28, 70]) { g.rect(lx, r0 + 6, 18, 2, 0xf4fbff); g.hl(lx, lx + 17, r0 + 8, 0xc4d4dc); g.light(lx + 9, r0 + 14, 22, 10, 0xffffff, 0.12, 0.8); }
    // little platform-number board under the canopy
    g.rect(32, r0 + 14, 26, 9, 0x2a3e6a); g.frame(32, r0 + 14, 26, 9, 0x1a2848);
    g.hl(33, 56, r0 + 15, 0x3e5688);
    g.tiny('2', 36, r0 + 16, 0xffffff);
    g.sprite(['..w..', '.ww..', 'wwwww', '.ww..', '..w..'], { w: 0xffffff }, 47, r0 + 16);
    g.vl(36, r0 + 8, r0 + 13, 0x3e4a4a); g.vl(53, r0 + 8, r0 + 13, 0x3e4a4a);
  }
  // overhead wire + masts
  for (const mx of [128, 226, 300]) { g.rect(mx, 70, 2, 42, 0x7a8696); g.vl(mx, 70, 111, 0x9aa6b6); g.hl(mx - 6, mx + 3, 72, 0x6a7686); }
  for (let x = 0; x < W; x++) g.px(x, 73 + Math.round(1.5 * Math.sin(((x - 128) / 98) * Math.PI) ** 2), 0x5a6676);

  // station name board (ekimeihyo)
  {
    const bx0 = 116, bx1 = 204, by0 = 80, by1 = 110;
    for (const px0 of [128, 190]) { g.rect(px0, by1, 3, 6, 0x3a4048); g.vl(px0, by1, by1 + 5, 0x5a6270); }
    g.rect(bx0, by0, bx1 - bx0, by1 - by0, 0xfafafa);
    g.frame(bx0 - 1, by0 - 1, bx1 - bx0 + 2, by1 - by0 + 2, 0x4a5262);
    g.hl(bx0, bx1 - 1, by0, 0xffffff); g.hl(bx0, bx1 - 1, by1 - 1, 0xd8dce4);
    g.text('がちゃ', 160, by0 + 1, { size: 16, color: ink, align: 'center' });
    g.tiny('GACHA', 160, by0 + 18, 0x4a5262, { align: 'center' });
    g.rect(bx0, by0 + 24, bx1 - bx0, 5, blue);
    g.hl(bx0, bx1 - 1, by0 + 24, lt(blue, 0.3));
    g.sprite(['..w', '.ww', 'www', '.ww', '..w'].map((r) => r), { w: 0xffffff }, bx0 + 2, by0 + 24);
    g.tiny('KOIN', bx0 + 7, by0 + 24, 0xffffff);
    g.sprite(['w..', 'ww.', 'www', 'ww.', 'w..'], { w: 0xffffff }, bx1 - 5, by0 + 24);
    g.tiny('PON', bx1 - 7, by0 + 24, 0xffffff, { align: 'right' });
    g.rect(bx0, by0 + 22, bx1 - bx0, 1, green);
  }

  // track bed
  for (let y = 126; y < 146; y++) for (let x = 0; x < W; x++) {
    let c = tone(x, y, (y - 126) / 20, [0x857c74, 0x766d66], 0.5);
    if ((x * 3 + y * 5) % 7 === 0) c = 0xa0968c; else if ((x * 5 + y * 3) % 11 === 0) c = 0x5e5652;
    g.px(x, y, c);
  }
  for (let x = 2; x < W; x += 12) {
    g.rect(x, 128, 6, 15, 0x7a5a40);
    g.vl(x, 128, 142, 0x9a7656); g.vl(x + 5, 128, 142, 0x4e3a2a); g.hl(x, x + 5, 142, 0x4e3a2a);
  }
  for (const [ry, hi] of [[130, 0xd8dde4], [138, 0xf0f2f6]]) {
    g.hl(0, W, ry, hi); g.hl(0, W, ry + 1, 0x9aa0aa); g.hl(0, W, ry + 2, 0x4a4e58);
    for (let x = 4; x < W; x += 12) { g.px(x, ry + 2, 0x3a3e46); g.px(x + 1, ry + 2, 0x3a3e46); }
  }
  g.rect(0, 143, W, 3, 0x3e3836);

  // our platform (floor band)
  g.rect(0, 146, W, 4, 0xe8e4dc); g.hl(0, W, 146, 0xffffff); g.hl(0, W, 149, 0xa8a49c);
  for (let y = 150; y < 200; y++) for (let x = 0; x < W; x++) {
    let c = tone(x, y, (y - 150) / 50, [0xdcd6cc, 0xd0cabe, 0xc6c0b4], 0.5);
    if (y === 168 || y === 186) c = 0xb0aaa0;
    else if (y === 169 || y === 187) c = 0xe6e2da;
    else if (y > 157 && ((x + (y > 168 ? 16 : 0) + (y > 186 ? 8 : 0)) % 32) === 0) c = 0xb6b0a6;
    g.px(x, y, c);
  }
  g.rect(0, 151, W, 6, 0xf6cc34);
  g.hl(0, W, 151, 0xffe27a); g.hl(0, W, 156, 0xc8a01e);
  for (let x = 1; x < W; x += 3) for (const y of [152, 154]) { g.px(x, y, 0xffeea0); g.px(x + 1, y + 1, 0xd4a820); }
  g.light(210, 176, 150, 26, 0xfff4d0, 0.18, 1);
  // painted boarding-position marks on the platform
  for (const mx of [68, 252]) {
    g.rect(mx - 9, 161, 19, 5, lt(blue, 0.1)); g.hl(mx - 9, mx + 9, 161, lt(blue, 0.4)); g.hl(mx - 9, mx + 9, 165, dk(blue, 0.3));
    g.sprite(['w.....w', 'ww...ww', '.ww.ww.'], { w: 0xffffff }, mx - 3, 162);
  }
  for (const mx of [160]) { g.rect(mx - 12, 160, 25, 6, lt(green, 0.05)); g.hl(mx - 12, mx + 12, 160, lt(green, 0.4)); g.hl(mx - 12, mx + 12, 165, dk(green, 0.3)); g.tiny('10', mx, 161, 0xffffff, { align: 'center' }); }

  // foreground pillars with a station clock (left) and platform number (right)
  const pillar = (x0, w) => {
    g.rect(x0, 0, w, 200, 0x3c6aa8);
    g.vl(x0, 0, 199, 0x6a94cc); g.vl(x0 + 1, 0, 199, 0x5482be); g.vl(x0 + w - 1, 0, 199, 0x24467a);
    g.rect(x0, 150, w, 3, 0x2a3a58);
    g.rect(x0, 128, w, 4, green); g.hl(x0, x0 + w - 1, 128, lt(green, 0.3));
  };
  pillar(0, 9); pillar(W - 9, 9);
  {
    const cx = 26, cy = 66;
    g.rect(8, cy - 1, cx - 16, 2, 0x2a3a58);
    g.ell(cx, cy, 10, 10, 0x2a3a58);
    g.ell(cx, cy, 8, 8, (x, y, nx, ny) => (nx + ny < -0.9 ? 0xffffff : 0xf4f2ec));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.px(Math.round(cx + Math.cos(a) * 6.5), Math.round(cy + Math.sin(a) * 6.5), k % 3 === 0 ? ink : 0x9aa0aa); }
    g.line(cx, cy, cx - 3, cy - 3, ink); g.line(cx, cy, cx + 4, cy - 5, ink); g.px(cx, cy, 0xe5383b);
  }
  {
    const cx = W - 22, cy = 72;
    g.rect(W - 13, cy - 1, 6, 2, 0x2a3a58);
    g.ell(cx, cy, 8, 8, 0x1a2848);
    g.ell(cx, cy, 7, 7, (x, y, nx, ny) => (nx + ny < -0.8 ? lt(green, 0.25) : green));
    g.tiny('1', cx - 1, cy - 3, 0xffffff, { scale: 1 });
    g.vl(cx, cy + 3, cy + 3, 0xffffff);
  }
}

// --- umi: big aquarium tank with coral, kelp and a whale-shark silhouette ----------------------
function umi(g, s) {
  const W = g.w;
  const coral = hex(s.card.accent2);
  // water: bright near the surface, deep blue lower down
  g.vgrad(0, 0, W, 152, [0xa4e8f4, 0x78d4ee, 0x50bae2, 0x369cd4, 0x287ec2, 0x2064aa], 0.6);
  // shimmering surface line
  for (let x = 0; x < W; x++) {
    const y = Math.round(3 + 1.4 * Math.sin(x * 0.12) + Math.sin(x * 0.31));
    g.px(x, y, 0xf0fcff); g.px(x, y + 1, 0xc8f2fc);
    if (x % 9 < 4) g.px(x, y + 3, 0xbaeefa);
    for (let yy = 0; yy < y; yy++) g.px(x, yy, 0xd4f6fc);
  }
  // caustic net near the top
  for (let y = 8; y < 48; y++) for (let x = 0; x < W; x++) {
    const v = Math.sin(x * 0.19 + Math.sin(y * 0.27) * 2.2) * Math.sin(y * 0.23 + Math.sin(x * 0.13) * 2.2);
    if (v > 0.86 - (y - 8) * 0.002 && bay(x, y) < 1 - (y - 8) / 44) g.px(x, y, mix(g.get(x, y), 0xffffff, 0.35));
  }
  // god rays
  for (const [x, w, dx] of [[30, 16, 26], [112, 12, 18], [196, 20, 30], [270, 12, 16]]) g.beam(x, x + w, 0, x + dx - w, x + dx + w * 1.6, 150, 0xe0fcff, 0.2, 0.8);

  // far whale-shark silhouette with its spots
  {
    const M = new Mask(g.w, g.h);
    M.ell(238, 92, 40, 9);
    M.poly([[196, 90], [176, 74], [182, 92], [176, 104], [200, 96]]);
    M.poly([[232, 84], [244, 70], [250, 84]]);
    M.poly([[246, 100], [262, 110], [256, 98]]);
    const sil = (x, y) => mix(g.get(x, y), 0x16407e, 0.38);
    const cols = new Map();
    M.each((x, y) => cols.set(y * W + x, sil(x, y)));
    M.each((x, y) => g.px(x, y, cols.get(y * W + x)));
    M.each((x, y) => { if (x > 208 && x < 272 && y < 96 && (x % 5 === 0) && (y % 4 === (x % 10 === 0 ? 0 : 2))) g.px(x, y, mix(g.get(x, y), 0x9adcf4, 0.45)); });
    for (let x = 268; x < 278; x++) g.px(x, 95, mix(g.get(x, 95), 0x0e2e60, 0.4));
  }
  // manta gliding on the left
  {
    const M = new Mask(g.w, g.h);
    M.poly([[60, 74], [40, 82], [24, 92], [44, 90], [58, 96], [66, 96], [80, 90], [100, 92], [84, 82]]);
    M.poly([[60, 96], [64, 96], [63, 112], [62, 112]]);
    M.each((x, y) => g.px(x, y, mix(g.get(x, y), 0x164a88, 0.42)));
    g.hl(46, 78, 84, mix(g.get(60, 84), 0x5ab0e0, 0.4));
  }
  // sardine school swirling in a silvery ribbon
  {
    const r = rng(31);
    for (let i = 0; i < 220; i++) {
      const t = i / 220, a = t * Math.PI * 2.4 + 0.6;
      const rad = 30 + Math.sin(t * 9) * 3, w = (r() - 0.5) * 9;
      const x = Math.round(140 + Math.cos(a) * (rad + w) * 1.5), y = Math.round(86 + Math.sin(a) * (rad + w) * 0.42);
      const dir = Math.sin(a) > 0 ? -1 : 1;
      g.px(x, y, 0x24528e); g.px(x + dir, y, 0x36689e); g.px(x - dir, y, 0x24528e);
      if (i % 4 === 0) g.px(x + dir, y - 1, 0xd8f6ff);
    }
  }
  // reef rocks on both sides
  const rockPal = [0x8a7aa8, 0x6e6094, 0x544a7a, 0x3e365e];
  const rocks = (blobs) => {
    const M = new Mask(g.w, g.h);
    for (const [cx, cy, r, ph] of blobs) M.blob(cx, cy, r, 0.12, 5, ph);
    M.fill(g, (x, y) => {
      let t = 0.2;
      for (const [cx, cy, r] of blobs) { const d = Math.hypot(x - cx, y - cy); if (d < r + 1) t = Math.max(t, 0.25 + ((y - cy) + (x - cx) * 0.4) / (r * 1.6)); }
      return tone(x, y, Math.min(1, t), rockPal, 0.5);
    });
    M.outline(g, 0x2a2446, 0xa898c4);
    return M;
  };
  rocks([[16, 140, 26, 0], [52, 146, 20, 1], [84, 152, 14, 2], [0, 118, 18, 3]]);
  rocks([[306, 136, 28, 1], [268, 148, 20, 2], [240, 154, 12, 0], [320, 112, 20, 2]]);
  // branch corals, brain coral, sea fan, anemone with clownfish
  const branch = (x, y, h, c, cl) => {
    g.line(x, y, x, y - h, c); g.line(x, y - h * 0.4, x - 4, y - h * 0.8, c); g.line(x, y - h * 0.5, x + 5, y - h, c); g.line(x - 4, y - h * 0.8, x - 6, y - h, c);
    for (const [px0, py0] of [[x, y - h], [x - 6, y - h], [x + 5, y - h]]) { g.px(px0, py0, cl); g.px(px0, py0 - 1, cl); }
    g.line(x + 1, y, x + 1, y - h + 1, dk(c, 0.25));
  };
  branch(30, 128, 18, 0xff7aa8, 0xffc4dc); branch(64, 136, 14, coral, 0xffd0b4); branch(286, 124, 20, 0xff7aa8, 0xffc4dc);
  {
    const M = new Mask(g.w, g.h).ell(48, 128, 9, 6);
    M.fill(g, (x, y) => (((x + y * 2) % 5 === 0 || (x * 2 - y) % 6 === 0) ? 0xd88a3a : y < 125 ? 0xffc06a : 0xf2a24a));
    M.outline(g, 0x8a4a2a, 0xffd890);
  }
  // purple sea fan (lace) on the right
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.2;
    const x1 = 258 + Math.cos(a) * 30, y1 = 136 + Math.sin(a) * 30;
    g.line(258, 136, x1, y1, 0xb06ad0);
    for (let k = 6; k < 30; k += 5) g.px(Math.round(258 + Math.cos(a) * k + 1), Math.round(136 + Math.sin(a) * k), 0xd8a0f0);
  }
  for (let k = 12; k < 30; k += 6) for (let i = -4; i < 4; i++) { const a = -Math.PI / 2 + (i + 0.5) * 0.2; g.px(Math.round(258 + Math.cos(a) * k), Math.round(136 + Math.sin(a) * k), 0x9a58bc); }
  {
    // anemone + clownfish
    const ax = 92, ay = 140;
    for (let i = -6; i <= 6; i++) { const sway = Math.round(Math.sin(i * 0.9) * 2); g.line(ax + i, ay, ax + i + sway, ay - 9 + Math.abs(i) * 0.6, i % 2 ? 0xc8f080 : 0xa8e060); g.px(ax + i + sway, ay - 9 + Math.round(Math.abs(i) * 0.6), 0xf0ffc0); }
    g.rect(ax - 6, ay, 13, 3, 0xd86a9a); g.hl(ax - 6, ax + 6, ay, 0xf08ab8);
    g.sprite(['..oo...', '.owoo.o', 'oowoowo', '.owoo.o', '..oo...'], { o: 0xff8a2a, w: 0xffffff }, ax + 6, ay - 16);
    g.px(ax + 7, ay - 14, 0x1a1a2a);
  }
  // swaying kelp framing the edges
  const kelp = (x0, h, ph, flip) => {
    for (let y = 150; y > 150 - h; y--) {
      const k = (150 - y) / h;
      const x = Math.round(x0 + Math.sin(y * 0.08 + ph) * 3 * k);
      g.px(x, y, 0x4a8a3e); g.px(x + 1, y, 0x5aa04a); g.px(x + 2, y, 0x3a6e32);
      if (y % 9 === 0) { const d = flip ? -1 : 1; for (let i = 1; i < 6; i++) g.px(x + 1 + d * i, y - Math.round(i * 0.6), i < 4 ? 0x6ab85a : 0x8ad070); }
    }
  };
  kelp(6, 118, 0, false); kelp(16, 92, 1.4, false); kelp(300, 120, 2.1, true); kelp(310, 84, 0.7, true);

  // sandy floor (floor band) with ripples, light dapples, shells and a starfish
  for (let y = 146; y < 200; y++) for (let x = 0; x < W; x++) {
    let c = tone(x, y, (y - 146) / 54, [0xf6eac8, 0xeedcae, 0xe2cc98], 0.5);
    const ry = y + Math.round(2 * Math.sin(x * 0.07 + y * 0.2));
    if (ry % 7 === 0) c = 0xd2b884; else if (ry % 7 === 1) c = 0xfff4d8;
    g.px(x, y, c);
  }
  for (let y = 146; y < 150; y++) for (let x = 0; x < W; x++) if (bay(x, y) < (150 - y) / 5) g.px(x, y, mix(g.get(x, y), 0x3a8ac8, 0.4));
  for (let y = 150; y < 198; y++) for (let x = 0; x < W; x++) {
    const v = Math.sin(x * 0.16 + Math.sin(y * 0.4) * 2) * Math.sin(y * 0.33 + Math.sin(x * 0.11) * 2);
    if (v > 0.8 && bay(x, y) < 0.6) g.px(x, y, mix(g.get(x, y), 0xffffff, 0.4));
  }
  g.sprite(['...o...', '...o...', 'ooooooo', '.ooOoo.', '..ooo..', '.oo.oo.', 'oo...oo'], { o: 0xff8a4a, O: 0xffc08a }, 14, 186);
  g.sprite(['.pPp.', 'pPpPp', 'pPpPp', '.ppp.', '..p..'], { p: 0xff9ab8, P: 0xffd4e0 }, 302, 182);
  g.sprite(['.ww.', 'wWWw', '.ww.'], { w: 0xe0d8c8, W: 0xffffff }, 160, 194);
  for (const [x, y] of [[58, 192], [120, 186], [214, 190], [262, 196], [196, 172]]) { g.px(x, y, 0x9a8e7e); g.px(x + 1, y, 0xb8ac9a); }
  // garden eels peeking from the sand on the right
  for (const [x, h, c] of [[244, 12, 0xf4f0e2], [252, 16, 0xff9a3a], [260, 10, 0xf4f0e2]]) {
    g.rect(x - 2, 152, 6, 2, 0xb89a6a);
    for (let y = 152; y > 152 - h; y--) { const xx = x + Math.round(Math.sin((152 - y) * 0.25) * 1.5); g.px(xx, y, c); g.px(xx + 1, y, dk(c, 0.15)); if (c !== 0xff9a3a && (y % 4 === 0)) g.px(xx, y, 0x2a2a3a); if (c === 0xff9a3a && y % 4 === 0) g.px(xx, y, 0xffffff); }
    const hx = x + Math.round(Math.sin(h * 0.25) * 1.5);
    g.px(hx + 2, 152 - h + 1, c); g.px(hx + 1, 152 - h + 1, 0x1a1a2a);
  }
  // bubbles
  for (const [bx, by0] of [[40, 108], [292, 100], [176, 60]]) {
    for (let i = 0; i < 6; i++) {
      const y = by0 - i * 15, x = bx + Math.round(Math.sin(i * 1.3) * 3), r = 1 + (i % 3);
      if (r === 1) { g.px(x, y, 0xe8fbff); g.px(x + 1, y, 0xc8f2fc); } else { g.ring(x, y, r, r, 0xd8f8ff); g.px(x - 1, y - 1, 0xffffff); }
    }
  }
  // tank frame on the edges
  for (const x0 of [0, W - 5]) {
    g.rect(x0, 0, 5, 200, 0x1a2a4a);
    g.vl(x0 + (x0 ? 0 : 4), 0, 199, 0x3e5a88);
    for (let y = 10; y < 200; y += 30) g.px(x0 + 2, y, 0x8aa0c8);
  }
}

// --- obake_yashiki: haunted-house corridor with peeking shoji eyes ------------------------------
function obake_yashiki(g, s) {
  const W = g.w;
  const lime = hex(s.card.accent), pinkA = hex(s.card.accent2);
  const VX = 160, VY = 110;
  const bwL = 96, bwR = 224, bwT = 70, bwB = 138;
  const ceilY = (x) => VY - Math.abs(x - VX) * ((VY - bwT) / (VX - bwL)); // wall top edge
  const floorY = (x) => VY + Math.abs(x - VX) * ((bwB - VY) / (VX - bwL)); // wall bottom edge

  // ceiling: dark planks converging on the back wall
  for (let y = 0; y < bwT + 1; y++) for (let x = 0; x < W; x++) {
    if (y > ceilY(x)) continue;
    const u = (x - VX) / Math.max(1, VY - y);
    let c = tone(x, y, y / 70, [0x1c1428, 0x261c36, 0x2e2240], 0.5);
    if (Math.abs((u * 6 + 50) % 1) < 0.12) c = 0x140e1e;
    g.px(x, y, c);
  }
  for (const by of [16, 44]) { // cross beams
    const xl = VX - (VY - by) * ((VX - bwL) / (VY - bwT)), xr = 2 * VX - xl;
    const th = by < 30 ? 6 : 3;
    g.rect(Math.round(xl), by, Math.round(xr - xl), th, 0x3a2a34);
    g.hl(Math.round(xl), Math.round(xr), by, 0x5a4048); g.hl(Math.round(xl), Math.round(xr), by + th - 1, 0x1a1220);
  }

  // back wall + round window (moon, bamboo)
  for (let y = bwT; y <= bwB; y++) for (let x = bwL; x <= bwR; x++) {
    let c = tone(x, y, (y - bwT) / (bwB - bwT), [0x3e3250, 0x342a46], 0.5);
    if (((x * 7 + y * 3) % 23 === 0)) c = 0x2c2440;
    g.px(x, y, c);
  }
  g.rect(bwL, bwB - 10, bwR - bwL + 1, 11, 0x2a1e26); g.hl(bwL, bwR, bwB - 10, 0x4a3438);
  {
    const cx = VX, cy = 100, r = 24;
    const M = new Mask(g.w, g.h).ell(cx, cy, r, r);
    M.fill(g, (x, y) => tone(x, y, (y - cy + r) / (2 * r), [0x2a2452, 0x3a2e66, 0x52407a], 0.5));
    // moon
    g.ell(cx + 8, cy - 8, 9, 9, (x, y, nx, ny) => (nx + ny < -0.6 ? 0xf6ffd8 : nx + ny < 0.5 ? 0xe2f4b0 : 0xc6dc94));
    g.light(cx + 8, cy - 8, 20, 20, 0xd8f0a0, 0.25, 0.8);
    for (const [mx, my] of [[cx + 5, cy - 9], [cx + 10, cy - 4], [cx + 11, cy - 12]]) g.px(mx, my, 0xb8cc88);
    // bamboo silhouettes
    for (const [bx, lean] of [[cx - 14, 0.1], [cx - 6, -0.05], [cx + 18, 0.08]]) {
      for (let y = cy - r; y <= cy + r; y++) {
        const x = Math.round(bx + (y - cy) * lean);
        if (!M.has(x, y)) continue;
        g.px(x, y, 0x16122a); g.px(x + 1, y, 0x16122a);
        if ((y - cy + 40) % 9 === 0) { g.px(x - 1, y, 0x16122a); g.px(x + 2, y, 0x16122a); }
      }
    }
    for (const [lx, ly, d] of [[cx - 14, cy - 12, -1], [cx - 6, cy - 2, 1], [cx + 18, cy + 6, -1]]) for (let i = 1; i < 7; i++) { if (M.has(lx + d * i, ly + Math.round(i * 0.4))) g.px(lx + d * i, ly + Math.round(i * 0.4), 0x16122a); }
    M.each((x, y) => { if (!M.has(x - 1, y) || !M.has(x + 1, y) || !M.has(x, y - 1) || !M.has(x, y + 1)) g.px(x, y, 0x1a1220); });
    new Mask(g.w, g.h).ell(cx, cy, r + 1, r + 1).outline(g, 0x5a4048, 0x6a5058);
  }

  // side walls: perspective shoji panels glowing a sickly lime, with eyes peeking through holes
  const paper = [0xdce8b0, 0xc8d89a, 0xb4c688];
  const wallSide = (side) => {
    const xs = [0, 34, 60, 78, 90, bwL]; // panel boundaries (converging)
    const X = (x) => (side < 0 ? x : W - 1 - x);
    for (let x = 0; x < bwL; x++) {
      const top = ceilY(x), bot = floorY(x), h = bot - top;
      const koshi = bot - h * 0.2;
      for (let y = Math.max(0, Math.ceil(top)); y <= Math.min(199, Math.floor(bot)); y++) {
        let c;
        if (y > koshi) c = (y - koshi) < 1.2 ? 0x5a4038 : tone(x, y, (y - koshi) / (h * 0.2), [0x4a3430, 0x3a2824], 0.5);
        else {
          const f = (y - top) / (koshi - top);
          c = tone(x, y, 0.15 + f * 0.6 + (bwL - x) / 400, paper, 0.5);
          if (Math.abs((f * 6) % 1) < 0.5 / Math.max(1, h / 60) * 1.4 && f > 0.02) c = 0x6a5440; // horizontal kumiko
        }
        g.px(X(x), y, c);
      }
    }
    // vertical kumiko + heavy frames
    for (let k = 0; k < xs.length - 1; k++) {
      const a = xs[k], b = xs[k + 1];
      for (let j = 1; j < 3; j++) {
        const x = Math.round(a + (b - a) * (j / 3));
        for (let y = Math.ceil(ceilY(x)); y < floorY(x) - (floorY(x) - ceilY(x)) * 0.2; y++) g.px(X(x), y, 0x6a5440);
      }
    }
    for (const x of xs) {
      for (let y = Math.max(0, Math.ceil(ceilY(x))); y <= Math.floor(floorY(x)); y++) {
        g.px(X(x), y, 0x2e2026);
        if (x < bwL - 2) { g.px(X(x + 1), y, 0x4a3438); if (x < 70) g.px(X(x + 2), y, 0x3a2a30); }
      }
    }
    // rails top and bottom
    for (let x = 0; x <= bwL; x++) { g.px(X(x), Math.round(ceilY(x)), 0x2e2026); g.px(X(x), Math.round(ceilY(x)) + 1, 0x4a3438); g.px(X(x), Math.round(floorY(x)), 0x1a1220); }
  };
  wallSide(-1); wallSide(1);
  // torn holes with eyes (mokumokuren)
  const eye = (x, y, big, look) => {
    g.ell(x, y, big ? 4 : 3, big ? 3 : 2, 0x140e1e);
    g.ell(x, y, big ? 3 : 2, big ? 2 : 1, 0xf6f2e4);
    g.px(x + look, y, 0x1a1220); g.px(x + look, y - (big ? 1 : 0), 0x1a1220);
    if (big) { g.px(x + look + 1, y, 0x1a1220); g.px(x + look + 1, y - 1, 0x1a1220); }
    g.px(x + look - 1, y - 1, 0xffffff);
    g.px(x - (big ? 4 : 3), y + 1, 0xa8b07a); g.px(x + (big ? 4 : 3), y - 1, 0xa8b07a);
  };
  eye(17, 92, true, 1); eye(46, 110, false, 1); eye(70, 86, false, 1); eye(84, 120, false, 0);
  eye(W - 18, 104, true, -1); eye(W - 47, 84, false, -1); eye(W - 71, 112, false, -1);
  // plain torn holes
  for (const [x, y] of [[26, 136], [62, 72], [W - 30, 70], [W - 62, 128]]) {
    g.sprite(['.kk.', 'kkkk', '.kkk', '..k.'], { k: 0x140e1e }, x, y);
    g.px(x - 1, y + 1, 0xf2f6d0); g.px(x + 4, y + 2, 0xf2f6d0);
  }

  // floor: old planks converging to the back wall (floor band)
  for (let y = bwB; y < 200; y++) for (let x = 0; x < W; x++) {
    if (y < floorY(x)) continue;
    const u = (x - VX) / (y - VY + 0.01);
    const b = Math.floor(u * 5 + 100);
    let c = tone(x, y, (y - bwB) / (200 - bwB), b % 2 ? [0x4e3a40, 0x6a5050, 0x7e6260] : [0x46343a, 0x604848, 0x745a58], 0.5);
    const fu = (u * 5 + 100) % 1;
    if (fu < 0.06 * (y - VY) / 50) c = 0x2e2026;
    else if (fu < 0.12 * (y - VY) / 50) c = lt(c, 0.12);
    if ((Math.floor((y - VY) * 0.18 + b * 0.37) % 7 === 0) && (y % 2 === 0) && fu > 0.3 && fu < 0.7) c = dk(c, 0.2); // plank ends
    g.px(x, y, c);
  }
  // low drifting mist along the far floor
  for (let y = 134; y < 168; y++) for (let x = 0; x < W; x++) {
    const v = 0.5 + 0.5 * Math.sin(x * 0.05 + Math.sin(y * 0.3) * 1.5);
    const t = (1 - Math.abs(y - 148) / 20) * v * 0.55;
    if (bay(x, y) < t) g.px(x, y, mix(g.get(x, y), 0xb8a8d8, 0.35));
  }
  // hitodama floating with lime/cyan glow
  const wisp = (x, y, c, r = 3) => {
    g.light(x, y + 6, 34, 18, c, 0.22, 1);
    g.ell(x, y, r, r, (xx, yy, nx, ny) => (nx * nx + ny * ny < 0.25 ? 0xffffff : lt(c, 0.4)));
    for (let i = 1; i < 7; i++) { g.px(x + Math.round(Math.sin(i * 0.8) * 2) + i * 0, y - r - i + 1, i < 4 ? lt(c, 0.3) : c); }
    g.px(x - 1, y, 0x1a1220); g.px(x + 1, y, 0x1a1220);
  };
  wisp(104, 124, 0x8ff0ff, 3); wisp(222, 116, lime, 3); wisp(146, 142, 0x8ff0ff, 2);

  // hanging konnyaku on a string (left) and a chochin-obake from the ceiling (right)
  g.vl(44, 0, 50, 0xc8c8d0);
  {
    const kx = 39, ky = 50;
    g.rect(kx, ky, 11, 13, 0x8a8494); g.frame(kx - 1, ky - 1, 13, 15, 0x2a2232);
    g.hl(kx, kx + 10, ky, 0xb4aebc); g.vl(kx, ky, ky + 12, 0xa49eac); g.vl(kx + 10, ky + 1, ky + 12, 0x6a6474);
    for (const [x, y] of [[2, 3], [6, 2], [8, 6], [3, 8], [6, 10], [9, 10]]) g.px(kx + x, ky + y, 0x5a5464);
    g.px(kx + 5, ky + 14, 0x9fe3ff); g.px(kx + 5, ky + 16, 0x9fe3ff);
  }
  g.vl(282, 0, 22, 0x2a2232);
  {
    const cx = 282, cy = 42;
    g.rect(cx - 5, 22, 11, 3, 0x241818); g.hl(cx - 5, cx + 5, 22, 0x4a3030);
    g.light(cx, cy + 8, 40, 30, 0xffb060, 0.25, 1);
    const M = new Mask(g.w, g.h).ell(cx, cy, 13, 17);
    M.fill(g, (x, y, m) => {
      const ny = (y - cy) / 17, nx = (x - cx) / 13;
      if (((y - cy + 40) % 4) === 0) return 0xa86a3a;
      return tone(x, y, 0.2 + nx * 0.35 + ny * 0.25, [0xfff0c4, 0xf6d898, 0xe0b070, 0xc08a50], 0.5);
    });
    M.outline(g, 0x3a2420);
    g.rect(cx - 5, cy + 17, 11, 3, 0x241818);
    // big eye, small eye, torn grin with tongue
    g.ell(cx - 5, cy - 5, 4, 4, 0xffffff); g.ell(cx - 4, cy - 4, 2, 2, 0x1a1220); g.px(cx - 5, cy - 6, 0xffffff);
    g.rect(cx + 4, cy - 5, 3, 3, 0x1a1220); g.px(cx + 4, cy - 5, 0xffffff);
    g.sprite(['kkkkkkkkkk', 'kooooooook', '.kooooook.', '..kkkkkk..'], { k: 0x2a1418, o: 0xff8a3a }, cx - 6, cy + 3);
    for (let x = cx - 5; x <= cx + 3; x += 2) g.px(x, cy + 3, 0xffffff);
    g.rect(cx - 1, cy + 6, 4, 9, pinkA); g.vl(cx + 2, cy + 6, cy + 14, dk(pinkA, 0.25)); g.hl(cx - 1, cx + 2, cy + 15, dk(pinkA, 0.25));
    g.vl(cx, cy + 7, cy + 12, lt(pinkA, 0.3));
  }
  // cobwebs in the top corners
  const web = (cx, cy, dx, dy) => {
    for (let k = 0; k < 5; k++) { const a = (k / 4) * (Math.PI / 2); g.line(cx, cy, cx + Math.cos(a) * 30 * dx, cy + Math.sin(a) * 30 * dy, 0x8a80a0); }
    for (const r of [9, 17, 25]) for (let i = 0; i <= 24; i++) { const a = (i / 24) * (Math.PI / 2); const rr = r - Math.sin(i / 24 * Math.PI * 4) * 1.2; g.px(Math.round(cx + Math.cos(a) * rr * dx), Math.round(cy + Math.sin(a) * rr * dy), 0x7a7090); }
  };
  web(0, 0, 1, 1); web(W - 1, 0, -1, 1);
  // a little spider dangling on the left
  g.vl(18, 0, 30, 0x8a80a0);
  g.sprite(['k.k.k', '.kkk.', 'kkkkk', '.kkk.', 'k.k.k'], { k: 0x140e1e }, 16, 31);
  g.px(17, 33, 0xff6a8a); g.px(19, 33, 0xff6a8a);
}

// =============================================================================================
// palette reduction: keeps each scene on a limited, cohesive palette
// =============================================================================================
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
  densha: wrap(densha, 37),
  umi: wrap(umi, 38),
  obake_yashiki: wrap(obake_yashiki, 39),
};

export const BANNER_TEXT = {
  densha: { catch: 'ガタンゴトン、ちびでんしゃ発車！', sub: 'がちゃ駅 1番線' },
  umi: { catch: 'ゆらゆら～ぷかぷか水族館', sub: '大水槽の前でひとやすみ' },
  obake_yashiki: { catch: 'うらめしや～！…でもこわくないよ', sub: 'おばけ屋敷 ただいま営業中' },
};

/** Every glyph the scenes draw with p.text in DotGothic16 (preload with document.fonts.load). */
export const SCENE_TEXT = 'がちゃ';
