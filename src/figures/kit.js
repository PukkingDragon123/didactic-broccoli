// The toy-figure kit: a small modelling language for gacha figures (chamfered blocks, octagonal cylinders, blocky
// balls, posed sub-frames, painted with src/figures/paint.js), voxelized into a dense voxel figure
// (voxelizeFig) that goes through the same voxel pipeline as every other collectible (src/game/collectibles.js).
//
// Authoring (src/data/series/*.js): an item has `fig(k)` instead of the old voxel `build(v)`. Units are
// millimetres, y up, the figure faces +z and stands on y = 0. k is a Fig:
//   k.box(pos, [w, h, d], paint, o)     chamfered box (o.ch chamfer 0..0.6 of the smaller half size, o.top [sx, sz]
//                                       top section scale, o.sh [dx, dz] top shift, o.rot [rx, ry, rz], o.mat)
//   k.ball(pos, [rx, ry, rz], paint, o) a blocky ball: an octagonal prism with bevelled caps
//   k.cyl(pos, r, h, paint, o)          octagonal prism (o.rz for an elliptic one, o.top for a cone-ish taper)
//   k.prism(rings, paint, o)            rings [[y, hx, hz, cx, cz, ch], ...] bottom to top (everything else uses it)
//   k.at(pos, rot, fn, scale)           a sub-frame (pivot) for posed parts: fn() builds in it
//   k.mirror(fn)                        fn() twice, the second time mirrored in x (shares texture space)
// Paints are src/figures/paint.js specs (a colour or { c, t, d: [decals], top, bot, m, ... }).
import * as THREE from 'three';
import { VoxelModel, enc, MAT } from '../voxel/VoxelModel.js';
import { compilePaint, paintCtx } from './paint.js';

export const FIG_UNIT = 0.001; // metres per authoring unit (mm)

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const local = (pos, rot, scl) => {
  _e.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0, 'XYZ');
  _q.setFromEuler(_e);
  _s.set(scl?.[0] ?? scl ?? 1, scl?.[1] ?? scl ?? 1, scl?.[2] ?? scl ?? 1);
  if (typeof scl === 'number') _s.setScalar(scl);
  return new THREE.Matrix4().compose(_p.set(pos?.[0] || 0, pos?.[1] || 0, pos?.[2] || 0), _q, _s);
};

export class Fig {
  constructor() { this.prims = []; this.M = new THREE.Matrix4(); this.mir = false; this.anchors = {}; }
  /** Build fn() inside a sub-frame at pos with rotation rot (radians, XYZ) and optional scale. */
  at(pos, rot, fn, scl) {
    const prev = this.M;
    this.M = prev.clone().multiply(local(pos, rot, scl));
    try { fn(); } finally { this.M = prev; }
    return this;
  }
  /** fn() twice: as authored and mirrored in x (the mirrored copy shares the texture). */
  mirror(fn) {
    const start = this.prims.length;
    fn();
    // the mirror plane is the current frame's x = 0: mm = F * S(-1, 1, 1) * F^-1
    const mm = this.M.clone().multiply(new THREE.Matrix4().makeScale(-1, 1, 1)).multiply(this.M.clone().invert());
    for (let i = start, n = this.prims.length; i < n; i++) { const p = this.prims[i]; p.mirror = true; p.mm = p.mm ? mm.clone().multiply(p.mm) : mm; }
    return this;
  }
  /** Remember a point (figure mm) by name, in the current frame: toys and gimmicks attach there. */
  anchor(name, pos = [0, 0, 0]) { this.anchors[name] = new THREE.Vector3(...pos).applyMatrix4(this.M); return this; }
  prism(rings, paint, o = {}) {
    const m = this.M.clone().multiply(local(o.pos, o.rot, o.scl));
    const p = { rings, paint, o, m, mirror: false, caps: o.caps || 'both' };
    // o.pf: paint in the parent frame (decals / textures see the part after its own rotation: lids, wheels, lying cans)
    if (o.pf && o.rot) p.R = new THREE.Matrix3().setFromMatrix4(local(null, o.rot, null)).elements;
    this.prims.push(p);
    return p;
  }
  box(pos, size, paint, o = {}) {
    const [w, h, d] = size, ch = o.ch ?? 0.22, t = o.top || [1, 1], sh = o.sh || [0, 0];
    const hx = w / 2, hz = d / 2;
    return this.prism([[-h / 2, hx, hz, 0, 0, ch], [h / 2, hx * t[0], hz * (t[1] ?? t[0]), sh[0], sh[1], ch]], paint, { ...o, pos });
  }
  /** Blocky ball: octagon rings (o.n: 2 / 3 bevel steps), radius rx, ry, rz; o.flat flattens the bottom. */
  ball(pos, r, paint, o = {}) {
    const [rx, ry, rz] = Array.isArray(r) ? r : [r, r, r], ch = o.ch ?? 0.5;
    const prof = o.n === 2 ? [[-1, 0.62], [-0.48, 1], [0.48, 1], [1, 0.62]] : [[-1, 0.5], [-0.72, 0.86], [-0.3, 1], [0.3, 1], [0.72, 0.86], [1, 0.5]];
    const rings = prof.map(([y, s]) => [y * ry, rx * s, rz * s, 0, 0, ch]);
    if (o.flat != null) { // cut the bottom flat at y = -ry * flat
      const yc = -ry * o.flat;
      while (rings.length > 2 && rings[1][0] <= yc) rings.shift();
      if (rings[0][0] < yc) { const a = rings[0], b = rings[1], t = (yc - a[0]) / (b[0] - a[0]); rings[0] = [yc, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 0, 0, ch]; }
    }
    return this.prism(rings, paint, { ...o, pos });
  }
  /** Soft block: a box with bevelled top and bottom edges (the people's head / body look); o.flat cuts the bottom bevel. */
  soft(pos, r, paint, o = {}) {
    const [rx, ry, rz] = r, ch = o.ch ?? 0.4, b = o.bev ?? 0.2, s = o.bs ?? 0.84, t = o.top || [1, 1];
    const rings = [[-ry, rx * s, rz * s, 0, 0, ch], [-ry * (1 - b), rx, rz, 0, 0, ch], [ry * (1 - b), rx * t[0], rz * (t[1] ?? t[0]), 0, 0, ch], [ry, rx * t[0] * s, rz * (t[1] ?? t[0]) * s, 0, 0, ch]];
    if (o.flat) rings.shift();
    return this.prism(rings, paint, { ...o, pos });
  }
  cyl(pos, r, h, paint, o = {}) {
    const rz = o.rz ?? r, t = o.top ?? 1, ch = o.ch ?? 0.586;
    return this.prism([[-h / 2, r, rz, 0, 0, ch], [h / 2, r * t, rz * t, 0, 0, ch]], paint, { ...o, pos });
  }
}

// ------------------------------------------------------------------ faces of a prism
function ringPts(R) {
  const [y, hx, hz, cx = 0, cz = 0, ch = 0] = R;
  const c = ch * Math.min(hx, hz);
  return [[cx + hx, y, cz + hz - c], [cx + hx - c, y, cz + hz], [cx - hx + c, y, cz + hz], [cx - hx, y, cz + hz - c],
    [cx - hx, y, cz - hz + c], [cx - hx + c, y, cz - hz], [cx + hx - c, y, cz - hz], [cx + hx, y, cz - hz + c]];
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const same = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 1e-6;

function newell(P) {
  const n = [0, 0, 0];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

function primFaces(p) {
  const R = p.rings.map(ringPts);
  const out = [];
  // bbox of the prism (local)
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  const RR = p.R ? R.map((r) => r.map((q) => [p.R[0] * q[0] + p.R[3] * q[1] + p.R[6] * q[2], p.R[1] * q[0] + p.R[4] * q[1] + p.R[7] * q[2], p.R[2] * q[0] + p.R[5] * q[1] + p.R[8] * q[2]])) : R;
  for (const r of RR) for (const q of r) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); z0 = Math.min(z0, q[2]); z1 = Math.max(z1, q[2]); }
  p.bb = { x0, x1, y0, y1, z0, z1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2, hx: (x1 - x0) / 2, hy: (y1 - y0) / 2, hz: (z1 - z0) / 2 };
  for (let k = 0; k + 1 < R.length; k++) {
    const A = R[k], B = R[k + 1];
    const axisC = [(p.bb.cx), (A[0][1] + B[0][1]) / 2, p.bb.cz];
    for (let i = 0; i < 8; i++) {
      const a = A[i], b = A[(i + 1) % 8], tb = B[(i + 1) % 8], ta = B[i];
      let pts = [a, b, tb, ta].filter((q, j, arr) => !same(q, arr[(j + 1) % arr.length]));
      if (pts.length < 3) continue;
      let N = newell(pts);
      if (Math.hypot(...N) < 1e-9) continue;
      N = norm(N);
      const mid = pts.reduce((s, q) => [s[0] + q[0] / pts.length, s[1] + q[1] / pts.length, s[2] + q[2] / pts.length], [0, 0, 0]);
      const rel = sub(mid, axisC); rel[1] = 0;
      if (dot(N, rel) < 0) { pts = pts.reverse(); N = [-N[0], -N[1], -N[2]]; }
      out.push({ p, kind: 'side', pts, N });
    }
  }
  const cap = (P, top) => {
    let pts = P.filter((q, j, arr) => !same(q, arr[(j + 1) % arr.length]));
    if (pts.length < 3) return;
    let N = norm(newell(pts));
    if ((N[1] > 0) !== top) { pts = pts.reverse(); N = [-N[0], -N[1], -N[2]]; }
    out.push({ p, kind: top ? 'top' : 'bot', pts, N });
  };
  if (p.caps === 'both' || p.caps === 'top') cap(R[R.length - 1], true);
  if (p.caps === 'both' || p.caps === 'bot') cap(R[0], false);
  for (const f of out) {
    let V;
    if (f.kind === 'side') { V = [0, 1, 0]; const k = dot(V, f.N); V = [V[0] - f.N[0] * k, V[1] - f.N[1] * k, V[2] - f.N[2] * k]; if (Math.hypot(...V) < 1e-3) V = [0, 0, -1]; V = norm(V); }
    else { V = f.kind === 'top' ? [0, 0, -1] : [0, 0, 1]; const k = dot(V, f.N); V = norm([V[0] - f.N[0] * k, V[1] - f.N[1] * k, V[2] - f.N[2] * k]); }
    f.V = V; f.U = norm(cross(V, f.N)); f.o = f.pts[0];
    let s0 = Infinity, s1 = -Infinity, r0 = Infinity, r1 = -Infinity;
    f.p2 = f.pts.map((q) => { const d = sub(q, f.o); const u = dot(d, f.U), v = dot(d, f.V); s0 = Math.min(s0, u); s1 = Math.max(s1, u); r0 = Math.min(r0, v); r1 = Math.max(r1, v); return [u, v]; });
    f.s0 = s0; f.s1 = s1; f.r0 = r0; f.r1 = r1;
  }
  return out;
}

// ------------------------------------------------------------------ voxelizing
const MATS = { matte: MAT.MATTE, gloss: MAT.GLOSS, metal: MAT.METAL, glow: MAT.GLOW, glass: MAT.GLASS };
const _v = new THREE.Vector3();

/** Is local point (x, y, z) inside the prism's rings (tol mm of slack for thin parts)? Returns the ring section or null. */
function inside(rings, x, y, z, tol) {
  if (y < rings[0][0] - tol || y > rings[rings.length - 1][0] + tol) return null;
  let k = 0;
  while (k + 2 < rings.length && y > rings[k + 1][0]) k++;
  const A = rings[k], B = rings[k + 1] || A, t = B[0] === A[0] ? 0 : Math.min(1, Math.max(0, (y - A[0]) / (B[0] - A[0])));
  const L = (i, d) => (A[i] ?? d) + ((B[i] ?? d) - (A[i] ?? d)) * t;
  const hx = L(1, 0) + tol, hz = L(2, 0) + tol, cx = L(3, 0), cz = L(4, 0), c = L(5, 0) * Math.min(hx, hz);
  const ax = Math.abs(x - cx), az = Math.abs(z - cz);
  if (ax > hx || az > hz) return null;
  if (c > 0 && (ax - (hx - c)) + (az - (hz - c)) > c) return null;
  return { hx, hz, cx, cz, ax, az, t, k };
}

/**
 * Voxelize a kit figure (item.fig) into a VoxelModel at vox mm per voxel. Every prim fills the voxels whose centres lie
 * inside it (later prims overwrite earlier ones) with its paint, sampled at the voxel as if on the nearest face, so
 * faces, decals, materials and the ramp-dithered shading all land in the voxel colours.
 */
export function voxelizeFig(figFn, vox = 1.1) {
  const k = new Fig();
  figFn(k);
  const model = new VoxelModel();
  model.jitter = 0;
  const c = paintCtx(), o = new Float32Array(4), inv = new THREE.Matrix4(), P = new THREE.Vector3();
  const list = [];
  for (const p of k.prims) { p.fn = compilePaint(p.paint); list.push([p, p.m]); if (p.mirror) list.push([p, p.mm.clone().multiply(p.m)]); }
  for (const [p, M] of list) {
    inv.copy(M).invert();
    // local bounds of the rings -> figure-space voxel range
    let lx = 1e9, ly = 1e9, lz = 1e9, hx = -1e9, hy = -1e9, hz = -1e9;
    const R = p.rings;
    for (const r of R) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      _v.set((r[3] || 0) + sx * r[1], r[0], (r[4] || 0) + sz * r[2]).applyMatrix4(M);
      lx = Math.min(lx, _v.x); ly = Math.min(ly, _v.y); lz = Math.min(lz, _v.z); hx = Math.max(hx, _v.x); hy = Math.max(hy, _v.y); hz = Math.max(hz, _v.z);
    }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const r of R) { x0 = Math.min(x0, (r[3] || 0) - r[1]); x1 = Math.max(x1, (r[3] || 0) + r[1]); y0 = Math.min(y0, r[0]); y1 = Math.max(y1, r[0]); z0 = Math.min(z0, (r[4] || 0) - r[2]); z1 = Math.max(z1, (r[4] || 0) + r[2]); }
    p.bb = { x0, x1, y0, y1, z0, z1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2, hx: (x1 - x0) / 2, hy: (y1 - y0) / 2, hz: (z1 - z0) / 2 };
    const tol = Math.min(p.bb.hx, p.bb.hz, p.bb.hy) < vox * 0.7 ? vox * 0.5 : 0;
    const PR = p.R, mat = MATS[p.paint?.m] ?? p.o.mat ?? MAT.MATTE;
    for (let gx = Math.floor(lx / vox); gx <= Math.ceil(hx / vox); gx++) for (let gy = Math.floor(ly / vox); gy <= Math.ceil(hy / vox); gy++) for (let gz = Math.floor(lz / vox); gz <= Math.ceil(hz / vox); gz++) {
      P.set((gx + 0.5) * vox, (gy + 0.5) * vox, (gz + 0.5) * vox).applyMatrix4(inv);
      const s = inside(R, P.x, P.y, P.z, tol);
      if (!s) continue;
      // nearest face: whichever of side x / side z / top / bottom is closest; its normal drives the paint
      const dx = s.hx - s.ax, dz = s.hz - s.az, dt = R[R.length - 1][0] - P.y, db = P.y - R[0][0];
      const m = Math.min(dx, dz, dt, db);
      let nx = 0, ny = 0, nz = 0, kind = 'side';
      if (m === dt) { ny = 1; kind = 'top'; } else if (m === db) { ny = -1; kind = 'bot'; } else if (m === dx) nx = Math.sign(P.x - s.cx) || 1; else nz = Math.sign(P.z - s.cz) || 1;
      if (Math.abs(s.ax - s.hx) < vox && Math.abs(s.az - s.hz) < vox) { const l = Math.SQRT1_2; nx = (Math.sign(P.x - s.cx) || 1) * l; nz = (Math.sign(P.z - s.cz) || 1) * l; ny = 0; kind = 'side'; }
      c.x = P.x; c.y = P.y; c.z = P.z; c.nx = nx; c.ny = ny; c.nz = nz; c.kind = kind;
      if (PR) { const a = c.x, b = c.y, e = c.z; c.x = PR[0] * a + PR[3] * b + PR[6] * e; c.y = PR[1] * a + PR[4] * b + PR[7] * e; c.z = PR[2] * a + PR[5] * b + PR[8] * e; c.nx = PR[0] * nx + PR[3] * ny + PR[6] * nz; c.ny = PR[1] * nx + PR[4] * ny + PR[7] * nz; c.nz = PR[2] * nx + PR[5] * ny + PR[8] * nz; }
      const me = M.elements; c.wny = me[1] * nx + me[5] * ny + me[9] * nz;
      c.X = (gx + 0.5) * vox; c.Y = (gy + 0.5) * vox; c.Z = (gz + 0.5) * vox;
      c.p = p; c.bb = p.bb; c.ed = m < vox * 1.2 && Math.min(dx, dz, dt, db, 9) === m && [dx, dz, dt, db].filter((v) => v < vox * 1.2).length > 1 ? 0.2 : 2;
      c.fv = (P.y - R[0][0]) / ((R[R.length - 1][0] - R[0][0]) || 1); c.px = vox;
      c.ti = gx + gz * 3; c.tj = -gy;
      o[0] = 255; o[1] = 0; o[2] = 255; o[3] = 255;
      p.fn(c, o);
      const col = ((o[0] < 0 ? 0 : o[0] > 255 ? 255 : o[0] | 0) << 16) | ((o[1] < 0 ? 0 : o[1] > 255 ? 255 : o[1] | 0) << 8) | (o[2] < 0 ? 0 : o[2] > 255 ? 255 : o[2] | 0);
      model.set(gx, gy, gz, enc(col, mat));
    }
  }
  model.anchors = k.anchors;
  return model;
}
