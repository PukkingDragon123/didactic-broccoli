// The town's static geometry batcher: flat-shaded low-poly primitives, transformed into the world, given baked vertex
// colours (tint x underpass shade x optional ground AO) and merged into one mesh per material. Tiling materials take
// their uvs in metres (the texture's repeat sets its real size); atlas quads take a uv rectangle.
//   const B = new Batch(shadeAt)
//   B.push(x, y, z, ry, mirror) / B.pop()         a local frame (a house, a pole...)
//   B.box(mat, w, h, d, x, y, z, o)                bottom at y; o: { tint, k, ao, uv:[du,dv], unit, rx, ry, rz, bevel, skip }
//   B.plane / B.quad / B.quadUV / B.face / B.poly  flat pieces (plane: o.rect uv rectangle, o.kf(x, z) brightness)
//   B.cyl / B.rod / B.wire / B.lathe / B.extrude / B.blob / B.kit(mat, (G) => ..., o)   round and shaped pieces
//   B.geo(mat, bufferGeometry, o)                  anything else (keeps its own normals and extra attributes)
//   B.build(parent, { cast, receive })             -> meshes
// Everything a primitive draws faces outward; a mirrored frame turns the winding over by itself.
import * as THREE from 'three';
import { Geo } from '../vehicles/geom.js';
import { hash2 } from '../core/util.js';

const _c = new THREE.Color(), _mm = new THREE.Matrix4(), _ml = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _s1 = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const CORE = new Set(['position', 'normal', 'uv', 'color']);

/** Local matrix: translate(x, y, z) * Ry * Rz * Rx. */
function localM(x, y, z, o) {
  if (o.rx || o.ry || o.rz) _q.setFromEuler(_e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YZX')); else _q.identity();
  return _ml.compose(_p.set(x, y, z), _q, _s1);
}
const metric = (du = 0, dv = 0) => (p, n) => {
  const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
  return ax >= ay && ax >= az ? [p[2] + du, p[1] + dv] : ay >= az ? [p[0] + du, p[2] + dv] : [p[0] + du, p[1] + dv];
};

// unit icosahedra (80 or 320 faces) for clumps of leaves, stones, bags
const LOBES = [[0, 1, 0, 1.0], [0.8, 0.5, 0.2, 0.9], [-0.7, 0.6, 0.3, 0.8], [0.1, 0.5, -0.85, 0.9], [-0.3, 0.4, 0.86, 0.85], [0.95, -0.1, -0.3, 0.7], [-0.9, 0, -0.4, 0.75], [0.4, -0.2, 0.9, 0.7], [-0.5, -0.6, 0.6, 0.5], [0.5, -0.7, -0.5, 0.5], [0.6, 0.75, -0.3, 0.6]];
const ICO = {};
function ico(detail = 1) {
  if (ICO[detail]) return ICO[detail];
  const g = new THREE.IcosahedronGeometry(1, detail), a = g.attributes.position.array;
  ICO[detail] = Array.from(a);
  g.dispose();
  return ICO[detail];
}

export class Batch {
  constructor(shade = null) { this.lists = new Map(); this.stack = [new THREE.Matrix4()]; this.shade = shade; this.count = 0; }
  get top() { return this.stack[this.stack.length - 1]; }
  push(x, y, z, ry = 0, mirror = false) {
    const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    if (mirror) m.multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
    this.stack.push(this.top.clone().multiply(m));
    return this;
  }
  pushM(m) { this.stack.push(this.top.clone().multiply(m)); return this; }
  pop() { this.stack.pop(); return this; }
  /** Local -> world point under the current transform. */
  world(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.top); }
  yaw(ry = 0) { const e = this.top.elements; return Math.atan2(e[8], e[0]) + ry; }
  list(mat) {
    let L = this.lists.get(mat);
    if (!L) { L = { p: [], n: [], t: [], c: [], x: null }; this.lists.set(mat, L); }
    return L;
  }

  /**
   * The core: triangles in local space. P: xyz per vertex (3 per triangle), T: uv per vertex (or null), N: normals per
   * vertex (or null for flat shading), o: { tint, k, ao, y0, m (a Matrix4 applied before the frame), K (per-vertex
   * brightness) }.
   */
  tris(mat, P, T, o = {}, N = null) {
    const L = this.list(mat), M = o.m ? _mm.multiplyMatrices(this.top, o.m) : this.top, e = M.elements;
    const flip = M.determinant() < 0, shade = this.shade, K = o.K || null;
    if (o.tint && o.tint.isColor) _c.copy(o.tint); else _c.set(o.tint ?? 0xffffff);
    const k = o.k ?? 1, nm = o.tint != null && o.tint !== 0xffffff && mat.userData ? mat.userData.norm : null;
    const r = Math.min(1.7, nm ? _c.r / Math.max(nm[0], 0.02) : _c.r) * k, g = Math.min(1.7, nm ? _c.g / Math.max(nm[1], 0.02) : _c.g) * k, b = Math.min(1.7, nm ? _c.b / Math.max(nm[2], 0.02) : _c.b) * k;
    const ao = o.ao || 0, base = o.y0 ?? this.top.elements[13];
    const lp = L.p, ln = L.n, lt = L.t, lc = L.c, nv = P.length / 3;
    const X = [0, 0, 0], Y = [0, 0, 0], Z = [0, 0, 0];
    for (let i = 0; i < nv; i += 3) {
      for (let j = 0; j < 3; j++) {
        const q = (i + (flip && j ? 3 - j : j)) * 3, x = P[q], y = P[q + 1], z = P[q + 2];
        X[j] = e[0] * x + e[4] * y + e[8] * z + e[12]; Y[j] = e[1] * x + e[5] * y + e[9] * z + e[13]; Z[j] = e[2] * x + e[6] * y + e[10] * z + e[14];
      }
      let nx = 0, ny = 0, nz = 0;
      if (!N) {
        const ux = X[1] - X[0], uy = Y[1] - Y[0], uz = Z[1] - Z[0], vx = X[2] - X[0], vy = Y[2] - Y[0], vz = Z[2] - Z[0];
        nx = uy * vz - uz * vy; ny = uz * vx - ux * vz; nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz);
        if (l < 1e-12) continue;
        nx /= l; ny /= l; nz /= l;
      }
      for (let j = 0; j < 3; j++) {
        const s = i + (flip && j ? 3 - j : j);
        lp.push(X[j], Y[j], Z[j]);
        if (N) {
          const a = N[s * 3], bb = N[s * 3 + 1], cc = N[s * 3 + 2];
          let mx = e[0] * a + e[4] * bb + e[8] * cc, my = e[1] * a + e[5] * bb + e[9] * cc, mz = e[2] * a + e[6] * bb + e[10] * cc;
          const l = Math.hypot(mx, my, mz) || 1;
          ln.push(mx / l, my / l, mz / l);
        } else ln.push(nx, ny, nz);
        if (T) lt.push(T[s * 2], T[s * 2 + 1]); else lt.push(0, 0);
        let f = shade ? shade(X[j], Y[j], Z[j]) : 1;
        if (ao) f *= 1 - ao * (1 - sstep(base, base + 1.1, Y[j]));
        if (K) f *= K[s];
        lc.push(r * f, g * f, b * f);
      }
      this.count++;
    }
    return this;
  }

  /** Any BufferGeometry already placed in the local frame (keeps its normals and any extra attributes). */
  geo(mat, g, o = {}) {
    const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv, idx = g.index;
    const n = idx ? idx.count : pos.count, P = new Array(n * 3), N = nrm ? new Array(n * 3) : null, T = uv ? new Array(n * 2) : null;
    const extra = Object.keys(g.attributes).filter((k) => !CORE.has(k));
    const L = this.list(mat);
    if (extra.length && !L.x) L.x = {};
    const flip = this.top.determinant() < 0;
    for (let i = 0; i < n; i++) {
      const v = idx ? idx.getX(i) : i;
      P[i * 3] = pos.getX(v); P[i * 3 + 1] = pos.getY(v); P[i * 3 + 2] = pos.getZ(v);
      if (N) { N[i * 3] = nrm.getX(v); N[i * 3 + 1] = nrm.getY(v); N[i * 3 + 2] = nrm.getZ(v); }
      if (T) { T[i * 2] = uv.getX(v); T[i * 2 + 1] = uv.getY(v); }
    }
    for (const k of extra) {
      const a = g.attributes[k], out = (L.x[k] ||= { size: a.itemSize, a: [] }).a;
      for (let i = 0; i < n; i += 3) for (let j = 0; j < 3; j++) {
        const v = idx ? idx.getX(i + (flip && j ? 3 - j : j)) : i + (flip && j ? 3 - j : j);
        for (let c = 0; c < a.itemSize; c++) out.push(a.array[v * a.itemSize + c]);
      }
    }
    this.tris(mat, P, T, o, N);
    g.dispose?.();
    return g;
  }

  /** Box with its bottom at y (before rotation). o: unit (0..1 uvs per face), uv [du, dv] offset, rx / ry / rz about its
   *  centre, tint, k, ao, bevel (a chamfer in metres), skip ('px nx py ny pz nz' faces to leave out). */
  box(mat, w, h, d, x, y, z, o = {}) {
    const m = localM(x, y + h / 2, z, o), oo = { ...o, m };
    if (o.ao && o.y0 === undefined) oo.y0 = this.top.elements[13] + y;
    const hx = w / 2, hy = h / 2, hz = d / 2;
    if (o.bevel) {
      const G = new Geo(1);
      G.uv = metric((o.uv?.[0] || 0) + hx, (o.uv?.[1] || 0) + hy);
      G.box(-hx, -hy, -hz, hx, hy, hz, { bevel: o.bevel, skip: o.skip ? o.skip.split(' ') : [] });
      return this.tris(mat, G.S[0].p, G.S[0].t, oo);
    }
    const du = o.uv?.[0] || 0, dv = o.uv?.[1] || 0, U = o.unit, sk = o.skip || '';
    const P = [], T = [];
    // corners a b c d counter-clockwise seen from outside, uvs (0,0) (uw,0) (uw,vh) (0,vh)
    const f = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, uw, vh) => {
      P.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
      const u1 = U ? 1 : uw + du, v1 = U ? 1 : vh + dv, u0 = U ? 0 : du, v0 = U ? 0 : dv;
      T.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
    };
    if (!sk.includes('pz')) f(-hx, -hy, hz, hx, -hy, hz, hx, hy, hz, -hx, hy, hz, w, h);
    if (!sk.includes('nz')) f(hx, -hy, -hz, -hx, -hy, -hz, -hx, hy, -hz, hx, hy, -hz, w, h);
    if (!sk.includes('px')) f(hx, -hy, hz, hx, -hy, -hz, hx, hy, -hz, hx, hy, hz, d, h);
    if (!sk.includes('nx')) f(-hx, -hy, -hz, -hx, -hy, hz, -hx, hy, hz, -hx, hy, -hz, d, h);
    if (!sk.includes('py')) f(-hx, hy, hz, hx, hy, hz, hx, hy, -hz, -hx, hy, -hz, w, d);
    if (!sk.includes('ny')) f(-hx, -hy, -hz, hx, -hy, -hz, hx, -hy, hz, -hx, -hy, hz, w, d);
    return this.tris(mat, P, T, oo);
  }

  /** Upward-facing plane (uvs in metres unless o.unit); o.sx / o.sz subdivide it, o.ry turns it. */
  plane(mat, w, d, x, y, z, o = {}) {
    const sx = o.sx || 1, sz = o.sz || 1, P = [], T = [], K = [], du = o.uv?.[0] || 0, dv = o.uv?.[1] || 0;
    for (let i = 0; i < sx; i++) for (let j = 0; j < sz; j++) {
      const x0 = -w / 2 + (w * i) / sx, x1 = -w / 2 + (w * (i + 1)) / sx, z0 = -d / 2 + (d * j) / sz, z1 = -d / 2 + (d * (j + 1)) / sz;
      P.push(x0, 0, z1, x1, 0, z1, x1, 0, z0, x0, 0, z1, x1, 0, z0, x0, 0, z0);
      const rc = o.rect;
      const u = (xx) => (rc ? rc[0] + ((xx + w / 2) / w) * (rc[2] - rc[0]) : o.unit ? (xx + w / 2) / w : xx + w / 2 + du), v = (zz) => (rc ? rc[1] + ((d / 2 - zz) / d) * (rc[3] - rc[1]) : o.unit ? (d / 2 - zz) / d : d / 2 - zz + dv);
      T.push(u(x0), v(z1), u(x1), v(z1), u(x1), v(z0), u(x0), v(z1), u(x1), v(z0), u(x0), v(z0));
      if (o.kf) K.push(o.kf(x0, z1), o.kf(x1, z1), o.kf(x1, z0), o.kf(x0, z1), o.kf(x1, z0), o.kf(x0, z0));
    }
    return this.tris(mat, P, T, { ...o, K: o.kf ? K : null, m: localM(x, y, z, o) });
  }

  /** Vertical plane facing +z, uvs 0..1 (o.ry turns it about its centre, o.flipU mirrors the picture). */
  quad(mat, w, h, x, y, z, o = {}) { return this.quadUV(mat, w, h, x, y, z, o.flipU ? [1, 0, 0, 1] : [0, 0, 1, 1], o); }
  /** Vertical quad showing the uv rectangle [u0, v0, u1, v1]; o: ry, rz, rx about its centre, both (two-sided). */
  quadUV(mat, w, h, x, y, z, [u0, v0, u1, v1], o = {}) {
    const hx = w / 2, hy = h / 2;
    const P = [-hx, -hy, 0, hx, -hy, 0, hx, hy, 0, -hx, -hy, 0, hx, hy, 0, -hx, hy, 0];
    const T = [u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1];
    if (o.both) { P.push(hx, -hy, 0, -hx, -hy, 0, -hx, hy, 0, hx, -hy, 0, -hx, hy, 0, hx, hy, 0); T.push(u1, v0, u0, v0, u0, v1, u1, v0, u0, v1, u1, v1); }
    return this.tris(mat, P, T, { ...o, m: localM(x, y + hy, z, o) });
  }

  /** A quad from four local points a b c d (counter-clockwise seen from its front). uvs: o.uvs [[u, v] x 4], o.rect
   *  [u0, v0, u1, v1], or metres along a->b and a->d (+ o.uv offset). */
  face(mat, a, b, c, d, o = {}) {
    let ua, ub, uc, ud;
    if (o.uvs) [ua, ub, uc, ud] = o.uvs;
    else if (o.rect) { const [u0, v0, u1, v1] = o.rect; ua = [u0, v0]; ub = [u1, v0]; uc = [u1, v1]; ud = [u0, v1]; }
    else {
      const ex = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], el = Math.hypot(...ex) || 1, fx = [d[0] - a[0], d[1] - a[1], d[2] - a[2]], fl = Math.hypot(...fx) || 1;
      const du = o.uv?.[0] || 0, dv = o.uv?.[1] || 0;
      const uvp = (p) => [((p[0] - a[0]) * ex[0] + (p[1] - a[1]) * ex[1] + (p[2] - a[2]) * ex[2]) / el + du, ((p[0] - a[0]) * fx[0] + (p[1] - a[1]) * fx[1] + (p[2] - a[2]) * fx[2]) / fl + dv];
      ua = uvp(a); ub = uvp(b); uc = uvp(c); ud = uvp(d);
    }
    const P = [...a, ...b, ...c, ...a, ...c, ...d], T = [...ua, ...ub, ...uc, ...ua, ...uc, ...ud];
    if (o.both) { P.push(...b, ...a, ...d, ...b, ...d, ...c); T.push(...ub, ...ua, ...ud, ...ub, ...ud, ...uc); }
    return this.tris(mat, P, T, o);
  }
  /** A flat convex polygon (fan) from local points, counter-clockwise from its front; uvs in metres in its own plane. */
  poly(mat, pts, o = {}) {
    const a = pts[0], b = pts[1], c = pts[2];
    const n = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2])).normalize();
    const U = Math.abs(n.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3().crossVectors(_up, n).normalize(), V = new THREE.Vector3().crossVectors(n, U);
    const du = o.uv?.[0] || 0, dv = o.uv?.[1] || 0, uv = (p) => [p[0] * U.x + p[1] * U.y + p[2] * U.z + du, p[0] * V.x + p[1] * V.y + p[2] * V.z + dv];
    const P = [], T = [];
    for (let k = 1; k + 1 < pts.length; k++) { P.push(...pts[0], ...pts[k], ...pts[k + 1]); T.push(...uv(pts[0]), ...uv(pts[k]), ...uv(pts[k + 1])); }
    if (o.both) for (let k = 1; k + 1 < pts.length; k++) { P.push(...pts[0], ...pts[k + 1], ...pts[k]); T.push(...uv(pts[0]), ...uv(pts[k + 1]), ...uv(pts[k])); }
    return this.tris(mat, P, T, o);
  }

  /** Upright frustum with its base centre at (x, y, z): radius r0 at the bottom, r1 at the top. o: sides (8), caps
   *  ('t', 'b', 'tb' or ''), rx / ry / rz about the base, a0 (start angle). */
  cyl(mat, r0, r1, h, x, y, z, o = {}) { return this.lathe(mat, [[r0, 0], [r1, h]], x, y, z, { caps: 'tb', ...o }); }
  /** A solid of revolution about the vertical axis: prof = [[radius, height], ...] from the bottom up. Smooth round the
   *  axis and along gentle curves of the profile; a corner sharper than ~40 degrees stays a hard edge. o.sides: the
   *  drawn count is doubled for anything thicker than a cable (o.exact keeps it). */
  lathe(mat, prof, x, y, z, o = {}) {
    let rmax = 0; for (const p of prof) rmax = Math.max(rmax, p[0]);
    const n = o.exact || rmax < 0.025 ? (o.sides || 8) : Math.min(24, (o.sides || 8) * 2), a0 = o.a0 ?? Math.PI / n, P = [], T = [], N = [], caps = o.caps ?? '';
    const at = (r, yy, k) => { const a = a0 + (k / n) * Math.PI * 2; return [Math.sin(a) * r, yy, Math.cos(a) * r]; };
    const sn = [];
    for (let s = 0; s + 1 < prof.length; s++) { const dr = prof[s + 1][0] - prof[s][0], dy = prof[s + 1][1] - prof[s][1], l = Math.hypot(dr, dy) || 1; sn.push([dy / l, -dr / l]); }
    const mixn = (p, q) => { if (!q || p[0] * q[0] + p[1] * q[1] < 0.76) return p; const l = Math.hypot(p[0] + q[0], p[1] + q[1]) || 1; return [(p[0] + q[0]) / l, (p[1] + q[1]) / l]; };
    const nat = (nn, k) => { const a = a0 + (k / n) * Math.PI * 2; return [Math.sin(a) * nn[0], nn[1], Math.cos(a) * nn[0]]; };
    let v = 0;
    for (let s = 0; s + 1 < prof.length; s++) {
      const [ra, ya] = prof[s], [rb, yb] = prof[s + 1], len = Math.hypot(rb - ra, yb - ya), rm = Math.max(ra, rb);
      const n0 = mixn(sn[s], sn[s - 1]), n1 = mixn(sn[s], sn[s + 1]);
      for (let k = 0; k < n; k++) {
        const u0 = (k / n) * 2 * Math.PI * rm, u1 = ((k + 1) / n) * 2 * Math.PI * rm;
        const A = at(ra, ya, k), B2 = at(ra, ya, k + 1), C = at(rb, yb, k + 1), D = at(rb, yb, k);
        if (ra > 1e-6) { P.push(...A, ...B2, ...C); T.push(u0, v, u1, v, u1, v + len); N.push(...nat(n0, k), ...nat(n0, k + 1), ...nat(n1, k + 1)); }
        if (rb > 1e-6) { P.push(...A, ...C, ...D); T.push(u0, v, u1, v + len, u0, v + len); N.push(...nat(n0, k), ...nat(n1, k + 1), ...nat(n1, k)); }
      }
      v += len;
    }
    const cap = (r, yy, up) => { for (let k = 1; k + 1 < n; k++) { const A = at(r, yy, 0), B2 = at(r, yy, k), C = at(r, yy, k + 1); if (up) P.push(...A, ...B2, ...C); else P.push(...A, ...C, ...B2); T.push(A[0], A[2], B2[0], B2[2], C[0], C[2]); for (let q = 0; q < 3; q++) N.push(0, up ? 1 : -1, 0); } };
    if (caps.includes('b') && prof[0][0] > 1e-6) cap(prof[0][0], prof[0][1], false);
    if (caps.includes('t') && prof[prof.length - 1][0] > 1e-6) cap(prof[prof.length - 1][0], prof[prof.length - 1][1], true);
    return this.tris(mat, P, T, { ...o, m: o.m0 || localM(x, y, z, o) }, N);
  }
  /** A round bar between two local points (radius r, o.r1 at the far end, o.sides, o.caps 'tb'), smooth round. */
  rod(mat, a, b, r, o = {}) {
    _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = _d.length();
    if (len < 1e-6) return this;
    _q.setFromUnitVectors(_up, _d.multiplyScalar(1 / len));
    const m = new THREE.Matrix4().compose(_p.set(a[0], a[1], a[2]), _q, _s1);
    return this.lathe(mat, [[r, 0], [o.r1 ?? r, len]], 0, 0, 0, { caps: 'tb', sides: 6, ...o, rx: 0, ry: 0, rz: 0, m0: m });
  }
  /** A square-section bar between two local points (side t). */
  beam(mat, a, b, t, o = {}) {
    _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = _d.length();
    if (len < 1e-6) return this;
    _q.setFromUnitVectors(_up, _d.multiplyScalar(1 / len));
    const m = new THREE.Matrix4().compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s1);
    const w = o.w ?? t, keep = this.top;
    this.stack.push(keep.clone().multiply(m));
    this.box(mat, w, len, t, 0, -len / 2, 0, { ...o, rx: 0, ry: o.spin || 0, rz: 0 });
    this.stack.pop();
    return this;
  }
  /** A sagging cable between two local points: a thin tube along a parabola (sag metres at mid-span). */
  wire(mat, a, b, sag, r = 0.012, o = {}) {
    const n = o.seg || 8, sides = o.sides || 3, pts = [];
    for (let k = 0; k <= n; k++) { const t = k / n; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4 * sag * t * (1 - t), a[2] + (b[2] - a[2]) * t]); }
    return this.tube(mat, pts, r, { sides, ...o });
  }
  /** A tube through local points (no caps): pipes, hoses, cables. */
  tube(mat, pts, r, o = {}) {
    const sides = r < 0.02 ? (o.sides || 4) : Math.max(8, (o.sides || 4) * 2), P = [], T = [], rings = [];
    const dir = new THREE.Vector3(), sx = new THREE.Vector3(), sy = new THREE.Vector3(), ref = new THREE.Vector3();
    for (let k = 0; k < pts.length; k++) {
      const p0 = pts[Math.max(0, k - 1)], p1 = pts[Math.min(pts.length - 1, k + 1)];
      dir.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize();
      ref.set(0, 1, 0); if (Math.abs(dir.y) > 0.95) ref.set(1, 0, 0);
      sx.crossVectors(ref, dir).normalize(); sy.crossVectors(dir, sx);
      const ring = [];
      for (let s = 0; s < sides; s++) { const an = (s / sides) * Math.PI * 2 + (o.a0 ?? Math.PI / 2); ring.push([pts[k][0] + (sx.x * Math.cos(an) + sy.x * Math.sin(an)) * r, pts[k][1] + (sx.y * Math.cos(an) + sy.y * Math.sin(an)) * r, pts[k][2] + (sx.z * Math.cos(an) + sy.z * Math.sin(an)) * r]); }
      rings.push(ring);
    }
    let v = 0;
    const N = [], nr = (k, s2) => { const q = rings[k][s2 % sides], c = pts[k]; return [(q[0] - c[0]) / r, (q[1] - c[1]) / r, (q[2] - c[2]) / r]; };
    for (let k = 0; k + 1 < rings.length; k++) {
      const len = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1], pts[k + 1][2] - pts[k][2]);
      for (let s = 0; s < sides; s++) {
        const A = rings[k][s], B2 = rings[k][(s + 1) % sides], C = rings[k + 1][(s + 1) % sides], D = rings[k + 1][s], u0 = s / sides, u1 = (s + 1) / sides;
        P.push(...A, ...B2, ...C, ...A, ...C, ...D); T.push(u0, v, u1, v, u1, v + len, u0, v, u1, v + len, u0, v + len);
        N.push(...nr(k, s), ...nr(k, s + 1), ...nr(k + 1, s + 1), ...nr(k, s), ...nr(k + 1, s + 1), ...nr(k + 1, s));
      }
      v += len;
    }
    return this.tris(mat, P, T, o, N);
  }
  /** A 2D outline (x, y), counter-clockwise, extruded along z from z0 to z1 (o.along 'x': the outline lies in z / y and
   *  runs along x from z0 to z1). o.caps: false to leave the ends open. */
  extrude(mat, pts, z0, z1, o = {}) {
    const P = [], T = [], n = pts.length;
    let per = 0;
    for (let k = 0; k < n; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % n], len = Math.hypot(bx - ax, by - ay);
      if (!o.open || k + 1 < n) { P.push(ax, ay, z0, bx, by, z0, bx, by, z1, ax, ay, z0, bx, by, z1, ax, ay, z1); T.push(per, z0, per + len, z0, per + len, z1, per, z0, per + len, z1, per, z1); }
      per += len;
    }
    if (o.caps !== false && !o.open) {
      const tri = THREE.ShapeUtils.triangulateShape(pts.map(([x, y]) => new THREE.Vector2(x, y)), []);
      for (let [i, j, k] of tri) {
        // counter-clockwise for the front cap whatever the triangulator returns
        if ((pts[j][0] - pts[i][0]) * (pts[k][1] - pts[i][1]) - (pts[j][1] - pts[i][1]) * (pts[k][0] - pts[i][0]) < 0) [j, k] = [k, j];
        P.push(pts[i][0], pts[i][1], z1, pts[j][0], pts[j][1], z1, pts[k][0], pts[k][1], z1); T.push(pts[i][0], pts[i][1], pts[j][0], pts[j][1], pts[k][0], pts[k][1]);
        P.push(pts[i][0], pts[i][1], z0, pts[k][0], pts[k][1], z0, pts[j][0], pts[j][1], z0); T.push(pts[i][0], pts[i][1], pts[k][0], pts[k][1], pts[j][0], pts[j][1]);
      }
    }
    let m = o.m || null;
    if (o.along === 'x') { const sw = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1); m = m ? m.clone().multiply(sw) : sw; }
    if (o.ox || o.oy || o.oz) { const tr = new THREE.Matrix4().makeTranslation(o.ox || 0, o.oy || 0, o.oz || 0); m = m ? tr.multiply(m) : tr; }
    return this.tris(mat, P, T, { ...o, m });
  }
  /** Draw with the vehicle kit's Geo (chamfered boxes, lathes about x, struts, toruses, polygons with holes): uvs in
   *  metres by the face's direction unless o.uvFn is given. */
  kit(mat, fn, o = {}) {
    const G = new Geo(1);
    G.uv = o.uvFn || metric(o.uv?.[0] || 0, o.uv?.[1] || 0);
    fn(G);
    return this.tris(mat, G.S[0].p, G.S[0].t, o);
  }
  /** A lumpy rounded clump (leaves, blossom, a stone, a bag): a smooth ball squashed to (sx, sy, sz) and swollen in
   *  lobes by rule; lighter on top, darker underneath. Centre at (x, y, z). */
  blob(mat, x, y, z, sx, sy, sz, o = {}) {
    const big = Math.max(sx, sy, sz) > 0.3, A = ico(big ? 2 : 1), P = new Array(A.length), N = new Array(A.length), K = new Array(A.length / 3), seed = o.seed ?? Math.round(x * 31 + z * 17 + y * 7), j = o.jitter ?? 0.2;
    // the clump's lobes: a hand-set of bulges (direction, size), turned per clump so no two sit alike
    const ca = Math.cos(seed * 1.3), sa = Math.sin(seed * 1.3);
    const bump = (ax, ay, az) => { let v = -0.35; for (const [lx, ly, lz, w] of LOBES) { const d = ax * (lx * ca - lz * sa) + ay * ly + az * (lx * sa + lz * ca); if (d > 0) v += w * d * d * d * d; } return v; };
    for (let i = 0; i < A.length; i += 3) {
      const s = 1 + j * bump(A[i], A[i + 1], A[i + 2]);
      P[i] = A[i] * sx * s; P[i + 1] = A[i + 1] * sy * s; P[i + 2] = A[i + 2] * sz * s;
      const nx = A[i] / sx, ny = A[i + 1] / sy, nz = A[i + 2] / sz, l = Math.hypot(nx, ny, nz) || 1;
      N[i] = nx / l; N[i + 1] = ny / l; N[i + 2] = nz / l;
      K[i / 3] = (o.lo ?? 0.78) + ((o.hi ?? 1.12) - (o.lo ?? 0.78)) * Math.min(1, Math.max(0, A[i + 1] * 0.6 + 0.5 + 0.25 * (s - 1) / (j || 1)));
    }
    return this.tris(mat, P, null, { ...o, K, m: localM(x, y, z, o) }, N);
  }

  /** Triangles drawn so far (all materials). */
  get triangles() { return this.count; }

  build(parent, { cast = false, receive = true, name = '' } = {}) {
    const out = [];
    for (const [mat, L] of this.lists) {
      if (!L.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L.p), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(L.n), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(L.t), 2));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(L.c), 3));
      if (L.x) for (const [k, a] of Object.entries(L.x)) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(a.a), a.size));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.castShadow = cast; m.receiveShadow = receive;
      m.matrixAutoUpdate = false;
      m.userData.tris = L.p.length / 9;
      if (name) m.name = name + ':' + (mat.name || 'mat');
      parent.add(m);
      out.push(m);
    }
    this.lists.clear();
    return out;
  }
}
