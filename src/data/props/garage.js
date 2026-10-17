// Garage props — the cozy clutter of a Japanese hobby warehouse garage at golden-hour dusk.
// Each entry: { name, voxel (metres per voxel), build(v) }. Facing +z, bottom-centre origin.
// Helpers are exported so the street prop library can share them.
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass, enc, decColor, decMat, MAT } from '../../voxel/VoxelModel.js';

// ------------------------------------------------------------------ helpers
/** Deterministic hash → [0,1). */
export function hash(x, y, z = 0, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul((s | 0) + 1013, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Smooth value noise in [0,1). sc = feature size in voxels. */
export function vnoise(x, y, z, sc = 4, s = 0) {
  const fx = x / sc + 0.371, fy = y / sc + 0.529, fz = z / sc + 0.173; // keep lattice planes off integer voxels
  const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
  const sm = (t) => t * t * (3 - 2 * t);
  const ux = sm(fx - ix), uy = sm(fy - iy), uz = sm(fz - iz);
  let r = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) {
    r += (dx ? ux : 1 - ux) * (dy ? uy : 1 - uy) * (dz ? uz : 1 - uz) * hash(ix + dx, iy + dy, iz + dz, s);
  }
  return r;
}
/** Shade a (possibly material-encoded) colour, keeping its material. */
export function sh(c, f) {
  if (c >= 0x1000000) return enc(shade(decColor(c), f), decMat(c));
  return shade(c, f);
}
/** Colour function with per-voxel brightness noise. */
export const grain = (c, amt = 0.06, s = 0) => (x, y, z) => sh(c, 1 + (hash(x, y, z, s) - 0.5) * 2 * amt);
/** Solid box filled with a colour function. */
export function fill(v, x0, y0, z0, x1, y1, z1, fn) { return v.shape(x0, y0, z0, x1, y1, z1, () => true, fn); }
/** Recolour existing voxels inside a box: fn(x,y,z,colour,mat) -> new raw/encoded colour or undefined. */
export function tint(v, x0, y0, z0, x1, y1, z1, fn) {
  v.recolor((x, y, z, c, m) => {
    if (x < x0 || x > x1 || y < y0 || y > y1 || z < z0 || z > z1) return undefined;
    const r = fn(x, y, z, c, m);
    if (r === undefined || r === null) return undefined;
    return r >= 0x1000000 ? r : enc(r, m);
  });
  return v;
}
/** Darken everything below y1 (grime/dust gradient). Glow voxels untouched. */
export function grime(v, y0, y1, fmin = 0.75, col = null) {
  v.recolor((x, y, z, c, m) => {
    if (y >= y1 || m === MAT.GLOW || m === MAT.GLASS) return undefined;
    const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
    const f = fmin + (1 - fmin) * t;
    const base = col ? mix(c, col, (1 - t) * 0.35) : c;
    return enc(shade(base, f), m);
  });
  return v;
}
/** Settle dust on upward-facing voxels (blotchy). */
export function dust(v, col = 0xb8ad98, amt = 0.35, sc = 3, s = 0) {
  v.recolor((x, y, z, c, m) => {
    if (m === MAT.GLOW || m === MAT.GLASS || v.has(x, y + 1, z)) return undefined;
    const t = amt * (0.4 + vnoise(x, y, z, sc, s) * 0.9);
    return enc(mix(c, col, Math.min(0.85, t)), m);
  });
  return v;
}
/** Random speckles of colour over existing voxels in a box. */
export function speckle(v, x0, y0, z0, x1, y1, z1, col, p = 0.05, s = 0) {
  v.paint(() => v.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => hash(x, y, z, s) < p, col));
  return v;
}
/** Blotchy patches (rust, moss, stains) using value noise. */
export function blotch(v, x0, y0, z0, x1, y1, z1, col, thr = 0.7, sc = 3, s = 0) {
  v.paint(() => v.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => vnoise(x, y, z, sc, s) + hash(x, y, z, s + 7) * 0.12 > thr, col));
  return v;
}
/** Chip voxels on the edges of a box (worn paint showing bare material). */
export function edgeWear(v, x0, y0, z0, x1, y1, z1, col, p = 0.3, s = 0) {
  v.paint(() => v.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => {
    const n = (x === x0 || x === x1) + (y === y0 || y === y1) + (z === z0 || z === z1);
    return n >= 2 && hash(x, y, z, s) < p;
  }, col));
  return v;
}
/** True for light neutral greys (chrome / steel / aluminium colours). */
export function isSilver(c) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return r > 140 && g > 140 && b > 140 && Math.max(r, g, b) - Math.min(r, g, b) < 34;
}
/** Thick line made of a square cross-section (w×w) — for rails, rods, tubes. */
export function rod(v, x0, y0, z0, x1, y1, z1, c, w = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1) * 2;
  const o = Math.floor((w - 1) / 2);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t), z = Math.round(z0 + (z1 - z0) * t);
    if (w <= 1) v.set(x, y, z, c);
    else v.box(x - o, y - o, z - o, x - o + w - 1, y - o + w - 1, z - o + w - 1, c);
  }
  return v;
}
/** Polyline through points [[x,y,z],...] */
export function path(v, pts, c, radius = 0) {
  for (let i = 0; i < pts.length - 1; i++) v.line(...pts[i], ...pts[i + 1], c, radius);
  return v;
}

// ------------------------------------------------------------- pixel font
// 7-row Japanese glyphs (hand-drawn, simplified) + tiny 3×5 latin/digits.
export const GLYPHS = {
  '止': ['...#...', '...#...', '.#.####', '.#.#...', '.#.#...', '.#.#...', '#######'],
  'ま': ['...#...', '#######', '...#...', '.#####.', '...#...', '.####..', '#..#.##', '.##....'],
  'れ': ['.#.....', '.#.##..', '####.#.', '.##..#.', '.#...#.', '##...#.', '.#...##'],
  'お': ['.#...#.', '####..#', '.#.....', '.####..', '##...#.', '#.#..#.', '.##.#..'],
  '米': ['.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '#..#..#', '...#...'],
  'み': ['.####..', '...#...', '..#..#.', '.######', '#.#..#.', '##..#..', '...#...'],
  'か': ['.#.....', '#####.#', '.#..#.#', '.#..#..', '#...#..', '#...#..', '#..##..'],
  'ん': ['..#....', '..#....', '.#.....', '.##....', '#.#....', '#..#..#', '#...##.'],
  'ラ': ['.#####.', '.......', '#######', '......#', '.....#.', '...##..', '.##....'],
  'ー': ['.......', '.......', '.......', '#######', '.......', '.......', '.......'],
  'メ': ['.....#.', '.....#.', '.#..#..', '..##...', '...##..', '..#..#.', '##....#'],
  'ン': ['##.....', '.......', '......#', '.....#.', '....#..', '..##...', '##.....'],
  'ガ': ['..#..#.#', '######..', '..#..#..', '..#..#..', '.#...#..', '.#...#..', '#..##...'],
  'チ': ['....##.', '.###...', '...#...', '#######', '...#...', '..#....', '##.....'],
  'ャ': ['......', '......', '.#....', '.#####', '.#..#.', '..#...', '..#...'],
  '〒': ['#######', '.......', '#######', '...#...', '...#...', '...#...', '...#...'],
  '灯': ['.#..####', '##.#..#.', '.#....#.', '.#....#.', '.##...#.', '#.#...#.', '#..#..#.', '#...##..'],
  '油': ['#....#..', '.#...#..', '...#####', '#..#.#.#', '.#.#####', '...#.#.#', '.#.#.#.#', '#..#####'],
  '福': ['.#..####', '####....', '..#.####', '.##.#..#', '#.#.####', '..#.####', '..#.#.##', '..#.####'],
  '生': ['.#.#...', '.#.#...', '#####..', '#..#...', '.#####.', '...#...', '#######'],
  '消': ['#.#.#.#', '...###.', '#.#.#.#', '..#####', '.##...#', '..#####', '#.#####', '..#...#'],
  '火': ['...#...', '#..#..#', '.#.#.#.', '...#...', '..#.#..', '.#...#.', '#.....#'],
  '器': ['###.###', '#.#.#.#', '###.###', '...#.#.', '#######', '.#...#.', '###.###', '#.#.#.#', '###.###'],
  '安': ['...#...', '#######', '#..#..#', '..#....', '#######', '.#..#..', '#..#.##'],
  '全': ['...#...', '..#.#..', '.#...#.', '#######', '...#...', '.#####.', '#######'],
  P: ['##.', '#.#', '##.', '#..', '#..'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  L: ['#..', '#..', '#..', '#..', '###'], E: ['###', '#..', '##.', '#..', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'], 8: ['###', '#.#', '###', '#.#', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  ' ': ['..', '..', '..', '..', '..'],
};
/** Build pixel rows for a string (horizontal or vertical stacking). */
export function textRows(str, { gap = 1, vertical = false } = {}) {
  const gl = [...str].map((ch) => GLYPHS[ch] || GLYPHS[' ']);
  if (vertical) {
    const w = Math.max(...gl.map((g) => g[0].length));
    const rows = [];
    gl.forEach((g, i) => {
      const pad = Math.floor((w - g[0].length) / 2);
      for (const r of g) rows.push('.'.repeat(pad) + r + '.'.repeat(w - r.length - pad));
      if (i < gl.length - 1) for (let k = 0; k < gap; k++) rows.push('.'.repeat(w));
    });
    return rows;
  }
  const h = Math.max(...gl.map((g) => g.length));
  const rows = [];
  for (let r = 0; r < h; r++) {
    rows.push(gl.map((g) => (g[r] || '.'.repeat(g[0].length))).join('.'.repeat(gap)));
  }
  return rows;
}
/**
 * Paint Japanese pixel text onto a surface. (x, y) = top-left in model coords, x is always the
 * MINIMUM coordinate along the text's horizontal axis; rows are flipped where needed so the text reads
 * correctly from the face's side ('+z','-z','+x','-x','+y').
 */
export function text(v, str, x, y, col, { dir = '+z', raise = false, gap = 1, vertical = false, scale = 1, depth = 1 } = {}) {
  let rows = textRows(str, { gap, vertical });
  if (scale > 1) rows = rows.flatMap((r) => Array(scale).fill([...r].map((ch) => ch.repeat(scale)).join('')));
  if (dir === '+x' || dir === '-z') rows = rows.map((r) => [...r].reverse().join(''));
  v.project(rows, { '#': col }, x, y, dir, { raise, depth });
  return rows;
}
export const textWidth = (str, gap = 1) => textRows(str, { gap })[0].length;

// ---------------------------------------------------------------- palette
const P = {
  cardboard: 0xc49a62, cardboardD: 0x9c7444, tape: 0xd9c58e,
  galv: 0xa9afb2, rubber: 0x2b2a2b, enamelRed: 0xc8322b,
};

/** Cardboard colour function with fibre streaks. */
const cardboardFn = (base = P.cardboard, s = 1) => (x, y, z) => {
  const n = vnoise(x, y * 3, z, 5, s) * 0.08 + hash(x, y, z, s) * 0.05;
  return shade(base, 0.94 + n);
};
/** Wood grain colour function: stripes along `axis`. */
const woodFn = (base, axis = 'x', s = 3) => (x, y, z) => {
  const a = axis === 'x' ? [y, z] : axis === 'y' ? [x, z] : [x, y];
  const g = vnoise(a[0] * 3 + a[1] * 0.7, a[1] * 3, 0, 6, s);
  const ring = Math.sin(g * 18) * 0.5 + 0.5;
  return shade(base, 0.86 + ring * 0.16 + hash(x, y, z, s) * 0.05);
};

// ------------------------------------------------------------- garage props
const DRINKS = {
  water: { kind: 'pet', liquid: 0xdde9f2, label: 0x3a86d6, cap: 0x2f6fd6 },
  water2: { kind: 'pet', liquid: 0xe4f0f4, label: 0x5fc0e8, cap: 0xffffff },
  greentea: { kind: 'pet', liquid: 0xc8c050, label: 0x3c8a3c, cap: 0x2c6a2c },
  greentea2: { kind: 'pet', liquid: 0xb8b248, label: 0xe8e0c0, cap: 0x3c8a3c },
  mugicha: { kind: 'pet', liquid: 0xa8602a, label: 0xf2e2b0, cap: 0xd8a040 },
  sports: { kind: 'pet', liquid: 0xe8eef8, label: 0x2f6fd6, cap: 0x2f6fd6 },
  hottea: { kind: 'pet', liquid: 0xb07830, label: 0xd03a2a, cap: 0xe8a030 },
  cola: { kind: 'can', body: 0xd02a26, band: 0xffffff },
  orange: { kind: 'can', body: 0xff8a1a, band: 0xfff0a0 },
  melon: { kind: 'can', body: 0x4cbf4a, band: 0xf8f8f0 },
  coffeeB: { kind: 'can', body: 0x2a2220, band: 0xd8a83a },
  coffeeC: { kind: 'can', body: 0x7a4a2a, band: 0xf0e0c0 },
  milktea: { kind: 'can', body: 0xe8d4b0, band: 0x8a5a3a },
  energy: { kind: 'can', body: 0x2a3a9a, band: 0xffd23f },
  cocoa: { kind: 'can', body: 0x6a3a26, band: 0xf2b8c8 },
  corn: { kind: 'can', body: 0xf2c848, band: 0x3a8a3a },
  shiruko: { kind: 'can', body: 0x7a2a2e, band: 0xf0e4c8 },
  short: { kind: 'short', body: 0x2a2220, band: 0xd8a83a },
  shortC: { kind: 'short', body: 0xc8a070, band: 0x4a2a1a },
  shortB: { kind: 'short', body: 0x1e3a6a, band: 0xffffff },
};

function drinkSample(v, cx, y0, z0, d, lit = 0.72) {
  const L = (c) => glow(shade(c, lit));
  if (d.kind === 'pet') {
    v.box(cx - 1, y0, z0, cx + 1, y0 + 6, z0 + 2, L(d.liquid));
    v.box(cx - 1, y0 + 2, z0, cx + 1, y0 + 4, z0 + 2, L(d.label));
    v.set(cx, y0 + 7, z0 + 1, L(d.liquid)); v.set(cx, y0 + 7, z0 + 2, L(d.liquid));
    v.set(cx, y0 + 8, z0 + 1, L(d.cap)); v.set(cx, y0 + 8, z0 + 2, L(d.cap));
    v.set(cx + 1, y0 + 5, z0 + 2, glow(0xffffff)); // highlight
  } else if (d.kind === 'can') {
    v.box(cx - 1, y0, z0, cx + 1, y0 + 6, z0 + 2, L(d.body));
    v.box(cx - 1, y0 + 3, z0, cx + 1, y0 + 3, z0 + 2, L(d.band));
    v.set(cx - 1, y0 + 5, z0 + 2, L(d.band));
    v.box(cx - 1, y0 + 7, z0, cx + 1, y0 + 7, z0 + 2, L(0xc8ccd0));
  } else {
    v.box(cx - 1, y0, z0, cx + 1, y0 + 4, z0 + 2, L(d.body));
    v.box(cx - 1, y0 + 2, z0, cx + 1, y0 + 2, z0 + 2, L(d.band));
    v.box(cx - 1, y0 + 5, z0, cx + 1, y0 + 5, z0 + 2, L(0xc8ccd0));
  }
}

/** Tapered cylinder (frustum) along y. */
function frustum(v, cx, y0, cz, r0, r1, h, c) {
  for (let i = 0; i < h; i++) v.cylinder(cx, y0 + i, cz, r0 + (r1 - r0) * (h <= 1 ? 0 : i / (h - 1)), 1, typeof c === 'function' ? c(i) : c);
  return v;
}

/** A cup of instant noodles. */
function noodleCup(v, cx, y0, cz, band, lid, axis = 'y') {
  const cup = new (v.constructor)();
  frustum(cup, 0, 0, 0, 3.4, 4.4, 9, (i) => (i >= 3 && i <= 5 ? band : i === 8 ? 0xf4f0e6 : 0xfbf8f0));
  cup.cylinder(0, 9, 0, 4.3, 1, lid);
  cup.paint(() => { cup.cylinder(0, 9, 0, 2.2, 1, shade(lid, 1.15)); });
  cup.project(['#.#', '.#.'], { '#': 0xffffff }, -1, 5, '+z');
  cup.set(0, 10, 4, 0xe8e0d0); // lid tab
  if (axis === 'z') {
    const t = new (v.constructor)();
    cup.forEach((x, y, z, c) => t.set(x, z + 4, y - 5, c));
    v.merge(t, cx, y0, cz);
  } else v.merge(cup, cx, y0, cz);
}

const garage = {
  // ------------------------------------------------------------- vending
  vending: {
    name: 'Drink Vending Machine', voxel: 0.02,
    build(v) {
      const red = 0xc4302b, white = 0xefebe2;
      // plinth
      v.box(-23, 0, -17, 23, 2, 15, C.charcoal);
      // cabinet
      fill(v, -24, 3, -18, 24, 91, 16, grain(red, 0.04, 1));
      fill(v, -23, 4, 17, 23, 89, 17, grain(white, 0.025, 2)); // front door
      // rounded top edge
      v.box(-24, 91, 16, 24, 91, 16, null);
      v.box(-24, 91, -18, 24, 91, -18, null);
      // ---- display window
      v.box(-21, 46, 12, 13, 86, 17, null);
      v.box(-21, 46, 11, 13, 86, 11, glow(0xf2f6ff));
      // window frame
      v.box(-22, 45, 17, 14, 45, 17, gloss(0xb9bcc0)); v.box(-22, 87, 17, 14, 87, 17, gloss(0xb9bcc0));
      v.box(-22, 45, 17, -22, 87, 17, gloss(0xb9bcc0)); v.box(14, 45, 17, 14, 87, 17, gloss(0xb9bcc0));
      const rows = [
        { y: 74, temp: 'c', items: ['water', 'greentea', 'greentea2', 'mugicha', 'cola', 'orange', 'melon', 'sports', 'water2'] },
        { y: 60, temp: 'c', items: ['coffeeB', 'coffeeC', 'short', 'coffeeB', 'milktea', 'energy', 'shortB', 'cola', 'shortC'] },
        { y: 46, temp: 'h', items: ['short', 'shortC', 'corn', 'shiruko', 'hottea', 'hottea', 'cocoa', 'coffeeC', 'corn'] },
      ];
      rows.forEach((row, ri) => {
        const yb = row.y;
        // shelf band (outside the glass)
        fill(v, -21, yb, 12, 13, yb + 2, 17, grain(0xdcd9d2, 0.02, 4));
        v.box(-21, yb + 3, 12, 13, yb + 3, 16, glow(0xc8ccd4)); // lit shelf lip
        row.items.forEach((id, i) => {
          const cx = -19 + 4 * i;
          drinkSample(v, cx, yb + 4, 13, DRINKS[id]);
          const hot = row.temp === 'h' ? i !== 4 : (ri === 1 && (i === 2 || i === 8));
          v.set(cx - 1, yb + 2, 17, glow(0xfffaf0)); v.set(cx, yb + 2, 17, glow(0xfffaf0)); v.set(cx + 1, yb + 2, 17, glow(0xfffaf0));
          v.set(cx, yb + 2, 17, glow(0xe8e0d0));
          const tc = hot ? glow(0xff4a3a) : glow(0x3aa0ff);
          v.box(cx - 1, yb + 1, 17, cx + 1, yb + 1, 17, tc);
          v.set(cx, yb, 18, gloss(0xf4f4f4)); // push button
          if ((i + ri) % 5 === 3) v.set(cx, yb, 18, glow(0xff5a4a)); // 売切 (sold out) lamp
        });
      });
      // glass front over the samples
      for (const yb of [74, 60, 46]) v.box(-21, yb + 3, 17, 13, yb + 12, 17, glass(0xdfeef6));
      v.box(-21, 86, 17, 13, 86, 17, glass(0xdfeef6));
      // header light panel
      v.box(-22, 88, 17, 22, 89, 18, glow(0xfff4dc));
      v.box(-22, 88, 18, 22, 88, 18, glow(0xff6050));
      // ---- payment column
      fill(v, 15, 44, 17, 22, 86, 17, grain(0xe2ded6, 0.02, 5));
      v.box(16, 76, 18, 21, 79, 18, glow(0x1e3a22)); // money display
      v.box(17, 77, 18, 18, 78, 18, glow(0x58ff7a)); v.box(20, 77, 18, 20, 78, 18, glow(0x58ff7a));
      v.box(16, 66, 18, 21, 71, 18, gloss(0xc8ccd2)); // bill slot plate
      v.box(17, 68, 18, 20, 68, 18, C.ink);
      v.set(18, 70, 18, glow(0x58ff7a)); v.set(19, 70, 18, glow(0x58ff7a));
      v.box(17, 56, 18, 20, 62, 18, gloss(0xd4d6da)); // coin slot plate
      v.box(18, 57, 18, 19, 61, 18, C.ink);
      v.box(17, 51, 19, 20, 52, 19, gloss(0xe0e2e6)); // return lever
      v.box(16, 47, 18, 21, 48, 18, glow(0xffd84a)); // "change" lamp strip
      // ---- lower advertising panel (brand-free cool wave)
      v.paint(() => {
        fill(v, -23, 20, 17, 23, 43, 17, (x, y) => {
          const t = (y - 20) / 23;
          const wave = Math.sin(x * 0.22 + 1) * 2.5 + 31;
          if (Math.abs(y - wave) < 1.2) return 0xffffff;
          if (Math.abs(y - wave + 5) < 0.7) return 0xbfe6ff;
          const bub = hash(x, y, 3, 9) < 0.03 && y > 24;
          return bub ? 0xe8f6ff : mix(0x1d4fae, 0x6cc6ff, t);
        });
      });
      // bottle illustration on the panel
      v.project(['..##..', '..##..', '.####.', '######', '#WW###', '#WW###', '######', '#RRRR#', '#RRRR#', '######', '######', '.####.'],
        { '#': 0x9fd8ff, W: 0xffffff, R: 0xff5a4a }, 12, 40, '+z');
      // ---- outlet
      v.box(-21, 4, 17, 11, 18, 18, C.charcoal);
      v.box(-20, 5, 12, 10, 17, 18, null);
      v.box(-20, 5, 11, 10, 17, 11, 0x141214);
      v.box(-20, 12, 17, 10, 17, 17, gloss(0x3a3c44)); // flap
      v.box(-20, 12, 17, 10, 12, 17, gloss(0x55585f));
      v.box(-20, 5, 12, 10, 5, 16, 0x2a2828);
      // coin return cup
      v.box(15, 8, 17, 21, 14, 18, gloss(0xb8bbc0));
      v.box(16, 9, 16, 20, 12, 18, null);
      v.box(16, 9, 15, 20, 12, 15, 0x1a1819);
      v.box(-23, 3, 17, 23, 3, 17, C.charcoal); // kick plate
      // ---- side graphics: white swoosh + stickers
      v.paint(() => {
        v.shape(-24, 4, -18, 24, 90, 16, (x, y, z) => {
          const c = 40 + Math.sin(z * 0.12) * 8;
          return (x === -24 || x === 24) && Math.abs(y - c - z * 0.5) < 2.2;
        }, 0xf6f2ea);
      });
      v.project(['YYYYY', 'YKKKY', 'YKYKY', 'YKKKY', 'YYYYY'], { Y: 0xffd23f, K: C.ink }, 4, 64, '+x');
      v.project(['WWWWWW', 'WBBBBW', 'WBWWBW', 'WBBBBW', 'WWWWWW'], { W: 0xf4f4ee, B: 0x3a7a4a }, -10, 60, '+x');
      v.project(['GGGG', 'GGGG', 'GGGG'], { G: 0xd8d2b4 }, 2, 30, '+x'); // peeled sticker remains
      // top dust + bottom grime + wear
      tint(v, -24, 91, -18, 24, 91, 16, (x, y, z, c) => shade(mix(c, 0x8a8070, 0.35), 1));
      grime(v, 0, 14, 0.72, 0x3a3028);
      for (const x of [-24, 24]) blotch(v, x, 3, -18, x, 12, 16, 0x8a3a22, 0.76, 2, 11);
      edgeWear(v, -24, 3, -18, 24, 91, 16, 0x8e2622, 0.25, 3);
      edgeWear(v, -24, 3, -18, 24, 91, 16, 0x6e6a66, 0.06, 4);
    },
  },

  // ------------------------------------------------------------- bicycle
  bicycle: {
    name: 'Mamachari Bicycle', voxel: 0.02,
    build(v) {
      const frame = gloss(0x7cbfa6), frameD = gloss(0x5a9a84);
      const chrome = gloss(0xc9cdd3), tyre = 0x2a2828, brown = 0x5a3a28;
      const RA = [-27, 16], FA = [27, 16];
      const wheel = (cx, cy) => {
        v.torus(cx, cy, 0, 14.6, 1.25, tyre, 'z');
        v.torus(cx, cy, 0, 12.8, 0.55, gloss(0xe4e8ee), 'z');
        v.cylinder(cx, cy, -2, 1.3, 5, gloss(0xd8dce2), 'z');
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2 + (cx > 0 ? 0.1 : 0.3);
          const zs = k % 2 ? 1 : -1;
          v.line(cx + Math.cos(a) * 1.5, cy + Math.sin(a) * 1.5, zs, cx + Math.cos(a) * 12.3, cy + Math.sin(a) * 12.3, 0, gloss(0xb4b8be));
        }
        // tread texture
        v.paint(() => v.shape(cx - 17, cy - 17, -2, cx + 17, cy + 17, 2, (x, y, z) => {
          const d = Math.hypot(x - cx, y - cy);
          return d > 15.2 && ((Math.atan2(y - cy, x - cx) * 40 / Math.PI) | 0) % 2 === 0;
        }, 0x3a3836));
      };
      wheel(...RA); wheel(...FA);
      // fenders (mudguards)
      const fender = (cx, cy, a0, a1) => {
        v.shape(cx - 19, cy - 19, -2, cx + 19, cy + 19, 2, (x, y, z) => {
          const d = Math.hypot(x - cx, y - cy);
          let a = Math.atan2(y - cy, x - cx) * 180 / Math.PI; if (a < -90) a += 360;
          return d >= 16.6 && d < 17.8 && a >= a0 && a <= a1 && (Math.abs(z) < 2 || d < 17.2);
        }, chrome);
      };
      fender(...RA, 30, 205); fender(...FA, -15, 150);
      v.box(-44, 13, -1, -44, 15, 1, gloss(0xe0302a)); // rear reflector
      v.box(43, 8, -1, 43, 12, 1, 0xf2efe6); // front mud flap
      // frame
      const tube = (pts, c = frame, r = 0.9) => path(v, pts.map((p) => [p[0], p[1], p[2] || 0]), c, r);
      tube([[21, 31], [17, 25], [12, 19], [6, 14], [0, 12], [-4, 12]], frame, 1.1); // step-through down tube
      tube([[-4, 12], [-11, 36]]); // seat tube
      tube([[21, 30], [18, 39]], frame, 1.0); // head tube
      for (const zs of [-2, 2]) {
        rod(v, -4, 12, zs, -27, 16, zs, frameD);
        rod(v, -10, 33, zs > 0 ? 1 : -1, -27, 16, zs, frameD);
        rod(v, 21, 30, zs > 0 ? 1 : -1, 27, 16, zs, frame); // fork
      }
      // chain case on the drive side (+z)
      v.shape(-32, 4, 3, 4, 22, 4, (x, y, z) => {
        const ax = -4, ay = 12, bx = -27, by = 16;
        const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
        const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
        return Math.hypot(x - px, y - py) <= 6.5 - t * 3;
      }, frame);
      v.paint(() => v.shape(-32, 4, 4, 4, 22, 4, (x, y) => Math.hypot(x + 4, y - 12) < 2.5, chrome));
      v.project(['WWWW.WW'], { W: 0xf6f2ea }, -18, 15, '+z'); // emblem stripe
      // crank + pedals
      rod(v, -4, 12, 5, 0, 5, 5, chrome); v.box(-1, 4, 5, 2, 5, 8, C.charcoal);
      rod(v, -4, 12, -5, -8, 19, -5, chrome); v.box(-10, 19, -8, -7, 20, -5, C.charcoal);
      // seat post + saddle with springs
      rod(v, -11, 36, 0, -12, 41, 0, chrome);
      v.shape(-18, 41, -4, -6, 44, 4, (x, y, z) => {
        const hw = x < -10 ? 3.6 : 3.6 - (x + 10) * 0.6;
        return Math.abs(z) <= hw && !(y === 44 && (Math.abs(z) > hw - 1 || x === -18));
      }, (x, y) => (y === 41 ? 0x2a1c14 : y === 44 ? shade(brown, 1.15) : brown));
      for (const zs of [-2, 2]) { v.set(-16, 40, zs, chrome); v.set(-16, 39, zs, gloss(0x9aa0a8)); v.set(-15, 40, zs, gloss(0x9aa0a8)); }
      // rear carrier rack
      for (const zs of [-4, 4]) { rod(v, -41, 35, zs, -14, 35, zs, chrome); rod(v, -39, 35, zs, -27, 17, zs > 0 ? 3 : -3, chrome); }
      for (let x = -40; x <= -16; x += 4) rod(v, x, 35, -4, x, 35, 4, chrome);
      rod(v, -14, 35, 0, -11, 33, 0, chrome);
      // kickstand (deployed)
      for (const zs of [-3, 3]) rod(v, -27, 16, zs, -36, 0, zs > 0 ? 4 : -4, gloss(0xb0b4ba));
      rod(v, -36, 0, -4, -36, 0, 4, gloss(0xb0b4ba));
      // handlebar + stem
      rod(v, 18, 39, 0, 17, 44, 0, chrome);
      for (const zs of [-1, 1]) {
        path(v, [[17, 44, 0], [16, 44, 5 * zs], [13, 44, 8 * zs], [10, 44, 10 * zs]], chrome, 0);
        rod(v, 6, 44, 10 * zs, 9, 44, 10 * zs, brown, 2);
        rod(v, 12, 44, 8 * zs, 16, 42, 9 * zs, gloss(0x9aa0a8)); // brake lever
      }
      // bell
      v.sphere(14, 46, 6, 1.4, gloss(0xe8c860)); v.set(14, 45, 6, chrome);
      // front basket (wire)
      v.shape(22, 32, -7, 36, 43, 7, (x, y, z) => {
        const shell = x === 22 || x === 36 || z === -7 || z === 7 || y === 32;
        if (!shell) return false;
        if (y === 43 || y === 32) return true;
        const onX = x === 22 || x === 36;
        const a = onX ? z : x;
        return (a % 3 === 0) || (y % 3 === 0);
      }, gloss(0xc6cad0));
      v.box(22, 43, -7, 36, 43, 7, null);
      v.shape(22, 43, -7, 36, 43, 7, (x, y, z) => x === 22 || x === 36 || z === -7 || z === 7, gloss(0xdfe2e6));
      for (const zs of [-4, 4]) rod(v, 30, 32, zs, 27, 17, zs > 0 ? 2 : -2, chrome);
      // headlamp on basket front
      v.cylinder(37, 35, 0, 1.6, 2, gloss(0xd8dce2), 'x');
      v.set(39, 35, 0, gloss(0xfff0b0));
      // ring lock + registration sticker
      v.box(-21, 24, -2, -19, 26, 2, gloss(0xc0c4ca)); v.set(-20, 25, 3, gloss(0xffd23f));
      v.project(['YY', 'YY'], { Y: 0xffe680 }, -8, 27, '+z');
      // rust specks on chrome
      tint(v, -45, 0, -8, 45, 46, 8, (x, y, z, c, m) => ((m === MAT.METAL || m === MAT.GLOSS) && isSilver(c) && vnoise(x, y, z, 2, 5) + hash(x, y, z, 6) * 0.12 > 0.9 ? C.rust : undefined));
    },
  },
  // ------------------------------------------------------------- heater
  heater: {
    name: 'Kerosene Stove & Kettle', voxel: 0.01,
    build(v) {
      const cream = (x, y, z) => gloss(shade(0xe8dcc0, 0.96 + hash(x, y, z, 1) * 0.05));
      const chrome = gloss(0xaeb2b8);
      v.cylinder(0, 0, 0, 20, 2, C.charcoal);
      v.cylinder(0, 2, 0, 19.4, 1, gloss(0x3a3634));
      v.cylinder(0, 3, 0, 18.6, 11, cream);
      v.tube(0, 13, 0, 18.9, 17, 1, gloss(0xc9bc9e));
      // fuel gauge + knob + ignition lever
      v.project(['.KKK.', 'KYYRK', 'KYRYK', '.KKK.'], { K: 0x4a4440, Y: 0xf8f0d0, R: 0xe03a2a }, -12, 11, '+z');
      v.cylinder(7, 8, 18, 2.4, 3, gloss(0x2e2c2b), 'z');
      v.set(7, 10, 21, 0xf6f2e8);
      v.box(12, 6, 16, 14, 7, 18, chrome); v.box(13, 8, 17, 13, 9, 18, gloss(0xd83a2a));
      // glowing chimney (blue flame ring at the bottom)
      for (let y = 14; y <= 36; y++) {
        let c;
        if (y <= 16) c = glow(y === 15 ? 0x6aa0ff : 0x3a66d8);
        else c = (x, yy, z) => {
          const t = (yy - 17) / 19;
          const dot = (yy % 3 === 0) && ((Math.round(Math.atan2(z, x) * 9) % 2) === 0);
          return glow(dot ? mix(0xb83a10, 0x8a2a0a, t) : mix(0xffa040, 0xff5a1e, t));
        };
        v.cylinder(0, y, 0, 11.4, 1, c);
      }
      v.cylinder(0, 14, 0, 16.5, 1, 0x2a2624);
      // chrome guard cage
      v.shape(-19, 14, -19, 19, 36, 19, (x, y, z) => {
        const d = Math.hypot(x, z);
        if (d < 16.7 || d > 18.3) return false;
        return Math.floor((Math.atan2(z, x) + Math.PI) / (2 * Math.PI) * 48) % 2 === 0;
      }, chrome);
      v.tube(0, 14, 0, 18.8, 16.6, 1, chrome); v.tube(0, 25, 0, 18.6, 16.8, 1, gloss(0xc8ccd2)); v.tube(0, 36, 0, 18.8, 16.6, 1, chrome);
      // top
      v.cylinder(0, 37, 0, 19.2, 3, cream);
      v.cylinder(0, 39, 0, 13, 1, gloss(0x4a4846));
      v.paint(() => v.shape(-19, 39, -19, 19, 39, 19, (x, y, z) => { const d = Math.hypot(x, z); return d > 14 && d < 17.5 && (x + z) % 2 === 0; }, 0x6a6258));
      // side carry handles
      for (const s of [-1, 1]) { v.box(s * 19, 33, -4, s * 21, 33, 4, chrome); v.box(s * 21, 33, -4, s * 21, 38, -3, chrome); v.box(s * 21, 33, 3, s * 21, 38, 4, chrome); v.box(s * 21, 38, -4, s * 21, 38, 4, chrome); }
      // aluminium kettle
      const al = (x, y, z) => gloss(shade(0xb4b8bc, 0.9 + vnoise(x, y, z, 3, 8) * 0.14));
      for (let i = 0; i < 9; i++) v.cylinder(0, 40 + i, 0, 9 - Math.max(0, i - 4) * 0.8, 1, al);
      v.cylinder(0, 40, 0, 8.5, 1, gloss(0x6a6662));
      v.cylinder(0, 49, 0, 5.5, 1, al); v.cylinder(0, 50, 0, 4.2, 1, al);
      v.cylinder(0, 51, 0, 1.4, 2, gloss(0x1e1c1c));
      v.line(6, 43, 5, 12, 50, 9, al, 1.3); v.line(12, 50, 9, 13, 51, 10, al, 0.9);
      for (const s of [-1, 1]) v.box(s * 6, 48, 0, s * 6, 53, 0, gloss(0xb8bcc0));
      v.box(-6, 54, 0, 6, 54, 0, gloss(0xb8bcc0));
      v.box(-4, 54, -1, 4, 55, 1, gloss(0x1e1c1c));
      // soot + dust
      grime(v, 0, 6, 0.7);
      tint(v, -9, 40, -9, 9, 42, 9, (x, y, z, c, m) => (m === MAT.GLOSS ? gloss(shade(c, 0.7)) : undefined));
    },
  },

  // ------------------------------------------------------------- beer crate
  beercrate: {
    name: 'Beer Crate', voxel: 0.01,
    build(v) {
      const yel = 0xf0bf2c;
      fill(v, -22, 0, -17, 22, 20, 17, (x, y, z) => shade(yel, 0.93 + hash(x, y, z, 2) * 0.08 + (y === 20 ? 0.05 : 0)));
      v.box(-21, 2, -16, 21, 20, 16, null);
      // lattice windows
      v.shape(-22, 4, -17, 22, 16, 17, (x, y, z) => {
        const onZ = Math.abs(z) === 17, onX = Math.abs(x) === 22;
        if (!onZ && !onX) return false;
        const a = onZ ? x : z;
        if (onZ && Math.abs(a) <= 6) return false;
        return ((a + 60) % 5 !== 0) && (y % 4 !== 0) && (Math.abs(a) < (onZ ? 20 : 15));
      }, null);
      for (const s of [-1, 1]) v.box(s * 22, 17, -6, s * 22, 18, 6, null); // handle slots
      // dividers
      for (const x of [-14, -5, 5, 14]) v.box(x, 2, -16, x, 12, 16, shade(yel, 0.85));
      for (const z of [-8, 0, 8]) v.box(-21, 2, z, 21, 12, z, shade(yel, 0.85));
      // embossed panel
      v.project(textRows('生'), { '#': shade(yel, 0.8) }, -3, 14, '+z');
      v.project(textRows('生'), { '#': shade(yel, 0.8) }, -3, 14, '-z');
      // bottles
      const amber = (x, y, z) => gloss(shade(0x6a3010, 0.9 + hash(x, y, z, 4) * 0.12));
      const cols = [-18, -9, 0, 9, 18], rz = [-12, -4, 4, 12];
      const empty = new Set([1, 11, 18]);
      cols.forEach((bx, i) => rz.forEach((bz, j) => {
        const k = i * 4 + j;
        if (empty.has(k)) return;
        v.cylinder(bx, 2, bz, 3.1, 19, amber);
        v.cylinder(bx, 21, bz, 2.3, 1, amber); v.cylinder(bx, 22, bz, 1.5, 1, amber);
        v.cylinder(bx, 23, bz, 1, 4, amber);
        v.paint(() => { v.cylinder(bx, 23, bz, 1.2, 2, gloss(0xd8b050)); v.cylinder(bx, 9, bz, 3.3, 6, 0xf4ecd8); v.cylinder(bx, 11, bz, 3.3, 2, 0xc8322a); });
        if (k !== 6) v.cylinder(bx, 27, bz, 1.3, 1, gloss(k % 3 ? 0xe0c060 : 0xd8d8d8));
        v.set(bx + 1, 18, bz + 3, gloss(0xb87a40)); // glint
      }));
      // scuffs & grime
      edgeWear(v, -22, 0, -17, 22, 20, 17, 0xffe9a0, 0.25, 5);
      grime(v, 0, 5, 0.72, 0x4a3a20);
      blotch(v, -22, 0, -17, 22, 20, 17, shade(yel, 0.8), 0.82, 3, 9);
    },
  },

  // ------------------------------------------------------------- fan
  fan: {
    name: 'Retro Electric Fan', voxel: 0.01,
    build(v) {
      const cream = (x, y, z) => gloss(shade(0xece1c8, 0.96 + hash(x, y, z, 3) * 0.05));
      const chrome = gloss(0xd8dce0), wire = gloss(0xa8adb3);
      v.cylinder(0, 0, 0, 15, 2, cream); v.cylinder(0, 2, 0, 13.6, 2, cream); v.cylinder(0, 4, 0, 9, 1, cream);
      v.cylinder(0, 0, 0, 15.2, 1, gloss(0xa89c84));
      [0xf4f0e6, 0x5aa0e8, 0x58c06c, 0xff8c2e].forEach((c, i) => v.box(-8 + i * 4, 3, 8, -6 + i * 4, 4, 12, gloss(c)));
      v.box(-6, 4, 8, -6, 4, 12, gloss(0xd8d0c0)); // first key pressed
      v.cylinder(9, 4, 6, 1.8, 2, gloss(0x3a3836)); // timer knob
      v.cylinder(0, 5, 0, 2.6, 28, cream); v.cylinder(0, 32, 0, 3, 2, gloss(0xc8bca0));
      v.cylinder(0, 34, 0, 1.6, 21, chrome);
      v.box(-2, 55, -4, 2, 60, 0, cream);
      v.ellipsoid(0, 70, -6, 7, 7, 8.5, cream);
      v.paint(() => { for (let y = 66; y <= 74; y += 2) v.box(-5, y, -15, 5, y, -12, gloss(0x8a8270)); });
      v.cylinder(0, 77, -8, 1.3, 3, chrome); v.sphere(0, 80, -8, 1.3, gloss(0x3a3836));
      // guard
      const gy = 70;
      v.torus(0, gy, 3, 16.5, 0.9, chrome, 'z');
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + 0.1;
        v.line(Math.cos(a) * 3.5, gy + Math.sin(a) * 3.5, 8, Math.cos(a) * 16, gy + Math.sin(a) * 16, 4, wire);
        if (k % 2 === 0) v.line(Math.cos(a) * 3.5, gy + Math.sin(a) * 3.5, -1, Math.cos(a) * 16, gy + Math.sin(a) * 16, 2, wire);
      }
      v.torus(0, gy, 7, 8, 0.45, wire, 'z'); v.torus(0, gy, 6, 12.5, 0.45, wire, 'z');
      // blades (pale aqua translucent plastic)
      v.shape(-15, gy - 15, 2, 15, gy + 15, 5, (x, y, z) => {
        const dy = y - gy, r = Math.hypot(x, dy);
        if (r < 3 || r > 14.3) return false;
        const a = Math.atan2(dy, x);
        for (let k = 0; k < 4; k++) {
          let da = a - (k * Math.PI / 2 + 0.5);
          da = Math.atan2(Math.sin(da), Math.cos(da));
          const w = 0.22 + 0.42 * (r / 14);
          if (Math.abs(da) < w) return z === (da > 0 ? 4 : 3);
        }
        return false;
      }, (x, y) => gloss(mix(0x5ab8d0, 0x9fdcea, Math.hypot(x, y - gy) / 16)));
      v.cylinder(0, gy, 1, 3.2, 7, cream, 'z');
      v.cylinder(0, gy, 8, 2.4, 1, gloss(0x3a6ab0), 'z');
      v.set(0, gy, 9, gloss(0xf2c14e));
      grime(v, 0, 3, 0.8);
    },
  },

  // ------------------------------------------------------------- radio
  radio: {
    name: 'Radio-Cassette Boombox', voxel: 0.008,
    build(v) {
      const body = (x, y, z) => gloss(shade(0xb4b8be, 0.95 + hash(x, y, z, 2) * 0.05));
      const chrome = gloss(0xe0e3e8);
      fill(v, -30, 1, -9, 30, 26, 8, body);
      for (const y of [1, 26]) for (const z of [-9, 8]) v.box(-30, y, z, 30, y, z, null);
      for (const x of [-30, 30]) for (const z of [-9, 8]) v.box(x, 1, z, x, 26, z, null);
      for (const x of [-27, 27]) for (const z of [-7, 6]) v.box(x - 1, 0, z, x + 1, 0, z + 1, C.charcoal);
      v.paint(() => v.box(-30, 2, 8, 30, 25, 8, gloss(0x3a3c40)));
      // speakers
      for (const cx of [-19, 19]) {
        v.cylinder(cx, 13, 6, 9.8, 3, null, 'z');
        v.shape(cx - 10, 3, 5, cx + 10, 23, 7, (x, y, z) => {
          const d = Math.hypot(x - cx, y - 13);
          if (d > 9.8) return false;
          if (z === 5) return true;
          if (z === 6) return d < 2.6 || (d > 8 && d <= 9.8);
          return false;
        }, (x, y, z) => {
          const d = Math.hypot(x - cx, y - 13);
          if (d < 2.6) return gloss(0xc8ccd2);
          if (d > 8) return 0x1c1c1e;
          return shade(0x34343a, Math.round(d) % 2 ? 1.0 : 1.25);
        });
        v.torus(cx, 13, 8, 10.4, 0.6, chrome, 'z');
      }
      // tuner window (glowing) + cassette deck
      v.box(-9, 18, 8, 9, 25, 8, chrome);
      v.box(-8, 19, 8, 8, 24, 8, glow(0xffb447));
      for (let x = -7; x <= 7; x += 2) v.set(x, 24, 8, glow(0x8a4a10));
      v.box(-7, 20, 8, 7, 20, 8, glow(0xffd890));
      v.box(3, 19, 9, 3, 24, 9, glow(0xff3020));
      v.box(-9, 2, 8, 9, 16, 8, gloss(0x2a2a2e));
      v.box(-7, 4, 7, 7, 14, 8, null);
      v.box(-7, 4, 6, 7, 14, 6, 0x262628);
      v.box(-5, 11, 6, 5, 13, 6, 0xf2ecd8); v.box(-5, 12, 6, 5, 12, 6, 0xe0503a);
      for (const rx of [-3, 3]) { v.box(rx - 1, 7, 6, rx + 1, 9, 6, 0xf4f4f0); v.set(rx, 8, 6, 0x262628); }
      v.box(-2, 7, 6, 2, 7, 6, 0x6a3a22);
      v.box(-7, 6, 8, 7, 10, 8, glass(0x8a96a0));
      v.box(-3, 2, 9, 3, 3, 9, chrome);
      // top controls
      [0x2e2e32, 0x2e2e32, 0xd83a2a, 0x2e2e32, 0x2e2e32, 0x9aa0a8].forEach((c, i) => v.box(-12 + i * 4, 27, 3, -10 + i * 4, i === 1 ? 26 : 27, 7, gloss(c)));
      for (const kx of [15, 21, -18]) { v.cylinder(kx, 27, 4, 1.6, 2, chrome); v.set(kx, 29, 5, C.ink); }
      for (let i = 0; i < 6; i++) v.set(9 + i, 25, 9, glow(i < 3 ? 0x58ff7a : i < 5 ? 0xffd23f : 0xff4030));
      // handle + antenna
      for (const x of [-23, 23]) v.box(x - 1, 27, -2, x, 32, 0, chrome);
      v.box(-23, 33, -2, 23, 33, 0, chrome);
      v.box(-10, 33, -3, 10, 34, 1, gloss(0x1e1e20));
      v.box(-28, 27, -7, 22, 27, -6, gloss(0xd8dce2)); v.sphere(23, 27, -6, 1, chrome);
      v.box(-29, 27, -8, -27, 28, -5, gloss(0x2e2e32));
      // stickers & wear
      v.project(['.Y.', 'YYY', '.Y.'], { Y: 0xffd23f }, -5, 18, '+x');
      v.project(['PPP', 'P.P', 'PPP'], { P: 0xff8fb2 }, 2, 8, '+x');
      edgeWear(v, -30, 1, -9, 30, 26, 8, gloss(0xdadde2), 0.2, 2);
    },
  },

  // ------------------------------------------------------------- fridge
  fridge: {
    name: 'Mini Fridge', voxel: 0.01,
    build(v) {
      const body = (x, y, z) => gloss(shade(mix(0xeeeadf, 0xe6dcc0, y / 120), 0.97 + hash(x, y, z, 6) * 0.04));
      for (const sx of [-21, 21]) for (const sz of [-21, 18]) v.box(sx - 1, 0, sz - 1, sx + 1, 1, sz + 1, C.charcoal);
      fill(v, -24, 2, -24, 24, 84, 20, body);
      for (const x of [-24, 24]) v.box(x, 2, -24, x, 84, -24, null);
      v.box(-24, 84, -24, 24, 84, -24, null);
      fill(v, -24, 3, 21, 24, 59, 23, body);
      fill(v, -24, 61, 21, 24, 83, 23, body);
      v.box(-24, 60, 21, 24, 60, 22, 0x8a8478);
      for (const [a, b] of [[3, 59], [61, 83]]) {
        for (const x of [-24, 24]) { v.set(x, a, 23, null); v.set(x, b, 23, null); }
        v.box(-24, a, 23, -24, b, 23, gloss(0xdcd6c8)); v.box(24, a, 23, 24, b, 23, gloss(0xdcd6c8));
      }
      const chrome = gloss(0xe2e5ea);
      for (const [a, b] of [[40, 56], [64, 76]]) {
        v.box(19, a, 24, 20, a, 24, chrome); v.box(19, b, 24, 20, b, 24, chrome); v.box(19, a, 25, 20, b, 25, chrome);
      }
      v.box(-20, 78, 24, -12, 79, 24, gloss(0xc8cacd));
      // back condenser coil
      v.shape(-18, 8, -25, 18, 78, -25, (x, y) => y % 4 === 0 || x % 6 === 0, 0x2a2826);
      // --- door clutter: memo + magnet
      v.layer(['WWWWWWWWWWW', 'WbbbbbbbbbW', 'WWWWWWWWWWW', 'WkkWkkkWkkW', 'WWWWWWWWWWW', 'WkkkkWkkWWW', 'WWWWWWWWWWW', 'WkkWkkkkkWW', 'WWWWWWWWWWW', 'WkkkWWWWWWW', 'WWWWWWWWWWW', 'WWWWWWWWWWW'],
        { W: 0xfbf8ee, b: 0xa8c0e0, k: 0x4a4a6a }, { x: -20, y: 44, z: 24 });
      v.box(-15, 44, 25, -14, 45, 25, gloss(0xe5383b));
      // delivery menu flyer + strawberry magnet
      v.layer(['RRRRRRRRRRRRR', 'RWWRWWRWWRWWR', 'RRRRRRRRRRRRR', 'YYYYYYYYYYYYY', 'YkkkkYYYoooYY', 'YYYYYYYYoooYY', 'YkkkYkkYYYYYY', 'YYYYYYYYYYYYY', 'YkkkkkYYkkkYY', 'YYYYYYYYYYYYY', 'YkkYkkkkYYYYY', 'YYYYYYYYYYYYY', 'YkkkkYYkkkkYY', 'YYYYYYYYYYYYY', 'YYYYYYYYYYYYY'],
        { R: 0xe34234, W: 0xfff4e0, Y: 0xfff0a8, k: 0x5a3a2a, o: 0xe89a3a }, { x: -4, y: 36, z: 24 });
      v.box(1, 36, 25, 2, 37, 25, gloss(0xe0302a)); v.set(1, 38, 25, gloss(0x4ab04a)); v.set(2, 38, 25, gloss(0x4ab04a));
      // polaroid photo
      v.layer(['WWWWWWWWW', 'WsssssssW', 'WsssYsssW', 'WsssssssW', 'WsskssssW', 'WgggkgggW', 'WgggggggW', 'WWWWWWWWW', 'WWWWWWWWW'],
        { W: 0xf8f6f0, s: 0x8cc8f0, Y: 0xffe060, k: 0x4a3a3a, g: 0x6ab04a }, { x: 10, y: 54, z: 24 });
      v.set(14, 54, 25, gloss(0x2a2a2e));
      // child's crayon drawing
      v.layer(['WWWWWWWWWWWWWW', 'WWooWWWWWWWWWW', 'WooooWWWWRWWWW', 'WWooWWWWRRRWWW', 'WWWWWWWRRRRRWW', 'WWWWWWWWbbbWWW', 'WWWWWWWWbdbWWW', 'WWWWWWWWbdbWWW', 'ggggggggggggggg', 'WWWWWWWWWWWWWW'],
        { W: 0xfaf8f2, o: 0xff9a2a, R: 0xe03a30, b: 0x5a8ad8, d: 0x6a4a2a, g: 0x5ab84a }, { x: -18, y: 18, z: 24 });
      v.box(-12, 18, 25, -11, 19, 25, gloss(0x3a7ae0));
      // fruit + cat magnets
      v.layer(['..YY', '.YY.', 'YY..', 'Y...'], { Y: gloss(0xffd84a) }, { x: 11, y: 30, z: 24 });
      v.layer(['G.G', 'GGG', 'GkG', 'GGG'], { G: gloss(0x8a8a90), k: C.ink }, { x: 13, y: 22, z: 24 });
      // flat stickers on the freezer door
      v.project(['..Y..', '.YYY.', 'YYYYY', '.YYY.', '.Y.Y.'], { Y: 0xffd23f }, -16, 74, '+z');
      v.project(['P.P', 'PPP', '.P.'], { P: 0xff6f9a }, 6, 74, '+z');
      v.project(['BBBB', 'BWWB', 'BWWB', 'BBBB'], { B: 0x2f6fd6, W: 0xffffff }, -4, 70, '+z');
      v.project(['.RRR.', 'RRWRR', 'RRWRR', 'RRRRR', 'RRWRR', '.RRR.'], { R: 0xe5383b, W: 0xffffff }, 10, 72, '+z');
      v.project(['ddd', 'ddd'], { d: 0xe4dcc4 }, -8, 10, '+z'); // sticker residue
      // side + bottom wear
      v.project(['.GGGGG.', 'GGWWWGG', 'GWGGGWG', 'GGGGGGG', '.GGGGG.'], { G: 0x5ab070, W: 0xffffff }, 2, 66, '+x');
      grime(v, 0, 12, 0.78, 0x5a4a30);
      blotch(v, -24, 2, 18, 24, 5, 23, gloss(0x9a6a3a), 0.8, 2, 4);
    },
  },

  // ------------------------------------------------------------- toolbox
  toolbox: {
    name: 'Red Metal Toolbox', voxel: 0.008,
    build(v) {
      const red = (x, y, z) => gloss(shade(0xc2302a, 0.93 + hash(x, y, z, 4) * 0.09));
      const chrome = gloss(0xd8dce2);
      v.box(-26, 0, -10, 26, 0, 10, 0x2e2a28);
      fill(v, -27, 1, -11, 27, 15, 11, red);
      v.box(-27, 16, -11, 27, 16, 11, gloss(0x6a1a16));
      fill(v, -28, 17, -12, 28, 18, 12, red);
      fill(v, -27, 19, -11, 27, 21, 11, red);
      fill(v, -26, 22, -10, 26, 22, 10, red);
      for (const z of [-5, 5]) v.box(-22, 23, z, 22, 23, z, gloss(0xd84a40));
      for (const x of [-12, 12]) v.box(x - 1, 23, -1, x, 25, 1, gloss(0x9aa0a8));
      v.box(-13, 26, -1, 13, 26, 1, chrome);
      v.box(-7, 26, -2, 7, 27, 2, gloss(0x1e1c1c));
      for (const x of [-19, 19]) { v.box(x - 2, 12, 12, x + 2, 19, 12, chrome); v.box(x - 1, 17, 13, x + 1, 19, 13, chrome); v.set(x, 14, 13, gloss(0x8a9098)); }
      v.box(-1, 13, 12, 1, 17, 12, gloss(0xd8b850)); v.set(0, 14, 13, C.ink);
      // masking-tape name label + old sticker
      v.layer(['TTTTTTTTTTTTTTT', 'TkkTkkkTTkkTkTT', 'TTTTTTTTTTTTTTT'], { T: 0xece0b8, k: 0x2a2a3a }, { x: -10, y: 10, z: 12 });
      v.project(['.WWW.', 'WBBBW', 'WBWBW', 'WBBBW', '.WWW.'], { W: 0xe8e8e0, B: 0x3a6ab0 }, 9, 9, '+z');
      // wear: chipped edges, rust, grime
      edgeWear(v, -28, 1, -12, 28, 22, 12, gloss(0x9aa0a8), 0.25, 1);
      blotch(v, -27, 1, -11, 27, 6, 11, 0x8a3a1e, 0.76, 2, 3);
      speckle(v, -27, 1, -11, 27, 22, 11, gloss(0xe86058), 0.02, 9);
      grime(v, 0, 5, 0.75);
    },
  },

  // ------------------------------------------------------------- cone
  cone: {
    name: 'Traffic Cone', voxel: 0.01,
    build(v) {
      v.shape(-14, 0, -14, 14, 2, 14, (x, y, z) => Math.abs(x) + Math.abs(z) <= 25 - (y === 2 ? 1 : 0) && !(y === 2 && (Math.abs(x) === 14 || Math.abs(z) === 14)),
        (x, y, z) => shade(0x2a2829, 0.9 + hash(x, y, z, 1) * 0.15));
      for (let y = 3; y <= 68; y++) {
        const r = 10.8 - (y - 3) * (8.6 / 65);
        const band = y >= 34 && y <= 46;
        const col = (x, yy, z) => {
          if (band) return gloss(shade(0xeef2f4, (yy % 3 === 0 ? 0.92 : 1) * (0.97 + hash(x, yy, z, 2) * 0.04)));
          return gloss(shade(0xff6418, 0.94 + hash(x, yy, z, 3) * 0.07 + (yy > 60 ? 0.04 : 0)));
        };
        if (y >= 66) v.tube(0, y, 0, r, r - 1.2, 1, col); else v.cylinder(0, y, 0, r, 1, col);
      }
      v.cylinder(0, 65, 0, 1, 1, 0x3a2a20);
      speckle(v, -12, 3, -12, 12, 26, 12, gloss(0xc8501a), 0.05, 4);
      blotch(v, -12, 3, -12, 12, 14, 12, gloss(0x9a5a3a), 0.84, 3, 5);
      grime(v, 0, 10, 0.82);
      blotch(v, -12, 34, -12, 12, 46, 12, gloss(0xc8ccd0), 0.8, 2, 6);
    },
  },

  // ------------------------------------------------------------- maneki-neko
  manekineko: {
    name: 'Maneki-neko Lucky Cat', voxel: 0.005,
    build(v) {
      const W = (x, y, z) => gloss(shade(0xfbf8f0, 0.97 + hash(x, y, z, 1) * 0.03));
      v.ellipsoid(0, 13, -1, 9.5, 9.5, 8.5, W);
      v.ellipsoid(0, 9, 0, 9.5, 5, 8.5, W); v.box(-10, 0, -10, 10, 4, 10, null);
      v.shape(-14, 0, -12, 14, 4, 12, (x, y, z) => { const e = y === 0 || y === 4 ? 1 : 0; return Math.abs(x) <= 14 - e && Math.abs(z) <= 12 - e; },
        (x, y, z) => (y === 4 && (Math.abs(x) === 13 || Math.abs(z) === 11)) || (y === 2 && (Math.abs(x) === 14 || Math.abs(z) === 12)) ? gloss(0xe8b84a) : gloss(shade(0x9e2a3a, 0.94 + hash(x, y, z, 2) * 0.07)));
      for (const sx of [-14, 14]) for (const sz of [-12, 12]) { v.set(sx + Math.sign(sx), 2, sz, gloss(0xf2c14e)); v.set(sx + Math.sign(sx), 1, sz, gloss(0xe8a83a)); }
      v.ellipsoid(0, 28, 0.5, 9.5, 8, 8, W);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          const w = 4 - i * 0.8;
          v.box(Math.round(s * 6 - w / 2), 33 + i, -2, Math.round(s * 6 + w / 2), 33 + i, 1, W);
        }
        v.box(s * 6 - (s > 0 ? 1 : 0), 34, 2, s * 6 + (s > 0 ? 0 : 1), 35, 2, gloss(0xf4a0a8));
      }
      v.paint(() => {
        v.ellipsoid(-5, 33, -2, 4, 3, 5, gloss(0xe8963a)); v.ellipsoid(6, 31, -5, 3.5, 3, 4, gloss(0x2e2a28));
        v.ellipsoid(-6, 13, -7, 4, 5, 4, gloss(0xe8963a)); v.ellipsoid(5, 17, -8, 3, 3, 3, gloss(0x2e2a28));
        v.shape(-11, 19, -11, 11, 20, 11, () => true, gloss(0xd8242a));
      });
      // face
      v.project(['.K.....K.', 'K.K...K.K'], { K: C.ink }, -4, 29, '+z');
      v.project(['P'], { P: 0xf07a8a }, 0, 27, '+z');
      v.project(['K.K.K', '.K.K.'], { K: C.ink }, -2, 26, '+z');
      v.project(['PP.......PP'], { P: 0xffb0bc }, -5, 26, '+z');
      v.project(['KK.........KK', '.............', 'KK.........KK'], { K: 0x6a6060 }, -9, 27, '+z');
      // bell
      v.sphere(0, 17.5, 8.5, 1.8, gloss(0xf2c14e)); v.set(0, 16, 10, C.ink);
      // raised left paw (+x) with pink pads
      v.line(6, 19, 2, 9, 30, 4, W, 2.2); v.ellipsoid(9, 34, 4, 3, 3.4, 2.6, W);
      v.project(['.P.', 'P.P'], { P: 0xf4a0a8 }, 8, 35, '+z');
      // koban coin held by the right paw
      v.ellipsoid(-3, 11, 7.5, 4, 6, 1.2, gloss(0xf2c14e));
      v.project(['.KKK.', '.....', '..K..', '.KKK.', '..K..', '.....', '.KKK.'], { K: gloss(0xb8862a) }, -5, 14, '+z');
      v.ellipsoid(-6.5, 15, 7, 2.6, 2.6, 2.4, W);
      v.line(5, 6, -8, 9, 9, -9, W, 1.4);
    },
  },

  // ------------------------------------------------------------- daruma
  daruma: {
    name: 'Daruma Doll', voxel: 0.005,
    build(v) {
      v.ellipsoid(0, 17.5, 0, 15.5, 18, 14.5, (x, y, z) => gloss(shade(0xc8221e, 0.88 + y * 0.004 + hash(x, y, z, 3) * 0.04)));
      v.box(-17, -3, -16, 17, -1, 16, null);
      const face = (x, y) => (x / 9) ** 2 + ((y - 23.5) / 7.2) ** 2;
      v.paint(() => {
        v.shape(-13, 14, 0, 13, 33, 15, (x, y) => face(x, y) <= 1, gloss(0xf6efe0));
        v.shape(-13, 14, 0, 13, 33, 15, (x, y) => face(x, y) > 1 && face(x, y) <= 1.3, gloss(0xe8b84a));
      });
      v.project(['.KKK.', 'K...K', 'K...K', 'K...K', '.KKK.'], { K: C.ink }, -7, 27, '+z');
      v.project(['.KKK.', 'KKKKK', 'KKKWK', 'KKKKK', '.KKK.'], { K: C.ink, W: 0xffffff }, 3, 27, '+z');
      v.project(['....KKK', '.KKKK..', 'KK.....'], { K: C.ink }, -9, 32, '+z');
      v.project(['KKK....', '..KKKK.', '.....KK'], { K: C.ink }, 3, 32, '+z');
      v.project(['....R....', 'KK.....KK', '.KKK.KKK.', '....K....'], { K: 0x2a2626, R: 0xe8c0a8 }, -4, 23, '+z');
      text(v, '福', -4, 12, gloss(0xf2c040));
      const swirl = ['..GGG..', '.G...G.', 'G..G..G', 'G.G.G.G', 'G..G..G', '.G...G.'];
      v.project(swirl, { G: gloss(0xe8b84a) }, -3, 22, '+x');
      v.project(swirl, { G: gloss(0xe8b84a) }, -3, 22, '-x');
      v.project(['GGGGGGGGGGGGG'], { G: gloss(0xe8b84a) }, -6, 4, '+z');
      tint(v, -16, 0, -16, 16, 2, 16, (x, y, z, c, m) => enc(shade(c, 0.8), m));
    },
  },

  // ------------------------------------------------------------- broom
  broom: {
    name: 'Bamboo Broom', voxel: 0.014,
    build(v) {
      const twig = (x, y, z) => {
        const t = hash(x, 0, z, 7);
        return shade(t < 0.3 ? 0x6e5030 : t < 0.7 ? 0x8e6e40 : 0xb08e56, 0.82 + y * 0.006 + hash(x, y, z, 2) * 0.08);
      };
      v.shape(-11, 0, -4, 11, 44, 4, (x, y, z) => {
        const hw = 10.5 - y * 0.17, ht = 3.4 - y * 0.04;
        if (Math.abs(x) > hw || Math.abs(z) > ht) return false;
        if (y < 4 && hash(x, 0, z, 3) * 4 > y + 0.7) return false;
        return hash(x, 0, z, 5) < 0.82 || Math.abs(z) < ht - 1;
      }, twig);
      // stray twigs
      for (const [a, b, c, d] of [[-9, 10, -12, 2], [9, 12, 12, 3], [-6, 24, -10, 10], [7, 26, 11, 16], [-10, 6, -11, 0], [4, 8, 6, 0], [-4, 34, -7, 26]]) {
        v.line(a, b, 0, c, d, (a + c) % 3 - 1, twig(a, b, 1));
      }
      for (const y of [32, 42]) v.shape(-9, y, -4, 9, y + 1, 4, (x, yy, z) => Math.abs(x) <= 10.5 - yy * 0.17 + 0.6 && Math.abs(z) <= 3.5, 0x2e3a2c);
      v.cylinder(0, 30, 0, 1, 63, (x, y, z) => ((y - 30) % 13 === 0 ? shade(0xa89048, 0.85) : shade(0xd4bc72, 0.92 + hash(x, y, z, 4) * 0.06 - (x > 0 ? 0.06 : 0))));
      for (let y = 43; y <= 92; y += 13) v.cylinder(0, y, 0, 1.3, 1, shade(0xb8a058, 0.9));
      v.set(0, 93, 0, 0x7a6a3a);
      v.line(0, 90, 1, 1, 87, 2, 0xd83a2a); v.line(1, 87, 2, -1, 87, 2, 0xd83a2a); v.line(-1, 87, 2, 0, 90, 1, 0xd83a2a);
    },
  },
  // ------------------------------------------------------------- ladder
  ladder: {
    name: 'Aluminium Stepladder', voxel: 0.016,
    build(v) {
      const al = (x, y, z) => gloss(shade(0xc4c9ce, 0.94 + hash(x, y, z, 1) * 0.06));
      const H = 88;
      const zf = (y) => Math.round(17 - (y / H) * 13);
      for (let y = 0; y <= H; y++) {
        for (const s of [-1, 1]) {
          const xa = s < 0 ? -14 : 13, xb = xa + 1;
          fill(v, xa, y, zf(y) - 1, xb, y, zf(y) + 1, al);
          fill(v, xa, y, -zf(y) - 1, xb, y, -zf(y) + 1, al);
        }
      }
      for (const y of [22, 44, 66]) {
        for (const sg of [1, -1]) {
          const zc = sg * zf(y);
          fill(v, -12, y, zc - 2, 12, y + 1, zc + 2, (x, yy, z) => gloss(shade(0xb8bdc2, yy === y + 1 && z % 2 === 0 ? 0.82 : 1)));
        }
      }
      fill(v, -15, 89, -5, 15, 91, 5, al);
      v.paint(() => v.shape(-14, 91, -5, 14, 91, 5, (x, y, z) => z % 2 === 0, gloss(0x9aa0a6)));
      for (const s of [-1, 1]) v.box(s * 15, 84, -5, s * 16, 92, 5, gloss(0x2f62c8));
      for (const s of [-1, 1]) {
        const x = s * 15;
        path(v, [[x, 40, zf(40)], [x, 37, 0], [x, 40, -zf(40)]], gloss(0x8a9098));
        v.set(x, 37, 0, gloss(0x2f62c8));
      }
      for (const s of [-1, 1]) for (const sg of [1, -1]) {
        const xa = s < 0 ? -14 : 13;
        v.box(xa, 0, sg * zf(0) - 1, xa + 1, 1, sg * zf(0) + 1, C.charcoal);
      }
      v.project(['Y', 'K', 'Y', 'K', 'Y', 'Y', 'R', 'Y'], { Y: 0xffd23f, K: C.ink, R: 0xe5383b }, 10, 58, '-x');
      speckle(v, -16, 0, -18, 16, 92, 18, 0xf4f2ea, 0.03, 4);
      speckle(v, -16, 0, -18, 16, 92, 18, gloss(0x7ab8e8), 0.015, 5);
      grime(v, 0, 8, 0.8);
    },
  },

  // ------------------------------------------------------------- helmet
  helmet: {
    name: 'Work Helmet', voxel: 0.008,
    build(v) {
      v.jitter = 0.015;
      const yel = (x, y, z) => gloss(shade(0xf5c518, 0.97 + hash(x, y, z, 1) * 0.03));
      const shell = (x, y, z, dy = 0) => ((x / 13) ** 2 + ((y - 2 - dy) / 15.5) ** 2 + ((z + 0.5) / 15) ** 2) <= 1;
      v.shape(-17, 0, -19, 17, 1, 22, (x, y, z) => ((x / 16.4) ** 2 + ((z + 0.5) / 18.4) ** 2) <= 1 - y * 0.06 || (z > 0 && ((x / 12) ** 2 + (z / 21.5) ** 2) <= 1 - y * 0.05), yel);
      v.shape(-14, 2, -16, 14, 19, 16, (x, y, z) => shell(x, y, z), yel);
      v.shape(-1, 2, -17, 1, 20, 17, (x, y, z) => shell(x, y, z, 1), (x, y, z) => gloss(shade(0xffd23a, 1.03)));
      tint(v, -17, 0, -19, 17, 0, 22, (x, y, z, c, m) => enc(shade(c, 0.82), m));
      speckle(v, -17, 0, -19, 17, 20, 22, gloss(0xfff3c0), 0.015, 3);
      blotch(v, -17, 0, -19, 17, 20, 22, gloss(0xd8aa30), 0.84, 3, 5);
      v.project(['.WWWWWWW.', 'WWWGGGWWW', 'WWWGGGWWW', 'WGGGGGGGW', 'WGGGGGGGW', 'WGGGGGGGW', 'WWWGGGWWW', 'WWWGGGWWW', '.WWWWWWW.'],
        { W: 0xfbf8f0, G: 0x2a9a4a }, -4, 12, '+z', { depth: 4 });
      text(v, '安全', -7, 12, 0x2a9a4a, { dir: '-z', depth: 4 });
      v.project(['BBBBBBBB', 'WWWWWWWW', 'BBBBBBBB'], { W: 0xf4f0e6, B: 0x2f6fd6 }, -4, 9, '+x', { depth: 3 });
      for (const s of [-1, 1]) v.box(s * 13, 0, -1, s * 13, 1, 1, 0x2a2a2a);
      v.line(-13, 0, 1, -6, 0, 12, 0x2a2a2a); v.line(13, 0, 1, 8, 0, 11, 0x2a2a2a);
    },
  },

  // ------------------------------------------------------------- stove + kettle
  stove_kettle: {
    name: 'Cassette Gas Stove & Kettle', voxel: 0.008,
    build(v) {
      fill(v, -21, 1, -18, 21, 8, 18, (x, y, z) => gloss(shade(0x2e2c2e, 0.95 + hash(x, y, z, 1) * 0.08)));
      for (const sx of [-19, 19]) for (const sz of [-16, 16]) v.box(sx - 1, 0, sz - 1, sx + 1, 0, sz + 1, C.charcoal);
      fill(v, -21, 2, 18, 21, 8, 18, (x, y, z) => gloss(shade(0xe9e6de, 0.97 + hash(x, y, z, 2) * 0.04)));
      v.cylinder(14, 5, 19, 2.2, 1, gloss(0xb8bcc2), 'z'); v.cylinder(14, 5, 20, 1.4, 1, gloss(0x2a2828), 'z'); v.set(14, 7, 20, 0xffffff);
      v.box(-17, 3, 19, -12, 6, 19, gloss(0xe24a2a));
      v.box(-6, 6, 19, 8, 6, 19, gloss(0xff8a2a));
      fill(v, -21, 9, -18, 21, 9, 18, (x, y, z) => gloss(shade(0xc8ccd0, 0.95 + hash(x, y, z, 3) * 0.05)));
      v.box(9, 9, -18, 9, 9, 18, gloss(0x6a6e74));
      v.paint(() => { for (let z = -12; z <= 12; z += 3) v.box(13, 9, z, 19, 9, z, gloss(0x4a4e54)); });
      v.cylinder(-5, 9, 0, 12, 1, gloss(0x8a9096));
      v.cylinder(-5, 10, 0, 4, 1, gloss(0x3a3836));
      v.paint(() => v.cylinder(-5, 10, 0, 2.2, 1, gloss(0x1e1c1c)));
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + k * Math.PI / 2;
        v.line(-5 + Math.cos(a) * 6, 11, Math.sin(a) * 6, -5 + Math.cos(a) * 11, 11, Math.sin(a) * 11, gloss(0x2a2a2a));
        v.line(-5 + Math.cos(a) * 10, 10, Math.sin(a) * 10, -5 + Math.cos(a) * 11, 10, Math.sin(a) * 11, gloss(0x2a2a2a));
      }
      // enamel kettle
      const en = (x, y, z) => gloss(shade(0xd8452e, 0.94 + hash(x, y, z, 5) * 0.06));
      for (let i = 0; i <= 12; i++) {
        const r = 11 - (i > 7 ? (i - 7) * 1.3 : 0) - (i === 0 ? 0.8 : 0);
        v.cylinder(-5, 12 + i, 0, r, 1, i === 0 ? gloss(0x2a2222) : en);
      }
      v.cylinder(-5, 25, 0, 4.6, 1, gloss(0xf4efe4)); v.cylinder(-5, 26, 0, 3.4, 1, gloss(0xf4efe4));
      v.cylinder(-5, 27, 0, 1.3, 2, gloss(0x1e1c1c));
      v.line(2, 15, 6, 8, 23, 10, en, 1.4); v.line(8, 23, 10, 9, 25, 11, en, 0.9); v.set(9, 26, 11, gloss(0x1e1c1c));
      for (const s of [-1, 1]) v.box(-5 + s * 6, 23, 0, -5 + s * 6, 28, 0, gloss(0x2a2222));
      fill(v, -11, 29, -1, 1, 30, 1, gloss(0x1e1c1c));
      const fl = ['.W.', 'WYW', '.W.'];
      for (const [fx, fy] of [[-11, 20], [-4, 18], [2, 21], [-8, 15]]) v.project(fl, { W: gloss(0xfffaf0), Y: gloss(0xffd23f) }, fx, fy, '+z');
      v.project(['.G.', 'GGG'], { G: gloss(0x4aa84a) }, -6, 16, '+z');
      grime(v, 0, 3, 0.8);
    },
  },

  // ------------------------------------------------------------- noodle box
  noodle_box: {
    name: 'Case of Cup Noodles', voxel: 0.007,
    build(v) {
      fill(v, -24, 0, -17, 24, 25, 17, cardboardFn(P.cardboard, 2));
      v.box(-24, 25, 0, 24, 25, 0, P.cardboardD);
      v.box(-24, 25, -2, 24, 25, 2, gloss(P.tape));
      for (const x of [-24, 24]) v.box(x, 19, -2, x, 25, 2, gloss(P.tape));
      v.paint(() => { v.box(-18, 8, 17, 18, 19, 17, 0xd8322a); v.box(-18, 7, 17, 18, 7, 17, 0xffd23f); });
      text(v, 'ラーメン', -15, 17, 0xfffaf0);
      v.project(['.RRRRR.', 'RWWWWWR', '.RWWWR.', '..RRR..'], { R: 0xd8322a, W: 0xfff4e0 }, -4, 14, '+x');
      v.project(['.K..K.', 'KKKKKK', '.K..K.', '.K..K.'], { K: 0x3a2a1a }, -14, 22, '+x');
      v.project(['K.K', '...'], { K: 0x3a2a1a }, 10, 4, '+x');
      edgeWear(v, -24, 0, -17, 24, 25, 17, P.cardboardD, 0.35, 3);
      grime(v, 0, 4, 0.8);
      noodleCup(v, -12, 26, -4, 0xd8322a, 0xf4f0e8);
      noodleCup(v, -12, 37, -4, 0xd8322a, 0xf4f0e8);
      noodleCup(v, 6, 26, 6, 0xff9a20, 0xfff2c0);
      noodleCup(v, 12, 26, -8, 0x3a8a3a, 0xe8f4e0, 'z');
      v.line(-4, 26, 14, 14, 26, 11, 0xe8d4a0); v.line(-4, 26, 15, 14, 26, 12, 0xe8d4a0);
      v.line(-2, 26, 15, 6, 26, 14, 0xffffff); v.set(1, 26, 15, 0xd8322a); v.set(2, 26, 14, 0xd8322a);
    },
  },

  // ------------------------------------------------------------- polytank
  polytank: {
    name: 'Kerosene Polytank & Pump', voxel: 0.008,
    build(v) {
      const red = (x, y, z) => gloss(shade(0xd8332a, 0.94 + hash(x, y, z, 1) * 0.06 + (y % 10 === 0 ? -0.12 : 0)));
      v.shape(-19, 0, -13, 19, 43, 13, (x, y, z) => (Math.abs(x) / 18.6) ** 6 + (Math.abs(z) / 12.6) ** 6 + (Math.max(0, y - 37) / 6.5) ** 4 <= 1, red);
      fill(v, -12, 42, -3, 4, 48, 3, red);
      v.box(-9, 42, -3, 1, 45, 3, null);
      v.cylinder(11, 41, 4, 3.2, 5, gloss(0xf2c230));
      v.cylinder(-13, 41, 6, 2, 4, gloss(0xf2c230));
      v.paint(() => v.box(-10, 10, 12, 6, 35, 12, 0xf8f4ea));
      text(v, '灯油', -6, 33, 0xd8332a, { vertical: true });
      text(v, '18L', -5, 15, 0x3a3a3a);
      // siphon pump
      v.cylinder(11, 46, 4, 1, 6, glass(0xe8f0f0));
      v.ellipsoid(11, 54, 4, 2.6, 3.4, 2.6, gloss(0xe0302a));
      v.cylinder(11, 57, 4, 1.6, 2, gloss(0x2f6fd6));
      path(v, [[13, 54, 4], [17, 53, 7], [19, 47, 12], [19, 35, 15], [17, 15, 15], [12, 3, 16], [4, 0, 17], [-4, 0, 17]], gloss(0x5aa0d8), 0.9);
      speckle(v, -19, 0, -13, 19, 48, 13, gloss(0xf06a5a), 0.02, 4);
      grime(v, 0, 5, 0.75);
      dust(v, 0xb8ad98, 0.25);
    },
  },

  // ------------------------------------------------------------- CRT TV
  crt_tv: {
    name: 'Old CRT Television', voxel: 0.01,
    build(v) {
      const wood = woodFn(0x8a5a32, 'x', 4);
      for (const sx of [-21, 21]) for (const sz of [-7, 15]) v.box(sx - 1, 0, sz - 1, sx + 1, 1, sz + 1, C.charcoal);
      fill(v, -24, 2, -10, 24, 42, 17, wood);
      fill(v, -18, 8, -20, 18, 37, -11, (x, y, z) => shade(0x3a3634, 0.94 + hash(x, y, z, 2) * 0.06));
      fill(v, -14, 12, -24, 14, 33, -21, (x, y, z) => shade(0x34302e, 0.94 + hash(x, y, z, 2) * 0.06));
      v.paint(() => { for (let y = 14; y <= 32; y += 3) v.box(-12, y, -24, 12, y, -24, 0x1e1c1c); });
      fill(v, -23, 3, 18, 23, 41, 18, (x, y, z) => gloss(shade(0x363431, 0.95 + hash(x, y, z, 3) * 0.05)));
      const e = (x, y) => ((x + 6) / 15.5) ** 4 + ((y - 21.5) / 16) ** 4;
      v.paint(() => v.shape(-23, 3, 18, 12, 40, 18, (x, y) => e(x, y) > 1 && e(x, y) <= 1.45, gloss(0x8a8782)));
      v.shape(-21, 6, 18, 9, 37, 20, (x, y, z) => {
        if (e(x, y) > 1) return false;
        const b = Math.round(1.7 * (1 - (((x + 6) / 15.5) ** 2 + ((y - 21.5) / 16) ** 2) * 0.55));
        return z <= 18 + b;
      }, (x, y, z) => {
        const d = x + y * 0.7;
        if (d > 14 && d < 18 && y > 20) return gloss(0x55615c);
        if (d > 19 && d < 20 && y > 24) return gloss(0x4a5651);
        return gloss(shade(0x26302d, 0.95 + (y % 2) * 0.05));
      });
      for (const [dy, r] of [[31, 3.6], [22, 3.2]]) {
        v.cylinder(16, dy, 19, r, 2, gloss(0x2a2826), 'z');
        v.paint(() => v.cylinder(16, dy, 20, r - 1.5, 1, gloss(0x4a4846), 'z'));
        v.set(16, dy + Math.round(r) - 1, 21, 0xf4f0e6);
        for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; v.paint(() => v.set(16 + Math.round(Math.cos(a) * (r + 1.6)), dy + Math.round(Math.sin(a) * (r + 1.6)), 18, 0xd8d4c8)); }
      }
      for (const kx of [13, 19]) v.cylinder(kx, 14, 19, 1.4, 1, gloss(0xc8ccd0), 'z');
      v.box(12, 10, 19, 14, 11, 19, gloss(0xd8dadc)); v.set(20, 11, 19, gloss(0x8a2a20));
      v.paint(() => { for (let y = 4; y <= 8; y += 2) v.box(12, y, 18, 22, y, 18, 0x1a1818); });
      v.box(-12, 4, 19, -1, 4, 19, gloss(0xc8ccd0));
      // lace doily + antenna
      v.shape(-18, 43, -9, 2, 43, 11, (x, y, z) => {
        const d = Math.hypot(x + 8, z - 1);
        if (d > 9.6) return false;
        const a = Math.atan2(z - 1, x + 8);
        if (d > 8.2) return Math.round(a * 12 / Math.PI) % 2 === 0;
        return !(Math.round(d) % 3 === 0 && Math.round(a * 8 / Math.PI) % 2 === 0) && hash(x, y, z, 4) > 0.06;
      }, 0xfbf8f0);
      v.ellipsoid(-8, 44, 1, 2, 2.5, 2, gloss(0xc8221e)); v.set(-8, 46, 1, gloss(0xc8221e));
      v.project(['W'], { W: 0xf6efe0 }, -8, 45, '+z');
      v.ellipsoid(10, 43, -4, 3.5, 1.6, 3, gloss(0x2a2826));
      v.line(9, 44, -4, -5, 55, -8, gloss(0xd8dce0)); v.line(11, 44, -4, 22, 55, -1, gloss(0xd8dce0));
      v.set(-5, 55, -8, gloss(0x2a2826)); v.set(22, 55, -1, gloss(0x2a2826));
      dust(v, 0xb8ad98, 0.3);
    },
  },

  // ------------------------------------------------------------- umbrella stand
  umbrella_stand: {
    name: 'Umbrella Stand', voxel: 0.01,
    build(v) {
      const indigo = 0x2a3f7a;
      const pot = (x, y, z) => {
        if (y >= 41 || y <= 3) return gloss(indigo);
        if (y === 39 || y === 5) return gloss(0x4a6ab0);
        const u = Math.atan2(z, x) * 10.5;
        const wave = 22 + Math.sin(u * 0.55) * 2.2;
        if (Math.abs(y - wave) < 1.1 || Math.abs(y - wave - 5) < 0.8 || Math.abs(y - wave + 5) < 0.8) return gloss(0x3a5aa8);
        if ((y === 10 || y === 34) && Math.round(u) % 3 === 0) return gloss(0x3a5aa8);
        return gloss(shade(0xf4f2ec, 0.97 + hash(x, y, z, 2) * 0.04));
      };
      v.tube(0, 0, 0, 10.5, 9.2, 40, (x, y, z) => pot(x, y + (y > 20 ? 1 : 0), z));
      v.cylinder(0, 0, 0, 9.5, 2, gloss(indigo));
      v.torus(0, 40, 0, 10, 0.9, gloss(indigo), 'y');
      const umbrella = (base, top, fab, handle, hookDir, opts = {}) => {
        const [bx, by, bz] = base, [tx, ty, tz] = top;
        const L = Math.hypot(tx - bx, ty - by, tz - bz), n = Math.ceil(L * 2);
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const px = bx + (tx - bx) * t, py = by + (ty - by) * t, pz = bz + (tz - bz) * t;
          let r = 0;
          if (t > 0.06 && t < 0.7) r = 0.8 + (opts.r || 3.3) * Math.pow((t - 0.06) / 0.64, 0.75);
          else if (t >= 0.7 && t < 0.8) r = (0.8 + (opts.r || 3.3)) * (1 - (t - 0.7) / 0.1) + 0.6;
          if (r > 0.75) v.sphere(px, py, pz, r, typeof fab === 'function' ? fab : (x, y, z) => (opts.strap && Math.abs(t - 0.5) < 0.02 ? opts.strap : (x + z + y) % 4 === 0 ? sh(fab, 0.85) : fab));
          else v.set(Math.round(px), Math.round(py), Math.round(pz), opts.shaft || gloss(0xc8ccd2));
        }
        const hx = Math.round(tx), hy = Math.round(ty), hz = Math.round(tz);
        for (let k = 0; k < 5; k++) v.set(hx, hy + k, hz, handle);
        for (let k = 0; k <= 10; k++) {
          const a = Math.PI * (1 - k / 10);
          const ox = 2.5 + 2.5 * Math.cos(a), oy = 5 + 2.5 * Math.sin(a);
          v.set(Math.round(hx + ox * hookDir[0]), Math.round(hy + oy), Math.round(hz + ox * hookDir[1]), handle);
        }
        v.set(hx + 5 * hookDir[0], hy + 4, hz + 5 * hookDir[1], handle);
      };
      umbrella([-2, 2, -1], [-10, 80, -5], (x, y, z) => ((x + y) % 5 === 0 ? glass(0xf4fafa) : glass(0xd8eaec)), gloss(0xf4f2ee), [1, 0], { shaft: gloss(0xf4f2ee) });
      umbrella([3, 2, 2], [9, 79, 5], gloss(0x26365e), gloss(0x7a4a2a), [0, 1], { strap: gloss(0x1a2440), r: 3.6 });
      umbrella([1, 2, -4], [3, 72, -11], gloss(0xf5c518), gloss(0xf4f0e0), [-1, 0], { strap: gloss(0xe8e4d8), r: 3 });
      grime(v, 0, 4, 0.8);
    },
  },

  // ------------------------------------------------------------- manga stack
  manga_stack: {
    name: 'Tied Manga Magazines', voxel: 0.006,
    build(v) {
      const covers = [0xe5383b, 0x2f6fd6, 0xffd23f, 0x3cae5a, 0xff8c2e, 0x8a5bd6, 0xe34234, 0x2fb5a6, 0xff6f9a, 0xffd23f];
      const papers = [0xf2ead0, 0xf5d4d0, 0xe4ecc4, 0xd4e2ec, 0xf8f2e0, 0xf2deb0];
      let top = null;
      for (let i = 0; i < 10; i++) {
        const dx = Math.round((hash(i, 1, 0, 3) - 0.5) * 4), dz = Math.round((hash(i, 2, 0, 3) - 0.5) * 3);
        const y0 = i * 5, cov = covers[i];
        fill(v, -21 + dx, y0, -15 + dz, 21 + dx, y0 + 4, 14 + dz, (x, y, z) => {
          const ly = y - y0;
          if (ly === 0 || ly === 4) return shade(cov, 0.94 + hash(x, y, z, 4) * 0.06);
          if (x >= 21 + dx) return shade(cov, 0.85);
          return shade(papers[(i * 3 + ly) % papers.length], 0.92 + hash(x, y, z, 5) * 0.07);
        });
        v.paint(() => { v.box(21 + dx, y0 + 2, -9 + dz, 21 + dx, y0 + 2, 6 + dz, 0xfbf8f0); v.box(21 + dx, y0 + 2, -9 + dz, 21 + dx, y0 + 2, -6 + dz, 0x2a2a2a); });
        top = { dx, dz, y: y0 + 4 };
      }
      // top cover art
      const { dx, dz, y: ty } = top;
      v.paint(() => v.shape(-21 + dx, ty, -15 + dz, 21 + dx, ty, 14 + dz, () => true, (x, y, z) => {
        const lx = x - dx, lz = z - dz;
        if (lz <= -10) return (lx > -18 && lx < 14 && lz > -14 && lz < -10 && ((lx + 40) % 5 !== 4) && (lz !== -12 || (lx + 40) % 5 < 2)) ? 0xffffff : 0xe5383b;
        const fd = Math.hypot(lx + 4, lz - 3);
        if (fd < 7.5 && lz < -1 && hash(lx, 0, lz, 2) < 0.9) return 0x1e1a1a;
        if (fd < 8) {
          if ((lz === 3 || lz === 4) && (lx === -7 || lx === -6 || lx === -1 || lx === 0)) return C.ink;
          if (lz === 2 && (lx === -6 || lx === 0)) return 0xffffff;
          if (lz === 7 && lx >= -5 && lx <= -2) return 0xc83c4a;
          return 0xffd9bf;
        }
        if (Math.abs(lx + 4) <= 2 && lz > -2 && lz < -1) return 0x1e1a1a;
        const sd = Math.hypot(lx - 12, lz - 6), sa = Math.atan2(lz - 6, lx - 12);
        if (sd < 4 + Math.abs(Math.sin(sa * 4)) * 2.5) return sd < 2.5 ? 0xffffff : 0xff8c2e;
        return (lx + lz) % 7 === 0 ? 0xffe680 : 0xffd23f;
      }));
      // twine (cross tie) + knot
      const S = 0xf2ead8;
      const rows = (n) => Array.from({ length: n }, () => 'S');
      v.project(rows(50), { S }, 0, 49, '+z'); v.project(rows(50), { S }, 0, 49, '-z');
      v.project(rows(50), { S }, 0, 49, '+x'); v.project(rows(50), { S }, 0, 49, '-x');
      v.project(['S'.repeat(48)], { S }, -24, 0, '+y');
      v.project(Array.from({ length: 34 }, () => 'S'), { S }, 0, -17, '+y');
      v.box(-1, ty + 1, -1, 1, ty + 1, 1, S); v.line(1, ty + 1, 1, 4, ty + 1, 4, S); v.line(-1, ty + 1, 1, -3, ty + 1, 5, S);
      // two paperback volumes on top
      fill(v, 3, ty + 1, -12, 18, ty + 3, 13, (x, y, z) => (y === ty + 3 ? (z < -6 ? 0xffffff : z < 8 ? 0x8fc8f0 : 0xf4f0e6) : x === 3 ? 0x2a6ab0 : 0xf4efe0));
      fill(v, 5, ty + 4, -10, 19, ty + 6, 14, (x, y, z) => (y === ty + 6 ? (z < -5 ? 0xffffff : z < 9 ? 0xff9fae : 0xfbf8f0) : x === 5 ? 0xe5383b : 0xf4efe0));
      v.project(['KK.KK', '.....', 'K.K.K'], { K: C.ink }, 9, -8, '+y');
      grime(v, 0, 5, 0.85);
      dust(v, 0xb8ad98, 0.2);
    },
  },

  // ------------------------------------------------------------- tyres
  tires: {
    name: 'Stack of Old Tyres', voxel: 0.01,
    build(v) {
      const tyre = (cx, cy, cz, s) => {
        v.shape(cx - 30, cy - 10, cz - 30, cx + 30, cy + 10, cz + 30, (x, y, z) => {
          const d = Math.hypot(x - cx, z - cz), h = y - cy;
          return ((d - 23.3) / 6.3) ** 4 + (h / 9.6) ** 4 <= 1 && d >= 16.6;
        }, (x, y, z) => {
          const d = Math.hypot(x - cx, z - cz), h = y - cy, a = Math.atan2(z - cz, x - cx);
          let c = 0x2e2d2e;
          if (d > 27.3 && Math.abs(h) < 8) {
            if (Math.abs(h) === 3 || (Math.floor(a * 28 / Math.PI + (h > 0 ? 0.5 : 0)) % 2 === 0 && Math.abs(h) > 4)) c = 0x1a191a;
          } else if (Math.abs(h) >= 8 && d > 20 && d < 25 && Math.round(d) === 22 && Math.floor(a * 20) % 3 !== 0) c = 0x4e4c4c;
          return shade(c, 0.92 + hash(x, y, z, s) * 0.12);
        });
      };
      tyre(0, 9, 0, 1); tyre(1, 28, -1, 2); tyre(-1, 47, 1, 3);
      v.project(['..W..W', '.W.W.W', 'W...W.'], { W: 0xf4f0e0 }, -6, 32, '+z');
      v.project(['YY.Y', '.YY.'], { Y: 0xf2c230 }, 8, 12, '+z');
      dust(v, 0xa89c88, 0.5, 3);
    },
  },

  // ------------------------------------------------------------- desk lamp
  desk_lamp: {
    name: 'Articulated Desk Lamp', voxel: 0.006,
    build(v) {
      const grn = (x, y, z) => gloss(shade(0x2f6a4a, 0.93 + hash(x, y, z, 1) * 0.08));
      const steel = gloss(0xc8ccd2);
      v.cylinder(0, 0, -12, 9, 2, grn); v.cylinder(0, 2, -12, 7.5, 1, grn); v.cylinder(0, 3, -12, 3.5, 2, grn);
      v.box(5, 3, -9, 6, 3, -8, gloss(0xe8e4d8));
      v.cylinder(0, 0, -12, 9.2, 1, gloss(0x1e2a22));
      path(v, [[0, 0, -21], [3, 0, -23], [8, 0, -22]], 0x2a2a2a);
      const P0 = [0, 6, -12], P1 = [0, 58, -20], P2 = [0, 70, 6];
      v.cylinder(-3, P0[1], P0[2], 1.6, 7, steel, 'x');
      for (const s of [-2, 2]) {
        v.line(s, P0[1], P0[2], s, P1[1], P1[2], grn);
        v.line(s, P1[1], P1[2], s, P2[1], P2[2], grn);
      }
      for (const s of [-3, 3]) for (let i = 0; i <= 26; i++) {
        const y = 14 + i, z = Math.round(-13 - i * 0.18);
        v.set(s, y, z, i % 2 ? steel : gloss(0x9aa0a6));
        if (i % 2 === 0) v.set(s + Math.sign(s), y, z, steel);
      }
      v.cylinder(-3, P1[1], P1[2], 1.7, 7, steel, 'x'); v.box(4, 57, -21, 5, 59, -19, steel);
      v.cylinder(-3, P2[1], P2[2], 1.5, 7, steel, 'x');
      const a = [0, -0.75, 0.66], al = Math.hypot(...a); a[0] /= al; a[1] /= al; a[2] /= al;
      v.shape(-11, 48, -2, 11, 75, 24, (x, y, z) => {
        const q = [x - P2[0], y - P2[1], z - P2[2]];
        const s = q[0] * a[0] + q[1] * a[1] + q[2] * a[2];
        if (s < 0 || s > 13) return false;
        const rad = Math.hypot(q[0] - a[0] * s, q[1] - a[1] * s, q[2] - a[2] * s);
        const rr = 3 + 5.6 * s / 13;
        return rad <= rr && (rad > rr - 1.5 || s < 1.5);
      }, (x, y, z) => {
        const q = [x - P2[0], y - P2[1], z - P2[2]];
        const s = q[0] * a[0] + q[1] * a[1] + q[2] * a[2];
        const rad = Math.hypot(q[0] - a[0] * s, q[1] - a[1] * s, q[2] - a[2] * s);
        const rr = 3 + 5.6 * s / 13;
        if (s > 12.2) return steel;
        if (rad < rr - 0.8 && s > 1.5) return glow(0xf8d898);
        return grn(x, y, z);
      });
      v.sphere(P2[0] + a[0] * 8, P2[1] + a[1] * 8, P2[2] + a[2] * 8, 2.6, glow(0xfff6dc));
      dust(v, 0xb8ad98, 0.2);
    },
  },
  // ------------------------------------------------------------- extinguisher
  extinguisher: {
    name: 'Fire Extinguisher', voxel: 0.006,
    build(v) {
      const red = (x, y, z) => gloss(shade(0xd8231f, 0.93 + hash(x, y, z, 1) * 0.06));
      const steel = gloss(0xc8ccd2), blk = gloss(0x232122);
      v.cylinder(0, 0, 0, 12.4, 4, blk);
      v.cylinder(0, 4, 0, 12, 60, red);
      v.shape(-12, 64, -12, 12, 70, 12, (x, y, z) => (x * x + z * z) / 144 + ((y - 63) / 7) ** 2 <= 1, red);
      v.cylinder(0, 70, 0, 3.5, 2, steel);
      fill(v, -3, 72, -3, 3, 77, 3, (x, y, z) => gloss(shade(0xc8ccd2, 0.94 + hash(x, y, z, 2) * 0.08)));
      v.cylinder(0, 75, 4, 2.4, 1, steel, 'z');
      v.project(['.WW.', 'GWWR', '.KW.'], { W: 0xffffff, G: 0x3cae5a, R: 0xe5383b, K: C.ink }, -2, 76, '+z');
      fill(v, -2, 78, -11, 2, 79, 2, blk);
      fill(v, -2, 74, -12, 2, 75, -4, blk);
      v.box(3, 76, -1, 5, 76, 1, steel); v.box(5, 73, 1, 6, 76, 2, gloss(0xffd23f));
      path(v, [[-3, 74, 2], [-8, 73, 5], [-12, 68, 7], [-13.5, 58, 7], [-13.5, 30, 7]], blk, 1.1);
      fill(v, -15, 22, 6, -12, 30, 8, blk); v.box(-14, 21, 7, -13, 21, 7, gloss(0x3a3838));
      v.box(-14, 44, 4, -12, 46, 10, steel);
      // label + ABC pictograms + vertical 消火器
      v.paint(() => v.shape(-9, 10, 5, 9, 38, 13, (x, y, z) => z >= 7, 0xf6f2ea));
      v.project(['.WWW.', 'WWRWW', 'WRRRW', 'WWRWW', '.WWW.'], { W: 0xffffff, R: 0xe5383b }, -8, 36, '+z');
      v.project(['.YYY.', 'YYRYY', 'YRRRY', 'YYRYY', '.YYY.'], { Y: 0xffd23f, R: 0xe5383b }, -2, 36, '+z');
      v.project(['.BBB.', 'BBYBB', 'BBYBB', 'BYBBB', '.BBB.'], { B: 0x2f6fd6, Y: 0xffd23f }, 4, 36, '+z');
      for (let y = 28; y >= 13; y -= 3) v.project(['k'.repeat(10 + ((y * 7) % 5))], { k: 0x8a8682 }, -7, y, '+z');
      text(v, '消火器', -3, 64, 0xfbf8f0, { vertical: true });
      grime(v, 0, 8, 0.8);
      dust(v, 0xb8ad98, 0.2);
    },
  },

  // ------------------------------------------------------------- pipe chair
  pipe_chair: {
    name: 'Folding Pipe Chair', voxel: 0.01,
    build(v) {
      const pipe = gloss(0xc4c8ce), pipeD = gloss(0xa2a8ae);
      const vinyl = (x, y, z) => gloss(shade(0x7a2e26, 0.93 + hash(x, y, z, 2) * 0.06));
      for (const s of [-1, 1]) {
        const x = s * 20;
        const o = s > 0 ? 0 : -1;
        for (const [a, b] of [[[x + o, 0, 17], [x + o, 40, 13]], [[x + o, 40, 13], [x + o, 46, 9]], [[x + o, 46, 9], [x + o, 77, -16]]]) rod(v, ...a, ...b, pipe, 2);
        rod(v, x + o - s * 2, 0, -19, x + o - s * 2, 43, 10, pipeD, 2);
        v.box(x - 1, 0, 16, x + 1, 1, 18, C.charcoal); v.box(x - s - 1, 0, -20, x - s + 1, 1, -18, C.charcoal);
      }
      rod(v, -21, 77, -17, 20, 77, -17, pipe, 2);
      rod(v, -21, 4, 16, 20, 4, 16, pipe, 2);
      rod(v, -19, 3, -18, 18, 3, -18, pipeD, 2);
      fill(v, -18, 42, -14, 18, 43, 15, pipeD);
      v.shape(-18, 44, -14, 18, 46, 15, (x, y, z) => !(y === 46 && (Math.abs(x) === 18 || z === -14 || z === 15)), vinyl);
      for (let y = 59; y <= 74; y++) {
        const z0 = Math.round(9 - (y - 46) * 25 / 31);
        v.shape(-18, y, z0 - 1, 18, y, z0 + 2, (x, yy, z) => !((y === 59 || y === 74) && (Math.abs(x) === 18 || z === z0 + 2)) && !(Math.abs(x) === 18 && z === z0 + 2), vinyl);
      }
      // community-hall number sticker on the back
      v.project(['WWWWWWW', 'W1W222W', 'W1WW2WW', 'W1W2WWW', 'W1W222W', 'WWWWWWW'], { W: 0xf6f2ea, 1: C.ink, 2: C.ink }, -3, 70, '-z');
      speckle(v, -18, 44, -14, 18, 46, 15, gloss(0xa8584c), 0.05, 6);
      blotch(v, -18, 44, -14, 18, 46, 15, gloss(0x5a221c), 0.8, 3, 7);
      tint(v, -22, 0, -22, 22, 80, 20, (x, y, z, c, m) => (m === MAT.GLOSS && isSilver(c) && vnoise(x, y, z, 2, 9) > 0.78 ? gloss(0x9a6a4a) : undefined));
    },
  },

  // ------------------------------------------------------------- stool
  stool: {
    name: 'Wooden Stool', voxel: 0.008,
    build(v) {
      const wood = woodFn(0xa8743e, 'x', 7), woodD = woodFn(0x8a5a30, 'y', 8);
      const legs = [];
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + k * Math.PI / 2;
        legs.push(a);
        rod(v, Math.cos(a) * 12, 51, Math.sin(a) * 12, Math.cos(a) * 19, 0, Math.sin(a) * 19, woodD, 3);
      }
      for (let k = 0; k < 4; k++) {
        const a = legs[k], b = legs[(k + 1) % 4], r = 17.4, y = k % 2 ? 16 : 19;
        rod(v, Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r, woodD, 2);
      }
      v.cylinder(0, 52, 0, 17.5, 4, wood);
      v.tube(0, 55, 0, 18, 16.6, 1, null);
      v.paint(() => {
        v.shape(-17, 54, -17, 17, 55, 17, (x, y, z) => Math.hypot(x + 2, z - 1) < 9, (x, y, z) => shade(0xc8945a, 0.95 + hash(x, y, z, 3) * 0.06));
        v.shape(-17, 55, -17, 17, 55, 17, (x, y, z) => { const d = Math.hypot(x - 7, z + 6); return d > 3.4 && d < 4.6; }, 0x6a4424);
      });
      for (const [px, pz, c] of [[-9, 6, 0x6ab0e8], [-8, 7, 0x6ab0e8], [5, 10, 0xf4f2ea], [10, -2, 0xf4f2ea], [-12, -6, 0x6ab0e8], [2, -13, 0xe5383b]]) v.paint(() => v.set(px, 55, pz, c));
      speckle(v, -20, 0, -20, 20, 55, 20, 0xf4f2ea, 0.012, 5);
      grime(v, 0, 10, 0.75);
    },
  },

  // ------------------------------------------------------------- garage cat
  garage_cat: {
    name: 'Sleeping Garage Cat', voxel: 0.008,
    build(v) {
      const cb = cardboardFn(0xc49a62, 4);
      fill(v, -22, 0, -16, 22, 21, 16, cb);
      v.box(-21, 2, -15, 21, 21, 15, null);
      for (let i = 1; i <= 5; i++) {
        fill(v, -21, 21 - i, 16 + i, 21, 22 - i, 16 + i, cb);
        fill(v, -21, 21 - i, -16 - i, 21, 22 - i, -16 - i, cb);
        if (i <= 4) for (const s of [-1, 1]) fill(v, s * (22 + i), 21 - i, -14, s * (22 + i), 22 - i, 14, cb);
      }
      v.box(14, 16, 21, 21, 18, 21, null); v.box(17, 18, 20, 21, 18, 20, null);
      edgeWear(v, -26, 0, -21, 26, 22, 21, P.cardboardD, 0.3, 2);
      // mikan box print
      text(v, 'みかん', -15, 13, 0x3a8a3a);
      v.project(['.LL....', '..LOOO.', '.OOOOOO', 'OOOOOOO', 'OOOOOOO', '.OOOOO.', '..OOO..'], { O: 0xff8a1a, L: 0x3a9a3a }, 9, 13, '+z');
      v.project(['GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'], { G: 0x3a8a3a }, -16, 4, '+z');
      // old towel inside
      fill(v, -21, 2, -15, 21, 12, 15, (x, y, z) => ((x + 40) % 6 < 2 ? 0xf4f0e6 : 0x6a8ab8));
      v.shape(-21, 13, -15, 21, 16, 15, (x, y, z) => vnoise(x, y, z, 4, 3) > 0.45 - (y - 13) * 0.08, (x, y, z) => ((x + 40) % 6 < 2 ? 0xf4f0e6 : 0x6a8ab8));
      // the cat: orange tabby, curled up
      const fur = (x, y, z) => {
        const st = Math.floor((x * 0.8 + z * 0.35 + 60 + vnoise(x, y, z, 3, 2) * 3) / 2.6) % 2 === 0;
        return shade(st ? 0xc8692a : 0xf0a254, 0.95 + hash(x, y, z, 4) * 0.06);
      };
      v.ellipsoid(2, 20, -1, 13.5, 8.5, 10.5, fur);
      v.ellipsoid(-9, 23, 5, 6.2, 5.2, 5.8, fur);
      for (const ex of [-13, -6]) {
        for (let i = 0; i < 3; i++) v.box(ex - (2 - i) + 1, 27 + i, 4, ex + (2 - i) - 1 + (i === 0 ? 1 : 0), 27 + i, 5, fur(ex, 27, 4));
        v.set(ex, 27, 6, 0xf4a0a8);
      }
      v.paint(() => {
        v.ellipsoid(-9, 21, 9, 4, 2.6, 2.5, 0xfbf6ee);
        v.ellipsoid(-1, 18, 8, 3.5, 2.5, 3, 0xfbf6ee);
      });
      v.ellipsoid(-4, 18, 9.5, 2.4, 1.6, 2, 0xfbf6ee);
      v.project(['KK...KK', '.......', '...P...', '..K.K..'], { K: 0x4a2a1a, P: 0xf07a8a }, -12, 24, '+z');
      path(v, [[13, 18, -6], [15, 20, 2], [10, 21, 9], [2, 21, 12], [-3, 20, 11]], (x, y, z) => (Math.floor((x + z) / 2) % 2 ? 0xc8692a : 0xf0a254), 1.6);
      v.sphere(-3, 20, 11, 1.6, 0xc8692a);
      v.set(-9, 19, 10, 0xe8b83a); v.set(-8, 19, 10, 0xd8242a);
      // cat dish outside the box
      v.cylinder(-24, 0, 19, 3.6, 3, gloss(0xe5383b));
      v.cylinder(-24, 2, 19, 2.6, 1, 0x8a5a30);
      v.paint(() => { v.set(-25, 2, 19, 0xb07a40); v.set(-23, 2, 20, 0x6a3a1a); });
      grime(v, 0, 3, 0.8);
    },
  },

  // ------------------------------------------------------------- bucket
  bucket: {
    name: 'Tin Bucket & Rag', voxel: 0.007,
    build(v) {
      const galv = (x, y, z) => shade(0xa4abb0, 0.93 + vnoise(x, y, z, 3, 3) * 0.1 + (hash(x, y, z, 4) < 0.1 ? 0.07 : 0));
      const R = (y) => (y < 10 ? 14.8 : y < 27 ? 15.8 : 16.8);
      for (let y = 0; y <= 34; y++) v.tube(0, y, 0, R(y), R(y) - 1.6, 1, galv);
      v.cylinder(0, 0, 0, 14, 1, galv);
      for (const y of [9, 10, 26, 27]) v.tube(0, y, 0, R(y) + 0.6, R(y) - 0.6, 1, (x, yy, z) => shade(0xb4babe, 0.95 + hash(x, yy, z, 5) * 0.08));
      v.torus(0, 35, 0, 17.4, 1, galv, 'y');
      v.cylinder(0, 18, 0, R(18) - 1.2, 1, glass(0x6a98a8));
      for (const s of [-1, 1]) v.box(s * 18, 30, -1, s * 19, 33, 1, galv);
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const th = Math.PI * k / 24;
        pts.push([-18.5 * Math.cos(th), 32 + 17 * Math.sin(th) * 0.42, -17 * Math.sin(th) * 0.9]);
      }
      path(v, pts, gloss(0x8a9096));
      v.cylinder(-4, 39, -15, 1.3, 9, woodFn(0xb07a46, 'x', 2), 'x');
      // rag draped over the front rim
      const rag = (x, y, z) => (x === -4 || x === 3 ? 0xe8e4da : shade(0x7a96b4, 0.92 + vnoise(x, y, z, 2, 6) * 0.12 - (y < 26 ? 0.1 : 0)));
      for (let x = -7; x <= 6; x++) {
        const L = 12 + Math.round((x + 7) * 0.45 + (hash(x, 1, 0, 7) < 0.25 ? 1 : 0));
        const b = Math.round(Math.sin(x * 0.7) * 0.7);
        for (let y = 29; y <= 36; y++) v.set(x, y, 14 + b, rag(x, y, 14));
        for (let z = 14; z <= 19; z++) v.set(x, 37, z + b, rag(x, 37, z));
        for (let y = 36; y >= 37 - L; y--) v.set(x, y, 20 + b, rag(x, y, 20));
        v.set(x, 37 - L, 21 + b, rag(x, 30 - L, 21));
      }
      grime(v, 0, 5, 0.8);
    },
  },

  // ------------------------------------------------------------- watering can
  watering_can: {
    name: 'Tin Watering Can', voxel: 0.007,
    build(v) {
      const pnt = (x, y, z) => gloss(shade(0x5a8a6a, 0.88 + vnoise(x, y, z, 3, 2) * 0.16));
      const tin = gloss(0xb4babe);
      v.shape(-18, 0, -10, 6, 26, 10, (x, y, z) => ((x + 6) / 12) ** 2 + (z / 9.5) ** 2 <= 1, pnt);
      v.shape(-17, 27, -9, 5, 27, 9, (x, y, z) => ((x + 6) / 10.5) ** 2 + (z / 8) ** 2 <= 1, pnt);
      v.tube(-13, 27, 0, 3.6, 2.4, 3, tin);
      v.cylinder(-13, 27, 0, 2.4, 1, 0x1e2a22);
      tint(v, -18, 0, -10, 6, 26, 10, (x, y, z, c, m) => (y === 1 || y === 25 ? gloss(0x9aa2a6) : undefined));
      path(v, [[-16, 24, 0], [-18, 32, 0], [-14, 38, 0], [-3, 38, 0], [2, 32, 0], [3, 27, 0]], tin, 0.9);
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        v.sphere(5 + 19 * t, 5 + 23 * t, 0, 2.2 - t * 0.9, pnt);
      }
      const n = [1, 1.2, 0], nl = Math.hypot(...n);
      v.shape(20, 24, -5, 32, 37, 5, (x, y, z) => {
        const q = [x - 26, y - 31, z], d = (q[0] * n[0] + q[1] * n[1]) / nl;
        const rad = Math.hypot(q[0] - n[0] * d / nl, q[1] - n[1] * d / nl, z);
        return Math.abs(d) <= 0.8 && rad <= 4.2;
      }, (x, y, z) => ((x + y + z) % 2 === 0 && Math.hypot(x - 26, y - 31, z) < 3.4 ? gloss(0x6a4a22) : gloss(0xc89a4a)));
      speckle(v, -19, 0, -11, 30, 38, 11, tin, 0.03, 3);
      blotch(v, -19, 0, -11, 7, 8, 11, gloss(0x8a4a2a), 0.78, 2, 4);
      grime(v, 0, 4, 0.8);
    },
  },

  // ------------------------------------------------------------- rice sacks
  rice_sack: {
    name: 'Stacked Rice Sacks', voxel: 0.008,
    build(v) {
      const bag = (ox, oy, oz, H, base, s) => {
        const hw = 28, hd = 19;
        v.shape(ox - hw, oy, oz - hd, ox + hw, oy + H, oz + hd, (x, y, z) => {
          const fx = Math.abs(x - ox) / hw, fz = Math.abs(z - oz) / hd;
          const f = Math.pow(Math.max(0, 1 - fx ** 5), 0.45) * Math.pow(Math.max(0, 1 - fz ** 3), 0.45);
          return Math.abs(y - (oy + H / 2)) <= (H / 2) * f + 0.3;
        }, (x, y, z) => shade(base, 0.93 + vnoise(x * 2, y, z, 3, s) * 0.06 + hash(x, y, z, s) * 0.04));
        for (const sx of [-1, 1]) v.paint(() => v.shape(ox + sx * 25, oy, oz - hd, ox + sx * 25, oy + H, oz + hd, (x, y, z) => (y + z) % 2 === 0, shade(base, 0.7)));
      };
      bag(0, 0, 0, 15, 0xd6b486, 1);
      bag(2, 15, -1, 15, 0xf2eee4, 2);
      bag(-2, 30, 1, 15, 0xf6f2ea, 3);
      v.paint(() => {
        v.box(-22, 3, 18, 20, 5, 19, 0x3a8a3a); v.box(-22, 8, 18, 20, 8, 19, 0x3a8a3a);
        v.box(-20, 19, 17, 24, 21, 18, 0x2f6fd6);
        v.box(-26, 33, 19, 18, 35, 20, 0xd8322a);
      });
      text(v, 'お米', -12, -10, 0xd8322a, { dir: '+y', scale: 2 });
      v.project(['..Y.Y..', '.Y.Y.Y.', '..YYY..', '...G...', '...G...', '..G.G..'], { Y: 0xe8b030, G: 0x5aa83c }, -26, -6, '+y');
      v.project(['.RR.', 'RRRR', 'RRRR', '.RR.'], { R: 0xe5383b }, 18, -12, '+y');
      text(v, '米', -8, 12, 0x2f6fd6, { dir: '+z' });
    },
  },

  // ------------------------------------------------------------- capsule crate
  capsule_crate: {
    name: 'Box of Gacha Capsules', voxel: 0.008,
    build(v) {
      const cb = cardboardFn(0xc49a62, 6);
      fill(v, -24, 0, -18, 24, 27, 18, cb);
      v.box(-23, 1, -17, 23, 27, 17, null);
      for (let i = 1; i <= 6; i++) {
        fill(v, -23, 27 - i, 18 + i, 23, 28 - i, 18 + i, cb);
        fill(v, -23, 27 - i, -18 - i, 23, 28 - i, -18 - i, cb);
        if (i <= 5) for (const s of [-1, 1]) fill(v, s * (24 + i), 27 - i, -16, s * (24 + i), 28 - i, 16, cb);
      }
      edgeWear(v, -30, 0, -25, 30, 28, 25, P.cardboardD, 0.3, 2);
      fill(v, -23, 1, -17, 23, 19, 17, () => 0x3a3030);
      const A = [0xff6f9a, 0x5cc4ff, 0xffd23f, 0x9bd94a, 0xff8c2e, 0xb08ae8, 0x2fb5a6, 0xe5383b, 0xffb7c8];
      const B = [0xfbf8f2, 0xfbf8f2, 0xfff2b3, 0xbfe3ff];
      const capsule = (cx, cy, cz, k) => {
        const ca = A[k % A.length], cbb = B[(k * 7) % B.length], ax = k % 3;
        v.sphere(cx, cy, cz, 3.4, (x, y, z) => {
          const d = ax === 0 ? y - cy : ax === 1 ? x - cx : z - cz;
          if (Math.abs(d) < 0.5) return gloss(shade(ca, 0.75));
          return gloss(d > 0 ? shade(ca, 0.96 + hash(x, y, z, 1) * 0.06) : cbb);
        });
      };
      let k = 0;
      const layers = [[22, 99, 99], [28, 19, 13], [33.5, 12, 8], [38.5, 5, 3]];
      layers.forEach(([y, rx, rz], L) => {
        for (let iz = -2; iz <= 2; iz++) for (let ix = -3; ix <= 3; ix++) {
          const x = ix * 7 + ((iz + L) % 2 ? 3.5 : 0) + (L % 2) * 1.5, z = iz * 7 + (L % 2) * 2;
          if (Math.abs(x) > 20 || Math.abs(z) > 14) continue;
          if ((x / rx) ** 2 + (z / rz) ** 2 > 1) continue;
          capsule(Math.round(x), y + Math.round((hash(ix, iz, L, 4) - 0.5) * 2), Math.round(z), k++ * 5 + ix * 3 + iz);
        }
      });
      capsule(12, 3, 26, 2); capsule(-16, 3, 25, 4); capsule(27, 3, 14, 7);
      v.shape(1, 0, 22, 8, 3, 29, (x, y, z) => Math.hypot(x - 4.5, y - 3.4, z - 25.5) <= 3.6 && Math.hypot(x - 4.5, y - 3.4, z - 25.5) > 2.4 && y <= 3, gloss(0x5cc4ff));
      text(v, 'ガチャ', -13, 17, 0x2a2222);
      v.project(['..K..', 'KKKKK', '.KKK.', 'K...K'], { K: 0x2a2222 }, 13, 16, '+z');
    },
  },

  // ------------------------------------------------------------- shelf figures
  shelf_figures: {
    name: 'Shelf of Little Figures', voxel: 0.005,
    build(v) {
      // tin robot
      {
        const o = -30, tin = (x, y, z) => gloss(shade(0xb8c0c8, 0.94 + hash(x, y, z, 1) * 0.08)), red = gloss(0xd8342a);
        v.box(o - 5, 0, -3, o - 2, 2, 4, red); v.box(o + 2, 0, -3, o + 5, 2, 4, red);
        fill(v, o - 4, 3, -2, o - 2, 7, 2, tin); fill(v, o + 2, 3, -2, o + 4, 7, 2, tin);
        fill(v, o - 6, 8, -4, o + 6, 19, 4, tin);
        v.box(o - 4, 10, 5, o + 4, 17, 5, red);
        v.project(['WW.WW', 'WK.KW', '.....', 'YYYYY'], { W: 0xffffff, K: C.ink, Y: 0xffd23f }, o - 2, 16, '+z');
        for (const s of [-1, 1]) { fill(v, o + s * 8 - 1, 11, -2, o + s * 8 + 1, 18, 2, tin); v.box(o + s * 8 - 1, 9, -1, o + s * 8 + 1, 10, 1, red); }
        fill(v, o - 5, 20, -4, o + 5, 27, 4, tin);
        v.box(o - 3, 24, 5, o - 2, 25, 5, glow(0xffd84a)); v.box(o + 2, 24, 5, o + 3, 25, 5, glow(0xffd84a));
        for (const x of [o - 3, o - 1, o + 1, o + 3]) v.box(x, 21, 5, x, 22, 5, C.ink);
        for (const s of [-1, 1]) v.box(o + s * 6, 22, -1, o + s * 6, 25, 1, red);
        v.box(o, 28, 0, o, 30, 0, tin); v.set(o, 31, 0, red);
        v.box(o, 13, -5, o, 13, -7, gloss(0xe8b84a)); v.box(o - 1, 12, -7, o + 1, 14, -7, gloss(0xe8b84a));
      }
      // lucky black cat
      {
        const o = -10, blk = (x, y, z) => gloss(shade(0x2a2628, 0.95 + hash(x, y, z, 2) * 0.1));
        v.ellipsoid(o, 7, 0, 6, 7.5, 5, blk); v.box(o - 7, -2, -6, o + 7, -1, 6, null);
        v.ellipsoid(o, 17, 1, 5.5, 4.8, 4.5, blk);
        for (const s of [-1, 1]) { v.box(o + s * 3 - 1, 21, 0, o + s * 3 + 1, 22, 1, blk); v.set(o + s * 3, 23, 0, blk); v.set(o + s * 3, 22, 2, gloss(0xd87a8a)); }
        v.project(['YY.YY', 'YK.KY'], { Y: glow(0xd8e040), K: C.ink }, o - 2, 18, '+z');
        v.project(['P'], { P: 0xf08a9a }, o, 16, '+z');
        v.paint(() => v.shape(o - 6, 12, -6, o + 6, 12, 6, () => true, gloss(0xd8242a)));
        v.sphere(o, 11, 4.5, 1.1, gloss(0xf2c14e));
        path(v, [[o + 4, 1, -4], [o + 7, 2, 0], [o + 6, 2, 4], [o + 3, 1, 5]], blk, 1);
      }
      // kaiju
      {
        const o = 10, g = (x, y, z) => gloss(shade(0x4a9a4a, 0.92 + hash(x, y, z, 3) * 0.1));
        fill(v, o - 4, 0, -2, o - 1, 6, 3, g); fill(v, o + 1, 0, -2, o + 4, 6, 3, g);
        for (const x of [o - 4, o - 2, o + 2, o + 4]) v.set(x, 0, 4, 0xf4f0e0);
        v.ellipsoid(o, 13, -1, 6, 8, 5, g);
        v.paint(() => v.ellipsoid(o, 12, 3, 4, 6, 3, gloss(0xe8dca0)));
        v.ellipsoid(o + 1, 23, 1, 4, 3.5, 4.5, g); v.ellipsoid(o + 1, 22, 4, 3, 2.4, 3, g);
        v.project(['W.W.W', 'RRRRR', 'W.W.W'], { W: 0xffffff, R: 0xa82030 }, o - 1, 22, '+z');
        v.project(['Y...Y'], { Y: 0xffd23f }, o - 1, 25, '+z');
        for (const s of [-1, 1]) v.line(o + s * 6, 15, 1, o + s * 6, 13, 5, g, 0.8);
        for (let y = 8; y <= 25; y += 3) { v.box(o, y, -6, o, y + 1, -7, gloss(0xd8f0c8)); v.set(o, y + 2, -6, gloss(0xd8f0c8)); }
        path(v, [[o, 6, -5], [o + 3, 3, -8], [o + 7, 1, -9]], g, 1.6);
      }
      // kokeshi doll
      {
        const o = 30;
        v.cylinder(o, 0, 0, 4.5, 16, (x, y, z) => (y <= 1 || y === 14 ? gloss(0x8a2a2a) : gloss(shade(0xf2dcb0, 0.96 + hash(x, y, z, 4) * 0.05))));
        for (const [fx, fy] of [[-2, 11], [1, 7], [-1, 4]]) v.project(['.R.', 'RYR', '.R.'], { R: gloss(0xd8342a), Y: gloss(0xffd23f) }, o + fx, fy, '+z');
        v.project(['G', 'G'], { G: gloss(0x3a8a3a) }, o + 2, 11, '+z');
        v.sphere(o, 21.5, 0, 5.8, (x, y, z) => (y >= 23 || z < -1 || (y >= 18 && Math.abs(x - o) >= 5) ? gloss(0x1e1a1a) : gloss(0xf6e8d0)));
        v.project(['K.K..', '.....', '..R..'], { K: C.ink, R: 0xd8342a }, o - 2, 21, '+z');
        v.project(['.K...K.'], { K: C.ink }, o - 3, 21, '+z');
        v.sphere(o + 4, 25, 1, 1.4, gloss(0xe5383b));
      }
      dust(v, 0xc8bca8, 0.15);
    },
  },
};

export default garage;
