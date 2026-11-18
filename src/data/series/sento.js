// Yukemuri Sentō (ゆけむり銭湯, "Bathhouse Regulars"): the neighbourhood bathhouse and its regulars, each an animal
// doing its bath ritual the way its body was made for it. An original playset capsule series modelled in Blender
// (art/blender/toys/sento, concept in art/blender/toys/concepts_D.md). Every figure comes on a section of tiled
// bathhouse floor: put them side by side on a shelf board and the sections click together into one long bathhouse
// (src/game/playsets.js). Press one (left click in hand, right click on a shelf) for its ritual.
const PS = { set: 'sento', in: 'in', out: 'out' };
export default {
  id: 'sento',
  order: 50,
  name: 'Bathhouse Regulars',
  jp: 'ゆけむり銭湯',
  tagline: 'Everyone has their own way to take a bath.',
  taglineJp: 'いい湯だな！',
  price: 300,
  themes: ['retro', 'cute'],
  card: { bg: '#e9ece6', accent: '#2a5aa8', text: '#1c2430', accent2: '#c8303a', pattern: 'dots', kind: '銭湯じょうれんフィギュア' },
  capsule: { colors: [0x2a5aa8, 0xf2c230, 0xe9ece6, 0x5fb4b8] },
  items: [
    {
      id: 'kame', name: 'Bandai Tortoise', jp: 'ばんだいガメ', rarity: 'common', playset: PS,
      desc: 'The old attendant up on the bandai, the high wooden booth by the door, in a knitted belly-warmer, with the coin tray at his elbow and a stack of towels. He dozes off right into his shell, then pops out with a towel for you.',
      gimmick: { text: 'Doze', sfx: [[0.15, 'toyFold', { n: 2 }], [0.9, 'toyTap', { v: 0.4 }], [1.3, 'toyTap', { v: 0.4 }], [1.62, 'toySnap', { f: 1300, v: 0.8 }], [1.85, 'toyClick']] },
    },
  ],
};
