// Series 9 — Dajare Daisakusen (ダジャレ大作戦)
// Japanese pun dioramas ("oyaji gags"). Each figure acts out its own terrible joke.
// Dajare Daisakusen: Japanese puns acted out by blocky figures; each base carries its pun (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, cute, sign, WOOD, LIGHTWOOD, WHITE } from '../../figures/props.js';

const plinth = (k, word, w = 50, d = 30, c = 0xf2c23a) => k.box([0, 2.5, 0], [w, 5, d], { c, t: 'gloss', d: [D.txt(word, 0, 0, 3, 0x2a1c1c)] }, { ch: 0.3 });
const F = {
  mikan(k) {
    plinth(k, 'アルミかんのうえにあるミカン', 44, 30);
    k.cyl([0, 20, 0], 10, 30, { c: 0xd8d8de, t: 'tin', d: [D.band('y', 2, 9, 0x3a8ae8), D.txt('ALUMI', 0, 5.4, 3, 0xffffff), D.txt('ALUMI', 0, 5.4, 3, 0xffffff, { dir: 'b' })] }, {});
    k.cyl([0, 35.5, 0], 8, 1, { c: 0xc8c8d0, m: 'metal', d: [D.ell(0, -4, 2.6, 1.4, 0x8a8a92, { dir: 't' })] });
    k.soft([0, 44, 0], [10, 8, 10], { c: 0xf28a1a, t: 'crust', c2: 0xd86a10, d: [cute({ y: 1, gap: 4, mouth: 'smile' })] }, { ch: 0.586, bev: 0.4, bs: 0.65 });
    k.box([1, 52.6, 0], [5, 1, 2.6], 0x3f8a2e, { ch: 0.5, rot: [0, 0, 0.3] });
  },
  neko(k) {
    plinth(k, 'ネコがねころんだ', 54, 30, 0xf2a0b8);
    k.at([0, 5, 0], [0, 0, 0], () => {
      k.soft([0, 7, 0], [20, 7, 9], { c: 0xf2f0ea, t: 'fur', d: [D.ell(-10, 4, 6, 4, 0xe8893a, { dir: '*' }), D.ell(8, 2, 5, 4, 0x3a3230, { dir: '*' }), D.ell(0, -2, 10, 3, 0xffffff, { dir: 'f' })] }, { flat: true, ch: 0.5, bev: 0.45 });
      k.at([20, 8, 0], [0, 0, -0.3], () => k.soft([0, 0, 0], [8, 7, 7.6], { c: 0xf2f0ea, t: 'fur', d: [cute({ eye: 'closed', gap: 3.2, mouth: 'cat', y: 0 }), D.whiskers(0, -2, 3, { gap: 2 })] }, { ch: 0.5, bev: 0.4 }));
      k.mirror(() => k.box([23, 16, 2.6], [3, 4, 2], { c: 0xf2f0ea, t: 'fur', d: [D.poly([[-1, -1.6], [1, -1.6], [0, 1.4]], 0xf4a8b0, { dir: 'f' })] }, { ch: 0.2, top: [0.2, 0.6] }));
      k.box([-23, 8, 0], [12, 3, 3], { c: 0xe8893a, t: 'fur' }, { ch: 0.5, rot: [0, 0, 0.4] });
      k.mirror(() => k.box([10, 1.6, 6], [5, 3, 4], { c: 0xffffff, t: 'fur' }, { ch: 0.5 }));
    });
  },
  kaeru(k) {
    plinth(k, 'カエルがかえる', 50, 30, 0x8ad86a);
    k.at([0, 5, 0], [0, 0, 0], () => chibi(k, { H: 54, animal: { c: 0x6ab84a, ears: 'none', mask: false, d: [D.ell(0, -8, 10, 4, 0xf2f0c8)] }, face: { eye: 'dot', mouth: 'smile', mw: 6, y: 3, gap: 7 },
      top: { c: 0x3a3a44, t: 'cloth' }, outfit: { kind: 'suit', tie: 0xc8302a }, sleeve: { c: 0x3a3a44, t: 'cloth' }, bottom: { c: 0x3a3a44, t: 'cloth' }, gloves: { c: 0x6ab84a }, shoes: 0x2a1a14,
      armR: [20, -10, 30], armL: [140, 20, 0], legL: [-16, 4], legR: [16, 4], holdR(k) { k.box([0, -4, 2], [10, 7, 3], { c: 0x2a1a14, t: 'gloss' }, { ch: 0.2 }); },
      onHead(k, H) { k.mirror(() => k.soft([H.hw * 0.5, H.hy + H.hh, 3], [4.4, 3.4, 4.4], { c: 0x6ab84a, t: 'gloss', d: [D.circ(0, 0, 2.4, 0xfbfbf2), D.circ(0, -0.3, 1.2, 0x1a1a1a)] }, { ch: 0.586 })); } }));
  },
  tako(k) {
    plinth(k, 'タコがタコをあげる', 50, 30, 0x7ac8f0);
    k.at([-8, 5, 0], [0, 0, 0], () => {
      k.soft([0, 18, 0], [10, 10, 9], { c: 0xe8503a, t: 'gloss', d: [cute({ y: -1, gap: 4, mouth: 'o', mw: 2 }), D.dots(3, 0.6, 0xf28a6a, { dir: 't' })] }, { ch: 0.5, bev: 0.4 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.box([Math.cos(a) * 8, 4, Math.sin(a) * 7], [3.4, 8, 3], { c: 0xe8503a, t: 'gloss', d: [D.dots(1.4, 0.4, 0xf6c8b8, { dir: '*' })] }, { ch: 0.5, rot: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] }); }
    });
    stick(k, [-2, 18, 4], [16, 54, 0], 0.3, { c: 0xffffff });
    k.at([18, 56, 0], [0, 0, 0.3], () => { k.box([0, 0, 0], [16, 20, 0.8], { c: 0xf4efe4, t: 'paper', d: [D.txt('凧', 0, 1, 10, 0xd8302a), D.rect(-8, -10, 8, 10, null, { ink: 0x2a1c1c, iw: 0.6 })] }, { ch: 0 }); for (let i = 0; i < 3; i++) k.box([0, -12 - i * 4, 0], [3, 3, 0.6], { c: [0xd8302a, 0xf2c23a, 0x3a8ae8][i] }, { ch: 0.2, rot: [0, 0, 0.8] }); });
  },
  ika(k) {
    k.box([0, 2, 0], [60, 4, 34], { c: 0x5ab8e8, m: 'glass', t: 'water' }, { ch: 0.3 });
    for (let i = 0; i < 5; i++) k.cyl([-16 + i * 8, 7, 0], 3.6, 26, { c: 0xc8a060, t: 'wood', d: [D.band('y', 6, 7.6, 0x8a6a3a), D.band('y', -7.6, -6, 0x8a6a3a)] }, { rot: [Math.PI / 2, 0, 0] });
    k.at([0, 10, 0], [0, 0, 0], () => {
      k.prism([[0, 6, 5, 0, 0, 0.5], [16, 6.4, 5.4, 0, 0, 0.5], [24, 1, 1, 0, 0, 0.5]], { c: 0xf6f2ea, t: 'gloss', d: [cute({ y: 8, gap: 2.8, er: 1.1, eh: 1.6, mouth: 'smile', my: 4 }), D.dots(3, 0.5, 0xf2c8c0, { dir: 'b' })] });
      k.mirror(() => k.box([6, 21, 0], [6, 7, 1.6], { c: 0xf6f2ea, t: 'gloss' }, { ch: 0.4, rot: [0, 0, -0.6] }));
      for (let i = 0; i < 6; i++) k.box([-5 + i * 2, -1, 3 - (i % 2) * 2], [1.6, 6, 1.6], { c: 0xf2ece0, t: 'gloss' }, { ch: 0.4, rot: [0.6, 0, (i - 2.5) * 0.2] });
    });
    stick(k, [20, 6, -6], [22, 36, -6], 1.4, { c: 0xc8a060 });
    k.box([22, 28, -6], [1, 12, 14], { c: 0xf4efe4, t: 'cloth', d: [D.txt('いかだ', 0, 0, 3, 0x2a3a6a, { dir: 'l' })] }, { ch: 0 });
  },
  panda(k) {
    k.box([0, 2, 4], [60, 4, 36], { c: 0x9a9aa0, t: 'stone' }, { ch: 0.1 });
    k.box([0, 12, 8], [52, 16, 14], { c: 0xf4efe4, t: 'paper', top: 0x8a6a4a, d: [D.txt('パン', 0, 0, 7, 0xc8302a)] }, { ch: 0.12 });
    for (let i = 0; i < 4; i++) k.soft([-18 + i * 12, 22.5, 10], [4.6, 2.8, 4], { c: [0xd8a050, 0xf2d080, 0xc88038, 0xe8c070][i], t: 'crust', c2: 0x9a5a1c }, { ch: 0.586 });
    k.at([0, 0, -10], [0, 0, 0], () => chibi(k, { H: 60, animal: { c: 0xfbfbf6, ears: 'round', earC: 0x1a1a1e, inner: 0x1a1a1e, d: [D.ell(-6, 0, 3.6, 4.4, 0x1a1a1e), D.ell(6, 0, 3.6, 4.4, 0x1a1a1e)] }, face: { eye: 'dot', mouth: 'cat', y: 0 },
      top: { c: 0xfbfbf6, t: 'cloth' }, outfit: { kind: 'apron', apron: 0xf2e0b0 }, sleeve: { c: 0x1a1a1e, t: 'fur' }, bottom: { c: 0x1a1a1e, t: 'fur' }, gloves: { c: 0x1a1a1e }, shoes: 0x1a1a1e, hat: 'chef', armL: [60, 10, 50], armR: [60, -10, 50],
      holdL(k) { k.soft([0, -3, 4], [8, 3, 4], { c: 0xd8a050, t: 'crust', c2: 0x9a5a1c, d: [D.stripes('x', 3, 0.6, 0xf6e0a8, { dir: 't' })] }, { ch: 0.586 }); } }));
    sign(k, [0, 54, -4], 30, 7, 0x6a4428, 'パンダのパン屋', 0xf6eada);
  },
  futon(k) {
    plinth(k, 'ふとんがふっとんだ', 50, 30, 0x8ac8f0);
    stick(k, [0, 5, 0], [0, 30, 0], 2, { c: 0xd8d8de, m: 'metal' });
    k.at([4, 38, 0], [0.2, 0.3, -0.5], () => { k.box([0, 0, 0], [34, 2.6, 24], { c: 0xe86a8a, t: 'cloth', d: [D.dots(4, 1, 0xfbe0e8, { dir: '*' }), D.stitch(-15, -10, 15, -10, 0xffffff, { dir: 't' })] }, { ch: 0.4, rot: [0, 0, 0.15] }); });
    k.at([-14, 5, 6], [0, 0.4, 0], () => chibi(k, { H: 44, hair: 'bun', hairC: 0x8a8a92, face: { eye: 'dot', mouth: 'o', brow: 'soft' }, top: { c: 0x6a8ab8, t: 'knit' }, sleeve: { c: 0x6a8ab8, t: 'knit' }, legs: 'robe', bottom: { c: 0x8a5a3a, t: 'cloth' }, armL: [150, 20, 0], armR: [140, -20, 0] }));
  },
  samui(k) {
    k.box([0, 3, 0], [56, 6, 34], { c: 0xc8eef8, m: 'glass', t: 'glass', top: 0xe8f8fc }, { ch: 0.3 });
    k.at([-10, 6, 0], [0, 0.2, 0], () => chibi(k, { H: 62, hair: 'buzz', hairC: 0x3a3230, face: { eye: 'happy', mouth: 'grin', brow: 'thick', nose: 'dot' }, top: { c: 0xf4f0e8, t: 'knit' }, outfit: { kind: 'tee' }, legs: 'pants', bottom: { c: 0x6a5a4a, t: 'cloth' }, wide: 1.15,
      armR: [140, -30, 30], armL: [30, 30, 40], holdL(k) { k.box([0, -2, 3], [3, 7, 2], { c: 0x3a3a44, t: 'gloss' }, { ch: 0.3 }); }, faceD: [D.band('y', 7, 9, 0xd0b098)] }));
    // the audience: frozen in ice blocks
    for (const [x, z, c] of [[14, -4, 0xe8a04a], [24, 6, 0x6a8ab8]]) k.at([x, 6, z], [0, -0.4, 0], () => { k.box([0, 15, 0], [14, 30, 14], { c: 0xd8f4ff, m: 'glass', t: 'glass' }, { ch: 0.15 }); chibi(k, { H: 26, hair: 'short', top: { c }, face: { eye: 'x', mouth: 'flat' } }); });
    k.box([-10, 52, 0], [22, 7, 1], { c: 0xffffff, d: [D.txt('ふとんが…', 0, 0, 3.4, 0x3a6ae8)] }, { ch: 0.3 });
  },
};

export default {
  id: 'dajare',
  order: 9,
  name: 'Dajare Daisakusen',
  jp: 'ダジャレ大作戦',
  tagline: 'Terrible Japanese puns, in tiny 3D',
  taglineJp: 'さむい！でもクセになる。',
  price: 500,
  themes: ['weird', 'cute'],
  card: { bg: '#fff3cf', accent: '#ff6b35', text: '#3a2410', accent2: '#2fb5a6', pattern: 'checker' },
  capsule: { colors: [0xffd23f, 0xff8c2e, 0x5cc4ff, 0xffffff, 0x9bd94a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'mikan', name: 'Mikan on an Alumi-can', jp: 'アルミ缶の上にあるミカン', rarity: 'common',
      desc: "Arumikan no ue ni aru mikan: 'there's a mikan on the aluminium can.' Say it fast.",
      fig: F.mikan,
    },
    {
      id: 'neko', name: 'The Cat Lay Down', jp: 'ネコがねころんだ', rarity: 'common',
      desc: 'Neko ga nekoronda: the cat (neko) lay down (nekoronda). It is not getting up.',
      fig: F.neko,
    },
    {
      id: 'kaeru', name: 'The Frog Goes Home', jp: 'カエルがかえる', rarity: 'common',
      desc: 'Kaeru ga kaeru: the frog (kaeru) goes home (kaeru). Otsukaresama!',
      fig: F.kaeru,
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'tako', name: 'Octopus Flies a Kite', jp: 'タコがタコをあげる', rarity: 'uncommon',
      desc: 'Tako ga tako wo ageru: an octopus (tako) flies a kite (tako). Eight arms, one string.',
      fig: F.tako,
    },
    {
      id: 'ika', name: 'Squid on a Raft', jp: 'イカのいかだ', rarity: 'uncommon',
      desc: 'Ika no ikada: a squid (ika) on a raft (ikada). The only plan is to drift.',
      fig: F.ika,
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'panda', name: "Panda's Bakery", jp: 'パンダのパン屋', rarity: 'rare',
      desc: "Panda no pan-ya: 'pan' means bread, so obviously the panda runs a bakery.",
      fig: F.panda,
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'futon', name: 'The Futon Flew Away', jp: 'ふとんがふっとんだ', rarity: 'ultra',
      desc: 'Futon ga futtonda: the futon (futon) went flying (futtonda). Lovely drying weather.',
      fig: F.futon,
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'samui', name: 'Samui Oyaji', jp: '寒いオヤジギャグ', rarity: 'secret',
      desc: "Dad's pun was so cold (samui) that the audience froze solid. He thinks it went great.",
      fig: F.samui,
    },
  ],
};
