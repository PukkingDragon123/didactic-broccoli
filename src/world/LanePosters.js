// Posters and neighbourhood notices pasted up around the lane, on walls, poles, a shutter, the underpass piers, the
// community board and the park. Every picture on them is a real photo (Google Open Images, CC BY 2.0: see CREDITS.md;
// public/img/photos/lane/ and the flyer photos in public/img/photos/), picked at random each time you play, then
// cover-cropped to a few dozen pixels, colour-graded like old print, posterized with an ordered dither and set with
// the pixel fonts: travel campaign posters, a sumo tour, the zoo, kakigori, the summer festival, lost cats and a lost
// dog with tear-off phone tabs, a flat for rent. Nothing on them is drawn by hand except the lettering.
//
// All the posters share one 512 x 512 canvas atlas and merge into the town's batch: one draw call for the lot. The
// atlas is painted once the photos and the pixel fonts have loaded (paper placeholders until then).
//   buildLanePosters(town) -> { atlas, list }
import * as THREE from 'three';
import { Pix, FONT_JP } from '../gfx/pix.js';
import { hash2 } from '../core/util.js';

const ZB = 5.3, ZF = 14.9, XT = 26;
const LANE = (n) => `img/photos/lane/${n}.jpg`;
const FLY = (n) => `img/photos/${n}.jpg`;
const PH = {
  travel: [LANE('fuji_morning'), LANE('fuji_izu'), LANE('snow_monkeys'), LANE('sailboat'), LANE('hydrangea'), LANE('shinkansen'), FLY('sakura'), FLY('blossom_lamp')],
  zoo: [LANE('elephant'), LANE('giraffe'), LANE('aquarium')],
  cats: [LANE('cat_black'), LANE('cat_grey'), LANE('cat_birman'), LANE('cat_fluffy')],
  dogs: [LANE('shiba'), LANE('shiba_puppy')],
  fest: [FLY('fireworks'), FLY('fireworks'), LANE('kakigori')],
  event: [LANE('sumo'), LANE('baseball')],
  ice: [LANE('kakigori')],
  any: [LANE('fuji_morning'), LANE('sumo'), LANE('baseball'), LANE('kakigori'), LANE('aquarium'), LANE('snow_monkeys'), LANE('hydrangea'), FLY('skyline'), FLY('rainy_lane'), FLY('cumulus'), FLY('milky_way'), FLY('neon_night')],
};
const TRAVEL = [['富士山', 'SEE JAPAN'], ['ふるさと', 'BY RAIL'], ['旅に出よう', 'JNR'], ['夏の海', 'SUMMER'], ['湯けむり', 'ONSEN']];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const images = new Map();
function load(path) {
  if (!images.has(path)) images.set(path, new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => { console.warn('lane poster photo missing', path); res(null); }; im.src = path; }));
  return images.get(path);
}

/** Draw a photo cover-cropped into pix at (x, y, w, h), graded and dithered. fade: sun-bleached (reds go first). */
function photo(p, img, x, y, w, h, { fade = 0, levels = 5, warm = 0.3 } = {}) {
  if (!img) { p.rect(x, y, w, h, 0x8a8478); return; }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  const im = g.getImageData(0, 0, w, h), d = im.data, step = 255 / (levels - 1);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4;
    let r = d[o], gg = d[o + 1], b = d[o + 2];
    // old-print grade: a little warm, lifted blacks; faded posters lose their reds and yellows to the sun
    r = r * (1 + warm * 0.12) + 10; gg = gg * (1 + warm * 0.04) + 8; b = b * (1 - warm * 0.08) + 12;
    if (fade) { const l = (r + gg + b) / 3; r = r + (l - r) * fade * 0.8 + 18 * fade; gg = gg + (l - gg) * fade * 0.4 + 14 * fade; b = b + 30 * fade; }
    const t = (BAYER[(j & 3) * 4 + (i & 3)] / 16 - 0.47) * step * 0.7;
    d[o] = Math.max(0, Math.min(255, Math.round((r + t) / step) * step));
    d[o + 1] = Math.max(0, Math.min(255, Math.round((gg + t) / step) * step));
    d[o + 2] = Math.max(0, Math.min(255, Math.round((b + t) / step) * step));
  }
  g.putImageData(im, 0, 0);
  p.flush(); p.ctx.drawImage(c, x, y); p.pull();
}

/** Paper wear: tape at the top corners, a torn corner (transparent), a few creases and grime. */
function wear(p, seed, { tape = true, torn = true } = {}) {
  const { w, h } = p;
  if (tape) for (const x of [1, w - 7]) p.rect(x, 0, 6, 3, 0xece4cc, 200);
  if (torn && hash2(seed, 3) < 0.6) {
    const right = hash2(seed, 4) < 0.5, n = 3 + Math.floor(hash2(seed, 5) * 5);
    for (let j = 0; j < n; j++) for (let i = 0; i < n - j; i++) { const x = right ? w - 1 - i : i, y = h - 1 - j; p.d[(y * w + x) * 4 + 3] = 0; }
  }
  for (let i = 0; i < 2; i++) { const y = Math.floor(hash2(seed, 10 + i) * h); for (let x = 0; x < w; x++) if (hash2(x, y + seed) < 0.5) p.px(x, y, 0xffffff, 40); }
  for (let x = 0; x < w; x++) for (let y = h - 6; y < h; y++) if (hash2(x + seed, y) < 0.15) p.px(x, y, 0x6a5a40, 60);
  p.dirty = true;
}

// ------------------------------------------------------------------ designs (each paints a Pix; imgs already loaded)
const DESIGNS = {
  /** A national-railways travel campaign poster: photo, title band, a small English line, a red rule. */
  travel(p, [img], seed) {
    const { w, h } = p, [title, sub] = TRAVEL[Math.floor(hash2(seed, 1) * TRAVEL.length)];
    p.fill(0xf4efe2);
    photo(p, img, 2, 2, w - 4, Math.round(h * 0.68), { fade: hash2(seed, 2) * 0.5 });
    p.text(title, w / 2, Math.round(h * 0.7) + 1, { size: title.length > 3 ? 12 : 16, color: 0x1a1a1a, align: 'center', font: FONT_JP });
    p.tinyText(sub, w / 2, h - 13, { color: 0x8a2a2a, align: 'center' });
    p.rect(4, h - 4, w - 8, 2, 0xc8282a);
  },
  /** 大相撲 / 少年野球: a red banner, the photo, venue and dates. */
  event(p, [img], seed, src = '') {
    const { w, h } = p, sumo = src.includes('sumo');
    p.fill(0xf8f4ea);
    p.rect(0, 0, w, 18, sumo ? 0xb82020 : 0x1f4a9a);
    p.text(sumo ? '大相撲' : '少年野球', w / 2, 1, { size: sumo ? 16 : 12, color: 0xfbf8f0, align: 'center', font: FONT_JP });
    photo(p, img, 2, 20, w - 4, Math.round(h * 0.55), { fade: hash2(seed, 2) * 0.4 });
    const y = 22 + Math.round(h * 0.55);
    p.text(sumo ? '上山場所' : '夏季大会', w / 2, y, { size: 12, color: 0x1a1a1a, align: 'center', font: FONT_JP });
    p.tinyText(sumo ? '8.15-8.20' : 'JULY 27', w / 2, h - 10, { color: 0xb82020, align: 'center' });
  },
  /** The zoo / aquarium: a full-bleed photo with a yellow name box. */
  zoo(p, [img], seed) {
    const { w, h } = p, aq = hash2(seed, 7) < 0.4;
    photo(p, img, 0, 0, w, h, { fade: hash2(seed, 2) * 0.3 });
    p.rect(3, h - 24, w - 6, 20, 0xf2c41a); p.frame(3, h - 24, w - 6, 20, 0x2a2a2a);
    p.text(aq ? 'すいぞくかん' : 'どうぶつえん', w / 2, h - 23, { size: 9, color: 0x1a1a1a, align: 'center', font: FONT_JP });
    p.tinyText(aq ? 'AQUARIUM' : 'ZOO', w / 2, h - 13, { color: 0x8a2a2a, align: 'center' });
  },
  /** かき氷 はじめました: the summer sweet shop's notice. */
  kakigori(p, [img]) {
    const { w, h } = p;
    p.fill(0xfbf8f0);
    photo(p, img, 3, 18, w - 6, Math.round(h * 0.5), { warm: 0.1 });
    p.text('かき氷', w / 2, 1, { size: 16, color: 0x2a5ab0, align: 'center', font: FONT_JP });
    p.text('はじめました', w / 2, 20 + Math.round(h * 0.5), { size: 9, color: 0xd8282a, align: 'center', font: FONT_JP });
    p.tinyText('MIKAWA-YA', w / 2, h - 10, { color: 0x2a2a2a, align: 'center' });
  },
  /** 夏祭り: the neighbourhood association's festival poster (night-blue paper, fireworks). */
  festival(p, [img], seed) {
    const { w, h } = p;
    p.fill(0x1a2448);
    photo(p, img, 2, 2, w - 4, Math.round(h * 0.52), { warm: 0.2, levels: 6 });
    const y = 4 + Math.round(h * 0.52);
    p.text('夏祭り', w / 2, y, { size: 16, color: 0xffd23f, align: 'center', font: FONT_JP });
    p.text('盆踊り・夜店', w / 2, y + 18, { size: 9, color: 0xfbf8f0, align: 'center', font: FONT_JP });
    p.tinyText(hash2(seed, 3) < 0.5 ? '8/14 18:00' : '8/15 18:30', w / 2, h - 18, { color: 0xffd23f, align: 'center' });
    p.text('上山町内会', w / 2, h - 11, { size: 9, color: 0xc8c4d8, align: 'center', font: FONT_JP });
  },
  /** 迷い猫 / 迷い犬: lost pet with a photo, details and tear-off phone tabs (some already taken). */
  lost(p, [img], seed, dog = false) {
    const { w, h } = p;
    p.fill(0xfbf8ee);
    p.text(dog ? '迷い犬' : '迷い猫', w / 2, 0, { size: 16, color: 0xd8282a, align: 'center', font: FONT_JP });
    photo(p, img, 4, 18, w - 8, Math.round(h * 0.42), { warm: 0.1 });
    const y = 20 + Math.round(h * 0.42);
    const names = dog ? ['POCHI', 'HACHI', 'KOTA'] : ['MIKAN', 'TAMA', 'KURO', 'MOMO'];
    p.tinyText(names[Math.floor(hash2(seed, 8) * names.length)], w / 2, y, { color: 0x1a1a1a, align: 'center' });
    p.text('さがしています', w / 2, y + 8, { size: 9, color: 0x333333, align: 'center', font: FONT_JP });
    for (let x = 2; x < w - 3; x += 6) {
      if (hash2(x, seed) < 0.3) { for (let yy = h - 12; yy < h; yy++) for (let xx = x; xx < x + 5; xx++) p.d[(yy * w + xx) * 4 + 3] = 0; continue; }
      p.frame(x, h - 12, 5, 12, 0xb8b4a8);
      for (let yy = h - 10; yy < h - 2; yy += 2) p.px(x + 2, yy, 0x3a3a3a);
    }
    p.dirty = true;
  },
  /** 貸室: a flat for rent: rooms as a little floor plan, the rent, the agency. */
  rent(p, _imgs, seed) {
    const { w, h } = p;
    p.fill(0xfbf8f0); p.frame(0, 0, w, h, 0x1f4a9a);
    p.text('貸室', w / 2, 1, { size: 16, color: 0x1f4a9a, align: 'center', font: FONT_JP });
    const x0 = 6, y0 = 20, pw = w - 12, ph = 22;
    p.frame(x0, y0, pw, ph, 0x2a2a2a);
    p.rect(x0 + Math.round(pw * 0.45), y0, 1, ph, 0x2a2a2a); p.rect(x0, y0 + 11, Math.round(pw * 0.45), 1, 0x2a2a2a);
    p.rect(x0 + Math.round(pw * 0.45) + 1, y0 + 1, pw - Math.round(pw * 0.45) - 2, ph - 2, 0xd8d0a0);
    for (let i = 0; i < 4; i++) p.rect(x0 + Math.round(pw * 0.45) + 2, y0 + 3 + i * 5, pw - Math.round(pw * 0.45) - 4, 1, 0xb8a870);
    p.tinyText('2DK', w / 2, y0 + ph + 3, { color: 0x1a1a1a, align: 'center' });
    p.tinyText(hash2(seed, 2) < 0.5 ? '45000' : '38000', w / 2, y0 + ph + 12, { color: 0xd8282a, align: 'center' });
    p.text('太田不動産', w / 2, h - 11, { size: 9, color: 0x1f4a9a, align: 'center', font: FONT_JP });
  },
  /** Just a photo print with a white border and a tiny caption (a calendar page, a shop's picture poster). */
  print(p, [img], seed) {
    const { w, h } = p;
    p.fill(0xf4f0e4);
    photo(p, img, 3, 3, w - 6, h - 14, { fade: hash2(seed, 2) * 0.6 });
    p.tinyText(['1987', 'SHOWA 62', 'JUNE', 'AUGUST'][Math.floor(hash2(seed, 5) * 4)], w / 2, h - 10, { color: 0x6a6a6a, align: 'center' });
  },
};

// [design, photo pool, px w, px h, metres wide, world x, y (bottom), z, ry, tilt]
function spots() {
  const nF = ZF - 0.014, nB = ZB + 0.014;
  return [
    // near side walls
    ['travel', 'travel', 48, 68, 0.36, 12.75, 0.62, nB, 0, 0.02],
    ['lost', 'cats', 40, 58, 0.26, 16.05, 0.72, nB, 0, -0.03],
    ['festival', 'fest', 48, 68, 0.36, -9.05, 0.6, nB, 0, -0.015],
    ['event', 'event', 48, 68, 0.36, -7.75, 0.58, nB, 0, 0.02],
    ['print', 'any', 56, 44, 0.4, -24.6, 0.72, nB, 0, 0.01],
    // posters on the tobacco shop's shutter (it's been closed for years)
    ['zoo', 'zoo', 48, 68, 0.4, -19.6, 1.0, ZB + 0.048, 0, 0.03],
    ['travel', 'travel', 48, 68, 0.4, -19.05, 0.98, ZB + 0.049, 0, -0.02],
    // far side walls and fences
    ['kakigori', 'ice', 40, 58, 0.3, -24.4, 0.85, ZF + 0.012, Math.PI, 0.02],
    ['travel', 'travel', 48, 68, 0.36, -20.3, 0.7, nF, Math.PI, -0.02],
    ['lost', 'dogs', 40, 58, 0.26, -1.95, 0.75, nF, Math.PI, 0.03],
    ['print', 'any', 56, 44, 0.38, 2.25, 0.85, nF, Math.PI, -0.01],
    ['rent', null, 40, 58, 0.26, 18.45, 0.72, nF, Math.PI, 0.02],
    ['zoo', 'zoo', 48, 68, 0.36, 19.15, 0.6, nF, Math.PI, -0.02],
    // utility poles (notices tied at eye height, facing the lane)
    ['lost', 'cats', 40, 58, 0.22, -22.4, 1.25, 14.32 - 0.17, Math.PI, 0.0],
    ['festival', 'fest', 40, 58, 0.24, 10.0, 1.2, 14.32 - 0.17, Math.PI, 0.0],
    ['lost', 'cats', 40, 58, 0.22, -16.3, 1.3, 14.32 - 0.17, Math.PI, 0.0],
    ['rent', null, 40, 58, 0.22, 17.6, 1.25, 14.32 - 0.17, Math.PI, 0.0],
    // the underpass piers (guerrilla posters on the brick, facing the lane)
    ['event', 'event', 48, 68, 0.38, -(XT - 0.4), 1.15, 13.25, Math.PI / 2, 0.02],
    ['travel', 'travel', 48, 68, 0.38, XT - 0.4, 1.12, 13.3, -Math.PI / 2, -0.02],
    ['print', 'any', 56, 44, 0.38, -(XT - 0.4), 0.62, 5.45, Math.PI / 2, -0.01],
    // the community notice board by Sakura Heights
    ['lost', 'cats', 40, 58, 0.2, 17.2, 1.02, 5.536, 0, 0.03],
    ['festival', 'fest', 40, 58, 0.22, 17.66, 1.03, 5.536, 0, -0.02],
    // the passage and the park (warehouse wall by the entrance)
    ['travel', 'travel', 48, 68, 0.34, 9.812, 0.55, 3.0, Math.PI / 2, 0.02],
    ['zoo', 'zoo', 48, 68, 0.38, 11.462, 1.15, -8.4, Math.PI / 2, -0.02],
    ['lost', 'dogs', 40, 58, 0.24, 11.462, 1.2, -9.2, Math.PI / 2, 0.03],
  ];
}

export function buildLanePosters(t) {
  const AW = 512, AH = 512;
  const atlas = new Pix(AW, AH, 5);
  atlas.flush();
  const tex = new THREE.CanvasTexture(atlas.canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.92, alphaTest: 0.5 });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -4;
  // shelf-pack the posters into the atlas and lay their quads into the town batch
  let ax = 0, ay = 0, row = 0;
  const list = [];
  const rnd = Math.random;
  spots().forEach(([design, pool, pw, ph, mw, x, y, z, ry, tilt], i) => {
    if (ax + pw > AW) { ax = 0; ay += row + 1; row = 0; }
    if (ay + ph > AH) return;
    const r = { x: ax, y: ay, w: pw, h: ph };
    ax += pw + 1; row = Math.max(row, ph);
    const mh = mw * ph / pw, seed = Math.floor(rnd() * 1000) + i * 17;
    const age = 0.8 + rnd() * 0.25; // sun and rain: older posters are a little darker and greyer
    t.quadUV(mat, mw, mh, x, y, z, [r.x / AW, 1 - (r.y + r.h) / AH, (r.x + r.w) / AW, 1 - r.y / AH], { ry, rz: tilt, tint: new THREE.Color(age, age, age * 0.97).getHex() });
    const src = pool ? PH[pool][Math.floor(rnd() * PH[pool].length)] : null;
    list.push({ design, pool, src, r, seed, dog: pool === 'dogs' });
    // a paper placeholder until the photo is in
    atlas.rect(r.x, r.y, r.w, r.h, 0xe8e2d2);
  });
  atlas.flush();
  tex.needsUpdate = true;
  // paint everything once the photos and the pixel fonts are ready
  const fonts = document.fonts ? Promise.all([document.fonts.load('16px "DotGothic16"', '迷い猫'), document.fonts.load('16px "Alagard"')]).catch(() => {}) : Promise.resolve();
  Promise.all([fonts, ...list.map((it) => (it.src ? load(it.src) : Promise.resolve(null)))]).then(([, ...imgs]) => {
    list.forEach((it, i) => {
      const p = new Pix(it.r.w, it.r.h, it.seed);
      try {
        if (it.design === 'lost') DESIGNS.lost(p, [imgs[i]], it.seed, it.dog);
        else DESIGNS[it.design](p, [imgs[i]], it.seed, it.src || '');
        wear(p, it.seed, { tape: it.r.h > 50 });
      } catch (e) { console.warn('lane poster', it.design, e); }
      p.flush();
      atlas.ctx.clearRect(it.r.x, it.r.y, it.r.w, it.r.h);
      atlas.ctx.drawImage(p.canvas, it.r.x, it.r.y);
    });
    tex.needsUpdate = true;
  });
  t.lanePosters = { atlas, list, material: mat };
  return t.lanePosters;
}
