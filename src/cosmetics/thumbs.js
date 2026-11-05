// Thumbnails of cosmetics for the closet, the unlock cards and the web shop: hats and glasses on a wooden display head,
// outfits on your own character, bags from behind, shoes as a close-up of the feet. Photo prints are loaded first.
//   cosmeticThumb(game, id, { size, look, outline }) -> data URL ('' if it can't be drawn yet); outline: a 1-texel ink
//                                                         rim (the pixel-art cards of the dressing room)
//   cosmeticThumbAsync(game, id, opts) -> Promise<data URL>
import * as THREE from 'three';
import { COSMETIC_BY_ID, cosmeticPreview } from '../people/cosmetics.js';
import { createAvatarHuman, normalizeAvatar } from '../people/avatar.js';
import { hasPrint, printOf, loadPrint } from './prints.js';

const cache = new Map();
const BASE = ['body', 'skin', 'hair', 'hairCol', 'top', 'topCol', 'bottom', 'botCol', 'eyes', 'brows', 'cheeks', 'eyeCol'];

/** A hat / glasses piece that is painted on the body (no voxel model): pictured on you instead of the display head. */
const painted = (c) => (c.slot === 'hat' || c.slot === 'face') && typeof c.spec === 'function' && !c.preview;

export function thumbKey(id, look, size, outline = false) {
  const c = COSMETIC_BY_ID[id];
  if (!c) return '';
  const o = outline ? '+o' : '';
  if ((c.slot === 'hat' || c.slot === 'face') && !painted(c)) return `${id}@${size}${o}`;
  return `${id}@${size}${o}|${BASE.map((k) => look?.[k] ?? '').join('|')}`;
}

/** Render now (synchronous: a Human is built and painted for outfits / bags / shoes). */
export function cosmeticThumb(game, id, { size = 160, look = game.state.avatar, outline = false } = {}) {
  const c = COSMETIC_BY_ID[id];
  if (!c || !game.thumbs) return '';
  const key = thumbKey(id, look, size, outline);
  if (cache.has(key)) return cache.get(key);
  if (hasPrint(id) && !printOf(id)) return '';
  let url = '';
  try {
    const T = game.thumbs;
    if ((c.slot === 'hat' || c.slot === 'face') && !painted(c)) url = ink(T.renderObject(cosmeticPreview(id), size, { outline: false, side: 0.55, up: 0.22 }), outline);
    else {
      const base = normalizeAvatar(look);
      const head = c.slot === 'hat' || c.slot === 'face';
      const h = createAvatarHuman({ ...base, hat: c.slot === 'hat' ? id : null, face: c.slot === 'face' ? id : null, outfit: c.slot === 'outfit' ? id : null, bag: c.slot === 'bag' ? id : null, shoes: c.slot === 'shoes' ? id : null }, { lazy: false });
      for (let i = 0; i < 4; i++) h.update(1 / 30, {});
      h.root.rotation.y = c.slot === 'bag' ? Math.PI - 0.5 : c.slot === 'shoes' ? 0.6 : c.photoTee ? 0.15 : head ? 0.45 : 0.35;
      h.root.updateMatrixWorld(true);
      const H = h.height || 1.7;
      // shoes: frame the feet; bags: the back from the hips up; outfits: the whole body
      // (photo tees: the chest up, so the print reads)
      const box = head ? new THREE.Box3(new THREE.Vector3(-0.17, H * 0.79, -0.17), new THREE.Vector3(0.17, H * 1.07, 0.17))
        : c.slot === 'shoes' ? new THREE.Box3(new THREE.Vector3(-0.2, 0, -0.18), new THREE.Vector3(0.2, H * 0.2, 0.2))
        : c.slot === 'bag' ? new THREE.Box3(new THREE.Vector3(-0.3, H * 0.35, -0.3), new THREE.Vector3(0.3, H * 0.95, 0.3))
          : c.photoTee ? new THREE.Box3(new THREE.Vector3(-0.24, H * 0.5, -0.2), new THREE.Vector3(0.24, H * 0.99, 0.2)) : null;
      url = ink(T.renderObject(h.root, size, { outline: false, side: c.slot === 'shoes' ? 0.3 : 0.25, up: c.slot === 'shoes' ? 0.55 : 0.12, box }), outline);
      h.dispose();
    }
  } catch (e) { console.warn('cosmetic thumb', id, e); }
  if (url) cache.set(key, url);
  return url;
}

/** The canvas as a data URL, with a 1-texel ink outline round the opaque pixels if asked (one readback, on a canvas made
 *  for it). */
export function ink(canvas, on = true, col = [36, 24, 34]) {
  if (!on) return canvas.toDataURL();
  const w = canvas.width, h = canvas.height, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(canvas, 0, 0);
  const img = g.getImageData(0, 0, w, h), d = img.data, out = new Uint8ClampedArray(d);
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (A(x, y)) continue;
    if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) { const i = (y * w + x) * 4; out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2]; out[i + 3] = 255; }
  }
  g.putImageData(new ImageData(out, w, h), 0, 0);
  return c.toDataURL();
}

export async function cosmeticThumbAsync(game, id, opts = {}) {
  if (hasPrint(id) && !printOf(id)) await loadPrint(id);
  return cosmeticThumb(game, id, opts);
}
