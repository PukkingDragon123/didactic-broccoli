// Series 12 — Kaiun Omamori (開運おまもり)
// A premium run of lucky shrine charms: deep lacquer reds, real-gold accents and tiny glowing lanterns.
import { C, shade } from '../../voxel/palette.js';
import { gloss, metal, glow } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;
const RED = 0xc8202c; // shrine lacquer red
const RED_D = 0x8e1420; // deep lacquer shadow
const VERM = 0xe2452e; // torii vermilion
// gold leaf reads best as warm gloss; real metal is kept for small fittings (bells, rims, studs)
const GOLD = gloss(0xf2bf45);
const GOLD_D = gloss(0xc58a26);
const GOLD_L = gloss(0xffe28a);
const BRASS = metal(0xffd45a);
const BLACKL = gloss(C.lacquerBlack);
const SILK = 0xfbf1dc;

/** Deterministic 0..1 hash for hand-painted noise. */
function hash(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Solid box that accepts a colour function (box() only takes plain colours). */
function fill(v, x0, y0, z0, x1, y1, z1, c) {
  return v.shape(x0, y0, z0, x1, y1, z1, () => true, c);
}

/** Weathered stone colour with a little speckle. */
function stone(base) {
  return (x, y, z) => {
    const n = hash(x, y, z);
    return n > 0.82 ? shade(base, 1.08) : n < 0.15 ? shade(base, 0.9) : base;
  };
}

/** Triangular ear from stacked slabs (front face at z). */
function ear(v, x, y, z, color, inner, { h = 4, w = 4, depth = 2 } = {}) {
  for (let i = 0; i < h; i++) {
    const ww = Math.max(1, Math.round(w * (1 - i / h)));
    v.box(x - Math.floor(ww / 2), y + i, z, x + Math.ceil(ww / 2) - 1, y + i, z - depth + 1, color);
    if (inner && i < h - 1 && ww > 2) v.box(x - Math.floor(ww / 2) + 1, y + i, z + 1, x + Math.ceil(ww / 2) - 2, y + i, z + 1, inner);
  }
}

/** Little tōrō stone lantern with a glowing fire box, standing on y0. */
function lantern(v, cx, y0, cz) {
  const S = stone(0xb4afa6), SD = stone(0x8f8a82);
  fill(v, cx - 2, y0, cz - 2, cx + 2, y0, cz + 2, SD);
  fill(v, cx - 1, y0 + 1, cz - 1, cx + 1, y0 + 1, cz + 1, S);
  fill(v, cx, y0 + 2, cz, cx, y0 + 4, cz, S);
  fill(v, cx - 1, y0 + 2, cz, cx + 1, y0 + 4, cz, S);
  fill(v, cx, y0 + 2, cz - 1, cx, y0 + 4, cz + 1, S);
  fill(v, cx - 2, y0 + 5, cz - 2, cx + 2, y0 + 5, cz + 2, S);
  // fire box: stone corner posts with glowing paper windows
  v.box(cx - 1, y0 + 6, cz - 1, cx + 1, y0 + 8, cz + 1, glow(0xffb347));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) fill(v, cx + sx, y0 + 6, cz + sz, cx + sx, y0 + 8, cz + sz, S);
  v.set(cx, y0 + 7, cz, glow(0xffe28a));
  // roof + jewel finial
  fill(v, cx - 2, y0 + 9, cz - 2, cx + 2, y0 + 9, cz + 2, SD);
  fill(v, cx - 1, y0 + 10, cz - 1, cx + 1, y0 + 10, cz + 1, S);
  v.set(cx, y0 + 11, cz, 0x8f8a82);
  v.paint(() => {
    v.set(cx - 2, y0 + 9, cz + 2, C.moss); v.set(cx + 1, y0 + 10, cz - 1, C.moss); v.set(cx - 2, y0, cz - 1, C.moss);
  });
}

export default {
  id: 'omamori',
  order: 12,
  name: 'Kaiun Omamori',
  jp: '開運おまもり',
  tagline: 'Premium lucky shrine charms in lacquer & gold',
  taglineJp: '福を呼ぶ！ごりやくコレクション',
  price: 1000,
  themes: ['shrine'],
  card: { bg: '#fff1e2', accent: '#c8202c', text: '#4a1218', accent2: '#e0a92e', pattern: 'waves' },
  capsule: { colors: [0xc8202c, 0xf2c14e, 0xfbf8f2, 0x241818, 0xe2452e] },
  items: [
    {
      id: 'pouch', name: 'Brocade Omamori', jp: '錦のお守り', rarity: 'common',
      desc: 'Do not open it. The luck leaks out. Everyone knows this.',
      build(v) {
        // black lacquer display stand with a brass edge
        v.box(-8, 0, -4, 8, 1, 4, BLACKL);
        v.box(-7, 2, -3, 7, 2, 3, BLACKL);
        v.paint(() => v.box(-8, 1, 4, 8, 1, 4, BRASS));
        const P = 3;
        const halfW = (yy) => (yy <= 13 ? 6 : [5, 4, 2][yy - 14]);
        const brocade = (x, y) => {
          const a = ((x + y) % 4 + 4) % 4, b = ((x - y) % 4 + 4) % 4;
          if (a === 0 && b === 0) return GOLD;
          if (a === 2 && b === 2) return shade(RED, 0.78);
          return RED;
        };
        v.shape(-6, P, -2, 6, P + 16, 2, (x, y, z) => {
          const yy = y - P, w = halfW(yy);
          if (Math.abs(x) > w) return false;
          if (Math.abs(z) <= 1) return true;
          return Math.abs(x) <= w - 1 && yy >= 1 && yy <= 14; // puffy silk front & back
        }, brocade);
        v.paint(() => v.box(-6, P, -2, 6, P, 2, RED_D)); // sewn bottom seam
        // woven gold-bordered panel: 御守
        v.project([
          'GGGGGGG',
          'GSKKKKG',
          'GKSKSSG',
          'GSKKKKG',
          'GKKKSKG',
          'GSKKKKG',
          'GSKSKSG',
          'GSSSSSG',
          'GSSKSSG',
          'GKKKKKG',
          'GKSSSKG',
          'GKKKKKG',
          'GSKSKSG',
          'GSSKKSG',
          'GGGGGGG',
        ], { G: GOLD, K: RED_D, S: SILK }, -3, P + 14, '+z', { raise: true });
        // the back gets a gold diamond crest
        v.project(['..G..', '.GGG.', 'GGRGG', '.GGG.', '..G..'], { G: GOLD, R: RED_D }, -2, P + 10, '-z', { raise: true });
        // twisted purple cord: knot, little hanging loop, and two tassels down the shoulders
        const CORD = 0x7b3fa8, CORD_L = 0xa77ad0;
        const tw = (x, y) => gloss((x + y) % 2 ? CORD : CORD_L);
        v.set(-1, P + 17, 0, tw(-1, P + 17)); v.set(1, P + 17, 0, tw(1, P + 17));
        v.box(-1, P + 18, 0, 1, P + 19, 1, gloss(CORD));
        v.set(0, P + 19, 1, gloss(CORD_L)); v.set(-1, P + 18, 1, gloss(CORD_L));
        for (let y = P + 20; y <= P + 22; y++) { v.set(-1, y, 0, tw(-1, y)); v.set(1, y, 0, tw(1, y)); }
        v.set(0, P + 22, 0, tw(0, P + 22));
        for (const s of [-1, 1]) {
          for (let i = 0; i <= 4; i++) {
            const x = s * (2 + Math.floor(i * 0.6)), y = P + 18 - i;
            v.set(x, y, i < 2 ? 1 : 2, tw(x, y));
            if (i >= 2) v.set(x, y, 3, tw(x, y + 1));
          }
          v.set(s * 4, P + 13, 3, BRASS); // metal cap
          v.box(s * 4, P + 10, 3, s * 4, P + 12, 3, gloss(CORD_L)); // tassel
          v.box(s * 4 + s, P + 10, 3, s * 4 + s, P + 11, 3, gloss(CORD));
        }
      },
    },
    {
      id: 'ema', name: 'Ema Horse Plaque', jp: '絵馬', rarity: 'common',
      desc: 'Wish on the back says "please let me pull the secret". Relatable.',
      build(v) {
        // little wooden stand
        v.box(-9, 0, -3, 9, 1, 3, C.woodDark);
        v.paint(() => v.box(-9, 1, -3, 9, 1, 3, shade(C.woodDark, 1.12)));
        const B = 2, WOOD = 0xe8be86;
        const wood = (x, y, z) => {
          const g = ((y * 7 + Math.floor((x + 40) / 6) * 3) % 9);
          if (g === 0) return shade(WOOD, 0.88);
          return hash(x, y, z) > 0.86 ? shade(WOOD, 1.05) : WOOD;
        };
        v.shape(-11, B, -1, 11, B + 16, 0, (x, y) => {
          const yy = y - B;
          return yy <= 10 ? Math.abs(x) <= 11 : Math.abs(x) <= 11 - 2 * (yy - 10);
        }, wood);
        // painted rising sun, grass and a galloping chestnut horse
        v.paint(() => v.cylinder(-8, B + 8, 0, 2.2, 1, C.vermilion, 'z'));
        v.project(['G.G...G.G..G.G.G.G', '.G.....G..G....G..'], { G: C.grassDark }, -10, B + 1);
        v.project([
          '.....G......MM...',
          '...........MBBB..',
          '..........MBBWBB.',
          '.........MBBB.BBB',
          '.TT.GRRRGBBB.....',
          'TTTBRRRRRBBB.....',
          'T.BBBBBBBBBB.....',
          '..BBBBBBBBBB.....',
          '..BB......BB.....',
          '.B.B......B.B....',
          '.W..W....W...W...',
        ], { M: K, T: K, B: 0x6b3a1e, W: 0xfdfaf3, R: C.vermilion, G: GOLD }, -7, B + 11);
        // roof rim (dark wood strips along the gable)
        const RIM = 0x8a5a32;
        for (let yy = 10; yy <= 15; yy++) {
          const w = 11 - 2 * (yy - 10);
          for (let x = Math.max(0, w - 2); x <= w; x++) { v.set(x, B + yy, 1, RIM); v.set(-x, B + yy, 1, RIM); }
        }
        // red & white cord through the hole
        v.set(0, B + 13, 1, gloss(C.red)); v.set(-1, B + 13, 1, gloss(W)); v.set(1, B + 13, 1, gloss(W));
        v.ring(0, B + 18, 0, gloss(C.red), 'z');
        v.set(0, B + 16, 0, gloss(W));
        v.box(-2, B + 11, 1, -2, B + 13, 1, gloss(C.red)); v.box(2, B + 11, 1, 2, B + 13, 1, gloss(W));
        // the wish, written vertically on the back + a red seal
        v.project([
          'K...K...K.',
          'K.K.K.K...',
          '..K...K.K.',
          'K.K.K.K.K.',
          'K...K...K.',
          'K.K...K.K.',
          '..K.K.K...',
          'K.K.K...K.',
        ], { K: 0x4a3a30 }, -5, B + 10, '-z');
        v.project(['RR', 'RR'], { R: C.vermilion }, -8, B + 3, '-z');
      },
    },
    {
      id: 'omikuji', name: 'Omikuji Box', jp: 'おみくじ箱', rarity: 'common',
      desc: 'Shaken forty-one times until it finally said 大吉. Fate was negotiated.',
      build(v) {
        // red lacquer tray with a raised lip
        v.box(-11, 0, -7, 11, 1, 7, gloss(RED));
        v.paint(() => v.box(-11, 0, -7, 11, 0, 7, gloss(RED_D)));
        v.hollowBox(-11, 2, -7, 11, 2, 7, gloss(shade(RED, 0.85)), 1, ['top', 'bottom']);
        // hexagonal wooden box
        const bx = -3, bz = -1, WOOD = 0xd9ab72;
        const hex = (x, z, a) => Math.abs(z) <= a && 1.732 * Math.abs(x) + Math.abs(z) <= 2 * a + 0.6;
        v.shape(bx - 7, 2, bz - 6, bx + 7, 19, bz + 6, (x, y, z) => hex(x - bx, z - bz, 5), (x, y, z) => {
          if (y <= 3 || y >= 18) return BLACKL;
          if (y === 4 || y === 17) return GOLD_D;
          return hash(x, y, z) > 0.8 || (x + z * 3) % 7 === 0 ? shade(WOOD, 0.9) : WOOD;
        });
        // lid with a brass-rimmed hole
        v.shape(bx - 6, 20, bz - 5, bx + 6, 20, bz + 5, (x, y, z) => hex(x - bx, z - bz, 4), BLACKL);
        v.box(bx - 1, 20, bz - 1, bx + 1, 20, bz + 1, BRASS);
        v.set(bx, 20, bz, null);
        // paper label: みくじ
        v.project([
          'SKKKKSS',
          'SSSKSKS',
          'SSKKKKS',
          'SKSSKSS',
          'SSSSSSS',
          'SSSSKSS',
          'SSSKSSS',
          'SSSKSSS',
          'SSSSKSS',
          'SSSSSSS',
          'SKSSKSK',
          'SKSSSSS',
          'SKSSSKS',
          'SSKKKSS',
        ], { S: SILK, K }, bx - 3, 17, '+z');
        // fortune sticks peeking out of the hole
        const STICK = 0xeedcac;
        v.line(bx, 19, bz, bx - 1, 25, bz + 1, STICK);
        v.set(bx - 1, 26, bz + 1, gloss(C.red));
        v.line(bx, 19, bz, bx + 1, 23, bz, STICK);
        v.set(bx + 1, 24, bz, gloss(C.red));
        // unfolded fortune slip: 大吉!
        v.layer([
          'SSSSS',
          'SSRSS',
          'SRRRS',
          'SSRSS',
          'SRSRS',
          'SSSSS',
          'SSRSS',
          'SRRRS',
          'SSSSS',
          'SRRRS',
          'SRSRS',
          'SRRRS',
          'SSSSS',
        ], { S: SILK, R: C.red }, { x: 4, y: 2, z: -6, plane: 'xz' });
        v.set(8, 3, 6, SILK); v.set(4, 3, -6, SILK); // curled corners
      },
    },
    {
      id: 'daruma', name: 'One-Eyed Daruma', jp: '片目だるま', rarity: 'uncommon',
      desc: 'One eye in for the wish, one eye left for when it comes true. No pressure.',
      build(v) {
        v.ellipsoid(0, 10.5, 0, 10, 11, 9, gloss(RED));
        v.box(-12, -2, -12, 12, -1, 12, null);
        v.paint(() => {
          v.box(-12, 0, -12, 12, 2, 12, gloss(RED_D)); // weighted base in shadow
          v.ellipsoid(-3, 18, -1, 4, 3, 4, gloss(0xe24a4a)); // glossy highlight on the crown
          v.ellipsoid(0, 12, 6, 7, 6, 6, gloss(0xfbf3e4)); // face
        });
        // brows, eyes (only one filled!), nose & moustache
        v.project([
          'KKK.......KKK',
          '.KKKK...KKKK.',
          '.............',
          '.KKK.....KKK.',
          'KKKWK...K...K',
          'KKKKK...K...K',
          '.KKK.....KKK.',
          '......K......',
          '..KKK...KKK..',
          '.K...KKK...K.',
        ], { K, W }, -6, 17);
        // gold beard curls and 福 on the belly
        v.project(['G.G.G.G.G'], { G: GOLD_D }, -4, 7);
        v.project([
          'G.GGGG.',
          'GG.....',
          'G.GGGG.',
          'GGG..G.',
          'G.GGGG.',
          'G.G.GG.',
        ], { G: GOLD }, -3, 6, '+z', { raise: true });
        // gold cloud swirls on both sides
        const swirl = ['.GGG.', 'G...G', 'G.G.G', 'G..GG', '.G...'];
        v.project(swirl, { G: GOLD }, -3, 14, '+x');
        v.project(swirl, { G: GOLD }, -1, 14, '-x');
        // gold band around the back
        v.project(['GGGGGGGGG', '.G.G.G.G.'], { G: GOLD }, -4, 7, '-z');
      },
    },
    {
      id: 'maneki', name: 'Maneki-neko', jp: '招き猫', rarity: 'uncommon',
      desc: 'Beckons customers, luck and, on Tuesdays, pigeons.',
      build(v) {
        const WH = gloss(0xfbf8f2);
        // red zabuton cushion with gold corner tassels
        v.box(-9, 0, -8, 9, 1, 8, 0xc8202c);
        v.box(-8, 2, -7, 8, 2, 7, 0xd8343a);
        v.paint(() => v.box(-9, 0, -8, 9, 0, 8, shade(0xc8202c, 0.8)));
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          v.set(sx * 10, 1, sz * 8, GOLD_D); v.set(sx * 10, 0, sz * 8, GOLD); v.set(sx * 11, 0, sz * 8, GOLD);
        }
        // body + head
        v.ellipsoid(0, 8, 0, 7, 6.5, 6, WH);
        v.box(-9, 0, -8, 9, 1, 8, 0xc8202c); // re-flatten into the cushion
        v.box(-8, 2, -7, 8, 2, 7, 0xd8343a);
        v.paint(() => v.box(-9, 0, -8, 9, 0, 8, shade(0xc8202c, 0.8)));
        v.ellipsoid(0, 18, 1, 7, 5.5, 5.5, WH);
        ear(v, -4, 22, 1, WH, gloss(C.pink), { h: 4, w: 4, depth: 2 });
        ear(v, 4, 22, 1, WH, gloss(C.pink), { h: 4, w: 4, depth: 2 });
        // calico patches
        v.paint(() => {
          v.ellipsoid(-5, 21, -1, 4, 3, 5, gloss(C.orange));
          v.ellipsoid(5, 21, -2, 3, 2, 3, gloss(C.charcoal));
          v.ellipsoid(4, 9, -5, 4, 4, 3, gloss(C.orange));
          v.ellipsoid(-5, 6, -4, 3, 3, 3, gloss(C.charcoal));
        });
        // face
        v.project([
          'KK.....KK',
          'KW.....KW',
          '....N....',
          'PP.M.M.PP',
        ], { K, W, N: gloss(C.hotpink), M: K, P: C.blush }, -4, 19);
        v.project(['www', '...', 'www'], { w: C.lightgray }, -8, 17);
        v.project(['www', '...', 'www'], { w: C.lightgray }, 6, 17);
        // red collar with a brass bell
        v.torus(0, 13, 1, 5, 0.8, gloss(C.red));
        v.sphere(0, 12, 6.5, 1.5, BRASS);
        v.set(0, 11, 8, GOLD_D);
        // raised beckoning paw (pads facing out)
        v.line(5, 12, 2, 8, 19, 2, WH, 1.6);
        v.sphere(8, 21, 2.5, 2.2, WH);
        v.project(['P.P', '.P.'], { P: gloss(C.pink) }, 7, 22, '+z');
        // koban held at the chest
        v.ellipsoid(-1, 8, 6.5, 3, 4.2, 0.6, GOLD);
        v.project(['.GGGGG.', '.......', '.GGGGG.', '..R.R..', '.GGGGG.'], { G: GOLD_D, R: gloss(0xb2502a) }, -4, 10, '+z');
        v.sphere(-4, 11, 5.5, 1.8, WH);
        // curled tail
        v.torus(3, 5, -6, 2, 0.9, WH, 'z');
      },
    },
    {
      id: 'kitsune', name: 'Inari Kitsune Guardian', jp: 'お稲荷さんの狐', rarity: 'rare',
      desc: 'Guards the shrine day and night. Accepts fried tofu as a bribe.',
      build(v) {
        const SL = stone(0xc3beb3), SM = stone(0xa7a197), SD = stone(0x858077);
        // three-tier stone plinth
        fill(v, -10, 0, -8, 10, 1, 8, SD);
        fill(v, -8, 2, -6, 8, 6, 6, SM);
        fill(v, -9, 7, -7, 9, 8, 7, SL);
        v.paint(() => v.box(-6, 3, 6, 6, 5, 6, shade(0xa7a197, 0.85))); // carved panel
        v.project(['.KKK.....KKK.', 'K..K.KKK.K..K', '.KK...K...KK.'], { K: shade(0x858077, 0.72) }, -6, 5, '+z'); // carved cloud scrolls
        // moss creeping over the stone
        v.paint(() => {
          v.shape(-10, 0, -8, 10, 8, 8, (x, y, z) => (y === 1 || y === 8) && hash(x, y, z) < 0.3, (x, y, z) => (hash(z, x, y) > 0.5 ? C.moss : shade(C.moss, 1.2)));
          v.shape(-10, 0, -8, 10, 1, 8, (x, y, z) => (Math.abs(x) === 10 || Math.abs(z) === 8) && hash(x, z, y) < 0.35, C.moss);
        });
        // the fox
        const F = 0xf1ece2, FS = shade(F, 0.86);
        const fox = (x, y, z) => (y < 12 || hash(x, y, z) < 0.12 ? FS : F);
        const B = 9;
        v.ellipsoid(0, B + 3.5, -2, 5, 3.5, 4.5, fox); // haunches
        v.ellipsoid(0, B + 6, 0.5, 3.8, 5.5, 3.2, fox); // chest
        v.box(-2, B, 2, -1, B + 5, 3, F); v.box(1, B, 2, 2, B + 5, 3, F); // front legs
        v.box(-2, B, 4, -1, B, 4, FS); v.box(1, B, 4, 2, B, 4, FS); // toes
        v.ellipsoid(-4, B + 1, 1, 1.5, 1, 2, FS); v.ellipsoid(4, B + 1, 1, 1.5, 1, 2, FS); // hind paws
        v.ellipsoid(0, B + 13, 0.5, 3.6, 3, 3.3, F); // head
        v.ellipsoid(0, B + 12, 4, 1.7, 1.4, 2.6, F); // long snout
        v.set(0, B + 12, 7, K); v.set(0, B + 13, 6, F);
        for (const s of [-1, 1]) {
          for (let i = 0; i < 5; i++) {
            const x0 = s * 2, x1 = s * 2 + (i < 3 ? s : 0);
            v.box(x0, B + 15 + i, -1, x1, B + 15 + i, 0, F);
            if (i < 3) v.set(x0, B + 15 + i, 1, C.vermilion);
          }
        }
        // painted red eye lines & mouth
        v.project(['RR...RR', '.KR.RK.'], { R: C.vermilion, K }, -3, B + 14, '+z');
        v.project(['RRR'], { R: C.vermilion }, -1, B + 11, '+z');
        // bushy tail sweeping up behind like a flame
        const tail = [[1, 11, -6, 2.4], [2, 14, -7, 2.8], [2, 17, -7, 2.8], [2, 20, -6, 2.5], [1, 23, -5, 2.1], [0, 25, -4, 1.5]];
        for (const [x, y, z, r] of tail) v.sphere(x, y, z, r, fox);
        v.paint(() => v.sphere(0, 25, -4, 1.7, 0xfffcf4));
        // red bib (yodarekake)
        v.project([
          'RRRRRRR',
          'RRRRRRR',
          '.RRRRR.',
          '.RRRRR.',
          '..RDR..',
          '...R...',
        ], { R: C.red, D: RED_D }, -3, B + 10, '+z', { raise: true });
        // golden wish-granting jewel (hōju) between the paws
        v.sphere(0, B + 1.5, 5.5, 1.5, GOLD);
        v.set(0, B + 3, 5, GOLD_L); v.set(0, B + 4, 5, GOLD_L);
        v.set(0, B, 5, GOLD_D);
      },
    },
    {
      id: 'jinja', name: 'Tiny Inari Shrine', jp: 'ちいさな神社', rarity: 'ultra',
      desc: 'A whole shrine for one very small god. The lanterns stay lit all night.',
      build(v) {
        // lacquer display base with mossy ground and a gravel path
        v.box(-14, 0, -13, 14, 1, 13, BLACKL);
        v.paint(() => v.box(-14, 1, 13, 14, 1, 13, BRASS));
        fill(v, -13, 2, -12, 13, 2, 12, (x, y, z) => {
          if (Math.abs(x) <= 2 && z >= -4) return hash(x, y, z) > 0.5 ? 0xd9d3c6 : 0xc4beb1;
          const n = hash(x, z, 7);
          return n > 0.75 ? C.grass : n > 0.35 ? C.moss : shade(C.moss, 0.85);
        });
        // stone steps & foundation
        const SS = stone(0xa29d94);
        fill(v, -7, 3, -12, 7, 4, -5, SS);
        fill(v, -2, 3, -4, 2, 3, -4, SS);
        // shrine body: vermilion pillars, white walls, lattice doors
        v.box(-5, 5, -11, 5, 5, -5, C.woodDark);
        v.box(-4, 6, -11, 4, 12, -7, SILK);
        for (const x of [-4, 4]) for (const z of [-11, -7]) v.box(x, 6, z, x, 12, z, gloss(VERM));
        v.box(-4, 12, -11, 4, 12, -7, gloss(VERM));
        v.project([
          'DDDDD',
          'DGDGD',
          'DDDDD',
          'DGDGD',
          'DDDDD',
          'DDDDD',
        ], { D: C.woodDark, G: GOLD }, -2, 11, '+z');
        // copper-green gabled roof with gold-capped ridge logs & chigi
        const ROOF = 0x5f9e88;
        for (let k = 0; k <= 4; k++) {
          v.box(-6, 13 + k, -13 + k, 6, 13 + k, -5 - k, k === 0 ? shade(ROOF, 0.8) : ROOF);
        }
        v.box(-6, 17, -9, 6, 17, -9, C.lacquerBlack);
        for (const x of [-3, 0, 3]) { v.box(x, 18, -10, x, 18, -8, C.woodDark); v.set(x, 18, -7, GOLD); v.set(x, 18, -11, GOLD); }
        for (const s of [-1, 1]) {
          const x = s * 6;
          v.box(x, 18, -10, x, 18, -8, C.woodDark);
          v.box(x, 19, -11, x, 19, -10, C.woodDark); v.box(x, 19, -8, x, 19, -7, C.woodDark);
          v.set(x, 20, -11, C.woodDark); v.set(x, 20, -7, C.woodDark);
        }
        // shimenawa rope with zig-zag shide papers
        v.box(-4, 12, -6, 4, 12, -6, 0xd8c27a);
        for (const x of [-3, 2]) { v.box(x, 10, -6, x, 11, -6, W); v.box(x + 1, 9, -6, x + 1, 10, -6, W); }
        // brass bell + striped rope hanging from the eave
        v.sphere(0, 12, -4, 1, BRASS);
        for (let y = 7; y <= 10; y++) v.set(0, y, -4, gloss(y % 2 ? C.red : W));
        // offering box (saisen-bako)
        v.box(-3, 3, -2, 3, 6, 0, C.wood);
        v.paint(() => {
          for (let z = -2; z <= 0; z += 2) v.box(-3, 6, z, 3, 6, z, C.woodDark);
          v.box(-3, 3, 0, 3, 3, 0, C.woodDark);
        });
        v.project(['G.G.G'], { G: GOLD }, -2, 5, '+z');
        // stone lanterns
        lantern(v, -10, 3, -3);
        lantern(v, 10, 3, -3);
        // round shrubs in the back corners
        for (const s of [-1, 1]) {
          v.ellipsoid(s * 10, 5, -10, 2.8, 2.6, 2.4, (x, y, z) => (hash(x, y, z) > 0.6 ? C.grass : C.grassDark));
        }
        // vermilion torii at the front
        for (const s of [-1, 1]) {
          v.box(s * 6, 3, 8, s * 7, 15, 9, gloss(VERM));
          v.box(s * 6, 3, 8, s * 7, 4, 9, BLACKL);
        }
        v.box(-8, 12, 8, 8, 12, 9, gloss(VERM));
        v.box(-9, 15, 8, 9, 15, 9, gloss(VERM));
        v.box(-10, 16, 8, 10, 16, 9, BLACKL);
        v.set(-10, 17, 8, BLACKL); v.set(10, 17, 8, BLACKL); v.set(-10, 17, 9, BLACKL); v.set(10, 17, 9, BLACKL);
        v.box(-1, 13, 9, 1, 14, 9, BLACKL);
        v.set(0, 13, 10, GOLD); v.set(0, 14, 10, GOLD);
      },
    },
    {
      id: 'takarabune', name: 'Golden Takarabune', jp: '黄金の宝船', rarity: 'secret',
      desc: 'The Seven Lucky Gods went on holiday and left the cargo. Finders keepers.',
      build(v) {
        // stylised gloss waves with seigaiha arcs
        const SEA = 0x2b62b8;
        v.shape(-13, 0, -6, 13, 4, 6, (x, y, z) => y <= 2 || (y === 3 && Math.sin(x * 0.9 + z * 0.6) > -0.4) || (y === 4 && Math.sin(x * 0.9 + z * 0.6) > 0.55),
          (x, y, z) => gloss(y === 4 ? 0xeef6ff : y === 3 ? 0x4c8ad8 : y === 0 ? shade(SEA, 0.7) : SEA));
        for (let x = -12; x <= 9; x += 7) v.project(['.WWW.', 'W...W'], { W: gloss(0xdde9ff) }, x, 2, '+z');
        for (let x = -9; x <= 9; x += 7) v.project(['.WWW.', 'W...W'], { W: gloss(0xdde9ff) }, x, 2, '-z');
        // golden hull with a red lacquer band and brass gunwale
        const yb = (x) => 4 + Math.round((x / 12) ** 2 * 3);
        v.shape(-12, 4, -6, 12, 9, 6, (x, y, z) => {
          if (y < yb(x)) return false;
          const zw = 5.4 * Math.sqrt(Math.max(0, 1 - (x / 13.2) ** 2));
          const t = (y - yb(x)) / Math.max(1, 9 - yb(x));
          return Math.abs(z) <= zw * (0.55 + 0.45 * t);
        }, (x, y) => (y === 9 ? GOLD_D : y === 6 || y === 7 ? gloss(RED) : y <= 5 ? GOLD_D : GOLD));
        v.paint(() => { for (let x = -10; x <= 10; x += 3) { v.box(x, 6, -6, x, 7, 6, GOLD_L); } });
        // dragon-head prow
        v.line(10, 8, 0, 13, 13, 0, GOLD, 1.3);
        v.ellipsoid(13.5, 14, 0, 2, 1.8, 1.5, GOLD);
        v.box(15, 13, -1, 16, 14, 1, GOLD);
        v.box(15, 12, -1, 16, 12, 1, GOLD_D);
        v.set(17, 13, 0, GOLD_L);
        v.set(14, 15, 1, glow(0xff4030)); v.set(14, 15, -1, glow(0xff4030));
        v.line(12, 15, 1, 11, 17, 1, GOLD_L); v.line(12, 15, -1, 11, 17, -1, GOLD_L);
        for (let i = 0; i < 4; i++) v.set(11 - i * 0.4, 12 - i, 0, gloss(VERM)); // red mane down the neck
        v.box(11, 11, 0, 11, 13, 0, gloss(VERM)); v.set(10, 10, 0, gloss(VERM)); v.set(12, 14, 0, gloss(VERM));
        v.line(16, 12, 1, 17, 10, 2, gloss(VERM)); v.line(16, 12, -1, 17, 10, -2, gloss(VERM)); // whiskers
        // stern cabin
        v.box(-12, 10, -3, -8, 12, 3, gloss(RED));
        v.box(-13, 13, -4, -7, 13, 4, GOLD);
        v.box(-12, 14, -3, -8, 14, 3, GOLD_D);
        v.project(['GKG', 'GKG'], { G: GOLD, K: BLACKL }, -11, 12, '+z');
        // mast + red sail with a gold 宝
        v.box(-1, 10, -3, -1, 29, -3, C.woodDark);
        v.box(-8, 28, -3, 6, 28, -3, C.woodDark);
        v.set(-8, 28, -3, BRASS); v.set(6, 28, -3, BRASS);
        v.shape(-7, 15, -3, 5, 27, -2, (x, y, z) => (z === -2 ? Math.abs(x + 1) <= 4 && y >= 17 && y <= 25 : true), (x, y) => (x === -7 || x === 5 || y === 15 || y === 27 ? GOLD : gloss(RED)));
        v.project([
          '....G....',
          'GGGGGGGGG',
          'G.......G',
          '..GGGGG..',
          '....G....',
          '..GGGGG..',
          '....G.G..',
          'GGGGGGGGG',
        ], { G: GOLD }, -5, 25, '+z');
        v.project(['..GGG..', '.G...G.', 'G..G..G', 'G.GGG.G', 'G..G..G', '.G...G.', '..GGG..'], { G: GOLD }, -4, 24, '-z'); // treasure-jewel crest on the back
        v.layer(['RRWW', 'RRW.', 'RR..'], { R: gloss(C.red), W: gloss(W) }, { x: 0, y: 30, z: -3 });
        v.set(-1, 30, -3, C.woodDark);
        // treasure heap: gold koban mound
        v.ellipsoid(1, 9.5, 0.5, 7, 3.5, 3.6, (x, y, z) => ((x + y + z) % 3 === 0 ? GOLD_L : (x * 3 + z) % 5 === 0 ? GOLD_D : GOLD));
        for (const [x, y, z] of [[-3, 11, 3], [3, 12, 3], [6, 11, 3], [0, 13, 2]]) {
          v.ellipsoid(x, y, z + 0.6, 1.3, 1.9, 0.5, GOLD_L);
        }
        // rice bales
        for (const [x, z] of [[-7, 1], [-6, -1]]) {
          v.cylinder(x - 2, 11, z, 1.6, 5, 0xe6cf8a, 'x');
          v.paint(() => { v.cylinder(x - 2, 11, z, 1.6, 1, 0xa5763e, 'x'); v.cylinder(x + 2, 11, z, 1.6, 1, 0xa5763e, 'x'); });
        }
        // red coral branches
        const CO = gloss(0xf0503e);
        v.line(5, 11, -1, 5, 17, -1, CO); v.line(5, 14, -1, 7, 17, -1, CO); v.line(5, 13, -1, 3, 16, -1, CO);
        v.set(7, 18, -1, CO); v.set(3, 17, -1, CO);
        // pearls / wish jewels
        v.sphere(-3, 13.5, 1, 1.3, gloss(0xfff6ef));
        v.set(-3, 15, 1, gloss(0xffe6f0));
        v.sphere(2, 14, -1, 1.2, gloss(0xa8e6ff));
        v.set(2, 15, -1, gloss(0xd8f6ff));
        // money bag
        v.ellipsoid(-4, 12, -2, 1.8, 2, 1.8, gloss(0x6a3fb0));
        v.set(-4, 14, -2, GOLD); v.set(-4, 15, -2, gloss(0x6a3fb0));
        // magic mallet (uchide no kozuchi)
        v.cylinder(7, 12.5, 3, 1.4, 4, gloss(RED), 'x');
        v.paint(() => { v.cylinder(7, 12.5, 3, 1.4, 1, GOLD, 'x'); v.cylinder(10, 12.5, 3, 1.4, 1, GOLD, 'x'); });
        v.line(8, 11, 3, 6, 9, 4, C.woodDark);
      },
    },
  ],
};
