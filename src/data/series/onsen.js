// Series 8 — Onsen Friends (おんせんどうぶつ)
// Animals melting happily into hot springs. Water is glass(), wood is hinoki.
// Onsen Friends: animals in hot springs; blocky critters with painted fur, steam-wet towels and bath props.
import { chibi, beast, D } from '../../figures/chibi.js';
import { plate, bowl, cup, stick, sign, cute, WOOD, LIGHTWOOD, WHITE } from '../../figures/props.js';

const WATER = { c: 0x7ac8d8, m: 'glass', t: 'water' };
const HINOKI = { c: 0xe6c88e, t: 'wood' };
const towel = (k, pos, col = 0xffffff, stripe = 0x7ab8e8) => k.box(pos, [9, 1.6, 6], { c: col, t: 'cloth', d: [D.stripes('x', 2.6, 0.7, stripe)] }, { ch: 0.45, rot: [0.05, 0.2, 0.05] });
const tub = (k, w, d, h, round = false, rim = HINOKI) => {
  if (round) { k.cyl([0, h / 2, 0], w / 2, h, { ...rim, d: [D.band('y', h * 0.2 - h / 2, h * 0.3 - h / 2, 0x2a2a30), D.band('y', h / 2 - h * 0.3, h / 2 - h * 0.2, 0x2a2a30), D.stripes('r', 1, 0.08, 0xb8985e, { n: 16 })] }, { caps: 'bot', rz: d / 2 }); k.cyl([0, h - 2, 0], w / 2 - 0.6, 1, WATER, { rz: d / 2 - 0.6 }); }
  else { k.box([0, h / 2, 0], [w, h, d], { ...rim, d: [D.stripes('x', 4, 0.4, 0xb8985e)] }, { ch: 0.12, caps: 'bot' }); k.box([0, h - 2, 0], [w - 1.2, 1, d - 1.2], WATER, { ch: 0.12 }); }
};
const capy = (k, s = {}) => beast(k, 'loaf', { c: 0xa8784a, c2: 0x8a5e38, size: 1, wk: 1.15, hk: 0.9, ears: 'small', belly: false, face: { eye: 'line', mouth: 'none', gap: 7, y: 3 }, bodyD: [D.rect(-6, -4, 6, 2, 0x8a5e38, { r: 2 }), D.ell(-2, -0.6, 0.8, 1, 0x2a1c1c), D.ell(2, -0.6, 0.8, 1, 0x2a1c1c)], ...s });

const F = {
  yuzucapy(k) {
    tub(k, 50, 40, 14, true);
    k.at([0, 6, 0], [0, 0, 0], () => capy(k));
    for (const [x, z] of [[-16, 8], [14, 10], [16, -8], [-12, -10], [4, 13]]) k.soft([x, 13, z], [3.4, 3, 3.4], { c: 0xf6c818, t: 'crust', c2: 0xd8a010 }, { ch: 0.586 });
    k.soft([0, 33.4, 0], [3.4, 3, 3.4], { c: 0xf6c818, t: 'crust', c2: 0xd8a010 }, { ch: 0.586 });
  },
  saru(k) {
    k.box([0, 5, -6], [56, 10, 30], { c: 0x6a6a70, t: 'stone', top: 0xf6f8fa }, { ch: 0.4 });
    k.box([0, 6, 8], [44, 4, 22], WATER, { ch: 0.3 });
    k.at([0, 2, 6], [0, 0, 0], () => chibi(k, { H: 50, animal: { c: 0xb8a088, ears: 'none', mask: false, d: [D.ell(0, -2, 10, 9, 0xe89a90)] }, face: { eye: 'closed', mouth: 'smile', blush: true, y: -1 },
      top: { c: 0xb8a088, t: 'fur' }, sleeve: { c: 0xb8a088, t: 'fur' }, bottom: { c: 0xb8a088, t: 'fur' }, gloves: { c: 0xe89a90 }, shoes: 0xb8a088, sole: 0xb8a088, legL: [70, 10], legR: [70, -10], armL: [20, 30, 40], armR: [20, -30, 40],
      onHead(k, H) { towel(k, [0, H.hy + H.hh + 0.8, 0], 0xffffff, 0xe89090); k.mirror(() => k.box([H.hw + 0.4, H.hy - 1, 0], [1.6, 4, 3], { c: 0xe89a90 }, { ch: 0.4 })); } }));
    for (const [x, z] of [[-22, -12], [20, -14], [-6, -16]]) k.soft([x, 10.5, z], [4, 1.6, 3], { c: 0xffffff, t: 'foam' }, { ch: 0.586 });
  },
  penguin(k) {
    k.at([0, 0, 0], [0, 0, 0], () => beast(k, 'loaf', { c: 0x2c3442, c2: 0xfbfbfb, size: 1.1, hk: 1.25, ears: 'none', pawC: 0xf2a33a, face: { eye: 'dot', mouth: 'none', y: 7, gap: 5 },
      bodyD: [D.ell(0, -2, 11, 13, 0xfbfbfb), D.poly([[-2.2, 4.4], [2.2, 4.4], [0, 1.6]], 0xf2a33a, { ink: 0xb06a10, iw: 0.3 })] }));
    k.at([0, 31, 0], [0, 0, 0.1], () => { k.cyl([0, 3, 0], 9, 6, { c: 0xf6d018, t: 'gloss', d: [D.txt('ケロリ', 0, 0, 3, 0xd8282a)] }, { top: 1.1 }); });
    k.box([20, 3, 6], [8, 6, 5], { c: 0xf6f2e8, t: 'plush', d: [D.txt('石鹸', 0, 0, 2.6, 0x4a8ac8)] }, { ch: 0.5 });
    k.box([-20, 7, 4], [6, 14, 6], { c: 0xf2a0c0, t: 'gloss', d: [D.txt('シャン', 0, 1, 1.8, 0xffffff, { vert: true })] }, { ch: 0.4, top: [0.9, 0.9] });
    k.box([-20, 15.5, 4], [2.6, 3, 2.6], { c: 0x2a2a30 }, { ch: 0.3 });
  },
  tanukimilk(k) {
    chibi(k, { H: 62, animal: { c: 0x8a6a4c, ears: 'round', inner: 0x4a3828, mask: false, d: [D.ell(-6, -1, 4.6, 3.4, 0x3a2a1e), D.ell(6, -1, 4.6, 3.4, 0x3a2a1e), D.ell(0, -8, 6, 4, 0xe6d2b4)] },
      face: { eye: 'closed', mouth: 'o', y: -1, my: -9 }, head: [-28, 0, 0], top: { c: 0xf4f0e8, t: 'cloth', d: [D.stripes('x', 3, 1.2, 0x4a6ab8)] }, outfit: { kind: 'kimono', collar: 0x2a3a6a, obi: 0x2a3a6a, obiC: 0x2a3a6a },
      sleeve: { c: 0xf4f0e8, t: 'cloth', d: [D.stripes('x', 3, 1.2, 0x4a6ab8)] }, legs: 'robe', bottom: { c: 0xf4f0e8, t: 'cloth', d: [D.stripes('x', 3, 1.2, 0x4a6ab8)] }, shoes: 0x8a6a4c,
      armL: [20, 40, 120], armR: [160, -10, 30],
      holdR(k) { k.cyl([0, -1, 3], 2.4, 9, { c: 0xc8945a, m: 'glass', t: 'glass', d: [D.band('y', 1, 3, 0xffffff), D.txt('牛乳', 0, -1.4, 1.6, 0x8a4a1a)] }, { rot: [Math.PI, 0, 0] }); k.cyl([0, -6, 3], 2.6, 0.8, { c: 0xfbf6ea }, {}); } });
  },
  kaeru(k) {
    tub(k, 54, 34, 16, false);
    k.at([0, 6, -2], [0, 0, 0], () => beast(k, 'loaf', { c: 0x6ab84a, c2: 0xf2f0c8, size: 1.1, wk: 1.1, hk: 0.85, ears: 'none', face: { eye: 'happy', mouth: 'smile', mw: 7, y: 6, gap: 8 }, belly: false,
      onBody(k, b) { k.mirror(() => k.soft([b.rx * 0.5, b.ry * 2 - 1, 2], [4.6, 3.4, 4.6], { c: 0x6ab84a, t: 'gloss', d: [D.circ(0, 0, 2.6, 0xfbfbf2), D.circ(0, -0.2, 1.4, 0x1a1a1a), D.circ(-0.5, 0.5, 0.5, 0xffffff)] }, { ch: 0.586 })); } }));
    k.mirror(() => k.box([18, 16.5, 10], [10, 3, 5], { c: 0x6ab84a, t: 'gloss' }, { ch: 0.5 }));
    k.at([-14, 15, 8], [0, 0.3, 0], () => { k.box([0, 0, 0], [14, 1.4, 10], HINOKI, { ch: 0.3 }); k.cyl([-3, 3, 0], 1.8, 4.6, { c: 0xfbfbf4, t: 'ceramic', d: [D.band('y', 0.6, 1.4, 0x2a3a6a)] }, { top: 0.6 }); k.cyl([3, 2, 0], 1.6, 2.6, { c: 0xfbfbf4, t: 'ceramic' }, { top: 1.2 }); });
  },
  kawauso(k) {
    k.box([0, 3, 0], [64, 6, 34], WATER, { ch: 0.3 });
    const otter = (x, z, s, ry, rock) => k.at([x, 2, z], [-0.25, ry, 0], () => {
      beast(k, 'loaf', { c: 0x7a5236, c2: 0xe6caa0, size: s, hk: 1.15, ears: 'small', face: { eye: 'dot', mouth: 'cat', y: 7 * s, gap: 4.5 * s }, whiskers: true, belly: true,
        bodyD: [D.ell(0, 6 * s, 9 * s, 5 * s, 0xe6caa0)] });
      if (rock) k.soft([0, 12 * s, 13 * s], [4, 3, 3], { c: 0x7a7a82, t: 'stone' }, { ch: 0.5 });
    });
    otter(-18, 2, 0.85, 0.3, false); otter(0, -2, 1.1, 0, true); otter(18, 2, 0.6, -0.3, false);
    k.box([-9, 12, 8], [8, 2.4, 2.4], { c: 0x6a4428, t: 'fur' }, { ch: 0.5, rot: [0, 0, 0.2] });
    k.box([9, 11, 8], [8, 2.4, 2.4], { c: 0x6a4428, t: 'fur' }, { ch: 0.5, rot: [0, 0, -0.2] });
  },
  rotenburo(k) {
    k.box([0, 3, 0], [72, 6, 46], { c: 0x6a6a70, t: 'stone', top: 0x8a8a8e }, { ch: 0.3 });
    k.box([4, 6.5, 6], [52, 1, 30], WATER, { ch: 0.4 });
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; k.soft([4 + Math.cos(a) * 28, 7, 6 + Math.sin(a) * 17], [6, 4, 5], { c: [0x6a6a70, 0x7a7a80, 0x5a5a62][i % 3], t: 'stone' }, { ch: 0.5, rot: [0, a, 0] }); }
    for (let i = 0; i < 9; i++) k.box([-32 + i * 8, 22, -20], [3, 36, 3], { c: 0xb8a060, t: 'wood', d: [D.band('y', 6, 7, 0x8a7040), D.band('y', -6, -5, 0x8a7040)] }, { ch: 0.586 });
    k.box([4, 30, -19], [74, 2, 2], { c: 0x2a2a30 }, { ch: 0.3 });
    k.at([-28, 6, 12], [0, 0, 0], () => { k.box([0, 2, 0], [8, 4, 8], { c: 0x8a8a90, t: 'stone' }, { ch: 0.3 }); k.box([0, 8, 0], [3, 8, 3], { c: 0x8a8a90, t: 'stone' }, { ch: 0.3 }); k.box([0, 14, 0], [7, 5, 7], { c: 0x8a8a90, t: 'stone', d: [D.rect(-2, -1.5, 2, 1.5, 0xf2c86a)] }, { ch: 0.3 }); k.box([0, 18, 0], [10, 2.4, 10], { c: 0x7a7a80, t: 'stone' }, { ch: 0.3, top: [0.5, 0.5] }); });
    k.at([6, 6, 4], [0, 0.2, 0], () => capy(k, { size: 0.9, onBody(k, b) { towel(k, [0, b.ry * 2 + 0.6, 0]); } }));
    for (const [x, z, c] of [[24, 14, 0xd84a2a], [-10, 16, 0xf29a2a], [20, -4, 0xd8302a]]) k.box([x, 7.4, z], [4, 0.6, 3], { c }, { ch: 0.5, rot: [0, x, 0] });
  },
  kinkapi(k) {
    k.cyl([0, 3, 0], 26, 6, { c: 0xc8302a, t: 'lacquer', d: [D.band('y', 1, 2, 0xf2c23a)] });
    k.cyl([0, 8, 0], 22, 4, { c: 0xf2c23a, m: 'metal', t: 'metal' });
    k.at([0, 10, 0], [0, 0, 0], () => capy(k, { c: 0xe8b830, c2: 0xc89020, t: 'gloss', face: { eye: 'closed', mouth: 'none', gap: 7, y: 3 }, onBody(k, b) {
      towel(k, [0, b.ry * 2 + 0.6, 0], 0xffffff, 0xd8282a);
      k.soft([0, b.ry * 2 + 3.6, 0], [3.4, 3, 3.4], { c: 0xf6c818, t: 'crust', c2: 0xd8a010 }, { ch: 0.586 });
    } }));
    // a halo ring behind
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; k.box([Math.cos(a) * 22, 30 + Math.sin(a) * 22, -18], [9, 2.4, 1.4], { c: 0xffd84a, m: 'metal' }, { rot: [0, 0, a + Math.PI / 2], ch: 0.4 }); }
  },
};

export default {
  id: 'onsen',
  order: 8,
  name: 'Onsen Friends',
  jp: 'おんせんどうぶつ',
  tagline: 'Animals melting happily into hot springs',
  taglineJp: 'いいゆだな〜♨',
  price: 400,
  themes: ['nature', 'cute'],
  card: { bg: '#e2f3ef', accent: '#e0553a', text: '#25403b', accent2: '#f2b33d', pattern: 'waves' },
  capsule: { colors: [0x8fd8e6, 0xb07a4c, 0xffd21f, 0xffffff, 0xf08a6a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'yuzucapy', name: 'Yuzu-yu Capybara', jp: 'ゆず湯カピバラ', rarity: 'common',
      desc: 'Winter solstice yuzu bath. It has not moved in four hours. Possibly forever.',
      fig: F.yuzucapy,
    },
    {
      id: 'saru', name: 'Snow Monkey Soak', jp: 'ゆきみざる', rarity: 'common',
      desc: 'Snow on the rocks, towel on the head, absolutely zero plans for today.',
      fig: F.saru,
    },
    {
      id: 'penguin', name: 'Bath Pail Penguin', jp: 'せんめんきペンギン', rarity: 'common',
      desc: 'Brought its own yellow pail, soap and shampoo. A seasoned sento regular.',
      fig: F.penguin,
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'tanukimilk', name: 'Coffee Milk Tanuki', jp: 'コーヒー牛乳たぬき', rarity: 'uncommon',
      desc: 'Hand on hip, head tilted back, bottle drained in one go. The sacred ritual.',
      fig: F.tanukimilk,
    },
    {
      id: 'kaeru', name: 'Hinoki Tub Frog', jp: 'ひのき風呂ガエル', rarity: 'uncommon',
      desc: 'Elbows on the rim, sake tray floating by. Frogs have simply figured life out.',
      fig: F.kaeru,
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'kawauso', name: 'Sea Otter Family Bath', jp: 'ラッコ親子のおふろ', rarity: 'rare',
      desc: 'Holding hands so nobody drifts away. Dad brought his favourite rock.',
      fig: F.kawauso,
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'rotenburo', name: 'Rotenburo Retreat', jp: '露天風呂でゆったり', rarity: 'ultra',
      desc: 'Bamboo fence, stone lantern, autumn leaves. Reservations: capybaras only.',
      fig: F.rotenburo,
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'kinkapi', name: 'Golden Kapi-sama', jp: '金のカピバラさま', rarity: 'secret',
      desc: 'Bathing deity of eternal relaxation. Grants one wish: five more minutes.',
      fig: F.kinkapi,
    },
  ],
};
