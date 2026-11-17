// Small voxel accessories people carry or wear (pins, earrings, props, closet hats) baked into textured meshes: the
// voxel mesher's vertex colours (palette + baked AO) are painted into a little pixel-art atlas, one rectangle per face
// at a few texels per voxel, with per-voxel tone clusters and a crisp bevel (a lit top / left texel row, a shaded
// bottom / right one), then the mesh gets UVs and plain textured materials (no vertex colours).
//   bakedVoxelMesh(geo, mats) -> THREE.Mesh   (geo from src/voxel/mesher.js, mats = voxelMaterials(...) array)
//   bakeVoxelGeo(geo, mats) -> { geometry, materials } (cached per geometry)
import * as THREE from 'three';

const cache = new WeakMap();
const lin2s = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255;
const hash = (x, y, z) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const q = (v) => { const st = v < 70 ? 4 : v < 150 ? 6 : 8; return Math.max(0, Math.min(255, Math.round(v / st) * st)); };

function pack(rects, size) {
  const sky = new Int16Array(size);
  for (const r of [...rects].sort((a, b) => b.h - a.h || b.w - a.w)) {
    if (r.w > size) return false;
    let bx = -1, by = 1e9;
    for (let x = 0; x + r.w <= size; x++) {
      let y = 0;
      for (let i = x; i < x + r.w; i++) if (sky[i] > y) { y = sky[i]; if (y >= by) break; }
      if (y < by) { by = y; bx = x; }
    }
    if (by + r.h > size) return false;
    r.x = bx; r.y = by;
    for (let i = bx; i < bx + r.w; i++) sky[i] = by + r.h;
  }
  return true;
}

export function bakeVoxelGeo(geo, mats) {
  let out = cache.get(geo);
  if (out) return out;
  const P = geo.attributes.position, C = geo.attributes.color, N = geo.attributes.normal;
  if (!C || typeof document === 'undefined') { out = { geometry: geo, materials: mats }; cache.set(geo, out); return out; }
  const nq = P.count / 4;
  const v = (i) => new THREE.Vector3(P.getX(i), P.getY(i), P.getZ(i));
  // the voxel size: the shortest quad edge
  let vs = Infinity;
  for (let k = 0; k < nq; k++) { const a = v(k * 4), b = v(k * 4 + 1), d = v(k * 4 + 3); vs = Math.min(vs, a.distanceTo(b) || Infinity, a.distanceTo(d) || Infinity); }
  if (!(vs < Infinity)) vs = 1;
  const quads = [];
  let area = 0;
  for (let k = 0; k < nq; k++) {
    const a = v(k * 4), b = v(k * 4 + 1), d = v(k * 4 + 3);
    const nu = Math.max(1, Math.round(a.distanceTo(b) / vs)), nv = Math.max(1, Math.round(a.distanceTo(d) / vs));
    quads.push({ k, nu, nv, a, eu: b.clone().sub(a), ev: d.clone().sub(a) });
    area += nu * nv;
  }
  // texels per voxel: as many as fit a 256 atlas (2..6)
  let pxv = Math.max(2, Math.min(6, Math.floor(Math.sqrt((256 * 256 * 0.7) / Math.max(1, area)))));
  let size = 256;
  for (;;) {
    for (const Q of quads) { Q.w = Q.nu * pxv; Q.h = Q.nv * pxv; }
    if (pack(quads, size)) break;
    if (pxv > 2) pxv--; else if (size < 1024) size *= 2; else break;
  }
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
  const uv = new Float32Array(P.count * 2);
  for (const Q of quads) {
    const i0 = Q.k * 4, cols = [0, 1, 2, 3].map((j) => [C.getX(i0 + j), C.getY(i0 + j), C.getZ(i0 + j)]);
    const n = [N.getX(i0), N.getY(i0), N.getZ(i0)];
    // vertex order round the quad: 0 (0,0), 1 (u), 2 (u,v), 3 (v)
    for (let ty = 0; ty < Q.h; ty++) for (let tx = 0; tx < Q.w; tx++) {
      const fu = (tx + 0.5) / Q.w, fv = (ty + 0.5) / Q.h;
      const cu = Math.floor(tx / pxv), cvv = Math.floor(ty / pxv), lu = tx % pxv, lv = ty % pxv;
      // the voxel this texel belongs to (for a stable per-voxel tone)
      const wp = Q.a.clone().addScaledVector(Q.eu, (cu + 0.5) / Q.nu).addScaledVector(Q.ev, (cvv + 0.5) / Q.nv).divideScalar(vs);
      let k = 1 + (hash(Math.floor(wp.x + n[0] * 0.5), Math.floor(wp.y + n[1] * 0.5), Math.floor(wp.z + n[2] * 0.5)) - 0.5) * 0.1;
      if (lu === 0 || lv === pxv - 1) k *= 1.07; else if (lu === pxv - 1 || lv === 0) k *= 0.9;
      if (pxv > 3 && hash(tx + Q.k * 31, ty, 7) > 0.9) k *= 0.96;
      const w00 = (1 - fu) * (1 - fv), w10 = fu * (1 - fv), w11 = fu * fv, w01 = (1 - fu) * fv;
      const p = ((Q.y + ty) * size + Q.x + tx) * 4;
      for (let m = 0; m < 3; m++) d[p + m] = q(lin2s(Math.min(1, (cols[0][m] * w00 + cols[1][m] * w10 + cols[2][m] * w11 + cols[3][m] * w01) * k)));
      d[p + 3] = 255;
    }
    const U = (x) => x / size, V = (y) => 1 - y / size;
    uv[i0 * 2] = U(Q.x); uv[i0 * 2 + 1] = V(Q.y);
    uv[(i0 + 1) * 2] = U(Q.x + Q.w); uv[(i0 + 1) * 2 + 1] = V(Q.y);
    uv[(i0 + 2) * 2] = U(Q.x + Q.w); uv[(i0 + 2) * 2 + 1] = V(Q.y + Q.h);
    uv[(i0 + 3) * 2] = U(Q.x); uv[(i0 + 3) * 2 + 1] = V(Q.y + Q.h);
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace; map.magFilter = THREE.NearestFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', P); g.setAttribute('normal', N); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(geo.index);
  for (const gr of geo.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
  g.boundingBox = geo.boundingBox; g.boundingSphere = geo.boundingSphere; g.userData = geo.userData;
  const src = Array.isArray(mats) ? mats : [mats];
  const materials = src.map((m) => {
    if (!m) return m;
    const nm = new THREE.MeshStandardMaterial({ map, roughness: m.roughness ?? 0.8, metalness: m.metalness ?? 0, transparent: !!m.transparent, opacity: m.opacity ?? 1 });
    if (m.emissive && m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05) { nm.emissive = new THREE.Color(0xffffff); nm.emissiveMap = map; nm.emissiveIntensity = Math.min(1, m.emissiveIntensity); }
    return nm;
  });
  out = { geometry: g, materials: Array.isArray(mats) ? materials : materials[0] };
  cache.set(geo, out);
  return out;
}

export function bakedVoxelMesh(geo, mats) {
  const b = bakeVoxelGeo(geo, mats);
  return new THREE.Mesh(b.geometry, b.materials);
}
