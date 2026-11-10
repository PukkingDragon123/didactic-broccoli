// Paint for sculpted figures: layers evaluated per texel on the surface (src/figures/bake.js), in the local
// millimetres of the part they cover. A layer is a region (a shape projected from the front / back / a side / above /
// below, a band wrapped round the y axis, or a volume the surface passes through) with a colour, or a tone that
// darkens / lightens what is under it. Shapes are signed distance functions, so edges are antialiased at the texel.
//   S.paint(fill(0xf2a03a), proj('front', circle(0, 20, 3), 0x2a1e26), shade(vol(below(6)), 0.2), ...face({ ... }))
// Details are drawn in a darker tone of the surface colour (ink(c)), never black; tones are placed by hand.
import { mask5, textW5 } from '../gfx/font5x7.js';

// ---- colour
export const ch = (c, s) => (c >> s) & 255;
export const mix = (a, b, t) => {
  const r = Math.round(ch(a, 16) + (ch(b, 16) - ch(a, 16)) * t), g = Math.round(ch(a, 8) + (ch(b, 8) - ch(a, 8)) * t), bl = Math.round(ch(a, 0) + (ch(b, 0) - ch(a, 0)) * t);
  return (r << 16) | (g << 8) | bl;
};
const COOL = 0x2a2040, WARM = 0xfffaea;
/** A darker tone of a colour (leans cool), a lighter one (leans warm), and the ink for lines drawn on it. */
export const tone = (c, k = 0.25) => mix(c, COOL, k);
export const tint = (c, k = 0.3) => mix(c, WARM, k);
export const ink = (c, k = 0.5) => mix(c, COOL, k);
export const EYE = 0x2a2028;

// ---- 2D shapes: { d(u, v) -> signed distance in mm (negative inside), b: [u0, v0, u1, v1] | null }
export const circle = (cx, cy, r) => ({ d: (u, v) => Math.hypot(u - cx, v - cy) - r, b: [cx - r, cy - r, cx + r, cy + r] });
export function ellipse(cx, cy, rx, ry, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot), m = Math.min(rx, ry), R = Math.max(rx, ry);
  return { d: (u, v) => { const x = (u - cx) * c + (v - cy) * s, y = -(u - cx) * s + (v - cy) * c, k = Math.hypot(x / rx, y / ry); return k < 1e-6 ? -m : Math.max(-m, Math.hypot(x, y) * (1 - 1 / k)); }, b: [cx - R, cy - R, cx + R, cy + R] };
}
/** Rounded rectangle: centre, half sizes, corner radius, rotation. */
export function rbox(cx, cy, hw, hh, r = 0, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot), R = Math.hypot(hw, hh);
  return {
    d: (u, v) => { const x = Math.abs((u - cx) * c + (v - cy) * s) - hw + r, y = Math.abs(-(u - cx) * s + (v - cy) * c) - hh + r; return Math.min(Math.max(x, y), 0) + Math.hypot(Math.max(x, 0), Math.max(y, 0)) - r; },
    b: rot ? [cx - R, cy - R, cx + R, cy + R] : [cx - hw, cy - hh, cx + hw, cy + hh],
  };
}
/** A stroke from a to b, w wide (round ends). */
export function seg(x0, y0, x1, y1, w) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1e-9, h = w / 2;
  return { d: (u, v) => { const t = Math.max(0, Math.min(1, ((u - x0) * dx + (v - y0) * dy) / l2)); return Math.hypot(u - x0 - dx * t, v - y0 - dy * t) - h; }, b: [Math.min(x0, x1) - h, Math.min(y0, y1) - h, Math.max(x0, x1) + h, Math.max(y0, y1) + h] };
}
/** A stroke along a circular arc from angle a0 to a1 (radians, ccw from +u), w wide. */
export function arc(cx, cy, r, a0, a1, w) {
  const am = (a0 + a1) / 2, half = Math.abs(a1 - a0) / 2, h = w / 2;
  const e0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r], e1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
  return {
    d: (u, v) => {
      let a = Math.atan2(v - cy, u - cx) - am;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(a) <= half) return Math.abs(Math.hypot(u - cx, v - cy) - r) - h;
      return Math.min(Math.hypot(u - e0[0], v - e0[1]), Math.hypot(u - e1[0], v - e1[1])) - h;
    },
    b: [cx - r - h, cy - r - h, cx + r + h, cy + r + h],
  };
}
/** A filled polygon [[u, v], ...]. */
export function poly(pts) {
  const n = pts.length;
  let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
  for (const [u, v] of pts) { u0 = Math.min(u0, u); v0 = Math.min(v0, v); u1 = Math.max(u1, u); v1 = Math.max(v1, v); }
  return {
    d: (u, v) => {
      let d = Infinity, inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j], ex = xj - xi, ey = yj - yi, wx = u - xi, wy = v - yi;
        const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-9)));
        d = Math.min(d, Math.hypot(wx - ex * t, wy - ey * t));
        if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside ? -d : d;
    },
    b: [u0, v0, u1, v1],
  };
}
/** A regular star / burst: n points, outer radius r, inner radius r * k. */
export function star(cx, cy, r, n = 5, k = 0.45, rot = Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * k : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return poly(pts);
}
const bb = (a, b, f) => (a && b ? f(a, b) : null);
export const or = (...S) => ({ d: (u, v) => { let m = Infinity; for (const s of S) m = Math.min(m, s.d(u, v)); return m; }, b: S.reduce((a, s) => (a === undefined ? s.b : bb(a, s.b, (p, q) => [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[2], q[2]), Math.max(p[3], q[3])])), undefined) });
export const and = (a, b) => ({ d: (u, v) => Math.max(a.d(u, v), b.d(u, v)), b: a.b || b.b });
export const cut = (a, b) => ({ d: (u, v) => Math.max(a.d(u, v), -b.d(u, v)), b: a.b });
/** The outline of a shape as a stroke w wide (centred on its edge, or inside it with inset). */
export const stroke = (s, w, inset = 0) => ({ d: (u, v) => Math.abs(s.d(u, v) + inset) - w / 2, b: s.b ? [s.b[0] - w, s.b[1] - w, s.b[2] + w, s.b[3] + w] : null });
export const grow = (s, r) => ({ d: (u, v) => s.d(u, v) - r, b: s.b ? [s.b[0] - r, s.b[1] - r, s.b[2] + r, s.b[3] + r] : null });
/** The shape and its mirror image in u = 0 (a pair of eyes, cheeks, lamps). */
export const pair = (s) => ({ d: (u, v) => s.d(Math.abs(u), v), b: s.b ? [-Math.max(Math.abs(s.b[0]), Math.abs(s.b[2])), s.b[1], Math.max(Math.abs(s.b[0]), Math.abs(s.b[2])), s.b[3]] : null });
export const halfBelow = (y) => ({ d: (u, v) => v - y, b: null });
export const halfAbove = (y) => ({ d: (u, v) => y - v, b: null });
export const halfLeft = (x) => ({ d: (u) => u - x, b: null });
export const halfRight = (x) => ({ d: (u) => x - u, b: null });
/** Everything (for tones over a whole view). */
export const all = { d: () => -1e3, b: null };
/** Repeat a shape every `period` along u (stripes, rivets, teeth) inside [u0, u1]. */
export const repeatU = (s, period, u0 = -1e3, u1 = 1e3) => ({ d: (u, v) => (u < u0 || u > u1 ? 1e3 : s.d(((u % period) + period * 1.5) % period - period / 2, v)), b: s.b ? [u0, s.b[1], u1, s.b[3]] : null });
export const repeatV = (s, period, v0 = -1e3, v1 = 1e3) => ({ d: (u, v) => (v < v0 || v > v1 ? 1e3 : s.d(u, ((v % period) + period * 1.5) % period - period / 2)), b: s.b ? [s.b[0], v0, s.b[2], v1] : null });

/** 5 x 7 bitmap text, centred on (cx, cy); px = size of one font pixel in mm. Crisp, like pad printing. */
export function label(str, cx, cy, px = 0.4, { align = 'center' } = {}) {
  const w = textW5(str), on = new Set();
  for (const [x, y] of mask5(str)) on.add(x + y * 512);
  const x0 = align === 'center' ? cx - (w * px) / 2 : align === 'right' ? cx - w * px : cx, y1 = cy + 3.5 * px;
  return { d: (u, v) => (on.has(Math.floor((u - x0) / px) + Math.floor((y1 - v) / px) * 512) && u >= x0 && v <= y1 ? -px : px), b: [x0, y1 - 7 * px, x0 + w * px, y1] };
}
/** Any text in a canvas font (kana and kanji in DotGothic16), h mm tall, centred on (cx, cy). */
const kanaCache = new Map();
export function kana(str, cx, cy, h = 4, font = '"DotGothic16", monospace') {
  const key = str + '|' + font;
  let m = kanaCache.get(key);
  if (!m) {
    m = { w: 0, h: 0, bits: null };
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
      g.font = `32px ${font}`;
      const tw = Math.ceil(g.measureText(str).width) + 4;
      c.width = tw; c.height = 44;
      g.font = `32px ${font}`; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(str, 2, 4);
      const d = g.getImageData(0, 0, tw, 44).data;
      let x0 = tw, x1 = -1, y0 = 44, y1 = -1;
      for (let y = 0; y < 44; y++) for (let x = 0; x < tw; x++) if (d[(y * tw + x) * 4 + 3] > 110) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 >= 0) {
        m.w = x1 - x0 + 1; m.h = y1 - y0 + 1; m.bits = new Uint8Array(m.w * m.h);
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) m.bits[y * m.w + x] = d[((y + y0) * tw + x + x0) * 4 + 3] > 110 ? 1 : 0;
      }
    }
    kanaCache.set(key, m);
  }
  if (!m.bits) return { d: () => 1e3, b: [cx, cy, cx, cy] };
  const px = h / m.h, W = m.w * px, u0 = cx - W / 2, v1 = cy + h / 2;
  return { d: (u, v) => { const i = Math.floor((u - u0) / px), j = Math.floor((v1 - v) / px); return i >= 0 && j >= 0 && i < m.w && j < m.h && m.bits[j * m.w + i] ? -px : px; }, b: [u0, cy - h / 2, u0 + W, v1] };
}

// ---- layers
const VIEWS = {
  front: { n: [0, 0, 1], u: (x) => x, v: (x, y) => y }, back: { n: [0, 0, -1], u: (x) => -x, v: (x, y) => y },
  right: { n: [1, 0, 0], u: (x, y, z) => -z, v: (x, y) => y }, left: { n: [-1, 0, 0], u: (x, y, z) => z, v: (x, y) => y },
  top: { n: [0, 1, 0], u: (x) => x, v: (x, y, z) => -z }, bottom: { n: [0, -1, 0], u: (x) => x, v: (x, y, z) => z },
};
const mk = (prep, c, o = {}) => ({ prep, color: typeof c === 'object' && c ? undefined : c, rough: o.rough, alpha: o.alpha ?? 1, tone: o.tone, hard: o.hard, cutsY: o.cutsY });

/** The base coat (everything). c: colour or (x, y, z) -> colour. */
export const fill = (c, o) => mk(() => true, c, o);
/**
 * A shape projected along a view ('front' | 'back' | 'left' | 'right' | 'top' | 'bottom': u to the right and v up as you
 * look at that side) onto the facets that face it. o: facing (how squarely, default 0.15), rough, alpha, near / far
 * (only surfaces between these distances along the view axis: keeps a decal off parts behind).
 */
export function proj(view, shape, c, o = {}) {
  const V = typeof view === 'string' ? VIEWS[view] : view, facing = o.facing ?? 0.15;
  return mk((ctx) => {
    if (ctx.n[0] * V.n[0] + ctx.n[1] * V.n[1] + ctx.n[2] * V.n[2] < facing) return null;
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity, d0 = Infinity, d1 = -Infinity;
    for (const p of ctx.pts) { const u = V.u(p[0], p[1], p[2]), v = V.v(p[0], p[1], p[2]), d = p[0] * V.n[0] + p[1] * V.n[1] + p[2] * V.n[2]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); d0 = Math.min(d0, d); d1 = Math.max(d1, d); }
    if (o.near !== undefined && d1 < o.near) return null;
    if (o.far !== undefined && d0 > o.far) return null;
    const b = shape.b, e = ctx.px * 3;
    if (b && (u1 < b[0] - e || u0 > b[2] + e || v1 < b[1] - e || v0 > b[3] + e)) return null;
    return (x, y, z) => shape.d(V.u(x, y, z), V.v(x, y, z));
  }, c, o);
}
/**
 * A shape wrapped round the y axis like a label on a tin: u = the arc length at radius R from the front (+ towards +x),
 * v = y. Only on facets that face outwards (not caps).
 */
export function wrap(R, shape, c, o = {}) {
  const U = (x, z) => Math.atan2(x, z) * R;
  return mk((ctx) => {
    if (Math.abs(ctx.n[1]) > (o.cap ?? 0.8)) return null;
    let v0 = Infinity, v1 = -Infinity, u0 = Infinity, u1 = -Infinity;
    for (const p of ctx.pts) { v0 = Math.min(v0, p[1]); v1 = Math.max(v1, p[1]); const u = U(p[0], p[2]); u0 = Math.min(u0, u); u1 = Math.max(u1, u); }
    const b = shape.b, e = ctx.px * 3;
    if (b && (v1 < b[1] - e || v0 > b[3] + e)) return null;
    if (b && u1 - u0 < Math.PI * R && (u1 < b[0] - e || u0 > b[2] + e)) return null;
    return (x, y, z) => shape.d(U(x, z), y);
  }, c, o);
}
/** Where the surface passes through a volume: sdf(x, y, z) -> distance (negative inside). */
export function vol(sdf, c, o = {}) {
  return mk((ctx) => {
    if (sdf.box) { const B = sdf.box, e = ctx.px * 3; if (ctx.max[0] < B[0] - e || ctx.min[0] > B[3] + e || ctx.max[1] < B[1] - e || ctx.min[1] > B[4] + e || ctx.max[2] < B[2] - e || ctx.min[2] > B[5] + e) return null; }
    if (o.facing && ctx.n[0] * o.facing[0] + ctx.n[1] * o.facing[1] + ctx.n[2] * o.facing[2] < (o.facing[3] ?? 0.1)) return null;
    // a horizontal slab against a facet that was cut at its heights: wholly in or wholly out, no texels needed
    if (sdf.slab) { if (ctx.min[1] >= sdf.slab[0] - 0.02 && ctx.max[1] <= sdf.slab[1] + 0.02) return true; if (ctx.max[1] <= sdf.slab[0] + 0.02 || ctx.min[1] >= sdf.slab[1] - 0.02) return null; }
    return sdf;
  }, c, { ...o, cutsY: sdf.ys });
}
const boxed = (f, box, ys) => { f.box = box; if (ys) { f.ys = ys; f.slab = [box[1], box[4]]; } return f; };
// (horizontal regions carry their heights: the sculpt cuts its facets there, so a two-tone line is a real edge and both
//  sides stay plain swatches)
export const below = (y0) => boxed((x, y) => y - y0, [-1e4, -1e4, -1e4, 1e4, y0, 1e4], [y0]);
export const above = (y0) => boxed((x, y) => y0 - y, [-1e4, y0, -1e4, 1e4, 1e4, 1e4], [y0]);
export const band = (y0, y1) => boxed((x, y) => Math.max(y0 - y, y - y1), [-1e4, y0, -1e4, 1e4, y1, 1e4], [y0, y1]);
export const slabX = (x0, x1) => boxed((x) => Math.max(x0 - x, x - x1), [x0, -1e4, -1e4, x1, 1e4, 1e4]);
export const slabZ = (z0, z1) => boxed((x, y, z) => Math.max(z0 - z, z - z1), [-1e4, -1e4, z0, 1e4, 1e4, z1]);
/** An ellipsoid blob (patches of colour on fur: cow spots, masks, bellies). */
export function blob(c, r) {
  const [rx, ry, rz] = typeof r === 'number' ? [r, r, r] : r, m = Math.min(rx, ry, rz);
  return boxed((x, y, z) => (Math.hypot((x - c[0]) / rx, (y - c[1]) / ry, (z - c[2]) / rz) - 1) * m, [c[0] - rx, c[1] - ry, c[2] - rz, c[0] + rx, c[1] + ry, c[2] + rz]);
}
export const blobs = (...list) => {
  const f = (x, y, z) => { let m = Infinity; for (const s of list) m = Math.min(m, s(x, y, z)); return m; };
  const B = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const s of list) { if (!s.box) return f; for (let k = 0; k < 3; k++) { B[k] = Math.min(B[k], s.box[k]); B[k + 3] = Math.max(B[k + 3], s.box[k + 3]); } }
  f.box = B;
  return f;
};

/** Turn a region layer into a tone: darker (k > 0) or lighter (k < 0) than whatever is under it. */
export const shade = (layer, k = 0.2) => ({ ...layer, color: undefined, tone: k >= 0 ? (c) => tone(c, k) : (c) => tint(c, -k) });
/** Recolour whatever is under a region through fn(colour) -> colour. */
export const recolor = (layer, fn) => ({ ...layer, color: undefined, tone: fn });
/** A hand-placed tone on the facets that look down (the underside of a belly, a chin, a brim). */
export const under = (k = 0.2, limit = -0.4) => mk((ctx) => (ctx.n[1] < limit ? true : null), undefined, { tone: (c) => tone(c, k) });
/** ... and on the facets that look up (a lighter crown). */
export const crown = (k = 0.15, limit = 0.55) => mk((ctx) => (ctx.n[1] > limit ? true : null), undefined, { tone: (c) => tint(c, k) });

// ---- faces
/**
 * A face, as front-projected layers. o: at [cx, cy], gap (between eye centres), r (eye size), eye ('dot' | 'bead' |
 * 'sleepy' | 'closed' | 'smug' | 'line' | 'stare' | 'sad' | 'tired'), mouth ('flat' | 'smile' | 'frown' | 'w' | 'o' | 'smirk' |
 * 'wavy' | null), my (mouth height below the eyes), mw (mouth width), blush (colour | null), col (ink), view, near / far.
 */
export function face(o = {}) {
  const [cx, cy] = o.at || [0, 0], gap = o.gap ?? 8, r = o.r ?? 1.4, col = o.col ?? EYE, view = o.view || 'front';
  const P = { near: o.near, far: o.far, facing: o.facing ?? 0.05 };
  const L = [], ex = gap / 2, lw = o.lw ?? Math.max(0.5, r * 0.42);
  const both = (f) => [f(cx - ex, -1), f(cx + ex, 1)];
  const add = (shape, c, extra) => L.push(proj(view, shape, c, { ...P, ...extra }));
  if (o.blush) for (const s of both((x, sd) => ellipse(x + sd * r * 1.1, cy - r * 1.9, r * 1.5, r * 0.85))) add(s, o.blush, { alpha: 0.75 });
  const eye = o.eye || 'dot';
  for (const [x, sd] of [[cx - ex, -1], [cx + ex, 1]]) {
    if (eye === 'dot' || eye === 'sad' || eye === 'tired') {
      add(ellipse(x, cy, r * 0.82, r), col, { rough: 0.2 });
      add(circle(x - r * 0.25, cy + r * 0.38, r * 0.26), 0xffffff, { rough: 0.2 });
      if (eye === 'sad') add(seg(x - sd * r * 1.3, cy + r * 2.3, x + sd * r * 1.1, cy + r * 1.5, lw), col);
      if (eye === 'tired') { add(arc(x, cy - r * 0.2, r * 1.7, Math.PI * 1.2, Math.PI * 1.8, lw * 0.7), mix(col, 0xb090a0, 0.5)); add(seg(x - r * 1.3, cy + r * 1.25, x + r * 1.3, cy + r * 1.25, lw), col); }
    } else if (eye === 'bead') {
      add(circle(x, cy, r), col, { rough: 0.15 });
      add(circle(x - r * 0.3, cy + r * 0.35, r * 0.3), 0xffffff, { rough: 0.15 });
      add(circle(x + r * 0.32, cy - r * 0.38, r * 0.14), 0xffffff, { rough: 0.15, alpha: 0.8 });
    } else if (eye === 'sleepy') add(arc(x, cy + r * 0.7, r * 1.15, Math.PI * 1.15, Math.PI * 1.85, lw), col);
    else if (eye === 'closed') add(arc(x, cy - r * 0.8, r * 1.15, Math.PI * 0.15, Math.PI * 0.85, lw), col);
    else if (eye === 'line') add(seg(x - r, cy, x + r, cy, lw), col);
    else if (eye === 'smug') {
      add(and(ellipse(x, cy - r * 0.15, r * 0.95, r * 1.05), halfBelow(cy + r * 0.2)), col, { rough: 0.2 });
      add(seg(x - r * 1.25, cy + r * 0.2 + sd * r * 0.12, x + r * 1.25, cy + r * 0.2 - sd * r * 0.12, lw), col);
      add(circle(x - r * 0.3, cy - r * 0.15, r * 0.22), 0xffffff, { rough: 0.2 });
    } else if (eye === 'stare') {
      add(circle(x, cy, r * 1.25), col);
      add(circle(x, cy, r * 1.25 - lw * 0.8), 0xffffff, { rough: 0.25 });
      add(circle(x, cy, r * 0.42), col, { rough: 0.2 });
    }
  }
  const my = cy - (o.my ?? r * 2.4), mw = o.mw ?? r * 1.6, mouth = o.mouth === undefined ? 'flat' : o.mouth;
  if (mouth === 'flat') add(seg(cx - mw / 2, my, cx + mw / 2, my, lw), col);
  else if (mouth === 'smile') add(arc(cx, my + mw * 0.55, mw * 0.75, Math.PI * 1.25, Math.PI * 1.75, lw), col);
  else if (mouth === 'frown') add(arc(cx, my - mw * 0.75, mw * 0.75, Math.PI * 0.25, Math.PI * 0.75, lw), col);
  else if (mouth === 'w') { add(arc(cx - mw * 0.3, my + mw * 0.15, mw * 0.32, Math.PI * 1.05, Math.PI * 1.95, lw), col); add(arc(cx + mw * 0.3, my + mw * 0.15, mw * 0.32, Math.PI * 1.05, Math.PI * 1.95, lw), col); }
  else if (mouth === 'o') { add(ellipse(cx, my, mw * 0.32, mw * 0.4), col); add(ellipse(cx, my - mw * 0.1, mw * 0.18, mw * 0.2), 0xd86a78); }
  else if (mouth === 'smirk') add(arc(cx - mw * 0.1, my + mw * 0.5, mw * 0.7, Math.PI * 1.3, Math.PI * 1.9, lw), col);
  else if (mouth === 'wavy') { add(arc(cx - mw * 0.25, my, mw * 0.25, 0, Math.PI, lw), col); add(arc(cx + mw * 0.25, my, mw * 0.25, Math.PI, Math.PI * 2, lw), col); }
  return L;
}

// ---- more volumes
/** A round rod from a to b (3D capsule): draws a line wherever the surface passes through it. */
export function rod(a, b, r) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1e-9;
  return boxed((x, y, z) => { const t = Math.max(0, Math.min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / l2)); return Math.hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t) - r; },
    [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r]);
}
/** Blobs placed up a pole or round a body by the golden angle (spots placed by rule, not at random). */
export function spots(n, { y0 = 0, y1 = 10, R = 5, r = [2, 2, 2], turn = 2.4, a0 = 0 } = {}) {
  const list = [];
  for (let i = 0; i < n; i++) { const a = a0 + i * turn, y = y0 + (y1 - y0) * (i + 0.5) / n; list.push(blob([Math.sin(a) * R, y, Math.cos(a) * R], r)); }
  return blobs(...list);
}

/** The maker's mark pad-printed under the base (seen from below): © year over the name. */
export function stamp(maker, { c = 0x6c666c, at = [0, 0], px = 0.44, year = '1999' } = {}) {
  return [proj('bottom', label(`(C)${year}`, at[0], at[1] + px * 5, px), c, { hard: true }), proj('bottom', label(maker, at[0], at[1] - px * 5, px), c, { hard: true })];
}
