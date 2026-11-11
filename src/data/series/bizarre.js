// Series 20 — Bizarre Pose Club (奇妙なポーズ部)
// An affectionate nod to dramatic 80s manga: impossible poses, menacing ゴゴゴ in the air, a guardian spirit
// hovering behind its partner, a pocket watch where time has stopped and a back alley you must not look back in.
// Bizarre Pose Club: original characters striking impossible manga poses, as chibi figures in the human kit.
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, cute, plate, cup, WHITE } from '../../figures/props.js';

const gogo = (k, x, y, z, s = 1, rz = 0.2) => k.box([x, y, z], [7 * s, 7 * s, 0.6], { c: 0x5a2a7a, d: [D.txt('ゴ', 0, 0, 5 * s, 0xe8c8ff), D.txt('ゴ', 0, 0, 5 * s, 0xe8c8ff, { dir: 'b' })] }, { ch: 0, rot: [0, 0, rz] });
const base = (k, c = 0x2a2a34) => k.box([0, 2, 0], [40, 4, 30], { c, t: 'gloss', d: [D.stripes('d', 5, 1.6, 0x3a3a46, { dir: 't' })] }, { ch: 0.3 });
const F = {
  pointer(k) {
    base(k);
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 64, hair: 'spiky', hairC: 0x2a2a6a, face: { eye: 'anime', iris: 0x3a5ac8, mouth: 'flat', brow: 'angry' }, top: { c: 0x2a2a6a, t: 'cloth' }, outfit: { kind: 'gakuran' }, sleeve: { c: 0x2a2a6a, t: 'cloth' }, bottom: { c: 0x2a2a6a, t: 'cloth' }, shoes: 0x1a1a1e,
      armR: [90, -6, 0], armL: [20, 30, 100], legL: [-20, 10], legR: [24, 6], lean: -8, head: [0, -10, -6], holdR(k) { k.box([0, -2, 1], [1.4, 6, 1.4], { c: 0xf6cfae }, { ch: 0.4 }); } }));
    gogo(k, -20, 40, -4); gogo(k, 20, 54, -4, 0.8, -0.2);
  },
  salaryman(k) {
    base(k);
    k.at([0, 4, 6], [0, 0, 0], () => chibi(k, { H: 62, hair: 'short', hairC: 0x1e1a1a, face: { eye: 'angry', mouth: 'flat', brow: 'thick', nose: 'line' }, top: { c: 0x3a3a46, t: 'cloth' }, outfit: { kind: 'suit', tie: 0xc8302a }, sleeve: { c: 0x3a3a46, t: 'cloth' }, bottom: { c: 0x3a3a46, t: 'cloth' }, shoes: 0x1a1a1e,
      lean: -42, head: [-20, 0, 0], armL: [-60, 20, 0], armR: [150, -10, 20], legL: [30, 6], legR: [30, -6], holdL(k) { k.box([0, -5, 0], [3, 8, 11], { c: 0x4a2a1a, t: 'gloss', d: [D.rect(-1, 2, 1, 3, 0xd8b040, { dir: 'l' })] }, { ch: 0.2 }); } }));
    gogo(k, 18, 44, -6);
  },
  gogo_cat(k) {
    k.box([0, 3, 0], [36, 6, 28], { c: 0xc8302a, t: 'cloth', top: 0xd8403a, d: [D.stripes('x', 4, 0.6, 0xf2c23a, { dir: 't' })] }, { ch: 0.4 });
    k.at([0, 6, 0], [0, 0, 0], () => beast(k, 'sit', { c: 0xf2f0ea, size: 1.3, ears: 'tri', inner: 0xf4a8b0, whiskers: true, face: { eye: 'angry', mouth: 'cat' }, bodyD: [D.ell(-6, 10, 5, 5, 0xe8893a, { dir: '*' }), D.ell(6, 3, 4, 5, 0x3a3230, { dir: '*' })], headD: [D.ell(-6, 5, 4, 3, 0xe8893a), D.ell(7, 6, 3, 3, 0x3a3230)] }));
    gogo(k, -20, 30, 0); gogo(k, 20, 38, 0, 0.8, -0.3); gogo(k, -18, 48, -4, 0.6);
  },
  pompadour(k) {
    base(k, 0x3a2a24);
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 64, hair: 'pomp', hairC: 0x1a1414, face: { eye: 'anime', iris: 0x3a2a1a, mouth: 'smile', brow: 'thick' }, top: { c: 0x1a1a24, t: 'cloth' }, outfit: { kind: 'gakuran' }, sleeve: { c: 0x1a1a24, t: 'cloth' }, bottom: { c: 0x1a1a24, t: 'cloth' }, shoes: 0x1a1a1e,
      armL: [10, 14, 20], armR: [10, -14, 20], legL: [0, 10], legR: [0, 10], onBody(k, T) { for (let i = 0; i < 3; i++) k.box([-5 + i * 5, 4, T.hd + 0.6], [2, 2, 0.8], { c: 0xd8b040, m: 'metal' }, { ch: 0.4, rot: [0, 0, 0.78] }); } }));
    for (const x of [-16, 16]) k.box([x, 50, 0], [2, 8, 0.6], { c: 0xffd84a, m: 'glow' }, { ch: 0, rot: [0, 0, x > 0 ? -0.3 : 0.3] });
  },
  tbc(k) {
    // frozen mid-jump in sepia, with the "to be continued" arrow
    const SEP = (c) => c;
    k.box([0, 2, 0], [44, 4, 30], { c: 0x8a6a4a, t: 'paper' }, { ch: 0.3 });
    stick(k, [0, 4, 0], [0, 14, 0], 2, { c: 0x6a5038 });
    k.at([0, 14, 0], [0, 0, 0.3], () => chibi(k, { H: 54, skin: 0xd8b890, hair: 'spiky', hairC: 0x4a3a2a, face: { eye: 'dot', mouth: 'open', brow: 'soft', ink: 0x3a2a1a }, top: { c: 0xa88a64, t: 'cloth' }, sleeve: { c: 0xa88a64, t: 'cloth' }, bottom: { c: 0x7a6044, t: 'cloth' }, shoes: 0x5a4430,
      armL: [140, 40, 0], armR: [-40, -30, 0], legL: [60, 10], legR: [-30, 10] }));
    k.box([10, 8, 16], [30, 7, 1.4], { c: 0x6a5038, d: [D.poly([[-15, -3.5], [11, -3.5], [11, -5], [15, 0], [11, 5], [11, 3.5], [-15, 3.5]], 0xe8d8b8), D.txt('つづく', -1, 0, 3.4, 0x4a3a2a)] }, { ch: 0.1 });
    void SEP;
  },
  phantom(k) {
    base(k, 0x3a2a4a);
    const pose = { armL: [140, 30, 10], armR: [40, -60, 80], legL: [-10, 16], legR: [10, 4], head: [0, 20, 10], lean: -4 };
    k.at([0, 4, 6], [0, 0, 0], () => chibi(k, { H: 58, hair: 'twin', hairC: 0xe8506a, face: { eye: 'anime', iris: 0xe8506a, mouth: 'grin', lash: true }, top: { c: 0xf4f0e8, t: 'cloth' }, outfit: { kind: 'sailor', collar: 0x2a2a6a }, legs: 'skirt', bottom: { c: 0x2a2a6a, t: 'cloth' }, socks: 0xf4f0e8, shoes: 0x2a1a14, ...pose }));
    k.at([4, 14, -8], [0, 0.2, 0], () => chibi(k, { H: 62, skin: 0x8ad8e8, hair: 'spiky', hairC: 0x4ab8d8, headP: { c: 0x8ad8e8, m: 'glass', t: 'glass', d: [D.face({ eye: 'line', mouth: 'flat', blush: false, y: -2, gap: 6, er: 2.4 })] }, top: { c: 0x8ad8e8, m: 'glass', t: 'glass' }, sleeve: { c: 0x8ad8e8, m: 'glass' }, bottom: { c: 0x8ad8e8, m: 'glass' }, gloves: { c: 0x8ad8e8, m: 'glass' }, shoes: 0x8ad8e8, ...pose, armL: [120, 30, 10], armR: [30, -60, 70] }));
  },
  watch(k) {
    k.box([0, 2, 0], [40, 4, 34], { c: 0x3a2a24, t: 'wood' }, { ch: 0.3 });
    k.at([0, 26, 0], [0, 0, 0], () => {
      k.cyl([0, 0, 0], 17, 6, { c: 0xe8c040, m: 'metal', t: 'metal', front: 0xf6f0dc, d: [D.ring(0, 0, 14, 0.6, 0x2a1c1c, { dir: 'f' }), ...[...Array(12)].map((_, i) => D.rect(Math.cos(i * 0.5236) * 12 - 0.5, Math.sin(i * 0.5236) * 12 - 1, Math.cos(i * 0.5236) * 12 + 0.5, Math.sin(i * 0.5236) * 12 + 1, 0x2a1c1c, { dir: 'f' })), D.line(0, 0, 0, 10, 0.8, 0x2a1c1c, { dir: 'f' }), D.line(0, 0, 6, -3, 1, 0x2a1c1c, { dir: 'f' }), D.txt('ZA', 0, -6, 2.4, 0xc8302a)] }, { rot: [Math.PI / 2, 0, 0], pf: true });
      k.cyl([0, 19.6, 0], 2.6, 3, { c: 0xe8c040, m: 'metal' });
      k.cyl([0, 23, 0], 3, 1.4, { c: 0xe8c040, m: 'metal' }, { rot: [Math.PI / 2, 0, 0] });
    });
    // the butler bowing and the tea frozen in mid-air
    k.at([-14, 4, 10], [0, 0.5, 0], () => chibi(k, { H: 34, hair: 'short', hairC: 0xd8d8de, top: { c: 0x1a1a1e }, outfit: { kind: 'suit', tie: 0x1a1a1e }, sleeve: { c: 0x1a1a1e }, bottom: { c: 0x1a1a1e }, lean: 40, face: { eye: 'closed', mouth: 'flat' } }));
    k.cyl([14, 14, 10], 2, 2.4, { c: WHITE, t: 'ceramic' }, { rot: [0.6, 0, 0.3] });
    for (let i = 0; i < 4; i++) k.box([14 - i * 0.6, 10 - i * 2, 12], [1.2, 1.6, 1.2], { c: 0xc8803a, m: 'glass' }, { ch: 0.5 });
  },
  alley(k) {
    k.box([0, 2, 0], [36, 4, 30], { c: 0x5a5a62, t: 'stone', d: [D.stripes('x', 6, 0.5, 0x3a3a42, { dir: 't' })] }, { ch: 0.2 });
    k.at([0, 4, 0], [0, 0.15, 0], () => chibi(k, { H: 62, skin: 0xf2e8e0, hair: 'long', hairC: 0x1a1414, face: { eye: 'anime', iris: 0x6a3a8a, mouth: 'smile', lash: true, blush: 0xe8c0d0 }, top: { c: 0xf4f2ee, t: 'cloth' }, outfit: { kind: 'sailor', collar: 0x2a3a5a, scarf: 0x6a3a8a },
      legs: 'skirt', bottom: { c: 0x2a3a5a, t: 'cloth' }, socks: 0x1a1a1e, shoes: 0x2a1a14, armL: [30, 10, 60], armR: [10, -8, 0], holdL(k) { k.cyl([0, -2, 2], 3, 6, { c: 0xf2e6c8, m: 'glow', t: 'paper', d: [D.stripes('y', 1.6, 0.4, 0xb8a888)] }); } }));
    k.box([-14, 24, -10], [3, 44, 3], { c: 0x6a5a4a, t: 'wood' }, { ch: 0.2 });
    k.box([-14, 40, -8], [7, 10, 1], { c: 0xf4efe4, d: [D.txt('ふりむくな', 0, 0, 1.6, 0xc8302a, { vert: true })] }, { ch: 0 });
  },
};

export default {
  id: 'bizarre',
  order: 20,
  name: 'Bizarre Pose Club',
  jp: '奇妙なポーズ部',
  tagline: 'Strike a pose. Menacingly.',
  taglineJp: 'ゴゴゴ…ポーズを決めろ！',
  price: 500,
  themes: ['weird', 'city', 'retro'],
  card: { bg: '#fbe9ff', accent: '#8a35d8', text: '#26123c', accent2: '#ff4f9a', pattern: 'stars' },
  capsule: { colors: [0x8a35d8, 0xffc21f, 0xff4f9a, 0x3fd6c8, 0xffffff] },
  items: [
    {
      id: 'pointer', name: 'The Pointer', jp: 'ビシッと指差し', rarity: 'common',
      desc: 'Points straight at you with total conviction. You have done nothing. Yet.',
      fig: F.pointer,
    },
    {
      id: 'salaryman', name: 'Leaning Salaryman', jp: 'のけぞりサラリーマン', rarity: 'common',
      desc: 'Leans back at an angle physics does not allow. The briefcase is somehow fine.',
      fig: F.salaryman,
    },
    {
      id: 'gogo_cat', name: 'Menacing Calico', jp: 'ゴゴゴ三毛猫', rarity: 'common',
      desc: 'Sits perfectly still. The air around her rumbles. Nobody knows why.',
      fig: F.gogo_cat,
    },
    {
      id: 'pompadour', name: 'Pompadour Senpai', jp: 'リーゼント先輩', rarity: 'uncommon',
      desc: 'Calm, polite, unbeatable. Just never, ever say anything about the hair.',
      fig: F.pompadour,
    },
    {
      id: 'tbc', name: 'To Be Continued', jp: 'つづく', rarity: 'uncommon',
      desc: 'Frozen mid-jump, in sepia. The next episode airs in an undisclosed number of years.',
      fig: F.tbc,
    },
    {
      id: 'phantom', name: 'Phantom Partner', jp: 'うしろの相棒', rarity: 'rare',
      desc: 'Her guardian spirit copies every pose half a second late. She insists it is on purpose.',
      fig: F.phantom,
    },
    {
      id: 'watch', name: 'Time-Stop Pocket Watch', jp: '時止めの懐中時計', rarity: 'ultra',
      desc: 'The tea has been in mid-air for nine seconds. The butler has been bowing since Tuesday.',
      fig: F.watch,
    },
    {
      id: 'alley', name: 'Ghost Alley Girl', jp: '小道のおばけ少女', rarity: 'secret',
      desc: 'A friendly guide to the back alley. Walk with her as far as you like. Just never look back.',
      fig: F.alley,
    },
  ],
};
