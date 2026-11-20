// Sekai Isshū Kame (せかいいっしゅうガメ, "World Tour Turtles"): turtles and tortoises that carry a famous kind of
// world landmark as their shell (generic architecture: no signage, no logos), each species from the landmark's part of
// the world. An original capsule series modelled in Blender (art/blender/toys/tabigame). Press one: head and legs pull
// in, the landmark shell lifts off its back with a turn (it wears a striped vest under it), drops back, and out it
// all comes again.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
const LIFT = (text, extra = []) => ({ text, sfx: [[0.15, 'toyFold', { n: 3 }], [0.5, 'pop'], [0.75, 'whoosh', { dur: 0.2, v: 0.05 }], [1.2, 'thud'], [1.55, 'toyClick', { f: 1500 }], ...extra].sort((a, b) => a[0] - b[0]) });
export default {
  id: 'tabigame',
  order: 70,
  name: 'World Tour Turtles',
  jp: 'せかいいっしゅうガメ',
  tagline: 'Slow travellers. They bring the sights with them.',
  taglineJp: 'のんびり、せかいいっしゅう。',
  price: 300,
  themes: ['retro', 'cute', 'town'],
  card: { bg: '#e8f0ea', accent: '#2a7a5a', text: '#1e2a24', accent2: '#e8b830', pattern: 'dots', kind: 'せかいいっしゅうガメ' },
  capsule: { colors: [0x2a7a5a, 0xf2ead6, 0xe8b830, 0x5a4a2c] },
  items: [
    {
      id: 'pagoda', name: 'Pagoda Pond Turtle', jp: 'ごじゅうのとうガメ', rarity: 'common',
      desc: 'A Japanese pond turtle plodding along under a five-storey temple pagoda: vermilion posts, white plaster, five tiled roofs with upturned eaves and a bronze spire of nine rings. Press: in it goes, and the pagoda lifts off its back.',
      gimmick: LIFT('Lift the shell'),
    },
    {
      id: 'pisa', name: 'Leaning Tower Slider', jp: 'ななめのとうガメ', rarity: 'common',
      desc: 'A red-eared slider with a white marble bell tower of stacked arcades on its back, leaning, of course. It looks back at it nervously. Press: the tower lifts, wobbles, and leans a little further on the way down.',
      gimmick: LIFT('Lift the tower', [[1.0, 'toyTap']]),
    },
    {
      id: 'tokei', name: 'Clock Tower Box Turtle', jp: 'とけいとうガメ', rarity: 'uncommon',
      desc: 'A prim box turtle with a gothic sandstone clock tower for a shell: four white clock faces, corner pinnacles, a slate spire. Press: in it goes, the tower lifts, and the hands whizz round the dial.',
      gimmick: LIFT('Wind the clock', [[0.55, 'clockTick'], [0.75, 'clockTick'], [0.95, 'clockTick']]),
    },
    {
      id: 'piramido', name: 'Pyramid Spurred Tortoise', jp: 'ピラミッドリクガメ', rarity: 'uncommon',
      desc: 'A grumpy old spurred tortoise of the desert carrying three sandstone pyramids, the great one in the middle, their courses worn by four thousand years of sun. Press: the pyramids lift off and settle back with a thump of sand.',
      gimmick: LIFT('Lift the pyramids'),
    },
    {
      id: 'tamanegi', name: 'Onion Dome Steppe Tortoise', jp: 'たまねぎやねガメ', rarity: 'rare',
      desc: 'A cheeky steppe tortoise with a cathedral of onion domes on its back, each dome twisted in its own bright stripes round a tall golden centre tower. Press: the whole cathedral lifts off and twirls.',
      gimmick: LIFT('Twirl the domes'),
    },
    {
      id: 'sekai', name: 'The World Turtle', jp: 'せかいガメ', rarity: 'secret',
      desc: 'The oldest traveller of all: a wise sea turtle with gold-leaf scutes, swimming through the stars with the whole round world on its back. Press: it paddles its flippers and the globe spins round.',
      gimmick: { text: 'Spin the world', sfx: [[0.1, 'flap'], [0.35, 'whoosh', { dur: 0.6, v: 0.05 }], [0.6, 'flap'], [1.1, 'flap'], [1.7, 'toyRatchet', { n: 4 }], [2.1, 'toyClick', { f: 1600 }]] },
    },
  ],
};
