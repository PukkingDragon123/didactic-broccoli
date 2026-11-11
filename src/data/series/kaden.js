// Appliance Bugs (かでんむし): Shōwa appliances that are also insects; enamel, chrome and wiring as blocky figures.
import { beast, D } from '../../figures/chibi.js';
import { stick, cute } from '../../figures/props.js';

const CHROME = { c: 0xd8dae0, m: 'metal', t: 'metal' };
const legs = (k, n = 3, y = 4, w = 12, c = 0x2a2a30) => k.mirror(() => { for (let i = 0; i < n; i++) k.box([w, y, (i - (n - 1) / 2) * 7], [8, 1.4, 1.4], { c, t: 'gloss' }, { ch: 0.3, rot: [0, (i - 1) * 0.3, -0.5] }); });
const antenna = (k, y, z, c = 0x2a2a30) => k.mirror(() => stick(k, [2, y, z], [6, y + 10, z + 6], 0.8, { c }));
const bugEyes = (y, gap, r = 1.8) => [D.circ(-gap, y, r, 0x1a1a1a, { dir: 'f' }), D.circ(gap, y, r, 0x1a1a1a, { dir: 'f' }), D.circ(-gap - 0.5, y + 0.6, r * 0.35, 0xffffff, { dir: 'f' }), D.circ(gap - 0.5, y + 0.6, r * 0.35, 0xffffff, { dir: 'f' })];
const F = {
  suihanki(k) {
    legs(k);
    k.cyl([0, 13, 0], 14, 18, { c: 0xfbf8f0, t: 'ceramic', d: [D.fn('*', (c, o) => { const u = ((c.a % 8) + 8) % 8 - 4, v = ((c.b % 8) + 8) % 8 - 4; if (Math.hypot(u, v) < 2) { o[0] = 236; o[1] = 120; o[2] = 140; } })] });
    k.at([0, 22, 0], [-0.5, 0, 0], () => { k.cyl([0, 1.5, -6], 14.4, 3, { c: 0xe8e2d4, t: 'ceramic' }, { top: 0.9 }); k.mirror(() => k.box([7, 2, -6], [12, 1, 24], { c: 0xd8e8f0, m: 'glass' }, { ch: 0.5, rot: [0, 0.2, 0] })); });
    k.box([0, 9, 14], [12, 8, 3], { c: 0x2a2a30, t: 'gloss', d: bugEyes(1, 3) }, { ch: 0.4 });
    antenna(k, 13, 15);
  },
  senpuki(k) {
    k.cyl([0, 2, 0], 10, 4, { c: 0x7ac8b8, t: 'gloss' });
    k.box([0, 14, 0], [4, 20, 4], CHROME, { ch: 0.4 });
    k.box([0, 28, -6], [6, 6, 20], { c: 0x7ac8b8, t: 'gloss', d: [D.stripes('z', 3, 0.6, 0x5aa898)] }, { ch: 0.5 });
    k.soft([0, 28, 6], [6, 5, 4], { c: 0x7ac8b8, t: 'gloss', d: bugEyes(1, 2.6, 1.6) }, { ch: 0.5 });
    for (let i = 0; i < 4; i++) k.at([0, 30, -2], [0, (i - 1.5) * 0.5, 0], () => k.box([(i < 2 ? -1 : 1) * 14, 0, 0], [24, 0.8, 6], { c: 0xc8eef8, m: 'glass', t: 'glass', d: [D.stripes('x', 4, 0.4, 0x8ac8d8, { dir: 't' })] }, { ch: 0.5 }));
    k.cyl([0, 28, 10.6], 2, 1, CHROME, { rot: [Math.PI / 2, 0, 0] });
  },
  iron(k) {
    legs(k, 3, 2, 10);
    k.prism([[0, 13, 9, 0, 3, 0.5], [6, 12, 8, 0, 2, 0.5]], { c: 0xd8302a, t: 'gloss', m: 'gloss', d: [D.dots(6, 1.8, 0x1a1a1a, { dir: 't' }), D.line(0, -10, 0, 10, 0.6, 0x1a1a1a, { dir: 't' })] }, { pos: [0, 3, 0], rot: [0, 0, 0] });
    k.box([0, 2, 0], [26, 2, 18], { ...CHROME, d: [D.dots(3, 0.5, 0x8a8a92, { dir: 'u' })] }, { ch: 0.3, top: [1, 0.9] });
    k.box([0, 13, -2], [4, 6, 12], { c: 0x2a2a30, t: 'gloss' }, { ch: 0.4 });
    k.soft([0, 7, 11], [5, 4, 3], { c: 0x1a1a1a, t: 'gloss', d: bugEyes(0.6, 2, 1.2).map((d) => d) }, { ch: 0.5 });
    k.box([0, 17, -12], [2, 2, 6], { c: 0x2a2a30 }, { ch: 0.4 });
  },
  toaster(k) {
    for (let i = 0; i < 5; i++) k.box([0, 12, -12 + i * 6], [22 - Math.abs(i - 2) * 2, 18 - Math.abs(i - 2) * 2, 5.4], { ...CHROME, d: [D.band('y', -9, -7, 0x3a3a44)] }, { ch: 0.4, top: [0.9, 1] });
    k.mirror(() => k.box([4, 22, 0], [3, 2, 18], { c: 0x2a2a30 }, { ch: 0.3 }));
    k.mirror(() => k.box([4, 26, 0], [3, 8, 12], { c: 0xd8a050, t: 'crust', c2: 0x8a4a14, top: 0xc8803a }, { ch: 0.3 }));
    k.soft([0, 10, 14], [6, 5, 3], { c: 0x6a6a72, t: 'metal', d: bugEyes(1, 2.4, 1.3) }, { ch: 0.5 });
    legs(k, 3, 3, 12, 0x5a5a62);
    antenna(k, 12, 15, 0x5a5a62);
  },
  terebi(k) {
    legs(k, 3, 3, 14, 0x4a2a14);
    k.box([0, 18, 0], [32, 22, 20], { c: 0x8a5a32, t: 'wood', ga: 'x', d: [D.rect(-12, -8, 6, 8, 0x2a2a30, { dir: 'f', r: 3 }), D.rect(-10, -6, 4, 6, 0x6aa8a0, { dir: 'f', r: 3 }), D.circ(10, 3, 2, 0xd8dae0, { dir: 'f' }), D.circ(10, -3, 2, 0xd8dae0, { dir: 'f' }), ...bugEyes(1, 4, 1.4).map(() => null)] }, { ch: 0.2 });
    k.mirror(() => k.at([6, 29, 4], [0.3, 0, -0.5], () => { k.box([0, 8, 0], [2.4, 18, 2.4], { c: 0x3a2a24, t: 'gloss' }, { ch: 0.4 }); k.box([-2, 16, 3], [5, 2, 2], { c: 0x3a2a24, t: 'gloss' }, { ch: 0.4 }); }));
    k.soft([0, 10, 11], [5, 3.6, 2], { c: 0x3a2a24, t: 'gloss', d: bugEyes(0.4, 2, 1.2) }, { ch: 0.5 });
  },
  heater(k) {
    legs(k, 3, 3, 12);
    k.cyl([0, 16, 0], 12, 26, { c: 0xe8e2d4, t: 'gloss', d: [D.rect(-4, -4, 4, 4, 0x2a2a30, { dir: 'f' }), D.rect(-3, -3, 3, 3, 0xff8a2a, { dir: 'f' }), D.txt('石油', 0, 8, 2.6, 0xd8302a)] });
    k.cyl([0, 30, 0], 10, 2, { c: 0x2a2a30, t: 'metal', d: [D.stripes('r', 1, 0.2, 0x5a5a62, { n: 12 })] });
    k.soft([0, 2, -14], [7, 5, 7], { c: 0xfff0a0, m: 'glow' }, { ch: 0.586 });
    k.soft([0, 22, 12], [5, 4, 3], { c: 0x2a2a30, t: 'gloss', d: bugEyes(0.6, 2, 1.3) }, { ch: 0.5 });
    antenna(k, 26, 10);
  },
};

export default {
  id: 'kaden',
  order: 7,
  name: 'Appliance Bugs',
  jp: 'こんちゅう家電',
  romaji: 'KONCHU KADEN',
  tagline: 'Plugged in, six legs out',
  taglineJp: 'コンセントに、むしがいる。',
  price: 300,
  themes: ['retro', 'home', 'weird'],
  card: { bg: '#eef0e2', accent: '#4f8a6a', text: '#2c3430', accent2: '#e0584a', pattern: 'dots' },
  capsule: { colors: [0x8fb8a8, 0xe0584a, 0x6fa8d8, 0xf6f0e2, 0x9a6a46], style: 'opaque' },
  flyer: {
    maker: 'dondoko', scene: 'room', hero: 'terebi', side: ['toaster', 'suihanki'],
    title: [['こんちゅう', 2, 'b'], ['家電', 4, 'a']],
    catch: 'コンセントに、むしがいる。', sub: 'フタ・ハネがひらく', gimmick: 'アンテナのキバが動く！',
  },
  items: [
    {
      id: 'suihanki', name: 'Rice-Cooker Beetle', jp: 'すいはんきカブト', jpLines: ['すいはんき', 'カブト'], rarity: 'common',
      desc: 'Keeps rice warm for nine hours. Keeps opinions warm for longer.',
      fig: F.suihanki, gimmick: { text: 'Open the lid' },
    },
    {
      id: 'senpuki', name: 'Fan Dragonfly', jp: 'せんぷうきトンボ', jpLines: ['せんぷうき', 'トンボ'], rarity: 'common',
      desc: 'Three speeds. Hovers at all of them. Will not oscillate, on principle.',
      fig: F.senpuki, gimmick: { text: 'Spin the blades' },
    },
    {
      id: 'iron', name: 'Iron Ladybug', jp: 'アイロンてんとう', jpLines: ['アイロン', 'てんとう'], rarity: 'uncommon',
      desc: 'Seven spots, one steam setting. Lands on shirts, leaves them neat.',
      fig: F.iron, gimmick: { text: 'Open the wing cases' },
    },
    {
      id: 'toaster', name: 'Toaster Pill Bug', jp: 'トースターだんごむし', jpLines: ['トースター', 'だんごむし'], rarity: 'rare',
      desc: 'Rolls into a ball when startled. The toast does not.',
      fig: F.toaster, gimmick: { text: 'Pop the toast' },
    },
    {
      id: 'terebi', name: 'Television Stag Beetle', jp: 'テレビクワガタ', jpLines: ['テレビ', 'クワガタ'], rarity: 'ultra',
      desc: 'Gets every channel by waving its jaws about. Tonight, it is mostly watching itself.',
      fig: F.terebi, gimmick: { text: 'Work the jaws' },
    },
    {
      id: 'heater', name: 'Heater Firefly', jp: 'ストーブホタル', jpLines: ['ストーブ', 'ホタル'], rarity: 'secret',
      desc: 'Glows all winter. Smells faintly of paraffin and summer evenings.',
      fig: F.heater, gimmick: { text: 'Open the door' },
    },
  ],
};
