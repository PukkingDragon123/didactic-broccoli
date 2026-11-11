// Hand-pixelled banner scenes for the series ported in phase 12 (hoshitate, bungu, kaden, oden, shotengai, haniwa,
// chibitto, lanepals). Same contract and helpers as bannerScenes2.js (copied so each file stays independent).
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

// ---------------------------------------------------------------------------------------------
// scenes
// ---------------------------------------------------------------------------------------------
/** A floor band from y0 to the bottom with a lit front edge and a few planks / tiles. */
function floor(g, y0, ramp, seam = null, step = 24) {
  for (let y = y0; y < g.h; y++) for (let x = 0; x < g.w; x++) g.px(x, y, tone(x, y, (y - y0) / (g.h - y0), ramp, 0.5));
  g.hl(0, g.w - 1, y0, lt(ramp[0], 0.3));
  if (seam != null) for (let x = (y0 * 7) % step; x < g.w; x += step) g.vl(x, y0 + 1, g.h - 1, seam);
}
function sky(g, y1, ramp) { for (let y = 0; y < y1; y++) for (let x = 0; x < g.w; x++) g.px(x, y, tone(x, y, y / y1, ramp, 0.5)); }

function hoshitate(g) {
  sky(g, 150, [0x5aa8e8, 0x78bcf0, 0x9ad0f6, 0xc6e6fa]);
  const cp = [0xffffff, 0xf2f8ff, 0xd8e8f6, 0xbcd4ec];
  cloud(g, 60, 40, [[-16, 2, 9], [-4, -4, 12], [10, 0, 10], [22, 4, 6]], cp); cloud(g, 262, 54, [[-12, 2, 8], [0, -3, 11], [12, 1, 8]], cp);
  // the washing line with pegged towels and socks, poles at the sides
  for (const x of [10, 306]) { g.rect(x, 64, 4, 90, 0x8a8a96); g.vl(x, 64, 153, 0xb8b8c4); }
  for (let x = 12; x < 308; x++) g.px(x, 70 + Math.round(Math.sin(((x - 12) / 296) * Math.PI) * 10), 0x5a5a66);
  const hang = [[34, 0xf2a0b0, 18, 22], [58, 0xffffff, 14, 30], [258, 0x9fd6c2, 16, 26], [282, 0xf6d77a, 12, 18]];
  for (const [x, c, w, h] of hang) { const y = 70 + Math.round(Math.sin(((x - 12) / 296) * Math.PI) * 10); g.rect(x - w / 2, y, w, h, c); g.rect(x - w / 2, y + h - 2, w, 2, dk(c, 0.2)); g.vl(x - w / 2, y, y + h - 1, lt(c, 0.3)); g.rect(x - 2, y - 2, 4, 4, 0xe8483a); }
  // balcony railing and concrete floor
  floor(g, 152, [0xb8b4ac, 0xa8a49c, 0x96928a], 0x8a867e, 32);
  for (let x = 0; x < g.w; x += 8) g.rect(x, 128, 2, 24, 0xd8d8e0);
  g.rect(0, 126, g.w, 3, 0xe8e8f0); g.hl(0, g.w - 1, 129, 0x9a9aa6);
}
function bungu(g) {
  // a notebook page backdrop: ruled lines, a red margin, doodles; a wooden desk as the floor
  g.rect(0, 0, g.w, 150, 0xfbf8ee);
  for (let y = 14; y < 150; y += 10) g.hl(0, g.w - 1, y, 0xc8d8ec);
  g.vl(36, 0, 149, 0xe8908a); g.vl(37, 0, 149, 0xf2b8b0);
  for (const [x, y] of [[300, 30], [290, 92], [52, 110]]) { g.ring(x, y, 7, 7, 0x8aa0c8); g.px(x - 2, y - 2, 0x8aa0c8); g.px(x + 2, y - 2, 0x8aa0c8); g.hl(x - 2, x + 2, y + 3, 0x8aa0c8); }
  floor(g, 150, [0xc8965a, 0xb88450, 0xa87444], 0x9a6a3e, 40);
  for (let x = 0; x < g.w; x += 3) if (bay(x, 160) > 0.6) g.px(x, 160 + (x % 7), 0xd8a868);
  // pencils lying at the sides
  for (const [x0, c] of [[6, 0xf2c84a], [262, 0x4a8ad8]]) { g.rect(x0, 166, 46, 6, c); g.hl(x0, x0 + 45, 166, lt(c, 0.3)); g.rect(x0 + 46, 166, 5, 6, 0xf2d8a8); g.rect(x0 + 51, 168, 2, 2, 0x3a3a40); g.rect(x0 - 4, 166, 4, 6, 0xf2a0b0); }
}
function kaden(g) {
  // a Shōwa kitchen wall in square tiles, a calendar and a shelf; checkered linoleum floor
  for (let y = 0; y < 150; y++) for (let x = 0; x < g.w; x++) g.px(x, y, (x % 16 === 0 || y % 16 === 0) ? 0xc8d8d0 : tone(x, y, y / 150, [0xe8f2ec, 0xdceae2], 0.5));
  g.rect(0, 112, g.w, 4, 0x8a5a32); g.hl(0, g.w - 1, 112, 0xa87a4a);
  g.rect(16, 24, 34, 44, 0xfbf8f0); g.rect(16, 24, 34, 10, 0xd8302a); g.tiny('1975', 22, 27, 0xffffff); for (let i = 0; i < 20; i++) g.rect(19 + (i % 5) * 6, 38 + Math.floor(i / 5) * 7, 4, 4, i === 13 ? 0xd8302a : 0x9a9aa6);
  g.rect(262, 30, 46, 4, 0x8a5a32); g.rect(266, 14, 12, 16, 0xf2f0e8); g.rect(282, 18, 10, 12, 0xe8c040); g.rect(296, 20, 8, 10, 0x7ac8b8);
  for (let y = 150; y < g.h; y++) for (let x = 0; x < g.w; x++) g.px(x, y, ((Math.floor(x / 12) + Math.floor((y - 150) / 8)) & 1) ? 0xd8c8a8 : 0xb8d0c0);
  g.hl(0, g.w - 1, 150, 0xf2ecd8);
}
function oden(g) {
  // night: deep sky, a red lantern row, the yatai's steaming counter as the floor
  sky(g, 150, [0x1a1a3a, 0x24244a, 0x30305a, 0x3a3a68]);
  for (const [x, y] of [[40, 20], [120, 34], [212, 14], [290, 40], [176, 52]]) g.px(x, y, 0xfff6d8);
  for (let x = 0; x < g.w; x++) g.px(x, 30 + Math.round(Math.sin(x / 50) * 4), 0x6a6a7a);
  for (const x of [24, 64, 256, 296]) { const y = 34 + Math.round(Math.sin(x / 50) * 4); g.light(x, y + 12, 22, 20, 0xffa040, 0.3, 0.6); g.ell(x, y + 12, 9, 12, 0xd8302a); for (let k = -9; k < 10; k += 4) g.hl(x - 9, x + 9, y + 12 + k, 0xa8201a); g.rect(x - 5, y, 10, 3, 0x1a1a1e); g.rect(x - 5, y + 23, 10, 3, 0x1a1a1e); g.text('おでん'[(x / 40) % 3 | 0] || 'お', x, y + 6, { size: 8, color: 0x1a1a1e, align: 'center' }); }
  g.rect(0, 140, g.w, 12, 0x2a3a6a); for (let x = 0; x < g.w; x += 40) g.vl(x, 140, 151, 0x1a2a4a);
  floor(g, 152, [0xa87a4a, 0x946a3e, 0x7a5432], 0x6a4428, 60);
  for (let x = 120; x < 200; x++) for (let y = 156; y < 172; y++) g.px(x, y, ((x + y) & 3) ? 0xc89a5a : 0xb8884a);
}
function shotengai(g) {
  // a covered shopping street: arched roof ribs, shop fronts with awnings and signs, festive flags, paved floor
  sky(g, 150, [0xe8e2d0, 0xdcd4bc, 0xd0c6aa]);
  for (let x = 0; x < g.w; x += 20) for (let y = 0; y < 40; y++) g.px(x + Math.round(Math.sin(y / 12) * 2), y, 0xa89a7a);
  g.rect(0, 38, g.w, 3, 0x8a7a5a);
  const shops = [[0, 56, 0xd8302a, '魚'], [56, 54, 0x3a8a4a, '花'], [214, 54, 0x8a5a32, '珈琲'], [268, 52, 0x2a5aa8, '湯']];
  for (const [x, w, c, t] of shops) { g.rect(x, 52, w, 98, 0xe8dcc0); g.rect(x, 52, w, 14, 0x3a2a24); g.text(t, x + w / 2, 54, { size: 10, color: 0xfbf0d8, align: 'center' }); for (let i = 0; i < w; i += 8) g.rect(x + i, 66, 4, 12, c); g.rect(x, 66, w, 2, dk(c, 0.3)); g.rect(x + 6, 90, w - 12, 46, 0x6a5a4a); g.rect(x + 8, 92, w - 16, 42, 0xa8c8d0); }
  for (let x = 0; x < g.w; x++) g.px(x, 44 + Math.round(Math.abs(Math.sin(x / 40)) * 6), 0x5a4a3a);
  for (let x = 6; x < g.w; x += 12) { const y = 45 + Math.round(Math.abs(Math.sin(x / 40)) * 6); g.poly([[x, y], [x + 8, y], [x + 4, y + 8]], [0xd8302a, 0xf2c23a, 0x3a8ae8, 0x3a9a4a][(x / 12) % 4 | 0]); }
  floor(g, 150, [0xc8bca8, 0xb8ac98, 0xa89c88], 0x9a8e7a, 20);
}
function haniwa(g) {
  // an excavation at sunset: a keyhole kofun mound on the horizon, earth strata and a grid string as the floor
  sky(g, 140, [0xf2c890, 0xf0b07a, 0xe8946a, 0xc87a6a]);
  g.ell(250, 46, 14, 14, 0xfff0c0);
  ridge(g, 0, g.w, (x) => 116 + 4 * Math.sin(x * 0.04), 140, (x, y, d) => (d === 0 ? 0x8a9a5a : tone(x, y, d / 20, [0x6a8a4a, 0x5a7a40])));
  for (let x = 90; x < 230; x++) { const t = (x - 90) / 140, h = t < 0.45 ? Math.sqrt(1 - ((t - 0.22) / 0.24) ** 2) * 26 : Math.max(0, 1 - Math.abs(t - 0.72) / 0.3) * 18; for (let y = Math.round(116 - (h || 0)); y < 118; y++) g.px(x, y, tone(x, y, (y - 90) / 30, [0x4a7a3a, 0x3a6a30])); }
  for (let y = 140; y < g.h; y++) for (let x = 0; x < g.w; x++) g.px(x, y, tone(x, y, (y - 140) / 60, [0xb87a4a, 0xa86a3e, 0x8a5a34, 0x7a4c2c], 0.4));
  for (let y = 150; y < g.h; y += 14) g.hl(0, g.w - 1, y, 0xe8e0c8);
  for (let x = 20; x < g.w; x += 40) g.vl(x, 140, g.h - 1, 0xe8e0c8);
  for (const [x, y] of [[40, 170], [280, 182], [150, 192]]) { g.rect(x, y, 8, 3, 0xd8a070); g.px(x + 2, y + 1, 0x7a4c2c); }
}
function chibitto(g) {
  // rooftops against a dusk sky in hard bands, wires, a water tank, the first stars
  const bands = [0x2a2a5a, 0x3e3470, 0x6a4080, 0xa84c7c, 0xe0706a, 0xf6a868];
  for (let y = 0; y < 148; y++) for (let x = 0; x < g.w; x++) g.px(x, y, tone(x, y, y / 148, bands, 0.4));
  for (const [x, y] of [[40, 22], [118, 48], [210, 18], [300, 40], [266, 14]]) { g.px(x, y, 0xfff6d8); g.px(x + 1, y, 0xd8c8e8); }
  const R = 0x241c34, R2 = 0x30263f;
  const gable = (x0, w, top, col) => { for (let y = top; y < 150; y++) { const k = Math.min(1, (y - top) / (w * 0.32)), hw = Math.round((w / 2) * k); g.rect(Math.round(x0 + w / 2 - hw), y, hw * 2, 1, col); } };
  gable(-10, 90, 96, R2); gable(66, 70, 108, R); gable(220, 100, 92, R2);
  g.rect(130, 84, 80, 66, R); g.rect(150, 66, 26, 18, 0x2a2238); g.rect(148, 64, 30, 3, 0x3a2e4a);
  for (const wx of [140, 160, 180, 196]) g.rect(wx, 100, 7, 6, 0xf2c86a);
  for (const px of [52, 262]) g.rect(px, 50, 3, 100, 0x1e1828);
  for (let x = 0; x < g.w; x++) { const t = x < 52 ? x / 52 : x < 262 ? (x - 52) / 210 : (x - 262) / 58; g.px(x, 56 + Math.round(Math.sin(t * Math.PI) * (x < 52 || x > 262 ? 4 : 12)), 0x1e1828); }
  floor(g, 150, [0x4a4060, 0x3e3654, 0x342c48], 0x2a2440, 30);
}
function lanepals(g) {
  // the back lane: block walls, a utility pole with a poster, potted plants, a manhole in the lane
  sky(g, 70, [0xb8d8f0, 0xcce4f4]);
  for (let y = 40; y < 150; y++) for (let x = 0; x < g.w; x++) g.px(x, y, ((y - 40) % 10 === 0 || ((x + (Math.floor((y - 40) / 10) & 1) * 10) % 20 === 0)) ? 0x9a968c : tone(x, y, (y - 40) / 110, [0xc8c4b8, 0xb8b4a8], 0.5));
  g.rect(0, 38, g.w, 3, 0xa8a49a);
  g.rect(292, 0, 10, 150, 0x8a8478); g.vl(292, 0, 149, 0xa8a296); g.rect(282, 20, 30, 3, 0x6a665e);
  g.rect(286, 70, 22, 30, 0xf2ecd8); g.text('迷い猫', 297, 72, { size: 7, color: 0xd8302a, align: 'center' }); g.rect(290, 84, 14, 12, 0xe8a04a);
  for (const [x, c] of [[14, 0xd8603a], [36, 0x6a8ab8]]) { g.rect(x, 132, 16, 18, c); g.hl(x, x + 15, 132, lt(c, 0.3)); g.ell(x + 8, 124, 11, 10, 0x4a8a3a); g.ell(x + 5, 120, 5, 4, 0x6aa84a); }
  floor(g, 150, [0x9a968c, 0x8a867c, 0x7a766c], 0x6a665e, 46);
  g.ell(200, 176, 18, 6, 0x5a5a5e); g.ring(200, 176, 18, 6, 0x4a4a4e);
}

const wrap = (fn, seed) => (p, x, y, w, h, s) => {
  const g = new G(p, x, y, w, h, seed);
  g.rect(0, 0, g.w, g.h, hex(s.card.bg));
  fn(g, s);
  reducePalette(g);
  p.dirty = true;
};

export const SCENES = {
  hoshitate: wrap(hoshitate, 41), bungu: wrap(bungu, 42), kaden: wrap(kaden, 43), oden: wrap(oden, 44),
  shotengai: wrap(shotengai, 45), haniwa: wrap(haniwa, 46), chibitto: wrap(chibitto, 47), lanepals: wrap(lanepals, 48),
};
// catchphrases from the series' own flyers
export const BANNER_TEXT = {
  hoshitate: { catch: 'きょうは、よく乾く。', sub: 'せんたくばさみつき' },
  bungu: { catch: 'つくえの中は、どうぶつえん。', sub: 'ほんとに動くギミックつき' },
  kaden: { catch: 'コンセントに、むしがいる。', sub: 'フタ・ハネがひらく' },
  oden: { catch: 'あさから、ぐつぐつ。', sub: 'からしつき' },
  shotengai: { catch: 'へい、いらっしゃい。', sub: 'ミニチュアのお店' },
  haniwa: { catch: 'ずっと、おどろいてる。', sub: '博物館の台座つき' },
  chibitto: { catch: 'ちいさくても、主人公。', sub: '変身・抜刀・出撃！' },
  lanepals: { catch: 'みんな、ちいさくなっちゃった。', sub: 'あの路地のひとたち' },
};
export const SCENE_TEXT = 'おでん魚花珈琲湯迷い猫';
