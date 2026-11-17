// Series 6: Showa Home Appliances (昭和の家電). The machines of a 1960s-70s Japanese home, real models made small, each
// in its corner of the house (art/lowpix/figures/_src/denka.py).
export default {
  id: 'denka',
  order: 6,
  name: 'Showa Home Appliances',
  jp: '昭和の家電',
  tagline: 'The living room your grandparents had',
  taglineJp: 'なつかしの昭和家電',
  price: 300,
  themes: ['home', 'retro', 'japan'],
  card: { bg: '#efe4c8', accent: '#3a7a6a', text: '#2a2218', accent2: '#c8783a', pattern: 'grid' },
  capsule: { colors: [0x3a7a6a, 0xc8783a, 0xefe4c8, 0x2a2a30], style: 'opaque' },
  items: [
    { id: 'phone', name: 'Black Rotary Phone', jp: '黒電話', rarity: 'common', desc: 'Heavy as a brick, rings like a fire bell. Dial with one finger and a lot of patience.', gimmick: { text: 'Ring' } },
    { id: 'fan', name: 'Mint Electric Fan', jp: 'ミントの扇風機', rarity: 'common', desc: 'Three speeds, one oscillation, a cage you were told never to poke.', gimmick: { text: 'Oscillate' } },
    { id: 'cooker', name: 'Electric Rice Cooker', jp: '電気炊飯器', rarity: 'common', desc: 'Click, steam, the smell of rice. It has never once burned the bottom.' },
    { id: 'radio', name: 'Pocket Transistor Radio', jp: 'トランジスタラジオ', rarity: 'uncommon', desc: 'Six transistors, one earphone, the baseball game on a summer night.', gimmick: { text: 'Tune in' } },
    { id: 'tv', name: 'Wooden Cabinet TV', jp: '家具調テレビ', rarity: 'uncommon', desc: 'The whole family in front of it at seven. Thump the side if the picture rolls.' },
    { id: 'boombox', name: 'Radio-Cassette Deck', jp: 'ラジカセ', rarity: 'rare', desc: 'Twin speakers, chrome everywhere, the top ten taped off the air.', gimmick: { text: 'Turn it up' } },
    { id: 'sewing', name: 'Cream Sewing Machine', jp: 'ミシン', rarity: 'ultra', desc: "Mother's machine: a cream enamel body, a chrome wheel, a thread of red." },
    { id: 'valve', name: 'Golden Valve Radio', jp: '黄金の真空管ラジオ', rarity: 'secret', desc: "Grandfather's valve set, warmed up and glowing, gold plated for the living-room shrine.", gimmick: { text: 'Warm it up' } },
  ],
};
