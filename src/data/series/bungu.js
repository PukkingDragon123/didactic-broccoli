// Stationery Zoo (ぶんぐどうぶつ): the things in a school desk, and the animals they turned out to be. A sculpted series
// (src/figures/sets/bungu.js). 全5種 + シークレット.
import * as F from '../../figures/sets/bungu.js';

export default {
  id: 'bungu',
  order: 4,
  name: 'Stationery Zoo',
  jp: 'ぶんぐどうぶつ',
  romaji: 'BUNGU DOUBUTSU',
  tagline: 'Everything in the pencil case has a pulse',
  taglineJp: 'つくえの中は、どうぶつえん。',
  price: 300,
  themes: ['school', 'cute', 'retro'],
  card: { bg: '#f4efe0', accent: '#3f6fb8', text: '#2c3442', accent2: '#f2c23a', pattern: 'grid' },
  capsule: { colors: [0x3f6fb8, 0xf2c23a, 0x6cc0b0, 0xf2a0a8, 0xf6f4ee], style: 'tab' },
  atlas: [2048, 1536],
  flyer: {
    maker: 'hoshimaru', scene: 'desk', hero: 'compass', side: ['sharpener', 'tape'],
    title: [['ぶんぐ', 4, 'b'], ['どうぶつ', 2, 'a']],
    catch: 'つくえの中は、どうぶつえん。', sub: 'ほんとに動くギミックつき', gimmick: 'ハンドルがまわる！',
  },
  items: [
    {
      id: 'eraser', name: 'Eraser Seal', jp: 'けしゴムアザラシ', jpLines: ['けしゴム', 'アザラシ'], rarity: 'common',
      desc: 'Rubs out mistakes. Has never made one, it says.',
      figure: F.eraser, gimmick: { text: 'Slide the sleeve off' },
    },
    {
      id: 'tape', name: 'Tape Snail', jp: 'セロテープかたつむり', jpLines: ['セロテープ', 'かたつむり'], rarity: 'common',
      desc: 'Carries a whole roll on its back. Sticks to the plan.',
      figure: F.tape, gimmick: { text: 'Turn the roll' },
    },
    {
      id: 'stapler', name: 'Stapler Shark', jp: 'ホチキスザメ', jpLines: ['ホチキス', 'ザメ'], rarity: 'uncommon',
      desc: 'Twenty sheets in one bite. Mostly homework.',
      figure: F.stapler, gimmick: { text: 'Open the jaw' },
    },
    {
      id: 'sharpener', name: 'Sharpener Hedgehog', jp: 'えんぴつけずりハリネズミ', jpLines: ['えんぴつけずり', 'ハリネズミ'], rarity: 'rare',
      desc: 'Every pencil in the class ends up in its back eventually.',
      figure: F.sharpener, gimmick: { text: 'Turn the crank' },
    },
    {
      id: 'compass', name: 'Compass Flamingo', jp: 'コンパスフラミンゴ', jpLines: ['コンパス', 'フラミンゴ'], rarity: 'ultra',
      desc: 'Stands on one leg, draws with the other. The circles are perfect. The bird is unbearable about it.',
      figure: F.compass, gimmick: { text: 'Open the legs' },
    },
    {
      id: 'abacus', name: 'Abacus Caterpillar', jp: 'そろばんいもむし', jpLines: ['そろばん', 'いもむし'], rarity: 'secret',
      desc: 'Adds itself up to five. Will be a butterfly in the next column.',
      figure: F.abacus, gimmick: { text: 'Look round' },
    },
  ],
};
