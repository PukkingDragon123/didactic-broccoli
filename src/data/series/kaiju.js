// Series: Kaiju Snack Attack (おやつ怪獣): baby soft-vinyl monsters on a sugar rampage.
// A sculpted series (src/figures/sets/kaiju.js).
import * as F from '../../figures/sets/kaiju.js';

export default {
  id: 'kaiju',
  order: 10,
  name: 'Kaiju Snack Time',
  jp: '怪獣おやつタイム',
  tagline: 'Baby monsters on a sugar rampage',
  taglineJp: 'ガオー！おやつの時間だ！',
  price: 500,
  themes: ['city', 'weird', 'candy'],
  card: { bg: '#e6f4d4', accent: '#3cae5a', text: '#24361f', accent2: '#ff8c2e', pattern: 'grid' },
  capsule: { colors: [0x6fcf6a, 0xff8c2e, 0xffb7c8, 0x5cc4ff, 0xffd23f] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'taiyaki', name: 'Gao-chan & Taiyaki', jp: 'ガオちゃんとたい焼き', rarity: 'common',
      desc: 'Always eats taiyaki tail-first. Nobody knows why. Nobody dares ask.',
      figure: F.taiyaki, gimmick: { text: 'Chomp' },
    },
    {
      id: 'dango', name: 'Hanami Dango Kaiju', jp: '花より団子怪獣', rarity: 'common',
      desc: 'Hana yori dango: dumplings over blossoms. Has not looked at one flower.',
      figure: F.dango, gimmick: { text: 'Raise the dango' },
    },
    {
      id: 'ramune', name: 'Ramune Gulp Kaiju', jp: 'ラムネ怪獣', rarity: 'common',
      desc: 'Has spent forty minutes trying to get the marble out. Will not give up.',
      figure: F.ramune, gimmick: { text: 'Tip the bottle' },
    },
    {
      id: 'purin', name: 'Purin Funjatta!', jp: 'プリンふんじゃった', rarity: 'uncommon',
      desc: 'Stepped on the giant purin. Now has one very sticky, very happy foot.',
      figure: F.purin, gimmick: { text: 'Squish the purin' },
    },
    {
      id: 'buriki', name: 'Wind-up Tin Kaiju', jp: 'ブリキ怪獣', rarity: 'uncommon',
      desc: 'Wind it up and it eats one donut. Wind it up again. Repeat until broke.',
      figure: F.buriki, gimmick: { text: 'Wind it up' },
    },
    {
      id: 'tower', name: 'Biscuit Tower Attack', jp: 'ビスケットタワー襲撃', rarity: 'rare',
      desc: 'The tallest snack in the city. Was. Was the tallest snack in the city.',
      figure: F.tower, gimmick: { text: 'Take a bite' },
    },
    {
      id: 'parfait', name: 'Triple-Head Parfait', jp: '三つ首パフェ竜', rarity: 'ultra',
      desc: 'Three heads, one parfait. The middle one always gets the cherry.',
      figure: F.parfait, gimmick: { text: 'Go for the cherry' },
    },
    {
      id: 'mecha', name: 'Mecha-Kaiju ULTIMATE', jp: 'メカ怪獣アルティメット', rarity: 'secret',
      desc: 'A billion-yen war machine. Used exclusively to guard one melon pan.',
      figure: F.mecha, gimmick: { text: 'Raise the melon pan' },
    },
  ],
};
