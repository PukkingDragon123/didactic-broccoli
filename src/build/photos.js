// Photo posters: every print is a random real photo (Google Open Images, CC BY 2.0: see CREDITS.md), cover-cropped
// to a small pixel canvas, colour-graded and ordered-dithered to the game's look. Never drawn by hand.
//   PHOTOS: [{ id, path, title, author, w, h }]   randomPhoto(rng?) -> id   photoInfo(id)
//   printCanvas(id, { portrait }) -> { canvas, ready: Promise }   (the canvas is redrawn once the photo has loaded)

// [file, title, author, width, height]: the wall prints (img/photos/prints/) and the flyer photos (img/photos/)
const PRINTS = [
  ['bamboo_forest', "Bamboo Forest Kyoto", "Noel Reynolds", 320, 213],
  ['shibuya_night', "Shibuya by night", "kazuletokyoite", 320, 213],
  ['ramen_bowl', "Ramen Tatsu", "kennejima", 320, 213],
  ['tonkotsu_ramen', "Tonkotsu Ramen from Ramen O-San", "insatiablemunch", 320, 213],
  ['niboshi_ramen', "Spicy Niboshi Ramen @ Nagi Niboshio @ Shibuya", "Guilhem Vellut", 320, 240],
  ['sushi_plate', "Sushi", "Paul Robinson", 320, 239],
  ['tuna_market', "Tuna, Tokyo Fish Market", "Jay Bergesen", 320, 213],
  ['shinto_shrine', "Shinto shrine north of Takeshima", "Ken Mayer", 320, 213],
  ['camellia', "Sakura in bloom @ Kitanomaru Garden", "Guilhem Vellut", 320, 240],
  ['sakura_branch', "Expo Park Sakura", "Chris Gladis", 320, 213],
  ['koi_fish', "Koi Fish", "Scott Oves", 320, 213],
  ['koi_pond', "Bubbles and Koi", "Caitlin Doe", 320, 240],
  ['snowy_owl', "Tundra the Snowy Owl", "Will Thomas", 320, 192],
  ['arctic_fox', "Arctic fox", "NASA ICE", 320, 184],
  ['red_panda', "Red Panda aka FireFox", "Mike Bowler", 240, 320],
  ['penguin', "Grumpy Penguin", "Karri Huhtanen", 240, 320],
  ['kitten_grey', "young kitten", "Angelin Song", 320, 213],
  ['fireworks_burst', "Fireworks 2", "Sonja Lovas", 320, 213],
  ['lighthouse_island', "Satamisaki Lighthouse", "hiroaki", 320, 240],
  ['waterfall', "Waterfall @ Cameron Highlands, Malaysia", "Tim Parkinson", 240, 320],
  ['saturn_rocket', "Saturn Rocket", "Milan Boers", 320, 240],
  ['tulips', "Tulips", "FotoGuy 49057", 320, 240],
  ['sunflowers', "sunflower two", "Jean Rogers", 240, 320],
  ['forest_railway', "Hong Kong Tram", "Andrew Hitchcock", 213, 320],
  ['dinosaur', "Dinosaur at Parc de Prehistoire", "Andy Hay", 320, 213],
  ['ferris_wheel', "The Ferris Wheel", "Battle Creek CVB", 320, 213],
  ['lantern_festival', "The Lantern Festival", "Martin Chen", 320, 214],
  ['lantern_corridor', "Chinese Lanterns", "Bogdan Migulski", 320, 240],
  ['wisteria', "Fuji", "leighklotz", 320, 213],
  ['snow_apple', "弘前市 Hirosaki City, Frozen apples", "Ari Helminen", 212, 320],
  ['lake_islands', "Lake Manitouwabing", "Jim Marshall", 320, 240],
  ['snow_leopard', "Snow leopard", "Roger Ahlbrand", 320, 240],
  ['penguins', "Penguins, Bergen zoo", "Michela Simoncini", 320, 180],
  ['panda', "Panda Sleeping", "Owen Byrne", 320, 208],
  ['neon_sign', "Vegas Neon Sign in Daylight", "MsSaraKelly", 320, 213],
  ['peace_pagoda', "Pagoda", "tess/", 320, 240],
  ['kawai_house', "Kawai Kanjiro's House, Kyoto", "np&djjewell", 320, 214],
  ['beach_bonfire', "Bonfire on the beach", "Tobias Toft", 320, 155],
  ['lighthouse', "Covehead lighthouse", "Andrea Schaffer", 213, 320],
  ['black_kittens', "kittens", "Alachua County", 320, 229],
  ['fluffy_kitten', "One of our kittens", "David~O", 320, 240],
  ['frozen_lake', "Lake Fryxell", "Simon Steinberger", 320, 172],
  ['cat_in_leaves', "autumn leaves", "wracam", 320, 240],
  ['ice_cave', "Waterfall ice cave", "Guttorm Flatabø", 320, 240],
  ['tappi_station', "Tappi-Kaitei Station", "Kzaral", 320, 240],
  ['sunset_peak', "Sandia Peak Sunset", "John Fowler", 320, 181],
  ['atoll', "Maldives islands, Indian Ocean", "flowcomm", 320, 213],
  ['forbidden_city', "The Forbidden City", "whatleydude", 320, 180]
];
const FLYER = [
  ['gacha_wall', "Wall of Gachapon", "Steve Nagata", 1024, 768],
  ['gacha_rows', "Gashapon", "Dick Thomas Johnson", 1024, 768],
  ['gacha_kaikan', "Gachapon Kaikan @ Akihabara", "Guilhem Vellut", 1024, 768],
  ['parcels', "Parcels", "Nigel Lamb", 1024, 1024],
  ['back_street', "Tokyo street green light", "Raphael Desrosiers", 1024, 768],
  ['garage', "Tidy garage", "Bryn Pinzgauer", 1024, 768],
  ['rainy_lane', "Japan - Tokyo (Yanaka)", "Maya-Anaïs Yataghène", 1024, 683],
  ['fireworks', "Sumida River Fireworks Festival 2008", "kokorowashinjin", 1024, 768],
  ['rain_window', "rainy window in london", "trshdevil buffy", 1024, 683],
  ['cumulus', "A Large Cumulus Cloud", "oatsy40", 1024, 768],
  ['galaxy', "M101 - Largest ever Hubble galaxy portrait", "Davide De Martin", 1024, 801],
  ['toy_shop', "Toy Shop", "Garry Knight", 683, 1024],
  ['shutters', "Rusted Shutters", "alisdair", 768, 1024],
  ['skyline', "Beautiful Tokyo at Night", "tenaciousme", 1024, 768],
  ['neon_night', "Tokyo at night", "luckygun", 1024, 768],
  ['akiba_dusk', "akihabara lights", "Jon Rawlinson", 1024, 683],
  ['sakura', "Sakura - A cherry blossom @Tokyo", "Yoshikazu TAKADA", 768, 1024],
  ['milky_way', "The Milky Way", "Anish Kharkar", 1024, 683],
  ['blossom_lamp', "cherry blossoms by streetlight", "schvin", 1024, 678]
];

export const PHOTOS = [
  ...PRINTS.map(([f, title, author, w, h]) => ({ id: f, path: `img/photos/prints/${f}.jpg`, title, author, w, h })),
  ...FLYER.map(([f, title, author, w, h]) => ({ id: 'flyer_' + f, path: `img/photos/${f}.jpg`, title, author, w, h })),
];
const BY_ID = Object.fromEntries(PHOTOS.map((p) => [p.id, p]));
export const photoInfo = (id) => BY_ID[id] || null;

/** A random photo id, avoiding the ones in `avoid` when possible. */
export function randomPhoto(avoid = [], rnd = Math.random) {
  const pool = PHOTOS.filter((p) => !avoid.includes(p.id));
  const list = pool.length ? pool : PHOTOS;
  return list[Math.floor(rnd() * list.length)].id;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Posterize to a few levels per channel with ordered dithering (in place). */
function posterize(ctx, w, h, levels = 6, dither = 0.6) {
  const im = ctx.getImageData(0, 0, w, h), d = im.data, step = 255 / (levels - 1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, t = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * step * dither;
    for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, Math.round((d[i + k] + t) / step) * step));
  }
  ctx.putImageData(im, 0, 0);
}

const images = new Map();
function loadImage(path) {
  if (!images.has(path)) {
    images.set(path, new Promise((res) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = () => { console.warn('poster photo missing', path); res(null); };
      img.src = path;
    }));
  }
  return images.get(path);
}

/** Is this photo taller than wide? */
export const isPortrait = (id) => { const p = BY_ID[id]; return !!p && p.h > p.w * 1.05; };

/**
 * The print: a 64 x 48 (or 48 x 64) canvas with a paper border. Draws a placeholder now and the dithered photo once
 * it has loaded; ready resolves with the canvas then.
 */
export function printCanvas(id, { seed = 1 } = {}) {
  const p = BY_ID[id] || PHOTOS[0];
  const portrait = p.h > p.w * 1.05;
  const W = portrait ? 48 : 64, H = portrait ? 64 : 48, B = 3;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#efe6d2'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#8a8478'; g.fillRect(B, B, W - B * 2, H - B * 2);
  const ready = loadImage(p.path).then((img) => {
    if (!img) return c;
    const iw = W - B * 2, ih = H - B * 2;
    const t = document.createElement('canvas');
    t.width = iw; t.height = ih;
    const k = t.getContext('2d', { willReadFrequently: true });
    const s = Math.max(iw / img.naturalWidth, ih / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    k.imageSmoothingQuality = 'high';
    k.drawImage(img, (iw - dw) / 2, (ih - dh) / 2, dw, dh);
    // a printed-in-1985 grade: warmer, a little faded, then a handful of levels with ordered dither
    k.globalCompositeOperation = 'soft-light'; k.globalAlpha = 0.35; k.fillStyle = '#ffb070'; k.fillRect(0, 0, iw, ih);
    k.globalCompositeOperation = 'source-over'; k.globalAlpha = 0.08; k.fillStyle = '#f4ead8'; k.fillRect(0, 0, iw, ih);
    k.globalAlpha = 1;
    posterize(k, iw, ih, 6, 0.65);
    g.drawImage(t, B, B);
    // the photographer's mark in the corner of the paper border
    g.fillStyle = '#c8bca4';
    for (let i = 0; i < 6; i++) g.fillRect(W - B - 8 + i, H - 2, 1, 1);
    void seed;
    return c;
  });
  return { canvas: c, ready, portrait };
}
