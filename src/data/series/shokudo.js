// Tiny Shokudō (ミニチュア食堂): hyper-real miniature diner food, like the samples in a shop window.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/shokudo.js).
import * as F from '../../figures/sets/shokudo.js';

export default {
  id: 'shokudo',
  order: 2,
  name: 'Tiny Shokudō',
  jp: 'ミニチュア食堂',
  tagline: 'Hyper-real miniature diner food',
  taglineJp: '本物そっくり！食品サンプル',
  price: 200,
  themes: ['food', 'retro'],
  card: { bg: '#fff3d6', accent: '#e34234', text: '#3a2410', accent2: '#2f6fd6', pattern: 'checker' },
  capsule: { colors: [0xffd447, 0xe34234, 0xfbf8f2, 0x8fb85a, 0xf2c27b] },
  atlas: [2048, 2560],
  items: [
    {
      id: 'onigiri', name: 'Onigiri Trio', jp: 'おにぎり三兄弟', rarity: 'common',
      desc: 'Ume, salmon and grilled. Hand-pressed by a grandma who says "eat more".',
      figure: F.onigiri,
    },
    {
      id: 'tamago', name: 'Tamagoyaki Board', jp: '玉子焼き', rarity: 'common',
      desc: 'Rolled omelette, sliced on a hinoki board. Sweet style, as is tradition.',
      figure: F.tamago,
    },
    {
      id: 'takoyaki', name: 'Takoyaki Boat', jp: 'たこ焼き舟', rarity: 'common',
      desc: 'Six octopus balls at the temperature of the sun. Bonito flakes still dancing.',
      figure: F.takoyaki, gimmick: { text: 'Fan the bonito flakes' },
    },
    {
      id: 'ramen', name: 'Shoyu Ramen', jp: '醤油ラーメン', rarity: 'uncommon',
      desc: 'The noodle lift is frozen forever. The chopsticks are tired.',
      figure: F.ramen, gimmick: { text: 'Dip the noodles' },
    },
    {
      id: 'soba', name: 'Ebi Tempura Soba Set', jp: '天ざるそば', rarity: 'uncommon',
      desc: 'Two prawns, one shishito, zero regrets. Slurping loudly is good manners.',
      figure: F.soba,
    },
    {
      id: 'omurice', name: 'Ketchup-Heart Omurice', jp: 'オムライス', rarity: 'rare',
      desc: 'Comes with a flag. Every adult who orders it secretly wants the flag.',
      figure: F.omurice, gimmick: { text: 'Turn the flag' },
    },
    {
      id: 'sushi', name: 'Sushi Geta Platter', jp: '寿司下駄盛り', rarity: 'ultra',
      desc: 'Chef’s choice. The chef chose “all the good ones”.',
      figure: F.sushi,
    },
    {
      id: 'yatai', name: 'Neko Yatai', jp: 'ねこ屋台', rarity: 'secret',
      desc: 'Opens at midnight. Accepts payment in dried sardines only.',
      figure: F.yatai, gimmick: { text: 'Ladle the oden' },
    },
  ],
};
