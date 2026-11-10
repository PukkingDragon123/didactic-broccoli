// The label studio's pixel canvas: a small buffer of whole pixels (one colour each, or nothing) with the handful of
// tools a packaging artist needs: flat fills, hard lines, ellipses and polygons on pixel centres, ordered dithering,
// sprites from rows of characters, 1-bit masks (lettering), a hard outline round whatever is drawn, a hard drop shadow.
// No anti-aliasing, no gradients, no blending: every pixel is one of the label's inks.
//   const p = new Px(104, 112)       p.rect / ell / poly / line / dither / sprite / blit / mask / outline
//   colours are 0xRRGGBB numbers (or (x, y) => colour for patterns); NONE (-1) is "no ink"
export const NONE = -1;

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered-dither test at a pixel for coverage t (0..1). */
export const dith = (x, y, t) => (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < t;
/** A 2 x 2 checker test (the classic 50% dither). */
export const chk = (x, y) => ((x + y) & 1) === 0;

export const cr = (c) => (c >> 16) & 255, cg = (c) => (c >> 8) & 255, cb = (c) => c & 255;
export const rgb = (r, g, b) => (Math.max(0, Math.min(255, Math.round(r))) << 16) | (Math.max(0, Math.min(255, Math.round(g))) << 8) | Math.max(0, Math.min(255, Math.round(b)));
export const mix = (a, b, t) => rgb(cr(a) + (cr(b) - cr(a)) * t, cg(a) + (cg(b) - cg(a)) * t, cb(a) + (cb(b) - cb(a)) * t);
/** A darker ink of the same colour (leans to plum, as printed shadows do) / a lighter one (leans to warm paper). */
export const dk = (c, k = 0.25) => mix(c, 0x241a30, k);
export const lt = (c, k = 0.25) => mix(c, 0xfffaec, k);
export const lum = (c) => (cr(c) * 0.3 + cg(c) * 0.59 + cb(c) * 0.11) / 255;
/** Black or white ink, whichever reads on c. */
export const on = (c, dark = 0x241a1e, light = 0xfffaf0) => (lum(c) > 0.56 ? dark : light);
export const css = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');

const val = (c, x, y) => (typeof c === 'function' ? c(x, y) : c);

export class Px {
  constructor(w, h, c = NONE) {
    this.w = w; this.h = h;
    this.d = new Int32Array(w * h).fill(c);
    this.x0 = 0; this.y0 = 0; this.x1 = w; this.y1 = h; // clip
  }
  /** Limit drawing to a box (returns this); clip() with no arguments lifts it. */
  clip(x, y, w, h) {
    if (x === undefined) { this.x0 = 0; this.y0 = 0; this.x1 = this.w; this.y1 = this.h; return this; }
    this.x0 = Math.max(0, x); this.y0 = Math.max(0, y); this.x1 = Math.min(this.w, x + w); this.y1 = Math.min(this.h, y + h);
    return this;
  }
  set(x, y, c) {
    if (c === NONE || c === undefined || c === null) return this;
    if (x < this.x0 || y < this.y0 || x >= this.x1 || y >= this.y1) return this;
    this.d[y * this.w + x] = c;
    return this;
  }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? NONE : this.d[y * this.w + x]; }
  has(x, y) { return this.get(x, y) !== NONE; }
  fill(c) { for (let y = this.y0; y < this.y1; y++) for (let x = this.x0; x < this.x1; x++) this.set(x, y, val(c, x, y)); return this; }
  rect(x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const fn = typeof c === 'function';
    if (!fn && (c === NONE || c === undefined || c === null)) return this;
    for (let j = Math.max(y, this.y0); j < Math.min(y + h, this.y1); j++) for (let i = Math.max(x, this.x0); i < Math.min(x + w, this.x1); i++) {
      if (!fn) { this.d[j * this.w + i] = c; continue; }
      const v = c(i, j);
      if (v !== NONE && v !== undefined && v !== null) this.d[j * this.w + i] = v;
    }
    return this;
  }
  /** Erase to "no ink". */
  cut(x, y, w, h) { for (let j = Math.max(y, 0); j < Math.min(y + h, this.h); j++) for (let i = Math.max(x, 0); i < Math.min(x + w, this.w); i++) this.d[j * this.w + i] = NONE; return this; }
  frame(x, y, w, h, c, t = 1) { this.rect(x, y, w, t, c); this.rect(x, y + h - t, w, t, c); this.rect(x, y + t, t, h - 2 * t, c); this.rect(x + w - t, y + t, t, h - 2 * t, c); return this; }
  hline(x0, x1, y, c) { return this.rect(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, c); }
  vline(x, y0, y1, c) { return this.rect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, c); }
  /** A hard line, t pixels thick (square brush). */
  line(x0, y0, x1, y1, c, t = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), o = Math.floor((t - 1) / 2);
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n);
      if (t === 1) this.set(x, y, val(c, x, y)); else this.rect(x - o, y - o, t, t, c);
    }
    return this;
  }
  /** A path of straight pieces. */
  path(pts, c, t = 1, close = false) {
    for (let k = 0; k + 1 < pts.length; k++) this.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], c, t);
    if (close && pts.length > 2) this.line(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], c, t);
    return this;
  }
  /** Any shape by test: inside(x + .5, y + .5) over a box. */
  shape(x, y, w, h, inside, c) {
    x = Math.floor(x); y = Math.floor(y);
    for (let j = y; j < y + Math.ceil(h) + 1; j++) for (let i = x; i < x + Math.ceil(w) + 1; i++) if (inside(i + 0.5, j + 0.5)) this.set(i, j, val(c, i, j));
    return this;
  }
  /** Filled ellipse: centre (cx, cy) in pixel units (x.5 for an even width), radii rx, ry. */
  ell(cx, cy, rx, ry, c) {
    if (rx <= 0 || ry <= 0) return this;
    return this.shape(cx - rx, cy - ry, rx * 2, ry * 2, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, c);
  }
  /** Ring: the ellipse minus the one t pixels inside it. */
  ring(cx, cy, rx, ry, t, c) {
    const ix = Math.max(0.01, rx - t), iy = Math.max(0.01, ry - t);
    return this.shape(cx - rx, cy - ry, rx * 2, ry * 2, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && ((x - cx) / ix) ** 2 + ((y - cy) / iy) ** 2 > 1, c);
  }
  /** The part of an ellipse NOT covered by the same ellipse moved by (dx, dy): a shading crescent. */
  crescent(cx, cy, rx, ry, dx, dy, c) {
    return this.shape(cx - rx, cy - ry, rx * 2, ry * 2, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && ((x - cx - dx) / rx) ** 2 + ((y - cy - dy) / ry) ** 2 > 1, c);
  }
  /** Filled polygon (pixel centres inside). */
  poly(pts, c) {
    let y0 = Infinity, y1 = -Infinity;
    for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let j = Math.floor(y0); j <= Math.ceil(y1); j++) {
      const yc = j + 0.5, xs = [];
      for (let k = 0; k < pts.length; k++) {
        const [xa, ya] = pts[k], [xb, yb] = pts[(k + 1) % pts.length];
        if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) xs.push(xa + (yc - ya) / (yb - ya) * (xb - xa));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let i = Math.round(xs[k]); i < Math.round(xs[k + 1]); i++) this.set(i, j, val(c, i, j));
    }
    return this;
  }
  /** Rounded rectangle (corner radius r in pixels). */
  rrect(x, y, w, h, r, c) {
    r = Math.min(r, w / 2, h / 2);
    return this.shape(x, y, w - 1, h - 1, (px, py) => {
      if (px < x || py < y || px > x + w || py > y + h) return false;
      const dx = Math.max(0, x + r - px, px - (x + w - r)), dy = Math.max(0, y + r - py, py - (y + h - r));
      return dx * dx + dy * dy <= r * r;
    }, c);
  }
  /** A star burst: n points, outer radius r1, inner r0, turned by rot. */
  burst(cx, cy, r1, r0, n, c, rot = 0) {
    const pts = [];
    for (let k = 0; k < n * 2; k++) { const a = rot + k * Math.PI / n, r = k % 2 ? r0 : r1; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return this.poly(pts, c);
  }
  /** Ordered dither of colour c over a box; t: coverage 0..1 or (x, y) => coverage. Only inked pixels if `over`. */
  dither(x, y, w, h, c, t, over = false) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (over && !this.has(i, j)) continue;
      if (dith(i, j, typeof t === 'function' ? t(i, j) : t)) this.set(i, j, val(c, i, j));
    }
    return this;
  }
  /** Recolour existing pixels in a box: fn(colour, x, y) -> colour (or undefined to keep). */
  map(x, y, w, h, fn) {
    for (let j = Math.max(y, this.y0); j < Math.min(y + h, this.y1); j++) for (let i = Math.max(x, this.x0); i < Math.min(x + w, this.x1); i++) {
      const c = this.d[j * this.w + i];
      if (c === NONE) continue;
      const n = fn(c, i, j);
      if (n !== undefined && n !== null) this.d[j * this.w + i] = n;
    }
    return this;
  }
  /** A sprite from rows of characters: pal maps a character to a colour ('.' and ' ' are empty). o: { flip, s } */
  sprite(rows, pal, x, y, o = {}) {
    const s = o.s || 1, W = rows[0].length;
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = pal[row[i]];
        if (c === undefined || c === NONE) continue;
        const xx = o.flip ? W - 1 - i : i;
        if (s === 1) this.set(x + xx, y + j, c); else this.rect(x + xx * s, y + j * s, s, s, c);
      }
    });
    return this;
  }
  /** Copy another Px in (its empty pixels stay empty). o: { flip, s (whole-number scale), map(c, x, y) } */
  blit(src, x, y, o = {}) {
    const s = o.s || 1;
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      let c = src.d[j * src.w + i];
      if (c === NONE) continue;
      if (o.map) c = o.map(c, i, j);
      const xx = o.flip ? src.w - 1 - i : i;
      if (s === 1) this.set(x + xx, y + j, c); else this.rect(x + xx * s, y + j * s, s, s, c);
    }
    return this;
  }
  /** A 1-bit mask (src/products/type.js) in one colour. */
  mask(m, x, y, c) {
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.b[j * m.w + i]) this.set(x + i, y + j, val(c, x + i, y + j));
    return this;
  }
  /** A hard outline round everything inked so far (drawn on empty pixels only). diag: corners too. */
  outline(c, diag = false) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.d[y * this.w + x] !== NONE) continue;
      if (this.has(x - 1, y) || this.has(x + 1, y) || this.has(x, y - 1) || this.has(x, y + 1) || (diag && (this.has(x - 1, y - 1) || this.has(x + 1, y - 1) || this.has(x - 1, y + 1) || this.has(x + 1, y + 1)))) add.push(y * this.w + x);
    }
    for (const i of add) this.d[i] = c;
    return this;
  }
  /** A hard drop shadow of everything inked so far, on empty pixels. */
  shadow(dx, dy, c) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.d[y * this.w + x] === NONE && this.has(x - dx, y - dy)) add.push(y * this.w + x);
    for (const i of add) this.d[i] = c;
    return this;
  }
  /** Twice the size with the stair-steps smoothed (EPX / Scale2x): a 24 px mascot becomes a 48 px one, still whole pixels. */
  x2() {
    const o = new Px(this.w * 2, this.h * 2), g = (x, y) => this.get(Math.max(0, Math.min(this.w - 1, x)), Math.max(0, Math.min(this.h - 1, y)));
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const P = g(x, y), A = g(x, y - 1), B = g(x + 1, y), C = g(x - 1, y), D = g(x, y + 1);
      const i = (y * 2) * o.w + x * 2;
      o.d[i] = C === A && C !== D && A !== B ? A : P;
      o.d[i + 1] = A === B && A !== C && B !== D ? B : P;
      o.d[i + o.w] = D === C && D !== B && C !== A ? C : P;
      o.d[i + o.w + 1] = B === D && B !== A && D !== C ? D : P;
    }
    return o;
  }
  /** Mirrored left to right. */
  flip() { const o = new Px(this.w, this.h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.d[y * this.w + x] = this.d[y * this.w + this.w - 1 - x]; return o; }
  /** A copy with one pixel of empty margin all round (so outline() has room). */
  pad(n = 1) { const p = new Px(this.w + n * 2, this.h + n * 2); p.blit(this, n, n); return p; }
  /** A copy of a box. */
  sub(x, y, w, h) { const p = new Px(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.d[j * w + i] = this.get(x + i, y + j); return p; }
  /** The inked bounding box [x, y, w, h] (or null). */
  bounds() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.d[y * this.w + x] !== NONE) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
  }
  /** Trimmed to its ink. */
  trim() { const b = this.bounds(); return b ? this.sub(...b) : new Px(1, 1); }

  /** RGBA bytes (empty pixels: alpha 0, or `bg`). */
  bytes(bg = NONE) {
    const o = new Uint8ClampedArray(this.w * this.h * 4);
    for (let i = 0; i < this.d.length; i++) {
      let c = this.d[i];
      if (c === NONE) { if (bg === NONE) continue; c = bg; }
      o[i * 4] = (c >> 16) & 255; o[i * 4 + 1] = (c >> 8) & 255; o[i * 4 + 2] = c & 255; o[i * 4 + 3] = 255;
    }
    return o;
  }
  /** Draw onto a 2D canvas context at (x, y), each pixel s x s. */
  draw(ctx, x = 0, y = 0, s = 1) {
    let last = NONE;
    for (let j = 0; j < this.h; j++) {
      let i = 0;
      while (i < this.w) {
        const c = this.d[j * this.w + i];
        if (c === NONE) { i++; continue; }
        let n = 1;
        while (i + n < this.w && this.d[j * this.w + i + n] === c) n++;
        if (c !== last) { ctx.fillStyle = css(c); last = c; }
        ctx.fillRect(x + i * s, y + j * s, n * s, s);
        i += n;
      }
    }
    return this;
  }
  canvas(s = 1, bg = NONE) {
    const c = document.createElement('canvas');
    c.width = this.w * s; c.height = this.h * s;
    const g = c.getContext('2d');
    if (bg !== NONE) { g.fillStyle = css(bg); g.fillRect(0, 0, c.width, c.height); }
    this.draw(g, 0, 0, s);
    return c;
  }
}
