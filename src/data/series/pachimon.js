// Series — Pachimon Paradise (パチモンパラダイス)
// Affectionate off-brand bootlegs of pop-culture favourites: tiny round blob friends who cry and yell a lot, and a
// few blobs having a bizarre adventure. Original designs and names, no logos.
import { C, shade } from '../../voxel/palette.js';
import { gloss, metal, glass, glow } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xfbf8f2;

/** Round blob body (bottom on y = 0). */
function blob(v, color, rx = 7, ry = 6.5, rz = 6.5, cy = null) {
  v.ellipsoid(0, cy ?? ry, 0, rx, ry, rz, color);
  v.box(-20, -6, -20, 20, -1, 20, null);
}
/** Little stubby arms and feet. */
function limbs(v, color, { up = false, y = 5, spread = 7 } = {}) {
  for (const s of [-1, 1]) {
    if (up) v.ellipsoid(s * (spread + 1), y + 5, 1, 1.4, 2.6, 1.4, color);
    else v.ellipsoid(s * spread, y, 2, 1.6, 1.4, 1.4, color);
    v.ellipsoid(s * 3, 0.6, 2, 2, 1, 2, color);
  }
}
/** Dot-eye face with blush; mood: 'cry', 'yell', 'smile', 'stern'. eyeY = eye row. */
function face(v, eyeY, mood = 'smile', spread = 3) {
  const L = { K, W, P: 0xffa7b8, M: C.mouth, T: C.tongue, B: 0x7fc8ff };
  const gap = '.'.repeat(spread * 2 - 1);
  if (mood === 'stern') v.project([`KK${gap}KK`, `.K${gap}K.`], L, -spread - 1, eyeY);
  else v.project([`KW${gap}KW`, `KK${gap}KK`], L, -spread - 1, eyeY);
  if (mood === 'cry') { v.project([`B${'.'.repeat(spread * 2 + 1)}B`, `B${'.'.repeat(spread * 2 + 1)}B`], L, -spread - 1, eyeY - 2); v.project(['.M.', 'M.M'], L, -1, eyeY - 3); }
  else if (mood === 'yell') v.project(['MMM', 'MTM', 'MMM'], L, -1, eyeY - 2);
  else if (mood === 'stern') v.project(['MMM'], L, -1, eyeY - 3);
  else v.project(['M.M', '.M.'], L, -1, eyeY - 2);
  v.project(['PP', 'PP'], L, -spread - 3, eyeY - 2);
  v.project(['PP', 'PP'], L, spread + 2, eyeY - 2);
}
/** Floating ゴ glyphs (the menacing sound effect), as voxel pixel art on a plane. */
function menacing(v, x, y, z, color) {
  v.layer(['.XXXX.X', 'X....X.', '.XXXX..', '...X...', '..X....', '.X.....'], { X: gloss(color) }, { x, y, z, depth: 1 });
}

export default {
  id: 'pachimon',
  order: 9,
  name: 'Pachimon Paradise',
  jp: 'パチモンパラダイス',
  tagline: 'Totally official bootleg friends',
  taglineJp: 'たぶん公式！ニセモノなかま',
  price: 400,
  themes: ['cute', 'weird'],
  card: { bg: '#fff4f8', accent: '#8a5bd6', text: '#3a2440', accent2: '#ffd23f', pattern: 'stars' },
  capsule: { colors: [0xffffff, 0xffc2d4, 0xc7b3f0, 0xfff2b3], style: 'opaque' },
  items: [
    {
      id: 'chibikuma', name: 'Teary Chibikuma', jp: 'なきむしちびくま', rarity: 'common',
      desc: 'Tiny, round, crying about weeding. You would cry too. It is so much weeding.',
      build(v) {
        blob(v, W);
        v.sphere(-4, 12, 0, 1.6, W); v.sphere(4, 12, 0, 1.6, W);
        v.paint(() => { v.sphere(-4, 12, 1, 0.8, 0xffd1dc); v.sphere(4, 12, 1, 0.8, 0xffd1dc); });
        limbs(v, W);
        face(v, 8, 'cry');
        // a little weeding sickle
        v.line(8, 3, 3, 8, 8, 3, C.woodLight, 0); v.box(8, 8, 3, 10, 8, 3, metal(C.silver));
      },
    },
    {
      id: 'wareneko', name: 'Splitface Kitty', jp: 'われわれねこ', rarity: 'common',
      desc: 'Half blue, half white, all heart. Says "it\'ll be fine!" right before it isn\'t.',
      build(v) {
        blob(v, W);
        // split hair: blue cap with a V parting
        v.paint(() => v.shape(-8, 6, -8, 8, 14, 8, (x, y) => y >= 9 + Math.max(0, 3 - Math.abs(x)) * 0.9 - (Math.abs(x) < 1 ? 3 : 0), 0x3a5a9a));
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) v.box(s * (3 + i), 12 + i, -1, s * (3 + i), 12 + i, 1, 0x3a5a9a);
        limbs(v, W, { up: true });
        face(v, 7, 'yell');
      },
    },
    {
      id: 'wahoousa', name: 'Wahoo Bunny', jp: 'ワッホーうさぎ', rarity: 'common',
      desc: 'Yells WAHOO at everything. Eats your snacks. Somehow everyone\'s favourite.',
      build(v) {
        const y = 0xfff0b8;
        blob(v, y, 6.5, 6, 6);
        v.ellipsoid(-2.5, 16, 0, 1.4, 5, 1.4, y); v.ellipsoid(2.5, 16, 0, 1.4, 5, 1.4, y);
        v.paint(() => { v.box(-3, 13, 1, -2, 19, 1, 0xffc2d4); v.box(2, 13, 1, 3, 19, 1, 0xffc2d4); });
        limbs(v, y, { up: true, spread: 6 });
        face(v, 8, 'yell', 3);
        v.project(['.KK.', 'K..K'], { K }, -2, 11); // very excited brows
      },
    },
    {
      id: 'gogomochi', name: 'Menacing Mochi', jp: 'ゴゴゴもち', rarity: 'uncommon',
      desc: 'Strikes a pose so twisted its spine is a rumour. The air around it says ゴゴゴ.',
      build(v) {
        const body = 0xf2e6ff;
        blob(v, body, 6.5, 6.5, 6);
        // twisted pose: one arm up over the head, the other on the hip, hips cocked
        v.ellipsoid(-6, 13, 0, 1.4, 4, 1.4, body); v.ellipsoid(-4, 17, 0, 1.6, 1.6, 1.6, body);
        v.ellipsoid(7, 5, 1, 1.6, 2.4, 1.4, body);
        v.ellipsoid(-2, 0.6, 2, 2, 1, 2, body); v.ellipsoid(4, 0.6, -1, 2, 1, 2, body);
        face(v, 9, 'stern');
        v.project(['KKKKKKK'], { K: 0x6a3aa8 }, -3, 12); // hard shadow under the brow
        menacing(v, 8, 18, -2, 0x8a3ad6); menacing(v, -14, 10, -3, 0x8a3ad6);
        v.box(-1, 13, 6, 1, 13, 6, gloss(0xffd23f)); // a heart-ish pin
      },
    },
    {
      id: 'standsan', name: 'Stand-in Spirit', jp: 'スタンドさん', rarity: 'uncommon',
      desc: 'A shy blob and the enormous muscly spirit that does all its talking. ORA. (please)',
      build(v) {
        // the spirit: a big translucent bruiser behind, fists out front
        v.ellipsoid(0, 15, -5, 6, 6, 4, glass(0x9fe0ff));
        v.ellipsoid(0, 22, -5, 3.5, 3.5, 3, glass(0x9fe0ff));
        for (const s of [-1, 1]) { v.line(s * 6, 16, -4, s * 5, 13, 4, glass(0x9fe0ff), 1.4); v.sphere(s * 5, 13, 5, 2, glass(0x7fc8f0)); }
        v.project(['K.K'], { K: glow(0xffe060) }, -1, 23, '+z');
        // the little blob in front
        v.ellipsoid(0, 5, 3, 5, 5, 4.5, 0xffe0c8);
        v.box(-6, -2, -2, 6, -1, 8, null);
        v.paint(() => v.ellipsoid(0, 9, 3, 5, 2, 4.5, 0x2a2440)); // school cap
        v.box(-3, 9, 7, 3, 9, 8, 0x2a2440);
        face(v, 6, 'stern', 2);
      },
    },
    {
      id: 'roadroller', name: 'It Was Me, Roller!', jp: 'ロードローラーだっ', rarity: 'rare',
      desc: 'A blond blob drops a road roller on its problems. The problems remain. The roller is cute.',
      build(v) {
        const yel = gloss(0xf7d046), dark = gloss(0x2a2a2e);
        // the roller drum at the front, the body and cab
        v.cylinder(-7, 4, 5, 4, 15, dark, 'x');
        v.paint(() => { v.cylinder(-7, 4, 5, 4, 1, metal(C.silver), 'x'); v.cylinder(7, 4, 5, 4, 1, metal(C.silver), 'x'); });
        v.box(-6, 3, -7, 6, 8, 1, yel);
        v.box(-5, 9, -6, 5, 10, 0, yel);
        v.cylinder(-6, 3, -5, 2.5, 13, dark, 'x');
        v.project(['KKKK', 'K..K'], { K: dark }, -2, 7, '-z');
        v.box(-6, 8, 2, 6, 8, 9, yel); // fender over the drum
        // the blond blob on top, arms flung wide, yelling
        v.ellipsoid(0, 15, -3, 4.5, 4.5, 4, 0xffe0c8);
        v.paint(() => v.ellipsoid(0, 18, -3, 4.8, 2.4, 4.4, 0xf2c94a));
        for (const s of [-1, 1]) v.box(s * 5, 14, -3, s * 8, 15, -3, 0xffe0c8);
        v.project(['KK.KK', '.....', '.MMM.', '.MTM.'], { K, M: C.mouth, T: C.tongue }, -2, 16);
        v.box(-1, 11, -3, 1, 11, 1, gloss(0x3cae5a)); // a green scarf flapping
      },
    },
    {
      id: 'kinusa', name: 'Golden Wind Bunny', jp: 'こがねかぜうさぎ', rarity: 'ultra',
      desc: 'Has a dream. Has a ladybug brooch. Has a very specific hairdo. Gleams.',
      build(v) {
        const gold = gloss(0xf2c14e);
        blob(v, gold, 6.5, 6.5, 6);
        v.ellipsoid(-2.5, 16, -1, 1.3, 4.5, 1.3, gold); v.ellipsoid(2.5, 16, -1, 1.3, 4.5, 1.3, gold);
        // three braided curls across the forehead
        for (let i = 0; i < 3; i++) v.torus(-3 + i * 3, 11, 5, 1.2, 0.5, gloss(0xd8a020), 'z');
        limbs(v, gold, { up: false });
        face(v, 8, 'stern', 3);
        // the ladybug brooch
        v.box(-1, 4, 6, 1, 5, 7, gloss(C.red)); v.set(0, 5, 8, gloss(K)); v.set(0, 4, 8, gloss(K));
        v.box(-6, 0, -5, 6, -1, 5, null);
      },
    },
    {
      id: 'tokitome', name: 'Time-Stop Clock Blob', jp: 'ときとめどけい', rarity: 'secret',
      desc: 'Its belly clock says 12:00. It has always said 12:00. Did you just blink? It didn\'t.',
      build(v) {
        const body = 0xfff4d6;
        blob(v, body, 7, 7, 6.5);
        // the clock face on the belly with stopped hands
        v.cylinder(0, 5, 5, 4.5, 2, gloss(W), 'z');
        v.paint(() => v.tube(0, 5, 6, 4.5, 3.6, 1, gloss(0xd8b04a), 'z'));
        v.box(0, 5, 7, 0, 8, 7, gloss(K)); v.box(0, 5, 7, 2, 5, 7, gloss(K));
        for (const [x, y] of [[0, 8], [3, 5], [0, 2], [-3, 5]]) v.set(x, y, 7, gloss(0xd8b04a));
        // a yellow headband with little heart studs, a cocky face
        v.paint(() => v.ellipsoid(0, 11, 0, 7.2, 1.2, 6.7, gloss(0xf7d046)));
        v.set(-3, 11, 7, gloss(C.hotpink)); v.set(3, 11, 7, gloss(C.hotpink));
        face(v, 10 - 1, 'smile', 3);
        limbs(v, body, { up: true, spread: 7 });
        // frozen motion lines in the air
        v.box(-11, 13, 0, -10, 13, 0, glow(0xffe060)); v.box(10, 9, 0, 11, 9, 0, glow(0xffe060));
      },
    },
  ],
};
