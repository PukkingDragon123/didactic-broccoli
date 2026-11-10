// Yurui Yōkai (ゆるい妖怪): cute, slightly spooky folklore spirits. Mostly harmless. Mostly.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/yokai.js).
import * as F from '../../figures/sets/yokai.js';

export default {
  id: 'yokai',
  order: 7,
  name: 'Yurui Yōkai',
  jp: 'ゆるい妖怪',
  tagline: 'Cute, slightly spooky folklore spirits',
  taglineJp: 'こわくない…たぶん。',
  price: 400,
  themes: ['spooky', 'shrine', 'cute'],
  card: { bg: '#2c2447', accent: '#8fe3ff', text: '#f6efe0', accent2: '#ff9a3c', pattern: 'stars' },
  capsule: { colors: [0x6a4fb3, 0x8fe3ff, 0xff9a3c, 0xf5efe0, 0x5fbf6a] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'chochin', name: 'Chōchin-obake', jp: '提灯お化け', rarity: 'common',
      desc: 'Turned 100 years old and became a yōkai. Still only gives off about 40 watts.',
      figure: F.chochin, gimmick: { text: 'Stick out the tongue' },
    },
    {
      id: 'kappa', name: 'Kappa & Cucumber', jp: 'きゅうり河童', rarity: 'common',
      desc: 'Bows politely, spills the water from its head-plate, loses all power. Every time.',
      figure: F.kappa, gimmick: { text: 'Take a bow' },
    },
    {
      id: 'hitotsume', name: 'Hitotsume-kozō', jp: '一つ目小僧', rarity: 'common',
      desc: 'Jumps out, sticks his tongue out to scare you, then apologises for startling you.',
      figure: F.hitotsume, gimmick: { text: 'Apologise' },
    },
    {
      id: 'kitsune', name: 'Fox-fire Kitsune', jp: '狐火きつね', rarity: 'uncommon',
      desc: 'Its tail-flames could guide lost travellers home. It uses them to toast fried tofu.',
      figure: F.kitsune, gimmick: { text: 'Wave the fox-fire' },
    },
    {
      id: 'tengu', name: 'Karasu-tengu', jp: '烏天狗', rarity: 'uncommon',
      desc: 'One flap of his leaf fan summons a mountain gale. Mostly used to dry laundry.',
      figure: F.tengu, gimmick: { text: 'Fan a gale' },
    },
    {
      id: 'zashiki', name: 'Zashiki-warashi', jp: '座敷わらし', rarity: 'rare',
      desc: 'Brings good fortune to any house she plays in. Rent-free. Eats all the snacks.',
      figure: F.zashiki, gimmick: { text: 'Spin the top' },
    },
    {
      id: 'nekomata', name: 'Dancing Nekomata', jp: '踊る猫又', rarity: 'ultra',
      desc: 'Live to 100, grow a second tail, put a towel on your head and dance. Cat rules.',
      figure: F.nekomata, gimmick: { text: 'Dance' },
    },
    {
      id: 'nurikabe', name: 'Nurikabe', jp: 'ぬりかべ', rarity: 'secret',
      desc: 'Blocks your path at night. Tap its feet with a stick and it leaves. It is a wall.',
      figure: F.nurikabe, gimmick: { text: 'Tap its feet' },
    },
  ],
};
