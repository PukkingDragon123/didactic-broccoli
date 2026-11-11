// Voxel prop library access (props are defined in src/data/props/*.js) with mesh caching.
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';

const libs = import.meta.glob('../data/props/*.js', { eager: true });
export const PROPS = {};
for (const [path, mod] of Object.entries(libs)) {
  const file = path.split('/').pop().replace('.js', '');
  for (const [id, def] of Object.entries(mod.default || {})) {
    PROPS[id] = { ...def, id, lib: file };
  }
}

const geoCache = new Map();

export function propGeometry(id) {
  if (geoCache.has(id)) return geoCache.get(id);
  const def = PROPS[id];
  let geo = null;
  if (def) {
    try {
      const v = new VoxelModel();
      def.build(v);
      // props are large: jitter in 2-voxel blocks + light colour quantisation so flat areas merge into big quads
      geo = meshVoxels(v, { voxelSize: def.voxel || 0.02, jitterBlock: 2, quantize: 6 });
    } catch (e) {
      console.warn('prop build failed', id, e);
    }
  }
  geoCache.set(id, geo);
  return geo;
}

/**
 * Create a mesh for a prop. If the prop is missing, returns a neutral placeholder box of `fallbackSize`.
 * opts: { castShadow, receiveShadow, fallbackSize:[w,h,d], fallbackColor }
 */
export function propMesh(id, opts = {}) {
  const geo = propGeometry(id);
  let mesh;
  if (geo) {
    mesh = new THREE.Mesh(geo, voxelMaterials('normal'));
  } else {
    const [w, h, d] = opts.fallbackSize || [0.3, 0.3, 0.3];
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: opts.fallbackColor ?? 0x8a7a6a, roughness: 0.8 }));
  }
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = opts.receiveShadow ?? true;
  mesh.userData.propId = id;
  return mesh;
}

export function hasProp(id) { return !!PROPS[id]; }

/** Size of a prop's mesh in metres (or the fallback). */
export function propSize(id, fallback = [0.3, 0.3, 0.3]) {
  const g = propGeometry(id);
  if (!g) return new THREE.Vector3(...fallback);
  return g.userData.size.clone();
}
