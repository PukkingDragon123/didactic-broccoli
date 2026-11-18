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
    {
      id: 'rakuda', name: 'Old Guide Camel', jp: '案内ラクダ', rarity: 'common',
      desc: 'An old dromedary in a safari waistcoat and pith helmet, a great white moustache, struck in a deep lunge with his cane flung up ahead. Onward! On his hump perches a ghostly vulture, which throws its wings wide over him when pressed.',
      kana: { kind: 'go', t: 0.15, dur: 3.0 },
      gimmick: { text: 'Onward!', sfx: [[0.1, 'menace', { kind: 'go' }], [0.55, 'whoosh'], [1.15, 'flapFold'], [1.5, 'whoosh'], [1.85, 'whoosh'], [2.2, 'whoosh'], [3.2, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'fennec', name: 'Sandstorm Fennec', jp: '砂嵐フェネック', rarity: 'uncommon',
      desc: 'A young fennec in a cropped red bolero and flared trousers, up on one foot in a high crane kick with her enormous ears back. Her spirit is a ghostly scorpion: press her and it rears up behind her, stinging over her head in a flurry.',
      kana: { kind: 'go', t: 0.15, dur: 3.0 },
      gimmick: { text: 'Sting flurry!', sfx: [[0.1, 'menace', { kind: 'go' }], [0.6, 'whoosh'], [0.95, 'toyRatchet', { n: 12, gap: 0.15 }], [2.8, 'toySnap', { f: 2200, v: 0.8 }], [3.3, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'hyena', name: 'Assassin Hyena', jp: '刺客ハイエナ', rarity: 'uncommon',
      desc: 'The hired grinner: a spotted hyena in a striped vest, turban and baggy trousers, crouched low with his claws out and a grin full of teeth. A ghostly cobra is coiled on his back. Press him: it rears, spreads its hood and strikes twice.',
      kana: { kind: 'do', t: 0.15, dur: 3.0 },
      gimmick: { text: 'Strike!', sfx: [[0.1, 'menace', { kind: 'do' }], [0.6, 'whoosh'], [1.25, 'toySnap', { f: 1800, v: 0.8 }], [1.92, 'toySnap', { f: 1800, v: 0.8 }], [3.3, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'mirkat', name: 'Lookout Meerkat', jp: 'みはりミーアキャット', rarity: 'rare',
      desc: 'Bolt upright on her rock in a far-too-big flight jacket, goggles up and a brass spyglass to her eye. A ghostly scarab clings to her shoulder; press her and it swells, opens its wing cases and buzzes all the way round her.',
      kana: { kind: 'go', t: 0.15, dur: 3.0 },
      gimmick: { text: 'Lookout!', sfx: [[0.1, 'menace', { kind: 'go' }], [0.6, 'whoosh'], [0.85, 'toyBuzz', { dur: 1.9 }], [3.2, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'koumori', name: 'Night-Lord Bat', jp: '夜王コウモリ', rarity: 'secret',
      desc: 'A tall flying-fox aristocrat in a tailcoat and an opera cape lined crimson, a monocle, leaning far back with one hand spread over his face. The little stone gargoyle on his collar is his spirit: press him, and it rises behind him with its wings thrown wide.',
      kana: { kind: 'do', t: 0.15, dur: 3.2 },
      gimmick: { text: 'Behold!', sfx: [[0.1, 'menace', { kind: 'do' }], [0.7, 'whoosh'], [1.2, 'flapFold'], [1.7, 'whoosh'], [2.1, 'whoosh'], [3.4, 'toyFold', { n: 2 }]] },
    },
  ],
};
