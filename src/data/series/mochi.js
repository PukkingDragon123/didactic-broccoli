// Series 1 — Mochi Mochi Animals (もちもちアニマル)
// Squishy, round "mochi" animal keychains. The starter series for the ¥100 Showa machine.
// Squishy, round "mochi" animal keychains: blocky loaf animals with painted faces and fur (src/figures).
import { beast, keychain, D, SD, shape } from '../../figures/chibi.js';

const S = 1.5;
const F = {
  shiba(k) {
    beast(k, 'loaf', { c: 0xe39a52, c2: 0xfff1df, size: S, ears: 'tri', inner: 0xfff1df, tail: 'curl', face: { mouth: 'cat', eye: 'dot' },
      bodyD: [D.ell(-7, 9, 2.4, 1.3, 0xfff1df), D.ell(7, 9, 2.4, 1.3, 0xfff1df), D.ell(0, 0.4, 1.6, 1.1, 0x2a1c1c)] });
    keychain(k, [0, 35, 0], 1.3);
  },
  mike(k) {
    beast(k, 'loaf', { c: 0xfbf6ec, c2: 0xffffff, size: S, ears: 'tri', earC: 0xfbf6ec, inner: 0xf4a8b0, tail: 'long', whiskers: true, belly: false,
      face: { mouth: 'cat', eye: 'happy' },
      bodyD: [D.ell(-12, 13, 9, 7, 0xe8893a, { dir: '*' }), D.ell(13, 4, 7, 6, 0x3a3230, { dir: 'x' }), D.ell(-6, 21, 6, 3, 0xe8893a, { dir: 't' }), D.ell(8, 10, 6, 9, 0x3a3230, { dir: 'b' }), D.ell(0, 0.6, 1.1, 0.8, 0xf08a90)] });
    keychain(k, [0, 35, 0], 1.3);
  },
  hamu(k) {
    beast(k, 'loaf', { c: 0xf2b866, c2: 0xfffaf0, size: S, wk: 1.08, hk: 0.92, ears: 'round', inner: 0xf8c0c0, face: { mouth: 'tri', eye: 'bead', gap: 7 },
      bodyD: [D.ell(0, 10, 7, 4, 0xfffaf0)] , onBody(k, b) {
        // the sunflower seed, hugged in both paws
        k.box([0, 7, b.rz - 0.5], [5, 9, 3], { c: 0x3a3634, d: [D.stripes('x', 1.6, 0.6, 0xe8e2d4, { dir: 'f' })] }, { ch: 0.5, top: [0.4, 0.8] });
        k.mirror(() => k.ball([3.6, 7, b.rz], [2.4, 2.2, 2], { c: 0xf8c8c0, t: 'fur' }, { n: 2 }));
      } });
    keychain(k, [0, 32, 0], 1.3);
  },
  pen(k) {
    beast(k, 'loaf', { c: 0x2c3442, c2: 0xfbfbfb, size: S, hk: 1.1, ears: 'none', pawC: 0xf2a33a, face: { eye: 'dot', mouth: 'none', blush: true, y: 6, gap: 5 },
      bodyD: [D.ell(0, -2, 11, 13, 0xfbfbfb), D.poly([[-2.2, 3.4], [2.2, 3.4], [0, 0.6]], 0xf2a33a, { ink: 0xb06a10, iw: 0.3 })],
      onBody(k, b) { k.mirror(() => k.box([b.rx + 0.5, b.ry * 0.9, 0], [3, 12, 7], { c: 0x2c3442, t: 'vinyl' }, { ch: 0.5, rot: [0, 0, 0.5] })); } });
    keychain(k, [0, 37, 0], 1.3);
  },
  lesser(k) {
    beast(k, 'loaf', { c: 0xc8562a, c2: 0x3a2420, size: S, ears: 'round', earC: 0xc8562a, inner: 0xfff4e8, tail: 'striped', face: { mouth: 'open', eye: 'dot', y: 6 },
      bodyD: [D.ell(-6, 4, 4, 3.4, 0xfff4e8), D.ell(6, 4, 4, 3.4, 0xfff4e8), D.ell(0, -1, 4.6, 3.2, 0xfff4e8), D.ell(-6, 9.8, 2.6, 1.2, 0xfff4e8), D.ell(6, 9.8, 2.6, 1.2, 0xfff4e8), D.ell(0, -12, 13, 6, 0x3a2420)],
      onBody(k, b) { k.mirror(() => k.box([b.rx * 0.8, b.ry * 1.25, 4], [4, 10, 4.5], { c: 0x3a2420, t: 'fur' }, { ch: 0.5, rot: [0.2, 0, -0.9] })); } });
    keychain(k, [0, 35, 0], 1.3);
  },
  tanuki(k) {
    beast(k, 'loaf', { c: 0x8a6a4c, c2: 0xe6d2b4, size: S, ears: 'round', earC: 0x4a3828, inner: 0x2a2018, tail: 'striped', face: { eye: 'dot', mouth: 'cat', y: 6, gap: 6.5 },
      bodyD: [D.ell(-6.5, 6.4, 4.4, 3, 0x4a3828), D.ell(6.5, 6.4, 4.4, 3, 0x4a3828), D.ell(0, 1, 2, 1.2, 0x2a1c1c)],
      onBody(k, b) {
        // the transformation leaf: a big green leaf with a mid-rib, set on the head
        k.box([0, b.ry * 2 - 0.2, -1], [12, 1.2, 18], { c: 0x4f9a3a, top: 0x5fb046, d: [D.line(0, -8, 0, 8, 0.6, 0x2f6a22, { dir: 't' }), D.stripes('e', 3, 0.4, 0x3f8a30, { dir: 't' })] }, { ch: 0.55, rot: [0.25, 0.4, 0.05] });
        k.box([2, b.ry * 2 + 2, -9], [1, 1, 4], { c: 0x3a6a22 }, { ch: 0.3, rot: [0.8, 0.4, 0] });
      } });
  },
  tsukiusa(k) {
    // the rabbit, pounding mochi in a wooden usu under a moon disc
    k.at([-9, 0, 0], [0, 0.35, 0], () => {
      beast(k, 'loaf', { c: 0xfbf8f2, c2: 0xffffff, size: 1.15, hk: 1.15, ears: 'long', inner: 0xf4a8b0, face: { eye: 'happy', mouth: 'cat' }, belly: false });
    });
    k.at([-1, 18, 5], [0, 0.4, -0.9], () => {
      k.box([0, 0, 0], [2, 22, 2], { c: 0xc89a5a, t: 'wood' }, { ch: 0.4 });
      k.box([0, 11, 0], [9, 5, 5], { c: 0xb88a4a, t: 'wood', ga: 'x' }, { ch: 0.35, rot: [0, 0, Math.PI / 2] });
    });
    k.cyl([10, 6, 4], 8, 12, { c: 0xa0703a, t: 'wood', top: 0x7a5228, d: [D.band('y', 2, 3.2, 0x6a4420), D.band('y', -3.2, -2, 0x6a4420)] }, { top: 0.92 });
    k.ball([10, 13, 4], [6, 2.6, 6], { c: 0xfffcf6, t: 'plush' });
    k.cyl([0, 34, -14], 16, 2, { c: 0xf6e08a, front: 0xfbe9a0, d: [D.circ(-5, 3, 2.6, 0xe8cc70, { dir: 'f' }), D.circ(4, -4, 3.6, 0xe8cc70, { dir: 'f' }), D.circ(6, 6, 1.6, 0xe8cc70, { dir: 'f' })] }, { rot: [Math.PI / 2, 0, 0] });
    k.box([0, 17, -14], [2, 2, 2], 0x8a8a8a);
    keychain(k, [0, 50, -14], 1.2);
  },
  kagami(k) {
    // New Year: two stacked mochi tiers, a shiba face on top, a mikan hat, on a sanbo stand with paper
    k.box([0, 3, 0], [44, 6, 40], { c: 0xd8b070, t: 'wood', d: [D.rect(-6, -2, 6, 2, 0x8a6a3a, { r: 1.2 })] }, { ch: 0.15 });
    k.box([0, 6.8, 0], [36, 1.4, 36], { c: 0xfbfbf4, t: 'paper', d: [D.band('x', -1, 1, 0xd8202a)] }, { ch: 0.1, rot: [0, 0.78, 0] });
    k.ball([0, 14, 0], [19, 7, 17], { c: 0xfbf8ee, t: 'plush' }, { flat: 0.9 });
    k.at([0, 19.5, 0], [0, 0, 0], () => beast(k, 'loaf', { c: 0xe39a52, c2: 0xfff1df, size: 1.1, ears: 'tri', inner: 0xfff1df, face: { eye: 'happy', mouth: 'open' } }));
    k.ball([0, 47, 0], [6.5, 5.5, 6.5], { c: 0xf28a1a, t: 'crust', c2: 0xd86a10 });
    k.box([1.5, 52.6, 0], [4, 1, 2.4], 0x3f8a2e, { ch: 0.5, rot: [0, 0, 0.3] });
  },
};

export default {
  id: 'mochi',
  order: 1,
  name: 'Mochi Mochi Animals',
  jp: 'もちもちアニマル',
  tagline: 'Squishy round animal keychains',
  taglineJp: 'ぷにぷに！まんまるキーチェーン',
  price: 100,
  themes: ['cute', 'nature'],
  card: { bg: '#ffe6ee', accent: '#ff6f91', text: '#6a2c40', pattern: 'dots', accent2: '#ffd23f' },
  capsule: { colors: [0xff9eb5, 0x9ed8ff, 0xfff09e, 0xb5f0b0, 0xffc7a0] },
  items: [
    {
      id: 'shiba', name: 'Mochi Shiba', jp: 'もち柴', rarity: 'common',
      desc: 'A loaf of shiba. Smells faintly of toasted rice.',
      fig: F.shiba,
    },
    {
      id: 'mike', name: 'Mochi Mike-neko', jp: 'もち三毛', rarity: 'common',
      desc: 'Calico cat mochi. Three colours, zero thoughts.',
      fig: F.mike,
    },
    {
      id: 'hamu', name: 'Mochi Hamster', jp: 'もちハム', rarity: 'common',
      desc: 'Holding a sunflower seed like it is the last one on Earth.',
      fig: F.hamu,
    },
    {
      id: 'pen', name: 'Mochi Penguin', jp: 'もちペンギン', rarity: 'uncommon',
      desc: 'Slides on its belly at 0.2 km/h. Very proud of it.',
      fig: F.pen,
    },
    {
      id: 'lesser', name: 'Mochi Red Panda', jp: 'もちレッサーパンダ', rarity: 'uncommon',
      desc: 'Stands up to look scary. It does not look scary.',
      fig: F.lesser,
    },
    {
      id: 'tanuki', name: 'Leaf Tanuki', jp: 'はっぱたぬき', rarity: 'rare',
      desc: 'Places a leaf on its head to transform. Transformation pending.',
      fig: F.tanuki,
    },
    {
      id: 'tsukiusa', name: 'Moon Rabbit Mochi-tsuki', jp: '月うさぎの餅つき', rarity: 'ultra',
      desc: 'On the full moon, the rabbit pounds mochi. Pound, pound, nap.',
      fig: F.tsukiusa,
    },
    {
      id: 'kagami', name: 'Kagami-Mochi Shiba', jp: '鏡もち柴', rarity: 'secret',
      desc: 'SECRET. A New Year shiba stacked like kagami mochi, with a mikan hat. Extremely auspicious.',
      fig: F.kagami,
    },
  ],
};
