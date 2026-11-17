// Series 6: Showa Home Appliances (昭和の家電). The machines of a 1960s-70s Japanese home, real models made small, each
// standing on its own feet (art/lowpix/figures/_src/denka.py).
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
    { id: 'fan', name: 'Chrome Electric Kettle', jp: '電気ポット', rarity: 'common', desc: 'A dial on the side says when it is ready. It never says, so you watch it.', gimmick: { text: 'Rattle the lid' } },
    { id: 'cooker', name: 'Green Vacuum Flask', jp: 'みどりの魔法瓶', rarity: 'common', desc: 'Barley tea, still cold at the bottom of the hill. The cup on top is the lid.' },
    { id: 'radio', name: 'Cassette Recorder', jp: 'カセットレコーダー', rarity: 'uncommon', desc: 'Press play and record together, hold it up to the TV speaker, and nobody breathe.', gimmick: { text: 'Press play' } },
    { id: 'tv', name: 'Wooden Cabinet TV', jp: '家具調テレビ', rarity: 'uncommon', desc: 'The whole family in front of it at seven. Thump the side if the picture rolls.' },
    { id: 'boombox', name: 'Radio-Cassette Deck', jp: 'ラジカセ', rarity: 'rare', desc: 'Twin speakers, chrome everywhere, the top ten taped off the air.', gimmick: { text: 'Turn it up' } },
    { id: 'sewing', name: 'Twin-Bell Alarm Clock', jp: 'ベル目覚まし時計', rarity: 'ultra', desc: 'Two bells and a hammer, wound every night, louder than the whole street.', gimmick: { text: 'Ring the bells' } },
    { id: 'valve', name: 'Sunday Night Projector', jp: '日曜の夜の映写機', rarity: 'secret', desc: "Father's 8 mm projector: the sheet on the wall, the reels turning, the summer at the sea again.", gimmick: { text: 'Roll film' } },
  ],
};
