// Tanuki Express (たぬき便): the lane's tanuki delivery crew, an original capsule-toy mascot series modelled in lowpix
// (art/lowpix/figures/_src/tanukibin.py): soft glossy PVC, each with its own pose and load. 5 figures, one secret.
export default {
  id: 'tanukibin',
  order: 28,
  name: "Tanuki Express",
  jp: 'たぬき便',
  tagline: "Delivered by tanuki, rain or shine",
  taglineJp: '雨の日も風の日も、たぬきがおとどけ',
  price: 300,
  themes: ['retro', 'cute'],
  card: { bg: '#f2e8d4', accent: '#2c4a7a', text: '#2a2018', accent2: '#c83a2c', pattern: 'grid' },
  capsule: { colors: [0x9a7650, 0x2c4a7a, 0xf2e8d4, 0xc83a2c] },
  items: [
    { id: 'soba', name: "Soba Run", jp: 'そばの出前', rarity: 'common', desc: "Three trays of zaru soba on one paw, through the lane at full speed. Not a noodle lost.", gimmick: { text: 'Wobble' } },
    { id: 'parcel', name: "Furoshiki Courier", jp: 'ふろしき便', rarity: 'common', desc: "A parcel twice its size, wrapped in the green arabesque cloth, knotted at the chest. Off it goes.", gimmick: { text: 'Hop' } },
    { id: 'milk', name: "Milk Round", jp: '牛乳配達', rarity: 'uncommon', desc: "Four bottles in the wooden crate before the sun is up. It never drinks one. Almost never.", gimmick: { text: 'Wobble' } },
    { id: 'news', name: "Morning Paper", jp: '新聞配達', rarity: 'rare', desc: "One paw in the satchel, one paw throwing. It lands on the doorstep every time, in the bucket only once.", gimmick: { text: 'Nod' } },
    { id: 'night', name: "Night Shift", jp: '夜のおとどけ', rarity: 'secret', desc: "Last delivery after the bath house shuts: a red paper lantern on a pole and a bento for the watchman.", gimmick: { text: 'Wobble' } },
  ],
};
