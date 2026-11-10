// Neko Kissaten Hidamari (ねこ喫茶ひだまり): chibi cats running a retro coffee shop.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/neko_cafe.js).
import * as F from '../../figures/sets/neko_cafe.js';

export default {
  id: 'neko_cafe',
  order: 13,
  name: 'Neko Kissaten Hidamari',
  jp: 'ねこ喫茶ひだまり',
  tagline: 'Chibi cats running a retro coffee shop',
  taglineJp: 'いらっしゃいませニャ！',
  price: 300,
  themes: ['cute', 'food', 'home'],
  card: { bg: '#fbefdc', accent: '#c8553d', text: '#4a2a1e', accent2: '#3f8f6a', pattern: 'checker' },
  capsule: { colors: [0xfff4dc, 0xc8553d, 0x8a5a3a, 0x7fd99a, 0xffc7d4] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'tora', name: 'Barista Tora', jp: 'ドリップ係のトラ', rarity: 'common',
      desc: 'Pours the coffee one drop at a time. Then stares at each drop. Then naps.',
      figure: F.tora, gimmick: { text: 'Pour a drop' },
    },
    {
      id: 'shiro', name: 'Waiter Shiro', jp: 'ウェイターのシロ', rarity: 'common',
      desc: 'Carries the cream soda with total focus. Has never spilled. Has never delivered.',
      figure: F.shiro, gimmick: { text: 'Wobble the tray' },
    },
    {
      id: 'kuro', name: 'Kuro & Hot Cake', jp: 'ホットケーキのクロ', rarity: 'common',
      desc: 'Three hot cakes, one butter, zero sharing. The syrup is also hers.',
      figure: F.kuro, gimmick: { text: 'Eye up the cakes' },
    },
    {
      id: 'mike', name: 'Cream Soda Mike', jp: 'クリームソーダ三毛', rarity: 'uncommon',
      desc: 'Fell in once. Decided to stay. The ice cream hat is non-negotiable.',
      figure: F.mike, gimmick: { text: 'Climb out' },
    },
    {
      id: 'hachi', name: 'Siphon Master Hachi', jp: 'サイフォン名人ハチ', rarity: 'uncommon',
      desc: 'Wears glasses for the science look. They have no lenses. The coffee is excellent.',
      figure: F.hachi,
    },
    {
      id: 'morning', name: 'Morning Set Counter', jp: 'モーニングセット', rarity: 'rare',
      desc: 'Order one coffee, receive toast, an egg and a cat. Kissaten rules.',
      figure: F.morning, gimmick: { text: 'Wake the cat' },
    },
    {
      id: 'store', name: 'Kissaten Storefront', jp: 'ねこ喫茶の店先', rarity: 'ultra',
      desc: 'Open from 7am until the cat in the window wakes up. So, roughly forever.',
      figure: F.store, gimmick: { text: 'Open the door' },
    },
    {
      id: 'latte', name: 'Latte Art Neko', jp: 'ラテアートねこ', rarity: 'secret',
      desc: 'The barista asked for cat latte art. This is the cat latte art.',
      figure: F.latte, gimmick: { text: 'Lift the foam' },
    },
  ],
};
