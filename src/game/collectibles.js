// Geometry + mesh factory for collectibles (cached per item; materials shared per finish).
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { getItem } from '../data/series/index.js';

export const ITEM_VOXEL = 0.0045; // metres per voxel for collectibles
export const ITEM_MAX = 0.15; // largest allowed dimension in metres (fits a shelf cubby)

const geoCache = new Map();

export function buildItemModel(item) {
  const v = new VoxelModel();
  item.build(v);
  return v;
}

export function itemGeometry(key) {
  let g = geoCache.get(key);
  if (g) return g;
  const item = getItem(key);
  if (!item) throw new Error('Unknown item ' + key);
  const model = buildItemModel(item);
  const b = model.bounds();
  const maxDim = Math.max(b.w, b.h, b.d) * ITEM_VOXEL;
  const vs = maxDim > ITEM_MAX ? ITEM_VOXEL * (ITEM_MAX / maxDim) : ITEM_VOXEL;
  g = meshVoxels(model, { voxelSize: vs });
  geoCache.set(key, g);
  return g;
}

/** Create a mesh for an item key ("series/item") with a finish. */
export function makeItemMesh(key, finish = 'normal') {
  const mesh = new THREE.Mesh(itemGeometry(key), voxelMaterials(finish));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.itemKey = key;
  mesh.userData.finish = finish;
  return mesh;
}
