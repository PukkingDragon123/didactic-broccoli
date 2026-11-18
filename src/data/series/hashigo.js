// Hashigo Nori (はしご乗り, "New Year Ladder Frogs"): Edo fire-brigade frogs doing the New Year bamboo-ladder stunts
// (出初式), an original playset capsule series modelled in Blender (art/blender/toys/hashigo, concept in
// art/blender/toys/concepts.md). Each frog comes on its own section of bamboo ladder; display them side by side on a
// shelf board and the sections click together into one tall ladder with the frogs up it (src/game/playsets.js).
// A press plays each frog's stunt; the standard-bearer spins its matoi. gimmick.sfx: [seconds, sound, opts].
const PS = { set: 'hashigo', in: 'in', out: 'out' }; // (every frog's ladder section: src/game/playsets.js)
export default {
  id: 'hashigo',
  order: 31,
  name: 'Ladder Frogs',
  jp: 'はしご乗り',
  tagline: 'Stack the ladder, up they go!',
  taglineJp: 'つなげて のぼろう！ 出初めガエル',
  price: 300,
  themes: ['retro', 'festival'],
  card: { bg: '#f2e6c8', accent: '#2c3c6a', text: '#20202a', accent2: '#c8342c', pattern: 'grid', kind: 'つなげるプレイセット' },
  capsule: { colors: [0x2c3c6a, 0xc8342c, 0x6fae3c, 0xe9dcae] },
  items: [
    {
      id: 'kataashi', name: 'One-Leg Balance', jp: '片足', rarity: 'common',
      desc: 'A green tree frog on the bottom rung, one foot down, one leg kicked out behind, a red fan held high. Press it and it teeters, and somehow holds the pose.',
      playset: PS,
      gimmick: { text: 'Teeter', sfx: [[0.1, 'toyTap', { v: 0.6 }], [0.3, 'toyClick', { f: 2000 }], [0.65, 'toyClick', { f: 2300 }], [1.25, 'toySnap', { v: 0.5, f: 1900 }]] },
    },
    {
      id: 'sakadachi', name: 'Handstand', jp: '逆立ち', rarity: 'common',
      desc: 'A brown toad in a handstand on the bottom rung, legs up in a V, grinning at you upside down. Press it and it lets go with one hand to wave.',
      playset: PS,
      gimmick: { text: 'One hand!', sfx: [[0.15, 'toyClick', { f: 2100 }], [0.45, 'toyFold', { n: 3 }], [1.35, 'toyTap'], [1.6, 'toyClick', { f: 2600 }]] },
    },
    {
      id: 'matsu', name: 'The Pine', jp: '松', rarity: 'uncommon',
      desc: 'An orange frog in the full splits between the rails, eyes squeezed shut, arms up like the branches of a pine. Press it and it bounces, branches swaying.',
      playset: PS,
      gimmick: { text: 'Bounce', sfx: [[0.2, 'toyTap', { v: 0.5 }], [0.4, 'toyTap', { v: 0.4 }], [0.6, 'toyTap', { v: 0.4 }], [0.8, 'toyTap', { v: 0.3 }]] },
    },
    {
      id: 'burasagari', name: 'The Dangle', jp: 'ぶら下がり', rarity: 'uncommon',
      desc: "A pale spotted frog hanging by its knees from the top rung, one arm dangling, one waving, mouth a small 'oh'. Press it and it swings.",
      playset: PS,
      gimmick: { text: 'Swing', sfx: [[0.1, 'toyClick', { f: 1800 }], [0.3, 'whoosh', { vol: 0.25, v: 0.05 }], [0.62, 'whoosh', { vol: 0.2, v: 0.05 }], [1.6, 'toyClick', { f: 2200 }]] },
    },
    {
      id: 'matoi', name: 'The Standard-Bearer', jp: '纏持ち', rarity: 'rare',
      desc: "A bright green frog on the foot board with the brigade's matoi on its shoulder, gourd crest on top, paper streamers round it, the other fist up. Press it and it spins the matoi.",
      playset: PS,
      gimmick: { text: 'Spin the matoi', sfx: [[0.15, 'toyClick'], [0.3, 'whoosh', { vol: 0.3, v: 0.08 }], [0.75, 'whoosh', { vol: 0.3, v: 0.08 }], [1.2, 'whoosh', { vol: 0.25, v: 0.08 }], [1.6, 'toySnap', { f: 1500, v: 0.7 }]] },
    },
    {
      id: 'kashira', name: 'The Old Chief', jp: '頭', rarity: 'secret',
      desc: "The brigade's old toad, big in the belly, in a brass-badged fire helmet, a brass nozzle in both hands and the hose over the board. Press it and the water comes.",
      playset: PS,
      gimmick: { text: 'Water!', sfx: [[0.15, 'toyClick', { f: 1600 }], [0.25, 'tapeRip', { vol: 0.35 }], [1.7, 'toyClick', { f: 1400 }]] },
    },
  ],
};
