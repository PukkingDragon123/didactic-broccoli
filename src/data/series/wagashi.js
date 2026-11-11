// Series 14 — Nikoniko Wagashi (にこにこ和菓子)
// Chubby Japanese sweets with little faces: dango, taiyaki, daifuku, dorayaki and friends.
import { C, shade } from '../../voxel/palette.js';
import { VoxelModel, gloss, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;
const ANKO = 0x5a2630;
const ANKO_L = 0x7a3a3e;

/** Deterministic coordinate hash in [0, 1). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const floorClip = (v) => v.box(-40, -12, -40, 40, -1, 40, null);

/**
 * Little face projected from the front. (cx, eyeY) = centre column / top row of the eyes.
 * eyes: 'big' (2x2 with shine), 'dot' (1x2), 'happy' (^ ^), 'closed' (— —), 'sleepy' (u u)
 */
function face(v, cx, eyeY, { eyes = 'big', spread = 3, mouth = 'smile', blush = C.blush, ink = K, dir = '+z' } = {}) {
  const L = { K: ink, W, P: blush, M: ink, T: C.tongue };
  const g = (n) => '.'.repeat(Math.max(0, n));
  let rows, x0, eh;
  if (eyes === 'big') { rows = [`WK${g(2 * spread - 3)}WK`, `KK${g(2 * spread - 3)}KK`]; x0 = cx - spread; eh = 2; }
  else if (eyes === 'pip') { rows = [`K${g(2 * spread - 1)}K`]; x0 = cx - spread; eh = 1; }
  else if (eyes === 'dot') { rows = [`K${g(2 * spread - 1)}K`, `K${g(2 * spread - 1)}K`]; x0 = cx - spread; eh = 2; }
  else if (eyes === 'happy') { rows = [`.K.${g(2 * spread - 3)}.K.`, `K.K${g(2 * spread - 3)}K.K`]; x0 = cx - spread - 1; eh = 2; }
  else if (eyes === 'sleepy') { rows = [`K.K${g(2 * spread - 3)}K.K`, `.K.${g(2 * spread - 3)}.K.`]; x0 = cx - spread - 1; eh = 2; }
  else { rows = [`KK${g(2 * spread - 3)}KK`]; x0 = cx - spread; eh = 1; }
  v.project(rows, L, x0, eyeY, dir);
  const mouths = { smile: ['M.M', '.M.'], open: ['MMM', 'MTM'], o: ['.M.'], w: ['M.M.M', '.M.M.'], flat: ['MMM'] };
  const m = mouths[mouth];
  v.project(m, L, cx - (m[0].length >> 1), eyeY - eh - (eyes === 'closed' ? 1 : 0), dir);
  if (blush) {
    v.project(['PP'], L, x0 - 2 + (eyes === 'happy' || eyes === 'sleepy' ? 0 : 0), eyeY - eh, dir);
    v.project(['PP'], L, x0 + rows[0].length, eyeY - eh, dir);
  }
}

/** Stubby little arm (from body surface point, toward a direction). */
function nub(v, x, y, z, c, r = 1.2) { v.sphere(x, y, z, r, c); }

/** Round shiratama dumpling with a face, resting at (x, y, z) = bottom centre. Built apart so the face only lands on it. */
function shiratama(v, x, y, z, { r = 2.6, col = 0xfffcf4, eyes = 'pip', mouth = 'o', blush = C.blush } = {}) {
  const m = new VoxelModel();
  m.ellipsoid(0, r * 0.85, 0, r, r * 0.85, r, col);
  m.shape(-4, 0, Math.round(r), 4, Math.ceil(2 * r), 6, () => true, null); // flat little face
  m.set(-1, Math.round(r * 1.5), Math.round(r) - 1, W);
  const e = eyes === 'closed' || eyes === 'dot' ? 'pip' : eyes;
  face(m, 0, Math.round(r) + (e === 'pip' ? 0 : 1), { eyes: e, spread: 1, mouth, blush });
  v.merge(m, Math.round(x), Math.round(y), Math.round(z));
}

export default {
  id: 'wagashi',
  order: 14,
  name: 'Nikoniko Wagashi',
  jp: 'にこにこわがし',
  tagline: 'Smiling traditional Japanese sweets',
  taglineJp: 'あまくて、もちもち、にっこにこ',
  price: 200,
  themes: ['food', 'candy', 'cute'],
  card: { bg: '#f8efe0', accent: '#e8789a', text: '#4a2630', accent2: '#6f9a4a', pattern: 'sakura' },
  capsule: { colors: [0xffc2d4, 0xa8d08a, 0xfffaf0, 0x8a4a52, 0xf2d48a] },
  items: [
    {
      id: 'dango', name: 'Hanami Dango Trio', jp: '三色だんご', rarity: 'common',
      desc: 'Pink is the leader, white keeps the peace, green just wants a nap.',
      build(v) {
        // little wooden coaster stand
        v.cylinder(0, 0, 0, 5, 1, C.woodDark);
        v.cylinder(0, 1, 0, 4.4, 1, C.woodLight);
        // skewer
        v.box(0, 1, 0, 0, 30, 0, C.bamboo);
        v.set(0, 31, 0, shade(C.bamboo, 0.85));
        const balls = [
          [6, 0xa8d08a, { eyes: 'closed', mouth: 'o' }],
          [14, 0xfffaf0, { eyes: 'dot', mouth: 'o' }],
          [22, 0xffaec6, { eyes: 'happy', mouth: 'o' }],
        ];
        for (const [y, c] of balls) {
          v.ellipsoid(0, y, 0, 4.8, 4.2, 4.6, c);
          v.paint(() => v.ellipsoid(0, y - 2.6, 0, 4.9, 1.6, 4.7, shade(c, 0.93)));
          v.shape(-5, y - 3, 4, 5, y + 3, 6, () => true, null);
          v.set(-2, y + 3, 3, W).set(-3, y + 2, 3, W);
        }
        for (const [y, , f] of balls) face(v, 0, y + 1, { spread: 2, ...f, blush: f.eyes === 'happy' ? 0xff7aa0 : C.blush });
      },
    },
    {
      id: 'taiyaki', name: 'Taiyaki-kun', jp: 'たい焼きくん', rarity: 'common',
      desc: 'Bravely gave up its tail so you could see the anko. Hero of the snack stall.',
      build(v) {
        const tb = 0xe8a650, tbD = 0xb8702e, tbL = 0xffd88a;
        // body standing upright, facing +z with its flat side
        v.ellipsoid(2, 11, 0, 8, 6, 2.6, tb);
        // tail fan
        for (let i = 0; i < 5; i++) {
          const hw = 1.5 + i * 0.9, x = -6 - i;
          v.box(x, Math.round(11 - hw), -1, x, Math.round(11 + hw), 1, tb);
        }
        v.box(-10, 10, -1, -10, 12, 1, null);
        // fins
        v.box(0, 17, -1, 4, 17, 1, tb).box(1, 18, 0, 3, 18, 0, tb);
        v.box(1, 5, -1, 3, 5, 1, tb);
        // crispy rim around the edge
        v.paint(() => v.shape(-12, 3, -4, 12, 20, 4, (x, y, z) => Math.abs(z) >= 1 && (!v.has(x, y + 1, z) || !v.has(x, y - 1, z) || !v.has(x + 1, y, z) || !v.has(x - 1, y, z)), tbD));
        v.paint(() => v.ellipsoid(3, 12, 3, 4, 2.6, 1, tbL));
        // scales
        v.project(['d.d.d', '.d.d.', 'd.d.d'], { d: tbD }, -4, 13);
        v.project(['d', '.', 'd', '.', 'd'], { d: tbD }, -8, 13);
        // big cute face
        v.project(['WK', 'KK'], { K, W }, 5, 14);
        v.project(['.d', 'd.', '.d'], { d: tbD }, 2, 13); // gill
        v.project(['M.M', '.M.'], { M: K }, 7, 11);
        v.project(['PP'], { P: C.blush }, 4, 11);
        // bitten tail showing anko
        v.sphere(-9.5, 14, 0, 2.6, null);
        v.paint(() => v.shape(-13, 9, -2, -5, 18, 2, (x, y) => Math.hypot(x + 9.5, y - 14) < 3.6, ANKO));
        // paper sleeve holding it upright
        v.box(-5, 0, -4, 8, 5, 4, 0xfffaf0);
        v.box(-4, 1, -3, 7, 5, 3, null);
        v.box(-4, 0, -3, 7, 0, 3, 0xfffaf0);
        v.paint(() => v.box(-5, 4, -4, 8, 4, 4, C.vermilion));
        v.paint(() => v.box(-5, 2, 4, 8, 2, 4, 0xffd0c8));
        v.box(-4, 1, -2, 7, 5, 2, tb);
        floorClip(v);
      },
    },
    {
      id: 'ichigo', name: 'Ichigo Daifuku', jp: 'いちご大福', rarity: 'common',
      desc: 'Soft on the outside, sweet on the inside, strawberry on top. A perfect citizen.',
      build(v) {
        // paper doily
        v.box(-8, 0, -8, 8, 0, 8, W);
        v.paint(() => v.shape(-8, 0, -8, 8, 0, 8, (x, y, z) => Math.max(Math.abs(x), Math.abs(z)) === 8 && (x + z) % 2 === 0, 0xffc2d4));
        // mochi dome, powdered with katakuri starch
        v.ellipsoid(0, 6, 0, 7.4, 6.4, 7, 0xfffcf6);
        v.box(-9, 0, -9, 9, 0, 9, null);
        v.box(-8, 0, -8, 8, 0, 8, W);
        v.paint(() => v.shape(-8, 0, -8, 8, 0, 8, (x, y, z) => Math.max(Math.abs(x), Math.abs(z)) === 8 && (x + z) % 2 === 0, 0xffc2d4));
        v.shape(-8, 2, 6, 8, 11, 8, () => true, null); // soft flattened face
        v.recolor((x, y, z, c) => (c === 0xfffcf6 && hash(x, y, z, 3) < 0.18 ? 0xf4ece0 : undefined));
        // the opening: anko ring + strawberry peeking out
        v.ellipsoid(0, 12, 0, 3.6, 1.4, 3.4, ANKO);
        v.ellipsoid(0, 14, 0, 3.4, 3, 3.2, gloss(0xe8343e));
        v.cone(0, 15, 0, 2.6, 4, gloss(0xe8343e));
        v.paint(() => v.shape(-4, 11, -4, 4, 19, 4, (x, y, z) => (x * 2 + y * 3 + z * 5) % 7 === 0, gloss(0xffe9a0)));
        v.set(-1, 16, 3, gloss(0xff8a8a)).set(-2, 15, 3, gloss(0xff8a8a));
        // little mochi lips wrapping the strawberry
        for (const [x, z] of [[-3, 2], [3, 2], [0, -3], [-3, -2], [3, -2]]) v.set(x, 13, z, 0xfffcf6);
        // face
        face(v, 0, 8, { eyes: 'dot', spread: 3, mouth: 'smile' });
        // tiny arms
        nub(v, -7, 4, 2, 0xfffcf6, 1.4); nub(v, 7, 4, 2, 0xfffcf6, 1.4);
      },
    },
    {
      id: 'dorayaki', name: 'Dorayaki Walker', jp: 'てくてくどら焼き', rarity: 'uncommon',
      desc: 'Got up and walked out of the bakery. Nobody has the heart to stop it.',
      build(v) {
        const cake = 0xd88a3a, cakeD = 0x9a5424, cakeL = 0xf6c070, edge = 0xf6dca8;
        // stubby legs + shoes
        for (const s of [-1, 1]) {
          v.box(s * 3, 0, -1, s * 2, 3, 0, edge);
          v.box(s * 4, 0, 0, s * 1, 1, 2, gloss(C.vermilion));
        }
        // two pancakes standing on edge with anko between
        const cy = 13;
        v.cylinder(0, cy, 1, 9, 3, cake, 'z');
        v.cylinder(0, cy, -3, 9, 3, cake, 'z');
        v.cylinder(0, cy, -1, 8.3, 2, ANKO, 'z');
        // golden edge band on each cake
        v.paint(() => v.shape(-10, 3, -4, 10, 23, 4, (x, y, z) => Math.hypot(x, y - cy) > 7.9 && z !== -1 && z !== 0, edge));
        // browned face gradient
        v.paint(() => v.shape(-10, 3, 3, 10, 23, 3, (x, y) => Math.hypot(x, y - cy) < 7.6, (x, y) => (Math.hypot(x + 1, y - cy - 1) < 4 ? cakeL : cake)));
        v.paint(() => v.shape(-10, 3, -3, 10, 23, -3, (x, y) => Math.hypot(x, y - cy) < 7.6, cakeD));
        // anko bumps peeking from the gap
        for (const a of [0.3, 1.2, 2.2, 3.4, 4.4, 5.5]) v.set(Math.round(Math.cos(a) * 8.8), Math.round(cy + Math.sin(a) * 8.8), -1, ANKO_L);
        // branded heart (yakiin) + face
        v.project(['D.D', 'DDD', '.D.'], { D: cakeD }, 3, cy + 6);
        face(v, -1, cy + 2, { eyes: 'big', spread: 3, mouth: 'open' });
        // arms waving
        v.line(-9, cy, 0, -11, cy + 3, 1, edge, 1);
        v.sphere(-11, cy + 4, 1, 1.3, edge);
        v.line(9, cy, 0, 11, cy - 2, 1, edge, 1);
        v.sphere(11, cy - 3, 1, 1.3, edge);
        floorClip(v);
      },
    },
    {
      id: 'sakura', name: 'Sakura Mochi', jp: '桜もち', rarity: 'uncommon',
      desc: 'Wrapped in a salted cherry leaf like a cosy futon. Do not wake before spring.',
      build(v) {
        const pink = 0xffb0c8, pinkD = 0xf08cac, pinkL = 0xffd4e2;
        const leaf = 0x7aa04a, leafD = 0x56783a, leafL = 0x9cc464;
        // plate
        v.cylinder(0, 0, 0, 10, 1, gloss(0xf4f1ea));
        v.paint(() => v.shape(-11, 0, -11, 11, 0, 11, (x, y, z) => Math.hypot(x, z) > 9, gloss(0x4a6fb8)));
        // leaf wrapping the back and underside
        v.ellipsoid(0, 6, -1.5, 8.6, 6.4, 6.6, leaf);
        v.box(-10, 1, 1, 10, 14, 9, null); // open the front
        v.box(-10, -2, -9, 10, 0, 9, null);
        v.paint(() => v.shape(-10, 1, -9, 10, 14, 1, (x) => x === 0, leafD));
        v.paint(() => v.shape(-10, 1, -9, 10, 14, 1, (x, y) => Math.abs(x) > 1 && (Math.abs(x) + y) % 5 === 0, leafD));
        v.paint(() => v.shape(-10, 9, -9, 10, 14, 1, (x, y) => y > 10 && Math.abs(x) < 5, leafL));
        // grainy domyoji mochi body
        v.ellipsoid(0, 6.5, 1.5, 7.4, 5.8, 5.8, pink);
        v.box(-9, -2, -9, 9, 0, 9, null);
        v.cylinder(0, 0, 0, 10, 1, gloss(0xf4f1ea));
        v.paint(() => v.shape(-11, 0, -11, 11, 0, 11, (x, y, z) => Math.hypot(x, z) > 9, gloss(0x4a6fb8)));
        v.recolor((x, y, z, c) => (c === pink ? (hash(x, y, z, 5) < 0.22 ? pinkD : hash(x, y, z, 6) < 0.2 ? pinkL : undefined) : undefined));
        face(v, 0, 8, { eyes: 'sleepy', spread: 3, mouth: 'o' });
        // salted sakura blossom on top
        v.layer(['.p.', 'pyp', '.p.'], { p: 0xff8fb2, y: C.yellow }, { x: -1, y: 13, z: 2, plane: 'xz' });
        // leaf tip curling up at the side
        v.line(8, 7, -2, 10, 12, -3, leaf, 0.8);
        v.set(10, 13, -3, leafL);
      },
    },
    {
      id: 'kakigori', name: 'Uji Kintoki Kakigori', jp: '宇治金時かき氷', rarity: 'rare',
      desc: 'A mountain of matcha ice with three shiratama climbers. Brain freeze summit.',
      build(v) {
        // footed glass bowl
        v.cylinder(0, 0, 0, 5, 1, glass(0xdff4ff));
        v.cylinder(0, 1, 0, 2, 2, glass(0xdff4ff));
        v.shape(-10, 3, -10, 10, 7, 10, (x, y, z) => { const r = 5 + (y - 3) * 1.1; return Math.hypot(x, z) <= r && Math.hypot(x, z) > r - 1.4; }, glass(0xd0eeff));
        v.cylinder(0, 3, 0, 5, 1, glass(0xd0eeff));
        // fluffy shaved ice dome
        v.shape(-10, 4, -10, 10, 22, 10, (x, y, z) => {
          const t = (y - 4) / 15;
          return t <= 1 && Math.hypot(x, z) <= 8.6 * Math.sqrt(Math.max(0, 1 - t * t)) + (t < 0.2 ? 0.6 : 0);
        }, (x, y, z) => (hash(x, y, z, 2) < 0.2 ? 0xe4f2ff : 0xfafdff));
        // matcha syrup soaking the top, with drips running down
        const dripTo = (x, z) => 11 - Math.floor(hash(Math.round(Math.atan2(z, x) * 4), 1, 0, 4) * 4);
        v.paint(() => v.shape(-10, 4, -10, 10, 22, 10, (x, y, z) => y >= dripTo(x, z), (x, y, z) => (y > 16 && x + z < 0 ? 0x9cc85a : hash(x, y, z, 7) < 0.2 ? 0x86b04a : 0x6f9a3a)));
        // condensed milk drizzle on the summit
        v.paint(() => v.shape(-10, 17, -10, 10, 22, 10, (x, y, z) => y >= 18 && Math.abs(x - z) <= 1, 0xfff8e6));
        // anko scoop on the front-left
        v.ellipsoid(-5, 9, 5, 2.8, 2.4, 2.4, ANKO);
        v.paint(() => v.shape(-8, 7, 3, -2, 12, 8, (x, y, z) => hash(x, y, z, 8) < 0.3, ANKO_L));
        // shiratama climbers
        shiratama(v, 4, 8, 6, { eyes: 'happy', mouth: 'o' });
        shiratama(v, 2, 13, 5, { eyes: 'dot', mouth: 'o', col: 0xffd4e2 });
        shiratama(v, 0, 18, 1, { eyes: 'dot', mouth: 'o', r: 2.4 });
        v.box(1, 22, 0, 1, 25, 0, C.woodDark); // tiny summit flag
        v.layer(['RRR', 'RWR'], { R: C.vermilion, W }, { x: 2, y: 25, z: 0 });
        // kakigori flag stand beside the bowl
        v.box(9, 0, -6, 9, 15, -6, C.woodDark);
        v.box(8, 0, -7, 10, 0, -5, C.woodDark);
        v.layer([
          'WWWWWWWWW',
          'WR...R..W',
          'W.RR.R.RW',
          'W...RRR.W',
          'W..R.R.RW',
          'W.R..R..W',
          'WWWWWWWWW',
          'BBWWBBWWB',
          'WBBBWBBBW',
        ], { W, R: C.vermilion, B: 0x3a7ad8 }, { x: 10, y: 15, z: -6 });
        floorClip(v);
      },
    },
    {
      id: 'chakai', name: 'Tea Ceremony Set', jp: 'お茶会セット', rarity: 'ultra',
      desc: 'Matcha-bowl-san bows three times. The nerikiri bows back. This takes an hour.',
      build(v) {
        // black lacquer tray with vermilion lip
        v.box(-14, 0, -9, 14, 1, 9, gloss(0x241818));
        v.box(-13, 1, -8, 13, 1, 8, null);
        v.box(-13, 0, -8, 13, 0, 8, gloss(0x3a2424));
        v.paint(() => v.shape(-14, 1, -9, 14, 1, 9, () => true, gloss(0xb8282c)));
        v.paint(() => v.shape(-13, 0, -8, 13, 0, 8, (x, y, z) => (x * 3 + z * 7) % 23 === 0, gloss(0xd4a83a))); // gold maki-e flecks
        // chawan character: earthy raku bowl with a face, matcha froth "hair"
        const bx = -4, bz = -1;
        v.shape(bx - 8, 1, bz - 8, bx + 8, 10, bz + 8, (x, y, z) => { const r = Math.hypot(x - bx, z - bz); const R = 5.4 + Math.min(1.8, (y - 1) * 0.5); return r <= R; }, 0xf0e2d2);
        v.recolor((x, y, z, c) => (c === 0xf0e2d2 && hash(x, y, z, 5) < 0.12 ? 0xd88a6a : undefined));
        v.paint(() => v.shape(bx - 8, 1, bz - 8, bx + 8, 10, bz + 8, (x, y, z) => y >= 8 - Math.round(hash(x, 0, z, 3) * 3), gloss(0x4f7a4a)));
        v.paint(() => v.box(bx - 8, 1, bz - 8, bx + 8, 1, bz + 8, 0x3a2a22));
        v.cylinder(bx, 9, bz, 6, 2, null);
        v.cylinder(bx, 9, bz, 6.2, 1, 0x8cc04e);
        v.paint(() => v.shape(bx - 7, 9, bz - 7, bx + 7, 9, bz + 7, (x, y, z) => hash(x, y, z, 4) < 0.35, 0xb4dc78));
        v.ellipsoid(bx, 10, bz, 2, 0.8, 2, 0xb4dc78);
        face(v, bx, 6, { eyes: 'happy', spread: 3, mouth: 'smile' });
        // chasen whisk standing beside
        const wx = 9, wz = -5;
        v.cylinder(wx, 2, wz, 1, 4, C.bamboo);
        v.ellipsoid(wx, 9, wz, 2.2, 3.4, 2.2, 0xeee2b0);
        v.recolor((x, y, z, c) => (c === 0xeee2b0 && (x + z) % 2 === 0 ? 0xd8c88a : undefined));
        v.cylinder(wx, 11, wz, 1, 2, 0xc8b878);
        v.paint(() => v.box(wx - 3, 6, wz - 3, wx + 3, 6, wz + 3, 0x3a2a22));
        // pink sakura nerikiri on folded kaishi paper, with a tiny face
        const nx = 7, nz = 4;
        v.box(nx - 4, 2, nz - 3, nx + 3, 2, nz + 4, W);
        v.box(nx - 4, 2, nz + 4, nx + 3, 2, nz + 4, 0xece8e0);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          v.ellipsoid(nx + Math.cos(a) * 1.8, 4, nz + Math.sin(a) * 1.8, 1.8, 1.4, 1.8, 0xffb4cc);
        }
        v.cylinder(nx, 3, nz, 2, 2, 0xffc8d8);
        v.box(nx, 6, nz, nx, 6, nz, C.yellow);
        v.paint(() => v.shape(nx - 4, 3, nz - 4, nx + 4, 5, nz + 4, (x, y, z) => y === 5 && Math.hypot(x - nx, z - nz) < 1.5, 0xfff0a0));
        v.project(['K.K', '.P.'], { K, P: C.blush }, nx - 1, 4);
        // kuromoji pick resting on the paper
        v.line(nx - 3, 3, nz + 3, nx + 2, 3, nz + 4, C.woodDark);
        // yellow kinton ball sweet
        v.sphere(-11, 3.5, 5, 2, 0xf2c84e);
        v.paint(() => v.shape(-14, 2, 2, -8, 6, 8, (x, y, z) => hash(x, y, z, 6) < 0.35, 0xffe08a));
        v.project(['K.K'], { K }, -12, 4);
        // a tiny folding fan
        v.layer(['.RRRR.', 'RWRWRW', '.RRRR.', '..dd..'], { R: C.vermilion, W, d: C.woodDark }, { x: -13, y: 2, z: -7, plane: 'xz' });
      },
    },
    {
      id: 'shiruko', name: 'Shiratama Onsen', jp: 'おしるこ温泉', rarity: 'secret',
      desc: 'The water is 90% red beans. Locals swear it is wonderful for the skin.',
      build(v) {
        // red-and-black lacquer soup bowl
        const red = gloss(0xb8282c), blk = gloss(0x241818);
        v.cylinder(0, 0, 0, 6, 2, blk);
        v.shape(-13, 2, -13, 13, 11, 13, (x, y, z) => { const r = Math.hypot(x, z); const R = 7 + (y - 2) * 0.62; return r <= R && r > R - 1.3; }, red);
        v.cylinder(0, 2, 0, 7.4, 1, red);
        v.paint(() => v.shape(-13, 10, -13, 13, 11, 13, () => true, blk));
        v.paint(() => v.shape(-13, 3, -13, 13, 9, 13, (x, y, z) => y === 6 && (Math.round(Math.atan2(z, x) * 5) % 2 === 0), gloss(C.gold)));
        // oshiruko "hot spring"
        v.cylinder(0, 3, 0, 11.4, 7, gloss(0x6a2a2e));
        v.paint(() => v.shape(-12, 9, -12, 12, 9, 12, (x, y, z) => hash(x, y, z, 2) < 0.22, gloss(0x8a3a3e)));
        // dumpling bathers
        shiratama(v, -4, 9, 3, { r: 3, eyes: 'closed', mouth: 'smile' });
        v.box(-6, 15, 2, -2, 15, 4, W); v.paint(() => v.box(-6, 15, 3, -2, 15, 3, 0x6fa8e8)); // folded towel on its head
        shiratama(v, 4, 9, 4, { r: 2.8, eyes: 'happy', mouth: 'o', col: 0xffd4e2 });
        shiratama(v, 1, 9, -4, { r: 2.6, eyes: 'sleepy', mouth: 'o', col: 0xd8ecb8 });
        // toasted mochi floating as a pillow
        v.box(6, 9, -5, 9, 10, -2, 0xfff6e0);
        v.paint(() => v.box(6, 10, -5, 9, 10, -2, 0xe8b06a));
        v.set(7, 10, -4, 0xb8702e).set(8, 10, -3, 0xb8702e);
        // tiny wooden bath bucket (oke) on the rim
        v.cylinder(-9, 9, -5, 1.6, 2, C.woodLight);
        v.paint(() => v.cylinder(-9, 9, -5, 1.7, 1, C.woodDark));
        // steam wisps + ♨ signpost
        for (const [x, z, h] of [[-2, 0, 3], [3, -1, 4], [-6, -3, 2]]) for (let k = 0; k < h; k++) v.set(x + (k % 2), 15 + k, z, glass(0xffffff));
        v.box(-11, 10, 0, -8, 11, 2, W);
        v.paint(() => v.box(-11, 11, 1, -8, 11, 1, 0x6fa8e8));
      },
    },
  ],
};
