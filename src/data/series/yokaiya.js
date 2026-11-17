// Yōkai Yatai (妖怪屋台): night-festival yōkai and their favourite stall treats, an original capsule-toy mascot series
// modelled in lowpix (art/lowpix/figures/_src/yokaiya.py): soft glossy PVC, big painted eyes. 6 figures, one secret.
export default {
  id: 'yokaiya',
  order: 30,
  name: "Yōkai Yatai",
  jp: '妖怪屋台',
  tagline: "The festival after dark",
  taglineJp: '夜のおまつり、妖怪だらけ',
  price: 300,
  themes: ['spooky', 'festival'],
  card: { bg: '#2a2440', accent: '#f2a83a', text: '#f4ead2', accent2: '#d83a3a', pattern: 'dots' },
  capsule: { colors: [0x7a4ab0, 0xd83a3a, 0x2a2440, 0xf2a83a] },
  items: [
    { id: 'karakasa', name: "Karakasa & Cotton Candy", jp: 'からかさとわたあめ', rarity: 'common', desc: "The one-eyed paper umbrella hops to the cotton-candy stall on its one wooden leg.", gimmick: { text: 'Hop' } },
    { id: 'chochin', name: "Lantern & Goldfish", jp: 'ちょうちんと金魚', rarity: 'common', desc: "The paper-lantern yōkai won a goldfish at the scooping stall and will not stop looking at it.", gimmick: { text: 'Wobble' } },
    { id: 'zori', name: "Walking Zōri", jp: 'ばけぞうり', rarity: 'uncommon', desc: "A straw sandal that got up and walked off to the festival, fanning itself all the way.", gimmick: { text: 'Wobble' } },
    { id: 'nurikabe', name: "Nurikabe & Takoyaki", jp: 'ぬりかべとたこ焼き', rarity: 'uncommon', desc: "The wall yōkai blocks the whole lane so nobody else gets to the takoyaki boat first.", gimmick: { text: 'Wobble' } },
    { id: 'kappa', name: "Kappa & Pickle", jp: 'かっぱときゅうり', rarity: 'rare', desc: "A cucumber on a stick from the pickle stall, and the water in its head-plate sloshing. Perfect night.", gimmick: { text: 'Nod' } },
    { id: 'kitsune', name: "Kitsune-bi", jp: 'きつね火', rarity: 'secret', desc: "The white fox of the shrine at the top of the lane, two blue foxfires dancing on its tails. Seen once a year.", gimmick: { text: 'Wobble' } },
  ],
};
