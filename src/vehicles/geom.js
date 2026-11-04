// Low-poly geometry for the vehicles: flat-shaded triangles with atlas uvs, collected per material slot (group) and
// built into one BufferGeometry (one draw call per slot). Faces get their uvs from the current uv function: an atlas
// view (src/vehicles/atlas.js) projecting the point, a swatch, or explicit coordinates.
//   const G = new Geo(2)            G.uv = view.map3 / atlas.swatch(c) / views(...)   G.g = slot
//   G.quad(a, b, c, d, hint)        corners [x, y, z]; the winding is fixed to face `hint` (an outward direction)
//   G.box(x0, y0, z0, x1, y1, z1, { bevel, hint: skip faces })   G.cyl(...)   G.lathe(...)   G.polyHoles(...)
//   G.push(matrix) / G.pop()        transform the positions (uvs come from the untransformed points)
//   G.build() -> BufferGeometry (position, normal, uv; groups by slot)
import * as THREE from 'three';

const _m3 = new THREE.Matrix3();
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** uv by the dominant axis of the face normal: views = { px, nx, py, ny, pz, nz } (View or uv function each). */
export function triplanar(views, fallback = null) {
  const f = (v) => (!v ? fallback : typeof v === 'function' ? v : v.map3);
  const F = { px: f(views.px), nx: f(views.nx), py: f(views.py), ny: f(views.ny), pz: f(views.pz), nz: f(views.nz) };
  return (p, n) => {
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    const fn = ax >= ay && ax >= az ? (n[0] > 0 ? F.px : F.nx) : ay >= az ? (n[1] > 0 ? F.py : F.ny) : (n[2] > 0 ? F.pz : F.nz);
    return fn(p, n);
  };
}

/** Box mapping: each face of a box stretched over a whole region (s, t), by the face's own extent. */
export function boxMap(view, box, { flip = false } = {}) {
  const [x0, y0, z0, x1, y1, z1] = box;
  return (p, n) => {
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    let s, t;
    if (ax >= ay && ax >= az) { s = (p[2] - z0) / (z1 - z0 || 1); t = (p[1] - y0) / (y1 - y0 || 1); if (n[0] > 0) s = 1 - s; } // read from outside: -z is to the right from +x
    else if (ay >= az) { s = (p[0] - x0) / (x1 - x0 || 1); t = (p[2] - z0) / (z1 - z0 || 1); }
    else { s = (p[0] - x0) / (x1 - x0 || 1); t = (p[1] - y0) / (y1 - y0 || 1); if (n[2] < 0) s = 1 - s; }
    if (flip) s = 1 - s;
    return view.st(Math.min(0.999, Math.max(0.001, s)), Math.min(0.999, Math.max(0.001, t)));
  };
}

export class Geo {
  constructor(slots = 1) {
    this.S = Array.from({ length: slots }, () => ({ p: [], n: [], t: [] }));
    this.g = 0;
    this.uv = () => [0, 0];
    this.stack = [];
    this.m = null;
  }

  push(m) { this.stack.push(this.m); this.m = this.m ? this.m.clone().multiply(m) : m.clone(); this.neg = this.m.determinant() < 0; return this; }
  pop() { this.m = this.stack.pop() ?? null; this.neg = !!this.m && this.m.determinant() < 0; return this; }
  /** Run fn with this uv function / slot, then restore. */
  with(uv, g, fn) { const pu = this.uv, pg = this.g; if (uv) this.uv = uv; if (g !== undefined && g !== null) this.g = g; try { fn(this); } finally { this.uv = pu; this.g = pg; } return this; }

  /** One triangle; flipped to face `hint` if given. uvs: explicit [[u,v] x3] or from this.uv. */
  tri(a, b, c, hint = null, uvs = null) {
    let n = cross(sub(b, a), sub(c, a));
    const l = Math.hypot(n[0], n[1], n[2]);
    if (l < 1e-10) return this;
    n = [n[0] / l, n[1] / l, n[2] / l];
    if (hint && dot(n, hint) < 0) { [b, c] = [c, b]; n = [-n[0], -n[1], -n[2]]; if (uvs) uvs = [uvs[0], uvs[2], uvs[1]]; }
    const S = this.S[this.g];
    let T = uvs || [this.uv(a, n), this.uv(b, n), this.uv(c, n)];
    if (this.neg) { [b, c] = [c, b]; T = [T[0], T[2], T[1]]; } // a mirroring transform turns the winding over
    let nn = n;
    if (this.m) { _m3.getNormalMatrix(this.m); const v = new THREE.Vector3(...n).applyMatrix3(_m3).normalize(); nn = [v.x, v.y, v.z]; }
    for (let k = 0; k < 3; k++) {
      const p = k === 0 ? a : k === 1 ? b : c;
      if (this.m) { const v = new THREE.Vector3(...p).applyMatrix4(this.m); S.p.push(v.x, v.y, v.z); } else S.p.push(p[0], p[1], p[2]);
      S.n.push(nn[0], nn[1], nn[2]);
      S.t.push(T[k][0], T[k][1]);
    }
    return this;
  }
  /** a b c d around the quad; hint: the outward direction (winding fixed to face it). */
  quad(a, b, c, d, hint = null, uvs = null) {
    if (!hint) { const n = cross(sub(c, a), sub(d, b)); hint = n; }
    this.tri(a, b, c, hint, uvs ? [uvs[0], uvs[1], uvs[2]] : null);
    this.tri(a, c, d, hint, uvs ? [uvs[0], uvs[2], uvs[3]] : null);
    return this;
  }
  /** Convex polygon (fan). */
  fan(pts, hint = null) { for (let k = 1; k + 1 < pts.length; k++) this.tri(pts[0], pts[k], pts[k + 1], hint); return this; }

  /**
   * A flat polygon with holes: contour / holes in 2D (a, b), lifted to 3D by to3(a, b) -> [x, y, z]; faces `hint`.
   */
  polyHoles(contour, holes, to3, hint) {
    const C = contour.map(([a, b]) => new THREE.Vector2(a, b)), H = holes.map((h) => h.map(([a, b]) => new THREE.Vector2(a, b)));
    const tris = THREE.ShapeUtils.triangulateShape(C, H);
    const all = [...C, ...H.flat()];
    for (const [i, j, k] of tris) this.tri(to3(all[i].x, all[i].y), to3(all[j].x, all[j].y), to3(all[k].x, all[k].y), hint);
    return this;
  }

  /**
   * Axis-aligned box, optionally chamfered (bevel in metres). o.skip: faces to leave out ('px','nx','py','ny','pz','nz');
   * o.inward: faces turned to look into the box (unbevelled boxes only).
   */
  box(x0, y0, z0, x1, y1, z1, o = {}) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    const b = Math.min(o.bevel || 0, (x1 - x0) / 2.01, (y1 - y0) / 2.01, (z1 - z0) / 2.01), skip = o.skip || [];
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const P = (x, y, z) => [x, y, z];
    if (!b) {
      const s = o.inward ? -1 : 1; // inward: the faces look into the box (a recess, a throat)
      if (!skip.includes('px')) this.quad(P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1), [s, 0, 0]);
      if (!skip.includes('nx')) this.quad(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), [-s, 0, 0]);
      if (!skip.includes('py')) this.quad(P(x0, y1, z0), P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), [0, s, 0]);
      if (!skip.includes('ny')) this.quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), [0, -s, 0]);
      if (!skip.includes('pz')) this.quad(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), [0, 0, s]);
      if (!skip.includes('nz')) this.quad(P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), P(x1, y0, z0), [0, 0, -s]);
      return this;
    }
    // chamfered: inset faces, edge bevels, corner triangles
    const X = [x0, x0 + b, x1 - b, x1], Y = [y0, y0 + b, y1 - b, y1], Z = [z0, z0 + b, z1 - b, z1];
    if (!skip.includes('px')) this.quad(P(x1, Y[1], Z[1]), P(x1, Y[2], Z[1]), P(x1, Y[2], Z[2]), P(x1, Y[1], Z[2]), [1, 0, 0]);
    if (!skip.includes('nx')) this.quad(P(x0, Y[1], Z[1]), P(x0, Y[2], Z[1]), P(x0, Y[2], Z[2]), P(x0, Y[1], Z[2]), [-1, 0, 0]);
    if (!skip.includes('py')) this.quad(P(X[1], y1, Z[1]), P(X[2], y1, Z[1]), P(X[2], y1, Z[2]), P(X[1], y1, Z[2]), [0, 1, 0]);
    if (!skip.includes('ny')) this.quad(P(X[1], y0, Z[1]), P(X[2], y0, Z[1]), P(X[2], y0, Z[2]), P(X[1], y0, Z[2]), [0, -1, 0]);
    if (!skip.includes('pz')) this.quad(P(X[1], Y[1], z1), P(X[2], Y[1], z1), P(X[2], Y[2], z1), P(X[1], Y[2], z1), [0, 0, 1]);
    if (!skip.includes('nz')) this.quad(P(X[1], Y[1], z0), P(X[2], Y[1], z0), P(X[2], Y[2], z0), P(X[1], Y[2], z0), [0, 0, -1]);
    const out = (p) => norm([p[0] - cx, p[1] - cy, p[2] - cz]);
    // edges along x
    for (const [yy, zz, ya, za] of [[y0, z0, Y[1], Z[1]], [y1, z0, Y[2], Z[1]], [y1, z1, Y[2], Z[2]], [y0, z1, Y[1], Z[2]]]) {
      const a = P(X[1], yy, za), bb = P(X[2], yy, za), c = P(X[2], ya, zz), d = P(X[1], ya, zz);
      this.quad(a, bb, c, d, out([cx, (yy + ya) / 2, (zz + za) / 2]));
    }
    // edges along y
    for (const [xx, zz, xa, za] of [[x0, z0, X[1], Z[1]], [x1, z0, X[2], Z[1]], [x1, z1, X[2], Z[2]], [x0, z1, X[1], Z[2]]]) {
      const a = P(xx, Y[1], za), bb = P(xx, Y[2], za), c = P(xa, Y[2], zz), d = P(xa, Y[1], zz);
      this.quad(a, bb, c, d, out([(xx + xa) / 2, cy, (zz + za) / 2]));
    }
    // edges along z
    for (const [xx, yy, xa, ya] of [[x0, y0, X[1], Y[1]], [x1, y0, X[2], Y[1]], [x1, y1, X[2], Y[2]], [x0, y1, X[1], Y[2]]]) {
      const a = P(xx, ya, Z[1]), bb = P(xx, ya, Z[2]), c = P(xa, yy, Z[2]), d = P(xa, yy, Z[1]);
      this.quad(a, bb, c, d, out([(xx + xa) / 2, (yy + ya) / 2, cz]));
    }
    // corners
    for (const sx of [0, 1]) for (const sy of [0, 1]) for (const sz of [0, 1]) {
      const xx = sx ? x1 : x0, yy = sy ? y1 : y0, zz = sz ? z1 : z0, xi = sx ? X[2] : X[1], yi = sy ? Y[2] : Y[1], zi = sz ? Z[2] : Z[1];
      this.tri(P(xx, yi, zi), P(xi, yy, zi), P(xi, yi, zz), out([xx, yy, zz]));
    }
    return this;
  }

  /**
   * A solid of revolution about the x axis (wheels, knobs): prof = [[r, x], ...] from one end to the other; segs round.
   * uvSide(p, n, k, s) for the band faces (k: profile step, s: 0..1 round), caps: false or a uv function.
   */
  lathe(prof, segs, o = {}) {
    const a0 = o.a0 ?? 0;
    const at = (r, x, a) => [x, Math.cos(a) * r, Math.sin(a) * r];
    for (let k = 0; k + 1 < prof.length; k++) {
      const [r0, x0] = prof[k], [r1, x1] = prof[k + 1];
      if (r0 < 1e-6 && r1 < 1e-6) continue;
      for (let s = 0; s < segs; s++) {
        const aA = a0 + (s / segs) * Math.PI * 2, aB = a0 + ((s + 1) / segs) * Math.PI * 2, am = (aA + aB) / 2;
        const p0 = at(r0, x0, aA), p1 = at(r0, x0, aB), p2 = at(r1, x1, aB), p3 = at(r1, x1, aA);
        // outward: the profile's tangent (dr, dx) turned to (dx, -dr), swept round
        const dr = r1 - r0, dx = x1 - x0;
        let hint = norm([-dr, Math.cos(am) * dx, Math.sin(am) * dx]);
        if (o.flip) hint = hint.map((v) => -v);
        this.quad(p0, p1, p2, p3, hint, o.uvBand ? o.uvBand(k, s, segs, [p0, p1, p2, p3]) : null);
      }
    }
    return this;
  }

  /** Cylinder along an axis ('x' | 'y' | 'z') from c (centre of one end) with length len, radius r, segs sides. */
  cyl(axis, c, r, len, segs = 8, o = {}) {
    const m = new THREE.Matrix4();
    if (axis === 'y') m.makeRotationZ(Math.PI / 2);
    else if (axis === 'z') m.makeRotationY(-Math.PI / 2);
    m.setPosition(c[0], c[1], c[2]);
    this.push(m);
    const prof = o.caps === false ? [[r, 0], [r, len]] : [[0, 0], [r, 0], [r, len], [0, len]];
    this.lathe(prof, segs, { a0: o.a0 ?? Math.PI / segs });
    this.pop();
    return this;
  }

  /** A thin strut from a to b (square section, half width w). */
  strut(a, b, w, o = {}) {
    const d = sub(b, a), L = Math.hypot(d[0], d[1], d[2]);
    if (L < 1e-6) return this;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(d[0] / L, d[1] / L, d[2] / L));
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...a), q, new THREE.Vector3(1, 1, 1));
    this.push(m);
    if (o.round) this.lathe([[0, 0], [w, 0], [w, L], [0, L]], o.round, { a0: Math.PI / o.round });
    else this.box(0, -w, -w, L, w, w, { bevel: o.bevel || 0 });
    this.pop();
    return this;
  }

  /** Torus in the xy plane (steering wheel rims): ring radius R, tube r. */
  torus(R, r, segs = 20, sides = 4, o = {}) {
    const P = (a, b) => [Math.cos(a) * (R + Math.cos(b) * r), Math.sin(a) * (R + Math.cos(b) * r), Math.sin(b) * r];
    const b0 = o.b0 ?? Math.PI / sides;
    for (let i = 0; i < segs; i++) for (let j = 0; j < sides; j++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2, c0 = b0 + (j / sides) * Math.PI * 2, c1 = b0 + ((j + 1) / sides) * Math.PI * 2;
      const am = (a0 + a1) / 2, cm = (c0 + c1) / 2;
      const hint = [Math.cos(am) * Math.cos(cm), Math.sin(am) * Math.cos(cm), Math.sin(cm)];
      if (o.uvAt) { const t = o.uvAt((i + 0.5) / segs, (j + 0.5) / sides); this.quad(P(a0, c0), P(a1, c0), P(a1, c1), P(a0, c1), hint, [t, t, t, t]); }
      else this.quad(P(a0, c0), P(a1, c0), P(a1, c1), P(a0, c1), hint);
    }
    return this;
  }

  /** Merge another Geo's triangles (same slots). */
  add(other) { other.S.forEach((s, i) => { const d = this.S[i]; d.p.push(...s.p); d.n.push(...s.n); d.t.push(...s.t); }); return this; }

  get tris() { return this.S.reduce((a, s) => a + s.p.length / 9, 0); }

  build() {
    let n = 0;
    for (const s of this.S) n += s.p.length / 3;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), T = new Float32Array(n * 2);
    const geo = new THREE.BufferGeometry();
    let o = 0;
    this.S.forEach((s, i) => {
      const c = s.p.length / 3;
      P.set(s.p, o * 3); N.set(s.n, o * 3); T.set(s.t, o * 2);
      if (c) geo.addGroup(o, c, i);
      o += c;
    });
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(T, 2));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }
}

export { sub, cross, dot, norm };
