// Kami no Otsukai (かみのおつかい, "The Gods' Messengers"): the animal messengers of Japanese shrines as sleek
// black-lacquer and gold-leaf idols on vermilion shrine steps, an original mythic series modelled in Blender
// (art/blender/toys/otsukai, concept in art/blender/toys/concepts_B.md). Press one (left click in hand, right click
// on a shelf) and the messenger does its duty.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
export default {
  id: 'otsukai',
  order: 34,
  name: "The Gods' Messengers",
  jp: 'かみのおつかい',
  tagline: 'Sent by the shrine, on official business.',
  taglineJp: '神さまのおつかい、ただいま参上',
  price: 400,
  themes: ['shrine', 'japan', 'retro'],
  card: { bg: '#efe6d2', accent: '#b8322a', text: '#1f1a1c', accent2: '#c99a3a', pattern: 'waves', kind: '漆塗り金箔フィギュア' },
  capsule: { colors: [0x231f26, 0xc99a3a, 0xb8322a, 0xefe6d2] },
  items: [
    {
      id: 'kitsune', name: 'Inari Fox', jp: '稲荷ギツネ', rarity: 'common',
      desc: "The rice god's messenger in black lacquer and gold leaf, sitting bolt upright with the granary key crossways in its mouth and the wish-jewel on the tip of its flame of a tail.",
      gimmick: { text: 'Turn the key', sfx: [[0.3, 'toyClick', { f: 1800 }], [0.5, 'keyTurn'], [0.9, 'toyClick', { f: 2100 }], [0.6, 'whoosh', { dur: 0.25, v: 0.06 }], [1.0, 'whoosh', { dur: 0.2, v: 0.05 }], [1.6, 'toyTap'], [2.2, 'toyClick']] },
    },
    {
      id: 'shika', name: 'Kasuga Deer', jp: '春日ジカ', rarity: 'common',
      desc: "Kasuga's sacred deer, kneeling on its step with a sakaki branch laid across its gold antlers and white paper shide hanging from it. It bows to you, twice, the way the deer at Nara do.",
      gimmick: { text: 'Bow', sfx: [[0.45, 'paper'], [0.55, 'toyTap'], [1.3, 'paper'], [1.4, 'toyTap'], [2.05, 'toyClick', { f: 1600 }]] },
    },
    {
      id: 'karasu', name: 'Sun Crow', jp: '三本足ガラス', rarity: 'uncommon',
      desc: 'The three-legged crow that shows the way, a chubby black-lacquer bird on three gold legs with its wings folded like a cloak and the sun standing behind it.',
      gimmick: { text: 'Spread wings', sfx: [[0.35, 'flap'], [0.5, 'flutter'], [0.75, 'toyTap'], [1.0, 'flap'], [1.65, 'toyClick', { f: 1500 }]] },
    },
  ],
};
