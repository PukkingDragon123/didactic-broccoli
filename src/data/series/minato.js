// Pose Beasts II: Harbour Town (奇妙ポーズどうぶつ 第二部「みなと町」): a sleepy seaside town where every resident is a
// little odd, each one's weird knack shown by a spirit or a gimmick; an original capsule-toy series modelled in Blender
// (art/blender/toys/minato, concept in art/blender/toys/concepts_E.md). An affectionate homage to the bizarre
// dramatic-pose manga style; every character here is our own. Each stands on a round of harbour cobbles.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
// kana: the menacing lettering for the press (src/jojo/kana.js kinds), for a figure-press hook to show.
export default {
  id: 'minato',
  order: 61,
  name: 'Pose Beasts II: Harbour Town',
  jp: '奇妙ポーズどうぶつ みなと町',
  tagline: 'A quiet little town. Nothing odd here at all.',
  taglineJp: 'ドドドド…',
  price: 300,
  themes: ['retro', 'spooky'],
  card: { bg: '#dfe6e4', accent: '#2f4a6a', text: '#1c2430', accent2: '#c8343a', pattern: 'waves', kind: '奇妙ポーズどうぶつフィギュア' },
  capsule: { colors: [0x2f4a6a, 0xc8343a, 0x9cb8d0, 0xdfe6e4] },
  items: [
    {
      id: 'tako', name: 'Manga-Artist Octopus', jp: 'まんが家ダコ', rarity: 'common',
      desc: 'The town\'s manga artist, in a towel headband and a smock, four arms to stand on and four to work with: a dip pen thrust at you, a page, a brush and a ruler. Press him: all four whirl, drawing at impossible speed.',
      kana: { kind: 'do', t: 0.1, dur: 2.6 },
      gimmick: { text: 'Deadline!', sfx: [[0.1, 'menace', { kind: 'do' }], [0.3, 'toyRatchet', { n: 14, gap: 0.12 }], [2.15, 'toySnap', { f: 1500, v: 0.8 }]] },
    },
    {
      id: 'kawauso', name: 'Wave-Quiff Otter', jp: '波リーゼントカワウソ', rarity: 'common',
      desc: 'The harbour\'s bad boy, one foot up on a mooring bollard, his quiff combed into a breaking wave and a skipping stone between his fingers. Press him: the wave breaks over his face, and the stone flies.',
      kana: { kind: 'go', t: 0.1, dur: 2.4 },
      gimmick: { text: 'The wave breaks', sfx: [[0.25, 'whoosh'], [0.65, 'splash'], [1.5, 'toyClick', { f: 1800 }], [1.75, 'whoosh']] },
    },
    {
      id: 'pengin', name: 'Chef Penguin', jp: 'コックペンギン', rarity: 'uncommon',
      desc: 'The trattoria\'s cook, up on one foot in his toque, mid-flip. In his pan lies a ghostly fish: whatever he cooks, you feel oddly better. Press him: it leaps, somersaults, and lands back in the pan with a sizzle.',
      kana: { kind: 'go', t: 0.1, dur: 2.2 },
      gimmick: { text: 'Flip!', sfx: [[0.3, 'toyTap'], [0.45, 'whoosh'], [1.5, 'toyTap'], [1.7, 'toyRatchet', { n: 8, gap: 0.08 }]] },
    },
    {
      id: 'azarashi', name: 'Barber Seal', jp: '床屋アザラシ', rarity: 'uncommon',
      desc: 'The town barber, reared up on his tail in a barber-pole smock with a waxed moustache, two pairs of shears held like a duellist\'s blades. Press him: snip-snip-snip in a flurry, and his head snaps round to look at you.',
      kana: { kind: 'go', t: 0.1, dur: 2.6 },
      gimmick: { text: 'Snip!', sfx: [[0.25, 'toyRatchet', { n: 18, gap: 0.085 }], [1.9, 'toySnap', { f: 2400, v: 0.7 }]] },
    },
    {
      id: 'yagi', name: 'Fortune-Teller Goat', jp: '占いヤギ', rarity: 'rare',
      desc: 'The old palm-reader of the arcade in her beaded shawl and headscarf, hoop earrings and a goatee, a crystal ball raised high. Press her: she sways over it with her eyes shut, and the ball glows.',
      kana: { kind: 'go', t: 0.1, dur: 3.0 },
      light: { part: 'ball', color: '#c8d8ff', mode: 'press', dur: 3.5 },
      gimmick: { text: 'I see...', sfx: [[0.1, 'ledClick', { on: true }], [0.4, 'menace', { kind: 'go' }]] },
    },
    {
      id: 'yamori', name: 'The Quiet Neighbour', jp: '裏の隣人ヤモリ', rarity: 'secret',
      desc: 'A neat salaryman gecko watering his morning glory, with a polite little wave and a pleasant smile. Nothing odd about him at all. Press him, and his head turns slowly right round: there is another face on the back of it.',
      kana: { kind: 'do', t: 0.8, dur: 2.4 },
      gimmick: { text: 'Good evening.', sfx: [[0.75, 'toyRatchet', { n: 10, gap: 0.12 }], [1.9, 'menace', { kind: 'do' }], [3.0, 'toyRatchet', { n: 8, gap: 0.1 }]] },
    },
  ],
};
