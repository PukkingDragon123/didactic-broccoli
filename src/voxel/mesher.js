// Greedy voxel mesher with per-vertex ambient occlusion and per-voxel colour jitter.
// Produces a BufferGeometry with position / normal / color attributes and one group per material id.
import * as THREE from 'three';
import { MAT, decColor, decMat } from './VoxelModel.js';

const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
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

function jitterColor(hex, amt, x, y, z) {
  if (amt <= 0) return hex;
  const n = (hash3(x, y, z) - 0.5) * 2 * amt;
  let r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  r = Math.max(0, Math.min(255, Math.round(r * (1 + n))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 + n))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 + n * 1.1))));
  return (r << 16) | (g << 8) | b;
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

  model.forEach((x, y, z, v) => {
    const gx = x - b.minX + 1, gy = y - b.minY + 1, gz = z - b.minZ + 1;
    const mat = decMat(v);
    const col = mat === MAT.GLOW || mat === MAT.GLASS ? decColor(v) : jitterColor(decColor(v), jit, x, y, z);
    grid[idx(gx, gy, gz)] = (col + 1) * 8 + mat;
  });

  const matOf = (g) => g % 8;
  const solidAt = (x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D) return false;
    const g = grid[idx(x, y, z)];
    return g !== 0 && matOf(g) !== MAT.GLASS;
  };
  const cellAt = (x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D) return 0;
    return grid[idx(x, y, z)];
  };

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

  const buckets = [[], [], [], [], [], [], [], []]; // per material: arrays of [pos(12), nrm(3), col(12)]
  const dims = [W, H, D];
  const x = [0, 0, 0];
  const q = [0, 0, 0];

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3;
    const du = dims[u], dv = dims[v];
    const mask = new Float64Array(du * dv);
    for (const dir of [1, -1]) {
      q[0] = q[1] = q[2] = 0; q[d] = dir;
      for (x[d] = 1; x[d] < dims[d] - 1; x[d]++) {
        // build mask
        let n = 0;
        for (x[v] = 0; x[v] < dv; x[v]++) {
          for (x[u] = 0; x[u] < du; x[u]++, n++) {
            mask[n] = 0;
            const a = cellAt(x[0], x[1], x[2]);
            if (a === 0) continue;
            const nb = cellAt(x[0] + q[0], x[1] + q[1], x[2] + q[2]);
            const aGlass = matOf(a) === MAT.GLASS;
            if (nb !== 0) {
              const nbGlass = matOf(nb) === MAT.GLASS;
              if (!nbGlass) continue; // hidden by solid neighbour
              if (aGlass) continue; // glass next to glass
            }
            // AO for the 4 corners, sampled in the layer in front of the face
            const px = x[0] + q[0], py = x[1] + q[1], pz = x[2] + q[2];
            const ao = [0, 0, 0, 0];
            if (!aGlass) {
              const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
              for (let c = 0; c < 4; c++) {
                const [cu, cv] = corners[c];
                const s1p = [px, py, pz]; s1p[u] += cu;
                const s2p = [px, py, pz]; s2p[v] += cv;
                const cp = [px, py, pz]; cp[u] += cu; cp[v] += cv;
                const s1 = solidAt(s1p[0], s1p[1], s1p[2]) ? 1 : 0;
                const s2 = solidAt(s2p[0], s2p[1], s2p[2]) ? 1 : 0;
                const cc = solidAt(cp[0], cp[1], cp[2]) ? 1 : 0;
                ao[c] = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
              }
            } else { ao[0] = ao[1] = ao[2] = ao[3] = 3; }
            mask[n] = a * 256 + (ao[0] | (ao[1] << 2) | (ao[2] << 4) | (ao[3] << 6)) + 1;
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
            const aos = [aoBits & 3, (aoBits >> 2) & 3, (aoBits >> 4) & 3, (aoBits >> 6) & 3];
            const pos = [x[0], x[1], x[2]];
            pos[u] = i; pos[v] = j;
            if (dir === 1) pos[d] = x[d] + 1;
            const corner = (cu, cv) => {
              const p = [pos[0], pos[1], pos[2]];
              p[u] += cu; p[v] += cv;
              return [(p[0] - ox) * vs, (p[1] - oy) * vs, (p[2] - oz) * vs];
            };
            const c0 = corner(0, 0), c1 = corner(w, 0), c2 = corner(w, h), c3 = corner(0, h);
            const nrm = [0, 0, 0]; nrm[d] = dir;
            const glowy = mat === MAT.GLOW;
            const cols = aos.map((a) => {
              const f = glowy ? 1 : AO_CURVE[a];
              return [lc[0] * f, lc[1] * f, lc[2] * f];
            });
            let verts, vc;
            if (dir === 1) { verts = [c0, c1, c2, c3]; vc = cols; }
            else { verts = [c0, c3, c2, c1]; vc = [cols[0], cols[3], cols[2], cols[1]]; }
            const A = dir === 1 ? aos : [aos[0], aos[3], aos[2], aos[1]];
            const flip = A[0] + A[2] < A[1] + A[3];
            buckets[mat].push({ verts, nrm, vc, flip });
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
  for (const b2 of buckets) quadCount += b2.length;
  const positions = new Float32Array(quadCount * 4 * 3);
  const normals = new Float32Array(quadCount * 4 * 3);
  const colors = new Float32Array(quadCount * 4 * 3);
  const indices = new (quadCount * 4 > 65535 ? Uint32Array : Uint16Array)(quadCount * 6);
  const geo = new THREE.BufferGeometry();
  let vi = 0, ii = 0;
  for (let mat = 0; mat < buckets.length; mat++) {
    const list = buckets[mat];
    if (!list.length) continue;
    const start = ii;
    for (const f of list) {
      for (let k = 0; k < 4; k++) {
        positions.set(f.verts[k], (vi + k) * 3);
        normals.set(f.nrm, (vi + k) * 3);
        colors.set(f.vc[k], (vi + k) * 3);
      }
      if (f.flip) {
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
