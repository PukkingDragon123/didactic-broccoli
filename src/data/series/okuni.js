// Okuni Jiman Dōbutsu (おくにじまんどうぶつ, "National Animal Parade"): each country's national animal dressed up in a
// little costume or with a prop of its home, in friendly simple colour cues (no flags, crests or emblems). An original
// capsule series modelled in Blender (art/blender/toys/okuni). Press one and it shows off its national pastime.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
export default {
  id: 'okuni',
  order: 71,
  name: 'National Animal Parade',
  jp: 'おくにじまんどうぶつ',
  tagline: 'Every country sends its best. In costume.',
  taglineJp: 'おくにじまん、だいしゅうごう！',
  price: 300,
  themes: ['retro', 'cute', 'festival'],
  card: { bg: '#f2ecdc', accent: '#2a5aa8', text: '#1e2030', accent2: '#e8443a', pattern: 'dots', kind: 'おくにじまんどうぶつ' },
  capsule: { colors: [0x2a5aa8, 0xf6f0e2, 0xe8443a, 0xe8b830] },
  items: [
    {
      id: 'kangaru', name: 'Bush Hat Kangaroo', jp: 'カンガルー', rarity: 'common',
      desc: 'Australia: a red kangaroo in a slouch bush hat strung with dangling corks, a boomerang in one paw and a joey peeking out of the pouch. Press: a big hop, and up pops the joey.',
      gimmick: { text: 'Hop', sfx: [[0.2, 'whoosh', { dur: 0.25, v: 0.06 }], [0.55, 'thud'], [0.7, 'pop'], [1.3, 'toyTap']] },
    },
    {
      id: 'panda', name: 'Silk Jacket Panda', jp: 'パンダ', rarity: 'common',
      desc: 'China: a giant panda sitting back in a red silk jacket with knotted buttons, a stalk of green bamboo in its paws. Press: chomp, chomp, chomp.',
      gimmick: { text: 'Munch', sfx: [[0.35, 'toyTap'], [0.6, 'toyClick', { f: 900 }], [0.85, 'toyClick', { f: 1000 }], [1.1, 'toyClick', { f: 900 }], [1.6, 'toyTap']] },
    },
    {
      id: 'washi', name: 'Slugger Bald Eagle', jp: 'ハクトウワシ', rarity: 'uncommon',
      desc: 'The USA: a bald eagle in a ball cap and pinstriped jersey, waiting at the plate with the bat on its shoulder and a fierce look. Press: a big swing.',
      gimmick: { text: 'Swing', sfx: [[0.3, 'whoosh', { dur: 0.3, v: 0.08 }], [0.45, 'toySnap', { f: 1400 }], [1.2, 'toyTap']] },
    },
    {
      id: 'kiwi', name: 'Rugby Kiwi', jp: 'キーウィ', rarity: 'uncommon',
      desc: 'New Zealand: a round little kiwi in a black rugby jersey and white shorts, sniffing at the oval ball at its feet with its long beak. Press: it boots the ball up and catches it on its beak.',
      gimmick: { text: 'Kick', sfx: [[0.3, 'toyTap'], [0.4, 'whoosh', { dur: 0.3, v: 0.06 }], [1.0, 'toyClick', { f: 1300 }], [1.4, 'toyTap']] },
    },
    {
      id: 'biba', name: 'Lumberjack Beaver', jp: 'ビーバー', rarity: 'rare',
      desc: 'Canada: a beaver in a red-and-black check shirt and a knitted toque with a pompom, leaning on a hockey stick, its flat tail down behind. Press: a slap of the tail and a slap shot.',
      gimmick: { text: 'Slap shot', sfx: [[0.25, 'thud'], [0.6, 'whoosh', { dur: 0.2, v: 0.07 }], [0.75, 'toySnap', { f: 1100 }], [1.3, 'toyTap']] },
    },
    {
      id: 'yunikon', name: 'Bagpipe Unicorn', jp: 'ユニコーン', rarity: 'secret',
      desc: "Scotland's national animal is a unicorn, and here it is: sitting up in a tartan kilt with a gold horn and a set of bagpipes under its arm, drones over its shoulder. Press: it squeezes the bag and plays a tune.",
      gimmick: { text: 'Play the pipes', sfx: [[0.2, 'toyFold', { n: 2 }], [0.45, 'whoosh', { dur: 0.8, v: 0.05 }], [1.2, 'toyTap'], [1.6, 'toyClick', { f: 1500 }]] },
    },
  ],
};
