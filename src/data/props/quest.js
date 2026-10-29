// Quest props — the little things of the opening chores: Grandpa's notebook and key, shop supplies
// (milk, batteries, tool kit, fluorescent tube, flyers), the messes to clean up, the stray cat's bowl and bed,
// and the chunky gear used as the 3D settings button.
// Each entry: { name, voxel (metres per voxel), build(v) }. Facing +z, bottom-centre origin (menu_gear: centred).
// Deterministic (hashed noise only). Small hand items use tiny voxels so they keep their detail.
import { shade, mix } from '../../voxel/palette.js';
import { VoxelModel, gloss, metal, glass, decColor } from '../../voxel/VoxelModel.js';
import { hash, vnoise, fill, grime, dust, speckle, blotch, edgeWear, path, text } from './garage.js';

// ------------------------------------------------------------------ helpers
const R = Math.round;
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pick = (arr, t) => arr[Math.min(arr.length - 1, Math.floor(t * arr.length))];

/** Copy `src` into `v` rotated (Euler y·x·z, radians) and scaled, then moved by (dx,dy,dz). Inverse sampled, no holes. */
function put(v, src, { dx = 0, dy = 0, dz = 0, rx = 0, ry = 0, rz = 0, s = 1 } = {}) {
  const b = src.bounds();
  const [cx, sx] = [Math.cos(rx), Math.sin(rx)], [cy, sy] = [Math.cos(ry), Math.sin(ry)], [cz, sz] = [Math.cos(rz), Math.sin(rz)];
  const fwd = (x, y, z) => {
    let X = x * cz - y * sz, Y = x * sz + y * cz, Z = z; // z
    [Y, Z] = [Y * cx - Z * sx, Y * sx + Z * cx]; // x
    [X, Z] = [X * cy + Z * sy, -X * sy + Z * cy]; // y
    return [X * s, Y * s, Z * s];
  };
  const inv = (X, Y, Z) => {
    X /= s; Y /= s; Z /= s;
    [X, Z] = [X * cy - Z * sy, X * sy + Z * cy];
    [Y, Z] = [Y * cx + Z * sx, -Y * sx + Z * cx];
    return [X * cz + Y * sz, -X * sz + Y * cz, Z];
  };
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const px of [b.minX - 1, b.maxX + 1]) for (const py of [b.minY - 1, b.maxY + 1]) for (const pz of [b.minZ - 1, b.maxZ + 1]) {
    const [X, Y, Z] = fwd(px, py, pz);
    x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); z0 = Math.min(z0, Z); z1 = Math.max(z1, Z);
  }
  for (let X = Math.floor(x0); X <= Math.ceil(x1); X++) for (let Y = Math.floor(y0); Y <= Math.ceil(y1); Y++) for (let Z = Math.floor(z0); Z <= Math.ceil(z1); Z++) {
    const [x, y, z] = inv(X, Y, Z);
    const val = src.get(R(x), R(y), R(z));
    if (val !== null) v.set(dx + X, dy + Y, dz + Z, val);
  }
  return v;
}

/** Like put(), but then lets the part fall straight down until it rests on the floor (y = 0) or on what is already there. */
function drop(v, src, opts = {}) {
  const tmp = put(new VoxelModel(), src, { ...opts, dy: 0 });
  const low = new Map();
  tmp.forEach((x, y, z) => { const k = x * 4096 + z; if (!low.has(k) || low.get(k) > y) low.set(k, y); });
  let dy = -tmp.bounds().minY;
  v.forEach((x, y, z) => { const l = low.get(x * 4096 + z); if (l !== undefined) dy = Math.max(dy, y + 1 - l); });
  v.merge(tmp, 0, dy + (opts.dy || 0), 0);
  return dy;
}

/** hollowBox that accepts a colour function (wall thickness t, open faces list). */
function shell(v, x0, y0, z0, x1, y1, z1, c, t = 1, open = []) {
  return v.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => (x < x0 + t && !open.includes('left')) || (x > x1 - t && !open.includes('right')) ||
    (y < y0 + t && !open.includes('bottom')) || (y > y1 - t && !open.includes('top')) || (z < z0 + t && !open.includes('back')) || (z > z1 - t && !open.includes('front')), c);
}

// tiny pixel fonts: 3x5 latin/digits and 5x7 latin for signs
const F3 = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'], M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '.#.'], V: ['#.#', '#.#', '#.#', '.#.', '.#.'], W: ['#.#', '#.#', '#.#', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['..#', '.##', '#.#', '###', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'], '!': ['#', '#', '#', '.', '#'], '-': ['...', '...', '###', '...', '...'],
  ' ': ['.', '.', '.', '.', '.'],
};
const F5 = {
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'], F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'], D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'], ' ': ['..', '..', '..', '..', '..', '..', '..'],
};
/** Pixel rows for a string in a font (glyphs separated by `gap` columns). */
function fontRows(str, font = F3, gap = 1) {
  const gl = [...str].map((ch) => font[ch] || font[' ']);
  const h = gl[0].length;
  return Array.from({ length: h }, (_, r) => gl.map((g) => g[r]).join('.'.repeat(gap)));
}
/** Stamp rows onto a plane. plane 'xy' at z (rows go -y), 'xz' at y (rows go +z). Scale >1 enlarges pixels. */
function stampRows(v, rows, col, x0, y0, z0, plane = 'xy', scale = 1) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.') return;
    const cc = typeof col === 'function' ? col(ch) : col;
    if (cc === null || cc === undefined) return;
    for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) {
      if (plane === 'xy') v.set(x0 + c * scale + a, y0 - r * scale - b, z0, cc);
      else v.set(x0 + c * scale + a, y0, z0 + r * scale + b, cc);
    }
  }));
}

/** Tied, bulging city garbage bag: lumpy translucent plastic, contents showing through, printed logo, knotted ears. */
function garbageBag(v, { seed = 1, w = 25, d = 21, h = 46, print = 0x2f9a4a, tint = 0xe6ecea, lean = 0 } = {}) {
  v.jitter = 0.02;
  const CONTENT = [0xd8c890, 0xe8a8a0, 0xa8c8a0, 0xc8b8d8, 0xf0c070, 0x9ab0c8, 0xb89870, 0x7a9a80];
  const neckY = h - 6;
  const bag = new VoxelModel();
  // dark silhouettes of things pressed against the plastic (a bottle, a carton, a peel)
  const blobs = [[-w * 0.4, h * 0.3, 0x5a7a62, 7, 4], [w * 0.35, h * 0.45, 0x8a7a5a, 6, 6], [w * 0.1, h * 0.18, 0xd88a3a, 5, 3], [-w * 0.1, h * 0.6, 0x9a8aa8, 6, 4]];
  bag.shape(-w - 4, 0, -d - 4, w + 4, h + 2, d + 4, (x, y, z) => {
    const t = y / neckY;
    let k = t < 0.35 ? 0.88 + Math.sin(t / 0.35 * Math.PI / 2) * 0.12 : Math.cos((t - 0.35) / 0.65 * Math.PI / 2) ** 0.7;
    if (t >= 1) return false;
    k = Math.max(k, 0.1);
    const a = Math.atan2(z, x);
    const fold = Math.sin(a * 9 + seed) * 0.07 * clamp((t - 0.3) * 1.6, 0, 1);
    const lump = (vnoise(x, y, z, 6, seed) - 0.5) * 0.24;
    const e = (x / (w * k)) ** 2 + (z / (d * k)) ** 2;
    return e <= (1 + lump + fold) ** 2;
  }, (x, y, z) => {
    let c = tint;
    const n = vnoise(x, y, z, 3.2, seed + 5);
    if (n > 0.5) c = mix(c, CONTENT[Math.floor(hash(x >> 2, y >> 2, z >> 2, seed) * CONTENT.length)], 0.28 + (n - 0.5) * 0.9);
    for (const [bx, by, bc, rx, ry] of blobs) if (z > 0 && ((x - bx) / rx) ** 2 + ((y - by) / ry) ** 2 < 1) c = mix(c, bc, 0.42);
    const a = Math.atan2(z, x);
    if (y > h * 0.45 && Math.sin(a * 9 + seed) > 0.75) c = shade(c, 0.88); // gathered folds
    if (y > h * 0.45 && Math.sin(a * 9 + seed) < -0.92) c = mix(c, 0xffffff, 0.6); // shiny ridges
    if (y < 3) c = shade(c, 0.82);
    return gloss(c);
  });
  // printed city logo panel on the front (outline box, a symbol and 45L)
  const front = (x, y) => { for (let z = d + 4; z > -d; z--) if (bag.has(x, y, z)) return z; return null; };
  const paint = (x, y, c) => { const z = front(x, y); if (z !== null) bag.set(x, y, z, gloss(c)); };
  const by = R(h * 0.26);
  for (let x = -10; x <= 10; x++) { paint(x, by, print); paint(x, by + 8, print); }
  for (let y = by; y <= by + 8; y++) { paint(-10, y, print); paint(10, y, print); }
  fontRows('45L').forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') { paint(-1 + c, by + 6 - r, print); } }));
  ['.###.', '#.#.#', '#####', '#.#.#', '.###.'].forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') paint(-8 + c, by + 6 - r, print); }));
  // gathered neck, knot and two short ears
  const pl = (x, y, z, f = 1) => gloss(shade(tint, f * (0.9 + hash(x, y, z, seed) * 0.12)));
  for (let y = neckY - 2; y <= neckY + 2; y++) bag.cylinder(0, y, 0, 2.6 - (y - neckY) * 0.2, 1, (x, yy, z) => pl(x, yy, z, (x + z + yy) % 2 ? 0.92 : 1.02));
  bag.ellipsoid(0, neckY + 4, 0, 3.4, 2.4, 3.2, (x, y, z) => pl(x, y, z));
  for (const s of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const x = s * (2.5 + i * 1.1), y = neckY + 5 + i * 0.55 - (i > 4 ? (i - 4) * 0.8 : 0), z = Math.sin(i * 0.7 + seed + s) * 1.2;
      for (let j = -2; j <= 2; j++) bag.set(R(x), R(y), R(z + j), pl(x, y, z + j, Math.abs(j) === 2 ? 0.9 : 1.04));
    }
  }
  put(v, bag, { rz: lean });
}

/** Ceramic cat bowl with a painted fish motif; optionally filled with milk. */
function catBowl(v, milk) {
  v.jitter = 0.012;
  const H = 17;
  const ro = (y) => 15 + (y / H) * 7;
  const NAVY = 0x2a4a90;
  for (let y = 0; y <= H; y++) {
    const r = ro(y), ri = y < 4 ? -1 : r - 3;
    v.tube(0, y, 0, y === 0 ? r - 1.5 : r, y === 0 ? r - 3.5 : ri, 1, (x, yy, z) => {
      const d = Math.hypot(x, z);
      if (yy >= H - 1 && d > ro(yy) - 3.6) return gloss(0x2a5ab0); // blue glazed rim
      if (d < ro(yy) - 2) return gloss(0xfbf9f2); // inside
      const a = Math.atan2(x, z), u = ((a * ro(yy) % 21) + 21) % 21;
      const fy = yy - 9;
      const body = ((u - 9) / 6) ** 2 + (fy / 3.2) ** 2 < 1;
      const tail = u > 13.5 && u < 17 && Math.abs(fy) < (u - 13.5) * 0.9;
      if (body || tail) return gloss(Math.hypot(u - 5.5, fy - 0.8) < 0.9 ? 0xffffff : NAVY);
      if (yy === 3 && (R(u) % 4 < 2)) return gloss(0x3a6ac0);
      if ((yy === 13 && u > 1 && u < 2.2) || (yy === 14 && u > 2.4 && u < 3.4)) return gloss(0x6a8ad0); // bubbles
      return gloss(shade(0xf6f3ea, 0.97 + hash(x, yy, z, 2) * 0.04));
    });
  }
  // fish-bone motif painted on the inside floor
  v.paint(() => stampRows(v, ['.#.#.#.#..', '##########', '.#.#.#.#..'], gloss(0x5a7ac0), -5, 3, -1, 'xz'));
  v.paint(() => v.shape(-6, 3, -1, -6, 3, 1, () => true, gloss(0x5a7ac0)));
  if (milk) {
    for (let y = 4; y <= 13; y++) v.cylinder(0, y, 0, ro(y) - 3, 1, (x, yy, z) => {
      if (yy < 13) return gloss(0xf6f2e8);
      const d = Math.hypot(x, z);
      return gloss(d > ro(13) - 4.4 ? 0xfffdf8 : (Math.hypot(x + 5, z + 5) < 2.2 ? 0xffffff : 0xfaf6ec));
    });
    // a little drip on the rim and a splash on the floor
    v.set(14, 16, 17, gloss(0xfbf8f0)); v.set(14, 15, 18, gloss(0xfbf8f0));
    v.shape(17, 0, 13, 26, 0, 22, (x, y, z) => Math.hypot(x - 21.5, (z - 17.5) * 1.3) < 2.6 + vnoise(x, 0, z, 2, 3) * 1.6, gloss(0xfbf8f0));
  }
}

// shared colours
const INK = 0x2a2226;

// ------------------------------------------------------------------ props
const quest = {
  // ------------------------------------------------------------- Grandpa's notebook
  grandpa_notebook: {
    name: "Grandpa's Notebook", voxel: 0.004,
    build(v) {
      v.jitter = 0.02;
      const W = 18, L = 26; // half extents: 0.148 x 0.212 m
      const leather = (x, y, z) => {
        const n = vnoise(x, y, z, 3, 1), m = vnoise(x, y * 2, z, 7, 2);
        let c = mix(0x6e4528, 0x8a5a34, m);
        if (n > 0.7) c = shade(c, 0.88);
        if (hash(x, y, z, 3) < 0.06) c = shade(c, 1.12);
        // worn, lighter edges and corners
        const edge = Math.min(W - Math.abs(x), L - Math.abs(z));
        if (edge < 2 && hash(x, y, z, 4) < 0.55) c = mix(c, 0xb08a62, 0.45);
        if (Math.abs(x) > W - 5 && Math.abs(z) > L - 5 && hash(x, y, z, 5) < 0.5) c = mix(c, 0xa47a50, 0.5);
        return gloss(c);
      };
      const corner = (x, z, r = 2.2) => {
        const ax = Math.abs(x + 0.5) - (W - r), az = Math.abs(z + 0.5) - (L - r);
        return ax <= 0 || az <= 0 || ax * ax + az * az <= r * r;
      };
      // covers + page block (pages inset 1 on the three open sides)
      v.shape(-W, 0, -L, W - 1, 0, L - 1, (x, y, z) => corner(x, z), leather);
      v.shape(-W, 4, -L, W - 1, 4, L - 1, (x, y, z) => corner(x, z), leather);
      v.shape(-W + 1, 1, -L + 1, W - 2, 3, L - 2, (x, y, z) => corner(x, z, 1.6), (x, y, z) => {
        const side = x === W - 2 || Math.abs(z + 0.5) >= L - 2;
        const base = mix(0xf2e8cc, 0xe0cc9c, clamp((Math.abs(z) - 10) / 20, 0, 1) * 0.5 + hash(0, y, z >> 2, 7) * 0.2);
        return side ? shade(base, (y + z) % 2 ? 0.98 : 0.9) : base;
      });
      // rounded spine (leather wraps the left edge)
      for (let z = -L; z < L; z++) {
        if (!corner(-W, z)) continue;
        for (let y = 0; y <= 4; y++) v.set(-W - 1, y, z, leather(-W - 1, y, z));
        v.set(-W - 2, 2, z, leather(-W - 2, 2, z)); v.set(-W - 2, 1, z, leather(-W - 2, 1, z)); v.set(-W - 2, 3, z, leather(-W - 2, 3, z));
      }
      // spine ridges
      for (const z of [-L + 5, L - 6]) for (let y = 1; y <= 3; y++) v.set(-W - 3, y, z, gloss(0x5a3820));
      // stitched border on the front cover
      v.paint(() => v.shape(-W + 3, 4, -L + 3, W - 4, 4, L - 4, (x, y, z) => {
        const onX = (x === -W + 3 || x === W - 4) && z % 2 === 0, onZ = (z === -L + 3 || z === L - 4) && x % 2 === 0;
        return onX || onZ;
      }, gloss(0xd8b88a)));
      // pasted paper label with handwriting
      fill(v, -10, 5, -18, 3, 5, -9, (x, y, z) => (x === 3 || z === -9 ? 0xd8ccb0 : shade(0xf0e6cc, 0.96 + hash(x, y, z, 8) * 0.05)));
      for (const [z, n] of [[-16, 10], [-14, 7], [-11, 9]]) for (let i = 0; i < n; i++) if (hash(i, z, 0, 9) < 0.8) v.set(-8 + i, 5, z, 0x2e2a40);
      v.box(-8, 5, -13, -7, 5, -12, 0xc8302a); // a little red hanko stamp
      // elastic band wrapping lengthwise near the opening edge
      const band = (x, y, z) => gloss(x === 12 ? 0x3a3438 : 0x1c181a);
      for (let z = -L - 1; z <= L; z++) { v.set(12, 5, z, band(12, 5, z)); v.set(13, 5, z, band(13, 5, z)); v.set(12, -1, z, band(12, -1, z)); v.set(13, -1, z, band(13, -1, z)); }
      for (let y = -1; y <= 5; y++) for (const z of [-L - 1, L]) { v.set(12, y, z, band(12, y, z)); v.set(13, y, z, band(13, y, z)); }
      // ribbon bookmark slipping out of the pages and lying on the table
      const rib = (x, y, z) => gloss(x === -6 ? 0xb8242a : 0x8e1a22);
      for (let z = L - 2; z <= L + 9; z++) {
        const y = z < L ? 2 : z < L + 2 ? 1 : 0;
        if (z === L + 9) { v.set(-6, y, z, rib(-6, y, z)); continue; }
        v.set(-6, y, z, rib(-6, y, z)); v.set(-5, y, z, rib(-5, y, z));
      }
      v.set(-5, -1, L + 3, null);
      // the whole thing rests on the back cover
      v.translate(0, 1, 0);
      dust(v, 0xc8b898, 0.12, 4, 2);
    },
  },

  // ------------------------------------------------------------- garage key
  garage_key: {
    name: 'Old Garage Key', voxel: 0.0018,
    build(v) {
      v.jitter = 0.015;
      const brass = (x, y, z) => {
        const n = vnoise(x, y, z, 3, 2);
        let c = mix(0xc0902e, 0xe6bc56, n);
        if (y >= 2) c = shade(c, 1.1);
        if (hash(x, y, z, 3) < 0.06) c = 0x8a6418;
        if (n < 0.18 && hash(x, y, z, 4) < 0.6) c = mix(c, 0x6e8050, 0.5); // green patina in the low spots
        return gloss(c);
      };
      // bow: a flat ring with three little lobes, 3 voxels thick
      for (let x = -34; x <= -12; x++) for (let z = -12; z <= 12; z++) {
        const dx = x + 22.5, dz = z;
        const a = Math.atan2(dz, dx), d = Math.hypot(dx, dz);
        const ro = 8.4 + Math.max(0, Math.cos(a * 3 + Math.PI)) * 2.2, ri = 4.4;
        if (d <= ro && d > ri) for (let y = 0; y <= 2; y++) v.set(x, y, z, brass(x, y, z));
      }
      // collar rings + round shaft
      for (let x = -15; x <= 16; x++) {
        const r = x <= -13 ? 2.9 : (x === -10 || x === -9) ? 2.5 : 1.6;
        for (let y = -2; y <= 4; y++) for (let z = -4; z <= 4; z++) if ((y - 1) ** 2 + z * z <= (r + 0.3) ** 2) v.set(x, y + 0, z, brass(x, y, z));
      }
      // bit with wards
      for (let x = 7; x <= 16; x++) for (let z = 2; z <= 9; z++) {
        if ((x === 9 || x === 10) && z >= 5) continue;
        if ((x === 13 || x === 14) && z >= 7) continue;
        for (let y = 0; y <= 2; y++) v.set(x, y, z, brass(x, y, z));
      }
      // steel split ring through the bow
      for (let a = 0; a < 80; a++) {
        const t = (a / 80) * TAU;
        const x = R(-35 + Math.cos(t) * 7.5), z = R(Math.sin(t) * 7.5);
        v.set(x, 0, z, metal(0xc8d0d8)); if (a % 20 === 5) v.set(x, 1, z, metal(0xe8ecf0));
      }
      // small wooden tag hanging off the ring
      const wood = (x, y, z) => shade(0xd09a60, 0.9 + vnoise(x * 2.5, y, z * 0.3, 2, 4) * 0.16 + (y === 2 ? 0.05 : 0));
      v.shape(-61, 0, -6, -45, 2, 6, (x, y, z) => !((z === -6 || z === 6) && x === -61), wood);
      for (const z of [0, 1]) { v.remove(-47, 1, z); v.remove(-47, 2, z); }
      path(v, [[-46, 1, 0], [-43, 1, 0]], 0xc8302a);
      // burnt-in writing on the tag
      stampRows(v, ['###.#.###', '..#.#.#.#', '.#..#.###', '###.#.#.#', '#.#...###'], 0x4a2a18, -58, 2, -2, 'xz');
      dust(v, 0x9a8a6a, 0.08, 3, 1);
    },
  },

  // ------------------------------------------------------------- milk carton
  milk_carton: {
    name: 'Milk Carton (1L)', voxel: 0.0035,
    build(v) {
      v.jitter = 0.012;
      const BLUE = 0x2456b0, SKY = 0x8cc6ee, RED = 0xd8342e, WHITE = 0xfbfaf6;
      const H = 46; // body height (16 cm); gable adds ~3.5 cm
      // carton body (x -10..9, z -10..9)
      fill(v, -10, 0, -10, 9, H - 1, 9, () => gloss(WHITE));
      // gable: front/back panels slope to a ridge, sides are the folded triangles
      for (let k = 0; k < 10; k++) v.box(-10, H + k, -10 + k, 9, H + k, 9 - k, gloss(shade(WHITE, 0.98)));
      fill(v, -10, H + 10, -1, 9, H + 13, 0, (x, y, z) => gloss(y === H + 13 ? 0xe8e8e2 : WHITE)); // sealed fin
      for (let x = -10; x <= 9; x += 3) v.set(x, H + 12, 1, gloss(0xdcdcd4));
      // front (+z) print
      const front = (x, y) => {
        if (y <= 7) return BLUE;
        if (y <= 11) { const hill = 9 + Math.sin(x * 0.45) * 1.6 + Math.sin(x * 0.17 + 1) * 1.2; return y <= hill ? (y <= hill - 2 ? 0x5aa83c : 0x8ccf5a) : SKY; }
        if (y === 12) return SKY;
        if (y >= 40 && y <= 42) return RED;
        if (y >= 44) return BLUE;
        return null;
      };
      v.paint(() => v.shape(-10, 0, 9, 9, H - 1, 9, (x, y) => front(x, y) !== null, (x, y) => gloss(front(x, y))));
      // a little cow on the meadow
      stampRows(v, ['......KK', 'KWWKWWWK', 'WKKWWKW.', 'WWWWWWW.', 'K.K..K.K'], (c) => gloss(c === 'K' ? 0x2a2626 : WHITE), -7, 15, 10, 'xy');
      v.set(0, 14, 11, gloss(0xf0a8b0));
      // big blue 牛乳 + small red/white band text + 1000ml
      const GYU = ['..#.#..', '.#####.', '.#..#..', '#######', '....#..', '....#..', '....#..'];
      const NYU = ['.###.#.', '...#.#.', '.##..#.', '#####..', '..#..#.', '..#..#.', '.##...#'];
      for (const [x0, rows] of [[-9, GYU], [1, NYU]]) rows.forEach((r, i) => [...r].forEach((ch, j) => { if (ch === '#') { v.set(x0 + j, 36 - i, 9, gloss(BLUE)); v.set(x0 + j, 35 - i, 9, gloss(BLUE)); } }));
      for (let x = -8; x <= 7; x++) if (x % 3 !== 1) v.set(x, 41, 9, gloss(WHITE));
      v.paint(() => stampRows(v, fontRows('1000'), gloss(WHITE), -9, 6, 9));
      v.paint(() => stampRows(v, ['##.#', '###.', '#.#.'], gloss(0xffd23f), 6, 4, 9)); // tiny 'ml'
      v.paint(() => stampRows(v, fontRows('MILK'), gloss(BLUE), -7, 26, 9));
      // sides: blue with a white nutrition panel on +x, a milk-drop logo on -x
      v.paint(() => v.shape(9, 0, -10, 9, H - 1, 8, () => true, (x, y, z) => gloss(y >= 14 && y <= 32 && z >= -7 && z <= 6 ? (y % 3 === 0 && y < 31 && z > -6 && z < 5 ? 0x9aa2b0 : WHITE) : (y <= 6 ? BLUE : y >= 44 ? BLUE : SKY))));
      v.paint(() => v.shape(-10, 0, -10, -10, H - 1, 8, () => true, (x, y, z) => {
        const d = Math.hypot(z + 0.5, (y - 24) * 0.8) - (y > 24 ? 0 : (24 - y) * 0.35);
        return gloss(y <= 6 || y >= 44 ? BLUE : d < 6 ? WHITE : SKY);
      }));
      // back: white with blue text lines
      v.paint(() => v.shape(-10, 0, -10, 9, H - 1, -10, () => true, (x, y) => gloss(y <= 6 ? BLUE : (y % 4 === 0 && y > 12 && y < 40 && x > -8 && x < 8 && hash(x, y, 0, 3) < 0.8 ? 0x5a7ac0 : WHITE))));
      // gable front panel: brand stripe; spout tab on the back
      v.paint(() => v.shape(-10, H + 2, -10, 9, H + 6, 9, (x, y, z) => z >= 9 - (y - H) - 0 && z <= 9 - (y - H) + 1, (x, y) => gloss(y === H + 4 ? BLUE : y === H + 3 && x % 2 ? SKY : WHITE)));
      v.set(0, H + 4, 6, gloss(RED));
      grime(v, 0, 3, 0.9);
    },
  },

  // ------------------------------------------------------------- AA batteries in a blister card
  battery_pack: {
    name: 'AA Batteries (4 pack)', voxel: 0.002,
    build(v) {
      v.jitter = 0.015;
      // backing card standing upright (x -21..20, y 0..61), facing +z
      fill(v, -21, 0, -1, 20, 61, 0, (x, y, z) => {
        if (y >= 48) return gloss(y === 48 ? 0xa81e22 : 0xe0302c);
        if (y <= 4) return gloss(0x2a4aa0);
        return gloss((x + y) % 7 === 0 ? 0xf8d84a : 0xfbe25c);
      });
      // euro hang slot
      for (let x = -5; x <= 4; x++) for (let y = 55; y <= 57; y++) if (!((x === -5 || x === 4) && y !== 56)) { v.remove(x, y, -1); v.remove(x, y, 0); }
      // header text: AA x4 + white bolt
      stampRows(v, fontRows('AA'), gloss(0xffffff), -17, 54, 1, 'xy', 2);
      v.shape(5, 48, 1, 18, 60, 1, (x, y) => Math.hypot(x - 11.5, y - 54) <= 6.3, gloss(0xffd23f));
      stampRows(v, fontRows('4'), gloss(0xd8242a), 10, 56, 2, 'xy', 1);
      stampRows(v, ['#.#', '.#.', '#.#'], gloss(0x2a2226), 9, 51, 2);
      stampRows(v, fontRows('ALKALINE'), gloss(0xffffff), -15, 3, 1);
      // four cells (r 3.6 = 14.4 mm, 50 mm long) under a clear blister
      const cx = [-13.5, -4.5, 4.5, 13.5];
      for (const x0 of cx) {
        for (let y = 10; y <= 34; y++) for (let x = Math.floor(x0 - 4); x <= Math.ceil(x0 + 4); x++) for (let z = 1; z <= 8; z++) {
          const d = Math.hypot(x - x0, z - 4.5);
          if (d > 3.7) continue;
          const a = Math.atan2(z - 4.5, x - x0);
          let c;
          if (y >= 26) c = gloss(y === 26 ? 0x9a6a1e : (a < -1 || a > 2.2 ? 0xc89030 : 0xe8b84a));
          else c = gloss(0x1e1c20);
          if (y === 20 && Math.abs(a - 1.2) < 0.8) c = gloss(0xe8e4dc);
          if (y >= 14 && y <= 17 && Math.abs(a - 1.4) < 0.5) c = gloss(0xd83a2a);
          if (y === 10) c = metal(0xb8bec4);
          v.set(x, y, z, c);
        }
        for (let x = Math.floor(x0 - 2); x <= Math.ceil(x0 + 2); x++) for (let z = 3; z <= 6; z++) if (Math.hypot(x - x0, z - 4.5) <= 1.6) v.set(x, 35, z, metal(0xd8dde2));
        stampRows(v, ['.#.', '###', '.#.'], gloss(0x6a4a14), R(x0) - 1, 31, 9, 'xy');
      }
      // blister shell: clear plastic hugging the cells, flange glued to the card
      v.shape(-20, 7, 1, 19, 38, 10, (x, y, z) => {
        if (v.has(x, y, z)) return false;
        const near = cx.some((x0) => Math.hypot(x - x0, z - 4.5) <= 4.8 && y >= 9 && y <= 36) || (z <= 2 && x >= -19 && x <= 18 && y >= 8 && y <= 37);
        const deep = cx.some((x0) => Math.hypot(x - x0, z - 4.5) <= 3.9 && y >= 10 && y <= 35);
        return near && !deep && z >= 1;
      }, glass(0xe4f2f8));
      // a price sticker
      fill(v, 10, 41, 1, 18, 45, 1, (x, y) => gloss(y === 45 ? 0xe0302c : 0xffffff));
      stampRows(v, fontRows('300'), gloss(0x2a2226), 11, 44, 2);
    },
  },

  // ------------------------------------------------------------- red cantilever toolbox
  toolkit_case: {
    name: 'Red Tool Box', voxel: 0.006,
    build(v) {
      const red = (x, y, z) => gloss(shade(0xc8282a, 0.95 + vnoise(x, y, z, 6, 2) * 0.08 + (hash(x, y, z, 3) < 0.04 ? -0.08 : 0)));
      const steel = (x, y, z) => metal(shade(0xb8c0c8, 0.9 + hash(x, y, z, 4) * 0.12));
      // body with a rolled bottom rim (x -37..37, z -16..16)
      fill(v, -37, 2, -16, 37, 22, 16, red);
      fill(v, -36, 0, -15, 36, 1, 15, (x, y, z) => gloss(shade(0x9a1c20, 0.95 + hash(x, y, z, 5) * 0.06)));
      // two cantilever lids meeting along the centre line, overhanging lip
      for (const s of [-1, 1]) {
        fill(v, -38, 23, s > 0 ? 1 : -17, 38, 27, s > 0 ? 17 : -1, red);
        fill(v, -37, 28, s > 0 ? 1 : -16, 37, 29, s > 0 ? 16 : -1, red);
        fill(v, -36, 30, s > 0 ? 2 : -14, 36, 30, s > 0 ? 14 : -2, red);
      }
      v.box(-38, 24, 0, 38, 30, 0, gloss(0x5a1014)); // seam between lids
      // lid lip shadow line + wear
      for (let x = -38; x <= 38; x++) { v.set(x, 23, 17, gloss(0x8a1a1e)); v.set(x, 23, -17, gloss(0x8a1a1e)); }
      edgeWear(v, -38, 0, -17, 38, 30, 17, metal(0xb0b6bc), 0.22, 7);
      // cantilever arms on both ends
      for (const sx of [-1, 1]) {
        const x = sx * 38;
        for (const [z0, z1] of [[-12, -4], [4, 12]]) path(v, [[x + sx, 8, z0], [x + sx, 26, z1]], metal(0x9aa2aa), 0);
        for (const z of [-12, 4, -4, 12]) v.set(x + sx, z === -12 || z === 4 ? 8 : 26, z, metal(0xd8dde2));
      }
      // handle: steel posts + black rubber grip
      for (const x of [-28, 27]) fill(v, x, 30, -1, x + 1, 39, 0, steel);
      fill(v, -28, 39, -1, 28, 40, 0, steel);
      for (let x = -17; x <= 17; x++) for (let y = 38; y <= 42; y++) for (let z = -3; z <= 2; z++) {
        if ((y - 40) ** 2 + (z + 0.5) ** 2 <= 5.2) v.set(x, y, z, gloss(x % 3 === 0 ? 0x1a1818 : 0x2a2828));
      }
      // two front latches
      for (const x0 of [-24, 20]) {
        fill(v, x0, 15, 17, x0 + 4, 25, 17, steel);
        fill(v, x0 + 1, 22, 18, x0 + 3, 27, 18, steel);
        v.box(x0 + 1, 17, 18, x0 + 3, 18, 18, metal(0x7a8088));
      }
      // rivets + a maker sticker
      for (const x of [-34, -12, 12, 34]) v.set(x, 20, 17, metal(0xd8dde2));
      fill(v, -9, 8, 17, 9, 15, 17, (x, y) => gloss(y === 15 || y === 8 ? 0x2a2226 : 0xf2d84a));
      stampRows(v, fontRows('TOOLS'), gloss(0x2a2226), -9, 13, 18);
      blotch(v, -37, 0, -17, 37, 22, 17, gloss(0x7a2a1c), 0.82, 3, 9);
      grime(v, 0, 6, 0.82);
      dust(v, 0xb0a288, 0.18, 4, 3);
    },
  },

  // ------------------------------------------------------------- fluorescent tube in its long box
  tube_box: {
    name: 'Fluorescent Tube (boxed)', voxel: 0.005,
    build(v) {
      v.jitter = 0.012;
      const L = 122; // 1.22 m long, 4 cm square section
      const BLUE = 0x2a5ab0, WHITE = 0xf6f4ee;
      fill(v, -L, 0, -4, L - 1, 7, 3, (x, y, z) => {
        const endTape = Math.abs(x) >= L - 6;
        if (y === 7) return gloss(endTape ? 0xf2ead0 : BLUE); // top
        if (z === 3) { // front: tube illustration
          if (y === 6 || y === 1) return gloss(BLUE);
          if (endTape) return gloss(0xf2ead0);
          if (y >= 3 && y <= 4 && x > -L + 16 && x < L - 18) {
            if (x < -L + 21 || x > L - 23) return gloss(0x9aa4ae);
            return gloss(y === 4 ? 0xffffff : 0xd8f2fa);
          }
          if ((y === 2 || y === 5) && x > -L + 18 && x < L - 20) return gloss(0xfff2b0);
          return gloss(WHITE);
        }
        if (z === -4) return gloss(y >= 5 ? 0x3aa060 : WHITE); // back: eco band
        if (y === 0) return gloss(0xe8e4da);
        return gloss(endTape ? 0xe8dcb8 : BLUE); // ends
      });
      // pins at the ends of the printed tube
      for (const x of [-L + 15, L - 17]) { v.set(x, 3, 4, gloss(0x9aa4ae)); v.set(x, 5, 4, null); }
      // brand + wattage on the top
      stampRows(v, fontRows('FL40SS'), gloss(0xffffff), -L + 10, 7, -3, 'xz');
      stampRows(v, fontRows('40W'), gloss(0xffd23f), 40, 7, -3, 'xz');
      stampRows(v, fontRows('DAYLIGHT'), gloss(0xffffff), -20, 7, -3, 'xz');
      // a squashed corner from the trip home
      for (const [x, y, z] of [[L - 1, 7, 3], [L - 1, 6, 3], [L - 2, 7, 3], [L - 1, 7, 2]]) v.remove(x, y, z);
      dust(v, 0xc0b49c, 0.1, 5, 2);
    },
  },

  // ------------------------------------------------------------- tied garbage bags
  trash_bag: { name: 'Garbage Bag', voxel: 0.008, build(v) { garbageBag(v, { seed: 1, w: 25, d: 21, h: 58, print: 0x2f9a4a }); } },
  trash_bag_b: { name: 'Garbage Bag (lumpy)', voxel: 0.008, build(v) { garbageBag(v, { seed: 2, w: 29, d: 23, h: 36, print: 0xe8782a, tint: 0xdbe6ee, lean: 0.12 }); } },

  // ------------------------------------------------------------- dust, leaves and scraps
  dust_pile: {
    name: 'Dust Pile', voxel: 0.008,
    build(v) {
      v.jitter = 0.05;
      const DUST = [0x8a8274, 0x9a9282, 0x7c7466, 0xa8a090];
      for (let x = -38; x <= 38; x++) for (let z = -30; z <= 30; z++) {
        const d = Math.hypot(x / 36, z / 27) + (vnoise(x, 0, z, 7, 1) - 0.5) * 0.5;
        if (d > 1) continue;
        const h = Math.floor((1 - d * d) * 3.4 + vnoise(x, 1, z, 3, 2) * 2.2);
        for (let y = 0; y <= Math.max(0, h); y++) {
          let c = pick(DUST, hash(x >> 1, y, z >> 1, 3));
          if (hash(x, y, z, 4) < 0.05) c = 0xc8c2b6; // fluff
          if (hash(x, y, z, 5) < 0.02) c = 0x4a4038; // grit
          v.set(x, y, z, c);
        }
      }
      // hair / thread squiggles on top
      for (const [x0, z0, s] of [[-20, -6, 1], [8, 12, 2], [18, -14, 3]]) {
        let x = x0, z = z0;
        for (let i = 0; i < 14; i++) {
          x += hash(i, s, 0, 6) < 0.5 ? 1 : 0; z += hash(i, s, 1, 6) < 0.5 ? 1 : -1;
          let y = 6; while (y > 0 && !v.has(x, y - 1, z)) y--;
          v.set(x, y, z, s === 2 ? 0xd8d4cc : 0x3a3434);
        }
      }
      // dead leaves (flat, slightly curled, with midribs)
      const leaf = (cx, cz, ang, len, wid, col) => {
        const ca = Math.cos(ang), sa = Math.sin(ang);
        for (let x = cx - len; x <= cx + len; x++) for (let z = cz - len; z <= cz + len; z++) {
          const u = (x - cx) * ca + (z - cz) * sa, w = -(x - cx) * sa + (z - cz) * ca;
          const t = u / len;
          if (Math.abs(t) > 1) continue;
          const half = wid * Math.sqrt(1 - t * t) * (t > 0 ? 1 - t * 0.4 : 1);
          if (Math.abs(w) > half) continue;
          let y = 8; while (y > 0 && !v.has(x, y - 1, z)) y--;
          const curl = Math.abs(w) > half - 1.2 ? 1 : 0;
          const c = Math.abs(w) < 0.6 ? shade(col, 0.72) : shade(col, 0.92 + hash(x, 0, z, 9) * 0.14);
          v.set(x, y + curl, z, c);
        }
        const tx = R(cx - ca * (len + 1)), tz = R(cz - sa * (len + 1));
        let y = 8; while (y > 0 && !v.has(tx, y - 1, tz)) y--;
        v.set(tx, y, tz, shade(col, 0.6));
      };
      leaf(-14, 4, 0.5, 6, 3.4, 0xc8742a);
      leaf(10, -8, 2.1, 5, 3, 0x9a5a28);
      leaf(22, 10, -0.7, 5, 2.6, 0xd8a040);
      leaf(-26, -12, 1.4, 4.5, 2.6, 0x7a4a24);
      leaf(2, 18, 2.8, 5, 3.2, 0xb8622a);
      leaf(-4, -20, 0.2, 4, 2.2, 0xc8902e);
      // little scraps of paper: a receipt, a candy wrapper, a torn ticket stub, a 1-yen coin, a bottle cap
      const scrap = (x0, z0, w, d, col, lines) => {
        for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
          let y = 8; while (y > 0 && !v.has(x, y - 1, z)) y--;
          v.set(x, y, z, lines && z % 2 === 0 && x > x0 && x < x0 + w - 1 ? lines : col);
        }
      };
      scrap(-6, -2, 5, 9, 0xf4f2ea, 0xa8a8a8);
      scrap(14, 0, 4, 3, 0xe85a8a, 0xffd23f);
      scrap(-22, 10, 6, 3, 0xf2c84a, null);
      v.cylinder(26, 1, -6, 1.6, 1, metal(0xc8ccd0));
      v.cylinder(-30, 1, 4, 1.8, 1, gloss(0xd8342a)); v.set(-30, 2, 4, gloss(0xb82a22));
    },
  },

  // ------------------------------------------------------------- general rubbish
  rubbish_pile: {
    name: 'Rubbish Pile', voxel: 0.006,
    build(v) {
      v.jitter = 0.03;
      // a crumpled sheet of newspaper spread underneath
      const news = new VoxelModel();
      fill(news, -18, 0, -13, 18, 0, 13, (x, y, z) => ((z + 20) % 3 === 0 && hash(x, 0, z, 2) < 0.8 ? 0x8a8680 : shade(0xeeeae0, 0.95 + hash(x >> 1, 0, z >> 1, 3) * 0.06)));
      const newsW = new VoxelModel();
      news.forEach((x, y, z, val) => newsW.set(x, R(vnoise(x, 0, z, 6, 4) * 4), z, val));
      put(v, newsW, { dx: -6, dz: 2, ry: 0.3 });
      // flattened chips bag (red, silver inside showing at the torn edge) + candy wrappers
      const chips = new VoxelModel();
      fill(chips, -8, 0, -11, 8, 1, 11, (x, y, z) => (Math.abs(z) > 9 ? metal(0xd8dce0) : gloss(z < -4 ? 0xffd23f : y === 1 && Math.abs(x) < 4 && Math.abs(z) < 3 ? 0xffffff : 0xd83a2a)));
      drop(v, chips, { dx: 24, dz: 14, ry: 0.9 });
      for (const [x, z, c] of [[-30, 18, 0x8a5bd6], [-34, -12, 0x2fb5a6], [34, -18, 0xffd23f], [10, 26, 0xe85a8a]]) {
        const w = new VoxelModel();
        w.box(-1, 0, 0, 1, 1, 1, gloss(c)); w.set(-2, 0, 0, gloss(shade(c, 0.8))); w.set(-3, 0, 1, gloss(shade(c, 0.8))); w.set(2, 0, 1, gloss(shade(c, 0.8))); w.set(3, 0, 0, gloss(shade(c, 0.8)));
        drop(v, w, { dx: x, dz: z, ry: x * 0.1 });
      }
      // crumpled paper balls heaped in the middle
      const crumple = (r, base, s, print = false) => {
        const m = new VoxelModel();
        m.shape(-r - 2, -r - 2, -r - 2, r + 2, r + 2, r + 2, (x, y, z) => Math.hypot(x, y, z) <= r * (0.8 + vnoise(x, y, z, 2.2, s) * 0.4), (x, y, z) => {
          const f = 0.84 + hash(x >> 1, y >> 1, z >> 1, s) * 0.2;
          let c = shade(base, f);
          if (print && (y + (x >> 2)) % 3 === 0 && hash(x, y, z, s + 1) < 0.7) c = shade(0x8a8a88, f);
          return c;
        });
        return m;
      };
      drop(v, crumple(8, 0xf4f0e6, 1, true), { dx: -10, dz: 0 });
      drop(v, crumple(7, 0xfbf8f0, 2), { dx: 4, dz: 4 });
      drop(v, crumple(6.5, 0xe8dcc0, 3, true), { dx: -4, dz: -10 });
      drop(v, crumple(5, 0xf8e8a8, 4), { dx: -20, dz: 10 });
      drop(v, crumple(6, 0xfbf8f0, 5, true), { dx: -4, dz: 0 });
      drop(v, crumple(4.5, 0xd8e4f0, 6), { dx: 12, dz: -8 });
      // drink cans: one lying on the heap, one crushed and standing
      const can = (body, band, crush = false) => {
        const m = new VoxelModel();
        for (let y = 0; y < 20; y++) {
          const squeeze = crush && y > 7 && y < 13 ? 1.4 : 0;
          m.cylinder(0, y, 0, (y < 2 || y > 17 ? 4.6 : 5.4) - squeeze, 1, (x, yy, z) => {
            if (yy < 2 || yy > 17) return metal(0xc4c8cc);
            const a = Math.atan2(x, z);
            return gloss(yy > 5 && yy < 12 && Math.abs(a) < 1.6 ? band : body);
          });
        }
        m.box(-1, 19, 1, 1, 19, 2, 0x161414);
        return m;
      };
      drop(v, can(0xd8221e, 0xfbf8f0), { dx: 14, dz: 6, rz: Math.PI / 2, ry: 0.5 });
      drop(v, can(0x2a3a9a, 0xffd23f, true), { dx: 26, dz: -10, ry: 0.3 });
      // clear PET bottle rolled against the heap
      const pet = new VoxelModel();
      for (let y = 0; y < 34; y++) {
        const r = y < 22 ? 5 : y < 30 ? 5 - (y - 22) * 0.4 : 2.2;
        if (y >= 8 && y <= 16) pet.cylinder(0, y, 0, r, 1, (x, yy) => gloss(yy === 8 || yy === 16 ? 0xffffff : 0x3c8a3c));
        else pet.tube(0, y, 0, r, r - 1.1, 1, glass(0xe2f0f2));
      }
      pet.cylinder(0, 34, 0, 2.6, 3, gloss(0x2c6a2c));
      drop(v, pet, { dx: -26, dz: -14, rz: Math.PI / 2, ry: -0.35 });
      // a scrunched convenience-store plastic bag with handles
      const pb = crumple(7, 0xf6f8f6, 7);
      pb.forEach((x, y, z, val) => pb.set(x, y, z, gloss(decColor(val))));
      for (const sx of [-3, 3]) path(pb, [[sx, 5, 0], [sx * 1.6, 10, 1], [sx * 0.6, 12, 2]], gloss(0xeef0ee));
      pb.box(-2, 1, 6, 2, 2, 6, gloss(0x3a8ad8));
      drop(v, pb, { dx: 22, dz: 22 });
      dust(v, 0x9a8e7a, 0.12, 4, 6);
    },
  },

  // ------------------------------------------------------------- flattened boxes and packing material
  cardboard_mess: {
    name: 'Cardboard Mess', voxel: 0.008,
    build(v) {
      v.jitter = 0.03;
      const board = (base, s) => (x, y, z) => shade(base, 0.94 + vnoise(x, y, z, 5, s) * 0.08 + hash(x, y, z, s) * 0.04);
      /** A flattened box: two panels side by side, flap lines, corrugated cut edges, optional print. */
      const flat = (w, d, base, s, print, bend = 0) => {
        const m = new VoxelModel();
        for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
          const edge = x === 0 || z === 0 || x === w - 1 || z === d - 1;
          let c = edge ? ((x + z) % 2 ? 0xdcc08a : 0xa88a58) : board(base, s)(x, 0, z);
          if (!edge && (x === w >> 1 || z === 6 || z === d - 7)) c = shade(base, 0.82); // crease + flap lines
          const y = bend ? R(Math.max(0, bend - Math.abs(x - (w >> 1)) * (bend / (w >> 1)))) : 0;
          m.set(x, y, z, c);
        }
        if (print) print(m, w, d);
        m.translate(-(w >> 1), 0, -(d >> 1));
        return m;
      };
      const arrows = (m, x0, z0) => { for (const dx of [0, 7]) stampRows(m, ['..#..', '.###.', '#####', '..#..', '..#..', '..#..'], 0x3a3a3a, x0 + dx, m.bounds().maxY, z0, 'xz'); };
      drop(v, flat(62, 40, 0xc49a62, 1, (m) => { arrows(m, 6, 10); stampRows(m, fontRows('FRAGILE'), 0xc8302a, 34, 0, 24, 'xz'); m.box(38, 0, 10, 54, 0, 12, 0xd9c58e); }), { dx: -10, dz: -4, ry: 0.18 });
      drop(v, flat(52, 34, 0xb88c56, 2, (m) => { stampRows(m, fontRows('THIS SIDE UP'), 0x2a4a90, 6, 0, 14, 'xz'); fill(m, 30, 0, 20, 44, 0, 28, (x, y, z) => (z === 20 || z === 28 ? 0xc8c8c8 : 0xffffff)); for (const x of [32, 34, 37, 39, 42]) m.box(x, 0, 25, x, 0, 27, 0x2a2626); }), { dx: 6, dz: 4, ry: -0.42 });
      drop(v, flat(44, 30, 0xc8a26c, 3, null, 5), { dx: -16, dz: 12, ry: 0.9 });
      // an emptied box with its flaps folded open
      const box = new VoxelModel();
      const bf = board(0xc8a068, 4);
      shell(box, -11, 0, -9, 11, 15, 9, bf, 2, ['top']);
      for (let i = 1; i <= 7; i++) {
        const y = 15 + R(i * 0.5);
        for (let x = -11; x <= 11; x++) for (const t of [0, -1]) { box.set(x, y + t, 9 + i, bf(x, y, 9 + i)); box.set(x, y + t, -9 - i, bf(x, y, -9 - i)); }
        for (let z = -9; z <= 9; z++) for (const t of [0, -1]) { box.set(11 + i, y - 1 + t, z, bf(11 + i, y, z)); box.set(-11 - i, y - 1 + t, z, bf(-11 - i, y, z)); }
      }
      box.box(-1, 0, 9, 1, 15, 9, 0xd9c58e); box.box(-1, 0, -9, 1, 15, -9, 0xd9c58e);
      fill(box, -9, 2, -7, 9, 2, 7, () => shade(0x9a7448, 0.9));
      drop(v, box, { dx: 30, dz: -14, ry: 0.35 });
      // crumpled kraft packing paper (one ball in the box, one on the floor)
      const kraft = (r, s) => { const m = new VoxelModel(); m.shape(-r - 2, -r - 2, -r - 2, r + 2, r + 2, r + 2, (x, y, z) => Math.hypot(x * 0.8, y, z) <= r * (0.8 + vnoise(x, y, z, 2.4, s) * 0.4), (x, y, z) => shade(0xb8905a, 0.82 + hash(x >> 1, y >> 1, z >> 1, s) * 0.24)); return m; };
      drop(v, kraft(7, 5), { dx: 30, dz: -14 });
      drop(v, kraft(6, 6), { dx: -34, dz: -12 });
      // bubble wrap strip
      const bw = new VoxelModel();
      for (let x = -12; x <= 12; x++) for (let z = -5; z <= 5; z++) {
        const y = R(Math.sin(x * 0.3) * 1.5 + 1.5);
        bw.set(x, y, z, glass(0xd8eef6));
        if ((x + z * 2) % 3 === 0) bw.set(x, y + 1, z, glass(0xf0faff));
      }
      drop(v, bw, { dx: 2, dz: 24, ry: -0.2 });
      // loose packing peanuts
      for (let i = 0; i < 24; i++) {
        const p = new VoxelModel(); p.set(0, 0, 0, 0xf8f6f0); p.set(1, 0, 0, 0xeeeae2);
        drop(v, p, { dx: R(-44 + hash(i, 1, 0, 9) * 88), dz: R(-30 + hash(i, 2, 0, 9) * 62), ry: hash(i, 3, 0, 9) * 3 });
      }
    },
  },

  // ------------------------------------------------------------- newspapers tied for recycling
  newspaper_stack: {
    name: 'Tied Newspapers', voxel: 0.005,
    build(v) {
      v.jitter = 0.02;
      const W = 27, D = 40; // half extents of a folded paper (27 x 40.6 cm)
      for (let i = 0; i < 12; i++) {
        const sheet = new VoxelModel();
        const age = hash(i, 0, 0, 3);
        const base = mix(0xeeebe2, 0xe4d6b4, age * age);
        fill(sheet, -W, 0, -D, W - 1, 2, D - 1, (x, y, z) => {
          if (x === -W && y !== 1) return null; // rounded fold
          const edge = x === W - 1 || x === -W || z === D - 1 || z === -D;
          if (edge) return shade(base, (y === 1 ? 0.9 : 0.98) - (hash(x, y, z, i) < 0.25 ? 0.12 : 0));
          return shade(base, 0.97 + hash(x >> 2, y, z >> 2, i) * 0.04);
        });
        if (i === 5) fill(sheet, W - 3, 1, -D + 6, W + 3, 1, -D + 30, (x, y, z) => (x > W ? (z % 5 < 2 ? 0xff6f91 : 0xffd23f) : null)); // colourful ad insert
        if (i === 8) fill(sheet, W - 2, 1, 4, W + 2, 1, 22, (x, y, z) => (x > W ? 0x8fd0f0 : null));
        put(v, sheet, { dx: R((hash(i, 1, 0, 4) - 0.5) * 4), dy: i * 3, dz: R((hash(i, 2, 0, 4) - 0.5) * 4), ry: (hash(i, 3, 0, 4) - 0.5) * 0.08 });
      }
      const top = 35;
      // front page print on the top sheet: masthead, headline, photo, vertical text columns
      v.paint(() => v.shape(-W - 3, top, -D - 3, W + 3, top, D + 3, () => true, (x, y, z) => {
        if (z < -D + 12) {
          if (x > W - 14 && x < W - 3 && z > -D + 2 && z < -D + 10) return 0xc8302a; // red logo box
          if (z > -D + 3 && z < -D + 9 && x > -W + 3 && x < W - 16 && (x + 40) % 7 < 5) return 0x1e1a1a; // masthead glyphs
          return undefined;
        }
        if (z < -D + 18 && x > -W + 3 && x < W - 3) return (z === -D + 13 || z === -D + 16) && (x + 40) % 6 < 5 ? 0x2a2626 : undefined;
        if (x > 2 && x < W - 3 && z > -D + 20 && z < -D + 40) return shade(0x6a6a6a, 0.8 + vnoise(x, 0, z, 3, 5) * 0.5); // photo
        if (z > -D + 20 && z < D - 4 && x > -W + 3 && x < W - 3 && (x + 40) % 3 === 0 && hash(x, 0, z, 6) < 0.85) return 0x8a8680; // columns
        return undefined;
      }));
      // twine cross tie + knot
      const S = 0xb8864a;
      for (let y = 0; y <= top + 1; y++) for (let z = -D - 4; z <= D + 3; z++) for (const x of [-1, 0]) {
        if (y === top + 1 && v.has(x, top, z)) v.set(x, y, z, S);
      }
      for (let y = 0; y <= top + 1; y++) for (let x = -W - 4; x <= W + 3; x++) for (const z of [-1, 0]) {
        if (y === top + 1 && v.has(x, top, z)) v.set(x, y, z, S);
      }
      for (let y = 0; y <= top; y++) {
        for (const x of [-1, 0]) { let z = D + 3; while (z > 0 && !v.has(x, y, z)) z--; if (z > 0) v.set(x, y, z + 1, S); z = -D - 4; while (z < 0 && !v.has(x, y, z)) z++; if (z < 0) v.set(x, y, z - 1, S); }
        for (const z of [-1, 0]) { let x = W + 3; while (x > 0 && !v.has(x, y, z)) x--; if (x > 0) v.set(x + 1, y, z, S); x = -W - 4; while (x < 0 && !v.has(x, y, z)) x++; if (x < 0) v.set(x - 1, y, z, S); }
      }
      v.box(-2, top + 2, -2, 1, top + 2, 1, S);
      path(v, [[1, top + 2, 1], [5, top + 1, 4], [7, top + 1, 7]], S);
      path(v, [[-2, top + 2, 1], [-5, top + 1, 5]], S);
      dust(v, 0xc8bc9c, 0.12, 4, 7);
    },
  },

  // ------------------------------------------------------------- Grandpa's cash tin
  cash_tin: {
    name: "Grandpa's Cash Tin", voxel: 0.004,
    build(v) {
      v.jitter = 0.015;
      const BLUE = 0x23468c, GOLD = 0xdcb04a;
      const rT = 25, hT = 16;
      // body: thin wall, solid floor, floral garland around the middle
      for (let y = 0; y <= hT; y++) {
        const r = y === 0 ? rT - 1 : y >= hT - 1 ? rT + 0.6 : rT;
        v.tube(0, y, 0, r, y <= 1 ? -1 : r - 1.6, 1, (x, yy, z) => {
          const a = Math.atan2(x, z), u = a * rT;
          if (yy <= 1 || yy >= hT - 1) return gloss(shade(GOLD, yy >= hT ? 1.08 : 0.94));
          if (yy === 2 || yy === hT - 2) return gloss(0xf0e6c8);
          const cell = ((u % 13) + 13) % 13, fy = yy - 8.5;
          const d = Math.hypot(cell - 6.5, fy);
          if (d < 1.2) return gloss(0xe8b03a);
          if (d < 3.2 && Math.abs(Math.atan2(fy, cell - 6.5) % 1.26) < 0.7) return gloss(0xfbf6ea);
          if (d < 3.2) return gloss(0xd8303a);
          if (Math.abs(fy + Math.sin(u * 0.5) * 1.5) < 0.6) return gloss(0x4a9a5a);
          return gloss(shade(BLUE, 0.95 + hash(x, yy, z, 3) * 0.08));
        });
      }
      blotch(v, -rT - 1, 0, -rT - 1, rT + 1, 5, rT + 1, gloss(0x8a5a3a), 0.8, 2, 4); // rust creeping up from the base
      // contents: two banded bundles of notes, loose notes, coins
      const note = (col, ink, band = false) => {
        const m = new VoxelModel();
        fill(m, -19, 0, -9, 19, 0, 9, (x, y, z) => {
          if (band && Math.abs(x) <= 3) return 0xf4f0e6;
          if (Math.abs(x) === 19 || Math.abs(z) === 9) return shade(col, 0.92);
          if (Math.hypot(x - 10, z) < 5) return shade(col, 1.08); // watermark oval
          if (x < -6 && x > -16 && Math.abs(z) < 5 && (x + z) % 2 === 0) return ink;
          return shade(col, 0.97 + hash(x >> 1, 0, z >> 1, 6) * 0.05);
        });
        return m;
      };
      // everything inside is clipped to the tin's inner wall
      const inside = new VoxelModel();
      for (let i = 0; i < 6; i++) put(inside, note(0xdcc49a, 0x8a6a4a, i === 5), { dx: -2, dy: 2 + i, dz: -9, ry: 0.1 });
      for (let i = 0; i < 4; i++) put(inside, note(0x9ab4d8, 0x3a4a8a, i === 3), { dx: 1, dy: 2 + i, dz: 9, ry: -0.15 });
      put(inside, note(0xdcc49a, 0x8a6a4a), { dx: -3, dy: 8, dz: 1, ry: 0.42 });
      put(inside, note(0x9ab4d8, 0x3a4a8a), { dx: 2, dy: 9, dz: 4, ry: -0.3 });
      inside.forEach((x, y, z, val) => { if (Math.hypot(x, z) < rT - 1.8) v.set(x, y, z, val); });
      const coin = (r, col) => { const m = new VoxelModel(); m.cylinder(0, 0, 0, r, 1, gloss(col)); m.set(0, 1, 0, gloss(shade(col, 1.1))); return m; };
      drop(v, coin(3.4, 0xe0c060), { dx: -12, dz: 4 }); drop(v, coin(3, 0xd0d4d8), { dx: 12, dz: -4 }); drop(v, coin(3, 0xc0743a), { dx: -6, dz: 14 }); drop(v, coin(3, 0xd0d4d8), { dx: 8, dz: 12 });
      // lid: blue with a gold rim, white floral ring and a cream medallion with a rose
      const lid = new VoxelModel();
      const rL = rT + 1.6;
      for (let y = 0; y <= 4; y++) lid.tube(0, y, 0, rL, y === 4 ? -1 : rL - 1.2, 1, (x, yy, z) => {
        const d = Math.hypot(x, z);
        if (yy < 4 || d > rL - 2.2) return gloss(shade(GOLD, yy === 4 ? 1.06 : 0.92));
        if (d < 10.5) {
          const rose = Math.hypot(x, z - 1);
          if (rose < 4.6) return gloss(Math.sin(rose * 2.4 + Math.atan2(x, z - 1) * 1.2) > 0.2 ? 0xd8303a : 0xa81e2a);
          if (Math.abs(x) > 3 && Math.abs(z + 5) < 2) return gloss(0x4a9a5a);
          return gloss(d > 9.5 ? GOLD : 0xf4ecd8);
        }
        if (d > 16 && d < 20.5) { const a = Math.atan2(x, z); return gloss(Math.sin(a * 16) > 0.3 ? 0xfbf6ea : BLUE); }
        return gloss(shade(BLUE, 0.96 + hash(x, yy, z, 5) * 0.06));
      });
      // lid pushed aside: resting on the rim at the back-right, overhanging and dipping slightly
      put(v, lid, { dx: 13, dy: hT + 3, dz: -9, rz: -0.12, rx: 0.05 });
      // loose notes fanned over the bundles in the open front, and a coin that rolled out
      drop(v, coin(3.4, 0xe0c060), { dx: -29, dz: 13 });
      grime(v, 0, 4, 0.85);
    },
  },

  // ------------------------------------------------------------- cat bowls
  cat_bowl: { name: 'Cat Bowl', voxel: 0.003, build(v) { catBowl(v, false); } },
  cat_bowl_milk: { name: 'Cat Bowl with Milk', voxel: 0.003, build(v) { catBowl(v, true); } },

  // ------------------------------------------------------------- mikan box cat bed
  cat_bed: {
    name: 'Cardboard Cat Bed', voxel: 0.008,
    build(v) {
      v.jitter = 0.025;
      const board = (x, y, z) => shade(0xc89a62, 0.93 + vnoise(x, y, z, 5, 2) * 0.08 + hash(x, y, z, 3) * 0.04);
      const X = 25, Z = 19, H = 18;
      shell(v, -X, 0, -Z, X - 1, H, Z - 1, board, 2, ['top']);
      // flaps: the back one splays outwards, the front one is torn off, the short ones hang down the sides
      for (let i = 1; i <= 8; i++) {
        const y = H - R(i * 0.55);
        for (let x = -X; x <= X - 1; x++) for (const t of [0, 1]) v.set(x, y - t, -Z - i, board(x, y, -Z - i));
      }
      for (let x = -X; x <= X - 1; x++) if (hash(x, 0, 0, 5) < 0.6) v.set(x, H + 1, Z - 1, board(x, H + 1, Z)); // torn stub
      for (let y = H - 9; y <= H; y++) for (let z = -Z + 1; z <= Z - 2; z++) { v.set(X, y, z, board(X, y, z)); v.set(-X - 1, y, z, board(-X - 1, y, z)); }
      // big orange みかん print on the front, green leaf mark
      text(v, 'みかん', -23, 16, 0xe8701a, { dir: '+z', scale: 2 });
      v.paint(() => v.shape(-X, 0, Z - 1, X - 1, 1, Z - 1, () => true, () => 0x3a8a4a));
      // old towel inside: fluffy, striped, dented where the cat sleeps, draped over the right side
      const towel = (x, y, z) => {
        const stripe = ((z + 60) % 11) < 2;
        const c = stripe ? 0xf6efe2 : 0xe8a0a8;
        return shade(c, 0.88 + vnoise(x, y, z, 2, 6) * 0.16);
      };
      for (let x = -X + 2; x <= X - 3; x++) for (let z = -Z + 2; z <= Z - 3; z++) {
        const nest = Math.max(0, 1 - (x / 15) ** 2 - (z / 11) ** 2);
        const top = R(H - 3 + vnoise(x, 0, z, 4, 7) * 3 - nest * 7);
        for (let y = 2; y <= top; y++) v.set(x, y, z, towel(x, y, z));
      }
      for (let z = -6; z <= 12; z++) {
        const end = R(4 + vnoise(0, 0, z, 3, 8) * 4);
        for (let y = end; y <= H + 1; y++) v.set(X + 1, y, z, towel(X + 1, y, z));
        for (let x = X - 2; x <= X; x++) v.set(x, H + 1, z, towel(x, H + 1, z));
      }
      speckle(v, -X + 2, 8, -Z + 2, X + 1, H + 2, Z - 3, 0xfbfaf6, 0.02, 9); // cat hairs
      grime(v, 0, 3, 0.85);
    },
  },

  // ------------------------------------------------------------- the old pocket watch (it stops time, apparently)
  pocket_watch: {
    name: 'Old Pocket Watch', voxel: 0.0025,
    build(v) {
      v.jitter = 0.01;
      const GOLD = 0xd8a840, r = 10, cy = 11;
      const gold = (x, y, z) => metal(shade(GOLD, 0.88 + hash(x, y, z, 7) * 0.16));
      // case with a domed back, a raised rim round the face
      v.shape(-r - 1, cy - r - 1, -3, r + 1, cy + r + 1, 3, (x, y, z) => {
        const d = Math.hypot(x, y - cy);
        if (z < 0) return d <= r + 0.3 - (-z) * 1.5;
        if (z === 3) return d <= r + 0.3 && d > r - 1.4;
        return d <= r + 0.3;
      }, gold);
      // enamel dial: hour marks, a minute hand at twelve, the hour hand toward four, small seconds dial
      v.paint(() => v.shape(-r, cy - r, 2, r, cy + r, 2, (x, y) => Math.hypot(x, y - cy) < r - 1.2, (x, y) => {
        const dx = x, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dx, dy);
        const tick = Math.abs(((a / (TAU / 12)) % 1 + 1) % 1 - 0.5) > 0.42;
        if (d > r - 3.6 && d < r - 1.6 && tick) return 0x1a1418;
        if (Math.abs(dx) < 0.6 && dy > 0 && dy < r - 3.2) return 0x1a1418;
        if (Math.abs(dy + dx * 0.55) < 0.7 && dx > 0 && dx < 5) return 0x1a1418;
        if (Math.hypot(dx, dy + 4.5) < 2.1 && Math.hypot(dx, dy + 4.5) > 1.3) return 0x8a8078;
        return gloss(0xf6f0e0);
      }));
      v.paint(() => v.shape(-1, cy - 1, 2, 1, cy + 1, 2, (x, y) => Math.hypot(x, y - cy) < 1.2, gloss(0xc8302a)));
      // crown and bow
      v.cylinder(0, cy + r + 1, 0, 1.7, 3, gold);
      v.tube(0, cy + r + 7, -1, 3.6, 2.2, 2, gold, 'z');
    },
  },

  // ------------------------------------------------------------- stack of shop flyers
  flyer_stack: {
    name: 'Stack of Shop Flyers', voxel: 0.003,
    build(v) {
      v.jitter = 0.01;
      const W = 35, D = 49; // A4
      for (let i = 0; i < 6; i++) {
        const sheet = new VoxelModel();
        fill(sheet, -W, 0, -D, W - 1, 0, D - 1, () => (i % 2 ? 0xf6f4ee : 0xfbfaf6));
        put(v, sheet, { dy: i, dx: R((hash(i, 1, 0, 2) - 0.5) * 3), dz: R((hash(i, 2, 0, 2) - 0.5) * 3), ry: (hash(i, 3, 0, 2) - 0.5) * (i === 5 ? 0.12 : 0.05) });
      }
      const y = v.bounds().maxY;
      const P = (rows, col, x0, z0, scale = 1) => v.paint(() => stampRows(v, rows, col, x0, y, z0, 'xz', scale));
      // header band + title
      v.paint(() => v.shape(-W - 3, y, -D - 3, W + 3, y, -D + 11, () => true, () => 0xd8302a));
      P(fontRows('CAPSULE TOYS'), 0xffffff, -23, -D + 3);
      P(fontRows('GRAND OPENING'), 0x2a2226, -25, -D + 15);
      // capsule illustration
      v.paint(() => v.shape(-W, y, -D, W, y, D, (x, yy, z) => Math.hypot(x + 13, z + 12) <= 13, (x, yy, z) => {
        const d = Math.hypot(x + 13, z + 12);
        if (d > 11.8 || Math.abs(z + 12) < 0.8) return INK;
        if (z < -12) return Math.hypot(x + 18, z + 18) < 3 ? 0xffd6e0 : 0xff6f91;
        return 0xeef4f8;
      }));
      // little gacha machine
      v.paint(() => v.shape(4, y, -26, 26, y, 4, () => true, (x, yy, z) => {
        if (z < -22) return 0xd8302a;
        if (z < -8) return x === 4 || x === 26 || z === -9 ? INK : ((x + z) % 4 === 0 ? pick([0xff6f91, 0xffd23f, 0x3f86e8, 0x58c06c], hash(x, 0, z, 4)) : 0xcfeaf6);
        if (Math.hypot(x - 15, z + 3) < 3.5) return 0xc8ccd2;
        return 0xd8302a;
      }));
      // NEW burst
      v.paint(() => v.shape(-W, y, -D, W, y, D, (x, yy, z) => Math.hypot(x - 22, z + 32) < 7 + Math.sin(Math.atan2(z + 32, x - 22) * 8) * 1.4, () => 0xffd23f));
      P(fontRows('NEW'), 0xd8302a, 17, -34);
      // details text, hours and a little map in the footer
      for (const z of [12, 15, 18, 21]) v.paint(() => v.shape(-W + 6, y, z, W - 8, y, z, (x) => hash(x >> 1, 0, z, 5) < 0.85, () => 0x8a8a8a));
      P(fontRows('OPEN 10-18'), 0x2a2226, -W + 6, 25);
      v.paint(() => v.shape(10, y, D - 20, W - 5, y, D - 10, () => true, (x, yy, z) => (x === 10 || x === W - 5 || z === D - 20 || z === D - 10 ? INK : (x - z) % 6 === 0 || z === D - 15 ? 0xffffff : 0x9fd8b0)));
      v.paint(() => v.shape(22, y, D - 16, 23, y, D - 15, () => true, () => 0xd8302a));
      v.paint(() => v.shape(-W - 3, y, D - 6, W + 3, y, D + 3, () => true, (x) => (x % 4 === 0 ? 0xffffff : 0x3f86e8)));
    },
  },

  // ------------------------------------------------------------- taped "out of order" sign
  out_of_order: {
    name: 'Out of Order Sign', voxel: 0.002,
    build(v) {
      v.jitter = 0.01;
      const W = 50, H = 75;
      fill(v, -W, 0, 0, W - 1, H - 1, 0, (x, y) => {
        const b = Math.min(x + W, W - 1 - x, y, H - 1 - y);
        if (b === 3 || b === 5) return 0xd8242a;
        return shade(0xf8f6ee, 0.97 + hash(x >> 2, y >> 2, 0, 3) * 0.04);
      });
      // a curled bottom-right corner
      const curl = [];
      v.forEach((x, y, z, val) => { if (x > 40 && y < 9 && x - 40 > y) curl.push([x, y, val]); });
      for (const [x, y, val] of curl) { v.remove(x, y, 0); v.set(x, y, 1 + (x - 40 > y + 4 ? 1 : 0), val); }
      // hand-lettered marker text
      const ink = 0x1e1a1a;
      const line = (str, yTop) => { const rows = fontRows(str, F5); stampRows(v, rows, ink, -rows[0].length, yTop, 1, 'xy', 2); };
      line('OUT OF', 65);
      line('ORDER', 45);
      const KO = ['.#...#..', '####.#..', '.#..####', '####.#.#', '#..#.#.#', '#..#..#.', '####.#.#', '....#..#'];
      const SHO = ['###.#...', '#.######', '##..#.#.', '#.#####.', '##.#...#', '#..#####', '#....#..', '#.######'];
      const CHU = ['...#....', '#######.', '#..#..#.', '#..#..#.', '#######.', '...#....', '...#....', '...#....'];
      [KO, SHO, CHU].forEach((g, i) => stampRows(v, g, 0xd8242a, -25 + i * 18, 24, 1, 'xy', 2));
      // two strips of tape over the top corners
      for (const sx of [-1, 1]) {
        for (let i = -13; i <= 13; i++) for (let j = -4; j <= 4; j++) {
          const x = R((sx < 0 ? -W + 2 : W - 3) + (i * sx - j) * 0.7071 * 1), y = R(H - 3 + (i + j * sx) * 0.7071 * -1 * -1);
          v.set(x, y, 1, gloss(Math.abs(j) === 4 ? 0xe2d8b0 : 0xeee6c6));
        }
      }
    },
  },

  // ------------------------------------------------------------- corner cobweb
  cobweb: {
    name: 'Corner Cobweb', voxel: 0.004,
    build(v) {
      v.jitter = 0.02;
      // anchored at the top-left corner (x = 0, y = 100), web plane facing +z, billowing slightly
      const thread = gloss(0xe6e6e0), dusty = gloss(0xc4c0b4);
      const at = (r, a) => [R(Math.cos(a) * r), R(100 - Math.sin(a) * r), R(Math.sin(Math.PI * clamp(r / 95, 0, 1)) * 3)];
      const angles = [];
      for (let i = 0; i <= 8; i++) angles.push((i / 8) * (Math.PI / 2) * 0.92 + 0.06 + (hash(i, 0, 0, 3) - 0.5) * 0.08);
      const lens = angles.map((a, i) => 70 + hash(i, 1, 0, 3) * 28);
      angles.forEach((a, i) => { for (let r = 0; r <= lens[i]; r++) v.set(...at(r, a), hash(i, r >> 3, 0, 4) < 0.15 ? dusty : thread); });
      // edge threads along the two walls
      for (let x = 0; x <= 96; x++) v.set(x, 100, 0, thread);
      for (let y = 6; y <= 100; y++) v.set(0, y, 0, thread);
      // sagging spiral threads between neighbouring spokes
      for (const rk of [9, 16, 24, 33, 43, 54, 66, 79]) {
        for (let i = 0; i < angles.length - 1; i++) {
          if (rk > Math.min(lens[i], lens[i + 1]) - 3 || hash(i, rk, 0, 5) < 0.14) continue;
          const steps = 24;
          for (let k = 0; k <= steps; k++) {
            const t = k / steps;
            const a = angles[i] + (angles[i + 1] - angles[i]) * t;
            const r = rk - Math.sin(Math.PI * t) * rk * 0.12;
            v.set(...at(r, a), rk > 60 && hash(i, k, rk, 6) < 0.2 ? dusty : thread);
          }
        }
      }
      // a torn flap hanging down and a couple of dust clumps caught in the web
      for (let y = 60; y >= 34; y--) v.set(R(58 + Math.sin(y * 0.3) * 1.5), y, 2, y < 38 ? dusty : thread);
      v.box(57, 32, 2, 59, 33, 2, gloss(0x9a948a));
      v.box(30, 70, 1, 31, 71, 1, gloss(0xa8a296)); v.set(18, 86, 1, gloss(0xb89060)); v.set(19, 86, 1, gloss(0x9a7040));
    },
  },

  // ------------------------------------------------------------- the settings gear (spins in the 3D menu)
  menu_gear: {
    name: 'Machined Gear', voxel: 0.005,
    build(v) {
      v.jitter = 0.012;
      const TEETH = 14, RT = 30, RR = 25.5, RIM = 22, HUB = 10;
      const steel = (x, y, z, f = 1) => {
        const a = Math.atan2(y + 0.5, x + 0.5), d = Math.hypot(x + 0.5, y + 0.5);
        const brushed = 0.95 + hash(R(a * 60), 0, 0, 3) * 0.06 + (R(d) % 3 === 0 ? 0.03 : 0);
        return metal(shade(0xd2dae2, brushed * f));
      };
      for (let x = -RT - 1; x <= RT; x++) for (let y = -RT - 1; y <= RT; y++) {
        const px = x + 0.5, py = y + 0.5, d = Math.hypot(px, py), a = Math.atan2(py, px);
        const pitch = TAU / TEETH;
        const ph = ((a / pitch) % 1 + 1) % 1 - 0.5; // -0.5..0.5 across one tooth pitch
        const tooth = d > RR && d <= RT && Math.abs(ph) <= 0.27 - (d - RR) / (RT - RR) * 0.09;
        if (!(d <= RR || tooth)) continue;
        // lightening holes in the web
        let hole = false;
        for (let k = 0; k < 5; k++) { const ha = k * TAU / 5 + 0.3; if (Math.hypot(px - Math.cos(ha) * 16, py - Math.sin(ha) * 16) < 4.2) hole = true; }
        if (d < 3.2) hole = true; // axle bore
        if (hole) continue;
        const web = d > HUB && d < RIM;
        const zr = web ? 3 : d <= HUB ? 8 : 6;
        for (let z = -zr; z < zr; z++) {
          const face = z === -zr || z === zr - 1;
          let c;
          if (d <= HUB) {
            c = metal(shade(0xf0c054, face ? (R(d) % 2 ? 1.05 : 0.92) : 0.86));
            if (d < 4.2) c = metal(0x6a5428);
          } else if (tooth || d > RR - 1) c = steel(x, y, z, face ? 1.08 : 0.86);
          else if (face && (d > RIM - 1 && d < RIM + 0.5)) c = steel(x, y, z, 0.8); // inner lip
          else if (face && Math.abs(d - (HUB + 0.8)) < 0.6) c = steel(x, y, z, 0.78);
          else c = steel(x, y, z, face ? 1 : 0.84);
          v.set(x, y, z, c);
        }
        // tooth tip chamfer
        if (tooth && d > RT - 1.2) { v.remove(x, y, -6); v.remove(x, y, 5); }
      }
      // hex bolts on both faces of the hub
      for (let k = 0; k < 6; k++) {
        const ba = k * TAU / 6;
        const bx = Math.cos(ba) * 6.6 - 0.5, by = Math.sin(ba) * 6.6 - 0.5;
        for (let x = Math.floor(bx - 2); x <= Math.ceil(bx + 2); x++) for (let y = Math.floor(by - 2); y <= Math.ceil(by + 2); y++) {
          const dx = x - bx, dy = y - by;
          if (Math.max(Math.abs(dx) * 0.866 + Math.abs(dy) * 0.5, Math.abs(dy)) > 1.75) continue;
          for (const [z, top] of [[8, 9], [-9, -10]]) {
            v.set(x, y, z, metal(0x8a929c)); v.set(x, y, top, metal(Math.hypot(dx, dy) < 0.8 ? 0x5a626c : 0xa8b0ba));
          }
        }
      }
      // keyway notch in the bore
      for (let z = -8; z < 8; z++) { v.remove(-1, 2, z); v.remove(0, 2, z); v.remove(-1, 3, z); v.remove(0, 3, z); }
      v.pivot = { x: 0, y: 0, z: 0 };
    },
  },
};

export default quest;
