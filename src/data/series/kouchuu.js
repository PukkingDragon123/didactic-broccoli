// The Hardwings (ハードウィングス, kōchū "beetles"): a 1960s mop-top four-piece rock band of beetles in collarless suits
// (the elytra are the jackets' tails) and Chelsea boots, plus their roadie, and a secret rooftop session. An original
// band (original name, original characters; a homage to the era only) modelled in Blender (art/blender/toys/kouchuu).
// Press one and it plays: the mop-tops shake.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
const PLAY = (text, extra = []) => ({ text, sfx: [[0.2, 'toyTap'], [0.45, 'toySnap', { f: 900 }], [0.75, 'toySnap', { f: 1100 }], [1.05, 'toySnap', { f: 900 }], ...extra].sort((a, b) => a[0] - b[0]) });
export default {
  id: 'kouchuu',
  order: 72,
  name: 'The Hardwings',
  jp: 'ハードウィングス',
  tagline: 'Mop-top beetle beat group. Shake it!',
  taglineJp: 'こうちゅうバンド、ただいま参上！',
  price: 400,
  themes: ['retro', 'weird'],
  card: { bg: '#efe8d6', accent: '#d8342e', text: '#1c1a1e', accent2: '#f2c230', pattern: 'dots', kind: 'こうちゅうバンド' },
  capsule: { colors: [0x1c1a1e, 0xefe8d6, 0xd8342e, 0xf2c230] },
  items: [
    {
      id: 'kuwagata', name: 'Clip, Lead Guitar', jp: 'クワガタ・クリップ', rarity: 'common',
      desc: 'The stag beetle of the band: mandibles poking out from under his mop-top fringe, grey collarless suit, Chelsea boots and a cherry-red hollow-body guitar. Press: he strums and shakes his mop-top.',
      gimmick: PLAY('Strum'),
    },
    {
      id: 'kabuto', name: 'Horace, Rhythm Guitar', jp: 'カブト・ホレス', rarity: 'common',
      desc: 'The rhinoceros beetle: his horn sticks up out of his mop-top, his black suit is buttoned to the top and his sunburst guitar is slung low. Press: chop, chop, chop on the rhythm and a nod of the horn.',
      gimmick: PLAY('Strum'),
    },
    {
      id: 'tentou', name: 'Dot, Bass', jp: 'テントウ・ドット', rarity: 'uncommon',
      desc: 'The ladybird on bass: her red spotted jacket tails are her wing cases, her mop-top is cut dead straight and her bass is as long as she is. Press: the jacket tails flip open, the wings flutter and she bobs to the beat.',
      gimmick: PLAY('Thump the bass', [[0.1, 'flutter']]),
    },
    {
      id: 'sukarabe', name: 'Sunny, Drums', jp: 'スカラベ・サニー', rarity: 'uncommon',
      desc: 'The scarab on drums, sitting behind his little kit with a bass drum, a snare and a ride cymbal, sticks up and grinning under his fringe. Press: a drum roll and a crash.',
      gimmick: { text: 'Drum roll', sfx: [[0.15, 'toyTap'], [0.3, 'toyTap'], [0.45, 'toyTap'], [0.6, 'thud'], [0.8, 'toyRatchet', { n: 6, gap: 0.04 }], [1.2, 'furin'], [1.5, 'thud']] },
    },
    {
      id: 'funkoro', name: 'Rollo the Roadie', jp: 'ローディー・ロロ', rarity: 'rare',
      desc: 'The dung beetle who hauls the gear: flat cap, work overalls, and a great ball of tangled guitar cables that he rolls from gig to gig, walking backwards on his hands. Press: he rolls it.',
      gimmick: { text: 'Roll the cables', sfx: [[0.1, 'toyRatchet', { n: 4 }], [0.6, 'rolling'], [1.4, 'toyRatchet', { n: 4 }], [1.9, 'toyTap']] },
    },
    {
      id: 'tamamushi', name: 'Jewel, Rooftop Session', jp: 'タマムシ・ジュエル', rarity: 'secret',
      desc: 'The secret fifth member, an iridescent jewel beetle in a long coat, singing on a rooftop of slates by a chimney pot at a tall microphone stand, the wind in its mop-top. Press: it throws its head back for the high note.',
      gimmick: PLAY('Sing', [[0.05, 'whoosh', { dur: 0.4, v: 0.04 }]]),
    },
  ],
};
