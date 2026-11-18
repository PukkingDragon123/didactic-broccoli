// Yukemuri Sentō (ゆけむり銭湯, "Bathhouse Regulars"): the neighbourhood bathhouse and its regulars, each an animal
// doing its bath ritual the way its body was made for it. An original playset capsule series modelled in Blender
// (art/blender/toys/sento, concept in art/blender/toys/concepts_D.md). Every figure comes on a section of tiled
// bathhouse floor: put them side by side on a shelf board and the sections click together into one long bathhouse
// (src/game/playsets.js). Press one (left click in hand, right click on a shelf) for its ritual.
const PS = { set: 'sento', in: 'in', out: 'out' };
export default {
  id: 'sento',
  order: 50,
  name: 'Bathhouse Regulars',
  jp: 'ゆけむり銭湯',
  tagline: 'Everyone has their own way to take a bath.',
  taglineJp: 'いい湯だな！',
  price: 300,
  themes: ['retro', 'cute'],
  card: { bg: '#e9ece6', accent: '#2a5aa8', text: '#1c2430', accent2: '#c8303a', pattern: 'dots', kind: '銭湯じょうれんフィギュア' },
  capsule: { colors: [0x2a5aa8, 0xf2c230, 0xe9ece6, 0x5fb4b8] },
  items: [
    {
      id: 'kame', name: 'Bandai Tortoise', jp: 'ばんだいガメ', rarity: 'common', playset: PS,
      desc: 'The old attendant up on the bandai, the high wooden booth by the door, in a knitted belly-warmer, with the coin tray at his elbow and a stack of towels. He dozes off right into his shell, then pops out with a towel for you.',
      gimmick: { text: 'Doze', sfx: [[0.2, 'toyFold', { n: 2 }], [0.9, 'toyTap', { v: 0.3 }], [1.25, 'toyTap', { v: 0.3 }], [1.6, 'pop'], [1.8, 'toyClick']] },
    },
    {
      id: 'kani', name: 'Lather Crab', jp: 'あわガニ', rarity: 'common', playset: PS,
      desc: 'At the washing tap on a little wooden stool, a yellow basin by his feet and a head of foam he blew himself. Crabs blow bubbles; this one blows shampoo. Scrub, scrub, and the foam heap swells until his eyes pop up out of it.',
      gimmick: { text: 'Scrub', sfx: [[0.1, 'toyRatchet', { n: 10, gap: 0.12 }], [0.5, 'bubblePop'], [0.8, 'bubblePop'], [1.1, 'bubblePop'], [1.33, 'pop']] },
    },
    {
      id: 'fugu', name: 'Cold-Plunge Puffer', jp: 'みずぶろフグ', rarity: 'uncommon', playset: PS,
      desc: 'An old pufferfish in the little hinoki cold tub, up to his chin, a folded towel on his head. Every time, he shivers, and every time, brr! he puffs up round with all his spines out. Then he lets it go, slowly.',
      gimmick: { text: 'Brr!', sfx: [[0.13, 'toyBuzz', { dur: 0.45 }], [0.75, 'pop'], [0.8, 'splash'], [1.7, 'toyBuzz', { dur: 0.9 }]] },
    },
    {
      id: 'kirin', name: 'Peeping Giraffe', jp: 'のぞきキリン', rarity: 'uncommon', playset: PS,
      desc: 'A young giraffe at the partition wall, blue tiles on his side and pink on the other. Only his ossicones show over the top. The neck goes up, he peeks, and a yellow basin comes flying back over the wall. Bonk.',
      gimmick: { text: 'Peek', sfx: [[0.13, 'toyRatchet', { n: 5, gap: 0.06 }], [0.9, 'whoosh'], [1.13, 'thud', { v: 0.7 }], [1.15, 'toySnap', { f: 1300, v: 0.8 }], [2.3, 'whoosh']] },
    },
    {
      id: 'rakko', name: 'Bath-Milk Sea Otter', jp: 'ぎゅうにゅうラッコ', rarity: 'rare', playset: PS,
      desc: 'Floating on its back in the big tub with a yellow basin on its tummy for its rock, and a glass bottle of bath milk. Kon-kon on the basin, the paper cap pops, and down it goes in one go. The tub carries on into the next section.',
      gimmick: { text: 'Kon-kon', sfx: [[0.27, 'toyTap'], [0.5, 'toyTap'], [0.8, 'pop'], [1.13, 'splash'], [1.35, 'milk']] },
    },
    {
      id: 'sanshou', name: 'Boiler-Man Salamander', jp: 'かまばんオオサンショウウオ', rarity: 'secret', playset: PS,
      desc: 'Behind the bath wall, the boiler man: a giant salamander in a twisted headband, feeding scrap timber to the brick firebox under the iron boiler. The fire creature of the old books; this one just keeps the water hot.',
      gimmick: { text: 'Stoke', sfx: [[0.13, 'toyRatchet', { n: 3, gap: 0.08 }], [0.8, 'whoosh'], [1.1, 'toyBuzz', { dur: 0.6 }], [1.8, 'thud', { v: 0.8 }], [1.82, 'toySnap', { f: 900, v: 0.8 }]] },
      light: { part: 'fire', color: '#ffb060', mode: 'press', dur: 2.6, blink: [0.14, 0.06] },
    },
  ],
};
