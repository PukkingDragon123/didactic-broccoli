// Greedy voxel mesher with per-vertex ambient occlusion and per-voxel colour jitter.
// Produces a BufferGeometry with position / normal / color attributes and one group per material id.
import * as THREE from 'three';
import { MAT, decColor, decMat } from './VoxelModel.js';

const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
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

  model.forEach((x, y, z, v) => {
    const gx = x - b.minX + 1, gy = y - b.minY + 1, gz = z - b.minZ + 1;
    const mat = decMat(v);
    const col = mat === MAT.GLOW || mat === MAT.GLASS ? decColor(v) : jitterColor(decColor(v), jit, x, y, z, jb, jq);
    grid[idx(gx, gy, gz)] = (col + 1) * 8 + mat;
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
            const colHex = (cell - mat) / 8 - 1;
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
              cl.push(lc[0] * f, lc[1] * f, lc[2] * f);
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

  // assemble
  let quadCount = 0;
  for (const nr of Nr) quadCount += nr.length / 2;
  const positions = new Float32Array(quadCount * 4 * 3);
  const normals = new Float32Array(quadCount * 4 * 3);
  const colors = new Float32Array(quadCount * 4 * 3);
  const indices = new (quadCount * 4 > 65535 ? Uint32Array : Uint16Array)(quadCount * 6);
  const geo = new THREE.BufferGeometry();
  let vi = 0, ii = 0;
  for (let mat = 0; mat < 8; mat++) {
    const nr = Nr[mat];
    if (!nr.length) continue;
    const start = ii;
    positions.set(P[mat], vi * 3);
    colors.set(Cl[mat], vi * 3);
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
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  const size = new THREE.Vector3(b.w * vs, b.h * vs, b.d * vs);
  geo.userData.size = size;
  geo.userData.voxelSize = vs;
  geo.userData.quads = quadCount;
  return geo;
}
