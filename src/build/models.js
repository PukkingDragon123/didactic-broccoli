// 3D models for the furniture catalogue (src/build/catalogue.js): voxel props from src/data/props/*.js plus the
// pieces that need moving parts or a pixel canvas (photo poster, neon sign, rug, wall calendar, wall clock, gumball
// machine, fan, cardboard box). Floor / surface pieces have their origin at the bottom centre facing +z; wall pieces
// at the centre of their back (the face against the wall), facing +z out of the wall.
//   buildPiece(def, st) -> { root, parts, box (local Box3) }
//   ghostOf(def, st)    -> a dim, solid, slightly transparent stand-in (never white, never glowing)
import * as THREE from 'three';
import { propMesh, propSize, propAsset } from '../world/props.js';
import { thingMesh } from '../props/things/make.js';
import { rrect } from '../props/things/form.js';
import { parcelShellGeometry, parcelFlapGeometry } from '../props/things/parcel.js';
import { mat as mat_, chrome as chrome_, plastic as plastic_, rubber as rubber_ } from '../props/kit/kit.js';
import { pixMat, boxMesh } from '../gfx/geo.js';
import { draw5 } from '../gfx/font5x7.js';
import { GLYPHS } from '../data/props/garage.js';
import { printCanvas } from './photos.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const canvasTex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
const mats = new Map();
const mat = (key, make) => { if (!mats.has(key)) mats.set(key, make()); return mats.get(key); };

export function buildPiece(def, st = {}) {
  const M = def.model || {};
  const root = new THREE.Group();
  root.name = 'piece:' + def.id;
  const parts = {};
  if (M.prop) {
    // (props with a real model, def.asset in src/data/props, come back drawn with it: src/world/props.js)
    const m = propMesh(M.prop, { fallbackSize: def.box });
    if (M.scale) m.scale.setScalar(M.scale);
    root.add(m);
    parts.body = m;
    if (def.id === 'crt_tv') tvScreen(root, parts, M.scale || 1);
  } else if (M.gumball) gumball(root, parts);
  else if (M.poster) poster(root, parts, st);
  else if (M.clock) clock(root, parts);
  else if (M.calendar) calendar(root, parts);
  else if (M.neon !== undefined) neon(root, parts, st.design ?? M.neon);
  else if (M.rug) rug(root, parts, M.rug);
  else if (M.fan) fan(root, parts);
  else if (M.storage) storageBox(root, parts, st);
  else if (M.vacuum) { const d = propMesh('vacuum_dock', { fallbackSize: [0.26, 0.1, 0.1] }); d.position.z = -0.03; root.add(d); parts.dock = d; }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } });
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  return { root, parts, box };
}

// ------------------------------------------------------------------ the ghost: a dim solid stand-in
const ghostCache = new Map();
function ghostMaterial(src) {
  const key = src.uuid;
  if (ghostCache.has(key)) return ghostCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: src.map || null, vertexColors: !!src.vertexColors, roughness: 1, metalness: 0, transparent: true, opacity: 0.55, depthWrite: true });
  if (src.color && !src.map) m.color.copy(src.color);
  m.color.multiplyScalar(0.42);
  m.userData.base = m.color.getHex(); // (a hex number: survives material.clone(), which JSON-copies userData)
  ghostCache.set(key, m);
  return m;
}
export function ghostOf(def, st = {}) {
  const b = buildPiece(def, st);
  b.root.traverse((o) => {
    if (o.isLight) o.visible = false;
    if (!o.isMesh && !o.isInstancedMesh) return;
    o.castShadow = false; o.receiveShadow = false;
    o.raycast = () => {};
    o.material = Array.isArray(o.material) ? o.material.map((m) => ghostMaterial(m).clone()) : ghostMaterial(o.material).clone();
  });
  return b;
}
/** Tint a ghost for valid (dim, as is) / invalid (dim brick red). */
export function tintGhost(root, ok) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m.userData.base === undefined) continue;
      if (ok) m.color.setHex(m.userData.base);
      else m.color.setRGB(0.42, 0.12, 0.1);
    }
  });
}

// ------------------------------------------------------------------ gumball machine
function gumball(root, parts) {
  const base = propMesh('gumball_base', { fallbackSize: [0.3, 0.8, 0.3] });
  root.add(base);
  const vs = 0.012;
  const globe = new THREE.Group();
  globe.position.set(0, (68 + 12.4) * vs, 0);
  root.add(globe);
  const glassM = propMesh('gumball_globe');
  glassM.renderOrder = 2;
  globe.add(glassM);
  parts.globe = globe;
  parts.fills = [1, 2, 3, 4].map((k) => { const f = propMesh('gumball_fill_' + k); f.visible = false; globe.add(f); return f; });
  // the turning handle (a chrome bar on its hub)
  const knob = new THREE.Group();
  knob.position.set(0, 59.5 * vs, 13 * vs);
  const bar = boxMesh(0.1, 0.022, 0.02, mat('chrome', () => new THREE.MeshStandardMaterial({ color: 0xd8dce0, metalness: 0.9, roughness: 0.25 })));
  bar.position.y = -0.011;
  knob.add(bar);
  root.add(knob);
  parts.knob = knob;
  parts.trayPos = V(0, 53.5 * vs, 13.5 * vs);
}

// ------------------------------------------------------------------ a CRT's picture (TV feature draws into it)
function tvScreen(root, parts, s) {
  const c = document.createElement('canvas');
  c.width = 40; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#1e2624'; g.fillRect(0, 0, 40, 32);
  const t = canvasTex(c);
  let m;
  if (propAsset('crt_tv') === 'Television_01') {
    // the picture tube of the real model (0.6 x 0.457 x 0.471 m): measured off a straight-on render
    const ps = propSize('crt_tv'), k = Math.min(ps.x / 0.6, ps.y / 0.457, ps.z / 0.471) * s;
    m = new THREE.Mesh(new THREE.PlaneGeometry(0.372, 0.29), new THREE.MeshBasicMaterial({ map: t, color: 0x9aa0a0 }));
    m.position.set(-0.0615 * k, 0.259 * k, 0.229 * k);
    m.scale.setScalar(k);
  } else {
    m = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.2), new THREE.MeshBasicMaterial({ map: t, color: 0x9aa0a0 }));
    m.position.set(-0.06 * s, 0.215 * s, 0.224 * s);
    m.scale.setScalar(s);
  }
  m.userData.noRim = true;
  root.add(m);
  parts.screen = m; parts.screenCanvas = c; parts.screenTex = t;
}

// ------------------------------------------------------------------ photo poster in a frame
const FRAMES = [0x3a2418, 0x1e1e22, 0xb8862e, 0xe8e2d4, 0x6a1e22, 0x2a4a3a];
function poster(root, parts, st) {
  const pr = printCanvas(st.photo || 'flyer_gacha_wall');
  const w = pr.portrait ? 0.42 : 0.56, h = pr.portrait ? 0.56 : 0.42, t = 0.024, depth = 0.026;
  const fm = mat('frame' + (st.frame ?? 0), () => new THREE.MeshStandardMaterial({ color: FRAMES[(st.frame ?? 0) % FRAMES.length], roughness: 0.55 }));
  for (const [fw, fh, fx, fy] of [[w + 2 * t, t, 0, h / 2 + t / 2], [w + 2 * t, t, 0, -h / 2 - t / 2], [t, h, -w / 2 - t / 2, 0], [t, h, w / 2 + t / 2, 0]]) {
    const f = boxMesh(fw, fh, depth, fm); f.position.set(fx, fy, depth / 2); root.add(f);
  }
  const back = boxMesh(w, h, 0.006, mat('posterBack', () => new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 })));
  back.position.z = 0.003;
  root.add(back);
  const tex = canvasTex(pr.canvas);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
  art.position.z = 0.0075;
  root.add(art);
  pr.ready.then(() => { tex.needsUpdate = true; });
  parts.art = art;
}

// ------------------------------------------------------------------ wall clock (hands turn with the game clock)
function clock(root, parts) {
  const body = propMesh('wall_clock');
  body.position.z = 0.03;
  root.add(body);
  const hm = mat('hands', () => new THREE.MeshStandardMaterial({ color: 0x1e1a18, roughness: 0.6 }));
  const hand = (len, w) => { const g = new THREE.Group(); const m = boxMesh(w, len, 0.004, hm, { cast: false }); m.position.y = len / 2 - 0.012; g.add(m); g.position.set(0.005, 0.005, 0.048); root.add(g); return g; };
  parts.hour = hand(0.07, 0.012);
  parts.minute = hand(0.105, 0.008);
  parts.hour.position.z = 0.046;
}

// ------------------------------------------------------------------ wall calendar (redrawn each new day)
function calendar(root, parts) {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 64;
  const tex = canvasTex(c);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  page.position.set(0, -0.02, 0.006);
  root.add(page);
  const backing = boxMesh(0.31, 0.42, 0.004, mat('calBack', () => new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9 })));
  backing.position.set(0, -0.02, 0.002 - 0.002);
  root.add(backing);
  const nail = boxMesh(0.01, 0.01, 0.02, mat('chrome', () => new THREE.MeshStandardMaterial({ color: 0xd8dce0, metalness: 0.9, roughness: 0.25 })));
  nail.position.set(0, 0.2, 0);
  root.add(nail);
  parts.calCanvas = c; parts.calTex = tex;
}

/** Draw a month page: name, weekday initials, dates; today boxed, holidays and bill days in red. */
export function drawCalendar(c, game) {
  const g = c.getContext('2d'), cal = game.calendar, day = game.clock?.day ?? 1;
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(0, 0, 48, 64, '#f6f0e2');
  if (!cal) return;
  const d = cal.dateOf(day);
  R(0, 0, 48, 12, '#c8302a');
  draw5(g, d.monthName.slice(0, 3).toUpperCase() + ' ' + String(d.year).slice(2), 24, 3, { col: '#fff4e8', align: 'center' });
  const list = cal.list(d.month, d.year);
  const first = list[0] ? cal.dateOf(list[0].day).weekday : 0;
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((ch, i) => draw5(g, ch, 4 + i * 6.6, 14, { col: i === 0 ? '#c8302a' : '#6a6460' }));
  list.forEach((it, i) => {
    const k = i + first, col = k % 7, row = Math.floor(k / 7);
    const x = 2 + col * 6.6, y = 24 + row * 7;
    const sp = it.specials || [];
    const red = col === 0 || sp.some((s) => s.kind === 'holiday');
    const bill = sp.some((s) => s.kind === 'bill');
    if (it.day === day) R(x - 1, y - 1, 7, 7, '#ffd23f');
    if (bill) R(x + 4, y + 4, 2, 2, '#2a5aa8');
    // tiny 3x5 digits so the whole month fits
    tiny(g, String(it.date), x, y, red ? '#c8302a' : '#2a2420');
  });
}
const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
function tiny(g, s, x, y, col) {
  g.fillStyle = col;
  const x0 = Math.round(x) - (s.length === 1 ? -1 : 1);
  [...s].forEach((ch, k) => { const p = DIG[+ch]; if (!p) return; for (let i = 0; i < 15; i++) if (p[i] === '1') g.fillRect(x0 + k * 4 + (i % 3), y + Math.floor(i / 3), 1, 1); });
}

// ------------------------------------------------------------------ neon sign (two canvases: tubes lit / unlit)
const NEON_W = 96, NEON_H = 40;
export const NEON_DESIGNS = ['OPEN', 'GACHA', 'CAPSULE'];
function neonCanvas(design, lit) {
  const c = document.createElement('canvas');
  c.width = NEON_W; c.height = NEON_H;
  const g = c.getContext('2d');
  g.fillStyle = '#141018'; g.fillRect(0, 0, NEON_W, NEON_H);
  const tube = (col, dim) => (lit ? col : dim);
  const P = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const frame = (col, dim) => { g.fillStyle = tube(col, dim); g.fillRect(3, 3, NEON_W - 6, 1); g.fillRect(3, NEON_H - 4, NEON_W - 6, 1); g.fillRect(3, 3, 1, NEON_H - 6); g.fillRect(NEON_W - 4, 3, 1, NEON_H - 6); };
  // glyph strokes drawn as 2 px tubes with a 1 px core
  const glyph = (rows, x0, y0, sc, col, dim, core) => rows.forEach((r, j) => [...r].forEach((ch, i) => {
    if (ch !== '#') return;
    g.fillStyle = tube(col, dim); g.fillRect(x0 + i * sc, y0 + j * sc, sc, sc);
    if (lit) P(x0 + i * sc + (sc >> 1), y0 + j * sc + (sc >> 1), core);
  }));
  if (design === 0) {
    frame('#3fb8ff', '#1e3a52');
    const L = { O: ['.##.', '#..#', '#..#', '#..#', '.##.'], P: ['###.', '#..#', '###.', '#...', '#...'], E: ['####', '#...', '###.', '#...', '####'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'] };
    ['O', 'P', 'E', 'N'].forEach((ch, i) => glyph(L[ch], 14 + i * 18, 10, 4, '#ff5aa8', '#4a2236', '#ffe0f0'));
  } else if (design === 1) {
    frame('#ffd23f', '#4a3e1a');
    const rows = ['ガ', 'チ', 'ャ'].map((k) => GLYPHS[k]);
    let x = 8;
    for (const r of rows) { glyph(r, x, 12, 2, '#ffd23f', '#4a3e1a', '#fff8d0'); x += r[0].length * 2 + 3; }
    // a capsule
    const cx = 74, cy = 20;
    for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; const x2 = Math.round(cx + Math.cos(t) * 9), y2 = Math.round(cy + Math.sin(t) * 9); g.fillStyle = tube(t < Math.PI ? '#ff5a5a' : '#ffffff', '#3a2a2a'); g.fillRect(x2, y2, 2, 2); }
    g.fillStyle = tube('#ffffff', '#3a3a3a'); g.fillRect(cx - 9, cy, 19, 1);
  } else {
    frame('#7ae8a0', '#1e3a26');
    const word = 'CAPSULE';
    draw5(g, word, NEON_W / 2, 9, { col: tube('#7ae8a0', '#1e3a26'), align: 'center', s: 2 });
    for (let x = 18; x < 78; x += 6) { g.fillStyle = tube('#ff9ad8', '#3a2234'); g.fillRect(x, 31, 3, 2); }
  }
  return c;
}
function neon(root, parts, design) {
  const w = 0.72, h = 0.3;
  root.add(thingMesh('decor', 'neonBoard', [-(w + 0.04) / 2, -(h + 0.04) / 2, 0, (w + 0.04) / 2, (h + 0.04) / 2, 0.03], neonBoard));
  const on = canvasTex(neonCanvas(design, true)), off = canvasTex(neonCanvas(design, false));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: off }));
  face.position.z = 0.031;
  face.userData.noRim = true;
  root.add(face);
  parts.neon = { face, on, off };
}

/** The neon's backing: a black acrylic panel with rounded corners on four chrome stand-offs, its cable and transformer. */
function neonBoard(K, B) {
  const acryl = mat_(0x16121a, 0.32, 0x3a3440), chromeC = chrome_();
  K.prism(acryl, rrect(B.w, B.h, 0.03, 4), { plane: 'xy', a: 0.018, b: 0.028 });
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * (B.w / 2 - 0.035), y = sy * (B.h / 2 - 0.035);
    K.cyl(chromeC, x, y, 0, 0.007, 0.018, 12, { axis: 'z' });
    K.cyl(chromeC, x, y, 0.028, 0.009, 0.004, 12, { axis: 'z' }); // the cap screwed through the acrylic
  }
  // the transformer box behind the bottom right and its cable down to the plug
  K.box(plastic_(0x2a2a2e), B.x1 - 0.16, B.y0 + 0.03, 0.002, B.x1 - 0.07, B.y0 + 0.09, 0.017, { bevel: 0.003 });
  K.tube(rubber_(0x1c1c1e), [[B.x1 - 0.1, B.y0 + 0.03, 0.01], [B.x1 - 0.09, B.y0 - 0.02, 0.012], [B.x1 - 0.08, B.y0 - 0.12, 0.012]], 0.0035, 6);
}

// ------------------------------------------------------------------ rugs
function rugCanvas(kind) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 40;
  const g = c.getContext('2d');
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (kind === 'asanoha') {
    R(0, 0, 64, 40, '#26386a');
    g.fillStyle = '#c8d4ec';
    // hemp-leaf stars on a 12 x 10 lattice
    for (let cy = 0; cy <= 40; cy += 10) for (let cx = (cy / 10) % 2 ? 6 : 0; cx <= 64; cx += 12) {
      for (let k = 0; k <= 6; k++) { R(cx - 6 + k, cy, 1, 1, '#c8d4ec'); R(cx, cy - 5 + k * 5 / 6, 1, 1, '#c8d4ec'); R(cx - 6 + k * 2, cy - 5 + k * 5 / 3, 1, 1, '#8aa0d0'); R(cx + 6 - k * 2, cy - 5 + k * 5 / 3, 1, 1, '#8aa0d0'); }
    }
  } else {
    R(0, 0, 64, 40, '#a8302a');
    // seigaiha: overlapping arcs
    for (let row = -1; row < 8; row++) for (let col = -1; col < 9; col++) {
      const cx = col * 8 + (row % 2 ? 4 : 0), cy = row * 5 + 6;
      for (const r of [7, 5, 3]) for (let a = 0; a < 24; a++) { const t = Math.PI + (a / 23) * Math.PI; const x = Math.round(cx + Math.cos(t) * r), y = Math.round(cy + Math.sin(t) * r * 0.75); R(x, y, 1, 1, r === 5 ? '#f0d8c0' : '#e8a888'); }
    }
  }
  // fringe and border
  g.fillStyle = '#e8dcc0'; for (let y = 0; y < 40; y += 2) { g.fillRect(0, y, 1, 1); g.fillRect(63, y, 1, 1); }
  g.fillStyle = 'rgba(20,10,10,0.35)'; g.fillRect(1, 0, 62, 1); g.fillRect(1, 39, 62, 1); g.fillRect(1, 0, 1, 40); g.fillRect(62, 0, 1, 40);
  return c;
}
function rug(root, parts, kind) {
  const w = 1.4, d = 0.88;
  const m = mat('rug_' + kind, () => new THREE.MeshStandardMaterial({ map: canvasTex(rugCanvas(kind)), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, d), [mat('rugEdge', () => new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1 })), mat('rugEdge', () => null), m, m, mat('rugEdge', () => null), mat('rugEdge', () => null)]);
  body.position.y = 0.004;
  body.castShadow = false;
  root.add(body);
  parts.rug = body;
}

// ------------------------------------------------------------------ electric fan (head swings, blades spin)
function fan(root, parts) {
  const vs = 0.01;
  root.add(propMesh('fan_stand'));
  const head = propMesh('fan_head');
  const hg = new THREE.Group();
  hg.position.set(0, 55 * vs, -2 * vs);
  hg.add(head);
  root.add(hg);
  const blades = propMesh('fan_blades');
  const bg = new THREE.Group();
  bg.position.set(0, 15 * vs, 2 * vs);
  bg.add(blades);
  hg.add(bg);
  parts.head = hg; parts.blades = bg;
}

// ------------------------------------------------------------------ cardboard storage box
export const BOX = { w: 0.44, h: 0.3, d: 0.34 };
export function boxLabelCanvas(text) {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 18;
  const g = c.getContext('2d');
  g.fillStyle = '#f2ead6'; g.fillRect(0, 0, 48, 18);
  g.fillStyle = '#d8c8a4'; g.fillRect(0, 17, 48, 1);
  const t = String(text || '').toUpperCase().replace(/[^A-Z0-9 !?\-.'+&/¥#*:]/g, '').trim();
  const lines = [];
  let cur = '';
  for (const w of t.split(/\s+/)) { if ((cur + ' ' + w).trim().length > 7) { if (cur) lines.push(cur); cur = w.slice(0, 7); } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  if (!lines.length) { g.fillStyle = '#c8b898'; g.fillRect(6, 8, 36, 1); }
  lines.slice(0, 2).forEach((l, i) => draw5(g, l, 24, lines.length > 1 ? 1 + i * 9 : 5, { col: '#1e2a6a', align: 'center' }));
  return c;
}
function storageBox(root, parts, st) {
  const { w, h, d } = BOX, t = 0.008;
  // the photographed corrugated board of the market's cartons (src/props/things/parcel.js), open at the top
  const shell = new THREE.Mesh(parcelShellGeometry(w, h, d), null);
  shell.material = shell.geometry.userData.page.mats();
  root.add(shell);
  // four flaps on hinges along the top edges (open = folded out, closed = flat on top)
  const flaps = [];
  const flap = (len, wid, x, z, ry) => {
    const pv = new THREE.Group();
    pv.position.set(x, h, z);
    pv.rotation.order = 'YXZ'; // the hinge turns about the flap's own edge
    pv.rotation.y = ry;
    const fg = parcelFlapGeometry(len, wid * 2, true), m = new THREE.Mesh(fg, fg.userData.page.mats());
    m.position.y = 0.004 + t * 0.4;
    pv.add(m);
    root.add(pv);
    flaps.push(pv);
  };
  flap(w, d / 2, 0, -d / 2, 0); flap(w, d / 2, 0, d / 2, Math.PI);
  flap(d, w / 2 * 0.9, -w / 2, 0, Math.PI / 2); flap(d, w / 2 * 0.9, w / 2, 0, -Math.PI / 2);
  parts.flaps = flaps;
  // tape stripe and the label
  const tape = boxMesh(0.05, h * 0.5, 0.002, mat('tape', () => new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.35, transparent: true, opacity: 0.85 })), { cast: false });
  tape.position.set(0, h * 0.75, d / 2 + 0.001);
  root.add(tape);
  const lc = boxLabelCanvas(st.label);
  const lt = canvasTex(lc);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.9 }));
  label.position.set(0, h * 0.42, d / 2 + 0.002);
  root.add(label);
  parts.label = label; parts.labelTex = lt;
  // what peeks out of the top
  const peek = new THREE.Group();
  peek.position.y = h - 0.01;
  root.add(peek);
  parts.peek = peek;
  setFlaps(parts, true);
}
/** Flaps folded out (open) or down flat (closed: another box can sit on top). */
export function setFlaps(parts, open) {
  (parts.flaps || []).forEach((f, i) => { f.rotation.x = open ? -2.0 - (i % 2) * 0.25 : 0; });
  parts.flapsOpen = open;
}

export { V };
