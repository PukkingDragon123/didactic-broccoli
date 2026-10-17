// Series 3 — Kasa Collection (傘コレクション)
// Umbrellas of Japan: konbini vinyl, kids' frogs, wagasa, a windy disaster, and one hopping yokai.
import { C, shade } from '../../voxel/palette.js';
import { VoxelModel, gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;
const TAU = Math.PI * 2;

/** Deterministic hash noise in [0,1). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 668265263);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** Rotation matrix R = Ry(yaw) · Rz(roll) · Rx(pitch). +pitch tips the top toward +z, +roll toward -x. */
function rotM(pitch = 0, roll = 0, yaw = 0) {
  const cx = Math.cos(pitch), sx = Math.sin(pitch), cz = Math.cos(roll), sz = Math.sin(roll);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const mul = (A, B) => [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]));
  return mul([cy, 0, sy, 0, 1, 0, -sy, 0, cy], mul([cz, -sz, 0, sz, cz, 0, 0, 0, 1], [1, 0, 0, 0, cx, -sx, 0, sx, cx]));
}

/**
 * Copy model `m` into `v` rotated by matrix M around m's origin, then offset by `at`.
 * Resampled per target voxel (with a few sub-samples so thin shells stay watertight).
 */
function placeRotated(v, m, M, at = [0, 0, 0], minHits = 3) {
  const b = m.bounds();
  const xs = [], ys = [], zs = [];
  for (const x of [b.minX - 1, b.maxX + 1]) for (const y of [b.minY - 1, b.maxY + 1]) for (const z of [b.minZ - 1, b.maxZ + 1]) {
    xs.push(M[0] * x + M[1] * y + M[2] * z); ys.push(M[3] * x + M[4] * y + M[5] * z); zs.push(M[6] * x + M[7] * y + M[8] * z);
  }
  const inv = (x, y, z) => [M[0] * x + M[3] * y + M[6] * z, M[1] * x + M[4] * y + M[7] * z, M[2] * x + M[5] * y + M[8] * z];
  const look = (p) => m.get(Math.round(p[0]), Math.round(p[1]), Math.round(p[2]));
  const offs = [];
  for (const a of [-0.3, 0.3]) for (const c of [-0.3, 0.3]) for (const d of [-0.3, 0.3]) offs.push([a, c, d]);
  for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let z = Math.floor(Math.min(...zs)); z <= Math.ceil(Math.max(...zs)); z++) {
        let val = look(inv(x, y, z));
        if (val === null) {
          let hits = 0;
          for (const [a, c, d] of offs) {
            const g = look(inv(x + a, y + c, z + d));
            if (g !== null) { hits++; if (val === null) val = g; }
          }
          if (hits < minHits) val = null;
        }
        if (val !== null) v.set(x + at[0], y + at[1], z + at[2], val);
      }
    }
  }
  return v;
}

const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mulv = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];

/**
 * Umbrella canopy shell. Local frame: axis +y, rim near y=0, apex at y=drop (inv: centre at 0, rim at +drop).
 * Drawn directly in world space through rotation M and offset `at`, as a thin watertight digital surface.
 * col(info) gets local {x,y,z (rounded), r, rn, a, panel, fr} (fr = 0..1 across the panel).
 */
function canopy(m, o) {
  const { R = 12, drop = 6, p = 2, ribs = 8, scallop = 1.2, rot0 = 0, inv = false, col, ribCol = null, tipCol = null,
    seamCol = null, M = I3, at = [0, 0, 0], cut = null } = o;
  const h = (r) => (inv ? drop * Math.pow(r / R, p) : drop * (1 - Math.pow(r / R, p)));
  const dh = (r) => ((inv ? 1 : -1) * drop * p * Math.pow(Math.max(r, 0.01) / R, p - 1)) / R;
  const step = TAU / ribs;
  const rEdge = (a) => R - scallop * Math.abs(Math.sin((ribs * (a - rot0)) / 2));
  const toLocal = (x, y, z) => {
    const dx = x - at[0], dy = y - at[1], dz = z - at[2];
    return [M[0] * dx + M[3] * dy + M[6] * dz, M[1] * dx + M[4] * dy + M[7] * dz, M[2] * dx + M[5] * dy + M[8] * dz];
  };
  const toWorld = (x, y, z) => { const q = mulv(M, [x, y, z]); return [q[0] + at[0], q[1] + at[1], q[2] + at[2]]; };
  const info = (x, y, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    const rel = (((a - rot0) % TAU) + TAU) % TAU;
    const panel = Math.floor(rel / step);
    return { x: Math.round(x), y: Math.round(y), z: Math.round(z), r, rn: r / R, a, panel, fr: rel / step - panel };
  };
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const x of [-R - 1, R + 1]) for (const y of [-1.5, drop + 1.5]) for (const z of [-R - 1, R + 1]) {
    const q = toWorld(x, y, z);
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); }
  }
  m.shape(Math.floor(lo[0]), Math.floor(lo[1]), Math.floor(lo[2]), Math.ceil(hi[0]), Math.ceil(hi[1]), Math.ceil(hi[2]), (x, y, z) => {
    const [lx, ly, lz] = toLocal(x, y, z);
    const r = Math.hypot(lx, lz), a = Math.atan2(lz, lx);
    if (r > rEdge(a) + 0.3) return false;
    if (cut && cut(lx, ly, lz, r, a)) return false;
    const d = dh(r), rr = Math.max(r, 1e-6);
    const g = mulv(M, [(-d * lx) / rr, 1, (-d * lz) / rr]);
    return Math.abs(ly - h(r)) <= (Math.abs(g[0]) + Math.abs(g[1]) + Math.abs(g[2])) / 2;
  }, (x, y, z) => { const q = toLocal(x, y, z); return col(info(q[0], q[1], q[2])); });
  const put = (lx, ly, lz, c, onlyEmpty) => {
    const q = toWorld(lx, ly, lz).map(Math.round);
    if (onlyEmpty && m.has(q[0], q[1], q[2])) return;
    m.set(q[0], q[1], q[2], c);
  };
  for (let k = 0; k < ribs; k++) {
    const ak = rot0 + k * step, ca = Math.cos(ak), sa = Math.sin(ak);
    if (ribCol) {
      // continuous polyline following the canopy, just below (or above, when inverted) the fabric
      const off = inv ? 1.2 : -1.2;
      let prev = null;
      for (let i = 0; i <= 6; i++) {
        const t = 1 + ((R - 2.2) * i) / 6;
        const q = toWorld(t * ca, h(t) + off, t * sa).map(Math.round);
        if (prev) {
          const n = Math.max(Math.abs(q[0] - prev[0]), Math.abs(q[1] - prev[1]), Math.abs(q[2] - prev[2]), 1);
          for (let j = 0; j <= n; j++) {
            const x = Math.round(prev[0] + ((q[0] - prev[0]) * j) / n), y = Math.round(prev[1] + ((q[1] - prev[1]) * j) / n), z = Math.round(prev[2] + ((q[2] - prev[2]) * j) / n);
            if (!m.has(x, y, z)) m.set(x, y, z, ribCol);
          }
        }
        prev = q;
      }
    }
    if (seamCol) for (let t = 1.5; t <= R; t += 0.3) {
      const q = toWorld(t * ca, h(t), t * sa).map(Math.round);
      if (m.has(q[0], q[1], q[2])) m.set(q[0], q[1], q[2], seamCol);
    }
    if (tipCol) put((R + 0.5) * ca, h(R), (R + 0.5) * sa, tipCol, false);
  }
  return { h, step, toWorld };
}

/** Face-connected voxel line from p0 to p1 (col may be a function of t in 0..1). */
function stick6(v, p0, p1, col) {
  const colAt = (t) => (typeof col === 'function' ? col(t) : col);
  const n = Math.ceil(Math.max(Math.abs(p1[0] - p0[0]), Math.abs(p1[1] - p0[1]), Math.abs(p1[2] - p0[2])) * 4) || 1;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const q = [0, 1, 2].map((k) => Math.round(p0[k] + (p1[k] - p0[k]) * t));
    if (prev) {
      const c = prev.slice();
      for (const k of [1, 0, 2]) {
        if (c[k] !== q[k]) { c[k] = q[k]; if (c[0] !== q[0] || c[1] !== q[1] || c[2] !== q[2]) v.set(c[0], c[1], c[2], colAt(t)); }
      }
    }
    v.set(q[0], q[1], q[2], colAt(t));
    prev = q;
  }
}

/**
 * Place a rotated umbrella: `parts` (handle, hub, …) built with the pivot at its origin; canopy frame at y=canopyY.
 * `sticks` = [[y0, y1, col]] segments along the local axis, drawn as clean face-connected lines.
 */
function umbrellaAt(v, parts, opts, canopyY, M, base, sticks = [], minHits = 2) {
  if (parts) placeRotated(v, parts, M, base, minHits);
  for (const [y0, y1, col] of sticks) {
    const a = mulv(M, [0, y0, 0]), b = mulv(M, [0, y1, 0]);
    stick6(v, [a[0] + base[0], a[1] + base[1], a[2] + base[2]], [b[0] + base[0], b[1] + base[1], b[2] + base[2]],
      typeof col === 'function' ? (t) => col(y0 + (y1 - y0) * t) : col);
  }
  const c = mulv(M, [0, canopyY, 0]);
  return canopy(v, { ...opts, M, at: [base[0] + c[0], base[1] + c[1], base[2] + c[2]] });
}

/** J-hook handle in the xy plane: grip from yTop down to yBot (3x3, rounded), hook curling toward +x*dir. */
function jHandle(m, x, yTop, yBot, z, col, { r = 2.5, dir = 1, thick = 1 } = {}) {
  m.box(x - thick, yBot, z - thick, x + thick, yTop, z + thick, col);
  if (thick > 0) for (const y of [yTop, yBot]) for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.set(x + dx * thick, y, z + dz * thick, null);
  const cx = x + dir * r;
  m.shape(x - r * 2 - 2, yBot - r - 2, z - thick, x + r * 2 + 2, yBot, z + thick, (xx, yy, zz) => {
    const d = Math.hypot(xx - cx, yy - yBot);
    return yy <= yBot && Math.abs(d - r) <= 0.9 && Math.abs(zz - z) <= Math.max(0, thick - 1) + 0.0;
  }, col);
  return m;
}

/** Closed, pleated umbrella along +y from y0 (ferrule) with given length. */
function folded(m, y0, len, rMax, col, colDark, folds = 8) {
  m.shape(-rMax - 1, y0, -rMax - 1, rMax + 1, y0 + len, rMax + 1, (x, y, z) => {
    const t = (y - y0) / len;
    const r0 = 0.6 + rMax * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.62 + 0.05)), 1.4);
    const a = Math.atan2(z, x);
    const r = r0 * (0.78 + 0.22 * Math.abs(Math.cos((folds / 2) * a)));
    return Math.hypot(x, z) <= r;
  }, (x, y, z) => {
    const a = Math.atan2(z, x);
    return Math.abs(Math.cos((folds / 2) * a)) < 0.35 ? colDark : col;
  });
}

export default {
  id: 'kasa',
  order: 3,
  name: 'Kasa Collection',
  jp: '傘コレクション',
  tagline: 'Tiny umbrellas for a rainy season',
  taglineJp: '梅雨のおともに',
  price: 200,
  themes: ['cute', 'retro', 'weird'],
  card: { bg: '#e3eef8', accent: '#e5383b', text: '#1f2f4a', accent2: '#ffd23f', pattern: 'dots' },
  capsule: { colors: [0x9fd9ff, 0xffd23f, 0xe5383b, 0xc7b3f0, 0x58c06c] },
  items: [
    // ------------------------------------------------------------ 1. konbini vinyl umbrella
    {
      id: 'vinyl', name: 'Konbini Vinyl Umbrella', jp: 'ビニール傘', rarity: 'common',
      desc: 'Bought in a panic for ¥500. Will be left on a train by Thursday.',
      build(v) {
        // wet sidewalk tiles with a puddle
        v.shape(-11, 0, -11, 11, 0, 11, () => true, (x, y, z) => {
          if ((x + 11) % 7 === 0 || (z + 11) % 7 === 0) return 0x8a8680;
          return hash(x, 0, z, 4) < 0.25 ? 0xb4b0a8 : 0xc4c0b8;
        });
        v.shape(-10, 1, -9, 10, 1, 10, (x, y, z) => {
          const a = Math.atan2(z - 1, x + 1);
          return Math.hypot(x + 1, z - 1) <= 7.5 + Math.sin(a * 3) * 1.4;
        }, glass(0x8fc8ee));
        // umbrella parts, built with the hook's bottom at the origin (canopy frame at y=18)
        const R = 11.5, drop = 5.5, hF = (r) => drop * (1 - (r / R) ** 2);
        const m = new VoxelModel();
        m.box(-1, 16, -1, 1, 17, 1, gloss(W)); // runner
        for (let k = 0; k < 8; k++) {
          const a = (k * TAU) / 8;
          m.line(0, 17, 0, Math.round(5 * Math.cos(a)), 18 + Math.round(hF(5)) - 1, Math.round(5 * Math.sin(a)), gloss(0xc8ccd4));
        }
        jHandle(m, 0, 6, 3, 0, gloss(0xf6f6f2), { r: 2.5, thick: 1 });
        m.translate(-2, 0, 0);
        const M = rotM(0.1, -0.16, 0);
        umbrellaAt(v, m, {
          R, drop, ribs: 8, scallop: 1.0,
          col: () => glass(0xe8f6ff), ribCol: gloss(0xdfe3ea), tipCol: gloss(W),
        }, 18, M, [-1, 1, 0], [[6, 24, gloss(0xb8c0ca)], [24, 26, gloss(W)]]);
        // konbini price sticker on the canopy
        v.project(['WR', 'WW'], { W: gloss(W), R: gloss(0xe5383b) }, 5, -2, '+y');
      },
    },
    // ------------------------------------------------------------ 2. frog kids umbrella
    {
      id: 'kaeru', name: 'Frog Kids Umbrella', jp: 'かえるのかさ', rarity: 'common',
      desc: 'Comes with a clear window so you can see the puddles you are about to jump in.',
      build(v) {
        // lily pad base with a tiny frog
        v.cylinder(0, 0, 0, 7, 2, (x, y, z) => {
          const a = Math.atan2(z, x);
          if (y === 0) return 0x3f7f30;
          return Math.abs(Math.sin(a * 4)) < 0.18 ? 0x7cc860 : 0x58a840;
        });
        v.shape(-8, 0, -8, 8, 1, 8, (x, y, z) => z < -1 && Math.abs(x) <= -z * 0.35, null);
        v.ellipsoid(4, 3, 4, 1.6, 1.2, 1.4, C.green);
        v.set(3, 4, 5, W).set(5, 4, 5, W).set(3, 4, 6, K).set(5, 4, 6, K);
        v.set(4, 2, 6, C.green);
        // canopy
        const m = new VoxelModel();
        const rot0 = Math.PI / 2 - Math.PI / 8;
        canopy(m, {
          R: 12, drop: 6, ribs: 8, scallop: 1.3, rot0,
          col: ({ panel }) => (panel === 7 ? glass(0xe2f6e0) : gloss(panel % 2 ? 0x5cc46a : 0x4ab35a)),
          ribCol: gloss(0xf2f2ea), tipCol: gloss(C.yellow),
        });
        m.set(0, 7, 0, gloss(C.yellow)).set(0, 8, 0, gloss(C.yellow));
        v.merge(m, 0, 18, 0);
        // frog eyes on top
        for (const sx of [-1, 1]) {
          v.sphere(sx * 3.5, 23.5, 3.5, 2.1, gloss(0x5cc46a));
          v.sphere(sx * 3.5, 24, 4.5, 1.4, gloss(W));
          v.set(sx * 3.5 + (sx > 0 ? 0 : 0), 24, 6, K).set(sx * 3.5, 25, 6, K);
          v.set(sx * 3.5 + sx, 25, 6, gloss(W));
        }
        // mouth + cheeks printed on the front
        v.project(['K.........K', '.K.......K.', '..KKKKKKK..'], { K: 0x1f4f28 }, -5, 21, '+z');
        v.project(['PP', 'PP'], { P: C.pink }, -8, 21, '+z');
        v.project(['PP', 'PP'], { P: C.pink }, 7, 21, '+z');
        // shaft + yellow J handle resting on the pad
        v.box(0, 8, 0, 0, 23, 0, gloss(0xf2f2ea));
        v.box(-1, 17, -1, 1, 17, 1, gloss(0xf2f2ea));
        jHandle(v, 0, 8, 4, 0, gloss(C.yellow), { r: 2 });
      },
    },
    // ------------------------------------------------------------ 3. folded navy umbrella
    {
      id: 'tatami', name: 'Bamboo-Handle Umbrella', jp: '紳士傘', rarity: 'common',
      desc: 'A proper gentleman’s umbrella. Left at the station in 1987, still waiting.',
      build(v) {
        // indigo ceramic umbrella stand with a white wave band, on a small puddle
        v.shape(-9, 0, -9, 9, 0, 9, (x, y, z) => x * x + z * z * 1.3 <= 75, glass(0x9fd0f0));
        v.tube(0, 0, 0, 5, 3.6, 9, (x, y, z) => {
          const a = Math.atan2(z, x);
          if (y === 8) return gloss(0x1f3560);
          if (y === 5) return gloss(W);
          if (y === 3 || y === 7) return gloss(Math.sin(a * 10) > 0.3 ? 0x6a8fc8 : 0x2b4f7e);
          return gloss(0x2b4f7e);
        });
        v.cylinder(0, 0, 0, 4, 1, gloss(0x1f3560));
        // the umbrella (built upright, leaned against the rim)
        const m = new VoxelModel();
        m.box(0, 0, 0, 0, 1, 0, metal(C.chrome)); // ferrule
        folded(m, 2, 15, 2.6, C.navy, 0x16244a);
        m.paint(() => m.box(-4, 12, -4, 4, 12, 4, 0x16244a)); // strap
        m.set(0, 12, 3, metal(C.silver));
        m.box(0, 17, 0, 0, 18, 0, metal(C.chrome));
        // bamboo crook handle with nodes
        const bam = (x, y) => ((y === 21 || y === 24) ? 0x9a8a3a : 0xd7c77a);
        for (let y = 19; y <= 25; y++) m.set(0, y, 0, bam(0, y)).set(1, y, 0, bam(1, y));
        m.shape(-6, 24, -1, 1, 31, 1, (x, y, z) => {
          const d = Math.hypot(x + 2, y - 25);
          return z === 0 && y >= 25 && Math.abs(d - 2.5) <= 0.95;
        }, (x, y) => (x === -2 ? 0x9a8a3a : 0xd7c77a));
        // lost-property tag on a red string
        m.box(-4, 23, 0, -4, 24, 0, 0xe5383b);
        m.layer(['PP', 'PK', 'PP'], { P: C.paper, K: 0xe5383b }, { x: -5, y: 22, z: 0 });
        placeRotated(v, m, rotM(0.08, -0.22, 0), [0, 1, -1]);
      },
    },
    // ------------------------------------------------------------ 4. janome-gasa
    {
      id: 'janome', name: 'Janome-gasa', jp: '蛇の目傘', rarity: 'uncommon',
      desc: 'A bull’s-eye wagasa of oiled washi. Rain sounds like tiny drums on it.',
      build(v) {
        const RED = 0xc8202a, CREAM = 0xf8f0e0;
        const R = 13, drop = 4.5, P = 1.8, hF = (r) => drop * (1 - Math.pow(r / R, P));
        // tatami mat with black heri edging, lacquer stand
        v.shape(-10, 0, -8, 10, 1, 8, () => true, (x, y, z) => {
          if (Math.abs(x) === 10 || Math.abs(z) === 8) return 0x2a2420;
          if (y === 0) return 0xa89a58;
          return (x + 40) % 2 ? 0xcfc47c : 0xc0b46c;
        });
        v.box(-3, 2, -3, 3, 2, 3, gloss(C.lacquerBlack));
        v.box(-2, 3, -2, 2, 5, 2, gloss(C.lacquerBlack));
        v.paint(() => v.box(-2, 5, -2, 2, 5, 2, gloss(C.lacquer)));
        // parts from the handle tip (canopy frame at y=17)
        const m = new VoxelModel();
        m.box(0, 0, 0, 0, 1, 0, 0x3a2420);
        m.box(-1, 20, -1, 1, 21, 1, 0xb89a50); // rokuro hub
        m.set(0, 26, 0, 0x3a2420);
        // kagari-ito threads just under the canopy
        for (let a = 0; a < TAU; a += 0.08) {
          const x = Math.round(4 * Math.cos(a)), z = Math.round(4 * Math.sin(a));
          m.set(x, 21 + Math.round(hF(4)) - 1, z, [0xe5383b, 0xffd23f, 0x3cae5a, 0x2f6fd6, W][Math.floor(a * 1.6) % 5]);
        }
        umbrellaAt(v, m, {
          R, drop, p: P, ribs: 32, scallop: 0.25,
          col: ({ rn, panel, fr }) => {
            let c = rn < 0.13 ? 0x3a2420 : rn < 0.4 ? RED : rn < 0.66 ? CREAM : RED;
            if (rn > 0.13 && panel % 2 === 0 && fr < 0.18) c = shade(c, 0.88);
            return gloss(c);
          },
          ribCol: 0xd8c27a,
        }, 21, rotM(0.1, -0.16, 0), [0, 3, 0], [
          [2, 10, (y) => (Math.round(y) % 2 ? 0x7a4e2b : 0xa87a48)], // rattan-wrapped handle
          [10, 25, 0xd8c27a], // bamboo shaft
        ]);
      },
    },
    // ------------------------------------------------------------ 5. inside-out umbrella
    {
      id: 'uragaeri', name: 'Inside-Out Umbrella', jp: 'おちょこ傘', rarity: 'uncommon',
      desc: 'Typhoon season’s most popular dance move. The umbrella did not consent.',
      build(v) {
        // manhole-cover base (municipal flower motif)
        v.cylinder(0, 0, 0, 7, 1, metal(0x5a5650));
        v.paint(() => v.shape(-7, 0, -7, 7, 0, 7, (x, y, z) => {
          const r = Math.hypot(x, z), a = Math.atan2(z, x);
          return r > 6.2 || (r > 1.5 && r < 5 && Math.cos(a * 5) > 0.2 + (r - 3) * 0.2) || r < 1.2;
        }, metal(0x9a948a)));
        // parts from the handle's foot (canopy frame at y=17)
        const m = new VoxelModel();
        m.box(-1, 0, -1, 1, 4, 1, gloss(0x2a2420)); // straight handle
        m.box(-1, 16, -1, 1, 17, 1, 0x5a5a62); // runner
        const M = rotM(0.1, -0.35, 0);
        const { toWorld } = umbrellaAt(v, m, {
          R: 9.5, drop: 7, p: 1.15, ribs: 8, scallop: 1.4, inv: true, seamCol: gloss(0x4a4a54),
          col: ({ panel }) => gloss(panel % 2 ? 0xff8c2e : 0xffd86a),
          tipCol: gloss(K),
          cut: (x, y, z, r, a) => a > 2.5 && a < 3.0 && r > 5.5 + hash(Math.round(x), 0, Math.round(z), 9) * 2.5,
        }, 17, M, [-3, 1, 0], [[5, 17, gloss(0x8a929c)]]);
        // the torn panel flapping in the wind, and a leaf caught in the ribs
        for (let i = 0; i < 4; i++) {
          const q = toWorld(-7 - i * 0.9, 4 + i * 0.6, 7 + i * 0.4).map(Math.round);
          v.set(q[0], q[1], q[2], gloss(0xffd86a)).set(q[0], q[1] + 1, q[2], gloss(0xffd86a));
        }
        // comic wind swooshes curling off the left rim
        for (const [lz, len, amp] of [[-3, 7, 1.4], [3, 5, 1]]) {
          const st = toWorld(-8.3, 7 * Math.pow(8.3 / 9.5, 1.15), lz).map(Math.round);
          let py = null;
          for (let i = 0; i <= len; i++) {
            const y = st[1] + Math.round(Math.sin((i / len) * Math.PI * 1.5) * amp);
            if (py !== null && py !== y) v.set(st[0] - i + 1, y, st[2], gloss(0xf2f8ff));
            v.set(st[0] - i, y, st[2], gloss(0xf2f8ff));
            py = y;
          }
        }
        const lf = toWorld(4, 3, -3).map(Math.round);
        v.layer(['.G.', 'GgG', '.G.'], { G: 0x6aa83a, g: 0x4a8a2a }, { x: lf[0] - 1, y: lf[1] + 1, z: lf[2], plane: 'xz' });
      },
    },
    // ------------------------------------------------------------ 6. sakura nodate parasol
    {
      id: 'nodate', name: 'Sakura Nodate Parasol', jp: '桜の野点傘', rarity: 'rare',
      desc: 'Outdoor tea under the cherry blossoms. Petals keep landing in the matcha.',
      build(v) {
        // gravel ground
        v.shape(-13, 0, -11, 13, 0, 11, (x, y, z) => (x / 13.4) ** 2 + (z / 11.4) ** 2 <= 1,
          (x, y, z) => (hash(x, y, z, 2) < 0.3 ? 0xd8d0c0 : 0xe8e0d0));
        // bench with red mōsen felt
        v.box(-8, 1, -1, -7, 4, 5, C.woodDark).box(7, 1, -1, 8, 4, 5, C.woodDark);
        v.box(-9, 5, -2, 9, 5, 6, 0xd8322e);
        v.paint(() => v.box(-9, 5, -2, 9, 5, -2, 0xb82424));
        v.box(-9, 4, 6, 9, 4, 6, 0xd8322e);
        // matcha bowl + sakura mochi plate
        v.cylinder(-3, 6, 2, 2.2, 2, gloss(0x4a3a30));
        v.cylinder(-3, 7, 2, 1.5, 1, 0x8fb85a);
        v.set(-3, 8, 2, 0xb8d880);
        v.box(2, 6, 1, 6, 6, 4, gloss(0x2a2a2e));
        v.ellipsoid(4, 7, 2.5, 1.4, 1, 1.2, C.pastelPink);
        v.paint(() => v.box(2, 7, 2, 6, 7, 2, C.leaf));
        // stand + bamboo pole
        v.box(-2, 1, -9, 2, 2, -5, C.woodDark);
        v.box(-1, 3, -8, 1, 4, -6, C.wood);
        // parasol on a long bamboo pole (built from the pole's foot; canopy frame at y=22)
        const R = 13, drop = 3.5, P = 1.3, hF = (r) => drop * (1 - Math.pow(r / R, P));
        const m = new VoxelModel();
        m.box(-1, 20, -1, 1, 22, 1, 0xb89a50);
        for (let a = 0; a < TAU; a += 0.07) {
          const x = Math.round(4.5 * Math.cos(a)), z = Math.round(4.5 * Math.sin(a));
          m.set(x, 22 + Math.round(hF(4.5)) - 1, z, [0xe5383b, 0xffd23f, 0x3cae5a, 0x2f6fd6, W][Math.floor(a * 1.6) % 5]);
        }
        m.set(0, 28, 0, 0x5a2a2a);
        const M = rotM(0.14, 0, 0);
        const { toWorld } = umbrellaAt(v, m, {
          R, drop, p: P, ribs: 24, scallop: 0.4,
          col: ({ rn }) => gloss(rn < 0.12 ? 0x8a3a4a : rn > 0.94 ? 0xff9ab8 : 0xffdce6),
          ribCol: 0xd8c27a,
        }, 22, M, [0, 3, -7], [[0, 27, (y) => ([5, 12, 19].includes(Math.round(y)) ? 0x9a8a3a : 0xd8c27a)]]);
        // sakura blossoms printed on the canopy
        for (const [lx, lz] of [[0, 6], [-6, 2], [6, -1], [-3, -6], [4, -8], [-8, -5], [8, 6], [-5, 9], [2, 0], [10, -4]]) {
          const q = toWorld(lx, 0, lz).map(Math.round);
          v.project(['.P.', 'PYP', '.P.'], { P: gloss(0xff6a96), Y: gloss(C.yellow) }, q[0] - 1, q[2] - 1, '+y');
        }
        // fallen petals
        for (const [x, z] of [[-11, 4], [-6, 8], [10, 6], [5, -9], [-10, -5], [11, -2], [3, 9], [-4, -8]]) v.set(x, 1, z, 0xffb0c8);
        v.set(-6, 6, 4, 0xffb0c8).set(1, 6, -1, 0xffb0c8);
      },
    },
    // ------------------------------------------------------------ 7. rainy day kid
    {
      id: 'amefuri', name: 'Puddle Jumper', jp: 'あめふりっこ', rarity: 'ultra',
      desc: 'Yellow raincoat, red boots, zero intention of staying dry.',
      build(v) {
        const YEL = 0xffd23f, YELD = 0xe8b420, BOOT = 0xe8453c;
        // asphalt + puddle
        v.cylinder(0, 0, 0, 11, 1, (x, y, z) => (hash(x, y, z, 6) < 0.3 ? 0x4a4848 : 0x5a5856));
        v.shape(-10, 1, -9, 10, 1, 10, (x, y, z) => {
          const a = Math.atan2(z - 1, x);
          return Math.hypot(x, (z - 1) * 1.15) <= 8.5 + Math.sin(a * 4) * 0.8;
        }, glass(0x8fd0f6));
        // boots
        for (const sx of [-1, 1]) {
          v.box(sx * 2 - 1, 1, -1, sx * 2 + 1, 4, 1, gloss(BOOT));
          v.box(sx * 2 - 1, 1, 2, sx * 2 + 1, 2, 2, gloss(BOOT));
          v.box(sx * 2 - 1, 4, -1, sx * 2 + 1, 4, 1, gloss(0xc8302a));
        }
        // splash crown around the right boot
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * TAU;
          const x = Math.round(2 + Math.cos(a) * 3.6), z = Math.round(0.5 + Math.sin(a) * 3.2);
          const hgt = 2 + (k % 3);
          for (let y = 2; y <= hgt; y++) if (!v.has(x, y, z)) v.set(x, y, z, glass(0xa8dcff));
          if (!v.has(x, hgt + 1, z)) v.set(x, hgt + 1, z, gloss(0xf2fbff));
        }
        // legs
        v.box(-2, 5, 0, -2, 5, 0, C.skin).box(2, 5, 0, 2, 5, 0, C.skin);
        // raincoat (A-line)
        v.shape(-6, 6, -5, 6, 13, 5, (x, y, z) => {
          const t = y - 6;
          const rx = 4.8 - t * 0.33, rz = 3.6 - t * 0.18;
          return (x / rx) ** 2 + (z / rz) ** 2 <= 1;
        }, (x, y, z) => gloss(y === 6 ? YELD : YEL));
        v.paint(() => v.box(0, 7, 3, 0, 12, 4, gloss(YELD)));
        for (const y of [8, 10, 12]) v.project(['B'], { B: gloss(C.sky) }, 1, y, '+z');
        // randoseru on the back
        v.box(-3, 8, -6, 3, 13, -4, gloss(0xd8282e));
        v.box(-3, 11, -7, 3, 13, -7, gloss(0xb81e24));
        v.set(0, 11, -8, metal(C.gold));
        v.box(-3, 13, -6, 3, 13, -3, gloss(0xb81e24));
        // arms
        v.line(-4, 12, 0, -6, 9, 1, gloss(YEL), 0.8);
        v.sphere(-6, 8, 1, 1, C.skin);
        v.line(4, 12, 0, 6, 14, 1, gloss(YEL), 0.8);
        // head with hood
        v.ellipsoid(0, 17, -0.5, 4.8, 4.5, 4.4, gloss(YEL));
        v.ellipsoid(0, 16.5, 0.8, 3.7, 3.5, 3.6, C.skin);
        v.paint(() => v.box(-4, 19, 1, 4, 20, 5, 0x5a3424));
        v.box(-1, 21, -1, 1, 22, 1, gloss(YEL));
        v.project(['KW...KW', 'KK...KK'], { K, W }, -3, 17, '+z');
        v.project(['MMM', 'MTM'], { M: C.mouth, T: C.tongue }, -1, 15, '+z');
        v.project(['PP.....PP'], { P: C.blush }, -4, 15, '+z');
        // umbrella held in the raised hand (parts from the hand; canopy frame at y=12)
        const m = new VoxelModel();
        m.set(0, 15, 0, gloss(W)).set(0, 16, 0, gloss(W));
        m.box(-1, 9, -1, 1, 10, 1, gloss(W));
        jHandle(m, 0, -1, -2, 0, gloss(BOOT), { r: 1.5, dir: -1, thick: 0 });
        umbrellaAt(v, m, {
          R: 10, drop: 4.5, ribs: 8, scallop: 1.0, rot0: Math.PI / 8,
          col: ({ x, z }) => gloss(((x + 40) % 5 < 2 && (z + 40) % 5 < 2) ? W : 0x6cb4f4),
          ribCol: gloss(W), tipCol: gloss(W),
        }, 10, rotM(-0.16, 0.2, 0), [6, 15, 1], [[-2, 14, gloss(0xd8dde4)]]);
        v.sphere(6, 15, 1, 1, C.skin);
        v.sphere(6, 16, 1, 1, C.skin);
      },
    },
    // ------------------------------------------------------------ 8. kasa-obake (secret)
    {
      id: 'obake', name: 'Kasa-Obake', jp: 'からかさお化け', rarity: 'secret',
      desc: 'A hundred-year-old umbrella that grew an eye, a tongue and a very hairy leg.',
      build(v) {
        const PUR = 0x7a5aa8, PURD = 0x4e3878, RIB = 0xc9b07a;
        // mossy ground
        v.cylinder(0, 0, 0, 8.5, 1, (x, y, z) => (hash(x, y, z, 7) < 0.35 ? 0x3e5a34 : 0x4a6a3c));
        for (const [x, z] of [[-6, 3], [5, -5], [6, 4], [-4, -6], [-7, -2]]) v.box(x, 1, z, x, 2, z, C.grassDark).set(x + 1, 1, z, C.grass);
        const m = new VoxelModel();
        // geta
        m.box(-2, 3, -3, 2, 3, 3, 0xc9a06a);
        m.box(-2, 1, -2, 2, 2, -2, 0x9a7444).box(-2, 1, 2, 2, 2, 2, 0x9a7444);
        m.set(0, 4, 3, 0xe5383b).set(-1, 4, 1, 0xe5383b).set(1, 4, 1, 0xe5383b);
        // hairy leg
        m.box(-1, 4, -1, 1, 5, 2, 0xf0c09a);
        m.shape(-1, 6, -1, 0, 11, 0, () => true, (x, y, z) => (hash(x, y, z, 5) < 0.3 ? 0x6a4228 : 0xf0c09a));
        m.set(1, 8, 0, 0x6a4228).set(-2, 9, -1, 0x6a4228);
        // folded wagasa body (pleated cone with a ragged hem)
        m.shape(-9, 11, -9, 9, 28, 9, (x, y, z) => {
          const t = (y - 11) / 17;
          const a = Math.atan2(z, x);
          let r = 7.6 * Math.pow(1 - t, 1.1) + 0.6;
          r *= 0.84 + 0.16 * Math.abs(Math.cos(6 * a));
          if (y <= 12 && hash(Math.round(a * 6), y, 0, 3) < 0.3) return false;
          return Math.hypot(x, z) <= r;
        }, (x, y, z) => {
          const a = Math.atan2(z, x);
          if (Math.abs(Math.cos(6 * a)) < 0.3) return y % 3 === 0 ? RIB : PURD;
          if (hash(x, y, z, 8) < 0.06) return 0x9a7ac8;
          return PUR;
        });
        m.box(0, 27, 0, 0, 30, 0, 0x2a1a1a);
        m.box(-1, 27, -1, 1, 27, 1, 0x2a1a1a);
        // big single eye
        m.project(['.WWWWW.', 'WWWWWWW', 'WWKKKWW', 'WWKKhWW', 'WWKKKWW', 'WWWWWWW', '.WWWWW.'],
          { W, K, h: W }, -3, 22, '+z');
        m.project(['.RRRRR.'], { R: 0xc8304a }, -3, 23, '+z');
        // mouth + long tongue
        m.project(['KKKKK', '.KKK.'], { K: 0x3a0a14 }, -2, 15, '+z');
        const tongue = [[0, 14, 6], [0, 13, 7], [0, 12, 8], [1, 11, 9], [1, 10, 9], [2, 9, 9], [3, 9, 8]];
        for (const [x, y, z] of tongue) m.box(x, y, z, x + 1, y, z, gloss(0xe8405a));
        m.set(0, 13, 6, gloss(0xe8405a)).set(1, 12, 7, gloss(0xe8405a)).set(1, 11, 8, gloss(0xe8405a));
        // little arms, one holding a paper lantern
        m.line(-5, 17, 0, -9, 20, 1, 0xf0c09a);
        m.line(5, 17, 0, 8, 15, 2, 0xf0c09a);
        m.box(8, 14, 2, 8, 14, 2, 0x2a1a1a);
        m.ellipsoid(8, 11, 2, 1.5, 2, 1.5, (x, y) => glow(y === 11 ? 0xff7a2a : 0xffb04a));
        m.box(7, 9, 1, 9, 9, 3, 0x2a1a1a);
        placeRotated(v, m, rotM(0, 0.1, 0), [0, 0, 0]);
        const b = v.bounds();
        if (b.minY < 0) v.translate(0, -b.minY, 0);
      },
    },
  ],
};
