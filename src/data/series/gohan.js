// Gohan Zoo (ごはんズー): little animals made of Shōwa home cooking, an original capsule-toy mascot series modelled in
// lowpix (art/lowpix/figures/_src/gohan.py): soft glossy PVC, dot eyes, airbrushed blush. 5 figures, one secret.
export default {
  id: 'gohan',
  order: 27,
  name: "Gohan Zoo",
  jp: 'ごはんズー',
  tagline: "Itadakimasu, little friends!",
  taglineJp: 'いただきます、どうぶつたち！',
  price: 200,
  themes: ['food', 'cute'],
  card: { bg: '#fff3dc', accent: '#e8582a', text: '#3a2414', accent2: '#3a8a4a', pattern: 'dots' },
  capsule: { colors: [0xe8582a, 0x3a8a4a, 0xfff3dc, 0xf6d062] },
  items: [
    { id: 'onigiri', name: "Onigiri Penguin", jp: 'おにぎりペンギン', rarity: 'common', desc: "A rice-ball penguin in a nori tailcoat. It waddles straight into your bento.", gimmick: { text: 'Wobble' } },
    { id: 'gyoza', name: "Gyoza Seal", jp: 'ぎょうざアザラシ', rarity: 'common', desc: "A pan-fried seal pup, crisp underneath, pleated along the back. Best with a little vinegar.", gimmick: { text: 'Wobble' } },
    { id: 'ebi', name: "Tempura Yokozuna", jp: 'えびてん横綱', rarity: 'uncommon', desc: "A prawn tempura sumo wrestler, crisp batter, red tail for a topknot. Undefeated at dinner.", gimmick: { text: 'Bow' } },
    { id: 'dango', name: "Dango Caterpillar", jp: 'だんごむし', rarity: 'rare', desc: "Three sweet dumplings on a skewer, out for a slow walk under the cherry blossom.", gimmick: { text: 'Wobble' } },
    { id: 'purin', name: "Pudding Kaiju", jp: 'プリンかいじゅう', rarity: 'secret', desc: "Custard pudding with a caramel crown, risen from the bottom of the fridge. Wobbles when it roars.", gimmick: { text: 'Roar' } },
  ],
};
