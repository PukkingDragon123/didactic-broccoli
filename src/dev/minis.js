// Viewer module: every mini deco (src/data/minis.js), meshed like a collectible.
//   viewer.html?module=/src/dev/minis.js&cols=7[&only=sakura,torii]
import * as THREE from 'three';
import { MINIS } from '../data/minis.js';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';

const ITEM_VOXEL = 0.0027;
const ITEM_MAX = 0.088;

export async function viewerEntries(params) {
  const only = params.get('only') ? params.get('only').split(',') : null;
  const out = [];
  for (const [id, m] of Object.entries(MINIS)) {
    if (only && !only.includes(id)) continue;
    const v = new VoxelModel();
    m.build(v);
    const b = v.bounds();
    const maxDim = Math.max(b.w, b.h, b.d) * ITEM_VOXEL;
    const vs = maxDim > ITEM_MAX ? ITEM_VOXEL * (ITEM_MAX / maxDim) : ITEM_VOXEL;
    const mesh = new THREE.Mesh(meshVoxels(v, { voxelSize: vs }), voxelMaterials('normal'));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const warn = Math.max(b.w, b.h, b.d) > 30 || Math.max(b.w, b.h, b.d) < 15 ? ' ⚠' : '';
    out.push({ obj: mesh, label: `${m.name} <span class="r">¥${m.price}</span><br><span class="r">${id} · ${b.w}×${b.h}×${b.d}${warn}</span>` });
  }
  return out;
}
