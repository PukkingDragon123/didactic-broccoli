// Series 9: Wagashi Tray (和菓子処). The sweets of an old confectioner's, real-food models made small on lacquer trays
// and plates (art/lowpix/figures/_src/okashi.py).
export default {
  id: 'okashi',
  order: 9,
  name: 'Wagashi Tray',
  jp: '和菓子処',
  tagline: 'Sweets from the old shop by the shrine',
  taglineJp: 'おいしそうな和菓子たち',
  price: 200,
  themes: ['food', 'japan', 'cute'],
  card: { bg: '#f6ecdc', accent: '#a83a3a', text: '#2a1a14', accent2: '#5a7a3a', pattern: 'sakura' },
  capsule: { colors: [0xf0b8c8, 0x5a7a3a, 0xf6ecdc, 0xa83a3a] },
  items: [
    { id: 'dango', name: 'Hanami Dango', jp: '花見だんご', rarity: 'common', desc: 'Pink, white and green on bamboo skewers: spring, summer and winter. Autumn is the stick.' },
    { id: 'taiyaki', name: 'Taiyaki', jp: 'たい焼き', rarity: 'common', desc: 'A sea bream of crisp batter full of hot sweet bean paste. Head first or tail first?', gimmick: { text: 'Wiggle' } },
    { id: 'dorayaki', name: 'Dorayaki', jp: 'どら焼き', rarity: 'common', desc: 'Two honey pancakes and the red bean between them.' },
    { id: 'sakura', name: 'Sakura Mochi', jp: '桜もち', rarity: 'uncommon', desc: 'Pink rice round sweet bean, wrapped in a salted cherry leaf. Eat the leaf.' },
    { id: 'manju', name: 'Momiji Manju', jp: 'もみじまんじゅう', rarity: 'uncommon', desc: "Little sponge cakes baked in the shape of maple leaves, bean paste inside. The island's souvenir." },
    { id: 'matcha', name: 'Matcha Bowl', jp: 'お抹茶', rarity: 'rare', desc: 'Whisked to a fine green foam in a rough bowl. Turn it twice before you drink.', gimmick: { text: 'Turn the bowl' } },
    { id: 'momo', name: 'Peach of Long Life', jp: '仙桃', rarity: 'secret', desc: "The hermits' peach from the mountain orchard, blushing and heavy. One bite, one thousand years.", gimmick: { text: 'Turn it' } },
  ],
};
