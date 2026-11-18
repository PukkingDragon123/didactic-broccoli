// Ōmie Yōkai (大見得ようかい, "Yōkai Kabuki"): the yōkai of the old picture scrolls cast in kabuki, each in its role's
// stage paint (kumadori), costume and props, an original capsule-toy series modelled in Blender (art/blender/toys/kabuki,
// concept in art/blender/toys/concepts_C.md). Press one (left click in hand, right click on a shelf) for its mie: the
// wind-up, the head roll and the frozen glare, with the clappers.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
export default {
  id: 'kabuki',
  order: 42,
  name: 'Yōkai Kabuki',
  jp: '大見得ようかい',
  tagline: 'The yōkai take the stage: hold the pose!',
  taglineJp: 'いよっ、大見得！',
  price: 300,
  themes: ['retro', 'spooky'],
  card: { bg: '#efe6cf', accent: '#2a2a2e', text: '#1e1c1c', accent2: '#c8303a', pattern: 'stripes', kind: 'ようかい歌舞伎フィギュア' },
  capsule: { colors: [0x2a2a2e, 0xc8303a, 0x3a7a4a, 0xefe6cf] },
  items: [
    {
      id: 'kappa', name: 'Aragoto Kappa', jp: 'あらごとカッパ', rarity: 'common',
      desc: 'The hero of the piece, in red kumadori on green, the bold lattice costume and the huge stiff sleeves. He rolls his head, glares, stamps, and the water in his dish goes everywhere.',
      gimmick: { text: 'Mie!', sfx: [[0.1, 'toyFold', { n: 2 }], [0.55, 'toyClick', { f: 1500 }], [0.75, 'toyClick', { f: 1500 }], [0.95, 'toyClick', { f: 1500 }], [1.13, 'toySnap', { f: 1300, v: 0.9 }], [1.45, 'thud'], [1.5, 'splash']] },
    },
    {
      id: 'tengu', name: 'Villain Tengu', jp: 'かたきやくテング', rarity: 'common',
      desc: 'The villain, in indigo kumadori on a red face, the little black cap of the mountain ascetics and a shaggy white mane. Three sweeps of the feather fan, the nose to the gallery, and out come the wings.',
      gimmick: { text: 'Mie!', sfx: [[0.15, 'whoosh'], [0.55, 'whoosh'], [0.95, 'whoosh'], [1.25, 'toyClick', { f: 1500 }], [1.4, 'flapFold'], [1.42, 'toySnap', { f: 1300, v: 0.9 }]] },
    },
    {
      id: 'nekomata', name: 'Onnagata Nekomata', jp: 'おやまネコマタ', rarity: 'uncommon',
      desc: 'The leading lady: a calico in a red kimono scattered with plum blossom, the cat dance\'s hand towel over her head. A demure bow, and then the two tails come up and the ears prick. Of course she is a nekomata.',
      gimmick: { text: 'Mie!', sfx: [[0.15, 'toyFold', { n: 2 }], [0.6, 'meow'], [1.0, 'whoosh'], [1.05, 'toySnap', { f: 1300, v: 0.9 }], [1.2, 'toyClick', { f: 1500 }]] },
    },
    {
      id: 'kamaitachi', name: 'Sword-Fight Kamaitachi', jp: 'たちまわりカマイタチ', rarity: 'uncommon',
      desc: 'The fight scene: a weasel with sickles for forearms, cross-straps tied for action, riding its own little whirlwind. It spins a full turn with both blades out and freezes, glaring, before you have seen it move.',
      gimmick: { text: 'Mie!', sfx: [[0.1, 'toyFold', { n: 2 }], [0.3, 'whoosh'], [0.55, 'whoosh'], [0.82, 'toySnap', { f: 2600, v: 0.7 }], [0.95, 'toyClick', { f: 1500 }]] },
    },
  ],
};
