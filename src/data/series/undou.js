// Sports Day (うんどうかい). the kit from the school field, Poly Haven CC0 models made small in the line's finish, lying or standing on their own (art/lowpix/figures/_src/undou.py).
export default {
  id: 'undou',
  order: 26,
  name: "Sports Day",
  jp: 'うんどうかい',
  tagline: "Ready, steady, go!",
  taglineJp: 'よーい、どん！',
  price: 200,
  themes: ['school', 'retro'],
  card: { bg: '#eaf0f2', accent: '#c8302a', text: '#1e2a30', accent2: '#2a6ac8', pattern: 'dots' },
  capsule: { colors: [0xc8302a, 0x2a6ac8, 0xeaf0f2, 0xe8c030] },
  items: [
    { id: 'baseball', name: "Baseball", jp: 'やきゅうのボール', rarity: 'common', desc: "Red stitches, grass stains and a name in marker that has nearly worn away.", gimmick: { text: 'Hop' } },
    { id: 'rugby', name: "Rugby Ball", jp: 'ラグビーボール', rarity: 'common', desc: "Bounces in every direction but the one you want.", gimmick: { text: 'Wobble' } },
    { id: 'bat', name: "Wooden Bat", jp: '木のバット', rarity: 'uncommon', desc: "Taped at the grip, signed by the whole team in the last summer.", gimmick: { text: 'Slide' } },
    { id: 'megaphone', name: "Megaphone", jp: 'メガホン', rarity: 'rare', desc: "The teacher's megaphone: \"Red team, last lap!\" heard three streets away.", gimmick: { text: 'Wobble' } },
    { id: 'dartboard', name: "Dartboard", jp: 'ダーツボード', rarity: 'secret', desc: "From the teachers' room, the real secret of sports day. Nobody ever hits the bull.", gimmick: { text: 'Turn' } },
  ],
};
