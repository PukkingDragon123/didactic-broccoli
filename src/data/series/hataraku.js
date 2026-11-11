// Hataraku Machi (はたらくまち): the people who keep the 1999 shopping street running, at work with their gear, as
// chunky painted block figures on their own patch of street (src/figures). 全6種 + シークレット.
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, bowl, lantern, cute, sign } from '../../figures/props.js';

const street = (k, w = 48, d = 34) => k.box([0, 1.5, 0], [w, 3, d], { c: 0x7a7a80, t: 'stone', d: [D.band('z', 12, 13.4, 0xf2ecd8, { only: 't' })] }, { ch: 0.15 });
const wheel = (k, pos, r = 6) => { k.cyl(pos, r, 1.6, { c: 0x2a2a30, t: 'gloss', d: [D.ring(0, 0, r * 0.75, 0.5, 0xc8c8d0, { dir: 't' }), D.ring(0, 0, r * 0.75, 0.5, 0xc8c8d0, { dir: 'u' })] }, { rot: [0, 0, Math.PI / 2] }); };
const F = {
  yubin(k) {
    street(k);
    k.at([12, 3, -4], [0, 0, 0], () => { k.box([0, 14, 0], [10, 28, 10], { c: 0xc8302a, t: 'gloss', m: 'gloss', d: [D.rect(-3, 4, 3, 6, 0x2a1a1a, { dir: 'f' }), D.txt('〒', 0, -2, 4, 0xffffff)] }, { ch: 0.2 }); k.box([0, 29, 0], [12, 3, 12], { c: 0xc8302a, t: 'gloss' }, { ch: 0.4, top: [0.8, 0.8] }); });
    k.at([-8, 3, 2], [0, 0.3, 0], () => chibi(k, { H: 54, hair: 'short', face: { eye: 'dot', mouth: 'smile' }, top: { c: 0x3a4a6a, t: 'cloth' }, outfit: { kind: 'shirt', c2: 0x3a4a6a, bc: 0xd8b040 }, sleeve: { c: 0x3a4a6a }, bottom: { c: 0x3a4a6a }, shoes: 0x1a1a1e, hat: { kind: 'station', c: 0x3a4a6a },
      armL: [60, 10, 60], onBody(k, T) { k.box([T.hw + 2, -T.hh + 2, 2], [4, 10, 12], { c: 0x6a4a2a, t: 'crust', c2: 0x4a3020 }, { ch: 0.3 }); }, holdL(k) { k.box([0, -1, 3], [6, 0.6, 4], { c: 0xfbf8f0, t: 'paper', d: [D.rect(-1, -1, 1, 0.4, 0xc8302a, { dir: 't' })] }, { ch: 0 }); } }));
  },
  demae(k) {
    street(k);
    k.at([0, 3, 0], [0, 0.4, 0], () => {
      wheel(k, [-3, 6, 12]); wheel(k, [-3, 6, -12]);
      k.box([-3, 10, 0], [3, 3, 24], { c: 0x6a8ac8, t: 'gloss', m: 'gloss' }, { ch: 0.3 });
      k.box([-3, 14, -10], [8, 4, 8], { c: 0x2a2a30, t: 'cloth' }, { ch: 0.4 });
      k.box([-3, 13, 12], [10, 2, 3], { c: 0xc8c8d0, m: 'metal' }, { ch: 0.3 });
      k.at([-3, 12, -2], [0, 0, 0], () => chibi(k, { H: 40, sit: true, hair: 'buzz', face: { eye: 'angry', mouth: 'grin' }, top: { c: 0xf4f0e8, t: 'cloth' }, outfit: { kind: 'apron', apron: 0x2a3a6a, logo: D.txt('来来', 0, -2, 2, 0xf4f0e8) }, hat: { kind: 'band', c: 0x2a3a6a, p: { c: 0x2a3a6a } }, armL: [60, 20, 20], armR: [150, -10, 30], legL: [60, 20], legR: [60, -20],
        holdR(k) { for (let i = 0; i < 3; i++) bowl(k, [0, 2 + i * 4, 0], 4, 3.4, { c: 0xc8302a, t: 'ceramic' }, { c: 0xd89a5a, t: 'water' }); } }));
    });
  },
  koban(k) {
    street(k, 52, 38);
    k.box([0, 18, -8], [28, 30, 18], { c: 0xe8e2d4, t: 'paper', d: [D.rect(-6, -15, 6, 4, 0x6a5a4a, { dir: 'f' }), D.rect(-12, 0, -8, 6, 0xbde4f0, { dir: 'f' })] }, { ch: 0.1 });
    k.box([0, 35, -8], [32, 4, 22], { c: 0x6a6a72, t: 'metal' }, { ch: 0.2 });
    lantern(k, [0, 29, 2], 3.4, 6, 0xd8302a, null);
    sign(k, [0, 24.6, 1.4], 14, 4, 0xffffff, '交番', 0x2a3a6a, { d: 0.6 });
    k.at([12, 3, 6], [0, -0.4, 0], () => chibi(k, { H: 54, hair: 'short', face: { eye: 'dot', mouth: 'flat', brow: 'thick' }, top: { c: 0x2a3a5a, t: 'cloth' }, outfit: { kind: 'suit', tie: 0x1a1a24, c2: 0x9ab0d0 }, sleeve: { c: 0x2a3a5a }, bottom: { c: 0x2a3a5a }, shoes: 0x1a1a1e, hat: { kind: 'station', c: 0x2a3a5a },
      armR: [150, -20, 20], armL: [10, 10, 10] }));
  },
  yakiimo(k) {
    street(k, 52, 36);
    k.at([-4, 3, 0], [0, 0.3, 0], () => {
      wheel(k, [-10, 6, 12], 5); wheel(k, [-10, 6, -12], 5); wheel(k, [10, 6, 12], 5); wheel(k, [10, 6, -12], 5);
      k.box([0, 14, 0], [30, 10, 26], { c: 0xe8e2d4, t: 'gloss', d: [D.txt('石焼いも', 0, 0, 4, 0xc8302a), D.txt('石焼いも', 0, 0, 4, 0xc8302a, { dir: 'b' })] }, { ch: 0.15 });
      k.box([4, 23, 0], [16, 8, 18], { c: 0x2a2a30, t: 'metal', d: [D.dots(2, 0.6, 0x5a5a62, { dir: 't' })] }, { ch: 0.2 });
      k.cyl([10, 34, 6], 1.4, 14, { c: 0x2a2a30, m: 'metal' });
      for (let i = 0; i < 3; i++) k.soft([-2 + i * 4, 28, -2 + i * 2], [3.4, 1.6, 1.6], { c: 0x8a3a5a, t: 'crust', c2: 0x5a2a3a }, { ch: 0.586 });
    });
    k.at([16, 3, 8], [0, -0.6, 0], () => chibi(k, { H: 50, hair: 'buzz', hairC: 0x8a8a92, face: { eye: 'happy', mouth: 'open', brow: 'thick' }, top: { c: 0x8a5a3a, t: 'knit' }, outfit: { kind: 'hanten', collar: 0x2a2a30 }, sleeve: { c: 0x8a5a3a, t: 'knit' }, bottom: { c: 0x4a4a54 }, hat: { kind: 'band', c: 0xf4f0e8, p: { c: 0xf4f0e8 } }, armR: [80, -10, 70], holdR(k) { k.box([0, -2, 4], [5, 4, 2], { c: 0xfbf8f0, t: 'paper' }, { ch: 0.3 }); } }));
  },
  shobo(k) {
    street(k, 52, 36);
    k.at([0, 3, -6], [0, 0, 0], () => { k.box([0, 12, 0], [50, 18, 18], { c: 0xc8302a, t: 'gloss', m: 'gloss', d: [D.txt('消防', 10, 2, 4, 0xffffff), D.band('y', -4, -3, 0xf6f6f2)] }, { ch: 0.15 }); k.box([-14, 20, 0], [16, 12, 17], { c: 0xc8302a, t: 'gloss', d: [D.rect(-6, 0, 6, 5, 0xbde4f0, { dir: 'f' })] }, { ch: 0.2 }); k.box([8, 23, 0], [28, 2, 6], { c: 0xc8c8d0, m: 'metal', d: [D.stripes('x', 3, 0.6, 0x8a8a92, { dir: 't' })] }, { ch: 0.2, rot: [0, 0, -0.1] }); for (const x of [-16, 16]) { wheel(k, [x, 4, 9.6], 4.6); wheel(k, [x, 4, -9.6], 4.6); } });
    k.at([14, 3, 10], [0, -0.4, 0], () => chibi(k, { H: 50, hair: 'short', face: { eye: 'angry', mouth: 'flat' }, top: { c: 0x6a6a72, t: 'cloth', d: [D.band('y', -3, -1.6, 0xf2d018)] }, sleeve: { c: 0x6a6a72, t: 'cloth' }, bottom: { c: 0x6a6a72, t: 'cloth', d: [D.band('y', 2, 3.4, 0xf2d018)] }, shoes: 0x1a1a1e, hat: { kind: 'helmet', c: 0xd8d8de, p: { c: 0xd8d8de, m: 'gloss', t: 'gloss' } },
      armL: [60, 10, 40], armR: [60, -10, 40], holdL(k) { k.cyl([0, -2, 6], 1.4, 14, { c: 0xc8c8d0, m: 'metal' }, { rot: [Math.PI / 2, 0, 0] }); } }));
  },
  chindon(k) {
    // the chindon-ya: a street-advertising band in costume, drums on the chest, a sandwich board for the new shop
    street(k);
    k.at([0, 3, 0], [0, 0.2, 0], () => chibi(k, { H: 60, hair: 'bun', hairC: 0x1a1414, face: { eye: 'happy', mouth: 'open', lash: true }, faceD: [D.rect(-15, -15, 15, 4, 0xf6f2ee, { alpha: 0.4 })], top: { c: 0xd85a8a, t: 'cloth', d: [D.dots(4, 1, 0xf2d84a, { dir: '*' })] }, outfit: { kind: 'kimono', collar: 0xf4f0e8, obi: 0xf2d84a },
      sleeve: { c: 0xd85a8a, t: 'cloth' }, legs: 'robe', bottom: { c: 0xd85a8a, t: 'cloth' }, armL: [70, 20, 60], armR: [70, -20, 60],
      onBody(k, T) { k.cyl([0, -2, T.hd + 6], 6, 4, { c: 0xc8302a, t: 'lacquer', top: 0xf2ecd8 }, { rot: [Math.PI / 2, 0, 0] }); k.cyl([7, 3, T.hd + 5], 3, 2, { c: 0xd8b040, m: 'metal' }, { rot: [Math.PI / 2, 0, 0] }); k.box([0, 0, -T.hd - 3], [20, 26, 1], { c: 0xf2ecd8, t: 'paper', d: [D.txt('新装開店', 0, 0, 3.4, 0xc8302a, { dir: 'b', vert: true })] }, { ch: 0 }); },
      holdR(k) { stick(k, [0, 0, 0], [0, 3, 6], 0.8, { c: 0xc8a060 }); } }));
  },
  kamishibai(k) {
    // the secret: the kamishibai man on his bicycle, the wooden stage open, a crowd of tiny sweets on the carrier
    street(k);
    k.at([0, 3, 0], [0, 0.3, 0], () => {
      wheel(k, [0, 6, 12]); wheel(k, [0, 6, -12]);
      k.box([0, 10, 0], [3, 3, 24], { c: 0x2a2a30, t: 'gloss' }, { ch: 0.3 });
      k.box([0, 18, -12], [16, 12, 10], { c: 0x8a5a32, t: 'wood', d: [D.rect(-6, -4, 6, 4, 0xfbf2d8, { dir: 'f' }), D.circ(0, 0, 2.4, 0xe8a04a, { dir: 'f' }), D.txt('黄金バット', 0, -5.4, 1.4, 0x2a1c1c)] }, { ch: 0.15 });
      for (const sx of [-1, 1]) k.box([sx * 9, 18, -9], [1, 12, 6], { c: 0x8a5a32, t: 'wood' }, { ch: 0.2, rot: [0, sx * 0.6, 0] });
      k.at([0, 12, 2], [0, 0, 0], () => chibi(k, { H: 44, sit: true, hair: 'short', hairC: 0x8a8a92, face: { eye: 'happy', mouth: 'open', brow: 'thick' }, top: { c: 0x6a5a4a, t: 'cloth' }, outfit: { kind: 'hanten', collar: 0x2a2a30 }, hat: { kind: 'beret', c: 0x2a2a30 }, legL: [60, 20], legR: [60, -20], armL: [90, 20, 20], armR: [130, -30, 30],
        holdR(k) { stick(k, [0, 0, 0], [0, 6, 0], 1, { c: 0xc8a060 }); k.cyl([0, 7, 0], 1.6, 3, { c: 0xd8302a, t: 'lacquer' }, { rot: [Math.PI / 2, 0, 0] }); } }));
    });
  },
};

export default {
  id: 'hataraku', order: 26, name: 'Hataraku Machi', jp: 'はたらくまち', tagline: 'The people who keep the street running', taglineJp: 'きょうも、おつかれさま！', price: 400,
  themes: ['city', 'retro'], card: { bg: '#f2ecd8', accent: '#c8302a', text: '#2a2430', pattern: 'stripes', accent2: '#2a4aa8' }, capsule: { colors: [0xc8302a, 0x2a4aa8, 0xf2d018, 0x6a6a72] },
  items: [
    { id: 'yubin', name: 'The Postman', jp: '郵便屋さん', rarity: 'common', desc: 'Two rounds a day, rain or shine. Knows every dog by name.', fig: F.yubin },
    { id: 'demae', name: 'Ramen Delivery', jp: '出前持ち', rarity: 'common', desc: 'Three bowls, one hand, no lid needed. Not one drop spilled since 1971.', fig: F.demae },
    { id: 'koban', name: 'Police Box', jp: '交番さん', rarity: 'common', desc: 'Gives directions, finds lost umbrellas, waves at every child.', fig: F.koban },
    { id: 'yakiimo', name: 'Yakiimo Truck', jp: '焼きいも屋', rarity: 'uncommon', desc: '"Ishi-yaaaki imo~" You hear it three streets away. You run.', fig: F.yakiimo },
    { id: 'shobo', name: 'Fire Brigade', jp: '消防団', rarity: 'rare', desc: 'Polishes the engine every Sunday. Has never needed the ladder.', fig: F.shobo },
    { id: 'chindon', name: 'Chindon-ya', jp: 'ちんどん屋', rarity: 'ultra', desc: 'Drums, a clarinet and a sandwich board. Every new shop on the street gets a parade.', fig: F.chindon },
    { id: 'kamishibai', name: 'Kamishibai Man', jp: '紙芝居屋', rarity: 'secret', desc: 'SECRET. Buy a sweet, get the story. The best bit is always "to be continued".', fig: F.kamishibai },
  ],
};
