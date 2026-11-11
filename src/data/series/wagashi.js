// Series 14 — Nikoniko Wagashi (にこにこ和菓子)
// Chubby Japanese sweets with little faces: dango, taiyaki, daifuku, dorayaki and friends.
// Nikoniko Wagashi: smiling Japanese sweets as blocky toy figures with painted faces (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { plate, bowl, stick, cute, WOOD, LIGHTWOOD, WHITE } from '../../figures/props.js';

const ANKO = 0x5a2626, MOCHI = 0xfbf7ee;
const F = {
  dango(k) {
    stick(k, [0, 0, 0], [0, 66, 0], 1.6, { c: 0xe6c48a, t: 'wood' });
    const balls = [[0xf4a6b8, 'happy', 'open'], [MOCHI, 'dot', 'smile'], [0x8cc068, 'closed', 'flat']];
    balls.forEach(([c, eye, mouth], i) => k.soft([0, 14 + i * 16, 0], [8.5, 7.6, 8], { c, t: 'plush', d: [cute({ eye, mouth, gap: 3.6, y: 1 })] }, { ch: 0.5, bev: 0.38, bs: 0.7 }));
  },
  taiyaki(k) {
    // a fish-shaped cake lying on its side (body along x, head at -x), the tail bitten off to show the anko
    const sc = (c, o) => { if (((c.x * 0.6 + c.y * 0.9) % 3.2 + 3.2) % 3.2 < 0.55 && c.x > -10 && c.x < 12) { o[0] *= 0.84; o[1] *= 0.8; o[2] *= 0.76; } };
    const side = (dir, s) => [D.circ(-11 * s, 4, 1.9, 0x2a1c1c, { dir }), D.circ(-11.5 * s, 4.7, 0.65, 0xffffff, { dir }), D.arc(-13.5 * s, -1.5, 2.4, 1.6, Math.PI + 0.5, 2 * Math.PI - 0.5, 0.6, 0x5a2a10, { dir }), D.ell(-8 * s, -1.5, 1.7, 1, 0xf49aa0, { dir, alpha: 0.75 }), D.arc(-6 * s, 1, 4, 7, s > 0 ? -1.2 : Math.PI - 1.2 + 2.4 - 2.4, s > 0 ? 1.2 : Math.PI + 1.2, 0.5, 0x8a4a14, { dir })];
    const B = { c: 0xd8913a, t: 'crust', c2: 0x9a5418, fn: sc, d: [side('f', 1), side('b', -1)] };
    const R = [0, 0, Math.PI / 2];
    k.prism([[-14, 4, 3.2, 0, 0, 0.5], [-8, 9, 5, 0, 0, 0.5], [6, 10.5, 5.6, 0, 0, 0.5], [13, 7, 4.6, 0, 0, 0.5], [17.5, 2.6, 3, 0, 0, 0.5]], B, { pos: [0, 12, 0], rot: R, pf: true });
    k.prism([[-22, 8, 2.2, 0, 0, 0.4], [-14, 3.4, 2.8, 0, 0, 0.4]], { ...B, bot: ANKO, d: [D.stripes('y', 2.6, 0.5, 0x9a5418)] }, { pos: [0, 12, 0], rot: R, pf: true, caps: 'bot' });
    k.box([0, 22.5, 0], [16, 4, 3], { c: 0xd8913a, t: 'crust', c2: 0x9a5418, d: [D.stripes('x', 2.4, 0.5, 0x9a5418)] }, { ch: 0.4, top: [0.7, 0.6] });
    k.box([2, 1.5, 0], [10, 3, 2.4], { c: 0xd8913a, t: 'crust' }, { ch: 0.4, top: [1, 0.6] });
  },
  ichigo(k) {
    k.soft([0, 11, 0], [14, 11, 13], { c: MOCHI, t: 'plush', d: [cute({ y: 4, gap: 6, er: 1.6, eh: 2, mouth: 'smile', mw: 3 }), D.ell(0, -9, 12, 3, 0xf0e8dc)] }, { flat: true, ch: 0.5, bev: 0.42, bs: 0.72 });
    k.prism([[0, 5, 4.6, 0, 0, 0.586], [5, 6, 5.5, 0, 0, 0.586], [13, 1.6, 1.6, 0, 0, 0.586]], { c: 0xe8303a, t: 'gloss', m: 'gloss', d: [D.dots(2.6, 0.45, 0xf6e27a)] }, { pos: [0, 20, 0], rot: [0.15, 0, -0.1] });
    k.at([0, 21, 0], [0.15, 0, -0.1], () => { for (let i = 0; i < 5; i++) k.box([0, 0, 0], [2.4, 1, 8], { c: 0x3f9a3a }, { rot: [0, (i * Math.PI * 2) / 5, 0], ch: 0.4, top: [0.5, 0.7], pos: [0, 0, 0] }); });
  },
  dorayaki(k) {
    const P = { c: 0xb8662a, t: 'crust', c2: 0x7a3a12, side: 0xe8b874 };
    k.mirror(() => k.box([5, 7, 1], [5, 14, 6], { c: 0xb8662a, t: 'crust' }, { ch: 0.45, rot: [0.3, 0, 0] }));
    k.at([0, 32, 0], [Math.PI / 2, 0, 0], () => {
      k.cyl([0, 4, 0], 18, 6, { ...P, d: [cute({ y: 1, gap: 6, er: 1.8, eh: 2.2, mouth: 'open', mw: 3.4, dir: 't' })].map((d) => d) }, { pf: false });
      k.cyl([0, 0, 0], 16.5, 3.4, { c: ANKO, t: 'clay' });
      k.cyl([0, -4, 0], 18, 6, P);
    });
    k.mirror(() => k.box([20, 30, 0], [8, 5, 5], { c: 0xb8662a, t: 'crust' }, { ch: 0.45, rot: [0, 0, 0.6] }));
  },
  sakura(k) {
    k.at([0, 0, 0], [0, 0, 0], () => {
      k.soft([0, 11, 0], [20, 11, 12], { c: 0xf6b6c8, t: 'plush', d: [cute({ eye: 'closed', mouth: 'cat', y: 2, gap: 5, x: 6 }), D.dots(1.8, 0.35, 0xe896aa, { dir: 't' })] }, { flat: true, ch: 0.5, bev: 0.4, bs: 0.7 });
      // the salted cherry leaf, wrapped like a futon over the back half
      k.box([-3, 13, -5], [34, 26, 14], { c: 0x6f9a42, t: 'felt', d: [D.line(-13, 0, 13, 0, 0.8, 0x4f7a2a, { dir: 'f' }), D.stripes('d', 4, 0.5, 0x5a8a36)] }, { ch: 0.5, top: [0.85, 0.9] });
      k.box([12, 22.5, 4], [10, 1.2, 8], { c: 0xf6e8ee, d: [D.star(0, 0, 3, 0xf49ab0, { dir: 't', n: 5, inner: 0.55 })] }, { ch: 0.4 });
    });
  },
  kakigori(k) {
    k.cyl([0, 4, 0], 9, 8, { c: 0xd8eef6, m: 'glass', t: 'glass' }, { top: 0.7 });
    k.cyl([0, 12, 0], 16, 8, { c: 0xd8eef6, m: 'glass', t: 'glass' }, { top: 1.15 });
    k.prism([[0, 17, 17, 0, 0, 0.586], [10, 15, 15, 0, 0, 0.586], [22, 8, 8, 0, 0, 0.586], [28, 2, 2, 0, 0, 0.586]], { c: 0x9ccf6a, t: 'foam', d: [D.dots(3.4, 0.9, ANKO, { dir: 'f' }), D.fn('t', (c, o) => { if (c.y > 18) { o[0] = 236; o[1] = 246; o[2] = 228; } })] }, { pos: [0, 16, 0] });
    for (const [x, y, z, e] of [[-8, 26, 8, 'happy'], [6, 34, 6, 'dot'], [0, 44, 0, 'closed']]) k.soft([x, y, z], [4, 3.6, 4], { c: WHITE, t: 'plush', d: [cute({ eye: e, gap: 1.6, er: 0.6, eh: 0.8, mouth: 'smile', mw: 1.2, my: -1.2, br: 0.6, hatch: false })] }, { ch: 0.5, bev: 0.4, bs: 0.7 });
    k.box([-12, 22, 6], [2, 18, 2], { c: 0xf0c8d8, t: 'gloss' }, { ch: 0.4, rot: [0, 0, 0.5] });
  },
  chakai(k) {
    k.box([0, 2, 0], [60, 4, 34], { c: 0xc8a868, t: 'tatami', d: [D.band('z', -17, -15.5, 0x2a3a2a), D.band('z', 15.5, 17, 0x2a3a2a)] }, { ch: 0.15 });
    // the matcha bowl, bowing (a face on the bowl), whisk beside
    k.at([-12, 4, 0], [0.35, 0.3, 0], () => {
      k.prism([[0, 7, 7, 0, 0, 0.586], [4, 11, 11, 0, 0, 0.586], [14, 12.5, 12.5, 0, 0, 0.586]], { c: 0x5a4a3e, t: 'clay', d: [cute({ y: 8, gap: 4, mouth: 'smile' }), D.band('y', 12, 13, 0x8a7a6a)] }, { caps: 'bot' });
      k.cyl([0, 12.6, 0], 11.8, 0.8, { c: 0x7ab84a, t: 'foam' });
    });
    k.cyl([2, 7, 9], 3, 5, { c: 0xe6d4a4, t: 'wood', d: [D.stripes('r', 1, 0.4, 0xb8a070)] }, { top: 1.4 });
    k.cyl([2, 12, 9], 1.2, 6, { c: 0xe6d4a4, t: 'wood' });
    // the nerikiri on its little plate, bowing back
    plate(k, [14, 4, 0], 8, { c: 0x2a2a30, t: 'lacquer' });
    k.at([14, 7, 0], [0.35, -0.3, 0], () => k.soft([0, 5, 0], [6.5, 5, 6.5], { c: 0xf4a6c0, t: 'plush', d: [D.star(0, 0, 4.6, 0xfac8da, { dir: 't', n: 5, inner: 0.6 }), D.circ(0, 0, 1.2, 0xf6e27a, { dir: 't' }), cute({ y: 0.5, gap: 2.4, er: 0.8, eh: 1, mw: 1.4, my: -1.8 })] }, { ch: 0.586, bev: 0.4, bs: 0.7 }));
  },
  shiruko(k) {
    bowl(k, [0, 0, 0], 22, 18, { c: 0x2a2226, t: 'lacquer', d: [D.band('y', 14, 18, 0xa8282a)] }, { c: 0x6a2a24, t: 'clay', d: [D.dots(3, 0.9, 0x4a1a18, { dir: 't' })] });
    for (const [x, z, e, towel] of [[-8, 2, 'closed', true], [7, -4, 'happy', false], [3, 9, 'line', false]]) {
      k.soft([x, 19.5, z], [5, 3.6, 5], { c: WHITE, t: 'plush', d: [cute({ eye: e, gap: 2, er: 0.7, eh: 0.9, mouth: 'cat', mw: 1.4, my: -1, br: 0.7, hatch: false })] }, { ch: 0.5, bev: 0.42, bs: 0.7 });
      if (towel) k.box([x, 23.6, z], [6, 1.4, 4], { c: 0xffffff, t: 'cloth', d: [D.stripes('x', 2, 0.6, 0x7ab8e8)] }, { ch: 0.4 });
    }
    k.box([18, 26, -4], [3, 8, 3], { c: 0xe8e0d0 }, { ch: 0.4, rot: [0, 0, -0.3] });
  },
};

export default {
  id: 'wagashi',
  order: 14,
  name: 'Nikoniko Wagashi',
  jp: 'にこにこわがし',
  tagline: 'Smiling traditional Japanese sweets',
  taglineJp: 'あまくて、もちもち、にっこにこ',
  price: 200,
  themes: ['food', 'candy', 'cute'],
  card: { bg: '#f8efe0', accent: '#e8789a', text: '#4a2630', accent2: '#6f9a4a', pattern: 'sakura' },
  capsule: { colors: [0xffc2d4, 0xa8d08a, 0xfffaf0, 0x8a4a52, 0xf2d48a] },
  items: [
    {
      id: 'dango', name: 'Hanami Dango Trio', jp: '三色だんご', rarity: 'common',
      desc: 'Pink is the leader, white keeps the peace, green just wants a nap.',
      fig: F.dango,
    },
    {
      id: 'taiyaki', name: 'Taiyaki-kun', jp: 'たい焼きくん', rarity: 'common',
      desc: 'Bravely gave up its tail so you could see the anko. Hero of the snack stall.',
      fig: F.taiyaki,
    },
    {
      id: 'ichigo', name: 'Ichigo Daifuku', jp: 'いちご大福', rarity: 'common',
      desc: 'Soft on the outside, sweet on the inside, strawberry on top. A perfect citizen.',
      fig: F.ichigo,
    },
    {
      id: 'dorayaki', name: 'Dorayaki Walker', jp: 'てくてくどら焼き', rarity: 'uncommon',
      desc: 'Got up and walked out of the bakery. Nobody has the heart to stop it.',
      fig: F.dorayaki,
    },
    {
      id: 'sakura', name: 'Sakura Mochi', jp: '桜もち', rarity: 'uncommon',
      desc: 'Wrapped in a salted cherry leaf like a cosy futon. Do not wake before spring.',
      fig: F.sakura,
    },
    {
      id: 'kakigori', name: 'Uji Kintoki Kakigori', jp: '宇治金時かき氷', rarity: 'rare',
      desc: 'A mountain of matcha ice with three shiratama climbers. Brain freeze summit.',
      fig: F.kakigori,
    },
    {
      id: 'chakai', name: 'Tea Ceremony Set', jp: 'お茶会セット', rarity: 'ultra',
      desc: 'Matcha-bowl-san bows three times. The nerikiri bows back. This takes an hour.',
      fig: F.chakai,
    },
    {
      id: 'shiruko', name: 'Shiratama Onsen', jp: 'おしるこ温泉', rarity: 'secret',
      desc: 'The water is 90% red beans. Locals swear it is wonderful for the skin.',
      fig: F.shiruko,
    },
  ],
};
