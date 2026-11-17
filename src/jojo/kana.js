// Menacing manga onomatopoeia as pixel-art sprites floating in 3D (an affectionate homage to a certain bizarre
// manga's lettering, all original): ゴゴゴ rumbling up beside a tense customer, ドドド thumping over a rival, a big
// ドン! on an impact. Each glyph is DotGothic16 inked at its native 16 px grid, thresholded to hard pixels, made bold
// (one texel wider and taller), slanted in one-texel steps, shaded in three flat bands with a top highlight, outlined
// in ink and extruded two texels like painted block letters. They are drawn on one overlay canvas at a whole number
// of screen pixels per art pixel, anchored to points in the world (a head, a capsule, a machine) or to the screen.
// Stepped animation only: a three-frame pop, a one-texel tremble ten times a second, a slow stepped rise and an
// ordered-dither dissolve. No rotation (it would resample), no smoothing, no glows.
//   const K = new Kana(game);   K.spawn({ kind: 'go' | 'do' | 'don' | 'ban' | 'zun', at, n, dur, side, size })
//   at: Vector3 | Human (h.headTop) | Npc (n.h) | () => Vector3 | null (screen: [x, y] as 0..1 fractions; px: screen
//   pixels per art pixel there), text: a word instead of the kind's own
//   K.update(dt)  (Game.updaters)   K.clear()
import * as THREE from 'three';
import { audio } from '../core/audio.js';

// palettes: ink outline, extrude, dark band, base, light band, top highlight
const PAL = {
  go: ['#160a20', '#3a1660', '#6a2aa8', '#9a4ce4', '#c890ff', '#f2e2ff'],
  do: ['#22061a', '#5e0e38', '#a01c5e', '#ec3c8c', '#ff9cc8', '#fff0f6'],
  don: ['#221204', '#6a3a06', '#b07410', '#f0b628', '#ffe27a', '#fffbe0'],
  ban: ['#200606', '#5a0e0a', '#a42216', '#ec4a26', '#ffa070', '#fff0e2'],
  zun: ['#06141a', '#0c3640', '#16707a', '#28b0b0', '#8ae8d8', '#eafffa'],
  ink: ['#f4ead6', '#8a7a68', '#241a1e', '#3a2c30', '#5a4a4a', '#7a6a66'], // plain ink lettering on paper-white outline
};
/** What each kind writes: a repeated glyph rising in a column, or one word read left to right. */
const KINDS = {
  go: { ch: 'ゴ', col: true, n: 3, h: 0.3, jit: 1 },
  do: { ch: 'ド', col: true, n: 3, h: 0.3, jit: 2 },
  don: { word: 'ドン!', h: 0.42, jit: 0, pal: 'don' },
  ban: { word: 'バーン!', h: 0.36, jit: 0, pal: 'ban' },
  zun: { word: 'ズン', h: 0.34, jit: 1, pal: 'zun' },
  gyu: { word: 'ギュッ', h: 0.3, jit: 1, pal: 'do' },
  ka: { word: 'カッ!', h: 0.36, jit: 0, pal: 'don' },
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const CELL = 16, PAD = 5;

let fontReady = false;
try {
  document.fonts?.load('16px "DotGothic16"', 'ゴドンバーズギュッカ!').then(() => { fontReady = true; for (const k in CACHE) delete CACHE[k]; }, () => {});
} catch { /* no font loading API */ }
const CACHE = {};

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Bake one glyph in one palette: [frames] where frame 0 is whole and 1..3 dissolve away (ordered dither). */
function bake(ch, palName) {
  const key = ch + '|' + palName;
  if (CACHE[key]) return CACHE[key];
  const src = document.createElement('canvas');
  src.width = src.height = CELL + 4;
  const sg = src.getContext('2d', { willReadFrequently: true });
  sg.font = '16px "DotGothic16", monospace';
  sg.textBaseline = 'top';
  sg.textAlign = 'left';
  sg.fillStyle = '#000';
  sg.fillText(ch, 1, 1);
  const a = sg.getImageData(0, 0, src.width, src.height).data;
  const SW = src.width, SH = src.height;
  const on = (x, y) => x >= 0 && y >= 0 && x < SW && y < SH && a[(y * SW + x) * 4 + 3] > 110;
  // bold: one texel wider and taller; slant: one texel to the right for every five rows up
  const W = SW + 1 + 4 + PAD * 2, H = SH + 1 + PAD * 2;
  const m = new Uint8Array(W * H);
  let y0 = H, y1 = 0;
  for (let y = 0; y < SH + 1; y++) for (let x = 0; x < SW + 1; x++) {
    if (!(on(x, y) || on(x - 1, y) || on(x, y - 1) || on(x - 1, y - 1))) continue;
    const sx = x + PAD + Math.floor((SH - y) / 5), sy = y + PAD;
    m[sy * W + sx] = 1; y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  const P = PAL[palName] || PAL.go;
  const C = P.map(hex);
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const og = out.getContext('2d');
  const img = og.createImageData(W, H), d = img.data;
  const set = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  const M = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x];
  // the extrude: two texels down and to the right, in the dark ink
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (M(x - 1, y - 1) || M(x - 2, y - 2) || M(x - 1, y - 2)) set(x, y, C[1]);
  // the outline: every texel touching the letter (8-neighbourhood) that isn't the letter
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (M(x, y)) continue;
    if (M(x - 1, y) || M(x + 1, y) || M(x, y - 1) || M(x, y + 1) || M(x - 1, y - 1) || M(x + 1, y - 1) || M(x - 1, y + 1) || M(x + 1, y + 1)) set(x, y, C[0]);
  }
  // the letter: flat bands (light top, base middle, dark bottom), a highlight along every top edge, a darker texel
  // under every overhang so the strokes read as solid blocks
  const span = Math.max(1, y1 - y0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!M(x, y)) continue;
    const k = (y - y0) / span;
    let c = k < 0.34 ? C[4] : k < 0.74 ? C[3] : C[2];
    if (!M(x, y - 1)) c = C[5];
    else if (!M(x, y + 1)) c = C[2];
    else if (!M(x - 1, y) && k < 0.74) c = C[4];
    set(x, y, c);
  }
  og.putImageData(img, 0, 0);
  // dissolve frames: drop texels on a 4x4 ordered-dither threshold
  const frames = [out];
  for (let s = 1; s <= 3; s++) {
    const f = document.createElement('canvas');
    f.width = W; f.height = H;
    const fg = f.getContext('2d'), fi = fg.createImageData(W, H);
    fi.data.set(d);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < s * 4 + 1) fi.data[(y * W + x) * 4 + 3] = 0;
    fg.putImageData(fi, 0, 0);
    frames.push(f);
  }
  const r = { frames, w: W, h: H, adv: CELL + 1 };
  CACHE[key] = r; // (cleared once DotGothic16 has loaded, so early bakes are redone in the real face)
  return r;
}

const _v = new THREE.Vector3();
let SEQ = 1;
const rnd = (s) => { s = Math.sin(s * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export class Kana {
  constructor(game) {
    this.game = game;
    this.items = [];
    const c = this.canvas = document.createElement('canvas');
    c.id = 'kana-fx';
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:6;image-rendering:pixelated;display:none';
    document.body.appendChild(c);
    this.g = c.getContext('2d');
    this.dirty = false;
  }

  /**
   * Spawn a burst of lettering. opts: kind, at (see header), screen [x, y] (0..1), n (glyphs in a column), dur (s),
   * side (+1 right of the anchor, -1 left; default random), size (x the kind's world height), sound (true), lift (m
   * above the anchor), delay (s). Returns a handle { stop() }.
   */
  spawn(o = {}) {
    const K = KINDS[o.kind] || KINDS.go;
    const pal = o.pal || K.pal || o.kind || 'go';
    const glyphs = K.col ? Array.from({ length: o.n ?? K.n }, () => K.ch) : [...(o.text || K.word)];
    const it = {
      id: SEQ++, kind: o.kind || 'go', K, pal, glyphs, col: !!K.col && !o.text,
      at: o.at || null, screen: o.screen || null, t: -(o.delay || 0), dur: o.dur ?? 2.6,
      side: o.side ?? (Math.random() < 0.5 ? -1 : 1), size: o.size ?? 1, lift: o.lift ?? 0, seed: Math.random() * 100,
      offset: o.offset || null, px: o.px || 0,
    };
    if (!it.at && !it.screen) it.screen = [it.side > 0 ? 0.8 : 0.12, 0.62];
    this.items.push(it);
    this.canvas.style.display = 'block';
    if (o.sound !== false) {
      const kind = it.kind === 'do' ? 'do' : it.kind === 'go' ? 'go' : 'don';
      try { audio.play('menace', { kind, delay: o.delay || 0 }); } catch { /* audio not ready */ }
    }
    return { stop: () => { it.t = Math.max(it.t, it.dur - 0.3); } };
  }

  clear() { this.items.length = 0; }

  /** Where an anchor is in the world now (null: none / gone). */
  anchorPos(at, out) {
    if (!at) return null;
    if (typeof at === 'function') { const p = at(out); return p ? out.copy(p) : null; }
    if (at.isVector3) return out.copy(at);
    const h = at.headTop ? at : at.h?.headTop ? at.h : null;
    if (h) { if (h.root && !h.root.visible && !h.root.parent) return null; return h.headTop(out).add(_v.set(0, -0.2, 0)); }
    if (at.isObject3D) return at.getWorldPosition(out);
    return null;
  }

  update(dt) {
    const c = this.canvas, g = this.g;
    if (!this.items.length) {
      if (this.dirty) { g.clearRect(0, 0, c.width, c.height); this.dirty = false; c.style.display = 'none'; }
      return;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    this.dirty = true;
    const cam = this.game.camera;
    const tanF = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (it.t >= it.dur + 0.15 * it.glyphs.length) { this.items.splice(i, 1); continue; }
      if (it.t < 0) continue;
      // where on the screen, and how many screen pixels per art pixel
      let sx, sy, S;
      if (it.screen) {
        sx = it.screen[0] * W; sy = it.screen[1] * H;
        S = it.px || Math.max(2, Math.round((H / 150) * it.size * (it.K.h / 0.3)));
      } else {
        const p = this.anchorPos(it.at, _v);
        if (!p) { this.items.splice(i, 1); continue; }
        p.y += it.lift;
        const dist = p.distanceTo(cam.position);
        p.project(cam);
        if (p.z > 1 || Math.abs(p.x) > 1.4 || Math.abs(p.y) > 1.4) continue;
        sx = (p.x * 0.5 + 0.5) * W; sy = (0.5 - p.y * 0.5) * H;
        const px = (it.K.h * it.size) / (Math.max(0.3, dist) * 2 * tanF) * H; // the glyph's height on screen
        S = Math.max(2, Math.min(Math.round(9 * dpr), Math.round(px / 20)));
        // beside the head, not over the face
        sx += it.side * 14 * S;
      }
      if (it.offset) { sx += it.offset[0] * S; sy += it.offset[1] * S; }
      this.drawItem(it, sx, sy, S);
    }
  }

  drawItem(it, sx, sy, S) {
    const g = this.g, n = it.glyphs.length;
    const rise = Math.floor(it.t / 0.22); // one texel up every 0.22 s
    for (let k = 0; k < n; k++) {
      const gl = bake(it.glyphs[k], it.pal);
      const t = it.t - k * (it.col ? 0.13 : 0.07);
      if (t < 0) continue;
      const left = it.dur - t;
      if (left <= -0.3) continue;
      // pop: small, overshoot, settle (whole screen pixels per art pixel, never fractional)
      let s = S;
      if (t < 0.05) s = Math.max(1, Math.round(S * 0.5));
      else if (t < 0.1) s = Math.round(S * 1.34);
      else if (t < 0.15) s = Math.round(S * 0.9);
      // fade: three dissolve frames over the last 0.3 s
      const fr = left > 0 ? 0 : Math.min(3, 1 + Math.floor(-left / 0.1));
      // tremble: a seeded one- or two-texel shake that changes ten times a second
      const step = Math.floor((it.t + it.seed) * 10), j = it.K.jit;
      const jx = j ? Math.round((rnd(step * 3.1 + k * 7 + it.seed) - 0.5) * 2 * j) : 0;
      const jy = j ? Math.round((rnd(step * 5.3 + k * 11 + it.seed) - 0.5) * 2 * j) : 0;
      // layout: a column rises on a diagonal away from the anchor, each glyph a little bigger; a word reads across
      let ox, oy, sc = s;
      if (it.col) {
        sc = s + Math.floor(k / 2) * Math.max(1, Math.round(S / 4));
        ox = it.side * k * 9 * S - (it.side < 0 ? gl.w * sc : 0);
        oy = -k * 15 * S - gl.h * sc;
      } else {
        ox = (k - n / 2) * gl.adv * S - (gl.w - gl.adv) * sc / 2;
        oy = -gl.h * sc / 2 + (k % 2 ? 2 * S : 0);
      }
      const x = Math.round(sx + ox + jx * S), y = Math.round(sy + oy + (jy - rise) * S);
      g.drawImage(gl.frames[fr], x, y, gl.w * sc, gl.h * sc);
    }
  }
}
