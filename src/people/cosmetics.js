// Wearable cosmetics for the low-poly humans: chunky voxel hats, hoods, glasses and costume parts that ride on
// the skeleton (head / chest / spine / hips / hand bones), plus the spec tweaks an outfit needs (onesie colours,
// a hood trims the hair). Head pieces are modelled once in 'head units' (1 voxel = 1/20 of the head height, head
// bone at the origin, +z = the face, +x = the wearer's left) and scaled per human; body pieces are sized from the
// human's proportions. Cheap secondary motion: dino tail, chicken comb / head / wings, pompoms, bear ears.
//   applyCosmeticSpec(spec, look)      before building the Human (outfit colours, hair under hoods)
//   dressHuman(h, look)                attach the pieces; wraps h.update (animation) and h.dispose
//   cosmeticPreview(id)                an Object3D for thumbnails (mannequin head + the hat / glasses)
// look = { hat, outfit, face } (cosmetic ids or null).
import * as THREE from 'three';
import { VoxelModel, gloss } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { hex } from './paintlib.js';

export const SLOTS = [
  { id: 'hat', name: 'Hats', icon: 'cos_hat' },
  { id: 'outfit', name: 'Outfits', icon: 'cos_shirt' },
  { id: 'face', name: 'Face', icon: 'cos_glasses' },
];

// colours shared between the painted suit and its voxel parts
const DINO = 0x5fb64a, DINO_D = 0x3f8c36, DINO_BELLY = 0xf0dc9c, SPIKE = 0xf4ae32, SPIKE_D = 0xd8862a;
const BANANA = 0xf6d43c, BANANA_D = 0xd8ac22, BANANA_SPOT = 0x7a5a26;
const MOUTH = 0xd0485a, TOOTH = 0xfffcf2, INK = 0x1c1418;

/**
 * The catalogue. slot: hat | outfit | face. cover: a hat that covers the whole head (hair is trimmed, an outfit's
 * hood is hidden). hood: an outfit with a hood. price in yen.
 */
export const COSMETICS = [
  // ---- outfits
  { id: 'dino', slot: 'outfit', name: 'Dino Onesie', price: 2500, hood: true, desc: 'Rawr. Comes with a toothy hood, back spikes and a very waggy tail.' },
  { id: 'banana', slot: 'outfit', name: 'Banana Suit', price: 1800, hood: true, desc: 'A-peel-ing in every way. Ripe, spotty, unforgettable.' },
  { id: 'happi', slot: 'outfit', name: 'Festival Happi', price: 1200, desc: 'Indigo summer festival coat with a red collar and a hachimaki band.' },
  { id: 'box', slot: 'outfit', name: 'Box Robot', price: 500, desc: 'Grandpa\'s old delivery box, upcycled. Beep boop.' },
  // ---- hats
  { id: 'chicken', slot: 'hat', name: 'Chicken Hat', price: 800, desc: 'A whole hen, nesting on your head. She has opinions.' },
  { id: 'shark', slot: 'hat', name: 'Shark Hood', price: 1200, cover: true, desc: 'Gets eaten by a shark, looks great doing it.' },
  { id: 'frog', slot: 'hat', name: 'Kero Frog Cap', price: 600, cover: true, desc: 'Big googly eyes. Ribbit.' },
  { id: 'bear', slot: 'hat', name: 'Bear Hood', price: 900, cover: true, desc: 'Fluffy round ears for cold evenings.' },
  { id: 'cone', slot: 'hat', name: 'Traffic Cone', price: 300, cover: true, desc: 'Found it by the road. Totally official.' },
  { id: 'party', slot: 'hat', name: 'Party Hat', price: 200, desc: 'Every day is somebody\'s birthday.' },
  { id: 'bow', slot: 'hat', name: 'Giant Bow', price: 450, desc: 'Polka dots. Maximum cute.' },
  { id: 'nigiri', slot: 'hat', name: 'Salmon Nigiri', price: 700, desc: 'Fresh from the conveyor belt.' },
  // ---- face
  { id: 'shades', slot: 'face', name: 'Cool Shades', price: 350, desc: 'Instantly 40% cooler.' },
  { id: 'stars', slot: 'face', name: 'Star Glasses', price: 500, desc: 'For superstars and party animals.' },
  { id: 'groucho', slot: 'face', name: 'Disguise Kit', price: 400, desc: 'Nose, glasses, moustache. Nobody will know.' },
  { id: 'kitsune', slot: 'face', name: 'Fox Mask', price: 900, desc: 'A festival kitsune mask, worn on the side of the head.' },
];
export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

// ------------------------------------------------------------------ voxel helpers
const MATS = () => voxelMaterials('normal');
const _geos = new Map();
/** Geometry of a voxel model: voxel (x, y, z) centred on (x, y, z) minus the pivot, in model units. */
function voxGeo(model, pivot = [0, 0, 0]) {
  const g = meshVoxels(model, { voxelSize: 1, origin: 'none' });
  g.translate(-0.5 - pivot[0], -0.5 - pivot[1], -0.5 - pivot[2]);
  g.computeBoundingSphere();
  return g;
}
function cached(key, build, pivot) {
  let g = _geos.get(key);
  if (!g) { g = voxGeo(build(), pivot); _geos.set(key, g); }
  return g;
}
const vm = (jitter = 0.03) => { const v = new VoxelModel(); v.jitter = jitter; return v; };
const hash = (x, y, z, s = 0) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1013904223) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Signed distance to a rounded box (centre c, half extents a, corner radius r). */
function rbox(x, y, z, c, a, r) {
  const qx = Math.abs(x - c[0]) - a[0] + r, qy = Math.abs(y - c[1]) - a[1] + r, qz = Math.abs(z - c[2]) - a[2] + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function each(x0, x1, y0, y1, z0, z1, fn) {
  if (x0 > x1) [x0, x1] = [x1, x0];
  if (y0 > y1) [y0, y1] = [y1, y0];
  if (z0 > z1) [z0, z1] = [z1, z0];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) fn(x, y, z);
}
/** Recolour the front-most voxel at (x, y) (seen from +z). */
function front(v, x, y, c, zmin = -40, zmax = 40) { for (let z = zmax; z >= zmin; z--) if (v.has(x, y, z)) { v.set(x, y, z, c); return z; } return null; }
function side(v, sx, y, z, c) { for (let x = sx * 20; x !== 0; x -= sx) if (v.has(x, y, z)) { v.set(x, y, z, c); return x; } return null; }

// ------------------------------------------------------------------ head-unit landmarks (adult; scaled per human)
// chin -4, nose 1.8, eyes 6, brows 8, hair line 13.2, crown 16; cranium centre z 2.4, face plane z 10.8
const HOOD_IN = [[0, 6.1, 2.1], [7.7, 11.1, 9.0], 4.2];

/** A kigurumi hood: a shell around the head with a face hole. o: { col, rim, hole: [hx, hy, cy], thick, edge(x,y,z) } */
function hood(v, o) {
  const [c, a, r] = HOOD_IN, th = o.thick ?? 1.75;
  const [hx, hy, hc] = o.hole || [5.9, 7.6, 3.2];
  each(-12, 12, -8, 21, -11, 14, (x, y, z) => {
    const d = rbox(x, y, z, c, a, r);
    if (d < 0 || d > th) return;
    const e = (x / hx) ** 2 + ((y - hc) / hy) ** 2;
    if (z > 3 && e < 1) return;
    if (y < (z > 2 ? -4 : z > -3 ? -5 : -6)) return;
    let col = o.col;
    if (o.rim && z > 3 && e < 1.5 && d < th * 0.6) col = o.rim; // inner lining shows around the face
    if (o.paint) col = o.paint(x, y, z, col, d, e) ?? col;
    v.set(x, y, z, col);
  });
  return v;
}

function mannequin() {
  // a plain wooden display head in the same frame (thumbnails)
  const v = vm(0.02);
  each(-8, 8, -5, 17, -8, 12, (x, y, z) => {
    const d = rbox(x, y, z, [0, 6, 2.4], [6.6, 10, 8.3], 3.6);
    if (d <= 0) v.set(x, y, z, y > 12.5 && z < 9 ? 0xa88a66 : 0xb89a74);
  });
  each(-4, 4, -12, -5, -3, 4, (x, y, z) => { if (Math.hypot(x, (z - 0.5) * 1.1) < 4.2) v.set(x, y, z, 0x9c805e); });
  front(v, -3, 6, 0x5a4634); front(v, 3, 6, 0x5a4634); front(v, 0, 1, 0x8a6e50); // painted eyes + mouth
  return v;
}

// ------------------------------------------------------------------ the models (head units unless noted)
const H = {
  dinoHood() {
    const v = hood(vm(), {
      col: DINO, rim: MOUTH,
      paint: (x, y, z, col) => (col === DINO && hash(x >> 1, y >> 1, z >> 1, 3) > 0.84 ? DINO_D : col),
    });
    // upper jaw / snout over the forehead
    each(-7, 7, 9, 14, 9, 16, (x, y, z) => {
      const d = rbox(x, y, z, [0, 11.6, 12.2], [6.6, 2.6, 3.8], 2.2);
      if (d > 0) return;
      v.set(x, y, z, y <= 9 ? MOUTH : hash(x >> 1, y, z >> 1, 5) > 0.86 ? DINO_D : DINO);
    });
    // teeth along the snout's front and sides
    for (let x = -6; x <= 6; x += 2) v.set(x, 8, 15, TOOTH).set(x, 7, 15, x % 4 === 0 ? TOOTH : null);
    for (const sx of [-1, 1]) for (let z = 10; z <= 14; z += 2) v.set(sx * 6, 8, z, TOOTH);
    // nostrils + eyes with a heavy brow
    front(v, -2, 13, INK, 8, 18); front(v, 2, 13, INK, 8, 18);
    for (const sx of [-1, 1]) {
      each(sx * 5 - 1, sx * 5 + 1, 14, 16, 9, 11, (x, y, z) => v.set(x, y, z, 0xfffbea));
      v.set(sx * 5, 15, 11, gloss(INK)).set(sx * 5, 14, 11, gloss(INK)).set(sx * 4, 15, 11, gloss(INK));
      each(sx * 6 - 1, sx * 6 + 1, 17, 17, 8, 11, (x, y, z) => v.set(x, y, z, DINO_D));
    }
    // lower jaw under the chin
    each(-6, 6, -7, -4, 5, 13, (x, y, z) => {
      const d = rbox(x, y, z, [0, -5.5, 9.2], [5.8, 1.6, 3.8], 1.6);
      if (d > 0) return;
      v.set(x, y, z, y >= -4 ? MOUTH : y <= -7 ? DINO_BELLY : DINO);
    });
    for (let x = -5; x <= 5; x += 2) v.set(x, -3, 12, TOOTH);
    for (const sx of [-1, 1]) for (let z = 7; z <= 11; z += 2) v.set(sx * 5, -3, z, TOOTH);
    // spikes down the middle of the head
    [[16, 18.6, 3], [11, 19.6, 4], [5, 19.8, 4], [-1, 19.2, 4], [-6, 17.6, 3]].forEach(([z, y, s]) => {
      for (let d = 0; d < s; d++) for (let dz = -(s - d) + 1; dz <= s - d - 1; dz++) if (z + dz < 15) v.set(0, Math.round(y + d), z + dz, d === 0 ? SPIKE_D : SPIKE);
    });
    return v;
  },
  bananaHood() {
    const v = hood(vm(), {
      col: BANANA, rim: 0xf8eec6,
      paint: (x, y, z, col) => (col === BANANA ? (hash(x, y, z, 9) > 0.95 ? BANANA_SPOT : y > 14 && hash(x >> 1, y >> 1, z, 2) > 0.7 ? BANANA_D : col) : col),
    });
    // the curved tip and the stem
    for (let y = 16; y <= 31; y++) {
      const t = (y - 16) / 15, r = 6.6 * (1 - t) ** 0.85 + 1.4, cz = 2 + Math.pow(y - 16, 1.6) * 0.16;
      each(-8, 8, y, y, -8, 18, (x, yy, z) => {
        if (x * x + (z - cz) ** 2 > r * r) return;
        v.set(x, y, z, y >= 28 ? (y >= 30 ? 0x3a2a18 : 0x6a4a24) : hash(x, y, z, 4) > 0.94 ? BANANA_SPOT : x * x + (z - cz) ** 2 > (r - 1) ** 2 && hash(x, y, z, 7) > 0.6 ? BANANA_D : BANANA);
      });
    }
    return v;
  },
  happiBand() {
    const v = vm(0.02);
    each(-9, 9, 9, 11, -9, 13, (x, y, z) => {
      const d = rbox(x, y, z, [0, 6, 2.3], [6.9, 10, 8.6], 3.6);
      if (d < 0 || d > 1.2) return;
      v.set(x, y, z, 0xf6f4ee);
    });
    for (const [x, y] of [[0, 10], [-1, 10], [1, 10], [0, 11], [0, 9]]) front(v, x, y, 0xd42a2a);
    each(-1, 1, 9, 11, -10, -8, (x, y, z) => v.set(x, y, z, 0xece8dc)); // knot
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) v.set(sx * (1 + Math.round(i * 0.4)), 8 - i, -9 - Math.round(i * 0.5), 0xf6f4ee);
    return v;
  },
  sharkHood() {
    const TOP = 0x6f92b4, TOP_D = 0x5a7c9e, WHITE = 0xf2f4f6;
    const v = hood(vm(), {
      col: TOP, rim: MOUTH,
      paint: (x, y, z, col) => (col === TOP ? (y < 4 && Math.abs(x) > 6 ? WHITE : y > 15 && hash(x, y >> 1, z, 1) > 0.8 ? TOP_D : col) : col),
    });
    // snout overhang with a row of teeth, and the lower jaw (white)
    each(-8, 8, 10, 16, 6, 16, (x, y, z) => { if (rbox(x, y, z, [0, 12.6, 11.6], [7.2, 2.6, 3.4], 2.4) <= 0) v.set(x, y, z, y <= 10 ? MOUTH : TOP); });
    for (let x = -6; x <= 6; x++) if (x % 2 === 0) v.set(x, 9, 14, TOOTH); else v.set(x, 9, 14, null);
    for (const sx of [-1, 1]) for (let z = 9; z <= 13; z += 2) v.set(sx * 7, 9, z, TOOTH);
    each(-7, 7, -7, -4, 4, 13, (x, y, z) => { if (rbox(x, y, z, [0, -5.6, 8.6], [6.4, 1.6, 4.2], 1.6) <= 0) v.set(x, y, z, y >= -4 ? MOUTH : WHITE); });
    for (let x = -5; x <= 5; x += 2) v.set(x, -3, 12, TOOTH);
    // dorsal fin
    for (let y = 18; y <= 28; y++) {
      const t = (y - 18) / 10, zf = 4 - 9.5 * t ** 0.7, zb = -4.5 - 1.5 * t;
      for (let z = Math.round(zb); z <= Math.round(zf); z++) { v.set(0, y, z, TOP_D); if (y < 21) { v.set(-1, y, z, TOP); v.set(1, y, z, TOP); } }
    }
    // eyes + gills
    for (const sx of [-1, 1]) {
      side(v, sx, 10, 8, gloss(INK)); side(v, sx, 11, 8, gloss(INK)); side(v, sx, 11, 9, 0xffffff);
      for (const z of [0, -2, -4]) for (let y = 3; y <= 8; y++) side(v, sx, y, z + (y > 5 ? 0 : 1), TOP_D);
    }
    return v;
  },
  bearHood() {
    const B = 0x8c5a38, T = 0xe0bc88;
    const v = hood(vm(), { col: B, rim: T, paint: (x, y, z, col) => (col === B && hash(x, y, z, 2) > 0.8 ? 0x7a4c2e : col) });
    // muzzle + nose + eyes above the face hole
    each(-4, 4, 10, 14, 11, 16, (x, y, z) => { if (((x) / 3.2) ** 2 + ((y - 12) / 1.9) ** 2 + ((z - 13) / 1.9) ** 2 <= 1) v.set(x, y, z, T); });
    v.set(0, 13, 14, gloss(INK)).set(-1, 13, 14, gloss(INK)).set(1, 13, 14, gloss(INK)).set(0, 12, 15, gloss(INK));
    for (const sx of [-1, 1]) { front(v, sx * 4, 14, gloss(INK)); front(v, sx * 4, 15, gloss(INK)); front(v, sx * 5, 15, gloss(INK)); }
    return v;
  },
  bearEar(sx) {
    const v = vm(0.02);
    each(-4, 4, -1, 7, -2, 2, (x, y, z) => {
      const r = Math.hypot(x, y - 2.4);
      if (r > 3.4 || z < -1 || z > 1) return;
      v.set(sx * x, y, z, r < 2 && z === 1 ? 0xe0bc88 : 0x8c5a38);
    });
    return v;
  },
  frogCap() {
    const G1 = 0x7cc84a, G2 = 0x5aa63a;
    const v = vm();
    each(-10, 10, 9, 19, -9, 13, (x, y, z) => {
      const d = rbox(x, y, z, [0, 6.4, 2.2], [7.3, 10.6, 8.7], 4.5);
      if (d < 0 || d > 1.6 || y < 10) return;
      v.set(x, y, z, y <= 10 ? G2 : G1);
    });
    for (const sx of [-1, 1]) {
      const cx = sx * 4, cy = 18.6, cz = 5.6;
      each(cx - 4, cx + 4, cy - 4, cy + 4, cz - 4, cz + 4, (x, y, z) => {
        const r = Math.hypot(x - cx, y - cy, z - cz);
        if (r > 3.3) return;
        v.set(x, y, z, z > cz + 0.5 && y < cy + 1.6 ? 0xfdfdf6 : G1);
      });
      v.set(cx - sx, cy, cz + 3, gloss(INK)).set(cx - sx, cy - 1, cz + 3, gloss(INK)).set(cx, cy - 1, cz + 3, gloss(INK)).set(cx, cy, cz + 3, gloss(INK));
    }
    // a big smile + rosy cheeks on the front of the cap
    for (let x = -5; x <= 5; x++) front(v, x, 12 + (Math.abs(x) > 3 ? 1 : 0), 0xe0506a, 6, 20);
    front(v, -6, 13, 0xff9aa8, 6, 20); front(v, 6, 13, 0xff9aa8, 6, 20);
    return v;
  },
  cone() {
    const OR = 0xf26a1f, WH = 0xf8f8f2;
    const v = vm(0.02);
    for (let y = 10; y <= 32; y++) {
      const t = (y - 10) / 22, r = 8.8 * (1 - t) + 1.1 * t;
      each(-10, 10, y, y, -9, 14, (x, yy, z) => {
        const d = Math.hypot(x, z - 2.4);
        if (d > r + 0.45 || (d < r - 1.3 && r > 3)) return;
        const band = (y >= 16 && y <= 18) || (y >= 22 && y <= 23);
        v.set(x, y, z, gloss(band ? WH : OR));
      });
    }
    // square base around the head (just above the brows)
    each(-10, 10, 9, 9, -8, 13, (x, y, z) => {
      if (Math.max(Math.abs(x), Math.abs(z - 2.4)) > 9.6 || Math.abs(x) + Math.abs(z - 2.4) > 16) return;
      if (Math.abs(x) <= 7 && z >= -6 && z <= 11) return;
      v.set(x, y, z, 0xd8561a);
    });
    return v;
  },
  party() {
    const v = vm(0.02);
    const C = [0xff5fa0, 0xffd23f, 0x46c2d8];
    for (let y = 0; y <= 13; y++) {
      const r = 4.4 * (1 - y / 13);
      each(-5, 5, y, y, -5, 5, (x, yy, z) => {
        if (Math.hypot(x, z) > r + 0.4) return;
        const s = Math.floor((y + (Math.atan2(x, z) / Math.PI + 1) * 3) / 2.5);
        v.set(x, y, z, C[((s % 3) + 3) % 3]);
      });
    }
    return v;
  },
  pompom() {
    const v = vm(0.05);
    each(-2, 2, -2, 2, -2, 2, (x, y, z) => { if (Math.hypot(x, y, z) <= 2.2) v.set(x, y, z, hash(x, y, z) > 0.5 ? 0xfff6c8 : 0xffffff); });
    return v;
  },
  bow() {
    const R = 0xe8384f, R2 = 0xc42a40, DOT = 0xfff4f4;
    const v = vm(0.02);
    const dot = (x, y) => ((x + 40) % 3 === 0 && (y + 40) % 3 === 0) || ((x + 41) % 3 === 0 && (y + 41.5) % 3 === 0.5);
    for (const sx of [-1, 1]) {
      each(-11, 11, -5, 6, -2, 2, (x, y, z) => {
        if (Math.sign(x) !== sx) return;
        const ex = (Math.abs(x) - 5.6) / 5, ey = (y - 0.6 - (Math.abs(x) - 2) * 0.18) / 3.8, q = ex * ex + ey * ey;
        if (q > 1 || Math.abs(z) > 1.6 - Math.abs(ex) * 0.6) return;
        if (q < 0.3 && Math.abs(z) < 1) return; // the loop's hole
        v.set(x, y, z, dot(x, y) && z > 0 ? DOT : R);
      });
      for (let i = 0; i <= 6; i++) each(sx * (1 + Math.round(i * 0.45)), sx * (2 + Math.round(i * 0.45)), -1 - i, -1 - i, -1 - Math.round(i * 0.4), -Math.round(i * 0.4), (x, y, z) => v.set(x, y, z, i === 6 && Math.abs(x) % 2 ? null : R2));
    }
    each(-1, 1, -1, 2, -1, 1, (x, y, z) => v.set(x, y, z, R2));
    return v;
  },
  nigiri() {
    const v = vm(0.04);
    each(-6, 6, 0, 5, -8, 8, (x, y, z) => {
      if (rbox(x, y, z, [0, 2.3, 0], [5.4, 2.6, 7.2], 2) > 0) return;
      v.set(x, y, z, hash(x, y, z, 6) > 0.82 ? 0xe8e2d2 : 0xfaf8ee);
    });
    // the salmon slice draping over both ends
    each(-6, 6, 2, 7, -10, 10, (x, y, z) => {
      const az = Math.abs(z), top = 6 - (az > 7 ? Math.min(3, Math.round((az - 7) * 1.4)) : 0);
      if (Math.abs(x) > 5.6 - (az > 8 ? 1 : 0) || az > 9.6) return;
      if (y > top || y < top - 1) return;
      const s = ((x * 0.7 + z * 0.9) % 3.4 + 3.4) % 3.4;
      v.set(x, y, z, gloss(s < 0.8 ? 0xffd2bc : y === top ? 0xf47a48 : 0xe86438));
    });
    return v;
  },
  chickenBody() {
    const W = 0xfcfaf2, W2 = 0xe8e2d2, OR = 0xf5a524;
    const v = vm(0.03);
    each(-7, 7, 15, 26, -9, 9, (x, y, z) => {
      const q = (x / 6.2) ** 2 + ((y - 20.8) / 4.9) ** 2 + ((z - 0.4) / 7.4) ** 2;
      if (q <= 1) v.set(x, y, z, y < 18 ? W2 : W);
    });
    // tail feathers fanning up at the back
    for (const [x, hgt] of [[-2, 5], [0, 7], [2, 5]]) for (let i = 0; i < hgt; i++) { v.set(x, 22 + i, -6 - Math.round(i * 0.45), i > hgt - 2 ? W2 : W); v.set(x, 22 + i, -7 - Math.round(i * 0.45), W); }
    // feet peeking out at the front
    for (const sx of [-1, 1]) { v.set(sx * 2, 16, 6, OR).set(sx * 2, 16, 7, OR).set(sx * 2 + sx, 16, 7, OR).set(sx * 2 - sx, 16, 7, OR); }
    return v;
  },
  chickenHead() {
    const W = 0xfcfaf2, OR = 0xf5b02a, RED = 0xe5383b;
    const v = vm(0.03);
    each(-4, 4, 22, 30, 3, 11, (x, y, z) => { if (Math.hypot(x, y - 26, (z - 6.6) * 1.05) <= 3.5) v.set(x, y, z, W); });
    each(-1, 1, 24, 26, 10, 11, (x, y, z) => v.set(x, y, z, gloss(OR)));
    v.set(0, 25, 12, gloss(OR)).set(0, 24, 12, gloss(0xe0901a));
    v.set(0, 23, 9, RED).set(0, 22, 9, RED).set(0, 21, 9, RED).set(0, 22, 10, RED);
    for (const sx of [-1, 1]) v.set(sx * 3, 27, 8, gloss(INK)).set(sx * 3, 26, 8, gloss(INK)).set(sx * 3, 27, 9, 0xffffff);
    return v;
  },
  chickenComb() {
    const v = vm(0.03);
    for (const [z, y, r] of [[4.6, 30.4, 1.6], [6.6, 31.2, 1.9], [8.6, 30.4, 1.5]]) each(-1, 1, 28, 34, 2, 11, (x, yy, zz) => { if (Math.hypot(x * 1.6, yy - y, zz - z) <= r) v.set(x, yy, zz, 0xe5383b); });
    return v;
  },
  chickenWing(sx) {
    const v = vm(0.03);
    each(-8, 8, 16, 25, -6, 6, (x, y, z) => {
      if (Math.sign(x) !== sx) return;
      const q = ((Math.abs(x) - 6.4) / 1.5) ** 2 + ((y - 20.6) / 3.4) ** 2 + ((z + 0.4) / 4.8) ** 2;
      if (q <= 1) v.set(x, y, z, z < -3 ? 0xe2dccb : 0xfcfaf2);
    });
    return v;
  },
  shades() {
    const F = gloss(0x141416), L = gloss(0x22303f);
    const v = vm(0.01);
    for (const sx of [-1, 1]) {
      each(1, 4, -1, 1, 12, 12, (x, y, z) => v.set(sx * x, y, z, (x === 1 || x === 4) && y === 1 ? L : L));
      each(1, 5, 2, 2, 12, 12, (x, y, z) => v.set(sx * x, y, z, F));
      each(2, 4, -2, -2, 12, 12, (x, y, z) => v.set(sx * x, y, z, F));
      v.set(sx * 5, 1, 12, F).set(sx * 5, 0, 12, F).set(sx * 6, 2, 11, F).set(sx * 6, 1, 11, F);
      for (let z = 3; z <= 11; z++) v.set(sx * 7, z > 8 ? 1 : 1, z, F);
    }
    v.set(0, 1, 12, F).set(0, 2, 12, F);
    // a little highlight on each lens
    v.set(-3, 1, 12, gloss(0x5a7290)).set(2, 1, 12, gloss(0x5a7290));
    return v;
  },
  stars() {
    const F = gloss(0xff4f9a), L = gloss(0xffcf3a);
    const v = vm(0.01);
    for (const sx of [-1, 1]) {
      const cx = sx * 3.6, cy = 0.4;
      each(-8, 8, -4, 5, 12, 12, (x, y, z) => {
        const dx = x - cx, dy = y - cy, a = Math.atan2(dx, dy), d = Math.hypot(dx, dy);
        const R = 3.9 * (0.52 + 0.48 * Math.abs(Math.cos(a * 2.5)) ** 1.6);
        if (d > R + 0.3) return;
        v.set(x, y, z, d > R - 1 ? F : L);
      });
      for (let z = 3; z <= 11; z++) v.set(sx * 8, 1, z, F);
    }
    v.set(0, 1, 12, F);
    return v;
  },
  groucho() {
    const F = gloss(0x141416), BR = 0x2a1a14, NOSE = 0xf0a48c;
    const v = vm(0.02);
    for (const sx of [-1, 1]) {
      each(1, 5, -2, 2, 12, 12, (x, y, z) => { if (x === 1 || x === 5 || y === -2 || y === 2) v.set(sx * x, y, z, F); });
      for (let z = 3; z <= 11; z++) v.set(sx * 7, 1, z, F);
      v.set(sx * 6, 1, 12, F);
      each(1, 5, 3, 4, 12, 12, (x, y, z) => { if (!(y === 4 && (x === 1 || x === 5))) v.set(sx * x, y, z, BR); });
      // the moustache: thick, with curled-down ends
      each(0, 5, -7, -5, 12, 13, (x, y, z) => { const top = -5 - (x > 3 ? 1 : 0); if (y <= top && y >= top - 1 - (x > 4 ? 1 : 0) && !(z === 13 && x > 3)) v.set(sx * x, y, z, BR); });
    }
    v.set(0, 1, 12, F);
    each(-2, 2, -5, -1, 12, 15, (x, y, z) => { if ((x / 2.1) ** 2 + ((y + 3) / 2.4) ** 2 + ((z - 12.6) / 2.2) ** 2 <= 1) v.set(x, y, z, NOSE); });
    v.set(-1, -5, 13, 0x8a4a3a).set(1, -5, 13, 0x8a4a3a);
    return v;
  },
  kitsune() {
    const W = 0xf8f4ea, W2 = 0xe8e2d4, R = 0xd8302a, GD = 0xe0b040;
    const v = vm(0.015);
    // a wide brow tapering to a pointed muzzle
    for (let y = -7; y <= 4; y++) {
      const w = y >= 1 ? 5.2 : 1.6 + (y + 7) * 0.45;
      for (let x = -6; x <= 6; x++) {
        if (Math.abs(x) > w + 0.3) continue;
        const zt = Math.round(2.4 - (x / (w + 0.5)) ** 2 * 1.4);
        for (let z = 0; z <= zt; z++) v.set(x, y, z, z === 0 ? W2 : W);
      }
    }
    each(-2, 2, -7, -1, 1, 6, (x, y, z) => { if ((x / 1.9) ** 2 + ((y + 4) / 3.2) ** 2 + ((z - 2.4) / 2.6) ** 2 <= 1) v.set(x, y, z, W); });
    // ears splayed outwards, red inside
    for (const sx of [-1, 1]) for (let y = 4; y <= 9; y++) {
      const c = sx * (3.3 + (y - 4) * 0.42), w = 2.3 * (1 - (y - 4) / 5.6);
      for (let x = Math.round(c - w); x <= Math.round(c + w); x++) { v.set(x, y, 0, W2); v.set(x, y, 1, Math.abs(x - c) < w - 0.9 && y < 8 ? R : W); }
    }
    for (const sx of [-1, 1]) {
      // slanted eye slits under flame-like red brows, a red cheek mark
      front(v, sx * 1, 1, INK); front(v, sx * 2, 1, INK); front(v, sx * 3, 2, INK);
      front(v, sx * 1, 3, R); front(v, sx * 2, 3, R); front(v, sx * 3, 4, R); front(v, sx * 4, 4, R);
      front(v, sx * 3, -1, R); front(v, sx * 4, 0, R);
    }
    front(v, 0, 4, GD); front(v, 0, 3, GD);
    front(v, 0, -6, INK); front(v, 0, -7, INK); front(v, -1, -6, R); front(v, 1, -6, R);
    return v;
  },
  cord() {
    const v = vm(0.01);
    each(-9, 9, 11, 11, -9, 8, (x, y, z) => { const d = rbox(x, y, z, [0, 6, 2.3], [7.4, 10, 8.9], 3.6); if (d >= 0 && d <= 1) v.set(x, y, z, 0xd8302a); });
    return v;
  },
};

// ------------------------------------------------------------------ per-human body pieces (metric voxels)
function spike(size) {
  const v = vm(0.03);
  for (let d = 0; d < size; d++) {
    const hl = (size - d) * 0.62;
    for (let y = -Math.round(hl); y <= Math.round(hl); y++) {
      v.set(0, y, -d, d === 0 ? SPIKE_D : SPIKE);
      if (d === 0) { v.set(-1, y, 0, SPIKE_D); v.set(1, y, 0, SPIKE_D); }
    }
  }
  return v;
}
function tailSeg(len, r0, r1, spikeH) {
  const v = vm(0.03);
  for (let d = 0; d <= len; d++) {
    const r = r0 + (r1 - r0) * (d / len);
    each(-6, 6, -6, 6, -d, -d, (x, y, z) => {
      if (x * x + y * y > r * r + 0.3) return;
      v.set(x, y, z, y < -r * 0.35 ? DINO_BELLY : hash(x, y >> 1, z, 8) > 0.86 ? DINO_D : DINO);
    });
  }
  if (spikeH) for (let d = 0; d < spikeH; d++) for (let z = -Math.round(len * 0.5) - (spikeH - d) + 1; z <= -Math.round(len * 0.5) + (spikeH - d) - 1; z++) v.set(0, Math.round(r0 * 0.85) + 1 + d, z, SPIKE);
  return v;
}
function boxCostume(P) {
  const V = P.H / 140, CB = 0xc89a5e, CB2 = 0xb08048, TAPE = 0xe8d6a6;
  const X = Math.round((P.bustX + 0.024) / V), Zf = Math.round((P.chestZ + P.bust * 0.6 + P.belly * 0.7 + 0.03) / V), Zb = -Math.round((P.chestZ + 0.034) / V);
  const Y0 = Math.round((P.hipY - 0.01 * P.H - P.waistY) / V), Y1 = Math.round((P.shoulderY + 0.012 * P.H - P.waistY) / V);
  const v = vm(0.035);
  each(-X, X, Y0, Y1, Zb, Zf, (x, y, z) => { if (Math.abs(x) === X || z === Zb || z === Zf) v.set(x, y, z, hash(x >> 2, y >> 2, z >> 2, 4) > 0.8 ? CB2 : CB); });
  // flaps folded outwards
  const flap = (n, fn) => { for (let d = 1; d <= n; d++) fn(d); };
  flap(6, (d) => { for (let x = -X + 1; x <= X - 1; x++) { v.set(x, Y1 + Math.round(d * 0.7), Zf + Math.round(d * 0.7), CB2); v.set(x, Y1 + Math.round(d * 0.7), Zb - Math.round(d * 0.7), CB2); } });
  flap(5, (d) => { for (let z = Zb + 1; z <= Zf - 1; z++) for (const sx of [-1, 1]) v.set(sx * (X + Math.round(d * 0.7)), Y1 + Math.round(d * 0.7), z, CB); });
  // tape + a robot face in black marker + a red button
  for (let y = Y1 - 5; y <= Y1; y++) for (let x = -1; x <= 1; x++) v.set(x, y, Zf, TAPE);
  const ey = Y1 - 9;
  for (const sx of [-1, 1]) each(sx > 0 ? 3 : -7, sx > 0 ? 7 : -3, ey - 2, ey + 1, Zf, Zf, (x, y, z) => v.set(x, y, z, (x === (sx > 0 ? 4 : -6) && y === ey) ? 0xffffff : INK));
  each(-6, 6, ey - 9, ey - 5, Zf, Zf, (x, y, z) => { if (y === ey - 9 || y === ey - 5 || x === -6 || x === 6 || x % 2 === 0) v.set(x, y, z, INK); });
  each(X - 5, X - 3, Y0 + 3, Y0 + 5, Zf, Zf, (x, y, z) => v.set(x, y, z, gloss(0xe5383b)));
  each(-X + 3, -X + 5, Y0 + 3, Y0 + 5, Zf, Zf, (x, y, z) => v.set(x, y, z, gloss(0x3f86e8)));
  // 'this side up' arrows on the sides
  for (const sx of [-1, 1]) for (const zc of [Math.round(Zb * 0.5), Math.round(Zf * 0.5)]) {
    for (let i = 0; i < 6; i++) v.set(sx * X, Y0 + 8 + i, zc, INK);
    v.set(sx * X, Y0 + 12, zc - 1, INK).set(sx * X, Y0 + 12, zc + 1, INK).set(sx * X, Y0 + 11, zc - 2, INK).set(sx * X, Y0 + 11, zc + 2, INK);
  }
  return { v, V };
}

// ------------------------------------------------------------------ spec tweaks
/** Change a fresh spec for the equipped look (call before new Human(spec)). */
export function applyCosmeticSpec(spec, look = {}) {
  const hat = COSMETIC_BY_ID[look.hat], out = COSMETIC_BY_ID[look.outfit];
  if (out?.id === 'dino' || out?.id === 'banana') {
    const dino = out.id === 'dino';
    spec.top = { kind: 'onesie', col: hex(dino ? DINO : BANANA), col2: dino ? hex(DINO_BELLY) : null, spots: dino ? hex(DINO_D) : hex(BANANA_SPOT), spotK: dino ? 0.7 : 0.95, spotF: dino ? 34 : 70, spotT: dino ? 0.72 : 0.83 };
    spec.bottom = { kind: 'slacks', col: hex(dino ? DINO : BANANA), noCrease: true };
    spec.legs = 'skin'; spec.socks = null;
    spec.shoes = dino ? { kind: 'comfort', col: hex(DINO_D) } : { kind: 'sneaker', col: hex(0x6a4a24), col2: hex(BANANA) };
    spec.acc = spec.acc.filter((a) => a.kind === 'camera');
  } else if (out?.id === 'happi') {
    spec.top = { kind: 'happi', col: hex(0x2a3f78), col2: hex(0xc8302a), col3: hex(0xf4f0e4), sleeve: 'mid' };
    spec.acc = spec.acc.filter((a) => a.kind !== 'backpack' && a.kind !== 'randoseru');
  } else if (out?.id === 'box') spec.acc = spec.acc.filter((a) => !['backpack', 'randoseru', 'shoulderbag', 'tote', 'camera', 'apron'].includes(a.kind));
  // anything covering the whole head tucks the hair in (only the hair below the band stays)
  if (hat?.cover || out?.hood) spec.hat = { kind: 'hood' };
  else if (hat) spec.hat = null;
  if (look.face) spec.glasses = null;
  return spec;
}

/** Hair height above the crown in head units (hats that sit on top of the hair are lifted by this). */
function hairLift(spec) {
  if (spec.hat) return 0;
  const st = spec.hair.style, vol = spec.hair.volume || 1;
  const th = { buzz: 0.016, short: 0.05 * vol, sidepart: 0.05 * vol, messy: 0.07, mushroom: 0.07, bowl: 0.05, bob: 0.055 * vol, long: 0.055 * vol, perm: 0.1, bald: 0 }[st] ?? 0.035 * vol;
  return th * 0.9 * 20;
}

// ------------------------------------------------------------------ dressing a human
const mesh = (geo) => { const m = new THREE.Mesh(geo, MATS()); m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; return m; };
const pivotGroup = (p, child) => { const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); if (child) g.add(child); return g; };

/**
 * Attach the voxel pieces of `look` to h's bones and start their secondary motion. Returns the rig
 * ({ parts, update(dt), dispose() }); h.update and h.dispose are wrapped to drive / clean it up.
 */
export function dressHuman(h, look = {}) {
  const P = h.P, J = h.J, b = h.b, spec = h.spec;
  const hu = P.hu, U = hu / 20;
  const kx = P.hw / (0.335 * hu), kz = P.hd / (0.42 * hu);
  const rig = { h, parts: [], anims: [], t: Math.random() * 10 };
  const hat = COSMETIC_BY_ID[look.hat], out = COSMETIC_BY_ID[look.outfit], face = COSMETIC_BY_ID[look.face];
  // head rig in head units
  const head = new THREE.Group();
  head.name = 'cosmetics:head';
  head.scale.set(U * kx, U, U * kz);
  b.head.add(head);
  rig.parts.push(head);
  const eyeY = (P.eyeY - J.head[1]) / U; // ~6 for adults
  const lift = hairLift(spec);
  const hoodOn = out?.hood && !hat?.cover;
  const crown = new THREE.Group(); crown.position.y = hoodOn ? 3 : lift; head.add(crown);
  const eyes = new THREE.Group(); eyes.position.y = eyeY; head.add(eyes);
  const add = (parent, key, build, pivot = [0, 0, 0]) => { const m = mesh(cached(key, build, pivot)); const g = pivotGroup(pivot, m); parent.add(g); return g; };

  // ---- outfit
  if (out?.id === 'dino') {
    if (hoodOn) add(head, 'dinoHood', H.dinoHood);
    // spikes down the back + the tail
    const V = P.H / 140;
    const body = (bone, y, z, size) => { const s = add(b[bone], 'spike' + size, () => spike(size)); s.position.set(0, y, z); s.scale.setScalar(V); rig.parts.push(s); };
    const chestBack = (y) => -(P.chestZ * (0.92 - 0.1 * (y - P.waistY) / (P.shoulderY - P.waistY))) - 0.004;
    for (const [f, s] of [[0.86, 4], [0.52, 5], [0.18, 5]]) { const y = P.waistY + (P.shoulderY - P.waistY) * f; body('chest', y - J.chest[1], chestBack(y), s); }
    body('spine', (P.waistY + P.pelvisY) / 2 - J.spine[1], -P.waistZ - 0.006, 4);
    const tail = new THREE.Group();
    tail.position.set(0, P.hipY + 0.03 * P.H - J.hips[1], -P.hipsZ - 0.012);
    tail.scale.setScalar(V);
    b.hips.add(tail); rig.parts.push(tail);
    const segs = [[11, 5.2, 4.3, 2], [10, 4.3, 3.3, 3], [9, 3.3, 2.3, 2], [8, 2.3, 1.0, 0]];
    let parent = tail;
    const chain = [];
    segs.forEach(([len, r0, r1, sp], i) => {
      const g = add(parent, `tail${i}`, () => tailSeg(len, r0, r1, sp));
      if (i) g.position.set(0, 0, -segs[i - 1][0]);
      chain.push({ g, a: 0, v: 0, p: 0, pv: 0, base: i === 0 ? -0.62 : 0.2 + i * 0.04 });
      parent = g;
    });
    rig.anims.push({ kind: 'tail', chain });
  } else if (out?.id === 'banana') {
    if (hoodOn) add(head, 'bananaHood', H.bananaHood);
  } else if (out?.id === 'happi') {
    if (!hat?.cover) add(head, 'happiBand', H.happiBand);
  } else if (out?.id === 'box') {
    const { v, V } = boxCostume(P);
    const key = `box:${Math.round(P.H * 100)}:${Math.round(P.bustX * 1000)}:${Math.round((P.bust + P.belly) * 1000)}`;
    const g = add(b.chest, key, () => v);
    g.scale.setScalar(V);
    rig.parts.push(g);
  }
  // ---- hat
  if (hat) {
    const id = hat.id;
    if (id === 'shark') add(head, 'sharkHood', H.sharkHood);
    else if (id === 'bear') {
      add(head, 'bearHood', H.bearHood);
      const ears = [-1, 1].map((sx) => { const e = add(head, 'bearEar' + sx, () => H.bearEar(sx)); e.position.set(sx * 6.4, 16.2, 0.6); e.rotation.z = -sx * 0.25; return e; });
      rig.anims.push({ kind: 'ears', ears, t: 2 + Math.random() * 4, w: 0 });
    } else if (id === 'frog') add(head, 'frogCap', H.frogCap);
    else if (id === 'cone') add(head, 'cone', H.cone);
    else if (id === 'party') {
      const p = add(crown, 'party', H.party); p.position.set(2, 15.4, 1.6); p.rotation.set(-0.12, 0, -0.32);
      const pom = add(p, 'pompom', H.pompom); pom.position.set(0, 14, 0);
      rig.anims.push({ kind: 'bob', g: pom, x: 0, z: 0, vx: 0, vz: 0, amp: 0.9, base: p });
    } else if (id === 'bow') { const g = add(crown, 'bow', H.bow); g.position.set(2.6, 17, 3); g.rotation.set(-0.35, 0.1, -0.22); }
    else if (id === 'nigiri') { const g = add(crown, 'nigiri', H.nigiri); g.position.set(0, 15.4, 1.6); g.rotation.set(-0.06, 0.08, 0); }
    else if (id === 'chicken') {
      add(crown, 'chickenBody', H.chickenBody);
      const hd = add(crown, 'chickenHead', H.chickenHead, [0, 23.5, 5.5]);
      const comb = add(hd, 'chickenComb', H.chickenComb, [0, 29, 6.6]);
      comb.position.sub(hd.position);
      const wings = [-1, 1].map((sx) => add(crown, 'chickenWing' + sx, () => H.chickenWing(sx), [sx * 5.4, 23, 1]));
      rig.anims.push({ kind: 'chicken', head: hd, comb, wings, t: 1, yaw: 0, yawT: 0, peck: 0, flap: 0, flapT: 4 + Math.random() * 5, cx: 0, cz: 0, vx: 0, vz: 0 });
    }
  }
  // ---- face
  if (face) {
    if (face.id === 'kitsune') {
      const k = add(head, 'kitsune', H.kitsune);
      k.position.set(hoodOn || hat?.cover ? 9.6 : 7.4, 10.5, 1.2);
      k.rotation.set(-0.15, 1.2, 0.32);
      if (!hoodOn && !hat?.cover) add(head, 'cord', H.cord);
    } else {
      const g = add(eyes, face.id, H[face.id]);
      g.position.z = hoodOn || hat?.cover ? 0.6 : 0;
    }
  }
  // ---- peace-sign fingers (shown by gestures that ask for them: pose.vsign = 'L' | 'R' | 'LR')
  const sk = spec.skin;
  const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(sk[0] / 255 * 0.92, sk[1] / 255 * 0.9, sk[2] / 255 * 0.9, THREE.SRGBColorSpace), roughness: 0.85 });
  rig.vsign = ['L', 'R'].map((s) => {
    const g = new THREE.Group(), jh = J['hand' + s], Hh = P.H;
    for (const [dz, a] of [[0.01, -0.26], [-0.004, 0.18]]) {
      const f = new THREE.Mesh(fingerGeo(), skinMat);
      f.scale.set(0.0085 * Hh, 0.052 * Hh, 0.0085 * Hh);
      f.position.set(0, P.tipY + 0.03 * Hh - jh[1], 0.004 * Hh + dz * Hh - jh[2]);
      f.rotation.x = a;
      f.castShadow = true;
      f.raycast = () => {};
      g.add(f);
    }
    g.visible = false;
    b['hand' + s].add(g);
    rig.parts.push(g);
    return g;
  });
  rig.update = (dt) => updateRig(rig, dt);
  rig.dispose = () => { for (const p of rig.parts) p.removeFromParent(); rig.parts.length = 0; skinMat.dispose(); };
  // drive the rig from the human's own update
  const up = h.update, dis = h.dispose;
  h.update = function (dt, o) { up.call(this, dt, o); rig.update(Math.min(dt, 0.1)); };
  h.dispose = function () { rig.dispose(); dis.call(this); };
  h.cosmetics = rig;
  return rig;
}

let _finger = null;
function fingerGeo() {
  // a unit finger hanging down from its knuckle (y 0 .. -1)
  if (!_finger) { _finger = new THREE.BoxGeometry(1, 1, 1); _finger.translate(0, -0.5, 0); }
  return _finger;
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _m = new THREE.Matrix4();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();

/** Chest-space orientation of a hand from its finger direction and palm normal ([fx, fy, fz, nx, ny, nz]). */
function handQ(d, side, out) {
  _y.set(-d[0], -d[1], -d[2]).normalize(); // the bone's +y runs from the fingertips back to the wrist
  _x.set(d[3], d[4], d[5]); if (side === 'L') _x.negate(); // left palms face -x, right palms +x (rest pose)
  _x.addScaledVector(_y, -_x.dot(_y)).normalize();
  _z.crossVectors(_x, _y);
  return out.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
}

/**
 * Poses may ask for more than the arm IK gives (applied after Human.update, blended by the gesture weight):
 *   pose.hands = { L, R: [finger dir, palm normal] }  hand orientation in chest space
 *   pose.phone = { up, face }                          the phone at pose.prop: its top along up, screen toward face
 *   pose.vsign = 'L' | 'R' | 'LR'                      peace-sign fingers
 */
function posePost(rig) {
  const h = rig.h, b = h.b;
  let vs = '', phone = null, at = null, best = 0;
  for (const g of h.gestures) {
    const w = g.w * g.w * (3 - 2 * g.w), Q = g.pose;
    if (w < 0.01) continue;
    if (Q.vsign && w > 0.5) vs += Q.vsign;
    if (Q.hands) for (const s of ['L', 'R']) {
      const d = Q.hands[s];
      if (!d || (s === 'L' && h.holdL && g.name !== 'carry')) continue;
      handQ(d, s, _q);
      _q2.copy(b['arm' + s].quaternion).multiply(b['fore' + s].quaternion).invert().multiply(_q);
      b['hand' + s].quaternion.slerp(_q2, w);
    }
    if (Q.phone && Q.prop && w > 0.55 && w > best) { best = w; phone = Q.phone; at = Q.prop; }
  }
  rig.vsign[0].visible = vs.includes('L'); rig.vsign[1].visible = vs.includes('R');
  if (phone && b.prop.scale.x > 0) {
    // hand frame in chest space -> the phone's local transform under the hand
    const A = b.armR, F = b.foreR, Hn = b.handR;
    _q.copy(A.quaternion).multiply(F.quaternion);
    _v.copy(Hn.position).applyQuaternion(_q).add(_v2.copy(F.position).applyQuaternion(A.quaternion)).add(A.position);
    _q.multiply(Hn.quaternion);
    _y.set(phone.up[0], phone.up[1], phone.up[2]).normalize();
    _z.set(-phone.face[0], -phone.face[1], -phone.face[2]); // the screen is on the phone's -z side
    _z.addScaledVector(_y, -_z.dot(_y)).normalize();
    _x.crossVectors(_y, _z);
    _q3.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
    _q2.copy(_q).invert();
    b.prop.quaternion.copy(_q2).multiply(_q3);
    b.prop.position.set(at[0], at[1], at[2]).sub(_v).applyQuaternion(_q2);
  }
}

function updateRig(rig, dt) {
  if (dt <= 0) return;
  const h = rig.h, b = h.b;
  rig.t += dt;
  posePost(rig);
  // head acceleration in head space drives the dangly bits
  b.head.getWorldPosition(_v);
  if (!rig.hp) { rig.hp = _v.clone(); rig.hv = new THREE.Vector3(); rig.ha = new THREE.Vector3(); }
  _v2.subVectors(_v, rig.hp).divideScalar(dt);
  rig.ha.subVectors(_v2, rig.hv).divideScalar(dt).clampLength(0, 40);
  rig.hv.copy(_v2); rig.hp.copy(_v);
  b.head.getWorldQuaternion(_q).invert();
  const acc = _v2.copy(rig.ha).applyQuaternion(_q);
  for (const A of rig.anims) {
    if (A.kind === 'tail') {
      // idle wag + sway with the walk + lag behind turns
      const W = h.walkW, ph = h.phase * Math.PI * 2;
      const wag = Math.sin(rig.t * 2.1) * 0.22 * (1 - W) + Math.sin(ph) * 0.38 * W - h.yawRate * 0.22;
      A.chain.forEach((s, i) => {
        const tgt = wag * (0.55 + i * 0.25) + (i ? A.chain[i - 1].a * 0.45 : 0);
        s.v += ((tgt - s.a) * 60 - s.v * 7) * dt; s.a += s.v * dt;
        const ptgt = s.base + (i === 0 ? Math.sin(ph * 2) * 0.07 * W - W * 0.12 : Math.sin(rig.t * 1.3 + i) * 0.03);
        s.pv += ((ptgt - s.p) * 70 - s.pv * 9) * dt; s.p += s.pv * dt;
        s.g.rotation.set(s.p, s.a, 0, 'YXZ');
      });
    } else if (A.kind === 'chicken') {
      // chicken-y head snaps, the odd peck, wing flaps; the comb jiggles with the head
      A.t -= dt;
      if (A.t < 0) {
        A.t = 0.4 + Math.random() * 1.6;
        if (Math.random() < 0.18) A.peck = 1; else A.yawT = (Math.random() * 2 - 1) * 0.7;
      }
      A.yaw += (A.yawT - A.yaw) * Math.min(1, dt * 22);
      A.peck = Math.max(0, A.peck - dt * 3.2);
      const pk = Math.sin(A.peck * Math.PI) * 0.75;
      A.head.rotation.set(pk, A.yaw, Math.sin(rig.t * 3) * 0.04, 'YXZ');
      A.vx += (-A.cx * 140 - A.vx * 7 + acc.z * 0.35 + (A.peck > 0 ? 4 : 0)) * dt; A.cx += A.vx * dt;
      A.vz += (-A.cz * 140 - A.vz * 7 - acc.x * 0.35 + A.yaw * 0) * dt; A.cz += A.vz * dt;
      A.comb.rotation.set(A.cx * 0.5, 0, A.cz * 0.5);
      A.flapT -= dt;
      if (A.flapT < 0) { A.flapT = 3 + Math.random() * 6; A.flap = 1.2; A.vx += 3; }
      A.flap = Math.max(0, A.flap - dt);
      const f = A.flap > 0 ? Math.abs(Math.sin(A.flap * 18)) * 0.9 : 0;
      A.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * -f; });
    } else if (A.kind === 'bob') {
      A.vx += (-A.x * 90 - A.vx * 6 + acc.z * 0.5) * dt; A.x += A.vx * dt;
      A.vz += (-A.z * 90 - A.vz * 6 - acc.x * 0.5) * dt; A.z += A.vz * dt;
      A.g.rotation.set(A.x * A.amp, 0, A.z * A.amp);
    } else if (A.kind === 'ears') {
      A.t -= dt;
      if (A.t < 0) { A.t = 2.5 + Math.random() * 5; A.w = 1; }
      A.w = Math.max(0, A.w - dt * 2.5);
      const e = Math.sin(A.w * Math.PI * 3) * 0.25 * A.w;
      A.ears.forEach((g, i) => { g.rotation.z = (i ? -1 : 1) * 0.25 + (i ? -e : e); });
    }
  }
}

// ------------------------------------------------------------------ previews (thumbnails)
/** An Object3D showing a hat / face item on a plain display head (outfits: see avatar.js avatarPreview). */
export function cosmeticPreview(id) {
  const c = COSMETIC_BY_ID[id];
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);
  const hm = mesh(cached('mannequin', mannequin));
  g.add(hm);
  const add = (key, build, pos, rot) => { const m = mesh(cached(key, build)); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); g.add(m); return m; };
  const lift = 1.2;
  if (!c) return root;
  switch (id) {
    case 'shark': add('sharkHood', H.sharkHood); break;
    case 'bear': add('bearHood', H.bearHood); for (const sx of [-1, 1]) add('bearEar' + sx, () => H.bearEar(sx), [sx * 6.4, 16.2, 0.6], [0, 0, -sx * 0.25]); break;
    case 'frog': add('frogCap', H.frogCap); break;
    case 'cone': add('cone', H.cone); break;
    case 'party': { const p = add('party', H.party, [2, 15.4 + lift, 1.6], [-0.12, 0, -0.32]); const pm = mesh(cached('pompom', H.pompom)); pm.position.set(0, 14, 0); p.add(pm); break; }
    case 'bow': add('bow', H.bow, [2.6, 17 + lift, 3], [-0.35, 0.1, -0.22]); break;
    case 'nigiri': add('nigiri', H.nigiri, [0, 15.4 + lift, 1.6], [-0.06, 0.08, 0]); break;
    case 'chicken': {
      add('chickenBody', H.chickenBody, [0, lift, 0]);
      const hd = mesh(cached('chickenHead', H.chickenHead, [0, 23.5, 5.5])); hd.position.set(0, 23.5 + lift, 5.5); g.add(hd);
      const cm = mesh(cached('chickenComb', H.chickenComb, [0, 29, 6.6])); cm.position.set(0, 29 - 23.5, 6.6 - 5.5); hd.add(cm);
      for (const sx of [-1, 1]) { const w = mesh(cached('chickenWing' + sx, () => H.chickenWing(sx), [sx * 5.4, 23, 1])); w.position.set(sx * 5.4, 23 + lift, 1); g.add(w); }
      break;
    }
    case 'kitsune': add('kitsune', H.kitsune, [7.4, 10.5, 1.2], [-0.15, 1.2, 0.32]); add('cord', H.cord); break;
    default: if (H[id]) add(id, H[id], [0, 6, 0]);
  }
  g.scale.setScalar(0.0117);
  return root;
}
