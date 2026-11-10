// Pachimon Paradise (パチモンパラダイス): affectionate, "totally official" bootleg blob friends. Original designs and names,
// no logos. A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/pachimon.js).
import * as F from '../../figures/sets/pachimon.js';

export default {
  id: 'pachimon',
  order: 9,
  name: 'Pachimon Paradise',
  jp: 'パチモンパラダイス',
  tagline: 'Totally official bootleg friends',
  taglineJp: 'たぶん公式！ニセモノなかま',
  price: 400,
  themes: ['cute', 'weird'],
  card: { bg: '#fff4f8', accent: '#8a5bd6', text: '#3a2440', accent2: '#ffd23f', pattern: 'stars' },
  capsule: { colors: [0xffffff, 0xffc2d4, 0xc7b3f0, 0xfff2b3], style: 'opaque' },
  atlas: [2048, 1536],
  items: [
    {
      id: 'chibikuma', name: 'Teary Chibikuma', jp: 'なきむしちびくま', rarity: 'common',
      desc: 'Tiny, round, crying about weeding. You would cry too. It is so much weeding.',
      figure: F.chibikuma, gimmick: { text: 'Keep weeding' },
    },
    {
      id: 'wareneko', name: 'Splitface Kitty', jp: 'われわれねこ', rarity: 'common',
      desc: 'Half blue, half white, all heart. Says "it\'ll be fine!" right before it isn\'t.',
      figure: F.wareneko, gimmick: { text: 'Wave it off' },
    },
    {
      id: 'wahoousa', name: 'Wahoo Bunny', jp: 'ワッホーうさぎ', rarity: 'common',
      desc: 'Yells WAHOO at everything. Eats your snacks. Somehow everyone\'s favourite.',
      figure: F.wahoousa, gimmick: { text: 'Flop the ears' },
    },
    {
      id: 'gogomochi', name: 'Menacing Mochi', jp: 'ゴゴゴもち', rarity: 'uncommon',
      desc: 'Strikes a pose so twisted its spine is a rumour. The air around it says ゴゴゴ.',
      figure: F.gogomochi, gimmick: { text: 'Rumble' },
    },
    {
      id: 'standsan', name: 'Stand-in Spirit', jp: 'スタンドさん', rarity: 'uncommon',
      desc: 'A shy blob and the enormous muscly spirit that does all its talking. Very loudly. (Sorry.)',
      figure: F.standsan, gimmick: { text: 'Punch (politely)' },
    },
    {
      id: 'roadroller', name: 'It Was Me, Roller!', jp: 'ロードローラーだっ', rarity: 'rare',
      desc: 'A blond blob drops a road roller on its problems. The problems remain. The roller is cute.',
      figure: F.roadroller, gimmick: { text: 'Roll it' },
    },
    {
      id: 'kinusa', name: 'Golden Wind Bunny', jp: 'こがねかぜうさぎ', rarity: 'ultra',
      desc: 'Has a dream. Has a ladybug brooch. Has a very specific hairdo. Gleams.',
      figure: F.kinusa, gimmick: { text: 'Twitch an ear' },
    },
    {
      id: 'tokitome', name: 'Time-Stop Clock Blob', jp: 'ときとめどけい', rarity: 'secret',
      desc: 'Its belly clock says 12:00. It has always said 12:00. Did you just blink? It didn\'t.',
      figure: F.tokitome, gimmick: { text: 'Start the clock' },
    },
  ],
};
