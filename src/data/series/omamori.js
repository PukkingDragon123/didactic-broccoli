// Series 12 — Kaiun Omamori (開運おまもり)
// A premium run of lucky shrine charms: deep lacquer reds, real-gold accents and tiny glowing lanterns.
// Kaiun Omamori: lucky charms and shrine goods as blocky figures with brocade, lacquer and gold leaf (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, lantern, sign, cute, WHITE } from '../../figures/props.js';

const GOLD = { c: 0xe8c040, m: 'metal', t: 'metal' };
const RED = { c: 0xd8302a, t: 'lacquer' };
const F = {
  pouch(k) {
    k.box([0, 20, 0], [26, 34, 6], { c: 0xc8202e, t: 'cloth', d: [D.fn('*', (c, o) => { const u = Math.floor(c.a / 2.2), v = Math.floor(c.b / 2.2); if (((u + v) & 3) === 0) { o[0] = 232; o[1] = 176; o[2] = 64; } }), D.rect(-7, -6, 7, 12, 0xf6f0e0, { ink: 0xe8c040, iw: 0.6, dir: 'f' }), D.txt('御守', 0, 3, 7, 0x2a1c1c, { vert: true })] }, { ch: 0.3, top: [0.86, 1] });
    k.box([0, 39, 0], [8, 4, 6.4], { c: 0xe8c040, t: 'cloth' }, { ch: 0.4 });
    for (const s of [-1, 1]) k.box([s * 3, 44, 0], [2.6, 8, 2.6], { c: 0xe8c040, t: 'cloth' }, { ch: 0.5, rot: [0, 0, s * 0.5] });
  },
  ema(k) {
    k.prism([[-12, 18, 2, 0, 0, 0], [8, 18, 2, 0, 0, 0], [16, 4, 2, 0, 0, 0.0]], { c: 0xe6c48a, t: 'wood', d: [D.txt('絵馬', 0, 10, 4, 0x2a1c1c), D.fn('f', (c, o) => { if (c.y > -9 && c.y < 6 && Math.abs(c.x) < 15) { o[0] *= 0.98; } }),
      D.ell(0, -2, 9, 5, 0xfbf8f0, { ink: 0x2a1c1c, iw: 0.5 }), D.ell(-6, 2, 3, 3, 0xfbf8f0, { ink: 0x2a1c1c, iw: 0.5 }), D.rect(-5, -8, -3, -4, 0x2a1c1c), D.rect(3, -8, 5, -4, 0x2a1c1c), D.circ(-7, 3, 0.6, 0x2a1c1c), D.path([[-8, 5], [-6, 7], [-3, 4]], 0.8, 0xd8302a),
      D.txt('シークレット', 0, 4, 2.6, 0x2a1c1c, { dir: 'b' }), D.txt('でますように', 0, -2, 2.6, 0x2a1c1c, { dir: 'b' })] }, { pos: [0, 16, 0] });
    k.box([0, 2, 0], [30, 4, 12], { c: 0x8a5a32, t: 'wood' }, { ch: 0.3 });
    k.box([0, 33, 0], [3, 3, 3], { c: 0xd8302a, t: 'cloth' }, { ch: 0.4 });
  },
  omikuji(k) {
    k.box([0, 20, 0], [20, 40, 20], { c: 0xe6c48a, t: 'wood', d: [D.txt('おみくじ', 0, 4, 4, 0xd8302a, { vert: true })] }, { ch: 0.2 });
    k.cyl([0, 40.6, 0], 2, 1.2, { c: 0x2a2a30 });
    k.at([6, 42, 0], [0, 0, -0.4], () => { k.box([0, 6, 0], [2, 14, 1], { c: 0xe6c48a, t: 'wood', d: [D.txt('大吉', 0, 2, 1.8, 0xd8302a, { vert: true })] }, { ch: 0.2 }); });
    k.box([-16, 5, 6], [10, 10, 1], { c: 0xfbf8f0, t: 'paper', d: [D.txt('大吉', 0, 0, 4.6, 0xd8302a, { vert: true })] }, { ch: 0, rot: [-0.3, 0.3, 0] });
  },
  daruma(k) {
    k.soft([0, 20, 0], [17, 20, 15], { c: 0xd8202a, t: 'lacquer', d: [D.ell(0, 5, 11, 10, 0xfbf6ea, { dir: 'f' }), D.circ(-5, 7, 3, 0xffffff, { ink: 0x2a1c1c, iw: 0.6 }), D.circ(-5, 7, 1.8, 0x1a1a1a), D.circ(5, 7, 3, 0xffffff, { ink: 0x2a1c1c, iw: 0.6 }), D.path([[-9, 11], [-6, 12.5], [-2, 11]], 1, 0x1a1a1a), D.path([[2, 11], [6, 12.5], [9, 11]], 1, 0x1a1a1a),
      D.path([[-6, 1], [-3, -1], [0, 0], [3, -1], [6, 1]], 1, 0x1a1a1a), D.arc(0, -1, 2, 1, Math.PI + 0.4, 2 * Math.PI - 0.4, 0.7, 0xd8202a), D.txt('福', 0, -10, 8, 0xe8c040), D.txt('必勝', 0, 0, 7, 0xe8c040, { dir: 'b', vert: true })] }, { flat: true, ch: 0.586, bev: 0.45, bs: 0.65 });
  },
  maneki(k) {
    beast(k, 'sit', { c: 0xfbf8f2, c2: 0xffffff, size: 1.5, ears: 'tri', inner: 0xf4a8b0, tail: 'none', t: 'gloss', face: { eye: 'happy', mouth: 'cat' }, headD: [D.ell(-7, 5, 3, 3, 0xe8893a), D.ell(7, 6, 3, 2, 0x2a2628)],
      bodyD: [D.band('y', 6, 8, 0xd8302a), D.circ(0, 5, 2, 0xe8c040, { dir: 'f', ink: 0x8a6a10, iw: 0.3 }), D.rect(-5, -6, 5, 2, 0xe8c040, { dir: 'f', ink: 0x8a6a10, iw: 0.3 }), D.txt('千万両', 0, -2, 2.6, 0x2a1c1c)] });
    k.at([9, 22, 4], [0, 0, 2.8], () => k.box([0, -5, 0], [6, 12, 6], { c: 0xfbf8f2, t: 'gloss', d: [D.circ(0, -4, 1.4, 0xf4a8b0, { dir: 'f' })] }, { ch: 0.5 }));
  },
  kitsune(k) {
    k.box([0, 5, 0], [30, 10, 24], { c: 0x9a9aa0, t: 'stone' }, { ch: 0.15 });
    k.at([0, 10, 0], [0, 0, 0], () => beast(k, 'sit', { c: 0xf2f0ea, c2: 0xffffff, size: 1.3, ears: 'tri', inner: 0xd8302a, tail: 'up', face: { eye: 'happy', mouth: 'cat' }, headD: [D.poly([[-4, 3], [-7, 7], [-3, 6]], 0xd8302a, { dir: 'f' }), D.poly([[4, 3], [7, 7], [3, 6]], 0xd8302a, { dir: 'f' })],
      onBody(k, b) { k.box([0, b.bh - 3, 5], [b.bw * 0.9, 6, 4], { c: 0xd8302a, t: 'cloth' }, { ch: 0.4, top: [0.8, 1] }); } }));
    k.at([-10, 30, 10], [0, 0, 0], () => k.box([0, 0, 0], [6, 2.4, 4], { c: 0xd8a050, t: 'crust' }, { ch: 0.4 }));
  },
  jinja(k) {
    k.box([0, 3, 0], [56, 6, 46], { c: 0x9a9aa0, t: 'stone' }, { ch: 0.1 });
    k.box([0, 18, -8], [28, 20, 18], { c: 0xe6c48a, t: 'wood', d: [D.rect(-8, -8, 8, 6, 0x6a4428, { dir: 'f' })] }, { ch: 0.1 });
    k.box([0, 32, -8], [38, 8, 26], { c: 0x3a4a3a, t: 'stone', d: [D.stripes('x', 3, 0.8, 0x2a3a2a, { dir: '*' })] }, { ch: 0.2, top: [0.5, 0.4] });
    const TORII = { c: 0xd8402a, t: 'lacquer' };
    for (const x of [-10, 10]) k.cyl([x, 18, 14], 1.8, 30, TORII);
    k.box([0, 32, 14], [30, 3, 3], { c: 0x2a2a30, t: 'lacquer' }, { ch: 0.2, sh: [0, 0], top: [1.08, 1] });
    k.box([0, 28, 14], [24, 2, 2], TORII, { ch: 0.2 });
    lantern(k, [-20, 14, 10], 3, 7, 0xf2e6c8, null);
    lantern(k, [20, 14, 10], 3, 7, 0xf2e6c8, null);
    k.at([-18, 6, -2], [0, 0.5, 0], () => beast(k, 'sit', { c: 0xf2f0ea, size: 0.4, ears: 'tri', inner: 0xd8302a, tail: 'up', face: { eye: 'happy' } }));
    k.at([18, 6, -2], [0, -0.5, 0], () => beast(k, 'sit', { c: 0xf2f0ea, size: 0.4, ears: 'tri', inner: 0xd8302a, tail: 'up', face: { eye: 'happy' } }));
  },
  takarabune(k) {
    k.at([0, 0, 0], [0, 0, 0], () => {
      k.prism([[0, 22, 7, 0, 0, 0.5], [6, 28, 11, 0, 0, 0.5], [12, 30, 12, 0, 0, 0.5]], { ...GOLD, d: [D.stripes('y', 3, 0.6, 0xb8901a), D.band('y', 10, 12, 0xd8302a)] }, { pos: [0, 0, 0] });
      k.box([24, 18, 0], [6, 14, 6], GOLD, { ch: 0.3, top: [0.6, 0.8], rot: [0, 0, -0.3] });
      k.box([0, 28, 0], [2, 26, 2], { c: 0x8a5a2a, t: 'wood' }, { ch: 0.3 });
      k.box([0, 32, 1.4], [26, 18, 1], { c: 0xf6f0e0, t: 'cloth', d: [D.txt('寶', 0, 0, 12, 0xd8302a), D.txt('寶', 0, 0, 12, 0xd8302a, { dir: 'b' })] }, { ch: 0.05 });
      for (const [x, z, c] of [[-14, 4, 0xe8c040], [-8, -4, 0xd8302a], [10, 4, 0xe8c040], [14, -3, 0x3a8a4a]]) k.soft([x, 15, z], [3.4, 3, 3], { c, m: 'metal', t: 'metal' }, { ch: 0.586 });
      k.box([-6, 15, 4], [6, 4, 4], { ...GOLD, d: [D.txt('千両', 0, 0, 1.6, 0xd8302a)] }, { ch: 0.3 });
    });
  },
};

export default {
  id: 'omamori',
  order: 12,
  name: 'Kaiun Omamori',
  jp: '開運おまもり',
  tagline: 'Premium lucky shrine charms in lacquer & gold',
  taglineJp: '福を呼ぶ！ごりやくコレクション',
  price: 1000,
  themes: ['shrine'],
  card: { bg: '#fff1e2', accent: '#c8202c', text: '#4a1218', accent2: '#e0a92e', pattern: 'waves' },
  capsule: { colors: [0xc8202c, 0xf2c14e, 0xfbf8f2, 0x241818, 0xe2452e] },
  items: [
    {
      id: 'pouch', name: 'Brocade Omamori', jp: '錦のお守り', rarity: 'common',
      desc: 'Do not open it. The luck leaks out. Everyone knows this.',
      fig: F.pouch,
    },
    {
      id: 'ema', name: 'Ema Horse Plaque', jp: '絵馬', rarity: 'common',
      desc: 'Wish on the back says "please let me pull the secret". Relatable.',
      fig: F.ema,
    },
    {
      id: 'omikuji', name: 'Omikuji Box', jp: 'おみくじ箱', rarity: 'common',
      desc: 'Shaken forty-one times until it finally said 大吉. Fate was negotiated.',
      fig: F.omikuji,
    },
    {
      id: 'daruma', name: 'One-Eyed Daruma', jp: '片目だるま', rarity: 'uncommon',
      desc: 'One eye in for the wish, one eye left for when it comes true. No pressure.',
      fig: F.daruma,
    },
    {
      id: 'maneki', name: 'Maneki-neko', jp: '招き猫', rarity: 'uncommon',
      desc: 'Beckons customers, luck and, on Tuesdays, pigeons.',
      fig: F.maneki,
    },
    {
      id: 'kitsune', name: 'Inari Kitsune Guardian', jp: 'お稲荷さんの狐', rarity: 'rare',
      desc: 'Guards the shrine day and night. Accepts fried tofu as a bribe.',
      fig: F.kitsune,
    },
    {
      id: 'jinja', name: 'Tiny Inari Shrine', jp: 'ちいさな神社', rarity: 'ultra',
      desc: 'A whole shrine for one very small god. The lanterns stay lit all night.',
      fig: F.jinja,
    },
    {
      id: 'takarabune', name: 'Golden Takarabune', jp: '黄金の宝船', rarity: 'secret',
      desc: 'The Seven Lucky Gods went on holiday and left the cargo. Finders keepers.',
      fig: F.takarabune,
    },
  ],
};
