// Greengrocer (やおやさん). fruit and vegetables from the corner shop, Poly Haven CC0 scans made into chunky minis in the line's finish (art/lowpix/figures/_src/yaoya.py).
export default {
  id: 'yaoya',
  order: 24,
  name: "Greengrocer",
  jp: 'やおやさん',
  tagline: "Fresh from the corner shop",
  taglineJp: 'まちの八百屋さん',
  price: 100,
  themes: ['food', 'retro'],
  card: { bg: '#f2ecd8', accent: '#4a8a3a', text: '#2a2a1c', accent2: '#d8783a', pattern: 'checker' },
  capsule: { colors: [0x4a8a3a, 0xd8783a, 0xf2ecd8, 0xc8302a] },
  items: [
    { id: 'apple', name: "Red Apple", jp: 'りんご', rarity: 'common', desc: "Polished on the grocer's apron until you can see your face in it.", gimmick: { text: 'Wobble' } },
    { id: 'nashi', name: "Nashi Pear", jp: 'なし', rarity: 'common', desc: "Crisp as ice, gritty and sweet. Two of them in a paper bag for a sick friend.", gimmick: { text: 'Wobble' } },
    { id: 'lemon', name: "Lemon", jp: 'レモン', rarity: 'common', desc: "Bright enough to light the shelf.", gimmick: { text: 'Wobble' } },
    { id: 'imo', name: "Sweet Potato", jp: 'さつまいも', rarity: 'uncommon', desc: "Roast it in the leaf fire until the skin cracks and the inside goes gold.", gimmick: { text: 'Slide' } },
    { id: 'ginger', name: "Ginger Root", jp: 'しょうが', rarity: 'uncommon', desc: "Knobbly, fragrant and hot. Grated over everything in summer.", gimmick: { text: 'Turn' } },
    { id: 'banana', name: "Banana Bunch", jp: 'バナナ', rarity: 'rare', desc: "A whole hand of bananas: once the most expensive thing in the shop.", gimmick: { text: 'Wobble' } },
    { id: 'pomegranate', name: "Pomegranate", jp: 'ザクロ', rarity: 'ultra', desc: "Split open, its ruby seeds spilling. The grocer saves it for the regulars.", gimmick: { text: 'Turn' } },
    { id: 'lychee', name: "Lychee Bunch", jp: 'ライチ', rarity: 'secret', desc: "Rough red shells and pearl inside: the rarest crate of summer.", gimmick: { text: 'Hop' } },
  ],
};
