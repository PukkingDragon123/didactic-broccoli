// Series 2: Desk Drawer (ひきだし文具). Lowpix figures: art/lowpix/figures/_src/hikidashi.py
// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/hikidashi/).
export default {
  id: 'hikidashi',
  order: 2,
  name: "Desk Drawer",
  jp: "ひきだし文具",
  tagline: "Everything in your school desk, small enough to lose",
  taglineJp: "机の引き出し大集合！",
  price: 100,
  themes: ["school", "retro", "home"],
  card: { bg: '#eef2f6', accent: '#2a5aa8', text: '#1a2030', accent2: '#d83a2a', pattern: 'grid' },
  capsule: { colors: [0x2a5aa8, 0xd83a2a, 0xeef2f6, 0xe8c040] },
  items: [
    { id: 'fudebako', name: "Pencil Case Set", jp: "筆箱セット", rarity: 'common', desc: "The case, the pencil, the ruler, the sharpener and the eraser that smells of strawberries." },
    { id: 'cup', name: "Pencil Cup", jp: "えんぴつ立て", rarity: 'common', desc: "Every pencil and pen you own, all chewed at the same end." },
    { id: 'stapler', name: "Stapler", jp: "ホッチキス", rarity: 'common', desc: "Open wide, clack. It has eaten a thousand worksheets and wants more.", gimmick: { text: "Clack" } },
    { id: 'kezuri', name: "Crank Sharpener", jp: "鉛筆削り", rarity: 'uncommon', desc: "Clamp it to the desk, turn the handle: the best smell in the classroom.", gimmick: { text: "Turn the crank" } },
    { id: 'pen', name: "Fountain Pen", jp: "万年筆", rarity: 'rare', desc: "Father's red fountain pen. You were absolutely not to touch it." },
    { id: 'golden', name: "Grandfather's Pocket Watch", jp: "おじいちゃんの懐中時計", rarity: 'secret', desc: "Engraved gold, wound every morning at six, never once late. It is still ticking in the drawer.", gimmick: { text: "Turn it" } },
  ],
};
