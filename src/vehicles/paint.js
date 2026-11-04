// Pixel painting for vehicles, on atlas views (src/vehicles/atlas.js): colour ramps with warm lights and cool darks,
// panel seams, rubber window seals, rust that creeps out of the arches, dents, lamps with their reflectors, glass
// with streaks of sky, plates in the 5 x 7 font, tyres and steel wheels. Everything is placed by hand-written rules
// and a fixed seed: no per-pixel noise.
import { ROUGH } from './atlas.js';

export const ch = (c, s) => (c >> s) & 255;
export const mix = (a, b, t) => {
  const r = Math.round(ch(a, 16) + (ch(b, 16) - ch(a, 16)) * t), g = Math.round(ch(a, 8) + (ch(b, 8) - ch(a, 8)) * t), bl = Math.round(ch(a, 0) + (ch(b, 0) - ch(a, 0)) * t);
  return (r << 16) | (g << 8) | bl;
};
const COOL = 0x1c2238, WARM = 0xfffbea;
/** Five-step ramp: [darkest, dark, base, light, lightest]: darks lean cool, lights warm. */
export function ramp(c, k = 1) { return [mix(c, COOL, 0.42 * k), mix(c, COOL, 0.2 * k), c, mix(c, WARM, 0.32 * k), mix(c, WARM, 0.6 * k)]; }

/** A small seeded random (for placement decisions, never per-pixel noise). */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered-dither test at a pixel for coverage t (0..1). */
export const dith = (i, j, t) => (B4[(j & 3) * 4 + (i & 3)] + 0.5) / 16 < t;

/** A panel seam along a polyline (metres): a dark gap and a light lip beside it (offset di, dj in pixels). */
export function seam(V, pts, dark, light, di = 0, dj = -1) {
  for (let k = 0; k + 1 < pts.length; k++) {
    const [u0, v0] = pts[k], [u1, v1] = pts[k + 1];
    const i0 = V.i(u0), j0 = V.j(v0), i1 = V.i(u1), j1 = V.j(v1);
    if (light !== null && light !== undefined) V.line(i0 + di, j0 + dj, i1 + di, j1 + dj, light);
    V.line(i0, j0, i1, j1, dark);
  }
}
/** Closed seam round a polygon. */
export function seamLoop(V, pts, dark, light, di = 1, dj = -1) { seam(V, [...pts, pts[0]], dark, light, di, dj); }

/** A rubber seal round a hole (metres): w px wide, just outside the outline, with a 1-px sheen on its top run. */
export function seal(V, pts, col = 0x1e2022, w = 2) {
  const A = V.A, prev = A.cur;
  A.ink(ROUGH.rubber);
  for (let s = 0; s < w; s++) {
    const g = grow(pts, (s + 0.5) / V.ppm);
    V.outline(g, s === w - 1 ? mix(col, 0x000000, 0.25) : col);
  }
  A.cur = prev;
}
/** Grow a polygon outwards by d (metres) about its centroid-ish (fine for the convex windows). */
export function grow(pts, d) {
  let cu = 0, cv = 0;
  for (const [u, v] of pts) { cu += u; cv += v; }
  cu /= pts.length; cv /= pts.length;
  // mitre-free: offset each edge, intersect neighbours
  const n = pts.length, L = [];
  let a = 0;
  for (let i = 0; i < n; i++) { const [u0, v0] = pts[i], [u1, v1] = pts[(i + 1) % n]; a += u0 * v1 - u1 * v0; }
  const s = a > 0 ? -1 : 1; // outward = right normal for ccw
  for (let i = 0; i < n; i++) {
    const [u0, v0] = pts[i], [u1, v1] = pts[(i + 1) % n], du = u1 - u0, dv = v1 - v0, l = Math.hypot(du, dv) || 1;
    L.push({ p: [u0 - s * (dv / l) * d, v0 + s * (du / l) * d], dir: [du / l, dv / l] });
  }
  return L.map((B, i) => {
    const A = L[(i - 1 + n) % n];
    const den = A.dir[0] * B.dir[1] - A.dir[1] * B.dir[0];
    if (Math.abs(den) < 1e-6) return B.p;
    const dx = B.p[0] - A.p[0], dy = B.p[1] - A.p[1], t = (dx * B.dir[1] - dy * B.dir[0]) / den;
    return [A.p[0] + A.dir[0] * t, A.p[1] + A.dir[1] * t];
  });
}

/** Window glass (alpha) in a polygon: a tint, a band of sky across the top, two diagonal streaks. */
export function glassPane(V, pts, o = {}) {
  const tint = o.tint ?? 0x22303a, sky = o.sky ?? 0x9ab8c8, hi = o.hi ?? 0xdfeef2, a0 = o.alpha ?? 120;
  let vmin = Infinity, vmax = -Infinity, umin = Infinity, umax = -Infinity;
  for (const [u, v] of pts) { vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); umin = Math.min(umin, u); umax = Math.max(umax, u); }
  const j0 = V.j(vmin), j1 = V.j(vmax), i0 = V.i(umin), i1 = V.i(umax), H = Math.max(1, j1 - j0), Wd = Math.max(1, i1 - i0);
  const A = V.A, prev = A.cur;
  A.ink(ROUGH.glass);
  const seed = o.seed ?? 3, slope = o.slope ?? 0.9, gap = o.streak ?? 0.55;
  polyCA(V, pts, (i, j) => {
    const t = (j - j0) / H; // 0 bottom .. 1 top
    // the sky reflected in the upper part, stepping down into the tint
    let c = tint, a = a0;
    if (t > 0.78) { c = sky; a = a0 + 40; } else if (t > 0.62 && dith(i, j, (t - 0.62) / 0.16)) { c = mix(tint, sky, 0.6); a = a0 + 20; }
    // two diagonal streaks of a few pixels, a wider one and a thin one (pixel steps, not soft)
    const d = (i - i0) + Math.round((j - j0) * slope), off = Math.round(Wd * gap + seed * 7) % Math.max(8, Wd);
    const k = d - off;
    if (k >= 0 && k < 2) { c = mix(hi, sky, 0.5); a = Math.min(170, a0 + 22); } else if (k >= 5 && k < 6) { c = mix(hi, sky, 0.65); a = Math.min(160, a0 + 14); }
    return [c, a];
  });
  A.cur = prev;
}
/** Polygon fill (metres) taking [colour, alpha] from f(i, j). */
export function polyCA(V, pts, f) {
  const P = pts.map(([u, v]) => [(u - V.o.u0) * V.ppm, (v - V.o.v0) * V.ppm]);
  let jmin = Infinity, jmax = -Infinity;
  for (const [, y] of P) { jmin = Math.min(jmin, y); jmax = Math.max(jmax, y); }
  for (let j = Math.floor(jmin); j <= Math.ceil(jmax); j++) {
    const yc = j + 0.5, xs = [];
    for (let k = 0; k < P.length; k++) { const [x0, y0] = P[k], [x1, y1] = P[(k + 1) % P.length]; if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + (yc - y0) / (y1 - y0) * (x1 - x0)); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let i = Math.round(xs[k]); i < Math.round(xs[k + 1]); i++) { const [c, a] = f(i, j); V.px(i, j, c, a); }
  }
}

/** Rust: a blistered patch round (ci, cj) px, size w x h, eating paint from the bottom edge up. */
export function rust(V, ci, cj, w, h, seed = 1, o = {}) {
  const r = seeded(seed), base = o.base ?? 0x8a4a26;
  const dark = mix(base, 0x2a160c, 0.55), mid = base, light = mix(base, 0xd08850, 0.45);
  const A = V.A, prev = A.cur;
  A.ink(ROUGH.matte);
  // a ragged top edge: a few bumps of different heights
  const bumps = Array.from({ length: 3 + Math.floor(r() * 3) }, () => ({ c: (r() - 0.5) * w, s: w * (0.15 + r() * 0.25), h: h * (0.5 + r() * 0.5) }));
  for (let i = -Math.ceil(w / 2); i <= Math.ceil(w / 2); i++) {
    let top = 0;
    for (const b of bumps) top = Math.max(top, b.h * Math.max(0, 1 - ((i - b.c) / b.s) ** 2));
    top = Math.round(top);
    for (let j = 0; j <= top; j++) {
      const ii = ci + i, jj = cj + j, edge = top - j;
      if (edge === 0) { if ((i + seed) % 3 === 0) V.px(ii, jj + 1, light); V.px(ii, jj, mid); }
      else V.px(ii, jj, edge > 2 && (i * 7 + j * 3 + seed) % 5 === 0 ? dark : edge === 1 ? mid : (i + j) % 4 === 0 ? mid : dark);
    }
  }
  // a couple of loose freckles above the patch
  for (let k = 0; k < (o.freckles ?? 3); k++) { const ii = ci + Math.round((r() - 0.5) * w * 1.2), jj = cj + Math.round(h + 2 + r() * h * 0.6); V.px(ii, jj, mid); V.px(ii, jj - 1, dark); }
  A.cur = prev;
}

/** A dent: a light crescent on its upper left, a shadow on its lower right (paint ramp R), centre (ci, cj) px. */
export function dent(V, ci, cj, rw, rh, R) {
  for (let j = -rh; j <= rh; j++) for (let i = -rw; i <= rw; i++) {
    const d = (i / rw) ** 2 + (j / rh) ** 2;
    if (d > 1) continue;
    const s = (-i / rw + j / rh) * 0.7; // > 0 upper-left (catches light)
    if (d > 0.45 && s > 0.25) V.px(ci + i, cj + j, R[3]);
    else if (d > 0.35 && s < -0.25) V.px(ci + i, cj + j, R[1]);
    else if (d < 0.35 && s < -0.15) V.px(ci + i, cj + j, mix(R[2], R[1], 0.5));
  }
}

/** A rectangular lamp (pixels): chrome bezel, lens with fluting, a bright reflector spot. kind: 'head' | 'amber' | 'red' | 'white' */
export const LAMP = {
  head: [0x6a7478, 0xa8b4b8, 0xd8e4e4, 0xf4fafa, 0xffffff],
  amber: [0x8a4a10, 0xc8701a, 0xf09a2a, 0xffc060, 0xffe0a0],
  red: [0x5a0e10, 0x9a1a1c, 0xc82a28, 0xe85a4a, 0xff9a88],
  white: [0x8a8e90, 0xb8bcbc, 0xdcdedc, 0xf0f0ee, 0xffffff],
};
export function lamp(V, i0, j0, i1, j1, kind = 'head', o = {}) {
  const L = LAMP[kind] || kind, A = V.A, prev = A.cur;
  const w = i1 - i0, h = j1 - j0;
  A.ink(ROUGH.lens);
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const x = i - i0, y = j - j0;
    let c;
    if (kind === 'head') {
      // clear ribbed glass over the reflector: a bright band across the upper third, the bulb's spot, ribs, a shaded rim
      const cx = (w - 1) / 2, cy = (h - 1) / 2;
      c = L[2];
      if (y >= Math.round(h * 0.55) && y <= Math.round(h * 0.55) + 1) c = L[3];
      if (Math.abs(x - cx) <= 1.5 && Math.abs(y - cy) <= 1) c = L[4];
      else if (y % 3 === 0) c = mix(c, L[1], 0.6);
      if (x === 0 || x === w - 1 || y === 0) c = L[1];
      if (y === h - 1) c = L[3];
      if ((x === 1 || x === 2) && y === h - 2) c = L[4];
    } else {
      // a fluted lens: darker ribs every third column, a lit top row, a shaded bottom row
      c = y === h - 1 ? L[3] : y === 0 ? L[1] : x % 3 === 2 ? L[1] : L[2];
      if (x === 1 && y === h - 2) c = L[4];
    }
    V.px(i, j, c);
  }
  if (o.bezel !== false) {
    A.ink(ROUGH.chrome);
    const C = o.bezel || [0x5a5e62, 0xc8ccd0, 0xf2f4f4];
    V.hline(i0 - 1, i1, j1, C[2]); V.hline(i0 - 1, i1, j0 - 1, C[0]);
    V.vline(i0 - 1, j0 - 1, j1, C[1]); V.vline(i1, j0 - 1, j1, C[0]);
  }
  A.cur = prev;
}

/** The lit version of a lamp (for the unlit 'on' material): a warm white / red / amber fill with the pattern kept. */
export function lampLit(V, i0, j0, i1, j1, kind = 'head') {
  const w = i1 - i0, h = j1 - j0;
  const C = { head: [0xfff6d8, 0xfffcf0, 0xffffff], red: [0xd81c18, 0xff3a2a, 0xff8a70], amber: [0xf08a10, 0xffb030, 0xffe090], white: [0xf0f0e8, 0xffffff, 0xffffff] }[kind];
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const x = i - i0, y = j - j0, dx = (x + 0.5) / w - 0.5, dy = (y + 0.5) / h - 0.5, d = Math.hypot(dx, dy * 1.4);
    V.px(i, j, d < 0.18 ? C[2] : d < 0.36 || (x + y) % 2 ? C[1] : C[0]);
  }
}

/** Japanese plate (in a patch view, any size ~2:1): kei yellow with dark text, the area line and the number. */
export function plate(V, { top = 'MORIO 480', num = '50-71', kana = 'a', bg = 0xf2d23a, ink = 0x1e2a1e, frame = 0x8a8a7a } = {}) {
  const A = V.A, prev = A.cur;
  A.ink(ROUGH.paint);
  const W = V.W, H = V.H;
  V.box(0, 0, W, H, bg);
  V.frame(0, 0, W, H, frame);
  V.hline(1, W - 2, H - 2, mix(bg, 0xffffff, 0.4));
  // bolts
  for (const i of [Math.round(W * 0.22), Math.round(W * 0.78) - 1]) { V.px(i, H - 4, 0x8a8a80); V.px(i + 1, H - 4, 0xc8c8c0); }
  V.text5(top, Math.round(W / 2), H - 4, ink, { align: 'center' });
  const s = H >= 30 ? 2 : 1;
  const w = V.text5(num, Math.round(W / 2 + 5), H - 13, ink, { align: 'center', s });
  // a hand-pixelled hiragana left of the number
  const K = { a: ['.#...', '#####', '..#..', '.####', '#.#.#', '#.#.#', '.#.#.'], sa: ['..#..', '#####', '...#.', '..#..', '.#...', '#....', '.###.'] }[kana] || [];
  V.sprite(K, { '#': ink }, Math.round(W / 2 + 5 - w / 2) - 8, H - 15);
  A.cur = prev;
}

/** A tyre's tread strip (patch view): blocks across, grooves, worn shoulders. */
export function tread(V, o = {}) {
  const A = V.A, prev = A.cur;
  A.ink(ROUGH.rubber);
  const base = o.base ?? 0x2a2a2c, dark = mix(base, 0x000000, 0.45), lite = mix(base, 0xffffff, 0.14);
  for (let j = 0; j < V.H; j++) for (let i = 0; i < V.W; i++) {
    const y = j / V.H; // across the width
    let c = base;
    if (y < 0.12 || y > 0.88) c = (i % 4 === 0) ? dark : base; // shoulders
    else if (Math.abs(y - 0.5) < 0.06 || Math.abs(y - 0.3) < 0.04 || Math.abs(y - 0.7) < 0.04) c = dark; // grooves
    else if ((i + (y > 0.5 ? 2 : 0)) % 6 === 0) c = dark; // sipes
    V.px(i, j, c);
  }
  A.cur = prev;
}

/**
 * A wheel seen side on (square patch, the tyre's outer edge touching the sides): the sidewall (a bead ring, a shoulder
 * lit from above, a raised lettering band), the rim's chrome lip, the steel disc with round ventilation holes, the
 * hubcap and its nuts. Radii as fractions of the half width.
 */
export function wheelFace(V, o = {}) {
  const A = V.A, prev = A.cur, N = V.W, c = N / 2;
  const rim = o.rim ?? 0.58, cap = o.cap ?? 0.2, holes = o.holes ?? 6;
  const steel = ramp(o.steel ?? 0xb8bcbc), tyre = o.tyre ?? 0x2a2a2c, T = [mix(tyre, 0x000000, 0.35), mix(tyre, 0x000000, 0.15), tyre, mix(tyre, 0xffffff, 0.1), mix(tyre, 0xffffff, 0.2)];
  const chrome = [0x6a7074, 0xc8ced2, 0xf4f8f8];
  const holeAt = [];
  for (let k = 0; k < holes; k++) { const a = (k / holes) * Math.PI * 2 + Math.PI / holes; holeAt.push([c + Math.cos(a) * c * 0.4, c + Math.sin(a) * c * 0.4]); }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = i + 0.5 - c, dy = j + 0.5 - c, r = Math.hypot(dx, dy) / c;
    if (r > 1.02) continue;
    const lit = dy > 0; // the top half catches the sky
    let col;
    if (r > rim + 0.03) {
      A.ink(ROUGH.rubber);
      col = r > 0.94 ? (lit ? T[3] : T[1]) : r < rim + 0.08 ? T[0] : r > 0.8 && r < 0.84 ? (lit ? T[3] : T[2]) : T[2];
    } else if (r > rim - 0.05) {
      A.ink(ROUGH.chrome);
      col = r > rim - 0.01 ? chrome[0] : (dx - dy < 0 ? chrome[2] : chrome[1]);
    } else if (r > cap) {
      A.ink(ROUGH.metal);
      col = r > rim - 0.12 ? (lit ? steel[2] : steel[1]) : r < cap + 0.07 ? steel[3] : steel[2];
      for (const [hx, hy] of holeAt) { const d = Math.hypot(i + 0.5 - hx, j + 0.5 - hy) / c; if (d < 0.085) col = d > 0.06 && hy > c ? steel[0] : 0x101012; }
    } else {
      A.ink(ROUGH.chrome);
      col = r > cap - 0.04 ? chrome[0] : (dx < 0 && dy > 0 ? chrome[2] : chrome[1]);
    }
    V.px(i, j, col);
  }
  // lug nuts round the hubcap
  A.ink(ROUGH.chrome);
  for (let k = 0; k < (o.nuts ?? 4); k++) { const a = k / (o.nuts ?? 4) * Math.PI * 2 + Math.PI / 4, x = Math.round(c + Math.cos(a) * c * (cap + 0.1) - 0.5), y = Math.round(c + Math.sin(a) * c * (cap + 0.1) - 0.5); V.px(x, y, chrome[2]); V.px(x + 1, y, chrome[1]); V.px(x, y - 1, chrome[1]); V.px(x + 1, y - 1, chrome[0]); }
  A.cur = prev;
}
