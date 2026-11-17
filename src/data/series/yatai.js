// Series 18: Summer Festival Stalls (夏祭り屋台). Lowpix figures: art/lowpix/figures/_src/yatai.py
// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/yatai/).
export default {
  id: 'yatai',
  order: 18,
  name: "Summer Festival Stalls",
  jp: "夏祭り屋台",
  tagline: "A summer night at the shrine festival",
  taglineJp: "お祭りの屋台へようこそ！",
  price: 300,
  themes: ["japan", "food", "retro"],
  card: { bg: '#2a2440', accent: '#e85a3a', text: '#f6ecd8', accent2: '#f0c040', pattern: 'dots' },
  capsule: { colors: [0xe85a3a, 0xf0c040, 0x2a2440, 0x3a8ac8] },
  items: [
    { id: 'kingyo', name: "Goldfish in a Bag", jp: "金魚すくい", rarity: 'common', desc: "Won at the scooping stall with the third paper net. Name: Kintaro.", gimmick: { text: "Swish" } },
    { id: 'omen', name: "Fox Mask", jp: "きつねのお面", rarity: 'common', desc: "White fox with red marks, from the mask stall. Wear it on the side of your head, like everyone." },
    { id: 'takoyaki', name: "Takoyaki Boat", jp: "たこ焼き舟", rarity: 'common', desc: "Eight hot octopus balls with sauce, mayo and dancing bonito flakes. Burns every time." },
    { id: 'wataame', name: "Cotton Candy", jp: "わたあめ", rarity: 'uncommon', desc: "A pink cloud on a stick, in a bag with a hero printed on it." },
    { id: 'yoyo', name: "Water Yo-yo Balloon", jp: "水ヨーヨー", rarity: 'uncommon', desc: "A water balloon on a rubber band. Thwack, thwack, splash." },
    { id: 'taiko', name: "Festival Drum", jp: "祭り太鼓", rarity: 'rare', desc: "The big drum on the yagura stand. You feel it in your chest before you hear it.", gimmick: { text: "Drum" } },
    { id: 'stall', name: "Shaved Ice Stall", jp: "かき氷屋台", rarity: 'ultra', desc: "Flags flapping, syrups lined up, the ice shaver turning. Strawberry or melon?" },
    { id: 'golden', name: "Golden Lucky Goldfish", jp: "黄金の金魚", rarity: 'secret', desc: "The one nobody can scoop: a golden oranda with a red cap. Lucky all year.", gimmick: { text: "Swish" } },
  ],
};
