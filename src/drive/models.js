// Voxel models for the drive: the farmers' kei trucks (white cab-over pickups with a flat bed and a load), cached.
//   keiTruckGeometry(variant) -> BufferGeometry (groups by voxel material; use with voxelMaterials('normal')), faces +z
//   TRUCK = { len, width, height }
import { VoxelModel, gloss, metal, glow, glass } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { hash2 } from '../core/util.js';

const VS = 0.05;
export const TRUCK = { len: 3.4, width: 1.48, height: 1.8 };
const shade = (c, f) => { const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f); return (r << 16) | (g << 8) | b; };

/**
 * A kei truck: cab-over, white (or a faded sky blue), flat bed with fold-down gates, a load (cabbages in crates, rice
 * sacks under a blue tarp, or empty), a farmer with a towel round his head behind the wheel. variant 0..2.
 */
function buildTruck(variant = 0) {
  const v = new VoxelModel();
  v.jitter = 0.025;
  const HW = 14, ZF = 34, ZB = -34;
  const body = variant === 1 ? 0x9ac4d8 : 0xf0eee6;
  const paint = (x, y, z) => gloss(shade(body, 0.97 - (y < 9 ? 0.08 : 0) - (hash2(x >> 2, (y >> 2) + (z >> 2) * 7) < 0.15 ? 0.04 : 0)));
  // chassis rails and the wheels
  v.box(-9, 5, ZB + 2, 9, 7, ZF - 4, 0x2a2a2a);
  for (const [z, s] of [[22, 1], [-22, 1]]) for (const sx of [-1, 1]) {
    v.cylinder(sx * 11, 6, z, 6, 4, (x, y, zz) => ((y - 6) ** 2 + (zz - z) ** 2 > 12 ? 0x1c1c1c : metal(0xb8bcc0)), 'x');
    void s;
  }
  // the cab: a tall box with a sloped windscreen, rounded roof edges
  const zFront = (y) => (y < 20 ? ZF : ZF - (y - 20) * 0.35);
  v.shape(-HW, 8, 15, HW, 36, ZF, (x, y, z) => z <= zFront(y) && !(y > 34 && Math.abs(x) > HW - 2), (x, y, z) => {
    const side = Math.abs(x) >= HW - 0.5;
    if (y >= 21 && y <= 33 && z > zFront(y) - 1.2 && Math.abs(x) < HW - 1) return glass(0x3a4652); // windscreen
    if (side && y >= 22 && y <= 33 && z >= 18 && z <= zFront(y) - 2) return glass(0x3a4652); // door windows
    if (z <= 15.5 && y >= 24 && y <= 33 && Math.abs(x) < HW - 2) return glass(0x3a4652); // rear window
    if (y <= 10) return gloss(0x3a3a3c); // bumper line
    return paint(x, y, z);
  });
  // hollow it a little so the driver shows through the glass
  v.shape(-HW + 1, 12, 16, HW - 1, 34, ZF - 1, (x, y, z) => z < zFront(y) - 1, null);
  v.box(-HW + 1, 12, 17, HW - 1, 15, 22, 0x4a4e58); // seat
  v.box(-HW + 1, 16, 16, HW - 1, 25, 17, 0x4a4e58);
  // the farmer (right-hand drive): shirt, face, a white towel round the head
  v.box(-11, 16, 19, -4, 24, 23, 0x5a6a8a);
  v.box(-10, 25, 19, -5, 30, 23, 0xc8946a);
  v.box(-10, 30, 19, -5, 31, 23, 0xf4f0e6); v.box(-11, 29, 20, -11, 31, 22, 0xf4f0e6);
  v.box(-9, 26, 23, -9, 27, 23, 0x2a1a14); v.box(-6, 26, 23, -6, 27, 23, 0x2a1a14);
  v.box(-9, 22, 25, -5, 23, 25, 0x1a1a1a); // the wheel
  // front: grille, lamps (lit), plate
  v.box(-HW + 2, 12, ZF + 1, HW - 2, 13, ZF + 1, 0x2a2a2c);
  for (const sx of [-1, 1]) { v.box(sx * 10, 15, ZF + 1, sx * 12, 17, ZF + 1, glow(0xfff2c8)); v.box(sx * 10, 13, ZF + 1, sx * 12, 13, ZF + 1, glow(0xf0a030)); }
  v.box(-4, 9, ZF + 1, 4, 11, ZF + 1, gloss(0xf2d23a));
  v.box(-HW, 8, ZF, HW, 9, ZF + 1, metal(0x8a8e92));
  for (const sx of [-1, 1]) v.box(sx * (HW + 1), 26, 30, sx * (HW + 1), 29, 31, 0x1a1a1a); // mirrors
  // the bed: floor, fold-down gates, the guard frame behind the cab
  v.box(-HW, 10, ZB, HW, 11, 14, 0xa0a4a8);
  for (const sx of [-1, 1]) v.box(sx * HW, 12, ZB, sx * HW, 16, 14, paint);
  v.box(-HW, 12, ZB, HW, 16, ZB, paint);
  for (const sx of [-1, 1]) v.box(sx * (HW - 1), 12, 14, sx * (HW - 1), 34, 14, metal(0x6a6e72));
  v.box(-HW + 1, 33, 14, HW - 1, 34, 14, metal(0x6a6e72)); for (let x = -HW + 3; x < HW - 1; x += 3) v.box(x, 17, 14, x, 33, 14, metal(0x6a6e72));
  // tail lights, plate
  for (const sx of [-1, 1]) v.box(sx * 12, 13, ZB - 1, sx * 13, 15, ZB - 1, gloss(0xc81e1e));
  v.box(-3, 12, ZB - 1, 3, 14, ZB - 1, gloss(0xf2d23a));
  // the load
  if (variant === 0) {
    // cabbages in plastic crates
    for (let i = 0; i < 4; i++) {
      const z0 = ZB + 2 + i * 11, x0 = i % 2 ? -12 : -1;
      for (const xx of [x0, x0 + 12 > HW - 2 ? x0 : x0]) {
        v.box(xx, 12, z0, xx + 10, 17, z0 + 9, i % 2 ? 0x2a6ab8 : 0xd8b030);
        for (let k = 0; k < 6; k++) v.ellipsoid(xx + 2 + (k % 3) * 3, 19, z0 + 2 + Math.floor(k / 3) * 5, 1.8, 1.6, 1.8, (x, y, z) => shade(0x8ac05a, 0.85 + hash2(x + z, y) * 0.25));
      }
    }
  } else if (variant === 1) {
    // rice sacks under a blue tarp, roped down
    v.shape(-12, 12, ZB + 2, 12, 22, 10, (x, y, z) => (y - 12) < 10 - Math.abs(x) * 0.3, (x, y, z) => gloss(shade(0x2f6fd6, 0.85 + hash2(x >> 1, (z >> 1) + y) * 0.25)));
    for (const z of [ZB + 8, -8, 4]) for (let x = -12; x <= 12; x++) v.set(x, 22 - Math.abs(x) * 0.3 + 1, z, 0xe8d8a8);
  }
  return v;
}

const cache = new Map();
export function keiTruckGeometry(variant = 0) {
  if (!cache.has(variant)) cache.set(variant, meshVoxels(buildTruck(variant), { voxelSize: VS, jitterBlock: 4, quantize: 8 }));
  return cache.get(variant);
}
/** Drop the cached truck meshes (the drive is over). */
export function disposeTrucks() { for (const g of cache.values()) g.dispose(); cache.clear(); }
