// Oden Friends (おでんのなかま): oden pieces that are also animals, simmering together; blocky figures (src/figures).
import { beast, D } from '../../figures/chibi.js';
import { stick, cute } from '../../figures/props.js';

const BROTH = { c: 0xd8a860, m: 'glass', t: 'water' };
const pan = (k, w = 40, d = 30) => { k.box([0, 4, 0], [w, 8, d], { c: 0xb8bcc8, t: 'metal', d: [D.band('y', 2, 4, 0x8a8e98)] }, { ch: 0.15, caps: 'bot' }); k.box([0, 6.5, 0], [w - 2, 1, d - 2], BROTH, { ch: 0.15 }); };
const F = {
  daikon(k) {
    pan(k);
    k.cyl([0, 13, 0], 12, 12, { c: 0xe6c890, t: 'plush', top: 0xd8b070, d: [D.ring(0, 0, 8, 0.6, 0xc8a060, { dir: 't' }), cute({ y: 1, gap: 4.4, mouth: 'smile' })] });
    k.mirror(() => k.box([12, 10, 4], [6, 2.4, 4], { c: 0xe6c890, t: 'plush' }, { ch: 0.5, rot: [0, 0, 0.4] }));
    k.box([0, 6, -12], [8, 4, 3], { c: 0xe6c890, t: 'plush' }, { ch: 0.5, top: [1.6, 1] });
  },
  tamago(k) {
    pan(k);
    k.soft([0, 18, 0], [10, 13, 9], { c: 0xc89a5a, t: 'gloss', m: 'gloss', d: [D.ell(0, -2, 7, 8, 0xe8c48a), cute({ y: 3, gap: 3.4, mouth: 'none' }), D.poly([[-1.6, 0.6], [1.6, 0.6], [0, -1.6]], 0xf2a33a, { dir: 'f' })] }, { ch: 0.586, bev: 0.42, bs: 0.6 });
    k.mirror(() => k.box([10, 17, 0], [2.4, 9, 5], { c: 0xb8884a, t: 'gloss' }, { ch: 0.5, rot: [0, 0, 0.3] }));
    k.mirror(() => k.box([3, 6, 6], [4, 2, 5], { c: 0xf2a33a, t: 'gloss' }, { ch: 0.5 }));
  },
  chikuwa(k) {
    pan(k, 46, 30);
    k.at([0, 12, 0], [0, 0, Math.PI / 2], () => k.cyl([0, 0, 0], 7, 34, { c: 0xe8c890, t: 'crust', c2: 0xa86a2a, d: [D.band('y', -15, -13, 0xa86a2a), D.band('y', 13, 15, 0xa86a2a), D.fn('*', (c, o) => { if (Math.abs(c.y) > 16.5 && Math.hypot(c.x, c.z) < 3.6) { o[0] = 60; o[1] = 40; o[2] = 30; } })] }));
    k.at([17, 12, 2], [0, -0.6, 0], () => k.soft([0, 0, 0], [4, 3.6, 3.6], { c: 0x7a5236, t: 'fur', d: [D.ell(0, -1, 2.6, 1.6, 0xe6caa0), cute({ y: 0.8, gap: 1.6, er: 0.6, eh: 0.8, mw: 1.2, my: -1.4 })] }, { ch: 0.5 }));
    k.mirror(() => k.box([17.6, 14.6, 3], [1.4, 3, 1.4], { c: 0x7a5236, t: 'fur' }, { ch: 0.5 }));
  },
  konnyaku(k) {
    pan(k);
    stick(k, [0, 6, 0], [0, 50, 0], 1.2, { c: 0xe6c48a, t: 'wood' });
    k.box([0, 30, 1.4], [20, 14, 3], { c: 0x7a7a82, t: 'stone', d: [D.dots(1.6, 0.35, 0x3a3a40, { dir: '*' }), cute({ y: 1, gap: 3, mouth: 'smile' })] }, { ch: 0.6, rot: [0, 0, 0.78], top: [1, 1] });
    k.box([0, 19, 0.6], [2, 10, 1.6], { c: 0x7a7a82, t: 'stone' }, { ch: 0.4, top: [0.3, 1] });
  },
  kinchaku(k) {
    pan(k);
    k.soft([0, 16, 0], [11, 10, 10], { c: 0xd8a050, t: 'crust', c2: 0xa86a2a, d: [D.ell(0, 0, 6, 5, 0xf2d8a8, { dir: 'f' }), cute({ y: 1, gap: 3, mouth: 'cat' })] }, { ch: 0.586, bev: 0.4, bs: 0.65 });
    k.box([0, 27, 0], [10, 3, 9], { c: 0xd8a050, t: 'crust' }, { ch: 0.5, top: [1.6, 1.5] });
    k.cyl([0, 25.6, 0], 5, 1.4, { c: 0x6a9a3a, t: 'cloth' });
    k.mirror(() => k.box([6, 31, 0], [3, 3, 2], { c: 0xd8a050, t: 'fur', d: [D.circ(0, 0, 1, 0xf4a8b0, { dir: 'f' })] }, { ch: 0.5 }));
    k.soft([0, 7, 9], [4, 2, 3], { c: 0xfbf8f0, t: 'plush' }, { ch: 0.586 });
  },
  nabe(k) {
    k.box([0, 9, 0], [56, 18, 40], { c: 0xb8bcc8, t: 'metal', d: [D.band('y', 6, 9, 0x8a8e98)] }, { ch: 0.15, caps: 'bot' });
    k.box([0, 16, 0], [54, 1, 38], BROTH, { ch: 0.15 });
    k.box([0, 15, 0], [1.4, 4, 38], { c: 0xb8bcc8, m: 'metal' }); k.box([0, 15, 0], [54, 4, 1.4], { c: 0xb8bcc8, m: 'metal' });
    k.cyl([-14, 20, -10], 7, 8, { c: 0xe6c890, t: 'plush', top: 0xd8b070 });
    k.soft([12, 21, -10], [5, 6, 5], { c: 0xc89a5a, t: 'gloss' }, { ch: 0.586 });
    k.box([-14, 19, 10], [12, 6, 4], { c: 0x7a7a82, t: 'stone', d: [D.dots(1.6, 0.35, 0x3a3a40)] }, { ch: 0.3, rot: [0, 0.4, 0] });
    k.at([14, 16, 10], [0, 0, 0], () => { k.soft([0, 5, 0], [8, 6, 7], { c: 0xf2f0ea, t: 'plush', d: [cute({ eye: 'closed', y: 1, gap: 3, mouth: 'cat' })] }, { ch: 0.5 }); k.box([0, 11.6, 0], [10, 2, 7], { c: 0xffffff, t: 'cloth', d: [D.stripes('x', 2.4, 0.7, 0xe86a6a)] }, { ch: 0.45 }); });
  },
};

export default {
  id: 'oden',
  order: 11,
  name: 'Oden Friends',
  jp: 'おでんぶつ',
  romaji: 'ODENBUTSU',
  tagline: 'Simmered since this morning',
  taglineJp: 'あさから、ぐつぐつ。',
  price: 400,
  themes: ['food', 'cute', 'weird'],
  card: { bg: '#f6ecd6', accent: '#b8783e', text: '#3a2a20', accent2: '#3a4f8a', pattern: 'checker' },
  capsule: { colors: [0xf6f3ea, 0xd9a24a, 0x3a4f8a, 0xc89a4a], style: 'paper' },
  flyer: {
    maker: 'manpuku', scene: 'oden', hero: 'kinchaku', side: ['konnyaku', 'chikuwa'],
    title: [['おでん', 4, 'a'], ['ぶつ', 4, 'b']],
    catch: 'あさから、ぐつぐつ。', sub: 'からしつき', gimmick: 'きんちゃくがひらく！',
  },
  items: [
    {
      id: 'daikon', name: 'Daikon Seal', jp: 'だいこんアザラシ', jpLines: ['だいこん', 'アザラシ'], rarity: 'common',
      desc: 'Soaked through. Exactly as planned.',
      fig: F.daikon, gimmick: { text: 'Nod its head' },
    },
    {
      id: 'tamago', name: 'Egg Penguin', jp: 'たまごペンギン', jpLines: ['たまご', 'ペンギン'], rarity: 'common',
      desc: 'Hard-boiled, in every sense.',
      fig: F.tamago, gimmick: { text: 'Wave' },
    },
    {
      id: 'chikuwa', name: 'Chikuwa Otter', jp: 'ちくわカワウソ', jpLines: ['ちくわ', 'カワウソ'], rarity: 'uncommon',
      desc: 'Lives in the hole. The hole is the best bit, it says.',
      fig: F.chikuwa, gimmick: { text: 'Slide it out' },
    },
    {
      id: 'konnyaku', name: 'Konnyaku Ray', jp: 'こんにゃくエイ', jpLines: ['こんにゃく', 'エイ'], rarity: 'rare',
      desc: 'Zero calories. Glides up the skewer when nobody is eating.',
      fig: F.konnyaku, gimmick: { text: 'Flap the fins' },
    },
    {
      id: 'kinchaku', name: 'Kinchaku Hamster', jp: 'きんちゃくハムスター', jpLines: ['きんちゃく', 'ハムスター'], rarity: 'ultra',
      desc: 'Keeps a rice cake in its pouch for later. Later never comes.',
      fig: F.kinchaku, gimmick: { text: 'Open the pouch' },
    },
    {
      id: 'nabe', name: 'The Oden Pot', jp: 'おでんなべ', rarity: 'secret',
      desc: 'One compartment is not for sale. It has a towel on its head.',
      fig: F.nabe, gimmick: { text: 'Dunk the cat' },
    },
  ],
};
