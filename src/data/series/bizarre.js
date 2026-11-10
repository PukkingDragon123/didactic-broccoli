// Series: Bizarre Pose Collection (キメポーズ): strike a pose, menacingly.
// An affectionate homage to dramatic-pose manga; every character is original.
// A sculpted series (src/figures/sets/bizarre.js).
import * as F from '../../figures/sets/bizarre.js';

export default {
  id: 'bizarre',
  order: 20,
  name: 'Bizarre Pose Club',
  jp: '奇妙なポーズ部',
  tagline: 'Strike a pose. Menacingly.',
  taglineJp: 'ゴゴゴ…ポーズを決めろ！',
  price: 500,
  themes: ['weird', 'city', 'retro'],
  card: { bg: '#fbe9ff', accent: '#8a35d8', text: '#26123c', accent2: '#ff4f9a', pattern: 'stars' },
  capsule: { colors: [0x8a35d8, 0xffc21f, 0xff4f9a, 0x3fd6c8, 0xffffff] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'pointer', name: 'The Pointer', jp: 'ビシッと指差し', rarity: 'common',
      desc: 'Points straight at you with total conviction. You have done nothing. Yet.',
      figure: F.pointer, gimmick: { text: 'Point!' },
    },
    {
      id: 'salaryman', name: 'Leaning Salaryman', jp: 'のけぞりサラリーマン', rarity: 'common',
      desc: 'Leans back at an angle physics does not allow. The briefcase is somehow fine.',
      figure: F.salaryman, gimmick: { text: 'Lean back further' },
    },
    {
      id: 'gogo_cat', name: 'Menacing Calico', jp: 'ゴゴゴ三毛猫', rarity: 'common',
      desc: 'Sits perfectly still. The air around her rumbles. Nobody knows why.',
      figure: F.gogo_cat, gimmick: { text: 'Rumble' },
    },
    {
      id: 'pompadour', name: 'Pompadour Senpai', jp: 'リーゼント先輩', rarity: 'uncommon',
      desc: 'Calm, polite, unbeatable. Just never, ever say anything about the hair.',
      figure: F.pompadour, gimmick: { text: 'Do not mention the hair' },
    },
    {
      id: 'tbc', name: 'To Be Continued', jp: 'つづく', rarity: 'uncommon',
      desc: 'Frozen mid-jump, in sepia. The next episode airs in an undisclosed number of years.',
      figure: F.tbc, gimmick: { text: 'Hold the pose' },
    },
    {
      id: 'phantom', name: 'Phantom Partner', jp: 'うしろの相棒', rarity: 'rare',
      desc: 'Her guardian spirit copies every pose half a second late. She insists it is on purpose.',
      figure: F.phantom, gimmick: { text: 'Strike the pose' },
    },
    {
      id: 'watch', name: 'Time-Stop Pocket Watch', jp: '時止めの懐中時計', rarity: 'ultra',
      desc: 'The tea has been in mid-air for nine seconds. The butler has been bowing since Tuesday.',
      figure: F.watch, gimmick: { text: 'Start time again' },
    },
    {
      id: 'alley', name: 'Ghost Alley Girl', jp: '小道のおばけ少女', rarity: 'secret',
      desc: 'A friendly guide to the back alley. Walk with her as far as you like. Just never look back.',
      figure: F.alley, gimmick: { text: 'Look back' },
    },
  ],
};
