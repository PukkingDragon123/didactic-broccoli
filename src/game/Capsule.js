// Gacha capsules as voxel art, after the real ones from Japanese gashapon makers:
//  * 'clear'  - Bandai style: clear top, coloured bottom, a moulded seam ring (Ø55 / 65 / 75 mm by price)
//  * 'tab'    - Takara Tomy A.R.T.S / old Yujin style: the same with a hinge tab you thumb open
//  * 'opaque' - Kitan Club style: both halves coloured, you can't peek at the contents
//  * 'paper'  - the eco paper capsules: one matte pulp sphere printed in the series colours
// Every capsule holds a folded paper insert (the mini catalogue, printed in the series' card colours) and the figure
// in a little bag. Halves are built neutral-white and tinted by material / instance colour, so all capsules of a
// size share geometry; machine windows draw their piles instanced (pileGeometries).
import * as THREE from 'three';
import { SERIES_BY_ID } from '../data/series/index.js';
import { VoxelModel, gloss, glass } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';

/** Capsule radii (m): Ø55, Ø65 and Ø75 mm. */
export const CAPSULE_R = { S: 0.0275, M: 0.0325, L: 0.0375 };

export function capsuleSize(seriesId) {
  const s = SERIES_BY_ID[seriesId];
  if (s?.capsule?.size) return s.capsule.size;
  const p = s?.price || 100;
  return p <= 200 ? 'S' : p <= 500 ? 'M' : 'L';
}
export function capsuleRadius(seriesId) { return CAPSULE_R[capsuleSize(seriesId)]; }

// which maker's capsule each series ships in (a series can set capsule.style itself)
const STYLE_BY_SERIES = {
  mochi: 'clear', shokudo: 'tab', kasa: 'paper', showa: 'tab', konbini: 'clear', heya: 'paper', yokai: 'opaque',
  onsen: 'clear', dajare: 'tab', kaiju: 'clear', uchu: 'clear', omamori: 'paper', neko_cafe: 'clear', wagashi: 'paper',
  matsuri: 'tab', sentai: 'clear', densha: 'tab', umi: 'clear', obake_yashiki: 'opaque', bizarre: 'opaque',
};
export function capsuleStyle(seriesId) { return SERIES_BY_ID[seriesId]?.capsule?.style || STYLE_BY_SERIES[seriesId] || 'clear'; }

/** Pick a capsule colour for a series. */
export function capsuleColor(seriesId, rnd = Math.random) {
  const cols = SERIES_BY_ID[seriesId]?.capsule?.colors || [0xff9eb5, 0x9ed8ff, 0xfff09e];
  return cols[Math.floor(rnd() * cols.length)];
}

const hexOf = (s, d) => parseInt(String(s || d).replace('#', ''), 16);

// ------------------------------------------------------------------ voxel halves
// N = voxels across (even). The sphere is centred between voxels; the seam is at y = 0 (top half y >= 0).
const inSphere = (x, y, z, R) => (x + 0.5) ** 2 + (y + 0.5) ** 2 + (z + 0.5) ** 2 <= (R + 0.15) ** 2;

/** One half shell. part 'top' | 'bottom'; kind as the style; returns a VoxelModel. */
function halfModel(N, part, kind) {
  const v = new VoxelModel();
  v.jitter = 0;
  const R = N / 2, ri = R - 1.15;
  const top = part === 'top';
  const paper = kind === 'paper';
  const clear = top && (kind === 'clear' || kind === 'tab');
  const W = 0xffffff, rim = 0xd2d2d2, shadeC = 0xe6e6e6;
  for (let y = top ? 0 : -R; y < (top ? R : 0); y++) for (let x = -R; x < R; x++) for (let z = -R; z < R; z++) {
    if (!inSphere(x, y, z, R) || inSphere(x, y, z, ri)) continue;
    if (clear) { v.set(x, y, z, glass(0xeef8ff)); continue; }
    let c = W;
    const band = top ? y === 0 : y === -1;
    if (band) c = rim; // the seam ring
    else if (paper) {
      // eco capsule: pulp grain in the white areas (the print is added per series in the contents)
      const h = ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0;
      c = h % 7 === 0 ? 0xf0f0ea : W;
    } else if (!top && y === -R + 1) c = shadeC; // a slightly darker base dimple
    v.set(x, y, z, paper ? c : gloss(c));
  }
  // the seam lip stands proud of the coloured half
  if (!top) for (let x = -R - 1; x <= R; x++) for (let z = -R - 1; z <= R; z++) {
    const d = (x + 0.5) ** 2 + (z + 0.5) ** 2;
    if (d <= (R + 0.55) ** 2 && d > (R - 0.6) ** 2 && !v.has(x, -1, z)) v.set(x, -1, z, paper ? rim : gloss(rim));
  }
  // hinge tab (Takara Tomy / Yujin)
  if (kind === 'tab' && !top) { v.box(-1, -2, R, 0, -1, R, gloss(rim)); v.set(-1, -3, R - 1, gloss(rim)); v.set(0, -3, R - 1, gloss(rim)); }
  return v;
}

/** Contents seen through the clear top: the folded insert (series colours) and the bagged figure. */
function contentsModel(N, seriesId) {
  const s = SERIES_BY_ID[seriesId];
  const v = new VoxelModel();
  v.jitter = 0;
  const bg = hexOf(s?.card?.bg, '#ffffff'), ac = hexOf(s?.card?.accent, '#e5383b'), ac2 = hexOf(s?.card?.accent2, '#ffd23f');
  const R = N / 2;
  const w = Math.max(3, Math.round(R * 1.1)), d = Math.max(2, Math.round(R * 0.8));
  // folded paper on edge, leaning, at the back
  for (let x = -w; x < w; x++) for (let y = -2; y < Math.round(R * 0.7); y++) {
    const z = -Math.round(R * 0.35) - (y > 1 ? 1 : 0);
    if (!inSphere(x, y, z, R - 1.3)) continue;
    const hdr = y >= Math.round(R * 0.7) - 2;
    let c = hdr ? ac : bg;
    if (!hdr && x > -w + 1 && x < w - 2 && y > -1 && y % 2 === 0) c = (x & 1) ? 0x9a9a9a : 0xb8b8b8; // text lines
    if (!hdr && x >= w - 3 && x < w - 1 && y >= 0 && y <= 1) c = ac2; // a tiny photo of the figure
    v.set(x, y, z, c);
  }
  // the bagged figure: a little blob in the series colour behind a bag of clear film
  const by = -Math.round(R * 0.25);
  for (let x = -2; x <= 1; x++) for (let y = by - 2; y <= by + 1; y++) for (let z = -1; z <= Math.round(R * 0.4); z++) {
    if (!inSphere(x, y, z, R - 1.4)) continue;
    const core = Math.abs(x + 0.5) < 1.2 && y > by - 2 && y < by + 1 && z < Math.round(R * 0.4);
    v.set(x, y, z, core ? ac2 : glass(0xf2f6ff));
  }
  void d;
  return v;
}

/** The paper capsule's printed outer design: series accent band + dots, as a thin paint shell over the half. */
function paperPrint(N, part, seriesId) {
  const s = SERIES_BY_ID[seriesId];
  const ac = hexOf(s?.card?.accent, '#e5383b'), bg = hexOf(s?.card?.bg, '#fff3e0');
  const half = halfModel(N, part, 'paper');
  const R = N / 2;
  half.recolor((x, y, z, c) => {
    if (c === 0xd2d2d2) return ac; // the seam ring in the accent colour
    const top = part === 'top';
    const lat = top ? y : -1 - y; // 0 at the seam
    if (lat >= R - 2) return bg; // the pole caps
    if (lat >= 1 && lat <= 2) return ac; // a printed band
    if (((x + z + 64) % 4 === 0) && ((y + 64) % 3 === 1)) return ac; // dots
    return bg;
  });
  return half;
}

// ------------------------------------------------------------------ geometry + materials (cached)
const RES = { hi: 16, lo: 10 };
const geoCache = new Map();
function partGeo(key, build, r, N) {
  if (!geoCache.has(key)) geoCache.set(key, meshVoxels(build(), { voxelSize: (2 * r) / N, origin: 'none' }));
  return geoCache.get(key);
}
// origin 'none': voxel x spans [x, x + 1] * vs, so the sphere (voxels -N/2 .. N/2 - 1) is centred on the origin
// with the seam at y = 0
function halfGeo(size, part, kind, res, seriesId = null) {
  const N = RES[res], r = CAPSULE_R[size];
  const key = `${size}|${part}|${kind}|${res}|${kind === 'paper' ? seriesId : ''}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const model = kind === 'paper' ? paperPrint(N, part, seriesId) : halfModel(N, part, kind);
  const vs = (2 * r) / N;
  const g = meshVoxels(model, { voxelSize: vs, origin: 'none' });
  geoCache.set(key, g);
  return g;
}

const matCache = new Map();
function capMats(kind, color) {
  const k = kind + ':' + color;
  if (matCache.has(k)) return matCache.get(k);
  let m;
  if (kind === 'clearTop') {
    const glassM = new THREE.MeshPhysicalMaterial({ vertexColors: true, color: 0xffffff, roughness: 0.06, transparent: true, opacity: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, envMapIntensity: 1.6 });
    m = [glassM, glassM, glassM, glassM, glassM];
  } else if (kind === 'paper') {
    const pm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    m = [pm, pm, pm, pm, pm];
  } else if (kind === 'contents') {
    const paper = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const bag = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.25, transparent: true, opacity: 0.45, depthWrite: false });
    m = [paper, paper, paper, paper, bag];
  } else {
    // coloured plastic (tinted white voxels)
    const pl = new THREE.MeshPhysicalMaterial({ vertexColors: true, color, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.08 });
    m = [pl, pl, pl, pl, pl];
  }
  matCache.set(k, m);
  return m;
}

/**
 * Build a capsule group. Returns { group, top, bottom, r, paper, style }.
 * top / bottom are sub-groups (pivot on the seam) that twist apart when opening; paper is the insert.
 */
export function makeCapsule(seriesId, color, opts = {}) {
  const size = opts.size || capsuleSize(seriesId);
  const r = CAPSULE_R[size];
  const kind = opts.style || capsuleStyle(seriesId);
  const res = opts.res || 'hi';
  const N = RES[res];
  const group = new THREE.Group();
  const top = new THREE.Group();
  const bottom = new THREE.Group();
  group.add(top, bottom);
  const mk = (geo, mats, parent) => {
    const m = new THREE.Mesh(geo, mats);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const topKind = kind === 'paper' ? 'paper' : kind === 'opaque' ? 'color' : 'clearTop';
  const topColor = kind === 'opaque' ? tintHex(color, 0.62) : 0xffffff; // Kitan-style: a pale top over the coloured half
  const tm = mk(halfGeo(size, 'top', kind, res, seriesId), capMats(topKind, topColor), top);
  if (topKind === 'clearTop') { tm.renderOrder = 2; tm.castShadow = false; }
  mk(halfGeo(size, 'bottom', kind, res, seriesId), capMats(kind === 'paper' ? 'paper' : 'color', color), bottom);
  // contents (also there in opaque / paper capsules: you see them once it opens)
  let paper = null;
  if (res === 'hi') {
    const cg = partGeo(`contents|${size}|${seriesId}`, () => contentsModel(N, seriesId), r, N);
    paper = new THREE.Mesh(cg, capMats('contents', 0));
    bottom.add(paper);
  }
  group.userData.capsule = true;
  const cap = { group, top, bottom, r, paper, style: kind, size };
  installTwist(cap);
  return cap;
}

function tintHex(hex, t) {
  return new THREE.Color(hex).lerp(new THREE.Color(0xfff8ee), t).getHex();
}

// ------------------------------------------------------------------ twist-open feel
// Held.js twists the halves by writing top.rotation.y (0 -> 1.4 rad as it opens). The top half here turns in
// ratchet clicks (15° steps, like the real seam detents), the seam pops a hair apart near the end, and the lid
// tilts off its last detent: tactile without changing the caller.
function installTwist(cap) {
  const top = cap.top;
  const rot = top.rotation, q = top.quaternion;
  const STEP = Math.PI / 12;
  const e = new THREE.Euler();
  rot._onChange(() => {
    const k = Math.min(1, Math.max(0, rot.y / 1.4));
    const stepped = Math.round(rot.y / STEP) * STEP;
    const lift = k > 0.85 ? (k - 0.85) / 0.15 : 0;
    e.set(rot.x + lift * 0.18, stepped, rot.z + lift * 0.06, rot.order);
    q.setFromEuler(e, false);
    cap.twistK = k;
  });
  cap.setTwist = (k) => { rot.y = k * 1.4; top.position.y = k * cap.r * 0.12; };
}

// ------------------------------------------------------------------ the empty shell (after opening)
/** The two empty halves nested together (what is left in your hand once the figure is out). */
export function makeShell(seriesId, color, opts = {}) {
  const cap = makeCapsule(seriesId, color, { ...opts, res: opts.res || 'hi' });
  if (cap.paper) { cap.paper.parent.remove(cap.paper); cap.paper = null; }
  // the top half nests into the bottom one, tipped a little: the way people hand back empty capsules
  cap.top.rotation.set(Math.PI + 0.25, 0.6, 0.1);
  cap.top.position.set(cap.r * 0.08, -cap.r * 0.12, 0);
  cap.group.userData.shell = true;
  return cap;
}

// ------------------------------------------------------------------ instanced piles (machine windows)
/**
 * Shared low-res geometry for capsules piled in machine windows, per style + size. The bottom half is white for
 * instance tinting; the top is clear (or tinted for opaque styles). Returns { top, bottom, topMat, bottomMat, offset }.
 */
export function pileGeometries(size = 'M', kind = 'clear', seriesId = null) {
  const r = CAPSULE_R[size];
  const paper = kind === 'paper';
  const top = halfGeo(size, 'top', kind, 'lo', seriesId);
  const bottom = halfGeo(size, 'bottom', kind, 'lo', seriesId);
  const topMat = paper ? capMats('paper', 0)[0] : kind === 'opaque' ? pileTint() : capMats('clearTop', 0)[0];
  const bottomMat = paper ? capMats('paper', 0)[0] : pileTint();
  return { top, bottom, topMat, bottomMat, r };
}
let _pileTint = null;
function pileTint() {
  if (!_pileTint) _pileTint = new THREE.MeshPhysicalMaterial({ vertexColors: true, color: 0xffffff, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.1 });
  return _pileTint;
}
