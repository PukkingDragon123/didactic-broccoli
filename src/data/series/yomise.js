// Shinkai Yomise (しんかい夜店, "Deep-Sea Night Stalls"): a festival night market at the bottom of the sea. There is no
// electricity down there, so every stall is lit by its keeper: the anglerfish's lure, the barreleye's see-through head,
// the firefly squid's glow-sticks, the isopod's paper lanterns. An original dark-cute light-up capsule series modelled in
// Blender (art/blender/toys/yomise, concept in art/blender/toys/concepts_D.md). Press one (left click in hand, right
// click on a shelf): the light comes on and they make the sale (src/game/lightup.js).
export default {
  id: 'yomise',
  order: 52,
  name: 'Deep-Sea Night Stalls',
  jp: 'しんかい夜店',
  tagline: 'No electricity down here: every stall brings its own light.',
  taglineJp: 'ふかいふかい海の夜店',
  price: 300,
  themes: ['retro', 'spooky'],
  card: { bg: '#1c2440', accent: '#f2c230', text: '#eef0f2', accent2: '#e0503a', pattern: 'dots', kind: 'しんかい夜店フィギュア' },
  capsule: { colors: [0x1c2440, 0xe0503a, 0xf2c230, 0x6e6a7c] },
  items: [
    {
      id: 'ankou', name: 'Lure-Fishing Anglerfish', jp: 'ちょうちんアンコウ', rarity: 'common',
      desc: 'The water-balloon fishing stall: a fat anglerfish with a mouthful of teeth squats behind a tub of striped balloons. Its own lure is the stall\'s lamp and the fishing line. It lights, dips, and up comes a balloon. Very proud.',
      gimmick: { text: 'Fish!', sfx: [[0.13, 'ledClick', { on: true }], [0.6, 'splash'], [0.8, 'pop'], [1.5, 'toyTap', { v: 0.4 }], [1.7, 'toyTap', { v: 0.4 }]] },
      light: { part: 'esca', color: '#eaffb0', mode: 'press', dur: 2.6 },
    },
    {
      id: 'demenigisu', name: 'Fortune-Teller Barreleye', jp: 'うらないデメニギス', rarity: 'common',
      desc: 'The fortune-teller\'s booth: a barreleye stands on its tail behind a draped table, its see-through dome head for the crystal ball, the green tube-eyes inside looking up. (The two "eyes" on its face are its nostrils.) A fortune stick pops up.',
      gimmick: { text: 'Fortune', sfx: [[0.13, 'ledClick', { on: true }], [0.4, 'whoosh'], [0.8, 'whoosh'], [1.42, 'pop'], [1.5, 'toyClick']] },
      light: { part: 'dome', color: '#b8ffc8', mode: 'press', dur: 2.6 },
    },
    {
      id: 'hotaruika', name: 'Glow-Stick Firefly Squid', jp: 'ひかりぼうホタルイカ', rarity: 'uncommon',
      desc: 'The glow-stick seller: a little firefly squid on its splayed arms beside a bamboo pole of glowing rings, a stick held up in each raised arm. A firefly squid\'s arm tips are its lights, so this is easy. Twirl, twirl, blink.',
      gimmick: { text: 'Twirl', sfx: [[0.13, 'ledClick', { on: true }], [0.3, 'whoosh'], [0.7, 'whoosh'], [1.1, 'whoosh'], [1.5, 'whoosh']] },
      light: { part: ['stick_l', 'stick_r', 'ring0', 'ring1', 'ring2'], color: '#9ae8ff', mode: 'press', dur: 2.4, blink: [0.2, 0.15] },
    },
    {
      id: 'fukurounagi', name: 'Balloon Gulper Eel', jp: 'ふうせんフクロウナギ', rarity: 'uncommon',
      desc: 'The balloon seller: a gulper eel, all mouth, its tiny eyes right at the tip of its snout, coiled on the sea floor with two balloons tied to its glowing tail. The jaw drops, a balloon blows up big in its mouth, and then: gulp.',
      gimmick: { text: 'Puff', sfx: [[0.13, 'toyFold', { n: 1 }], [0.4, 'toyBuzz', { dur: 0.6 }], [1.75, 'pop'], [1.9, 'toySnap', { f: 900, v: 0.6 }]] },
      light: { part: 'tip', color: '#ffa8d0', mode: 'press', dur: 2.4 },
    },
    {
      id: 'gusokumushi', name: 'Lantern-Peddler Giant Isopod', jp: 'ちょうちんダイオウグソクムシ', rarity: 'rare',
      desc: 'A lantern peddler: a giant isopod in its armour of plates, a wooden carrying frame strapped on its back with three paper lanterns on the top bar. It has not eaten for five years. It does not mind. Lights on, and it curls up, shy.',
      gimmick: { text: 'Lights', sfx: [[0.13, 'ledClick', { on: true }], [0.45, 'toyFold', { n: 3 }], [1.8, 'toyFold', { n: 3 }]] },
      light: { part: 'lanterns', color: '#ffd8a0', mode: 'press', dur: 2.5 },
    },
    {
      id: 'ryuuguu', name: "The Dragon Palace's Messenger", jp: 'リュウグウノツカイ', rarity: 'secret',
      desc: 'The oarfish, the "messenger of the Dragon Palace", as the night market\'s festival float: a long silver ribbon of a fish coiled round a red coral stand, a red fin down its back and the red plumes of its crest streaming back. It ripples like a festival dragon.',
      gimmick: { text: 'Matsuri', sfx: [[0.13, 'ledClick', { on: true }], [0.3, 'whoosh'], [0.9, 'whoosh'], [1.5, 'whoosh']] },
      light: { part: 'crest', color: '#ff6a52', mode: 'press', dur: 2.6 },
    },
  ],
};
