// Dajare Daisakusen (ダジャレ大作戦): terrible Japanese puns, in tiny 3D.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/dajare.js).
import * as F from '../../figures/sets/dajare.js';

export default {
  id: 'dajare',
  order: 9,
  name: 'Dajare Daisakusen',
  jp: 'ダジャレ大作戦',
  tagline: 'Terrible Japanese puns, in tiny 3D',
  taglineJp: 'さむい！でもクセになる。',
  price: 500,
  themes: ['weird', 'cute'],
  card: { bg: '#fff3cf', accent: '#ff6b35', text: '#3a2410', accent2: '#2fb5a6', pattern: 'checker' },
  capsule: { colors: [0xffd23f, 0xff8c2e, 0x5cc4ff, 0xffffff, 0x9bd94a] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'mikan', name: 'Mikan on an Alumi-can', jp: 'アルミ缶の上にあるミカン', rarity: 'common',
      desc: "Arumikan no ue ni aru mikan: 'there's a mikan on the aluminium can.' Say it fast.",
      figure: F.mikan, gimmick: { text: 'Wobble the mikan' },
    },
    {
      id: 'neko', name: 'The Cat Lay Down', jp: 'ネコがねころんだ', rarity: 'common',
      desc: 'Neko ga nekoronda: the cat (neko) lay down (nekoronda). It is not getting up.',
      figure: F.neko, gimmick: { text: 'Nudge the cat' },
    },
    {
      id: 'kaeru', name: 'The Frog Goes Home', jp: 'カエルがかえる', rarity: 'common',
      desc: 'Kaeru ga kaeru: the frog (kaeru) goes home (kaeru). Otsukaresama!',
      figure: F.kaeru, gimmick: { text: 'Wave goodbye' },
    },
    {
      id: 'tako', name: 'Octopus Flies a Kite', jp: 'タコがタコをあげる', rarity: 'uncommon',
      desc: 'Tako ga tako wo ageru: an octopus (tako) flies a kite (tako). Eight arms, one string.',
      figure: F.tako, gimmick: { text: 'Fly the kite' },
    },
    {
      id: 'ika', name: 'Squid on a Raft', jp: 'イカのいかだ', rarity: 'uncommon',
      desc: 'Ika no ikada: a squid (ika) on a raft (ikada). The only plan is to drift.',
      figure: F.ika, gimmick: { text: 'Drift' },
    },
    {
      id: 'panda', name: "Panda's Bakery", jp: 'パンダのパン屋', rarity: 'rare',
      desc: "Panda no pan-ya: 'pan' means bread, so obviously the panda runs a bakery.",
      figure: F.panda, gimmick: { text: 'Offer the tray' },
    },
    {
      id: 'futon', name: 'The Futon Flew Away', jp: 'ふとんがふっとんだ', rarity: 'ultra',
      desc: 'Futon ga futtonda: the futon (futon) went flying (futtonda). Lovely drying weather.',
      figure: F.futon, gimmick: { text: 'Lose the futon' },
    },
    {
      id: 'samui', name: 'Samui Oyaji', jp: '寒いオヤジギャグ', rarity: 'secret',
      desc: "Dad's pun was so cold (samui) that the audience froze solid. He thinks it went great.",
      figure: F.samui, gimmick: { text: 'Tell the pun' },
    },
  ],
};
