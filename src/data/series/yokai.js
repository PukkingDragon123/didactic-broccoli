// Series 7 — Yurui Yōkai (ゆるい妖怪)
// Cute, slightly spooky folklore spirits. Mostly harmless. Mostly.
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

/** Deterministic 0..1 hash of integer coordinates (for speckles / texture). */
function hash(x, y, z = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Recolour only voxels that pass test(x,y,z,colour,mat). */
function tint(v, test, c) {
  v.recolor((x, y, z, col, mat) => (test(x, y, z, col, mat) ? (typeof c === 'function' ? c(x, y, z, col) : c) : undefined));
}

/** Two-eyed kawaii face projected onto the front. eyeY = top eye row. */
function face(v, cx, eyeY, { spread = 3, eye = K, blush = C.blush, mouth = 'cat', tall = false } = {}) {
  const L = { K: eye, W, P: blush, M: K, T: C.tongue };
  const gap = '.'.repeat(Math.max(0, 2 * spread - 3));
  const rows = tall ? [`KW${gap}KW`, `KK${gap}KK`, `KK${gap}KK`] : [`KW${gap}KW`, `KK${gap}KK`];
  v.project(rows, L, cx - spread, eyeY);
  const my = eyeY - rows.length;
  const mouths = { cat: ['M.M', '.M.'], smile: ['M.M', '.MM'], open: ['MMM', 'MTM'], dot: ['.M.'], o: ['.M.', 'M.M', '.M.'] };
  v.project(mouths[mouth], L, cx - 1, my);
  if (blush) {
    v.project(['PP'], L, cx - spread - 2, my);
    v.project(['PP'], L, cx + spread + 1, my);
  }
}

/** Little teardrop flame (glow) sitting on (x,y,z), pointing up. */
function flame(v, x, y, z, outer, core, size = 2) {
  v.sphere(x, y + size, z, size, glow(outer));
  v.cone(x, y + size + 1, z, size - 0.3, size + 3, glow(outer));
  v.sphere(x, y + size, z, Math.max(0.6, size - 1.2), glow(core));
  v.line(x, y + size, z + size - 1, x, y + size + 2, z + size - 1, glow(core));
}

export default {
  id: 'yokai',
  order: 7,
  name: 'Yurui Yōkai',
  jp: 'ゆるい妖怪',
  tagline: 'Cute, slightly spooky folklore spirits',
  taglineJp: 'こわくない…たぶん。',
  price: 400,
  themes: ['spooky', 'shrine', 'cute'],
  card: { bg: '#2c2447', accent: '#8fe3ff', text: '#f6efe0', accent2: '#ff9a3c', pattern: 'stars' },
  capsule: { colors: [0x6a4fb3, 0x8fe3ff, 0xff9a3c, 0xf5efe0, 0x5fbf6a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'chochin', name: 'Chōchin-obake', jp: '提灯お化け', rarity: 'common',
      desc: 'Turned 100 years old and became a yōkai. Still only gives off about 40 watts.',
      build(v) {
        const paper = 0xf7efdc, rib = 0xdccba6, red = C.vermilion, cap = C.lacquerBlack;
        const inner = glow(0xe89a2c);
        const prof = (y) => 3.7 + 3.5 * Math.sin(Math.PI * (y - 3) / 16) + (y % 3 === 0 ? 0.55 : 0);
        v.shape(-8, 3, -8, 8, 19, 8, (x, y, z) => x * x + z * z <= (prof(y) + 0.2) ** 2, (x, y) => (y % 3 === 0 ? rib : paper));
        v.paint(() => { v.box(-8, 4, -8, 8, 4, 8, red); v.box(-8, 18, -8, 8, 18, 8, red); });
        // glowing insides
        v.shape(-8, 5, -8, 8, 17, 8, (x, y, z) => x * x + z * z <= (prof(y) - 1.5) ** 2, inner);
        // torn grin: carve the paper away to reveal the light inside
        const grin = [
          'X.........X',
          'XX.XXXXX.XX',
          '.XXXXXXXXX.',
          '...XXXXX...',
        ];
        grin.forEach((row, r) => [...row].forEach((ch, i) => {
          if (ch !== 'X') return;
          const x = i - 5, y = 10 - r;
          for (let z = 8; z >= 0; z--) {
            const cur = v.get(x, y, z);
            if (cur === null) continue;
            if (cur === inner) break;
            v.remove(x, y, z);
          }
        }));
        // tongue lolling out
        const T = gloss(C.tongue), Td = gloss(shade(C.tongue, 0.82));
        v.box(-1, 7, 4, 1, 7, 7, T);
        v.box(-1, 3, 7, 1, 6, 7, T);
        v.set(0, 2, 7, T);
        v.box(0, 4, 7, 0, 6, 7, Td);
        // one big eye
        v.project([
          '.WWWWW.',
          'WWWKKWW',
          'WWKKKKW',
          'WWKKKKW',
          '.WWWWW.',
        ], { W, K }, -3, 16);
        v.project(['PP.......PP'], { P: C.blush }, -5, 11);
        // mended patch on the side
        tint(v, (x, y, z, c, m) => m !== 3 && x >= 4 && y >= 12 && y <= 15 && z >= 1 && z <= 4, 0xdfe9f2);
        tint(v, (x, y, z, c, m) => m !== 3 && ((x >= 4 && z === 1) || (x >= 4 && z === 4)) && y >= 12 && y <= 15 && y % 2 === 0, 0x8aa0b8);
        // lacquered caps with a brass band, handle ring
        v.cylinder(0, 0, 0, 4.4, 3, cap);
        v.paint(() => v.tube(0, 1, 0, 5, 3.9, 1, metal(C.brass)));
        v.cylinder(0, 20, 0, 4.4, 2, cap);
        v.paint(() => v.tube(0, 20, 0, 5, 3.9, 1, metal(C.brass)));
        v.ring(0, 24, 0, metal(C.brass), 'z');
        // family crest on the back
        v.project(['.RRR.', 'R...R', 'R.R.R', 'R...R', '.RRR.'], { R: red }, -2, 15, '-z');
      },
    },
    {
      id: 'kappa', name: 'Kappa & Cucumber', jp: 'きゅうり河童', rarity: 'common',
      desc: 'Bows politely, spills the water from its head-plate, loses all power. Every time.',
      build(v) {
        const G = 0x76c45a, GD = 0x3f8f45, hair = 0x2c6b3e, belly = 0xe4f1a8, beak = gloss(0xf3c447);
        const shell = 0x8c6a3c, shellRim = 0xd2b47a;
        // shell on the back
        v.ellipsoid(0, 8, -3, 6, 6.5, 3.5, shell);
        v.paint(() => {
          v.shape(-7, 0, -8, 7, 16, -2, (x, y, z) => (y % 4 === 0) || ((x + 40 + (Math.floor(y / 4) % 2) * 2) % 4 === 0), shade(shell, 0.72));
        });
        tint(v, (x, y, z, c) => c !== shade(shell, 0.72) && c === shell && (x * x) / 36 + ((y - 8) * (y - 8)) / 42 > 0.72, shellRim);
        // body
        v.ellipsoid(0, 6, 0.5, 5.5, 6, 4.5, G);
        v.paint(() => v.ellipsoid(0, 5.5, 4, 4, 4.5, 2.5, belly));
        // head
        v.ellipsoid(0, 15, 0, 7.5, 6, 6.5, G);
        // bob-cut hair around the head-plate
        tint(v, (x, y, z, c) => c === G && y >= 12 && (y >= 19 || z <= -2 || (Math.abs(x) >= 6 && y >= 14) || (y === 18 && (x + 20) % 2 === 0) || (y >= 17 && z <= 3)), hair);
        // the sacred head-plate full of water
        v.cylinder(0, 20, 0, 4.4, 1, 0xf1efe4);
        v.cylinder(0, 21, 0, 4.4, 1, 0xf1efe4);
        v.cylinder(0, 21, 0, 3.3, 1, glass(0x6cc8ff));
        v.cylinder(0, 20, 0, 3.3, 1, 0xbfe6ff);
        // face
        face(v, 0, 16, { spread: 3, mouth: 'dot', blush: C.blush });
        v.remove(0, 13, 6);
        // duck beak
        v.box(-2, 13, 5, 2, 13, 8, beak);
        v.box(-1, 12, 5, 1, 12, 7, gloss(0xd9a531));
        v.set(-1, 14, 6, beak); v.set(0, 14, 6, beak); v.set(1, 14, 6, beak);
        v.set(-1, 13, 8, gloss(0xb8862a)); v.set(1, 13, 8, gloss(0xb8862a));
        // webbed feet
        for (const s of [-1, 1]) {
          v.ellipsoid(s * 3, 0.5, 4.5, 2, 0.6, 2.5, GD);
          v.paint(() => v.box(s * 3 - 2, 0, 7, s * 3 + 2, 1, 7, shade(GD, 1.2)));
        }
        // cucumber hugged to the belly
        const cu = 0x2f7d32, cuL = 0x5aa84a;
        v.cylinder(-6, 8, 6, 1.4, 13, cu, 'x');
        v.paint(() => v.shape(-7, 6, 4, 7, 10, 8, (x, y) => (x + y) % 3 === 0, cuL));
        v.set(-7, 8, 6, cu); v.set(7, 8, 6, cu);
        v.set(8, 8, 6, C.yellow); v.set(8, 9, 6, C.yellow); v.set(8, 7, 6, C.yellow); v.set(8, 8, 7, C.yellow);
        v.set(-8, 8, 6, 0x6f8f3e);
        // a bite taken out
        v.remove(5, 9, 7); v.remove(6, 9, 7); v.remove(5, 9, 6); v.remove(6, 9, 6); v.remove(6, 8, 7);
        v.paint(() => { v.box(4, 8, 5, 7, 9, 7, 0xd8f0b0); });
        v.set(5, 9, 5, 0xd8f0b0); v.set(5, 8, 7, 0xd8f0b0);
        // little arms hugging it
        for (const s of [-1, 1]) {
          v.line(s * 5, 10, 1, s * 4, 9, 5, G, 1);
          v.box(s * 4 - 1, 9, 7, s * 4, 10, 7, G);
        }
      },
    },
    {
      id: 'hitotsume', name: 'Hitotsume-kozō', jp: '一つ目小僧', rarity: 'common',
      desc: 'Jumps out, sticks his tongue out to scare you, then apologises for startling you.',
      build(v) {
        const skin = C.skin, shaved = mix(C.skin, 0x8fa8c8, 0.45), kim = 0x34509a, kimL = 0xdfe8ff, obi = C.yellow;
        // geta sandals
        for (const s of [-1, 1]) {
          const x0 = s * 3 - 1, x1 = s * 3 + 1;
          v.box(x0, 0, -1, x1, 0, -1, C.woodDark); v.box(x0, 0, 2, x1, 0, 2, C.woodDark);
          v.box(x0, 1, -2, x1, 1, 3, C.woodLight);
          v.box(x0, 2, -1, x1, 2, 2, skin);
          v.set(s * 3, 3, 2, C.red); v.set(s * 3 - 1, 2, 2, C.red); v.set(s * 3 + 1, 2, 2, C.red);
        }
        v.box(-4, 3, -1, -2, 4, 1, skin); v.box(2, 3, -1, 4, 4, 1, skin);
        // kimono (kasuri pattern)
        v.shape(-6, 4, -4, 6, 12, 4, (x, y, z) => {
          const hw = 5.4 - (y - 4) * 0.18, hd = 3.6;
          return (Math.abs(x) / hw) ** 4 + (Math.abs(z) / hd) ** 4 <= 1;
        }, (x, y, z) => {
          const u = ((x + z + 40) % 4), w = ((y + 40) % 4);
          return (u === 0 && w !== 3) || (w === 1 && u !== 2) ? (u === 0 && w === 1 ? kimL : (u === 0 || w === 1 ? mix(kim, kimL, 0.35) : kim)) : kim;
        });
        // collar
        v.project(['C.....C', 'CC...CC', '.CC.CC.', '..CCC..'], { C: C.cream }, -3, 12);
        // obi
        v.paint(() => v.box(-6, 7, -4, 6, 8, 4, obi));
        v.box(-1, 6, -5, 1, 9, -5, obi); v.box(-2, 7, -6, 2, 8, -6, shade(obi, 0.9));
        // sleeves held forward, wrists limp (the classic ghost pose)
        for (const s of [-1, 1]) {
          v.box(s * 6, 9, -1, s * 4, 11, 5, kim);
          v.box(s * 6, 7, 1, s * 5, 8, 5, kim);
          v.paint(() => v.box(s * 6, 7, 5, s * 4, 11, 5, shade(kim, 0.8)));
          v.box(s * 5, 10, 6, s * 4, 10, 7, skin);
          v.box(s * 5, 8, 7, s * 4, 9, 7, skin);
        }
        // big bald head
        v.sphere(0, 18, 0.5, 7, skin);
        tint(v, (x, y, z, c) => c === skin && y >= 21 && !(z >= 5 && y <= 21), shaved);
        tint(v, (x, y, z, c) => c === shaved && y >= 23 && hash(x, y, z) < 0.25, shade(shaved, 0.94));
        v.box(-8, 16, 0, -7, 18, 1, skin); v.box(7, 16, 0, 8, 18, 1, skin); // ears
        v.set(-8, 17, 1, C.skinShade); v.set(8, 17, 1, C.skinShade);
        // ONE big eye
        v.project([
          '..KKK..',
          '.WWWWW.',
          'WWBKKWW',
          'WBKKKBW',
          'WBKKKBW',
          'WWBBBWW',
          '.WWWWW.',
        ], { W, K, B: 0x6b3f22 }, -3, 22);
        v.project(['BB.........BB'], { B: C.blush }, -6, 15);
        // mouth with tongue out
        v.project(['MMM'], { M: C.mouth }, -1, 14);
        v.set(-1, 13, 7, gloss(C.tongue)); v.set(0, 13, 7, gloss(C.tongue)); v.set(1, 13, 7, gloss(C.tongue));
        v.set(0, 12, 7, gloss(C.tongue)); v.set(-1, 12, 7, gloss(C.tongue));
        v.set(0, 13, 6, gloss(C.tongue));
      },
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'kitsune', name: 'Fox-fire Kitsune', jp: '狐火きつね', rarity: 'uncommon',
      desc: 'Its tail-flames could guide lost travellers home. It uses them to toast fried tofu.',
      build(v) {
        const fur = 0xfbf6ee, furS = 0xe8ddd0, red = C.vermilion, stone = 0xa8a49c;
        // stone pedestal
        v.box(-8, 0, -7, 8, 1, 7, shade(stone, 0.9));
        v.box(-7, 2, -6, 7, 3, 6, stone);
        v.box(-7, 4, -6, 7, 4, 6, shade(stone, 1.08));
        tint(v, (x, y, z, c) => y <= 4 && hash(x, y, z) < 0.12, C.moss);
        tint(v, (x, y, z, c) => y <= 4 && hash(z, x, y) < 0.15, shade(stone, 0.82));
        // tails (three) with fox-fire tips
        const tails = [[-1, 0.9], [0, 0], [1, 0.9]];
        const tips = [];
        for (const [s] of tails) {
          const n = 14;
          let last;
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            const x = s * (Math.sin(t * 1.6) * 8.5);
            const y = 7 + t * (s === 0 ? 15 : 12);
            const z = -4 - Math.sin(t * Math.PI) * 2.5 - (s === 0 ? 1 : 0);
            const r = 1.2 + 1.9 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.9);
            v.sphere(x, y, z, r, t > 0.78 ? 0xf7c97a : fur);
            last = [Math.round(x), Math.round(y), Math.round(z)];
          }
          tips.push(last);
        }
        // haunches & chest
        v.ellipsoid(0, 9, -2, 5.5, 4.5, 4.5, fur);
        v.ellipsoid(0, 12, 0, 4, 5, 3.5, fur);
        // front legs
        v.box(-3, 5, 1, -2, 11, 2, fur); v.box(2, 5, 1, 3, 11, 2, fur);
        v.box(-3, 5, 3, -2, 5, 3, furS); v.box(2, 5, 3, 3, 5, 3, furS);
        // red bib
        v.project([
          'RRRRRRRRR',
          '.RRRRRRR.',
          '..RRRRR..',
          '...RYR...',
          '....R....',
        ], { R: red, Y: C.gold }, -4, 14, '+z', { raise: true });
        // head + snout
        v.ellipsoid(0, 18, 1, 4.5, 4, 4, fur);
        v.ellipsoid(0, 16.5, 5, 2.3, 1.6, 2.5, fur);
        v.set(0, 17, 8, gloss(K)); v.set(0, 16, 8, K);
        // ears
        for (const s of [-1, 1]) {
          for (let i = 0; i < 5; i++) {
            const w = i < 2 ? 1 : 0;
            v.box(s * 3 - w, 21 + i, 0, s * 3 + w, 21 + i, 1, fur);
          }
          v.box(s * 3, 21, 2, s * 3, 23, 2, C.pink);
          v.set(s * 3, 25, 1, red); v.set(s * 3, 24, 1, red);
        }
        // sly eyes + red kumadori markings
        v.project(['R.......R', 'KK.....KK', '.K.....K.'], { K, R: red }, -4, 21);
        v.project(['RR.....RR'], { R: red }, -4, 22);
        v.project(['P.......P'], { P: C.blush }, -4, 17);
        // fox-fire on each tail tip
        for (const [x, y, z] of tips) flame(v, x, y, z, 0xd8561c, 0xf0b23a, 1.8);
      },
    },
    {
      id: 'tengu', name: 'Karasu-tengu', jp: '烏天狗', rarity: 'uncommon',
      desc: 'One flap of his leaf fan summons a mountain gale. Mostly used to dry laundry.',
      build(v) {
        const feather = 0x2a2c3c, featherL = 0x454a66, robe = 0xf1ece0, hakama = 0x4a5578, beakC = 0xf2b83a;
        // mossy rock
        v.ellipsoid(0, 0, 0, 8, 3.2, 6.5, C.stone);
        v.box(-9, -4, -8, 9, -1, 8, null);
        tint(v, (x, y, z) => y >= 2 && hash(x, y, z) < 0.45, C.moss);
        tint(v, (x, y, z, c) => c === C.stone && hash(x, z, y) < 0.3, shade(C.stone, 0.85));
        // one-tooth geta
        for (const s of [-1, 1]) {
          v.box(s * 2, 3, 0, s * 2, 4, 0, C.woodDark);
          v.box(s * 2 - 1, 5, -2, s * 2 + 1, 5, 2, C.wood);
          v.box(s * 2 - 1, 6, -1, s * 2 + 1, 6, 1, W);
        }
        // wings (behind)
        for (const s of [-1, 1]) {
          v.ellipsoid(s * 6, 18, -4, 3.5, 4, 1.2, feather);
          const tipsW = [[11, 24], [12, 19], [11, 14], [9, 11]];
          tipsW.forEach(([tx, ty], i) => v.line(s * 4, 17, -4, s * tx, ty, -5, i % 2 ? featherL : feather, 0.8));
          v.paint(() => v.shape(-14, 8, -7, 14, 27, -3, (x, y) => Math.abs(x) >= 9, shade(featherL, 1.1)));
        }
        // hakama
        v.shape(-5, 7, -4, 5, 11, 4, (x, y, z) => {
          const hw = 4.6 - (y - 7) * 0.2;
          return Math.abs(x) <= hw && Math.abs(z) <= 3.2;
        }, (x) => ((x + 20) % 2 === 0 ? hakama : shade(hakama, 0.85)));
        // robe
        v.shape(-5, 11, -4, 5, 16, 4, (x, y, z) => (Math.abs(x) / 4.2) ** 4 + (Math.abs(z) / 3.2) ** 4 <= 1, robe);
        v.paint(() => v.box(-5, 11, -4, 5, 11, 4, shade(robe, 0.8)));
        v.project(['K.....K', 'KK...KK', '.KK.KK.'], { K: shade(robe, 0.75) }, -3, 16);
        // bonten pom-poms
        [[-2, 15, C.red], [2, 15, C.red], [-2, 13, C.yellow], [2, 13, C.yellow]].forEach(([x, y, c]) => {
          v.box(x, y, 4, x + (x < 0 ? -1 : 1), y - 1, 4, c);
        });
        // left arm down, right arm up holding the fan
        v.box(-6, 12, -1, -5, 16, 2, robe); v.box(-6, 11, 0, -6, 11, 1, feather);
        v.line(5, 15, 0, 7, 17, 2, robe, 1);
        v.box(7, 16, 3, 8, 17, 3, feather);
        // head
        v.sphere(0, 20, 0, 4.5, feather);
        tint(v, (x, y, z, c) => c === feather && y >= 23 && z <= 2, featherL);
        // big beak
        v.cone(0, 19, 4, 2, 5, gloss(beakC), 'z');
        v.paint(() => v.box(-2, 17, 4, 2, 18, 9, gloss(shade(beakC, 0.8))));
        // eyes with fierce red brows
        v.project(['RR...RR', 'WWW.WWW', 'WKW.WKW'], { R: C.red, W, K }, -3, 23);
        // tokin cap
        v.box(-1, 24, 1, 1, 25, 2, C.charcoal); v.set(0, 26, 1, C.charcoal);
        v.set(-2, 24, 1, C.red); v.set(2, 24, 1, C.red);
        // yatsude leaf fan
        v.line(8, 17, 3, 9, 21, 3, C.woodLight);
        v.layer([
          '...G.....G...',
          '..GG..G..GG..',
          '..GGG.G.GGG..',
          'G..GGGgGGG..G',
          'GGG.GGgGG.GGG',
          '.GGGGgggGGGG.',
          '...GGGgGGG...',
          '..GGG.g.GGG..',
          '.GG...h...GG.',
        ], { G: C.leaf, g: C.lime, h: C.woodLight }, { x: 3, y: 29, z: 3 });
      },
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'zashiki', name: 'Zashiki-warashi', jp: '座敷わらし', rarity: 'rare',
      desc: 'Brings good fortune to any house she plays in. Rent-free. Eats all the snacks.',
      build(v) {
        const tatami = 0xcfc47c, heri = 0x2f4a3a, kimono = 0xd8333a, hair = 0x241a1c;
        // tatami mat
        v.box(-12, 0, -9, 12, 1, 9, (0, tatami));
        tint(v, (x, y, z) => y === 1 && z % 2 === 0, shade(tatami, 0.93));
        tint(v, (x, y, z) => z <= -8 || z >= 8, heri);
        tint(v, (x, y, z) => (z === -8 || z === 8) && x % 3 === 0 && y === 1, C.gold);
        // gold folding screen
        const panels = 4;
        for (let p = 0; p < panels; p++) {
          const x0 = -12 + p * 6, zz = p % 2 ? -7 : -8;
          v.box(x0, 2, zz, x0 + 5, 15, zz, metal(C.gold));
          v.box(x0, 2, zz - 1, x0 + 5, 15, zz - 1, C.lacquerBlack);
          v.box(x0, 15, zz, x0 + 5, 15, zz, C.lacquerBlack);
          v.box(x0, 2, zz, x0 + 5, 2, zz, C.lacquerBlack);
        }
        // painted pine & clouds on the screen
        v.project([
          '..........WWWW..........',
          '........WWWWWWWW........',
          '.....................GG.',
          '...GGG............GGGGGG',
          '.GGGGGGG...........GGGG.',
          '...GGG..............bb..',
          '....b...............b...',
          '....bb.............bb...',
          '.....b...WWWWW.....b....',
          '.....b..WWWWWWWW...b....',
        ], { W: metal(0xfff3c8), G: C.grassDark, b: C.woodDark }, -12, 14);
        // spinning top (koma)
        const kx = 6, kz = 3;
        const komaR = (y) => (y <= 5 ? (y - 2) * 1.1 : Math.max(0.5, 3.3 - (y - 5) * 1.0));
        v.shape(kx - 4, 2, kz - 4, kx + 4, 8, kz + 4, (x, y, z) => (x - kx) ** 2 + (z - kz) ** 2 <= (komaR(y) + 0.3) ** 2, (x, y, z) => {
          const d = Math.round(Math.sqrt((x - kx) ** 2 + (z - kz) ** 2));
          return [C.red, C.yellow, C.green, C.blue, C.woodLight][d % 5];
        });
        v.box(kx, 8, kz, kx, 9, kz, C.woodDark);
        v.torus(kx, 5, kz, 4.6, 0.4, glass(0xffffff), 'y');
        // temari ball
        v.sphere(9, 4, -4, 2.4, (x, y, z) => ((x + y + z) % 3 === 0 ? C.yellow : ((x - z + 30) % 3 === 0 ? W : C.red)));
        // the girl
        const gx = -4;
        for (const s of [-1, 1]) {
          v.box(gx + s * 2 - (s < 0 ? 1 : 0), 2, -1, gx + s * 2 + (s > 0 ? 1 : 0), 2, 2, C.red);
          v.box(gx + s * 2 - (s < 0 ? 1 : 0), 3, -1, gx + s * 2 + (s > 0 ? 1 : 0), 3, 1, W);
        }
        v.shape(gx - 5, 4, -4, gx + 5, 12, 4, (x, y, z) => {
          const hw = 4.4 - (y - 4) * 0.12, hd = 3.2;
          return (Math.abs(x - gx) / hw) ** 4 + (Math.abs(z) / hd) ** 4 <= 1;
        }, (x, y, z) => (hash(x, y, z) < 0.16 ? C.pink : (hash(z, y, x) < 0.06 ? W : kimono)));
        v.paint(() => v.box(gx - 5, 8, -4, gx + 5, 9, 4, C.gold));
        v.box(gx - 2, 7, -5, gx + 2, 10, -5, C.gold); v.box(gx - 3, 8, -6, gx + 3, 9, -6, shade(C.gold, 0.9));
        v.project(['W.....W', 'WW...WW', '.WW.WW.'], { W }, gx - 3, 12);
        // sleeves
        v.box(gx - 6, 8, -1, gx - 5, 12, 2, kimono);
        v.box(gx + 5, 8, -1, gx + 6, 12, 2, kimono);
        v.box(gx + 6, 11, 0, gx + 7, 11, 3, kimono);
        v.box(gx + 7, 11, 4, gx + 8, 11, 4, C.skin);
        // string dangling from her hand
        v.line(gx + 8, 10, 4, gx + 9, 2, 4, C.cream);
        // head + bob hair
        v.sphere(gx, 16, 0, 5.5, C.skin);
        tint(v, (x, y, z, c) => c === C.skin && y >= 12 && Math.abs(x - gx) <= 7 && (y >= 18 || z <= 1 || Math.abs(x - gx) >= 4), hair);
        v.shape(gx - 6, 12, -5, gx + 6, 22, 5, (x, y, z) => {
          const dx = x - gx, d = (dx * dx) / 36 + ((y - 16.5) ** 2) / 30 + (z * z) / 36;
          return d <= 1 && (y >= 18 || z <= 1 || Math.abs(dx) >= 4) && y >= 12;
        }, gloss(hair));
        face(v, gx, 16, { spread: 2, mouth: 'dot' });
        v.set(gx + 3, 20, 4, C.red); v.set(gx + 4, 20, 4, C.red); v.set(gx + 3, 21, 4, C.red);
      },
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'nekomata', name: 'Dancing Nekomata', jp: '踊る猫又', rarity: 'ultra',
      desc: 'Live to 100, grow a second tail, put a towel on your head and dance. Cat rules.',
      build(v) {
        const blk = 0x2b2833, wht = 0xf7f3ee, ghost = 0x2f86d8, ghostCore = 0x9ad8ff;
        // round mossy base
        v.cylinder(0, 0, 0, 11, 2, 0x5a5668);
        v.cylinder(0, 2, 0, 10.5, 1, 0x557a3f);
        tint(v, (x, y, z) => y === 2 && hash(x, y, z) < 0.25, 0x6e9450);
        tint(v, (x, y, z) => y <= 1 && hash(x, z, y) < 0.3, 0x4a4757);
        // andon lamp
        const ax = -7, az = -4;
        v.box(ax - 2, 3, az - 2, ax + 2, 3, az + 2, C.woodDark);
        v.box(ax - 2, 4, az - 2, ax + 2, 9, az + 2, glow(0xd88a2a));
        v.box(ax - 2, 10, az - 2, ax + 2, 10, az + 2, C.woodDark);
        for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) v.box(ax + dx, 3, az + dz, ax + dx, 11, az + dz, C.woodDark);
        v.box(ax - 2, 6, az + 2, ax + 2, 6, az + 2, C.woodDark);
        // fish bones
        v.layer(['K.K.K.KKK.', 'KKKKKKKKKK', 'K.K.K.KKK.'], { K: 0xf2ece0 }, { x: 3, y: 3, z: 6, plane: 'xz' });
        v.set(3, 3, 7, 0xf2ece0); v.set(12 - 1, 3, 7, 0xf2ece0);
        // legs
        for (const s of [-1, 1]) {
          v.cylinder(s * 2.5, 3, 0, 1.5, 5, blk);
          v.ellipsoid(s * 2.5, 3.5, 1.5, 1.6, 0.8, 2.2, wht);
        }
        // two tails, each holding a ghost flame
        const tips = [];
        for (const s of [-1, 1]) {
          let last;
          for (let i = 0; i <= 16; i++) {
            const t = i / 16;
            const x = s * (1 + t * 6 + Math.sin(t * Math.PI * 1.5) * 1.5);
            const y = 7 + t * 14;
            const z = -3.5 - t * 2;
            v.sphere(x, y, z, 1.3 - t * 0.3, blk);
            last = [Math.round(x), Math.round(y), Math.round(z)];
          }
          tips.push(last);
        }
        // body
        v.ellipsoid(0, 10.5, 0, 4.5, 4.5, 3.5, blk);
        v.paint(() => v.ellipsoid(0, 10, 3, 3, 3.5, 1.5, wht));
        // arms: one raised, one out with a fan
        v.line(-4, 12, 0, -7, 15, 1, blk, 1);
        v.sphere(-7, 16, 1, 1.4, wht);
        v.line(4, 12, 0, 7, 10, 2, blk, 1);
        v.sphere(7, 10, 2, 1.3, wht);
        v.layer(['.RRRRR.', 'RRWRWRR', '.RRRRR.', '..RRR..', '...K...'], { R: C.red, W: C.gold, K: C.woodDark }, { x: 5, y: 14, z: 3 });
        // head
        v.ellipsoid(0, 17.5, 0.5, 5.5, 4.5, 4.5, blk);
        v.paint(() => v.shape(-6, 13, 0, 6, 18, 6, (x, y, z) => y <= 18 - Math.abs(x) * 0.9 && z >= 2, wht));
        // ears
        for (const s of [-1, 1]) {
          for (let i = 0; i < 4; i++) {
            const w = i < 2 ? 1 : 0;
            v.box(s * 3.5 - w, 21 + i, 0, s * 3.5 + w, 21 + i, 1, blk);
          }
          v.box(s * 3.5, 21, 2, s * 3.5, 22, 2, C.pink);
        }
        // tenugui towel on the head, tied under the chin
        const towel = (x, y, z) => ((x + y + z) % 3 === 0 ? 0x2f5fb0 : 0xf4f6fb);
        v.shape(-7, 13, -5, 7, 23, 6, (x, y, z) => {
          const d = (x * x) / 36 + ((y - 17.5) ** 2) / 30 + ((z - 0.5) ** 2) / 30;
          return d <= 1.05 && d >= 0.62 && y >= 20 && Math.abs(x) <= 2;
        }, towel);
        v.shape(-7, 13, -5, 7, 23, 6, (x, y, z) => {
          const d = (x * x) / 36 + ((y - 17.5) ** 2) / 30 + ((z - 0.5) ** 2) / 30;
          return d <= 1.05 && d >= 0.62 && Math.abs(x) >= 5 && y >= 14;
        }, towel);
        v.box(-1, 13, 4, 1, 13, 5, towel); v.set(-2, 12, 5, towel); v.set(2, 12, 5, towel);
        // face
        v.project(['YY...YY', 'YK...KY'], { Y: gloss(0xe8d23a), K }, -3, 19);
        v.project(['.N.', 'M.M'], { N: C.pink, M: K }, -1, 17);
        v.project(['PP.....PP'], { P: C.blush }, -4, 16);
        v.project(['WW.......WW', '...........', 'WW.......WW'], { W: C.lightgray }, -5, 17);
        // ghost flames
        for (const [x, y, z] of tips) {
          v.sphere(x, y + 2, z, 1.8, glow(ghost));
          v.cone(x, y + 3, z, 1.4, 4, glow(ghost));
          v.sphere(x, y + 2, z + 1, 0.8, glow(ghostCore));
        }
        // a wandering hitodama rising out of the moss
        v.line(7, 3, 4, 8, 7, 4, glow(ghost), 0.5);
        v.sphere(8, 9, 4, 1.9, glow(ghost));
        v.sphere(8, 9, 5, 0.9, glow(ghostCore));
      },
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'nurikabe', name: 'Nurikabe', jp: 'ぬりかべ', rarity: 'secret',
      desc: 'Blocks your path at night. Tap its feet with a stick and it leaves. It is a wall.',
      build(v) {
        const plaster = 0xebe4d4, plasterS = 0xd8cfbc, tile = gloss(0x4a5262), tileD = gloss(0x3a404e);
        // stubby feet
        for (const s of [-1, 1]) v.ellipsoid(s * 6.5, 1.2, 1, 3, 1.8, 3.2, plasterS);
        v.box(-10, -3, -6, 10, -1, 6, null);
        // the wall
        v.box(-11, 3, -3, 11, 21, 3, plaster);
        tint(v, (x, y, z) => y <= 5 && y >= 3, (x, y, z) => mix(plasterS, 0x9a8e78, (6 - y) * 0.15));
        tint(v, (x, y, z, c) => y > 5 && c === plaster && hash(x, y, z) < 0.08, shade(plaster, 0.95));
        // tile cap
        v.box(-12, 22, -4, 12, 22, 4, tileD);
        v.box(-12, 23, -3, 12, 23, 3, tile);
        v.box(-12, 24, -1, 12, 24, 1, tileD);
        v.box(-12, 25, 0, 12, 25, 0, tile);
        tint(v, (x, y, z, c, m) => y >= 22 && y <= 23 && (x + 20) % 2 === 0 && m === 1, shade(0x4a5262, 0.82));
        for (let x = -12; x <= 12; x += 2) { v.set(x, 21, 4, tile); v.set(x, 21, -4, tile); }
        // tiny eyes. that's it.
        v.project(['K...K', 'K...K'], { K }, -2, 15);
        // tiny arms
        v.box(-13, 11, 0, -12, 11, 1, plaster); v.box(12, 11, 0, 13, 11, 1, plaster);
        // a crack
        v.project(['..k', '.k.', '.k.', 'k..'], { k: 0xb3a990 }, 6, 19);
        // a snail exploring
        v.sphere(-6, 8, 5, 1.6, (x, y, z) => ((x + y) % 2 === 0 ? 0xc98a4a : 0xf0d8a0));
        v.box(-8, 6, 4, -4, 6, 4, 0xc9c2b8); v.set(-3, 7, 4, 0xc9c2b8); v.set(-3, 8, 4, K);
        // walking stick leaning on it
        v.line(9, 0, 6, 9, 13, 4, C.wood);
        v.box(8, 13, 4, 10, 14, 4, 0x6a8fd0);
        // ivy creeping up the side
        for (let y = 3; y <= 18; y += 3) {
          v.set(-12, y, 2 - (y % 2), C.leaf); v.set(-12, y + 1, 1, C.grassDark);
        }
      },
    },
  ],
};
