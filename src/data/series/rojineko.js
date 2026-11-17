// Series 1: Alley Cat Patrol (路地ネコパトロール). The lane's stray cats on the street furniture they own: real cats made
// small, standing on their own (lowpix figures: art/lowpix/figures/_src/rojineko.py, GLBs in public/models/lowpix/figures/rojineko/).
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
    { id: 'postbox', name: 'Post Box Sentry', jp: 'ポストの番ネコ', rarity: 'common', desc: 'Curled up on top of the red post box, guarding every letter in it with its whole body.', gimmick: { text: 'Look round' } },
    { id: 'wall', name: 'Wall Walker', jp: 'ブロック塀のおさんぽ', rarity: 'common', desc: 'A calico tail-up all the way along the block wall, like it owns it. It does.', gimmick: { text: 'Walk on' } },
    { id: 'box', name: 'Mikan Box Lodger', jp: 'みかん箱の居候', rarity: 'common', desc: "Asleep on somebody's blue blanket in the one good box on the lane. Do not ask for either back.", gimmick: { text: 'Hop' } },
    { id: 'laundry', name: 'Zabuton Nap', jp: '座布団でおひるね', rarity: 'uncommon', desc: "Grandma's floor cushion, still warm from the sun. Not hers any more." },
    { id: 'kittens', name: 'Long-Haired Loafer', jp: 'ながーいペルシャ', rarity: 'uncommon', desc: 'A long-haired ginger stretched flat on the cool concrete, refusing to move for anyone.', gimmick: { text: 'Stretch' } },
    { id: 'boss', name: 'The Boss of Lane 3', jp: '三丁目のボス', rarity: 'rare', desc: 'Unhurried and very large. Stands on the oil drum; owns the lane.', gimmick: { text: 'Stare them down' } },
    { id: 'stalker', name: 'Sunbeam Sprawl', jp: 'ひなたでごろり', rarity: 'ultra', desc: 'Belly up on the rug in the one patch of sun, and nothing on earth will move it.', gimmick: { text: 'Stretch' } },
    { id: 'moon', name: 'Moonlit Sleeper', jp: '月夜の屋根ネコ', rarity: 'secret', desc: 'Stretched out on the warm roof tiles under a crescent moon. Nobody has ever seen it come down.', gimmick: { text: 'Look round' } },
  ],
};
