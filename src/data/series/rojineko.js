// Series 1: Alley Cat Patrol (路地ネコパトロール). The lane's stray cats on the street furniture they own: real cats made
// small (lowpix figures: art/lowpix/figures/_src/rojineko.py, GLBs in public/models/lowpix/figures/rojineko/).
export default {
  id: 'rojineko',
  order: 1,
  name: 'Alley Cat Patrol',
  jp: '路地ネコパトロール',
  tagline: 'The real bosses of the back lane',
  taglineJp: 'この路地のボスはだれ？',
  price: 200,
  themes: ['city', 'retro', 'cute'],
  card: { bg: '#f2e6cf', accent: '#c8553a', text: '#2e2420', accent2: '#5a6a7a', pattern: 'dots' },
  capsule: { colors: [0xd8783a, 0x5a6a7a, 0xf2e6cf, 0x3a3236, 0xb8443a] },
  items: [
    { id: 'postbox', name: 'Post Box Sentry', jp: 'ポストの番ネコ', rarity: 'common', desc: 'A blue-grey shorthair on the red post box, checking every letter that goes in.', gimmick: { text: 'Look round' } },
    { id: 'wall', name: 'Wall Walker', jp: 'ブロック塀のおさんぽ', rarity: 'common', desc: 'Tail up, all the way along the block wall, like it owns it. It does.', gimmick: { text: 'Walk on' } },
    { id: 'box', name: 'Mikan Box Kuro', jp: 'みかん箱のクロ', rarity: 'common', desc: 'A black cat who found the one good box on the lane. Do not ask for it back.', gimmick: { text: 'Hop' } },
    { id: 'laundry', name: 'Zabuton Nap', jp: '座布団でおひるね', rarity: 'uncommon', desc: "Grandma's floor cushion, still warm from the sun. Not hers any more." },
    { id: 'kittens', name: 'Tin Bucket Kittens', jp: 'バケツの子ネコ', rarity: 'uncommon', desc: 'Two kittens and one bucket. The bucket is losing.', gimmick: { text: 'Hop out' } },
    { id: 'boss', name: 'The Boss of Lane 3', jp: '三丁目のボス', rarity: 'rare', desc: 'Scarred, unhurried and very large. Sits on the oil drum; owns the lane.', gimmick: { text: 'Stare them down' } },
    { id: 'stalker', name: 'Sparrow Stalker', jp: 'スズメねらい', rarity: 'ultra', desc: 'Low, still, tail twitching. The sparrow has noticed. The sparrow does not care.', gimmick: { text: 'Startle the sparrow' } },
    { id: 'moon', name: 'Moon-White Stray', jp: '月夜の白ネコ', rarity: 'secret', desc: 'On the roof under a crescent moon, white as rice paper. Nobody has ever seen it come down.', gimmick: { text: 'Look up' } },
  ],
};
