// Obake Yashiki (おばけ屋敷): the cast and props of a summer-festival haunted house. Scary-ish. Mostly -ish.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/obake_yashiki.js).
import * as F from '../../figures/sets/obake_yashiki.js';

export default {
  id: 'obake_yashiki',
  order: 19,
  name: 'Obake Yashiki',
  jp: 'おばけ屋敷',
  tagline: 'The haunted house cast, on duty',
  taglineJp: 'うらめしや～…こわくないよ？',
  price: 600,
  themes: ['spooky', 'weird'],
  card: { bg: '#26203a', accent: '#b6f05a', text: '#f4eee0', accent2: '#ff6a8a', pattern: 'dots' },
  capsule: { colors: [0x6a3fa0, 0xb6f05a, 0xf5efe0, 0x2a2430, 0xff8a3a] },
  atlas: [2048, 2560],
  items: [
    {
      id: 'bikkuri', name: 'Pop-Up Kasa-obake', jp: 'びっくり唐傘', rarity: 'common',
      desc: 'Springs out at exactly the wrong moment. Practises its "boo" in the mirror.',
      figure: F.bikkuri, gimmick: { text: 'Push it back in' },
    },
    {
      id: 'konnyaku', name: 'Kuroko & Konnyaku', jp: 'こんにゃく係の黒子', rarity: 'common',
      desc: 'Dangles cold konnyaku onto your neck in the dark. Feels terrible about it. Does it anyway.',
      figure: F.konnyaku, gimmick: { text: 'Dangle the konnyaku' },
    },
    {
      id: 'chochin', name: 'Chōchin-obake Signpost', jp: '道案内ちょうちん', rarity: 'common',
      desc: 'Lights the way to the exit. The exit is that way. No, the other way. Hee hee.',
      figure: F.chochin, gimmick: { text: 'Swing the lantern' },
    },
    {
      id: 'rokurokubi', name: 'Rokurokubi-san', jp: 'ろくろ首さん', rarity: 'uncommon',
      desc: 'Stretches her neck to peek over the partition. Has tied it in a bow. Again.',
      figure: F.rokurokubi, gimmick: { text: 'Peek over' },
    },
    {
      id: 'reizoko', name: 'Haunted Fridge', jp: '冷蔵庫おばけ', rarity: 'uncommon',
      desc: 'Hums at night. Opens by itself. Eats the pudding you were saving. Every time.',
      figure: F.reizoko, gimmick: { text: 'Shut the door' },
    },
    {
      id: 'okiku', name: "Okiku's Well", jp: 'お菊さんの井戸', rarity: 'rare',
      desc: '...seven, eight, nine... One plate short. Has been for centuries. Please check your bag.',
      figure: F.okiku, gimmick: { text: 'Send her back down' },
    },
    {
      id: 'yashiki', name: 'Haunted House Entrance', jp: '屋敷のいりぐち', rarity: 'ultra',
      desc: 'Enter if you dare. Exit through the gift shop. Scream optional but appreciated.',
      figure: F.yashiki, gimmick: { text: 'Buy a ticket' },
    },
    {
      id: 'kyukei', name: 'Yūrei on Lunch Break', jp: '休憩中のゆうれい', rarity: 'secret',
      desc: 'Clocked out at the stroke of midnight. Technically still haunting. Mostly snacking.',
      figure: F.kyukei, gimmick: { text: 'Take a bite' },
    },
  ],
};
