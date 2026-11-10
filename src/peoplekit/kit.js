// The people kit: smooth, detailed modelling helpers for everything people wear and carry (hats, hoods, masks,
// glasses, bags, tails, the yokai). Pieces are authored by hand from these parts and merged into one BufferGeometry per
// piece, one group per material (a few draw calls each), with smooth normals where the real thing is smooth and hard
// edges where it has them. Colours are vertex colours (clean cartoon paint); the surfaces carry the grain of a real
// photo (src/kit/photoTex.js tiles, desaturated and flattened into a neutral detail map, so the paint keeps its colour).
//
//   const K = new Kit()                        units are the caller's (head units: 1 = 1/20 head; metric: metres)
//   K.mat = MAT.cloth; K.col = 0xc8302a        the current material and colour (or pass { mat, col } per part)
//   K.at([x, y, z], [rx, ry, rz], s) ... K.end() a transform for the parts in between (nests)
//   K.grid(nu, nv, P(i, j), o)                 the core: a smooth parametric patch (wrapU / flip / out / col)
//   K.lathe(profile, o)  K.tube(path, r, o)  K.blob(c, r, o)  K.slab(outline, depth, o)  K.sweep(path, section, o)
//   K.shell(o)  K.band(o)                      head-hugging caps / hoods and bands (head units, see HEAD)
//   K.sculpt(sdf, box, cell, o)                organic forms from a signed distance (surface nets, smooth unions)
//   K.build() -> BufferGeometry                (userData.kit = true: src/people/cosmetics.js gives it kitMaterials())
//   kitMaterials(variant)                       'normal' | 'self' (yokai: faintly self-lit after dark) | 'indoor'
import * as THREE from 'three';
import { PHOTO_TEX } from '../kit/photoTex.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
const _c = new THREE.Color();

// ------------------------------------------------------------------ materials
// name: [photo tile, roughness, metalness, grain contrast, tile scale (x the photo's real size)]
const DEFS = [
  ['cloth', 'canvas_cloth', 0.92, 0, 0.55, 1.6],
  ['knit', 'canvas_cloth', 0.96, 0, 0.9, 5],
  ['straw', 'tatami', 0.88, 0, 0.75, 1.4],
  ['paper', 'paper_old', 0.92, 0, 0.5, 1],
  ['card', 'cardboard', 0.9, 0, 0.6, 1],
  ['plastic', 'steel_painted', 0.42, 0, 0.25, 1],
  ['gloss', 'steel_painted', 0.3, 0, 0.12, 1],
  ['metal', 'steel_painted', 0.3, 1, 0.2, 0.5],
  ['rubber', 'rubber', 0.8, 0, 0.35, 1],
  ['glass', null, 0.06, 0, 0, 1],
  ['matte', null, 0.75, 0, 0, 1],
  ['eye', null, 0.14, 0, 0, 1],
  ['leather', 'rubber', 0.55, 0, 0.4, 0.6],
  ['wood', 'wood_planks', 0.72, 0, 0.6, 0.5],
  ['fur', 'canvas_cloth', 0.97, 0, 0.7, 3],
  ['soft', 'plaster_cream', 0.8, 0, 0.35, 0.4],
];
export const MAT = Object.fromEntries(DEFS.map((d, i) => [d[0], i]));
/** Material indices from here up are a piece's own painted materials (Kit.paint). */
export const PAINT0 = DEFS.length;

const grains = new Map();
/** A neutral detail map from a photo tile: grey, mean 0.5 (linear), contrast k. Fills in when the photo arrives. */
function grainTex(name, k, scale) {
  const key = `${name}|${k}|${scale}`;
  if (grains.has(key)) return grains.get(key);
  const e = PHOTO_TEX[name];
  const S = 256;
  let cv = null;
  if (typeof document !== 'undefined') { cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, S, S); }
  const tex = cv ? new THREE.CanvasTexture(cv) : new THREE.Texture();
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  const m = (e?.metres || 1) * scale;
  tex.repeat.set(1 / m, 1 / m);
  grains.set(key, tex);
  if (cv && e) {
    const img = new Image();
    img.onload = () => {
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, S, S);
      const id = g.getImageData(0, 0, S, S), d = id.data;
      let sum = 0;
      const L = new Float32Array(S * S);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; L[p] = l; sum += l; }
      const mean = sum / (S * S) || 1;
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const v = Math.round(clamp(0.5 + (L[p] / mean - 1) * k * 0.5, 0.05, 0.95) * 255);
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      g.putImageData(id, 0, 0);
      tex.needsUpdate = true;
    };
    img.src = new URL('img/tex/' + e.file, document.baseURI).href;
  }
  return tex;
}

const matSets = new Map();
export const selfLit = { value: 0 };
let INDOOR_CHUNK = null;
/** The kit's shared materials (an array indexed by MAT). variant: 'normal' | 'self' | 'indoor'. */
export function kitMaterials(variant = 'normal') {
  if (matSets.has(variant)) return matSets.get(variant);
  const set = DEFS.map(([name, photo, rough, metal, k, scale]) => {
    const glass = name === 'glass';
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: rough, metalness: metal,
      map: photo ? grainTex(photo, k, scale) : null,
      transparent: glass, opacity: glass ? 0.42 : 1, depthWrite: !glass,
    });
    if (photo) m.color.setScalar(2);
    m.name = 'pk:' + name;
    return patch(m, variant);
  });
  matSets.set(variant, set);
  return set;
}

const painted = new Map();
/** A hand-painted canvas texture (cached by name): draw(ctx, w, h) paints it once. */
export function paintTex(name, w, h, draw) {
  if (painted.has(name)) return painted.get(name);
  let tex;
  if (typeof document !== 'undefined') {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); draw(g, w, h);
    tex = new THREE.CanvasTexture(cv);
  } else tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  painted.set(name, tex);
  return tex;
}
function patch(m, variant) {
  if (variant === 'self') {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uSelf = selfLit;
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uSelf;\nvoid main() {')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * uSelf;');
    };
    m.customProgramCacheKey = () => 'pk-self';
  } else if (variant === 'indoor') {
    INDOOR_CHUNK ||= THREE.ShaderChunk.lights_fragment_begin.replace('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )', '#if 0');
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', INDOOR_CHUNK); };
    m.customProgramCacheKey = () => 'pk-indoor';
  }
  return m;
}
const paintMats = new Map();
/** The material array for a kit geometry (the shared set, plus its own painted materials). */
export function materialsFor(geo, variant = 'normal') {
  const base = kitMaterials(variant), ex = geo.userData.extra;
  if (!ex?.length) return base;
  const key = variant + '|' + ex.map((e) => e.key).join(',');
  if (paintMats.has(key)) return paintMats.get(key);
  const arr = base.concat(ex.map((e) => {
    const m = patch(new THREE.MeshStandardMaterial({ map: e.tex, vertexColors: true, roughness: e.rough, metalness: e.metal || 0 }), variant);
    m.name = 'pk:paint:' + e.key;
    return m;
  }));
  paintMats.set(key, arr);
  return arr;
}

/** A shadow-casting, non-picking mesh of a kit geometry. */
export function kitMesh(geo, variant = 'normal') {
  const m = new THREE.Mesh(geo, materialsFor(geo, variant));
  m.castShadow = true; m.receiveShadow = true; m.raycast = () => {};
  return m;
}

// ------------------------------------------------------------------ small vector helpers
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
export { v3 };

/** Catmull-Rom through points (2D or 3D), `sub` samples per span; closed loops wrap. */
export function smooth(pts, sub = 4, closed = false) {
  const n = pts.length, out = [];
  if (n < 3 || sub <= 1) return pts.map((p) => p.slice());
  const P = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let s = 0; s < sub; s++) {
      const t = s / sub, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}
/** Points round an ellipse / superellipse in 2D (n samples, CCW from +x). e: exponent (2 ellipse, 4+ rounded rect). */
export function oval(rx, ry, n = 32, e = 2, cx = 0, cy = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
    out.push([cx + Math.sign(c) * Math.abs(c) ** (2 / e) * rx, cy + Math.sign(s) * Math.abs(s) ** (2 / e) * ry]);
  }
  return out;
}

// ------------------------------------------------------------------ head frame (head units)
// chin -4, nose 1.8, eyes 6, brows 8, hair line 13.2, crown 16; cranium centre z 2.4, face plane z 10.8. The hair's
// outer surface (what a cap sits on) is the rounded box below; `grow` moves out from it.
export const HEAD = { chin: -4, nose: 1.8, eyes: 6, brows: 8, hair: 13.2, crown: 16, cz: 2.4, face: 10.8, C: [0, 6.2, 2.2], A: [7.5, 10.8, 8.9], R: 4.4 };
export function sdRBox(p, c, a, r) {
  const qx = Math.abs(p[0] - c[0]) - a[0] + r, qy = Math.abs(p[1] - c[1]) - a[1] + r, qz = Math.abs(p[2] - c[2]) - a[2] + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
const headSd = (p) => sdRBox(p, HEAD.C, HEAD.A, HEAD.R);
/** The point at distance `grow` outside the hair surface, along the ray from `from` (default the head centre) in `dir`. */
export function headPt(dir, grow = 0, from = HEAD.C) {
  const d = v3.norm(dir);
  let t = 0;
  for (let k = 0; k < 40; k++) {
    const p = [from[0] + d[0] * t, from[1] + d[1] * t, from[2] + d[2] * t];
    const e = headSd(p) - grow;
    if (Math.abs(e) < 1e-4) break;
    t -= e; // exact SDF: stepping by it never overshoots on the way out
    if (t < 0) t = 0;
  }
  return [from[0] + d[0] * t, from[1] + d[1] * t, from[2] + d[2] * t];
}
/** The z of the hair surface (grown by `grow`) in front of the head at (x, y). */
export function frontZ(x, y, grow = 0) {
  let z = 30;
  for (let k = 0; k < 60; k++) { const e = headSd([x, y, z]) - grow; if (Math.abs(e) < 1e-4) break; z -= e; if (z < HEAD.C[2]) return HEAD.C[2]; }
  return z;
}
/** The head's horizontal contour at height y (grow out from the hair), n points CCW seen from above, from the front. */
export function headRing(y, grow = 0, n = 48, tilt = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, yy = y + tilt * Math.cos(a);
    out.push(headPt([Math.sin(a), 0, Math.cos(a)], grow, [0, yy, HEAD.C[2]]));
  }
  return out;
}

// ------------------------------------------------------------------ SDF helpers (for K.sculpt)
export const sd = {
  sphere: (p, c, r) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r,
  ell(p, c, r) {
    const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2];
    const k0 = Math.hypot(x, y, z), k1 = Math.hypot(x / r[0], y / r[1], z / r[2]);
    return k1 < 1e-9 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
  },
  /** Capsule from a to b, radius ra at a and rb at b (round cone, approximately exact). */
  cone(p, a, b, ra, rb = ra) {
    const ba = v3.sub(b, a), pa = v3.sub(p, a);
    const h = clamp(v3.dot(pa, ba) / (v3.dot(ba, ba) || 1), 0, 1);
    return v3.len(v3.sub(pa, v3.mul(ba, h))) - lerp(ra, rb, h);
  },
  box: (p, c, a, r = 0) => sdRBox(p, c, [a[0], a[1], a[2]], r),
  torus(p, c, R, r) { const q = Math.hypot(p[0] - c[0], p[2] - c[2]) - R; return Math.hypot(q, p[1] - c[1]) - r; },
  /** Smooth union / subtraction / intersection (k: blend radius). */
  u(a, b, k = 0) { if (k <= 0) return Math.min(a, b); const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); },
  cut(a, b, k = 0) { if (k <= 0) return Math.max(a, -b); const h = clamp(0.5 - 0.5 * (a + b) / k, 0, 1); return lerp(a, -b, h) + k * h * (1 - h); },
  and(a, b, k = 0) { if (k <= 0) return Math.max(a, b); const h = clamp(0.5 - 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) + k * h * (1 - h); },
};

// ------------------------------------------------------------------ the builder
export class Kit {
  constructor({ uvk = 0.0115 } = {}) {
    this.parts = [];
    this.mat = MAT.cloth;
    this.col = 0xffffff;
    this.M = null;
    this.stack = [];
    this.uvk = uvk; // metres per unit (texture scale)
  }
  part(mat) { return (this.parts[mat] ||= { p: [], n: [], u: [], c: [], i: [] }); }
  /** A painted material for this piece (paintTex): returns its material index. */
  paint(name, w, h, draw, o = {}) {
    this.extra ||= [];
    let i = this.extra.findIndex((e) => e.key === name);
    if (i < 0) { this.extra.push({ key: name, tex: paintTex(name, w, h, draw), rough: o.rough ?? 0.45, metal: o.metal ?? 0 }); i = this.extra.length - 1; }
    return DEFS.length + i;
  }
  /** Push a transform (position, euler rotation, scale: number or [x, y, z]). */
  at(pos = [0, 0, 0], rot = [0, 0, 0], s = 1) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], rot[3] || 'XYZ')), Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s));
    this.stack.push(this.M);
    this.M = this.M ? this.M.clone().multiply(m) : m;
    return this;
  }
  end() { this.M = this.stack.pop() ?? null; return this; }
  /** Run fn inside a transform. */
  with(pos, rot, s, fn) { this.at(pos, rot, s); try { fn(this); } finally { this.end(); } return this; }

  /**
   * A smooth patch: P(i, j) -> [x, y, z] for i in 0..nu, j in 0..nv (wrapU: i wraps at nu). Normals from the grid
   * (du x dv: outward when u runs CCW round an outward axis and v runs up); o.flip reverses; o.out(p) -> a direction the
   * surface should face (the whole patch flips if most normals disagree). o.col: hex | (p, u, v, n) -> hex.
   */
  grid(nu, nv, P, o = {}) {
    const mat = o.mat ?? this.mat, col = o.col ?? this.col, wrap = !!o.wrapU;
    const W = nu + 1, Hh = nv + 1;
    const pos = new Array(W * Hh);
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) pos[j * W + i] = P(wrap && i === nu ? 0 : i, j);
    const at = (i, j) => pos[j * W + i];
    const nor = new Array(W * Hh);
    const bad = [];
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
      let ia = i - 1, ib = i + 1;
      if (wrap) { if (ia < 0) ia = nu - 1; if (ib > nu) ib = 1; } else { ia = Math.max(0, ia); ib = Math.min(nu, ib); }
      const ja = Math.max(0, j - 1), jb = Math.min(nv, j + 1);
      const du = v3.sub(at(ib, j), at(ia, j)), dv = v3.sub(at(i, jb), at(i, ja));
      const n = v3.cross(du, dv), l = v3.len(n);
      if (l < 1e-9) { bad.push(j * W + i); nor[j * W + i] = null; } else nor[j * W + i] = [n[0] / l, n[1] / l, n[2] / l];
    }
    // degenerate vertices (poles): the mean of the nearest good row
    for (const k of bad) {
      const j = Math.floor(k / W);
      let acc = [0, 0, 0];
      for (const jj of [j + 1, j - 1, j + 2, j - 2]) {
        if (jj < 0 || jj > nv) continue;
        for (let i = 0; i < W; i++) { const n = nor[jj * W + i]; if (n) acc = v3.add(acc, n); }
        if (v3.len(acc) > 1e-6) break;
      }
      nor[k] = v3.len(acc) > 1e-6 ? v3.norm(acc) : [0, 1, 0];
    }
    let flip = !!o.flip;
    if (o.out) {
      let s = 0;
      for (let k = 0; k < pos.length; k += 3) s += Math.sign(v3.dot(nor[k], o.out(pos[k])));
      if (s < 0) flip = !flip;
    }
    // uvs: true distances along u and v (metres via uvk)
    const uv = new Array(W * Hh);
    for (let j = 0; j < Hh; j++) { let u = 0; for (let i = 0; i < W; i++) { if (i) u += v3.len(v3.sub(at(i, j), at(i - 1, j))); uv[j * W + i] = [u, 0]; } }
    for (let i = 0; i < W; i++) { let v = 0; for (let j = 0; j < Hh; j++) { if (j) v += v3.len(v3.sub(at(i, j), at(i, j - 1))); uv[j * W + i][1] = v; } }
    if (o.uv) for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) uv[j * W + i] = o.uv(i, j, uv[j * W + i]);
    const ids = this._emit(pos, nor, uv, mat, o.rawUV ? 1 : this.uvk, (k) => {
      if (typeof col !== 'function') return col;
      const i = k % W, j = Math.floor(k / W);
      return col(pos[k], i / nu, j / nv, nor[k]);
    }, flip);
    const B = this.part(mat), fl = flip !== (this.M ? this.M.determinant() < 0 : false);
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = ids[j * W + i], b = ids[j * W + i + 1], c = ids[(j + 1) * W + i + 1], d = ids[(j + 1) * W + i];
      if (fl) B.i.push(a, c, b, a, d, c); else B.i.push(a, b, c, a, c, d);
    }
    return this;
  }
  /** Push vertices (transformed) into a material's part; returns their indices. */
  _emit(pos, nor, uv, mat, us, colAt, flip) {
    const B = this.part(mat), base = B.p.length / 3, M = this.M;
    const nm = M ? new THREE.Matrix3().getNormalMatrix(M) : null;
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    const ids = new Array(pos.length);
    for (let k = 0; k < pos.length; k++) {
      v.set(pos[k][0], pos[k][1], pos[k][2]); n.set(nor[k][0], nor[k][1], nor[k][2]);
      if (flip) n.negate();
      if (M) { v.applyMatrix4(M); n.applyMatrix3(nm).normalize(); }
      B.p.push(v.x, v.y, v.z); B.n.push(n.x, n.y, n.z);
      B.u.push(uv[k][0] * us, uv[k][1] * us);
      const c = colAt(k);
      _c.setHex(c ?? 0xffffff);
      B.c.push(_c.r, _c.g, _c.b);
      ids[k] = base + k;
    }
    return ids;
  }
  /** Add raw triangles (flat or with given normals), already in local coords. */
  tris(pos, nor, idx, o = {}) {
    const mat = o.mat ?? this.mat, col = o.col ?? this.col;
    const uv = o.uvs || pos.map((p) => [p[0], p[1]]);
    const ids = this._emit(pos, nor, uv, mat, o.rawUV ? 1 : this.uvk, (k) => (typeof col === 'function' ? col(pos[k], 0, 0, nor[k]) : col), false);
    const B = this.part(mat), neg = this.M ? this.M.determinant() < 0 : false;
    for (let t = 0; t < idx.length; t += 3) {
      if (neg) B.i.push(ids[idx[t]], ids[idx[t + 2]], ids[idx[t + 1]]);
      else B.i.push(ids[idx[t]], ids[idx[t + 1]], ids[idx[t + 2]]);
    }
    return this;
  }

  // ---------------------------------------------------------------- primitives
  /**
   * Surface of revolution round y. prof: [[r, y, hard?], ...] listed CCW in the (r, y) half plane for outward normals
   * (bottom-outside up to the top, then back in); a point with hard = 1 starts a new smoothing group (a crisp edge).
   * o: { seg = 32, a0, a1 (partial), sx, sz (oval), sub (Catmull-Rom samples per span), col, mat, twist }
   */
  lathe(prof, o = {}) {
    const seg = o.seg ?? 32, sx = o.sx ?? 1, sz = o.sz ?? 1;
    const full = o.a0 == null;
    const a0 = o.a0 ?? 0, a1 = o.a1 ?? TAU;
    // split at hard corners
    const groups = [];
    let cur = [];
    prof.forEach((p, k) => { cur.push(p); if (p[2] && k > 0 && k < prof.length - 1) { groups.push(cur); cur = [p]; } });
    groups.push(cur);
    for (const g0 of groups) {
      const g = o.sub ? smooth(g0.map((p) => [p[0], p[1]]), o.sub) : g0;
      if (g.length < 2) continue;
      const nu = full ? seg : seg;
      this.grid(nu, g.length - 1, (i, j) => {
        const a = a0 + (a1 - a0) * (i / seg), r = g[j][0];
        const yy = g[j][1];
        const sxj = typeof sx === 'function' ? sx(yy, a) : sx, szj = typeof sz === 'function' ? sz(yy, a) : sz;
        const sh = o.shift ? o.shift(yy) : null;
        return [Math.sin(a) * r * sxj + (sh ? sh[0] : 0), yy, Math.cos(a) * r * szj + (sh ? sh[1] : 0)];
      }, { ...o, wrapU: full });
    }
    return this;
  }
  /** An ellipsoid (centre c, radii r) with an optional deform(p, u, v) -> p. o: { seg, rings, col, mat, flip } */
  blob(c, r, o = {}) {
    const seg = o.seg ?? 24, rings = o.rings ?? Math.max(8, Math.round(seg / 2));
    const R = Array.isArray(r) ? r : [r, r, r];
    return this.grid(seg, rings, (i, j) => {
      const u = (i / seg) * TAU, v = (j / rings) * Math.PI;
      let p = [c[0] + Math.sin(u) * Math.sin(v) * R[0], c[1] - Math.cos(v) * R[1], c[2] + Math.cos(u) * Math.sin(v) * R[2]];
      if (o.deform) p = o.deform(p, i / seg, j / rings);
      return p;
    }, { ...o, wrapU: true });
  }
  /**
   * A tube along a path (points; smoothed with o.sub). r: number | (t) -> radius. o: { sides = 10, ry (section aspect,
   * number or fn), up (a fixed reference for the section's first axis), sq (section squareness: 2 round, 4+ boxy),
   * closed, caps ('round' | 'flat' | null), col (p, around, along), mat, twist }
   */
  tube(path, r, o = {}) {
    let pts = o.sub ? smooth(path, o.sub, !!o.closed) : path.map((p) => p.slice());
    const n = pts.length, closed = !!o.closed, sides = o.sides ?? 10, e = o.sq ?? 2;
    const R = typeof r === 'function' ? r : () => r;
    const RY = typeof o.ry === 'function' ? o.ry : () => (o.ry ?? 1);
    // tangents + frames (parallel transport, or a fixed up)
    const T = pts.map((p, i) => {
      const a = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)], b = closed ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)];
      return v3.norm(v3.sub(b, a));
    });
    const N = [], B = [];
    for (let i = 0; i < n; i++) {
      let nn;
      if (o.up) nn = o.up;
      else if (i === 0) { const t = T[0]; nn = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; }
      else nn = N[i - 1];
      nn = v3.norm(v3.sub(nn, v3.mul(T[i], v3.dot(nn, T[i]))));
      N.push(nn); B.push(v3.cross(T[i], nn));
    }
    // round caps: extra rings past the ends
    const cap = o.caps === 'round' && !closed;
    const rows = [];
    const ts = pts.map((_, i) => (closed ? i / n : i / (n - 1)));
    const capN = cap ? 4 : 0;
    if (cap) for (let k = capN; k >= 1; k--) rows.push({ i: 0, f: Math.cos((k / capN) * Math.PI / 2), off: -Math.sin((k / capN) * Math.PI / 2) });
    for (let i = 0; i < n; i++) rows.push({ i, f: 1, off: 0 });
    if (closed) rows.push({ i: 0, f: 1, off: 0 });
    if (cap) for (let k = 1; k <= capN; k++) rows.push({ i: n - 1, f: Math.cos((k / capN) * Math.PI / 2), off: Math.sin((k / capN) * Math.PI / 2) });
    const sect = (a) => { const c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.abs(c) ** (2 / e), Math.sign(s) * Math.abs(s) ** (2 / e)]; };
    const tw = o.twist || 0;
    const colf = o.col ?? this.col;
    this.grid(sides, rows.length - 1, (k, j) => {
      const row = rows[j], i = row.i, t = ts[i], rr = R(t), ry = RY(t);
      const a = (k / sides) * TAU + tw * t;
      const [cx, cy] = sect(a);
      const base = v3.add(pts[i], v3.mul(T[i], row.off * rr));
      return v3.add(base, v3.add(v3.mul(N[i], cx * rr * row.f), v3.mul(B[i], cy * rr * ry * row.f)));
    }, { ...o, wrapU: true, flip: !!o.flip, col: typeof colf === 'function' ? (p, u, v, nn) => colf(p, u, v, nn) : colf });
    if (o.caps === 'flat' && !closed) {
      for (const [i, dir] of [[0, -1], [n - 1, 1]]) {
        const ring = [], rr = R(ts[i]), ry = RY(ts[i]);
        for (let k = 0; k < sides; k++) { const [cx, cy] = sect((k / sides) * TAU + tw * ts[i]); ring.push(v3.add(pts[i], v3.add(v3.mul(N[i], cx * rr), v3.mul(B[i], cy * rr * ry)))); }
        this.grid(sides, 1, (k, j) => (j ? pts[i] : ring[k % sides]), { ...o, wrapU: true, out: () => v3.mul(T[i], dir), col: typeof colf === 'function' ? (p) => colf(p, 0, ts[i]) : colf });
      }
    }
    return this;
  }
  /**
   * A flat piece with rounded edges: outline (2D, CCW, closed; the outer silhouette in x / y), depth along z (centred
   * on z = 0), edge radius b (<= depth / 2). o: { col, mat, bend(p) -> p (curve it after), faceCol, back: false }
   */
  slab(outline, depth, o = {}) {
    if (THREE.ShapeUtils.isClockWise(outline.map((p) => new THREE.Vector2(p[0], p[1])))) outline = outline.slice().reverse();
    const cx = outline.reduce((s, p) => s + p[0], 0) / outline.length, cy = outline.reduce((s, p) => s + p[1], 0) / outline.length;
    const n = outline.length, b = Math.min(o.b ?? depth * 0.5, depth / 2), h = depth / 2;
    // 2D outward normals (averaged)
    const nrm = outline.map((p, i) => {
      const a = outline[(i - 1 + n) % n], c = outline[(i + 1) % n];
      const t = [c[0] - a[0], c[1] - a[1]], l = Math.hypot(t[0], t[1]) || 1;
      return [t[1] / l, -t[0] / l];
    });
    const inset = outline.map((p, i) => [p[0] - nrm[i][0] * b, p[1] - nrm[i][1] * b]);
    const bend = o.bend || ((p) => p);
    // rim rows: front face edge -> quarter round -> flat side -> quarter round -> back face edge
    const prof = [];
    const q = 3;
    for (let k = 0; k <= q; k++) { const a = (k / q) * Math.PI / 2; prof.push([Math.sin(a) * b, h - b + Math.cos(a) * b]); }
    if (h - b > 1e-4) for (let k = 0; k <= q; k++) { const a = Math.PI / 2 + (k / q) * Math.PI / 2; prof.push([Math.sin(a) * b, -(h - b) + Math.cos(a) * b]); }
    else for (let k = 1; k <= q; k++) { const a = Math.PI / 2 + (k / q) * Math.PI / 2; prof.push([Math.sin(a) * b, Math.cos(a) * b]); }
    this.grid(n, prof.length - 1, (i, j) => {
      const [s, z] = prof[j];
      return bend([inset[i][0] + nrm[i][0] * s, inset[i][1] + nrm[i][1] * s, z]);
    }, { ...o, wrapU: true, out: (p) => [p[0] - cx, p[1] - cy, 0] });
    // faces
    const tri = THREE.ShapeUtils.triangulateShape(inset.map((p) => new THREE.Vector2(p[0], p[1])), []);
    for (const side of o.back === false ? [1] : [1, -1]) {
      const pos = inset.map((p) => bend([p[0], p[1], side * h]));
      // normals of a bent face: from the bend of a tiny step
      const nor = inset.map((p) => {
        const a = bend([p[0], p[1], side * h]), dx = bend([p[0] + 0.01, p[1], side * h]), dy = bend([p[0], p[1] + 0.01, side * h]);
        const nn = v3.norm(v3.cross(v3.sub(dx, a), v3.sub(dy, a)));
        return side > 0 ? nn : v3.mul(nn, -1);
      });
      const idx = [];
      for (const t of tri) if (side > 0) idx.push(t[0], t[1], t[2]); else idx.push(t[0], t[2], t[1]);
      const fc = (side > 0 ? o.faceCol : o.backCol) ?? o.col ?? this.col;
      const um = side > 0 ? o.uvMap : null;
      this.tris(pos, nor, idx, { ...o, mat: (side > 0 ? o.faceMat : o.backMat) ?? o.mat, col: fc, rawUV: !!um, uvs: inset.map((p) => (um ? um(p[0], p[1]) : [p[0], p[1]])) });
    }
    return this;
  }
  /**
   * A curved plate (a mask, an ear, a leaf, a shell): a star-shaped 2D outline (CCW, dense) in x / y, its mid surface
   * z = f(x, y), thickness th, with a rounded rim. o: { rings = 10, c (centre), col(p, side), mat, backMat, backCol,
   * uvMap(x, y) -> [u, v] (0..1: raw uvs for a painted material), thin (taper the thickness to the rim: 0..1) }
   */
  plate(outline, f, th, o = {}) {
    if (THREE.ShapeUtils.isClockWise(outline.map((p) => new THREE.Vector2(p[0], p[1])))) outline = outline.slice().reverse();
    const n = outline.length, rings = o.rings ?? 10;
    const c = o.c || [outline.reduce((s, p) => s + p[0], 0) / n, outline.reduce((s, p) => s + p[1], 0) / n];
    const xy = (i, j) => { const t = j / rings, q = outline[i % n]; return [c[0] + (q[0] - c[0]) * t, c[1] + (q[1] - c[1]) * t]; };
    const thick = (j) => th * (1 - (o.thin || 0) * (j / rings) ** 2);
    const col = o.col ?? this.col;
    const cf = (side) => (typeof col === 'function' ? (p, u, v, nn) => col(p, side, u, v, nn) : col);
    const uvf = o.uvMap ? (i, j) => o.uvMap(...xy(i, j)) : null;
    const zf = (x, y) => f(x, y);
    // front (+z side) and back
    this.grid(n, rings, (i, j) => { const [x, y] = xy(i, j); return [x, y, zf(x, y) + thick(j) / 2]; }, { ...o, wrapU: true, col: cf('front'), out: () => [0, 0, 1], uv: uvf ? (i, j) => uvf(i, j) : undefined, rawUV: !!uvf });
    if (o.back !== false) this.grid(n, rings, (i, j) => { const [x, y] = xy(i, j); return [x, y, zf(x, y) - thick(j) / 2]; }, { ...o, mat: o.backMat ?? o.mat, wrapU: true, col: o.backCol ?? cf('back'), out: () => [0, 0, -1], uv: undefined, rawUV: false });
    // the rim: half round from front to back, outward in the outline's 2D normal
    const nrm = outline.map((p, i) => { const a = outline[(i - 1 + n) % n], b = outline[(i + 1) % n]; const t = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(t[0], t[1]) || 1; return [t[1] / l, -t[0] / l]; });
    const K = 4, te = thick(rings) / 2;
    this.grid(n, K, (i, k) => {
      const q = outline[i % n], a = (k / K) * Math.PI, z = zf(q[0], q[1]);
      return [q[0] + nrm[i % n][0] * Math.sin(a) * te, q[1] + nrm[i % n][1] * Math.sin(a) * te, z + Math.cos(a) * te];
    }, { ...o, mat: o.rimMat ?? o.mat, wrapU: true, col: o.rimCol ?? cf('rim'), out: (p) => [p[0] - c[0], p[1] - c[1], 0], uv: undefined, rawUV: false });
    return this;
  }
  /**
   * A flat ring between two curves of n points each (inner, outer: 3D, the mid surface's edges), thickness th, rounded
   * edges: brims, flanges, visors. o: { rows = 6, closed = true, shape(p, t, i) -> p (droop / curl), ease(t), up (a
   * hint for the top side, default +y), col(p, side), mat, innerRim = true }
   */
  washer(inner, outer, th, o = {}) {
    const n = inner.length, rows = o.rows ?? 6, closed = o.closed !== false, hint = o.up || [0, 1, 0];
    const I = (i) => (closed ? ((i % n) + n) % n : clamp(i, 0, n - 1));
    const mid = (i, j) => { const t = clamp(j, 0, rows) / rows, tt = o.ease ? o.ease(t) : t; const p = v3.lerp(inner[I(i)], outer[I(i)], tt); return o.shape ? o.shape(p, t, I(i)) : p; };
    const UP = (i, j) => {
      const du = v3.sub(mid(i + 1, j), mid(i - 1, j)), dv = v3.sub(mid(i, j + 1), mid(i, j - 1));
      let u = v3.cross(dv, du);
      if (v3.len(u) < 1e-9) return hint;
      u = v3.norm(u);
      return v3.dot(u, hint) < 0 ? v3.mul(u, -1) : u;
    };
    const nu = closed ? n : n - 1;
    const col = o.col ?? this.col;
    const cf = (side) => (typeof col === 'function' ? (p, u, v, nn) => col(p, side, u, v, nn) : col);
    this.grid(nu, rows, (i, j) => v3.add(mid(i, j), v3.mul(UP(i, j), th / 2)), { ...o, wrapU: closed, col: cf('top'), out: () => hint });
    this.grid(nu, rows, (i, j) => v3.add(mid(i, j), v3.mul(UP(i, j), -th / 2)), { ...o, mat: o.underMat ?? o.mat, wrapU: closed, col: o.underCol ?? cf('under'), out: () => v3.mul(hint, -1) });
    const K = 4;
    for (const [j, sgn] of o.innerRim === false ? [[rows, 1]] : [[rows, 1], [0, -1]]) {
      this.grid(nu, K, (i, k) => {
        const p = mid(i, j), up = UP(i, j);
        let away = v3.sub(mid(i, j), mid(i, j - sgn));
        away = v3.norm(v3.sub(away, v3.mul(up, v3.dot(away, up))));
        const a = (k / K) * Math.PI;
        return v3.add(p, v3.add(v3.mul(up, Math.cos(a) * th / 2), v3.mul(away, Math.sin(a) * th / 2)));
      }, { ...o, wrapU: closed, col: cf(sgn > 0 ? 'edge' : 'inedge'), out: (p) => { const i0 = 0; void i0; return v3.sub(p, inner.reduce((s, q) => v3.add(s, v3.mul(q, 1 / n)), [0, 0, 0])).map((x, k) => x * sgn * (k === 1 ? 0 : 1)); } });
    }
    return this;
  }
  /** Sweep a closed 2D section ([[x, y]...], x along N, y along B) along a path; like tube() with a custom section. */
  sweep(path, section, o = {}) {
    const m = section.length;
    // map the section onto an angle table for tube(): reuse tube with a lookup
    let pts = o.sub ? smooth(path, o.sub, !!o.closed) : path.map((p) => p.slice());
    const n = pts.length, closed = !!o.closed;
    const T = pts.map((p, i) => { const a = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)], b = closed ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)]; return v3.norm(v3.sub(b, a)); });
    const N = [], Bv = [];
    for (let i = 0; i < n; i++) {
      let nn = o.up ? (typeof o.up === 'function' ? o.up(pts[i], i) : o.up) : i ? N[i - 1] : (Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
      nn = v3.norm(v3.sub(nn, v3.mul(T[i], v3.dot(nn, T[i]))));
      N.push(nn); Bv.push(v3.cross(T[i], nn));
    }
    const S = typeof o.scale === 'function' ? o.scale : () => 1;
    const rows = closed ? n + 1 : n;
    let area = 0;
    for (let k = 0; k < m; k++) { const a = section[k], b = section[(k + 1) % m]; area += a[0] * b[1] - b[0] * a[1]; }
    this.grid(m, rows - 1, (k, j) => {
      const i = j % n, s = S(closed ? j / n : j / (n - 1)), [x, y] = section[k % m];
      return v3.add(pts[i], v3.add(v3.mul(N[i], x * s), v3.mul(Bv[i], y * s)));
    }, { ...o, wrapU: true, flip: (area < 0) !== !!o.flip });
    return this;
  }

  // ---------------------------------------------------------------- head pieces (head units)
  /**
   * A shell hugging the head (a cap, a hood, a helmet): outer surface `grow + th` out from the hair, an inner surface at
   * `grow`, joined by a rolled hem round the opening. open(p) -> true where the opening is (p on the shell); the shell
   * grows from `pole` (a direction from the head centre) until it meets the opening. o: { seg, rings, col(p, side),
   * mat, inner (colour of the lining), hem (extra roll radius), pole, centre }
   */
  shell(o) {
    const seg = o.seg ?? 48, rings = o.rings ?? 18, grow = o.grow ?? 0, th = o.th ?? 1, C = o.centre || HEAD.C;
    const P = v3.norm(o.pole || [0, 1, -0.25]);
    const E1 = v3.norm(Math.abs(P[0]) < 0.9 ? v3.cross([1, 0, 0], P) : v3.cross([0, 0, 1], P)), E2 = v3.cross(P, E1);
    const dir = (s, b) => v3.add(v3.mul(P, Math.cos(s)), v3.mul(v3.add(v3.mul(E1, Math.cos(b)), v3.mul(E2, Math.sin(b))), Math.sin(s)));
    const ptAt = (s, b, g) => { const d = dir(s, b); return headPt(d, g + (o.bulge ? o.bulge(v3.norm(d)) : 0), C); };
    const mid = grow + th / 2;
    const smax = [];
    for (let i = 0; i < seg; i++) {
      const b = (i / seg) * TAU;
      let lo = 0, hi = Math.PI, found = false;
      for (let s = 0.05; s <= Math.PI; s += Math.PI / 48) { if (o.open(ptAt(s, b, mid))) { hi = s; found = true; break; } lo = s; }
      if (found) for (let k = 0; k < 10; k++) { const m = (lo + hi) / 2; if (o.open(ptAt(m, b, mid))) hi = m; else lo = m; }
      smax.push(found ? (lo + hi) / 2 : Math.PI * 0.98);
    }
    if (o.smoothRim !== false) for (let pass = 0; pass < 2; pass++) { const c = smax.slice(); for (let i = 0; i < seg; i++) smax[i] = (c[(i - 1 + seg) % seg] + 2 * c[i] + c[(i + 1) % seg]) / 4; }
    const col = o.col ?? this.col;
    const cf = (side) => (typeof col === 'function' ? (p, u, v, n) => col(p, side, u, v, n) : col);
    const outC = (p) => v3.sub(p, C);
    const sOf = (i, j) => smax[i % seg] * Math.pow(j / rings, o.bias ?? 1);
    this.grid(seg, rings, (i, j) => ptAt(sOf(i, j), (i / seg) * TAU, grow + th), { ...o, wrapU: true, col: cf('out'), out: outC });
    if (o.inner !== false) this.grid(seg, rings, (i, j) => ptAt(sOf(i, j), (i / seg) * TAU, grow), { ...o, wrapU: true, col: o.innerCol ?? cf('in'), out: (p) => v3.mul(outC(p), -1), mat: o.innerMat ?? o.mat });
    // the rolled hem
    const K = 6, hr = th / 2 + (o.hem || 0);
    this.grid(seg, K, (i, k) => {
      const b = (i / seg) * TAU, s = smax[i % seg];
      const po = ptAt(s, b, grow + th), pi = ptAt(s, b, grow), m = v3.lerp(po, pi, 0.5);
      const rad = v3.norm(v3.sub(po, pi));
      const ahead = v3.norm(v3.sub(ptAt(s + 0.02, b, mid), ptAt(s - 0.02, b, mid)));
      const tdir = v3.norm(v3.sub(ahead, v3.mul(rad, v3.dot(ahead, rad))));
      const a = (k / K) * Math.PI;
      return v3.add(m, v3.add(v3.mul(rad, Math.cos(a) * hr), v3.mul(tdir, Math.sin(a) * hr * (o.hemOut ?? 0.9))));
    }, { ...o, wrapU: true, col: o.hemCol ?? cf('hem'), out: (p) => outC(p), mat: o.hemMat ?? o.mat });
    this._rim = { smax, ptAt, dir, seg, grow, th };
    return this;
  }
  /** Points along the last shell's opening (at offset `off` outward from its mid surface), n samples. */
  rim(n = 48, off = 0, back = 0) {
    const R = this._rim; if (!R) return [];
    const out = [];
    for (let k = 0; k < n; k++) {
      const f = (k / n) * R.seg, i = Math.floor(f), t = f - i;
      const s = lerp(R.smax[i % R.seg], R.smax[(i + 1) % R.seg], t) - back, b = (k / n) * TAU;
      out.push(R.ptAt(s, b, R.grow + R.th / 2 + off));
    }
    return out;
  }
  /** A band round the head at height y (centre line), height hh, thickness th, grow out from the hair. */
  band(o) {
    const n = o.seg ?? 56, path = headRing(o.y, (o.grow ?? 0) + (o.th ?? 0.8) / 2, n, o.tilt || 0);
    const hh = o.h ?? 2, th = o.th ?? 0.8;
    const sec = [];
    const q = 4;
    // a flat-faced band with rounded edges: (x: up the head, y: out from it)
    for (let k = 0; k <= q; k++) { const a = (k / q) * Math.PI; sec.push([hh / 2 - th / 2 + Math.sin(a) * th / 2, Math.cos(a) * th / 2]); }
    for (let k = 0; k <= q; k++) { const a = Math.PI + (k / q) * Math.PI; sec.push([-hh / 2 + th / 2 + Math.sin(a) * th / 2, Math.cos(a) * th / 2]); }
    return this.sweep(path, sec, { ...o, closed: true, up: [0, 1, 0] });
  }

  // ---------------------------------------------------------------- organic forms
  /**
   * Polygonise a signed distance field f(p) (negative inside) over box [x0, y0, z0, x1, y1, z1] with cell size `cell`
   * (naive surface nets, vertices projected onto the surface, normals from the gradient). o: { col(p, n), mat }
   */
  sculpt(f, box, cell, o = {}) {
    const [x0, y0, z0, x1, y1, z1] = box;
    const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1, nz = Math.ceil((z1 - z0) / cell) + 1;
    const F = new Float32Array(nx * ny * nz);
    const id = (i, j, k) => (k * ny + j) * nx + i;
    // narrow band: a coarse grid (4 cells a step) first; only coarse cells the surface can pass through are refined
    const S = 4, C = cell * S, cx = Math.ceil((nx - 1) / S) + 1, cy = Math.ceil((ny - 1) / S) + 1, cz = Math.ceil((nz - 1) / S) + 1;
    const G = new Float32Array(cx * cy * cz), gid = (i, j, k) => (k * cy + j) * cx + i;
    for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) G[gid(i, j, k)] = f([x0 + i * C, y0 + j * C, z0 + k * C]);
    const done = new Uint8Array(nx * ny * nz);
    for (let K2 = 0; K2 < cz - 1; K2++) for (let J = 0; J < cy - 1; J++) for (let I = 0; I < cx - 1; I++) {
      let mn = Infinity, sg = 0;
      for (let c = 0; c < 8; c++) { const v = G[gid(I + (c & 1), J + ((c >> 1) & 1), K2 + (c >> 2))]; mn = Math.min(mn, Math.abs(v)); sg += v; }
      const near = mn < C * 0.9;
      for (let k = K2 * S; k <= Math.min(nz - 1, K2 * S + S); k++) for (let j = J * S; j <= Math.min(ny - 1, J * S + S); j++) for (let i = I * S; i <= Math.min(nx - 1, I * S + S); i++) {
        const q = id(i, j, k);
        if (done[q] === 2) continue;
        if (near) { F[q] = f([x0 + i * cell, y0 + j * cell, z0 + k * cell]); done[q] = 2; }
        else if (!done[q]) { F[q] = sg < 0 ? -C : C; done[q] = 1; }
      }
    }
    const grad = (p) => {
      const e = cell * 0.35;
      return v3.norm([f([p[0] + e, p[1], p[2]]) - f([p[0] - e, p[1], p[2]]), f([p[0], p[1] + e, p[2]]) - f([p[0], p[1] - e, p[2]]), f([p[0], p[1], p[2] + e]) - f([p[0], p[1], p[2] - e])]);
    };
    const vid = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
    const cid = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i;
    const pos = [], nor = [];
    const E = [[0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 1, 0], [0, 0, 1, 1, 0, 1], [0, 1, 1, 1, 1, 1], [0, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0], [0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1], [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 1, 1], [1, 1, 0, 1, 1, 1]];
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let sx = 0, sy = 0, sz = 0, cnt = 0;
      for (const e of E) {
        const a = F[id(i + e[0], j + e[1], k + e[2])], b = F[id(i + e[3], j + e[4], k + e[5])];
        if ((a < 0) === (b < 0)) continue;
        const t = a / (a - b);
        sx += e[0] + (e[3] - e[0]) * t; sy += e[1] + (e[4] - e[1]) * t; sz += e[2] + (e[5] - e[2]) * t; cnt++;
      }
      if (!cnt) continue;
      let p = [x0 + (i + sx / cnt) * cell, y0 + (j + sy / cnt) * cell, z0 + (k + sz / cnt) * cell];
      const g0 = grad(p);
      p = v3.sub(p, v3.mul(g0, f(p)));
      vid[cid(i, j, k)] = pos.length;
      pos.push(p); nor.push(grad(p));
    }
    const idx = [];
    const quad = (a, b, c, d, sgn) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      const q = sgn ? [a, b, c, d] : [a, d, c, b];
      // the shorter diagonal
      if (v3.len(v3.sub(pos[q[0]], pos[q[2]])) <= v3.len(v3.sub(pos[q[1]], pos[q[3]]))) idx.push(q[0], q[1], q[2], q[0], q[2], q[3]);
      else idx.push(q[0], q[1], q[3], q[1], q[2], q[3]);
    };
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = F[id(i, j, k)], b = F[id(i + 1, j, k)]; if ((a < 0) === (b < 0)) continue;
      quad(vid[cid(i, j - 1, k - 1)], vid[cid(i, j, k - 1)], vid[cid(i, j, k)], vid[cid(i, j - 1, k)], a < 0);
    }
    for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const a = F[id(i, j, k)], b = F[id(i, j + 1, k)]; if ((a < 0) === (b < 0)) continue;
      quad(vid[cid(i - 1, j, k - 1)], vid[cid(i - 1, j, k)], vid[cid(i, j, k)], vid[cid(i, j, k - 1)], a < 0);
    }
    for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const a = F[id(i, j, k)], b = F[id(i, j, k + 1)]; if ((a < 0) === (b < 0)) continue;
      quad(vid[cid(i - 1, j - 1, k)], vid[cid(i, j - 1, k)], vid[cid(i, j, k)], vid[cid(i - 1, j, k)], a < 0);
    }
    // fix winding against the gradient (robust to the case analysis above)
    for (let t = 0; t < idx.length; t += 3) {
      const A = pos[idx[t]], B = pos[idx[t + 1]], Cc = pos[idx[t + 2]];
      const fn = v3.cross(v3.sub(B, A), v3.sub(Cc, A));
      const nn = v3.add(v3.add(nor[idx[t]], nor[idx[t + 1]]), nor[idx[t + 2]]);
      if (v3.dot(fn, nn) < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
    }
    const uvs = o.uvMap ? pos.map((p) => o.uvMap(p)) : pos.map((p, k) => { const n = nor[k], ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]); return ay > ax && ay > az ? [p[0], p[2]] : ax > az ? [p[2], p[1]] : [p[0], p[1]]; });
    if (o.uvMap) o = { ...o, rawUV: true };
    const col = o.col ?? this.col;
    const mat = o.mat ?? this.mat;
    if (typeof col !== 'function' || !o.mats) return this.tris(pos, nor, idx, { ...o, uvs, col: typeof col === 'function' ? (p, u, v, n) => col(p, n) : col });
    // per-triangle materials: o.mats(p, n) -> material (by the triangle's centre)
    const byMat = new Map();
    for (let t = 0; t < idx.length; t += 3) {
      const c = v3.mul(v3.add(v3.add(pos[idx[t]], pos[idx[t + 1]]), pos[idx[t + 2]]), 1 / 3);
      const m = o.mats(c, nor[idx[t]]) ?? mat;
      if (!byMat.has(m)) byMat.set(m, []);
      byMat.get(m).push(idx[t], idx[t + 1], idx[t + 2]);
    }
    for (const [m, ix] of byMat) this.tris(pos, nor, ix, { ...o, mat: m, uvs, col: (p, u, v, n) => col(p, n) });
    return this;
  }

  /** Stitches: short dashes along a path (dash / gap lengths in units), as thin tubes. */
  stitch(path, r = 0.1, o = {}) {
    const dash = o.dash ?? 0.7, gap = o.gap ?? 0.5;
    const pts = o.sub ? smooth(path, o.sub, !!o.closed) : path;
    const loop = o.closed ? pts.concat([pts[0]]) : pts;
    let acc = 0, on = true, cur = [loop[0]];
    for (let i = 1; i < loop.length; i++) {
      let a = loop[i - 1];
      const b = loop[i];
      let segLen = v3.len(v3.sub(b, a));
      while (segLen > 1e-6) {
        const left = (on ? dash : gap) - acc;
        if (segLen < left) { acc += segLen; if (on) cur.push(b); segLen = 0; }
        else {
          const p = v3.lerp(a, b, left / segLen);
          if (on) { cur.push(p); if (cur.length > 1) this.tube(cur, r, { sides: 4, mat: o.mat ?? MAT.cloth, col: o.col ?? this.col }); }
          else cur = [p];
          on = !on; acc = 0; segLen -= v3.len(v3.sub(p, a)); a = p;
        }
      }
    }
    return this;
  }

  /** The merged geometry (one group per material, in material order). */
  build() {
    const pos = [], nor = [], uv = [], col = [], idx = [];
    const g = new THREE.BufferGeometry();
    let start = 0;
    this.parts.forEach((B, mat) => {
      if (!B || !B.i.length) return;
      const base = pos.length / 3;
      pos.push(...B.p); nor.push(...B.n); uv.push(...B.u); col.push(...B.c);
      for (const i of B.i) idx.push(i + base);
      g.addGroup(start, B.i.length, mat);
      start += B.i.length;
    });
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    g.userData.kit = true;
    if (this.extra?.length) g.userData.extra = this.extra;
    return g;
  }
}

/** Darken (k < 1) or lighten (k > 1) a hex colour. */
export function shade(c, k) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
  return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255);
}
/** Mix two hex colours. */
export function mix(a, b, t) {
  const f = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (f(16) << 16) | (f(8) << 8) | f(0);
}
