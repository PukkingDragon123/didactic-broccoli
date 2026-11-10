// Series: Nikoniko Wagashi (にこにこ和菓子): smiling traditional Japanese sweets.
// A sculpted series (src/figures/sets/wagashi.js).
import * as F from '../../figures/sets/wagashi.js';

export default {
  id: 'wagashi',
  order: 14,
  name: 'Nikoniko Wagashi',
  jp: 'にこにこわがし',
  tagline: 'Smiling traditional Japanese sweets',
  taglineJp: 'あまくて、もちもち、にっこにこ',
  price: 200,
  themes: ['food', 'candy', 'cute'],
  card: { bg: '#f8efe0', accent: '#e8789a', text: '#4a2630', accent2: '#6f9a4a', pattern: 'sakura' },
  capsule: { colors: [0xffc2d4, 0xa8d08a, 0xfffaf0, 0x8a4a52, 0xf2d48a] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'dango', name: 'Hanami Dango Trio', jp: '三色だんご', rarity: 'common',
      desc: 'Pink is the leader, white keeps the peace, green just wants a nap.',
      figure: F.dango, gimmick: { text: 'Turn the skewer' },
    },
    {
      id: 'taiyaki', name: 'Taiyaki-kun', jp: 'たい焼きくん', rarity: 'common',
      desc: 'Bravely gave up its tail so you could see the anko. Hero of the snack stall.',
      figure: F.taiyaki, gimmick: { text: 'Wiggle' },
    },
    {
      id: 'ichigo', name: 'Ichigo Daifuku', jp: 'いちご大福', rarity: 'common',
      desc: 'Soft on the outside, sweet on the inside, strawberry on top. A perfect citizen.',
      figure: F.ichigo, gimmick: { text: 'Tip the strawberry' },
    },
    {
      id: 'dorayaki', name: 'Dorayaki Walker', jp: 'てくてくどら焼き', rarity: 'uncommon',
      desc: 'Got up and walked out of the bakery. Nobody has the heart to stop it.',
      figure: F.dorayaki, gimmick: { text: 'Take a step' },
    },
    {
      id: 'sakura', name: 'Sakura Mochi', jp: '桜もち', rarity: 'uncommon',
      desc: 'Wrapped in a salted cherry leaf like a cosy futon. Do not wake before spring.',
      figure: F.sakura, gimmick: { text: 'Turn back the leaf' },
    },
    {
      id: 'kakigori', name: 'Uji Kintoki Kakigori', jp: '宇治金時かき氷', rarity: 'rare',
      desc: 'A mountain of matcha ice with three shiratama climbers. Brain freeze summit.',
      figure: F.kakigori, gimmick: { text: 'Reach the summit' },
    },
    {
      id: 'chakai', name: 'Tea Ceremony Set', jp: 'お茶会セット', rarity: 'ultra',
      desc: 'Matcha-bowl-san bows three times. The nerikiri bows back. This takes an hour.',
      figure: F.chakai, gimmick: { text: 'Bow' },
    },
    {
      id: 'shiruko', name: 'Shiratama Onsen', jp: 'おしるこ温泉', rarity: 'secret',
      desc: 'The water is 90% red beans. Locals swear it is wonderful for the skin.',
      figure: F.shiruko, gimmick: { text: 'Bob in the bath' },
    },
  ],
};
