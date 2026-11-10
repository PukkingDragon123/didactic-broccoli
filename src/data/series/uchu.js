// Series: Space Neko (うちゅうねこ): cats on a mission to nap in orbit.
// A sculpted series (src/figures/sets/uchu.js).
import * as F from '../../figures/sets/uchu.js';

export default {
  id: 'uchu',
  order: 11,
  name: 'Uchū Neko Station',
  jp: '宇宙ねこステーション',
  tagline: 'Cats on a mission to nap in orbit',
  taglineJp: 'にゃんと宇宙へ！',
  price: 800,
  themes: ['space', 'cute'],
  card: { bg: '#1e2452', accent: '#ffd23f', text: '#f4ecff', accent2: '#8fd3ff', pattern: 'stars' },
  capsule: { colors: [0x2c3f86, 0x8a5bd6, 0xffd23f, 0xbfe3ff, 0xff9fd0] },
  atlas: [2048, 2048],
  items: [
    {
      id: 'astro', name: 'Astro-Neko', jp: 'アストロにゃん', rarity: 'common',
      desc: 'First cat in orbit. Knocked the Moon off its shelf on day one.',
      figure: F.astro, gimmick: { text: 'Wave' },
    },
    {
      id: 'nap', name: 'Planet Nap', jp: 'わくせいおひるね', rarity: 'common',
      desc: 'Found the warmest planet in the galaxy. Will not be moving, thanks.',
      figure: F.nap, gimmick: { text: 'Spin the planet' },
    },
    {
      id: 'rocket', name: 'Neko Rocket No.1', jp: 'ねこロケット1号', rarity: 'common',
      desc: 'Fuelled entirely by bonito flakes. Smells amazing at launch.',
      figure: F.rocket, gimmick: { text: 'Lift off!' },
    },
    {
      id: 'ufo', name: 'Fish Abduction UFO', jp: 'さかなアブダクション', rarity: 'uncommon',
      desc: 'Travelled forty light-years for one mackerel. Worth it.',
      figure: F.ufo, gimmick: { text: 'Spin the saucer' },
    },
    {
      id: 'usagi', name: 'Moon Rabbit Landing', jp: '月うさぎ着陸', rarity: 'uncommon',
      desc: 'One small hop for a rabbit. One giant mochi for rabbitkind.',
      figure: F.usagi, gimmick: { text: 'Wave the flag' },
    },
    {
      id: 'station', name: 'Neko Space Station', jp: 'ねこ宇宙ステーション', rarity: 'rare',
      desc: 'Crew of four. Mission: find the sunniest window. Going great.',
      figure: F.station, gimmick: { text: 'Turn the panels' },
    },
    {
      id: 'saturn', name: 'Saturn Ring Ride', jp: '土星リングライド', rarity: 'ultra',
      desc: 'The rings go round every ten hours. The cats have been on since Tuesday.',
      figure: F.saturn, gimmick: { text: 'Spin the rings' },
    },
    {
      id: 'cosmic', name: 'Cosmic Cat', jp: '宇宙ねこ', rarity: 'secret',
      desc: 'Understood the entire universe in one second. Has made this face ever since.',
      figure: F.cosmic, gimmick: { text: 'Turn the head' },
    },
  ],
};
