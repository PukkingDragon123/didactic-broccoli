// Haniwa Pets (はにわペット): terracotta funerary animals on museum plinths; blocky clay figures with hollow eyes.
import { D } from '../../figures/chibi.js';
import { stick } from '../../figures/props.js';

const CLAY = 0xc8784a, CLAY2 = 0xb06a40;
const hole = (x, y, rx, ry, dir = 'f') => D.ell(x, y, rx, ry, 0x3a1a10, { dir, ink: 0x8a4a2a, iw: 0.4 });
const P = (extra = []) => ({ c: CLAY, t: 'clay', d: extra });
const plinth = (k, label) => { k.box([0, 3, 0], [44, 6, 28], { c: 0x3a3a40, t: 'gloss', d: [D.rect(-10, -2, 10, 2, 0xe8e0c8, { dir: 'f' }), D.txt(label, 0, 0, 2.2, 0x2a2a30)] }, { ch: 0.2 }); };
/** A haniwa animal: tubular body and legs (cylinders), a head with hollow eyes. */
const beastH = (k, o = {}) => {
  const bl = o.bl ?? 26, bh = o.bh ?? 10, lh = o.lh ?? 12;
  k.at([0, 6 + lh + bh / 2, 0], [0, 0, 0], () => k.cyl([0, 0, 0], bh / 2, bl, P(o.bodyD), { rot: [Math.PI / 2, 0, 0], rz: bh / 2 * 1.1 }));
  for (const z of [bl * 0.32, -bl * 0.32]) k.mirror(() => k.cyl([bh * 0.35, 6 + lh / 2, z], 2.4, lh, P(), { top: 1.1 }));
  return { bl, bh, lh, y: 6 + lh + bh / 2 };
};
const F = {
  inu(k) {
    plinth(k, '犬');
    const b = beastH(k);
    k.at([0, b.y + 4, b.bl / 2 - 1], [0, 0, 0], () => { k.cyl([0, 4, 0], 5, 10, P([hole(-2, 6, 1.2, 1.4), hole(2, 6, 1.2, 1.4), hole(0, 1, 1.6, 1)])); k.box([0, 0, 5], [6, 4, 6], P([hole(0, 0, 1.4, 0.8)]), { ch: 0.4 }); k.mirror(() => k.box([3, 10, 0], [2.4, 5, 3], P(), { ch: 0.4, top: [0.5, 1] })); });
    k.cyl([0, b.y + 4, -b.bl / 2 - 2], 1.6, 8, P(), { rot: [-0.8, 0, 0] });
    k.box([0, b.y + 2, b.bl / 2 - 6], [11, 2, 2], { c: CLAY2, t: 'clay', d: [D.dots(2, 0.4, 0x8a4a2a)] }, { ch: 0.4 });
  },
  tori(k) {
    plinth(k, '鶏');
    k.cyl([0, 16, 0], 8, 20, P([D.stripes('y', 4, 0.5, CLAY2)]), { top: 0.9 });
    k.soft([0, 30, 2], [7, 7, 8], P([D.stripes('y', 3, 0.5, CLAY2, { dir: 'x' })]), { ch: 0.5 });
    k.at([0, 34, 6], [0, 0, 0], () => { k.cyl([0, 4, 0], 3.4, 9, P([hole(-1.4, 6, 0.8, 1), hole(1.4, 6, 0.8, 1)])); k.box([0, 4, 4], [2, 2, 4], { c: CLAY2, t: 'clay' }, { ch: 0.4, top: [0.4, 1] }); k.box([0, 10, 0], [1.6, 4, 6], { c: 0xb8502a, t: 'clay' }, { ch: 0.3 }); });
    k.box([0, 34, -8], [3, 12, 8], P([D.stripes('y', 2.4, 0.5, CLAY2)]), { ch: 0.3, rot: [-0.4, 0, 0], top: [1, 1.4] });
  },
  neko(k) {
    plinth(k, '猫');
    k.cyl([0, 16, 0], 9, 20, P(), { top: 0.85 });
    k.cyl([0, 32, 0], 7, 12, P([hole(-2.6, 2, 1.4, 1.8), hole(2.6, 2, 1.4, 1.8), hole(0, -3, 1.2, 0.8), D.line(-6, -2, -10, -1, 0.4, 0x8a4a2a), D.line(6, -2, 10, -1, 0.4, 0x8a4a2a)]));
    k.mirror(() => k.prism([[0, 2.4, 1.4, 0, 0, 0.3], [5, 0.4, 0.5, 0, 0, 0]], P(), { pos: [4, 37.4, 0] }));
    k.at([4, 18, 8], [0, 0, Math.PI / 2], () => k.prism([[-4, 1.4, 1.2, 0, 0, 0.5], [0, 2.4, 1.6, 0, 0, 0.5], [4, 1.6, 1.4, 0, 0, 0.5]], { c: 0xa86a4a, t: 'clay', d: [hole(-2, -2.4, 0.4, 0.4)] }, { pf: true }));
    k.cyl([-8, 10, -6], 1.6, 10, P(), { rot: [0.6, 0, 0.6] });
  },
  buta(k) {
    plinth(k, '猪');
    const b = beastH(k, { bl: 24, bh: 13, lh: 9 });
    k.at([0, b.y, b.bl / 2], [0, 0, 0], () => { k.cyl([0, 0, 2], 5.4, 6, P([hole(-2, 2.4, 1, 1.2, 't'), hole(2, 2.4, 1, 1.2, 't')]), { rot: [Math.PI / 2, 0, 0] }); k.cyl([0, -0.6, 6], 3, 2, { c: CLAY2, t: 'clay', d: [hole(-1, 0, 0.6, 0.6, 't'), hole(1, 0, 0.6, 0.6, 't')] }, { rot: [Math.PI / 2, 0, 0], pf: true }); k.mirror(() => k.box([3.6, 6, 0], [2.4, 4, 2], P(), { ch: 0.4 })); });
    k.at([16, 6, 6], [0, -0.5, 0], () => { k.cyl([0, 6, 0], 3.6, 9, P(), { rot: [Math.PI / 2, 0, 0] }); for (const z of [3, -3]) k.mirror(() => k.cyl([1.4, 2.4, z], 1, 4, P())); k.cyl([0, 6, 5.4], 2, 1.4, P([hole(0, 0, 0.6, 0.6, 't')]), { rot: [Math.PI / 2, 0, 0] }); });
  },
  uma(k) {
    plinth(k, '馬');
    const b = beastH(k, { bl: 26, bh: 11, lh: 14 });
    k.at([0, b.y, b.bl / 2 - 2], [-0.5, 0, 0], () => { k.cyl([0, 7, 0], 4, 14, P()); k.at([0, 14, 2], [1.0, 0, 0], () => k.cyl([0, 4, 0], 3.6, 10, P([hole(-1.6, 1, 0.8, 1, 'l'), hole(1.6, 1, 0.8, 1, 'r'), D.band('y', 0, 1, 0x8a3a2a)]))); k.box([0, 8, -3], [2, 14, 3], { c: CLAY2, t: 'clay', d: [D.stripes('y', 1.6, 0.6, 0x8a4a2a)] }, { ch: 0.3 }); });
    k.box([0, b.y + 6, 0], [14, 3, 12], { c: 0xb8502a, t: 'clay', d: [D.check(2.4, 0x8a3a2a)] }, { ch: 0.4 });
    for (const z of [6, -6]) k.mirror(() => k.soft([6, b.y - 2, z], [1.6, 1.6, 1.6], { c: 0xd8a050, m: 'metal' }, { ch: 0.586 }));
    k.cyl([0, b.y + 2, -b.bl / 2 - 3], 1.4, 10, P(), { rot: [-1, 0, 0] });
  },
  dogu(k) {
    // the secret: a golden goggle-eyed figure (dogū) with a cat's ears, on a museum stand
    k.box([0, 3, 0], [40, 6, 28], { c: 0x2a2a34, t: 'gloss', d: [D.txt('土偶', 0, 0, 3, 0xe8c040)] }, { ch: 0.2 });
    const G = { c: 0xe8c040, m: 'metal', t: 'metal', d: [D.stripes('y', 3, 0.6, 0xb8901a)] };
    k.mirror(() => k.box([6, 14, 0], [9, 16, 10], G, { ch: 0.35, top: [0.8, 0.9] }));
    k.box([0, 30, 0], [22, 18, 14], { ...G, d: [D.fn('f', (c, o) => { if (Math.abs(Math.sin(c.x * 0.8) * 2 - c.y) < 0.8) { o[0] *= 0.7; o[1] *= 0.7; o[2] *= 0.6; } })] }, { ch: 0.3, top: [1.2, 1] });
    k.mirror(() => k.box([16, 32, 0], [10, 6, 7], G, { ch: 0.4, rot: [0, 0, -0.4] }));
    k.box([0, 48, 0], [24, 18, 16], { c: 0xe8c040, m: 'metal', t: 'metal', d: [D.ell(-5.6, 0, 5, 3.4, 0xb8901a, { ink: 0x7a5a10, iw: 0.6 }), D.ell(5.6, 0, 5, 3.4, 0xb8901a, { ink: 0x7a5a10, iw: 0.6 }), D.line(-9, 0, -2, 0, 0.6, 0x5a3a10), D.line(2, 0, 9, 0, 0.6, 0x5a3a10), D.ell(0, -6, 2, 1.2, 0x5a3a10)] }, { ch: 0.35, dens: 1.2 });
    k.mirror(() => k.prism([[0, 4, 2, 0, 0, 0.3], [7, 0.6, 0.6, 0, 0, 0]], G, { pos: [8, 57, 0] }));
  },
};

export default {
  id: 'haniwa',
  order: 17,
  name: 'Haniwa Pets',
  jp: 'はにわん',
  romaji: 'HANIWAN',
  tagline: 'Fifteen hundred years old, still startled',
  taglineJp: 'ずっと、おどろいてる。',
  price: 600,
  themes: ['retro', 'weird', 'shrine'],
  card: { bg: '#f2e6d6', accent: '#b8603a', text: '#3a2a20', accent2: '#4f8a6a', pattern: 'dots' },
  capsule: { colors: [0xcf8f62, 0x5a3a2a, 0xf2e6d6, 0x8a9a6a], style: 'opaque' },
  flyer: {
    maker: 'mogura', scene: 'bamboo', hero: 'uma', side: ['buta', 'inu'],
    title: [['はにわん', 4, 'a']],
    catch: 'ずっと、おどろいてる。', sub: '博物館の台座つき', gimmick: 'くびがうごく！',
  },
  items: [
    {
      id: 'inu', name: 'Haniwa Dog', jp: 'はにわいぬ', rarity: 'common',
      desc: 'Guarded a tomb for fifteen centuries. Barked once, in the year 900.',
      fig: F.inu, gimmick: { text: 'Turn its head' },
    },
    {
      id: 'tori', name: 'Haniwa Rooster', jp: 'はにわニワトリ', jpLines: ['はにわ', 'ニワトリ'], rarity: 'common',
      desc: 'Announced the dawn, once. It was a very long night after that.',
      fig: F.tori, gimmick: { text: 'Nod' },
    },
    {
      id: 'neko', name: 'Haniwa Cat', jp: 'はにわねこ', rarity: 'uncommon',
      desc: 'Brought a clay fish to the afterlife. Has not shared it.',
      fig: F.neko, gimmick: { text: 'Tilt its head' },
    },
    {
      id: 'buta', name: 'Haniwa Boar', jp: 'はにわイノシシ', jpLines: ['はにわ', 'イノシシ'], rarity: 'rare',
      desc: 'Comes with one piglet, which was fired a size too small and has never mentioned it.',
      fig: F.buta, gimmick: { text: 'Turn its head' },
    },
    {
      id: 'uma', name: 'Dressed Haniwa Horse', jp: 'かざりうま', rarity: 'ultra',
      desc: 'Saddle, bells, bridle, best mane. Going nowhere in style since the fifth century.',
      fig: F.uma, gimmick: { text: 'Nod' },
    },
    {
      id: 'dogu', name: 'The Golden Goggle Cat', jp: 'きんのどぐうねこ', jpLines: ['きんの', 'どぐうねこ'], rarity: 'secret',
      desc: 'Older than the rest put together. Wears the goggles for the glare off its own gold.',
      fig: F.dogu, gimmick: { text: 'Turn its head' },
    },
  ],
};
