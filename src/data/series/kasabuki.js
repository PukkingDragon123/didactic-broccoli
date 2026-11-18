// Henshin Kasabuki (ヘンシン傘ぶき, "Umbrella Arms"): umbrellas that are secretly weapons, each on its own
// black-lacquer sword stand. The umbrella's own parts become the weapon's: the wagasa's canopy is the katana's
// scabbard, the bat-umbrella's panels fan into a bat-wing axe, the parasol splits into the limbs of a bow. An original
// mechanical-transformation capsule series modelled in Blender (art/blender/toys/kasabuki, concept in
// art/blender/toys/concepts_D.md). Press one (left click in hand, right click on a shelf): it transforms, holds the
// weapon pose and folds back into the umbrella.
export default {
  id: 'kasabuki',
  order: 54,
  name: 'Umbrella Arms',
  jp: 'ヘンシン傘ぶき',
  tagline: 'Rain or shine, always armed.',
  taglineJp: '傘が、武器になる！',
  price: 300,
  themes: ['retro', 'cool'],
  card: { bg: '#2a2224', accent: '#c8342a', text: '#f2ecdc', accent2: '#c8a048', pattern: 'stripes', kind: '変形傘ぶきコレクション' },
  capsule: { colors: [0x2a2224, 0xc8342a, 0xc8a048, 0x23305a] },
  items: [
    {
      id: 'katana', name: 'Wagasa Katana', jp: 'ばんがさカタナ', rarity: 'common',
      desc: 'A red oiled-paper wagasa with a rattan-wrapped handle. Click: the closed canopy slides off along the stand as the scabbard, the tsuba flips out and locks, and the blade is drawn.',
      gimmick: { text: 'Draw', sfx: [[0.15, 'toyClick', { f: 1800 }], [0.3, 'toyRatchet', { n: 4, gap: 0.05 }], [0.72, 'toySnap', { f: 1500, v: 0.8 }], [1.0, 'whoosh'], [2.2, 'toyRatchet', { n: 4, gap: 0.05 }], [2.65, 'toySnap', { f: 1200, v: 0.6 }]] },
    },
    {
      id: 'halberd', name: 'Bat-Umbrella Halberd', jp: 'こうもりハルバード', rarity: 'common',
      desc: 'A black Western umbrella (a "bat umbrella", kōmori-gasa) with a crook handle. Click: the tip shoots out into a spike, three canopy panels fan up into a bat-wing axe blade and a fourth drops into the back hook.',
      gimmick: { text: 'Unfold', sfx: [[0.15, 'toyClick', { f: 1800 }], [0.33, 'toySnap', { f: 1600, v: 0.6 }], [0.5, 'toyFold', { n: 4, gap: 0.1 }], [0.95, 'toySnap', { f: 1300, v: 0.8 }], [2.2, 'toyFold', { n: 4, gap: 0.08 }]] },
    },
    {
      id: 'bow', name: 'Parasol Bow', jp: 'ひがさボウ', rarity: 'uncommon',
      desc: 'A pink lace parasol with a little crook handle. Click: the canopy splits down its length and swings out into the two limbs of a bow, the string draws out, the tip opens into an arrowhead. The shaft was the arrow all along.',
      gimmick: { text: 'Draw the bow', sfx: [[0.15, 'toyClick', { f: 1800 }], [0.3, 'toyFold', { n: 2 }], [0.7, 'toySnap', { f: 1400, v: 0.7 }], [0.85, 'toyRatchet', { n: 3, gap: 0.06 }], [2.2, 'toyFold', { n: 2 }]] },
    },
    {
      id: 'sansetsu', name: 'Folding Three-Section Staff', jp: 'おりたたみサンセツコン', rarity: 'uncommon',
      desc: 'A navy folding umbrella in its sleeve, wrist strap and all. Click-click: it comes apart into three sections on chains, swings up into a zig-zag and whirls once round its handle.',
      gimmick: { text: 'Unchain', sfx: [[0.13, 'toyClick', { f: 1800 }], [0.2, 'chainJingle', { n: 4 }], [0.75, 'toySnap', { f: 1300, v: 0.7 }], [1.05, 'whoosh'], [1.35, 'whoosh'], [2.3, 'chainJingle', { n: 3 }]] },
    },
    {
      id: 'yari', name: 'Janome Spear', jp: 'じゃのめヤリ', rarity: 'rare',
      desc: 'A navy bull\'s-eye umbrella (janome-gasa) with a bamboo shaft. Click: the top cap flips open, the shaft telescopes, the canopy closes up into a socket, the leaf blade slides out and a red tassel flares.',
      gimmick: { text: 'Extend', sfx: [[0.15, 'toyClick', { f: 1800 }], [0.3, 'toyRatchet', { n: 5, gap: 0.05 }], [0.6, 'toyFold', { n: 3 }], [0.93, 'toySnap', { f: 1400, v: 0.8 }], [2.2, 'toyRatchet', { n: 5, gap: 0.05 }]] },
    },
    {
      id: 'ryuto', name: 'Lantern Dragon Glaive', jp: 'ちょうちんリュウトウ', rarity: 'secret',
      desc: 'An umbrella whose canopy is a red paper lantern, on a black-lacquer shaft with gold rings and a dragon-tail pommel. Click: the lantern opens into a dragon\'s jaws, the pearl in its throat lights, and a broad glaive blade slides out of its mouth.',
      gimmick: { text: 'Awaken', sfx: [[0.13, 'toyClick', { f: 1800 }], [0.3, 'toyFold', { n: 2 }], [0.47, 'ledClick', { on: true }], [0.6, 'toyRatchet', { n: 5, gap: 0.05 }], [0.87, 'toySnap', { f: 1200, v: 0.9 }], [2.3, 'toyFold', { n: 2 }]] },
      light: { part: 'pearl', color: '#ffd070', mode: 'press', dur: 2.6 },
    },
  ],
};
