// Shop flyers with meme art: ORIGINAL parodies of well-known meme formats starring the game's own cast, rendered from
// the real 3D models (low-poly humans + cosmetics, Mikan the cat, gacha machines, capsules, figures) and laid out as
// print-like A-series sheets: paper fibres, a little halftone, slight colour misregistration, ink wear and the shop
// strip at the bottom. Captions use Anton (OFL, @fontsource/anton) and Grandstander.
// Each design is drawn once into its own canvas (lazily, one at a time) and cached; textures update in place.
//   initFlyers(renderer, { thumbs })      the WebGLRenderer used for the 3D shots (+ Thumbs for machine banners)
//   flyerCanvas(id) / flyerTexture(id)    the sheet (blank paper until drawn); whenFlyer(id) -> Promise<canvas>
//   FLYERS: [{ id, name, lines }]         lines: what people say after reading it
import '@fontsource/anton/400.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Human } from '../people/Human.js';
import { makeSpec } from '../people/presets.js';
import { applyCosmeticSpec, dressHuman } from '../people/cosmetics.js';
import { createAvatarHuman } from '../people/avatar.js';
import { CatRig } from '../world/CatRig.js';
import { buildMachineModel } from '../world/machineModels.js';
import { bannerTexture } from './banner.js';
import { makeCapsule } from '../game/Capsule.js';
import { makeItemMesh } from '../game/collectibles.js';

export const FLYER_W = 600, FLYER_H = 848; // A-series proportions
const W = FLYER_W, H = FLYER_H;
const STRIP = 74; // the shop strip along the bottom
const INK = '#1c1418';

/** The designs (order = the order the stack cycles through). */
export const FLYERS = [
  { id: 'much', name: 'Such Capsule', lines: ['Wow. Such flyer. Much want.', 'Very gacha... okay, I am in.', 'Haha, that cat is so smug!'] },
  { id: 'nope', name: 'Nope / Yep', lines: ['Ha! That is me with online shopping.', '¥100 a turn? Okay, okay, I will come.', 'The dino suit, haha!'] },
  { id: 'distracted', name: 'Distracted Customer', lines: ['That is literally me at lunch.', 'My salary is crying already.', 'Ha! Sorry, wallet.'] },
  { id: 'brain', name: 'Galaxy Collector', lines: ['Inherit the garage... galaxy brain.', 'I am at step two. Help.', 'Haha, step four is the dream.'] },
  { id: 'simply', name: 'One Does Not Simply', lines: ['So true. Nobody stops at one turn.', 'Just one more. Just one.', 'Haha, he looks so serious!'] },
  { id: 'nobody', name: 'Me at 3am', lines: ['Haha, that is my kid.', 'Me at 3am, every night.', 'A chicken hat? I love it.'] },
  { id: 'expect', name: 'Expectation / Reality', lines: ['Six duplicates. I felt that.', 'Ha! The secret one never comes.', 'The same hamster, again...'] },
  { id: 'manager', name: 'New Manager', lines: ['A cat manager? I must meet her.', 'Paid in snacks, so cute!', 'I would work for snacks too.'] },
];
export const FLYER_BY_ID = Object.fromEntries(FLYERS.map((f, i) => [f.id, { ...f, index: i }]));

// ------------------------------------------------------------------ canvases, textures, the render queue
const sheets = new Map(); // id -> { canvas, tex, done, waiters }
let env = null; // { renderer, thumbs }
let busy = false;
const queue = [];

function sheet(id) {
  let s = sheets.get(id);
  if (!s) {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    paper(g, hashStr(id));
    s = { canvas, tex: null, done: false, waiters: [] };
    sheets.set(id, s);
  }
  return s;
}

export function initFlyers(renderer, opts = {}) { env = { renderer, thumbs: opts.thumbs || null }; pump(); }

/** The sheet for a design (blank printed paper until its art is drawn; asks for it to be drawn). */
export function flyerCanvas(id) { const s = sheet(id); want(id); return s.canvas; }
export function flyerReady(id) { return !!sheets.get(id)?.done; }
/** A texture of the sheet that updates itself once the art is in. */
export function flyerTexture(id) {
  const s = sheet(id);
  if (!s.tex) {
    s.tex = new THREE.CanvasTexture(s.canvas);
    s.tex.colorSpace = THREE.SRGBColorSpace;
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
  await Promise.all([document.fonts.load('64px Anton'), document.fonts.load('900 40px "GG Display"'), document.fonts.load('600 30px Grandstander'), document.fonts.load('30px "GG Bold"')]).catch(() => {});
  const s = sheet(id);
  const g = s.canvas.getContext('2d', { willReadFrequently: true });
  const seed = hashStr(id);
  paper(g, seed);
  DESIGNS[id](g);
  shopStrip(g, seed);
  printFinish(g, seed);
}

// ------------------------------------------------------------------ the 3D studio
let studio = null;
class Studio {
  constructor(renderer) {
    this.r = renderer;
    const scene = this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    scene.environmentIntensity = 0.55;
    scene.add(new THREE.HemisphereLight(0xfff2e4, 0x4a3a34, 1.05));
    this.key = new THREE.DirectionalLight(0xfff0dc, 2.3); this.key.position.set(-1.6, 2.6, 2.6);
    const rim = new THREE.DirectionalLight(0xc4dcff, 1.4); rim.position.set(2.2, 1.8, -2.4);
    const fill = new THREE.DirectionalLight(0xffd6c0, 0.45); fill.position.set(2.4, 0.6, 2);
    scene.add(this.key, rim, fill);
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.01, 60);
    this.rt = null;
  }

  /** Render objects into a transparent canvas. o: { w, h, pos, look, fov, key: [x,y,z] } */
  shot(objs, o) {
    const r = this.r, w = Math.round(o.w), h = Math.round(o.h);
    if (!this.rt || this.rt.width !== w || this.rt.height !== h) {
      this.rt?.dispose();
      this.rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
      this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    }
    for (const ob of objs) { this.scene.add(ob); ob.updateMatrixWorld(true); }
    if (o.key) this.key.position.set(...o.key); else this.key.position.set(-1.6, 2.6, 2.6);
    const cam = this.cam;
    cam.fov = o.fov || 30; cam.aspect = w / h;
    cam.position.set(...o.pos); cam.lookAt(...o.look);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const prevRT = r.getRenderTarget(), prevC = r.getClearColor(new THREE.Color()), prevA = r.getClearAlpha();
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, cam);
    const px = new Uint8Array(w * h * 4);
    r.readRenderTargetPixels(this.rt, 0, 0, w, h, px);
    r.setRenderTarget(prevRT);
    r.setClearColor(prevC, prevA);
    for (const ob of objs) this.scene.remove(ob);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const src = (h - 1 - y) * w * 4, dst = y * w * 4;
      for (let x = 0; x < w * 4; x += 4) {
        const a = px[src + x + 3], k = a > 0 && a < 255 ? 255 / a : 1;
        img.data[dst + x] = Math.min(255, px[src + x] * k); img.data[dst + x + 1] = Math.min(255, px[src + x + 1] * k); img.data[dst + x + 2] = Math.min(255, px[src + x + 2] * k);
        img.data[dst + x + 3] = a;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }
}
function shot(objs, o) { studio = studio || new Studio(env.renderer); return studio.shot(objs, o); }

/** A camera looking at `look` from yaw / pitch (radians, 0 = from the front +z) at distance d. */
function orbit(look, yaw, pitch, d) {
  return { pos: [look[0] + Math.sin(yaw) * Math.cos(pitch) * d, look[1] + Math.sin(pitch) * d, look[2] + Math.cos(yaw) * Math.cos(pitch) * d], look };
}

// ------------------------------------------------------------------ the cast
/** A preset human (+ cosmetics); posed with a gesture / expression and settled. */
function person(preset, seed, o = {}) {
  let h;
  if (o.avatar) h = createAvatarHuman(o.avatar);
  else {
    const spec = makeSpec(preset, seed);
    if (o.noHat) spec.hat = null;
    if (o.noBag) spec.acc = spec.acc.filter((a) => a.kind === 'camera' || a.kind === 'towel' || a.kind === 'apron');
    if (o.spec) o.spec(spec);
    if (o.look) applyCosmeticSpec(spec, o.look);
    h = new Human(spec, { lazy: false });
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

function machine(type = 'retro', series = 'mochi') {
  const banner = env.thumbs ? bannerTexture(series, env.thumbs, { faded: type === 'retro' }) : null;
  const { group } = buildMachineModel(type, banner ? { banner } : {});
  return group;
}

/** A few capsules piled in the machine's window. */
function fillMachine(group) {
  const b = bbox(group), cols = [0xff9eb5, 0x9ed8ff, 0xfff09e, 0xb8f0a8, 0xffc890];
  const glass = [];
  group.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.transparent) glass.push(o); });
  const gb = glass.length ? glass.reduce((acc, o) => acc.union(bbox(o)), new THREE.Box3()) : new THREE.Box3(new THREE.Vector3(b.min.x * 0.6, b.max.y * 0.6, b.min.z * 0.5), new THREE.Vector3(b.max.x * 0.6, b.max.y * 0.85, b.max.z * 0.5));
  const c = gb.getCenter(new THREE.Vector3()), sz = gb.getSize(new THREE.Vector3());
  const r = Math.min(sz.x, sz.z) * 0.14, n = 14;
  const rr = rng(7);
  for (let i = 0; i < n; i++) {
    const cp = capsule('mochi', cols[i % cols.length], r);
    const row = Math.floor(i / 5);
    cp.position.set(c.x + (rr() - 0.5) * (sz.x - r * 2.4) * 0.9, gb.min.y + r * (1 + row * 1.6) + rr() * r * 0.4, c.z + (rr() - 0.5) * (sz.z - r * 2.4) * 0.8);
    cp.rotation.set(rr() * 6, rr() * 6, rr() * 6);
    group.add(cp);
  }
}

function capsule(series, color, r) {
  const c = makeCapsule(series, color, r ? { radius: r } : {});
  const grp = c.group || c;
  return grp;
}

function bbox(obj) { obj.updateMatrixWorld(true); return new THREE.Box3().setFromObject(obj); }
/** Fit objects (or a box) into a w x h shot from yaw / pitch. o: { w, h, yaw, pitch, fov, margin, dy (look offset, fraction of height) } */
function fit(objs, o) {
  const b = o.box || objs.reduce((acc, ob) => acc.union(bbox(ob)), new THREE.Box3());
  const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
  const fov = o.fov || 30, t = Math.tan(THREE.MathUtils.degToRad(fov / 2)), aspect = o.w / o.h;
  const d = Math.max(sz.y / 2 / t, Math.max(sz.x, sz.z) / 2 / (t * aspect)) * (o.margin || 1.1) + Math.max(sz.x, sz.z) / 2;
  return { w: o.w, h: o.h, fov, ...orbit([c.x, c.y + sz.y * (o.dy || 0), c.z], o.yaw || 0, o.pitch ?? 0.12, d) };
}
function dispose(objs) { for (const o of objs) { if (o.dispose) o.dispose(); else o.removeFromParent?.(); } }

// ------------------------------------------------------------------ 2D helpers
function hashStr(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619); return x >>> 0; }
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9 >>> 0) / 4294967296); }

function paper(g, seed) {
  const r = rng(seed);
  g.save();
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#f4eddc';
  g.fillRect(0, 0, W, H);
  // fibres
  for (let i = 0; i < 700; i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = 3 + r() * 9;
    g.strokeStyle = r() < 0.5 ? 'rgba(120,100,70,0.07)' : 'rgba(255,255,255,0.35)';
    g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.restore();
}

/** Classic meme caption: Anton capitals, white with a heavy black outline; shrinks to fit maxW. Returns the bottom y. */
function caption(g, text, cx, y, o = {}) {
  let size = o.size || 62;
  const maxW = o.maxW || W - 60, lines = String(text).toUpperCase().split('\n');
  g.save();
  const font = (s) => `${s}px Anton, Impact, sans-serif`;
  g.font = font(size);
  while (size > 18 && Math.max(...lines.map((l) => g.measureText(l).width)) > maxW) { size -= 2; g.font = font(size); }
  g.textAlign = o.align || 'center'; g.textBaseline = 'top';
  g.lineJoin = 'round'; g.miterLimit = 2;
  const lh = size * (o.lh || 1.06);
  lines.forEach((l, i) => {
    const yy = y + i * lh;
    if (o.rot) { g.save(); g.translate(cx, yy); g.rotate(o.rot); }
    const X = o.rot ? 0 : cx, Y = o.rot ? 0 : yy;
    if (o.stroke !== false) { g.strokeStyle = o.stroke || '#0e0a0c'; g.lineWidth = size * (o.sw || 0.17); g.strokeText(l, X, Y); }
    g.fillStyle = o.fill || '#ffffff';
    g.fillText(l, X, Y);
    if (o.rot) g.restore();
  });
  g.restore();
  return y + lines.length * lh;
}

/** Plain text (Grandstander), optional wrap width. */
function text(g, str, x, y, o = {}) {
  g.save();
  g.font = o.font || '600 30px Grandstander, sans-serif';
  g.fillStyle = o.fill || INK;
  g.textAlign = o.align || 'left'; g.textBaseline = o.baseline || 'top';
  if (o.rot) { g.translate(x, y); g.rotate(o.rot); x = 0; y = 0; }
  if (o.shadow) { g.fillStyle = o.shadow; g.fillText(str, x + 2, y + 3); g.fillStyle = o.fill || INK; }
  if (o.stroke) { g.lineJoin = 'round'; g.strokeStyle = o.stroke; g.lineWidth = o.sw || 6; g.strokeText(str, x, y); }
  g.fillText(str, x, y);
  g.restore();
}

/** Draw a cut-out render with a sticker border (o.border px, colour) and an ink line. */
function sticker(g, img, x, y, o = {}) {
  const pad = (o.border || 0) + (o.ink ?? 2) + 2;
  const c = document.createElement('canvas');
  c.width = img.width + pad * 2; c.height = img.height + pad * 2;
  const k = c.getContext('2d');
  const ring = (rad, col) => {
    if (rad <= 0) return;
    const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
    const tg = t.getContext('2d');
    for (let a = 0; a < 16; a++) tg.drawImage(img, pad + Math.cos(a / 16 * Math.PI * 2) * rad, pad + Math.sin(a / 16 * Math.PI * 2) * rad);
    tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, t.width, t.height);
    k.drawImage(t, 0, 0);
  };
  ring((o.border || 0) + (o.ink ?? 2), o.inkCol || INK);
  ring(o.border || 0, o.borderCol || '#ffffff');
  k.drawImage(img, pad, pad);
  g.save();
  if (o.shadow) { g.shadowColor = 'rgba(30,16,20,0.35)'; g.shadowBlur = 0; g.shadowOffsetX = o.shadow; g.shadowOffsetY = o.shadow; }
  g.drawImage(c, x - pad, y - pad);
  g.restore();
}

function panel(g, x, y, w, h, fill) {
  g.save();
  if (typeof fill === 'function') fill(g, x, y, w, h); else { g.fillStyle = fill; g.fillRect(x, y, w, h); }
  g.restore();
}
function frameRect(g, x, y, w, h, lw = 4) { g.save(); g.strokeStyle = INK; g.lineWidth = lw; g.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw); g.restore(); }
function clip(g, x, y, w, h, fn) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); fn(); g.restore(); }

function radial(g, x, y, w, h, inner, outer, cx = 0.5, cy = 0.45) {
  const gr = g.createRadialGradient(x + w * cx, y + h * cy, 0, x + w * cx, y + h * cy, Math.max(w, h) * 0.75);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function rays(g, cx, cy, n, r, col, a0 = 0) {
  g.save(); g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2, b = a + Math.PI / n;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(cx + Math.cos(b) * r, cy + Math.sin(b) * r); g.closePath(); g.fill();
  }
  g.restore();
}
function bokeh(g, x, y, w, h, seed, cols) {
  const r = rng(seed);
  g.save();
  for (let i = 0; i < 26; i++) {
    const rad = 12 + r() * 46;
    g.globalAlpha = 0.12 + r() * 0.22;
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.beginPath(); g.arc(x + r() * w, y + r() * h * 0.75, rad, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
function sparkle(g, x, y, s, col = '#fff6b0') {
  g.save(); g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? s * 0.28 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill(); g.stroke(); g.restore();
}
function shadowBlob(g, cx, cy, rw, rh, a = 0.28) {
  g.save(); const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rw);
  gr.addColorStop(0, `rgba(40,22,26,${a})`); gr.addColorStop(1, 'rgba(40,22,26,0)');
  g.fillStyle = gr; g.translate(cx, cy); g.scale(1, rh / rw); g.translate(-cx, -cy);
  g.beginPath(); g.arc(cx, cy, rw, 0, Math.PI * 2); g.fill(); g.restore();
}

function shopStrip(g, seed) {
  const y = H - STRIP;
  g.save();
  g.fillStyle = '#c8302a';
  g.fillRect(0, y, W, STRIP);
  g.fillStyle = '#e24c3c';
  for (let x = -40; x < W; x += 28) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y); g.lineTo(x + 14 + STRIP * 0.5, y + STRIP); g.lineTo(x + STRIP * 0.5, y + STRIP); g.fill(); }
  g.fillStyle = INK; g.fillRect(0, y, W, 4);
  // a little capsule logo
  const cx = 44, cy = y + STRIP / 2 + 1;
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI); g.fill();
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(cx - 24, cy); g.lineTo(cx + 24, cy); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(cx - 8, cy - 10, 5, 0, Math.PI * 2); g.fill();
  caption(g, 'GACHA GARAGE', 80, y + 8, { size: 36, align: 'left', maxW: 330, sw: 0.2 });
  text(g, 'capsule toys  ·  Showa Lane, by the tunnel', 82, y + 50, { font: '600 15px Grandstander, sans-serif', fill: '#fff4e0' });
  // price stamp
  g.translate(W - 70, y + STRIP / 2 + 1); g.rotate(-0.12);
  g.fillStyle = '#ffd23f'; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rr = i % 2 ? 40 : 46; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.78); } g.closePath(); g.fill(); g.stroke();
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 25px "GG Display", Grandstander, sans-serif'; g.fillText('¥100', 0, -4);
  g.font = '600 12px Grandstander, sans-serif'; g.fillText('A TURN', 0, 15);
  g.restore();
  void seed;
}

/** Print it: halftone dots in the inked areas, slight colour misregistration, worn ink specks, paper grain. */
function printFinish(g, seed) {
  const img = g.getImageData(0, 0, W, H), d = img.data, src = new Uint8ClampedArray(d);
  const r = rng(seed ^ 0x5bd1e995);
  const ox = r() < 0.5 ? 1 : -1, oy = 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const xr = Math.min(W - 1, Math.max(0, x + ox)), yb = Math.min(H - 1, y + oy);
    const R = src[(y * W + xr) * 4], B = src[(yb * W + x) * 4 + 2], G = src[i + 1];
    let rr = src[i] * 0.45 + R * 0.55, bb = src[i + 2] * 0.45 + B * 0.55, gg = G;
    const lum = (rr * 0.3 + gg * 0.59 + bb * 0.11) / 255;
    // halftone rosette on a 45 degree grid, stronger in the mid tones
    const u = (x + y) / 4.6, v = (x - y) / 4.6, du = u - Math.round(u), dv = v - Math.round(v), dot = du * du + dv * dv;
    const ht = lum < 0.92 ? (dot > 0.16 ? 0.94 : 1.0) + (1 - lum) * 0.02 : 1;
    // grain + worn ink
    const n = ((Math.imul(x * 374761393 + y * 668265263, 1274126177) >>> 0) / 4294967296);
    let k = ht * (0.975 + n * 0.05);
    if (n > 0.9965 && lum < 0.8) { rr = rr * 0.4 + 240 * 0.6; gg = gg * 0.4 + 232 * 0.6; bb = bb * 0.4 + 214 * 0.6; k = 1; }
    d[i] = rr * k; d[i + 1] = gg * k; d[i + 2] = bb * k;
  }
  g.putImageData(img, 0, 0);
  // a soft fold crease and a little edge wear
  g.save();
  const fy = H * (0.36 + r() * 0.3);
  const gr = g.createLinearGradient(0, fy - 6, 0, fy + 6);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.16)'); gr.addColorStop(0.55, 'rgba(60,40,30,0.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, fy - 6, W, 12);
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, 'rgba(120,90,60,0)'); vg.addColorStop(1, 'rgba(120,90,60,0.14)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore();
}

// ------------------------------------------------------------------ the designs
const M = 24; // outer margin
const DESIGNS = {
  // "such capsule": scattered colourful words around a smug cat
  much(g) {
    const x = M, y = M, w = W - M * 2, h = H - STRIP - M * 2;
    panel(g, x, y, w, h, (k) => radial(k, x, y, w, h, '#fff7e6', '#f7c9d8', 0.5, 0.55));
    rays(g, W / 2, y + h * 0.58, 18, 640, 'rgba(255,255,255,0.32)', 0.1);
    frameRect(g, x, y, w, h);
    const c = cat({ yaw: 0.3, lookAt: [0.25, 0.3, 1.4] });
    const img = shot([c.root], fit([c.root], { w: 520, h: 560, yaw: 0.15, pitch: 0.1, margin: 0.92 }));
    c.root.removeFromParent();
    shadowBlob(g, W / 2, y + h * 0.92, 190, 24, 0.3);
    sticker(g, img, W / 2 - 260, y + h - 560 - 8, { border: 0, ink: 3 });
    const words = [
      ['wow', 80, 92, 64, '#ff3f9e', -0.12], ['such capsule', 300, 150, 44, '#2fb7ee', 0.06], ['very gacha', 130, 300, 46, '#40b830', -0.05],
      ['much toy', 452, 262, 44, '#ff8a00', 0.1], ['so ¥100', 104, 560, 44, '#a04fe0', 0.08], ['amaze', 482, 470, 46, '#e83a3a', -0.08],
      ['many series', 392, 668, 38, '#1fa898', -0.04], ['wow', 470, 92, 34, '#ffb300', 0.14],
    ];
    for (const [s, wx, wy, sz, col, rot] of words) text(g, s, wx, wy, { font: `700 ${sz}px "GG Bold", Grandstander, sans-serif`, fill: col, align: 'center', rot, stroke: 'rgba(255,255,255,0.85)', sw: 7 });
  },

  // two-panel "nope / yep" with the dino onesie
  nope(g) {
    const x = M, y = M, w = W - M * 2, h = H - STRIP - M * 2, cw = 270, rh = h / 2;
    const dino = { v: 1, seed: 11, body: 'm', skin: 'warm', hair: 'messy', hairCol: 'black', top: 'tee', topCol: 'mustard', bottom: 'jeans', outfit: 'dino', owned: [] };
    const bg = (k, X, Y, ww, hh) => radial(k, X, Y, ww, hh, '#ffe7b8', '#f2a65a', 0.45, 0.4);
    for (let i = 0; i < 2; i++) {
      panel(g, x, y + i * rh, cw, rh, (k) => bg(k, x, y + i * rh, cw, rh));
      panel(g, x + cw, y + i * rh, w - cw, rh, '#fffdf6');
    }
    const shotOf = (gesture, expr, yaw) => {
      const p = person(null, 0, { avatar: dino, gesture, expr, yaw, t: 1.6 });
      const img = shot([p.root], { w: cw, h: rh, ...orbit([0.02, 1.4, 0], 0.15, 0.04, 1.75), fov: 30 });
      p.dispose();
      return img;
    };
    clip(g, x, y, cw, rh, () => g.drawImage(shotOf('nope', 'angry', -0.25), x, y));
    clip(g, x, y + rh, cw, rh, () => g.drawImage(shotOf('yep', 'grin', 0.2), x, y + rh));
    const tx = x + cw + (w - cw) / 2;
    caption(g, 'BUYING TOYS\nONLINE', tx, y + 104, { size: 50, fill: INK, stroke: false, maxW: w - cw - 30 });
    text(g, '(arrives in 6-8 weeks, maybe)', tx, y + 232, { font: '600 17px Grandstander, sans-serif', fill: '#8a7a6a', align: 'center' });
    caption(g, 'GACHA GARAGE\n¥100 A TURN', tx, y + rh + 96, { size: 50, fill: '#c8302a', stroke: false, maxW: w - cw - 30 });
    text(g, 'the GACHAN sound is free', tx, y + rh + 226, { font: '600 17px Grandstander, sans-serif', fill: '#8a7a6a', align: 'center' });
    g.save(); g.strokeStyle = INK; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x, y + rh); g.lineTo(x + w, y + rh); g.moveTo(x + cw, y); g.lineTo(x + cw, y + h); g.stroke(); g.restore();
    frameRect(g, x, y, w, h);
  },

  // "distracted customer": walking with your salary, eyes on the gacha machine
  distracted(g) {
    const x = M, y = M, w = W - M * 2, h = H - STRIP - M * 2;
    panel(g, x, y, w, h, (k) => { const gr = k.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#f6c88a'); gr.addColorStop(0.55, '#e88a62'); gr.addColorStop(0.56, '#8c6a5c'); gr.addColorStop(1, '#5e4a44'); k.fillStyle = gr; k.fillRect(x, y, w, h); });
    bokeh(g, x, y, w, h, 7, ['#fff2c0', '#ffd27a', '#ffb090', '#ffe9d0']);
    const mach = machine('deluxe', 'kaiju');
    fillMachine(mach);
    mach.position.set(0.95, 0, -0.9); mach.rotation.y = -0.55;
    const head = new THREE.Vector3(0.95, 1.35, -0.6);
    const her = person('office_lady', 5, { at: [-0.62, 0, -0.35], yaw: 0.55, expr: 'angry', lookAt: [0.1, 1.5, 0.35], noBag: true, t: 1.2 });
    const me = person('salaryman', 3, { at: [0.05, 0, 0.35], yaw: -0.75, expr: 'surprised', lookAt: head.toArray(), speed: 1.1, noBag: true, t: 1.35 });
    const img = shot([mach, her.root, me.root], { w, h, ...orbit([0.12, 0.95, -0.1], 0.02, 0.06, 4.7), fov: 34 });
    her.dispose(); me.dispose();
    shadowBlob(g, x + w * 0.5, y + h * 0.93, 240, 24, 0.25);
    g.drawImage(img, x, y);
    const lab = (s, lx, ly, size = 46) => caption(g, s, lx, ly, { size, maxW: 230 });
    lab('MY SALARY', x + 120, y + 196);
    lab('ME', x + w * 0.5 + 4, y + 104, 54);
    lab('GACHA\nGARAGE', x + w - 96, y + 150);
    frameRect(g, x, y, w, h);
  },

  // galaxy-brain escalation: four rows, ever more radiant
  brain(g) {
    const x = M, y = M, w = W - M * 2, h = H - STRIP - M * 2, rh = h / 4, tw = 300, iw = w - tw;
    const rows = [
      ['BUYING ONE\nFIGURE', ['#d8d4cc', '#a8a49c']],
      ['COLLECTING THE\nWHOLE SERIES', ['#cfe8ff', '#5a8ad8']],
      ['BUYING THE\nMACHINE', ['#fff6c0', '#ff9a2a']],
      ['INHERITING\nGRANDPA\'S GARAGE', ['#ffffff', '#b03adf']],
    ];
    const shots = [];
    { const f = makeItemMesh('mochi/shiba'); shots.push(shot([f], fit([f], { w: iw, h: rh, yaw: 0.4, pitch: 0.2, margin: 1.25 }))); }
    {
      const ids = ['mochi/shiba', 'mochi/mike', 'mochi/hamu', 'mochi/pen', 'mochi/lesser'];
      const objs = ids.map((k, i) => { const m = makeItemMesh(k); const back = i < 3; m.position.set(back ? (i - 1) * 0.036 : (i - 3.5) * 0.036, 0, back ? -0.03 : 0); m.rotation.y = (i - 2) * -0.2; return m; });
      shots.push(shot(objs, fit(objs, { w: iw, h: rh, yaw: 0.15, pitch: 0.2, margin: 1.1 })));
    }
    { const m = machine('standard', 'mochi'); fillMachine(m); shots.push(shot([m], fit([m], { w: iw, h: rh, yaw: 0.45, pitch: 0.12, margin: 1.15 }))); }
    { const gp = person('grandpa', 4, { gesture: 'cheer', expr: 'happy', t: 1.1, noBag: true }); shots.push(shot([gp.root], { w: iw, h: rh, ...orbit([0, 1.3, 0], 0.15, 0.05, 2.3), fov: 30 })); gp.dispose(); }
    rows.forEach(([label, [c0, c1]], i) => {
      const ry = y + i * rh;
      panel(g, x, ry, tw, rh, '#fffdf6');
      caption(g, label, x + tw / 2, ry + rh / 2 - (label.includes('\n') ? 46 : 24), { size: 40, fill: INK, stroke: false, maxW: tw - 26 });
      clip(g, x + tw, ry, iw, rh, () => {
        radial(g, x + tw, ry, iw, rh, c0, c1, 0.5, 0.5);
        if (i >= 1) rays(g, x + tw + iw / 2, ry + rh / 2, 10 + i * 6, 260, `rgba(255,255,255,${0.12 + i * 0.08})`, i);
        if (i === 3) {
          const r = rng(99);
          for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; g.fillRect(x + tw + r() * iw, ry + r() * rh, 2, 2); }
          rays(g, x + tw + iw / 2, ry + rh / 2, 36, 300, 'rgba(255,240,140,0.22)', 0.3);
        }
        g.save();
        if (i >= 2) { g.shadowColor = i === 3 ? '#fff6a0' : '#ffd060'; g.shadowBlur = 18 + i * 8; }
        g.drawImage(shots[i], x + tw, ry);
        g.restore();
        if (i === 3) { sparkle(g, x + tw + 34, ry + 30, 14); sparkle(g, x + tw + iw - 30, ry + 44, 11); sparkle(g, x + tw + iw - 50, ry + rh - 30, 16); }
      });
    });
    g.save(); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath();
    for (let i = 1; i < 4; i++) { g.moveTo(x, y + i * rh); g.lineTo(x + w, y + i * rh); }
    g.moveTo(x + tw, y); g.lineTo(x + tw, y + h); g.stroke(); g.restore();
    frameRect(g, x, y, w, h);
  },

  // "one does not simply" with Grandpa
  simply(g) {
    const x = M, y = M, w = W - M * 2, h = H - STRIP - M * 2;
    panel(g, x, y, w, h, (k) => radial(k, x, y, w, h, '#7a5236', '#22140e', 0.62, 0.38));
    // blurry machines and a warm lamp in the back of the garage
    g.save(); g.globalAlpha = 0.5;
    for (const [mx, col] of [[x + 40, '#d8302a'], [x + 140, '#3f86e8'], [x + 430, '#ffd23f']]) { g.fillStyle = col; g.fillRect(mx, y + 210, 80, 190); g.fillStyle = 'rgba(220,240,255,0.6)'; g.fillRect(mx + 12, y + 226, 56, 70); }
    g.restore();
    g.save(); const lg = g.createRadialGradient(x + 420, y + 120, 0, x + 420, y + 120, 220); lg.addColorStop(0, 'rgba(255,214,140,0.65)'); lg.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = lg; g.fillRect(x, y, w, h); g.restore();
    const gp = person('grandpa', 4, { gesture: 'explain', expr: 'sad', yaw: 0.2, t: 1.4, noBag: true, lookAt: [0.7, 1.55, 3] });
    const img = shot([gp.root], { w, h, ...orbit([-0.08, 1.24, 0], 0.18, 0.04, 2.05), fov: 34, key: [-1.4, 2.2, 1.8] });
    gp.dispose();
    g.drawImage(img, x, y + 24);
    caption(g, 'ONE DOES NOT SIMPLY', W / 2, y + 16, { size: 60, maxW: w - 30 });
    caption(g, 'TURN THE HANDLE\nONLY ONCE', W / 2, y + h - 150, { size: 64, maxW: w - 30 });
    frameRect(g, x, y, w, h);
  },

  // "nobody: / me at 3am:" with the chicken-hat kid hugging a capsule
  nobody(g) {
    const x = M, y = M, w = W - M * 2, h = H - STRIP - M * 2, th = 196;
    panel(g, x, y, w, th, '#fffdf6');
    const lines = ['Nobody:', 'Absolutely nobody:', 'Me at 3am:'];
    lines.forEach((l, i) => text(g, l, x + 24, y + 22 + i * 56, { font: '700 36px "GG Bold", Grandstander, sans-serif', fill: INK }));
    const iy = y + th;
    panel(g, x, iy, w, h - th, (k) => { const gr = k.createLinearGradient(0, iy, 0, iy + h - th); gr.addColorStop(0, '#16224a'); gr.addColorStop(1, '#3a2a5a'); k.fillStyle = gr; k.fillRect(x, iy, w, h - th); });
    const r = rng(5);
    for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(255,255,230,${0.3 + r() * 0.7})`; const s = r() < 0.15 ? 3 : 2; g.fillRect(x + r() * w, iy + r() * (h - th) * 0.6, s, s); }
    g.save(); g.fillStyle = '#fff4c8'; g.shadowColor = '#fff4c8'; g.shadowBlur = 30; g.beginPath(); g.arc(x + w - 90, iy + 80, 38, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0; g.fillStyle = '#16224a'; g.beginPath(); g.arc(x + w - 74, iy + 70, 34, 0, Math.PI * 2); g.fill(); g.restore();
    // the street lamp's cone of light
    g.save(); const cg = g.createLinearGradient(0, iy, 0, iy + h - th); cg.addColorStop(0, 'rgba(255,220,150,0.45)'); cg.addColorStop(1, 'rgba(255,220,150,0.05)'); g.fillStyle = cg;
    g.beginPath(); g.moveTo(x + w * 0.42, iy); g.lineTo(x + w * 0.58, iy); g.lineTo(x + w * 0.9, iy + h - th); g.lineTo(x + w * 0.1, iy + h - th); g.closePath(); g.fill(); g.restore();
    const kid = person('kid', 2, { look: { hat: 'chicken' }, gesture: 'hug', expr: 'happy', yaw: 0.25, t: 1.4, noHat: true, noBag: true, lookAt: [0.4, 0.9, 2] });
    // a giant capsule in their arms
    const P = kid.P, cap = capsule('mochi', 0xff6f91, 0.19);
    cap.traverse((o) => { if (o.isMesh && o.material?.transparent) { o.material = new THREE.MeshStandardMaterial({ color: 0xfff6f0, roughness: 0.25 }); o.renderOrder = 0; } });
    kid.b.chest.updateWorldMatrix(true, false);
    const at = new THREE.Vector3(0, 0.03 * P.H, 0.32 * P.H / 1.72 + 0.04).applyMatrix4(kid.b.chest.matrixWorld);
    cap.position.copy(at); cap.rotation.set(-0.35, 0.6, 0.2);
    const img = shot([kid.root, cap], { w, h: h - th, ...orbit([0.02, 0.86, 0], 0.32, 0.12, 1.85), fov: 32, key: [-0.6, 2.4, 1.6] });
    kid.dispose();
    shadowBlob(g, x + w / 2, iy + (h - th) * 0.94, 150, 18, 0.45);
    g.drawImage(img, x, iy);
    g.save(); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(x, iy); g.lineTo(x + w, iy); g.stroke(); g.restore();
    frameRect(g, x, y, w, h);
  },

  // expectation (the secret gold one) vs reality (the 6th duplicate)
  expect(g) {
    const x = M, y = M, w = W - M * 2, h = H - STRIP - M * 2, hw = w / 2, hh = 64;
    for (const [i, lbl] of [[0, 'EXPECTATION'], [1, 'REALITY']]) {
      panel(g, x + i * hw, y, hw, hh, '#fffdf6');
      caption(g, lbl, x + i * hw + hw / 2, y + 10, { size: 44, fill: INK, stroke: false, maxW: hw - 20 });
    }
    const iy = y + hh, ih = h - hh;
    clip(g, x, iy, hw, ih, () => { radial(g, x, iy, hw, ih, '#fff8d0', '#d89a20', 0.5, 0.5); rays(g, x + hw / 2, iy + ih * 0.52, 24, 520, 'rgba(255,255,255,0.3)'); });
    panel(g, x + hw, iy, hw, ih, (k) => { k.fillStyle = '#b8b4ac'; k.fillRect(x + hw, iy, hw, ih); });
    const gold = makeItemMesh('mochi/shiba', 'gold');
    const imgA = shot([gold], fit([gold], { w: hw, h: ih * 0.8, yaw: 0.2, pitch: 0.15, margin: 1.0 }));
    sticker(g, imgA, x, iy + ih * 0.06, { border: 0, ink: 2 });
    for (const [sx, sy, s] of [[60, 120, 18], [220, 170, 14], [80, 430, 12], [210, 470, 20], [140, 90, 10]]) sparkle(g, x + sx, iy + sy, s);
    caption(g, 'SECRET!', x + hw / 2, iy + ih - 92, { size: 44, fill: '#ffd23f', maxW: hw - 30, rot: -0.06 });
    const dups = [];
    for (let i = 0; i < 6; i++) { const m = makeItemMesh('mochi/hamu'); const row = i < 3 ? 0 : 1; m.position.set((i % 3 - 1) * 0.05 + row * 0.022, row * 0.024, row * -0.04 + (i % 2) * 0.01); m.rotation.y = (i * 1.7) % 1 - 0.5; dups.push(m); }
    const imgB = shot(dups, fit(dups, { w: hw, h: ih * 0.7, yaw: 0.3, pitch: 0.35, margin: 0.85 }));
    g.drawImage(imgB, x + hw, iy + ih * 0.17);
    // "x6" in a red marker circle
    g.save(); g.strokeStyle = '#d42a2a'; g.lineWidth = 5; g.beginPath(); g.ellipse(x + hw + hw * 0.76, iy + 120, 52, 40, -0.2, 0, Math.PI * 2); g.stroke();
    g.font = '900 46px "GG Display", Grandstander, sans-serif'; g.fillStyle = '#d42a2a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('x6', x + hw + hw * 0.76, iy + 122); g.restore();
    text(g, 'the same hamster.', x + hw + hw / 2, iy + ih - 84, { font: '600 22px Grandstander, sans-serif', fill: '#3a3236', align: 'center' });
    text(g, 'again.', x + hw + hw / 2, iy + ih - 54, { font: '600 22px Grandstander, sans-serif', fill: '#3a3236', align: 'center' });
    g.save(); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(x + hw, y); g.lineTo(x + hw, y + h); g.moveTo(x, iy); g.lineTo(x + w, iy); g.stroke(); g.restore();
    frameRect(g, x, y, w, h);
  },

  // Mikan, the new manager, on top of a machine
  manager(g) {
    const x = M, y = M, w = W - M * 2, h = H - STRIP - M * 2;
    panel(g, x, y, w, h, (k) => radial(k, x, y, w, h, '#bfe4ff', '#4a8fd8', 0.5, 0.42));
    rays(g, W / 2, y + h * 0.42, 20, 700, 'rgba(255,255,255,0.18)', 0.2);
    const m = machine('retro', 'mochi');
    m.rotation.y = 0.32;
    const b = bbox(m);
    const c = cat({ at: [0, b.max.y - 0.005, -0.02], yaw: 0.3, lookAt: [0.6, b.max.y + 0.3, 2.4], mood: 'happy' });
    fillMachine(m);
    const box = bbox(c.root).union(new THREE.Box3(new THREE.Vector3(b.min.x * 0.7, b.max.y - 0.22, b.min.z * 0.7), new THREE.Vector3(b.max.x * 0.7, b.max.y, b.max.z * 0.7)));
    const ih = h - 236;
    const img = shot([m, c.root], fit([], { box, w, h: ih, yaw: 0.3, pitch: 0.16, margin: 1.0, fov: 32 }));
    c.root.removeFromParent();
    g.drawImage(img, x, y + 150);
    caption(g, 'WE HAVE A NEW\nMANAGER', W / 2, y + 16, { size: 62, maxW: w - 30 });
    caption(g, 'SHE IS PAID IN SNACKS', W / 2, y + h - 84, { size: 56, maxW: w - 30 });
    frameRect(g, x, y, w, h);
  },
};
