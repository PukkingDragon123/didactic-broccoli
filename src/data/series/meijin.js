// Asobi no Meijin (あそびの名人, "Playground Champions"): the street games of a Shōwa childhood (beigoma tops, menko
// cards, kendama, bamboo stilts, cat's cradle), played by animal champions, each with its game piece, an original
// capsule-toy series modelled in Blender (art/blender/toys/meijin, concept in art/blender/toys/concepts_C.md).
// Press one (left click in hand, right click on a shelf) and it plays.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
export default {
  id: 'meijin',
  order: 43,
  name: 'Playground Champions',
  jp: 'あそびの名人',
  tagline: 'The champions of the back lane',
  taglineJp: 'ろじうらの名人たち',
  price: 300,
  themes: ['retro', 'play'],
  card: { bg: '#f2e6c4', accent: '#c8303a', text: '#2a2222', accent2: '#3a5a9a', pattern: 'dots', kind: 'あそびの名人フィギュア' },
  capsule: { colors: [0xc8303a, 0x3a5a9a, 0xf2e6c4, 0xd8a840] },
  items: [
    {
      id: 'hari', name: 'Beigoma Hedgehog', jp: 'ベーゴマハリネズミ', rarity: 'common',
      desc: 'The beigoma champion of the lane, string in paw, beside the bucket arena. He winds back, throws, and his iron top spins round the canvas while everyone else\'s has stopped.',
      gimmick: { text: 'Throw!', sfx: [[0.1, 'toyFold', { n: 2 }], [0.4, 'whoosh'], [0.45, 'toyTap'], [0.5, 'topSpin'], [1.55, 'toyClick'], [1.65, 'toyTap']] },
    },
    {
      id: 'azarashi', name: 'Menko Seal', jp: 'メンコアザラシ', rarity: 'common',
      desc: 'A spotted seal pup in a headband, flat on his belly with his best card raised. One slap of the flipper and the rival\'s card flips over: his now. Nobody slaps a menko like a seal.',
      gimmick: { text: 'Slap!', sfx: [[0.3, 'whoosh'], [0.45, 'thwack'], [0.6, 'paper'], [0.95, 'toyTap'], [1.1, 'toyClick'], [1.25, 'toyClick'], [1.4, 'toyClick']] },
    },
    {
      id: 'kamereon', name: 'Kendama Chameleon', jp: 'けんだまカメレオン', rarity: 'uncommon',
      desc: 'The kendama champion: a chameleon on its hind legs, propped on its curled tail, the red ball balanced on the spike. Up it goes, the tongue flicks out to steer it, and down it comes on the spike. Cheating? Who can say.',
      gimmick: { text: 'Tome-ken!', sfx: [[0.3, 'kendamaClack'], [0.6, 'toyClick', { f: 2600 }], [1.05, 'kendamaClack'], [1.3, 'toyTap']] },
    },
    {
      id: 'pengin', name: 'Stilt Penguin', jp: 'たけうまペンギン', rarity: 'uncommon',
      desc: 'The bird with the shortest legs on the lane, up on the tallest bamboo stilts, in a red wool hat. Step, step, step, a wobble, a windmill, and he is still up there.',
      gimmick: { text: 'Walk!', sfx: [[0.2, 'kendamaClack'], [0.5, 'kendamaClack'], [0.8, 'kendamaClack'], [1.15, 'squeak'], [1.5, 'toyTap']] },
    },
    {
      id: 'kumo', name: "Cat's-Cradle Spider", jp: 'あやとりグモ', rarity: 'rare',
      desc: "The ayatori champion: a fluffy little jumping spider with four legs to sit on and four to play with. It pulls the red string wide, twists the whole cradle over, and springs it back into shape. Nobody else has the legs for it.",
      gimmick: { text: 'Ayatori!', sfx: [[0.1, 'toyFold', { n: 3 }], [0.6, 'whoosh'], [1.1, 'boing'], [1.4, 'toyTap']] },
    },
    {
      id: 'mushi', name: 'Mushi-Zumō', jp: 'むしずもう', rarity: 'secret',
      desc: 'The summer bout: the champion rhino beetle, gold all over and in a red mawashi, against a stag beetle with its jaws round his horn, on a sawn-log ring. Ton-ton, they shove, and the challenger tips over. Rematch?',
      gimmick: { text: 'Hakkeyoi!', sfx: [[0.05, 'toyTap'], [0.15, 'toyTap'], [0.25, 'toyTap'], [0.35, 'toyTap'], [0.45, 'toyTap'], [0.55, 'toyTap'], [0.9, 'toyBuzz', { dur: 0.3 }], [1.0, 'toySnap', { f: 1400 }], [1.35, 'toyTap']] },
    },
  ],
};
