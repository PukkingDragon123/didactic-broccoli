// Oden Friends (おでんぶつ): the things simmering in the corner stall's oden pot, and the animals they are. A sculpted
// series (src/figures/sets/oden.js). 全5種 + シークレット.
import * as F from '../../figures/sets/oden.js';

export default {
  id: 'oden',
  order: 11,
  name: 'Oden Friends',
  jp: 'おでんぶつ',
  romaji: 'ODENBUTSU',
  tagline: 'Simmered since this morning',
  taglineJp: 'あさから、ぐつぐつ。',
  price: 400,
  themes: ['food', 'cute', 'weird'],
  card: { bg: '#f6ecd6', accent: '#b8783e', text: '#3a2a20', accent2: '#3a4f8a', pattern: 'checker' },
  capsule: { colors: [0xf6f3ea, 0xd9a24a, 0x3a4f8a, 0xc89a4a], style: 'paper' },
  atlas: [2048, 1536],
  flyer: {
    maker: 'manpuku', scene: 'oden', hero: 'kinchaku', side: ['konnyaku', 'chikuwa'],
    title: [['おでん', 4, 'a'], ['ぶつ', 4, 'b']],
    catch: 'あさから、ぐつぐつ。', sub: 'からしつき', gimmick: 'きんちゃくがひらく！',
  },
  items: [
    {
      id: 'daikon', name: 'Daikon Seal', jp: 'だいこんアザラシ', jpLines: ['だいこん', 'アザラシ'], rarity: 'common',
      desc: 'Soaked through. Exactly as planned.',
      figure: F.daikon, gimmick: { text: 'Nod its head' },
    },
    {
      id: 'tamago', name: 'Egg Penguin', jp: 'たまごペンギン', jpLines: ['たまご', 'ペンギン'], rarity: 'common',
      desc: 'Hard-boiled, in every sense.',
      figure: F.tamago, gimmick: { text: 'Wave' },
    },
    {
      id: 'chikuwa', name: 'Chikuwa Otter', jp: 'ちくわカワウソ', jpLines: ['ちくわ', 'カワウソ'], rarity: 'uncommon',
      desc: 'Lives in the hole. The hole is the best bit, it says.',
      figure: F.chikuwa, gimmick: { text: 'Slide it out' },
    },
    {
      id: 'konnyaku', name: 'Konnyaku Ray', jp: 'こんにゃくエイ', jpLines: ['こんにゃく', 'エイ'], rarity: 'rare',
      desc: 'Zero calories. Glides up the skewer when nobody is eating.',
      figure: F.konnyaku, gimmick: { text: 'Flap the fins' },
    },
    {
      id: 'kinchaku', name: 'Kinchaku Hamster', jp: 'きんちゃくハムスター', jpLines: ['きんちゃく', 'ハムスター'], rarity: 'ultra',
      desc: 'Keeps a rice cake in its pouch for later. Later never comes.',
      figure: F.kinchaku, gimmick: { text: 'Open the pouch' },
    },
    {
      id: 'nabe', name: 'The Oden Pot', jp: 'おでんなべ', rarity: 'secret',
      desc: 'One compartment is not for sale. It has a towel on its head.',
      figure: F.nabe, gimmick: { text: 'Dunk the cat' },
    },
  ],
};
