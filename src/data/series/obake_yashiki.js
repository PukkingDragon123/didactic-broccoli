// Series 19 — Obake Yashiki (おばけ屋敷)
// Chibi cast and props of a summer-festival haunted house attraction. Scary-ish. Mostly -ish.
// Obake Yashiki: a haunted-house attraction's cast as blocky toy figures (src/figures).
import { chibi, beast, D } from '../../figures/chibi.js';
import { lantern, stick, sign, cute, plate, WOOD, DARKWOOD, WHITE } from '../../figures/props.js';

const GHOST = 0xf2f6fa;
/** A yūrei: a white teardrop body with a triangle headband, droopy hands, no feet. */
const yurei = (k, s = {}) => {
  k.prism([[0, 3, 3, 0, 0, 0.586], [10, 10, 9, 0, 0, 0.586], [24, 13, 11, 0, 0, 0.586], [34, 12, 10.6, 0, 0, 0.586], [40, 8, 7, 0, 0, 0.586]], { c: GHOST, m: s.m, t: 'cloth', d: [D.face({ eye: s.eye ?? 'closed', mouth: s.mouth ?? 'wavy', y: 31, gap: 4.6, er: 1.6, eh: 2, my: 26, mw: 2.6, blush: 0xb8c8f0 }), D.poly([[-4, 39], [4, 39], [0, 35]], 0xffffff, { ink: 0x2a1c1c, iw: 0.4 })] }, { pos: [0, s.y ?? 0, 0], rot: [0, 0, 0.12] });
  k.box([0, (s.y ?? 0) + 38, 0], [17, 2.4, 15], { c: 0xffffff, t: 'cloth' }, { ch: 0.5 });
  k.mirror(() => k.at([11, (s.y ?? 0) + 24, 4], [0.2, 0, 0.9], () => { k.box([0, -4, 0], [5, 9, 5], { c: GHOST, t: 'cloth' }, { ch: 0.4 }); k.box([0, -9, 1.5], [3.6, 3, 4.4], { c: 0xf6eee8 }, { ch: 0.5, rot: [0.9, 0, 0] }); }));
};
const F = {
  bikkuri(k) {
    k.box([0, 3, 0], [36, 6, 28], { c: 0x6a4a2a, t: 'wood', ga: 'x' }, { ch: 0.2, caps: 'both' });
    k.box([0, 9, 0], [32, 6, 24], { c: 0x2a2228, t: 'wood' }, { ch: 0.2 });
    k.at([0, 12, 0], [0.1, 0, 0.1], () => {
      stick(k, [0, 0, 0], [0, 14, 0], 2, { c: 0xa87a4a, t: 'wood' });
      k.prism([[0, 18, 18, 0, 0, 0.586], [10, 12, 12, 0, 0, 0.586], [22, 1.6, 1.6, 0, 0, 0.586]], { c: 0xd8302a, t: 'paper', d: [D.stripes('r', 2, 0.25, 0x8a1a18, { n: 16 }), D.circ(0, 10, 5, 0xffffff, { ink: 0x2a1c1c, iw: 0.8 }), D.circ(0, 9.6, 2.6, 0x2a1c1c), D.circ(-0.8, 10.6, 0.8, 0xffffff), D.ell(3, 2, 4, 2.4, 0x7a1a20, { dir: 'f' })] }, { pos: [0, 14, 0] });
      k.box([3, 16, 16], [5, 2, 10], { c: 0xe8506a, t: 'gloss' }, { ch: 0.5, rot: [0.5, 0, 0] });
    });
    k.box([0, 6.2, 14.2], [12, 2, 1], { c: 0xf2c23a, d: [D.txt('ばあ！', 0, 0, 1.8, 0x2a1c1c)] }, { ch: 0 });
  },
  konnyaku(k) {
    chibi(k, { H: 62, skin: 0xf2d8c0, hair: 'bald', headP: { c: 0x1a1a1e, t: 'cloth', d: [D.rect(-8, -3, 8, 3, 0x2a2a30, { dir: 'f' }), D.ell(-4, 0, 1, 0.7, 0xf2f2f2), D.ell(4, 0, 1, 0.7, 0xf2f2f2), D.arc(0, -6, 2.4, 1.2, 0.4, Math.PI - 0.4, 0.5, 0x6a6a72)] },
      top: { c: 0x1a1a1e, t: 'cloth' }, sleeve: { c: 0x1a1a1e, t: 'cloth' }, bottom: { c: 0x1a1a1e, t: 'cloth' }, shoes: 0x1a1a1e, gloves: { c: 0x1a1a1e }, armR: [150, -10, 20], armL: [10, 10, 0],
      holdR(k) { stick(k, [0, 0, 0], [0, 4, 24], 1.2, { c: 0xa87a4a }); stick(k, [0, 4, 24], [0, -10, 24], 0.3, { c: 0x2a2a30 }); k.box([0, -14, 24], [6, 7, 2], { c: 0x6a6a72, m: 'gloss', t: 'gloss', d: [D.dots(1.4, 0.3, 0x3a3a40)] }, { ch: 0.3, rot: [0, 0.6, 0] }); } });
  },
  chochin(k) {
    stick(k, [0, 0, 0], [0, 54, 0], 3, { c: 0x8a6a3a, t: 'wood' });
    k.box([0, 1.5, 0], [16, 3, 16], { c: 0x6a6a70, t: 'stone' }, { ch: 0.3 });
    sign(k, [-12, 40, 0], 20, 6, 0xf4efe4, 'でぐち→', 0x2a1c1c, { rot: [0, 0, 0.1] });
    sign(k, [12, 32, 0], 20, 6, 0xf4efe4, '←でぐち', 0xd8302a, { rot: [0, 0, -0.08] });
    k.at([0, 20, 4], [0, 0, 0], () => { lantern(k, [0, 0, 0], 7, 14, 0xf2e6c8, null); });
    k.box([0, 20, 11.5], [3, 3, 1], { c: 0x2a1c1c, d: [D.circ(0, 0, 1, 0xffffff)] }, { ch: 0.4 });
    k.box([0, 15, 11], [4, 2, 3], { c: 0xe8506a }, { ch: 0.5 });
  },
  rokurokubi(k) {
    // a lady in a kimono whose neck stretches up, tied in a bow, the head peeking down from above
    const body = chibi(k, { H: 52, hair: 'bald', headP: { c: 0xf2d8c0 }, headK: 0.0001, top: { c: 0x8a5ab8, t: 'cloth', d: [D.dots(4, 1, 0xe8c8f0, { dir: '*' })] }, outfit: { kind: 'kimono', collar: 0xf4efe4, obi: 0xf2c23a, obiC: 0xc8302a },
      sleeve: { c: 0x8a5ab8, t: 'cloth' }, legs: 'robe', bottom: { c: 0x8a5ab8, t: 'cloth', d: [D.dots(4, 1, 0xe8c8f0, { dir: '*' })] }, shoes: 0xf4efe4, armL: [40, 10, 60], armR: [40, -10, 60] });
    const pts = [[0, 34, 0], [2, 42, 2], [6, 50, 0], [4, 56, -4], [-2, 60, -2], [-6, 64, 2], [-4, 70, 6]];
    for (let i = 0; i + 1 < pts.length; i++) stick(k, pts[i], pts[i + 1], 3.6, { c: 0xf2d8c0, t: 'flat' });
    k.box([5, 51, 0], [8, 3, 3], { c: 0xe8506a, t: 'cloth' }, { ch: 0.4, rot: [0, 0, 0.6] });
    k.box([5, 51, 0], [8, 3, 3], { c: 0xe8506a, t: 'cloth' }, { ch: 0.4, rot: [0, 0, -0.6] });
    k.at([-4, 70, 6], [0.3, 0, -0.2], () => chibiHead(k));
    void body;
  },
  reizoko(k) {
    const B = { c: 0x9ad8c8, t: 'gloss', m: 'gloss' };
    k.box([0, 30, -2], [32, 56, 24], { ...B, d: [D.band('y', 8, 9, 0x6a9a8a, { only: 'f' }), D.rect(-2, -4, 2, 4, 0xd8d8de, { dir: 'f' })] }, { ch: 0.15 });
    k.box([0, 30, 9.8], [30, 54, 1], { c: 0xf4f8f6, t: 'gloss', fn: null, d: [D.rect(12, 6, 13.6, 18, 0xd8d8de), D.rect(12, -18, 13.6, -4, 0xd8d8de), D.ell(-5, 14, 3.6, 4.4, 0xffffff, { ink: 0x2a1c1c, iw: 0.6 }), D.ell(5, 14, 3.6, 4.4, 0xffffff, { ink: 0x2a1c1c, iw: 0.6 }), D.circ(-4, 13, 1.8, 0x2a1c1c), D.circ(6, 13, 1.8, 0x2a1c1c), D.arc(0, 6, 7, 4, Math.PI + 0.3, 2 * Math.PI - 0.3, 0.8, 0x2a1c1c), D.txt('ブーン', 0, -10, 3.4, 0x6a9a8a)] }, { ch: 0.12 });
    k.at([0, 0, 0], [0, 0, 0], () => { k.box([0, 59, 0], [24, 2, 18], { c: 0x6a6a72, t: 'metal' }, { ch: 0.3 }); });
    k.cyl([20, 4, 10], 3, 6, { c: 0xf2d080, m: 'glass', t: 'gloss' }, { top: 0.8 });
    k.cyl([20, 7.5, 10], 2.4, 1, { c: 0xa85a1a, t: 'gloss' });
    k.mirror(() => k.box([10, 1, 0], [5, 2, 5], { c: 0x2a2a30 }, { ch: 0.3 }));
  },
  okiku(k) {
    k.cyl([0, 10, 0], 18, 20, { c: 0x8a8a90, t: 'stone', d: [D.stripes('y', 5, 0.6, 0x6a6a70), D.stripes('x', 9, 0.6, 0x6a6a70, { dir: '*' })] }, { caps: 'bot' });
    k.cyl([0, 17, 0], 16.6, 1, { c: 0x1a2a3a, t: 'water' });
    k.mirror(() => k.box([16, 30, 0], [2.4, 30, 2.4], { c: 0x7a5230, t: 'wood' }, { ch: 0.3 }));
    k.box([0, 44, 0], [38, 3, 8], { c: 0x5a3a24, t: 'wood', ga: 'x' }, { ch: 0.3 });
    yurei(k, { y: 12, eye: 'closed', mouth: 'flat' });
    k.at([-12, 36, 8], [0.5, 0, 0.3], () => { for (let i = 0; i < 4; i++) k.cyl([0, i * 1.6, 0], 5, 1.2, { c: 0xf6f6f0, t: 'ceramic', d: [D.ring(0, 0, 3, 0.5, 0x3a5aa8, { dir: 't' })] }); });
    k.box([0, 52, 6], [16, 5, 1], { c: 0xf4efe4, d: [D.txt('…はちまい', 0, 0, 3, 0x2a1c1c)] }, { ch: 0 });
  },
  yashiki(k) {
    k.box([0, 2, 4], [66, 4, 38], { c: 0x5a5a62, t: 'stone' }, { ch: 0.1 });
    k.box([0, 24, -6], [60, 40, 18], { c: 0x4a3a32, t: 'wood', d: [D.stripes('x', 5, 0.6, 0x2a1e1a, { dir: 'f' }), D.rect(-12, -20, 12, 6, 0x1a1214, { dir: 'f' })] }, { ch: 0.06 });
    k.box([0, 50, -6], [70, 10, 26], { c: 0x2a2a34, t: 'stone', d: [D.stripes('x', 4, 1.2, 0x3a3a44, { dir: '*' })] }, { ch: 0.1, top: [0.7, 0.6] });
    sign(k, [0, 38, 3.4], 30, 7, 0x1a1214, 'おばけ屋敷', 0xe8e0d0);
    lantern(k, [-22, 24, 6], 4, 10, 0xd8302a, '肝');
    lantern(k, [22, 24, 6], 4, 10, 0xd8302a, '試');
    k.at([0, 4, -2], [0, 0, 0], () => yurei(k, { eye: 'dot', mouth: 'o' }));
    k.box([0, 4, 18], [20, 0.6, 10], { c: 0xc8302a, t: 'cloth' }, { ch: 0.05 });
  },
  kyukei(k) {
    k.box([0, 8, 6], [40, 2, 22], { c: 0x7a5230, t: 'wood', ga: 'x' }, { ch: 0.2 });
    k.mirror(() => k.box([17, 3.5, 6], [3, 7, 18], { c: 0x6a4428, t: 'wood' }, { ch: 0.2 }));
    k.at([0, 0, -8], [0, 0, 0], () => yurei(k, { eye: 'happy', mouth: 'open', y: 0 }));
    k.box([12, 11, 10], [14, 4, 10], { c: 0x2a2a30, t: 'gloss', d: [D.band('y', 0.6, 2, 0xc8302a)] }, { ch: 0.2 });
    k.box([12, 13.4, 10], [12, 1, 8], { c: 0xfbf8f0, t: 'rice', d: [D.circ(0, 0, 1.6, 0xc8302a, { dir: 't' })] }, { ch: 0.2 });
    k.cyl([-10, 13, 10], 3, 8, { c: 0x8a9a6a, t: 'ceramic' });
    k.box([-12, 18, -6], [10, 4, 1], { c: 0xf4efe4, d: [D.txt('休憩中', 0, 0, 2.6, 0x2a1c1c)] }, { ch: 0 });
  },
};
function chibiHead(k) {
  k.box([0, 12, 0], [26, 24, 22], { c: 0xf2d8c0, d: [D.face({ eye: 'anime', iris: 0x3a2a2a, mouth: 'smile', y: -2, gap: 5.6, er: 2, eh: 2.6, my: -8, blush: true })] }, { ch: 0.36, dens: 1.25 });
  k.box([0, 22, -2], [28, 7, 24], { c: 0x1a1414, t: 'hair' }, { ch: 0.4 });
  k.box([0, 14, -12], [28, 20, 3], { c: 0x1a1414, t: 'hair' }, { ch: 0.3 });
  k.ball([0, 28, -6], [6, 5, 6], { c: 0x1a1414, t: 'hair' });
  k.box([6, 27, -1], [1.4, 1.4, 10], { c: 0xc8302a }, { rot: [0, 0.4, 0.3] });
}

export default {
  id: 'obake_yashiki',
  order: 19,
  name: 'Obake Yashiki',
  jp: 'おばけ屋敷',
  tagline: 'The haunted house cast, on duty',
  taglineJp: 'うらめしや～…こわくないよ？',
  price: 600,
  themes: ['spooky', 'weird'],
  card: { bg: '#26203a', accent: '#b6f05a', text: '#f4eee0', accent2: '#ff6a8a', pattern: 'dots' },
  capsule: { colors: [0x6a3fa0, 0xb6f05a, 0xf5efe0, 0x2a2430, 0xff8a3a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'bikkuri', name: 'Pop-Up Kasa-obake', jp: 'びっくり唐傘', rarity: 'common',
      desc: 'Springs out at exactly the wrong moment. Practises its "boo" in the mirror.',
      fig: F.bikkuri,
    },
    {
      id: 'konnyaku', name: 'Kuroko & Konnyaku', jp: 'こんにゃく係の黒子', rarity: 'common',
      desc: 'Dangles cold konnyaku onto your neck in the dark. Feels terrible about it. Does it anyway.',
      fig: F.konnyaku,
    },
    {
      id: 'chochin', name: 'Chōchin-obake Signpost', jp: '道案内ちょうちん', rarity: 'common',
      desc: 'Lights the way to the exit. The exit is that way. No, the other way. Hee hee.',
      fig: F.chochin,
    },
    // ------------------------------------------------------------------ uncommon
    {
      id: 'rokurokubi', name: 'Rokurokubi-san', jp: 'ろくろ首さん', rarity: 'uncommon',
      desc: 'Stretches her neck to peek over the partition. Has tied it in a bow. Again.',
      fig: F.rokurokubi,
    },
    {
      id: 'reizoko', name: 'Haunted Fridge', jp: '冷蔵庫おばけ', rarity: 'uncommon',
      desc: 'Hums at night. Opens by itself. Eats the pudding you were saving. Every time.',
      fig: F.reizoko,
    },
    // ------------------------------------------------------------------ rare
    {
      id: 'okiku', name: "Okiku's Well", jp: 'お菊さんの井戸', rarity: 'rare',
      desc: '...seven, eight, nine... One plate short. Has been for centuries. Please check your bag.',
      fig: F.okiku,
    },
    // ------------------------------------------------------------------ ultra
    {
      id: 'yashiki', name: 'Haunted House Entrance', jp: '屋敷のいりぐち', rarity: 'ultra',
      desc: 'Enter if you dare. Exit through the gift shop. Scream optional but appreciated.',
      fig: F.yashiki,
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'kyukei', name: 'Yūrei on Lunch Break', jp: '休憩中のゆうれい', rarity: 'secret',
      desc: 'Clocked out at the stroke of midnight. Technically still haunting. Mostly snacking.',
      fig: F.kyukei,
    },
  ],
};
