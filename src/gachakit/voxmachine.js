// The four capsule-toy machines in voxels, after the real Japanese machines (and The Bear Must Eat's dense, hand-
// coloured voxel models): every part is blocks, coloured block by block (panel seams, screws, chips, rust, grain,
// stamped print), and only the clear window is clean low poly. Two voxel scales:
//   5 mm      the stand, the lower unit (the coin mechanism's housing), the window frame
//   2.5 mm    everything small you look at up close: the dial plate and its chrome bezel, the coin mech with the slot
//             and return button, the price plate's bezel, the chute's lip, the hook, the card rails, the lid with its
//             lock and hinges, the crank, the flap, the drawer, the - / + buttons
// The print (あそびかた, 100円, とりだしぐち, the header sign, warning stickers, the maker's plate) is pixel art at 1 mm
// a pixel on a few decal quads (one texture per type, redrawn once the kana font is in).
//   retro     a 1970s ¥100 machine: red enamel over steel, a cream front, chrome, chips and rust; on a fruit crate
//   standard  a 1990s floor machine: white moulded plastic with a blue band, on its steel pedestal
//   deluxe    a two-tier station: black and gold, over a shuttered sister unit in a steel frame
//   royal     the premium machine: pearl and pink with gold trim, on a panelled cabinet
// The layout (where the slot / crank / chute / drawer are) is src/world/machineModels.js layout(): the game logic and
// the first-person hands read it, so nothing here moves an interaction. Geometry is cached per type.
import * as THREE from 'three';
import { VoxelModel, enc, gloss, metal, glass, glow, MAT } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { mergeByMaterial } from '../voxel/merge.js';
import { mask5, textW5 } from '../gfx/font5x7.js';
import { Pix, FONT_JP } from '../gfx/pix.js';

export const VB = 0.005; // the big voxel
export const VF = 0.0025; // the fine voxel

// ----------------------------------------------------------------------------- styles
export const STYLES = {
  retro: {
    body: 0xb8432f, body2: 0x8c2e22, panel: 0xe8dcc0, panel2: 0xd6c6a2, band: 0xe8be48, bandInk: 0xa8281e, dial: 0xc4483c, dialEdge: 0x7a2018,
    knob: 0xe6e2d6, grip: 0xc4483c, inner: 0xe9dcbc, round: 1, wear: 1, stand: 'crate', flap: 'steel', accent: 0xf2c84a,
    trim: 0xc4483c, header: 0xc4483c, chrome: true, sign: 'ガチャ', model: 'GS-70',
  },
  standard: {
    body: 0xecebe4, body2: 0xd4d3cc, panel: 0xf6f5f0, panel2: 0xe6e5de, band: 0x3a72c4, bandInk: 0xf6f5f0, dial: 0x3a72c4, dialEdge: 0x1f4688,
    knob: 0xf4f2ec, grip: 0x3a72c4, inner: 0xdde7f3, round: 4, wear: 0.25, stand: 'pedestal', flap: 'smoke', accent: 0xffd23f,
    trim: 0x3a72c4, header: 0x3a72c4, sign: 'カプセルトイ', model: 'GS-90',
  },
  deluxe: {
    body: 0x2b2a2f, body2: 0x1c1b1f, panel: 0x34323a, panel2: 0x28262c, band: 0x1c1b1f, bandInk: 0xe2be5c, dial: 0x1e1d22, dialEdge: 0xd8b04a,
    knob: 0x2c2a2f, grip: 0xd8b04a, inner: 0x302e36, round: 2, wear: 0, stand: 'twotier', flap: 'smoke', accent: 0xd8b04a,
    trim: 0xd8b04a, header: 0x2b2a2f, gold: true, dark: true, sign: 'ガチャ', model: 'GS-500W',
  },
  royal: {
    body: 0xf4ecf1, body2: 0xdfd0da, panel: 0xfdf8f4, panel2: 0xeee4e6, band: 0xd24fa8, bandInk: 0xfff4c8, dial: 0xd24fa8, dialEdge: 0x8a2a70,
    knob: 0xfaf4f0, grip: 0xd24fa8, inner: 0xfae6f1, round: 4, wear: 0, stand: 'cabinet', flap: 'smoke', accent: 0xe2bc58,
    trim: 0xd24fa8, header: 0xd24fa8, gold: true, sign: 'ガチャ', model: 'GS-1000R',
  },
};

// ----------------------------------------------------------------------------- colour helpers
const sh = (c, f) => {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f))), g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f))), b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
};
const mixc = (a, b, t) => {
  const f = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (f(16) << 16) | (f(8) << 8) | f(0);
};
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const CHROME = [0x7c848e, 0xb4bcc6, 0xdce3ea, 0xfafcff];
const GOLD = [0x7a5a1c, 0xb08a34, 0xd8b04a, 0xf2d684];
const STEEL = 0x9aa2a8, RUBBER = 0x242326, DARK = 0x1d1b1e, HOLE = 0x121013;
/** Chrome (or gold) with banded highlights by height and a glint every few blocks: polished metal in blocks. */
const shine = (P, y, x = 0, z = 0) => {
  // polished metal in blocks: the mid tone, a bright streak every few blocks with a darker one beside it (streaks run
  // up the part, so the blocks of a streak merge into one face)
  const t = (((x + z) % 9) + 9) % 9;
  return metal(t === 0 ? P[3] : t === 1 ? P[1] : P[2]);
};

// ----------------------------------------------------------------------------- voxel helpers
/** Voxel index range [i0, i1] covering metres [a, b) at voxel size s. */
const R = (a, b, s) => [Math.round(a / s), Math.round(b / s) - 1];
/** Inside a rectangle with rounded vertical corners (voxel units, inclusive bounds, r radius). */
function inRR(x, z, X0, Z0, X1, Z1, r) {
  if (x < X0 || x > X1 || z < Z0 || z > Z1) return false;
  if (r <= 0) return true;
  const cx = x + 0.5, cz = z + 0.5;
  const qx = Math.max(X0 + r - cx, 0, cx - (X1 + 1 - r)), qz = Math.max(Z0 + r - cz, 0, cz - (Z1 + 1 - r));
  return qx * qx + qz * qz <= r * r + 0.01;
}
/**
 * A solid as a shell t voxels thick: inside(x, y, z) decides the solid, paint(x, y, z, n) colours a voxel (n: the axis
 * of the nearest outside face: 'px' 'nx' 'py' 'ny' 'pz' 'nz').
 */
function shell(v, X0, Y0, Z0, X1, Y1, Z1, inside, paint, t = 2) {
  const D = [['px', 1, 0, 0], ['nx', -1, 0, 0], ['py', 0, 1, 0], ['ny', 0, -1, 0], ['pz', 0, 0, 1], ['nz', 0, 0, -1]];
  for (let x = X0; x <= X1; x++) for (let y = Y0; y <= Y1; y++) for (let z = Z0; z <= Z1; z++) {
    if (!inside(x, y, z)) continue;
    let n = null;
    for (let k = 1; k <= t && !n; k++) for (const [nm, dx, dy, dz] of D) if (!inside(x + dx * k, y + dy * k, z + dz * k)) { n = nm; break; }
    if (!n) continue;
    const c = paint(x, y, z, n);
    if (c !== null && c !== undefined) v.set(x, y, z, c);
  }
}
/** A filled disc in the xy plane at depth z (radius r voxels around the centre cx, cy, which may be fractional). */
function disc(v, cx, cy, z, r, c, r0 = -1) {
  for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d <= r && d > r0) v.set(x, y, z, typeof c === 'function' ? c(x, y, d, Math.atan2(y + 0.5 - cy, x + 0.5 - cx)) : c);
  }
}
/** 5x7 bitmap text stamped on the voxels of an xy plane (y up: row 0 of the font is the top). */
function stamp(v, str, x0, yTop, z, c, align = 'left') {
  const w = textW5(str), ox = align === 'center' ? Math.round(x0 - w / 2) : align === 'right' ? x0 - w : x0;
  for (const [i, j] of mask5(str)) v.set(ox + i, yTop - j, z, c);
  return w;
}
/** Two vertical screws heads (2x2 fine look on a 5 mm face: one voxel, cross-slot by colour). */
const screwC = (P) => metal(P[1]);

// ----------------------------------------------------------------------------- print (pixel-art decals, 1 px = 1 mm)
const PRINT_W = 512, PRINT_H = 256;
function printSheet(type, st, spec, L) {
  const p = new Pix(PRINT_W, PRINT_H, 7);
  const rects = {};
  let cx = 0, cy = 0, rowH = 0;
  const place = (name, w, h) => { if (cx + w > PRINT_W) { cx = 0; cy += rowH + 2; rowH = 0; } rects[name] = [cx, cy, w, h]; cx += w + 2; rowH = Math.max(rowH, h); return rects[name]; };
  const headW = Math.round((spec.w * 0.56) * 1000), headH = Math.round(spec.capH * 1000) - 14;
  place('header', headW, headH);
  place('howto', 64, 44);
  place('slot', 46, 11);
  place('chute', 70, 9);
  place('warn', 62, 52);
  place('maker', 54, 20);
  place('coin', 40, 10);
  if (st.stand === 'twotier') place('junbi', 64, 26);
  if (st.stand === 'crate') place('crate', 120, 34);
  const ink = st.dark ? 0xf0dca0 : 0x2a2224, red = 0xc8262c;
  const draw = () => {
    p.fill(0x000000);
    p.rect(0, 0, PRINT_W, PRINT_H, 0, 0);
    for (let i = 0; i < p.d.length; i += 4) p.d[i + 3] = 0;
    p.dirty = true;
    // the header sign: the brand in kana, CAPSULE TOYS and the price band
    {
      const [x, y, w, h] = rects.header;
      const bg = st.band, fg = st.bandInk;
      p.rect(x, y, w, h, bg);
      if (st.stand === 'crate') { p.speckle(0.05, [sh(bg, 0.86), sh(bg, 1.08)], 255, x, y, w, h); }
      p.rect(x, y, w, 1, sh(bg, 1.15)); p.rect(x, y + h - 1, w, 1, sh(bg, 0.7));
      p.text(st.sign, x + 4, y + Math.max(1, (h - 18) >> 1), { size: 16, color: fg, shadow: sh(bg, 0.6) });
      const sw = p.measure(st.sign, 16);
      p.tinyText('CAPSULE TOYS', x + 10 + Math.round(sw), y + Math.max(2, (h >> 1) - 8), { color: fg });
      p.tinyText(`${spec.price}YEN`, x + 10 + Math.round(sw), y + Math.max(2, (h >> 1) + 1), { color: st.dark ? 0xd8b04a : fg });
    }
    // あそびかた: three steps with little pictures (coin, turn the handle, take the capsule)
    {
      const [x, y, w, h] = rects.howto;
      p.rect(x, y, w, h, 0xfbf6e6); p.frame(x, y, w, h, 0x7a7266);
      p.rect(x + 1, y + 1, w - 2, 9, st.band === 0xe8be48 ? 0xc8352a : st.band);
      p.text('あそびかた', x + 4, y - 1, { size: 12, color: 0xfffaf0 });
      const steps = [['1', 'コイン'], ['2', 'まわす'], ['3', 'とる']];
      steps.forEach(([n, s], i) => {
        const yy = y + 12 + i * 10;
        p.rect(x + 3, yy + 1, 7, 7, red); p.tinyText(n, x + 5, yy + 1, { color: 0xffffff });
        p.text(s, x + 13, yy - 2, { size: 10, color: 0x2a2224 });
      });
      // pictures: a coin, a curved arrow, a capsule
      p.circle(x + 52, y + 17, 4, 0xd8b04a); p.circle(x + 52, y + 17, 2, 0xf2d684);
      for (let a = 0; a < 9; a++) { const t = -0.4 + a * 0.5; p.px(x + 52 + Math.round(Math.cos(t) * 4), y + 28 + Math.round(Math.sin(t) * 4), 0x2a2224); }
      p.px(x + 55, y + 31, 0x2a2224); p.px(x + 56, y + 30, 0x2a2224);
      p.circle(x + 52, y + 38, 4, 0x8ac8ff); p.rect(x + 48, y + 38, 9, 4, 0xe85a6a); p.rect(x + 48, y + 38, 9, 1, 0xb8384a);
    }
    // the coin slot's label
    {
      const [x, y, w, h] = rects.slot;
      p.rect(x, y, w, h, st.dark ? 0x1a181c : 0xf8f4ea); p.frame(x, y, w, h, st.dark ? 0xd8b04a : 0x8a8478);
      p.text('100円', x + 3, y - 3, { size: 12, color: st.dark ? 0xe2be5c : red });
      p.tinyText('COIN', x + w - 22, y + 2, { color: st.dark ? 0xb8a878 : 0x5a5450 });
    }
    // the chute's label
    {
      const [x, y, w, h] = rects.chute;
      p.rect(x, y, w, h, st.dark ? 0x1a181c : 0xf8f4ea);
      p.text('とりだしぐち', x + 2, y - 3, { size: 10, color: st.dark ? 0xe2be5c : 0x2a2224 });
      p.px(x + w - 6, y + 3, ink); p.rect(x + w - 7, y + 4, 3, 1, ink); p.rect(x + w - 8, y + 5, 5, 1, ink); // a little arrow down
    }
    // the warning sticker: yellow and black, the age mark, 故障の際は…
    {
      const [x, y, w, h] = rects.warn;
      p.rect(x, y, w, h, 0xf6d84a); p.frame(x, y, w, h, 0x2a2224);
      for (let i = 0; i < w; i += 6) { p.rect(x + i, y + 1, 3, 3, 0x2a2224); p.rect(x + i + 3, y + h - 4, 3, 3, 0x2a2224); }
      p.text('ちゅうい', x + 4, y + 4, { size: 12, color: 0x2a2224 });
      p.tinyText('6+', x + w - 14, y + 7, { color: red });
      p.text('こしょうのさいは', x + 3, y + 18, { size: 10, color: 0x2a2224 });
      p.text('かかりいんまで', x + 3, y + 28, { size: 10, color: 0x2a2224 });
      p.text('ごいんちゅうい', x + 3, y + 38, { size: 10, color: red });
    }
    // the maker's plate: an engraved aluminium tag
    {
      const [x, y, w, h] = rects.maker;
      p.rect(x, y, w, h, 0xc8ccd0); p.frame(x, y, w, h, 0x6a7078); p.speckle(0.08, [0xb4b8bc, 0xdadee2], 255, x + 1, y + 1, w - 2, h - 2);
      p.tinyText('KOTOBUKI', x + 3, y + 2, { color: 0x2a2e34 });
      p.tinyText(st.model, x + 3, y + 11, { color: 0x2a2e34 });
      p.px(x + w - 3, y + 2, 0x4a4e54); p.px(x + w - 3, y + h - 3, 0x4a4e54);
    }
    // the coin box's label
    {
      const [x, y, w, h] = rects.coin;
      p.rect(x, y, w, h, st.dark ? 0x1a181c : 0xf8f4ea); p.frame(x, y, w, h, st.dark ? 0xd8b04a : 0x8a8478);
      p.tinyText('COIN', x + 4, y + 1, { color: st.dark ? 0xe2be5c : 0x2a2224 });
      p.rect(x + w - 10, y + 2, 6, 6, 0xd8b04a); p.px(x + w - 8, y + 4, 0x7a5a1c);
    }
    if (rects.junbi) {
      const [x, y, w, h] = rects.junbi;
      p.rect(x, y, w, h, 0xfbf6e6); p.frame(x, y, w, h, red); p.frame(x + 1, y + 1, w - 2, h - 2, red);
      p.text('じゅんびちゅう', x + 4, y + 2, { size: 10, color: red });
      p.tinyText('CLOSED', x + w / 2, y + 16, { color: 0x2a2224, align: 'center' });
    }
    if (rects.crate) {
      // a stencilled apple crate print, half worn away
      const [x, y, w, h] = rects.crate;
      p.text('青森りんご', x + 4, y + 1, { size: 16, color: 0x9a3024 });
      p.tinyText('AOMORI  APPLES  10KG', x + 4, y + 21, { color: 0x34405a });
      p.circle(x + w - 14, y + 15, 10, 0x9a3024); p.circle(x + w - 14, y + 15, 8, 0xb48a58);
      p.text('〒', x + w - 21, y + 6, { size: 12, color: 0x9a3024 });
      // the wear: random pixels knocked out
      for (let i = 0; i < w * h * 0.25; i++) { const xx = x + Math.floor(Math.random() * w), yy = y + Math.floor(Math.random() * h); p.px(xx, yy, 0, 0); }
    }
    p.flush();
    tex.needsUpdate = true;
  };
  const tex = p.texture();
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  draw();
  try { document.fonts?.load('16px "DotGothic16"', 'あそびかたコインまわすとる円ちゅうい').then(draw, () => {}); } catch { /* no font loading */ }
  void FONT_JP;
  return { tex, rects };
}
/** Quads (x, y, z centre; w, h; facing) mapped to print rects, merged into one geometry. */
function decalGeo(quads, rects) {
  const pos = [], uv = [], nrm = [], idx = [];
  for (const q of quads) {
    const [rx, ry, rw, rh] = rects[q.r];
    const u0 = rx / PRINT_W, u1 = (rx + rw) / PRINT_W, v1 = 1 - ry / PRINT_H, v0 = 1 - (ry + rh) / PRINT_H;
    const w = q.w ?? rw / 1000, h = q.h ?? rh / 1000;
    // the right / up vectors of the face
    const f = q.face || 'pz';
    const rgt = f === 'pz' ? [1, 0, 0] : f === 'nz' ? [-1, 0, 0] : f === 'px' ? [0, 0, -1] : [0, 0, 1];
    const n = f === 'pz' ? [0, 0, 1] : f === 'nz' ? [0, 0, -1] : f === 'px' ? [1, 0, 0] : [-1, 0, 0];
    const b = pos.length / 3;
    for (const [sx, sy, uu, vv] of [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) {
      pos.push(q.x + rgt[0] * sx * w / 2, q.y + sy * h / 2, q.z + rgt[2] * sx * w / 2);
      uv.push(uu, vv); nrm.push(...n);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// ----------------------------------------------------------------------------- stands (5 mm)
function standCrate(v, spec, st) {
  const [X0, X1] = R(-spec.w / 2 - 0.05, spec.w / 2 + 0.05, VB), [Z0, Z1] = R(-spec.d / 2 - 0.035, spec.d / 2 + 0.035, VB), Y1 = Math.round(spec.y0 / VB) - 1;
  const base = 0xb68c58;
  // grain along a board: streaks by row, darker near the ends, the odd knot
  const wood = (along, across, seed, len) => {
    const s = hash(across, seed, 0, 3), streak = hash(Math.floor(along / 7), across, seed, 4);
    let c = sh(base, 0.86 + s * 0.16);
    if (streak < 0.12) c = sh(c, 0.88);
    if ((along + seed * 3) % 23 === 0 && (across & 1)) c = sh(c, 0.8);
    const e = Math.min(along, len - 1 - along);
    if (e < 2) c = sh(c, 0.82);
    if (hash(along, across, seed, 5) < 0.015) c = 0x6a4a2c; // a knot / nail stain
    return enc(c);
  };
  const posts = 3, boards = [[0, 0.17], [0.2, 0.37], [0.4, spec.y0 - 0.025]];
  // the corner posts
  for (const [px, pz] of [[X0, Z0], [X1 - posts + 1, Z0], [X0, Z1 - posts + 1], [X1 - posts + 1, Z1 - posts + 1]]) {
    v.box(px, 0, pz, px + posts - 1, Y1, pz + posts - 1, (x, y, z) => wood(y, x + z * 3, 7, Y1 + 1));
  }
  // side boards: front / back along x, the ends along z, gaps between
  boards.forEach(([a, b], bi) => {
    const [y0, y1] = R(a, b, VB);
    for (const z of [Z0 + posts, Z1 - posts]) v.box(X0, y0, z, X1, y1, z, (x, y) => wood(x - X0, y, bi * 5 + (z > 0 ? 1 : 2), X1 - X0 + 1));
    for (const x of [X0 + posts, X1 - posts]) v.box(x, y0, Z0, x, y1, Z1, (_, y, z) => wood(z - Z0, y, bi * 5 + (x > 0 ? 3 : 4), Z1 - Z0 + 1));
    // nail heads where the boards meet the posts
    for (const x of [X0 + 1, X1 - 1]) for (const yy of [y0 + 3, y1 - 3]) { v.set(x, yy, Z1 - posts + 1 + 2, metal(0x5a5650)); v.set(x, yy, Z0 + posts - 1 - 2, metal(0x5a5650)); }
  });
  // the top boards (the machine stands on these), four planks along x with gaps
  const nB = 4, span = Z1 - Z0 + 1, bw = Math.floor((span - (nB - 1)) / nB);
  for (let i = 0; i < nB; i++) {
    const z0 = Z0 + i * (bw + 1), z1 = i === nB - 1 ? Z1 : z0 + bw - 1;
    v.box(X0, Y1 - 1, z0, X1, Y1, z1, (x, y, z) => wood(x - X0, z, 20 + i, X1 - X0 + 1));
  }
  // a strap of steel band round the top
  return { x0: X0 * VB, x1: (X1 + 1) * VB, z0: Z0 * VB, z1: (Z1 + 1) * VB, front: (Z1 + 1) * VB };
}

function standPedestal(v, spec, st) {
  const Y1 = Math.round(spec.y0 / VB) - 1;
  const [X0, X1] = R(-spec.w / 2 - 0.015, spec.w / 2 + 0.015, VB), [Z0, Z1] = R(-spec.d / 2 - 0.015, spec.d / 2 + 0.015, VB);
  // the foot plate, grey steel, its rubber edge, four levelling feet
  shell(v, X0, 2, Z0, X1, 6, Z1, (x, y, z) => y >= 2 && y <= 6 && inRR(x, z, X0, Z0, X1, Z1, 5),
    (x, y, z, n) => (n === 'py' ? gloss(hash(x, 0, z, 2) < 0.04 ? 0x9a9ca0 : 0x8a8e94) : y <= 2 ? enc(RUBBER) : gloss(0x7a7e84)), 2);
  for (const [fx, fz] of [[X0 + 4, Z0 + 4], [X1 - 4, Z0 + 4], [X0 + 4, Z1 - 4], [X1 - 4, Z1 - 4]]) { v.box(fx - 1, 0, fz - 1, fx + 1, 1, fz + 1, enc(RUBBER)); }
  // the column: moulded in the body colour, a band of trim up the front, the maker's round badge
  const [cX0, cX1] = R(-spec.w * 0.3, spec.w * 0.3, VB), [cZ0, cZ1] = R(-spec.d * 0.3, spec.d * 0.3, VB);
  const top0 = Y1 - 5;
  shell(v, cX0, 7, cZ0, cX1, top0 - 1, cZ1, (x, y, z) => y >= 7 && y < top0 && inRR(x, z, cX0, cZ0, cX1, cZ1, 4), (x, y, z, n) => {
    if (y <= 9) return gloss(st.trim);
    if (n === 'pz' && Math.abs(x + 0.5) <= 1) return gloss(sh(st.trim, 1.05));
    if (n === 'pz' && (x === cX0 + 3 || x === cX1 - 3)) return gloss(st.body2); // the moulding's seams
    return gloss(st.body);
  }, 2);
  // the badge on the front of the column
  const by = Math.round((7 + top0) / 2);
  disc(v, 0, by + 0.5, cZ1 + 1, 6.5, (x, y, d) => gloss(d > 5.4 ? st.trim : d > 4.4 ? 0xf8f6f0 : st.trim));
  stamp(v, 'C', -2, by + 3, cZ1 + 2, gloss(0xf8f6f0));
  // the top plate the machine bolts onto
  const [tX0, tX1] = R(-spec.w / 2 + 0.002, spec.w / 2 - 0.002, VB), [tZ0, tZ1] = R(-spec.d / 2 + 0.002, spec.d / 2 - 0.002, VB);
  shell(v, tX0, top0, tZ0, tX1, Y1, tZ1, (x, y, z) => y >= top0 && y <= Y1 && inRR(x, z, tX0, tZ0, tX1, tZ1, st.round), (x, y, z, n) => (y === top0 ? gloss(st.body2) : gloss(st.trim)), 2);
  return { x0: X0 * VB, x1: (X1 + 1) * VB, z0: Z0 * VB, z1: (Z1 + 1) * VB, front: (Z1 + 1) * VB };
}

function standTwoTier(v, spec, st) {
  const Y1 = Math.round(spec.y0 / VB) - 1;
  const [X0, X1] = R(-spec.w / 2 - 0.012, spec.w / 2 + 0.012, VB), [Z0, Z1] = R(-spec.d / 2 - 0.012, spec.d / 2 + 0.012, VB);
  const steel = (x, y, z) => metal(hash(x, y, z, 6) < 0.05 ? 0x4a4c52 : (y % 11 === 0 ? 0x34363c : 0x3c3e44));
  // the frame: four angle-iron posts, rails low and high, feet
  for (const [px, pz] of [[X0, Z0], [X1 - 2, Z0], [X0, Z1 - 2], [X1 - 2, Z1 - 2]]) {
    v.box(px, 2, pz, px + 2, Y1, pz + 2, steel);
    v.box(px, 0, pz, px + 2, 1, pz + 2, enc(RUBBER));
  }
  for (const y of [6, Y1 - 1]) {
    v.box(X0, y, Z0, X1, y + 1, Z0 + 1, steel); v.box(X0, y, Z1 - 1, X1, y + 1, Z1, steel);
    v.box(X0, y, Z0, X0 + 1, y + 1, Z1, steel); v.box(X1 - 1, y, Z0, X1, y + 1, Z1, steel);
  }
  // the sister unit, shuttered: black body, gold seam, a roller shutter over its window, a dial with no crank
  const [uX0, uX1] = R(-spec.w / 2 + 0.006, spec.w / 2 - 0.006, VB), [uZ0, uZ1] = R(-spec.d / 2 + 0.004, spec.d / 2 - 0.006, VB);
  const uy0 = 8, uy1 = Y1 - 2, split = Math.round(uy0 + (uy1 - uy0) * 0.45);
  shell(v, uX0, uy0, uZ0, uX1, uy1, uZ1, (x, y, z) => y >= uy0 && y <= uy1 && inRR(x, z, uX0, uZ0, uX1, uZ1, 2), (x, y, z, n) => {
    if (n === 'pz' && y > split + 1 && y < uy1 - 2 && x > uX0 + 2 && x < uX1 - 2) {
      // the shutter: ribbed slats
      const r = (y - split) % 3;
      return metal(r === 0 ? 0x3a3c42 : r === 1 ? 0x6a6e74 : 0x565a60);
    }
    if (y === split || y === split + 1) return metal(GOLD[y === split ? 1 : 2]);
    if (n === 'py') return gloss(st.body2);
    return gloss(hash(x, y, z, 3) < 0.03 ? sh(st.body, 1.2) : st.body);
  }, 2);
  // the lower dial plate (no crank: the unit is closed)
  const cy = Math.round(uy0 + (split - uy0) * 0.55);
  disc(v, -3.5, cy + 0.5, uZ1 + 1, 9.5, (x, y, d, a) => (d > 8.6 ? metal(GOLD[2]) : d > 7.6 ? gloss(0x1a191d) : gloss(Math.round((a + Math.PI) / (Math.PI / 6)) % 2 ? 0x242328 : 0x2e2c32)));
  disc(v, -3.5, cy + 0.5, uZ1 + 2, 3.5, metal(GOLD[1]));
  return { x0: X0 * VB, x1: (X1 + 1) * VB, z0: Z0 * VB, z1: (Z1 + 1) * VB, front: (uZ1 + 1) * VB, shutterY: (split + uy1) / 2 * VB, unitFront: (uZ1 + 1) * VB };
}

function standCabinet(v, spec, st) {
  const Y1 = Math.round(spec.y0 / VB) - 1;
  const [X0, X1] = R(-spec.w / 2 - 0.01, spec.w / 2 + 0.01, VB), [Z0, Z1] = R(-spec.d / 2 - 0.01, spec.d / 2 + 0.01, VB);
  const gold = (y, x, z) => shine(GOLD, y, x, z);
  // the kick plate, set back
  shell(v, X0 + 2, 0, Z0 + 2, X1 - 2, 7, Z1 - 2, (x, y, z) => y >= 0 && y <= 7 && x >= X0 + 2 && x <= X1 - 2 && z >= Z0 + 2 && z <= Z1 - 2, () => gloss(0x3a3036), 2);
  // the cabinet: pearl panels framed in gold beading, a medallion, vents on the sides
  const fy0 = 8, fy1 = Y1 - 3;
  shell(v, X0, fy0, Z0, X1, Y1, Z1, (x, y, z) => y >= fy0 && y <= Y1 && inRR(x, z, X0, Z0, X1, Z1, 2), (x, y, z, n) => {
    if (y >= fy1) return gold(y, x, z); // the gold cornice
    if (y <= fy0 + 1) return gloss(sh(st.body, 0.9));
    if (n === 'pz') {
      const ix = x - X0, iy = y - fy0, W = X1 - X0, H = fy1 - fy0;
      const frame = (ix === 4 || ix === W - 4) && iy >= 4 && iy <= H - 4 || (iy === 4 || iy === H - 4) && ix >= 4 && ix <= W - 4;
      if (frame) return gold(y, x, z);
      if (ix > 4 && ix < W - 4 && iy > 4 && iy < H - 4) return gloss(hash(x, y, z, 2) < 0.04 ? sh(st.panel, 0.97) : st.panel);
    }
    if ((n === 'px' || n === 'nx') && y > fy0 + 12 && y < fy0 + 40 && (y % 3 === 0) && z > Z0 + 10 && z < Z1 - 10) return gloss(0x3a3036); // vents
    return gloss(hash(x, y, z, 2) < 0.04 ? sh(st.body, 0.96) : st.body);
  }, 2);
  // the medallion
  const my = Math.round((fy0 + fy1) / 2);
  disc(v, 0, my + 0.5, Z1 + 1, 11.5, (x, y, d) => (d > 10.5 ? metal(GOLD[2]) : d > 9.5 ? metal(GOLD[0]) : gloss(st.trim)));
  disc(v, 0, my + 0.5, Z1 + 2, 6.5, (x, y, d) => (d > 5.5 ? metal(GOLD[3]) : gloss(0xfff4f8)));
  stamp(v, 'G', -2, my + 3, Z1 + 3, gloss(st.trim));
  return { x0: X0 * VB, x1: (X1 + 1) * VB, z0: Z0 * VB, z1: (Z1 + 1) * VB, front: (Z1 + 1) * VB };
}

// ----------------------------------------------------------------------------- the lower unit and the window (5 mm)
function lowerUnit(v, spec, L, st) {
  const [X0, X1] = R(-spec.w / 2, spec.w / 2, VB), [Z0, Z1] = R(-spec.d / 2, spec.d / 2, VB);
  const Y0 = Math.round(spec.y0 / VB), Y1 = Math.round(L.caseY0 / VB) - 1;
  const O = L.outlet, CB = L.coinBox;
  const [oX0, oX1] = R(O.x0, O.x1, VB), [oY0, oY1] = R(O.y0, O.y1, VB);
  const [cX0, cX1] = R(CB.x0 - VF, CB.x1 + VF, VB), [cY0, cY1] = R(CB.y0 - VF, CB.y1 + VF, VB);
  const worn = st.wear >= 1, r = st.round;
  const inOut = (x, y) => x >= oX0 && x <= oX1 && y >= oY0 && y <= oY1;
  const inCoin = (x, y) => x >= cX0 && x <= cX1 && y >= cY0 && y <= cY1;
  const inside = (x, y, z) => y >= Y0 && y <= Y1 && inRR(x, z, X0, Z0, X1, Z1, r) && !(z > Z1 - 3 && (inOut(x, y) || inCoin(x, y)));
  const bandTop = 3, bandBot = st.stand === 'crate' ? 1 : 3;
  shell(v, X0, Y0, Z0, X1, Y1, Z1, inside, (x, y, z, n) => {
    const h = hash(x, y, z, 1);
    const front = n === 'pz' || (z >= Z1 - 1 && n !== 'px' && n !== 'nx');
    // the top band (the stacking rail) and the foot band
    if (y > Y1 - bandTop) return st.gold ? shine(GOLD, y, x, z) : st.chrome ? shine(CHROME, y, x, z) : gloss(y === Y1 ? sh(st.band, 1.08) : st.band);
    if (y < Y0 + bandBot) return gloss(st.stand === 'crate' ? sh(st.body, 0.7) : st.body2);
    if (front) {
      // the front panel: a moulding inset two blocks from the edge, its seam, screws in the corners
      const ix = x - X0, W = X1 - X0, iy = y - Y0, H = Y1 - Y0;
      const edge = ix <= 1 || ix >= W - 1;
      if (edge) return gloss(worn ? st.body : st.body2);
      if (ix === 2 || ix === W - 2 || iy === bandBot) return gloss(sh(st.panel, 0.84)); // the seam
      if ((ix === 4 || ix === W - 4) && (iy === bandBot + 2 || iy === H - bandTop - 2)) return metal(0xb8bec4); // screws
      let c = h < 0.015 ? st.panel2 : st.panel;
      if (worn) {
        // decades of hands: grime low down and round the chute, a few chips at the moulding, a yellowed patch
        if (iy < 12 && h < 0.35) c = mixc(c, 0x8a7a5c, 0.2 + (12 - iy) * 0.02);
        if ((ix <= 4 || ix >= W - 4) && h > 0.93) c = 0x9a948a;
        if (hash(x >> 3, y >> 3, 0, 8) > 0.8) c = mixc(c, 0xc8b480, 0.18);
      }
      return worn ? enc(c) : gloss(c);
    }
    // sides and back
    let c = st.body;
    if (n === 'py') c = st.gold ? 0x2b2a2f : sh(st.body, 0.95);
    if (h < 0.015) c = sh(c, 0.96);
    if (worn) {
      // wear where hands and knocks land: chips along the corners and the top, rust blooming out of the chips,
      // grime along the foot
      const corner = n === 'px' || n === 'nx' ? Math.min(z - Z0, Z1 - z) : n === 'nz' ? Math.min(x - X0, X1 - x) : 9, top = Y1 - bandTop - y;
      const near = corner <= 2 || top <= 2;
      if (near && h > 0.9 && hash(x >> 1, y >> 1, z >> 1, 11) > 0.5) c = h > 0.96 ? 0x7a7a74 : 0xd8ccb0; // a chip: primer, or bare steel
      const bloom = hash(x >> 2, y >> 2, z >> 2, 4);
      if (bloom > 0.94 && hash(x, y, z, 6) < 0.6) c = mixc(c, 0x6a3a22, 0.4 + 0.4 * hash(x, y, z, 8));
      if (y - Y0 < 8 && hash(x, y, z, 5) < 0.4) c = mixc(c, 0x4a3a2a, 0.25 + (8 - y + Y0) * 0.03);
      if (h > 0.6 && h < 0.63) c = sh(c, 1.06); // the odd brighter block: old enamel catching the light
    }
    // carry grips (recessed slots) on the sides, vents on the back
    if ((n === 'px' || n === 'nx') && Math.abs(y - (Y0 + Y1) / 2 - 8) <= 1 && Math.abs(z) <= 8) return enc(HOLE);
    if (n === 'nz' && y > Y0 + 10 && y < Y0 + 30 && (y % 3 === 0) && Math.abs(x) < 20) return enc(HOLE);
    return worn ? enc(c) : gloss(c);
  }, 2);
  // the chute: a dark tunnel back from the opening, its floor sloping down to the front
  const depth = Math.round(0.14 / VB);
  for (let x = oX0 - 1; x <= oX1 + 1; x++) for (let y = oY0 - 1; y <= oY1 + 1; y++) for (let z = Z1 - depth; z <= Z1; z++) {
    const wall = x === oX0 - 1 || x === oX1 + 1 || y === oY0 - 1 || y === oY1 + 1 || z === Z1 - depth;
    if (wall) v.set(x, y, z, enc(z === Z1 - depth ? 0x18161a : sh(0x2a272b, 0.8 + 0.2 * (z - Z1 + depth) / depth)));
    else if (z >= Z1 - 1) v.remove(x, y, z);
  }
  // the coin box's housing: dark, deep enough for the drawer to slide back into
  const cd = Math.round((CB.depth + 0.01) / VB);
  for (let x = cX0 - 1; x <= cX1 + 1; x++) for (let y = cY0 - 1; y <= cY1 + 1; y++) for (let z = Z1 - cd; z <= Z1; z++) {
    const wall = x === cX0 - 1 || x === cX1 + 1 || y === cY0 - 1 || y === cY1 + 1 || z === Z1 - cd;
    if (wall) v.set(x, y, z, enc(0x1a181c));
    else if (z >= Z1 - 1) v.remove(x, y, z);
  }
  // the window's floor (a drum disc the capsules sit on) is the unit's top: inside the window it is the inner colour
  const W = L.window, [wX0, wX1] = R(W.x0, W.x1, VB), [wZ0, wZ1] = R(W.z0, W.z1, VB);
  for (let x = wX0; x <= wX1; x++) for (let z = wZ0; z <= wZ1; z++) {
    const d = Math.hypot(x + 0.5, (z + 0.5 - (wZ0 + wZ1 + 1) / 2) * 1.2);
    const rim = Math.min(wX1 - wX0, wZ1 - wZ0) * 0.42;
    v.set(x, Y1, z, gloss(d < rim - 1 ? (Math.round(Math.atan2(z, x) * 4) % 2 ? sh(st.inner, 0.9) : sh(st.inner, 0.84)) : d < rim ? STEEL : st.inner));
  }
}

function windowFrame(v, spec, L, st) {
  const [X0, X1] = R(-spec.w / 2, spec.w / 2, VB), [Z0, Z1] = R(-spec.d / 2, spec.d / 2, VB);
  const Y0 = Math.round(L.caseY0 / VB), Y1 = Math.round((L.caseY0 + spec.caseH) / VB) - 1;
  const post = 3, back = Math.round(0.02 / VB);
  const frameC = (x, y, z) => (st.gold ? shine(GOLD, y, x, z) : st.stand === 'crate' ? enc(hash(x, y, z, 3) < 0.03 ? 0xd8ccb0 : st.body) : gloss(st.body));
  // the four corner posts (rounded like the unit below)
  for (const [px0, pz0] of [[X0, Z0], [X1 - post + 1, Z0], [X0, Z1 - post + 1], [X1 - post + 1, Z1 - post + 1]]) {
    for (let x = px0; x < px0 + post; x++) for (let z = pz0; z < pz0 + post; z++) if (inRR(x, z, X0, Z0, X1, Z1, st.round)) v.box(x, Y0, z, x, Y1, z, frameC);
  }
  // the top rim round the opening, two blocks
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    if (!inRR(x, z, X0, Z0, X1, Z1, st.round)) continue;
    const edge = x < X0 + post || x > X1 - post || z < Z0 + post || z > Z1 - post;
    if (edge) { v.set(x, Y1, z, frameC(x, Y1, z)); v.set(x, Y1 - 1, z, frameC(x, Y1 - 1, z)); }
  }
  // the back wall, printed inside: the series-neutral backing board with a soft pattern
  for (let x = X0 + 1; x <= X1 - 1; x++) for (let y = Y0; y <= Y1 - 2; y++) for (let z = Z0; z < Z0 + back; z++) {
    if (!inRR(x, z, X0, Z0, X1, Z1, st.round)) continue;
    if (z === Z0 + back - 1) {
      const dots = ((x + 64) % 6 === 0 && (y % 6 === 0)) || ((x + 67) % 6 === 0 && ((y + 3) % 6 === 0));
      v.set(x, y, z, gloss(dots ? sh(st.inner, 0.9) : st.inner));
    } else if (z === Z0) v.set(x, y, z, frameC(x, y, z));
  }
}

// ----------------------------------------------------------------------------- the fine parts on the front (2.5 mm)
function frontFine(v, spec, L, st) {
  const fz = Math.round(L.front / VF); // the first block proud of the face
  const P = st.gold ? GOLD : CHROME;
  const H = L.handle, ring = spec.dial.ring, knob = spec.dial.knob;
  const hx = H.x / VF, hy = H.y / VF;
  // the dial plate: printed ring with arrows round the crank, a dark rim, then the chrome bezel the crank turns in
  const rr = ring / VF, kr = knob / VF;
  disc(v, hx, hy, fz, rr, (x, y, d, a) => {
    if (d > rr - 1.2) return gloss(st.dialEdge);
    if (d > kr + 3) {
      // arrows (chevrons pointing clockwise) every 45 degrees, and the tick marks
      const seg = ((a + Math.PI * 2) % (Math.PI / 4)) / (Math.PI / 4);
      const band = (d - kr - 3) / (rr - 1.2 - kr - 3);
      if (seg > 0.35 && seg < 0.65 && Math.abs(band - 0.5 - (seg - 0.5) * 0.9) < 0.22) return gloss(0xfaf6ec);
      if (Math.abs(band - 0.5) < 0.12 && hash(Math.round(a * 20), 0, 0, 2) < 0.5) return gloss(sh(st.dial, 1.15));
      return gloss(st.dial);
    }
    return gloss(sh(st.dial, 0.7));
  });
  disc(v, hx, hy, fz + 1, kr + 3.6, (x, y, d) => shine(P, y, x, fz), kr + 1.6);
  // the coin mech: a raised chrome plate, the slot (a dark slit), the return button, a reject lever
  const S = L.slot, sx = S.x / VF, sy = S.y / VF;
  const mx0 = Math.round(sx - 11), mx1 = Math.round(sx + 10), my0 = Math.round(sy - 14), my1 = Math.round(sy + 13);
  for (let x = mx0; x <= mx1; x++) for (let y = my0; y <= my1; y++) {
    const edge = x === mx0 || x === mx1 || y === my0 || y === my1;
    v.set(x, y, fz, shine(P, y, x, fz));
    if (!edge) v.set(x, y, fz + 1, shine(P, y + 1, x, fz + 1));
  }
  for (let y = Math.round(sy - 5); y <= Math.round(sy + 6); y++) for (let x = Math.round(sx - 1); x <= Math.round(sx); x++) { v.set(x, y, fz + 1, enc(HOLE)); v.set(x, y, fz, enc(HOLE)); }
  // the slot's bevel: darker chrome round the slit
  for (let y = Math.round(sy - 6); y <= Math.round(sy + 7); y++) for (const x of [Math.round(sx - 2), Math.round(sx + 1)]) v.set(x, y, fz + 1, metal(P[0]));
  // return button
  const ry = Math.round(sy - 10);
  v.box(Math.round(sx - 3), ry - 1, fz + 2, Math.round(sx + 2), ry + 1, fz + 2, metal(P[2]));
  v.box(Math.round(sx - 2), ry, fz + 3, Math.round(sx + 1), ry, fz + 3, metal(P[3]));
  // screws in the plate's corners
  for (const [x, y] of [[mx0 + 1, my0 + 1], [mx1 - 1, my0 + 1], [mx0 + 1, my1 - 1], [mx1 - 1, my1 - 1]]) v.set(x, y, fz + 2, metal(P[0]));
  // the price plate's bezel (the plate itself is a live texture just inside it)
  const PL = L.plate, px0 = Math.round((PL.x - PL.w / 2) / VF) - 2, px1 = Math.round((PL.x + PL.w / 2) / VF) + 1, py0 = Math.round((PL.y - PL.h / 2) / VF) - 2, py1 = Math.round((PL.y + PL.h / 2) / VF) + 1;
  for (let x = px0; x <= px1; x++) for (let y = py0; y <= py1; y++) {
    const e2 = x <= px0 + 1 || x >= px1 - 1 || y <= py0 + 1 || y >= py1 - 1;
    if (!e2) continue;
    v.set(x, y, fz, shine(P, y, x, fz));
    if (x === px0 || x === px1 || y === py0 || y === py1) v.set(x, y, fz + 1, shine(P, y + 2, x, fz + 1));
  }
  // the buttons' collars
  for (const dx of [-1, 1]) disc(v, (PL.x + dx * L.buttons.dx) / VF, L.buttons.y / VF, fz, 4.6, (x, y, d) => metal(d > 3.6 ? P[1] : P[0]));
  // the chute's lip: a chrome frame round the opening, a hinge pin for the flap
  const O = L.outlet, ox0 = Math.round(O.x0 / VF) - 2, ox1 = Math.round(O.x1 / VF) + 1, oy0 = Math.round(O.y0 / VF) - 2, oy1 = Math.round(O.y1 / VF) + 1;
  for (let x = ox0; x <= ox1; x++) for (let y = oy0; y <= oy1; y++) {
    if (x > ox0 + 1 && x < ox1 - 1 && y > oy0 + 1 && y < oy1 - 1) continue;
    v.set(x, y, fz, shine(P, y, x, fz));
  }
  for (let x = ox0 + 2; x <= ox1 - 2; x++) v.set(x, oy1 - 2, fz, metal(P[2]));
  // the coin box's frame (a thin dark-chrome line round the drawer)
  const CB = L.coinBox, bx0 = Math.round(CB.x0 / VF) - 2, bx1 = Math.round(CB.x1 / VF) + 1, by0 = Math.round(CB.y0 / VF) - 2, by1 = Math.round(CB.y1 / VF) + 1;
  for (let x = bx0; x <= bx1; x++) for (let y = by0; y <= by1; y++) if (x === bx0 || x === bx1 || y === by0 || y === by1) v.set(x, y, fz, metal(P[0]));
  // the rope's hook on the right side: a plate and a bent rod
  const K = L.hook, kx = Math.round(spec.w / 2 / VF), ky = Math.round(K.y / VF), kz = Math.round(K.z / VF);
  v.box(kx, ky - 4, kz - 3, kx, ky + 3, kz + 2, metal(P[1]));
  v.set(kx, ky - 3, kz - 2, metal(P[0])); v.set(kx, ky + 2, kz + 1, metal(P[0]));
  for (let i = 1; i <= 4; i++) v.set(kx + i, ky + 1, kz, metal(P[2]));
  v.set(kx + 4, ky + 2, kz, metal(P[3])); v.set(kx + 4, ky + 3, kz, metal(P[2]));
  // the display card's rails, behind the glass
  const B = L.banner, bz = Math.round(B.z / VF) - 1;
  for (const s of [-1, 1]) {
    const x = Math.round((B.x + s * (B.w / 2 + 0.002)) / VF) + (s < 0 ? -1 : 0);
    for (let y = Math.round((B.y - B.h / 2) / VF); y <= Math.round((B.y + B.h / 2) / VF); y++) { v.set(x, y, bz, metal(P[1])); v.set(x, y, bz - 1, metal(P[0])); }
  }
  for (let x = Math.round((B.x - B.w / 2) / VF) - 1; x <= Math.round((B.x + B.w / 2) / VF); x++) v.set(x, Math.round((B.y - B.h / 2) / VF) - 1, bz, metal(P[1]));
}

// ----------------------------------------------------------------------------- moving parts (2.5 mm, own origin)
function lidModel(spec, L, st) {
  const v = new VoxelModel();
  v.jitter = 0;
  const [X0, X1] = R(-spec.w / 2, spec.w / 2, VF), [Z0, Z1] = R(-spec.d / 2 - VB, spec.d / 2 + VF, VF), Y1 = Math.round(spec.capH / VF) - 1;
  const P = st.gold ? GOLD : CHROME, r = st.round * 2, worn = st.wear >= 1;
  shell(v, X0, 0, Z0, X1, Y1, Z1, (x, y, z) => y >= 0 && y <= Y1 && inRR(x, z, X0, Z0, X1, Z1, r), (x, y, z, n) => {
    const h = hash(x, y, z, 7);
    if (y === 0) return gloss(sh(st.body2, 0.9)); // the seam under the lid
    if (n === 'py') {
      // the top: a moulded rim round a recessed panel (where a display top sits)
      const ix = Math.min(x - X0, X1 - x), iz = Math.min(z - Z0, Z1 - z);
      if (Math.min(ix, iz) <= 2) return st.gold ? shine(P, x, x, z) : gloss(sh(st.header, 1.06));
      if (Math.min(ix, iz) === 3) return gloss(sh(st.header, 0.82));
      let c = st.dark ? 0x232227 : sh(st.body, 0.97);
      if (worn && h > 0.97) c = 0x9a8e78;
      return worn ? enc(c) : gloss(h < 0.04 ? sh(c, 0.96) : c);
    }
    if (n === 'pz' || n === 'nx' || n === 'px') {
      // the header band
      if (y === Y1 || y === 1) return st.gold ? shine(P, y, x, z) : gloss(sh(st.band, y === 1 ? 0.8 : 1.1));
      let c = st.band;
      if (worn && h > 0.975) c = 0x8a8a84;
      return worn ? enc(c) : gloss(c);
    }
    return gloss(st.body2);
  }, 2);
  // the lock on the front: a chrome escutcheon with the keyhole
  const lx = L.lid.lockX / VF, ly = spec.capH / 2 / VF;
  disc(v, lx, ly, Z1 + 1, 4.5, (x, y, d) => shine(P, y, x, 0));
  v.set(Math.floor(lx), Math.floor(ly), Z1 + 2, enc(HOLE)); v.set(Math.floor(lx), Math.floor(ly) - 1, Z1 + 2, enc(HOLE));
  disc(v, lx, ly, Z1 + 2, 3.2, (x, y, d) => (d < 1.2 ? enc(HOLE) : metal(P[2])), 0.9);
  // the hinges at the back
  for (const hx of [X0 + 10, X1 - 14]) v.box(hx, 1, Z0 - 2, hx + 4, 4, Z0 - 1, (x, y) => shine(P, y + 2, x, 0));
  return v;
}

function handleModel(spec, st) {
  const v = new VoxelModel();
  v.jitter = 0;
  const kr = spec.dial.knob / VF, P = st.gold ? GOLD : CHROME;
  // the knob: a disc in the knob colour with a trim ring, three blocks deep; the grip bar across it; a chrome cap
  for (let z = -2; z <= 0; z++) disc(v, 0, 0, z, kr, (x, y, d) => (d > kr - 1.6 ? gloss(z === 0 ? sh(st.grip, 1.05) : sh(st.grip, 0.8)) : gloss(z === 0 ? st.knob : sh(st.knob, 0.86))));
  // ribs on the rim (the grip you turn with)
  for (let a = 0; a < 24; a++) { const t = (a / 24) * Math.PI * 2; v.set(Math.round(Math.cos(t) * (kr - 0.5) - 0.5), Math.round(Math.sin(t) * (kr - 0.5) - 0.5), 1, gloss(sh(st.grip, 0.9))); }
  const bw = Math.max(3, Math.round(kr * 0.34)), bl = Math.round(kr * 0.9);
  for (let y = -bl; y < bl; y++) for (let x = -bw; x < bw; x++) {
    const top = Math.abs(y + 0.5) < bl - 1.5;
    for (let z = 1; z <= (top ? 5 : 4); z++) {
      const edge = x === -bw || x === bw - 1;
      v.set(x, y, z, gloss(z === (top ? 5 : 4) ? (edge ? sh(st.grip, 0.85) : sh(st.grip, 1.08)) : edge ? sh(st.grip, 0.7) : st.grip));
    }
  }
  // the arrow on the grip, pointing round (white)
  for (let i = 0; i < 4; i++) { v.set(-1, bl - 4 - i, 6, gloss(0xfaf6ec)); v.set(0, bl - 4 - i, 6, gloss(0xfaf6ec)); }
  v.set(-2, bl - 5, 6, gloss(0xfaf6ec)); v.set(1, bl - 5, 6, gloss(0xfaf6ec));
  disc(v, 0, 0, 6, 2.6, (x, y) => shine(P, y + 3, x, 0));
  return v;
}

function drawerModel(L, st) {
  const v = new VoxelModel();
  v.jitter = 0;
  const CB = L.coinBox, W = Math.round((CB.x1 - CB.x0) / VF), Hh = Math.round((CB.y1 - CB.y0) / VF), D = Math.round(CB.depth / VF);
  const P = st.gold ? GOLD : CHROME;
  // the tray behind: a steel box, open at the top
  for (let x = 0; x < W; x++) for (let y = 0; y < Hh - 2; y++) for (let z = -D; z < 0; z++) {
    const wall = x === 0 || x === W - 1 || y === 0 || z === -D;
    if (wall) v.set(x, y, z, metal(y === 0 ? 0x5a5e64 : 0x7a7e84));
  }
  // the front panel, proud by a block: the body colour, the keyhole, a pull lip
  for (let x = 0; x < W; x++) for (let y = 0; y < Hh; y++) for (let z = 0; z <= 1; z++) {
    const e = x === 0 || x === W - 1 || y === 0 || y === Hh - 1;
    v.set(x, y, z, st.gold ? (e ? shine(GOLD, y, x, z) : gloss(st.panel)) : gloss(e ? sh(st.panel, 0.86) : st.panel));
  }
  const kx = Math.round(W * 0.7), ky = Math.round(Hh * 0.62);
  disc(v, kx, ky, 2, 3.2, (x, y) => shine(P, y, x, 0));
  v.set(kx, ky, 3, enc(HOLE)); v.set(kx, ky - 1, 3, enc(HOLE)); v.set(kx - 1, ky, 3, metal(P[0]));
  for (let x = 3; x < W - 3; x++) v.set(x, 2, 2, metal(P[1]));
  return v;
}

function flapModel(L, st) {
  const v = new VoxelModel();
  v.jitter = 0;
  const O = L.outlet, W = Math.round((O.x1 - O.x0) / VF), Hh = Math.round((O.y1 - O.y0 - VB) / VF);
  const steel = st.flap === 'steel';
  for (let x = 0; x < W; x++) for (let y = -Hh; y < 0; y++) {
    const e = x === 0 || x === W - 1 || y === -Hh;
    if (steel) v.set(x - (W >> 1), y, 0, metal(e ? 0x8a9096 : (y + x) % 9 === 0 ? 0xa8aeb4 : 0x9aa0a6));
    else v.set(x - (W >> 1), y, 0, e ? gloss(0x2a2a2e) : glass(0x3a3a44));
  }
  // the hinge's barrel along the top
  for (let x = 0; x < W; x++) v.set(x - (W >> 1), 0, 0, metal(CHROME[2]));
  if (steel) for (let x = 4; x < W - 4; x++) v.set(x - (W >> 1), -Hh + 3, 1, metal(CHROME[1])); // the pull lip
  return v;
}

function buttonModel(color, plus) {
  const v = new VoxelModel();
  v.jitter = 0;
  for (let z = 1; z <= 2; z++) disc(v, 0, 0, z, 3.2, (x, y, d) => gloss(z === 2 ? (d > 2.4 ? sh(color, 0.85) : color) : sh(color, 0.7)));
  // the sign, pressed into the cap
  const W = gloss(0xfaf6ec);
  for (const x of [-2, -1, 0, 1]) v.set(x, 0, 2, W);
  if (plus) for (const y of [-2, -1, 1]) { v.set(-1, y, 2, W); v.set(0, y, 2, W); }
  return v;
}

function trayModel(L, st) {
  // the cup the capsule drops into (static, in the body), at 2.5 mm: lip, walls, a rubber mat
  const v = new VoxelModel();
  v.jitter = 0;
  const T = L.tray, [X0, X1] = R(T.x0, T.x1, VF), [Z0, Z1] = R(T.z0, T.z1, VF), Yf = Math.round(T.y / VF);
  const Yw = Math.round((T.y + T.wall) / VF), Yl = Math.round((T.y + T.wall * 0.8) / VF);
  const P = st.gold ? GOLD : CHROME;
  const plastic = st.stand !== 'crate';
  const body = (x, y, z) => (plastic ? gloss(y >= Yl - 1 ? sh(st.trim, 1.0) : st.body) : shine(P, y, x, z));
  for (let x = X0 - 2; x <= X1 + 2; x++) for (let z = Z0; z <= Z1 + 2; z++) {
    // the floor (the top block is the rubber mat)
    for (let y = Yf - 4; y < Yf; y++) {
      const mat = y === Yf - 1 && x >= X0 && x <= X1 && z <= Z1;
      v.set(x, y, z, mat ? enc((x + z) % 4 === 0 ? 0x2e2c30 : RUBBER) : body(x, y, z));
    }
    // side walls
    if (x < X0 || x > X1) for (let y = Yf; y < Yw; y++) v.set(x, y, z, body(x, y, z));
    // the front lip
    if (z > Z1) for (let y = Yf; y < Yl; y++) v.set(x, y, z, body(x, y, z));
  }
  return v;
}

// ----------------------------------------------------------------------------- glass (low poly)
function boxGeo(list) {
  const geos = list.map(([x0, y0, z0, x1, y1, z1]) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; });
  const pos = [], nrm = [], idx = [];
  let base = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array);
    for (const i of g.index.array) idx.push(i + base);
    base += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.setIndex(idx);
  return out;
}

// ----------------------------------------------------------------------------- assembly
/** A voxel model stored shifted down by oy blocks (a VoxelModel holds coordinates within +-511 only). */
class Shifted extends VoxelModel {
  constructor(oy) { super(); this.oy = oy; this.jitter = 0; }
  set(x, y, z, c) { return super.set(x, Math.round(y) - this.oy, z, c); }
}
const cache = new Map();
const mesh = (v, s, texel = 2) => meshVoxels(v, { voxelSize: s, origin: 'none', surf: 'auto', texel });
/**
 * The parts of a machine type. Returns { geo: { body, glass, lid, lidPrint, bodyPrint, drawer, handle, flap,
 * btnMinus, btnPlus, pawl, knob, flapClear }, mats: { body (voxel material array), glass, print }, stand }.
 */
export function voxelMachineParts(type, spec, L) {
  if (cache.has(type)) return cache.get(type);
  const st = STYLES[type];
  // static, 5 mm
  const B = new VoxelModel();
  B.jitter = 0;
  const stand = st.stand === 'crate' ? standCrate(B, spec, st) : st.stand === 'pedestal' ? standPedestal(B, spec, st) : st.stand === 'twotier' ? standTwoTier(B, spec, st) : standCabinet(B, spec, st);
  lowerUnit(B, spec, L, st);
  windowFrame(B, spec, L, st);
  // static, 2.5 mm
  const oy = Math.round(spec.y0 / VF), up = new THREE.Matrix4().makeTranslation(0, oy * VF, 0);
  const F = new Shifted(oy);
  frontFine(F, spec, L, st);
  const T = trayModel(L, st);
  const body = mergeByMaterial([{ geometry: mesh(B, VB) }, { geometry: mesh(F, VF), matrix: up }, { geometry: mesh(T, VF) }]);
  // the window's clear plastic: front, sides and the inner divider are thin panes
  const fz = spec.d / 2, hw = spec.w / 2, gy0 = L.caseY0, gy1 = L.caseY0 + spec.caseH - 2 * VB, t = 0.002, p = 3 * VB;
  const glassGeo = boxGeo([
    [-hw + p - 0.002, gy0, fz - 0.006, hw - p + 0.002, gy1, fz - 0.006 + t],
    [-hw + 0.003, gy0, -fz + 0.02, -hw + 0.003 + t, gy1, fz - p],
    [hw - 0.003 - t, gy0, -fz + 0.02, hw - 0.003, gy1, fz - p],
  ]);
  // the print
  const S = printSheet(type, st, spec, L);
  const O = L.outlet, PL = L.plate, CB = L.coinBox, eps = 0.0007;
  const quads = [
    { r: 'howto', x: Math.max(-hw + 0.04, O.x0 - 0.045), y: spec.y0 + (O.y0 + O.y1) / 2 - spec.y0 + 0.004, z: fz + eps },
    { r: 'slot', x: L.slot.x, y: L.slot.y + 0.044, z: fz + eps },
    { r: 'chute', x: 0, y: O.y1 + 0.011, z: fz + eps },
    { r: 'warn', x: -hw - eps, y: spec.y0 + spec.lowH * 0.45, z: -0.08, face: 'nx' },
    { r: 'maker', x: -hw - eps, y: spec.y0 + spec.lowH * 0.22, z: -0.04, face: 'nx' },
  ];
  if (st.stand === 'twotier') quads.push({ r: 'junbi', x: 0.04, y: stand.shutterY, z: stand.unitFront + eps });
  if (st.stand === 'crate') quads.push({ r: 'crate', x: 0, y: 0.29, z: stand.front - VB * 3 + VB + eps, w: 0.24, h: 0.068 });
  const bodyPrint = decalGeo(quads, S.rects);
  const lidPrint = decalGeo([{ r: 'header', x: -hw + 0.008 + (spec.w * 0.56) / 2, y: spec.capH / 2, z: fz + VF + eps }], S.rects);
  const drawerPrint = decalGeo([{ r: 'coin', x: (CB.x1 - CB.x0) * 0.32, y: (CB.y1 - CB.y0) * 0.36, z: 2 * VF + eps, w: Math.min(0.04, (CB.x1 - CB.x0) * 0.5), h: 0.01 }], S.rects);
  const printMat = new THREE.MeshStandardMaterial({ map: S.tex, transparent: true, alphaTest: 0.5, roughness: 0.62, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xf6fbff, transparent: true, opacity: 0.1, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2 });
  const pawl = new VoxelModel(); pawl.jitter = 0;
  pawl.box(-1, -1, 0, 1, 2, 1, metal(CHROME[1])); pawl.set(0, 3, 1, metal(CHROME[3]));
  const out = {
    geo: {
      body, glass: glassGeo, lid: mesh(lidModel(spec, L, st), VF), lidPrint, bodyPrint, drawerPrint,
      drawer: mesh(drawerModel(L, st), VF), handle: mesh(handleModel(spec, st), VF), flap: mesh(flapModel(L, st), VF),
      btnMinus: mesh(buttonModel(0xd8463e, false), VF), btnPlus: mesh(buttonModel(0x3e9e58, true), VF),
      pawl: mesh(pawl, VF), knob: spec.dial.knob, flapClear: st.flap !== 'steel',
    },
    mats: { body: voxelMaterials('normal'), glass: glassMat, print: printMat },
    stand, style: st,
  };
  cache.set(type, out);
  return out;
}
void MAT; void glow;
