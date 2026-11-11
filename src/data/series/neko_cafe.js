// Series 13 — Neko Kissaten Hidamari (ねこ喫茶ひだまり)
// Chibi cats running a Showa-retro kissaten: drip coffee, cream soda, hot cakes and a very
// professional amount of napping on the counter.
// Neko Kissaten Hidamari: a cat-run Shōwa coffee shop; chibi cats in the human style with painted fur and aprons.
import { chibi, beast, D } from '../../figures/chibi.js';
import { plate, cup, stick, sign, cute, noren, WOOD, DARKWOOD, WHITE } from '../../figures/props.js';

const APRON = { kind: 'apron', apron: 0x5a3a2a, logo: D.txt('ひだまり', 0, -2, 2.4, 0xf2e6c8) };
const cat = (k, c, o = {}) => chibi(k, { H: 60, animal: { c, ears: 'tri', inner: 0xf4a8b0, whiskers: true, mask: !!o.mask, c2: o.c2 ?? 0xfbf8f2, d: o.fur || [] },
  face: { eye: 'dot', er: 1.9, eh: 2.3, mouth: 'cat', ...(o.face || {}) }, top: { c: 0xfaf8f2, t: 'cloth' }, sleeve: { c: 0xfaf8f2, t: 'cloth' }, outfit: APRON,
  bottom: { c: 0x3a2a24, t: 'cloth' }, shoes: 0x2a1a14, gloves: { c, t: 'fur' }, ...o });
const coffee = (k, pos) => { plate(k, pos, 4.6); cup(k, [pos[0], pos[1] + 2.4, pos[2]], 3, 4.4, { c: WHITE, t: 'ceramic' }, { c: 0x4a2a14, t: 'water' }); };
const soda = (k, pos, col = 0x4ad860) => { k.cyl([pos[0], pos[1] + 6, pos[2]], 3, 12, { c: col, m: 'glass', t: 'glass' }, { top: 1.15 }); k.soft([pos[0], pos[1] + 13, pos[2]], [3.4, 2.4, 3.4], { c: 0xfffbea, t: 'foam' }, { ch: 0.586 }); k.soft([pos[0] + 1, pos[1] + 16, pos[2]], [1.3, 1.3, 1.3], { c: 0xe0202a, t: 'gloss' }, { ch: 0.586 }); };

const F = {
  tora(k) {
    // the barista: orange tabby, pouring drip coffee one drop at a time
    cat(k, 0xe8a04a, { fur: [D.stripes('y', 3.4, 1.1, 0xc8702a, { dir: 'x' }), D.stripes('x', 3, 1, 0xc8702a, { dir: 't' })], mask: true, face: { eye: 'line', mouth: 'cat' },
      armL: [70, 0, 50], armR: [60, -20, 30],
      holdR(k) { k.cyl([0, -2, 3], 2.6, 5, { c: 0xd8d8de, m: 'metal' }, { top: 0.6 }); k.box([0, 0, 7], [1, 1, 6], { c: 0xd8d8de, m: 'metal' }, { rot: [0.6, 0, 0] }); },
      holdL(k) { k.cyl([0, -3, 2], 3.4, 4, { c: WHITE, t: 'ceramic' }, { top: 1.3 }); } });
  },
  shiro(k) {
    cat(k, 0xfbf8f2, { face: { eye: 'anime', iris: 0x5aa0e8, mouth: 'flat', brow: 'soft' }, outfit: { kind: 'suit', tie: 0x1a1a1e, c2: 0xffffff }, top: { c: 0x1a1a1e, t: 'cloth' }, sleeve: { c: 0x1a1a1e, t: 'cloth' }, gloves: { c: 0xffffff },
      armL: [90, 6, 70], armR: [10, -8, 0], holdL(k) { plate(k, [0, -1, 6], 7, { c: 0xd8d8de, m: 'metal' }); soda(k, [0, 1, 6]); } });
  },
  kuro(k) {
    k.box([0, 10, 10], [44, 20, 18], { c: 0x7a5230, t: 'wood', ga: 'x', top: 0x8a6240 }, { ch: 0.1 });
    plate(k, [6, 20, 12], 9);
    for (let i = 0; i < 3; i++) k.cyl([6, 23.5 + i * 2.8, 12], 7.4, 2.6, { c: 0xe8b060, t: 'crust', c2: 0xa86a2a, top: 0xc8803a }, {});
    k.box([6, 31.6, 12], [4, 1.6, 4], { c: 0xfbe68a, t: 'gloss' }, { ch: 0.4 });
    k.box([6, 31, 12], [8, 0.4, 8], { c: 0xb86a1a, m: 'gloss', t: 'gloss' }, { ch: 0.586 });
    k.at([-10, 0, -4], [0, 0.3, 0], () => cat(k, 0x2a2628, { face: { eye: 'anime', iris: 0xf2c23a, mouth: 'open' }, outfit: { kind: 'tee' }, top: { c: 0xf2a0b8, t: 'knit' }, sleeve: { c: 0xf2a0b8, t: 'knit' },
      armL: [80, 0, 60], armR: [60, -8, 60], holdL(k) { k.box([0, -3, 4], [0.8, 0.8, 8], { c: 0xd0d0d8, m: 'metal' }); }, holdR(k) { k.box([0, -3, 4], [0.8, 0.8, 8], { c: 0xd0d0d8, m: 'metal' }); } }));
  },
  mike(k) {
    // fell into the cream soda and decided to stay
    k.cyl([0, 4, 0], 7, 8, { c: 0xd8eef6, m: 'glass', t: 'glass' }, { top: 0.6 });
    k.cyl([0, 22, 0], 16, 28, { c: 0x4ad860, m: 'glass', t: 'glass', d: [D.dots(4, 0.6, 0xc8f8d0, { dir: '*' })] }, { top: 1.12, caps: 'bot' });
    k.cyl([0, 34, 0], 17.4, 1, { c: 0x6ae880, t: 'water' });
    k.at([0, 26, 0], [0, 0, 0], () => beast(k, 'loaf', { c: 0xfbf6ec, size: 0.9, ears: 'tri', inner: 0xf4a8b0, whiskers: true, belly: false, face: { eye: 'happy', mouth: 'open' }, bodyD: [D.ell(-8, 12, 6, 5, 0xe8893a, { dir: '*' }), D.ell(9, 8, 5, 5, 0x3a3230, { dir: 'x' })] }));
    k.soft([0, 50, 0], [9, 5, 9], { c: 0xfffbea, t: 'foam' }, { ch: 0.586, bev: 0.5, bs: 0.6 });
    k.soft([3, 57, 2], [2.4, 2.4, 2.4], { c: 0xe0202a, t: 'gloss', m: 'gloss' }, { ch: 0.586 });
  },
  hachi(k) {
    // siphon master: a hachiware cat with lensless glasses and a siphon on a burner
    k.box([0, 10, 10], [46, 20, 16], { c: 0x6a4428, t: 'wood', ga: 'x' }, { ch: 0.1 });
    k.at([12, 20, 10], [0, 0, 0], () => {
      k.cyl([0, 1.5, 0], 4, 3, { c: 0x4a4a52, m: 'metal' });
      k.ball([0, 9, 0], [5, 5, 5], { c: 0x3a2214, m: 'glass', t: 'glass' });
      k.cyl([0, 15, 0], 0.8, 4, { c: 0xd8eef6, m: 'glass' });
      k.cyl([0, 21, 0], 4, 9, { c: 0xd8eef6, m: 'glass', t: 'glass' }, { top: 1.1 });
      k.mirror(() => k.box([3.6, 10, 0], [1, 18, 1], { c: 0xc8a040, m: 'metal' }));
    });
    k.at([-8, 0, -4], [0, 0.2, 0], () => cat(k, 0xfbf8f2, { fur: [D.poly([[-15, 14], [15, 14], [15, -2], [3, 4], [0, 9], [-3, 4], [-15, -2]], 0x2a2628, { dir: 'f' }), D.rect(-16, -14, 16, 14, 0x2a2628, { dir: 't' })],
      face: { eye: 'dot', mouth: 'cat', blush: false }, outfit: { kind: 'shirt', c2: 0xffffff, bc: 0x2a2628 }, top: { c: 0xf4f2ec, t: 'cloth', d: [D.band('y', -7, 7, 0x2a2628, { only: 'b' })] },
      faceD: [], armL: [50, 0, 90], armR: [20, -10, 30],
      onHead(k, H) { k.box([0, H.hy - 1.5, H.hd + 0.8], [H.hw * 1.9, 5, 0.6], { c: 0x2a1c1c, d: [D.rect(-12, -2, -2, 2, 0x000000), D.rect(2, -2, 12, 2, 0x000000)].map(() => null), fn: (c, o) => { const a = Math.abs(c.x) - 7; if (Math.abs(a) < 3.6 && Math.abs(c.y) < 1.8) o[3] = 255, o[0] = o[1] = o[2] = 0; } }, { ch: 0 }); } }));
  },
  morning(k) {
    // the morning set: thick toast, a boiled egg in a cup, coffee, and the cat that came with it
    k.box([0, 2, 0], [60, 4, 36], { c: 0x7a5230, t: 'wood', ga: 'x' }, { ch: 0.15 });
    plate(k, [-12, 4, 2], 13);
    k.box([-12, 11, 2], [18, 10, 16], { c: 0xf6ead0, t: 'foam', side: 0xc8803a, top: 0xd89040, d: [D.fn('t', (c, o) => { if (Math.abs(c.a) < 4 && Math.abs(c.b) < 4) { o[0] = 252; o[1] = 230; o[2] = 140; } })] }, { ch: 0.2, rot: [0, 0.2, 0] });
    k.cyl([4, 7, -8], 3, 6, { c: WHITE, t: 'ceramic' }, { top: 1.2 });
    k.soft([4, 13, -8], [3.2, 4, 3.2], { c: 0xfbf6ea, t: 'gloss' }, { ch: 0.586 });
    coffee(k, [12, 4, 8]);
    k.at([18, 4, -6], [0, -0.6, 0], () => beast(k, 'sit', { c: 0x9a9aa0, c2: 0xe8e8ea, size: 0.85, face: { eye: 'closed' }, bodyD: [D.stripes('y', 3, 1, 0x6a6a72, { dir: 'x' })], whiskers: true }));
  },
  store(k) {
    k.box([0, 2, 4], [64, 4, 40], { c: 0x9a9aa0, t: 'stone' }, { ch: 0.1 });
    k.box([0, 26, -4], [60, 44, 24], { c: 0x8a5a3a, t: 'wood', d: [D.stripes('y', 3, 0.5, 0x6a4024, { dir: 'x' })] }, { ch: 0.06 });
    k.box([-12, 20, 8.4], [28, 22, 1], { c: 0xf2d8a0, m: 'glow', d: [D.rect(-14, -11, 14, 11, null, { ink: 0x4a2a14, iw: 1 }), D.line(0, -11, 0, 11, 0.8, 0x4a2a14), D.line(-14, 0, 14, 0, 0.8, 0x4a2a14)] }, { ch: 0 });
    k.box([16, 16, 8.4], [14, 26, 1], { c: 0x5a3a24, t: 'wood', d: [D.rect(-5, -2, 5, 10, 0xf2d8a0), D.circ(4, -2, 0.8, 0xd8b040)] }, { ch: 0 });
    k.box([0, 52, -2], [66, 8, 30], { c: 0xc84a3a, t: 'cloth', d: [D.stripes('x', 6, 3, 0xf6eada, { dir: 'f' }), D.stripes('x', 6, 3, 0xf6eada, { dir: 't' })] }, { ch: 0.1, rot: [0.3, 0, 0] });
    sign(k, [0, 62, -4], 34, 8, 0x2a1a14, '喫茶ひだまり', 0xf2d8a0, { ts: 0.6 });
    k.at([-12, 31, 11], [0, 0, 0], () => beast(k, 'loaf', { c: 0xe8a04a, size: 0.4, face: { eye: 'closed' }, ears: 'tri' }));
    k.box([24, 8, 16], [8, 12, 4], { c: 0x2a1a14, t: 'wood', d: [D.txt('珈琲', 0, 1, 3, 0xf6eada, { vert: true })] }, { ch: 0.2, top: [0.8, 1] });
  },
  latte(k) {
    plate(k, [0, 0, 0], 22);
    k.cyl([0, 13, 0], 17, 22, { c: WHITE, t: 'ceramic' }, { top: 1.1, caps: 'bot' });
    k.box([20, 14, 0], [4, 12, 3], { c: WHITE, t: 'ceramic' }, { ch: 0.5 });
    k.cyl([0, 22, 0], 18, 1, { c: 0xb8824a, t: 'water', d: [D.circ(0, 0, 10, 0xf6ead8, { dir: 't' }), D.poly([[-9, 4], [-5, 12], [-3, 6]], 0xf6ead8, { dir: 't' }), D.poly([[9, 4], [5, 12], [3, 6]], 0xf6ead8, { dir: 't' }),
      D.ell(-3.6, 1.4, 1.2, 1.6, 0xb8824a, { dir: 't' }), D.ell(3.6, 1.4, 1.2, 1.6, 0xb8824a, { dir: 't' }), D.arc(0, -3, 3, 1.6, Math.PI + 0.3, 2 * Math.PI - 0.3, 0.7, 0xb8824a, { dir: 't' })] });
    // a real cat paw poking out of the foam
    k.at([9, 22, 6], [0.2, 0, -0.4], () => k.box([0, 3, 0], [4.4, 7, 4.4], { c: 0xf6ead8, t: 'foam', d: [D.circ(0, 3.6, 1, 0xf4a8b0, { dir: 't' })] }, { ch: 0.5 }));
  },
};

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
      fig: F.tora,
    },
    {
      id: 'shiro', name: 'Waiter Shiro', jp: 'ウェイターのシロ', rarity: 'common',
      desc: 'Carries the cream soda with total focus. Has never spilled. Has never delivered.',
      fig: F.shiro,
    },
    {
      id: 'kuro', name: 'Kuro & Hot Cake', jp: 'ホットケーキのクロ', rarity: 'common',
      desc: 'Three hot cakes, one butter, zero sharing. The syrup is also hers.',
      fig: F.kuro,
    },
    {
      id: 'mike', name: 'Cream Soda Mike', jp: 'クリームソーダ三毛', rarity: 'uncommon',
      desc: 'Fell in once. Decided to stay. The ice cream hat is non-negotiable.',
      fig: F.mike,
    },
    {
      id: 'hachi', name: 'Siphon Master Hachi', jp: 'サイフォン名人ハチ', rarity: 'uncommon',
      desc: 'Wears glasses for the science look. They have no lenses. The coffee is excellent.',
      fig: F.hachi,
    },
    {
      id: 'morning', name: 'Morning Set Counter', jp: 'モーニングセット', rarity: 'rare',
      desc: 'Order one coffee, receive toast, an egg and a cat. Kissaten rules.',
      fig: F.morning,
    },
    {
      id: 'store', name: 'Kissaten Storefront', jp: 'ねこ喫茶の店先', rarity: 'ultra',
      desc: 'Open from 7am until the cat in the window wakes up. So, roughly forever.',
      fig: F.store,
    },
    {
      id: 'latte', name: 'Latte Art Neko', jp: 'ラテアートねこ', rarity: 'secret',
      desc: 'The barista asked for cat latte art. This is the cat latte art.',
      fig: F.latte,
    },
  ],
};
