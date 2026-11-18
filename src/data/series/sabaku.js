// Pose Beasts I: Desert Road (奇妙ポーズどうぶつ 第一部「砂の旅」): a band of animal travellers crossing the desert,
// each with a ghostly guardian spirit that rides small on their shoulder, an original capsule-toy series modelled in
// Blender (art/blender/toys/sabaku, concept in art/blender/toys/concepts_E.md). An affectionate homage to the bizarre
// dramatic-pose manga style; every character, spirit and line here is our own. Press one (left click in hand, right
// click on a shelf): the spirit swells up behind its owner and does its move, to the menacing rumble.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
// kana: the menacing lettering for the press (src/jojo/kana.js kinds), for a figure-press hook to show.
export default {
  id: 'sabaku',
  order: 60,
  name: 'Pose Beasts I: Desert Road',
  jp: '奇妙ポーズどうぶつ 砂の旅',
  tagline: 'Each traveller has a spirit at their back.',
  taglineJp: 'ゴゴゴゴ…',
  price: 300,
  themes: ['retro', 'spooky'],
  card: { bg: '#e9d9b4', accent: '#3a2f5a', text: '#231c2c', accent2: '#c8a040', pattern: 'stripes', kind: '奇妙ポーズどうぶつフィギュア' },
  capsule: { colors: [0x3a2f5a, 0xc8a040, 0x8fd0c0, 0xe9d9b4] },
  items: [
    {
      id: 'wani', name: 'Long-Coat Croc', jp: 'がくランワニ', rarity: 'common',
      desc: 'A tall young crocodile in a floor-length high-collared coat, one hand in his pocket and the other pointing straight at you. Riding on his shoulder, small: a ghostly baboon with taped fists. Press him, and it swells up behind him for a punch-rush.',
      kana: { kind: 'go', t: 0.15, dur: 3.0 },
      gimmick: { text: 'Punch-rush!', sfx: [[0.1, 'menace', { kind: 'go' }], [0.6, 'whoosh'], [0.8, 'toyRatchet', { n: 14, gap: 0.12 }], [2.68, 'toySnap', { f: 1300, v: 0.9 }], [3.3, 'toyFold', { n: 2 }]] },
    },
  ],
};
