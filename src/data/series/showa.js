// Series: Shōwa Kaden (なつかし家電): tiny treasures from grandma's house.
// A sculpted series (src/figures/sets/showa.js); every miniature has a part that works.
import * as F from '../../figures/sets/showa.js';

export default {
  id: 'showa',
  order: 4,
  name: 'Shōwa Retro Appliances',
  jp: '昭和レトロ家電',
  tagline: 'Tiny treasures from grandma\'s house',
  taglineJp: 'なつかしい！おばあちゃん家の家電',
  price: 300,
  themes: ['retro', 'home'],
  card: { bg: '#f6e6c4', accent: '#d8692e', text: '#4a2a17', accent2: '#3f9a8c', pattern: 'checker' },
  capsule: { colors: [0xe9b43c, 0xd8692e, 0x5fb3a3, 0xf3e2c0, 0x9aa84a] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'suihanki', name: 'Flower Rice Cooker', jp: '花柄炊飯器', rarity: 'common',
      desc: 'Every Shōwa kitchen had one. The flowers make the rice 12% fluffier.',
      figure: F.suihanki, gimmick: { text: 'Open the lid' },
    },
    {
      id: 'kurodenwa', name: 'Black Rotary Phone', jp: '黒電話', rarity: 'common',
      desc: 'Dialling a zero takes so long you forget who you were calling.',
      figure: F.kurodenwa, gimmick: { text: 'Dial a number' },
    },
    {
      id: 'senpuki', name: 'Piano-Key Fan', jp: '扇風機', rarity: 'common',
      desc: 'Talk into the blades: "We... are... aliens..." Every kid did it.',
      figure: F.senpuki, gimmick: { text: 'Switch it on' },
    },
    {
      id: 'terebi', name: 'Wooden TV on Legs', jp: '家具調テレビ', rarity: 'uncommon',
      desc: 'Smack the side twice for a clearer picture. Grandpa\'s official method.',
      figure: F.terebi, gimmick: { text: 'Change the channel' },
    },
    {
      id: 'sentakuki', name: 'Twin-Tub Washer', jp: '二槽式洗濯機', rarity: 'uncommon',
      desc: 'Wash on the left, spin on the right, lose one sock somewhere in between.',
      figure: F.sentakuki, gimmick: { text: 'Open the lid' },
    },
    {
      id: 'rajikase', name: 'Radio-Cassette Boombox', jp: 'ラジカセ', rarity: 'rare',
      desc: 'Holds one mixtape, taped off the radio, with the DJ talking over the intro.',
      figure: F.rajikase, gimmick: { text: 'Open the deck' },
    },
    {
      id: 'kotatsu', name: 'Kotatsu & Mikan', jp: 'こたつとみかん', rarity: 'ultra',
      desc: 'Once you get in, you never get out. The cat figured this out years ago.',
      figure: F.kotatsu, gimmick: { text: 'Let the cat out' },
    },
    {
      id: 'massage', name: 'Ojii-chan\'s Massage Chair', jp: 'じいちゃんのマッサージチェア', rarity: 'secret',
      desc: 'Ten yen buys three minutes of massage. He has been asleep for forty.',
      figure: F.massage, gimmick: { text: 'Snore' },
    },
  ],
};
