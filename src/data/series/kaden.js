// Appliance Bugs (こんちゅう家電): the household appliances of 1999, and the insects living as them. A sculpted series
// (src/figures/sets/kaden.js). 全5種 + シークレット.
import * as F from '../../figures/sets/kaden.js';

export default {
  id: 'kaden',
  order: 7,
  name: 'Appliance Bugs',
  jp: 'こんちゅう家電',
  romaji: 'KONCHU KADEN',
  tagline: 'Plugged in, six legs out',
  taglineJp: 'コンセントに、むしがいる。',
  price: 300,
  themes: ['retro', 'home', 'weird'],
  card: { bg: '#eef0e2', accent: '#4f8a6a', text: '#2c3430', accent2: '#e0584a', pattern: 'dots' },
  capsule: { colors: [0x8fb8a8, 0xe0584a, 0x6fa8d8, 0xf6f0e2, 0x9a6a46], style: 'opaque' },
  flyer: {
    maker: 'dondoko', scene: 'room', hero: 'terebi', side: ['toaster', 'suihanki'],
    title: [['こんちゅう', 2, 'b'], ['家電', 4, 'a']],
    catch: 'コンセントに、むしがいる。', sub: 'フタ・ハネがひらく', gimmick: 'アンテナのキバが動く！',
  },
  items: [
    {
      id: 'suihanki', name: 'Rice-Cooker Beetle', jp: 'すいはんきカブト', jpLines: ['すいはんき', 'カブト'], rarity: 'common',
      desc: 'Keeps rice warm for nine hours. Keeps opinions warm for longer.',
      figure: F.suihanki, gimmick: { text: 'Open the lid' },
    },
    {
      id: 'senpuki', name: 'Fan Dragonfly', jp: 'せんぷうきトンボ', jpLines: ['せんぷうき', 'トンボ'], rarity: 'common',
      desc: 'Three speeds. Hovers at all of them. Will not oscillate, on principle.',
      figure: F.senpuki, gimmick: { text: 'Spin the blades' },
    },
    {
      id: 'iron', name: 'Iron Ladybug', jp: 'アイロンてんとう', jpLines: ['アイロン', 'てんとう'], rarity: 'uncommon',
      desc: 'Seven spots, one steam setting. Lands on shirts, leaves them neat.',
      figure: F.iron, gimmick: { text: 'Open the wing cases' },
    },
    {
      id: 'toaster', name: 'Toaster Pill Bug', jp: 'トースターだんごむし', jpLines: ['トースター', 'だんごむし'], rarity: 'rare',
      desc: 'Rolls into a ball when startled. The toast does not.',
      figure: F.toaster, gimmick: { text: 'Pop the toast' },
    },
    {
      id: 'terebi', name: 'Television Stag Beetle', jp: 'テレビクワガタ', jpLines: ['テレビ', 'クワガタ'], rarity: 'ultra',
      desc: 'Gets every channel by waving its jaws about. Tonight, it is mostly watching itself.',
      figure: F.terebi, gimmick: { text: 'Work the jaws' },
    },
    {
      id: 'heater', name: 'Heater Firefly', jp: 'ストーブホタル', jpLines: ['ストーブ', 'ホタル'], rarity: 'secret',
      desc: 'Glows all winter. Smells faintly of paraffin and summer evenings.',
      figure: F.heater, gimmick: { text: 'Open the door' },
    },
  ],
};
