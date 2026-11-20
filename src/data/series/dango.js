// Kushi Dango Dōbutsu (くしだんごどうぶつ, "Dango Skewer Pals"): three balls of dango on a bamboo skewer, and each
// ball is one third of an animal: the top ball the head, the middle the body and arms, the bottom the feet and tail.
// Every pal is its own kind of dango (hanami, mitarashi, mugwort, nori-wrapped, kinako), standing in its own little
// wooden skewer block. An original capsule series modelled in Blender (art/blender/toys/dango, concept in
// art/blender/toys/concepts_F.md). Press one: the balls spin round the skewer one after another, like a slot
// machine, and the head hops up off the top of the skewer and back.
// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).
const SPIN = (text) => ({ text, sfx: [[0.2, 'toyRatchet'], [0.6, 'toyRatchet'], [1.0, 'toyRatchet'], [1.5, 'boing'], [1.95, 'toyClick']] });
export default {
  id: 'dango',
  order: 65,
  name: 'Dango Skewer Pals',
  jp: 'くしだんごどうぶつ',
  tagline: 'Three balls, one animal. Spin them round!',
  taglineJp: 'みっつでいっぴき。',
  price: 300,
  themes: ['retro', 'cute'],
  card: { bg: '#f6e6ea', accent: '#3f8a3a', text: '#2a1c1e', accent2: '#e07a8e', pattern: 'dots', kind: 'くしだんごどうぶつ' },
  capsule: { colors: [0xe07a8e, 0xf6f0e4, 0x6aa84a, 0x8a5a2a] },
  items: [
    {
      id: 'hanami', name: 'Hanami Piglet', jp: 'はなみブタ', rarity: 'common',
      desc: 'Cherry-blossom dango in its three spring colours: a pink piglet head with a snout and floppy ears, a white body with two little trotters, a green bottom with a curly tail, on a bamboo skewer in a wooden block. Press: the balls spin round, and up hops the head.',
      gimmick: SPIN('Spin'),
    },
    {
      id: 'mitarashi', name: 'Mitarashi Tanuki', jp: 'みたらしタヌキ', rarity: 'common',
      desc: 'Three grilled mitarashi dango glazed in sweet soy syrup, dripping, scorched at the edges: a tanuki in its dark mask on top, a round drum belly in the middle, its fat striped tail at the bottom, a leaf on its head. Press: spin, spin, spin.',
      gimmick: SPIN('Spin'),
    },
    {
      id: 'kusa', name: 'Mugwort Frog', jp: 'よもぎガエル', rarity: 'uncommon',
      desc: 'Deep green mugwort dango: a frog with its eyes up on top of the head ball and a dollop of sweet red bean paste sat on it like a hat, webbed hands on the middle ball and folded frog legs on the bottom one. Press: spin, and a big frog hop.',
      gimmick: SPIN('Hop'),
    },
    {
      id: 'isobe', name: 'Nori-Wrapped Penguin', jp: 'いそべペンギン', rarity: 'uncommon',
      desc: 'Isobe-maki dango, each white rice ball wrapped in a strip of nori, and the nori is the penguin\'s black coat: a beak and a white face on top, flippers on the middle ball, orange feet on the bottom. Press: the balls spin round and the head pops up.',
      gimmick: SPIN('Spin'),
    },
    {
      id: 'kinako', name: 'Kinako Bear Cub', jp: 'きなこグマ', rarity: 'rare',
      desc: 'Soft dango rolled in roasted soybean flour, so the bear cub is dusted all over, with a drizzle of dark brown-sugar syrup running down the top ball like honey: round ears, a pale muzzle, paws hugging its tummy. Press: spin and hop.',
      gimmick: SPIN('Spin'),
    },
    {
      id: 'tsukimi', name: 'Moon-Viewing Rabbit', jp: 'つきみウサギ', rarity: 'secret',
      desc: 'The secret: no skewer at all. A stack of white tsukimi dango on a little wooden offering stand, the top one a rabbit with long ears, the next row its paws holding up a sprig of pampas grass, the moon rabbit\'s own offering. Press: the head ball hops and spins.',
      gimmick: { text: 'Hop', sfx: [[0.2, 'boing'], [0.6, 'toyRatchet'], [1.2, 'boing'], [1.8, 'toyClick']] },
    },
  ],
};
