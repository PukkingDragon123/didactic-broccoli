// MIKAWA-YA's own fixtures and goods — a packed Shōwa 駄菓子屋 / よろず屋: the open milk case, the ice-cream chest,
// the ramune tub, the broom bucket, the pocket watch's glass case, the battery peg stand, a box of fluorescent tubes,
// candy jars with tin lids, the ¥10 puff-stick box, and the old man's back room (chabudai, an ashtray full of cigar
// stubs, tea things, zabuton, tansu, a black phone, the kamidana, his cigar box). Plus the three snacks you can buy.
// Each entry: { name, jp, voxel, build(v) }. Facing +z, bottom-centre origin, deterministic (hashed noise only).
// No footprint / beauty: these are the shop's own fittings, not museum decor.
import { shade } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';
import { hash, vnoise, fill, grime, rod } from './garage.js';

const R = Math.round;
const pick = (list, n) => list[Math.min(list.length - 1, Math.floor(n * list.length))];
const CANDY = [0xe5383b, 0xffd23f, 0x3f86e8, 0x58c06c, 0xff8c2e, 0xff6f9a, 0x8a5bd6, 0xf4f0e4];
/** Wood with a few grain bands along x (few tones so the mesher still merges big faces). */
const wood = (base, k = 0.06) => (x, y, z) => { const n = vnoise(x * 0.06, y * 0.7, z * 0.7, 2.2, 3); return shade(base, n < 0.35 ? 1 - k : n > 0.66 ? 1 + k * 0.7 : 1); };
/** Rounded-corner footprint test (vertical edges rounded by r). */
const rounded = (hx, hz, r) => (x, z) => { const ex = Math.max(0, Math.abs(x + 0.5) - (hx - r)), ez = Math.max(0, Math.abs(z + 0.5) - (hz - r)); return ex * ex + ez * ez <= r * r; };

/** A small cylinder bottle standing at (x, y, z): body, shoulder, neck, cap. */
function bottle(v, x, y, z, h, r, body, cap) {
  v.cylinder(x, y, z, r, h, body);
  v.cylinder(x, y + h, z, Math.max(0, r - 1), 2, body);
  v.box(x, y + h + 2, z, x, y + h + 3, z, body);
  v.set(x, y + h + 4, z, cap);
}

/** An open-topped (or otherwise open) box shell, 1 voxel thick; c may be a colour function (hollowBox can't take one). */
function shell(v, x0, y0, z0, x1, y1, z1, c, open = ['top']) {
  return v.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => (x === x0 && !open.includes('left')) || (x === x1 && !open.includes('right')) || (y === y0 && !open.includes('bottom')) || (y === y1 && !open.includes('top')) || (z === z0 && !open.includes('back')) || (z === z1 && !open.includes('front')), c);
}

export default {
  // ============================================================ shop fittings
  mk_dairy_case: {
    name: 'Open Milk Case', jp: '牛乳ケース', voxel: 0.02,
    build(v) {
      v.jitter = 0.012;
      const white = gloss(0xf2f0ea), blue = gloss(0x2f6fd6), liner = gloss(0xd8e8f0), steel = metal(0xb8bec4);
      // carcass: back, sides, top canopy; base with a grille
      fill(v, -22, 0, -14, 22, 85, -12, white);
      for (const x of [-22, 22]) v.shape(x, 0, -14, x, 85, 13, (xx, y, z) => z <= (y > 74 ? 13 : y > 22 ? 6 : 13), white);
      fill(v, -22, 0, 11, 22, 14, 13, gloss(0x8a9098));
      for (let x = -19; x <= 19; x += 3) v.box(x, 3, 14, x + 1, 11, 14, gloss(0x3a3e44));
      fill(v, -21, 15, -11, 21, 15, 12, white); // the well's floor
      fill(v, -22, 15, 9, 22, 22, 13, white); // the well's front lip
      fill(v, -22, 75, -14, 22, 85, 13, white); // canopy
      fill(v, -22, 78, 14, 22, 85, 14, blue); // header band (the 牛乳 sign goes on it)
      fill(v, -20, 74, -8, 20, 74, 8, glow(0xfff4e0)); // the light under the canopy
      // liner + wire shelves
      fill(v, -21, 16, -11, 21, 73, -11, liner);
      for (const y of [39, 57]) {
        fill(v, -21, y, -10, 21, y, 6, steel);
        fill(v, -21, y + 1, 6, 21, y + 2, 6, gloss(0xe8463a)); // price rail
      }
      // the well: yogurt cups, coffee-milk bottles, a block of butter
      for (let i = 0; i < 9; i++) {
        const x = -18 + i * 4, z = -6 + (i % 2) * 6;
        if (i % 3 === 0) fill(v, x, 16, z, x + 2, 18, z + 2, gloss(pick([0xf4f0e4, 0xffb7c8, 0xfff2b3], hash(i, 1, 1))));
        else bottle(v, x + 1, 16, z + 1, 4, 1, gloss(i % 2 ? 0xd8b088 : 0xf4f0e4), gloss(0xe5383b));
      }
      // shelves: a few juice / coffee-milk bottles (the milk for sale stands between them)
      for (const [y, xs] of [[40, [-18, -14, 14, 18]], [58, [-18, 16]]]) for (const x of xs) bottle(v, x, y, -4, 5, 1, gloss(hash(x, y, 2) > 0.5 ? 0xffa040 : 0xd8b088), gloss(0x3f86e8));
      grime(v, 0, 10, 0.82);
    },
  },

  mk_ice_freezer: {
    name: 'Ice-cream Chest', jp: 'アイスケース', voxel: 0.02,
    build(v) {
      v.jitter = 0.012;
      const inside = rounded(30, 15.5, 3);
      const white = gloss(0xf4f2ec), stripe = gloss(0x2f6fd6), chrome = gloss(0xd8dce2);
      v.shape(-30, 3, -15, 29, 39, 15, (x, y, z) => inside(x, z), (x, y) => (y >= 30 && y <= 32 ? stripe : white));
      fill(v, -28, 0, -13, 27, 2, 13, gloss(0x4a4e52));
      v.box(-27, 14, -12, 26, 39, 12, null);
      fill(v, -27, 14, -12, 26, 14, 12, gloss(0xc8e4f0));
      // rows of ice candy boxes and bars inside
      for (let x = -26; x <= 24; x += 5) for (let z = -11; z <= 9; z += 5) {
        const c = pick(CANDY, hash(x, z, 5)), hgt = 15 + R(hash(x, z, 6) * 5);
        fill(v, x, 15, z, x + 3, hgt, z + 3, gloss(c));
        v.box(x, hgt, z, x + 3, hgt, z, gloss(0xfbf8f0));
      }
      for (let i = 0; i < 10; i++) { const x = -24 + R(hash(i, 3, 3) * 46), z = -9 + R(hash(i, 4, 3) * 18); v.box(x, 21, z, x + 3, 22, z + 1, glass(0xe4f4fa)); }
      // chrome rim + two sliding glass lids
      v.shape(-30, 40, -15, 29, 40, 15, (x, y, z) => inside(x, z) && !(x >= -27 && x <= 26 && z >= -12 && z <= 12), chrome);
      for (const [x0, x1, y] of [[-28, 0, 41], [-1, 27, 42]]) fill(v, x0, y, -13, x1, y, 13, (x, yy, z) => (x === x0 || x === x1 || z === -13 || z === 13 ? chrome : glass(0xd8eef4)));
      v.box(-3, 43, -1, -3, 43, 1, chrome);
      grime(v, 0, 8, 0.85);
    },
  },

  mk_ramune_tub: {
    name: 'Ramune Tub', jp: 'ラムネのたらい', voxel: 0.02,
    build(v) {
      v.jitter = 0.015;
      const legs = wood(0x8a5a32), galv = (x, y, z) => gloss(shade(0xa9afb2, 0.9 + vnoise(x, y, z, 5, 2) * 0.18));
      // a low wooden stand
      for (const x of [-17, 15]) for (const z of [-10, 9]) fill(v, x, 0, z, x + 1, 19, z + 1, legs);
      fill(v, -18, 18, -11, 17, 20, 11, legs);
      for (const z of [-10, 9]) fill(v, -17, 5, z, 16, 6, z + 1, legs);
      // a galvanised wash tub with ridged walls
      v.shape(-20, 21, -14, 19, 31, 13, (x, y, z) => { const e = ((x + 0.5) / 20) ** 2 + ((z + 0.5) / 14) ** 2; return e <= 1 && (e > 0.8 || y === 21); }, (x, y, z) => (y === 26 ? gloss(0xc8ccd0) : galv(x, y, z)));
      v.shape(-21, 32, -15, 20, 32, 14, (x, y, z) => { const e = ((x + 0.5) / 21) ** 2 + ((z + 0.5) / 15) ** 2; return e <= 1 && e > 0.82; }, gloss(0xd0d4d8));
      // ice water and a few bottles lying in it
      v.shape(-19, 22, -13, 18, 28, 12, (x, y, z) => ((x + 0.5) / 19) ** 2 + ((z + 0.5) / 13) ** 2 < 0.8, (x, y) => (y === 28 ? glass(0x9ad0e4) : gloss(0x6aa8c8)));
      for (let i = 0; i < 12; i++) { const x = -15 + R(hash(i, 1, 9) * 30), z = -9 + R(hash(i, 2, 9) * 18); v.box(x, 28, z, x + 1 + (i % 2), 29, z + 1, glass(0xe8f8fc)); }
      for (const [x, z] of [[-12, -4], [-4, 6], [8, -7]]) for (let k = 0; k < 7; k++) v.set(x + k, 28, z, k > 5 ? gloss(0x3f86e8) : gloss(0x9ee0d8));
    },
  },

  mk_broom_bin: {
    name: 'Broom Bucket', jp: 'ほうき立て', voxel: 0.015,
    build(v) {
      v.jitter = 0.015;
      v.tube(0, 0, 0, 10, 9, 22, (x, y, z) => gloss(shade(0x9aa0a6, y % 6 === 0 ? 1.15 : 0.95 + hash(x, y, z) * 0.06)));
      v.cylinder(0, 0, 0, 9, 1, gloss(0x8a9096));
      // a feather duster and two bamboo hand brushes
      rod(v, -4, 2, -3, -6, 52, -5, 0x9a7a4a);
      v.ellipsoid(-6, 56, -5, 4, 7, 4, (x, y, z) => pick([0x2a2a2a, 0x6a4a3a, 0x8a6a4a, 0x3a2a24], hash(x, y, z, 2)));
      rod(v, 4, 2, 4, 7, 34, 6, 0xc9c06a);
      fill(v, 5, 34, 4, 10, 40, 8, 0xd4b46a);
      rod(v, 2, 2, -5, 3, 30, -8, 0xc9c06a);
      v.ellipsoid(3, 33, -8, 3, 4, 2, 0xd4b46a);
    },
  },

  mk_watch_case: {
    name: 'Watch Case', jp: '時計のケース', voxel: 0.01,
    build(v) {
      const wd = wood(0x5a3420, 0.05);
      fill(v, -10, 0, -7, 10, 2, 7, wd);
      fill(v, -9, 3, -6, 9, 4, 6, 0x8a1a2a); // red velvet
      v.ellipsoid(0, 5, 0, 6, 1.5, 4, 0xa82a3a);
      v.hollowBox(-10, 3, -7, 10, 16, 7, glass(0xe0f0f4), 1, ['bottom']);
      for (const [x, z] of [[-10, -7], [10, -7], [-10, 7], [10, 7]]) fill(v, x, 3, z, x, 16, z, gloss(0xd4a83a));
      fill(v, -10, 16, -7, 10, 16, -7, gloss(0xd4a83a)); fill(v, -10, 16, 7, 10, 16, 7, gloss(0xd4a83a));
      fill(v, 4, 1, 8, 9, 2, 8, 0xfbf8f0); // price card
    },
  },

  mk_peg_stand: {
    name: 'Battery Peg Stand', jp: '電池のフック', voxel: 0.01,
    build(v) {
      const wd = wood(0x9a6a3c);
      fill(v, -11, 0, -6, 11, 1, 6, wd);
      fill(v, -11, 2, -4, 11, 38, -3, (x, y) => (y > 33 ? 0xd8302a : (x + y) % 4 === 0 ? 0xa87a4a : 0xc89a62));
      fill(v, -11, 34, -2, 11, 38, -2, 0xffd23f); // header (電池)
      for (const x of [-6, 5]) for (const y of [16, 30]) rod(v, x, y, -2, x, y + 1, 5, metal(0xd8dce2));
    },
  },

  mk_tube_box: {
    name: 'Box of Fluorescent Tubes', jp: '蛍光灯の箱', voxel: 0.02,
    build(v) {
      v.jitter = 0.015;
      const card = (x, y, z) => shade(0xc49a62, 0.94 + hash(x >> 1, y >> 2, z, 7) * 0.1);
      shell(v, -6, 0, -5, 5, 34, 4, card);
      fill(v, -6, 16, 5, 5, 18, 5, 0x2a5aa8);
      fill(v, -4, 21, 5, 3, 27, 5, 0xfbf8f0);
      for (const x of [-5, 4]) fill(v, x, 35, -5, x, 38, 4, card); // open flaps
    },
  },

  mk_candy_jar_a: { name: 'Candy Jar', jp: '飴の瓶', voxel: 0.01, build: (v) => candyJar(v, 0, [0xe5383b, 0xffd23f, 0xff8c2e, 0x58c06c], metal(0xc8ccd0)) },
  mk_candy_jar_b: { name: 'Candy Jar', jp: '飴の瓶', voxel: 0.01, build: (v) => candyJar(v, 1, [0xff6f9a, 0xf4f0e4, 0xffb7c8], metal(0xd4a83a)) },
  mk_candy_jar_c: { name: 'Candy Jar', jp: '飴の瓶', voxel: 0.01, build: (v) => candyJar(v, 2, [0x8a5a2a, 0xd8b088, 0x5a3a1a], metal(0xd8302a)) },

  mk_puff_box: {
    name: 'Puff Stick Box', jp: 'うまい棒の箱', voxel: 0.01,
    build(v) {
      v.jitter = 0.015;
      fill(v, -10, 0, -6, 10, 0, 6, 0xb08850);
      shell(v, -10, 0, -6, 10, 8, 6, (x, y) => (y >= 5 && y <= 6 ? 0x2f6fd6 : 0xf4e6c8));
      // the raised lid flap with the price
      fill(v, -10, 9, -7, 10, 22, -7, (x, y) => (y > 19 ? 0xd8302a : 0xffd23f));
      fill(v, -4, 12, -6, 3, 16, -6, 0xfbf8f0);
    },
  },

  // ============================================================ the back room
  mk_chabudai: {
    name: 'Chabudai', jp: 'ちゃぶ台', voxel: 0.02,
    build(v) {
      v.jitter = 0.01;
      const top = wood(0x6a3a1e, 0.05);
      v.cylinder(0, 14, 0, 18, 2, top);
      v.shape(-19, 14, -19, 19, 15, 19, (x, y, z) => { const d = Math.hypot(x, z); return d > 18.2 && d <= 19.2; }, gloss(0x4a2414));
      for (const [x, z] of [[-11, -11], [10, -11], [-11, 10], [10, 10]]) fill(v, x, 0, z, x + 1, 13, z + 1, wood(0x4a2814));
      fill(v, -12, 11, -1, 11, 12, 0, wood(0x4a2814));
    },
  },
  mk_ashtray: {
    name: 'Ashtray (full)', jp: '吸い殻の山', voxel: 0.006,
    build(v) {
      v.jitter = 0.03;
      // a heavy cut-glass ashtray with cigar rests, heaped with stubs and ash
      v.shape(-14, 0, -14, 13, 5, 13, (x, y, z) => { const d = Math.hypot(x + 0.5, z + 0.5); return d <= 13.6 && (d > 10.5 || y < 2); }, (x, y, z) => gloss(shade(0xc8d8d8, 0.9 + hash(x, y, z) * 0.15)));
      for (let a = 0; a < 4; a++) { const c = Math.cos(a * Math.PI / 2), s = Math.sin(a * Math.PI / 2); for (let r = 10; r <= 14; r++) v.set(R(c * r), 5, R(s * r), null).set(R(c * r), 4, R(s * r), gloss(0xb8c8c8)); }
      v.cylinder(0, 2, 0, 10, 2, (x, y, z) => shade(0x8a8682, 0.85 + hash(x, y, z, 4) * 0.3)); // ash
      // the stubs: chewed ends, bands, a pile spilling over the rim
      for (let i = 0; i < 14; i++) {
        const a = hash(i, 1) * Math.PI * 2, r = 2 + hash(i, 2) * 8, x0 = R(Math.cos(a) * r), z0 = R(Math.sin(a) * r), y0 = 4 + (i > 8 ? 1 : 0);
        const dx = Math.cos(a + 1.7 + hash(i, 3)), dz = Math.sin(a + 1.7 + hash(i, 3)), len = 4 + R(hash(i, 4) * 4);
        for (let k = 0; k < len; k++) {
          const x = R(x0 + dx * k), z = R(z0 + dz * k);
          const c = k === len - 1 ? 0x6a6662 : k === 1 ? (i % 3 ? 0xc8302a : 0xd4a83a) : shade(0x6a4024, 0.9 + hash(i, k) * 0.2);
          v.set(x, y0, z, c).set(x, y0 + 1, z, c);
        }
      }
      // the one he's saving for later, resting in a notch
      for (let k = 0; k < 9; k++) v.set(10 + k, 6, 0, k > 6 ? 0x8a8682 : shade(0x7a4a28, 1)).set(10 + k, 7, 0, k > 6 ? 0x6a6662 : 0x6a4024);
    },
  },
  mk_tea_set: {
    name: 'Tea Things', jp: 'お茶道具', voxel: 0.01,
    build(v) {
      v.jitter = 0.02;
      fill(v, -14, 0, -9, 14, 1, 9, wood(0x5a3020));
      // a kyusu with a side handle
      v.ellipsoid(-6, 7, 0, 5, 5, 5, gloss(0x6a3a28));
      v.cylinder(-6, 11, 0, 3, 2, gloss(0x5a2a1a)); v.set(-6, 13, 0, gloss(0x3a1a10));
      rod(v, -2, 7, 0, 2, 9, 0, gloss(0x6a3a28)); rod(v, -10, 7, 0, -14, 9, 3, gloss(0x5a2a1a));
      // two yunomi, one half full
      for (const [x, z] of [[6, -4], [8, 5]]) { v.tube(x, 2, z, 3, 2, 6, gloss(0xd8d0c0)); v.set(x, 6, z, gloss(0x8ab048)); }
      // a tin of senbei
      v.cylinder(10, 2, -1, 4, 3, metal(0xc8302a));
    },
  },
  mk_zabuton: {
    name: 'Zabuton', jp: '座布団', voxel: 0.02,
    build(v) {
      v.jitter = 0.01;
      v.shape(-14, 0, -15, 13, 4, 14, (x, y, z) => { const ex = Math.abs(x + 0.5) / 14, ez = Math.abs(z + 0.5) / 15; return Math.max(ex, ez) ** 6 + ((y - 1.5) / 3) ** 2 <= 1.05; }, (x, y, z) => (y === 4 && Math.abs(x + 0.5) < 4 && Math.abs(z + 0.5) < 4 ? 0x5a2a3a : 0x7a3a4a));
      for (const [x, z] of [[-14, -15], [13, -15], [-14, 14], [13, 14]]) v.set(x, 2, z, 0xd4a83a);
      v.set(0, 5, 0, 0xd4a83a);
    },
  },
  mk_tansu: {
    name: 'Tansu', jp: '箪笥', voxel: 0.02,
    build(v) {
      v.jitter = 0.01;
      const wd = wood(0x7a4a28, 0.05), iron = metal(0x3a3a3e);
      fill(v, -22, 0, -10, 22, 46, 10, wd);
      fill(v, -23, 46, -11, 23, 47, 11, wood(0x5a3420));
      const rows = [[2, 11], [13, 22], [24, 33], [35, 44]];
      rows.forEach(([y0, y1], i) => {
        const halves = i === 0 ? [[-20, 20]] : [[-20, -1], [1, 20]];
        for (const [x0, x1] of halves) {
          fill(v, x0, y0, 11, x1, y1, 11, wood(0x8a5a32, 0.04));
          const cx = R((x0 + x1) / 2), cy = R((y0 + y1) / 2);
          fill(v, cx - 3, cy, 12, cx + 3, cy, 12, iron); v.set(cx - 3, cy + 1, 12, iron).set(cx + 3, cy + 1, 12, iron);
          v.set(cx, cy + 2, 12, iron);
        }
      });
      for (const [x, y] of [[-22, 46], [22, 46], [-22, 0], [22, 0]]) fill(v, x - (x < 0 ? 0 : 1), y - (y ? 2 : 0), 11, x + (x < 0 ? 1 : 0), y + (y ? 0 : 2), 11, iron);
    },
  },
  mk_phone: {
    name: 'Black Telephone', jp: '黒電話', voxel: 0.01,
    build(v) {
      v.jitter = 0.01;
      const blk = gloss(0x141416);
      v.shape(-10, 0, -9, 10, 0, 11, (x, y, z) => Math.hypot(x, z - 1) < 11, 0xf4f0e4); // the lace doily
      v.shape(-8, 1, -8, 8, 8, 9, (x, y, z) => { const t = (y - 1) / 8; return Math.abs(x) <= 8 - t * 3 && z >= -8 + t * 2 && z <= 9 - t * 4; }, blk);
      v.cylinder(0, 6, 4, 5, 2, gloss(0xf4f0e4)); // the dial
      for (let a = 0; a < 10; a++) v.set(R(Math.cos(a * 0.55 + 0.4) * 4), 8, 4 + R(Math.sin(a * 0.55 + 0.4) * 4), blk);
      v.set(0, 8, 4, gloss(0xd8302a));
      // the handset resting on its cradle
      fill(v, -9, 10, -4, 9, 11, -2, blk);
      fill(v, -10, 8, -5, -7, 11, -1, blk); fill(v, 7, 8, -5, 10, 11, -1, blk);
      rod(v, 10, 3, -3, 13, 0, 2, blk);
    },
  },
  mk_kamidana: {
    name: 'Kamidana', jp: '神棚', voxel: 0.015,
    build(v) {
      v.jitter = 0.015;
      const hinoki = wood(0xe0c49a, 0.04);
      fill(v, -24, 0, -8, 24, 1, 9, hinoki);
      for (const x of [-22, 21]) fill(v, x, -6, -8, x + 1, 0, -6, hinoki);
      // a tiny shrine: steps, body, roof
      fill(v, -8, 2, -6, 8, 3, 5, hinoki);
      fill(v, -6, 4, -5, 6, 14, 3, hinoki);
      fill(v, -3, 5, 4, 3, 12, 4, wood(0xc8a87a));
      v.shape(-9, 15, -7, 9, 19, 5, (x, y) => Math.abs(x) <= 9 - (y - 15) * 2, hinoki);
      // sakaki in two vases, a sake jar, the rope with its paper zigzags
      for (const x of [-15, 15]) { v.cylinder(x, 2, 0, 2, 5, gloss(0xf4f0e4)); v.ellipsoid(x, 11, 0, 3, 4, 2, 0x3a7a3a); }
      v.cylinder(-11, 2, 4, 1, 3, gloss(0xf4f0e4)); v.cylinder(11, 2, 4, 1, 3, gloss(0xf4f0e4));
      for (let x = -24; x <= 24; x++) v.set(x, R(-2 + Math.cos(x / 7.5) * 1.2), 10, 0xd8c88a);
      for (const x of [-14, 0, 14]) for (let k = 0; k < 5; k++) v.set(x + (k % 2), -3 - k, 10, 0xfbf8f0);
    },
  },
  mk_cigar_box: {
    name: 'Cigar Box', jp: '葉巻の箱', voxel: 0.01,
    build(v) {
      v.jitter = 0.015;
      const cedar = wood(0x9a5a30, 0.05);
      fill(v, -12, 0, -8, 12, 0, 8, cedar);
      shell(v, -12, 0, -8, 12, 5, 8, cedar);
      // the lid propped open with its paper label inside
      fill(v, -12, 6, -9, 12, 20, -9, cedar);
      fill(v, -9, 9, -8, 9, 17, -8, (x, y) => (y === 13 ? 0xd4a83a : Math.abs(x) < 3 && Math.abs(y - 13) < 3 ? 0xc8302a : 0xf4e6c8));
      // a row of fat cigars with gold bands, two already gone
      for (let i = 0; i < 6; i++) {
        if (i === 2 || i === 4) continue;
        const z = -6 + i * 2.4;
        for (let x = -11; x <= 11; x++) v.set(x, 4, R(z), x === -8 ? gloss(0xd4a83a) : x === -7 ? gloss(0xc8302a) : shade(0x7a4a28, 0.92 + hash(x, i) * 0.12));
      }
      // a guillotine cutter beside it
      fill(v, 14, 0, -2, 19, 1, 2, metal(0xc8ccd0)); v.set(16, 1, 0, null);
    },
  },
  mk_tv_cabinet: {
    name: 'TV Cabinet', jp: 'テレビ台', voxel: 0.02,
    build(v) {
      v.jitter = 0.01;
      const wd = wood(0x5a3420, 0.05);
      fill(v, -15, 2, -11, 15, 17, 11, wd);
      fill(v, -16, 17, -12, 16, 18, 12, wood(0x4a2814));
      for (const x of [-14, 13]) for (const z of [-10, 9]) fill(v, x, 0, z, x + 1, 1, z + 1, metal(0xb8bcc0));
      for (const [x0, x1] of [[-14, -1], [1, 14]]) { fill(v, x0, 4, 12, x1, 15, 12, glass(0xb0c0c0)); fill(v, x0 === -14 ? -3 : 2, 9, 13, x0 === -14 ? -3 : 2, 10, 13, metal(0xd4a83a)); }
      for (let x = -12; x <= -4; x += 2) fill(v, x, 5, 9, x + 1, 13, 10, gloss(pick([0x2a2a6a, 0x8a2a2a, 0xe8e0c8], hash(x, 2)))); // records
    },
  },
  mk_stand_ashtray: {
    name: 'Standing Ashtray', jp: '灰皿スタンド', voxel: 0.015,
    build(v) {
      v.jitter = 0.015;
      v.cylinder(0, 0, 0, 9, 2, metal(0x6a6e72));
      v.cylinder(0, 2, 0, 6, 40, (x, y) => (y > 36 ? metal(0xc8ccd0) : gloss(y % 10 === 0 ? 0xa8242a : 0xc8302a)));
      v.cylinder(0, 42, 0, 8, 2, metal(0xc8ccd0));
      v.cylinder(0, 43, 0, 6, 1, 0x7a7672);
      for (let i = 0; i < 4; i++) v.set(-3 + i * 2, 44, (i % 2) * 2 - 1, i % 2 ? 0x6a4024 : 0xf4f0e4);
    },
  },
  mk_snack_carton: {
    name: 'Carton of Snacks', jp: '駄菓子の段ボール', voxel: 0.02,
    build(v) {
      v.jitter = 0.015;
      const card = (x, y, z) => shade(0xc49a62, 0.94 + hash(x >> 1, y >> 1, z >> 1, 3) * 0.1);
      shell(v, -11, 0, -8, 11, 13, 8, card);
      for (const z of [-8, 8]) fill(v, -11, 14, z, 11, 18, z, card);
      // bagged snacks heaped inside
      for (let i = 0; i < 22; i++) {
        const x = -9 + R(hash(i, 1, 4) * 16), z = -6 + R(hash(i, 2, 4) * 11), y = 9 + R(hash(i, 3, 4) * 4), c = pick(CANDY, hash(i, 5, 4));
        fill(v, x, y, z, x + 3, y + 1, z + 4, gloss(c));
        v.set(x + 1, y + 2, z + 2, gloss(0xfbf8f0));
      }
      fill(v, -11, 6, 9, 11, 7, 9, 0xd9c58e);
    },
  },

  // ============================================================ the snacks you can buy (carried as tools)
  ramune_bottle: {
    name: 'Ramune', jp: 'ラムネ', voxel: 0.006,
    build(v) {
      v.jitter = 0.01;
      const g = gloss(0x9ee0d8), gs = gloss(0x7cc8c0);
      v.cylinder(0, 0, 0, 5, 13, (x, y, z) => (x === -4 || z === 4 ? gloss(0xd8fbf6) : g));
      // the codd neck pinched round the marble
      v.cylinder(0, 13, 0, 4, 3, g);
      v.cylinder(0, 16, 0, 2, 2, gs);
      v.cylinder(0, 18, 0, 3, 2, g);
      v.sphere(0, 19, 0, 1.6, gloss(0xf4fcfc));
      v.cylinder(0, 21, 0, 2, 8, g);
      v.cylinder(0, 29, 0, 3, 2, gloss(0x2a6ad8)); // the cap
      // the paper label
      v.paint(() => v.cylinder(0, 5, 0, 6, 5, (x, y) => (y === 7 ? gloss(0x2a6ad8) : gloss(0xfbf8f0))));
    },
  },
  puff_stick: {
    name: 'Puff Stick', jp: 'うまい棒', voxel: 0.005,
    build(v) {
      v.jitter = 0.01;
      // a corn puff in its printed bag, crimped ends
      v.cylinder(0, 2, 0, 3, 24, (x, y, z) => {
        if (y > 13 && y < 20 && z > 0) return gloss(y === 16 ? 0xd8302a : 0x2f6fd6);
        if (z > 1 && Math.abs(x) < 2 && y > 6 && y < 11) return gloss(0xfbf8f0);
        return gloss(0xffd23f);
      });
      fill(v, -3, 0, -1, 3, 1, 1, gloss(0xe8b830));
      fill(v, -3, 26, -1, 3, 28, 1, gloss(0xe8b830));
    },
  },
  candy_piece: {
    name: 'Fruit Candy', jp: '飴', voxel: 0.004,
    build(v) {
      v.jitter = 0.01;
      v.ellipsoid(0, 3, 0, 4, 3, 3, (x) => gloss(Math.abs(x) % 3 === 0 ? 0xfbf8f0 : 0xe5383b));
      for (const sx of [-1, 1]) v.shape(sx * 5, 0, -3, sx * 9, 6, 3, (x, y, z) => Math.abs(y - 3) <= (Math.abs(x) - 4) * 0.8 && Math.abs(z) <= 1 + (Math.abs(x) - 4) * 0.4, glass(0xf8e8e8));
    },
  },
};

/** A squat glass jar with a screw-on tin lid, heaped with wrapped candies. */
function candyJar(v, seed, cols, lid) {
  v.jitter = 0.02;
  const r = 7;
  v.tube(0, 0, 0, r, r - 1, 18, glass(0xe4f2f0));
  v.cylinder(0, 0, 0, r - 1, 1, glass(0xd8eae8));
  v.cylinder(0, 18, 0, r - 2, 1, glass(0xe4f2f0));
  v.cylinder(0, 19, 0, r - 1, 3, (x, y) => (y === 20 ? shade(lid, 0.85) : lid));
  v.set(0, 22, 0, lid);
  // candies inside, heaped to about two-thirds
  for (let y = 1; y <= 12 + seed; y++) for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) {
    if (x * x + z * z > 30 || hash(x, y, z, seed) < 0.18) continue;
    if (y > 9 + seed && hash(x, z, seed, 7) < 0.5) continue;
    v.set(x, y, z, gloss(cols[Math.floor(hash(x >> 1, y >> 1, z >> 1, seed + 3) * cols.length)]));
  }
}

