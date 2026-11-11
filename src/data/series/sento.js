// Sentō Life (せんとうぐらし): an evening at the neighbourhood bathhouse: the bandai, the Mt Fuji wall, wooden pails,
// coffee milk. Chunky painted block figures on tiled floors (src/figures). 全6種 + シークレット.
import { chibi, D } from '../../figures/chibi.js';
import { stick, cup, cute, sign } from '../../figures/props.js';

const TILE = (k, w = 44, d = 34) => k.box([0, 1.5, 0], [w, 3, d], { c: 0xd8e4ea, t: 'ceramic', d: [D.check(3, 0xc0d0d8, { dir: 't' })] }, { ch: 0.15 });
const PAIL = (k, pos, col = 0xf2d018) => { k.cyl([pos[0], pos[1] + 3, pos[2]], 4.4, 6, { c: col, t: 'gloss', m: 'gloss', d: [D.txt('ケロ', 0, 0, 2, 0xc8302a)] }, { top: 1.12, caps: 'bot' }); };
const TOWEL = (k, pos, col = 0xffffff) => k.box(pos, [9, 1.6, 6], { c: col, t: 'cloth', d: [D.stripes('x', 2.6, 0.7, 0x7ab8e8)] }, { ch: 0.45 });
const yukata = (c) => ({ top: { c, t: 'cloth', d: [D.stripes('x', 3, 1, 0xf4f0e8)] }, outfit: { kind: 'kimono', collar: 0x2a3a6a, obi: 0x2a3a6a }, sleeve: { c, t: 'cloth', d: [D.stripes('x', 3, 1, 0xf4f0e8)] }, legs: 'robe', bottom: { c, t: 'cloth', d: [D.stripes('x', 3, 1, 0xf4f0e8)] }, shoes: 0xd8b878 });
const F = {
  noren(k) {
    k.box([0, 1.5, 4], [50, 3, 36], { c: 0x8a8a90, t: 'stone' }, { ch: 0.1 });
    k.box([0, 26, -10], [50, 46, 8], { c: 0x6a4428, t: 'wood', ga: 'x' }, { ch: 0.08 });
    for (const [x, c, w] of [[-12, 0x2a4aa8, '男'], [12, 0xc8302a, '女']]) { k.cyl([x, 42, -4], 0.6, 22, { c: 0x4a3020 }, { rot: [0, 0, Math.PI / 2] }); k.box([x, 34, -4], [20, 16, 0.8], { c, t: 'cloth', d: [D.txt(w, 0, 2, 7, 0xffffff), D.line(0, -8, 0, 8, 0.6, 0x1a1a24)] }, { ch: 0.05 }); }
    sign(k, [0, 51, -6], 24, 6, 0x1a1a24, 'ゆ', 0xf6eada);
    k.at([0, 3, 8], [0, 0, 0], () => chibi(k, { H: 44, hair: 'short', face: { eye: 'happy', mouth: 'open' }, top: { c: 0xf4f0e8, t: 'knit' }, sleeve: { c: 0xf4f0e8 }, legs: 'shorts', bottom: { c: 0x3a5a8a }, armR: [70, -10, 60], holdR(k) { k.box([0, -2, 4], [10, 7, 6], { c: 0xf2d018, t: 'gloss' }, { ch: 0.3 }); } }));
  },
  bandai(k) {
    k.box([0, 1.5, 0], [44, 3, 34], { c: 0xb88a5a, t: 'wood', ga: 'x' }, { ch: 0.15 });
    k.box([0, 14, 2], [30, 22, 18], { c: 0x7a5232, t: 'wood', ga: 'x', d: [D.rect(-13, -6, 13, 6, 0x5a3a24, { dir: 'f' }), D.txt('入浴料 ¥400', 0, 0, 2.6, 0xf6eada)] }, { ch: 0.1 });
    k.at([0, 25, -2], [0, 0, 0], () => chibi(k, { H: 42, hair: 'bun', hairC: 0xa8a8b0, face: { eye: 'closed', mouth: 'smile', nose: 'dot' }, top: { c: 0x8a5a8a, t: 'knit' }, outfit: { kind: 'apron', apron: 0xf4f0e8 }, sleeve: { c: 0x8a5a8a, t: 'knit' }, sit: true, legL: [85, 10], legR: [85, -10], armL: [40, 10, 70], armR: [40, -10, 70] }));
    k.box([10, 25.6, 8], [6, 1.6, 4], { c: 0xc8c8d0, m: 'metal', d: [D.txt('¥', 0, 0, 1.6, 0x2a1c1c, { dir: 't' })] }, { ch: 0.3 });
  },
  fuji(k) {
    TILE(k, 54, 34);
    k.box([0, 26, -14], [52, 46, 2], { c: 0x7ab8e8, t: 'paper', d: [D.poly([[-22, -10], [0, 14], [22, -10]], 0x3a5aa8), D.poly([[-7, 6], [0, 14], [7, 6], [3, 8], [0, 6], [-3, 8]], 0xf6f6f2), D.rect(-26, -23, 26, -10, 0x2a6aa8), D.stripes('y', 3, 0.6, 0x5a8ac8, { dir: 'f' })] }, { ch: 0.05 });
    k.box([0, 8, 2], [48, 10, 22], { c: 0x9ad0e0, m: 'glass', t: 'water' }, { ch: 0.1 });
    k.box([0, 6, 2], [50, 9, 24], { c: 0xd8e4ea, t: 'ceramic', d: [D.check(3, 0xc0d0d8)] }, { ch: 0.1, caps: 'bot' });
    k.at([6, 9, 4], [0, 0, 0], () => { k.box([0, 6, 0], [14, 13, 12], { c: 0xe8c0a0, d: [D.face({ eye: 'closed', mouth: 'smile', gap: 3.6, er: 1.2, y: 1, my: -3, blush: true }), D.rect(-5, -4, 5, -3, 0xd8d8de)] }, { ch: 0.4 }); TOWEL(k, [0, 13.4, 0]); });
  },
  sauna(k) {
    k.box([0, 1.5, 0], [44, 3, 34], { c: 0xc8a06a, t: 'wood', ga: 'x' }, { ch: 0.15 });
    k.box([0, 6, -8], [40, 6, 14], { c: 0xc8a06a, t: 'wood', ga: 'x' }, { ch: 0.15 });
    k.box([0, 28, -15], [44, 50, 2], { c: 0xb8905a, t: 'wood', d: [D.stripes('y', 4, 0.4, 0x8a6a3a)] }, { ch: 0.05 });
    k.at([0, 9, -6], [0, 0, 0], () => chibi(k, { H: 46, sit: true, skin: 0xe8a088, hair: 'buzz', face: { eye: 'line', mouth: 'wavy', brow: 'sad' }, faceD: [D.circ(7, 2, 0.8, 0x9fd8ff), D.circ(-8, 4, 0.7, 0x9fd8ff), D.circ(5, -6, 0.6, 0x9fd8ff)], top: { c: 0xe8a088 }, sleeve: { c: 0xe8a088 }, legs: 'shorts', bottom: { c: 0xffffff, t: 'cloth' }, legL: [85, 10], legR: [85, -10], armL: [20, 20, 40], armR: [20, -20, 40],
      onHead(k, H) { TOWEL(k, [0, H.hy + H.hh + 0.8, 0], 0xf4f0e8); } }));
    k.box([16, 30, -13], [8, 10, 2], { c: 0xf4f0e8, d: [D.ring(0, 0, 3.4, 0.6, 0x2a2a30), D.line(0, 0, 2, 2, 0.5, 0xc8302a), D.txt('100℃', 0, -4, 1.4, 0xc8302a)] }, { ch: 0.2 });
  },
  milk(k) {
    TILE(k);
    k.box([14, 18, -10], [14, 32, 12], { c: 0xf4f0e8, t: 'gloss', d: [D.rect(-6, -6, 6, 12, 0xbde4f0, { dir: 'f' }), D.txt('牛乳', 0, -10, 2.6, 0x2a4aa8)] }, { ch: 0.15 });
    k.at([-6, 3, 2], [0, 0.3, 0], () => chibi(k, { H: 56, hair: 'short', hairC: 0x2a2220, ...yukata(0x4a6ab8), face: { eye: 'closed', mouth: 'o' }, head: [-28, 0, 0], armL: [20, 40, 120], armR: [160, -10, 30],
      holdR(k) { k.cyl([0, -1, 3], 2.2, 8, { c: 0xc8945a, m: 'glass', t: 'glass', d: [D.band('y', 1, 2.4, 0xffffff), D.txt('コーヒー', 0, -1.6, 1, 0x6a3a14)] }, { rot: [Math.PI, 0, 0] }); } }));
  },
  kaeri(k) {
    // the walk home: a mother and kid in yukata, wooden pail with soap and shampoo, a little bag
    k.box([0, 1.5, 0], [48, 3, 32], { c: 0x6a6a72, t: 'stone' }, { ch: 0.15 });
    k.at([-8, 3, 0], [0, 0.2, 0], () => chibi(k, { H: 60, hair: 'bun', hairC: 0x2a1c1c, ...yukata(0xc85a7a), face: { eye: 'anime', iris: 0x3a2a2a, mouth: 'smile', lash: true }, armR: [40, -20, 40], armL: [60, 10, 60], holdL(k) { PAIL(k, [0, -8, 2], 0xe6c88e); } }));
    k.at([12, 3, 4], [0, -0.3, 0], () => chibi(k, { H: 38, hair: 'short', ...yukata(0x3a8ac8), face: { eye: 'happy', mouth: 'open' }, armL: [70, 30, 30], armR: [10, -20, 0] }));
  },
  kamisama(k) {
    // the secret: the bathhouse god, a tiny old man in the steam above the big bath, holding a golden pail
    TILE(k, 50, 36);
    k.box([0, 6, 0], [44, 8, 28], { c: 0x9ad0e0, m: 'glass', t: 'water' }, { ch: 0.1 });
    for (const [x, z, s] of [[-12, -4, 7], [10, 6, 9], [0, -8, 6]]) k.soft([x, 18 + s, z], [s, s * 0.6, s], { c: 0xf6f8fa, m: 'glass', t: 'foam' }, { ch: 0.586, bev: 0.5 });
    k.at([0, 26, 0], [0, 0, 0], () => chibi(k, { H: 34, skin: 0xf2e0c8, hair: 'bald', face: { eye: 'happy', mouth: 'smile', brow: 'thick', browC: 0xf4f4f4 }, faceD: [D.rect(-4, -7, 4, -2, 0xf4f4f4, { r: 1 })], top: { c: 0xf6f2e6, t: 'cloth' }, sleeve: { c: 0xf6f2e6 }, legs: 'robe', bottom: { c: 0xf6f2e6, t: 'cloth' },
      armR: [120, -20, 30], holdR(k) { k.cyl([0, 2, 0], 3, 4, { c: 0xe8c040, m: 'metal', t: 'metal' }, { top: 1.1 }); } }));
  },
};

export default {
  id: 'sento', order: 25, name: 'Sentō Life', jp: 'せんとうぐらし', tagline: 'An evening at the neighbourhood bathhouse', taglineJp: 'いい湯だね、また明日。', price: 300,
  themes: ['retro', 'japan', 'home'], card: { bg: '#e6f0f4', accent: '#2a4aa8', text: '#1e2a3a', pattern: 'check', accent2: '#c8302a' }, capsule: { colors: [0x2a4aa8, 0xc8302a, 0xf2d018, 0xd8e4ea] },
  items: [
    { id: 'noren', name: 'Under the Noren', jp: 'のれん', rarity: 'common', desc: 'Blue for the men, red for the women, the kid runs under whichever.', fig: F.noren },
    { id: 'bandai', name: 'The Bandai', jp: '番台', rarity: 'common', desc: 'Has seen everything. Says nothing. Takes your ¥400.', fig: F.bandai },
    { id: 'fuji', name: 'Fuji Wall', jp: '富士の湯', rarity: 'common', desc: 'Painted in 1962. Touched up every spring. The water is 44 degrees.', fig: F.fuji },
    { id: 'sauna', name: 'Sauna Endurance', jp: 'サウナ我慢', rarity: 'uncommon', desc: 'One more minute. One more. The thermometer gave up first.', fig: F.sauna },
    { id: 'milk', name: 'Coffee Milk', jp: 'コーヒー牛乳', rarity: 'rare', desc: 'Hand on hip, head back, bottle gone. The only correct way.', fig: F.milk },
    { id: 'kaeri', name: 'The Walk Home', jp: 'ゆあがり', rarity: 'ultra', desc: 'Warm all the way to the front door. The pail rattles every step.', fig: F.kaeri },
    { id: 'kamisama', name: 'Bath God', jp: 'お湯の神さま', rarity: 'secret', desc: 'SECRET. Lives in the steam. Turns the water up a degree if you are rude.', fig: F.kamisama },
  ],
};
