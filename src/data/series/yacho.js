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
    { id: 'suzume', name: 'Puffed-up Sparrow', jp: 'ふくらスズメ', rarity: 'common', desc: 'Fluffed into a ball against the cold, one eye on the rice you dropped.', gimmick: { text: 'Hop' } },
    { id: 'karasu', name: 'Lane Crow', jp: '路地のカラス', rarity: 'common', desc: 'Glossy, clever and in no hurry. It knows which day the rubbish goes out.', gimmick: { text: 'Nod' } },
    { id: 'kawasemi', name: 'Kingfisher', jp: 'カワセミ', rarity: 'uncommon', desc: 'A jewel of blue and orange on its perch, gone in a flash of colour.' },
    { id: 'fukuro', name: 'Horned Owl', jp: 'ミミズク', rarity: 'rare', desc: 'Two ear tufts, two orange eyes, and a head that turns further than yours.', gimmick: { text: 'Turn its head' } },
    { id: 'menfukuro', name: 'Barn Owl', jp: 'メンフクロウ', rarity: 'secret', desc: "A heart-shaped face as white as paper, on the museum's own perch. Silent even in the drawer.", gimmick: { text: 'Turn its head' } },
    { id: 'kiji', name: 'Green Pheasant', jp: 'キジ', rarity: 'ultra', desc: 'The bird on the old banknotes: emerald breast, red face, a tail as long as itself.' },
  ],
};
