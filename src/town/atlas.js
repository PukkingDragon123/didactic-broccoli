// The town's two painted atlases (one draw call each for every sign, plate and stain in the lane):
//   trim  (opaque): printed matter as detailed pixel art (enamel signs, name plates, the notice board, shop boards,
//          pole advertisements, safety signs; painted small and set crisp) and painted hardware faces (the fan grille
//          of an air conditioner, meter dials, door leaves, shutter boxes).
//   decal (alpha): weathering and road paint (drips, splash-back, moss, cracks, rust, 止まれ, lids) and the cut-out
//          boards (the 飛び出し注意 boy, the carp streamers).
// Japanese text is set in DotGothic16; everything is repainted once the font has loaded. All names and brands are made up.
//   const A = townAtlas();  A.trim.uv('gomi') -> [u0, v0, u1, v1]   A.trim.tex   A.size('gomi') -> [w, h] metres
import * as THREE from 'three';
import { draw5, textW5 } from '../gfx/font5x7.js';
import { pixelFilter } from '../kit/photoTex.js';

export const NAMES = ['鈴木', '太田', '日下', '木村', '田中', '鳩田', '矢吹', '森', '渡辺', '東方', '虹村', '山田', '佐藤', '小林', '山本', '伊藤', '加藤'];
export const NAME_INDEX = Object.fromEntries(NAMES.map((n, i) => [n, i]));
const JP = '"DotGothic16", monospace';
let TC = null, TX = null;
let ALLTEXT = '';

/** Crisp text (no anti-aliasing): o { s size px, c colour, a 'l' | 'c' | 'r', v vertical, sp extra pitch }. */
function tx(g, str, x, y, o = {}) {
  const s = o.s || 16, c = o.c || '#1a1a1a', a = o.a || 'l';
  ALLTEXT += str;
  if (o.v) { [...str].forEach((ch, i) => tx(g, ch, x, y + i * (s + (o.sp || 0)), { s, c, a: 'c' })); return; }
  if (!TC) { TC = document.createElement('canvas'); TC.width = 1024; TC.height = 80; TX = TC.getContext('2d', { willReadFrequently: true }); }
  TX.clearRect(0, 0, 1024, 80); TX.font = `${s}px ${JP}`; TX.textBaseline = 'top'; TX.fillStyle = '#fff';
  const w = Math.min(1022, Math.ceil(TX.measureText(str).width) + 2), h = Math.min(78, s + 6);
  TX.fillText(str, 1, 1);
  const d = TX.getImageData(0, 0, w, h).data, x0 = Math.round(a === 'c' ? x - w / 2 : a === 'r' ? x - w : x);
  g.fillStyle = c;
  for (let j = 0; j < h; j++) { let run = -1; for (let i = 0; i <= w; i++) { const on = i < w && d[(j * w + i) * 4 + 3] > 100; if (on && run < 0) run = i; else if (!on && run >= 0) { g.fillRect(x0 + run, Math.round(y) + j, i - run, 1); run = -1; } } }
}
const r = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const fr = (g, x, y, w, h, c, t = 1) => { g.fillStyle = c; g.fillRect(x, y, w, t); g.fillRect(x, y + h - t, w, t); g.fillRect(x, y, t, h); g.fillRect(x + w - t, y, t, h); };
const disc = (g, cx, cy, rad, c) => { g.fillStyle = c; for (let j = -rad; j <= rad; j++) { const w = Math.floor(Math.sqrt(rad * rad - j * j)); g.fillRect(cx - w, cy + j, w * 2 + 1, 1); } };
const t5 = (g, str, x, y, col, s = 1, a = 'l') => draw5(g, str, a === 'c' ? x - textW5(str, s) / 2 : a === 'r' ? x - textW5(str, s) : x, y, { col, s });
/** Old enamel: rust round the four screw holes and three chips, each drawn where it is. */
function chips(g, w, h, flip = 0) {
  for (const [x, y, l] of [[3, 3, 3], [w - 4, 3, 2], [3, h - 4, 1], [w - 4, h - 4, 4]]) { r(g, x - 1, y - 1, 3, 3, '#8a4e2c'); r(g, x, y, 1, 1, '#2a2420'); r(g, x - 1, y + 2, 1, l, '#a8683e'); }
  for (const [fx, fy, cw, ch, c] of [[0.18, 0.31, 3, 2, '#8a4e2c'], [0.74, 0.58, 2, 1, '#5a3a28'], [0.4, 0.86, 3, 1, '#8a4e2c']]) r(g, Math.round((flip ? 1 - fx : fx) * w), Math.round(fy * h), cw, ch, c);
}

class Atlas {
  constructor(w, h, alpha) {
    this.w = w; this.h = h; this.alpha = alpha;
    this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h;
    this.x = this.c.getContext('2d');
    this.R = new Map(); this.packed = false;
    const t = new THREE.CanvasTexture(this.c);
    t.colorSpace = THREE.SRGBColorSpace; pixelFilter(t); // pixel art: crisp texels up close, trilinear + anisotropic far away
    this.tex = t;
  }
  alloc(name, w, h, m) { const e = { x: 0, y: 0, w, h, m }; this.R.set(name, e); return e; }
  /** Shelf-pack the regions, tallest first. */
  pack() {
    const P = 6;
    let sx = P, sy = P, sh = 0;
    for (const [name, e] of [...this.R].sort((a, b) => b[1].h - a[1].h)) {
      if (sx + e.w + P > this.w) { sx = P; sy += sh + P; sh = 0; }
      if (sy + e.h + P > this.h) { console.warn('town atlas full:', name); e.x = e.y = 0; continue; }
      e.x = sx; e.y = sy; sx += e.w + P; sh = Math.max(sh, e.h);
    }
    this.packed = true;
  }
  /** Pixel-art region: w x h design pixels shown k times larger; m = its width in metres. */
  pix(name, w, h, k, m, fn) { const e = this.alloc(name, w * k, h * k, m); if (e) { e.k = k; e.fn = fn; e.dw = w; e.dh = h; } }
  /** Painted region at atlas resolution (w x h pixels, m metres wide). */
  vec(name, w, h, m, fn) { const e = this.alloc(name, w, h, m); if (e) e.fn = fn; }
  paint() {
    const X = this.x;
    if (!this.packed) this.pack();
    X.clearRect(0, 0, this.w, this.h);
    if (!this.alpha) { X.fillStyle = '#8a8680'; X.fillRect(0, 0, this.w, this.h); }
    for (const [name, e] of this.R) {
      try {
        if (e.k) {
          const c = document.createElement('canvas'); c.width = e.dw; c.height = e.dh;
          const g = c.getContext('2d');
          e.fn(g, e.dw, e.dh);
          X.imageSmoothingEnabled = false;
          X.drawImage(c, e.x, e.y, e.w, e.h);
          if (!this.alpha) { X.drawImage(c, 0, 0, e.dw, 1, e.x, e.y - 3, e.w, 3); X.drawImage(c, 0, e.dh - 1, e.dw, 1, e.x, e.y + e.h, e.w, 3); X.drawImage(c, 0, 0, 1, e.dh, e.x - 3, e.y, 3, e.h); X.drawImage(c, e.dw - 1, 0, 1, e.dh, e.x + e.w, e.y, 3, e.h); }
        } else { X.save(); X.translate(e.x, e.y); X.beginPath(); X.rect(0, 0, e.w, e.h); X.clip(); e.fn(X, e.w, e.h); X.restore(); }
      } catch (err) { console.warn('town atlas painter failed:', name, err); }
    }
    this.tex.needsUpdate = true;
  }
  /** uv rectangle of a region (sub = [x0, y0, x1, y1] as fractions of it, y down). */
  uv(name, sub = null) {
    const e = this.R.get(name);
    if (!e) return [0, 0, 0.001, 0.001];
    const [a, b, c, d] = sub || [0, 0, 1, 1], i = 0.4;
    return [(e.x + a * e.w + i) / this.w, 1 - (e.y + d * e.h - i) / this.h, (e.x + c * e.w - i) / this.w, 1 - (e.y + b * e.h + i) / this.h];
  }
  /** [w, h] in metres. */
  size(name) { const e = this.R.get(name); return e ? [e.m, e.m * e.h / e.w] : [0.1, 0.1]; }
}

// ------------------------------------------------------------------ the opaque atlas: prints and hardware
function buildTrim(A) {
  // 表札: the families' name plates (stone, engraved)
  NAMES.forEach((n, i) => A.pix('name' + i, 18, 40, 3, 0.09, (g, w, h) => {
    r(g, 0, 0, w, h, i % 3 === 1 ? '#3a342c' : '#e9e4d6'); fr(g, 0, 0, w, h, i % 3 === 1 ? '#1e1a16' : '#b8b0a0'); r(g, 1, 1, w - 2, 1, i % 3 === 1 ? '#5a5248' : '#fbf8f0');
    tx(g, n, 9, n.length > 1 ? 3 : 11, { v: true, c: i % 3 === 1 ? '#e8d8a0' : '#222', sp: 1 });
  }));
  // enamel advertising signs (original brands)
  const enamel = (name, bg, band, fg, main, sub, mark, seed) => A.pix(name, 52, 140, 3, 0.26, (g, w, h) => {
    r(g, 0, 0, w, h, bg); fr(g, 1, 1, w - 2, h - 2, fg); r(g, 2, h - 26, w - 4, 24, band);
    mark(g); tx(g, main, 26, 36, { v: true, c: fg, sp: 0 }); tx(g, sub, 26, h - 22, { s: 16, c: bg === '#f4f0e4' ? '#f4f0e4' : bg, a: 'c' });
    chips(g, w, h, seed % 2);
  });
  enamel('enSoap', '#1f4a9a', '#f4f0e4', '#f4f0e4', 'ほしぞら', '石けん', (g) => { g.fillStyle = '#ffd23f'; for (const [x, y, s] of [[26, 8, 7], [12, 22, 3], [41, 20, 4]]) { r(g, x - s, y - 1, s * 2 + 1, 3, '#ffd23f'); r(g, x - 1, y - s, 3, s * 2 + 1, '#ffd23f'); r(g, x - s / 2 | 0, y - s / 2 | 0, s + 1, s + 1, '#ffd23f'); } }, 3);
  enamel('enRamune', '#c8282a', '#f4f0e4', '#f4f0e4', 'ミカワの', 'ラムネ', (g) => { r(g, 22, 6, 9, 22, '#9ad8d0'); r(g, 24, 3, 5, 4, '#9ad8d0'); r(g, 23, 12, 7, 2, '#f4f0e4'); r(g, 24, 16, 2, 9, '#d8f4f0'); disc(g, 26, 10, 2, '#3a8aa8'); }, 5);
  enamel('enUniform', '#f4f0e4', '#1a2448', '#1a2448', '学生服は', 'カミヤマ', (g) => { r(g, 14, 16, 24, 8, '#1a2448'); r(g, 10, 24, 32, 3, '#1a2448'); r(g, 18, 9, 16, 8, '#1a2448'); r(g, 25, 12, 3, 3, '#e8c040'); }, 7);
  enamel('enKatori', '#2a6a3a', '#f4e8a0', '#f4f0e4', 'たぬき印', '蚊取線香', (g) => { disc(g, 26, 16, 12, '#8a5a36'); disc(g, 26, 18, 8, '#e8d8b0'); for (const s of [-1, 1]) { disc(g, 26 + s * 9, 6, 4, '#8a5a36'); disc(g, 26 + s * 5, 15, 3, '#3a2a1e'); r(g, 26 + s * 5, 15, 1, 1, '#fff'); } r(g, 25, 19, 3, 2, '#2a2420'); }, 9);
  // 電柱広告: wrapped pole advertisements, and the pole's own number plates
  const pole = (name, bg, fg, main, sub, foot) => A.pix(name, 40, 120, 3, 0.3, (g, w, h) => { r(g, 0, 0, w, h, bg); r(g, 0, 0, w, 3, fg); r(g, 0, h - 22, w, 22, fg); tx(g, main, 20, 8, { v: true, c: fg, sp: 1 }); tx(g, sub, 20, h - 20, { s: 16, c: bg, a: 'c' }); if (foot) t5(g, foot, 20, h - 30, fg, 1, 'c'); r(g, 0, 40, w, 1, '#00000030'); });
  pole('adDentist', '#f4f0e4', '#1f6a9a', '上山歯科', '50m', '>>>');
  pole('adOta', '#ffd23f', '#1a1a1a', '太田不動産', '貸家', '22-1071');
  pole('adPawn', '#c8282a', '#f4f0e4', '質まるふく', '買取', null);
  A.pix('poleNo', 30, 44, 3, 0.15, (g, w, h) => { r(g, 0, 0, w, h, '#e8e4d8'); fr(g, 0, 0, w, h, '#5a5a58'); tx(g, '上山', 15, 1, { s: 12, a: 'c' }); r(g, 2, 15, w - 4, 1, '#5a5a58'); t5(g, '12', 15, 19, '#1a1a1a', 2, 'c'); r(g, 2, 35, w - 4, 1, '#5a5a58'); t5(g, 'L3-7', 15, 37, '#3a3a3a', 1, 'c'); });
  A.pix('poleNtt', 24, 30, 3, 0.12, (g, w, h) => { r(g, 0, 0, w, h, '#2a5a9a'); fr(g, 0, 0, w, h, '#e8e4d8'); t5(g, 'KAMI', 12, 4, '#f4f0e4', 1, 'c'); t5(g, '7-3', 12, 15, '#f4f0e4', 1, 'c'); });
  // 街区表示板: 上山町二丁目 + the block number
  for (let i = 0; i < 3; i++) A.pix('addr' + i, 16, 62, 3, 0.085, (g, w, h) => { r(g, 0, 0, w, h, i === 1 ? '#2a5a3a' : '#1f3a8a'); fr(g, 0, 0, w, h, '#f4f0e4'); tx(g, '上山町', 8, 2, { v: true, s: 12, c: '#f4f0e4', sp: 0 }); tx(g, '二', 8, 38, { s: 12, c: '#f4f0e4', a: 'c' }); r(g, 3, 51, 10, 9, '#f4f0e4'); t5(g, String([5, 8, 11][i]), 8, 52, '#1f3a8a', 1, 'c'); });
  // the corner shop's board, the old sake and tobacco shop's faded board, the barber's
  A.pix('mikawaya', 400, 50, 2, 6.15, (g, w, h) => {
    r(g, 0, 0, w, h, '#efe6cc'); fr(g, 0, 0, w, h, '#5a3a22', 2); r(g, 3, 3, w - 6, 1, '#fbf6e4');
    r(g, 8, 6, 42, 38, '#c8282a'); tx(g, 'たば', 29, 8, { c: '#fbf6e4', a: 'c' }); tx(g, 'こ', 29, 25, { c: '#fbf6e4', a: 'c' });
    tx(g, '三河屋', 200, 2, { s: 48, c: '#2a1a12', a: 'c' });
    tx(g, '駄菓子', 95, 8, { c: '#8a2a1e', a: 'c' }); tx(g, '日用品', 95, 27, { c: '#2a1a12', a: 'c' });
    tx(g, '文具・玩具', 318, 8, { c: '#2a1a12', a: 'c' }); t5(g, 'TEL 22-0841', 318, 31, '#8a2a1e', 1, 'c');
    for (let i = 0; i < 6; i++) r(g, 360 + i * 6, 28 + (i % 2) * 6, 4, 14, i % 2 ? '#2f8a4a' : '#c8282a');
  });
  A.pix('sakaeya', 312, 44, 2, 3.9, (g, w, h) => {
    r(g, 0, 0, w, h, '#d8cfb8'); fr(g, 0, 0, w, h, '#6a5a48', 2);
    tx(g, '酒', 30, 6, { s: 32, c: '#7a5a52', a: 'c' }); tx(g, 'たばこ', 86, 14, { c: '#a86a5e' });
    tx(g, 'さかえや', 215, 6, { s: 32, c: '#5a5048', a: 'c' }); tx(g, '塩', 292, 14, { c: '#8a8278', a: 'c' });
    for (const [x, y, l] of [[22, 9, 5], [38, 30, 4], [96, 20, 6], [150, 34, 4], [204, 12, 6], [236, 28, 5], [270, 19, 4]]) r(g, x, y, l, 1, '#d8cfb8');
    for (const [x, l] of [[46, 9], [128, 6], [262, 11]]) r(g, x, h - l, 2, l, '#a8845e');
  });
  A.pix('barber', 96, 30, 3, 0.9, (g, w, h) => { r(g, 0, 0, w, h, '#e4e0d4'); fr(g, 0, 0, w, h, '#8a8a88'); for (let i = 0; i < 3; i++) r(g, 4, 5 + i * 7, 10, 5, ['#c85a5a', '#e4e0d4', '#5a7ab8'][i]); tx(g, '理容イトウ', 55, 7, { c: '#6a6a78', a: 'c' }); for (const [x, y] of [[30, 6], [47, 20], [66, 9], [81, 22]]) r(g, x, y, 3, 1, '#e4e0d4'); });
  A.pix('barberPole', 16, 32, 4, 0.5, (g, w, h) => { r(g, 0, 0, w, h, '#f0ece2'); for (let y = -16; y < 48; y += 16) for (let x = 0; x < w; x++) { r(g, x, y + x, 1, 5, '#c84a48'); r(g, x, y + x + 8, 1, 5, '#4a6ab0'); } });
  A.pix('tobacco', 40, 40, 3, 0.42, (g, w, h) => { r(g, 0, 0, w, h, '#c8282a'); fr(g, 1, 1, w - 2, h - 2, '#f4f0e4'); tx(g, 'たば', 20, 4, { c: '#f4f0e4', a: 'c' }); tx(g, 'こ', 20, 20, { c: '#f4f0e4', a: 'c' }); });
  A.pix('tobaccoWin', 56, 84, 3, 0.7, (g, w, h) => {
    r(g, 0, 0, w, h, '#8a8e90'); r(g, 0, 0, w, 14, '#c8282a'); tx(g, 'たばこ', 28, -1, { s: 12, c: '#f4f0e4', a: 'c' });
    r(g, 3, 16, w - 6, 50, '#2a3238'); r(g, 27, 16, 2, 50, '#b8bcc0'); fr(g, 3, 16, w - 6, 50, '#b8bcc0');
    for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) { const c = ['#f4f0e4', '#c8282a', '#1f4a9a', '#2a6a3a', '#e8c040', '#f4f0e4'][(i + j * 2) % 6]; r(g, 6 + i * 8 - (i > 2 ? -1 : 0), 22 + j * 14, 6, 10, c); r(g, 6 + i * 8 - (i > 2 ? -1 : 0), 22 + j * 14, 6, 3, '#f4f0e4'); }
    r(g, 5, 18, 8, 30, '#ffffff22'); r(g, 0, 66, w, 4, '#d8d4cc'); r(g, 0, 70, w, 14, '#b05a48'); for (let i = 0; i < 7; i++) r(g, i * 8, 70, 1, 14, '#8a4638'); r(g, 0, 76, w, 1, '#8a4638');
  });
  // 町内会 掲示板 and the neighbourhood map board
  A.pix('notice', 184, 120, 2, 0.92, (g, w, h) => {
    r(g, 0, 0, w, h, '#3f6a4a'); r(g, 0, 16, w, 2, '#356040');
    r(g, 0, 0, w, 15, '#e9e4d6'); tx(g, '上山町内会 掲示板', 92, -1, { c: '#222', a: 'c' });
    const paper = (x, y, pw, ph, bg, tilt, fn) => { g.save(); g.translate(x + pw / 2, y + ph / 2); g.rotate(tilt); g.translate(-pw / 2, -ph / 2); r(g, 1, 1, pw, ph, '#00000040'); r(g, 0, 0, pw, ph, bg); fn(pw, ph); r(g, pw / 2 - 1, 1, 2, 2, '#c8282a'); g.restore(); };
    paper(4, 20, 42, 52, '#f4f0e4', 0.02, (pw) => { r(g, 0, 0, pw, 12, '#1f4a9a'); tx(g, '回覧', pw / 2, -2, { s: 12, c: '#fff', a: 'c' }); for (let i = 0; i < 6; i++) r(g, 4, 17 + i * 5, pw - 8 - (i % 3) * 6, 1, '#555'); r(g, 26, 44, 10, 5, '#c8282a'); });
    paper(4, 76, 40, 40, '#fff8d0', -0.03, (pw) => { tx(g, '町内', pw / 2, 1, { s: 12, c: '#2a6a3a', a: 'c' }); tx(g, '清掃', pw / 2, 13, { s: 12, c: '#2a6a3a', a: 'c' }); t5(g, '4/18', pw / 2, 29, '#c8282a', 1, 'c'); });
    paper(138, 18, 42, 60, '#fbf8f0', -0.02, (pw, ph) => { r(g, 0, 0, pw, ph, '#c8282a'); r(g, 3, 3, pw - 6, ph - 6, '#fbf8f0'); tx(g, '火の用心', pw / 2, 4, { v: true, s: 12, c: '#c8282a', sp: 1 }); });
    paper(140, 82, 40, 34, '#d8ecf8', 0.03, (pw) => { tx(g, 'ゴミは', pw / 2, 0, { s: 12, c: '#1f4a9a', a: 'c' }); tx(g, '朝8時半', pw / 2, 11, { s: 12, c: '#c8282a', a: 'c' }); tx(g, 'までに', pw / 2, 22, { s: 12, c: '#1f4a9a', a: 'c' }); });
    paper(92, 78, 44, 38, '#ffe9a0', 0.015, (pw) => { tx(g, '春の交通', pw / 2, 1, { s: 12, c: '#1a1a1a', a: 'c' }); tx(g, '安全運動', pw / 2, 13, { s: 12, c: '#c8282a', a: 'c' }); t5(g, '4.6-4.15', pw / 2, 28, '#1a1a1a', 1, 'c'); });
    fr(g, 0, 0, w, h, '#5a4030', 2);
  });
  A.pix('mapBoard', 160, 106, 3, 1.2, (g, w, h) => {
    r(g, 0, 0, w, h, '#f1ecd9'); r(g, 0, 0, w, 16, '#1f3a8a'); tx(g, '上山町二丁目 案内図', 80, -1, { c: '#f4f0e4', a: 'c' });
    r(g, 4, 20, 152, 70, '#e2dcc4');
    r(g, 4, 50, 152, 7, '#fbfaf2'); r(g, 4, 74, 152, 4, '#fbfaf2'); for (const x of [40, 70, 104]) r(g, x, 20, 3, 70, '#fbfaf2'); r(g, 104, 20, 3, 30, '#e2dcc4');
    for (const x of [10, 150]) { r(g, x - 3, 20, 7, 70, '#8a8478'); for (let y = 21; y < 90; y += 4) r(g, x - 3, y, 7, 1, '#f1ecd9'); }
    const lots = [[18, 24, 20, 24, '#f0c8a8'], [44, 24, 24, 24, '#c8dcf0'], [74, 24, 28, 24, '#f4e0a0'], [110, 24, 34, 24, '#b8d8a8'], [18, 59, 20, 13, '#d8c8e8'], [44, 59, 24, 13, '#f0c8a8'], [74, 59, 28, 13, '#f4b8b0'], [108, 59, 36, 13, '#c8dcf0'], [18, 80, 126, 9, '#e8e0c8']];
    for (const [x, y, lw, lh, c] of lots) { r(g, x, y, lw, lh, c); fr(g, x, y, lw, lh, '#8a8478'); }
    tx(g, '公園', 127, 28, { s: 12, c: '#2a6a3a', a: 'c' }); tx(g, '三河屋', 88, 59, { s: 12, c: '#8a2a1e', a: 'c' }); t5(g, 'GACHA', 88, 34, '#8a2a1e', 1, 'c');
    disc(g, 86, 53, 3, '#c8282a'); tx(g, '現在地', 62, 91, { s: 12, c: '#c8282a' }); disc(g, 56, 97, 2, '#c8282a');
    r(g, 110, 93, 8, 6, '#8a8478'); tx(g, '線路', 121, 91, { s: 12, c: '#444' }); t5(g, 'N', 147, 22, '#1f3a8a', 1); r(g, 149, 30, 1, 8, '#1f3a8a'); r(g, 148, 31, 3, 1, '#1f3a8a');
    fr(g, 0, 0, w, h, '#5a5a58', 2);
  });
  // rubbish: the collection days, the crows
  A.pix('gomi', 60, 80, 3, 0.45, (g, w, h) => {
    r(g, 0, 0, w, h, '#f4f0e4'); r(g, 0, 0, w, 15, '#1f6a9a'); tx(g, 'ゴミ集積所', 30, -1, { s: 12, c: '#fff', a: 'c' });
    const row = (y, a, b, c) => { tx(g, a, 3, y, { s: 12, c }); tx(g, b, w - 3, y, { s: 12, c: '#1a1a1a', a: 'r' }); r(g, 3, y + 13, w - 6, 1, '#b8b4a8'); };
    row(16, '燃える', '月・木', '#c8282a'); row(30, '燃えない', '水', '#1f4a9a'); row(44, 'びん缶', '金', '#2a6a3a');
    tx(g, '朝8時半まで', 30, 58, { s: 12, c: '#c8282a', a: 'c' }); r(g, 8, 73, 44, 1, '#1a1a1a'); t5(g, 'KAMIYAMA', 30, 73, '#6a6a68', 1, 'c');
    fr(g, 0, 0, w, h, '#1f6a9a');
  });
  A.pix('crowNote', 44, 30, 3, 0.33, (g, w, h) => { r(g, 0, 0, w, h, '#ffe9a0'); fr(g, 0, 0, w, h, '#1a1a1a'); tx(g, 'カラス注意', 22, 0, { s: 12, c: '#1a1a1a', a: 'c' }); tx(g, 'ネットを', 22, 14, { s: 12, c: '#c8282a', a: 'c' }); });
  // safety
  A.pix('hinoyojin', 16, 64, 3, 0.12, (g, w, h) => { r(g, 0, 0, w, h, '#f4f0e4'); fr(g, 0, 0, w, h, '#c8282a'); tx(g, '火の用心', 8, 2, { v: true, s: 12, c: '#c8282a', sp: 3 }); });
  A.pix('hydrant', 44, 44, 3, 0.4, (g, w, h) => { r(g, 0, 0, w, h, '#8a8680'); disc(g, 22, 22, 21, '#f4f0e4'); disc(g, 22, 22, 19, '#c8282a'); tx(g, '消火栓', 22, 13, { s: 12, c: '#f4f0e4', a: 'c' }); });
  A.pix('snatch', 40, 56, 3, 0.4, (g, w, h) => { r(g, 0, 0, w, h, '#ffd23f'); fr(g, 0, 0, w, h, '#1a1a1a', 2); tx(g, 'ひったくり', 20, 4, { s: 12, c: '#c8282a', a: 'c' }); tx(g, '注意', 20, 20, { c: '#1a1a1a', a: 'c' }); tx(g, '上山警察', 20, 40, { s: 12, c: '#1a1a1a', a: 'c' }); });
  A.pix('school', 44, 44, 3, 0.4, (g, w, h) => { r(g, 0, 0, w, h, '#2a8a4a'); fr(g, 1, 1, w - 2, h - 2, '#ffd23f'); tx(g, '通学路', 22, 3, { s: 12, c: '#ffd23f', a: 'c' }); tx(g, '文', 22, 18, { s: 16, c: '#f4f0e4', a: 'c' }); t5(g, '7-9', 22, 35, '#f4f0e4', 1, 'c'); });
  A.pix('dog', 30, 20, 3, 0.2, (g, w, h) => { r(g, 0, 0, w, h, '#ffd23f'); fr(g, 0, 0, w, h, '#1a1a1a'); tx(g, '猛犬', 15, -1, { s: 12, c: '#c8282a', a: 'c' }); tx(g, '注意', 15, 9, { s: 12, c: '#1a1a1a', a: 'c' }); });
  // rail bridge
  A.pix('clearPlate', 72, 22, 3, 0.9, (g, w, h) => { r(g, 0, 0, w, h, '#ffd23f'); fr(g, 0, 0, w, h, '#1a1a1a', 2); tx(g, '桁下', 18, 3, { c: '#1a1a1a', a: 'c' }); t5(g, '3.4m', 50, 5, '#c8282a', 2, 'c'); });
  A.pix('clearRound', 44, 44, 3, 0.62, (g, w, h) => { r(g, 0, 0, w, h, '#6a5a52'); disc(g, 22, 22, 21, '#c8282a'); disc(g, 22, 22, 16, '#f4f0e4'); t5(g, '3.4', 22, 15, '#1f3a8a', 2, 'c'); t5(g, 'm', 22, 31, '#1f3a8a', 1, 'c'); for (const [y, d] of [[6, 1], [37, -1]]) for (let i = 0; i < 3; i++) r(g, 22 - i, y + d * i, i * 2 + 1, 1, '#1f3a8a'); });
  A.pix('bridgeName', 56, 18, 3, 0.62, (g, w, h) => { r(g, 0, 0, w, h, '#3a4a42'); fr(g, 0, 0, w, h, '#8a9a8a'); tx(g, '上山架道橋', 28, 2, { s: 12, c: '#d8e0d0', a: 'c' }); });
  // the apartment, the agency, small household notices
  A.pix('aptName', 72, 28, 3, 0.9, (g, w, h) => { r(g, 0, 0, w, h, '#f1ece0'); fr(g, 0, 0, w, h, '#b06a7a', 2); tx(g, 'さくらハイツ', 38, 6, { s: 12, c: '#8a3a52', a: 'c' }); for (const [x, y] of [[8, 8], [64, 20]]) { disc(g, x, y, 3, '#f0a8b8'); r(g, x, y, 1, 1, '#c8485e'); } });
  A.pix('aptRecruit', 44, 28, 3, 0.4, (g, w, h) => { r(g, 0, 0, w, h, '#f4f0e4'); fr(g, 0, 0, w, h, '#c8282a'); tx(g, '入居者', 22, -1, { s: 12, c: '#c8282a', a: 'c' }); tx(g, '募集中', 22, 10, { s: 12, c: '#c8282a', a: 'c' }); t5(g, '22-1071', 22, 22, '#1a1a1a', 1, 'c'); });
  A.pix('aptNos', 54, 20, 3, 0.48, (g, w, h) => { for (let i = 0; i < 6; i++) { const x = (i % 3) * 18, y = Math.floor(i / 3) * 10; r(g, x, y, 18, 10, '#2a2c30'); t5(g, String((i < 3 ? 101 : 198) + i), x + 9, y + 2, '#e8e4d8', 1, 'c'); } });
  A.pix('ota', 44, 28, 3, 0.27, (g, w, h) => { r(g, 0, 0, w, h, '#1f4a3a'); fr(g, 1, 1, w - 2, h - 2, '#e8c860'); tx(g, '太田', 22, -1, { s: 12, c: '#e8c860', a: 'c' }); tx(g, '不動産', 22, 11, { s: 12, c: '#f4f0e4', a: 'c' }); });
  A.pix('forRent', 34, 44, 3, 0.28, (g, w, h) => { r(g, 0, 0, w, h, '#f4f0e4'); fr(g, 0, 0, w, h, '#c8282a', 2); tx(g, '貸', 17, 2, { c: '#c8282a', a: 'c' }); tx(g, '家', 17, 18, { c: '#c8282a', a: 'c' }); t5(g, '22-1071', 17, 36, '#1a1a1a', 1, 'c'); });
  A.pix('forSale', 46, 56, 3, 0.6, (g, w, h) => { r(g, 0, 0, w, h, '#f4f0e4'); fr(g, 0, 0, w, h, '#1f4a9a', 2); tx(g, '売地', 23, 3, { c: '#c8282a', a: 'c' }); tx(g, '45坪', 23, 20, { s: 12, c: '#1a1a1a', a: 'c' }); tx(g, '太田不動産', 23, 33, { s: 8, c: '#1f4a9a', a: 'c' }); t5(g, '22-1071', 23, 46, '#1a1a1a', 1, 'c'); });
  A.pix('garageSign', 60, 40, 3, 0.6, (g, w, h) => { r(g, 0, 0, w, h, '#f4f0e4'); r(g, 0, 0, w, 14, '#1f4a9a'); tx(g, '貸ガレージ', 30, -1, { s: 12, c: '#fff', a: 'c' }); tx(g, '空有', 30, 14, { c: '#c8282a', a: 'c' }); t5(g, '22-1071', 30, 32, '#1a1a1a', 1, 'c'); fr(g, 0, 0, w, h, '#1f4a9a'); });
  A.pix('closedNote', 32, 42, 3, 0.32, (g, w, h) => { r(g, 0, 0, w, h, '#ece6d2'); tx(g, '閉店', 16, 1, { c: '#3a3a3a', a: 'c' }); for (let i = 0; i < 4; i++) r(g, 4, 20 + i * 4, w - 8 - (i % 2) * 5, 1, '#6a6a68'); tx(g, '店主', 22, 32, { s: 8, c: '#3a3a3a' }); r(g, 0, 0, 5, 2, '#d8d0b0'); r(g, w - 5, 0, 5, 2, '#d8d0b0'); });
  A.pix('piano', 52, 18, 3, 0.5, (g, w, h) => { r(g, 0, 0, w, h, '#fbf8f0'); fr(g, 0, 0, w, h, '#2a2a2a'); tx(g, 'ピアノ教室', 30, 2, { s: 12, c: '#2a2a2a', a: 'c' }); for (let i = 0; i < 4; i++) r(g, 3 + i * 2, 4, 1, 6, '#2a2a2a'); });
  A.pix('milk', 30, 18, 3, 0.15, (g, w, h) => { r(g, 0, 0, w, h, '#f4f0e4'); tx(g, '牛乳', 15, -2, { s: 12, c: '#1f4a9a', a: 'c' }); r(g, 3, 13, w - 6, 3, '#1f4a9a'); });
  A.pix('baby', 26, 26, 3, 0.13, (g, w, h) => { r(g, 0, 0, w, h, '#fbe4ea'); fr(g, 0, 0, w, h, '#e88aa0'); disc(g, 13, 9, 5, '#f8d0b8'); r(g, 11, 8, 1, 1, '#2a2a2a'); r(g, 15, 8, 1, 1, '#2a2a2a'); tx(g, 'ねんね', 13, 14, { s: 8, c: '#c8485e', a: 'c' }); });
  A.pix('kairan', 28, 26, 3, 0.22, (g, w, h) => { r(g, 0, 0, w, h, '#3a6a4a'); r(g, 2, 2, w - 4, h - 4, '#f4f0e4'); tx(g, '回覧', 14, 1, { s: 12, c: '#1a1a1a', a: 'c' }); for (let i = 0; i < 3; i++) r(g, 5, 16 + i * 3, w - 10, 1, '#6a6a68'); r(g, 10, 0, 8, 3, '#8a8e90'); });
  // the park
  A.pix('parkName', 116, 28, 3, 1.16, (g, w, h) => { r(g, 0, 0, w, h, '#2f6a4a'); fr(g, 1, 1, w - 2, h - 2, '#f4f0e4'); tx(g, '上山町児童公園', 58, 5, { c: '#f4f0e4', a: 'c' }); });
  A.pix('parkRules', 50, 76, 3, 0.5, (g, w, h) => { r(g, 0, 0, w, h, '#f4f0e4'); r(g, 0, 0, w, 14, '#2f6a4a'); tx(g, 'おやくそく', 25, -1, { s: 12, c: '#fff', a: 'c' }); ['ボールあそび', 'はしない', '犬のフンは', 'もちかえる', '花火きんし'].forEach((s, i) => tx(g, s, 25, 15 + i * 11, { s: 8, c: i === 4 ? '#c8282a' : '#1a1a1a', a: 'c' })); t5(g, 'KAMIYAMA', 25, 69, '#6a6a68', 1, 'c'); fr(g, 0, 0, w, h, '#2f6a4a'); });
  A.pix('parkArrow', 60, 20, 3, 0.48, (g, w, h) => { r(g, 0, 0, w, h, '#f4f0e4'); fr(g, 0, 0, w, h, '#2f6a4a'); tx(g, '児童公園', 26, 3, { s: 12, c: '#2f6a4a', a: 'c' }); for (let i = 0; i < 5; i++) r(g, 50 + i, 10 - (4 - i), 1, (4 - i) * 2 + 1, '#c8282a'); r(g, 46, 9, 5, 3, '#c8282a'); });
  A.pix('wc', 56, 17, 3, 0.56, (g, w, h) => { for (const [x0, c, s] of [[0, '#1f4a9a', '男'], [28, '#c8282a', '女']]) { r(g, x0, 0, 28, h, '#f4f0e4'); fr(g, x0, 0, 28, h, c); tx(g, s, x0 + 8, 2, { s: 12, c }); disc(g, x0 + 20, 4, 2, c); r(g, x0 + 18, 7, 5, 6, c); if (s === '女') { r(g, x0 + 17, 10, 7, 3, c); } } });
  A.pix('closed', 60, 25, 3, 0.6, (g, w, h) => { r(g, 0, 0, w, h, '#f4f0e4'); fr(g, 0, 0, w, h, '#c8282a', 2); tx(g, '通行止', 30, 4, { c: '#c8282a', a: 'c' }); });
  A.pix('warehouse', 184, 54, 2, 4.6, (g, w, h) => { r(g, 0, 0, w, h, '#cfc8b8'); tx(g, '上山倉庫', 92, 3, { s: 48, c: '#8a8072', a: 'c' }); for (const [x, y, l] of [[24, 8, 12], [52, 30, 9], [77, 14, 14], [101, 26, 8], [126, 10, 12], [149, 32, 10], [171, 18, 9]]) r(g, x, y, 1, l, '#cfc8b8'); });
  // the pylon, the villa, the loft, the bus stop
  A.pix('danger', 38, 50, 3, 0.5, (g, w, h) => { r(g, 0, 0, w, h, '#ffd23f'); fr(g, 0, 0, w, h, '#1a1a1a', 2); tx(g, '危険', 19, 2, { c: '#c8282a', a: 'c' }); for (let i = 0; i < 9; i++) r(g, 20 - i + (i > 4 ? 5 : 0), 20 + i, 4, 1, '#1a1a1a'); tx(g, '高電圧', 19, 30, { s: 12, c: '#1a1a1a', a: 'c' }); tx(g, 'のぼるな', 19, 41, { s: 8, c: '#c8282a', a: 'c' }); });
  A.pix('pylonPlate', 60, 18, 3, 0.9, (g, w, h) => { r(g, 0, 0, w, h, '#f4f0e4'); fr(g, 0, 0, w, h, '#1a1a1a'); tx(g, '上山線', 20, 2, { s: 12, c: '#1a1a1a', a: 'c' }); t5(g, 'No.17', 44, 6, '#1a1a1a', 1, 'c'); });
  A.pix('kishibe', 30, 15, 4, 0.3, (g, w, h) => { r(g, 0, 0, w, h, '#b8944a'); fr(g, 0, 0, w, h, '#6a5226'); r(g, 1, 1, w - 2, 1, '#e8c878'); tx(g, '岸辺', 15, 0, { s: 12, c: '#2a2010', a: 'c' }); });
  A.pix('villaNo', 22, 12, 4, 0.22, (g, w, h) => { r(g, 0, 0, w, h, '#1e2024'); t5(g, '2-7', 11, 3, '#e8e4d8', 1, 'c'); });
  A.pix('pigeonBoard', 50, 15, 3, 0.5, (g, w, h) => { r(g, 0, 0, w, h, '#c8a878'); fr(g, 0, 0, w, h, '#6a5038'); tx(g, '鳩田鳩舎', 25, 0, { s: 12, c: '#2a2010', a: 'c' }); });
  A.pix('busRound', 44, 44, 3, 0.42, (g, w, h) => { r(g, 0, 0, w, h, '#8a8680'); disc(g, 22, 22, 21, '#f4f0e4'); disc(g, 22, 22, 19, '#e8762a'); r(g, 4, 17, 36, 11, '#f4f0e4'); tx(g, '上山二丁目', 22, 17, { s: 8, c: '#1a1a1a', a: 'c' }); t5(g, 'BUS', 22, 7, '#f4f0e4', 1, 'c'); t5(g, 'KAMIKO', 22, 31, '#f4f0e4', 1, 'c'); });
  A.pix('busTime', 40, 56, 3, 0.3, (g, w, h) => { r(g, 0, 0, w, h, '#fbf8f0'); r(g, 0, 0, w, 12, '#e8762a'); tx(g, '時刻表', 20, -2, { s: 12, c: '#fff', a: 'c' }); for (let j = 0; j < 10; j++) { r(g, 3, 15 + j * 4, 5, 2, '#c8282a'); r(g, 10, 14 + j * 4, 1, 4, '#b8b4a8'); for (let i = 0; i < (j < 2 || j > 7 ? 3 : 1 + j % 2); i++) r(g, 13 + i * 8, 15 + j * 4, 5, 2, '#444'); r(g, 1, 17 + j * 4, w - 2, 1, '#e0dccc'); } fr(g, 0, 0, w, h, '#6a6a68'); });

  // ---- hardware faces, painted at atlas resolution
  const R2 = (X, x, y, w, h, c) => { X.fillStyle = c; X.fillRect(x, y, w, h); };
  A.vec('acFront', 196, 134, 0.76, (X, w, h) => {
    R2(X, 0, 0, w, h, '#e6e3d8'); R2(X, 0, 0, w, 5, '#f6f4ec'); R2(X, 0, h - 7, w, 7, '#c4c0b2');
    X.fillStyle = '#3a3c3e'; X.beginPath(); X.arc(72, 67, 56, 0, 7); X.fill(); X.fillStyle = '#5c6062'; X.beginPath(); X.arc(72, 67, 50, 0, 7); X.fill();
    X.strokeStyle = '#d8d5ca'; X.lineWidth = 3; for (let rr = 10; rr < 56; rr += 9) { X.beginPath(); X.arc(72, 67, rr, 0, 7); X.stroke(); }
    X.lineWidth = 4; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; X.beginPath(); X.moveTo(72, 67); X.lineTo(72 + Math.cos(a) * 55, 67 + Math.sin(a) * 55); X.stroke(); }
    X.fillStyle = '#e6e3d8'; X.beginPath(); X.arc(72, 67, 9, 0, 7); X.fill();
    for (let i = 0; i < 9; i++) R2(X, 142, 18 + i * 11, 44, 5, '#b4b0a4'); R2(X, 142, 118, 30, 6, '#7a8a9a');
    R2(X, 0, 104, 6, 26, '#b08a64'); R2(X, 20, h - 5, 60, 5, '#b08a64');
  });
  A.vec('heater', 88, 128, 0.34, (X, w, h) => { R2(X, 0, 0, w, h, '#e8e6de'); R2(X, 0, 0, w, 4, '#f8f6f0'); R2(X, 8, 10, w - 16, 44, '#c8c4b8'); for (let i = 0; i < 7; i++) R2(X, 12, 14 + i * 6, w - 24, 3, '#6a6a66'); R2(X, 10, 64, 40, 22, '#2a3a2e'); R2(X, 14, 68, 20, 8, '#8ad06a'); X.fillStyle = '#c8282a'; X.beginPath(); X.arc(68, 75, 7, 0, 7); X.fill(); R2(X, 8, 96, w - 16, 3, '#b8b4a8'); R2(X, 0, h - 8, w, 8, '#c4c0b2'); R2(X, 30, 108, 30, 3, '#b08a64'); });
  A.vec('gasMeter', 64, 76, 0.2, (X, w, h) => { R2(X, 0, 0, w, h, '#aeb4a8'); R2(X, 0, 0, w, 4, '#c8cec2'); R2(X, 8, 10, w - 16, 26, '#f0ece0'); for (let i = 0; i < 5; i++) { R2(X, 11 + i * 9, 14, 7, 12, i > 2 ? '#c8282a' : '#1a1a1a'); R2(X, 13 + i * 9, 17, 3, 6, '#f0ece0'); } R2(X, 8, 44, w - 16, 3, '#8a9084'); X.fillStyle = '#d8b848'; X.beginPath(); X.arc(w / 2, 60, 8, 0, 7); X.fill(); R2(X, 0, h - 6, w, 6, '#8a9084'); });
  A.vec('elecMeter', 64, 80, 0.16, (X, w, h) => { R2(X, 0, 0, w, h, '#4a4a48'); X.fillStyle = '#cfd8d8'; X.beginPath(); X.arc(32, 34, 28, 0, 7); X.fill(); X.fillStyle = '#f4f2e8'; X.beginPath(); X.arc(32, 34, 23, 0, 7); X.fill(); R2(X, 16, 22, 32, 10, '#1a1a1a'); for (let i = 0; i < 4; i++) R2(X, 18 + i * 7.5, 24, 5, 6, '#f4f2e8'); R2(X, 12, 40, 40, 3, '#8a8a88'); R2(X, 20, 39, 9, 5, '#c8282a'); X.fillStyle = '#ffffff'; X.beginPath(); X.ellipse(22, 18, 9, 4, -0.5, 0, 7); X.fill(); R2(X, 18, 66, 28, 10, '#c8c4b8'); });
  A.vec('intercom', 52, 84, 0.1, (X, w, h) => { R2(X, 0, 0, w, h, '#dcd8ce'); R2(X, 0, 0, w, 4, '#f2f0e8'); R2(X, 0, h - 5, w, 5, '#b4b0a4'); for (let i = 0; i < 6; i++) R2(X, 10, 10 + i * 5, w - 20, 2.5, '#5a5a56'); X.fillStyle = '#f6f4ee'; X.beginPath(); X.arc(26, 60, 11, 0, 7); X.fill(); X.fillStyle = '#b8b4a8'; X.beginPath(); X.arc(26, 60, 7, 0, 7); X.fill(); R2(X, 38, 44, 6, 4, '#6ad06a'); });
  A.vec('vent', 104, 40, 0.4, (X, w, h) => { R2(X, 0, 0, w, h, '#2a2a28'); for (let i = 0; i < 9; i++) { R2(X, 4 + i * 11, 4, 6, h - 8, '#8a8a84'); R2(X, 4 + i * 11, 4, 2, h - 8, '#aeaea6'); } X.strokeStyle = '#9a9a94'; X.lineWidth = 4; X.strokeRect(2, 2, w - 4, h - 4); });
  A.vec('gableVent', 96, 72, 0.4, (X, w, h) => { R2(X, 0, 0, w, h, '#d8d4c8'); for (let i = 0; i < 7; i++) { R2(X, 6, 8 + i * 9, w - 12, 5, '#3a3a38'); R2(X, 6, 8 + i * 9, w - 12, 2, '#f0ece0'); } X.strokeStyle = '#a8a498'; X.lineWidth = 5; X.strokeRect(2, 2, w - 4, h - 4); });
  // door leaves (pale: tinted per house)
  A.vec('doorWest', 152, 320, 0.95, (X, w, h) => {
    R2(X, 0, 0, w, h, '#dcd6c8');
    for (const [x, y, pw, ph] of [[18, 18, 50, 110], [84, 18, 50, 110], [18, 150, 50, 150], [84, 150, 50, 150]]) { R2(X, x, y, pw, ph, '#b8b2a2'); R2(X, x + 5, y + 5, pw - 10, ph - 10, '#cfc9ba'); R2(X, x + 5, y + 5, pw - 10, 4, '#e8e2d4'); R2(X, x, y, pw, 3, '#a09a8a'); }
    R2(X, 24, 28, 38, 60, '#3a4650'); R2(X, 24, 28, 38, 8, '#8aa0aa'); R2(X, 42, 28, 3, 60, '#b8b2a2');
    R2(X, 120, 150, 14, 44, '#8a8478'); R2(X, 104, 156, 30, 9, '#c8b060'); R2(X, 104, 156, 30, 3, '#e8d490'); R2(X, 50, 134, 52, 10, '#6a665c'); R2(X, 52, 136, 48, 3, '#2a2a28');
  });
  A.vec('doorApt', 136, 312, 0.85, (X, w, h) => {
    R2(X, 0, 0, w, h, '#8f9a9c'); R2(X, 0, 0, w, 5, '#aab4b6'); R2(X, 0, 0, 5, h, '#aab4b6'); R2(X, w - 5, 0, 5, h, '#727c7e'); R2(X, 0, h - 16, w, 16, '#6a7476');
    R2(X, 36, 150, 64, 16, '#c4c8c8'); R2(X, 40, 154, 56, 4, '#2a2c2e'); X.fillStyle = '#2a2c2e'; X.beginPath(); X.arc(68, 96, 5, 0, 7); X.fill(); X.fillStyle = '#c8d4d8'; X.beginPath(); X.arc(68, 96, 2.5, 0, 7); X.fill();
    R2(X, 104, 160, 22, 36, '#c4c8c8'); R2(X, 110, 170, 20, 7, '#e0e4e4'); R2(X, 20, 8, 96, 10, '#5a6466'); R2(X, 20, 18, 4, 30, '#5a6466');
    for (const [x, y, l] of [[12, 250, 30], [80, 280, 40], [20, 296, 16]]) R2(X, x, y, l, 4, '#a8683e'); R2(X, 44, 60, 48, 20, '#e8e4d8');
  });
  A.vec('doorWood', 176, 320, 1.1, (X, w, h) => {
    R2(X, 0, 0, w, h, '#cfc7b8'); R2(X, 10, 10, w - 20, 200, '#39424a'); R2(X, 10, 10, w - 20, 26, '#7e929c');
    for (let i = 0; i < 12; i++) { R2(X, 12 + i * 13.2, 10, 5, 200, '#cfc7b8'); R2(X, 12 + i * 13.2, 10, 1.5, 200, '#e8e0d0'); }
    R2(X, 0, 105, w, 8, '#cfc7b8'); R2(X, 10, 218, w - 20, 92, '#b8b0a0'); R2(X, 14, 222, w - 28, 4, '#e0d8c8'); R2(X, w / 2 - 4, 0, 8, h, '#b0a898'); R2(X, w / 2 + 8, 150, 6, 30, '#3a3a38');
  });
  A.vec('tobukuro', 108, 280, 0.42, (X, w, h) => { R2(X, 0, 0, w, h, '#d6d0c2'); R2(X, 0, 0, w, 6, '#ece6d8'); R2(X, w - 6, 0, 6, h, '#b0aa9c'); for (const y of [16, 148]) { R2(X, 12, y, w - 24, 116, '#c2bcae'); R2(X, 16, y + 4, w - 32, 108, '#d0cabc'); R2(X, 16, y + 4, w - 32, 4, '#e6e0d2'); } R2(X, 0, h - 8, w, 8, '#a8683e'); for (let i = 0; i < 5; i++) R2(X, 10 + i * 20, h - 8 - (i % 3) * 7, 4, (i % 3) * 7, '#a8683e'); });
  A.vec('amado', 256, 256, 0.9, (X, w, h) => { R2(X, 0, 0, w, h, '#cfc9ba'); for (let i = 0; i < 16; i++) { R2(X, 0, i * 16, w, 3, '#eae4d6'); R2(X, 0, i * 16 + 12, w, 4, '#a8a294'); } R2(X, w / 2 - 3, 0, 6, h, '#9c9688'); R2(X, w / 2 + 3, 0, 3, h, '#e0dacc'); R2(X, w / 2 - 22, 120, 10, 26, '#6a665c'); for (let i = 0; i < 6; i++) R2(X, 20 + i * 42, 236 - (i % 2) * 12, 5, 20 + (i % 2) * 12, '#b07a50'); });
  A.vec('mailbox', 120, 120, 0.3, (X, w, h) => { R2(X, 0, 0, w, h, '#d0d0c8'); R2(X, 0, 0, w, 6, '#ecece4'); R2(X, 0, h - 8, w, 8, '#a4a49c'); R2(X, 14, 22, w - 28, 16, '#2a2a28'); R2(X, 14, 22, w - 28, 5, '#8a8a84'); R2(X, 30, 60, 60, 30, '#f4f0e4'); R2(X, 36, 68, 48, 3, '#6a6a66'); R2(X, 36, 76, 34, 3, '#6a6a66'); X.fillStyle = '#8a8a84'; X.beginPath(); X.arc(60, 104, 5, 0, 7); X.fill(); });
  A.vec('washer', 128, 128, 0.55, (X, w, h) => { R2(X, 0, 0, w, h, '#eeece4'); R2(X, 8, 8, 64, 86, '#cfe0ea'); R2(X, 12, 12, 56, 78, '#e4f0f6'); R2(X, 78, 8, 42, 86, '#cfe0ea'); R2(X, 82, 12, 34, 78, '#e4f0f6'); R2(X, 0, 100, w, 28, '#9ab4c6'); for (const x of [22, 60, 98]) { X.fillStyle = '#f4f2ea'; X.beginPath(); X.arc(x, 114, 9, 0, 7); X.fill(); R2(X, x - 1, 106, 2, 8, '#5a6a78'); } });
  A.vec('awning', 256, 64, 1.2, (X, w, h) => { for (let i = 0; i < 8; i++) { R2(X, i * 32, 0, 32, h, i % 2 ? '#eeeade' : '#3f8a58'); R2(X, i * 32, 0, 3, h, i % 2 ? '#dcd8cc' : '#35784c'); } R2(X, 0, h - 4, w, 4, '#00000030'); });
  A.vec('lanternPaper', 64, 96, 0.28, (X, w, h) => { R2(X, 0, 0, w, h, '#d83a2a'); for (let i = 0; i < 12; i++) R2(X, 0, i * 8 + 5, w, 2, '#b82a20'); R2(X, 0, 0, w, 8, '#1a1414'); R2(X, 0, h - 8, w, 8, '#1a1414'); R2(X, 20, 26, 24, 44, '#f4e8d0'); });
}

// ------------------------------------------------------------------ the alpha atlas: weathering, road paint, cut-outs
function buildDecal(A) {
  // one streak: a wedge from the top edge, x / length / half width in pixels
  const streak = (X, x, l, sw, col) => { X.fillStyle = col; X.beginPath(); X.moveTo(x - sw, 0); X.lineTo(x + sw, 0); X.lineTo(x + sw * 0.35, l * 0.7); X.lineTo(x, l); X.lineTo(x - sw * 0.35, l * 0.6); X.fill(); };
  const DRIP = [[[20, 150, 9], [52, 212, 6], [78, 96, 11], [104, 180, 7]], [[14, 120, 7], [40, 236, 10], [66, 70, 6], [90, 170, 8], [112, 110, 5]], [[28, 200, 12], [60, 130, 6], [96, 240, 8]]];
  // rain streaks from above (dark, translucent), three drawings
  DRIP.forEach((list, i) => A.vec('drip' + i, 128, 256, 0.6, (X) => { for (const [x, l, sw] of list) { streak(X, x, l, sw, 'rgba(58,52,62,0.20)'); streak(X, x + 3, l * 0.55, sw * 0.5, 'rgba(58,52,62,0.16)'); } }));
  A.vec('rust', 96, 256, 0.4, (X) => { for (const [x, l, sw] of [[18, 232, 10], [46, 140, 7], [72, 204, 9]]) { streak(X, x, l, sw, 'rgba(158,92,48,0.55)'); streak(X, x - 2, l * 0.5, sw * 0.45, 'rgba(112,60,34,0.5)'); } });
  // splash-back dirt along the foot of a wall, moss along it
  A.vec('base', 256, 96, 1.2, (X, w, h) => { const top = [0.62, 0.5, 0.56, 0.44, 0.5, 0.4, 0.52, 0.46, 0.58, 0.42, 0.5, 0.6, 0.48, 0.54, 0.44, 0.5, 0.62]; X.fillStyle = 'rgba(70,62,58,0.22)'; X.beginPath(); X.moveTo(0, h); top.forEach((t2, k) => X.lineTo(k * 16, h * (1 - t2))); X.lineTo(w, h); X.fill(); X.fillStyle = 'rgba(70,62,58,0.2)'; X.fillRect(0, h * 0.72, w, h * 0.28); });
  A.vec('moss', 256, 64, 1.2, (X, w, h) => { [[10, 12], [34, 7], [52, 14], [80, 9], [104, 6], [128, 13], [150, 8], [176, 11], [200, 7], [226, 12], [246, 9]].forEach(([x, rr], i) => { X.fillStyle = i % 3 ? 'rgba(98,122,68,0.8)' : 'rgba(128,146,84,0.8)'; X.beginPath(); X.ellipse(x, h - rr * 0.35, rr, rr * 0.6, 0, 0, 7); X.fill(); }); X.fillStyle = 'rgba(98,122,68,0.85)'; X.fillRect(0, h - 5, w, 5); });
  const line = (X, pts) => { X.beginPath(); pts.forEach(([x, y], k) => X[k ? 'lineTo' : 'moveTo'](x, y)); X.stroke(); };
  A.vec('crack', 160, 160, 0.7, (X) => { X.strokeStyle = 'rgba(52,46,52,0.55)'; X.lineWidth = 2; line(X, [[8, 8], [22, 30], [30, 52], [48, 66], [56, 92], [72, 104], [80, 128], [98, 140], [104, 152]]); line(X, [[56, 92], [82, 86], [100, 95]]); });
  A.vec('roadCrack', 192, 192, 1.4, (X) => { X.strokeStyle = 'rgba(40,38,40,0.6)'; X.lineWidth = 2.5; line(X, [[96, 96], [110, 84], [118, 66], [134, 58], [140, 40], [156, 30]]); line(X, [[96, 96], [84, 108], [66, 110], [52, 124], [34, 126]]); line(X, [[96, 96], [104, 114], [100, 132], [112, 150], [108, 168]]); });
  A.vec('oil', 128, 128, 0.8, (X) => { X.fillStyle = 'rgba(40,36,44,0.3)'; X.beginPath(); X.ellipse(64, 64, 52, 34, 0.3, 0, 7); X.fill(); X.fillStyle = 'rgba(40,36,44,0.28)'; X.beginPath(); X.ellipse(56, 60, 26, 18, 0.2, 0, 7); X.fill(); });
  // what collects along a kerb: grit, four leaves, three fag ends
  A.vec('grit', 512, 64, 3, (X, w, h) => {
    [[14, 6], [40, 3], [58, 9], [96, 4], [120, 7], [151, 3], [170, 10], [204, 5], [236, 8], [262, 3], [290, 6], [318, 11], [345, 4], [372, 7], [398, 3], [424, 9], [452, 5], [480, 7], [502, 4]].forEach(([x, up], i) => { X.fillStyle = ['rgba(92,84,70,0.7)', 'rgba(140,120,80,0.8)', 'rgba(70,66,62,0.6)'][i % 3]; X.fillRect(x, h - 4 - up, 4 + (i % 3), 2.5); X.fillRect(x + 9, h - 5, 3, 2); });
    [[66, 22, 0.4], [188, 30, 2.2], [333, 18, 1.1], [470, 26, 2.8]].forEach(([x, up, a], i) => { X.fillStyle = i % 2 ? '#b08a48' : '#8a6a3a'; X.beginPath(); X.ellipse(x, h - up, 7, 3.5, a, 0, 7); X.fill(); });
    for (const [x, up] of [[108, 12], [276, 20], [416, 9]]) { X.fillStyle = '#ece6d6'; X.fillRect(x, h - up, 9, 3); X.fillStyle = '#c88a48'; X.fillRect(x + 6, h - up, 3, 3); }
    X.fillStyle = 'rgba(70,62,58,0.25)'; X.fillRect(0, h - 5, w, 5);
  });
  // lids
  const iron = (X, cx, cy, rr, n) => { X.fillStyle = '#4a4648'; X.beginPath(); X.arc(cx, cy, rr, 0, 7); X.fill(); X.fillStyle = '#6a6466'; X.beginPath(); X.arc(cx, cy, rr * 0.92, 0, 7); X.fill(); X.fillStyle = '#58545a'; for (let k = 0; k < n; k++) { const a = (k / n) * 6.2832; X.beginPath(); X.arc(cx + Math.cos(a) * rr * 0.68, cy + Math.sin(a) * rr * 0.68, rr * 0.11, 0, 7); X.fill(); } X.strokeStyle = '#4e4a50'; X.lineWidth = rr * 0.07; X.beginPath(); X.arc(cx, cy, rr * 0.45, 0, 7); X.stroke(); X.beginPath(); X.moveTo(cx - rr * 0.45, cy); X.lineTo(cx + rr * 0.45, cy); X.moveTo(cx, cy - rr * 0.45); X.lineTo(cx, cy + rr * 0.45); X.stroke(); X.fillStyle = '#8a868a'; X.fillRect(cx - rr * 0.2, cy - rr * 0.86, rr * 0.4, rr * 0.05); };
  A.vec('manhole', 192, 192, 0.66, (X, w) => iron(X, w / 2, w / 2, w / 2 - 3, 12));
  A.vec('lidHydrant', 224, 224, 0.9, (X, w) => { X.fillStyle = '#e2bc30'; X.fillRect(0, 0, w, w); X.clearRect(16, 16, w - 32, w - 32); X.fillStyle = '#e2bc3000'; iron(X, w / 2, w / 2, 70, 8); X.fillStyle = '#e2bc30'; X.beginPath(); X.arc(w / 2, w / 2, 14, 0, 7); X.fill(); });
  A.vec('lidValve', 64, 64, 0.2, (X, w) => { iron(X, 32, 32, 30, 4); });
  A.vec('lidSquare', 128, 128, 0.5, (X, w) => { X.fillStyle = '#5a5658'; X.fillRect(0, 0, w, w); X.fillStyle = '#74707a'; X.fillRect(6, 6, w - 12, w - 12); X.fillStyle = '#625e66'; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if ((i + j) % 2) X.fillRect(14 + i * 20, 14 + j * 20, 18, 18); X.fillStyle = '#3a3638'; X.fillRect(w / 2 - 8, 10, 16, 5); });
  // road paint (worn: the letters are scuffed by rule)
  // tyre wear: scuffs rubbed through the paint where the wheels cross it
  const worn = (X, w, h, flip) => { X.globalCompositeOperation = 'destination-out'; for (const [fx, fy, fw, fh, al] of [[0.08, 0.2, 0.3, 0.05, 0.7], [0.5, 0.12, 0.22, 0.04, 0.5], [0.2, 0.45, 0.4, 0.06, 0.6], [0.66, 0.5, 0.25, 0.04, 0.8], [0.05, 0.72, 0.2, 0.05, 0.5], [0.4, 0.8, 0.36, 0.06, 0.7], [0.74, 0.86, 0.2, 0.04, 0.6], [0.3, 0.3, 0.12, 0.03, 0.8]]) { X.fillStyle = `rgba(0,0,0,${al})`; X.fillRect((flip ? 1 - fx - fw : fx) * w, fy * h, fw * w, fh * h); } X.globalCompositeOperation = 'source-over'; };
  A.pix('tomare', 54, 62, 5, 1.5, (g, w, h) => { const c = document.createElement('canvas'); c.width = 54; c.height = 20; const k = c.getContext('2d'); tx(k, '止まれ', 27, 1, { c: '#ecebe4', a: 'c' }); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, 54, 20, 0, 0, 54, 62); worn(g, w, h, 0); });
  A.pix('speed30', 26, 44, 5, 1.1, (g, w, h) => { t5(g, '30', 13, 2, '#e8b838', 2, 'c'); const c = document.createElement('canvas'); c.width = 26; c.height = 18; c.getContext('2d').drawImage(g.canvas, 0, 0, 26, 18, 0, 0, 26, 18); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, 26, 18, 0, 0, 26, 44); worn(g, w, h, 1); });
  A.pix('schoolPaint', 112, 46, 4, 3.4, (g, w, h) => { const c = document.createElement('canvas'); c.width = 112; c.height = 20; const k = c.getContext('2d'); tx(k, 'スクールゾーン', 56, 1, { c: '#e8b838', a: 'c' }); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, 112, 20, 0, 0, 112, 46); worn(g, w, h, 0); });
  A.vec('chalk', 192, 192, 2.2, (X) => { X.strokeStyle = 'rgba(240,238,228,0.75)'; X.lineWidth = 4; for (const [x, y] of [[96, 170], [96, 136], [70, 102], [122, 102], [96, 68], [70, 34], [122, 34]]) { X.beginPath(); X.arc(x, y, 17, 0, 7); X.stroke(); } });
  // cut-outs: the 飛び出し注意 boy, the carp streamers
  A.pix('tobidashi', 56, 96, 3, 0.5, (g, w, h) => {
    const sk = '#f4c8a0', cap = '#ffd23f', sh = '#e8483a', pa = '#2a4a9a';
    disc(g, 30, 16, 11, sk); r(g, 18, 5, 24, 8, cap); r(g, 14, 11, 10, 3, cap); r(g, 26, 15, 2, 3, '#1a1a1a'); r(g, 34, 15, 2, 3, '#1a1a1a'); r(g, 27, 22, 7, 2, '#c8282a');
    r(g, 18, 28, 24, 26, sh); r(g, 8, 30, 12, 7, sh); r(g, 2, 26, 8, 7, sk); r(g, 40, 32, 12, 7, sh); r(g, 48, 38, 7, 7, sk);
    r(g, 18, 54, 24, 12, pa); r(g, 12, 62, 12, 16, sk); r(g, 6, 76, 14, 7, '#f4f0e4'); r(g, 34, 62, 10, 18, sk); r(g, 34, 78, 16, 7, '#f4f0e4');
    r(g, 4, 86, 48, 10, '#f4f0e4'); fr(g, 4, 86, 48, 10, '#c8282a'); tx(g, 'とびだし', 28, 85, { s: 8, c: '#c8282a', a: 'c' });
  });
  const koi = (name, body, belly, len) => A.pix(name, len, 22, 3, len / 64, (g, w, h) => {
    for (let x = 0; x < w - 8; x++) { const t = x / (w - 8), hh = Math.round(9 - 4 * t + Math.sin(t * 9) * 0.6); r(g, x, 11 - hh, 1, hh * 2, body); r(g, x, 11 + hh - 3, 1, 3, belly); }
    for (let x = 14; x < w - 12; x += 5) for (let y = 5; y < 16; y += 4) r(g, x + ((y / 4) % 2) * 2, y, 3, 1, belly);
    for (let i = 0; i < 8; i++) { r(g, w - 8 + i, 11 - i, 1, 2, body); r(g, w - 8 + i, 9 + i, 1, 2, body); }
    r(g, 0, 2, 3, 18, '#f4f0e4'); disc(g, 8, 8, 3, '#f4f0e4'); r(g, 8, 8, 1, 1, '#1a1a1a'); r(g, 4, 14, 8, 1, belly);
  });
  koi('koi0', '#2a2a30', '#8a8a92', 96); koi('koi1', '#d8483a', '#f4b8a0', 80); koi('koi2', '#3a6ab8', '#a8c8e8', 64);
  A.pix('fuki', 80, 22, 3, 1.25, (g, w, h) => { ['#c8282a', '#ffd23f', '#2a8a4a', '#3a6ab8', '#f4f0e4'].forEach((c, i) => { for (let x = 0; x < w; x++) r(g, x, 1 + i * 4 + Math.round(Math.sin(x * 0.14 + i) * 1.2), 1, 4, c); }); r(g, 0, 0, 3, h, '#f4f0e4'); });
  A.vec('puddle', 128, 128, 1, (X, w, h) => { X.fillStyle = '#5a6a78'; X.beginPath(); for (let k = 0; k <= 14; k++) { const a = (k / 14) * 6.2832, rr = 46 + 12 * Math.sin(a * 3 + 1) + 5 * Math.sin(a * 5); X[k ? 'lineTo' : 'moveTo'](64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr * 0.86); } X.fill(); X.fillStyle = '#8aa2b4'; X.beginPath(); X.ellipse(56, 54, 22, 9, -0.3, 0, 7); X.fill(); });
}

let ATLAS = null;
/** The town's atlases (built once). */
export function townAtlas() {
  if (ATLAS) return ATLAS;
  const trim = new Atlas(2048, 2048, false), decal = new Atlas(2048, 1024, true);
  buildTrim(trim); buildDecal(decal);
  ALLTEXT = '';
  trim.paint(); decal.paint();
  const chars = [...new Set(ALLTEXT)].join('');
  if (typeof document !== 'undefined' && document.fonts?.load) {
    Promise.all([12, 16].map((s) => document.fonts.load(`${s}px "DotGothic16"`, chars))).then(() => { trim.paint(); decal.paint(); }).catch(() => {});
  }
  ATLAS = { trim, decal };
  return ATLAS;
}
