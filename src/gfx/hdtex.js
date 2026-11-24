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

const imgs = new Map();
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

export const hasHD = (key) => Object.prototype.hasOwnProperty.call(MANIFEST, key);
export const hdSize = (key) => MANIFEST[key].m;
export const hdKeys = () => Object.keys(MANIFEST);

export function whenHD() { return Promise.all(Object.keys(MANIFEST).map((k) => image(k).ready)); }

export function hdTexture(key) {
  const im = image(key);
  const ok = im.complete && im.naturalWidth > 0;
  const t = new THREE.Texture(ok ? im : null);
  t.name = 'hd:' + key;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  if (ok) t.needsUpdate = true;
  else im.ready.then((loaded) => { if (loaded) { t.image = im; t.needsUpdate = true; } });
  return t;
}

export function hdMap(key, unit = false) {
  const t = hdTexture(key);
  if (!unit) { const [w, h] = hdSize(key); t.repeat.set(1 / w, 1 / h); }
  return t;
}
