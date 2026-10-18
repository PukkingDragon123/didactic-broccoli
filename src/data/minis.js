// Mini Decos (ミニデコ) — tiny chibi diorama pieces that sit in display slots next to figures.
// Same voxel conventions as collectibles: ~0.0027 m per voxel, bottom on y = 0, centred, facing +z.
// Each mini is 15–30 voxels in its largest dimension (≈ 4–8 cm).
import { C, shade, mix } from '../voxel/palette.js';
import { gloss, metal, glow, glass, decColor, decMat, enc } from '../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;
const BARK = 0x6e4630;
const DIRT = 0x8a6447;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ helpers
/** Deterministic 0..1 hash of integer coordinates. */
function hash(x, y, z, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683) ^ Math.imul(s | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Positive modulo. */
const pmod = (a, n) => ((a % n) + n) % n;

/** Angular sector index (0..n-1) of (x, z) around the y axis. */
const sector = (x, z, n, off = 0) => pmod(Math.floor(((Math.atan2(z, x) + Math.PI) / TAU) * n + off), n);

/** Rounded oval base: grassy top layer with drips over a soil side. */
function pad(v, rx, rz, h, top, side, { seed = 1, y0 = 0 } = {}) {
  const inE = (x, z, ax, az) => (x / (ax + 0.35)) ** 2 + (z / (az + 0.35)) ** 2 <= 1;
  for (let i = 0; i < h; i++) {
    const y = y0 + i;
    const s = i === h - 1 && h > 1 ? 1 : 0;
    v.shape(-rx - 1, y, -rz - 1, rx + 1, y, rz + 1, (x, _, z) => inE(x, z, rx - s, rz - s), (x, _, z) => {
      if (i === h - 1) return top;
      if (i === h - 2 && (!inE(x, z, rx - 1, rz - 1) ? hash(x, y, z, seed) < 0.45 : true)) return top;
      return i === 0 && h > 2 ? shade(side, 0.85) : side;
    });
  }
  return v;
}

/** Recolour voxels of colour `col`: top-exposed -> top, bottom-exposed -> bottom (keeps material). */
function tone(v, col, top, bottom) {
  const list = [];
  v.forEach((x, y, z, val) => { if (decColor(val) === col) list.push([x, y, z, decMat(val)]); });
  for (const [x, y, z, m] of list) {
    let c = null;
    if (top != null && !v.has(x, y + 1, z)) c = top;
    else if (bottom != null && !v.has(x, y - 1, z)) c = bottom;
    if (c != null) v.set(x, y, z, c >= 0x1000000 ? c : enc(c, m));
  }
}

/** Randomly recolour some voxels of colour `col` (pick = fn(x,y,z) -> colour|null). */
function speckle(v, col, pick) {
  const list = [];
  v.forEach((x, y, z, val) => { if (decColor(val) === col) list.push([x, y, z]); });
  for (const [x, y, z] of list) { const c = pick(x, y, z); if (c != null) v.set(x, y, z, c); }
}

/** Is any of the 6 neighbours empty? */
const exposed = (v, x, y, z) => !v.has(x + 1, y, z) || !v.has(x - 1, y, z) || !v.has(x, y + 1, z) || !v.has(x, y - 1, z) || !v.has(x, y, z + 1) || !v.has(x, y, z - 1);

/** Tiny chibi face projected on the front. Eyes are 2 tall at (cx ± s, ey..ey-1). */
function face(v, cx, ey, { s = 2, mouth = 'dot', blush = C.blush, eye = K, big = false } = {}) {
  const L = { K: eye, W, M: K, T: C.tongue, P: blush };
  if (big) {
    const gap = '.'.repeat(Math.max(0, 2 * s - 3));
    v.project([`KW${gap}KW`, `KK${gap}KK`], L, cx - s, ey);
  } else {
    const gap = '.'.repeat(2 * s - 1);
    v.project([`K${gap}K`, `K${gap}K`], L, cx - s, ey);
  }
  const m = { dot: ['M'], smile: ['M.M', '.M.'], wide: ['M...M', '.MMM.'], open: ['MMM', 'MTM'], o: ['MM', 'MM'] }[mouth];
  if (m) v.project(m, L, cx - Math.floor(m[0].length / 2), ey - 2);
  if (blush) {
    const bx = big ? s + 1 : s + 1;
    v.project(['P'], L, cx - bx, ey - 2);
    v.project(['P'], L, cx + bx, ey - 2);
  }
  return v;
}

/** Carve a front pattern: surface voxel removed, the one behind it lit (glowing recess). */
function carve(v, rows, x0, y0, inner) {
  const b = v.bounds();
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.' || ch === ' ') return;
    const x = x0 + c, y = y0 - r;
    for (let z = b.maxZ; z >= b.minZ; z--) if (v.has(x, y, z)) { v.remove(x, y, z); v.set(x, y, z - 1, inner); break; }
  }));
}

/** Tulip head (cup with three petal tips) sitting on top of (x, y, z). */
function tulip(v, x, y, z, c) {
  const d = shade(c, 0.8);
  v.box(x - 1, y + 1, z - 1, x + 1, y + 3, z + 1, c);
  v.set(x - 1, y + 1, z - 1, null).set(x + 1, y + 1, z - 1, null).set(x - 1, y + 1, z + 1, null).set(x + 1, y + 1, z + 1, null);
  v.set(x - 1, y + 4, z, c).set(x + 1, y + 4, z, c).set(x, y + 4, z + 1, c).set(x, y + 4, z - 1, d);
  v.set(x, y + 1, z + 1, d);
}

/** Front-facing daisy (5-voxel cross of petals around a centre). */
function daisy(v, x, y, z, petal = W, centre = C.yellow) {
  v.set(x, y, z, centre).set(x - 1, y, z, petal).set(x + 1, y, z, petal).set(x, y + 1, z, petal).set(x, y - 1, z, petal);
}

/** Cylinder-ish crystal grown from (x,y,z) along direction (dx,dy,dz), tapering to a point. */
function crystal(v, x, y, z, dx, dy, dz, len, r, col, core) {
  const n = Math.hypot(dx, dy, dz); dx /= n; dy /= n; dz /= n;
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    const rr = t < 0.62 ? r : r * (1 - (t - 0.62) / 0.38);
    const px = x + dx * i, py = y + dy * i, pz = z + dz * i;
    if (rr >= 0.75) v.sphere(px, py, pz, rr, col); else v.set(px, py, pz, col);
  }
  if (core) for (let i = 1; i <= len * 0.7; i++) {
    const px = x + dx * i, py = y + dy * i, pz = z + dz * i;
    if (r >= 1.5) v.sphere(px, py, pz, r - 1, core); else v.set(px, py, pz, core);
  }
}

/** Two-tone gacha capsule (3×3×3 rounded) centred at (x,y,z). */
function capsule(v, x, y, z, col, low = 0xf4f4f8) {
  v.shape(x - 1, y - 1, z - 1, x + 1, y + 1, z + 1, (a, b, c) => (a - x) ** 2 + (b - y) ** 2 + (c - z) ** 2 <= 2.56,
    (a, b) => (b >= y ? gloss(col) : gloss(low)));
}

/** Tiny round fruit / ball (plus-shaped + core) — reads as a sphere at 3 voxels. */
function ball(v, x, y, z, c) { v.sphere(x, y, z, 1, c); }

// ------------------------------------------------------------------ catalogue
export const MINIS = {
  // ================================================================ NATURE
  sakura: {
    name: 'Tiny Sakura Tree', jp: 'ちび桜', price: 600, themes: ['nature', 'shrine', 'cute'],
    build(v) {
      pad(v, 9, 8, 3, C.grass, DIRT);
      v.box(-1, 3, -1, 1, 11, 1, BARK);
      v.box(-2, 3, -2, 2, 3, 2, BARK);
      v.set(-3, 3, 0, BARK).set(3, 3, 0, BARK).set(0, 3, 3, BARK).set(0, 3, -3, BARK);
      v.line(0, 10, 0, -4, 13, 1, BARK, 1);
      v.line(0, 11, 0, 4, 14, -1, BARK, 1);
      const P = C.sakura;
      for (const [x, y, z, r] of [[0, 18, 0, 7], [-6, 16, 1, 4.5], [6, 16, 0, 4.5], [-3, 21, -1, 4.5], [3, 21, 2, 4.5], [0, 15, 3, 4.5], [0, 17, -4, 5]]) {
        v.ellipsoid(x, y, z, r, r * 0.85, r, P);
      }
      speckle(v, P, (x, y, z) => {
        if (y <= 13) return mix(P, C.sakuraDeep, 0.75);
        if (y <= 15) return mix(P, C.sakuraDeep, 0.4);
        const h = hash(x, y, z, 3);
        if (h < 0.13) return 0xfff2f6;
        if (h < 0.2) return C.sakuraDeep;
        return y >= 22 ? mix(P, W, 0.35) : null;
      });
      face(v, 0, 8, { s: 1, mouth: 'dot', blush: null, eye: 0x2a1810 });
      // fallen petals
      for (const [x, z] of [[-6, 4], [5, 5], [-3, 6], [7, -2], [2, 7], [-7, -3], [4, -6]]) v.set(x, 3, z, hash(x, 0, z) < 0.5 ? C.sakura : C.sakuraDeep);
    },
  },

  bonsai: {
    name: 'Pocket Bonsai', jp: '盆栽', price: 800, themes: ['nature', 'home'],
    build(v) {
      const pot = gloss(0x2e5d8c), potD = gloss(0x22466b);
      for (const [x, z] of [[-7, -4], [6, -4], [-7, 3], [6, 3]]) v.box(x, 0, z, x + 1, 0, z + 1, potD);
      v.box(-8, 1, -5, 8, 5, 5, pot);
      v.box(-9, 5, -6, 9, 6, 6, pot);
      v.paint(() => v.box(-9, 6, -6, 9, 6, 6, gloss(0x3d73a8)));
      v.box(-8, 2, 6, 8, 2, 6, null);
      v.paint(() => { for (let x = -7; x <= 7; x += 2) v.set(x, 3, 5, gloss(0xe8eef5)); });
      v.box(-7, 6, -4, 7, 6, 4, 0x4a3022);
      v.ellipsoid(-3, 7, 1, 3, 1, 2, C.moss);
      v.ellipsoid(4, 7, -1, 2, 1, 2, shade(C.moss, 1.15));
      v.set(5, 7, 3, C.lightgray).set(6, 7, 3, C.gray);
      // twisting trunk
      v.line(0, 7, 0, -3, 11, 0, BARK, 1.2);
      v.line(-3, 11, 0, 1, 15, 0, BARK, 1);
      v.line(1, 15, 0, -1, 18, 0, BARK, 0.8);
      v.line(-3, 11, 0, -7, 13, 1, BARK);
      v.line(1, 14, 0, 6, 15, -1, BARK);
      const G = 0x4f9a3a;
      for (const [x, y, z, rx, ry, rz] of [[-7, 14, 1, 4, 1.6, 3], [6, 16, -1, 4, 1.6, 3], [-1, 20, 0, 4.5, 2, 3.5], [2, 17, 2, 2.6, 1.4, 2.2]]) v.ellipsoid(x, y, z, rx, ry, rz, G);
      tone(v, G, 0x7cc45a, 0x356f2a);
    },
  },

  pine: {
    name: 'Snowy Fir & Snowman', jp: 'ゆきもみの木', price: 350, themes: ['nature', 'cute'],
    build(v) {
      pad(v, 10, 9, 2, C.white, DIRT, { seed: 4 });
      v.box(-1, 2, -1, 1, 5, 1, BARK);
      const G = 0x2f7d4a;
      v.cone(0, 5, 0, 7.5, 7, G);
      v.cone(0, 10, 0, 6, 7, G);
      v.cone(0, 15, 0, 4.5, 7, G);
      speckle(v, G, (x, y, z) => {
        if (y === 5 || y === 10 || y === 15) return 0x235f38;
        if (!v.has(x, y + 1, z) && hash(x, y, z, 7) < 0.75) return C.white;
        if (x < 0 && hash(x, y, z, 8) < 0.25) return 0x4a9a62;
        return null;
      });
      v.set(0, 22, 0, glow(C.yellow));
      // little snowman
      const sx = -7, sz = 6, Sn = gloss(W);
      v.sphere(sx, 3.5, sz, 1.8, Sn);
      v.sphere(sx, 6.4, sz, 1.3, Sn);
      v.set(sx - 1, 7, sz + 1, K).set(sx + 1, 7, sz + 1, K).set(sx, 6, sz + 2, C.orange);
      v.box(sx - 1, 5, sz - 1, sx + 1, 5, sz + 1, C.red); v.set(sx + 1, 4, sz + 2, C.red);
      v.box(sx - 1, 8, sz - 1, sx + 1, 8, sz + 1, C.charcoal); v.set(sx, 9, sz, C.charcoal);
      v.set(sx, 4, sz + 2, K).set(sx, 3, sz + 2, K);
    },
  },

  flowerpot: {
    name: 'Happy Flowerpot', jp: '植木鉢', price: 250, themes: ['cute', 'nature', 'home'],
    build(v) {
      const terra = 0xd9774a, terraD = 0xb85c38;
      v.cylinder(0, 0, 0, 4, 1, terra);
      v.cylinder(0, 1, 0, 5, 5, terra);
      v.cylinder(0, 6, 0, 5, 1, 0x4a3022);
      v.tube(0, 6, 0, 6.5, 4.8, 2, terraD);
      v.paint(() => v.cylinder(0, 0, 0, 5, 1, shade(terra, 0.85)));
      face(v, 0, 4, { s: 2, mouth: 'smile' });
      const S = C.leaf;
      v.line(-3, 7, 0, -3, 12, 0, S); tulip(v, -3, 12, 0, gloss(C.red));
      v.line(3, 7, 1, 3, 11, 1, S); tulip(v, 3, 11, 1, gloss(C.yellow));
      v.line(0, 7, -1, 0, 15, -1, S);
      v.box(-1, 15, -1, 1, 17, -1, W); v.box(-2, 16, -1, 2, 16, -1, W); v.set(0, 16, 0, C.yellow); v.set(0, 16, -1, C.yellow);
      // leaves
      v.set(-4, 9, 0, S).set(-5, 10, 0, C.lime).set(4, 8, 1, S).set(5, 9, 1, C.lime).set(1, 10, -1, S).set(2, 11, -1, C.lime);
    },
  },

  mushrooms: {
    name: 'Toadstool Trio', jp: 'きのこトリオ', price: 300, themes: ['nature', 'cute', 'weird'],
    build(v) {
      pad(v, 8, 7, 2, C.moss, DIRT);
      const cap = (x, y, z, rx, ry, col) => {
        v.shape(Math.floor(x - rx - 1), y, Math.floor(z - rx - 1), Math.ceil(x + rx + 1), Math.ceil(y + ry + 1), Math.ceil(z + rx + 1),
          (a, b, c) => ((a - x) / (rx + 0.2)) ** 2 + ((b - y) / (ry + 0.2)) ** 2 + ((c - z) / (rx + 0.2)) ** 2 <= 1, col);
        v.paint(() => v.cylinder(x, y, z, rx - 0.5, 1, 0xf3e3c4));
      };
      // big one
      v.cylinder(-2, 2, 0, 2, 7, C.cream);
      cap(-2, 8, 0, 6, 4.5, gloss(C.red));
      // medium
      v.cylinder(5, 2, 0, 1.2, 4, C.cream);
      cap(5, 5, 0, 3.2, 2.4, gloss(0xff7a3a));
      // small
      v.cylinder(-7, 2, 3, 0.6, 2, C.cream);
      cap(-7, 3, 3, 1.8, 1.4, gloss(C.red));
      speckle(v, C.red, (x, y, z) => (hash(x, y, z, 2) < 0.16 && y > 8 ? gloss(W) : null));
      speckle(v, 0xff7a3a, (x, y, z) => (hash(x, y, z, 5) < 0.18 && y > 5 ? gloss(W) : null));
      face(v, -2, 6, { s: 1, mouth: 'dot' });
      v.set(1, 2, 5, C.grass).set(1, 3, 5, C.lime).set(-5, 2, -4, C.grass).set(-5, 3, -4, C.lime).set(6, 2, -3, C.grass);
    },
  },

  flowers: {
    name: 'Flower Patch', jp: 'お花畑', price: 150, themes: ['nature', 'cute'],
    build(v) {
      pad(v, 8, 6, 2, C.grass, DIRT, { seed: 9 });
      for (let x = -7; x <= 7; x++) for (let z = -5; z <= 5; z++) {
        if ((x / 7.4) ** 2 + (z / 5.4) ** 2 > 1) continue;
        const h = hash(x, 0, z, 11);
        if (h < 0.2) v.box(x, 2, z, x, 2 + Math.floor(hash(x, 1, z) * 3), z, h < 0.1 ? C.grassDark : C.lime);
      }
      const stems = [[-5, -1, 5, 'd'], [-2, 2, 4, 't'], [1, -2, 7, 'd'], [4, 1, 5, 'b'], [6, -2, 4, 'd'], [-1, -4, 5, 'b'], [-6, 3, 3, 'd'], [3, 4, 3, 't']];
      for (const [x, z, h, t] of stems) {
        v.box(x, 2, z, x, 1 + h, z, C.leaf);
        const y = 2 + h;
        if (t === 'd') daisy(v, x, y, z, hash(x, 0, z, 2) < 0.5 ? W : C.pastelPink);
        else if (t === 't') { v.box(x - 1, y, z, x + 1, y + 1, z, gloss(C.hotpink)); v.set(x, y + 1, z, null); v.set(x, y, z + 1, gloss(C.hotpink)); }
        else { v.set(x, y, z, C.sky).set(x, y + 1, z, C.blue).set(x - 1, y, z, C.sky).set(x + 1, y, z, C.sky); }
      }
      // ladybug
      v.box(4, 2, -4, 6, 3, -3, gloss(C.red)); v.set(4, 3, -4, null).set(6, 3, -4, null);
      v.set(5, 2, -2, K).set(4, 3, -3, K).set(6, 3, -3, K);
      // butterfly on the tallest daisy
      v.set(0, 11, -2, K).set(-1, 11, -2, C.pastelYellow).set(-2, 12, -2, C.pastelYellow).set(-1, 12, -2, C.yellow);
      v.set(2, 11, -2, C.pastelYellow).set(3, 12, -2, C.pastelYellow).set(2, 12, -2, C.yellow);
    },
  },

  rock: {
    name: 'Mossy Rock & Snail', jp: '苔岩とかたつむり', price: 200, themes: ['nature', 'cute'],
    build(v) {
      pad(v, 9, 7, 1, C.moss, DIRT);
      const S = C.stone;
      v.ellipsoid(-2, 5, -1, 6, 5, 5, S);
      v.ellipsoid(3, 3, 0, 4, 3, 4, S);
      v.ellipsoid(-5, 2, 3, 3, 2, 2.5, S);
      v.box(-12, -2, -12, 12, 0, 12, null);
      pad(v, 9, 7, 1, C.moss, DIRT);
      speckle(v, S, (x, y, z) => {
        if (!v.has(x, y + 1, z) && (y >= 5 || hash(x, y, z, 1) < 0.5)) return hash(x, y, z, 2) < 0.3 ? 0x8fb04e : C.moss;
        const h = hash(x, y, z, 3);
        return h < 0.2 ? shade(S, 0.85) : h < 0.32 ? shade(S, 1.12) : null;
      });
      // fern sprout
      v.line(-3, 10, -1, -4, 13, -1, C.leaf); v.set(-5, 12, -1, C.lime).set(-3, 12, -1, C.lime).set(-5, 14, -1, C.lime);
      // snail
      const F = 0xf0dca0;
      v.box(6, 1, 2, 8, 1, 7, F);
      v.box(6, 2, 6, 8, 4, 7, F);
      v.set(6, 5, 7, F).set(8, 5, 7, F).set(6, 6, 7, K).set(8, 6, 7, K);
      v.set(7, 3, 7, K).set(6, 3, 7, C.blush).set(8, 3, 7, C.blush);
      v.ellipsoid(7, 4.5, 3.5, 1.7, 2.6, 2.6, gloss(0xe0955a));
      v.paint(() => v.torus(7, 4.5, 3.5, 1.4, 0.45, gloss(0x9a5a3a), 'x'));
      v.set(9, 5, 3, gloss(0xf4c08a)).set(5, 5, 3, gloss(0xf4c08a));
    },
  },

  // ================================================================ SHRINE
  torii: {
    name: 'Mini Torii Gate', jp: 'ミニ鳥居', price: 900, themes: ['shrine'],
    build(v) {
      const R = C.vermilion, B = C.lacquerBlack;
      v.box(-11, 0, -3, 11, 1, 3, C.stone);
      v.paint(() => v.box(-11, 1, -3, 11, 1, 3, shade(C.stone, 1.12)));
      v.box(-11, 1, -3, -11, 1, 3, null); v.box(11, 1, -3, 11, 1, 3, null);
      for (const sx of [-7, 7]) {
        v.cylinder(sx, 2, 0, 2, 2, B);
        v.cylinder(sx, 4, 0, 1.3, 14, R);
      }
      v.box(-10, 14, -1, 10, 15, 1, R);
      v.box(-10, 18, -1, 10, 18, 1, R);
      v.box(-11, 19, -2, 11, 20, 2, B);
      v.box(-12, 20, -2, -12, 21, 2, B); v.box(12, 20, -2, 12, 21, 2, B);
      v.box(-1, 16, 0, 1, 17, 0, R);
      v.box(-2, 15, 2, 2, 17, 2, B); v.box(-1, 16, 2, 1, 16, 2, metal(C.gold));
      v.paint(() => { v.box(-11, 20, -2, 11, 20, 2, 0x3a2a2a); });
      // grass tufts
      for (const [x, z] of [[-10, 3], [-4, 3], [9, 3], [3, -3]]) { v.set(x, 2, z, C.grass); v.set(x + 1, 2, z, C.lime); }
    },
  },

  toro: {
    name: 'Stone Lantern', jp: '石灯籠', price: 700, themes: ['shrine', 'nature'],
    build(v) {
      const S = C.stone, SD = shade(S, 0.82), SL = shade(S, 1.12);
      v.box(-5, 0, -5, 5, 1, 5, SD);
      v.box(-4, 2, -4, 4, 2, 4, S);
      v.cylinder(0, 3, 0, 1.6, 6, S);
      v.box(-4, 9, -4, 4, 10, 4, S);
      v.paint(() => v.box(-4, 10, -4, 4, 10, 4, SL));
      v.box(-3, 11, -3, 3, 15, 3, S);
      const L = glow(0xffc964);
      v.box(-1, 12, -3, 1, 14, 3, L);
      v.box(-3, 12, -1, 3, 14, 1, L);
      v.box(-6, 16, -6, 6, 16, 6, SD);
      v.box(-5, 17, -5, 5, 17, 5, S);
      v.box(-3, 18, -3, 3, 18, 3, S);
      v.box(-1, 19, -1, 1, 19, 1, S);
      for (const x of [-6, 6]) for (const z of [-6, 6]) v.set(x, 17, z, SD);
      v.sphere(0, 21, 0, 1.5, SL);
      v.set(0, 23, 0, SL);
      speckle(v, S, (x, y, z) => (!v.has(x, y + 1, z) && hash(x, y, z, 4) < 0.45 ? (hash(x, y, z, 5) < 0.5 ? C.moss : 0x8fb04e) : null));
      speckle(v, SD, (x, y, z) => (!v.has(x, y + 1, z) && hash(x, y, z, 6) < 0.35 ? C.moss : null));
    },
  },

  ema: {
    name: 'Ema Wishing Rack', jp: '絵馬掛け', price: 650, themes: ['shrine'],
    build(v) {
      const Wd = C.wood, Rf = 0x4b7a68;
      v.box(-11, 0, -3, 11, 0, 3, C.stone);
      v.box(-9, 1, -1, -8, 16, 0, Wd); v.box(8, 1, -1, 9, 16, 0, Wd);
      v.box(-9, 14, -1, 9, 14, 0, Wd);
      v.box(-9, 8, -1, 9, 8, 0, Wd);
      for (let i = 0; i < 4; i++) v.box(-11, 17 + i, -4 + i, 11, 17 + i, 3 - i, i === 0 ? shade(Rf, 0.8) : Rf);
      v.box(-11, 21, -1, 11, 21, 0, shade(Rf, 0.75));
      v.box(-9, 16, -1, 9, 16, 0, C.woodDark);
      const plaque = (cx, top, pic, tilt) => {
        const rows = ['.W.', 'WWW', 'WXW', 'WWW'];
        v.layer(rows, { W: C.woodLight, X: pic }, { x: cx - 1, y: top + tilt, z: 1 });
        v.set(cx, top + 1, 1, C.red);
      };
      const pics = [C.red, 0x5a3a26, C.hotpink, C.blue, C.green, C.orange, C.purple];
      [-6, -2, 2, 6].forEach((cx, i) => plaque(cx, 13, pics[i], i % 2 ? 0 : 0));
      [-4, 0, 4].forEach((cx, i) => plaque(cx, 7, pics[4 + i], 0));
      // front plaques get a tiny painted stroke at the top too
      v.set(-6, 12, 1, gloss(C.red)).set(2, 12, 1, K).set(0, 6, 1, K);
    },
  },

  chochin: {
    name: 'Red Paper Lantern', jp: '赤提灯', price: 500, themes: ['shrine', 'retro'],
    build(v) {
      const B = C.lacquerBlack;
      v.box(-10, 0, -3, -4, 1, 3, C.woodDark);
      v.box(-8, 2, -1, -7, 23, 0, C.wood);
      v.box(-8, 23, -1, 1, 24, 0, C.wood);
      v.set(0, 22, 0, metal(C.steel)).set(0, 21, 0, metal(C.steel));
      v.ellipsoid(0, 13, 0, 5, 6.5, 5, glow(0xff4a3a));
      v.paint(() => { for (let y = 8; y <= 18; y += 2) v.cylinder(0, y, 0, 6, 1, glow(0xd8302a)); });
      v.cylinder(0, 19, 0, 3, 2, B);
      v.cylinder(0, 5, 0, 3, 2, B);
      v.project(['..K..', 'KKKKK', '..K..', '.K.K.', 'K...K'], { K: 0x2a0d0d }, -2, 15);
      v.box(0, 2, 0, 0, 4, 0, C.gold);
      v.set(0, 2, 1, C.gold).set(0, 2, -1, C.gold).set(1, 2, 0, C.gold).set(-1, 2, 0, C.gold);
    },
  },

  // ================================================================ CITY
  bench: {
    name: 'Park Bench & Cat', jp: '公園のベンチ', price: 400, themes: ['city', 'nature', 'cute'],
    build(v) {
      const I = metal(0x2f3a36), Wd = C.woodLight;
      for (const x of [-9, 9]) {
        v.line(x, 0, 4, x, 5, 4, I);
        v.line(x, 0, -4, x, 11, -4, I);
        v.line(x, 8, -4, x, 8, 3, I);
        v.line(x, 5, 3, x, 8, 3, I);
        v.set(x, 0, 5, I).set(x, 0, -5, I);
      }
      for (const [z0, z1] of [[-3, -2], [0, 1], [3, 4]]) v.box(-8, 5, z0, 8, 5, z1, Wd);
      v.box(-8, 7, -4, 8, 8, -4, Wd);
      v.box(-8, 10, -4, 8, 11, -4, Wd);
      v.paint(() => { v.box(-8, 5, -3, -8, 11, 4, C.wood); v.box(8, 5, -3, 8, 11, 4, C.wood); });
      // sleepy cat loaf
      const O = C.fox, Cr = C.cream, OD = shade(C.fox, 0.82);
      v.box(2, 6, -3, 6, 8, 1, O);
      v.set(2, 8, -3, null).set(6, 8, -3, null);
      v.paint(() => { v.box(2, 8, -2, 6, 8, -2, OD); v.box(2, 8, 0, 6, 8, 0, OD); });
      v.box(2, 6, 2, 6, 9, 4, O);
      v.set(2, 9, 4, null).set(6, 9, 4, null).set(2, 6, 4, null).set(6, 6, 4, null);
      v.set(2, 10, 3, O).set(6, 10, 3, O).set(2, 10, 2, OD).set(6, 10, 2, OD);
      v.paint(() => v.box(3, 6, 4, 5, 7, 4, Cr));
      v.set(3, 8, 4, K).set(5, 8, 4, K).set(4, 7, 4, C.hotpink).set(2, 7, 4, C.blush).set(6, 7, 4, C.blush);
      v.line(6, 6, -3, 7, 6, 1, O); v.set(7, 6, 2, Cr);
    },
  },

  streetlamp: {
    name: 'Gas Street Lamp', jp: '街灯', price: 600, themes: ['city', 'retro'],
    build(v) {
      const I = metal(0x2c4a3e), G = metal(C.gold);
      v.cylinder(0, 0, 0, 3, 1, I);
      v.cylinder(0, 1, 0, 2.3, 2, I);
      v.cylinder(0, 3, 0, 1, 15, I);
      v.cylinder(0, 7, 0, 1.6, 1, G);
      v.cylinder(0, 16, 0, 1.6, 1, G);
      v.box(-2, 18, -2, 2, 18, 2, I);
      v.box(-2, 19, -2, 2, 23, 2, glow(0xfff0b8));
      for (const x of [-2, 2]) for (const z of [-2, 2]) v.box(x, 19, z, x, 23, z, I);
      v.box(-3, 24, -3, 3, 24, 3, I);
      v.box(-2, 25, -2, 2, 25, 2, I);
      v.box(-1, 26, -1, 1, 26, 1, I);
      v.set(0, 27, 0, G);
      // flower basket on a little arm
      v.line(1, 14, 0, 4, 14, 0, I);
      v.set(4, 13, 0, I);
      v.ellipsoid(4, 11, 0, 1.8, 1.2, 1.8, 0xb08850);
      for (const [x, z, c] of [[3, 0, C.hotpink], [5, 1, C.pink], [4, -1, C.hotpink], [4, 1, W], [5, -1, C.pink]]) v.set(x, 12, z, c);
      v.set(3, 10, 1, C.leaf).set(5, 9, 0, C.leaf);
    },
  },

  busstop: {
    name: 'Bus Stop Sign', jp: 'バス停', price: 450, themes: ['city', 'retro'],
    build(v) {
      v.cylinder(0, 0, 0, 4, 2, C.lightgray);
      v.paint(() => v.cylinder(0, 1, 0, 4, 1, shade(C.lightgray, 1.08)));
      v.cylinder(0, 2, 0, 2.3, 1, C.gray);
      v.cylinder(0, 3, 0, 1, 22, metal(C.silver));
      v.shape(-5, 19, 1, 5, 29, 2, (x, y) => x * x + (y - 24) ** 2 <= 5.3 ** 2,
        (x, y) => (x * x + (y - 24) ** 2 > 3.9 ** 2 ? gloss(C.red) : gloss(C.white)));
      v.project(['.BBBBB.', 'BWWBWWB', 'BBBBBBB', 'BYBBBYB', '.K...K.'], { B: gloss(C.blue), W: gloss(0xbfe3ff), Y: glow(C.yellow), K: K }, -3, 26);
      // timetable
      v.box(-2, 10, 1, 2, 17, 1, C.white);
      v.paint(() => {
        v.box(-2, 17, 1, 2, 17, 1, C.blue);
        for (const y of [15, 13, 11]) v.box(-1, y, 1, 1, y, 1, C.gray);
      });
      v.box(-3, 9, 1, 3, 9, 1, metal(C.steel));
    },
  },

  vending: {
    name: 'Drink Vending Machine', jp: '自販機', price: 1200, themes: ['city', 'retro'],
    build(v) {
      const body = gloss(0x3f86e8);
      v.box(-5, 0, -3, 5, 0, 3, C.charcoal);
      v.box(-6, 1, -4, 6, 24, 4, body);
      v.paint(() => {
        v.box(-6, 24, -4, 6, 24, 4, gloss(0x2f6fd6));
        v.box(-5, 22, 4, 5, 23, 4, glow(0xfff6d8));
        v.box(-5, 12, 4, 5, 20, 4, glow(0xe8f4ff));
        v.box(-6, 10, -4, -6, 11, 4, gloss(W)); v.box(6, 10, -4, 6, 11, 4, gloss(W));
        v.box(-5, 2, 4, 5, 9, 4, gloss(0xdfe8f2));
      });
      v.project(['.R.B.R.B.R.', 'R.B.R.B.R.B'], { R: glow(0xff5a7a), B: glow(0x5cc4ff) }, -5, 23);
      const cans = [C.red, C.orange, 0x3cae5a, C.sky, 0x8a5a3a, C.yellow, C.hotpink, W, C.purple, 0x2f9a8a, C.red, 0xf2c27b, C.navy, C.lime, C.orange];
      let i = 0;
      for (const y of [18, 15, 12]) for (const x of [-4, -2, 0, 2, 4]) {
        const c = cans[i++];
        v.box(x, y + 1, 5, x, y + 2, 5, gloss(c));
        v.set(x, y + 2, 5, metal(C.silver));
        v.set(x, y, 4, glow(i % 3 ? 0x7dff8a : 0xff6060));
      }
      // coin slot + dispenser
      v.box(3, 6, 5, 4, 9, 5, metal(C.silver)); v.set(3, 8, 5, K); v.set(4, 7, 5, glow(0xff9a3a));
      v.box(-4, 2, 4, 1, 4, 4, null); v.box(-4, 2, 3, 1, 4, 3, C.charcoal);
      v.box(-4, 4, 4, 1, 4, 4, glass(0x9fb4c8));
      // recycling bin
      v.box(8, 0, -1, 11, 5, 2, gloss(0x3a9f62));
      v.box(8, 6, -1, 11, 6, 2, gloss(0x2c7a4b));
      v.box(9, 6, 0, 10, 6, 1, K);
    },
  },

  postbox: {
    name: 'Hungry Postbox', jp: 'ポスト', price: 350, themes: ['city', 'retro', 'cute'],
    build(v) {
      const R = gloss(0xe0302a);
      v.cylinder(0, 0, 0, 5.4, 2, C.charcoal);
      v.cylinder(0, 2, 0, 4.6, 13, R);
      v.shape(-5, 15, -5, 5, 20, 5, (x, y, z) => x * x + z * z + ((y - 14.5) * 1.2) ** 2 <= 4.8 ** 2, R);
      v.cylinder(0, 14, 0, 4.8, 1, gloss(0xc42620));
      v.box(-2, 12, 4, 2, 12, 5, null); v.box(-2, 12, 3, 2, 12, 3, C.charcoal);
      v.box(-3, 13, 5, 3, 13, 5, R);
      // letter being eaten
      v.box(-1, 12, 4, 1, 12, 7, C.paper); v.set(1, 12, 7, C.red);
      face(v, 0, 17, { s: 2, big: true, mouth: null });
      v.box(-3, 4, 5, 3, 10, 5, C.white);
      v.project(['RRRRR', '.....', 'RRRRR', '..R..', '..R..'], { R: C.red }, -2, 9);
      v.project(['PP.....PP'], { P: C.blush }, -4, 15);
    },
  },

  fence: {
    name: 'White Picket Fence', jp: '白い柵', price: 250, themes: ['home', 'nature'],
    build(v) {
      v.box(-12, 0, -3, 12, 0, 3, DIRT);
      v.box(-12, 1, -3, 12, 1, 3, C.grass);
      for (const x of [-12, 12]) for (const z of [-3, 3]) { v.set(x, 1, z, null); v.set(x, 0, z, null); }
      const P = C.white, PD = shade(C.white, 0.88);
      v.box(-11, 4, -1, 11, 4, -1, PD);
      v.box(-11, 8, -1, 11, 8, -1, PD);
      for (const c of [-10, -6, -2, 2, 6, 10]) {
        v.box(c - 1, 2, 0, c + 1, 10, 1, P);
        v.box(c, 11, 0, c, 11, 1, P);
      }
      // flowers in front
      for (const [x, h, c] of [[-8, 3, C.hotpink], [-4, 4, C.yellow], [0, 3, C.sky], [4, 4, C.hotpink], [8, 3, C.yellow], [-11, 2, C.pink], [11, 2, C.sky]]) {
        v.box(x, 2, 3, x, 1 + h, 3, C.leaf);
        daisy(v, x, 2 + h, 3, c, x % 8 === 0 ? W : C.yellow);
      }
      v.set(-3, 2, 2, C.lime).set(5, 2, 2, C.lime).set(7, 2, 2, C.grassDark);
      // little bird on a post
      v.box(5, 12, 0, 7, 13, 1, C.sky); v.set(6, 14, 1, C.sky); v.set(6, 14, 0, C.sky);
      v.set(6, 13, 2, C.orange); v.set(5, 14, 1, K); v.set(7, 14, 1, K); v.set(6, 12, -1, C.blue);
    },
  },

  // ================================================================ FOOD / CANDY
  picnic: {
    name: 'Picnic Set', jp: 'ピクニック', price: 700, themes: ['food', 'nature', 'cute'],
    build(v) {
      v.shape(-11, 0, -8, 11, 0, 8, () => true, (x, y, z) => {
        const a = pmod(Math.floor((x + 11) / 2), 2) === 0, b = pmod(Math.floor((z + 8) / 2), 2) === 0;
        return a && b ? 0xd8323c : a || b ? 0xf28c96 : 0xfff6f0;
      });
      v.set(11, 1, 8, 0xfff6f0).set(10, 1, 8, 0xf28c96).set(11, 1, 7, 0xf28c96);
      v.set(11, 0, 8, null);
      // wicker basket
      const T = 0xd9a05a, TD = 0xb07a3a;
      v.box(-10, 1, -6, -2, 6, 0, (x, y) => (pmod(x + y, 2) ? T : TD));
      v.box(-10, 7, -6, -6, 7, 0, T);
      v.box(-5, 7, -6, -2, 8, -6, TD);
      v.box(-9, 7, -5, -3, 7, -1, null); v.box(-9, 7, -5, -6, 7, -1, T);
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI;
        v.set(Math.round(-6 + 4 * Math.cos(a)), Math.round(7 + 4 * Math.sin(a)), -3, C.woodDark);
      }
      v.set(-6, 7, -3, null);
      v.set(-4, 7, -3, C.red).set(-3, 7, -2, C.red).set(-5, 7, -2, 0xffd447); // fruit peeking
      // plate with onigiri
      v.cylinder(4, 1, 2, 3, 1, gloss(C.ceramic));
      v.layer(['..W..', '.WWW.', 'WWWWW', 'WNNNW'], { W: C.rice, N: C.nori }, { x: 1, y: 5, z: 3, depth: 2 });
      v.layer(['.W.', 'WWW', 'NNN'], { W: C.rice, N: C.nori }, { x: 5, y: 4, z: 1, depth: 2 });
      v.set(3, 4, 3, C.salmon);
      // juice box with straw
      v.box(7, 1, -5, 8, 4, -4, gloss(0xffd447)); v.box(7, 2, -3, 8, 3, -3, null);
      v.paint(() => v.box(7, 2, -4, 8, 3, -4, gloss(0xff8c2e)));
      v.set(8, 5, -5, C.white).set(8, 6, -5, C.white).set(9, 6, -5, C.white);
      // strawberries
      v.set(-1, 1, 5, gloss(C.red)).set(0, 1, 6, gloss(C.red)).set(-1, 2, 5, C.leaf);
    },
  },

  lollipop: {
    name: 'Swirly Lollipop', jp: 'ぐるぐるキャンディ', price: 300, themes: ['candy', 'cute'],
    build(v) {
      v.shape(-4, 0, -4, 4, 3, 4, (x, y, z) => x * x + z * z <= (4.3 - Math.max(0, y - 1) * 0.8) ** 2, gloss(0x8fe3c8));
      v.paint(() => { v.cylinder(0, 0, 0, 4, 1, gloss(0x6cc9ae)); });
      speckle(v, 0x8fe3c8, (x, y, z) => (hash(x, y, z, 3) < 0.15 ? gloss([C.yellow, C.hotpink, W][Math.floor(hash(x, y, z, 4) * 3)]) : null));
      v.cylinder(0, 4, 0, 1, 11, C.white);
      const cols = [0xff6f9a, 0xfff6fa, 0xffd23f, 0xfff6fa, 0x5cc4ff, 0xfff6fa];
      v.shape(-7, 13, -1, 7, 27, 1, (x, y) => x * x + (y - 20) ** 2 <= 7.3 ** 2, (x, y, z) => {
        const dx = x, dy = y - 20, r = Math.hypot(dx, dy);
        if (r > 6.6) return gloss(0xff4f86);
        const s = (Math.atan2(dy, dx) / TAU) * 6 + r * 0.55;
        return gloss(cols[pmod(Math.floor(s), 6)]);
      });
      v.set(0, 20, 2, gloss(W));
      v.set(-3, 23, 2, gloss(W)).set(-4, 22, 2, gloss(W));
      // ribbon
      const Rb = gloss(0x5cc4ff);
      v.box(-1, 13, 1, 1, 13, 2, Rb);
      v.box(-3, 12, 2, -2, 14, 2, Rb); v.box(2, 12, 2, 3, 14, 2, Rb);
      v.set(-1, 11, 2, Rb).set(1, 10, 2, Rb);
    },
  },

  cupcake: {
    name: 'Strawberry Cupcake', jp: 'カップケーキ', price: 400, themes: ['candy', 'food', 'cute'],
    build(v) {
      const P = 0xbfe3ff;
      v.shape(-6, 0, -6, 6, 5, 6, (x, y, z) => x * x + z * z <= (3.9 + y * 0.32) ** 2, (x, y, z) => (sector(x, z, 16) % 2 ? P : shade(P, 0.86)));
      const F = gloss(0xffa8c5);
      v.ellipsoid(0, 7.5, 0, 6, 2, 6, F);
      v.ellipsoid(0, 10, 0, 4.6, 1.8, 4.6, F);
      v.ellipsoid(0, 12, 0, 3, 1.5, 3, F);
      v.ellipsoid(0, 13.6, 0, 1.5, 1, 1.5, F);
      for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) {
        const r = Math.hypot(x, z);
        if (r > 5 && r < 6.4 && hash(x, 5, z, 8) < 0.45) v.set(x, 5, z, F);
      }
      speckle(v, 0xffa8c5, (x, y, z) => (exposed(v, x, y, z) && hash(x, y, z, 9) < 0.12 ? gloss([C.yellow, C.sky, C.lime, W, C.purple][Math.floor(hash(x, y, z, 10) * 5)]) : null));
      v.sphere(0, 16, 0, 1.6, gloss(C.red));
      v.set(-1, 17, 1, gloss(0xff9a9a));
      v.line(0, 17, 0, 1, 19, -1, 0x5a7a2a);
      face(v, 0, 3, { s: 2, mouth: 'smile' });
    },
  },

  candyhouse: {
    name: 'Candy Cottage', jp: 'おかしの家', price: 1500, themes: ['candy', 'cute', 'home'],
    build(v) {
      const GB = 0xc0773a, CH = 0x6a3a26, IC = 0xfffaf0;
      pad(v, 9, 8, 2, IC, 0xf3b6cc, { seed: 12 });
      v.box(-6, 2, -5, 6, 11, 5, GB);
      for (let i = 0; i < 8; i++) {
        const y = 11 + i, hw = 8 - i;
        if (hw >= 1) {
          v.box(-hw, y, -6, -hw + 1, y, 6, CH); v.box(hw - 1, y, -6, hw, y, 6, CH);
          if (hw - 2 >= 0) v.box(-(hw - 2), y, -5, hw - 2, y, 5, GB);
        }
      }
      v.box(-1, 18, -6, 1, 18, 6, CH);
      tone(v, CH, IC, null);
      // icing drips along the eaves
      for (let x = -6; x <= 6; x++) if (hash(x, 0, 0, 3) < 0.5) v.set(x, 10, 6, IC);
      v.box(-6, 11, 6, 6, 11, 6, null);
      for (let y = 11; y <= 17; y++) { const hw = 8 - (y - 11); v.set(-hw + 1, y, 6, IC); v.set(hw - 1, y, 6, IC); }
      // door
      v.box(-1, 2, 6, 1, 6, 6, gloss(0xff7aa8)); v.set(0, 7, 6, gloss(0xff7aa8)); v.set(1, 4, 7, metal(C.gold));
      // candy canes
      for (const sx of [-3, 3]) {
        for (let y = 2; y <= 7; y++) v.set(sx, y, 6, gloss(y % 2 ? C.red : W));
        v.set(sx + (sx < 0 ? 1 : -1), 8, 6, gloss(C.red)); v.set(sx, 8, 6, gloss(W));
      }
      // windows
      for (const sx of [-5, 4]) { v.box(sx, 8, 6, sx + 1, 9, 6, glow(0xffd77a)); }
      v.box(-6, 6, -1, -6, 8, 1, null); v.box(-7, 6, -1, -7, 8, 1, IC); v.box(-6, 7, 0, -6, 7, 0, glow(0xffd77a));
      v.box(7, 6, -1, 7, 8, 1, IC); v.set(6, 7, 0, glow(0xffd77a)); v.set(7, 7, 0, glow(0xffd77a));
      // gumdrops on the ridge + mints on the wall
      [[-5, C.red], [-2, C.lime], [1, C.yellow], [4, C.purple]].forEach(([z, c]) => v.sphere(0, 19.5, z, 1, gloss(c)));
      for (const [x, y] of [[-5, 4], [5, 4]]) { v.set(x, y, 6, gloss(W)); v.set(x, y, 7, gloss(C.red)); }
      // chimney
      v.box(3, 14, -3, 4, 19, -2, 0xb04a3a); v.box(3, 20, -3, 4, 20, -2, IC);
      v.set(-7, 2, 6, gloss(C.hotpink)).set(7, 2, 5, gloss(C.sky)).set(-6, 2, -7, gloss(C.yellow));
    },
  },

  icecream: {
    name: 'Ice Cream Cart', jp: 'アイス屋台', price: 1300, themes: ['food', 'candy', 'city'],
    build(v) {
      for (const x of [-8, 8]) {
        v.cylinder(x, 3, 0, 3, 1, C.charcoal, 'x');
        v.cylinder(x + (x < 0 ? -1 : 1), 3, 0, 1, 1, metal(C.silver), 'x');
      }
      const B = gloss(0xbfeee0);
      v.box(-7, 3, -4, 7, 11, 4, B);
      v.paint(() => { v.box(-7, 11, -4, 7, 11, 4, gloss(0xff9ec0)); for (let x = -7; x <= 7; x += 2) v.set(x, 10, 4, gloss(0xff9ec0)); });
      v.project(['.PPP.', 'PPPPP', 'YYYYY', '.YXY.', '..Y..'], { P: gloss(C.hotpink), Y: 0xf2c27b, X: 0xc9853f }, -2, 8);
      v.box(-8, 12, -5, 8, 12, 5, C.white);
      v.sphere(-4, 13.4, 1, 1.8, gloss(0xffb7c8));
      v.sphere(0, 13.4, 1, 1.8, gloss(0xb8f0c8));
      v.sphere(4, 13.4, 1, 1.8, gloss(0xfff1d6));
      v.set(-1, 15, 2, 0x5c2b2e).set(1, 14, 2, 0x5c2b2e).set(4, 15, 1, 0xd8a34a).set(-4, 15, 0, gloss(C.red));
      // umbrella
      v.cylinder(0, 13, -3, 0, 12, metal(C.silver));
      v.shape(-10, 19, -13, 10, 25, 7, (x, y, z) => {
        const r = Math.hypot(x, z + 3), top = 24.5 - r * 0.5;
        return r <= 10.3 && y <= top && y >= top - 1.2;
      }, (x, y, z) => gloss(sector(x, z + 3, 10) % 2 ? 0xff7aa8 : W));
      for (let k = 0; k < 10; k++) {
        const a = ((k + 0.5) / 10) * TAU - Math.PI;
        v.set(Math.round(Math.cos(a) * 9.5), 18, Math.round(Math.sin(a) * 9.5 - 3), gloss(k % 2 ? 0xff7aa8 : W));
      }
      v.sphere(0, 26, -3, 1, gloss(C.red));
    },
  },

  // ================================================================ SPACE
  rocket: {
    name: 'Tiny Rocket', jp: 'ちびロケット', price: 1800, themes: ['space', 'retro'],
    build(v) {
      v.cylinder(0, 0, 0, 6, 1, (x, y, z) => (Math.hypot(x, z) > 5 ? (sector(x, z, 12) % 2 ? C.yellow : C.charcoal) : C.gray));
      for (const [x, z, r] of [[-4, 2, 1.8], [4, 2, 1.8], [0, 4, 1.6], [-3, -3, 1.6], [3, -3, 1.6]]) v.sphere(x, 2.4, z, r, hash(x, 0, z) < 0.5 ? C.white : C.offwhite);
      v.shape(-3, 2, -3, 3, 6, 3, (x, y, z) => x * x + z * z <= (0.6 + (y - 2) * 0.55) ** 2, (x, y) => glow(y >= 5 ? 0xffe14d : y >= 3 ? 0xff8a24 : 0xff4a1f));
      v.cylinder(0, 7, 0, 2, 2, metal(0x8a8f99));
      v.shape(-4, 9, -4, 4, 27, 4, (x, y, z) => {
        const r = y <= 20 ? 3.4 + 0.4 * Math.sin(((y - 9) / 11) * Math.PI) : 3.6 * Math.sqrt(Math.max(0, 1 - ((y - 20) / 7.6) ** 2));
        return x * x + z * z <= (r + 0.2) ** 2;
      }, (x, y) => gloss(y >= 21 || y === 12 ? C.red : C.white));
      v.cylinder(0, 16, 2, 2.6, 2, metal(C.silver), 'z');
      v.cylinder(0, 16, 3, 1.6, 2, gloss(0x7fd0ff), 'z');
      v.set(-1, 16, 4, K).set(1, 16, 4, K).set(-1, 17, 4, gloss(W));
      const F = gloss(C.red);
      for (let y = 7; y <= 14; y++) {
        const ext = y <= 10 ? 3 : Math.round(3 - (y - 10) * 0.75);
        if (ext <= 0) continue;
        v.box(-3 - ext, y, 0, -4, y, 0, F); v.box(4, y, 0, 3 + ext, y, 0, F);
        v.box(0, y, -3 - ext, 0, y, -4, F);
      }
      v.set(0, 28, 0, metal(C.silver));
    },
  },

  planet: {
    name: 'Ringed Planet', jp: 'わくせい', price: 1100, themes: ['space', 'cute'],
    build(v) {
      const Br = metal(C.brass);
      v.cylinder(0, 0, 0, 4, 2, Br);
      v.paint(() => v.cylinder(0, 1, 0, 3, 1, metal(0xe6c25a)));
      v.cylinder(0, 2, 0, 1, 6, Br);
      const bands = [0xf6c79a, 0xf0a868, 0xffe0c2, 0xe8885a, 0xffd2a8, 0xf0a868, 0xfff0dc];
      v.sphere(0, 13, 0, 6, (x, y, z) => gloss(bands[pmod(Math.floor((y - 7 + (hash(x, 0, z) < 0.15 ? 1 : 0)) / 2), bands.length)]));
      const a = 0.28, b = 0.38, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      v.shape(-11, 6, -11, 11, 20, 11, (x, y, z) => {
        const dx = x, dy = y - 13, dz = z;
        const x1 = dx * ca + dy * sa, y1 = -dx * sa + dy * ca;
        const y2 = y1 * cb + dz * sb, z2 = -y1 * sb + dz * cb;
        const r = Math.hypot(x1, z2);
        return Math.abs(y2) <= 0.62 && r >= 7.6 && r <= 10.6 && !(dx * dx + dy * dy + dz * dz <= 36.5);
      }, (x, y, z) => {
        const r = Math.hypot(x, y - 13, z);
        return gloss(r < 8.7 ? 0xd9c8ff : r < 9.7 ? 0xa98ce8 : 0xece2ff);
      });
      v.project(['.RR.', 'RRRR', '.RR.'], { R: gloss(0xd8603a) }, 1, 12);
      // tiny moon + sparkle
      v.sphere(-7, 4, 3, 1.4, gloss(0xfff2b3));
      v.set(-7, 2, 3, Br);
      v.set(6, 4, 3, glow(C.yellow)).set(6, 5, 3, glow(C.yellow)).set(5, 4, 3, glow(C.yellow)).set(7, 4, 3, glow(C.yellow)).set(6, 3, 3, glow(C.yellow));
    },
  },

  ufo: {
    name: 'UFO Cow Abduction', jp: 'UFO', price: 2000, themes: ['space', 'weird'],
    build(v) {
      pad(v, 7, 7, 2, C.grass, DIRT, { seed: 3 });
      v.cone(0, 2, 0, 5, 9, glass(0xaaffd4));
      // cow
      v.box(-2, 5, -1, 1, 7, 1, W);
      v.paint(() => { v.box(-2, 6, -1, -1, 7, 1, K); v.box(1, 5, 0, 1, 6, 1, K); });
      v.box(2, 6, -1, 3, 7, 1, W); v.box(3, 6, -1, 3, 6, 1, C.pink);
      v.set(3, 7, 0, K).set(2, 8, -1, C.cream).set(2, 8, 1, C.cream);
      for (const [x, z] of [[-2, -1], [-2, 1], [1, -1], [1, 1]]) v.set(x, 4, z, W);
      v.set(-3, 7, 0, W);
      // saucer
      v.ellipsoid(0, 11, 0, 5, 1.5, 5, metal(0x8e96a3));
      v.ellipsoid(0, 12.5, 0, 9, 2, 9, metal(C.silver));
      const lights = [0xff5a7a, 0xffe14d, 0x5cf0ff];
      speckle(v, C.silver, (x, y, z) => (y === 12 && Math.hypot(x, z) >= 8.2 ? (pmod(Math.round((Math.atan2(z, x) / TAU) * 16), 2) ? glow(lights[sector(x, z, 3)]) : null) : null));
      v.cylinder(0, 14, 0, 5, 1, metal(0xb8bec8));
      v.shape(-5, 15, -5, 5, 20, 5, (x, y, z) => x * x + z * z + (y - 14.6) ** 2 <= 4.5 ** 2, glass(0xbff2ff));
      v.sphere(0, 16.5, 0, 2, gloss(0x8ce06a));
      v.set(-1, 16, 2, gloss(K)).set(1, 16, 2, gloss(K)).set(-1, 17, 2, gloss(K)).set(1, 17, 2, gloss(K));
      v.set(0, 19, 0, gloss(0x8ce06a)).set(0, 20, 0, glow(0xff5a7a));
    },
  },

  crystals: {
    name: 'Glow Crystal Cluster', jp: '水晶クラスター', price: 1600, themes: ['weird', 'space', 'nature'],
    build(v) {
      const S = 0x6f6a78;
      v.ellipsoid(0, 1, 0, 8, 3, 6, S);
      v.ellipsoid(4, 1, 3, 4, 2, 3, S);
      v.box(-12, -4, -12, 12, -1, 12, null);
      speckle(v, S, (x, y, z) => { const h = hash(x, y, z, 2); return h < 0.25 ? shade(S, 0.8) : h < 0.35 ? shade(S, 1.2) : null; });
      crystal(v, 0, 2, 0, 0, 1, 0, 18, 2.2, glass(0xc79bff), glow(0xa66bff));
      crystal(v, -4, 2, 1, -0.5, 1, 0.25, 11, 1.6, glass(0xff86cf), glow(0xff5ab8));
      crystal(v, 4, 2, 0, 0.6, 1, -0.1, 12, 1.7, glass(0x7eeaff), glow(0x3fd8ff));
      crystal(v, 1, 2, 4, 0.2, 0.8, 0.7, 7, 1.2, glass(0xc79bff), glow(0xa66bff));
      crystal(v, -2, 2, -3, -0.2, 1, -0.5, 9, 1.3, glass(0x7eeaff), glow(0x3fd8ff));
      crystal(v, 6, 2, 4, 0.5, 0.7, 0.5, 5, 1, glass(0xff86cf));
      for (const [x, z] of [[-6, 3], [5, -3], [-3, 5], [7, 1]]) v.set(x, 3, z, glow(0xffe8ff));
      v.box(-12, -4, -12, 12, -1, 12, null);
    },
  },

  // ================================================================ SPOOKY
  pumpkin: {
    name: 'Witchy Jack-o\'-Lantern', jp: 'ジャック・オ・ランタン', price: 450, themes: ['spooky', 'food', 'cute'],
    build(v) {
      const O = 0xf5781a, Od = 0xc85410;
      v.shape(-8, 0, -8, 8, 11, 8, (x, y, z) => {
        const f = 0.5 + 0.5 * Math.cos(8 * Math.atan2(z, x));
        const rx = 7.4 * (0.9 + 0.1 * f);
        return (x * x + z * z) / (rx * rx) + ((y - 5.5) / 5.7) ** 2 <= 1;
      }, (x, y, z) => (0.5 + 0.5 * Math.cos(8 * Math.atan2(z, x)) < 0.18 ? Od : O));
      tone(v, O, null, Od);
      carve(v, ['GG.....GG', 'GG.....GG', '.........', 'G.......G', '.GGGGGGG.', '..GG.GG..'], -4, 8, glow(0xffe14d));
      // witch hat
      const H = 0x5a3a8a;
      v.cylinder(0, 11, 0, 4.6, 1, H);
      v.cone(0, 12, 0, 2.8, 6, H);
      v.paint(() => v.cylinder(0, 12, 0, 3, 1, C.yellow));
      v.set(0, 12, 3, metal(C.gold));
      v.line(0, 17, 0, 2, 19, -1, H);
      v.set(3, 19, -1, H);
      // leaf
      v.layer(['GG.', 'GGG', '.G.'], { G: C.leaf }, { x: -7, y: 11, z: 2, plane: 'xz' });
    },
  },

  obake: {
    name: 'Lantern Ghost', jp: '提灯おばけ', price: 800, themes: ['spooky', 'retro', 'weird'],
    build(v) {
      const B = C.lacquerBlack;
      v.ellipsoid(0, 9, 0, 6, 7.5, 6, glow(0xffe6b0));
      v.paint(() => { for (const y of [3, 6, 12, 15]) v.cylinder(0, y, 0, 7, 1, 0xc49a62); });
      v.cylinder(0, 0, 0, 3.5, 2, B);
      v.cylinder(0, 16, 0, 3.5, 2, B);
      v.ring(0, 20, 0, B, 'z');
      v.project(['.WWW.', 'WWWWW', 'WWKKW', 'WWKKW', '.WWW.'], { W: gloss(W), K: gloss(K) }, -2, 14);
      v.project(['MMMMMMM', 'MRRRRRM', '.MRRRM.'], { M: 0x3a1414, R: glow(0xff4a5a) }, -3, 8);
      v.box(-1, 2, 7, 1, 6, 7, gloss(C.tongue));
      v.set(-1, 2, 7, null).set(1, 2, 7, null).set(0, 4, 7, gloss(0xe0505e)).set(0, 5, 7, gloss(0xe0505e));
      // torn flap
      v.set(5, 13, 3, null).set(6, 13, 2, glow(0xffe6b0)).set(7, 12, 2, glow(0xffe6b0));
      // hitodama wisps
      for (const sx of [-8, 8]) {
        v.sphere(sx, 1.2, 2, 1.2, glow(0x7ff7ff));
        v.set(sx, 3, 2, glow(0xbffcff)).set(sx + (sx < 0 ? 1 : -1), 4, 2, glow(0xbffcff)).set(sx + (sx < 0 ? 1 : -1), 5, 1, glow(0xdffeff));
      }
    },
  },

  grave: {
    name: 'Spooky Tombstone', jp: 'お墓', price: 500, themes: ['spooky'],
    build(v) {
      pad(v, 9, 7, 2, 0x5f8a3e, 0x5a4232, { seed: 6 });
      v.shape(-5, 2, 0, 5, 4, 7, (x, y, z) => ((x / 4.4) ** 2 + ((z - 3) / 3.2) ** 2 + ((y - 1.5) / 1.6) ** 2 <= 1), 0x6b4a32);
      const S = 0xa8a4b0;
      v.box(-5, 2, -4, 5, 3, 0, shade(S, 0.8));
      v.shape(-4, 4, -3, 4, 15, -1, (x, y) => y <= 10 || x * x + (y - 10) ** 2 <= 4.4 ** 2, S);
      v.project(['XX..X.XX.', 'X.X.X.X.X', 'XX..X.XX.', 'X.X.X.X..', 'X.X.X.X..'], { X: shade(S, 0.6) }, -4, 11);
      speckle(v, S, (x, y, z) => (hash(x, y, z, 4) < 0.12 ? shade(S, 0.88) : (!v.has(x, y + 1, z) && hash(x, y, z, 5) < 0.4 ? C.moss : null)));
      v.set(3, 6, -1, shade(S, 0.6)).set(4, 5, -1, shade(S, 0.6));
      // candle
      v.box(6, 2, 2, 6, 4, 2, C.cream); v.set(6, 5, 2, glow(0xffa53a)); v.set(6, 6, 2, glow(0xffe08a));
      // flowers
      v.set(-3, 4, 3, C.leaf).set(-3, 5, 3, gloss(C.red)).set(-2, 4, 4, C.leaf).set(-2, 5, 4, gloss(C.hotpink));
      // peeking ghost
      const Gh = 0xf4f6ff;
      v.sphere(4, 13, -3, 2.2, Gh);
      v.set(4, 15, -4, Gh).set(5, 15, -4, Gh).set(6, 14, -4, Gh);
      v.set(3, 13, -1, K).set(5, 13, -1, K).set(6, 12, -1, C.blush);
      v.set(2, 12, -1, Gh).set(2, 12, 0, Gh);
      // bat-ish dead branch
      v.line(-6, 2, -5, -7, 8, -5, 0x3a2a22); v.line(-7, 6, -5, -9, 8, -5, 0x3a2a22); v.set(-6, 9, -5, 0x3a2a22);
    },
  },

  // ================================================================ OCEAN
  parasol: {
    name: 'Beach Parasol', jp: 'ビーチパラソル', price: 700, themes: ['ocean'],
    build(v) {
      pad(v, 10, 8, 2, C.sand, shade(C.sand, 0.85), { seed: 5 });
      speckle(v, C.sand, (x, y, z) => (hash(x, y, z, 7) < 0.15 ? shade(C.sand, 1.08) : null));
      for (let y = 2; y <= 21; y++) v.set(0, y, 0, y % 4 < 2 ? C.white : C.red);
      v.shape(-10, 15, -10, 10, 23, 10, (x, y, z) => {
        const r = Math.hypot(x, z), top = 22.5 - r * 0.5;
        return r <= 10.3 && y <= top && y >= top - 1.2;
      }, (x, y, z) => gloss(sector(x, z, 8) % 2 ? C.teal : W));
      for (let k = 0; k < 8; k++) {
        const a = ((k + 0.5) / 8) * TAU - Math.PI;
        v.set(Math.round(Math.cos(a) * 9.6), 16, Math.round(Math.sin(a) * 9.6), gloss(k % 2 ? C.teal : W));
      }
      v.set(0, 23, 0, gloss(C.red));
      // towel
      v.box(-8, 2, 0, -3, 2, 6, (x, y, z) => (pmod(z, 3) === 0 ? C.hotpink : C.white));
      // bucket & spade
      v.cylinder(6, 2, 4, 1.4, 3, gloss(C.plasticYellow)); v.set(6, 4, 4, shade(C.sand, 0.9));
      v.line(8, 2, 3, 8, 6, 2, gloss(C.plasticBlue)); v.box(8, 2, 4, 8, 3, 5, gloss(C.plasticBlue));
      // beach ball
      v.sphere(4, 4, -5, 2, (x, y, z) => gloss([C.red, W, C.yellow, W, C.blue, W][sector(x - 4, z + 5, 6)]));
      // sunglasses on the towel
      v.set(-7, 3, 3, K).set(-6, 3, 3, K).set(-4, 3, 3, K).set(-5, 3, 3, K);
    },
  },

  starfish: {
    name: 'Starfish & Seashell', jp: 'ヒトデと貝がら', price: 300, themes: ['ocean', 'cute'],
    build(v) {
      pad(v, 9, 7, 2, C.sand, shade(C.sand, 0.85), { seed: 8 });
      // scallop shell behind
      v.shape(0, 2, -5, 10, 9, -3, (x, y) => y >= 2 && (x - 5) ** 2 + (y - 2) ** 2 <= 5.4 ** 2, (x, y) =>
        gloss(pmod(Math.round((Math.atan2(y - 2, x - 5) / Math.PI) * 9), 2) ? 0xffc2a8 : 0xf0957c));
      v.paint(() => v.box(0, 2, -3, 10, 9, -3, gloss(0xffd6c4)));
      v.box(4, 2, -3, 6, 3, -2, gloss(0xf0957c));
      // starfish character standing up
      const S = 0xff8a5c;
      const cx = -2, cy = 8;
      v.shape(cx - 8, 2, -1, cx + 8, 16, 1, (x, y, z) => {
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
        const f = (Math.cos(5 * (Math.atan2(dy, dx) - Math.PI / 2)) + 1) / 2;
        if (r > 2.3 + 4.9 * f ** 2.2) return false;
        return z === 0 || r < 4;
      }, S);
      speckle(v, S, (x, y, z) => (hash(x, y, z, 3) < 0.14 ? 0xffc29a : null));
      face(v, cx, cy + 1, { s: 1, mouth: 'smile', big: false });
      // pebbles + little conch
      v.ellipsoid(6, 2, 3, 1.5, 0.8, 1, C.lightgray);
      v.set(-7, 2, 4, C.white).set(4, 2, 5, shade(C.stone, 1.2));
      v.cone(2, 3, 5, 1.3, 4, gloss(0xffe8d6), 'x');
    },
  },

  buoy: {
    name: 'Bobbing Buoy & Gull', jp: 'ブイとカモメ', price: 600, themes: ['ocean'],
    build(v) {
      pad(v, 9, 9, 2, gloss(0x5ab4ec), gloss(0x2f86c6), { seed: 2 });
      v.cylinder(0, 2, 0, 5.6, 1, W);
      speckle(v, W, (x, y, z) => null);
      const R = gloss(0xe5383b);
      v.ellipsoid(0, 4, 0, 5, 2.4, 5, R);
      v.box(-6, 1, -6, 6, 1, 6, null);
      v.cylinder(0, 2, 0, 5.6, 1, W);
      v.paint(() => v.cylinder(0, 4, 0, 6, 1, gloss(W)));
      v.shape(-3, 6, -3, 3, 16, 3, (x, y, z) => x * x + z * z <= (2.8 - (y - 6) * 0.12) ** 2, (x, y) => (Math.floor((y - 6) / 3) % 2 ? gloss(W) : R));
      v.box(-1, 17, -1, 1, 19, 1, glow(0xfff36b));
      for (const x of [-1, 1]) for (const z of [-1, 1]) v.box(x, 17, z, x, 19, z, metal(C.charcoal));
      v.cylinder(0, 20, 0, 1.6, 1, metal(C.charcoal));
      v.set(0, 21, 0, metal(C.charcoal)).set(0, 22, 0, metal(C.steel));
      // seagull
      v.box(3, 7, 0, 4, 8, 2, W);
      v.set(3, 8, -1, C.gray).set(4, 8, -1, C.gray);
      v.paint(() => v.box(3, 8, 0, 4, 8, 1, C.lightgray));
      v.box(3, 9, 2, 4, 10, 3, W);
      v.set(3, 9, 4, C.orange).set(4, 9, 4, C.orange);
      v.set(3, 10, 3, K).set(4, 10, 3, K);
      v.set(3, 6, 1, C.orange).set(4, 6, 1, C.orange);
    },
  },

  // ================================================================ HOME / RETRO / FANCY
  fountain: {
    name: 'Plaza Fountain', jp: '噴水', price: 1800, themes: ['city', 'nature'],
    build(v) {
      const S = 0xc9c0ae, SL = 0xe6dfcf;
      v.cylinder(0, 0, 0, 9, 1, S);
      v.tube(0, 0, 0, 9, 7.6, 4, S);
      v.paint(() => v.tube(0, 3, 0, 9, 7.6, 1, SL));
      const Wt = glass(0x4fb8ff);
      v.cylinder(0, 1, 0, 7.6, 2, Wt);
      for (const [x, z] of [[3, 4], [-4, -2], [5, -3], [-2, 5]]) v.set(x, 1, z, metal(C.gold));
      v.cylinder(0, 1, 0, 1.4, 9, S);
      v.cylinder(0, 9, 0, 3, 1, S);
      v.cylinder(0, 10, 0, 4.6, 2, S);
      v.paint(() => v.cylinder(0, 11, 0, 4.6, 1, SL));
      v.cylinder(0, 11, 0, 3.6, 1, Wt);
      v.cylinder(0, 11, 0, 0.8, 3, S);
      v.sphere(0, 15, 0, 1.3, glass(0xbfeeff));
      v.set(0, 17, 0, glass(0xbfeeff));
      const St = glass(0x7fd0ff);
      for (let k = 0; k < 4; k++) {
        const dx = [1, 0, -1, 0][k], dz = [0, 1, 0, -1][k];
        let p = null;
        for (let i = 0; i <= 8; i++) {
          const t = i / 8, r = 5 + 2.4 * t, y = Math.round(11 - 8 * t * t);
          const q = [Math.round(dx * r), y, Math.round(dz * r)];
          if (p) v.line(p[0], p[1], p[2], q[0], q[1], q[2], St);
          p = q;
        }
      }
      // frog on the rim
      const Fg = gloss(0x6cc94a);
      v.box(5, 4, 5, 7, 5, 6, Fg);
      v.set(5, 6, 6, Fg).set(7, 6, 6, Fg).set(5, 6, 7, K).set(7, 6, 7, K);
      v.set(6, 4, 7, C.blush);
      v.paint(() => v.box(5, 4, 6, 7, 4, 6, gloss(0xe8f5a0)));
    },
  },

  kotatsu: {
    name: 'Cosy Kotatsu', jp: 'こたつ', price: 1200, themes: ['home', 'cute', 'retro'],
    build(v) {
      const Q = 0xd9503a;
      const qc = (x, y, z) => (pmod(x + 2 * y + z, 6) === 0 ? 0xfff0d6 : y <= 1 ? 0xb83a2a : Q);
      v.box(-10, 1, -9, 10, 7, 9, qc);
      v.box(-11, 0, -10, 11, 0, 10, qc);
      for (let x = -11; x <= 11; x++) for (const z of [-10, 10]) if (hash(x, 0, z) < 0.35) v.set(x, 0, z, null);
      for (let z = -10; z <= 10; z++) for (const x of [-11, 11]) if (hash(x, 0, z) < 0.35) v.set(x, 0, z, null);
      v.box(-9, 8, -8, 9, 9, 8, C.woodLight);
      v.paint(() => { v.box(-9, 8, -8, 9, 8, 8, C.wood); v.box(-8, 9, -7, 8, 9, 7, 0xe4b47a); });
      // mikan basket
      v.cylinder(-3, 10, -1, 3, 2, (x, y) => (pmod(x + y, 2) ? 0xc9905a : 0xa87444));
      for (const [x, y, z] of [[-4, 12, -2], [-2, 12, 0], [-3, 13, -1], [-1, 12, -2], [-4, 12, 0]]) v.sphere(x, y, z, 1, gloss(0xff9a1f));
      v.set(-3, 14, -1, C.leaf).set(-2, 13, 1, C.leaf);
      // tea cup
      v.cylinder(5, 10, 3, 1.3, 2, gloss(C.matcha)); v.set(5, 11, 3, 0x8fa84a);
      v.set(4, 10, 6, C.ceramic).set(5, 10, 6, C.ceramic);
      // cat poking out
      const Ct = 0xb9b4ae;
      v.sphere(3, 2.5, 10.5, 2.2, Ct);
      v.set(2, 5, 10, Ct).set(4, 5, 10, Ct).set(2, 5, 11, C.pink).set(4, 5, 11, C.pink);
      v.paint(() => v.box(1, 1, 12, 5, 2, 13, W));
      v.set(2, 3, 13, K).set(4, 3, 13, K).set(3, 2, 13, C.pink);
      v.set(1, 0, 13, W).set(5, 0, 13, W);
    },
  },

  tv: {
    name: 'Happy Retro TV', jp: 'ブラウン管テレビ', price: 900, themes: ['retro', 'home', 'cute'],
    build(v) {
      const Bd = gloss(0xe86a3a);
      v.box(-7, 4, -5, 7, 15, 4, Bd);
      for (const x of [-7, 7]) for (const y of [4, 15]) v.box(x, y, -5, x, y, 4, null);
      v.box(-6, 5, 5, 2, 14, 5, C.charcoal);
      v.box(-5, 6, 6, 1, 13, 6, (x, y) => glow(y % 2 ? 0x8fe8d0 : 0x7ad8c0));
      for (const x of [-5, 1]) for (const y of [6, 13]) v.set(x, y, 6, null);
      v.project(['.K...K.', '.K...K.', 'P.....P', '..K.K..', '...K...'], { K, P: glow(0xff9fbe) }, -5, 11);
      v.cylinder(5, 12, 5, 1, 1, metal(C.silver), 'z');
      v.cylinder(5, 9, 5, 1, 1, metal(C.silver), 'z');
      for (const y of [5, 7]) for (const x of [4, 6]) v.set(x, y, 5, C.charcoal);
      for (const [x, z] of [[-6, 3], [6, 3], [-6, -4], [6, -4]]) v.line(x, 3, z, x + Math.sign(x), 0, z + Math.sign(z), metal(0x3a3a3a));
      v.sphere(0, 16, -1, 1.2, metal(0x3a3a3a));
      v.line(0, 17, -1, -5, 24, -2, metal(C.silver));
      v.line(0, 17, -1, 4, 23, -3, metal(C.silver));
      v.sphere(-5, 24, -2, 0.8, metal(C.silver)); v.sphere(4, 23, -3, 0.8, metal(C.silver));
    },
  },

  gacha: {
    name: 'Mini Gacha Machine', jp: 'ミニガチャ', price: 1500, themes: ['retro', 'cute', 'weird'],
    build(v) {
      const R = gloss(0xe23a3a);
      v.box(-5, 0, -5, 5, 12, 5, R);
      for (const x of [-5, 5]) for (const z of [-5, 5]) v.box(x, 0, z, x, 12, z, null);
      v.box(-3, 6, 6, 3, 11, 6, metal(C.silver));
      v.cylinder(0, 8, 7, 2.2, 1, gloss(0xffd23f), 'z');
      v.box(-1, 8, 8, 1, 8, 8, gloss(0xfff6d8));
      v.set(2, 11, 7, K).set(-2, 11, 7, glow(0xff5a7a));
      v.box(-2, 1, 5, 2, 4, 5, null); v.box(-2, 1, 4, 2, 4, 4, C.charcoal);
      v.box(-2, 4, 6, 2, 4, 6, glass(0xeeeeee));
      capsule(v, 0, 2, 4, 0x5cc4ff);
      v.paint(() => v.box(-4, 1, 5, -4, 3, 5, gloss(C.yellow)));
      // dome
      v.hollowBox(-5, 13, -5, 5, 21, 5, glass(0xeaf6ff));
      for (const x of [-5, 5]) for (const z of [-5, 5]) v.box(x, 13, z, x, 21, z, null);
      v.box(-5, 13, -5, 5, 13, 5, R);
      const cols = [0xff6f9a, 0x5cc4ff, 0xffd23f, 0x9bd94a, 0xc79bff, 0xff8c2e];
      let i = 0;
      for (const [x, y, z] of [[-3, 15, -3], [0, 15, -3], [3, 15, -3], [-3, 15, 0], [0, 15, 0], [3, 15, 0], [-3, 15, 3], [0, 15, 3], [3, 15, 3], [-2, 18, -2], [1, 18, -1], [-1, 18, 2], [2, 18, 2]]) capsule(v, x, y, z, cols[i++ % cols.length]);
      v.box(-5, 22, -5, 5, 23, 5, R);
      v.box(-5, 22, -5, -5, 22, -5, null); v.box(5, 22, -5, 5, 22, -5, null); v.box(-5, 22, 5, -5, 22, 5, null); v.box(5, 22, 5, 5, 22, 5, null);
      v.paint(() => v.box(-5, 23, -5, 5, 23, 5, gloss(0xff5a5a)));
      v.set(0, 24, 0, glow(C.yellow));
    },
  },

  chest: {
    name: 'Treasure Chest', jp: '宝箱', price: 2500, themes: ['ocean', 'weird'],
    build(v) {
      const Wd = 0x9a5a2e, WdD = 0x6e3e1e, G = gloss(0xf5c242), GL = gloss(0xfff0a0);
      v.box(-7, 0, -5, 7, 8, 5, Wd);
      v.paint(() => {
        v.box(-7, 3, -5, 7, 3, 5, WdD); v.box(-7, 6, -5, 7, 6, 5, WdD);
        v.box(-5, 0, -5, -4, 8, 5, G); v.box(4, 0, -5, 5, 8, 5, G);
        v.box(-7, 0, -5, 7, 0, 5, G);
      });
      v.box(-6, 5, -4, 6, 8, 4, null);
      v.shape(-6, 5, -4, 6, 11, 4, (x, y, z) => y <= 8 || (x / 6.5) ** 2 + ((y - 8) / 3) ** 2 + (z / 4.5) ** 2 <= 1, G);
      speckle(v, 0xf5c242, (x, y, z) => (y > 8 && hash(x, y, z, 2) < 0.22 && exposed(v, x, y, z) ? GL : y > 8 && hash(x, y, z, 3) < 0.15 ? gloss(0xd99a2a) : null));
      // lid (open, leaning back)
      v.box(-7, 9, -7, 7, 17, -6, Wd);
      v.box(-7, 10, -8, 7, 16, -8, Wd);
      v.paint(() => { v.box(-5, 9, -8, -4, 17, -6, G); v.box(4, 9, -8, 5, 17, -6, G); v.box(-6, 9, -6, 6, 16, -6, WdD); v.box(-5, 9, -6, -4, 17, -6, G); v.box(4, 9, -6, 5, 17, -6, G); });
      // gems + crown
      const gem = (x, y, z, c) => { v.set(x, y, z, c).set(x - 1, y, z, c).set(x + 1, y, z, c).set(x, y, z - 1, c).set(x, y, z + 1, c).set(x, y + 1, z, c); };
      gem(-3, 11, 1, glass(0xff3b6b)); gem(4, 10, 2, glass(0x4bd2ff)); gem(-1, 10, 3, glass(0x6bff8a));
      v.tube(2, 11, -1, 2, 1, 2, G);
      for (const [x, z] of [[0, -1], [4, -1], [2, -3], [2, 1]]) v.set(x, 13, z, G);
      v.set(2, 12, 1, glass(0xff3b6b));
      // pearl necklace draped over the front
      for (const [x, y, z] of [[-6, 9, 4], [-6, 8, 5], [-6, 7, 6], [-5, 6, 6], [-4, 5, 6], [-3, 5, 6], [-2, 6, 6], [-1, 7, 6], [0, 8, 5], [0, 9, 4]]) v.set(x, y, z, gloss(0xfff8f0));
      // lock
      v.box(-1, 5, 6, 1, 8, 6, G); v.set(0, 6, 6, K);
      // spilled coins
      for (const [x, z] of [[5, 7], [-6, 8], [7, 6], [2, 8], [-2, 9]]) v.cylinder(x, 0, z, 1, 1, G);
      v.set(8, 1, 7, G);
    },
  },

  campfire: {
    name: 'Campfire & Marshmallow', jp: 'たき火', price: 650, themes: ['nature', 'food'],
    build(v) {
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU;
        v.ellipsoid(Math.round(6 * Math.cos(a)), 1, Math.round(6 * Math.sin(a)), 1.6, 1.2, 1.4, [C.stone, shade(C.stone, 0.85), shade(C.stone, 1.12)][k % 3]);
      }
      v.box(-12, -3, -12, 12, -1, 12, null);
      v.cylinder(0, 0, 0, 4.5, 1, 0x4a4440);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + 0.3;
        v.line(Math.round(4.6 * Math.cos(a)), 1, Math.round(4.6 * Math.sin(a)), Math.round(0.6 * Math.cos(a)), 8, Math.round(0.6 * Math.sin(a)), BARK, 0.9);
        v.set(Math.round(4.9 * Math.cos(a)), 1, Math.round(4.9 * Math.sin(a)), 0xd9a066);
      }
      v.shape(-4, 2, -4, 4, 14, 4, (x, y, z) => {
        const r = 3.4 * (1 - ((y - 2) / 12) ** 1.2) + (hash(x, y, z, 5) - 0.5) * 0.8;
        return x * x + z * z <= r * r;
      }, (x, y) => glow(y >= 10 ? 0xff4a1f : 0xff8a24));
      v.paint(() => v.ellipsoid(0, 4.5, 1.5, 2.2, 3, 2.2, glow(0xffd84a)));
      v.set(1, 14, 0, glow(0xff6a2a)).set(-2, 12, 1, glow(0xff6a2a)).set(2, 11, -1, glow(0xff8a24));
      // marshmallow stick
      v.line(10, 2, 8, 5, 6, 4, C.woodLight);
      v.box(3, 6, 3, 4, 7, 4, C.white); v.set(3, 6, 3, 0xe8b070); v.set(3, 7, 3, 0xf4d2a0);
    },
  },
};
