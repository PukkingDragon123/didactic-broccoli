// Series 3: Fake Food Window (サンプル食堂). The plastic food samples of a Showa restaurant window, as real-food models
// made small, each in its own bowl, plate or glass (art/lowpix/figures/_src/sampuru.py).
export default {
  id: 'sampuru',
  order: 3,
  name: 'Fake Food Window',
  jp: 'サンプル食堂',
  tagline: 'Looks good enough to eat. Please do not.',
  taglineJp: '本物そっくり！食品サンプル',
  price: 300,
  themes: ['food', 'retro', 'japan'],
  card: { bg: '#fff1dc', accent: '#c8392b', text: '#2b1d14', accent2: '#e8a33a', pattern: 'checker' },
  capsule: { colors: [0xc8392b, 0xe8a33a, 0xfff1dc, 0x3a7a4a], style: 'clear' },
  items: [
    { id: 'ramen', name: 'Shoyu Ramen', jp: 'しょうゆラーメン', rarity: 'common', desc: 'Naruto, a soft egg, nori and the chopsticks resting on the bowl. Smells of nothing at all.' },
    { id: 'katsu', name: 'Morning Set Croissant', jp: 'モーニングのクロワッサン', rarity: 'common', desc: "The kissaten's morning set: a butter croissant on a gold-rimmed plate, coffee not included." },
    { id: 'udon', name: 'Kitsune Udon', jp: 'きつねうどん', rarity: 'common', desc: 'Two sheets of sweet fried tofu on a bowl of thick noodles, for the fox in you.' },
    { id: 'ebifry', name: 'Tower Tendon', jp: 'ジャンボ天丼', rarity: 'uncommon', desc: 'Prawns, squid and lotus root stacked as high as the cook dared, in a black lacquer bowl.' },
    { id: 'pudding', name: 'Iced Ring Cake', jp: 'リングケーキ', rarity: 'rare', desc: "The kissaten's ring cake under the counter glass, the icing running down the sponge. Nobody has ever been sold a slice." },
    { id: 'sundae', name: 'Tower Parfait', jp: 'ジャンボパフェ', rarity: 'ultra', desc: 'Three scoops, a wafer, a cherry and a spoon that will never reach the bottom.' },
    { id: 'fork', name: 'Floating Fork Napolitan', jp: '浮かぶフォークのナポリタン', rarity: 'secret', desc: 'The fork twirls the spaghetti up and stays there, held by nothing at all.', gimmick: { text: 'Twirl' } },
  ],
};
