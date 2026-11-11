// Neighbourhood park (児童公園) props — playground kit, park furniture and the big summer tree.
// Each entry: { name, voxel (metres per voxel), build(v) }. Facing +z, bottom-centre origin (bounds-centred in x/z).
// Town-only (no footprint/beauty), so none of these show up in the museum catalogue. Deterministic.
import { shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow } from '../../voxel/VoxelModel.js';
import { hash, vnoise, fill, grime, blotch, speckle, rod } from './garage.js';
import { blob, limb, limbPath, bark, clipFloor } from './decor_nature.js';

const pick = (arr, k) => arr[Math.floor(k * arr.length) % arr.length];
/** Painted steel tube colour with chipped paint showing rust. */
const paint = (c, s = 0) => (x, y, z) => (hash(x, y, z, s + 40) < 0.05 ? 0x8a5a3a : gloss(shade(c, 0.9 + hash(x, y, z, s) * 0.12)));

const park = {
  // ------------------------------------------------------------- slatted park bench (cast-iron ends)
  park_bench: {
    name: 'Park Bench', voxel: 0.03,
    build(v) {
      v.jitter = 0.03;
      const wood = (x, y, z) => shade(mix(0xb07a44, 0x7a5a3e, vnoise(x, y, z, 6, 2) * 0.7), 0.88 + hash(x, y, z, 3) * 0.14);
      const iron = (x, y, z) => gloss(shade(0x2c3a32, 0.9 + hash(x, y, z, 4) * 0.1));
      const lean = (y) => -9 - Math.round((y - 16) * 0.2);
      for (const [z0, z1] of [[-7, -5], [-3, -1], [1, 3], [5, 7]]) fill(v, -26, 13, z0, 26, 14, z1, wood);
      for (const [y0, y1] of [[17, 19], [22, 24], [27, 29]]) for (let y = y0; y <= y1; y++) fill(v, -26, y, lean(y) - 1, 26, y, lean(y), wood);
      for (const sx of [-1, 1]) {
        const a = Math.min(sx * 21, sx * 23), b = Math.max(sx * 21, sx * 23);
        fill(v, a, 0, 5, b, 12, 6, iron);
        fill(v, a, 0, -8, b, 12, -7, iron);
        fill(v, a, 11, -8, b, 12, 6, iron);
        for (let y = 13; y <= 30; y++) fill(v, a, y, lean(y) - 2, b, y, lean(y) - 2, iron);
        fill(v, a, 20, -10, b, 21, 7, iron);
        fill(v, a, 13, 6, b, 19, 6, iron);
        fill(v, a - 1, 0, -9, b + 1, 0, -6, iron); fill(v, a - 1, 0, 4, b + 1, 0, 7, iron);
      }
      // weathering: sun-bleached tops, a carved heart, bird droppings, chewing gum underneath
      speckle(v, -26, 14, -7, 26, 14, 7, 0xe8e4d8, 0.012, 5);
      v.set(9, 22, lean(22) + 1, 0x5a3a26); v.set(10, 23, lean(23) + 1, 0x5a3a26); v.set(11, 22, lean(22) + 1, 0x5a3a26); v.set(10, 21, lean(21) + 1, 0x5a3a26);
      v.set(-14, 12, 2, 0xff8fb2);
      grime(v, 0, 8, 0.8);
    },
  },

  // ------------------------------------------------------------- swings (ブランコ): two seats on an A-frame
  swing_set: {
    name: 'Swings', voxel: 0.04,
    build(v) {
      v.jitter = 0.02;
      const blue = paint(0x2f6fb8, 1), yellow = paint(0xf2c41a, 2), chain = metal(0xb8bcc0);
      const T = 58;
      // top beam
      for (let y = T; y <= T + 1; y++) fill(v, -41, y, -1, 41, y, 0, yellow);
      // A-frame legs (both ends) + tie bar
      for (const sx of [-39, 39]) {
        for (const sz of [-20, 20]) v.line(sx, 0, sz, sx, T, 0, blue, 1);
        fill(v, sx - 1, 18, -14, sx, 18, 14, blue);
        for (const sz of [-20, 20]) fill(v, sx - 2, 0, sz - 2, sx + 2, 1, sz + 2, (x, y, z) => shade(0xa8a49c, 0.9 + hash(x, y, z, 6) * 0.1));
        fill(v, sx - 2, T - 1, -2, sx + 2, T + 2, 1, yellow);
      }
      // two seats with chains, one pushed back a little (still swinging)
      for (const [cx, sw] of [[-18, 0], [18, 4]]) {
        for (const dx of [-6, 6]) {
          v.line(cx + dx, T - 1, 0, cx + dx, 12, sw, chain);
          fill(v, cx + dx - 1, T - 1, -1, cx + dx + 1, T - 1, 0, metal(0x8a8e92));
        }
        fill(v, cx - 7, 10, sw - 3, cx + 7, 11, sw + 3, (x, y, z) => gloss(shade(y === 11 ? 0x2a2a2c : 0x1e1e20, 0.95 + hash(x, y, z, 7) * 0.08)));
        fill(v, cx - 7, 11, sw - 3, cx - 6, 12, sw + 3, gloss(0xd8342c)); fill(v, cx + 6, 11, sw - 3, cx + 7, 12, sw + 3, gloss(0xd8342c));
      }
      // worn dips in the ground under each seat
      for (const cx of [-18, 18]) v.shape(cx - 8, 0, -8, cx + 8, 0, 10, (x, y, z) => ((x - cx) / 8) ** 2 + (z / 9) ** 2 < 1 && hash(x, 0, z, 3) < 0.55, (x, y, z) => shade(0x8a7458, 0.9 + hash(x, y, z, 2) * 0.12));
      grime(v, 0, 10, 0.8);
    },
  },

  // ------------------------------------------------------------- steel slide (すべり台) with ladder and platform
  slide: {
    name: 'Slide', voxel: 0.04,
    build(v) {
      v.jitter = 0.02;
      const red = paint(0xd8382e, 3), yellow = paint(0xf2c41a, 4), steel = (x, y, z) => metal(shade(0xd8dce0, 0.9 + vnoise(x, y, z, 4, 1) * 0.15));
      const PY = 37, Z0 = -40, Z1 = -22;
      // platform deck + posts + rails
      fill(v, -10, PY - 1, Z0, 10, PY, Z1, (x, y, z) => gloss(shade(0x8a9096, 0.92 + hash(x, y, z, 5) * 0.08)));
      for (const [px, pz] of [[-10, Z0], [10, Z0], [-10, Z1], [10, Z1]]) fill(v, px - 1, 0, pz - 1, px, PY + 15, pz, red);
      for (const sx of [-10, 10]) { fill(v, sx - 1, PY + 15, Z0, sx, PY + 15, Z1, yellow); fill(v, sx - 1, PY + 8, Z0, sx, PY + 8, Z1, yellow); }
      fill(v, -10, PY + 15, Z0 - 1, 10, PY + 15, Z0, yellow);
      // ladder at the back
      for (const sx of [-8, 8]) v.line(sx, 0, Z0 - 12, sx, PY + 14, Z0 - 1, red, 0.6);
      for (let i = 1; i <= 7; i++) { const t = i / 8; fill(v, -8, Math.round(PY * t), Math.round(Z0 - 12 + 11 * t), 8, Math.round(PY * t), Math.round(Z0 - 12 + 11 * t), steel); }
      // the chute: steep run then a flat run-out
      const zEnd = 46;
      for (let z = Z1; z <= zEnd; z++) {
        const t = Math.min(1, (z - Z1) / 56), y = Math.round(PY - (PY - 9) * Math.sin(t * Math.PI / 2) ** 0.85);
        fill(v, -7, y - 1, z, 7, y, z, steel);
        for (const sx of [-8, 8]) fill(v, sx, y, z, sx, y + 3, z, steel);
      }
      for (const sx of [-6, 6]) fill(v, sx - 1, 0, zEnd - 4, sx, 8, zEnd - 3, red);
      fill(v, -7, 0, 10, 7, 0, 22, (x, y, z) => shade(0x8a7458, 0.9 + hash(x, y, z, 2) * 0.12));
      blotch(v, -10, 0, Z0 - 13, 10, 12, zEnd, 0x8a5a3a, 0.82, 3, 9);
      grime(v, 0, 8, 0.8);
    },
  },

  // ------------------------------------------------------------- drinking fountain (水飲み場)
  drinking_fountain: {
    name: 'Drinking Fountain', voxel: 0.025,
    build(v) {
      const conc = (x, y, z) => shade(mix(0xb8b4aa, 0x8a8680, vnoise(x, y, z, 4, 3) * 0.6), 0.92 + hash(x, y, z, 1) * 0.08);
      fill(v, -14, 0, -10, 14, 1, 10, (x, y, z) => shade(0x9a968e, 0.9 + hash(x, y, z, 2) * 0.1));
      fill(v, -5, 2, -5, 5, 29, 5, conc);
      // basin
      v.shape(-11, 30, -11, 11, 33, 11, (x, y, z) => Math.hypot(x, z) <= 10.5, conc);
      v.shape(-10, 32, -10, 10, 33, 10, (x, y, z) => Math.hypot(x, z) <= 8.5, null);
      v.shape(-9, 31, -9, 9, 31, 9, (x, y, z) => Math.hypot(x, z) <= 8.5, metal(0xc8ccd0));
      v.set(0, 31, 0, 0x2a2a2a);
      // goose-neck spout + push button, a side tap for hand washing
      fill(v, -1, 32, -8, 1, 37, -7, metal(0xd8dce0)); fill(v, -1, 37, -8, 1, 38, -3, metal(0xd8dce0)); v.set(0, 36, -3, metal(0xe8ecf0));
      fill(v, 3, 33, -10, 5, 34, -9, gloss(0x2a6ad8));
      fill(v, 5, 18, 5, 6, 20, 8, metal(0xc8ccd0)); fill(v, 5, 21, 7, 6, 22, 8, gloss(0xd8342c));
      // wet patch and moss at the foot
      v.shape(-14, 1, -10, 14, 1, 10, (x, y, z) => hash(x, y, z, 7) < 0.25, (x, y, z) => shade(0x6a6e60, 0.9));
      blotch(v, -6, 2, -6, 6, 8, 6, 0x5a7a3a, 0.72, 2, 4);
      grime(v, 0, 10, 0.78);
    },
  },

  // ------------------------------------------------------------- park lamp (公園灯)
  park_lamp: {
    name: 'Park Lamp', voxel: 0.05,
    build(v) {
      v.jitter = 0.02;
      const pole = (x, y, z) => gloss(shade(0x3e5a4c, 0.9 + hash(x, y, z, 1) * 0.1));
      fill(v, -3, 0, -3, 3, 1, 3, (x, y, z) => shade(0x9a968e, 0.92 + hash(x, y, z, 2) * 0.08));
      v.cylinder(0, 2, 0, 1.8, 6, pole);
      v.cylinder(0, 8, 0, 1.1, 74, pole);
      v.cylinder(0, 82, 0, 2.2, 2, pole);
      // lantern head: glowing drum, dark cap, finial
      v.cylinder(0, 84, 0, 3.6, 7, glow(0xfff0c8));
      for (const a of [0, 1, 2, 3]) { const x = Math.round(Math.cos(a * Math.PI / 2 + 0.78) * 3.8), z = Math.round(Math.sin(a * Math.PI / 2 + 0.78) * 3.8); fill(v, x, 84, z, x, 90, z, pole); }
      v.cylinder(0, 91, 0, 4.6, 1, pole);
      v.cylinder(0, 92, 0, 3.4, 1, pole);
      v.cylinder(0, 93, 0, 1.6, 1, pole);
      v.set(0, 94, 0, pole);
      // number plate + a sticker, rust at the foot
      fill(v, -1, 30, 1, 1, 33, 1, gloss(0xf4f0e6));
      v.set(0, 32, 2, 0x2a3a6a);
      blotch(v, -2, 2, -2, 2, 12, 2, 0x8a5a3a, 0.7, 2, 5);
    },
  },

  // ------------------------------------------------------------- wire litter basket on a post (くずかご)
  trash_basket: {
    name: 'Litter Basket', voxel: 0.025,
    build(v) {
      const wire = metal(0xa8acb0);
      fill(v, -1, 0, -1, 1, 34, 1, gloss(0x3e5a4c));
      v.shape(-9, 12, -9, 9, 34, 9, (x, y, z) => { const r = Math.hypot(x, z); return r <= 8.6 && r > 7.4 && ((x + y) % 3 === 0 || (x - y) % 3 === 0 || (z + y) % 3 === 0 || y === 12 || y === 34); }, wire);
      v.shape(-8, 12, -8, 8, 12, 8, (x, y, z) => Math.hypot(x, z) <= 7.6, wire);
      // what's in it: cans, a paper bag, a newspaper
      for (let i = 0; i < 7; i++) {
        const x = Math.round((hash(i, 1, 3) - 0.5) * 9), z = Math.round((hash(i, 2, 3) - 0.5) * 9), c = pick([0xe5383b, 0x2a7ad8, 0xf2c41a, 0xfbf8f0, 0x3cae5a], hash(i, 3, 3));
        fill(v, x - 1, 13 + (i % 3) * 3, z - 1, x + 1, 16 + (i % 3) * 3, z, gloss(c));
      }
      fill(v, -5, 22, -3, 3, 27, 2, 0xc8a878);
      fill(v, -9, 33, -5, -3, 33, 4, 0xe8e4d8);
      fill(v, -5, 30, 5, 5, 31, 6, gloss(0x2a6a3a));
      v.set(-2, 30, 7, 0xfbf8f0); v.set(0, 30, 7, 0xfbf8f0); v.set(2, 30, 7, 0xfbf8f0);
    },
  },

  // ------------------------------------------------------------- U-shaped steel bollard (車止め)
  bollard_u: {
    name: 'Bollard', voxel: 0.025,
    build(v) {
      const stripe = (x, y, z) => (Math.floor((y + Math.abs(x) * 0.6) / 4) % 2 ? gloss(0xf2c41a) : gloss(0x2a2a2a));
      for (const sx of [-14, 14]) v.cylinder(sx, 0, 0, 1.6, 26, (x, y, z) => (y < 18 ? gloss(0xf4f0e6) : stripe(x, y, z)));
      for (let k = 0; k <= 24; k++) {
        const a = Math.PI * k / 24, x = Math.cos(a) * 14, y = 26 + Math.sin(a) * 9;
        v.sphere(x, y, 0, 1.6, stripe);
      }
      fill(v, -15, 12, 2, -13, 15, 2, gloss(0xd8342c)); fill(v, 13, 12, 2, 15, 15, 2, gloss(0xd8342c));
      fill(v, -17, 0, -3, -11, 0, 3, 0x8a8680); fill(v, 11, 0, -3, 17, 0, 3, 0x8a8680);
      blotch(v, -16, 0, -2, 16, 8, 2, 0x8a5a3a, 0.75, 2, 2);
    },
  },

  // ------------------------------------------------------------- panda spring rider (スプリング遊具)
  spring_panda: {
    name: 'Spring Rider', voxel: 0.025,
    build(v) {
      v.jitter = 0.02;
      const W = 0xf4f0e6, K = 0x26262a;
      fill(v, -10, 0, -10, 10, 1, 10, 0x8a8680);
      for (let y = 2; y < 15; y++) { const a = y * 1.3; v.set(Math.round(Math.cos(a) * 3), y, Math.round(Math.sin(a) * 3), metal(0x4a4e52)); v.set(Math.round(Math.cos(a + 0.5) * 3), y, Math.round(Math.sin(a + 0.5) * 3), metal(0x5a5e62)); }
      // body + legs + head
      v.ellipsoid(0, 22, 0, 8, 7, 12, (x, y, z) => gloss(y < 20 && Math.abs(z) > 7 ? K : W));
      for (const [lx, lz] of [[-6, -8], [6, -8], [-6, 8], [6, 8]]) v.ellipsoid(lx, 17, lz, 3, 4, 3, gloss(K));
      v.ellipsoid(0, 30, 11, 7, 6.5, 6, gloss(W));
      for (const sx of [-1, 1]) {
        v.ellipsoid(sx * 5, 36, 10, 2.4, 2.4, 2, gloss(K));
        v.ellipsoid(sx * 3, 31, 16, 2, 2.4, 1, gloss(K)); v.set(sx * 3, 31, 17, gloss(0xfbf8f0));
        fill(v, sx * 9, 27, -1, sx * 11, 28, 1, gloss(0xd8342c));
      }
      v.set(0, 28, 17, gloss(K));
      // saddle
      fill(v, -4, 29, -4, 4, 30, 3, gloss(0xd8342c));
      speckle(v, -8, 15, -12, 8, 30, 12, 0xd8d0c0, 0.04, 3);
    },
  },

  // ------------------------------------------------------------- park clock on a pole (公園の時計)
  park_clock: {
    name: 'Park Clock', voxel: 0.04,
    build(v) {
      const pole = (x, y, z) => gloss(shade(0xd8dcd8, 0.9 + hash(x, y, z, 1) * 0.1));
      fill(v, -3, 0, -3, 3, 1, 3, 0x9a968e);
      v.cylinder(0, 2, 0, 1.2, 66, pole);
      // round two-faced clock (faces ±z), dark rim, little hood
      v.cylinder(0, 76, -2, 9, 5, gloss(0x2f4a3e), 'z');
      v.cylinder(0, 76, -2, 8, 1, gloss(0xfbf8f0), 'z');
      v.cylinder(0, 76, 2, 8, 1, gloss(0xfbf8f0), 'z');
      for (const zz of [-3, 3]) {
        for (let h = 0; h < 12; h++) { const a = h * Math.PI / 6; v.set(Math.round(Math.sin(a) * 7), Math.round(76 + Math.cos(a) * 7), zz, gloss(0x2a2a2a)); }
        // 5:40 — golden hour
        const hr = (5 + 40 / 60) / 12 * Math.PI * 2, mn = 40 / 60 * Math.PI * 2;
        v.line(0, 76, zz, Math.round(Math.sin(hr) * 4), Math.round(76 + Math.cos(hr) * 4), zz, gloss(0x1a1a1a));
        v.line(0, 76, zz, Math.round(Math.sin(mn) * 6), Math.round(76 + Math.cos(mn) * 6), zz, gloss(0x1a1a1a));
        v.set(0, 76, zz, gloss(0xd8342c));
      }
      fill(v, -10, 86, -4, 10, 86, 2, gloss(0x2f4a3e));
      fill(v, -7, 87, -3, 7, 87, 1, gloss(0x2f4a3e));
      v.set(0, 88, -1, gloss(0x2f4a3e));
      // a crow on top
      fill(v, -2, 88, -2, 2, 90, 0, 0x1a1a1e); fill(v, 2, 90, -1, 3, 91, -1, 0x1a1a1e); v.set(4, 90, -1, 0x3a3a3e); fill(v, -4, 88, -1, -3, 89, -1, 0x1a1a1e);
    },
  },

  // ------------------------------------------------------------- sandbox toys: bucket, spade, a moated sandcastle
  sand_toys: {
    name: 'Sand Toys', voxel: 0.02,
    build(v) {
      const sand = (x, y, z) => shade(0xd8c49a, 0.88 + hash(x, y, z, 4) * 0.14);
      // castle mound with a moat ring
      v.shape(-14, 0, -14, 14, 9, 14, (x, y, z) => Math.hypot(x, z) < 9 - y * 0.7, sand);
      fill(v, -3, 9, -3, 3, 12, 3, sand); v.set(0, 13, 0, sand);
      v.set(0, 14, 0, 0x5a3a26); fill(v, 1, 13, 0, 3, 14, 0, gloss(0xe5383b));
      // bucket on its side, spade, a tiny shovel
      v.cylinder(20, 0, 8, 5, 9, gloss(0xff8c2e), 'x');
      v.cylinder(21, 0, 8, 4, 8, null, 'x');
      fill(v, -22, 0, 6, -20, 0, 18, gloss(0x2a7ad8)); fill(v, -24, 0, 18, -18, 0, 23, gloss(0x2a7ad8));
      fill(v, 10, 0, -18, 16, 0, -16, gloss(0x3cae5a)); fill(v, 8, 0, -18, 9, 0, -14, gloss(0x3cae5a));
    },
  },

  // ------------------------------------------------------------- crushed litter for paths and benches
  park_litter: {
    name: 'Litter', voxel: 0.02,
    build(v) {
      // a can on its side, a crumpled ice-cream wrapper, a stick, a bottle cap, a dropped sweet wrapper
      v.cylinder(-10, 3, 0, 3, 10, (x, y, z) => gloss(y === 3 || x === -10 ? 0xc8ccd0 : 0xd8282a), 'x');
      v.shape(4, 0, -4, 10, 3, 2, (x, y, z) => hash(x, y, z, 2) < 0.7, (x, y, z) => (hash(x, y, z, 3) < 0.5 ? 0xfbf8f0 : 0x5ab4e8));
      fill(v, 12, 0, 4, 19, 0, 4, 0xd8b884);
      v.set(-2, 0, 8, metal(0xd8b040)); fill(v, -18, 0, -8, -15, 0, -6, gloss(0xff8fb2));
    },
  },

  // ------------------------------------------------------------- big summer zelkova (欅) — broad, layered canopy
  keyaki_tree: {
    name: 'Zelkova Tree', voxel: 0.11,
    build(v) {
      const BARK = bark([0x6e665a, 0x7e7464, 0x5e564c, 0x8a806e], 1.5);
      // vase-shaped: short trunk splitting into many upward limbs
      limbPath(v, [[0, 0, 0], [0, 10, 0], [1, 18, 0]], [3.4, 2.6, 2.3], BARK);
      for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.5; limb(v, [Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5], [0, 4, 0], 1.2, 2.0, BARK); }
      const limbs = [[[1, 18, 0], [-9, 34, 3], [-18, 48, 5]], [[1, 18, 0], [10, 33, -2], [19, 46, -4]], [[1, 18, 0], [3, 36, 10], [5, 52, 16]],
        [[1, 18, 0], [-2, 36, -10], [-5, 52, -15]], [[1, 18, 0], [2, 40, 0], [1, 60, 2]], [[1, 18, 0], [-7, 34, -6], [-12, 50, -10]], [[1, 18, 0], [8, 35, 7], [12, 52, 11]]];
      for (const pts of limbs) limbPath(v, pts, [1.8, 1.2, 0.7], BARK);
      const leaf = (x, y, z) => {
        const n = hash(x, y, z, 11), t = (y - 34) / 34, lit = (x * -0.45 + z * 0.55) / 30;
        if (n < 0.05) return 0x2e5a26;
        const base = t > 0.6 ? 0x6faa3e : t > 0.25 ? 0x5a9636 : 0x4a822e;
        return shade(base, 0.86 + n * 0.18 + lit * 0.18);
      };
      blob(v, [[-17, 50, 5, 12, 8, 11, 6], [18, 49, -4, 12, 8, 11, 6], [5, 55, 16, 11, 8, 10, 6], [-5, 55, -15, 11, 8, 10, 6], [1, 62, 1, 15, 9, 15, 7],
        [-12, 53, -10, 9, 7, 9, 5], [12, 54, 11, 9, 7, 9, 5], [0, 70, 0, 9, 5, 9, 5], [0, 46, 0, 16, 6, 16, 4]], leaf, { noise: 0.3, scale: 2.4, seed: 6 });
      // a lost ball stuck in the branches
      v.sphere(11, 40, 8, 1.2, gloss(0xe5383b));
      clipFloor(v);
    },
  },
};

export default park;
