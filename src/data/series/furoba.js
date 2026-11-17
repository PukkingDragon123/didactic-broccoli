// Bathhouse Buddies (銭湯なかま): animals at the neighbourhood sentō, an original capsule-toy mascot series modelled in
// lowpix (art/lowpix/figures/_src/furoba.py): soft glossy PVC, dot eyes, airbrushed blush. 6 figures, one secret.
export default {
  id: 'furoba',
  order: 29,
  name: "Bathhouse Buddies",
  jp: '銭湯なかま',
  tagline: "A good soak, then coffee milk",
  taglineJp: 'いい湯だな、コーヒー牛乳',
  price: 200,
  themes: ['retro', 'cute'],
  card: { bg: '#e4f2f4', accent: '#2a6ab0', text: '#1e2a34', accent2: '#d8483a', pattern: 'grid' },
  capsule: { colors: [0x2a6ab0, 0xd8483a, 0xe4f2f4, 0xf2c43a] },
  items: [
    { id: 'coffee', name: "Coffee-Milk Bear", jp: 'コーヒー牛乳くま', rarity: 'common', desc: "Hand on hip, towel round the neck, coffee milk in one go. The only correct way to finish a bath.", gimmick: { text: 'Gulp' } },
    { id: 'oke', name: "Bucket Penguin", jp: 'ておけペンギン', rarity: 'common', desc: "Sitting in the wooden bath pail with a folded towel on its head. It refuses to get out.", gimmick: { text: 'Wobble' } },
    { id: 'scrub', name: "Back-Scrub Monkey", jp: 'せなかながしザル', rarity: 'uncommon', desc: "Pink-faced from the heat, sawing a long towel across its back. Scrubs yours too, for one banana.", gimmick: { text: 'Scrub' } },
    { id: 'frog', name: "Basin Frog", jp: 'おけカエル', rarity: 'uncommon', desc: "On the little wooden stool with its yellow basin and a new bar of soap. Always the first one in.", gimmick: { text: 'Hop' } },
    { id: 'hippo', name: "Soaking Hippo", jp: 'ながゆカバ', rarity: 'rare', desc: "Up to its chin in the hottest tub, a little towel folded on its head. Has not moved since Tuesday.", gimmick: { text: 'Wobble' } },
    { id: 'steam', name: "Spirit of the Steam", jp: 'ゆけむりさま', rarity: 'secret', desc: "The sentō's own little god: a puff of steam with a wooden pail. Appears only when the water is perfect.", gimmick: { text: 'Hop' } },
  ],
};
