// The lowpix architecture and vehicle models (art/lowpix/world_arch/, public/models/lowpix/world_arch/, the table in
// src/kit/lowpixArch.js), loaded through src/kit/assets.js. Each model is authored in the frame the game places it in,
// so placing one is: put it at the frame's origin (and turn it). The ones the lane needs at boot are preloaded here
// (top-level await, like the prop models in src/world/props.js), so builders can place them synchronously; the rest
// load lazily (archSlot: an empty group now, the model when it arrives).
//   archReady(id) -> boolean              archPlace(id, parent, { x, y, z, ry, cast, receive }) -> Group | null
//   archSlot(id, parent, o) -> Group      (lazy; never null)          ARCH_OFF: `?voxelarch` in the URL draws the old
//   builds instead (before / after shots), and builders keep their old code for a model that failed to load.
import * as THREE from 'three';
import { assetNow, assetSlot, assetReady, preloadAssets } from '../kit/assets.js';
import { LP_ARCH, archAsset } from '../kit/lowpixArch.js';

export const ARCH_OFF = typeof location !== 'undefined' && /[?&]voxelarch\b/.test(location.search);
// every model is preloaded at boot (the town builds them synchronously) except the lazy ones (interiors: archSlot)
export const ARCH_LAZY = new Set(['scooter', 'wagasa_parasol', 'rope_coil', 'astronaut', 'slide', 'rice_cooker']); // props (src/data/propModels.js loads them)
const BOOT = Object.keys(LP_ARCH).filter((id) => !ARCH_LAZY.has(id));
if (!ARCH_OFF && typeof document !== 'undefined') {
  const ids = BOOT.filter((id) => LP_ARCH[id]).map(archAsset);
  try { await preloadAssets(ids); } catch (e) { console.warn('arch: models failed to load, old builds used', e); }
}

export const archReady = (id) => !ARCH_OFF && !!LP_ARCH[id] && assetReady(archAsset(id));

function put(g, parent, { x = 0, y = 0, z = 0, ry = 0, cast = true, receive = true, name } = {}) {
  g.position.set(x, y, z);
  g.rotation.y = ry;
  g.name = name || g.name;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  g.updateMatrixWorld(true);
  g.matrixAutoUpdate = false;
  parent?.add(g);
  return g;
}

/** The model placed now (it must be preloaded or already loaded), or null (then draw the old build). */
export function archPlace(id, parent, o = {}) {
  if (!archReady(id)) return null;
  return put(assetNow(archAsset(id), { cast: o.cast ?? true, receive: o.receive ?? true }), parent, { name: 'arch:' + id, ...o });
}

/** The model placed lazily: an empty group now, the model in it once loaded. */
export function archSlot(id, parent, o = {}) {
  const g = assetSlot(archAsset(id), { cast: o.cast ?? true, receive: o.receive ?? true });
  g.addEventListener?.('assetloaded', () => { g.traverse((m) => { if (m.isMesh) { m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true; } }); g.updateMatrixWorld(true); });
  return put(g, parent, { name: 'arch:' + id, ...o, cast: o.cast ?? true });
}

/**
 * A flat painted face of a lowpix model as a material and a uv mapping, for meshes the game shapes itself (the rolling
 * shutter): face(id) -> { material, uv(x, y) } with x, y in the model's own metres (an axis-aligned quad facing +z is
 * expected: the model's first mesh, its vertices' uvs fitted linearly to x and y), or null if not loaded.
 */
export function archFace(id) {
  const t = archReady(id) ? assetNow(archAsset(id)) : null;
  const mesh = t?.children.find((c) => c.isMesh);
  if (!mesh) return null;
  const p = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv;
  let i0 = 0, i1 = 0;
  for (let i = 1; i < p.count; i++) {
    if (p.getX(i) + p.getY(i) < p.getX(i0) + p.getY(i0)) i0 = i;
    if (p.getX(i) + p.getY(i) > p.getX(i1) + p.getY(i1)) i1 = i;
  }
  const x0 = p.getX(i0), y0 = p.getY(i0), x1 = p.getX(i1), y1 = p.getY(i1);
  const du = (uv.getX(i1) - uv.getX(i0)) / (x1 - x0), dv = (uv.getY(i1) - uv.getY(i0)) / (y1 - y0);
  return { material: mesh.material, x0, y0, x1, y1, uv: (x, y) => [uv.getX(i0) + (x - x0) * du, uv.getY(i0) + (y - y0) * dv] };
}

/**
 * Many copies of one model as instanced meshes (a draw call per material for all of them): the utility poles.
 * list = [{ x, y, z, ry }]; returns the InstancedMeshes added to parent, or null if the model is not loaded.
 */
export function archInstances(id, parent, list, { cast = false, receive = true } = {}) {
  const t = archReady(id) ? assetNow(archAsset(id)) : null;
  if (!t || !list.length) return null;
  const out = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  for (const mesh of t.children) {
    if (!mesh.isMesh) continue;
    const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, list.length);
    list.forEach((it, i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(it.x, it.y ?? 0, it.z), q.setFromAxisAngle(up, it.ry ?? 0), one)));
    im.castShadow = cast; im.receiveShadow = receive;
    im.computeBoundingSphere();
    im.name = 'arch:' + id;
    im.matrixAutoUpdate = false;
    parent.add(im);
    out.push(im);
  }
  return out;
}
