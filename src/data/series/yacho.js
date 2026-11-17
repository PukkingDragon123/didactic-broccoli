// Series 4: Garden Birds (庭の野鳥). The birds of the shrine woods and the garden on their perches
// (art/lowpix/figures/_src/yacho.py).
export default {
  id: 'yacho',
  order: 4,
  name: 'Garden Birds',
  jp: '庭の野鳥',
  tagline: 'Who is on the plum branch today?',
  taglineJp: '庭にやってくる小鳥たち',
  price: 100,
  themes: ['japan', 'home', 'cute'],
  card: { bg: '#eef0e0', accent: '#4a7a8a', text: '#1e2420', accent2: '#c85a3a', pattern: 'dots' },
  capsule: { colors: [0x4a7a8a, 0xc85a3a, 0xeef0e0, 0x6a5a3a] },
  items: [
    { id: 'suzume', name: 'Puffed-up Sparrow', jp: 'ふくらスズメ', rarity: 'common', desc: 'Fluffed into a ball against the winter wind, on the plum branch.', gimmick: { text: 'Hop' } },
    { id: 'uzura', name: 'Quail in the Straw', jp: 'わらのウズラ', rarity: 'common', desc: 'A round brown quail tucked in the rice straw, speckled like an egg.', gimmick: { text: 'Look round' } },
    { id: 'karasu', name: 'Crow with a Key', jp: 'カギを拾ったカラス', rarity: 'common', desc: 'It found something shiny. You will not be getting your key back.', gimmick: { text: 'Peck' } },
    { id: 'kawasemi', name: 'Kingfisher', jp: 'カワセミ', rarity: 'uncommon', desc: 'A jewel of blue and orange on the river post. Gone before you can point.' },
    { id: 'fukuro', name: 'Horned Owl', jp: 'ミミズク', rarity: 'uncommon', desc: 'Two ear tufts, two orange eyes, all night long on the shrine cedar.', gimmick: { text: 'Turn its head' } },
    { id: 'menfukuro', name: 'Barn Owl', jp: 'メンフクロウ', rarity: 'rare', desc: 'A heart-shaped face as white as a moon, on a branch over the barley.', gimmick: { text: 'Turn its head' } },
    { id: 'kiji', name: 'Green Pheasant', jp: 'キジ', rarity: 'ultra', desc: 'The bird on the old banknotes: emerald breast, red face, a tail like a brush stroke.' },
    { id: 'kinkei', name: 'Golden Pheasant', jp: 'キンケイ', rarity: 'secret', desc: "Flame and gold in full flight. The emperor's garden bird.", gimmick: { text: 'Fly' } },
  ],
};
