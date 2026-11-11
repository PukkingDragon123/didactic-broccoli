// Stationery Zoo (ぶんぐどうぶつえん): school supplies that are also animals, as blocky figures with printed detail.
import { beast, D } from '../../figures/chibi.js';
import { stick, cute } from '../../figures/props.js';

const desk = (k) => k.box([0, 1.5, 0], [44, 3, 30], { c: 0xc8965a, t: 'wood', ga: 'x' }, { ch: 0.2 });
const F = {
  eraser(k) {
    desk(k);
    k.box([0, 10, 0], [36, 14, 18], { c: 0xf6f6f2, t: 'felt', d: [D.rect(-18, -7, 4, 7, 0x2a5ac8, { dir: 'f' }), D.txt('MONO', -7, 0, 3, 0xffffff), D.stripes('x', 30, 0, 0)] }, { ch: 0.25 });
    k.soft([13, 22, 2], [7, 6, 6], { c: 0xc8d0d8, t: 'felt', d: [cute({ y: 0, gap: 2.6, er: 0.9, eh: 1.2, mouth: 'cat', mw: 1.6, my: -2 }), D.whiskers(0, -1.6, 2.4, { gap: 1.6 })] }, { ch: 0.5 });
    k.box([-16, 18, 0], [6, 2, 10], { c: 0xc8d0d8, t: 'felt' }, { ch: 0.5, rot: [0, 0, 0.4] });
    for (let i = 0; i < 4; i++) k.box([-6 + i * 4, 3.6, 12], [2.4, 1, 1.4], { c: 0xc8c8cc }, { ch: 0.5, rot: [0, i, 0] });
  },
  tape(k) {
    desk(k);
    k.box([0, 6, 2], [30, 6, 12], { c: 0x8ac04a, t: 'gloss', d: [D.stripes('x', 3, 0.4, 0x6aa03a)] }, { ch: 0.5, top: [0.9, 0.8] });
    k.at([-4, 20, 0], [0, 0, 0], () => { k.cyl([0, 0, 0], 12, 9, { c: 0xe6c88a, m: 'glass', t: 'glass', d: [D.ring(0, 0, 9, 0.6, 0xc8a868, { dir: 't' })] }, { rot: [Math.PI / 2, 0, 0], pf: true }); k.cyl([0, 0, 0], 6, 9.4, { c: 0xf2ecd8, t: 'paper' }, { rot: [Math.PI / 2, 0, 0] }); });
    k.soft([14, 14, 4], [5, 6, 5], { c: 0x8ac04a, t: 'gloss', d: [cute({ y: 1, gap: 2, er: 0.8, eh: 1, mw: 1.4, my: -1.6 })] }, { ch: 0.5 });
    k.mirror(() => stick(k, [2, 18, 4], [3, 24, 4], 0.8, { c: 0x8ac04a }));
  },
  stapler(k) {
    desk(k);
    k.box([0, 5, 0], [40, 4, 12], { c: 0x3a3a44, t: 'gloss' }, { ch: 0.3 });
    k.at([-18, 7, 0], [0, 0, 0.18], () => { k.box([20, 5, 0], [40, 7, 11], { c: 0x6a8aa8, t: 'gloss', m: 'gloss', d: [D.fn('*', (c, o) => { if (c.y < -1) { o[0] = 236; o[1] = 240; o[2] = 244; } }), D.circ(30, 1, 1.2, 0x1a1a1a, { dir: 'f' }), D.circ(30, 1, 1.2, 0x1a1a1a, { dir: 'b' })] }, { ch: 0.35, top: [1, 0.8] }); k.box([22, 12, 0], [8, 8, 2], { c: 0x6a8aa8, t: 'gloss' }, { ch: 0.4, top: [0.3, 1], sh: [-3, 0] }); });
    k.box([-22, 10, 0], [4, 10, 2], { c: 0x6a8aa8, t: 'gloss' }, { ch: 0.4, top: [1.6, 1] });
    for (let i = 0; i < 4; i++) k.box([16 + i * 1.4, 6.6, 0], [0.6, 1.4, 6], { c: 0xffffff }, { ch: 0 });
  },
  sharpener(k) {
    desk(k);
    k.soft([0, 13, 0], [14, 11, 11], { c: 0xc8945a, t: 'fur', d: [D.ell(0, -2, 8, 7, 0xf2d8b0, { dir: 'f' }), cute({ y: 0, gap: 3.6, mouth: 'cat' }), D.ell(0, -2.6, 1.2, 0.9, 0x2a1c1c)] }, { flat: true, ch: 0.5, bev: 0.4 });
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI - Math.PI / 2, b = (i % 3) * 0.3; k.at([Math.sin(a) * 9, 18 + Math.cos(a) * 4, -4 - b * 6], [-0.8 - b, 0, -a * 0.6], () => { k.box([0, 6, 0], [2.6, 12, 2.6], { c: [0xf2c84a, 0x4a8ad8, 0xd8302a, 0x3a9a4a][i % 4], t: 'gloss' }, { ch: 0.4 }); k.box([0, 13, 0], [2.6, 3, 2.6], { c: 0xf2d8a8, t: 'wood' }, { ch: 0.4, top: [0.2, 0.2] }); }); }
    k.box([0, 4, 10], [8, 4, 2], { c: 0xd8dae0, m: 'metal' }, { ch: 0.3 });
  },
  compass(k) {
    desk(k);
    k.box([-8, 3.2, 4], [14, 0.4, 14], { c: 0xfbf8f0, t: 'paper', d: [D.ring(0, 0, 5.6, 0.4, 0x2a2a30, { dir: 't' })] }, { ch: 0 });
    stick(k, [0, 3, 0], [2, 30, -2], 1.4, { c: 0xd8dae0, m: 'metal' });
    stick(k, [-8, 3.4, 4], [2, 30, -2], 1.4, { c: 0xd8dae0, m: 'metal' });
    k.soft([2, 36, -2], [8, 7, 7], { c: 0xf6a0b8, t: 'feather', d: [cute({ y: 1, gap: 2.6, mouth: 'none' })] }, { ch: 0.5 });
    k.at([2, 42, 0], [0.3, 0, 0], () => { k.box([0, 6, 0], [3, 12, 3], { c: 0xf6a0b8, t: 'feather' }, { ch: 0.5 }); k.soft([0, 14, 2], [4, 3.6, 4], { c: 0xf6a0b8, t: 'feather', d: [D.circ(-1.6, 0.6, 0.6, 0x1a1a1a, { dir: 'f' })] }, { ch: 0.5 }); k.box([0, 13, 7], [2, 2, 5], { c: 0x2a2a30 }, { ch: 0.4, top: [0.5, 1], rot: [0.6, 0, 0] }); });
    k.mirror(() => k.box([7, 36, -4], [4, 8, 8], { c: 0xf088a8, t: 'feather' }, { ch: 0.5, rot: [0, 0, -0.3] }));
  },
  abacus(k) {
    desk(k);
    k.box([0, 6, -2], [44, 2.4, 6], { c: 0x6a4428, t: 'wood', ga: 'x' }, { ch: 0.3 });
    k.box([0, 22, -2], [44, 2.4, 6], { c: 0x6a4428, t: 'wood', ga: 'x' }, { ch: 0.3 });
    for (let i = 0; i < 5; i++) {
      const x = -16 + i * 8;
      stick(k, [x, 6, -2], [x, 22, -2], 0.8, { c: 0xd8dae0, m: 'metal' });
      k.soft([x, 12 + (i % 2) * 2, -2], [3.6, 2.4, 3.6], { c: i === 4 ? 0x8ac04a : 0x6ab83a, t: 'gloss', m: 'gloss', d: i === 4 ? [cute({ y: 0, gap: 1.4, er: 0.5, eh: 0.7, mw: 1, my: -1.2, blush: false })] : null }, { ch: 0.586 });
    }
    k.mirror(() => stick(k, [16, 15, 0], [17, 19, 1], 0.6, { c: 0x2a2a30 }));
  },
};

export default {
  id: 'bungu',
  order: 4,
  name: 'Stationery Zoo',
  jp: 'ぶんぐどうぶつ',
  romaji: 'BUNGU DOUBUTSU',
  tagline: 'Everything in the pencil case has a pulse',
  taglineJp: 'つくえの中は、どうぶつえん。',
  price: 300,
  themes: ['home', 'retro', 'cute'],
  card: { bg: '#f4efe0', accent: '#3f6fb8', text: '#2c3442', accent2: '#f2c23a', pattern: 'grid' },
  capsule: { colors: [0x3f6fb8, 0xf2c23a, 0x6cc0b0, 0xf2a0a8, 0xf6f4ee], style: 'tab' },
  flyer: {
    maker: 'hoshimaru', scene: 'desk', hero: 'compass', side: ['sharpener', 'tape'],
    title: [['ぶんぐ', 4, 'b'], ['どうぶつ', 2, 'a']],
    catch: 'つくえの中は、どうぶつえん。', sub: 'ほんとに動くギミックつき', gimmick: 'ハンドルがまわる！',
  },
  items: [
    {
      id: 'eraser', name: 'Eraser Seal', jp: 'けしゴムアザラシ', jpLines: ['けしゴム', 'アザラシ'], rarity: 'common',
      desc: 'Rubs out mistakes. Has never made one, it says.',
      fig: F.eraser, gimmick: { text: 'Slide the sleeve off' },
    },
    {
      id: 'tape', name: 'Tape Snail', jp: 'セロテープかたつむり', jpLines: ['セロテープ', 'かたつむり'], rarity: 'common',
      desc: 'Carries a whole roll on its back. Sticks to the plan.',
      fig: F.tape, gimmick: { text: 'Turn the roll' },
    },
    {
      id: 'stapler', name: 'Stapler Shark', jp: 'ホチキスザメ', jpLines: ['ホチキス', 'ザメ'], rarity: 'uncommon',
      desc: 'Twenty sheets in one bite. Mostly homework.',
      fig: F.stapler, gimmick: { text: 'Open the jaw' },
    },
    {
      id: 'sharpener', name: 'Sharpener Hedgehog', jp: 'えんぴつけずりハリネズミ', jpLines: ['えんぴつけずり', 'ハリネズミ'], rarity: 'rare',
      desc: 'Every pencil in the class ends up in its back eventually.',
      fig: F.sharpener, gimmick: { text: 'Turn the crank' },
    },
    {
      id: 'compass', name: 'Compass Flamingo', jp: 'コンパスフラミンゴ', jpLines: ['コンパス', 'フラミンゴ'], rarity: 'ultra',
      desc: 'Stands on one leg, draws with the other. The circles are perfect. The bird is unbearable about it.',
      fig: F.compass, gimmick: { text: 'Open the legs' },
    },
    {
      id: 'abacus', name: 'Abacus Caterpillar', jp: 'そろばんいもむし', jpLines: ['そろばん', 'いもむし'], rarity: 'secret',
      desc: 'Adds itself up to five. Will be a butterfly in the next column.',
      fig: F.abacus, gimmick: { text: 'Look round' },
    },
  ],
};
