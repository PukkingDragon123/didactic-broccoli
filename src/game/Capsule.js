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
const sh2 = (c) => (((c >> 16) & 255) * 0.86 << 16) | (((c >> 8) & 255) * 0.86 << 8) | ((c & 255) * 0.86);

// ------------------------------------------------------------------ voxel halves
// N = voxels across (even). The sphere is centred between voxels; the seam is at y = 0 (top half y >= 0). The two
// rows either side of the seam have the same outline, so the seal tape (src/game/capsuleSeals.js) sits flush on both.
const inSphere = (x, y, z, R) => (x + 0.5) ** 2 + (y + 0.5) ** 2 + (z + 0.5) ** 2 <= (R + 0.15) ** 2;
/** Voxels across a capsule at each resolution (in hands / on the floor, and in machine windows and cartons). */
export const RES = { hi: 20, lo: 12 };

/** One half shell. part 'top' | 'bottom'; kind as the style; returns a VoxelModel. */
function halfModel(N, part, kind, solid = false) {
  const v = new VoxelModel();
  v.jitter = 0;
  const R = N / 2, ri = R - 1.2;
  const top = part === 'top';
  const paper = kind === 'paper';
  // the clear top is solid: one clean outer surface (a hollow clear shell shows its own inside, and sorts badly)
  const clear = top && (kind === 'clear' || kind === 'tab');
  const W = 0xffffff;
  for (let y = top ? 0 : -R; y < (top ? R : 0); y++) for (let x = -R; x < R; x++) for (let z = -R; z < R; z++) {
    if (!inSphere(x, y, z, R)) continue;
    if (!clear && !solid && inSphere(x, y, z, ri)) continue;
    if (clear) {
      // clear plastic: the moulded rim at the seam frosted, a faint ring of the mould line, the dome itself clearest
      const lat = y;
      v.set(x, y, z, glass(lat === 0 ? 0xf4f8fb : lat === 1 ? 0xdcecf8 : lat >= R - 2 && Math.abs(x + 0.5) < 1.6 && Math.abs(z + 0.5) < 1.6 ? 0xe8f2fa : 0xc8e2f6));
      continue;
    }
    const lat = top ? y : -1 - y; // rows from the seam
    let c = W;
    if (lat === 0) c = 0xd4d4d4; // the seam band
    else if (lat === 1 && !top) c = 0xececec; // the shadow under the rim
    else if (lat === R - 1 && Math.abs(x + 0.5) < 1.6 && Math.abs(z + 0.5) < 1.6) c = 0xdedede; // the mould's gate mark at the pole
    if (paper) {
      // eco capsule: pulp grain in the white areas (the print is added per series in the contents)
      const h = ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0;
      if (c === W) c = h % 7 === 0 ? 0xf0f0ea : h % 11 === 0 ? 0xf8f6f0 : W;
    }
    v.set(x, y, z, paper ? c : gloss(c));
  }
  // hinge tab (Takara Tomy / Yujin): on the back of the coloured half, below the seam (clear of the tape)
  if (kind === 'tab' && !top) { v.box(-1, -3, -R - 1, 0, -2, -R - 1, gloss(0xd4d4d4)); v.set(-1, -4, -R, gloss(0xd4d4d4)); v.set(0, -4, -R, gloss(0xd4d4d4)); }
  return v;
}

/** Contents seen through the clear top: the folded insert (series colours) and the bagged figure. */
function contentsModel(N, seriesId) {
  const s = SERIES_BY_ID[seriesId];
  const v = new VoxelModel();
  v.jitter = 0;
  const bg = hexOf(s?.card?.bg, '#ffffff'), ac = hexOf(s?.card?.accent, '#e5383b'), ac2 = hexOf(s?.card?.accent2, '#ffd23f');
  const R = N / 2;
  // the folded mini-catalogue standing at the back: a single sheet, its printed face to the front (the series' header
  // band, a photo of the line-up, a few lines of text), its fold a shade darker
  const w = Math.max(3, Math.round(R * 0.62)), y0 = -Math.round(R * 0.55), y1 = Math.round(R * 0.5), z = -Math.round(R * 0.5);
  for (let x = -w; x < w; x++) for (let y = y0; y <= y1; y++) {
    if (!inSphere(x, y, z, R - 1.4)) continue;
    let c = bg;
    if (y >= y1 - 1) c = ac;
    else if (x >= -w + 1 && x < 0 && y >= y1 - 5 && y <= y1 - 2) c = (x + y) & 1 ? ac2 : sh2(ac2);
    else if (y < y1 - 6 && y % 2 === 0 && x > -w && x < w - 1 - ((y >> 1) & 1) * 2) c = 0xa8a4a0;
    if (x === 0) c = sh2(c);
    v.set(x, y, z, c);
  }
  // the bagged figure: a little blob in the series colours inside a pouch of clear film, its crimped seal on top
  const by = -Math.round(R * 0.3), bw = Math.max(2, Math.round(R * 0.32)), bh = Math.max(3, Math.round(R * 0.5)), bz = Math.round(R * 0.45);
  for (let x = -bw; x < bw; x++) for (let y = by - bh; y <= by + 1; y++) for (let z = -1; z <= bz; z++) {
    if (!inSphere(x, y, z, R - 1.5)) continue;
    const crimp = y === by + 1;
    const core = Math.abs(x + 0.5) < bw - 0.8 && y > by - bh && y < by && z > -1 && z < bz;
    if (crimp) v.set(x, y, z, x & 1 ? 0xe8e8ea : 0xfafafc);
    else if (core) v.set(x, y, z, (x + y) % 3 === 0 ? ac : ac2);
    else v.set(x, y, z, glass(0xf2f6ff));
  }
  return v;
}

/** The paper capsule's printed outer design: series accent band + dots, as a thin paint shell over the half. */
function paperPrint(N, part, seriesId, solid = false) {
  const s = SERIES_BY_ID[seriesId];
  const ac = hexOf(s?.card?.accent, '#e5383b'), bg = hexOf(s?.card?.bg, '#fff3e0');
  const half = halfModel(N, part, 'paper', solid);
  const R = N / 2;
  half.recolor((x, y, z, c) => {
    if (c === 0xd4d4d4) return ac; // the seam ring in the accent colour
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
  // (the window piles' capsules are never opened: solid, so no inside faces)
  const model = kind === 'paper' ? paperPrint(N, part, seriesId, res === 'lo') : halfModel(N, part, kind, res === 'lo');
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
  const cap = { group, top, bottom, r, paper, style: kind, size, N };
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
