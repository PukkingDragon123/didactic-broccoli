// Series 7: Summer Bug Collection (夏休み昆虫採集). The insects of a Japanese summer holiday on their bits of the woods,
// each with the collector's label (art/lowpix/figures/_src/konchu.py; several are CC0 specimen scans).
export default {
  id: 'konchu',
  order: 7,
  name: 'Summer Bug Collection',
  jp: '夏休み昆虫採集',
  tagline: 'Catch them all before September',
  taglineJp: '夏休みの昆虫採集！',
  price: 200,
  themes: ['retro', 'japan', 'weird'],
  card: { bg: '#e8f0d0', accent: '#3a6a2a', text: '#1e2a14', accent2: '#c8782a', pattern: 'stripes' },
  capsule: { colors: [0x3a6a2a, 0xc8782a, 0xe8f0d0, 0x5a3a24], style: 'clear' },
  items: [
    { id: 'kabuto', name: 'Rhinoceros Beetle', jp: 'カブトムシ', rarity: 'common', desc: 'The king of the summer woods, horn up, on a sawtooth-oak log sticky with sap.', gimmick: { text: 'Lift the horn' } },
    { id: 'miyama', name: 'Mountain Stag Beetle', jp: 'ミヤマクワガタ', rarity: 'common', desc: 'Antler jaws and a gold-dusted head. Only found high up the cool valley.', gimmick: { text: 'Look round' } },
    { id: 'semi', name: 'Brown Cicada', jp: 'アブラゼミ', rarity: 'common', desc: 'Meeeen-meeeen. Clinging to the bark, singing the whole of August.', gimmick: { text: 'Buzz' } },
    { id: 'tonbo', name: 'Giant Dragonfly', jp: 'オニヤンマ', rarity: 'uncommon', desc: 'Perched on the tip of a reed over the paddy, wings flat, eyes everywhere.', gimmick: { text: 'Flit' } },
    { id: 'kamakiri', name: 'Praying Mantis', jp: 'オオカマキリ', rarity: 'uncommon', desc: 'Arms folded, head tilted. It has already decided about you.', gimmick: { text: 'Turn its head' } },
    { id: 'larva', name: 'Beetle Grub', jp: 'カブトムシの幼虫', rarity: 'rare', desc: 'Fat, curled and glossy in the leaf mould. Next summer it will be a king.', gimmick: { text: 'Wriggle' } },
    { id: 'ageha', name: 'Swallowtail Butterfly', jp: 'アゲハチョウ', rarity: 'ultra', desc: 'Wings open on a thistle head for one second. That was the second.', gimmick: { text: 'Flutter' } },
    { id: 'golden', name: 'Golden Stag Beetle', jp: '黄金のクワガタ', rarity: 'secret', desc: 'A legend of the summer camp: a stag beetle that shines like a temple roof.', gimmick: { text: 'Turn it to the light' } },
  ],
};
