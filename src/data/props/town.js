// Town props — the corner general store's stock and a few back-street extras.
// Each entry: { name, voxel (metres per voxel), build(v) }. Facing +z, bottom-centre origin. Deterministic.
import { shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';
import { hash, vnoise, fill, grime, blotch } from './garage.js';

// tiny 3×5 latin glyphs for labels
const ABC = {
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], I: ['###', '.#.', '.#.', '.#.', '###'], L: ['#..', '#..', '#..', '#..', '###'],
  K: ['#.#', '##.', '#..', '##.', '#.#'], W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], A: ['.#.', '#.#', '###', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
};
/** Paint a short latin label onto the +z face (x = left edge, y = top row). */
function label(v, str, x, y, col) {
  const rows = [0, 1, 2, 3, 4].map((r) => [...str].map((ch) => (ABC[ch] || ['..', '..', '..', '..', '..'])[r]).join('.'));
  v.project(rows, { '#': col }, x, y, '+z');
}

const pick = (arr, k) => arr[Math.floor(k * arr.length) % arr.length];

// ------------------------------------------------------------------ shop goods (one facing each, front at +z)
const GOODS = {
  /** Cup noodle: white cup, coloured band, foil lid. */
  cup(v, x, y, z, k) {
    const band = pick([0xe5383b, 0xf2a21a, 0x2a7ad8, 0x3cae5a], k);
    fill(v, x, y, z - 2, x + 4, y + 5, z + 2, (xx, yy) => gloss(yy === y + 2 || yy === y + 3 ? band : 0xfbf8f0));
    fill(v, x, y + 6, z - 2, x + 4, y + 6, z + 2, () => metal(0xd8d4c8));
    v.set(x + 2, y + 3, z + 2, gloss(0xffffff));
  },
  /** Pillow-shaped snack bag with a window and a logo stripe. */
  bag(v, x, y, z, k) {
    const c = pick([0xe5383b, 0xffd23f, 0x2a7ad8, 0xff8c2e, 0x8a5bd6, 0x3cae5a], k);
    fill(v, x, y, z - 1, x + 5, y + 7, z + 1, (xx, yy, zz) => gloss((yy === y || yy === y + 7) && zz !== z ? 0xd8d4c8 : c));
    v.set(x + 2, y + 4, z + 1, gloss(0xfbf8f0)); v.set(x + 3, y + 4, z + 1, gloss(0xfbf8f0));
    fill(v, x + 1, y + 2, z + 1, x + 4, y + 2, z + 1, () => gloss(shade(c, 0.6)));
  },
  /** Canned food tin with a paper label. */
  can(v, x, y, z, k) {
    const c = pick([0xd8282a, 0x2a8a4a, 0xf2c41a, 0x2a5ab0], k);
    fill(v, x, y, z - 1, x + 3, y + 4, z + 2, (xx, yy) => (yy === y || yy === y + 4 ? metal(0xc8ccd0) : gloss(yy === y + 2 ? 0xfbf8f0 : c)));
  },
  /** Bottle (soy sauce / oil / mirin). */
  bottle(v, x, y, z, k) {
    const body = pick([0x4a2a1a, 0xe8c040, 0x8a5a2a, 0xf4f0e0], k), cap = pick([0xe5383b, 0x3cae5a, 0xffd23f], k * 7);
    fill(v, x, y, z - 1, x + 2, y + 7, z + 1, (xx, yy) => glass(yy === y + 3 || yy === y + 4 ? 0xfbf8f0 : body));
    fill(v, x + 1, y + 8, z, x + 1, y + 10, z, () => glass(body));
    v.set(x + 1, y + 11, z, gloss(cap));
  },
  /** Standing curry / cereal box. */
  box(v, x, y, z, k) {
    const c = pick([0xf2a21a, 0xe5383b, 0x6a3a8a, 0x2a8ab0, 0xf4e0b0], k);
    fill(v, x, y, z - 2, x + 4, y + 8, z + 1, (xx, yy) => gloss(yy > y + 5 ? shade(c, 1.1) : c));
    fill(v, x + 1, y + 3, z + 1, x + 3, y + 5, z + 1, () => gloss(0xfbf8f0));
    v.set(x + 2, y + 4, z + 1, gloss(pick([0x8a3a1a, 0x3a2a1a], k)));
  },
  /** Detergent / shampoo bottle. */
  soap(v, x, y, z, k) {
    const c = pick([0x5ab4e8, 0xff8fb2, 0x9ad86a, 0xfbf8f0], k);
    fill(v, x, y, z - 2, x + 3, y + 8, z + 1, () => gloss(c));
    fill(v, x + 1, y + 9, z - 1, x + 2, y + 10, z, () => gloss(0xfbf8f0));
    fill(v, x, y + 3, z + 1, x + 3, y + 5, z + 1, () => gloss(0xfbf8f0));
  },
  /** Toilet roll multipack. */
  rolls(v, x, y, z, k) {
    const c = pick([0x7ab0e8, 0xff9fbf, 0x9ad86a], k);
    fill(v, x, y, z - 4, x + 9, y + 7, z + 3, (xx, yy, zz) => ((xx - x) % 3 === 1 && (yy - y) % 4 === 2 ? 0xe4e4dc : (yy === y + 7 || zz === z + 3) && (xx + yy) % 5 === 0 ? c : 0xfbfbf6));
    fill(v, x + 2, y + 2, z + 3, x + 7, y + 4, z + 3, () => gloss(c));
  },
  /** Bag of rice. */
  rice(v, x, y, z, k) {
    fill(v, x, y, z - 4, x + 9, y + 11, z + 2, (xx, yy) => (yy > y + 9 ? 0xe4dcc4 : 0xf2ecd8));
    fill(v, x + 2, y + 4, z + 2, x + 7, y + 8, z + 2, () => (k < 0.5 ? 0x3a8a3a : 0xd8282a));
  },
};

/** Steel gondola shelf stocked with goods. levels: array of [kind, ...] per shelf (bottom first). */
function stockedShelf(v, levels, seed) {
  const W = 30, D = 11, cream = (x, y, z) => gloss(shade(0xe8e2d2, 0.97 + hash(x, y, z, 3) * 0.04));
  // base plinth, uprights and back panel with peg holes
  fill(v, -W, 0, -D, W, 5, D, cream);
  fill(v, -W, 0, D, W, 5, D, () => gloss(0xb8b2a2));
  for (const x of [-W, W]) fill(v, x, 6, -D, x, 80, -D + 2, cream);
  fill(v, -W, 6, -D, W, 80, -D, (x, y) => ((x + 64) % 4 === 0 && y % 4 === 0 ? 0x8a8678 : 0xdcd6c4));
  fill(v, -W, 81, -D, W, 82, -D + 3, cream);
  const ys = [6, 25, 44, 63];
  ys.forEach((y0, li) => {
    if (li > 0) {
      fill(v, -W, y0 - 1, -D + 1, W, y0 - 1, D - 1, cream);
      fill(v, -W, y0 - 3, D - 1, W, y0 - 1, D, (x, y) => (y === y0 - 2 ? gloss(0xfbf8f0) : gloss(0xff8c2e)));
      for (let x = -W + 3; x < W - 3; x += 9) if (hash(x, y0, seed) < 0.6) { fill(v, x, y0 - 3, D, x + 3, y0 - 2, D, () => gloss(0xffd23f)); v.set(x + 1, y0 - 2, D, 0xd8282a); }
    }
    const kinds = levels[li] || ['box'];
    let x = -W + 2;
    let face = 0;
    while (x < W - 3) {
      const kind = kinds[Math.floor(hash(face >> 1, li, seed) * kinds.length)];
      const k = hash(face >> 1, li + 10, seed);
      const wdt = { cup: 5, bag: 6, can: 4, bottle: 3, box: 5, soap: 4, rolls: 10, rice: 10 }[kind] + 1;
      if (x + wdt > W - 1) break;
      // two rows deep: front row at z≈+5, back row at z≈-4
      GOODS[kind](v, x, li === 0 ? y0 : y0, 5, k);
      if (kind !== 'rolls' && kind !== 'rice') GOODS[kind](v, x, y0, -4, k);
      x += wdt;
      face++;
      if (hash(face, li, seed + 5) < 0.06) x += 3; // a gap where something sold out
    }
  });
  grime(v, 0, 4, 0.85);
}

const town = {
  // ------------------------------------------------------------- shelves
  goods_shelf: {
    name: 'Grocery Shelf', voxel: 0.02,
    build(v) {
      v.jitter = 0.02;
      stockedShelf(v, [['rice', 'rolls'], ['can', 'bottle'], ['cup', 'box'], ['bag']], 3);
    },
  },
  goods_shelf2: {
    name: 'Daily Goods Shelf', voxel: 0.02,
    build(v) {
      v.jitter = 0.02;
      stockedShelf(v, [['rolls'], ['soap', 'box'], ['bag', 'cup'], ['bag', 'can']], 8);
    },
  },

  // ------------------------------------------------------------- drinks fridge with milk
  milk_fridge: {
    name: 'Milk & Drinks Fridge', voxel: 0.02,
    build(v) {
      v.jitter = 0.015;
      const W = 21, D = 16, H = 92;
      const enamel = (x, y, z) => gloss(shade(0xf2efe6, 0.96 + vnoise(x, y, z, 6, 2) * 0.05));
      fill(v, -W, 0, -D, W, 4, D, () => gloss(0x4a4e52));
      v.hollowBox(-W, 5, -D, W, H, D, enamel, 2, ['front']);
      // lit header with a MILK sign
      fill(v, -W, H - 10, D - 2, W, H, D, (x, y) => glow(y === H - 10 || y === H ? 0x2a6ad8 : 0xf4f8ff));
      label(v, 'MILK', -8, H - 3, glow(0x2a6ad8));
      // interior: back light panel, wire shelves, bottles and cartons
      fill(v, -W + 2, 6, -D + 2, W - 2, H - 11, -D + 2, () => glow(0xe8f0f4));
      const shelvesY = [8, 28, 48, 68];
      shelvesY.forEach((y0, li) => {
        fill(v, -W + 2, y0 - 1, -D + 2, W - 2, y0 - 1, D - 4, () => metal(0xc8ccd0));
        for (let x = -W + 3; x < W - 3;) {
          const k = hash(x, li, 4);
          if (li >= 2) {
            // glass milk bottles with coloured paper caps
            const cap = k < 0.5 ? 0x2a6ad8 : k < 0.75 ? 0xd8282a : 0x8a5a2a;
            const milk = cap === 0x8a5a2a ? 0xd8b890 : 0xfbfbf6;
            for (const z of [6, 0, -6]) {
              fill(v, x, y0, z - 1, x + 2, y0 + 8, z + 1, () => glass(milk));
              fill(v, x, y0 + 9, z - 1, x + 2, y0 + 10, z + 1, () => glass(0xe8f4f4));
              fill(v, x, y0 + 11, z - 1, x + 2, y0 + 11, z + 1, () => gloss(cap));
            }
            x += 4;
          } else {
            // gable-top cartons: milk / coffee milk / orange juice
            const c = k < 0.5 ? 0x2a6ad8 : k < 0.75 ? 0x8a5a2a : 0xff8c2e;
            for (const z of [5, -3]) {
              fill(v, x, y0, z - 3, x + 4, y0 + 11, z + 2, (xx, yy) => gloss(yy > y0 + 3 && yy < y0 + 8 ? c : 0xfbfbf6));
              fill(v, x + 1, y0 + 12, z - 1, x + 3, y0 + 13, z, () => gloss(0xfbfbf6));
            }
            x += 6;
          }
        }
      });
      // glass door with chrome frame and a vertical handle
      fill(v, -W, 5, D, W, H - 11, D, (x, y) => (Math.abs(x) === W || y === 5 || y === H - 11 ? metal(0xd8dce0) : glass(0xdfeef4)));
      fill(v, W - 3, 30, D + 1, W - 3, 62, D + 2, () => metal(0xe4e6ea));
      // condenser grille + sticker
      for (let x = -W + 2; x < W - 1; x += 2) fill(v, x, 1, D + 1, x, 3, D + 1, () => 0x2a2a2a);
      fill(v, -W, 22, D + 1, -W + 5, 26, D + 1, () => gloss(0xffd23f));
      grime(v, 0, 6, 0.8);
    },
  },

  // ------------------------------------------------------------- counter bell
  call_bell: {
    name: 'Counter Bell', voxel: 0.005,
    build(v) {
      v.cylinder(0, 0, 0, 7.5, 2, gloss(0x1a1a1a));
      v.shape(-7, 2, -7, 7, 9, 7, (x, y, z) => x * x + z * z + ((y - 2) * 1.05) ** 2 <= 46, (x, y, z) => metal(y > 6 && x < 0 ? 0xf4f6f8 : 0xc8ccd2));
      v.box(0, 10, 0, 0, 11, 0, metal(0xb8bcc2));
      v.box(-1, 12, -1, 1, 12, 1, metal(0xe4e6ea));
    },
  },

  // ------------------------------------------------------------- propane cylinders
  propane: {
    name: 'Propane Cylinders', voxel: 0.025,
    build(v) {
      v.jitter = 0.02;
      fill(v, -16, 0, -8, 16, 1, 8, (x, y, z) => shade(0x9a968c, 0.95 + hash(x, y, z, 2) * 0.06));
      for (const cx of [-7, 7]) {
        v.cylinder(cx, 2, 0, 6.4, 40, (x, y, z) => gloss(shade(0xb8bcc0, 0.93 + vnoise(x, y, z, 5, cx) * 0.1)));
        v.shape(cx - 7, 42, -7, cx + 7, 47, 7, (x, y, z) => (x - cx) ** 2 + z * z + ((y - 41) * 1.6) ** 2 <= 44, gloss(0xb8bcc0));
        v.tube(cx, 47, 0, 3.4, 2.2, 4, gloss(0xb8bcc0));
        v.box(cx, 49, 0, cx, 50, 0, metal(0xc8a040));
        v.box(cx - 3, 24, 6, cx + 3, 30, 7, gloss(0xfbf8f0));
        v.box(cx - 2, 26, 7, cx + 2, 26, 7, 0x2a2a2a);
      }
      v.line(-7, 50, 0, -7, 54, 3, 0x2a2a2a); v.line(7, 50, 0, 7, 54, 3, 0x2a2a2a);
      fill(v, -9, 54, 2, 9, 56, 4, () => gloss(0x8a8e92));
      for (let x = -15; x <= 15; x += 2) v.set(x, 36, -7, metal(0x8a8e92));
      blotch(v, -15, 2, -8, 15, 12, 8, gloss(0x8a6a4a), 0.8, 3, 4);
      grime(v, 0, 10, 0.8);
    },
  },

  // ------------------------------------------------------------- old twin-tub washer (alley)
  twin_tub: {
    name: 'Twin-tub Washer', voxel: 0.025,
    build(v) {
      v.jitter = 0.02;
      const W = 15, D = 9;
      fill(v, -W, 0, -D, W, 34, D, (x, y, z) => gloss(shade(0xf0ece2, 0.94 + vnoise(x, y, z, 4, 1) * 0.08)));
      fill(v, -W, 35, -D, -1, 36, D, () => gloss(0x6ab0d8));
      fill(v, 1, 35, -D, W, 36, D, () => gloss(0x6ab0d8));
      fill(v, -W, 30, D + 1, W, 33, D + 1, () => gloss(0xd8d4c8));
      for (const x of [-10, -4, 6]) { v.box(x, 31, D + 2, x + 1, 32, D + 2, gloss(0x2a2a2a)); }
      label(v, 'WASH', -8, 26, gloss(0x2a6ad8));
      v.line(W, 4, 0, W + 4, 0, 4, 0x8a8e92);
      blotch(v, -W, 0, -D, W, 8, D, gloss(0x9a7a5a), 0.72, 3, 5);
      grime(v, 0, 10, 0.75);
    },
  },

  // ------------------------------------------------------------- weeds along walls
  weeds: {
    name: 'Roadside Weeds', voxel: 0.03,
    build(v) {
      v.jitter = 0.06;
      for (let i = 0; i < 14; i++) {
        const x = Math.round((hash(i, 1, 9) - 0.5) * 22), z = Math.round((hash(i, 2, 9) - 0.5) * 6), h = 3 + Math.floor(hash(i, 3, 9) * 9);
        const c = mix(0x4a7a2a, 0x8aa83a, hash(i, 4, 9));
        for (let y = 0; y < h; y++) v.set(x + (y > h * 0.6 ? Math.sign(x) : 0), y, z, shade(c, 0.8 + y / h * 0.3));
        if (hash(i, 5, 9) < 0.4) v.set(x, h, z, hash(i, 6, 9) < 0.5 ? 0xffe066 : 0xfbf8f0);
      }
      for (let i = 0; i < 20; i++) v.set(Math.round((hash(i, 7, 9) - 0.5) * 24), 0, Math.round((hash(i, 8, 9) - 0.5) * 7), 0x5a8a32);
    },
  },
};

export default town;
