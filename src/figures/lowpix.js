// The toy figures, modelled with lowpix (art/lowpix/figures: real models converted to painted textures, bases and
// props modelled in lowpix specs) and packed as one GLB per figure: public/models/lowpix/figures/<series>/<id>.glb.
// src/figures/lowpix.manifest.json (written by art/lowpix/figures/pack.mjs) knows every figure's size up front, so
// meshes are made synchronously: before its GLB has loaded a mesh holds an empty stand-in geometry of the right size
// (userData.size, bounding box), and the real geometry and materials are swapped in the moment it arrives.
//   lowpixMesh(item, finish)    a Mesh (merged rest pose, one draw per texture x material kind)
//   lowpixGeometry(item)        its geometry (the stand-in until loaded)
//   loadFigure(key) / figureReady(key) / preloadSeries(id)   lazy loading; a series' other figures follow in idle time
//   playFigureClip(mesh, role) / stopFigureClip(mesh)          gimmicks: the GLB's own joints and clips, live
//   figurePoint(item, name) / figurePartMesh(item, name)        toys.js: named points (pt_<name> joints), moving parts
// Finishes are material variants: each figure's atlases on clones of the shared finish materials (src/voxel/materials.js).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { voxelMaterials } from '../voxel/materials.js';
import MAN from './lowpix.manifest.json';

export const FIG_UNIT = 0.001; // metres per model unit (mm)
const ITEM_MAX = 0.088; // the largest dimension a figure may have (a shelf slot)
const KINDS = { matte: 0, gloss: 1, metal: 2, glow: 3, glass: 4 };
const NK = 6; // material kinds per texture in a material array

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const F = new Map(); // key -> { state, entry, gltf, geo, stand, texs, mats: Map(finish -> []), waiting: Set<WeakRef<Mesh>>, frame }
const listeners = new Set();
let events = null;

export const lowpixManifest = MAN;
export function isLowpix(item) { return !!(item && MAN[item.key]); }
export function figureReady(key) { return F.get(key)?.state === 'ready'; }
/** Optional: an event bus to announce loaded figures on ('figureReady', key). */
export function setFigureEvents(bus) { events = bus; }
export function onFigureReady(fn) { listeners.add(fn); return () => listeners.delete(fn); }

const urlOf = (key) => new URL(`${import.meta.env.BASE_URL}models/lowpix/figures/${key}.glb`, document.baseURI).href;

/** The mm -> metres frame of a figure: bottom-centred, scaled to fit a shelf slot. */
function frameOf(item) {
  const e = MAN[item.key];
  const [sx, sy, sz] = e.size, [mx, my, mz] = e.min;
  const maxDim = Math.max(sx, sy, sz) * FIG_UNIT;
  const sc = FIG_UNIT * (maxDim > ITEM_MAX ? ITEM_MAX / maxDim : 1) * (item.figScale || 1);
  return { cx: mx + sx / 2, cy: my, cz: mz + sz / 2, sc };
}

function rec(item) {
  let R = F.get(item.key);
  if (!R) {
    const fr = frameOf(item), e = MAN[item.key];
    const stand = new THREE.BufferGeometry();
    stand.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    const size = new THREE.Vector3(e.size[0] * fr.sc, e.size[1] * fr.sc, e.size[2] * fr.sc);
    stand.boundingBox = new THREE.Box3(new THREE.Vector3(-size.x / 2, 0, -size.z / 2), new THREE.Vector3(size.x / 2, size.y, size.z / 2));
    stand.boundingSphere = stand.boundingBox.getBoundingSphere(new THREE.Sphere());
    stand.userData = { size, fig: fr, pending: true, lowpix: true };
    R = { state: 'idle', item, entry: e, frame: fr, stand, geo: null, texs: [], mats: new Map(), waiting: new Set(), promise: null };
    F.set(item.key, R);
  }
  return R;
}

// ------------------------------------------------------------------ loading
const queue = []; // keys to fetch in idle time (a series' siblings)
let active = 0;
const MAX_ACTIVE = 3;

/** Load a figure's GLB (once). Resolves when its geometry is in. */
export function loadFigure(item) {
  const R = rec(item);
  if (!R.promise) {
    R.state = 'loading';
    active++;
    R.promise = loader.loadAsync(urlOf(item.key)).then((gltf) => {
      R.gltf = gltf;
      build(R);
      R.state = 'ready';
      for (const w of R.waiting) { const m = w.deref(); if (m) adopt(m, R); }
      R.waiting.clear();
      for (const fn of listeners) { try { fn(item.key); } catch (e) { console.warn(e); } }
      events?.emit('figureReady', item.key);
      return R;
    }).catch((e) => { R.state = 'failed'; console.warn('figure', item.key, e?.message || e); return R; })
      .finally(() => { active--; pump(); });
  }
  return R.promise;
}

function pump() {
  while (active < MAX_ACTIVE && queue.length) {
    const it = queue.shift();
    if (!rec(it).promise) loadFigure(it);
  }
}

/** Queue every figure of a series (the requested one first, the others as the loader frees up). */
export function preloadSeries(series, first = null) {
  if (!series?.items) return;
  for (const it of series.items) if (isLowpix(it) && it !== first && !rec(it).promise && !queue.includes(it)) queue.push(it);
  pump();
}
let seriesOf = null;
/** (collectibles.js) how to find an item's series, for the sibling prefetch. */
export function setSeriesLookup(fn) { seriesOf = fn; }

// ------------------------------------------------------------------ baking the rest pose into one geometry
const toFloat = (a) => {
  if (a.array instanceof Float32Array && !a.normalized) return a.clone();
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.BufferAttribute(out, a.itemSize);
};
function kindOf(o, mats) {
  for (let n = o; n; n = n.parent) {
    const nm = n.name || '';
    const base = nm.replace(/(_mirror)?(_\d+)?(_mirror)?$/, '');
    const k = mats[nm] ?? mats[base];
    if (k) return KINDS[k] ?? 0;
    if (n.userData?.figRoot) break;
  }
  return 0;
}

function build(R) {
  const { gltf, frame } = R;
  const scene = gltf.scene;
  scene.userData.figRoot = true;
  scene.updateMatrixWorld(true);
  const texIndex = new Map();
  const buckets = new Map(); // slot -> [geometry]
  const M = new THREE.Matrix4().makeTranslation(-frame.cx * frame.sc, -frame.cy * frame.sc, -frame.cz * frame.sc).multiply(new THREE.Matrix4().makeScale(frame.sc, frame.sc, frame.sc));
  const W = new THREE.Matrix4(), N = new THREE.Matrix3();
  const sep = new Set(R.entry.separate || []); // moving parts the game shows on their own (a wind-up key, a dart)
  const separated = (o) => { for (let n = o; n && n !== scene; n = n.parent) if (sep.has(n.name)) return true; return false; };
  scene.traverse((o) => {
    if (!o.isMesh || o.userData.figPart || (sep.size && separated(o))) return;
    const map = o.material?.map || null;
    if (map && !texIndex.has(map)) { texIndex.set(map, texIndex.size); tidy(map); }
    const ti = map ? texIndex.get(map) : 0;
    const slot = ti * NK + kindOf(o, R.entry.mats || {});
    const src = o.geometry, g = new THREE.BufferGeometry();
    g.setAttribute('position', toFloat(src.attributes.position));
    if (src.attributes.normal) g.setAttribute('normal', toFloat(src.attributes.normal));
    g.setAttribute('uv', src.attributes.uv ? toFloat(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (src.index) g.setIndex(src.index.clone());
    W.multiplyMatrices(M, o.matrixWorld);
    g.applyMatrix4(W);
    if (!g.attributes.normal) g.computeVertexNormals();
    // double-sided faces (cards, open walls): add the back faces
    if (o.material?.side === THREE.DoubleSide) addBackFaces(g);
    if (!buckets.has(slot)) buckets.set(slot, []);
    buckets.get(slot).push(g.index ? g : g.toNonIndexed());
    void N;
  });
  R.texs = [...texIndex.keys()];
  const slots = [...buckets.keys()].sort((a, b) => a - b);
  const parts = slots.map((s) => { const list = buckets.get(s).map((g) => (g.index ? g : g)); return mergeGeometries(list.map((g) => (g.index ? g : indexed(g))), false); });
  const geo = mergeGeometries(parts, true);
  geo.groups.forEach((gr, i) => { gr.materialIndex = slots[i]; });
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  geo.userData = { size: geo.boundingBox.getSize(new THREE.Vector3()), fig: frame, lowpix: true };
  R.geo = geo;
  R.tris = geo.index.count / 3;
}
function indexed(g) { const n = g.attributes.position.count, idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); return g; }
function addBackFaces(g) {
  const idx = g.index ? [...g.index.array] : [...Array(g.attributes.position.count).keys()];
  const n = g.attributes.position.count;
  const grow = (a, flip) => { const out = new Float32Array(a.count * 2 * a.itemSize); out.set(a.array); for (let i = 0; i < a.count * a.itemSize; i++) out[a.count * a.itemSize + i] = flip ? -a.array[i] : a.array[i]; return new THREE.BufferAttribute(out, a.itemSize); };
  g.setAttribute('position', grow(g.attributes.position, false));
  g.setAttribute('normal', grow(g.attributes.normal, true));
  g.setAttribute('uv', grow(g.attributes.uv, false));
  const back = [];
  for (let i = 0; i < idx.length; i += 3) back.push(idx[i] + n, idx[i + 2] + n, idx[i + 1] + n);
  g.setIndex([...idx, ...back]);
}
function tidy(t) {
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
}

// ------------------------------------------------------------------ finishes (material variants)
/** The material array of a loaded figure in a finish: NK kinds (matte, gloss, metal, glow, glass, card) per atlas. */
function materials(R, finish = 'normal') {
  let mats = R.mats.get(finish);
  if (mats) return mats;
  const base = voxelMaterials(finish);
  mats = [];
  for (const tex of R.texs.length ? R.texs : [null]) {
    const made = new Map();
    for (let k = 0; k < NK; k++) {
      const b = base[k] || base[0];
      let m = made.get(b);
      if (!m) {
        m = b.clone();
        m.vertexColors = false;
        m.map = tex;
        if (!m.transparent) m.alphaTest = 0.5;
        m.onBeforeCompile = b.onBeforeCompile;
        if (b.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) m.customProgramCacheKey = b.customProgramCacheKey;
        made.set(b, m);
      }
      mats.push(m);
    }
  }
  R.mats.set(finish, mats);
  return mats;
}
const STAND_MATS = [new THREE.MeshBasicMaterial({ visible: false })];

function adopt(mesh, R) {
  if (mesh.userData.figLive) return; // posed by a clip: it swaps back when the clip ends
  mesh.geometry = R.geo;
  if (mesh.userData.mat0) mesh.userData.mat0 = null; // (a variant was painted over the stand-in: redone below)
  mesh.material = materials(R, mesh.userData.finish || 'normal');
  const redo = mesh.userData.redecorate;
  if (redo) { delete mesh.userData.redecorate; try { redo(); } catch (e) { console.warn('figure variant', e); } }
}

/** A mesh of a figure in a finish (the stand-in until the GLB is in; it loads now, its series after it). */
export function lowpixMesh(item, finish = 'normal') {
  const R = rec(item);
  const ready = R.state === 'ready';
  const mesh = new THREE.Mesh(ready ? R.geo : R.stand, ready ? materials(R, finish) : STAND_MATS);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.itemKey = item.key; mesh.userData.finish = finish;
  if (item.gimmick || R.entry.clips?.gimmick) mesh.userData.gimmick = item.gimmick || { text: 'Work the gimmick' };
  if (!ready) {
    mesh.userData.pending = true;
    R.waiting.add(new WeakRef(mesh));
    loadFigure(item).then(() => { delete mesh.userData.pending; });
    if (seriesOf) preloadSeries(seriesOf(item), item);
  }
  return mesh;
}

/** The figure's geometry (merged rest pose; the stand-in until it has loaded). */
export function lowpixGeometry(item) {
  const R = rec(item);
  if (R.state !== 'ready') loadFigure(item);
  return R.geo || R.stand;
}
/** The size (metres) a figure will have, known before it loads. */
export function lowpixSize(item) { return rec(item).stand.userData.size; }

// ------------------------------------------------------------------ live rigs: clips (gimmicks)
const live = new Set();
/** Swap a figure mesh for its jointed GLB scene and play a clip (role 'gimmick' or a clip name). Returns the clip length. */
export function playFigureClip(mesh, role = 'gimmick', { loop = false, reverse = false } = {}) {
  const item = { key: mesh?.userData?.itemKey };
  const R = F.get(item.key);
  if (!R || R.state !== 'ready') return 0;
  const name = R.entry.clips?.[role] || role;
  const clip = R.gltf.animations.find((a) => a.name === name);
  if (!clip) return 0;
  let L = mesh.userData.figLive;
  if (!L) {
    const rig = R.gltf.scene.clone(true);
    const mats = materials(R, mesh.userData.finish || 'normal');
    rig.traverse((o) => {
      if (!o.isMesh) return;
      const ti = Math.max(0, R.texs.indexOf(o.material?.map));
      o.material = mats[ti * NK + kindOf(o, R.entry.mats || {})];
      o.castShadow = mesh.castShadow; o.receiveShadow = true;
      o.raycast = () => {};
    });
    const fr = R.frame;
    rig.scale.setScalar(fr.sc);
    rig.position.set(-fr.cx * fr.sc, -fr.cy * fr.sc, -fr.cz * fr.sc);
    const mixer = new THREE.AnimationMixer(rig);
    L = mesh.userData.figLive = { rig, mixer, was: mesh.geometry, action: null, t: 0 };
    mesh.add(rig);
    mesh.geometry = R.stand;
    live.add(mesh);
  }
  L.action?.stop();
  const a = L.mixer.clipAction(clip);
  a.reset();
  a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  a.clampWhenFinished = true;
  a.timeScale = reverse ? -1 : 1;
  if (reverse) a.time = clip.duration;
  a.play();
  L.action = a;
  L.end = loop ? Infinity : clip.duration + 0.05;
  L.t = 0;
  return clip.duration;
}
/** Back to the single merged mesh. */
export function stopFigureClip(mesh) {
  const L = mesh?.userData?.figLive;
  if (!L) return;
  L.mixer.stopAllAction();
  mesh.remove(L.rig);
  const R = F.get(mesh.userData.itemKey);
  mesh.geometry = R?.geo || L.was;
  delete mesh.userData.figLive;
  live.delete(mesh);
}
export function figureClipPlaying(mesh) { const L = mesh?.userData?.figLive; return !!L && L.t < L.end; }
/** Per frame (src/plugins/figures.js): advance live clips; a finished one-shot clip returns the mesh to rest. */
export function updateFigureClips(dt) {
  for (const m of live) {
    const L = m.userData.figLive;
    if (!L) { live.delete(m); continue; }
    L.mixer.update(dt);
    L.t += dt;
    if (!m.parent && L.t > 0.5) { stopFigureClip(m); continue; } // dropped / disposed
    if (L.t > L.end + 0.6 && !L.hold) stopFigureClip(m);
  }
}

// ------------------------------------------------------------------ toys.js: named points and moving parts
const _v = new THREE.Vector3();
/** A named gimmick point (the joint pt_<name>) in the figure mesh's local space (metres). */
export function figurePoint(item, name, out = new THREE.Vector3()) {
  const R = F.get(item.key);
  if (!R || R.state !== 'ready') return out.set(0, R ? R.stand.userData.size.y * 0.5 : 0, 0);
  const node = R.gltf.scene.getObjectByName(MAN[item.key].pts?.[name] || 'pt_' + name);
  if (!node) return out.set(0, R.geo.userData.size.y * 0.5, 0);
  node.getWorldPosition(_v);
  const fr = R.frame;
  return out.set((_v.x - fr.cx) * fr.sc, (_v.y - fr.cy) * fr.sc, (_v.z - fr.cz) * fr.sc);
}
const partGeos = new Map();
/** A moving part (a node subtree of the GLB) as its own mesh: in the figure's frame, or around its own pivot (own). */
export function figurePartMesh(item, name, { own = false, finish = 'normal' } = {}) {
  const R = F.get(item.key);
  const m = new THREE.Mesh(undefined, R?.state === 'ready' ? materials(R, finish) : STAND_MATS);
  m.castShadow = true;
  if (!R || R.state !== 'ready') { m.geometry = new THREE.BufferGeometry(); return m; }
  const ck = item.key + ':' + name + (own ? ':own' : '');
  let g = partGeos.get(ck);
  if (!g) {
    const node = R.gltf.scene.getObjectByName(name);
    const fr = R.frame;
    const list = [];
    if (node) {
      R.gltf.scene.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(node.matrixWorld).invert();
      const S = new THREE.Matrix4().makeScale(fr.sc, fr.sc, fr.sc);
      const M = own ? S.clone().multiply(inv) : new THREE.Matrix4().makeTranslation(-fr.cx * fr.sc, -fr.cy * fr.sc, -fr.cz * fr.sc).multiply(S);
      node.traverse((o) => {
        if (!o.isMesh) return;
        const gg = new THREE.BufferGeometry();
        gg.setAttribute('position', toFloat(o.geometry.attributes.position));
        gg.setAttribute('normal', toFloat(o.geometry.attributes.normal));
        gg.setAttribute('uv', toFloat(o.geometry.attributes.uv));
        if (o.geometry.index) gg.setIndex(o.geometry.index.clone()); else indexed(gg);
        gg.applyMatrix4(new THREE.Matrix4().multiplyMatrices(M, o.matrixWorld));
        const ti = Math.max(0, R.texs.indexOf(o.material?.map));
        gg.userData.slot = ti * NK + kindOf(o, R.entry.mats || {});
        list.push(gg);
      });
    }
    g = list.length ? mergeGeometries(list, true) : new THREE.BufferGeometry();
    if (list.length) g.groups.forEach((gr, i) => { gr.materialIndex = list[i].userData.slot; });
    g.computeBoundingBox?.();
    partGeos.set(ck, g);
  }
  m.geometry = g;
  return m;
}

/** Stats for dev pages. */
export function figureStats() {
  let n = 0, tris = 0, loaded = 0;
  for (const R of F.values()) { n++; if (R.state === 'ready') { loaded++; tris += R.tris || 0; } }
  return { figures: Object.keys(MAN).length, known: n, loaded, tris };
}
