// Karakuri Dōbutsu (からくり動物, "Edo Wind-Up Automata"): the carved and lacquered mechanical dolls of the Edo period
// that served tea and turned somersaults, made as animals in the same craft: gofun-white faces with fine painted
// features, silk-pattern costumes, black-lacquer bases with a gear window in front, the whalebone spring behind a
// hatch and a brass key in the side. An original wind-up series modelled in Blender (art/blender/toys/karakuri, concept
// in art/blender/toys/concepts_B.md). Press one (left click in hand, right click on a shelf): the key winds, then the
// automaton does its one real trick while the key unwinds.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
const WIND = [[0.0, 'toyRatchet', { n: 8, gap: 0.05 }]];
export default {
  id: 'karakuri',
  order: 37,
  name: 'Edo Wind-Up Automata',
  jp: 'からくり動物',
  tagline: 'Wind the key. Watch the trick.',
  taglineJp: 'ねじを巻けば、からくり仕掛け',
  price: 400,
  themes: ['japan', 'retro', 'animals'],
  card: { bg: '#efe6d2', accent: '#1d1a20', text: '#1d1a20', accent2: '#c79a48', pattern: 'waves', kind: 'からくり人形フィギュア' },
  capsule: { colors: [0x1d1a20, 0xc79a48, 0xb3282c, 0xefe6d2] },
  items: [
    {
      id: 'chahakobi', name: 'Tea-Carrier Tanuki', jp: '茶運びタヌキ', rarity: 'common',
      desc: 'A tea-serving automaton made as a tanuki: gofun-white face, red brocade kimono, a tea bowl on a black lacquer tray. Wind it and it brings you the tea, bows, and glides home.',
      gimmick: { text: 'Wind', sfx: [...WIND, [0.5, 'clockTick'], [0.75, 'clockTick'], [1.0, 'clockTick'], [1.25, 'clockTick'], [1.6, 'toyTap', { v: 0.4 }], [1.75, 'toyClick', { f: 1300 }], [2.4, 'clockTick'], [2.7, 'clockTick'], [3.0, 'clockTick'], [3.3, 'toyTap', { v: 0.4 }]] },
    },
    {
      id: 'dangaeri', name: 'Somersault Monkey', jp: '段返りザル', rarity: 'common', playset: { set: 'karakuri', in: 'in', out: 'out' },
      desc: 'The step-somersault automaton as a little monkey acrobat in red and gold brocade, at the top of its own black-lacquer stair. Wind it and it flips backwards down the steps, bows, and scampers back up. Two stairs side by side make one long flight.',
      gimmick: { text: 'Wind', sfx: [...WIND, [0.7, 'whoosh', { dur: 0.3, v: 0.06 }], [1.3, 'toyTap'], [1.4, 'whoosh', { dur: 0.3, v: 0.06 }], [2.0, 'toyTap'], [2.4, 'toyClick', { f: 1300 }], [2.85, 'toyTap', { v: 0.4 }], [3.3, 'toyTap', { v: 0.4 }]] },
    },
  ],
};
