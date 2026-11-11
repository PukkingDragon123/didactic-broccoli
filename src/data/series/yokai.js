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

/** Thick 2D segment in the xy plane, extruded from z0 to z1. c may be fn(x,y,z,t). */
function seg2d(v, x0, y0, x1, y1, hw, z0, z1, c) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
  for (let x = Math.floor(Math.min(x0, x1) - hw); x <= Math.ceil(Math.max(x0, x1) + hw); x++) {
    for (let y = Math.floor(Math.min(y0, y1) - hw); y <= Math.ceil(Math.max(y0, y1) + hw); y++) {
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L2));
      const px = x0 + t * dx, py = y0 + t * dy;
      if ((x - px) ** 2 + (y - py) ** 2 > hw * hw) continue;
      for (let z = z0; z <= z1; z++) v.set(x, y, z, typeof c === 'function' ? c(x, y, z, t) : c);
    }
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
        const paper = 0xf7efdc, rib = 0xdccba6, red = C.vermilion, cap = C.lacquerBlack, brass = gloss(0xd9a441);
        const inner = glow(0xe8601a);
        const prof = (y) => 3.7 + 3.5 * Math.sin(Math.PI * (y - 3) / 16);
        const front = (x, y, z) => z >= 3 && Math.abs(x) <= 5 && y >= 6 && y <= 16;
        v.shape(-8, 3, -8, 8, 19, 8, (x, y, z) => x * x + z * z <= (prof(y) + (y % 3 === 0 && !front(x, y, z) ? 0.55 : 0) + 0.2) ** 2,
          (x, y) => (y % 3 === 0 ? rib : paper));
        v.paint(() => { v.box(-8, 4, -8, 8, 4, 8, red); v.box(-8, 18, -8, 8, 18, 8, red); });
        // glowing insides
        v.shape(-8, 5, -8, 8, 17, 8, (x, y, z) => x * x + z * z <= (prof(y) - 1.3) ** 2, inner);
        // torn grin glowing from inside, with two paper teeth
        v.project([
          'K.........K',
          'KKKKKKKKKKK',
          '.KGWGGGWGK.',
          '..KGGGGGK..',
          '...KKKKK...',
        ], { K, G: inner, W: paper }, -5, 10);
        // tongue lolling out of the grin
        const T = gloss(C.tongue), Td = gloss(shade(C.tongue, 0.8));
        v.box(-2, 6, 5, 0, 6, 7, T);
        v.box(-2, 2, 8, 0, 6, 8, T);
        v.remove(-2, 2, 8); v.remove(0, 2, 8);
        v.box(-1, 3, 8, -1, 5, 8, Td);
        // one big eye
        v.project([
          '.KKKKK.',
          'WWWWWWW',
          'WWKKKWW',
          'WWKKKWW',
          'WWKKKWW',
          '.WWWWW.',
        ], { W, K: gloss(K) }, -3, 17);
        v.project(['PP.......PP'], { P: C.blush }, -5, 12);
        // lacquered caps with brass bands, handle ring
        v.cylinder(0, 0, 0, 4.4, 3, cap);
        v.paint(() => v.tube(0, 1, 0, 5, 3.9, 1, brass));
        v.cylinder(0, 20, 0, 4.4, 2, cap);
        v.paint(() => v.tube(0, 20, 0, 5, 3.9, 1, brass));
        v.ring(0, 24, 0, brass, 'z');
        // family crest on the back
        v.project(['.RRR.', 'R...R', 'R.R.R', 'R...R', '.RRR.'], { R: red }, -2, 15, '-z');
      },
    },
    {
      id: 'kappa', name: 'Kappa & Cucumber', jp: 'きゅうり河童', rarity: 'common',
      desc: 'Bows politely, spills the water from its head-plate, loses all power. Every time.',
      build(v) {
        const G = 0x8bd05e, GD = 0x5fa548, hair = 0x2d6e44, belly = 0xf0f5b8, beak = gloss(0xf3c447);
        const shell = 0x8c6a3c, shellD = 0x6a4e2a, shellRim = 0xd8bb80, plate = 0xf4f1e6;
        // shell on the back
        v.ellipsoid(0, 8, -3, 6, 6.5, 3.5, shell);
        tint(v, (x, y, z, c) => c === shell && ((y % 4 === 0) || ((x + 40 + (Math.floor(y / 4) % 2) * 2) % 4 === 0)), shellD);
        tint(v, (x, y, z, c) => (c === shell || c === shellD) && (x * x) / 36 + ((y - 8) * (y - 8)) / 42 > 0.7, shellRim);
        // body
        v.ellipsoid(0, 6, 0.5, 5.5, 6, 4.5, G);
        v.paint(() => v.ellipsoid(0, 5.5, 4, 4, 4.5, 2.5, belly));
        // head
        v.ellipsoid(0, 15, 0, 7.5, 6, 6.5, G);
        // bob-cut hair around the head-plate
        tint(v, (x, y, z, c) => c === G && y >= 12 && (y >= 19 || z <= -2 || (Math.abs(x) >= 6 && y >= 14) || (y === 18 && (x + 20) % 2 === 0) || (y >= 17 && z <= 3)), hair);
        // the sacred head-plate, sunk into the hair, full of water
        v.box(-5, 20, -5, 5, 22, 5, null);
        v.cylinder(0, 19, 0, 4.4, 1, plate);
        v.tube(0, 20, 0, 4.4, 3.3, 1, plate);
        v.cylinder(0, 20, 0, 3.3, 1, glass(0x5cc4ff));
        v.cylinder(0, 19, 0, 3.3, 1, 0x9fd9ff);
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2 + 0.4;
          v.set(Math.round(Math.cos(ang) * 5.4), 20, Math.round(Math.sin(ang) * 5), hair);
        }
        // face
        face(v, 0, 16, { spread: 3, mouth: 'dot', blush: C.blush });
        v.remove(0, 13, 6);
        // duck beak
        v.box(-2, 13, 5, 2, 13, 8, beak);
        v.box(-1, 12, 5, 1, 12, 7, gloss(0xd9a531));
        v.box(-1, 14, 6, 1, 14, 6, beak);
        v.set(-1, 13, 8, gloss(0xb8862a)); v.set(1, 13, 8, gloss(0xb8862a));
        // webbed feet with toes
        for (const s of [-1, 1]) {
          v.ellipsoid(s * 3, 0.5, 4.5, 2, 0.6, 2.5, GD);
          v.box(s * 3 - 2, 0, 6, s * 3 - 2, 0, 7, GD); v.box(s * 3, 0, 6, s * 3, 0, 8, GD); v.box(s * 3 + 2, 0, 6, s * 3 + 2, 0, 7, GD);
        }
        // cucumber hugged to the belly
        const cu = 0x24642c, cuL = 0x4a9440;
        v.cylinder(-6, 7, 7, 1.4, 13, cu, 'x');
        v.paint(() => v.shape(-5, 8, 5, 5, 8, 9, () => true, cuL));
        v.paint(() => v.shape(-7, 5, 5, 7, 9, 9, (x, y, z) => hash(x, y, z) < 0.16, 0xb8e08a));
        for (let x = -5; x <= 3; x += 2) v.set(x, 6 + ((x + 9) % 3), 9, 0xb8e08a);
        v.set(-7, 7, 7, cu); v.set(-8, 7, 7, 0x8a7a3a);
        v.set(7, 7, 7, cu); v.set(8, 7, 7, C.yellow); v.set(8, 8, 7, C.yellow); v.set(8, 6, 7, C.yellow); v.set(8, 7, 8, C.yellow);
        // a bite taken out
        v.remove(5, 8, 8); v.remove(6, 8, 8); v.remove(5, 8, 7); v.remove(6, 8, 7); v.remove(6, 7, 8); v.remove(5, 7, 8);
        tint(v, (x, y, z, c) => (c === cu || c === cuL || c === 0xb8e08a) && x >= 4 && x <= 7 && y >= 6 && y <= 8 && z >= 6, 0xd8f0b0);
        // little arms hugging it
        for (const s of [-1, 1]) {
          v.line(s * 5, 10, 1, s * 4, 9, 5, G, 1);
          v.box(s * 4 - 1, 8, 8, s * 4, 9, 8, G);
        }
      },
    },
    {
      id: 'hitotsume', name: 'Hitotsume-kozō', jp: '一つ目小僧', rarity: 'common',
      desc: 'Jumps out, sticks his tongue out to scare you, then apologises for startling you.',
      build(v) {
        const skin = C.skin, shaved = mix(C.skin, 0x8aa0c8, 0.16), kim = 0x34509a, kimL = 0xdfe8ff, obi = C.yellow;
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
        v.box(-1, 6, -4, 1, 9, -4, obi); v.box(-2, 7, -5, 2, 8, -5, shade(obi, 0.9));
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
        tint(v, (x, y, z, c) => c === skin && y >= 21 && z <= 4, shaved);
        v.box(-8, 16, 0, -8, 18, 1, skin); v.box(8, 16, 0, 8, 18, 1, skin); // ears
        v.set(-8, 17, 1, C.skinShade); v.set(8, 17, 1, C.skinShade);
        // ONE big eye
        v.project([
          '..KKK..',
          '.WWWWW.',
          'WWBBBWW',
          'WBWKKBW',
          'WBKKKBW',
          'WWBBBWW',
          '.WWWWW.',
        ], { W, K, B: 0x7a4a26 }, -3, 22);
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
        const fur = 0xfbf6ee, furS = 0xebe2d6, red = C.vermilion, stone = 0xa8a49c, tipC = 0xf7c97a;
        // stone pedestal
        v.box(-8, 0, -7, 8, 1, 7, shade(stone, 0.9));
        v.box(-7, 2, -6, 7, 3, 6, stone);
        v.box(-7, 4, -6, 7, 4, 6, shade(stone, 1.08));
        tint(v, (x, y, z) => y <= 4 && hash(x, y, z) < 0.12, C.moss);
        tint(v, (x, y, z) => y <= 4 && hash(z, x, y) < 0.15, shade(stone, 0.82));
        // three tails fanning out behind, each with fox-fire on the tip
        const tips = [];
        for (const s of [-1, 0, 1]) {
          const n = 16;
          let last;
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            const x = s * Math.sin(t * 1.5) * 8;
            const y = 7 + t * (s === 0 ? 15 : 12);
            const z = -4 - Math.sin(t * Math.PI) * 2.5 - (s === 0 ? 1 : 0);
            const r = 1.1 + 1.7 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.9);
            v.sphere(x, y, z, r, t > 0.8 ? tipC : fur);
            last = [Math.round(x), Math.round(y), Math.round(z)];
          }
          tips.push(last);
        }
        // haunches & chest
        v.ellipsoid(0, 9, -2, 5.5, 4.5, 4.5, fur);
        v.ellipsoid(0, 12, 0, 4, 5, 3.5, fur);
        tint(v, (x, y, z, c) => c === fur && y <= 7 && z <= 0, furS);
        // front legs
        v.box(-3, 5, 1, -2, 11, 2, fur); v.box(2, 5, 1, 3, 11, 2, fur);
        v.box(-3, 5, 3, -2, 5, 3, furS); v.box(2, 5, 3, 3, 5, 3, furS);
        // red bib with a little bell
        v.project([
          'RRRRRRRRR',
          '.RRRRRRR.',
          '..RRRRR..',
          '...RRR...',
        ], { R: red }, -4, 14, '+z', { raise: true });
        v.set(0, 10, 5, gloss(C.gold));
        // head with a pointed snout
        v.ellipsoid(0, 18, 0.5, 4.8, 4.2, 4, fur);
        v.box(-2, 15, 4, 2, 17, 5, fur);
        v.box(-1, 15, 6, 1, 16, 7, fur);
        v.set(0, 16, 8, gloss(K));
        v.box(-1, 15, 6, 1, 15, 7, furS);
        // cheek fluff
        for (const s of [-1, 1]) { v.box(s * 5, 15, 0, s * 6, 16, 2, fur); v.set(s * 6, 15, 1, furS); }
        // ears: white outside, vermilion inside
        for (const s of [-1, 1]) {
          for (let i = 0; i < 5; i++) {
            const w = i < 2 ? 1 : 0;
            v.box(s * 3 - w, 21 + i, -1, s * 3 + w, 21 + i, 1, fur);
          }
          v.box(s * 3, 21, 2, s * 3, 23, 2, red);
          v.set(s * 3 - 1, 21, 2, red); v.set(s * 3 + 1, 21, 2, red);
        }
        // sly eyes and red kumadori markings
        v.project([
          'R.......R',
          'RR.....RR',
          'K.......K',
          '.KK...KK.',
        ], { K, R: red }, -4, 21);
        v.project(['P.......P'], { P: C.blush }, -4, 17);
        // fox-fire
        for (const [x, y, z] of tips) flame(v, x, y, z, 0xd8561c, 0xf0b23a, 1.8);
      },
    },
    {
      id: 'tengu', name: 'Karasu-tengu', jp: '烏天狗', rarity: 'uncommon',
      desc: 'One flap of his leaf fan summons a mountain gale. Mostly used to dry laundry.',
      build(v) {
        const feather = 0x26283a, featherL = 0x3a4060, sheen = 0x52608c, robe = 0xf1ece0, hakama = 0x4a5578, beakC = 0xf2b83a;
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
          v.set(s * 2, 7, 1, C.red);
        }
        // wings: overlapping primaries + rounded coverts
        for (const s2 of [-1, 1]) {
          const tipsW = [[10, 25], [11.5, 23], [12.5, 20.5], [12.5, 17.5], [11.5, 14.5], [9.5, 12]];
          tipsW.forEach(([tx, ty], i) => seg2d(v, s2 * 4, 18, s2 * tx, ty, 1.35, -5, -4,
            (x, y, z, t) => (t > 0.85 ? sheen : (i % 2 ? featherL : feather))));
          seg2d(v, s2 * 5, 19, s2 * 7, 20, 3.3, -3, -3, featherL);
          tint(v, (x, y, z, c) => z === -3 && c === featherL && Math.sign(x) === s2 && y >= 22, sheen);
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
        for (const sx of [-1, 1]) {
          v.box(sx * 2, 16, 4, sx * 2, 11, 4, C.charcoal);
          for (const [y, c] of [[15, C.red], [12, 0xffffff]]) {
            v.box(sx * 2, y, 4, sx * 2 + sx, y - 1, 4, c);
            v.set(sx * 2, y, 5, c); v.set(sx * 2 + sx, y - 1, 5, shade(c, 0.85));
          }
        }
        // left arm down, right arm out holding the fan
        v.box(-6, 12, -1, -5, 16, 2, robe); v.box(-6, 11, 0, -5, 11, 1, feather);
        v.line(5, 15, 0, 8, 14, 3, robe, 1);
        v.box(8, 14, 4, 9, 15, 4, feather);
        // head
        v.sphere(0, 20.5, 0, 5, feather);
        tint(v, (x, y, z, c) => c === feather && y >= 23 && z <= 2, featherL);
        // big beak with a hooked tip
        v.box(-2, 19, 4, 2, 20, 6, gloss(beakC));
        v.box(-1, 19, 7, 1, 20, 8, gloss(beakC));
        v.box(0, 19, 9, 0, 20, 9, gloss(beakC));
        v.set(0, 18, 9, gloss(shade(beakC, 0.75)));
        v.box(-1, 18, 4, 1, 18, 7, gloss(shade(beakC, 0.75)));
        v.set(-1, 20, 7, gloss(shade(beakC, 0.6))); v.set(1, 20, 7, gloss(shade(beakC, 0.6)));
        // eyes with fierce red brows
        v.project(['RR...RR', 'WWW.WWW', 'WKW.WKW'], { R: C.red, W, K }, -3, 24);
        // tokin cap
        v.box(-1, 25, -1, 1, 26, 1, C.charcoal); v.set(0, 27, 0, C.charcoal);
        v.set(-2, 25, 0, C.red); v.set(2, 25, 0, C.red);
        // yatsude leaf fan
        v.box(9, 15, 4, 9, 18, 4, C.woodLight);
        v.layer([
          '.G...G...G.',
          '.GG..G..GG.',
          '..GG.G.GG..',
          'G..GGgGG..G',
          'GGG.GgG.GGG',
          '.GGGGgGGGG.',
          '...GGgGG...',
          '.....h.....',
        ], { G: C.leaf, g: C.lime, h: C.woodLight }, { x: 4, y: 25, z: 4 });
      },
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'zashiki', name: 'Zashiki-warashi', jp: '座敷わらし', rarity: 'rare',
      desc: 'Brings good fortune to any house she plays in. Rent-free. Eats all the snacks.',
      build(v) {
        const tatami = 0xcfc47c, heri = 0x2f4a3a, kimono = 0xd8333a, hair = 0x2a1f22, gold = gloss(0xe6bf55);
        // tatami mat with brocade borders
        v.box(-12, 0, -9, 12, 1, 9, tatami);
        tint(v, (x, y, z) => y === 1 && z % 2 === 0, shade(tatami, 0.93));
        tint(v, (x, y, z) => z <= -8 || z >= 8, heri);
        tint(v, (x, y, z) => (z === -8 || z === 8) && (x + 30) % 3 === 0 && y === 1, C.gold);
        // gold folding screen
        for (let p = 0; p < 4; p++) {
          const x0 = -12 + p * 6, zz = p % 2 ? -7 : -8;
          v.box(x0, 2, zz, x0 + 5, 15, zz, gold);
          v.box(x0, 2, zz - 1, x0 + 5, 15, zz - 1, (x, y) => ((x * 2 + y * 3 + 60) % 5 === 0 ? 0xb88a52 : 0xe2d2ae));
          v.box(x0, 15, zz - 1, x0 + 5, 15, zz, C.lacquerBlack);
          v.box(x0, 2, zz - 1, x0 + 5, 2, zz, C.lacquerBlack);
          v.box(x0, 2, zz - 1, x0, 15, zz - 1, C.lacquerBlack);
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
        ], { W: gloss(0xfbe6a8), G: C.grassDark, b: C.woodDark }, -12, 14);
        // spinning top (koma), mid-spin
        const kx = 6, kz = 0;
        const komaR = { 2: 0.3, 3: 1.4, 4: 2.5, 5: 3.1, 6: 2.6, 7: 1.5 };
        v.shape(kx - 4, 2, kz - 4, kx + 4, 7, kz + 4, (x, y, z) => (x - kx) ** 2 + (z - kz) ** 2 <= (komaR[y] + 0.3) ** 2, (x, y, z) => {
          const d = Math.round(Math.sqrt((x - kx) ** 2 + (z - kz) ** 2));
          return [C.red, C.yellow, C.green, C.blue][d % 4];
        });
        v.box(kx, 8, kz, kx, 9, kz, C.woodDark);
        v.torus(kx, 5, kz, 3.9, 0.4, glass(0xffffff), 'y');
        // temari ball
        v.sphere(10, 4, -4, 2, (x, y, z) => ((x + y + z) % 3 === 0 ? C.yellow : ((x - z + 30) % 3 === 0 ? W : C.red)));
        // dango on a little plate (one skewer already eaten)
        v.cylinder(6, 2, 6, 2.6, 1, C.ceramic);
        v.paint(() => v.tube(6, 2, 6, 3, 2, 1, C.blue));
        v.line(3, 3, 5, 9, 3, 5, C.bamboo);
        v.sphere(4, 4, 5, 1, C.pink); v.sphere(6, 4, 5, 1, W); v.sphere(8, 4, 5, 1, C.matcha);
        v.line(4, 3, 7, 8, 3, 7, C.bamboo);
        // the girl
        const gx = -4;
        for (const s of [-1, 1]) {
          v.box(gx + s * 2 - (s < 0 ? 1 : 0), 2, -1, gx + s * 2 + (s > 0 ? 1 : 0), 2, 2, C.red);
          v.box(gx + s * 2 - (s < 0 ? 1 : 0), 3, -1, gx + s * 2 + (s > 0 ? 1 : 0), 3, 1, W);
        }
        v.shape(gx - 5, 4, -4, gx + 5, 12, 4, (x, y, z) => {
          const hw = 4.4 - (y - 4) * 0.12, hd = 3.2;
          return (Math.abs(x - gx) / hw) ** 4 + (Math.abs(z) / hd) ** 4 <= 1;
        }, (x, y, z) => (hash(x, y, z) < 0.14 ? C.pink : (hash(z, y, x) < 0.07 ? W : kimono)));
        v.paint(() => v.box(gx - 5, 8, -4, gx + 5, 9, 4, C.gold));
        v.box(gx - 2, 7, -5, gx + 2, 10, -5, C.gold); v.box(gx - 3, 8, -6, gx + 3, 9, -6, shade(C.gold, 0.9));
        v.project(['W.....W', 'WW...WW', '.WW.WW.'], { W }, gx - 3, 12);
        // long sleeves, hands clapped together in delight
        for (const s of [-1, 1]) {
          v.box(gx + s * 5, 7, -1, gx + s * 6, 11, 1, kimono);
          v.line(gx + s * 5, 11, 0, gx + s * 2, 10, 4, kimono, 1);
        }
        v.box(gx - 1, 10, 5, gx + 1, 11, 5, C.skin);
        // head + bob hair
        v.sphere(gx, 16, 0, 5.5, C.skin);
        v.shape(gx - 7, 12, -7, gx + 7, 23, 7, (x, y, z) => {
          const dx = x - gx;
          const d = (Math.abs(dx) / 6.3) ** 2.5 + (Math.abs(z + 0.3) / 6.2) ** 2.5 + (Math.abs(y - 16.8) / 6.2) ** 2.5;
          return d <= 1 && (y >= 17 || z <= 0 || Math.abs(dx) >= 4);
        }, (x, y, z) => (y === 20 && z >= 0 ? 0x54434a : hair));
        v.project(['K...K', 'K...K'], { K }, gx - 2, 15);
        v.project(['P.......P', '....M....'], { P: C.blush, M: C.mouth }, gx - 4, 13);
        v.box(gx + 4, 20, 3, gx + 5, 21, 3, C.red); v.set(gx + 5, 20, 4, C.yellow);
      },
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'nekomata', name: 'Dancing Nekomata', jp: '踊る猫又', rarity: 'ultra',
      desc: 'Live to 100, grow a second tail, put a towel on your head and dance. Cat rules.',
      build(v) {
        const blk = 0x2b2833, wht = 0xf7f3ee, ghost = 0x2f86d8, ghostCore = 0xa8e4ff;
        // round mossy base
        v.cylinder(0, 0, 0, 11, 2, 0x5a5668);
        v.cylinder(0, 2, 0, 10.5, 1, 0x557a3f);
        tint(v, (x, y, z) => y === 2 && hash(x, y, z) < 0.25, 0x6e9450);
        tint(v, (x, y, z) => y <= 1 && hash(x, z, y) < 0.3, 0x4a4757);
        // andon lamp (cats love licking the lamp oil)
        const ax = -7, az = -4;
        v.box(ax - 2, 3, az - 2, ax + 2, 3, az + 2, C.woodDark);
        v.box(ax - 2, 4, az - 2, ax + 2, 10, az + 2, glow(0xd88a2a));
        v.box(ax - 2, 11, az - 2, ax + 2, 11, az + 2, C.woodDark);
        for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) v.box(ax + dx, 3, az + dz, ax + dx, 11, az + dz, C.woodDark);
        v.paint(() => v.box(ax - 2, 7, az - 2, ax + 2, 7, az + 2, C.woodDark));
        v.box(ax, 12, az - 2, ax, 13, az - 2, C.woodDark); v.box(ax, 12, az + 2, ax, 13, az + 2, C.woodDark);
        v.box(ax, 13, az - 1, ax, 13, az + 1, C.woodDark);
        // fish bones (evidence)
        v.layer(['K..K.K.KK.', '.KKKKKKKKK', 'K..K.K.KK.'], { K: 0xf2ece0 }, { x: -2, y: 3, z: 5, plane: 'xz' });
        v.set(7, 3, 6, K);
        // legs
        for (const s of [-1, 1]) {
          v.cylinder(s * 2.5, 3, 0, 1.5, 5, blk);
          v.ellipsoid(s * 2.5, 3.5, 1.5, 1.6, 0.8, 2.2, wht);
        }
        // two tails, each carrying a ghost flame
        const tips = [];
        for (const s of [-1, 1]) {
          let last;
          for (let i = 0; i <= 16; i++) {
            const t = i / 16;
            const x = s * (1 + 8.5 * Math.sin(t * Math.PI / 2));
            const y = 6 + 12 * t * t + 2 * t;
            const z = -3.5 - t * 1.5;
            v.sphere(x, y, z, 1.35 - t * 0.35, t > 0.9 ? wht : blk);
            last = [Math.round(x), Math.round(y), Math.round(z)];
          }
          tips.push([...last, s]);
        }
        // body
        v.ellipsoid(0, 10.5, 0, 4.5, 4.5, 3.5, blk);
        v.paint(() => v.ellipsoid(0, 10, 3, 3, 3.5, 1.5, wht));
        // arms: one paw up mid-dance, one out to the side
        v.line(4, 12.5, 0, 6.5, 16, 1, blk, 1);
        v.sphere(6.5, 17, 1, 1.3, wht);
        v.line(-4, 12, 0, -6.5, 10.5, 2, blk, 1);
        v.sphere(-7, 10, 2.5, 1.3, wht);
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
        const towel = (x, y, z) => ((x * 3 + y * 5 + z * 7 + 300) % 6 === 0 ? 0xf4f6fb : 0xd8423a);
        const shell = (x, y, z) => {
          const d = (x * x) / 30.25 + ((y - 17.5) ** 2) / 20.25 + ((z - 0.5) ** 2) / 20.25;
          return d > 1 && d <= 1.5;
        };
        v.shape(-8, 13, -6, 8, 24, 7, (x, y, z) => shell(x, y, z) && ((y >= 20 && Math.abs(x) <= 2) || (Math.abs(x) >= 5 && y >= 14 && y <= 21)), towel);
        v.shape(-8, 20, -6, 8, 22, 7, (x, y, z) => shell(x, y, z) && z >= 2 && y === 21, towel);
        v.box(-1, 13, 4, 1, 13, 5, towel); v.set(-2, 12, 5, towel); v.set(2, 12, 5, towel);
        // face
        v.project(['YY...YY', 'YK...KY'], { Y: gloss(0xe8d23a), K }, -3, 19);
        v.project(['.N.', 'M.M'], { N: C.pink, M: K }, -1, 17);
        v.project(['PP.....PP'], { P: C.blush }, -4, 16);
        v.project(['WW.......WW', '...........', 'WW.......WW'], { W: C.lightgray }, -5, 17);
        // ghost flames flickering on the tips of both tails
        for (const [x, y, z] of tips) flame(v, x, y, z, ghost, ghostCore, 1.7);
      },
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'nurikabe', name: 'Nurikabe', jp: 'ぬりかべ', rarity: 'secret',
      desc: 'Blocks your path at night. Tap its feet with a stick and it leaves. It is a wall.',
      build(v) {
        const plaster = 0xebe4d4, plasterS = 0xd8cfbc, tile = gloss(0x4a5262), tileD = gloss(0x3a404e);
        // stubby feet
        for (const s of [-1, 1]) {
          v.ellipsoid(s * 6.5, 1.2, 1, 3, 1.8, 3.2, plasterS);
          v.set(s * 6.5 - 1, 0, 4, shade(plasterS, 0.8)); v.set(s * 6.5 + 1, 0, 4, shade(plasterS, 0.8));
        }
        v.box(-10, -3, -6, 10, -1, 6, null);
        // the wall
        v.box(-11, 3, -3, 11, 21, 3, plaster);
        tint(v, (x, y, z) => y <= 5 && y >= 3, (x, y) => mix(plasterS, 0x9a8e78, (6 - y) * 0.15));
        tint(v, (x, y, z, c) => y > 5 && c === plaster && hash(x, y, z) < 0.08, shade(plaster, 0.95));
        // tile cap
        v.box(-12, 22, -4, 12, 22, 4, tileD);
        v.box(-12, 23, -3, 12, 23, 3, tile);
        v.box(-12, 24, -1, 12, 24, 1, tileD);
        v.box(-12, 25, 0, 12, 25, 0, tile);
        tint(v, (x, y, z, c, m) => y >= 22 && y <= 23 && (x + 20) % 2 === 0 && m === 1, gloss(shade(0x4a5262, 0.82)));
        for (let x = -12; x <= 12; x += 2) { v.set(x, 21, 4, tile); v.set(x, 21, -4, tile); }
        // tiny eyes. that's it. that's the face.
        v.project(['K...K', 'K...K'], { K }, -2, 15);
        // tiny arms
        v.box(-13, 11, 0, -12, 11, 1, plaster); v.box(12, 11, 0, 13, 11, 1, plaster);
        // somebody already tried an exorcism talisman. no effect.
        v.layer(['PPP', 'PRP', 'PKP', 'P.P', 'PKP', 'PPP'], { P: C.paper, R: C.red, K: C.charcoal, '.': null }, { x: -9, y: 19, z: 4 });
        v.set(-8, 16, 4, C.paper);
        // a crack
        v.project(['..k', '.k.', '.k.', 'k..'], { k: 0xb3a990 }, 6, 19);
        // a snail exploring
        const slug = 0xb4a68c;
        v.box(-8, 6, 4, -2, 6, 4, slug); v.box(-1, 6, 4, -1, 7, 4, slug);
        v.box(-1, 8, 4, -1, 8, 4, slug); v.set(-1, 9, 4, K); v.set(0, 8, 4, slug); v.set(0, 9, 4, K);
        v.layer(['.SSS.', 'SdddS', 'SdSdS', 'SddSS', '.SSS.'], { S: gloss(0xc98a4a), d: gloss(0x7a4a26) }, { x: -7, y: 11, z: 5 });
        v.box(-6, 7, 4, -4, 10, 4, 0xc98a4a);
        // walking stick leaning on it
        v.line(9, 0, 6, 9, 13, 4, C.wood);
        v.set(9, 14, 4, C.woodDark);
        // someone drew a love-umbrella (aiaigasa) doodle on its back
        v.project([
          '....H....',
          '....K....',
          '...K.K...',
          '..K...K..',
          '.K.....K.',
          'KKKKKKKKK',
          '....K....',
          '.ss.K.ss.',
          '.ss.K.ss.',
          '....K....',
        ], { K: C.charcoal, H: C.hotpink, s: 0x5a6a9a }, -4, 18, '-z');
        // ivy creeping up the side
        for (let y = 3; y <= 18; y += 3) {
          v.set(-12, y, 2 - (y % 2), C.leaf); v.set(-12, y + 1, 1, C.grassDark);
        }
      },
    },
  ],
};
