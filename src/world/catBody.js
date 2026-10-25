// Mikan's body: a low-poly realistic calico built like the people (src/people) — lofted rings (octagons for the
// trunk and head, hexagons for legs and tail) on a skeleton, smoothly skinned ring by ring, flat-shaded facets and
// one painted atlas (fur flow, tabby ticking in the orange, white bib / belly / socks, a painted face block).
// Rest pose = standing, facing +z, metres, paws on y = 0; +x is the cat's LEFT. Bones start with identity rotations.
import * as THREE from 'three';
import { Pix } from '../gfx/pix.js';

export const CAT_ATLAS = 512;
const PAD = 1;

// [bone, parent, rest joint position]
const B = [
  ['hips', null, [0, 0.155, -0.1]], ['spine', 'hips', [0, 0.158, -0.01]], ['chest', 'spine', [0, 0.162, 0.08]],
  ['neck', 'chest', [0, 0.182, 0.126]], ['head', 'neck', [0, 0.222, 0.152]], ['jaw', 'head', [0, 0.206, 0.182]],
  ['earL', 'head', [0.02, 0.25, 0.166]], ['earR', 'head', [-0.02, 0.25, 0.166]],
];
for (const [s, x] of [['L', 1], ['R', -1]]) {
  B.push(['arm' + s, 'chest', [x * 0.033, 0.15, 0.098]], ['fore' + s, 'arm' + s, [x * 0.035, 0.086, 0.082]], ['paw' + s, 'fore' + s, [x * 0.035, 0.022, 0.095]]);
  B.push(['thigh' + s, 'hips', [x * 0.039, 0.152, -0.116]], ['shin' + s, 'thigh' + s, [x * 0.043, 0.09, -0.08]], ['meta' + s, 'shin' + s, [x * 0.041, 0.043, -0.153]]);
}
export const TAIL_N = 8, TAIL_SEG = 0.033;
for (let i = 0; i < TAIL_N; i++) B.push(['tail' + i, i ? 'tail' + (i - 1) : 'hips', [0, 0.186, -0.166 - i * TAIL_SEG]]);
// longer legs: the layout below is authored short and warped after texturing (trunk raised, legs stretched)
export const LIFT = 0.018;
const LEGK = 1 + LIFT / 0.15;
const LEGS = /^(arm|fore|paw|thigh|shin|meta)|^leg/;
const warp = (p, leg) => [p[0], leg ? p[1] * LEGK : p[1] + LIFT, p[2]];
export const CAT_BONES = B.map(([n, par, p]) => [n, par, warp(p, LEGS.test(n))]);
export const CAT_JOINT = Object.fromEntries(CAT_BONES.map(([n, , p]) => [n, p]));
// paw contact points (rest): front paw pad under the toes, hind toes
export const FRONT_TOE = [0.035, 0, 0.11], HIND_TOE = [0.041, 0, -0.117];
// face features (rest space, head bone): eye centres, nose
export const EYE = { x: 0.0158, y: 0.2335, hw: 0.0086, hh: 0.0066, tilt: 0.2 };

// ------------------------------------------------------------------ tubes (lofted rings)
// ring: [x, y, z, rx, ry, bones] ; bones: 'name' or [['a', w], ['b', w]]
function tubes() {
  const T = [];
  const body = [
    [0, 0.168, -0.19, 0.022, 0.026, 'hips'], [0, 0.166, -0.178, 0.04, 0.046, 'hips'], [0, 0.161, -0.15, 0.05, 0.056, 'hips'],
    [0, 0.157, -0.11, 0.052, 0.057, 'hips'], [0, 0.153, -0.065, 0.049, 0.055, [['hips', 0.55], ['spine', 0.45]]],
    [0, 0.151, -0.02, 0.048, 0.057, 'spine'], [0, 0.152, 0.025, 0.051, 0.061, [['spine', 0.55], ['chest', 0.45]]],
    [0, 0.155, 0.065, 0.053, 0.063, 'chest'], [0, 0.159, 0.1, 0.048, 0.06, 'chest'], [0, 0.165, 0.127, 0.036, 0.048, 'chest'],
    [0, 0.17, 0.14, 0.018, 0.026, 'chest'],
  ];
  T.push({ part: 'body', sides: 8, off: 0.5, hint: [0, 1, 0], caps: 'both', rings: body });
  T.push({ part: 'neck', sides: 8, off: 0.5, hint: [0, 1, 0], caps: 'none', rings: [
    [0, 0.168, 0.105, 0.036, 0.042, 'chest'], [0, 0.19, 0.138, 0.03, 0.035, [['chest', 0.3], ['neck', 0.7]]], [0, 0.212, 0.155, 0.029, 0.032, [['neck', 0.4], ['head', 0.6]]],
  ] });
  T.push({ part: 'head', sides: 8, off: 0.5, hint: [0, 1, 0], caps: 'both', block: true, rings: [
    [0, 0.229, 0.141, 0.017, 0.019, 'head'], [0, 0.231, 0.151, 0.031, 0.03, 'head'], [0, 0.231, 0.168, 0.037, 0.033, 'head'],
    [0, 0.229, 0.185, 0.035, 0.03, 'head'], [0, 0.226, 0.197, 0.028, 0.025, 'head'], [0, 0.216, 0.207, 0.019, 0.017, 'head'],
    [0, 0.213, 0.215, 0.014, 0.012, 'head'], [0, 0.213, 0.219, 0.008, 0.007, 'head'],
  ] });
  T.push({ part: 'jaw', sides: 6, off: 0, hint: [0, 1, 0], caps: 'end', rings: [
    [0, 0.205, 0.178, 0.017, 0.007, 'jaw'], [0, 0.203, 0.197, 0.013, 0.006, 'jaw'], [0, 0.203, 0.209, 0.008, 0.004, 'jaw'],
  ] });
  for (const sd of [1, -1]) {
    const s = sd > 0 ? 'L' : 'R';
    T.push({ part: 'ear', side: sd, sides: 4, off: 0.5, hint: [0, 0, 1], caps: 'end', rings: [
      [sd * 0.019, 0.247, 0.167, 0.013, 0.006, 'ear' + s], [sd * 0.026, 0.265, 0.165, 0.0085, 0.0045, 'ear' + s], [sd * 0.031, 0.281, 0.162, 0.0012, 0.001, 'ear' + s],
    ] });
    T.push({ part: 'legF', side: sd, sides: 6, off: 0, hint: [0, 0, 1], caps: 'end', rings: [
      [sd * 0.031, 0.165, 0.1, 0.024, 0.03, 'arm' + s], [sd * 0.034, 0.118, 0.092, 0.019, 0.024, 'arm' + s],
      [sd * 0.035, 0.086, 0.083, 0.015, 0.017, [['arm' + s, 0.4], ['fore' + s, 0.6]]], [sd * 0.035, 0.054, 0.089, 0.012, 0.013, 'fore' + s],
      [sd * 0.035, 0.024, 0.095, 0.011, 0.011, [['fore' + s, 0.4], ['paw' + s, 0.6]]], [sd * 0.035, 0.01, 0.104, 0.014, 0.012, 'paw' + s],
      [sd * 0.035, 0.006, 0.116, 0.012, 0.007, 'paw' + s],
    ] });
    T.push({ part: 'legH', side: sd, sides: 6, off: 0, hint: [0, 0, 1], caps: 'end', rings: [
      [sd * 0.036, 0.165, -0.115, 0.027, 0.04, 'thigh' + s], [sd * 0.041, 0.125, -0.099, 0.024, 0.033, 'thigh' + s],
      [sd * 0.043, 0.09, -0.082, 0.015, 0.02, [['thigh' + s, 0.4], ['shin' + s, 0.6]]], [sd * 0.042, 0.066, -0.116, 0.012, 0.016, 'shin' + s],
      [sd * 0.041, 0.043, -0.152, 0.01, 0.012, [['shin' + s, 0.4], ['meta' + s, 0.6]]], [sd * 0.041, 0.022, -0.136, 0.009, 0.01, 'meta' + s],
      [sd * 0.041, 0.009, -0.12, 0.013, 0.011, 'meta' + s], [sd * 0.041, 0.006, -0.107, 0.011, 0.007, 'meta' + s],
    ] });
  }
  const tail = [];
  for (let i = 0; i <= TAIL_N; i++) {
    const r = 0.0155 - i * 0.0011;
    const z = -0.162 - i * TAIL_SEG;
    tail.push([0, 0.186, z, i === TAIL_N ? 0.006 : r, i === TAIL_N ? 0.006 : r, i === 0 ? [['hips', 0.5], ['tail0', 0.5]] : 'tail' + Math.min(TAIL_N - 1, i)]);
  }
  tail.push([0, 0.186, -0.162 - TAIL_N * TAIL_SEG - 0.012, 0.003, 0.003, 'tail' + (TAIL_N - 1)]);
  T.push({ part: 'tail', sides: 6, off: 0, hint: [0, 1, 0], caps: 'end', rings: tail });
  return T;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Faces of one tube: side quads between rings + end caps, each with skin weights per vertex. */
function tubeFaces(t) {
  const R = t.rings, n = t.sides, out = [];
  const verts = R.map((r, i) => {
    const c = [r[0], r[1], r[2]];
    const tg = norm(sub(R[Math.min(R.length - 1, i + 1)].slice(0, 3), R[Math.max(0, i - 1)].slice(0, 3)));
    const a = norm(cross(t.hint, tg)), b = cross(tg, a);
    const w = typeof r[5] === 'string' ? [[r[5], 1]] : r[5];
    const ring = [];
    for (let k = 0; k < n; k++) {
      const th = ((k + t.off) / n) * Math.PI * 2;
      ring.push(add(c, add(mul(a, r[3] * Math.cos(th)), mul(b, r[4] * Math.sin(th)))));
    }
    return { c, tg, ring, w };
  });
  for (let i = 0; i < R.length - 1; i++) {
    const A = verts[i], Bv = verts[i + 1];
    if (R[i + 1][3] < 1e-4) continue;
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      let pts = [A.ring[k], A.ring[k2], Bv.ring[k2], Bv.ring[k]], ws = [A.w, A.w, Bv.w, Bv.w];
      let N = norm(cross(sub(pts[2], pts[0]), sub(pts[3], pts[1])));
      const mid = mul(add(add(pts[0], pts[1]), add(pts[2], pts[3])), 0.25);
      const ax = mul(add(A.c, Bv.c), 0.5), tg = norm(sub(Bv.c, A.c));
      const rel = sub(mid, ax), radial = sub(rel, mul(tg, dot(rel, tg)));
      if (dot(N, radial) < 0) { N = mul(N, -1); pts = [pts[1], pts[0], pts[3], pts[2]]; ws = [ws[1], ws[0], ws[3], ws[2]]; }
      out.push({ tube: t, kind: 'side', pts, ws, N, flow: tg, s: (i + 0.5) / (R.length - 1), tris: [0, 1, 2, 0, 2, 3] });
    }
  }
  const cap = (V, end) => {
    const N = end ? V.tg : mul(V.tg, -1);
    const pts = [...V.ring];
    const tris = [];
    for (let i = 1; i < n - 1; i++) tris.push(0, i, i + 1);
    const w0 = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    if (dot(w0, N) < 0) for (let i = 0; i < tris.length; i += 3) [tris[i + 1], tris[i + 2]] = [tris[i + 2], tris[i + 1]];
    out.push({ tube: t, kind: 'cap', pts, ws: pts.map(() => V.w), N, flow: V.tg, s: end ? 1 : 0, tris });
  };
  if (t.caps === 'both' || t.caps === 'start') cap(verts[0], false);
  if ((t.caps === 'both' || t.caps === 'end') && R[R.length - 1][3] >= 1e-4) cap(verts[R.length - 1], true);
  for (const f of out) {
    // in-plane basis: V along the fur flow (projected), U = V x N; texel rect from the extents
    let V = sub(f.flow, mul(f.N, dot(f.flow, f.N)));
    if (Math.hypot(...V) < 1e-3) V = sub([0, 1, 0], mul(f.N, f.N[1]));
    if (Math.hypot(...V) < 1e-3) V = sub([0, 0, 1], mul(f.N, f.N[2]));
    f.V = norm(V); f.U = norm(cross(f.V, f.N)); f.o = f.pts[0];
    let s0 = Infinity, s1 = -Infinity, r0 = Infinity, r1 = -Infinity;
    for (const p of f.pts) { const d = sub(p, f.o); const u = dot(d, f.U), v = dot(d, f.V); s0 = Math.min(s0, u); s1 = Math.max(s1, u); r0 = Math.min(r0, v); r1 = Math.max(r1, v); }
    Object.assign(f, { s0, s1, r0, r1 });
  }
  return out;
}

/** Skyline bottom-left packing of rectangles ({w, h}); returns false on overflow. */
function pack(rects, W) {
  const sky = new Int16Array(W);
  for (const r of [...rects].sort((a, b) => b.h - a.h || b.w - a.w)) {
    let bx = -1, by = 1e9;
    for (let x = 0; x + r.w <= W; x++) {
      if (!(x === 0 || sky[x] !== sky[x - 1] || x + r.w === W || sky[x + r.w] !== sky[x + r.w - 1])) continue;
      let y = 0;
      for (let i = x; i < x + r.w; i++) if (sky[i] > y) { y = sky[i]; if (y >= by) break; }
      if (y < by) { by = y; bx = x; }
    }
    if (bx < 0 || by + r.h > W) return false;
    r.x = bx; r.y = by;
    for (let i = bx; i < bx + r.w; i++) sky[i] = by + r.h;
  }
  return true;
}

let CACHE = null;
/** Geometry (shared) + painted atlas texture (shared). */
export function catAssets() {
  if (CACHE) return CACHE;
  const faces = [];
  for (const t of tubes()) faces.push(...tubeFaces(t));
  // face block: the head's front-facing facets, planar-projected on x/y and painted as one image
  const FD = 2600;
  const blockFaces = faces.filter((f) => f.tube.block && f.N[2] > 0.42);
  let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
  for (const f of blockFaces) { f.block = true; for (const p of f.pts) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); by1 = Math.max(by1, p[1]); } }
  const block = { x0: bx0, y1: by1, w: Math.ceil((bx1 - bx0) * FD) + 1, h: Math.ceil((by1 - by0) * FD) + 1, dens: FD, faces: blockFaces };
  const blockRect = { w: block.w + PAD * 2, h: block.h + PAD * 2 };
  const loose = faces.filter((f) => !f.block);
  const sizeAt = (f, k) => {
    const p = f.tube.part;
    f.dens = 1000 * k * (p === 'head' || p === 'ear' || p === 'jaw' ? 1.5 : p === 'legF' || p === 'legH' ? 1.1 : 1) * (f.kind === 'side' ? 1 : 0.8);
    f.rect = { w: Math.max(1, Math.ceil((f.s1 - f.s0) * f.dens - 0.01)) + PAD * 2, h: Math.max(1, Math.ceil((f.r1 - f.r0) * f.dens - 0.01)) + PAD * 2 };
  };
  let k = 1.4;
  for (let tries = 0; tries < 80; tries++) {
    const rects = [blockRect];
    for (const f of loose) { sizeAt(f, k); rects.push(f.rect); }
    if (pack(rects, CAT_ATLAS)) break;
    k *= 0.97;
  }
  block.x = blockRect.x + PAD; block.y = blockRect.y + PAD;
  // geometry (flat-shaded facets, smooth skin weights per ring)
  const BI = Object.fromEntries(B.map(([n], i) => [n, i]));
  const pos = [], nrm = [], uv = [], si = [], sw = [], idx = [];
  for (const f of faces) {
    const base = pos.length / 3;
    f.pts.forEach((p, i) => {
      let U, V;
      if (f.block) { U = block.x + (p[0] - block.x0) * block.dens; V = block.y + (block.y1 - p[1]) * block.dens; }
      else { const d = sub(p, f.o); U = f.rect.x + PAD + (dot(d, f.U) - f.s0) * f.dens; V = f.rect.y + PAD + (f.r1 - dot(d, f.V)) * f.dens; }
      const q = warp(p, LEGS.test(f.tube.part));
      pos.push(q[0], q[1], q[2]); nrm.push(f.N[0], f.N[1], f.N[2]); uv.push(U / CAT_ATLAS, 1 - V / CAT_ATLAS);
      const w = f.ws[i];
      si.push(BI[w[0][0]], w[1] ? BI[w[1][0]] : 0, 0, 0); sw.push(w[0][1], w[1] ? w[1][1] : 0, 0, 0);
    });
    for (const t of f.tris) idx.push(base + t);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geometry.setIndex(idx);
  const pix = new Pix(CAT_ATLAS, CAT_ATLAS, 7);
  paint(pix, loose, block);
  const map = pix.texture();
  map.anisotropy = 4;
  CACHE = { geometry, map, block, tris: idx.length / 3, surfaceZ: (x, y) => surfaceZ(blockFaces, x, y) }; // surfaceZ: unwarped head coords
  return CACHE;
}

/** z of the head's front surface at (x, y) (rest), from the face-block facets. */
function surfaceZ(faces, x, y) {
  let best = -Infinity;
  for (const f of faces) {
    // inside test on the xy projection (fan of triangles), then the facet plane's z
    for (let i = 0; i < f.tris.length; i += 3) {
      const a = f.pts[f.tris[i]], b = f.pts[f.tris[i + 1]], c = f.pts[f.tris[i + 2]];
      const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(d) < 1e-12) continue;
      const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d, l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      best = Math.max(best, l1 * a[2] + l2 * b[2] + l3 * c[2]);
    }
  }
  return best;
}

// ------------------------------------------------------------------ the coat
const WHITE = [244, 238, 228], CREAM = [236, 222, 200], ORANGE = [222, 132, 58], ORANGE_D = [178, 92, 38], BLACK = [40, 33, 30], BLACK_H = [70, 58, 52];
const PINK = [232, 150, 156], PINK_D = [178, 92, 104], NOSE = [214, 122, 128];
const h3 = (x, y, z) => { let h = (Math.floor(x) * 374761393 + Math.floor(y) * 668265263 + Math.floor(z) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// smooth value noise
function vn(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => h3(xi + dx, yi + dy, zi + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
const fbm = (x, y, z) => vn(x, y, z) * 0.6 + vn(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vn(x * 4.3, y * 4.3, z * 4.3) * 0.1;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// calico patches: [cx, cy, cz, rx, ry, rz, colour]
const PATCHES = [
  [0.035, 0.215, -0.03, 0.05, 0.055, 0.08, 'k'], [-0.04, 0.2, -0.13, 0.055, 0.07, 0.075, 'o'], [0.045, 0.205, 0.085, 0.04, 0.05, 0.05, 'o'],
  [-0.045, 0.205, 0.05, 0.03, 0.04, 0.04, 'k'], [0.04, 0.17, -0.13, 0.04, 0.05, 0.05, 'o'], [-0.01, 0.225, 0.025, 0.025, 0.03, 0.035, 'o'],
  [0.07, 0.11, -0.1, 0.03, 0.05, 0.04, 'o'], [-0.07, 0.12, -0.09, 0.03, 0.04, 0.04, 'k'], [-0.05, 0.12, 0.09, 0.03, 0.04, 0.03, 'o'],
];

/** Coat colour at rest point P on part `part` (facet normal N, fur flow F). */
function coat(P, N, part, F, side) {
  const [x, y, z] = P;
  let c = 'w';
  const wob = (fbm(x * 60, y * 60, z * 60) - 0.5) * 0.55;
  if (part === 'body' || part === 'neck' || part === 'legF' || part === 'legH') {
    for (const p of PATCHES) {
      const d = ((x - p[0]) / p[3]) ** 2 + ((y - p[1]) / p[4]) ** 2 + ((z - p[2]) / p[5]) ** 2;
      if (d + wob < 1) c = p[6];
    }
    // white belly, bib, socks
    if (y < 0.12 + wob * 0.02 && (part === 'body' || part === 'neck')) c = 'w';
    if ((part === 'body' || part === 'neck') && z > 0.095 && y < 0.185 + wob * 0.02) c = 'w';
    if (part === 'legF' && y < 0.07 + wob * 0.01) c = 'w';
    if (part === 'legH' && y < 0.075 + wob * 0.012) c = 'w';
  } else if (part === 'head' || part === 'ear' || part === 'jaw') {
    // split face: orange on her left, black on her right, a white blaze and muzzle
    c = x + wob * 0.01 > 0 ? 'o' : 'k';
    const blaze = Math.abs(x) < 0.006 + Math.max(0, 0.226 - y) * 0.55 + wob * 0.004;
    if (blaze && z > 0.17) c = 'w';
    if (y < 0.214 + wob * 0.006 && z > 0.16) c = 'w';
    if (part === 'jaw') c = 'w';
    if (z < 0.158 && y < 0.22) c = 'w';
  } else if (part === 'tail') {
    const u = (-0.166 - z) / (TAIL_N * TAIL_SEG);
    c = u > 0.86 ? 'k' : (u > 0.25 && u < 0.42) ? 'k' : 'o';
  }
  let col = c === 'w' ? WHITE : c === 'o' ? ORANGE : BLACK;
  // tabby ticking in the orange: soft bands across the fur flow
  if (c === 'o') {
    const along = part === 'tail' ? z * 210 : (z * 0.4 + y) * 170 + (part === 'head' ? x * 120 : 0);
    const band = Math.sin(along + fbm(x * 90, y * 90, z * 90) * 4);
    col = mix(col, ORANGE_D, Math.max(0, band) ** 2 * 0.55);
  }
  if (c === 'k') col = mix(col, BLACK_H, Math.max(0, N[1]) * 0.25);
  if (c === 'w') col = mix(col, CREAM, Math.max(0, -N[1]) * 0.6 + 0.15);
  return { col, c };
}

/** Fur: strands along the flow (fine noise stretched along F), lighter tips, darker roots underneath. */
function fur(col, P, N, F, c) {
  const [x, y, z] = P;
  // project onto flow / across-flow axes
  const ax = cross(F, N), a = dot(P, F) * 260, b = dot(P, ax) * 1500;
  const strand = vn(a, b, 3.7) * 0.6 + vn(a * 2.3, b * 2.1, 9.1) * 0.4;
  let k = 0.9 + strand * 0.2;
  if (c === 'k') k = 0.82 + strand * 0.38;
  k *= 0.93 + 0.07 * Math.max(0, N[1]) - 0.06 * Math.max(0, -N[1]);
  k *= 0.97 + (h3(x * 2600, y * 2600, z * 2600) - 0.5) * 0.06;
  return scale(col, k);
}

function put(pix, X, Y, c) {
  if (X < 0 || Y < 0 || X >= pix.w || Y >= pix.h) return;
  const i = (Y * pix.w + X) * 4, d = pix.d;
  d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; // Uint8ClampedArray clamps
  pix.dirty = true;
}

function paint(pix, faces, block) {
  pix.rect(0, 0, CAT_ATLAS, CAT_ATLAS, 0x8a6a50);
  for (const f of faces) {
    const part = f.tube.part, r = f.rect;
    for (let Y = r.y; Y < r.y + r.h; Y++) for (let X = r.x; X < r.x + r.w; X++) {
      const du = (X + 0.5 - r.x - PAD) / f.dens + f.s0, dv = f.r1 - (Y + 0.5 - r.y - PAD) / f.dens;
      const P = add(f.o, add(mul(f.U, du), mul(f.V, dv)));
      let { col, c } = coat(P, f.N, part, f.flow, f.tube.side);
      col = fur(col, P, f.N, f.flow, c);
      if (part === 'ear' && f.kind === 'side' && f.N[2] > 0.5) col = earInner(P, f.tube.side, col);
      if ((part === 'legF' || part === 'legH') && P[1] < 0.016 && f.N[1] < -0.2) col = mix(col, PINK_D, 0.55); // pads
      if ((part === 'legF' || part === 'legH') && P[1] < 0.018 && f.N[2] > 0.3) { // toe gaps
        const t = Math.abs(((P[0] - f.tube.side * 0.035) * 360) % 1);
        if (t < 0.12) col = scale(col, 0.72);
      }
      put(pix, X, Y, col);
    }
  }
  paintFace(pix, block);
}

function earInner(P, sd, col) {
  // pink inside with pale tufts at the base and edges
  const [x, y] = P;
  const t = (y - 0.247) / 0.034;
  const edge = Math.abs(x - sd * (0.019 + t * 0.012)) / (0.012 * (1 - t) + 0.001);
  let c = mix(PINK, PINK_D, t * 0.5);
  if (edge > 0.7) c = mix(c, col, 0.6);
  if (t < 0.35 && h3(x * 3000, y * 900, 1) < 0.45) c = mix(c, WHITE, 0.75);
  return c;
}

// the painted face: eye rims (the eyes themselves are meshes), nose leather, mouth, whisker pads
function paintFace(pix, b) {
  const E = EYE;
  for (let Y = 0; Y < b.h; Y++) for (let X = 0; X < b.w; X++) {
    const x = b.x0 + (X + 0.5) / b.dens, y = b.y1 - (Y + 0.5) / b.dens;
    const z = surfaceZ(b.faces, x, y);
    if (!isFinite(z)) { put(pix, b.x + X, b.y + Y, WHITE); continue; }
    const N = [x * 6, 0.3, 1];
    let { col, c } = coat([x, y, z], norm(N), 'head', [0, 1, 0]);
    col = fur(col, [x, y, z], norm(N), [0, 1, 0.2], c);
    const ax = Math.abs(x);
    // eyes: almond rim, dark lining, the tear line down from the inner corner
    const ex = (ax - E.x), ey = (y - E.y) + ex * E.tilt;
    const ed = (ex / (E.hw * 1.12)) ** 2 + (ey / (E.hh * 1.2)) ** 2;
    if (ed < 1) col = mix(col, [25, 18, 16], Math.min(1, (1 - ed) * 6));
    if (ex < -E.hw * 0.6 && ex > -E.hw * 1.15 && y < E.y && y > E.y - 0.0085 && Math.abs(ex + E.hw * 0.85 + (E.y - y) * 0.25) < 0.0009) col = mix(col, [60, 40, 34], 0.6);
    // nose leather: rounded triangle, darker nostrils, the line down to the mouth
    const ny = 0.2162, nx = ax / 0.0058, nyy = (ny - y) / 0.0058;
    if (nyy > -0.55 && nyy < 0.75 && nx < 1 - Math.max(0, nyy) * 0.85) {
      col = NOSE;
      if (nyy > 0.25 && nyy < 0.6 && nx > 0.25 && nx < 0.6) col = PINK_D;
      if (nyy < -0.35) col = mix(NOSE, [240, 170, 170], 0.5);
    }
    if (ax < 0.0006 && y < ny - 0.0042 && y > 0.2085) col = [70, 44, 40];
    // mouth: a soft "w" from under the nose
    const my = 0.2082 - (ax - 0.0045) ** 2 * 60;
    if (ax < 0.009 && Math.abs(y - my) < 0.0006) col = [70, 44, 40];
    // whisker pads: puffy white, rows of little dark dots
    const pd = ((ax - 0.0075) / 0.007) ** 2 + ((y - 0.2105) / 0.004) ** 2;
    if (pd < 1 && col !== NOSE) {
      col = mix(col, WHITE, 0.6);
      for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) {
        const dx = ax - (0.005 + k * 0.0022 + row * 0.0006), dy = y - (0.2118 - row * 0.0016);
        if (dx * dx + dy * dy < 0.00045 ** 2) col = [120, 96, 90];
      }
    }
    put(pix, b.x + X, b.y + Y, col);
  }
}
