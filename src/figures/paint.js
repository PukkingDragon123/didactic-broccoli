// Painters for the toy-figure kit (src/figures/kit.js). Every texel knows its point on the part (mm, part-local, origin
// at the part's centre), the face normal, the point in figure space and its distance to the face outline, so
// paint is described on the object: a base colour, a material texture (vinyl, fur, cloth, wood, rice...), decals
// projected from a side (eyes, mouths, stripes, emblems, text) and a baked bevel / contact-shadow pass.
//
// A paint spec is a colour (0xrrggbb) or { c, t: texture, d: [decals], top, bot, side, g: [bottom, top] gradient,
// m: 'gloss' | 'metal' | 'glow' | 'glass', e: bevel strength (0 = off), k: tone multiplier, fn(c, o) }.
// Decals (D.*) take positions in mm in the projected plane: dir 'f' front (x, y), 'b' back, 'l' / 'r' the +x / -x
// side (looking at it), 't' top (x, -z), 'u' underneath, 'x' both sides (mirrored), '*' whichever side faces most.
import { h2, vnoise } from '../people/paintlib.js';

export const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const setc = (o, C) => { o[0] = C[0]; o[1] = C[1]; o[2] = C[2]; };
const mixInto = (o, C, t) => { o[0] += (C[0] - o[0]) * t; o[1] += (C[1] - o[1]) * t; o[2] += (C[2] - o[2]) * t; };
// pixel art: tones snap to a few clean steps (no smooth noise / gradients)
const QS = 0.07;
export const q = (k) => 1 + Math.round((k - 1) / QS) * QS;
const mul = (o, k) => { k = q(k); o[0] *= k; o[1] *= k; o[2] *= k; };
const qt = (t, n = 4) => Math.round(t * n) / n;
/** Tone with a warm shadow shift (shadows of toys go warm, not grey). */
const tone = (o, k) => { const d = 1 - k; o[0] *= k * (1 + d * 0.1); o[1] *= k; o[2] *= k * (1 - d * 0.12); };

export function paintCtx() {
  return { x: 0, y: 0, z: 0, X: 0, Y: 0, Z: 0, nx: 0, ny: 0, nz: 0, wny: 0, ed: 0, fv: 0, px: 0.3, kind: '', bb: null, p: null, a: 0, b: 0 };
}

// ------------------------------------------------------------------ projection
/** Sets c.a / c.b to the decal plane coordinates for direction dir; false when the face doesn't look that way. */
export function proj(c, dir) {
  switch (dir) {
    case 'f': if (c.nz < 0.22) return false; c.a = c.x; c.b = c.y; return true;
    case 'b': if (c.nz > -0.22) return false; c.a = -c.x; c.b = c.y; return true;
    case 'l': if (c.nx < 0.22) return false; c.a = -c.z; c.b = c.y; return true;
    case 'r': if (c.nx > -0.22) return false; c.a = c.z; c.b = c.y; return true;
    case 'x': if (Math.abs(c.nx) < 0.22) return false; c.a = c.nx > 0 ? -c.z : c.z; c.b = c.y; return true;
    case 't': if (c.ny < 0.22) return false; c.a = c.x; c.b = -c.z; return true;
    case 'u': if (c.ny > -0.22) return false; c.a = c.x; c.b = c.z; return true;
    case '*': {
      const ax = Math.abs(c.nx), ay = Math.abs(c.ny), az = Math.abs(c.nz);
      if (ay >= ax && ay >= az) { c.a = c.x; c.b = c.ny > 0 ? -c.z : c.z; } else if (az >= ax) { c.a = c.nz > 0 ? c.x : -c.x; c.b = c.y; } else { c.a = c.nx > 0 ? -c.z : c.z; c.b = c.y; }
      return true;
    }
    default: return true;
  }
}

// ------------------------------------------------------------------ signed distance shapes (mm)
export const SD = {
  circ: (x, y, r) => (a, b) => Math.hypot(a - x, b - y) - r,
  ell: (x, y, rx, ry) => (a, b) => { const k = Math.hypot((a - x) / rx, (b - y) / ry); return (k - 1) * Math.min(rx, ry); },
  rect: (x0, y0, x1, y1, r = 0) => {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = Math.abs(x1 - x0) / 2 - r, hy = Math.abs(y1 - y0) / 2 - r;
    return (a, b) => { const dx = Math.abs(a - cx) - hx, dy = Math.abs(b - cy) - hy; return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r; };
  },
  seg: (x0, y0, x1, y1, w) => (a, b) => {
    const ex = x1 - x0, ey = y1 - y0, L = ex * ex + ey * ey || 1;
    let t = ((a - x0) * ex + (b - y0) * ey) / L; t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(a - x0 - ex * t, b - y0 - ey * t) - w / 2;
  },
  /** Polyline (open) of width w. */
  path: (pts, w) => { const s = []; for (let i = 0; i + 1 < pts.length; i++) s.push(SD.seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w)); return (a, b) => { let d = 1e9; for (const f of s) { const v = f(a, b); if (v < d) d = v; } return d; }; },
  poly: (pts) => (a, b) => {
    let d = 1e9, inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > b) !== (yj > b) && a < ((xj - xi) * (b - yi)) / (yj - yi) + xi) inside = !inside;
      const ex = xi - xj, ey = yi - yj, L = ex * ex + ey * ey || 1;
      let t = ((a - xj) * ex + (b - yj) * ey) / L; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const v = Math.hypot(a - xj - ex * t, b - yj - ey * t);
      if (v < d) d = v;
    }
    return inside ? -d : d;
  },
  /** Arc of a circle / ellipse (t0..t1 radians, 0 = +x, counter-clockwise), stroke width w. */
  arc: (x, y, rx, ry, t0, t1, w) => (a, b) => {
    let t = Math.atan2((b - y) / ry, (a - x) / rx);
    const mid = (t0 + t1) / 2, half = (t1 - t0) / 2;
    let dt = t - mid; while (dt > Math.PI) dt -= 2 * Math.PI; while (dt < -Math.PI) dt += 2 * Math.PI;
    if (Math.abs(dt) > half) t = mid + Math.sign(dt) * half;
    return Math.hypot(a - x - Math.cos(t) * rx, b - y - Math.sin(t) * ry) - w / 2;
  },
  star: (x, y, r, n = 5, inner = 0.45, rot = Math.PI / 2) => {
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const t = rot + (i * Math.PI) / n, rr = i % 2 ? r * inner : r; pts.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr]); }
    return SD.poly(pts);
  },
  heart: (x, y, r) => { const a = SD.circ(x - r * 0.5, y + r * 0.2, r * 0.55), b = SD.circ(x + r * 0.5, y + r * 0.2, r * 0.55), c = SD.poly([[x - r * 1.02, y + r * 0.05], [x + r * 1.02, y + r * 0.05], [x, y - r * 1.05]]); return (p, q) => Math.min(a(p, q), b(p, q), c(p, q)); },
  union: (...f) => (a, b) => { let d = 1e9; for (const g of f) { const v = g(a, b); if (v < d) d = v; } return d; },
  cut: (f, g) => (a, b) => Math.max(f(a, b), -g(a, b)),
  inter: (f, g) => (a, b) => Math.max(f(a, b), g(a, b)),
};

// ------------------------------------------------------------------ decals
/**
 * Fill a signed-distance shape: o.dir projection, o.ink outline colour (o.iw width mm), o.alpha blend,
 * o.shade [colour, t] darkens the top part (painted toys: a shadow line under rims), o.z: [zmin, zmax] depth limit.
 */
export function shape(sdf, col, o = {}) {
  const C = col == null ? null : rgb(col), I = o.ink != null ? rgb(o.ink) : null, iw = o.iw ?? 0.42, dir = o.dir || 'f', al = o.alpha ?? 1;
  const zr = o.z, fn = o.fn;
  return (c, out) => {
    if (!proj(c, dir)) return;
    if (zr && (c.z < zr[0] || c.z > zr[1])) return;
    const d = sdf(c.a, c.b);
    if (d <= 0) { if (fn) fn(c, out, d); else if (C) { if (al < 1) mixInto(out, C, al); else setc(out, C); } } else if (I && d <= iw) setc(out, I);
  };
}

/** Colour a slab of the part by a local coordinate range (axis 'x' | 'y' | 'z'), e.g. belts, hems, stripes. */
function band(axis, v0, v1, col, o = {}) {
  const C = rgb(col), I = o.ink != null ? rgb(o.ink) : null, iw = o.iw ?? 0.35;
  return (c, out) => {
    const v = axis === 'x' ? c.x : axis === 'z' ? c.z : axis === 'Y' ? c.Y : c.y;
    if (v >= v0 && v <= v1) { if (o.only && !proj(c, o.only)) return; setc(out, C); if (I && (v - v0 < iw || v1 - v < iw)) setc(out, I); }
  };
}
function stripes(axis, period, width, col, o = {}) {
  const C = rgb(col), ph = o.ph || 0;
  return (c, out) => {
    if (o.dir && !proj(c, o.dir)) return;
    let v = axis === 'x' ? c.x : axis === 'z' ? c.z : axis === 'd' ? c.x + c.y : axis === 'e' ? c.x - c.y : axis === 'r' ? Math.atan2(c.z, c.x) * period / 6.2832 * (o.n || 8) : c.y;
    v = ((v + ph) % period + period) % period;
    if (v < width) setc(out, C);
  };
}
function dots(period, r, col, o = {}) {
  const C = rgb(col), dir = o.dir || '*';
  return (c, out) => {
    if (!proj(c, dir)) return;
    const row = Math.floor(c.b / period), off = row & 1 ? period / 2 : 0;
    const a = ((c.a + off) % period + period) % period - period / 2, b = (c.b % period + period) % period - period / 2;
    if (a * a + b * b <= r * r) setc(out, C);
  };
}
function check(period, col, o = {}) {
  const C = rgb(col), dir = o.dir || '*';
  return (c, out) => { if (!proj(c, dir)) return; if ((Math.floor(c.a / period) + Math.floor(c.b / period)) & 1) setc(out, C); };
}
/** Pixel sprite: rows of characters, legend { ch: colour }, top-left at (x, y), s mm per pixel. */
function pix(rows, legend, x, y, s, o = {}) {
  const L = Object.fromEntries(Object.entries(legend).map(([k, v]) => [k, rgb(v)])), dir = o.dir || 'f';
  return (c, out) => {
    if (!proj(c, dir)) return;
    const i = Math.floor((c.a - x) / s), j = Math.floor((y - c.b) / s);
    if (j < 0 || j >= rows.length || i < 0 || i >= rows[j].length) return;
    const C = L[rows[j][i]];
    if (C) setc(out, C);
  };
}

// text through a 2D canvas (DotGothic16 for kana, Alagard / the bitmap font for latin), thresholded to crisp pixels
const txtCache = new Map();
/** Set when a text decal was painted before its web font had loaded (the kit repaints that figure once it has). */
export const FONT_WAIT = { pending: null };
function txtMask(str, font) {
  const k = str + '|' + font;
  const hit = txtCache.get(k);
  if (hit && !hit.pend) return hit;
  try {
    if (typeof document !== 'undefined' && document.fonts && !document.fonts.check(`48px ${font}`, str)) {
      FONT_WAIT.pending = document.fonts.load(`48px ${font}`, str);
      const ph = { a: null, pend: true };
      txtCache.set(k, ph);
      return ph;
    }
  } catch { /* no font API: paint with whatever is there */ }
  let m = null;
  try {
    const px = 48, cv = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(8, 8) : document.createElement('canvas');
    let g = cv.getContext('2d', { willReadFrequently: true });
    g.font = `${px}px ${font}`;
    const vertical = false;
    const w = Math.ceil(g.measureText(str).width) + 4, h = px + 8;
    cv.width = w; cv.height = h;
    g = cv.getContext('2d', { willReadFrequently: true });
    g.font = `${px}px ${font}`; g.textBaseline = 'middle'; g.fillStyle = '#000';
    g.fillText(str, 2, h / 2 + 1);
    const d = g.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    m = { w, h, a, px, vertical };
  } catch { m = null; }
  txtCache.set(k, m);
  return m;
}
/** Text centred at (x, y), cap height h mm. o.vert: one glyph per line, top to bottom. o.font: CSS font family. */
function txt(str, x, y, h, col, o = {}) {
  const C = rgb(col), dir = o.dir || 'f', font = o.font || '"DotGothic16", "MS Gothic", monospace';
  if (o.vert) { const ch = [...str]; return ch.map((g, i) => txt(g, x, y + ((ch.length - 1) / 2 - i) * h * 1.05, h, col, { ...o, vert: false })); }
  let M = null;
  return (c, out) => {
    if (!proj(c, dir)) return;
    if (!M) { M = txtMask(str, font); if (!M) return; }
    if (!M.a) return;
    const sc = M.px / h, w = (M.w / sc);
    const i = Math.floor((c.a - x + w / 2) * sc), j = Math.floor((y - c.b) * sc + M.h / 2);
    if (i < 0 || j < 0 || i >= M.w || j >= M.h) return;
    if (M.a[j * M.w + i]) setc(out, C);
  };
}

// ------------------------------------------------------------------ faces
const INK = 0x33221e; // dark brown paint, never pure black
/**
 * A toy face on the front of a part. f: { y: eye height, gap: half distance between the eyes, er: eye half width,
 * eh: eye half height, eye: 'dot' | 'bead' | 'anime' | 'happy' | 'closed' | 'line' | 'x' | 'star' | 'sleepy' | 'angry' |
 * 'sparkle' | 'spiral' | 'none', iris, lash, my: mouth height, mw: mouth width, mouth: 'cat' | 'smile' | 'grin' | 'open' |
 * 'o' | 'flat' | 'frown' | 'wavy' | 'fang' | 'tri' | 'teeth' | 'none', blush, brow: 'soft' | 'angry' | 'sad' | 'thick',
 * nose: 'dot' | 'tri' | 'line', x: centre offset, dir, ink }.
 */
export function face(f = {}) {
  const dir = f.dir || 'f', x0 = f.x || 0, y = f.y ?? 0, gap = f.gap ?? 5, er = f.er ?? 1.6, eh = f.eh ?? er * 1.25;
  const ink = f.ink ?? INK, my = f.my ?? y - eh - 2.4, mw = f.mw ?? 3;
  const out = [];
  const eyeStyle = f.eye || 'dot';
  for (const side of [-1, 1]) {
    const ex = x0 + side * gap;
    out.push(...eye(eyeStyle, ex, y, er, eh, side, { ...f, ink, dir }));
  }
  if (f.brow) for (const side of [-1, 1]) {
    const ex = x0 + side * gap, by = y + eh + (f.browUp ?? 1.3), w = f.bw ?? er * 1.1, th = f.bt ?? (f.brow === 'thick' ? 1.0 : 0.55);
    const tilt = f.brow === 'angry' ? -0.8 : f.brow === 'sad' ? 0.7 : 0;
    out.push(shape(SD.seg(ex - w, by - tilt * side * 0.5 * -1, ex + w, by + tilt * side * 0.5 * -1, th), null, { dir, fn: (c, o) => setc(o, rgb(f.browC ?? ink)) }));
  }
  if (f.blush !== false && f.blush != null) {
    const bc = f.blush === true ? 0xf49aa0 : f.blush;
    for (const side of [-1, 1]) {
      const bx = x0 + side * (gap + (f.bx ?? er * 0.6)), by = y - eh - (f.by ?? 0.8), rx = f.br ?? er * 1.05;
      out.push(shape(SD.ell(bx, by, rx, rx * 0.55), bc, { dir, alpha: 0.75 }));
      // three little hatch strokes (anime blush)
      if (f.hatch === true) for (let k = -1; k <= 1; k++) out.push(shape(SD.seg(bx + k * rx * 0.45 - 0.25, by - 0.35, bx + k * rx * 0.45 + 0.25, by + 0.35, 0.28), 0xffd8d8, { dir, alpha: 0.85 }));
    }
  }
  if (f.nose) {
    const ny = f.ny ?? (y + my) / 2;
    if (f.nose === 'dot') out.push(shape(SD.ell(x0, ny, 0.45, 0.35), f.noseC ?? ink, { dir }));
    else if (f.nose === 'tri') out.push(shape(SD.poly([[x0 - 1, ny + 0.5], [x0 + 1, ny + 0.5], [x0, ny - 0.6]]), f.noseC ?? ink, { dir }));
    else if (f.nose === 'line') out.push(shape(SD.seg(x0 + 0.2, ny + 0.8, x0 - 0.3, ny - 0.4, 0.4), f.noseC ?? 0xc08070, { dir }));
  }
  out.push(...mouth(f.mouth || 'smile', x0, my, mw, { ...f, ink, dir }));
  return out;
}

function eye(st, ex, ey, er, eh, side, f) {
  const dir = f.dir, ink = f.ink, W = 0xffffff, out = [];
  const iris = f.iris ?? 0x4a2a1a;
  switch (st) {
    case 'none': break;
    case 'dot': case 'bead': case 'angry': {
      out.push(shape(SD.ell(ex, ey, er, eh), ink, { dir }));
      out.push(shape(SD.circ(ex - er * 0.32, ey + eh * 0.38, Math.max(0.42, er * 0.36)), W, { dir }));
      if (st === 'dot' && er > 1.3) out.push(shape(SD.circ(ex + er * 0.35, ey - eh * 0.45, er * 0.16), W, { dir }));
      if (st === 'angry') out.push(shape(SD.seg(ex - er * 1.3, ey + eh * 1.6 + side * 0.6, ex + er * 1.3, ey + eh * 1.6 - side * 0.6, 0.7), ink, { dir }));
      break;
    }
    case 'anime': case 'sparkle': case 'tear': {
      const I = rgb(iris), Id = I.map((v) => v * 0.45), Il = I.map((v) => Math.min(255, v * 1.35 + 30)), K = rgb(ink);
      // white of the eye peeking at the sides, iris, pupil, two catchlights, a heavy upper lash with a flick
      out.push(shape(SD.ell(ex, ey, er * 1.12, eh), null, { dir, fn: (c, o) => {
        const u = (c.a - ex) / er, v = (c.b - ey) / eh;
        if (Math.abs(u) > 0.78) { setc(o, [250, 248, 244]); return; }
        const t = (v + 1) / 2; // 0 bottom .. 1 top
        setc(o, t > 0.62 ? Id : t > 0.36 ? I : Il);
        if (u * u / 0.2 + (v - 0.1) * (v - 0.1) / 0.32 < 1) setc(o, Id.map((x) => x * 0.6));
        if (t < 0.22 && Math.abs(u) < 0.5) setc(o, Il.map((x) => Math.min(255, x * 1.12)));
      } }));
      out.push(shape(SD.ell(ex - side * er * 0.28, ey + eh * 0.32, er * 0.34, eh * 0.26), W, { dir }));
      out.push(shape(SD.circ(ex + side * er * 0.32, ey - eh * 0.42, er * 0.15), W, { dir }));
      out.push(shape(SD.inter(SD.ell(ex, ey + 0.1, er * 1.28, eh * 1.12), (a, b) => (ey + eh * 0.62) - b), null, { dir, fn: (c, o) => setc(o, K) }));
      out.push(shape(SD.poly([[ex + side * er * 0.9, ey + eh * 0.8], [ex + side * er * 1.75, ey + eh * (f.lash ? 1.25 : 0.95)], [ex + side * er * 1.15, ey + eh * 0.35]]), ink, { dir }));
      out.push(shape(SD.arc(ex, ey + 0.1, er * 1.05, eh * 1.05, -Math.PI * 0.85, -Math.PI * 0.15, 0.3), 0x9a6a5a, { dir }));
      if (st === 'sparkle') out.push(shape(SD.star(ex + side * er * 0.2, ey - eh * 0.1, er * 0.42, 4, 0.35), W, { dir }));
      if (st === 'tear') out.push(shape(SD.union(SD.circ(ex + side * er * 0.9, ey - eh * 1.5, 0.65), SD.poly([[ex + side * er * 0.9 - 0.6, ey - eh * 1.4], [ex + side * er * 0.9 + 0.6, ey - eh * 1.4], [ex + side * er * 0.9, ey - eh * 0.9]])), 0x9fd8ff, { dir, ink: 0x4a8ac8, iw: 0.25 }));
      break;
    }
    case 'happy': out.push(shape(SD.arc(ex, ey - eh * 0.45, er, eh * 0.95, 0.15, Math.PI - 0.15, 0.62), ink, { dir })); break;
    case 'closed': out.push(shape(SD.arc(ex, ey + eh * 0.35, er, eh * 0.8, Math.PI + 0.2, 2 * Math.PI - 0.2, 0.55), ink, { dir })); break;
    case 'line': out.push(shape(SD.seg(ex - er, ey, ex + er, ey, 0.6), ink, { dir })); break;
    case 'sleepy': out.push(shape(SD.inter(SD.ell(ex, ey, er, eh), (a, b) => b - ey), ink, { dir })); out.push(shape(SD.seg(ex - er * 1.2, ey, ex + er * 1.2, ey, 0.5), ink, { dir })); break;
    case 'x': out.push(shape(SD.union(SD.seg(ex - er, ey - er, ex + er, ey + er, 0.55), SD.seg(ex - er, ey + er, ex + er, ey - er, 0.55)), ink, { dir })); break;
    case 'star': out.push(shape(SD.star(ex, ey, er * 1.25, 5, 0.45), f.starC ?? 0xffc83a, { dir, ink, iw: 0.3 })); break;
    case 'spiral': out.push(shape((a, b) => { const r = Math.hypot(a - ex, b - ey), t = Math.atan2(b - ey, a - ex); if (r > er * 1.2) return 1; const k = ((r / (er * 0.42) - t / 6.2832) % 1 + 1) % 1; return Math.abs(k - 0.5) < 0.22 ? -1 : 1; }, ink, { dir })); break;
    case 'wink': if (side > 0) out.push(shape(SD.arc(ex, ey - eh * 0.45, er, eh * 0.95, 0.15, Math.PI - 0.15, 0.62), ink, { dir })); else out.push(...eye('dot', ex, ey, er, eh, side, f)); break;
    default: break;
  }
  return out;
}

function mouth(st, mx, my, mw, f) {
  const dir = f.dir, ink = f.ink, out = [], w = mw / 2, lw = f.lw ?? 0.5;
  switch (st) {
    case 'none': break;
    case 'cat': out.push(shape(SD.union(SD.arc(mx - w / 2, my + w * 0.15, w / 2, w * 0.5, Math.PI + 0.25, 2 * Math.PI, lw), SD.arc(mx + w / 2, my + w * 0.15, w / 2, w * 0.5, Math.PI, 2 * Math.PI - 0.25, lw)), ink, { dir })); break;
    case 'fang': out.push(...mouth('cat', mx, my, mw, f)); out.push(shape(SD.poly([[mx + w * 0.25, my - 0.1], [mx + w * 0.75, my - 0.1], [mx + w * 0.5, my - 1.0]]), 0xffffff, { dir, ink, iw: 0.22 })); break;
    case 'smile': out.push(shape(SD.arc(mx, my + w * 0.45, w, w * 0.7, Math.PI + 0.35, 2 * Math.PI - 0.35, lw), ink, { dir })); break;
    case 'frown': out.push(shape(SD.arc(mx, my - w * 0.55, w, w * 0.6, 0.4, Math.PI - 0.4, lw), ink, { dir })); break;
    case 'flat': out.push(shape(SD.seg(mx - w, my, mx + w, my, lw), ink, { dir })); break;
    case 'wavy': out.push(shape(SD.path([[mx - w, my], [mx - w / 2, my + 0.5], [mx, my], [mx + w / 2, my + 0.5], [mx + w, my]], lw), ink, { dir })); break;
    case 'o': out.push(shape(SD.ell(mx, my, w * 0.45, w * 0.55), 0x7a2a2a, { dir, ink, iw: 0.35 })); break;
    case 'tri': out.push(shape(SD.poly([[mx - w * 0.7, my + w * 0.3], [mx + w * 0.7, my + w * 0.3], [mx, my - w * 0.7]]), 0x8a2a2a, { dir, ink, iw: 0.35 })); break;
    case 'open': case 'grin': case 'teeth': {
      const h = f.mh ?? w * (st === 'teeth' ? 0.6 : 0.85);
      const sd = SD.inter(SD.ell(mx, my + h * 0.15, w, h), (a, b) => b - (my + h * 0.15));
      out.push(shape(sd, null, { dir, ink, iw: 0.35, fn: (c, o) => {
        const t = (my + h * 0.15 - c.b) / h;
        setc(o, t > 0.62 ? [240, 120, 130] : [122, 34, 40]);
        if (st !== 'open' && t < 0.3) setc(o, [252, 250, 246]);
      } }));
      break;
    }
    default: break;
  }
  return out;
}

/** Cat / dog whiskers at the side of a muzzle. */
function whiskers(x, y, len = 3, o = {}) {
  const out = [], dir = o.dir || 'f', col = o.c ?? INK;
  for (const s of [-1, 1]) for (const k of [-1, 1]) out.push(shape(SD.seg(x + s * 0.8 * (o.gap || 1), y + k * 0.35, x + s * (0.8 + len), y + k * 0.9, 0.3), col, { dir }));
  return out;
}

export const D = {
  shape, band, stripes, dots, check, pix, txt, face, whiskers,
  circ: (x, y, r, col, o = {}) => shape(SD.circ(x, y, r), col, o),
  ell: (x, y, rx, ry, col, o = {}) => shape(SD.ell(x, y, rx, ry), col, o),
  rect: (x0, y0, x1, y1, col, o = {}) => shape(SD.rect(x0, y0, x1, y1, o.r || 0), col, o),
  line: (x0, y0, x1, y1, w, col, o = {}) => shape(SD.seg(x0, y0, x1, y1, w), col, o),
  path: (pts, w, col, o = {}) => shape(SD.path(pts, w), col, o),
  poly: (pts, col, o = {}) => shape(SD.poly(pts), col, o),
  arc: (x, y, rx, ry, t0, t1, w, col, o = {}) => shape(SD.arc(x, y, rx, ry, t0, t1, w), col, o),
  star: (x, y, r, col, o = {}) => shape(SD.star(x, y, r, o.n || 5, o.inner || 0.45), col, o),
  heart: (x, y, r, col, o = {}) => shape(SD.heart(x, y, r), col, o),
  ring: (x, y, r, w, col, o = {}) => shape((a, b) => Math.abs(Math.hypot(a - x, b - y) - r) - w / 2, col, o),
  /** Buttons down a placket: n buttons from y0 to y1 at x. */
  buttons: (x, y0, y1, n, r, col, o = {}) => { const s = []; for (let i = 0; i < n; i++) { const y = n > 1 ? y0 + ((y1 - y0) * i) / (n - 1) : y0; s.push(shape(SD.circ(x, y, r), col, { ink: o.ink ?? 0x3a2a22, iw: 0.22, ...o })); s.push(shape(SD.circ(x - r * 0.3, y + r * 0.3, r * 0.3), 0xffffff, { alpha: 0.5, ...o })); } return s; },
  /** Running stitch along a line (seams on cloth / plush). */
  stitch: (x0, y0, x1, y1, col, o = {}) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.floor(L / 1.2)), s = []; for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 0.55) / n; s.push(shape(SD.seg(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, o.w ?? 0.3), col, o)); } return s; },
  /** Generic per-texel painter (c, o) restricted to a direction. */
  fn: (dir, f) => (c, o) => { if (proj(c, dir)) f(c, o); },
};

// ------------------------------------------------------------------ material textures
const N = (x, y, s) => vnoise(x, y, s) - 0.5;
const cell = (c, k) => h2(Math.floor(c.x * k + 1000), Math.floor(c.y * k + 1000) * 7 + Math.floor(c.z * k + 1000) * 131, 5) - 0.5;
const TEX = {
  vinyl: (c, o) => { mul(o, 1 + N(c.X * 0.35, c.Y * 0.35 + c.Z * 0.2, 1) * 0.05 + cell(c, 2.6) * 0.022); },
  flat: () => {},
  gloss: (c, o) => { mul(o, 1 + cell(c, 2.6) * 0.015); if (c.wny > 0.4 && c.ed > 0.5 && c.ed < 1.1) mul(o, 1.07); },
  fur: (c, o, p) => {
    const a = (Math.abs(c.nx) > Math.abs(c.nz) ? c.z : c.x) + (c.ny > 0.6 ? c.z * 0.5 : 0);
    const s = Math.floor(a * 3.2), n = h2(s, Math.floor(c.y * 0.9 + N(s, 0, 2) * 2), 7);
    let k = 0.9 + n * 0.16 + N(c.x * 0.5, c.y * 0.5 + c.z * 0.3, 3) * 0.12;
    if ((Math.floor(c.y * 2.4 + h2(s, 3, 1) * 4) & 3) === 0) k *= 0.93;
    mul(o, k * (p.k || 1));
  },
  plush: (c, o) => { mul(o, 0.95 + cell(c, 3.2) * 0.12 + N(c.X * 0.6, c.Y * 0.6, 4) * 0.08); },
  cloth: (c, o) => { const w = ((Math.floor(c.x * 3) + Math.floor(c.y * 3) + Math.floor(c.z * 3)) & 1) ? 0.975 : 1.025; mul(o, w + N(c.X * 0.4, c.Y * 0.4, 6) * 0.08); },
  knit: (c, o) => { const a = Math.abs(c.nx) > Math.abs(c.nz) ? c.z : c.x; const v = Math.abs(Math.sin(a * 3.4)); const r = (Math.floor(c.y * 2.8) + Math.floor(a * 1.08)) & 1; mul(o, 0.86 + v * 0.16 + (r ? 0.03 : 0)); },
  denim: (c, o) => { const d = ((Math.floor((c.x + c.y + c.z) * 3.5)) & 1) ? 0.92 : 1.05; mul(o, d + N(c.X * 0.3, c.Y * 0.9, 9) * 0.12); },
  hair: (c, o) => {
    const a = Math.abs(c.nx) > Math.abs(c.nz) ? c.z * Math.sign(c.nx) : c.x;
    const s = Math.floor(a * 2.4 + (c.ny > 0.5 ? c.z * 0.6 : 0)), ha = h2(s, 3, 11);
    let k = 0.82 + ha * 0.24 + Math.sin(c.y * 0.9 + ha * 6) * 0.05;
    if (Math.sin((a + Math.sin(c.y * 0.4 + s) * 0.4) * 2.2) < -0.6) k *= 0.82;
    if (c.ny > -0.1 && c.y > c.bb.y1 - (c.bb.hy * 0.7) && (Math.floor(c.y * 1.2 + ha * 3) & 3) === 0) k *= 1.14; // sheen band
    mul(o, k);
  },
  wood: (c, o, p) => {
    const ax = p.ga || 'y';
    const u = ax === 'x' ? c.y + c.z * 0.7 : ax === 'z' ? c.x + c.y * 0.7 : c.x + c.z * 0.7, v = ax === 'x' ? c.x : ax === 'z' ? c.z : c.y;
    const g = Math.sin((u * 2.1 + N(u * 0.3, v * 0.08, 12) * 6) * 1.0);
    let k = 0.9 + g * 0.06 + N(u * 2, v * 0.15, 13) * 0.1;
    if (g > 0.86) k *= 0.82;
    mul(o, k);
  },
  metal: (c, o) => { const s = h2(Math.floor(c.y * 4 + c.z * 2), 3, 14); mul(o, 0.9 + s * 0.12 + (c.wny > 0.5 ? 0.06 : 0)); },
  tin: (c, o) => { mul(o, 0.96 + cell(c, 1.6) * 0.05 + (c.ed > 0.4 && c.ed < 0.9 && c.wny > 0 ? 0.12 : 0)); },
  paper: (c, o) => { mul(o, 0.97 + cell(c, 3) * 0.06 + (h2(Math.floor(c.x * 6), Math.floor(c.y * 6 + c.z * 6), 15) > 0.985 ? -0.12 : 0)); },
  rice: (c, o) => {
    const k = 1.25, gx = c.x * k + (c.nx > 0.5 ? c.z : 0), gy = c.y * k * 0.7 + (c.ny > 0.5 ? c.z * 0.7 : 0);
    const ix = Math.floor(gx + (Math.floor(gy) & 1) * 0.5), iy = Math.floor(gy + c.z * 0.4);
    const fx = gx + (Math.floor(gy) & 1) * 0.5 - ix - 0.5, fy = gy + c.z * 0.4 - iy - 0.5, r = h2(ix, iy, 16);
    const d = fx * fx * 1.3 + fy * fy * 2.4;
    mul(o, d > 0.2 ? 0.86 - r * 0.04 : 1.0 + r * 0.05);
  },
  crust: (c, o, p) => {
    const n = N(c.X * 0.45, c.Y * 0.45 + c.Z * 0.3, 17) + N(c.X * 1.4, c.Z * 1.4 + c.Y, 18) * 0.5;
    const t = Math.max(0, Math.min(1, 0.45 + n * 1.4 + (c.wny > 0.4 ? 0.2 : 0)));
    mixInto(o, rgb(p.c2 ?? 0x8a4a1c), qt(t, 3) * 0.6);
  },
  clay: (c, o) => { mul(o, 0.92 + N(c.X * 0.5, c.Y * 0.5 + c.Z * 0.3, 19) * 0.16 + cell(c, 2.4) * 0.05); if (h2(Math.floor(c.x * 2.6 + 50), Math.floor(c.y * 2.6 + 50) + Math.floor(c.z * 2.6) * 31, 20) > 0.96) mul(o, 0.78); },
  stone: (c, o) => { mul(o, 0.88 + N(c.X * 0.7, c.Y * 0.7 + c.Z * 0.5, 21) * 0.2 + cell(c, 2) * 0.08); },
  ceramic: (c, o) => { mul(o, 0.98 + cell(c, 2.6) * 0.02); if (c.wny > 0.3 && c.ed > 0.4 && c.ed < 0.8) mul(o, 1.1); },
  glass: (c, o) => { const s = Math.sin((c.x - c.y * 0.3) * 1.6); if (s > 0.85) mixInto(o, [255, 255, 255], 0.35); },
  water: (c, o) => { const r = Math.sin(Math.hypot(c.X, c.Z) * 1.4 - N(c.X * 0.2, c.Z * 0.2, 22) * 4); mul(o, 0.95 + r * 0.06); if (r > 0.9) mixInto(o, [255, 255, 255], 0.25); },
  tatami: (c, o) => { const r = (Math.floor(c.x * 2.2) & 1) ? 0.95 : 1.04; mul(o, r * (0.96 + cell(c, 3) * 0.06)); },
  felt: (c, o) => { mul(o, 0.94 + cell(c, 3.4) * 0.12); },
  foam: (c, o) => { if (h2(Math.floor(c.x * 3 + 99), Math.floor(c.y * 3 + 99) * 17 + Math.floor(c.z * 3 + 99), 23) > 0.8) mul(o, 0.86); else mul(o, 1.02); },
  lacquer: (c, o) => { mul(o, 1 + cell(c, 2.6) * 0.012); if (c.wny > 0.35 && c.ed > 0.35 && c.ed < 0.95) mixInto(o, [255, 255, 255], 0.22); },
  scales: (c, o) => { const a = c.x * 1.1, b = c.y * 1.3 + (Math.floor(a) & 1) * 0.5; const fx = a - Math.floor(a) - 0.5, fy = b - Math.floor(b); mul(o, fy < 0.25 + Math.abs(fx) * 0.4 ? 0.84 : 1.02); },
  feather: (c, o) => { const a = Math.abs(c.nx) > Math.abs(c.nz) ? c.z : c.x; const b = c.y * 0.9 + (Math.floor(a * 0.7) & 1) * 0.5; mul(o, (b - Math.floor(b)) < 0.18 ? 0.86 : 1 + N(a, c.y, 24) * 0.06); },
};
export const TEXTURES = Object.keys(TEX);

// ------------------------------------------------------------------ compile
/** Turn a paint spec into a texel painter fn(c, o). */
export function compilePaint(spec) {
  const p = typeof spec === 'number' ? { c: spec } : (spec || { c: 0xff00ff });
  const base = rgb(p.c ?? 0xff00ff), top = p.top != null ? rgb(p.top) : null, bot = p.bot != null ? rgb(p.bot) : null, side = p.side != null ? rgb(p.side) : null;
  const front = p.front != null ? rgb(p.front) : null;
  const g = p.g ? p.g.map(rgb) : null;
  const tex = TEX[p.t || (p.m === 'gloss' ? 'gloss' : p.m === 'metal' ? 'metal' : 'vinyl')] || TEX.vinyl;
  const decals = (p.d || []).flat(3).filter(Boolean);
  const E = p.e ?? 1, K = p.k ?? 1, G = p.grade ?? 0.22;
  return (c, o) => {
    let C = base;
    if (top && c.ny > 0.55) C = top; else if (bot && c.ny < -0.55) C = bot; else if (side && Math.abs(c.ny) <= 0.55 && !(front && c.nz > 0.5)) C = side;
    if (front && c.nz > 0.5) C = front;
    setc(o, C);
    if (g) { const t = qt((c.y - c.bb.y0) / ((c.bb.y1 - c.bb.y0) || 1), p.gn || 4); setc(o, [g[0][0] + (g[1][0] - g[0][0]) * t, g[0][1] + (g[1][1] - g[0][1]) * t, g[0][2] + (g[1][2] - g[0][2]) * t]); }
    tex(c, o, p);
    for (let i = 0; i < decals.length; i++) decals[i](c, o);
    if (p.fn) p.fn(c, o);
    // realistic paint grade: natural, slightly muted colours (real PVC / vinyl paint, not candy fills)
    if (G) { const l = o[0] * 0.3 + o[1] * 0.59 + o[2] * 0.11; o[0] = 10 + (o[0] + (l - o[0]) * G) * 0.92; o[1] = 9 + (o[1] + (l - o[1]) * G) * 0.91; o[2] = 8 + (o[2] + (l - o[2]) * G) * 0.88; }
    // baked shading: a crisp light line along upward edges, darker under-edges, soft top-lit faces, contact shadow
    let k = K;
    if (E) {
      if (c.ed < 0.42) k *= c.wny > 0.3 ? 1 + 0.13 * E : c.wny < -0.3 ? 1 - 0.14 * E : 1 - 0.06 * E;
      else if (c.ed < 0.85) k *= c.wny > 0.3 ? 1 + 0.04 * E : 1 - 0.035 * E;
    }
    if (c.kind === 'side') k *= c.fv > 0.7 ? 1.04 : c.fv < 0.25 ? 0.92 : 1;
    // occlusion low on each part, paint rubbed off convex edges in small clusters, the mould's parting line
    const bb = c.bb, hy = (c.y - bb.y0) / ((bb.y1 - bb.y0) || 1);
    if (hy < 0.16 && c.kind !== 'top') k *= 0.92;
    if (E && c.ed < 0.38 && c.wny > -0.3 && h2(Math.floor(c.x * 1.3 + 500), Math.floor(c.y * 1.3 + 500) * 7 + Math.floor(c.z * 1.3 + 500), 31) > 0.72) k *= 1.1;
    if (E && c.kind === 'side' && Math.abs(c.nx) > 0.6 && Math.abs(c.z - bb.cz) < c.px * 0.55) k *= 0.9;
    else if (c.kind === 'bot') k *= 0.78;
    if (c.Y < 2.4) k *= c.Y < 0.9 ? 0.8 : 0.9;
    if (k !== 1) tone(o, q(k));
  };
}
