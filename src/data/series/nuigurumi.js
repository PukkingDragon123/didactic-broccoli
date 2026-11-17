// Plush Pals (ぬいぐるみなかま). real soft toys, hand-made models and 3D scans of plushies (Sketchfab CC BY), made small in the line's finish, sitting on their own (art/lowpix/figures/_src/nuigurumi.py).
export default {
  id: 'nuigurumi',
  order: 1,
  name: "Plush Pals",
  jp: 'ぬいぐるみなかま',
  tagline: "Soft, stitched and squeezable",
  taglineJp: 'ふわふわぬいぐるみ',
  price: 200,
  themes: ['cute', 'home'],
  card: { bg: '#fbeee4', accent: '#d8607a', text: '#3a2a2e', accent2: '#6aa8c8', pattern: 'dots' },
  capsule: { colors: [0xd8607a, 0x6aa8c8, 0xfbeee4, 0xe8c070] },
  items: [
    { id: 'teddy', name: "Old Teddy", jp: 'くまのぬいぐるみ', rarity: 'common', desc: "Bald at the paws from forty years of hugs. Still the first one in the bed.", gimmick: { text: 'Nod' } },
    { id: 'bunny', name: "Knitted Bunny", jp: 'あみぐるみうさぎ', rarity: 'common', desc: "Hand-knitted ears, one a little longer, and a nose of pink thread.", gimmick: { text: 'Wobble' } },
    { id: 'penguin', name: "Penguin Plush", jp: 'ペンギンのぬいぐるみ', rarity: 'common', desc: "A round penguin with felt feet. It sits up by itself, which is more than most.", gimmick: { text: 'Hop' } },
    { id: 'lamb', name: "Fleece Lamb", jp: 'ひつじのぬいぐるみ', rarity: 'uncommon', desc: "Lying down in fleece gone soft and grey. It has been through the washing machine six times.", gimmick: { text: 'Nod' } },
    { id: 'fox', name: "Corduroy Fox", jp: 'キツネのぬいぐるみ', rarity: 'uncommon', desc: "Orange corduroy, a white-tipped tail and a stitched smile that never changes.", gimmick: { text: 'Turn' } },
    { id: 'elephant', name: "Temple Elephant Plush", jp: 'ぞうのぬいぐるみ', rarity: 'uncommon', desc: "Red flowered cloth, a little blanket on its back, bought at a festival far away.", gimmick: { text: 'Wobble' } },
    { id: 'whale', name: "Denim Whale", jp: 'デニムのくじら', rarity: 'rare', desc: "Sewn from somebody's old jeans, its seams showing, its tail flipped up.", gimmick: { text: 'Wobble' } },
    { id: 'owl', name: "Patchwork Owl", jp: 'パッチワークのふくろう', rarity: 'ultra', desc: "Plaid wings, a heart on its tummy and two big felt eyes. Made from the scrap bag.", gimmick: { text: 'Turn' } },
    { id: 'narwhal', name: "Rainbow Narwhal", jp: 'にじいろイッカク', rarity: 'secret', desc: "Spotted, rainbow-finned, with a felt horn. Won at the claw machine on the very last coin.", gimmick: { text: 'Hop' } },
  ],
};
