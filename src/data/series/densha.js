// Series 17 — Chibi Densha Daishūgō (ちびでんしゃ大集合)
// Squashed, big-faced chibi trains (and the friends who keep them running). Choo-choo, but chunky.
// Chibi Densha: trains, stations and railway folk as blocky toy figures with painted liveries (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, sign, car, cute, lantern, WOOD, WHITE } from '../../figures/props.js';

const rail = (k, L = 60) => { k.box([0, 1, 0], [24, 2, L], { c: 0x8a7a6a, t: 'stone' }, { ch: 0.2 }); for (let z = -L / 2 + 3; z < L / 2; z += 6) k.box([0, 2.5, z], [20, 1.4, 3], { c: 0x6a4a32, t: 'wood' }, { ch: 0.2 }); k.mirror(() => k.box([6, 3.6, 0], [1.4, 1.4, L], { c: 0x9a9aa4, m: 'metal' }, { ch: 0.2 })); };
const tface = (y = 0, z = 0) => cute({ y, gap: 4.6, er: 1.4, eh: 1.8, mouth: 'smile', mw: 3 });
const F = {
  loop(k) {
    rail(k, 56);
    car(k, [0, 3, 0], { len: 48, col: 0xc8d8c0, band: 0x6ac04a, d: [D.band('y', -9, -6, 0x6ac04a)] });
    k.box([0, 18, 24.4], [15, 16, 1], { c: 0xc8d8c0, t: 'gloss', d: [D.rect(-6, 1, 6, 6, 0x2a3a4a), tface(-3), D.rect(-2, -8, 2, -6, 0x2a2a30)] }, { ch: 0.2 });
    k.box([0, 30.5, 10], [4, 3, 8], { c: 0x3a3a44, t: 'metal' }, { ch: 0.3 });
  },
  tram(k) {
    rail(k, 50);
    car(k, [0, 3, 0], { len: 38, w: 17, h: 20, col: 0xf2e6b8, band: 0x2a7a4a, d: [D.band('y', -10, -3, 0x2a7a4a)] });
    k.box([0, 20, 19.4], [16, 18, 1], { c: 0xf2e6b8, t: 'gloss', d: [D.rect(-6.5, 2, 6.5, 8, 0x2a3a4a), tface(-3), D.rect(-8, -9, 8, -3, 0x2a7a4a)] }, { ch: 0.2 });
    stick(k, [0, 32, 4], [0, 44, -10], 0.8, { c: 0x2a2a30 }); k.box([0, 44, -10], [10, 1, 1], 0x2a2a30);
    k.cyl([4, 33, 14], 2, 2, { c: 0xe8c040, m: 'metal' }, { top: 0.5 });
  },
  ekiben(k) {
    k.box([0, 2, 0], [40, 4, 30], { c: 0x9a9aa0, t: 'stone' }, { ch: 0.2 });
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 56, hair: 'bob', hairC: 0x3a2420, face: { eye: 'happy', mouth: 'open' }, top: { c: 0xf4f0e8, t: 'cloth' }, outfit: { kind: 'apron', apron: 0xd8302a }, sleeve: { c: 0xf4f0e8, t: 'cloth' }, hat: { kind: 'band', c: 0xd8302a, p: { c: 0xd8302a, t: 'cloth' } },
      armL: [70, 10, 40], armR: [70, -10, 40], onBody(k, T) { k.box([0, -2, T.hd + 7], [26, 6, 14], { c: 0x8a6a42, t: 'wood', ga: 'x', d: [D.txt('駅弁', 0, 0, 3, 0xffffff)] }, { ch: 0.2 }); for (let i = 0; i < 3; i++) k.box([-8 + i * 8, 2, T.hd + 7], [6.6, 2, 10], { c: [0xd8302a, 0xf2c23a, 0x3a8a4a][i], t: 'paper', d: [D.band('x', -0.6, 0.6, 0x2a1c1c)] }, { ch: 0.2 }); } }));
  },
  ekicho(k) {
    k.box([0, 10, 0], [16, 20, 30], { c: 0xc8c8d0, t: 'metal', top: 0x6ac04a, d: [D.rect(-3, 2, 3, 6, 0x2a2a30, { dir: 'x' })] }, { ch: 0.15 });
    k.at([0, 20, 0], [0, 0, 0], () => beast(k, 'loaf', { c: 0xfbf6ec, size: 0.9, ears: 'tri', inner: 0xf4a8b0, whiskers: true, tail: 'long', face: { eye: 'closed', mouth: 'cat' }, bodyD: [D.ell(-8, 10, 6, 5, 0xe8893a, { dir: '*' }), D.ell(8, 6, 6, 5, 0x3a3230, { dir: 'x' })],
      onBody(k, b) { k.box([0, b.ry * 2 + 2, 0], [14, 4, 12], { c: 0x2a3a6a, t: 'cloth', d: [D.band('y', -1, 0, 0xe8c040)] }, { ch: 0.4 }); k.box([0, b.ry * 2 + 0.6, 7], [12, 1, 5], { c: 0x1a1a1e }, { ch: 0.4 }); } }));
    sign(k, [0, 32, -17], 14, 6, 0xffffff, '駅長', 0x2a3a6a);
  },
  dango(k) {
    rail(k, 60);
    car(k, [0, 3, -6], { len: 40, col: 0xf6f6f2, band: 0x2a4aa8, roof: 0xd8d8de, d: [D.band('y', -7, -5, 0x2a4aa8)] });
    k.at([0, 9, 14], [0, 0, 0], () => k.prism([[-9, 8, 8, 0, 0, 0.45], [0, 8, 8, 0, 0, 0.45], [10, 6, 5.6, 0, -1, 0.5], [16, 2.6, 2, 0, -1, 0.5]], { c: 0xf6f6f2, t: 'gloss', m: 'gloss', d: [D.band('x', -8, -6, 0x2a4aa8), D.fn('*', (c, o) => { if (c.ny > 0.2 && c.y > -2 && c.y < 6) { o[0] = 42; o[1] = 58; o[2] = 74; } }), cute({ y: 8, gap: 4, dir: 'f', mouth: 'smile', x: 0 })] }, { rot: [Math.PI / 2, 0, 0], pf: true, pos: [0, 9, 0] }));
    k.soft([0, 18, 30.5], [3, 3, 2], { c: 0xf6f6f2, t: 'gloss', d: [D.circ(0, 0, 1.6, 0xd8d8de)] }, { ch: 0.586 });
  },
  fumikiri(k) {
    k.box([0, 2, 0], [50, 4, 30], { c: 0x8a8a90, t: 'stone' }, { ch: 0.2 });
    k.box([-10, 30, -4], [3, 54, 3], { c: 0xf6f6f2, t: 'gloss', d: [D.stripes('y', 6, 3, 0x1a1a1e)] }, { ch: 0.3 });
    k.at([-10, 48, -1], [0, 0, 0], () => { k.box([0, 0, 0], [16, 1.6, 1.6], { c: 0x2a2a30 }, { ch: 0.3, rot: [0, 0, 0.78] }); k.box([0, 0, 0], [16, 1.6, 1.6], { c: 0x2a2a30 }, { ch: 0.3, rot: [0, 0, -0.78] }); k.box([0, 0, 0.8], [17, 4, 0.8], { c: 0xf2c018, d: [D.stripes('d', 3, 1.4, 0x1a1a1e)] }, { ch: 0, rot: [0, 0, 0.78] }); k.box([0, 0, 0.8], [17, 4, 0.8], { c: 0xf2c018, d: [D.stripes('e', 3, 1.4, 0x1a1a1e)] }, { ch: 0, rot: [0, 0, -0.78] }); });
    k.mirror(() => k.cyl([-6, 38, 0], 3, 3, { c: 0x2a2a30, d: [D.circ(0, 0, 2.2, 0xe8302a, { dir: 't' })] }, { rot: [Math.PI / 2, 0, 0], pf: true }));
    k.box([10, 18, 2], [40, 2, 2], { c: 0xf6f6f2, d: [D.stripes('x', 6, 3, 0x1a1a1e)] }, { ch: 0.3, rot: [0, 0, 0.08] });
    k.at([6, 4, 10], [0, -0.3, 0], () => beast(k, 'sit', { c: 0xe39a52, c2: 0xfff1df, size: 0.9, ears: 'tri', inner: 0xfff1df, tail: 'curl', mask: true, face: { eye: 'dot', mouth: 'open' } }));
  },
  mujineki(k) {
    k.box([0, 5, 0], [64, 10, 26], { c: 0x9a9aa0, t: 'stone', top: 0xb0b0b4, d: [D.band('z', 10, 13, 0xf2e070)] }, { ch: 0.1 });
    k.box([0, 34, -10], [64, 2, 18], { c: 0x6a6a72, t: 'metal', d: [D.stripes('x', 4, 0.6, 0x5a5a62, { dir: 't' })] }, { ch: 0.2, rot: [0.15, 0, 0] });
    k.mirror(() => k.box([26, 22, -12], [2.4, 24, 2.4], { c: 0x7a5230, t: 'wood' }, { ch: 0.3 }));
    sign(k, [0, 28, -4], 30, 7, 0xffffff, 'なのはな駅', 0x2a3a6a);
    k.box([-10, 13, -6], [24, 2, 7], { c: 0x6a8ab8, t: 'gloss' }, { ch: 0.2 });
    k.mirror(() => k.box([-0, 0, 0], [0, 0, 0], 0xffffff));
    k.at([-14, 14, -6], [0, 0, 0], () => beast(k, 'loaf', { c: 0x2a2628, size: 0.4, ears: 'tri', face: { eye: 'happy' } }));
    k.box([20, 18, -8], [10, 14, 1], { c: 0xf4f0e8, d: [D.txt('時刻表', 0, 4, 2, 0x2a1c1c), D.line(-4, 0, 4, 0, 0.4, 0x2a1c1c), D.txt('7:02', 0, -2, 2, 0x2a1c1c), D.txt('17:40', 0, -5, 2, 0x2a1c1c)] }, { ch: 0 });
    for (const x of [-28, 28]) k.soft([x, 13, 8], [3, 3, 3], { c: 0xf2d018, t: 'felt' }, { ch: 0.586 });
  },
  yellow(k) {
    rail(k, 60);
    car(k, [0, 3, 0], { len: 50, col: 0xf2d018, band: 0x2a2a30, roof: 0xe8c818, d: [D.txt('ドクター', 0, -5, 2.6, 0x2a2a30, { dir: 'x' })] });
    k.box([0, 18, 25.4], [15, 16, 1], { c: 0xf2d018, t: 'gloss', d: [D.rect(-6, 2, 6, 6, 0x2a3a4a), tface(-3), D.circ(-5, -6, 1, 0xfff6c8), D.circ(5, -6, 1, 0xfff6c8)] }, { ch: 0.2 });
    k.box([0, 31, 6], [10, 3, 14], { c: 0xe8e8ee, t: 'metal', d: [D.stripes('z', 2, 0.6, 0x9a9aa4, { dir: 't' })] }, { ch: 0.3 });
  },
};

export default {
  id: 'densha',
  order: 17,
  name: 'Chibi Densha',
  jp: 'ちびでんしゃ大集合',
  tagline: 'Pocket trains with very big faces',
  taglineJp: 'ガタンゴトン！しゅっぱつしんこう',
  price: 300,
  themes: ['city', 'retro'],
  card: { bg: '#e4f1fb', accent: '#2f7fd0', text: '#1e2f4a', accent2: '#8cc63f', pattern: 'stripes' },
  capsule: { colors: [0x8cc63f, 0x2f7fd0, 0xffd23f, 0xffffff, 0xe5383b] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'loop', name: 'Loop Line Densha', jp: '環状線でんしゃ', rarity: 'common',
      desc: 'Goes round and round the city all day. Has never once been late or dizzy.',
      fig: F.loop,
    },
    {
      id: 'tram', name: 'Chin-Chin Tram', jp: 'ちんちん電車', rarity: 'common',
      desc: 'Rings its little bell at every corner. Chin-chin! Chin-chin! Thank you, chin-chin.',
      fig: F.tram,
    },
    {
      id: 'ekiben', name: 'Ekiben-chan', jp: '駅弁ちゃん', rarity: 'common',
      desc: 'Tastes twice as good when eaten at 80 km/h with a view of rice fields.',
      fig: F.ekiben,
    },
    // ------------------------------------------------------------------ uncommon
    {
      id: 'ekicho', name: 'Station Master Mike', jp: '駅長ねこ', rarity: 'uncommon',
      desc: 'Official station master. Duties: napping on the ticket gate, accepting chin scritches.',
      fig: F.ekicho,
    },
    {
      id: 'dango', name: 'Dango-Nose Shinkansen', jp: 'だんごっ鼻の新幹線', rarity: 'uncommon',
      desc: 'The original round-nosed bullet train. Smiles at 210 km/h and waves with its wipers.',
      fig: F.dango,
    },
    // ------------------------------------------------------------------ rare
    {
      id: 'fumikiri', name: 'Kan-Kan Crossing', jp: 'カンカン踏切', rarity: 'rare',
      desc: 'Kan-kan-kan-kan... Shiba has been waiting for the train since breakfast. It is a good wait.',
      fig: F.fumikiri,
    },
    // ------------------------------------------------------------------ ultra
    {
      id: 'mujineki', name: 'Countryside Station', jp: 'いなかの無人駅', rarity: 'ultra',
      desc: 'Two trains a day. The cat on the bench is the only one who knows the timetable.',
      fig: F.mujineki,
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'yellow', name: 'Lucky Yellow Inspector', jp: '幸せの黄色い検測車', rarity: 'secret',
      desc: 'Spot it and you get a lucky day. It is quietly inspecting your luck, too.',
      fig: F.yellow,
    },
  ],
};
