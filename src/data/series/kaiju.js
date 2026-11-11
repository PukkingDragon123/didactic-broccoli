// Series 10 — Kaiju Snack Time (怪獣おやつタイム)
// Chubby baby kaiju caught mid-snack. Rampage cancelled: it's oyatsu o'clock.
import { C, shade } from '../../voxel/palette.js';
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
      const [dx, dy, dz] = o.footR && s === (o.footSide || 1) ? o.footR : [0, 0, 0];
      m.ellipsoid(3.6 * s + dx * 0.4, 3.2 + dy * 0.6, 0.5 + dz * 0.4, 2.6, 3, 2.8, body);
      m.ellipsoid(3.6 * s + dx, 1 + dy, 1.8 + dz, 2.6, 1.3, 3.2, body);
      m.paint(() => m.box(3.6 * s + dx - 3, dy, 4 + dz, 3.6 * s + dx + 3, dy, 6 + dz, dark));
      const fx = Math.round(3.6 * s + dx), fz = Math.round(4 + dz);
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
  // freckly scales on the back
  m.recolor((x, y, z, c) => (c === body && z < -1 && hash(x, y, z, 11) < 0.13 ? dark : undefined));
  m.recolor((x, y, z, c) => (c === body && z < -2 && hash(x >> 1, y >> 1, z >> 1, 12) < 0.18 ? shade(body, 0.9) : undefined));
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
      for (let i = 0; i < 3; i++) m.box(s * (6 + i), 15 + L, -1, s * (6 + i), 16 + L + i, 0, i === 2 ? tip : pl);
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

/** Biscuit stick with colour by position t (0..1); `axis` [x,z] thickens it to 2 voxels towards that centre. */
function stickC(v, a, b, colorFn, axis) {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t), z = Math.round(a[2] + (b[2] - a[2]) * t);
    v.set(x, y, z, colorFn(t));
    if (axis) v.set(x + Math.sign(axis[0] - x), y, z, colorFn(t)).set(x, y, z + Math.sign(axis[1] - z), colorFn(t));
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
        // tall ramune bottle standing between its feet: soda core + aqua glass shell, marble trapped in the neck
        const bz = 10;
        const prof = (t) => (t < 6.5 ? 2.6 : t < 7.5 ? 2 : t < 8.5 ? 1.3 : t < 10.5 ? 1.8 : 1.3);
        lathe(v, [0, 0, bz], [0, 1, 0], 12, prof, (t) => (t > 11.4 ? gloss(C.plasticBlue) : glass(0x8fe8d2)));
        lathe(v, [0, 0, bz], [0, 1, 0], 8, (t) => (t < 6.5 ? 2 : t < 7.5 ? 1.4 : 0.6), gloss(0x5fd8c0));
        v.paint(() => v.shape(-4, 3, bz - 4, 4, 3, bz + 4, () => true, gloss(C.blue)));
        v.paint(() => v.shape(-4, 4, bz - 4, 4, 4, bz + 4, (x, y, z) => (x + z) % 2 === 0, gloss(W)));
        v.sphere(0, 9.5, bz, 1.1, gloss(0xf4fdff)); // the marble
        v.set(-1, 6, bz + 2, W).set(-1, 7, bz + 2, W); // glint
        // hugging the bottle, one claw poking at the marble
        arm(v, [-6, 10, 1.5], [-3, 4, 9], b);
        arm(v, [6, 10, 1.5], [2, 13, 8], b);
        v.set(1, 12, 9, W);
      },
    },
    {
      id: 'purin', name: 'Purin Funjatta!', jp: 'プリンふんじゃった', rarity: 'uncommon',
      desc: 'Stepped on the giant purin. Now has one very sticky, very happy foot.',
      build(v) {
        const pu = 0xa98cf2;
        // plate + giant purin first, so the foot squishes into it
        const px = -6, pz = 3;
        v.cylinder(px, 0, pz, 6.5, 1, gloss(C.ceramic));
        v.paint(() => v.shape(px - 7, 0, pz - 7, px + 7, 0, pz + 7, (x, y, z) => Math.abs(Math.hypot(x - px, z - pz) - 5.8) < 0.5, gloss(C.blue)));
        const custard = 0xffd36b, caramel = 0x8a4418;
        lathe(v, [px, 1, pz], [0, 1, 0], 6, (t) => 4.8 - t * 0.2, (t, x, y, z) => {
          const a = Math.atan2(z - pz, x - px);
          const drip = 1 + Math.floor(hash(Math.round(a * 4), 0, 0, 5) * 3.2);
          return gloss(t > 5.5 - drip && Math.hypot(x - px, z - pz) > 3.2 || t > 5.4 ? caramel : custard);
        });
        // whipped cream + cherry at the back
        v.ellipsoid(px - 1.5, 8, pz - 2, 1.8, 1.2, 1.8, C.white);
        v.set(px - 1.5, 9, pz - 2, C.white);
        v.sphere(px - 1.5, 10.5, pz - 2, 1, gloss(C.red));
        v.set(px - 2, 12, pz - 2, C.leaf).set(px - 2, 13, pz - 2, C.leaf).set(px - 3, 13, pz - 2, C.leaf);
        // spoon resting on the plate
        v.box(px - 3, 1, pz + 5, px + 1, 1, pz + 5, metal(C.silver));
        v.ellipsoid(px - 4, 1, pz + 5, 1.1, 0.4, 0.9, metal(C.silver));
        // the kaiju, mid-stomp with its left foot
        const k = makeKaiju({ body: pu, belly: 0xf4eeff, plate: 0x6a4fd0, tip: 0xd8ccff, mouth: 'open', eyes: 'shock', stand: true, tail: 1, footSide: -1, footR: [-4.5, 6, 3] });
        v.merge(k.m, 4, 0, -1);
        // arms flung up in panic
        arm(v, [-2, 13, 0.5], [-3, 19, 2], pu);
        arm(v, [10, 13, 0.5], [12, 18, 2], pu);
        // custard + caramel splats around the foot
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2, x = Math.round(-4 + Math.cos(a) * 3.6), z = Math.round(4 + Math.sin(a) * 3.6);
          if (Math.hypot(x - px, z - pz) > 4.2) continue;
          let y = 14; while (y > 0 && !v.has(x, y - 1, z)) y--;
          v.set(x, y, z, gloss(i % 3 ? custard : caramel));
          if (i % 2) v.set(x, y + 1, z, gloss(custard));
        }
        // sweat drop on the cheek
        let sx = 16; while (sx > 0 && !v.has(sx, 19, 1)) sx--;
        v.set(sx + 1, 19, 1, glass(0x9fe3ff)).set(sx + 1, 18, 1, glass(0x9fe3ff)).set(sx + 1, 18, 2, glass(0x9fe3ff));
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
        // body with printed bands, rivets and a gear window
        bevel(-5, 5, -4, 5, 14, 4, red);
        v.paint(() => { v.box(-6, 6, -5, 6, 6, 5, yel); v.box(-6, 13, -5, 6, 13, 5, yel); });
        v.box(-3, 7, 5, 3, 12, 5, sil);
        for (const [x, y] of [[-3, 7], [3, 7], [-3, 12], [3, 12]]) v.set(x, y, 5, metal(C.steel));
        v.box(-2, 8, 5, 2, 11, 5, glass(0xdff4ff));
        v.box(-2, 8, 4, 2, 11, 4, gloss(C.charcoal));
        v.layer(['.g.g.', 'ggggg', '.gGg.', 'ggggg', '.g.g.'], { g: metal(C.brass), G: metal(C.gold) }, { x: -2, y: 11, z: 4 });
        // head with a hinged jaw dropped wide open
        bevel(-4, 15, -3, 4, 21, 4, red);
        v.paint(() => v.box(-5, 21, -4, 5, 21, 5, redD));
        v.box(-3, 17, 5, 3, 19, 7, red); // upper snout
        v.paint(() => v.box(-3, 19, 7, 3, 19, 7, redD));
        v.set(-1, 19, 8, K).set(1, 19, 8, K); // nostrils
        v.box(-3, 16, 1, 3, 16, 7, gloss(C.charcoal)); // mouth
        v.box(-3, 14, 1, 3, 15, 7, sil); // lower jaw
        v.box(-2, 15, 2, 2, 15, 7, gloss(C.mouth));
        for (const x of [-3, -1, 1, 3]) { v.set(x, 16, 7, W); v.set(x, 16, 1, null); }
        for (const x of [-2, 0, 2]) v.set(x, 16, 6, W);
        for (const s of [-1, 1]) {
          v.box(s * 2, 20, 5, s * 3, 21, 5, yel); v.set(s * 2, 20, 6, gloss(K)); v.set(s * 3, 21, 6, gloss(W)); // bulb eyes
          v.cylinder(s > 0 ? 5 : -6, 18, 0, 1, 2, sil, 'x'); // ear bolts
          v.set(s * 4, 20, 5, gloss(C.blush));
        }
        // tin dorsal plates
        for (const [y, z, ny, nz, h, w] of [[21, 0, 1, -0.2, 3, 2], [19, -3, 0.6, -1, 3, 2], [13, -4, 0.3, -1, 3, 2], [8, -4, 0, -1, 2.5, 1.8]]) plate(v, y, z, ny, nz, h, w, sil, metal(C.chrome), 0.6);
        // segmented tail
        v.box(-2, 2, -5, 2, 5, -7, red).box(-1, 1, -8, 1, 3, -10, redD).box(0, 1, -11, 0, 2, -12, red);
        v.paint(() => v.box(-3, 2, -6, 3, 5, -6, yel));
        // wind-up key
        v.box(0, 10, -5, 0, 10, -7, metal(C.brass));
        v.ring(-2, 10, -8, metal(C.brass), 'z').ring(2, 10, -8, metal(C.brass), 'z').set(0, 10, -8, metal(C.brass));
        // left arm swinging, right arm proudly holding out the donut
        v.box(-7, 10, -1, -6, 13, 1, redD);
        v.box(-7, 8, 1, -6, 10, 4, red);
        v.box(-7, 8, 5, -6, 9, 5, sil);
        v.box(6, 10, -1, 7, 13, 1, redD);
        v.box(7, 9, 1, 10, 10, 3, red);
        v.box(9, 10, 2, 11, 10, 4, sil);
        v.set(9, 11, 4, sil).set(11, 11, 4, sil);
        donut(v, 10, 14, 3);
        v.sphere(7.6, 16.6, 3.5, 1.5, null); // first bite
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
        for (const [x, z] of [[-10, 6], [10, 6]]) { v.box(x, 2, z, x, 3, z, C.woodDark); v.sphere(x, 4.5, z, 1.4, C.grass); }
        // the biscuit-stick tower, strawberry + white-choc dipped like a real tower's paint job
        const tx = 4, tz = 0;
        const band = (t) => (t < 0.22 ? 0xeab56c : Math.floor((t - 0.22) * 11) % 2 ? 0xfff2e6 : 0xff6f8f);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          stickC(v, [tx + sx * 4, 2, tz + sz * 4], [tx + sx * 1, 18, tz + sz * 1], band, [tx, tz]);
        }
        for (const y of [5, 12]) {
          const r = Math.round(4 - (y - 2) * 3 / 16);
          for (const [a, b] of [[[-r, -r], [r, -r]], [[r, -r], [r, r]], [[r, r], [-r, r]], [[-r, r], [-r, -r]]]) {
            stickC(v, [tx + a[0], y, tz + a[1]], [tx + b[0], y, tz + b[1]], () => 0xeab56c);
          }
        }
        // cookie observation deck + white-choc upper deck
        v.cylinder(tx, 9, tz, 3.8, 1, C.bread);
        v.paint(() => v.shape(tx - 4, 9, tz - 4, tx + 4, 9, tz + 4, (x, y, z) => hash(x, y, z, 2) < 0.22, C.soy));
        v.cylinder(tx, 15, tz, 2.4, 1, 0xfff2e6);
        // jagged bitten top
        for (const [dx, dz, h] of [[-1, -1, 19], [0, -1, 18], [1, -1, 20], [1, 0, 19], [1, 1, 18], [0, 1, 19], [-1, 1, 20], [-1, 0, 18]]) v.box(tx + dx, 17, tz + dz, tx + dx, h, tz + dz, 0xff6f8f);
        v.box(tx, 17, tz, tx, 17, tz, C.bread);
        // the kaiju, crunching the stolen antenna
        const kc = 0x5e9488;
        const k = makeKaiju({ body: kc, belly: 0xe9e2b8, plate: 0x3f6f68, tip: glow(0x7ff5ff), mouth: 'chomp', stand: true, tail: -1 });
        v.merge(k.m, -5, 2, -3);
        arm(v, [-11, 15, -1.5], [-10, 11, 3], kc);
        arm(v, [1, 15, -1.5], [2, 13, 4], kc);
        stickC(v, [3, 12, 5], [-2, 17, 5], band);
        stickC(v, [4, 12, 5], [-1, 17, 5], band);
        v.cylinder(3, 11, 5, 1.6, 1, 0xfff2e6);
        v.set(-2, 18, 5, glow(C.red));
        // crumbs everywhere
        for (const [x, z] of [[0, 4], [7, 6], [-1, 6], [6, -4], [2, 5]]) v.set(x, 2, z, C.bread);
        for (const [x, y, c] of [[-3, 13, C.bread], [-7, 14, 0xff6f8f]]) { let z = 14; while (z > -10 && !v.has(x, y, z - 1)) z--; v.set(x, y, z, c); }
      },
    },
    {
      id: 'parfait', name: 'Triple-Head Parfait', jp: '三つ首パフェ竜', rarity: 'ultra',
      desc: 'Three heads, one parfait. The middle one always gets the cherry.',
      build(v) {
        const lav = 0xb7a2f5, lavD = shade(lav, 0.8), cream = 0xfff1d0, gold = gloss(0xffcf4a);
        // gingham café cloth
        v.cylinder(0, 0, 0, 12, 1, 0xffffff);
        v.recolor((x, y, z) => ((Math.floor((x + 40) / 2) + Math.floor((z + 40) / 2)) % 2 ? 0xff9fb8 : (Math.floor((x + 40) / 2) % 2 ? 0xffd1dc : 0xfffaf4)));
        v.paint(() => v.shape(-13, 0, -13, 13, 0, 13, (x, y, z) => Math.hypot(x, z) > 11.2, 0xe86a8e));
        // chubby dragon body behind the parfait
        v.ellipsoid(0, 7, -5, 7, 6.5, 5.5, lav);
        v.paint(() => v.ellipsoid(0, 6.5, -1, 4.5, 5, 2.5, cream));
        v.recolor((x, y, z, c) => (c === cream && y % 2 === 0 ? shade(cream, 0.9) : undefined));
        for (const s of [-1, 1]) {
          v.ellipsoid(6 * s, 2, -1, 2.4, 2, 3, lav); // feet
          v.set(6 * s - 1, 1, 2, W).set(6 * s + 1, 1, 2, W).set(6 * s, 2, 2, W);
          // bat wings
          const wing = ['...pp.', '..pPPp', '.pPpPP', 'pPPpPP', 'pPpPPp', '.pPPp.'];
          v.layer(s < 0 ? wing.map((r) => [...r].reverse().join('')) : wing, { p: shade(0x8a5bd6, 1), P: 0xd6c8ff }, { x: s < 0 ? -12 : 7, y: 17, z: -8 });
          v.box(4 * s, 11, -8, 7 * s, 12, -6, 0x8a5bd6);
        }
        // tail curling round the front-right
        for (const [x, y, z, r] of [[3, 3, -10, 2.5], [6, 2.5, -10, 2], [9, 2, -8, 1.7], [10, 2, -5, 1.4], [10, 2, -2, 1.1]]) v.sphere(x, y, z, r, lav);
        v.set(10, 2, 0, gold).set(10, 3, 0, gold);
        // three necks
        const neck = (pts) => { for (let i = 0; i < pts.length - 1; i++) v.line(...pts[i], ...pts[i + 1], lav, 1.7); };
        neck([[0, 12, -5], [0, 18, -4], [0, 23, -2]]);
        neck([[-3, 11, -5], [-6.5, 14, -3], [-8, 17.5, 0]]);
        neck([[3, 11, -5], [6.5, 14, -3], [8, 17.5, 0]]);
        // little gold spines down each neck
        for (const [deg, h, w] of [[100, 2.6, 1.8], [128, 2.2, 1.5], [155, 1.8, 1.2]]) {
          const a = (deg * Math.PI) / 180, ny = Math.cos(a), nz = -Math.sin(a);
          plate(v, 7 + 6.2 * ny, -5 + 5.2 * nz, ny, nz, h, w, gold, gloss(0xfff0a0), 1);
        }
        // ---- the parfait
        const px = 0, pz = 4;
        v.cylinder(px, 1, pz, 3, 1, glass(0xe6f8ff));
        v.cylinder(px, 2, pz, 1, 3, glass(0xe6f8ff));
        const rAt = (y) => 2 + (y - 5) * 0.25;
        const layerC = (y, x, z) => (y <= 6 ? (hash(x, y, z, 1) < 0.3 ? 0xc98a2c : 0xf0b84e) : y <= 8 ? 0xfff6e2 : y <= 10 ? (hash(x, y, z, 4) < 0.25 ? 0xff4a6a : 0xe8345a) : y <= 11 ? 0xfff6e2 : y <= 13 ? 0x9cc95e : 0xfffaf0);
        v.shape(px - 6, 5, pz - 6, px + 6, 15, pz + 6, (x, y, z) => Math.hypot(x - px, z - pz) <= rAt(y) + 0.2, (x, y, z) => layerC(y, x, z));
        v.paint(() => v.shape(px - 6, 5, pz - 6, px + 6, 15, pz + 6, (x, y, z) => Math.hypot(x - px, z - pz) > rAt(y) - 0.8, glass(0xe6f8ff)));
        v.shape(px - 6, 16, pz - 6, px + 6, 16, pz + 6, (x, y, z) => { const d = Math.hypot(x - px, z - pz); return d <= 4.9 && d > 4.0; }, glass(0xe6f8ff));
        // toppings
        v.ellipsoid(px, 16.5, pz, 4.2, 1.3, 4.2, W);
        v.sphere(px - 2, 18.5, pz + 0.5, 2, 0x9fd06a); // matcha scoop
        v.sphere(px + 2, 18.5, pz + 0.5, 2, 0xffa6c0); // strawberry scoop
        v.sphere(px, 19, pz - 1.5, 2, 0xfff1c8); // vanilla scoop
        v.cylinder(px, 20, pz + 1, 1.5, 1, W).set(px, 21, pz + 1, W).set(px, 22, pz + 1, W); // cream swirl
        for (const [x, z] of [[-3, 3], [3, 3], [0, 4]]) { v.box(px + x, 17, pz + z, px + x + (x < 0 ? -1 : x > 0 ? 1 : 0), 18, pz + z, gloss(C.red)); v.set(px + x, 18, pz + z, gloss(0xff6a7a)); }
        v.box(px - 4, 19, pz - 1, px - 4, 24, pz - 1, 0xf3d08a); v.box(px - 5, 20, pz - 1, px - 5, 23, pz - 1, 0xe2b866); // fan wafer
        v.box(px + 3, 19, pz - 2, px + 3, 20, pz - 2, 0xe9b56a).box(px + 3, 21, pz - 2, px + 3, 24, pz - 2, 0x5a3020); // choc stick
        // tiny arms hugging the glass
        arm(v, [-5, 8, -2], [-3.5, 10, 2.5], lav);
        arm(v, [5, 8, -2], [3.5, 10, 2.5], lav);
        // three heads, three moods
        const head = (mood) => {
          const h = new VoxelModel();
          h.ellipsoid(0, 0, 0, 3.6, 3, 3.2, lav);
          h.ellipsoid(0, -0.8, 2.6, 2.6, 1.7, 1.8, lav);
          h.paint(() => h.box(-3, -3, 2, 3, -2, 5, cream));
          for (const s of [-1, 1]) { h.set(2 * s, 3, -1, gold).set(2 * s, 4, -1, gold).set(2 * s, 4, -2, gold); }
          const F = { K, W, P: C.blush, M: K, T: C.tongue, R: glass(0x9fe3ff) };
          if (mood === 'happy') h.project(['.K...K.', 'K.K.K.K'], F, -3, 2);
          else if (mood === 'sad') h.project(['KK...KK', 'R.....R', 'R.....R'], F, -3, 1);
          else h.project(['KW...KW', 'KK...KK'], F, -3, 2);
          h.project(['P.....P'], F, -3, -0);
          if (mood === 'lick') h.project(['MMM', 'MTM'], F, -1, -1);
          else if (mood === 'sad') h.project(['.M.', 'MTM', 'MMM'], F, -1, -1);
          else h.project(['MMM'], F, -1, -1);
          return h;
        };
        v.merge(head('happy'), 0, 25, -1);
        v.merge(head('lick'), -8, 20, 1);
        v.merge(head('sad'), 8, 20, 1);
        // middle: cherry already in its mouth. left: licking the cream.
        v.sphere(0, 22.5, 3, 1.1, gloss(C.red));
        v.set(0, 24, 3, C.leaf).set(1, 25, 3, C.leaf).set(0, 23, 3, C.leaf);
        v.box(-7, 17, 4, -5, 17, 4, gloss(C.tongue)).set(-4, 17, 5, gloss(C.tongue));
      },
    },
    {
      id: 'mecha', name: 'Mecha-Kaiju ULTIMATE', jp: 'メカ怪獣アルティメット', rarity: 'secret',
      desc: 'A billion-yen war machine. Used exclusively to guard one melon pan.',
      build(v) {
        const chr = metal(C.chrome), stl = metal(C.steel), navy = gloss(0x2a3f8f), navyL = gloss(0x3f62c8);
        const cy = glow(0x59f3ff), gold = gloss(0xffc63a), red = gloss(C.red);
        // hexagonal display base with glowing trim + gold nameplate
        const hex = (x, z, r) => Math.abs(x) <= r && Math.abs(x) * 0.5 + Math.abs(z) * 0.866 <= r;
        v.shape(-11, 0, -11, 11, 1, 11, (x, y, z) => hex(x, z, 10.4), gloss(0x24263a));
        v.paint(() => v.shape(-11, 1, -11, 11, 1, 11, (x, y, z) => hex(x, z, 10.4) && !hex(x, z, 9.4), cy));
        v.box(-3, 0, 10, 3, 1, 10, metal(C.gold));
        v.project(['K.KK.K.'], { K: gloss(0x8a6a20) }, -3, 1);
        // legs + clawed feet
        for (const s of [-1, 1]) {
          v.box(s * 1.5, 2, -2, s * 5.5, 3, 4, navy);
          v.set(s * 2, 2, 5, chr).set(s * 4, 2, 5, chr).set(s * 5, 2, 5, chr).set(s * 3, 3, 5, chr);
          v.ellipsoid(s * 3.5, 6.5, 0, 2.4, 3, 2.6, chr);
          v.box(s * 2.5, 6, 3, s * 4.5, 7, 3, navyL); // knee guards
        }
        // torso
        v.ellipsoid(0, 13, 0, 6.2, 6, 5.2, chr);
        v.paint(() => { for (const y of [8, 10]) v.box(-6, y, 2, 6, y, 6, stl); });
        v.paint(() => v.box(-7, 14, 1, 7, 18, 6, navy));
        v.paint(() => v.box(-7, 14, 4, 7, 14, 6, gold));
        // arc-reactor heart
        v.cylinder(0, 15, 5, 2, 1, cy, 'z');
        v.set(0, 15, 6, glow(0xffffff)).set(-1, 15, 6, cy).set(1, 15, 6, cy).set(0, 14, 6, cy).set(0, 16, 6, cy);
        // shoulder armour
        for (const s of [-1, 1]) {
          v.ellipsoid(s * 6.5, 17, 0, 2.4, 2, 2.6, navyL);
          v.paint(() => v.box(s * 5, 18, -3, s * 9, 19, 3, gold));
        }
        // head: chrome dome, glowing visor eyes, toothy jaw, gold crest
        v.ellipsoid(0, 21.5, 0.5, 5, 4, 4.4, chr);
        v.ellipsoid(0, 20, 4, 3.2, 2, 2.2, chr);
        v.paint(() => v.box(-5, 22, 2, 5, 23, 7, navy));
        v.project(['.CC...CC.', 'CCC...CCC'], { C: cy }, -4, 23);
        v.project(['WMWMW', '.MMM.'], { W, M: gloss(K) }, -2, 19);
        v.box(0, 25, 1, 0, 27, 1, red).box(-1, 25, 1, 1, 25, 1, red).set(0, 27, 0, red).set(0, 26, 0, red);
        v.set(-2, 25, 2, gold).set(2, 25, 2, gold);
        // dorsal plates with plasma tips
        for (const [deg, cyy, czz, r, h, w] of [[30, 21.5, 0.5, 4.2, 3, 2], [75, 21.5, 0.5, 4.2, 3.4, 2.2], [110, 13, 0, 5.4, 3.6, 2.4], [145, 13, 0, 5.4, 2.8, 1.9]]) {
          const a = (deg * Math.PI) / 180, ny = Math.cos(a), nz = -Math.sin(a);
          plate(v, cyy + r * ny, czz + r * nz, ny, nz, h, w, chr, cy);
        }
        // twin thrusters
        for (const s of [-1, 1]) {
          v.cylinder(s * 3, 10, -5.5, 1.3, 6, stl);
          v.cylinder(s * 3, 9, -5.5, 1, 1, glow(0xffa040));
          v.set(s * 3, 8, -5.5, glow(0xffe08a));
        }
        // segmented tail
        for (const [x, y, z, r, i] of [[0, 5, -6, 2.6, 0], [0, 3.8, -8.5, 2.2, 1], [1.5, 3.2, -10.5, 1.8, 2], [3.5, 3, -11.5, 1.5, 3], [5.5, 3, -11.5, 1.2, 4]]) v.sphere(x, y, z, r, i % 2 ? navy : chr);
        // right arm: rocket fist pumping; left arm: raising the golden melon pan
        v.line(6.5, 16, 0, 9, 13, 3, chr, 1.4);
        v.sphere(9, 12.5, 3.5, 1.8, navyL);
        v.set(9, 12, 5, cy);
        v.line(-6.5, 16, 0, -8.5, 21, 1.5, chr, 1.4);
        v.sphere(-8.5, 22, 1.5, 1.6, navyL);
        // golden melon pan: cracked-cookie crust grid
        const mp = 0xffcf4a, mpD = 0xe09a2a;
        const pan = new VoxelModel();
        pan.ellipsoid(0, 0, 0, 3.4, 2.6, 3.4, gloss(mp));
        pan.box(-5, -4, -5, 5, -1, 5, null);
        pan.recolor((x, y, z) => ((x + z + 40) % 3 === 0 || (x - z + 40) % 3 === 0 ? gloss(mpD) : undefined));
        pan.paint(() => pan.box(-5, 0, -5, 5, 0, 5, gloss(0xf0b040)));
        v.merge(pan, -9, 23, 2);
      },
    },
  ],
};
