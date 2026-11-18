// Ekiin Dōbutsu (えきいんどうぶつ, "Platform Staff"): the rush-hour platform of a Shōwa railway station, staffed by
// animals in the railway's uniform, an original capsule-toy series modelled in Blender (art/blender/toys/ekiin,
// concept in art/blender/toys/concepts_C.md). The twist: every job is done by the animal born for it. Press one (left
// click in hand, right click on a shelf) and it does its job.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
export default {
  id: 'ekiin',
  order: 41,
  name: 'Platform Staff',
  jp: 'えきいんどうぶつ',
  tagline: 'Every job done by the animal born for it',
  taglineJp: 'ホームの仕事はおまかせ！',
  price: 300,
  themes: ['retro', 'town'],
  card: { bg: '#e8e2cc', accent: '#2c3a5c', text: '#1e2430', accent2: '#c8303a', pattern: 'grid', kind: 'えきいんフィギュア' },
  capsule: { colors: [0x2c3a5c, 0xc8303a, 0xe8e2cc, 0xd8b04a] },
  items: [
    {
      id: 'kitsutsuki', name: 'Ticket Woodpecker', jp: 'キップきりキツツキ', rarity: 'common',
      desc: 'The wicket clipper. He twirls his steel clipper between passengers out of habit, but when it comes to the ticket he punches it with his beak. Three pecks, one neat hole.',
      gimmick: { text: 'Clip a ticket', sfx: [[0.1, 'toyClick', { f: 3200 }], [0.25, 'toyClick', { f: 3400 }], [0.4, 'toyClick', { f: 3200 }], [0.55, 'toyClick', { f: 3400 }], [1.2, 'toyTap'], [1.47, 'toyTap'], [1.74, 'toyTap'], [2.1, 'toyClick']] },
    },
    {
      id: 'kaba', name: 'Pusher Hippo', jp: 'おしやカバ', rarity: 'common',
      desc: 'The rush-hour pusher, in white gloves. The carriage is full and there is still a briefcase in the doorway, so he backs up, wiggles, and applies the biggest backside on the line.',
      gimmick: { text: 'Push', sfx: [[0.15, 'footstep'], [0.4, 'toyFold', { n: 4, gap: 0.09 }], [0.9, 'thud'], [1.0, 'toyTap'], [1.3, 'footstep'], [1.35, 'slideDoor'], [1.55, 'toySnap', { f: 900 }], [1.65, 'toyClick'], [1.75, 'toyClick'], [1.9, 'toyClick'], [2.0, 'toyClick']] },
    },
    {
      id: 'tako', name: 'Ekiben Octopus', jp: 'べんとうダコ', rarity: 'uncommon',
      desc: 'The platform lunchbox seller: a tray of station bentō and clay tea pots on a strap, five arms to stand on and three to work with. "Bentō, bentō! O-cha!" Nobody on the platform is quicker with the change.',
      gimmick: { text: 'Sell a bentō', sfx: [[0.1, 'toyTap'], [0.3, 'toyTap'], [0.5, 'toyFold', { n: 3 }], [0.95, 'coinClink'], [1.1, 'toyClick'], [1.3, 'dishClink'], [1.5, 'dishClink'], [1.9, 'toyTap']] },
    },
    {
      id: 'perikan', name: 'Red-Cap Pelican', jp: 'あかぼうペリカン', rarity: 'uncommon',
      desc: 'The porter in the red cap, hugging a tower of luggage with his bill on top to steady it. Something a passenger forgot is in his pouch: you can see the crook of an umbrella.',
      gimmick: { text: 'Steady!', sfx: [[0.12, 'toyTap'], [0.3, 'toyTap'], [0.45, 'toyTap'], [0.85, 'toyFold', { n: 3 }], [1.6, 'toySnap', { f: 1100, v: 0.6 }], [1.72, 'gulp'], [2.05, 'toyTap']] },
    },
  ],
};
