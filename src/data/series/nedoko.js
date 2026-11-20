// Sushi Nedoko (すしねどこ, "Sushi Bedtime"): every piece of sushi is somebody's bed. The rice is the futon, the
// topping is the duvet, and each little animal has picked the sushi that suits it, on a conveyor-belt plate whose
// colour is its rarity, the way a kaiten-zushi plate's colour is its price. An original capsule series modelled in
// Blender (art/blender/toys/nedoko, concept in art/blender/toys/concepts_F.md).
// Press one (left click in hand, right click on a shelf): the duvet flips back, it sits up, stretches and yawns,
// then flops back to sleep under its topping.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
const WAKE = (text) => ({ text, sfx: [[0.15, 'toyFold', { n: 1 }], [0.55, 'whoosh'], [1.0, 'toyTap', { v: 0.4 }], [1.25, 'toyTap', { v: 0.3 }], [1.75, 'toyFold', { n: 1 }], [2.05, 'toyClick']] });
export default {
  id: 'nedoko',
  order: 64,
  name: 'Sushi Bedtime',
  jp: 'すしねどこ',
  tagline: 'The rice is the futon. The topping is the duvet.',
  taglineJp: 'おすしで、おやすみ。',
  price: 300,
  themes: ['retro', 'cute'],
  card: { bg: '#f4ecdc', accent: '#c8302a', text: '#1c1a1e', accent2: '#2a5a9a', pattern: 'dots', kind: 'すしねどこフィギュア' },
  capsule: { colors: [0xc8302a, 0xf4ecdc, 0x2a5a9a, 0xf0b040] },
  items: [
    {
      id: 'maguro', name: 'Tuna-Duvet Kitten', jp: 'マグロねこ', rarity: 'common',
      desc: 'A tabby kitten fast asleep on a rice futon under a thick red tuna duvet, only its head, ears and two white paws out at the top, on a white conveyor plate with a blue rim. Press: the duvet flips back, it sits up and stretches.',
      gimmick: WAKE('Stretch'),
    },
    {
      id: 'tamago', name: 'Omelette-Quilt Hamster', jp: 'たまごハムスター', rarity: 'common',
      desc: 'A golden hamster with stuffed cheeks under a plump tamago-yaki quilt, its layers rolled like a real omelette, the whole bed tied up with a band of nori like a futon strap. A green plate. Press: the quilt lifts and out it pops, cheeks first.',
      gimmick: WAKE('Yawn'),
    },
    {
      id: 'sake', name: 'Salmon-Duvet Seal Pup', jp: 'サーモンアザラシ', rarity: 'uncommon',
      desc: 'A fluffy white harp seal pup, flippers tucked in, under a striped salmon duvet with its white fat lines. A red plate. Press: back goes the salmon, up it comes on its flippers, and a big seal yawn.',
      gimmick: WAKE('Yawn'),
    },
    {
      id: 'inari', name: 'Tofu-Pouch Fox', jp: 'いなりキツネ', rarity: 'uncommon',
      desc: 'An inari fox, of course, zipped into an inari-zushi like a sleeping bag: the sweet fried-tofu pouch with its pebbly skin, the fox\'s head out of the top and its white-tipped tail out of the side. A yellow plate. Press: the flap opens and the fox sits up.',
      gimmick: WAKE('Stretch'),
    },
    {
      id: 'ikura', name: 'Roe-Bath Sea Otter', jp: 'イクラカワウソ', rarity: 'rare',
      desc: 'A sea otter floating on its back in a gunkan-maki full of glossy salmon roe, the nori wall for its bath, holding one big roe on its tummy the way an otter holds its stone. A black plate. Press: it sits up and juggles the roe.',
      gimmick: { text: 'Juggle', sfx: [[0.3, 'whoosh'], [0.7, 'toyTap', { v: 0.5 }], [1.1, 'toyTap', { v: 0.5 }], [1.5, 'toyTap', { v: 0.5 }], [2.0, 'pop']] },
    },
    {
      id: 'uni', name: 'Gold-Leaf Urchin Hedgehog', jp: 'うにハリネズミ', rarity: 'secret',
      desc: 'The secret: the most expensive plate on the belt. A hedgehog curled in a gunkan cup, its spines the golden lobes of sea urchin, a flake of gold leaf on its nose, on a gold plate. Press: it uncurls, sits up and sniffs. Then curls up again.',
      gimmick: { text: 'Uncurl', sfx: [[0.2, 'toyFold', { n: 2 }], [0.7, 'toyTap', { v: 0.4 }], [0.9, 'toyTap', { v: 0.4 }], [1.1, 'toyTap', { v: 0.4 }], [1.9, 'toyFold', { n: 2 }]] },
    },
  ],
};
