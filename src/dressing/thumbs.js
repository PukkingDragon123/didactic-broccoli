// Card pictures for the dressing room, all small pixel renders shown at 2x (crisp):
//   cosmetics: src/cosmetics/thumbs.js (hats and glasses on a display head, outfits on you, bags from behind, shoes)
//   the base look (hair, face, tops, bottoms, build): you, in that option, framed on the part that changes
//   locked pieces: the same picture inked into a silhouette (with a lighter rim along the top-left, so the shape reads)
//   thumbFor(game, item, look, size) -> data URL | '' (not ready: queue it and try again next frame)
//   silhouette(url) -> Promise<data URL>
import * as THREE from 'three';
import { createAvatarHuman, normalizeAvatar } from '../people/avatar.js';
import { cosmeticThumb, ink } from '../cosmetics/thumbs.js';
import { hasPrint, printOf, loadPrint } from '../cosmetics/prints.js';

export const THUMB = 56; // texels; shown at 2x (phones: 42)
const BASE = ['body', 'skin', 'hair', 'hairCol', 'top', 'topCol', 'bottom', 'botCol', 'eyes', 'brows', 'cheeks', 'eyeCol'];
const cache = new Map();

// how each base option is framed: [y0, y1] as fractions of your height, half width, turn, camera side / up
const FRAME = {
  hair: { y: [0.8, 1.06], w: 0.15, rot: 0.55, side: 0.4, up: 0.15 },
  eyes: { y: [0.83, 0.99], w: 0.11, rot: 0.08, side: 0.12, up: 0.05 },
  brows: { y: [0.83, 0.99], w: 0.11, rot: 0.08, side: 0.12, up: 0.05 },
  cheeks: { y: [0.81, 0.97], w: 0.11, rot: 0.12, side: 0.15, up: 0.05 },
  top: { y: [0.46, 0.88], w: 0.26, rot: 0.3, side: 0.25, up: 0.1 },
  bottom: { y: [0.0, 0.58], w: 0.24, rot: 0.3, side: 0.25, up: 0.12 },
  body: { y: [0.0, 1.02], w: 0.3, rot: 0.3, side: 0.25, up: 0.1 },
};

const keyOf = (item, look, size) => `${item.uid}@${size}|${BASE.map((k) => (k === item.key ? '' : look[k] ?? '')).join('|')}`;

/** A picture for a card, or '' while it can't be drawn yet (photo prints still loading). */
export function thumbFor(game, item, look, size = THUMB) {
  if (item.kind === 'cos') {
    const id = item.value;
    if (hasPrint(id) && !printOf(id)) { loadPrint(id); return ''; }
    return cosmeticThumb(game, id, { size, look, outline: true });
  }
  if (item.kind !== 'base' || !game.thumbs) return '';
  const k = keyOf(item, look, size);
  if (cache.has(k)) return cache.get(k);
  const F = FRAME[item.key] || FRAME.body;
  // you in that option, with the cosmetics that would hide it taken off
  const L = normalizeAvatar({ ...look, [item.key]: item.value, hat: null, face: null, bag: null, outfit: null });
  let url = '';
  try {
    const h = createAvatarHuman(L, { lazy: false });
    if (['eyes', 'brows', 'cheeks'].includes(item.key)) h.setExpression('smile');
    for (let i = 0; i < 4; i++) h.update(1 / 30, {});
    h.root.rotation.y = F.rot;
    h.root.updateMatrixWorld(true);
    const H = h.height || 1.7;
    const box = new THREE.Box3(new THREE.Vector3(-F.w, F.y[0] * H, -F.w), new THREE.Vector3(F.w, F.y[1] * H, F.w));
    url = ink(game.thumbs.renderObject(h.root, size, { outline: false, side: F.side, up: F.up, box }));
    h.dispose();
  } catch (e) { console.warn('dressing thumb', item.uid, e); }
  if (url) cache.set(k, url);
  return url;
}

const sil = new Map();
/** The picture as an ink silhouette (a locked piece). */
export function silhouette(url) {
  if (sil.has(url)) return sil.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width, h = img.height, c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, w, h), a = d.data;
      const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 100;
      const out = g.createImageData(w, h), o = out.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!on(x, y)) continue;
        const i = (y * w + x) * 4;
        const rim = !on(x - 1, y) || !on(x, y - 1);
        const col = rim ? [86, 66, 104] : (x + y) % 2 && (!on(x + 1, y) || !on(x, y + 1)) ? [34, 24, 44] : [52, 38, 64];
        o[i] = col[0]; o[i + 1] = col[1]; o[i + 2] = col[2]; o[i + 3] = 255;
      }
      g.putImageData(out, 0, 0);
      resolve(c.toDataURL());
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
  sil.set(url, p);
  return p;
}
