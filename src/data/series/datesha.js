// Pose Beasts III: Dandy Gang (奇妙ポーズどうぶつ 第三部「伊達ギャング」): the sharpest-dressed gang in town, animals in
// outrageous patterned suits (our own motifs: bees, op-art checks, feather eyes, pinstripes, houndstooth, moons), every
// one of them striking a contrapposto on a chequered marble plinth; an original capsule-toy series modelled in Blender
// (art/blender/toys/datesha, concept in art/blender/toys/concepts_E.md). An affectionate homage to the bizarre
// dramatic-pose manga style; every character here is our own. Press one: it changes pose, holds it, and changes back.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
// kana: the menacing lettering for the press (src/jojo/kana.js kinds), for a figure-press hook to show.
export default {
  id: 'datesha',
  order: 62,
  name: 'Pose Beasts III: Dandy Gang',
  jp: '奇妙ポーズどうぶつ 伊達ギャング',
  tagline: 'Strike the pose. Hold it. Hold it...',
  taglineJp: 'ドドドドド…',
  price: 300,
  themes: ['retro'],
  card: { bg: '#ece6dc', accent: '#2a2a30', text: '#1c1a20', accent2: '#c89a30', pattern: 'grid', kind: '奇妙ポーズどうぶつフィギュア' },
  capsule: { colors: [0x2a2a30, 0xc89a30, 0xe88aa0, 0xece6dc] },
  items: [
    {
      id: 'ookami', name: 'Dandy Wolf', jp: '伊達オオカミ', rarity: 'common',
      desc: 'The young boss: a grey wolf in a cropped cream jacket cut in a deep V, gold bees on his lapels, his mane slicked back, one hand on his heart. Press him: the arm sweeps up to point at the sky.',
      kana: { kind: 'do', t: 0.2, dur: 2.6 },
      gimmick: { text: 'Pose!', sfx: [[0.2, 'whoosh'], [0.62, 'toySnap', { f: 1300, v: 0.9 }], [0.7, 'menace', { kind: 'do' }], [2.6, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'kujaku', name: 'Peacock Counsel', jp: '孔雀の参謀', rarity: 'common',
      desc: 'The adviser, in a teal three-piece suit printed with little feather eyes and a gold waistcoat, leaning on his cane with his train folded behind him. Press him: the train fans wide open and he turns to look at you.',
      kana: { kind: 'go', t: 0.3, dur: 2.6 },
      gimmick: { text: 'Pose!', sfx: [[0.25, 'flapFold'], [0.9, 'toySnap', { f: 1300, v: 0.9 }], [1.0, 'menace', { kind: 'go' }], [2.8, 'flapFold']] },
    },
    {
      id: 'pagu', name: 'Bowl-Cut Pug', jp: 'おかっぱパグ', rarity: 'uncommon',
      desc: 'The youngest of the gang, a pug with a glossy bowl cut in an op-art check suit and red loafers, arms crossed, chin up. Press him: he leans in with both hands framing his face.',
      kana: { kind: 'do', t: 0.2, dur: 2.6 },
      gimmick: { text: 'Pose!', sfx: [[0.2, 'whoosh'], [0.62, 'toySnap', { f: 1300, v: 0.9 }], [0.7, 'menace', { kind: 'do' }], [2.6, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'flamingo', name: 'Flamingo Hitman', jp: '殺し屋フラミンゴ', rarity: 'uncommon',
      desc: 'The quiet professional: a flamingo in a pink pinstripe suit and dark glasses, a carnation in his lapel, poised on one leg with his wings folded. Press him: the wings fling wide and his head snaps up.',
      kana: { kind: 'go', t: 0.2, dur: 2.6 },
      gimmick: { text: 'Pose!', sfx: [[0.2, 'flapFold'], [0.55, 'toySnap', { f: 1300, v: 0.9 }], [0.65, 'menace', { kind: 'go' }], [2.6, 'flapFold']] },
    },
    {
      id: 'kameleon', name: 'Chameleon Tailor', jp: '仕立て屋カメレオン', rarity: 'rare',
      desc: 'The gang\'s tailor, in a houndstooth suit with a pincushion on his wrist and a tape measure held out like a foil, his tail rolled in a spiral. Press him: the eyes swivel every which way, the tail unrolls and the tape whips up.',
      kana: { kind: 'go', t: 0.2, dur: 2.6 },
      gimmick: { text: 'Measured!', sfx: [[0.2, 'toyRatchet', { n: 4, gap: 0.3 }], [0.7, 'whoosh'], [0.75, 'menace', { kind: 'go' }], [2.6, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'kobura', name: 'Cobra Don', jp: '大親分コブラ', rarity: 'secret',
      desc: 'The head of the dandy gang, a king cobra coiled on his plinth in a white moon-print jacket worn over his shoulders and a cream fedora. Press him: he rears up, the hood flares wide and the forked tongue flicks.',
      kana: { kind: 'do', t: 0.3, dur: 2.8 },
      gimmick: { text: 'Kneel.', sfx: [[0.25, 'toyFold', { n: 2 }], [0.7, 'toySnap', { f: 1100, v: 0.9 }], [0.75, 'menace', { kind: 'do' }], [1.0, 'toyBuzz', { dur: 0.3 }], [1.65, 'toyBuzz', { dur: 0.3 }]] },
    },
  ],
};
