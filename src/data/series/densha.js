// Chibi Densha (ちびでんしゃ大集合): pocket trains with very big faces.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/densha.js).
import * as F from '../../figures/sets/densha.js';

export default {
  id: 'densha',
  order: 17,
  name: 'Chibi Densha',
  jp: 'ちびでんしゃ大集合',
  tagline: 'Pocket trains with very big faces',
  taglineJp: 'ガタンゴトン！しゅっぱつしんこう',
  price: 300,
  themes: ['city', 'retro'],
  card: { bg: '#e4f1fb', accent: '#2f7fd0', text: '#1e2f4a', accent2: '#8cc63f', pattern: 'stripes' },
  capsule: { colors: [0x8cc63f, 0x2f7fd0, 0xffd23f, 0xffffff, 0xe5383b] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'loop', name: 'Loop Line Densha', jp: '環状線でんしゃ', rarity: 'common',
      desc: 'Goes round and round the city all day. Has never once been late or dizzy.',
      figure: F.loop, gimmick: { text: 'Lower the pantograph' },
    },
    {
      id: 'tram', name: 'Chin-Chin Tram', jp: 'ちんちん電車', rarity: 'common',
      desc: 'Rings its little bell at every corner. Chin-chin! Chin-chin! Thank you, chin-chin.',
      figure: F.tram, gimmick: { text: 'Ring the bell' },
    },
    {
      id: 'ekiben', name: 'Ekiben-chan', jp: '駅弁ちゃん', rarity: 'common',
      desc: 'Tastes twice as good when eaten at 80 km/h with a view of rice fields.',
      figure: F.ekiben, gimmick: { text: 'Open the lid' },
    },
    {
      id: 'ekicho', name: 'Station Master Mike', jp: '駅長ねこ', rarity: 'uncommon',
      desc: 'Official station master. Duties: napping on the ticket gate, accepting chin scritches.',
      figure: F.ekicho, gimmick: { text: 'Wave the flag' },
    },
    {
      id: 'dango', name: 'Dango-Nose Shinkansen', jp: 'だんごっ鼻の新幹線', rarity: 'uncommon',
      desc: 'The original round-nosed bullet train. Smiles at 210 km/h and waves with its wipers.',
      figure: F.dango, gimmick: { text: 'Wave the wipers' },
    },
    {
      id: 'fumikiri', name: 'Kan-Kan Crossing', jp: 'カンカン踏切', rarity: 'rare',
      desc: 'Kan-kan-kan-kan... Shiba has been waiting for the train since breakfast. It is a good wait.',
      figure: F.fumikiri, gimmick: { text: 'Raise the gate' },
    },
    {
      id: 'mujineki', name: 'Countryside Station', jp: 'いなかの無人駅', rarity: 'ultra',
      desc: 'Two trains a day. The cat on the bench is the only one who knows the timetable.',
      figure: F.mujineki, gimmick: { text: 'See the train off' },
    },
    {
      id: 'yellow', name: 'Lucky Yellow Inspector', jp: '幸せの黄色い検測車', rarity: 'secret',
      desc: 'Spot it and you get a lucky day. It is quietly inspecting your luck, too.',
      figure: F.yellow, gimmick: { text: 'Inspect your luck' },
    },
  ],
};
