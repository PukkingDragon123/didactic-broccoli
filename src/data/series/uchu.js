// Series 11 — Uchū Neko Station (宇宙ねこステーション)
// Cats in space: helmets, rockets, UFOs and one very stunned cosmic kitty.
// Uchū Neko Station: space cats in the human-style chibi kit, rockets and stations with painted panels (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, cute, WHITE } from '../../figures/props.js';

const SUIT = { c: 0xf4f2ee, t: 'cloth', d: [D.rect(-4, -2, 4, 4, 0x3a6ac8, { ink: 0x1a2a5a, iw: 0.3 }), D.circ(-2, 1, 0.8, 0xe83a3a), D.circ(1, 1, 0.8, 0xf2c23a), D.band('y', -7, -5, 0xe86a2a)] };
const astro = (k, c, o = {}) => chibi(k, { H: 62, animal: { c, ears: 'tri', inner: 0xf4a8b0, whiskers: true, d: o.fur || [] }, face: { eye: 'anime', iris: o.iris ?? 0x3aa0e8, mouth: 'cat', ...(o.face || {}) },
  top: SUIT, sleeve: { c: 0xf4f2ee, t: 'cloth', d: [D.band('y', -6, -4, 0xe86a2a)] }, bottom: { c: 0xf4f2ee, t: 'cloth' }, gloves: { c: 0xe86a2a, t: 'gloss' }, shoes: 0x9a9aa4, sole: 0x5a5a62,
  onHead(k, H) { k.box([0, H.hy + 0.4, 0.6], [H.hw * 2 + 6, H.hh * 2 + 9, H.hd * 2 + 6], { c: 0xd8f0ff, m: 'glass', t: 'glass' }, { ch: 0.5 }); if (o.onHead) o.onHead(k, H); },
  onBody(k, T) { k.box([0, 0, -T.hd - 3.5], [T.hw * 1.7, T.hh * 1.7, 6], { c: 0xd8d8de, t: 'metal', d: [D.rect(-4, 2, 4, 5, 0x3a3a44, { dir: 'b' })] }, { ch: 0.3 }); }, ...o });
const STARS = (n = 9) => (c, o) => {};
const F = {
  astro(k) {
    astro(k, 0xe8a04a, { fur: [D.stripes('y', 3.4, 1.1, 0xc8702a, { dir: 'x' })], armR: [150, -20, 0], armL: [30, 20, 50],
      holdR(k) { k.box([0, 6, 0], [1, 14, 1], { c: 0xd8d8de, m: 'metal' }); k.box([5, 11, 0], [9, 6, 0.6], { c: 0xe83a3a, d: [D.circ(0, 0, 1.8, 0xffffff), D.circ(0, 0, 1.8, 0xffffff, { dir: 'b' })] }, { ch: 0 }); } });
  },
  nap(k) {
    k.soft([0, 16, 0], [20, 16, 20], { c: 0xf29a5a, t: 'crust', c2: 0xd86a3a, d: [D.stripes('y', 6, 2, 0xe8805a), D.ell(10, 4, 5, 3, 0xd86a3a, { dir: 'f' })] }, { ch: 0.586, bev: 0.42, bs: 0.62 });
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; k.box([Math.cos(a) * 25, 16, Math.sin(a) * 25], [9.4, 1.2, 4], { c: i % 2 ? 0xe8d8a8 : 0xd8c088, t: 'gloss' }, { rot: [0, -a, 0], ch: 0.3 }); }
    k.at([0, 31, 0], [0, 0.3, 0], () => beast(k, 'loaf', { c: 0xfbf6ec, size: 0.66, ears: 'tri', inner: 0xf4a8b0, tail: 'long', face: { eye: 'closed', mouth: 'cat' }, bodyD: [D.ell(-8, 10, 6, 5, 0x3a3230, { dir: '*' })] }));
    k.cyl([0, 0.7, 0], 6, 1.4, { c: 0x2a2a3a }); stick(k, [0, 1, 0], [0, 4, 0], 2, { c: 0x5a5a6a });
  },
  rocket(k) {
    const B = { c: 0xf4f2ee, t: 'gloss', m: 'gloss', d: [D.band('y', 4, 7, 0xe83a3a), D.txt('No.1', 0, -6, 4, 0xe83a3a), D.circ(0, 12, 4.4, 0x9ad8f8, { dir: 'f', ink: 0x8a8a96, iw: 1 })] };
    k.cyl([0, 32, 0], 10, 40, B, { top: 0.95 });
    k.prism([[0, 9.5, 9.5, 0, 0, 0.586], [7, 8, 8, 0, 0, 0.586], [14, 4, 4, 0, 0, 0.586], [18, 1, 1, 0, 0, 0.586]], { c: 0xe83a3a, t: 'gloss', m: 'gloss' }, { pos: [0, 52, 0] });
    for (let i = 0; i < 4; i++) k.at([0, 16, 0], [0, (i * Math.PI) / 2, 0], () => k.box([0, 0, 12], [2, 16, 10], { c: 0xe83a3a, t: 'gloss' }, { ch: 0.3, top: [1, 0.3], sh: [0, -3] }));
    k.cyl([0, 9, 0], 6, 6, { c: 0x6a6a72, t: 'metal' }, { top: 1.3 });
    for (let i = 0; i < 5; i++) k.soft([(i - 2) * 3.4, 3.6, (i % 2) * 2], [3, 3, 3], { c: [0xf6c83a, 0xf28a2a, 0xe8503a][i % 3], t: 'plush' }, { ch: 0.586 });
    k.at([0, 39, 6], [0, 0, 0], () => k.soft([0, 0, 0], [3.4, 2.8, 2], { c: 0x2a2628, t: 'fur', d: [cute({ eye: 'dot', gap: 1.4, er: 0.5, eh: 0.7, mw: 1, my: -1, blush: false })] }, { ch: 0.5 }));
  },
  ufo(k) {
    k.cyl([0, 1, 0], 10, 2, { c: 0x2a2a3a });
    k.cyl([0, 14, 0], 9, 22, { c: 0xc8ff7a, m: 'glass', t: 'glass' }, { top: 0.4 });
    k.at([0, 6, 0], [0, 0, 0], () => k.prism([[-6, 1.4, 1.2, 0, 0, 0.5], [0, 3, 2.2, 0, 0, 0.5], [6, 1.6, 1.4, 0, 0, 0.5]], { c: 0x8aa8c8, t: 'gloss', d: [D.circ(1.6, -3.6, 0.6, 0x1a1a1a, { dir: 'f' })] }, { rot: [0, 0, Math.PI / 2], pf: true }));
    k.cyl([0, 30, 0], 26, 4, { c: 0xb8bcc8, t: 'metal', d: [D.dots(5, 1, 0xf6d84a, { dir: '*' })] }, { top: 0.7 });
    k.cyl([0, 27, 0], 14, 3, { c: 0x8a8e98, t: 'metal' });
    k.soft([0, 37, 0], [12, 7, 12], { c: 0xc8e8ff, m: 'glass', t: 'glass' }, { ch: 0.586, bev: 0.6, bs: 0.55 });
    k.at([0, 32, 0], [0, 0, 0], () => beast(k, 'loaf', { c: 0x8a8a92, size: 0.42, ears: 'tri', face: { eye: 'anime', iris: 0x8ad83a, mouth: 'fang' }, whiskers: true }));
  },
  usagi(k) {
    k.soft([0, 5, 0], [26, 5, 22], { c: 0xc8c8c4, t: 'stone', d: [D.circ(-10, 6, 4, 0xa8a8a4, { dir: 't' }), D.circ(12, -8, 3, 0xa8a8a4, { dir: 't' }), D.circ(8, 10, 2, 0xa8a8a4, { dir: 't' })] }, { flat: true, ch: 0.586, bev: 0.5 });
    k.at([-4, 9, 0], [0, 0.2, 0], () => chibi(k, { H: 50, animal: { c: 0xfbf8f2, ears: 'long', inner: 0xf4a8b0 }, face: { eye: 'anime', iris: 0xe83a5a, mouth: 'open' }, top: SUIT, sleeve: { c: 0xf4f2ee, t: 'cloth' }, bottom: { c: 0xf4f2ee, t: 'cloth' }, gloves: { c: 0xe86a2a }, shoes: 0x9a9aa4,
      legL: [-30, 6], legR: [30, 6], armL: [150, 20, 0], armR: [30, -20, 30], holdL(k) { k.soft([0, -1, 2], [4, 3.4, 4], { c: 0xfffcf6, t: 'plush', d: [cute({ gap: 1.6, er: 0.6, eh: 0.8, mw: 1.2, my: -1.4 })] }, { ch: 0.586 }); } }));
    k.box([16, 18, -6], [1, 26, 1], { c: 0xd8d8de, m: 'metal' });
    k.box([22, 27, -6], [12, 8, 0.6], { c: 0xffffff, d: [D.circ(0, 0, 3, 0xf6d84a), D.circ(0, 0, 3, 0xf6d84a, { dir: 'b' })] }, { ch: 0 });
  },
  station(k) {
    k.cyl([0, 1, 0], 8, 2, { c: 0x2a2a3a }); stick(k, [0, 2, 0], [0, 22, 0], 2, { c: 0x5a5a6a });
    k.cyl([0, 30, 0], 10, 22, { c: 0xe8e8ee, t: 'metal', d: [D.stripes('y', 5, 0.6, 0x9a9aa4), D.circ(0, 4, 3, 0xf6e09a, { dir: 'f', ink: 0x5a5a62, iw: 0.8 })] });
    k.mirror(() => { k.box([24, 30, 0], [28, 1.4, 16], { c: 0x2a4aa8, t: 'gloss', m: 'gloss', d: [D.check(4, 0x3a5ac8, { dir: 't' }), D.check(4, 0x3a5ac8, { dir: 'u' })] }, { ch: 0.05 }); k.box([11, 30, 0], [4, 3, 3], { c: 0x9a9aa4, t: 'metal' }, { ch: 0.2 }); });
    for (const [x, y, z, c] of [[-4, 41, 9, 0xe8a04a], [5, 33, 9.4, 0x2a2628], [-6, 24, 9.6, 0xfbf6ec], [6, 20, 9, 0x9a9aa0]]) k.soft([x, y, z], [2.6, 2.2, 1.6], { c, t: 'fur', d: [cute({ gap: 1.2, er: 0.5, eh: 0.6, mw: 0.8, my: -1, blush: false })] }, { ch: 0.5 });
    k.cyl([0, 45, 0], 6, 6, { c: 0xe8e8ee, t: 'metal' }, { top: 0.4 });
  },
  saturn(k) {
    k.cyl([0, 1, 0], 9, 2, { c: 0x2a2a3a }); stick(k, [0, 2, 0], [0, 12, 0], 2, { c: 0x5a5a6a });
    k.soft([0, 28, 0], [16, 16, 16], { c: 0xe8c890, t: 'gloss', d: [D.stripes('y', 6, 2, 0xd8a868), D.stripes('y', 6, 0.8, 0xf6e0b0, { ph: 3 })] }, { ch: 0.586, bev: 0.42, bs: 0.62 });
    k.at([0, 28, 0], [0.25, 0, 0.15], () => { for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; k.box([Math.cos(a) * 26, 0, Math.sin(a) * 26], [12, 1.2, 6], { c: i % 2 ? 0xc8b8e8 : 0xe8d8f8, t: 'gloss' }, { rot: [0, -a, 0], ch: 0.3 }); }
      for (const [a, c] of [[0.6, 0xe8a04a], [2.4, 0x2a2628], [4.2, 0xfbf6ec]]) k.at([Math.cos(a) * 26, 1, Math.sin(a) * 26], [0, -a + Math.PI / 2, 0], () => beast(k, 'loaf', { c, size: 0.26, ears: 'tri', face: { eye: 'happy', mouth: 'open' } }));
    });
  },
  cosmic(k) {
    // understood the universe: a cat sitting very still, galaxy fur, enormous pupils
    k.cyl([0, 2, 0], 18, 4, { c: 0x1a1a2a, t: 'gloss', d: [D.dots(3, 0.4, 0xf6f2c8, { dir: 't' })] });
    beast(k, 'sit', { c: 0x2a2a5a, c2: 0x4a3a8a, size: 1.6, ears: 'tri', inner: 0x8a6ae8, tail: 'up', whiskers: true,
      bodyD: [D.dots(3.2, 0.5, 0xf6f2c8, { dir: '*' }), D.star(3, 4, 2.4, 0xf6e09a, { dir: 'f' })], headD: [D.dots(3, 0.4, 0xf6f2c8, { dir: '*' })],
      face: { eye: 'anime', iris: 0xe8d84a, er: 2.4, eh: 2.8, gap: 6, mouth: 'o', mw: 1.6, blush: false } });
  },
};

export default {
  id: 'uchu',
  order: 11,
  name: 'Uchū Neko Station',
  jp: '宇宙ねこステーション',
  tagline: 'Cats on a mission to nap in orbit',
  taglineJp: 'にゃんと宇宙へ！',
  price: 800,
  themes: ['space', 'cute'],
  card: { bg: '#1e2452', accent: '#ffd23f', text: '#f4ecff', accent2: '#8fd3ff', pattern: 'stars' },
  capsule: { colors: [0x2c3f86, 0x8a5bd6, 0xffd23f, 0xbfe3ff, 0xff9fd0] },
  items: [
    {
      id: 'astro', name: 'Astro-Neko', jp: 'アストロにゃん', rarity: 'common',
      desc: 'First cat in orbit. Knocked the Moon off its shelf on day one.',
      fig: F.astro,
    },
    {
      id: 'nap', name: 'Planet Nap', jp: 'わくせいおひるね', rarity: 'common',
      desc: 'Found the warmest planet in the galaxy. Will not be moving, thanks.',
      fig: F.nap,
    },
    {
      id: 'rocket', name: 'Neko Rocket No.1', jp: 'ねこロケット1号', rarity: 'common',
      desc: 'Fuelled entirely by bonito flakes. Smells amazing at launch.',
      fig: F.rocket,
    },
    {
      id: 'ufo', name: 'Fish Abduction UFO', jp: 'さかなアブダクション', rarity: 'uncommon',
      desc: 'Travelled forty light-years for one mackerel. Worth it.',
      fig: F.ufo,
    },
    {
      id: 'usagi', name: 'Moon Rabbit Landing', jp: '月うさぎ着陸', rarity: 'uncommon',
      desc: 'One small hop for a rabbit. One giant mochi for rabbitkind.',
      fig: F.usagi,
    },
    {
      id: 'station', name: 'Neko Space Station', jp: 'ねこ宇宙ステーション', rarity: 'rare',
      desc: 'Crew of four. Mission: find the sunniest window. Going great.',
      fig: F.station,
    },
    {
      id: 'saturn', name: 'Saturn Ring Ride', jp: '土星リングライド', rarity: 'ultra',
      desc: 'The rings go round every ten hours. The cats have been on since Tuesday.',
      fig: F.saturn,
    },
    {
      id: 'cosmic', name: 'Cosmic Cat', jp: '宇宙ねこ', rarity: 'secret',
      desc: 'Understood the entire universe in one second. Has made this face ever since.',
      fig: F.cosmic,
    },
  ],
};
