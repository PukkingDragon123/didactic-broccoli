// Street-Corner Mimics (まちかど擬態図鑑): animals passing themselves off as the furniture of a back lane.
// A sculpted series (src/figures): `figure` is a Sculpt program instead of a voxel `build`. 全5種 + シークレット.
import * as F from '../../figures/sets/machikado.js';

export default {
  id: 'machikado',
  order: 6,
  name: 'Street-Corner Mimics',
  jp: 'まちかど擬態図鑑',
  romaji: 'MACHIKADO GITAI ZUKAN',
  tagline: 'Animals passing as street furniture',
  taglineJp: 'だれにも気づかれていない（つもり）',
  price: 300,
  themes: ['city', 'weird', 'cute'],
  card: { bg: '#f3ead2', accent: '#e8553a', text: '#2e2a32', accent2: '#f2c230', pattern: 'stripes' },
  capsule: { colors: [0xea5b3c, 0xf2c230, 0x9fa5ae, 0xf0b142, 0xf3efe4] },
  flyer: {
    maker: 'mogura', scene: 'lane', hero: 'seal', side: ['cone', 'mirror'],
    catch: 'まちのどこかに、いる。', sub: 'よく見ると動物でした', gimmick: 'ひょっこりギミックつき！',
  },
  items: [
    {
      id: 'cone', name: 'Cone Penguin', jp: 'コーンペンギン', rarity: 'common',
      desc: 'Has stood in the road for nine hours. Nobody has asked why.',
      figure: F.cone, gimmick: { text: 'Flap the flippers' },
    },
    {
      id: 'post', name: 'Post Owl', jp: 'ポストふくろう', rarity: 'common',
      desc: 'Accepts letters day and night. Has never delivered one.',
      figure: F.post, gimmick: { text: 'Post the letter' },
    },
    {
      id: 'pole', name: 'Pole Koala', jp: '電柱コアラ', rarity: 'uncommon',
      desc: 'Mistook 6,600 volts for eucalyptus. Too comfortable to check.',
      figure: F.pole,
    },
    {
      id: 'mirror', name: 'Mirror Giraffe', jp: 'カーブミラーきりん', rarity: 'rare',
      desc: 'Shows you what is coming round the corner. Offers no opinion on it.',
      figure: F.mirror, gimmick: { text: 'Look both ways' },
    },
    {
      id: 'seal', name: 'Manhole Seal', jp: 'マンホールあざらし', rarity: 'ultra',
      desc: 'Comes up for air every forty minutes. Wears the lid as a hat.',
      figure: F.seal, gimmick: { text: 'Peek out' },
    },
    {
      id: 'jizo', name: 'Jizo Capybara', jp: 'おじぞうカピバラ', rarity: 'secret',
      desc: 'Has not moved since 1964. One eye is not entirely shut.',
      figure: F.jizo, gimmick: { text: 'Check if it is awake' },
    },
  ],
};
