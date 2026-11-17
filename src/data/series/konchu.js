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
    { id: 'kabuto', name: 'Rhinoceros Beetle', jp: 'カブトムシ', rarity: 'common', desc: 'The king of the summer woods, horn up, polished like a new conker.', gimmick: { text: 'Lift the horn' } },
    { id: 'miyama', name: 'Mountain Stag Beetle', jp: 'ミヤマクワガタ', rarity: 'common', desc: 'Golden fuzz on its back and jaws like antlers. Only found high up, early in the morning.', gimmick: { text: 'Look round' } },
    { id: 'tonbo', name: 'Giant Dragonfly', jp: 'オニヤンマ', rarity: 'uncommon', desc: 'Hovering over the rice paddy, four glass wings and eyes that see everything.', gimmick: { text: 'Flit' } },
    { id: 'kamakiri', name: 'Praying Mantis', jp: 'オオカマキリ', rarity: 'uncommon', desc: 'Arms folded, head turning to follow you. It is not praying.', gimmick: { text: 'Turn its head' } },
    { id: 'larva', name: 'Beetle Grub', jp: 'カブトムシの幼虫', rarity: 'rare', desc: 'Dug up from the leaf mould, fat and curled. Next summer it will have a horn.', gimmick: { text: 'Wriggle' } },
    { id: 'ageha', name: 'Swallowtail Butterfly', jp: 'アゲハチョウ', rarity: 'ultra', desc: 'Tails on its wings and a dusting of blue, gone the moment you lift the net.', gimmick: { text: 'Flutter' } },
    { id: 'golden', name: 'Sakishima Stag Beetle', jp: 'サキシマヒラタクワガタ', rarity: 'secret', desc: 'From the far southern islands: the widest jaws of any stag beetle in Japan. Collectors wait years.', gimmick: { text: 'Turn it to the light' } },
  ],
};
