// Haniwa Pets (はにわん): the household animals of the burial-mound age, in red clay, exactly as surprised as the day
// they were fired; each on a museum plinth with its card. A sculpted series (src/figures/sets/haniwa.js).
// 全5種 + シークレット.
import * as F from '../../figures/sets/haniwa.js';

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
  atlas: [2048, 1536],
  flyer: {
    maker: 'mogura', scene: 'bamboo', hero: 'uma', side: ['buta', 'inu'],
    title: [['はにわん', 4, 'a']],
    catch: 'ずっと、おどろいてる。', sub: '博物館の台座つき', gimmick: 'くびがうごく！',
  },
  items: [
    {
      id: 'inu', name: 'Haniwa Dog', jp: 'はにわいぬ', rarity: 'common',
      desc: 'Guarded a tomb for fifteen centuries. Barked once, in the year 900.',
      figure: F.inu, gimmick: { text: 'Turn its head' },
    },
    {
      id: 'tori', name: 'Haniwa Rooster', jp: 'はにわニワトリ', jpLines: ['はにわ', 'ニワトリ'], rarity: 'common',
      desc: 'Announced the dawn, once. It was a very long night after that.',
      figure: F.tori, gimmick: { text: 'Nod' },
    },
    {
      id: 'neko', name: 'Haniwa Cat', jp: 'はにわねこ', rarity: 'uncommon',
      desc: 'Brought a clay fish to the afterlife. Has not shared it.',
      figure: F.neko, gimmick: { text: 'Tilt its head' },
    },
    {
      id: 'buta', name: 'Haniwa Boar', jp: 'はにわイノシシ', jpLines: ['はにわ', 'イノシシ'], rarity: 'rare',
      desc: 'Comes with one piglet, which was fired a size too small and has never mentioned it.',
      figure: F.buta, gimmick: { text: 'Turn its head' },
    },
    {
      id: 'uma', name: 'Dressed Haniwa Horse', jp: 'かざりうま', rarity: 'ultra',
      desc: 'Saddle, bells, bridle, best mane. Going nowhere in style since the fifth century.',
      figure: F.uma, gimmick: { text: 'Nod' },
    },
    {
      id: 'dogu', name: 'The Golden Goggle Cat', jp: 'きんのどぐうねこ', jpLines: ['きんの', 'どぐうねこ'], rarity: 'secret',
      desc: 'Older than the rest put together. Wears the goggles for the glare off its own gold.',
      figure: F.dogu, gimmick: { text: 'Turn its head' },
    },
  ],
};
