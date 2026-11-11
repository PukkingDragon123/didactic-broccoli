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
import { upgradeVoxels } from '../figures/voxpaint.js';
import { voxelizeFig } from '../figures/kit.js';

/** mm per voxel for kit-built figures (item.fig, voxelized): about the old up-res density, finer than design voxels. */
const FIG_VOX = 1.1;

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
  // kit figures (src/figures): voxelized at FIG_VOX mm, already painted voxel by voxel
  if (item.fig) return { model: voxelizeFig(item.fig, lowres ? FIG_VOX * 2 : FIG_VOX), scale: (ITEM_VOXEL * 1000) / (lowres ? FIG_VOX * 2 : FIG_VOX) };
  const model = buildItemModel(item);
  const opt = item.upres;
  if (lowres || !UPRES || opt === false || item.mini) return { model: item.mini ? model : upgradeVoxels(model, { scale: 1 }), scale: 1 };
  return { model: upgradeVoxels(upres2x(model, { ...UPRES_OPTS, ...(typeof opt === 'object' ? opt : {}) }), { scale: 2 }), scale: 2 };
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
  if (model.fontPending) model.fontPending.then(() => { if (geoCache.get(ck) === g) geoCache.delete(ck); }).catch(() => {});
  g.userData.upres = scale;
  geoCache.set(ck, g);
  return g;
}

/** Is this item's up-res geometry already built (cheap to show)? */
export function hasItemGeometry(key) { return geoCache.has(key); }

/** Create a mesh for an item key ("series/item") with a finish. opts.lowres: the original coarse voxels. */
export function makeItemMesh(key, finish = 'normal', opts = {}) {
  let geo;
  const lod = LOD.on && !opts.lowres && !opts.hires && UPRES && wantsUpres(getItem(key));
  if (lod) geo = geoCache.get(key) || itemGeometry(key, { lowres: true });
  else geo = itemGeometry(key, opts);
  const mesh = new THREE.Mesh(geo, voxelMaterials(finish));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.itemKey = key;
  mesh.userData.finish = finish;
  if (lod) { mesh.userData.lod = { key, hi: geo === geoCache.get(key), orphan: 0 }; LOD.live.add(mesh); }
  return mesh;
}

function wantsUpres(item) { return !!item && (item.fig || (item.upres !== false && !item.mini)); }

// ------------------------------------------------------------------ level of detail
// Figures far from the camera (a full shelf across the room) draw their original coarse voxels; the 2x up-res mesh
// is swapped in (and built, a couple per frame at most) once you come close or pick one up.
const LOD = { on: false, live: new Set(), near: 1.7, far: 2.1, t: 0 };
const _p = new THREE.Vector3();

/** Turn distance-based detail on (the game does; dev viewers get full detail straight away). */
export function enableItemLod(on = true) { LOD.on = on; }

/** Per-frame: swap detail levels by distance to `camPos`; builds at most `budget` new hi-res meshes. */
export function updateItemLod(camPos, budget = 2) {
  let built = 0;
  const n2 = LOD.near * LOD.near, f2 = LOD.far * LOD.far;
  for (const m of LOD.live) {
    const L = m.userData.lod;
    let root = m;
    while (root.parent) root = root.parent;
    if (!root.isScene) { if (++L.orphan > 4) LOD.live.delete(m); continue; }
    L.orphan = 0;
    m.getWorldPosition(_p);
    const d2 = _p.distanceToSquared(camPos);
    if (!L.hi && d2 < n2) {
      if (!geoCache.has(L.key)) { if (built >= budget) continue; built++; }
      m.geometry = itemGeometry(L.key);
      L.hi = true;
    } else if (L.hi && d2 > f2) {
      m.geometry = itemGeometry(L.key, { lowres: true });
      L.hi = false;
    }
  }
}
