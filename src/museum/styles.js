// Display sheets (展示シート): themed diorama mats laid on a display's shelves. They are how you customise
// a display — the walls and floor of the shop are fixed. Each sheet carries museum themes for scoring.
import * as THREE from 'three';
import { Pix } from '../gfx/pix.js';

export const DISPLAY_STYLES = {
  plain: { id: 'plain', name: 'Bare', jp: 'なし', price: 0, themes: [] },
  felt: { id: 'felt', name: 'Red Felt', jp: '赤フェルト', price: 0, themes: ['retro', 'shrine'] },
  gingham: { id: 'gingham', name: 'Gingham Cloth', jp: 'ギンガムクロス', price: 1500, themes: ['food', 'home'] },
  tatami: { id: 'tatami', name: 'Tatami Mat', jp: 'ミニ畳', price: 2000, themes: ['shrine', 'home', 'retro'] },
  grass: { id: 'grass', name: 'Meadow', jp: '花の草原', price: 2500, themes: ['nature', 'cute'] },
  brick: { id: 'brick', name: 'Brick Street', jp: 'レンガ通り', price: 2500, themes: ['city', 'retro'] },
  candy: { id: 'candy', name: 'Candy Land', jp: 'おかしの国', price: 3500, themes: ['candy', 'cute', 'food'] },
  beach: { id: 'beach', name: 'Beach', jp: '砂浜', price: 3500, themes: ['ocean', 'nature'] },
  moss: { id: 'moss', name: 'Moss Garden', jp: '苔庭', price: 4000, themes: ['shrine', 'nature'] },
  night: { id: 'night', name: 'Haunted Night', jp: 'おばけの夜', price: 4500, themes: ['spooky'] },
  neon: { id: 'neon', name: 'Neon Grid', jp: 'ネオン街', price: 5000, themes: ['city', 'weird'] },
  stars: { id: 'stars', name: 'Starfield', jp: '星空', price: 6000, themes: ['space'] },
};
export const STYLE_ORDER = Object.keys(DISPLAY_STYLES);

const T = 64; // tile size (px) — painted at ~1 px per 2.3 mm

const P = {
  felt(p) {
    p.fill(0xb8202c);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (((x * 7 + y * 13) % 17) === 0) p.px(x, y, 0xa01824);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (((x * 11 + y * 5) % 23) === 0) p.px(x, y, 0xcc3440);
  },
  gingham(p) {
    p.fill(0xffffff);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const a = Math.floor(x / 8) % 2, b = Math.floor(y / 8) % 2;
      if (a && b) p.px(x, y, 0xd8343c); else if (a || b) p.px(x, y, (x + y) % 2 ? 0xf08a8e : 0xec7a80);
    }
  },
  tatami(p) {
    p.fill(0xc8c07a);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (y % 3 === 0) p.px(x, y, 0xb4ac68);
      if ((x * 3 + y) % 11 === 0) p.px(x, y, 0xd8d08c);
    }
    // heri (cloth border) on two edges so tiles read as mats
    p.rect(0, 0, T, 4, 0x2a3a2a); p.rect(0, 1, T, 1, 0x4a5a3a);
    p.rect(0, 32, T, 4, 0x2a3a2a); p.rect(0, 33, T, 1, 0x4a5a3a);
  },
  grass(p) {
    p.fill(0x5aa844);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const k = (x * 13 + y * 7 + (x * y) % 5) % 19;
      if (k === 0) p.px(x, y, 0x4a9038); else if (k === 3) p.px(x, y, 0x72c056); else if (k === 7) { p.px(x, y, 0x6ab84e); p.px(x, y - 1, 0x84cc62); }
    }
    const flower = (x, y, c) => { p.px(x, y, 0xffe14a); p.px(x - 1, y, c); p.px(x + 1, y, c); p.px(x, y - 1, c); p.px(x, y + 1, c); };
    for (const [x, y, c] of [[8, 10, 0xffffff], [40, 6, 0xff9ac0], [22, 30, 0xffffff], [54, 26, 0xfff27a], [12, 48, 0xff9ac0], [34, 52, 0xffffff], [58, 50, 0xb8a0ff], [28, 14, 0xfff27a]]) flower(x, y, c);
  },
  brick(p) {
    p.fill(0x8a8076);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) {
      const x0 = c * 16 + (r % 2) * 8, y0 = r * 8;
      const base = [0xb8573c, 0xa84c34, 0xc46446, 0x9c4430][(r * 3 + c * 5 + 8) % 4];
      p.rect(x0 + 1, y0 + 1, 14, 6, base);
      p.rect(x0 + 1, y0 + 1, 14, 1, 0xd47a58);
      p.rect(x0 + 1, y0 + 6, 14, 1, 0x7a3424);
    }
  },
  candy(p) {
    p.fill(0xffd6e6);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if ((Math.floor(x / 16) + Math.floor(y / 16)) % 2) p.px(x, y, 0xfff2c8);
    const cols = [0xff5a8a, 0x5ac8ff, 0x7ae07a, 0xffd23f, 0xb48aff, 0xffffff];
    for (let i = 0; i < 46; i++) {
      const x = (i * 37 + 11) % T, y = (i * 23 + 5) % T, c = cols[i % cols.length];
      if (i % 2) { p.px(x, y, c); p.px(x + 1, y + 1, c); } else { p.px(x, y, c); p.px(x + 1, y, c); }
    }
  },
  beach(p) {
    p.fill(0xf0d8a0);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const k = (x * 17 + y * 29) % 13;
      if (k === 0) p.px(x, y, 0xdcc088); else if (k === 5) p.px(x, y, 0xfaecc4);
    }
    // a strip of water + foam along one edge
    for (let x = 0; x < T; x++) {
      const e = 6 + Math.round(Math.sin(x / 5) * 2);
      for (let y = 0; y < e; y++) p.px(x, y, y < e - 3 ? 0x4ab8d8 : 0x7ad4e8);
      p.px(x, e, 0xffffff); if (x % 3) p.px(x, e + 1, 0xf8f0d8);
    }
    // shells & starfish
    const shell = (x, y) => { p.px(x, y, 0xffb0a0); p.px(x + 1, y, 0xffc8b8); p.px(x, y + 1, 0xf09080); p.px(x + 1, y + 1, 0xffb0a0); };
    shell(20, 30); shell(46, 44); shell(10, 54);
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [1, -2], [-1, -2]]) p.px(36 + dx, 24 + dy, 0xff8a3a);
  },
  moss(p) {
    p.fill(0x4a7a34);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const k = (x * 7 + y * 11 + ((x >> 2) * (y >> 2))) % 9;
      if (k === 0) p.px(x, y, 0x3a6428); else if (k === 4) p.px(x, y, 0x5e9040);
    }
    const stone = (cx, cy, r) => { for (let y = -r; y <= r; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = (x * x) / ((r + 1) * (r + 1)) + (y * y) / (r * r); if (d <= 1) p.px(cx + x, cy + y, d > 0.6 ? 0x7a7a72 : y < 0 ? 0xa8a8a0 : 0x92928a); } };
    stone(16, 18, 5); stone(44, 40, 6); stone(22, 50, 3);
  },
  night(p) {
    p.fill(0x2a1e44);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const k = (x * 5 + y * 9) % 23;
      if (k === 0) p.px(x, y, 0x3a2a5a); else if (k === 11) p.px(x, y, 0x22183a);
    }
    const ghost = (x, y) => p.sprite(['.WWW.', 'WKWKW', 'WWWWW', 'WWWWW', 'W.W.W'], { W: 0xd8d0f0, K: 0x2a1e44 }, x, y);
    ghost(10, 12); ghost(42, 36);
    for (const [x, y] of [[30, 8], [54, 18], [20, 46], [6, 30], [50, 56]]) { p.px(x, y, 0x9a8ad8); }
    for (const [x, y] of [[36, 14], [14, 40]]) { p.px(x, y, 0xffb04a); p.px(x + 1, y, 0xffd27a); }
  },
  neon(p) {
    p.fill(0x14102a);
    for (let i = 0; i < T; i++) { p.px(i, 0, 0xff4fd8); p.px(i, 32, 0xff4fd8); p.px(0, i, 0x4ff0ff); p.px(32, i, 0x4ff0ff); }
    for (let i = 0; i < T; i++) { p.px(i, 1, 0x7a2a6a); p.px(i, 33, 0x7a2a6a); p.px(1, i, 0x1a6a7a); p.px(33, i, 0x1a6a7a); }
    for (const [x, y] of [[16, 16], [48, 48], [48, 16], [16, 48]]) p.px(x, y, 0xffffff);
  },
  stars(p) {
    p.fill(0x0e1236);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if ((x * 31 + y * 17) % 29 === 0) p.px(x, y, 0x1e2458);
    const star = (x, y, big) => { p.px(x, y, 0xffffff); if (big) { p.px(x - 1, y, 0x9ac8ff); p.px(x + 1, y, 0x9ac8ff); p.px(x, y - 1, 0x9ac8ff); p.px(x, y + 1, 0x9ac8ff); } };
    for (let i = 0; i < 26; i++) star((i * 41 + 7) % T, (i * 19 + 3) % T, i % 5 === 0);
    // tiny ringed planet
    p.circle(44, 20, 4, 0xffa84a); p.circle(43, 19, 2, 0xffc87a);
    for (let x = -7; x <= 7; x++) p.px(44 + x, 20 + Math.round(x * 0.25), 0xffe0a0);
  },
};

const GLOWY = { stars: 0.55, neon: 0.8, night: 0.15 };
const texCache = new Map();
export function styleTile(id) {
  if (!texCache.has(id)) {
    const p = new Pix(T, T, 3);
    (P[id] || P.felt)(p);
    p.flush();
    texCache.set(id, p);
  }
  return texCache.get(id);
}

const matCache = new Map();
/** Material for a sheet; `w`,`d` (m) set the texture repeat so the pixel density stays constant. */
export function styleMaterial(id) {
  if (matCache.has(id)) return matCache.get(id);
  const t = styleTile(id).texture();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: id === 'candy' || id === 'neon' ? 0.45 : 0.9 });
  if (GLOWY[id]) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = t; m.emissiveIntensity = GLOWY[id]; }
  matCache.set(id, m);
  return m;
}

/** Thin mat mesh (rect or disc) for a display surface. Repeat: one 64-px tile per 0.15 m. */
export function sheetMesh(id, mat) {
  const TILE = 0.15;
  let g;
  if (mat.r) {
    g = new THREE.CircleGeometry(mat.r, 28);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (mat.r * 2) / TILE, uv.getY(i) * (mat.r * 2) / TILE);
  } else {
    g = new THREE.PlaneGeometry(mat.w, mat.d);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * mat.w / TILE, uv.getY(i) * mat.d / TILE);
  }
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, styleMaterial(id));
  m.position.set(mat.x || 0, mat.y, mat.z || 0);
  m.receiveShadow = true;
  m.userData.noRim = true;
  m.raycast = () => {};
  return m;
}
