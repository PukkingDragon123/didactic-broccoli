// Series 10: Deep Sea Mysteries (深海ミステリー). The strange animals of the deep on the dark sea floor, the swimmers on
// clear rods like museum models (art/lowpix/figures/_src/shinkai.py).
export default {
  id: 'shinkai',
  order: 10,
  name: 'Deep Sea Mysteries',
  jp: '深海ミステリー',
  tagline: 'One thousand metres down, and getting stranger',
  taglineJp: '深海のふしぎな生きもの',
  price: 300,
  themes: ['weird', 'space'],
  card: { bg: '#1e2a3a', accent: '#4ab8c8', text: '#e8f4f0', accent2: '#e8783a', pattern: 'waves' },
  capsule: { colors: [0x1e2a3a, 0x4ab8c8, 0xe8783a, 0x6a4a8a], style: 'clear' },
  items: [
    { id: 'dumbo', name: 'Dumbo Octopus', jp: 'メンダコ', rarity: 'common', desc: 'Flaps its ear-fins and drifts through the dark like a lost umbrella.', gimmick: { text: 'Float' } },
    { id: 'jelly', name: 'Moon Jelly', jp: 'ミズクラゲ', rarity: 'uncommon', desc: 'Four pale rings in a bell of glass, pulsing slowly up through the dark.', gimmick: { text: 'Pulse' } },
    { id: 'nautilus', name: 'Chambered Nautilus', jp: 'オウムガイ', rarity: 'secret', desc: 'Striped like a tiger, built in perfect rooms. It has not changed in five hundred million years.', gimmick: { text: 'Turn' } },
  ],
};
