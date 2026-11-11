// Ōzumō Heya (おおずもう部屋): a sumo stable's daily life as chunky block figures: mawashi silk, oiled topknots,
// salt, the dohyō's straw ring. Painted cloth, skin and clay (src/figures). 全6種 + シークレット.
import { chibi, D } from '../../figures/chibi.js';
import { stick, bowl, cute } from '../../figures/props.js';

const SKIN = 0xe8b890;
const dohyo = (k) => { k.box([0, 3, 0], [50, 6, 44], { c: 0xc8a070, t: 'clay', top: 0xd8b080 }, { ch: 0.2, top: [0.9, 0.9] }); for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; k.box([Math.cos(a) * 16, 6.6, Math.sin(a) * 14], [5.4, 1.6, 2.4], { c: 0xc8b878, t: 'tatami' }, { ch: 0.5, rot: [0, -a + Math.PI / 2, 0] }); } };
const rikishi = (k, o = {}) => chibi(k, { H: 58, wide: 1.45, skin: SKIN, hair: 'bun', hairC: 0x1a1414, face: { eye: 'dot', mouth: 'flat', brow: 'thick', ...(o.face || {}) },
  top: { c: SKIN, t: 'vinyl', d: [D.ell(0, -3, 7, 5, 0xf0c8a0, { dir: 'f' }), D.arc(0, 2, 6, 3, Math.PI + 0.5, 2 * Math.PI - 0.5, 0.4, 0xc89878)] }, sleeve: { c: SKIN }, gloves: { c: SKIN }, shoes: SKIN, sole: 0xd8a880,
  legs: 'shorts', bottom: { c: o.belt ?? 0x2a2a5a, t: 'cloth', d: [D.stripes('y', 2, 0.4, 0x1a1a3a)] }, legK: 0.9, ...o,
  onBody(k, T) { k.box([0, -T.hh + 1, 0], [T.hw * 2 + 2.6, 4, T.hd * 2 + 2.6], { c: o.belt ?? 0x2a2a5a, t: 'cloth', d: [D.stripes('x', 2, 0.4, 0x1a1a3a)] }, { ch: 0.4 }); if (o.sagari !== false) for (let i = -3; i <= 3; i++) k.box([i * 2.4, -T.hh - 4, T.hd + 1.6], [0.9, 8, 0.9], { c: o.belt ?? 0x2a2a5a, t: 'cloth' }, { ch: 0.3 }); if (o.onBody) o.onBody(k, T); } });
const F = {
  shiko(k) { dohyo(k); k.at([0, 6, 0], [0, 0, 0], () => rikishi(k, { legL: [-10, 70], legR: [0, 4], armL: [20, 70, 10], armR: [10, -30, 0], lean: -6, head: [0, 0, 8], face: { eye: 'angry', mouth: 'flat', brow: 'angry' } })); },
  shio(k) {
    dohyo(k);
    k.at([0, 6, 0], [0, 0, 0], () => rikishi(k, { belt: 0x7a2a2a, armR: [160, -30, 0], armL: [30, 20, 60], face: { eye: 'dot', mouth: 'smile', brow: 'thick' }, holdL(k) { k.soft([0, -2, 3], [2.6, 2, 2.6], { c: 0xf6f6f2, t: 'foam' }, { ch: 0.586 }); } }));
    for (let i = 0; i < 10; i++) k.box([-4 + (i * 1.3) % 6, 50 + (i % 4) * 3, 4 + (i % 3)], [0.9, 0.9, 0.9], { c: 0xffffff }, { ch: 0 });
  },
  chanko(k) {
    k.box([0, 2, 0], [54, 4, 40], { c: 0xc8b070, t: 'tatami' }, { ch: 0.1 });
    k.cyl([8, 6, 8], 8, 4, { c: 0x6a6a72, t: 'metal' }); bowl(k, [8, 8, 8], 12, 9, { c: 0x5a4a3e, t: 'clay' }, { c: 0xd89a5a, t: 'water', d: [D.dots(3, 1, 0xf6f2e6, { dir: 't' }), D.dots(4, 0.9, 0x6aa83a, { dir: 't' })] });
    k.at([-10, 4, -4], [0, 0.4, 0], () => rikishi(k, { sit: true, sagari: false, top: { c: 0x2a3a6a, t: 'cloth', d: [D.stripes('x', 3, 1, 0xf4f0e8)] }, outfit: { kind: 'kimono', collar: 0xf4f0e8, obi: 0x6a5a3a }, sleeve: { c: 0x2a3a6a, t: 'cloth' }, legL: [85, 20], legR: [85, -20], armL: [60, 10, 60], armR: [60, -10, 60], face: { eye: 'happy', mouth: 'open' },
      holdR(k) { stick(k, [0, 0, 0], [0, 3, 10], 0.7, { c: 0xc8a060 }); stick(k, [1, 0, 0], [1, 3, 10], 0.7, { c: 0xc8a060 }); } }));
  },
  gyoji(k) {
    dohyo(k);
    k.at([0, 6, 0], [0, 0, 0], () => chibi(k, { H: 54, hair: 'short', hairC: 0x2a2220, face: { eye: 'angry', mouth: 'open', brow: 'thick' }, top: { c: 0x8a3ab8, t: 'cloth', d: [D.dots(5, 1.2, 0xe8c040, { dir: '*' })] }, outfit: { kind: 'kimono', collar: 0xf4f0e8, obi: 0xe8c040 },
      sleeve: { c: 0x8a3ab8, t: 'cloth', d: [D.dots(5, 1.2, 0xe8c040, { dir: '*' })] }, legs: 'hakama', bottom: { c: 0x8a3ab8, t: 'cloth' }, shoes: 0xf4f0e8, hat: { kind: 'witch', c: 0x1a1a24, p: { c: 0x1a1a24, t: 'lacquer' } }, armR: [110, -40, 20], armL: [10, 10, 30],
      holdR(k) { stick(k, [0, 0, 0], [0, 3, 4], 1.2, { c: 0x2a2a30, t: 'lacquer' }); k.box([0, 3, 9], [10, 8, 1], { c: 0x2a2a30, t: 'lacquer', d: [D.txt('軍配', 0, 0, 3, 0xe8c040)] }, { ch: 0.5 }); } }));
  },
  dohyoiri(k) {
    k.box([0, 3, 0], [50, 6, 40], { c: 0xc8a070, t: 'clay' }, { ch: 0.2 });
    k.at([0, 6, 0], [0, 0, 0], () => rikishi(k, { belt: 0x8a1a2a, armL: [0, 80, 0], armR: [20, -20, 30], legL: [0, 16], legR: [0, 16], face: { eye: 'dot', mouth: 'flat', brow: 'thick' },
      onBody(k, T) { k.box([0, -T.hh - 7, T.hd + 1.6], [T.hw * 2.2, 14, 1.4], { c: 0xe8c040, t: 'cloth', d: [D.txt('龍', 0, 0, 7, 0x8a1a2a), D.band('y', -7, -5, 0x8a1a2a)] }, { ch: 0.3 }); k.box([0, -T.hh + 4, 0], [T.hw * 2 + 4, 3, T.hd * 2 + 4], { c: 0xf6f2e6, t: 'cloth', d: [D.stripes('x', 2.4, 1, 0xd8d4c8)] }, { ch: 0.5 }); } }));
  },
  yokozuna(k) {
    k.box([0, 2, 0], [54, 4, 40], { c: 0x2a2a30, t: 'lacquer' }, { ch: 0.15 });
    k.at([0, 4, 0], [0, 0, 0], () => rikishi(k, { belt: 0xf6f2e6, armL: [80, 70, 30], armR: [80, -70, 30], legL: [0, 22], legR: [0, 22], face: { eye: 'angry', mouth: 'flat', brow: 'angry' },
      onBody(k, T) { k.box([0, -T.hh + 4, 0], [T.hw * 2 + 6, 5, T.hd * 2 + 6], { c: 0xf6f2e6, t: 'cloth', d: [D.stripes('x', 3, 1.2, 0xd8d4c8)] }, { ch: 0.5 }); for (const x of [-6, 0, 6]) k.box([x, -T.hh - 2, T.hd + 4], [3, 7, 0.6], { c: 0xffffff, t: 'paper', d: [D.stripes('y', 2, 0.6, 0xd8d8d8)] }, { ch: 0 }); } }));
  },
  oyakata(k) {
    // the secret: the stable master in a dark kimono, fan, sitting cross-legged on a zabuton, a framed scroll behind
    k.box([0, 2, 0], [50, 4, 40], { c: 0xc8b070, t: 'tatami' }, { ch: 0.1 });
    k.box([0, 30, -16], [26, 40, 1.4], { c: 0xf2ecd8, t: 'paper', d: [D.txt('心技体', 0, 2, 7, 0x2a1c1c, { vert: true })] }, { ch: 0.1 });
    k.box([0, 5, 2], [24, 3, 24], { c: 0x6a2a4a, t: 'cloth' }, { ch: 0.45 });
    k.at([0, 6.4, 2], [0, 0, 0], () => rikishi(k, { sit: true, sagari: false, belt: 0x1a1a24, top: { c: 0x1a1a24, t: 'cloth' }, outfit: { kind: 'kimono', collar: 0x6a6a72, obi: 0x6a5a3a }, sleeve: { c: 0x1a1a24 }, legL: [85, 30], legR: [85, -30], hairC: 0x8a8a92, face: { eye: 'closed', mouth: 'flat', brow: 'thick', browC: 0xd8d8de }, armR: [70, -20, 70], holdR(k) { k.box([0, 0, 4], [8, 6, 0.6], { c: 0xf2ecd8, t: 'paper', d: [D.stripes('x', 1.4, 0.4, 0x8a6a3a)] }, { ch: 0, rot: [0, 0, 0.4] }); } }));
  },
};

export default {
  id: 'sumo', order: 22, name: 'Ōzumō Heya', jp: 'おおずもう部屋', tagline: 'A sumo stable, morning practice to chanko', taglineJp: 'はっけよい、のこった！', price: 400,
  themes: ['retro', 'japan'], card: { bg: '#f2e6cc', accent: '#8a1a2a', text: '#2a1c1c', pattern: 'stripes', accent2: '#c8a070' }, capsule: { colors: [0x8a1a2a, 0xc8a070, 0x2a2a5a, 0xf6f2e6] },
  items: [
    { id: 'shiko', name: 'Shiko Stomp', jp: '四股', rarity: 'common', desc: 'Leg up to the sky, down with a thud. The whole street feels it.', fig: F.shiko },
    { id: 'shio', name: 'Salt Throw', jp: '塩まき', rarity: 'common', desc: 'A big handful of salt to purify the ring. A bigger handful for luck.', fig: F.shio },
    { id: 'chanko', name: 'Chanko Time', jp: 'ちゃんこ', rarity: 'common', desc: 'Practice ends, the pot comes out. Seconds are compulsory.', fig: F.chanko },
    { id: 'gyoji', name: 'The Referee', jp: '行司', rarity: 'uncommon', desc: 'Silk robes, a lacquered fan and a voice that reaches the back row.', fig: F.gyoji },
    { id: 'dohyoiri', name: 'Ring Entrance', jp: '土俵入り', rarity: 'rare', desc: 'The apron alone weighs more than a schoolchild.', fig: F.dohyoiri },
    { id: 'yokozuna', name: 'Yokozuna', jp: '横綱', rarity: 'ultra', desc: 'The white rope, the folded paper, the stance. Nobody breathes.', fig: F.yokozuna },
    { id: 'oyakata', name: 'The Stable Master', jp: '親方', rarity: 'secret', desc: 'SECRET. Retired champion. Still corrects your stance from across the room with one eyebrow.', fig: F.oyakata },
  ],
};
