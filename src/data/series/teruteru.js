// Sakasa Teru-teru (さかさてるてる, "Upside-Down Rain Charms"): teru-teru bōzu hung head-down until they turned into
// raindrops, an original dark-cute keychain series modelled in Blender (art/blender/toys/teruteru, concept in
// art/blender/toys/concepts_B.md). Each brings its own weather: press it (left click in hand, right click on a shelf)
// and it shivers and does it. Every one is a keychain: the ball chain hangs from the screw eye in its knot (pt_chain).
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
export default {
  id: 'teruteru',
  order: 33,
  name: 'Upside-Down Rain Charms',
  jp: 'さかさてるてる',
  tagline: 'Hang it upside down and it rains.',
  taglineJp: 'さかさに吊るすと、雨がふる',
  price: 300,
  themes: ['weird', 'retro', 'japan'],
  card: { bg: '#cfd8de', accent: '#34536e', text: '#1d2731', accent2: '#c0463a', pattern: 'dots', kind: 'ボールチェーン付きマスコット' },
  capsule: { colors: [0x8fa6b8, 0xe9e4d8, 0x34536e, 0xc0463a] },
  keychain: { chain: 90 }, // every charm comes on a ball chain from the screw eye in its knot (src/game/keychains.js)
  items: [
    {
      id: 'shito', name: 'Drizzle', jp: 'しとしと', rarity: 'common',
      desc: 'Grey-blue and soaked through, one eye painted and one drawn in marker, the ink running. Three fat drops cling to its corners until you give it a shake.',
      gimmick: { text: 'Shake', sfx: [[0.28, 'toyFold', { n: 8, gap: 0.06 }], [1.33, 'toyClick', { f: 3400, v: 0.6 }], [1.73, 'toyClick', { f: 3000, v: 0.6 }], [2.13, 'toyClick', { f: 3700, v: 0.6 }], [2.5, 'toyFold', { n: 3 }]] },
    },
    {
      id: 'goro', name: 'Thunder', jp: 'ゴロゴロ', rarity: 'common',
      desc: "A thunder god's apprentice made from a tiger-print furoshiki, its knot twisted into a lightning bolt. It wears the god's ring of drums on its neck string, and spins it whenever it feels like weather.",
      gimmick: { text: 'Drum roll', sfx: [[0.2, 'toyFold', { n: 3 }], [0.5, 'drop'], [0.7, 'drop'], [0.9, 'drop'], [1.1, 'drop'], [0.8, 'zap'], [1.4, 'zap'], [1.3, 'drop'], [1.5, 'drop'], [1.7, 'drop'], [2.2, 'toyClick']] },
    },
    {
      id: 'para', name: 'Hail', jp: 'パラパラ', rarity: 'uncommon',
      desc: "Made from yesterday's newspaper, crumpled stiff, with hailstones frozen into its creases. Its cheeks are always full. Press it and it spits them out, pa-ra-pa-ra.",
      gimmick: { text: 'Spit', sfx: [[0.15, 'whoosh', { dur: 0.3, v: 0.08 }], [0.6, 'pop', { v: 0.4 }], [0.8, 'toyClick', { f: 3600, v: 0.7 }], [0.83, 'pop', { v: 0.4 }], [1.03, 'toyClick', { f: 3300, v: 0.7 }], [1.07, 'pop', { v: 0.4 }], [1.27, 'toyClick', { f: 3900, v: 0.7 }], [1.0, 'toyClick', { f: 4200, v: 0.4 }], [1.23, 'toyClick', { f: 4000, v: 0.4 }], [1.47, 'toyClick', { f: 4300, v: 0.4 }], [1.83, 'toyTap']] },
    },
    {
      id: 'moya', name: 'Fog', jp: 'もやもや', rarity: 'uncommon',
      desc: 'Pale lilac gauze printed with bands of haze. One long corner hangs over its face and hides an eye; press it and it lifts the veil for a quick look at you, then hides again.',
      gimmick: { text: 'Peek', sfx: [[0.1, 'toyFold', { n: 3, gap: 0.08 }], [0.4, 'whoosh', { dur: 0.25, v: 0.07 }], [0.68, 'toyClick', { f: 2200 }], [1.55, 'whoosh', { dur: 0.3, v: 0.06 }], [1.8, 'toyTap']] },
    },
    {
      id: 'byu', name: 'Typhoon', jp: 'ビュービュー', rarity: 'rare',
      desc: 'Storm-teal and wrung into a spiral by its own wind, its corners streaming and its loose hem whipping round its middle. Press it and it spins like a top until it is dizzy.',
      gimmick: { text: 'Spin', sfx: [[0.2, 'twist', { dur: 0.25 }], [0.35, 'whoosh', { dur: 0.6, v: 0.12 }], [0.9, 'whoosh', { dur: 0.6, v: 0.1 }], [1.6, 'toyTap'], [1.85, 'toyTap'], [2.1, 'toyClick']] },
    },
    {
      id: 'niji', name: 'Rainbow Eater', jp: 'にじくい', rarity: 'secret',
      desc: 'The one that stops the rain for good. A black charm with a chalk face, slurping a rainbow like a noodle. Press it: it sucks the whole thing in, gulps, burps a little cloud, and then another rainbow creeps out.',
      gimmick: { text: 'Slurp', sfx: [[0.25, 'twist', { dur: 0.6 }], [0.95, 'pop', { v: 0.5 }], [1.0, 'drop'], [1.3, 'whoosh', { dur: 0.25, v: 0.06 }], [1.4, 'toyBuzz', { dur: 0.2 }], [1.95, 'twist', { dur: 0.5 }], [2.4, 'toyClick']] },
    },
  ],
};
