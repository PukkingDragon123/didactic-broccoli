// Geometry + mesh factory for collectibles (cached per item; materials shared per finish).
// Every figure is modelled on a coarse voxel grid (src/data/series/*.js) and then up-resolved 2x with a 3D EPX
// smoother (src/voxel/upres.js) before greedy meshing: finer, rounder silhouettes with the same crisp colour regions.
// Per item, `upres: false` keeps the original voxels, or `upres: { carve, fill, recolor }` tunes the smoother.
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { upres2x } from '../voxel/upres.js';
import { getItem } from '../data/series/index.js';

export const ITEM_VOXEL = 0.0027; // metres per (design) voxel for collectibles (a 26-voxel figure ≈ 7 cm)
export const ITEM_MAX = 0.088; // largest allowed dimension in metres (fits a shelf slot)

const geoCache = new Map();
let UPRES = true; // global switch (dev comparisons)
let UPRES_OPTS = {}; // smoother defaults (dev tuning), merged under each item's own `upres` options
export function setItemUpres(on, opts = null) { UPRES = !!on; if (opts) UPRES_OPTS = opts; geoCache.clear(); }

export function buildItemModel(item) {
  const v = new VoxelModel();
  item.build(v);
  return v;
}

/** The voxel model a figure is meshed from (up-resolved unless the item opts out). Returns { model, scale }. */
export function itemModel(item, { lowres = false } = {}) {
  const model = buildItemModel(item);
  const opt = item.upres;
  if (lowres || !UPRES || opt === false || item.mini) return { model, scale: 1 };
  return { model: upres2x(model, { ...UPRES_OPTS, ...(typeof opt === 'object' ? opt : {}) }), scale: 2 };
}

export function itemGeometry(key, opts = {}) {
  const ck = opts.lowres ? key + '|lo' : key;
  let g = geoCache.get(ck);
  if (g) return g;
  const item = getItem(key);
  if (!item) throw new Error('Unknown item ' + key);
  const { model, scale } = itemModel(item, opts);
  const b = model.bounds();
  const maxDim = (Math.max(b.w, b.h, b.d) / scale) * ITEM_VOXEL;
  const vs = (maxDim > ITEM_MAX ? ITEM_VOXEL * (ITEM_MAX / maxDim) : ITEM_VOXEL) / scale;
  g = meshVoxels(model, { voxelSize: vs });
  g.userData.upres = scale;
  geoCache.set(ck, g);
  return g;
}

/** Create a mesh for an item key ("series/item") with a finish. opts.lowres: the original coarse voxels. */
export function makeItemMesh(key, finish = 'normal', opts = {}) {
  const mesh = new THREE.Mesh(itemGeometry(key, opts), voxelMaterials(finish));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.itemKey = key;
  mesh.userData.finish = finish;
  return mesh;
}
