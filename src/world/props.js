// The prop library: ids, names and catalogue data come from src/data/props/*.js; the meshes are low-poly cartoon
// models built with the prop kit (src/props: models/<file>.js, one painted atlas page per family), with the old
// voxel model (def.build) as the fallback for a prop that has not been remade.
//   propMesh(id, opts) -> Mesh        propGeometry(id) -> BufferGeometry        propMaterials(id) -> [5 materials]
//   propSize(id) -> Vector3           hasProp(id)                               PROPS[id] -> { name, lib, ... }
//   propLodGeometry(id): a coarser build for far instances      propRig(id): body + moving parts on their pivots
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
import { register, lowPolyGeometry, lodGeometry, hasModel, boxOf } from '../props/index.js';
import { preloadAssets, assetMerged } from '../kit/assets.js';

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
// `?noasset=id,id` draws those models' props with their old builders (before / after comparisons)
const NO_ASSET = new Set(typeof location !== 'undefined' ? (new URLSearchParams(location.search).get('noasset') || '').split(',') : []);
const geoCache = new Map(), voxCache = new Map();

// Props drawn with a real model (def.asset = { id, fit, ry, centerY, tint }: Poly Haven, CC0, public/models/<id>.glb via
// src/kit/assets.js), fitted into the prop's own box, so sizes, collisions and placements stay. The models load before
// the world is built (top-level await), so the batchers get them synchronously; one that fails falls back to the
// prop's modelled version.
// models the world's own builders draw with assetMerged() (the garage counter and desk, the houses' AC units)
const WORLD_ASSETS = ['WoodenTable_01', 'metal_office_desk', 'exterior_aircon_unit'];
const ASSET_IDS = [...new Set([...Object.values(PROPS).map((d) => d.asset?.id), ...WORLD_ASSETS].filter((a) => a && !NO_ASSET.has(a)))];
if (ASSET_IDS.length && typeof document !== 'undefined' && !FORCE_VOXEL) await preloadAssets(ASSET_IDS);
const assetCache = new Map();
function assetProp(id) {
  if (assetCache.has(id)) return assetCache.get(id);
  const def = PROPS[id], A = def?.asset;
  let r = null;
  if (A && !FORCE_VOXEL && !NO_ASSET.has(A.id)) {
    const b = boxOf(id);
    let box = b && [b.x0, b.y0, b.z0, b.x1, b.y1, b.z1];
    if (!box) { const v = voxelPropGeometry(id)?.userData.size; if (v) box = [-v.x / 2, 0, -v.z / 2, v.x / 2, v.y, v.z / 2]; }
    if (box) r = assetMerged(A.id, { box, fit: A.fit || 'contain', ry: A.ry || 0, centerY: !!A.centerY });
    if (r && A.tint != null) r = { geometry: r.geometry, materials: tinted(r.materials, A.tint) };
    if (r) { r.geometry.userData.lowPoly = true; r.geometry.userData.size = new THREE.Vector3(box[3] - box[0], box[4] - box[1], box[5] - box[2]); }
  }
  assetCache.set(id, r);
  return r;
}
/** Recolour a model to fit the lane: tint = a colour multiplied into every material, or [colour | null per material]. */
const tintCache = new Map();
function tinted(mats, tint) {
  return mats.map((m, i) => {
    const c = Array.isArray(tint) ? tint[i] : tint;
    if (c == null) return m;
    const key = m.uuid + ':' + c;
    if (!tintCache.has(key)) { const t = m.clone(); t.color.multiply(new THREE.Color(c)); tintCache.set(key, t); }
    return tintCache.get(key);
  });
}
/** The real model a prop is drawn with (its id), or null. */
export const propAsset = (id) => (assetProp(id) ? PROPS[id].asset.id : null);

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
  let geo = assetProp(id)?.geometry || null;
  if (!geo && !FORCE_VOXEL && hasModel(id)) geo = lowPolyGeometry(id);
  if (!geo) geo = voxelPropGeometry(id);
  geoCache.set(id, geo);
  return geo;
}

/**
 * The five-slot material array a prop's geometry is drawn with ([matte, gloss, metal, glow, glass]): the prop's
 * atlas page for a low-poly prop, the shared voxel materials for one that is still voxels.
 */
export function propMaterials(id) {
  const A = assetProp(id);
  if (A) return A.materials;
  const page = propGeometry(id)?.userData.page;
  return page ? page.mats() : voxelMaterials('normal');
}
/**
 * A simpler level of detail for far or tiny instances (same materials: propMaterials(id)); the full geometry when the
 * prop has none (voxel props).
 */
export function propLodGeometry(id) {
  const g = propGeometry(id);
  if (assetProp(id)) return g;
  return g?.userData.lowPoly ? lodGeometry(id) || g : g;
}
/**
 * A prop as a rig: a Group whose first child is the body and whose other children are its moving parts, each a Mesh
 * named after the part and placed on its pivot (userData.axis: the axis it turns about). rig.userData.parts maps
 * names to those meshes. Props without moving parts come back as a Group holding the one mesh.
 */
export function propRig(id, opts = {}) {
  const g = propGeometry(id), root = new THREE.Group();
  root.name = 'rig:' + id; root.userData.propId = id; root.userData.parts = {};
  const R = g?.userData.rig?.();
  if (!R) { root.add(propMesh(id, opts)); return root; }
  const mats = propMaterials(id), mk = (geo, name) => { const m = new THREE.Mesh(geo, mats); m.name = name; m.castShadow = opts.castShadow ?? true; m.receiveShadow = opts.receiveShadow ?? true; m.userData.propId = id; return m; };
  root.add(mk(R.body, 'body'));
  for (const p of R.parts) { const m = mk(p.geometry, p.name); m.position.set(p.pivot[0], p.pivot[1], p.pivot[2]); m.userData.axis = p.axis; root.add(m); root.userData.parts[p.name] = m; }
  return root;
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
  if (def?.mesh && !assetProp(id)) { const m = def.mesh(opts); m.userData.propId = id; return m; }
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
  // parts on their own shared materials (leaf cards: src/props/kit/foliage.js) hang under the prop's mesh
  for (const x of geo?.userData.extras || []) {
    const c = new THREE.Mesh(x.geometry, x.material);
    c.castShadow = mesh.castShadow; c.receiveShadow = mesh.receiveShadow; c.userData.propId = id;
    mesh.add(c);
  }
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
