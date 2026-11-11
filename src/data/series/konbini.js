// Series 5 — Konbini Life (コンビニライフ)
// Japanese convenience-store miniatures: snacks, drinks and the night-shift heroes behind the counter.
// Konbini Life: convenience-store goods and the shop itself as blocky toy figures with printed labels (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { plate, bowl, stick, cup, cute, sign, WOOD, WHITE } from '../../figures/props.js';

const FILM = { c: 0xe8eef2, m: 'gloss', t: 'glass' };
const F = {
  onigiri(k) {
    // the triangle pack: rice and nori under printed film with the three pull tabs
    k.prism([[0, 18, 7, 0, 0, 0.45], [9, 17, 7.2, 0, 0, 0.45], [34, 3, 6, 0, 0, 0.6]], { c: 0xfbf8f0, t: 'rice', d: [
      D.rect(-10, -1, 10, 16, 0x1e2a22, { dir: 'f' }), D.rect(-10, -1, 10, 16, 0x1e2a22, { dir: 'b' }),
      D.rect(-7, 6, 7, 13, 0xffffff, { dir: 'f', ink: 0xd8282a }), D.txt('鮭', 0, 9.6, 5, 0xd8282a), D.rect(-1.2, -1, 1.2, 34, 0xd8282a, { dir: 'f' }),
      D.txt('1', 0, 30, 3, 0xffffff), D.ell(-11, 3, 2, 2, 0xd8282a, { dir: 'f' }), D.txt('2', -11, 3, 2.4, 0xffffff), D.ell(11, 3, 2, 2, 0xd8282a, { dir: 'f' }), D.txt('3', 11, 3, 2.4, 0xffffff),
      D.circ(3, 17, 2.4, 0xf08a6a, { dir: 'f', ink: 0xffffff, iw: 0.5 }),
    ] }, { pos: [0, 0, 0] });
    k.box([0, 35, 0], [5, 3, 1.4], { c: 0xd8282a, t: 'gloss', d: [D.txt('1', 0, 0, 2.4, 0xffffff)] }, { ch: 0.3 });
  },
  melonsoda(k) {
    plate(k, [0, 0, 0], 13, { c: 0xffffff, t: 'ceramic' });
    k.cyl([0, 5, 0], 3, 6, { c: 0xd8eef6, m: 'glass', t: 'glass' });
    k.cyl([0, 21, 0], 10, 26, { c: 0x4ad860, m: 'glass', t: 'glass', d: [D.dots(4, 0.5, 0xc8f8d0, { dir: '*' })] }, { top: 1.12 });
    for (let i = 0; i < 3; i++) k.box([-4 + i * 4, 31 + (i % 2) * 2, (i - 1) * 3], [5, 5, 5], { c: 0xe4fbe8, m: 'glass', t: 'glass' }, { ch: 0.3, rot: [i, i * 0.6, 0] });
    k.soft([0, 37.5, 0], [8, 5, 8], { c: 0xfffbea, t: 'foam' }, { ch: 0.586, bev: 0.5, bs: 0.6 });
    k.soft([3, 44, 2], [3, 3, 3], { c: 0xe0202a, t: 'gloss', m: 'gloss' }, { ch: 0.586 });
    stick(k, [3, 46, 2], [5, 51, 0], 0.5, { c: 0x2a6a2a });
    stick(k, [-4, 28, -2], [-10, 56, -6], 1.6, { c: 0xe83a5a, t: 'gloss', d: [D.stripes('y', 3, 1.2, 0xffffff)] });
  },
  cancoffee(k) {
    k.cyl([0, 22, 0], 11, 44, { c: 0x5a2a1a, t: 'tin', d: [
      D.band('y', 18, 22, 0xd8d8de), D.band('y', -22, -19, 0xd8d8de), D.band('y', 6, 14, 0xf2c23a), D.txt('珈琲', 0, 10, 6, 0x5a2a1a), D.txt('珈琲', 0, 10, 6, 0x5a2a1a, { dir: 'b' }),
      D.circ(0, -4, 6, 0xf6eada, { dir: 'f' }), D.ell(0, -4, 3, 4, 0x6a3a1a, { dir: 'f' }), D.line(0, -7.5, 0, -0.5, 0.5, 0xf6eada, { dir: 'f' }),
      D.txt('HOT', 0, -15, 3, 0xe8402a), D.band('y', -13, -12, 0xf2c23a),
    ] });
    k.cyl([0, 44.5, 0], 9, 1, { c: 0xd8d8de, m: 'metal', d: [D.ell(0, -4, 3, 1.6, 0x9a9aa4, { dir: 't' })] });
    k.box([0, 45.4, 3], [4, 0.6, 6], { c: 0xc8c8d0, m: 'metal' }, { ch: 0.4 });
  },
  oden(k) {
    k.cyl([0, 9, 0], 18, 18, { c: 0xf6f2ea, t: 'paper', d: [D.band('y', 4, 8, 0xe8402a), D.txt('おでん', 0, -2, 6, 0x2a1c1c), D.txt('おでん', 0, -2, 6, 0x2a1c1c, { dir: 'b' })] }, { top: 1.12 });
    k.cyl([0, 16.8, 0], 19.6, 0.8, { c: 0xd8a860, t: 'water' });
    const sk = (x, z, rz) => stick(k, [x, 10, z], [x + rz * 22, 52, z], 0.9);
    sk(-8, 2, 0.05); sk(0, -4, -0.02); sk(8, 3, -0.12);
    k.at([-6.5, 29, 2], [0, 0, 0.05], () => { k.soft([0, 0, 0], [6, 4, 6], { c: 0xf6e6c8, t: 'plush', d: [D.ring(0, 0, 3.6, 0.6, 0xd8b888, { dir: 't' })] }, { ch: 0.586 }); k.soft([0, 9, 0], [3.6, 4.4, 3.4], { c: 0xf6f2e6, t: 'gloss', d: [D.ell(0, 0, 2, 2.4, 0xf0c060, { dir: 'f' })] }, { ch: 0.586 }); });
    k.box([-0.5, 34, -4], [8, 10, 3], { c: 0x6a6a72, t: 'stone', d: [D.dots(1.6, 0.3, 0x3a3a40)] }, { ch: 0.3, rot: [0, 0.3, -0.02] });
    k.at([12, 30, 3], [0, 0, -0.12], () => k.cyl([0, 0, 0], 3.6, 14, { c: 0xe8c890, t: 'crust', c2: 0xa86a2a, d: [D.band('y', -7, -5.5, 0xa86a2a), D.band('y', 5.5, 7, 0xa86a2a)] }));
  },
  bento(k) {
    k.box([0, 4, 0], [56, 8, 40], { c: 0x2a2a2e, t: 'gloss', m: 'gloss', d: [D.band('y', 2.6, 4, 0xa8282a)] }, { ch: 0.2 });
    k.box([0, 8.4, 0], [52, 1, 36], { c: 0x3a3a3e }, { ch: 0.1 });
    k.box([-13, 10, 0], [24, 3, 32], { ...{ c: 0xfbf8f0, t: 'rice' }, d: [D.circ(0, 0, 2.6, 0xc8303a, { dir: 't' }), D.dots(1.4, 0.25, 0x1a1a1a, { dir: 't' })] }, { ch: 0.4 });
    k.box([12, 10.6, -8], [20, 4, 10], { c: 0xc87a3a, t: 'crust', c2: 0x8a4a1c, d: [D.stripes('x', 3, 0.6, 0x6a3a14, { dir: 't' })] }, { ch: 0.4 });
    for (let i = 0; i < 2; i++) k.box([8 + i * 7, 11, 5], [6, 5, 7], { c: 0xf6d040, t: 'plush', d: [D.stripes('y', 1.6, 0.4, 0xe8b830, { dir: 'x' })] }, { ch: 0.4 });
    k.soft([20, 11, 8], [3.4, 3, 3.4], { c: 0xd84a2a, t: 'gloss' }, { ch: 0.586 });
    k.box([20, 10, 14], [8, 1.2, 4], { c: 0x6ab83a }, { ch: 0.3, top: [0.3, 1] });
    // the tiny soy-sauce fish
    k.at([-2, 14, 12], [0, 0, Math.PI / 2], () => { k.prism([[-5, 1.4, 1.4, 0, 0, 0.5], [0, 2.2, 2, 0, 0, 0.5], [4, 1.6, 1.6, 0, 0, 0.5]], { c: 0x6a3a1a, m: 'glass', t: 'glass', d: [D.circ(-1.4, -3, 0.4, 0x1a1a1a, { dir: 'f' })] }); k.box([0, -6, 0], [2.8, 2, 1.2], { c: 0xd8282a }, { ch: 0.3, top: [1.4, 1] }); k.cyl([0, 5.6, 0], 0.8, 1.8, { c: 0xd8282a }); });
  },
  nikuman(k) {
    k.box([0, 3, 0], [44, 6, 30], { c: 0xd8d8de, m: 'metal', t: 'metal', d: [D.rect(-18, -2, 18, 2, 0xe8402a, { dir: 'f' }), D.txt('中華まん', 0, 0, 3, 0xffffff)] }, { ch: 0.2 });
    k.box([0, 22, 0], [44, 32, 30], { c: 0xe8f4f8, m: 'glass', t: 'glass' }, { ch: 0.1, caps: 'top' });
    k.box([0, 38.5, 0], [44, 2, 30], { c: 0xe8402a, t: 'gloss' }, { ch: 0.3 });
    k.box([0, 20, 0], [40, 0.8, 26], { c: 0xc8c8d0, m: 'metal', d: [D.check(2, 0x9a9aa4, { dir: 't' })] }, { ch: 0 });
    const bun = (x, y, z, d) => k.soft([x, y, z], [5.6, 4.2, 5.6], { c: 0xfbf6ea, t: 'plush', d: [D.fn('t', (c, o) => { const a = Math.atan2(c.b, c.a), r = Math.hypot(c.a, c.b); if (r < 3 && (Math.abs(((a * 6 / 3.1416) % 2) - 1) < 0.18)) { o[0] *= 0.88; o[1] *= 0.86; o[2] *= 0.82; } }), ...(d || [])] }, { flat: true, ch: 0.586, bev: 0.5, bs: 0.6 });
    bun(-12, 9, -6); bun(0, 9, -6); bun(12, 9, -6); bun(-12, 25, 5); bun(12, 25, 5);
    bun(0, 25, 6, [cute({ eye: 'dot', mouth: 'flat', gap: 2.4, er: 0.8, eh: 1.1, y: 0.6, my: -1.6, blush: false })]);
  },
  storefront(k) {
    const W2 = { c: 0xf4f2ec, t: 'paper' };
    k.box([0, 2, 6], [66, 4, 36], { c: 0x9a9aa0, t: 'stone', top: 0xb0b0b4 }, { ch: 0.1 });
    k.box([0, 24, -2], [62, 40, 24], { ...W2, d: [D.band('y', 10, 13, 0x2a8a4a, { only: 'f' }), D.band('y', 13, 16, 0xf29a2a, { only: 'f' }), D.band('y', 7, 10, 0xd8282a, { only: 'f' }), D.stripes('y', 4, 0.4, 0xd8d6d0, { dir: 'x' })] }, { ch: 0.06 });
    k.box([0, 40, 10.4], [62, 9, 1.4], { c: 0xffffff, m: 'glow', d: [D.txt('24h ハミマート', 0, 0, 5.6, 0x2a8a4a), D.band('x', -31, -26, 0xf29a2a)] }, { ch: 0.1 });
    for (const x of [-22, -8]) k.box([x, 18, 10.4], [13, 24, 0.8], { c: 0xbde4f0, m: 'glass', t: 'glass', d: [D.rect(-6, -6, 6, -4, 0xf2c84a), D.rect(-6, 2, 6, 4, 0xe8402a)] }, { ch: 0 });
    k.box([16, 16, 10.4], [20, 26, 0.8], { c: 0xbde4f0, m: 'glass', t: 'glass', d: [D.line(0, -13, 0, 13, 0.8, 0x8a8a92), D.rect(-8, 2, -2, 4, 0x2a8a4a)] }, { ch: 0 });
    k.box([0, 45, -2], [64, 2, 26], { c: 0x6a6a70, t: 'metal' }, { ch: 0.2 });
    k.box([-24, 49, -8], [8, 6, 6], { c: 0x9a9aa4, t: 'metal', d: [D.stripes('y', 1.4, 0.5, 0x6a6a72, { dir: 'f' })] }, { ch: 0.2 });
    k.box([28, 6, 16], [6, 8, 6], { c: 0x2a6ac8, t: 'gloss', d: [D.rect(-2, 0, 2, 3, 0xffffff)] }, { ch: 0.3 });
  },
  nekotenin(k) {
    k.box([0, 12, 8], [56, 24, 14], { c: 0xf4f2ec, t: 'paper', top: 0xd8d6d0, d: [D.band('y', 6, 8, 0x2a8a4a, { only: 'f' }), D.band('y', 8, 10, 0xf29a2a, { only: 'f' })] }, { ch: 0.1 });
    k.box([-16, 30, 8], [16, 12, 12], { c: 0xe8e6e0, t: 'gloss', d: [D.rect(-6, -1, 6, 4, 0x1a2a1a, { dir: 'f' }), D.txt('¥130', 0, 1.4, 3, 0x6af07a)] }, { ch: 0.2, top: [1, 0.7] });
    k.box([16, 25.6, 12], [7, 3, 4], { c: 0x6a3a1a, t: 'tin', d: [D.band('y', -0.4, 0.4, 0xf2c23a)] }, { ch: 0.2 });
    k.at([4, 0, -8], [0, 0, 0], () => chibi(k, { H: 60, animal: { c: 0x3a3438, ears: 'tri', inner: 0xf4a8b0, whiskers: false, mask: false, d: [D.ell(0, -7, 5, 4, 0xf2f0ea)] },
      face: { eye: 'anime', iris: 0x8ac83a, mouth: 'cat', blush: false, brow: 'sad' }, top: { c: 0x2a8a4a, t: 'cloth' }, outfit: { kind: 'shirt', c2: 0xffffff, d: [D.stripes('y', 3, 1, 0x2f9a52)] },
      sleeve: { c: 0x2a8a4a, t: 'cloth' }, bottom: { c: 0x3a3a44, t: 'cloth' },
      armR: [70, -10, 50], armL: [50, 10, 70], holdR(k) { k.box([0, -2, 2], [3, 6, 4], { c: 0x2a2a30, t: 'gloss', d: [D.rect(-1, 0, 1, 1, 0xe83030, { dir: 'f' })] }, { ch: 0.3 }); k.box([0, 1.4, 5], [0.4, 0.4, 6], { c: 0xff3030, m: 'glow' }, { ch: 0 }); },
      onBody(k, T) { k.box([5, 2, T.hd + 0.4], [5, 3, 0.6], { c: 0xffffff, d: [D.txt('ねこ', 0, 0, 2, 0x2a1c1c)] }, { ch: 0 }); } }));
    k.at([-24, 0, -6], [0, 0, 0], () => k.box([0, 2, 0], [6, 4, 6], 0x2a6ac8));
    k.box([16, 27, 4], [8, 1, 5], { c: 0xc0c0c8, t: 'metal', d: [D.stripes('z', 1, 0.4, 0x9aa0a8, { dir: 't' })] }, { ch: 0.2 });
  },
};

export default {
  id: 'konbini',
  order: 5,
  name: 'Konbini Life',
  jp: 'コンビニライフ',
  tagline: 'Open 24 hours, in your pocket',
  taglineJp: 'いらっしゃいませ〜！',
  price: 300,
  themes: ['food', 'city'],
  card: { bg: '#eef8f0', accent: '#2fae66', text: '#1f3a2c', accent2: '#ff8c2e', pattern: 'stripes' },
  capsule: { colors: [0x3cae5a, 0xff8c2e, 0x5cc4ff, 0xfbf8f2, 0xffd23f] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'onigiri', name: 'Salmon Onigiri', jp: '鮭おにぎり', rarity: 'common',
      desc: 'Pull tab 1, then 2, then 3. The nori still tears. Every. Single. Time.',
      fig: F.onigiri,
    },
    {
      id: 'melonsoda', name: 'Melon Soda', jp: 'メロンソーダ', rarity: 'common',
      desc: 'Tastes of no melon ever grown on Earth. Perfect.',
      fig: F.melonsoda,
    },
    {
      id: 'cancoffee', name: 'Hot Canned Coffee', jp: 'ホット缶コーヒー', rarity: 'common',
      desc: 'Too hot to hold, too precious to put down. A ¥130 hand-warmer.',
      fig: F.cancoffee,
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'oden', name: 'Konbini Oden', jp: 'おでん', rarity: 'uncommon',
      desc: 'Daikon, egg, konnyaku, chikuwa. The broth has been simmering since 1987.',
      fig: F.oden,
    },
    {
      id: 'bento', name: 'Makunouchi Bento', jp: '幕の内弁当', rarity: 'uncommon',
      desc: 'Something for everyone, plus one tiny fish full of soy sauce.',
      fig: F.bento,
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'nikuman', name: 'Nikuman Steamer', jp: '中華まんスチーマー', rarity: 'rare',
      desc: 'One of the buns is not like the others. It is looking at you.',
      fig: F.nikuman,
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'storefront', name: 'Corner Konbini', jp: '街角のコンビニ', rarity: 'ultra',
      desc: 'Open 24 hours, 365 days. You will hear the door chime in your dreams.',
      fig: F.storefront,
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'nekotenin', name: 'Night-Shift Cat Clerk', jp: '深夜のネコ店員', rarity: 'secret',
      desc: 'Scans everything twice just to hear the beep. Accepts payment in fish.',
      fig: F.nekotenin,
    },
  ],
};
