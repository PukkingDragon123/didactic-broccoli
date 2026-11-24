// HD surface textures: the close-up surfaces (floors, walls, ceilings, counters, wood, plaster, concrete, metal, the
// rooms) as high-res pixel art at 256 px/m (docs/ART.md, "Texel density"), photo-bashed from CC0 photos offline by
// art/lowpix/world_arch/hd/make_hd.py -> public/textures/hd/<key>.webp and ./hdtex.manifest.json.
// A recipe key with an HD version replaces the old procedural texture everywhere it is used (src/gfx/geo.js pixMat,
// src/world/GarageDetail.js surfMat, src/gfx/shopTextures.js shopMat, the rooms); the HD texture covers its own
// size in metres, whatever px/m the caller asked of the old one.
//   hasHD(key)      is there an HD version of this recipe key
//   hdSize(key)     [w, h] metres one repeat covers
//   hdTexture(key)  a new repeating sRGB texture of it (nearest up close, trilinear mipmaps far away); repeat is
//                   left at 1 (one repeat per UV unit): set it to 1 / hdSize for world-metre UVs
//   hdMap(key, unit) hdTexture with its repeat set: 1 / hdSize for world-metre UVs, or 1 (unit = true) for a face
//                   mapped 0..1 that is exactly hdSize metres (the six-mat tatami floor)
//   whenHD()        resolves once every HD image is decoded (main.js awaits it before the world builds, so no
//                   material is ever made with an empty texture)
import * as THREE from 'three';
import MANIFEST from './hdtex.manifest.json';
import { isTouchDevice } from '../core/touch.js';

const imgs = new Map();

// The Very Low and Low presets never load the HD set (GPU memory): the quality is read before the world builds, from
// the page's ?q=, else the save's chosen or auto-picked preset, else low on a touch device (as src/main.js does). A
// change in Settings takes effect after a restart.
const LOW = new Set(['verylow', 'low']);
function bootPreset() {
  try {
    const q = new URLSearchParams(location.search).get('q');
    if (q) return q;
    const s = JSON.parse(localStorage.getItem('gacha-garage-save-v2') || 'null')?.settings;
    if (s?.quality) return s.quality;
    if (s?.autoQuality) return s.autoQuality;
    if (isTouchDevice()) return 'low';
  } catch { /* no storage */ }
  return 'high';
}
export const HD_ON = typeof window === 'undefined' ? true : !LOW.has(bootPreset());
const url = (k) => new URL(`${import.meta.env.BASE_URL}textures/hd/${k}.webp`, document.baseURI).href;

function image(key) {
  let e = imgs.get(key);
  if (!e) {
    e = new Image();
    e.decoding = 'async';
    e.src = url(key);
    e.ready = e.decode().then(() => true, () => { console.warn('hd texture failed to load:', key); return false; });
    imgs.set(key, e);
  }
  return e;
}

export const hasHD = (key) => HD_ON && Object.prototype.hasOwnProperty.call(MANIFEST, key);
export const hdSize = (key) => MANIFEST[key].m;
export const hdKeys = () => Object.keys(MANIFEST);

export function whenHD() { return HD_ON ? Promise.all(Object.keys(MANIFEST).map((k) => image(k).ready)) : Promise.resolve(); }

const bases = new Map();
export function hdTexture(key) {
  const im = image(key);
  if (im.complete && im.naturalWidth > 0) {
    // one base texture per key, cloned per use: clones share its Source, so the GPU holds one copy of the image
    let b = bases.get(key);
    if (!b) { b = setup(new THREE.Texture(im), key); b.needsUpdate = true; bases.set(key, b); }
    return b.clone();
  }
  const t = setup(new THREE.Texture(null), key);
  im.ready.then((loaded) => { if (loaded) { t.image = im; t.needsUpdate = true; } });
  return t;
}

function setup(t, key) {
  t.name = 'hd:' + key;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  return t;
}

export function hdMap(key, unit = false) {
  const t = hdTexture(key);
  if (!unit) { const [w, h] = hdSize(key); t.repeat.set(1 / w, 1 / h); }
  return t;
}
