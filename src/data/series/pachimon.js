// Series — Pachimon Paradise (パチモンパラダイス)
// Affectionate off-brand bootlegs of pop-culture favourites: tiny round blob friends who cry and yell a lot, and a
// few blobs having a bizarre adventure. Original designs and names, no logos.
// Pachimon Paradise: bootleg-style blob mascots (original characters, parody poses) as blocky vinyl figures.
import { beast, chibi, D } from '../../figures/chibi.js';
import { stick, cute, WHITE } from '../../figures/props.js';

const blob = (k, c, face, extra = [], o = {}) => k.soft([0, o.h ?? 13, 0], [o.w ?? 14, o.h ?? 13, o.d ?? 12], { c, t: o.t ?? 'gloss', m: 'gloss', d: [...D.face({ gap: 5.5, er: 1.8, eh: 2.4, y: 2, blush: true, ...face }), ...extra] }, { flat: true, ch: 0.5, bev: 0.42, bs: 0.7 });
const gogo = (k, x, y, z, s = 1) => k.box([x, y, z], [7 * s, 7 * s, 0.6], { c: 0x6a3a8a, d: [D.txt('ゴ', 0, 0, 5 * s, 0xd8b8f8), D.txt('ゴ', 0, 0, 5 * s, 0xd8b8f8, { dir: 'b' })] }, { ch: 0, rot: [0, 0, 0.2] });
const F = {
  chibikuma(k) {
    blob(k, 0xb8804a, { eye: 'tear', iris: 0x3a2a1a, mouth: 'wavy' }, [D.ell(0, -5, 6, 4, 0xf2d8b0)]);
    k.mirror(() => k.cyl([9, 25, -1], 4, 2.6, { c: 0xb8804a, t: 'fur', d: [D.circ(0, 0, 2, 0xf2d8b0, { dir: 'f' })] }, { rot: [Math.PI / 2, 0, 0] }));
    k.mirror(() => k.box([12, 8, 6], [5, 7, 5], { c: 0xb8804a, t: 'fur' }, { ch: 0.5, rot: [0.6, 0, -0.4] }));
    for (const [x, z] of [[-18, 6], [16, 10], [-12, -10]]) { k.box([x, 3, z], [1.4, 6, 1.4], { c: 0x4a9a2a }); k.box([x + 1.2, 6, z], [3, 1, 2], { c: 0x5ab83a }, { ch: 0.3 }); }
    k.box([0, 1, 0], [44, 2, 32], { c: 0x8a6a42, t: 'stone' }, { ch: 0.3 });
  },
  wareneko(k) {
    blob(k, 0x5a9ae8, { eye: 'dot', mouth: 'open' }, [D.fn('*', (c, o) => { if (c.x > 0) { o[0] = 250; o[1] = 250; o[2] = 248; } })]);
    k.mirror(() => k.prism([[0, 4, 2, 0, 0, 0.3], [7, 0.5, 0.6, 0, 0, 0]], { c: 0x5a9ae8, t: 'gloss', d: [D.fn('*', (c, o) => { if (c.X > 0) { o[0] = 250; o[1] = 250; o[2] = 248; } })] }, { pos: [9, 24, -1], rot: [0, 0, -0.2] }));
    k.box([0, 30, 4], [1, 4, 1], 0xd8302a, { ch: 0.4 });
  },
  wahoousa(k) {
    blob(k, 0xf6f2ea, { eye: 'star', mouth: 'grin', mw: 5 }, [], { h: 12 });
    k.mirror(() => k.box([5, 34, -1], [5, 18, 3], { c: 0xf6f2ea, t: 'gloss', d: [D.rect(-1.4, -6, 1.4, 6, 0xf4a8b0, { r: 1, dir: 'f' })] }, { ch: 0.5, rot: [0, 0, -0.25] }));
    k.mirror(() => k.box([16, 18, 2], [5, 9, 5], { c: 0xf6f2ea, t: 'gloss' }, { ch: 0.5, rot: [0, 0, -2.4] }));
    k.box([0, 30, 14], [16, 7, 0.8], { c: 0xf2c23a, d: [D.txt('ワフー!', 0, 0, 4, 0xd8302a)] }, { ch: 0.2, rot: [0, 0, 0.1] });
  },
  gogomochi(k) {
    k.at([0, 0, 0], [0, 0.3, 0.2], () => blob(k, 0xfbf6ea, { eye: 'angry', mouth: 'flat', brow: 'angry' }, [D.line(-3, -9, 4, 2, 0.6, 0x6a4a8a, { dir: 'f' })], { t: 'plush' }));
    k.mirror(() => k.box([14, 22, 2], [5, 12, 5], { c: 0xfbf6ea, t: 'plush' }, { ch: 0.5, rot: [0, 0, -2.0] }));
    gogo(k, -22, 34, 0); gogo(k, 22, 28, 0, 0.8); gogo(k, -24, 18, 2, 0.7);
  },
  standsan(k) {
    // the muscly spirit behind, the shy blob in front
    k.at([0, 0, -10], [0, 0, 0], () => chibi(k, { H: 68, skin: 0x8a6ae8, hair: 'spiky', hairC: 0x4a2ab8, face: { eye: 'angry', mouth: 'teeth', brow: 'angry' }, top: { c: 0x8a6ae8, t: 'gloss', m: 'gloss', d: [D.line(0, -6, 0, 6, 0.6, 0x6a4ac8), D.line(-7, 0, 7, 0, 0.6, 0x6a4ac8)] }, sleeve: { c: 0x8a6ae8, t: 'gloss' }, bottom: { c: 0x6a4ac8, t: 'gloss' }, wide: 1.3,
      armL: [90, 0, 0], armR: [90, -30, 30], gloves: { c: 0x8a6ae8 }, shoes: 0x6a4ac8 }));
    k.at([0, 0, 12], [0, 0, 0], () => blob(k, 0xf2d8a0, { eye: 'dot', mouth: 'o', blush: true }, [], { w: 9, h: 8, d: 8 }));
    k.box([24, 50, 0], [14, 7, 0.8], { c: 0xffffff, d: [D.txt('オラ(どうぞ)', 0, 0, 2.4, 0x6a4ac8)] }, { ch: 0.3 });
  },
  roadroller(k) {
    k.box([0, 2, 0], [50, 4, 36], { c: 0x7a7a80, t: 'stone' }, { ch: 0.3 });
    k.at([0, 4, 0], [0.1, 0, 0.1], () => {
      k.box([0, 12, 0], [30, 12, 20], { c: 0xf2c018, t: 'gloss', m: 'gloss', d: [D.txt('ROLLER', 0, 0, 4, 0x2a1c1c)] }, { ch: 0.2 });
      k.cyl([0, 4, 12], 7, 26, { c: 0x5a5a62, t: 'metal', m: 'metal' }, { rot: [0, 0, Math.PI / 2] });
      k.cyl([0, 4, -10], 5, 26, { c: 0x2a2a30, t: 'gloss' }, { rot: [0, 0, Math.PI / 2] });
      k.box([0, 22, -4], [18, 8, 10], { c: 0xf2c018, t: 'gloss' }, { ch: 0.2 });
      k.at([0, 25, 2], [0, 0, 0], () => blob(k, 0xf6e06a, { eye: 'angry', mouth: 'teeth', brow: 'angry' }, [], { w: 8, h: 7, d: 7 }));
    });
    k.box([18, 4, 16], [6, 2, 4], { c: 0xffffff, d: [D.txt('むだ', 0, 0, 1.6, 0x2a1c1c)] }, { ch: 0.3 });
  },
  kinusa(k) {
    blob(k, 0xf6f2ea, { eye: 'sparkle', iris: 0x3a8ae8, mouth: 'smile' }, [D.ell(4, -6, 1.8, 1.4, 0xe8302a, { dir: 'f', ink: 0x2a1c1c, iw: 0.3 }), D.circ(4.6, -5.4, 0.4, 0x2a1c1c)]);
    k.mirror(() => k.box([5, 34, -1], [5, 16, 3], { c: 0xf6f2ea, t: 'gloss' }, { ch: 0.5, rot: [0, 0, -0.2] }));
    for (const x of [-7, 0, 7]) k.cyl([x, 26.6, 6], 2.6, 3, { c: 0xf2c018, t: 'hair' }, { rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 6; i++) k.box([Math.cos(i) * 22, 20 + Math.sin(i * 2) * 10, -4], [2, 2, 0.6], { c: 0xffe878, m: 'glow' }, { ch: 0, rot: [0, 0, 0.78] });
  },
  tokitome(k) {
    blob(k, 0xf2c018, { eye: 'dot', mouth: 'smile' }, [D.circ(0, -4, 6, 0xfbfbf2, { ink: 0x8a6a10, iw: 0.6 }), D.line(0, -4, 0, 0.6, 0.6, 0x2a1c1c), D.line(0, -4, 0.2, 0.2, 0.6, 0x2a1c1c), D.dots(4, 0.3, 0x2a1c1c, { dir: 'x' })], { t: 'gloss' });
    k.cyl([0, 27.4, 0], 2, 2, { c: 0xf2c018, m: 'metal' }); k.cyl([0, 30, 0], 3, 1.4, { c: 0xf2c018, m: 'metal' }, { rot: [Math.PI / 2, 0, 0] });
    k.box([0, 40, 0], [20, 6, 0.6], { c: 0x2a2a30, d: [D.txt('ザ・ワールド?', 0, 0, 2.6, 0xf2c018), D.txt('ザ・ワールド?', 0, 0, 2.6, 0xf2c018, { dir: 'b' })] }, { ch: 0.2 });
  },
};

export default {
  id: 'pachimon',
  order: 9,
  name: 'Pachimon Paradise',
  jp: 'パチモンパラダイス',
  tagline: 'Totally official bootleg friends',
  taglineJp: 'たぶん公式！ニセモノなかま',
  price: 400,
  themes: ['cute', 'weird'],
  card: { bg: '#fff4f8', accent: '#8a5bd6', text: '#3a2440', accent2: '#ffd23f', pattern: 'stars' },
  capsule: { colors: [0xffffff, 0xffc2d4, 0xc7b3f0, 0xfff2b3], style: 'opaque' },
  items: [
    {
      id: 'chibikuma', name: 'Teary Chibikuma', jp: 'なきむしちびくま', rarity: 'common',
      desc: 'Tiny, round, crying about weeding. You would cry too. It is so much weeding.',
      fig: F.chibikuma,
    },
    {
      id: 'wareneko', name: 'Splitface Kitty', jp: 'われわれねこ', rarity: 'common',
      desc: 'Half blue, half white, all heart. Says "it\'ll be fine!" right before it isn\'t.',
      fig: F.wareneko,
    },
    {
      id: 'wahoousa', name: 'Wahoo Bunny', jp: 'ワッホーうさぎ', rarity: 'common',
      desc: 'Yells WAHOO at everything. Eats your snacks. Somehow everyone\'s favourite.',
      fig: F.wahoousa,
    },
    {
      id: 'gogomochi', name: 'Menacing Mochi', jp: 'ゴゴゴもち', rarity: 'uncommon',
      desc: 'Strikes a pose so twisted its spine is a rumour. The air around it says ゴゴゴ.',
      fig: F.gogomochi,
    },
    {
      id: 'standsan', name: 'Stand-in Spirit', jp: 'スタンドさん', rarity: 'uncommon',
      desc: 'A shy blob and the enormous muscly spirit that does all its talking. ORA. (please)',
      fig: F.standsan,
    },
    {
      id: 'roadroller', name: 'It Was Me, Roller!', jp: 'ロードローラーだっ', rarity: 'rare',
      desc: 'A blond blob drops a road roller on its problems. The problems remain. The roller is cute.',
      fig: F.roadroller,
    },
    {
      id: 'kinusa', name: 'Golden Wind Bunny', jp: 'こがねかぜうさぎ', rarity: 'ultra',
      desc: 'Has a dream. Has a ladybug brooch. Has a very specific hairdo. Gleams.',
      fig: F.kinusa,
    },
    {
      id: 'tokitome', name: 'Time-Stop Clock Blob', jp: 'ときとめどけい', rarity: 'secret',
      desc: 'Its belly clock says 12:00. It has always said 12:00. Did you just blink? It didn\'t.',
      fig: F.tokitome,
    },
  ],
};
