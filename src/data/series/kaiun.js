// Series 20: Lucky Charms (開運招福). Lowpix figures: art/lowpix/figures/_src/kaiun.py
// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/kaiun/).
export default {
  id: 'kaiun',
  order: 20,
  name: "Lucky Charms",
  jp: "開運招福",
  tagline: "Good luck, in a capsule",
  taglineJp: "ご利益たっぷり開運招福！",
  price: 500,
  themes: ["shrine", "japan"],
  card: { bg: '#fff2e0', accent: '#c8302a', text: '#2a1810', accent2: '#e8b830', pattern: 'sakura' },
  capsule: { colors: [0xc8302a, 0xe8b830, 0xfff2e0, 0x2a2a2a] },
  items: [
    { id: 'maneki', name: "Beckoning Cat", jp: "招き猫", rarity: 'common', desc: "Left paw up for customers, a gold koban coin in the other. Every shop needs one.", gimmick: { text: "Beckon" } },
    { id: 'daruma', name: "Daruma", jp: "だるま", rarity: 'common', desc: "Paint one eye when you make the wish, the other when it comes true. He never falls over.", gimmick: { text: "Wobble" } },
    { id: 'torii', name: "Vermilion Torii", jp: "朱の鳥居", rarity: 'uncommon', desc: "The gate between the street and the shrine. Bow once on the way through." },
    { id: 'toro', name: "Stone Lantern", jp: "石灯籠", rarity: 'uncommon', desc: "Moss on the roof, a candle inside on festival nights." },
    { id: 'koi', name: "Lucky Koi", jp: "開運の鯉", rarity: 'rare', desc: "A red-and-white carp from the shrine pond. Climb the waterfall, become a dragon.", gimmick: { text: "Swim" } },
    { id: 'kitsune', name: "Inari Fox", jp: "お稲荷さん", rarity: 'secret', desc: "The shrine fox in her red bib, a scroll key in her mouth, on her stone plinth. Leave her an inari-zushi." },
  ],
};
