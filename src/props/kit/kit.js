// The prop modelling kit: a builder handed to every prop model (src/props/models/*.js). It wraps the shared
// low-poly triangle builder (src/vehicles/geom.js) and a family atlas page (./page.js) with the primitives props are
// made of, each taking its colour first:
//   K.box(c, x0, y0, z0, x1, y1, z1, { bevel })     K.bx(c, cx, y0, cz, w, h, d, { bevel })  (centred footprint)
//   K.cyl(c, cx, y0, cz, r, h, n, { r1, axis })     K.lathe(c, [x, y, z], [[r, t], ...], n, { axis, arc })
//   K.ball(c, x, y, z, rx, ry, rz, n, m)            K.tube(c, pts, r, n, { closed })   K.rod(c, a, b, r, n)
//   K.prism(c, pts, { plane, a, b })                K.quad(c, a, b, c2, d, hint)       K.sheet(c, a, b, c2, d)
//   K.plank(wood, x0, y0, z0, x1, y1, z1, { bevel }) a board with painted grain
//   K.patch(key, w, h, paint, { shared })           a printed region (pixel art); K.face / K.quadUV / K.wrap put it on
//   K.at([x, y, z], fn, { ry, rx, rz, s })          K.glow(fn)   K.glass(fn)   (material slots 3 and 4)
// A colour is a hex number (a matte swatch), a material from the helpers below (paint(), plastic(), metal(), ...:
// roughness and a lighter worn edge on chamfers), a View (painted region, projected) or a uv function.
// K.finish() returns the BufferGeometry: indexed, position / normal / uv, groups by material slot, plus a `color`
// attribute baked from the atlas, so code that still draws props with the old vertex-coloured voxel materials gets a
// flat-coloured version of the same model.
import * as THREE from 'three';
import { Geo, norm, cross, sub } from '../../vehicles/geom.js';
import { ROUGH } from '../../vehicles/atlas.js';
import { mix } from '../../vehicles/paint.js';

export const OPAQUE = 0, GLOW = 3, GLASS = 4;
const WARM = 0xfff6e0, COOL = 0x1c2238;
export const lighten = (c, t) => mix(c, WARM, t);
export const darken = (c, t) => mix(c, COOL, t);
export { mix };

// ---- materials: { c: colour, r: roughness, e: worn-edge colour (chamfers) }
export const mat = (c, r = ROUGH.matte, e = null) => ({ c, r, e });
/** Gloss paint on steel: the chamfers catch the light. */
export const paint = (c, k = 0.3) => mat(c, 0.55, lighten(c, k));
export const enamel = (c) => mat(c, 0.45, lighten(c, 0.35));
export const plastic = (c, k = 0.2) => mat(c, 0.68, lighten(c, k));
export const metal = (c, k = 0.4) => mat(c, 0.45, lighten(c, k));
export const chrome = (c = 0xc8ced2) => mat(c, 0.3, lighten(c, 0.55));
export const matte = (c, k = 0.14) => mat(c, 0.9, k ? lighten(c, k) : null);
export const rubber = (c = 0x2a2a2c) => mat(c, 0.95, lighten(c, 0.12));
export const wood = (c, k = 0.18) => mat(c, 0.8, lighten(c, k));
export const stone = (c, k = 0.16) => mat(c, 0.95, lighten(c, k));
export const fabric = (c) => mat(c, 0.97, null);
export const ceramic = (c) => mat(c, 0.4, lighten(c, 0.3));
export const flat = (c, r = ROUGH.matte) => mat(c, r, null);

/** Keep paint off pure white: under the afternoon sun anything brighter than this burns out (lamps are unlit, they stay). */
export function lim(c) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, m = Math.max(r, g, b);
  if (m <= 222) return c;
  const k = (222 + (m - 222) * 0.36) / m;
  return (Math.round(r * k) << 16) | (Math.round(g * k) << 8) | Math.round(b * k);
}
function limRegion(A, r) {
  const d = A.d, W = A.w;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    const i = (y * W + x) * 4, m = Math.max(d[i], d[i + 1], d[i + 2]);
    if (m > 222) { const k = (222 + (m - 222) * 0.36) / m; d[i] = Math.round(d[i] * k); d[i + 1] = Math.round(d[i + 1] * k); d[i + 2] = Math.round(d[i + 2] * k); }
  }
}
const SRGB = new Float32Array(256);
for (let i = 0; i < 256; i++) { const v = i / 255; SRGB[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
const FACE = { '+z': 0, '-z': 1, '+x': 2, '-x': 3, '+y': 4, '-y': 5 };

export class Kit {
  /** page: the atlas page; B: the prop's box in metres { x0, y0, z0, x1, y1, z1, w, h, d } (its old voxel bounds). */
  constructor(page, id, B) {
    this.A = page; this.id = id; this.B = B;
    this.G = new Geo(5);
    this.rough = ROUGH.matte;
  }

  // ------------------------------------------------------------------ colours
  /** uv function of a colour / material / view / uv function. */
  uv(c) {
    if (typeof c === 'function') return c;
    if (typeof c === 'number') return this.A.swatch(lim(c), this.rough);
    if (c && c.map3) return c.map3;
    if (c && c.c !== undefined) return this.A.swatch(lim(c.c), c.r ?? this.rough);
    throw new Error(`${this.id}: bad colour ${c}`);
  }
  /** The chamfer colour of a material (or null). */
  edge(c) { return c && typeof c === 'object' && c.e != null ? this.A.swatch(lim(c.e), c.r ?? this.rough) : null; }
  /** A see-through swatch (glass slot): colour + alpha 0..255. */
  tint(c, a = 110, rough = ROUGH.glass) {
    return this.A.shared(`tint:${c}:${a}:${rough}`, (A) => {
      const r = A.alloc(4, 4), prev = A.cur;
      A.ink(rough);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) A.set(r.x + i, r.y + j, c, a);
      A.cur = prev;
      const t = [(r.x + 2) / A.w, 1 - (r.y + 2) / A.h];
      return () => t;
    });
  }
  /** Run fn with a colour set on the underlying Geo (for calling G directly). */
  use(c, fn, slot = null) { this.G.with(this.uv(c), slot, fn); return this; }
  glow(fn) { const g = this.G.g; this.G.g = GLOW; try { fn(this); } finally { this.G.g = g; } return this; }
  glass(fn) { const g = this.G.g; this.G.g = GLASS; try { fn(this); } finally { this.G.g = g; } return this; }

  // ------------------------------------------------------------------ transforms
  /** Run fn in a moved / turned / scaled frame. o: { ry, rx, rz, s | [sx, sy, sz] } */
  at(p, fn, o = {}) {
    const s = o.s === undefined ? [1, 1, 1] : typeof o.s === 'number' ? [o.s, o.s, o.s] : o.s;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0, o.order || 'YXZ')), new THREE.Vector3(s[0], s[1], s[2]));
    this.G.push(m);
    try { fn(this); } finally { this.G.pop(); }
    return this;
  }
  /** fn(1) and fn(-1): for the left and right of something symmetric. */
  sym(fn) { fn(1); fn(-1); return this; }

  // ------------------------------------------------------------------ boxes
  box(c, x0, y0, z0, x1, y1, z1, o = {}) {
    const G = this.G, uv = this.uv(c), e = o.bevel ? (o.edge !== undefined ? (o.edge === null ? null : this.uv(o.edge)) : this.edge(c)) : null;
    const prev = G.uv;
    G.uv = e ? (p, n) => (Math.max(Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])) > 0.985 ? uv(p, n) : e(p, n)) : uv;
    G.box(x0, y0, z0, x1, y1, z1, o);
    G.uv = prev;
    return this;
  }
  /** A box by its footprint centre, base height and size. */
  bx(c, cx, y0, cz, w, h, d, o = {}) { return this.box(c, cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, o); }
  /** An open-topped box shell (a crate, a tray, a bin): walls t thick, floor tf; inside colour ci. */
  tub(c, x0, y0, z0, x1, y1, z1, t, o = {}) {
    const ci = o.inside ?? c, tf = o.floor ?? t, b = o.bevel || 0;
    this.box(c, x0, y0, z0, x1, y0 + tf, z1, { bevel: b, skip: ['py'] });
    this.box(c, x0, y0 + tf * 0.5, z0, x0 + t, y1, z1, { bevel: b, skip: ['px'] }); this.box(c, x1 - t, y0 + tf * 0.5, z0, x1, y1, z1, { bevel: b, skip: ['nx'] });
    this.box(c, x0 + t * 0.5, y0 + tf * 0.5, z0, x1 - t * 0.5, y1, z0 + t, { bevel: b, skip: ['pz'] }); this.box(c, x0 + t * 0.5, y0 + tf * 0.5, z1 - t, x1 - t * 0.5, y1, z1, { bevel: b, skip: ['nz'] });
    // the inside faces
    this.use(ci, (G) => G.box(x0 + t, y0 + tf, z0 + t, x1 - t, y1 - b * 0.5, z1 - t, { inward: true, skip: ['py'] }));
    return this;
  }

  // ------------------------------------------------------------------ round things
  /**
   * A solid of revolution. at: [x, y, z] of the axis origin; prof: [[r, t], ...] radius at distance t along the axis
   * (y by default); n sides. o: { axis: 'x' | 'y' | 'z', a0 (first corner angle), arc (default the full turn),
   * uvBand(k, s0, s1) -> uvs for band k between turn fractions s0..s1, sx / sz: squash the section (ellipse) }
   */
  lathe(c, at, prof, n = 10, o = {}) {
    const G = this.G, uv = this.uv(c), prev = G.uv;
    G.uv = uv;
    const axis = o.axis || 'y', arc = o.arc ?? Math.PI * 2, full = arc >= Math.PI * 2 - 1e-6;
    const a0 = o.a0 ?? (full ? Math.PI / n + Math.PI / 2 : 0), sx = o.sx ?? 1, sz = o.sz ?? 1;
    const P = (r, t, a) => {
      const u = Math.cos(a) * r * sx, w = Math.sin(a) * r * sz;
      return axis === 'y' ? [at[0] + u, at[1] + t, at[2] + w] : axis === 'x' ? [at[0] + t, at[1] + u, at[2] + w] : [at[0] + u, at[1] + w, at[2] + t];
    };
    const N = (dr, dt, a) => {
      // outward: the profile's tangent (dr, dt) turned to (dt, -dr), swept round; which way is "out" depends on the profile's direction
      const u = Math.cos(a) * dt, w = Math.sin(a) * dt, t = -dr;
      return axis === 'y' ? [u, t, w] : axis === 'x' ? [t, u, w] : [u, w, t];
    };
    // profiles run from the low end to the high end with the surface on the outside when t increases; a profile
    // that runs the other way (or an inner wall) is given with o.flip
    const sgn = o.flip ? -1 : 1;
    for (let k = 0; k + 1 < prof.length; k++) {
      const [r0, t0] = prof[k], [r1, t1] = prof[k + 1];
      if (r0 < 1e-7 && r1 < 1e-7) continue;
      const dr = r1 - r0, dt = t1 - t0;
      for (let s = 0; s < n; s++) {
        const aA = a0 + (s / n) * arc, aB = a0 + ((s + 1) / n) * arc, am = (aA + aB) / 2;
        const h = N(dr, dt, am).map((v) => v * sgn);
        const q = [P(r0, t0, aA), P(r0, t0, aB), P(r1, t1, aB), P(r1, t1, aA)];
        G.quad(q[0], q[1], q[2], q[3], norm(h), o.uvBand ? o.uvBand(k, s / n, (s + 1) / n) : null);
      }
    }
    G.uv = prev;
    return this;
  }
  /** Cylinder (or cone frustum with o.r1) standing on (cx, y0, cz); o.axis lays it along x or z (from that point). */
  cyl(c, cx, y0, cz, r, h, n = 10, o = {}) {
    const r1 = o.r1 ?? r, b = Math.min(o.bevel || 0, r * 0.45, r1 * 0.45, h * 0.45), e = b ? this.edge(c) : null;
    const cap0 = o.cap0 ?? o.caps ?? true, cap1 = o.cap1 ?? o.caps ?? true;
    const prof = [];
    if (cap0) prof.push([0, 0]);
    if (b) prof.push([r - b, 0], [r, b], [r1, h - b], [r1 - b, h]); else prof.push([r, 0], [r1, h]);
    if (cap1) prof.push([0, h]);
    if (!e) return this.lathe(c, [cx, y0, cz], prof, n, o);
    // chamfered rims in the worn-edge colour
    const i0 = cap0 ? 1 : 0;
    this.lathe(c, [cx, y0, cz], prof.slice(0, i0 + 1), n, o);
    this.lathe(e, [cx, y0, cz], prof.slice(i0, i0 + 2), n, o);
    this.lathe(c, [cx, y0, cz], prof.slice(i0 + 1, i0 + 3), n, o);
    this.lathe(e, [cx, y0, cz], prof.slice(i0 + 2, i0 + 4), n, o);
    return this.lathe(c, [cx, y0, cz], prof.slice(i0 + 3), n, o);
  }
  /** A pipe wall: outer radius r, inner ri, open at both ends (a bucket, a tyre standing, a ring). */
  ring(c, cx, y0, cz, r, ri, h, n = 10, o = {}) {
    this.lathe(c, [cx, y0, cz], [[ri, 0], [r, 0], [o.r1 ?? r, h], [o.ri1 ?? ri, h]], n, o);
    return this.lathe(o.inside ?? c, [cx, y0, cz], [[ri, 0], [o.ri1 ?? ri, h]], n, { ...o, flip: true });
  }
  /** Ellipsoid centred on (x, y, z), radii rx / ry / rz, n round, m rings. o: { y0, y1: cut it between these fractions (-1..1) } */
  ball(c, x, y, z, rx, ry = rx, rz = rx, n = 8, m = 5, o = {}) {
    const prof = [], t0 = o.y0 ?? -1, t1 = o.y1 ?? 1;
    const b0 = Math.asin(Math.max(-1, Math.min(1, t0))), b1 = Math.asin(Math.max(-1, Math.min(1, t1)));
    if (t0 > -1 && o.cap !== false) prof.push([0, Math.sin(b0) * ry]);
    for (let k = 0; k <= m; k++) { const b = b0 + (b1 - b0) * (k / m); prof.push([Math.cos(b), Math.sin(b) * ry]); }
    if (t1 < 1 && o.cap !== false) prof.push([0, Math.sin(b1) * ry]);
    return this.lathe(c, [x, y, z], prof, n, { ...o, sx: rx, sz: rz });
  }
  /** Torus about an axis through (x, y, z): ring radius R, tube r. */
  torus(c, x, y, z, R, r, n = 12, m = 5, o = {}) {
    const prof = [];
    // the section runs from the inside under the bottom, up the outside and back over the top (the lathe's outward rule)
    for (let k = 0; k <= m; k++) { const b = Math.PI + (k / m) * Math.PI * 2; prof.push([R + Math.cos(b) * r, Math.sin(b) * r]); }
    return this.lathe(c, [x, y, z], prof, n, o);
  }

  // ------------------------------------------------------------------ swept things
  /** A round bar from a to b. */
  rod(c, a, b, r, n = 5, o = {}) { return this.tube(c, [a, b], r, n, o); }
  /**
   * A bar of n sides swept along a path (mitred corners). o: { closed, caps (default true), r1: end radius (taper),
   * radii: [r per point], flat: [w, h] a rectangular section (n = 4) with its width across `up` }
   */
  tube(c, pts, r, n = 5, o = {}) {
    const G = this.G, prev = G.uv;
    G.uv = this.uv(c);
    const N = pts.length, closed = !!o.closed, V = (p) => new THREE.Vector3(p[0], p[1], p[2]);
    const P = pts.map(V), T = [];
    for (let i = 0; i < N; i++) {
      const a = closed ? P[(i - 1 + N) % N] : P[Math.max(0, i - 1)], b = closed ? P[(i + 1) % N] : P[Math.min(N - 1, i + 1)];
      const d0 = P[i].clone().sub(a), d1 = b.clone().sub(P[i]);
      if (d0.lengthSq() > 1e-12) d0.normalize();
      if (d1.lengthSq() > 1e-12) d1.normalize();
      T.push(d0.add(d1).normalize());
    }
    // a frame carried along the path (parallel transport)
    let up = new THREE.Vector3(...(o.up || [0, 1, 0]));
    if (Math.abs(up.dot(T[0])) > 0.95) up = new THREE.Vector3(1, 0, 0);
    let nrm = up.clone().sub(T[0].clone().multiplyScalar(up.dot(T[0]))).normalize();
    const rings = [], q = new THREE.Quaternion();
    for (let i = 0; i < N; i++) {
      if (i > 0) { q.setFromUnitVectors(T[i - 1], T[i]); nrm.applyQuaternion(q).normalize(); }
      const bin = new THREE.Vector3().crossVectors(T[i], nrm).normalize();
      // widen the ring at a corner so the bar keeps its thickness
      const a = closed ? P[(i - 1 + N) % N] : P[Math.max(0, i - 1)], b = closed ? P[(i + 1) % N] : P[Math.min(N - 1, i + 1)];
      let k = 1;
      if ((closed || (i > 0 && i < N - 1))) { const d0 = P[i].clone().sub(a).normalize(), d1 = b.clone().sub(P[i]).normalize(); const cs = Math.sqrt(Math.max(0.25, (1 + d0.dot(d1)) / 2)); k = 1 / cs; }
      const rr = (o.radii ? o.radii[i] : o.r1 !== undefined ? r + (o.r1 - r) * (i / (N - 1)) : r);
      const ring = [];
      for (let s = 0; s < n; s++) {
        const ang = (s / n) * Math.PI * 2 + (o.a0 ?? Math.PI / n);
        let cu = Math.cos(ang) * rr, cv = Math.sin(ang) * rr;
        if (o.flat) { cu = Math.sign(Math.cos(ang)) * o.flat[0] / 2; cv = Math.sign(Math.sin(ang)) * o.flat[1] / 2; }
        // the corner stretch only applies across the bend; applying it all round is close enough for thin bars
        ring.push([P[i].x + (nrm.x * cu + bin.x * cv) * k, P[i].y + (nrm.y * cu + bin.y * cv) * k, P[i].z + (nrm.z * cu + bin.z * cv) * k]);
      }
      rings.push(ring);
    }
    const segs = closed ? N : N - 1;
    for (let i = 0; i < segs; i++) {
      const A = rings[i], B = rings[(i + 1) % N], ca = pts[i], cb = pts[(i + 1) % N];
      for (let s = 0; s < n; s++) {
        const s1 = (s + 1) % n;
        const mid = [(A[s][0] + A[s1][0] + B[s][0] + B[s1][0]) / 4 - (ca[0] + cb[0]) / 2, (A[s][1] + A[s1][1] + B[s][1] + B[s1][1]) / 4 - (ca[1] + cb[1]) / 2, (A[s][2] + A[s1][2] + B[s][2] + B[s1][2]) / 4 - (ca[2] + cb[2]) / 2];
        G.quad(A[s], A[s1], B[s1], B[s], mid);
      }
    }
    if (!closed && o.caps !== false) {
      G.fan(rings[0], [-T[0].x, -T[0].y, -T[0].z]);
      G.fan(rings[N - 1], [T[N - 1].x, T[N - 1].y, T[N - 1].z]);
    }
    G.uv = prev;
    return this;
  }
  /** Points of an arc: centre c, radius r, from a0 to a1 in `n` steps, in plane 'xy' | 'xz' | 'zy'. */
  arc(c, r, a0, a1, n = 6, plane = 'xy', ry = r) {
    const out = [];
    for (let k = 0; k <= n; k++) {
      const a = a0 + (a1 - a0) * (k / n), u = Math.cos(a) * r, v = Math.sin(a) * ry;
      out.push(plane === 'xy' ? [c[0] + u, c[1] + v, c[2]] : plane === 'xz' ? [c[0] + u, c[1], c[2] + v] : [c[0], c[1] + v, c[2] + u]);
    }
    return out;
  }

  // ------------------------------------------------------------------ flat things
  quad(c, a, b, c2, d, hint = null, uvs = null) { this.use(c, (G) => G.quad(a, b, c2, d, hint, uvs)); return this; }
  tri(c, a, b, c2, hint = null) { this.use(c, (G) => G.tri(a, b, c2, hint)); return this; }
  /** A two-sided sheet (paper, a flag, a leaf): both faces, the back in `back` (default the same). */
  sheet(c, a, b, c2, d, o = {}) {
    const n = norm(cross(sub(c2, a), sub(d, b)));
    this.quad(c, a, b, c2, d, n, o.uvs || null);
    this.quad(o.back ?? c, a, b, c2, d, [-n[0], -n[1], -n[2]], o.uvs || null);
    return this;
  }
  /**
   * An outline extruded into a prism. pts: 2D outline; plane 'xy' (extruded along z from a to b), 'xz' (along y),
   * 'zy' (along x). o: { caps: false | 'a' | 'b', side: colour of the walls, holes: [outline, ...] }
   */
  prism(c, pts, o = {}) {
    const plane = o.plane || 'xy', a = o.a ?? 0, b = o.b ?? 0.01, G = this.G;
    const to3 = (p, t) => (plane === 'xy' ? [p[0], p[1], t] : plane === 'xz' ? [p[0], t, p[1]] : [t, p[1], p[0]]);
    const ax = plane === 'xy' ? [0, 0, 1] : plane === 'xz' ? [0, 1, 0] : [1, 0, 0];
    let area = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; }
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const walls = (loop, inner) => {
      let ar = 0;
      for (let i = 0; i < loop.length; i++) { const p = loop[i], q = loop[(i + 1) % loop.length]; ar += p[0] * q[1] - q[0] * p[1]; }
      for (let i = 0; i < loop.length; i++) {
        const p = loop[i], q = loop[(i + 1) % loop.length];
        // outward 2D normal of the edge (for a ccw loop: to the right of its direction)
        let nx = q[1] - p[1], ny = -(q[0] - p[0]);
        if (ar < 0) { nx = -nx; ny = -ny; }
        if (inner) { nx = -nx; ny = -ny; }
        const h = plane === 'xy' ? [nx, ny, 0] : plane === 'xz' ? [nx, 0, ny] : [0, ny, nx];
        G.quad(to3(p, lo), to3(q, lo), to3(q, hi), to3(p, hi), h);
      }
    };
    this.use(o.side ?? c, () => { walls(pts, false); for (const h of o.holes || []) walls(h, true); });
    this.use(c, () => {
      if (o.caps !== false && o.caps !== 'a') G.polyHoles(pts, o.holes || [], (u, v) => to3([u, v], hi), ax);
      if (o.caps !== false && o.caps !== 'b') G.polyHoles(pts, o.holes || [], (u, v) => to3([u, v], lo), ax.map((v) => -v));
    });
    void area;
    return this;
  }

  // ------------------------------------------------------------------ printed and painted regions
  /**
   * A w x h pixel region of the page, painted by paint(V, K) (V: an atlas View, pixel coordinates from the bottom
   * left). o.shared: painted once per page under this key and reused by every prop.
   */
  patch(key, w, h, paint, o = {}) {
    const make = () => {
      const V = this.A.patch(`${o.shared ? '' : this.id + ':'}${key}`, w, h);
      const prev = this.A.cur, was = this._region;
      this.A.ink(o.rough ?? ROUGH.matte);
      this._region = V;
      try { paint(V, this); } finally { this._region = was; }
      this.A.cur = prev;
      if (!o.bright) limRegion(this.A, V.r);
      bleed(this.A, V.r);
      return V;
    };
    return o.shared ? this.A.shared('patch:' + key, make) : make();
  }
  /**
   * A blueprint view: a region painted in metres that faces take their colours from by projection (o.u / o.v map a
   * model point [x, y, z] to the view's metres; u0..u1, v0..v1 its extent; ppm pixels per metre). paint(V, K).
   */
  view(key, o, paint) {
    const V = this.A.view(`${this.id}:${key}`, o), prev = this.A.cur, was = this._region;
    this.A.ink(o.rough ?? ROUGH.matte);
    this._region = V;
    try { paint(V, this); } finally { this._region = was; }
    this.A.cur = prev;
    if (!o.bright) limRegion(this.A, V.r);
    bleed(this.A, V.r);
    return V;
  }
  /** A painted region on a triangle: st = [[s, t] x 3] in the region (0..1). */
  triUV(V, a, b, c, st, hint = null) { this.G.tri(a, b, c, hint, st.map(([s, t]) => V.st(s, t))); return this; }
  /** Paint that needs a web font: runs now if the font is in, otherwise when it has loaded. */
  whenFont(text, fn) {
    const V = this._region, A = this.A, rough = A.cur;
    if (typeof document === 'undefined' || !document.fonts?.load) return;
    if (document.fonts.check('16px "DotGothic16"', text)) { fn(); return; }
    document.fonts.load('16px "DotGothic16"', text).then(() => { const p = A.cur; A.cur = rough; fn(); A.cur = p; if (V) { limRegion(A, V.r); bleed(A, V.r); } A.touch(); }, () => {});
  }
  /**
   * Put a painted region on an axis-aligned rectangle. facing: '+z' | '-z' | '+x' | '-x' | '+y' | '-y'; (a0, b0) -
   * (a1, b1): the rectangle in the face's plane (x, y for z faces; z, y for x faces; x, z for y faces), at depth w
   * on the facing axis. The region reads left to right for someone looking at the face. o: { sub: [s0, t0, s1, t1],
   * rot: quarter turns, flip }
   */
  face(V, facing, a0, b0, a1, b1, w, o = {}) {
    const [lo, hi] = [Math.min(a0, a1), Math.max(a0, a1)], [bl, bh] = [Math.min(b0, b1), Math.max(b0, b1)];
    let q, n;
    switch (FACE[facing]) {
      case 0: q = [[lo, bl, w], [hi, bl, w], [hi, bh, w], [lo, bh, w]]; n = [0, 0, 1]; break;
      case 1: q = [[hi, bl, w], [lo, bl, w], [lo, bh, w], [hi, bh, w]]; n = [0, 0, -1]; break;
      case 2: q = [[w, bl, hi], [w, bl, lo], [w, bh, lo], [w, bh, hi]]; n = [1, 0, 0]; break;
      case 3: q = [[w, bl, lo], [w, bl, hi], [w, bh, hi], [w, bh, lo]]; n = [-1, 0, 0]; break;
      case 4: q = [[lo, w, bh], [hi, w, bh], [hi, w, bl], [lo, w, bl]]; n = [0, 1, 0]; break;
      default: q = [[lo, w, bl], [hi, w, bl], [hi, w, bh], [lo, w, bh]]; n = [0, -1, 0];
    }
    return this.quadUV(V, q[0], q[1], q[2], q[3], n, o);
  }
  /** A painted region on any quad: p0 bottom-left, p1 bottom-right, p2 top-right, p3 top-left (as read). */
  quadUV(V, p0, p1, p2, p3, hint = null, o = {}) {
    const [s0, t0, s1, t1] = o.sub || [0, 0, 1, 1], e = 0.5 / Math.max(V.W, V.H);
    let T = [V.st(s0 + e, t0 + e), V.st(s1 - e, t0 + e), V.st(s1 - e, t1 - e), V.st(s0 + e, t1 - e)];
    if (o.flip) T = [T[1], T[0], T[3], T[2]];
    for (let k = 0; k < (o.rot || 0); k++) T = [T[1], T[2], T[3], T[0]];
    this.G.quad(p0, p1, p2, p3, hint, T);
    if (o.both) this.G.quad(p0, p1, p2, p3, hint ? hint.map((v) => -v) : null, T);
    return this;
  }
  /**
   * A painted region wrapped round an upright n-sided cylinder (a label on a can, a band on a post), lying on its
   * facets: centred on angle `turn` (0 = facing +z, positive towards +x), `arc` wide (default all the way round),
   * from y0 to y1; r / r1: the cylinder's radius at y0 / y1; o.n must be the cylinder's side count.
   */
  wrap(V, cx, y0, y1, cz, r, o = {}) {
    const n = o.n ?? 10, arc = o.arc ?? Math.PI * 2, turn = o.turn ?? 0, lift = o.lift ?? 0.0012, r1 = (o.r1 ?? r) + lift, r0 = r + lift;
    const [s0, t0, s1, t1] = o.sub || [0, 0, 1, 1], step = (Math.PI * 2) / n, ph = Math.PI / n, A0 = turn - arc / 2, A1 = turn + arc / 2;
    const br = [A0];
    for (let k = Math.ceil((A0 - ph) / step + 1e-6); ph + k * step < A1 - 1e-6; k++) br.push(ph + k * step);
    br.push(A1);
    const cn = Math.cos(ph), e = 0.5 / V.W, ev = 0.5 / V.H;
    const P = (a, y, rr) => { const c = Math.round(a / step) * step, q = (rr * cn) / Math.cos(a - c); return [cx + Math.sin(a) * q, y, cz + Math.cos(a) * q]; };
    for (let k = 0; k + 1 < br.length; k++) {
      const a = br[k], b = br[k + 1], am = Math.round(((a + b) / 2) / step) * step;
      let u0 = s0 + (s1 - s0) * ((a - A0) / arc), u1 = s0 + (s1 - s0) * ((b - A0) / arc);
      if (k === 0) u0 += Math.sign(s1 - s0) * e;
      if (k === br.length - 2) u1 -= Math.sign(s1 - s0) * e;
      this.G.quad(P(a, y0, r0), P(b, y0, r0), P(b, y1, r1), P(a, y1, r1), [Math.sin(am), 0, Math.cos(am)], [V.st(u0, t0 + ev), V.st(u1, t0 + ev), V.st(u1, t1 - ev), V.st(u0, t1 - ev)]);
    }
    return this;
  }
  /** uv function stretching a region over a box's faces along one axis (the grain of a board runs along `axis`). */
  along(V, box, axis) {
    const [x0, y0, z0, x1, y1, z1] = box, lo = [x0, y0, z0], hi = [x1, y1, z1], L = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const cl = (v) => Math.min(0.995, Math.max(0.005, v));
    return (p, n) => {
      const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
      const N = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2;
      if (N === L) return V.st(0.5, 0.5);
      const O = 3 - N - L; // the in-plane axis across the grain
      return V.st(cl((p[L] - lo[L]) / (hi[L] - lo[L] || 1)), cl((p[O] - lo[O]) / (hi[O] - lo[O] || 1)));
    };
  }

  // ------------------------------------------------------------------ the result
  get tris() { return this.G.tris; }
  finish() {
    const geo = this.G.build(), n = geo.attributes.position.count;
    // colours for the old vertex-coloured materials: the atlas colour under each corner, pulled a little towards
    // the middle of its triangle (so a corner on a painted line does not smear across the face)
    const uv = geo.attributes.uv.array, col = new Float32Array(n * 3), A = this.A, d = A.d, W = A.w, H = A.h;
    for (let t = 0; t < n; t += 3) {
      const cu = (uv[t * 2] + uv[t * 2 + 2] + uv[t * 2 + 4]) / 3, cv = (uv[t * 2 + 1] + uv[t * 2 + 3] + uv[t * 2 + 5]) / 3;
      for (let k = 0; k < 3; k++) {
        const u = uv[(t + k) * 2] * 0.8 + cu * 0.2, v = uv[(t + k) * 2 + 1] * 0.8 + cv * 0.2;
        const x = Math.min(W - 1, Math.max(0, Math.floor(u * W))), y = Math.min(H - 1, Math.max(0, Math.floor((1 - v) * H))), i = (y * W + x) * 4;
        col[(t + k) * 3] = SRGB[d[i]]; col[(t + k) * 3 + 1] = SRGB[d[i + 1]]; col[(t + k) * 3 + 2] = SRGB[d[i + 2]];
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const B = this.B;
    geo.userData.size = new THREE.Vector3(B.w, B.h, B.d);
    geo.userData.lowPoly = true;
    geo.userData.page = A;
    geo.userData.tris = n / 3;
    this.A.props++;
    this.A.touch();
    return geo;
  }
}

/** Copy a region's edge pixels into its padding, so minified sampling never pulls in the neighbour (or black). */
export function bleed(A, r, pad = 2) {
  const { x, y, w, h } = r, d = A.d, W = A.w, cp = (sx, sy, dx, dy) => {
    if (dx < 0 || dy < 0 || dx >= A.w || dy >= A.h) return;
    const s = (sy * W + sx) * 4, t = (dy * W + dx) * 4;
    d[t] = d[s]; d[t + 1] = d[s + 1]; d[t + 2] = d[s + 2]; d[t + 3] = d[s + 3];
    A.r[dy * W + dx] = A.r[sy * W + sx];
  };
  for (let k = 1; k <= pad; k++) {
    for (let i = 0; i < w; i++) { cp(x + i, y, x + i, y - k); cp(x + i, y + h - 1, x + i, y + h - 1 + k); }
    for (let j = -pad; j < h + pad; j++) { const sy = Math.min(y + h - 1, Math.max(y, y + j)); cp(x, sy, x - k, y + j); cp(x + w - 1, sy, x + w - 1 + k, y + j); }
  }
}
