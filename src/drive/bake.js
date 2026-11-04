// Static voxel props baked into the zone: every placed copy of every prop (Jizō, bus stop, sakura, vending machines,
// cones, parked trucks) transformed and concatenated per voxel material, so the whole roadside costs one draw call per
// material instead of one per prop kind and material.
//   bakeVoxels([{ geo, matrix }...]) -> [BufferGeometry | null] indexed by voxel material id (matte, gloss, metal, glow, glass)
import * as THREE from 'three';

const _n = new THREE.Matrix3(), _v = new THREE.Vector3();

export function bakeVoxels(items) {
  const parts = [[], [], [], [], []];
  for (const { geo, matrix } of items) {
    if (!geo?.index) continue;
    const idx = geo.index.array, P = geo.attributes.position.array, N = geo.attributes.normal.array, C = geo.attributes.color.array;
    _n.getNormalMatrix(matrix);
    for (const gr of geo.groups) {
      if (!gr.count || gr.materialIndex > 4) continue;
      let lo = Infinity, hi = -1;
      for (let i = gr.start; i < gr.start + gr.count; i++) { const v = idx[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      const nv = hi - lo + 1, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
      for (let v = 0; v < nv; v++) {
        const o = (lo + v) * 3;
        _v.set(P[o], P[o + 1], P[o + 2]).applyMatrix4(matrix); pos[v * 3] = _v.x; pos[v * 3 + 1] = _v.y; pos[v * 3 + 2] = _v.z;
        _v.set(N[o], N[o + 1], N[o + 2]).applyMatrix3(_n).normalize(); nor[v * 3] = _v.x; nor[v * 3 + 1] = _v.y; nor[v * 3 + 2] = _v.z;
        col[v * 3] = C[o]; col[v * 3 + 1] = C[o + 1]; col[v * 3 + 2] = C[o + 2];
      }
      const ind = new Uint32Array(gr.count);
      for (let i = 0; i < gr.count; i++) ind[i] = idx[gr.start + i] - lo;
      parts[gr.materialIndex].push({ pos, nor, col, ind });
    }
  }
  return parts.map((list) => {
    if (!list.length) return null;
    let nv = 0, ni = 0;
    for (const p of list) { nv += p.pos.length / 3; ni += p.ind.length; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), ind = new Uint32Array(ni);
    let vo = 0, io = 0;
    for (const p of list) {
      pos.set(p.pos, vo * 3); nor.set(p.nor, vo * 3); col.set(p.col, vo * 3);
      for (let i = 0; i < p.ind.length; i++) ind[io + i] = p.ind[i] + vo;
      vo += p.pos.length / 3; io += p.ind.length;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(ind, 1));
    g.computeBoundingSphere();
    return g;
  });
}
