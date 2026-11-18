// Obake Yashiki no Baito (おばけ屋敷のバイト, "Haunted House Part-Timers"): the cheap painted scares of a Shōwa
// amusement-park haunted house, each on its own stage block in front of a black flat. Turn one round and there is a
// bored animal part-timer in a happi coat working it. An original dark-cute playset series modelled in Blender
// (art/blender/toys/obakebaito, concept in art/blender/toys/concepts_B.md). Press one (left click in hand, right click on
// a shelf) and the scare springs while the part-timer works it; stand them side by side on one board and the stage
// blocks click together into one haunted-house corridor (src/game/playsets.js).
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
const PS = { set: 'obakebaito', in: 'in', out: 'out' };
export default {
  id: 'obakebaito',
  order: 36,
  name: 'Haunted House Part-Timers',
  jp: 'おばけ屋敷のバイト',
  tagline: 'Scary from the front. Tired from the back.',
  taglineJp: 'うらから見ると、バイト中',
  price: 300,
  themes: ['weird', 'retro', 'japan'],
  card: { bg: '#2a2228', accent: '#8e2f4a', text: '#f1ece0', accent2: '#d8c27a', pattern: 'dots', kind: 'おばけ屋敷プレイセット' },
  capsule: { colors: [0x2a2228, 0x8e2f4a, 0x2c3a66, 0xf1ece0] },
  items: [
    {
      id: 'kasa', name: 'Umbrella Ghost', jp: '傘おばけ', rarity: 'common', playset: PS,
      desc: 'A one-eyed paper umbrella hopping on one hairy leg in one geta, its tongue hanging out. Round the back, a hamster on a crate with a cup of tea holds the string.',
      gimmick: { text: 'Boo!', sfx: [[0.1, 'toyFold', { n: 2 }], [0.2, 'whoosh', { dur: 0.2, v: 0.06 }], [0.55, 'toyTap'], [0.6, 'toyClick', { f: 900 }], [0.75, 'toyFold', { n: 1 }], [1.05, 'toyTap', { v: 0.6 }]] },
    },
    {
      id: 'ido', name: 'Well Ghost', jp: '井戸おばけ', rarity: 'common', playset: PS,
      desc: 'An old stone well, and in it a white-robed ghost with long black hair over her face, one eye peeping through. Round the back, a mole in a happi coat turns the winch.',
      gimmick: { text: 'Urameshiya', sfx: [[0.05, 'toyRatchet', { n: 8, gap: 0.09 }], [0.85, 'whoosh', { dur: 0.6, v: 0.05 }], [1.65, 'toyRatchet', { n: 5, gap: 0.09 }], [2.15, 'toyTap', { v: 0.5 }]] },
    },
    {
      id: 'chochin', name: 'Lantern Ghost', jp: '提灯おばけ', rarity: 'uncommon', playset: PS,
      desc: 'An old paper lantern torn into a grin, one eye open and one squinting, dangling from a bamboo pole. Round the back, a tanuki in a happi coat holds the pole like a fishing rod and tries not to yawn.',
      gimmick: { text: 'Boo!', sfx: [[0.1, 'toyTap', { v: 0.5 }], [0.25, 'toyTap', { v: 0.5 }], [0.4, 'paper'], [0.5, 'toyFold', { n: 3 }], [0.75, 'toyTap', { v: 0.5 }], [1.65, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'rokuro', name: 'Long-Neck Lady', jp: 'ろくろ首', rarity: 'uncommon', playset: PS,
      desc: 'A lady doll kneeling in a plum furisode, gofun-white face, glossy shimada hair and a red comb, hands folded in her lap. Round the back, a weasel in a happi coat braced against the push rod.',
      gimmick: { text: 'Stretch', sfx: [[0.1, 'toyTap'], [0.2, 'toyClick', { f: 1400 }], [0.3, 'toyClick', { f: 1700 }], [0.4, 'toyClick', { f: 2000 }], [0.8, 'whoosh', { dur: 0.5, v: 0.04 }], [1.6, 'toyFold', { n: 3 }], [1.85, 'toyTap', { v: 0.5 }]] },
    },
  ],
};
