// Series 2 — Tiny Shokudō (ミニチュア食堂)
// Hyper-real miniature diner food, in the spirit of plastic food-sample (shokuhin sampuru) capsule toys.
// Tiny Shokudō: diner food replicas (shokuhin sanpuru) as blocky toy figures with painted detail (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { plate, bowl, stick, chopsticks, lantern, noren, cute, WOOD, LIGHTWOOD, DARKWOOD, WHITE } from '../../figures/props.js';

const RICE = { c: 0xfbf8f0, t: 'rice' }, NORI = 0x1e2a22;
const onigiri = (k, pos, rot, fill, top) => k.at(pos, rot, () => {
  k.prism([[0, 10, 5.5, 0, 0, 0.5], [7, 9.6, 5.6, 0, 0, 0.5], [17, 2.6, 4.4, 0, 0, 0.6]], { ...RICE, d: [D.rect(-5, -1, 5, 7, NORI, { dir: 'f' }), D.rect(-5, -1, 5, 7, NORI, { dir: 'b' }), D.band('y', -1, 1.2, NORI), fill ? D.circ(0, 12, 2.2, fill, { dir: 'f' }) : null], top: top ?? undefined });
});
const F = {
  onigiri(k) {
    k.box([0, 1, 0], [56, 2, 30], { c: 0x6a9a3a, t: 'felt', d: [D.line(-26, 0, 26, 0, 0.8, 0x4a7a2a, { dir: 't' }), D.stripes('d', 5, 0.5, 0x5a8a32, { dir: 't' })] }, { ch: 0.5 });
    onigiri(k, [-16, 2, 2], [0, 0.3, 0], 0xc8303a);
    onigiri(k, [0, 2, -3], [0, 0, 0], 0xf08a6a);
    k.at([16, 2, 2], [0, -0.3, 0], () => k.prism([[0, 10, 5.5, 0, 0, 0.5], [7, 9.6, 5.6, 0, 0, 0.5], [17, 2.6, 4.4, 0, 0, 0.6]], { c: 0xd8a050, t: 'crust', c2: 0x9a5a1c, d: [D.band('y', -1, 1.2, 0x8a4a14)] }));
  },
  tamago(k) {
    k.box([0, 3, 0], [56, 6, 34], { c: 0xe6c88e, t: 'wood', ga: 'x' }, { ch: 0.15 });
    const T = { c: 0xf6d040, t: 'plush', side: 0xf2c430, d: [D.fn('x', (c, o) => { const r = Math.hypot(c.y - 6, c.z); if (((r * 0.9) % 2.2) < 0.45) { o[0] *= 0.82; o[1] *= 0.72; o[2] *= 0.6; } })] };
    for (let i = 0; i < 4; i++) k.soft([-16 + i * 9.5, 12, 0], [4.2, 6, 9], { ...T, d: [...T.d, D.fn('t', (c, o) => { if ((Math.floor(c.z * 0.5) & 1)) { o[0] *= 0.94; o[1] *= 0.9; o[2] *= 0.8; } })] }, { flat: true, ch: 0.4, bev: 0.3, bs: 0.8, rot: [0, 0, i * 0.05 - 0.08] });
    k.soft([20, 9, 4], [6, 3.4, 5], { c: 0xfbfbf4, t: 'foam' }, { flat: true, ch: 0.586, bev: 0.5, bs: 0.6 });
    k.box([20, 13, 4], [3, 1, 3], 0x5a8a3a, { ch: 0.4 });
  },
  takoyaki(k) {
    k.box([0, 3, 0], [54, 6, 30], { c: 0xe6cc96, t: 'wood', ga: 'x', top: 0xd8b880 }, { ch: 0.25, top: [0.88, 0.84] });
    const B = { c: 0x8a4a1c, t: 'crust', c2: 0x4a2208, d: [D.path([[-5, 1], [-2, 3], [1, 0], [4, 3]], 0.8, 0xfaf6e6, { dir: 't' }), D.dots(2, 0.4, 0x3a8a2a, { dir: 't' })] };
    for (let i = 0; i < 6; i++) k.soft([-17 + (i % 3) * 17, 10.5, i < 3 ? -6 : 7], [7, 6, 7], B, { ch: 0.586, bev: 0.4, bs: 0.7 });
    for (let i = 0; i < 9; i++) k.box([-14 + (i * 37) % 30, 17 + (i % 3) * 0.6, -7 + ((i * 13) % 14)], [3.2, 0.6, 2.4], { c: 0xf0b8a0, t: 'paper' }, { ch: 0.1, rot: [(i % 3) * 0.4, i * 0.7, (i % 2) * 0.5] });
    stick(k, [14, 12, 8], [24, 22, 12], 0.9);
  },
  ramen(k) {
    bowl(k, [0, 0, 0], 24, 20, { c: 0xc8302a, t: 'ceramic', d: [D.band('y', 2, 3.4, WHITE), D.fn('*', (c, o) => { if (c.y > 8 && c.y < 15) { const a = ((Math.atan2(c.z, c.x) + 3.15) * 6) % 2; if ((a < 0.25 || (c.y > 11.2 && c.y < 11.8)) && a < 1.6) { o[0] = 250; o[1] = 246; o[2] = 236; } } })] }, { c: 0xc88a3a, t: 'water', d: [D.circ(-9, 5, 4, 0xf6e6d0, { dir: 't' }), D.ring(-9, 5, 1.8, 0.6, 0xe8507a, { dir: 't' })] });
    k.box([8, 21, -5], [12, 2, 8], { c: 0xc87a4a, t: 'crust', c2: 0x8a4a1c, d: [D.ring(0, 0, 3, 0.5, 0xf0d0b0, { dir: 't' })] }, { ch: 0.4, rot: [0.2, 0.2, 0] });
    k.soft([-6, 21, -9], [4, 2.4, 3.4], { c: 0xfbfbf2, d: [D.circ(0, 0, 2.2, 0xf2a020, { dir: 't' })] }, { ch: 0.5 });
    k.box([0, 26, -16], [16, 14, 0.8], { c: NORI, t: 'paper' }, { ch: 0.05, rot: [-0.2, 0, 0] });
    // the noodle lift, frozen forever
    for (let i = 0; i < 7; i++) k.box([-2 + i * 1.3, 32, 2 + Math.sin(i) * 0.6], [1, 22, 1], { c: 0xf2d890, t: 'gloss' }, { ch: 0.3, rot: [0, 0, Math.sin(i * 1.7) * 0.06] });
    chopsticks(k, [2, 42, 0], [24, 58, 6]);
  },
  soba(k) {
    k.box([0, 2, 0], [60, 4, 36], { c: 0x2a2226, t: 'lacquer', top: 0x3a2a2a }, { ch: 0.2 });
    bowl(k, [-12, 4, 0], 15, 13, { c: 0x2a2a30, t: 'lacquer', d: [D.band('y', 9, 13, 0xa8282a)] }, { c: 0x7a4a24, t: 'water' });
    for (let i = 0; i < 6; i++) k.box([-14 + i * 1.6, 17.4, -4 + i], [1, 0.8, 16], { c: 0x9a8a72, t: 'flat' }, { ch: 0.3, rot: [0, 0.3, 0] });
    for (const [z, r] of [[-3, 0.7], [4, 0.4]]) k.at([-10, 22, z], [0, r, -0.5], () => { k.box([0, 0, 0], [22, 6, 6], { c: 0xf2c870, t: 'crust', c2: 0xb87a2a }, { ch: 0.5, top: [0.9, 0.8] }); k.box([13, 0, 0], [5, 6, 2], { c: 0xe8502a, t: 'gloss' }, { ch: 0.4, top: [1.4, 1] }); });
    k.box([-2, 20, -9], [9, 2.4, 2.4], { c: 0x4a9a2a, t: 'gloss' }, { ch: 0.5, rot: [0, 0.5, 0.3] });
    k.cyl([16, 9, -6], 7, 10, { c: 0xe8e0d0, t: 'ceramic', d: [D.band('y', 2, 3, 0x2a3a6a), D.dots(2.6, 0.5, 0x2a3a6a, { dir: '*' })] }, { top: 1.1 });
    k.cyl([16, 13.4, -6], 6.6, 0.8, { c: 0x3a2214, t: 'water' });
    chopsticks(k, [4, 5, 13], [26, 5, 13]);
  },
  omurice(k) {
    plate(k, [0, 0, 0], 24, { c: WHITE, t: 'ceramic' }, { rz: 16 });
    k.soft([0, 9, 0], [17, 6.4, 10], { c: 0xf6d040, t: 'plush', d: [D.heart(0, 1, 5, 0xd8282a, { dir: 't' }), D.fn('t', (c, o) => { if (Math.abs(c.x) > 13) { o[0] *= 0.93; o[1] *= 0.88; } })] }, { flat: true, ch: 0.586, bev: 0.5, bs: 0.62 });
    k.soft([16, 4.6, 7], [5, 2.6, 4], { c: 0x6aa83a, t: 'felt' }, { ch: 0.5 });
    stick(k, [2, 12, 0], [2, 34, 0], 0.8);
    k.box([7.5, 30, 0], [11, 7, 0.4], { c: WHITE, d: [D.circ(0, 0, 2.2, 0xd8282a), D.circ(0, 0, 2.2, 0xd8282a, { dir: 'b' })] }, { ch: 0 });
  },
  sushi(k) {
    k.box([0, 6, 0], [64, 3, 26], { c: 0xe6c88e, t: 'wood', ga: 'x' }, { ch: 0.15 });
    k.mirror(() => k.box([22, 2.4, 0], [4, 4.8, 24], { c: 0xd8b878, t: 'wood' }, { ch: 0.15 }));
    const nigiri = (x, top, d = []) => { k.soft([x, 11, 0], [4.4, 3.2, 7], RICE, { flat: true, ch: 0.5, bev: 0.4 }); k.box([x, 14.6, 0], [10, 2.2, 15], { c: top, t: 'gloss', m: 'gloss', d }, { ch: 0.5, rot: [0, 0, 0.05] }); };
    nigiri(-24, 0xd02838, [D.stripes('d', 3, 0.5, 0xf06070, { dir: 't' })]);
    nigiri(-12, 0xf6905a, [D.stripes('e', 2.6, 0.7, 0xfde0cc, { dir: 't' })]);
    nigiri(0, 0xf6d040, [D.band('z', -1.6, 1.6, NORI)]);
    nigiri(12, 0xf4f0ec, [D.stripes('z', 3, 1.4, 0xf06a3a, { dir: 't' })]);
    k.soft([24, 11, 4], [5, 2.6, 5], { c: 0xf8c0b8, t: 'felt' }, { flat: true });
    k.soft([24, 10, -6], [2.4, 1.6, 2.4], { c: 0x7ab83a, t: 'plush' }, { flat: true });
  },
  yatai(k) {
    // a night food cart with a noren and a red lantern, a cat cooking behind the counter
    const W = { c: 0xa0703a, t: 'wood', ga: 'x' };
    k.box([0, 14, 4], [56, 20, 18], { ...W, d: [D.stripes('x', 7, 0.6, 0x6a4420, { dir: 'f' })] }, { ch: 0.12 });
    k.box([0, 25, 7], [60, 2, 22], { c: 0x7a5230, t: 'wood', ga: 'x' }, { ch: 0.15 });
    k.mirror(() => { k.cyl([24, 4, 10], 4, 2.4, { c: 0x4a3a2a, t: 'wood', d: [D.stripes('r', 2, 0.5, 0x2a2018)] }, { rot: [0, 0, Math.PI / 2] }); k.box([27, 46, -4], [2, 66, 2], W, { ch: 0.2 }); });
    k.box([0, 80, -2], [64, 3, 34], { c: 0x3a3a40, t: 'metal', d: [D.stripes('x', 4, 0.6, 0x2a2a30, { dir: 't' })] }, { ch: 0.15, rot: [0.15, 0, 0] });
    noren(k, [0, 77, 13], 50, 9, 0x2a3a6a, 'おでん');
    lantern(k, [24, 60, 15], 4.4, 11, 0xe8402a, 'ネコ');
    k.at([0, 14, -6], [0, 0, 0], () => chibi(k, { H: 50, animal: { c: 0xf2f0ea, ears: 'tri', inner: 0xf4a8b0, whiskers: true, d: [D.ell(-8, 6, 5, 4, 0x3a3230), D.ell(9, 8, 4, 3, 0xe8893a)] },
      face: { eye: 'happy', mouth: 'cat', mw: 2.2 }, top: { c: 0xfaf8f2, t: 'cloth' }, outfit: { kind: 'kimono', collar: 0x2a3a6a, obi: 0x2a3a6a, obiC: 0xfaf8f2 },
      hat: { kind: 'band', c: 0x2a3a6a, p: { c: 0xfaf8f2, t: 'cloth', d: [D.stripes('x', 3, 1, 0x2a3a6a)] } }, armL: [60, 10, 40], armR: [60, -10, 40] }));
    for (let i = 0; i < 3; i++) k.soft([-12 + i * 8, 27.5, 12], [3, 2, 3], { c: [0xf2e0b0, 0x8a6a3a, 0xf6f0e0][i], t: 'plush' }, { ch: 0.5 });
  },
};

export default {
  id: 'shokudo',
  order: 2,
  name: 'Tiny Shokudō',
  jp: 'ミニチュア食堂',
  tagline: 'Hyper-real miniature diner food',
  taglineJp: '本物そっくり！食品サンプル',
  price: 200,
  themes: ['food', 'retro'],
  card: { bg: '#fff3d6', accent: '#e34234', text: '#3a2410', accent2: '#2f6fd6', pattern: 'checker' },
  capsule: { colors: [0xffd447, 0xe34234, 0xfbf8f2, 0x8fb85a, 0xf2c27b] },
  items: [
    // ------------------------------------------------------------ 1. onigiri
    {
      id: 'onigiri', name: 'Onigiri Trio', jp: 'おにぎり三兄弟', rarity: 'common',
      desc: 'Ume, salmon and grilled. Hand-pressed by a grandma who says "eat more".',
      fig: F.onigiri,
    },
    // ------------------------------------------------------------ 2. tamagoyaki
    {
      id: 'tamago', name: 'Tamagoyaki Board', jp: '玉子焼き', rarity: 'common',
      desc: 'Rolled omelette, sliced on a hinoki board. Sweet style, as is tradition.',
      fig: F.tamago,
    },
    // ------------------------------------------------------------ 3. takoyaki
    {
      id: 'takoyaki', name: 'Takoyaki Boat', jp: 'たこ焼き舟', rarity: 'common',
      desc: 'Six octopus balls at the temperature of the sun. Bonito flakes still dancing.',
      fig: F.takoyaki,
    },
    // ------------------------------------------------------------ 4. ramen
    {
      id: 'ramen', name: 'Shoyu Ramen', jp: '醤油ラーメン', rarity: 'uncommon',
      desc: 'The noodle lift is frozen forever. The chopsticks are tired.',
      fig: F.ramen,
    },
    // ------------------------------------------------------------ 5. tempura soba
    {
      id: 'soba', name: 'Ebi Tempura Soba Set', jp: '天ざるそば', rarity: 'uncommon',
      desc: 'Two prawns, one shishito, zero regrets. Slurping loudly is good manners.',
      fig: F.soba,
    },
    // ------------------------------------------------------------ 6. omurice
    {
      id: 'omurice', name: 'Ketchup-Heart Omurice', jp: 'オムライス', rarity: 'rare',
      desc: 'Comes with a flag. Every adult who orders it secretly wants the flag.',
      fig: F.omurice,
    },
    // ------------------------------------------------------------ 7. sushi geta
    {
      id: 'sushi', name: 'Sushi Geta Platter', jp: '寿司下駄盛り', rarity: 'ultra',
      desc: 'Chef’s choice. The chef chose “all the good ones”.',
      fig: F.sushi,
    },
    // ------------------------------------------------------------ 8. neko yatai (secret)
    {
      id: 'yatai', name: 'Neko Yatai', jp: 'ねこ屋台', rarity: 'secret',
      desc: 'Opens at midnight. Accepts payment in dried sardines only.',
      fig: F.yatai,
    },
  ],
};
