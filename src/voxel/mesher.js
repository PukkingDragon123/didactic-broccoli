// Greedy voxel mesher with per-vertex ambient occlusion and per-voxel colour jitter.
// Produces a BufferGeometry with position / normal / color attributes and one group per material id.
import * as THREE from 'three';
import { MAT, decColor, decMat, decSurf, SURF } from './VoxelModel.js';
import { cardQuads } from './cards.js';

/** Material slot of 2D pixel-art cards (leaf sprigs...) in voxel geometry (src/voxel/cards.js). */
export const CARD_SLOT = 5;

// baked AO: soft steps (no harsh dark creases) and warm (shaded corners drift towards umber, not grey)
const AO_CURVE = [0.56, 0.72, 0.87, 1.0];
const AO_WARM = [1.0, 0.94, 0.88]; // per-channel exponent on the AO factor: red darkens least
// face detail: one atlas tile (128 texels) spans 128 / texelsPerVoxel voxels; a texel is ~4.5 mm on the voxel grid
export const DETAIL_TILE = 128;
const TEXEL_M = 0.0045;
// finer models (2x up-res collectibles) crease at every half-step: a lighter curve keeps them from looking etched
export const AO_SOFT = [0.62, 0.77, 0.9, 1.0];
const linCache = new Map();
function linear(hex) {
  let c = linCache.get(hex);
  if (!c) {
    const col = new THREE.Color().setHex(hex);
    c = [col.r, col.g, col.b];
    linCache.set(hex, c);
  }
  return c;
}

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function jitterColor(hex, amt, x, y, z, block = 1, q = 0) {
  if (amt <= 0 && !q) return hex;
  const n = amt > 0 ? (hash3(Math.floor(x / block), Math.floor(y / block), Math.floor(z / block)) - 0.5) * 2 * amt : 0;
  let r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  r = Math.max(0, Math.min(255, Math.round(r * (1 + n))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 + n))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 + n * 1.1))));
  if (q > 1) { r = Math.min(255, Math.round(r / q) * q); g = Math.min(255, Math.round(g / q) * q); b = Math.min(255, Math.round(b / q) * q); }
  return (r << 16) | (g << 8) | b;
}

const ORDER_P = [0, 1, 2, 3], ORDER_N = [0, 3, 2, 1];

/** Surface kind a prop voxel gets when it was not given one: by material, then by colour (hue / saturation / value). */
export function autoSurf(hex, mat) {
  if (mat === MAT.GLOW || mat === MAT.GLASS) return 0;
  if (mat === MAT.METAL) return SURF.galv;
  if (mat === MAT.GLOSS) return SURF.glaze;
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx, s = mx ? (mx - mn) / mx : 0;
  let h = 0;
  if (mx !== mn) {
    if (mx === r) h = ((g - b) / (mx - mn) + 6) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4;
    h *= 60;
  }
  if (s < 0.13) return v < 0.18 ? SURF.paint : SURF.concrete; // greys: concrete, stone, cement; near-black: paint
  if (h >= 12 && h <= 45 && s > 0.28 && v > 0.16 && v < 0.78) return SURF.wood; // browns and tans
  if (h > 60 && h < 170 && s > 0.2) return SURF.moss; // greens: leaves, moss, grass
  return SURF.plaster;
}

/**
 * @param {import('./VoxelModel.js').VoxelModel} model
 * @param {{voxelSize?:number, origin?:'bottom'|'center'|'none'}} opts
 */
export function meshVoxels(model, opts = {}) {
  const vs = opts.voxelSize ?? 0.01;
  const b = model.bounds();
  const W = b.w + 2, H = b.h + 2, D = b.d + 2;
  const grid = new Float64Array(W * H * D); // 0 = empty, else colour+1 (jittered) * 8 + mat
  const idx = (x, y, z) => x + W * (y + H * z);
  const jit = model.jitter ?? 0;
  const jb = opts.jitterBlock ?? model.jitterBlock ?? 1;
  const jq = opts.quantize ?? model.quantize ?? 0;
  const aoCurve = opts.aoCurve ?? model.aoCurve ?? AO_CURVE;
  // face detail: opts.surf 'auto' (props / world: kinds picked by autoSurf unless a voxel has one), a SURF name (the
  // default for voxels without one), or nothing (only voxels given a kind get detail). Off below 2 texels per voxel.
  const tpv = opts.texel ?? model.texel ?? Math.min(16, Math.round(vs / TEXEL_M));
  const surfOpt = opts.surf ?? model.surfaceAuto;
  const detail = tpv >= 2 && opts.surf !== false;
  const surfDef = typeof surfOpt === 'string' && surfOpt !== 'auto' ? SURF[surfOpt] ?? 0 : 0;
  const grainY = (opts.grain ?? model.grain) === 'y';

  model.forEach((x, y, z, v) => {
    const gx = x - b.minX + 1, gy = y - b.minY + 1, gz = z - b.minZ + 1;
    const mat = decMat(v);
    const raw = decColor(v);
    const col = mat === MAT.GLOW || mat === MAT.GLASS ? raw : jitterColor(raw, jit, x, y, z, jb, jq);
    let k = 0;
    if (detail && mat !== MAT.GLASS && mat !== MAT.GLOW) k = decSurf(v) || surfDef || (surfOpt === 'auto' ? autoSurf(raw, mat) : 0);
    grid[idx(gx, gy, gz)] = ((col + 1) * 16 + k) * 8 + mat;
  });

  // origin offset (in voxel units, grid space)
  let ox, oy, oz;
  if (model.pivot) {
    ox = model.pivot.x - b.minX + 1; oy = model.pivot.y - b.minY + 1; oz = model.pivot.z - b.minZ + 1;
  } else if (opts.origin === 'center') {
    ox = 1 + b.w / 2; oy = 1 + b.h / 2; oz = 1 + b.d / 2;
  } else if (opts.origin === 'none') {
    ox = 1 - b.minX; oy = 1 - b.minY; oz = 1 - b.minZ;
  } else {
    ox = 1 + b.w / 2; oy = 1; oz = 1 + b.d / 2;
  }

  // per material: flat lists of quads (4 positions, 4 colours, 1 normal axis/dir, 1 flip flag)
  const P = [[], [], [], [], [], [], [], []], Cl = [[], [], [], [], [], [], [], []], Nr = [[], [], [], [], [], [], [], []];
  const Dt = [[], [], [], [], [], [], [], []]; // face detail: texel u, v (in atlas tiles) and kind, per vertex
  const tScale = tpv / DETAIL_TILE;
  // texture axes per face axis: x faces (z, y), y faces (x, z), z faces (x, y); grain 'y' turns the side faces
  const TU = grainY ? [1, 0, 1] : [2, 0, 0], TV = grainY ? [2, 2, 0] : [1, 2, 1];
  const dims = [W, H, D];
  const stride = [1, W, W * H];
  const origin = [ox, oy, oz];
  // solid (non-glass) occupancy for AO
  const solid = new Uint8Array(grid.length);
  for (let i = 0; i < grid.length; i++) { const g = grid[i]; solid[i] = g !== 0 && g % 8 !== MAT.GLASS ? 1 : 0; }
  const x = [0, 0, 0];
  const pos = [0, 0, 0];
  const aos = [0, 0, 0, 0];

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3;
    const du = dims[u], dv = dims[v];
    const su = stride[u], sv = stride[v], sd = stride[d];
    const mask = new Float64Array(du * dv);
    for (const dir of [1, -1]) {
      const sq = dir * sd;
      for (x[d] = 1; x[d] < dims[d] - 1; x[d]++) {
        // build mask
        let n = 0;
        for (x[v] = 0; x[v] < dv; x[v]++) {
          x[u] = 0;
          let ci = x[0] + W * (x[1] + H * x[2]);
          for (; x[u] < du; x[u]++, n++, ci += su) {
            mask[n] = 0;
            const a = grid[ci];
            if (a === 0) continue;
            const nb = grid[ci + sq];
            const aGlass = a % 8 === MAT.GLASS;
            if (nb !== 0) {
              if (nb % 8 !== MAT.GLASS) continue; // hidden by solid neighbour
              if (aGlass) continue; // glass next to glass
            }
            let aoBits = 255;
            if (!aGlass) {
              // AO for the 4 corners, sampled in the layer in front of the face: (-1,-1) (1,-1) (1,1) (-1,1)
              const p = ci + sq;
              const sl = solid[p - su], sr = solid[p + su], sb = solid[p - sv], st = solid[p + sv];
              const a0 = sl && sb ? 0 : 3 - (sl + sb + solid[p - su - sv]);
              const a1 = sr && sb ? 0 : 3 - (sr + sb + solid[p + su - sv]);
              const a2 = sr && st ? 0 : 3 - (sr + st + solid[p + su + sv]);
              const a3 = sl && st ? 0 : 3 - (sl + st + solid[p - su + sv]);
              aoBits = a0 | (a1 << 2) | (a2 << 4) | (a3 << 6);
            }
            mask[n] = a * 256 + aoBits + 1;
          }
        }
        // greedy merge
        n = 0;
        for (let j = 0; j < dv; j++) {
          for (let i = 0; i < du;) {
            const m = mask[n];
            if (m === 0) { i++; n++; continue; }
            let w = 1;
            while (i + w < du && mask[n + w] === m) w++;
            let h = 1, done = false;
            while (j + h < dv) {
              for (let k = 0; k < w; k++) { if (mask[n + k + h * du] !== m) { done = true; break; } }
              if (done) break;
              h++;
            }
            // emit quad
            const raw = m - 1;
            const aoBits = raw % 256;
            const cell = (raw - aoBits) / 256;
            const mat = cell % 8;
            const rest = (cell - mat) / 8;
            const kind = rest % 16;
            const colHex = (rest - kind) / 16 - 1;
            const lc = linear(colHex);
            aos[0] = aoBits & 3; aos[1] = (aoBits >> 2) & 3; aos[2] = (aoBits >> 4) & 3; aos[3] = (aoBits >> 6) & 3;
            pos[d] = dir === 1 ? x[d] + 1 : x[d]; pos[u] = i; pos[v] = j;
            const bx = (pos[0] - origin[0]) * vs, by = (pos[1] - origin[1]) * vs, bz = (pos[2] - origin[2]) * vs;
            const eu = [0, 0, 0], ev = [0, 0, 0];
            eu[u] = w * vs; ev[v] = h * vs;
            const glowy = mat === MAT.GLOW;
            const pl = P[mat], cl = Cl[mat];
            // corners c0 (0,0) c1 (w,0) c2 (w,h) c3 (0,h); the -dir face winds the other way
            const order = dir === 1 ? ORDER_P : ORDER_N;
            for (let k = 0; k < 4; k++) {
              const c = order[k];
              const cu = c === 1 || c === 2 ? 1 : 0, cv = c >= 2 ? 1 : 0;
              pl.push(bx + eu[0] * cu + ev[0] * cv, by + eu[1] * cu + ev[1] * cv, bz + eu[2] * cu + ev[2] * cv);
              const f = glowy ? 1 : aoCurve[aos[c]];
              if (f < 1) cl.push(lc[0] * f ** AO_WARM[0], lc[1] * f ** AO_WARM[1], lc[2] * f ** AO_WARM[2]);
              else cl.push(lc[0], lc[1], lc[2]);
              const gp = [pos[0] + (u === 0 ? w * cu : v === 0 ? h * cv : 0), pos[1] + (u === 1 ? w * cu : v === 1 ? h * cv : 0), pos[2] + (u === 2 ? w * cu : v === 2 ? h * cv : 0)];
              Dt[mat].push(gp[TU[d]] * tScale, gp[TV[d]] * tScale, kind);
            }
            const A0 = aos[order[0]], A1 = aos[order[1]], A2 = aos[order[2]], A3 = aos[order[3]];
            Nr[mat].push(d * 2 + (dir === 1 ? 0 : 1), A0 + A2 < A1 + A3 ? 1 : 0);
            // clear mask
            for (let l = 0; l < h; l++) for (let k = 0; k < w; k++) mask[n + k + l * du] = 0;
            i += w; n += w;
          }
        }
      }
    }
  }

  // 2D cards (leaves, blossom...): their own slot, with explicit normals and the sheet's uv in vdet
  const cq = model.cards?.length && opts.cards !== false ? cardQuads(model.cards, vs, [origin[0] + b.minX - 1, origin[1] + b.minY - 1, origin[2] + b.minZ - 1]) : null;
  const nCardV = cq ? cq.pos.length / 3 : 0;

  // assemble
  let quadCount = nCardV / 4;
  for (const nr of Nr) quadCount += nr.length / 2;
  const positions = new Float32Array(quadCount * 4 * 3);
  const normals = new Float32Array(quadCount * 4 * 3);
  const colors = new Float32Array(quadCount * 4 * 3);
  const dets = new Float32Array(quadCount * 4 * 3);
  const indices = new (quadCount * 4 > 65535 ? Uint32Array : Uint16Array)(quadCount * 6);
  const geo = new THREE.BufferGeometry();
  let vi = 0, ii = 0;
  for (let mat = 0; mat < 8; mat++) {
    const nr = Nr[mat];
    if (!nr.length) continue;
    const start = ii;
    positions.set(P[mat], vi * 3);
    colors.set(Cl[mat], vi * 3);
    dets.set(Dt[mat], vi * 3);
    for (let q = 0; q < nr.length; q += 2) {
      const ax = nr[q] >> 1, sgn = nr[q] & 1 ? -1 : 1;
      for (let k = 0; k < 4; k++) normals[(vi + k) * 3 + ax] = sgn;
      if (nr[q + 1]) {
        indices[ii++] = vi + 1; indices[ii++] = vi + 2; indices[ii++] = vi + 3;
        indices[ii++] = vi + 1; indices[ii++] = vi + 3; indices[ii++] = vi;
      } else {
        indices[ii++] = vi; indices[ii++] = vi + 1; indices[ii++] = vi + 2;
        indices[ii++] = vi; indices[ii++] = vi + 2; indices[ii++] = vi + 3;
      }
      vi += 4;
    }
    geo.addGroup(start, ii - start, mat);
  }
  if (cq) {
    const start = ii;
    positions.set(cq.pos, vi * 3); normals.set(cq.nrm, vi * 3); colors.set(cq.col, vi * 3); dets.set(cq.uv, vi * 3);
    for (let q = 0; q < nCardV; q += 4) {
      indices[ii++] = vi; indices[ii++] = vi + 1; indices[ii++] = vi + 2;
      indices[ii++] = vi; indices[ii++] = vi + 2; indices[ii++] = vi + 3;
      vi += 4;
    }
    geo.addGroup(start, ii - start, CARD_SLOT);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('vdet', new THREE.BufferAttribute(dets, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  const size = new THREE.Vector3(b.w * vs, b.h * vs, b.d * vs);
  geo.userData.size = size;
  geo.userData.voxelSize = vs;
  geo.userData.quads = quadCount;
  return geo;
}
