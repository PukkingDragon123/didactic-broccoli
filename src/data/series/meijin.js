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
  ],
};
