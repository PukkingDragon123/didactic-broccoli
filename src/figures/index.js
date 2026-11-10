// Sculpted figures as collectibles. An item of a series with `figure: (S) => { ... }` (a Sculpt program, see
// src/figures/sculpt.js) is built here instead of on the voxel grid; src/game/collectibles.js hands such items over, so
// makeItemMesh / itemGeometry return the same kind of thing for both: one Mesh, bottom-centred, facing +z, metres,
// geometry.userData.size, a material array shared by the whole series and finish (so machines can merge them).
//
// Gimmicks: parts built inside S.part(name, { rest, move }) are baked into the resting pose. playGimmick(mesh, t) splits
// them off as child meshes and poses them (t = 0..1); stopGimmick(mesh) puts the resting geometry back.
import * as THREE from 'three';
import { Sculpt, QUAL } from './sculpt.js';
import { FigureAtlas } from './bake.js';
import { figureMaterials } from './materials.js';
import { SERIES_BY_ID, ITEMS_BY_KEY } from '../data/series/index.js';
import { idleJob } from '../core/idle.js';

export const FIGURE_MAX = 0.088; // largest dimension in metres (a shelf slot)
const atlases = new Map(); // series id -> FigureAtlas
const built = new Map(); // item key -> { full, body, parts, size, defs, C, Ci, tris }

export const isFigure = (item) => typeof item?.figure === 'function';
export const hasFigure = (key) => built.has(key);
export const hasFigureLod = (key) => built.has(key + '|lo');
/** The painted atlas of a series (series.atlas: [w, h] for a set that needs more than the default 2048 x 1024). */
export function figureAtlas(seriesId) {
  let a = atlases.get(seriesId);
  if (!a) { const sz = SERIES_BY_ID[seriesId]?.atlas || [2048, 1024]; atlases.set(seriesId, a = new FigureAtlas(sz[0], sz[1])); }
  return a;
}

function geometry(list, C, nm) {
  // list: [{ pos, nrm, uv, slot, m (Matrix4 | null) }] -> one BufferGeometry, groups by slot
  list = list.slice().sort((a, b) => a.slot - b.slot);
  const n = list.reduce((a, b) => a + b.pos.length, 0);
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), T = new Float32Array(n * 2), g = new THREE.BufferGeometry();
  const v = new THREE.Vector3(), m3 = new THREE.Matrix3();
  let o = 0;
  for (const slot of [0, 1]) {
    const start = o;
    for (const b of list) {
      if (b.slot !== slot) continue;
      if (b.m) m3.getNormalMatrix(b.m);
      for (let i = 0; i < b.pos.length; i++, o++) {
        v.fromArray(b.pos[i]); if (b.m) v.applyMatrix4(b.m); v.applyMatrix4(C);
        P[o * 3] = v.x; P[o * 3 + 1] = v.y; P[o * 3 + 2] = v.z;
        v.fromArray(b.nrm[i]); if (b.m) v.applyMatrix3(m3); v.applyMatrix3(nm).normalize();
        N[o * 3] = v.x; N[o * 3 + 1] = v.y; N[o * 3 + 2] = v.z;
        T[o * 2] = b.uv[i][0]; T[o * 2 + 1] = b.uv[i][1];
      }
    }
    if (o > start) g.addGroup(start, o - start, slot);
  }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(T, 2));
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

export const HI = 1.4; // how much finer the figure in your hand is cut than the one on a shelf (see QUAL in sculpt.js)

/**
 * Build (once) and return everything about a figure item. lod: the light level of detail (the counts the sculpt asks
 * for, half the texel density) for shelves, machines and small thumbnails; otherwise the full one (x HI: smooth in the hand).
 */
export function figureData(item, lod = false) {
  const ck = lod ? item.key + '|lo' : item.key;
  const F = built.get(ck);
  if (F) return F;
  const job = pending.get(ck);
  if (job) { job.finish(); return built.get(ck); } // (it was being baked in idle time: finish it now)
  const g = build(item, lod);
  let r;
  while (!(r = g.next()).done);
  return r.value;
}
const pending = new Map();
/** Bake a figure in idle time (src/core/idle.js), so its first appearance costs no frame. Returns the job (or null). */
export function prebakeFigure(item, lod = false) {
  const ck = lod ? item.key + '|lo' : item.key;
  if (built.has(ck) || pending.has(ck)) return pending.get(ck) || null;
  const job = idleJob(build(item, lod), { onDone: () => pending.delete(ck) });
  pending.set(ck, job);
  return job;
}
function* build(item, lod) {
  const ck = lod ? item.key + '|lo' : item.key;
  const S = new Sculpt(), k0 = QUAL.k;
  QUAL.k = lod ? 1 : HI;
  S.texel = lod ? 0.5 : 1;
  try { item.figure(S); } finally { QUAL.k = k0; }
  yield;
  const atlas = figureAtlas(item.series);
  const { buckets, tris } = yield* atlas.bakeGen(S);
  const bb = S.bounds(), sz = bb.getSize(new THREE.Vector3());
  const k = 0.001 * Math.min(1, FIGURE_MAX / (Math.max(sz.x, sz.y, sz.z) * 0.001));
  // millimetres -> the mesh's metres: bottom-centred on the resting pose
  const C = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2));
  const nm = new THREE.Matrix3().getNormalMatrix(C), all = [...buckets.values()];
  const rest = {};
  for (const name of Object.keys(S.parts)) rest[name] = S.jointMatrix(name);
  const size = sz.clone().multiplyScalar(k);
  const tag = (g) => { g.userData.size = size; g.userData.figure = item.key; return g; };
  yield;
  const full = tag(geometry(all.map((b) => ({ ...b, m: b.part ? rest[b.part] : null })), C, nm));
  const F = { key: item.key, lod, atlas, full, size, tris, sculpt: S, defs: S.parts, C, Ci: C.clone().invert(), buckets, body: null, parts: null, tag, nm };
  built.set(ck, F);
  pending.delete(ck);
  return F;
}

/** The resting-pose geometry of a figure item (o.lowres: the light level of detail). */
export const figureGeometry = (item, o = {}) => figureData(item, !!o.lowres).full;

/** A mesh of a figure item in a finish. o.lowres: the light level of detail. */
export function makeFigureMesh(item, finish = 'normal', o = {}) {
  const F = figureData(item, !!o.lowres);
  const mesh = new THREE.Mesh(F.full, figureMaterials(F.atlas, finish));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.itemKey = item.key;
  mesh.userData.finish = finish;
  if (item.gimmick) mesh.userData.gimmick = item.gimmick;
  return mesh;
}

// ------------------------------------------------------------------ the rig, live
function split(F) {
  if (F.body) return;
  const all = [...F.buckets.values()];
  F.body = F.tag(geometry(all.filter((b) => !b.part).map((b) => ({ ...b, m: null })), F.C, F.nm));
  F.parts = {};
  for (const name of Object.keys(F.defs)) F.parts[name] = geometry(all.filter((b) => b.part === name).map((b) => ({ ...b, m: null })), F.C, F.nm);
}
const _m = new THREE.Matrix4();
/** The joints of a figure: { name: { min, max, rest, parent, idle } } (for posing tools and the dev studio). */
export function figureJoints(item) { return figureData(item).defs; }
/**
 * Pose a figure mesh: t = the gimmick (0..1), add = { joint: offset } on top (clamped to each joint's limits), values =
 * { joint: value } to set joints outright. The first call swaps in the full-detail figure with its joints split off
 * as child meshes; stopGimmick puts the single resting mesh back.
 */
export function playGimmick(mesh, t, add = null, values = null) {
  const item = ITEMS_BY_KEY[mesh?.userData?.itemKey];
  if (!item || !isFigure(item)) return false;
  const F = figureData(item);
  if (!Object.keys(F.defs).length) return false;
  let G = mesh.userData.gimmickLive;
  if (!G) {
    split(F);
    G = mesh.userData.gimmickLive = { nodes: [], was: mesh.geometry };
    mesh.geometry = F.body;
    for (const name of Object.keys(F.defs)) {
      const c = new THREE.Mesh(F.parts[name], mesh.material);
      c.matrixAutoUpdate = false;
      c.castShadow = mesh.castShadow; c.receiveShadow = true;
      c.userData.noDecal = true; c.userData.gimmickPart = name;
      c.layers.mask = mesh.layers.mask;
      mesh.add(c);
      G.nodes.push({ c, name });
    }
  }
  const pose = { t: t ?? F.sculpt.restT, add, values };
  for (const { c, name } of G.nodes) {
    c.material = mesh.material;
    c.matrix.copy(F.C).multiply(_m.copy(F.sculpt.jointMatrix(name, pose))).multiply(F.Ci);
    c.matrixWorldNeedsUpdate = true;
  }
  return true;
}
/** Back to the single resting-pose mesh. */
export function stopGimmick(mesh) {
  const G = mesh?.userData?.gimmickLive;
  if (!G) return;
  for (const { c } of G.nodes) mesh.remove(c);
  mesh.geometry = G.was;
  delete mesh.userData.gimmickLive;
}
/** The gimmick's t in the resting pose (what the single mesh shows). */
export function gimmickRest(mesh) {
  const item = ITEMS_BY_KEY[mesh?.userData?.itemKey];
  return item && isFigure(item) ? figureData(item).sculpt.restT : 0;
}
