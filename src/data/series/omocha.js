// Series — Dagashi-ya Omocha (駄菓子屋おもちゃ)
// Old-school toys you can actually play with (src/game/toys.js): `toy` names the behaviour, `parts` builds the
// pieces that move on their own, `screen` marks the LCD for the pocket game.
import { C, shade } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Kendama ken (handle, big + small cups, spike) standing on the big cup. */
function ken(v) {
  const wood = C.woodLight, red = C.lacquer;
  // the cross piece (sarado) with the big cup on the left and the small cup on the right
  v.cylinder(0, 10, 0, 2, 2, wood, 'y');
  v.cylinder(-6, 12, 0, 2.5, 12, wood, 'x');
  v.tube(-7, 11, 0, 3.5, 2.4, 2, wood, 'x'); // big cup rim (opens to -x)
  v.cylinder(-7, 12, 0, 3.5, 1, wood, 'x');
  v.tube(5, 11, 0, 2.6, 1.6, 2, wood, 'x'); // small cup (opens to +x)
  v.cylinder(6, 12, 0, 2.6, 1, wood, 'x');
  // the handle (ken) down to the base cup, spike on top
  v.cylinder(0, 0, 0, 1.5, 22, wood, 'y');
  v.cylinder(0, 0, 0, 3, 2, wood, 'y'); // base cup
  v.tube(0, 2, 0, 3, 2, 1, wood, 'y');
  v.cone(0, 22, 0, 1.5, 3, wood, 'y'); // spike
  v.paint(() => { v.box(-2, 5, -2, 2, 5, 2, red); v.box(-2, 7, -2, 2, 7, 2, red); });
  // the string
  v.line(1, 15, 1, 4, 20, 2, 0xf4f0e0, 0);
}
/** Kendama ball (tama) with its hole and the classic stripe. */
function tama(v, x = 0, y = 0, z = 0) {
  v.sphere(x, y, z, 4, gloss(C.lacquer));
  v.paint(() => v.box(x - 5, y - 0.4, z - 5, x + 5, y + 0.4, z + 5, gloss(0xf4ead0)));
  v.set(x, y - 4, z, K);
}

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
  items: [
    {
      id: 'squishy', name: 'Melon-pan Squishy', jp: 'メロンパンスクイーズ', rarity: 'common', toy: 'squishy',
      desc: 'Hold to squeeze. Smells like a bakery. Squeaks like a duck.',
      build(v) {
        const crust = 0xf2c66a, top = 0xf7d98a, line = 0xd9a54a;
        v.ellipsoid(0, 6, 0, 10, 6.5, 9.5, crust);
        v.box(-12, -2, -12, 12, -1, 12, null);
        v.paint(() => v.ellipsoid(0, 9, 0, 10, 4, 9.5, top));
        // the crackle grid of a melon-pan
        v.recolor((x, y, z, c) => (y >= 8 && c === top && (((x + z + 40) % 4 === 0) || ((x - z + 40) % 4 === 0)) ? line : undefined));
        // a sleepy happy face on the front
        v.project(['K.....K', '.......', '..MMM..'], { K, M: C.mouth }, -3, 8);
        v.project(['PP.....PP'], { P: C.blush }, -4, 6);
      },
    },
    {
      id: 'superball', name: 'Super Ball', jp: 'スーパーボール', rarity: 'common', toy: 'ball',
      desc: 'Click to throw. It will find the one gap under the fridge.',
      build(v) {
        const cols = [0xe8453c, 0xf7d046, 0x3f86e8, 0xffffff, 0x58c06c];
        v.shape(-7, 0, -7, 6, 13, 6, (x, y, z) => (x + 0.5) ** 2 + (y - 6.5) ** 2 + (z + 0.5) ** 2 <= 46, (x, y, z) => {
          const a = Math.atan2(z + 0.5, x + 0.5) + (y - 6.5) * 0.35;
          return gloss(cols[Math.floor(((a / (Math.PI * 2)) + 1) * 5) % cols.length]);
        });
      },
    },
    {
      id: 'koma', name: 'Spinning Top', jp: '手回しコマ', rarity: 'common', toy: 'top',
      desc: 'Click to spin it on the floor or the table. It wobbles like it means it.',
      build(v) {
        // tip, wooden body with painted rings, stem on top
        v.set(0, 0, 0, metal(0x9aa0a8));
        for (let y = 1; y <= 8; y++) {
          const r = y <= 5 ? 1 + y * 1.6 : 9 - (y - 5) * 1.2;
          const ring = y === 4 ? C.red : y === 6 ? C.blue : y === 7 ? C.yellow : C.woodLight;
          v.cylinder(0, y, 0, r, 1, gloss(ring), 'y');
        }
        v.cylinder(0, 9, 0, 1.2, 5, gloss(C.wood), 'y');
        v.recolor((x, y, z, c, m) => (y >= 2 && y <= 5 && m === 1 && c === C.woodLight && hash(x, y, z) < 0.3 ? shade(C.woodLight, 0.92) : undefined));
      },
    },
    {
      id: 'yoyo', name: 'Champion Yo-yo', jp: 'チャンピオンヨーヨー', rarity: 'uncommon', toy: 'yoyo',
      desc: 'Click to throw it down. Hold to make it sleep. Walk the dog at your own risk.',
      build(v) {
        // two discs and the axle, a star on the face, the string looped up to a finger ring
        v.cylinder(0, 7, -4, 7, 3, gloss(C.red), 'z');
        v.cylinder(0, 7, 1, 7, 3, gloss(C.red), 'z');
        v.cylinder(0, 7, -1, 2, 2, metal(C.silver), 'z');
        v.project(['..W..', '.WWW.', 'WWWWW', '.W.W.'], { W: gloss(0xfbf8f2) }, -2, 9);
        v.paint(() => v.cylinder(0, 7, 3, 7, 1, gloss(shade(C.red, 0.85)), 'z'));
        v.line(0, 7, -1, 0, 18, -1, 0xf4f0e0, 0);
        v.ring(0, 20, -1, 0xf4f0e0, 'z');
      },
    },
    {
      id: 'robot', name: 'Wind-up Tin Robot', jp: 'ゼンマイブリキロボ', rarity: 'uncommon', toy: 'robot',
      desc: 'Click to wind it up and set it down. It walks until it forgets why.',
      build(v) {
        const tin = metal(0xc8ccd4), red = gloss(C.red), dark = metal(0x5a6068);
        // feet, legs, boxy body with a chest dial, head with antenna
        v.box(-4, 0, -2, -1, 1, 3, red); v.box(1, 0, -2, 4, 1, 3, red);
        v.box(-3, 2, -1, -2, 4, 1, dark); v.box(2, 2, -1, 3, 4, 1, dark);
        v.box(-5, 5, -3, 5, 13, 3, tin);
        v.box(-3, 7, 4, 3, 11, 4, gloss(C.yellow));
        v.project(['.RGR.', 'R...R', '.RGR.'], { R: glow(0xff5040), G: glow(0x60ff80) }, -2, 10, '+z', { raise: true });
        v.box(-6, 8, -1, -6, 12, 1, dark); v.box(6, 8, -1, 6, 12, 1, dark); // arms
        v.box(-7, 6, -1, -7, 8, 1, red); v.box(7, 6, -1, 7, 8, 1, red); // claws
        v.box(-4, 14, -3, 4, 19, 3, tin);
        v.box(-3, 16, 4, 3, 17, 4, glow(0x7fe0ff)); // visor
        v.box(0, 20, 0, 0, 22, 0, dark); v.set(0, 23, 0, glow(0xff5040));
        // the wind-up key on the back
        v.box(0, 10, -4, 0, 10, -5, dark);
        v.box(-2, 9, -6, 2, 11, -6, metal(C.brass));
      },
      parts: {
        key(v) { v.box(-2, -1, 0, 2, 1, 0, metal(C.brass)); v.box(0, 0, 1, 0, 0, 2, metal(0x5a6068)); },
      },
    },
    {
      id: 'kendama', name: 'Lacquer Kendama', jp: 'けん玉', rarity: 'rare', toy: 'kendama',
      desc: 'Click to flip the ball: big cup, small cup... spike? One in a hundred. Probably.',
      build(v) { ken(v); tama(v, 0, 27, 0); },
      parts: { ken, tama: (v) => tama(v, 0, 0, 0) },
    },
    {
      id: 'dartgun', name: 'Foam Dart Blaster', jp: 'スポンジダーツ銃', rarity: 'ultra', toy: 'dartgun',
      desc: 'Click to fire. The darts stick to walls, windows and very surprised neighbours.',
      build(v) {
        const body = gloss(0xff8c2e), blue = gloss(C.blue), dark = gloss(0x2a2a2e), yel = gloss(C.yellow);
        // barrel (pointing +z), chunky body, grip, trigger, priming slide, a dart loaded
        v.box(-2, 9, -2, 2, 13, 12, body);
        v.box(-3, 8, -8, 3, 14, -1, body);
        v.paint(() => { v.box(-3, 12, -8, 3, 12, 12, blue); v.box(-2, 9, 12, 2, 9, 12, dark); });
        v.box(-1, 10, 13, 1, 12, 13, dark); // muzzle
        v.box(-2, 0, -7, 2, 8, -3, blue); // grip
        v.recolor((x, y, z, c, m) => (y < 8 && y % 2 === 0 && c === C.blue && m === 1 ? shade(C.blue, 0.8) : undefined));
        v.box(-1, 5, -1, 1, 7, 1, dark); v.box(-1, 4, 1, 1, 4, 2, dark); // trigger guard
        v.box(-3, 13, -1, 3, 15, 4, yel); // priming slide
        v.box(-1, 15, -6, 1, 16, -3, dark); // rear sight
        // a dart sticking out of the barrel
        v.box(0, 11, 14, 0, 11, 16, gloss(0xff6f2e)); v.box(-1, 10, 17, 1, 12, 17, gloss(0x3f86e8));
      },
      parts: {
        dart(v) {
          v.box(0, 0, -4, 0, 0, 2, gloss(0xff8c2e));
          v.box(-1, -1, -4, 1, 1, -3, gloss(0xff8c2e));
          v.box(-1, -1, 3, 1, 1, 3, gloss(0x3f86e8));
        },
      },
    },
    {
      id: 'lcdgame', name: 'Pocket LCD Game', jp: 'ポケット液晶ゲーム', rarity: 'secret', toy: 'lcd',
      desc: 'Click to play Capsule Dash. The high score is still 9999 from 1983. Nobody knows who.',
      build(v) {
        const shell = gloss(0xd8d4c8), trim = gloss(0x9a2a2a), dark = gloss(0x2a2a2e);
        // landscape handheld, standing on a little kickstand: face +z
        v.box(-12, 2, -2, 11, 18, 1, shell);
        for (const [x, y] of [[-12, 2], [11, 2], [-12, 18], [11, 18]]) v.box(x, y, -2, x, y, 1, null);
        v.box(-12, 17, -2, 11, 18, 1, trim);
        v.paint(() => v.box(-12, 17, 1, 11, 17, 1, gloss(0xd8b04a)));
        // the LCD window (the live screen goes on top of it)
        v.box(-7, 5, 2, 6, 14, 2, dark);
        v.box(-6, 6, 2, 5, 13, 2, 0x9aa88a);
        // buttons: a cross pad on the left, A/B on the right
        v.box(-11, 8, 2, -9, 10, 2, dark); v.box(-10, 7, 2, -10, 11, 2, dark);
        v.set(8, 10, 2, gloss(C.red)); v.set(10, 8, 2, gloss(C.red));
        v.box(8, 10, 3, 8, 10, 3, gloss(C.red));
        // little speaker grille and the stand
        for (let i = 0; i < 3; i++) v.set(8 + i, 4, 2, dark);
        v.box(-9, 0, -4, 8, 1, 0, gloss(0x8a8678));
      },
      screen: { x0: -6, y0: 6, x1: 5, y1: 13, z: 2 },
    },
  ],
};
