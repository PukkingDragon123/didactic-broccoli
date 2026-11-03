// Life props: the opening chores, the side jobs and the trash loop (src/life/). Each entry: { name, voxel (metres per
// voxel), build(v) }. Facing +z, bottom-centre origin (see src/world/props.js).
import { shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glass, glow } from '../../voxel/VoxelModel.js';
import { hash, vnoise, fill, dust } from './garage.js';
import { mask5, textW5 } from '../../gfx/font5x7.js';
import street2 from './street2.js';

const pick = (a, r) => a[Math.floor(r * a.length) % a.length];

/** 5x7 capitals on the +z face: centred on cx, top row at y, at depth z. */
function stamp5(v, str, cx, y, z, col) {
  const x0 = cx - (textW5(str) >> 1);
  for (const [i, j] of mask5(str)) v.set(x0 + i, y - j, z, col);
}

/** Stamp a string set in a canvas font as voxels on the +z face (x right, y up), centred on (cx, cy). */
function stampFont(v, str, cx, cy, z, col, font = '"DotGothic16", monospace', size = 16) {
  const c = document.createElement('canvas');
  c.width = size * str.length + 8; c.height = size + 8;
  const g = c.getContext('2d');
  g.font = `${size}px ${font}`;
  g.textBaseline = 'top';
  g.fillStyle = '#fff';
  const w = Math.ceil(g.measureText(str).width);
  g.fillText(str, 4, 2);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (d[(y * c.width + x) * 4 + 3] < 110) continue;
    v.set(cx - (w >> 1) + x - 4, cy + (size >> 1) - y + 2, z, col);
  }
}

const life = {
  // ------------------------------------------------------------- chores
  rag: {
    name: 'Tenugui Rag', voxel: 0.006,
    build(v) {
      // a blue-and-white checked hand towel folded in three, one corner hanging
      for (let x = -14; x <= 14; x++) for (let z = -10; z <= 10; z++) for (let y = 0; y <= 3; y++) {
        const chk = ((x + 20) >> 2) % 2 ^ ((z + 20) >> 2) % 2;
        v.set(x, y, z, y === 3 || (x + z) % 9 ? (chk ? 0x3a6ab0 : 0xf2f0ea) : 0x2a4a80);
      }
      for (let z = 4; z <= 16; z++) for (let x = 6; x <= 14; x++) v.set(x, -((z - 4) >> 2), z, ((x >> 2) + (z >> 2)) % 2 ? 0x3a6ab0 : 0xf2f0ea);
    },
  },
  bin_bags: {
    name: 'Roll of Bin Bags', voxel: 0.006,
    build(v) {
      v.cylinder(0, 6, 0, 6.5, 30, (x, y, z) => gloss(hash(x, y, z, 2) < 0.1 ? 0x58a868 : (y & 3) ? 0x3a9a52 : 0x2f8a46), 'x');
      for (let x = -15; x <= 15; x += 30) v.cylinder(x, 6, 0, 2.5, 1, 0xd8ccb0, 'x');
      // the loose end of the roll
      for (let z = 6; z <= 14; z++) for (let x = -14; x <= 14; x++) v.set(x, 0, z, gloss(0x46a85a));
      stamp5(v, 'GOMI', 0, 9, 7, 0xffffff);
    },
  },
  coin_float: {
    name: 'Change Float', voxel: 0.006,
    build(v) {
      v.ellipsoid(0, 9, 0, 9, 9, 8, (x, y, z) => shade(0x9a6a3a, 0.9 + hash(x, y, z, 1) * 0.15));
      v.cylinder(0, 17, 0, 4, 4, 0x8a5a30);
      v.torus(0, 18, 0, 4, 1, 0xd8322a);
      for (let i = 0; i < 5; i++) v.cylinder(6 + i, 2 + i, 6, 3, 1, metal(i % 2 ? 0xd8dbe2 : 0xc8ccd2));
    },
  },
  junk_box: {
    name: 'Box of Old Parts', voxel: 0.012,
    build(v) {
      const kraft = (x, y, z) => shade(mix(0xc8965a, 0xa87a46, vnoise(x, y, z, 6, 4)), 0.94 + hash(x, y, z, 5) * 0.08);
      v.hollowBox(-19, 0, -16, 19, 30, 16, kraft, 1, []);
      fill(v, -19, 31, -16, 19, 31, 16, kraft); // closed flaps
      for (let x = -19; x <= 19; x++) v.set(x, 31, 0, 0x8a6236); // the seam
      fill(v, -19, 32, -3, 19, 32, 3, gloss(0xd8c08a)); // old tape
      // the side crushed in, and "PARTS" in Grandpa's marker
      for (let y = 4; y < 14; y++) for (let x = 9; x < 16; x++) if (v.has(x, y, 16)) { v.remove(x, y, 16); v.set(x, y, 15, shade(0xa87a46, 0.85)); }
      stamp5(v, 'PARTS', -2, 24, 17, 0x2a2420);
      stamp5(v, 'X', 13, 24, 17, 0xc8302a);
      dust(v, 0xb8ad98, 0.4, 3, 2);
    },
  },
  junk_box_open: {
    name: 'Box of Old Parts (open)', voxel: 0.012,
    build(v) {
      const kraft = (x, y, z) => shade(mix(0xc8965a, 0xa87a46, vnoise(x, y, z, 6, 4)), 0.94 + hash(x, y, z, 5) * 0.08);
      v.hollowBox(-19, 0, -16, 19, 30, 16, kraft, 1, ['+y']);
      // flaps folded out
      for (let i = 0; i < 9; i++) { fill(v, -19, 30 + i, 16 + i, 19, 30 + i, 16 + i, kraft); fill(v, -19, 30 + i, -16 - i, 19, 30 + i, -16 - i, kraft); }
      stamp5(v, 'PARTS', -2, 24, 17, 0x2a2420);
      // the junk: rusty springs, a bent crank handle, capsule halves, a coin mech
      fill(v, -18, 1, -15, 18, 22, 15, (x, y, z) => pick([0x6a5a4a, 0x7a6a58, 0x5a4a3c], hash(x, y, z, 7)));
      for (let i = 0; i < 4; i++) v.torus(-10 + i * 6, 24, -6 + (i % 2) * 8, 2.5, 0.8, metal(0x9a6a44), 'x');
      v.line(-14, 23, 6, 8, 27, -4, metal(0x8a8e92), 1);
      v.sphere(10, 23, 8, 4, gloss(0xe8453c)); v.sphere(-4, 23, 9, 3, gloss(0x3f86e8));
      fill(v, 2, 22, -12, 12, 27, -6, metal(0x7a7e84));
    },
  },
  cardboard_flat: {
    name: 'Bundle of Flattened Cardboard', voxel: 0.012,
    build(v) {
      for (let i = 0; i < 5; i++) fill(v, -22 + i, i * 2, -16 + (i % 2), 22 - (i % 3), i * 2 + 1, 16 - i, (x, y, z) => shade(0xc0905a, 0.9 + hash(x, y, z, i) * 0.12));
      for (const x of [-10, 10]) fill(v, x, 0, -17, x, 11, 17, 0xf2ecd8);
      fill(v, -23, 0, 0, 23, 11, 0, 0xf2ecd8);
    },
  },
  open_sign_prop: {
    name: 'OPEN Sign', voxel: 0.008,
    build(v) {
      const wood = (x, y, z) => shade(0xc89a5f, 0.88 + vnoise(x * 3, y, z, 3, 1) * 0.2);
      fill(v, -27, 0, -1, 27, 25, 1, wood);
      for (let x = -27; x <= 27; x++) { v.set(x, 0, 2, 0x6a4424); v.set(x, 25, 2, 0x6a4424); }
      fill(v, -23, 3, 2, 23, 20, 2, 0xf4ecd8);
      stampFont(v, '営業中', 0, 12, 3, 0xd8282a);
      // the cord
      v.line(-20, 25, 0, 0, 36, 0, 0x8a6a4a);
      v.line(20, 25, 0, 0, 36, 0, 0x8a6a4a);
    },
  },
  shop_trash_can: {
    name: 'Shop Trash Can', voxel: 0.012,
    build(v) {
      // a blue polypropylene bin with a white liner folded over the rim; open on top (the fill is drawn by the game)
      const blue = (x, y, z) => gloss(shade(0x2f6fb8, 0.9 + vnoise(x, y, z, 5, 3) * 0.15 - (y < 6 ? 0.08 : 0)));
      v.shape(-14, 0, -14, 14, 46, 14, (x, y, z) => {
        const r = 13 + y * 0.025;
        const d = Math.max(Math.abs(x), Math.abs(z));
        const corner = Math.abs(x) > r - 3 && Math.abs(z) > r - 3 && (Math.abs(x) - (r - 3)) ** 2 + (Math.abs(z) - (r - 3)) ** 2 > 9;
        return d <= r && d >= r - 1.2 && !corner || y === 0 && d <= r;
      }, blue);
      // ribs, the liner over the rim, a recycling label
      for (const y of [12, 24, 36]) v.paint(() => fill(v, -15, y, -15, 15, y, 15, gloss(0x2a62a8)));
      v.shape(-15, 42, -15, 15, 47, 15, (x, y, z) => { const d = Math.max(Math.abs(x), Math.abs(z)); return d >= 13 && d <= 15 && (y > 44 || d === 15); }, (x, y, z) => gloss(hash(x, y, z, 1) < 0.15 ? 0xdfe6e5 : 0xf6f8f6));
      fill(v, -6, 22, 14, 6, 30, 14, 0xf4f0e6);
      stamp5(v, 'GOMI', 0, 29, 15, 0x2f6fb8);
    },
  },
  can_fill: {
    name: 'Trash (fill)', voxel: 0.012,
    build(v) {
      // crumpled wrappers, capsule halves and receipts, a flat block the game scales up as the can fills
      const C = [0xe8453c, 0x3f86e8, 0xffd23f, 0xf4f0e6, 0x58c06c, 0xff6f91, 0xd8d0c0, 0xc8b898];
      fill(v, -12, 0, -12, 12, 4, 12, (x, y, z) => (y === 4 && hash(x, y, z, 9) < 0.2 ? null : gloss(pick(C, hash(x >> 1, y, z >> 1, 3)))));
    },
  },
  // ------------------------------------------------------------- the dog walk
  leash_handle: {
    name: 'Leash', voxel: 0.006,
    build(v) {
      v.torus(0, 14, 0, 9, 1.4, gloss(0xd8282a), 'z');
      fill(v, -2, 0, -1, 2, 5, 1, gloss(0xd8282a));
      v.cylinder(0, -3, 0, 2, 3, metal(0xc8ccd2));
    },
  },
  poop_bags: {
    name: 'Poop Bags', voxel: 0.006,
    build(v) {
      v.cylinder(0, 0, 0, 5, 14, (x, y, z) => gloss(y % 4 ? 0x58b86a : 0x3a9a52));
      v.cylinder(0, 14, 0, 2, 2, 0x2a2a2a);
    },
  },
  poop_bag_full: {
    name: 'Tied Poop Bag', voxel: 0.006,
    build(v) {
      v.ellipsoid(0, 6, 0, 6, 6, 5, (x, y, z) => gloss(hash(x, y, z, 2) < 0.2 ? 0x4a9a5a : 0x58b86a));
      fill(v, -1, 12, -1, 1, 15, 1, gloss(0x46a85a));
      v.set(-2, 16, 0, gloss(0x46a85a)); v.set(2, 16, 0, gloss(0x46a85a));
    },
  },
  dog_poop: {
    name: 'Dog Poop', voxel: 0.008,
    build(v) {
      for (let i = 0; i < 4; i++) v.torus(0, i * 2, 0, 5 - i, 1.6, (x, y, z) => shade(0x6a4422, 0.85 + hash(x, y, z, i) * 0.25), 'y');
      v.sphere(0, 8, 0, 1.5, 0x5a3a1e);
    },
  },
  // ------------------------------------------------------------- the car wash
  wash_bucket: {
    name: 'Bucket of Soapy Water', voxel: 0.012,
    build(v) {
      v.shape(-11, 0, -11, 11, 24, 11, (x, y, z) => { const r = 9 + y * 0.08, d = Math.hypot(x, z); return d <= r && (d >= r - 1.2 || y === 0); }, gloss(0x3f86e8));
      v.cylinder(0, 20, 0, 9.5, 1, (x, y, z) => (hash(x, y, z, 4) < 0.7 ? 0xf8fafc : 0xdfeaf2));
      for (let i = 0; i < 9; i++) v.sphere(-6 + hash(i, 1) * 12, 22, -6 + hash(i, 2) * 12, 1.8, 0xffffff);
      v.torus(0, 23, 0, 11, 0.6, metal(0xb8bcc0), 'x');
    },
  },
  sponge: {
    name: 'Sponge', voxel: 0.006,
    build(v) {
      fill(v, -10, 0, -6, 10, 4, 6, (x, y, z) => (hash(x, y, z, 3) < 0.12 ? 0xc8a020 : 0xf2d040));
      fill(v, -10, 5, -6, 10, 7, 6, (x, y, z) => (hash(x, y, z, 4) < 0.1 ? 0x2a7a3a : 0x3a9a4a));
    },
  },
  ladle: {
    name: 'Hishaku Ladle', voxel: 0.008,
    build(v) {
      const wood = (x, y, z) => shade(0xd4a46a, 0.9 + hash(x, y, z, 1) * 0.12);
      v.shape(-6, 0, -6, 6, 9, 6, (x, y, z) => { const d = Math.hypot(x, z); return d <= 6 && (d >= 5 || y === 0); }, wood);
      for (let y = 1; y < 9; y++) for (const a of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) v.set(Math.round(Math.cos(a) * 6), y, Math.round(Math.sin(a) * 6), shade(0xa87a46, 1));
      v.line(0, 7, -6, 0, 30, -44, wood, 0.6);
    },
  },
  // ------------------------------------------------------------- the windows
  squeegee: {
    name: 'Squeegee', voxel: 0.006,
    build(v) {
      fill(v, -22, 8, -2, 22, 11, 2, metal(0xc8ccd2));
      fill(v, -22, 5, -1, 22, 7, 1, 0x1a1a1a);
      fill(v, -2, 12, -2, 2, 42, 2, gloss(0x2f6fd6));
      fill(v, -3, 32, -3, 3, 42, 3, 0x1a1a1a);
    },
  },
  spray_bottle: {
    name: 'Spray Bottle', voxel: 0.006,
    build(v) {
      v.cylinder(0, 0, 0, 5, 24, glass(0x8ad0ff));
      v.cylinder(0, 2, 0, 4, 14, gloss(0x5ab8f0));
      fill(v, -2, 24, -2, 2, 30, 2, gloss(0xffffff));
      fill(v, -2, 28, 2, 2, 31, 7, gloss(0xffffff));
      fill(v, -1, 22, 3, 1, 27, 5, gloss(0xe8e8e8));
    },
  },
  // ------------------------------------------------------------- the street clean-up
  litter_can: {
    name: 'Crushed Can', voxel: 0.008,
    build(v) {
      v.cylinder(0, 3, 0, 3.3, 10, (x, y, z) => (y > 5 && y < 9 ? gloss(0xe8453c) : metal(0xc8ccd2)), 'x');
      for (let x = -2; x <= 2; x++) v.remove(x, 6, 3);
    },
  },
  litter_paper: {
    name: 'Scrap of Paper', voxel: 0.008,
    build(v) {
      v.ellipsoid(0, 3, 0, 5, 3, 4, (x, y, z) => (hash(x, y, z, 2) < 0.3 ? 0xd8d0c0 : 0xf4f0e6));
      v.ellipsoid(8, 2, 3, 3, 2, 3, (x, y, z) => (hash(x, y, z, 3) < 0.4 ? 0xe8b830 : 0xf4d870));
    },
  },
  petal_drift: {
    name: 'Drift of Petals and Leaves', voxel: 0.008,
    build(v) {
      v.jitter = 0.05;
      for (let x = -30; x <= 30; x++) for (let z = -22; z <= 22; z++) {
        const d = Math.hypot(x / 30, z / 22) + (vnoise(x, 0, z, 6, 2) - 0.5) * 0.5;
        if (d > 1) continue;
        const h = Math.floor((1 - d) * 2.4);
        for (let y = 0; y <= h; y++) {
          const r = hash(x, y, z, 5);
          v.set(x, y, z, r < 0.55 ? (r < 0.3 ? 0xffc2d4 : 0xf7a8c0) : r < 0.75 ? 0xa8946a : r < 0.9 ? 0x8a9a4a : 0xffe0ea);
        }
      }
    },
  },
  litter_butts: {
    name: 'Cigarette Butts', voxel: 0.006,
    build(v) {
      for (let i = 0; i < 4; i++) {
        const x0 = Math.round(hash(i, 1) * 16 - 8), z0 = Math.round(hash(i, 2) * 12 - 6);
        for (let k = 0; k < 6; k++) v.set(x0 + k, 0, z0 + (k >> 2), k < 2 ? 0xd88a3a : 0xf4f0e6);
      }
    },
  },
  // ------------------------------------------------------------- the garbage station, bare (the bags are drawn by src/life/trash.js)
  garbage_station_empty: {
    name: 'Garbage Collection Station (empty)', voxel: 0.02,
    build(v) {
      street2.garbage_station.build(v);
      // keep the pad and the rules board on its legs; lose the bags, the net and the crow
      const drop = [];
      v.forEach((x, y, z) => { if (y >= 2 && !(x >= 2 && x <= 37 && z >= -24 && z <= -22)) drop.push([x, y, z]); });
      for (const [x, y, z] of drop) v.remove(x, y, z);
      // the net, rolled up at the back with its yellow weights
      v.cylinder(-36, 4, -19, 2.5, 36, (x, y, z) => gloss((x + y + z) % 3 ? 0x2f9a6a : 0x247a52), 'x');
      for (const x of [-34, -20, -6]) v.cylinder(x, 4, -19, 3, 2, gloss(0xf2c83a), 'x');
    },
  },
  // ------------------------------------------------------------- the reopened shop
  hook_nail: {
    name: 'Sign Hook', voxel: 0.006,
    build(v) {
      fill(v, -1, 0, 0, 1, 2, 4, metal(0x8a8e92));
      fill(v, -1, 2, 3, 1, 5, 4, metal(0x8a8e92));
    },
  },
  breaker_lever: {
    name: 'Breaker Lever', voxel: 0.006,
    build(v) {
      fill(v, -3, 0, 0, 3, 12, 3, 0x2a2a2a);
      fill(v, -4, 10, 0, 4, 14, 5, gloss(0xd8282a));
      v.set(0, 3, 4, glow(0xffd23f));
    },
  },
};

export default life;
