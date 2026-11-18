// Anime Genre Club (アニメジャンル部): one animal per classic anime genre, each in the genre's look and caught at its
// big moment, each on its own little base (a hangar deck, a stage, a crater, a pitcher's mound, a school roof, a
// roof ridge, a mossy forest floor); an original capsule-toy series modelled in Blender (art/blender/toys/janru,
// concept in art/blender/toys/concepts_E.md). An affectionate homage to the genres; every character is our own.
// Press one for its signature move.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
// light: light-up parts (src/game/lightup.js).
export default {
  id: 'janru',
  order: 63,
  name: 'Anime Genre Club',
  jp: 'アニメジャンル部',
  tagline: 'Every genre gets its big moment.',
  taglineJp: '必殺のポーズ、ぜんぶあつめよう！',
  price: 300,
  themes: ['retro', 'cool'],
  card: { bg: '#f2ead8', accent: '#d8344e', text: '#1e1c26', accent2: '#2c3c6a', pattern: 'dots', kind: 'アニメジャンルどうぶつフィギュア' },
  capsule: { colors: [0xd8344e, 0x2c3c6a, 0xffd860, 0xf2ead8] },
  items: [
    {
      id: 'robo', name: 'Robot-Pilot Hamster', jp: 'ロボパイロットハムスター', rarity: 'common',
      desc: 'A hamster in an orange flight suit and helmet rides the shoulder of her own squat red super robot, pointing the way. Press it: the robot\'s fist fires forward on its rocket, spinning, and flies back to the wrist.',
      gimmick: { text: 'Rocket fist!', sfx: [[0.4, 'whoosh'], [0.45, 'toyBuzz', { dur: 0.5 }], [1.8, 'toySnap', { f: 900, v: 0.9 }]] },
    },
    {
      id: 'usagi', name: 'Magical-Girl Rabbit', jp: 'まほう少女ウサギ', rarity: 'common',
      desc: 'A white rabbit in a pink frilled dress with a big red chest ribbon, one ear flopped, her star wand raised high on a little stage. Press her: she circles the wand, the star spins open into a burst of rays and lights up.',
      light: { part: ['star', 'rays'], color: '#fff0c8', mode: 'press', dur: 2.6 },
      gimmick: { text: 'Transform!', sfx: [[0.15, 'toyRatchet', { n: 4, gap: 0.1 }], [0.95, 'toySnap', { f: 1600, v: 0.8 }], [1.0, 'ledClick'], [2.4, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'mangusu', name: 'Fighter Mongoose', jp: '気合いマングース', rarity: 'uncommon',
      desc: 'A lean mongoose in a white gi and black belt, his spiky crest up, low in a horse stance in a cracked crater with an energy ball charging between his cupped hands. Press him: the ball swells, pulses and glows.',
      light: { part: 'ball', color: '#d8f4ff', mode: 'press', dur: 2.2 },
      gimmick: { text: 'Charge!', sfx: [[0.1, 'ledClick'], [0.2, 'toyBuzz', { dur: 1.6 }], [2.1, 'toyFold', { n: 1 }]] },
    },
    {
      id: 'shiba', name: 'Ace Shiba', jp: 'エースのシバ', rarity: 'uncommon',
      desc: 'A shiba inu baseball ace in a pinstriped uniform and navy cap, up on one leg at the top of his wind-up on the pitcher\'s mound, glove up, ball cocked behind his head. Press him: the stride, the whip of the arm, and the pitch.',
      gimmick: { text: 'Strike!', sfx: [[0.3, 'whoosh'], [0.62, 'toySnap', { f: 1400, v: 0.9 }], [2.3, 'toyTap']] },
    },
    {
      id: 'gorira', name: 'Rooftop Gorilla', jp: '番長ゴリラ', rarity: 'uncommon',
      desc: 'The school\'s boss: a silverback in a long black school coat over a belly wrap and a battered cap, a grass stalk in his teeth, leaning on his knuckles on the school roof with a bandaged fist cocked. Press him: the haymaker, so hard his cap jumps off.',
      gimmick: { text: 'Haymaker!', sfx: [[0.3, 'whoosh'], [0.6, 'toySnap', { f: 700, v: 1.0 }], [1.15, 'toyTap']] },
    },
    {
      id: 'musasabi', name: 'Ninja Flying Squirrel', jp: '忍者ムササビ', rarity: 'rare',
      desc: 'A flying squirrel in an indigo hood and a long red scarf, crouched on a tiled roof ridge making a two-finger sign, a shuriken ready in her other hand. Press her: she flings her arms wide, the gliding membranes spread like a cape and the shuriken spins.',
      gimmick: { text: 'Vanish!', sfx: [[0.15, 'flapFold'], [0.4, 'toyRatchet', { n: 8, gap: 0.12 }], [2.2, 'flapFold']] },
    },
    {
      id: 'senzan', name: 'Forest Lord', jp: '森のぬしセンザンコウ', rarity: 'secret',
      desc: 'The gentle giant of the woods: a huge old pangolin with a little forest of firs, a round tree and a mushroom growing in the moss on its back, fireflies resting among them. Press it: it lifts its head to look up, and the fireflies light up.',
      light: { part: 'flies', color: '#f0ff9a', mode: 'press', dur: 3.2, blink: [0.5, 0.25] },
      gimmick: { text: '...', sfx: [[0.3, 'toyFold', { n: 2, gap: 0.3 }], [0.9, 'ledClick']] },
    },
  ],
};
