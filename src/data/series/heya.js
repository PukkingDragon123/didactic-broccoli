// My Tiny Room (ミニチュアのお部屋): dollhouse furniture of a Shōwa house, each piece on its own tatami.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/heya.js).
import * as F from '../../figures/sets/heya.js';

export default {
  id: 'heya',
  order: 6,
  name: 'My Tiny Room',
  jp: 'ミニチュアのお部屋',
  tagline: 'Pocket-sized furniture for a pocket-sized life',
  taglineJp: 'ちいさなおうち、はじめました',
  price: 300,
  themes: ['home', 'retro', 'cute'],
  card: { bg: '#f4ead2', accent: '#8a5a36', text: '#3b2a1a', accent2: '#4f8a5b', pattern: 'grid' },
  capsule: { colors: [0xd6c88a, 0xb87443, 0xfbf6ea, 0x8fc7a0, 0xe98a6a] },
  atlas: [2048, 2560],
  items: [
    {
      id: 'chabudai', name: 'Chabudai Teatime', jp: 'ちゃぶ台でお茶', rarity: 'common',
      desc: 'Tea for two, one senbei. Flipping the table is strictly for TV dramas.',
      figure: F.chabudai, gimmick: { text: 'Pour the tea' },
    },
    {
      id: 'zabuton', name: 'Zabuton Nap', jp: 'ざぶとんでおひるね', rarity: 'common',
      desc: 'Fell asleep mid-thought on the guest cushion. Snot bubble at full size.',
      figure: F.zabuton, gimmick: { text: 'Watch it breathe' },
    },
    {
      id: 'tansu', name: 'Tansu Chest', jp: 'たんす', rarity: 'common',
      desc: 'Third drawer holds every rubber band you have ever owned. And one sock.',
      figure: F.tansu, gimmick: { text: 'Slide the drawer' },
    },
    {
      id: 'futon', name: 'Futon & Alarm Clock', jp: 'おふとんセット', rarity: 'uncommon',
      desc: 'The clock says 7:00. The futon says five more minutes.',
      figure: F.futon, gimmick: { text: 'Ring the alarm' },
    },
    {
      id: 'hondana', name: 'Manga Bookshelf', jp: 'まんがの本棚', rarity: 'uncommon',
      desc: 'Owns every volume except number seven. Nobody knows where seven went.',
      figure: F.hondana, gimmick: { text: 'Pull out a volume' },
    },
    {
      id: 'tsukue', name: 'Late-Night Study Desk', jp: 'べんきょうづくえ', rarity: 'rare',
      desc: 'Homework: open. Notebook: mostly cat doodles. Lamp: doing its very best.',
      figure: F.tsukue, gimmick: { text: 'Tilt the lamp' },
    },
    {
      id: 'ofuro', name: 'Hinoki Ofuro', jp: 'ひのきのおふろ', rarity: 'ultra',
      desc: 'Shoulder-deep at 42 degrees. The duck has claimed the best corner.',
      figure: F.ofuro, gimmick: { text: 'Bob the duck' },
    },
    {
      id: 'nekosawagi', name: 'The Cat Did It', jp: 'ねこのしわざ', rarity: 'secret',
      desc: 'Shoji torn, vase tipped, paper unrolled. The cat was asleep all day, apparently.',
      figure: F.nekosawagi, gimmick: { text: 'Check on the cat' },
    },
  ],
};
