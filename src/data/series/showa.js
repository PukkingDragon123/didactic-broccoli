// Series 4 — Shōwa Retro Appliances (昭和レトロ家電)
// Nostalgic 1960s–80s Japanese home appliances in miniature, the kind found in grandma's house.
// Shōwa Retro Appliances: household machines of the 60s-70s as blocky figures with enamel, chrome and wood grain.
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, cute, WHITE } from '../../figures/props.js';

const CHROME = { c: 0xd8dae0, m: 'metal', t: 'metal' };
const flowers = (col) => D.fn('*', (c, o) => { const u = ((c.a % 9) + 9) % 9 - 4.5, v = ((c.b % 9) + 9) % 9 - 4.5, r = Math.hypot(u, v), t = Math.atan2(v, u); if (r < 1) { o[0] = 248; o[1] = 208; o[2] = 64; } else if (r < 2.8 + Math.cos(t * 5) * 0.8) { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; } });
const F = {
  suihanki(k) {
    k.cyl([0, 12, 0], 16, 22, { c: 0xfbf8f0, t: 'ceramic', d: [flowers([232, 96, 120]), D.rect(-5, -9, 5, -4, 0xd8d8de, { dir: 'f', ink: 0x8a8a92, iw: 0.3 }), D.circ(3, -6.5, 0.9, 0xe83a3a)] });
    k.cyl([0, 24.5, 0], 16.6, 3, { c: 0xe8e2d4, t: 'ceramic' }, { top: 0.88 });
    k.box([0, 27.4, 0], [14, 2.4, 4], { c: 0x2a2a30, t: 'gloss' }, { ch: 0.4 });
    k.mirror(() => k.box([16.5, 18, 0], [3, 3, 8], { c: 0x2a2a30, t: 'gloss' }, { ch: 0.4 }));
    k.cyl([0, 0.8, 0], 15, 1.6, { c: 0x6a6a72 });
  },
  kurodenwa(k) {
    k.box([0, 9, 0], [30, 18, 28], { c: 0x1a1a1e, t: 'gloss', m: 'gloss' }, { ch: 0.35, top: [0.8, 0.82] });
    k.at([0, 17, 6], [0.5, 0, 0], () => { k.cyl([0, 0, 0], 10, 2, { c: 0x1a1a1e, t: 'gloss', d: [...[...Array(10)].map((_, i) => D.circ(Math.cos(i * 0.55 + 0.6) * 7, Math.sin(i * 0.55 + 0.6) * 7, 1.4, 0xf6f2ea, { dir: 't' })), D.circ(0, 0, 3, 0xf6f2ea, { dir: 't' })] }); k.box([7, 1.2, 4], [1, 1, 4], CHROME); });
    k.at([0, 20, -2], [0, 0, 0], () => { k.box([0, 2, 0], [34, 4, 6], { c: 0x1a1a1e, t: 'gloss', m: 'gloss' }, { ch: 0.5 }); k.mirror(() => k.box([16, 0, 0], [8, 6, 8], { c: 0x1a1a1e, t: 'gloss' }, { ch: 0.5, top: [1.1, 1.1] })); });
    for (let i = 0; i < 6; i++) k.box([-16 - (i % 2), 6 - i * 0.6, -10 + i * 3], [1.4, 1.4, 3], { c: 0x1a1a1e }, { ch: 0.5, rot: [0, 0, (i % 2) * 0.6] });
  },
  senpuki(k) {
    k.box([0, 3, 0], [26, 6, 22], { c: 0x7ac8b8, t: 'gloss', d: [...[0, 1, 2, 3].map((i) => D.rect(-9 + i * 5, -2, -5.4 + i * 5, 2, i === 1 ? 0xf6f2ea : 0xe8e2d4, { dir: 'f', ink: 0x5a8a7a, iw: 0.3 }))] }, { ch: 0.3 });
    k.cyl([0, 20, -2], 2.4, 28, CHROME);
    k.at([0, 38, 0], [0, 0, 0], () => {
      k.box([0, 0, -4], [8, 8, 10], { c: 0x7ac8b8, t: 'gloss' }, { ch: 0.4 });
      k.cyl([0, 0, 4], 17, 6, { c: 0xd8dae0, m: 'metal', t: 'metal', d: [D.stripes('r', 1, 0.08, 0x9a9aa4, { n: 24 }), D.ring(0, 0, 8, 0.6, 0x9a9aa4, { dir: 't' })] }, { rot: [Math.PI / 2, 0, 0], caps: 'both' });
      for (let i = 0; i < 4; i++) k.box([Math.cos(i * 1.57) * 7, Math.sin(i * 1.57) * 7, 4], [6, 12, 0.8], { c: 0x9ad8f0, m: 'glass' }, { ch: 0.5, rot: [0, 0.4, i * 1.57] });
      k.cyl([0, 0, 7.6], 3, 1.6, { c: 0x7ac8b8, t: 'gloss', d: [D.txt('AIR', 0, 0, 1.4, 0xffffff, { dir: 't' })] }, { rot: [Math.PI / 2, 0, 0], pf: true });
    });
  },
  terebi(k) {
    k.mirror(() => k.box([14, 6, 0], [2, 12, 2], { c: 0x6a4428, t: 'wood' }, { ch: 0.3, rot: [0, 0, 0.2] }));
    k.box([0, 28, 0], [40, 30, 26], { c: 0x8a5a32, t: 'wood', ga: 'x', d: [D.rect(-17, -12, 6, 12, 0x2a2a30, { dir: 'f', r: 3 }), D.rect(-15, -10, 4, 10, 0x6aa8a0, { dir: 'f', r: 3 }), D.fn('f', (c, o) => { if (c.x > -15 && c.x < 4 && Math.abs(c.y) < 10 && (Math.floor(c.y * 2) & 1)) { o[0] *= 0.9; o[1] *= 0.92; o[2] *= 0.92; } }), D.circ(12, 6, 3, 0xd8dae0, { dir: 'f', ink: 0x2a2a30, iw: 0.3 }), D.circ(12, -2, 3, 0xd8dae0, { dir: 'f', ink: 0x2a2a30, iw: 0.3 }), D.stripes('y', 1.4, 0.6, 0x5a3a20, { dir: 'f' })] }, { ch: 0.15 });
    k.box([5, 28, 13.6], [10, 22, 1], { c: 0x8a5a32, t: 'wood', d: [D.stripes('y', 1.6, 0.7, 0x5a3a20)] }, { ch: 0 });
    stick(k, [-6, 43, -4], [-16, 62, -6], 0.8, CHROME); stick(k, [-4, 43, -4], [8, 62, -6], 0.8, CHROME);
    k.box([0, 43.6, 0], [12, 1.4, 8], { c: 0xf6f0e0, t: 'cloth', d: [D.stripes('x', 2, 0.6, 0xd8302a)] }, { ch: 0.3 });
  },
  sentakuki(k) {
    k.box([0, 22, 0], [50, 40, 26], { c: 0x9ad0e8, t: 'gloss', m: 'gloss', d: [D.txt('洗濯', -12, 6, 4, 0x2a4a7a), D.txt('脱水', 12, 6, 4, 0x2a4a7a), D.rect(-24, -18, 24, -14, 0xf6f2ea, { dir: 'f' })] }, { ch: 0.2 });
    k.box([0, 44, -8], [50, 6, 10], { c: 0xf6f2ea, t: 'gloss', d: [D.circ(-14, 0, 2, 0x5a5a62, { dir: 'f' }), D.circ(14, 0, 2, 0x5a5a62, { dir: 'f' })] }, { ch: 0.3 });
    k.box([-12, 42.6, 5], [22, 1, 14], { c: 0x6a9ac8, m: 'glass', t: 'water', d: [D.circ(2, 0, 2, 0xffffff, { dir: 't' }), D.circ(-4, 3, 1.4, 0xffffff, { dir: 't' })] }, { ch: 0.3 });
    k.box([13, 43.4, 5], [20, 1.4, 14], { c: 0xf6f2ea, t: 'gloss' }, { ch: 0.3 });
    k.box([-20, 48, 8], [8, 1.4, 4], { c: 0xf6a0b8, t: 'cloth' }, { ch: 0.3, rot: [0, 0, 0.4] });
  },
  rajikase(k) {
    k.box([0, 16, 0], [56, 30, 14], { c: 0x3a3a40, t: 'gloss', d: [D.fn('f', (c, o) => { for (const x of [-17, 17]) { const r = Math.hypot(c.x - x, c.y + 2); if (r < 9) { o[0] = o[1] = o[2] = r < 3 ? 160 : (Math.floor(r * 2) & 1) ? 40 : 60; } } }), D.rect(-7, -8, 7, 4, 0x1a1a1e, { dir: 'f' }), D.rect(-5, -5, 5, 1, 0x6a5a4a, { dir: 'f' }), D.circ(-2.4, -2, 1, 0xd8d8de), D.circ(2.4, -2, 1, 0xd8d8de), D.rect(-24, 9, 24, 13, 0xc8c8d0, { dir: 'f' }), D.stripes('x', 2, 0.3, 0x2a2a30, { dir: 'f' })] }, { ch: 0.15 });
    k.box([0, 33, -2], [44, 3, 4], CHROME, { ch: 0.4 });
    for (let i = 0; i < 5; i++) k.box([-12 + i * 6, 32, 5], [4, 2, 3], { c: 0xc8c8d0, t: 'metal' }, { ch: 0.3 });
    stick(k, [22, 31, -4], [30, 56, -4], 0.8, CHROME);
  },
  kotatsu(k) {
    k.box([0, 2, 0], [66, 4, 50], { c: 0xc8a868, t: 'tatami', d: [D.band('z', -25, -23, 0x2a3a2a)] }, { ch: 0.1 });
    k.box([0, 12, 0], [46, 14, 40], { c: 0xd8603a, t: 'cloth', d: [D.check(5, 0xc8502a), D.stripes('x', 10, 1, 0xf2c23a, { dir: '*' })] }, { ch: 0.3, top: [0.9, 0.9] });
    k.box([0, 20.5, 0], [48, 3, 42], { c: 0x8a5a32, t: 'wood', ga: 'x' }, { ch: 0.2 });
    k.cyl([4, 23.5, 2], 9, 2, { c: 0xd8b878, t: 'tatami' }, { top: 1.1 });
    for (const [x, z] of [[1, 0], [7, 4], [4, -2], [5, 1]]) k.soft([x, 27 + (x === 5 ? 3 : 0), z], [3.2, 2.8, 3.2], { c: 0xf28a1a, t: 'crust', c2: 0xd86a10 }, { ch: 0.586 });
    k.at([-16, 22, 0], [0, 0, 0], () => beast(k, 'loaf', { c: 0xe8a04a, size: 0.5, ears: 'tri', face: { eye: 'closed' }, bodyD: [D.stripes('y', 3, 1, 0xc8702a, { dir: 'x' })] }));
    k.at([0, 6, 21], [0, 0, 0], () => beast(k, 'loaf', { c: 0x2a2628, size: 0.42, ears: 'tri', face: { eye: 'happy' } }));
  },
  massage(k) {
    k.box([0, 6, 0], [36, 12, 34], { c: 0x6a3a2a, t: 'gloss' }, { ch: 0.2 });
    k.box([0, 15, 2], [32, 6, 30], { c: 0x8a4a32, t: 'gloss', d: [D.stripes('z', 4, 0.6, 0x6a3a2a, { dir: 't' })] }, { ch: 0.4 });
    k.box([0, 34, -14], [32, 36, 8], { c: 0x8a4a32, t: 'gloss', d: [D.stripes('y', 4, 0.6, 0x6a3a2a, { dir: 'f' })] }, { ch: 0.3, rot: [-0.15, 0, 0] });
    k.mirror(() => k.box([18, 22, 0], [6, 10, 30], { c: 0x6a3a2a, t: 'gloss', d: [D.rect(-2, -2, 2, 2, 0xe8c040, { dir: 't' })] }, { ch: 0.3 }));
    k.box([20, 26, 12], [6, 2, 6], { c: 0xc8c8d0, t: 'metal', d: [D.txt('10円', 0, 0, 1.6, 0x2a1c1c, { dir: 't' })] }, { ch: 0.2 });
    k.at([0, 17, 0], [0, 0, 0], () => chibi(k, { H: 52, sit: true, hair: 'bald', skin: 0xf2c8a8, face: { eye: 'closed', mouth: 'wavy', brow: 'soft', browC: 0xd8d8de, nose: 'dot' }, top: { c: 0x8a8a92, t: 'knit' }, outfit: { kind: 'hanten', collar: 0x4a4a52 }, sleeve: { c: 0x8a8a92, t: 'knit' }, bottom: { c: 0x5a5a62, t: 'cloth' }, armL: [30, 20, 40], armR: [30, -20, 40], legL: [80, 8], legR: [80, -8], head: [-10, 0, 8],
      onHead(k, H) { k.mirror(() => k.box([H.hw + 0.6, H.hy, -2], [2, 6, 8], { c: 0xd8d8de, t: 'hair' }, { ch: 0.4 })); k.box([H.hw + 2, H.hy - 9, 4], [3, 3, 1], { c: 0x9ad8f8, m: 'glass' }, { ch: 0.4 }); } }));
  },
};

export default {
  id: 'showa',
  order: 4,
  name: 'Shōwa Retro Appliances',
  jp: '昭和レトロ家電',
  tagline: "Tiny treasures from grandma's house",
  taglineJp: 'なつかしい！おばあちゃん家の家電',
  price: 300,
  themes: ['retro', 'home'],
  card: { bg: '#f6e6c4', accent: '#d8692e', text: '#4a2a17', accent2: '#3f9a8c', pattern: 'checker' },
  capsule: { colors: [0xe9b43c, 0xd8692e, 0x5fb3a3, 0xf3e2c0, 0x9aa84a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'suihanki', name: 'Flower Rice Cooker', jp: '花柄炊飯器', rarity: 'common',
      desc: 'Every Shōwa kitchen had one. The flowers make the rice 12% fluffier.',
      fig: F.suihanki,
    },
    {
      id: 'kurodenwa', name: 'Black Rotary Phone', jp: '黒電話', rarity: 'common',
      desc: 'Dialling a zero takes so long you forget who you were calling.',
      fig: F.kurodenwa,
    },
    {
      id: 'senpuki', name: 'Piano-Key Fan', jp: '扇風機', rarity: 'common',
      desc: 'Talk into the blades: "We... are... aliens..." Every kid did it.',
      fig: F.senpuki,
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'terebi', name: 'Wooden TV on Legs', jp: '家具調テレビ', rarity: 'uncommon',
      desc: 'Smack the side twice for a clearer picture. Grandpa\'s official method.',
      fig: F.terebi,
    },
    {
      id: 'sentakuki', name: 'Twin-Tub Washer', jp: '二槽式洗濯機', rarity: 'uncommon',
      desc: 'Wash on the left, spin on the right, lose one sock somewhere in between.',
      fig: F.sentakuki,
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'rajikase', name: 'Radio-Cassette Boombox', jp: 'ラジカセ', rarity: 'rare',
      desc: 'Holds one mixtape, taped off the radio, with the DJ talking over the intro.',
      fig: F.rajikase,
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'kotatsu', name: 'Kotatsu & Mikan', jp: 'こたつとみかん', rarity: 'ultra',
      desc: 'Once you get in, you never get out. The cat figured this out years ago.',
      fig: F.kotatsu,
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'massage', name: "Ojii-chan's Massage Chair", jp: 'じいちゃんのマッサージチェア', rarity: 'secret',
      desc: 'Ten yen buys three minutes of massage. He has been asleep for forty.',
      fig: F.massage,
    },
  ],
};
