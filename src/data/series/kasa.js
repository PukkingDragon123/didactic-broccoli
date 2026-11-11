// Series 3 — Kasa Collection (傘コレクション)
// Umbrellas of Japan: konbini vinyl, kids' frogs, wagasa, a windy disaster, and one hopping yokai.
// Kasa Collection: umbrellas, folk-art parasols and rainy-day kids as blocky figures (src/figures).
import { chibi, D } from '../../figures/chibi.js';
import { umbrella, stick, cute, WHITE } from '../../figures/props.js';

const stand = (k) => { k.cyl([0, 1.5, 0], 9, 3, { c: 0x3a3a44, t: 'gloss' }); };
const F = {
  vinyl(k) { stand(k); umbrella(k, [0, 40, 0], 22, 60, { c: 0xe8f2f6, m: 'glass', t: 'glass' }, { rot: [0, 0, 0.1], shaft: { c: 0xd8d8de, m: 'metal' }, handleP: { c: 0xf2f2f6, t: 'gloss' }, rib: 0xc8c8d0 }); k.box([4, 18, 2], [4, 3, 0.6], { c: 0xffffff, d: [D.txt('¥500', 0, 0, 1.6, 0xd8302a)] }, { ch: 0 }); },
  kaeru(k) {
    stand(k);
    umbrella(k, [0, 40, 0], 22, 60, { c: 0x6ac04a, d: [D.fn('*', (c, o) => { if (c.z > 8 && Math.abs(c.x) < 6 && c.y < 6) { o[0] = 200; o[1] = 236; o[2] = 246; } })] }, { handleP: { c: 0xf2d018, t: 'gloss' }, rib: 0x3a8a2a });
    k.mirror(() => k.soft([6, 51, 6], [3.6, 3, 3.4], { c: 0x6ac04a, t: 'gloss', d: [D.circ(0, 0, 2, 0xfbfbf2), D.circ(0, -0.2, 1, 0x1a1a1a)] }, { ch: 0.586 }));
  },
  tatami(k) { stand(k); umbrella(k, [0, 40, 0], 20, 62, { c: 0x2a2a34, t: 'cloth' }, { rise: 6, handleP: { c: 0xc8a050, t: 'wood', d: [D.stripes('y', 2, 0.5, 0x8a6a2a)] }, hw: 2.8 }); },
  janome(k) {
    stand(k);
    umbrella(k, [0, 40, 0], 24, 60, { c: 0x2a3a8a, t: 'paper', d: [D.fn('*', (c, o) => { const r = Math.hypot(c.x, c.z); if (r > 11 && r < 17) { o[0] = 248; o[1] = 244; o[2] = 232; } if (r < 4) { o[0] = 200; o[1] = 40; o[2] = 40; } })] }, { rise: 9, shaft: { c: 0xd8b878, t: 'wood' }, rib: 0x1a2a6a, handleP: { c: 0x3a2a24, t: 'cloth' } });
  },
  uragaeri(k) {
    stand(k);
    umbrella(k, [0, 30, 0], 22, 42, { c: 0xd8302a, d: [D.dots(4, 0.8, 0xf6f2ea, { dir: '*' })] }, { inside: true, rise: 12, rot: [0.2, 0, -0.25], handleP: { c: 0x2a2a30, t: 'gloss' } });
    for (let i = 0; i < 3; i++) k.box([16 + i * 3, 46 - i * 6, 0], [6, 0.6, 0.6], { c: 0xb8d8e8 }, { ch: 0 });
  },
  nodate(k) {
    k.box([0, 2, 0], [56, 4, 40], { c: 0xc8302a, t: 'cloth', top: 0xd8403a }, { ch: 0.2 });
    umbrella(k, [0, 48, -4], 30, 56, { c: 0xd8302a, t: 'paper', d: [D.fn('*', (c, o) => { if (Math.hypot(c.x, c.z) < 7) { o[0] = 248; o[1] = 230; o[2] = 230; } })] }, { rise: 12, shaft: { c: 0xd8b878, t: 'wood' }, rib: 0x9a1a18, handle: false });
    k.cyl([-12, 7, 8], 4, 5, { c: 0x5a4a3e, t: 'clay' }, { top: 1.2 }); k.cyl([-12, 9.4, 8], 4.4, 0.6, { c: 0x7ab84a });
    for (const [x, z] of [[10, 10], [-6, 14], [18, -6], [-20, -4], [4, 4]]) k.box([x, 4.6, z], [2.4, 0.6, 2.4], { c: 0xf6c0d0, d: [D.star(0, 0, 1.1, 0xfde0e8, { dir: 't', n: 5, inner: 0.55 })] }, { ch: 0.4, rot: [0, x, 0] });
  },
  amefuri(k) {
    k.box([0, 1, 0], [44, 2, 32], { c: 0x5a8ac8, m: 'glass', t: 'water' }, { ch: 0.5 });
    k.at([0, 6, 0], [0, 0, 0], () => chibi(k, { H: 54, hair: 'short', hairC: 0x2a2220, face: { eye: 'happy', mouth: 'open' }, top: { c: 0xf2d018, t: 'gloss', m: 'gloss' }, outfit: { kind: 'shirt', c2: 0xf2d018, bc: 0xffffff }, sleeve: { c: 0xf2d018, t: 'gloss' }, legs: 'shorts', bottom: { c: 0xf2d018, t: 'gloss' }, shoes: 0xd8302a, socks: 0xd8302a,
      legL: [40, 10], legR: [-20, 10], armL: [150, 30, 10], armR: [-20, -30, 0], hat: { kind: 'cap', c: 0xf2d018, p: { c: 0xf2d018, t: 'gloss', m: 'gloss' }, brim: { c: 0xf2d018, t: 'gloss' } } }));
    for (let i = 0; i < 4; i++) k.box([-14 + i * 9, 4 + (i % 2) * 3, 10], [2, 2, 2], { c: 0x9ad8f8, m: 'glass' }, { ch: 0.5 });
  },
  obake(k) {
    k.cyl([0, 1, 0], 14, 2, { c: 0x3a3a44 });
    k.at([0, 0, 0], [0, 0, 0.08], () => {
      k.box([0, 8, 0], [5, 14, 5], { c: 0xf2d8c0, t: 'fur', d: [D.dots(1.4, 0.35, 0x3a2a24, { dir: '*' })] }, { ch: 0.4 });
      k.box([0, 2, 3], [7, 4, 10], { c: 0xd8b878, t: 'wood', d: [D.band('y', 0.6, 1.4, 0xc8302a)] }, { ch: 0.3 });
      k.prism([[0, 20, 20, 0, 0, 0.586], [12, 13, 13, 0, 0, 0.586], [26, 1.8, 1.8, 0, 0, 0.586]], { c: 0x7a3aa8, t: 'paper', d: [D.stripes('r', 1, 0.06, 0x4a1a78, { n: 8 }), D.circ(0, 12, 5.4, 0xffffff, { ink: 0x2a1c1c, iw: 0.8 }), D.circ(0.6, 11.6, 2.8, 0x2a1c1c), D.circ(-0.2, 12.6, 0.9, 0xffffff), D.ell(0, 4, 4, 2.4, 0x6a1a20, { dir: 'f' })] }, { pos: [0, 15, 0] });
      k.box([0, 16, 18], [5, 2, 12], { c: 0xe8506a, t: 'gloss' }, { ch: 0.5, rot: [0.7, 0, 0] });
      k.cyl([0, 42, 0], 1, 4, { c: 0x2a2a30 });
    });
  },
};

export default {
  id: 'kasa',
  order: 3,
  name: 'Kasa Collection',
  jp: '傘コレクション',
  tagline: 'Tiny umbrellas for a rainy season',
  taglineJp: '梅雨のおともに',
  price: 200,
  themes: ['cute', 'retro', 'weird'],
  card: { bg: '#e3eef8', accent: '#e5383b', text: '#1f2f4a', accent2: '#ffd23f', pattern: 'dots' },
  capsule: { colors: [0x9fd9ff, 0xffd23f, 0xe5383b, 0xc7b3f0, 0x58c06c] },
  items: [
    // ------------------------------------------------------------ 1. konbini vinyl umbrella
    {
      id: 'vinyl', name: 'Konbini Vinyl Umbrella', jp: 'ビニール傘', rarity: 'common',
      desc: 'Bought in a panic for ¥500. Will be left on a train by Thursday.',
      fig: F.vinyl,
    },
    // ------------------------------------------------------------ 2. frog kids umbrella
    {
      id: 'kaeru', name: 'Frog Kids Umbrella', jp: 'かえるのかさ', rarity: 'common',
      desc: 'Comes with a clear window so you can see the puddles you are about to jump in.',
      fig: F.kaeru,
    },
    // ------------------------------------------------------------ 3. folded navy umbrella
    {
      id: 'tatami', name: 'Bamboo-Handle Umbrella', jp: '紳士傘', rarity: 'common',
      desc: 'A proper gentleman’s umbrella. Left at the station in 1987, still waiting.',
      fig: F.tatami,
    },
    // ------------------------------------------------------------ 4. janome-gasa
    {
      id: 'janome', name: 'Janome-gasa', jp: '蛇の目傘', rarity: 'uncommon',
      desc: 'A bull’s-eye wagasa of oiled washi. Rain sounds like tiny drums on it.',
      fig: F.janome,
    },
    // ------------------------------------------------------------ 5. inside-out umbrella
    {
      id: 'uragaeri', name: 'Inside-Out Umbrella', jp: 'おちょこ傘', rarity: 'uncommon',
      desc: 'Typhoon season’s most popular dance move. The umbrella did not consent.',
      fig: F.uragaeri,
    },
    // ------------------------------------------------------------ 6. sakura nodate parasol
    {
      id: 'nodate', name: 'Sakura Nodate Parasol', jp: '桜の野点傘', rarity: 'rare',
      desc: 'Outdoor tea under the cherry blossoms. Petals keep landing in the matcha.',
      fig: F.nodate,
    },
    // ------------------------------------------------------------ 7. rainy day kid
    {
      id: 'amefuri', name: 'Puddle Jumper', jp: 'あめふりっこ', rarity: 'ultra',
      desc: 'Yellow raincoat, red boots, zero intention of staying dry.',
      fig: F.amefuri,
    },
    // ------------------------------------------------------------ 8. kasa-obake (secret)
    {
      id: 'obake', name: 'Kasa-Obake', jp: 'からかさお化け', rarity: 'secret',
      desc: 'A hundred-year-old umbrella that grew an eye, a tongue and a very hairy leg.',
      fig: F.obake,
    },
  ],
};
