// Otenki-bin (おてんき便, "Weather Express"): the weather is delivered, Shōwa style, by animal couriers on cloud
// scooters (a handlebar and bell, a carrier rack, a number plate, wheels hidden in the cloud's belly). An original
// pull-back capsule series modelled in Blender (art/blender/toys/otenki, concept in art/blender/toys/concepts_D.md).
// Pull one back on a table and let go and the cloud scoots off (src/game/toys.js); press it (left click while you
// inspect it, right click on a shelf) and it delivers its weather.
const PB = (speed, dist) => ({ clip: 'run', speed, dist, wind: 0.45, text: 'Pull it back and let go', sfx: 'toyRatchet' });
export default {
  id: 'otenki',
  order: 51,
  name: 'Weather Express',
  jp: 'おてんき便',
  tagline: "Today's weather, delivered to your door.",
  taglineJp: '本日のお天気、お届けします',
  price: 300,
  themes: ['retro', 'cute'],
  card: { bg: '#e6eef4', accent: '#2a5ab0', text: '#1c2430', accent2: '#f2c230', pattern: 'stripes', kind: 'おてんき配達フィギュア' },
  capsule: { colors: [0x2a5ab0, 0xf2c230, 0xeef0f2, 0x7a8292] },
  items: [
    {
      id: 'ushi', name: 'Thunder Calf', jp: 'かみなりコウシ', rarity: 'common', pullback: PB(0.85, 1.0),
      desc: 'A brown calf in the thunder god\'s tiger-stripe shorts on a dark thundercloud, the god\'s ring of little taiko drums strapped on behind. Don-don-don over his shoulders, and the lightning bolt on the cloud\'s nose jumps up crackling.',
      gimmick: { text: 'Don-don!', sfx: [[0.2, 'thud', { v: 0.5 }], [0.4, 'thud', { v: 0.5 }], [0.6, 'thud', { v: 0.5 }], [0.67, 'zap'], [0.8, 'thud', { v: 0.5 }], [1.0, 'thud', { v: 0.5 }], [1.2, 'thud', { v: 0.5 }], [1.4, 'thud', { v: 0.5 }], [1.78, 'thud', { v: 0.9 }]] },
      light: { part: 'bolt', color: '#fff2a0', mode: 'press', dur: 2.0, blink: [0.08, 0.06] },
    },
    {
      id: 'momonga', name: 'Wind Flying-Squirrel', jp: 'かぜモモンガ', rarity: 'common', pullback: PB(0.95, 1.2),
      desc: 'A Japanese flying squirrel with huge dark eyes on a curly wisp of a cloud, the wind itself packed in a green furoshiki on the rack. It undoes the knot and its gliding membranes billow out wide while the bundle sags empty.',
      gimmick: { text: 'Whoosh', sfx: [[0.13, 'toyFold', { n: 2 }], [0.5, 'whoosh'], [0.7, 'whoosh'], [1.1, 'whoosh']] },
    },
    {
      id: 'kamo', name: 'Rain Duck', jp: 'あめガモ', rarity: 'uncommon', pullback: PB(0.75, 0.9),
      desc: 'A spot-billed duck in a yellow sou\'wester on a blue-grey rain cloud, steering with a big tin watering can. The rose always drips. Tip it, and a shower of rain fans out over the cloud\'s nose.',
      gimmick: { text: 'Pitter-pat', sfx: [[0.13, 'toyFold', { n: 1 }], [0.55, 'pour'], [0.9, 'splash'], [1.0, 'toyBuzz', { dur: 0.12 }]] },
    },
    {
      id: 'raichou', name: 'Snow Ptarmigan', jp: 'ゆきライチョウ', rarity: 'uncommon', pullback: PB(0.8, 1.0),
      desc: 'A rock ptarmigan in white winter plumage, red comb over the eye and feathered snow-boot feet, holding a wooden sieve of snow up over its head on a fat fluffy snow cloud. Shake-shake-shake, fluffed right up, and very pleased with itself.',
      gimmick: { text: 'Shake-shake', sfx: [[0.13, 'toyRatchet', { n: 12, gap: 0.1 }], [1.6, 'coo']] },
    },
    {
      id: 'kamereon', name: 'Rainbow Chameleon', jp: 'にじカメレオン', rarity: 'rare', pullback: PB(0.7, 0.9),
      desc: 'A green chameleon in a painter\'s beret, its turret eyes looking two ways, its tail curled in a spiral, on a paint-splashed cloud with seven pots on the rack. Thwip goes the tongue, and the rainbow swings up over its head.',
      gimmick: { text: 'Thwip!', sfx: [[0.33, 'pop'], [0.6, 'toyFold', { n: 3 }], [1.0, 'toySnap', { f: 1300, v: 0.8 }]] },
    },
    {
      id: 'tentou', name: 'Sun Ladybird', jp: 'てんとうムシ', rarity: 'secret', pullback: PB(0.9, 1.1),
      desc: '天道虫, the sun\'s-path insect, the ladybird that climbs to the top of the stem and flies off towards the sun. This one delivers it: a seven-spot in a courier\'s cap on a gold dawn cloud, the sun folded under her wing cases.',
      gimmick: { text: 'Sunrise', sfx: [[0.13, 'toyFold', { n: 2 }], [0.47, 'toySnap', { f: 1500, v: 0.6 }], [0.6, 'toyBuzz', { dur: 1.2 }], [0.87, 'ledClick', { on: true }]] },
      light: { part: 'sun', color: '#ffd060', mode: 'press', dur: 2.4 },
    },
  ],
};
