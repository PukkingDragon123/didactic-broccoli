// Garage props, second batch: the shop dressing of Grandpa's garage-turned-gacha-corner. Capsule return box,
// coin changer, fire buckets, the utility sink with its wall water heater, paint tins, a cord reel, jars of
// screws, a straw hat on a nail, window-sill plants and a wind chime, toilet sandals by the back door...
// Each entry: { name, voxel (metres per voxel), build(v) }. Facing +z, bottom-centre origin, deterministic.
import { shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';
import { hash, vnoise, fill, tint, grime, dust, rod, edgeWear, text } from './garage.js';

const R = Math.round;
const CAPS = [0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c, 0xb88ae8, 0xff9a3c];
/** Painted steel with slight mottling. */
const paint = (c, s = 1, k = 0.06) => (x, y, z) => gloss(shade(c, 1 - k / 2 + vnoise(x, y, z, 5, s) * k));
/** Set a pixel pattern on the plane z (rows[0] at y0, top row). */
function stamp(v, rows, legend, x0, y0, z) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => { if (legend[ch] !== undefined) v.set(x0 + c, y0 - r, z, legend[ch]); }));
}
/** Tapered cylinder along y. */
function frustum(v, cx, y0, cz, r0, r1, h, c) {
  for (let i = 0; i < h; i++) v.cylinder(cx, y0 + i, cz, r0 + (r1 - r0) * (h <= 1 ? 0 : i / (h - 1)), 1, typeof c === 'function' ? c(i) : c);
  return v;
}

// 9 × 9 kanji for the coin changer's light box
const RYOGAE = [
  '#########..#.#..#.#',
  '....#.....###.#####',
  '#########..#....#..',
  '#...#...#.#.#..#.#.',
  '#.#.#.#.#..#######.',
  '#.#.#.#.#..#.....#.',
  '#.#.#.#.#..#######.',
  '#.......#..#.....#.',
  '#......##..#######.',
];

const props = {
  // ------------------------------------------------------------- capsule return box (空カプセル回収)
  capsule_return: {
    name: 'Capsule Return Box', voxel: 0.01,
    build(v) {
      v.jitter = 0.02;
      const shell = (x, y, z) => gloss(shade(0xeeeae0, 0.96 + hash(x, y, z, 3) * 0.05));
      fill(v, -15, 0, -13, 14, 1, 12, gloss(0x3a3a3c));
      fill(v, -15, 2, -13, 14, 26, 12, shell);
      // cabinet door seam, hinge pins and a little lock
      v.paint(() => {
        for (let x = -12; x <= 11; x++) { v.set(x, 4, 12, gloss(0xc8c2b4)); v.set(x, 24, 12, gloss(0xc8c2b4)); }
        for (let y = 4; y <= 24; y++) { v.set(-12, y, 12, gloss(0xc8c2b4)); v.set(11, y, 12, gloss(0xc8c2b4)); }
      });
      v.set(8, 15, 13, metal(0xc8b060)); v.set(8, 14, 13, metal(0x8a7a40));
      // heap of empty capsule halves inside the clear upper box
      for (let x = -13; x <= 12; x++) for (let z = -11; z <= 10; z++) {
        const top = 27 + R(10 + vnoise(x, 0, z, 6, 4) * 7 - Math.hypot(x / 13, z / 11) * 4);
        for (let y = 27; y <= top; y++) {
          const k = hash(x >> 2, y >> 2, z >> 2, 7), shellPx = hash(x, y, z, 8) < 0.22;
          v.set(x, y, z, gloss(shellPx ? 0xf4f2ee : CAPS[Math.floor(k * CAPS.length)]));
        }
      }
      v.hollowBox(-15, 27, -13, 14, 56, 12, glass(0xdcecf4), 1, ['top', 'bottom']);
      // aluminium corner posts and top frame
      for (const x of [-15, 14]) for (const z of [-13, 12]) fill(v, x, 27, z, x, 56, z, metal(0xc8ccd2));
      // lid with a coin-sized round slot for the halves
      fill(v, -16, 57, -14, 15, 59, 13, gloss(0xf2f0ea));
      v.shape(-6, 57, -6, 5, 59, 5, (x, y, z) => Math.hypot(x + 0.5, z + 0.5) < 5, null);
      v.shape(-7, 59, -7, 6, 59, 6, (x, y, z) => { const d = Math.hypot(x + 0.5, z + 0.5); return d >= 5 && d < 6.4; }, gloss(0xd83a2a));
      // a red stripe around the lid edge
      v.paint(() => v.box(-16, 58, 13, 15, 58, 13, gloss(0xd83a2a)));
      grime(v, 0, 8, 0.8);
    },
  },

  // ------------------------------------------------------------- coin changer (両替機)
  coin_changer: {
    name: 'Coin Changer', voxel: 0.01,
    build(v) {
      v.jitter = 0.015;
      const body = paint(0xe6dfcc, 2, 0.08), navy = gloss(0x1f3a6a), dark = gloss(0x2a2c30), chrome = metal(0xc8ccd2);
      fill(v, -20, 0, -17, 19, 4, 16, gloss(0x2a2a2c));
      fill(v, -20, 5, -17, 19, 103, 16, body);
      fill(v, -20, 92, -17, 19, 103, 16, navy);
      // header light box: frame + glowing face with red 両替
      fill(v, -20, 104, -17, 19, 127, 16, gloss(0xd8d4c8));
      fill(v, -18, 106, 17, 17, 125, 17, glow(0xfff2d8));
      stamp(v, RYOGAE, { '#': glow(0xe8342a) }, -9, 120, 17);
      fill(v, -18, 106, 17, 17, 107, 17, glow(0xe8342a)); fill(v, -18, 124, 17, 17, 125, 17, glow(0xe8342a));
      // bill acceptor with a green "ready" lamp
      fill(v, -13, 60, 17, 12, 84, 17, dark);
      fill(v, -9, 78, 18, 8, 79, 18, gloss(0x0c0c0e));
      fill(v, -9, 81, 18, -7, 82, 18, glow(0x5cff7a));
      fill(v, 5, 81, 18, 7, 82, 18, glow(0xff5a3a));
      for (let x = -11; x <= 10; x += 3) v.set(x, 64, 18, gloss(0x4a4c50));
      // instruction sticker: white with red header and black lines
      fill(v, -14, 40, 17, 13, 56, 17, gloss(0xfbf8f0));
      fill(v, -14, 54, 17, 13, 56, 17, gloss(0xd83a2a));
      for (const y of [44, 47, 50]) fill(v, -11, y, 17, R(4 + hash(y, 0, 0, 9) * 6), y, 17, gloss(0x3a3a3c));
      // coin cup: recess with a chrome lip and a few coins waiting
      v.shape(-9, 20, 8, 8, 34, 17, () => true, null);
      fill(v, -9, 19, 8, 8, 19, 17, chrome);
      fill(v, -10, 20, 8, -10, 35, 17, chrome); fill(v, 9, 20, 8, 9, 35, 17, chrome); fill(v, -10, 35, 8, 9, 35, 17, chrome);
      fill(v, -9, 20, 8, 8, 34, 8, gloss(0x3a3c40));
      for (const [x, z] of [[-3, 12], [2, 14], [-1, 15]]) { v.cylinder(x, 20, z, 1.6, 1, metal(0xd8d8dc)); }
      // key lock and coin-return lever
      v.cylinder(14, 50, 17, 2, 2, chrome, 'z'); v.set(14, 50, 19, gloss(0x2a2a2c));
      fill(v, 13, 66, 17, 15, 74, 18, chrome);
      // side vents
      for (const x of [-21, 20]) for (let y = 70; y <= 86; y += 3) fill(v, x, y, -10, x, y, 9, gloss(0xa8a296));
      edgeWear(v, -20, 5, -17, 19, 103, 16, gloss(0xb0a894), 0.25, 5);
      grime(v, 0, 16, 0.78);
      dust(v, 0xc8c0b0, 0.3, 3, 4);
    },
  },

  // ------------------------------------------------------------- nested red fire buckets (消火)
  fire_buckets: {
    name: 'Fire Buckets', voxel: 0.01,
    build(v) {
      const red = (k) => (i) => gloss(shade(0xd8302a, i >= 20 ? 1.06 : 0.93 + hash(i, k, 0, 3) * 0.08));
      for (let k = 0; k < 3; k++) {
        const y0 = k * 6;
        frustum(v, 0, y0, 0, 8.6, 11, 22, red(k));
        if (k === 2) v.shape(-11, y0 + 3, -11, 11, y0 + 21, 11, (x, y, z) => Math.hypot(x, z) < 8.6 + (y - y0) * 0.11 - 1.2, null);
        v.tube(0, y0 + 21, 0, 11.6, 10, 1, metal(0xc8ccd2));
      }
      v.cylinder(0, 15, 0, 9.4, 1, gloss(0x8a1a16));
      text(v, '消火', -7, 32, gloss(0xffffff), { dir: '+z' });
      // wire handle on the top bucket
      for (let a = 0; a <= Math.PI; a += 0.05) v.set(R(Math.cos(a) * 11), R(33 + Math.sin(a) * 7), 0, metal(0x9aa0a8));
      grime(v, 0, 5, 0.8);
    },
  },

  // ------------------------------------------------------------- utility sink (流し台)
  utility_sink: {
    name: 'Utility Sink', voxel: 0.01,
    build(v) {
      v.jitter = 0.02;
      const ss = (x, y, z) => metal(shade(0xc4c8cc, 0.9 + vnoise(x, y * 3, z, 4, 3) * 0.14));
      const leg = metal(0x9aa0a6);
      for (const x of [-30, 28]) for (const z of [-20, 18]) fill(v, x, 0, z, x + 1, 62, z + 1, leg);
      fill(v, -30, 14, -20, 29, 15, 19, metal(0x8a9096));
      // basin: outer shell, inner cavity, drain
      fill(v, -32, 63, -22, 31, 80, 21, ss);
      v.shape(-28, 67, -18, 27, 80, 17, () => true, null);
      v.cylinder(0, 67, 0, 2.4, 1, metal(0x5a5e62)); v.cylinder(0, 67, 0, 1.2, 1, gloss(0x1a1a1a));
      fill(v, -32, 81, -22, 31, 82, 21, null);
      fill(v, -32, 80, 20, 31, 81, 21, metal(0xd8dce0)); // rolled front lip
      // backsplash
      fill(v, -32, 81, -22, 31, 96, -20, ss);
      // drain pipe
      for (let y = 30; y <= 66; y++) v.cylinder(0, y, 0, 1.6, 1, gloss(0x9aa0a4));
      for (let z = -20; z <= 0; z++) v.cylinder(0, 30, z, 1.6, 1, gloss(0x9aa0a4), 'z');
      // chrome tap on the splash with a mikan-net soap
      fill(v, -1, 90, -19, 1, 92, -10, metal(0xdce0e4));
      fill(v, -1, 85, -11, 1, 89, -9, metal(0xdce0e4));
      fill(v, -3, 93, -16, 3, 94, -14, metal(0xdce0e4)); v.set(0, 95, -15, gloss(0x2a6ad8));
      for (let y = 74; y <= 89; y++) for (let x = 3; x <= 7; x++) for (let z = -17; z <= -14; z++) {
        const d = Math.hypot((x - 5) / 2.4, (y - 80) / 5.5, (z + 15.5) / 2);
        if (d > 1) continue;
        const net = (x + y + z) % 2 === 0;
        if (d > 0.7) { if (net) v.set(x, y, z, 0xff7a1a); } else v.set(x, y, z, 0xf8f4e4);
      }
      for (let y = 86; y <= 90; y++) v.set(4, y, -15, gloss(0xff7a1a));
      // sponge on the rim, scrubbing brush in the basin
      fill(v, 18, 81, 8, 24, 83, 12, 0xf2d040); fill(v, 18, 84, 8, 24, 84, 12, 0x3a9a4a);
      fill(v, -20, 67, -6, -10, 69, -2, gloss(0x3a6ad8)); for (let x = -19; x <= -11; x += 2) v.set(x, 70, -4, gloss(0xe8e0c0));
      // yellow wash bowl and a blue bucket on the low shelf
      frustum(v, -14, 16, 0, 10, 12, 7, (i) => gloss(i === 6 ? 0xffe070 : 0xf2c42a));
      v.shape(-26, 17, -12, -2, 22, 12, (x, y, z) => Math.hypot(x + 14, z) < 9.8 + (y - 16) * 0.3, null);
      frustum(v, 15, 16, 0, 9, 11, 16, (i) => gloss(i === 15 ? 0x6aa0f0 : 0x2f6fd6));
      v.shape(4, 18, -11, 26, 31, 11, (x, y, z) => Math.hypot(x - 15, z) < 8 + (y - 16) * 0.12, null);
      // water stains and rust
      tint(v, -32, 0, -22, 31, 62, 21, (x, y, z, c, m) => (m === 2 && hash(x, y, z, 31) < 0.08 ? metal(0x8a6a4a) : undefined));
      grime(v, 0, 10, 0.8);
    },
  },

  // ------------------------------------------------------------- instant gas water heater (瞬間湯沸かし器)
  water_heater: {
    name: 'Instant Water Heater', voxel: 0.01,
    build(v) {
      const white = paint(0xf0ece2, 7, 0.06);
      v.shape(-15, 0, -8, 14, 43, 7, (x, y, z) => {
        const ex = Math.max(0, Math.abs(x + 0.5) - 12.5), ey = Math.max(0, Math.abs(y - 21.5) - 19.5), ez = Math.max(0, z - 4);
        return ex * ex + ey * ey + ez * ez <= 6;
      }, white);
      // flame window (blue pilot) with a chrome bezel
      v.cylinder(-6, 30, 7, 4.4, 1, metal(0xc8ccd2), 'z');
      v.cylinder(-6, 30, 8, 3.2, 1, glow(0x2a3a6a));
      for (const [x, y] of [[-7, 28], [-6, 28], [-5, 28], [-6, 29]]) v.set(x, y, 8, glow(0x6aa8ff));
      // brand stripe and two dials
      fill(v, -13, 38, 7, 12, 40, 7, gloss(0x2a6a8a));
      for (const x of [3, 9]) { v.cylinder(x, 12, 7, 3, 2, gloss(0x2a2a2c), 'z'); v.set(x, 14, 9, gloss(0xf0f0f0)); }
      fill(v, -12, 8, 7, -4, 16, 7, gloss(0xe8dcc0)); // instruction plate
      for (const y of [10, 12, 14]) fill(v, -11, y, 8, -6, y, 8, gloss(0x7a6a58));
      // vent slots on top
      for (let x = -11; x <= 10; x += 3) fill(v, x, 43, -5, x, 43, 3, gloss(0x6a6a66));
      // swing spout (bent chrome pipe) and the gas pipe
      rod(v, 10, -1, 0, 10, -6, 0, metal(0xdce0e4), 2);
      rod(v, 10, -6, 0, 10, -6, 30, metal(0xdce0e4), 2);
      rod(v, 10, -6, 30, 10, -10, 30, metal(0xdce0e4), 2);
      rod(v, -10, -1, -4, -10, -24, -4, metal(0x9a8a5a), 2);
      v.cylinder(-10, -14, -4, 2.2, 3, gloss(0xe8c43a), 'y');
      grime(v, -24, 6, 0.85);
      tint(v, -15, 38, -8, 14, 43, 7, (x, y, z, c, m) => (m === 1 && hash(x, y, z, 3) < 0.3 ? gloss(shade(c, 0.86)) : undefined));
    },
  },

  // ------------------------------------------------------------- paint tins
  paint_tins: {
    name: 'Paint Tins', voxel: 0.01,
    build(v) {
      const tin = (cx, cz, r, h, label, drip, open = false, s = 0) => {
        const steel = (x, y, z) => metal(shade(0xb8bcc0, 0.9 + hash(x, y, z, s) * 0.1));
        v.cylinder(cx, 0, cz, r, h, steel);
        v.paint(() => v.cylinder(cx, 2, cz, r + 0.5, h - 4, (x, y, z) => (Math.atan2(z - cz, x - cx) > -0.5 && Math.atan2(z - cz, x - cx) < 2.4 ? gloss(label) : gloss(shade(label, 0.85)))));
        v.paint(() => v.cylinder(cx, R(h / 2) - 1, cz, r + 0.5, 2, gloss(0xf8f4ea)));
        v.tube(cx, h, cz, r, r - 1.2, 1, metal(0xd0d4d8));
        if (open) v.cylinder(cx, h - 1, cz, r - 1.4, 1, gloss(drip));
        else v.cylinder(cx, h, cz, r - 1.2, 1, metal(0xa8acb0));
        // drips down the side
        for (let k = 0; k < 5; k++) {
          const a = hash(k, s, 1, 3) * 6.28, len = 2 + R(hash(k, s, 2, 3) * (h - 4));
          for (let y = h - 1; y > h - 1 - len; y--) v.set(R(cx + Math.cos(a) * (r + 0.6)), y, R(cz + Math.sin(a) * (r + 0.6)), gloss(drip));
        }
      };
      tin(-6, -3, 8, 17, 0x2a6ab0, 0x3a7ac8, true, 1);
      tin(9, -5, 6, 13, 0xd8a020, 0xe8b830, false, 2);
      tin(6, 9, 4.5, 9, 0xc83a2a, 0xd84a3a, false, 3);
      tin(-10, 11, 4, 8, 0x3a8a4a, 0xf0ece0, true, 4);
      // brush resting across the open blue tin
      fill(v, -14, 18, -4, 2, 19, -3, gloss(0xb07a46));
      fill(v, 3, 17, -5, 7, 20, -2, gloss(0x2a2420));
      fill(v, 8, 17, -5, 10, 20, -2, gloss(0x3a7ac8));
    },
  },

  // ------------------------------------------------------------- extension cord reel
  cord_reel: {
    name: 'Cord Reel', voxel: 0.01,
    build(v) {
      const orange = paint(0xf07a1a, 3, 0.08);
      for (const x of [-11, 9]) v.cylinder(x, 15, 0, 14, 2, orange, 'x');
      for (let x = -9; x <= 8; x++) v.cylinder(x, 15, 0, 11, 1, (xx, y, z) => (((y + z + xx * 2) & 3) === 0 ? 0x3a3a3c : 0x1e1e20), 'x');
      v.cylinder(-12, 15, 0, 4, 1, gloss(0xf4f0e6), 'x');
      for (const [y, z] of [[17, -1], [17, 1], [13, -1], [13, 1]]) v.set(-13, y, z, gloss(0x2a2a2c));
      // tubular frame with a carry handle and feet
      for (const x of [-14, 12]) { rod(v, x, 0, -10, x, 32, -2, metal(0x8a9096), 2); rod(v, x, 0, 10, x, 32, 2, metal(0x8a9096), 2); }
      rod(v, -14, 32, 0, 12, 32, 0, gloss(0x2a2a2c), 3);
      // plug dangling to the floor
      for (let k = 0; k < 14; k++) v.set(R(10 + k * 0.4), R(8 - k * 0.55), 12 + k, 0x1e1e20);
      fill(v, 15, 0, 25, 17, 2, 28, gloss(0xf0ece2));
    },
  },

  // ------------------------------------------------------------- jars of screws
  screw_jars: {
    name: 'Jars of Screws', voxel: 0.008,
    build(v) {
      const jar = (cx, r, h, lid, s) => {
        for (let y = 0; y < h; y++) for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
          const d = Math.hypot(x, z);
          if (d > r + 0.2) continue;
          const fillH = h * (0.45 + hash(s, 0, 0, 4) * 0.3);
          if (d < r - 0.9 && y < fillH && y > 0) v.set(cx + x, y, z, metal(hash(x, y, z, s) < 0.5 ? 0x9aa0a6 : hash(x, y, z, s + 1) < 0.5 ? 0xc8a050 : 0x6a6e72));
          else if (d >= r - 0.9) v.set(cx + x, y, z, glass(0xdce8e4));
        }
        v.cylinder(cx, 0, 0, r, 1, glass(0xc8d8d4));
        v.cylinder(cx, h, 0, r + 0.4, 3, gloss(lid));
      };
      jar(-9, 6, 15, 0xd83a2a, 1);
      jar(5, 5, 12, 0x2a6ad8, 2);
      jar(15, 4, 9, 0xe8c43a, 3);
    },
  },

  // ------------------------------------------------------------- straw hat on a nail (faces +z, brim against the wall)
  straw_hat: {
    name: 'Straw Hat', voxel: 0.008,
    build(v) {
      const straw = (x, y, z) => shade(0xe8cc84, ((x + y * 3) % 5 === 0 || (x * 3 - y) % 7 === 0) ? 0.84 : 0.96 + hash(x, y, z, 2) * 0.06);
      v.shape(-24, -24, 0, 24, 24, 1, (x, y) => Math.hypot(x, y) <= 23.5, straw);
      v.shape(-13, -13, 2, 13, 13, 12, (x, y, z) => Math.hypot(x, y) <= 12.5 - Math.max(0, z - 9) * 1.5, straw);
      v.paint(() => v.shape(-14, -14, 2, 14, 14, 4, (x, y) => Math.hypot(x, y) <= 13.5, 0xc8302a));
      // ribbon tails hanging down
      fill(v, 3, -22, 4, 5, -12, 4, 0xc8302a); fill(v, 7, -20, 4, 9, -12, 4, 0xb02822);
      v.translate(0, 24, 0);
    },
  },

  // ------------------------------------------------------------- coil of rope on a hook (faces +z)
  rope_coil: {
    name: 'Rope Coil', voxel: 0.01,
    build(v) {
      const rope = (x, y, z) => (((x + y + z) & 1) ? 0xd8c08a : 0xb8a070);
      for (let k = 0; k < 4; k++) v.torus(R((k - 1.5) * 0.8), 14 - k, 3 + k * 2, 12 - k * 0.6, 1.4, rope, 'z');
      for (let y = 24; y <= 30; y++) v.set(0, y, 1, metal(0x6a6e72));
      v.set(0, 30, 2, metal(0x6a6e72)); v.set(0, 31, 2, metal(0x6a6e72));
      for (let k = 0; k < 10; k++) v.set(R(9 + Math.sin(k * 0.5) * 2), 4 - k, 6, rope(k, 0, 0));
      v.translate(0, 10, 0);
    },
  },

  // ------------------------------------------------------------- window-sill plants
  cactus_pot: {
    name: 'Little Cactus', voxel: 0.006,
    build(v) {
      frustum(v, 0, 0, 0, 4.4, 5.6, 8, (i) => (i >= 6 ? 0xc8683a : 0xb85a30));
      v.cylinder(0, 8, 0, 4.6, 1, 0x5a3a22);
      const g = (x, y, z) => shade(0x4a9a4a, 0.9 + ((x + z) & 1) * 0.12);
      v.shape(-3, 9, -3, 3, 22, 3, (x, y, z) => Math.hypot(x, z) <= 2.8 - Math.max(0, y - 19) * 0.6, g);
      v.shape(2, 13, -2, 7, 19, 2, (x, y, z) => (x <= 4 && Math.hypot(y - 15, z) <= 1.6) || (x >= 4 && x <= 6 && Math.hypot(x - 5, z) <= 1.4 && y >= 14), g);
      for (let i = 0; i < 26; i++) { const a = hash(i, 1, 0, 2) * 6.28, y = 10 + R(hash(i, 2, 0, 2) * 11); v.set(R(Math.cos(a) * 3.4), y, R(Math.sin(a) * 3.4), gloss(0xfaf4d8)); }
      v.sphere(0, 23, 0, 1.6, gloss(0xff6f9a)); v.set(0, 24, 0, gloss(0xffd23f));
    },
  },
  aloe_pot: {
    name: 'Aloe', voxel: 0.006,
    build(v) {
      frustum(v, 0, 0, 0, 5, 6, 9, (i) => gloss(i === 8 ? 0x4a6a9a : 0x3a5a8a));
      v.cylinder(0, 9, 0, 5.2, 1, 0x4a3424);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * 6.28 + hash(k, 1, 0, 5), up = 0.55 + hash(k, 2, 0, 5) * 0.4, len = 12 + R(hash(k, 3, 0, 5) * 8);
        for (let t = 0; t <= len; t++) {
          const r = t * Math.cos(up) * 0.9, y = 10 + t * Math.sin(up) * 1.1 - (t * t) * 0.012;
          const w = Math.max(0, 1.6 - t * 0.1);
          v.sphere(Math.cos(a) * r, y, Math.sin(a) * r, w, shade(0x6aa86a, 0.9 + (t / len) * 0.2));
        }
      }
    },
  },
  // glass wind chime with a paper strip; origin at the bottom of the strip (hangs from its top)
  furin: {
    name: 'Wind Chime', voxel: 0.006,
    build(v) {
      for (let y = 0; y <= 16; y++) for (let x = -3; x <= 3; x++) v.set(x, y, 0, y < 3 ? 0xc8302a : 0xf4eedc);
      for (let y = 6; y <= 14; y += 4) fill(v, -2, y, 1, 1, y, 1, 0x2a5aa8);
      for (let y = 17; y <= 24; y++) v.set(0, y, 0, gloss(0xe8e0d0));
      v.sphere(0, 25, 0, 1.2, metal(0xc8ccd2));
      v.shape(-7, 25, -7, 7, 33, 7, (x, y, z) => { const d = Math.hypot(x, y - 26, z); return d <= 6.6 && d > 5.4 && y >= 26; }, glass(0xd8eef6));
      v.sphere(-3, 30, 5, 1.2, gloss(0xe8342a)); v.sphere(3, 29, 5, 1, gloss(0xe8342a)); // goldfish
      for (let y = 33; y <= 44; y++) v.set(0, y, 0, gloss(0xe8e0d0));
    },
  },

  // ------------------------------------------------------------- old toys for the high shelf
  tin_robot: {
    name: 'Tin Robot', voxel: 0.008,
    build(v) {
      const tinS = (x, y, z) => metal(shade(0xc8ccd4, 0.92 + hash(x, y, z, 6) * 0.1));
      for (const x of [-5, 2]) { fill(v, x, 0, -3, x + 3, 2, 4, gloss(0xc8302a)); fill(v, x, 3, -2, x + 3, 9, 2, tinS); }
      fill(v, -7, 10, -4, 6, 24, 4, tinS);
      fill(v, -5, 14, 5, 4, 21, 5, gloss(0x2a2a3a));
      for (const [x, y, c] of [[-3, 19, 0xff4a3a], [-1, 19, 0x4aff7a], [1, 19, 0xffd23f], [-3, 16, 0x5cc4ff]]) v.set(x, y, 5, glow(c));
      for (const s of [-1, 1]) { const x = s < 0 ? -10 : 7; fill(v, x, 12, -2, x + 2, 23, 1, tinS); fill(v, x, 9, -2, x + 2, 11, 1, gloss(0xc8302a)); }
      fill(v, -5, 25, -3, 4, 33, 3, tinS);
      fill(v, -4, 28, 4, 3, 31, 4, gloss(0x2a2a3a));
      v.set(-2, 29, 5, glow(0xffd23f)); v.set(1, 29, 5, glow(0xffd23f));
      fill(v, -1, 34, 0, 0, 37, 0, metal(0xd8a040)); v.sphere(-0.5, 38, 0, 1.2, gloss(0xc8302a));
    },
  },

  // ------------------------------------------------------------- rubber "toilet" sandals by the back door
  sandals: {
    name: 'Rubber Sandals', voxel: 0.008,
    build(v) {
      const sole = (cx, rot) => {
        for (let z = -14; z <= 14; z++) for (let x = -5; x <= 5; x++) {
          const w = 4.6 - Math.max(0, Math.abs(z) - 9) * 0.5;
          const xx = x + R(z * rot);
          if (Math.abs(x) <= w) { v.set(cx + xx, 0, z, 0x5a4632); v.set(cx + xx, 1, z, 0x7a5e40); }
        }
        for (let x = -5; x <= 5; x++) for (let y = 2; y <= 5; y++) for (let z = -9; z <= -4; z++) {
          if (Math.abs(x) <= 4.8 && (Math.abs(x) >= 4 || y === 5)) v.set(cx + x + R(z * rot), y, z, 0x6a5038);
        }
      };
      sole(-6, 0.03); sole(6, -0.06);
    },
  },

  // ------------------------------------------------------------- red 20 L fuel can
  fuel_can: {
    name: 'Fuel Can', voxel: 0.01,
    build(v) {
      const red = paint(0xc8302a, 4, 0.1);
      fill(v, -13, 0, -8, 12, 30, 7, red);
      for (const z of [-8, 7]) v.paint(() => { fill(v, -11, 4, z, 10, 4, z, gloss(0xa82822)); fill(v, -11, 26, z, 10, 26, z, gloss(0xa82822)); });
      fill(v, -11, 31, -2, 4, 32, 1, red); fill(v, -11, 33, -2, -9, 37, 1, red); fill(v, 2, 33, -2, 4, 37, 1, red); fill(v, -11, 37, -2, 4, 38, 1, red);
      v.cylinder(9, 31, 0, 2.4, 4, gloss(0xe8c43a));
      v.paint(() => fill(v, -6, 10, 7, 5, 20, 7, gloss(0xf4f0e0)));
      text(v, '灯油', -6, 18, gloss(0xc8302a), { dir: '+z' });
      edgeWear(v, -13, 0, -8, 12, 30, 7, metal(0x9a9ea2), 0.2, 3);
      grime(v, 0, 6, 0.8);
    },
  },

  // ------------------------------------------------------------- big jar of spare capsules
  capsule_jar: {
    name: 'Capsule Jar', voxel: 0.01,
    build(v) {
      for (let y = 0; y < 26; y++) for (let x = -10; x <= 10; x++) for (let z = -10; z <= 10; z++) {
        const d = Math.hypot(x, z), r = 9.6 - Math.max(0, y - 21) * 0.9;
        if (d > r) continue;
        if (d > r - 1) v.set(x, y, z, glass(0xdcecf0));
        else if (y < 19) {
          const k = hash(x >> 2, y >> 2, z >> 2, 3), top = ((x + 99) >> 1) % 2 === ((y + 99) >> 2) % 2;
          v.set(x, y, z, gloss(top ? 0xf4f2ee : CAPS[Math.floor(k * CAPS.length)]));
        }
      }
      v.cylinder(0, 26, 0, 5.4, 3, gloss(0xd83a2a));
      v.cylinder(0, 29, 0, 5.4, 1, gloss(0xe8584a));
    },
  },

  // ------------------------------------------------------------- blue coin tray (カルトン)
  coin_tray: {
    name: 'Coin Tray', voxel: 0.006,
    build(v) {
      fill(v, -14, 0, -10, 13, 0, 9, gloss(0x2a6ad8));
      v.hollowBox(-14, 1, -10, 13, 3, 9, gloss(0x3a7ae8), 1, ['top', 'bottom']);
      for (let i = 0; i < 9; i++) {
        const x = -10 + R(hash(i, 1, 0, 3) * 20), z = -7 + R(hash(i, 2, 0, 3) * 14);
        v.cylinder(x, 1, z, 2.2, 1, metal(i % 3 === 0 ? 0xd8b060 : 0xd8d8dc));
      }
    },
  },

  // ------------------------------------------------------------- flattened cardboard tied with string
  cardboard_bundle: {
    name: 'Cardboard Bundle', voxel: 0.01,
    build(v) {
      for (let k = 0; k < 7; k++) {
        const ox = R((hash(k, 1, 0, 5) - 0.5) * 4), oz = R((hash(k, 2, 0, 5) - 0.5) * 4);
        const c = (x, y, z) => shade(k % 3 ? 0xc49a62 : 0xb08a58, 0.94 + vnoise(x, y, z, 4, k) * 0.1);
        fill(v, -28 + ox, k * 2, -20 + oz, 27 + ox, k * 2 + 1, 19 + oz, c);
      }
      for (const x of [-12, 12]) { fill(v, x, 0, -21, x, 14, -21, 0xf4f0e6); fill(v, x, 0, 20, x, 14, 20, 0xf4f0e6); fill(v, x, 14, -21, x, 14, 20, 0xf4f0e6); }
      v.paint(() => fill(v, -6, 13, -8, 8, 13, 4, gloss(0x3a3a3c)));
    },
  },

  // ------------------------------------------------------------- small wooden step stool
  step_stool: {
    name: 'Step Stool', voxel: 0.01,
    build(v) {
      const w = (x, y, z) => shade(0xb88a56, 0.9 + vnoise(x * 0.3, y * 3, z, 3, 2) * 0.16);
      fill(v, -16, 0, -12, -14, 38, 11, w); fill(v, 13, 0, -12, 15, 38, 11, w);
      fill(v, -16, 36, -12, 15, 38, 11, w);
      fill(v, -16, 18, 0, 15, 20, 11, w);
      fill(v, -14, 26, -12, 13, 29, -11, w);
      dust(v, 0xd8d0c0, 0.3, 3, 2);
      grime(v, 0, 5, 0.8);
    },
  },
};

export default props;
