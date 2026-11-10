// Puchi Aquarium (ぷちぷち水族館): tiny friends from the big blue tank.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/umi.js).
import * as F from '../../figures/sets/umi.js';

export default {
  id: 'umi',
  order: 18,
  name: 'Puchi Aquarium',
  jp: 'ぷちぷち水族館',
  tagline: 'Tiny friends from the big blue tank',
  taglineJp: 'ゆらゆら～ぷかぷか～',
  price: 400,
  themes: ['ocean', 'cute'],
  card: { bg: '#dcf2fb', accent: '#1f8fc4', text: '#123a52', accent2: '#ff8a5c', pattern: 'waves' },
  capsule: { colors: [0x6fd3f0, 0xffffff, 0xff9a7a, 0x2f6fd6, 0xbff0e0] },
  atlas: [2048, 2560],
  items: [
    {
      id: 'mendako', name: 'Mendako', jp: 'メンダコ', rarity: 'common',
      desc: 'A deep-sea pancake with ears. Flaps them to swim, very slowly, very proudly.',
      figure: F.mendako, gimmick: { text: 'Flap the ears' },
    },
    {
      id: 'chinanago', name: 'Garden Eel Trio', jp: 'チンアナゴ三兄弟', rarity: 'common',
      desc: 'If you look at them, they hide. If you look away, they stare at you.',
      figure: F.chinanago, gimmick: { text: 'Make them hide' },
    },
    {
      id: 'clione', name: 'Clione Sea Angel', jp: 'クリオネ', rarity: 'common',
      desc: 'Looks like a tiny angel. Eats like a tiny monster. Both are true.',
      figure: F.clione, gimmick: { text: 'Flap the wings' },
    },
    {
      id: 'manbou', name: 'Fainting Sunfish', jp: 'マンボウ', rarity: 'uncommon',
      desc: 'Famously delicate. Has already fainted twice while reading this description.',
      figure: F.manbou, gimmick: { text: 'Startle it' },
    },
    {
      id: 'gusokumushi', name: 'Giant Isopod', jp: 'ダイオウグソクムシ', rarity: 'uncommon',
      desc: 'Has not eaten in five years. Is not hungry. Is, frankly, thriving.',
      figure: F.gusokumushi, gimmick: { text: 'Offer dinner' },
    },
    {
      id: 'kurage', name: 'Moon Jelly Tank', jp: 'ミズクラゲの水槽', rarity: 'rare',
      desc: 'Stare for five minutes and all your worries go poyo~n. Clinically unproven.',
      figure: F.kurage, gimmick: { text: 'Watch them drift' },
    },
    {
      id: 'irukashow', name: 'Dolphin Show!', jp: 'イルカショー', rarity: 'ultra',
      desc: 'Jumps through the hoop, balances the ball, and still finds time to splash row one.',
      figure: F.irukashow, gimmick: { text: 'Leap!' },
    },
    {
      id: 'jinbei', name: 'Gentle Jinbei-san', jp: 'ジンベエザメ', rarity: 'secret',
      desc: 'The biggest fish in the sea. Eats only the tiniest snacks. Gives free rides.',
      figure: F.jinbei, gimmick: { text: 'Swish the tail' },
    },
  ],
};
