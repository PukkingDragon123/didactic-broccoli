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
  ],
};
