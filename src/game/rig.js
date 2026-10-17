// Assembles a jointed voxel character from a definition (see docs/VOXEL_GUIDE.md "Characters").
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';

export const PART_NAMES = ['head', 'torso', 'armL', 'armR', 'legL', 'legR'];
const JOINT_OF = { head: 'neck', torso: 'hip', armL: 'shoulderL', armR: 'shoulderR', legL: 'hipL', legR: 'hipR' };

const geoCache = new Map();

function buildGeometries(def, variant) {
  const ck = def.id + '|' + variant;
  let g = geoCache.get(ck);
  if (g) return g;
  const parts = {};
  for (const p of PART_NAMES) { parts[p] = new VoxelModel(); parts[p].jitter = 0.025; }
  def.build(parts, variant);
  const vs = def.voxel || 0.03;
  g = {};
  for (const p of PART_NAMES) g[p] = parts[p].count ? meshVoxels(parts[p], { voxelSize: vs, origin: 'none' }) : null;
  geoCache.set(ck, g);
  return g;
}

/**
 * @returns {{root:THREE.Group, inner:THREE.Group, parts:Record<string,THREE.Group>, height:number}}
 * root: place in world (feet at y=0). inner: bob / lean. parts.*: rotate for animation.
 */
export function buildCharacter(def, variant = 0) {
  const vs = def.voxel || 0.03;
  const geos = buildGeometries(def, variant);
  const mats = voxelMaterials('normal');
  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.set(-0.5 * vs, 0, -0.5 * vs);
  root.add(inner);
  const rig = def.rig;
  const jointPos = (name) => {
    const j = rig[name] || [0, 0, 0];
    return new THREE.Vector3((j[0] + 0.5) * vs, (j[1] + 0.5) * vs, (j[2] + 0.5) * vs);
  };
  const parts = {};
  // torso pivots at the hip centre; limbs + head hang off the torso so leaning carries them
  const torsoJ = jointPos('hip');
  const torso = new THREE.Group();
  torso.position.copy(torsoJ);
  inner.add(torso);
  parts.torso = torso;
  for (const p of PART_NAMES) {
    const geo = geos[p];
    const J = p === 'torso' ? torsoJ : jointPos(JOINT_OF[p]);
    const grp = p === 'torso' ? torso : new THREE.Group();
    if (p !== 'torso') {
      if (p === 'legL' || p === 'legR') { grp.position.copy(J); inner.add(grp); }
      else { grp.position.copy(J).sub(torsoJ); torso.add(grp); }
      parts[p] = grp;
    }
    if (geo) {
      const m = new THREE.Mesh(geo, mats);
      m.position.copy(J).multiplyScalar(-1);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
    }
  }
  const box = new THREE.Box3().setFromObject(root);
  return { root, inner, parts, height: box.max.y - box.min.y };
}
