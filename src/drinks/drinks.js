// The drinks' printed wraps as pixel art, and the cans and bottles they go round.
// The wraps start from the photographic labels baked in the earlier phase (public/img/drinks/labels.webp: every drink
// in src/needs/foods.js, original names); tools/bake-drink-px.py turns them into pixel art at about a texel a
// millimetre with a small palette each (public/img/drinks/labels-px.webp + labels-px.json: { id: [x, y, w, h] }, the
// whole wrap at the container's size, front half | back half). Nearest filtered, so the texels stay crisp.
// The containers are clean low-poly lathes (the owner's mix of low poly with voxel: round things may be smooth), their
// metal, glass and caps in the voxel world's materials and light, the wrap on the label band at full resolution:
//   drinkMesh(food) -> Mesh (y = 0 the base, the front of the label facing +z; geometry.userData.size)
//   drinkWrapImage(id) -> { img, r: [x, y, w, h] } | null once loaded      whenDrinksReady() -> Promise
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const BASE = (import.meta.env?.BASE_URL || '/') + 'img/drinks/';
let sheet = null, regions = null, sheetTex = null;
const waiting = new Set(); // label materials to give the sheet once it arrives
const ready = (async () => {
  if (typeof document === 'undefined') return;
  try {
    const [img, json] = await Promise.all([
      new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = BASE + 'labels-px.webp'; }),
      fetch(BASE + 'labels-px.json').then((r) => r.json()),
    ]);
    sheet = img; regions = json;
    sheetTex = new THREE.Texture(img);
    sheetTex.colorSpace = THREE.SRGBColorSpace;
    sheetTex.magFilter = THREE.NearestFilter; sheetTex.minFilter = THREE.NearestMipmapLinearFilter; sheetTex.generateMipmaps = true;
    sheetTex.anisotropy = 4;
    sheetTex.needsUpdate = true;
    for (const m of waiting) applyWrap(m);
    waiting.clear();
  } catch (e) { console.warn('drink labels', e); }
})();
export const whenDrinksReady = () => ready;

/** The id a food's wrap goes by in the sheet (vending drinks and the ramune bottle). */
const wrapId = (f) => (f?.id && regions?.[f.id] ? f.id : null);
export function drinkWrapImage(id) { return sheet && regions?.[id] ? { img: sheet, r: regions[id] } : null; }

function applyWrap(m) {
  const r = regions?.[m.userData.wrap];
  if (!r || !sheetTex) return;
  const t = sheetTex.clone(); // (clones share the one upload)
  const W = sheet.width, H = sheet.height;
  t.repeat.set(r[2] / W, r[3] / H);
  t.offset.set(r[0] / W, 1 - (r[1] + r[3]) / H);
  t.needsUpdate = true;
  m.map = t; m.color.set(0xffffff); m.needsUpdate = true;
}

// ------------------------------------------------------------------ materials (shared)
const MATS = {};
const mat = (k, make) => (MATS[k] ||= make());
const alu = () => mat('alu', () => new THREE.MeshStandardMaterial({ color: 0xc4c8cc, roughness: 0.3, metalness: 0.95, flatShading: true }));
const aluDark = () => mat('aluD', () => new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.9, flatShading: true }));
const gold = () => mat('gold', () => new THREE.MeshStandardMaterial({ color: 0xd8b040, roughness: 0.32, metalness: 0.9, flatShading: true }));
const glassM = (tint) => mat('glass' + tint, () => new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.5, clearcoat: 1, depthWrite: false, flatShading: true }));
const plastic = (c) => mat('pl' + c, () => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0, flatShading: true }));

/** A label material for one drink: the art's body colour until the sheet arrives, then the pixel wrap. */
function labelMat(f) {
  const m = new THREE.MeshPhysicalMaterial({ color: f.art?.body ?? 0xcccccc, roughness: 0.38, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  m.userData.wrap = f.id;
  if (sheetTex) applyWrap(m); else waiting.add(m);
  return m;
}

// ------------------------------------------------------------------ geometry
const SEG = 20; // round the lathe: smooth enough, the facets still faintly read (flat shaded metal and glass)
/** A lathe from [r, y] points (mm), bottom to top. */
const lathe = (pts, seg = SEG) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r / 1000, y / 1000)), seg);
/** The label: an open cylinder, u round from the back so the front half's middle faces +z. */
function band(r, y0, y1, seg = SEG * 2) {
  const g = new THREE.CylinderGeometry(r / 1000, r / 1000, (y1 - y0) / 1000, seg, 1, true, -Math.PI / 2, Math.PI * 2);
  g.translate(0, (y0 + y1) / 2000, 0);
  return g;
}
function pack(parts) {
  // parts: [[geometry, material], ...] -> one mesh, a group a material
  const mats = [], geos = [];
  for (const [g, m] of parts) {
    const ng = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
    geos.push(ng); mats.push(m);
  }
  const geo = mergeGeometries(geos, true);
  geo.computeBoundingBox();
  geo.userData.size = geo.boundingBox.getSize(new THREE.Vector3());
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

/** The container for a food's art.shape: can | tall | mini | cup | pet (sizes after the real ones, in mm). */
export function drinkMesh(f) {
  const a = f.art || {}, s = f.id === 'ramune' ? 'ramune' : a.shape || 'can';
  const L = labelMat(f);
  if (s === 'can' || s === 'tall') {
    // 350 ml (Ø66 x 122) or 500 ml (Ø66 x 168): necked lid, rolled rims, a ring pull
    const H = s === 'tall' ? 168 : 122, R = 33;
    const parts = [
      [lathe([[0, 0.5], [22, 0], [27, 1.5], [31, 5], [33, 9]]), aluDark()],
      [band(R, 9, H - 13), L],
      [lathe([[33, H - 13], [32, H - 9], [28.5, H - 4], [27, H - 1.5], [27.5, H], [26, H + 0.5], [25.5, H - 1.5], [0, H - 1.5]]), alu()],
    ];
    const tab = new THREE.BoxGeometry(0.009, 0.0012, 0.018); tab.translate(0, (H - 0.8) / 1000, 0.006);
    const rivet = new THREE.CylinderGeometry(0.002, 0.002, 0.0015, 8); rivet.translate(0, (H - 1) / 1000, 0);
    parts.push([tab, aluDark()], [rivet, alu()]);
    return pack(parts);
  }
  if (s === 'mini') {
    // a 100-120 ml brown glass tonic bottle with a gold cap
    const parts = [
      [lathe([[0, 0], [21, 0], [22.5, 3]]), glassM(0x6a3a14)],
      [band(22.6, 3, 58), L],
      [lathe([[22.5, 58], [22, 62], [14, 72], [11, 78], [11, 84]]), glassM(0x6a3a14)],
      [lathe([[0, 92], [11.8, 92], [12, 90], [12, 84], [0, 84]].reverse()), gold()],
    ];
    return pack(parts);
  }
  if (s === 'cup') {
    // the one-cup sake glass (Ø62 x 104), the gold pull lid
    const parts = [
      [lathe([[0, 2], [26, 0], [29, 3], [30, 12]]), glassM(0xe8f0f0)],
      [band(30.2, 12, 92), L],
      [lathe([[30, 92], [31, 100], [31, 103]]), glassM(0xe8f0f0)],
      [lathe([[31.6, 103], [31.6, 105], [0, 105.5]]), gold()],
    ];
    return pack(parts);
  }
  if (s === 'ramune') {
    // the codd-neck bottle: aqua glass, the pinched neck with the marble in it, a plastic cap, the paper label
    const parts = [
      [lathe([[0, 1], [24, 0], [27, 4], [27.5, 30]], 16), glassM(0x9ae0e0)],
      [band(27.7, 30, 92), L],
      [lathe([[27.5, 92], [26, 112], [17, 128], [12.5, 140], [16, 150], [12, 160], [11.5, 178]], 16), glassM(0x9ae0e0)],
      [lathe([[0, 188], [13, 188], [13, 178], [0, 178]].reverse(), 16), plastic(0x2a7ae0)],
    ];
    const marble = new THREE.IcosahedronGeometry(0.0085, 1); marble.translate(0, 0.146, 0);
    parts.push([marble, glassM(0x7ad0e0)]);
    return pack(parts);
  }
  // pet: a 500 ml PET bottle (Ø66 x 205): ribbed base, the label, the shoulder, a screw cap in the band colour
  const pc = a.band2 === 0xffffff ? a.band : a.band2;
  const tint = new THREE.Color(0xe8f2f6).lerp(new THREE.Color(a.body ?? 0xe8f2f6), 0.3).getHex();
  const parts = [
    [lathe([[0, 3], [20, 0], [30, 3], [33, 10], [32, 20], [33, 40]]), glassM(tint)],
    [band(33.2, 40, 128), L],
    [lathe([[33, 128], [32.5, 140], [26, 160], [16, 176], [13.5, 182], [14.5, 184], [13.5, 186]]), glassM(tint)],
    [lathe([[0, 204], [14.8, 204], [15.2, 202], [15.2, 186], [0, 186]].reverse()), plastic(pc ?? 0x2a6ad8)],
  ];
  return pack(parts);
}
