// Series 6 — My Tiny Room (ミニチュアのお部屋)
// Miniature Japanese room furniture, dollhouse-style, with tiny lived-in details.
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

/** Deterministic 0..1 hash of integer coordinates (no Math.random in builds). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1442695041 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const mod = (a, n) => ((a % n) + n) % n;

// shared colours
const TATAMI = 0xd6c88a;
const TATAMI_D = 0xc4b674;
const HERI = 0x2f4a3a;
const HINOKI = 0xecc98f;
const HINOKI_D = 0xc9a066;
const PAPER = 0xfbf6ea;
const ORANGE = 0xff9a1f;

/** Tatami slab. Long edges (with the cloth heri border) run along `long` axis. */
function tatami(v, x0, z0, x1, z1, { y = 0, h = 2, long = 'x' } = {}) {
  v.box(x0, y, z0, x1, y + h - 1, z1, TATAMI);
  const top = y + h - 1;
  v.paint(() => v.shape(x0, top, z0, x1, top, z1, (x, yy, z) => mod(long === 'x' ? x : z, 2) === 0, TATAMI_D));
  v.paint(() => {
    if (long === 'x') { v.box(x0, y, z0, x1, top, z0, HERI); v.box(x0, y, z1, x1, top, z1, HERI); }
    else { v.box(x0, y, z0, x0, top, z1, HERI); v.box(x1, y, z0, x1, top, z1, HERI); }
  });
}

/** Little mikan (mandarin) with a calyx on top. */
function mikan(v, x, y, z) {
  v.sphere(x, y + 1, z, 1.5, gloss(ORANGE));
  v.set(x, y + 3, z, C.leaf);
}

/** Tiny wooden oke (bath bucket) with copper hoops. */
function oke(v, x, y, z, r = 2.5, h = 4, water = true) {
  v.cylinder(x, y, z, r, h, HINOKI);
  v.cylinder(x, y + 1, z, r - 1, h - 1, null);
  v.paint(() => {
    v.shape(x - 4, y, z - 4, x + 4, y + h, z + 4, (xx, yy, zz) => mod(Math.round(Math.atan2(zz - z, xx - x) * 3), 2) === 0, HINOKI_D);
    v.cylinder(x, y + 1, z, r, 1, metal(C.copper));
    v.cylinder(x, y + h - 2, z, r, 1, metal(C.copper));
  });
  if (water) v.cylinder(x, y + 1, z, r - 1, h - 2, glass(0xa8e2f2));
}

export default {
  id: 'heya',
  order: 6,
  name: 'My Tiny Room',
  jp: 'ミニチュアのお部屋',
  tagline: 'Pocket-sized furniture for a pocket-sized life',
  taglineJp: 'ちいさなおうち、はじめました',
  price: 300,
  themes: ['home', 'retro', 'cute'],
  card: { bg: '#f4ead2', accent: '#8a5a36', text: '#3b2a1a', accent2: '#4f8a5b', pattern: 'grid' },
  capsule: { colors: [0xd6c88a, 0xb87443, 0xfbf6ea, 0x8fc7a0, 0xe98a6a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'chabudai', name: 'Chabudai Teatime', jp: 'ちゃぶ台でお茶', rarity: 'common',
      desc: 'Tea for two, one senbei. Flipping the table is strictly for TV dramas.',
      build(v) {
        const top = 0xa8683a, rim = shade(top, 0.72), leg = 0x6e4024;
        // folding legs + apron
        for (const [lx, lz] of [[-7, -7], [6, -7], [-7, 6], [6, 6]]) v.box(lx, 0, lz, lx + 1, 4, lz + 1, leg);
        v.tube(0, 4, 0, 8.5, 7.3, 1, leg);
        // round top with a darker rim and growth rings
        v.cylinder(0, 5, 0, 10.5, 2, top);
        v.paint(() => {
          v.tube(0, 5, 0, 10.5, 9.5, 2, rim);
          v.tube(0, 6, 0, 7.4, 6.5, 1, shade(top, 1.1));
          v.tube(0, 6, 0, 3.9, 3.1, 1, shade(top, 1.1));
        });
        // dobin teapot with arched rattan handle
        const tx = -3, tz = -3;
        const glaze = gloss(0x3b5f93), glazeL = gloss(0x6d93c8);
        v.ellipsoid(tx, 9.5, tz, 3.5, 2.6, 3.5, glaze);
        v.paint(() => { v.box(tx - 4, 11, tz - 4, tx + 4, 12, tz + 4, glazeL); v.box(tx - 4, 7, tz - 4, tx + 4, 7, tz + 4, 0xc89a6a); });
        v.cylinder(tx, 13, tz, 1.5, 1, glazeL);
        v.set(tx, 14, tz, 0xc89a6a);
        v.line(tx + 3, 9, tz, tx + 5, 11, tz, glaze);
        v.set(tx + 4, 9, tz, glaze);
        v.set(tx + 5, 12, tz, glaze);
        v.shape(tx, 12, tz - 4, tx, 16, tz + 4, (x, y, z) => Math.abs(Math.hypot(y - 12, z - tz) - 3.2) < 0.62, 0xb98a4e);
        // two yunomi cups of green tea
        const cup = (cx, cz, band) => {
          v.cylinder(cx, 7, cz, 1.5, 3, gloss(C.ceramic));
          v.paint(() => v.cylinder(cx, 8, cz, 1.5, 1, gloss(band)));
          v.set(cx, 9, cz, 0xb3c25a);
        };
        cup(4, 2, C.blue);
        cup(6, -3, 0x9a5a32);
        // senbei on a little plate
        v.cylinder(-2, 7, 5, 2.5, 1, gloss(C.ceramic));
        v.paint(() => v.tube(-2, 7, 5, 2.5, 1.6, 1, gloss(0x3b5f93)));
        v.cylinder(-2, 8, 5, 1.5, 1, 0xd08e48);
        v.paint(() => v.box(-3, 8, 5, -1, 8, 5, C.nori));
        v.cylinder(-1, 9, 6, 1.5, 1, 0xc98440);
        v.paint(() => v.box(-1, 9, 5, -1, 9, 7, C.nori));
      },
    },
    {
      id: 'zabuton', name: 'Zabuton Nap', jp: 'ざぶとんでおひるね', rarity: 'common',
      desc: 'Fell asleep mid-thought on the guest cushion. Snot bubble at full size.',
      build(v) {
        const pl = 0x7b3f72, plL = 0xa86598;
        // puffy square cushion
        v.shape(-9, 0, -9, 9, 4, 9, (x, y, z) => {
          const ax = Math.abs(x), az = Math.abs(z);
          if (y === 0) return ax <= 8 && az <= 8;
          if (y <= 2) return !(ax === 9 && az === 9);
          if (y === 3) return ax <= 8 && az <= 8 && !(ax === 8 && az === 8);
          return ax <= 6 && az <= 6 && !(ax >= 5 && az >= 5);
        }, pl);
        // hishi (diamond lattice) weave on top + seam on the sides
        v.paint(() => v.shape(-9, 3, -9, 9, 4, 9, (x, y, z) => mod(x + z, 6) === 0 || mod(x - z, 6) === 0, plL));
        v.paint(() => v.shape(-9, 1, -9, 9, 1, 9, (x, y, z) => Math.abs(x) === 9 || Math.abs(z) === 9, shade(pl, 0.8)));
        // corner tassels
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          v.box(sx * 9, 1, sz * 9, sx * 9, 2, sz * 9, C.gold);
          v.set(sx * 10, 1, sz * 10, C.gold);
        }
        // djungarian hamster pancake
        const fur = 0xcbc6c0, stripe = 0x6f6a66;
        v.ellipsoid(0, 8, -1, 5.5, 3.6, 6, fur);
        v.paint(() => {
          v.ellipsoid(0, 6.5, 2, 5.2, 2.6, 5, W);
          v.box(0, 10, -8, 0, 12, 3, stripe);
        });
        // tucked-in hand towel blanket over the back half
        v.shape(-8, 6, -9, 8, 13, -1, (x, y, z) => {
          const dx = (x) / 6.4, dy = (y - 8) / 4.5, dz = (z + 1) / 7;
          return dx * dx + dy * dy + dz * dz <= 1 && !v.has(x, y, z);
        }, (x, y, z) => (mod(x + y, 3) === 0 && mod(z, 2) === 0 ? W : C.pastelBlue));
        // ears
        v.box(-4, 11, 2, -3, 12, 2, fur); v.box(3, 11, 2, 4, 12, 2, fur);
        v.set(-4, 11, 3, C.pink); v.set(4, 11, 3, C.pink);
        // sleepy face
        const L = { K, N: C.hotpink, M: K, P: C.blush };
        v.project(['KK...KK'], L, -3, 9);
        v.project(['.N.'], L, -1, 7);
        v.project(['M.M'], L, -1, 6);
        v.project(['PP.......PP'], L, -5, 7);
        // snot bubble
        v.sphere(2, 7, 7, 1.5, glass(0xd6f1ff));
        // paws stretched forward
        v.box(-3, 5, 4, -2, 5, 5, C.pink); v.box(2, 5, 4, 3, 5, 5, C.pink);
        // sunflower seeds
        v.box(-7, 4, 5, -7, 4, 6, 0x3a3634); v.set(-7, 4, 6, 0xd8d0c0);
        v.box(6, 4, 7, 7, 4, 7, 0x3a3634); v.set(7, 4, 7, 0xd8d0c0);
      },
    },
    {
      id: 'tansu', name: 'Tansu Chest', jp: 'たんす', rarity: 'common',
      desc: 'Third drawer holds every rubber band you have ever owned. And one sock.',
      build(v) {
        const wd = 0xa4643a, frame = shade(wd, 0.7), face = 0xc27d48, iron = metal(0x3a3532);
        v.box(-8, 0, -4, 8, 0, 3, frame); // plinth
        v.box(-9, 1, -5, 9, 21, 5, wd); // carcass
        v.paint(() => v.box(-9, 1, 5, 9, 21, 5, frame));
        const drawers = [[-8, 8, 2, 5], [-8, 8, 7, 10], [-8, 8, 12, 15], [-8, -1, 17, 20], [1, 8, 17, 20]];
        for (const [x0, x1, y0, y1] of drawers) {
          v.box(x0, y0, 5, x1, y1, 5, null);
          v.paint(() => v.box(x0, y0, 4, x1, y1, 4, face));
          // subtle wood grain streaks
          v.paint(() => v.shape(x0, y0, 4, x1, y1, 4, (x, y) => hash(Math.floor(x / 3), y, 7) < 0.3, shade(face, 1.08)));
        }
        // pulled-out drawer with laundry and an escaping sock
        v.hollowBox(-8, 7, 4, 8, 10, 8, face, 1, ['top']);
        v.paint(() => v.box(-8, 10, 8, 8, 10, 8, shade(face, 1.1)));
        v.box(-7, 8, 5, -3, 9, 7, C.pastelBlue);
        v.box(-2, 8, 5, 2, 9, 7, C.white);
        v.box(3, 8, 5, 7, 9, 7, C.pastelPink);
        v.paint(() => { v.box(-7, 9, 5, -3, 9, 7, shade(C.pastelBlue, 1.05)); v.box(3, 9, 5, 7, 9, 7, shade(C.pastelPink, 1.04)); });
        const sock = (x, y, z) => (mod(y, 2) === 0 ? C.red : C.white);
        v.shape(2, 10, 5, 3, 10, 8, () => true, sock);
        v.shape(2, 5, 9, 3, 10, 9, () => true, sock);
        v.box(2, 4, 9, 3, 4, 10, C.red); // toe
        // iron bracket handles
        const handle = (x0, x1, y) => {
          v.paint(() => v.box(x0, y, 4, x1, y + 1, 4, iron));
          v.box(x0 + 1, y, 5, x1 - 1, y, 5, iron);
        };
        handle(-2, 2, 3); handle(-2, 2, 13); handle(-6, -3, 18); handle(3, 6, 18);
        v.paint(() => v.box(-2, 8, 8, 2, 9, 8, iron));
        v.box(-1, 8, 9, 1, 8, 9, iron);
        // round lock plate on the middle drawer
        v.paint(() => v.box(-1, 14, 4, 1, 15, 4, iron));
        v.set(0, 15, 4, metal(C.brass));
        // corner fittings
        v.paint(() => {
          for (const sx of [-1, 1]) {
            v.box(sx * 9, 19, 5, sx * 9, 21, 5, iron); v.box(sx * 7, 21, 5, sx * 9, 21, 5, iron);
            v.box(sx * 9, 1, 5, sx * 9, 3, 5, iron); v.box(sx * 7, 1, 5, sx * 9, 1, 5, iron);
            v.box(sx * 9, 13, -3, sx * 9, 15, 3, iron);
          }
        });
        for (const sx of [-1, 1]) v.box(sx * 10, 13, -2, sx * 10, 13, 2, iron); // carry handles
        // daruma with only one eye painted in (wish pending)
        v.ellipsoid(-5, 25, -1, 2.8, 2.9, 2.5, gloss(C.red));
        v.paint(() => v.ellipsoid(-5, 25.3, 1.2, 2.1, 1.7, 1.4, W));
        v.project(['KK.KK', '.K.W.', 'G...G', '.GGG.'], { K, W, G: C.gold }, -7, 27);
        v.project(['.G.'], { G: gloss(C.gold) }, -6, 23);
        // jade plant (kane-no-naru-ki)
        v.cylinder(5, 22, -1, 2, 3, 0xc8653d);
        v.paint(() => v.cylinder(5, 24, -1, 1.2, 1, C.darkbrown));
        v.box(5, 25, -1, 5, 26, -1, 0x7a5a3a);
        for (const [lx, ly, lz] of [[4, 27, -1], [6, 27, 0], [5, 28, -2], [6, 26, -2], [4, 26, 0]]) v.sphere(lx, ly, lz, 1, gloss(0x5f9e45));
      },
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'futon', name: 'Futon & Alarm Clock', jp: 'おふとんセット', rarity: 'uncommon',
      desc: 'The clock says 7:00. The futon says five more minutes.',
      build(v) {
        tatami(v, -12, -8, 12, 8);
        // rounded slab helper (each layer of a folded futon)
        const slab = (x0, y0, z0, x1, y1, z1, c) => v.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => {
          const edgeY = y === y0 || y === y1;
          const edgeXZ = x === x0 || x === x1 || z === z0 || z === z1;
          return !(edgeY && edgeXZ);
        }, c);
        // shikibuton folded in three
        for (let i = 0; i < 3; i++) slab(-10, 2 + i * 3, -6, 3, 4 + i * 3, 5, i === 1 ? 0xf3efe6 : 0xfbf8f0);
        v.paint(() => { for (let i = 0; i < 3; i++) v.box(-10, 3 + i * 3, 5, 3, 3 + i * 3, 5, 0xdfe8f2); });
        // kakebuton with sakura print, folded in half
        for (let i = 0; i < 2; i++) slab(-9, 11 + i * 3, -5, 2, 13 + i * 3, 4, C.pastelPink);
        const flower = ['.p.', 'pyp', '.p.'];
        const FL = { p: C.hotpink, y: C.yellow };
        for (const [fx, fy] of [[-8, 16], [-4, 15], [0, 16], [-6, 12], [-2, 13], [1, 12]]) v.project(flower, FL, fx, fy, '+z');
        for (const [fz, fy] of [[-4, 16], [0, 15], [3, 13], [-2, 12]]) v.project(flower, FL, fz, fy, '+x');
        for (const [fx, fz] of [[-8, -4], [-3, -2], [0, 1]]) v.project(flower, FL, fx, fz, '+y');
        // soba-gara pillow with striped case
        slab(-8, 17, -3, -1, 19, 2, W);
        v.paint(() => v.shape(-8, 17, -3, -1, 19, 2, (x) => mod(x, 2) === 0, C.pastelBlue));
        // tiny mochi-shiba plush keeping watch
        v.ellipsoid(1, 18.6, 1, 2, 1.8, 1.8, C.shiba);
        v.paint(() => v.ellipsoid(1, 17.8, 2.5, 1.6, 1, 1, C.shibaLight));
        v.set(0, 21, 1, C.shiba); v.set(2, 21, 1, C.shiba);
        v.project(['K.K'], { K }, 0, 19);
        // twin-bell alarm clock
        const cx = 8, cy = 6, cz = 1;
        v.cylinder(cx, cy, cz, 3, 3, gloss(C.red), 'z');
        v.tube(cx, cy, cz + 3, 3, 2.2, 1, metal(C.silver), 'z');
        v.paint(() => v.cylinder(cx, cy, cz + 2, 2.2, 1, W, 'z'));
        v.layer(['..K..', '..K..', '..K..', '.K...'], { K }, { x: cx - 2, y: cy + 2, z: cz + 2 });
        v.set(cx, cy + 2, cz + 2, K); v.set(cx, cy - 2, cz + 2, C.lightgray); v.set(cx - 2, cy, cz + 2, C.lightgray); v.set(cx + 2, cy, cz + 2, C.lightgray);
        v.set(cx, cy, cz + 3, gloss(C.red));
        for (const bx of [cx - 2, cx + 2]) {
          v.sphere(bx, cy + 4, cz + 1, 1.5, metal(C.brass));
          v.set(bx, cy + 2, cz + 1, metal(C.silver));
        }
        v.box(cx, cy + 3, cz + 1, cx, cy + 5, cz + 1, metal(C.silver));
        v.set(cx, cy + 6, cz + 1, metal(C.brass));
        v.box(cx - 1, 2, cz + 1, cx - 1, 2, cz + 1, metal(C.silver));
        v.box(cx + 1, 2, cz + 1, cx + 1, 2, cz + 1, metal(C.silver));
      },
    },
    {
      id: 'hondana', name: 'Manga Bookshelf', jp: 'まんがの本棚', rarity: 'uncommon',
      desc: 'Owns every volume except number seven. Nobody knows where seven went.',
      build(v) {
        const fr = 0xd2a066, frD = shade(fr, 0.72);
        v.box(-9, 0, -4, 9, 22, 3, fr);
        const comps = [[2, 7], [9, 14], [16, 21]];
        for (const [y0, y1] of comps) v.box(-8, y0, -3, 8, y1, 3, null);
        v.paint(() => {
          v.box(-8, 0, 3, 8, 0, 3, frD);
          for (const y of [1, 8, 15, 22]) v.box(-8, y, 3, 8, y, 3, shade(fr, 1.1));
        });
        v.box(-8, 0, 3, 8, 0, 3, null); // recessed kick plate
        const cols = [C.red, C.blue, C.yellow, C.green, C.orange, C.purple, C.sky, C.hotpink, C.charcoal, C.teal, C.white, C.lime, C.navy, C.vermilion];
        const book = (x, y0, h, w, col, band) => {
          v.box(x, y0, -3, x + w - 1, y0 + h - 1, 2, col);
          v.paint(() => {
            v.box(x, y0 + h - 1, -3, x + w - 1, y0 + h - 1, 1, PAPER);
            v.box(x, y0 + h - 2, 2, x + w - 1, y0 + h - 2, 2, band);
            v.box(x, y0, 2, x + w - 1, y0, 2, shade(col, 0.72));
          });
        };
        comps.forEach(([y0, y1], ci) => {
          let x = -8, s = ci * 5;
          const end = ci === 2 ? 1 : ci === 1 ? 5 : 8;
          while (x <= end) {
            const n = 2 + Math.floor(hash(s, ci, 1) * 4);
            const col = cols[Math.floor(hash(s, ci, 2) * cols.length)];
            const h = Math.min(y1 - y0 + 1, 4 + Math.floor(hash(s, ci, 3) * 3));
            const w = ci === 0 && hash(s, 0, 4) < 0.5 ? 2 : 1;
            const band = col === C.white ? C.red : hash(s, ci, 5) < 0.5 ? W : C.yellow;
            for (let i = 0; i < n && x <= end; i++) {
              // volume seven is missing from the yellow series
              if (!(ci === 1 && s === 6 && i === 2)) book(x, y0, h, Math.min(w, end - x + 1), col, band);
              x += w;
            }
            s++;
          }
        });
        // leaning book in the middle shelf
        for (let k = 0; k < 5; k++) v.box(7 - Math.floor(k * 0.4), 9 + k, -3, 7 - Math.floor(k * 0.4), 9 + k, 1, C.magenta);
        v.paint(() => v.box(5, 9, 1, 8, 13, 1, shade(C.magenta, 0.85)));
        // lying-flat stack in the top shelf with a tiny daruma on it
        v.box(3, 16, -3, 8, 16, 1, C.blue); v.box(3, 17, -2, 7, 17, 1, C.yellow); v.box(4, 18, -3, 8, 18, 0, C.red);
        v.paint(() => { v.box(3, 16, -3, 7, 16, 0, PAPER); v.box(4, 17, -2, 7, 17, 0, PAPER); v.box(5, 18, -3, 8, 18, -1, PAPER); });
        v.paint(() => { v.box(3, 16, 1, 8, 16, 1, C.blue); v.box(3, 17, 1, 7, 17, 1, C.yellow); });
        v.ellipsoid(6, 20, -1, 1.5, 1.5, 1.3, gloss(C.red));
        v.project(['W'], { W }, 6, 20);
        // things on top: stacked books, a gacha capsule (!) and a cactus
        v.box(-8, 23, -3, -2, 23, 2, C.green); v.box(-7, 24, -2, -3, 24, 1, C.orange);
        v.paint(() => { v.box(-8, 23, -3, -3, 23, 1, PAPER); v.box(-7, 24, -2, -4, 24, 0, PAPER); });
        v.sphere(1, 25.5, 0, 2.2, gloss(C.hotpink));
        v.paint(() => v.box(-2, 26, -3, 4, 28, 3, glass(0xeaf6ff)));
        v.box(1, 26, 0, 1, 26, 0, C.yellow);
        v.paint(() => v.box(-2, 25, -3, 4, 25, 3, gloss(shade(C.hotpink, 0.85))));
        v.cylinder(6, 23, 0, 1.5, 2, 0xc8653d);
        v.box(6, 25, 0, 6, 27, 0, C.green); v.set(7, 26, 0, C.green); v.set(7, 27, 0, C.green); v.set(6, 28, 0, C.pink);
      },
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'tsukue', name: 'Late-Night Study Desk', jp: 'べんきょうづくえ', rarity: 'rare',
      desc: 'Homework: open. Notebook: mostly cat doodles. Lamp: doing its very best.',
      build(v) {
        // floorboards
        v.box(-13, 0, -8, 13, 0, 9, 0xc28c55);
        v.paint(() => v.shape(-13, 0, -8, 13, 0, 9, (x, y, z) => mod(z, 3) === 0, 0xa87444));
        const dw = 0xe6c28c, trim = 0xc0915a, dr = 0xbfe6d2;
        // desk top, pedestal, leg, back panel
        v.box(-12, 11, -6, 12, 12, 5, dw);
        v.paint(() => v.box(-12, 11, 5, 12, 12, 5, trim));
        v.box(-12, 1, -6, -5, 10, 4, dw);
        v.box(11, 1, -6, 12, 10, 4, dw);
        v.box(-4, 5, -6, 10, 10, -6, dw);
        for (const [y0, y1] of [[8, 10], [5, 7], [2, 4]]) {
          v.box(-11, y0, 5, -6, y1, 5, dr);
          v.set(-8, y0 + 1, 6, metal(C.silver));
        }
        v.box(-4, 9, 5, 10, 10, 5, dr);
        v.set(3, 9, 6, metal(C.silver));
        // hutch with shelf
        v.box(-12, 13, -6, -11, 24, -2, dw);
        v.box(11, 13, -6, 12, 24, -2, dw);
        v.box(-12, 25, -6, 12, 25, -2, trim);
        v.box(-10, 13, -6, 10, 24, -6, dw);
        v.box(-10, 18, -6, 10, 18, -2, dw);
        v.paint(() => v.box(-12, 18, -2, 12, 18, -2, trim));
        // books on the hutch shelf
        const bc = [C.red, C.blue, C.yellow, C.green, C.navy, C.orange, C.purple, C.teal];
        for (let i = 0; i < 9; i++) {
          const h = 4 + (i % 3 === 1 ? 1 : 0);
          v.box(-10 + i, 19, -5, -10 + i, 18 + h, -3, bc[i % bc.length]);
          v.paint(() => v.set(-10 + i, 17 + h, -3, W));
        }
        // globe
        v.cylinder(6, 19, -4, 1.2, 1, C.darkgray);
        v.set(6, 20, -4, metal(C.brass));
        v.sphere(6, 22, -4, 1.8, gloss(C.sea));
        v.paint(() => {
          v.box(5, 22, -3, 6, 23, -2, C.green);
          v.box(7, 21, -4, 7, 22, -3, C.green);
          v.set(5, 21, -5, C.green);
        });
        v.set(6, 24, -4, metal(C.brass));
        // calendar + tiny cat photo on the hutch back
        v.layer(['RRRRR', 'WKWKW', 'WWWWW', 'WKWRW'], { R: C.red, W, K: C.lightgray }, { x: 2, y: 17, z: -5 });
        v.layer(['www', 'wow', 'www'], { w: W, o: C.orange }, { x: -2, y: 16, z: -5 });
        // stack of textbooks
        v.box(-10, 13, -5, -6, 13, -2, C.blue); v.box(-10, 14, -5, -7, 14, -2, C.red); v.box(-9, 15, -5, -6, 15, -3, C.yellow);
        v.paint(() => { v.box(-9, 13, -5, -6, 13, -3, PAPER); v.box(-9, 14, -5, -7, 14, -3, PAPER); v.box(-9, 15, -5, -7, 15, -4, PAPER); });
        // open notebook with lines, doodle and pencil
        v.box(-5, 13, -1, 5, 13, 5, C.blue);
        v.box(-4, 14, 0, -1, 14, 4, W); v.box(1, 14, 0, 4, 14, 4, W);
        v.paint(() => v.shape(-4, 14, 0, 4, 14, 4, (x, y, z) => mod(z, 2) === 1, 0xcfe0f6));
        v.paint(() => { v.set(2, 14, 1, C.orange); v.set(3, 14, 1, C.orange); v.set(2, 14, 2, K); v.set(3, 14, 2, C.orange); });
        v.line(-4, 15, 4, -1, 15, 1, C.yellow);
        v.set(-4, 15, 4, C.ink); v.set(-1, 15, 1, C.pink);
        // pencil cup
        v.cylinder(-8, 13, 2, 1.5, 4, gloss(C.pastelPink));
        v.paint(() => v.box(-9, 15, 3, -7, 15, 3, gloss(C.hotpink)));
        v.box(-9, 17, 1, -9, 19, 1, C.yellow); v.set(-9, 20, 1, C.ink);
        v.box(-8, 17, 2, -8, 20, 2, C.blue); v.set(-8, 21, 2, W);
        v.box(-7, 17, 3, -7, 18, 3, C.red);
        v.box(-7, 17, 1, -7, 21, 1, glass(0xbfe8ff));
        // desk lamp (glowing)
        const arm = gloss(C.pastelYellow);
        v.cylinder(8, 13, -1, 1.6, 1, arm);
        v.box(8, 14, -1, 8, 19, -1, arm);
        v.line(8, 20, -1, 5, 21, 1, arm);
        v.ellipsoid(3, 20.5, 2, 2.6, 1.6, 2.6, arm);
        v.box(0, 19, -1, 6, 19, 5, null);
        v.paint(() => v.box(0, 20, -1, 6, 20, 5, glow(0xfff2b8)));
        v.set(3, 19, 2, glow(0xfff8d8));
        v.set(3, 23, 2, arm);
        // red randoseru school bag
        const rd = gloss(0xd42a2f), rdD = gloss(0xa81c22);
        v.box(4, 1, 5, 9, 8, 8, rdD);
        v.box(4, 9, 5, 9, 9, 9, rd);
        v.box(4, 3, 9, 9, 9, 9, rd);
        v.remove(4, 3, 9); v.remove(9, 3, 9);
        v.paint(() => { v.box(4, 9, 9, 9, 9, 9, gloss(0xe8454a)); });
        v.box(6, 4, 10, 7, 4, 10, metal(C.gold));
        v.box(10, 6, 7, 10, 7, 7, C.yellow);
      },
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'ofuro', name: 'Hinoki Ofuro', jp: 'ひのきのおふろ', rarity: 'ultra',
      desc: 'Shoulder-deep at 42 degrees. The duck has claimed the best corner.',
      build(v) {
        // mosaic tile floor
        v.box(-13, 0, -10, 13, 1, 9, 0xd9dcdc);
        v.paint(() => v.shape(-13, 1, -10, 13, 1, 9, (x, y, z) => mod(x, 3) !== 0 && mod(z, 3) !== 0,
          (x, y, z) => (mod(Math.floor(x / 3) + Math.floor(z / 3), 2) === 0 ? 0xbfe4ee : 0xf4fafa)));
        // tiled back wall with a frosted window
        v.box(-13, 2, -11, 13, 21, -10, 0xf6f6f2);
        v.paint(() => v.shape(-13, 2, -10, 13, 21, -10, (x, y) => mod(y, 3) === 1 || mod(x + (mod(Math.floor(y / 3), 2) ? 2 : 0), 4) === 0, 0xd2d6d6));
        v.paint(() => v.box(-13, 2, -10, 13, 6, -10, 0x8fcbe0));
        v.paint(() => v.shape(-13, 2, -10, 13, 6, -10, (x, y) => mod(y, 3) === 1 || mod(x, 3) === 0, 0x6fb0c8));
        v.box(-10, 14, -10, -2, 20, -10, HINOKI_D);
        v.box(-9, 15, -10, -7, 19, -10, glass(0xe4f4fa));
        v.box(-5, 15, -10, -3, 19, -10, glass(0xe4f4fa));
        v.box(-11, 13, -10, -1, 13, -9, HINOKI_D); // sill
        // hinoki tub
        v.hollowBox(-12, 2, -9, 0, 12, 2, HINOKI, 1, ['top']);
        v.paint(() => {
          v.shape(-12, 2, -9, 0, 12, 2, (x, y, z) => (z === 2 && mod(x, 3) === 0) || (x === 0 && mod(z, 3) === 0) || (x === -12 && mod(z, 3) === 0), HINOKI_D);
          v.box(-12, 12, -9, 0, 12, 2, shade(HINOKI, 1.06));
          v.box(-12, 2, 2, -12, 12, 2, HINOKI_D); v.box(0, 2, 2, 0, 12, 2, HINOKI_D);
        });
        v.hollowBox(-11, 12, -8, -1, 12, 1, shade(HINOKI, 1.06), 1, ['top', 'bottom']);
        v.box(-10, 3, -7, -2, 10, 0, glass(0x95d8ee));
        // roll-up bath lid resting on the back rim
        v.cylinder(-12, 14, -8, 1.5, 13, C.pastelBlue, 'x');
        v.paint(() => v.shape(-12, 12, -10, 0, 16, -6, (x) => mod(x, 2) === 0, W));
        // rubber duck
        v.ellipsoid(-6, 11.4, -3, 1.8, 1.3, 2.2, gloss(C.yellow));
        v.ellipsoid(-6, 13.5, -2, 1.2, 1.2, 1.2, gloss(C.yellow));
        v.box(-6, 13, 0, -6, 13, 0, gloss(C.orange)); v.set(-6, 12, 0, gloss(C.orange));
        v.set(-7, 14, -1, K); v.set(-5, 14, -1, K);
        v.set(-6, 12, -6, gloss(C.yellow));
        // towel draped over the front rim
        const towel = (x, y, z) => (mod(y + z, 4) === 0 ? C.hotpink : C.pastelPink);
        v.shape(-9, 13, 0, -6, 13, 3, () => true, towel);
        v.shape(-9, 7, 3, -6, 12, 3, () => true, towel);
        v.box(-9, 6, 3, -6, 6, 3, W);
        // wash corner: stool, bucket, taps, shower, mirror, shelf
        v.box(4, 6, -5, 9, 6, -1, HINOKI);
        v.box(4, 2, -5, 4, 5, -1, HINOKI_D); v.box(9, 2, -5, 9, 5, -1, HINOKI_D);
        oke(v, 9, 2, 5);
        v.box(8, 6, 4, 10, 6, 6, W); v.paint(() => v.box(8, 6, 5, 10, 6, 5, C.sky)); // folded towel on bucket
        v.box(5, 9, -9, 9, 9, -9, metal(C.chrome));
        v.box(7, 8, -9, 7, 8, -8, metal(C.chrome)); v.set(7, 7, -8, metal(C.chrome));
        v.set(5, 10, -9, gloss(C.red)); v.set(9, 10, -9, gloss(C.blue));
        v.line(9, 8, -9, 11, 5, -9, metal(C.steel));
        v.line(11, 5, -9, 11, 14, -9, metal(C.steel));
        v.box(10, 15, -9, 12, 16, -9, metal(C.chrome)); v.set(11, 15, -8, metal(C.chrome));
        v.box(4, 12, -9, 9, 18, -9, W);
        v.box(5, 13, -9, 8, 17, -9, gloss(0xcfe9f4));
        v.paint(() => { v.set(5, 16, -9, gloss(W)); v.set(6, 17, -9, gloss(W)); v.set(5, 17, -9, gloss(W)); });
        v.box(10, 9, -9, 12, 9, -8, W);
        v.box(10, 10, -8, 10, 12, -8, gloss(C.pink)); v.set(10, 13, -8, W);
        v.box(12, 10, -8, 12, 11, -8, gloss(C.white)); v.set(12, 12, -8, gloss(C.green));
        v.box(6, 2, 4, 7, 2, 5, gloss(C.pastelPink)); // soap
        v.box(1, 1, 6, 2, 1, 7, metal(C.steel)); // drain
        v.paint(() => v.set(1, 1, 6, metal(C.darkgray)));
      },
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'nekosawagi', name: 'The Cat Did It', jp: 'ねこのしわざ', rarity: 'secret',
      desc: 'Shoji torn, vase tipped, paper unrolled. The cat was asleep all day, apparently.',
      build(v) {
        tatami(v, -13, -9, 0, 9, { long: 'z' });
        tatami(v, 1, -9, 13, 9, { long: 'z' });
        // shoji screens at the back
        const wood = 0xb8865a;
        v.box(-13, 0, -10, 13, 21, -10, PAPER);
        v.paint(() => {
          v.shape(-13, 0, -10, 13, 21, -10, (x, y) => y <= 4 || y >= 20 || x === -13 || x === 13 || x === 0 ||
            (y > 4 && mod(y - 4, 4) === 0) || mod(x + 13, 4) === 0, wood);
          v.box(-13, 0, -10, 13, 4, -10, shade(wood, 0.9));
        });
        // cat-shaped hole punched straight through + paw pokes
        const hole = ['K...K', 'KK.KK', 'KKKKK', 'KKKKK', '.KKK.'];
        hole.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'K') v.remove(-10 + c, 15 - r, -10); }));
        for (const [hx, hy] of [[3, 14], [6, 10], [10, 17], [7, 15], [-3, 10], [11, 7]]) v.remove(hx, hy, -10);
        v.set(-10, 10, -9, PAPER); v.set(-6, 15, -9, PAPER); v.set(6, 9, -9, PAPER); v.set(-8, 10, -9, PAPER);
        // tipped-over vase, flowers and puddle
        v.shape(-10, 2, 0, 0, 2, 9, (x, y, z) => {
          const d = ((x + 5) / 5.5) ** 2 + ((z - 4.5) / 4) ** 2;
          return d <= 1 + (hash(x, 0, z, 3) - 0.5) * 0.5;
        }, glass(0xbfe8fa));
        const vase = gloss(0xf2f0ea), blue = gloss(0x2f5fb0);
        v.cylinder(-12, 4, 4, 2, 5, vase, 'x');
        v.cylinder(-7, 4, 4, 1.2, 2, vase, 'x');
        v.cylinder(-5, 4, 4, 1.5, 1, vase, 'x');
        v.set(-5, 4, 4, C.ink);
        v.paint(() => v.shape(-12, 2, 2, -8, 6, 6, (x, y, z) => mod(x + y + z, 3) === 0, blue));
        v.paint(() => v.box(-12, 2, 2, -12, 6, 6, blue));
        v.line(-4, 3, 4, 0, 3, 7, C.leaf);
        v.line(-4, 3, 4, -1, 3, 1, C.leaf);
        v.line(-4, 3, 5, -2, 3, 8, C.leaf);
        for (const [fx, fz, col] of [[0, 7, C.red], [-1, 1, C.red], [-2, 8, C.pastelPink]]) {
          v.sphere(fx, 3, fz, 1, gloss(col));
          v.set(fx, 4, fz, C.yellow);
        }
        v.set(-3, 3, 6, C.leaf); v.set(-1, 3, 3, C.leaf);
        // runaway toilet-paper roll and its long white trail
        v.cylinder(7, 4, -6, 2, 4, W, 'x');
        v.paint(() => v.cylinder(7, 4, -6, 0.6, 4, 0xc8a070, 'x'));
        v.set(6, 4, -6, 0xa07850);
        const path = [[8, -4], [9, -1], [11, 2], [10, 5], [7, 7], [4, 6]];
        for (let i = 0; i < path.length - 1; i++) {
          const [ax, az] = path[i], [bx, bz] = path[i + 1];
          v.line(ax, 2, az, bx, 2, bz, W);
          v.line(ax + 1, 2, az, bx + 1, 2, bz, W);
        }
        // rolling mikan
        mikan(v, -4, 2, -5); mikan(v, 12, 2, -6); mikan(v, -11, 2, 8);
        // tipped yunomi with a dribble of tea
        v.cylinder(9, 3, 0, 1.2, 3, gloss(C.ceramic), 'z');
        v.paint(() => v.cylinder(9, 3, 1, 1.2, 1, gloss(0x3b8a5a), 'z'));
        v.box(9, 2, 3, 10, 2, 4, glass(0xc9d98a));
        // the innocent suspect: chatora tabby
        const cat = 0xf2a04a, catD = 0xd27a2a;
        const cx = 3, cz = 1;
        v.ellipsoid(cx, 6, cz - 1, 4.2, 4.2, 3.6, cat);
        v.ellipsoid(cx, 12, cz, 3.8, 3.2, 3.2, cat);
        v.paint(() => {
          v.shape(cx - 6, 2, cz - 6, cx + 6, 16, cz + 6, (x, y, z) => mod(y, 3) === 0 && z < cz + 1, catD);
          v.ellipsoid(cx, 6, cz + 2, 2.6, 3.4, 1.6, W);
          v.ellipsoid(cx, 10.8, cz + 3, 2, 1.2, 0.8, W);
        });
        for (const sx of [-1, 1]) {
          v.box(cx + sx * 2, 15, cz, cx + sx * 3, 15, cz + 1, cat);
          v.set(cx + sx * 3, 16, cz, cat);
          v.set(cx + sx * 2, 15, cz + 2, C.pink);
        }
        const Lc = { K, W, P: C.blush, M: K, N: C.hotpink };
        v.project(['KW...KW', 'KK...KK'], Lc, cx - 3, 13);
        v.project(['N'], Lc, cx, 11);
        v.project(['M.M'], Lc, cx - 1, 10);
        v.project(['PP.....PP'], Lc, cx - 4, 11);
        // front paws holding the end of the paper
        v.box(cx - 2, 2, cz + 3, cx - 1, 3, cz + 4, W); v.box(cx + 1, 2, cz + 3, cx + 2, 3, cz + 4, W);
        // tail curled round the side
        v.line(cx + 4, 3, cz - 3, cx + 6, 3, cz + 1, cat, 1);
        v.line(cx + 6, 3, cz + 1, cx + 5, 3, cz + 4, catD, 1);
        // evidence: scrap of shoji paper stuck on its head
        v.box(cx - 2, 16, cz - 1, cx, 16, cz + 1, PAPER);
        v.set(cx - 1, 15, cz + 2, PAPER);
      },
    },
  ],
};
