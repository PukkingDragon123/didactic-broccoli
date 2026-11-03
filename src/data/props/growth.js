// Props for the growth features (src/growth/): flat 103's kitchen and bath, home-cooked dishes, the annex renovation
// kit, and the Gacha Kaikan's walls of stacked route machines (one module = 2 x 2 machines, in five body colours).
// Each entry: { name, jp, voxel, build(v) }. Facing +z, bottom-centre origin, deterministic (hashed noise only).
import { shade } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';
import { hash, fill } from './garage.js';

const P = {};
const CAPS = [0xe5383b, 0x3a7ad8, 0xf2c230, 0x5ab060, 0xe86aa8, 0xf08a3a, 0x8a5bd6, 0xf4f0e6];

// ------------------------------------------------------------------ the Kaikan's route machines (stacked 2 x 2)
function stack(body, trim) {
  return (v) => {
    v.jitter = 0.01;
    const B = (x, y, z) => gloss(shade(body, 0.94 + hash(x >> 1, y >> 1, z >> 1, 7) * 0.08));
    fill(v, -18, 0, -9, 18, 3, 8, 0x2a2a30); // plinth
    for (const cx of [-9, 9]) for (const [y0] of [[4], [40]]) {
      // body
      fill(v, cx - 8, y0, -8, cx + 8, y0 + 33, 8, B);
      fill(v, cx - 8, y0 + 34, -8, cx + 8, y0 + 35, 8, gloss(trim));
      // window full of capsules, clear front
      fill(v, cx - 6, y0 + 17, 8, cx + 6, y0 + 31, 8, glass(0xe8f4f6));
      for (let y = y0 + 18; y <= y0 + 28; y += 2) for (let x = cx - 5; x <= cx + 5; x += 2) {
        if (y > y0 + 25 + hash(x, y0, cx, 3) * 3) continue;
        v.set(x + ((y >> 1) % 2), y, 6, gloss(CAPS[Math.floor(hash(x, y, cx, 5) * CAPS.length)]));
        v.set(x + ((y >> 1) % 2), y + 1, 6, gloss(0xf8f8f4));
      }
      // display card under the window, coin mech + handle, chute
      fill(v, cx - 6, y0 + 12, 9, cx + 6, y0 + 16, 9, (x, y) => ((x + y) % 4 === 0 ? CAPS[(cx + y0) % 7 & 7] : 0xfbf8f2));
      fill(v, cx - 4, y0 + 5, 9, cx + 4, y0 + 10, 9, metal(0xc8ccd2));
      v.cylinder(cx, y0 + 8, 10, 2, 1, metal(0xe8ecf0), 'z');
      v.set(cx + 2, y0 + 8, 11, gloss(trim));
      fill(v, cx - 3, y0 + 1, 9, cx + 3, y0 + 3, 9, 0x1a1a1a);
      v.set(cx - 1, y0 + 10, 10, 0x1a1a1a); v.set(cx, y0 + 10, 10, 0x1a1a1a);
    }
    // a lit header strip on top
    fill(v, -18, 76, -6, 18, 79, 8, gloss(trim));
    fill(v, -16, 77, 9, 16, 78, 9, glow(shade(trim, 1.2)));
  };
}
for (const [id, body, trim] of [['red', 0xd8322c, 0xf4f0e6], ['blue', 0x2f6ad8, 0xf2c230], ['yellow', 0xf2c230, 0xd8322c], ['pink', 0xe86aa8, 0xf4f0e6], ['green', 0x3a9a5a, 0xf4f0e6], ['black', 0x26262c, 0xd4a83a]]) {
  P[`gr_stack_${id}`] = { name: 'Route machines', jp: 'ガチャ', voxel: 0.025, build: stack(body, trim) };
}

// ------------------------------------------------------------------ flat 103: kitchen
P.gr_stove = {
  name: 'Two-ring gas stove', jp: 'ガスコンロ', voxel: 0.01,
  build(v) {
    fill(v, -28, 0, -18, 28, 9, 18, gloss(0xe8e4dc));
    fill(v, -28, 10, -18, 28, 10, 18, metal(0x3a3a3e));
    for (const cx of [-14, 14]) {
      v.torus(cx, 11, -1, 7, 1, metal(0x2a2a2e));
      v.cylinder(cx, 11, -1, 3, 1, metal(0x6a6a72));
      for (let a = 0; a < 4; a++) { const s = Math.sin(a * Math.PI / 2), c = Math.cos(a * Math.PI / 2); v.box(cx + Math.round(c * 7), 12, -1 + Math.round(s * 7), cx + Math.round(c * 9), 12, -1 + Math.round(s * 9), metal(0x2a2a2e)); }
    }
    fill(v, -28, 1, 19, 28, 8, 19, gloss(0xd8d4cc));
    for (const cx of [-14, 14]) { v.cylinder(cx, 5, 20, 3, 2, gloss(0x2a2a2e), 'z'); v.set(cx, 7, 22, gloss(0xd8322c)); }
    v.set(0, 5, 20, glow(0x60ff80));
  },
};
P.gr_pan = {
  name: 'Frying pan', jp: 'フライパン', voxel: 0.008,
  build(v) {
    v.cylinder(0, 0, 0, 13, 1, metal(0x2a2a2e));
    v.tube(0, 1, 0, 13, 12, 3, metal(0x3a3a3e));
    fill(v, 13, 3, -1, 32, 4, 1, gloss(0x3a2418));
  },
};
P.gr_ricecooker = {
  name: 'Rice cooker', jp: '炊飯器', voxel: 0.008,
  build(v) {
    for (let y = 0; y < 22; y++) v.cylinder(0, y, 0, 15 - (y > 18 ? (y - 18) : 0), 1, gloss(y > 17 ? 0xf4f0e6 : 0xe8e0d0));
    fill(v, -5, 6, 14, 5, 12, 15, gloss(0x8a9aa8));
    v.set(-2, 9, 16, glow(0xff8a3a)); v.set(2, 9, 16, 0x2a2a2a);
    fill(v, -6, 22, -2, 6, 24, 2, gloss(0x8a8a90));
  },
};
function plate(v, r = 13) {
  v.cylinder(0, 0, 0, r - 2, 1, gloss(0xf4f2ec));
  v.tube(0, 1, 0, r, r - 2, 2, gloss(0xf8f6f0));
}
P.gr_dish_curry = {
  name: 'Curry rice', jp: 'カレーライス', voxel: 0.006,
  build(v) {
    plate(v, 16);
    for (let x = -12; x <= 12; x++) for (let z = -12; z <= 12; z++) {
      const d = x * x + z * z;
      if (d > 144) continue;
      const curry = x > -2 + Math.sin(z * 0.5);
      v.set(x, 2, z, curry ? (hash(x, z, 2, 1) < 0.15 ? 0xd88a2a : 0x8a4a14) : (hash(x, z, 3, 2) < 0.1 ? 0xe8e4d8 : 0xfaf8f2));
      if (!curry && d < 60) v.set(x, 3, z, 0xfaf8f2);
      if (curry && hash(x, z, 4, 3) < 0.06) v.set(x, 3, z, 0xe8a040);
    }
    fill(v, 4, 3, 8, 10, 3, 9, metal(0xc8ccd2));
  },
};
P.gr_dish_yakisoba = {
  name: 'Yakisoba', jp: '焼きそば', voxel: 0.006,
  build(v) {
    plate(v, 16);
    for (let x = -11; x <= 11; x++) for (let z = -11; z <= 11; z++) {
      if (x * x + z * z > 121) continue;
      const h = 2 + Math.floor(hash(x, z, 5, 1) * 3);
      for (let y = 2; y <= h; y++) v.set(x, y, z, hash(x, y, z, 6) < 0.12 ? 0x5ab040 : hash(x, y, z, 7) < 0.08 ? 0xe86a6a : 0xb8783a);
    }
    for (let i = 0; i < 9; i++) v.set(-4 + (i % 3) * 3, 5, -3 + Math.floor(i / 3) * 3, 0x2a5a2a); // aonori
  },
};
P.gr_dish_tkg = {
  name: 'Tamago kake gohan', jp: '卵かけご飯', voxel: 0.006,
  build(v) {
    for (let y = 0; y < 9; y++) v.tube(0, y, 0, 8 + Math.floor(y * 0.5), 7 + Math.floor(y * 0.5), 1, gloss(y < 2 ? 0x2a2a3a : 0x3a4a8a));
    v.cylinder(0, 0, 0, 7, 1, gloss(0x2a2a3a));
    for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) {
      const d = x * x + z * z;
      if (d > 100) continue;
      v.set(x, 9, z, d < 12 ? 0xf8b81a : d < 30 && hash(x, z, 1, 1) < 0.6 ? 0xf4d860 : 0xfaf8f2);
    }
    v.set(0, 10, 0, 0xf8a010);
  },
};

// ------------------------------------------------------------------ flat 103: bathroom
P.gr_ofuro = {
  name: 'Ofuro tub', jp: '風呂桶', voxel: 0.02,
  build(v) {
    // a deep square tub, sky-blue tiles outside, the rim in hinoki wood
    const tile = (x, y, z) => ((x + 40) % 4 === 0 || y % 4 === 0 || (z + 40) % 4 === 0 ? 0xd8e4e8 : gloss(0x8ac0d8));
    fill(v, -25, 0, -18, 25, 27, 18, tile);
    fill(v, -23, 4, -16, 23, 27, 16, null);
    fill(v, -23, 4, -16, 23, 4, 16, gloss(0xb8d8e8));
    fill(v, -26, 28, -19, 26, 29, 19, (x, y, z) => (Math.abs(x) > 23 || Math.abs(z) > 16 ? shade(0xd8b080, 0.95 + hash(x, y, z, 2) * 0.08) : null));
    fill(v, 22, 20, -2, 23, 22, 2, metal(0xc8ccd2)); // the inlet
  },
};
P.gr_bath_stool = {
  name: 'Bath stool', jp: '風呂椅子', voxel: 0.01,
  build(v) {
    fill(v, -11, 16, -9, 11, 19, 9, gloss(0xf4c0c8));
    for (const x of [-10, 9]) fill(v, x, 0, -9, x + 1, 15, 9, gloss(0xe8a0b0));
  },
};
P.gr_oke = {
  name: 'Wash bucket', jp: '風呂桶', voxel: 0.008,
  build(v) {
    v.cylinder(0, 0, 0, 12, 1, gloss(0xf2c230));
    v.tube(0, 1, 0, 13, 11, 12, gloss(0xf2c230));
    v.paint(() => { for (let a = 0; a < 32; a++) { const x = Math.round(Math.cos(a / 5.1) * 13), z = Math.round(Math.sin(a / 5.1) * 13); if (v.has(x, 6, z)) v.set(x, 6, z, gloss(0xd8282a)); } });
  },
};

// ------------------------------------------------------------------ the annex renovation kit
P.gr_roller = {
  name: 'Paint roller', jp: 'ローラー', voxel: 0.01,
  build(v) {
    v.cylinder(0, 30, 0, 3, 18, gloss(0xf4f0e6), 'x');
    fill(v, -1, 0, 0, 1, 27, 0, gloss(0x2a5aa8));
    fill(v, -1, 27, 0, 10, 28, 0, metal(0xc8ccd2));
  },
};
P.gr_tube = {
  name: 'Fluorescent tube', jp: '蛍光灯', voxel: 0.01,
  build(v) { v.cylinder(-59, 0, 0, 1, 119, gloss(0xf4f8fa), 'x'); fill(v, -61, -1, -1, -60, 1, 1, metal(0xc8ccd2)); fill(v, 59, -1, -1, 60, 1, 1, metal(0xc8ccd2)); },
};

export default P;
