// Series 12: Onsen Animals (どうぶつ温泉). Lowpix figures: art/lowpix/figures/_src/yudono.py
// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/yudono/).
export default {
  id: 'yudono',
  order: 12,
  name: "Onsen Animals",
  jp: "どうぶつ温泉",
  tagline: "Everybody into the bath",
  taglineJp: "いい湯だな〜どうぶつ温泉",
  price: 200,
  themes: ["japan", "cute"],
  card: { bg: '#e6f0ee', accent: '#3a8a8a', text: '#1a2828', accent2: '#e8a83a', pattern: 'waves' },
  capsule: { colors: [0x3a8a8a, 0xe8a83a, 0xe6f0ee, 0x8a5a3a] },
  items: [
    { id: 'frog', name: "Hinoki Tub Frog", jp: "ひのき風呂のカエル", rarity: 'common', desc: "Up to its chin in the cypress tub, eyes half shut. Do not mention the cold plunge." },
    { id: 'otter', name: "Otter on the Rocks", jp: "岩の上のカワウソ", rarity: 'uncommon', desc: "Stood up on the warm stones to see who has the yuzu.", gimmick: { text: "Look round" } },
    { id: 'duck', name: "Bath Duck", jp: "おふろのアヒル", rarity: 'uncommon', desc: "The rubber duck of the bath house, sat on the pail it lives in. Squeak once for luck.", gimmick: { text: "Squeak" } },
  ],
};
