// Series 8: Walkies! (いぬのおさんぽ). The neighbourhood's dogs on their walk, real dogs made small on bits of the
// riverside path (art/lowpix/figures/_src/inusanpo.py).
export default {
  id: 'inusanpo',
  order: 8,
  name: 'Walkies!',
  jp: 'いぬのおさんぽ',
  tagline: 'Every dog on the riverbank, at your feet',
  taglineJp: 'いっしょにおさんぽ行こう！',
  price: 200,
  themes: ['city', 'cute', 'home'],
  card: { bg: '#f4ead8', accent: '#d8783a', text: '#2a1e14', accent2: '#4a7a3a', pattern: 'dots' },
  capsule: { colors: [0xd8783a, 0x4a7a3a, 0xf4ead8, 0x8a5a3a] },
  items: [
    { id: 'shiba', name: 'Shiba on a Walk', jp: 'おさんぽ柴犬', rarity: 'common', desc: 'Curled tail, fox face, absolute refusal to go home yet.', gimmick: { text: 'Look back' } },
    { id: 'sitshiba', name: 'Shiba Says No', jp: '動かない柴犬', rarity: 'common', desc: 'Sat down mid-walk. Will not be moved. Has never been moved.', gimmick: { text: 'Tug the leash' } },
    { id: 'dachs', name: 'Long Dachshund', jp: 'ながいダックス', rarity: 'common', desc: 'Mostly dog, length-wise. Takes the corner in two instalments.', gimmick: { text: 'Walk on' } },
    { id: 'corgi', name: 'Corgi Trot', jp: 'コーギーのお散歩', rarity: 'uncommon', desc: 'Short legs, big ears, the happiest bottom on the riverbank.', gimmick: { text: 'Trot' } },
    { id: 'pug', name: 'Pug on the Step', jp: '石段のパグ', rarity: 'uncommon', desc: 'Snorts at pigeons. Takes a rest every eleven steps, exactly.', gimmick: { text: 'Look round' } },
    { id: 'terrier', name: 'Terrier at the Post', jp: '電柱のテリア', rarity: 'rare', desc: 'Read every message on the telegraph pole. Replied to all of them.', gimmick: { text: 'Sniff' } },
    { id: 'hachi', name: 'The Loyal Akita', jp: '忠犬の銅像', rarity: 'ultra', desc: 'The bronze dog by the station, still waiting. Pat its nose for luck.' },
    { id: 'netsuke', name: 'Golden Netsuke Puppy', jp: '黄金の根付', rarity: 'secret', desc: "A tiny carved puppy from a merchant's sash, covered in gold leaf.", gimmick: { text: 'Turn it' } },
  ],
};
