// Voxel prop library access (props are defined in src/data/props/*.js) with mesh caching.
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { upres2x } from '../voxel/upres.js';
import { mergeByMaterial } from '../voxel/merge.js';

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
      geo = buildProp(def);
    } catch (e) {
      console.warn('prop build failed', id, e);
    }
  }
  geoCache.set(id, geo);
  return geo;
}

/**
 * Mesh a prop definition. Def fields beyond { voxel, build(v) }:
 *   detail: SURF name for voxels without a kind ('auto' by default: picked by material and colour), or false
 *   grain: 'y' to run wood grain up the side faces (posts, poles) instead of across
 *   upres: true | upres2x options: build at the given voxel size, mesh at half of it with rounder silhouettes
 *   parts: [{ voxel, at: [x, y, z] (in the main model's voxels), build(v), detail?, upres? }]  finer (or coarser) voxel
 *          parts in one geometry: a face, a hand, a label at higher resolution on a coarse body
 * Props are large: jitter in 2-voxel blocks + light colour quantisation so flat areas merge into big quads.
 */
function meshPart(d, vs) {
  let v = new VoxelModel();
  d.build(v);
  if (d.upres) { v = upres2x(v, d.upres === true ? {} : d.upres); vs /= 2; }
  const opts = { voxelSize: vs, jitterBlock: d.upres ? 2 : 2, quantize: 6, surf: d.detail === false ? false : d.detail || 'auto', grain: d.grain };
  if (d.texel) opts.texel = d.texel;
  return { v, vs, opts };
}
function buildProp(def) {
  const main = meshPart(def, def.voxel || 0.02);
  if (!def.parts?.length) return meshVoxels(main.v, main.opts);
  // every piece meshed at its own voxel size in the main model's voxel frame, then merged and set on the main model's
  // bottom centre (so a prop places exactly as it did without parts)
  const b = main.v.bounds(), vs = main.vs;
  const list = [{ geometry: meshVoxels(main.v, { ...main.opts, origin: 'none' }), matrix: null }];
  for (const p of def.parts) {
    const pm = meshPart(p, p.voxel || vs / 2);
    const g = meshVoxels(pm.v, { ...pm.opts, origin: 'none' });
    const [ax, ay, az] = p.at || [0, 0, 0];
    list.push({ geometry: g, matrix: new THREE.Matrix4().makeTranslation(ax * vs, ay * vs, az * vs) });
  }
  const geo = mergeByMaterial(list);
  for (const p of list) p.geometry.dispose();
  delete geo.userData.partBoxes;
  geo.translate(-(b.minX + b.w / 2) * vs, -b.minY * vs, -(b.minZ + b.d / 2) * vs);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  const s = new THREE.Vector3();
  geo.boundingBox.getSize(s);
  geo.userData.size = s;
  geo.userData.voxelSize = vs;
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
