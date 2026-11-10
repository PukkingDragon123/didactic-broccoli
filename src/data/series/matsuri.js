// Natsu Matsuri Yomise (夏まつり夜店): summer festival stalls under paper lanterns.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/matsuri.js).
import * as F from '../../figures/sets/matsuri.js';

export default {
  id: 'matsuri',
  order: 15,
  name: 'Natsu Matsuri Yomise',
  jp: '夏まつり夜店',
  tagline: 'Summer festival stalls under paper lanterns',
  taglineJp: 'ドンドン、ヒュ～、夏の夜！',
  price: 400,
  themes: ['retro', 'shrine', 'food'],
  card: { bg: '#ffeccc', accent: '#e5383b', text: '#2e1c3a', accent2: '#2f5fb8', pattern: 'waves' },
  capsule: { colors: [0xe5383b, 0xffffff, 0x2f5fb8, 0xffd23f, 0xff8a5a] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'kingyo', name: 'Goldfish in a Bag', jp: '金魚ぶくろ', rarity: 'common',
      desc: 'Scooped on the fifth try. Has already been named "Captain" by the whole family.',
      figure: F.kingyo, gimmick: { text: 'Watch Captain swim' },
    },
    {
      id: 'yoyo', name: 'Yo-yo Balloon', jp: 'ヨーヨーつり', rarity: 'common',
      desc: 'Bounces back every time. Pops on the walk home, every year, without fail.',
      figure: F.yoyo, gimmick: { text: 'Bounce it' },
    },
    {
      id: 'kitsune', name: 'Fox Mask', jp: 'きつねのお面', rarity: 'common',
      desc: 'Worn on the side of the head, the official way. The fox does not mind either way.',
      figure: F.kitsune, gimmick: { text: 'Tilt the mask' },
    },
    {
      id: 'chocoban', name: 'Choco Banana Trio', jp: 'チョコバナナ', rarity: 'uncommon',
      desc: 'Rock-paper-scissors for a bonus banana. Lost. Bought three anyway.',
      figure: F.chocoban, gimmick: { text: 'Wobble the bananas' },
    },
    {
      id: 'wataame', name: 'Wataame Girl', jp: 'わたあめちゃん', rarity: 'uncommon',
      desc: 'Cotton candy bigger than her head, fox mask on the side, goldfish in hand. Peak summer.',
      figure: F.wataame, gimmick: { text: 'Wave the candy' },
    },
    {
      id: 'takoyaki', name: 'Takoyaki Stall', jp: 'たこ焼き屋台', rarity: 'rare',
      desc: 'Eight balls a boat, one octopus each. The mascot on the roof has no comment.',
      figure: F.takoyaki, gimmick: { text: 'Wave to the octopus' },
    },
    {
      id: 'yagura', name: 'Bon Odori Yagura', jp: '盆踊りやぐら', rarity: 'ultra',
      desc: 'The taiko kid has been drumming since sunset. The aunties will not let him stop.',
      figure: F.yagura, gimmick: { text: 'Beat the drum' },
    },
    {
      id: 'gyakuten', name: 'Goldfish Strikes Back', jp: '逆・金魚すくい', rarity: 'secret',
      desc: 'Tonight the goldfish is doing the scooping. Prize: one very surprised child.',
      figure: F.gyakuten, gimmick: { text: 'Scoop the child' },
    },
  ],
};
