// Line-Dried Animals (干したてどうぶつ): animals pegged out on the balcony to dry, resigned to it. A sculpted series
// (src/figures/sets/hoshitate.js). 全5種 + シークレット.
import * as F from '../../figures/sets/hoshitate.js';

export default {
  id: 'hoshitate',
  order: 2,
  name: 'Line-Dried Animals',
  jp: '干したてどうぶつ',
  romaji: 'HOSHITATE DOUBUTSU',
  tagline: 'Washed, wrung out, pegged up',
  taglineJp: 'きょうは、よく乾く。',
  price: 200,
  themes: ['home', 'cute', 'weird'],
  card: { bg: '#e4f0f6', accent: '#4f8fc0', text: '#2a3442', accent2: '#f2a7b0', pattern: 'stripes' },
  capsule: { colors: [0x8fbcd2, 0xf2a7b0, 0x9fd6c2, 0xf6d77a], style: 'clear' },
  atlas: [2048, 1536],
  flyer: {
    maker: 'kamenoko', scene: 'sky', hero: 'shirt', side: ['futon', 'towel'],
    title: [['干したて', 4, 'b'], ['どうぶつ', 2, 'a']],
    catch: 'きょうは、よく乾く。', sub: 'せんたくばさみつき', gimmick: 'ハンガーがくるっと回る！',
  },
  items: [
    {
      id: 'towel', name: 'Towel Cat', jp: 'タオルねこ', rarity: 'common',
      desc: 'Washed at forty degrees. Has not forgiven anyone.',
      figure: F.towel, gimmick: { text: 'Lift its head' },
    },
    {
      id: 'sock', name: 'Sock Ferret', jp: 'くつしたイタチ', jpLines: ['くつした', 'イタチ'], rarity: 'common',
      desc: 'One of a pair. The other one is also a ferret, somewhere.',
      figure: F.sock, gimmick: { text: 'Turn the hanger' },
    },
    {
      id: 'octo', name: 'Octopus Pinch-Hanger', jp: 'たこハンガー', jpLines: ['たこ', 'ハンガー'], rarity: 'uncommon',
      desc: 'Eight arms, four pegs, no complaints. Well, one.',
      figure: F.octo, gimmick: { text: 'Spin the octopus' },
    },
    {
      id: 'futon', name: 'Futon Tanuki', jp: 'ふとんだぬき', jpLines: ['ふとん', 'だぬき'], rarity: 'rare',
      desc: 'Aired every Sunday. Sleeps better than you do.',
      figure: F.futon, gimmick: { text: 'Swing the beater' },
    },
    {
      id: 'shirt', name: 'Hanger Penguin', jp: 'ハンガーペンギン', jpLines: ['ハンガー', 'ペンギン'], rarity: 'ultra',
      desc: 'Pressed, buttoned, tie on. Ready for Monday. Monday is not ready for it.',
      figure: F.shirt, gimmick: { text: 'Flap the sleeves' },
    },
    {
      id: 'wani', name: 'The Peg Crocodile', jp: 'せんたくばさみワニ', rarity: 'secret',
      desc: 'Holds one sock very firmly. Will not say whose.',
      figure: F.wani, gimmick: { text: 'Open the jaw' },
    },
  ],
};
