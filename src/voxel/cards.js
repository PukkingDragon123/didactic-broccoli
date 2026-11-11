// 2D pixel-art cards on voxel models: hand-pixelled sprigs from the foliage sheet (public/img/foliage.png, baked by
// tools/bake-foliage.mjs from the leaf sheet drawn in the low-poly phase; the art is kept, adapted to the voxel world)
// set on a model's leafy voxels, so a blocky crown keeps its silhouette and gains crisp leaves, blossom and blades.
//
//   leafCards(model, { kind, density, size, match, seed, mix })  scatter cards over the model's leafy surface voxels
//       kind: a CELLS name; match(colour, mat) -> bool picks the voxels (default: greens); size: card metres (default
//       the cell's); density 0..1 per surface voxel; mix: [kind2, share] for a second sprig (flowers in a hedge)
//   model.cards = [{ x, y, z (voxel units, the foot), kind, size (m), up: [x,y,z], side: [x,y,z], n: [x,y,z], shade }]
//   The mesher (mesher.js) turns them into material group 5 (CARD) with uv in 'vdet'.
//   leafTexture() / cardMaterial(): the sheet (nearest up close, the baked coverage-preserving mips at a distance).
import * as THREE from 'three';

export const SW = 2048, SH = 1024, CS = 256;
// name: [col, row, card size in metres, core tone]
export const CELLS = {
  kaname: [0, 0, 0.34, 0x2a4626], kanameRed: [1, 0, 0.34, 0x2a4626], azalea: [2, 0, 0.32, 0x2c4828], small: [3, 0, 0.28, 0x2e4c28],
  pine: [4, 0, 0.4, 0x1e3626], pineTop: [5, 0, 0.42, 0x1e3626], blossom: [6, 0, 0.5, 0xd4a2b2], blossom2: [7, 0, 0.5, 0xd4a2b2],
  maple: [0, 1, 0.4, 0x2c4a24], mapleRed: [1, 1, 0.4, 0x6a2a20], camellia: [2, 1, 0.4, 0x16301e], hydrangea: [3, 1, 0.5, 0x2a4a24],
  hydrangeaFlower: [4, 1, 0.42, 0x4a5a8a], asagao: [5, 1, 0.42, 0x28462a], bamboo: [6, 1, 0.55, 0x2e5226], ivy: [7, 1, 0.3, 0x243e22],
  grass: [0, 2, 0.42, 0x34542a], weeds: [1, 2, 0.4, 0x34542a], pelargonium: [2, 2, 0.34, 0x2a4a26], tomato: [3, 2, 0.36, 0x2a4a24],
  pothos: [4, 2, 0.36, 0x264826], broad: [5, 2, 0.42, 0x244424], keyaki: [6, 2, 0.4, 0x2c4a24], moss: [7, 2, 0.3, 0x3a5426],
  monstera: [0, 3, 0.5, 0x1c3a22], fern: [1, 3, 0.45, 0x284a24], petals: [2, 3, 0.6, 0xe0b8c4], litter: [3, 3, 0.6, 0x6a5a40],
  pansy: [4, 3, 0.3, 0x2c4a26], sprout: [5, 3, 0.2, 0x3a5a2a], aloe: [6, 3, 0.3, 0x4a6a4a], candle: [7, 3, 0.4, 0x1e3626],
};

/** Where mip level k sits in the baked sheet: level 0 at the origin, the rest down a column on its right. */
function MIP_AT(k) {
  if (k === 0) return [0, 0];
  let y = 0;
  for (let i = 1; i < k; i++) y += Math.max(1, SH >> i);
  return [SW, y];
}

let TEX = null;
export function leafTexture() {
  if (TEX) return TEX;
  // transparent levels the sheet's size until it has loaded (the storage keeps its size; cards are cut away meanwhile)
  const lv0 = [];
  for (let k = 0, n = Math.log2(Math.max(SW, SH)) + 1; k < n; k++) {
    const c = document.createElement('canvas'); c.width = Math.max(1, SW >> k); c.height = Math.max(1, SH >> k); lv0.push(c);
  }
  const t = new THREE.Texture(lv0[0]);
  t.mipmaps = lv0; t.generateMipmaps = false;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.premultiplyAlpha = false;
  t.needsUpdate = true;
  TEX = t;
  const img = new Image();
  img.onload = async () => {
    try {
      const o = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }, lv = [];
      for (let k = 0, n = Math.log2(Math.max(SW, SH)) + 1; k < n; k++) {
        const [x, y] = MIP_AT(k), w = Math.max(1, SW >> k), h = Math.max(1, SH >> k);
        lv.push(await createImageBitmap(img, x, y, w, h, o));
      }
      t.image = lv[0];
      t.mipmaps = lv;
      t.generateMipmaps = false;
      t.needsUpdate = true;
    } catch (e) { console.warn('cards: could not read the foliage sheet', e); }
  };
  img.onerror = () => console.warn('cards: could not load img/foliage.png');
  img.src = new URL('img/foliage.png', document.baseURI).href;
  return t;
}

/** uv rectangle [u0, vFoot, u1, vTip] of a cell (rows top-down, uploaded unflipped). */
export function cellUV(name) {
  const [c, r] = CELLS[name] || CELLS.small, e = 0.5 / SW;
  return [c * CS / SW + e, ((r + 1) * CS - 3) / SH, (c + 1) * CS / SW - e, (r * CS + 3) / SH];
}

/** The card material (voxel material slot 5): alpha-cut, both sides lit alike (soft crown normals, no flip). */
export function cardMaterial() {
  const m = new THREE.MeshStandardMaterial({ map: leafTexture(), vertexColors: true, roughness: 0.82, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => patchCard(sh);
  m.customProgramCacheKey = () => 'voxcard';
  m.userData.voxCard = true;
  m.name = 'voxCards';
  return m;
}
export function patchCard(sh) {
  sh.vertexShader = sh.vertexShader
    .replace('void main() {', 'attribute vec3 vdet;\nvoid main() {')
    .replace('#include <uv_vertex>', '#include <uv_vertex>\n  vMapUv = vdet.xy;');
  sh.fragmentShader = sh.fragmentShader.replace(/float faceDirection = gl_FrontFacing \? 1\.0 : - 1\.0;/, 'float faceDirection = 1.0;')
    // natural grade: the sheet's greens a step muted, like the rest of the world
    .replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, 0.8);');
}

// ------------------------------------------------------------------------------------------------ scattering
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const isGreen = (c) => {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return g > r * 1.05 && g > b * 1.15 && g > 40;
};
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const crossV = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Scatter sprig cards over the leafy surface voxels of a model (see the header). Returns the number placed. */
export function leafCards(model, o = {}) {
  const kind = o.kind || 'small', density = o.density ?? 0.35, seed = o.seed ?? 7;
  const match = o.match || ((c) => isGreen(c));
  const size = o.size ?? CELLS[kind]?.[2] ?? 0.3;
  model.cards ||= [];
  // crown centre (for the soft normals: a crown shades as one form)
  let cx = 0, cy = 0, cz = 0, n = 0;
  const surf = [];
  model.forEach((x, y, z, v) => {
    const c = v & 0xffffff, mat = v & 0x8000000 ? (v >>> 24) & 7 : 0;
    if (!match(c, mat, x, y, z)) return;
    let ox = 0, oy = 0, oz = 0, open = 0;
    for (const d of N6) if (!model.has(x + d[0], y + d[1], z + d[2])) { ox += d[0]; oy += d[1]; oz += d[2]; open++; }
    if (!open) return;
    surf.push([x, y, z, ox, oy, oz]);
    cx += x; cy += y; cz += z; n++;
  });
  if (!n) return 0;
  cx /= n; cy /= n; cz /= n;
  let placed = 0;
  // density is per card footprint: with o.vs (metres per voxel) one surface voxel gets a card with probability
  // density x (voxel / card)^2, so a crown is covered alike at any voxel size
  const p = Math.min(1, density * (o.vs ? (o.vs / (size * 0.35)) ** 2 : 1));
  for (const [x, y, z, ox, oy, oz] of surf) {
    if (hash(x, y, z, seed) > p) continue;
    const r1 = hash(x, y, z, seed + 1), r2 = hash(x, y, z, seed + 2), r3 = hash(x, y, z, seed + 3);
    const out = norm([ox, oy, oz]);
    const radial = norm([x - cx, (y - cy) * 0.6, z - cz]);
    // the sprig grows outwards and up from where it sits; its blade turns at random about that line
    const up = norm([out[0] * 0.8 + radial[0] * 0.4 + (r1 - 0.5) * 0.5, out[1] * 0.5 + 0.75 + radial[1] * 0.2, out[2] * 0.8 + radial[2] * 0.4 + (r2 - 0.5) * 0.5]);
    const a = r3 * Math.PI * 2;
    let side = norm(crossV(up, [Math.cos(a), 0.3, Math.sin(a)]));
    if (!Number.isFinite(side[0]) || Math.hypot(...side) < 0.5) side = [1, 0, 0];
    const nn = norm([radial[0] * 0.7 + out[0] * 0.3, radial[1] * 0.7 + out[1] * 0.3 + 0.35, radial[2] * 0.7 + out[2] * 0.3]);
    let k = kind;
    if (o.mix && hash(x, y, z, seed + 4) < o.mix[1]) k = o.mix[0];
    const depth = Math.max(0, Math.min(1, 0.5 + radial[1] * 0.5));
    model.cards.push({
      x: x + 0.5 - out[0] * 0.4, y: y + 0.5 - out[1] * 0.4 - 0.3, z: z + 0.5 - out[2] * 0.4,
      kind: k, size: size * (0.8 + r1 * 0.4), up, side, n: nn, shade: (o.shade ?? 1) * (0.72 + depth * 0.22 + r2 * 0.1),
    });
    placed++;
  }
  return placed;
}

/** Card quads for the mesher: { pos, nrm, col, uv } flat arrays (4 vertices per card) in the mesh's metres. */
export function cardQuads(cards, vs, origin) {
  const pos = [], nrm = [], col = [], uv = [];
  for (const c of cards) {
    const [u0, v0, u1, v1] = cellUV(c.kind);
    const h = c.size, w = c.size * 0.5;
    const fx = (c.x - origin[0]) * vs, fy = (c.y - origin[1]) * vs, fz = (c.z - origin[2]) * vs;
    const P = [
      [fx - c.side[0] * w, fy - c.side[1] * w, fz - c.side[2] * w],
      [fx + c.side[0] * w, fy + c.side[1] * w, fz + c.side[2] * w],
      [fx + c.side[0] * w + c.up[0] * h, fy + c.side[1] * w + c.up[1] * h, fz + c.side[2] * w + c.up[2] * h],
      [fx - c.side[0] * w + c.up[0] * h, fy - c.side[1] * w + c.up[1] * h, fz - c.side[2] * w + c.up[2] * h],
    ];
    const UV = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const s = c.shade ?? 1, foot = s * 0.82;
    for (let k = 0; k < 4; k++) {
      pos.push(...P[k]); nrm.push(...c.n); uv.push(UV[k][0], UV[k][1], -1);
      const f = k < 2 ? foot : s;
      col.push(f, f, f);
    }
  }
  return { pos, nrm, col, uv };
}
