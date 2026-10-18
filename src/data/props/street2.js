// Street props, part 2 — the walkable residential back street (住宅街の路地) outside the garage at dusk:
// garbage station, kei car, mamachari, little shrine, potted plants... plus a pigeon and a stray cat.
// Each entry: { name, jp, voxel (metres per voxel), build(v) }. Facing +z, bottom-centre origin.
// Deterministic (hashed noise only). Helpers are shared with garage.js / street.js.
import { shade, mix } from '../../voxel/palette.js';
import { VoxelModel, gloss, metal, glow, glass, enc, MAT } from '../../voxel/VoxelModel.js';
import { hash, vnoise, sh, fill, tint, grime, dust, speckle, blotch, rod, path, GLYPHS } from './garage.js';

// ------------------------------------------------------------------ helpers
const R = Math.round;
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Weathered concrete colour function. */
const concrete = (base = 0xa9a59d, s = 1) => (x, y, z) => {
  const n = vnoise(x, y * 0.6, z, 4, s);
  return shade(n > 0.78 ? mix(base, 0x7e7a72, 0.35) : base, (n < 0.36 ? 0.93 : n > 0.62 ? 1.03 : 1) - (hash(x, y, z, s + 1) < 0.015 ? 0.1 : 0));
};

/** Wood with a few discrete grain bands running along `axis` (few tones so greedy meshing still merges). */
const wood = (base, axis = 'x', s = 1, k = 0.07) => (x, y, z) => {
  const n = vnoise(axis === 'x' ? x * 0.05 : x * 0.75, axis === 'y' ? y * 0.05 : y * 0.75, axis === 'z' ? z * 0.05 : z * 0.75, 2.4, s);
  return shade(base, n < 0.36 ? 1 - k : n > 0.64 ? 1 + k * 0.7 : 1);
};

/** Flat-ish painted colour: only a couple of tones so big panels still merge into large quads. */
const paintFn = (base, s = 1, k = 0.04, mat = gloss) => (x, y, z) => mat(shade(base, vnoise(x, y, z, 6, s) > 0.62 ? 1 - k : 1));

/** Set a pixel pattern on the plane z (rows[0] = top at y0). mirror = flip columns (read from -z). */
function stamp(v, rows, legend, x0, y0, z, mirror = false) {
  rows.forEach((row, r) => {
    const s = mirror ? [...row].reverse().join('') : row;
    [...s].forEach((ch, c) => { if (legend[ch] !== undefined) v.set(x0 + c, y0 - r, z, legend[ch]); });
  });
}

// 7-row pixel glyphs used on this street's signs (falls back to garage.js GLYPHS)
const G = {
  'ゴ': ['.....#.#', '######..', '.....#..', '.....#..', '.....#..', '.....#..', '######..'],
  'ミ': ['##.....', '..###..', '.......', '.##....', '...##..', '#......', '.######'],
  '出': ['...#...', '#..#..#', '#..#..#', '#######', '#..#..#', '#..#..#', '#######'],
  'し': ['.#.....', '.#.....', '.#.....', '.#.....', '.#....#', '.#...#.', '..###..'],
  'ル': ['.#..#..', '.#..#..', '.#..#..', '.#..#..', '.#..#.#', '#...##.', '#...#..'],
  '田': ['#######', '#..#..#', '#..#..#', '#######', '#..#..#', '#..#..#', '#######'],
  '中': ['...#...', '#######', '#..#..#', '#..#..#', '#######', '...#...', '...#...'],
  'カ': ['..#....', '#######', '..#...#', '..#...#', '.#....#', '.#....#', '#...##.'],
  'ペ': ['.....###', '..#..#.#', '.#.#.###', '#...#...', '.....#..', '......#.', '.......#'],
  'ッ': ['.......', '.......', '#.#..#.', '#.#..#.', '.....#.', '....#..', '..##...'],
  'ト': ['.#.....', '.#.....', '.###...', '.#..##.', '.#.....', '.#.....', '.#.....'],
  'キ': ['..#....', '#######', '..#....', '#######', '...#...', '...#...', '...#...'],
  'ケ': ['.#.....', '.######', '#....#.', '.....#.', '....#..', '...#...', '.##....'],
  'す': ['...#...', '#######', '...##..', '..#.#..', '...##..', '...#...', '..#....'],
  'い': ['.......', '#....#.', '#.....#', '#.....#', '#.....#', '.#.#...', '..#....'],
  '・': ['...', '...', '...', '.#.', '...', '...', '...'],
  3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 9: ['###', '#.#', '###', '..#', '##.'],
  '-': ['...', '...', '###', '...', '...'], ':': ['.', '#', '.', '#', '.'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};
const glyph = (ch) => G[ch] || GLYPHS[ch] || G[' '];
/** Pixel rows for a string (glyphs bottom-aligned). */
function glyphRows(str, gap = 1) {
  const gl = [...str].map(glyph);
  const h = Math.max(...gl.map((g) => g.length));
  const rows = [];
  for (let r = 0; r < h; r++) {
    rows.push(gl.map((g) => { const off = h - g.length; return r < off ? '.'.repeat(g[0].length) : g[r - off]; }).join('.'.repeat(gap)));
  }
  return rows;
}
const glyphW = (str, gap = 1) => glyphRows(str, gap)[0].length;

/**
 * Copy `src` into `v` rotated about +y by `ang` radians and scaled, then translated by (dx,dy,dz).
 * Inverse sampling, so rotated parts have no holes. `warp(x,y,z)` may return a source-space offset [ox,oy,oz].
 */
function place(v, src, dx, dy, dz, ang = 0, { sx = 1, sy = 1, sz = 1, warp = null } = {}) {
  const b = src.bounds();
  const c = Math.cos(ang), s = Math.sin(ang);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const px of [b.minX - 1, b.maxX + 1]) for (const pz of [b.minZ - 1, b.maxZ + 1]) {
    const X = px * sx * c - pz * sz * s, Z = px * sx * s + pz * sz * c;
    x0 = Math.min(x0, X); x1 = Math.max(x1, X); z0 = Math.min(z0, Z); z1 = Math.max(z1, Z);
  }
  const y0 = Math.floor((b.minY - 1) * sy), y1 = Math.ceil((b.maxY + 1) * sy);
  for (let X = Math.floor(x0); X <= Math.ceil(x1); X++) for (let Z = Math.floor(z0); Z <= Math.ceil(z1); Z++) for (let Y = y0; Y <= y1; Y++) {
    let x = (X * c + Z * s) / sx, z = (-X * s + Z * c) / sz, y = Y / sy;
    if (warp) { const o = warp(x, y, z); x += o[0]; y += o[1]; z += o[2]; }
    const val = src.get(R(x), R(y), R(z));
    if (val !== null) v.set(dx + X, dy + Y, dz + Z, val);
  }
  return v;
}

/** Lay an upright (y-axis) part down so its axis points along +x (or rotated by ang in the ground plane). */
function layDown(src, r) {
  const m = new VoxelModel();
  src.forEach((x, y, z, val) => m.set(y, x + r, z, val));
  return m;
}

// ------------------------------------------------------------------ small part builders
/** Upright drink can (y-axis), bottom at y=0, centred x=z=0. body(x,y,z,a) -> colour. */
function makeCan(r, h, body, { open = true } = {}) {
  const m = new VoxelModel();
  const alu = metal(0xc4c8cc), aluD = metal(0x9a9ea2);
  m.cylinder(0, 0, 0, r - 1.2, 1, aluD);
  m.cylinder(0, 1, 0, r - 0.4, 1, aluD);
  for (let y = 2; y < h - 2; y++) m.cylinder(0, y, 0, r, 1, (x, yy, z) => body(x, yy, z, Math.atan2(x, z)));
  m.cylinder(0, h - 2, 0, r - 0.6, 1, alu);
  m.tube(0, h - 1, 0, r - 0.6, r - 1.8, 1, alu);
  m.cylinder(0, h - 2, 0, r - 1.8, 1, metal(0xd4d8dc));
  if (open) {
    m.box(-1, h - 2, 1, 1, h - 2, 2, 0x161414); // drinking hole
    m.box(-1, h - 1, -1, 0, h - 1, 0, metal(0xe4e6ea)); // pull tab
  }
  return m;
}

/** Upright 500ml PET bottle, clear walls, coloured label band and cap. */
function makePet(r, h, label, cap, liquid = null) {
  const m = new VoxelModel();
  const wall = glass(0xe6f2f4);
  for (let y = 0; y < h; y++) {
    let rr = r;
    if (y < 2) rr = r - 1.2 + y * 0.6;
    const sh0 = h - 13;
    if (y > sh0) rr = Math.max(2.2, r - (y - sh0) * 0.55);
    if (y >= h - 4) rr = 2.6;
    const lab = y >= 6 && y <= 16;
    if (lab) m.cylinder(0, y, 0, rr, 1, (x, yy, z) => gloss(Math.abs(Math.atan2(x, z)) < 0.6 && yy >= 9 && yy <= 13 ? 0xfbf8f0 : label));
    else if (liquid && y < 6) m.cylinder(0, y, 0, rr, 1, glass(liquid));
    else m.tube(0, y, 0, rr, rr - 1.1, 1, wall);
  }
  m.cylinder(0, h, 0, 2.8, 3, gloss(cap));
  m.cylinder(0, h - 1, 0, 3.1, 1, gloss(shade(cap, 0.85)));
  return m;
}

// ------------------------------------------------------------------ props
const street2 = {
  // ============================================================ ROAD FURNITURE
  // ------------------------------------------------------------- 止まれ sign
  tomare_sign: {
    name: 'Stop Sign', jp: '止まれ標識', voxel: 0.012,
    build(v) {
      const galv = (x, y, z) => gloss(shade(0xb0b6ba, 0.9 + vnoise(x, y * 0.3, z, 4, 1) * 0.13));
      v.cylinder(0, 0, 0, 5, 3, concrete(0x9a968e, 3));
      v.cylinder(0, 3, 0, 2.5, 182, galv);
      v.cylinder(0, 185, 0, 2.9, 2, gloss(0x7a8086));
      v.cylinder(0, 187, 0, 1.6, 1, gloss(0x7a8086));
      const T = 182, H = 58, HW = 33.5;
      const dist = (x, y) => {
        const r = T - y; if (r < 0 || r > H) return -1;
        const hw = HW * (1 - r / H);
        return Math.min(r + 0.5, (hw - Math.abs(x)) * 0.866 + 0.3);
      };
      const inPlate = (x, y) => {
        const r = T - y, d = dist(x, y);
        if (d < 0) return false;
        if (r < 1 && Math.abs(x) > HW - 3) return false;
        if (r < 2 && Math.abs(x) > HW - 2) return false;
        if (r > H - 3) return false;
        if (r > H - 5 && Math.abs(x) > 1) return false;
        return true;
      };
      // aluminium back plate (z=3) + reflective face (z=4)
      v.shape(-34, T - H, 3, 34, T, 4, (x, y) => inPlate(x, y), (x, y, z) => {
        if (z === 3) return gloss(shade(0x9aa0a6, 0.92 + hash(x >> 2, y >> 2, 0, 2) * 0.08));
        return dist(x, y) < 2.3 ? gloss(0xf8f6f0) : gloss(shade(0xd52520, 0.97 + hash(x >> 1, y >> 1, 0, 3) * 0.04));
      });
      // rolled edge on the back
      v.shape(-34, T - H, 2, 34, T, 2, (x, y) => inPlate(x, y) && dist(x, y) < 1.4, gloss(0x8a9096));
      // 止まれ — chunky 2px-stroke kana
      const TOMARE = [
        ['....##....', '....##....', '....######', '.##.##....', '.##.##....', '.##.##....', '.##.##....', '.##.##....', '.##.##....', '.##.##....', '##########', '##########'],
        ['....##....', '##########', '....##....', '.########.', '....##....', '....##....', '..####....', '.##.##....', '##..##....', '##..###...', '.####.###.', '........##'],
        ['.##.......', '.##.......', '######....', '.##..###..', '.##.##.##.', '.####..##.', '.###...##.', '###....##.', '###....##.', '.##....##.', '.##....###', '.##.....##'],
      ];
      TOMARE.forEach((g, i) => stamp(v, g, { '#': gloss(0xfbf9f2) }, -17 + i * 12, T - 6, 4));
      stamp(v, glyphRows('STOP'), { '#': gloss(0xfbf9f2) }, -7, T - 22, 4);
      // clamp bands + brackets
      for (const y of [T - 14, T - 40]) {
        v.tube(0, y, 0, 3.8, 2.5, 3, gloss(0x8a9096));
        v.box(-5, y, 2, 5, y + 2, 2, gloss(0x8a9096));
        v.set(-5, y + 1, 1, gloss(0x6a7076)); v.set(5, y + 1, 1, gloss(0x6a7076));
      }
      // back: maintenance sticker
      v.box(-6, T - 30, 2, -1, T - 26, 2, gloss(0xf2efe6)); v.box(-5, T - 28, 2, -2, T - 28, 2, 0x5a5a5a);
      // pole: reflector band, sticker scrap, rust and dirt at the foot
      v.paint(() => v.cylinder(0, 92, 0, 3, 3, (x, y, z) => gloss(z > 0 ? 0xffd23f : 0x2a2a2a)));
      v.project(['WWW', 'WBW', 'WWW', 'W..'], { W: 0xece6d6, B: 0x3a6ab0 }, -1, 70, '+z');
      blotch(v, -3, 3, -3, 3, 30, 3, gloss(0x8a6a4a), 0.74, 2, 5);
      blotch(v, -34, T - H, 3, 34, T, 3, gloss(0x7a5a3a), 0.8, 2, 6);
      grime(v, 0, 14, 0.75);
    },
  },

  // ------------------------------------------------------------- manhole
  manhole: {
    name: 'Decorated Manhole Cover', jp: 'デザインマンホール', voxel: 0.008,
    build(v) {
      const RIM = 38, COVER = 35.5;
      const iron = (x, y, z) => shade(0x3a3836, 0.9 + hash(x, y, z, 1) * 0.14);
      // design: sakura branch over a river, framed by a studded band with おすい text
      const design = (x, z) => {
        const r = Math.hypot(x, z), a = Math.atan2(z, x);
        if (r > COVER) return null;
        if (r > COVER - 1.2 || (r > 26.3 && r < 27.6)) return 'groove';
        if (r >= 27.6) { // studded anti-slip band
          if (Math.abs(x) < 13 && z > 0) return 'plate';
          if (Math.abs(x) < 5 && z < 0) return 'plate';
          const k = (Math.round(a / TAU * 48) % 2 === 0) ? 1 : 0;
          const rr = (r - 27.6) % 3.2;
          return (rr > 1 && rr < 2.6 && ((Math.round(a / TAU * 64) + k) % 2 === 0)) ? 'stud' : 'band';
        }
        // inner scene (z+ is towards the viewer, so the river sits at +z)
        const wave = 9 + Math.sin(x * 0.32) * 2.2;
        if (z > wave + 7) return Math.sin(x * 0.45 + z * 0.9) > 0.55 ? 'foam' : 'water2';
        if (z > wave) return Math.abs(z - wave - Math.sin(x * 0.5 + 1) * 1.2) < 0.9 ? 'foam' : 'water';
        if (Math.abs(z - wave + 0.5) < 0.8) return 'groove';
        // blossoms: five-petal flowers
        for (const [fx, fz, fr] of [[-10, -9, 6.5], [6, -14, 5.2], [12, -1, 4.6], [-3, 2, 3.8], [-18, 2, 3.2]]) {
          const dx = x - fx, dz = z - fz, d = Math.hypot(dx, dz), aa = Math.atan2(dz, dx);
          const petal = fr * (0.62 + 0.38 * Math.abs(Math.cos(aa * 2.5)));
          if (d < fr * 0.28) return 'centre';
          if (d < petal) return d > petal - 1 ? 'petalD' : 'petal';
          if (d < petal + 0.8) return 'groove';
        }
        // branch
        const by = -20 + (x + 26) * 0.55 + Math.sin(x * 0.2) * 3;
        if (Math.abs(z - by) < 1.3 + Math.max(0, -x) * 0.04) return 'branch';
        if (x > -2 && Math.abs(z - (-6 - (x + 2) * 0.9)) < 0.9 && x < 10) return 'branch';
        return 'sky';
      };
      const COL = {
        band: null, stud: null, plate: gloss(0x2e2c2a),
        sky: gloss(0xf2e8c8), water: gloss(0x3a86c8), water2: gloss(0x2a6aa8), foam: gloss(0xe8f4f8),
        petal: gloss(0xff9fb8), petalD: gloss(0xe8708f), centre: gloss(0xffd23f), branch: gloss(0x5a3a2a),
      };
      for (let x = -RIM; x <= RIM; x++) for (let z = -RIM; z <= RIM; z++) {
        const r = Math.hypot(x, z);
        if (r > RIM + 0.3) continue;
        if (r > COVER) { // steel frame ring, slightly proud
          v.set(x, 0, z, metal(0x6a6a6c)); v.set(x, 1, z, metal(shade(0x8a8a8a, 0.92 + hash(x, 0, z, 2) * 0.1)));
          continue;
        }
        v.set(x, 0, z, iron(x, 0, z));
        const d = design(x, z);
        if (d === 'groove') continue;
        if (d === 'stud') { v.set(x, 1, z, metal(0x6a6662)); continue; }
        if (d === 'band') { v.set(x, 1, z, gloss(shade(0x4a4642, 0.92 + hash(x, 1, z, 3) * 0.08))); continue; }
        v.set(x, 1, z, COL[d]);
      }
      // おすい lettering in the band (front) + city crest (back)
      const rows = glyphRows('おすい');
      const w = rows[0].length;
      v.project(rows, { '#': gloss(0xf2e4c0) }, -R(w / 2), 28, '+y');
      v.project(['.###.', '#.#.#', '#####', '#.#.#', '.###.'], { '#': gloss(0xe8dcc0) }, -2, -33, '+y');
      // pick holes + wear: polished high spots on the band
      for (const [x, z] of [[-31, 0], [31, 0]]) { v.box(x - 1, 1, z, x + 1, 1, z, null); v.set(x, 0, z, 0x141210); }
      tint(v, -RIM, 1, -RIM, RIM, 1, RIM, (x, y, z, c, m) => (m !== MAT.METAL && vnoise(x, 0, z, 6, 9) > 0.72 ? enc(mix(c, 0x8a8682, 0.45), m) : undefined));
    },
  },

  // ------------------------------------------------------------- scattered cans
  drink_cans: {
    name: 'Scattered Drink Cans', jp: '空き缶', voxel: 0.005,
    build(v) {
      // cola-style red can lying on its side
      const cola = makeCan(6.5, 24, (x, y, z, a) => {
        if (y === 13 || y === 14) return gloss(0xfbf8f0);
        if (Math.abs(a) < 0.7 && y > 15 && y < 20) return gloss(Math.sin(y * 1.4 + a * 3) > 0.3 ? 0xfbf8f0 : 0xd8221e);
        return gloss(0xd8221e);
      });
      place(v, layDown(cola, 7), 4, 0, 16, -0.35);
      // short coffee can standing
      const coffee = makeCan(5.3, 21, (x, y, z, a) => {
        if (y >= 7 && y <= 8) return metal(0xd8a83a);
        if (Math.abs(a) < 0.8 && y >= 11 && y <= 16) return gloss(y === 11 || y === 16 ? 0xd8a83a : 0xf2e6cc);
        return gloss(0x2a2220);
      });
      v.merge(coffee, 36, 0, -8);
      // melon soda can, crushed flat by a tyre
      const melon = makeCan(6.5, 24, (x, y, z, a) => gloss(y > 8 && y < 12 ? 0xf8f8f0 : Math.abs(a) < 0.5 && y > 14 ? 0xffd23f : 0x3cb04a), { open: false });
      place(v, layDown(melon, 7), 4, 0, -14, 0.25, { sy: 0.42, sz: 1.35, warp: (x, y, z) => [0, Math.sin(x * 0.9) * 1.2, Math.sin(x * 0.6 + y) * 0.8] });
      // energy drink tall can, rolled away
      const energy = makeCan(5.8, 32, (x, y, z, a) => {
        if (y % 9 === 4) return metal(0xd8dce0);
        return gloss(Math.abs(a - 1) < 0.5 ? 0xffd23f : 0x2a3a9a);
      });
      place(v, layDown(energy, 6), -30, 0, -12, 2.2);
      // empty green-tea PET bottle
      const pet = makePet(6.5, 38, 0x3c8a3c, 0x2c6a2c);
      place(v, layDown(pet, 7), -44, 0, 12, 0.3);
      // a loose cap, a pull tab, a cigarette butt
      v.cylinder(-14, 0, 2, 2.6, 2, gloss(0x2c6a2c)); v.cylinder(-14, 2, 2, 1.6, 1, gloss(0x3c8a3c));
      v.box(22, 0, 2, 24, 0, 3, metal(0xd4d8dc)); v.set(25, 0, 3, metal(0xd4d8dc));
      v.box(40, 0, 6, 45, 1, 6, 0xf4f0e6); v.box(46, 0, 6, 47, 1, 6, 0xd88a3a);
      dust(v, 0x8a7a68, 0.18, 4, 3);
    },
  },

  // ------------------------------------------------------------- utility box
  power_box: {
    name: 'Utility Power Box', jp: '地上機器', voxel: 0.02,
    build(v) {
      const grey = (x, y, z) => gloss(shade(0x9ea6a2, vnoise(x, y, z, 7, 1) > 0.6 ? 0.95 : 1));
      // concrete plinth with a cable conduit
      fill(v, -28, 0, -15, 28, 6, 15, concrete(0xa8a49c, 2));
      v.box(-28, 6, -15, 28, 6, -15, null); v.box(-28, 6, 15, 28, 6, 15, null);
      v.cylinder(-20, 3, -16, 2.2, 3, gloss(0x5a5a58), 'z');
      // body
      fill(v, -25, 7, -12, 25, 64, 12, grey);
      // overhanging rain hood with a slight slope
      v.shape(-27, 65, -14, 27, 68, 15, (x, y, z) => y <= 68 - (z + 14) / 10, (x, y, z) => gloss(shade(0x96a09c, y >= 67 ? 1.04 : 0.95)));
      // door seams + panel outlines
      v.paint(() => {
        v.box(0, 9, 12, 0, 62, 12, gloss(0x5a605e));
        v.shape(-24, 9, 12, 24, 62, 12, (x, y) => y === 9 || y === 62 || x === -24 || x === 24, gloss(0x7a827e));
      });
      for (const y of [16, 55]) for (const x of [-25, 25]) v.box(x, y, 11, x, y + 4, 11, gloss(0x6a706e)); // hinges
      // chrome handles + keyholes
      for (const s of [-1, 1]) {
        v.box(s * 3, 23, 13, s * 3, 31, 13, metal(0xd8dce0)); v.box(s * 3, 23, 14, s * 3, 24, 14, metal(0xb8bcc0));
        v.set(s * 3, 21, 13, 0x1a1a1a);
      }
      // louvers (front bottom + sides top)
      for (let y = 12; y <= 20; y += 2) { v.box(-20, y, 13, -6, y, 13, gloss(0x8a928e)); v.box(6, y, 13, 20, y, 13, gloss(0x8a928e)); }
      for (const x of [-26, 26]) for (let y = 50; y <= 60; y += 2) v.box(x, y, -8, x, y, 8, gloss(0x8a928e));
      // warning sticker: lightning + キケン, number plate, a peeled flyer, no-flyposting notice
      fill(v, -20, 44, 13, -8, 56, 13, () => gloss(0xffd23f));
      v.shape(-20, 44, 13, -8, 56, 13, (x, y) => x === -20 || x === -8 || y === 44 || y === 56, gloss(0x1e1e1e));
      stamp(v, ['...##', '..##.', '.####', '...#.', '..#..', '.#...'], { '#': gloss(0x1e1e1e) }, -16, 54, 14);
      fill(v, -23, 32, 13, -1, 42, 13, () => gloss(0xf8f6f0));
      stamp(v, glyphRows('キケン'), { '#': gloss(0xe5383b) }, -23, 40, 14);
      fill(v, 8, 48, 13, 18, 54, 13, () => gloss(0xf4f2ea));
      stamp(v, glyphRows('108'), { '#': gloss(0x2a2a2a) }, 9, 53, 13);
      stamp(v, ['WWWWWWW', 'WKKWKKW', 'WWWWWWW', 'WKKKKWW', 'WWWWWWW', 'WKKWWW.', 'WWWW...'], { W: 0xe8e2d0, K: 0x8a8478 }, 10, 30, 13);
      stamp(v, ['GGGGGG', 'GWWWWG', 'GGGGGG'], { G: gloss(0x3a8a4a), W: gloss(0xf4f2ea) }, -21, 28, 13);
      // back: panel seams + inspection label
      v.paint(() => v.shape(-25, 9, -12, 25, 62, -12, (x, y) => x === -12 || x === 12 || y === 9 || y === 62, gloss(0x7a827e)));
      fill(v, -8, 44, -13, 2, 50, -13, () => gloss(0xf4f2ea)); v.box(-7, 47, -13, 1, 47, -13, gloss(0x5a5a5a)); v.box(-7, 45, -13, -2, 45, -13, gloss(0x8a8a8a));
      // stains, rust weeping from the hood, weeds at the foot
      tint(v, -25, 7, 12, 25, 64, 12, (x, y, z, c, m) => (vnoise(x, 0, 0, 2.5, 7) > 0.66 && y > 64 - (vnoise(x, 0, 0, 2.5, 7) - 0.66) * 160 ? enc(shade(c, 0.86), m) : undefined));
      blotch(v, -27, 60, -14, 27, 68, 15, gloss(0x8a5a3a), 0.86, 2, 8);
      for (let i = 0; i < 14; i++) {
        const x = R(-27 + hash(i, 1, 0, 9) * 54), z = hash(i, 2, 0, 9) < 0.5 ? 16 : R(-15 + hash(i, 3, 0, 9) * 30);
        const xx = z === 16 ? x : (hash(i, 4, 0, 9) < 0.5 ? -29 : 29);
        const h = 2 + R(hash(i, 5, 0, 9) * 5);
        for (let k = 0; k < h; k++) v.set(xx + (k > 2 ? (i % 2 ? 1 : -1) : 0), k, z, gloss(k === h - 1 && i % 4 === 0 ? 0xffd23f : (i % 2 ? 0x5a8a3a : 0x6a9a42)));
      }
      grime(v, 0, 16, 0.78);
    },
  },

  // ------------------------------------------------------------- AC outdoor unit
  ac_unit: {
    name: 'AC Outdoor Unit', jp: 'エアコン室外機', voxel: 0.01,
    build(v) {
      const shell = (x, y, z) => gloss(shade(0xe8e6dc, vnoise(x, y, z, 8, 1) > 0.64 ? 0.96 : 1));
      // plastic stand blocks
      for (const x of [-34, 26]) fill(v, x, 0, -13, x + 8, 5, 13, (xx, y) => shade(0x4a4a4a, y === 5 ? 1.1 : 1));
      // body with softened top edges
      fill(v, -40, 6, -14, 40, 58, 14, shell);
      for (const x of [-40, 40]) { v.box(x, 58, -14, x, 58, 14, null); v.box(x, 6, -14, x, 6, 14, null); }
      v.box(-40, 58, 14, 40, 58, 14, null); v.box(-40, 58, -14, 40, 58, -14, null);
      // fan opening (recessed) with dark blades
      const FX = -10, FY = 32, FR = 22;
      v.shape(FX - FR, FY - FR, 10, FX + FR, FY + FR, 14, (x, y) => Math.hypot(x - FX, y - FY) <= FR, null);
      v.shape(FX - FR, FY - FR, 10, FX + FR, FY + FR, 10, (x, y) => Math.hypot(x - FX, y - FY) <= FR, (x, y) => {
        const a = Math.atan2(y - FY, x - FX), d = Math.hypot(x - FX, y - FY);
        const blade = Math.sin(a * 3 + d * 0.12) > 0.2;
        return blade ? gloss(shade(0x4a5054, 0.9 + d / FR * 0.2)) : 0x161616;
      });
      v.cylinder(FX, FY, 11, 4, 2, gloss(0x3a3e42), 'z');
      // grille: rings + spokes, flush with the front
      v.shape(FX - FR, FY - FR, 14, FX + FR, FY + FR, 14, (x, y) => {
        const d = Math.hypot(x - FX, y - FY), a = Math.atan2(y - FY, x - FX);
        if (d > FR + 0.3) return false;
        if (d > FR - 1.2) return true;
        if (Math.abs(((d + 1) % 4) - 2) < 0.55) return true;
        return [0, 1, 2, 3].some((k) => Math.abs(Math.sin(a - k * Math.PI / 4)) * d < 0.6 && d > 5) || d < 3.5;
      }, (x, y) => (Math.hypot(x - FX, y - FY) < 3.5 ? gloss(0xf4f2ea) : gloss(0x6a6e70)));
      v.shape(FX - FR - 1, FY - FR - 1, 15, FX + FR + 1, FY + FR + 1, 15, (x, y) => Math.abs(Math.hypot(x - FX, y - FY) - FR - 0.4) < 0.7, gloss(0xd4d2c8));
      // badge + energy sticker on the right panel
      fill(v, 18, 48, 15, 30, 50, 15, () => gloss(0xc8ccd0)); fill(v, 19, 49, 15, 24, 49, 15, () => gloss(0x2f6fd6));
      fill(v, 20, 20, 15, 32, 34, 15, () => gloss(0xf4f2ea));
      for (let k = 0; k < 5; k++) v.box(21, 31 - k * 2, 15, 22 + k * 2, 31 - k * 2, 15, gloss([0x3cae5a, 0x9bd94a, 0xffd23f, 0xff8c2e, 0xe5383b][k]));
      v.box(27, 23, 15, 31, 23, 15, gloss(0x5a5a5a));
      // rear heat-exchanger fins (aluminium) behind a grille
      v.paint(() => v.box(-37, 9, -14, 37, 55, -14, (x, y) => (x % 2 === 0 ? metal(0xb8bcc0) : metal(0x8a9094))));
      for (let y = 12; y <= 52; y += 8) v.box(-37, y, -15, 37, y, -15, gloss(0xd4d2c8));
      // left side fins too
      v.paint(() => v.box(-40, 9, -12, -40, 55, 10, (x, y, z) => (z % 2 === 0 ? metal(0xb8bcc0) : metal(0x8a9094))));
      // right side: service cover, two flare valves with insulated pipes rising into a duct cover
      fill(v, 41, 12, -2, 42, 28, 12, () => gloss(0xdcdad0));
      for (const [y, r] of [[16, 1.6], [23, 2.2]]) {
        v.cylinder(43, y, 6, r + 0.6, 2, metal(0xc87a4a), 'x');
        v.cylinder(45, y, 6, r + 1.2, 6, gloss(0xf2f0ea), 'x');
      }
      fill(v, 49, 10, 2, 56, 30, 10, (x, y, z) => gloss(shade(0xe6dcc6, 0.97 + hash(x, y, z, 4) * 0.03)));
      fill(v, 49, 30, -2, 56, 95, 6, (x, y, z) => gloss(shade(0xe6dcc6, (y % 18 === 0 ? 0.86 : 0.98) + hash(x, y, z, 4) * 0.02)));
      fill(v, 48, 28, -3, 57, 31, 11, () => gloss(0xd8ceb8));
      // drain hose snaking along the ground
      path(v, [[30, 6, 8], [36, 3, 12], [44, 1, 15], [52, 1, 18], [58, 1, 16]], gloss(0x5a5e60), 1);
      // stains, a little rust, leaves caught on top
      blotch(v, -40, 6, -14, 40, 12, 14, gloss(0x9a8a6a), 0.86, 2, 5);
      v.layer(['.GG', 'GGG', 'G..'], { G: 0x9a7a3a }, { x: 10, y: 59, z: -6, plane: 'xz' });
      v.layer(['YY.', '.YY'], { Y: 0xc89a3a }, { x: -24, y: 59, z: 4, plane: 'xz' });
      grime(v, 0, 22, 0.8);
    },
  },
  // ============================================================ VEHICLES
  // ------------------------------------------------------------- kei tall wagon
  kei_car: {
    name: 'Kei Tall Wagon', jp: '軽トールワゴン', voxel: 0.038,
    build(v) {
      const AF = 28, AR = -31, WR = 7;
      const mint = paintFn(0xa4dac6, 3, 0.03);
      const white = paintFn(0xf6f4ee, 4, 0.025);
      const trim = gloss(0x2a2c30);
      const zF = (y) => (y <= 5 ? 38 + (y - 3) : y <= 17 ? 41 : y <= 21 ? 41 - (y - 17) * 2 : y <= 40 ? 33 - (y - 22) * 0.6 : [21, 19.5, 17][y - 41]);
      const zB = (y) => (y <= 4 ? -38 - (y - 3) : y <= 40 ? -40 + Math.max(0, y - 28) * 0.08 : [-38.5, -37.5, -36][y - 41]);
      const hw = (y) => (y <= 4 ? 16 + (y - 3) : y <= 24 ? 18 : y <= 40 ? 18 - (y - 24) * 0.13 : [15.3, 14.6, 13.6][y - 41]);
      const inBody = (x, y, z) => {
        if (y < 3 || y > 43) return false;
        const h = hw(y), f = zF(y), b = zB(y);
        if (Math.abs(x) > h || z > f || z < b) return false;
        const rc = z > 0 ? 5 : 3;
        const dx = Math.abs(x) - (h - rc), dz = z > 0 ? z - (f - rc) : (b + rc) - z;
        if (dx > 0 && dz > 0 && dx * dx + dz * dz > rc * rc + 0.5) return false;
        for (const az of [AF, AR]) if (Math.abs(x) > 11 && Math.hypot(y - WR, z - az) < WR + 2.2) return false;
        return true;
      };
      const glassF = glass(0xb4d2de), glassR = glass(0x46525e);
      const inWin = (z, y) => y >= 24 && y <= 38 && ((z >= 6 && z <= zF(y) - 4) || (z >= -21 && z <= 3) || (z >= -37 && z <= -25));
      const col = (x, y, z) => {
        if (y <= 3) return 0x2a2a2c;
        const out = (dx, dy, dz) => !inBody(x + dx, y + dy, z + dz);
        const isSide = out(1, 0, 0) || out(-1, 0, 0), isFront = out(0, 0, 1), isRear = out(0, 0, -1);
        if (y >= 23) {
          if (y >= 40 || (out(0, 1, 0) && !isSide && !isFront && !isRear)) return white(x, y, z);
          if (isSide && !isFront && !isRear && (y === 23 || y === 39)) return trim;
          if (isFront && !isSide && y <= 38 && Math.abs(x) <= hw(y) - 2) return glassF;
          if (isRear && !isSide && y >= 25 && y <= 38 && Math.abs(x) <= hw(y) - 3) return glassR;
          if (isSide && !isFront && !isRear && inWin(z, y)) return z < -22 ? glassR : glassF;
          return white(x, y, z);
        }
        if (y <= 5) return gloss(0x45484c);
        return mint(x, y, z);
      };
      v.shape(-19, 3, -41, 19, 43, 42, inBody, col);
      // hollow cabin so the interior shows through the glass
      const carve = [];
      v.forEach((x, y, z) => {
        if (y >= 12 && y <= 39 && z < 31 && inBody(x + 1, y, z) && inBody(x - 1, y, z) && inBody(x, y + 1, z) && inBody(x, y - 1, z) && inBody(x, y, z + 1) && inBody(x, y, z - 1)) carve.push([x, y, z]);
      });
      for (const [x, y, z] of carve) v.remove(x, y, z);
      tint(v, -16, 11, -39, 16, 11, 30, () => 0x3a3a3e);
      // ---- interior: dash, steering wheel (right-hand drive), seats, a little shopping
      fill(v, -16, 12, 23, 16, 23, 31, (x, y) => gloss(y === 23 ? 0x3a3c40 : 0x2e3034));
      v.box(-3, 20, 22, 1, 21, 22, glow(0x6ad0ff));
      v.torus(-8, 26, 21, 3, 0.6, gloss(0x1e1e20), 'z');
      v.box(-8, 26, 21, -8, 26, 22, gloss(0x3a3a3e)); rod(v, -8, 25, 22, -8, 22, 24, gloss(0x2a2a2e));
      v.sphere(8, 25, 26, 1.5, gloss(0xffd23f)); v.set(8, 25, 28, gloss(0xff8c2e)); v.set(7, 26, 27, 0x1a1a1a); v.set(9, 26, 27, 0x1a1a1a); // dash chick
      const fab = (x, y, z) => shade(0xbcb09a, (x + y + z) % 5 === 0 ? 0.9 : 1);
      for (const sx of [-8, 8]) {
        fill(v, sx - 5, 12, 6, sx + 5, 15, 15, fab);
        v.shape(sx - 5, 16, 2, sx + 5, 31, 6, (x, y, z) => z === 4 + Math.round((16 - y) * 0.12) || z === 5 + Math.round((16 - y) * 0.12), fab);
        fill(v, sx - 3, 33, 3, sx + 3, 36, 4, fab);
        v.box(sx - 2, 32, 3, sx - 2, 32, 3, metal(0xc8ccd0)); v.box(sx + 2, 32, 3, sx + 2, 32, 3, metal(0xc8ccd0));
      }
      fill(v, -15, 12, -21, 15, 15, -12, fab);
      fill(v, -15, 16, -24, 15, 29, -22, fab);
      for (const sx of [-9, 9]) fill(v, sx - 3, 31, -24, sx + 3, 33, -23, fab);
      v.box(-2, 37, 23, 2, 38, 23, gloss(0x2a2a2e)); v.box(-2, 37, 22, 2, 38, 22, metal(0xd8dce0));
      v.set(0, 36, 23, 0xf4f0e6); v.box(0, 33, 23, 1, 35, 23, gloss(0xd8241f)); v.box(0, 34, 23, 1, 34, 23, gloss(0xf2c14e)); // omamori
      fill(v, 5, 12, -37, 11, 19, -31, (x, y) => (y === 19 ? 0xe4d8bc : 0xd8ccb0)); // eco bag
      for (const [x, z, h] of [[7, -34, 29], [9, -33, 27], [8, -35, 31]]) { v.line(x, 18, z, x, h - 4, z, 0xf2f2e6); v.line(x, h - 4, z, x + 1, h, z + 1, gloss(0x4a9a3a)); }
      // ---- front: round headlights, grille, bumper, yellow kei plate
      const HL_RING = ['..CCC..', '.CCCCC.', 'CCCCCCC', 'CCCCCCC', 'CCCCCCC', '.CCCCC.', '..CCC..'];
      const HL_LENS = ['.......', '..WWW..', '.WLLLW.', '.WLHLW.', '.WLLLW.', '..WWW..', '.......'];
      for (const cx of [-11, 11]) {
        v.project(HL_RING, { C: metal(0xd8dce0) }, cx - 3, 16, '+z');
        v.project(HL_LENS, { W: gloss(0xf2efe2), L: gloss(0xfbf8ee), H: glow(0xfff6d8) }, cx - 3, 16, '+z', { raise: true });
        v.project(['AA', 'AA'], { A: gloss(0xffa630) }, cx < 0 ? cx - 6 : cx + 5, 10, '+z');
      }
      v.project(['KKKKKKKKKKKKK', 'MMMMMMMMMMMMM', 'KKKKKKCKKKKKK', 'KKKKKKKKKKKKK'], { K: gloss(0x2a2c30), M: metal(0xd0d4d8), C: metal(0xeef0f2) }, -6, 15, '+z');
      v.project(['KKKKKKKKKKKKKKKKKKK', 'KKKKKKKKKKKKKKKKKKK'], { K: gloss(0x232427) }, -9, 6, '+z');
      v.project(['YYYYYYYYY', 'YYKYKYKYY', 'YKKYKKYKY', 'YYYYYYYYY'], { Y: gloss(0xf2cf2a), K: gloss(0x2a3a2a) }, -4, 10, '+z', { raise: true });
      v.project(['KKKKKKKKKK.KKKKKKKKKK'], { K: gloss(0x1e1e20) }, -10, 24, '+z', { raise: true }); // wipers
      // ---- sides: mirrors, handles, door seams, fuel lid, side repeaters
      for (const s of [-1, 1]) {
        fill(v, s * 19, 23, 29, s * 20, 25, 31, (x, y, z) => (z === 29 ? metal(0xc8d0d8) : mint(x, y, z)));
        v.set(s * 18, 23, 30, trim); v.set(s * 18, 22, 30, trim);
        v.box(s * 19, 20, 13, s * 19, 20, 14, metal(0xd8dce0));
        v.box(s * 19, 19, 1, s * 19, 20, 1, metal(0xd8dce0));
        v.set(s * 19, 17, 31, gloss(0xffa630));
        tint(v, -19, 6, 4, 19, 22, 4, (x, y, z, c, m) => (Math.abs(x) >= 17 ? enc(0x5a7a70, MAT.GLOSS) : undefined));
        tint(v, -19, 6, 22, 19, 22, 22, (x, y, z, c, m) => (Math.abs(x) >= 17 ? enc(0x5a7a70, MAT.GLOSS) : undefined));
        tint(v, -19, 6, -22, 19, 22, -22, (x, y, z, c, m) => (Math.abs(x) >= 17 ? enc(0x5a7a70, MAT.GLOSS) : undefined));
      }
      v.project(['KKK', 'K.K', 'KKK'], { K: gloss(0x7aa898) }, -34, 19, '+x');
      // ---- rear: tall tail lamps, plate, handle, wakaba (beginner) mark, wiper, stop lamp
      const TAIL = ['RRR', 'RRR', 'RRR', 'RRR', 'RRR', 'RRR', 'RRR', 'WWW', 'WWW', 'AAA', 'AAA', 'AAA', 'RRR', 'RRR'];
      for (const x0 of [-17, 15]) v.project(TAIL, { R: gloss(0xd8281f), W: gloss(0xf2f0ea), A: gloss(0xffa630) }, x0, 31, '-z', { raise: true });
      v.project(['YYYYYYYYY', 'YYKYKYKYY', 'YKKYKKYKY', 'YYYYYYYYY'], { Y: gloss(0xf2cf2a), K: gloss(0x2a3a2a) }, -4, 15, '-z', { raise: true });
      v.project(['MMMMMMM'], { M: metal(0xd8dce0) }, -3, 18, '-z', { raise: true });
      v.project(['GGYY', 'GGYY', 'GGYY', '.GY.'], { G: gloss(0x3cae5a), Y: gloss(0xffd23f) }, -12, 22, '-z', { raise: true });
      v.project(['RRRRRRR'], { R: gloss(0xe5383b) }, -3, 39, '-z');
      v.project(['K......', '.KK....', '...KK..', '.....KK'], { K: gloss(0x1e1e20) }, -6, 28, '-z', { raise: true });
      v.project(['KKKKKKKKKKKKKKKKKKKKKKKKK', 'KKKKKKKKKKKKKKKKKKKKKKKKK'], { K: gloss(0x26282b) }, -12, 6, '-z');
      for (const x of [-14, 14]) v.project(['R'], { R: gloss(0xc8201a) }, x, 8, '-z', { raise: true });
      v.cylinder(-10, 3, -42, 1, 3, metal(0xb8bcc0), 'z');
      v.box(-1, 44, -34, 0, 46, -34, gloss(0x1e1e20));
      // ---- wheels: tyres + steel wheels with hub caps
      for (const az of [AF, AR]) for (const s of [-1, 1]) {
        const x0 = s < 0 ? -17 : 13, xo = s < 0 ? -17 : 17;
        v.cylinder(x0, WR, az, WR, 5, (x, y, z) => ((Math.round(Math.atan2(y - WR, z - az) * 10 / Math.PI) & 1) && Math.hypot(y - WR, z - az) > WR - 0.8 ? 0x2c2c2e : 0x1e1e20), 'x');
        v.shape(xo, WR - 5, az - 5, xo, WR + 5, az + 5, (x, y, z) => Math.hypot(y - WR, z - az) <= 4.7, (x, y, z) => {
          const d = Math.hypot(y - WR, z - az), a = Math.atan2(y - WR, z - az);
          if (d < 1.4) return metal(0xeef0f2);
          if (d > 3.9) return metal(0x8a9096);
          return Math.abs(Math.sin(a * 2.5)) < 0.35 && d > 2.2 ? gloss(0x3a3c40) : metal(0xc8ccd0);
        });
      }
      grime(v, 0, 9, 0.8, 0x6a5a48);
    },
  },

  // ------------------------------------------------------------- 50cc scooter
  scooter: {
    name: '50cc Scooter', jp: '原付スクーター', voxel: 0.015,
    build(v) {
      const red = paintFn(0xd8463c, 5, 0.035);
      const cream = paintFn(0xf2e8d0, 6, 0.03);
      const chrome = metal(0xd8dce2), chromeD = metal(0xa8aeb4);
      const FZ = 38, RZ = -36, WY = 15;
      // wheels
      for (const az of [FZ, RZ]) {
        v.cylinder(-3, WY, az, 15, 7, (x, y, z) => ((Math.round(Math.atan2(y - WY, z - az) * 12 / Math.PI) & 1) && Math.hypot(y - WY, z - az) > 13.6 ? 0x2c2c2e : 0x1e1e20), 'x');
        for (const xo of [-4, 4]) v.shape(xo, WY - 10, az - 10, xo, WY + 10, az + 10, (x, y, z) => Math.hypot(y - WY, z - az) <= 9.6, (x, y, z) => {
          const d = Math.hypot(y - WY, z - az), a = Math.atan2(y - WY, z - az);
          if (d < 2.4) return chrome;
          if (d > 8.2) return chromeD;
          return Math.abs(Math.sin(a * 2.5)) < 0.3 ? gloss(0xe8e2d0) : gloss(0x5a5c60);
        });
      }
      // front fork + fender
      for (const s of [-1, 1]) rod(v, s * 5, WY, FZ, s * 5, 40, FZ - 6, chrome, 2);
      v.shape(-5, WY, FZ - 20, 5, WY + 20, FZ + 20, (x, y, z) => {
        const d = Math.hypot(y - WY, z - FZ), a = Math.atan2(y - WY, z - FZ);
        return d >= 16.2 && d <= 18.4 && a > 0.25 && a < 2.4 && Math.abs(x) <= 4 - (d > 17.6 ? 0 : 0);
      }, (x, y, z) => red(x, y, z));
      // floorboard with rubber mat
      fill(v, -10, 17, -14, 10, 20, 27, (x, y, z) => (y === 20 && Math.abs(x) <= 8 && z < 25 ? (x % 2 ? 0x3a3a3c : 0x2a2a2c) : red(x, y, z)));
      v.box(-10, 17, -14, 10, 17, 27, gloss(0x3a3a3c));
      // leg shield / apron: red front, cream inner
      const zA = (y) => 27 + 6 * Math.sin(Math.PI * clamp((y - 17) / 50, 0, 1));
      const wA = (y) => 11.5 - (y - 17) * 0.06;
      v.shape(-12, 17, 18, 12, 66, 36, (x, y, z) => {
        const w = wA(y); if (Math.abs(x) > w) return false;
        const zf = zA(y) - (x / w) ** 2 * 3;
        return z <= zf && z >= zf - 3;
      }, (x, y, z) => (z >= zA(y) - (x / wA(y)) ** 2 * 3 - 1.7 ? red(x, y, z) : cream(x, y, z)));
      v.paint(() => v.shape(-12, 17, 18, 12, 66, 36, (x, y) => Math.abs(Math.abs(x) - wA(y)) < 1, gloss(0xb83a32)));
      // emblem + horn grille + turn signals on the apron
      v.project(['.MMM.', 'MRRRM', 'MRWRM', 'MRRRM', '.MMM.'], { M: chrome, R: gloss(0xb8302a), W: chrome }, -2, 50, '+z', { raise: true });
      v.project(['KKKKK', '.....', 'KKKKK', '.....', 'KKKKK'], { K: gloss(0x2a2a2c) }, -2, 40, '+z');
      // handlebar cover with headlight + speedo
      v.shape(-9, 61, 22, 9, 72, 36, (x, y, z) => ((x / 9.5) ** 2 + ((y - 66) / 5.5) ** 2 + ((z - 29) / 7.5) ** 2) <= 1, (x, y, z) => (y >= 68 ? cream(x, y, z) : red(x, y, z)));
      v.cylinder(0, 66, 35, 4.3, 2, chrome, 'z');
      v.cylinder(0, 66, 37, 3.4, 1, gloss(0xf6f2e2), 'z'); v.set(0, 66, 37, glow(0xfff6d8)); v.set(-1, 67, 37, gloss(0xffffff));
      v.cylinder(0, 72, 27, 3, 1, chrome); v.cylinder(0, 72, 27, 2, 1, gloss(0xfbf8f0));
      v.set(1, 72, 26, gloss(0xe5383b)); v.set(0, 72, 27, 0x2a2a2a);
      // bars, grips, levers, mirrors
      rod(v, -18, 67, 28, 18, 67, 28, chromeD, 2);
      for (const s of [-1, 1]) {
        fill(v, s > 0 ? 15 : -20, 66, 27, s > 0 ? 20 : -15, 68, 29, () => gloss(0x2a2a2c));
        rod(v, s * 13, 69, 30, s * 19, 69, 33, chrome);
        rod(v, s * 11, 69, 27, s * 15, 81, 26, chrome);
        v.cylinder(s * 15, 83, 25, 2.6, 1, chrome, 'z'); v.cylinder(s * 15, 83, 24, 2, 1, metal(0xc8d4dc), 'z');
        v.set(s * 9, 63, 33, gloss(0xffa630)); v.set(s * 9, 62, 33, gloss(0xffa630));
      }
      // frame cover under the seat + rounded rear body
      v.shape(-9, 18, -16, 9, 44, -4, (x, y, z) => z <= -5 - (y - 20) * 0.3 && Math.abs(x) <= 9 - (y < 22 ? 0 : 0) - (Math.abs(x) > 7 && z > -6 - (y - 20) * 0.3 ? 1 : 0), (x, y, z) => (y < 25 ? cream(x, y, z) : red(x, y, z)));
      const cowl = (x, y, z) => {
        if (y < 18) return false;
        const e = (Math.abs(x) / 12.5) ** 2.6 + (Math.abs(y - 31) / 13.5) ** 2.6 + (Math.abs(z + 30) / 21) ** 2.6;
        if (e > 1) return false;
        if (Math.abs(x) <= 4 && Math.hypot(y - WY, z - RZ) < 17.5) return false;
        return true;
      };
      v.shape(-13, 18, -51, 13, 45, -7, cowl, (x, y, z) => (y < 25 ? cream(x, y, z) : red(x, y, z)));
      v.paint(() => v.shape(-13, 25, -51, 13, 25, -7, () => true, chrome));
      // seat: brown leather with cream piping
      v.shape(-11, 44, -47, 11, 51, -8, (x, y, z) => {
        const t = (z + 27.5) / 19.5;
        if (Math.abs(t) > 1) return false;
        const w = 10.5 - Math.max(0, t) * 2.5;
        if (Math.abs(x) > w) return false;
        const top = 49 + (t < -0.55 ? 1 : 0) - (x / w) ** 4 * 2 - (Math.abs(t) > 0.92 ? 1 : 0);
        return y <= top;
      }, (x, y, z) => (y === 45 ? gloss(0xf2e8d0) : gloss(shade(0x6a3e28, ((z + 100) % 6 === 0 && y >= 48) ? 0.86 : 1))));
      // rear rack + a little half helmet riding on it
      for (const x of [-6, 6]) { rod(v, x, 50, -44, x, 50, -56, chrome); rod(v, x, 50, -54, x, 41, -50, chrome); }
      for (const z of [-48, -52, -56]) rod(v, -6, 50, z, 6, 50, z, chrome);
      v.shape(-6, 51, -57, 6, 57, -45, (x, y, z) => (x / 6.2) ** 2 + ((y - 51) / 6) ** 2 + ((z + 51) / 6.2) ** 2 <= 1, (x, y, z) => gloss(y === 51 ? 0x5a3a28 : 0xf4efe2));
      v.paint(() => v.shape(-7, 52, -58, 7, 52, -44, () => true, gloss(0x8ac4e0)));
      // tail lamp + white 50cc plate
      v.project(['.RRRR.', 'RRRRRR', 'RWWWWR'], { R: gloss(0xd8281f), W: gloss(0xf2f0ea) }, -3, 38, '-z', { raise: true });
      v.project(['WWWWWWWWWWW', 'WBWBBWBBWBW', 'WBBWBBWBBWW', 'WWWWWWWWWWW'], { W: gloss(0xf8f6f0), B: gloss(0x3a6ab0) }, -5, 31, '-z', { raise: true });
      // engine case (left) + muffler (right)
      v.shape(4, 8, -46, 10, 21, -22, (x, y, z) => ((y - 14.5) / 6.5) ** 2 + ((z + 34) / 12.5) ** 2 <= 1, (x, y, z) => metal(shade(0xa8acb0, x === 10 ? 1.05 : 0.9)));
      v.cylinder(-11, 12, -52, 2.6, 22, gloss(0x2a2a2c), 'z');
      v.shape(-14, 11, -48, -11, 15, -34, (x, y, z) => x === -14 || y === 15, chrome);
      v.cylinder(-11, 12, -53, 1.4, 1, gloss(0x111111), 'z');
      rod(v, -9, 12, -30, -4, 12, -26, gloss(0x2a2a2c), 2);
      // centre stand
      for (const s of [-1, 1]) rod(v, s * 7, 16, -14, s * 7, 0, -18, gloss(0x2a2a2c), 2);
      v.box(-7, 0, -19, 7, 0, -18, gloss(0x2a2a2c));
      grime(v, 0, 10, 0.82);
    },
  },

  // ------------------------------------------------------------- mamachari
  mamachari: {
    name: 'Mamachari Bicycle', jp: 'ママチャリ', voxel: 0.012,
    build(v) {
      v.jitter = 0;
      const frameC = gloss(0x9cc8dc), frameD = gloss(0x7aa8bc);
      const chrome = metal(0xd8dce2), steel = metal(0xa8aeb4), black = gloss(0x222224);
      const cream = gloss(0xf2ecdc), brown = gloss(0x6a4430);
      const RZ = -46, FZ = 47, WY = 27;
      const bez = (p0, p1, p2, c, w = 2, n = 40) => {
        let prev = p0;
        for (let i = 1; i <= n; i++) {
          const t = i / n, u = 1 - t;
          const p = p0.map((_, k) => u * u * p0[k] + 2 * u * t * p1[k] + t * t * p2[k]);
          rod(v, R(prev[0]), R(prev[1]), R(prev[2]), R(p[0]), R(p[1]), R(p[2]), c, w);
          prev = p;
        }
      };
      const wheel = (cz) => {
        v.torus(0, WY, cz, 26.2, 1.4, 0x232325, 'x');
        v.torus(0, WY, cz, 24.2, 0.7, chrome, 'x');
        v.cylinder(-3, WY, cz, 1.7, 7, steel, 'x');
        for (let k = 0; k < 16; k++) {
          const a = k / 16 * TAU, b = a + (k & 1 ? 0.25 : -0.25);
          v.line(k & 1 ? -2 : 2, WY + Math.sin(a) * 1.5, cz + Math.cos(a) * 1.5, 0, WY + Math.sin(b) * 23.6, cz + Math.cos(b) * 23.6, metal(0xc4c8cc));
        }
      };
      wheel(RZ); wheel(FZ);
      // fenders (cream) with a red reflector
      const fender = (cz, a0, a1) => v.shape(-3, WY, cz - 31, 3, WY + 31, cz + 31, (x, y, z) => {
        const d = Math.hypot(y - WY, z - cz), a = Math.atan2(y - WY, z - cz);
        const aa = a < -1.2 ? a + TAU : a;
        return d >= 28.6 && d <= 30.2 && aa >= a0 && aa <= a1;
      }, cream);
      fender(FZ, 0.15, 2.5); fender(RZ, 0.7, 3.75);
      v.box(-1, 18, RZ - 30, 1, 21, RZ - 30, gloss(0xe5383b));
      // frame: swooping step-through down tube, seat tube, stays, fork
      const BB = [0, 23, -6], HB = [0, 64, 39], HT = [0, 77, 36];
      rod(v, ...HB, ...HT, frameC, 3);
      bez([0, 66, 37], [0, 22, 28], BB, frameC, 3);
      bez([0, 60, 36], [0, 30, 22], [0, 26, -2], frameC, 2);
      rod(v, ...BB, 0, 72, -17, frameC, 2);
      for (const s of [-1, 1]) {
        rod(v, s * 3, 23, -6, s * 3, WY, RZ, frameC, 2);
        rod(v, s * 2, 68, -16, s * 3, WY, RZ, frameC, 2);
        bez([s * 2, 64, 39], [s * 3, 44, 46], [s * 3, WY, FZ], frameC, 2);
      }
      v.box(-3, 63, 37, 3, 65, 40, frameD);
      // registration sticker on the seat tube
      v.box(-1, 42, -11, 1, 46, -10, gloss(0xf8f4e8)); v.box(-1, 44, -11, 1, 44, -10, gloss(0xffd23f));
      // seat post + sprung saddle
      rod(v, 0, 72, -17, 0, 80, -19, chrome, 2);
      v.shape(-8, 81, -30, 8, 86, -10, (x, y, z) => {
        const t = (z + 20) / 10;
        if (Math.abs(t) > 1) return false;
        const w = 7.5 - (t + 1) * 2.6;
        return Math.abs(x) <= w && y <= 85 - (Math.abs(t) > 0.85 ? 1 : 0) - (Math.abs(x) > w - 1 ? 1 : 0);
      }, (x, y) => (y === 81 ? gloss(0x3a2a20) : brown));
      for (const s of [-1, 1]) for (let y = 77; y <= 80; y++) v.torus(s * 4, y, -26, 1.2, 0.4, chrome, 'y');
      // chain case (right side = -x) + cranks + pedals
      const capsule = (y, z) => {
        const ax = 23, az = -6, bx = WY, bz = RZ;
        const t = clamp(((y - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2), 0, 1);
        return Math.hypot(y - (ax + (bx - ax) * t), z - (az + (bz - az) * t)) - (9 - 4 * t);
      };
      v.shape(-6, 10, -55, -4, 34, 4, (x, y, z) => capsule(y, z) <= 0, (x, y, z) => (capsule(y, z) > -1 ? frameD : x === -6 ? frameC : gloss(0x5a6a72)));
      v.cylinder(-7, 23, -6, 2, 1, chrome, 'x');
      rod(v, -8, 23, -6, -8, 15, 0, steel, 2);
      fill(v, -13, 14, -2, -9, 15, 3, (x, y, z) => (z === 3 ? gloss(0xffa630) : black));
      rod(v, 4, 23, -6, 4, 31, -12, steel, 2);
      fill(v, 5, 30, -15, 9, 31, -10, (x, y, z) => (z === -10 ? gloss(0xffa630) : black));
      // stem + swept-back handlebar, grips, bell, levers
      rod(v, 0, 77, 36, 0, 85, 35, chrome, 2);
      for (const s of [-1, 1]) {
        path(v, [[0, 85, 35], [s * 9, 85, 35], [s * 16, 86, 31], [s * 21, 86, 25]], chrome, 0.6);
        rod(v, s * 21, 86, 25, s * 24, 86, 20, brown, 3);
        rod(v, s * 15, 86, 30, s * 21, 84, 32, steel);
      }
      v.sphere(15, 88, 30, 1.6, chrome); v.set(15, 90, 30, steel);
      // front wire basket + struts + lamp
      const BX = 13, BY0 = 67, BY1 = 83, BZ0 = 42, BZ1 = 62;
      v.shape(-BX, BY0, BZ0, BX, BY1, BZ1, (x, y, z) => {
        const wall = Math.abs(x) === BX || z === BZ0 || z === BZ1 || y === BY0;
        if (!wall) return false;
        if (y === BY1 || y === BY0 + 1 && (Math.abs(x) === BX || z === BZ0 || z === BZ1)) return true;
        if (y === BY0) return (x + 40) % 4 === 0 || (z + 40) % 4 === 0;
        if (Math.abs(x) === BX) return (z + 40) % 4 === 0 || (y + 40) % 4 === 0;
        return (x + 40) % 4 === 0 || (y + 40) % 4 === 0;
      }, (x, y) => (y === BY1 ? gloss(0x3a3a3e) : gloss(0x2a2a2e)));
      for (const s of [-1, 1]) rod(v, s * 8, BY0, BZ1 - 2, s * 3, WY, FZ, steel);
      rod(v, 0, 70, 40, 0, 72, 43, steel, 2);
      fill(v, -2, 58, 48, 2, 62, 51, () => chrome); v.box(-1, 59, 52, 1, 61, 52, gloss(0xfbf8ee)); v.set(0, 60, 52, glow(0xfff6d8));
      // pink eco bag in the basket with a leek poking out
      fill(v, -9, 68, 46, 4, 78, 57, (x, y) => (y >= 77 ? 0xf2a0b8 : 0xf8b8c8));
      v.project(['.WWW.', 'W...W', 'W...W'], { W: 0xf2a0b8 }, -5, 81, '+z', { raise: true });
      v.line(7, 70, 50, 9, 92, 47, 0xf4f4ea, 0.6); v.line(9, 88, 47, 11, 98, 45, gloss(0x4a9a3a), 0.6); v.line(9, 90, 47, 6, 97, 48, gloss(0x5aaa42));
      // rear carrier + ring lock + two-leg stand
      for (const x of [-6, -2, 2, 6]) rod(v, x, 62, -26, x, 62, -60, chrome);
      for (const z of [-26, -43, -60]) rod(v, -6, 62, z, 6, 62, z, chrome);
      for (const s of [-1, 1]) { rod(v, s * 6, 62, -58, s * 4, WY, RZ, chrome); rod(v, s * 6, 62, -27, s * 3, 66, -17, chrome); }
      v.box(-4, 37, -42, 4, 41, -38, steel); v.box(-4, 38, -38, 4, 40, -38, gloss(0x3a3a3e)); v.set(4, 39, -37, metal(0xe8c860));
      for (const s of [-1, 1]) rod(v, s * 4, WY, RZ, s * 6, 0, RZ - 5, steel, 2);
      rod(v, -6, 0, RZ - 5, 6, 0, RZ - 5, steel, 2);
      v.box(-1, 54, RZ - 25, 1, 56, RZ - 25, gloss(0xe5383b));
      grime(v, 0, 8, 0.85);
    },
  },

  // ============================================================ GARBAGE DAY
  // ------------------------------------------------------------- garbage station
  garbage_station: {
    name: 'Garbage Collection Station', jp: 'ゴミ集積所', voxel: 0.02,
    build(v) {
      v.jitter = 0.008;
      // pad with a painted yellow border
      fill(v, -38, 0, -26, 38, 1, 25, (x, y, z) => (vnoise(x, 0, z, 10, 2) > 0.7 ? 0xa8a49c : 0xb4b0a8));
      v.paint(() => v.shape(-38, 1, -26, 38, 1, 25, (x, y, z) => Math.abs(x) >= 37 || z >= 24 || z <= -25, gloss(0xf2d23a)));
      // translucent 45L bags: lumpy, contents showing through, printed city logo, knotted ears
      const CONTENT = [0xd8c890, 0xe8a8a0, 0xa8c8a0, 0xc8b8d8, 0xf0d080];
      const bag = (cx, y0, cz, rx, ry, rz, s, print) => {
        const cy = y0 + ry - 1;
        const tone = (x, y, z) => {
          let c = 0xeef0ea;
          const n = vnoise(x, y, z, 2.6, s + 1);
          if (n > 0.68) c = mix(c, CONTENT[Math.floor(hash(x >> 2, y >> 2, z >> 2, s) * CONTENT.length)], 0.32);
          if (y === cy + 2 && z > cz && Math.abs(x - cx) < rx - 2 && (x + s) % 3 !== 0) c = print;
          if (y === cy + 4 && z > cz && Math.abs(x - cx) < 3) c = print;
          return gloss(c);
        };
        v.shape(cx - rx - 2, y0, cz - rz - 2, cx + rx + 2, cy + ry + 2, cz + rz + 2, (x, y, z) => {
          const n = vnoise(x, y, z, 4, s) * 0.26 - 0.13;
          const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2;
          return e <= 1 + n;
        }, tone);
        let ty = cy + ry + 1; while (ty > y0 && !v.has(cx, ty, cz)) ty--;
        v.ellipsoid(cx, ty + 1, cz, 1.6, 1.4, 1.6, gloss(0xe6e8e2));
        for (const sx of [-1, 1]) { v.set(cx + sx * 2, ty + 2, cz, gloss(0xeef0ea)); v.set(cx + sx * 3, ty + 3, cz, gloss(0xeef0ea)); v.set(cx + sx * 2, ty + 4, cz, gloss(0xe6e8e2)); }
      };
      bag(-26, 2, -14, 9, 11, 8, 1, 0x3a9a4a);
      bag(-8, 2, -15, 9, 12, 8, 2, 0x3a9a4a);
      bag(10, 2, -13, 8, 10, 8, 3, 0xe8783a);
      bag(-27, 2, 6, 8, 10, 8, 4, 0x3a9a4a);
      bag(-9, 2, 5, 9, 9, 9, 5, 0x3a9a4a);
      bag(-17, 16, -4, 9, 7, 7, 6, 0xe8783a);
      // "can't collect" sticker on one bag
      v.project(['YYYYY', 'YKKKY', 'YYYYY', 'YKKYY', 'YYYYY'], { Y: gloss(0xffd23f), K: 0x3a3a3a }, 5, 12, '+z');
      // drape the net: dilate the bag height field with a slope so it falls to the ground
      const NX0 = -37, NX1 = 30, NZ0 = -25, NZ1 = 24;
      const H = new Map(), k2 = (x, z) => x * 1000 + z;
      v.forEach((x, y, z) => { if (y >= 2) { const k = k2(x, z); if (!H.has(k) || H.get(k) < y) H.set(k, y); } });
      const N = new Map();
      for (let x = NX0; x <= NX1; x++) for (let z = NZ0; z <= NZ1; z++) {
        let best = -99;
        for (let dx = -9; dx <= 9; dx++) for (let dz = -9; dz <= 9; dz++) {
          const h = H.get(k2(x + dx, z + dz));
          if (h !== undefined) best = Math.max(best, h - Math.hypot(dx, dz) * 3.2);
        }
        if (best >= -9) N.set(k2(x, z), Math.max(1, Math.floor(best)));
      }
      const netC = () => gloss(0x2f9a6a);
      for (let x = NX0; x <= NX1; x++) for (let z = NZ0; z <= NZ1; z++) {
        if (!N.has(k2(x, z))) continue;
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => !N.has(k2(x + dx, z + dz)));
        const lx = (z + 60) % 4 === 0, lz = (x + 60) % 4 === 0; // strand running along x / along z
        if (!edge && !lx && !lz) continue;
        const n = N.get(k2(x, z));
        let lo = n;
        const nb = [...(lx || edge ? [[1, 0], [-1, 0]] : []), ...(lz || edge ? [[0, 1], [0, -1]] : [])];
        for (const [dx, dz] of nb) { const m = N.get(k2(x + dx, z + dz)); if (m !== undefined) lo = Math.min(lo, m); }
        lo = Math.max(lo, n - (edge ? 1 : 4));
        for (let y = lo + 1; y <= n + 1; y++) if (!v.has(x, y, z)) v.set(x, y, z, edge ? gloss(0xf2c83a) : netC(x, y, z));
        if (edge && (x + z) % 9 === 0) v.set(x, 2, z, gloss(0x4a4a4c));
      }
      // a crow inspecting the pile
      let cy = 0; while (v.has(-14, cy + 1, -6) || cy < 20) cy++;
      const crow = gloss(0x1c1e24), crowL = gloss(0x343a4a);
      v.ellipsoid(-14, cy + 6, -6, 3.5, 3.6, 6, (x, y, z) => (y > cy + 7 && z < -4 ? crowL : crow));
      v.sphere(-14, cy + 10, -1, 3, crow);
      v.cone(-14, cy + 10, 2, 1.4, 4, gloss(0x2a2a2e), 'z');
      v.set(-16, cy + 11, 0, gloss(0xe8e8e8)); v.set(-12, cy + 11, 0, gloss(0xe8e8e8));
      v.box(-15, cy + 4, -14, -13, cy + 6, -11, crow);
      for (const sx of [-1, 1]) { v.box(-14 + sx, cy + 1, -6, -14 + sx, cy + 2, -6, 0x3a3a3a); v.box(-14 + sx, cy + 1, -5, -14 + sx, cy + 1, -4, 0x3a3a3a); }
      // rules sign board on legs
      const galv = (x, y, z) => gloss(shade(0xa8aeb2, 0.92 + hash(x, y, z, 3) * 0.08));
      for (const x of [6, 32]) fill(v, x, 2, -24, x + 1, 73, -23, galv);
      fill(v, 2, 38, -22, 37, 74, -22, () => gloss(0xf8f6ee));
      fill(v, 2, 38, -23, 37, 74, -23, (x, y) => gloss(y % 12 === 0 ? 0x8a9094 : 0xa8aeb2));
      v.paint(() => v.shape(2, 38, -22, 37, 74, -22, (x, y) => x === 2 || x === 37 || y === 38 || y === 74, gloss(0x2f8a4a)));
      fill(v, 3, 64, -22, 36, 73, -22, () => gloss(0x2f8a4a));
      stamp(v, glyphRows('ゴミ出し'), { '#': gloss(0xfbf9f2) }, 4, 72, -22);
      stamp(v, glyphRows('ルール'), { '#': gloss(0x2f8a4a) }, 8, 62, -22);
      v.box(4, 58, -22, 6, 60, -22, gloss(0xe5383b)); v.box(32, 58, -22, 34, 60, -22, gloss(0xe5383b));
      const rowsY = [[53, 0xe5383b, ['.#.#.', '.###.', '#####', '.###.']], [48, 0x2f6fd6, ['..#..', '.###.', '.###.', '.###.']], [43, 0x3a9a4a, ['.###.', '.#.#.', '.###.', '.###.']]];
      for (const [y, c, icon] of rowsY) {
        fill(v, 4, y - 3, -22, 10, y, -22, () => gloss(c));
        stamp(v, icon, { '#': gloss(0xfbf9f2) }, 5, y, -22);
        for (let x = 13; x <= 35; x++) if ((x - 13) % 6 !== 5 && hash(x, y, 1, 4) < 0.85) { v.set(x, y - 1, -22, gloss(0x4a4a4a)); if (x < 30) v.set(x, y - 2, -22, gloss(0x7a7a7a)); }
      }
      grime(v, 0, 6, 0.85);
    },
  },

  // ------------------------------------------------------------- recycling cage
  recycle_cage: {
    name: 'Can & PET Recycling Cage', jp: '資源ゴミ回収ボックス', voxel: 0.02,
    build(v) {
      v.jitter = 0.012;
      const X0 = -22, X1 = 22, Y0 = 2, Y1 = 42, Z0 = -15, Z1 = 14;
      const green = gloss(0x3a8a5a), greenD = gloss(0x2c6c46), wire = gloss(0x52a272);
      // contents: cans (left) and PET bottles (right), heaped
      const CANS = [0xd8221e, 0x2a3a9a, 0xffd23f, 0x3cb04a, 0x2a2220, 0xff8a1a, 0xe8d4b0, 0xc8ccd0];
      const heap = (x, z, s) => 25 + vnoise(x, 0, z, 6, s) * 8 + hash(x >> 1, 0, z >> 1, s) * 2;
      v.shape(X0 + 1, Y0 + 1, Z0 + 1, -1, Y1 - 4, Z1 - 1, (x, y, z) => y <= heap(x, z, 1), (x, y, z) => {
        const lay = (Math.floor(y / 3) + Math.floor(x / 6)) % 2;
        const cx = lay ? Math.floor((x + 60) / 6) : Math.floor((x + 60) / 3), cz = lay ? Math.floor((z + 60) / 3) : Math.floor((z + 60) / 6), cyy = Math.floor(y / 3);
        const c = CANS[Math.floor(hash(cx, cyy, cz, 2) * CANS.length)];
        const end = lay ? (x + 60) % 6 === 0 : (z + 60) % 6 === 0;
        return end ? metal(0xc8ccd0) : gloss(shade(c, (y % 3 === 1 ? 1.08 : 0.94)));
      });
      v.shape(1, Y0 + 1, Z0 + 1, X1 - 1, Y1 - 4, Z1 - 1, (x, y, z) => y <= heap(x, z, 7) - 1, (x, y, z) => {
        const lay = (Math.floor(y / 3) + Math.floor(z / 9)) % 2;
        const along = lay ? (x + 60) % 10 : (z + 60) % 10;
        const cell = lay ? [Math.floor((x + 60) / 10), Math.floor((z + 60) / 3)] : [Math.floor((x + 60) / 3), Math.floor((z + 60) / 10)];
        if (along === 0) return gloss([0xe5383b, 0x2f6fd6, 0xffffff, 0x3cae5a, 0xff8c2e][Math.floor(hash(cell[0], y >> 2, cell[1], 8) * 5)]);
        if (along >= 4 && along <= 6) return gloss([0x3c8a3c, 0x3a86d6, 0xe8e0c0, 0xd03a2a, 0x5fc0e8][Math.floor(hash(cell[0], y >> 2, cell[1], 9) * 5)]);
        return gloss((x + z) % 4 === 0 ? 0xeef6f8 : 0xd4e6ec);
      });
      // wire mesh walls, divider and lid (grid 3), painted green frame
      v.shape(X0, Y0, Z0, X1, Y1, Z1, (x, y, z) => {
        const fx = x === X0 || x === X1, fy = y === Y0 || y === Y1, fz = z === Z0 || z === Z1;
        const mid = x === 0 && (y >= Y1 - 1 || z >= Z1 - 1 || z <= Z0 + 1);
        if (!(fx || fy || fz || mid)) return false;
        if ((fx || mid) + fy + fz >= 2) return true;
        if (fx || mid) return (y + 60) % 4 === 2 || (z + 60) % 4 === 1;
        if (fz) return (x + 60) % 4 === 2 || (y + 60) % 4 === 2;
        return (x + 60) % 4 === 2 || (z + 60) % 4 === 1;
      }, (x, y, z) => {
        const n = (x === X0 || x === X1 || x === 0) + (y === Y0 || y === Y1) + (z === Z0 || z === Z1);
        return n >= 2 ? green : wire;
      });
      // thick frame angles, lid lip, handle, hinges, feet
      for (const x of [X0, X1]) for (const z of [Z0, Z1]) fill(v, x - (x < 0 ? 1 : 0), 0, z - (z < 0 ? 1 : 0), x + (x > 0 ? 1 : 0), Y1, z + (z > 0 ? 1 : 0), () => green);
      fill(v, X0 - 1, Y1, Z1, X1 + 1, Y1 + 1, Z1 + 1, () => greenD);
      fill(v, X0 - 1, Y0 - 1, Z1, X1 + 1, Y0, Z1 + 1, () => greenD);
      rod(v, -6, Y1 + 1, Z1 + 2, 6, Y1 + 1, Z1 + 2, metal(0xc8ccd0)); v.set(-6, Y1, Z1 + 2, metal(0xc8ccd0)); v.set(6, Y1, Z1 + 2, metal(0xc8ccd0));
      for (const x of [-15, 15]) fill(v, x - 2, Y1, Z0 - 1, x + 2, Y1 + 1, Z0, () => metal(0x9aa0a4));
      // hanging plates: カン / PET
      for (const [x0, label, col] of [[-20, 'カン', 0xe5383b], [3, 'PET', 0x2f6fd6]]) {
        fill(v, x0, 27, Z1 + 2, x0 + 16, 36, Z1 + 2, () => gloss(0xf8f6ee));
        v.paint(() => v.shape(x0, 27, Z1 + 2, x0 + 16, 36, Z1 + 2, (x, y) => x === x0 || x === x0 + 16 || y === 27 || y === 36, gloss(col)));
        const w = glyphW(label);
        stamp(v, glyphRows(label), { '#': gloss(col) }, x0 + 8 - Math.floor(w / 2), label === 'PET' ? 33 : 34, Z1 + 2);
        for (const dx of [3, 13]) v.set(x0 + dx, 37, Z1 + 2, gloss(0x8a8a8a));
      }
      // a tied bundle of newspapers waiting beside the cage
      fill(v, 25, 0, -10, 41, 11, 8, (x, y, z) => (y % 2 ? 0xe8e2d0 : 0xd4ccba));
      v.paint(() => v.box(25, 11, -10, 41, 11, 8, (x, y, z) => ((x * 7 + z * 3) % 11 < 3 ? 0x7a7a7a : 0xdcd6c6)));
      for (const xx of [29, 37]) { v.box(xx, 0, 9, xx, 12, 9, 0xf4f0e6); v.box(xx, 12, -10, xx, 12, 8, 0xf4f0e6); }
      v.box(42, 0, -1, 42, 12, -1, 0xf4f0e6); v.box(24, 12, -1, 42, 12, -1, 0xf4f0e6);
      grime(v, 0, 8, 0.85);
    },
  },

  // ============================================================ HOUSES
  // ------------------------------------------------------------- house gate
  gate_house: {
    name: 'House Gate & Block Wall', jp: '門扉と表札', voxel: 0.025,
    build(v) {
      v.jitter = 0.02;
      // ground: footing strip + paved approach behind the gate
      fill(v, -60, 0, -4, 59, 0, 3, concrete(0x9e9a92, 1));
      fill(v, -18, 0, -34, 17, 1, -5, (x, y, z) => {
        const slab = (Math.floor((z + 60) / 10) + (Math.floor((x + 60) / 12) % 2)) % 2;
        const joint = (z + 60) % 10 === 0 || (x + 60) % 12 === 0;
        return joint ? 0x8a8478 : slab ? 0xc8c0b0 : 0xb8b0a0;
      });
      // block walls (left + right) with an openwork row
      const OPEN = ['###############', '##...#####...##', '#..#..###..#..#', '#.###.###.###.#', '#..#..###..#..#', '##...#####...##', '###############'];
      const blockWall = (x0, x1, h, s) => {
        v.shape(x0, 1, -3, x1, h, 2, (x, y, z) => {
          const c = Math.floor((y - 1) / 8), off = (c % 2) * 8, bx = (((x - x0 + off) % 16) + 16) % 16;
          const joint = (y - 1) % 8 === 7 || bx === 15;
          if (joint && (z === 2 || z === -3)) return false;
          const bi = Math.floor((x - x0 + off) / 16);
          if (!joint && c === 3 && bi % 2 === 1) return OPEN[(y - 1) % 8][bx] === '#';
          return true;
        }, (x, y, z) => {
          const c = Math.floor((y - 1) / 8), off = (c % 2) * 8, bx = (((x - x0 + off) % 16) + 16) % 16;
          if ((y - 1) % 8 === 7 || bx === 15) return 0x8c887e;
          const bi = Math.floor((x - x0 + off) / 16);
          return shade(0xaca89e, 0.94 + R(hash(bi, c, s, 4) * 3) * 0.035);
        });
        fill(v, x0, h + 1, -4, x1, h + 2, 3, concrete(0xbab6ae, s + 5));
        tint(v, x0, 1, -4, x1, h + 2, 3, (x, y, z, c) => { const n = vnoise(x, 0, z, 2.5, s + 9); return n > 0.62 && y > h + 2 - (n - 0.62) * 80 ? shade(c, 0.84) : undefined; });
        blotch(v, x0, 1, -4, x1, 8, 3, 0x6a7a3a, 0.66, 3, s + 10);
      };
      blockWall(-60, -39, 40, 1);
      blockWall(38, 59, 40, 2);
      // stone-clad gate pillars with granite caps
      const pillar = (x0, s) => {
        fill(v, x0, 1, -8, x0 + 19, 60, 7, (x, y, z) => {
          const row = Math.floor((y - 1) / 4), off = (row % 2) * 3;
          const u = (z === 7 || z === -8) ? x : z;
          const tx = Math.floor((u + 60 + off) / 6);
          if ((y - 1) % 4 === 3 || (u + 60 + off) % 6 === 5) return shade(0xa89a84, 0.96);
          return shade(mix(0xd8c8a8, 0xc0a888, R(hash(tx, row, s, 5) * 3) / 3), 1);
        });
        fill(v, x0 - 1, 61, -9, x0 + 20, 63, 8, (x, y, z) => gloss(shade(0x4a4a4e, y === 63 ? 1.1 : 0.97)));
        grime(v, 0, 0, 1);
      };
      pillar(-38, 1); pillar(18, 2);
      // double swing gate (bronze aluminium)
      const bronze = gloss(0x4a3a2e), bronzeL = gloss(0x6a5444);
      for (const [a, b] of [[-18, -1], [0, 17]]) {
        fill(v, a, 3, -1, b, 4, 0, () => bronze);
        fill(v, a, 41, -1, b, 42, 0, () => bronze);
        fill(v, a, 3, -1, a + 1, 42, 0, () => bronze);
        fill(v, b - 1, 3, -1, b, 42, 0, () => bronze);
        for (let x = a + 3; x <= b - 3; x += 3) v.box(x, 5, 0, x, 40, 0, bronzeL);
        fill(v, a, 33, -1, b, 33, 0, () => bronze);
        for (let x = a + 2; x <= b - 2; x += 5) v.torus(x + 2, 37, 0, 2, 0.4, bronze, 'z');
      }
      fill(v, -2, 20, 1, 1, 22, 1, () => metal(0xd8dce0)); v.box(-3, 21, 2, 2, 21, 2, metal(0xeef0f2));
      for (const [x, y] of [[-19, 8], [-19, 36], [18, 8], [18, 36]]) v.box(x, y, -1, x, y + 2, 0, metal(0x8a8a8a));
      // cute "beware of dog" sticker on the right leaf
      v.layer(['.YYYYY.', 'YKYYYKY', 'YYKYKYY', 'YYYKYYY', 'YYRRRYY', '.YYYYY.'], { Y: gloss(0xffd23f), K: 0x2a2a2a, R: gloss(0xe5383b) }, { x: 6, y: 30, z: 1 });
      // nameplate (black granite, white 田中), intercom on the right pillar
      fill(v, 20, 46, 8, 36, 54, 8, () => gloss(0x26262a));
      stamp(v, glyphRows('田中'), { '#': gloss(0xf4f2ea) }, 21, 53, 9);
      fill(v, 25, 31, 8, 31, 41, 8, () => gloss(0xd8dad6));
      v.box(25, 31, 9, 31, 41, 9, null);
      v.set(28, 39, 9, gloss(0x1a1a1e)); v.set(28, 40, 9, gloss(0x3a3a3e));
      for (let x = 26; x <= 30; x += 2) v.set(x, 37, 9, 0x5a5a5a);
      v.box(27, 33, 9, 29, 34, 9, metal(0xe8eaec)); v.box(27, 32, 9, 29, 32, 9, glow(0x6ab8ff));
      // mailbox in the left pillar
      fill(v, -37, 34, 8, -21, 45, 8, () => metal(0xc8ccd0));
      v.box(-34, 41, 8, -24, 42, 8, 0x1a1a1a); v.box(-34, 43, 9, -24, 43, 9, metal(0xe0e4e8));
      stamp(v, glyphRows('POST'), { '#': gloss(0x4a4a4e) }, -36, 39, 9);
      // gate lamp on the left pillar (lit at dusk)
      fill(v, -32, 64, -3, -25, 65, 3, () => gloss(0x2a2a2c));
      fill(v, -31, 66, -2, -26, 72, 2, (x, y, z) => (x === -31 || x === -26) && (z === -2 || z === 2) ? gloss(0x2a2a2c) : glow(y > 70 ? 0xffe2a0 : 0xffd27a));
      fill(v, -32, 73, -3, -25, 74, 3, () => gloss(0x2a2a2c)); v.set(-29, 75, 0, gloss(0x2a2a2c));
      // house number on the left wall
      fill(v, -58, 29, 3, -42, 35, 3, () => gloss(0x2f5aa8));
      stamp(v, glyphRows('3-12'), { '#': gloss(0xf4f2ea) }, -57, 33, 3);
      // potted niwaki pine behind the left wall
      for (let i = 0; i < 13; i++) v.cylinder(-48, 1 + i, -18, 6 + i * 0.25, 1, (x, y, z) => gloss(shade(y >= 12 ? 0x3a5a9a : 0x2a4a8a, 0.92 + hash(x, y, z, 8) * 0.12)));
      v.cylinder(-48, 13, -18, 8, 1, (x, y, z) => shade(0x4a3424, 0.9 + hash(x, y, z, 9) * 0.2));
      path(v, [[-48, 13, -18], [-46, 30, -18], [-50, 46, -17], [-47, 60, -18], [-49, 72, -18]], wood(0x5a4030, 'y', 4), 1.2);
      for (const [px, py, pz, r] of [[-56, 54, -16, 8], [-40, 62, -19, 7], [-50, 72, -17, 8], [-47, 80, -18, 5]]) {
        v.ellipsoid(px, py, pz, r, 3, r * 0.85, (x, y, z) => gloss(shade(vnoise(x, y, z, 2, 12) > 0.5 ? 0x2f5a32 : 0x3f6a3a, y > py + 1 ? 1.15 : 0.95)));
        v.line(px, py - 1, pz, -48 + (px + 48) * 0.3, py - 4, -18, wood(0x5a4030, 'y', 4), 0.6);
      }
      // azalea shrub peeking over the right wall
      v.shape(32, 30, -24, 60, 56, -5, (x, y, z) => ((x - 47) / 12) ** 2 + ((y - 42) / 12) ** 2 + ((z + 14) / 9) ** 2 <= 1 + (vnoise(x, y, z, 2.5, 13) - 0.5) * 0.4,
        (x, y, z) => (hash(x, y, z, 14) < 0.12 && y > 43 ? gloss(hash(x, y, z, 15) < 0.5 ? 0xff6fae : 0xfbe0ec) : gloss(shade(vnoise(x, y, z, 2, 16) > 0.5 ? 0x3f7a32 : 0x2f5a2a, 0.9 + (y - 30) * 0.008))));
      grime(v, 0, 8, 0.82);
    },
  },

  // ------------------------------------------------------------- laundry pole
  laundry_pole: {
    name: 'Laundry Poles', jp: '物干し竿', voxel: 0.02,
    build(v) {
      const steel = metal(0xc8ccd0);
      // stands: weighted plastic base + post + two hooked arms
      for (const sx of [-57, 57]) {
        v.cylinder(sx, 0, 0, 8, 3, (x, y, z) => gloss(shade(0x6a7a8a, y === 2 ? 1.08 : 0.95)));
        v.cylinder(sx, 3, 0, 5, 3, gloss(0x7a8a9a));
        v.cylinder(sx, 6, 0, 1.2, 82, steel);
        v.cylinder(sx, 88, 0, 1.6, 1, gloss(0x3a6ab0));
        for (const [y, L] of [[85, 13], [72, 10]]) {
          rod(v, sx, y, -L, sx, y, L, steel, 2);
          for (const s of [-1, 1]) { v.box(sx, y + 1, s * L, sx, y + 3, s * L, gloss(0x3a6ab0)); v.box(sx, y + 1, s * (L - 3), sx, y + 2, s * (L - 3), gloss(0x3a6ab0)); }
        }
      }
      // two blue-coated poles resting in the top hooks
      for (const z of [-11, 11]) {
        v.cylinder(-62, 87, z, 1.1, 125, (x) => (Math.abs(x) > 58 ? steel : gloss(0x3a7ac8)), 'x');
        v.cylinder(-63, 87, z, 1.4, 1, gloss(0x2a5a9a), 'x'); v.cylinder(63, 87, z, 1.4, 1, gloss(0x2a5a9a), 'x');
      }
      // T-shirt / shirt on a hanger
      const shirt = (cx, z, col, fn = null) => {
        v.set(cx, 89, z, steel); v.set(cx, 88, z - 1, steel); v.set(cx, 88, z + 1, steel); v.set(cx, 86, z, steel); v.set(cx, 85, z, steel);
        v.line(cx, 84, z, cx - 9, 80, z, steel); v.line(cx, 84, z, cx + 9, 80, z, steel);
        for (let r = 0; r < 30; r++) for (let dx = -11; dx <= 11; dx++) {
          const y = 81 - r, ax = Math.abs(dx);
          let on = false;
          if (r < 9) on = ax <= 11 - (r < 1 ? 2 : 0) && !(r < 3 && ax <= 2 - r * 0.5) && !(r >= 6 && ax > 8 && ax <= 11 - (r - 6) * 0 && r >= 9);
          else on = ax <= 8;
          if (r >= 8 && ax > 8) on = false;
          if (!on) continue;
          const c = fn ? fn(dx, r) : col;
          v.set(cx + dx, y, z, c); v.set(cx + dx, y, z + (r % 7 < 3 ? 1 : 0), c);
        }
      };
      shirt(-40, 11, 0xfbf8f0, (dx, r) => (r > 10 && r < 17 && Math.abs(dx) < 4 ? (Math.abs(dx) + r) % 3 === 0 ? 0xff8fb2 : 0x5cc4ff : 0xfbf8f0));
      shirt(-16, 11, 0, (dx, r) => (r % 4 < 2 ? 0x2f4a8a : 0xf4f0e6));
      shirt(36, 11, 0, (dx, r) => (r < 3 && Math.abs(dx) < 4 ? 0xe8e8f0 : Math.abs(dx) === 0 && r > 3 && r % 4 === 0 ? 0xf4f4f0 : 0x8ab4e0));
      // kids' gym shorts on a clip
      v.box(52, 86, 11, 52, 88, 11, gloss(0xff6f9a));
      fill(v, 46, 72, 11, 57, 85, 11, (x, y) => (y >= 84 ? 0xf4f0e6 : (x === 51 || x === 52) && y < 78 ? null : 0x23336a));
      // pinch hanger with socks, hand towels and undies
      const PX = 10, PY = 76, PZ = 11;
      v.box(PX, PY + 1, PZ, PX, 89, PZ, gloss(0x8ac4e0)); v.set(PX, 89, PZ - 1, gloss(0x8ac4e0)); v.set(PX, 88, PZ - 2, gloss(0x8ac4e0));
      v.shape(PX - 13, PY, PZ - 6, PX + 13, PY, PZ + 6, (x, y, z) => Math.abs(x - PX) === 13 || Math.abs(z - PZ) === 6 || x === PX, gloss(0x8ac4e0));
      for (const sx of [-13, 13]) for (const sz of [-6, 6]) v.line(PX, 86, PZ, PX + sx, PY + 1, PZ + sz, gloss(0xb8dcf0));
      const PEG = [0xff8fb2, 0xffd23f, 0x7ad87a, 0x5cc4ff];
      const hang = (x, z, rows, legend, i) => {
        v.set(x, PY - 1, z, gloss(PEG[i % 4])); v.set(x, PY - 2, z, gloss(PEG[i % 4]));
        v.layer(rows, legend, { x: x - 1, y: PY - 3, z });
      };
      hang(PX - 10, PZ + 6, ['WW', 'WW', 'WW', 'WW', 'WW', 'WWW', 'WWW'], { W: 0xfbf8f0 }, 0);
      hang(PX - 6, PZ + 6, ['SS', 'SS', 'RR', 'SS', 'SS', 'SSS', 'SSS'], { S: 0x6a6a72, R: 0xe5383b }, 1);
      hang(PX - 2, PZ + 6, ['PPPPP', 'PDPDP', 'PPPPP', 'PDPDP', 'PPPPP', 'PDPDP', 'PPPPP', 'PDPDP'], { P: 0xffc2d4, D: 0xff6f9a }, 2);
      hang(PX + 5, PZ + 6, ['YYYYY', 'YYYYY', '.YYY.', '..Y..'], { Y: 0xfff2b3 }, 3);
      hang(PX + 10, PZ + 6, ['WW', 'WW', 'WW', 'WW', 'WW', 'WWW', 'WWW'], { W: 0xfbf8f0 }, 0);
      hang(PX - 8, PZ - 6, ['GGGGG', 'GWGWG', 'GGGGG', 'GWGWG', 'GGGGG', 'GWGWG', 'GGGGG'], { G: 0xa8e0c0, W: 0xffffff }, 1);
      hang(PX + 6, PZ - 6, ['BB', 'BB', 'BB', 'BB', 'BB', 'BBB', 'BBB'], { B: 0x3a4a7a }, 2);
      // striped bath towel folded over the back pole, with clothes pegs
      v.shape(-46, 60, -13, -18, 88, -9, (x, y, z) => (y === 88 && z >= -12 && z <= -10) || (z === -13 && y >= 60 && y <= 87) || (z === -9 && y >= 68 && y <= 87),
        (x, y) => ((y + 100) % 8 < 2 ? 0xfbf8f0 : (y + 100) % 8 < 3 ? 0xffd23f : x < -32 ? 0xff9f8a : 0xff9f8a));
      v.paint(() => v.shape(-46, 60, -13, -18, 62, -9, () => true, 0xe88a74));
      for (const x of [-42, -22]) { v.box(x, 87, -14, x, 90, -14, gloss(0x5cc4ff)); v.box(x, 87, -8, x, 90, -8, gloss(0x5cc4ff)); }
      // bath mat + small hand towel on the back pole right side
      v.shape(20, 66, -13, 44, 88, -9, (x, y, z) => (y === 88 && z >= -12 && z <= -10) || (z === -13 && y >= 66 && y <= 87) || (z === -9 && y >= 74 && y <= 87),
        (x, y) => ((x + y) % 6 === 0 ? 0x9ac8a0 : 0xc8e8c8));
      v.box(32, 87, -14, 32, 90, -14, gloss(0xff8fb2));
    },
  },

  // ============================================================ SHRINE & GARDEN
  // ------------------------------------------------------------- roadside Jizo shrine
  jizo_shrine: {
    name: 'Roadside Jizō Shrine', jp: 'お地蔵さんの祠', voxel: 0.015,
    build(v) {
      v.jitter = 0.012;
      const stone = (s) => (x, y, z) => { const n = vnoise(x, y, z, 7, s); return shade(n > 0.7 ? 0x86827a : n < 0.3 ? 0xa6a298 : 0x9a968c, 1); };
      const wd = (x, y, z) => shade(0x6a4a30, vnoise(x * 0.6, y * 0.08, z * 0.6, 2, 2) > 0.6 ? 0.9 : 1);
      const wdx = (x, y, z) => shade(0x6a4a30, vnoise(x * 0.08, y * 0.6, z * 0.6, 2, 3) > 0.6 ? 0.9 : 1);
      // two-step stone plinth
      fill(v, -31, 0, -24, 31, 5, 26, stone(1));
      fill(v, -28, 6, -22, 28, 10, 18, stone(2));
      // shrine house: posts, plank back wall, half side walls with lattice, beams
      for (const x of [-26, 24]) for (const z of [-20, 14]) fill(v, x, 11, z, x + 2, 62, z + 2, wd);
      fill(v, -24, 11, -20, 24, 60, -19, (x, y, z) => shade(wd(x, y, z), x % 5 === 0 ? 0.82 : 1));
      for (const sx of [-26, 26]) {
        fill(v, sx, 11, -17, sx, 32, 13, (x, y, z) => shade(wdx(x, y, z), y % 5 === 0 ? 0.82 : 1));
        for (let z = -16; z <= 12; z += 4) v.box(sx, 33, z, sx, 58, z, wd);
        v.box(sx, 45, -17, sx, 46, 13, wdx);
      }
      fill(v, -27, 11, 14, 27, 12, 17, wdx);
      fill(v, -28, 59, -21, 28, 62, 17, wdx);
      fill(v, -24, 11, -18, 24, 11, 13, () => shade(0x8a7a5a, 1));
      // roof: kawara tiles, ridge along x with onigawara ends
      const ridgeZ = -2, eaveY = 62;
      const tile = (x, y, z) => gloss(shade(0x4e5864, (x + 64) % 4 === 0 ? 0.8 : 1));
      for (let z = -30; z <= 27; z++) {
        const d = Math.abs(z - ridgeZ);
        const yt = eaveY + 18 - Math.round(d * 0.62 + (d > 22 ? (d - 22) * -0.3 : 0));
        fill(v, -35, yt - 1, z, 35, yt, z, (x, y, zz) => (y === yt ? tile(x, y, zz) : gloss(0x3e4650)));
      }
      fill(v, -36, 80, ridgeZ - 2, 36, 82, ridgeZ + 2, (x, y, z) => gloss(shade(0x3a424c, y === 82 ? 1.1 : 1)));
      for (const sx of [-1, 1]) {
        fill(v, sx * 36, 79, ridgeZ - 3, sx * 37, 85, ridgeZ + 3, () => gloss(0x3a424c));
        v.set(sx * 37, 86, ridgeZ - 3, gloss(0x3a424c)); v.set(sx * 37, 86, ridgeZ + 3, gloss(0x3a424c));
      }
      blotch(v, -35, 62, -30, 35, 82, 27, gloss(0x5a7a42), 0.86, 4, 6);
      // two Jizo statues with red bibs and a knitted cap
      const jizo = (cx, cz, h, s, cap) => {
        const st = stone(s);
        fill(v, cx - 7, 12, cz - 6, cx + 7, 14, cz + 6, st);
        v.cylinder(cx, 15, cz, 6.5, 1, st);
        const top = 15 + h;
        // chubby robed body
        v.shape(cx - 8, 16, cz - 6, cx + 8, top, cz + 6, (x, y, z) => {
          const t = (y - 16) / (top - 16);
          const rx = 6.4 - t * 1.4 + Math.sin(t * Math.PI) * 0.8, rz = 4.8 - t * 0.8 + Math.sin(t * Math.PI) * 0.5;
          return ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1;
        }, st);
        v.paint(() => v.shape(cx - 8, 16, cz - 6, cx + 8, 17, cz + 6, () => true, shade(0x8a867c, 1)));
        // big round head with long earlobes
        const hy = top + 5;
        v.sphere(cx, hy, cz, 5.6, 0xaaa69c);
        for (const sx of [-1, 1]) v.box(cx + sx * 6, hy - 3, cz, cx + sx * 6, hy + 1, cz, 0xa09c92);
        // serene closed eyes, smile, pink cheeks
        v.project(['K..K.K..K', '.KK...KK.', '.........', 'P..KKK..P'], { K: 0x4a4640, P: gloss(0xf2a8a8) }, cx - 4, hy, '+z');
        // hands together in prayer
        v.box(cx, top - 7, cz + 5, cx, top - 3, cz + 6, st); v.set(cx, top - 2, cz + 5, st);
        // red bib (yodarekake): a triangle hanging from the neck
        v.shape(cx - 6, top - 7, cz + 2, cx + 6, top + 1, cz + 7, (x, y, z) => {
          if (Math.abs(x - cx) > (y - (top - 8)) * 0.75 + 0.5) return false;
          const t = (y - 16) / (top - 16);
          const rz = 4.8 - Math.min(1, t) * 0.8 + Math.sin(Math.min(1, t) * Math.PI) * 0.5;
          return z === cz + Math.round(rz) + 1 || (y >= top && Math.abs(z - cz) <= 5 && z > cz);
        }, (x, y) => gloss(y >= top ? 0xb81e1e : 0xe02e2a));
        v.set(cx, top - 4, cz + 7, gloss(0xf2c14e));
        if (cap) {
          v.shape(cx - 6, hy + 2, cz - 6, cx + 6, hy + 7, cz + 6, (x, y, z) => (x - cx) ** 2 + (y - hy) ** 2 + (z - cz) ** 2 <= 37, (x, y) => gloss(y === hy + 2 ? 0xb81e1e : y % 2 ? 0xd82a26 : 0xe8443a));
          v.shape(cx - 6, hy + 2, cz - 6, cx + 6, hy + 2, cz + 6, (x, y, z) => (x - cx) ** 2 + (z - cz) ** 2 <= 40 && (x - cx) ** 2 + (z - cz) ** 2 > 28 && z > cz - 2 ? true : false, gloss(0xb81e1e));
          v.sphere(cx, hy + 8, cz, 1.4, gloss(0xfbf8f0));
        }
      };
      jizo(-10, -5, 15, 5, true);
      jizo(10, -5, 12, 9, false);
      // offerings: flower vases, cups, mikan, candy, incense
      for (const sx of [-21, 21]) {
        v.cylinder(sx, 12, 6, 1.8, 9, gloss(0x4a8a3a));
        v.cylinder(sx, 20, 6, 1.4, 1, 0x2a3a2a);
        for (const [dx, dz, h, c] of [[-1, 0, 8, 0xffd23f], [1, 1, 10, 0xfbf8f0], [0, -1, 9, 0xb06ad8], [1, -1, 7, 0xff8c2e]]) {
          v.line(sx + dx, 21, 6 + dz, sx + dx * 2, 20 + h, 6 + dz * 2, gloss(0x3f7a32));
          v.sphere(sx + dx * 2, 21 + h, 6 + dz * 2, 1.1, gloss(c));
        }
        v.ellipsoid(sx, 24, 6, 3, 1.4, 2.4, gloss(0x2f5a32));
      }
      v.cylinder(-4, 12, 9, 1.6, 4, glass(0xdfeef4)); v.cylinder(-4, 12, 9, 1.4, 3, glass(0xe8dca0)); v.box(-5, 13, 11, -3, 14, 11, gloss(0x2f6fd6));
      v.cylinder(4, 12, 9, 1.6, 3, gloss(0xfbf8f0)); v.cylinder(4, 14, 9, 1, 1, glass(0xbfe0f0));
      v.cylinder(0, 12, 12, 3.4, 1, gloss(0xf4f0e6));
      v.sphere(-1, 14, 12, 1.5, gloss(0xff8c1a)); v.sphere(1.5, 14, 12, 1.5, gloss(0xff9a2a)); v.set(-1, 16, 12, gloss(0x3f7a32));
      v.cylinder(0, 12, 4, 2, 2, gloss(0x3a3a3a));
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, 1]]) { v.box(dx, 14, 4 + dz, dx, 19, 4 + dz, 0x6a8a3a); v.set(dx, 20, 4 + dz, glow(0xff6a3a)); }
      // offering box on the lower step
      fill(v, -8, 6, 19, 8, 12, 25, wd);
      for (let x = -7; x <= 7; x += 2) v.box(x, 12, 20, x, 12, 24, shade(0x4a3424, 1));
      v.project(['.WWWW.'], { W: gloss(0xd8b84a) }, -3, 10, '+z');
      // red paper lanterns (lit) under the eave
      for (const sx of [-20, 20]) {
        v.box(sx, 56, 15, sx, 58, 15, 0x2a2a2a);
        v.ellipsoid(sx, 52, 15, 3, 3.6, 3, (x, y) => (y === 49 || y === 55 ? gloss(0x2a2a2a) : glow(y % 2 ? 0xff5a3a : 0xff6a48)));
        v.box(sx, 48, 15, sx, 48, 15, gloss(0x2a2a2a));
      }
      // pinwheel (kazaguruma) beside the shrine
      v.box(29, 6, 21, 29, 46, 21, wood(0xd8c088, 'y', 5));
      const PW = [0xe5383b, 0xffd23f, 0x3f86e8, 0x58c06c];
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        for (let r = 1; r <= 5; r++) for (let w = 0; w <= Math.min(r, 3); w++) {
          const x = 29 + R(Math.cos(a) * r - Math.sin(a) * w * 0.8), y = 48 + R(Math.sin(a) * r + Math.cos(a) * w * 0.8);
          v.set(x, y, 22, gloss(PW[k]));
        }
      }
      v.set(29, 48, 23, gloss(0xfbf8f0));
      grime(v, 0, 12, 0.82);
    },
  },

  // ------------------------------------------------------------- potted plants row
  plant_pots: {
    name: 'Row of Potted Plants', jp: '軒先の鉢植え', voxel: 0.012,
    build(v) {
      const pot = (cx, cz, r0, r1, h, col, saucer = true) => {
        if (saucer) v.cylinder(cx, 0, cz, r1 + 0.6, 1, typeof col === 'function' ? col : gloss(shade(col, 0.85)));
        for (let i = 0; i < h; i++) v.cylinder(cx, 1 + i, cz, r0 + (r1 - r0) * i / (h - 1) + (i >= h - 2 ? 0.6 : 0), 1, typeof col === 'function' ? col : (x, y, z) => gloss(shade(col, (y >= h - 1 ? 1.08 : 0.96) + hash(x, y, z, 7) * 0.05)));
        v.cylinder(cx, h, cz, r1 - 0.8, 1, (x, y, z) => shade(0x4a3020, 0.9 + hash(x, y, z, 8) * 0.2));
        return h + 1;
      };
      const leaf = (c) => (x, y, z) => gloss(shade(c, 0.92 + hash(x, y, z, 9) * 0.14));
      // 1) school morning glory: white pot with green band, ring trellis, name tag
      {
        const cx = -52, cz = 0;
        const t = pot(cx, cz, 7.5, 10, 16, (x, y, z) => gloss(y >= 11 && y <= 13 ? 0x3aa05a : shade(0xf6f4ee, 0.97 + hash(x, y, z, 5) * 0.03)));
        for (const [sx, sz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) v.line(cx + sx, t, cz + sz, cx + R(sx * 0.85), 88, cz + R(sz * 0.85), gloss(0x4a9a5a));
        for (const y of [44, 64, 86]) v.torus(cx, y, cz, 7.2, 0.5, gloss(0x4a9a5a), 'y');
        for (let i = 0; i < 150; i++) {
          const y = t + i * 0.5, a = i * 0.21;
          const x = cx + Math.cos(a) * 7.6, z = cz + Math.sin(a) * 7.6;
          v.set(R(x), R(y), R(z), 0x5a8a3a);
          if (i % 7 === 0) {
            const lx = R(cx + Math.cos(a) * 9.4), lz = R(cz + Math.sin(a) * 9.4), ly = R(y);
            v.layer(['GG.GG', 'GGGGG', '.GGG.', '..G..'], { G: gloss(hash(lx, ly, lz, 6) < 0.5 ? 0x3f8a3a : 0x5aa84a) }, { x: lx - 2, y: ly + 2, z: lz, plane: Math.abs(Math.cos(a)) > 0.7 ? 'zy' : 'xy' });
          }
        }
        for (const [fy, a, col] of [[50, 0.9, 0x4a5ae0], [70, 1.6, 0x8a4ad8], [80, 1.1, 0x3a4ab8], [58, 2.2, 0xe868a8], [38, 1.3, 0x6a6af0]]) {
          const fx = R(cx + Math.cos(a) * 9.5), fz = R(cz + Math.sin(a) * 9.5) + 1;
          v.layer(['.CCC.', 'CCWCC', 'CWWWC', 'CCWCC', '.CCC.'], { C: gloss(col), W: gloss(0xfbf8f0) }, { x: fx - 2, y: fy + 2, z: fz + 1 });
          v.set(fx, fy, fz, gloss(shade(col, 0.7)));
        }
        fill(v, cx - 3, 16, cz + 10, cx + 3, 21, cz + 10, () => gloss(0xfbf8f0)); v.box(cx, 9, cz + 10, cx, 15, cz + 10, gloss(0xfbf8f0));
        v.box(cx - 2, 19, cz + 11, cx + 2, 19, cz + 11, 0x3a3a3a); v.box(cx - 1, 17, cz + 11, cx + 1, 17, cz + 11, 0x3a3a3a);
      }
      // 2) styrofoam box of green onions
      fill(v, -38, 0, -8, -20, 14, 7, (x, y, z) => shade(0xf4f2ea, 0.95 + hash(x >> 1, y >> 1, z >> 1, 3) * 0.06));
      fill(v, -37, 14, -7, -21, 14, 6, (x, y, z) => shade(0x4a3020, 0.9 + hash(x, y, z, 4) * 0.2));
      for (let x = -35; x <= -23; x += 3) for (const z of [-4, 0, 4]) {
        const h = 18 + R(hash(x, 0, z, 5) * 12);
        for (let y = 15; y < 15 + h; y++) v.set(x + (y > 15 + h - 5 && hash(x, z, 0, 6) < 0.4 ? 1 : 0), y, z, y < 19 ? gloss(0xf2f2e6) : leaf(y > 15 + h - 6 ? 0x5aaa42 : 0x4a9a3a)(x, y, z));
      }
      // 3) blue glazed pot with a round flowering cactus
      {
        const t = pot(-10, 0, 5, 6.5, 10, 0x2f5a9a);
        v.sphere(-10, t + 5, 0, 5.5, (x, y, z) => { const a = Math.atan2(z, x + 10); return gloss(Math.cos(a * 8) > 0.6 ? 0x5a9a4a : 0x3f7a3a); });
        speckle(v, -16, t, -6, -4, t + 11, 6, 0xfbf8e8, 0.08, 10);
        v.layer(['.P.', 'PYP', '.P.'], { P: gloss(0xff6fae), Y: gloss(0xffd23f) }, { x: -11, y: t + 11, z: -1, plane: 'xz' });
      }
      // 4) long green planter of petunias and marigolds
      fill(v, 2, 0, -6, 32, 10, 5, (x, y, z) => gloss(shade(0x3a8a4a, y === 10 ? 1.08 : 0.96)));
      fill(v, 3, 10, -5, 31, 10, 4, (x, y, z) => shade(0x4a3020, 0.9 + hash(x, y, z, 11) * 0.2));
      for (let x = 5; x <= 29; x += 6) {
        const c = [0xd94fb0, 0xff8c1a, 0xfbf8f0, 0x8a5bd6, 0xffc21a][(x / 6 | 0) % 5];
        v.ellipsoid(x, 13, 0, 3.4, 2.6, 4, leaf(0x3f7a32));
        for (const [dx, dy, dz] of [[-2, 2, 2], [1, 3, 1], [2, 1, 3], [-1, 3, -2], [0, 1, 4]]) v.layer(['.C.', 'CYC', '.C.'], { C: gloss(c), Y: gloss(0xffe8a0) }, { x: x + dx - 1, y: 12 + dy + 1, z: dz });
      }
      // 5) cracked old terracotta pot with succulents
      {
        const t = pot(42, 0, 5, 7, 9, 0xc8683a);
        for (let y = 2; y <= 8; y++) v.set(42 + (y % 2), y, 7, 0x6a3a20);
        v.box(47, 7, 3, 48, 8, 5, null);
        for (const [dx, dz, r] of [[-2, -1, 2.5], [2, 1, 2], [0, 3, 1.6]]) for (let k = 0; k < 8; k++) { const a = k * TAU / 8; v.set(42 + dx + R(Math.cos(a) * r), t + (k % 2), dz + R(Math.sin(a) * r), gloss(k % 2 ? 0x9ac8b0 : 0x7ab09a)); }
      }
      // 6) white pot of red geraniums
      {
        const t = pot(57, 0, 5.5, 7, 10, 0xf2f0ea);
        v.ellipsoid(57, t + 3, 0, 6, 3.5, 5.5, leaf(0x4a8a3a));
        for (const [dx, dy, dz] of [[-2, 6, 1], [3, 7, -1], [0, 8, 3], [-3, 5, -3]]) { v.line(57 + dx, t + 3, dz, 57 + dx, t + dy, dz, 0x5a8a3a); v.sphere(57 + dx, t + dy + 1, dz, 1.6, gloss(hash(dx, dy, dz, 1) < 0.5 ? 0xe5383b : 0xff4a4a)); }
      }
      // cat-deterrent water bottles + a green watering can
      for (const x of [-42, -4, 36]) {
        v.cylinder(x, 0, 12, 3.2, 18, glass(0xcfe8f2));
        v.cylinder(x, 18, 12, 2, 2, glass(0xdfeef4)); v.cylinder(x, 20, 12, 1.6, 2, gloss(0xf4f4f0));
        v.box(x - 3, 7, 15, x + 3, 10, 15, gloss(0x5fc0e8));
      }
      fill(v, 64, 0, -4, 74, 9, 4, (x, y, z) => gloss(shade(0x4aa85a, y === 9 ? 1.08 : 0.96)));
      v.line(74, 3, 0, 82, 13, 0, gloss(0x4aa85a), 0.8);
      v.cylinder(82, 13, 0, 1.8, 2, gloss(0x3a8a4a), 'x');
      v.box(66, 10, 0, 66, 13, 0, gloss(0x4aa85a)); v.box(66, 14, 0, 72, 14, 0, gloss(0x4aa85a)); v.box(72, 10, 0, 72, 13, 0, gloss(0x4aa85a));
      dust(v, 0x9a8a70, 0.12);
    },
  },

  // ============================================================ ANIMALS (for animation; no footprint)
  // ------------------------------------------------------------- pigeon
  pigeon: {
    name: 'Pigeon', jp: 'ハト', voxel: 0.012,
    build(v) { buildPigeon(v, false); },
  },
  pigeon_fly: {
    name: 'Pigeon (flying)', jp: 'ハト（飛翔）', voxel: 0.012,
    build(v) { buildPigeon(v, true); },
  },

  // ------------------------------------------------------------- stray cat
  stray_cat: {
    name: 'Stray Cat', jp: '野良猫', voxel: 0.01,
    build(v) { buildCat(v, 'stand'); },
  },
  stray_cat_sit: {
    name: 'Stray Cat (sitting)', jp: '野良猫（おすわり）', voxel: 0.01,
    build(v) { buildCat(v, 'sit'); },
  },
  stray_cat_held: {
    name: 'Stray Cat (held)', jp: '野良猫（だっこ）', voxel: 0.01,
    build(v) { buildCat(v, 'held'); },
  },

};

// ------------------------------------------------------------------ animal builders
/** Rock pigeon: blue-grey, iridescent neck, two black wing bars, orange eyes, pink feet. */
function buildPigeon(v, fly) {
  v.jitter = 0.02;
  const BODY = 0x7a8498, BELLY = 0x8c94a6, HEAD = 0x626c84, WING = 0x9ea6b6, BAR = 0x24262e, DARK = 0x464c5a;
  const neck = (x, y, z) => gloss((x + y * 2 + z) % 4 < 2 ? 0x4a9a7a : 0x8a5aa8);
  const by = fly ? 10 : 7, tilt = fly ? 0 : 0.3;
  const c = Math.cos(tilt), s = Math.sin(tilt);
  // body (tilted head-up when standing)
  v.shape(-6, by - 7, -14, 6, by + 7, 10, (x, y, z) => {
    const ly = (y - by) * c - z * s, lz = (y - by) * s + z * c;
    return (x / 4.6) ** 2 + (ly / 4.8) ** 2 + ((lz + 1) / 8.2) ** 2 <= 1;
  }, (x, y, z) => {
    const ly = (y - by) * c - z * s;
    return ly < -1.5 ? BELLY : BODY;
  });
  // puffed chest + iridescent neck + head
  const hz = fly ? 8 : 6, hy = fly ? by + 3 : by + 8;
  v.ellipsoid(0, by + (fly ? 0 : 2), fly ? 4 : 3, 4, 4.4, 4, (x, y, z) => (y > by + (fly ? 1 : 3) ? neck(x, y, z) : BELLY));
  v.line(0, by + 2, hz - 3, 0, hy - 1, hz - 1, neck, 2.6);
  v.sphere(0, hy, hz, 2.7, HEAD);
  v.paint(() => v.shape(-4, hy - 4, hz - 4, 4, hy - 2, hz + 1, (x, y, z) => z < hz + 1, neck));
  // beak with white cere, orange eyes
  v.box(0, hy - 1, hz + 3, 0, hy - 1, hz + 4, gloss(0x3a3a3e)); v.set(0, hy, hz + 3, 0xece8dc);
  for (const sx of [-1, 1]) { v.set(sx * 2, hy + 1, hz + 1, gloss(0x1a1a1a)); v.set(sx * 2, hy + 1, hz, gloss(0xff8a2a)); v.set(sx * 2, hy, hz + 1, gloss(0xff8a2a)); }
  if (!fly) {
    // folded wings with black bars, dark primaries over the tail
    v.shape(-6, by - 3, -15, 6, by + 6, 4, (x, y, z) => Math.abs(x) >= 4 && Math.abs(x) <= 5 && (x / 5.2) ** 2 + ((y - by - 1) / 4.6) ** 2 + ((z + 4) / 8.6) ** 2 <= 1, (x, y, z) => (z === -3 || z === -6 ? BAR : z < -9 ? DARK : WING));
    for (const sx of [-1, 1]) for (let z = -15; z <= -9; z++) v.set(sx * 3, by - 2 + R((z + 9) * 0.35), z, DARK);
    // tail with a dark terminal band
    v.shape(-3, by - 6, -15, 3, by, -10, (x, y, z) => Math.abs(x) <= 1 + (z < -12 ? 1 : 0) && (y === R(by - 2 + (z + 10) * 0.2) || (y === R(by - 3 + (z + 10) * 0.2) && Math.abs(x) <= 1 && z > -13)), (x, y, z) => (z <= -14 ? BAR : DARK));
    // pink legs + toes
    for (const sx of [-1, 1]) {
      v.box(sx * 2, 1, 0, sx * 2, 2, 0, gloss(0xd86a72));
      v.box(sx * 2, 0, -1, sx * 2, 0, 3, gloss(0xd86a72)); v.set(sx * 3, 0, 2, gloss(0xd86a72));
    }
  } else {
    // spread wings raised in a V (upstroke): broad arm, swept hand, separated primaries
    for (const sx of [-1, 1]) {
      for (let i = 3; i <= 28; i++) {
        const x = sx * i, t = (i - 3) / 25;
        const lead = 3 + Math.sin(t * Math.PI) * 2.2 - t * 4.5;
        const chord = 10.5 * (1 - t * t * 0.55) - (t > 0.9 ? (t - 0.9) * 30 : 0);
        const y = by + 1 + R(t * 8);
        const z0 = R(lead - chord), z1 = R(lead);
        for (let z = z0; z <= z1; z++) {
          const u = (z - z0) / Math.max(1, z1 - z0);
          if (t > 0.6 && u < 0.55 && (i + (z - z0)) % 2 === 1) continue; // fingered primaries
          const col = t > 0.58 ? DARK : (u > 0.3 && u < 0.36) || (u > 0.5 && u < 0.56) ? BAR : u > 0.75 ? 0xb4bcca : WING;
          v.set(x, y, z, col);
          if (t < 0.45) v.set(x, y - 1, z, 0xd8dce4);
        }
      }
    }
    // fanned tail
    v.shape(-5, by - 2, -18, 5, by, -10, (x, y, z) => y === by - 1 && Math.abs(x) <= 1.5 + (-10 - z) * 0.4, (x, y, z) => (z <= -17 ? BAR : DARK));
    for (const sx of [-1, 1]) v.box(sx * 2, by - 5, -3, sx * 2, by - 4, -1, gloss(0xd86a72));
  }
}

/** Chibi calico stray cat. pose: 'stand' | 'sit' | 'held'. */
function buildCat(v, pose) {
  v.jitter = 0.02;
  const WH = 0xfbf6ee, OR = 0xe8944a, BK = 0x3e3430, PINK = 0xffa8b8;
  const bodyFur = (cx, cy, cz) => (x, y, z) => {
    const lx = x - cx, ly = y - cy, lz = z - cz;
    if (ly < -2.5 && pose !== 'held') return WH;
    if (pose === 'held' && lz > 2) return WH;
    const top = pose === 'held' ? lz < 1 : ly > -1;
    if (top && vnoise(lx, ly * 0.8, lz, 6, 3) > 0.47 && lx < 4) return OR;
    if (top && vnoise(lx + 20, ly, lz, 5, 5) > 0.52 && lx > -4) return BK;
    return WH;
  };
  const tailFur = (x, y, z) => ((y + z + 40) % 7 < 3 ? BK : OR);
  const head = (hx, hy, hz, mood) => {
    v.shape(hx - 11, hy - 9, hz - 8, hx + 11, hy + 9, hz + 8, (x, y, z) => {
      const lx = x - hx, ly = y - hy, lz = z - hz;
      const rx = 9 + (ly < -1 ? 1.2 : 0);
      return (Math.abs(lx) / rx) ** 2.3 + (Math.abs(ly) / 7.6) ** 2.3 + (Math.abs(lz) / 7) ** 2.3 <= 1;
    }, (x, y, z) => {
      const lx = x - hx, ly = y - hy;
      if (ly < -1 && Math.abs(lx) < 5.5) return WH; // muzzle + chin
      if (lx < -1 && ly > -2) return OR; // orange over the left eye
      if (lx > 3 && ly > 2) return BK; // black patch by the right ear
      if (Math.abs(lx) <= 1 && ly > 4) return OR;
      return WH;
    });
    // ears: orange (left) / black (right), pink inside
    for (const sx of [-1, 1]) for (let e = 0; e <= 6; e++) {
      const w = 3.2 - e * 0.5, ex = hx + sx * (5.4 + e * 0.2), ey = hy + 6 + e;
      for (let x = Math.floor(ex - w); x <= Math.ceil(ex + w); x++) for (let z = hz - 1; z <= hz + 1 - (e > 3 ? 1 : 0); z++) {
        if (Math.abs(x - ex) > w) continue;
        const inner = z === hz + 1 - (e > 3 ? 1 : 0) && Math.abs(x - ex) < w - 0.9 && e < 5;
        v.set(x, ey, z, inner ? PINK : sx < 0 ? OR : BK);
      }
    }
    const eyes = mood === 'held'
      ? ['...........', '.KKK...KKK.', '.GKG...GKG.', 'BB...P...BB', '...K.K.K...', '....K.K....']
      : ['.KKK...KKK.', '.WKK...WKK.', '.GKG...GKG.', 'B....P....B', '...K.K.K...', '....K.K....'];
    v.project(eyes, { K: gloss(0x1e1a1a), W: gloss(0xffffff), G: gloss(0x9ad04a), P: gloss(0xff8fa8), B: PINK }, hx - 5, hy + 1, '+z');
    for (const sx of [-1, 1]) for (const dy of [-2, -3]) { v.set(hx + sx * 10, hy + dy, hz + 3, 0xd8d0c8); v.set(hx + sx * 11, hy + dy + (dy === -2 ? 0 : -1), hz + 3, 0xd8d0c8); }
  };
  const paw = (x, y, z) => { v.ellipsoid(x, y, z, 2.6, 1.6, 3, WH); v.set(x - 1, y, z + 3, 0xc8b8b0); v.set(x + 1, y, z + 3, 0xc8b8b0); };
  if (pose === 'stand') {
    v.ellipsoid(0, 12, -5, 7, 6.6, 11.5, bodyFur(0, 12, -5));
    v.sphere(0, 13, 4, 5.6, WH);
    for (const sx of [-1, 1]) {
      v.cylinder(sx * 3.5, 1, 3, 2.4, 9, bodyFur(0, 12, -5)); paw(sx * 3.5, 1.5, 3.5);
      v.ellipsoid(sx * 4.5, 9, -12, 3.6, 4.5, 4.5, bodyFur(0, 12, -5));
      v.cylinder(sx * 4, 1, -13, 2.5, 7, bodyFur(0, 12, -5)); paw(sx * 4, 1.5, -12.5);
    }
    path(v, [[0, 15, -16], [0, 19, -21], [1, 26, -23], [2, 31, -21], [2, 33, -18]], tailFur, 1.7);
    head(0, 21, 9, 'stand');
  } else if (pose === 'sit') {
    v.shape(-10, 1, -13, 10, 22, 5, (x, y, z) => {
      const k = 1 + Math.max(0, (11 - y) / 10) * 0.28;
      return (x / (7.2 * k)) ** 2 + ((y - 11) / 10) ** 2 + ((z + 4) / (7.6 * k)) ** 2 <= 1;
    }, bodyFur(0, 11, -4));
    v.ellipsoid(0, 13, 1, 5.2, 6, 4.6, WH);
    for (const sx of [-1, 1]) {
      v.ellipsoid(sx * 5.5, 5, -5, 4, 5, 6, bodyFur(0, 11, -4));
      v.cylinder(sx * 3, 1, 3, 2.2, 14, WH); paw(sx * 3, 1.5, 3.5);
      paw(sx * 6, 1.5, 0);
    }
    path(v, [[3, 2, -11], [8, 2, -6], [10, 2, 1], [7, 2, 7], [2, 2, 9]], tailFur, 1.7);
    head(0, 28, 2, 'sit');
  } else {
    // dangling "liquid cat": long body, front legs up where the hands hold, hind legs + tail hanging
    v.ellipsoid(0, 22, -1, 6.6, 13, 5.6, bodyFur(0, 22, -1));
    v.ellipsoid(0, 26, 2, 4.6, 8, 3.6, WH);
    for (const sx of [-1, 1]) {
      v.line(sx * 5, 33, 1, sx * 10, 37, 5, bodyFur(0, 22, -1), 2.1);
      v.ellipsoid(sx * 10.5, 37.5, 5.5, 2.4, 2.2, 2.4, WH);
      v.line(sx * 3.5, 12, 0, sx * 3.5, 4, 1, bodyFur(0, 22, -1), 2.2);
      v.ellipsoid(sx * 3.5, 2.2, 1.5, 2.4, 2.2, 3, WH);
    }
    path(v, [[0, 11, -5], [1, 7, -7], [1, 4, -7], [3, 2, -5]], tailFur, 1.6);
    head(0, 42, 2, 'held');
  }
}

export default street2;
