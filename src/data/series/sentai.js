// Series: Capsule Sentai Kapuranger (カプレンジャー): tiny henshin heroes.
// A sculpted series (src/figures/sets/sentai.js).
import * as F from '../../figures/sets/sentai.js';

export default {
  id: 'sentai',
  order: 16,
  name: 'Capsule Sentai Kapuranger',
  jp: 'カプセル戦隊カプレンジャー',
  tagline: 'Tiny henshin heroes, assemble!',
  taglineJp: '変身！ちびっこヒーロー参上！',
  price: 500,
  themes: ['city', 'weird'],
  card: { bg: '#fff4d6', accent: '#e8343a', text: '#1e1e3a', accent2: '#2f6fd6', pattern: 'stars' },
  capsule: { colors: [0xe8343a, 0x2f6fd6, 0xffc21f, 0xff7ab0, 0x3cbf5a] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'red', name: 'Kapu Red', jp: 'カプレッド', rarity: 'common',
      desc: 'The leader. Shouts his own name before every sentence, including "good morning".',
      figure: F.red, gimmick: { text: 'Pump the fist' },
    },
    {
      id: 'blue', name: 'Kapu Blue', jp: 'カプブルー', rarity: 'common',
      desc: 'Cool, calm, and secretly practises the team pose alone in the mirror.',
      figure: F.blue, gimmick: { text: 'Take aim' },
    },
    {
      id: 'yellow', name: 'Kapu Yellow', jp: 'カプイエロー', rarity: 'common',
      desc: 'Has eaten curry before every single battle since episode one. Undefeated.',
      figure: F.yellow, gimmick: { text: 'Eat the curry' },
    },
    {
      id: 'pink', name: 'Kapu Pink', jp: 'カプピンク', rarity: 'uncommon',
      desc: 'Heart visor, heart baton, heart of steel. Has suplexed a kaiju. Twice.',
      figure: F.pink, gimmick: { text: 'Wave the baton' },
    },
    {
      id: 'grunt', name: 'Combatant Grunt', jp: '戦闘員', rarity: 'uncommon',
      desc: 'Answers everything with "Iii!". Including his job interview. He got the job.',
      figure: F.grunt, gimmick: { text: 'Iii!' },
    },
    {
      id: 'bakuhatsu', name: 'Five-Colour Explosion', jp: '変身ポーズ大爆発', rarity: 'rare',
      desc: 'The quarry explodes in five colours behind him. Insurance stopped calling years ago.',
      figure: F.bakuhatsu, gimmick: { text: 'Boom!' },
    },
    {
      id: 'robo', name: 'Gattai Robo Kapu-Oh', jp: '合体ロボ カプオー', rarity: 'ultra',
      desc: 'Five capsule machines combine into one robot. It takes eight minutes. Kaiju wait politely.',
      figure: F.robo, gimmick: { text: 'Turn the crank' },
    },
    {
      id: 'break', name: 'Suit Actor on Break', jp: 'スーツアクターの休憩', rarity: 'secret',
      desc: 'Between takes. Canned coffee, a towel, a sigh. Please do not tell the children.',
      figure: F.break, gimmick: { text: 'Sip the coffee' },
    },
  ],
};
