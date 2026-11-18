// Naka no Hito (なかのひと, "Who's in the Suit?"): Shōwa tokusatsu kaijū suits on set, each one worn by a very small
// animal actor, an original costume capsule series modelled in Blender (art/blender/toys/nakanohito, concept in
// art/blender/toys/concepts.md). The suit gives it away: a zip down the back, a rolled neck, sweat. Press one (left
// click in hand, right click on a shelf) and the monster's head tips back on its hinge to show who is inside, then
// it is back in character. gimmick.sfx: [seconds, sound, opts] (src/game/figureGimmicks.js).
export default {
  id: 'nakanohito',
  order: 32,
  name: 'Who’s in the Suit?',
  jp: 'なかのひと',
  tagline: 'Monsters on set. Actors inside.',
  taglineJp: 'かいじゅうの なかのひと、みーつけた！',
  price: 300,
  themes: ['retro', 'weird'],
  card: { bg: '#efe2c2', accent: '#c8342c', text: '#1e1c22', accent2: '#2a5ea8', pattern: 'stripes', kind: '着ぐるみフィギュア' },
  capsule: { colors: [0xc8342c, 0x2a5ea8, 0x5e5560, 0xefe2c2] },
  items: [
    {
      id: 'mogura', name: 'Drill Mole', jp: 'ドリモグラ', rarity: 'common',
      desc: 'A velvet mole kaijū with a steel drill on its snout and big spade claws up. Press it and the head tips back: a golden hamster, cheeks stuffed, very pleased with itself, while the drill spins.',
      gimmick: { text: 'Who’s inside?', sfx: [[0.18, 'toyClick', { f: 1500 }], [0.55, 'toySnap', { f: 1300, v: 0.6 }], [0.6, 'toyBuzz', { dur: 1.5 }], [2.45, 'toySnap', { f: 1700 }]] },
    },
    {
      id: 'entotsu', name: 'Smokestack Lizard', jp: 'エントツトカゲ', rarity: 'common',
      desc: 'An olive lizard kaijū up on its long tail, three factory smokestacks growing out of its back. Press it: the head tips back on a worn-out fire-bellied newt with a towel round its neck, and the tall stack puffs out smoke.',
      gimmick: { text: 'Who’s inside?', sfx: [[0.18, 'toyClick', { f: 1500 }], [0.55, 'toySnap', { f: 1300, v: 0.6 }], [0.7, 'whoosh', { vol: 0.25, v: 0.04, dur: 0.6 }], [2.6, 'toySnap', { f: 1700 }]] },
    },
    {
      id: 'denpa', name: 'Radio Moth', jp: 'デンパガ', rarity: 'uncommon',
      desc: 'A fluffy cream silk-moth kaijū with a red-and-white radio mast on its head, feathery antennae and wings printed with radio waves. Press it: the head tips back on a Japanese quail, the wings flutter and the beacon on the mast blinks.',
      light: { part: 'lamp', color: '#ff6a52', mode: 'press', dur: 2.6, blink: [0.3, 0.3] },
      gimmick: { text: 'Who’s inside?', sfx: [[0.18, 'toyClick', { f: 1500 }], [0.55, 'toySnap', { f: 1300, v: 0.6 }], [0.7, 'toyBuzz', { dur: 1.2 }], [2.6, 'toySnap', { f: 1700 }]] },
    },
    {
      id: 'hamaguri', name: 'Clam Robot', jp: 'ハマグリロボ', rarity: 'uncommon',
      desc: 'A silver tin-toy robot kaijū on bellows legs, pincers up, a chest of dials and a red lamp, and for a head a giant hamaguri clam. Press it: the clam opens and a calico kitten pops up like a pearl, while the chest lamp blinks.',
      light: { part: 'lamp', color: '#ff5a46', mode: 'press', dur: 2.4, blink: [0.18, 0.18] },
      gimmick: { text: 'Who’s inside?', sfx: [[0.18, 'toyClick', { f: 1700 }], [0.55, 'toySnap', { f: 1500, v: 0.6 }], [0.8, 'ledClick', { on: true }], [1.0, 'toyRatchet', { n: 4, gap: 0.06 }], [2.6, 'toySnap', { f: 1900 }]] },
    },
  ],
};
