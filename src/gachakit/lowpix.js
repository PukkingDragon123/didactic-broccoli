// The machines-area lowpix models (art/lowpix/machines: specs built by the owner's modeller lowpix and packed by
// art/lowpix/machines/pack.mjs into public/models/lowpix/machines/<id>.glb): gacha machines, capsules, display cases,
// vending machines, held items, the PC. Each GLB holds one node per JOINT ('body', 'stand', 'crank', 'lid', 'flap',
// 'drawer', 'btn_minus', ...), its mesh in the joint's frame (the pivot at the origin), a primitive per atlas x material
// kind (matte / gloss / metal / glass). src/gachakit/lowpix.manifest.json knows every model's joints up front.
//   await preloadLP(ids)          fetch + decode (top-level await in the modules that build synchronously)
//   lpReady(id)                   loaded?
//   lpPart(id, joint)             -> { geometry, material (array) } | null: shared, never dispose
//   lpMesh(id, joint, opts)       -> a Mesh of that joint (shared geometry + materials), or an empty Group if not loaded
//   lpGroup(id, joints?)          -> a Group with every (or the named) joint meshes at their pivots
//   lpMaterialSlots(id, joint, arr) -> the joint's geometry with its groups re-indexed into a shared material array
//                                    (for callers that draw with src/voxel/materials.js voxelMaterials('normal'))
// Materials: MeshStandardMaterial, textures nearest-magnified and mipmapped (crisp pixels near, no shimmer far);
// metal parts get a metallic finish, glass parts (the smoked flap) see-through.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import MAN from './lowpix.manifest.json';

export const LP_MANIFEST = MAN;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const models = new Map(), pending = new Map();
const urlOf = (id) => new URL(`${import.meta.env.BASE_URL}models/lowpix/machines/${id}.glb`, document.baseURI).href;

function tidyTex(t) {
  if (!t) return;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
}
const matCache = new Map();
function gameMaterial(m) {
  if (matCache.has(m)) return matCache.get(m);
  const kind = (m.name || '').split(':')[1] || 'matte';
  tidyTex(m.map);
  let out;
  if (kind === 'glass') {
    out = new THREE.MeshPhysicalMaterial({ map: m.map, transparent: true, opacity: 0.62, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, depthWrite: false, side: m.side });
  } else {
    out = new THREE.MeshStandardMaterial({
      map: m.map, side: m.side, alphaTest: m.alphaTest || 0, transparent: false,
      roughness: kind === 'metal' ? 0.36 : kind === 'gloss' ? 0.42 : 0.82, metalness: kind === 'metal' ? 0.5 : 0,
      envMapIntensity: kind === 'metal' ? 1.1 : kind === 'gloss' ? 0.8 : 0.6,
    });
  }
  out.name = m.name;
  out.userData.lpKind = kind;
  if (m !== out) m.dispose();
  matCache.set(m, out);
  return out;
}

/** The decoded model: joint -> { geometry (groups per material), material: [] } */
function bake(gltf, id) {
  const e = MAN[id] || { nodes: {} };
  const parts = new Map();
  gltf.scene.updateMatrixWorld(true);
  for (const node of gltf.scene.children) {
    const name = node.name, piv = e.nodes[name]?.pivot || [0, 0, 0];
    const geos = [], mats = [];
    const back = new THREE.Matrix4().makeTranslation(-piv[0], -piv[1], -piv[2]);
    node.traverse((o) => {
      if (!o.isMesh) return;
      const g = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'uv']) {
        const a = o.geometry.attributes[k];
        if (!a) continue;
        const n = a.count, s = a.itemSize, arr = new Float32Array(n * s);
        for (let i = 0; i < n; i++) for (let j = 0; j < s; j++) arr[i * s + j] = a.getComponent(i, j);
        g.setAttribute(k, new THREE.BufferAttribute(arr, s));
      }
      if (o.geometry.index) g.setIndex(Array.from(o.geometry.index.array));
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(back, o.matrixWorld));
      if (!g.attributes.normal) g.computeVertexNormals();
      geos.push(g);
      mats.push(gameMaterial(o.material));
    });
    if (!geos.length) continue;
    const geometry = geos.length > 1 ? mergeGeometries(geos, true) : geos[0];
    if (geos.length === 1) geometry.addGroup(0, geometry.index ? geometry.index.count : geometry.attributes.position.count, 0);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    geometry.userData.lowpix = id + ':' + name;
    parts.set(name, { geometry, material: mats, pivot: new THREE.Vector3(...piv) });
  }
  return parts;
}

export function loadLP(id) {
  if (models.has(id)) return Promise.resolve(models.get(id));
  if (!pending.has(id)) {
    pending.set(id, loader.loadAsync(urlOf(id)).then((gltf) => {
      const parts = bake(gltf, id);
      models.set(id, parts);
      pending.delete(id);
      return parts;
    }));
  }
  return pending.get(id);
}
export const preloadLP = (ids) => Promise.all(ids.map((id) => loadLP(id).catch((e) => { console.warn('lowpix model failed to load:', id, e); return null; })));
export const lpReady = (id) => models.has(id);
export function lpPart(id, joint) { return models.get(id)?.get(joint) || null; }

/** A mesh of a joint (geometry in the joint's frame), or an empty group if the model isn't loaded. */
export function lpMesh(id, joint, o = {}) {
  const P = lpPart(id, joint);
  if (!P) return new THREE.Group();
  const m = new THREE.Mesh(P.geometry, o.material || P.material);
  m.name = `lp:${id}:${joint}`;
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  if (P.material.some((x) => x.transparent)) m.renderOrder = 3;
  return m;
}

/** Every joint (or the named ones) at its pivot, in one group. */
export function lpGroup(id, joints = null, o = {}) {
  const g = new THREE.Group();
  const parts = models.get(id);
  if (!parts) return g;
  for (const [name, P] of parts) {
    if (joints && !joints.includes(name)) continue;
    const m = lpMesh(id, name, o);
    m.position.copy(P.pivot);
    g.add(m);
  }
  return g;
}

const slotGeo = new Map();
/** The joint's geometry with its groups pointing into a shared material array (materials appended once). */
export function lpMaterialSlots(id, joint, arr) {
  const k = id + ':' + joint;
  const P = lpPart(id, joint);
  if (!P) return null;
  let ent = slotGeo.get(k);
  if (ent && ent.arr === arr) return ent.geo;
  const geo = P.geometry.clone();
  geo.clearGroups();
  for (const gr of P.geometry.groups) {
    const m = P.material[gr.materialIndex];
    let i = arr.indexOf(m);
    if (i < 0) { i = arr.length; arr.push(m); }
    geo.addGroup(gr.start, gr.count, i);
  }
  ent = { arr, geo };
  slotGeo.set(k, ent);
  return geo;
}
