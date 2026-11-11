// Signed-distance sculpting for the few props no free library has (src/props: the Shigaraki tanuki, the sandbox
// castle): shapes are SDFs in metres, polygonised with three's MarchingCubes, welded, simplified (meshoptimizer),
// coloured through a small hand-made ramp texture (uv.x = tone along a ramp, uv.y = the ramp's row: a gradient map, so
// the prop library's assetMerged() keeps the colours) and written as a meshopt-compressed GLB like tools/import-asset.mjs.
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { weld, simplify, dedup, prune, quantize, reorder } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';

// ------------------------------------------------------------------ distance functions
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const q = new THREE.Vector3();
export function ellipsoid(p, c, r) {
  const x = (p.x - c[0]) / r[0], y = (p.y - c[1]) / r[1], z = (p.z - c[2]) / r[2], k0 = Math.hypot(x, y, z);
  const k1 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(...r);
}
export const sphere = (p, c, r) => Math.hypot(p.x - c[0], p.y - c[1], p.z - c[2]) - r;
export function capsule(p, a, b, ra, rb = ra) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], pax = p.x - a[0], pay = p.y - a[1], paz = p.z - a[2];
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - (ra + (rb - ra) * h);
}
/** A round box: centre c, half sizes h, rounding r, turned ry about y and rx about x. */
export function rbox(p, c, h, r = 0, ry = 0, rx = 0) {
  q.set(p.x - c[0], p.y - c[1], p.z - c[2]);
  if (ry) q.applyAxisAngle(V(0, 1, 0), -ry);
  if (rx) q.applyAxisAngle(V(1, 0, 0), -rx);
  const dx = Math.abs(q.x) - h[0] + r, dy = Math.abs(q.y) - h[1] + r, dz = Math.abs(q.z) - h[2] + r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dy, dz), 0) - r;
}
/** A capped cone along y from y0 (radius r0) to y1 (radius r1), centred on (cx, cz): the shape of a bucket mould. */
export function cone(p, cx, cz, y0, y1, r0, r1) {
  const d = Math.hypot(p.x - cx, p.z - cz), t = Math.max(0, Math.min(1, (p.y - y0) / (y1 - y0))), r = r0 + (r1 - r0) * t;
  const side = (d - r) * Math.cos(Math.atan2(r0 - r1, y1 - y0)), cap = Math.max(y0 - p.y, p.y - y1);
  return Math.max(side, cap);
}
export function torus(p, c, R, r) { const d = Math.hypot(p.x - c[0], p.z - c[2]) - R; return Math.hypot(d, p.y - c[1]) - r; }
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const smax = (a, b, k) => -smin(-a, -b, k);

// value noise for clay / sand surfaces
const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function noise(x, y, z) {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = x - X, fy = y - Y, fz = z - Z;
  const s = (t) => t * t * (3 - 2 * t), u = s(fx), v = s(fy), w = s(fz), L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash(X, Y, Z), hash(X + 1, Y, Z), u), L(hash(X, Y + 1, Z), hash(X + 1, Y + 1, Z), u), v),
    L(L(hash(X, Y, Z + 1), hash(X + 1, Y, Z + 1), u), L(hash(X, Y + 1, Z + 1), hash(X + 1, Y + 1, Z + 1), u), v), w);
}
export const fbm = (p, f) => noise(p.x * f, p.y * f, p.z * f) * 0.6 + noise(p.x * f * 2.3, p.y * f * 2.3, p.z * f * 2.3) * 0.3 + noise(p.x * f * 5.1, p.y * f * 5.1, p.z * f * 5.1) * 0.1;

// ------------------------------------------------------------------ polygonise
/** Polygonise sdf(p) inside the box [min, max] (a cube grid of res cells along the longest side). Returns an indexed
 *  BufferGeometry (positions in metres, smooth normals). */
export function polygonise(sdf, min, max, res = 96) {
  const ext = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) * 1.06, c = [0, 1, 2].map((i) => (min[i] + max[i]) / 2);
  const mc = new MarchingCubes(res, new THREE.MeshBasicMaterial(), false, false, 400000);
  mc.isolation = 0;
  const p = V(0, 0, 0), h = mc.halfsize;
  for (let z = 0; z < res; z++) for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
    p.set(c[0] + ((x - h) / h) * ext / 2, c[1] + ((y - h) / h) * ext / 2, c[2] + ((z - h) / h) * ext / 2);
    mc.field[z * mc.size2 + y * mc.size + x] = -sdf(p);
  }
  mc.update();
  const n = mc.count, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = c[k] + mc.positionArray[i * 3 + k] * ext / 2;
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g = mergeClose(g);
  return g;
}
function mergeClose(g) {
  const pos = g.attributes.position, map = new Map(), out = [], idx = [];
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 2e4)},${Math.round(pos.getY(i) * 2e4)},${Math.round(pos.getZ(i) * 2e4)}`;
    let j = map.get(k);
    if (j === undefined) { j = out.length / 3; map.set(k, j); out.push(pos.getX(i), pos.getY(i), pos.getZ(i)); }
    idx.push(j);
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  r.setIndex(idx);
  return r;
}
/** Simplify an indexed geometry to about `target` triangles (meshoptimizer), smooth normals after. */
export async function decimate(g, target) {
  await MeshoptSimplifier.ready;
  const idx = new Uint32Array(g.index.array), pos = g.attributes.position.array;
  const [out] = MeshoptSimplifier.simplify(idx, pos, 3, Math.min(idx.length, target * 3), 0.02, ['LockBorder']);
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', g.attributes.position);
  r.setIndex(Array.from(out));
  const c = compact(r);
  c.computeVertexNormals();
  return c;
}
function compact(g) {
  const idx = g.index.array, pos = g.attributes.position, remap = new Map(), out = [], ni = [];
  for (const v of idx) { let j = remap.get(v); if (j === undefined) { j = out.length / 3; remap.set(v, j); out.push(pos.getX(v), pos.getY(v), pos.getZ(v)); } ni.push(j); }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  r.setIndex(ni);
  return r;
}

// ------------------------------------------------------------------ the ramp texture and the GLB
/** A ramp row: colour stops [[t, 0xrrggbb], ...] across the texture's width. */
export function rampTexture(W, H, rows, paint) {
  const px = new Uint8Array(W * H * 4).fill(255);
  rows.forEach((stops, r) => {
    for (let x = 0; x < W; x++) {
      const t = x / (W - 1);
      let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
      const [t0, c0] = stops[i], [t1, c1] = stops[Math.min(i + 1, stops.length - 1)], k = t1 > t0 ? Math.max(0, Math.min(1, (t - t0) / (t1 - t0))) : 0;
      const col = [16, 8, 0].map((s) => Math.round(((c0 >> s) & 255) * (1 - k) + ((c1 >> s) & 255) * k));
      for (let y = r * 8; y < r * 8 + 8; y++) { const o = (y * W + x) * 4; px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; }
    }
  });
  paint?.(px, W, H);
  return px;
}
export const rowV = (r, H) => (r * 8 + 4) / H;

/** Write parts [{ name, geometry (position, normal, uv, index), rough }] with one shared texture (PNG buffer) to path. */
export async function writeGLB(path, parts, png) {
  await MeshoptEncoder.ready;
  const doc = new Document(), buf = doc.createBuffer(), scene = doc.createScene(), node = doc.createNode('root');
  scene.addChild(node);
  const tex = doc.createTexture('ramp').setImage(png).setMimeType('image/png');
  for (const P of parts) {
    const g = P.geometry, mat = doc.createMaterial(P.name).setBaseColorTexture(tex).setRoughnessFactor(P.rough).setMetallicFactor(0);
    const prim = doc.createPrimitive().setMaterial(mat)
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.attributes.position.array)).setBuffer(buf))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.attributes.normal.array)).setBuffer(buf))
      .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(g.attributes.uv.array)).setBuffer(buf))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.index.array)).setBuffer(buf));
    const m = doc.createMesh(P.name).addPrimitive(prim), n = doc.createNode(P.name).setMesh(m);
    node.addChild(n);
  }
  await doc.transform(dedup(), weld(), prune(), reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  await io.write(path, doc);
}
void simplify;
