// Old Japanese shop props — a Shōwa-era 駄菓子屋 / toy shop: wooden showcases, enamel lamps,
// candy jars, a mechanical till, and the knick-knacks that live outside the sliding doors.
// Each entry: { name, jp, voxel, build(v), footprint?, beauty?, themes?, light? }.
// Fixed interior pieces have no footprint/beauty (the museum places them); decor pieces do.
// Facing +z, bottom-centre origin, deterministic (hashed noise only).
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';
import { hash, vnoise, fill, tint, grime, blotch, rod } from './garage.js';

// ------------------------------------------------------------------ helpers
const R = Math.round;
const TAU = Math.PI * 2;
const pick = (list, n) => list[Math.min(list.length - 1, Math.floor(n * list.length))];

/** Wood with a few discrete grain bands running along `axis` (few tones so greedy meshing still merges). */
const wood = (base, axis = 'x', s = 1, k = 0.07) => (x, y, z) => {
  const n = vnoise(axis === 'x' ? x * 0.05 : x * 0.75, axis === 'y' ? y * 0.05 : y * 0.75, axis === 'z' ? z * 0.05 : z * 0.75, 2.4, s);
  return shade(base, n < 0.36 ? 1 - k : n > 0.64 ? 1 + k * 0.7 : 1);
};

/** Set a pixel pattern on the plane z (rows[0] = top at y0). mirror = flip columns (read from -z). */
function stamp(v, rows, legend, x0, y0, z, mirror = false) {
  rows.forEach((row, r) => {
    const s = mirror ? [...row].reverse().join('') : row;
    [...s].forEach((ch, c) => { if (legend[ch] !== undefined) v.set(x0 + c, y0 - r, z, legend[ch]); });
  });
}

// tiny 3×5 digits + 7-row kana for voxel signage
const DIG = {
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'], ' ': ['.', '.', '.', '.', '.'],
};
const KANA = {
  'ラ': ['.#####.', '.......', '#######', '......#', '.....#.', '...##..', '.##....'],
  'ム': ['...#...', '...#...', '..#....', '..#..#.', '.#....#', '#######', '.......'],
  'ネ': ['...#...', '.####..', '....#..', '...#...', '..##.#.', '.#.#..#', '...#...'],
  'ガ': ['..#..#.#', '######..', '..#..#..', '..#..#..', '.#...#..', '.#...#..', '#..##...'],
  'チ': ['....##.', '.###...', '...#...', '#######', '...#...', '..#....', '##.....'],
  'ャ': ['......', '......', '.#....', '.#####', '.#..#.', '..#...', '..#...'],
  'メ': ['.....#.', '.....#.', '.#..#..', '..##...', '...##..', '..#..#.', '##....#'],
  'ニ': ['.......', '.#####.', '.......', '.......', '.......', '#######', '.......'],
  'ュ': ['......', '......', '.####.', '....#.', '....#.', '######', '......'],
  'ー': ['.......', '.......', '.......', '#######', '.......', '.......', '.......'],
  'く': ['....#..', '...#...', '..#....', '.#.....', '..#....', '...#...', '....#..'],
  'じ': ['.#...#.', '.#.#..#', '.#..#..', '.#.....', '.#....#', '.#...#.', '..###..'],
  'ア': ['#######', '.....#.', '..#.#..', '..##...', '..#....', '.#.....', '#......'],
  'イ': ['.....#.', '....#..', '...#...', '.###...', '#..#...', '...#...', '...#...'],
  'ス': ['.#####.', '.....#.', '....#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  'ダ': ['..#..#.#', '.#####..', '.#...#..', '#.#..#..', '...#.#..', '....#...', '..##....'],
  'シ': ['##....#', '......#', '##...#.', '.....#.', '....#..', '..##...', '##.....'],
  '円': ['#####', '#.#.#', '#.#.#', '#####', '#...#', '#..##'],
  '氷': ['...#...', '...#...', '##.#.#.', '.#.##..', '.#.#.#.', '#..#..#', '..##...'],
  '…': ['.....', '.....', '.....', '.....', '.....', '.....', '#.#.#'],
};
/** Pixel rows for a string (glyphs bottom-aligned). */
function glyphRows(str, gap = 1) {
  const gl = [...str].map((ch) => DIG[ch] || KANA[ch] || DIG[' ']);
  const h = Math.max(...gl.map((g) => g.length));
  const rows = [];
  for (let r = 0; r < h; r++) {
    rows.push(gl.map((g) => { const off = h - g.length; return r < off ? '.'.repeat(g[0].length) : g[r - off]; }).join('.'.repeat(gap)));
  }
  return rows;
}
const glyphW = (str, gap = 1) => glyphRows(str, gap)[0].length;
/** Project pixel text onto a face. x = MIN coordinate along the face; reads correctly from that side. */
function ptext(v, str, x, y, col, { dir = '+z', gap = 1, raise = false, scale = 1 } = {}) {
  let rows = glyphRows(str, gap);
  if (scale > 1) rows = rows.flatMap((r) => Array(scale).fill([...r].map((ch) => ch.repeat(scale)).join('')));
  if (dir === '-z' || dir === '+x') rows = rows.map((r) => [...r].reverse().join(''));
  v.project(rows, { '#': col }, x, y, dir, { raise });
  return rows[0].length;
}
/** Rasterise thick pen strokes into pixel rows (for big hand-drawn kanji). */
function strokeRows(w, h, strokes, t = 2) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const pts of strokes) for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 3;
    for (let k = 0; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
      for (let dy = 0; dy < t; dy++) for (let dx = 0; dx < t; dx++) {
        const X = Math.round(x - (t - 1) / 2 + dx), Y = Math.round(y - (t - 1) / 2 + dy);
        if (X >= 0 && Y >= 0 && X < w && Y < h) g[Y][X] = '#';
      }
    }
  }
  return g.map((r) => r.join(''));
}

// ------------------------------------------------------------------ dagashi goods
const CANDY = [0xe5383b, 0xff8c2e, 0xffd23f, 0x58c06c, 0x3f86e8, 0xd94fb0, 0x8a5bd6, 0xff9fae, 0x2fb5a6, 0x6ad0ff];
const CAPS = [0xe5383b, 0xffd23f, 0x3f86e8, 0x58c06c, 0xff8fb2, 0xff8c2e, 0x8a5bd6, 0x5cc4ff];
const cardboard = (x, y, z) => shade(0xc49a62, 0.95 + vnoise(x, y * 2, z, 3, 5) * 0.08);

/** Flat standing snack packet w×h, one voxel deep, on plane z. */
function packet(v, x0, y0, z, w, h, c, c2) {
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    let col = c;
    if (y === 0 || y === h - 1) col = shade(c, 1.2); // crimped seals
    else if (h >= 5 && y === h - 2) col = 0xfbf8f2; // white header band
    else if (w >= 3 && h >= 4 && x === (w >> 1) && y === (h >> 1) - 1) col = c2; // mascot / logo
    v.set(x0 + x, y0 + y, z, gloss(col));
  }
}
/** Small printed carton (front face at z0, extends back d). c may be a colour function. */
function carton(v, x0, y0, z0, w, h, d, c, c2, band = true) {
  const col = typeof c === 'function' ? c : () => c;
  fill(v, x0, y0, z0 - d + 1, x0 + w - 1, y0 + h - 1, z0, (x, y, z) => (band && y === y0 + h - 1 ? 0xfbf8f2 : col(x, y, z)));
  if (w >= 3 && h >= 3) v.set(x0 + (w >> 1), y0 + (h >> 1), z0, c2);
  if (w >= 4 && h >= 4) v.set(x0 + (w >> 1) - 1, y0 + (h >> 1), z0, c2);
}
/** Lollipop: stick + small round candy. */
function lolly(v, x, y0, z, h, c) {
  for (let y = y0; y < y0 + h; y++) v.set(x, y, z, 0xf4f0e6);
  const t = y0 + h;
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]]) v.set(x + dx, t + 1 + dy, z, gloss(c));
  v.set(x, t + 1, z + 1, gloss(0xfbf8f2)); v.set(x + 1, t + 2, z, gloss(shade(c, 1.25)));
}
/** Two-tone gacha capsule (top colour / clear-white bottom). */
function capsule(v, cx, cy, cz, r, c) {
  v.shape(Math.floor(cx - r), Math.floor(cy - r), Math.floor(cz - r), Math.ceil(cx + r), Math.ceil(cy + r), Math.ceil(cz + r),
    (x, y, z) => (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 <= (r + 0.2) ** 2,
    (x, y) => (y >= cy ? gloss(c) : gloss(0xf2efe8)));
}

/** Puffy square floor cushion (zabuton) centred on (cx, cz), half-size hx×hz, thickness t from y0. */
function zabuton(v, cx, y0, cz, hx, hz, t, col, s = 1) {
  const sq = (x, z) => ((Math.abs(x - cx) / hx) ** 4 + (Math.abs(z - cz) / hz) ** 4) ** 0.25;
  v.shape(Math.floor(cx - hx), y0, Math.floor(cz - hz), Math.ceil(cx + hx), y0 + t, Math.ceil(cz + hz), (x, y, z) => {
    const q = sq(x, z);
    if (q > 1 || (y === y0 && q > 0.93)) return false;
    return y <= y0 + t * (0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - q ** 5)));
  }, (x, y, z) => gloss(shade(col, (sq(x, z) > 0.9 ? 0.86 : 0.95) + vnoise(x, y, z, 4, s) * 0.08)));
}

/** Gold tassels hanging off the four corners of a zabuton (y = attachment height). */
function tassels(v, cx, y, cz, hx, hz) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    let px = cx, pz = cz;
    for (let t = 0.6; t < 1.3; t += 0.01) {
      const x = R(cx + sx * t * hx * 0.84), z = R(cz + sz * t * hz * 0.84);
      if (!v.has(x, y, z)) { px = x; pz = z; break; }
    }
    v.set(px, y, pz, gloss(0xf2c14e)); v.set(px + sx, y, pz + sz, gloss(0xf2c14e));
    for (let k = 1; k <= 3 && y - k >= 0; k++) v.set(px + sx, y - k, pz + sz, gloss(k === 3 ? 0xf2c14e : 0xe8a83a));
  }
}

/**
 * Open cardboard tray of one dagashi product, x0..x1 / z0..z1 (z1 = front), resting on y.
 * kinds: packets, lolly, tubes, pile, sticks, cola. Returns nothing.
 */
function tray(v, kind, x0, x1, y, z0, z1, s) {
  const c = pick(CANDY, hash(s, 1, 1)), c2 = pick(CANDY, hash(s, 2, 2)), c3 = pick(CANDY, hash(s, 3, 3));
  // low box walls + floor
  v.shape(x0, y, z0, x1, y + 2, z1, (x, yy, z) => yy === y || x === x0 || x === x1 || z === z0 || z === z1, cardboard);
  v.box(x0, y + 2, z1, x1, y + 2, z1, c); // printed front lip
  if (x1 - x0 > 6) v.set(R((x0 + x1) / 2), y + 1, z1, 0xfbf8f2);
  const yi = y + 1;
  if (kind === 'packets') {
    for (let z = z1 - 1, row = 0; z > z0; z -= 2, row++) {
      for (let x = x0 + 1; x + 2 < x1; x += 4) packet(v, x, yi, z, 3, 5 + (row % 2) + (hash(x, z, s) < 0.3 ? 1 : 0), c, c2);
    }
  } else if (kind === 'lolly') {
    v.box(x0 + 1, yi, z0 + 1, x1 - 1, yi, z1 - 1, 0xf4f0e6);
    for (let z = z1 - 2; z > z0; z -= 3) for (let x = x0 + 2; x < x1 - 1; x += 3) {
      lolly(v, x, yi + 1, z, 2 + R(hash(x, z, s) * 3), pick(CANDY, hash(x, z, s + 1)));
    }
  } else if (kind === 'tubes') {
    for (let z = z1 - 1; z > z0; z -= 2) for (let x = x0 + 1; x < x1; x += 2) {
      const tc = pick([c, c2, c3], hash(x, z, s));
      const h = 5 + (hash(x, z, s + 2) < 0.4 ? 1 : 0);
      for (let k = 0; k < h; k++) v.set(x, yi + k, z, gloss(k === h - 1 ? 0xfbf8f2 : k === 2 ? shade(tc, 1.25) : tc));
    }
  } else if (kind === 'pile') {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rx = (x1 - x0) / 2, rz = (z1 - z0) / 2;
    v.shape(x0 + 1, yi, z0 + 1, x1 - 1, yi + 5, z1 - 1, (x, yy, z) => {
      const d = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
      return yy - yi <= 4.2 * (1 - d) + hash(x, yy, z, s) * 1.2;
    }, (x, yy, z) => {
      const k = hash(x >> 1, yy, z, s + 3);
      return gloss(k < 0.12 ? 0xfbf8f2 : pick([c, c2, c3, 0xffd23f], k));
    });
  } else if (kind === 'sticks') {
    for (let z = z1 - 1; z > z0; z -= 2) for (let x = x0 + 1; x < x1; x += 2) {
      const tc = pick([c, c2, 0xffd23f], hash(x, z, s));
      for (let k = 0; k < 9; k++) v.set(x, yi + k, z, gloss(k === 6 ? 0xfbf8f2 : k === 8 ? shade(tc, 1.2) : tc));
    }
  } else if (kind === 'cola') { // gummy cola bottles
    for (let z = z1 - 1; z > z0; z -= 2) for (let x = x0 + 1; x < x1; x += 2) {
      v.set(x, yi, z, glass(0x8a4a1e)); v.set(x, yi + 1, z, gloss(0xa85a24)); v.set(x, yi + 2, z, gloss(0xd8884a));
    }
  }
}

// ------------------------------------------------------------------ props
const shop = {
  // ============================================================ FIXED INTERIOR
  // ------------------------------------------------------------- cash register
  cash_register: {
    name: 'Shōwa Cash Register', jp: '金銭登録機', voxel: 0.01,
    build(v) {
      const cream = (x, y, z) => gloss(shade(0xece2c6, 0.97 + hash(x >> 1, y >> 1, z >> 1, 1) * 0.04));
      const brass = gloss(0xcfa446), brassD = gloss(0xa07a36), brassL = gloss(0xeccb7e);
      const walnut = wood(0x4e2e1c, 'x', 2, 0.08);
      // base board + cash drawer cabinet
      fill(v, -15, 0, -15, 14, 1, 15, walnut);
      fill(v, -14, 2, -14, 13, 7, 15, walnut);
      v.box(-15, 1, 15, 14, 1, 15, null); v.box(-15, 1, -15, 14, 1, -15, null);
      // drawer front: brass frame, knob, keyhole
      v.paint(() => {
        v.box(-13, 3, 15, 12, 3, 15, brassD); v.box(-13, 6, 15, 12, 6, 15, brassD);
        v.box(-13, 3, 15, -13, 6, 15, brassD); v.box(12, 3, 15, 12, 6, 15, brassD);
      });
      v.box(-1, 4, 16, 0, 5, 16, brass); v.set(-1, 5, 16, brassL);
      v.box(7, 4, 15, 9, 5, 15, brass); v.set(8, 4, 15, 0x1a1410);
      // brass band + front lip
      fill(v, -15, 8, -14, 14, 8, 16, brass);
      // rear body + sloped key deck
      const top = (z) => 9 + R((14 - z) * 0.7);
      fill(v, -14, 9, -13, 13, 20, -1, cream);
      v.shape(-14, 9, 0, 13, 20, 14, (x, y, z) => y <= top(z), cream);
      for (const x of [-14, 13]) v.box(x, 9, -13, x, 20, -13, null); // rounded back corners
      // dark key deck with brass edging
      v.paint(() => v.shape(-13, 9, 0, 12, 20, 14, (x, y, z) => y === top(z), gloss(0x3e3028)));
      v.paint(() => v.shape(-14, 9, 0, 13, 20, 14, (x, y, z) => (x === -14 || x === 13) && y === top(z), brassD));
      // number keys: 5 columns (sen/man/hyaku/jū/en) × 5 rows
      const capC = [0x2a2624, 0xf4efe2, 0xc8322b, 0xf4efe2, 0x2a2624];
      [-12, -8, -4, 0, 4].forEach((cx, ci) => {
        for (let r = 0; r < 5; r++) {
          const zc = 13 - r * 3;
          const yb = top(zc - 1) + 1;
          v.box(cx - 1, yb, zc - 1, cx + 1, yb, zc, gloss(0xc8ccd2)); // chrome key skirt
          v.box(cx - 1, yb + 1, zc - 1, cx + 1, yb + 1, zc, gloss(capC[ci]));
          v.set(cx - 1, yb + 1, zc - 1, gloss(shade(capC[ci], ci % 2 ? 0.88 : 1.7))); // glint
        }
      });
      // function keys (red cancel, green total, black receipt)
      [[0, 0xc8322b], [2, 0x2f8a4a], [4, 0x2a2624]].forEach(([r, col]) => {
        const zc = 13 - r * 3, yb = top(zc - 1) + 1;
        v.box(8, yb, zc - 1, 12, yb, zc, gloss(0xc8ccd2));
        v.box(8, yb + 1, zc - 1, 12, yb + 1, zc, gloss(col));
        v.set(8, yb + 1, zc, gloss(shade(col, 1.35)));
      });
      // display tower with pop-up number flags
      fill(v, -12, 21, -12, 11, 27, -3, cream);
      v.box(-9, 22, -11, 8, 26, -4, null);
      for (const z of [-3, -12]) {
        v.box(-9, 22, z, 8, 26, z, glass(0xe8f2f0));
        v.paint(() => { v.box(-10, 21, z, 9, 21, z, brass); v.box(-10, 27, z, 9, 27, z, brass); v.box(-10, 21, z, -10, 27, z, brass); v.box(9, 21, z, 9, 27, z, brass); });
      }
      const front = ['1', '2', '0'], back = ['0', '2', '1'];
      for (let i = 0; i < 3; i++) {
        const x0 = -8 + i * 5;
        v.box(x0, 22, -8, x0 + 4, 26, -7, gloss(0xfbf8f2));
        stamp(v, DIG[front[i]], { '#': i === 2 ? 0xc8322b : 0x2a2624 }, x0 + 1, 26, -7);
        stamp(v, DIG[back[i]], { '#': i === 0 ? 0xc8322b : 0x2a2624 }, x0 + 1, 26, -8, true);
        v.box(x0 + 2, 21, -8, x0 + 2, 21, -7, gloss(0x8a8a88));
      }
      // ornate brass crown + red enamel medallion
      v.shape(-12, 28, -9, 11, 31, -6, (x, y) => y <= 28 + R(3 * Math.cos(((x + 0.5) / 12.5) * Math.PI / 2)), brass);
      v.paint(() => v.shape(-12, 28, -6, 11, 31, -6, (x, y) => y === 28 + R(3 * Math.cos(((x + 0.5) / 12.5) * Math.PI / 2)), brassL));
      v.shape(-4, 28, -5, 3, 31, -5, (x, y) => ((x + 0.5) / 3.6) ** 2 + ((y - 29.5) / 1.9) ** 2 <= 1, brassL);
      v.shape(-4, 28, -5, 3, 31, -5, (x, y) => ((x + 0.5) / 2.6) ** 2 + ((y - 29.5) / 1.1) ** 2 <= 1, gloss(0xf6eed8));
      v.box(-1, 29, -5, 0, 30, -5, gloss(0xc8322b));
      for (const x of [-12, 11]) for (const z of [-12, -3]) v.set(x, 28, z, brassL);
      // brass scroll frames on the sides + back plate
      for (const x of [-14, 13]) v.paint(() => v.shape(x, 10, -12, x, 19, -2, (xx, y, z) => y === 11 || y === 18 || z === -11 || z === -3, brass));
      v.paint(() => v.shape(-12, 10, -13, 11, 19, -13, (x, y) => (y === 11 || y === 18 || x === -12 || x === 11) || ((x + y) % 4 === 0 && y > 12 && y < 17 && Math.abs(x) < 9), brassD));
      // side crank
      v.cylinder(14, 14, -7, 2.2, 2, brass, 'x');
      v.set(16, 14, -7, brassL);
      rod(v, 16, 14, -7, 16, 9, -3, brass);
      v.cylinder(17, 9, -3, 1, 3, gloss(0x3a2418), 'x');
      v.set(19, 9, -3, gloss(0x5a3824));
      grime(v, 0, 3, 0.85);
    },
  },

  // ------------------------------------------------------------- shop counter / glass showcase
  shop_counter: {
    name: 'Wooden Glass Showcase', jp: '木製ガラスショーケース', voxel: 0.02,
    build(v) {
      const post = wood(0x6a4026, 'y', 3, 0.07);
      const rail = wood(0x6a4026, 'x', 4, 0.07);
      const railZ = wood(0x6a4026, 'z', 4, 0.07);
      const brass = gloss(0xd6ae4c), brassL = gloss(0xf2d488);
      const glassC = glass(0xd6eaee);
      // plinth
      fill(v, -39, 0, -13, 38, 2, 12, 0x2e1c12);
      // lower rails / front kick panel
      fill(v, -40, 3, 11, 39, 8, 13, rail);
      fill(v, -40, 3, -14, 39, 8, -12, rail);
      fill(v, -40, 3, -11, -38, 8, 10, railZ); fill(v, 37, 3, -11, 39, 8, 10, railZ);
      v.paint(() => v.shape(-38, 4, 13, 37, 7, 13, (x, y) => y === 4 || y === 7 || x === -38 || x === 37 || x === -1 || x === 0, shade(0x6a4026, 0.78)));
      // interior floor + riser + back shelf
      fill(v, -37, 7, -11, 36, 8, 10, wood(0xc89a64, 'x', 5, 0.05));
      fill(v, -37, 9, -11, 36, 20, -2, (x, y) => (y === 20 ? 0xb8282a : 0xd8c8a8));
      v.paint(() => v.shape(-37, 9, -2, 36, 19, -2, (x, y) => ((x + 40) >> 2) % 2 === 0, 0xe8463a)); // striped paper skirt
      fill(v, -37, 30, -11, 36, 30, -6, wood(0xc89a64, 'x', 6, 0.05));
      // posts, centre mullion, top rails
      for (const [x0, z0] of [[-40, 11], [37, 11], [-40, -14], [37, -14]]) fill(v, x0, 9, z0, x0 + 2, 44, z0 + 2, post);
      fill(v, -1, 9, 11, 0, 44, 13, post);
      fill(v, -40, 41, 11, 39, 44, 13, rail); fill(v, -40, 41, -14, 39, 44, -12, rail);
      fill(v, -40, 41, -11, -38, 44, 10, railZ); fill(v, 37, 41, -11, 39, 44, 10, railZ);
      // glass: front (two bays) + sides
      v.box(-37, 9, 12, -2, 40, 12, glassC); v.box(1, 9, 12, 36, 40, 12, glassC);
      v.box(-39, 9, -11, -39, 40, 10, glassC); v.box(38, 9, -11, 38, 40, 10, glassC);
      // back: two sliding wooden doors (outer right, inner left) on a track
      const door = (x0, x1, zo, zi, s) => {
        fill(v, x0, 9, zo, x1, 40, zi, (x, y, z) => {
          const frame = x <= x0 + 1 || x >= x1 - 1 || y <= 10 || y >= 39 || y === 24 || y === 25;
          if (!frame && z === zo) return null;
          return frame ? wood(0x5a3420, 'y', s, 0.06)(x, y, z) : wood(0x8a5a34, 'x', s + 1, 0.05)(x, y, z);
        });
      };
      door(-37, 1, -12, -11, 7);
      door(-2, 36, -14, -13, 9);
      for (const [x, z] of [[-33, -12], [32, -14]]) v.box(x, 28, z, x, 32, z, 0x1e120c); // finger pulls
      v.box(-2, 25, -14, -1, 26, -14, brass); v.set(-2, 25, -14, 0x1a1410); // lock plate
      // top slab (varnished) + brass corner fittings
      fill(v, -40, 45, -14, 39, 47, 13, (x, y, z) => gloss(wood(0x3e2416, 'x', 6, 0.06)(x, y, z)));
      v.box(-40, 47, 13, 39, 47, 13, gloss(0x4e3020)); // bevel highlight
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const xe = sx < 0 ? -40 : 39, ze = sz < 0 ? -14 : 13;
        for (let k = 0; k < 4; k++) { v.set(xe - sx * k, 47, ze, brass); v.set(xe, 47, ze - sz * k, brass); }
        v.set(xe, 46, ze, brassL); v.set(xe, 45, ze, brass);
        v.box(xe, 41, ze, xe, 42, ze, brass); // corner caps on the posts
        v.box(xe, 3, ze, xe, 4, ze, brass);
      }
      // ---- goods on display
      // front row: packets; second row: cartons & jars (floor y 9)
      let s = 0;
      for (let x = -36; x <= 33; x += 4) {
        if (x >= -3 && x <= 0) continue;
        s++;
        const c = pick(CANDY, hash(s, 1, 9)), c2 = pick(CANDY, hash(s, 2, 9));
        packet(v, x, 9, 9, 3, 4 + (s % 2), c, c2);
        packet(v, x + 1, 9, 7, 3, 5 + ((s + 1) % 2), pick(CANDY, hash(s, 3, 9)), c);
      }
      for (let x = -36; x <= 32; x += 6) {
        s++;
        const k = hash(s, 4, 9);
        if (k < 0.35) carton(v, x, 9, 4, 4, 4 + (s % 2), 2, pick(CANDY, hash(s, 5, 9)), pick(CANDY, hash(s, 6, 9)));
        else if (k < 0.6) { // little glass jar of candy balls
          v.cylinder(x + 2, 9, 3, 2, 4, glass(0xe0f0f0));
          v.cylinder(x + 2, 9, 3, 1, 3, (xx, yy, zz) => gloss(pick(CANDY, hash(xx, yy, zz, s))));
          v.cylinder(x + 2, 13, 3, 2, 1, gloss(pick([0xe5383b, 0x3f86e8, 0xffd23f], k * 3 % 1)));
        } else if (k < 0.8) { // menko card bundles
          for (let i = 0; i < 3; i++) v.box(x, 9 + i, 2 + i % 2, x + 3, 9 + i, 4 + i % 2, gloss(pick(CANDY, hash(s, i, 7))));
        } else { // bouncy balls
          v.sphere(x + 1, 10, 4, 1, gloss(pick(CANDY, hash(s, 8, 9))));
          v.sphere(x + 3, 10, 2, 1, gloss(pick(CANDY, hash(s, 9, 9))));
        }
      }
      // riser: tall packets + cartons
      for (let x = -36; x <= 33; x += 4) {
        s++;
        packet(v, x, 21, -3, 3, 5 + (s % 3 === 0 ? 1 : 0), pick(CANDY, hash(s, 1, 8)), pick(CANDY, hash(s, 2, 8)));
      }
      for (let x = -35; x <= 31; x += 5) {
        s++;
        carton(v, x, 21, -6, 4, 4 + (s % 3), 3, pick(CANDY, hash(s, 3, 8)), pick(CANDY, hash(s, 4, 8)));
      }
      // top back shelf: toys (spinning tops, robots, cars, balls)
      for (let x = -35; x <= 31; x += 6) {
        s++;
        const k = hash(s, 5, 8), c = pick(CANDY, hash(s, 6, 8));
        if (k < 0.25) { // koma spinning top
          v.set(x + 2, 31, -8, 0x3a2418); v.cylinder(x + 2, 32, -8, 1.6, 1, gloss(c)); v.cylinder(x + 2, 33, -8, 2, 1, gloss(0xfbf8f2)); v.set(x + 2, 34, -8, 0x3a2418);
        } else if (k < 0.5) { // tin robot
          v.box(x + 1, 31, -9, x + 3, 34, -8, metal(0xb8c0c8)); v.box(x + 1, 35, -9, x + 3, 36, -8, metal(0xc8d0d8));
          v.set(x + 1, 36, -8, glow(0xff5040)); v.set(x + 3, 36, -8, glow(0xff5040)); v.set(x + 2, 33, -8, gloss(c));
        } else if (k < 0.75) { // tin car
          v.box(x, 31, -9, x + 4, 32, -7, gloss(c)); v.box(x + 1, 33, -9, x + 3, 33, -7, gloss(c));
          v.box(x + 1, 33, -7, x + 3, 33, -7, glass(0xcfe8f0));
          for (const xx of [x, x + 4]) v.set(xx, 31, -7, 0x1e1e1e);
        } else carton(v, x, 31, -7, 5, 6, 3, c, pick(CANDY, hash(s, 7, 8)));
      }
      // hand-written paper price notice on the glass
      v.box(19, 31, 13, 33, 39, 13, 0xf8f4e8);
      stamp(v, glyphRows('10円'), { '#': 0xd82a24 }, 20, 38, 13);
      v.set(19, 39, 13, 0xd8c88a); v.set(33, 39, 13, 0xd8c88a); // tape
      grime(v, 0, 4, 0.8);
    },
  },

  // ------------------------------------------------------------- pendulum wall clock
  pendulum_clock: {
    name: 'Pendulum Wall Clock', jp: '柱時計', voxel: 0.01,
    build(v) {
      const wd = (x, y, z) => gloss(wood(0x4a2a18, 'y', 7, 0.08)(x, y, z));
      const wdL = gloss(0x6e4128), wdD = gloss(0x2e1a10);
      const brass = gloss(0xd8ae4e), brassL = gloss(0xf4d890), gold = gloss(0xe8c060);
      const cx = -0.5, cy = 46;
      // octagonal head
      v.shape(-16, 31, -6, 15, 61, 5, (x, y) => { const dx = Math.abs(x - cx), dy = Math.abs(y - cy); return dx <= 15.5 && dy <= 15 && dx + dy <= 22; }, wd);
      v.paint(() => v.shape(-16, 31, 5, 15, 61, 5, (x, y) => { const dx = Math.abs(x - cx), dy = Math.abs(y - cy); return dx + dy >= 20.5 || dx >= 14.5 || dy >= 14; }, wdL));
      // dial: white face (z 4) behind glass (z 5) inside a brass bezel
      v.shape(-14, 33, 5, 13, 59, 5, (x, y) => Math.hypot(x - cx, y - cy) <= 13.2, null);
      v.shape(-14, 33, 4, 13, 59, 4, (x, y) => Math.hypot(x - cx, y - cy) <= 11.7, gloss(0xf6f0e0));
      v.shape(-14, 33, 5, 13, 59, 5, (x, y) => { const d = Math.hypot(x - cx, y - cy); return d > 11.7 && d <= 13.2; }, brass);
      v.paint(() => v.shape(-14, 33, 5, 13, 59, 5, (x, y) => { const d = Math.hypot(x - cx, y - cy); return d > 11.7 && d <= 13.2 && y > cy + 4 && x < cx - 3; }, brassL));
      v.shape(-14, 33, 5, 13, 59, 5, (x, y) => Math.hypot(x - cx, y - cy) <= 11.7, glass(0xeef4f4));
      // minute track + hour marks + numerals
      v.paint(() => v.shape(-14, 33, 4, 13, 59, 4, (x, y) => Math.abs(Math.hypot(x - cx, y - cy) - 10.9) < 0.45, 0x8a8070));
      for (let h = 1; h <= 12; h++) {
        if (h % 3 === 0) continue;
        const a = (h / 12) * TAU;
        v.set(R(cx + Math.sin(a) * 9.3), R(cy + Math.cos(a) * 9.3), 4, 0x1a1410);
      }
      const ink = { '#': 0x1a1410 };
      stamp(v, glyphRows('12'), ink, -4, 55, 4);
      stamp(v, DIG[6], ink, -2, 41, 4);
      stamp(v, DIG[3], ink, 6, 48, 4);
      stamp(v, DIG[9], ink, -9, 48, 4);
      // hands at 10:10, winding holes, centre pin
      const hand = (a, len) => { for (let t = 0; t <= len; t += 0.5) v.set(R(cx + Math.sin(a) * t), R(cy + Math.cos(a) * t), 4, 0x1a1410); };
      hand(TAU * (10 / 12 + 10 / 720), 5.2); hand(TAU * (10 / 60), 8.6);
      v.set(-1, 46, 4, brass); v.set(0, 46, 4, brass);
      v.set(-5, 42, 4, 0x2a2420); v.set(4, 42, 4, 0x2a2420);
      // pendulum case
      fill(v, -11, 6, -5, 10, 30, 4, wd);
      fill(v, -12, 5, -6, 11, 6, 5, wdL); fill(v, -12, 29, -6, 11, 30, 5, wdL);
      v.box(-8, 9, -4, 7, 27, 4, null);
      fill(v, -8, 9, -5, 7, 27, -5, (x, y) => ((x + y) % 6 === 0 ? 0x6a2a22 : 0x5a1e1a));
      v.box(-8, 9, 4, 7, 27, 4, glass(0xe4eef0));
      // gold-leaf stencil border on the glass
      for (let x = -7; x <= 6; x++) { v.set(x, 10, 4, gold); v.set(x, 26, 4, gold); }
      for (let y = 10; y <= 26; y++) { v.set(-7, y, 4, gold); v.set(6, y, 4, gold); }
      for (const [x, y] of [[-6, 11], [5, 11], [-6, 25], [5, 25]]) v.set(x, y, 4, gold);
      // brass pendulum: flat rod + bob
      v.box(-1, 15, -2, 0, 29, -2, brass);
      v.cylinder(-0.5, 13, -3, 3.3, 2, brass, 'z');
      v.paint(() => v.shape(-4, 12, -2, 3, 17, -2, (x, y) => (x - -1.5) ** 2 + (y - 14.5) ** 2 < 2.2, brassL));
      // bottom drop + side ears
      v.shape(-8, 0, -5, 7, 4, 3, (x, y) => Math.abs(x - cx) <= 2.5 + y * 1.3, wd);
      v.box(-1, 0, -1, 0, 0, 0, wdD);
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? -13 : 12;
        v.box(x0, 27, -4, x0, 31, 3, wd);
        v.box(x0 + (s < 0 ? 1 : -1), 25, -4, x0 + (s < 0 ? 1 : -1), 31, 3, wd);
        v.set(x0, 27, 3, wdL);
      }
      // top finial
      v.box(-2, 62, -3, 1, 62, 2, wdL); v.box(-1, 63, -2, 0, 63, 1, wd);
    },
  },

  // ------------------------------------------------------------- enamel pendant lamp
  shop_lamp: {
    name: 'Enamel Pendant Lamp', jp: 'ホーローランプ', voxel: 0.01, light: 0xffd49a,
    build(v) {
      const rOut = (y) => 14.6 - y * 1.12;
      const inShade = (x, y, z) => { const d = Math.hypot(x, z), ro = rOut(y); return y >= 0 && y <= 10 && d <= ro && d > ro - 2.5; };
      v.shape(-15, 0, -15, 15, 10, 15, inShade, gloss(0xf6f3ea));
      // outside (top-exposed) voxels are dark-green enamel, the underside stays white
      v.recolor((x, y, z) => {
        if (!inShade(x, y, z)) return undefined;
        if (y === 0) return Math.hypot(x, z) > rOut(0) - 1.2 ? gloss(0x1f2f2a) : undefined; // dark rolled rim
        return inShade(x, y + 1, z) ? undefined : gloss(shade(0x2f5e48, 0.94 + (y / 10) * 0.12));
      });
      v.cylinder(0, 10, 0, 3.6, 1, gloss(0x2f5e48));
      v.cylinder(0, 11, 0, 2.4, 1, gloss(0x2a2624));
      v.cylinder(0, 12, 0, 2.4, 1, gloss(0xc8a050));
      v.cylinder(0, 13, 0, 2.0, 3, gloss(0x2a2624));
      v.cylinder(0, 16, 0, 1, 1, gloss(0x3a3430));
      // bulb inside the shade
      v.cylinder(0, 8, 0, 1.2, 2, gloss(0xd0b060));
      v.sphere(0, 4.5, 0, 3, glow(0xffe2a8));
      v.sphere(0, 4.5, 0, 1.4, glow(0xfff6e0));
      // twisted cloth cord with a knot loop at the top
      for (let y = 17; y <= 64; y++) {
        v.set(0, y, 0, y % 2 ? 0x3a2a20 : 0x6a4c34);
        if (y % 4 === 0) v.set(y % 8 === 0 ? 1 : -1, y, 0, 0x4a3628);
      }
      v.ring(0, 67, 0, 0x3a2a20, 'z');
    },
  },

  // ------------------------------------------------------------- wall shelf with candy jars
  wall_shelf_jars: {
    name: 'Candy Jar Wall Shelf', jp: '駄菓子瓶の棚', voxel: 0.01,
    build(v) {
      const wd = wood(0x8a5a34, 'x', 3, 0.07);
      const wdY = wood(0x7a4c2c, 'y', 4, 0.07);
      v.jitter = 0.012; // wood grain already varies the big flat boards
      // back rails (the shop wall shows between them) + side panels with bracket profile
      for (const [y0, y1] of [[2, 6], [29, 33], [47, 52]]) fill(v, -48, y0, -11, 47, y1, -11, wood(0xa87a4c, 'x', 5, 0.05));
      const zf = (y) => (y <= 2 || (y >= 26 && y <= 29) ? 10 : 10 - R(5 * Math.sin((((y - 2) % 26) / 24) * Math.PI)));
      for (const x0 of [-50, 48]) v.shape(x0, 0, -11, x0 + 1, 54, 10, (x, y, z) => z <= (y > 50 ? 4 : zf(y)), wdY);
      // boards + top cap with scalloped crest
      fill(v, -48, 0, -10, 47, 1, 10, wd);
      fill(v, -48, 27, -10, 47, 28, 10, wd);
      fill(v, -50, 53, -11, 49, 54, 6, wd);
      v.box(-50, 53, 6, 49, 53, 6, shade(0x8a5a34, 0.8)); // moulding

      // jars of candy
      const jarSets = [
        [0xe5383b, 0xfbf8f2, 0xffd23f], [0x58c06c, 0xffd23f, 0xfbf8f2], [0xff9fae, 0xfbf8f2, 0xd94fb0],
        [0x8a4a1e, 0xd8884a, 0xf2e2c0], [0x3f86e8, 0x6ad0ff, 0xfbf8f2], [0xff8c2e, 0xffd23f, 0xe5383b],
        [0xd94fb0, 0x8a5bd6, 0xfbf8f2], [0xffd23f, 0xfbf8f2, 0xff8c2e], [0x6ad0ff, 0xfbf8f2, 0xff9fae], [0x58c06c, 0xe5383b, 0xfbf8f2],
      ];
      const lids = [0xe5383b, 0xffd23f, 0x3f86e8, 0x58c06c, 0xe5383b, 0xff8c2e, 0xffd23f, 0x3f86e8, 0xe5383b, 0x58c06c];
      const prices = ['10', '20', '5', '30', '10', '50', '20', '5', '10', '30'];
      const jarGlass = glass(0xe2f0f0);
      let n = 0;
      for (const yb of [2, 29]) {
        for (const cx of [-38, -19, 0, 19, 37]) {
          const set = jarSets[n], lid = lids[n], s = n + 1;
          // candy pieces: 3-voxel cells, each one colour with a highlight corner
          const candy = (x, y, z) => {
            const c = pick(set, hash(Math.floor(x / 3), Math.floor(y / 3), Math.floor(z / 3), s));
            return gloss(c);
          };
          if (n % 2 === 0) {
            // round jar with a screw lid
            v.tube(cx, yb, 0, 7, 5.9, 15, jarGlass);
            v.cylinder(cx, yb, 0, 6, 1, jarGlass);
            v.tube(cx, yb + 15, 0, 6, 4.4, 2, jarGlass);
            const lvl = 9 + (s % 4);
            v.shape(cx - 6, yb + 1, -6, cx + 6, yb + lvl + 1, 6, (x, y, z) => Math.hypot(x - cx, z) <= 5.9 && y - yb <= lvl + (hash(x >> 2, 0, z >> 2, s) < 0.4 ? 1 : 0), candy);
            v.cylinder(cx, yb + 17, 0, 5.4, 2, gloss(lid));
            v.cylinder(cx, yb + 19, 0, 2, 1, gloss(shade(lid, 1.15)));
            v.paint(() => v.shape(cx - 6, yb + 17, -6, cx + 6, yb + 17, 6, () => true, gloss(shade(lid, 0.8))));
          } else {
            // the iconic leaning dagashi jar: a cylinder tipped towards the customer, cut flat at the base
            const r = 6, L = 15, ang = 0.62, zb = -3.5, dy = Math.cos(ang), dz = Math.sin(ang);
            const geo = (x, y, z) => {
              const py = y - yb, pz = z - zb, t = py * dy + pz * dz;
              return [t, Math.hypot(x - cx, py - t * dy, pz - t * dz)];
            };
            v.shape(cx - r - 1, yb, -11, cx + r + 1, yb + 20, 11, (x, y, z) => {
              const [t, rad] = geo(x, y, z);
              return t <= L && rad <= r + 0.3 && (rad > r - 0.9 || y === yb);
            }, jarGlass);
            v.shape(cx - r, yb + 1, -11, cx + r, yb + 14, 11, (x, y, z) => {
              const [t, rad] = geo(x, y, z);
              return t <= L - 2 && rad <= r - 0.9 && y - yb <= 9 + (hash(x >> 2, 0, z >> 2, s) < 0.4 ? 1 : 0);
            }, candy);
            v.shape(cx - r - 1, yb, -11, cx + r + 1, yb + 22, 11, (x, y, z) => {
              const [t, rad] = geo(x, y, z);
              return (t > L && t <= L + 1.6 && rad <= r + 0.5) || (t > L + 1.6 && t <= L + 2.6 && rad <= 1.7);
            }, (x, y, z) => { const [t, rad] = geo(x, y, z); return gloss(t > L + 1.6 ? shade(lid, 1.15) : rad > r - 0.6 ? shade(lid, 0.8) : lid); });
          }
          // price card on the board edge
          const ty = yb + 3, tz = 11;
          v.box(cx - 4, ty - 6, tz, cx + 4, ty, tz, 0xfbf8f0);
          v.box(cx - 4, ty, tz, cx + 4, ty, tz, 0xe8463a);
          stamp(v, glyphRows(prices[n]), { '#': 0xd82a24 }, cx - (prices[n].length === 1 ? 1 : 3), ty - 1, tz);
          n++;
        }
      }
      grime(v, 0, 2, 0.88);
    },
  },

  // ------------------------------------------------------------- soroban abacus
  abacus: {
    name: 'Soroban Abacus', jp: 'そろばん', voxel: 0.005,
    build(v) {
      const fr = (x, y, z) => gloss(wood(0x3e2416, 'x', 2, 0.08)(x, y, z));
      const frZ = (x, y, z) => gloss(wood(0x3e2416, 'z', 3, 0.08)(x, y, z));
      fill(v, -30, 0, -10, 29, 3, -9, fr); fill(v, -30, 0, 9, 29, 3, 10, fr);
      fill(v, -30, 0, -8, -29, 3, 8, frZ); fill(v, 28, 0, -8, 29, 3, 8, frZ);
      fill(v, -28, 1, -4, 27, 3, -4, gloss(0xd8c49a)); // beam
      const num = [0, 3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 0];
      for (let k = 0; k < 14; k++) {
        const x = -26 + k * 4;
        if (k % 3 === 1) v.set(x, 3, -4, gloss(0x1a1410)); // unit dots
        for (let z = -8; z <= 8; z++) if (z !== -4) v.set(x, 2, z, 0xe0cc8a);
        const bead = (z0) => {
          for (const z of [z0, z0 + 1]) {
            v.box(x - 1, 2, z, x + 1, 3, z, gloss(0x5a2616)); v.set(x, 1, z, gloss(0x3a180e));
            v.set(x, 3, z, gloss(z === z0 ? 0x8a4428 : 0x6e3220)); // rounded highlight
          }
        };
        const d = num[k];
        bead(d >= 5 ? -6 : -8); // heaven bead
        const up = d % 5;
        for (let i = 0; i < 4; i++) bead(i < up ? -3 + i * 2 : 8 - (3 - i) * 2 - 1);
      }
    },
  },

  // ============================================================ DECOR
  // ------------------------------------------------------------- dagashi rack
  dagashi_rack: {
    name: 'Dagashi Candy Rack', jp: '駄菓子の段々棚', voxel: 0.015,
    footprint: [1, 0.5], beauty: 5, themes: ['candy', 'retro', 'food'],
    build(v) {
      v.jitter = 0.02; // lots of tiny goods: keep the big wood panels mergeable
      const wdY = wood(0x9a6a3c, 'y', 2, 0.07), wdX = wood(0x9a6a3c, 'x', 3, 0.07);
      const tiers = [{ y: 22, zf: 15 }, { y: 40, zf: 5 }, { y: 58, zf: -5 }];
      // back board + stepped side panels
      fill(v, -33, 0, -16, 32, 80, -15, wood(0x8a5a32, 'x', 4, 0.06));
      const zSide = (y) => (y <= 23 ? 15 : y <= 41 ? 5 : y <= 59 ? -5 : -14);
      for (const x0 of [-33, 31]) v.shape(x0, 0, -16, x0 + 1, 80, 15, (x, y, z) => z <= zSide(y), wdY);
      // bottom: kick board, stock shelf with cardboard boxes
      fill(v, -31, 0, 13, 30, 2, 15, wdX);
      fill(v, -31, 3, -14, 30, 3, 15, wdX);
      carton(v, -29, 4, 13, 18, 12, 16, cardboard, cardboard, false);
      carton(v, -9, 4, 12, 16, 10, 14, cardboard, cardboard, false);
      carton(v, 9, 4, 13, 20, 14, 20, cardboard, cardboard, false);
      v.box(-29, 15, 7, -12, 15, 8, 0xd9c58e); v.box(9, 17, 6, 28, 17, 7, 0xd9c58e); // tape
      v.project(['.RRR.', 'RWWWR', 'RWRWR', 'RWWWR', '.RRR.'], { R: 0xd8463a, W: 0xf4ead2 }, -23, 12, '+z');
      v.project(['BBBBBB', 'BWWWWB', 'BBBBBB'], { B: 0x3f86e8, W: 0xf4ead2 }, -4, 10, '+z');
      v.project(['.GGG.', 'GGGGG', '.GGG.', '..G..'], { G: 0x58c06c }, 16, 13, '+z');
      // tiers: board + riser + front lip with price tags
      const kinds = [['packets', 'lolly', 'tubes', 'pile'], ['sticks', 'packets', 'cola', 'pile'], ['tubes', 'packets', 'lolly', 'packets']];
      tiers.forEach((t, i) => {
        const zb = i < 2 ? tiers[i + 1].zf + 1 : -14;
        fill(v, -31, t.y - 1, zb, 30, t.y, t.zf, wdX);
        if (i < 2) fill(v, -31, t.y + 1, tiers[i + 1].zf, 30, tiers[i + 1].y - 2, tiers[i + 1].zf, (x, y, z) => (y % 6 === 0 ? 0xe8463a : 0xf4ead2));
        const xs = [-31, -16, -1, 15, 30];
        for (let k = 0; k < 4; k++) {
          tray(v, kinds[i][k], xs[k] + 1, xs[k + 1] - 1, t.y + 1, zb + 1, t.zf - 1, 10 + i * 7 + k);
          // price card hanging from the shelf edge
          const tx = R((xs[k] + xs[k + 1]) / 2), pr = ['10', '20', '30', '5'][(i + k) % 4];
          v.box(tx - 3, t.y - 7, t.zf + 1, tx + 3, t.y - 2, t.zf + 1, 0xfbf8f0);
          v.box(tx - 3, t.y - 2, t.zf + 1, tx + 3, t.y - 2, t.zf + 1, 0xe8463a);
          stamp(v, glyphRows(pr), { '#': 0xd82a24 }, tx - (pr.length > 1 ? 3 : 1), t.y - 3, t.zf + 1);
        }
      });
      // header sign
      fill(v, -17, 65, -14, 16, 78, -14, 0xc8322b);
      v.paint(() => v.shape(-17, 65, -14, 16, 78, -14, (x, y) => x === -17 || x === 16 || y === 65 || y === 78, 0xf2c14e));
      const w = glyphW('ダガシ', 2);
      v.project(glyphRows('ダガシ', 2), { '#': 0xfbf8f2 }, -R(w / 2), 75, '+z');
      // hanging rail with strips of packets
      for (const x of [-32, 31]) rod(v, x, 79, -14, x, 79, 10, gloss(0xc8ccd0));
      rod(v, -32, 79, 10, 31, 79, 10, gloss(0xc8ccd0));
      [-31, -24, 18, 25].forEach((x0, i) => {
        const c = pick(CANDY, hash(i, 4, 4)), c2 = pick(CANDY, hash(i, 5, 4));
        v.box(x0 + 2, 78, 10, x0 + 3, 78, 10, gloss(0x9aa0a8)); // clip
        fill(v, x0, 57, 10, x0 + 5, 77, 10, (x, y) => (y >= 75 ? 0xfbf8f0 : shade(c, 0.8)));
        for (let k = 0; k < 4; k++) packet(v, x0 + 1, 58 + k * 4 + k, 11, 4, 4, c2, 0xfbf8f2);
      });
      grime(v, 0, 5, 0.82);
    },
  },

  // ------------------------------------------------------------- ramune cooler
  ramune_cooler: {
    name: 'Ramune Ice Cooler', jp: 'ラムネ冷やし箱', voxel: 0.015,
    footprint: [1, 0.5], beauty: 4, themes: ['retro', 'food'],
    build(v) {
      const paint = (x, y, z) => gloss(shade(mix(0x58a8cc, 0xd8ecf0, 0.15 + vnoise(x, y, z, 6, 2) * 0.12), 1));
      const white = gloss(0xf2eee4), chrome = gloss(0xd8dce2);
      // legs + cross bars
      for (const x of [-27, 25]) for (const z of [-12, 11]) { fill(v, x, 0, z, x + 1, 8, z + 1, gloss(0x6a6e72)); v.box(x - 1, 0, z - 1, x + 2, 0, z + 2, gloss(0x4a4e52)); }
      fill(v, -27, 3, -12, 26, 3, -12, gloss(0x6a6e72)); fill(v, -27, 3, 12, 26, 3, 12, gloss(0x6a6e72));
      // body with rounded vertical edges
      v.shape(-30, 9, -15, 29, 44, 14, (x, y, z) => {
        const ex = Math.max(0, Math.abs(x + 0.5) - 26.5), ez = Math.max(0, Math.abs(z + 0.5) - 11.5);
        return ex * ex + ez * ez <= 9.5;
      }, (x, y, z) => (y >= 17 && y <= 20 ? white : y === 21 ? gloss(0xd8463a) : paint(x, y, z)));
      // interior cavity: white liner, ice + water
      v.box(-27, 18, -12, 26, 44, 11, null);
      fill(v, -27, 18, -12, 26, 35, 11, gloss(0x8ac8e0));
      v.shape(-27, 36, -12, 26, 38, 11, (x, y, z) => y - 36 <= R(hash(x >> 1, 0, z >> 1, 3) * 2.4), (x, y, z) => gloss(pick([0xeaf6fa, 0xd4ecf4, 0xbfe0ee, 0xf8fcfc], hash(x >> 1, y, z >> 1, 4))));
      for (let i = 0; i < 9; i++) {
        const x = -24 + R(hash(i, 1, 7) * 48), z = -10 + R(hash(i, 2, 7) * 19);
        v.box(x, 38, z, x + 2, 39, z + 2, glass(0xe4f6fa));
      }
      // ramune bottles poking out of the ice
      let n = 0;
      for (let z = -9; z <= 9; z += 6) for (let x = -24; x <= 24; x += 6) {
        n++;
        const bx = x + ((z / 6) % 2 ? 3 : 0), bz = z;
        if (bx > 25 || hash(bx, bz, 9) < 0.12) continue;
        for (let y = 36; y <= 40; y++) v.box(bx - 1, y, bz - 1, bx + 1, y, bz + 1, glass(0xa8e0dc));
        for (let y = 36; y <= 40; y++) v.set(bx, y, bz, gloss(0x9ad8d0));
        for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) v.set(bx + dx, 41, bz + dz, glass(0xa8e0dc));
        v.set(bx, 41, bz, gloss(0x9ad8d0));
        v.set(bx, 42, bz, gloss(0x7cc8c0)); // pinched neck
        v.set(bx, 43, bz, gloss(0xf4fcfc)); // the marble
        for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) v.set(bx + dx, 44, bz + dz, glass(0xa8e0dc));
        v.set(bx, 44, bz, gloss(0x9ad8d0));
        v.set(bx, 45, bz, gloss(n % 3 === 0 ? 0xe5383b : 0x3f86e8)); // cap
      }
      // chrome rim + sliding glass lids
      v.shape(-30, 45, -15, 29, 45, 14, (x, y, z) => {
        const ex = Math.max(0, Math.abs(x + 0.5) - 26.5), ez = Math.max(0, Math.abs(z + 0.5) - 11.5);
        return ex * ex + ez * ez <= 9.5 && !(x >= -27 && x <= 26 && z >= -12 && z <= 11);
      }, chrome);
      const lid = (x0, x1, y) => fill(v, x0, y, -13, x1, y, 12, (x, yy, z) => (x === x0 || x === x1 || z === -13 || z === 12 ? chrome : glass(0xd4ecf4)));
      lid(-28, -1, 46);
      lid(-14, 13, 47);
      v.box(-12, 48, -1, -12, 48, 1, chrome); // finger tab
      // faded logo panel: "ラムネ" + bottle icon
      v.shape(-21, 24, 14, 20, 39, 14, (x, y) => {
        const ex = Math.max(0, Math.abs(x + 0.5) - 17.5), ey = Math.max(0, Math.abs(y - 31.5) - 4.5);
        return ex * ex + ey * ey <= 11;
      }, gloss(0xf4efe2));
      v.project(['.##.', '.##.', '.RR.', '####', '#BB#', '#BB#', '####', '####', '.##.'], { '#': gloss(0x7ccfc8), R: gloss(0xe5383b), B: gloss(0xeaf8f8) }, -18, 36, '+z');
      v.project(glyphRows('ラムネ'), { '#': gloss(0x2f6fb6) }, -11, 35, '+z', { raise: false });
      v.project(['#################'], { '#': gloss(0xd8463a) }, -11, 27, '+z');
      tint(v, -21, 24, 14, 20, 39, 14, (x, y, z, c, m) => (vnoise(x, y, 0, 3, 8) > 0.68 ? mix(c, 0xf4efe2, 0.55) : undefined));
      // drain tap, side handles, bottle opener
      v.box(-25, 11, 15, -24, 12, 16, chrome); v.set(-25, 10, 16, chrome);
      for (const x of [-31, 30]) v.box(x, 36, -4, x, 37, 3, chrome);
      v.box(30, 26, -2, 30, 30, 1, chrome); v.box(30, 27, -1, 30, 28, 0, 0x1a1a1a);
      // weathering
      blotch(v, -30, 9, -15, 29, 10, 14, gloss(0x8a5a3a), 0.8, 2, 6);
      grime(v, 0, 12, 0.8);
    },
  },

  // ------------------------------------------------------------- bench with cushion + tea
  shop_bench: {
    name: 'Shopfront Bench', jp: '店先の縁台', voxel: 0.0125,
    footprint: [1, 0.5], beauty: 3, themes: ['retro', 'home'],
    build(v) {
      const wdY = wood(0x9a6a3c, 'y', 3, 0.07), wdX = wood(0xa8784a, 'x', 4, 0.07);
      // legs + stretchers + apron
      for (const x of [-35, 32]) for (const z of [-12, 9]) fill(v, x, 0, z, x + 2, 30, z + 2, wdY);
      fill(v, -34, 6, -11, 33, 7, -11, wdX); fill(v, -34, 6, 10, 33, 7, 10, wdX);
      for (const x of [-34, 33]) fill(v, x, 6, -10, x, 7, 9, wdX);
      fill(v, -35, 27, -12, 34, 30, -12, wdX); fill(v, -35, 27, 11, 34, 30, 11, wdX);
      // slatted seat
      for (let k = 0; k < 4; k++) fill(v, -38, 31, -14 + k * 7, 37, 33, -14 + k * 7 + 5, (x, y, z) => wdX(x, y, z + k * 5));
      v.paint(() => v.shape(-38, 33, -14, 37, 33, 14, (x, y, z) => x === -38 || x === 37, shade(0xa8784a, 0.85)));
      // red zabuton cushion with a centre tuft and corner tassels
      zabuton(v, -18, 34, 0, 16, 13, 4, 0xd0342a, 2);
      v.box(-19, 38, 0, -17, 38, 0, gloss(0x8a1a16)); v.box(-18, 38, -1, -18, 38, 1, gloss(0x8a1a16)); v.set(-18, 39, 0, gloss(0xf2c14e));
      tassels(v, -18, 36, 0, 16, 13);
      // round tray with yunomi tea cup + dango
      v.cylinder(20, 34, 0, 8, 1, gloss(0x5a2a1e));
      v.tube(20, 35, 0, 8, 7, 1, gloss(0x6a3424));
      v.cylinder(17, 35, -2, 3, 6, (x, y, z) => gloss(y === 40 ? 0xe8e0c8 : y >= 38 ? 0x7a9a5a : 0x5a7a48));
      v.cylinder(17, 41, -2, 2.2, 1, gloss(0x9ab84a)); // tea surface
      v.paint(() => v.shape(13, 36, -6, 21, 39, 2, (x, y, z) => (x + y) % 3 === 0 && y === 37, gloss(0xe8e0c8)));
      v.cylinder(22, 35, 3, 3, 1, gloss(0xf4f0e6)); // plate
      rod(v, 19, 36, 3, 27, 37, 3, 0xd8c08a);
      [[20, 0xff9fae], [22, 0xfbf8f2], [24, 0x8fc85a]].forEach(([x, c]) => v.sphere(x, 37, 3, 1.1, gloss(c)));
      grime(v, 0, 6, 0.8);
    },
  },

  // ------------------------------------------------------------- pink public phone
  pink_phone: {
    name: 'Pink Public Phone', jp: 'ピンク電話', voxel: 0.01,
    footprint: [0.5, 0.5], beauty: 4, themes: ['retro', 'city'],
    build(v) {
      const wdY = wood(0x7a4a2a, 'y', 3, 0.07), wdX = wood(0x8a5632, 'x', 4, 0.07);
      const pink = (x, y, z) => gloss(shade(0xf29ab0, 0.97 + hash(x >> 1, y >> 1, z >> 1, 2) * 0.04));
      // small telephone table
      for (const x of [-17, 14]) for (const z of [-14, 11]) fill(v, x, 0, z, x + 2, 66, z + 2, wdY);
      fill(v, -18, 67, -15, 17, 69, 14, (x, y, z) => gloss(wdX(x, y, z)));
      fill(v, -16, 58, -13, 15, 66, -13, wdX); fill(v, -16, 58, 13, 15, 66, 13, wdX);
      fill(v, -17, 58, -12, -17, 66, 12, wdX); fill(v, 16, 58, -12, 16, 66, 12, wdX);
      v.paint(() => v.shape(-14, 59, 13, 13, 65, 13, (x, y) => x === -14 || x === 13 || y === 59 || y === 65, shade(0x8a5632, 0.78)));
      v.box(-1, 62, 14, 0, 62, 14, metal(0xd4a94a));
      fill(v, -16, 14, -13, 15, 15, 12, wdX); // lower shelf
      // thick phone book
      fill(v, -12, 16, -9, 10, 22, 9, (x, y, z) => (y === 16 || y === 22 || x === -12 ? gloss(0xf2d24a) : 0xf2ede0));
      v.paint(() => v.shape(-12, 17, -9, 10, 21, 9, (x, y) => y === 19 && x > -12, 0xe0d8c4));
      v.project(['#.#.#', '#####'], { '#': 0x2a52a8 }, -6, 22, '+y');
      // white lace doily
      v.shape(-14, 70, -13, 13, 70, 12, (x, y, z) => {
        const d = Math.hypot(x + 0.5, z + 0.5), a = Math.atan2(z + 0.5, x + 0.5);
        return d <= 12.5 + Math.cos(a * 12) * 0.9;
      }, (x, y, z) => ((x * 3 + z * 5) % 7 === 0 ? 0xe4ddd0 : 0xfbf8f2));
      // phone body: chunky box, front-top edge chamfered, darker plinth
      const pinkD = gloss(0xd87890);
      v.shape(-11, 71, -9, 10, 91, 9, (x, y, z) => {
        if (z > 9 - Math.max(0, y - 87) * 1.4) return false;
        const ex = Math.max(0, Math.abs(x + 0.5) - 9.5), ez = Math.max(0, Math.abs(z) - 7.8);
        return ex * ex + ez * ez <= 1.6;
      }, pink);
      v.paint(() => v.box(-11, 71, -9, 10, 72, 9, pinkD));
      // rotary dial: white number plate + clear finger wheel with ten holes
      const DX = -0.5, DY = 81.5;
      v.shape(-7, 75, 10, 6, 88, 10, (x, y) => Math.hypot(x - DX, y - DY) <= 6.2, gloss(0xfbf8f2));
      v.shape(-7, 75, 11, 6, 88, 11, (x, y) => { const d = Math.hypot(x - DX, y - DY); return d <= 5.6 && d > 2.4; }, glass(0xf2f6f6));
      for (let i = 0; i < 10; i++) {
        const a = ((60 + i * 28) / 180) * Math.PI;
        v.set(R(DX + Math.cos(a) * 4.1), R(DY + Math.sin(a) * 4.1), 11, gloss(0x3a2a2e));
      }
      v.shape(-3, 79, 11, 2, 84, 11, (x, y) => Math.hypot(x - DX, y - DY) <= 2.4, gloss(0xf2a8bc));
      v.box(-1, 81, 12, 0, 82, 12, gloss(0xfbf8f2));
      v.box(5, 77, 11, 5, 78, 12, gloss(0xd8dce2)); // finger stop
      // coin return (left) + "10" price label (right) under the dial
      v.box(-10, 72, 9, -6, 75, 10, gloss(0xc8ccd2)); v.box(-9, 73, 10, -7, 74, 10, 0x1a1414);
      fill(v, 2, 72, 10, 9, 77, 10, gloss(0xfbf8f2));
      stamp(v, glyphRows('10'), { '#': 0xd82a24 }, 2, 77, 10);
      // coin slot on top, behind the cradle
      v.box(2, 92, -8, 8, 92, -5, gloss(0xc8ccd2)); v.box(3, 92, -7, 7, 92, -6, 0x1a1414);
      // cradle prongs + handset lying across the top
      for (const x of [-8, 4]) v.box(x, 92, -1, x + 1, 93, 1, pinkD);
      v.box(-12, 94, -1, 8, 95, 1, pink); // handle
      for (const [x0, x1] of [[-14, -8], [4, 10]]) {
        v.shape(x0, 92, -3, x1, 96, 3, (x, y, z) => ((x - (x0 + x1) / 2) / 3.6) ** 2 + ((y - 94) / 2.4) ** 2 + (z / 3.4) ** 2 <= 1, pink);
      }
      v.paint(() => { v.box(-14, 92, -3, -8, 92, 3, pinkD); v.box(4, 92, -3, 10, 92, 3, pinkD); });
      // curly cord from the handset down into the body side
      for (let y = 76; y <= 92; y++) v.set(-12 - (y % 2), y, 3 + (y % 4 === 0 ? 1 : 0), gloss(y % 2 ? 0xe88aa2 : 0xf2a8bc));
      grime(v, 0, 4, 0.82);
    },
  },

  // ------------------------------------------------------------- shaved-ice banner flag
  kakigori_flag: {
    name: 'Shaved Ice Flag', jp: 'かき氷の旗', voxel: 0.015,
    footprint: [0.5, 0.5], beauty: 3, themes: ['food', 'retro'],
    build(v) {
      const PX = -12;
      // weighted base (water tank) + pole + top arm
      v.cylinder(PX, 0, 0, 7.5, 2, gloss(0x2e5a3c));
      v.cylinder(PX, 2, 0, 6.6, 3, gloss(0x3a6e4a));
      v.cylinder(PX, 5, 0, 3, 2, gloss(0x2e5a3c));
      v.box(PX - 2, 4, 5, PX + 2, 4, 6, gloss(0xe8e4d8)); // fill cap
      for (let y = 7; y <= 101; y++) v.set(PX, y, 0, metal(y % 12 === 0 ? 0x9aa0a8 : 0xc8ccd2));
      v.box(PX, 98, 0, 13, 98, 0, metal(0xc8ccd2));
      v.set(PX, 102, 0, gloss(0xe5383b)); v.set(13, 98, 0, gloss(0xe5383b));
      // cloth
      const ice = strokeRows(20, 22, [
        [[3, 2], [6, 5]],
        [[2, 8], [8, 8], [1, 19]],
        [[11, 0], [11, 20], [8, 17]],
        [[12, 11], [17, 6]],
        [[12, 12], [15, 15], [19, 20]],
      ]);
      const W0 = -11, W1 = 12, Y0 = 52, Y1 = 97;
      for (let x = W0; x <= W1; x++) {
        const zw = R(Math.sin((x - W0) * 0.32) * 1.3);
        for (let y = Y0; y <= Y1; y++) {
          const gx = x - W0, gy = Y1 - y;
          let c = 0xfbf8f2;
          const wave = Y0 + 7 + Math.sin(gx * 0.55) * 1.6;
          if (y <= wave) c = 0x2f6fd6;
          if (Math.abs(y - wave) < 0.8 || (y < wave - 3 && Math.abs(y - (wave - 4) - Math.sin(gx * 0.55 + 2) * 1.2) < 0.6)) c = 0xfbf8f2;
          if (gy <= 1) c = 0xe5383b; // top hem
          const ix = gx - 3, iy = gy - 13;
          if (ix >= 0 && iy >= 0 && iy < ice.length && ix < 20 && ice[iy][ix] === '#') c = 0xe0282a;
          if (gx === 0) c = 0xf0ece0; // pole sleeve seam
          v.set(x, y, zw, c);
        }
      }
      for (let x = W0 + 2; x <= W1; x += 5) v.set(x, 97, R(Math.sin((x - W0) * 0.32) * 1.3), metal(0xd8dce2)); // rings
    },
  },

  // ------------------------------------------------------------- Shigaraki tanuki
  tanuki_statue: {
    name: 'Shigaraki Tanuki', jp: '信楽焼のたぬき', voxel: 0.01,
    footprint: [0.5, 0.5], beauty: 4, themes: ['shrine', 'retro', 'cute'],
    build(v) {
      const brown = (x, y, z) => gloss(shade(0x6e4a2c, 0.9 + vnoise(x, y, z, 4, 1) * 0.16));
      const dark = (x, y, z) => gloss(shade(0x3e2818, 0.92 + vnoise(x, y, z, 3, 2) * 0.12));
      const belly = (x, y, z) => gloss(shade(0xe8d0a0, 0.95 + vnoise(x, y, z, 5, 3) * 0.08));
      // base slab
      v.cylinder(0, 0, 0, 15, 2, gloss(0x5a4a3c));
      // tail, feet, body, belly
      v.ellipsoid(0, 9, -12, 7, 8, 5, dark);
      for (const s of [-1, 1]) v.ellipsoid(s * 7, 4, 6, 4, 2.5, 5, dark);
      v.ellipsoid(0, 20, -1, 14, 16, 12, brown);
      v.ellipsoid(0, 17, 3, 13.5, 13, 11.5, belly);
      v.paint(() => v.ellipsoid(0, 22, -3, 15, 18, 11, brown)); // back stays brown
      v.paint(() => v.ellipsoid(0, 18, 12, 2, 2, 2, gloss(0xc8a878))); // navel
      // arms holding flask (left, -x) and ledger (right, +x)
      v.line(-12, 27, 2, -15, 18, 6, dark, 3);
      v.line(12, 27, 2, 14, 19, 8, dark, 3);
      // sake flask (tokkuri) hanging from the left hand
      v.ellipsoid(-16, 9, 6, 4.5, 6, 4.5, gloss(0xe8dcc0));
      v.cylinder(-16, 14, 6, 2, 3, gloss(0xe8dcc0));
      v.cylinder(-16, 17, 6, 2.5, 1, gloss(0xd8ccb0));
      rod(v, -16, 18, 6, -15, 20, 6, 0x8a6a3a);
      v.project(['.#.#.', '.#.#.', '#...#', '#...#'], { '#': gloss(0x2a1a12) }, -18, 12, '+z');
      // ledger book (tsūchō) in the right hand
      v.box(13, 12, 7, 19, 21, 10, gloss(0xf2ead2));
      v.box(13, 12, 10, 19, 21, 10, gloss(0xe8ddc0));
      v.box(13, 12, 10, 13, 21, 10, gloss(0x2a1a12));
      v.project(['#.###', '..#.#', '#.###', '..###', '#.#.#', '.#...', '#.###'], { '#': gloss(0x2a1a12) }, 14, 20, '+z'); // 通
      // head
      v.ellipsoid(0, 41, 1, 10.5, 9.5, 9.5, brown);
      v.ellipsoid(0, 38, 8, 5, 3.5, 3.5, belly); // muzzle
      v.ellipsoid(0, 39.5, 11.3, 1.6, 1.2, 1.2, gloss(0x1a1210)); // nose
      for (const s of [-1, 1]) {
        v.paint(() => v.ellipsoid(s * 5, 42, 8, 3.6, 3, 3, dark)); // eye mask
        v.ellipsoid(s * 7.5, 49, -1, 2.5, 3, 2, dark); // ears
      }
      v.project(['.WWW.......WWW.', 'WWKKW.....WKKWW', 'WKKWW.....WWKKW', '.WWW.......WWW.'], { W: gloss(0xfbf8f2), K: gloss(0x1a1210) }, -7, 44, '+z');
      v.project(['K.....K', '.KK.KK.'], { K: gloss(0x3a1a12) }, -3, 36, '+z');
      // straw kasa hat tipped back
      for (let i = 0; i < 6; i++) {
        const r = 13 - i * 2.1;
        v.cylinder(0, 47 + i, -4 + i * 0.4, r, 1, (x, y, z) => gloss(shade(0xd8b468, ((x * x + z * z) % 7 < 2 ? 0.88 : 1) * (1 - i * 0.02))));
      }
      v.paint(() => v.cylinder(0, 47, -4, 13, 1, gloss(0xb89048)));
    },
  },

  // ------------------------------------------------------------- chalk A-frame sign
  sign_stand: {
    name: 'Chalk Menu Board', jp: '立て看板', voxel: 0.008,
    footprint: [0.5, 0.5], beauty: 2, themes: ['retro', 'city'],
    build(v) {
      const wd = wood(0x9a6a3c, 'y', 2, 0.07);
      const H = 100, X0 = -28, X1 = 27;
      const zf = (y) => 22 - y * 0.2; // front board leans back
      for (let y = 0; y <= H; y++) {
        const z = R(zf(y));
        for (let x = X0; x <= X1; x++) {
          const frame = x <= X0 + 3 || x >= X1 - 3 || y <= 12 || y >= H - 4;
          const legCut = y < 12 && x > X0 + 3 && x < X1 - 3;
          if (legCut) continue;
          const c = frame ? wd(x, y, z) : 0x2c3a32;
          v.set(x, y, z, c); v.set(x, y, z - 1, c);
          // back board (mirror)
          v.set(x, y, -z, frame ? wd(x, y, -z) : 0x2c3a32); v.set(x, y, -z + 1, frame ? wd(x, y, -z) : 0x2c3a32);
        }
      }
      // hinges + spreader chain
      for (const x of [X0 + 1, X1 - 1]) { v.box(x, H - 1, -2, x + (x < 0 ? 1 : -1), H + 1, 2, metal(0x8a8a88)); }
      for (let z = -12; z <= 12; z += 2) v.set(X0 + 1, 40, z, metal(0xa8a8a8));
      // chalk menu on the front board
      const chalk = 0xf4f2ea, yel = 0xffe27a, pinkc = 0xff9fb8, blue = 0x9fd8ff;
      const ch = (str, x, y, col) => ptext(v, str, x, y, col);
      ch('メニュー', -15, 92, yel);
      v.project(['#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#'], { '#': yel }, -15, 83, '+z');
      ch('ラムネ', -22, 78, chalk); ch('50', 13, 76, chalk);
      ch('くじ', -22, 67, chalk); ch('20', 13, 65, chalk);
      ch('ガチャ', -22, 56, pinkc); ch('100', 9, 54, pinkc);
      ch('アイス', -22, 45, blue); ch('60', 13, 43, blue);
      // doodles: capsule + stars
      v.project([
        '...####...', '..#RRRR#..', '.#RRRRRR#.', '#RRRRRRRR#', '##########', '#........#', '.#......#.', '..#....#..', '...####...',
      ], { '#': chalk, R: pinkc }, -8, 32, '+z');
      v.project(['..#..', '#####', '.###.', '.#.#.'], { '#': yel }, -20, 28, '+z');
      v.project(['..#..', '#####', '.###.', '.#.#.'], { '#': yel }, 12, 30, '+z');
      // chalk ledge with a chalk stick
      for (let x = X0 + 4; x <= X1 - 4; x++) { v.set(x, 13, R(zf(13)) + 1, wd(x, 13, 0)); }
      v.set(4, 14, R(zf(14)) + 1, chalk); v.set(5, 14, R(zf(14)) + 1, chalk);
      // back board: rough "OPEN" style scribble + capsule
      v.project(['.###.', '#...#', '#...#', '.###.'], { '#': chalk }, -2, 70, '-z');
      ptext(v, 'ガチャ', -12, 60, yel, { dir: '-z' });
    },
  },

  // ------------------------------------------------------------- morning glory pots
  asagao_pot: {
    name: 'Morning Glory Pots', jp: '朝顔の鉢', voxel: 0.01,
    footprint: [0.5, 0.5], beauty: 4, themes: ['nature', 'retro'],
    build(v) {
      const pot = (cx, cz, r, h, col) => {
        for (let y = 0; y < h; y++) v.cylinder(cx, y, cz, r * (0.78 + 0.22 * y / (h - 1)), 1, (x, yy) => gloss(yy >= h - 2 ? 0xf2efe6 : shade(col, 0.88 + (yy / h) * 0.18)));
        v.cylinder(cx, h - 1, cz, r - 1.4, 1, 0x4a3020);
        v.paint(() => v.cylinder(cx, 3, cz, r, 1, gloss(0xf2efe6)));
      };
      const bamboo = (y) => (y % 14 === 0 ? 0x9a9050 : 0xc8bc78);
      const FL = [[0x3a52d0, 0x8aa0ff], [0x8a3ad0, 0xc898ff], [0xe0407e, 0xffa0c4], [0x2a7ad8, 0x9ad0ff], [0xb03aa8, 0xf0a0e8]];
      // trumpet flower facing outward (nx, nz) — flat disc in the tangent plane, star throat
      const flower = (fx, fy, fz, nx, nz, k, r = 3.4) => {
        const [c1, c2] = FL[k % FL.length];
        const tx = -nz, tz = nx;
        for (let u = -r; u <= r; u += 0.45) for (let w = -r; w <= r; w += 0.45) {
          const d = Math.hypot(u, w);
          if (d > r) continue;
          const a = Math.atan2(w, u), star = Math.abs(Math.cos(a * 2.5)) > 0.93 && d > 1;
          const col = d < 0.9 ? 0xfdfcf4 : star ? 0xf4e8fa : d < r * 0.55 ? c2 : c1;
          v.set(fx + tx * u + nx * d * 0.15, fy + w, fz + tz * u + nz * d * 0.15, gloss(col));
        }
        v.set(fx - nx, fy, fz - nz, 0xe8f0d8); v.set(fx - 2 * nx, fy - 1, fz - 2 * nz, 0x6aaa4a);
      };
      const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
      const leaf = (lx, ly, lz, nx, nz, s) => {
        const tx = -nz, tz = nx, tilt = (hash(s, 1, 9) - 0.5) * 0.8;
        HEART.forEach((row, j) => [...row].forEach((ch, i) => {
          if (ch !== '#') return;
          const u = i - 3, w = 3 - j + u * tilt;
          v.set(lx + tx * u + nx * Math.abs(u) * 0.25, ly + w, lz + tz * u + nz * Math.abs(u) * 0.25, i === 3 ? 0x7cc05a : hash(i, j, s) < 0.5 ? 0x4a9a3a : 0x3e8a32);
        }));
      };
      // big indigo pot with an andon trellis
      const cx = -5, cz = -1;
      pot(cx, cz, 10.5, 14, 0x2a4a9a);
      for (const [dx, dz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) for (let y = 12; y <= 72; y++) v.set(cx + dx, y, cz + dz, bamboo(y));
      for (const y of [36, 54, 72]) v.torus(cx, y, cz, 10, 0.4, gloss(0x4a8a4a), 'y');
      // vine spiralling up the rings, heart leaves and flowers
      let fk = 0, li = 0;
      for (let t = 0; t <= 1; t += 0.0025) {
        const a = t * TAU * 3.2 + 0.6, y = 14 + t * 60, r = 10;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        v.set(x, y, z, 0x3a7a2a);
        const step = Math.round(t * 400);
        if (step % 11 === 0 && step > 0) {
          const side = li++ % 2 ? 1 : -1;
          leaf(R(x + Math.cos(a) * 2), R(y + side * 1.5), R(z + Math.sin(a) * 2), Math.cos(a), Math.sin(a), step);
        }
        if (step % 31 === 17) flower(R(x + Math.cos(a) * 3.5), R(y + 2), R(z + Math.sin(a) * 3.5), Math.cos(a), Math.sin(a), fk++);
        if (step % 31 === 4) { // twisted bud
          const bx = R(x + Math.cos(a) * 2), bz = R(z + Math.sin(a) * 2);
          v.set(bx, R(y) + 1, bz, gloss(FL[fk % FL.length][0])); v.set(bx, R(y) + 2, bz, gloss(FL[fk % FL.length][1]));
        }
      }
      for (let k = 0; k < 8; k++) v.set(cx + 7 + (k > 4 ? 1 : 0), 73 + k, cz + 7 - (k % 3 === 0 ? 1 : 0), 0x4a8a34); // tendril above the top ring
      // second small terracotta pot with a single stake
      const sx = 14, sz = 9;
      pot(sx, sz, 6, 10, 0xc86a3a);
      for (let y = 8; y <= 42; y++) v.set(sx, y, sz, bamboo(y + 3));
      for (let t = 0; t <= 1; t += 0.008) {
        const a = t * TAU * 4, y = 10 + t * 31;
        v.set(sx + R(Math.cos(a) * 1.4), y, sz + R(Math.sin(a) * 1.4), 0x3a7a2a);
      }
      leaf(sx + 3, 18, sz + 1, 0.9, 0.3, 3); leaf(sx - 3, 25, sz + 1, -0.9, 0.3, 4); leaf(sx + 2, 32, sz + 2, 0.6, 0.8, 5);
      flower(sx + 1, 40, sz + 4, 0.3, 0.95, 2, 3);
      flower(sx - 3, 30, sz + 3, -0.6, 0.8, 4, 3);
    },
  },

  // ------------------------------------------------------------- twin old gacha machines
  gacha_twin: {
    name: 'Twin Retro Gacha', jp: '昭和のガチャガチャ', voxel: 0.0125,
    footprint: [1, 0.5], beauty: 5, themes: ['retro', 'cute'],
    build(v) {
      const wdY = wood(0x8a5a32, 'y', 2, 0.07), wdX = wood(0x9a6a3c, 'x', 3, 0.07);
      // wooden stand (beer-crate style table)
      for (const x of [-36, 33]) for (const z of [-16, 13]) fill(v, x, 0, z, x + 2, 29, z + 2, wdY);
      fill(v, -37, 30, -17, 36, 32, 16, wdX);
      fill(v, -35, 6, -15, 34, 7, 14, wdX);
      fill(v, -35, 22, 15, 34, 29, 15, wdX);
      fill(v, -22, 23, 16, 21, 28, 16, 0xfbf8f2);
      ptext(v, 'ガチャ', -12, 28, 0xe5383b);
      v.project(['#', '.', '#'], { '#': 0xe5383b }, 11, 27, '+z');
      // --- machine A (left): square red cabinet + window box
      const A = -18;
      const red = (x, y, z) => gloss(shade(0xd8322c, 0.95 + hash(x >> 1, y >> 1, z >> 1, 3) * 0.06));
      fill(v, A - 11, 33, -11, A + 11, 56, 11, red);
      fill(v, A - 12, 56, -12, A + 12, 57, 12, gloss(0xc8ccd2));
      v.box(A - 11, 58, -11, A + 11, 75, 11, glass(0xe4f2f4));
      v.box(A - 10, 58, -10, A + 10, 75, 10, null);
      for (const [dx, dz] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) v.box(A + dx, 58, dz, A + dx, 75, dz, gloss(0xc8ccd2));
      for (let y = 59; y <= 70; y += 3) for (let x = A - 9; x <= A + 9; x += 3) for (let z = -9; z <= 9; z += 3) {
        if (y > 66 + hash(x, 0, z, 4) * 3) continue;
        capsule(v, x + ((y / 3) % 2 ? 1 : 0), y, z, 1.4, pick(CAPS, hash(x, y, z, 5)));
      }
      fill(v, A - 12, 76, -12, A + 12, 78, 12, red);
      fill(v, A - 6, 79, -6, A + 6, 79, 6, red);
      // price label, coin mech plate with crank, capsule chute
      fill(v, A - 8, 49, 12, A + 8, 55, 12, gloss(0xfbf8f2));
      stamp(v, glyphRows('20円'), { '#': 0xd8322c }, A - 6, 54, 12);
      fill(v, A - 6, 39, 12, A + 6, 47, 12, gloss(0xd0d4da));
      v.box(A - 1, 46, 13, A + 1, 46, 13, gloss(0x9aa0a8)); v.set(A, 46, 13, 0x1a1a1a); // coin slot
      v.cylinder(A, 42, 12, 3, 2, gloss(0xe8ecf0), 'z');
      v.box(A - 3, 42, 14, A + 3, 42, 15, gloss(0xb8bcc2)); v.set(A + 3, 43, 15, gloss(0xe5383b));
      v.box(A - 5, 34, 12, A + 5, 37, 13, gloss(0xb8bcc2));
      v.box(A - 4, 35, 13, A + 4, 36, 13, 0x1a1a1a);
      // --- machine B (right): yellow pedestal + clear globe
      const B = 18;
      const yel = (x, y, z) => gloss(shade(0xf2c230, 0.95 + hash(x >> 1, y >> 1, z >> 1, 6) * 0.06));
      fill(v, B - 9, 33, -9, B + 9, 52, 9, yel);
      v.cylinder(B, 53, 0, 10, 2, gloss(0xc8ccd2));
      v.shape(B - 11, 55, -11, B + 11, 76, 11, (x, y, z) => { const d = Math.hypot(x - B, y - 65, z); return d <= 10.5 && d > 9.4; }, glass(0xe4f2f4));
      for (let y = 57; y <= 70; y += 3) for (let x = B - 8; x <= B + 8; x += 3) for (let z = -8; z <= 8; z += 3) {
        if (Math.hypot(x - B, y - 65, z) > 7.8 || y > 68 + hash(x, 0, z, 7) * 2) continue;
        capsule(v, x, y, z, 1.4, pick(CAPS, hash(x, y, z, 8)));
      }
      v.cylinder(B, 75, 0, 4, 2, gloss(0xd8dce2)); v.set(B, 77, 0, gloss(0xe5383b));
      fill(v, B - 7, 46, 10, B + 7, 52, 10, gloss(0xfbf8f2));
      stamp(v, glyphRows('10円'), { '#': 0x2a52a8 }, B - 6, 51, 10);
      fill(v, B - 6, 38, 10, B + 6, 45, 10, gloss(0xd0d4da));
      v.box(B - 1, 44, 11, B + 1, 44, 11, gloss(0x9aa0a8)); v.set(B, 44, 11, 0x1a1a1a);
      v.cylinder(B, 41, 10, 2.6, 2, gloss(0x2f6fd6), 'z');
      v.box(B - 3, 41, 12, B + 3, 41, 13, gloss(0x2a52a8));
      v.box(B - 4, 34, 10, B + 4, 37, 11, gloss(0xb8bcc2));
      v.box(B - 3, 35, 11, B + 3, 36, 11, 0x1a1a1a);
      v.paint(() => v.box(B - 9, 33, -9, B + 9, 33, 9, gloss(0xc89a20)));
      grime(v, 0, 6, 0.8);
    },
  },

  // ------------------------------------------------------------- big maneki-neko
  lucky_cat_big: {
    name: 'Big Lucky Cat', jp: '大きな招き猫', voxel: 0.01,
    footprint: [0.5, 0.5], beauty: 5, themes: ['shrine', 'cute', 'retro'],
    build(v) {
      const W = (x, y, z) => gloss(shade(0xfbf8f0, 0.97 + hash(x >> 1, y >> 1, z >> 1, 1) * 0.03));
      // body + haunches, cut flat where they sink into the cushion
      v.ellipsoid(-0.5, 18, -1, 13, 12, 11, W);
      for (const s of [-1, 1]) v.ellipsoid(-0.5 + s * 8, 11, 2, 6, 5, 8, W);
      v.box(-16, 0, -16, 15, 6, 15, null);
      // purple zabuton with gold tassels
      zabuton(v, -0.5, 0, -0.5, 21.5, 21.5, 7, 0x8a2a7e, 2);
      tassels(v, -0.5, 3, -0.5, 21.5, 21.5);
      // head
      v.ellipsoid(-0.5, 37, 0.5, 13, 11, 10.5, W);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 6; i++) { const w = 4.6 - i * 0.8; v.box(R(-0.5 + s * 8 - w / 2), 45 + i, -3, R(-0.5 + s * 8 + w / 2), 45 + i, 1, W); }
        v.box(R(-0.5 + s * 8) - 1, 46, 2, R(-0.5 + s * 8), 48, 2, gloss(0xf4a0a8));
      }
      // calico patches
      v.paint(() => {
        v.ellipsoid(6, 44, -1, 6, 4, 8, gloss(0xe8963a)); v.ellipsoid(-9, 40, -6, 4, 4, 5, gloss(0x2e2a28));
        v.ellipsoid(8, 18, -9, 6, 7, 5, gloss(0xe8963a)); v.ellipsoid(-7, 22, -10, 4, 4, 3, gloss(0x2e2a28));
      });
      // face
      v.project(['.KK.......KK.', 'K..K.....K..K'], { K: C.ink }, -7, 38, '+z');
      v.project(['.P.', 'PPP'], { P: 0xf07a8a }, -2, 35, '+z');
      v.project(['K..K..K', '.KK.KK.'], { K: C.ink }, -4, 33, '+z');
      v.project(['PPP.........PPP'], { P: 0xffb0bc }, -8, 34, '+z');
      v.project(['KKK...........KKK', '.................', 'KKK...........KKK'], { K: 0x7a7070 }, -9, 35, '+z');
      // red collar, gold bell, red bib with gold 福 mark
      v.paint(() => v.shape(-15, 26, -13, 14, 27, 13, () => true, gloss(0xd8242a)));
      v.shape(-14, 25, -12, 13, 28, 12, (x, y, z) => ((x + 0.5) / 13.6) ** 2 + (z / 11.6) ** 2 <= 1 && ((x + 0.5) / 12.4) ** 2 + (z / 10.4) ** 2 > 1 && (y === 26 || y === 27), gloss(0xd8242a));
      v.sphere(-0.5, 24, 11, 2.2, gloss(0xf2c14e)); v.set(0, 22, 13, C.ink);
      v.shape(-8, 13, 6, 7, 24, 13, (x, y, z) => {
        const half = 7 - (24 - y) * 0.3;
        const zz = 9.6 - ((y - 18) ** 2) * 0.02 - ((x + 0.5) ** 2) * 0.03;
        return Math.abs(x + 0.5) <= half && Math.abs(z - zz) < 0.8 && y < 25;
      }, gloss(0xd8242a));
      // raised left paw (-x) and koban coin held by the other
      v.line(-9, 22, 3, -14, 37, 6, W, 2.6);
      v.ellipsoid(-15, 41, 6, 3.6, 4, 3, W);
      v.project(['.P.', 'P.P'], { P: 0xf4a0a8 }, -16, 42, '+z');
      v.ellipsoid(5, 15, 10.5, 5, 7, 1.2, gloss(0xf2c14e));
      v.project(['.KKK.', '.....', '..K..', '.KKK.', '..K..', '.....', '.KKK.'], { K: gloss(0xb8862a) }, 3, 19, '+z');
      v.ellipsoid(8, 19, 9, 3, 3, 3, W);
    },
  },
};

export default shop;
