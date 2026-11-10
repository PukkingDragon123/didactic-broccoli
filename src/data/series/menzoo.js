// Men-Zoo (めんズー): animals made of noodles. A sculpted series (src/figures). 全5種 + シークレット.
import * as F from '../../figures/sets/menzoo.js';

export default {
  id: 'menzoo',
  order: 10,
  name: 'Men-Zoo',
  jp: 'めんズー',
  romaji: 'MEN-ZOO NOODLE ANIMALS',
  tagline: 'Animals made entirely of noodles',
  taglineJp: 'のびるまえに、あつめて。',
  price: 400,
  themes: ['food', 'weird', 'cute'],
  card: { bg: '#fbefc8', accent: '#d9482e', text: '#3a2a22', accent2: '#f2b23a', pattern: 'waves' },
  capsule: { colors: [0xf2d27c, 0xd94a30, 0x86c462, 0x2e426a, 0xf7f3e8] },
  atlas: [2048, 1536], // (noodles are painted all over: more patches than a plain-coloured set)
  flyer: {
    maker: 'manpuku', scene: 'counter', hero: 'ramen', side: ['kitsune', 'hiyashi'],
    title: [['めんの動物園', 2, 'b'], ['めんズー', 4, 'a']],
    catch: 'めんでできた、どうぶつたち。', sub: 'のびるまえにあつめよう', gimmick: 'おはしで持ちあげギミック！',
  },
  items: [
    {
      id: 'kitsune', name: 'Kitsune Udon', jp: 'きつねうどん（本物）', rarity: 'common',
      desc: 'Fox udon, with the fox. It is asleep and would like the tofu back.',
      figure: F.kitsune, gimmick: { text: 'Lift the fried tofu' },
    },
    {
      id: 'soba', name: 'Zaru-Soba Sloth', jp: 'ざるそばナマケモノ', rarity: 'common',
      desc: 'Has been lifted for a photograph since lunch. Has not complained.',
      figure: F.soba, gimmick: { text: 'Give it a swing' },
    },
    {
      id: 'ramen', name: 'Ramen Mammoth', jp: 'ラーメンマンモス', rarity: 'uncommon',
      desc: 'Extinct for ten thousand years. Best eaten within ten minutes.',
      figure: F.ramen, gimmick: { text: 'Raise the trunk' },
    },
    {
      id: 'hiyashi', name: 'Chilled-Noodle Peacock', jp: '冷やし中華クジャク', rarity: 'rare',
      desc: 'Summer only. Opens its fan of cucumber and ham for nobody in particular.',
      figure: F.hiyashi, gimmick: { text: 'Fold the fan' },
    },
    {
      id: 'yakisoba', name: 'Yakisoba Lion', jp: '焼きそばライオン', rarity: 'ultra',
      desc: 'King of the hot plate. Knows exactly how good the mane looks.',
      figure: F.yakisoba, gimmick: { text: 'Wobble the head' },
    },
    {
      id: 'nobi', name: 'Three Hours Later', jp: '三時間後', rarity: 'secret',
      desc: 'Someone said three minutes. That was three hours ago. It has made its peace.',
      figure: F.nobi, gimmick: { text: 'Close the lid on it' },
    },
  ],
};
