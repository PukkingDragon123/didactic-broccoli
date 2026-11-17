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
    { id: 'capy', name: "Yuzu Bath Capybara", jp: "ゆず湯カピバラ", rarity: 'common', desc: "Eyes half shut in a tub full of floating yuzu. Has not moved since November." },
    { id: 'penguin', name: "Bath Pail Penguin", jp: "湯おけペンギン", rarity: 'common', desc: "Brought its own wash bucket and a towel. Very polite at the baths.", gimmick: { text: "Waddle" } },
    { id: 'frog', name: "Hinoki Tub Frog", jp: "ひのき風呂のカエル", rarity: 'common', desc: "Sitting on the rim of the cedar tub, thinking about getting in. Still thinking.", gimmick: { text: "Hop in" } },
    { id: 'otter', name: "Otter on the Rocks", jp: "岩の上のカワウソ", rarity: 'uncommon', desc: "Stood up on the warm stones to see who has the yuzu.", gimmick: { text: "Look round" } },
    { id: 'duck', name: "Bath Duck", jp: "お風呂のアヒル", rarity: 'uncommon', desc: "The yellow duck that lives in the men's bath. Nobody knows whose it is.", gimmick: { text: "Bob" } },
    { id: 'family', name: "Capybara Family Bath", jp: "カピバラ一家", rarity: 'rare', desc: "Mother, father and the little one, all in one tub, all asleep." },
    { id: 'rotenburo', name: "Rock Pool Under Snow", jp: "雪見の露天風呂", rarity: 'ultra', desc: "The open-air bath in the snow: a frog, an otter and a capybara who do not get along." },
    { id: 'kinkapi', name: "Golden Capybara", jp: "金のカピバラ様", rarity: 'secret', desc: "The god of the baths: a golden capybara with a golden yuzu on its head.", gimmick: { text: "Turn it" } },
  ],
};
