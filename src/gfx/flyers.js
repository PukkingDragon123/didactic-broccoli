// Shop flyers and promo posters as low-res pixel art (150 x 212 px, shown with nearest-neighbour scaling): real stock
// photos (Google Open Images, CC BY 2.0: see CREDITS.md and public/img/photos) shrunk and ordered-dithered to a few
// colour levels, the game's own 3D models rendered as aliased sprites with a 1 px outline, flat colour blocks and a
// high-res pixel type (src/gfx/pixfont.js). Two kinds:
//   notice the shop's own notices: stamp card, summer hours, swap meet, gift wrapping... (handed out in the lane)
//   promo  shop posters: the reopening, new series, the secret figures, special finishes (handed out and on the walls)
// Each design is drawn once into its own canvas (lazily, one at a time) and cached; textures update in place.
//   initFlyers(renderer, { thumbs })      the WebGLRenderer used for the 3D shots (+ Thumbs for machine banners)
//   flyerCanvas(id) / flyerTexture(id)    the sheet (blank paper until drawn); whenFlyer(id) -> Promise<canvas>
//   upscaleFlyer(canvas, k)               a k x nearest-neighbour copy (exports)
//   FLYERS: [{ id, kind, name, lines }]   lines: what people say after reading it;  POSTERS: the promo ones
import * as THREE from 'three';
import { printHas, printRegions, whenPrint } from './printAtlas.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Human } from '../people/Human.js';
import { makeSpec } from '../people/presets.js';
import { applyCosmeticSpec, dressHuman } from '../people/cosmetics.js';
import { createAvatarHuman } from '../people/avatar.js';
import { CatRig } from '../world/CatRig.js';
import { buildMachineModel } from '../world/machineModels.js';
import { bannerTexture } from './banner.js';
import { makeCapsule } from '../game/Capsule.js';
import { makeItemMesh, whenItemReady } from '../game/collectibles.js';
import { SERIES, SERIES_BY_ID } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { FINISHES } from '../data/finishes.js';
import { drawPx, textWPx } from './pixfont.js';
import { partsBox } from '../voxel/merge.js';

export const FLYER_W = 150, FLYER_H = 212; // pixels (A-series proportions)
const W = FLYER_W, H = FLYER_H;
const FOOT = 14; // the shop line along the bottom
const PH = H - FOOT; // the picture above it
const PHOTO_DIR = 'img/photos/';
// the flat colours (everything that isn't a photo or a sprite)
const C = {
  ink: '#1a1420', paper: '#f4ead6', white: '#fff8ec', red: '#c8322c', yellow: '#ffd23f', pink: '#ff7aa8', rose: '#b8325e',
  mint: '#9ff0b0', blue: '#4f8bff', navy: '#22305e', gold: '#f0c050', grey: '#7a6e72', orange: '#ff8a3a', green: '#3fae4f', purple: '#8a4fd0',
};

// numbers quoted on the posters come straight from the game data
const RARITY_SUM = Object.values(RARITIES).reduce((a, r) => a + r.weight, 0);
const SECRET_ODDS = Math.round(RARITY_SUM / RARITIES.secret.weight);
const GLOW_ODDS = Math.round(1 / FINISHES.glow.chance);
const FIGURES = SERIES.reduce((a, s) => a + s.items.length, 0);
const MIN_PRICE = Math.min(...SERIES.map((s) => s.price));

/** The designs (order = the order the stack cycles through: promos and notices alternate). */
export const FLYERS = [
  { id: 'reopen', kind: 'promo', name: 'Grand Reopening', lines: ['The old garage on the back lane is open again.', 'I used to buy capsules there after school.', 'Ten till eight. I\'ll go on Saturday.'] },
  { id: 'much', kind: 'notice', name: 'Stamp Card', lines: ['Ten turns and the next one is free? I\'ll take a card.', 'My son will fill that in a week.', 'A stamp card, like the shops when I was small.'] },
  { id: 'kaiju', kind: 'promo', name: 'Who\'s in the Suit?', lines: ['A monster suit with a mole inside. My kid will want it.', 'My dad still talks about the old monster films.', 'The clam robot looks well made.'] },
  { id: 'nope', kind: 'notice', name: 'Complete the Set', lines: ['I only need the rabbit now.', 'Six of them all lined up does look nice.', 'They give you a list to tick off? Handy.'] },
  { id: 'space', kind: 'promo', name: 'Appliance Animals', lines: ['My grandmother had that exact electric fan.', 'A toaster that turns into a rabbit.', 'I want the kettle one.'] },
  { id: 'distracted', kind: 'notice', name: 'Open Late on Fridays', lines: ['Open till nine on Fridays? I can go after work.', 'The lane is nice and quiet in the evening.', 'Good, I always miss it during the week.'] },
  { id: 'sakura', kind: 'promo', name: 'The Gods\' Messengers', lines: ['A little lacquer fox. Lovely work.', 'The white snake is meant to be lucky.', 'I\'ll bring my grandmother to see these.'] },
  { id: 'brain', kind: 'notice', name: 'World Tour Turtles', lines: ['A turtle carrying the Leaning Tower on its shell.', 'My father would like the pagoda one.', 'Six landmarks. I want the globe.'] },
  { id: 'secret', kind: 'promo', name: 'Super Secret', lines: [`One in ${SECRET_ODDS}. I'll try my luck once.`, 'Every series has a hidden one?', 'My nephew pulled a secret last week.'] },
  { id: 'simply', kind: 'notice', name: 'Summer Hours', lines: ['Open from nine all of August. Good to know.', 'The children will spend the whole holiday there.', 'I\'ll go in the morning before it gets hot.'] },
  { id: 'glow', kind: 'promo', name: 'Glow in the Dark', lines: ['They glow when the light is off?', 'That would look nice on a shelf at night.', 'One in two hundred. Not easy.'] },
  { id: 'nobody', kind: 'notice', name: 'Rainy Days', lines: ['Free barley tea when it rains. That\'s kind of them.', 'I\'ll wait out the rain there.', 'A dry seat and a cup of tea. Fine by me.'] },
  { id: 'expect', kind: 'notice', name: 'Capsule Swap Meet', lines: ['I have three of the same frog to swap.', 'A swap meet on Sunday. I\'ll bring my doubles.', 'Good idea. Nobody wants five of one.'] },
  { id: 'manager', kind: 'notice', name: 'Our Shop Cat', lines: ['Mikan. What a sweet name.', 'She\'s on a diet? She does look round.', 'I\'ll say hello to her next time.'] },
  { id: 'itwasme', kind: 'notice', name: 'Gift Wrapping', lines: ['Wrapped for fifty yen. Nice for a present.', 'I\'ll get one for my niece\'s birthday.', 'A capsule toy as a gift. Why not.'] },
];
export const FLYER_BY_ID = Object.fromEntries(FLYERS.map((f, i) => [f.id, { ...f, index: i }]));
export const POSTERS = FLYERS.filter((f) => f.kind === 'promo');

// ------------------------------------------------------------------ canvases, textures, the render queue
const sheets = new Map(); // id -> { canvas, tex, done, waiters }
let env = null; // { renderer, thumbs }
let busy = false;
const queue = [];

function sheet(id) {
  let s = sheets.get(id);
  if (!s) {
    // a baked design (tools/bake-postersets.py) gets a canvas of its own print size, so it is copied 1:1 (crisp pixel type)
    const r = printRegions('promo')['promo:' + id];
    const canvas = r ? canvas2d(r[2], r[3]) : canvas2d(W, H);
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.fillStyle = C.paper; g.fillRect(0, 0, canvas.width, canvas.height);
    s = { canvas, tex: null, done: false, waiters: [] };
    sheets.set(id, s);
  }
  return s;
}

export function initFlyers(renderer, opts = {}) { env = { renderer, thumbs: opts.thumbs || null }; pump(); }

/** The sheet for a design (blank paper until its art is drawn; asks for it to be drawn). */
export function flyerCanvas(id) { const s = sheet(id); want(id); return s.canvas; }
export function flyerReady(id) { return !!sheets.get(id)?.done; }
/** A texture of the sheet that updates itself once the art is in (crisp pixels up close). */
export function flyerTexture(id) {
  const s = sheet(id);
  if (!s.tex) {
    s.tex = new THREE.CanvasTexture(s.canvas);
    s.tex.colorSpace = THREE.SRGBColorSpace;
    s.tex.magFilter = THREE.NearestFilter;
    s.tex.anisotropy = 4;
  }
  want(id);
  return s.tex;
}
/** Resolves with the finished canvas. */
export function whenFlyer(id) {
  const s = sheet(id);
  if (s.done) return Promise.resolve(s.canvas);
  want(id);
  return new Promise((res) => s.waiters.push(res));
}
/** Queue every design (low priority). */
export function prewarmFlyers() { for (const f of FLYERS) want(f.id, true); }
/** A k x bigger copy with hard pixel edges. */
export function upscaleFlyer(src, k = 4) {
  const c = canvas2d(src.width * k, src.height * k), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function want(id, low = false) {
  const s = sheet(id);
  if (s.done || queue.includes(id)) return;
  if (low) queue.push(id); else queue.unshift(id);
  pump();
}

function pump() {
  if (busy || !env || !queue.length) return;
  busy = true;
  const id = queue.shift();
  // one design per idle moment, so drawing never stacks up into a long hitch
  const run = async () => {
    try { await draw(id); } catch (e) { console.warn('flyer art', id, e); }
    const s = sheet(id);
    s.done = true;
    if (s.tex) s.tex.needsUpdate = true;
    for (const w of s.waiters.splice(0)) w(s.canvas);
    busy = false;
    setTimeout(pump, 120);
  };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 600 }); else setTimeout(run, 30);
}

async function draw(id) {
  // the promos are baked from real photos and the actual toys (tools/bake-posters.py 'promo'): copy the print in
  if (printHas('promo', 'promo:' + id)) {
    const img = await whenPrint('promo'), r = printRegions('promo')['promo:' + id];
    if (img && r) {
      const cv = sheet(id).canvas, g = cv.getContext('2d');
      g.imageSmoothingEnabled = r[2] !== cv.width || r[3] !== cv.height; g.imageSmoothingQuality = 'high';
      g.clearRect(0, 0, cv.width, cv.height); g.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, cv.width, cv.height);
      return;
    }
  }
  const d = DESIGNS[id];
  if (!d) return; // no hand-drawn fallback: the baked print (tools/bake-postersets.py) is the design
  await Promise.all((d.photos || []).map(loadPhoto));
  // drawn off-screen and copied onto the sheet at the end: the 3D shots now finish asynchronously, over several idle
  // moments, and the sheet should never show half a design
  const c = canvas2d(W, H), g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  rect(g, 0, 0, W, H, C.paper);
  await d.draw(g);
  footer(g, d.foot);
  sheet(id).canvas.getContext('2d', { willReadFrequently: true }).drawImage(c, 0, 0);
}

// the rest of a design waits for the browser's next idle moment (performance: a design is drawn a piece at a time)
const idleTurn = () => new Promise((res) => (window.requestIdleCallback ? requestIdleCallback(() => res(), { timeout: 600 }) : setTimeout(res, 30)));

// ------------------------------------------------------------------ text: high-res pixel type (src/gfx/pixfont.js)
const textW = textWPx;
/** Bitmap text (see drawPx); ink colour by default. */
const px = (g, str, x, y, o = {}) => drawPx(g, str, x, y, { col: C.ink, ...o });

// ------------------------------------------------------------------ pixel helpers
function canvas2d(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hashStr(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619); return x >>> 0; }
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9 >>> 0) / 4294967296); }
function rect(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
/** A pixel ellipse (flat colour; shadows under sprites). */
function oval(g, cx, cy, rx, ry, col) {
  g.fillStyle = col;
  for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2))); if (hw > 0) g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1); }
}
function put(g, img, x, y) { g.drawImage(img, Math.round(x), Math.round(y)); }

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Reduce a canvas to a few levels per channel, with ordered dithering (dither 0..1). Alpha is kept. */
function posterize(c, levels = 5, dither = 1) {
  const g = c.getContext('2d', { willReadFrequently: true }), im = g.getImageData(0, 0, c.width, c.height), d = im.data, step = 255 / (levels - 1);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, t = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * step * dither;
    for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, Math.round((d[i + k] + t) / step) * step));
  }
  g.putImageData(im, 0, 0);
  return c;
}

// ------------------------------------------------------------------ the photos
const photos = new Map(); // name -> { img, promise }
function loadPhoto(name) {
  let p = photos.get(name);
  if (!p) {
    p = {};
    p.promise = new Promise((res) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { p.img = img; res(img); };
      img.onerror = () => { console.warn('flyer photo missing', name); res(null); };
      img.src = PHOTO_DIR + name + '.jpg';
    });
    photos.set(name, p);
  }
  return p.promise;
}

/**
 * Fill a box with a photo shrunk to pixel size (cover-fit), graded, then posterized + dithered. o:
 *   fx, fy  focal point 0..1, zoom (>1 crops in), sat (saturation kept 0..1), dark 0..1, tint [colour, alpha, blend],
 *   wash [colour, alpha], levels (per channel, default 5), dither 0..1
 */
function photoBg(g, name, x, y, w, h, o = {}) {
  const img = photos.get(name)?.img;
  const c = canvas2d(w, h), k = c.getContext('2d', { willReadFrequently: true });
  if (!img) { k.fillStyle = C.grey; k.fillRect(0, 0, w, h); } else {
    const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(w / iw, h / ih) * (o.zoom || 1);
    const dw = iw * s, dh = ih * s;
    k.imageSmoothingQuality = 'high';
    k.drawImage(img, (w - dw) * (o.fx ?? 0.5), (h - dh) * (o.fy ?? 0.5), dw, dh);
  }
  if (o.sat !== undefined && o.sat < 1) { k.globalCompositeOperation = 'saturation'; k.globalAlpha = 1 - o.sat; k.fillStyle = '#808080'; k.fillRect(0, 0, w, h); }
  if (o.tint) { k.globalCompositeOperation = o.tint[2] || 'soft-light'; k.globalAlpha = o.tint[1]; k.fillStyle = o.tint[0]; k.fillRect(0, 0, w, h); }
  k.globalAlpha = 1;
  if (o.dark) { k.globalCompositeOperation = 'multiply'; const v = Math.round(255 * (1 - o.dark)); k.fillStyle = `rgb(${v},${v},${v})`; k.fillRect(0, 0, w, h); }
  k.globalCompositeOperation = 'source-over';
  if (o.wash) { k.globalAlpha = o.wash[1]; k.fillStyle = o.wash[0]; k.fillRect(0, 0, w, h); k.globalAlpha = 1; }
  posterize(c, o.levels || 5, o.dither ?? 0.6);
  put(g, c, x, y);
}

// ------------------------------------------------------------------ the 3D studio (renders tiny, aliased sprites)
let studio = null;
class Studio {
  constructor(renderer) {
    this.r = renderer;
    const scene = this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.hemi = new THREE.HemisphereLight(0xfff2e4, 0x4a3a34, 1.05);
    this.key = new THREE.DirectionalLight(0xfff0dc, 2.3);
    this.rim = new THREE.DirectionalLight(0xc4dcff, 1.4);
    this.fill = new THREE.DirectionalLight(0xffd6c0, 0.45); this.fill.position.set(2.4, 0.6, 2);
    scene.add(this.hemi, this.key, this.rim, this.fill);
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.01, 60);
    this.rts = new Map();
  }

  /**
   * Render objects into a transparent w x h canvas: no anti-aliasing (hard pixel edges), alpha thresholded.
   * o: { w, h, pos, look, fov, key: [x,y,z], keyCol, keyI, rim: [x,y,z], rimCol, rimI, hemi, env }
   * c.proj([x,y,z]) -> [x, y] pixels in the shot (for shadows and labels).
   */
  async shot(objs, o) {
    const r = this.r, w = Math.max(1, Math.round(o.w)), h = Math.max(1, Math.round(o.h)), key = w + 'x' + h;
    let rt = this.rts.get(key);
    if (!rt) { rt = new THREE.WebGLRenderTarget(w, h); rt.texture.colorSpace = THREE.SRGBColorSpace; this.rts.set(key, rt); }
    for (const ob of objs) { this.scene.add(ob); ob.updateMatrixWorld(true); }
    this.key.position.set(...(o.key || [-1.6, 2.6, 2.6]));
    this.key.color.set(o.keyCol ?? 0xfff0dc); this.key.intensity = o.keyI ?? 2.3;
    this.rim.position.set(...(o.rim || [2.2, 1.8, -2.4]));
    this.rim.color.set(o.rimCol ?? 0xc4dcff); this.rim.intensity = o.rimI ?? 1.4;
    this.hemi.intensity = o.hemi ?? 1.05;
    this.scene.environmentIntensity = o.env ?? 0.55;
    const cam = this.cam;
    cam.fov = o.fov || 30; cam.aspect = w / h;
    cam.position.set(...o.pos); cam.lookAt(...o.look);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const prevRT = r.getRenderTarget(), prevC = r.getClearColor(new THREE.Color()), prevA = r.getClearAlpha();
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, cam);
    const pxs = new Uint8Array(w * h * 4);
    // performance: read back asynchronously (a pixel-pack buffer + fence, like src/gfx/thumbs.js) instead of making the
    // CPU wait for the GPU to finish everything queued before it; the sprite is finished once the pixels arrive
    const read = r.readRenderTargetPixelsAsync ? r.readRenderTargetPixelsAsync(rt, 0, 0, w, h, pxs) : r.readRenderTargetPixels(rt, 0, 0, w, h, pxs);
    r.setRenderTarget(prevRT);
    r.setClearColor(prevC, prevA);
    for (const ob of objs) this.scene.remove(ob);
    const pc = cam.clone();
    await read;
    await idleTurn();
    const c = canvas2d(w, h);
    const g = c.getContext('2d', { willReadFrequently: true });
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const src = (h - 1 - y) * w * 4, dst = y * w * 4;
      for (let x = 0; x < w * 4; x += 4) {
        const a = pxs[src + x + 3], k = a > 0 && a < 255 ? 255 / a : 1;
        img.data[dst + x] = Math.min(255, pxs[src + x] * k); img.data[dst + x + 1] = Math.min(255, pxs[src + x + 1] * k); img.data[dst + x + 2] = Math.min(255, pxs[src + x + 2] * k);
        img.data[dst + x + 3] = a < 24 ? 0 : a > 200 ? 255 : 150; // glass stays see-through, in one step
      }
    }
    g.putImageData(img, 0, 0);
    c.proj = (p) => { const v = new THREE.Vector3(...p).project(pc); return [(v.x * 0.5 + 0.5) * w, (0.5 - v.y * 0.5) * h]; };
    return c;
  }
}
/** A sprite: render, a few colour levels, then a 1 px dark outline around it (o.outline: colour or false). */
async function shot(objs, o) {
  // lowpix figures load lazily: wait for every figure in the shot
  const keys = new Set();
  for (const ob of objs) ob?.traverse?.((x) => { if (x.userData?.pending && x.userData.itemKey) keys.add(x.userData.itemKey); });
  if (keys.size) await Promise.all([...keys].map((k) => whenItemReady(k).catch(() => {})));
  studio = studio || new Studio(env.renderer);
  const c = await studio.shot(objs, o);
  if (o.grade) o.grade(c);
  posterize(c, o.levels || 7, o.dither ?? 0);
  if (o.outline !== false) outline(c, o.outline || C.ink);
  return c;
}
function outline(c, col) {
  const g = c.getContext('2d', { willReadFrequently: true }), im = g.getImageData(0, 0, c.width, c.height), d = im.data, w = c.width, h = c.height;
  const rgb = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] === 255;
  const add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] === 0 && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) add.push((y * w + x) * 4);
  for (const i of add) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; }
  g.putImageData(im, 0, 0);
}
/** Colour-grade a sprite in place (only where it has pixels). */
function gradeRender(img, col, mode = 'multiply', a = 1) {
  const t = canvas2d(img.width, img.height), k = t.getContext('2d');
  k.drawImage(img, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = col; k.fillRect(0, 0, t.width, t.height);
  const g = img.getContext('2d');
  g.save(); g.globalCompositeOperation = mode; g.globalAlpha = a; g.drawImage(t, 0, 0); g.restore();
  return img;
}
/** Gold reads as gold: deeper and warmer than the studio's neutral room makes it. */
const goldGrade = (img) => { gradeRender(img, '#e2a63c', 'multiply', 0.8); gradeRender(img, '#5a3200', 'screen', 0.2); };

/** A camera looking at `look` from yaw / pitch (radians, 0 = from the front +z) at distance d. */
function orbit(look, yaw, pitch, d) {
  return { pos: [look[0] + Math.sin(yaw) * Math.cos(pitch) * d, look[1] + Math.sin(pitch) * d, look[2] + Math.cos(yaw) * Math.cos(pitch) * d], look };
}
/** A flat shadow under a world point (x, 0, z) of a sprite drawn at (ox, oy), radius r metres. */
function contact(g, img, ox, oy, x, z, r, col = 'rgba(20,12,18,0.45)') {
  const [cx, cy] = img.proj([x, 0, z]), [ex] = img.proj([x + r, 0, z]), [, ey] = img.proj([x, 0, z + r]);
  const rx = Math.max(2, Math.round(Math.abs(ex - cx))), ry = Math.max(1, Math.round(Math.max(Math.abs(ey - cy), rx * 0.22)));
  oval(g, ox + cx, oy + cy, rx, ry, col);
}

// ------------------------------------------------------------------ the cast
/** A preset human (+ cosmetics); posed with a gesture / expression and settled. Their atlas is painted a few ms at a
 *  time in idle moments (the same pixels as painting it in one go). */
async function person(preset, seed, o = {}) {
  let h;
  if (o.avatar) { h = createAvatarHuman(o.avatar, { lazy: true }); await paintIdle(h); }
  else {
    const spec = makeSpec(preset, seed);
    if (o.noHat) spec.hat = null;
    if (o.noBag) spec.acc = spec.acc.filter((a) => a.kind === 'camera' || a.kind === 'towel' || a.kind === 'apron');
    if (o.spec) o.spec(spec);
    if (o.look) applyCosmeticSpec(spec, o.look);
    h = new Human(spec, { prebuild: true });
    await paintIdle(h);
    dressHuman(h, o.look || {}); // (also gives the poses their hand directions)
  }
  h.root.position.set(...(o.at || [0, 0, 0]));
  h.root.rotation.y = o.yaw || 0;
  h.root.updateMatrixWorld(true);
  if (o.gesture) h.gesture(o.gesture, o.gopts || {});
  if (o.expr) h.setExpression(o.expr, 0);
  const look = o.lookAt ? new THREE.Vector3(...o.lookAt) : null;
  h.fidgetT = 99; h.glanceT = 99;
  const n = Math.round((o.t ?? 1.4) * 30);
  for (let i = 0; i < n; i++) { h.blinkT = 9; h.update(1 / 30, { speed: o.speed || 0, lookAt: look }); }
  return h;
}

async function paintIdle(h) {
  let t = performance.now();
  while (!h.stepPaint()) if (performance.now() - t > 4) { await idleTurn(); t = performance.now(); }
}

function cat(o = {}) {
  const rig = new CatRig();
  rig.root.position.set(...(o.at || [0, 0, 0]));
  rig.root.rotation.y = o.yaw || 0;
  rig.setPose(o.pose || 'sit');
  if (o.mood) rig.mood = o.mood;
  rig.dark = 0.15;
  rig.prevYaw = rig.root.rotation.y;
  if (o.lookAt) rig.lookAt = new THREE.Vector3(...o.lookAt);
  for (let i = 0; i < 75; i++) rig.update(1 / 30, 0);
  rig.root.updateMatrixWorld(true);
  return rig;
}

function machine(type = 'retro', series = 'teruteru') {
  const banner = env.thumbs ? bannerTexture(series, env.thumbs, { faded: type === 'retro' }) : null;
  const { group } = buildMachineModel(type, banner ? { banner } : {});
  return group;
}

const CAPSULE_COLS = [0xff9eb5, 0x9ed8ff, 0xfff09e, 0xb8f0a8, 0xffc890];
/** A few capsules piled in the machine's window. */
function fillMachine(group, series = 'teruteru', seed = 7) {
  const b = bbox(group);
  const glass = [];
  group.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.transparent) glass.push(o); });
  const gb = glass.length ? glass.reduce((acc, o) => acc.union(bbox(o)), new THREE.Box3()) : new THREE.Box3(new THREE.Vector3(b.min.x * 0.6, b.max.y * 0.6, b.min.z * 0.5), new THREE.Vector3(b.max.x * 0.6, b.max.y * 0.85, b.max.z * 0.5));
  const c = gb.getCenter(new THREE.Vector3()), sz = gb.getSize(new THREE.Vector3());
  const r = Math.min(sz.x, sz.z) * 0.14, n = 14;
  const rr = rng(seed);
  for (let i = 0; i < n; i++) {
    const cp = capsule(series, CAPSULE_COLS[i % CAPSULE_COLS.length], r);
    const row = Math.floor(i / 5);
    cp.position.set(c.x + (rr() - 0.5) * (sz.x - r * 2.4) * 0.9, gb.min.y + r * (1 + row * 1.6) + rr() * r * 0.4, c.z + (rr() - 0.5) * (sz.z - r * 2.4) * 0.8);
    cp.rotation.set(rr() * 6, rr() * 6, rr() * 6);
    group.add(cp);
  }
}

function capsule(series, color, r) {
  const c = makeCapsule(series, color, r ? { radius: r } : {});
  return c.group || c;
}

function bbox(obj) { obj.updateMatrixWorld(true); return partsBox(obj); }
/** Fit objects (or a box) into a w x h shot from yaw / pitch. o: { w, h, yaw, pitch, fov, margin, dy (look offset, fraction of height) } */
function fit(objs, o) {
  const b = o.box || objs.reduce((acc, ob) => acc.union(bbox(ob)), new THREE.Box3());
  const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
  const fov = o.fov || 30, t = Math.tan(THREE.MathUtils.degToRad(fov / 2)), aspect = o.w / o.h;
  const d = Math.max(sz.y / 2 / t, Math.max(sz.x, sz.z) / 2 / (t * aspect)) * (o.margin || 1.1) + Math.max(sz.x, sz.z) / 2;
  return { ...o, fov, ...orbit([c.x, c.y + sz.y * (o.dy || 0), c.z], o.yaw || 0, o.pitch ?? 0.12, d) };
}
/** One figure on its own as a w x h sprite. */
function figure(key, finish, o) {
  const m = makeItemMesh(key, finish);
  if (o.rot) m.rotation.y = o.rot;
  return shot([m], fit([m], o));
}

// ------------------------------------------------------------------ layout bits
/** The shop line along the bottom of every sheet. */
function footer(g, o = {}) {
  rect(g, 0, PH, W, FOOT, o?.bg || C.red);
  px(g, 'GACHA GARAGE', 4, PH + 4, { col: o?.fg || C.white });
  px(g, `FROM ¥${MIN_PRICE}`, W - 4, PH + 4, { col: o?.price || C.yellow, align: 'right' });
}
/** A solid band with one line of small text, centred. */
function band(g, y, h, str, bg, col) { rect(g, 0, y, W, h, bg); if (str) px(g, str, W / 2, y + Math.round((h - 7) / 2), { col, align: 'center', max: W - 6 }); }
/** A small label: text on a solid box. */
function tag(g, str, cx, y, bg = C.ink, col = C.white) {
  const w = textW(str) + 6;
  rect(g, cx - w / 2, y, w, 11, bg);
  px(g, str, cx, y + 2, { col, align: 'center' });
}
const M = 5; // the meme sheets' paper border
// a menacing ゴ, hand-pixelled (the 5x7 font has no kana), with a 1 px ink edge
const GO = ['........#.#', '........#.#', '#######....', '......#....', '......#....', '......#....', '......#....', '......#....', '#######....'];
function goGlyph(g, x, y, s, col) {
  for (const [ox, oy, c] of [[-1, 0, C.ink], [1, 0, C.ink], [0, -1, C.ink], [0, 1, C.ink], [1, 1, C.ink], [0, 0, col]]) {
    GO.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') rect(g, x + i * s + ox, y + j * s + oy, s, s, c); });
  }
}

// ------------------------------------------------------------------ the designs
const DESIGNS = {
  // ================================================================ promo posters
  // the grand reopening: three machines and Mikan on a lit-up shopping street
  reopen: {
    photos: ['akiba_dusk'],
    async draw(g) {
      photoBg(g, 'akiba_dusk', 0, 0, W, PH, { fx: 0.4, fy: 0.3, tint: ['#ff8a40', 0.25], dark: 0.15 });
      band(g, 0, 40, '', C.ink);
      px(g, 'GRAND', 6, 6, { s: 2, col: C.yellow });
      px(g, 'REOPENING!', 6, 23, { s: 2, col: C.white });
      const objs = [], set = [['retro', 'teruteru', -0.5, 0.3], ['standard', 'henshin', 0, 0], ['deluxe', 'kaden', 0.52, -0.3]];
      for (const [type, s, x, ry] of set) { const m = machine(type, s); fillMachine(m, s, hashStr(s)); m.position.set(x, 0, Math.abs(x) * -0.25); m.rotation.y = ry; objs.push(m); }
      const c = cat({ at: [0.36, 0, 0.78], yaw: -0.35, lookAt: [0, 0.5, 3], mood: 'happy' });
      objs.push(c.root);
      const img = await shot(objs, { w: W, h: 140, ...orbit([0.04, 0.7, 0.1], 0, 0.07, 3.5), fov: 31, key: [-1.6, 2.4, 2.4], keyCol: 0xffe2c0, rimCol: 0xffc890, rimI: 1.6 });
      c.root.removeFromParent();
      for (const [, , x] of set) contact(g, img, 0, 44, x, Math.abs(x) * -0.25, 0.3);
      put(g, img, 0, 44);
      band(g, PH - 13, 13, `${SERIES.length} SERIES · ${FIGURES} FIGURES`, C.yellow, C.ink);
    },
  },

  // a new series: a giant kaiju over the night skyline
  kaiju: {
    photos: ['skyline'],
    async draw(g) {
      photoBg(g, 'skyline', 0, 0, W, PH, { fx: 0.55, fy: 0.62, zoom: 1.12, tint: ['#3a50ff', 0.25], dark: 0.1 });
      const k = makeItemMesh('nakanohito/tanbo'); k.rotation.y = -0.45;
      const b = bbox(k), sz = b.getSize(new THREE.Vector3()), ce = b.getCenter(new THREE.Vector3());
      const img = await shot([k], { w: 140, h: 150, ...orbit([ce.x, b.min.y + sz.y * 0.48, ce.z], 0.1, -0.12, sz.y * 2.3), fov: 32, key: [-0.8, 0.5, 1.6], keyCol: 0xffd0b0, keyI: 2.4, rim: [1.2, 0.4, -1.4], rimCol: 0x8aa0ff, rimI: 3, hemi: 0.7 });
      put(g, img, 8, PH - 13 - 146);
      px(g, 'NEW SERIES!', 6, 6, { col: C.yellow });
      px(g, 'WHO\'S IN\nTHE SUIT?', 6, 18, { s: 2, col: C.white, lh: 4 });
      band(g, PH - 13, 13, `6 FIGURES · ¥${SERIES_BY_ID.nakanohito.price} A TURN`, C.ink, C.white);
    },
  },

  // cats in space over the Milky Way
  space: {
    photos: ['milky_way'],
    async draw(g) {
      photoBg(g, 'milky_way', 0, 0, W, PH, { fx: 0.45, fy: 0.4, zoom: 1.1, tint: ['#4a6aff', 0.25], levels: 4 });
      const lights = { key: [-1.2, 1.6, 2], keyCol: 0xfff4e8, keyI: 2.6, rimCol: 0x8ab4ff, rimI: 2.4, hemi: 0.8 };
      const items = [['kaden/fukuro', 74, 4, 44, 0.2], ['kaden/gama', 60, W - 66, 46, 0.6], ['kaden/zou', 50, W - 58, 108, 0.5], ['kaden/usagi', 66, 46, 108, -0.3]];
      for (const [key, s, x, y, yaw] of items) put(g, await figure(key, 'normal', { w: s, h: s, yaw, pitch: 0.25, margin: 1.02, ...lights }), x, y);
      px(g, 'APPLIANCE\nANIMALS', 6, 6, { s: 2, col: C.white, lh: 4 });
      band(g, PH - 13, 13, 'ONE SMALL TURN FOR A CAT', C.blue, C.white);
    },
  },

  // spring sweets under the cherry blossoms
  sakura: {
    photos: ['sakura'],
    async draw(g) {
      photoBg(g, 'sakura', 0, 0, W, PH, { fx: 0.5, fy: 0.3, tint: ['#ffb0d0', 0.25] });
      band(g, 0, 40, '', C.paper);
      px(g, 'SHRINE', 6, 6, { s: 2, col: C.rose });
      px(g, 'ERRANDS', 6, 23, { s: 2, col: C.ink });
      px(g, 'NEW!', W - 6, 6, { col: C.red, align: 'right' });
      const keys = ['otsukai/kitsune', 'otsukai/shika', 'otsukai/hebi', 'otsukai/saru', 'otsukai/karasu'];
      const objs = keys.map((k, i) => { const m = makeItemMesh(k); const back = i % 2 === 0; m.position.set((i - 2) * 0.05, 0, back ? -0.03 : 0.02); m.rotation.y = (2 - i) * 0.18; return m; });
      const img = await shot(objs, fit(objs, { w: W, h: 120, yaw: 0.1, pitch: 0.3, margin: 0.75, key: [-1, 2.4, 2], keyCol: 0xfff0f4, rimCol: 0xffc0e0, rimI: 1.6, hemi: 1.2 }));
      for (const o of objs) contact(g, img, 0, 60, o.position.x, o.position.z, 0.028);
      put(g, img, 0, 60);
      band(g, PH - 13, 13, `THE GODS' MESSENGERS · ¥${SERIES_BY_ID.otsukai.price}`, C.rose, C.white);
    },
  },

  // the super secret: a gold figure under a warm streetlight
  secret: {
    photos: ['blossom_lamp'],
    async draw(g) {
      photoBg(g, 'blossom_lamp', 0, 0, W, PH, { fx: 0.3, fy: 0.4, tint: ['#ffb040', 0.3], dark: 0.4, levels: 4 });
      px(g, 'SUPER', 6, 6, { s: 2, col: C.gold });
      px(g, 'SECRET', 6, 23, { s: 2, col: C.gold });
      const img = await figure('henshin/ryu', 'gold', { w: 110, h: 110, yaw: 0.35, pitch: 0.2, margin: 1.0, key: [-1.4, 1.8, 1.8], keyCol: 0xfff0d8, keyI: 2.4, rimCol: 0xffd090, rimI: 2.6, env: 0.9, hemi: 0.35, grade: goldGrade });
      oval(g, W / 2 + 6, PH - 22, 34, 5, 'rgba(10,6,4,0.5)');
      put(g, img, W / 2 - 50, PH - 22 - 104);
      px(g, `1 IN ${SECRET_ODDS}`, W - 6, 50, { col: C.white, align: 'right' });
      band(g, PH - 13, 13, 'EVERY SERIES HIDES ONE', C.gold, C.ink);
    },
    foot: { bg: C.ink },
  },

  // special finish: glow-in-the-dark figures under the neon
  glow: {
    photos: ['neon_night'],
    async draw(g) {
      photoBg(g, 'neon_night', 0, 0, W, PH, { fx: 0.5, fy: 0.45, dark: 0.5, sat: 0.7, tint: ['#3020a0', 0.3], levels: 4 });
      px(g, 'GLOW IN', 6, 6, { s: 2, col: C.mint });
      px(g, 'THE DARK', 6, 23, { s: 2, col: C.mint });
      const keys = [['teruteru/para', -0.5], ['kaden/usagi', 0], ['henshin/buta', 0.5]];
      const objs = keys.map(([k, ry], i) => { const m = makeItemMesh(k, 'glow'); m.position.set((i - 1) * 0.07, 0, i === 1 ? 0.02 : -0.02); m.rotation.y = ry; return m; });
      put(g, await shot(objs, fit(objs, { w: W, h: 110, yaw: 0.05, pitch: 0.22, margin: 0.9, key: [-1, 1.4, 1.5], keyCol: 0x9080ff, keyI: 0.9, rimCol: 0xff60d0, rimI: 2.2, hemi: 0.25, env: 0.25 })), 0, PH - 13 - 112);
      band(g, PH - 13, 13, `1 IN ${GLOW_ODDS} TURNS · ${FINISHES.glow.mult}× VALUE`, C.mint, C.ink);
    },
    foot: { bg: C.ink },
  },

};
