// Series 1: Mochi Mochi Animals (もちもちアニマル)
// Squishy, round mochi animals on ball-chain keychains. The starter series for the ¥100 Shōwa machine.
// A sculpted series (src/figures/sets/mochi.js); every chain swings.
import * as F from '../../figures/sets/mochi.js';

export default {
  id: 'mochi',
  order: 1,
  name: 'Mochi Mochi Animals',
  jp: 'もちもちアニマル',
  tagline: 'Squishy round animal keychains',
  taglineJp: 'ぷにぷに！まんまるキーチェーン',
  price: 100,
  themes: ['cute', 'nature'],
  card: { bg: '#ffe6ee', accent: '#ff6f91', text: '#6a2c40', pattern: 'dots', accent2: '#ffd23f' },
  capsule: { colors: [0xff9eb5, 0x9ed8ff, 0xfff09e, 0xb5f0b0, 0xffc7a0] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'shiba', name: 'Mochi Shiba', jp: 'もち柴', rarity: 'common',
      desc: 'A loaf of shiba. Smells faintly of toasted rice.',
      figure: F.shiba, gimmick: { text: 'Wag the tail' },
    },
    {
      id: 'mike', name: 'Mochi Mike-neko', jp: 'もち三毛', rarity: 'common',
      desc: 'Calico cat mochi. Three colours, zero thoughts.',
      figure: F.mike, gimmick: { text: 'Flick the tail' },
    },
    {
      id: 'hamu', name: 'Mochi Hamster', jp: 'もちハム', rarity: 'common',
      desc: 'Holding a sunflower seed like it is the last one on Earth.',
      figure: F.hamu, gimmick: { text: 'Nibble the seed' },
    },
    {
      id: 'pen', name: 'Mochi Penguin', jp: 'もちペンギン', rarity: 'uncommon',
      desc: 'Slides on its belly at 0.2 km/h. Very proud of it.',
      figure: F.pen, gimmick: { text: 'Flap the flippers' },
    },
    {
      id: 'lesser', name: 'Mochi Red Panda', jp: 'もちレッサーパンダ', rarity: 'uncommon',
      desc: 'Stands up to look scary. It does not look scary.',
      figure: F.lesser, gimmick: { text: 'Look scary' },
    },
    {
      id: 'tanuki', name: 'Leaf Tanuki', jp: 'はっぱたぬき', rarity: 'rare',
      desc: 'Places a leaf on its head to transform. Transformation pending.',
      figure: F.tanuki, gimmick: { text: 'Transform!' },
    },
    {
      id: 'tsukiusa', name: 'Moon Rabbit Mochi-tsuki', jp: '月うさぎの餅つき', rarity: 'ultra',
      desc: 'On the full moon, the rabbit pounds mochi. Pound, pound, nap.',
      figure: F.tsukiusa, gimmick: { text: 'Pound the mochi' },
    },
    {
      id: 'kagami', name: 'Kagami-Mochi Shiba', jp: '鏡もち柴', rarity: 'secret',
      desc: 'SECRET. A New Year shiba stacked like kagami mochi, with a mikan hat. Extremely auspicious.',
      figure: F.kagami, gimmick: { text: 'Swing the chain' },
    },
  ],
};
