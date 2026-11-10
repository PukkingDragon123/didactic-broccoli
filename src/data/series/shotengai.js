// Animal Shopping Street (どうぶつ商店街): the shops of a back-lane shotengai, each run by an animal with a straight face.
// Little shop-front dioramas; the roller shutter comes down. A sculpted series (src/figures/sets/shotengai.js).
// 全5種 + シークレット.
import * as F from '../../figures/sets/shotengai.js';

export default {
  id: 'shotengai',
  order: 14,
  name: 'Animal Shopping Street',
  jp: 'どうぶつ商店街',
  romaji: 'DOUBUTSU SHOTENGAI',
  tagline: 'Open until the owner gets sleepy',
  taglineJp: 'いらっしゃい。',
  price: 500,
  themes: ['city', 'retro', 'cute'],
  card: { bg: '#f2e8da', accent: '#c8402e', text: '#3a2a20', accent2: '#3f6fb8', pattern: 'stripes' },
  capsule: { colors: [0xd9483a, 0x3f6fb8, 0x6fae7a, 0xf2e2c8, 0xc9ced4], style: 'tab' },
  atlas: [2048, 2048],
  flyer: {
    maker: 'tsukushi', scene: 'shutters', hero: 'kissa', side: ['hanaya', 'sakana'],
    title: [['どうぶつ', 2, 'b'], ['商店街', 4, 'a']],
    catch: 'へい、いらっしゃい。', sub: 'ミニチュアのお店', gimmick: 'シャッターがおりる！',
  },
  items: [
    {
      id: 'taiyaki', name: 'Taiyaki Sea Bream', jp: 'たいやき屋のタイ', jpLines: ['たいやき屋', 'のタイ'], rarity: 'common',
      desc: 'Makes fish-shaped cakes all day. Does not see the problem.',
      figure: F.taiyaki, gimmick: { text: 'Pull the shutter down' },
    },
    {
      id: 'kuji', name: 'Lottery-Booth Tortoise', jp: '宝くじ屋のカメ', jpLines: ['宝くじ屋', 'のカメ'], rarity: 'common',
      desc: 'Has sold three winning tickets in forty years. Remembers every one.',
      figure: F.kuji, gimmick: { text: 'Pull the shutter down' },
    },
    {
      id: 'sakana', name: 'Fishmonger Cat', jp: 'さかな屋のネコ', jpLines: ['さかな屋', 'のネコ'], rarity: 'uncommon',
      desc: 'Every fish fresh today. Some fresher than others. One is for later.',
      figure: F.sakana, gimmick: { text: 'Pull the shutter down' },
    },
    {
      id: 'hanaya', name: 'Flower-Shop Bear', jp: 'はな屋のクマ', jpLines: ['はな屋', 'のクマ'], rarity: 'rare',
      desc: 'Waters the pails twice a day and the customers once.',
      figure: F.hanaya, gimmick: { text: 'Pull the shutter down' },
    },
    {
      id: 'kissa', name: 'Coffee-Shop Owl', jp: '喫茶店のフクロウ', jpLines: ['喫茶店の', 'フクロウ'], rarity: 'ultra',
      desc: 'Siphon coffee, a cream soda in the window, open till late. Obviously.',
      figure: F.kissa, gimmick: { text: 'Pull the shutter down' },
    },
    {
      id: 'sento', name: 'Bathhouse Capybara', jp: 'せんとうのカピバラ', jpLines: ['せんとうの', 'カピバラ'], rarity: 'secret',
      desc: 'Minds the desk, the change and an orange. Never leaves the warm side.',
      figure: F.sento, gimmick: { text: 'Lift the noren' },
    },
  ],
};
