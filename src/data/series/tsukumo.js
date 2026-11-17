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
    { id: 'chochin', name: "Lantern Ghost", jp: "ちょうちんおばけ", rarity: 'common', desc: "The soba shop's paper lantern split along a rib and stuck its tongue out.", gimmick: { text: "Hop" } },
    { id: 'kasa', name: "Umbrella Ghost", jp: "からかさおばけ", rarity: 'common', desc: "A paper umbrella with one eye, one leg, and a lot to say about the rain.", gimmick: { text: "Hop" } },
    { id: 'geta', name: "Hopping Geta", jp: "はねる下駄", rarity: 'common', desc: "One wooden clog that hops along the stepping stones by itself. Clack. Clack.", gimmick: { text: "Hop" } },
    { id: 'kettle', name: "Iron Kettle Spirit", jp: "鉄瓶のつくも神", rarity: 'uncommon', desc: "A cast-iron kettle that hums to itself and steams when it is cross.", gimmick: { text: "Rattle" } },
    { id: 'broom', name: "Broom Spirit", jp: "ほうき神", rarity: 'uncommon', desc: "The temple broom that sweeps the path at night. It leaves the leaves in the shape of a face.", gimmick: { text: "Sweep" } },
    { id: 'mon', name: "Crest Lantern", jp: "紋ちょうちん", rarity: 'rare', desc: "The shrine lantern with the swirling crest. Its eye only opens at the festival.", gimmick: { text: "Hop" } },
    { id: 'parade', name: "Night Parade", jp: "百鬼夜行", rarity: 'ultra', desc: "Lantern, umbrella and clog marching under the moon. Do not join in." },
    { id: 'golden', name: "Golden Kettle", jp: "黄金の鉄瓶", rarity: 'secret', desc: "A hundred-year kettle that turned to gold instead of to mischief. Lucky for someone.", gimmick: { text: "Turn it" } },
  ],
};
