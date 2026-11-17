// Series 16: Kaiju Diorama (大怪獣ジオラマ). Lowpix figures: art/lowpix/figures/_src/daikaiju.py
// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/daikaiju/).
export default {
  id: 'daikaiju',
  order: 16,
  name: "Kaiju Diorama",
  jp: "大怪獣ジオラマ",
  tagline: "The monsters are in town",
  taglineJp: "大怪獣、街にあらわる！",
  price: 400,
  themes: ["weird", "city"],
  card: { bg: '#2a2a36', accent: '#e85a2a', text: '#f0ece0', accent2: '#5ab84a', pattern: 'stripes' },
  capsule: { colors: [0xe85a2a, 0x5ab84a, 0x2a2a36, 0xe8c040] },
  items: [
    { id: 'gyaosaur', name: "Gyaosaur", jp: "ギャオザウルス", rarity: 'common', desc: "Green, scaled and furious, roaring at the department store. It wanted the rooftop rides.", gimmick: { text: "Roar" } },
    { id: 'kanigon', name: "Kanigon", jp: "カニゴン", rarity: 'common', desc: "A giant crab from the bay, sideways down the shopping street, snapping at the signs.", gimmick: { text: "Scuttle" } },
    { id: 'iwagame', name: "Iwagame", jp: "イワガメ", rarity: 'uncommon', desc: "A turtle the size of a hill, with a shell of broken rock. Sleeps in the reservoir.", gimmick: { text: "Turn" } },
    { id: 'gamagon', name: "Gamagon", jp: "ガマゴン", rarity: 'uncommon', desc: "A warty toad monster with a temple bell for a croak. Rains for a week after.", gimmick: { text: "Hop" } },
    { id: 'okami', name: "Longneck", jp: "ナガクビ", rarity: 'rare', desc: "Peers over the five-storey pagoda to see who is ringing the bell.", gimmick: { text: "Look round" } },
  ],
};
