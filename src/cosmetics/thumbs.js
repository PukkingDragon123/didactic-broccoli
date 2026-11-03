// Thumbnails of cosmetics for the closet, the unlock cards and the web shop: hats and glasses on a wooden display head,
// outfits on your own character, bags from behind, shoes as a close-up of the feet. Photo prints are loaded first.
//   cosmeticThumb(game, id, { size, look }) -> data URL ('' if it can't be drawn yet)
//   cosmeticThumbAsync(game, id, opts) -> Promise<data URL>
import * as THREE from 'three';
import { COSMETIC_BY_ID, cosmeticPreview } from '../people/cosmetics.js';
import { createAvatarHuman, normalizeAvatar } from '../people/avatar.js';
import { hasPrint, printOf, loadPrint } from './prints.js';

const cache = new Map();
const BASE = ['body', 'skin', 'hair', 'hairCol', 'top', 'topCol', 'bottom'];

export function thumbKey(id, look, size) {
  const c = COSMETIC_BY_ID[id];
  if (!c) return '';
  if (c.slot === 'hat' || c.slot === 'face') return `${id}@${size}`;
  return `${id}@${size}|${BASE.map((k) => look?.[k] ?? '').join('|')}`;
}

/** Render now (synchronous: a Human is built and painted for outfits / bags / shoes). */
export function cosmeticThumb(game, id, { size = 160, look = game.state.avatar } = {}) {
  const c = COSMETIC_BY_ID[id];
  if (!c || !game.thumbs) return '';
  const key = thumbKey(id, look, size);
  if (cache.has(key)) return cache.get(key);
  if (hasPrint(id) && !printOf(id)) return '';
  let url = '';
  try {
    const T = game.thumbs;
    if (c.slot === 'hat' || c.slot === 'face') url = T.renderObject(cosmeticPreview(id), size, { outline: false, side: 0.55, up: 0.22 }).toDataURL();
    else {
      const base = normalizeAvatar(look);
      const h = createAvatarHuman({ ...base, hat: null, face: null, outfit: c.slot === 'outfit' ? id : null, bag: c.slot === 'bag' ? id : null, shoes: c.slot === 'shoes' ? id : null }, { lazy: false });
      for (let i = 0; i < 4; i++) h.update(1 / 30, {});
      h.root.rotation.y = c.slot === 'bag' ? Math.PI - 0.5 : c.slot === 'shoes' ? 0.6 : c.photoTee ? 0.15 : 0.35;
      h.root.updateMatrixWorld(true);
      const H = h.height || 1.7;
      // shoes: frame the feet; bags: the back from the hips up; outfits: the whole body
      // (photo tees: the chest up, so the print reads)
      const box = c.slot === 'shoes' ? new THREE.Box3(new THREE.Vector3(-0.2, 0, -0.18), new THREE.Vector3(0.2, H * 0.2, 0.2))
        : c.slot === 'bag' ? new THREE.Box3(new THREE.Vector3(-0.3, H * 0.35, -0.3), new THREE.Vector3(0.3, H * 0.95, 0.3))
          : c.photoTee ? new THREE.Box3(new THREE.Vector3(-0.24, H * 0.5, -0.2), new THREE.Vector3(0.24, H * 0.99, 0.2)) : null;
      url = T.renderObject(h.root, size, { outline: false, side: c.slot === 'shoes' ? 0.3 : 0.25, up: c.slot === 'shoes' ? 0.55 : 0.12, box }).toDataURL();
      h.dispose();
    }
  } catch (e) { console.warn('cosmetic thumb', id, e); }
  if (url) cache.set(key, url);
  return url;
}

export async function cosmeticThumbAsync(game, id, opts = {}) {
  if (hasPrint(id) && !printOf(id)) await loadPrint(id);
  return cosmeticThumb(game, id, opts);
}
