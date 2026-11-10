// Geometry helpers for the gacha kit, on top of the shared low-poly builder (src/vehicles/geom.js): solids of
// revolution about the y axis with smooth normals (capsule shells, globes, cranks, coin slots: things that are round
// in the hand and must shade as one curved surface), hard creases where the profile says so, and uvs from a callback.
//   const G = new GeoS(slots)
//   G.revolve(profile, segs, { uv, a0, a1, flip })    profile: [[r, y, hard?], ...] bottom to top or any order
//   G.patch(rows, cols, at, { uv })                   a curved grid patch with smooth normals (stickers, labels)
// Everything else (box, cyl, quad, strut, torus, with, push / pop, build) is the base class.
import * as THREE from 'three';
import { Geo } from '../vehicles/geom.js';

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m3 = new THREE.Matrix3();

export class GeoS extends Geo {
  /** One triangle with its own vertex normals and uvs. */
  triN(a, b, c, na, nb, nc, ta, tb, tc) {
    const S = this.S[this.g];
    let P = [a, b, c], N = [na, nb, nc], T = [ta, tb, tc];
    if (this.neg) { P = [a, c, b]; N = [na, nc, nb]; T = [ta, tc, tb]; }
    if (this.m) _m3.getNormalMatrix(this.m);
    for (let k = 0; k < 3; k++) {
      if (this.m) {
        _v.set(P[k][0], P[k][1], P[k][2]).applyMatrix4(this.m); S.p.push(_v.x, _v.y, _v.z);
        _n.set(N[k][0], N[k][1], N[k][2]).applyMatrix3(_m3).normalize(); S.n.push(_n.x, _n.y, _n.z);
      } else { S.p.push(P[k][0], P[k][1], P[k][2]); S.n.push(N[k][0], N[k][1], N[k][2]); }
      S.t.push(T[k][0], T[k][1]);
    }
    return this;
  }
  quadN(a, b, c, d, na, nb, nc, nd, ta, tb, tc, td) {
    this.triN(a, b, c, na, nb, nc, ta, tb, tc);
    this.triN(a, c, d, na, nc, nd, ta, tc, td);
    return this;
  }

  /**
   * A solid of revolution about the y axis. profile: [[r, y, hard], ...] (hard = 1: a crease at this point, the normals
   * on both sides stay their own). The surface faces outward when the profile runs from the bottom up on the outside
   * (r to the right, walking up): pass flip to turn it inside out (an inner wall).
   * o.uv(k, t, s, p, seg): uv for profile point k (t = 0..1 along the profile by arc length) at s = 0..1 round, asked
   * for the faces of profile segment seg (k or k - 1);
   * o.a0 / o.a1: a partial sweep (radians); o.segsAt(k): fewer segments near a pole (not used: poles become fans).
   */
  revolve(profile, segs, o = {}) {
    const n = profile.length, a0 = o.a0 ?? 0, a1 = o.a1 ?? Math.PI * 2;
    // arc length along the profile
    const L = [0];
    for (let k = 1; k < n; k++) L.push(L[k - 1] + Math.hypot(profile[k][0] - profile[k - 1][0], profile[k][1] - profile[k - 1][1]));
    const tot = L[n - 1] || 1;
    // segment normals in the (r, y) plane: tangent (dr, dy) -> outward (dy, -dr)
    const sn = [];
    for (let k = 0; k + 1 < n; k++) {
      const dr = profile[k + 1][0] - profile[k][0], dy = profile[k + 1][1] - profile[k][1], l = Math.hypot(dr, dy) || 1;
      sn.push([dy / l, -dr / l]);
    }
    // vertex normals: the two neighbours averaged unless the point is a crease; [below, above] per point
    const vn = profile.map((p, k) => {
      const lo = sn[Math.max(0, k - 1)], hi = sn[Math.min(n - 2, k)];
      if (p[2] || k === 0 || k === n - 1) return [lo, hi];
      const x = lo[0] + hi[0], y = lo[1] + hi[1], l = Math.hypot(x, y) || 1;
      return [[x / l, y / l], [x / l, y / l]];
    });
    const sgn = o.flip ? -1 : 1;
    const uv = o.uv || ((k, t, s) => this.uv([0, 0, 0], [0, 1, 0], k, t, s));
    const P = (r, y, a) => [Math.cos(a) * r, y, Math.sin(a) * r];
    const N = (nr, ny, a) => [Math.cos(a) * nr * sgn, ny * sgn, Math.sin(a) * nr * sgn];
    for (let k = 0; k + 1 < n; k++) {
      const [r0, y0] = profile[k], [r1, y1] = profile[k + 1];
      if (r0 < 1e-7 && r1 < 1e-7) continue;
      const nA = vn[k][1], nB = vn[k + 1][0];
      const t0 = L[k] / tot, t1 = L[k + 1] / tot;
      for (let s = 0; s < segs; s++) {
        const sA = s / segs, sB = (s + 1) / segs, aA = a0 + (a1 - a0) * sA, aB = a0 + (a1 - a0) * sB;
        const p00 = P(r0, y0, aA), p01 = P(r0, y0, aB), p10 = P(r1, y1, aA), p11 = P(r1, y1, aB);
        // at a pole the normal is the axis
        const n00 = r0 < 1e-7 ? [0, Math.sign(nA[1]) * sgn || sgn, 0] : N(nA[0], nA[1], aA), n01 = r0 < 1e-7 ? n00 : N(nA[0], nA[1], aB);
        const n10 = r1 < 1e-7 ? [0, Math.sign(nB[1]) * sgn || sgn, 0] : N(nB[0], nB[1], aA), n11 = r1 < 1e-7 ? n10 : N(nB[0], nB[1], aB);
        const u00 = uv(k, t0, sA, p00, k), u01 = uv(k, t0, sB, p01, k), u10 = uv(k + 1, t1, sA, p10, k), u11 = uv(k + 1, t1, sB, p11, k);
        // outward winding for a profile walked upward on the outside: (p00, p10, p11, p01) seen from outside is ccw
        if (!o.flip) {
          if (r1 > 1e-7) this.triN(p00, p10, p11, n00, n10, n11, u00, u10, u11);
          if (r0 > 1e-7) this.triN(p00, p11, p01, n00, n11, n01, u00, u11, u01);
        } else {
          if (r1 > 1e-7) this.triN(p00, p11, p10, n00, n11, n10, u00, u11, u10);
          if (r0 > 1e-7) this.triN(p00, p01, p11, n00, n01, n11, u00, u01, u11);
        }
      }
    }
    return this;
  }

  /**
   * A curved grid patch: at(i / cols, j / rows) -> { p: [x, y, z], n: [x, y, z] }; uv(s, t) -> [u, v].
   * Faces along n (two-sided materials or o.back for the other side).
   */
  patch(cols, rows, at, uv, o = {}) {
    const V = [];
    for (let j = 0; j <= rows; j++) { V.push([]); for (let i = 0; i <= cols; i++) { const s = i / cols, t = j / rows, v = at(s, t); V[j].push({ p: v.p, n: v.n, t: uv(s, t) }); } }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = V[j][i], b = V[j][i + 1], c = V[j + 1][i + 1], d = V[j + 1][i];
      // winding chosen so the face looks along its normals
      const e1 = [b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]], e2 = [d.p[0] - a.p[0], d.p[1] - a.p[1], d.p[2] - a.p[2]];
      const fx = e1[1] * e2[2] - e1[2] * e2[1], fy = e1[2] * e2[0] - e1[0] * e2[2], fz = e1[0] * e2[1] - e1[1] * e2[0];
      const front = fx * a.n[0] + fy * a.n[1] + fz * a.n[2] > 0;
      const put = (inv) => {
        const s = inv ? -1 : 1, nn = (v) => [v.n[0] * s, v.n[1] * s, v.n[2] * s];
        if (front !== inv) this.quadN(a.p, b.p, c.p, d.p, nn(a), nn(b), nn(c), nn(d), a.t, b.t, c.t, d.t);
        else this.quadN(a.p, d.p, c.p, b.p, nn(a), nn(d), nn(c), nn(b), a.t, d.t, c.t, b.t);
      };
      put(false);
      if (o.back) put(true);
    }
    return this;
  }
}

/** A geometry sharing another one's buffers but drawing only [start, start + count) vertices. */
export function subRange(geo, start, count) {
  const g = new THREE.BufferGeometry();
  for (const k of Object.keys(geo.attributes)) g.setAttribute(k, geo.attributes[k]);
  g.setDrawRange(start, count);
  g.boundingBox = geo.boundingBox; g.boundingSphere = geo.boundingSphere;
  return g;
}

/** Concatenate non-indexed geometries (position, normal, uv), each moved by its matrix: one group. */
export function concatGeo(list) {
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const size = k === 'uv' ? 2 : 3;
    const n = list.reduce((a, [g]) => a + g.attributes[k].count * size, 0), arr = new Float32Array(n);
    let o = 0;
    for (const [g, m] of list) {
      const src = g.attributes[k];
      if (m && k !== 'uv') {
        const c = g.clone();
        c.applyMatrix4(m);
        arr.set(c.attributes[k].array, o);
        c.dispose();
      } else arr.set(src.array, o);
      o += src.count * size;
    }
    out.setAttribute(k, new THREE.BufferAttribute(arr, size));
  }
  out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}
