// Off-Hobby props (src/market): traditional good-luck charms (kumade rake, hamaya arrow, ema plaque, koban coins,
// six gourds, an Inari fox), counter tip jars, junk-lot trinkets, the brick a scammer ships you, and the OUTGOING crate
// by the shutter. Each entry: { name, voxel (metres per voxel), build(v) }; facing +z, bottom-centre origin.
import { shade } from '../../voxel/palette.js';
import { gloss, metal, glass } from '../../voxel/VoxelModel.js';
import { hash } from './garage.js';
import { mask5, textW5 } from '../../gfx/font5x7.js';

const INK = 0x1a1416, GOLD = 0xf2c14e, GOLD_D = 0xb8862a, RED = 0xc8221e, BAMBOO = 0xd8b46a, BAMBOO_D = 0xa8844a, WOOD = 0x8a5a32;
/** 5x7 capitals on the +z face, centred on cx with the top row at y, at depth z. */
function stamp5(v, str, cx, y, z, col) {
  const x0 = cx - (textW5(str) >> 1);
  for (const [i, j] of mask5(str)) v.set(x0 + i, y - j, z, col);
}
/** A small wooden display stand (a block with a groove) the charms sit or stand in. */
function standBase(v, w, d, h = 2) {
  v.box(-w, 0, -d, w, h - 1, d, (x, y, z) => gloss(shade(WOOD, 0.9 + hash(x, y, z, 3) * 0.12)));
  v.box(-w, h - 1, -d, w, h - 1, -d, gloss(shade(WOOD, 0.75)));
}

export default {
  // ------------------------------------------------------------- kumade: the bamboo rake that "rakes in" luck
  mk_kumade: {
    name: 'Kumade Rake', voxel: 0.006,
    build(v) {
      standBase(v, 9, 5);
      // handle
      v.box(-1, 2, -1, 0, 26, 0, (x, y, z) => gloss(shade(y % 7 === 0 ? BAMBOO_D : BAMBOO, 0.92 + hash(x, y, z, 1) * 0.1)));
      // the fan of tines
      for (let i = -6; i <= 6; i++) {
        const a = i * 0.21;
        v.line(0, 26, 0, Math.round(Math.sin(a) * 22), Math.round(26 + Math.cos(a) * 24), 0, gloss(shade(BAMBOO, 0.88 + (i & 1) * 0.08)));
        v.set(Math.round(Math.sin(a) * 23), Math.round(26 + Math.cos(a) * 25) - 1, 1, gloss(BAMBOO_D)); // curled tips
      }
      // backing board the lucky things are stuck to
      v.shape(-15, 30, -1, 15, 46, -1, (x, y) => (x * x) / 225 + ((y - 30) * (y - 30)) / 300 <= 1, gloss(0x2a2a30));
      // decorations: koban coins, a red sea bream, an otafuku face, pine sprigs, a rice bale
      for (const [x, y] of [[-9, 38], [9, 38], [-4, 44]]) { v.ellipsoid(x, y, 1, 2.6, 3.6, 1, gloss(GOLD)); v.set(x, y + 1, 2, gloss(GOLD_D)); v.set(x, y - 1, 2, gloss(GOLD_D)); }
      v.ellipsoid(5, 44, 1, 4, 2.2, 1.4, gloss(0xe8455a)); v.set(9, 44, 1, gloss(0xe8455a)); v.set(10, 45, 1, gloss(0xe8455a)); v.set(10, 43, 1, gloss(0xe8455a)); v.set(3, 45, 2, INK);
      v.ellipsoid(0, 36, 2, 4.5, 5, 2, gloss(0xfbf4ea)); v.set(-2, 37, 4, INK); v.set(2, 37, 4, INK); v.set(-3, 35, 4, gloss(0xff9fae)); v.set(3, 35, 4, gloss(0xff9fae)); v.set(0, 34, 4, gloss(0xd8282a));
      v.box(-2, 41, 3, -2, 41, 3, INK); v.box(2, 41, 3, 2, 41, 3, INK); // eyebrow dots
      for (const [x, y] of [[-13, 33], [13, 33], [-11, 43], [12, 41]]) { v.box(x - 1, y, 0, x + 1, y + 1, 1, gloss(0x3a7a3a)); v.set(x, y + 2, 0, gloss(0x58a058)); }
      v.box(-6, 31, 0, 6, 33, 2, gloss(0xe8d8a8)); v.box(-6, 31, 3, 6, 33, 3, gloss(0xd8282a)); v.box(-6, 32, 3, 6, 32, 3, gloss(0xfbf4ea));
      // red and white cord bow at the neck
      v.box(-3, 25, 1, 3, 26, 2, gloss(RED)); v.box(-4, 23, 1, -3, 24, 2, gloss(RED)); v.box(3, 23, 1, 4, 24, 2, gloss(0xfbf4ea));
    },
  },

  // ------------------------------------------------------------- hamaya: the demon-breaking arrow, standing in a block
  mk_hamaya: {
    name: 'Hamaya Arrow', voxel: 0.006,
    build(v) {
      standBase(v, 6, 5, 4);
      v.box(-1, 4, -1, 0, 60, 0, (x, y, z) => gloss(shade(0xf4ece0, 0.95 + hash(x, y, z, 2) * 0.05)));
      // white fletching with black bands
      for (let y = 6; y < 16; y++) for (const s of [-1, 1]) { const w = Math.min(4, 1 + (y - 6) * 0.5); for (let x = 1; x <= w; x++) v.set(s > 0 ? x : -x - 1, y, 0, gloss(y % 4 === 0 ? INK : 0xfbf8f2)); }
      // gold tip (blunt, a shrine arrow) and the red ribbon + bell + little ema tag
      v.box(-1, 60, -1, 0, 63, 0, metal(GOLD)); v.set(-1, 64, 0, metal(GOLD));
      v.box(-2, 46, -2, 1, 48, 1, gloss(RED));
      v.line(1, 46, 1, 4, 38, 2, gloss(RED)); v.line(-2, 46, 1, -5, 39, 2, gloss(RED));
      v.ellipsoid(4, 36, 2, 1.6, 1.6, 1.6, metal(GOLD));
      v.box(-9, 31, 1, -3, 37, 1, gloss(0xe8c890)); v.box(-8, 37, 1, -4, 38, 1, gloss(0xe8c890));
      v.box(-8, 33, 2, -4, 35, 2, gloss(RED));
    },
  },

  // ------------------------------------------------------------- ema: a wooden wish plaque on a little easel
  mk_ema: {
    name: 'Ema Plaque', voxel: 0.005,
    build(v) {
      standBase(v, 12, 4);
      // pentagon board leaning back slightly
      for (let y = 0; y < 22; y++) {
        const w = y < 16 ? 12 : 12 - (y - 15) * 2;
        v.box(-w, 2 + y, Math.round(-y * 0.15), w, 2 + y, Math.round(-y * 0.15) + 1, (x, yy, z) => gloss(shade(0xe8c890, 0.9 + hash(x, yy, z, 5) * 0.1)));
      }
      // painted horse (the classic) in red and black, and a 願 scribble as a line of ink
      v.project(['....KK......', '...KKKK.....', '..KK.KKKKKKK', '.....KKKKKKK', '.....K.K..K.', '.....K.K..K.'], { K: gloss(0x8a2a1a) }, -6, 18, '+z', { raise: false });
      v.project(['RRRRRRRR'], { R: gloss(RED) }, -4, 9, '+z');
      v.project(['K.KK.K.KKK.K'], { K: gloss(INK) }, -6, 6, '+z');
      // red cord through the top
      v.box(-1, 24, -3, 1, 26, -3, gloss(RED));
    },
  },

  // ------------------------------------------------------------- koban: gold coins on a red cushion
  mk_koban: {
    name: 'Lucky Koban', voxel: 0.004,
    build(v) {
      v.box(-14, 0, -10, 14, 3, 10, (x, y, z) => gloss(shade(RED, 0.88 + hash(x, y, z, 4) * 0.1)));
      for (const s of [-1, 1]) for (const t of [-1, 1]) v.box(s * 14, 4, t * 10, s * 14, 5, t * 10, gloss(GOLD)); // tassels
      // a standing coin and two lying ones
      v.shape(-7, 4, -2, 7, 26, 1, (x, y) => (x * x) / 49 + ((y - 15) * (y - 15)) / 121 <= 1, (x, y, z) => metal(shade(GOLD, 0.9 + hash(x, y, z, 2) * 0.14)));
      for (let y = 8; y <= 22; y += 3) v.box(-4, y, 2, 4, y, 2, metal(GOLD_D));
      for (const [cx, cz] of [[-9, 5], [9, 6]]) v.shape(cx - 5, 4, cz - 3, cx + 5, 5, cz + 3, (x, y, z) => ((x - cx) ** 2) / 25 + ((z - cz) ** 2) / 9 <= 1, metal(GOLD));
    },
  },

  // ------------------------------------------------------------- mubyo: six little gourds on a red cord
  mk_hyotan: {
    name: 'Six Gourds', voxel: 0.004,
    build(v) {
      standBase(v, 16, 5);
      v.box(-1, 2, -1, 1, 40, 1, gloss(shade(WOOD, 1.1)));
      v.box(-14, 39, -1, 14, 40, 1, gloss(shade(WOOD, 1.1)));
      for (let i = 0; i < 6; i++) {
        const x = -12 + i * 5 - (i > 2 ? 0 : 1) + (i > 2 ? 1 : 0), top = 37 - (i % 2) * 6;
        v.line(x, 39, 0, x, top, 0, gloss(RED));
        v.ellipsoid(x, top - 3, 0, 2, 2, 2, gloss(0xe8b84a));
        v.ellipsoid(x, top - 7.5, 0, 2.6, 3, 2.6, gloss(0xe8b84a));
        v.set(x - 1, top - 6, 2, gloss(0xf8d878));
      }
    },
  },

  // ------------------------------------------------------------- an Inari fox statuette with a red bib
  mk_kitsune: {
    name: 'Inari Fox', voxel: 0.005,
    build(v) {
      v.box(-8, 0, -7, 8, 3, 7, (x, y, z) => gloss(shade(0x9a9a92, 0.88 + hash(x, y, z, 6) * 0.14)));
      const W = (x, y, z) => gloss(shade(0xfbf6ea, 0.95 + hash(x, y, z, 1) * 0.05));
      v.ellipsoid(0, 12, -1, 6, 9, 5.5, W); // seated body
      v.ellipsoid(0, 6, 3, 5, 3, 4, W); // haunches
      v.line(4, 6, -5, 8, 20, -6, W, 2); // tail up behind
      v.ellipsoid(8, 22, -6, 2.6, 3.6, 2.6, W);
      v.ellipsoid(0, 24, 1, 5, 4.6, 4.6, W); // head
      v.ellipsoid(0, 22.5, 5, 2.2, 2, 3, W); // snout
      v.set(0, 23, 8, INK);
      for (const s of [-1, 1]) { v.line(s * 3, 27, 0, s * 4, 32, -1, W, 1); v.set(s * 4, 31, 0, gloss(0xe8455a)); v.set(s * 2, 25, 5, gloss(RED)); v.set(s * 2, 26, 5, INK); }
      // red bib (yodarekake)
      v.shape(-5, 15, 2, 5, 19, 6, (x, y, z) => z >= 2 + Math.abs(x) * 0.2 && y >= 15 + Math.abs(x) * 0.5, gloss(RED));
      // a key in its mouth (the granary key of Inari)
      v.box(-4, 21, 6, 4, 21, 6, metal(GOLD));
    },
  },

  // ------------------------------------------------------------- tip jars
  mk_jar_pickle: {
    name: 'Pickle Jar Tip Jar', voxel: 0.005,
    build(v) {
      v.cylinder(0, 0, 0, 10, 26, glass(0xd8eef0));
      v.cylinder(0, 26, 0, 8, 2, glass(0xd8eef0));
      v.cylinder(0, 28, 0, 9, 3, metal(0xd84a3a));
      v.box(-2, 31, -2, 2, 31, -2, metal(0x2a2220)); // coin slot in the lid
      // paper label with TIPS in marker
      v.box(-7, 8, 10, 7, 18, 10, gloss(0xfbf4e0));
      stamp5(v, 'TIPS', 0, 16, 11, gloss(INK));
      v.box(-6, 9, 11, 6, 9, 11, gloss(0xe8455a));
    },
  },
  mk_jar_kappa: {
    name: 'Kappa Tip Jar', voxel: 0.005,
    build(v) {
      const G = (x, y, z) => gloss(shade(0x58a058, 0.9 + hash(x, y, z, 3) * 0.12));
      v.ellipsoid(0, 10, 0, 10, 10, 9, G);
      v.ellipsoid(0, 9, 6, 6, 6, 4, gloss(0xe8d878)); // belly
      v.ellipsoid(0, 26, 0, 9, 8, 8, G); // head
      v.cylinder(0, 33, 0, 6, 1, gloss(0xd8e8e0)); // the dish (coins go here)
      v.cylinder(0, 34, 0, 5, 1, glass(0x9ad8f0));
      v.ellipsoid(0, 24, 7, 4, 2, 2, gloss(0xf2c14e)); // beak
      for (const s of [-1, 1]) { v.set(s * 4, 28, 8, INK); v.set(s * 4, 29, 8, gloss(0xffffff)); for (let i = 0; i < 4; i++) v.set(s * (6 + i * 0.5) | 0, 33 - i, 3, gloss(0x2a3a2a)); }
      v.box(-6, 10, 10, 6, 14, 10, gloss(0xfbf4e0));
      stamp5(v, 'TIPS', 0, 13, 11, gloss(INK));
    },
  },
  mk_jar_ramen: {
    name: 'Ramen Bowl Tip Jar', voxel: 0.005,
    build(v) {
      v.cylinder(0, 0, 0, 7, 2, gloss(0xe8e0d0));
      for (let y = 2; y < 14; y++) v.tube(0, y, 0, 8 + Math.floor((y - 2) * 0.5), 6 + Math.floor((y - 2) * 0.5), 1, (x, yy, z) => gloss(yy > 10 ? 0xd8282a : (Math.floor(Math.atan2(z, x) * 4) & 1) && yy > 5 && yy < 9 ? 0xd8282a : 0xfbf6ea));
      v.cylinder(0, 2, 0, 9, 7, metal(0xe0b860)); // a pile of coins inside
      v.box(-6, 6, 11, 6, 10, 11, gloss(0xfbf4e0));
      stamp5(v, 'TIPS', 0, 10, 12, gloss(INK));
    },
  },
  mk_jar_daruma: {
    name: 'Daruma Coin Bank', voxel: 0.005,
    build(v) {
      v.ellipsoid(0, 13, 0, 11, 13, 10, (x, y, z) => gloss(shade(RED, 0.88 + y * 0.004 + hash(x, y, z, 3) * 0.04)));
      v.paint(() => v.shape(-8, 13, 0, 8, 24, 11, (x, y) => (x / 6.5) ** 2 + ((y - 18) / 5) ** 2 <= 1, gloss(0xf6efe0)));
      v.project(['.KKK.....KKK.', 'K...K...KKKKK', '.KKK.....KKK.'], { K: INK }, -6, 20, '+z');
      v.box(-3, 26, -1, 3, 26, 0, INK); // coin slot
      v.project(['GGGGGGG'], { G: gloss(GOLD) }, -3, 8, '+z');
    },
  },

  // ------------------------------------------------------------- junk lot trinkets + the scammer's brick
  mk_brick: {
    name: 'Brick in Newspaper', voxel: 0.01,
    build(v) {
      v.box(-11, 0, -5, 11, 6, 5, (x, y, z) => gloss(shade((x + y + z) % 5 === 0 ? 0xc8c0b0 : 0xe8e0d0, 0.92 + hash(x, y, z, 8) * 0.1)));
      for (let x = -10; x <= 10; x += 2) v.set(x, 6, (x * 7) % 9 - 4, gloss(0x5a5a5a)); // newsprint lines
      for (let x = -9; x <= 9; x += 3) for (let z = -4; z <= 4; z += 2) v.set(x, 6, z, gloss(0x8a8a8a));
      v.box(-11, 2, 5, -6, 4, 5, gloss(0xb04a2a)); // brick peeking through a tear
      v.box(-1, 0, -6, 0, 7, 6, gloss(0xc8a878)); // string
    },
  },
  mk_trinket_button: { name: 'Big Button', voxel: 0.003, build(v) { v.cylinder(0, 0, 0, 7, 2, gloss(0xe8455a)); for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) v.set(x, 2, z, null); v.tube(0, 2, 0, 7, 6, 1, gloss(0xc8303a)); } },
  mk_trinket_spoon: { name: 'Souvenir Spoon', voxel: 0.003, build(v) { v.box(-1, 0, -14, 1, 0, 4, metal(0xc8ccd2)); v.ellipsoid(0, 0, 8, 3, 1, 4, metal(0xc8ccd2)); v.box(-2, 1, -16, 2, 1, -13, metal(GOLD)); } },
  mk_trinket_cassette: { name: 'Mixtape', voxel: 0.003, build(v) { v.box(-16, 0, -10, 16, 4, 10, gloss(0x2a2a30)); v.box(-12, 5, -6, 12, 5, 4, gloss(0xfbf4e0)); v.box(-8, 5, -2, -5, 5, 1, gloss(0x5a3a2a)); v.box(5, 5, -2, 8, 5, 1, gloss(0x5a3a2a)); stamp5(v, 'MIX', 0, 6, 6, gloss(0xe8455a)); } },
  mk_trinket_keychain: { name: 'Keychain', voxel: 0.003, build(v) { v.torus(0, 10, 0, 4, 0.8, metal(0xd8dce2), 'z'); v.line(0, 6, 0, 0, 3, 0, metal(0xd8dce2)); v.ellipsoid(0, 0, 0, 4, 4, 2, gloss(0xffd23f)); v.set(-1, 1, 2, INK); v.set(1, 1, 2, INK); } },
  mk_trinket_batteries: { name: 'Old Batteries', voxel: 0.003, build(v) { for (const x of [-5, 0, 5]) { v.cylinder(x, 0, 0, 2, 14, gloss(0x2a2a30)); v.cylinder(x, 10, 0, 2, 4, gloss(0xd8b830)); v.set(x, 14, 0, metal(0xd8dce2)); } } },
  mk_trinket_marble: { name: 'Ramune Marble', voxel: 0.002, build(v) { v.sphere(0, 5, 0, 5, glass(0x8ad8f0)); v.sphere(1, 6, 1, 2, glass(0xc8f0ff)); } },

  // ------------------------------------------------------------- the OUTGOING crate by the shutter (Gen-san collects)
  mk_outbox: {
    name: 'Outgoing Crate', voxel: 0.012,
    build(v) {
      const W = (x, y, z) => gloss(shade(0xc8a070, 0.88 + hash(x, y, z, 2) * 0.14));
      v.box(-20, 0, -14, 20, 1, 14, W);
      for (let y = 2; y <= 16; y++) {
        if (y % 5 === 0) continue; // gaps between the slats
        v.box(-20, y, -14, 20, y, -14, W); v.box(-20, y, 14, 20, y, 14, W);
        v.box(-20, y, -14, -20, y, 14, W); v.box(20, y, -14, 20, y, 14, W);
      }
      for (const x of [-20, 20]) for (const z of [-14, 14]) v.box(x, 0, z, x, 17, z, gloss(shade(0x8a6038, 1)));
      // stencilled label on the front
      v.box(-14, 6, 15, 14, 13, 15, gloss(0xf4ead6));
      stamp5(v, 'OUTGOING', 0, 12, 16, gloss(0xc8302a));
    },
  },
};
