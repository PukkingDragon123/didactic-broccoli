// Series 5: Dagashi-ya Toys (駄菓子屋おもちゃ). Lowpix figures: art/lowpix/figures/_src/asobi.py
// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/asobi/).
export default {
  id: 'asobi',
  order: 5,
  name: "Dagashi-ya Toys",
  jp: "駄菓子屋おもちゃ",
  tagline: "Old-school toys you can really play with",
  taglineJp: "遊べる！駄菓子屋おもちゃ",
  price: 300,
  themes: ["retro", "weird"],
  card: { bg: '#fff1d6', accent: '#e8453c', text: '#3a2410', accent2: '#3f86e8', pattern: 'checker' },
  capsule: { colors: [0xe8453c, 0x3f86e8, 0xf7d046, 0x58c06c], style: 'tab' },
  items: [
    { id: 'squishy', name: "Melon-pan Squishy", jp: "メロンパンスクイーズ", rarity: 'common', desc: "Hold to squeeze. Smells like a bakery. Squeaks like a duck.", toy: 'squishy' },
    { id: 'superball', name: "Super Ball", jp: "スーパーボール", rarity: 'common', desc: "Click to throw. It will find the one gap under the fridge.", toy: 'ball' },
    { id: 'koma', name: "Spinning Top", jp: "手回しコマ", rarity: 'common', desc: "Click to spin it on the floor or the table. It wobbles like it means it.", toy: 'top' },
    { id: 'yoyo', name: "Champion Yo-yo", jp: "チャンピオンヨーヨー", rarity: 'uncommon', desc: "Click to throw it down. Hold to make it sleep. Walk the dog at your own risk.", toy: 'yoyo' },
    { id: 'robot', name: "Wind-up Tin Robot", jp: "ゼンマイブリキロボ", rarity: 'uncommon', desc: "Click to wind it up and set it down. It walks until it forgets why.", toy: 'robot', figParts: { key: true }, ownParts: ['key'] },
    { id: 'kendama', name: "Lacquer Kendama", jp: "けん玉", rarity: 'rare', desc: "Click to flip the ball: big cup, small cup... spike? One in a hundred. Probably.", toy: 'kendama', figParts: { ken: true, tama: true }, ownParts: ['tama'] },
    { id: 'dartgun', name: "Foam Dart Blaster", jp: "スポンジダーツ銃", rarity: 'ultra', desc: "Click to fire. The darts stick to walls, windows and very surprised neighbours.", toy: 'dartgun', figParts: { dart: true }, ownParts: ['dart'] },
    { id: 'lcdgame', name: "Pocket LCD Game", jp: "ポケット液晶ゲーム", rarity: 'secret', desc: "Click to play Capsule Dash. The high score is still 9999 from 1983. Nobody knows who.", toy: 'lcd', screen: { pts: true } },
  ],
};
