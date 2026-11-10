// Konbini Life (コンビニライフ): a corner shop, open 24 hours, in your pocket.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/konbini.js).
import * as F from '../../figures/sets/konbini.js';

export default {
  id: 'konbini',
  order: 5,
  name: 'Konbini Life',
  jp: 'コンビニライフ',
  tagline: 'Open 24 hours, in your pocket',
  taglineJp: 'いらっしゃいませ〜！',
  price: 300,
  themes: ['food', 'city'],
  card: { bg: '#eef8f0', accent: '#2fae66', text: '#1f3a2c', accent2: '#ff8c2e', pattern: 'stripes' },
  capsule: { colors: [0x3cae5a, 0xff8c2e, 0x5cc4ff, 0xfbf8f2, 0xffd23f] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'onigiri', name: 'Salmon Onigiri', jp: '鮭おにぎり', rarity: 'common',
      desc: 'Pull tab 1, then 2, then 3. The nori still tears. Every. Single. Time.',
      figure: F.onigiri, gimmick: { text: 'Pull tab 1' },
    },
    {
      id: 'melonsoda', name: 'Melon Soda', jp: 'メロンソーダ', rarity: 'common',
      desc: 'Tastes of no melon ever grown on Earth. Perfect.',
      figure: F.melonsoda, gimmick: { text: 'Pop the cap' },
    },
    {
      id: 'cancoffee', name: 'Hot Canned Coffee', jp: 'ホット缶コーヒー', rarity: 'common',
      desc: 'Too hot to hold, too precious to put down. A ¥130 hand-warmer.',
      figure: F.cancoffee, gimmick: { text: 'Lift the tab' },
    },
    {
      id: 'oden', name: 'Konbini Oden', jp: 'おでん', rarity: 'uncommon',
      desc: 'Daikon, egg, konnyaku, chikuwa. The broth has been simmering since 1987.',
      figure: F.oden, gimmick: { text: 'Ladle the broth' },
    },
    {
      id: 'bento', name: 'Makunouchi Bento', jp: '幕の内弁当', rarity: 'uncommon',
      desc: 'Something for everyone, plus one tiny fish full of soy sauce.',
      figure: F.bento, gimmick: { text: 'Lift the lid' },
    },
    {
      id: 'nikuman', name: 'Nikuman Steamer', jp: '中華まんスチーマー', rarity: 'rare',
      desc: 'One of the buns is not like the others. It is looking at you.',
      figure: F.nikuman, gimmick: { text: 'Meet its gaze' },
    },
    {
      id: 'storefront', name: 'Corner Konbini', jp: '街角のコンビニ', rarity: 'ultra',
      desc: 'Open 24 hours, 365 days. You will hear the door chime in your dreams.',
      figure: F.storefront, gimmick: { text: 'Walk in' },
    },
    {
      id: 'nekotenin', name: 'Night-Shift Cat Clerk', jp: '深夜のネコ店員', rarity: 'secret',
      desc: 'Scans everything twice just to hear the beep. Accepts payment in fish.',
      figure: F.nekotenin, gimmick: { text: 'Scan it twice' },
    },
  ],
};
