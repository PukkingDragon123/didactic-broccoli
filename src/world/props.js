// Voxel prop library access (props are defined in src/data/props/*.js) with mesh caching.
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { upres2x } from '../voxel/upres.js';
import { mergeByMaterial } from '../voxel/merge.js';
import { leafCards, CELLS } from '../voxel/cards.js';
import { shade } from '../voxel/palette.js';

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
const greenish = (c) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return g > r * 1.05 && g > b * 1.15 && g > 40; };
/** 2D leaf cards on the leafy voxels (src/voxel/cards.js), then the voxels under them become the crown's dark core
 *  (core: true, the default), stay as they are (false) or go (core: 'remove': the cards are the plant). */
function addLeaves(v, list, vs) {
  for (const L of Array.isArray(list) ? list : [list]) {
    const match = L.match || ((c, m, x, y, z) => greenish(c) && (L.minY === undefined || y >= L.minY));
    leafCards(v, { ...L, match, vs });
    if (L.core === false) continue;
    const coreHex = L.coreTone ?? CELLS[L.kind]?.[3] ?? 0x2a4626;
    const hits = [];
    v.forEach((x, y, z, val) => { const c = val & 0xffffff, m = val & 0x8000000 ? (val >>> 24) & 7 : 0; if (match(c, m, x, y, z)) hits.push([x, y, z]); });
    for (const [x, y, z] of hits) {
      if (L.core === 'remove') v.remove(x, y, z);
      else v.set(x, y, z, shade(coreHex, 0.85 + ((x * 7 + y * 13 + z * 5) % 5) * 0.06));
    }
  }
}
function meshPart(d, vs) {
  let v = new VoxelModel();
  d.build(v);
  if (d.upres) { v = upres2x(v, d.upres === true ? {} : d.upres); vs /= 2; }
  if (d.leaves) addLeaves(v, d.leaves, vs);
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
