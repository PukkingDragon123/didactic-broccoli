// 2x voxel up-resolution for collectibles: finer, rounder silhouettes with the same crisp colour regions.
//
// Two shape smoothers (both keep 1-voxel features such as eyes, whiskers, keychain rings and thin plates intact):
//  * 'field' (default): the occupancy is resampled at the 2x sub-voxel centres through a small separable Gaussian
//    (σ ≈ 0.9 voxel) and thresholded at 0.5, which shaves outer stair-steps and fills inner ones, so curved bodies
//    come out rounder while flat faces stay flat. Thin voxels (empty on both sides along an axis) are never shaved and
//    1-voxel gaps are never filled.
//  * 'epx': Scale2x / EPX generalised to 3D: per pair of axes, N1 == N2 && N1 != O2 && N2 != O1 -> take N1.
// Colours: a kept sub-voxel keeps its own voxel's colour (patterns are just doubled, so faces read exactly as
// designed); a filled one takes its nearest solid neighbour's. opts.recolor additionally rounds colour regions with
// the EPX rule on the surface.
import { VoxelModel } from './VoxelModel.js';
import { AO_SOFT } from './mesher.js';

const OFF = 512;
const KEY = (X, Y, Z) => (X + OFF) + (Y + OFF) * 1024 + (Z + OFF) * 1048576;

/**
 * @param {VoxelModel} model
 * @param {{ mode?: 'field'|'epx', sigma?: number, carve?: boolean, fill?: boolean, recolor?: boolean, threshold?: number }} opts
 * @returns {VoxelModel} a new model at twice the resolution (coordinates doubled)
 */
export function upres2x(model, opts = {}) {
  const b = model.bounds();
  const P = 2; // padding
  const W = b.w + 2 * P, H = b.h + 2 * P, D = b.d + 2 * P;
  const S = new Uint32Array(W * H * D);
  const ox = b.minX - P, oy = b.minY - P, oz = b.minZ - P;
  model.forEach((x, y, z, v) => { S[(x - ox) + W * ((y - oy) + H * (z - oz))] = v; });
  const out = new VoxelModel();
  out.jitter = (model.jitter ?? 0) * (opts.jitter ?? 1);
  out.jitterBlock = 2;
  out.quantize = model.quantize;
  out.aoCurve = opts.aoCurve ?? AO_SOFT;
  if (model.pivot) out.pivot = { x: model.pivot.x * 2, y: model.pivot.y * 2, z: model.pivot.z * 2 };
  const grid = { S, W, H, D, ox, oy, oz };
  if (opts.mode === 'epx') epx(grid, out.map, opts);
  else field(grid, out.map, opts);
  return out;
}

// ------------------------------------------------------------------ field smoother
function field({ S, W, H, D, ox, oy, oz }, map, opts) {
  const sigma = opts.sigma ?? 0.9, thr = opts.threshold ?? 0.5;
  const carve = opts.carve !== false, fill = opts.fill !== false, recolor = !!opts.recolor;
  // per-axis taps for a sub-voxel on the + side (offset +0.25): cells at -1, 0, +1, +2
  const g = (d) => Math.exp(-(d * d) / (2 * sigma * sigma));
  const raw = [g(1.25), g(0.25), g(0.75), g(1.75)];
  const sum = raw[0] + raw[1] + raw[2] + raw[3];
  const wP = raw.map((w) => w / sum); // taps at [-1, 0, 1, 2]
  const wM = [wP[3], wP[2], wP[1], wP[0]]; // minus side: taps at [-2, -1, 0, 1]
  const occ = new Float32Array(W * H * D);
  for (let i = 0; i < S.length; i++) occ[i] = S[i] ? 1 : 0;
  // separable resampling: x (2W x H x D), then y (2W x 2H x D), then z (2W x 2H x 2D)
  const W2 = W * 2, H2 = H * 2, D2 = D * 2;
  const ax = new Float32Array(W2 * H * D);
  for (let z = 0; z < D; z++) for (let y = 0; y < H; y++) {
    const row = W * (y + H * z), orow = W2 * (y + H * z);
    for (let x = 2; x < W - 2; x++) {
      const a = occ[row + x - 2], bb = occ[row + x - 1], c = occ[row + x], d = occ[row + x + 1], e = occ[row + x + 2];
      ax[orow + 2 * x] = wM[0] * a + wM[1] * bb + wM[2] * c + wM[3] * d;
      ax[orow + 2 * x + 1] = wP[0] * bb + wP[1] * c + wP[2] * d + wP[3] * e;
    }
  }
  const ay = new Float32Array(W2 * H2 * D);
  for (let z = 0; z < D; z++) for (let x = 0; x < W2; x++) {
    const at = (y) => ax[x + W2 * (y + H * z)];
    for (let y = 2; y < H - 2; y++) {
      const a = at(y - 2), bb = at(y - 1), c = at(y), d = at(y + 1), e = at(y + 2);
      ay[x + W2 * (2 * y + H2 * z)] = wM[0] * a + wM[1] * bb + wM[2] * c + wM[3] * d;
      ay[x + W2 * (2 * y + 1 + H2 * z)] = wP[0] * bb + wP[1] * c + wP[2] * d + wP[3] * e;
    }
  }
  const F = (X, Y, Z) => {
    // z pass on demand (only where needed)
    const z = Z >> 1, at = (zz) => ay[X + W2 * (Y + H2 * zz)];
    if (Z & 1) return wP[0] * at(z - 1) + wP[1] * at(z) + wP[2] * at(z + 1) + wP[3] * at(z + 2);
    return wM[0] * at(z - 2) + wM[1] * at(z - 1) + wM[2] * at(z) + wM[3] * at(z + 1);
  };
  void D2;
  const sx = 1, sy = W, sz = W * H;
  // surface voxels (an empty face neighbour): their paint is carried one voxel inward, so shaving a painted voxel
  // (an eye on a curved head) shows more of the paint instead of the body colour underneath
  const surf = new Uint8Array(S.length);
  for (let i = sz + sy + 1; i < S.length - sz - sy - 1; i++) {
    if (S[i] && (!S[i - sx] || !S[i + sx] || !S[i - sy] || !S[i + sy] || !S[i - sz] || !S[i + sz])) surf[i] = 1;
  }
  const paintOf = (j, v) => (surf[j] && S[j] !== v ? S[j] : 0);
  for (let z = P0; z < D - P0; z++) for (let y = P0; y < H - P0; y++) for (let x = P0; x < W - P0; x++) {
    const i = x + W * (y + H * z);
    const v = S[i];
    const nb = [S[i - sx], S[i + sx], S[i - sy], S[i + sy], S[i - sz], S[i + sz]];
    if (!v && !(nb[0] | nb[1] | nb[2] | nb[3] | nb[4] | nb[5])) continue;
    const X0 = (x + ox) * 2, Y0 = (y + oy) * 2, Z0 = (z + oz) * 2;
    if (v) {
      // thin along an axis (empty on both sides): keep every sub-voxel, so 1-voxel features survive
      const thin = (!nb[0] && !nb[1]) || (!nb[2] && !nb[3]) || (!nb[4] && !nb[5]);
      for (let c = 0; c < 8; c++) {
        const dx = c & 1, dy = (c >> 1) & 1, dz = (c >> 2) & 1;
        if (carve && !thin && F(2 * x + dx, 2 * y + dy, 2 * z + dz) < thr) continue;
        let col = v;
        if (!surf[i]) {
          const p = majority3(paintOf(i + (dx ? sx : -sx), v), paintOf(i + (dy ? sy : -sy), v), paintOf(i + (dz ? sz : -sz), v));
          if (p) col = p;
        } else if (recolor) col = epxColor(S, i, dx ? 1 : -1, dy ? sy : -sy, dz ? sz : -sz, v);
        map.set(KEY(X0 + dx, Y0 + dy, Z0 + dz), col);
      }
    } else if (fill) {
      // never close a 1-voxel gap
      if ((nb[0] && nb[1]) || (nb[2] && nb[3]) || (nb[4] && nb[5])) continue;
      for (let c = 0; c < 8; c++) {
        const dx = c & 1, dy = (c >> 1) & 1, dz = (c >> 2) & 1;
        if (F(2 * x + dx, 2 * y + dy, 2 * z + dz) < thr + 0.04) continue;
        // colour of the nearest solid neighbour on this sub-voxel's side
        const cx = nb[dx ? 1 : 0], cy = nb[dy ? 3 : 2], cz = nb[dz ? 5 : 4];
        const col = majority3(cx, cy, cz);
        if (col) map.set(KEY(X0 + dx, Y0 + dy, Z0 + dz), col);
      }
    }
  }
}
const P0 = 2;

function majority3(a, b, c) {
  if (a && (a === b || a === c)) return a;
  if (b && b === c) return b;
  return a || b || c;
}

/** EPX colour rule on the surface: a sub-voxel takes a neighbour's colour when the two neighbours on its side agree. */
function epxColor(S, i, ox, oy, oz, P) {
  const Nx = S[i + ox], Ny = S[i + oy], Nz = S[i + oz], Ox = S[i - ox], Oy = S[i - oy], Oz = S[i - oz];
  // only between solid colours: the shape pass decides what is empty
  if (Nx && Nx === Ny && Nx !== Oy && Ny !== Ox && Nx !== P) return Nx;
  if (Nx && Nx === Nz && Nx !== Oz && Nz !== Ox && Nx !== P) return Nx;
  if (Ny && Ny === Nz && Ny !== Oz && Nz !== Oy && Ny !== P) return Ny;
  return P;
}

// ------------------------------------------------------------------ EPX smoother
function epx({ S, W, H, D, ox, oy, oz }, map, opts) {
  const carve = opts.carve !== false, fill = opts.fill !== false, recolor = !!opts.recolor;
  const sx = 1, sy = W, sz = W * H;
  const cand = [0, 0, 0];
  for (let z = 1; z < D - 1; z++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = x + W * (y + H * z);
    const P = S[i];
    if (!P && !(S[i - 1] | S[i + 1] | S[i - sy] | S[i + sy] | S[i - sz] | S[i + sz])) continue;
    const X0 = (x + ox) * 2, Y0 = (y + oy) * 2, Z0 = (z + oz) * 2;
    for (let c = 0; c < 8; c++) {
      const dx = c & 1 ? 1 : -1, dy = c & 2 ? 1 : -1, dz = c & 4 ? 1 : -1;
      const Nx = S[i + dx * sx], Ny = S[i + dy * sy], Nz = S[i + dz * sz];
      const Ox = S[i - dx * sx], Oy = S[i - dy * sy], Oz = S[i - dz * sz];
      let v = P;
      let n = 0;
      if (Nx === Ny && Nx !== Oy && Ny !== Ox) cand[n++] = Nx;
      if (Nx === Nz && Nx !== Oz && Nz !== Ox) cand[n++] = Nx;
      if (Ny === Nz && Ny !== Oz && Nz !== Oy) cand[n++] = Ny;
      if (n) {
        if (P) {
          let empty = false;
          for (let k = 0; k < n; k++) if (!cand[k]) empty = true;
          if (empty) { if (carve) v = 0; } else if (recolor) v = majority(cand, n, P);
        } else if (fill) v = majority(cand, n, 0);
      }
      if (!v) continue;
      map.set(KEY(X0 + (dx > 0 ? 1 : 0), Y0 + (dy > 0 ? 1 : 0), Z0 + (dz > 0 ? 1 : 0)), v);
    }
  }
}

function majority(c, n, fallback) {
  let best = fallback, bestN = 0;
  for (let k = 0; k < n; k++) {
    const v = c[k];
    if (!v) continue;
    let m = 0;
    for (let j = 0; j < n; j++) if (c[j] === v) m++;
    if (m > bestN) { best = v; bestN = m; }
  }
  return best;
}
