// Series 3: Fake Food Window (サンプル食堂). The plastic food samples of a Showa restaurant window, as real-food models
// made small on lacquer risers with their price cards (art/lowpix/figures/_src/sampuru.py).
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
    { id: 'ramen', name: 'Chopstick-Lift Ramen', jp: '箸上げラーメン', rarity: 'common', desc: 'The noodles hang in the air forever. That is the whole trick, and it never gets old.' },
    { id: 'katsu', name: 'Ketchup Omurice', jp: 'オムライス', rarity: 'common', desc: "A glossy omelette over ketchup rice, a red zigzag on top, a sprig of parsley. The window's star." },
    { id: 'udon', name: 'Kitsune Udon', jp: 'きつねうどん', rarity: 'common', desc: 'Sweet fried tofu on a bowl of thick noodles, for the fox in you.' },
    { id: 'ebifry', name: 'Ebi-fry Plate', jp: 'エビフライ定食', rarity: 'uncommon', desc: 'Two crunchy prawns, curly tails up, a wedge of lemon and a mound of cabbage.' },
    { id: 'soda', name: 'Melon Cream Soda', jp: 'メロンクリームソーダ', rarity: 'uncommon', desc: 'Fizz you cannot drink, a scoop that never melts, a cherry on a stalk.', gimmick: { text: 'Wobble the glass' } },
    { id: 'pudding', name: 'Purin a la Mode', jp: 'プリン・ア・ラ・モード', rarity: 'rare', desc: 'A wobbling custard pudding with cream and fruit, on a footed glass boat.', gimmick: { text: 'Wobble' } },
    { id: 'sundae', name: 'Tower Parfait', jp: 'ジャンボパフェ', rarity: 'ultra', desc: 'Seven layers, three scoops, a spoon that will never reach the bottom.' },
    { id: 'fork', name: 'Floating Fork Napolitan', jp: '浮かぶフォークのナポリタン', rarity: 'secret', desc: 'The fork twirls the spaghetti up and stays there, held by nothing at all.', gimmick: { text: 'Twirl' } },
  ],
};
