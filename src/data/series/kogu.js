// Grandpa's Toolbox (おじいちゃんの道具箱). well-used hand tools, Poly Haven CC0 models made small in the line's finish, lying or standing on their own (art/lowpix/figures/_src/kogu.py).
export default {
  id: 'kogu',
  order: 23,
  name: "Grandpa's Toolbox",
  jp: 'おじいちゃんの道具箱',
  tagline: "Every tool has a story",
  taglineJp: '使いこまれた道具たち',
  price: 300,
  themes: ['retro', 'home'],
  card: { bg: '#e8e0cc', accent: '#b8402a', text: '#2a241c', accent2: '#4a6a8a', pattern: 'grid' },
  capsule: { colors: [0xb8402a, 0x4a6a8a, 0xe8e0cc, 0x3a3430] },
  items: [
    { id: 'hammer', name: "Wooden Mallet", jp: '木づち', rarity: 'common', desc: "A beech mallet, its face dented from a thousand chisels.", gimmick: { text: 'Wobble' } },
    { id: 'plane', name: "Block Plane", jp: 'かんな', rarity: 'common', desc: "Push it and a curl of cedar comes up as thin as paper. Grandpa's favourite sound.", gimmick: { text: 'Slide' } },
    { id: 'wrench', name: "Pipe Wrench", jp: 'パイプレンチ', rarity: 'common', desc: "Red handle, toothed jaw, heavy as a brick. Fixes the bath every winter.", gimmick: { text: 'Wobble' } },
    { id: 'drill', name: "Hand Drill", jp: 'ハンドドリル', rarity: 'uncommon', desc: "Turn the wheel and the bit goes round. Slowly. Very slowly.", gimmick: { text: 'Turn' } },
    { id: 'oilcan', name: "Oil Can", jp: '油さし', rarity: 'uncommon', desc: "Press the bottom and one drop comes out of the long spout. Every hinge on the lane is quiet.", gimmick: { text: 'Hop' } },
    { id: 'vice', name: "Bench Vice", jp: '万力', rarity: 'rare', desc: "Bolted to the bench since before you were born, the handle polished by hands.", gimmick: { text: 'Turn' } },
    { id: 'torch', name: "Brass Blowtorch", jp: '真ちゅうのトーチ', rarity: 'ultra', desc: "Pump, light, roar. It thawed the pipes in the winter of '63.", gimmick: { text: 'Wobble' } },
    { id: 'toolbox', name: "Red Toolbox", jp: '赤い道具箱', rarity: 'secret', desc: "Grandpa's own steel toolbox, dented, the lid still shutting with a clack.", gimmick: { text: 'Hop' } },
  ],
};
