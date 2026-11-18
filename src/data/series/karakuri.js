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
      desc: 'A tea-serving automaton made as a tanuki: gofun-white face, red brocade kimono, a tea bowl on a black lacquer tray, four little brass wheels under its hem. Wind it and it rolls you the tea, bows, and rolls home.',
      gimmick: { text: 'Wind', sfx: [...WIND, [0.5, 'clockTick'], [0.75, 'clockTick'], [1.0, 'clockTick'], [1.25, 'clockTick'], [1.6, 'toyTap', { v: 0.4 }], [1.75, 'toyClick', { f: 1300 }], [2.4, 'clockTick'], [2.7, 'clockTick'], [3.0, 'clockTick'], [3.3, 'toyTap', { v: 0.4 }]] },
    },
    {
      id: 'dangaeri', name: 'Somersault Monkey', jp: '段返りザル', rarity: 'common', playset: { set: 'karakuri', in: 'in', out: 'out' },
      desc: 'The step-somersault automaton as a little monkey acrobat in red and gold brocade, at the top of its own black-lacquer stair. Wind it and it flips backwards down the steps, bows, and scampers back up. Two stairs side by side make one long flight.',
      gimmick: { text: 'Wind', sfx: [...WIND, [0.7, 'whoosh', { dur: 0.3, v: 0.06 }], [1.3, 'toyTap'], [1.4, 'whoosh', { dur: 0.3, v: 0.06 }], [2.0, 'toyTap'], [2.4, 'toyClick', { f: 1300 }], [2.85, 'toyTap', { v: 0.4 }], [3.3, 'toyTap', { v: 0.4 }]] },
    },
    {
      id: 'yumihiki', name: 'Archer Rabbit', jp: '弓曳きウサギ', rarity: 'uncommon',
      desc: 'The bow-drawing automaton as a white rabbit in green brocade, kneeling on a red cushion with a tall lacquered yumi and a target on a post at the end of its base. Wind it: it draws to the cheek, looses (the bow turns over in its paw), hits, bows, and nocks a fresh arrow.',
      gimmick: { text: 'Wind', sfx: [...WIND, [0.5, 'toyFold', { n: 5, gap: 0.12 }], [1.53, 'toySnap', { f: 700, v: 0.5 }], [1.55, 'whoosh', { dur: 0.15, v: 0.05 }], [1.67, 'toyTap', { v: 0.9 }], [1.75, 'toyTap', { v: 0.3 }], [2.35, 'clockTick'], [3.0, 'toyClick', { f: 1100 }], [3.25, 'toyFold', { n: 2, gap: 0.08 }]] },
    },
    {
      id: 'mojikaki', name: 'Calligrapher Owl', jp: '文字書きフクロウ', rarity: 'uncommon',
      desc: 'The writing automaton as a scholarly owl in an indigo robe and a black lacquer eboshi, kneeling by a gold-edged shikishi board on its easel, inkstone at its knee. Wind it: it dips its brush and writes 寿 (long life), stroke by stroke, then admires its work.',
      gimmick: { text: 'Wind', sfx: [...WIND, [0.63, 'toyTap', { v: 0.3 }], [0.77, 'toyTap', { v: 0.3 }], [1.03, 'page'], [1.27, 'page'], [1.5, 'page'], [1.77, 'page'], [2.13, 'page'], [2.4, 'page'], [2.7, 'toyTap', { v: 0.2 }], [3.3, 'clockTick']] },
    },
    {
      id: 'kasamawashi', name: 'Parasol Cat', jp: '傘回しネコ', rarity: 'rare',
      desc: 'The parasol-spinning automaton as a ginger cat in a sky-blue kimono, holding up a red paper wagasa with its gold paw crest, a temari ball on the rim. Wind it: the parasol spins, the ball runs round and round its rim, hops, and lands back where it began.',
      gimmick: { text: 'Wind', sfx: [...WIND, [0.6, 'whoosh', { dur: 0.4, v: 0.05 }], [1.15, 'whoosh', { dur: 0.4, v: 0.06 }], [1.7, 'whoosh', { dur: 0.4, v: 0.06 }], [2.25, 'whoosh', { dur: 0.4, v: 0.04 }], [2.55, 'pop', { v: 0.4 }], [3.05, 'toyTap', { v: 0.5 }], [3.3, 'clockTick']] },
    },
    {
      id: 'houou', name: 'Golden Phoenix', jp: '金の鳳凰', rarity: 'secret',
      desc: 'The master’s piece: a phoenix in gold leaf and coloured lacquer, perched on a black-lacquer rock with gold paulownia, its long plumes trailing. Wind it: it lifts its head and cries, spreads its wings and fans its tail high behind it, beats its wings twice, and folds away.',
      gimmick: { text: 'Wind', sfx: [...WIND, [0.55, 'flap'], [0.75, 'toySnap', { f: 2400, v: 0.25 }], [0.85, 'toyFold', { n: 6, gap: 0.08 }], [1.55, 'flap'], [1.9, 'flap'], [2.55, 'toyFold', { n: 5, gap: 0.1 }], [3.45, 'toyClick', { f: 1500 }]] },
    },
  ],
};
