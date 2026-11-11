// Series 13 — Neko Kissaten Hidamari (ねこ喫茶ひだまり)
// Chibi cats running a Showa-retro kissaten: drip coffee, cream soda, hot cakes and a very
// professional amount of napping on the counter.
import { C, shade } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;
const COFFEE = 0x4a2a1a;
const CREAM = 0xfff4dc;
const SODA = 0x4fd47a;

const floorClip = (v) => v.box(-40, -12, -40, 40, -1, 40, null);

/** Big chibi face on the front of the head. eyeY = top row of the eyes (eyes at x ±spread..±spread+1). */
function catFace(v, eyeY, { eyes = 'open', spread = 3, mouth = 'w', blush = C.blush, nose = C.hotpink } = {}) {
  const L = { K, W, P: blush, N: nose, M: K, T: C.tongue };
  const g = (n) => '.'.repeat(n);
  const x0 = -spread - 1, gap = g(2 * spread - 1);
  if (eyes === 'open') v.project([`WK${gap}WK`, `KK${gap}KK`, `KK${gap}KK`], L, x0, eyeY);
  else if (eyes === 'happy') v.project([`.K.${g(2 * spread - 3)}.K.`, `K.K${g(2 * spread - 3)}K.K`], L, x0 - 1, eyeY);
  else if (eyes === 'closed') v.project([`KK${gap}KK`], L, x0, eyeY - 1);
  else if (eyes === 'wink') { v.project([`WK${gap}K.`, `KK${gap}.K`, `KK${gap}K.`], L, x0, eyeY); }
  const my = eyeY - 3;
  v.project(['N'], L, 0, my);
  const mouths = { w: ['M.M'], open: ['MTM', '.M.'], o: ['.M.'], smile: ['M.M', '.M.'] };
  v.project(mouths[mouth], L, -1, my - 1);
  if (blush) { v.project(['PP'], L, x0 - 2, my); v.project(['PP'], L, spread + 2, my); }
}

/** Pointed cat ear on the upper side of the head. s = -1 left, +1 right. */
function catEar(v, s, coat, inner, top = 23, z = 0) {
  const rows = ['c...', 'cc..', 'cpc.', 'cppc', 'cccc', 'cccc'];
  rows.forEach((row, r) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    const x = s * (6 - i), y = top - r;
    v.set(x, y, z, coat).set(x, y, z - 1, coat);
    v.set(x, y, z + 1, ch === 'p' ? inner : coat);
  }));
}

/**
 * Chibi standing cat, facing +z, feet on y=0. Head centre (0, 16, 0.5), shoulders (±4, 9, 1).
 * o: { coat, light (muzzle/belly), patches: [[x,y,z,rx,ry,rz,col]], stripes, earL, earR, eyes, mouth,
 *      arms: [[from, to], [from, to]] | null, tail: 'right'|'left'|'up', outfit(v) }
 */
function cat(v, o) {
  const coat = o.coat, light = o.light ?? C.white;
  // legs + feet
  for (const s of [-1, 1]) {
    v.box(s * 1, 0, -1, s * 3, 2, 1, coat);
    v.box(s * 1, 0, 2, s * 3, 1, 2, light);
  }
  // torso
  v.ellipsoid(0, 6.2, 0.2, 4.4, 4.4, 3.6, coat);
  v.paint(() => v.ellipsoid(0, 5.5, 3, 2.8, 3.4, 1.6, light));
  // head
  v.ellipsoid(0, 16, 0.5, 6.6, 5.6, 5.4, coat);
  v.paint(() => v.ellipsoid(0, 12.8, 5, 3.6, 2.2, 1.6, light)); // muzzle
  for (const p of o.patches || []) v.paint(() => v.ellipsoid(...p.slice(0, 6), p[6]));
  catEar(v, -1, o.earL ?? coat, C.pink);
  catEar(v, 1, o.earR ?? coat, C.pink);
  if (o.stripes) {
    v.recolor((x, y, z, c) => (c === coat && y >= 19 && y <= 22 && z < 4 && (x === -3 || x === 0 || x === 3) ? o.stripes : undefined));
    for (const d of ['+x', '-x']) v.project(['SS', '..', 'SS'], { S: o.stripes }, 0, 17, d);
    v.recolor((x, y, z, c) => (c === coat && z < -1 && y < 11 && y > 2 && y % 3 === 0 ? o.stripes : undefined));
  }
  // tail
  const ts = o.tail === 'left' ? -1 : 1;
  const tailPts = [[0, 3, -3], [ts * 2, 3, -5], [ts * 4, 4, -5.5], [ts * 5, 6, -5], [ts * 5.5, 8, -4.5], [ts * 5, 10, -4]];
  for (let i = 0; i < tailPts.length - 1; i++) {
    const [a, b] = [tailPts[i], tailPts[i + 1]];
    v.line(a[0], a[1], a[2], b[0], b[1], b[2], i === tailPts.length - 2 && o.tipTail ? o.tipTail : coat, 0.8);
  }
  if (o.stripes) v.recolor((x, y, z, c) => (c === coat && z <= -4 && (y + x) % 3 === 0 ? o.stripes : undefined));
  if (o.outfit) o.outfit(v);
  // arms
  const arms = o.arms === undefined ? [[[-4, 9, 1], [-5, 5, 2]], [[4, 9, 1], [5, 5, 2]]] : o.arms;
  for (const [from, to] of arms || []) {
    v.line(...from, ...to, o.sleeve ?? coat, 1.2);
    v.sphere(...to, 1.4, light);
  }
  catFace(v, 16, { eyes: o.eyes, mouth: o.mouth, spread: 3 });
  // whiskers
  for (const s of [-1, 1]) for (const y of [13, 12]) v.set(s * 7, y + (y === 13 ? 0 : 0), 2, C.lightgray);
  floorClip(v);
}

/** Apron with straps over the torso (front). */
function apron(v, col, { trim = W, pocket = true } = {}) {
  v.paint(() => v.shape(-5, 1, 1, 5, 9, 6, (x, y) => Math.abs(x) <= 3.5 + (y < 5 ? 0.6 : 0), col));
  v.paint(() => v.shape(-5, 2, 1, 5, 2, 6, () => true, trim));
  if (pocket) v.project(['TTT'], { T: shade(col, 0.82) }, -1, 5);
  // neck strap
  v.paint(() => { v.box(-3, 9, 0, -2, 11, 6, col); v.box(2, 9, 0, 3, 11, 6, col); });
  // waist tie at the back
  v.paint(() => v.box(-5, 6, -5, 5, 6, -1, trim));
  v.set(0, 6, -5, trim).set(-1, 7, -5, trim).set(1, 7, -5, trim).set(-1, 5, -5, trim).set(1, 5, -5, trim);
}

/** Small coffee cup + saucer centred at (x, y, z) (y = saucer level). */
function coffeeCup(v, x, y, z, { cup = C.ceramic, band = C.vermilion, drink = COFFEE } = {}) {
  v.cylinder(x, y, z, 2.6, 1, gloss(cup));
  v.cylinder(x, y + 1, z, 1.8, 3, gloss(cup));
  v.paint(() => v.cylinder(x, y + 3, z, 1.9, 1, gloss(band)));
  v.cylinder(x, y + 3, z, 1, 1, gloss(drink));
  v.set(x + 2, y + 2, z, gloss(cup)).set(x + 3, y + 2, z, gloss(cup)).set(x + 3, y + 3, z, gloss(cup)).set(x + 2, y + 3, z, gloss(cup));
}

/** Little round wooden base. */
function woodBase(v, r = 9, h = 2, top = C.woodLight) {
  v.cylinder(0, 0, 0, r, h, C.woodDark);
  v.cylinder(0, h, 0, r - 0.5, 1, top);
  return h + 1;
}

export default {
  id: 'neko_cafe',
  order: 13,
  name: 'Neko Kissaten Hidamari',
  jp: 'ねこ喫茶ひだまり',
  tagline: 'Chibi cats running a retro coffee shop',
  taglineJp: 'いらっしゃいませニャ！',
  price: 300,
  themes: ['cute', 'food', 'home'],
  card: { bg: '#fbefdc', accent: '#c8553d', text: '#4a2a1e', accent2: '#3f8f6a', pattern: 'checker' },
  capsule: { colors: [0xfff4dc, 0xc8553d, 0x8a5a3a, 0x7fd99a, 0xffc7d4] },
  items: [
    {
      id: 'tora', name: 'Barista Tora', jp: 'ドリップ係のトラ', rarity: 'common',
      desc: 'Pours the coffee one drop at a time. Then stares at each drop. Then naps.',
      build(v) {
        cat(v, {
          coat: 0xf3a248, light: CREAM, stripes: 0xc66a22, tail: 'left',
          arms: [[[-4, 9, 1], [-5, 7, 4]], [[4, 9, 1], [6, 9, 4]]],
          outfit: (m) => apron(m, 0x3f7a5a),
        });
        // gooseneck kettle in the right paw, pouring
        const kx = 8, ky = 7, kz = 4;
        v.cylinder(kx, ky, kz, 1.8, 3, gloss(0xfff6e8));
        v.paint(() => v.cylinder(kx, ky, kz, 1.9, 1, gloss(0xc8553d)));
        v.ellipsoid(kx, ky + 3, kz, 1.3, 0.8, 1.3, gloss(0xfff6e8));
        v.set(kx, ky + 4, kz, gloss(K));
        v.line(kx - 2, ky + 1, kz, kx - 4, ky + 4, kz + 1, gloss(0xd8dce4));
        v.line(kx - 4, ky + 4, kz + 1, kx - 5, ky + 4, kz + 2, gloss(0xd8dce4));
        v.box(kx + 2, ky + 1, kz, kx + 2, ky + 3, kz, gloss(0x4a2a1a)); // handle
        // drip stream into the cup in the left paw
        v.set(-6, 10, 4, glass(0x8a5a3a)).set(-6, 9, 4, glass(0x8a5a3a));
        // dripper cup held in the left paw
        v.cylinder(-6, 5, 5, 1.6, 3, gloss(C.ceramic));
        v.paint(() => v.cylinder(-6, 7, 5, 1.7, 1, gloss(C.vermilion)));
        v.set(-6, 7, 5, gloss(COFFEE));
      },
    },
    {
      id: 'shiro', name: 'Waiter Shiro', jp: 'ウェイターのシロ', rarity: 'common',
      desc: 'Carries the cream soda with total focus. Has never spilled. Has never delivered.',
      build(v) {
        cat(v, {
          coat: C.white, light: 0xfffcf6, tail: 'right', eyes: 'open', mouth: 'o',
          patches: [[-3, 21, 0, 2.4, 1.8, 3, 0xf0d8b8]],
          arms: [[[-4, 9, 1], [-5, 6, 3]], [[4, 9, 1], [6, 13, 2]]],
          sleeve: 0x2b2b38,
          outfit: (m) => {
            m.paint(() => m.ellipsoid(0, 6.2, 0.2, 5, 5, 4, 0x2b2b38)); // waistcoat
            m.paint(() => m.shape(-2, 3, 2, 2, 10, 6, (x, y) => Math.abs(x) <= (y - 3) * 0.35, W)); // shirt V
            m.project(['RR.RR', '.RRR.', 'RR.RR'], { R: gloss(C.red) }, -2, 11, '+z', { raise: true }); // bow tie
            m.project(['G', '.', 'G'], { G: metal(C.gold) }, 0, 7);
          },
        });
        // silver tray balanced on the right paw, cream soda on top
        const tx = 7, ty = 14, tz = 2;
        v.cylinder(tx, ty, tz, 3.4, 1, metal(C.silver));
        v.paint(() => v.cylinder(tx, ty, tz, 2.4, 1, metal(C.chrome)));
        v.cylinder(tx, ty + 1, tz, 1, 1, glass(0xe8fff0));
        v.cylinder(tx, ty + 2, tz, 1.6, 4, glass(0xdffff0));
        v.cylinder(tx, ty + 2, tz, 1.1, 3, gloss(SODA));
        v.sphere(tx, ty + 6.4, tz, 1.5, C.rice); // ice cream scoop
        v.set(tx, ty + 8, tz, gloss(C.red)).set(tx, ty + 9, tz, 0x5a8a3a); // cherry
        v.line(tx + 1, ty + 5, tz, tx + 2, ty + 9, tz - 1, gloss(C.red)); // straw
      },
    },
    {
      id: 'kuro', name: 'Kuro & Hot Cake', jp: 'ホットケーキのクロ', rarity: 'common',
      desc: 'Three hot cakes, one butter, zero sharing. The syrup is also hers.',
      build(v) {
        cat(v, {
          coat: 0x2e2a36, light: 0x4a4458, tail: 'right', eyes: 'happy', mouth: 'open',
          arms: [[[-4, 9, 1], [-4, 7, 6]], [[4, 9, 1], [4, 7, 6]]],
          outfit: (m) => m.project(['GGGGG'], { G: gloss(0xffd23f) }, -2, 10, '+z', { raise: true }),
        });
        // eyes on black fur read better in yellow
        v.recolor((x, y, z, c) => (c === K && y >= 14 && y <= 16 && z > 3 ? 0xffd447 : undefined));
        // hot cake stack held in both paws
        const hz = 7;
        v.cylinder(0, 2, hz, 3.6, 1, gloss(C.ceramic));
        for (let i = 0; i < 3; i++) {
          v.cylinder(0, 3 + i * 2, hz, 3.2, 2, 0xd9944a);
          v.paint(() => v.cylinder(0, 4 + i * 2, hz, 3.3, 1, 0xf6d08a));
        }
        v.paint(() => v.cylinder(0, 8, hz, 3.3, 1, 0xc0702c));
        v.box(-1, 9, hz - 1, 1, 9, hz + 1, 0xfff0a0); // butter pat
        v.set(0, 10, hz, 0xfff6c8);
        // maple syrup drips
        for (const [x, z, d] of [[-3, hz + 1, 2], [2, hz + 2, 3], [3, hz - 1, 1]]) for (let k = 0; k < d; k++) v.set(x + Math.sign(x), 8 - k, z, gloss(0xa0501c));
        v.box(-2, 9, hz, 2, 9, hz + 2, gloss(0xb8641e));
        v.box(-1, 9, hz - 1, 1, 9, hz + 1, 0xfff0a0);
      },
    },
    {
      id: 'mike', name: 'Cream Soda Mike', jp: 'クリームソーダ三毛', rarity: 'uncommon',
      desc: 'Fell in once. Decided to stay. The ice cream hat is non-negotiable.',
      build(v) {
        // footed sundae glass
        v.cylinder(0, 0, 0, 4, 1, glass(0xe8fff4));
        v.cylinder(0, 1, 0, 1, 3, glass(0xe8fff4));
        v.tube(0, 4, 0, 7, 6, 12, glass(0xd8fff0));
        v.cylinder(0, 4, 0, 6, 1, glass(0xd8fff0));
        v.cylinder(0, 5, 0, 5.6, 8, gloss(SODA));
        v.paint(() => v.cylinder(0, 11, 0, 6, 2, gloss(0x8af0ae)));
        // bubbles + ice cubes
        for (const [x, y, z] of [[-4, 7, 4], [3, 9, 5], [-2, 11, 5], [5, 6, 2], [1, 6, 5]]) v.set(x, y, z, glass(0xeaffff));
        v.box(2, 10, 2, 4, 12, 4, glass(0xf0ffff));
        // calico cat bobbing in the soda: head + paws on the rim
        const hy = 19;
        v.ellipsoid(0, hy, 0.5, 6.4, 5.4, 5.2, C.white);
        v.paint(() => { v.ellipsoid(-5, hy + 4, -1, 3, 2.4, 5, C.orange); v.ellipsoid(5, hy + 3, -3, 2.6, 3, 4, C.charcoal); });
        v.paint(() => v.ellipsoid(0, hy - 3, 5, 3.4, 2, 1.6, 0xfffcf6));
        catEar(v, -1, C.orange, C.pink, hy + 7);
        catEar(v, 1, C.charcoal, C.pink, hy + 7);
        catFace(v, hy, { eyes: 'open', mouth: 'w' });
        for (const s of [-1, 1]) { v.sphere(s * 4.5, 14.5, 5.5, 1.5, C.white); v.set(s * 4, 14, 7, C.pink); v.set(s * 5, 14, 7, C.pink); }
        // vanilla scoop hat + cherry
        v.ellipsoid(0, hy + 7, 0, 3.6, 2.2, 3.2, C.rice);
        v.paint(() => v.box(-4, hy + 5, -4, 4, hy + 5, 4, 0xf4ecd8));
        v.sphere(1, hy + 10, 0, 1.3, gloss(C.red));
        v.line(1, hy + 11, 0, 2, hy + 12, -1, 0x5a8a3a);
        // straw
        v.line(5, 10, -2, 8, 22, -3, gloss(0xff6f9a), 0.6);
      },
    },
    {
      id: 'hachi', name: 'Siphon Master Hachi', jp: 'サイフォン名人ハチ', rarity: 'uncommon',
      desc: 'Wears glasses for the science look. They have no lenses. The coffee is excellent.',
      build(v) {
        cat(v, {
          coat: C.charcoal, light: C.white, tail: 'left', mouth: 'smile',
          patches: [[0, 12, 4, 4.5, 4, 3, C.white], [0, 4, 3, 3, 3.5, 2, C.white]],
          arms: [[[-4, 9, 1], [-6, 8, 4]], [[4, 9, 1], [5, 6, 3]]],
          outfit: (m) => {
            m.paint(() => m.shape(-5, 1, -4, 5, 10, 6, (x, y, z) => z > 0.5 && y < 10, 0x8a4a2e)); // brown vest
            m.paint(() => m.shape(-2, 3, 2, 2, 10, 6, (x, y) => Math.abs(x) <= (y - 3) * 0.35, C.white));
          },
        });
        // hachiware split: white muzzle wedge going up the forehead
        v.paint(() => v.shape(-7, 11, 2, 7, 20, 7, (x, y) => Math.abs(x) <= (17 - y) * 0.8 && y < 17, C.white));
        catFace(v, 16, { mouth: 'smile' });
        // round glasses frames
        v.project(['.GG.....GG.', 'G..GGGGG..G', 'G..G...G..G', 'G..G...G..G', '.GG.....GG.'], { G: gloss(0xc8902a) }, -5, 17, '+z', { raise: true });
        // siphon on a small stand to the left
        const sx = -9, sz = 4;
        v.cylinder(sx, 0, sz, 2.4, 1, metal(C.steel));
        v.line(sx + 2, 1, sz, sx + 2, 13, sz, metal(C.steel));
        v.cylinder(sx, 1, sz, 1, 2, glow(0x6fb8ff)); // alcohol lamp flame
        v.set(sx, 3, sz, glow(0x9fe0ff));
        v.sphere(sx, 6, sz, 2.2, glass(0xe8f4ff));
        v.ellipsoid(sx, 5.5, sz, 1.6, 1.2, 1.6, gloss(COFFEE));
        v.cylinder(sx, 8, sz, 0.6, 2, glass(0xe8f4ff));
        v.cylinder(sx, 10, sz, 1.8, 4, glass(0xe8f4ff));
        v.cylinder(sx, 10, sz, 1.1, 2, gloss(0x7a4a2a));
        v.set(sx, 14, sz, metal(C.steel));
        // bamboo paddle in the left paw
        v.line(-6, 8, 4, -9, 13, sz, C.bamboo);
      },
    },
    {
      id: 'morning', name: 'Morning Set Counter', jp: 'モーニングセット', rarity: 'rare',
      desc: 'Order one coffee, receive toast, an egg and a cat. Kissaten rules.',
      build(v) {
        // wooden counter block with a checker-tiled front
        v.box(-12, 0, -4, 12, 7, 4, C.woodDark);
        v.box(-13, 8, -5, 13, 9, 6, C.wood);
        v.paint(() => v.box(-13, 9, -5, 13, 9, 6, C.woodLight));
        v.paint(() => v.shape(-12, 1, 4, 12, 6, 4, (x, y) => true, (x, y) => ((x >> 1) + (y >> 1)) % 2 ? 0x3f8f6a : CREAM));
        v.box(-12, 0, 4, 12, 0, 4, 0x2a3a2e);
        // grey cat behind the counter, peeking over with paws on top
        const m = v;
        m.ellipsoid(0, 16, -2, 6.6, 5.6, 5.4, 0xa8a8b4);
        m.paint(() => m.ellipsoid(0, 12.8, 2.5, 3.6, 2.2, 1.6, C.white));
        for (const s of [-1, 1]) {
          const rows = ['c...', 'cc..', 'cpc.', 'cppc', 'cccc'];
          rows.forEach((row, r) => [...row].forEach((ch, i) => { if (ch !== '.') { m.set(s * (6 - i), 23 - r, -2, 0xa8a8b4).set(s * (6 - i), 23 - r, -1, ch === 'p' ? C.pink : 0xa8a8b4).set(s * (6 - i), 23 - r, -3, 0xa8a8b4); } }));
        }
        m.project(['S.S.S', 'S.S.S'], { S: 0x7a7a88 }, -2, 21);
        catFace(m, 16, { eyes: 'closed', mouth: 'smile' });
        m.box(-11, 10, -4, 11, 11, -2, 0xa8a8b4); // shoulders hidden by counter
        for (const s of [-1, 1]) { m.ellipsoid(s * 3, 10.5, 1, 1.6, 1, 2, 0xa8a8b4); m.set(s * 3, 11, 3, C.white); }
        // the set: toast with butter, boiled egg in a cup, coffee
        const ty = 10;
        v.box(-11, ty, 1, -7, ty, 5, 0xe8a85a); // toast
        v.box(-10, ty, 2, -8, ty, 4, 0xffd890);
        v.box(-10, ty + 1, 2, -9, ty + 1, 3, 0xfff0a0);
        v.paint(() => { v.box(-11, ty, 1, -11, ty, 5, 0xb06a2a); v.box(-7, ty, 1, -7, ty, 5, 0xb06a2a); v.box(-11, ty, 1, -7, ty, 1, 0xb06a2a); v.box(-11, ty, 5, -7, ty, 5, 0xb06a2a); });
        v.cylinder(9, ty, 3, 1.2, 2, gloss(C.ceramic));
        v.ellipsoid(9, ty + 3, 3, 1.4, 1.8, 1.4, 0xfffaf0);
        coffeeCup(v, 5, ty, 3);
        // tiny bell on the counter
        v.sphere(-4, ty + 1, 4, 1, gloss(C.gold));
        v.set(-4, ty + 2, 4, gloss(0xb08a2a));
        // sugar pot
        v.cylinder(-12, ty, -3, 1.6, 2, gloss(0xffc7d4));
        v.set(-12, ty + 2, -3, gloss(C.white));
        // tiny vase with a flower
        v.cylinder(11, ty, -3, 1, 3, glass(0xcff0ff));
        v.line(11, ty + 3, -3, 11, ty + 6, -3, C.leaf);
        v.sphere(11, ty + 7, -3, 1, C.yellow);
      },
    },
    {
      id: 'store', name: 'Kissaten Storefront', jp: 'ねこ喫茶の店先', rarity: 'ultra',
      desc: 'Open from 7am until the cat in the window wakes up. So, roughly forever.',
      build(v) {
        const brick = 0xb85a3e, brickD = 0x8a3e2c, mortar = 0xe8d8c0;
        // pavement base
        v.box(-14, 0, -6, 14, 1, 9, C.lightgray);
        v.paint(() => v.shape(-14, 1, -6, 14, 1, 9, (x, y, z) => (x % 4 === 0) || (z % 4 === 0), C.gray));
        // brick facade
        v.box(-13, 2, -6, 13, 24, -2, brick);
        v.paint(() => v.shape(-13, 2, -2, 13, 24, -2, (x, y) => y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0, mortar));
        v.paint(() => v.shape(-13, 2, -6, 13, 24, -2, (x, y, z) => (z < -2) && (y % 3 === 0), brickD));
        // cornice + sign board on top
        v.box(-14, 25, -7, 14, 26, -1, C.woodDark);
        v.box(-10, 27, -4, 10, 31, -3, CREAM);
        v.box(-11, 27, -5, 11, 27, -4, C.woodDark);
        v.box(-11, 31, -5, 11, 31, -4, C.woodDark);
        v.project(['RRR.RRR.RRR.RRR', 'R...R.R.R...R..', 'R...RRR.RR..RR.', 'R...R.R.R...R..', 'RRR.R.R.R...RRR'], { R: 0x8a3e2c }, -7, 30);
        // striped awning
        for (let i = 0; i < 6; i++) {
          const y = 22 - i, z = -1 + i;
          v.box(-13, y, z, 13, y, z, (x) => (Math.floor((x + 13) / 3) % 2 ? gloss(C.white) : gloss(0xc8553d)));
        }
        for (let x = -13; x <= 13; x++) if ((x + 13) % 3 === 1) v.set(x, 16, 5, gloss(0xc8553d));
        // display window with a sleeping cat and a cream soda sample
        v.box(-11, 6, -1, -1, 15, -1, glass(0xcfeaf6));
        v.box(-12, 5, -1, 0, 5, 0, C.woodDark);
        v.box(-12, 16, -1, 0, 16, -1, C.woodDark);
        v.box(-12, 6, -1, -12, 15, -1, C.woodDark);
        v.box(-11, 6, -2, -1, 15, -2, 0xfff0c8);
        v.box(-11, 6, -2, -1, 7, -2, C.woodLight);
        // sleeping loaf cat on the sill
        v.ellipsoid(-6, 8, 1, 3.2, 2, 2.2, 0xf3a248);
        v.ellipsoid(-3.5, 9, 1.5, 2, 1.8, 1.8, 0xf3a248);
        v.set(-4, 11, 1, 0xf3a248).set(-2, 11, 1, 0xf3a248);
        v.set(-4, 9, 3, K).set(-3, 9, 3, 0xf3a248).set(-2, 9, 3, K);
        v.line(-9, 7, 1, -9, 8, 3, 0xf3a248);
        v.recolor((x, y, z, c) => (c === 0xf3a248 && x < -4 && (x % 2 === 0) ? 0xc66a22 : undefined));
        // sample soda in the window
        v.cylinder(-10, 6, -1, 0.6, 2, glass(0xe8fff4));
        v.cylinder(-10, 8, -1, 1, 3, gloss(SODA));
        v.set(-10, 11, -1, C.rice);
        // door with a glowing round window
        v.box(2, 2, -1, 10, 16, -1, 0x6a3a22);
        v.box(3, 3, 0, 9, 15, 0, 0x8a4e2e);
        v.paint(() => v.box(3, 3, 0, 9, 3, 0, 0x5a2e1a));
        v.box(5, 10, 0, 7, 13, 0, glow(0xffe0a0));
        v.set(8, 8, 1, metal(C.brass));
        v.box(2, 17, -1, 10, 17, -1, 0x4a2a1a);
        // sandwich-board menu with a coffee cup
        v.box(-12, 2, 6, -7, 9, 6, C.wood);
        v.box(-11, 3, 7, -8, 8, 7, 0x2e3a32);
        v.project(['.WW.', 'WWWW', '.WW.'], { W: C.white }, -11, 7, '+z', { raise: false });
        v.box(-12, 2, 5, -12, 2, 5, C.woodDark).box(-7, 2, 5, -7, 2, 5, C.woodDark);
        // potted plant by the door
        v.cylinder(12, 2, 4, 1.8, 3, C.terracotta || 0xc8643c);
        v.sphere(12, 7, 4, 2.4, C.leaf);
        v.sphere(11, 9, 3, 1.6, C.grass);
        // wall lamp glow
        v.box(1, 18, 0, 1, 19, 0, metal(C.brass));
        v.sphere(1, 20, 1, 1, glow(0xffd88a));
        // calico cat greeting at the door
        v.ellipsoid(6, 3.6, 3, 2.2, 1.8, 1.8, C.white);
        v.ellipsoid(6, 6.8, 3.4, 2.6, 2.2, 2.2, C.white);
        v.paint(() => v.ellipsoid(5, 8, 3, 1.6, 1.2, 3, C.orange));
        v.set(4, 9, 3, C.orange).set(4, 9.5, 3, C.orange).set(8, 9, 3, C.charcoal);
        v.set(5, 7, 5, K).set(7, 7, 5, K).set(6, 6, 5, C.hotpink);
        v.set(8, 5, 4, C.white).set(9, 6, 4, C.white).set(9, 7, 4, C.white); // waving paw
        floorClip(v);
      },
    },
    {
      id: 'latte', name: 'Latte Art Neko', jp: 'ラテアートねこ', rarity: 'secret',
      desc: 'The barista asked for cat latte art. This is the cat latte art.',
      build(v) {
        // gold-rimmed saucer
        v.cylinder(0, 0, 0, 11, 1, gloss(C.ceramic));
        v.paint(() => v.shape(-12, 0, -12, 12, 0, 12, (x, y, z) => Math.hypot(x, z) > 10, metal(C.gold)));
        v.cylinder(0, 1, 0, 6, 1, gloss(0xf0ebe0));
        // big cup with handle
        const cupC = gloss(0xffc7d4);
        v.tube(0, 1, 0, 8.5, 7.5, 9, cupC);
        v.cylinder(0, 1, 0, 8, 1, cupC);
        v.paint(() => v.shape(-9, 9, -9, 9, 9, 9, () => true, gloss(C.gold)));
        v.paint(() => v.shape(-9, 4, -9, 9, 5, 9, () => true, gloss(C.white)));
        v.paint(() => v.shape(-9, 4, -9, 9, 5, 9, (x, y, z) => (Math.round(Math.atan2(z, x) * 4) + y) % 2 === 0, gloss(0xff8fb2)));
        for (const y of [3, 4, 5, 6, 7]) v.set(10, y, 0, cupC).set(11, y, 0, cupC);
        v.box(9, 2, 0, 10, 2, 0, cupC).box(9, 8, 0, 10, 8, 0, cupC);
        v.set(11, 3, 0, null).set(11, 7, 0, null);
        // coffee + foam surface with latte-art hearts
        v.cylinder(0, 2, 0, 7.6, 7, gloss(0x8a5a3a));
        v.cylinder(0, 9, 0, 7.6, 1, 0xf4e6cc);
        v.paint(() => v.shape(-8, 9, -8, 8, 9, 8, (x, y, z) => Math.hypot(x, z) > 6.4, 0xc08a5a));
        v.project(['.H.H.', 'HHHHH', '.HHH.', '..H..'], { H: 0xc08a5a }, -6, 6, '+y');
        v.project(['.H.H.', 'HHHHH', '.HHH.', '..H..'], { H: 0xc08a5a }, 2, 3, '+y');
        // the foam cat: head and paws rising out of the latte
        const hy = 16;
        v.ellipsoid(0, hy, -0.5, 6.4, 5.4, 5.2, 0xfff6e6);
        v.ellipsoid(0, 11, 0, 4.6, 2.4, 4, 0xfff6e6);
        v.paint(() => v.shape(-8, 10, -8, 8, 24, 8, (x, y, z) => z < -2 && y > hy - 1 && (x + 20) % 3 === 0, 0xe8cfa8));
        catEar(v, -1, 0xfff6e6, 0xffcfa8, hy + 7, -1);
        catEar(v, 1, 0xfff6e6, 0xffcfa8, hy + 7, -1);
        v.project(['C.C.C'], { C: 0xc08a5a }, -2, hy + 5);
        catFace(v, hy, { eyes: 'open', mouth: 'open', nose: 0xc07a5a });
        for (const s of [-1, 1]) { v.sphere(s * 5, 10.5, 5.5, 1.5, 0xfff6e6); v.set(s * 5, 10, 7, 0xffcfa8); }
        // foam drips over the rim
        for (const [x, z, d] of [[-6, 6, 2], [4, 7, 3], [-2, 8, 1]]) for (let k = 0; k < d; k++) v.set(x, 9 - k, z, 0xfff6e6);
        // steam curling up into a little heart
        for (const [x, y] of [[6, 21], [7, 22], [7, 23], [6, 24]]) v.set(x, y, -2, glass(0xffffff));
        v.layer(['.H.H.', 'HHHHH', '.HHH.', '..H..'], { H: gloss(0xff8fb2) }, { x: 4, y: 28, z: -2 });
        // spoon on the saucer
        v.box(-10, 1, 4, -10, 1, 9, metal(C.silver));
        v.ellipsoid(-10, 1, 3, 1, 0.4, 1.4, metal(C.silver));
        // sugar cube
        v.box(7, 1, 7, 8, 2, 8, C.rice);
      },
    },
  ],
};
