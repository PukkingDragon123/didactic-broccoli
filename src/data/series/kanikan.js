// Kani-kan (カニ缶, "Crabs in Food Cans"): canned crab, turned round: each crab has moved into somebody else's tin and
// is eating the contents, every tin with a proper printed label (the 5x7 pixel font, original brands). An original
// pop-up capsule series modelled in Blender (art/blender/toys/kanikan, concept in art/blender/toys/concepts_D.md).
// Press one (left click in hand, right click on a shelf): the lid peels back, the crab pops up and munches.
const MUNCH = (lid) => ({ text: 'Munch', sfx: [[0.13, lid], [0.5, 'toySnap', { f: 1500, v: 0.6 }], [0.8, 'toyTap', { v: 0.4 }], [1.0, 'toyTap', { v: 0.4 }], [1.2, 'toyTap', { v: 0.4 }], [1.4, 'toyTap', { v: 0.4 }], [1.6, 'toyTap', { v: 0.4 }], [2.4, 'toyClick']] });
export default {
  id: 'kanikan',
  order: 55,
  name: 'Crabs in Food Cans',
  jp: 'カニ缶',
  tagline: 'Every crab has found a tin to its taste.',
  taglineJp: 'カニ、缶にすむ。',
  price: 300,
  themes: ['retro', 'cute'],
  card: { bg: '#f2ead6', accent: '#21407a', text: '#1c1a1e', accent2: '#c8302a', pattern: 'stripes', kind: 'カニ缶コレクション' },
  capsule: { colors: [0x21407a, 0xc8302a, 0xc4c8ce, 0xf2c838] },
  items: [
    {
      id: 'iwashi', name: 'Sardine-Tin Blue Crab', jp: 'イワシ缶ワタリガニ', rarity: 'common',
      desc: 'A blue swimming crab, paddle legs and long side spines, on a bed of sardines in a PORTO MARU sardine tin, the key lid half peeled. The lid rolls back, up it pops and munches.',
      gimmick: MUNCH('toyRatchet'),
    },
    {
      id: 'saba', name: 'Mackerel-Tin Hermit Crab', jp: 'サバ缶ヤドカリ', rarity: 'common',
      desc: 'A hermit crab that has taken a SABA STAR mackerel tin for its shell, the tin on its side and the lid up over its head like an awning. Chunks of mackerel at its feet.',
      gimmick: MUNCH('toyClick'),
    },
    {
      id: 'konbi', name: 'Corned-Beef Mitten Crab', jp: 'コンビーフモクズガニ', rarity: 'uncommon',
      desc: 'A furry-clawed mitten crab sat on the block of meat in a BIG RANCH corned-beef tin, the top wound off on its key and hanging at the side.',
      gimmick: MUNCH('toyRatchet'),
    },
    {
      id: 'beans', name: 'Baked-Bean Fiddler Crab', jp: 'ベイクドビーンズシオマネキ', rarity: 'uncommon',
      desc: 'A fiddler crab perched on the beans in a tall HAPPY HILL can, waving its one enormous yellow claw while the little one shovels beans in.',
      gimmick: MUNCH('toyClick'),
    },
    {
      id: 'pine', name: 'Pineapple-Ring Coconut Crab', jp: 'パインかんヤシガニ', rarity: 'rare',
      desc: 'A big purple coconut crab, the robber crab, in a squat ISLE SUN can of pineapple rings, one ring worn round its claw like a bangle.',
      gimmick: MUNCH('toyClick'),
    },
    {
      id: 'caviar', name: 'Caviar Golden Crab', jp: 'キャビアきんのカニ', rarity: 'secret',
      desc: 'A spiny golden crab on a heap of caviar in a ROYAL ROE tin, grade 000, a mother-of-pearl spoon in its claw. The gold-and-black lid swings back and it spoons the caviar in.',
      gimmick: MUNCH('toySnap'),
    },
  ],
};
