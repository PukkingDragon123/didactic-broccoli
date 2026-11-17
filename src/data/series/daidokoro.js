// Kitchen Shelf (台所のたな). the pots, jugs and bowls of a Showa kitchen, Poly Haven CC0 models made small in the line's finish, standing on their own (art/lowpix/figures/_src/daidokoro.py).
export default {
  id: 'daidokoro',
  order: 25,
  name: "Kitchen Shelf",
  jp: '台所のたな',
  tagline: "Pots, pans and the good teapot",
  taglineJp: 'なつかしの台所',
  price: 300,
  themes: ['home', 'retro'],
  card: { bg: '#eef0e6', accent: '#3a6a8a', text: '#22262a', accent2: '#c8783a', pattern: 'grid' },
  capsule: { colors: [0x3a6a8a, 0xc8783a, 0xeef0e6, 0x8a3a2a] },
  items: [
    { id: 'nabe', name: "Enamel Pot", jp: 'ほうろう鍋', rarity: 'common', desc: "Flower-painted enamel with a chip on the lid, for curry on Fridays.", gimmick: { text: 'Hop' } },
    { id: 'jug', name: "Flower Jug", jp: '花がらの水さし', rarity: 'common', desc: "Tulips round the belly, barley tea inside, a ring on the table underneath.", gimmick: { text: 'Wobble' } },
    { id: 'bowl', name: "Wooden Bowl", jp: '木のおわん', rarity: 'common', desc: "Turned from one piece of zelkova, the miso soup bowl of the house.", gimmick: { text: 'Turn' } },
    { id: 'milk', name: "Milk Can", jp: '牛乳缶', rarity: 'uncommon', desc: "The tall can the milkman filled at dawn, dented from the bicycle.", gimmick: { text: 'Wobble' } },
    { id: 'board', name: "Cutting Board", jp: 'まな板', rarity: 'uncommon', desc: "Scarred by thirty years of the same knife and the same pickles.", gimmick: { text: 'Slide' } },
    { id: 'brasspot', name: "Brass Pot", jp: '真ちゅうの鍋', rarity: 'rare', desc: "Heavy, golden, polished every New Year until it shone.", gimmick: { text: 'Turn' } },
    { id: 'teaset', name: "Best Tea Set", jp: 'よそいきの茶器', rarity: 'secret', desc: "Pot, cups and saucers in flowered porcelain, only out for the most important guests.", gimmick: { text: 'Hop' } },
  ],
};
