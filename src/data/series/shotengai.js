// Animal Shopping Street (どうぶつ商店街): shopkeeper animals in their tiny shops; blocky figures with painted signs.
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, sign, noren, lantern, cute, plate } from '../../figures/props.js';

/** A tiny shop front: counter, back wall, awning in two colours and a sign. */
const shop = (k, c1, c2, word, wall = 0xe8dcc0) => {
  k.box([0, 2, 4], [56, 4, 36], { c: 0x9a9aa0, t: 'stone' }, { ch: 0.1 });
  k.box([0, 28, -12], [54, 52, 4], { c: wall, t: 'paper', d: [D.stripes('y', 6, 0.4, 0xd0c4a8, { dir: 'f' })] }, { ch: 0.06 });
  k.box([0, 52, -6], [58, 4, 16], { c: c1, t: 'cloth', d: [D.stripes('x', 8, 4, c2, { dir: '*' })] }, { ch: 0.15, rot: [0.25, 0, 0] });
  sign(k, [0, 58, -10], 30, 7, 0x3a2a24, word, 0xf6eada);
  k.box([0, 9, 10], [50, 14, 12], { c: 0xa87a4a, t: 'wood', ga: 'x' }, { ch: 0.15 });
};
const keeper = (k, an, o = {}) => chibi(k, { H: 50, animal: an, face: { eye: 'dot', mouth: 'cat', ...(o.face || {}) }, top: { c: 0xf4f0e8, t: 'cloth' }, sleeve: { c: 0xf4f0e8, t: 'cloth' }, armL: [60, 10, 50], armR: [60, -10, 50], ...o });
const F = {
  taiyaki(k) {
    shop(k, 0x2a3a6a, 0xf4f0e8, 'たい焼');
    k.box([0, 17, 10], [40, 3, 10], { c: 0x2a2a30, t: 'metal', d: [D.stripes('x', 8, 6, 0x4a4a52, { dir: 't' })] }, { ch: 0.2 });
    for (let i = 0; i < 3; i++) k.box([-12 + i * 12, 19.6, 11], [8, 2, 5], { c: 0xd8913a, t: 'crust', c2: 0x9a5418 }, { ch: 0.4, top: [0.6, 1] });
    k.at([0, 4, -4], [0, 0, 0], () => keeper(k, { c: 0xe8604a, ears: 'none', d: [D.stripes('y', 3, 0.6, 0xf28a6a)] }, { face: { eye: 'dot', mouth: 'o' }, hat: { kind: 'band', c: 0x2a3a6a, p: { c: 0x2a3a6a, t: 'cloth' } }, outfit: { kind: 'apron', apron: 0x2a3a6a } }));
  },
  kuji(k) {
    k.box([0, 2, 0], [48, 4, 36], { c: 0x9a9aa0, t: 'stone' }, { ch: 0.1 });
    k.box([0, 22, -4], [40, 36, 24], { c: 0xf6f0e0, t: 'paper', d: [D.band('y', 10, 18, 0xd8302a, { only: 'f' }), D.txt('宝くじ', 0, 14, 5, 0xf6d84a), D.rect(-12, -8, 12, 4, 0xa8c8d0, { dir: 'f' })] }, { ch: 0.1 });
    k.box([0, 42, -4], [44, 4, 28], { c: 0xd8302a, t: 'gloss' }, { ch: 0.2 });
    k.at([0, 16, 9], [0, 0, 0], () => beast(k, 'loaf', { c: 0x8a9a5a, c2: 0xe8e0b0, size: 0.4, ears: 'none', face: { eye: 'dot', mouth: 'smile' }, onBody(k, b) { k.box([0, b.ry * 1.4, -b.rz * 0.2], [b.rx * 2.4, b.ry * 1.6, b.rz * 1.8], { c: 0x6a7a3a, t: 'gloss', d: [D.check(2.4, 0x5a6a2a)] }, { ch: 0.5, top: [0.6, 0.6] }); } }));
    k.box([0, 15, 12], [10, 0.6, 4], { c: 0xf6d84a, d: [D.txt('当', 0, 0, 2.4, 0xd8302a, { dir: 't' })] }, { ch: 0 });
  },
  sakana(k) {
    shop(k, 0x2a7aa8, 0xf4f0e8, '魚屋');
    k.box([0, 16.6, 10], [48, 1, 12], { c: 0xe8f4f8, t: 'foam' }, { ch: 0.2 });
    for (let i = 0; i < 4; i++) k.at([-18 + i * 12, 18.4, 10], [0, 0, 0], () => k.box([0, 0, 0], [10, 2, 4], { c: [0x8a9ab0, 0xd8503a, 0x6a7a9a, 0xe8a060][i], t: 'gloss', d: [D.circ(-3.6, 0, 0.6, 0x1a1a1a, { dir: 't' })] }, { ch: 0.5, top: [0.7, 1] }));
    k.at([0, 4, -4], [0, 0, 0], () => keeper(k, { c: 0x3a3438, ears: 'tri', inner: 0xf4a8b0, whiskers: true }, { face: { eye: 'happy', mouth: 'open' }, outfit: { kind: 'apron', apron: 0x2a2a30 }, hat: { kind: 'band', c: 0xf4f0e8, p: { c: 0xf4f0e8, t: 'cloth' } } }));
  },
  hanaya(k) {
    shop(k, 0x3a9a4a, 0xf4f0e8, '花屋', 0xf2ecd8);
    for (let i = 0; i < 4; i++) { const x = -18 + i * 12; k.cyl([x, 19, 10], 4, 6, { c: 0xb8bcc8, t: 'metal' }); for (let j = 0; j < 3; j++) k.soft([x + (j - 1) * 2.4, 25 + (j % 2) * 2, 10 + (j - 1)], [2, 2, 2], { c: [0xf06a8a, 0xf6d84a, 0xffffff, 0xd8302a][(i + j) % 4], t: 'felt', d: [D.circ(0, 0, 0.6, 0xf2c23a, { dir: 't' })] }, { ch: 0.586 }); }
    k.at([0, 4, -4], [0, 0, 0], () => keeper(k, { c: 0xa8784a, ears: 'round', inner: 0x6a4428, muzzle: 0xe6caa0 }, { face: { eye: 'dot', mouth: 'none' }, outfit: { kind: 'apron', apron: 0x3a9a4a }, armR: [80, -10, 30], holdR(k) { k.cyl([0, -2, 3], 2, 4, { c: 0x6a9ac8, t: 'gloss' }, { top: 1.3 }); } }));
  },
  kissa(k) {
    shop(k, 0x8a3a2a, 0xf2e0c0, '純喫茶', 0x6a4a32);
    plate(k, [-12, 16, 10], 4); k.cyl([-12, 21, 10], 2.4, 8, { c: 0x4ad860, m: 'glass', t: 'glass' }, { top: 1.2 }); k.soft([-12, 26, 10], [2.6, 2, 2.6], { c: 0xfffbea, t: 'foam' }, { ch: 0.586 });
    k.at([12, 16, 10], [0, 0, 0], () => { k.ball([0, 5, 0], [3.4, 3.4, 3.4], { c: 0x3a2214, m: 'glass', t: 'glass' }); k.cyl([0, 11, 0], 2.4, 5, { c: 0xd8eef6, m: 'glass' }); });
    k.at([0, 4, -4], [0, 0, 0], () => keeper(k, { c: 0x8a6a4a, ears: 'small', d: [D.ell(-5, 0, 4.4, 4.4, 0xf2e6c8), D.ell(5, 0, 4.4, 4.4, 0xf2e6c8), D.poly([[-1.4, -3], [1.4, -3], [0, -6]], 0xe8b040)] }, { face: { eye: 'dot', er: 2.4, eh: 2.4, mouth: 'none' }, top: { c: 0x2a2a30 }, outfit: { kind: 'suit', tie: 0x8a3a2a }, sleeve: { c: 0x2a2a30 } }));
  },
  sento(k) {
    shop(k, 0x2a5aa8, 0xd8302a, 'ゆ', 0xf2ecd8);
    noren(k, [0, 46, 4], 44, 10, 0x2a5aa8, 'ゆゆゆ');
    k.box([0, 17, 10], [20, 1, 8], { c: 0xc8c8d0, t: 'metal' }, { ch: 0.2 });
    k.soft([12, 19.6, 12], [2.6, 2.4, 2.6], { c: 0xf28a1a, t: 'crust', c2: 0xd86a10 }, { ch: 0.586 });
    k.at([0, 4, -4], [0, 0, 0], () => keeper(k, { c: 0xa8784a, ears: 'small', d: [D.rect(-5, -8, 5, -3, 0x8a5e38, { r: 2 })] }, { face: { eye: 'line', mouth: 'none' }, top: { c: 0x2a5aa8, t: 'cloth' }, outfit: { kind: 'hanten', collar: 0xf4f0e8 }, sleeve: { c: 0x2a5aa8, t: 'cloth' },
      onHead(k, H) { k.box([0, H.hy + H.hh + 0.8, 0], [12, 2, 7], { c: 0xffffff, t: 'cloth', d: [D.stripes('x', 2.4, 0.7, 0x7ab8e8)] }, { ch: 0.45 }); } }));
  },
};

export default {
  id: 'shotengai',
  order: 14,
  name: 'Animal Shopping Street',
  jp: 'どうぶつ商店街',
  romaji: 'DOUBUTSU SHOTENGAI',
  tagline: 'Open until the owner gets sleepy',
  taglineJp: 'いらっしゃい。',
  price: 500,
  themes: ['city', 'retro', 'cute'],
  card: { bg: '#f2e8da', accent: '#c8402e', text: '#3a2a20', accent2: '#3f6fb8', pattern: 'stripes' },
  capsule: { colors: [0xd9483a, 0x3f6fb8, 0x6fae7a, 0xf2e2c8, 0xc9ced4], style: 'tab' },
  flyer: {
    maker: 'tsukushi', scene: 'shutters', hero: 'kissa', side: ['hanaya', 'sakana'],
    title: [['どうぶつ', 2, 'b'], ['商店街', 4, 'a']],
    catch: 'へい、いらっしゃい。', sub: 'ミニチュアのお店', gimmick: 'シャッターがおりる！',
  },
  items: [
    {
      id: 'taiyaki', name: 'Taiyaki Sea Bream', jp: 'たいやき屋のタイ', jpLines: ['たいやき屋', 'のタイ'], rarity: 'common',
      desc: 'Makes fish-shaped cakes all day. Does not see the problem.',
      fig: F.taiyaki, gimmick: { text: 'Pull the shutter down' },
    },
    {
      id: 'kuji', name: 'Lottery-Booth Tortoise', jp: '宝くじ屋のカメ', jpLines: ['宝くじ屋', 'のカメ'], rarity: 'common',
      desc: 'Has sold three winning tickets in forty years. Remembers every one.',
      fig: F.kuji, gimmick: { text: 'Pull the shutter down' },
    },
    {
      id: 'sakana', name: 'Fishmonger Cat', jp: 'さかな屋のネコ', jpLines: ['さかな屋', 'のネコ'], rarity: 'uncommon',
      desc: 'Every fish fresh today. Some fresher than others. One is for later.',
      fig: F.sakana, gimmick: { text: 'Pull the shutter down' },
    },
    {
      id: 'hanaya', name: 'Flower-Shop Bear', jp: 'はな屋のクマ', jpLines: ['はな屋', 'のクマ'], rarity: 'rare',
      desc: 'Waters the pails twice a day and the customers once.',
      fig: F.hanaya, gimmick: { text: 'Pull the shutter down' },
    },
    {
      id: 'kissa', name: 'Coffee-Shop Owl', jp: '喫茶店のフクロウ', jpLines: ['喫茶店の', 'フクロウ'], rarity: 'ultra',
      desc: 'Siphon coffee, a cream soda in the window, open till late. Obviously.',
      fig: F.kissa, gimmick: { text: 'Pull the shutter down' },
    },
    {
      id: 'sento', name: 'Bathhouse Capybara', jp: 'せんとうのカピバラ', jpLines: ['せんとうの', 'カピバラ'], rarity: 'secret',
      desc: 'Minds the desk, the change and an orange. Never leaves the warm side.',
      fig: F.sento, gimmick: { text: 'Lift the noren' },
    },
  ],
};
