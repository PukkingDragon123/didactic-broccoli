// The views out of the windows: real photographs of Tokyo streets (Google Open Images, CC BY 2.0, credited in
// CREDITS.md) reduced to HD pixel art by tools/make-views.py, shown self-lit on a backdrop behind the glass. The
// owner (Annex, Mall) dims and warms them with the time of day through material.color, as before.
//   viewMat('lane' | 'plaza' | 'tracks') -> MeshBasicMaterial (shared per view; the image fills in when it arrives)
import * as THREE from 'three';
import { linearMips, pixelFilter } from '../kit/photoTex.js';

// name: [file, the colour shown until the image arrives]
const VIEWS = { lane: ['lane.png', 0xb8b4a8], plaza: ['plaza.png', 0xa8a294], tracks: ['tracks.png', 0x9aa2a4] };
const textures = new Map();

function viewTexture(name) {
  if (textures.has(name)) return textures.get(name);
  const [file, avg] = VIEWS[name] || VIEWS.lane;
  const c = document.createElement('canvas'); c.width = c.height = 4;
  const g = c.getContext('2d'); g.fillStyle = '#' + avg.toString(16).padStart(6, '0'); g.fillRect(0, 0, 4, 4);
  const t = new THREE.Texture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  pixelFilter(t, 4);
  t.needsUpdate = true;
  textures.set(name, t);
  const img = new Image();
  img.onload = () => {
    try {
      const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const mips = linearMips(x.getImageData(0, 0, cv.width, cv.height));
      t.source = new (THREE.TextureSource || THREE.Source)(mips[0]);
      t.mipmaps = mips; t.generateMipmaps = false; t.needsUpdate = true;
    } catch (e) { console.warn('views: could not read', file, e); }
  };
  img.onerror = () => console.warn('views: could not load img/views/' + file);
  img.src = new URL('img/views/' + file, document.baseURI).href;
  return t;
}

/** A self-lit material showing one of the window views (a new material each call: its colour is the owner's). */
export function viewMat(name) {
  return new THREE.MeshBasicMaterial({ map: viewTexture(name), toneMapped: true });
}
