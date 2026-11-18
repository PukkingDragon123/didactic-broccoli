// Henshin Bungu (ヘンシン文具, "Stationery Beasts"): Shōwa school and office stationery that unfolds into the animal
// it always secretly was, an original transforming capsule-toy series modelled in Blender (art/blender/toys/henshin,
// concept in art/blender/toys/concepts.md). Each figure is a creature on the shelf and a believable desk object inside
// its gimmick clip: press it (left click in hand, right click on a shelf) and it folds into the object and back out.
// gimmick.sfx: little plastic sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
export default {
  id: 'henshin',
  order: 30,
  name: 'Stationery Beasts',
  jp: 'ヘンシン文具',
  tagline: 'Complete transformation!',
  taglineJp: '完全変形！ 文房具がどうぶつに',
  price: 300,
  themes: ['retro', 'school'],
  card: { bg: '#e9f0e2', accent: '#2f7a4a', text: '#1e2a22', accent2: '#d2402e', pattern: 'grid', kind: '完全変形フィギュア' },
  capsule: { colors: [0x3d8a48, 0xd2402e, 0xe9dcae, 0x3a5fa0] },
  items: [
    {
      id: 'wani', name: 'Snap Croc', jp: 'パチンワニ', rarity: 'common',
      desc: "A Shōwa desk stapler with a grin. Press it and it hops, folds itself into a stapler, gives one 'pachin', then springs back out and snaps at you.",
      variants: [ // (src/data/variants.js; GIMMICKS.md "Variants")
        { id: 'std', name: 'Desk Green', weight: 6 },
        { id: 'blue', name: 'Office Blue', weight: 3, texture: 'blue', recolor: [[['green', 'eye', 'leg', 'skin', 'eyeball'], '#3d63a6']] },
        { id: 'happy', name: 'Happy Snap', weight: 2, texture: 'happy', face: 'happy' },
      ],
      gimmick: { text: 'Transform', sfx: [[0.15, 'toyFold', { n: 6 }], [0.53, 'toyTap'], [1.0, 'toySnap', { f: 2300, v: 0.7 }], [1.4, 'toyFold', { n: 5 }], [1.77, 'toyTap'], [1.86, 'toySnap'], [2.16, 'toySnap'], [2.52, 'toyClick']] },
    },
    {
      id: 'buta', name: 'Sharpener Pig', jp: 'けずりブタ', rarity: 'common',
      desc: 'A hand-crank sharpener on four trotters. Its snout takes two sizes of pencil, its curly tail is the crank, and the shavings drawer is where its lunch goes.',
      variants: [
        { id: 'std', name: 'Pink', weight: 6 },
        { id: 'mint', name: 'Mint Green', weight: 3, texture: 'mint', recolor: [[['pink'], '#9fd0b4']] },
        { id: 'wink', name: 'Winking', weight: 2, texture: 'wink', face: 'wink' },
      ],
      gimmick: { text: 'Transform', sfx: [[0.1, 'toyFold', { n: 4 }], [0.4, 'toyTap'], [0.47, 'toyRatchet', { n: 20 }], [1.45, 'drawer', { out: true }], [2.05, 'drawer', { out: false }], [2.12, 'toyFold', { n: 4 }], [2.27, 'toyClick'], [2.4, 'toyTap']] },
    },
    {
      id: 'maimai', name: 'Tape Snail', jp: 'テープマイマイ', rarity: 'uncommon',
      desc: 'A heavy Shōwa tape cutter. The roll of amber tape is its shell, the saw-toothed cutter is its lip, and its eyes come out on stalks once it is sure nobody needs any tape.',
      variants: [
        { id: 'std', name: 'Teal', weight: 6 },
        { id: 'coral', name: 'Coral', weight: 3, texture: 'coral', recolor: [[['body', 'eyeball'], '#d0705c']] },
        { id: 'sleepy', name: 'Sleepy', weight: 2, texture: 'sleepy', face: 'sleepy' },
      ],
      gimmick: { text: 'Transform', sfx: [[0.07, 'toyFold', { n: 4 }], [0.6, 'tapeRip'], [1.23, 'toySnap', { v: 0.6 }], [1.63, 'toyClick'], [1.73, 'toyClick', { f: 2800 }], [1.83, 'toyClick', { f: 2100 }]] },
    },
    {
      id: 'kuwagata', name: 'Clip Stag', jp: 'クリップクワガタ', rarity: 'uncommon',
      desc: "A black binder clip with its chrome levers folded down. Flip them forward and they are a stag beetle's jaws; give it a moment and it opens its wing cases.",
      variants: [
        { id: 'std', name: 'Black Clip', weight: 6 },
        { id: 'red', name: 'Red Clip', weight: 3, texture: 'red', recolor: [[['black', 'ceye'], '#b0352c']] },
        { id: 'happy', name: 'Happy', weight: 2, texture: 'happy', face: 'happy' },
      ],
      gimmick: { text: 'Transform', sfx: [[0.07, 'toyFold', { n: 5 }], [0.43, 'toyTap'], [1.3, 'toyFold', { n: 3 }], [1.63, 'toySnap'], [1.87, 'toySnap'], [2.2, 'toyClick'], [2.27, 'toyBuzz', { dur: 0.4 }], [2.6, 'toyTap']] },
    },
    {
      id: 'tsuru', name: 'Compass Crane', jp: 'コンパスヅル', rarity: 'rare',
      desc: "A school compass with a protractor clipped on. Its black handle is a crane's neck, its red cap the crane's crown, and the protractor opens into wings for the courtship dance.",
      variants: [
        { id: 'std', name: 'Black Handle', weight: 6 },
        { id: 'navy', name: 'Navy Handle', weight: 3, texture: 'navy', recolor: [[['black'], '#2f5d94']] },
        { id: 'sleepy', name: 'Sleepy', weight: 2, texture: 'sleepy', face: 'sleepy' },
      ],
      gimmick: { text: 'Transform', sfx: [[0.07, 'toyFold', { n: 5 }], [0.5, 'toyTap'], [0.6, 'toyRatchet', { n: 9 }], [1.35, 'toyFold', { n: 3 }], [1.57, 'toyClick', { f: 1300 }], [1.77, 'toyClick', { f: 1300 }], [2.3, 'toyTap']] },
    },
    {
      id: 'ryu', name: 'Fountain-Pen Dragon', jp: '万年筆リュウ', rarity: 'secret',
      desc: "A vermilion urushi fountain pen with gold fittings. The gold nib is a dragon's snout, the black feed its jaw, and the barrel comes apart into coils.",
      variants: [
        { id: 'std', name: 'Vermilion', weight: 6 },
        { id: 'green', name: 'Green Urushi', weight: 3, texture: 'green', recolor: [[['red'], '#2e6a44']] },
        { id: 'wink', name: 'Winking', weight: 2, texture: 'wink', face: 'wink' },
      ],
      gimmick: { text: 'Transform', sfx: [[0.07, 'toyFold', { n: 7 }], [0.53, 'toyTap'], [1.47, 'toyFold', { n: 6 }], [2.1, 'lidCreak', { up: true }], [2.47, 'toySnap', { v: 0.5 }]] },
    },
  ],
};
