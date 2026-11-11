// Series 15 — Natsu Matsuri Yomise (夏まつり夜店)
// A summer festival night in your palm: goldfish scooping, yo-yo balloons, fox masks,
// takoyaki stalls and the bon-odori tower.
// Natsu Matsuri Yomise: summer-festival stalls, prizes and kids as blocky figures (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, lantern, noren, sign, cute, WHITE } from '../../figures/props.js';

const goldfish = (k, pos, s = 1, rot = [0, 0, 0], face = true) => k.at(pos, rot, () => {
  k.prism([[-5 * s, 2 * s, 1.6 * s, 0, 0, 0.5], [-1 * s, 3.6 * s, 2.6 * s, 0, 0, 0.5], [3 * s, 3 * s, 2.4 * s, 0, 0, 0.5], [6 * s, 1.4 * s, 1.4 * s, 0, 0, 0.5]], { c: 0xf2502a, t: 'gloss', m: 'gloss', d: [D.band('y', -0, 0, 0xffffff), face ? D.circ(-3 * s, 3.4 * s, 0.7 * s, 0x1a1a1a, { dir: 'f' }) : null, face ? D.circ(-3 * s, 3.4 * s, 0.7 * s, 0x1a1a1a, { dir: 'b' }) : null, D.ell(1 * s, -1 * s, 1.6 * s, 1.2 * s, 0xffffff, { dir: 'f' })] }, { rot: [0, 0, -Math.PI / 2], pf: true });
  k.box([8 * s, 0, 0], [4 * s, 7 * s, 1 * s], { c: 0xf2502a, t: 'gloss' }, { ch: 0.4, top: [2, 1] });
});
const F = {
  kingyo(k) {
    k.ball([0, 20, 0], [17, 18, 15], { c: 0xd8f0ff, m: 'glass', t: 'glass' }, { flat: 0.8 });
    k.box([0, 40, 0], [10, 6, 6], { c: 0xd8f0ff, m: 'glass', t: 'glass' }, { ch: 0.4, top: [0.5, 0.7] });
    k.box([0, 44, 0], [9, 2, 2], { c: 0xd8302a, t: 'cloth' }, { ch: 0.4 });
    stick(k, [0, 44, 0], [0, 54, 0], 0.6, { c: 0xd8302a });
    k.box([0, 15, 0], [30, 16, 25], { c: 0x7ab8f0, m: 'glass', t: 'water' }, { ch: 0.4 });
    goldfish(k, [0, 20, 2], 1.3, [0, 0.3, 0]);
  },
  yoyo(k) {
    k.cyl([0, 1, 0], 10, 2, { c: 0x3a3a44 });
    stick(k, [0, 2, 0], [0, 18, 0], 1.2, { c: 0xf2f2f2 });
    k.ball([0, 30, 0], [14, 13, 14], { c: 0xf26a9a, t: 'gloss', m: 'gloss', d: [D.stripes('y', 30, 2, 0xf6e83a, { ph: 4 }), D.stripes('d', 7, 1.2, 0x3a8ae8, { dir: '*' }), D.ell(-5, 6, 3, 2, 0xffffff, { alpha: 0.5, dir: 'f' })] });
    k.box([0, 44, 0], [3, 3, 3], { c: 0xf26a9a, t: 'gloss' }, { ch: 0.5 });
  },
  kitsune(k) {
    k.cyl([0, 1.5, 0], 10, 3, { c: 0x3a3a44 });
    stick(k, [0, 3, -4], [0, 22, -4], 2, { c: 0x6a4a32 });
    k.at([0, 32, 0], [0, 0, 0], () => {
      k.soft([0, 0, 0], [15, 14, 6], { c: 0xfbfaf4, t: 'paper', d: [D.poly([[-4, 2], [-10, 6], [-3, 5]], 0xd8302a), D.poly([[4, 2], [10, 6], [3, 5]], 0xd8302a), D.path([[-9, 4], [-4, 2]], 0.6, 0x2a1c1c), D.path([[9, 4], [4, 2]], 0.6, 0x2a1c1c), D.ell(0, -7, 1.6, 1, 0x2a1c1c), D.arc(0, -9, 3, 1.4, Math.PI + 0.4, 2 * Math.PI - 0.4, 0.5, 0xd8302a), D.circ(0, 6, 1.4, 0xd8302a), D.poly([[-1.4, 7], [1.4, 7], [0, 10]], 0xd8302a)] }, { ch: 0.5, bev: 0.35 });
      k.box([0, -6, 7], [9, 8, 6], { c: 0xfbfaf4, t: 'paper' }, { ch: 0.5, top: [0.7, 0.7] });
      k.mirror(() => k.prism([[0, 4.4, 2, 0, 0, 0.3], [9, 0.5, 0.6, -1, 0, 0]], { c: 0xfbfaf4, t: 'paper', d: [D.poly([[-2.4, 0.6], [2.4, 0.6], [-0.4, 7]], 0xd8302a, { dir: 'f' })] }, { pos: [8, 11, 0], rot: [0, 0, -0.2] }));
      k.mirror(() => k.box([16, -2, -2], [4, 1.4, 1.4], { c: 0xd8302a, t: 'cloth' }, { ch: 0.4 }));
    });
  },
  chocoban(k) {
    k.box([0, 2, 0], [36, 4, 20], { c: 0xc8a060, t: 'wood', ga: 'x' }, { ch: 0.2 });
    const cols = [[0x5a2a1a, 0xf6a0c0], [0xfbe6c8, 0x6ac0f0], [0xf6a0c8, 0xf2e05a]];
    cols.forEach(([c, sp], i) => k.at([-11 + i * 11, 4, 0], [0, 0, (i - 1) * 0.12], () => {
      stick(k, [0, 0, 0], [0, 12, 0], 1.2, { c: 0xe6c48a });
      k.prism([[0, 3.2, 3.2, 0, 0, 0.586], [24, 3.6, 3.6, 0, 1, 0.586], [36, 2.2, 2.2, 0, 2, 0.586]], { c, t: 'gloss', m: 'gloss', d: [D.dots(2, 0.5, sp, { dir: '*' }), D.band('y', 30, 40, 0xf6e6b0)] }, { pos: [0, 10, 0] });
    }));
  },
  wataame(k) {
    k.box([0, 2, 0], [36, 4, 26], { c: 0x8a8a90, t: 'stone' }, { ch: 0.2 });
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 54, hair: 'pony', hairC: 0x2a1c1c, face: { eye: 'anime', iris: 0x3a2a1a, mouth: 'open', lash: true }, top: { c: 0x3a5aa8, t: 'cloth', d: [D.dots(4, 1.2, 0xf6c0d8, { dir: '*' })] }, outfit: { kind: 'kimono', collar: 0xf4efe4, obi: 0xf2c23a, obiC: 0xe8506a },
      sleeve: { c: 0x3a5aa8, t: 'cloth', d: [D.dots(4, 1.2, 0xf6c0d8, { dir: '*' })] }, legs: 'robe', bottom: { c: 0x3a5aa8, t: 'cloth', d: [D.dots(4, 1.2, 0xf6c0d8, { dir: '*' })] }, shoes: 0xd8b878,
      armR: [110, -10, 30], armL: [30, 20, 40],
      holdR(k) { stick(k, [0, 0, 0], [0, 12, 4], 0.8, { c: 0xe6c48a }); k.soft([0, 20, 6], [9, 9, 9], { c: 0xf6c0d8, t: 'foam' }, { ch: 0.586, bev: 0.4 }); },
      holdL(k) { stick(k, [0, -1, 0], [0, -4, 0], 0.3, { c: 0xd8302a }); k.soft([0, -9, 0], [3.4, 4, 3.4], { c: 0xd8f0ff, m: 'glass', t: 'glass' }, { ch: 0.586 }); goldfish(k, [0, -9, 0], 0.4); },
      onHead(k, H) { k.at([H.hw + 1, H.hy + 2, 0], [0, Math.PI / 2, 0], () => k.soft([0, 0, 0], [7, 7, 2], { c: 0xfbfaf4, t: 'paper', d: [D.poly([[-2, 1], [-5, 3], [-1, 2.6]], 0xd8302a), D.poly([[2, 1], [5, 3], [1, 2.6]], 0xd8302a)] }, { ch: 0.5 })); } }));
  },
  takoyaki(k) {
    const W2 = { c: 0xb88a5a, t: 'wood', ga: 'x' };
    k.box([0, 2, 4], [60, 4, 38], { c: 0x8a8a90, t: 'stone' }, { ch: 0.1 });
    k.box([0, 14, 8], [54, 20, 16], { ...W2, d: [D.rect(-24, -8, 24, 8, 0xd8302a, { dir: 'f' }), D.txt('たこ焼', 0, 0, 8, 0xffffff)] }, { ch: 0.1 });
    k.box([0, 25, 4], [44, 3, 14], { c: 0x2a2a30, t: 'metal', d: [D.fn('t', (c, o) => { const fx = ((c.a % 5) + 5) % 5 - 2.5, fy = ((c.b % 5) + 5) % 5 - 2.5; if (fx * fx + fy * fy < 3.6) { o[0] = 160; o[1] = 90; o[2] = 40; } })] }, { ch: 0.2 });
    k.mirror(() => k.box([28, 32, 0], [2, 60, 2], W2, { ch: 0.2 }));
    k.box([0, 62, 2], [62, 3, 30], { c: 0xd8302a, t: 'cloth', d: [D.stripes('x', 8, 4, 0xffffff, { dir: 't' })] }, { ch: 0.2, rot: [0.12, 0, 0] });
    noren(k, [0, 58, 15], 50, 8, 0xd8302a, 'たこ焼');
    k.at([0, 64, 0], [0, 0, 0], () => { k.soft([0, 8, 0], [7, 7, 6], { c: 0xe8503a, t: 'gloss', d: [cute({ y: 0, gap: 3, mouth: 'flat' })] }, { ch: 0.5 }); for (let i = 0; i < 6; i++) k.box([(i - 2.5) * 2.6, 1.5, 2], [2, 4, 2], { c: 0xe8503a, t: 'gloss' }, { ch: 0.5 }); k.box([0, 15.6, 0], [10, 2, 6], { c: 0xffffff, t: 'cloth', d: [D.stripes('x', 2.6, 1, 0xd8302a)] }, { ch: 0.4 }); });
    lantern(k, [-26, 48, 14], 3.6, 9, 0xf2e6c8, '祭');
  },
  yagura(k) {
    const W2 = { c: 0x8a5a32, t: 'wood' };
    k.box([0, 2, 0], [64, 4, 52], { c: 0x9a8a72, t: 'stone' }, { ch: 0.1 });
    for (const x of [-18, 18]) for (const z of [-14, 14]) k.box([x, 22, z], [3, 40, 3], W2, { ch: 0.2 });
    k.box([0, 30, 0], [44, 3, 36], { c: 0xc8302a, t: 'cloth', d: [D.stripes('x', 6, 3, 0xffffff, { dir: 'f' })] }, { ch: 0.15 });
    k.box([0, 34, 0], [42, 5, 34], { c: 0xffffff, t: 'cloth', d: [D.stripes('x', 6, 3, 0xd8302a, { dir: '*' })] }, { ch: 0.1 });
    k.box([0, 52, 0], [46, 2, 38], { c: 0x6a4428, t: 'wood' }, { ch: 0.2 });
    for (let i = 0; i < 5; i++) lantern(k, [-20 + i * 10, 47, 18], 2.4, 5, 0xd8302a, null);
    k.at([0, 37, 0], [0, 0, 0], () => { k.cyl([0, 4, 6], 5, 7, { c: 0xa8582a, t: 'wood', top: 0xf2e6c8, d: [D.band('y', 2, 3, 0x2a1c1c)] }, { rot: [0.3, 0, 0] }); chibi(k, { H: 30, hair: 'buzz', top: { c: 0xffffff, t: 'cloth' }, outfit: { kind: 'hanten', collar: 0x2a3a6a }, hat: { kind: 'band', knot: true, c: 0xd8302a, p: { c: 0xd8302a } }, armL: [90, 20, 40], armR: [130, -20, 20], face: { eye: 'happy', mouth: 'open' } }); });
    for (const [x, z, c] of [[-26, 18, 0xe86a8a], [26, 16, 0x6a8ad8]]) k.at([x, 4, z], [0, x > 0 ? -0.6 : 0.6, 0], () => chibi(k, { H: 34, hair: 'bun', hairC: 0x6a6a72, top: { c, t: 'cloth' }, outfit: { kind: 'kimono', obi: 0xf2c23a }, sleeve: { c, t: 'cloth' }, legs: 'robe', bottom: { c, t: 'cloth' }, armL: [140, 40, 30], armR: [100, -50, 40], face: { eye: 'happy', mouth: 'smile' } }));
  },
  gyakuten(k) {
    k.box([0, 6, 0], [58, 12, 34], { c: 0x3a8ae8, t: 'gloss', d: [D.band('y', 4, 6, 0xffffff)] }, { ch: 0.2, caps: 'bot' });
    k.box([0, 10, 0], [54, 2, 30], { c: 0x7ab8f0, m: 'glass', t: 'water' }, { ch: 0.2 });
    k.at([-6, 14, 2], [0, 0.4, 0.3], () => { goldfish(k, [0, 6, 0], 2.4); });
    k.at([-14, 28, 2], [0, 0, 0.4], () => { stick(k, [0, 0, 0], [12, -3, 0], 1.2, { c: 0xd8302a }); k.cyl([16, -4, 0], 6, 1, { c: 0xf6f2ea, t: 'paper' }, { rot: [0, 0, 0.3] }); });
    k.at([18, 14, -4], [0, -0.4, 0.5], () => chibi(k, { H: 34, hair: 'short', face: { eye: 'x', mouth: 'o' }, top: { c: 0xf2d018, t: 'cloth' }, armL: [160, 20, 0], armR: [160, -20, 0] }));
  },
};

export default {
  id: 'matsuri',
  order: 15,
  name: 'Natsu Matsuri Yomise',
  jp: '夏まつり夜店',
  tagline: 'Summer festival stalls under paper lanterns',
  taglineJp: 'ドンドン、ヒュ～、夏の夜！',
  price: 400,
  themes: ['retro', 'shrine', 'food'],
  card: { bg: '#ffeccc', accent: '#e5383b', text: '#2e1c3a', accent2: '#2f5fb8', pattern: 'waves' },
  capsule: { colors: [0xe5383b, 0xffffff, 0x2f5fb8, 0xffd23f, 0xff8a5a] },
  items: [
    {
      id: 'kingyo', name: 'Goldfish in a Bag', jp: '金魚ぶくろ', rarity: 'common',
      desc: 'Scooped on the fifth try. Has already been named "Captain" by the whole family.',
      fig: F.kingyo,
    },
    {
      id: 'yoyo', name: 'Yo-yo Balloon', jp: 'ヨーヨーつり', rarity: 'common',
      desc: 'Bounces back every time. Pops on the walk home, every year, without fail.',
      fig: F.yoyo,
    },
    {
      id: 'kitsune', name: 'Fox Mask', jp: 'きつねのお面', rarity: 'common',
      desc: 'Worn on the side of the head, the official way. The fox does not mind either way.',
      fig: F.kitsune,
    },
    {
      id: 'chocoban', name: 'Choco Banana Trio', jp: 'チョコバナナ', rarity: 'uncommon',
      desc: 'Rock-paper-scissors for a bonus banana. Lost. Bought three anyway.',
      fig: F.chocoban,
    },
    {
      id: 'wataame', name: 'Wataame Girl', jp: 'わたあめちゃん', rarity: 'uncommon',
      desc: 'Cotton candy bigger than her head, fox mask on the side, goldfish in hand. Peak summer.',
      fig: F.wataame,
    },
    {
      id: 'takoyaki', name: 'Takoyaki Stall', jp: 'たこ焼き屋台', rarity: 'rare',
      desc: 'Eight balls a boat, one octopus each. The mascot on the roof has no comment.',
      fig: F.takoyaki,
    },
    {
      id: 'yagura', name: 'Bon Odori Yagura', jp: '盆踊りやぐら', rarity: 'ultra',
      desc: 'The taiko kid has been drumming since sunset. The aunties will not let him stop.',
      fig: F.yagura,
    },
    {
      id: 'gyakuten', name: 'Goldfish Strikes Back', jp: '逆・金魚すくい', rarity: 'secret',
      desc: 'Tonight the goldfish is doing the scooping. Prize: one very surprised child.',
      fig: F.gyakuten,
    },
  ],
};
