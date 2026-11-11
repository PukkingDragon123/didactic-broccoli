// Bukatsu Days (ぶかつデイズ): after-school club activities, 1999: chunky block students mid-action with their gear,
// on a strip of the club's own floor (src/figures). 全6種 + シークレット.
import { chibi, D } from '../../figures/chibi.js';
import { stick, cute } from '../../figures/props.js';

const SAILOR = { top: { c: 0xf4f2ec, t: 'cloth' }, outfit: { kind: 'sailor', collar: 0x24356e }, legs: 'skirt', bottom: { c: 0x24356e, t: 'cloth' }, socks: 0xf4f2ec, shoes: 0x3a2a20 };
const GAKU = { top: { c: 0x1a1a24, t: 'cloth' }, outfit: { kind: 'gakuran' }, sleeve: { c: 0x1a1a24, t: 'cloth' }, bottom: { c: 0x1a1a24, t: 'cloth' }, shoes: 0x2a1a14 };
const JERSEY = (c) => ({ top: { c, t: 'cloth' }, outfit: { kind: 'jersey', c2: 0xf4f2ec }, sleeve: { c, t: 'cloth', d: [D.band('x', 2, 3, 0xf4f2ec)] }, bottom: { c, t: 'cloth', d: [D.band('x', 2.4, 3.4, 0xf4f2ec)] }, shoes: 0xf4f2ec, sole: 0xc8c8d0 });
const floor = (k, c, t = 'wood') => k.box([0, 1.5, 0], [44, 3, 34], { c, t, ga: 'x', d: [D.band('z', -1, 1, 0xf4f2ec, { only: 't' })] }, { ch: 0.2 });
const F = {
  yakyu(k) {
    k.box([0, 1.5, 0], [44, 3, 34], { c: 0xb8865a, t: 'clay', top: 0xc8966a }, { ch: 0.2 });
    k.box([0, 3.2, 8], [6, 0.6, 6], { c: 0xf6f6f2 }, { ch: 0.2, rot: [0, 0.78, 0] });
    k.at([0, 3, 0], [0, -0.4, 0], () => chibi(k, { H: 56, hair: 'buzz', face: { eye: 'angry', mouth: 'grin', brow: 'thick' }, top: { c: 0xf6f6f2, t: 'cloth', d: [D.txt('ROJI', 0, 1, 3, 0x2a3a8a)] }, outfit: { kind: 'shirt', bc: 0x2a3a8a }, sleeve: { c: 0xf6f6f2, t: 'cloth' }, bottom: { c: 0xf6f6f2, t: 'cloth', d: [D.band('x', 3, 4, 0x2a3a8a)] }, socks: 0x2a3a8a, shoes: 0x1a1a1e,
      hat: { kind: 'cap', c: 0x2a3a8a, p: { c: 0x2a3a8a, t: 'cloth', d: [D.txt('R', 0, 0, 3, 0xffffff)] } }, armL: [120, 40, 60], armR: [130, -10, 70], legL: [-20, 12], legR: [30, 6], lean: -6,
      holdR(k) { stick(k, [0, 0, 0], [0, 4, -22], 2, { c: 0xd8b878, t: 'wood' }); } }));
  },
  bando(k) {
    floor(k, 0x8a5a32);
    k.at([0, 3, 0], [0, 0.2, 0], () => chibi(k, { H: 56, hair: 'long', hairC: 0x2a1c1c, face: { eye: 'closed', mouth: 'open', lash: true }, ...SAILOR, armL: [70, 20, 70], armR: [40, -30, 80], head: [-10, 0, 8],
      onBody(k, T) { k.at([0, -1, T.hd + 3], [0, 0, -0.5], () => { k.box([0, -6, 0], [12, 14, 3], { c: 0xc8302a, t: 'lacquer' }, { ch: 0.5, top: [0.7, 1] }); k.box([0, 6, 0], [3, 18, 2], { c: 0x2a1c1c, t: 'wood' }, { ch: 0.3 }); for (let i = 0; i < 6; i++) k.box([-2 + i * 0.8, 0, 1.7], [0.2, 26, 0.2], { c: 0xd8d8de, m: 'metal' }); }); } }));
    k.box([16, 8, -8], [10, 12, 8], { c: 0x2a2a30, t: 'gloss', d: [D.circ(0, 0, 3.6, 0x3a3a44, { dir: 'f' })] }, { ch: 0.2 });
  },
  kendo(k) {
    floor(k, 0xc89a5a);
    k.at([0, 3, 0], [0, 0.3, 0], () => chibi(k, { H: 58, hair: 'bald', headP: { c: 0x2a2a3a, t: 'cloth', d: [D.fn('f', (c, o) => { if (Math.abs(c.y + 1) < 8 && Math.abs(c.x) < 10) { const g = ((Math.floor(c.y * 1.2) & 1) === 0) || Math.abs(c.x) < 0.8; if (g) { o[0] = 200; o[1] = 200; o[2] = 210; } else { o[0] = 40; o[1] = 40; o[2] = 50; } } })] },
      top: { c: 0x2a3a6a, t: 'cloth', d: [D.rect(-8, -4, 8, 6, 0x1a1a24, { dir: 'f' }), D.stripes('y', 2, 0.6, 0x3a3a48, { dir: 'f' })] }, sleeve: { c: 0x2a3a6a, t: 'cloth' }, legs: 'hakama', bottom: { c: 0x2a3a6a, t: 'cloth' }, shoes: 0xe8b890, gloves: { c: 0x2a3a6a, t: 'cloth' },
      armL: [120, 10, 10], armR: [120, -10, 10], legL: [-24, 6], legR: [20, 6], holdL(k) { stick(k, [0, 0, 0], [0, 4, 30], 1.6, { c: 0xe6c88a, t: 'wood', d: [D.band('z', 6, 8, 0xc8302a)] }); } }));
  },
  bijutsu(k) {
    floor(k, 0x9a8a72);
    k.at([10, 3, -6], [0, -0.3, 0], () => { for (const [x, z, r] of [[-5, 4, 0.2], [5, 4, -0.2], [0, -4, 0]]) stick(k, [x, 0, z], [0, 28, 0], 1.2, { c: 0xc8a060, t: 'wood' }); k.box([0, 22, 2], [16, 20, 1.2], { c: 0xfbf8f0, t: 'paper', d: [D.circ(-2, 2, 4, 0xe8a04a), D.rect(-7, -8, 7, -3, 0x6aa83a), D.circ(4, 5, 2, 0x7ab8e8)] }, { ch: 0.1, rot: [-0.15, 0, 0] }); });
    k.at([-10, 3, 4], [0, 0.5, 0], () => chibi(k, { H: 54, hair: 'bob', hairC: 0x3a2420, face: { eye: 'anime', iris: 0x4a3a2a, mouth: 'smile', lash: true }, ...SAILOR, armR: [90, -10, 60], armL: [50, 20, 60],
      holdR(k) { stick(k, [0, 0, 0], [0, 2, 8], 0.7, { c: 0xd8b878 }); k.box([0, 2.2, 8.6], [0.9, 0.9, 1.6], { c: 0xd8302a }, { ch: 0.4 }); }, holdL(k) { k.box([0, -2, 4], [8, 0.8, 6], { c: 0xc8a060, t: 'wood', d: [D.circ(-2, 1, 1, 0xd8302a, { dir: 't' }), D.circ(1, -1, 1, 0x3a8ae8, { dir: 't' }), D.circ(2, 2, 1, 0xf2c23a, { dir: 't' })] }, { ch: 0.4 }); } }));
  },
  rikujo(k) {
    k.box([0, 1.5, 0], [52, 3, 30], { c: 0xb8503a, t: 'clay', d: [D.stripes('z', 10, 0.8, 0xf4f2ec, { dir: 't' })] }, { ch: 0.2 });
    k.at([0, 3, 0], [0, 0.6, 0], () => chibi(k, { H: 56, hair: 'pony', hairC: 0x2a1c1c, face: { eye: 'anime', iris: 0x3a2a1a, mouth: 'open', brow: 'angry' }, ...JERSEY(0x2a7a4a), legs: 'shorts', bottom: { c: 0x1a1a24, t: 'cloth' }, socks: 0xf4f2ec,
      armL: [-60, 10, 80], armR: [80, -10, 80], legL: [60, 6], legR: [-40, 6], lean: 16, onHead(k, H) { k.box([0, H.hy + 3, 0], [H.hw * 2 + 1.6, 2.4, H.hd * 2 + 1.6], { c: 0xc8302a, t: 'cloth' }, { ch: 0.4 }); } }));
    stick(k, [-22, 3, 10], [-22, 14, 10], 1, { c: 0xf4f2ec });
  },
  housou(k) {
    // the broadcast club: a mixing desk, a microphone, a cassette deck and a very serious announcer
    floor(k, 0x6a6a72, 'felt');
    k.box([0, 12, -4], [36, 8, 16], { c: 0xd8d4c8, t: 'gloss', d: [D.fn('t', (c, o) => { const u = ((c.a % 4) + 4) % 4; if (u < 0.8) { o[0] = 40; o[1] = 40; o[2] = 46; } if (Math.abs(((c.a % 4) + 4) % 4 - 0.4) < 0.4 && Math.abs(c.b - Math.sin(c.a) * 3) < 0.8) { o[0] = 230; o[1] = 230; o[2] = 236; } })] }, { ch: 0.2, rot: [0.2, 0, 0] });
    k.box([0, 6, -4], [34, 8, 14], { c: 0x3a3a44, t: 'metal' }, { ch: 0.2 });
    k.at([-6, 3, 10], [0, 0, 0], () => chibi(k, { H: 52, hair: 'short', hairC: 0x2a2220, face: { eye: 'dot', mouth: 'o', brow: 'thick' }, ...GAKU, armL: [70, 10, 70], armR: [70, -10, 80], head: [10, 0, 0],
      onHead(k, H) { k.box([0, H.hy + H.hh + 1, 0], [H.hw * 2 + 3, 1.6, 3], { c: 0x2a2a30, t: 'gloss' }, { ch: 0.4 }); k.mirror(() => k.box([H.hw + 1.2, H.hy, 0], [2.4, 6, 6], { c: 0x2a2a30, t: 'gloss' }, { ch: 0.5 })); } }));
    stick(k, [10, 17, 4], [6, 26, 10], 0.8, { c: 0x2a2a30 }); k.soft([6, 27.6, 10.6], [1.8, 2.2, 1.8], { c: 0x6a6a72, t: 'metal', d: [D.stripes('y', 0.8, 0.3, 0x3a3a44)] }, { ch: 0.586 });
  },
  kitaku(k) {
    // the secret: the Going-Home Club's ace: blazer slung over one shoulder, canned drink, already halfway out
    k.box([0, 1.5, 0], [44, 3, 34], { c: 0x9a9aa0, t: 'stone', d: [D.band('x', -1, 1, 0xf4f2ec)] }, { ch: 0.2 });
    k.at([0, 3, 0], [0, -0.6, 0], () => chibi(k, { H: 58, hair: 'spiky', hairC: 0x6a4a2a, face: { eye: 'line', mouth: 'smile' }, top: { c: 0xf4f2ec, t: 'cloth' }, outfit: { kind: 'shirt', c2: 0xf4f2ec, bc: 0xf4f2ec }, sleeve: { c: 0xf4f2ec }, bottom: { c: 0x3a3a48, t: 'cloth', d: [D.check(2.6, 0x4a4a5a)] }, shoes: 0x2a1a14,
      armR: [170, -10, 120], armL: [30, 10, 60], legL: [30, 4], legR: [-26, 4],
      holdR(k) { k.box([0, 3, -6], [10, 4, 16], { c: 0x2a3a5a, t: 'cloth' }, { ch: 0.4, rot: [0.6, 0, 0] }); }, holdL(k) { k.cyl([0, -1, 2.4], 1.8, 5, { c: 0xd8302a, t: 'tin', d: [D.band('y', -0.6, 0.6, 0xffffff)] }); } }));
    k.box([-16, 18, -10], [12, 6, 1], { c: 0xf2ecd8, d: [D.txt('帰宅部', 0, 0, 3, 0x2a1c1c)] }, { ch: 0.1 });
  },
};

export default {
  id: 'bukatsu', order: 23, name: 'Bukatsu Days', jp: 'ぶかつデイズ', tagline: 'After-school clubs, 1999', taglineJp: '放課後は、ぶかつ！', price: 300,
  themes: ['school', 'retro'], card: { bg: '#e8eef6', accent: '#2a3a8a', text: '#1e2440', pattern: 'dots', accent2: '#c8302a' }, capsule: { colors: [0x2a3a8a, 0xc8302a, 0xf4f2ec, 0x2a7a4a] },
  items: [
    { id: 'yakyu', name: 'Baseball Club', jp: '野球部', rarity: 'common', desc: 'Swings at everything. Hits occasionally. Shaved head, full heart.', fig: F.yakyu },
    { id: 'bando', name: 'Brass Band', jp: '吹奏楽部', rarity: 'common', desc: 'The trombone slide has hit three teachers this term.', fig: F.bando },
    { id: 'kendo', name: 'Kendo Club', jp: '剣道部', rarity: 'common', desc: 'MEN! The shout is louder than the strike. Both are loud.', fig: F.kendo },
    { id: 'bijutsu', name: 'Art Club', jp: '美術部', rarity: 'uncommon', desc: 'Painting the same apple since April. It is a very good apple now.', fig: F.bijutsu },
    { id: 'rikujo', name: 'Track Club', jp: '陸上部', rarity: 'rare', desc: 'Has never once walked down a corridor.', fig: F.rikujo },
    { id: 'housou', name: 'Broadcast Club', jp: '放送部', rarity: 'ultra', desc: 'Lunchtime announcements, in a voice for the evening news.', fig: F.housou },
    { id: 'kitaku', name: 'Going-Home Club', jp: '帰宅部', rarity: 'secret', desc: 'SECRET. Undefeated champion of leaving at the bell.', fig: F.kitaku },
  ],
};
