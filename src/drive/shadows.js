// Hard-edged projected shadows for the drive's countryside (the sun's shadow map only covers the garage): every caster
// is a few points (box corners, a pole's base and tip, a tree's crown ring) thrown along the sun onto the ground,
// wrapped in a convex hull and draped over the terrain (road, verges, paddies) as a dark, flat, see-through polygon.
// Static casters are merged into one mesh when the zone is built; moving ones (the van, trucks, the train) share one
// small mesh rebuilt every frame.
//   hull(points2) -> [[x, z]...]   drapeTris(out, poly, heightAt, step)   strip(out, a, b, w, heightAt, step)
//   new DynamicShadows(material, maxTris)  .begin() .box(matrix, hx, y0, y1, hz, sun, heightAt) .end()
import * as THREE from 'three';

/** Convex hull (monotone chain) of [x, z] points, counter-clockwise. */
export function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop();
  return lo.concat(up);
}

/** Where a point (x, y, z) lands on the ground plane y = g along the light (sun = unit vector towards the sun). */
export function project(x, y, z, sun, g = 0) {
  const k = (y - g) / Math.max(0.08, sun.y);
  return [x - sun.x * k, z - sun.z * k];
}

/** Push a triangle, subdivided into n*n smaller ones, every vertex draped (heightAt + lift). out: flat positions. */
function subTri(out, a, b, c, n, heightAt, lift) {
  const P = (u, v) => {
    const x = a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v, z = a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v;
    return [x, heightAt(x, z) + lift, z];
  };
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
    const u0 = i / n, v0 = j / n, u1 = (i + 1) / n, v1 = (j + 1) / n;
    const p0 = P(u0, v0), p1 = P(u1, v0), p2 = P(u0, v1);
    out.push(...p0, ...p2, ...p1);
    if (j < n - i - 1) { const p3 = P(u1, v1); out.push(...p1, ...p2, ...p3); }
  }
}

/** A convex polygon (ccw [x, z] points) as draped triangles: a fan, each subdivided to about `step` metres. */
export function drapeTris(out, poly, heightAt, step = 2.5, lift = 0.03) {
  if (poly.length < 3) return;
  const c = poly.reduce((s, q) => [s[0] + q[0] / poly.length, s[1] + q[1] / poly.length], [0, 0]);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const e = Math.max(Math.hypot(a[0] - c[0], a[1] - c[1]), Math.hypot(b[0] - c[0], b[1] - c[1]), Math.hypot(a[0] - b[0], a[1] - b[1]));
    subTri(out, c, a, b, Math.max(1, Math.min(10, Math.ceil(e / step))), heightAt, lift);
  }
}

/** A long thin shadow (a pole, a post): a strip from a to b ([x, z]), w wide, draped every `step` metres. */
export function strip(out, a, b, w, heightAt, step = 1.2, lift = 0.03, w2 = w) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
  const n = Math.max(1, Math.ceil(L / step));
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + dx * t, z = a[1] + dz * t, hw = (w + (w2 - w) * t) / 2;
    const l = [x + nx * hw, heightAt(x + nx * hw, z + nz * hw) + lift, z + nz * hw], r = [x - nx * hw, heightAt(x - nx * hw, z - nz * hw) + lift, z - nz * hw];
    if (prev) out.push(...prev[0], ...prev[1], ...l, ...l, ...prev[1], ...r);
    prev = [l, r];
  }
}

/** Shadow material: a flat, dark, see-through colour (no glow, no gradient), drawn over the ground. */
export function shadowMaterial() {
  return new THREE.MeshBasicMaterial({ color: 0x262438, transparent: true, opacity: 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
}

/** Moving casters, rebuilt every frame into one mesh. */
export class DynamicShadows {
  constructor(material, maxTris = 3000) {
    this.max = maxTris * 9;
    this.pos = new Float32Array(this.max);
    const g = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(this.pos, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', attr);
    g.setDrawRange(0, 0);
    this.geo = g;
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.list = [];
    this._v = new THREE.Vector3();
  }
  begin() { this.list.length = 0; }
  /** A box in an object's frame (matrixWorld m): local x in ±hx, y in [y0, y1], z in [z0, z1]. */
  box(m, hx, y0, y1, z0, z1, sun, heightAt, step = 2.2) {
    const pts = [], v = this._v;
    for (const x of [-hx, hx]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
      v.set(x, y, z).applyMatrix4(m);
      const g = heightAt(v.x, v.z);
      pts.push(project(v.x, v.y, v.z, sun, g));
    }
    drapeTris(this.list, hull(pts), heightAt, step, 0.035);
  }
  end() {
    const n = Math.min(this.list.length, this.max);
    for (let i = 0; i < n; i++) this.pos[i] = this.list[i];
    const a = this.geo.attributes.position;
    a.clearUpdateRanges(); a.addUpdateRange(0, Math.max(9, n)); a.needsUpdate = true; // upload only what was written
    this.geo.setDrawRange(0, n / 3);
  }
  dispose() { this.geo.dispose(); }
}
