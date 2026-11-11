// Series — Dagashi-ya Omocha (駄菓子屋おもちゃ)
// Old-school toys you can actually play with (src/game/toys.js): `toy` names the behaviour, `parts` builds the
// pieces that move on their own, `screen` marks the LCD for the pocket game.
// Dagashi-ya Omocha: playable penny-shop toys (src/game/toys.js) as blocky figures with printed detail (src/figures).
// Toy items name their gimmick points (pts, mm) and moving parts (figParts) for toys.js.
import { chibi, D } from '../../figures/chibi.js';
import { stick, cute, WHITE } from '../../figures/props.js';

const ken = (k) => {
  const L = { c: 0xc8302a, t: 'lacquer' };
  k.box([0, 4, 0], [5, 22, 5], { c: 0xe6c48a, t: 'wood' }, { ch: 0.3, top: [0.7, 0.7] });
  k.box([0, 20, 0], [24, 6, 7], L, { ch: 0.4 });
  k.cyl([-12, 22, 0], 4.4, 4, L, { rot: [0, 0, Math.PI / 2], top: 1.3 });
  k.cyl([10, 22, 0], 3.6, 4, L, { rot: [0, 0, -Math.PI / 2], top: 1.3 });
  k.cyl([0, 25, 0], 2.6, 5, L, { top: 0.4 });
  k.cyl([0, -6, 0], 3.4, 3, L, { top: 1.2 });
};
const tama = (k, at = [0, 0, 0]) => k.soft(at, [6, 6, 6], { c: 0xd8302a, t: 'lacquer', d: [D.band('y', -1, 1, 0xfbfbf2), D.circ(0, 0, 1.2, 0x2a1c1c, { dir: 't' })] }, { ch: 0.586, bev: 0.45, bs: 0.6 });
const dart = (k) => { k.box([0, 0, -2], [3.4, 3.4, 10], { c: 0xff8c2e, t: 'foam' }, { ch: 0.5 }); k.box([0, 0, 4], [4.4, 4.4, 2.4], { c: 0x3f86e8, t: 'gloss' }, { ch: 0.5 }); };
const F = {
  squishy(k) {
    k.soft([0, 11, 0], [17, 11, 17], { c: 0xf2d888, t: 'crust', c2: 0xd8a050, d: [D.fn('t', (c, o) => { const u = c.a + c.b, v = c.a - c.b; if (((u % 6) + 6) % 6 < 0.8 || ((v % 6) + 6) % 6 < 0.8) { o[0] *= 0.82; o[1] *= 0.78; o[2] *= 0.7; } }), cute({ y: -2, gap: 5, er: 1.4, eh: 1.8, mouth: 'cat' })] }, { flat: true, ch: 0.586, bev: 0.5, bs: 0.7 });
  },
  superball(k) { k.soft([0, 13, 0], [13, 13, 13], { c: 0x3fd0f0, t: 'gloss', m: 'gloss', d: [D.stripes('d', 8, 2.2, 0xf6e83a, { dir: '*' }), D.stripes('e', 8, 1.4, 0xf04a9a, { dir: '*' }), D.ell(-4, 5, 3, 2, 0xffffff, { alpha: 0.6 })] }, { ch: 0.586, bev: 0.42, bs: 0.6 }); },
  koma(k) {
    k.prism([[0, 1, 1, 0, 0, 0.586], [6, 10, 10, 0, 0, 0.586], [12, 16, 16, 0, 0, 0.586], [16, 14, 14, 0, 0, 0.586]], { c: 0xe6c48a, t: 'wood', top: 0xf2d8a8, d: [D.band('y', 7, 9, 0xd8302a), D.band('y', 11, 12.4, 0x2a8a4a), D.band('y', 13.6, 15, 0x2a4aa8), D.fn('t', (c, o) => { const r = Math.hypot(c.a, c.b); if (r > 8 && r < 10) { o[0] = 216; o[1] = 48; o[2] = 42; } if (r > 4 && r < 5) { o[0] = 42; o[1] = 74; o[2] = 168; } })] });
    k.cyl([0, 19, 0], 2, 6, { c: 0x8a5a2a, t: 'wood' });
    k.cyl([0, -1, 0], 0.6, 2, { c: 0x9a9aa4, m: 'metal' });
  },
  yoyo(k) {
    for (const z of [-3.4, 3.4]) k.cyl([0, 15, z], 14, 6, { c: 0xe8302a, t: 'gloss', m: 'gloss', d: [D.ring(0, 0, 9, 1.2, 0xf6f2ea, { dir: z > 0 ? 't' : 'u' }), D.star(0, 0, 5, 0xf6d84a, { dir: z > 0 ? 't' : 'u' })] }, { rot: [Math.PI / 2, 0, 0], top: 0.9 });
    k.cyl([0, 15, 0], 3, 2, { c: 0xd8d8de, m: 'metal' }, { rot: [Math.PI / 2, 0, 0] });
    k.box([0, 30, 0], [1, 2, 1], 0xf6f2ea);
  },
  robot(k) {
    const T = { c: 0xb8c0cc, t: 'tin' };
    k.mirror(() => { k.box([4, 6, 0], [6, 12, 7], T, { ch: 0.2 }); k.box([4, 1.4, 1.4], [7, 2.8, 10], { c: 0xd8302a, t: 'tin' }, { ch: 0.3 }); });
    k.box([0, 20, 0], [20, 16, 14], { ...T, d: [D.rect(-6, -4, 6, 5, 0x2a4aa8, { dir: 'f' }), D.circ(-3, 0, 1.4, 0xf6d84a), D.circ(3, 0, 1.4, 0xd8302a), D.stripes('x', 2.4, 0.6, 0x8a929e, { dir: 'x' })] }, { ch: 0.15 });
    k.mirror(() => k.at([12, 25, 0], [0.4, 0, 0.1], () => { k.box([0, -5, 0], [4, 12, 4], T, { ch: 0.2 }); k.box([0, -12, 0], [5, 3, 5], { c: 0x5a5a62, t: 'tin' }, { ch: 0.3 }); }));
    k.box([0, 35, 0], [16, 13, 13], { ...T, d: [D.circ(-4, 2, 2.6, 0xf6f2c8, { ink: 0x2a2a30, iw: 0.6 }), D.circ(4, 2, 2.6, 0xf6f2c8, { ink: 0x2a2a30, iw: 0.6 }), D.circ(-4, 2, 1, 0x2a2a30), D.circ(4, 2, 1, 0x2a2a30), D.rect(-5, -4, 5, -2, 0x2a2a30), D.stripes('x', 2, 0.6, 0xb8c0cc, { dir: 'f' })] }, { ch: 0.2 });
    k.cyl([0, 43, 0], 1, 4, { c: 0xd8302a, m: 'metal' }); k.soft([0, 46, 0], [1.8, 1.8, 1.8], { c: 0xd8302a, t: 'gloss' }, { ch: 0.586 });
  },
  kendama(k) { ken(k); stick(k, [0, 24, 2], [5, 6, 6], 0.4, { c: 0xf6f2ea }); tama(k, [6, 4, 6]); },
  dartgun(k) {
    const B = { c: 0xff8c2e, t: 'gloss', m: 'gloss' };
    k.box([0, 30, 0], [9, 10, 36], { ...B, d: [D.rect(-2, -2, 2, 2, 0x3f86e8, { dir: 'x' }), D.txt('FOAM', 0, 0, 3, 0x2a2a30, { dir: 'l' }), D.txt('FOAM', 0, 0, 3, 0x2a2a30, { dir: 'r' })] }, { ch: 0.3 });
    k.box([0, 15, -8], [7, 22, 9], { c: 0x2a2a2e, t: 'gloss' }, { ch: 0.3, rot: [-0.3, 0, 0] });
    k.box([0, 22, 4], [4, 7, 3], { c: 0x2a2a2e, t: 'gloss' }, { ch: 0.4 });
    k.cyl([0, 30, 20], 3.4, 4, { c: 0x3f86e8, t: 'gloss' }, { rot: [Math.PI / 2, 0, 0] });
    k.box([0, 36.5, 2], [5, 3, 14], { c: 0xf6d84a, t: 'gloss' }, { ch: 0.4 });
  },
  lcdgame(k) {
    k.box([0, 22, 0], [34, 44, 8], { c: 0xd8d4c8, t: 'gloss', m: 'gloss', d: [D.rect(-15, 3, 15, 20, 0x2a2a34, { dir: 'f', r: 1.5 }), D.rect(-12, 6, 12, 18, 0x9fae8e, { dir: 'f' }), D.txt('CAPSULE DASH', 0, 0.8, 2, 0x8a2a2a), D.circ(9, -10, 3, 0xd8302a, { ink: 0x5a1a1a, iw: 0.3 }), D.circ(3, -14, 2.4, 0xd8302a, { ink: 0x5a1a1a, iw: 0.3 }), D.rect(-13, -12, -5, -10, 0x2a2a30), D.rect(-10, -15, -8, -7, 0x2a2a30), D.txt('GAME', -9, -18, 2, 0x6a6a72)] }, { ch: 0.2 });
  },
};
// gimmick points (mm, figure frame) and moving parts for src/game/toys.js
const PARTS = {
  robot: { pts: { key: [0, 22, -9] }, ownParts: ['key'], figParts: { key(k) { k.box([0, 0, -2], [8, 2.6, 1.4], { c: 0xd8b040, m: 'metal' }, { ch: 0.4 }); k.box([0, 0, 0], [1.4, 1.4, 4], { c: 0x5a6068, m: 'metal' }); } } },
  kendama: { pts: { from: [0, 30, 0], big: [-14, 26, 0], small: [11, 25, 0], spike: [0, 33, 0], miss: [6, 4, 6] }, figParts: { ken, tama: (k) => tama(k, [0, 0, 0]) }, ownParts: ['tama'] },
  dartgun: { pts: { muzzle: [0, 30, 23] }, figParts: { dart }, ownParts: ['dart'] },
  lcdgame: { screen: { mm: [-12, 6, 12, 18, 4.2] } },
};

export default {
  id: 'omocha',
  order: 5,
  name: 'Dagashi-ya Omocha',
  jp: '駄菓子屋おもちゃ',
  tagline: 'Old-school toys you can really play with',
  taglineJp: 'あそべる！なつかしおもちゃ',
  price: 300,
  themes: ['retro', 'weird'],
  card: { bg: '#fff1d6', accent: '#e8453c', text: '#3a2410', accent2: '#3f86e8', pattern: 'checker' },
  capsule: { colors: [0xe8453c, 0x3f86e8, 0xf7d046, 0x58c06c], style: 'tab' },
  items: [
    {
      id: 'squishy', name: 'Melon-pan Squishy', jp: 'メロンパンスクイーズ', rarity: 'common', toy: 'squishy',
      desc: 'Hold to squeeze. Smells like a bakery. Squeaks like a duck.',
      fig: F.squishy, ...PARTS.squishy,
    },
    {
      id: 'superball', name: 'Super Ball', jp: 'スーパーボール', rarity: 'common', toy: 'ball',
      desc: 'Click to throw. It will find the one gap under the fridge.',
      fig: F.superball, ...PARTS.superball,
    },
    {
      id: 'koma', name: 'Spinning Top', jp: '手回しコマ', rarity: 'common', toy: 'top',
      desc: 'Click to spin it on the floor or the table. It wobbles like it means it.',
      fig: F.koma, ...PARTS.koma,
    },
    {
      id: 'yoyo', name: 'Champion Yo-yo', jp: 'チャンピオンヨーヨー', rarity: 'uncommon', toy: 'yoyo',
      desc: 'Click to throw it down. Hold to make it sleep. Walk the dog at your own risk.',
      fig: F.yoyo, ...PARTS.yoyo,
    },
    {
      id: 'robot', name: 'Wind-up Tin Robot', jp: 'ゼンマイブリキロボ', rarity: 'uncommon', toy: 'robot',
      desc: 'Click to wind it up and set it down. It walks until it forgets why.',
      fig: F.robot, ...PARTS.robot,
    },
    {
      id: 'kendama', name: 'Lacquer Kendama', jp: 'けん玉', rarity: 'rare', toy: 'kendama',
      desc: 'Click to flip the ball: big cup, small cup... spike? One in a hundred. Probably.',
      fig: F.kendama, ...PARTS.kendama,
    },
    {
      id: 'dartgun', name: 'Foam Dart Blaster', jp: 'スポンジダーツ銃', rarity: 'ultra', toy: 'dartgun',
      desc: 'Click to fire. The darts stick to walls, windows and very surprised neighbours.',
      fig: F.dartgun, ...PARTS.dartgun,
    },
    {
      id: 'lcdgame', name: 'Pocket LCD Game', jp: 'ポケット液晶ゲーム', rarity: 'secret', toy: 'lcd',
      desc: 'Click to play Capsule Dash. The high score is still 9999 from 1983. Nobody knows who.',
      fig: F.lcdgame, ...PARTS.lcdgame,
    },
  ],
};
