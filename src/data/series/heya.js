// Series 6 — My Tiny Room (ミニチュアのお部屋)
// Miniature Japanese room furniture, dollhouse-style, with tiny lived-in details.
// My Tiny Room: miniature Shōwa rooms and furniture as blocky figures with tatami, wood grain and paper (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, cup, plate, cute, WHITE } from '../../figures/props.js';

const TATAMI = { c: 0xc8b070, t: 'tatami', d: [D.band('z', -23, -21.6, 0x2a3a2a), D.band('z', 21.6, 23, 0x2a3a2a)] };
const floor = (k, w = 60, d = 46) => k.box([0, 2, 0], [w, 4, d], TATAMI, { ch: 0.1 });
const WOOD = { c: 0x8a5a32, t: 'wood', ga: 'x' };
const F = {
  chabudai(k) {
    floor(k);
    k.cyl([0, 14, 0], 22, 3, { c: 0x8a5a32, t: 'wood', top: 0x9a6a3a, d: [D.ring(0, 0, 18, 0.5, 0x6a4024, { dir: 't' })] });
    for (let i = 0; i < 4; i++) k.box([Math.cos(i * 1.57 + 0.78) * 14, 8, Math.sin(i * 1.57 + 0.78) * 14], [2.4, 9, 2.4], WOOD, { ch: 0.3 });
    for (const x of [-8, 8]) { k.cyl([x, 18.6, 4], 2.6, 5, { c: 0x6a7a5a, t: 'clay' }, { top: 1.1 }); k.cyl([x, 20.6, 4], 2.6, 0.6, { c: 0x9ab85a }); }
    k.cyl([0, 17, -6], 5, 3, { c: 0xd8b878, t: 'tatami' }); k.cyl([0, 19, -6], 3.6, 1, { c: 0xc8903a, t: 'crust', d: [D.dots(1.4, 0.3, 0x1a1a1a, { dir: 't' })] });
    k.soft([12, 19.4, -5], [4, 3.6, 4], { c: 0x6a7a5a, t: 'clay' }, { ch: 0.586 }); stick(k, [14, 22, -5], [17, 23, -5], 0.8, { c: 0x6a7a5a });
  },
  zabuton(k) {
    floor(k);
    k.box([0, 6, 0], [36, 4, 36], { c: 0x7a2a5a, t: 'cloth', d: [D.stitch(-16, 0, 16, 0, 0xf2c23a, { dir: 't' }), D.circ(0, 0, 1.4, 0xf2c23a, { dir: 't' })] }, { ch: 0.45, bev: 0.4 });
    k.at([0, 8, 0], [0, 0.3, 0], () => chibi(k, { H: 40, hair: 'short', face: { eye: 'closed', mouth: 'o' }, top: { c: 0x6a8ab8, t: 'knit' }, sleeve: { c: 0x6a8ab8, t: 'knit' }, sit: true, legL: [85, 20], legR: [85, -20], armL: [10, 30, 0], armR: [10, -30, 0], head: [20, 0, 20],
      faceD: [D.circ(3, -4, 2.4, 0xd8f0ff, { ink: 0x8ab8d8, iw: 0.3 })] }));
  },
  tansu(k) {
    k.box([0, 30, 0], [44, 60, 22], { ...WOOD, c: 0x7a4a28, d: [D.fn('f', (c, o) => { const rows = [[18, 28], [4, 16], [-10, 2], [-26, -12]]; for (const [a, b] of rows) if (c.y > a && c.y < b && Math.abs(c.x) < 20) { if (c.y - a < 0.6 || b - c.y < 0.6 || 20 - Math.abs(c.x) < 0.6) { o[0] *= 0.6; o[1] *= 0.6; o[2] *= 0.6; } } })] }, { ch: 0.08 });
    for (const y of [23, 10, -4, -19]) for (const x of [-9, 9]) k.box([x, 30 + y, 11.4], [6, 2, 1.4], { c: 0x2a2a30, m: 'metal' }, { ch: 0.3 });
    k.at([9, 26, 14], [0, 0, 0], () => { k.box([0, 0, 0], [18, 10, 6], { ...WOOD, c: 0x7a4a28 }, { ch: 0.1 }); k.box([3, 4, 0], [3, 3, 3], { c: 0xe86a8a, t: 'knit' }, { ch: 0.5 }); for (let i = 0; i < 3; i++) k.box([-4 + i * 2, 5, -1], [1.6, 1, 1.6], { c: [0xd8302a, 0xf2c23a, 0x3a8ae8][i] }, { ch: 0.5 }); });
    k.soft([-12, 64, 2], [5, 4, 5], { c: 0xd8302a, t: 'lacquer', d: [cute({ eye: 'dot', gap: 1.8, er: 0.6, eh: 0.8, my: -1.6, mw: 1.2 })] }, { flat: true, ch: 0.586 });
  },
  futon(k) {
    floor(k);
    k.box([0, 6, 0], [34, 4, 48], { c: 0xf6f2ea, t: 'cloth' }, { ch: 0.3 });
    k.box([0, 10, 4], [36, 6, 36], { c: 0xe86a8a, t: 'cloth', d: [D.dots(5, 1.2, 0xfbe0e8, { dir: '*' })] }, { ch: 0.45 });
    k.box([0, 10, -18], [16, 5, 8], { c: 0xf6f2ea, t: 'cloth', d: [D.stripes('x', 2, 0.6, 0x9ab8d8)] }, { ch: 0.45 });
    k.box([0, 12, -14], [14, 10, 10], { c: 0xf6cfae, d: [D.face({ eye: 'closed', mouth: 'o', gap: 3.4, er: 1.2, y: 0, my: -3, blush: true })] }, { ch: 0.4 });
    k.box([0, 17, -16], [16, 4, 10], { c: 0x2a2220, t: 'hair' }, { ch: 0.4 });
    k.at([18, 4, -14], [0, -0.4, 0], () => { k.cyl([0, 8, 0], 6, 4, { c: 0xd8302a, t: 'gloss', front: 0xf6f2ea, d: [D.line(0, 0, 0, 4, 0.6, 0x2a1c1c, { dir: 'f' }), D.line(0, 0, 3, 0, 0.6, 0x2a1c1c, { dir: 'f' })] }, { rot: [Math.PI / 2, 0, 0], pf: true }); k.mirror(() => k.soft([3, 15, 0], [2.4, 2, 2], { c: 0xd8dae0, m: 'metal' }, { ch: 0.586 })); k.mirror(() => k.box([3, 2, 0], [1, 4, 1], 0x2a2a30)); });
  },
  hondana(k) {
    k.box([0, 30, -2], [44, 60, 18], { ...WOOD, c: 0xa86a3a }, { ch: 0.08, caps: 'both' });
    const cols = [0xd8302a, 0x2a6ac8, 0xf2c23a, 0x3a9a4a, 0xf6f2ea, 0x8a5ab8, 0xe8803a];
    for (const y of [8, 26, 44]) { k.box([0, y - 6.4, 7.6], [40, 1.6, 2], { ...WOOD, c: 0x8a5a2a }, { ch: 0.2 }); for (let i = 0; i < 9; i++) { if (y === 26 && i === 6) continue; k.box([-17 + i * 4.2, y + 1, 4], [3.6, 13 + (i % 3), 10], { c: cols[(i + y) % cols.length], t: 'paper', d: [D.band('y', 3, 4.4, 0xffffff), D.txt(String(i + 1 + (y > 8 ? (y > 26 ? 18 : 9) : 0)), 0, -3, 1.6, 0x2a1c1c, { dir: 'f' })] }, { ch: 0.15 }); } }
  },
  tsukue(k) {
    k.box([0, 30, 0], [50, 3, 28], { ...WOOD, c: 0x9a6a3a }, { ch: 0.15 });
    k.mirror(() => k.box([22, 15, 0], [3, 30, 24], { ...WOOD, c: 0x8a5a2a }, { ch: 0.15 }));
    k.box([-12, 32, 2], [16, 1, 12], { c: 0xfbf8f0, t: 'paper', d: [D.stripes('z', 1.6, 0.3, 0x9ab8d8, { dir: 't' }), D.circ(-3, 2, 2, 0x2a2a30, { dir: 't' }), D.poly([[-5, 0], [-4, 2], [-3, 0]], 0x2a2a30, { dir: 't' }), D.circ(3, -2, 1.6, 0x2a2a30, { dir: 't' })] }, { ch: 0 });
    k.box([-2, 32.2, 4], [8, 0.8, 1], { c: 0xf2c23a }, { ch: 0.3, rot: [0, 0.4, 0] });
    k.at([14, 31.5, -4], [0, -0.3, 0], () => { k.cyl([0, 1, 0], 4, 2, { c: 0x3a8a6a, t: 'metal' }); k.box([0, 9, -2], [1.4, 16, 1.4], { c: 0x3a8a6a, t: 'metal' }, { rot: [0.2, 0, 0] }); k.cyl([0, 17, 2], 4, 5, { c: 0x3a8a6a, t: 'metal' }, { rot: [0.6, 0, 0], top: 1.6 }); k.cyl([0, 15.6, 3.6], 2, 2, { c: 0xfff2b0, m: 'glow' }, { rot: [0.6, 0, 0] }); });
    k.cyl([-20, 34, -6], 2.4, 5, { c: 0xf6f2ea, t: 'ceramic', d: [D.circ(0, 0, 1, 0x3a8ae8, { dir: 'f' })] });
  },
  ofuro(k) {
    k.box([0, 2, 0], [60, 4, 46], { c: 0xd8e4ea, t: 'ceramic', d: [D.check(4, 0xc8d4dc, { dir: 't' })] }, { ch: 0.1 });
    k.box([0, 16, -2], [44, 24, 34], { c: 0xe6c88e, t: 'wood', d: [D.stripes('x', 4, 0.4, 0xb8985e, { dir: '*' })] }, { ch: 0.12, caps: 'bot' });
    k.box([0, 25, -2], [41, 1, 31], { c: 0x9ad0e0, m: 'glass', t: 'water' }, { ch: 0.1 });
    k.at([-6, 22, -6], [0, 0.2, 0], () => { k.box([0, 6, 0], [14, 13, 12], { c: 0xf6cfae, d: [D.face({ eye: 'closed', mouth: 'smile', gap: 3.6, er: 1.2, y: 1, my: -3, blush: true })] }, { ch: 0.4 }); k.box([0, 13.4, 0], [10, 2, 6], { c: 0xffffff, t: 'cloth', d: [D.stripes('x', 2.4, 0.7, 0x7ab8e8)] }, { ch: 0.45 }); });
    k.at([12, 27, 6], [0, -0.4, 0], () => { k.soft([0, 2, 0], [4.4, 3, 3.4], { c: 0xf6d018, t: 'gloss', m: 'gloss' }, { ch: 0.586 }); k.soft([0, 6, 2], [2.6, 2.4, 2.4], { c: 0xf6d018, t: 'gloss', d: [D.circ(-1, 0.6, 0.5, 0x1a1a1a, { dir: 'f' }), D.circ(1, 0.6, 0.5, 0x1a1a1a, { dir: 'f' })] }, { ch: 0.586 }); k.box([0, 5.4, 4.4], [2, 1, 2], 0xf28a1a, { ch: 0.4 }); });
    k.cyl([22, 8, 14], 4, 8, { c: 0xf6d018, t: 'gloss', d: [D.txt('ケロ', 0, 0, 2, 0xd8302a)] }, { top: 1.1 });
  },
  nekosawagi(k) {
    floor(k);
    k.box([0, 26, -20], [56, 48, 3], { c: 0xfbf8f0, t: 'paper', d: [D.stripes('x', 9, 0.8, 0x8a5a32, { dir: 'f' }), D.stripes('y', 9, 0.8, 0x8a5a32, { dir: 'f' }), D.poly([[-8, 2], [2, 8], [6, -2], [-2, -6]], 0x5a4a3a, { dir: 'f' })] }, { ch: 0.05 });
    k.at([14, 4, 4], [0, 0, Math.PI / 2], () => { k.cyl([0, 0, 0], 4, 14, { c: 0x3a6ac8, t: 'ceramic', d: [D.stripes('y', 3, 1, 0xf6f2ea)] }, { top: 0.6 }); });
    k.box([18, 4.6, 14], [10, 0.6, 6], { c: 0x7ab8e8, m: 'glass' }, { ch: 0.5 });
    for (let i = 0; i < 4; i++) k.box([-14 + i * 5, 4.4, 10 - i * 2], [5, 0.6, 7], { c: 0xfbf8f0, t: 'paper' }, { ch: 0.1, rot: [0, i * 0.4, 0] });
    k.cyl([-20, 7, 8], 3, 7, { c: 0xfbf8f0, t: 'paper' }, { rot: [0, 0, Math.PI / 2] });
    k.at([0, 4, -6], [0, 0.3, 0], () => beast(k, 'loaf', { c: 0xe8a04a, size: 0.62, ears: 'tri', tail: 'long', face: { eye: 'closed', mouth: 'cat' }, bodyD: [D.stripes('y', 3, 1, 0xc8702a, { dir: 'x' })] }));
  },
};

export default {
  id: 'heya',
  order: 6,
  name: 'My Tiny Room',
  jp: 'ミニチュアのお部屋',
  tagline: 'Pocket-sized furniture for a pocket-sized life',
  taglineJp: 'ちいさなおうち、はじめました',
  price: 300,
  themes: ['home', 'retro', 'cute'],
  card: { bg: '#f4ead2', accent: '#8a5a36', text: '#3b2a1a', accent2: '#4f8a5b', pattern: 'grid' },
  capsule: { colors: [0xd6c88a, 0xb87443, 0xfbf6ea, 0x8fc7a0, 0xe98a6a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'chabudai', name: 'Chabudai Teatime', jp: 'ちゃぶ台でお茶', rarity: 'common',
      desc: 'Tea for two, one senbei. Flipping the table is strictly for TV dramas.',
      fig: F.chabudai,
    },
    {
      id: 'zabuton', name: 'Zabuton Nap', jp: 'ざぶとんでおひるね', rarity: 'common',
      desc: 'Fell asleep mid-thought on the guest cushion. Snot bubble at full size.',
      fig: F.zabuton,
    },
    {
      id: 'tansu', name: 'Tansu Chest', jp: 'たんす', rarity: 'common',
      desc: 'Third drawer holds every rubber band you have ever owned. And one sock.',
      fig: F.tansu,
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'futon', name: 'Futon & Alarm Clock', jp: 'おふとんセット', rarity: 'uncommon',
      desc: 'The clock says 7:00. The futon says five more minutes.',
      fig: F.futon,
    },
    {
      id: 'hondana', name: 'Manga Bookshelf', jp: 'まんがの本棚', rarity: 'uncommon',
      desc: 'Owns every volume except number seven. Nobody knows where seven went.',
      fig: F.hondana,
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'tsukue', name: 'Late-Night Study Desk', jp: 'べんきょうづくえ', rarity: 'rare',
      desc: 'Homework: open. Notebook: mostly cat doodles. Lamp: doing its very best.',
      fig: F.tsukue,
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'ofuro', name: 'Hinoki Ofuro', jp: 'ひのきのおふろ', rarity: 'ultra',
      desc: 'Shoulder-deep at 42 degrees. The duck has claimed the best corner.',
      fig: F.ofuro,
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'nekosawagi', name: 'The Cat Did It', jp: 'ねこのしわざ', rarity: 'secret',
      desc: 'Shoji torn, vase tipped, paper unrolled. The cat was asleep all day, apparently.',
      fig: F.nekosawagi,
    },
  ],
};
