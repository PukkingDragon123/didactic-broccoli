// The town's materials: real surfaces from the shared photo texture library (src/kit/photoTex.js), tinted per
// building by vertex colour, flat paints for small parts, the two hand-drawn atlases (signs, stains), glass, lamps. Cel shading and ink lines are applied to all of them by the renderer.
//   makeMats(town) fills town.m (by name), town.P(rough, metal) flat paint, town.G self-lit paint, town.tm / dm / cut
//   (trim atlas, blended decals, alpha-cut boards), town.indoor(mat) (a variant the low sun does not reach).
import * as THREE from 'three';
import { hazardTexture } from './tex.js';
import { photoTex, PHOTO_TEX, pixelCanvas, withPhotoNormal } from '../kit/photoTex.js';
import { townAtlas } from './atlas.js';
import { voxelMaterials } from '../voxel/materials.js';

let INDOOR_CHUNK = null;
/** Indoor materials drop the directional lights (interiors and the underpasses have no shadow coverage). */
function indoorPatch(m) {
  if (!INDOOR_CHUNK) INDOOR_CHUNK = THREE.ShaderChunk.lights_fragment_begin.replace('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )', '#if 0');
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { prev?.(sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', INDOOR_CHUNK); };
  const key = m.customProgramCacheKey?.() || '';
  m.customProgramCacheKey = () => key + ':town-in';
  return m;
}

// name: [photo texture, roughness, metalness, turned a quarter (boards lying along the wall)]
const PHOTO = {
  plaster: ['plaster_cream', 0.95], totan: ['tin_corrugated', 0.62, 0.1], clap: ['wood_weathered', 0.9, 0, true], kawara: ['roof_kawara', 0.6], tileBody: ['steel_painted', 0.55],
  tinroof: ['roof_tin', 0.6, 0.1], asphalt: ['asphalt', 0.95], patchA: ['asphalt_patched', 0.95], concrete: ['concrete', 0.95], grate: ['steel_galvanised', 0.5, 0.3], block: ['block_wall', 0.95],
  brick: ['brick_red', 0.92], stone: ['concrete_stained', 0.95], oya: ['mortar_grey', 0.95], dirt: ['soil', 1], gravel: ['gravel', 1], grass: ['grass', 1], wood: ['wood_planks', 0.85],
  woodL: ['plywood', 0.8], tile: ['tile_white', 0.45], shutter: ['steel_painted', 0.62, 0.15], reed: ['tatami', 0.95],
};
// the old names other modules still ask for
const ALIAS = {
  road: 'asphalt', strip: 'concrete', ground: 'dirt', found: 'concrete', conc: 'concrete', tunnel: 'concrete', kenchi: 'stone', board: 'clap', boardL: 'clap', siding: 'clap',
  tin: 'totan', tinRed: 'totan', tinTeal: 'totan', prefab: 'totan', prefabB: 'totan', roofGrey: 'kawara', roofBlue: 'kawara', roofBrown: 'kawara', roofGreen: 'kawara',
  roofIbushi: 'kawara', roofMetal: 'tinroof', roofMetalB: 'tinroof', roofSlate: 'tinroof', shutterM: 'shutter', mortar: 'plaster', mortarG: 'plaster', mortarP: 'plaster',
  wallCream: 'plaster', wallBeige: 'plaster', wallGrey: 'plaster', wallBlue: 'plaster', paving: 'concrete', lid: 'concrete', ballast: 'gravel', timber: 'wood', koshi: 'wood',
  shikkui: 'plaster', ceil: 'woodL', skirt: 'tile',
};

export function makeMats(t) {
  const mats = t.mats;
  t.P = (rough = 0.75, metal = 0, extra = {}) => {
    // every distinct paint is a draw call per batch (and per pass): plain paints snap to four shared finishes
    // (matte 0.85, satin painted metal 0.65 / 0.2, bare metal 0.45 / 0.45, gloss 0.3)
    if (!Object.keys(extra).length) { if (rough >= 0.78) { rough = 0.85; metal = 0; } else if (rough >= 0.55) { rough = 0.65; metal = 0.2; } }
    const ck = 'c:' + rough + ':' + metal + JSON.stringify(extra);
    if (!mats.has(ck)) { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough, metalness: metal, ...extra }); m.name = 'paint'; mats.set(ck, m); }
    return mats.get(ck);
  };
  const m = {};
  for (const [k, [photo, rough, metal = 0, turn]] of Object.entries(PHOTO)) {
    const e = PHOTO_TEX[photo], r = 1 / (e?.metres || 1);
    const map = photoTex(photo, { repeat: [r, r], turn: !!turn });
    m[k] = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: rough, metalness: metal });
    m[k].name = k;
    withPhotoNormal(m[k]); // the scan's own relief (src/kit/photoTex.js)
    // a tint given to the batcher means "this surface is that colour": it is divided by the photo's own mean (Batch)
    const c = new THREE.Color(e?.avg ?? 0x808080);
    m[k].userData.norm = [c.r, c.g, c.b];
  }
  m.hazard = new THREE.MeshStandardMaterial({ map: hazardTexture(), vertexColors: true, roughness: 0.65 }); m.hazard.name = 'hazard';
  for (const [k, v] of Object.entries(ALIAS)) m[k] = m[v];
  m.pv = t.P(0.82); m.metal = t.P(0.45, 0.45); m.gloss = t.P(0.3); m.ridge = t.P(0.6, 0.1); m.girder = t.P(0.7, 0.25);
  m.paint = t.P(0.85, 0, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  t.m = m;
  // self-lit paint (lamps, LEDs)
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true }); glow.color.setScalar(1.4); glow.name = 'glow';
  t.G = glow;
  // the atlases
  const A = townAtlas();
  t.atlas = A;
  t.tm = new THREE.MeshStandardMaterial({ map: A.trim.tex, vertexColors: true, roughness: 0.6 }); t.tm.name = 'trim';
  t.dm = new THREE.MeshStandardMaterial({ map: A.decal.tex, vertexColors: true, roughness: 0.95, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); t.dm.name = 'decal';
  t.cut = new THREE.MeshStandardMaterial({ map: A.decal.tex, vertexColors: true, roughness: 0.85, alphaTest: 0.5, side: THREE.DoubleSide }); t.cut.name = 'cutout';
  // chain-link mesh (alpha-cut, repeating 0.25 m), pixelled by hand: one diamond of twisted wire, a lit upper edge and
  // a shaded lower one on each strand, the knuckles where two strands cross a step darker; its mips keep the wire's
  // coverage so the mesh does not thin out or shimmer at a distance
  const fc = document.createElement('canvas'); fc.width = fc.height = 64;
  const fx = fc.getContext('2d'), WIRE = ['#f2f4ee', '#dfe3dc', '#b8beb6', '#9aa098'];
  const dot = (px, py, k) => { fx.fillStyle = WIRE[k]; fx.fillRect(((px % 64) + 64) % 64, ((py % 64) + 64) % 64, 1, 1); };
  for (let i = 0; i < 64; i++) {
    // the two strands of the diamond, 3 texels thick: highlight, body, shade
    for (const cy of [32 - i, i - 32]) { dot(i, cy - 1, 0); dot(i, cy, 1); dot(i, cy + 1, 2); }   // x + y = 32 and x - y = 32
  }
  for (const [kx, ky] of [[0, 32], [32, 0], [32, 64], [64, 32]]) for (let j = -1; j <= 1; j++) dot(kx, ky + j, 3);   // the knuckles
  const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.colorSpace = THREE.SRGBColorSpace; ft.repeat.set(4, 4);
  pixelCanvas(ft, { alphaTest: 0.4, aniso: 4 });
  t.fence = new THREE.MeshStandardMaterial({ map: ft, vertexColors: true, roughness: 0.6, metalness: 0.2, alphaTest: 0.4, side: THREE.DoubleSide }); t.fence.name = 'fence';
  t.glass = new THREE.MeshPhysicalMaterial({ color: 0xeaf2f0, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, depthWrite: false });
  // indoor variants
  const indoor = new Map();
  t.indoor = (mat) => { if (!indoor.has(mat)) indoor.set(mat, indoorPatch(mat.clone())); return indoor.get(mat); };
  let inVox = null, dimVox = null;
  // .convert: the same treatment for a low-poly prop's own atlas materials (they keep their paint)
  t.indoorVoxel = () => { if (!inVox) { const n = voxelMaterials('normal'); inVox = [t.indoor(n[0]), t.indoor(n[1]), t.indoor(n[2]), n[3], t.indoor(n[4])]; inVox.convert = (k) => (k.isMeshBasicMaterial ? k : t.indoor(k)); } return inVox; };
  t.dimVoxel = () => { if (!dimVox) { const n = voxelMaterials('normal'), g = n[3].clone(); g.color.setScalar(0.95); dimVox = [n[0], n[1], n[2], g, n[4]]; } return dimVox; };
}
