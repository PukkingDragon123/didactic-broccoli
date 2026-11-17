// Series 11: Street Corner (街角コレクション). Lowpix figures: art/lowpix/figures/_src/machikado.py
// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/machikado/).
export default {
  id: 'machikado',
  order: 11,
  name: "Street Corner",
  jp: "街角コレクション",
  tagline: "The corner of the street, small enough to keep",
  taglineJp: "あの街角を手のひらに",
  price: 300,
  themes: ["city", "retro"],
  card: { bg: '#efe8dc', accent: '#c8392b', text: '#22201e', accent2: '#3a7a5a', pattern: 'stripes' },
  capsule: { colors: [0xc8392b, 0x3a7a5a, 0xefe8dc, 0xe8a83a] },
  items: [
    { id: 'posuto', name: "Round Post Box", jp: "丸ポスト", rarity: 'common', desc: "The red pillar box on the corner, collections at nine and at four." },
    { id: 'jihanki', name: "Candy Vending Machine", jp: "キャンディー自販機", rarity: 'common', desc: "Push the big button: a capsule of sweets and a tune that sticks for a week.", gimmick: { text: "Push the button" } },
    { id: 'shokasen', name: "Fire Hydrant", jp: "消火栓", rarity: 'common', desc: "Bright red, chained caps, guarding the corner for fifty years." },
    { id: 'cone', name: "Roadworks Cone", jp: "工事のコーン", rarity: 'uncommon', desc: "Orange, striped, a little squashed. Somebody has to stand there.", gimmick: { text: "Knock it" } },
    { id: 'denwa', name: "Phone Booth", jp: "電話ボックス", rarity: 'uncommon', desc: "A glass box with a payphone and a phone book. Ten-yen coins stacked on the shelf." },
    { id: 'gaito', name: "Street Lamp", jp: "街灯", rarity: 'rare', desc: "The lamp where everyone waited to be picked up, moths and all." },
    { id: 'busstop', name: "Country Bus Stop", jp: "田舎のバス停", rarity: 'ultra', desc: "A little shelter with a bench and a timetable: one bus in the morning, one at night." },
    { id: 'golden', name: "Golden Post Box", jp: "黄金のポスト", rarity: 'secret', desc: "A post box plated in gold for the town's centenary. Letters posted here always arrive.", gimmick: { text: "Turn it" } },
  ],
};
