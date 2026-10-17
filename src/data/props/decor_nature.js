// Museum decoration props — nature & shrine garden pieces.
// Each entry: { name, jp, voxel, footprint:[w,d] (m), themes, beauty (1-10), light?, build(v) }.
// Models face +z, centred on x=0/z=0, resting on y=0. All noise is hashed (deterministic).
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, glow, glass } from '../../voxel/VoxelModel.js';

// ------------------------------------------------------------------ helpers
const TAU = Math.PI * 2;
const R = Math.round;

/** Deterministic 0..1 hash. */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h = Math.imul(h ^ (h >>> 16), 2654435761);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967295;
}

/** Smooth 3D value noise 0..1 with cell size s. */
function vnoise(x, y, z, s, seed = 0) {
  const fx = x / s, fy = y / s, fz = z / s;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
  const sm = (t) => t * t * (3 - 2 * t);
  const ux = sm(fx - x0), uy = sm(fy - y0), uz = sm(fz - z0);
  let r = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) {
    r += (i ? ux : 1 - ux) * (j ? uy : 1 - uy) * (k ? uz : 1 - uz) * hash(x0 + i, y0 + j, z0 + k, seed);
  }
  return r;
}

/** Pick from a colour list with a 0..1 value. */
const pick = (list, n) => list[Math.min(list.length - 1, Math.floor(n * list.length))];
const col = (c, x, y, z) => (typeof c === 'function' ? c(R(x), R(y), R(z)) : c);

/** Solid box accepting a colour function. */
function fill(v, x0, y0, z0, x1, y1, z1, c) {
  return v.shape(x0, y0, z0, x1, y1, z1, () => true, c);
}

/** Union of ellipsoids [cx,cy,cz,rx,ry,rz,ryBelow] with a lumpy value-noise surface. */
function blob(v, balls, color, { noise = 0.3, scale = 2.5, seed = 0, minY = -1e9 } = {}) {
  let ax = 1e9, ay = 1e9, az = 1e9, bx = -1e9, by = -1e9, bz = -1e9;
  for (const [cx, cy, cz, rx, ry, rz = rx, ryd = ry] of balls) {
    const k = 1 + noise;
    ax = Math.min(ax, cx - rx * k); bx = Math.max(bx, cx + rx * k);
    ay = Math.min(ay, cy - ryd * k); by = Math.max(by, cy + ry * k);
    az = Math.min(az, cz - rz * k); bz = Math.max(bz, cz + rz * k);
  }
  return v.shape(Math.floor(ax), Math.max(Math.floor(ay), minY), Math.floor(az), Math.ceil(bx), Math.ceil(by), Math.ceil(bz), (x, y, z) => {
    let d = 1e9;
    for (const [cx, cy, cz, rx, ry, rz = rx, ryd = ry] of balls) {
      const dy = (y - cy) / (y < cy ? ryd : ry);
      const q = ((x - cx) / rx) ** 2 + dy * dy + ((z - cz) / rz) ** 2;
      if (q < d) d = q;
    }
    if (d > (1 + noise) ** 2) return false;
    return Math.sqrt(d) < 1 + (vnoise(x, y, z, scale, seed) - 0.5) * noise * 2;
  }, color);
}

/** Tapered limb from a to b (radius r0 → r1). */
function limb(v, a, b, r0, r1, color) {
  const [x0, y0, z0] = a, [x1, y1, z1] = b;
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0, z1 - z0) * 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n, r = r0 + (r1 - r0) * t;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, z = z0 + (z1 - z0) * t;
    if (r < 0.7) v.set(x, y, z, col(color, x, y, z));
    else v.sphere(x, y, z, r, color);
  }
}
/** Limb through a list of points with radii. */
function limbPath(v, pts, radii, color) {
  for (let i = 0; i < pts.length - 1; i++) limb(v, pts[i], pts[i + 1], radii[i], radii[i + 1], color);
}

/** Bark colour: vertical fissures and plates. */
function bark(colors, plate = 2) {
  return (x, y, z) => {
    const n = hash(Math.floor(x / plate), Math.floor(y / (plate * 1.6)), Math.floor(z / plate), 7);
    const f = hash(x, 0, z, 9) < 0.22 ? 0 : 1; // dark fissure columns
    return f ? pick(colors, n) : shade(colors[0], 0.72);
  };
}

/**
 * Flat leaf sampled on a sub-voxel grid. Base at (bx,by,bz), yaw a (0 = +x), pitch p.
 * L = length, Wd = half-width. color(t, wn, x, y, z) with t 0..1 along, wn -1..1 across.
 */
function flatLeaf(v, bx, by, bz, a, p, L, Wd, color, { profile = (t) => Math.sin(Math.PI * Math.min(1, 0.08 + 0.92 * t)), droop = 0, cut = null, cup = 0 } = {}) {
  const ca = Math.cos(a), sa = Math.sin(a), cp = Math.cos(p), sp = Math.sin(p);
  for (let u = 0; u <= L; u += 0.4) {
    const t = u / L, hw = Wd * profile(t);
    for (let w = -hw; w <= hw + 0.01; w += 0.4) {
      const wn = Wd ? w / Wd : 0;
      if (cut && cut(t, wn)) continue;
      const x = bx + u * cp * ca - w * sa;
      const y = by + u * sp - droop * t * t * L + cup * wn * wn;
      const z = bz + u * cp * sa + w * ca;
      v.set(x, y, z, typeof color === 'function' ? color(t, wn, R(x), R(y), R(z)) : color);
    }
  }
}

/** Remove everything below the floor (y < 0). */
function clipFloor(v) {
  const out = [];
  v.forEach((x, y, z) => { if (y < 0) out.push([x, y, z]); });
  for (const [x, y, z] of out) v.remove(x, y, z);
}

/** Remove stray noise crumbs: anything not (26-)connected to the floor layer. */
function dropFloaters(v) {
  const b = v.bounds(), seen = new Set(), stack = [];
  const k = (x, y, z) => `${x},${y},${z}`;
  v.forEach((x, y, z) => { if (y === b.minY) { seen.add(k(x, y, z)); stack.push([x, y, z]); } });
  while (stack.length) {
    const [x, y, z] = stack.pop();
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const kk = k(x + dx, y + dy, z + dz);
      if (!seen.has(kk) && v.has(x + dx, y + dy, z + dz)) { seen.add(kk); stack.push([x + dx, y + dy, z + dz]); }
    }
  }
  const out = [];
  v.forEach((x, y, z) => { if (!seen.has(k(x, y, z))) out.push([x, y, z]); });
  for (const [x, y, z] of out) v.remove(x, y, z);
}

/** Small fern: a few arching fronds from (x,y,z). */
function fern(v, x, y, z, a0, len = 5, n = 4) {
  for (let k = 0; k < n; k++) {
    const a = a0 + k * TAU / n + 0.3 * Math.sin(k * 3);
    let prev = [x, y, z];
    for (let i = 1; i <= len; i++) {
      const t = i / len, r = i * 0.9;
      const p = [x + Math.cos(a) * r, y + Math.sin(t * Math.PI * 0.85) * len * 0.45, z + Math.sin(a) * r];
      v.line(...prev, ...p, i % 2 ? 0x4f9a3a : 0x6fb24a);
      prev = p;
    }
  }
}

/** Recolour exposed tops (no voxel above) that pass `test` with colour fn. */
function paintTops(v, test, color) {
  const out = [];
  v.forEach((x, y, z) => { if (!v.has(x, y + 1, z) && test(x, y, z)) out.push([x, y, z]); });
  v.paint(() => { for (const [x, y, z] of out) v.set(x, y, z, col(color, x, y, z)); });
}

/** Wooden plank colour with grain streaks along an axis. */
function woodGrain(base, axis = 'x') {
  return (x, y, z) => {
    const a = axis === 'x' ? y * 7 + z * 13 : axis === 'z' ? x * 7 + y * 13 : x * 7 + z * 13;
    const along = axis === 'x' ? x : axis === 'z' ? z : y;
    const g = hash(a, Math.floor(along / 5), 3, 5);
    return g < 0.18 ? shade(base, 0.86) : g > 0.85 ? shade(base, 1.08) : base;
  };
}

/** Weathered stone colour. */
function stoneFn(base, seed = 0) {
  return (x, y, z) => {
    const n = vnoise(x, y, z, 3, seed) * 0.6 + hash(x, y, z, seed) * 0.4;
    return shade(base, 0.84 + n * 0.3);
  };
}

const MOSS = [0x4f7a2c, 0x5f8a34, 0x6f9a3c, 0x82ad45];
const PINE = [0x284f24, 0x2f5e2a, 0x3b6e31, 0x467d38];

/** Hexagon test (corners along ±x). */
const hexIn = (x, z, r) => Math.abs(z) <= r * 0.866 && Math.abs(z) * 0.577 + Math.abs(x) <= r + 0.3;

/** Pine needle pad colouring (light on top, dark beneath). */
function padColor(cy) {
  return (x, y, z) => {
    const n = hash(x, y, z, 21);
    if (y >= cy + 1) return n > 0.6 ? 0x5e9445 : n > 0.25 ? PINE[3] : PINE[2];
    if (y < cy - 1) return n > 0.5 ? PINE[0] : 0x1f4222;
    return pick(PINE, n);
  };
}

/** Pine foliage pad: flat-bottomed lumpy cloud. */
function pinePad(v, cx, cy, cz, rx, ry, rz, seed) {
  blob(v, [[cx, cy, cz, rx, ry, rz, ry * 0.6], [cx - rx * 0.35, cy + ry * 0.3, cz + rz * 0.2, rx * 0.6, ry * 0.9, rz * 0.6, ry * 0.5]], padColor(cy), { noise: 0.28, scale: 2, seed });
}

// ------------------------------------------------------------------ props
const PROPS = {
  plant_pothos: {
    name: 'Pothos on a Stand', jp: 'ポトス', voxel: 0.015, footprint: [0.5, 0.5], themes: ['nature', 'home'], beauty: 4,
    build(v) {
      const WOOD = 0xb07a46, T = 34; // T = stand top
      // tall four-legged plant stand with a lower shelf
      fill(v, -11, T, -11, 11, T + 1, 11, woodGrain(WOOD, 'x'));
      v.paint(() => v.box(-11, T, -11, 11, T, 11, shade(WOOD, 0.85)));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(sx * 9, 0, sz * 9, sx * 10, T - 1, sz * 10, shade(WOOD, 0.9));
      v.hollowBox(-10, 8, -10, 10, 9, 10, shade(WOOD, 0.95), 1, ['top', 'bottom']);
      fill(v, -9, 8, -9, 9, 8, 9, woodGrain(shade(WOOD, 1.05), 'x'));
      v.hollowBox(-10, T - 3, -10, 10, T - 2, 10, shade(WOOD, 0.9), 1, ['top', 'bottom']);
      // glossy ceramic pot with a cobalt band
      const P = T + 2;
      v.shape(-9, P, -9, 9, P + 12, 9, (x, y, z) => Math.hypot(x, z) <= 6.3 + (y - P) * 0.14 + (y >= P + 11 ? 0.8 : 0), (x, y, z) => {
        if (y === P + 4 || y === P + 5) return gloss((x + z + y) % 4 === 0 ? 0xf4f1ea : 0x2f5fb0);
        if (y >= P + 11) return gloss(0xe9e2d4);
        return gloss(y === P ? 0xd6cfc1 : 0xf4f1ea);
      });
      const S = P + 12; // soil level
      v.cylinder(0, S, 0, 6.8, 1, 0x4a3324);
      const LEAF = [0x2f7d32, 0x3f8f3a, 0x4fa043, 0x5fb24a];
      const leafCol = (t, wn, x, y, z) => {
        if (Math.abs(wn) < 0.15 && t < 0.85) return gloss(0x8cc860);
        if (hash(x, y, z, 3) < 0.22) return gloss(0xdde58a); // golden variegation
        return gloss(pick(LEAF, hash(x, y, z, 4)));
      };
      const heart = (t) => (t < 0.15 ? 0.6 + t * 2.6 : Math.sin(Math.PI * Math.min(1, 0.1 + 0.9 * t)) ** 0.7);
      // leafy mound
      for (let i = 0; i < 30; i++) {
        const a = i * 2.39996, rr = 0.8 + 6.2 * Math.sqrt(i / 30);
        const bx = Math.cos(a) * rr, bz = Math.sin(a) * rr, by = S + 2 + (1 - rr / 7) * 4 + (i % 3);
        v.line(Math.cos(a) * rr * 0.4, S, Math.sin(a) * rr * 0.4, bx, by, bz, 0x5c8f3a);
        flatLeaf(v, bx, by, bz, a + 0.3 * Math.sin(i), 0.65 - rr * 0.1, 4.5, 2.4, leafCol, { profile: heart, droop: 0.15 });
      }
      // trailing vines spilling over the stand
      for (let k = 0; k < 6; k++) {
        const a = k * 1.047 + 0.35, c = Math.cos(a), s = Math.sin(a);
        const e = 11 / Math.max(Math.abs(c), Math.abs(s));
        const len = [20, 12, 26, 15, 22, 10][k];
        const pts = [[c * 7.5, S, s * 7.5], [c * (e - 0.5), T + 2, s * (e - 0.5)], [c * (e + 1.2), T + 1, s * (e + 1.2)], [c * (e + 1.6), T + 1 - len, s * (e + 1.6)]];
        for (let i = 0; i < pts.length - 1; i++) v.line(...pts[i], ...pts[i + 1], 0x4f7f32);
        for (let i = 0; i < 3; i++) {
          const [p0, p1] = [pts[i], pts[i + 1]];
          const steps = Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) / 3);
          for (let j = 1; j <= steps; j++) {
            const t = j / steps, side = (j + i) % 2 ? 1 : -1;
            const x = p0[0] + (p1[0] - p0[0]) * t, y = p0[1] + (p1[1] - p0[1]) * t, z = p0[2] + (p1[2] - p0[2]) * t;
            flatLeaf(v, x, y, z, a + side * 1.2, i === 2 ? -0.9 : -0.3, 3, 1.6, leafCol, { profile: heart });
          }
        }
      }
    },
  },

  plant_monstera: {
    name: 'Monstera', jp: 'モンステラ', voxel: 0.02, footprint: [1, 1], themes: ['nature', 'home'], beauty: 6,
    build(v) {
      // glazed pot: deep teal with a pale drip glaze at the lip
      v.shape(-10, 0, -10, 10, 17, 10, (x, y, z) => Math.hypot(x, z) <= 6.5 + Math.sin(Math.PI * Math.min(1, y / 17)) * 2.6 + (y >= 16 ? 1 : 0) - (y === 0 ? 1 : 0), (x, y, z) => {
        const drip = 12 + Math.floor(hash(R(Math.atan2(z, x) * 6), 0, 0, 2) * 4);
        if (y >= 16) return gloss(0xcfe3dc);
        if (y >= drip) return gloss(mix(0x2f6f7a, 0xcfe3dc, 0.55));
        return gloss(y < 2 ? 0x1f4c55 : hash(x, y, z) > 0.8 ? 0x3a808a : 0x2f6f7a);
      });
      v.cylinder(0, 17, 0, 8, 1, 0x4a3324);
      v.paint(() => { for (const [x, z] of [[2, 3], [-3, -2], [4, -4], [-5, 3]]) v.set(x, 17, z, 0xb8b0a0); });
      // stems & big fenestrated leaves fanning out
      const leafCol = (t, wn, x, y, z) => {
        if (Math.abs(wn) < 0.09) return gloss(0x7ab85a);
        const ph = (t * 6 + Math.abs(wn) * 1.6) % 1;
        if (ph > 0.55 && ph < 0.66) return gloss(0x3e9446);
        if (Math.abs(wn) > 0.9) return gloss(0x24622b);
        return gloss(hash(x, y, z, 6) > 0.7 ? 0x358a3b : 0x2c7533);
      };
      const cut = (t, wn) => {
        const aw = Math.abs(wn), ph = (t * 6 + aw * 1.6) % 1;
        if (aw > 0.5 && t > 0.12 && t < 0.9 && ph < 0.17) return true; // splits from the edge
        if (aw > 0.24 && aw < 0.36 && t > 0.22 && t < 0.72 && ((t * 6 + 0.5) % 1) < 0.14) return true; // holes
        return t < 0.05 && aw < 0.25; // heart notch
      };
      const profile = (t) => Math.sin(Math.PI * Math.min(1, 0.22 + 0.78 * t)) ** 0.55;
      // [yaw, stem-top height, stem-top radius, length, half-width, pitch]
      const leaves = [
        [0.5, 40, 6, 16, 8, 0.45], [1.6, 50, 4, 16, 8, 0.55], [2.6, 38, 6, 15, 7.5, 0.4], [3.7, 47, 5, 16, 8, 0.5],
        [4.8, 36, 6, 14, 7, 0.35], [5.7, 52, 3, 15, 7.5, 0.7], [1.0, 30, 7, 13, 6.5, 0.25], [3.2, 56, 2, 13, 6.5, 0.9],
      ];
      for (const [a, h, r, L, Wd, p] of leaves) {
        const tx = Math.cos(a) * r, tz = Math.sin(a) * r;
        limbPath(v, [[Math.cos(a) * 1.2, 17, Math.sin(a) * 1.2], [Math.cos(a) * r * 0.4, h * 0.6 + 7, Math.sin(a) * r * 0.4], [tx, h, tz]], [0.9, 0.8, 0.7], 0x5c8f3a);
        flatLeaf(v, tx, h, tz, a, p, L, Wd, leafCol, { profile, cut, droop: 0.45, cup: 1.2 });
      }
      // one young, still-rolled leaf
      limb(v, [0, 17, 0], [-1, 58, 1], 0.8, 0.6, 0x6aa84a);
      v.ellipsoid(-1, 61, 1, 1, 3, 1, gloss(0x8fd06a));
    },
  },

  bonsai: {
    name: 'Pine Bonsai', jp: '松の盆栽', voxel: 0.0125, footprint: [0.5, 0.5], themes: ['nature', 'shrine'], beauty: 7,
    build(v) {
      const ROSE = 0x5a2e1e;
      // low rosewood display stand
      fill(v, -22, 9, -13, 22, 11, 13, (x, y, z) => gloss(woodGrain(ROSE, 'x')(x, y, z)));
      v.box(-20, 7, -11, 20, 8, 11, gloss(shade(ROSE, 0.85)));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        v.box(sx * 19, 1, sz * 10, sx * 21, 6, sz * 12, gloss(shade(ROSE, 0.9)));
        v.box(sx * 19, 0, sz * 10, sx * 22, 0, sz * 12, gloss(shade(ROSE, 0.8)));
      }
      // unglazed rectangular pot on little feet
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(sx * 12, 12, sz * 6, sx * 13, 12, sz * 7, 0x6a3f2e);
      fill(v, -15, 13, -9, 15, 18, 9, (x, y, z) => (hash(x, y, z) > 0.85 ? 0x8a5844 : 0x7a4a36));
      v.hollowBox(-16, 18, -10, 16, 18, 10, 0x6a3f2e, 1, ['top', 'bottom']);
      fill(v, -15, 18, -9, 15, 18, 9, (x, y, z) => pick(MOSS, hash(x, y, z, 2)));
      v.ellipsoid(9, 19, 4, 2.5, 1.5, 2, 0x8f8a82); v.ellipsoid(11, 19, 2, 1.5, 1, 1.5, 0x77736c);
      // twisting trunk with root flare
      const BARK = bark([0x6b5444, 0x7a6252, 0x5a463a, 0x8a7060], 1.5);
      v.ellipsoid(-6, 19.5, 0, 5, 1.5, 4, BARK);
      limbPath(v, [[-6, 18, 0], [-4, 26, 1], [-8, 34, 0], [-3, 42, -1], [2, 49, 0], [3, 55, 0]], [3.2, 2.8, 2.4, 1.9, 1.4, 1.0], BARK);
      // branches out to the foliage pads
      limb(v, [-7, 32, 0], [-15, 32, 2], 1.4, 0.8, BARK);
      limb(v, [-4, 40, -1], [9, 40, -1], 1.3, 0.7, BARK);
      limb(v, [0, 47, 0], [-9, 48, -3], 1.0, 0.6, BARK);
      limb(v, [1, 47, 0], [6, 47, 4], 0.9, 0.6, BARK);
      // a bleached jin (deadwood) tip
      v.line(-8, 34, 0, -11, 39, 1, 0xd8d2c4); v.set(-12, 40, 1, 0xe8e4da);
      pinePad(v, -17, 33.5, 2, 7, 2.4, 5.5, 1);
      pinePad(v, 11, 41.5, -1, 8, 2.6, 6, 2);
      pinePad(v, -10, 49, -3, 6, 2.2, 4.5, 3);
      pinePad(v, 7, 48.5, 4, 4.5, 2, 3.5, 4);
      pinePad(v, 3, 57, 0, 7.5, 3, 5.5, 5);
    },
  },

  bamboo: {
    name: 'Bamboo Planter', jp: '竹の植え込み', voxel: 0.035, footprint: [1, 0.5], themes: ['nature', 'shrine'], beauty: 5,
    build(v) {
      // slatted cedar planter on feet with white pebbles
      const BOX = 0x8a5a36;
      fill(v, -11, 1, -6, 11, 9, 6, (x, y, z) => ((Math.abs(x) + Math.abs(z)) % 3 === 0 ? shade(BOX, 0.85) : woodGrain(BOX, 'y')(x, y, z)));
      v.hollowBox(-12, 9, -7, 12, 9, 7, shade(BOX, 0.7), 1, ['top', 'bottom']);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(sx * 10, 0, sz * 5, sx * 11, 0, sz * 6, shade(BOX, 0.6));
      fill(v, -11, 9, -6, 11, 9, 6, (x, y, z) => (hash(x, y, z, 4) > 0.45 ? (hash(z, x, y) > 0.5 ? 0xeeeae2 : 0xd8d3c8) : 0x4a3324));
      // culms
      const culms = [[-6, -2, 70, -2], [-2, 2, 66, 1], [2, -3, 73, 2], [6, 1, 62, 3], [0, -1, 58, -1], [-4, 4, 50, -3], [4, 4, 45, 2]];
      const greens = [0x6d9e3a, 0x7fae46, 0x8bb04e, 0x5f9234];
      const LEAVES = [0x4a8530, 0x5a9a3a, 0x6fb24a, 0x88c25a];
      culms.forEach(([x0, z0, h, lean], ci) => {
        const base = greens[ci % greens.length];
        const nodeOff = ci * 3;
        for (let y = 10; y <= h; y++) {
          const t = (y - 10) / (h - 10), cx = x0 + lean * t * t, thin = y > h - 6;
          const node = (y + nodeOff) % 8 === 0;
          const c = node ? 0xd8d6a0 : (y + nodeOff) % 8 === 1 ? shade(base, 0.8) : base;
          const xs = thin ? [R(cx)] : [Math.floor(cx), Math.floor(cx) + 1];
          for (const x of xs) for (const z of (thin ? [z0] : [z0, z0 + 1])) v.set(x, y, z, x === xs[0] && !node ? shade(c, 1.1) : c);
        }
        // leafy sprigs on the upper nodes
        for (let y = 22; y <= h; y++) {
          if ((y + nodeOff) % 8 !== 0) continue;
          const t = (y - 10) / (h - 10), cx = x0 + lean * t * t;
          for (let k = 0; k < 3; k++) {
            const a = (hash(ci, y, k, 8) + k / 3) * TAU, dx = Math.cos(a), dz = Math.sin(a);
            const sx = cx + dx * 3, sz = z0 + dz * 3;
            v.line(cx, y, z0, sx, y + 2, sz, 0x9aa850);
            for (let l = 0; l < 5; l++) {
              const la = a + (l - 2) * 0.6, len = 4 + (l % 2) + (y > h - 20 ? 1 : 0);
              const lc = pick(LEAVES, hash(ci, y, l + k * 5, 9));
              for (let i = 0; i <= len; i++) v.set(sx + Math.cos(la) * i * 0.9, y + 2 - i * 0.45 + (i === 1 ? 0.4 : 0), sz + Math.sin(la) * i * 0.9, i === 0 ? 0x9aa850 : lc);
            }
          }
        }
        // crown tuft
        const tx = x0 + lean;
        for (let l = 0; l < 5; l++) {
          const la = l * 1.257 + ci, lc = pick(LEAVES, hash(ci, l, 3, 9));
          for (let i = 1; i <= 4; i++) v.set(tx + Math.cos(la) * i, h + 1 - i * 0.5, z0 + Math.sin(la) * i, lc);
        }
        v.set(tx, h + 1, z0, LEAVES[2]);
      });
    },
  },

  sakura_tree: {
    name: 'Sakura Tree', jp: '桜の木', voxel: 0.04, footprint: [2, 2], themes: ['nature', 'shrine', 'cute'], beauty: 10,
    build(v) {
      const BARK = bark([0x4a3a36, 0x5a4842, 0x3e302d, 0x66524a], 2);
      // fallen petals on the ground
      v.shape(-23, 0, -23, 23, 0, 23, (x, y, z) => Math.hypot(x, z) < 22 && hash(x, 0, z, 1) < 0.2 * (1 - Math.hypot(x, z) / 26), (x, y, z) => (hash(z, x, 0) > 0.5 ? C.sakura : 0xffe3ec));
      // root flare + trunk + main limbs
      for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.4; limb(v, [Math.cos(a) * 5, 0, Math.sin(a) * 5], [0, 5, 0], 1.6, 2.6, BARK); }
      limbPath(v, [[0, 0, 0], [-1, 12, 1], [1, 24, 0]], [3.6, 3.1, 2.7], BARK);
      const limbs = [[[1, 24, 0], [-8, 33, 2], [-15, 42, 4]], [[1, 24, 0], [8, 34, -1], [14, 43, -3]], [[1, 24, 0], [2, 36, 5], [3, 48, 8]],
        [[1, 24, 0], [-3, 36, -5], [-5, 46, -10]], [[1, 23, 0], [3, 40, -1], [5, 54, -1]]];
      for (const pts of limbs) limbPath(v, pts, [2.3, 1.6, 0.9], BARK);
      limb(v, [-8, 33, 2], [-18, 36, -3], 1.1, 0.6, BARK);
      limb(v, [8, 34, -1], [17, 37, 4], 1.1, 0.6, BARK);
      // billowing blossom canopy
      const balls = [[-15, 46, 4, 10, 7, 9, 5], [14, 47, -3, 10, 7, 9, 5], [3, 53, 8, 10, 8, 9, 5], [-5, 51, -10, 10, 7, 9, 5],
        [5, 59, -1, 11, 9, 10, 6], [-6, 58, 3, 9, 8, 8, 6], [0, 49, 0, 13, 6, 13, 4], [-18, 40, -4, 6, 5, 6, 4], [17, 41, 4, 6, 5, 6, 4], [-2, 66, 0, 7, 5, 7, 5]];
      blob(v, balls, (x, y, z) => {
        const n = hash(x, y, z, 11), t = (y - 38) / 32;
        if (n < 0.06) return 0xfff6f8;
        if (n > 0.95) return C.sakuraDeep;
        if (t < 0.2) return n > 0.5 ? 0xe89ab4 : 0xf2aec4;
        if (t > 0.7) return n > 0.4 ? 0xffe0ea : 0xffd2df;
        return n > 0.55 ? C.sakura : n > 0.25 ? 0xffcfdc : 0xffb3c8;
      }, { noise: 0.32, scale: 2.6, seed: 4 });
      clipFloor(v);
    },
  },

  momiji_tree: {
    name: 'Japanese Maple', jp: 'もみじ', voxel: 0.035, footprint: [1.5, 1.5], themes: ['nature', 'shrine'], beauty: 9,
    build(v) {
      const BARK = bark([0x5e5048, 0x6e5e54, 0x4e423c, 0x7a6a5e], 1.5);
      // fallen leaves
      v.shape(-20, 0, -20, 20, 0, 20, (x, y, z) => Math.hypot(x, z) < 19 && hash(x, 0, z, 2) < 0.22 * (1 - Math.hypot(x, z) / 23), (x, y, z) => pick([0xd8342c, 0xf07a2a, 0xf5a83a, 0xb8202a], hash(z, 0, x, 3)));
      // slender multi-stem trunk fanning upward
      for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.7; limb(v, [Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5], [0, 3, 0], 1.0, 1.8, BARK); }
      limbPath(v, [[0, 0, 0], [1, 10, 0], [0, 16, 0]], [2.4, 2.1, 1.9], BARK);
      const stems = [[[0, 16, 0], [-7, 28, 2], [-14, 38, 3], [-18, 44, 1]], [[0, 16, 0], [6, 27, -2], [13, 37, -3], [17, 42, -1]],
        [[0, 16, 0], [2, 30, 5], [3, 44, 8], [2, 54, 6]], [[0, 16, 0], [-2, 32, -4], [-4, 46, -7], [-2, 58, -4]], [[1, 18, 0], [4, 34, 0], [5, 50, -1], [3, 64, 0]]];
      for (const pts of stems) limbPath(v, pts, [1.6, 1.2, 0.8, 0.5], BARK);
      // layered, airy canopy tiers
      const tiers = [
        [-15, 41, 2, 8, 3.5, 7], [14, 40, -2, 8, 3.5, 7], [0, 38, 0, 10, 3, 10],
        [-8, 48, 6, 8, 3.5, 6], [8, 50, -5, 8, 3.5, 6], [3, 48, 9, 6, 3, 5], [-6, 49, -8, 7, 3, 5],
        [-3, 57, 4, 8, 3.5, 6], [5, 58, -3, 8, 3.5, 6], [1, 65, 0, 7, 4, 6],
      ];
      blob(v, tiers.map(([x, y, z, rx, ry, rz]) => [x, y, z, rx, ry, rz, ry * 0.7]), (x, y, z) => {
        const n = hash(x, y, z, 12), t = (y - 36) / 32;
        if (n < 0.05) return 0xffd04a;
        if (t > 0.6) return n > 0.5 ? 0xd8342c : n > 0.2 ? 0xe84a30 : 0xb8202a;
        if (t > 0.3) return n > 0.6 ? 0xf07a2a : n > 0.25 ? 0xe0502c : 0xc8302a;
        return n > 0.5 ? 0xf5a83a : n > 0.2 ? 0xf07a2a : 0xd86a28;
      }, { noise: 0.38, scale: 2.2, seed: 8 });
      clipFloor(v);
    },
  },

  pine_tree: {
    name: 'Black Pine', jp: '黒松', voxel: 0.035, footprint: [1.5, 1.5], themes: ['nature', 'shrine'], beauty: 8,
    build(v) {
      const BARK = bark([0x5a4a42, 0x6e5a4c, 0x4a3c36, 0x7a6252], 2);
      // mossy mound at the base
      blob(v, [[0, 0, 0, 9, 2.5, 8]], (x, y, z) => pick(MOSS, hash(x, y, z, 5)), { noise: 0.25, minY: 0, seed: 2 });
      // sweeping S-curve trunk
      limbPath(v, [[0, 0, 0], [3, 12, 1], [-2, 24, 0], [-6, 34, -1], [-3, 44, 0], [2, 54, 1], [1, 62, 0]], [3.6, 3.1, 2.7, 2.3, 1.9, 1.5, 1.1], BARK);
      // horizontal limbs
      limb(v, [-1, 22, 0], [-17, 24, 3], 1.6, 0.8, BARK);
      limb(v, [1, 28, 0], [15, 30, -2], 1.5, 0.8, BARK);
      limb(v, [-5, 36, 0], [-14, 40, -4], 1.3, 0.7, BARK);
      limb(v, [-3, 44, 0], [10, 46, 3], 1.2, 0.7, BARK);
      limb(v, [-4, 36, 0], [0, 37, 9], 1.0, 0.6, BARK);
      limb(v, [1, 50, 0], [2, 50, -8], 0.9, 0.6, BARK);
      // cloud-pruned needle pads
      pinePad(v, -19, 26, 3, 9.5, 3.2, 7, 11);
      pinePad(v, 17, 32, -2, 9.5, 3.2, 7, 12);
      pinePad(v, -15, 42, -4, 8.5, 3, 6, 13);
      pinePad(v, 12, 48, 3, 8.5, 3, 6, 14);
      pinePad(v, 0, 39, 10, 7, 2.6, 4.5, 15);
      pinePad(v, 2, 52, -9, 7, 2.6, 4.5, 16);
      pinePad(v, 0, 58, 0, 10, 3.4, 8, 17);
      pinePad(v, 1, 64, 0, 8, 4, 6.5, 18);
      clipFloor(v);
    },
  },

  rock_moss: {
    name: 'Mossy Rocks', jp: '苔むした岩', voxel: 0.02, footprint: [1, 1], themes: ['nature', 'shrine'], beauty: 4,
    build(v) {
      const S = stoneFn(0x8f8b84, 3);
      blob(v, [[-6, 5, -1, 13, 12, 10, 12], [-10, 4, 3, 7, 9, 7]], S, { noise: 0.22, scale: 4, seed: 1, minY: 0 });
      blob(v, [[11, 3, 4, 8, 8, 7]], stoneFn(0x9a968f, 5), { noise: 0.25, scale: 3, seed: 2, minY: 0 });
      blob(v, [[17, 1, -5, 4, 4, 4]], stoneFn(0x7f7b74, 6), { noise: 0.25, scale: 2, seed: 3, minY: 0 });
      blob(v, [[-19, 1, 8, 3, 3, 3]], stoneFn(0x8a867f, 7), { noise: 0.25, scale: 2, seed: 4, minY: 0 });
      // moss blanketing the tops and creeping down
      paintTops(v, (x, y, z) => y > 2 && vnoise(x, y, z, 4, 9) > 0.47, (x, y, z) => pick(MOSS, hash(x, y, z, 10)));
      v.paint(() => v.shape(-22, 0, -14, 22, 18, 14, (x, y, z) => vnoise(x, y, z, 3, 12) > 0.68 && hash(x, y, z) > 0.4, (x, y, z) => pick(MOSS, hash(z, y, x, 1))));
      // tiny ferns and moss cushions at the foot
      fern(v, 3, 0, 10, 0.6, 5, 5); fern(v, -15, 0, -9, 3.8, 4, 4); fern(v, 21, 0, 4, 0.2, 4, 4);
      v.shape(-22, 0, -14, 22, 0, 14, (x, y, z) => !v.has(x, 0, z) && hash(x, 0, z, 13) < 0.12 && Math.hypot(x / 22, z / 13) < 1, (x, y, z) => pick(MOSS, hash(x, 1, z)));
    },
  },

  rock_zen: {
    name: 'Zen Stone', jp: '枯山水の石', voxel: 0.02, footprint: [1, 1], themes: ['nature', 'shrine'], beauty: 5,
    build(v) {
      const cx = -3, cz = -2;
      // dark stone border and raked gravel
      v.hollowBox(-20, 0, -20, 20, 2, 20, 0x4f4c49, 1, ['top']);
      v.paint(() => v.shape(-20, 2, -20, 20, 2, 20, (x, y, z) => (x + z) % 2 === 0, 0x5c5955));
      v.shape(-19, 0, -19, 19, 2, 19, (x, y, z) => {
        if (y < 2) return true;
        const d = Math.hypot(x - cx, z - cz);
        if (d < 13) return Math.floor(d / 1.5) % 2 === 0;
        return ((z % 3) + 3) % 3 === 0;
      }, (x, y, z) => (y === 2 ? (hash(x, y, z) > 0.5 ? 0xf2efe8 : 0xe6e2da) : hash(x, y, z) > 0.5 ? 0xc9c4ba : 0xd5d1c8));
      // tall standing stone, slightly leaning, with a quartz vein
      const ST = (x, y, z) => {
        const vein = Math.abs((x - cx) * 0.6 + y * 0.35 - 14) < 0.8;
        if (vein) return 0xd8d6d0;
        return pick([0x55585e, 0x5f6268, 0x6e7177, 0x7c7f84], vnoise(x, y, z, 3, 4) * 0.7 + hash(x, y, z) * 0.3);
      };
      v.shape(cx - 9, 2, cz - 8, cx + 10, 48, cz + 8, (x, y, z) => {
        const t = (y - 2) / 46, ox = cx + t * t * 3, rx = 6.2 - t * 1.6 + Math.sin(y * 0.4) * 0.5, rz = 4.8 - t * 1.2;
        const top = 1 - Math.max(0, (t - 0.82) / 0.18) ** 2;
        const q = ((x - ox) / (rx * Math.sqrt(Math.max(0, top)))) ** 2 + ((z - cz) / (rz * Math.sqrt(Math.max(0, top)))) ** 2;
        return q <= 1 + (vnoise(x, y, z, 2.5, 6) - 0.5) * 0.7;
      }, ST);
      // little companion stone & moss collar
      blob(v, [[9, 3, 7, 4.5, 2.5, 3.5]], stoneFn(0x6a6d72, 3), { noise: 0.25, minY: 2, seed: 7 });
      v.shape(cx - 10, 3, cz - 9, cx + 11, 4, cz + 9, (x, y, z) => {
        const d = Math.hypot((x - cx) / 7.5, (z - cz) / 6);
        return d < 1.05 && !v.has(x, y, z) && hash(x, y, z, 3) < (y === 3 ? 0.7 : 0.25);
      }, (x, y, z) => pick(MOSS, hash(x, y, z, 4)));
    },
  },

  flower_bed: {
    name: 'Hydrangea Planter', jp: '紫陽花の花壇', voxel: 0.02, footprint: [1, 0.5], themes: ['nature', 'cute'], beauty: 6,
    build(v) {
      const PL = 0x9a6a40;
      fill(v, -24, 0, -10, 24, 9, 10, (x, y, z) => (Math.floor(y / 3) % 2 ? woodGrain(PL, 'x')(x, y, z) : woodGrain(shade(PL, 0.9), 'x')(x, y, z)));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(sx * 24, 0, sz * 10, sx * 25, 10, sz * 11, shade(PL, 0.7));
      v.hollowBox(-25, 10, -11, 25, 10, 11, shade(PL, 0.8), 1, ['top', 'bottom']);
      fill(v, -24, 10, -10, 24, 10, 10, (x, y, z) => (hash(x, y, z) > 0.5 ? 0x4a3324 : 0x5a3e2a));
      // big serrated leaves
      const LG = [0x2f6e30, 0x3b7f36, 0x4a9040, 0x2a5f2a];
      for (let i = 0; i < 26; i++) {
        const x = -21 + (i * 17) % 43, z = -8 + (i * 7) % 17, a = hash(i, 1, 2) * TAU;
        flatLeaf(v, x, 11, z, a, 0.5, 6, 2.6, (t, wn, xx, yy, zz) => (Math.abs(wn) < 0.15 ? 0x6aa84a : pick(LG, hash(xx, yy, zz, 5))), { droop: 0.25 });
      }
      // mophead flower balls in blues & purples
      const heads = [[-18, 17, 2, 5, 0x6f9de8], [-9, 19, -4, 5.5, 0xa07ad8], [-1, 18, 4, 5, 0x8a9cf0], [8, 20, -3, 5.5, 0x6f9de8], [17, 17, 3, 5, 0xc0a0f0],
        [-13, 15, 6, 3.5, 0x8a9cf0], [12, 15, 6, 3.5, 0xa07ad8], [3, 22, -6, 4, 0xc890e0], [21, 15, -5, 3.5, 0x8a9cf0], [-22, 14, -5, 3.5, 0xc0a0f0]];
      heads.forEach(([x, y, z, r, c], i) => {
        limb(v, [x, 10, z], [x, y - r + 1, z], 0.6, 0.6, 0x4a7a30);
        blob(v, [[x, y, z, r, r * 0.9, r]], (xx, yy, zz) => {
          const n = hash(xx, yy, zz, 30 + i);
          if (n < 0.08) return 0xfaf6ff;
          if (n < 0.35) return mix(c, 0xffffff, 0.35);
          if (n > 0.85) return shade(c, 0.78);
          return yy < y - r * 0.4 ? shade(c, 0.88) : c;
        }, { noise: 0.22, scale: 1.4, seed: 20 + i });
      });
    },
  },

  stone_lantern: {
    name: 'Stone Lantern', jp: '石灯籠', voxel: 0.025, footprint: [0.5, 0.5], themes: ['shrine', 'nature'], beauty: 6, light: 0xffc070,
    build(v) {
      const S = stoneFn(0xa8a39a, 1), SD = stoneFn(0x8e8981, 2);
      const hexSlab = (y0, y1, r, c) => v.shape(-R(r) - 1, y0, -R(r) - 1, R(r) + 1, y1, R(r) + 1, (x, y, z) => hexIn(x, z, r), c);
      hexSlab(0, 2, 9, SD); // kiso
      hexSlab(3, 4, 7, S);
      v.paint(() => { for (let i = 0; i < 12; i++) { const a = i * TAU / 12; v.set(Math.cos(a) * 7, 4, Math.sin(a) * 6, shade(0xa8a39a, 0.82)); } });
      v.cylinder(0, 5, 0, 2.6, 21, S); // sao post
      v.cylinder(0, 14, 0, 3.2, 2, SD);
      v.cylinder(0, 25, 0, 3.2, 1, SD);
      hexSlab(26, 28, 7.5, S); // chūdai
      v.paint(() => { for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + 0.26; v.set(Math.cos(a) * 7, 26, Math.sin(a) * 6, shade(0xa8a39a, 0.8)); } });
      // fire box with glowing windows
      hexSlab(29, 37, 5.5, S);
      v.box(-2, 31, -5, 2, 35, 5, glow(0xffc070));
      v.box(-5, 32, -1, 5, 34, 1, glow(0xffb050));
      v.box(-1, 32, -1, 1, 34, 1, glow(0xffe0a0));
      v.project(['.KKK.', '.....', 'K.K.K'], { K: shade(0xa8a39a, 0.7) }, -2, 37, '+z');
      // roof with upturned corners
      for (let k = 0; k <= 5; k++) hexSlab(38 + k, 38 + k, 11.5 - k * 1.7, k === 0 ? SD : S);
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; v.set(Math.cos(a) * 11.6, 39, Math.sin(a) * 10, 0x8e8981); v.set(Math.cos(a) * 12.2, 40, Math.sin(a) * 10.6, 0x8e8981); }
      // hōju finial
      v.cylinder(0, 44, 0, 2.6, 2, SD);
      v.sphere(0, 48, 0, 2.6, S);
      v.set(0, 51, 0, 0x9a958c); v.set(0, 52, 0, 0x8e8981);
      // moss on the roof and base
      paintTops(v, (x, y, z) => (y >= 38 && y <= 43 || y <= 4 || y === 28) && vnoise(x, y, z, 3, 3) > 0.48, (x, y, z) => pick(MOSS, hash(x, y, z)));
    },
  },

  torii: {
    name: 'Torii Gate', jp: '鳥居', voxel: 0.04, footprint: [2, 0.5], themes: ['shrine'], beauty: 8,
    build(v) {
      const V = gloss(0xe2452e), VD = gloss(0xc8382a), BK = gloss(C.lacquerBlack);
      for (const s of [-1, 1]) {
        v.cylinder(s * 17, 0, 0, 1.9, 50, V); // hashira
        v.cylinder(s * 17, 0, 0, 2.4, 5, BK); // kamaki
        v.cylinder(s * 17, 47, 0, 2.2, 2, BK); // daiwa ring
      }
      v.paint(() => { for (const s of [-1, 1]) v.cylinder(s * 17 - 1, 5, 1, 0.8, 42, gloss(0xf06a48)); }); // highlight streak
      v.box(-22, 40, -1, 22, 42, 1, V); // nuki
      v.box(-22, 40, -1, -22, 42, 1, VD); v.box(22, 40, -1, 22, 42, 1, VD);
      v.box(-1, 43, -1, 1, 49, 1, V); // gakuzuka
      // plaque
      v.box(-3, 43, 2, 3, 49, 2, BK);
      v.project(['GGGGGGG', 'G.GG..G', 'G..G.GG', 'G.GGG.G', 'G.G..GG', 'G..GG.G', 'GGGGGGG'], { G: gloss(C.gold) }, -3, 49, '+z');
      v.box(-23, 50, -1, 23, 52, 1, V); // shimaki
      // kasagi with upturned ends
      for (let x = -26; x <= 26; x++) {
        const ax = Math.abs(x), lift = ax >= 25 ? 2 : ax >= 22 ? 1 : 0;
        v.box(x, 53 + lift, -2, x, 55 + lift, 2, ax >= 25 ? BK : x % 2 ? BK : gloss(0x2c2020));
      }
      v.box(-26, 53, -2, -26, 54, 2, BK); v.box(26, 53, -2, 26, 54, 2, BK);
      v.box(-25, 53, -2, 25, 53, 2, V);
    },
  },

  chochin_stand: {
    name: 'Chōchin Lantern Stand', jp: '提灯スタンド', voxel: 0.025, footprint: [1, 0.5], themes: ['shrine', 'retro'], beauty: 6, light: 0xff7040,
    build(v) {
      const WD = 0x5a3a24;
      for (const s of [-1, 1]) {
        fill(v, s * 17, 0, -1, s * 18, 70, 0, woodGrain(WD, 'y'));
        v.box(s * 16, 0, -7, s * 19, 2, 6, shade(WD, 0.8)); // feet
        v.box(s * 17, 3, -4, s * 18, 3, 3, shade(WD, 0.9));
        v.line(s * 17.5, 3, -4, s * 17.5, 9, -1, shade(WD, 0.9)); v.line(s * 17.5, 3, 3, s * 17.5, 9, 0, shade(WD, 0.9)); // braces
      }
      fill(v, -19, 69, -1, 19, 70, 0, woodGrain(WD, 'x'));
      v.box(-21, 71, -2, 21, 72, 1, 0x3a2418);
      v.box(-20, 73, -1, 20, 73, 0, 0x2a1810);
      fill(v, -17, 38, -1, 17, 39, 0, woodGrain(WD, 'x'));
      // four glowing paper lanterns
      const lantern = (cx, top) => {
        v.box(cx, top - 1, -1, cx, top, -1, C.black); // cord
        v.cylinder(cx, top - 3, -1, 3, 2, gloss(C.lacquerBlack));
        const cy = top - 10.5;
        v.ellipsoid(cx, cy, -1, 5.5, 7.4, 5.5, (x, y) => glow((y + 1) % 3 === 0 ? 0xd8402a : 0xff5a34));
        v.cylinder(cx, top - 20, -1, 3, 2, gloss(C.lacquerBlack));
        v.project(['.K.KK', 'KKKK.', '.K.K.', 'K.KKK', '.KK.K', 'K.K.K'], { K: C.ink }, cx - 2, R(cy) + 3, '+z');
        v.set(cx, top - 21, -1, gloss(0xf2c14e)); v.set(cx, top - 22, -1, C.vermilion); v.set(cx, top - 23, -1, C.vermilion);
      };
      lantern(-8, 68); lantern(8, 68); lantern(-8, 37); lantern(8, 37);
    },
  },

  andon_lamp: {
    name: 'Andon Floor Lamp', jp: '行灯', voxel: 0.015, footprint: [0.5, 0.5], themes: ['shrine', 'home'], beauty: 5, light: 0xffd090,
    build(v) {
      const WD = 0x4a2e1e, PAPER = glow(0xffe2a8), PAPER2 = glow(0xffd590);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) fill(v, sx * 12, 0, sz * 12, sx * 13, 55, sz * 13, woodGrain(WD, 'y'));
      // paper walls (lit from within)
      v.hollowBox(-12, 6, -12, 12, 51, 12, PAPER, 1, ['top', 'bottom']);
      v.paint(() => v.box(-11, 6, -11, 11, 9, 11, PAPER2));
      fill(v, -12, 4, -12, 12, 5, 12, woodGrain(WD, 'x'));
      // kumiko lattice (raised, flush with the posts)
      for (const y of [6, 21, 36, 51]) {
        v.box(-11, y, 13, 11, y, 13, WD); v.box(-11, y, -13, 11, y, -13, WD);
        v.box(13, y, -11, 13, y, 11, WD); v.box(-13, y, -11, -13, y, 11, WD);
      }
      v.box(0, 7, 13, 0, 50, 13, WD); v.box(0, 7, -13, 0, 50, -13, WD);
      v.box(13, 7, 0, 13, 50, 0, WD); v.box(-13, 7, 0, -13, 50, 0, WD);
      // top frame and carrying handle
      v.hollowBox(-13, 52, -13, 13, 54, 13, shade(WD, 0.85), 3, ['top', 'bottom']);
      for (const s of [-1, 1]) v.box(s * 10, 55, -1, s * 11, 59, 0, WD);
      v.box(-11, 60, -1, 11, 61, 0, shade(WD, 1.1));
      // oil dish & flame inside
      v.cylinder(0, 6, 0, 2.5, 1, 0x8a8078);
      v.box(0, 7, 0, 0, 8, 0, 0xfbf8f2);
      v.set(0, 9, 0, glow(0xffc040)); v.set(0, 10, 0, glow(0xfff0a0));
    },
  },

  wagasa_parasol: {
    name: 'Nodate Parasol & Bench', jp: '野点傘', voxel: 0.035, footprint: [1.5, 1.5], themes: ['shrine', 'retro'], beauty: 7,
    build(v) {
      const WD = 0x7a4e2b;
      // bench with red felt (hi-mōsen)
      fill(v, -15, 11, -2, 15, 12, 8, woodGrain(WD, 'x'));
      for (const sx of [-1, 1]) for (const z of [-1, 7]) v.box(sx * 13, 0, z, sx * 14, 10, z, shade(WD, 0.85));
      v.box(-13, 4, -1, 13, 4, -1, shade(WD, 0.8)); v.box(-13, 4, 7, 13, 4, 7, shade(WD, 0.8));
      const FELT = (x, y, z) => (hash(x, y, z) > 0.8 ? 0xb82424 : 0xd03030);
      fill(v, -15, 13, -3, 15, 13, 9, FELT);
      fill(v, -15, 8, 9, 15, 12, 9, FELT); fill(v, -15, 9, -3, 15, 12, -3, FELT);
      v.paint(() => { v.box(-15, 8, 9, 15, 8, 9, 0xa81e1e); });
      // tea set: black tray, matcha bowl and dango
      v.box(3, 14, 1, 10, 14, 6, gloss(C.lacquerBlack));
      v.cylinder(5, 15, 3, 1.6, 2, gloss(0x3a2a24)); v.cylinder(5, 16, 3, 1, 1, 0x7fae3a);
      v.box(7, 15, 3, 10, 15, 3, 0xd8c08a);
      v.set(8, 15, 4, 0xffb7c8); v.set(9, 15, 4, 0xfbf8f2); v.set(10, 15, 4, 0x8fc060);
      v.set(8, 16, 4, 0xffb7c8); v.set(9, 16, 4, 0xfbf8f2); v.set(10, 16, 4, 0x8fc060);
      // parasol: weighted stand, bamboo pole
      const PX = -1, PZ = -6;
      v.box(PX - 3, 0, PZ, PX + 4, 1, PZ + 1, shade(WD, 0.7)); v.box(PX, 0, PZ - 3, PX + 1, 1, PZ + 4, shade(WD, 0.7));
      for (let y = 2; y <= 58; y++) {
        const c = y % 9 === 0 ? 0xb8a860 : 0xd8c88a;
        v.box(PX, y, PZ, PX + 1, y, PZ + 1, c);
      }
      // canopy: red shell with ribs, janome ring and a gold finial
      const cx = PX + 0.5, cz = PZ + 0.5, RAD = 23;
      v.shape(cx - RAD - 1, 48, cz - RAD - 1, cx + RAD + 1, 59, cz + RAD + 1, (x, y, z) => {
        const d = Math.hypot(x - cx, z - cz);
        if (d > RAD) return false;
        const top = 50 + (RAD - d) * 0.36;
        return y <= Math.round(top) && y >= Math.round(top) - 1;
      }, (x, y, z) => {
        const d = Math.hypot(x - cx, z - cz), ang = (Math.atan2(z - cz, x - cx) / TAU + 1) * 24;
        const top = y === Math.round(50 + (RAD - d) * 0.36);
        const rib = (ang % 1) < 0.16;
        if (!top) return rib ? 0xe8c890 : 0xc02a2a;
        if (d > RAD - 1.3) return 0x9e1e1e;
        if (d < 2.2) return C.lacquerBlack;
        if (d > 5 && d < 6.6) return 0xfbf8f2;
        return rib ? 0xb82424 : hash(x, y, z) > 0.85 ? 0xe03a34 : 0xd62e2e;
      });
      v.box(PX, 59, PZ, PX + 1, 60, PZ + 1, gloss(0xf2c14e));
      // bamboo spokes under the canopy
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12;
        v.line(cx, 44, cz, cx + Math.cos(a) * 13, 52, cz + Math.sin(a) * 13, 0xd8c88a);
      }
      v.box(PX - 1, 43, PZ - 1, PX + 2, 44, PZ + 2, 0xb8a860);
    },
  },

  bamboo_fence: {
    name: 'Bamboo Fence', jp: '竹垣', voxel: 0.02, footprint: [1, 0.5], themes: ['nature', 'shrine'], beauty: 3,
    build(v) {
      const BAM = [0xc9c06a, 0xb8ae5c, 0xa8b058, 0xd4c878, 0xbfa868, 0xb4b866];
      // thick bamboo end posts
      for (const s of [-1, 1]) {
        v.cylinder(s * 23, 0, 0, 2.3, 60, (x, y) => ((y + 3) % 12 === 0 ? 0x9a9248 : y % 12 === 1 ? 0xd8d090 : 0xb8b064));
        v.cylinder(s * 23, 60, 0, 1.5, 1, 0x8a8240);
      }
      // bottom sill + vertical split-bamboo slats
      v.box(-21, 0, -2, 21, 1, 1, 0x6a5038);
      for (let x = -21; x <= 21; x++) {
        const slat = Math.floor((x + 21) / 2), base = BAM[Math.floor(hash(slat, 1, 1) * BAM.length)], off = (slat * 5) % 11;
        for (let y = 2; y <= 56; y++) v.set(x, y, -1, (y + off) % 11 === 0 ? shade(base, 0.78) : x % 2 ? shade(base, 0.92) : base);
        for (let y = 2; y <= 56; y++) v.set(x, y, 0, (y + off) % 11 === 0 ? shade(base, 0.78) : base);
      }
      // horizontal split-bamboo rails front & back, bound with black shuro rope
      const RAIL = (x) => ((x + 40) % 13 === 0 ? 0x6e6232 : (x + 40) % 13 === 1 ? 0xa89a5a : 0x8a7c44);
      for (const y of [12, 30, 47]) {
        v.cylinder(-22, y, 1.5, 1, 45, RAIL, 'x');
        v.cylinder(-22, y, -2.5, 1, 45, RAIL, 'x');
        v.paint(() => { for (let x = -18; x <= 18; x += 6) v.box(x, y - 1, -4, x, y + 1, 3, C.charcoal); });
      }
      // capping rail (tamabuchi)
      v.cylinder(-22, 58, -0.5, 1.6, 45, RAIL, 'x');
      v.paint(() => { for (let x = -18; x <= 18; x += 6) v.box(x, 56, -3, x, 60, 2, C.charcoal); });
    },
  },

  koi_pond: {
    name: 'Koi Pond', jp: '鯉の池', voxel: 0.04, footprint: [2, 2], themes: ['nature', 'shrine', 'ocean'], beauty: 9,
    build(v) {
      const rad = (a) => 16 + 2.6 * Math.sin(2 * a + 0.5) + 1.6 * Math.sin(3 * a + 1.3);
      const inPond = (x, z) => Math.hypot(x, z) < rad(Math.atan2(z, x));
      // raised mossy bank around a sunken basin
      v.shape(-25, 0, -25, 25, 4, 25, (x, y, z) => {
        const d = Math.hypot(x, z) - rad(Math.atan2(z, x));
        if (d < 0) return y <= 1;
        return d < 6.5 && y <= (d > 5 ? 3 : 4);
      }, (x, y, z) => {
        if (inPond(x, z)) return y === 1 ? (hash(x, 1, z) > 0.75 ? 0x6a6a60 : 0x2e4a3a) : 0x24382c;
        return y < 3 ? 0x5a4632 : pick(MOSS, hash(x, y, z, 3));
      });
      // water
      v.shape(-25, 2, -25, 25, 5, 25, (x, y, z) => inPond(x, z), (x, y) => glass(y === 5 ? 0x7ac8e0 : 0x3a98c0));
      // koi swimming just below the surface
      const koi = (x0, z0, a, cols) => {
        const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
        const W = [0.6, 1.1, 1.3, 1.2, 1.0, 0.7, 0.4];
        for (let i = 0; i < 7; i++) {
          const bend = Math.sin(i * 0.6) * 0.8;
          for (let w = -W[i]; w <= W[i] + 0.01; w += 0.5) {
            const x = x0 + dx * i + px * (w + bend), z = z0 + dz * i + pz * (w + bend);
            v.set(x, 3, z, cols(i, w));
            if (i >= 1 && i <= 4 && Math.abs(w) < 0.8) v.set(x, 4, z, cols(i, w + 7));
          }
        }
        for (const w of [-1.5, -0.5, 0.5, 1.5]) v.set(x0 + dx * 7.6 + px * (w + 0.5), 4, z0 + dz * 7.6 + pz * (w + 0.5), cols(7, w));
      };
      const kohaku = (i, w) => ((i === 1 || i === 2 || i === 4) && w > -0.6 ? 0xe23a2a : 0xfbf8f2);
      const showa = (i, w) => (i === 0 ? 0xfbf8f2 : (i + R(w)) % 3 === 0 ? 0x1a1819 : (i % 2 ? 0xe23a2a : 0xfbf8f2));
      koi(-8, 2, 0.4, kohaku);
      koi(6, -6, 2.6, () => 0xffa030);
      koi(2, 8, 4.2, showa);
      koi(-6, -9, 5.6, (i) => (i < 6 ? 0xffb020 : 0xffd060));
      // lily pads & a lotus flower floating on top
      const pad = (cx, cz, r, notch) => v.shape(cx - r - 1, 6, cz - r - 1, cx + r + 1, 6, cz + r + 1, (x, y, z) => {
        const d = Math.hypot(x - cx, z - cz);
        const a = Math.atan2(z - cz, x - cx);
        return d <= r + 0.3 && Math.abs(((a - notch + Math.PI) % TAU + TAU) % TAU - Math.PI) > 0.35 && inPond(x, z);
      }, (x, y, z) => (hash(x, y, z) > 0.7 ? 0x6fb24a : 0x4f9a3a));
      pad(9, 6, 3, 0.5); pad(-11, 7, 2.4, 2.2); pad(4, -12, 2.6, 4); pad(12, -3, 1.8, 1); pad(-4, 12, 1.6, 3);
      for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) v.set(9 + dx, 7, 6 + dz, 0xffb7c8);
      v.set(9, 7, 6, 0xffe066);
      v.set(9, 8, 6, 0xffd1dc);
      // rounded rim boulders, mossy on top
      for (let i = 0; i < 17; i++) {
        const a = i * TAU / 17 + hash(i, 0, 0) * 0.2, rr = rad(a) + 2.4;
        const s = 2.4 + hash(i, 1, 0) * 1.8, h = 2.5 + hash(i, 2, 0) * 3.5;
        blob(v, [[Math.cos(a) * rr, 3.5, Math.sin(a) * rr, s, h * 0.8, s * 0.9, 3]], stoneFn(pick([0x8f8b84, 0x9a968f, 0x7f7b74, 0xa39e95], hash(i, 3, 0)), i), { noise: 0.22, minY: 0, seed: i });
      }
      paintTops(v, (x, y, z) => y >= 4 && !inPond(x, z) && vnoise(x, y, z, 3, 2) > 0.5, (x, y, z) => pick(MOSS, hash(x, y, z)));
      // iris clump at the back edge
      for (let i = 0; i < 6; i++) {
        const x = -14 + i * 1.3, z = -15 + (i % 2);
        v.box(x, 2, z, x, 7 + (i % 3), z, 0x4a8a3a);
        if (i % 2 === 0) { v.set(x, 9 + (i % 3), z, 0x7a4ac8); v.set(x + 1, 8 + (i % 3), z, 0x9a6ae0); }
      }
    },
  },

  fuji_diorama: {
    name: 'Mt. Fuji Diorama', jp: '富士山ジオラマ', voxel: 0.02, footprint: [1, 1], themes: ['nature', 'shrine'], beauty: 8,
    build(v) {
      const WD = 0x4a2a1c;
      // low lacquered display table
      fill(v, -24, 20, -18, 24, 22, 18, (x, y, z) => gloss(woodGrain(WD, 'x')(x, y, z)));
      v.box(-22, 18, -16, 22, 19, 16, gloss(shade(WD, 0.85)));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        v.box(sx * 21, 0, sz * 14, sx * 22, 17, sz * 15, gloss(shade(WD, 0.9)));
        v.box(sx * 20, 0, sz * 14, sx * 23, 1, sz * 15, gloss(shade(WD, 0.75)));
      }
      // landscape base
      const lake = (x, z) => ((x + 9) / 12) ** 2 + ((z - 11) / 4.5) ** 2 < 1;
      fill(v, -22, 23, -16, 22, 23, 16, (x, y, z) => (lake(x, z) ? 0x2a5a8a : pick([0x5a8f3a, 0x6aa040, 0x4f8034], hash(x, y, z, 1))));
      v.shape(-22, 24, -16, 22, 24, 16, (x, y, z) => lake(x, z), glass(0x6ab8e8));
      // Mt. Fuji with a jagged snow cap
      const fx = 1, fz = -5, FR = 19;
      v.shape(fx - FR, 24, fz - FR, fx + FR, 48, fz + FR, (x, y, z) => {
        const d = Math.hypot(x - fx, z - fz);
        if (d > FR || lake(x, z)) return false;
        const h = 24 + 23 * (1 - d / FR) ** 1.55;
        if (d < 2.6 && y > 45) return false; // crater
        return y <= h;
      }, (x, y, z) => {
        const a = Math.atan2(z - fz, x - fx);
        const snowLine = 38 + 2.5 * Math.sin(a * 7) + 1.5 * Math.sin(a * 13 + 1);
        const streak = Math.sin(a * 11) > 0.7 && y > snowLine - 4;
        if (y > snowLine || streak) return hash(x, y, z) > 0.85 ? 0xdde6f2 : 0xf6f9fd;
        if (y < 28) return pick([0x3f6b3a, 0x4a7a42, 0x355e32], hash(x, y, z, 2));
        return pick([0x5a6f9a, 0x667ba6, 0x4e628a], vnoise(x, y, z, 2, 3));
      });
      // cloud band hugging the slope
      for (let a = 0.6; a < 2.6; a += 0.12) {
        const d = 12.5, x = fx + Math.cos(a) * d, z = fz + Math.sin(a) * d;
        v.sphere(x, 33 + Math.sin(a * 5), z, 1.3, 0xfbfcff);
      }
      // little pines
      for (const [x, z, h] of [[14, 6, 5], [17, 2, 4], [11, 12, 4], [-19, 6, 5], [-17, 13, 4], [3, 14, 3], [19, 10, 5], [-2, 9, 3]]) {
        v.box(x, 24, z, x, 25, z, C.woodDark);
        v.cone(x, 25, z, 1.6, h, (xx, yy, zz) => (hash(xx, yy, zz) > 0.5 ? 0x2f5e2a : 0x3b6e31));
      }
      // tiny five-storey pagoda on the hill
      const px = 15, pz = 11;
      v.ellipsoid(px, 24, pz, 4, 2, 3.5, 0x5a8f3a);
      for (let k = 0; k < 5; k++) {
        const y = 26 + k * 2, r = k < 3 ? 1 : 0;
        v.box(px - r, y, pz - r, px + r, y, pz + r, gloss(C.vermilion));
        v.box(px - r - 1, y + 1, pz - r - 1, px + r + 1, y + 1, pz + r + 1, 0x3a2a24);
      }
      v.box(px, 36, pz, px, 38, pz, gloss(0xf2c14e));
    },
  },

  shishi_odoshi: {
    name: 'Shishi-odoshi Fountain', jp: '鹿威し', voxel: 0.02, footprint: [1, 1], themes: ['shrine', 'nature'], beauty: 6,
    build(v) {
      const BAMC = (x, y, z) => ((x + y) % 9 === 0 ? 0x9a9248 : hash(x, y, z) > 0.8 ? 0x8fae4a : 0x7f9e3e);
      // pebble bed with a stone edging
      fill(v, -19, 0, -14, 19, 1, 14, (x, y, z) => pick([0xd8d3c8, 0xc4beb1, 0xe8e4dc, 0xa8a398], hash(x, y, z, 2)));
      v.paint(() => v.shape(-19, 1, -14, 19, 1, 14, (x, y, z) => Math.abs(x) === 19 || Math.abs(z) === 14, 0x77736c));
      // stone basin full of water
      v.shape(0, 2, -3, 14, 9, 11, (x, y, z) => Math.hypot(x - 7, z - 4) <= 6.6 - (y === 2 ? 1 : 0) + (vnoise(x, y, z, 2, 4) - 0.5), stoneFn(0x8e8981, 2));
      v.cylinder(7, 7, 4, 4, 3, null);
      v.cylinder(7, 6, 4, 4.2, 1, 0x2e4a3a);
      v.cylinder(7, 7, 4, 4, 2, glass(0x5ab0d8));
      // strike rock
      blob(v, [[-11, 2, 4, 3.5, 2.5, 3]], stoneFn(0x77736c, 3), { noise: 0.2, minY: 2, seed: 2 });
      // pivot posts and the rocking bamboo tube (mouth raised, waiting to fill)
      for (const z of [1, 7]) v.box(-3, 2, z, -2, 14, z, 0x6a5038);
      v.box(-3, 12, 2, -2, 12, 6, 0x4a3828);
      limb(v, [-12, 6, 4], [5, 17, 4], 1.6, 1.6, BAMC);
      v.set(5, 17, 4, 0x3a3a20); v.set(6, 18, 4, 0x3a3a20);
      v.paint(() => { v.cylinder(-6, 6, 4, 1.8, 1, 0xd8d090, 'x'); });
      // feeder spout post and pipe
      v.cylinder(14, 2, -4, 1.8, 36, BAMC);
      v.cylinder(14, 38, -4, 1, 1, 0x9a9248);
      limb(v, [14, 34, -4], [7, 31, 3], 0.8, 0.8, 0x9aae50);
      // falling water stream into the tube mouth
      for (let y = 18; y <= 30; y++) v.set(6, y, 3 + (y > 24 ? 0 : 1), glass(0x9ad8f0));
      // ferns & moss by the post
      fern(v, 11, 2, -9, 0.4, 5, 5); fern(v, 17, 2, 2, 1.2, 4, 4);
      blob(v, [[-15, 2, -9, 3, 1.5, 3]], (x, y, z) => pick(MOSS, hash(x, y, z)), { noise: 0.3, minY: 2, seed: 9 });
    },
  },

  grass_tuft: {
    name: 'Wild Grass Tuft', jp: '草むら', voxel: 0.0125, footprint: [0.5, 0.5], themes: ['nature'], beauty: 2,
    build(v) {
      blob(v, [[0, 0, 0, 16, 2.5, 13]], (x, y, z) => pick([0x5a4632, 0x4f7a2c, 0x5f8a34, 0x6f9a3c], hash(x, y, z, 1)), { noise: 0.3, minY: 0, seed: 1 });
      const BL = [0x4f8a32, 0x5f9a38, 0x6aa63e, 0x7cb446, 0x8ec04e];
      for (let i = 0; i < 70; i++) {
        const a = i * 2.39996, rr = 12 * Math.sqrt((i + 0.5) / 70);
        const bx = Math.cos(a) * rr, bz = Math.sin(a) * rr * 0.8;
        const h = 14 + hash(i, 0, 1) * 13 * (1 - rr / 16);
        const lean = 0.25 + hash(i, 1, 1) * 0.35, la = a + (hash(i, 2, 1) - 0.5);
        const c = pick(BL, hash(i, 3, 1));
        for (let s = 0; s <= h; s++) {
          const t = s / h, off = lean * t * t * h * 0.6;
          v.set(bx + Math.cos(la) * off, 2 + s, bz + Math.sin(la) * off, t > 0.85 ? mix(c, 0xd8e080, 0.5) : t < 0.25 ? shade(c, 0.8) : c);
        }
      }
      // little wildflowers
      const flowers = [[-6, 3, 20, 0xfbf8f2], [5, -4, 22, 0xffd23f], [8, 5, 17, 0xb08ae8], [-9, -5, 18, 0xffb7c8], [1, 7, 15, 0xfbf8f2], [-2, -8, 19, 0xffd23f]];
      for (const [x, z, h, c] of flowers) {
        v.box(x, 2, z, x, h, z, 0x5a8a34);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) v.set(x + dx, h + 1, z + dz, c);
        v.set(x, h + 1, z, c === 0xffd23f ? 0xff9a2e : 0xffd23f);
        v.set(x, h + 2, z, c);
      }
    },
  },
};

// every prop gets a final tidy pass so no noise crumbs float in the air
for (const p of Object.values(PROPS)) {
  const build = p.build;
  p.build = (v) => { build(v); dropFloaters(v); };
}

export default PROPS;
