// Kaiun Omamori (開運おまもり): a premium run of lucky shrine charms in lacquer and gold.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/omamori.js).
import * as F from '../../figures/sets/omamori.js';

export default {
  id: 'omamori',
  order: 12,
  name: 'Kaiun Omamori',
  jp: '開運おまもり',
  tagline: 'Premium lucky shrine charms in lacquer & gold',
  taglineJp: '福を呼ぶ！ごりやくコレクション',
  price: 1000,
  themes: ['shrine'],
  card: { bg: '#fff1e2', accent: '#c8202c', text: '#4a1218', accent2: '#e0a92e', pattern: 'waves' },
  capsule: { colors: [0xc8202c, 0xf2c14e, 0xfbf8f2, 0x241818, 0xe2452e] },
  atlas: [2048, 2560],
  items: [
    {
      id: 'pouch', name: 'Brocade Omamori', jp: '錦のお守り', rarity: 'common',
      desc: 'Do not open it. The luck leaks out. Everyone knows this.',
      figure: F.pouch,
    },
    {
      id: 'ema', name: 'Ema Horse Plaque', jp: '絵馬', rarity: 'common',
      desc: 'Wish on the back says "please let me pull the secret". Relatable.',
      figure: F.ema, gimmick: { text: 'Read the wish' },
    },
    {
      id: 'omikuji', name: 'Omikuji Box', jp: 'おみくじ箱', rarity: 'common',
      desc: 'Shaken forty-one times until it finally said 大吉. Fate was negotiated.',
      figure: F.omikuji, gimmick: { text: 'Draw a fortune' },
    },
    {
      id: 'daruma', name: 'One-Eyed Daruma', jp: '片目だるま', rarity: 'uncommon',
      desc: 'One eye in for the wish, one eye left for when it comes true. No pressure.',
      figure: F.daruma, gimmick: { text: 'Knock it over' },
    },
    {
      id: 'maneki', name: 'Maneki-neko', jp: '招き猫', rarity: 'uncommon',
      desc: 'Beckons customers, luck and, on Tuesdays, pigeons.',
      figure: F.maneki, gimmick: { text: 'Beckon' },
    },
    {
      id: 'kitsune', name: 'Inari Kitsune Guardian', jp: 'お稲荷さんの狐', rarity: 'rare',
      desc: 'Guards the shrine day and night. Accepts fried tofu as a bribe.',
      figure: F.kitsune, gimmick: { text: 'Catch its eye' },
    },
    {
      id: 'jinja', name: 'Tiny Inari Shrine', jp: 'ちいさな神社', rarity: 'ultra',
      desc: 'A whole shrine for one very small god. The lanterns stay lit all night.',
      figure: F.jinja, gimmick: { text: 'Open the doors' },
    },
    {
      id: 'takarabune', name: 'Golden Takarabune', jp: '黄金の宝船', rarity: 'secret',
      desc: 'The Seven Lucky Gods went on holiday and left the cargo. Finders keepers.',
      figure: F.takarabune, gimmick: { text: 'Rock the boat' },
    },
  ],
};
