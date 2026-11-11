// Real-world models (Poly Haven, CC0), imported with tools/import-asset.mjs into public/models/<id>.glb
// (decimated, origin at the bottom centre, front +z, metres, pixel-art textures; credits in CREDITS.md).
//   await loadAsset(id)               -> the cached template (THREE.Group; loads once, shared by every clone)
//   asset(id, opts) -> Promise<Group>  a clone (shared geometry and materials) scaled to real-world metres
//   assetNow(id, opts) -> Group | null the same, synchronously, if the model has loaded (preloadAssets first)
//   assetSlot(id, opts) -> Group       for synchronous builders: an empty Group now, the model added when it loads;
//                                      with opts.size given as [w, h, d] it holds an invisible, unpickable proxy box
//                                      of that size so Box3.setFromObject() sees the right bounds at once
//   preloadAssets(ids) -> Promise      fetch several up front;   assetReady(id) -> boolean
//   assetMerged(id, { box, fit, ry }) -> { geometry, materials } one geometry, a group per material (the prop library)
// Props: give a prop def `asset: { id, fit, ry }` (src/data/props) and src/world/props.js draws it with the model.
// opts: { size: number | [w, h, d], fit: 'max' (default: largest dimension = size) | 'x' | 'y' | 'z' (scale by that axis)
//         | 'contain' (fit inside [w, h, d], uniform) | 'stretch' ([w, h, d] exactly), cast = true, receive = true }
// Materials are MeshStandardMaterial (roughness kept in 0.3..0.95 unless metal), textures nearest-magnified and
// mipmap-minified (crisp pixels up close, no shimmer far away), meshes merged per material (a draw call each).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const templates = new Map(), pending = new Map();
const url = (id) => new URL(`${import.meta.env.BASE_URL}models/${id}.glb`, document.baseURI).href;

function tidyTexture(t, color) {
  if (!t) return;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
}
function tidyMaterial(m) {
  const s = m.isMeshStandardMaterial ? m : new THREE.MeshStandardMaterial({ color: m.color, map: m.map || null, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest });
  if (s !== m) m.dispose();
  tidyTexture(s.map, true);
  tidyTexture(s.roughnessMap); tidyTexture(s.metalnessMap); tidyTexture(s.normalMap);
  if (!s.metalnessMap && s.metalness < 0.5) s.roughness = Math.min(0.95, Math.max(0.3, s.roughness));
  s.aoMap = null; s.emissiveMap = null; s.emissive?.setRGB(0, 0, 0);
  return s;
}
/** A float copy of a (possibly quantized, normalized) attribute, so transforms and merging work. */
function floatAttr(a) {
  if (a.array instanceof Float32Array && !a.normalized && !a.isInterleavedBufferAttribute) return a.clone();
  const n = a.count, k = a.itemSize, out = new Float32Array(n * k);
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) out[i * k + j] = a.getComponent ? a.getComponent(i, j) : [a.getX(i), a.getY(i), a.getZ(i), a.getW(i)][j];
  return new THREE.BufferAttribute(out, k);
}
/** The glTF scene baked into one Group: a mesh per material, world transforms applied (GLTFLoader gives one mesh per primitive). */
function bake(gltf, id) {
  const root = gltf.scene, byMat = new Map();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material, src = o.geometry, part = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv', 'color']) if (src.attributes[k]) part.setAttribute(k, floatAttr(src.attributes[k]));
    if (src.index) part.setIndex(Array.from(src.index.array));
    part.applyMatrix4(o.matrixWorld);
    if (!part.attributes.normal) part.computeVertexNormals();
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat).push(part);
  });
  const out = new THREE.Group();
  out.name = 'asset:' + id;
  for (const [mat, parts] of byMat) {
    const same = parts.every((p) => Object.keys(p.attributes).join() === Object.keys(parts[0].attributes).join() && !!p.index === !!parts[0].index);
    const geo = parts.length > 1 && same ? (mergeGeometries(parts, false) || parts[0]) : parts[0];
    if (parts.length > 1 && !same) for (const p of parts.slice(1)) out.add(Object.assign(new THREE.Mesh(p, mat), { castShadow: true, receiveShadow: true }));
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, tidyMaterial(mat));
    m.name = id + ':' + (mat.name || 'mat');
    m.castShadow = m.receiveShadow = true;
    out.add(m);
  }
  const box = new THREE.Box3().setFromObject(out);
  out.userData.asset = id;
  out.userData.size = box.getSize(new THREE.Vector3());
  out.userData.box = box;
  return out;
}

export function loadAsset(id) {
  if (templates.has(id)) return Promise.resolve(templates.get(id));
  if (!pending.has(id)) {
    pending.set(id, loader.loadAsync(url(id)).then((gltf) => { const t = bake(gltf, id); templates.set(id, t); pending.delete(id); return t; })
      .catch((e) => { pending.delete(id); console.warn('asset failed to load:', id, e?.message || e); throw e; }));
  }
  return pending.get(id);
}
export const assetReady = (id) => templates.has(id);
export const preloadAssets = (ids) => Promise.all(ids.map((id) => loadAsset(id).catch(() => null)));

function scaleFor(t, o) {
  const s = t.userData.size, size = o.size;
  if (size == null) return [1, 1, 1];
  if (Array.isArray(size)) {
    const k = [size[0] / s.x, size[1] / s.y, size[2] / s.z];
    if (o.fit === 'stretch') return k;
    const i = { x: 0, y: 1, z: 2 }[o.fit];
    const u = i !== undefined ? k[i] : Math.min(...k);
    return [u, u, u];
  }
  const ax = { x: s.x, y: s.y, z: s.z }[o.fit] ?? Math.max(s.x, s.y, s.z);
  const u = size / ax;
  return [u, u, u];
}
function instance(t, o = {}) {
  const c = t.clone(false);
  for (const m of t.children) { const mm = new THREE.Mesh(m.geometry, m.material); mm.name = m.name; mm.castShadow = o.cast ?? true; mm.receiveShadow = o.receive ?? true; c.add(mm); }
  c.scale.set(...scaleFor(t, o));
  c.userData = { asset: t.userData.asset, size: t.userData.size.clone().multiply(c.scale) };
  return c;
}
export async function asset(id, o = {}) { return instance(await loadAsset(id), o); }
export function assetNow(id, o = {}) { const t = templates.get(id); return t ? instance(t, o) : null; }

const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
export function assetSlot(id, o = {}) {
  const slot = new THREE.Group();
  slot.name = 'slot:' + id;
  const now = assetNow(id, o);
  if (now) { slot.add(now); return slot; }
  let proxy = null;
  if (Array.isArray(o.size)) {
    proxy = new THREE.Mesh(new THREE.BoxGeometry(...o.size).translate(0, o.size[1] / 2, 0), proxyMat);
    proxy.raycast = () => {}; proxy.castShadow = proxy.receiveShadow = false; proxy.visible = false;
    slot.add(proxy);
  }
  loadAsset(id).then((t) => {
    if (proxy) { slot.remove(proxy); proxy.geometry.dispose(); }
    slot.add(instance(t, o));
    slot.dispatchEvent?.({ type: 'assetloaded', id });
  }).catch(() => {});
  return slot;
}

const merged = new Map();
/**
 * One indexed geometry (a group per material) and its materials, fitted into a box: for the prop library, so batchers
 * that merge or instance props by geometry work unchanged. Synchronous: null until the model has loaded.
 *   o: { box: [x0, y0, z0, x1, y1, z1] (m), fit: 'contain' | 'x' | 'y' | 'z' | 'stretch', ry: turn (rad) first }
 * The model sits centred on the box in x and z, on its floor (y0), or centred in y with o.centerY (wall pieces).
 */
export function assetMerged(id, o = {}) {
  const t = templates.get(id);
  if (!t) return null;
  const key = id + '|' + JSON.stringify(o);
  if (merged.has(key)) return merged.get(key);
  const parts = [], materials = [];
  for (const m of t.children) {
    const g = new THREE.BufferGeometry(), src = m.geometry, n = src.attributes.position.count;
    g.setAttribute('position', src.attributes.position.clone());
    g.setIndex(src.index ? src.index.clone() : [...Array(n).keys()]);
    if (src.attributes.normal) g.setAttribute('normal', src.attributes.normal.clone()); else g.computeVertexNormals();
    g.setAttribute('uv', src.attributes.uv ? src.attributes.uv.clone() : new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    // a flat colour for code that still draws props with the vertex-coloured voxel materials
    const c = m.material.color || new THREE.Color(0.8, 0.8, 0.8), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r * 0.8; col[i * 3 + 1] = c.g * 0.8; col[i * 3 + 2] = c.b * 0.8; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g); materials.push(m.material);
  }
  const geo = mergeGeometries(parts, true);
  if (!geo) return null;
  if (o.ry) geo.rotateY(o.ry);
  geo.computeBoundingBox();
  const bb = geo.boundingBox, s = bb.getSize(new THREE.Vector3());
  if (o.box) {
    const [x0, y0, z0, x1, y1, z1] = o.box, W = x1 - x0, H = y1 - y0, D = z1 - z0;
    const k = [W / s.x, H / s.y, D / s.z], i = { x: 0, y: 1, z: 2 }[o.fit];
    const sc = o.fit === 'stretch' ? k : Array(3).fill(i !== undefined ? k[i] : Math.min(...k));
    geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    geo.scale(...sc);
    geo.translate((x0 + x1) / 2, o.centerY ? (y0 + y1) / 2 - (s.y * sc[1]) / 2 : y0, (z0 + z1) / 2);
  }
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  geo.userData.asset = id;
  const out = { geometry: geo, materials };
  merged.set(key, out);
  return out;
}
