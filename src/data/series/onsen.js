// Onsen Friends (おんせんどうぶつ): animals melting happily into hot springs.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/onsen.js).
import * as F from '../../figures/sets/onsen.js';

export default {
  id: 'onsen',
  order: 8,
  name: 'Onsen Friends',
  jp: 'おんせんどうぶつ',
  tagline: 'Animals melting happily into hot springs',
  taglineJp: 'いいゆだな〜♨',
  price: 400,
  themes: ['nature', 'cute'],
  card: { bg: '#e2f3ef', accent: '#e0553a', text: '#25403b', accent2: '#f2b33d', pattern: 'waves' },
  capsule: { colors: [0x8fd8e6, 0xb07a4c, 0xffd21f, 0xffffff, 0xf08a6a] },
  atlas: [2048, 1536],
  items: [
    {
      id: 'yuzucapy', name: 'Yuzu-yu Capybara', jp: 'ゆず湯カピバラ', rarity: 'common',
      desc: 'Winter solstice yuzu bath. It has not moved in four hours. Possibly forever.',
      figure: F.yuzucapy, gimmick: { text: 'Bob the yuzu' },
    },
    {
      id: 'saru', name: 'Snow Monkey Soak', jp: 'ゆきみざる', rarity: 'common',
      desc: 'Snow on the rocks, towel on the head, absolutely zero plans for today.',
      figure: F.saru, gimmick: { text: 'Pat its head' },
    },
    {
      id: 'penguin', name: 'Bath Pail Penguin', jp: 'せんめんきペンギン', rarity: 'common',
      desc: 'Brought its own yellow pail, soap and shampoo. A seasoned sento regular.',
      figure: F.penguin, gimmick: { text: 'Flap the flippers' },
    },
    {
      id: 'tanukimilk', name: 'Coffee Milk Tanuki', jp: 'コーヒー牛乳たぬき', rarity: 'uncommon',
      desc: 'Hand on hip, head tilted back, bottle drained in one go. The sacred ritual.',
      figure: F.tanukimilk, gimmick: { text: 'Drink up' },
    },
    {
      id: 'kaeru', name: 'Hinoki Tub Frog', jp: 'ひのき風呂ガエル', rarity: 'uncommon',
      desc: 'Elbows on the rim, sake tray floating by. Frogs have simply figured life out.',
      figure: F.kaeru, gimmick: { text: 'Float the tray' },
    },
    {
      id: 'kawauso', name: 'Sea Otter Family Bath', jp: 'ラッコ親子のおふろ', rarity: 'rare',
      desc: 'Holding hands so nobody drifts away. Dad brought his favourite rock.',
      figure: F.kawauso, gimmick: { text: 'Make a ripple' },
    },
    {
      id: 'rotenburo', name: 'Rotenburo Retreat', jp: '露天風呂でゆったり', rarity: 'ultra',
      desc: 'Bamboo fence, stone lantern, autumn leaves. Reservations: capybaras only.',
      figure: F.rotenburo,
    },
    {
      id: 'kinkapi', name: 'Golden Kapi-sama', jp: '金のカピバラさま', rarity: 'secret',
      desc: 'Bathing deity of eternal relaxation. Grants one wish: five more minutes.',
      figure: F.kinkapi, gimmick: { text: 'Beckon' },
    },
  ],
};
