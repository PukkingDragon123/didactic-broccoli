// Hyakki Yagyō (ひゃっきやこう): the night parade of a hundred yōkai, a few of them at a time, as chunky painted
// block figures marching on lantern-lit paving stones (src/figures). 全6種 + シークレット.
import { chibi, beast, D } from '../../figures/chibi.js';
import { stick, lantern, umbrella, cute } from '../../figures/props.js';

const road = (k) => { k.box([0, 1.5, 0], [44, 3, 32], { c: 0x4a4a54, t: 'stone', d: [D.fn('t', (c, o) => { const u = ((c.a % 7) + 7) % 7, v = ((c.b + (Math.floor(c.a / 7) & 1) * 3.5) % 7 + 7) % 7; if (u < 0.6 || v < 0.6) { o[0] = 40; o[1] = 40; o[2] = 46; } })] }, { ch: 0.2 }); };
const F = {
  karakasa(k) {
    road(k);
    k.at([0, 3, 0], [0, 0, 0.15], () => {
      k.box([0, 8, 0], [4, 16, 4], { c: 0xc8a060, t: 'wood' }, { ch: 0.4 });
      k.box([0, 1.5, 3], [6, 3, 10], { c: 0xd8b878, t: 'wood', d: [D.band('y', 0.6, 1.2, 0x8a1a1a)] }, { ch: 0.3 });
      umbrella(k, [0, 30, 0], 18, 14, { c: 0x6a8a3a, d: [D.circ(0, 9, 4.6, 0xf6f2e6, { ink: 0x2a1c1c, iw: 0.7 }), D.circ(0.6, 8.6, 2.4, 0x2a1c1c), D.ell(0, 3, 3, 1.6, 0x6a1a20)] }, { handle: false, rise: 14, shaft: { c: 0xc8a060, t: 'wood' } });
      k.box([0, 32, 15], [4, 1.6, 9], { c: 0xc8506a, t: 'gloss' }, { ch: 0.5, rot: [0.7, 0, 0] });
    });
  },
  chochin(k) {
    road(k);
    k.at([0, 3, 0], [0, 0, 0], () => { lantern(k, [0, 20, 0], 10, 26, 0xf2e6c8, null); k.box([0, 22, 10.4], [9, 9, 1], { c: 0xf6f2e6, d: [D.circ(0, 0, 3.6, 0xffffff, { ink: 0x2a1c1c, iw: 0.6 }), D.circ(0.8, -0.4, 1.8, 0x2a1c1c)] }, { ch: 0.4 }); k.box([0, 12, 11], [5, 2, 6], { c: 0xc8506a, t: 'gloss' }, { ch: 0.5, rot: [0.6, 0, 0] }); k.mirror(() => k.box([4, 4, 0], [2.4, 8, 2.4], { c: 0x2a2a30 }, { ch: 0.4 })); });
  },
  kappa(k) {
    road(k);
    k.at([0, 3, 0], [0, 0.3, 0], () => chibi(k, { H: 54, skin: 0x6a9a4a, hair: 'short', hairC: 0x3a5a2a, face: { eye: 'dot', mouth: 'none' }, top: { c: 0x6a9a4a, t: 'scales', d: [D.ell(0, -1, 6, 5, 0xc8c890, { dir: 'f' })] }, sleeve: { c: 0x6a9a4a, t: 'scales' }, bottom: { c: 0x6a9a4a, t: 'scales' }, gloves: { c: 0x6a9a4a }, shoes: 0x5a8a3a,
      armL: [100, 30, 20], armR: [20, -20, 30], legL: [-20, 6], legR: [24, 6],
      onBody(k, T) { k.box([0, 0, -T.hd - 2.4], [T.hw * 2, T.hh * 2, 4], { c: 0x5a6a3a, t: 'stone', d: [D.check(3, 0x4a5a2a, { dir: 'b' })] }, { ch: 0.5 }); },
      onHead(k, H) { k.cyl([0, H.hy + H.hh + 0.5, 0], 7, 1.4, { c: 0xd8e8e8, m: 'gloss', t: 'water' }); k.box([0, H.hy - 5, H.hd + 2.4], [7, 3, 4], { c: 0xd8b040, t: 'gloss' }, { ch: 0.4, top: [0.7, 0.5] }); },
      holdL(k) { k.box([0, 2, 0], [3.2, 12, 3.2], { c: 0x3a7a2a, t: 'gloss', d: [D.dots(1.4, 0.3, 0x2a5a1a)] }, { ch: 0.5 }); } }));
  },
  rokurokubi(k) {
    road(k);
    k.at([4, 3, 0], [0, -0.3, 0], () => chibi(k, { H: 46, hair: 'bald', headP: { c: 0xf2d8c0 }, headK: 0.3, top: { c: 0x5a3a8a, t: 'cloth', d: [D.dots(4, 1, 0xd8c8f0, { dir: '*' })] }, outfit: { kind: 'kimono', obi: 0xe8c040 }, sleeve: { c: 0x5a3a8a, t: 'cloth' }, legs: 'robe', bottom: { c: 0x5a3a8a, t: 'cloth' }, armL: [60, 20, 60], armR: [60, -20, 60] }));
    const pts = [[4, 40, 0], [0, 50, 2], [-6, 56, 4], [-12, 58, 2], [-16, 54, 4]];
    for (let i = 0; i + 1 < pts.length; i++) stick(k, pts[i], pts[i + 1], 3.4, { c: 0xf2d8c0, t: 'vinyl' });
    k.at([-18, 50, 6], [0.4, 0.4, 0.3], () => { k.box([0, 0, 0], [16, 15, 13], { c: 0xf2d8c0, d: [D.face({ eye: 'anime', iris: 0x3a2a2a, mouth: 'smile', y: -1, gap: 3.6, er: 1.4, eh: 1.8, my: -5, blush: true, lash: true })] }, { ch: 0.36 }); k.box([0, 6.6, -1.4], [17, 4.4, 14], { c: 0x1a1414, t: 'hair' }, { ch: 0.4 }); k.ball([0, 10, -3], [4, 3.4, 4], { c: 0x1a1414, t: 'hair' }); });
  },
  nekomata(k) {
    road(k);
    k.at([0, 3, 0], [0, 0, 0], () => beast(k, 'stand', { c: 0x3a3438, c2: 0xf2f0ea, size: 1.2, ears: 'tri', inner: 0xd8606a, tail: 'none', whiskers: true, face: { eye: 'anime', iris: 0xe8c040, mouth: 'fang' }, head: [-10, 20, 0],
      onBody(k, b) { for (const a of [-0.4, 0.4]) k.at([0, b.legH + b.bh * 0.9, -b.bl / 2], [0.6, a, 0], () => { k.box([0, 6, -1], [3, 14, 3], { c: 0x3a3438, t: 'fur' }, { ch: 0.5 }); k.soft([0, 15, -1], [3, 4, 3], { c: 0x7ad8ff, m: 'glow' }, { ch: 0.586 }); }); } }));
  },
  tengu(k) {
    road(k);
    k.at([0, 3, 0], [0, -0.3, 0], () => chibi(k, { H: 62, skin: 0xc84a3a, hair: 'long', hairC: 0xe8e2d4, face: { eye: 'angry', mouth: 'flat', brow: 'thick', browC: 0xe8e2d4 }, top: { c: 0xf4f0e6, t: 'cloth' }, outfit: { kind: 'kimono', collar: 0x2a3a2a, obi: 0x2a3a2a }, sleeve: { c: 0xf4f0e6, t: 'cloth' }, legs: 'hakama', bottom: { c: 0x2a3a2a, t: 'cloth' }, shoes: 0x6a4a2a, sole: 0x6a4a2a,
      armR: [80, -20, 70], armL: [20, 20, 40],
      onHead(k, H) { k.box([0, H.hy - 1, H.hd + 6], [3.4, 3.4, 12], { c: 0xc84a3a, t: 'gloss' }, { ch: 0.5, top: [0.6, 0.6] }); k.box([0, H.hy + H.hh + 1.6, 4], [4.4, 4.4, 4.4], { c: 0x1a1a1e, t: 'lacquer' }, { ch: 0.3, rot: [0, 0.78, 0] }); },
      onBody(k, T) { k.mirror(() => k.box([7, 3, -T.hd - 2], [16, 22, 2], { c: 0x2a2a34, t: 'feather' }, { ch: 0.3, rot: [0, -0.3, -0.35], top: [0.6, 1] })); },
      holdR(k) { k.box([0, 0, 9], [10, 1, 14], { c: 0x6a8a3a, t: 'feather' }, { ch: 0.4 }); } }));
  },
  nurarihyon(k) {
    // the secret: the parade's leader, an old gentleman with a long bald head, silk haori and a long pipe
    road(k);
    lantern(k, [-16, 28, -8], 4, 10, 0xd8302a, '百');
    k.at([2, 3, 0], [0, 0.2, 0], () => chibi(k, { H: 60, skin: 0xe8c8a8, hair: 'bald', face: { eye: 'closed', mouth: 'smile', brow: 'thick', browC: 0xd8d8de, nose: 'line' }, top: { c: 0x3a2a4a, t: 'cloth', d: [D.dots(5, 1, 0xe8c040, { dir: '*' })] }, outfit: { kind: 'kimono', collar: 0xe8c040, obi: 0x6a5a3a }, sleeve: { c: 0x3a2a4a, t: 'cloth' }, legs: 'robe', bottom: { c: 0x3a2a4a, t: 'cloth' },
      armR: [60, -10, 80], armL: [10, 10, 10], onHead(k, H) { k.ball([0, H.hy + H.hh + 4, -3], [H.hw * 0.9, 9, H.hd * 0.9], { c: 0xe8c8a8, t: 'vinyl' }); }, holdR(k) { stick(k, [0, 0, 0], [8, 3, 10], 0.8, { c: 0x6a4a2a, t: 'wood' }); k.cyl([8.6, 4, 10.6], 1.2, 2, { c: 0xd8b040, m: 'metal' }); } }));
  },
};

export default {
  id: 'hyakki', order: 24, name: 'Hyakki Yagyō', jp: 'ひゃっきやこう', tagline: 'The night parade of a hundred yōkai', taglineJp: '真夜中の行列、のぞいちゃだめ。', price: 500,
  themes: ['spooky', 'japan'], card: { bg: '#1e1a30', accent: '#d8302a', text: '#f2e6c8', pattern: 'dots', accent2: '#e8c040' }, capsule: { colors: [0xd8302a, 0x3a2a4a, 0xe8c040, 0x6a9a4a] },
  items: [
    { id: 'karakasa', name: 'Kasa-obake', jp: 'からかさ', rarity: 'common', desc: 'Hops along at the back. Has no idea where the parade is going.', fig: F.karakasa },
    { id: 'chochin', name: 'Chōchin-obake', jp: 'ちょうちん', rarity: 'common', desc: 'Lights the way. Mostly lights itself.', fig: F.chochin },
    { id: 'kappa', name: 'Kappa', jp: 'かっぱ', rarity: 'common', desc: 'Brought a cucumber for the road. And a spare.', fig: F.kappa },
    { id: 'rokurokubi', name: 'Rokurokubi', jp: 'ろくろくび', rarity: 'uncommon', desc: 'Sees over every head in the parade. Reports back on all of it.', fig: F.rokurokubi },
    { id: 'nekomata', name: 'Nekomata', jp: 'ねこまた', rarity: 'rare', desc: 'Two tails, two little flames, and the whole parade follows her.', fig: F.nekomata },
    { id: 'tengu', name: 'Tengu', jp: 'てんぐ', rarity: 'ultra', desc: 'Fans the stragglers along with one sweep. Very strict about the route.', fig: F.tengu },
    { id: 'nurarihyon', name: 'Nurarihyon', jp: 'ぬらりひょん', rarity: 'secret', desc: 'SECRET. The leader. Walks into houses at dinner time and helps himself to tea.', fig: F.nurarihyon },
  ],
};
