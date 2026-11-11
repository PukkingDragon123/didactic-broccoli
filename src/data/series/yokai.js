// Series 7 — Yurui Yōkai (ゆるい妖怪)
// Cute, slightly spooky folklore spirits. Mostly harmless. Mostly.
// Yurui Yōkai: gentle folk monsters as blocky chibi figures (the human kit) with painted faces and costumes.
import { chibi, beast, tail, D } from '../../figures/chibi.js';
import { lantern, stick, cute, WOOD, WHITE } from '../../figures/props.js';

const F = {
  chochin(k) {
    k.soft([0, 26, 0], [13, 18, 13], { c: 0xf2e6c8, t: 'paper', d: [D.stripes('y', 3.2, 0.6, 0xb8a888), D.fn('f', (c, o) => { if (c.b < -2 && c.b > -14 && Math.abs(c.a + 2) < 7 && (c.b + 8) * (c.b + 8) / 30 + (c.a + 2) * (c.a + 2) / 50 < 1) { o[0] = 120; o[1] = 30; o[2] = 36; } }),
      D.circ(2, 6, 4.4, 0xffffff, { ink: 0x2a1c1c, iw: 0.7 }), D.circ(3, 6, 2, 0x2a1c1c), D.circ(2.2, 6.8, 0.7, 0xffffff), D.ell(-3.4, -10, 3, 4, 0xe8506a, { dir: 'f' })] }, { ch: 0.586, bev: 0.25 });
    k.cyl([0, 45, 0], 8, 3, { c: 0x1a1a1e }); k.cyl([0, 7.4, 0], 8, 3, { c: 0x1a1a1e });
    k.mirror(() => k.box([5, 3, 1], [3, 6, 4], { c: 0x1a1a1e }, { ch: 0.4 }));
    k.box([-3, 12, 13], [5, 9, 1.4], { c: 0xe8506a, t: 'gloss' }, { ch: 0.5, rot: [0.4, 0, 0] });
    stick(k, [0, 46, 0], [0, 54, 0], 1.6, { c: 0x2a2a30 });
  },
  kappa(k) {
    chibi(k, { H: 60, skin: 0x7ab84a, hair: 'short', hairC: 0x3a6a2a, face: { eye: 'dot', er: 2, eh: 2.4, mouth: 'none', y: -1 }, head: [6, 0, 0], lean: 8,
      top: { c: 0x7ab84a, t: 'gloss', d: [D.rect(-6, -6, 6, 6, 0xd8c070, { r: 2 }), D.stripes('y', 3, 0.5, 0xb89a50, { dir: 'f' })] }, sleeve: { c: 0x7ab84a, t: 'gloss' }, bottom: { c: 0x7ab84a, t: 'gloss' }, shoes: 0x6aa83a, sole: 0x5a8a2a, gloves: { c: 0x7ab84a },
      onBody(k, T) { k.box([0, 0, -T.hd - 2], [T.hw * 1.9, T.hh * 1.8, 4], { c: 0x5a7a3a, t: 'scales' }, { ch: 0.4 }); },
      onHead(k, H) { k.cyl([0, H.hy + H.hh + 0.6, 0], 7.4, 1.6, { c: 0xe8f0f2, t: 'gloss', m: 'gloss' }); k.box([0, H.hy - 5, H.hd + 2], [7, 3, 4], { c: 0xf2c23a, t: 'gloss' }, { ch: 0.4, top: [0.8, 0.6] }); for (const [x, z] of [[9, 8], [-8, 10], [3, 14]]) k.box([x, H.hy + H.hh + 3 - z * 0.4, z], [1.4, 1.4, 1.4], { c: 0x9ad8f8, m: 'glass' }, { ch: 0.5 }); },
      armL: [60, 10, 40], armR: [60, -10, 40], holdL(k) { k.box([0, -4, 4], [3.4, 3.4, 14], { c: 0x3a8a2a, t: 'gloss', d: [D.dots(1.6, 0.3, 0x2a6a1a)] }, { ch: 0.5, rot: [0, 0.6, 0] }); } });
  },
  hitotsume(k) {
    chibi(k, { H: 58, skin: 0xf2d8c0, hair: 'buzz', hairC: 0x2a2220, face: { eye: 'none', mouth: 'open', mw: 3.6, blush: true }, faceD: [D.ell(0, 0, 4.6, 4.6, 0xffffff, { ink: 0x2a1c1c, iw: 0.6 }), D.circ(0.8, -0.4, 2.6, 0x4a2a1a), D.circ(1.6, 0.6, 0.9, 0xffffff)],
      top: { c: 0x6a7ab8, t: 'cloth', d: [D.check(3, 0x5a6aa8)] }, outfit: { kind: 'kimono', collar: 0xf4efe4, obi: 0xf2c23a, obiC: 0xc8302a }, sleeve: { c: 0x6a7ab8, t: 'cloth' }, legs: 'shorts', bottom: { c: 0x6a7ab8, t: 'cloth' }, shoes: 0xd8b878, sole: 0x8a6a3a,
      armL: [100, 30, 20], armR: [100, -30, 20], onHead(k, H) { k.box([0, H.hy - 9, H.hd + 1], [4, 1.2, 6], { c: 0xe8506a, t: 'gloss' }, { ch: 0.5, rot: [0.6, 0, 0] }); } });
  },
  kitsune(k) {
    k.cyl([0, 2, 0], 20, 4, { c: 0x8a8a90, t: 'stone' });
    beast(k, 'sit', { c: 0xf2f0ea, c2: 0xffffff, size: 1.35, ears: 'tri', inner: 0xe8506a, tail: 'none', face: { eye: 'happy', mouth: 'cat' }, headD: [D.poly([[-4, 3], [-7, 7], [-3, 6]], 0xe8506a, { dir: 'f' }), D.poly([[4, 3], [7, 7], [3, 6]], 0xe8506a, { dir: 'f' })],
      onBody(k, b) { for (const a of [-0.5, 0, 0.5]) k.at([0, 6, -b.bd / 2], [-0.8, a, 0], () => { k.box([0, 0, -6], [5, 5, 14], { c: 0xf2f0ea, t: 'fur' }, { ch: 0.5, top: [1.2, 1.1] }); k.soft([0, 1, -15], [3.6, 4, 3.6], { c: 0x6ac8ff, m: 'glow' }, { ch: 0.586 }); k.box([0, 6, -15], [2, 5, 2], { c: 0xb8eaff, m: 'glow' }, { ch: 0.5, top: [0.2, 0.2] }); }); } });
    k.at([12, 14, 10], [0, 0, 0], () => { stick(k, [0, 0, 0], [0, 10, 0], 0.8); k.box([0, 12, 0], [5, 3, 3], { c: 0xd8a04a, t: 'crust', c2: 0xa86a2a }, { ch: 0.4 }); });
  },
  tengu(k) {
    chibi(k, { H: 62, skin: 0x2a2a34, face: { eye: 'angry', mouth: 'none', blush: false, y: 1 }, hair: 'bald', top: { c: 0xf4f0e6, t: 'cloth' }, outfit: { kind: 'kimono', collar: 0xf4f0e6, obi: 0x2a2a30, obiC: 0xc8302a },
      faceD: [D.circ(-6, -4, 1.4, 0xf2f0ea), D.circ(-2, -4, 1.4, 0xf2f0ea), D.circ(2, -4, 1.4, 0xf2f0ea), D.circ(6, -4, 1.4, 0xf2f0ea)].slice(0, 0),
      sleeve: { c: 0xf4f0e6, t: 'cloth' }, legs: 'hakama', bottom: { c: 0x3a4a6a, t: 'cloth' }, shoes: 0xa87a4a, sole: 0x6a4a2a,
      armR: [60, -30, 60], armL: [30, 20, 30],
      holdR(k) { stick(k, [0, -1, 0], [0, -1, 6], 1, { c: 0x8a6a3a }); k.box([0, 0, 13], [12, 1, 14], { c: 0x6ab84a, t: 'felt', d: [D.stripes('x', 2.4, 0.5, 0x4a8a2a, { dir: 't' })] }, { ch: 0.4, top: [1, 1] }); },
      onBody(k, T) { k.mirror(() => k.box([7, 3, -T.hd - 2], [16, 22, 2], { c: 0x1e1e2a, t: 'feather' }, { ch: 0.3, rot: [0, -0.3, -0.35], top: [0.6, 1] })); },
      onHead(k, H) { k.box([0, H.hy - 4, H.hd + 4], [7, 5, 9], { c: 0xf2c23a, t: 'gloss' }, { ch: 0.4, top: [0.5, 0.3], sh: [0, 2] }); k.box([0, H.hy + H.hh + 1.6, 4], [4, 4, 4], { c: 0x1a1a1e, t: 'cloth' }, { ch: 0.3, rot: [0, 0.78, 0] }); } });
  },
  zashiki(k) {
    chibi(k, { H: 58, hair: 'hime', hairC: 0x1a1414, face: { eye: 'anime', iris: 0x3a2a2a, mouth: 'smile' }, top: { c: 0xc8302a, t: 'cloth', d: [D.dots(4, 0.9, 0xf6c0c8, { dir: '*' })] }, outfit: { kind: 'kimono', collar: 0xf4efe4, obi: 0xf2c23a, obiC: 0xc8302a },
      sleeve: { c: 0xc8302a, t: 'cloth', d: [D.dots(4, 0.9, 0xf6c0c8, { dir: '*' })] }, legs: 'robe', bottom: { c: 0xc8302a, t: 'cloth', d: [D.dots(4, 0.9, 0xf6c0c8, { dir: '*' })] }, shoes: 0xf4efe4,
      armL: [70, 10, 50], armR: [70, -10, 50], holdL(k) { k.soft([0, -2, 3], [3, 3, 3], { c: 0xf6e6c8, t: 'paper', d: [D.stripes('y', 1.4, 0.4, 0xe8506a)] }, { ch: 0.586 }); } });
    k.box([16, 2, 6], [10, 4, 10], { c: 0xd8a868, t: 'crust' }, { ch: 0.4 });
  },
  nekomata(k) {
    chibi(k, { H: 60, animal: { c: 0xf2f0ea, ears: 'tri', inner: 0xf4a8b0, whiskers: true, d: [D.ell(-9, 7, 6, 4, 0xe8893a), D.ell(9, 9, 4, 3, 0x3a3230)] }, face: { eye: 'happy', mouth: 'open' },
      top: { c: 0x4a6ab8, t: 'cloth', d: [D.stripes('x', 3, 1, 0xf4f0e8)] }, outfit: { kind: 'hanten', collar: 0x2a2a3a }, sleeve: { c: 0x4a6ab8, t: 'cloth' }, bottom: { c: 0xf2f0ea, t: 'fur' }, shoes: 0xf2f0ea, sole: 0xf4a8b0,
      armL: [160, 30, 30], armR: [150, -40, 40], legL: [-20, 14], legR: [30, 4], lean: -6, head: [0, 0, 10],
      onHead(k, H) { k.box([0, H.hy + H.hh + 0.8, 0], [12, 2, 8], { c: 0xffffff, t: 'cloth', d: [D.stripes('x', 2.6, 0.7, 0xe86a6a)] }, { ch: 0.45, rot: [0, 0.3, 0.2] }); } });
    for (const a of [-0.4, 0.4]) k.at([0, 18, -6], [-0.5, a, 0], () => k.box([0, 8, -2], [3, 18, 3], { c: 0xf2f0ea, t: 'fur', d: [D.band('y', 6, 9, 0xe8893a)] }, { ch: 0.5, rot: [-0.4, 0, 0] }));
  },
  nurikabe(k) {
    k.box([0, 26, 0], [50, 52, 14], { c: 0xb8aa90, t: 'stone', d: [D.stripes('y', 8, 0.6, 0x9a8c74, { dir: 'f' }), cute({ eye: 'line', gap: 9, er: 3, mouth: 'smile', mw: 6, y: 8, br: 3 })] }, { ch: 0.14 });
    k.mirror(() => k.box([10, 2, 2], [10, 4, 16], { c: 0xa89a80, t: 'stone' }, { ch: 0.3 }));
    k.box([-14, 54, 0], [8, 4, 10], { c: 0x6a9a3a, t: 'felt' }, { ch: 0.4 });
    stick(k, [20, 0, 14], [30, 18, 16], 1.2, { c: 0x8a6a3a, t: 'wood' });
  },
};

export default {
  id: 'yokai',
  order: 7,
  name: 'Yurui Yōkai',
  jp: 'ゆるい妖怪',
  tagline: 'Cute, slightly spooky folklore spirits',
  taglineJp: 'こわくない…たぶん。',
  price: 400,
  themes: ['spooky', 'shrine', 'cute'],
  card: { bg: '#2c2447', accent: '#8fe3ff', text: '#f6efe0', accent2: '#ff9a3c', pattern: 'stars' },
  capsule: { colors: [0x6a4fb3, 0x8fe3ff, 0xff9a3c, 0xf5efe0, 0x5fbf6a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'chochin', name: 'Chōchin-obake', jp: '提灯お化け', rarity: 'common',
      desc: 'Turned 100 years old and became a yōkai. Still only gives off about 40 watts.',
      fig: F.chochin,
    },
    {
      id: 'kappa', name: 'Kappa & Cucumber', jp: 'きゅうり河童', rarity: 'common',
      desc: 'Bows politely, spills the water from its head-plate, loses all power. Every time.',
      fig: F.kappa,
    },
    {
      id: 'hitotsume', name: 'Hitotsume-kozō', jp: '一つ目小僧', rarity: 'common',
      desc: 'Jumps out, sticks his tongue out to scare you, then apologises for startling you.',
      fig: F.hitotsume,
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'kitsune', name: 'Fox-fire Kitsune', jp: '狐火きつね', rarity: 'uncommon',
      desc: 'Its tail-flames could guide lost travellers home. It uses them to toast fried tofu.',
      fig: F.kitsune,
    },
    {
      id: 'tengu', name: 'Karasu-tengu', jp: '烏天狗', rarity: 'uncommon',
      desc: 'One flap of his leaf fan summons a mountain gale. Mostly used to dry laundry.',
      fig: F.tengu,
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'zashiki', name: 'Zashiki-warashi', jp: '座敷わらし', rarity: 'rare',
      desc: 'Brings good fortune to any house she plays in. Rent-free. Eats all the snacks.',
      fig: F.zashiki,
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'nekomata', name: 'Dancing Nekomata', jp: '踊る猫又', rarity: 'ultra',
      desc: 'Live to 100, grow a second tail, put a towel on your head and dance. Cat rules.',
      fig: F.nekomata,
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'nurikabe', name: 'Nurikabe', jp: 'ぬりかべ', rarity: 'secret',
      desc: 'Blocks your path at night. Tap its feet with a stick and it leaves. It is a wall.',
      fig: F.nurikabe,
    },
  ],
};
