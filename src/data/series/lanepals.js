// Lane Pals (ろじのなかま): the back lane's own people as chibi figures, built from their real specs through the chibi kit
// (src/figures/chibi.js; sculpts in src/figures/sets/lanepals.js). 全6種 + シークレット.
import * as F from '../../figures/sets/lanepals.js';

export default {
  id: 'lanepals',
  order: 12,
  name: 'Lane Pals',
  jp: 'ろじのなかま',
  romaji: 'ROJI NO NAKAMA',
  tagline: 'Everyone you know, two heads tall',
  taglineJp: 'みんな、ちいさくなっちゃった。',
  price: 200,
  themes: ['city', 'retro', 'cute'],
  card: { bg: '#f2e6cc', accent: '#c8502e', text: '#2e2a30', accent2: '#3f7a6a', pattern: 'dots' },
  capsule: { colors: [0xe8483a, 0x3f7a6a, 0xf2c84a, 0x8fbcd2], style: 'clear' },
  atlas: [2048, 2048],
  flyer: {
    maker: 'mogura', scene: 'lane', hero: 'tokuzo', side: ['senpai', 'gyaru'],
    title: [['ろじの', 2, 'b'], ['なかま', 4, 'a']],
    catch: 'みんな、ちいさくなっちゃった。', sub: 'あの路地のひとたち', gimmick: 'うでが動く！',
  },
  items: [
    {
      id: 'tokuzo', name: 'Grandpa Tokuzō', jp: 'とくぞうじいちゃん', jpLines: ['とくぞう', 'じい', 'ちゃん'], rarity: 'common',
      desc: 'Ran the garage since 1958. Still checks every capsule by hand.',
      figure: F.tokuzo, gimmick: { text: 'Hold up the capsule' },
    },
    {
      id: 'mikawa', name: 'Old Man Mikawa', jp: '三河屋のじいさん', jpLines: ['三河屋の', 'じいさん'], rarity: 'common',
      desc: 'Has stood behind that counter longer than the counter has.',
      figure: F.mikawa, gimmick: { text: 'Nod' },
    },
    {
      id: 'sensei', name: 'The Sketchbook Sensei', jp: 'スケッチ先生', jpLines: ['スケッチ', '先生'], rarity: 'uncommon',
      desc: 'Drawing you right now. Do not move. Do not ask to see it.',
      figure: F.mangaka, gimmick: { text: 'Draw a line' },
    },
    {
      id: 'senpai', name: 'Pompadour Senpai', jp: 'リーゼント先輩', jpLines: ['リーゼ', 'ント', '先輩'], rarity: 'uncommon',
      desc: 'Say one word about the hair. Go on.',
      figure: F.senpai, gimmick: { text: 'Punch' },
    },
    {
      id: 'scarbrow', name: 'Scar-Brow', jp: 'きずまゆ', rarity: 'rare',
      desc: 'Always hungry. Swipes at the air when he can\'t decide what to eat.',
      figure: F.scarbrow, gimmick: { text: 'Swipe' },
    },
    {
      id: 'gyaru', name: 'The Lane Gyaru', jp: 'ろじギャル', rarity: 'ultra',
      desc: 'Platform soles, loose socks, zero regrets.',
      figure: F.gyaru, gimmick: { text: 'Peace sign' },
    },
    {
      id: 'yabuki', name: 'The Man in the Bush', jp: 'やぶのひと', rarity: 'secret',
      desc: 'You did not see this figure. It is a bush.',
      figure: F.yabuki, gimmick: { text: 'Pop up' },
    },
  ],
};
