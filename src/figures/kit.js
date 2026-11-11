// The toy-figure kit: gacha figures built the way the people are (src/people/mesh.js): a handful of chamfered
// box segments per figure (heads, bodies, limbs, props), every face mapped 1:1 into a painted texture atlas at
// high resolution (crisp pixels, mipmapped). One atlas per series, so all of a series' figures share their
// materials (one set per finish) and the gacha machines can merge their sample figures into one draw.
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
import { voxelMaterials } from '../voxel/materials.js';
import { compilePaint, paintCtx, FONT_WAIT } from './paint.js';

export const FIG_UNIT = 0.001; // metres per authoring unit (mm)
const PAD = 2;
const ATLAS_W = 1024, ATLAS_MAXH = 1024;
export const FIG_DENS = 3.0; // target texels per mm (shrinks when a series doesn't fit)

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

// ------------------------------------------------------------------ packing
function pack(rects, W, H) {
  const sky = new Int32Array(W);
  const order = [...rects].sort((a, b) => b.h - a.h || b.w - a.w);
  let top = 0;
  for (const r of order) {
    if (r.w > W) return -1;
    let bx = -1, by = 1e9;
    for (let x = 0; x + r.w <= W; x++) {
      const left = x === 0 || sky[x] !== sky[x - 1];
      const right = x + r.w === W || sky[x + r.w] !== sky[x + r.w - 1];
      if (!left && !right) continue;
      let y = 0;
      for (let i = x; i < x + r.w; i++) if (sky[i] > y) { y = sky[i]; if (y >= by) break; }
      if (y < by) { by = y; bx = x; }
    }
    if (by + r.h > H) return -1;
    r.x = bx; r.y = by;
    for (let i = bx; i < bx + r.w; i++) sky[i] = by + r.h;
    top = Math.max(top, by + r.h);
  }
  return top;
}

// ------------------------------------------------------------------ series atlases
const ATL = new Map();

function buildFig(item) {
  const k = new Fig();
  item.fig(k);
  const faces = [];
  void 0;
  for (const p of k.prims) { p.fn = compilePaint(p.paint); for (const f of primFaces(p)) faces.push(f); }
  return { k, faces, item };
}

/** The atlas of a series (layout of every fig item; painted lazily item by item). */
export function seriesAtlas(series) {
  let A = ATL.get(series.id);
  if (A) return A;
  const figs = new Map();
  for (const it of series.items) if (it.fig) figs.set(it.key, buildFig(it));
  const all = [...figs.values()].flatMap((f) => f.faces);
  let dens = FIG_DENS, H = 0;
  const sizeAt = (f, s) => {
    f.dens = s * (f.p.o.dens || 1) * (f.kind === 'bot' ? 0.5 : 1);
    f.rect = { w: Math.max(1, Math.ceil((f.s1 - f.s0) * f.dens - 0.01)) + PAD * 2, h: Math.max(1, Math.ceil((f.r1 - f.r0) * f.dens - 0.01)) + PAD * 2 };
  };
  for (let tries = 0; tries < 80; tries++) {
    for (const f of all) sizeAt(f, dens);
    H = pack(all.map((f) => f.rect), ATLAS_W, ATLAS_MAXH);
    if (H > 0) break;
    dens *= 0.96;
  }
  H = Math.max(64, Math.ceil(H / 64) * 64);
  const data = new Uint8Array(ATLAS_W * H * 4);
  const tex = new THREE.DataTexture(data, ATLAS_W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  A = { id: series.id, W: ATLAS_W, H, dens, data, tex, figs, painted: new Set(), geos: new Map(), mats: new Map() };
  ATL.set(series.id, A);
  return A;
}

function paintFig(A, key) {
  if (A.painted.has(key)) return;
  A.painted.add(key);
  const F = A.figs.get(key);
  FONT_WAIT.pending = null;
  const c = paintCtx(), o = new Float32Array(4), d = A.data, W = A.W;
  for (const f of F.faces) {
    const R = f.rect, fn = f.p.fn, bb = f.p.bb, m = f.p.m.elements;
    c.p = f.p; c.bb = bb; c.nx = f.N[0]; c.ny = f.N[1]; c.nz = f.N[2]; c.kind = f.kind;
    const PR = f.p.R;
    if (PR) { const [a, b, e] = f.N; c.nx = PR[0] * a + PR[3] * b + PR[6] * e; c.ny = PR[1] * a + PR[4] * b + PR[7] * e; c.nz = PR[2] * a + PR[5] * b + PR[8] * e; }
    // world-space normal (for light-ish effects): rotate by the prim matrix
    c.wny = m[1] * f.N[0] + m[5] * f.N[1] + m[9] * f.N[2];
    const P2 = f.p2, n2 = P2.length;
    for (let j = 0; j < R.h; j++) {
      const r = f.r1 - (j - PAD + 0.5) / f.dens;
      for (let i = 0; i < R.w; i++) {
        const s = f.s0 + (i - PAD + 0.5) / f.dens;
        const x = f.o[0] + f.U[0] * s + f.V[0] * r, y = f.o[1] + f.U[1] * s + f.V[1] * r, z = f.o[2] + f.U[2] * s + f.V[2] * r;
        c.x = x; c.y = y; c.z = z;
        if (PR) { c.x = PR[0] * x + PR[3] * y + PR[6] * z; c.y = PR[1] * x + PR[4] * y + PR[7] * z; c.z = PR[2] * x + PR[5] * y + PR[8] * z; }
        c.X = m[0] * x + m[4] * y + m[8] * z + m[12]; c.Y = m[1] * x + m[5] * y + m[9] * z + m[13]; c.Z = m[2] * x + m[6] * y + m[10] * z + m[14];
        // distance to the face outline (mm) for bevel shading
        let ed = 1e9;
        for (let q = 0; q < n2; q++) {
          const a = P2[q], b = P2[(q + 1) % n2], ex = b[0] - a[0], ey = b[1] - a[1], L = ex * ex + ey * ey || 1;
          let t = ((s - a[0]) * ex + (r - a[1]) * ey) / L; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = s - a[0] - ex * t, dy = r - a[1] - ey * t, dd = dx * dx + dy * dy;
          if (dd < ed) ed = dd;
        }
        c.ed = Math.sqrt(ed); c.fv = (r - f.r0) / ((f.r1 - f.r0) || 1); c.px = 1 / f.dens;
        o[0] = 255; o[1] = 0; o[2] = 255; o[3] = 255;
        fn(c, o);
        const k = ((R.y + j) * W + R.x + i) * 4;
        d[k] = o[0] < 0 ? 0 : o[0] > 255 ? 255 : o[0]; d[k + 1] = o[1] < 0 ? 0 : o[1] > 255 ? 255 : o[1]; d[k + 2] = o[2] < 0 ? 0 : o[2] > 255 ? 255 : o[2]; d[k + 3] = 255;
      }
    }
  }
  A.tex.needsUpdate = true;
  // a text decal met an unloaded web font: repaint this figure once the font is in (fresh decal closures)
  if (FONT_WAIT.pending) {
    const wait = FONT_WAIT.pending; FONT_WAIT.pending = null;
    wait.then(() => { const it = F.item; const nf = buildFig(it); for (let i = 0; i < nf.faces.length && i < F.faces.length; i++) F.faces[i].p.fn = nf.faces[i].p.fn; A.painted.delete(key); paintFig(A, key); }).catch(() => {});
  }
}

/** Geometry of a fig item (bottom-centred, metres, groups by material index). */
export function figGeometry(item, series) {
  const A = seriesAtlas(series);
  let g = A.geos.get(item.key);
  if (g) { paintFig(A, item.key); return g; }
  const F = A.figs.get(item.key);
  paintFig(A, item.key);
  const byMat = new Map();
  const pos = [], nrm = [], uv = [];
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  const MIR = new THREE.Matrix4().makeScale(-1, 1, 1);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  const emit = (f, mirror) => {
    const M = mirror ? f.p.mm.clone().multiply(f.p.m) : f.p.m;
    nm.getNormalMatrix(M);
    const base = pos.length / 3, R = f.rect;
    for (let q = 0; q < f.pts.length; q++) {
      const P = f.pts[q], [s, r] = f.p2[q];
      v.set(P[0], P[1], P[2]).applyMatrix4(M);
      pos.push(v.x, v.y, v.z);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z);
      n.set(f.N[0], f.N[1], f.N[2]).applyMatrix3(nm).normalize();
      nrm.push(n.x, n.y, n.z);
      uv.push((R.x + PAD + (s - f.s0) * f.dens) / A.W, (R.y + PAD + (f.r1 - r) * f.dens) / A.H);
    }
    const mi = f.p.o.mat ?? compiledMat(f.p);
    if (!byMat.has(mi)) byMat.set(mi, []);
    const list = byMat.get(mi), flip = mirror !== (M.determinant() < 0 && !mirror ? true : false);
    for (let q = 1; q + 1 < f.pts.length; q++) {
      if (mirror) list.push(base, base + q + 1, base + q); else list.push(base, base + q, base + q + 1);
    }
    void flip;
  };
  for (const f of F.faces) { emit(f, false); if (f.p.mirror) emit(f, true); }
  // bottom-centre: x / z centred on the bounds, feet on y = 0; then fit the shelf slot
  let cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const maxDim = Math.max(x1 - x0, y1 - y0, z1 - z0) * FIG_UNIT;
  let sc = FIG_UNIT * (maxDim > ITEM_MAX ? ITEM_MAX / maxDim : 1) * (item.figScale || 1);
  if (item.frame) { ({ cx, cz, sc } = item.frame); y0 = item.frame.cy; } // moving parts share their figure's frame
  for (let i = 0; i < pos.length; i += 3) { pos[i] = (pos[i] - cx) * sc; pos[i + 1] = (pos[i + 1] - y0) * sc; pos[i + 2] = (pos[i + 2] - cz) * sc; }
  const idx = [];
  g = new THREE.BufferGeometry();
  for (const mi of [...byMat.keys()].sort((a, b) => a - b)) { const st = idx.length; idx.push(...byMat.get(mi)); g.addGroup(st, idx.length - st, mi); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingBox(); g.computeBoundingSphere();
  // frame: authoring mm -> mesh metres (toys.js uses it for moving parts)
  g.userData.fig = { cx, cy: y0, cz, sc, anchors: F.k.anchors };
  A.geos.set(item.key, g);
  return g;
}
const ITEM_MAX = 0.088;

function compiledMat(p) { const pa = p.paint; return (pa && typeof pa === 'object' && pa.m != null) ? MATS[pa.m] ?? pa.m : 0; }
const MATS = { matte: 0, gloss: 1, metal: 2, glow: 3, glass: 4 };

/** Material array for a series' atlas in a finish (clones of the voxel finish materials with the atlas as map). */
export function figMaterials(series, finish = 'normal') {
  const A = seriesAtlas(series);
  let mats = A.mats.get(finish);
  if (mats) return mats;
  mats = voxelMaterials(finish).map((b) => {
    const m = b.clone();
    m.vertexColors = false;
    m.map = A.tex;
    m.onBeforeCompile = b.onBeforeCompile;
    if (b.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) m.customProgramCacheKey = b.customProgramCacheKey;
    return m;
  });
  A.mats.set(finish, mats);
  return mats;
}

/** Stats for dev pages: { series: { W, H, dens, painted } }. */
export function figStats() {
  const o = {};
  for (const [id, A] of ATL) o[id] = { W: A.W, H: A.H, dens: +A.dens.toFixed(2), painted: A.painted.size, figs: A.figs.size };
  return o;
}

// ------------------------------------------------------------------ moving parts (toys)
const PARTS = new Map();
/**
 * A mesh for a toy's moving part: item.figParts[name] is a fig function authored in the figure's own mm frame
 * (o.own: around its own origin instead). All parts of an item share one small atlas.
 */
export function figPartMesh(item, series, name, o = {}) {
  const main = figGeometry(item, series).userData.fig;
  let ps = PARTS.get(item.key);
  if (!ps) {
    ps = { id: item.key + ':parts', items: Object.entries(item.figParts || {}).map(([n, fn]) => ({ key: item.key + ':' + n, fig: fn, frame: n.startsWith('own') || (item.ownParts || []).includes(n) ? { cx: 0, cy: 0, cz: 0, sc: main.sc } : main })) };
    PARTS.set(item.key, ps);
  }
  const it = ps.items.find((x) => x.key === item.key + ':' + name);
  const m = new THREE.Mesh(figGeometry(it, ps), figMaterials(ps, o.finish || 'normal'));
  m.castShadow = true;
  return m;
}
/** A named point of a fig item (item.pts[name], mm) in its mesh's local space. */
export function figPoint(item, series, name, out = new THREE.Vector3()) {
  const f = figGeometry(item, series).userData.fig, p = item.pts?.[name] || [0, 0, 0];
  return out.set((p[0] - f.cx) * f.sc, (p[1] - f.cy) * f.sc, (p[2] - f.cz) * f.sc);
}
