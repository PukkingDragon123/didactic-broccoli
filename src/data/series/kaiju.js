// Series 10 — Kaiju Snack Time (怪獣おやつタイム)
// Chubby baby kaiju caught mid-snack. Rampage cancelled: it's oyatsu o'clock.
import { C, shade, mix } from '../../voxel/palette.js';
import { VoxelModel, gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

/** Deterministic coordinate hash in [0, 1). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Solid of revolution along an arbitrary direction. rFn(t) = radius at distance t from the base. */
function lathe(v, [bx, by, bz], dir, len, rFn, c) {
  const n = Math.hypot(dir[0], dir[1], dir[2]);
  const [ax, ay, az] = dir.map((k) => k / n);
  let rMax = 0;
  for (let t = 0; t <= len; t += 0.25) rMax = Math.max(rMax, rFn(t));
  const ex = [bx, bx + ax * len], ey = [by, by + ay * len], ez = [bz, bz + az * len];
  const tOf = (x, y, z) => (x - bx) * ax + (y - by) * ay + (z - bz) * az;
  v.shape(
    Math.floor(Math.min(...ex) - rMax - 1), Math.floor(Math.min(...ey) - rMax - 1), Math.floor(Math.min(...ez) - rMax - 1),
    Math.ceil(Math.max(...ex) + rMax + 1), Math.ceil(Math.max(...ey) + rMax + 1), Math.ceil(Math.max(...ez) + rMax + 1),
    (x, y, z) => {
      const t = tOf(x, y, z);
      if (t < -0.5 || t > len + 0.5) return false;
      const px = x - bx - ax * t, py = y - by - ay * t, pz = z - bz - az * t;
      const r = rFn(Math.max(0, Math.min(len, t)));
      return r > 0 && px * px + py * py + pz * pz <= (r + 0.2) * (r + 0.2);
    },
    typeof c === 'function' ? (x, y, z) => c(tOf(x, y, z), x, y, z) : c,
  );
  return v;
}

/** Chunky triangular dorsal plate centred on x=0, growing out of (y,z) along the normal (ny,nz). */
function plate(v, y, z, ny, nz, h, w, c, tip, xw = 1.4) {
  const n = Math.hypot(ny, nz);
  ny /= n; nz /= n;
  const ty = -nz, tz = ny;
  const R = Math.ceil(h + w + 3);
  v.shape(-3, Math.floor(y - R), Math.floor(z - R), 3, Math.ceil(y + R), Math.ceil(z + R), (x, yy, zz) => {
    const dy = yy - y, dz = zz - z;
    const t = dy * ny + dz * nz, s = dy * ty + dz * tz;
    if (t < -1 || t > h) return false;
    const f = Math.min(1, 1 - t / h);
    return Math.abs(s) <= w * f + 0.3 && Math.abs(x) <= xw * f + 0.1;
  }, (x, yy, zz) => (((yy - y) * ny + (zz - z) * nz) > h * 0.45 && tip ? tip : c));
}

/** Remove everything below the floor. */
const floorClip = (v) => v.box(-40, -12, -40, 40, -1, 40, null);

/**
 * Chubby baby kaiju (own model), facing +z, bottom on y=0, centred on x=0.
 * o: { body, belly, plate, tip, cheek, eyes: 'normal'|'happy'|'shock'|'closed', mouth, tail: 1|-1, stand, horns }
 * Returns { m, lift } — shoulders sit at (±6, 10+lift, 1.5), mouth at (0, 12+lift, 7.5).
 */
function makeKaiju(o) {
  const m = new VoxelModel();
  const L = o.stand ? 3 : 0;
  const body = o.body, belly = o.belly, bellyDark = shade(belly, 0.86);
  const dark = shade(body, 0.8);
  // torso + head (chibi: head as big as the body)
  m.ellipsoid(0, 6.5 + L, 0, 7, 6.5, 6, body);
  m.ellipsoid(0, 15 + L, 0.5, 6.5, 5.5, 5.5, body);
  // striped belly
  m.paint(() => m.ellipsoid(0, 6 + L, 5, 4.5, 5.5, 3, belly));
  m.recolor((x, y, z, c) => (c === belly && (y - L) % 2 === 0 ? bellyDark : undefined));
  // snout with lighter jaw
  m.ellipsoid(0, 12.5 + L, 4.6, 4, 2.4, 2.6, body);
  m.paint(() => m.box(-5, 9 + L, 4, 5, 11 + L, 8, shade(belly, 1.02)));
  if (o.stand) {
    m.box(-8, 0, -8, 8, L - 1, 8, null);
    for (const s of [-1, 1]) {
      const [dx, dy, dz] = s > 0 && o.footR ? o.footR : [0, 0, 0];
      m.ellipsoid(3.6 * s + dx * 0.4, 3.2 + dy * 0.6, 0.5 + dz * 0.4, 2.6, 3, 2.8, body);
      m.ellipsoid(3.6 * s + dx, 1 + dy, 1.8 + dz, 2.6, 1.3, 3.2, body);
      m.paint(() => m.box(3.6 * s + dx - 3, dy, 4 + dz, 3.6 * s + dx + 3, dy, 6 + dz, dark));
      const fx = Math.round(3.6 * s + dx), fz = Math.round(5 + dz);
      m.set(fx - 1, dy, fz, W).set(fx + 1, dy, fz, W).set(fx, dy + 1, fz, W);
    }
  } else {
    // stubby feet poking forward with toe claws
    for (const s of [-1, 1]) {
      m.ellipsoid(4 * s, 2, 4.5, 2.5, 2, 3, body);
      m.paint(() => m.box(4 * s - 3, 0, 7, 4 * s + 3, 1, 8, dark));
      m.set(4 * s - 1, 1, 8, W).set(4 * s + 1, 1, 8, W).set(4 * s, 2, 8, W);
    }
  }
  // tail curling round to the side so it shows from the front
  const ts = o.tail ?? 1;
  const tailPts = ts ? [[0, 3.5, -5.5, 3.2], [1 * ts, 2.8, -8.5, 2.6], [3 * ts, 2.2, -10.8, 2.1], [5.5 * ts, 1.8, -12, 1.7], [8 * ts, 1.6, -12, 1.3], [9.8 * ts, 2.2, -11, 1]]
    : [[0, 3.5, -5.5, 3.2], [0, 2.6, -8.5, 2.6], [0, 2, -11, 2], [0, 2, -13, 1.5], [0, 2.8, -14.5, 1]];
  for (const [x, y, z, r] of tailPts) m.sphere(x, y + (o.stand ? 1 : 0), z, r, body);
  m.paint(() => { for (const [x, y, z, r] of tailPts.slice(1)) m.ellipsoid(x, y - r * 0.7 + (o.stand ? 1 : 0), z, r, r * 0.5, r, shade(belly, 0.95)); });
  // dorsal plates: head, back, tail
  const pl = o.plate, tip = o.tip || shade(o.plate, 1.2);
  if (o.plates !== false) {
    for (const [deg, h, w] of [[6, 3.4, 2.2], [46, 4.2, 2.6], [88, 3.6, 2.3]]) {
      const a = (deg * Math.PI) / 180, ny = Math.cos(a), nz = -Math.sin(a);
      plate(m, 15 + L + 5.3 * ny, 0.5 + 5.3 * nz, ny, nz, h, w, pl, tip);
    }
    for (const [deg, h, w] of [[112, 3, 2], [140, 2.2, 1.6]]) {
      const a = (deg * Math.PI) / 180, ny = Math.cos(a), nz = -Math.sin(a);
      plate(m, 6.5 + L + 6.2 * ny, 5.8 * nz, ny, nz, h, w, pl, tip);
    }
  }
  if (o.horns === 'nubs') {
    for (const s of [-1, 1]) { m.sphere(3 * s, 20 + L, 1, 1.3, tip); m.set(3 * s, 22 + L, 1, tip); }
  } else if (o.horns === 'fins') {
    // frilly ear-fins fanning out of the cheeks
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) m.box(s * (5 + i), 15 + L - (i > 1 ? 1 : 0), -1, s * (5 + i), 16 + L + i, 0, i === 3 ? tip : pl);
    }
  }
  // face
  const F = { K: o.eye || K, W, P: o.cheek || C.blush, M: K, T: C.tongue, F: W, N: shade(body, 0.6) };
  const eyes = {
    normal: [['KW.....KW', 'KK.....KK', 'KK.....KK'], -4, 18],
    happy: [['.K.....K.', 'K.K...K.K'], -4, 18],
    closed: [['.........', 'KK.....KK'], -4, 18],
    shock: [['.KK.....KK.', 'KWWK...KWWK', 'KWWK...KWWK', '.KK.....KK.'], -5, 19],
  }[o.eyes || 'normal'];
  m.project(eyes[0], F, eyes[1], eyes[2] + L);
  m.project(['PP.......PP'], F, -5, 15 + L);
  m.project(['N.N'], F, -1, 14 + L); // nostrils
  const mouths = {
    grin: ['MMMMM', 'FMTMF', '.MMM.'],
    open: ['.MMM.', 'MTTTM', '.MMM.'],
    chomp: ['MFMFM', '.MMM.'],
    o: ['.M.', 'MTM', '.M.'],
  };
  m.project(mouths[o.mouth || 'grin'], F, -2, 12 + L);
  floorClip(m);
  return { m, lift: L };
}

/** Short chubby arm from shoulder to hand. */
function arm(v, from, to, color) {
  v.line(from[0], from[1], from[2], to[0], to[1], to[2], color, 1.4);
  v.sphere(to[0], to[1], to[2], 1.6, color);
}

// ------------------------------------------------------------------ snacks
/** Taiyaki (fish-shaped waffle), head pointing +x, flat face towards +z. */
function taiyaki(v, cx, cy, cz) {
  const tb = 0xf2b65c, tbD = 0xc07a34, tbM = 0xd99447, tbL = 0xffd88a;
  v.ellipsoid(cx + 1, cy, cz, 5, 3.4, 1.6, tb);
  // tail fan with a forked end
  [1, 1.6, 2.4, 3].forEach((hw, i) => {
    const x = cx - 4 - i;
    v.box(x, Math.round(cy - hw), i < 2 ? cz - 1 : cz, x, Math.round(cy + hw), i < 2 ? cz + 1 : cz, tb);
  });
  v.box(cx - 7, cy - 1, cz, cx - 7, cy + 1, cz, null);
  // fins
  v.box(cx - 1, cy + 4, cz, cx + 2, cy + 4, cz, tb).box(cx, cy + 5, cz, cx + 1, cy + 5, cz, tb);
  v.box(cx, cy - 4, cz, cx + 1, cy - 4, cz, tb);
  // crispy toasted rim + golden middle
  v.paint(() => v.shape(cx - 8, cy - 6, cz - 2, cx + 7, cy + 6, cz + 2, (x, y, z) => !v.has(x, y + 1, z) || !v.has(x, y - 1, z) || !v.has(x + 1, y, z) || !v.has(x - 1, y, z), tbM));
  v.paint(() => v.ellipsoid(cx + 1, cy, cz + 2, 2.6, 1.6, 1, tbL));
  // scales (little v's) and tail ridges
  v.project(['d.d.d', '.d.d.', 'd.d.d'], { d: tbM }, cx - 3, cy + 1);
  v.project(['d', '.', 'd'], { d: tbD }, cx - 6, cy + 1);
  // face: eye, gill, smiling mouth
  v.project(['.d.k', '.d..', 'd..m'], { d: tbD, k: K, m: tbD }, cx + 2, cy + 2);
  // a bite out of the tail end, showing anko
  v.sphere(cx - 6.5, cy + 2.4, cz, 2, null);
  v.paint(() => v.shape(cx - 9, cy - 2, cz, cx - 2, cy + 5, cz, (x, y) => Math.hypot(x - cx + 6.5, y - cy - 2.4) < 3.3, C.anko));
}

function dango(v, x, y, z) {
  v.box(x, y, z, x, y + 17, z, C.bamboo);
  for (const [by, c] of [[y + 5, 0x9fd06e], [y + 10, C.rice], [y + 15, 0xffa9c0]]) {
    v.sphere(x, by, z, 2.4, c);
    v.set(x - 1, by + 1, z + 3, shade(c, 1.12)).set(x - 2, by + 1, z + 2, shade(c, 1.12));
  }
  v.set(x, y + 18, z, C.bamboo);
}

/** Glossy ring donut standing up (axis z) with frosting + sprinkles on the front. */
function donut(v, cx, cy, cz, frost = 0xff8fb8) {
  v.torus(cx, cy, cz, 2.8, 1.4, C.crust, 'z');
  v.paint(() => v.shape(cx - 5, cy - 5, cz, cx + 5, cy + 5, cz + 3, (x, y) => y > cy - 2 || Math.abs(x - cx) > 2, gloss(frost)));
  const sp = [C.yellow, C.sky, W, C.lime, C.purple];
  v.paint(() => v.shape(cx - 5, cy - 5, cz + 1, cx + 5, cy + 5, cz + 3, (x, y, z) => decGloss(v, x, y, z) && hash(x, y, z, 7) < 0.3, (x, y, z) => gloss(sp[Math.floor(hash(x, y, z, 3) * sp.length)])));
}
const decGloss = (v, x, y, z) => !v.has(x, y, z + 1);

/** Classic biscuit stick, partly chocolate-dipped (t >= choc). Two voxels thick when wide. */
function stick(v, a, b, choc = 2, wide = false, dip = 0x5a3020) {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t), z = Math.round(a[2] + (b[2] - a[2]) * t);
    const c = t >= choc ? dip : 0xe9b56a;
    v.set(x, y, z, c);
    if (wide) v.set(x + (x > 0 ? -1 : 1), y, z, c);
  }
}

// ------------------------------------------------------------------ series
export default {
  id: 'kaiju',
  order: 10,
  name: 'Kaiju Snack Time',
  jp: '怪獣おやつタイム',
  tagline: 'Baby monsters on a sugar rampage',
  taglineJp: 'ガオー！おやつの時間だ！',
  price: 500,
  themes: ['city', 'weird', 'candy'],
  card: { bg: '#e6f4d4', accent: '#3cae5a', text: '#24361f', accent2: '#ff8c2e', pattern: 'grid' },
  capsule: { colors: [0x6fcf6a, 0xff8c2e, 0xffb7c8, 0x5cc4ff, 0xffd23f] },
  items: [
    {
      id: 'taiyaki', name: 'Gao-chan & Taiyaki', jp: 'ガオちゃんとたい焼き', rarity: 'common',
      desc: 'Always eats taiyaki tail-first. Nobody knows why. Nobody dares ask.',
      build(v) {
        const g = 0x6fcf6a;
        v.merge(makeKaiju({ body: g, belly: 0xf3f0b8, plate: 0xd8f57a, tip: 0xf6ffb0, mouth: 'chomp' }).m);
        arm(v, [-6, 10, 1.5], [-7, 7, 6.5], g);
        arm(v, [6, 10, 1.5], [7, 7, 6.5], g);
        taiyaki(v, 0, 9, 8.5);
        v.set(-1, 10, 8, C.crust).set(2, 9, 8, C.crust); // crumbs on the chin
      },
    },
    {
      id: 'dango', name: 'Hanami Dango Kaiju', jp: '花より団子怪獣', rarity: 'common',
      desc: 'Hana yori dango: dumplings over blossoms. Has not looked at one flower.',
      build(v) {
        const p = 0xff9cc0;
        v.merge(makeKaiju({ body: p, belly: 0xfff0e6, plate: 0xff6f9a, tip: 0xffd1dc, mouth: 'open', eyes: 'happy', horns: 'nubs', tail: -1 }).m);
        dango(v, 10, 8, 5);
        arm(v, [6, 10, 1.5], [10, 10, 5], p);
        arm(v, [-6, 10, 1.5], [-4, 6, 6], p);
        // the ignored sakura blossom clipped to its head
        v.layer(['.s.', 'sYs', '.s.'], { s: C.sakura, Y: C.yellow }, { x: -6, y: 21, z: 3, plane: 'xy' });
        v.set(-5, 21, 4, C.sakuraDeep);
      },
    },
    {
      id: 'ramune', name: 'Ramune Gulp Kaiju', jp: 'ラムネ怪獣', rarity: 'common',
      desc: 'Has spent forty minutes trying to get the marble out. Will not give up.',
      build(v) {
        const b = 0x6fb8ff;
        v.merge(makeKaiju({ body: b, belly: 0xe6f6ff, plate: 0x2f6fd6, tip: 0x9fe0ff, mouth: 'o', horns: 'fins' }).m);
        // tilted ramune bottle up to the snout: soda core + glass shell, marble in the neck
        const base = [0, 4, 11], dir = [0, 0.9, -0.44];
        const prof = (t) => (t < 5 ? 2.6 : t < 6 ? 2 : t < 7 ? 1.3 : t < 8.5 ? 1.7 : 1.3);
        lathe(v, base, dir, 10, prof, (t) => (t > 9 ? gloss(C.plasticBlue) : glass(0xb8ecff)));
        lathe(v, base, dir, 5.5, (t) => (t < 5 ? 1.6 : 1), gloss(0x8fd6ff));
        lathe(v, base, dir, 3.5, (t) => (t > 1 && t < 3.5 ? 3 : 0), (t) => (t > 2 && t < 2.8 ? gloss(W) : gloss(C.blue)));
        const n = Math.hypot(...dir);
        v.sphere(0, Math.round(base[1] + (dir[1] / n) * 7.6), Math.round(base[2] + (dir[2] / n) * 7.6), 0.8, gloss(0xeefcff));
        arm(v, [-6, 10, 1.5], [-3, 8, 10], b);
        arm(v, [6, 10, 1.5], [3, 8, 10], b);
      },
    },
    {
      id: 'purin', name: 'Purin Funjatta!', jp: 'プリンふんじゃった', rarity: 'uncommon',
      desc: 'Stepped on the giant purin. Now has one very sticky, very happy foot.',
      build(v) {
        const pu = 0xa98cf2;
        // plate + giant purin first, so the foot squishes into it
        const px = 6, pz = 3;
        v.cylinder(px, 0, pz, 6.5, 1, gloss(C.ceramic));
        v.paint(() => v.shape(px - 7, 0, pz - 7, px + 7, 0, pz + 7, (x, y, z) => Math.abs(Math.hypot(x - px, z - pz) - 5.8) < 0.5, gloss(C.blue)));
        const custard = 0xffd36b, caramel = 0x8a4418;
        lathe(v, [px, 1, pz], [0, 1, 0], 6, (t) => 4.8 - t * 0.2, (t, x, y, z) => {
          const a = Math.atan2(z - pz, x - px);
          const drip = 1 + Math.floor(hash(Math.round(a * 4), 0, 0, 5) * 3.2);
          return gloss(t > 5.5 - drip && Math.hypot(x - px, z - pz) > 3.2 || t > 5.4 ? caramel : custard);
        });
        // whipped cream + cherry on the far side
        v.ellipsoid(px + 2, 8, pz - 1, 1.8, 1.2, 1.8, C.white);
        v.set(px + 2, 9, pz - 1, C.white);
        v.sphere(px + 2, 10.5, pz - 1, 1, gloss(C.red));
        v.set(px + 2, 12, pz - 1, C.leaf).set(px + 3, 13, pz - 1, C.leaf);
        // spoon resting on the plate
        v.box(px + 1, 1, pz + 5, px + 5, 1, pz + 5, metal(C.silver));
        v.ellipsoid(px + 6, 1, pz + 5, 1, 0.4, 0.8, metal(C.silver));
        // the kaiju, mid-stomp
        const k = makeKaiju({ body: pu, belly: 0xf4eeff, plate: 0x6a4fd0, tip: 0xd8ccff, mouth: 'open', eyes: 'shock', stand: true, tail: 0, footR: [3.5, 4, 3] });
        v.merge(k.m, -4, 0, -1);
        // arms flung up in panic
        arm(v, [-10, 13, 0.5], [-12, 17, 1.5], pu);
        arm(v, [2, 13, 0.5], [4, 17, 1.5], pu);
        // custard + caramel splash around the foot
        for (const [x, y, z, c] of [[1, 8, 5, custard], [5, 8, 6, caramel], [2, 8, 1, custard], [6, 8, 4, custard], [0, 7, 3, caramel]]) v.sphere(x, y, z, 0.7, gloss(c));
        // sweat drop
        v.set(4, 21, 2, glass(0x9fe3ff)).set(4, 20, 2, glass(0x9fe3ff)).set(5, 20, 2, glass(0x9fe3ff));
      },
    },
    {
      id: 'buriki', name: 'Wind-up Tin Kaiju', jp: 'ブリキ怪獣', rarity: 'uncommon',
      desc: 'Wind it up and it eats one donut. Wind it up again. Repeat until broke.',
      build(v) {
        const red = gloss(0xd8382f), redD = gloss(0xa82620), sil = metal(C.silver), yel = gloss(C.yellow);
        const bevel = (x0, y0, z0, x1, y1, z1, c) => {
          v.box(x0, y0, z0, x1, y1, z1, c);
          for (const x of [x0, x1]) for (const z of [z0, z1]) v.box(x, y0, z, x, y1, z, null);
          for (const x of [x0, x1]) for (const y of [y0, y1]) v.box(x, y, z0, x, y, z1, null);
        };
        // feet + legs
        for (const s of [-1, 1]) {
          bevel(s * 1, 0, -3, s * 5, 1, 4, sil);
          v.box(s * 2, 2, -1, s * 4, 4, 1, redD);
          v.set(s * 3, 1, 5, sil).set(s * 2, 0, 5, sil).set(s * 4, 0, 5, sil); // toe claws
        }
        // body with printed belly plate, rivets and a gear window
        bevel(-5, 5, -4, 5, 14, 4, red);
        v.box(-5, 5, -4, 5, 5, 4, redD).box(-5, 14, -4, 5, 14, 4, redD);
        v.paint(() => { v.box(-6, 6, -5, 6, 6, 5, yel); v.box(-6, 13, -5, 6, 13, 5, yel); });
        v.box(-3, 7, 5, 3, 12, 5, sil);
        for (const [x, y] of [[-3, 7], [3, 7], [-3, 12], [3, 12]]) v.set(x, y, 5, metal(C.steel));
        v.box(-2, 8, 5, 2, 11, 5, glass(0xdff4ff));
        v.box(-2, 8, 4, 2, 11, 4, gloss(C.charcoal));
        v.layer(['.g.g.', 'ggggg', '.gGg.', 'ggggg', '.g.g.'], { g: metal(C.brass), G: metal(C.gold) }, { x: -2, y: 11, z: 4 });
        v.set(-1, 9, 4, metal(C.copper)).set(1, 9, 4, metal(C.copper)); // tiny cogs
        // head with hinged jaw wide open
        bevel(-4, 15, -3, 4, 21, 4, red);
        v.box(-3, 17, 5, 3, 19, 6, red); // upper snout
        v.box(-3, 16, 1, 3, 16, 6, gloss(C.charcoal)); // mouth
        v.project(['W.W.W.W'], { W: sil }, -3, 16);
        v.box(-3, 14, 1, 3, 15, 7, sil); // lower jaw
        v.box(-3, 15, 1, 3, 15, 6, gloss(C.charcoal));
        for (const x of [-3, -1, 1, 3]) v.set(x, 16, 7, sil);
        for (const s of [-1, 1]) {
          v.box(s * 2, 20, 5, s * 3, 21, 5, yel); v.set(s * 2, 20, 6, gloss(K)); // bulb eyes
          v.cylinder(s > 0 ? 5 : -6, 18, 0, 1, 2, sil, 'x'); // ear bolts
        }
        // tin dorsal plates
        for (const [y, z, ny, nz, h, w] of [[21, 0, 1, -0.2, 3, 2], [19, -3, 0.6, -1, 3, 2], [13, -4, 0.3, -1, 3, 2], [8, -4, 0, -1, 2.5, 1.8]]) plate(v, y, z, ny, nz, h, w, sil, metal(C.chrome), 0.6);
        // segmented tail
        v.box(-2, 2, -5, 2, 5, -7, red).box(-1, 1, -8, 1, 3, -10, redD).box(0, 1, -11, 0, 2, -12, red);
        v.paint(() => v.box(-3, 2, -6, 3, 5, -6, yel));
        // wind-up key
        v.box(0, 10, -5, 0, 10, -7, metal(C.brass));
        v.ring(-2, 10, -8, metal(C.brass), 'z').ring(2, 10, -8, metal(C.brass), 'z').set(0, 10, -8, metal(C.brass));
        // arms raising a donut to the jaws
        for (const s of [-1, 1]) {
          v.box(s * 6, 11, -1, s * 7, 13, 2, redD);
          v.box(s * 5, 12, 3, s * 6, 13, 6, red);
          v.box(s * 4, 13, 7, s * 5, 14, 7, sil);
        }
        donut(v, 0, 15, 8);
        v.sphere(2.6, 18, 8.5, 1.5, null); // bite!
      },
    },
    {
      id: 'tower', name: 'Biscuit Tower Attack', jp: 'ビスケットタワー襲撃', rarity: 'rare',
      desc: 'The tallest snack in the city. Was. Was the tallest snack in the city.',
      build(v) {
        // city block diorama
        v.box(-12, 0, -9, 12, 1, 9, C.charcoal);
        v.paint(() => {
          v.box(-12, 1, -9, 12, 1, -7, C.lightgray); v.box(-12, 1, 7, 12, 1, 9, C.lightgray);
          v.box(-12, 1, -9, -11, 1, 9, C.lightgray); v.box(11, 1, -9, 12, 1, 9, C.lightgray);
          for (let x = -9; x <= 9; x += 2) v.box(x, 1, 3, x, 1, 6, C.white); // zebra crossing
        });
        v.paint(() => v.box(-12, 0, 9, 12, 0, 9, C.darkgray));
        // tiny buildings with lit windows
        const bld = (x0, z0, x1, z1, h, c) => {
          v.box(x0, 2, z0, x1, 1 + h, z1, c);
          v.paint(() => v.shape(x0, 3, z0, x1, h, z1, (x, y, z) => y % 2 === 1 && (x + z) % 2 === 0, glow(0xffe08a)));
          v.box(x0, 2 + h, z0, x1, 2 + h, z1, shade(c, 0.8));
        };
        bld(8, -8, 11, -5, 8, 0x9ab0c8);
        bld(-11, -8, -8, -6, 5, 0xc8b49a);
        bld(9, -3, 11, -1, 4, 0xd9a0a0);
        // little trees
        for (const [x, z] of [[-10, 6], [10, 6]]) { v.box(x, 2, z, x, 3, z, C.woodDark); v.sphere(x, 4.5, z, 1.4, C.grass); }
        // the biscuit-stick tower (top already eaten)
        const tx = 4, tz = 1;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          stick(v, [tx + sx * 4, 2, tz + sz * 4], [tx + sx * 1, 15, tz + sz * 1], 0.45, true);
        }
        for (const y of [5, 11]) {
          const r = Math.round(4 - (y - 2) * 3 / 13);
          for (const [a, b] of [[[-r, -r], [r, -r]], [[r, -r], [r, r]], [[r, r], [-r, r]], [[-r, r], [-r, -r]]]) {
            stick(v, [tx + a[0], y, tz + a[1]], [tx + b[0], y, tz + b[1]], 2);
          }
        }
        // cookie observation deck with choc chips
        v.cylinder(tx, 8, tz, 3.6, 1, C.bread);
        v.paint(() => v.shape(tx - 4, 8, tz - 4, tx + 4, 8, tz + 4, (x, y, z) => hash(x, y, z, 2) < 0.22, C.soy));
        // jagged bitten top
        for (const [dx, dz, h] of [[-1, -1, 16], [1, -1, 15], [1, 1, 17], [-1, 1, 15], [0, 0, 14]]) v.box(tx + dx, 14, tz + dz, tx + dx, h, tz + dz, 0x5a3020);
        // the kaiju, holding the stolen antenna piece
        const kc = 0x5e9488;
        const k = makeKaiju({ body: kc, belly: 0xe9e2b8, plate: 0x3f6f68, tip: glow(0x7ff5ff), mouth: 'chomp', stand: true, tail: -1 });
        v.merge(k.m, -5, 2, -3);
        arm(v, [-11, 15, -1.5], [-10, 11, 3], kc);
        arm(v, [1, 15, -1.5], [2, 15, 4], kc);
        // antenna piece in hand: little deck + choc stick
        v.cylinder(2, 16, 4, 1.4, 1, 0x5a3020);
        stick(v, [2, 17, 4], [2, 22, 4], 0.2);
        stick(v, [2, 13, 4], [2, 15, 4], 2);
        v.set(2, 23, 4, glow(C.red));
        // crumbs everywhere
        for (const [x, z] of [[0, 4], [7, 6], [-1, 6], [6, -3]]) v.set(x, 2, z, C.bread);
      },
    },
  ],
};
