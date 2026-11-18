// Puni-puni Yōkai (ぷにぷにようかい, "Yōkai Squishies"): the stranger yōkai of the old scroll books (a lump of sagging
// flesh, a fat cryptid snake, the bath-scum licker, a sulking sea monk) as soft squishy mascots in a sugary matte
// finish, pastel and neon. An original capsule series modelled in Blender (art/blender/toys/punipuni, concept in
// art/blender/toys/concepts_D.md). Press one (left click in hand, right click on a shelf) to squeeze it: it squashes
// and spreads, its face changes mid-squish, and it rises slowly back. Three come on a ball chain (keychain).
const SQ = (pop) => ({ text: 'Squeeze', sfx: [[0.13, 'toyFold', { n: 1 }], [0.4, pop], [1.1, 'toyTap', { v: 0.3 }], [2.0, 'toyTap', { v: 0.25 }]] });
export default {
  id: 'punipuni',
  order: 53,
  name: 'Yōkai Squishies',
  jp: 'ぷにぷにようかい',
  tagline: 'Squeeze the yōkai. They squeeze back.',
  taglineJp: 'ぎゅっとしてね',
  price: 300,
  themes: ['cute', 'spooky'],
  card: { bg: '#ffe4ee', accent: '#ff7aa8', text: '#2a1c2a', accent2: '#8ee04a', pattern: 'dots', kind: 'ぷにぷにスクイーズ' },
  capsule: { colors: [0xff7aa8, 0x8ee04a, 0x8a9cff, 0xf4c2a8] },
  items: [
    {
      id: 'nuppeppo', name: 'Nuppeppō', jp: 'ぬっぺっぽう', rarity: 'common', figScale: 1.35,
      desc: 'The walking lump of flesh from the old scroll books: a sagging peach lump of dough with fat folds, three wisps of hair and stubby arms crossed. Very smug. Squeeze it and a tongue pokes out.',
      gimmick: SQ('pop'),
    },
    {
      id: 'tsuchinoko', name: 'Tsuchinoko', jp: 'ツチノコ', rarity: 'common', figScale: 1.45, keychain: true,
      desc: 'The fat cryptid snake of the mountain villages: a beer-belly of a body, a stubby tail curled round, neon lime with a diamond back and a sly grin. Squeeze it and the forked tongue flicks.',
      gimmick: SQ('pop'),
    },
    {
      id: 'akaname', name: 'Akaname', jp: 'あかなめ', rarity: 'uncommon', figScale: 1.45, keychain: true,
      desc: 'The bath-scum licker that comes out at night to lick the grime off the tub: a squat neon-pink imp with a spiky topknot, one clawed hand up and a huge tongue. Squeeze it and the tongue stretches right out.',
      gimmick: SQ('pop'),
    },
    {
      id: 'umibozu', name: 'Umibōzu', jp: 'うみぼうず', rarity: 'uncommon', figScale: 1.3,
      desc: 'The sea monk that rises out of a calm night sea: a big sulking dark-teal dome in its own curl of neon wave, two stubby hands on the water. Squeeze it and it sinks, and a spout pops off its head.',
      gimmick: SQ('splash'),
    },
    {
      id: 'onibi', name: 'Onibi', jp: 'おにび', rarity: 'rare', figScale: 1.5, keychain: true,
      desc: 'A will-o\'-wisp, the ghost-fire over the paddies at night: a fat lilac-blue flame with a curling tail and a big toothy grin. Squeeze it and its flame tips flare right out.',
      gimmick: SQ('whoosh'),
    },
    {
      id: 'baku', name: 'Dream-Eater Baku', jp: 'ゆめくいバク', rarity: 'secret', figScale: 1.45,
      desc: 'The chimera that eats bad dreams: a plump lavender tapir with tusks, a curly cream mane, tiger-striped legs and a lion\'s tail tuft, sleepy and pleased. Squeeze it and it puffs out a dream bubble.',
      gimmick: SQ('pop'),
    },
  ],
};
