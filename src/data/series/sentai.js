// Series 16 — Capsule Sentai Kapuranger (カプセル戦隊カプレンジャー)
// Tiny chibi henshin heroes, one very loyal grunt, a five-colour explosion and the giant combining robot.
// Capsule Sentai Kapuranger: chibi heroes in the human style (src/figures/chibi.js), helmets and suits painted.
import { chibi, D, SD, shape } from '../../figures/chibi.js';

const W = 0xfaf8f2, K = 0x1c1a22, GOLD = 0xf2c23a;
/** A Kapuranger helmet head: suit colour, black visor with a silver rim, white crest stripe. */
const helmet = (col, visor = 'band', crest = W) => (H, S) => ({ c: col, m: 'gloss', t: 'gloss', d: [
  visor === 'heart' ? D.heart(0, -1.5, 8.5, K, { ink: 0xd8d8e0, iw: 0.6 }) : visor === 'goggle' ? [D.ell(-6, -1, 4.6, 3.6, 0x30e0f0, { ink: K, iw: 1 }), D.ell(6, -1, 4.6, 3.6, 0x30e0f0, { ink: K, iw: 1 })]
    : D.poly([[-13, 3], [13, 3], [11, -5], [3, -6], [0, -9], [-3, -6], [-11, -5]], K, { ink: 0xd8d8e0, iw: 0.6 }),
  visor === 'band' ? D.ell(-6, -1.4, 2.6, 1.2, 0x5a6a8a) : null,
  D.rect(-2, 4, 2, 14, crest, { dir: 'f' }), D.rect(-2, -14, 2, 14, crest, { dir: 't' }), D.rect(-2, -14, 2, 14, crest, { dir: 'b' }),
  D.rect(-4, -12, 4, -10, 0xd8d8e0), D.rect(-5, -13.4, 5, -12.4, 0x8a8a96),
] });
/** The suit: white chest V, capsule belt buckle, the team mark. */
const suit = (col, mark) => ({ c: col, t: 'gloss', m: 'gloss', d: [
  D.poly([[-8.6, 7], [8.6, 7], [0, -1.5]], W, { ink: 0xbdbdc8, iw: 0.3 }), D.poly([[-8.6, 7], [-6, 7], [0, 1], [6, 7], [8.6, 7], [0, -1.5]], GOLD),
  D.band('y', -7, -4.6, K), D.circ(0, -5.8, 2, W, { ink: 0x8a8a96, iw: 0.3 }), D.ell(0, -5.2, 1.6, 0.8, col),
  mark ? D.txt(mark, 3.8, 2.2, 3, col, { dir: 'f' }) : null,
] });
const hero = (k, col, o) => chibi(k, { hair: 'bald', headP: helmet(col, o.visor), top: suit(col), sleeve: { c: col, t: 'gloss', m: 'gloss', d: [D.band('y', -5, -3.6, W)] },
  bottom: { c: col, t: 'gloss', m: 'gloss' }, gloves: { c: W, t: 'gloss' }, shoes: W, sole: 0xc8c8d0, ...o });

const F = {
  red(k) { hero(k, 0xe0302a, { armR: [150, 20, 10], armL: [10, 30, 90], legL: [-12, 8], legR: [14, 6], head: [-6, 0, 6] }); },
  blue(k) {
    hero(k, 0x2a64d8, { armL: [80, 4, 10], armR: [40, -6, 70], head: [0, 12, 0], holdL(k) {
      k.box([0, -3, 3], [3.6, 7, 3.6], { c: 0x3a3a44, t: 'gloss' }, { ch: 0.3 });
      k.box([0, -2, 9], [4.4, 5, 13], { c: 0xe8e8ee, t: 'gloss', d: [D.band('z', 2, 3.4, 0x2a64d8)] }, { ch: 0.3 });
      k.box([0, -2, 17], [3, 3, 4], { c: 0x8ae0ff, m: 'glow' }, { ch: 0.4 });
    } });
  },
  yellow(k) {
    hero(k, 0xf2c018, { wide: 1.12, armL: [70, 10, 40], armR: [60, -10, 80], head: [10, 0, 0], holdL(k) {
      // a plate of curry rice
      k.cyl([0, -2.5, 4], 7, 1.6, { c: W, t: 'ceramic', top: W, d: [D.circ(0, 0, 5.6, 0xfaf6ea, { dir: 't' }), D.ell(2, 0.5, 3.8, 3.6, 0xb8701a, { dir: 't' })] }, { rot: [-1.2, 0, 0] });
    }, holdR(k) { k.box([0, -3, 2], [1, 8, 1.4], { c: 0xd0d0d8, m: 'metal' }, { ch: 0.3 }); } });
  },
  pink(k) {
    hero(k, 0xf06aa8, { visor: 'heart', legs: 'skirt', bottom: { c: 0xf06aa8, t: 'gloss', d: [D.band('y', 0, 0.8, W)] }, armR: [160, -10, 0], armL: [20, 25, 0], legL: [0, 6], legR: [24, 0], head: [0, -8, -8],
      holdR(k) { k.box([0, 4, 0], [1.6, 12, 1.6], { c: W, t: 'gloss' }, { ch: 0.4 }); k.box([0, 12, 0], [7, 6, 2.4], { c: 0xff4a8a, t: 'gloss', d: [D.heart(0, 0, 2.6, 0xffc2da)] }, { ch: 0.5, rot: [0, 0, 0] }); } });
  },
  grunt(k) {
    chibi(k, { hair: 'bald', headP: { c: 0x26222e, t: 'cloth', d: [D.rect(-11, -3, 11, 2, 0xf2c23a, { ink: K }), D.rect(-8, -2, -2, 1, 0xe03030), D.rect(2, -2, 8, 1, 0xe03030), D.txt('イー', 0, -9, 4, 0x8a5ad8)] },
      top: { c: 0x26222e, t: 'cloth', d: [D.path([[-8, 6], [-3, -6]], 1.2, 0x8a5ad8), D.path([[8, 6], [3, -6]], 1.2, 0x8a5ad8), D.band('y', -7, -5, 0x8a5ad8)] },
      sleeve: { c: 0x26222e, t: 'cloth' }, bottom: { c: 0x26222e, t: 'cloth' }, gloves: { c: 0x3a3442 }, shoes: 0x1a1820,
      armL: [100, 30, 40], armR: [100, -30, 40], legL: [0, 14], legR: [0, 14], lean: 8,
      onHead(k, H) { k.box([0, H.hy + H.hh + 3, 0], [3, 7, 3], { c: 0x8a5ad8 }, { ch: 0.4, top: [0.3, 0.3], rot: [0, 0, 0.3] }); } });
  },
  bakuhatsu(k) {
    // the transformation pose in front of a five-colour quarry explosion
    k.box([0, 2, -4], [56, 4, 30], { c: 0xb8a888, t: 'stone', top: 0xc8b898 }, { ch: 0.3 });
    const puff = [[0xe0302a, -16, 30], [0x2a64d8, -6, 42], [0xf2c018, 8, 44], [0xf06aa8, 18, 30], [0x3ab84a, 0, 26]];
    for (const [c, x, y] of puff) k.soft([x, y, -15], [9, 8, 6], { c, t: 'plush', d: [D.ell(-2, 2, 4, 3, 0xffffff, { alpha: 0.35, dir: 'f' })] }, { ch: 0.55 });
    k.at([0, 4, 2], [0, 0, 0], () => hero(k, 0xe0302a, { H: 52, armR: [90, -60, 90], armL: [40, 80, 40], legL: [-10, 22], legR: [10, 18] }));
  },
  robo(k) {
    // Gattai Robo Kapu-Oh: a blocky robot of five capsule machines, crest and chest plate, fists
    const B = 0x2a64d8, Rd = 0xe0302a, Y = 0xf2c018, G = 0xb8bcc8, T = 'gloss';
    k.box([0, 2, 0], [46, 4, 30], { c: 0x2a2a34, t: 'metal', d: [D.stripes('d', 6, 3, 0xf2c018, { dir: 'f' })] }, { ch: 0.2 });
    k.mirror(() => { k.box([7, 14, 0], [10, 20, 12], { c: W, t: T, d: [D.rect(-3, -4, 3, 4, B, { r: 1 })] }, { ch: 0.25 }); k.box([7, 6, 2], [12, 8, 16], { c: B, t: T }, { ch: 0.3 }); });
    k.box([0, 28, 0], [26, 10, 16], { c: 0x3a3a46, t: 'metal' }, { ch: 0.25 });
    k.box([0, 42, 0], [32, 20, 18], { c: Rd, t: T, d: [D.poly([[-12, 8], [12, 8], [0, -6]], Y, { ink: 0x8a6a10 }), D.circ(0, 3, 4, W, { ink: K }), D.txt('K', 0, 3, 5, Rd), D.rect(-14, -8, 14, -6, G)] }, { ch: 0.25, top: [1.08, 1] });
    k.mirror(() => { k.at([20, 48, 0], [0, 0, 0.3], () => { k.box([0, 0, 0], [11, 11, 12], { c: B, t: T }, { ch: 0.3 }); k.box([1, -11, 0], [8, 12, 9], { c: G, t: 'metal' }, { ch: 0.25 }); k.box([1, -20, 1], [10, 8, 10], { c: Y, t: T, d: [D.stripes('x', 2.5, 0.6, 0x8a6a10, { dir: 'f' })] }, { ch: 0.35 }); }); });
    k.box([0, 58, 0], [16, 13, 14], { c: W, t: T, d: [D.rect(-6, -2, 6, 3, 0x30e0f0, { ink: K, iw: 0.6 }), D.rect(-3, -5, 3, -4, K)] }, { ch: 0.3, dens: 1.2 });
    k.mirror(() => k.box([5, 68, 2], [3, 9, 3], { c: Y, t: T }, { ch: 0.3, rot: [0, 0, -0.5], top: [0.4, 0.6] }));
    k.box([0, 66, 6], [6, 4, 3], { c: Rd, t: T }, { ch: 0.4 });
  },
  break(k) {
    // the suit actor between takes: suit on, helmet off beside him, towel round the neck, canned coffee, folding chair
    const M = { c: 0x8a8a92, m: 'metal', t: 'metal' };
    k.box([0, 15, 0], [24, 2, 20], { c: 0x3a6ac8, t: 'cloth' }, { ch: 0.2 });
    k.mirror(() => { k.box([10, 7.5, 8], [1.6, 15, 1.6], M, { rot: [0.25, 0, 0] }); k.box([10, 7.5, -8], [1.6, 15, 1.6], M, { rot: [-0.25, 0, 0] }); k.box([10, 25, -9], [1.6, 22, 1.6], M); });
    k.box([0, 30, -10], [22, 10, 1.6], { c: 0x3a6ac8, t: 'cloth' }, { ch: 0.2 });
    k.at([0, 14.6, 0], [0, 0, 0], () => chibi(k, { sit: true, top: suit(0xe0302a), sleeve: { c: 0xe0302a, t: 'gloss', m: 'gloss' }, bottom: { c: 0xe0302a, t: 'gloss', m: 'gloss' }, gloves: { c: W }, shoes: W,
      hair: 'short', hairC: 0x1e1a1a, face: { eye: 'line', mouth: 'wavy', brow: 'sad', blush: false, nose: 'line' }, faceD: [D.circ(9, 3, 0.9, 0x9fd8ff), D.circ(-10, 6, 0.7, 0x9fd8ff)], legL: [80, 6], legR: [80, -6],
      armR: [70, -4, 70], armL: [0, 12, 0], head: [12, -8, 0],
      onBody(k, T) { k.box([0, T.hh + 1, 1], [T.hw * 2 + 2, 2.4, T.hd * 2 + 2], { c: W, t: 'cloth', d: [D.stripes('x', 3, 1, 0x7ab8e8)] }, { ch: 0.4 }); k.mirror(() => k.box([5, T.hh - 4, T.hd + 0.6], [3, 9, 1.6], { c: W, t: 'cloth', d: [D.stripes('y', 3, 1, 0x7ab8e8)] }, { ch: 0.4 })); },
      holdR(k) { k.cyl([0, -2, 2.6], 2.2, 6, { c: 0x6a3a1e, t: 'tin', d: [D.band('y', -1, 1, 0xf2c23a), D.band('y', 2.6, 3, 0xd0d0d8)] }); } }));
    // the helmet, off and resting on the ground beside the chair
    k.at([20, 0, 6], [0, -0.6, 0.15], () => { k.box([0, 12, 0], [24, 22, 22], helmet(0xe0302a)(null, 1), { ch: 0.36, top: [0.96, 0.95] }); });
  },
};

export default {
  id: 'sentai',
  order: 16,
  name: 'Capsule Sentai Kapuranger',
  jp: 'カプセル戦隊カプレンジャー',
  tagline: 'Tiny henshin heroes, assemble!',
  taglineJp: '変身！ちびっこヒーロー参上！',
  price: 500,
  themes: ['city', 'weird'],
  card: { bg: '#fff4d6', accent: '#e8343a', text: '#1e1e3a', accent2: '#2f6fd6', pattern: 'stars' },
  capsule: { colors: [0xe8343a, 0x2f6fd6, 0xffc21f, 0xff7ab0, 0x3cbf5a] },
  items: [
    {
      id: 'red', name: 'Kapu Red', jp: 'カプレッド', rarity: 'common',
      desc: 'The leader. Shouts his own name before every sentence, including "good morning".',
      fig: F.red,
    },
    {
      id: 'blue', name: 'Kapu Blue', jp: 'カプブルー', rarity: 'common',
      desc: 'Cool, calm, and secretly practises the team pose alone in the mirror.',
      fig: F.blue,
    },
    {
      id: 'yellow', name: 'Kapu Yellow', jp: 'カプイエロー', rarity: 'common',
      desc: 'Has eaten curry before every single battle since episode one. Undefeated.',
      fig: F.yellow,
    },
    {
      id: 'pink', name: 'Kapu Pink', jp: 'カプピンク', rarity: 'uncommon',
      desc: 'Heart visor, heart baton, heart of steel. Has suplexed a kaiju. Twice.',
      fig: F.pink,
    },
    {
      id: 'grunt', name: 'Combatant Grunt', jp: '戦闘員', rarity: 'uncommon',
      desc: 'Answers everything with "Iii!". Including his job interview. He got the job.',
      fig: F.grunt,
    },
    {
      id: 'bakuhatsu', name: 'Five-Colour Explosion', jp: '変身ポーズ大爆発', rarity: 'rare',
      desc: 'The quarry explodes in five colours behind him. Insurance stopped calling years ago.',
      fig: F.bakuhatsu,
    },
    {
      id: 'robo', name: 'Gattai Robo Kapu-Oh', jp: '合体ロボ カプオー', rarity: 'ultra',
      desc: 'Five capsule machines combine into one robot. It takes eight minutes. Kaiju wait politely.',
      fig: F.robo,
    },
    {
      id: 'break', name: 'Suit Actor on Break', jp: 'スーツアクターの休憩', rarity: 'secret',
      desc: 'Between takes. Canned coffee, a towel, a sigh. Please do not tell the children.',
      fig: F.break,
    },
  ],
};
