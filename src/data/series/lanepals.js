// Lane Pals (ろじのなかま): the back lane's own people as chibi figures, built from their real people specs
// (src/people/presets.js) through the figure kit's chibiPreset (src/figures/chibi.js). 全6種 + シークレット.
import { chibi, chibiPreset, D } from '../../figures/chibi.js';
import { stick, cute, base as plinth } from '../../figures/props.js';

const base = (k, c = 0x6a6a72) => k.cyl([0, 2, 0], 18, 4, { c, t: 'stone', d: [D.txt('ろじ', 0, 0, 2, 0xf2ecd8, { dir: 'f' })] }, { rz: 15 });
const F = {
  tokuzo(k) {
    base(k);
    k.at([0, 4, 0], [0, 0, 0], () => chibiPreset(k, 'gramps', { H: 60, armR: [150, -10, 10], armL: [10, 10, 30], holdR(k) { k.soft([0, 2, 0], [3.4, 3.4, 3.4], { c: 0xe8483a, t: 'gloss', m: 'gloss', d: [D.band('y', -0.4, 0.4, 0xffffff)], top: 0xf6f2ea }, { ch: 0.586 }); }, face: { eye: 'happy', mouth: 'smile' } }));
  },
  mikawa(k) {
    base(k, 0x8a6a4a);
    k.at([0, 4, 0], [0, 0, 0], () => chibiPreset(k, 'grandpa', { H: 60, hair: 'bald', outfit: { kind: 'apron', apron: 0x2a3a6a, logo: D.txt('三河屋', 0, -2, 2.4, 0xf2ecd8) }, top: { c: 0xf2ece0, t: 'cloth' }, sleeve: { c: 0xf2ece0, t: 'cloth' }, hat: { kind: 'band', c: 0xf2ece0, p: { c: 0xf2ece0, t: 'cloth' } },
      head: [12, 0, 0], armL: [20, 10, 40], armR: [20, -10, 40], face: { eye: 'closed', mouth: 'flat', brow: 'thick', browC: 0xd8d4cc }, faceD: [D.rect(-4, -7, 4, -5.6, 0xe2ded6, { r: 0.6 })] }, 4));
  },
  mangaka(k) {
    base(k, 0x4a4a62);
    k.at([0, 4, 0], [0, 0, 0], () => chibiPreset(k, 'rohan', { H: 62, armL: [80, 10, 60], armR: [70, -20, 70], head: [0, 10, 0],
      holdL(k) { k.box([0, -2, 5], [10, 13, 1.2], { c: 0xfbf8f0, t: 'paper', d: [D.path([[-3, 3], [0, 0], [3, 2]], 0.4, 0x2a1c1c, { dir: 'b' })] }, { ch: 0.1, rot: [0.4, 0, 0] }); },
      holdR(k) { stick(k, [0, 0, 0], [0, 3, 6], 0.7, { c: 0x2a2a30, t: 'gloss' }); } }));
  },
  senpai(k) {
    base(k, 0x3a2a24);
    k.at([0, 4, 0], [0, 0, 0], () => chibiPreset(k, 'josuke', { H: 64, hair: 'pomp', armL: [0, 14, 30], armR: [0, -14, 30], legL: [0, 8], legR: [0, 8], face: { eye: 'angry', mouth: 'flat', brow: 'angry' } }));
  },
  scarbrow(k) {
    base(k, 0x5a4a3a);
    k.at([0, 4, 0], [0, 0, 0], () => chibiPreset(k, 'okuyasu', { H: 64, wide: 1.2, armR: [110, -40, 20], armL: [20, 20, 40], face: { eye: 'dot', mouth: 'open', brow: 'thick' }, faceD: [D.line(-9, 5, -5, 1, 0.6, 0xc87a6a), D.line(-8.6, 3.4, -6.4, 3.6, 0.4, 0xc87a6a)] }));
  },
  gyaru(k) {
    base(k, 0xd86a9a);
    k.at([0, 4, 0], [0, 0, 0], () => chibiPreset(k, 'gyaru', { H: 60, armR: [120, -30, 60], armL: [10, 20, 60], legL: [0, 6], legR: [10, 0], face: { eye: 'wink', mouth: 'open', lash: true }, shoes: 0xf2ecd8, sole: 0xd8d0c0,
      holdR(k) { k.box([0, -1, 2], [3, 1, 5], { c: 0xf2a0c8, t: 'gloss', d: [D.star(0, 0, 1, 0xffffff, { dir: 't' })] }, { ch: 0.4 }); } }, 3));
  },
  yabuki(k) {
    base(k, 0x4a5a3a);
    // a bush with a man in it: leafy clusters, two eyes, boots poking out
    k.mirror(() => k.box([5, 4, 3], [7, 5, 10], { c: 0x3a2a20, t: 'gloss' }, { ch: 0.4 }));
    for (const [x, y, z, r] of [[0, 18, 0, 15], [-10, 30, -2, 11], [9, 32, 0, 12], [0, 44, -2, 11], [-12, 16, 4, 9], [12, 18, 4, 9]]) k.soft([x, y, z], [r, r * 0.9, r * 0.85], { c: 0x4a8a3a, t: 'fur', k: 1, d: [D.dots(3, 0.9, 0x6aa84a, { dir: '*' }), D.dots(4, 0.7, 0x2f6a28, { dir: '*' })] }, { ch: 0.586, bev: 0.4, bs: 0.65 });
    k.box([0, 34, 12], [12, 4, 2], { c: 0x2a3a20, d: [D.ell(-3, 0, 1.6, 1.1, 0xffffff), D.ell(3, 0, 1.6, 1.1, 0xffffff), D.circ(-2.6, 0, 0.7, 0x1a1a1a), D.circ(3.4, 0, 0.7, 0x1a1a1a)] }, { ch: 0.4 });
    k.box([0, 52, 0], [10, 4, 9], { c: 0x5a6238, t: 'cloth' }, { ch: 0.4 });
  },
};

export default {
  id: 'lanepals',
  order: 12,
  name: 'Lane Pals',
  jp: 'ろじのなかま',
  romaji: 'ROJI NO NAKAMA',
  tagline: 'Everyone you know, two heads tall',
  taglineJp: 'みんな、ちいさくなっちゃった。',
  price: 200,
  themes: ['city', 'retro', 'cute'],
  card: { bg: '#f2e6cc', accent: '#c8502e', text: '#2e2a30', accent2: '#3f7a6a', pattern: 'dots' },
  capsule: { colors: [0xe8483a, 0x3f7a6a, 0xf2c84a, 0x8fbcd2], style: 'clear' },
  flyer: {
    maker: 'mogura', scene: 'lane', hero: 'tokuzo', side: ['senpai', 'gyaru'],
    title: [['ろじの', 2, 'b'], ['なかま', 4, 'a']],
    catch: 'みんな、ちいさくなっちゃった。', sub: 'あの路地のひとたち', gimmick: 'うでが動く！',
  },
  items: [
    {
      id: 'tokuzo', name: 'Grandpa Tokuzō', jp: 'とくぞうじいちゃん', jpLines: ['とくぞう', 'じい', 'ちゃん'], rarity: 'common',
      desc: 'Ran the garage since 1958. Still checks every capsule by hand.',
      fig: F.tokuzo, gimmick: { text: 'Hold up the capsule' },
    },
    {
      id: 'mikawa', name: 'Old Man Mikawa', jp: '三河屋のじいさん', jpLines: ['三河屋の', 'じいさん'], rarity: 'common',
      desc: 'Has stood behind that counter longer than the counter has.',
      fig: F.mikawa, gimmick: { text: 'Nod' },
    },
    {
      id: 'sensei', name: 'The Sketchbook Sensei', jp: 'スケッチ先生', jpLines: ['スケッチ', '先生'], rarity: 'uncommon',
      desc: 'Drawing you right now. Do not move. Do not ask to see it.',
      fig: F.mangaka, gimmick: { text: 'Draw a line' },
    },
    {
      id: 'senpai', name: 'Pompadour Senpai', jp: 'リーゼント先輩', jpLines: ['リーゼ', 'ント', '先輩'], rarity: 'uncommon',
      desc: 'Say one word about the hair. Go on.',
      fig: F.senpai, gimmick: { text: 'Punch' },
    },
    {
      id: 'scarbrow', name: 'Scar-Brow', jp: 'きずまゆ', rarity: 'rare',
      desc: 'Always hungry. Swipes at the air when he can\'t decide what to eat.',
      fig: F.scarbrow, gimmick: { text: 'Swipe' },
    },
    {
      id: 'gyaru', name: 'The Lane Gyaru', jp: 'ろじギャル', rarity: 'ultra',
      desc: 'Platform soles, loose socks, zero regrets.',
      fig: F.gyaru, gimmick: { text: 'Peace sign' },
    },
    {
      id: 'yabuki', name: 'The Man in the Bush', jp: 'やぶのひと', rarity: 'secret',
      desc: 'You did not see this figure. It is a bush.',
      fig: F.yabuki, gimmick: { text: 'Pop up' },
    },
  ],
};
