// Merge meshes that share one material array (voxel meshes: voxelMaterials(...)) into one geometry with a single group
// per material (performance: one draw call per material instead of one per part and material).
//   mergeByMaterial([{ geometry, matrix }]) -> BufferGeometry   (matrix: the part's transform in the merged mesh's space)
// Every part needs the same attributes (voxel meshes: position, normal, color); positions and normals are transformed.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _nm = new THREE.Matrix3();

export function mergeByMaterial(parts) {
  const names = Object.keys(parts[0].geometry.attributes);
  let nv = 0;
  const ranges = new Map(); // material index -> [{ p, start, count }]
  const base = new Map(); // part -> its first vertex in the merged geometry
  for (const p of parts) {
    const g = p.geometry, n = g.index ? g.index.count : g.attributes.position.count;
    for (const k of names) if (!g.attributes[k]) throw new Error(`mergeByMaterial: a part has no ${k}`);
    const groups = g.groups.length ? g.groups : [{ start: 0, count: n, materialIndex: 0 }];
    for (const gr of groups) {
      const mi = gr.materialIndex ?? 0;
      if (!ranges.has(mi)) ranges.set(mi, []);
      ranges.get(mi).push({ p, start: gr.start, count: Math.min(gr.count, n - gr.start) });
    }
    base.set(p, nv);
    nv += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  for (const k of names) {
    const a0 = parts[0].geometry.attributes[k], size = a0.itemSize;
    const arr = new Float32Array(nv * size);
    for (const p of parts) {
      const a = p.geometry.attributes[k], m = p.matrix, o = base.get(p) * size;
      if (k === 'position' && m) for (let i = 0; i < a.count; i++) { _v.fromBufferAttribute(a, i).applyMatrix4(m); arr[o + i * 3] = _v.x; arr[o + i * 3 + 1] = _v.y; arr[o + i * 3 + 2] = _v.z; }
      else if (k === 'normal' && m) { _nm.getNormalMatrix(m); for (let i = 0; i < a.count; i++) { _v.fromBufferAttribute(a, i).applyMatrix3(_nm).normalize(); arr[o + i * 3] = _v.x; arr[o + i * 3 + 1] = _v.y; arr[o + i * 3 + 2] = _v.z; } }
      else for (let i = 0; i < a.count; i++) for (let c = 0; c < size; c++) arr[o + i * size + c] = a.getComponent(i, c);
    }
    out.setAttribute(k, new THREE.BufferAttribute(arr, size));
  }
  let ni = 0;
  for (const list of ranges.values()) for (const r of list) ni += r.count;
  const idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
  let w = 0;
  for (const mi of [...ranges.keys()].sort((a, b) => a - b)) {
    const start = w;
    for (const { p, start: s, count } of ranges.get(mi)) {
      const src = p.geometry.index, b = base.get(p);
      for (let i = 0; i < count; i++) idx[w++] = (src ? src.getX(s + i) : s + i) + b;
    }
    out.addGroup(start, w - start, mi);
  }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}
