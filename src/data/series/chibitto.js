// Chibitto Heroes (ちびっとヒーローズ): eight original anime heroes and a secret as chibi figures in the human style
// (src/figures/chibi.js: chamfered blocks, painted anime faces and costumes). 全8種 + シークレット.
import { chibi, D } from '../../figures/chibi.js';
import { stick, cute } from '../../figures/props.js';

const disc = (k, c, word) => k.cyl([0, 2, 0], 17, 4, { c, t: 'gloss', m: 'gloss', d: [D.band('y', 0.6, 1.2, 0xf2c23a), word ? D.txt(word, 0, -0.6, 1.8, 0xffffff, { dir: 'f' }) : null] }, { rz: 14 });
const F = {
  kagero(k) {
    k.box([0, 4, 0], [40, 8, 26], { c: 0x3a3a4a, t: 'stone', d: [D.stripes('x', 5, 1.4, 0x2a2a38, { dir: 't' })] }, { ch: 0.3, top: [0.6, 1] });
    k.at([0, 8, 0], [0, 0.3, 0], () => chibi(k, { H: 58, hair: 'pony', hairC: 0x2a2a3a, face: { eye: 'anime', iris: 0x8a3ad8, mouth: 'none', lash: true },
      headP: null, top: { c: 0x2a2a3a, t: 'cloth', d: [D.band('y', -7, -5, 0xd8302a)] }, sleeve: { c: 0x2a2a3a, t: 'cloth' }, bottom: { c: 0x2a2a3a, t: 'cloth' }, shoes: 0x2a2a3a, sole: 0x1a1a1e, gloves: { c: 0x2a2a3a },
      legL: [80, 20], legR: [40, -10], lean: 30, armL: [40, 30, 60], armR: [-30, -40, 0], faceD: [D.rect(-15, -15, 15, -6, 0x2a2a3a)],
      holdR(k) { k.box([0, -6, 0], [1.4, 12, 3], { c: 0xd8dae0, m: 'metal' }, { ch: 0.2, top: [0.2, 1] }); },
      onBody(k, T) { k.at([0, T.hh, -T.hd], [0.4, 0, 0], () => { k.box([0, 1, 0], [T.hw * 2 + 2, 3, 3], { c: 0xd8302a, t: 'cloth' }, { ch: 0.4 }); k.box([6, -3, -10], [5, 2, 22], { c: 0xd8302a, t: 'cloth' }, { ch: 0.4, rot: [0.4, 0.4, 0] }); }); } }));
  },
  aoi(k) {
    disc(k, 0x2a3a6a, '剣');
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 62, hair: 'pony', hairC: 0x1a1a2a, face: { eye: 'anime', iris: 0x2a5ac8, mouth: 'flat', brow: 'angry', lash: true }, top: { c: 0xf4f2ec, t: 'cloth' }, outfit: { kind: 'kimono', collar: 0x2a3a6a, obi: 0x2a3a6a, obiC: 0xffffff },
      sleeve: { c: 0xf4f2ec, t: 'cloth' }, legs: 'hakama', bottom: { c: 0x2a3a6a, t: 'cloth' }, shoes: 0xf4f2ec, legL: [-20, 14], legR: [20, 10], armL: [110, 10, 30], armR: [110, -10, 30],
      holdL(k) { stick(k, [0, 0, 0], [0, 4, 26], 2, { c: 0xc8a060, t: 'wood' }); }, hat: { kind: 'band', c: 0xf4f2ec, p: { c: 0xf4f2ec, t: 'cloth', d: [D.txt('必勝', 0, 0, 2, 0xd8302a)] } } }));
  },
  goda(k) {
    disc(k, 0x3a2a24, '番');
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 66, hair: 'pomp', hairC: 0x1a1a1e, wide: 1.2, face: { eye: 'dot', mouth: 'flat', brow: 'thick' }, top: { c: 0xf4f2ec, t: 'cloth' }, outfit: { kind: 'tee' }, sleeve: { c: 0x1a1a24, t: 'cloth' }, bottom: { c: 0x1a1a24, t: 'cloth' }, shoes: 0x1a1a1e,
      armL: [0, 20, 20], armR: [0, -20, 20], legL: [0, 10], legR: [0, 10],
      onBody(k, T) { k.box([0, 1, -T.hd - 1], [T.hw * 2 + 6, T.hh * 2 + 4, 2], { c: 0x1a1a24, t: 'cloth', d: [D.txt('喧嘩上等', 0, 0, 2.6, 0xe8c040, { dir: 'b', vert: true })] }, { ch: 0.3, top: [1.2, 1] }); k.mirror(() => k.box([T.hw + 2.4, T.hh - 1, 0], [3, 4, T.hd * 2 + 2], { c: 0x1a1a24, t: 'cloth' }, { ch: 0.4 })); },
      onHead(k, H) { k.box([3, H.hy - 9, H.hd + 2], [6, 0.6, 2], { c: 0x4a9a2a }, { ch: 0.3, rot: [0, 0.3, 0.2] }); } }));
  },
  sayo(k) {
    disc(k, 0xd8302a, '祓');
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 60, hair: 'hime', hairC: 0x1a1414, face: { eye: 'anime', iris: 0x8a2a2a, mouth: 'smile', lash: true }, top: { c: 0xfbfaf4, t: 'cloth' }, outfit: { kind: 'kimono', collar: 0xd8302a, obi: 0xd8302a, obiC: 0xd8302a },
      sleeve: { c: 0xfbfaf4, t: 'cloth' }, legs: 'hakama', bottom: { c: 0xd8302a, t: 'cloth' }, shoes: 0xfbfaf4, armR: [90, -6, 0], armL: [30, 10, 50],
      holdR(k) { k.box([0, -6, 1], [6, 12, 0.6], { c: 0xfbf2d8, t: 'paper', d: [D.txt('封', 0, 1, 4, 0xd8302a), D.rect(-2.4, -5, 2.4, -2, 0xd8302a)] }, { ch: 0 }); },
      onHead(k, H) { k.box([0, H.hy + 4, -H.hd - 2], [6, 3, 3], { c: 0xd8302a, t: 'cloth' }, { ch: 0.4 }); } }));
  },
  kei(k) {
    disc(k, 0x5a4a3a, '探');
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 62, hair: 'short', hairC: 0x6a4a3a, face: { eye: 'anime', iris: 0x3a8a6a, mouth: 'smile' }, top: { c: 0xc8a868, t: 'cloth' }, outfit: { kind: 'suit', tie: 0x2a5a4a, c2: 0xf4f2ec }, sleeve: { c: 0xc8a868, t: 'cloth' }, bottom: { c: 0x6a5a4a, t: 'cloth' }, shoes: 0x3a2a20,
      armR: [100, -10, 70], armL: [10, 10, 30], head: [0, -10, 0], hat: { kind: 'cap', c: 0x8a6a4a, p: { c: 0x8a6a4a, t: 'cloth', d: [D.check(2, 0x7a5a3a)] } },
      onBody(k, T) { k.prism([[-T.hh - 9, T.hw * 1.4, T.hd * 1.5, 0, 0, 0.4], [T.hh, T.hw * 1.04, T.hd * 1.06, 0, 0, 0.4]], { c: 0xc8a868, t: 'cloth', d: [D.buttons(3, 2, -10, 3, 0.7, 0x5a3a24)] }, { caps: 'top' }); },
      onHead(k, H) { k.box([0, H.hy - 1, H.hd + 1.6], [H.hw * 1.9, 4.4, 1], { c: 0x5ad8e8, m: 'glass', t: 'glass', d: [D.line(-12, 1.6, 12, 1.6, 0.4, 0xffffff)] }, { ch: 0.3 }); } }));
  },
  ren(k) {
    disc(k, 0x2a5ac8, 'R');
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 62, hair: 'spiky', hairC: 0x2a4a8a, face: { eye: 'anime', iris: 0xe8802a, mouth: 'grin' }, top: { c: 0xf4f2ec, t: 'gloss', m: 'gloss', d: [D.band('x', -2, 2, 0xe8402a), D.rect(-7, 2, -3, 5, 0x2a5ac8)] }, sleeve: { c: 0xf4f2ec, t: 'gloss', d: [D.band('y', -6, -4, 0x2a5ac8)] }, bottom: { c: 0xf4f2ec, t: 'gloss' },
      gloves: { c: 0x2a5ac8, t: 'gloss' }, shoes: 0x2a5ac8, sole: 0x1a1a1e, armL: [50, 30, 80], armR: [30, -20, 0], legL: [0, 8], legR: [0, 8],
      holdL(k) { k.soft([0, -5, 7], [7, 7, 7], { c: 0xf4f2ec, t: 'gloss', m: 'gloss', d: [D.rect(-5, -2, 5, 3, 0xe8a02a, { dir: 'f' }), D.band('x', -1, 1, 0xe8402a)] }, { ch: 0.4, bev: 0.3 }); } }));
  },
  mimi(k) {
    disc(k, 0xf06aa8, '♪');
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 60, hair: 'twin', hairC: 0xf2a0c8, face: { eye: 'sparkle', iris: 0xe8509a, mouth: 'open', lash: true }, top: { c: 0xf6f2fa, t: 'cloth', d: [D.heart(0, 2, 2.6, 0xf06aa8)] }, outfit: { kind: 'sailor', collar: 0xf06aa8, scarf: 0x6ad8f0 },
      sleeve: { c: 0xf6f2fa, t: 'cloth' }, legs: 'skirt', bottom: { c: 0xf06aa8, t: 'cloth', d: [D.stripes('y', 2, 0.6, 0xffffff)] }, socks: 0xffffff, shoes: 0xf06aa8, armR: [150, -30, 0], armL: [60, 20, 70], legL: [0, 4], legR: [20, 4], head: [0, 0, -10],
      holdL(k) { k.box([0, -2, 3], [2, 6, 2], { c: 0x2a2a30, t: 'gloss' }, { ch: 0.3 }); k.soft([0, 2, 3], [2, 2, 2], { c: 0xd8dae0, m: 'metal' }, { ch: 0.586 }); } }));
    for (const [x, y] of [[-18, 50], [18, 56]]) k.box([x, y, -2], [4, 4, 0.6], { c: 0xf6d84a, m: 'glow', d: [D.txt('♪', 0, 0, 3, 0xf06aa8)] }, { ch: 0 });
  },
  kirara(k) {
    disc(k, 0x8a5ad8, '★');
    k.at([0, 4, 0], [0, 0, 0], () => chibi(k, { H: 62, hair: 'long', hairC: 0xf6d84a, face: { eye: 'sparkle', iris: 0x8a5ad8, mouth: 'open', lash: true }, top: { c: 0xf6f2fa, t: 'cloth', d: [D.star(0, 2, 3, 0xf6d84a)] }, outfit: { kind: 'sailor', collar: 0x8a5ad8, scarf: 0xf06aa8 },
      sleeve: { c: 0xf6f2fa, t: 'cloth' }, legs: 'skirt', bottom: { c: 0x8a5ad8, t: 'cloth' }, socks: 0xffffff, shoes: 0xf6d84a, armR: [170, -20, 0], armL: [80, 40, 20],
      holdR(k) { stick(k, [0, 0, 0], [0, 12, 0], 1, { c: 0xf6f2fa, t: 'gloss' }); k.box([0, 15, 0], [8, 8, 2], { c: 0xf6d84a, t: 'gloss', d: [D.star(0, 0, 3.6, 0xfff6c0)] }, { ch: 0.4, rot: [0, 0, 0.6] }); } }));
    for (let i = 0; i < 7; i++) { const a = i * 0.9; k.box([Math.cos(a) * 18, 10 + i * 7, Math.sin(a) * 14], [8, 2, 1], { c: [0xf06aa8, 0x6ad8f0, 0xf6d84a][i % 3], t: 'gloss' }, { ch: 0.4, rot: [0, -a, 0.3] }); }
  },
  puchi(k) {
    // the secret: a tiny demon lord on a capsule throne, enormous cape
    k.soft([0, 10, 0], [14, 10, 14], { c: 0x2a1a3a, t: 'gloss', m: 'gloss', top: 0x8a3ad8 }, { flat: true, ch: 0.586, bev: 0.5 });
    k.at([0, 16, 0], [0, 0, 0], () => chibi(k, { H: 46, skin: 0xe8d0f0, hair: 'spiky', hairC: 0x6a2a8a, face: { eye: 'anime', iris: 0xe8302a, mouth: 'fang', brow: 'angry' }, top: { c: 0x2a1a3a, t: 'cloth', d: [D.buttons(0, 3, -3, 2, 0.6, 0xe8c040)] }, sleeve: { c: 0x2a1a3a, t: 'cloth' }, bottom: { c: 0x2a1a3a, t: 'cloth' }, shoes: 0x1a1a1e,
      sit: true, legL: [80, 14], legR: [80, -14], armL: [20, 40, 40], armR: [120, -10, 40],
      onBody(k, T) { k.box([0, -2, -T.hd - 2], [T.hw * 3.4, T.hh * 3, 1.6], { c: 0x6a1a2a, t: 'cloth', d: [D.band('x', -30, 30, 0x6a1a2a), D.rect(-14, -12, 14, 12, 0x8a2a3a, { dir: 'f' })] }, { ch: 0.2, top: [0.6, 1] }); k.box([0, T.hh + 1.4, -1], [T.hw * 2.8, 3, T.hd * 2 + 3], { c: 0xe8302a, t: 'cloth' }, { ch: 0.4 }); },
      onHead(k, H) { k.mirror(() => k.box([H.hw * 0.6, H.hy + H.hh + 3, 0], [3, 8, 3], { c: 0xf2e6c8, t: 'gloss' }, { ch: 0.4, top: [0.3, 0.3], rot: [0, 0, -0.4] })); } }));
  },
};

export default {
  id: 'chibitto',
  order: 15,
  name: 'Chibitto Heroes',
  jp: 'ちびっとヒーローズ',
  romaji: 'CHIBITTO HEROES',
  tagline: 'Small heroes, big entrances',
  taglineJp: 'ちいさくても、主人公。',
  price: 300,
  themes: ['city', 'cute', 'weird'],
  card: { bg: '#2e2a52', accent: '#f06aa0', text: '#fdf6ec', accent2: '#46c0c0', pattern: 'stars' },
  capsule: { colors: [0xf06aa0, 0x46c0c0, 0xf6cc4a, 0x6a4aa8], style: 'clear' },
  flyer: {
    maker: 'hoshimaru', scene: 'dusk', hero: 'kirara', side: ['ren', 'kagero'],
    title: [['ちびっと', 2, 'b'], ['ヒーローズ', 2, 'a']],
    catch: 'ちいさくても、主人公。', sub: '変身・抜刀・出撃！', gimmick: 'ポーズが決まる！',
  },
  items: [
    {
      id: 'kagero', name: 'Kagerō the Kunoichi', jp: 'くノ一かげろう', jpLines: ['くノ一', 'かげ', 'ろう'], rarity: 'common',
      desc: 'Crouched on the ridge since dusk. Her scarf gives her away every time.',
      fig: F.kagero, gimmick: { text: 'Flip the scarf' },
    },
    {
      id: 'aoi', name: 'Aoi of the Sword School', jp: '剣術少女あおい', jpLines: ['剣術', '少女', 'あおい'], rarity: 'common',
      desc: 'Oak bokken, first form, no mercy for the practice post.',
      fig: F.aoi, gimmick: { text: 'Draw the sword' },
    },
    {
      id: 'goda', name: 'Banchō Gōda', jp: 'ゴーダ番長', jpLines: ['ゴーダ', '番長'], rarity: 'common',
      desc: 'Coat on the shoulders, never through the sleeves. A leaf, for some reason.',
      fig: F.goda, gimmick: { text: 'Flip the coat' },
    },
    {
      id: 'sayo', name: 'Sayo the Shrine Maiden', jp: 'みこのさよ', jpLines: ['みこの', 'さよ'], rarity: 'uncommon',
      desc: 'One sealing charm, held out at arm\'s length. Bad spirits, form an orderly queue.',
      fig: F.sayo, gimmick: { text: 'Hold out the charm' },
    },
    {
      id: 'kei', name: 'Detective Kei', jp: '探偵ケイ', jpLines: ['探偵', 'ケイ'], rarity: 'uncommon',
      desc: 'The visor sees everything. The coat is for drama.',
      fig: F.kei, gimmick: { text: 'Lift the visor' },
    },
    {
      id: 'ren', name: 'Pilot Ren', jp: 'パイロット・レン', jpLines: ['パイ', 'ロット', 'レン'], rarity: 'rare',
      desc: 'Back from the sortie, helmet under one arm. Has not explained the robot.',
      fig: F.ren, gimmick: { text: 'Open the helmet visor' },
    },
    {
      id: 'mimi', name: 'Mimi the Idol', jp: 'アイドルみみ', jpLines: ['アイ', 'ドル', 'みみ'], rarity: 'rare',
      desc: 'Second chorus, last note, everybody point!',
      fig: F.mimi, gimmick: { text: 'Point' },
    },
    {
      id: 'kirara', name: 'Starfall Kirara', jp: '星降りきらら', jpLines: ['星降り', 'きらら'], rarity: 'ultra',
      desc: 'Caught halfway through the transformation. The ribbons are still deciding.',
      fig: F.kirara, gimmick: { text: 'Swing the wand' },
    },
    {
      id: 'puchi', name: 'Demon Lord Puchi', jp: '魔王プチ', rarity: 'secret',
      desc: 'Rules the underworld from a capsule. Very proud of the cape.',
      fig: F.puchi, gimmick: { text: 'Flip the cape' },
    },
  ],
};
