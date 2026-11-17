// Series 13: Tsukumogami Parade (付喪神パレード). Lowpix figures: art/lowpix/figures/_src/tsukumo.py
// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/tsukumo/).
export default {
  id: 'tsukumo',
  order: 13,
  name: "Tsukumogami Parade",
  jp: "付喪神パレード",
  tagline: "After a hundred years, things wake up",
  taglineJp: "百年たったら動きだす！",
  price: 300,
  themes: ["spooky", "japan", "weird"],
  card: { bg: '#22263a', accent: '#e8a83a', text: '#f0ead8', accent2: '#c83a4a', pattern: 'stars' },
  capsule: { colors: [0x22263a, 0xe8a83a, 0xc83a4a, 0x5ab8c8] },
  items: [
    { id: 'chochin', name: "Soba Shop Lantern", jp: "そば屋のちょうちん", rarity: 'common', desc: "The paper lantern from the soba shop door, a hundred summers old. It sways when nobody is near.", gimmick: { text: "Sway" } },
    { id: 'kasa', name: "Oiled Paper Umbrella", jp: "番傘", rarity: 'common', desc: "Bamboo ribs and oiled paper, closed and leaning, waiting for a rain that suits it.", gimmick: { text: "Hop" } },
    { id: 'geta', name: "Wooden Geta", jp: "下駄", rarity: 'common', desc: "One clog with a red thong, worn hollow at the heel. Clack. Clack. By itself.", gimmick: { text: "Hop" } },
    { id: 'kettle', name: "Iron Kettle", jp: "鉄瓶", rarity: 'uncommon', desc: "Cast iron, bumpy as a toad, still humming on the brazier after a hundred years.", gimmick: { text: "Rattle" } },
    { id: 'broom', name: "Temple Broom", jp: "お寺のほうき", rarity: 'uncommon', desc: "The broom that sweeps the temple path at night. It leaves the leaves in the shape of a word.", gimmick: { text: "Sweep" } },
    { id: 'mon', name: "Crest Lantern", jp: "紋ちょうちん", rarity: 'secret', desc: "The shrine lantern with the family crest. Lit once a year, and it remembers every face.", gimmick: { text: "Bob" } },
  ],
};
