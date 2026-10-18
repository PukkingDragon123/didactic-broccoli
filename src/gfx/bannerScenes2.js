// Hand-pixelled banner scenes for the series added in the 13–16 batch (neko_cafe, wagashi, matsuri, sentai).
// Same contract as bannerScenes.js: each painter fills an opaque 320x200 scene into region (x, y, w, h)
//   y 0-70    title zone      -> calm backdrop, framing objects at the sides
//   y 150-195 figure feet     -> a readable floor plane
// Exports SCENES / BANNER_TEXT / SCENE_TEXT in the same shape, to be merged into the banner compositor.
// Helpers below are copied from bannerScenes.js (kept local so both files stay independent).
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

/** Four-point twinkle star. */
function twinkle(g, x, y, c, c2, big = false) {
  g.px(x, y, c); g.px(x - 1, y, c2); g.px(x + 1, y, c2); g.px(x, y - 1, c2); g.px(x, y + 1, c2);
  if (big) { g.px(x - 2, y, c2); g.px(x + 2, y, c2); g.px(x, y - 2, c2); g.px(x, y + 2, c2); }
}


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

// a few more 3x5 glyphs for signage
Object.assign(TINY, {
  B: ['110', '101', '110', '101', '110'], F: ['111', '100', '110', '100', '100'], G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'], U: ['101', '101', '101', '101', '111'], V: ['101', '101', '101', '101', '010'],
  Y: ['101', '101', '010', '010', '010'], W: ['1001', '1001', '1111', '1111', '1001'], X: ['101', '101', '010', '101', '101'],
  '!': ['1', '1', '1', '0', '1'], '-': ['000', '000', '111', '000', '000'], '.': ['0', '0', '0', '0', '1'],
});

// =============================================================================================
// SCENES
// =============================================================================================

// --- neko_cafe: sunny Showa kissaten -------------------------------------------------------------
function neko_cafe(g, s) {
  const W = g.w;
  const red = hex(s.card.accent);
  const w0 = 0x34201a, w1 = 0x4e2e20, w2 = 0x6e4028, w3 = 0x955c36, w4 = 0xbf8450, w5 = 0xdcaa72;
  const brass = [0xfff0a8, 0xe8c050, 0xb88a2a, 0x6e4a1a];

  // ---- wallpaper: warm cream with stripes and tiny florets, brighter where the sun lands
  g.vgrad(0, 0, W, 104, [0xf8ead0, 0xf2e0bc, 0xead2a8, 0xdcc094], 0.5);
  g.light(70, 70, 150, 70, 0xfff8e0, 0.35, 1.1);
  for (let x = 6; x < W; x += 18) for (let y = 8; y < 100; y++) {
    g.px(x, y, mix(g.get(x, y), 0xb08050, 0.22));
    g.px(x + 1, y, mix(g.get(x + 1, y), 0xffffff, 0.25));
  }
  for (let x = 15; x < W; x += 18) for (let y = 14 + ((x / 18) & 1) * 7; y < 98; y += 14) {
    const c = mix(g.get(x, y), red, 0.22), c2 = mix(g.get(x, y), 0x6a9a5a, 0.2);
    g.px(x, y - 1, c); g.px(x - 1, y, c); g.px(x + 1, y, c); g.px(x, y + 1, c); g.px(x, y + 2, c2);
  }
  // ceiling beam + picture rail
  g.rect(0, 0, W, 7, w1); g.hl(0, W, 6, w0); g.hl(0, W, 1, w2);
  for (let x = 20; x < W; x += 64) g.hl(x, x + 12, 3, w0);
  g.hl(0, W, 8, w3); g.hl(0, W, 9, w2); g.hl(0, W, 10, mix(0xe8d0a4, w2, 0.3));

  // ---- left window with a lace half-curtain, street outside in afternoon sun
  const wx0 = 12, wx1 = 98, wy0 = 22, wy1 = 98;
  g.rect(wx0 - 4, wy0 - 4, wx1 - wx0 + 9, wy1 - wy0 + 9, w1);
  g.hl(wx0 - 4, wx1 + 4, wy0 - 4, w3); g.vl(wx0 - 4, wy0 - 4, wy1 + 4, w2);
  // outside: sky, opposite building, tree, our own awning fringe
  g.vgrad(wx0, wy0, wx1 - wx0, 40, [0x9fd4f4, 0xbfe4f8, 0xdcf0fa], 0.5);
  cloud(g, 40, 38, [[-8, 1, 5], [0, -2, 7], [8, 1, 5]], [0xffffff, 0xf6f8fc, 0xe2e8f4, 0xd0d8ec]);
  g.rect(wx0 + 34, wy0 + 26, 52, 50, 0xe8c8a0); // building across the street
  for (let y = wy0 + 30; y < wy1; y += 12) for (let x = wx0 + 40; x < wx1 - 4; x += 14) {
    g.rect(x, y, 8, 7, 0x8fb8d0); g.hl(x, x + 7, y, 0x6a8aa8); g.px(x + 1, y + 1, 0xd8f0fa); g.hl(x - 1, x + 8, y + 7, 0xf4e4c8);
  }
  g.vl(wx0 + 34, wy0 + 26, wy1, 0xc8a882);
  foliage(g, [[wx0 + 10, wy0 + 44, 14, 0], [wx0 + 24, wy0 + 52, 10, 0.05], [wx0 + 4, wy0 + 60, 10, 0.1]], [0xc8e88a, 0x9cd06a, 0x72b052, 0x4e8a42], null);
  g.rect(wx0 + 12, wy0 + 60, 3, 20, 0x7a5a3a);
  g.rect(wx0, wy1 - 8, wx1 - wx0, 8, 0xc8c0b0); g.hl(wx0, wx1 - 1, wy1 - 8, 0xe8e0d0); // pavement
  for (let x = wx0; x < wx1; x++) { // awning scallops at the top of the view
    const stripe = Math.floor((x - wx0) / 6) % 2;
    const len = 7 + (((x - wx0) % 6) < 3 ? 1 : 0) + ((x - wx0) % 6 === 2 || (x - wx0) % 6 === 3 ? 1 : 0);
    for (let y = wy0; y < wy0 + len; y++) g.px(x, y, stripe ? 0xfff6ea : red);
    g.px(x, wy0 + len, stripe ? 0xd8c8b8 : dk(red, 0.35));
  }
  // muntins
  g.rect(Math.round((wx0 + wx1) / 2) - 1, wy0, 3, wy1 - wy0, w2); g.vl(Math.round((wx0 + wx1) / 2) - 1, wy0, wy1, w4);
  g.rect(wx0, 56, wx1 - wx0, 2, w2); g.hl(wx0, wx1 - 1, 56, w4);
  // glass glints
  for (const [x, y] of [[wx0 + 6, wy0 + 14], [wx1 - 30, wy0 + 40]]) for (let i = 0; i < 8; i++) { g.px(x + i, y - i, 0xffffff); g.px(x + i + 2, y - i, 0xffffff); }
  // brass rod + lace curtain (lower half)
  g.hl(wx0 - 3, wx1 + 3, 60, brass[1]); g.hl(wx0 - 3, wx1 + 3, 61, brass[2]); g.px(wx0 - 4, 60, brass[0]); g.px(wx1 + 4, 60, brass[0]);
  for (let x = wx0; x < wx1; x++) {
    const sc = (x - wx0) % 8, hem = wy1 - 3 + (sc < 4 ? sc >> 1 : (7 - sc) >> 1);
    for (let y = 62; y <= hem; y++) {
      const fold = (x - wx0) % 6;
      let c = fold === 0 ? 0xe8e2dc : fold === 5 ? 0xf4f0ea : 0xfffcf6;
      const lat = (x - wx0) % 4 === 2 && (y - 62) % 4 === 2 && y > 66 && y < hem - 9;
      const band = y >= hem - 8 && y <= hem - 4 && Math.abs(((x - wx0) % 8) - 4) + Math.abs(y - (hem - 6)) === 2;
      if (lat) c = mix(g.get(x, y), 0xffffff, 0.5);
      if (band) c = 0xe0d4cc;
      if (y === hem) c = 0xd8d0c8;
      g.px(x, y, c);
    }
    g.px(x, 62, (x & 1) ? 0xffffff : 0xe8e2dc);
  }
  // window sill with a napping cat and a little cactus
  g.rect(wx0 - 7, wy1 + 4, wx1 - wx0 + 15, 4, w3); g.hl(wx0 - 7, wx1 + 7, wy1 + 4, w5); g.hl(wx0 - 7, wx1 + 7, wy1 + 7, w1);
  g.sprite([
    '.......kk..kk...........',
    '......koOk.koOk.........',
    '.....kooooooook.........',
    '....koooooooooook.kkk...',
    '...koOoooooooooookoook..',
    '..koooKKooooKKoooooook..',
    '..koooooopooooooooooook.',
    '..kWWoooooooooooooOoook.',
    '..kWWWooooooooooooOoook.',
    '...kkkkkkkkkkkkkkkkkkk..',
  ], { k: 0x6a3a1e, o: 0xf3a248, O: 0xc66a22, K: 0x6a3a1e, p: 0xff8aa0, W: 0xfff4dc }, 56, wy1 - 6);
  g.sprite(['..g.', '.gGg', 'gGgg', '.gGg', 'tttt', 'TtTT', '.TT.'], { g: 0x7cc06a, G: 0x4e8a42, t: 0xd8784a, T: 0xa8542e }, 20, wy1 - 3);

  // amber pendant lamps hanging at the sides
  for (const lx of [112, 214]) {
    g.vl(lx, 10, 15, w0);
    g.sprite([
      '...kkk...',
      '..kaAak..',
      '.kaAAAak.',
      'kaAAAAAak',
      'kkkkkkkkk',
      '..lLLLl..',
    ], { k: 0x7a3a1a, a: 0xd88a2a, A: 0xf4b850, l: 0xffe8a8, L: 0xffffff }, lx - 4, 16);
    g.light(lx, 30, 26, 16, 0xfff0c0, 0.25, 0.9);
  }
  // ---- right wall: framed cat portrait, wall clock, shelf of cups and bean jars
  {
    const fx = 232, fy = 48;
    g.rect(fx + 1, fy + 1, 22, 26, mix(0xdcc094, w1, 0.4));
    g.rect(fx, fy, 22, 26, w4); g.frame(fx, fy, 22, 26, w1); g.rect(fx + 3, fy + 3, 16, 20, 0xfaf0dc);
    g.sprite([
      '..k......k..',
      '.kgk....kgk.',
      '.kggkkkkggk.',
      'kggggggggggk',
      'kgKggggggKgk',
      'kgggggpggggk',
      'kggggggggggk',
      '.kgggggggggk',
      '..kkkkkkkkk.',
    ], { k: 0x4a4458, g: 0xa8a8b4, K: 0x2a2430, p: 0xff8aa0 }, fx + 5, fy + 7);
    g.hl(fx + 5, fx + 16, fy + 18, red);
  }
  {
    const cx = 270, cy = 46;
    g.ell(cx + 1, cy + 1, 11, 11, mix(0xdcc094, w1, 0.4));
    g.ell(cx, cy, 11, 11, w2); g.ell(cx, cy, 9, 9, 0xfffaf0); g.ring(cx, cy, 9, 9, w4);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.px(cx + Math.round(Math.cos(a) * 7), cy + Math.round(Math.sin(a) * 7), i % 3 ? 0x8a7a6a : w1); }
    g.line(cx, cy, cx, cy - 6, w0); g.line(cx, cy, cx + 4, cy + 2, w0); g.px(cx, cy, red);
    g.rect(cx - 2, cy + 11, 5, 12, w2); g.vl(cx, cy + 12, cy + 20, brass[2]); g.ell(cx, cy + 21, 2, 2, brass[1]);
  }
  // shelf
  const sy = 82;
  g.rect(222, sy, W - 222, 4, w3); g.hl(222, W, sy, w5); g.hl(222, W, sy + 3, w1);
  for (const x of [232, 300]) g.sprite(['kk', 'kk', 'k.', 'k.'], { k: w1 }, x, sy + 4);
  // cups stacked upside-down
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) {
    const x = 226 + i * 11, y = sy - 6 - k * 6;
    g.sprite(['.wwwwww.', 'wwrrrrww', 'wwwwwwwW', '.wwwwwW.', '..kkkk..'].reverse(), { w: 0xfffaf2, W: 0xe8e0d4, r: red, k: 0xc8bca8 }, x, y);
  }
  // bean jars
  for (const [x, c] of [[262, 0x6a3a1e], [276, 0x8a4a2a], [290, 0x4a2a1a]]) {
    g.rect(x, sy - 15, 11, 15, 0xd8eef4); g.rect(x + 1, sy - 10, 9, 9, c);
    for (let i = 0; i < 6; i++) g.px(x + 2 + ((i * 3) % 8), sy - 9 + ((i * 5) % 7), lt(c, 0.3));
    g.rect(x, sy - 17, 11, 3, w1); g.hl(x, x + 10, sy - 17, w3); g.vl(x + 1, sy - 14, sy - 2, 0xffffff);
  }
  g.rect(304, sy - 12, 12, 12, red); g.hl(304, 315, sy - 12, lt(red, 0.3)); g.rect(306, sy - 9, 8, 5, 0xfff4dc); // tin

  // ---- counter
  const ct = 101;
  g.rect(0, ct, W, 5, w3); g.hl(0, W, ct, w5); g.hl(0, W, ct + 1, w4); g.hl(0, W, ct + 4, w1);
  // front panel: vertical boards
  for (let y = ct + 5; y < 146; y++) for (let x = 0; x < W; x++) {
    const b = x % 14;
    let c = b === 0 ? w0 : b === 1 ? w3 : b >= 11 ? w1 : w2;
    if (y > 112 && y < 128 && b > 3 && b < 11) c = b === 4 ? w1 : b === 10 ? w3 : (y === 113 ? w1 : y === 127 ? w3 : mix(w2, w1, 0.5)); // raised panels
    g.px(x, y, c);
  }
  g.hl(0, W, ct + 5, w0); g.hl(0, W, ct + 6, w1);
  // brass foot rail on brackets
  g.hl(0, W, 134, brass[0]); g.hl(0, W, 135, brass[1]); g.hl(0, W, 136, brass[2]); g.hl(0, W, 137, w0);
  for (let x = 20; x < W; x += 56) { g.rect(x, 137, 2, 4, brass[2]); g.px(x, 137, brass[1]); }
  g.rect(0, 144, W, 3, w0); g.hl(0, W, 144, w1);

  // ---- checker floor in perspective
  const fy0 = 147, hz = 0;
  const tileA = 0x4f9a76, tileB = 0xf4e6c8;
  for (let y = fy0; y < 200; y++) {
    const d = y - hz;
    for (let x = 0; x < W; x++) {
      const u = ((x - 160) * 9.5) / d, v = 2300 / d;
      const par = (Math.floor(u) + Math.floor(v)) & 1;
      const far = y < fy0 + 12;
      let c = par ? (far ? dk(tileA, 0.1) : tileA) : (far ? 0xe8d8b4 : tileB);
      const fu = u - Math.floor(u), fv = v - Math.floor(v);
      if (fv > 1 - 0.0005 * d || fu < 0.045) c = par ? dk(tileA, 0.22) : 0xd8c49c; // grout
      g.px(x, y, c);
    }
  }
  // shadow under the counter
  for (let y = fy0; y < fy0 + 6; y++) for (let x = 0; x < W; x++) if (bay(x, y) < 0.8 - (y - fy0) * 0.14) g.px(x, y, dk(g.get(x, y), 0.3, 0x2a1a20));
  // sun patch through the window, with the muntin shadows
  const sunL = (y) => 34 + (y - fy0) * 1.25, sunR = (y) => 136 + (y - fy0) * 1.25;
  for (let y = fy0 + 2; y < 200; y++) for (let x = Math.floor(sunL(y)); x <= sunR(y); x++) {
    const m = (sunL(y) + sunR(y)) / 2;
    if (Math.abs(x - m) < 2.5 || (y > 168 && y < 172)) continue;
    const edge = Math.min(x - sunL(y), sunR(y) - x);
    if (edge > 2 || bay(x, y) < 0.5) g.px(x, y, mix(g.get(x, y), 0xfff4d0, 0.38));
  }
  // sun patch on the counter front too
  for (let y = ct + 6; y < 144; y++) for (let x = Math.floor(8 + (y - ct) * 1.1); x <= 96 + (y - ct) * 1.1; x++) {
    if (Math.abs(x - (52 + (y - ct) * 1.1)) < 2) continue;
    g.px(x, y, mix(g.get(x, y), 0xffd890, 0.22));
  }

  // ---- things on the counter
  const shadowAt = (x, w) => { for (let i = 0; i < w; i++) if (bay(x + i, ct + 1) < 0.7) g.px(x + i, ct + 1, w2); };
  // cake dome on a stand
  {
    const cx = 116;
    shadowAt(cx - 12, 24);
    g.rect(cx - 2, ct - 4, 5, 4, 0xe8e4dc); g.rect(cx - 10, ct - 6, 21, 2, 0xfffaf2); g.hl(cx - 10, cx + 10, ct - 5, 0xd8d0c4);
    g.sprite([
      '..yyyyyyyy....',
      '.ywwwwwwwwyr..',
      'yyyyyyyyyyyrR.',
      'wwwwwwwwwwwwr.',
      'ssssssssssss..',
      'yyyyyyyyyyyy..',
      'YYYYYYYYYYYY..',
    ], { y: 0xfff0c8, w: 0xffffff, s: 0xff8aa0, Y: 0xf2d090, r: 0xe5383b, R: 0x9a1e2a }, cx - 7, ct - 13);
    const D = new Mask(g.w, g.h).ell(cx, ct - 6, 10, 14);
    D.each((x, y) => { if (y >= ct - 6) return; if (!D.has(x, y - 1) || !D.has(x - 1, y) || !D.has(x + 1, y)) g.px(x, y, 0xc8e4ee); });
    g.vl(cx - 6, ct - 15, ct - 9, 0xffffff); g.vl(cx - 5, ct - 17, ct - 16, 0xffffff);
    g.rect(cx - 1, ct - 22, 3, 2, 0xb8d8e4); g.px(cx, ct - 23, 0xe8f6fa);
  }
  // siphon coffee maker
  {
    const cx = 140;
    shadowAt(cx - 8, 18);
    g.rect(cx - 7, ct - 3, 15, 3, 0x6a6a74); g.hl(cx - 7, cx + 7, ct - 3, 0xa8a8b4);
    g.rect(cx + 6, ct - 30, 2, 27, 0x6a6a74); g.vl(cx + 6, ct - 30, ct - 4, 0xa8a8b4);
    g.ell(cx, ct - 5, 1, 2, 0x5cc4ff); g.px(cx, ct - 7, 0xd8f4ff);
    g.ell(cx, ct - 12, 6, 5, (x, y, nx, ny) => (ny > -0.2 ? (nx + ny < -0.4 ? 0x7a4a2a : 0x4a2a1a) : 0xe8f4fa));
    g.ring(cx, ct - 12, 6, 5, 0xa8c8d8); g.px(cx - 3, ct - 15, 0xffffff); g.px(cx - 4, ct - 14, 0xffffff);
    g.rect(cx - 1, ct - 20, 3, 4, 0xd8ecf4);
    g.rect(cx - 4, ct - 30, 9, 10, 0xe8f4fa); g.frame(cx - 4, ct - 30, 9, 10, 0xa8c8d8); g.rect(cx - 3, ct - 24, 7, 3, 0x8a5a3a);
    g.hl(cx - 5, cx + 5, ct - 31, 0x6a6a74); g.vl(cx - 3, ct - 29, ct - 26, 0xffffff);
  }
  // cream soda
  {
    const cx = 188;
    shadowAt(cx - 6, 12);
    g.rect(cx - 2, ct - 3, 5, 3, 0xd8eef4); g.hl(cx - 3, cx + 3, ct - 1, 0xe8f6fa);
    g.rect(cx - 4, ct - 20, 9, 17, 0x58d888); g.vl(cx - 4, ct - 20, ct - 4, 0xb8f4d0); g.vl(cx + 4, ct - 20, ct - 4, 0x38b868);
    for (const [x, y] of [[cx - 1, ct - 8], [cx + 2, ct - 13], [cx, ct - 17]]) g.px(x, y, 0xe8fff0);
    g.ell(cx, ct - 22, 5, 3, (x, y, nx, ny) => (nx + ny < -0.3 ? 0xffffff : 0xfff6e6));
    g.ell(cx + 1, ct - 26, 1.5, 1.5, red); g.px(cx, ct - 27, 0xff9a9a); g.line(cx + 1, ct - 27, cx + 3, ct - 30, 0x4e8a42);
    g.line(cx - 3, ct - 22, cx - 7, ct - 33, 0xff6f9a); g.line(cx - 2, ct - 22, cx - 6, ct - 33, 0xd84a7a);
  }
  // coffee cup and saucer, steaming
  {
    const cx = 210;
    shadowAt(cx - 7, 14);
    g.ell(cx, ct - 1, 7, 1.5, 0xfffaf2); g.hl(cx - 6, cx + 6, ct, 0xd8d0c4);
    g.rect(cx - 4, ct - 8, 9, 7, 0xfffaf2); g.vl(cx + 4, ct - 8, ct - 2, 0xd8d0c4); g.hl(cx - 4, cx + 4, ct - 6, red);
    g.hl(cx - 3, cx + 3, ct - 8, 0x5a3220); g.frame(cx + 5, ct - 7, 3, 4, 0xfffaf2);
    mist(g, cx, ct - 14, 4, 5, 0xffffff, 0.5); mist(g, cx + 2, ct - 20, 3, 4, 0xffffff, 0.35);
  }
  // little maneki-neko by the till
  g.sprite([
    '.k.....k...',
    'kwk...kwk..',
    'kwwkkkwwk..',
    'kwKwwwKwkk.',
    'kwwwpwwwkwk',
    '.krrGrrk.wk',
    'kwwwwwwwkwk',
    'kwwwwwwwk..',
    '.kkkkkkk...',
  ], { k: 0x5a4a4a, w: 0xfffaf2, K: 0x2a2020, p: 0xff8aa0, r: red, G: 0xffd23f }, 226, ct - 9);
  // retro cash register
  {
    const x = 244, y = ct - 22;
    shadowAt(x, 30);
    g.rect(x, y + 8, 28, 14, 0xe8dcc0); g.hl(x, x + 27, y + 8, 0xfff6e0); g.vl(x + 27, y + 8, y + 21, 0xb8a888);
    g.rect(x + 4, y, 16, 9, 0xd8c8a4); g.rect(x + 6, y + 2, 12, 5, 0x2a3a2a); g.tiny('300', x + 7, y + 2, 0x8af0a0);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) g.px(x + 3 + i * 4, y + 11 + j * 3, (i + j) % 3 ? 0x4a3a2a : red);
    g.rect(x + 22, y + 10, 4, 3, 0xd8c8a4); g.rect(x, y + 20, 28, 2, 0xa89878);
  }
  // potted monstera at the far right edge of the counter
  foliage(g, [[312, ct - 18, 9, 0], [302, ct - 26, 7, 0.05], [318, ct - 32, 6, 0.1]], [0x9cd06a, 0x72b052, 0x4e8a42, 0x2e6a3a], 0x24482a);
  g.rect(304, ct - 9, 14, 9, 0xd8784a); g.hl(304, 317, ct - 9, 0xf09a6a); g.vl(317, ct - 9, ct - 1, 0xa8542e);
}

// --- wagashi: spring tea room, round window, red felt carpet --------------------------------------
function wagashi(g, s) {
  const W = g.w;
  const pink = hex(s.card.accent);
  const pr = rng(321);
  const sakura = [0xfff3f7, 0xffdbe7, 0xffc0d4, 0xf59fbd, 0xd97b9f];
  const post = [0xc89a68, 0xa87a4a, 0x7e5634, 0x4e321e];

  // ---- the garden view (painted first, the clay wall is cut around it afterwards)
  const mx = 62, my = 76, mr = 43;
  g.vgrad(0, 20, 124, 100, [0xa8d8f2, 0xc4e6f6, 0xe2f2f6, 0xfaf0e8], 0.5);
  cloud(g, 50, 52, [[-9, 1, 5], [0, -2, 7], [9, 1, 5], [16, 3, 4]], [0xffffff, 0xf8f6fc, 0xe6e2f2, 0xd6d0ea]);
  // distant hills + pagoda
  ridge(g, 0, 124, (x) => 94 + 4 * Math.sin(x * 0.07 + 1) + 2 * Math.sin(x * 0.19), 120, (x, y, d) => (d === 0 ? 0xc8e2d0 : tone(x, y, d / 10, [0xb4d8c0, 0x9ccaa8])));
  {
    const px0 = 86, base = 96;
    const pg = [0x8aa4c0, 0x6a84a4, 0x4e6688];
    g.vl(px0, base - 34, base - 28, pg[2]);
    for (let k = 0; k < 5; k++) {
      const y = base - 28 + k * 6, hw = 4 + k * 1.2;
      g.hl(Math.round(px0 - hw - 1), Math.round(px0 + hw + 1), y, pg[2]);
      g.hl(Math.round(px0 - hw), Math.round(px0 + hw), y - 1, pg[0]);
      g.rect(px0 - 2 - (k >> 1), y + 1, 5 + (k >> 1) * 2, 4, pg[1]);
    }
  }
  // garden: moss, stone lantern, bamboo fence
  g.rect(0, 104, 124, 16, 0x8ac06a);
  for (let x = 0; x < 124; x += 3) g.px(x + ((x * 7) % 2), 104, 0xa8d880);
  for (let y = 102; y < 120; y += 1) for (const x0 of [10, 30, 50, 70, 90, 110]) { g.px(x0, y, 0xd8c88a); g.px(x0 + 1, y, 0xb0a060); }
  for (const y of [106, 113]) { g.hl(0, 123, y, 0xd8c88a); g.hl(0, 123, y + 1, 0xa89050); }
  for (const x0 of [10, 30, 50, 70, 90, 110]) for (const y of [106, 113]) { g.px(x0 - 1, y, 0x5a3a2a); g.px(x0 + 2, y + 1, 0x5a3a2a); }
  g.sprite([
    '..kkk..',
    '.kaaak.',
    'kkkkkkk',
    '.kbBbk.',
    '.kBlBk.',
    'kkkkkkk',
    '..kbk..',
    '..kbk..',
    '.kkkkk.',
  ], { k: 0x5a6a6a, a: 0xa8b4b0, b: 0x8a9894, B: 0x6a7a78, l: 0xfff0b0 }, 22, 94);
  // blossoming branch reaching across the window
  const br = new Mask(g.w, g.h).stroke([[0, 40, 3], [24, 46, 2], [52, 40, 2], [76, 46, 1], [96, 42, 1]]);
  br.fill(g, () => 0x6a3e3a); br.outline(g, 0x3e2228);
  foliage(g, [[6, 34, 10, -0.05], [26, 40, 9, 0], [46, 34, 8, 0], [64, 42, 7, 0.05], [84, 40, 6, 0.05], [14, 48, 7, 0.1]], sakura, 0xb85a82, { amp: 0.16, freq: 8 });
  for (const [cx, cy, r] of [[6, 34, 10], [26, 40, 9], [46, 34, 8], [64, 42, 7]]) for (let i = 0; i < r * 0.7; i++) {
    const a = pr() * Math.PI * 2, d = pr() * r * 0.8;
    const bx = Math.round(cx + Math.cos(a) * d), by = Math.round(cy + Math.sin(a) * d);
    if (Math.cos(a) + Math.sin(a) < 0) { g.px(bx, by, 0xfff8fb); g.px(bx + 1, by, 0xffe4ee); } else g.px(bx, by, 0xe58aab);
  }

  // ---- clay wall (left) and shoji (centre/right)
  const win = new Mask(g.w, g.h).ell(mx, my, mr, mr);
  for (let y = 0; y < 124; y++) for (let x = 0; x < 124; x++) {
    if (win.has(x, y)) continue;
    let c = tone(x, y, 0.25 + y / 260, [0xe2c89c, 0xd6b98c, 0xc8a87a], 0.5);
    g.px(x, y, c);
  }
  for (let i = 0; i < 46; i++) { // straw fibres in the plaster
    const x = Math.floor(pr() * 116), y = 12 + Math.floor(pr() * 108);
    if (win.has(x, y) || win.has(x + 3, y + 1) || win.has(x - 1, y)) continue;
    const c = pr() < 0.5 ? 0xead2a6 : 0xbc9a6a, d = pr() < 0.5 ? 0 : 1;
    g.px(x, y, c); g.px(x + 1, y + d, c); g.px(x + 2, y + d, c);
  }
  // window rim: rounded plaster bevel + thin bamboo ring
  win.outline(g, 0x9a7a52, 0xf2e2c2);
  new Mask(g.w, g.h).ell(mx, my, mr + 2, mr + 2).outline(g, 0xb08a5c, 0xc8a878);
  for (const x of [mx - 14, mx + 14]) for (let y = my - mr; y <= my + mr; y++) if (win.has(x, y)) { g.px(x, y, 0xc8b070); g.px(x + 1, y, 0x9a8448); if ((y - my) % 12 === 0) g.px(x, y, 0x7a6438); }
  // shoji panels
  const sx0 = 124, sx1 = 222;
  for (let y = 0; y < 124; y++) for (let x = sx0; x < sx1; x++) g.px(x, y, tone(x, y, y / 150, [0xfffbf0, 0xf8f0de, 0xeee2c8], 0.5));
  for (let x = sx0; x < sx1; x += 14) for (let y = 10; y < 124; y++) { g.px(x, y, 0xc8a070); g.px(x + 1, y, 0xe6d0aa); }
  for (let y = 14; y < 124; y += 18) for (let x = sx0; x < sx1; x++) { g.px(x, y, 0xc8a070); g.px(x, y + 1, 0xe6d0aa); }
  g.light(172, 40, 70, 50, 0xffffff, 0.35, 0.9);
  // posts + lintel
  for (const [x0, w] of [[118, 7], [sx1, 7]]) {
    g.rect(x0, 0, w, 124, post[1]); g.vl(x0, 0, 123, post[0]); g.vl(x0 + w - 1, 0, 123, post[2]); g.vl(x0 + w, 0, 123, post[3]);
  }
  g.rect(0, 0, W, 9, post[2]); g.hl(0, W, 0, post[3]); g.hl(0, W, 7, post[1]); g.hl(0, W, 8, post[0]); g.hl(0, W, 9, post[3]);

  // ---- tokonoma alcove (right) with hanging scroll and a camellia
  const tx0 = 229;
  g.vgrad(tx0, 10, W - tx0, 112, [0xe8d6b0, 0xdcc8a0, 0xceb88c], 0.5);
  g.rect(tx0, 10, W - tx0, 4, post[2]); g.hl(tx0, W, 13, post[3]);
  for (let y = 14; y < 120; y++) { g.px(tx0, y, 0xb89a70); g.px(tx0 + 1, y, 0xc8aa80); }
  // scroll
  const kx = 258, kw = 34, ky0 = 18, ky1 = 108;
  g.rect(kx + 2, ky0 + 2, kw, ky1 - ky0, mix(0xceb88c, 0x3a2a1a, 0.35));
  g.rect(kx, ky0, kw, ky1 - ky0, 0x7a8a5a); g.vl(kx, ky0, ky1 - 1, 0x9aa878); g.vl(kx + kw - 1, ky0, ky1 - 1, 0x5a6a42);
  g.rect(kx + 4, ky0 + 10, kw - 8, ky1 - ky0 - 22, 0xfaf4e4);
  g.hl(kx + 4, kx + kw - 5, ky0 + 10, 0xd4a83a); g.hl(kx + 4, kx + kw - 5, ky1 - 13, 0xd4a83a);
  g.rect(kx - 2, ky0 - 3, kw + 4, 3, post[3]); g.vl(kx + kw / 2, 4, ky0 - 3, 0x3a2a1a);
  g.rect(kx - 3, ky1, kw + 6, 3, post[3]); g.px(kx - 4, ky1 + 1, 0xe8dcc8); g.px(kx + kw + 3, ky1 + 1, 0xe8dcc8);
  g.sprite([ // brushed 春 (spring)
    '......K......',
    '.KKKKKKKKKKK.',
    '......K......',
    '..KKKKKKKKK..',
    '.....K.K.....',
    'KKKKKKKKKKKKK',
    '....K...K....',
    '..K.KKKKK.K..',
    '.K..K...K..K.',
    'K...KKKKK...K',
    '....K...K....',
    '....KKKKK....',
  ], { K: 0x2a2020 }, kx + kw / 2 - 6, ky0 + 15);
  // ink plum branch + red seal
  const plum = new Mask(g.w, g.h).stroke([[kx + 6, ky1 - 18, 1], [kx + 14, ky1 - 26], [kx + 24, ky1 - 30], [kx + 28, ky1 - 40]]);
  plum.fill(g, () => 0x4a3a3a);
  for (const [x, y] of [[kx + 13, ky1 - 29], [kx + 21, ky1 - 33], [kx + 27, ky1 - 42], [kx + 9, ky1 - 22], [kx + 25, ky1 - 28]]) blossom(g, x, y, 0xe86a7a, 0xffd860);
  g.rect(kx + 22, ky1 - 20, 4, 4, 0xd8302c); g.px(kx + 23, ky1 - 19, 0xfaf4e4);
  // toko-ita board + vase with camellia
  g.rect(tx0 - 2, 116, W - tx0 + 2, 8, post[2]); g.hl(tx0 - 2, W, 116, post[0]); g.hl(tx0 - 2, W, 117, post[1]); g.hl(tx0 - 2, W, 123, post[3]);
  {
    const vx = 244;
    g.sprite([
      '...kk...',
      '..kbbk..',
      '..kbBk..',
      '.kbbBBk.',
      'kbbbbBBk',
      'kbbbbBBk',
      'kbWbbBBk',
      '.kbbbBk.',
      '..kkkk..',
    ], { k: 0x2a3a4a, b: 0x4a6a8a, B: 0x34506e, W: 0x8aa8c8 }, vx - 4, 107);
    g.line(vx, 106, vx - 3, 96, 0x4e6a32); g.line(vx, 106, vx + 4, 99, 0x4e6a32);
    for (const [x, y, r] of [[vx - 5, 94, 2], [vx + 5, 98, 2]]) g.ell(x, y, r + 1, r, (xx, yy, nx, ny) => (nx + ny < -0.2 ? 0x6a9a3a : 0x3e6a2a));
    g.ell(vx - 2, 92, 3, 3, (x, y, nx, ny) => (nx * nx + ny * ny < 0.25 ? 0xffd860 : nx + ny < -0.3 ? 0xf05a5a : 0xc8282c));
  }

  // ---- tatami floor
  const fy = 124;
  for (let y = fy; y < 200; y++) for (let x = 0; x < W; x++) {
    const t = (y - fy) / 76;
    let c = tone(x, y, 0.2 + t * 0.5, [0xe2dca0, 0xd6cf90, 0xc8c07e], 0.5);
    if ((y - fy) % 3 === 2) c = dk(c, 0.07, 0x6a5a20);
    g.px(x, y, c);
  }
  g.hl(0, W, fy, post[3]); g.hl(0, W, fy + 1, 0xb8b070);
  // heri (cloth borders): one across + seams converging toward the viewer
  for (let y = 136; y < 139; y++) for (let x = 0; x < W; x++) g.px(x, y, y === 136 ? 0x3a3a52 : 0x24243a);
  for (let x = 0; x < W; x += 3) g.px(x, 137, 0x5a5a7a);

  // red felt carpet (mōsen) — the figure floor
  const my0 = 149, my1 = 196;
  const red = 0xc8303a;
  for (let y = my0; y < my1; y++) {
    const inset = Math.round((my1 - y) * 0.12);
    for (let x = inset - 6; x < W - inset + 6; x++) {
      const t = (y - my0) / (my1 - my0);
      let c = tone(x, y, 0.1 + t * 0.75, [0xe0484e, red, 0xb42834], 0.25);
      if (y === my0) c = 0xf0686a;
      if (y === my0 + 1) c = 0xd8404a;
      g.px(x, y, c);
    }
  }
  g.hl(0, W, my1, 0x7a1820); g.hl(0, W, my1 + 1, 0xa8a060); for (let x = 0; x < W; x += 2) g.px(x, my1 + 2, 0x6a5a20);
  // soft daylight from the shoji on the felt and tatami
  g.light(172, 150, 110, 24, 0xfff0e0, 0.18, 0.9);

  // ---- kettle on the brazier (left edge), steam rising
  {
    const cx = 18, by = 146;
    g.ell(cx, by + 1, 16, 3, mix(0xc8c07e, 0x3a2a1a, 0.35));
    g.rect(cx - 13, by - 14, 27, 14, 0xa86a3a); g.hl(cx - 13, cx + 13, by - 14, 0xd89a5a); g.vl(cx + 13, by - 14, by - 1, 0x6a3a1a);
    g.rect(cx - 9, by - 9, 19, 6, 0x4a2a1a); g.ell(cx, by - 6, 6, 2, 0xff8a3a); // charcoal glow window
    const ket = new Mask(g.w, g.h).ell(cx, by - 22, 12, 9);
    ket.fill(g, (x, y) => tone(x, y, 0.2 + (x - cx + 12) / 34 + (y - by + 31) / 40, [0x6a6a74, 0x4a4a54, 0x34343c, 0x24242a], 0.5));
    ket.outline(g, 0x141418);
    for (let i = -10; i <= 10; i += 3) g.px(cx + i, by - 26 + Math.round(Math.abs(i) * 0.15), 0x7a7a84); // arare bumps
    g.rect(cx - 4, by - 33, 9, 3, 0x2a2a30); g.px(cx, by - 34, 0x8a6a3a);
    for (const s2 of [-1, 1]) { g.rect(cx + s2 * 12 - (s2 < 0 ? 2 : 0), by - 26, 3, 3, 0x2a2a30); }
    mist(g, cx + 2, by - 42, 5, 5, 0xffffff, 0.55); mist(g, cx - 1, by - 52, 4, 5, 0xffffff, 0.4); mist(g, cx + 3, by - 61, 3, 4, 0xffffff, 0.28);
  }
  // falling petals drifting in through the window
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(pr() * 200) + (i < 12 ? 0 : 60), y = Math.floor(30 + pr() * 160);
    if (y > 124 && y < 149 && pr() < 0.5) continue;
    petal(g, x, y, i % 4, 0xffc4d6, pink);
  }
}

// --- matsuri: festival night, stalls before the shrine steps, fireworks ---------------------------
/** Firework burst: dotted spokes with a white core, dithered glow. */
function hanabi(g, cx, cy, r, col, col2, spokes = 18, seed = 1) {
  const r2 = rng(seed);
  g.light(cx, cy, r * 1.3, r * 1.3, col, 0.16, 0.55);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + r2() * 0.12;
    const len = r * (0.85 + r2() * 0.2);
    for (let d = r * 0.25; d < len; d += 2.2) {
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d + (d / r) ** 2 * 3);
      const t = d / len;
      g.px(x, y, t < 0.45 ? col2 : col);
      if (t > 0.86) { g.px(x + 1, y, col); g.px(x, y + 1, dk(col, 0.3, 0x1a1838)); }
    }
  }
  for (let i = 0; i < spokes; i++) { // inner ring of sparks
    const a = (i / spokes) * Math.PI * 2 + 0.17;
    g.px(Math.round(cx + Math.cos(a) * r * 0.45), Math.round(cy + Math.sin(a) * r * 0.45), 0xffffff);
  }
  g.px(cx, cy, 0xffffff); g.px(cx + 1, cy, col2); g.px(cx - 1, cy, col2); g.px(cx, cy + 1, col2); g.px(cx, cy - 1, col2);
}

/** Yatai stall front: striped scalloped awning, lit interior, counter panel, poles. */
function yatai(g, x0, x1, top, bot, [c1, c2], panel) {
  const w = x1 - x0, aw = 11, ct = bot - 17;
  // lit interior
  for (let y = top + aw; y < ct; y++) for (let x = x0 + 1; x < x1 - 1; x++) g.px(x, y, tone(x, y, (y - top - aw) / (ct - top - aw), [0xffe0a0, 0xe8a868, 0xa8603a], 0.5));
  for (let x = x0 + 6; x < x1 - 4; x += 12) { g.px(x, top + aw, 0x3a2a2a); g.px(x, top + aw + 1, 0xfff8d0); g.light(x, top + aw + 2, 12, 9, 0xfff4c0, 0.35, 1); }
  // awning with scallops
  for (let x = x0 - 2; x < x1 + 2; x++) {
    const k = Math.floor((x - x0 + 2) / 5) % 2, sc = (x - x0 + 2) % 5;
    const len = aw - 1 + (sc === 2 ? 2 : sc === 1 || sc === 3 ? 1 : 0);
    for (let y = top; y < top + len; y++) {
      let c = k ? c2 : c1;
      if (y < top + 2) c = lt(c, 0.25);
      else if (y > top + len - 3) c = dk(c, 0.18);
      g.px(x, y, c);
    }
    g.px(x, top + len, dk(k ? c2 : c1, 0.45));
  }
  g.hl(x0 - 2, x1 + 1, top - 1, dk(c1, 0.5));
  // poles
  for (const x of [x0, x1 - 1]) for (let y = top + aw; y < bot; y++) g.px(x, y, 0x5a3a2a);
  // counter
  g.rect(x0, ct, w, 2, 0xc8925a); g.hl(x0, x1 - 1, ct, 0xe8b880);
  g.rect(x0, ct + 2, w, bot - ct - 2, panel);
  g.hl(x0, x1 - 1, bot - 1, dk(panel, 0.4));
  g.hl(x0, x1 - 1, ct + 2, dk(panel, 0.3));
  return ct;
}

function matsuri(g, s) {
  const W = g.w;
  const red = hex(s.card.accent);
  const pr = rng(331);
  const night = [0x161430, 0x1e1a40, 0x2a2252, 0x3e2c62, 0x5a3670, 0x7a4274];

  // ---- night sky with a warm glow from the stalls
  g.vgrad(0, 0, W, 110, night, 0.55);
  for (let i = 0; i < 40; i++) { const x = Math.floor(pr() * W), y = Math.floor(pr() * 60); g.px(x, y, pr() < 0.4 ? 0xffffff : 0x9a90d0); }
  for (const [x, y, b] of [[30, 64, 0], [120, 50, 0], [212, 58, 0], [300, 70, 0], [148, 6, 1]]) twinkle(g, x, y, 0xffffff, 0x8a80c0, b);
  hanabi(g, 262, 36, 26, 0xff6a8a, 0xfff0a0, 22, 1);
  hanabi(g, 62, 26, 19, 0x6ad8ff, 0xffffff, 18, 2);
  hanabi(g, 182, 14, 12, 0xffd23f, 0xffffff, 14, 3);
  hanabi(g, 110, 60, 8, 0x9bd94a, 0xffffff, 10, 4);
  // smoke wisps drifting from the bursts
  for (const [x, y, w] of [[230, 66, 50], [40, 50, 40], [150, 30, 30]]) for (let i = 0; i < w; i++) {
    const yy = y + Math.round(Math.sin(i * 0.12) * 2);
    if (bay(x + i, yy) < 0.5) g.px(x + i, yy, 0x4a3e74);
  }

  // ---- wooded hill with the shrine at the top of the steps
  const hill = (x) => 92 - 14 * Math.exp(-(((x - 160) / 60) ** 2)) + 3 * Math.sin(x * 0.11);
  ridge(g, 0, W, hill, 150, (x, y, d) => (d === 0 ? 0x2e3a58 : tone(x, y, d / 30, [0x24304c, 0x1c2640, 0x161e34], 0.5)));
  foliage(g, [[124, 80, 12, 0.2], [108, 86, 10, 0.25], [196, 80, 12, 0.2], [212, 86, 10, 0.25], [92, 92, 9, 0.3], [228, 92, 9, 0.3]], [0x3a4e6a, 0x2a3a58, 0x1e2a44, 0x141c30], null, { amp: 0.18, freq: 9 });
  {
    // shrine hall
    const hx = 160, hy = 70;
    g.poly([[hx - 26, hy + 8], [hx + 26, hy + 8], [hx + 16, hy - 2], [hx - 16, hy - 2]], 0x1a1a2e);
    g.hl(hx - 26, hx + 26, hy + 8, 0x4a3e6e); g.hl(hx - 16, hx + 16, hy - 2, 0x5a4e80);
    g.rect(hx - 18, hy + 9, 36, 10, 0x2a2238); g.rect(hx - 8, hy + 11, 16, 8, 0x8a4a3a);
    g.light(hx, hy + 15, 18, 8, 0xffb060, 0.4, 1);
    for (const lx of [hx - 14, hx + 14]) { g.rect(lx - 1, hy + 10, 3, 4, 0xffd890); g.px(lx, hy + 9, 0x2a2238); }
  }
  // stone steps up to the torii
  for (let k = 0; k < 14; k++) {
    const y = 148 - k * 4, hw = 26 - k * 1.3;
    g.rect(Math.round(160 - hw), y - 3, Math.round(hw * 2), 4, 0x6a6488);
    g.hl(Math.round(160 - hw), Math.round(160 + hw) - 1, y - 3, 0x9a94b8);
    g.hl(Math.round(160 - hw), Math.round(160 + hw) - 1, y, 0x3a3658);
  }
  g.light(160, 120, 30, 34, 0xffb070, 0.22, 0.9);
  // torii
  {
    const tl = 134, tr = 186, top = 86;
    const ver = 0xd8383a, verL = 0xff6a5a, verD = 0x8a1e2a, ink = 0x1a0e1a;
    for (const px of [tl + 6, tr - 10]) { g.rect(px, top + 8, 4, 40, ver); g.vl(px + 3, top + 8, top + 47, verL); g.vl(px, top + 8, top + 47, verD); g.rect(px - 1, top + 45, 6, 3, ink); }
    for (let x = tl - 5; x <= tr + 5; x++) {
      const e = Math.max(0, Math.abs(x - 160) - 22) / 7;
      const y0 = Math.round(top - e * e);
      g.px(x, y0, ink); g.px(x, y0 + 1, ver); g.px(x, y0 + 2, verL); g.px(x, y0 + 3, verD);
    }
    g.rect(tl + 1, top + 11, tr - tl - 2, 3, ver); g.hl(tl + 1, tr - 2, top + 11, verL); g.hl(tl + 1, tr - 2, top + 13, verD);
    g.rect(157, top + 4, 6, 7, ink); g.rect(158, top + 5, 4, 5, 0xd8b050);
  }
  // tiny visitors on the steps
  for (const [x, y, c] of [[150, 128, 0x2a2a5a], [168, 118, 0x5a2a4a], [172, 120, 0x2a4a5a]]) {
    g.sprite(['.h.', 'hhh', 'cCc', 'cCc', '.c.'], { h: 0x14101c, c, C: lt(c, 0.3) }, x, y);
  }

  // ---- the stall row
  const top = 92, bot = 150;
  // kakigori (left)
  let ct = yatai(g, -4, 64, top, bot, [0x3a7ad8, 0xffffff], 0xf4f0e8);
  for (let x = 4; x < 60; x += 9) { // shaved ice cups on the counter
    const c = [0xff5a6a, 0x7ad860, 0x5ab8ff, 0xffd23f][(x / 9) % 4 | 0];
    g.sprite(['.www.', 'wwwww', 'ccccc', '.kkk.', '.kkk.'], { w: 0xffffff, c, k: 0xd8ecf4 }, x, ct - 5);
  }
  for (let i = 0; i < 4; i++) g.sprite(['k', 'c', 'c', 'c'], { k: 0x3a2a2a, c: [0xff3a4a, 0x4ad84a, 0x3a9aff, 0xffc83a][i] }, 46 + i * 3, ct - 18);
  for (let x = 2; x < 62; x += 8) g.hl(x, x + 4, ct + 8, 0x3a7ad8); // wave print
  for (let x = 4; x < 62; x += 8) g.px(x + 2, ct + 7, 0x3a7ad8);
  {
    // kakigori flag
    const fx = 8, fy = 100;
    g.vl(fx - 1, fy - 4, fy + 22, 0x8a6a4a);
    g.rect(fx, fy, 22, 22, 0xffffff); g.frame(fx, fy, 22, 22, 0xd8d4cc);
    g.text('氷', fx + 11, fy + 1, { size: 12, color: 0xd8282a, align: 'center' });
    for (let x = fx + 1; x < fx + 21; x++) { g.px(x, fy + 16 + ((x >> 1) % 2), 0x3a7ad8); g.px(x, fy + 19, 0x3a7ad8); g.px(x, fy + 20, 0x3a7ad8); }
  }
  // takoyaki
  ct = yatai(g, 66, 134, top, bot, [red, 0xffffff], 0xffd23f);
  g.rect(74, ct - 4, 34, 4, 0x2a2a30); g.hl(74, 107, ct - 4, 0x5a5a64);
  for (let x = 76; x < 106; x += 4) { g.px(x, ct - 5, 0xc87a3a); g.px(x + 1, ct - 5, 0xa85a2a); g.px(x, ct - 6, 0xe89a5a); g.px(x + 1, ct - 6, 0xc87a3a); }
  mist(g, 92, ct - 14, 10, 5, 0xfff4e0, 0.45);
  g.sprite([
    '..rrrr..',
    '.rrrrrr.',
    'rrwrrwrr',
    'rrkrrkrr',
    '.rrrrrr.',
    'r.r.r.r.',
    'r.r.r.r.',
  ], { r: red, w: 0xffffff, k: 0x2a1a1a }, 112, ct + 3);
  g.rect(78, 104, 32, 12, 0xffffff); g.frame(78, 104, 32, 12, 0x8a2a2a);
  g.text('たこ焼', 94, 104, { size: 10, color: red, align: 'center' });
  // cotton candy
  ct = yatai(g, 186, 254, top, bot, [0xff8fb8, 0xffffff], 0xfff0f6);
  for (let i = 0; i < 5; i++) { // character bags hanging from the rail
    const x = 192 + i * 12, y = top + 14;
    const c = [0xff8fb8, 0x8fd0ff, 0xfff08a, 0xa8f0b0, 0xd8b8ff][i];
    g.vl(x + 4, top + 11, y, 0x8a6a6a);
    g.sprite(['kkkkkkkkk', 'kcccccccck'.slice(0, 9), 'kcKcccKck', 'kccccccck', 'kccpppcck', 'kccccccck', 'kkkkkkkkk'], { k: dk(c, 0.45), c, K: 0x2a2020, p: 0xff6a8a }, x, y);
  }
  for (const [x, c] of [[200, 0xffc8e0], [214, 0xd8ecff], [228, 0xffc8e0]]) { g.vl(x, ct - 8, ct, 0xe8d8b0); g.ell(x, ct - 12, 4, 4, (xx, yy, nx, ny) => (nx + ny < -0.4 ? 0xffffff : c)); }
  g.rect(196, ct + 4, 44, 12, 0xffffff); g.frame(196, ct + 4, 44, 12, 0xff8fb8);
  g.text('わたあめ', 218, ct + 4, { size: 10, color: 0xe8487a, align: 'center' });
  // goldfish scooping (right)
  ct = yatai(g, 256, 324, top, bot, [0xffd23f, 0x3a7ad8], 0x3a7ad8);
  g.rect(258, ct - 3, 66, 5, 0x5ab8ff); g.hl(258, 323, ct - 3, 0xbfe8ff);
  for (const [x, y] of [[266, ct - 2], [280, ct - 1], [292, ct - 2], [304, ct - 1], [314, ct - 2]]) { g.px(x, y, 0xff6a3a); g.px(x + 1, y, 0xff6a3a); g.px(x + 2, y, 0xffd0a0); }
  g.text('金魚すくい', 290, ct + 4, { size: 10, color: 0xffffff, align: 'center' });

  // ---- lantern string across the street
  const lanY = (x) => 66 + Math.round(12 * Math.sin((x / W) * Math.PI));
  for (let x = 0; x < W; x++) g.px(x, lanY(x), 0x1a1220);
  for (let i = 0; i < 12; i++) {
    const x = 12 + i * 27, y = lanY(x) + 1;
    const c = i % 2 ? 0xfff2d8 : 0xff5a3a;
    g.light(x, y + 5, 10, 9, c, 0.25, 0.9);
    g.sprite([
      '.kkk.',
      'aAAAa',
      'AAWAA',
      'AAWAA',
      'aAAAa',
      '.kkk.',
    ], { k: 0x2a1a1a, a: dk(c, 0.25), A: c, W: lt(c, 0.6) }, x - 2, y);
    if (i % 2 === 0) g.px(x, y + 3, 0x2a1a1a);
  }

  // ---- ground: lit festival path with stone paving to the steps
  for (let y = bot; y < 200; y++) for (let x = 0; x < W; x++) {
    const t = (y - bot) / 50;
    g.px(x, y, tone(x, y, 0.1 + t * 0.8, [0x84665e, 0x6e5458, 0x5a4450], 0.2));
  }
  g.hl(0, W, bot, 0x3a2a34);
  // paving stones fanning out from the steps
  for (let r = 0; r < 6; r++) {
    const y0 = bot + 2 + r * 8 + r * r * 0.4, h = 6 + r;
    const hw = 24 + r * 9;
    const n = 3 + r;
    for (let i = 0; i < n; i++) {
      const xa = Math.round(160 - hw + (i / n) * hw * 2 + 1), xb = Math.round(160 - hw + ((i + 1) / n) * hw * 2 - 1);
      const M = new Mask(g.w, g.h).rect(xa + (r % 2 ? 2 : 0), Math.round(y0), xb - xa - 1, Math.min(h, 199 - Math.round(y0)));
      M.fill(g, (x, y) => (y === M.y0 ? 0xb0a0a8 : tone(x, y, (y - M.y0) / h, [0x9a8a94, 0x84747e], 0.5)));
      M.outline(g, 0x3a2a34);
    }
  }
  // gravel: small deliberate pebbles in rows
  for (let y = bot + 4; y < 198; y += 5) for (let x = (y * 7) % 11; x < W; x += 11 + ((x * 3 + y) % 5)) {
    if (Math.abs(x - 160) < 26 + (y - bot) * 1.2) continue;
    g.px(x, y, 0x9a8078); g.px(x + 1, y, 0xae948a); g.px(x + 1, y + 1, 0x4a3440);
  }
  // warm light pools from the stalls
  for (const x of [30, 100, 220, 290]) g.light(x, 158, 46, 12, 0xffc880, 0.3, 1);
  // dropped uchiwa fan and a yo-yo balloon on the ground
  g.sprite([
    '..kkkk...',
    '.kbbbbk..',
    'kbbwwbbk.',
    'kbwbbwbk.',
    'kbbwwbbk.',
    '.kbbbbk..',
    '..kkkk...',
    '....dd...',
    '.....dd..',
  ], { k: 0x1e2a5a, b: 0x5a8ae8, w: 0xffffff, d: 0xc8a070 }, 300, 182);
  g.ell(14, 190, 5, 4, (x, y, nx, ny) => (nx + ny < -0.5 ? 0xffffff : (Math.round(nx * 6 + ny * 3) % 3 === 0 ? red : 0xffe878)));
  g.ring(14, 190, 5, 4, 0x6a3a1a); g.line(14, 186, 18, 181, 0xffffff);
}

// --- sentai: the quarry showdown, five-colour explosion ------------------------------------------
function sentai(g, s) {
  const W = g.w;
  const pr = rng(341);

  // ---- hero-intro sky: blue gradient with soft radial rays
  const sky = [0x2f78e0, 0x3f8cec, 0x58a6f2, 0x7cc0f6, 0xa8dcfa, 0xd6f0fc];
  for (let y = 0; y < 140; y++) for (let x = 0; x < W; x++) {
    let c = tone(x, y, y / 120, sky, 0.45);
    const a = Math.atan2(y - 128, x - 160);
    if (Math.floor((a + Math.PI) / (Math.PI / 14)) % 2 === 0) c = mix(c, 0xffffff, 0.1);
    g.px(x, y, c);
  }
  const cpal = [0xffffff, 0xf4f8ff, 0xd8e6f8, 0xb8cce8];
  cloud(g, 36, 70, [[-14, 2, 8], [-3, -3, 11], [10, 0, 9], [20, 4, 6]], cpal);
  cloud(g, 290, 62, [[-12, 2, 7], [0, -3, 10], [12, 1, 8]], cpal);
  cloud(g, 120, 82, [[-6, 1, 4], [2, -1, 6], [9, 1, 4]], cpal);
  bird(g, 210, 70, 0x3a5a8a, true); bird(g, 222, 76, 0x3a5a8a);

  // ---- far mountains
  ridge(g, 0, W, (x) => 104 + 8 * Math.sin(x * 0.03 + 0.5) + 4 * Math.sin(x * 0.09), 140, (x, y, d) => (d === 0 ? 0xc8dcf0 : tone(x, y, d / 16, [0xa8c4e4, 0x90b0d8])));
  ridge(g, 0, W, (x) => 118 + 5 * Math.sin(x * 0.05 + 2) + 2 * Math.sin(x * 0.17), 140, (x, y, d) => (d === 0 ? 0xb8d8a8 : tone(x, y, d / 10, [0x9cc890, 0x84b47c])));

  // ---- stepped quarry cliffs framing both sides
  const strata = [0xe8bc7c, 0xdaa864, 0xcc9452, 0xbc8244, 0xd8a868];
  const cliff = (x, steps) => { for (const [a, b, top] of steps) if (x >= a && x < b) return top; return null; };
  const L = [[0, 26, 34], [26, 52, 56], [52, 78, 80], [78, 100, 108], [100, 112, 128]];
  const R = [[208, 222, 128], [222, 244, 106], [244, 268, 82], [268, 294, 58], [294, 320, 38]];
  for (const steps of [L, R]) for (let x = 0; x < W; x++) {
    const top = cliff(x, steps);
    if (top == null) continue;
    const edgeR = steps === L ? steps.some(([, b]) => x === b - 1 || x === b - 2) : steps.some(([a]) => x === a || x === a + 1);
    for (let y = top; y < 142; y++) {
      const band = Math.floor((y + Math.round(2 * Math.sin(x * 0.08))) / 6) % strata.length;
      let c = strata[band];
      if (y === top) c = 0xfae2b0;
      else if (y === top + 1) c = 0xf0cc90;
      else if (y < top + 4 && bay(x, y) < 0.5) c = 0xf0cc90;
      if (edgeR) c = steps === L ? dk(c, 0.18) : lt(c, 0.18);
      if ((y + Math.round(2 * Math.sin(x * 0.08))) % 6 === 0) c = dk(c, 0.12);
      g.px(x, y, c);
    }
  }
  // deliberate cracks + shrubs on the ledges
  for (const [x, y, h] of [[12, 60, 10], [40, 84, 8], [66, 100, 9], [90, 120, 6], [232, 120, 7], [256, 98, 9], [282, 80, 10], [306, 56, 12]]) {
    for (let k = 0; k < h; k++) g.px(x + (k % 3 === 2 ? 1 : 0), y + k, 0x8a5a34);
  }
  for (const [x, y] of [[8, 34], [34, 56], [60, 80], [88, 108], [228, 106], [252, 82], [280, 58], [306, 38]]) {
    foliage(g, [[x, y - 2, 4, 0], [x + 5, y - 1, 3, 0.05]], [0xa8d870, 0x78b850, 0x4e8a3a, 0x2e5a2a], 0x24401e);
  }

  // ---- the five-colour explosion in front of the cliffs
  const fire = [0xffffff, 0xfff6c0, 0xffd860, 0xff9a3a];
  const blasts = [
    [72, 116, 16, [0xc8f4b0, 0x7ad86a, 0x3aa84a, 0x1e6a32]],
    [110, 102, 19, [0xb8dcff, 0x5aa0f0, 0x2f6fd6, 0x1e3a8a]],
    [160, 92, 24, [0xffc0b0, 0xff6a5a, 0xd83a3a, 0x8a1e2a]],
    [210, 102, 19, [0xfff6b0, 0xffe060, 0xf0b020, 0xa86a10]],
    [248, 116, 16, [0xffd4e6, 0xff9ac4, 0xe86a9a, 0x9a3a6a]],
  ];
  for (const [x, y, r, pal] of blasts) {
    g.light(x, y + r * 0.6, r * 2.2, r * 1.4, pal[1], 0.25, 0.8);
    cloud(g, x, y, [[-r * 0.6, r * 0.25, r * 0.55 | 0], [0, -r * 0.2, r * 0.75 | 0], [r * 0.6, r * 0.2, r * 0.55 | 0], [-r * 0.2, r * 0.45, r * 0.5 | 0], [r * 0.3, -r * 0.55, r * 0.45 | 0]].map(([a, b, c]) => [Math.round(a), Math.round(b), c]), pal, 0.7);
  }
  for (const [x, y, r] of blasts) { // fiery cores at the base of each blast
    g.ell(x, y + r * 0.75, r * 0.5, r * 0.28, (xx, yy, nx, ny) => tone(xx, yy, 0.15 + Math.hypot(nx, ny) * 0.8, fire, 0.5));
  }
  // flying debris with motion streaks + sparks
  for (let i = 0; i < 16; i++) {
    const [bx, by, br] = blasts[i % 5];
    const a = -Math.PI * (0.15 + pr() * 0.7), d = br * (1.1 + pr() * 0.7);
    const x = Math.round(bx + Math.cos(a) * d), y = Math.round(by + Math.sin(a) * d * 0.8);
    if (i % 2) {
      g.rect(x, y, 2, 2, 0x5a4636); g.px(x, y, 0x8a7460);
      for (let k = 1; k < 5; k++) g.px(x - Math.round(Math.cos(a) * k * 1.4), y - Math.round(Math.sin(a) * k * 1.4) + 1, k < 3 ? 0xd8c8b0 : 0xe8dcc8);
    } else twinkle(g, x, y, 0xffffff, 0xfff0a0, i % 4 === 0);
  }

  // ---- quarry floor (figure band)
  for (let y = 138; y < 200; y++) for (let x = 0; x < W; x++) {
    const t = (y - 138) / 62;
    g.px(x, y, tone(x, y, 0.1 + t * 0.8, [0xf2d8a4, 0xe6c68c, 0xd8b276, 0xc89e64], 0.2));
  }
  g.hl(0, W, 138, 0xc89e64);
  // dust rolling out from the blasts along the ground
  const dust = [0xfffaf0, 0xf6e8cc, 0xe8d2a8, 0xd4b886];
  for (const [x, w] of [[72, 20], [116, 18], [160, 26], [204, 18], [248, 20]]) cloud(g, x, 139, [[-w * 0.6 | 0, 1, 5], [0, -1, 7], [w * 0.6 | 0, 1, 5]], dust, 0.6);
  // tyre tracks curving across
  for (const off of [0, 7]) for (let x = 0; x < W; x++) {
    const y = Math.round(176 + off + 10 * Math.sin(x * 0.012 + 0.6));
    g.px(x, y, x % 3 === 0 ? 0xa88050 : 0xc29a64); g.px(x, y + 1, 0xe8cc96);
  }
  // rocks
  for (const [x, y, r] of [[22, 150, 4], [44, 196, 3], [128, 146, 2], [196, 147, 2], [214, 192, 3], [300, 152, 4], [276, 197, 2], [88, 160, 2]]) {
    const M = new Mask(g.w, g.h).ell(x, y, r + 1, r * 0.7);
    M.fill(g, (xx, yy) => (yy < y - r * 0.2 ? 0xd8c8b4 : xx > x ? 0x8a7a68 : 0xb0a08c));
    M.outline(g, 0x5a4a3a);
    g.hl(x - r - 1, x + r + 1, Math.round(y + r * 0.7) + 1, 0xb88e58);
  }
  // clapperboard dropped on the ground: TAKE 3
  {
    const x = 62, y = 182;
    g.poly([[x, y - 4], [x + 22, y - 9], [x + 23, y - 6], [x + 1, y - 1]], 0x2a2a30);
    for (let i = 0; i < 5; i++) g.poly([[x + 2 + i * 4.4, y - 2 - i], [x + 4 + i * 4.4, y - 3 - i], [x + 6 + i * 4.4, y - 7 - i * 0.9], [x + 4 + i * 4.4, y - 6 - i * 0.9]], 0xffffff);
    g.rect(x, y, 24, 12, 0x2a2a30); g.frame(x, y, 24, 12, 0x14141a); g.hl(x, x + 23, y + 5, 0x6a6a74);
    g.tiny('TAKE3', x + 2, y + 1, 0xffffff);
    g.hl(x + 2, x + 21, y + 8, 0x8a8a94);
    g.hl(x, x + 24, y + 12, 0xb88e58);
  }
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
  neko_cafe: wrap(neko_cafe, 31),
  wagashi: wrap(wagashi, 32),
  matsuri: wrap(matsuri, 33),
  sentai: wrap(sentai, 34),
};

export const BANNER_TEXT = {
  neko_cafe: { catch: 'ようこそ、ねこの喫茶店へ！', sub: '午後のひだまり珈琲' },
  wagashi: { catch: 'あまくてやさしい和の味♪', sub: '春のお茶会へようこそ' },
  matsuri: { catch: 'ドドンと開幕！夏まつり', sub: '夜店通りは大にぎわい' },
  sentai: { catch: '変身！ちびっこヒーロー参上！', sub: '石切場の大決戦' },
};

/** Every glyph the scenes draw with p.text in DotGothic16 (preload with document.fonts.load). */
export const SCENE_TEXT = '氷たこ焼わたあめ金魚すくい';
