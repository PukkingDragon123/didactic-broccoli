// Series 20 — Bizarre Pose Club (奇妙なポーズ部)
// An affectionate nod to dramatic 80s manga: impossible poses, menacing ゴゴゴ in the air, a guardian spirit
// hovering behind its partner, a pocket watch where time has stopped and a back alley you must not look back in.
import { C, shade, mix } from '../../voxel/palette.js';
import { VoxelModel, MAT, enc, gloss, glow, glass, metal } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;
const SKIN = C.skin;
const PURPLE = 0x8a35d8;
const GOLD = C.gold;
const PINK = 0xff4f9a;
const GO_SHADOW = 0x24123a;

/** Deterministic coordinate hash in [0, 1). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const floorClip = (v) => v.box(-40, -12, -40, 40, -1, 40, null);

/** Rounded box: corners of every edge trimmed. */
function rbox(v, x0, y0, z0, x1, y1, z1, c) {
  v.box(x0, y0, z0, x1, y1, z1, c);
  for (const x of [x0, x1]) for (const z of [z0, z1]) v.box(x, y0, z, x, y1, z, null);
  for (const x of [x0, x1]) for (const y of [y0, y1]) v.box(x, y, z0, x, y, z1, null);
  for (const y of [y0, y1]) for (const z of [z0, z1]) v.box(x0, y, z, x1, y, z, null);
}

/** Rotation matrix R = Ry(yaw) · Rz(roll) · Rx(pitch). +pitch tips the top toward +z, +roll toward -x. */
function rotM(pitch = 0, roll = 0, yaw = 0) {
  const cx = Math.cos(pitch), sx = Math.sin(pitch), cz = Math.cos(roll), sz = Math.sin(roll);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const mul = (A, B) => [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]));
  return mul([cy, 0, sy, 0, 1, 0, -sy, 0, cy], mul([cz, -sz, 0, sz, cz, 0, 0, 0, 1], [1, 0, 0, 0, cx, -sx, 0, sx, cx]));
}
const mulv = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];

/** Copy model `m` into `v` rotated by matrix M around m's origin, then offset by `at` (resampled per target voxel). */
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

/** Hand at h: 'fist' | 'open' (four splayed fingers along dir, fanned across spread) | 'point' (index finger along dir). */
function hand(m, h, a, skin) {
  const kind = a.hand || 'fist', col = a.glove ?? skin;
  if (kind === 'none') return;
  m.sphere(h[0], h[1], h[2], kind === 'fist' ? 1.3 : 1.05, col);
  const d = a.dir || [0, 1, 0], s = a.spread || [1, 0, 0];
  const at = (k, j) => [h[0] + d[0] * k + s[0] * j, h[1] + d[1] * k + s[1] * j, h[2] + d[2] * k + s[2] * j];
  if (kind === 'point') {
    m.line(...at(1, 0), ...at(3.6, 0), col);
    m.line(...at(0.4, -1.4), ...at(1.2, -2), col); // thumb cocked up
  } else if (kind === 'open') {
    for (const j of [-1.5, -0.5, 0.5, 1.5]) m.line(...at(1, j * 1.15), ...at(2.9, j * 2.1), col);
  }
}

const BROWS = { stern: ['KK.....KK', '..KK.KK..'], high: ['.KK...KK.'], flat: ['.KKK.KKK.'] };
const EYES = {
  dot: ['.WK...KW.', '.KK...KK.'],
  sharp: ['.KKK.KKK.', '..WK.KW..'],
  wide: ['.WW...WW.', 'WWK...KWW', '.WW...WW.'],
  glasses: ['GGG...GGG', 'GKGGGGGKG', 'GGG...GGG'],
};
const MOUTHS = { smirk: [-1, ['..M', 'MM.']], flat: [-1, ['MMM']], o: [-1, ['.M.', 'M.M', '.M.']], grin: [-2, ['MMMM', '.WW.']] };

/**
 * Chibi manga kid (own model), facing +z, feet on y=0. Head centre (0, 15.6, 0.3); shoulders (±4.5, 9.5, 0).
 * o: { top, pants, shoe, hair, style: 'short'|'spiky'|'pomp'|'bob'|'pony'|'side', brows, eyes, mouth, skirt, sock,
 *      legs: [[hip, (knee,) ankle] x2], coat, outfit(m), warp(y) -> [dx, dz] (bends the body, head stays upright),
 *      arms: [{ p: [shoulder, (elbow,) hand], hand, dir, spread, sleeve, fore, glove }] }
 * Arm points are given in the unbent pose and follow the warp.
 */
function chibi(o) {
  const m = new VoxelModel();
  const skin = o.skin ?? SKIN, hair = o.hair ?? 0x2a2226, top = o.top, pants = o.pants ?? 0x2a2a3a, shoe = o.shoe ?? 0x2a2224;
  // legs + shoes
  const legs = o.legs || [[[-2, 4.5, 0], [-2, 1, 0]], [[2, 4.5, 0], [2, 1, 0]]];
  for (const leg of legs) {
    for (let i = 0; i < leg.length - 1; i++) m.line(...leg[i], ...leg[i + 1], o.skirt ? skin : pants, o.legR ?? 1.1);
    const [ax, ay, az] = leg[leg.length - 1].map(Math.round);
    if (o.sock) m.paint(() => m.box(ax - 2, ay, az - 2, ax + 2, ay + 1, az + 2, o.sock));
    m.box(ax - 1, ay - 1, az - 1, ax + 1, ay, az + 2, gloss(shoe));
    m.paint(() => m.box(ax - 1, ay - 1, az - 1, ax + 1, ay - 1, az + 2, o.sole ?? shade(shoe, 0.7)));
  }
  // long coat (flares from the chest to the shins)
  if (o.coat) {
    const hem = o.coatHem ?? 2;
    m.shape(-8, hem, -7, 8, 9, 7, (x, y, z) => { const r = 4.2 + (9 - y) * 0.28; return (x * x) / (r * r) + (z * z) / ((r * 0.8) ** 2) <= 1; }, o.coat);
  }
  // torso
  m.ellipsoid(0, 7.6, 0, 4.2, 3.8, 3.1, top);
  if (o.skirt) {
    const sk = o.skirt;
    m.shape(-7, 2, -6, 7, 5, 6, (x, y, z) => Math.hypot(x, z * 1.12) <= 4.3 + (5 - y) * 0.6, sk);
    m.recolor((x, y, z, c) => (c === sk && Math.floor(((Math.atan2(z, x) + Math.PI) / (2 * Math.PI)) * 16) % 2 ? shade(sk, 0.8) : undefined));
  }
  if (o.outfit) o.outfit(m);
  // head + hair cap
  const st = o.style || 'short';
  m.ellipsoid(0, 15.6, 0.3, 5.7, 5.3, 5.2, skin);
  m.recolor((x, y, z, c) => {
    if (c !== skin || y < 10.5) return undefined;
    if (st === 'bob' || st === 'long') return y >= 18 || (Math.abs(x) >= 4.5 && y >= 11) || (z <= -0.5 && y >= 10.5) ? hair : undefined;
    const fringe = st === 'side' || st === 'pomp' ? 19.5 : 19.5 - ((x + 12) % 3 === 0 ? 1 : 0);
    return y >= fringe || (Math.abs(x) >= 5 && y >= 14) || (z <= -1.5 && y >= 12) ? hair : undefined;
  });
  // face
  const L = { K, W, M: 0x8a3a3a, B: shade(skin, 0.86), G: 0x3a3a4a, P: C.blush };
  const brows = o.brows === null ? null : BROWS[o.brows || 'stern'];
  if (brows) m.project(brows, L, -4, 18);
  m.project(EYES[o.eyes || 'dot'], L, -4, 15);
  m.project(['B'], L, 0, 13);
  const [mx, mrows] = MOUTHS[o.mouth || 'flat'];
  m.project(mrows, L, mx, 12);
  if (o.blush) m.project(['PP.......PP'], L, -5, 13);
  // hairstyles
  const hg = gloss(hair);
  if (st === 'spiky') {
    for (const [x, y, z, dx, dy, dz] of [[-3, 19, 1, -0.7, 1, 0.5], [0, 20, 1, 0, 1, 0.6], [3, 19, 1, 0.7, 1, 0.5], [-3, 18, -3, -0.6, 0.7, -0.8], [2, 18, -3, 0.6, 0.7, -0.8], [0, 17, -4, 0, 0.3, -1]]) {
      m.line(x, y, z, x + dx * 2, y + dy * 2, z + dz * 2, hair, 1.1);
      m.line(x + dx * 2, y + dy * 2, z + dz * 2, x + dx * 3.6, y + dy * 3.6, z + dz * 3.6, hair);
    }
  } else if (st === 'pomp') {
    // the pompadour: a huge glossy roll swept up and forward over the brow, with a duck tail behind
    m.ellipsoid(0, 20.4, 0.5, 4.9, 2.2, 4.9, hg);
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, z = 1 + t * 11, y = 21.2 + Math.sin(t * Math.PI * 0.6) * 2.2;
      m.ellipsoid(0, y, z, 4 - t * 0.6, 2.6 - t * 0.3, 1.6, hg);
    }
    m.ellipsoid(0, 21.3, 11.6, 2.9, 1.9, 1.3, hg);
    m.recolor((x, y, z, c) => {
      if (c !== hair || z < 2) return undefined;
      if ((x === -2 || x === 1) && !m.has(x, y + 1, z)) return gloss(0x7a7aa8);
      if (z >= 11 && (x === -1 || x === 2)) return gloss(0x4a4a72);
      return undefined;
    });
    m.ellipsoid(0, 13.5, -5.4, 2.6, 2.2, 1.4, hg);
  } else if (st === 'pony') {
    m.sphere(0, 19.5, -4.6, 1.6, gloss(o.tie ?? PINK));
    m.line(0, 19, -6, 0, 15, -8, hair, 1.5);
    m.line(0, 15, -8, 1, 10, -7.5, hair, 1.1);
  } else if (st === 'bob' || st === 'long') {
    for (const s of [-1, 1]) m.ellipsoid(s * 4.8, st === 'long' ? 12.4 : 13.4, -0.4, 1.4, st === 'long' ? 4.4 : 3.4, 4.2, hair);
    if (st === 'long') m.ellipsoid(0, 12, -3.6, 5, 6.4, 2.4, hair);
    if (o.clip) m.box(3, 18, 4, 4, 18, 4, gloss(o.clip));
  } else if (st === 'side') {
    m.ellipsoid(-2, 19.8, 3.4, 3.2, 1.2, 2.2, hair);
    m.recolor((x, y, z, c) => (c === hair && x === 2 && y >= 20 && z > -2 ? shade(skin, 0.92) : undefined));
  }
  if (o.head) o.head(m);
  // bend the body; the head rides along upright
  let out = m;
  if (o.warp) {
    out = new VoxelModel();
    m.forEach((x, y, z, val) => { const [dx, dz] = o.warp(y); out.set(x + dx, y, z + dz, val); });
  }
  const Wp = (p) => { if (!o.warp) return p; const [dx, dz] = o.warp(Math.round(p[1])); return [p[0] + dx, p[1], p[2] + dz]; };
  // arms
  const arms = o.arms || [{ p: [[-4.5, 9.5, 0], [-6, 6, 1]] }, { p: [[4.5, 9.5, 0], [6, 6, 1]] }];
  for (const a of arms) {
    const pts = a.p.map(Wp);
    for (let i = 0; i < pts.length - 1; i++) out.line(...pts[i], ...pts[i + 1], i === 0 ? (a.sleeve ?? top) : (a.fore ?? a.sleeve ?? top), 1.2);
    hand(out, pts[pts.length - 1], a, skin);
  }
  return out;
}

/** Katakana ゴ (rows top-down), 10 x 9. */
const GO = [
  '......P.P.',
  '.......P.P',
  'PPPPPP....',
  'PPPPPP....',
  '....PP....',
  '....PP....',
  '....PP....',
  'PPPPPP....',
  'PPPPPP....',
];
/** A menacing ゴ glyph cut-out, slanted, 2 voxels thick with a dark drop shadow behind. (x, y) = top-left. */
function goGlyph(v, x, y, z, col = PURPLE) {
  const n = GO.length;
  const each = (fn) => GO.forEach((row, r) => [...row].forEach((ch, i) => { if (ch === 'P') fn(x + i + Math.round((n - 1 - r) * 0.34), y - r, r, i); }));
  each((X, Y) => v.set(X + 1, Y - 1, z - 2, gloss(GO_SHADOW)));
  each((X, Y, r, i) => {
    const edge = r === 0 || GO[r - 1][i] !== 'P';
    v.set(X, Y, z, gloss(edge ? mix(col, W, 0.35) : col));
    v.set(X, Y, z - 1, gloss(shade(col, 0.8)));
  });
}

/** Recolour everything (except glass) to a sepia ramp by luminance, keeping each voxel's material. */
function sepia(v) {
  const ramp = [0x3a2414, 0x6e4a2a, 0xa8784a, 0xd8b07a, 0xf6e6c2];
  v.recolor((x, y, z, c, mat) => {
    if (mat === MAT.GLASS) return undefined;
    const l = (0.3 * ((c >> 16) & 255) + 0.59 * ((c >> 8) & 255) + 0.11 * (c & 255)) / 255;
    const t = Math.min(0.999, Math.max(0, (l - 0.08) * 1.15)) * (ramp.length - 1);
    const i = Math.floor(t);
    return enc(mix(ramp[i], ramp[i + 1], t - i), mat);
  });
}

/** Turn a model into a pale, see-through ghost; very dark detail voxels (eyes, mouth) stay solid. */
function ghostify(v) {
  v.recolor((x, y, z, c) => {
    const l = (0.3 * ((c >> 16) & 255) + 0.59 * ((c >> 8) & 255) + 0.11 * (c & 255)) / 255;
    if (l < 0.22) return gloss(0x22306a);
    return glass(mix(0x3a76d8, 0xd6eeff, Math.min(1, Math.max(0, (l - 0.3) / 0.65))));
  });
}

/** Tiny sitting cat, facing +z, paws at y=0. */
function kitty(coat, light = W) {
  const m = new VoxelModel();
  m.ellipsoid(0, 2.4, -0.3, 2.6, 2.6, 2.3, coat);
  m.paint(() => m.ellipsoid(0, 2, 2, 1.5, 1.8, 0.8, light));
  for (const s of [-1, 1]) m.box(s, 0, 1, s, 1, 2, light);
  m.ellipsoid(0, 6.4, 0.4, 3, 2.5, 2.5, coat);
  m.paint(() => m.ellipsoid(0, 5.6, 2.8, 1.6, 1, 0.6, light));
  for (const s of [-1, 1]) { m.box(s * 2, 8, 0, s * 2, 10, 1, coat); m.set(s * 1, 9, 0, coat).set(s * 1, 9, 1, coat).set(s * 2, 10, 1, null); }
  m.project(['K...K', 'K...K'], { K }, -2, 7);
  m.project(['P'], { P: C.hotpink }, 0, 6);
  for (const [a, b] of [[[1, 1, -2], [3, 2, -4]], [[3, 2, -4], [3.5, 5, -4.5]], [[3.5, 5, -4.5], [2.5, 7, -4]]]) m.line(...a, ...b, coat, 0.7);
  return m;
}

export default {
  id: 'bizarre',
  order: 20,
  name: 'Bizarre Pose Club',
  jp: '奇妙なポーズ部',
  tagline: 'Strike a pose. Menacingly.',
  taglineJp: 'ゴゴゴ…ポーズを決めろ！',
  price: 500,
  themes: ['weird', 'city', 'retro'],
  card: { bg: '#fbe9ff', accent: '#8a35d8', text: '#26123c', accent2: '#ff4f9a', pattern: 'stars' },
  capsule: { colors: [0x8a35d8, 0xffc21f, 0xff4f9a, 0x3fd6c8, 0xffffff] },
  items: [
    {
      id: 'pointer', name: 'The Pointer', jp: 'ビシッと指差し', rarity: 'common',
      desc: 'Points straight at you with total conviction. You have done nothing. Yet.',
      build(v) {
        const VEST = 0x7a3ad0;
        v.merge(chibi({
          top: 0xf4f2ee, pants: 0x2a2a46, shoe: 0xe8343a, sole: W, hair: 0xe8722a, style: 'spiky',
          brows: 'stern', eyes: 'sharp', mouth: 'smirk',
          legs: [[[-2, 4.5, 0], [-3, 1, 0]], [[2, 4.5, 0], [5, 1, 1.5]]],
          warp: (y) => [Math.round(-0.45 * (Math.min(Math.max(y, 5), 11) - 5)), 0],
          outfit(m) {
            // purple school sweater over a white shirt, loosened yellow tie in the V
            m.recolor((x, y, z, c) => (c === 0xf4f2ee && y >= 4.5 && !(z > 1 && y >= 7.5 && Math.abs(x) <= (y - 7.5) * 0.95) ? VEST : undefined));
            m.paint(() => m.box(-5, 4, -4, 5, 4, 4, shade(VEST, 0.75)));
            m.project(['.Y.', 'YYY', '.Y.', '.Y.'], { Y: gloss(0xffc21f) }, -1, 11);
            m.project(['V.V.V'], { V: shade(VEST, 0.8) }, -2, 6);
          },
          arms: [
            { p: [[4.5, 9.5, 0], [7.5, 10.5, 3.5], [9, 11, 7]], hand: 'point', dir: [0.35, 0.05, 1], spread: [0, 1, 0], sleeve: VEST },
            { p: [[-4.5, 9.5, 0], [-7.5, 13.5, 2], [-3, 17.5, 6.5]], hand: 'open', dir: [0.15, 1, 0.1], spread: [1, 0, 0], sleeve: VEST },
          ],
        }));
        floorClip(v);
      },
    },
    {
      id: 'salaryman', name: 'Leaning Salaryman', jp: 'のけぞりサラリーマン', rarity: 'common',
      desc: 'Leans back at an angle physics does not allow. The briefcase is somehow fine.',
      build(v) {
        const SUIT = 0x56607a;
        const lean = (y) => { const t = Math.max(0, Math.min(y, 12) - 4); return [Math.round(0.5 * t), Math.round(-1.05 * t)]; };
        v.merge(chibi({
          top: SUIT, pants: SUIT, shoe: 0x2a1e1a, hair: 0x231c22, style: 'side',
          brows: 'stern', eyes: 'glasses', mouth: 'grin',
          legs: [[[-2, 4.5, 0], [-2, 3, 1.5], [-2.5, 1, 1]], [[2, 4.5, 0], [2, 3, 1.5], [2.5, 1, 1]]],
          warp: lean,
          outfit(m) {
            // white shirt V, red tie
            m.recolor((x, y, z, c) => (c === SUIT && z > 1 && y >= 7 && Math.abs(x) <= (y - 7) * 0.9 ? 0xf6f4ee : undefined));
            m.project(['.R.', 'RRR', '.R.', '.R.', '.R.'], { R: gloss(0xd8303a) }, -1, 11);
            m.project(['G'], { G: gloss(0xd8d0b0) }, -3, 7);
          },
          arms: [
            { p: [[-4.5, 9.5, 0], [-8, 12.5, 3], [-2, 15.5, 7]], hand: 'open', dir: [0.25, 1, 0.2], spread: [1, -0.2, 0], fore: SUIT },
            { p: [[4.5, 9.5, 0], [6.5, 7, 0.5]], hand: 'fist' },
          ],
        }));
        // briefcase dangling from his fingertips
        const bx = 8, bz = -3;
        v.box(bx, 5, bz, bx, 6, bz, gloss(0x3a2418));
        v.box(bx - 1, 1, bz - 3, bx, 4, bz + 3, gloss(0x6a3a22));
        for (const y of [1, 4]) for (const z of [bz - 3, bz + 3]) v.box(bx - 1, y, z, bx, y, z, null);
        v.paint(() => v.box(bx - 1, 3, bz - 3, bx, 3, bz + 3, gloss(0x4a2816)));
        v.set(bx + 1, 3, bz, metal(C.brass)).set(bx + 1, 3, bz - 1, metal(C.brass));
        floorClip(v);
      },
    },
    {
      id: 'gogo_cat', name: 'Menacing Calico', jp: 'ゴゴゴ三毛猫', rarity: 'common',
      desc: 'Sits perfectly still. The air around her rumbles. Nobody knows why.',
      build(v) {
        const WH = 0xfbf6ee, OR = 0xf0902a, BK = 0x2e2628;
        // sitting body + haunches + front legs
        v.ellipsoid(0, 5, -0.8, 4.4, 5, 4, WH);
        for (const s of [-1, 1]) v.ellipsoid(s * 3, 2.6, -1, 2.3, 2.6, 3.3, WH);
        for (const s of [-1, 1]) { v.box(s * 1, 0, 2, s * 2, 5, 3, WH); v.box(s * 1, 0, 3, s * 2, 1, 4, WH); }
        // head + ears
        v.ellipsoid(0, 12.4, 0.6, 5, 4.2, 4.2, WH);
        for (const s of [-1, 1]) {
          for (let i = 0; i < 3; i++) v.box(s * (2 + i * 0.5), 15 + i, -0.5, s * (4.6 - i * 0.3), 15 + i, 1, s < 0 ? OR : BK);
          v.set(s * 3, 15, 1, C.pink).set(s * 3, 16, 1, C.pink);
        }
        // calico patches
        v.paint(() => {
          v.ellipsoid(-3, 14, 0, 3, 2.4, 4, OR);
          v.ellipsoid(4, 12.5, -1, 2.2, 3, 3.5, BK);
          v.ellipsoid(-3, 6, -3, 3, 3.4, 2.6, OR);
          v.ellipsoid(3, 3, -3, 2.6, 2.2, 2.6, BK);
          v.ellipsoid(2, 8, -4, 2, 1.6, 1.4, OR);
        });
        v.paint(() => v.ellipsoid(0, 10.7, 4.2, 2.6, 1.6, 1, WH));
        // very serious face: heavy flat lids over amber eyes, small stern mouth
        v.project(['KKK...KKK', 'YKY...YKY'], { K, Y: gloss(0xffb02a) }, -4, 13);
        v.project(['P'], { P: C.hotpink }, 0, 11);
        v.project(['K.K', '.K.'], { K }, -1, 10);
        for (const s of [-1, 1]) for (const y of [10, 12]) v.set(s * 5, y, 3, C.lightgray).set(s * 6, y, 3, C.lightgray);
        // tail wrapped round the paws, black tip
        const tail = [[3, 1, -4], [5, 1, -1], [5, 1, 2.5], [3, 1, 4.6], [0, 1, 5.2]];
        for (let i = 0; i < tail.length - 1; i++) v.line(...tail[i], ...tail[i + 1], i >= 3 ? BK : OR, 0.9);
        // the menacing ゴゴ on a clear stand
        v.cylinder(12, 0, -1, 2.4, 1, glass(0xe6f4ff));
        v.box(12, 1, -2, 12, 20, -2, glass(0xe6f4ff));
        goGlyph(v, 7, 13, 0);
        goGlyph(v, 9, 26, 0);
        floorClip(v);
      },
    },
    {
      id: 'pompadour', name: 'Pompadour Senpai', jp: 'リーゼント先輩', rarity: 'uncommon',
      desc: 'Calm, polite, unbeatable. Just never, ever say anything about the hair.',
      build(v) {
        const COAT = 0x232c5e, LINING = 0xd8303a;
        v.merge(chibi({
          top: COAT, coat: COAT, coatHem: 2, pants: COAT, shoe: 0x1e1a22, hair: 0x1e1a2a, style: 'pomp',
          brows: 'stern', eyes: 'sharp', mouth: 'flat',
          legs: [[[-2, 4.5, 0], [-3.5, 1, 0]], [[2, 4.5, 0], [3.5, 1, 0]]],
          legR: 1.4,
          outfit(m) {
            // coat opens below the waist over baggy trousers, red lining at the edges
            m.recolor((x, y, z, c) => (c === COAT && z > 1 && y <= 5 && Math.abs(x) < (5.5 - y) * 0.75 ? (Math.abs(x) < (5.5 - y) * 0.75 - 1 ? shade(COAT, 0.62) : LINING) : undefined));
            // standing collar + gold buttons down the front
            m.tube(0, 10, 0, 2.8, 1.4, 2, shade(COAT, 0.75));
            for (const y of [9, 7.5, 6]) m.project(['G'], { G: metal(GOLD) }, 0, Math.round(y));
            m.set(2, 10, 3, metal(GOLD));
          },
          head(m) {
            // sticking plaster on the cheek
            m.project(['PPP', 'PQP'], { P: 0xfff6e8, Q: 0xd8b0a0 }, 3, 14);
          },
          arms: [
            { p: [[-4.5, 9.5, 0], [-5.2, 7, 3], [3.2, 7.6, 5.4]], hand: 'fist' },
            { p: [[4.5, 9.5, 0], [5.2, 7.8, 2.8], [-3.2, 9, 4.2]], hand: 'fist' },
          ],
        }));
        floorClip(v);
      },
    },
    {
      id: 'tbc', name: 'To Be Continued', jp: 'つづく', rarity: 'uncommon',
      desc: 'Frozen mid-jump, in sepia. The next episode airs in an undisclosed number of years.',
      build(v) {
        // film-strip plinth
        v.box(-13, 0, -5, 12, 1, 5, 0x6a5a48);
        v.paint(() => v.box(-13, 0, 5, 12, 1, 5, 0x2a2420));
        for (let x = -12; x <= 11; x += 3) v.set(x, 1, 5, 0xf0e4c8).set(x, 0, 5, 0xf0e4c8);
        // the arrow, propped in the front corner like the last frame of an episode
        const AW = 22, AH = 9, ax = -13, ay = 10, az = 4;
        const inside = (x, y) => x >= 0 && x < AW && y >= 0 && y < AH && ((x <= 5 && Math.abs(y - 4) <= x * 0.85) || (x > 4 && y >= 1 && y <= 7));
        const TXT = ['111.110.011', '.1..101.100', '.1..110.100', '.1..101.100', '.1..110.011'];
        for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
          if (!inside(x, y)) continue;
          const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
          v.box(ax + x, ay - y, az - 1, ax + x, ay - y, az, gloss(edge ? 0x4a2c14 : y < 3 ? 0xc0884a : 0xa8743a));
          const t = TXT[y - 2]?.[x - 8];
          if (t === '1') v.set(ax + x, ay - y, az + 1, gloss(0xf6e8c4));
        }
        // the kid, frozen mid-jump on a clear rod
        v.box(3, 2, -2, 3, 12, -2, glass(0xe6f4ff));
        v.merge(chibi({
          top: 0xe8463a, pants: 0x2f6fd6, shoe: 0xfbf8f2, hair: 0x2a2226, style: 'spiky',
          brows: 'high', eyes: 'dot', mouth: 'o',
          legs: [[[-2, 4.5, 0], [-3, 3.5, 3.5], [-3, 0.5, 3]], [[2, 4.5, 0], [3.5, 3, -2], [3.5, 3, -5]]],
          arms: [
            { p: [[-4.5, 9.5, 0], [-7.5, 13, 1], [-8.5, 17, 2]], hand: 'open', dir: [-0.3, 1, 0], spread: [1, 0, 0.3] },
            { p: [[4.5, 9.5, 0], [8, 10, 0.5], [10, 12.5, 1.5]], hand: 'open', dir: [0.6, 0.8, 0], spread: [0, 0, 1] },
          ],
        }), 3, 8, -2);
        sepia(v);
        floorClip(v);
      },
    },
    {
      id: 'phantom', name: 'Phantom Partner', jp: 'うしろの相棒', rarity: 'rare',
      desc: 'Her guardian spirit copies every pose half a second late. She insists it is on purpose.',
      build(v) {
        // dais
        v.cylinder(0, 0, -1, 10, 2, gloss(0x3a2458));
        v.paint(() => v.tube(0, 1, -1, 10.5, 9, 1, gloss(GOLD)));
        // the spirit, floating behind her and mirroring the pose
        const sp = new VoxelModel();
        const T = glass(0x1fb4a6), TL = glass(0x6fe6d8), TD = glass(0x147a74), MASK = glass(0xe6fffa), EYE = glow(0xff6ab8), LINE = glow(0x8ffff0);
        sp.ellipsoid(0, 20, -5, 6, 4.6, 3.6, T); // chest
        sp.paint(() => sp.ellipsoid(0, 21, -2, 4, 3, 1.4, TL));
        sp.paint(() => sp.shape(-7, 16, -3, 7, 25, 0, (x, y) => Math.abs(Math.abs(x) - (y - 16.5) * 0.75) < 0.55, LINE)); // chest-plate trim
        sp.ellipsoid(0, 15.4, -5.6, 3.8, 3, 2.8, TD); // waist
        sp.paint(() => sp.shape(-5, 15, -3, 5, 15, 0, () => true, LINE));
        sp.set(0, 21, -1, EYE).set(0, 20, -1, EYE).set(-1, 21, -1, EYE).set(1, 21, -1, EYE).set(0, 22, -1, EYE); // heart gem
        for (const [a, b, r] of [[[0, 13, -6], [1, 9, -7.5], 2.2], [[1, 9, -7.5], [3, 5, -7], 1.6], [[3, 5, -7], [1.5, 2.5, -4.5], 1.1]]) sp.line(...a, ...b, TL, r);
        // head: helmet with a smooth mask, slit eyes, a fin crest and swept side fins
        sp.ellipsoid(0, 27.4, -4.6, 3.6, 3.5, 3.3, T);
        sp.paint(() => sp.shape(-4, 24, -3, 4, 28, 0, (x, y, z) => z >= -3.5 + Math.abs(x) * 0.3, MASK));
        sp.project(['EE.EE'], { E: EYE }, -2, 27);
        sp.project(['L'], { L: TD }, 0, 25);
        for (let i = 0; i < 4; i++) sp.box(0, 30 + (i < 2 ? i : 3 - i), -2 - i * 1.5, 0, 31 + (i < 2 ? i : 3 - i), -2 - i * 1.5, TL);
        for (const s of [-1, 1]) sp.line(s * 3.6, 28, -5, s * 6, 30, -7, TL, 0.6);
        // pauldrons + big gauntlet arms (right one extended over her shoulder, left fist on hip)
        for (const s of [-1, 1]) {
          sp.ellipsoid(s * 6.4, 22.6, -5, 2.6, 2.1, 2.7, TD);
          sp.paint(() => sp.shape(s * 4, 22, -8, s * 9, 22, -2, () => true, LINE));
        }
        sp.line(7, 22, -5, 9.5, 21, -1.5, T, 1.5);
        sp.line(9.5, 21, -1.5, 11.5, 20.5, 2.5, TD, 1.8);
        sp.sphere(11.6, 21, 3.2, 1.9, T);
        for (const j of [-1.5, -0.5, 0.5, 1.5]) sp.line(11.6 + j * 1.2, 22.5, 3.6, 11.6 + j * 2.2, 25, 3.9, T);
        sp.paint(() => sp.shape(9, 19, 1, 13, 23, 1, () => true, LINE));
        sp.line(-7, 22, -5, -10, 18.5, -6, T, 1.5);
        sp.line(-10, 18.5, -6, -7.5, 15.5, -4, TD, 1.8);
        sp.sphere(-7, 15.4, -3.6, 1.8, T);
        v.merge(sp);
        // the girl: sailor uniform, palm thrust forward, other hand on hip
        const NAVY = 0x26306a, WHT = 0xf6f4f0;
        v.merge(chibi({
          top: WHT, skirt: NAVY, sock: W, shoe: 0x5a3020, hair: 0x3a2228, style: 'long', clip: PINK,
          brows: 'stern', eyes: 'dot', mouth: 'smirk', legR: 1,
          legs: [[[-2, 4.5, 0], [-3, 1, 0.5]], [[2, 4.5, 0], [3.5, 1, -0.5]]],
          outfit(m) {
            // sailor collar (navy, white stripe) + red scarf knot
            m.paint(() => m.shape(-5, 8, -5, 5, 12, 5, (x, y, z) => (z < 0 && y >= 8.5) || (z >= 0 && y >= 10 && Math.abs(x) >= (y - 9) * 1.1 - 0.5), NAVY));
            m.paint(() => m.shape(-5, 8, -5, 5, 8, 0, () => true, W));
            m.project(['RRR', 'R.R', '.R.'], { R: gloss(0xe0303a) }, -1, 9);
          },
          arms: [
            { p: [[4.5, 9.5, 0], [7, 11, 3], [8.5, 12, 6.5]], hand: 'open', dir: [0, 1, 0.15], spread: [1, 0, 0] },
            { p: [[-4.5, 9.5, 0], [-7.5, 7.5, -0.5], [-4.6, 5.6, 1]], hand: 'fist' },
          ],
        }), 0, 2, 1);
        floorClip(v);
      },
    },
    {
      id: 'watch', name: 'Time-Stop Pocket Watch', jp: '時止めの懐中時計', rarity: 'ultra',
      desc: 'The tea has been in mid-air for nine seconds. The butler has been bowing since Tuesday.',
      build(v) {
        const g = gloss(GOLD), gL = gloss(0xffe08a), gD = gloss(shade(GOLD, 0.72));
        // velvet cushion with gold piping and tassels
        const VEL = 0x5a2496;
        v.ellipsoid(0, 1, 1, 13, 2.6, 7.4, VEL);
        v.recolor((x, y, z, c) => (c === VEL && y >= 3 ? 0x7a3cc0 : c === VEL && y === 1 && Math.hypot(x / 13, (z - 1) / 7.4) > 0.86 ? GOLD : undefined));
        for (const s of [-1, 1]) { v.box(s * 13, 0, 1, s * 14, 1, 1, gloss(GOLD)); v.set(s * 14, 2, 1, gloss(GOLD)); }
        // the watch, upright, dial to the front
        const cy = 13.5, R = 11, RD = 9.6;
        v.cylinder(0, cy, -5, R, 4, g, 'z');
        v.tube(0, cy, -1, R, RD, 3, gL, 'z');
        v.recolor((x, y, z, c, mat) => (z >= -1 && Math.hypot(x, y - cy) > RD + 0.4 && mat === MAT.GLOSS && c === 0xffe08a && Math.floor(Math.atan2(y - cy, x) * 12) % 2 === 0 ? shade(GOLD, 0.85) : undefined));
        v.cylinder(0, cy, -1, RD, 1, gloss(0xfbf6ea), 'z');
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6, sx = Math.sin(a), cyy = Math.cos(a);
          v.set(Math.round(sx * 8.3), Math.round(cy + cyy * 8.3), -1, i % 3 === 0 ? gloss(GOLD) : gloss(0x2a2440));
          if (i % 3 === 0) v.set(Math.round(sx * 7.2), Math.round(cy + cyy * 7.2), -1, gloss(GOLD));
        }
        // blued hands stopped at ten past ten, red seconds hand
        const handLine = (deg, len, col, w = 0) => {
          const a = (deg * Math.PI) / 180;
          v.line(0, cy, 0, Math.sin(a) * len, cy + Math.cos(a) * len, 0, col, w);
        };
        handLine(-60, 5, gloss(0x2a3a8a));
        v.line(0, cy + 1, 0, Math.sin(-Math.PI / 3) * 4, cy + 1 + Math.cos(-Math.PI / 3) * 4, 0, gloss(0x2a3a8a));
        handLine(60, 7.6, gloss(0x2a3a8a));
        handLine(205, 8.4, gloss(0xd8303a));
        handLine(25, 1.6, gloss(0xd8303a));
        v.sphere(0, cy, 0, 1, gL);
        v.cylinder(0, cy, 1, RD, 1, glass(0xe8f6ff), 'z');
        // crown, bow and the chain draping down the left
        v.box(-1, 25, -3, 1, 25, -2, gD);
        v.cylinder(0, 26, -2.5, 1.8, 2, gL);
        v.recolor((x, y, z, c) => (y >= 26 && y <= 27 && c === 0xffe08a && (x + z) % 2 === 0 ? shade(GOLD, 0.8) : undefined));
        v.torus(0, 30.2, -2.5, 2.3, 0.55, g, 'z');
        const chain = [[-2, 29, -2.5], [-7, 27, -1], [-11.5, 22, 1], [-13, 14, 2.5], [-12, 6, 3.5], [-9, 3.6, 5]];
        let k = 0;
        for (let i = 0; i < chain.length - 1; i++) {
          const [a, b] = [chain[i], chain[i + 1]];
          const n = Math.ceil(Math.max(...a.map((q, j) => Math.abs(b[j] - q))));
          for (let s = 0; s < n; s++) {
            const t = s / n;
            v.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, metal(k++ % 2 ? 0xd8a838 : 0xfff0b0));
          }
        }
        // the tiny butler, frozen mid-bow, tray held out with the cup tumbling off it
        const bx = 7, by = 3, bz = 4.6;
        const BLK = 0x23202c;
        for (const s of [-1, 1]) {
          v.box(bx + s, by + 1, bz, bx + s * 2, by + 3, bz, BLK);
          v.box(bx + s, by, bz, bx + s * 2, by, bz + 1, gloss(0x141218));
        }
        v.box(bx - 2, by + 2, bz - 1, bx + 2, by + 4, bz - 1, BLK); // coat tails
        v.box(bx - 1, by + 1, bz - 2, bx - 1, by + 3, bz - 2, BLK).box(bx + 1, by + 1, bz - 2, bx + 1, by + 3, bz - 2, BLK);
        const up = new VoxelModel();
        up.ellipsoid(0, 2.4, 0, 2.8, 2.6, 2.1, BLK);
        up.paint(() => up.shape(-3, 1, 1, 3, 5, 3, (x, y) => Math.abs(x) <= (y - 1) * 0.6, 0xf6f4ee));
        up.set(0, 4, 2, gloss(0xd8303a)).set(-1, 4, 2, gloss(0xd8303a)).set(1, 4, 2, gloss(0xd8303a));
        up.ellipsoid(0, 7.4, 0.2, 3.3, 3.1, 3.1, SKIN);
        up.recolor((x, y, z, c) => (c === SKIN && (y >= 9 || z <= -1) ? 0xb8b4be : undefined));
        up.project(['K...K'], { K }, -2, 8);
        up.project(['MM.MM'], { M: 0xb8b4be }, -2, 6);
        up.line(-2.6, 4, 0.5, -1, 2.6, 2.6, BLK, 0.9);
        up.sphere(-0.6, 2.6, 2.8, 0.8, W);
        placeRotated(v, up, rotM(0.75), [bx, by + 4, bz]);
        const sh = mulv(rotM(0.75), [2.6, 4, 0]);
        const S = [bx + sh[0], by + 4 + sh[1], bz + sh[2]], Hd = [S[0] + 3.5, S[1] + 0.5, S[2] + 1.5];
        v.line(...S, ...Hd, BLK, 0.9);
        v.sphere(...Hd, 0.8, W);
        v.cylinder(Math.round(Hd[0]), Math.round(Hd[1]) + 1, Math.round(Hd[2]), 2.2, 1, metal(C.silver));
        const tx = Math.round(Hd[0]), ty = Math.round(Hd[1]) + 2, tz = Math.round(Hd[2]);
        v.cylinder(tx, ty, tz, 1.4, 1, gloss(W));
        // teacup flipped in mid-air, the tea frozen in a splash
        v.box(tx + 1, ty + 4, tz, tx + 2, ty + 5, tz + 1, gloss(W)).set(tx + 3, ty + 5, tz, gloss(W));
        v.set(tx + 1, ty + 6, tz, gloss(W));
        const TEA = glass(0xb8642a);
        for (const [x, y, z] of [[0, 4, 0], [-1, 5, 0], [-1, 6, 1], [-2, 6, 0], [-3, 7, 1], [1, 7, 1], [-2, 8, 0], [0, 9, 1], [2, 8, 0]]) v.set(tx + x, ty + y, tz + z, TEA);
        // stopped time: a shell of inverted colour expanding from the dial
        v.recolor((x, y, z, c, mat) => {
          const d = Math.hypot(x, y - cy, (z + 1) * 1.6);
          return d >= 6.2 && d < 7.4 && mat !== MAT.GLASS ? enc(c ^ 0xffffff, mat) : undefined;
        });
        floorClip(v);
      },
    },
    {
      id: 'alley', name: 'Ghost Alley Girl', jp: '小道のおばけ少女', rarity: 'secret',
      desc: 'A friendly guide to the back alley. Walk with her as far as you like. Just never look back.',
      build(v) {
        // cobbled alley floor
        v.box(-13, 0, -8, 13, 1, 7, (x, y, z) => (hash(x >> 1, 0, z >> 1, 7) < 0.5 ? 0x7c7884 : hash(x, y, z, 3) < 0.3 ? 0x6a6672 : 0x8a8692));
        v.paint(() => v.shape(-13, 1, -8, 13, 1, 7, (x, y, z) => (x & 1) === 0 && (z & 1) === 0 && hash(x, 1, z, 9) < 0.25, 0x5a5662));
        // concrete block wall with a cap and a little moss
        v.box(-13, 2, -8, 13, 16, -6, (x, y, z) => ((y - 2) % 4 === 3 || (x + 13 + ((y - 2) >> 2) % 2 * 3) % 6 === 5 ? 0x9a948a : hash(x, y, z, 5) < 0.2 ? 0xb0aa9e : 0xbdb6a8));
        v.box(-14, 17, -9, 14, 17, -5, 0xd2ccbe);
        v.paint(() => v.shape(-13, 2, -6, 13, 4, -6, (x, y) => hash(x, y, 0, 11) < 0.45 - (y - 2) * 0.15, C.moss));
        for (const [x, h] of [[-12, 3], [-10, 2], [11, 3], [12, 2]]) v.box(x, 2, -5, x, 1 + h, -5, C.grassDark);
        // the street plaque: 振り / 返るな
        const PL = { x: -2, y: 15 };
        v.box(PL.x, PL.y - 12, -5, PL.x + 15, PL.y, -5, gloss(0xc8303a));
        v.box(PL.x + 1, PL.y - 11, -4, PL.x + 14, PL.y - 1, -4, gloss(0xf6f2ea));
        const G1 = { furi: ['.1111', '111..', '.1111', '.1.1.', '11.11'], ri: ['1.1', '1.1', '1.1', '..1', '.1.'],
          kae: ['1.111', '.11..', '..111', '1.1.1', '11111'], ru: ['111', '.1.', '111', '1.1', '111'], na: ['.1..', '1111', '.1.1', '1.11', '.11.'] };
        const glyphRow = (keys, gx, gy) => { let x = gx; for (const k of keys) { v.layer(G1[k], { 1: gloss(0x1e1a2a) }, { x, y: gy, z: -3 }); x += G1[k][0].length + 1; } };
        glyphRow(['furi', 'ri'], PL.x + 1, PL.y - 1);
        glyphRow(['kae', 'ru', 'na'], PL.x + 1, PL.y - 7);
        // the ghost girl, hovering, beckoning you along
        const girl = chibi({
          top: 0x9cbce6, skirt: 0x9cbce6, hair: 0x5a72b0, style: 'bob', clip: 0xffffff, shoe: 0x8aa8d8, sock: 0xf0f0f0,
          brows: null, eyes: 'dot', mouth: 'smirk', blush: true, legR: 1,
          arms: [
            { p: [[4.5, 9.5, 0], [7, 12, 2], [7, 16, 3.5]], hand: 'open', dir: [0, 1, 0.2], spread: [1, 0, 0] },
            { p: [[-4.5, 9.5, 0], [-5.5, 6, 1.5]], hand: 'fist' },
          ],
        });
        ghostify(girl);
        v.merge(girl, -7, 3, 0);
        v.cylinder(-7, 2, 0, 3.4, 1, glow(0xbfe8ff));
        v.cylinder(-7, 2, 0, 2.2, 1, glass(0xe6f6ff));
        // her ghost cat, perched on the wall
        const cat = kitty(0xd8e6f6, W);
        ghostify(cat);
        cat.recolor((x, y, z, c, mat) => (mat !== MAT.GLASS ? glow(0x7ff6ff) : undefined));
        v.merge(cat, 9, 18, -7);
        // wisps
        for (const [x, y, z] of [[-1, 18, 2], [0, 19, 2], [-12, 20, 2], [-13, 19, 1]]) v.set(x, y, z, glass(0xd8f0ff));
        floorClip(v);
      },
    },
  ],
};
