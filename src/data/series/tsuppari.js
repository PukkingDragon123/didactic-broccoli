// Tsuppari Dōbutsuen (つっぱり動物園, "Tsuppari Zoo"): an 80s yankī gang of animals in pompadours, gakuran and long
// embroidered coats, tough on the outside and soft at heart: every one is caught doing something kind. An original
// attitude series modelled in Blender (art/blender/toys/tsuppari, concept in art/blender/toys/concepts_B.md). Press one
// (left click in hand, right click on a shelf) and it shows off.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
export default {
  id: 'tsuppari',
  order: 35,
  name: 'Tsuppari Zoo',
  jp: 'つっぱり動物園',
  tagline: 'Tough guys. Soft hearts.',
  taglineJp: '見た目はワル、中身はやさしい',
  price: 300,
  themes: ['retro', 'japan', 'animals'],
  card: { bg: '#e9e2d0', accent: '#1f1d26', text: '#1f1d26', accent2: '#c8302a', pattern: 'dots', kind: 'ツッパリ動物フィギュア' },
  capsule: { colors: [0x24232b, 0xd03a2c, 0xd6a640, 0xe9e2d0] },
  items: [
    {
      id: 'niwatori', name: 'Regent Rooster', jp: 'リーゼント鶏', rarity: 'common',
      desc: 'A white rooster in a short black gakuran and balloon trousers, clacking about on geta, his comb grown into a towering red regent. Nobody mentions the chick asleep in it.',
      gimmick: { text: 'Comb it back', sfx: [[0.1, 'toyFold', { n: 2 }], [0.22, 'toyClick', { f: 2600, v: 0.5 }], [0.5, 'whoosh', { dur: 0.25, v: 0.06 }], [0.8, 'toyClick', { f: 1500 }], [1.0, 'paper'], [1.3, 'paper'], [1.5, 'paper'], [2.05, 'toyClick', { f: 1400 }], [2.25, 'toyClick', { f: 2600, v: 0.5 }]] },
    },
    {
      id: 'kuma', name: 'Banchō Bear', jp: '番長グマ', rarity: 'common',
      desc: 'The boss: a big brown bear in a floor-length coat with 番 embroidered across the back, his school cap shoved back between his ears and a plaster on his cheek. Something small and furry is peeking out of his lapels.',
      gimmick: { text: 'Open the coat', sfx: [[0.2, 'toyTap'], [0.45, 'whoosh', { dur: 0.3, v: 0.08 }], [0.6, 'toySnap', { v: 0.5 }], [0.75, 'meow'], [1.1, 'toyClick', { f: 2400, v: 0.4 }], [1.45, 'toyClick', { f: 2400, v: 0.4 }], [1.9, 'whoosh', { dur: 0.25, v: 0.06 }], [2.05, 'toySnap', { v: 0.5 }]] },
    },
    {
      id: 'neko', name: 'Sukeban Cat', jp: 'スケバンネコ', rarity: 'uncommon',
      desc: 'A calico in sukeban uniform: the pleated skirt down to her shoes, a cropped sailor blouse, her flat school bag slung over one shoulder and a glare that could curdle milk. The class rabbit is hiding behind her skirt.',
      gimmick: { text: 'Glare', sfx: [[0.2, 'toyClick', { f: 1300 }], [0.75, 'toyClick', { f: 1300 }], [1.1, 'toyTap', { v: 0.5 }], [1.25, 'toyTap', { v: 0.5 }], [1.4, 'toyTap', { v: 0.5 }], [1.55, 'pop', { v: 0.4 }], [2.15, 'toyTap', { v: 0.5 }], [2.35, 'toyClick', { f: 1500 }]] },
    },
    {
      id: 'kaeru', name: 'Squatting Frog', jp: 'ヤンキー座りガエル', rarity: 'uncommon',
      desc: 'A green frog in the yankī squat outside the shop, a wooden sword over his shoulder, a grass stalk in his mouth and 夜露死苦 embroidered across the back of his satin jacket. The duckling at his toes has decided he is its mother.',
      gimmick: { text: 'Stand up', sfx: [[0.15, 'toyFold', { n: 2 }], [0.4, 'whoosh', { dur: 0.3, v: 0.07 }], [0.6, 'toySnap', { v: 0.5 }], [0.75, 'toyTap', { v: 0.4 }], [0.9, 'toyTap', { v: 0.4 }], [1.05, 'toyTap', { v: 0.4 }], [1.2, 'toyTap', { v: 0.4 }], [1.35, 'toyTap', { v: 0.4 }], [2.05, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'tanuki', name: 'Bōsōzoku Tanuki', jp: '暴走タヌキ', rarity: 'rare',
      desc: 'A tanuki in a white tokkōfuku and hachimaki on a candy-purple scooter: three-tier backrest, takeyari exhausts and a team flag on a long pole that says 安全運転, drive safely. He is taking granny her medicine.',
      gimmick: { text: 'Wheelie', sfx: [[0.1, 'motor', { dur: 0.7 }], [0.35, 'toyRatchet', { n: 4, gap: 0.04 }], [0.65, 'toySnap', { v: 0.5 }], [1.0, 'toyRatchet', { n: 6, gap: 0.05 }], [1.75, 'toyTap'], [1.85, 'toyTap', { v: 0.5 }]] },
      light: { part: 'lamp', color: '#fff0c0', mode: 'press', dur: 1.9 },
      pullback: { clip: 'run', speed: 0.9, dist: 1.1, wind: 0.45, text: 'Pull it back and let go', sfx: 'toyRatchet' },
    },
    {
      id: 'mimizuku', name: 'Old Boss Eagle-Owl', jp: '元総長ミミズク', rarity: 'secret',
      desc: 'The founder, long retired: a barred eagle-owl in square shades with his old embroidered coat over his shoulders like a cape, now a school crossing guard with a yellow sash and a 横断中 flag. He looks both ways. Properly.',
      gimmick: { text: 'Look both ways', sfx: [[0.4, 'toyClick', { f: 1100 }], [0.63, 'toyClick', { f: 1100 }], [0.87, 'toyClick', { f: 1100 }], [1.1, 'toyClick', { f: 1100 }], [1.3, 'coo'], [1.45, 'whoosh', { dur: 0.25, v: 0.07 }], [1.6, 'paper'], [1.85, 'paper'], [2.5, 'toyTap']] },
    },
  ],
};
