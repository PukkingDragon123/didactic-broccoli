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
    { id: 'isopod', name: 'Giant Isopod', jp: 'ダイオウグソクムシ', rarity: 'common', desc: 'Fourteen legs, armour plates, and it has not eaten since the spring. It is fine.', gimmick: { text: 'Turn' } },
    { id: 'dumbo', name: 'Dumbo Octopus', jp: 'メンダコ', rarity: 'common', desc: 'Flaps its ear-fins and drifts. The softest thing in the deep.', gimmick: { text: 'Drift' } },
    { id: 'jelly', name: 'Moon Jelly', jp: 'ミズクラゲ', rarity: 'common', desc: 'A see-through bell with four rings inside, pulsing in the dark.', gimmick: { text: 'Pulse' } },
    { id: 'nautilus', name: 'Chambered Nautilus', jp: 'オウムガイ', rarity: 'uncommon', desc: 'A living fossil in a striped shell, steering with ninety tentacles.', gimmick: { text: 'Turn' } },
    { id: 'angler', name: 'Lantern Anglerfish', jp: 'チョウチンアンコウ', rarity: 'uncommon', desc: 'Teeth like needles and a little light on a stick. Do not follow the light.', gimmick: { text: 'Lure' } },
    { id: 'goblin', name: 'Frilled Shark', jp: 'ラブカ', rarity: 'rare', desc: 'Three hundred needle teeth and six frilly gills: an eel-shaped shark unchanged since the dinosaurs.', gimmick: { text: 'Lunge' } },
    { id: 'oarfish', name: 'Oarfish', jp: 'リュウグウノツカイ', rarity: 'ultra', desc: 'The longest bony fish in the sea, a silver ribbon with a red crest.' },
    { id: 'coela', name: 'Golden Coelacanth', jp: '黄金のシーラカンス', rarity: 'secret', desc: "The fish that outlived the dinosaurs, cast in gold for the museum's hundredth year.", gimmick: { text: 'Turn' } },
  ],
};
