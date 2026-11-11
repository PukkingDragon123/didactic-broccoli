// Series 10 — Kaiju Snack Time (怪獣おやつタイム)
// Chubby baby kaiju caught mid-snack. Rampage cancelled: it's oyatsu o'clock.
// Kaiju Snack Time: chibi monsters and giant snacks as blocky vinyl figures (src/figures).
import { chibi, beast, tail, D } from '../../figures/chibi.js';
import { plate, stick, cute, WHITE } from '../../figures/props.js';

const G = 0x6ac06a;
/** Gao-chan style kaiju: soft block body with a pale belly, big head, back plates, stubby arms and a tail. */
function kaiju(k, s = {}) {
  const c = s.c ?? G, c2 = s.c2 ?? 0xe8e8b0, S = s.S ?? 1;
  if (!s.noBase) city(k);
  k.mirror(() => k.box([6 * S, 4 * S, 1], [8 * S, 8 * S, 10 * S], { c, t: 'scales', d: [D.stripes('x', 2.4, 0.6, 0xf2f2e8, { dir: 'f' })] }, { ch: 0.4 }));
  k.soft([0, 16 * S, 0], [12 * S, 10 * S, 10 * S], { c, t: 'scales', d: [D.ell(0, -1, 8 * S, 8 * S, c2, { dir: 'f' }), D.stripes('y', 3, 0.6, 0xc8c890, { dir: 'f' })] }, { ch: 0.5, bev: 0.3 });
  // a long tail in three tapering segments, swinging to one side
  k.at([0, 9 * S, -8 * S], [0.35, 0.5, 0], () => { k.box([0, 0, -5 * S], [7 * S, 7 * S, 11 * S], { c, t: 'scales' }, { ch: 0.45, top: [0.85, 0.85] }); k.at([0, 0, -10 * S], [0.25, 0.5, 0], () => { k.box([0, 0, -4 * S], [5.4 * S, 5.4 * S, 9 * S], { c, t: 'scales' }, { ch: 0.45, top: [0.8, 0.8] }); k.box([0, 0, -10 * S], [3.6 * S, 3.6 * S, 6 * S], { c, t: 'scales' }, { ch: 0.5, top: [0.5, 0.5] }); }); });
  for (let i = 0; i < 4; i++) k.box([0, (28 - i * 6) * S, (-9 - i * 1.2) * S], [2, 6 * S, 5 * S], { c: s.plate ?? 0xe8e0b0, t: 'gloss' }, { ch: 0.3, top: [0.5, 0.3], rot: [-0.4, 0, 0] });
  for (const side of [1, -1]) { const p = (side > 0 ? s.armL : s.armR) || [20, 20]; k.at([side * 11 * S, 20 * S, 2], [-p[0] * Math.PI / 180, 0, side * p[1] * Math.PI / 180], () => { k.box([0, -4 * S, 0], [5 * S, 9 * S, 5 * S], { c, t: 'scales' }, { ch: 0.5 }); const h = side > 0 ? s.holdL : s.holdR; if (h) k.at([0, -9 * S, 0], [0, 0, 0], () => h(k)); }); }
  k.at([0, 26 * S, 1], (s.head || [0, 0, 0]).map((a) => a * Math.PI / 180), () => {
    k.soft([0, 9 * S, 1], [12 * S, 9 * S, 11 * S], { c, t: 'scales', d: [D.face({ eye: s.eye ?? 'anime', iris: s.iris ?? 0xf2a020, er: 2.2 * S, eh: 2.8 * S, gap: 5.6 * S, y: 2 * S, mouth: s.mouth ?? 'fang', mw: 4 * S, my: -4 * S, blush: true })] }, { ch: 0.45, bev: 0.3, dens: 1.2 });
    k.mirror(() => k.box([5 * S, 18 * S, -2], [3 * S, 4 * S, 3 * S], { c: s.plate ?? 0xe8e0b0, t: 'gloss' }, { ch: 0.4, top: [0.4, 0.4] }));
  });
}
/** The base: a square of street with a few crushed and standing little buildings. */
function city(k) {
  k.box([0, 1.5, 0], [52, 3, 40], { c: 0x6a6a72, t: 'stone', top: 0x5a5a62, d: [D.stripes('x', 12, 1, 0xd8d0b0, { dir: 't' })] }, { ch: 0.25 });
  for (const [x, z, w, h, col, rot] of [[-20, -14, 8, 14, 0xc8c0b0, 0], [20, -12, 7, 20, 0x9aa8b8, 0], [-21, 12, 7, 6, 0xd8b890, 0.5], [21, 13, 6, 9, 0xb8a8a0, -0.3]]) k.box([x, 3 + h / 2, z], [w, h, w], { c: col, t: 'stone', d: [D.fn('*', (c, o) => { if (Math.abs(c.ny) < 0.5 && ((Math.floor(c.y * 0.6) & 1) === 0) && ((Math.floor(c.a * 0.6) & 1) === 0)) { o[0] = 70; o[1] = 90; o[2] = 110; } })] }, { ch: 0.15, rot: [rot, 0, rot * 0.5] });
}
const F = {
  taiyaki(k) {
    kaiju(k, { armL: [70, 10], armR: [70, -10], head: [-10, 0, 0], mouth: 'open', holdL(k) {
      k.at([-6, -2, 6], [0, 0, Math.PI / 2], () => { k.prism([[-8, 2.4, 2, 0, 0, 0.5], [-3, 5, 3, 0, 0, 0.5], [6, 5.4, 3.2, 0, 0, 0.5], [10, 2, 2, 0, 0, 0.5]], { c: 0xd8913a, t: 'crust', c2: 0x9a5418, d: [D.circ(3, 7, 0.9, 0x2a1c1c, { dir: 'f' })] }, { pf: true }); });
    } });
  },
  dango(k) {
    kaiju(k, { c: 0xe8a0b8, c2: 0xfbe8ee, plate: 0xfbf6ea, armL: [120, 20], armR: [10, -20], eye: 'happy', mouth: 'open', holdL(k) { stick(k, [0, -2, 0], [0, -2, 30], 1.2, { c: 0xe6c48a }); [0xf4a6b8, 0xfbf7ee, 0x8cc068].forEach((c, i) => k.soft([0, -2, 10 + i * 7.6], [3.6, 3.6, 3.6], { c, t: 'plush' }, { ch: 0.586 })); } });
  },
  ramune(k) {
    kaiju(k, { c: 0x5ab8e8, c2: 0xd8f0f8, armL: [150, 10], armR: [150, -10], head: [-30, 0, 0], eye: 'closed', mouth: 'o', holdL(k) {
      k.at([-4, -2, 0], [Math.PI, 0, 0], () => { k.cyl([0, 0, 0], 4, 14, { c: 0x7ad8f0, m: 'glass', t: 'glass' }); k.cyl([0, 8, 0], 2.4, 3, { c: 0x7ad8f0, m: 'glass' }); k.cyl([0, 10, 0], 2.6, 2, { c: 0x3a6ae8, t: 'gloss' }); k.soft([0, 3, 0], [1.6, 1.6, 1.6], { c: 0xd8f0f8, m: 'glass' }, { ch: 0.586 }); });
    } });
  },
  purin(k) {
    k.at([-12, 0, 0], [0, 0, 0], () => { k.cyl([0, 8, 0], 13, 16, { c: 0xf6d870, t: 'gloss', m: 'gloss', top: 0x8a4a14, d: [D.band('y', 4, 8, 0x8a4a14)] }, { top: 0.82 }); k.cyl([0, 1, 0], 15, 2, { c: 0xf6d870, t: 'gloss' }); });
    k.at([10, 0, 0], [0, -0.4, 0], () => kaiju(k, { noBase: true, c: 0xf29a4a, c2: 0xfbe8c8, eye: 'happy', mouth: 'open', armL: [40, 40], armR: [40, -40] }));
    k.box([0, 15, 2], [8, 8, 8], { c: 0xf6d870, t: 'gloss', m: 'gloss' }, { ch: 0.5 });
  },
  buriki(k) {
    const T = { c: 0x8a9aa8, t: 'tin' };
    k.mirror(() => k.box([7, 4, 1], [9, 8, 12], { c: 0x6a7a88, t: 'tin' }, { ch: 0.2 }));
    k.box([0, 18, 0], [24, 20, 18], { ...T, d: [D.rect(-8, -6, 8, 6, 0xe8402a, { dir: 'f' }), D.txt('ガオ', 0, 0, 5, 0xf2c23a), D.buttons(-8, 7, 7, 1, 1, 0xf2c23a)] }, { ch: 0.15 });
    k.box([0, 36, 1], [22, 16, 18], { ...T, d: [D.rect(-8, 0, -3, 4, 0xf2c23a, { ink: 0x2a1c1c }), D.rect(3, 0, 8, 4, 0xf2c23a, { ink: 0x2a1c1c }), D.rect(-7, -6, 7, -3, 0xffffff, { dir: 'f' }), D.stripes('x', 2, 0.6, 0x5a6a78, { dir: 'f' })] }, { ch: 0.15 });
    k.mirror(() => k.box([14, 22, 0], [5, 12, 5], T, { ch: 0.2, rot: [-0.8, 0, 0.2] }));
    k.at([0, 20, -11], [0, 0, 0], () => { k.cyl([0, 0, 0], 1.2, 5, { c: 0xd8b040, m: 'metal' }, { rot: [Math.PI / 2, 0, 0] }); k.box([0, 0, -3.4], [12, 4, 1.4], { c: 0xd8b040, m: 'metal' }, { ch: 0.5 }); });
    k.at([14, 18, 12], [0, 0, 0], () => k.cyl([0, 0, 0], 5, 2.6, { c: 0xe8a050, t: 'crust', d: [D.circ(0, 0, 2, 0x8a8a92, { dir: 'f' })] }, { rot: [Math.PI / 2, 0, 0], pf: true }));
    for (let i = 0; i < 3; i++) k.box([0, 46 + i, -5 - i * 4], [2, 6, 3], { c: 0xe8402a, t: 'tin' }, { top: [0.5, 0.4], ch: 0.3 });
  },
  tower(k) {
    for (let i = 0; i < 6; i++) k.box([(i % 2) * 2 - 1, 3 + i * 5, 0], [26 - i * 2.6, 4.4, 16 - i], { c: 0xd8a860, t: 'crust', c2: 0xa86a2a, d: [D.dots(3, 0.6, 0x8a5a24, { dir: 't' })] }, { ch: 0.3, rot: [0, i * 0.4, 0] });
    k.at([20, 0, 4], [0, -0.6, 0], () => kaiju(k, { noBase: true, S: 0.9, c: 0x8a7ad8, c2: 0xe8e0f8, armL: [120, 30], armR: [80, -10], mouth: 'open' }));
    k.box([0, 33, 0], [8, 6, 4], { c: 0xd8a860, t: 'crust', d: [D.circ(2, 3, 2, 0xfbe8c8, { dir: 'f' })] }, { ch: 0.3 });
  },
  parfait(k) {
    k.cyl([0, 1, 0], 9, 2, { c: 0xd8eef6, m: 'glass' }); stick(k, [0, 2, 0], [0, 10, 0], 3, { c: 0xd8eef6, m: 'glass' });
    k.cyl([0, 20, 0], 12, 20, { c: 0xd8eef6, m: 'glass', t: 'glass', d: [D.band('y', -10, -4, 0xf6e6c8), D.band('y', -4, 2, 0xe85a8a), D.band('y', 2, 8, 0xfbf8f0)] }, { top: 1.3 });
    k.soft([0, 33, 0], [14, 4, 14], { c: 0xfbf8f0, t: 'foam' }, { ch: 0.586 });
    const head = (x, rz, c, e, cherry) => k.at([x, 32, 0], [0, 0, rz], () => { k.box([0, 6, 0], [6, 12, 6], { c, t: 'scales' }, { ch: 0.5 }); k.soft([0, 16, 1], [6, 5, 6], { c, t: 'scales', d: [D.face({ eye: e, er: 1.2, eh: 1.5, gap: 3, mouth: 'open', mw: 2, my: -2.4, y: 1, blush: true })] }, { ch: 0.45 }); if (cherry) k.soft([0, 23, 2], [2.4, 2.4, 2.4], { c: 0xe0202a, t: 'gloss', m: 'gloss' }, { ch: 0.586 }); });
    head(-10, 0.5, 0x6ac06a, 'sleepy', false); head(0, 0, 0x6ac06a, 'happy', true); head(10, -0.5, 0x6ac06a, 'dot', false);
  },
  mecha(k) {
    const M = { c: 0xb8bcc8, t: 'metal', m: 'metal' };
    kaiju(k, { noBase: true, c: 0x8a90a0, c2: 0xd8dae0, plate: 0xe8402a, S: 1.15, eye: 'angry', iris: 0xe8402a, mouth: 'teeth', armL: [60, 20], armR: [60, -20], holdL(k) { k.soft([0, -3, 4], [5, 3.4, 5], { c: 0xf2c870, t: 'crust', c2: 0xb8803a, d: [D.check(1.6, 0xe8b860, { dir: 't' })] }, { ch: 0.586 }); } });
    k.box([0, 22, 9], [10, 8, 2], { ...M, d: [D.circ(0, 0, 2.4, 0x5ae8ff)] }, { ch: 0.3 });
    k.box([0, 2, 0], [44, 4, 32], { c: 0x2a2a34, t: 'metal', d: [D.stripes('d', 6, 3, 0xf2c018, { dir: 'f' })] }, { ch: 0.2 });
  },
};

export default {
  id: 'kaiju',
  order: 10,
  name: 'Kaiju Snack Time',
  jp: '怪獣おやつタイム',
  tagline: 'Baby monsters on a sugar rampage',
  taglineJp: 'ガオー！おやつの時間だ！',
  price: 500,
  themes: ['city', 'weird', 'candy'],
  card: { bg: '#e6f4d4', accent: '#3cae5a', text: '#24361f', accent2: '#ff8c2e', pattern: 'grid' },
  capsule: { colors: [0x6fcf6a, 0xff8c2e, 0xffb7c8, 0x5cc4ff, 0xffd23f] },
  items: [
    {
      id: 'taiyaki', name: 'Gao-chan & Taiyaki', jp: 'ガオちゃんとたい焼き', rarity: 'common',
      desc: 'Always eats taiyaki tail-first. Nobody knows why. Nobody dares ask.',
      fig: F.taiyaki,
    },
    {
      id: 'dango', name: 'Hanami Dango Kaiju', jp: '花より団子怪獣', rarity: 'common',
      desc: 'Hana yori dango: dumplings over blossoms. Has not looked at one flower.',
      fig: F.dango,
    },
    {
      id: 'ramune', name: 'Ramune Gulp Kaiju', jp: 'ラムネ怪獣', rarity: 'common',
      desc: 'Has spent forty minutes trying to get the marble out. Will not give up.',
      fig: F.ramune,
    },
    {
      id: 'purin', name: 'Purin Funjatta!', jp: 'プリンふんじゃった', rarity: 'uncommon',
      desc: 'Stepped on the giant purin. Now has one very sticky, very happy foot.',
      fig: F.purin,
    },
    {
      id: 'buriki', name: 'Wind-up Tin Kaiju', jp: 'ブリキ怪獣', rarity: 'uncommon',
      desc: 'Wind it up and it eats one donut. Wind it up again. Repeat until broke.',
      fig: F.buriki,
    },
    {
      id: 'tower', name: 'Biscuit Tower Attack', jp: 'ビスケットタワー襲撃', rarity: 'rare',
      desc: 'The tallest snack in the city. Was. Was the tallest snack in the city.',
      fig: F.tower,
    },
    {
      id: 'parfait', name: 'Triple-Head Parfait', jp: '三つ首パフェ竜', rarity: 'ultra',
      desc: 'Three heads, one parfait. The middle one always gets the cherry.',
      fig: F.parfait,
    },
    {
      id: 'mecha', name: 'Mecha-Kaiju ULTIMATE', jp: 'メカ怪獣アルティメット', rarity: 'secret',
      desc: 'A billion-yen war machine. Used exclusively to guard one melon pan.',
      fig: F.mecha,
    },
  ],
};
