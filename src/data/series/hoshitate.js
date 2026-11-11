// Line-Dried Animals (干したてどうぶつ): animals pegged out on the balcony to dry, resigned to it. Blocky figures with
// painted towelling, wool and plastic pegs (src/figures). 全5種 + シークレット.
import { beast, chibi, D } from '../../figures/chibi.js';
import { stick, cute } from '../../figures/props.js';

const PEG = (c) => ({ c, t: 'gloss', m: 'gloss' });
/** A little washing-line stand: base, two poles, the line at height h. */
const line = (k, w = 50, h = 52) => { k.box([0, 1.5, 0], [w + 8, 3, 14], { c: 0x8a8a96, t: 'metal' }, { ch: 0.3 }); k.mirror(() => k.box([w / 2, h / 2, 0], [2.4, h, 2.4], { c: 0xc8c8d0, m: 'metal' }, { ch: 0.3 })); k.box([0, h - 2, 0], [w, 1, 1], { c: 0x5a5a66 }, { ch: 0.3 }); };
const peg = (k, x, y, c = 0xf06a8a) => { k.box([x - 1, y, 0], [1.6, 7, 2.6], PEG(c), { ch: 0.4 }); k.box([x + 1, y, 0], [1.6, 7, 2.6], PEG(c), { ch: 0.4 }); k.box([x, y - 0.5, 0], [4, 2, 3.4], { c: 0xd8dae0, m: 'metal' }, { ch: 0.4 }); };
const F = {
  towel(k) {
    line(k);
    k.box([0, 32, 0], [26, 30, 2], { c: 0xf2f0ea, t: 'plush', d: [D.stripes('y', 6, 1.4, 0xf2a7b0), D.band('y', -15, -13, 0xf2a7b0)] }, { ch: 0.2 });
    k.at([0, 39, 2.4], [0, 0, 0], () => beast(k, 'loaf', { c: 0xf2f0ea, size: 0.5, ears: 'tri', inner: 0xf4a8b0, whiskers: true, t: 'plush', face: { eye: 'line', mouth: 'flat', brow: 'angry' }, belly: false }));
    peg(k, -9, 47); peg(k, 9, 47, 0x6ab8f0);
  },
  sock(k) {
    line(k);
    k.at([0, 46, 0], [0, 0, 0], () => {
      k.box([0, -10, 0], [9, 20, 6], { c: 0xc8a070, t: 'knit', d: [D.stripes('y', 4, 1.4, 0x8a6a4a), D.band('y', 7, 10, 0xffffff)] }, { ch: 0.4 });
      k.box([3, -22, 2], [10, 8, 7], { c: 0xc8a070, t: 'knit', d: [cute({ y: 0, gap: 2.4, er: 0.8, eh: 1, mouth: 'cat', mw: 1.4, my: -1.8 })] }, { ch: 0.45 });
      k.mirror(() => k.box([3, -16, 0], [2, 3, 2], { c: 0xc8a070, t: 'fur' }, { ch: 0.5 }));
      k.box([0, -26.6, 0], [5, 2, 4], { c: 0x2a1c1c }, { ch: 0.5 });
    });
    peg(k, 0, 47, 0x9fd6c2);
  },
  octo(k) {
    // the pinch-hanger is the octopus: a red head with four pegs on chains
    k.box([0, 1.5, 0], [44, 3, 14], { c: 0x8a8a96, t: 'metal' }, { ch: 0.3 });
    stick(k, [0, 3, 0], [0, 58, 0], 2, { c: 0xc8c8d0, m: 'metal' });
    k.box([5, 58, 0], [12, 2, 2], { c: 0xc8c8d0, m: 'metal' }, { ch: 0.3 });
    k.soft([10, 50, 0], [9, 8, 8], { c: 0xe8503a, t: 'gloss', m: 'gloss', d: [cute({ y: -1, gap: 3.4, mouth: 'o', mw: 2 })] }, { ch: 0.5 });
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4, x = 10 + Math.cos(a) * 12, z = Math.sin(a) * 9; stick(k, [10, 44, 0], [x, 32, z], 1.6, { c: 0xe8503a, t: 'gloss' }); peg(k, x, 28, [0xf2a7b0, 0x9fd6c2, 0xf6d77a, 0x8fbcd2][i]); }
    k.box([14, 18, 4], [5, 7, 1], { c: 0x6ab8f0, t: 'knit' }, { ch: 0.3 });
  },
  futon(k) {
    k.box([0, 1.5, 0], [60, 3, 18], { c: 0x8a8a96, t: 'metal' }, { ch: 0.3 });
    k.mirror(() => k.box([27, 20, 0], [2.4, 38, 2.4], { c: 0xc8c8d0, m: 'metal' }, { ch: 0.3 }));
    k.box([0, 38, 0], [56, 2.4, 2.4], { c: 0xc8c8d0, m: 'metal' }, { ch: 0.3 });
    k.box([0, 30, 3.4], [46, 18, 2.6], { c: 0xe86a8a, t: 'cloth', d: [D.dots(5, 1.2, 0xfbe0e8, { dir: '*' })] }, { ch: 0.4 });
    k.box([0, 30, -3.4], [46, 18, 2.6], { c: 0xe86a8a, t: 'cloth', d: [D.dots(5, 1.2, 0xfbe0e8, { dir: '*' })] }, { ch: 0.4 });
    k.at([0, 40, 2], [0.5, 0, 0], () => beast(k, 'loaf', { c: 0x8a6a4c, size: 0.6, ears: 'round', earC: 0x4a3828, face: { eye: 'closed', mouth: 'cat' }, bodyD: [D.ell(-4, 4, 3, 2, 0x4a3828), D.ell(4, 4, 3, 2, 0x4a3828)], tail: 'striped' }));
    k.at([24, 16, 10], [0, 0, 0.6], () => { stick(k, [0, -10, 0], [0, 6, 0], 1.2, { c: 0xc8a060, t: 'wood' }); k.cyl([0, 10, 0], 5, 1, { c: 0xd8b878, t: 'tatami', d: [D.ring(0, 0, 3, 0.6, 0x8a6a3a, { dir: 't' })] }, { rot: [Math.PI / 2, 0, 0] }); });
  },
  shirt(k) {
    k.box([0, 1.5, 0], [40, 3, 14], { c: 0x8a8a96, t: 'metal' }, { ch: 0.3 });
    stick(k, [0, 3, -4], [0, 64, -4], 2, { c: 0xc8c8d0, m: 'metal' });
    k.box([0, 62, -2], [3, 1, 6], { c: 0xc8c8d0, m: 'metal' }, { ch: 0.3 });
    k.box([0, 52, 0], [30, 1.4, 1.4], { c: 0xc8a060, t: 'wood' }, { ch: 0.3, top: [0.3, 1] });
    k.at([0, 0, 2], [0, 0, 0], () => beast(k, 'loaf', { c: 0x2c3442, size: 0.62, hk: 1.25, ears: 'none', pawC: 0xf2a33a, face: { eye: 'dot', mouth: 'none', y: 5 }, bodyD: [D.ell(0, -2, 9, 10, 0xfbfbfb)],
      onBody(k, b) { k.box([0, b.ry * 0.9, 0.4], [b.rx * 2.2, b.ry * 1.5, b.rz * 2.1], { c: 0xf6f8fa, t: 'cloth', d: [D.poly([[-4, 6], [4, 6], [0, 1]], 0x2c3442, { dir: 'f' }), D.poly([[-0.9, 5], [0.9, 5], [1.4, -5], [0, -7], [-1.4, -5]], 0xc8302a, { ink: 0x5a1018, iw: 0.2, dir: 'f' })] }, { ch: 0.3, caps: 'bot' }); } }));
    k.mirror(() => k.box([10, 18, 2], [4, 10, 6], { c: 0xf6f8fa, t: 'cloth' }, { ch: 0.4, rot: [0, 0, 0.35] }));
  },
  wani(k) {
    line(k, 50, 54);
    k.at([0, 50, 0], [0, 0, 0], () => {
      k.box([0, 0, 0], [8, 5, 5], { c: 0x5ab84a, t: 'scales', d: [D.circ(-2, 1.4, 0.8, 0xffffff, { dir: 'f' }), D.circ(2, 1.4, 0.8, 0xffffff, { dir: 'f' }), D.circ(-2, 1.4, 0.4, 0x1a1a1a, { dir: 'f' }), D.circ(2, 1.4, 0.4, 0x1a1a1a, { dir: 'f' })] }, { ch: 0.4 });
      k.box([0, -9, 1.6], [6, 14, 2.4], { c: 0x5ab84a, t: 'gloss', d: [D.stripes('y', 2, 0.5, 0xffffff, { dir: 'f' })] }, { ch: 0.4, rot: [0.1, 0, 0] });
      k.box([0, -9, -1.6], [6, 14, 2.4], { c: 0x5ab84a, t: 'gloss' }, { ch: 0.4, rot: [-0.1, 0, 0] });
      k.box([0, 6, -3], [4, 7, 3], { c: 0x5ab84a, t: 'scales' }, { ch: 0.4, rot: [-0.6, 0, 0] });
      k.box([0, -26, 0], [10, 18, 4], { c: 0xf2f0ea, t: 'knit', d: [D.band('y', 6, 9, 0xd8302a), D.stripes('y', 3, 0.6, 0xd8d8de)] }, { ch: 0.4 });
    });
  },
};

export default {
  id: 'hoshitate',
  order: 2,
  name: 'Line-Dried Animals',
  jp: '干したてどうぶつ',
  romaji: 'HOSHITATE DOUBUTSU',
  tagline: 'Washed, wrung out, pegged up',
  taglineJp: 'きょうは、よく乾く。',
  price: 200,
  themes: ['home', 'cute', 'weird'],
  card: { bg: '#e4f0f6', accent: '#4f8fc0', text: '#2a3442', accent2: '#f2a7b0', pattern: 'stripes' },
  capsule: { colors: [0x8fbcd2, 0xf2a7b0, 0x9fd6c2, 0xf6d77a], style: 'clear' },
  flyer: {
    maker: 'kamenoko', scene: 'sky', hero: 'shirt', side: ['futon', 'towel'],
    title: [['干したて', 4, 'b'], ['どうぶつ', 2, 'a']],
    catch: 'きょうは、よく乾く。', sub: 'せんたくばさみつき', gimmick: 'ハンガーがくるっと回る！',
  },
  items: [
    {
      id: 'towel', name: 'Towel Cat', jp: 'タオルねこ', rarity: 'common',
      desc: 'Washed at forty degrees. Has not forgiven anyone.',
      fig: F.towel, gimmick: { text: 'Lift its head' },
    },
    {
      id: 'sock', name: 'Sock Ferret', jp: 'くつしたイタチ', jpLines: ['くつした', 'イタチ'], rarity: 'common',
      desc: 'One of a pair. The other one is also a ferret, somewhere.',
      fig: F.sock, gimmick: { text: 'Turn the hanger' },
    },
    {
      id: 'octo', name: 'Octopus Pinch-Hanger', jp: 'たこハンガー', jpLines: ['たこ', 'ハンガー'], rarity: 'uncommon',
      desc: 'Eight arms, four pegs, no complaints. Well, one.',
      fig: F.octo, gimmick: { text: 'Spin the octopus' },
    },
    {
      id: 'futon', name: 'Futon Tanuki', jp: 'ふとんだぬき', jpLines: ['ふとん', 'だぬき'], rarity: 'rare',
      desc: 'Aired every Sunday. Sleeps better than you do.',
      fig: F.futon, gimmick: { text: 'Swing the beater' },
    },
    {
      id: 'shirt', name: 'Hanger Penguin', jp: 'ハンガーペンギン', jpLines: ['ハンガー', 'ペンギン'], rarity: 'ultra',
      desc: 'Pressed, buttoned, tie on. Ready for Monday. Monday is not ready for it.',
      fig: F.shirt, gimmick: { text: 'Flap the sleeves' },
    },
    {
      id: 'wani', name: 'The Peg Crocodile', jp: 'せんたくばさみワニ', rarity: 'secret',
      desc: 'Holds one sock very firmly. Will not say whose.',
      fig: F.wani, gimmick: { text: 'Open the jaw' },
    },
  ],
};
