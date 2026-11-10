// The prop library: ids, names and catalogue data come from src/data/props/*.js; the meshes are low-poly cartoon
// models built with the prop kit (src/props: models/<file>.js, one painted atlas page per family), with the old
// voxel model (def.build) as the fallback for a prop that has not been remade.
//   propMesh(id, opts) -> Mesh        propGeometry(id) -> BufferGeometry        propMaterials(id) -> [5 materials]
//   propSize(id) -> Vector3           hasProp(id)                               PROPS[id] -> { name, lib, ... }
// Geometry contract (unchanged from the voxel days, the town / garage batchers rely on it): indexed, position /
// normal / color, one group per material slot, slots in the voxel material order [matte, gloss, metal, glow, glass],
// userData.size = the prop's box in metres. The low-poly geometries add `uv` into their atlas page: draw them with
// propMaterials(id) (same five slots: lit atlas material x3, unlit lamps, glass / cut-outs) for the painted
// version; drawn with the vertex-coloured voxel materials they come out flat-coloured.
// `?voxelprops` in the URL forces the old voxel models (before / after comparisons).
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { register, lowPolyGeometry, hasModel } from '../props/index.js';

const libs = import.meta.glob('../data/props/*.js', { eager: true });
export const PROPS = {};
for (const [path, mod] of Object.entries(libs)) {
  const file = path.split('/').pop().replace('.js', '');
  for (const [id, def] of Object.entries(mod.default || {})) {
    PROPS[id] = { ...def, id, lib: file };
  }
}
for (const mod of Object.values(import.meta.glob('../props/models/*.js', { eager: true }))) if (mod.default?.models) register(mod.default);

const FORCE_VOXEL = typeof location !== 'undefined' && /[?&]voxelprops\b/.test(location.search);
const geoCache = new Map(), voxCache = new Map();

/** The old voxel model of a prop (the fallback; also the "before" in comparisons). */
export function voxelPropGeometry(id) {
  if (voxCache.has(id)) return voxCache.get(id);
  const def = PROPS[id];
  let geo = null;
  if (def?.build) {
    try {
      const v = new VoxelModel();
      def.build(v);
      // props are large: jitter in 2-voxel blocks + light colour quantisation so flat areas merge into big quads
      geo = meshVoxels(v, { voxelSize: def.voxel || 0.02, jitterBlock: 2, quantize: 6 });
    } catch (e) {
      console.warn('prop build failed', id, e);
    }
  }
  voxCache.set(id, geo);
  return geo;
}

export function propGeometry(id) {
  if (geoCache.has(id)) return geoCache.get(id);
  let geo = null;
  if (!FORCE_VOXEL && hasModel(id)) geo = lowPolyGeometry(id);
  if (!geo) geo = voxelPropGeometry(id);
  geoCache.set(id, geo);
  return geo;
}

/**
 * The five-slot material array a prop's geometry is drawn with ([matte, gloss, metal, glow, glass]): the prop's
 * atlas page for a low-poly prop, the shared voxel materials for one that is still voxels.
 */
export function propMaterials(id) {
  const page = propGeometry(id)?.userData.page;
  return page ? page.mats() : voxelMaterials('normal');
}
/** Has this prop been remade as a low-poly model (and did it build)? */
export function isLowPoly(id) { return !!propGeometry(id)?.userData.lowPoly; }

/**
 * Create a mesh for a prop. If the prop is missing, returns a neutral placeholder box of `fallbackSize`.
 * opts: { castShadow, receiveShadow, fallbackSize:[w,h,d], fallbackColor }
 */
export function propMesh(id, opts = {}) {
  // a prop may bring its own finished model (src/products sets PROPS[id].mesh for the things it owns): a Mesh or a
  // Group, bottom-centre origin, its own materials. def.build(v) stays as the sized stand-in for propGeometry / propSize.
  const def = PROPS[id];
  if (def?.mesh) { const m = def.mesh(opts); m.userData.propId = id; return m; }
  const geo = propGeometry(id);
  let mesh;
  if (geo) {
    mesh = new THREE.Mesh(geo, propMaterials(id));
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
/** A mesh of the old voxel model (dev: comparisons). */
export function voxelPropMesh(id) {
  const geo = voxelPropGeometry(id);
  if (!geo) return null;
  const m = new THREE.Mesh(geo, voxelMaterials('normal'));
  m.userData.propId = id;
  return m;
}

export function hasProp(id) { return !!PROPS[id]; }

/** Size of a prop's mesh in metres (or the fallback). */
export function propSize(id, fallback = [0.3, 0.3, 0.3]) {
  const g = propGeometry(id);
  if (!g) return new THREE.Vector3(...fallback);
  return g.userData.size.clone();
}
