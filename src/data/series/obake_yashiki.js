// Series 19 — Obake Yashiki (おばけ屋敷)
// Chibi cast and props of a summer-festival haunted house attraction. Scary-ish. Mostly -ish.
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

/** Deterministic coordinate hash in [0, 1). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const floorClip = (v) => v.box(-40, -12, -40, 40, -1, 40, null);

/** Tube of spheres along a polyline (radius r), colour c or (t)=>colour. */
function tube(v, pts, r, c) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 2));
    for (let k = 0; k <= n; k++) {
      const f = k / n, t = (i + f) / (pts.length - 1);
      v.sphere(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, r, typeof c === 'function' ? c(t) : c);
    }
  }
}

/** Hitodama: a little glowing will-o'-wisp flame with a tail, centred (x, y, z). */
function hitodama(v, x, y, z, col = 0x8ff0ff, eyes = false) {
  const g = glow(col), g2 = glow(mix(col, 0xffffff, 0.55));
  v.sphere(x, y, z, 1.6, g);
  v.set(x, y + 2, z, g).set(x + 1, y + 2, z, g).set(x + 1, y + 3, z, g);
  v.set(x, y, z + 1, g2).set(x - 1, y, z + 1, g2);
  if (eyes) { v.set(x - 1, y, z + 2, K).set(x + 1, y, z + 2, K); }
}

/** Sankaku-zukin: the white triangle headband of a classic yūrei, on the forehead at (y, z). */
function sankaku(v, y, z) {
  v.layer(['WWWWW', '.WWW.', '..W..'], { W }, { x: -2, y, z });
}

export default {
  id: 'obake_yashiki',
  order: 19,
  name: 'Obake Yashiki',
  jp: 'おばけ屋敷',
  tagline: 'The haunted house cast, on duty',
  taglineJp: 'うらめしや～…こわくないよ？',
  price: 600,
  themes: ['spooky', 'weird'],
  card: { bg: '#26203a', accent: '#b6f05a', text: '#f4eee0', accent2: '#ff6a8a', pattern: 'dots' },
  capsule: { colors: [0x6a3fa0, 0xb6f05a, 0xf5efe0, 0x2a2430, 0xff8a3a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'bikkuri', name: 'Pop-Up Kasa-obake', jp: 'びっくり唐傘', rarity: 'common',
      desc: 'Springs out at exactly the wrong moment. Practises its "boo" in the mirror.',
      build(v) {
        const wd = 0x9a6a40, wdD = 0x6a4428, wdL = 0xc4925c;
        // jack-in-the-box crate with the lid flung open behind
        v.box(-5, 0, -5, 5, 7, 5, wd);
        v.paint(() => {
          for (const y of [0, 7]) v.box(-5, y, -5, 5, y, 5, wdD);
          for (const x of [-5, 5]) v.box(x, 0, -5, x, 7, -5, wdD).box(x, 0, 5, x, 7, 5, wdD);
          v.box(-4, 3, 5, 4, 3, 5, wdL); v.box(-4, 3, -5, 4, 3, -5, wdL);
        });
        v.project(['.RR.', '.RR.', '.RR.', '....', '.RR.'], { R: C.red }, -2, 6); // painted "!"
        v.box(-4, 7, -4, 4, 7, 4, gloss(0x1a1420));
        v.box(-5, 8, -7, 5, 15, -6, wd);
        v.paint(() => v.box(-4, 9, -6, 4, 14, -6, 0xb8343a));
        v.paint(() => v.shape(-4, 9, -6, 4, 14, -6, (x, y) => (x + y) % 3 === 0, 0xd8545a));
        v.cylinder(6, 4, 0, 1, 1, metal(C.brass), 'x'); // crank
        v.box(7, 4, 0, 7, 6, 0, metal(C.brass)).box(7, 6, 0, 8, 6, 0, metal(C.brass)).set(8, 6, 1, gloss(C.red));
        // spring
        for (let y = 8; y <= 12; y++) v.torus(0, y, 0, 1.6, 0.5, metal(C.silver));
        // the umbrella ghost: closed janome kasa, ribbed, one big eye, very long tongue
        const ppr = 0x8a4fc0, pprD = 0x5e3290, pprL = 0xb07ce0;
        v.cone(0, 13, 0, 6, 13, ppr);
        v.cylinder(0, 13, 0, 6, 1, pprD);
        v.recolor((x, y, z, c) => (c === ppr && ((Math.round(Math.atan2(z, x) / (Math.PI / 6)) + 12) % 2) ? pprL : undefined));
        v.paint(() => v.shape(-7, 18, -7, 7, 18, 7, () => true, W)); // white janome ring
        v.set(0, 26, 0, gloss(C.woodDark)).set(0, 27, 0, gloss(C.woodDark));
        v.project(['.WWW.', 'WWKKW', 'WWKKW', '.WWW.'], { W, K }, -2, 17);
        v.project(['W'], { W }, 0, 16);
        v.project(['TT', 'TT', 'TT'], { T: gloss(C.tongue) }, -1, 14, '+z', { raise: true });
        v.box(-1, 11, 6, 0, 13, 6, gloss(C.tongue));
        v.set(-1, 10, 6, gloss(C.hotpink)).set(0, 10, 6, gloss(C.hotpink));
        // rib arms thrown up: "BOO!"
        for (const s of [-1, 1]) { v.line(s * 4, 17, 1, s * 8, 20, 2, C.woodDark); v.set(s * 8, 21, 2, C.woodDark).set(s * 9, 20, 2, C.woodDark); }
        // a torn patch
        v.project(['K.', '.K'], { K: gloss(0x1a1420) }, 2, 22);
        floorClip(v);
      },
    },
    {
      id: 'konnyaku', name: 'Kuroko & Konnyaku', jp: 'こんにゃく係の黒子', rarity: 'common',
      desc: 'Dangles cold konnyaku onto your neck in the dark. Feels terrible about it. Does it anyway.',
      build(v) {
        const blk = 0x2a2632, blkL = 0x3e3848, veil = 0x18161e;
        // round tatami-mat stand
        v.cylinder(0, 0, 0, 7, 1, 0xc8c07a);
        v.paint(() => v.shape(-8, 0, -8, 8, 0, 8, (x, y, z) => Math.hypot(x, z) > 6.2, 0x3a5a3a));
        v.recolor((x, y, z, c) => (y === 0 && c === 0xc8c07a && x % 2 === 0 ? 0xb4ac68 : undefined));
        // robe, feet, belt
        v.ellipsoid(0, 6, 0, 4.6, 5.5, 3.8, blk);
        v.box(-6, -4, -6, 6, 0, 6, null);
        v.box(-3, 1, 2, -1, 1, 4, 0xf4f0e8).box(1, 1, 2, 3, 1, 4, 0xf4f0e8); // white tabi
        v.paint(() => v.box(-5, 6, -4, 5, 6, 4, blkL));
        v.set(0, 6, -5, 0xf4f0e8).set(-1, 7, -5, 0xf4f0e8).set(1, 7, -5, 0xf4f0e8).set(-1, 5, -5, 0xf4f0e8).set(1, 4, -5, 0xf4f0e8); // white cord knot at the back
        // hooded head with the black mesh veil
        v.ellipsoid(0, 14, 0, 5.5, 4.8, 4.8, blk);
        v.ellipsoid(0, 18, -1, 2.5, 1.5, 2.5, blk); // hood peak
        v.paint(() => v.box(-4, 10, 3, 4, 15, 6, veil));
        v.paint(() => v.shape(-4, 10, 3, 4, 15, 6, (x, y) => (x + y) % 2 === 0, 0x24202c));
        v.project(['.W.....W.', 'W.W...W.W'], { W: 0xe8e4f0 }, -4, 14); // happy eyes glinting through the veil
        v.project(['P.......P'], { P: 0x8a4a6a }, -4, 12);
        // arms up holding the bamboo rod
        v.line(-4, 9, 1, 0, 10, 5, blk, 1.2);
        v.line(4, 9, 1, 2, 11, 5, blk, 1.2);
        v.sphere(1, 11, 5.5, 1.2, 0xf4f0e8);
        v.line(-1, 9, 5, 9, 23, 9, C.bamboo);
        v.set(3, 15, 7, C.grassDark).set(6, 19, 8, C.grassDark); // nodes
        // fishing line + the dreaded konnyaku
        v.box(9, 17, 9, 9, 22, 9, glass(0xf0f0f0));
        const kn = gloss(0x9a96a0);
        v.box(7, 11, 8, 11, 16, 9, kn);
        for (const [x, y] of [[7, 11], [11, 11], [7, 16], [11, 16]]) v.box(x, y, 8, x, y, 9, null);
        v.paint(() => v.shape(7, 11, 8, 11, 16, 9, (x, y, z) => hash(x, y, z, 6) < 0.14, gloss(0x6e6a74)));
        v.set(8, 15, 10, gloss(0xe8e8f0)).set(9, 10, 9, glass(0xbfe8ff)).set(9, 9, 9, glass(0xbfe8ff)); // drip
        // nervous sweat drop
        v.set(5, 16, 2, glass(0x9fe3ff)).set(5, 15, 2, glass(0x9fe3ff)).set(6, 15, 2, glass(0x9fe3ff));
        floorClip(v);
      },
    },
    {
      id: 'chochin', name: 'Chōchin-obake Signpost', jp: '道案内ちょうちん', rarity: 'common',
      desc: 'Lights the way to the exit. The exit is that way. No, the other way. Hee hee.',
      build(v) {
        const paper = 0xf4dca8, rib = 0xa8784a, cap = gloss(0x2a1c1c);
        // mossy stone base + bent bamboo post
        v.ellipsoid(-4, 0, 0, 5, 2.5, 4.5, 0x8a8680);
        v.recolor((x, y, z) => (hash(x, y, z, 2) < 0.3 ? 0x6e6a66 : y >= 2 && hash(x, y, z, 3) < 0.35 ? C.moss : undefined));
        v.box(-5, 2, 0, -4, 24, 1, C.bamboo);
        v.paint(() => { for (const y of [7, 13, 19]) v.box(-5, y, 0, -4, y, 1, C.grassDark); });
        v.box(-5, 24, 0, 5, 25, 1, C.bamboo);
        v.set(5, 23, 0, C.woodDark).set(5, 22, 0, C.woodDark);
        // wooden arrow sign
        v.layer(['.WWWWWW.', 'WWRRRRWW', 'WWWWWWRW', 'WWRRRRWW', '.WWWWWW.'].map((r, i) => (i === 1 || i === 3 ? r : r)), { W: 0xc89a62, R: C.red }, { x: -14, y: 13, z: 1 });
        v.set(-6, 11, 1, 0xc89a62).set(-7, 11, 1, 0xc89a62);
        v.layer(['....R...', '.....R..', 'RRRRRRR.', '.....R..', '....R...'], { R: C.red }, { x: -14, y: 13, z: 2 });
        // the lantern ghost
        const cx = 5, cy = 14;
        v.cylinder(cx, cy + 6, 0, 2.5, 1, cap);
        v.cylinder(cx, cy - 7, 0, 2.5, 1, cap);
        v.ellipsoid(cx, cy, 0, 5, 6.3, 4.6, paper);
        v.recolor((x, y, z, c) => (c === paper && (y - cy + 20) % 2 === 0 ? rib : undefined));
        // big eye + small eye + torn grinning mouth with tongue
        v.project(['.WWW..', 'WKKWW.', 'WKKW..', '.WW...'], { W, K }, cx - 4, cy + 4);
        v.project(['KK', 'KK'], { K }, cx + 2, cy + 3);
        v.project(['KKKKKKK', 'KOOOOOK', '.KOOOK.'], { K, O: glow(0xffb040) }, cx - 3, cy - 1);
        v.box(cx, cy - 4, 5, cx + 1, cy - 2, 5, gloss(C.tongue));
        v.box(cx, cy - 6, 5, cx + 1, cy - 5, 6, gloss(C.tongue));
        v.set(cx, cy - 7, 6, gloss(C.hotpink));
        v.project(['K', 'K'], { K: gloss(0x3a2a20) }, cx + 3, cy - 3); // paper tear
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ uncommon
    {
      id: 'rokurokubi', name: 'Rokurokubi-san', jp: 'ろくろ首さん', rarity: 'uncommon',
      desc: 'Stretches her neck to peek over the partition. Has tied it in a bow. Again.',
      build(v) {
        const kim = 0x7a5cc8, kimD = 0x56409a, obi = 0xd8343a, skin = C.skin, hair = 0x1e1a26;
        // zabuton
        v.box(-7, 0, -6, 7, 1, 7, 0x9a2a4a);
        v.paint(() => { v.box(-7, 1, -6, 7, 1, 7, 0xb83a5e); v.box(-6, 1, -5, 6, 1, 6, 0xc84a6e); });
        for (const [x, z] of [[-6, -5], [6, -5], [-6, 6], [6, 6], [0, 0]]) v.set(x, 2, z, 0xffd23f);
        // kneeling body in a dotted kimono with obi
        v.ellipsoid(0, 6, 0, 5.5, 4.5, 5, kim);
        v.ellipsoid(0, 3, 2, 5.5, 2.2, 4.4, kim);
        v.box(-7, -4, -7, 7, 1, 8, null);
        v.recolor((x, y, z, c) => (c === kim && y % 3 === 0 && (x + z + 40) % 4 === 0 ? 0xf4ecff : undefined));
        v.paint(() => v.box(-6, 6, -6, 6, 7, 6, obi));
        v.paint(() => v.box(-1, 6, 5, 1, 7, 6, 0xffd23f));
        v.layer(['W.W', '.W.'], { W: 0xf4ecff }, { x: -1, y: 10, z: 3 }); // collar
        v.set(-1, 10, 3, kimD).set(1, 10, 3, kimD);
        // hands holding a little yunomi on the lap
        v.sphere(-2, 4, 6, 1, skin).sphere(2, 4, 6, 1, skin);
        v.cylinder(0, 4, 6.5, 1.2, 2, gloss(0x5a8a6a));
        v.set(0, 6, 7, 0x9ac87a);
        // the very long neck: up, a full loop, a bow, then up to the head
        const loop = [];
        for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + (i / 16) * Math.PI * 2; loop.push([-3 + Math.cos(a) * 3.6, 15 + Math.sin(a) * 3.6, -2]); }
        tube(v, [[0, 9, 0], [0, 11, -1], [-1, 11.4, -2], ...loop, [0, 15, -1.5], [1.5, 18, -0.5], [2, 20, 0.5]], 1, skin);
        // little red ribbon tied on the loop
        v.set(-7, 15, -2, C.red).set(-8, 16, -2, C.red).set(-8, 14, -2, C.red).set(-7, 14, -1, C.red).set(-7, 16, -1, C.red);
        // head: bob with bangs, hair bun + kanzashi
        const hx = 2, hy = 23, hz = 1;
        v.ellipsoid(hx, hy, hz, 4.8, 4.2, 4.2, skin);
        v.paint(() => {
          v.ellipsoid(hx, hy + 1.5, hz - 1.2, 5.2, 4, 4.6, hair);
        });
        v.paint(() => v.box(hx - 5, hy - 4, hz - 6, hx + 5, hy + 1, hz - 2, hair));
        v.sphere(hx, hy + 5, hz - 1, 2, hair);
        v.line(hx - 3, hy + 6, hz - 1, hx + 3, hy + 4, hz - 1, metal(C.gold));
        v.sphere(hx + 3.5, hy + 4, hz - 1, 0.8, gloss(C.red));
        v.project(['WK...WK', 'KK...KK'], { K, W }, hx - 3, hy);
        v.project(['P.....P', '...M...'], { P: C.blush, M: C.mouth }, hx - 3, hy - 2);
        v.project(['KKKKKKKKK'], { K: hair }, hx - 4, hy + 2);
        floorClip(v);
      },
    },
    {
      id: 'reizoko', name: 'Haunted Fridge', jp: '冷蔵庫おばけ', rarity: 'uncommon',
      desc: 'Hums at night. Opens by itself. Eats the pudding you were saving. Every time.',
      build(v) {
        const mint = gloss(0x9fd8c4), mintD = gloss(0x78b8a4), chr = metal(C.chrome);
        // stubby legs + body with rounded corners
        for (const [x, z] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) v.box(x, 0, z, x, 1, z, gloss(K));
        v.box(-6, 2, -5, 6, 25, 5, mint);
        for (const x of [-6, 6]) for (const z of [-5, 5]) v.box(x, 2, z, x, 25, z, null);
        for (const x of [-6, 6]) v.box(x, 25, -5, x, 25, 5, null);
        v.box(-6, 25, -5, 6, 25, -5, null).box(-6, 25, 5, 6, 25, 5, null);
        v.paint(() => v.box(-6, 18, 5, 6, 18, 5, mintD)); // door seam
        // freezer door: big googly eyes + grumpy brows + chrome handle
        v.project(['.WWW...WWW.', 'WWWKK.WWWKK', 'WWWKK.WWWKK', '.WWW...WWW.'], { W, K }, -5, 23);
        v.project(['KK.......KK'], { K }, -5, 24);
        v.box(5, 19, 6, 5, 22, 6, chr);
        v.box(-2, 25, -1, 2, 25, 1, chr);
        // the main door hangs open on the right, a shelf of bottles inside
        v.box(-5, 4, 1, 5, 16, 5, null);
        v.box(-5, 4, 0, 5, 16, 0, glow(0xe8fff4));
        v.box(-5, 10, 1, 5, 10, 4, glass(0xffffff));
        v.cylinder(-3, 11, 2, 1, 4, W).set(-3, 15, 2, C.blue); // milk
        v.box(1, 11, 1, 4, 11, 2, 0xf6e8d0); v.set(2, 12, 1, W).set(3, 12, 2, W); // eggs
        v.box(7, 2, 5, 7, 17, 15, mint);
        v.paint(() => v.box(7, 2, 5, 7, 17, 5, mintD));
        v.box(6, 3, 6, 6, 16, 6, mintD);
        for (const y of [5, 10, 14]) v.box(6, y, 7, 6, y, 14, glass(0xd8f4ff));
        v.set(6, 11, 9, gloss(C.red)).set(6, 12, 9, gloss(C.red)).set(6, 11, 12, gloss(C.orange)).set(6, 12, 12, gloss(C.yellow)).set(6, 6, 10, gloss(C.green)).set(6, 7, 10, gloss(C.green));
        v.box(8, 9, 14, 8, 11, 14, chr);
        // teeth (ice cubes) around the "mouth" + a tongue offering the stolen pudding
        for (let x = -5; x <= 5; x += 2) { v.set(x, 16, 5, glass(0xeaf8ff)); v.set(x, 15, 5, glass(0xeaf8ff)); v.set(x, 4, 5, glass(0xeaf8ff)); }
        v.box(-3, 4, 1, 3, 5, 9, gloss(C.tongue));
        v.paint(() => v.box(0, 5, 2, 0, 5, 8, gloss(C.hotpink)));
        v.cylinder(0, 6, 7, 1.6, 3, gloss(0xffd36b));
        v.cylinder(0, 9, 7, 1.2, 1, gloss(0x8a4418));
        v.set(0, 10, 7, gloss(C.red));
        // chilly breath
        for (const [x, y, z] of [[-5, 7, 7], [-6, 9, 8], [-6, 12, 7], [-4, 13, 8]]) v.set(x, y, z, glass(0xdff6ff));
        v.project(['.RR.', 'RRRR', '.RR.'], { R: gloss(0xffd23f) }, -5, 21, '+x'); // fridge magnet
        v.paint(() => v.shape(-4, 5, -5, 4, 22, -5, (x, y) => y % 2 === 0 || Math.abs(x) === 4, gloss(0x3a3a44))); // condenser coils on the back
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ rare
    {
      id: 'okiku', name: "Okiku's Well", jp: 'お菊さんの井戸', rarity: 'rare',
      desc: '...seven, eight, nine... One plate short. Has been for centuries. Please check your bag.',
      build(v) {
        const gnd = 0x4a4458, stone = 0x8e8a96, stoneD = 0x6a6676, wood = 0x6a4a34, woodL = 0x8a6448;
        // night ground with tufts
        v.box(-12, 0, -10, 12, 1, 10, gnd);
        v.paint(() => v.shape(-12, 1, -10, 12, 1, 10, (x, y, z) => hash(x, y, z, 1) < 0.2, 0x3c3648));
        for (const [x, z] of [[-10, 7], [9, 8], [-9, -8], [10, -6], [-4, 9]]) { v.set(x, 2, z, 0x5a7a4a).set(x + 1, 2, z, 0x4a6a3a).set(x, 3, z, 0x6a8a52); }
        // stone well
        v.tube(0, 2, 0, 6.5, 4.5, 7, stone);
        v.recolor((x, y, z, c) => (c === stone && ((y + Math.floor((Math.atan2(z, x) + 4) * 3) % 2) % 2 === 0) ? stoneD : undefined));
        v.recolor((x, y, z, c) => (c === stone && y >= 7 && hash(x, y, z, 3) < 0.3 ? C.moss : undefined));
        v.cylinder(0, 2, 0, 4.5, 5, gloss(0x0e0c16));
        v.cylinder(0, 7, 0, 4, 1, glow(0x4a9ab8));
        // posts, crossbar, little roof + pulley and rope bucket
        v.box(-8, 2, -4, -7, 22, -3, wood).box(7, 2, -4, 8, 22, -3, wood);
        v.box(-9, 22, -4, 9, 22, -3, wood);
        for (let i = 0; i < 4; i++) { v.box(-10 + i, 23 + i, -7 + i, 10 - i, 23 + i, -7 + i, woodL); v.box(-10 + i, 23 + i, 0 - i, 10 - i, 23 + i, 0 - i, woodL); }
        v.box(-7, 26, -4, 7, 26, -3, shade(woodL, 0.8));
        v.cylinder(3, 20, -3, 1.5, 1, metal(C.steel), 'z');
        v.box(4, 9, -3, 4, 19, -3, 0xc8b080);
        v.box(3, 7, -4, 5, 9, -2, wood);
        v.paint(() => v.box(3, 8, -4, 5, 8, -2, metal(C.steel)));
        // Okiku rising out of the well
        const kim = 0xf6f4f0, kimS = 0xd8d8e4, skin = 0xf2eef0, hair = 0x1a1622;
        v.cone(0, 6, 0, 3, 5, kim);
        v.ellipsoid(0, 12, 0.5, 3.8, 3.6, 3, kim);
        v.paint(() => v.box(-4, 11, -3, 4, 11, 4, kimS));
        v.layer(['W.W', '.K.'], { W: kimS, K: kimS }, { x: -1, y: 15, z: 3 });
        v.ellipsoid(0, 19, 0.5, 4.2, 3.8, 3.8, skin);
        v.paint(() => v.ellipsoid(0, 20, -1, 4.6, 3.6, 4, hair));
        v.paint(() => v.box(-5, 14, -5, 5, 19, -2, hair));
        for (const s of [-1, 1]) v.box(s * 4, 13, -1, s * 4, 19, 1, hair); // long side hair
        v.paint(() => v.box(-3, 22, 3, 3, 23, 5, hair));
        sankaku(v, 22, 5);
        v.project(['KK...KK', '.......', 'P..M..P'], { K, P: C.blush, M: K }, -3, 19);
        // limp "urameshiya" hands holding plates
        v.line(-3, 13, 2, -3, 12, 5, kim, 1);
        v.line(3, 13, 2, 3, 12, 5, kim, 1);
        v.set(-3, 11, 6, skin).set(3, 11, 6, skin);
        for (let i = 0; i < 4; i++) v.cylinder(-4, 9 + i, 6, 1.6, 1, gloss(i % 2 ? 0x3a6ab8 : 0xf4f6fa));
        v.cylinder(4, 10, 6, 1.8, 1, gloss(0xf4f6fa));
        v.set(4, 11, 6, gloss(0x3a6ab8));
        // plates counted out on the well rim + two hitodama
        for (const [x, z] of [[-5, 4], [5, 3], [-6, -1]]) { v.cylinder(x, 9, z, 1.5, 1, gloss(0xf4f6fa)); v.set(x, 9, z, gloss(0x3a6ab8)); }
        hitodama(v, -9, 15, 4, 0x8ff0ff, true);
        hitodama(v, 10, 11, 5, 0xa8ffb8);
        v.box(-9, 2, 4, -9, 13, 4, glass(0xeaf8ff));
        v.box(10, 2, 5, 10, 9, 5, glass(0xeaf8ff));
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ ultra
    {
      id: 'yashiki', name: 'Haunted House Entrance', jp: '屋敷のいりぐち', rarity: 'ultra',
      desc: 'Enter if you dare. Exit through the gift shop. Scream optional but appreciated.',
      build(v) {
        const gnd = 0x3e3850, path = 0x8a8496, wall = 0x4e3c30, wallL = 0x6a5240, tile = 0x3a4256, tileL = 0x55607a;
        // ground + stepping-stone path
        v.box(-13, 0, -11, 13, 1, 12, gnd);
        v.paint(() => v.shape(-13, 1, -11, 13, 1, 12, (x, y, z) => hash(x, y, z, 2) < 0.22, 0x332e44));
        for (const [x, z] of [[0, 4], [-1, 7], [1, 10]]) v.box(x - 1, 1, z - 1, x + 1, 2, z, path);
        // the old house: stone footing, weathered boards
        v.box(-11, 2, -10, 8, 3, 2, 0x6a6676);
        v.box(-11, 4, -10, 8, 17, 2, wall);
        v.paint(() => v.shape(-11, 4, -10, 8, 17, 2, (x, y, z) => (x + 40) % 3 === 0 || hash(x, y, z, 3) < 0.08, wallL));
        v.paint(() => v.box(-11, 17, -10, 8, 17, 2, 0x2e2420));
        // crooked tiled roof (sags to one side), ridge, broken hole
        for (let i = 0; i <= 6; i++) {
          const y = 18 + i, sag = i >= 3 ? 1 : 0;
          v.box(-13 + i, y - (i > 4 ? 0 : 0), -12 + i, 10 - i + sag, y, 4 - i, tile);
        }
        v.paint(() => v.shape(-13, 18, -12, 11, 24, 4, (x, y, z) => (x + y + 40) % 2 === 0, tileL));
        v.box(-7, 25, -5, 4, 25, -3, gloss(0x2a3040));
        v.set(-7, 26, -4, gloss(0x2a3040)).set(-8, 27, -4, gloss(0x2a3040)).set(4, 26, -4, gloss(0x2a3040)).set(5, 27, -4, gloss(0x2a3040));
        v.box(2, 21, 1, 4, 22, 2, null); v.box(2, 20, 1, 4, 20, 2, 0x1a1420);
        // entrance with torn noren
        v.box(-3, 4, 2, 2, 12, 2, gloss(0x120e18));
        v.box(-4, 13, 3, 3, 13, 3, wallL);
        for (let x = -3; x <= 2; x++) { const len = x === -1 ? 2 : x === 1 ? 3 : 4; v.box(x, 13 - len, 3, x, 12, 3, x % 2 ? 0x5a2a7a : 0x6a3a8a); }
        v.project(['.W.', 'WKW'], { W: 0xf4ecff, K: 0x6a3a8a }, -1, 12);
        // signboard with drippy red writing
        v.box(-6, 14, 3, 5, 16, 3, 0xc8a878);
        v.project(['.RR.R.RR.RR.', 'R.R.R.R..R..', '.R.......R..'], { R: C.red }, -6, 16);
        v.set(-4, 13, 3, C.red).set(2, 13, 3, C.red);
        // glowing shoji windows: torn holes, one with a peeking eye, one with a silhouette
        for (const wx of [-9, 4]) {
          v.box(wx, 7, 2, wx + 3, 11, 2, glow(0xd8f0a0));
          v.paint(() => { v.box(wx, 9, 2, wx + 3, 9, 2, 0x3a2a20); v.box(wx + 1, 7, 2, wx + 1, 11, 2, 0x3a2a20); v.box(wx + 3, 7, 2, wx + 3, 11, 2, 0x3a2a20); });
        }
        v.set(-9, 10, 2, gloss(0x120e18)).set(-8, 11, 2, gloss(0x120e18));
        v.set(-8, 8, 2, W).set(-7, 8, 2, K);
        v.box(5, 7, 2, 6, 10, 2, 0x5a6a3a); v.set(5, 11, 2, 0x5a6a3a);
        // paper lanterns along the eaves
        for (const x of [-10, -6, 3, 7]) { v.box(x, 15, 4, x, 16, 4, glow(0xff8a3a)); v.set(x, 17, 4, gloss(K)); }
        v.box(-10, 17, 4, 7, 17, 4, 0x2e2420);
        // ticket booth with a sheet-ghost attendant
        v.box(9, 2, 3, 12, 9, 7, 0x7a2a3a);
        v.paint(() => v.box(9, 2, 3, 12, 3, 7, 0x5a1a2a));
        v.box(9, 6, 7, 12, 8, 7, glass(0xcfe8ff));
        v.box(10, 6, 5, 11, 7, 6, W).set(10, 8, 5, W).set(11, 8, 5, W);
        v.set(10, 7, 6, K).set(11, 7, 6, K);
        v.box(8, 10, 2, 13, 10, 8, 0x3a1a2a);
        v.box(9, 11, 3, 12, 11, 7, 0xb83a4a);
        // weeping willow on the left
        v.box(-13, 2, 6, -12, 20, 7, 0x3a3030);
        v.line(-12, 18, 6, -8, 22, 5, 0x3a3030, 0.6);
        v.ellipsoid(-10, 23, 6, 4, 2, 3, 0x6a8a5a);
        for (const [x, z, l] of [[-13, 4, 9], [-11, 8, 11], [-8, 5, 8], [-9, 8, 12], [-14, 7, 7], [-7, 7, 10], [-12, 4, 6]]) v.box(x, 23 - l, z, x, 22, z, (x + z) % 2 ? 0x7a9a62 : 0x5a7a4a);
        // hitodama
        hitodama(v, -6, 21, 7, 0x8ff0ff, true);
        v.box(-6, 2, 7, -6, 19, 7, glass(0xeaf8ff));
        hitodama(v, 10, 15, 9, 0xa8ffb8);
        v.box(10, 11, 9, 10, 13, 9, glass(0xeaf8ff));
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'kyukei', name: 'Yūrei on Lunch Break', jp: '休憩中のゆうれい', rarity: 'secret',
      desc: 'Clocked out at the stroke of midnight. Technically still haunting. Mostly snacking.',
      build(v) {
        const kim = 0xf4f4fa, kimS = 0xe2e4f0, skin = 0xeaf0fa, hair = 0x1a1622;
        // backstage floor with caution tape edge
        v.box(-12, 0, -9, 12, 1, 9, 0x8a8890);
        v.paint(() => v.shape(-12, 1, -9, 12, 1, 9, (x, y, z) => hash(x, y, z, 1) < 0.15, 0x76747c));
        v.paint(() => v.shape(-12, 0, -9, 12, 1, 9, (x, y, z) => Math.abs(x) === 12 || Math.abs(z) === 9, (x, y, z) => ((x + z + 40) >> 1) % 2 ? gloss(0xf7c934) : gloss(0x23202a)));
        // folding pipe chair
        const pipe = metal(C.steel), seat = gloss(0x8a4a30);
        for (const [x, z] of [[-4, -3], [3, -3], [-4, 3], [3, 3]]) v.box(x, 2, z, x, 7, z, pipe);
        v.box(-4, 8, -3, 3, 8, 3, seat);
        v.box(-4, 9, -4, -4, 16, -4, pipe).box(3, 9, -4, 3, 16, -4, pipe);
        v.box(-4, 13, -4, 3, 16, -4, seat);
        // the ghost, sitting: tail draped over the seat, white kimono, triangle headband
        v.ellipsoid(-0.5, 12, 0, 3.8, 3.6, 3.2, kim);
        v.paint(() => v.box(-5, 11, -4, 4, 11, 4, kimS));
        v.line(-0.5, 9, 2, -1, 8, 5, kim, 1.6);
        v.line(-1, 8, 5, -1, 4, 6, kim, 1.2);
        v.line(-1, 4, 6, 0, 2, 7, kim, 0.8);
        v.set(1, 2, 8, kim);
        v.layer(['W.W', '.K.'], { W: kimS, K: kimS }, { x: -2, y: 15, z: 3 });
        const hx = -0.5;
        v.ellipsoid(hx, 19, 0.5, 4.2, 3.8, 3.8, skin);
        v.paint(() => v.ellipsoid(hx, 20, -1, 4.6, 3.6, 4, hair));
        v.paint(() => v.box(hx - 5, 15, -5, hx + 5, 19, -2, hair));
        for (const s of [-1, 1]) v.box(Math.round(hx + s * 4), 14, -1, Math.round(hx + s * 4), 19, 0, hair);
        v.paint(() => v.box(hx - 3, 22, 3, hx + 3, 23, 5, hair));
        v.layer(['WWWWW', '.WWW.', '..W..'], { W }, { x: -3, y: 22, z: 5 });
        // happy munching face
        v.project(['.K...K.', 'K.K.K.K', '.......', 'PP.M.PP', '...T...'], { K, P: C.blush, M: K, T: C.tongue }, -4, 20);
        // onigiri in one hand, hot canned tea on the table
        v.line(-4, 13, 1, -4, 15, 4, kim, 1);
        v.layer(['..W..', '.WWW.', 'WWWWW', 'WNNNW', 'WNNNW'], { W: C.rice, N: C.nori }, { x: -7, y: 19, z: 5, depth: 2 });
        v.set(-4, 19, 5, null).set(-4, 19, 4, null).set(-3, 18, 5, null).set(-3, 18, 4, null);
        v.line(3, 13, 1, 4, 12, 4, kim, 1);
        // little folding table: phone with a glowing screen, canned tea, a hitodama napping
        v.box(6, 2, -1, 6, 8, -1, pipe).box(11, 2, -1, 11, 8, -1, pipe).box(6, 2, 5, 6, 8, 5, pipe).box(11, 2, 5, 11, 8, 5, pipe);
        v.box(5, 9, -2, 12, 9, 6, gloss(0xe8e2d4));
        v.box(7, 10, 2, 9, 10, 5, gloss(0x24202c));
        v.box(7, 11, 2, 9, 11, 4, glow(0x7fd8ff));
        v.set(8, 11, 3, glow(0xffffff));
        v.cylinder(11, 10, 4, 1, 3, gloss(0xc8343a));
        v.set(11, 13, 4, metal(C.silver));
        hitodama(v, 9, 12.5, -1, 0x8ff0ff, false);
        v.set(8, 12, 1, K).set(10, 12, 1, K); // sleepy eyes
        v.set(11, 16, -1, glow(0xd8f8ff)).set(12, 17, -1, glow(0xd8f8ff)).set(12, 18, -1, glow(0xd8f8ff)).set(13, 18, -1, glow(0xd8f8ff)); // z
        // "on break" A-frame sign with a teacup icon
        v.box(-11, 2, 3, -6, 9, 3, 0xf4f0e8);
        v.box(-11, 2, 2, -11, 9, 2, C.woodDark).box(-6, 2, 2, -6, 9, 2, C.woodDark);
        v.project(['..s.s.', '.s.s..', '.RRRR.', '.RRRRR', '.RRRR.', '..RR..'], { R: C.red, s: 0x9a9aa8 }, -11, 8);
        v.project(['GGGG'], { G: C.green }, -10, 3);
        floorClip(v);
      },
    },
  ],
};
