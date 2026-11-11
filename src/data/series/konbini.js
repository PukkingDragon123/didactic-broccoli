// Series 5 — Konbini Life (コンビニライフ)
// Japanese convenience-store miniatures: snacks, drinks and the night-shift heroes behind the counter.
import { C, shade } from '../../voxel/palette.js';
import { VoxelModel, gloss, metal, glow, glass, matte, enc } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

/** Deterministic 0..1 noise from integer coordinates. */
function hash(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Recolour the outer skin of a vertical round body (u = steps around, 0 = front). Material kept unless fn returns an encoded value. */
function wrap(v, cx, cz, rMin, n, fn) {
  v.recolor((x, y, z, c, m) => {
    const dx = x - cx, dz = z - cz;
    if (Math.hypot(dx, dz) < rMin) return undefined;
    const u = Math.round((Math.atan2(dx, dz) / (Math.PI * 2)) * n);
    const nc = fn(u, y, c, x, z);
    if (nc === undefined || nc === null) return undefined;
    return nc >= 0x1000000 ? nc : enc(nc, m);
  });
}

// --- rounded triangle (onigiri) -----------------------------------------
const TA = [-6.5, 2.6], TB = [6.5, 2.6], TT = [0, 13.4];
function sdSeg(px, py, [ax, ay], [bx, by]) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}
function riceTri(px, py, R) {
  const s = ([ax, ay], [bx, by]) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  if (s(TA, TB) >= 0 && s(TB, TT) >= 0 && s(TT, TA) >= 0) return true;
  return Math.min(sdSeg(px, py, TA, TB), sdSeg(px, py, TB, TT), sdSeg(px, py, TT, TA)) <= R;
}

/** Small triangular ear made of stacked slabs (front at z). */
function ear(v, x, y, z, color, inner, h = 3, w = 3) {
  for (let i = 0; i < h; i++) {
    const ww = Math.max(1, Math.round(w * (1 - i / h)));
    v.box(x - Math.floor(ww / 2), y + i, z, x + Math.ceil(ww / 2) - 1, y + i, z - 1, color);
    if (inner && i < h - 1 && ww > 2) v.set(x, y + i, z, inner);
  }
}

/** Steamed bun dome sitting on a square of paper. */
function bun(v, x, y, z, col, top) {
  v.box(x - 2, y, z - 2, x + 2, y, z + 2, C.paper);
  [2.5, 2.6, 2.2, 1.5].forEach((r, i) => v.cylinder(x, y + 1 + i, z, r, 1, gloss(col)));
  v.set(x, y + 5, z, gloss(col));
  v.paint(() => v.box(x - 3, y + 1, z - 3, x + 3, y + 1, z + 3, gloss(shade(col, 0.93))));
  v.paint(() => v.shape(x - 3, y + 3, z - 3, x + 3, y + 4, z + 3, (X, Y, Z) => (X - x + Z - z + 8) % 2 === 0, gloss(shade(col, 0.88))));
  if (top) top(v, x, y + 5, z);
}

const PRODUCTS = [C.red, C.yellow, C.sky, C.green, C.orange, C.hotpink, C.white, C.purple, C.blue, C.lime];

export default {
  id: 'konbini',
  order: 5,
  name: 'Konbini Life',
  jp: 'コンビニライフ',
  tagline: 'Open 24 hours, in your pocket',
  taglineJp: 'いらっしゃいませ〜！',
  price: 300,
  themes: ['food', 'city'],
  card: { bg: '#eef8f0', accent: '#2fae66', text: '#1f3a2c', accent2: '#ff8c2e', pattern: 'stripes' },
  capsule: { colors: [0x3cae5a, 0xff8c2e, 0x5cc4ff, 0xfbf8f2, 0xffd23f] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'onigiri', name: 'Salmon Onigiri', jp: '鮭おにぎり', rarity: 'common',
      desc: 'Pull tab 1, then 2, then 3. The nori still tears. Every. Single. Time.',
      build(v) {
        // rice triangle, slightly pillowed
        v.shape(-10, 0, -3, 10, 16, 3, (x, y, z) => riceTri(x, y, Math.abs(z) === 3 ? 1.7 : 2.6), C.rice);
        v.paint(() => v.shape(-10, 0, -3, 10, 16, 3, (x, y, z) => hash(x, y, z) < 0.2, 0xf0ebdf));
        // nori sheet wrapped around the bottom
        v.paint(() => v.shape(-10, 0, -4, 10, 6, 4, () => true, (x, y, z) => (hash(x, y, z) < 0.3 ? 0x2e3e30 : C.nori)));
        v.paint(() => v.shape(-10, 7, -4, 10, 7, 4, (x) => Math.abs(x) <= 2, C.nori));
        // clear film: sealed flange around the edge
        v.shape(-11, 0, 0, 11, 17, 0, (x, y) => !v.has(x, y, 0) && riceTri(x, y, 3.5), glass(0xeef6ff));
        v.shape(-11, 0, -1, 11, 17, 1, (x, y, z) => z !== 0 && !v.has(x, y, z) && riceTri(x, y, 3.0) && !riceTri(x, y, 2.6), glass(0xeef6ff));
        // red tear strip with tab "1"
        v.shape(0, 7, 0, 0, 16, 4, (x, y, z) => v.has(x, y, z) && !v.has(x, y, z + 1), gloss(C.red));
        v.box(0, 17, 0, 0, 18, 0, gloss(C.red));
        v.box(-1, 19, 0, 1, 19, 0, gloss(C.red));
        v.shape(0, 7, -4, 0, 16, 0, (x, y, z) => v.has(x, y, z) && !v.has(x, y, z - 1), gloss(C.red));
        // label sticker
        v.layer([
          'OOOOOOOOO',
          'WWWWWWWWW',
          'WSSSWKKKW',
          'WSsSWWWWW',
          'WWWWWKKWW',
        ], { O: gloss(0xff7a3a), W: gloss(C.white), S: gloss(C.salmon), s: gloss(0xffc0a0), K: C.charcoal }, { x: -4, y: 6, z: 4 });
        // corner tabs 2 and 3
        v.box(9, 0, -1, 10, 1, 1, glass(0xeef6ff)); v.set(10, 1, 1, gloss(C.blue));
        v.box(-10, 0, -1, -9, 1, 1, glass(0xeef6ff)); v.set(-10, 1, 1, gloss(C.green));
      },
    },
    {
      id: 'melonsoda', name: 'Melon Soda', jp: 'メロンソーダ', rarity: 'common',
      desc: 'Tastes of no melon ever grown on Earth. Perfect.',
      build(v) {
        const prof = [3.4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3.6, 3.1, 2.5, 2, 1.5, 1.5, 1.5, 2];
        prof.forEach((r, y) => v.cylinder(0, y, 0, r, 1, glass(0xb4ecc4)));
        const melon = 0x34d65e;
        for (let y = 1; y <= 14; y++) v.cylinder(0, y, 0, prof[y] - 1, 1, gloss(y >= 13 ? 0x7ee88a : melon));
        // fizz
        for (const [x, y, z] of [[1, 4, 2], [-1, 7, 2], [0, 10, 2], [2, 12, 1], [-2, 3, 1], [1, 9, -2]]) v.set(x, y, z, gloss(0xb8f5c0));
        // paper label
        wrap(v, 0, 0, 3.5, 24, (u, y) => {
          if (y < 4 || y > 11) return undefined;
          if (y === 4 || y === 11) return matte(0x2f9a4a);
          const icon = ['..b..', '.gGg.', 'gGgGg', 'GgGgG', '.gGg.', '.....'];
          const row = icon[10 - y], col = u + 2;
          if (row && col >= 0 && col < 5 && row[col] !== '.') return matte({ g: 0xa8ec84, G: 0x4fb04a, b: 0x7a5a2a }[row[col]]);
          if (y === 5 && Math.abs(u) <= 3) return matte(C.red);
          if (Math.abs(u) === 12 || Math.abs(u) === 11) return matte(y % 2 ? C.charcoal : C.white);
          if (y === 6 && Math.abs(u) >= 4 && Math.abs(u) <= 8) return matte(C.red);
          return matte(C.white);
        });
        // crown cap
        v.cylinder(0, 21, 0, 2, 1, gloss(C.red));
        v.cylinder(0, 22, 0, 1.5, 1, gloss(C.red));
        v.paint(() => { v.set(0, 22, 0, gloss(C.white)); v.set(2, 21, 0, gloss(0xb02020)); v.set(-2, 21, 0, gloss(0xb02020)); v.set(0, 21, 2, gloss(0xb02020)); v.set(0, 21, -2, gloss(0xb02020)); });
        // condensation drops
        for (const [a, y] of [[0.5, 3], [1.1, 12], [-0.7, 7], [-1.4, 11], [2.2, 4]]) {
          const x = Math.round(Math.sin(a) * 4.6), z = Math.round(Math.cos(a) * 4.6);
          if (!v.has(x, y, z)) v.set(x, y, z, glass(0xffffff));
        }
      },
    },
    {
      id: 'cancoffee', name: 'Hot Canned Coffee', jp: 'ホット缶コーヒー', rarity: 'common',
      desc: 'Too hot to hold, too precious to put down. A ¥130 hand-warmer.',
      build(v) {
        // warmer shelf + orange HOT rail
        v.box(-8, 0, -6, 8, 1, 6, gloss(0xc8ccd2));
        v.paint(() => { for (let z = -5; z <= 5; z += 2) v.box(-8, 1, z, 8, 1, z, gloss(0xa8adb4)); });
        v.box(-8, 0, 7, 8, 2, 7, gloss(0xff6a1a));
        v.project(['H.H.OOO.TTT', 'HHH.O.O..T.', 'H.H.OOO..T.'], { H: W, O: W, T: W }, -5, 2);
        // the can
        const brown = 0x4a2a1c;
        v.cylinder(0, 2, 0, 5, 16, gloss(brown));
        v.cylinder(0, 17, 0, 4.6, 1, metal(C.silver));
        v.tube(0, 18, 0, 4.6, 3.4, 1, metal(C.silver));
        v.paint(() => v.cylinder(0, 2, 0, 5, 1, metal(C.silver)));
        v.box(-1, 18, -1, 1, 18, 1, metal(C.chrome)); v.set(0, 18, 0, null); // stay-on tab
        v.box(-1, 17, 2, 1, 17, 3, C.charcoal); // drinking hole
        // label: cream top, gold bands, coffee bean emblem
        const bean = ['..ccc..', '.cbbbc.', 'cbbsbbc', 'cbsbbbc', 'cbbsbbc', '.cbbbc.', '..ccc..'];
        wrap(v, 0, 0, 4.4, 30, (u, y, c) => {
          if (y < 3 || y > 16) return undefined;
          if (y === 3 || y === 14) return metal(C.gold);
          if (y >= 15) return Math.abs(u) === 15 || Math.abs(u) === 14 ? C.red : C.cream;
          const row = bean[12 - y], col = u + 3;
          if (row && col >= 0 && col < 7 && row[col] !== '.') return { c: C.cream, b: 0x9a5a32, s: 0x2a160c }[row[col]];
          if (y === 5 && Math.abs(u) > 4) return 0xd8342a;
          if (Math.abs(u) >= 13 && y >= 7 && y <= 11 && (y & 1)) return C.cream;
          return undefined;
        });
        // steam curling up from the opening
        for (const [x, z, ph, n] of [[0, 3, 0, 5], [-1, 1, 2, 4]]) {
          for (let i = 0; i < n; i++) v.set(x + [0, 1, 1, 0][(i + ph) % 4], 18 + i, z, glass(0xffffff));
        }
      },
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'oden', name: 'Konbini Oden', jp: 'おでん', rarity: 'uncommon',
      desc: 'Daikon, egg, konnyaku, chikuwa. The broth has been simmering since 1987.',
      build(v) {
        const steel = gloss(0xc9ced5), rim = metal(C.chrome), div = metal(C.silver);
        v.box(-12, 0, -8, 12, 6, 8, steel);
        v.paint(() => { v.box(-12, 0, -8, 12, 0, 8, gloss(0x8f959c)); v.box(-12, 3, -8, 12, 3, 8, gloss(0xb4bac2)); });
        v.box(-11, 2, -7, 11, 6, 7, null);
        v.paint(() => { v.box(-12, 6, -8, 12, 6, 8, rim); });
        for (const x of [-4, 4]) v.box(x, 2, -7, x, 5, 7, div);
        v.box(-11, 2, 0, 11, 5, 0, div);
        // broth
        const broth = gloss(0xcf9440);
        v.shape(-11, 2, -7, 11, 4, 7, (x, y, z) => !v.has(x, y, z), broth);
        v.paint(() => v.shape(-11, 4, -7, 11, 4, 7, (x, y, z) => hash(x, y, z) < 0.15, gloss(0xe8b45a)));
        // daikon (back-left)
        v.cylinder(-8, 3, -4, 2.6, 4, gloss(0xf4dca4));
        v.paint(() => { v.tube(-8, 6, -4, 2.6, 1.8, 1, gloss(0xd9a85a)); v.tube(-8, 5, -4, 2.6, 2, 1, gloss(0xe6c07c)); v.box(-8, 6, -5, -8, 6, -3, gloss(0xd8a860)); v.box(-9, 6, -4, -7, 6, -4, gloss(0xd8a860)); });
        // eggs (back-middle), one cut open
        v.ellipsoid(-1.5, 5, -4.5, 1.6, 2.2, 1.6, gloss(0xd9a468));
        v.ellipsoid(1.6, 4.5, -2.8, 1.6, 1.8, 1.6, gloss(0xd9a468));
        v.box(0, 7, -5, 3, 7, -1, null);
        v.paint(() => { v.box(0, 6, -5, 3, 6, -1, gloss(C.eggWhite)); v.set(2, 6, -3, gloss(0xffb81c)); v.set(1, 6, -3, gloss(0xffb81c)); });
        // konnyaku triangles on a skewer (back-right)
        for (const z of [-6, -3]) {
          v.layer(['..k..', '.kkk.', 'kkkkk', 'kkkkk'], { k: (0x8a8580) }, { x: 6, y: 7 + (z === -6 ? 1 : 0), z, depth: 2 });
        }
        v.paint(() => v.shape(5, 4, -7, 11, 8, -1, (x, y, z) => hash(x, y, z) < 0.3 && v.get(x, y, z) === enc(0x8a8580), 0x5e5a56));
        v.box(8, 5, -7, 8, 13, -7, C.woodLight); v.box(8, 5, -6, 8, 5, -2, C.woodLight);
        // chikuwa (front-left)
        for (const z of [2, 5]) {
          v.tube(-11, 5, z, 1.4, 0.4, 7, gloss(0xf3d9a8), 'x');
          v.box(-11, 5, z, -5, 5, z, gloss(0x5a3a20));
          v.paint(() => v.shape(-10, 6, z - 1, -6, 7, z + 1, (x, y) => y >= 6, gloss((z & 1) ? 0xb4682c : 0xc27838)));
          v.paint(() => v.shape(-10, 6, z - 1, -6, 7, z + 1, (x, y, zz) => hash(x, y, zz) < 0.35, gloss(0x8a4a1e)));
        }
        // tsukune skewer (front-middle)
        v.line(-1, 4, 2, 2, 13, 5, C.woodLight);
        for (const t of [0.25, 0.5, 0.75]) v.sphere(-1 + 3 * t, 4 + 9 * t, 2 + 3 * t, 1.3, gloss(0x8a5a38));
        // mochi kinchaku pouch (front-right)
        v.ellipsoid(8, 5, 4, 2.4, 2.2, 2.4, gloss(0xd99a48));
        v.paint(() => v.shape(5, 7, 1, 11, 7, 7, () => true, gloss(0x8a5a22)));
        v.box(7, 8, 4, 9, 8, 4, gloss(0xd99a48)); v.box(8, 8, 3, 8, 9, 5, gloss(0xd99a48)); v.set(8, 9, 4, gloss(0xe8b060));
        // front: red "oden" placard + control lamp
        v.box(-7, 1, 9, 7, 5, 9, gloss(C.red));
        v.project(['W....WWW.....', 'WW..WWWWW.WWW', 'WWWSWWWWWSWWW', 'WW..WWWWW.WWW', 'W....WWW.....'], { W: gloss(C.white), S: gloss(C.woodLight) }, -6, 5);
        v.set(-7, 3, 9, gloss(C.woodLight)); v.set(7, 3, 9, gloss(C.woodLight));
        v.set(10, 2, 9, glow(0xff5a2a)); v.box(10, 1, 9, 11, 1, 9, gloss(C.charcoal));
      },
    },
    {
      id: 'bento', name: 'Makunouchi Bento', jp: '幕の内弁当', rarity: 'uncommon',
      desc: 'Something for everyone, plus one tiny fish full of soy sauce.',
      build(v) {
        const tray = gloss(0x1e1a1a), lac = gloss(C.lacquer);
        v.box(-13, 0, -9, 13, 3, 9, tray);
        v.box(-12, 1, -8, 12, 3, 8, null);
        v.paint(() => v.box(-13, 3, -9, 13, 3, 9, lac));
        v.box(-1, 1, -8, -1, 3, 8, tray); v.box(0, 1, 0, 12, 3, 0, tray); v.box(5, 1, 1, 5, 3, 8, tray);
        // rice with umeboshi and sesame
        v.box(-12, 1, -8, -2, 3, 8, C.rice);
        v.shape(-12, 4, -8, -2, 4, 8, (x, y, z) => ((x + 7) / 5.6) ** 2 + (z / 8.2) ** 2 <= 1, C.rice);
        v.paint(() => v.shape(-12, 1, -8, -2, 4, 8, (x, y, z) => hash(x, y, z) < 0.06, C.charcoal));
        v.sphere(-7, 5, -1, 1.3, gloss(0xc8202a));
        v.set(-7, 6, -1, gloss(0xff5060));
        // soy-sauce fish
        v.ellipsoid(-6, 5, 5, 2, 0.6, 0.9, gloss(0x4a2414));
        v.set(-9, 5, 5, gloss(0x4a2414)); v.set(-9, 5, 4, gloss(0x4a2414)); v.set(-9, 5, 6, gloss(0x4a2414));
        v.set(-3, 5, 5, gloss(C.red)); v.set(-5, 6, 5, gloss(0x7a4a34)); v.set(-4, 5, 6, gloss(C.white));
        // grilled salmon (back-right)
        v.shape(0, 1, -7, 7, 4, -2, (x, y, z) => y <= 4 - Math.floor(x / 4) && !(z === -2 && y === 4), (x, y, z) => {
          if (z === -7) return 0x8a8a96;
          if ((x + z) % 4 === 0) return 0xffc4a8;
          return C.salmon;
        });
        v.paint(() => { for (const x of [1, 4]) v.box(x, 4, -6, x, 4, -3, 0xb0502a); v.box(5, 3, -6, 5, 3, -3, 0xb0502a); });
        // green baran grass divider
        for (let z = -8; z <= -1; z++) v.box(8, 1, z, 8, 4 + ((z + 8) % 2), z, gloss(0x2fb84a));
        // pickles: shibazuke + takuan
        v.ellipsoid(10.5, 2.5, -6, 1.6, 1.2, 1.6, 0x9a3a7a);
        v.paint(() => v.shape(9, 1, -8, 12, 4, -4, (x, y, z) => hash(x, y, z) < 0.3, 0x6a2050));
        v.box(9, 1, -3, 12, 3, -3, gloss(0xf2d040)); v.box(9, 1, -2, 12, 3, -2, gloss(0xe8c030));
        // tamagoyaki slices (front-middle)
        for (const z of [2, 6]) {
          v.box(0, 1, z - 1, 4, 4, z + 1, gloss(C.egg));
          v.project(['YYYYY', 'YyyyY', 'YyYyY', 'YYYYY'], { Y: gloss(0xf6c030), y: gloss(0xffe27a) }, 0, 4, '+z');
        }
        // lettuce, karaage, lemon (front-right)
        v.box(6, 1, 1, 12, 1, 8, C.leaf);
        v.paint(() => v.shape(6, 1, 1, 12, 1, 8, (x, y, z) => (x + z) % 3 === 0, C.lime));
        for (const [x, z] of [[7.5, 3], [10.5, 3.5], [8.5, 6.5]]) v.sphere(x, 3, z, 1.7, (X, Y, Z) => (hash(X, Y, Z) < 0.35 ? 0x9a5420 : 0xc8782e));
        v.cylinder(11.5, 2, 7, 1.3, 2, gloss(C.yellow));
        v.paint(() => v.set(11, 3, 7, gloss(C.pastelYellow)));
        // chopsticks in their paper sleeve
        v.box(-11, 0, 11, 11, 0, 12, C.woodLight);
        v.box(-11, 0, 10, 4, 1, 13, C.white);
        v.paint(() => { v.box(-6, 0, 10, -5, 1, 13, C.red); v.box(-9, 1, 11, -8, 1, 12, C.red); });
      },
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'nikuman', name: 'Nikuman Steamer', jp: '中華まんスチーマー', rarity: 'rare',
      desc: 'One of the buns is not like the others. It is looking at you.',
      build(v) {
        const red = gloss(0xd8382c), steel = gloss(0xd5d9de), post = metal(C.chrome), pane = glass(0x9cc0d8);
        // base cabinet
        v.box(-10, 0, -7, 10, 3, 6, red);
        v.paint(() => { v.box(-10, 0, -7, 10, 0, 6, gloss(C.charcoal)); v.box(-10, 3, -7, 10, 3, 6, steel); });
        v.paint(() => { for (let x = -8; x <= 2; x += 2) v.box(x, 1, 6, x, 2, 6, gloss(0x8a1a14)); });
        v.box(5, 1, 6, 8, 2, 6, C.charcoal); v.box(6, 1, 6, 7, 2, 6, glow(0x6aff7a));
        // glass case: steel floor & roof, glass all round, chrome posts
        v.box(-10, 4, -7, 10, 4, 6, gloss(0x8e969f));
        v.box(-10, 20, -7, 10, 20, 6, steel);
        v.box(-9, 5, 6, 9, 19, 6, pane);
        for (const x of [-10, 10]) v.box(x, 5, -6, x, 19, 5, pane);
        v.box(-9, 5, -7, 9, 19, -7, pane);
        for (const x of [-10, 10]) for (const z of [-7, 6]) v.box(x, 4, z, x, 20, z, post);
        v.box(-10, 20, 6, 10, 20, 6, post); v.box(-10, 4, 6, 10, 4, 6, post);
        v.box(-10, 4, -7, 10, 4, -7, post); v.box(0, 5, -7, 0, 19, -7, post); // staff-side sliding doors
        v.box(-2, 11, -8, -2, 13, -8, post); v.box(2, 11, -8, 2, 13, -8, post);
        v.box(-9, 19, -6, 9, 19, -5, glow(0xfff0c8)); // warm lamp
        // wire shelf
        v.box(-9, 11, -6, 9, 11, 5, gloss(0x8e969f));
        v.paint(() => v.shape(-9, 11, -6, 9, 11, 5, (x, y, z) => ((x + z) & 1) === 1, gloss(0x6e767f)));
        // price cards on the shelf edges
        for (const x of [-6, 0, 6]) {
          v.paint(() => { v.box(x - 1, 11, 5, x + 1, 11, 5, gloss(C.white)); v.set(x - 1, 11, 5, gloss(C.red)); });
          v.paint(() => { v.box(x - 1, 4, 6, x + 1, 4, 6, gloss(C.white)); v.set(x - 1, 4, 6, gloss(C.red)); });
        }
        // buns: nikuman x2 + pizza-man below; anman, curry-man and the cat bun above
        const pleat = (v2, x, y, z) => { v2.set(x, y, z, gloss(0xe0d0b4)); v2.paint(() => { v2.set(x - 1, y - 1, z, gloss(0xe6d8bf)); v2.set(x + 1, y - 1, z, gloss(0xe6d8bf)); v2.set(x, y - 1, z + 1, gloss(0xe6d8bf)); }); };
        bun(v, -6, 5, -1, 0xf8eedb, pleat);
        bun(v, 0, 5, -1, 0xf8eedb, pleat);
        bun(v, 6, 5, -1, 0xf2a070, (v2, x, y, z) => { v2.paint(() => { v2.set(x, y - 2, z + 2, gloss(C.red)); v2.set(x - 2, y - 2, z + 1, gloss(C.leaf)); v2.set(x + 1, y - 1, z, gloss(C.red)); v2.set(x + 2, y - 3, z + 1, gloss(C.red)); v2.set(x - 1, y - 3, z + 2, gloss(C.yellow)); }); });
        bun(v, -6, 12, -1, 0xf8eedb, (v2, x, y, z) => v2.paint(() => { v2.set(x, y, z, gloss(C.red)); v2.set(x, y - 1, z, gloss(C.red)); v2.set(x, y - 2, z + 2, gloss(0x5c2b2e)); }));
        bun(v, 0, 12, -1, 0xeec070, (v2, x, y, z) => v2.paint(() => { v2.set(x - 1, y - 1, z + 1, gloss(0xb87830)); v2.set(x + 1, y - 2, z + 2, gloss(0xb87830)); v2.set(x, y - 1, z - 1, gloss(0xb87830)); }));
        bun(v, 6, 12, -1, 0xfffaf0, (v2, x, y, z) => {
          ear(v2, x - 2, y - 1, z, gloss(0xfffaf0), C.pink, 2, 2);
          ear(v2, x + 2, y - 1, z, gloss(0xfffaf0), C.pink, 2, 2);
          v2.project(['.K.K.', 'P.M.P'], { K: K, M: C.mouth, P: C.blush }, x - 2, y - 2);
        });
        // glowing header sign
        v.box(-10, 21, -7, 10, 25, 6, red);
        v.box(-9, 22, 6, 9, 24, 6, glow(0xff7a3a));
        v.project(['..WWW..', '.WWWWW.', 'WWWWWWW'], { W: glow(0xfff6e0) }, -3, 24, '+z');
        v.project(['Y.Y', '.Y.', 'Y.Y'], { Y: glow(0xffe14a) }, -8, 24); v.project(['Y.Y', '.Y.', 'Y.Y'], { Y: glow(0xffe14a) }, 6, 24);
        v.box(10, 22, -6, 10, 24, 5, glow(0xff7a3a));
        v.box(-10, 22, -6, -10, 24, 5, glow(0xff7a3a));
      },
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'storefront', name: 'Corner Konbini', jp: '街角のコンビニ', rarity: 'ultra',
      desc: 'Open 24 hours, 365 days. You will hear the door chime in your dreams.',
      build(v) {
        // pavement + parking lot
        v.box(-14, 0, -9, 15, 0, 13, 0x6e6d72);
        v.paint(() => v.box(-14, 0, -9, 15, 0, 8, 0xc9c5bc));
        v.paint(() => { for (let x = -14; x <= 15; x += 3) v.box(x, 0, -9, x, 0, 8, 0xb2aea6); for (let z = -9; z <= 8; z += 3) v.box(-14, 0, z, 15, 0, z, 0xb2aea6); });
        v.paint(() => { for (const x of [-9, 0, 9]) v.box(x, 0, 9, x, 0, 13, C.white); });
        v.box(-6, 1, 10, -3, 1, 10, gloss(C.yellow)); v.box(3, 1, 10, 6, 1, 10, gloss(C.yellow));
        // building shell
        const wall = 0xf4f1ea;
        v.hollowBox(-12, 1, -9, 12, 17, 2, wall);
        v.paint(() => { v.box(-12, 1, -9, 12, 2, 2, C.darkgray); v.box(-12, 17, -9, 12, 17, 2, C.lightgray); });
        // interior: tiled floor, glowing ceiling, coolers along the back
        v.box(-11, 1, -8, 11, 1, 1, 0xefe9da);
        v.box(-11, 12, -8, 11, 12, 1, glow(0xfff8ea));
        v.box(-11, 2, -8, 11, 10, -8, glow(0xdff2ff));
        v.paint(() => v.shape(-11, 3, -8, 11, 9, -8, (x, y) => (y === 4 || y === 7) && (x & 1), (x) => glow(PRODUCTS[(x + 20) % PRODUCTS.length])));
        v.paint(() => { for (let x = -9; x <= 11; x += 4) v.box(x, 2, -8, x, 10, -8, glow(0x9ab0c0)); });
        // gondola shelves
        for (const x0 of [-10, 5]) {
          v.box(x0, 2, -3, x0 + 5, 7, -3, C.lightgray);
          for (const y of [3, 5, 7]) for (let x = x0; x <= x0 + 5; x++) v.set(x, y, -2, PRODUCTS[Math.floor(hash(x, y, 1) * PRODUCTS.length)]);
        }
        // magazine rack behind the left window
        v.box(-11, 2, 0, -5, 2, 1, C.gray);
        v.box(-11, 3, 0, -5, 7, 0, C.gray);
        for (let x = -11; x <= -5; x++) {
          const c = PRODUCTS[(x + 23) % PRODUCTS.length];
          v.box(x, 3, 1, x, 5, 1, c); v.set(x, 6, 1, shade(c, 0.7));
        }
        // shop front: windows, automatic doors
        v.box(-11, 3, 2, -5, 11, 2, glass(0xdff0ff));
        v.box(5, 3, 2, 11, 11, 2, glass(0xdff0ff));
        v.box(-3, 2, 2, 3, 11, 2, metal(C.silver));
        v.box(-2, 2, 2, -1, 10, 2, glass(0xdff0ff)); v.box(1, 2, 2, 2, 10, 2, glass(0xdff0ff));
        v.box(-3, 1, 3, 3, 1, 3, metal(C.steel));
        v.box(-1, 6, 3, -1, 6, 3, metal(C.chrome)); v.box(1, 6, 3, 1, 6, 3, metal(C.chrome));
        v.box(-12, 11, 3, 12, 11, 3, gloss(C.offwhite)); // little canopy lip
        // glowing signboard (front + right side)
        const band = (y) => [glow(0x3a7ae8), glow(0xfafaf2), glow(0x2fcf6a), glow(0xfafaf2), glow(0xff9a30)][y - 12];
        v.shape(-12, 12, 3, 12, 16, 3, () => true, (x, y) => band(y));
        v.shape(13, 12, -8, 13, 16, 3, () => true, (x, y) => band(y));
        v.box(-2, 12, 4, 2, 16, 4, glow(0xfafaf2));
        v.project(['..R..', '.RRR.', 'RRRRR', '.RRR.', '.R.R.'], { R: glow(0xff6a2a) }, -2, 16, '+z');
        // roof: AC unit + pipe
        v.box(4, 18, -7, 9, 20, -4, C.lightgray);
        v.paint(() => { v.cylinder(6, 19, -4, 1.2, 1, C.darkgray, 'z'); v.box(4, 18, -7, 9, 18, -4, C.gray); });
        v.set(6, 19, -4, C.lightgray);
        v.line(9, 18, -6, 11, 18, -6, C.gray);
        // recycling bins
        [[-12, gloss(C.plasticBlue)], [-10, gloss(C.plasticGreen)], [-8, gloss(C.plasticYellow)]].forEach(([x, c]) => {
          v.box(x, 1, 4, x + 1, 5, 6, c);
          v.box(x, 5, 6, x + 1, 5, 6, C.charcoal);
        });
        // nobori flag
        v.box(-14, 1, 8, -13, 1, 9, C.gray);
        v.box(-13, 2, 8, -13, 16, 8, metal(C.silver));
        v.box(-12, 16, 8, -10, 16, 8, metal(C.silver));
        v.box(-12, 7, 8, -10, 15, 8, gloss(C.red));
        v.project(['.W.', 'WWW', '.W.', '...', 'W.W', '.W.', '...', 'WW.', '.WW'], { W: gloss(C.white) }, -12, 15);
        // mamachari bicycle parked along the side, shopping bag in the basket
        const b = new VoxelModel();
        const tire = 0x55555c, frame = gloss(C.red), sv = metal(C.silver), bz = -15;
        for (const wx of [5, 11]) {
          b.torus(wx, 4, bz, 2.5, 0.5, tire, 'z');
          b.set(wx, 4, bz, sv); b.line(wx - 2, 4, bz, wx + 2, 4, bz, sv); b.line(wx, 2, bz, wx, 6, bz, sv);
        }
        b.line(5, 4, bz, 8, 4, bz, frame); b.line(5, 4, bz, 7, 8, bz, frame); b.line(8, 4, bz, 7, 8, bz, frame);
        b.line(8, 4, bz, 10, 8, bz, frame); b.line(10, 8, bz, 11, 4, bz, frame);
        b.box(6, 9, bz - 1, 8, 9, bz + 1, gloss(C.darkbrown));
        b.line(10, 8, bz, 10, 10, bz, sv); b.box(10, 10, bz - 1, 10, 10, bz + 1, sv);
        b.set(9, 10, bz - 1, C.charcoal); b.set(9, 10, bz + 1, C.charcoal);
        b.hollowBox(11, 8, bz - 1, 13, 10, bz + 1, sv, 1, ['top']);
        b.box(12, 9, bz, 12, 11, bz, C.white); b.set(12, 12, bz, C.white); b.set(12, 11, bz - 1, gloss(C.green));
        b.box(3, 7, bz - 1, 6, 7, bz + 1, sv); // rear rack
        b.box(5, 1, bz - 1, 5, 3, bz - 1, sv); // kickstand
        for (const wx of [5, 11]) b.shape(wx - 4, 5, bz, wx + 4, 8, bz, (x, y) => { const d = Math.hypot(x - wx, y - 4); return d > 3.2 && d < 4.1 && y >= 5; }, gloss(C.white));
        b.rotateY(1);
        v.merge(b, -1, 0, -2);
        // back of the shop: staff door with lamp, vent, drainpipe, crate
        v.box(-6, 2, -10, -3, 8, -10, gloss(0x9aa0a8));
        v.set(-4, 5, -11, metal(C.chrome)); v.box(-5, 9, -11, -4, 9, -10, glow(0xfff2b0));
        v.paint(() => { for (let y = 12; y <= 15; y++) v.box(2, y, -9, 7, y, -9, y % 2 ? C.gray : C.lightgray); });
        v.box(10, 1, -10, 10, 17, -10, C.gray);
        v.box(-11, 1, -11, -8, 3, -10, gloss(C.plasticBlue)); v.box(-11, 3, -11, -8, 3, -10, gloss(0x2a5ab0));
      },
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'nekotenin', name: 'Night-Shift Cat Clerk', jp: '深夜のネコ店員', rarity: 'secret',
      desc: 'Scans everything twice just to hear the beep. Accepts payment in fish.',
      build(v) {
        // floor tiles
        v.shape(-12, 0, -9, 12, 0, 8, () => true, (x, y, z) => (((x >> 1) + (z >> 1)) & 1 ? C.white : 0xe6e2d8));
        // back shelf of snacks
        v.box(-12, 1, -9, 12, 14, -8, C.lightgray);
        for (const y of [4, 8, 12]) v.box(-12, y, -7, 12, y, -7, C.gray);
        for (const y of [5, 9, 13]) for (let x = -11; x <= 11; x++) {
          if (hash(x, y, 4) < 0.85) v.set(x, y, -7, PRODUCTS[Math.floor(hash(x, y, 9) * PRODUCTS.length)]);
        }
        v.paint(() => { v.box(-9, 6, -9, -3, 11, -9, C.cream); v.box(-8, 9, -9, -4, 10, -9, C.sky); v.box(-8, 7, -9, -5, 7, -9, C.gray); });
        v.paint(() => { v.box(3, 8, -9, 8, 12, -9, C.white); v.box(3, 12, -9, 8, 12, -9, C.red); for (let x = 3; x <= 8; x += 2) v.box(x, 8, -9, x, 10, -9, C.lightgray); });
        // counter with brand stripes
        v.box(-11, 1, 1, 11, 9, 6, gloss(C.white));
        v.paint(() => { v.box(-11, 8, 6, 11, 8, 6, gloss(0x2fae66)); v.box(-11, 7, 6, 11, 7, 6, gloss(0xff8c2e)); v.box(-11, 1, 1, 11, 1, 6, gloss(0x3a7ae8)); });
        v.box(-12, 10, 0, 12, 10, 7, gloss(0xd8d2c4));
        // cash register
        v.box(-10, 11, 1, -4, 12, 5, gloss(C.offwhite));
        v.paint(() => { v.box(-10, 11, 5, -4, 11, 5, gloss(C.lightgray)); v.box(-8, 11, 5, -6, 11, 5, gloss(C.darkgray)); });
        v.box(-10, 13, 1, -4, 13, 3, gloss(C.offwhite));
        v.paint(() => v.shape(-10, 13, 1, -4, 13, 3, (x, y, z) => ((x + z) & 1) === 0, (x) => gloss([C.sky, C.yellow, C.pink, C.lime][(x + 12) % 4])));
        v.box(-7, 14, 4, -7, 14, 4, gloss(C.charcoal));
        v.box(-10, 15, 4, -4, 19, 4, gloss(C.charcoal));
        v.box(-9, 16, 5, -5, 18, 5, glow(0x6ff0c8));
        v.project(['.K.KK', 'KKK.K', '.K.KK'], { K: glow(0x1a6a5a) }, -9, 18, '+z');
        v.box(-3, 11, 2, -3, 14, 3, C.white); v.set(-3, 15, 3, C.white); // receipt
        // a fish on the counter, being scanned
        v.ellipsoid(1, 11, 5, 3.2, 1, 1.7, gloss(0xf0646a));
        v.paint(() => v.box(-3, 11, 6, 5, 12, 7, gloss(0xffb0a8)));
        v.box(-3, 11, 4, -3, 11, 6, gloss(0xe0505a)); v.box(-4, 11, 3, -4, 11, 7, gloss(0xe0505a));
        v.box(0, 12, 4, 2, 12, 4, gloss(0xe0505a));
        v.set(3, 12, 5, gloss(C.white)); v.set(3, 12, 6, K);
        v.set(0, 12, 6, gloss(C.yellow)); v.set(1, 12, 6, gloss(C.yellow));
        // paper bag with a melon soda peeking out
        v.box(6, 11, 1, 10, 17, 4, 0xc9a06a);
        v.box(7, 17, 2, 9, 17, 3, null);
        v.paint(() => { v.box(6, 11, 4, 6, 17, 4, 0xb08850); v.box(10, 11, 4, 10, 17, 4, 0xb08850); });
        for (let x = 6; x <= 10; x += 2) { v.set(x, 18, 1, 0xc9a06a); v.set(x, 18, 4, 0xc9a06a); }
        v.box(8, 15, 2, 8, 20, 2, glass(0x9fe8b0)); v.set(8, 21, 2, gloss(C.red));
        v.box(7, 18, 3, 8, 19, 3, C.rice); v.set(7, 18, 3, C.nori);
        // the cat clerk: striped uniform shirt
        v.ellipsoid(0, 13, -3, 5.4, 6, 3.6, (x) => ((x & 1) ? gloss(0x3a6fd6) : gloss(C.white)));
        v.paint(() => v.box(-2, 17, 0, 2, 18, 1, gloss(C.white)));
        v.box(-3, 14, 1, -2, 15, 1, gloss(C.white)); v.set(-3, 15, 1, gloss(C.red));
        // head: orange tabby, sleepy
        const fur = 0xf0a050, furD = 0xcf7a32;
        v.ellipsoid(0, 22, -2.5, 6.2, 4.8, 4.6, fur);
        v.paint(() => v.ellipsoid(0, 19.8, 1.6, 2.8, 1.8, 1.6, C.white));
        ear(v, -4, 25, -1, fur, C.pink, 4, 4); ear(v, 4, 25, -1, fur, C.pink, 4, 4);
        v.project(['..D.D.D..', '.........', 'DD.....DD', 'KK.....KK', '....N....', 'P..K.K..P'], { D: furD, K: K, N: C.hotpink, P: C.blush }, -4, 25);
        v.project(['WW.......WW'], { W: C.lightgray }, -5, 20);
        v.project(['.D.D.D.', '.......', '.D.D.D.'], { D: furD }, -3, 25, '-z');
        v.project(['D.D', '...', 'D.D'], { D: furD }, -4, 24, '+x'); v.project(['D.D', '...', 'D.D'], { D: furD }, -4, 24, '-x');
        // arms: one paw on the keys, one holding a barcode scanner
        v.line(-5, 16, -2, -6.5, 14, 1.5, (x) => ((x & 1) ? gloss(0x3a6fd6) : gloss(C.white)), 1);
        v.sphere(-7, 14, 2.5, 1.2, C.white);
        v.line(5, 16, -2, 5.5, 14, 1.5, (x) => ((x & 1) ? gloss(0x3a6fd6) : gloss(C.white)), 1);
        v.sphere(5.5, 14, 2.5, 1.2, C.white);
        v.box(4, 15, 3, 6, 16, 5, gloss(C.darkgray)); v.box(5, 13, 3, 5, 14, 3, gloss(C.darkgray));
        v.set(5, 15, 6, glow(0xff3a2a)); v.set(5, 16, 6, gloss(C.darkgray));
        v.line(5, 14, 6, 2, 12, 6, glow(0xff5a4a));
        // tail curling up behind
        for (const [x, y, z, c] of [[-4, 9, -6, fur], [-6, 10, -6, furD], [-7, 12, -5, fur], [-8, 14, -5, furD], [-8, 16, -4, fur], [-7, 17.5, -3, furD]]) v.sphere(x, y, z, 1, c);
      },
    },
  ],
};
