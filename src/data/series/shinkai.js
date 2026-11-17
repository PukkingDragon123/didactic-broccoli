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
    { id: 'isopod', name: 'Giant Isopod', jp: 'ダイオウグソクムシ', rarity: 'common', desc: 'A woodlouse the size of a shoe, armoured and patient, from two thousand metres down.', gimmick: { text: 'Turn' } },
    { id: 'dumbo', name: 'Dumbo Octopus', jp: 'メンダコ', rarity: 'common', desc: 'Flaps its ear-fins and drifts through the dark like a lost umbrella.', gimmick: { text: 'Float' } },
    { id: 'jelly', name: 'Moon Jelly', jp: 'ミズクラゲ', rarity: 'common', desc: 'Four pale rings in a bell of glass, pulsing slowly up through the dark.', gimmick: { text: 'Pulse' } },
    { id: 'nautilus', name: 'Chambered Nautilus', jp: 'オウムガイ', rarity: 'uncommon', desc: 'Striped like a tiger, built in perfect rooms. It has not changed in five hundred million years.', gimmick: { text: 'Turn' } },
    { id: 'angler', name: 'Lantern Anglerfish', jp: 'チョウチンアンコウ', rarity: 'uncommon', desc: 'All teeth and a lamp on a stalk. Do not follow the light.', gimmick: { text: 'Lunge' } },
    { id: 'goblin', name: 'Goblin Shark', jp: 'ミツクリザメ', rarity: 'rare', desc: 'A long flat snout and jaws that shoot forward. Pink, sleepy and very, very old.', gimmick: { text: 'Glide' } },
    { id: 'coela', name: 'Living Fossil Coelacanth', jp: 'シーラカンス', rarity: 'secret', desc: 'Steel-blue, white-flecked, with fins like little legs. Thought gone with the dinosaurs, until a fisherman pulled one up.', gimmick: { text: 'Turn' } },
  ],
};
