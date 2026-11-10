// Backgrounds for the flyer-style display cards (src/figures/flyer.js), 640 px wide: a real photograph of the place,
// pixelated and washed like a printed flyer's backdrop, and a plain table for the figures to stand on. Painters take
// (p, K, s, h): the Pix, banner.js's pixel helpers, the series and the height of the scene area.
import { FLYER_TEXT } from '../figures/flyer.js';

// text the sculpted figures print on themselves (src/figures/sets) and the flyers draw: preloaded with the banner glyphs
export const SCENE_TEXT = `${FLYER_TEXT}安全第一げすい注意一九六四三分ほたる印牛乳まきばあけぐちふわふわたまごながいぬビスケットめん`;

const W = 640;
// the photographs behind the hero shots (CC BY, Google Open Images: see CREDITS.md), loaded as the module loads
const FILES = { lane: 'back_street.jpg', counter: 'products/ramen_shoyu.jpg', shelf: 'parcels.jpg' };
const IMG = {};
const loads = [];
if (typeof Image !== 'undefined') for (const [k, f] of Object.entries(FILES)) {
  const im = new Image();
  loads.push(new Promise((res) => { im.onload = res; im.onerror = res; }));
  im.src = `${import.meta.env.BASE_URL}img/photos/${f}`;
  IMG[k] = im;
}
/** Resolves when the flyer photographs are in (cards drawn before that are redrawn by banner.js). */
export const flyerPhotos = () => Promise.all(loads);
export const flyerPhotosReady = () => Object.values(IMG).every((im) => im.complete);

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/**
 * A photograph as the backdrop of a card: cropped to cover the scene (fy: which part of its height, 0..1), printed in
 * 2 x 2 pixel blocks with a small ordered-dither palette (5 levels a channel) and washed towards the paper so the
 * figures and the lettering stand off it. Returns false while the picture is not loaded.
 */
function photo(p, K, name, h, { wash = 0.34, paper = 0xfff6e4, fy = 0.5 } = {}) {
  const im = IMG[name];
  if (!im || !im.complete || !im.naturalWidth) return false;
  const w2 = W / 2, h2 = Math.ceil(h / 2), c = document.createElement('canvas');
  c.width = w2; c.height = h2;
  const g = c.getContext('2d', { willReadFrequently: true }), k = Math.max(w2 / im.naturalWidth, h2 / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
  g.drawImage(im, (w2 - dw) / 2, (h2 - dh) * fy, dw, dh);
  const d = g.getImageData(0, 0, w2, h2).data, P = [(paper >> 16) & 255, (paper >> 8) & 255, paper & 255];
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const i = (y * w2 + x) * 4, t = (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5, col = [0, 0, 0];
    for (let q = 0; q < 3; q++) { const v = d[i + q] + (P[q] - d[i + q]) * wash; col[q] = Math.max(0, Math.min(255, Math.round((v / 255 * 4 + t * 0.9)) * 63.75)); }
    p.rect(x * 2, y * 2, 2, 2, (col[0] << 16) | (col[1] << 8) | col[2]);
  }
  return true;
}
/** The table the figures stand on: one flat band with a lit edge. */
function stage(p, K, h, c) {
  p.rect(0, h - 52, W, 52, c); p.rect(0, h - 52, W, 2, K.mixC(c, 0xffffff, 0.45)); p.rect(0, h - 50, W, 1, K.shadeC(c, 0.82));
}

export const FLYER_SCENES = {
  plain(p, K, s, h) { p.rect(0, 0, W, h, K.mixC(K.hex(s.card.bg), 0xffffff, 0.3)); stage(p, K, h, K.mixC(K.hex(s.card.bg), 0x5a4a3a, 0.3)); },
  /** A back street (photograph); the figures stand on the kerb. */
  lane(p, K, s, h) { if (!photo(p, K, 'lane', h, { fy: 0.55 })) p.rect(0, 0, W, h, 0xdfe6e4); stage(p, K, h, 0x8a8690); },
  /** A bowl of shoyu ramen, close (photograph); the figures stand on the counter. */
  counter(p, K, s, h) { if (!photo(p, K, 'counter', h, { fy: 0.5, wash: 0.42 })) p.rect(0, 0, W, h, 0xf3e4c4); stage(p, K, h, 0xc99058); },
  /** Parcels and boxes (photograph); the figures stand on a shelf. */
  shelf(p, K, s, h) { if (!photo(p, K, 'shelf', h, { fy: 0.4, wash: 0.4 })) p.rect(0, 0, W, h, 0xe9e2d2); stage(p, K, h, 0xe6d6b4); },
};
