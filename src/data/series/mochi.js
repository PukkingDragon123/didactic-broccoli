// Series 1 — Mochi Mochi Animals (もちもちアニマル)
// Squishy, round "mochi" animal keychains. The starter series for the ¥100 Showa machine.
import { C, shade } from '../../voxel/palette.js';
import { gloss, metal } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

/** Soft squashed-sphere mochi body, bottom resting on y=0, centred on x=0,z=0. */
function mochiBody(v, color, rx = 9, ry = 7, rz = 8) {
  v.ellipsoid(0, ry, 0, rx, ry, rz, color);
  v.box(-rx, -1, -rz, rx, -1, rz, null); // flatten anything below the floor
  return v;
}

/** Standard kawaii face projected on the front. eyeY = row of the top eye pixel. */
function face(v, eyeY, { spread = 4, blush = C.blush, mouth = 'cat', eye = K } = {}) {
  const L = { K: eye, W, P: blush, M: K, T: C.tongue };
  const s = spread;
  const pad = (n) => '.'.repeat(Math.max(0, n));
  const eyesTop = `${pad(0)}KW${pad(2 * s - 3)}KW`;
  const eyesBot = `${pad(0)}KK${pad(2 * s - 3)}KK`;
  v.project([eyesTop, eyesBot], L, -s, eyeY);
  const mouths = {
    cat: ['M.M', '.M.'],
    smile: ['M.M', '.MM'],
    open: ['MMM', 'MTM'],
    dot: ['.M.'],
  };
  v.project(mouths[mouth], L, -1, eyeY - 2);
  if (blush) {
    v.project(['PP', 'PP'], L, -s - 2, eyeY - 2);
    v.project(['PP', 'PP'], L, s + 1, eyeY - 2);
  }
  return v;
}

/** Small triangular ear made of stacked slabs. dir = -1 left, +1 right. */
function ear(v, x, y, z, color, inner, { h = 4, w = 4, depth = 2 } = {}) {
  for (let i = 0; i < h; i++) {
    const ww = Math.max(1, Math.round(w * (1 - i / h)));
    v.box(x - Math.floor(ww / 2), y + i, z, x + Math.ceil(ww / 2) - 1, y + i, z - depth + 1, color);
    if (inner && i < h - 1 && ww > 2) v.box(x - Math.floor(ww / 2) + 1, y + i, z + 1, x + Math.ceil(ww / 2) - 2, y + i, z + 1, inner);
  }
}

export default {
  id: 'mochi',
  order: 1,
  name: 'Mochi Mochi Animals',
  jp: 'もちもちアニマル',
  tagline: 'Squishy round animal keychains',
  taglineJp: 'ぷにぷに！まんまるキーチェーン',
  price: 100,
  themes: ['cute', 'nature'],
  card: { bg: '#ffe6ee', accent: '#ff6f91', text: '#6a2c40', pattern: 'dots', accent2: '#ffd23f' },
  capsule: { colors: [0xff9eb5, 0x9ed8ff, 0xfff09e, 0xb5f0b0, 0xffc7a0] },
  items: [
    {
      id: 'shiba', name: 'Mochi Shiba', jp: 'もち柴', rarity: 'common',
      desc: 'A loaf of shiba. Smells faintly of toasted rice.',
      build(v) {
        mochiBody(v, C.shiba);
        v.paint(() => v.ellipsoid(0, 4, 4, 7, 5, 5, C.shibaLight)); // cream muzzle & belly
        ear(v, -5, 12, 1, C.shiba, C.shibaLight);
        ear(v, 5, 12, 1, C.shiba, C.shibaLight);
        face(v, 9, { mouth: 'cat' });
        v.project(['NN'], { N: K }, -1, 8);
        v.torus(0, 6, -8, 2, 1, C.shibaLight, 'z'); // curly tail
        v.keychain(0, 14, 0);
      },
    },
    {
      id: 'mike', name: 'Mochi Mike-neko', jp: 'もち三毛', rarity: 'common',
      desc: 'Calico cat mochi. Three colours, zero thoughts.',
      build(v) {
        mochiBody(v, C.white);
        v.paint(() => {
          v.ellipsoid(-6, 11, 0, 5, 4, 8, C.orange);
          v.ellipsoid(6, 4, -3, 5, 4, 6, C.charcoal);
          v.ellipsoid(3, 13, -4, 4, 3, 4, C.charcoal);
        });
        ear(v, -5, 12, 1, C.orange, C.pink);
        ear(v, 5, 12, 1, C.white, C.pink);
        face(v, 9, { mouth: 'cat' });
        v.project(['N'], { N: C.hotpink }, 0, 8);
        v.project(['WWW', '...', 'WWW'], { W: C.lightgray }, -9, 7, '+z'); // whiskers left
        v.project(['WWW', '...', 'WWW'], { W: C.lightgray }, 7, 7, '+z');
        v.line(0, 4, -8, 0, 9, -11, C.charcoal, 1); // tail
        v.keychain(0, 14, 0);
      },
    },
    {
      id: 'hamu', name: 'Mochi Hamster', jp: 'もちハム', rarity: 'common',
      desc: 'Holding a sunflower seed like it is the last one on Earth.',
      build(v) {
        mochiBody(v, 0xf0b85a, 8, 7, 7);
        v.paint(() => v.ellipsoid(0, 4, 4, 6, 5, 4, C.white));
        v.sphere(-5, 12, 0, 2, C.pink); v.sphere(5, 12, 0, 2, C.pink);
        v.paint(() => { v.sphere(-5, 13, 1, 1, 0xf0b85a); v.sphere(5, 13, 1, 1, 0xf0b85a); });
        face(v, 9, { mouth: 'dot', spread: 3 });
        // seed held in paws
        v.ellipsoid(0, 4, 8, 1.5, 2.5, 1, 0x4a4038);
        v.paint(() => v.box(0, 2, 7, 0, 7, 9, 0xe8e0d0));
        v.sphere(-2, 4, 7, 1, C.pink); v.sphere(2, 4, 7, 1, C.pink);
        v.keychain(0, 14, 0);
      },
    },
    {
      id: 'pen', name: 'Mochi Penguin', jp: 'もちペンギン', rarity: 'uncommon',
      desc: 'Slides on its belly at 0.2 km/h. Very proud of it.',
      build(v) {
        mochiBody(v, C.navy, 8, 8, 7);
        v.paint(() => v.ellipsoid(0, 6, 5, 6, 6, 4, C.white));
        face(v, 11, { mouth: 'dot', spread: 3, blush: C.pink });
        v.paint(() => v.box(-1, 9, 7, 1, 9, 8, C.orange));
        v.box(-1, 9, 8, 1, 9, 8, gloss(C.orange)); // beak
        v.box(0, 8, 8, 0, 8, 8, gloss(C.orange));
        v.ellipsoid(-9, 6, 0, 1, 4, 3, C.navy); v.ellipsoid(9, 6, 0, 1, 4, 3, C.navy); // flippers
        v.box(-4, 0, 4, -2, 0, 7, C.orange); v.box(2, 0, 4, 4, 0, 7, C.orange); // feet
        v.keychain(0, 16, 0);
      },
    },
    {
      id: 'lesser', name: 'Mochi Red Panda', jp: 'もちレッサーパンダ', rarity: 'uncommon',
      desc: 'Stands up to look scary. It does not look scary.',
      build(v) {
        mochiBody(v, C.panda);
        v.paint(() => {
          v.ellipsoid(0, 3, 3, 8, 3, 6, C.darkbrown);
          v.ellipsoid(0, 6, 6, 4, 2, 3, C.white);
        });
        ear(v, -6, 12, 1, C.panda, C.white);
        ear(v, 6, 12, 1, C.panda, C.white);
        v.project(['WW.......WW', 'WW.......WW', '.WW.....WW.'], { W: C.white }, -5, 11);
        face(v, 9, { mouth: 'cat', blush: null });
        v.project(['N'], { N: K }, 0, 8);
        // striped tail curling round the side
        for (let i = 0; i < 6; i++) {
          v.sphere(8 + Math.min(i, 2), 2 + i, -4 - i, 2, i % 2 ? C.darkbrown : C.panda);
        }
        v.keychain(0, 14, 0);
      },
    },
    {
      id: 'tanuki', name: 'Leaf Tanuki', jp: 'はっぱたぬき', rarity: 'rare',
      desc: 'Places a leaf on its head to transform. Transformation pending.',
      build(v) {
        mochiBody(v, C.tanuki, 9, 8, 8);
        v.paint(() => {
          v.ellipsoid(0, 4, 5, 6, 5, 4, 0xe9d2b0); // belly
          v.box(-7, 9, 4, 7, 11, 9, C.tanukiDark); // eye mask band
        });
        v.paint(() => v.ellipsoid(0, 9, 7, 2, 2, 2, 0xe9d2b0));
        ear(v, -5, 14, 0, C.tanukiDark, null, { h: 3, w: 4 });
        ear(v, 5, 14, 0, C.tanukiDark, null, { h: 3, w: 4 });
        face(v, 11, { mouth: 'smile', eye: C.cream });
        v.project(['N'], { N: K }, 0, 9);
        // leaf
        v.layer([
          '...gg...',
          '..gGGg..',
          '.gGGGGg.',
          'gGGGGGGg',
          '.gGGGGg.',
          '..gGGg..',
          '...gg...',
          '...b....',
        ], { g: C.leaf, G: C.lime, b: C.darkbrown }, { x: -4, y: 16, z: 1, plane: 'xz', depth: 1 });
        v.box(-1, 17, 4, -1, 17, 4, C.darkbrown);
        // belly drum lines
        v.project(['.K.K.', 'K...K'], { K: shade(0xe9d2b0, 0.75) }, -2, 3);
        // tail
        v.ellipsoid(0, 4, -9, 3, 3, 2, C.tanukiDark);
      },
    },
    {
      id: 'tsukiusa', name: 'Moon Rabbit Mochi-tsuki', jp: '月うさぎの餅つき', rarity: 'ultra',
      desc: 'On the full moon, the rabbit pounds mochi. Pound, pound, nap.',
      build(v) {
        // mortar (usu)
        v.cylinder(6, 0, 2, 6, 6, C.wood);
        v.cylinder(6, 6, 2, 6, 1, C.woodDark);
        v.paint(() => { for (let y = 1; y < 6; y += 2) v.cylinder(6, y, 2, 6, 1, C.woodLight); });
        v.cylinder(6, 6, 2, 4, 1, null);
        v.ellipsoid(6, 6, 2, 4, 2, 4, C.rice); // mochi in mortar
        // rabbit
        v.ellipsoid(-5, 6, 0, 6, 6, 6, C.white);
        v.box(-11, -1, -6, 1, -1, 6, null);
        v.ellipsoid(-7, 15, -1, 1.5, 5, 1.5, C.white); v.ellipsoid(-3, 15, -1, 1.5, 5, 1.5, C.white);
        v.paint(() => { v.box(-7, 13, 0, -7, 18, 0, C.pink); v.box(-3, 13, 0, -3, 18, 0, C.pink); });
        v.project(['K...K', '.....', 'P.M.P'], { K: C.mouth, M: C.pink, P: C.blush }, -7, 8);
        // mallet (kine) raised mid-swing
        v.line(-1, 6, 4, 4, 14, 4, C.woodLight, 0);
        v.line(-1, 7, 4, 4, 15, 4, C.woodLight, 0);
        v.cylinder(1, 13, 4, 2, 7, C.wood, 'x');
        v.paint(() => v.cylinder(1, 13, 4, 2, 1, C.woodDark, 'x'));
        // little moon disc behind
        v.cylinder(-2, 10, -8, 7, 1, gloss(C.pastelYellow), 'z');
        v.keychain(-2, 17, -8, 2);
      },
    },
    {
      id: 'kagami', name: 'Kagami-Mochi Shiba', jp: '鏡もち柴', rarity: 'secret',
      desc: 'SECRET. A New Year shiba stacked like kagami mochi, with a mikan hat. Extremely auspicious.',
      build(v) {
        // sanbō stand
        v.box(-10, 0, -9, 10, 3, 9, C.woodLight);
        v.box(-8, 0, -7, 8, 2, 7, null);
        v.box(-11, 4, -10, 11, 4, 10, C.wood);
        v.paint(() => { v.box(-3, 1, 9, 3, 2, 9, C.woodDark); });
        // paper (shihōbeni)
        v.box(-9, 5, -9, 9, 5, 9, C.white);
        v.paint(() => { v.box(-9, 5, -9, 9, 5, -8, C.red); v.box(-9, 5, 8, 9, 5, 9, C.red); });
        // bottom mochi shiba
        v.ellipsoid(0, 9, 0, 9, 4, 8, C.rice);
        // top mochi shiba with face & ears
        v.ellipsoid(0, 15, 0, 7, 4, 6, C.shiba);
        v.paint(() => v.ellipsoid(0, 13, 4, 5, 3, 3, C.shibaLight));
        ear(v, -4, 18, 0, C.shiba, C.shibaLight, { h: 3, w: 3 });
        ear(v, 4, 18, 0, C.shiba, C.shibaLight, { h: 3, w: 3 });
        v.project(['KW.....KW', 'KK.....KK', '...M.M...', 'PP..M..PP'], { K: K, W, M: K, P: C.blush }, -4, 16);
        // mikan on top
        v.sphere(0, 21, 0, 3, gloss(0xff9a1f));
        v.paint(() => v.sphere(0, 23, 0, 1, 0xffb34d));
        v.box(0, 24, 0, 0, 25, 0, C.darkbrown);
        v.layer(['GG', '.G'], { G: C.leaf }, { x: 1, y: 25, z: 0 });
        // tiny gold coin charm
        v.cylinder(9, 7, 9, 2, 1, metal(C.gold), 'z');
        v.keychain(0, 26, 0, 2);
      },
    },
  ],
};
