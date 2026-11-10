// Boxed-In Animals (箱入りどうぶつ): animals that live in, or simply are, the boxes around the house.
// A sculpted series (src/figures). 全5種 + シークレット. Every box opens.
import * as F from '../../figures/sets/hakoiri.js';

export default {
  id: 'hakoiri',
  order: 3,
  name: 'Boxed-In Animals',
  jp: '箱入りどうぶつ',
  romaji: 'HAKOIRI DOUBUTSU',
  tagline: 'Sheltered animals in household boxes',
  taglineJp: 'あけたら、いた。',
  price: 300,
  themes: ['home', 'cute', 'retro'],
  card: { bg: '#e9f1e6', accent: '#3f7fc6', text: '#2c3442', accent2: '#f2a4b4', pattern: 'grid' },
  capsule: { colors: [0x3f7fc6, 0xf6f3ea, 0xbfe4d6, 0xa9572f, 0xf2c23a] },
  flyer: {
    maker: 'nejimaki', scene: 'shelf', hero: 'kanpen', side: ['milk', 'tissue'],
    title: [['箱入り', 4, 'a'], ['どうぶつ', 2, 'b']],
    catch: 'あけたら、いた。', sub: 'ぜんぶ開閉ギミックつき', gimmick: 'フタがひらく！ひきだせる！',
  },
  items: [
    {
      id: 'match', name: 'Matchbox Firefly', jp: 'マッチ箱ホタル', jpLines: ['マッチ箱', 'ホタル'], rarity: 'common',
      desc: 'Sleeps with the light on. The light is itself.',
      figure: F.match, gimmick: { text: 'Slide the tray' },
    },
    {
      id: 'milk', name: 'Milk-Carton Calf', jp: '牛乳パックこうし', rarity: 'common',
      desc: 'Best before the twelfth. Has decided not to think about it.',
      figure: F.milk, gimmick: { text: 'Tuck the head in' },
    },
    {
      id: 'tissue', name: 'Tissue-Box Sheep', jp: 'ティッシュ箱ひつじ', jpLines: ['ティッシュ箱', 'ひつじ'], rarity: 'uncommon',
      desc: 'Two hundred sheets, two-ply. Would rather you used a sleeve.',
      figure: F.tissue, gimmick: { text: 'Pull a tissue' },
    },
    {
      id: 'egg', name: 'Egg-Pack Chicks', jp: 'たまごパックぴよ', jpLines: ['たまごパック', 'ぴよ'], rarity: 'rare',
      desc: 'Six to a pack. Three have hatched an opinion about it.',
      figure: F.egg, gimmick: { text: 'Open the lid' },
    },
    {
      id: 'kanpen', name: 'Pencil-Case Dachshund', jp: '缶ペンながいぬ', rarity: 'ultra',
      desc: 'Holds three pencils and last term\'s timetable. Chews the rubber.',
      figure: F.kanpen, gimmick: { text: 'Open the lid' },
    },
    {
      id: 'kan', name: 'The Biscuit Tin', jp: 'お菓子の缶', rarity: 'secret',
      desc: 'Not biscuits. It was never going to be biscuits.',
      figure: F.kan, gimmick: { text: 'Lift the lid' },
    },
  ],
};
