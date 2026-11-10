// Kasa Collection (傘コレクション): tiny umbrellas for the rainy season.
// A sculpted series (src/figures): each item's `figure` is a Sculpt program (src/figures/sets/kasa.js).
import * as F from '../../figures/sets/kasa.js';

export default {
  id: 'kasa',
  order: 3,
  name: 'Kasa Collection',
  jp: '傘コレクション',
  tagline: 'Tiny umbrellas for a rainy season',
  taglineJp: '梅雨のおともに',
  price: 200,
  themes: ['cute', 'retro', 'weird'],
  card: { bg: '#e3eef8', accent: '#e5383b', text: '#1f2f4a', accent2: '#ffd23f', pattern: 'dots' },
  capsule: { colors: [0x9fd9ff, 0xffd23f, 0xe5383b, 0xc7b3f0, 0x58c06c] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'vinyl', name: 'Konbini Vinyl Umbrella', jp: 'ビニール傘', rarity: 'common',
      desc: 'Bought in a panic for ¥500. Will be left on a train by Thursday.',
      figure: F.vinyl, gimmick: { text: 'Close it' },
    },
    {
      id: 'kaeru', name: 'Frog Kids Umbrella', jp: 'かえるのかさ', rarity: 'common',
      desc: 'Comes with a clear window so you can see the puddles you are about to jump in.',
      figure: F.kaeru, gimmick: { text: 'Close it' },
    },
    {
      id: 'tatami', name: 'Bamboo-Handle Umbrella', jp: '紳士傘', rarity: 'common',
      desc: 'A proper gentleman’s umbrella. Left at the station in 1987, still waiting.',
      figure: F.tatami, gimmick: { text: 'Lean it' },
    },
    {
      id: 'janome', name: 'Janome-gasa', jp: '蛇の目傘', rarity: 'uncommon',
      desc: 'A bull’s-eye wagasa of oiled washi. Rain sounds like tiny drums on it.',
      figure: F.janome, gimmick: { text: 'Close it' },
    },
    {
      id: 'uragaeri', name: 'Inside-Out Umbrella', jp: 'おちょこ傘', rarity: 'uncommon',
      desc: 'Typhoon season’s most popular dance move. The umbrella did not consent.',
      figure: F.uragaeri, gimmick: { text: 'Feel the gust' },
    },
    {
      id: 'nodate', name: 'Sakura Nodate Parasol', jp: '桜の野点傘', rarity: 'rare',
      desc: 'Outdoor tea under the cherry blossoms. Petals keep landing in the matcha.',
      figure: F.nodate, gimmick: { text: 'Close the parasol' },
    },
    {
      id: 'amefuri', name: 'Puddle Jumper', jp: 'あめふりっこ', rarity: 'ultra',
      desc: 'Yellow raincoat, red boots, zero intention of staying dry.',
      figure: F.amefuri, gimmick: { text: 'Jump in' },
    },
    {
      id: 'obake', name: 'Kasa-Obake', jp: 'からかさお化け', rarity: 'secret',
      desc: 'A hundred-year-old umbrella that grew an eye, a tongue and a very hairy leg.',
      figure: F.obake, gimmick: { text: 'Hop' },
    },
  ],
};
