// Series: Dagashi-ya Omocha (駄菓子屋おもちゃ): old-school toys you can actually play with (src/game/toys.js).
// A sculpted series (src/figures/sets/omocha.js): `toy` names the behaviour; the parts the play moves are the figures'
// joints, and `screen` marks the LCD window (figure millimetres) for the pocket game.
import * as F from '../../figures/sets/omocha.js';

export default {
  id: 'omocha',
  order: 5,
  name: 'Dagashi-ya Omocha',
  jp: '駄菓子屋おもちゃ',
  tagline: 'Old-school toys you can really play with',
  taglineJp: 'あそべる！なつかしおもちゃ',
  price: 300,
  themes: ['retro', 'weird'],
  card: { bg: '#fff1d6', accent: '#e8453c', text: '#3a2410', accent2: '#3f86e8', pattern: 'checker' },
  capsule: { colors: [0xe8453c, 0x3f86e8, 0xf7d046, 0x58c06c], style: 'tab' },
  atlas: [2048, 2048],
  items: [
    {
      id: 'squishy', name: 'Melon-pan Squishy', jp: 'メロンパンスクイーズ', rarity: 'common', toy: 'squishy',
      desc: 'Hold to squeeze. Smells like a bakery. Squeaks like a duck.',
      figure: F.squishy,
    },
    {
      id: 'superball', name: 'Super Ball', jp: 'スーパーボール', rarity: 'common', toy: 'ball',
      desc: 'Click to throw. It will find the one gap under the fridge.',
      figure: F.superball,
    },
    {
      id: 'koma', name: 'Spinning Top', jp: '手回しコマ', rarity: 'common', toy: 'top',
      desc: 'Click to spin it on the floor or the table. It wobbles like it means it.',
      figure: F.koma,
    },
    {
      id: 'yoyo', name: 'Champion Yo-yo', jp: 'チャンピオンヨーヨー', rarity: 'uncommon', toy: 'yoyo',
      desc: 'Click to throw it down. Hold to make it sleep. Walk the dog at your own risk.',
      figure: F.yoyo, points: { centre: F.YOYO.centre },
    },
    {
      id: 'robot', name: 'Wind-up Tin Robot', jp: 'ゼンマイブリキロボ', rarity: 'uncommon', toy: 'robot',
      desc: 'Click to wind it up and set it down. It walks until it forgets why.',
      figure: F.robot,
    },
    {
      id: 'kendama', name: 'Lacquer Kendama', jp: 'けん玉', rarity: 'rare', toy: 'kendama',
      desc: 'Click to flip the ball: big cup, small cup... spike? One in a hundred. Probably.',
      figure: F.kendama, points: F.KENDAMA,
    },
    {
      id: 'dartgun', name: 'Foam Dart Blaster', jp: 'スポンジダーツ銃', rarity: 'ultra', toy: 'dartgun',
      desc: 'Click to fire. The darts stick to walls, windows and very surprised neighbours.',
      figure: F.dartgun, points: F.BLASTER,
    },
    {
      id: 'lcdgame', name: 'Pocket LCD Game', jp: 'ポケット液晶ゲーム', rarity: 'secret', toy: 'lcd',
      desc: 'Click to play Capsule Dash. The high score is still 9999 from 1983. Nobody knows who.',
      figure: F.lcdgame, screen: { mm: true, ...F.LCD },
    },
  ],
};
