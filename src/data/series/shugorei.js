// Series 22: Guardian Spirits (守護霊ガーディアンズ). Lowpix figures: art/lowpix/figures/_src/shugorei.py
// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/shugorei/).
export default {
  id: 'shugorei',
  order: 22,
  name: "Guardian Spirits",
  jp: "守護霊ガーディアンズ",
  tagline: "Every fate has a guardian. Pull yours.",
  taglineJp: "あらわれよ、守護の霊！",
  price: 500,
  themes: ["weird", "spooky"],
  card: { bg: '#1e1a2a', accent: '#b85ae8', text: '#f0e8ff', accent2: '#f0c850', pattern: 'stars' },
  capsule: { colors: [0x1e1a2a, 0xb85ae8, 0xf0c850, 0x4ac8e8] },
  items: [
    { id: 'tetsu', name: "Iron Ronin", jp: "鉄の浪人", rarity: 'common', desc: "A masterless guardian in lacquered iron, hand on the sword it has never drawn.", gimmick: { text: "Turn" } },
    { id: 'kage', name: "Shadow Step", jp: "影ふみ", rarity: 'common', desc: "A masked guardian of the night roofs. You will only ever see its outline.", gimmick: { text: "Turn" } },
    { id: 'kishi', name: "Forgotten Knight", jp: "忘れられた騎士", rarity: 'common', desc: "A closed helm and a long cloak, standing guard over a promise nobody remembers.", gimmick: { text: "Turn" } },
    { id: 'ou', name: "Old King's Armour", jp: "老王の甲冑", rarity: 'uncommon', desc: "Gilded plate with nobody inside, still walking the castle walls.", gimmick: { text: "Turn" } },
    { id: 'raijin', name: "Lightning Edge", jp: "稲妻の刃", rarity: 'uncommon', desc: "A cyborg guardian frozen mid-lunge, blade out, crackling with stolen thunder.", gimmick: { text: "Strike" } },
    { id: 'yoroi', name: "Empty Armour", jp: "空っぽの鎧", rarity: 'rare', desc: "A great general's armour on its stand. At night the stand is empty.", gimmick: { text: "Turn" } },
    { id: 'mecha', name: "Chrome Shinobi", jp: "クロームの忍", rarity: 'ultra', desc: "Half shadow, half machine: the ninja the future sent back.", gimmick: { text: "Turn" } },
  ],
};
