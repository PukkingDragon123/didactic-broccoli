// Sculpted low-poly figures: a builder that collects planar facets from rounded primitives (lathes, balls, lofted
// sections, swept tubes, chamfered boxes, extruded outlines), each facet carrying the paint that covers it. The baker
// (src/figures/bake.js) then gives every painted facet its own undistorted patch of a high-resolution atlas, so faces,
// stripes and panel lines run cleanly across the facets. Authored in MILLIMETRES, y up, the figure faces +z, feet on y = 0.
//
//   const S = new Sculpt();
//   S.paint(fill(0xf2a03a), ...face({ ... }))      the paint for the primitives that follow (src/figures/paint.js)
//   S.ball([0, 20, 0], [14, 12, 13])               S.lathe(profile, { segs })   S.loft(rings)   S.tube(path, r)
//   S.box(...) S.cyl(...) S.cone(...) S.extrude(outline, z0, z1) S.torus(...)
//   S.at([x, y, z], [rx, ry, rz], () => { ... })   a local frame (paint coordinates are local to it)
//   S.mirror((s) => { ... })                       build once, and once mirrored in x (s = 1, then -1)
//   S.part('lid', { rest: 0.4, move: (t) => hinge([0, 30, -8], 'x', -1.2 * t) }, () => { ... })   a moving part (gimmick)
//   S.clear(true)                                  the following primitives are clear plastic (their own draw group)
import * as THREE from 'three';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
export const V = { sub, add, mul, cross, dot, len, norm, lerp };

/** Newell normal of a polygon (unnormalised: its length is twice the area). */
function polyNormal(pts) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [x, y, z];
}
const centroid = (pts) => { const c = [0, 0, 0]; for (const p of pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; } return mul(c, 1 / pts.length); };

/**
 * How finely round things are cut. The counts a figure asks for (segs, rings, sides, spline steps) are its light level
 * of detail (shelves, thumbnails); in the hand they are multiplied by QUAL.k, so surfaces come out smooth.
 */
export const QUAL = { k: 1 };
const N = (n, min = 3) => Math.max(min, Math.round(n * QUAL.k));
const N2 = (n, k) => Math.max(3, Math.round(n * k));

/** Catmull-Rom through control points (any dimension), n steps per span (x QUAL.k): a smooth profile or path from a few points. */
export function spline(pts, n = 4, closed = false) {
  n = N(n, 1);
  const out = [], N = pts.length, D = pts[0].length;
  const P = (i) => (closed ? pts[((i % N) + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  const spans = closed ? N : N - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t, q = [];
      for (let d = 0; d < D; d++) q.push(0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3));
      out.push(q);
    }
  }
  if (!closed) out.push(pts[N - 1].slice());
  return out;
}

/**
 * A cross-section round c: a superellipse (pow 2 = ellipse, 4+ = rounded box) of n points. axis 'y' (default): in the
 * xz plane, radii (rx, rz); 'z': in the xy plane, radii (rx, ry); 'x': in the zy plane, radii (rz, ry).
 */
export function ring(c, ra, rb, n = 12, { pow = 2, a0 = null, axis = 'y', exact = false } = {}) {
  if (!exact) n = N(n);
  const out = [], e = 2 / pow, off = a0 ?? (Math.PI / 2 - Math.PI / n);
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
    const p = Math.sign(cs) * Math.abs(cs) ** e * ra, q = Math.sign(sn) * Math.abs(sn) ** e * rb;
    out.push(add(axis === 'y' ? [p, 0, q] : axis === 'z' ? [p, q, 0] : [0, q, p], c));
  }
  return out;
}

// ---- gimmick motions (figure space, mm): matrices for S.part(..., { move })
const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
/** Turn about an axis ('x' | 'y' | 'z' | [x, y, z]) through `pivot`. */
export function hinge(pivot, axis, angle) {
  const ax = typeof axis === 'string' ? AX[axis] : new THREE.Vector3(...axis).normalize();
  const m = new THREE.Matrix4().makeTranslation(pivot[0], pivot[1], pivot[2]);
  m.multiply(new THREE.Matrix4().makeRotationAxis(ax, angle));
  return m.multiply(new THREE.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]));
}
export const slide = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
/** Scale about a pivot. */
export function swell(pivot, sx, sy = sx, sz = sx) {
  const m = new THREE.Matrix4().makeTranslation(pivot[0], pivot[1], pivot[2]);
  m.multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
  return m.multiply(new THREE.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]));
}
export const chain = (...ms) => ms.reduce((a, b) => a.clone().multiply(b));

export class Sculpt {
  constructor() {
    this.facets = [];
    this.m = new THREE.Matrix4();
    this.stack = [];
    this.layers = [];
    this.slot = 0;
    this.partName = null;
    this.parts = {}; // name -> { rest, move(t) -> Matrix4, label }
    this.crease = 50; // degrees: neighbouring facets flatter than this share smooth normals; sharper edges stay hard
    this.soft = 1; // 0 = flat-shaded facets, 1 = fully smooth
    this.patches = []; // smooth surfaces as grids (lathes, lofts, tubes): one atlas patch each, see grid()
    this.dens = 1; // texel density multiplier for the facets that follow
    this.maxFacet = 11; // mm: quads longer than this are cut into coplanar pieces (0 = never)
  }

  // ---- state
  paint(...layers) { this.layers = layers.flat(Infinity).filter(Boolean); return this; }
  clear(on = true) { this.slot = on ? 1 : 0; return this; }
  push(m) { this.stack.push(this.m); this.m = this.m.clone().multiply(m); return this; }
  pop() { this.m = this.stack.pop(); return this; }
  /** A local frame: position, rotation (radians, XYZ) and scale (number or [x, y, z]). */
  at(pos, rot, fn, scale = 1) {
    _p.set(pos[0], pos[1], pos[2]);
    _q.setFromEuler(new THREE.Euler(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0, 'YXZ'));
    if (typeof scale === 'number') _s.setScalar(scale); else _s.set(scale[0], scale[1], scale[2]);
    this.push(new THREE.Matrix4().compose(_p, _q, _s));
    try { fn(this); } finally { this.pop(); }
    return this;
  }
  /** fn(1) as built, then fn(-1) mirrored in x. */
  mirror(fn) {
    fn(1);
    this.push(new THREE.Matrix4().makeScale(-1, 1, 1));
    try { fn(-1); } finally { this.pop(); }
    return this;
  }
  /**
   * A joint of the figure's rig: everything built in fn moves with it (and with the joint it is nested in).
   *   hinge:  { pivot: [x, y, z], axis: 'x' | 'y' | 'z' | [x, y, z], min, max, rest, g: [at t = 0, at t = 1], idle }
   *   slide:  { slide: [dx, dy, dz] (the travel at value 1), min, max, rest, g, idle }
   *   custom: { move: (t) => Matrix4, rest }   (driven by the gimmick's t alone)
   * min / max: the limits it can be posed to (radians, or 0..1 of the slide); rest: where it sits; g: where the
   * figure's gimmick takes it; idle: how far it sways by itself while you turn the figure over in your hand.
   */
  part(name, def, fn) {
    this.parts[name] = { rest: 0, ...def, parent: this.partName };
    const prev = this.partName;
    this.partName = name;
    try { fn(this); } finally { this.partName = prev; }
    return this;
  }
  joint(name, def, fn) { return this.part(name, def, fn); }
  /** The matrix of a joint (figure space, mm) for a pose: { t (gimmick, 0..1), values: { joint: value }, add: { joint: offset } }. */
  jointMatrix(name, pose = {}) {
    const d = this.parts[name], t = pose.t ?? this.restT;
    let m;
    if (d.move) m = d.move(t);
    else {
      let v = pose.values?.[name] ?? (d.g ? lerp(d.g[0], d.g[1], t) : d.rest);
      v += pose.add?.[name] || 0;
      if (d.min !== undefined) v = Math.max(d.min, v);
      if (d.max !== undefined) v = Math.min(d.max, v);
      m = d.slide ? slide(d.slide[0] * v, d.slide[1] * v, d.slide[2] * v) : hinge(d.pivot || [0, 0, 0], d.axis || 'y', v);
    }
    return d.parent ? this.jointMatrix(d.parent, pose).clone().multiply(m) : m;
  }
  /** The gimmick's t in the resting pose (S.rest = t, or the first custom part's own rest). */
  get restT() { if (this.rest !== undefined) return this.rest; const c = Object.values(this.parts).find((d) => d.move); return c ? c.rest : 0; }
  /** Run fn with these settings ({ soft, crease, dens, slot }), then restore. */
  with(o, fn) {
    const keep = { soft: this.soft, crease: this.crease, dens: this.dens, slot: this.slot, layers: this.layers, maxFacet: this.maxFacet, partName: this.partName };
    Object.assign(this, o);
    try { fn(this); } finally { Object.assign(this, keep); }
    return this;
  }

  // ---- emitting
  /** polys: [[x, y, z] x n] in local space, counter-clockwise seen from outside (or oriented by hint(poly) -> dir). */
  emit(polys, hint = null) {
    const L = [];
    // heights where the paint changes (band / below / above layers): quads standing between two heights are cut there
    const ys = [...new Set(this.layers.flatMap((l) => l.cutsY || []))].sort((a, b) => a - b);
    if (ys.length) {
      const cutPolys = [];
      for (const item of polys) {
        const pts = Array.isArray(item) ? item : item.pts, ph = Array.isArray(item) ? null : item.hint;
        const lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
        const cuts = ys.filter((y) => y > lo + 0.05 && y < hi - 0.05);
        const two = pts.length === 4 && pts.every((p) => Math.abs(p[1] - lo) < 1e-4 || Math.abs(p[1] - hi) < 1e-4);
        if (!cuts.length || !two) { cutPolys.push(item); continue; }
        // rotate so that points 0, 1 are the low edge and 2, 3 the high one
        let k = 0;
        while (k < 4 && !(Math.abs(pts[k][1] - lo) < 1e-4 && Math.abs(pts[(k + 1) % 4][1] - lo) < 1e-4)) k++;
        if (k === 4) { cutPolys.push(item); continue; }
        const q = [pts[k], pts[(k + 1) % 4], pts[(k + 2) % 4], pts[(k + 3) % 4]];
        const lv = [lo, ...cuts, hi], at = (a, b, y) => { const t = (y - lo) / (hi - lo); return [lerp(a[0], b[0], t), y, lerp(a[2], b[2], t)]; };
        for (let i = 0; i + 1 < lv.length; i++) cutPolys.push({ pts: [at(q[0], q[3], lv[i]), at(q[1], q[2], lv[i]), at(q[1], q[2], lv[i + 1]), at(q[0], q[3], lv[i + 1])], hint: ph || hint || norm(polyNormal(pts)) });
      }
      polys = cutPolys;
    }
    for (let pts of polys) {
      let ph = hint;
      if (!Array.isArray(pts)) { ph = pts.hint ?? hint; pts = pts.pts; }
      // drop repeated points (degenerate quads at poles become triangles)
      pts = pts.filter((p, i) => { const q = pts[(i + pts.length - 1) % pts.length]; return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) > 1e-5; });
      if (pts.length < 3) continue;
      let n = polyNormal(pts);
      const area = len(n) / 2;
      if (area < 1e-6) continue;
      n = norm(n);
      if (ph) { const h = typeof ph === 'function' ? ph(pts) : ph; if (dot(n, h) < 0) { pts = pts.slice().reverse(); n = mul(n, -1); } }
      // a warped quad becomes two triangles (every facet must be planar: it gets a flat patch of the atlas)
      if (pts.length === 4) {
        const d = Math.abs(dot(sub(pts[3], pts[0]), norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])))));
        if (d > 0.03) {
          for (const tri of [[pts[0], pts[1], pts[2]], [pts[0], pts[2], pts[3]]]) { const tn = polyNormal(tri); if (len(tn) > 1e-6) L.push({ lp: tri, ln: norm(tn), area: len(tn) / 2 }); }
          continue;
        }
      }
      // long quads are cut into a grid of coplanar pieces: each piece gets its own patch of the atlas, and the plain
      // ones (most of a pole, a wall) fall back to a swatch instead of carrying paint nobody put there
      const mf = this.maxFacet;
      if (pts.length === 4 && mf > 0) {
        const eu = Math.max(len(sub(pts[1], pts[0])), len(sub(pts[2], pts[3]))), ev = Math.max(len(sub(pts[3], pts[0])), len(sub(pts[2], pts[1])));
        const nu = Math.min(12, Math.ceil(eu / mf)), nv = Math.min(12, Math.ceil(ev / mf));
        if (nu > 1 || nv > 1) {
          const at = (a, b) => { const p = [0, 0, 0]; for (let k = 0; k < 3; k++) p[k] = lerp(lerp(pts[0][k], pts[1][k], a), lerp(pts[3][k], pts[2][k], a), b); return p; };
          for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
            const q = [at(i / nu, j / nv), at((i + 1) / nu, j / nv), at((i + 1) / nu, (j + 1) / nv), at(i / nu, (j + 1) / nv)], qn = polyNormal(q);
            if (len(qn) > 1e-7) L.push({ lp: q, ln: n, area: len(qn) / 2 });
          }
          continue;
        }
      }
      L.push({ lp: pts, ln: n, area });
    }
    // softened normals: average over the facets meeting at a point that are within the crease angle
    const cosC = Math.cos(this.crease * Math.PI / 180), soft = this.soft;
    const at = new Map();
    const key = (p) => `${Math.round(p[0] * 200)},${Math.round(p[1] * 200)},${Math.round(p[2] * 200)}`;
    if (soft > 0) for (const f of L) for (const p of f.lp) { const k = key(p); let a = at.get(k); if (!a) at.set(k, a = []); a.push(f); }
    const nm = new THREE.Matrix3().getNormalMatrix(this.m), flip = this.m.determinant() < 0;
    const v = new THREE.Vector3();
    for (const f of L) {
      const vn = f.lp.map((p) => {
        if (soft <= 0) return f.ln;
        let s = [0, 0, 0];
        for (const g of at.get(key(p))) if (dot(g.ln, f.ln) >= cosC) s = add(s, mul(g.ln, g.area));
        s = norm(s);
        return norm([lerp(f.ln[0], s[0], soft), lerp(f.ln[1], s[1], soft), lerp(f.ln[2], s[2], soft)]);
      });
      let p = f.lp.map((q) => { v.set(q[0], q[1], q[2]).applyMatrix4(this.m); return [v.x, v.y, v.z]; });
      let wn = vn.map((q) => { v.set(q[0], q[1], q[2]).applyMatrix3(nm).normalize(); return [v.x, v.y, v.z]; });
      let lp = f.lp;
      if (flip) { p = p.slice().reverse(); wn = wn.slice().reverse(); lp = lp.slice().reverse(); }
      this.facets.push({ p, lp, ln: f.ln, vn: wn, layers: this.layers, slot: this.slot, part: this.partName, dens: this.dens });
    }
    return this;
  }

  /**
   * A smooth surface as a grid of points: rows[j][i] (local mm), nv + 1 rows of nu + 1 points (nu when closedU: the
   * rows wrap round). The whole grid shares one patch of the atlas (src/figures/bake.js), so paint runs across it
   * without seams and filtering stays clean; normals are smooth except across creases. o.hint: an outward direction
   * (or (cell points) -> direction) to orient it.
   */
  grid(rows, o = {}) {
    const closed = !!o.closedU, nv = rows.length - 1, nu = closed ? rows[0].length : rows[0].length - 1;
    if (nv < 1 || nu < 1) return this;
    const at = (j, i) => rows[j][closed ? i % nu : i], cells = [];
    let flip = o.flip ?? null;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const q = [at(j, i), at(j, i + 1), at(j + 1, i + 1), at(j + 1, i)], n = polyNormal(q), a = len(n) / 2, c = { i, j, lp: q, ln: norm(n), area: a, dead: a < 1e-7 };
      if (flip === null && !c.dead && o.hint) flip = dot(c.ln, typeof o.hint === 'function' ? o.hint(q) : o.hint) < 0;
      cells.push(c);
    }
    if (flip) for (const c of cells) c.ln = mul(c.ln, -1);
    const cosC = Math.cos(this.crease * Math.PI / 180), soft = this.soft, by = new Map();
    const key = (p) => `${Math.round(p[0] * 200)},${Math.round(p[1] * 200)},${Math.round(p[2] * 200)}`;
    if (soft > 0) for (const c of cells) if (!c.dead) for (const p of c.lp) { const k = key(p); let a = by.get(k); if (!a) by.set(k, a = new Set()); a.add(c); }
    const nm = new THREE.Matrix3().getNormalMatrix(this.m), v = new THREE.Vector3();
    for (const c of cells) {
      c.p = c.lp.map((q) => { v.set(q[0], q[1], q[2]).applyMatrix4(this.m); return [v.x, v.y, v.z]; });
      c.vn = c.lp.map((p) => {
        let s = c.ln;
        if (soft > 0 && !c.dead) { s = [0, 0, 0]; for (const g of by.get(key(p))) if (dot(g.ln, c.ln) >= cosC) s = add(s, mul(g.ln, g.area)); s = norm(s); if (soft < 1) s = norm([lerp(c.ln[0], s[0], soft), lerp(c.ln[1], s[1], soft), lerp(c.ln[2], s[2], soft)]); }
        v.set(s[0], s[1], s[2]).applyMatrix3(nm).normalize();
        return [v.x, v.y, v.z];
      });
    }
    this.patches.push({ nu, nv, closed, cells, layers: this.layers, slot: this.slot, part: this.partName, dens: this.dens });
    return this;
  }

  // ---- primitives
  /**
   * A solid of revolution about the y axis. prof: [[r, y], ...] running up the outside (and back down the inside of an
   * open vessel): the surface faces the right of the direction of travel. o: segs, sx / sz (squash), a0, cap (close
   * open ends with flat faces: true | 'top' | 'bottom' | false), arc ([a0, a1]: a partial turn), at ([x, y, z]: where the
   * axis stands; no frame of its own, so paint coordinates stay those of the frame you are in).
   */
  lathe(prof, o = {}) {
    const segs = N(o.segs ?? 12), sx = o.sx ?? 1, sz = o.sz ?? 1;
    const arc = o.arc || null, a0 = arc ? arc[0] : o.a0 ?? (Math.PI / 2 - Math.PI / segs), span = arc ? arc[1] - arc[0] : Math.PI * 2;
    const c = o.at || [0, 0, 0];
    const P = (r, y, a) => [c[0] + Math.cos(a) * r * sx, c[1] + y, c[2] + Math.sin(a) * r * sz];
    // a row of the profile at every height where the paint changes (band / below / above): two-tone lines are real edges
    const ys = [...new Set(this.layers.flatMap((l) => l.cutsY || []))].map((y) => y - c[1]);
    if (ys.length) {
      const cut = [prof[0]];
      for (let k = 0; k + 1 < prof.length; k++) {
        const [r0, y0] = prof[k], [r1, y1] = prof[k + 1];
        const inside = ys.filter((y) => (y - y0) * (y - y1) < -1e-6).sort((a, b) => (y1 > y0 ? a - b : b - a));
        for (const y of inside) cut.push([r0 + (r1 - r0) * (y - y0) / (y1 - y0), y]);
        cut.push(prof[k + 1]);
      }
      prof = cut;
    }
    const rows = prof.map(([r, y]) => { const row = []; for (let s2 = 0; s2 < (arc ? segs + 1 : segs); s2++) row.push(P(r, y, a0 + (s2 / segs) * span)); return row; });
    // travelling up the profile with the surface on the right: outward is (dy, -dr) swept round
    let hint = null;
    for (let k = 0; k + 1 < prof.length && !hint; k++) { const dr = prof[k + 1][0] - prof[k][0], dy = prof[k + 1][1] - prof[k][1]; if (Math.hypot(dr, dy) > 1e-6 && Math.max(prof[k][0], prof[k + 1][0]) > 1e-6) { const am = a0 + (0.5 / segs) * span; hint = [Math.cos(am) * dy * sz, -dr * sx * sz, Math.sin(am) * dy * sx]; } }
    this.grid(rows, { closedU: !arc, hint });
    const cap = o.cap ?? true, first = prof[0], last = prof[prof.length - 1];
    const ringAt = (r, y) => Array.from({ length: segs }, (_, s2) => P(r, y, a0 + (s2 / segs) * span));
    if (!arc) {
      if (first[0] > 1e-6 && (cap === true || cap === 'bottom')) this.emit([ringAt(first[0], first[1])], [0, -1, 0]);
      if (last[0] > 1e-6 && (cap === true || cap === 'top')) this.emit([ringAt(last[0], last[1])], [0, 1, 0]);
    }
    return this;
  }

  /** An ellipsoid: centre c, radii r (number or [rx, ry, rz]). o: segs, rings, v0 / v1 (cut: 0 = south pole, 1 = north), cap. */
  ball(c, r, o = {}) {
    const [rx, ry, rz] = typeof r === 'number' ? [r, r, r] : r, rings = N(o.rings ?? 7), v0 = o.v0 ?? 0, v1 = o.v1 ?? 1;
    const prof = [];
    for (let i = 0; i <= rings; i++) { const ph = (v0 + (v1 - v0) * (i / rings)) * Math.PI; prof.push([Math.max(0, Math.sin(ph)), -Math.cos(ph) * ry]); }
    const k = QUAL.k; QUAL.k = 1; try { return this.lathe(prof, { segs: N2(o.segs ?? 12, k), sx: rx, sz: rz, cap: o.cap ?? true, a0: o.a0, at: c }); } finally { QUAL.k = k; }
  }

  /** Skin through rings of equal point counts (see ring()). o.caps: 'both' | 'start' | 'end' | 'none'. */
  loft(rings, o = {}) {
    const caps = o.caps ?? 'both';
    const cs = rings.map(centroid);
    this.grid(rings, { closedU: true, hint: (q) => sub(centroid(q), mul(add(cs[0], cs[1]), 0.5)) });
    if (caps === 'both' || caps === 'start') this.emit([rings[0]], sub(cs[0], cs[1]));
    if (caps === 'both' || caps === 'end') this.emit([rings[rings.length - 1]], sub(cs[cs.length - 1], cs[cs.length - 2]));
    return this;
  }

  /**
   * A tube swept along a path. r: radius (number, [r per point] or (t) -> r); a zero radius at an end makes a point.
   * o: sides, caps, flat ([wide, thin] scale of the section: ribbons, noodles), roll (radians).
   */
  tube(path, r, o = {}) {
    const sides = N(o.sides ?? 6), n = path.length, fl = o.flat || [1, 1];
    const R = (i) => (typeof r === 'function' ? r(i / (n - 1)) : Array.isArray(r) ? r[i] : r);
    const tan = (i) => norm(sub(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)]));
    // parallel-transport frame
    let t = tan(0), u = norm(cross(Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], t)), w = cross(t, u);
    if (o.roll) { const c = Math.cos(o.roll), s = Math.sin(o.roll); [u, w] = [add(mul(u, c), mul(w, s)), add(mul(w, c), mul(u, -s))]; }
    const rings = [];
    for (let i = 0; i < n; i++) {
      const t2 = tan(i), ax = cross(t, t2), sl = len(ax);
      if (sl > 1e-6) {
        const ang = Math.atan2(sl, dot(t, t2));
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...norm(ax)), ang);
        const uu = new THREE.Vector3(...u).applyQuaternion(q), ww = new THREE.Vector3(...w).applyQuaternion(q);
        u = [uu.x, uu.y, uu.z]; w = [ww.x, ww.y, ww.z];
      }
      t = t2;
      const rr = R(i), ringP = [];
      for (let k = 0; k < sides; k++) { const a = (k / sides) * Math.PI * 2 + Math.PI / sides; ringP.push(add(path[i], add(mul(u, Math.cos(a) * rr * fl[0]), mul(w, Math.sin(a) * rr * fl[1])))); }
      rings.push(ringP);
    }
    this.grid(rings, { closedU: true, hint: (q) => sub(centroid(q), mul(add(path[0], path[1]), 0.5)) });
    if (o.caps !== false) {
      if (R(0) > 1e-6) this.emit([rings[0]], mul(tan(0), -1));
      if (R(n - 1) > 1e-6) this.emit([rings[n - 1]], tan(n - 1));
    }
    return this;
  }

  /** A chamfered box (bevel in mm). */
  box(x0, y0, z0, x1, y1, z1, o = {}) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    const b = Math.min(o.bevel || 0, (x1 - x0) / 2.01, (y1 - y0) / 2.01, (z1 - z0) / 2.01);
    const c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], out = (pts) => sub(centroid(pts), c);
    const X = [x0, x0 + b, x1 - b, x1], Y = [y0, y0 + b, y1 - b, y1], Z = [z0, z0 + b, z1 - b, z1];
    const polys = [
      [[x1, Y[1], Z[1]], [x1, Y[2], Z[1]], [x1, Y[2], Z[2]], [x1, Y[1], Z[2]]], [[x0, Y[1], Z[1]], [x0, Y[1], Z[2]], [x0, Y[2], Z[2]], [x0, Y[2], Z[1]]],
      [[X[1], y1, Z[1]], [X[1], y1, Z[2]], [X[2], y1, Z[2]], [X[2], y1, Z[1]]], [[X[1], y0, Z[1]], [X[2], y0, Z[1]], [X[2], y0, Z[2]], [X[1], y0, Z[2]]],
      [[X[1], Y[1], z1], [X[2], Y[1], z1], [X[2], Y[2], z1], [X[1], Y[2], z1]], [[X[1], Y[1], z0], [X[1], Y[2], z0], [X[2], Y[2], z0], [X[2], Y[1], z0]],
    ];
    if (b > 0) {
      for (const [yy, zz, ya, za] of [[y0, z0, Y[1], Z[1]], [y1, z0, Y[2], Z[1]], [y1, z1, Y[2], Z[2]], [y0, z1, Y[1], Z[2]]]) polys.push([[X[1], yy, za], [X[2], yy, za], [X[2], ya, zz], [X[1], ya, zz]]);
      for (const [xx, zz, xa, za] of [[x0, z0, X[1], Z[1]], [x1, z0, X[2], Z[1]], [x1, z1, X[2], Z[2]], [x0, z1, X[1], Z[2]]]) polys.push([[xx, Y[1], za], [xx, Y[2], za], [xa, Y[2], zz], [xa, Y[1], zz]]);
      for (const [xx, yy, xa, ya] of [[x0, y0, X[1], Y[1]], [x1, y0, X[2], Y[1]], [x1, y1, X[2], Y[2]], [x0, y1, X[1], Y[2]]]) polys.push([[xx, ya, Z[1]], [xx, ya, Z[2]], [xa, yy, Z[2]], [xa, yy, Z[1]]]);
      for (const sx of [0, 1]) for (const sy of [0, 1]) for (const sz of [0, 1]) polys.push([[sx ? x1 : x0, sy ? Y[2] : Y[1], sz ? Z[2] : Z[1]], [sx ? X[2] : X[1], sy ? y1 : y0, sz ? Z[2] : Z[1]], [sx ? X[2] : X[1], sy ? Y[2] : Y[1], sz ? z1 : z0]]);
    }
    const skip = o.skip || [];
    const face = (pts) => { const n = norm(polyNormal(pts)); const a = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])]; const d = out(pts); return a[0] > 0.99 ? (d[0] > 0 ? 'px' : 'nx') : a[1] > 0.99 ? (d[1] > 0 ? 'py' : 'ny') : a[2] > 0.99 ? (d[2] > 0 ? 'pz' : 'nz') : ''; };
    return this.emit(skip.length ? polys.filter((q) => !skip.includes(face(q))) : polys, out);
  }

  /** A cylinder / cone frustum along y from (c) up by h. r: radius or [bottom, top]. o: segs, bevel (chamfered rims), cap. */
  cyl(c, r, h, o = {}) {
    const [rb, rt] = Array.isArray(r) ? r : [r, r], b = Math.min(o.bevel ?? Math.min(0.5, h * 0.2), h / 2.01, Math.min(rb, rt) * 0.9);
    const prof = b > 0 ? [[rb - b, 0], [rb, b], [rt, h - b], [rt - b, h]] : [[rb, 0], [rt, h]];
    if (o.hollow) return this.lathe([[rb, 0], [rt, h], [rt - o.hollow, h], [rb - o.hollow, 0], [rb, 0]], { segs: o.segs ?? 12, cap: false, sx: o.sx, sz: o.sz, at: c });
    return this.lathe(prof, { segs: o.segs ?? 12, cap: o.cap ?? true, sx: o.sx, sz: o.sz, a0: o.a0, at: c });
  }
  /** A cone along y: base radius r at c, the tip h above. */
  cone(c, r, h, o = {}) { return this.lathe([[r, 0], [o.tip ?? 0, h]], { segs: o.segs ?? 10, cap: o.cap ?? true, sx: o.sx, sz: o.sz, at: c }); }

  /**
   * A flat outline [[x, y], ...] (counter-clockwise) extruded from z0 to z1. o.bevel chamfers the front and back rims,
   * o.back / o.front: false leaves that face out.
   */
  extrude(outline, z0, z1, o = {}) {
    if (z0 > z1) [z0, z1] = [z1, z0];
    let a = 0;
    for (let i = 0; i < outline.length; i++) { const p = outline[i], q = outline[(i + 1) % outline.length]; a += p[0] * q[1] - q[0] * p[1]; }
    const pts = a < 0 ? outline.slice().reverse() : outline, n = pts.length, b = Math.min(o.bevel || 0, (z1 - z0) / 2.01);
    // inset outline for the bevelled faces (towards the centroid: fine for the convex-ish shapes used here)
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; }
    cx /= n; cy /= n;
    const inset = b > 0 ? pts.map((p) => { const d = Math.hypot(p[0] - cx, p[1] - cy) || 1, k = Math.max(0, 1 - b / d); return [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]; }) : pts;
    const F = inset.map((p) => [p[0], p[1], z1]), Bk = inset.map((p) => [p[0], p[1], z0]);
    if (o.front !== false) this.emit([F], [0, 0, 1]);
    if (o.back !== false) this.emit([Bk], [0, 0, -1]);
    const c3 = [cx, cy, (z0 + z1) / 2], polys = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, e = [pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]], h = [e[1], -e[0], 0];
      if (b > 0) {
        polys.push({ pts: [[pts[i][0], pts[i][1], z0 + b], [pts[j][0], pts[j][1], z0 + b], [pts[j][0], pts[j][1], z1 - b], [pts[i][0], pts[i][1], z1 - b]], hint: h });
        for (const [zz, E] of [[z1 - b, F], [z0 + b, Bk]]) { const q = [[pts[i][0], pts[i][1], zz], [pts[j][0], pts[j][1], zz], E[j], E[i]]; polys.push({ pts: q, hint: sub(centroid(q), c3) }); }
      } else polys.push({ pts: [[pts[i][0], pts[i][1], z0], [pts[j][0], pts[j][1], z0], [pts[j][0], pts[j][1], z1], [pts[i][0], pts[i][1], z1]], hint: h });
    }
    return this.emit(polys);
  }

  /** A torus in the xz plane (lying flat): ring radius R, tube radius r. o: segs, sides, arc ([a0, a1]). */
  torus(c, R, r, o = {}) {
    const segs = N(o.segs ?? 12), sides = N(o.sides ?? 6), arc = o.arc || [0, Math.PI * 2], closed = !o.arc, path = [];
    const n = closed ? segs : segs + 1;
    for (let i = 0; i < n; i++) { const a = arc[0] + (i / segs) * (arc[1] - arc[0]); path.push([c[0] + Math.cos(a) * R, c[1], c[2] + Math.sin(a) * R]); }
    if (!closed) { const k = QUAL.k; QUAL.k = 1; try { return this.tube(path, r, { sides, caps: o.caps }); } finally { QUAL.k = k; } }
    const rings = path.map((p, i) => {
      const a = arc[0] + (i / segs) * (arc[1] - arc[0]), out = [Math.cos(a), 0, Math.sin(a)], ringP = [];
      for (let k = 0; k < sides; k++) { const b = (k / sides) * Math.PI * 2 + Math.PI / sides; ringP.push(add(p, add(mul(out, Math.cos(b) * r), [0, Math.sin(b) * r * (o.sy ?? 1), 0]))); }
      return ringP;
    });
    return this.grid([...rings, rings[0]], { closedU: true, hint: (q) => sub(centroid(q), path[0]) });
  }

  /** Bounds of the figure in its resting pose (mm). */
  bounds() {
    const b = new THREE.Box3(), v = new THREE.Vector3(), rest = {};
    for (const k of Object.keys(this.parts)) rest[k] = this.jointMatrix(k);
    const eat = (pts, part) => { for (const p of pts) { v.set(p[0], p[1], p[2]); if (part) v.applyMatrix4(rest[part]); b.expandByPoint(v); } };
    for (const f of this.facets) eat(f.p, f.part);
    for (const g of this.patches) for (const c of g.cells) eat(c.p, g.part);
    return b;
  }
}
