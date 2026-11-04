// Roads for the drive: centre lines sampled every metre from a few control points, the drivable area as a union of
// road corridors, round pads and rectangles, and the queries the van and the scenery need (nearest point, signed
// offset, heights, the soft-barrier push-back).
//
//   const r = new Road('main', [[x, z], ...], { half, edge, profile })   r.at(s) / r.nearest(x, z) / r.length
//   course = new Course({ roads, pads, rects })   course.push(x, z) -> { pen, nx, nz } (pen > 0: outside, push by it)
//
// Signed offsets are + to the LEFT of the direction of travel (Japan drives on the left).
import * as THREE from 'three';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Road {
  /**
   * pts: [[x, z], ...] control points (centripetal Catmull-Rom). opts: half (half width of the asphalt), edge (half
   * width of the drivable corridor, the soft barrier), profile(s, len, x, z) -> height of the road surface.
   */
  constructor(name, pts, { half = 2.8, edge = 3.3, profile = null, step = 1 } = {}) {
    this.name = name;
    this.half = half; this.edge = edge;
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    const len = curve.getLength(), n = Math.max(2, Math.ceil(len / step));
    const P = curve.getSpacedPoints(n);
    this.n = P.length;
    this.x = new Float64Array(this.n); this.z = new Float64Array(this.n); this.s = new Float64Array(this.n);
    this.tx = new Float64Array(this.n); this.tz = new Float64Array(this.n); this.y = new Float64Array(this.n);
    let acc = 0;
    for (let i = 0; i < this.n; i++) {
      this.x[i] = P[i].x; this.z[i] = P[i].z;
      if (i) acc += Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z);
      this.s[i] = acc;
    }
    this.length = acc;
    for (let i = 0; i < this.n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(this.n - 1, i + 1);
      const dx = this.x[b] - this.x[a], dz = this.z[b] - this.z[a], l = Math.hypot(dx, dz) || 1;
      this.tx[i] = dx / l; this.tz[i] = dz / l;
      this.y[i] = profile ? profile(this.s[i], acc, this.x[i], this.z[i]) : 0;
    }
  }

  /** Index of the sample at or before distance s. */
  index(s) {
    let lo = 0, hi = this.n - 1;
    if (s <= 0) return 0;
    if (s >= this.s[hi]) return hi - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.s[m] <= s) lo = m; else hi = m; }
    return lo;
  }

  /** Point on the centre line at distance s (+ lateral offset d to the left): { x, z, y, tx, tz, heading, i }. */
  at(s, d = 0, out = {}) {
    s = clamp(s, 0, this.length);
    const i = this.index(s), j = Math.min(this.n - 1, i + 1);
    const span = this.s[j] - this.s[i] || 1, t = clamp((s - this.s[i]) / span, 0, 1);
    const tx = this.tx[i] + (this.tx[j] - this.tx[i]) * t, tz = this.tz[i] + (this.tz[j] - this.tz[i]) * t, tl = Math.hypot(tx, tz) || 1;
    out.tx = tx / tl; out.tz = tz / tl;
    out.x = this.x[i] + (this.x[j] - this.x[i]) * t + out.tz * d;
    out.z = this.z[i] + (this.z[j] - this.z[i]) * t - out.tx * d;
    out.y = this.y[i] + (this.y[j] - this.y[i]) * t;
    out.heading = Math.atan2(out.tx, out.tz);
    out.i = i; out.s = s;
    return out;
  }

  /** Height of the road surface at distance s. */
  heightAt(s) { const i = this.index(s), j = Math.min(this.n - 1, i + 1), span = this.s[j] - this.s[i] || 1; return this.y[i] + (this.y[j] - this.y[i]) * clamp((s - this.s[i]) / span, 0, 1); }

  /** Spatial hash of the segments (16 m cells) for exact nearest-point queries anywhere. */
  grid() {
    if (this._grid) return this._grid;
    const G = new Map(), C = 16;
    for (let i = 0; i < this.n - 1; i++) {
      const x0 = Math.floor(Math.min(this.x[i], this.x[i + 1]) / C), x1 = Math.floor(Math.max(this.x[i], this.x[i + 1]) / C);
      const z0 = Math.floor(Math.min(this.z[i], this.z[i + 1]) / C), z1 = Math.floor(Math.max(this.z[i], this.z[i + 1]) / C);
      for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) { const k = a * 4096 + b; let l = G.get(k); if (!l) G.set(k, l = []); l.push(i); }
    }
    return (this._grid = { G, C });
  }

  /**
   * Nearest point on the centre line: { s, d (signed, + left), dist (euclidean, past the ends too), x, z, tx, tz, i, y }.
   * Exact: searches rings of grid cells outwards until no closer segment can exist.
   */
  nearest(px, pz, out = {}) {
    const { G, C } = this.grid();
    let best = Infinity, bi = 0, bt = 0;
    const cx = Math.floor(px / C), cz = Math.floor(pz / C);
    const test = (i) => {
      const ax = this.x[i], az = this.z[i], dx = this.x[i + 1] - ax, dz = this.z[i + 1] - az;
      const l2 = dx * dx + dz * dz || 1e-9;
      const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
      const qx = ax + dx * t - px, qz = az + dz * t - pz, d2 = qx * qx + qz * qz;
      if (d2 < best) { best = d2; bi = i; bt = t; }
    };
    for (let r = 0; r < 64; r++) {
      // a ring of cells at Chebyshev distance r; once the ring is farther than the best, stop
      if (best < Infinity && (r - 1) * C > Math.sqrt(best)) break;
      for (let a = cx - r; a <= cx + r; a++) for (let b = cz - r; b <= cz + r; b++) {
        if (Math.max(Math.abs(a - cx), Math.abs(b - cz)) !== r) continue;
        const l = G.get(a * 4096 + b);
        if (l) for (const i of l) test(i);
      }
      if (r > 12 && best === Infinity) { for (let i = 0; i < this.n - 1; i++) test(i); break; }
    }
    const i = bi, cxp = this.x[i] + (this.x[i + 1] - this.x[i]) * bt, czp = this.z[i] + (this.z[i + 1] - this.z[i]) * bt;
    const tx = this.tx[i] + (this.tx[i + 1] - this.tx[i]) * bt, tz = this.tz[i] + (this.tz[i + 1] - this.tz[i]) * bt, tl = Math.hypot(tx, tz) || 1;
    out.tx = tx / tl; out.tz = tz / tl;
    out.x = cxp; out.z = czp; out.i = i;
    out.s = this.s[i] + (this.s[i + 1] - this.s[i]) * bt;
    out.dist = Math.sqrt(best);
    out.d = (px - cxp) * out.tz - (pz - czp) * out.tx;
    out.y = this.y[i] + (this.y[i + 1] - this.y[i]) * bt;
    return out;
  }

  /** Signed curvature at s (1/m, + turning left), from the tangents a few metres either side. */
  curvature(s, span = 6) {
    const a = this.at(s - span, 0, {}), b = this.at(s + span, 0, {});
    const cross = a.tx * b.tz - a.tz * b.tx, dot = a.tx * b.tx + a.tz * b.tz;
    return -Math.atan2(cross, dot) / (2 * span);
  }
}

/** The drivable area: roads (corridor = edge either side of the centre line), round pads, axis-aligned rectangles. */
export class Course {
  constructor({ roads = [], pads = [], rects = [] } = {}) {
    this.roads = roads; this.pads = pads; this.rects = rects;
    this._n = {};
  }

  /**
   * How far (x, z) is outside the drivable area: { pen (> 0 outside, metres), nx, nz (unit push back in), road, s }.
   * Inside, pen <= 0 (its depth inside the best region).
   */
  push(x, z, out = {}) {
    let best = -Infinity, nx = 0, nz = 0, road = null, s = 0;
    for (const r of this.roads) {
      const q = r.nearest(x, z, this._n);
      const m = r.edge - q.dist;
      if (m > best) {
        best = m; road = r; s = q.s;
        const l = q.dist || 1;
        nx = (q.x - x) / l; nz = (q.z - z) / l;
      }
    }
    for (const p of this.pads) {
      const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz), m = p.r - d;
      if (m > best) { best = m; road = null; nx = dx / (d || 1); nz = dz / (d || 1); }
    }
    for (const r of this.rects) {
      const inX = x >= r.x0 && x <= r.x1, inZ = z >= r.z0 && z <= r.z1;
      let m, ux = 0, uz = 0;
      if (inX && inZ) {
        m = Math.min(x - r.x0, r.x1 - x, z - r.z0, r.z1 - z);
      } else {
        const cx = clamp(x, r.x0, r.x1), cz = clamp(z, r.z0, r.z1), dx = cx - x, dz = cz - z, d = Math.hypot(dx, dz);
        m = -d; ux = dx / (d || 1); uz = dz / (d || 1);
      }
      if (m > best) { best = m; road = null; nx = ux; nz = uz; }
    }
    out.pen = -best; out.nx = nx; out.nz = nz; out.road = road; out.s = s;
    return out;
  }
}
