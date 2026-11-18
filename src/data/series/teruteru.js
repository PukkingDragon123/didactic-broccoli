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
  ],
};
