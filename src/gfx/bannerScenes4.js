// Backgrounds for the flyer-style display cards (src/figures/flyer.js), 640 px wide: a real photograph of the place,
// pixelated and washed like a printed flyer's backdrop, and a plain table for the figures to stand on. Painters take
// (p, K, s, h): the Pix, banner.js's pixel helpers, the series and the height of the scene area.
import { FLYER_TEXT } from '../figures/flyer.js';

// text the sculpted figures print on themselves (src/figures/sets) and the flyers draw: preloaded with the banner glyphs
export const SCENE_TEXT = `${FLYER_TEXT}3+5=89-4=5安全第一げすい注意一九六四三分ほたる印牛乳まきばあけぐちふわふわたまごながいぬビスケットめん`;

const W = 640;
// the photographs behind the hero shots (CC BY, Google Open Images: see CREDITS.md), loaded as the module loads
const FILES = {
  lane: 'back_street.jpg', counter: 'products/ramen_shoyu.jpg', shelf: 'parcels.jpg',
  sky: 'cumulus.jpg', room: 'prints/kawai_house.jpg', oden: 'products/oden.jpg', shutters: 'shutters.jpg', bamboo: 'prints/bamboo_forest.jpg',
};
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
  /** Summer cloud over the rooftops (photograph); the figures stand on the balcony floor. */
  sky(p, K, s, h) { if (!photo(p, K, 'sky', h, { fy: 0.35, wash: 0.3 })) p.rect(0, 0, W, h, 0xcfe4f2); stage(p, K, h, 0xb9b4ac); },
  /** An old tatami room (photograph); the figures stand on the tatami. */
  room(p, K, s, h) { if (!photo(p, K, 'room', h, { fy: 0.4, wash: 0.36 })) p.rect(0, 0, W, h, 0xe9dcc4); stage(p, K, h, 0xc9c08a); },
  /** A pot of oden (photograph); the figures stand on the stall's counter. */
  oden(p, K, s, h) { if (!photo(p, K, 'oden', h, { fy: 0.5, wash: 0.4 })) p.rect(0, 0, W, h, 0xf2e2c0); stage(p, K, h, 0xb07a4a); },
  /** Shop shutters down a side street (photograph); the figures stand on the pavement. */
  shutters(p, K, s, h) { if (!photo(p, K, 'shutters', h, { fy: 0.6, wash: 0.36 })) p.rect(0, 0, W, h, 0xd9d4cc); stage(p, K, h, 0x9a9690); },
  /** A bamboo grove (photograph); the figures stand on a museum plinth. */
  bamboo(p, K, s, h) { if (!photo(p, K, 'bamboo', h, { fy: 0.5, wash: 0.38 })) p.rect(0, 0, W, h, 0xd4e0c4); stage(p, K, h, 0xd9cfbc); },
  /** A page of graph paper on a school desk, pencilled on: the figures stand on the desk. */
  desk(p, K, s, h) {
    const PAPER = 0xf8f4e8, GRID = 0xc4d8e8, GRID2 = 0x9cbcd8, PEN = 0x6a6e86, RED = 0xe0786c;
    p.rect(0, 0, W, h, 0xd6b48a);
    for (let y = 0; y < h; y += 7) p.rect(0, y, W, 1, 0xc9a67a);
    p.rect(26, 0, 560, h - 46, PAPER); p.rect(586, 4, 3, h - 50, 0xb89a74); p.rect(29, h - 46, 560, 3, 0xb89a74);
    for (let x = 30; x < 586; x += 8) p.rect(x, 0, 1, h - 46, (x - 30) % 40 ? GRID : GRID2);
    for (let y = 4; y < h - 46; y += 8) p.rect(26, y, 560, 1, (y - 4) % 40 ? GRID : GRID2);
    p.rect(74, 0, 2, h - 46, RED);
    // the punched holes and a pencilled sum, a star and an arrow, a ruler laid across
    for (let y = 22; y < h - 60; y += 56) { p.circle(40, y, 5, 0xd6b48a); p.circle(40, y, 4, 0xc9a67a); }
    const pen = (pts) => { for (let i = 0; i + 1 < pts.length; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], PEN); };
    pen([[100, 200], [118, 160], [136, 200], [96, 176], [140, 176], [100, 200]]);
    pen([[470, 210], [520, 196], [512, 190]]); pen([[520, 196], [513, 203]]);
    p.text('3+5=8', 168, 172, { size: 16, color: PEN }); p.text('9-4=5', 168, 196, { size: 16, color: PEN });
    for (let x = 300; x < 640; x++) { const y = 28 + Math.round((x - 300) * 0.12); p.rect(x, y, 1, 18, 0xf2e0a4); p.px(x, y, 0xfff4c8); p.px(x, y + 17, 0xc9b070); if (x % 6 === 0) p.rect(x, y + 1, 1, x % 30 === 0 ? 8 : 4, 0x6a5a3a); }
    stage(p, K, h, 0xc99a68);
  },
};
