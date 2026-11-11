// Series 9 — Dajare Daisakusen (ダジャレ大作戦)
// Japanese pun dioramas ("oyaji gags"). Each figure acts out its own terrible joke.
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

/** Deterministic 0..1 hash of integer coordinates. */
function hash(x, y, z = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Recolour only voxels that pass test(x,y,z,colour,mat). */
function tint(v, test, c) {
  v.recolor((x, y, z, col, mat) => (test(x, y, z, col, mat) ? (typeof c === 'function' ? c(x, y, z, col) : c) : undefined));
}

// ------------------------------------------------------------- little breads
function melonPan(v, x, y, z) {
  v.ellipsoid(x, y, z, 1.8, 1.1, 1.8, 0xf2cf72);
  v.paint(() => v.shape(x - 2, y, z - 2, x + 2, y + 2, z + 2, (a, b, c) => (a + c + 40) % 2 === 0, 0xffe6a0));
}
function anpan(v, x, y, z) {
  v.ellipsoid(x, y, z, 1.7, 1.1, 1.7, gloss(0xa8622a));
  v.set(x, y + 1, z, 0xfff6e0);
}
function croissant(v, x, y, z) {
  const a = 0xe2a24a, b = 0xc27a2a;
  v.set(x - 2, y, z + 1, b); v.set(x + 2, y, z + 1, b);
  v.box(x - 1, y, z, x - 1, y + 1, z, a); v.box(x, y, z, x, y + 1, z, b); v.box(x + 1, y, z, x + 1, y + 1, z, a);
  v.set(x, y, z + 1, a);
}
function pandaBun(v, x, y, z) {
  v.ellipsoid(x, y + 0.5, z, 2, 1.4, 2, 0xfbf4ea);
  v.set(x - 2, y + 2, z - 1, K); v.set(x + 2, y + 2, z - 1, K);
  v.set(x - 1, y + 1, z + 2, K); v.set(x + 1, y + 1, z + 2, K);
  v.set(x, y, z + 2, C.pink);
}
function shokupan(v, x, y, z) {
  v.box(x - 1, y, z - 1, x + 1, y + 1, z + 1, 0xf6e5c2);
  v.box(x - 1, y + 2, z - 1, x + 1, y + 2, z + 1, 0xc8853f);
  v.paint(() => v.box(x - 1, y, z - 1, x + 1, y + 1, z - 1, 0xd9a05a));
}

export default {
  id: 'dajare',
  order: 9,
  name: 'Dajare Daisakusen',
  jp: 'ダジャレ大作戦',
  tagline: 'Terrible Japanese puns, in tiny 3D',
  taglineJp: 'さむい！でもクセになる。',
  price: 500,
  themes: ['weird', 'cute'],
  card: { bg: '#fff3cf', accent: '#ff6b35', text: '#3a2410', accent2: '#2fb5a6', pattern: 'checker' },
  capsule: { colors: [0xffd23f, 0xff8c2e, 0x5cc4ff, 0xffffff, 0x9bd94a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'mikan', name: 'Mikan on an Alumi-can', jp: 'アルミ缶の上にあるミカン', rarity: 'common',
      desc: "Arumikan no ue ni aru mikan: 'there's a mikan on the aluminium can.' Say it fast.",
      build(v) {
        const AL = gloss(0xd8dde5), ALd = gloss(0xaeb6c2), lab = gloss(0x2f8fd6), labD = gloss(0x24639a);
        // the can
        v.cylinder(0, 1, 0, 5, 14, AL);
        v.cylinder(0, 0, 0, 4, 1, ALd);
        v.cylinder(0, 15, 0, 4, 1, AL);
        v.tube(0, 16, 0, 4, 3, 1, ALd);
        v.cylinder(0, 15, 0, 3, 1, ALd);
        // printed label: blue with a white fizz band and a citrus badge
        v.paint(() => v.box(-6, 3, -6, 6, 12, 6, lab));
        v.paint(() => v.box(-6, 3, -6, 6, 3, 6, labD));
        v.paint(() => v.shape(-6, 6, -6, 6, 8, 6, (x, y, z) => y === 7 || (y === 6 && (x + z + 20) % 3 === 0) || (y === 8 && (x - z + 20) % 3 === 1), gloss(W)));
        v.project(['.OOO.', 'OyWyO', 'OWWWO', 'OyWyO', '.OOO.'], { O: gloss(C.orange), y: gloss(0xffc060), W: gloss(0xfff4e0) }, -2, 12);
        v.project(['G', 'G'], { G: gloss(C.leaf) }, 2, 13);
        v.project(['.W.W.W.'], { W: gloss(W) }, -3, 4);
        // condensation droplets
        for (const [x, y, z] of [[-3, 10, 5], [3, 5, 5], [4, 13, 4], [-5, 5, 2], [1, 2, 6], [5, 9, -2]]) v.set(x, y, z, glass(0xe8f8ff));
        // the mikan, very pleased with itself
        const M = gloss(0xff9a1f);
        v.ellipsoid(0, 20, 0, 5.3, 4.3, 5.3, M);
        tint(v, (x, y, z, c, m) => y >= 16 && m === 1 && c === 0xff9a1f && hash(x, y, z) < 0.22, gloss(0xf08612));
        v.paint(() => v.box(-1, 24, -1, 1, 24, 1, gloss(0x7a8a2a)));
        v.box(0, 25, 0, 0, 25, 0, 0x5a6a22);
        v.layer(['.GG', 'GgG', 'GG.'], { G: C.leaf, g: C.lime }, { x: 1, y: 25, z: -1, plane: 'xz' });
        v.project(['KW...KW', 'KK...KK'], { K, W }, -3, 22);
        v.project(['PP.......PP', '....M.M....', '.....M.....'], { P: C.blush, M: K }, -5, 20);
      },
    },
    {
      id: 'neko', name: 'The Cat Lay Down', jp: 'ネコがねころんだ', rarity: 'common',
      desc: 'Neko ga nekoronda: the cat (neko) lay down (nekoronda). It is not getting up.',
      build(v) {
        const cush = 0x3d4f9a, cushL = 0x6274c4, fur = 0xf2a04a, stripe = 0xd27a2a, belly = 0xfff4e4;
        // zabuton cushion
        v.box(-10, 0, -8, 10, 2, 8, cush);
        v.ellipsoid(0, 2, 0, 9.5, 2.2, 7.5, cush);
        v.box(-11, -3, -9, 11, -1, 9, null);
        tint(v, (x, y, z) => y === 1 && (Math.abs(x) === 10 || Math.abs(z) === 8), cushL);
        tint(v, (x, y, z, c) => c === cush && y >= 2 && (x * 3 + z * 5 + 99) % 7 === 0, 0xe8ecf8);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          v.box(sx * 11, 1, sz * 9, sx * 11, 2, sz * 9, gloss(C.gold));
          v.set(sx * 11, 0, sz * 9, gloss(shade(C.gold, 0.85)));
        }
        // belly-up cat
        v.ellipsoid(1.5, 7, 0, 6.5, 3.2, 4.2, fur);
        v.paint(() => v.ellipsoid(1.5, 9.5, 0.5, 5, 1.6, 3.4, belly));
        tint(v, (x, y, z, c) => c === fur && y <= 9 && (x + 30) % 3 === 0, stripe);
        // paws in the air with pink toe beans
        for (const [px, pz, h] of [[-2, 2, 13], [-2, -2, 12], [5, 2, 12], [5, -2, 11]]) {
          v.box(px, 9, pz - 1, px + 1, h - 1, pz, fur);
          v.box(px, h, pz - 1, px + 1, h, pz, W);
          v.set(px, h + 1, pz, C.pink);
        }
        // tail flopped over the edge
        v.line(8, 6, 0, 11, 5, 3, fur, 1);
        v.line(11, 5, 3, 12, 1, 5, fur, 0.8);
        tint(v, (x, y, z, c) => c === fur && x >= 9 && (y + x) % 2 === 0, stripe);
        // head
        v.sphere(-6, 8, 0.5, 4.3, fur);
        tint(v, (x, y, z, c) => c === fur && x <= -3 && y >= 11 && (x + 30) % 2 === 0 && z <= 2, stripe);
        for (const ex of [-8, -4]) {
          v.box(ex - 1, 12, 0, ex + 1, 12, 1, fur); v.box(ex, 13, 0, ex, 13, 1, fur);
          v.set(ex, 12, 2, C.pink);
        }
        v.paint(() => v.ellipsoid(-6, 6.5, 4, 2.5, 1.6, 1.2, belly));
        v.project(['K.K.K.K', '.K...K.'], { K }, -9, 9);
        v.project(['...N...', 'PP...PP', '..M.M..', '...M...'], { N: C.hotpink, P: C.blush, M: K }, -9, 7);
        v.project(['WW.....WW', '.........', 'WW.....WW'], { W: C.lightgray }, -10, 7);
        // a snot bubble, as is tradition
        v.sphere(-4, 6, 6, 1.4, glass(0xdff4ff));
      },
    },
    {
      id: 'kaeru', name: 'The Frog Goes Home', jp: 'カエルがかえる', rarity: 'common',
      desc: 'Kaeru ga kaeru: the frog (kaeru) goes home (kaeru). Otsukaresama!',
      build(v) {
        const G = 0x6cc04a, GD = 0x4a9a3a, belly = 0xf4f0c0, red = C.red;
        // webbed feet
        for (const s of [-1, 1]) {
          v.ellipsoid(s * 3.5, 0.5, 2.5, 2.4, 0.7, 2.6, GD);
          for (const dx of [-2, 0, 2]) v.box(s * 3.5 + dx, 0, 5, s * 3.5 + dx, 0, 6, GD);
          v.ellipsoid(s * 4.5, 3.5, 0, 2, 2.5, 2.8, G);
        }
        // body + head
        v.ellipsoid(0, 7.5, 0, 5.3, 5.5, 4.3, G);
        v.paint(() => v.ellipsoid(0, 6.5, 3.5, 3.8, 4, 1.6, belly));
        v.ellipsoid(0, 13.5, 0.5, 6.5, 3.8, 5, G);
        // bulging eyes
        for (const s of [-1, 1]) {
          v.sphere(s * 4, 17, 1.5, 2.3, G);
          v.project(['WWW', 'WKW', 'WKK'].map((r) => (s < 0 ? r : [...r].reverse().join(''))), { W, K }, s * 4 - 1, 18);
        }
        // big smile
        v.project(['M.........M', '.MMMMMMMMM.'], { M: shade(GD, 0.6) }, -5, 13);
        v.project(['PP.......PP'], { P: C.blush }, -5, 14);
        // travel bandana
        v.paint(() => v.box(-7, 10, -6, 7, 10, 6, red));
        v.project(['RRRRRRR', '.RRWRR.', '..RRR..', '...R...'], { R: red, W }, -3, 10, '+z', { raise: true });
        // left hand waving goodbye
        v.line(-5, 10, 1, -8, 14, 2, G, 1);
        v.box(-9, 15, 2, -9, 16, 2, G); v.box(-8, 16, 2, -8, 17, 2, G); v.box(-10, 15, 2, -10, 15, 2, G);
        v.set(-9, 17, 2, GD); v.set(-8, 18, 2, GD); v.set(-11, 15, 2, GD);
        // right hand gripping the suitcase
        v.line(5, 10, 1, 8, 9, 1, G, 1);
        // retro suitcase covered in stickers
        const sc = 0x2fa59a, scD = 0x22786f, strap = 0x6a4022;
        v.box(7, 0, -2, 14, 7, 2, sc);
        v.paint(() => { v.box(7, 0, -2, 14, 0, 2, scD); v.box(7, 7, -2, 14, 7, 2, scD); });
        for (const x of [7, 14]) for (const y of [0, 7]) for (const z of [-2, 2]) v.set(x, y, z, metal(C.brass));
        v.paint(() => { v.box(9, 0, -2, 9, 7, 2, strap); v.box(12, 0, -2, 12, 7, 2, strap); });
        v.set(9, 5, 3, metal(C.brass)); v.set(12, 5, 3, metal(C.brass));
        v.project(['.RR.', 'RWWR', 'RWWR', '.RR.'], { R: C.red, W }, 10, 5);
        v.project(['Y.Y', '.Y.', 'Y.Y'], { Y: C.yellow }, 13, 3);
        v.project(['BBB', 'BWB'], { B: C.sky, W }, 7, 3);
        v.box(9, 8, 0, 9, 9, 0, strap); v.box(12, 8, 0, 12, 9, 0, strap); v.box(9, 9, 0, 12, 9, 0, strap);
        v.box(8, 9, 1, 9, 10, 1, G);
      },
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'tako', name: 'Octopus Flies a Kite', jp: 'タコがタコをあげる', rarity: 'uncommon',
      desc: 'Tako ga tako wo ageru: an octopus (tako) flies a kite (tako). Eight arms, one string.',
      build(v) {
        const R = 0xe8503e, RL = 0xff9a80, RD = 0xb83a2e, sand = 0xe8d29a;
        // sandy patch with shells
        v.cylinder(0, 0, 0, 9.5, 2, sand);
        tint(v, (x, y, z) => hash(x, y, z) < 0.18, shade(sand, 0.9));
        tint(v, (x, y, z) => y === 0, shade(sand, 0.8));
        v.set(-6, 2, 5, C.pink); v.set(-5, 2, 5, C.pink); v.set(-6, 2, 6, C.white);
        v.set(-2, 2, 7, C.white); v.set(-1, 2, 7, 0xffe2c0);
        const ox = 3, oz = 0;
        // tentacles curling out on the sand
        for (let k = 0; k < 8; k++) {
          if (k === 3) continue; // this one is busy holding the string
          const a = (k / 8) * Math.PI * 2 + 0.3;
          const c = Math.cos(a), s = Math.sin(a);
          v.line(ox + c * 2, 4, oz + s * 2, ox + c * 5, 2.5, oz + s * 5, R, 1);
          v.line(ox + c * 5, 2.5, oz + s * 5, ox + c * 7 - s, 3, oz + s * 7 + c, R, 0.7);
          v.set(Math.round(ox + c * 7 - s), 4, Math.round(oz + s * 7 + c), RL);
        }
        // body
        v.ellipsoid(ox, 5, oz, 4, 2.5, 3.5, R);
        v.ellipsoid(ox, 10, oz - 0.5, 4.6, 5, 4.2, R);
        tint(v, (x, y, z, c) => c === R && y >= 11 && hash(x, y, z) < 0.12, RL);
        // hachimaki headband with knot
        v.paint(() => v.box(ox - 6, 11, -6, ox + 6, 12, 6, W));
        v.box(ox + 4, 11, -3, ox + 5, 12, -3, W); v.set(ox + 5, 10, -4, W); v.set(ox + 6, 9, -4, W); v.set(ox + 5, 9, -3, W);
        // eyes looking up at the kite, pursed mouth
        v.project(['KKW...KKW', 'KWW...KWW'], { K, W }, ox - 4, 9);
        v.project(['P.......P'], { P: C.blush }, ox - 4, 7);
        v.cylinder(ox, 6, 3, 1, 2, RD, 'z');
        v.set(ox, 6, 5, shade(RD, 0.6));
        // arm raised, holding the string
        v.line(ox - 3, 8, 1, ox - 6, 13, 2, R, 1);
        v.line(ox - 6, 13, 2, ox - 6, 15, 2, R, 0.6);
        // the string
        v.line(ox - 6, 16, 2, -8, 21, 0, C.cream);
        // the kite (with an octopus on it, naturally)
        v.layer([
          'BBBBBBBBB',
          'BPPPPPPPB',
          'BPPOOOPPB',
          'BPOOOOOPB',
          'BPWWWWWPB',
          'BPOKOKOPB',
          'BPOOOOOPB',
          'BPPOMOPPB',
          'BPOPOPOPB',
          'BPPPPPPPB',
          'BBBBBBBBB',
        ], { B: C.red, P: C.paper, O: R, W, K, M: RD }, { x: -12, y: 31, z: 0 });
        v.line(-12, 31, -1, -4, 21, -1, C.bamboo); v.line(-4, 31, -1, -12, 21, -1, C.bamboo);
        v.box(-8, 21, -1, -8, 31, -1, C.bamboo);
        // paper tails
        for (const [bx, ph] of [[-12, 0], [-4, 1]]) {
          let px = bx;
          for (let i = 1; i <= 7; i++) {
            const x = bx - Math.round(Math.sin(i * 0.9 + ph) * 1.2);
            const c = (i + ph) % 2 ? C.red : W;
            for (let xx = Math.min(x, px); xx <= Math.max(x, px); xx++) v.set(xx, 21 - i, 0, c);
            px = x;
          }
        }
      },
    },
    {
      id: 'ika', name: 'Squid on a Raft', jp: 'イカのいかだ', rarity: 'uncommon',
      desc: 'Ika no ikada: a squid (ika) on a raft (ikada). The only plan is to drift.',
      build(v) {
        const sea = 0x2b6fae, wood = C.wood, rope = 0xd9c08a, body = 0xffe4da, spot = 0xff9a8a;
        // the sea
        v.shape(-12, 0, -9, 12, 0, 9, (x, y, z) => (x / 12.4) ** 2 + (z / 9.4) ** 2 <= 1, sea);
        v.shape(-12, 1, -9, 12, 1, 9, (x, y, z) => (x / 12.4) ** 2 + (z / 9.4) ** 2 <= 1,
          (x, y, z) => ((x / 12.4) ** 2 + (z / 9.4) ** 2 > 0.8 ? glass(0xffffff) : glass(0x6cc8ff)));
        for (const [x, z] of [[-10, 3], [9, -5], [10, 4], [-6, -7], [6, 8], [-9, -3]]) v.set(x, 2, z, W);
        // raft logs
        for (const zc of [-6, -3, 0, 3, 6]) {
          v.cylinder(-8, 3, zc, 1, 16, (x, y, z) => (hash(x, y, z) < 0.15 ? C.woodDark : wood), 'x');
          v.paint(() => { v.box(-8, 2, zc - 1, -8, 4, zc + 1, C.woodLight); v.box(7, 2, zc - 1, 7, 4, zc + 1, C.woodLight); });
          v.set(-8, 3, zc, C.woodDark); v.set(7, 3, zc, C.woodDark);
        }
        v.paint(() => { v.box(-5, 2, -7, -5, 4, 7, rope); v.box(4, 2, -7, 4, 4, 7, rope); });
        // mast + sail with イカ painted on it
        v.box(-6, 4, -4, -6, 21, -4, C.woodDark);
        v.layer([
          'SSSSSSSSSSSSS',
          'BBBBBBBBBBBBB',
          'SSSSSSSSSSSSS',
          'BBBBBBBBBBBBB',
          'SSSSSSSSSSSSS',
          'BBBBBBBBBBBBB',
          'SSSSSSSSSSSSS',
          'BBBBBBBBBBBBB',
          'SSSSSSSSSSSSS',
        ], { S: 0xfff8ee, B: C.navy }, { x: -12, y: 20, z: -5 });
        v.box(-6, 22, -4, -4, 22, -4, C.red); v.set(-5, 23, -4, C.red);
        // the squid
        const sx = 2;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          v.line(sx + Math.cos(a) * 2, 6, Math.sin(a) * 2, sx + Math.cos(a) * 4, 5, Math.sin(a) * 4, body, 0.6);
        }
        v.ellipsoid(sx, 11, 0.5, 4.2, 5.6, 3.6, body);
        v.shape(sx - 4, 15, -4, sx + 4, 20, 4, (x, y, z) => {
          const r = 3.4 - (y - 15) * 0.55;
          return (x - sx) ** 2 + (z - 0.5) ** 2 <= (r + 0.3) ** 2;
        }, body);
        // arrowhead fin on top
        v.shape(sx - 8, 15, -1, sx + 8, 24, 2, (x, y) => {
          const w = y <= 17 ? 3.5 + (y - 15) * 1.6 : 6.7 - (y - 17) * 0.95;
          return Math.abs(x - sx) <= w;
        }, body);
        tint(v, (x, y, z, c) => c === body && (y >= 15 || z <= 0) && hash(x, y, z) < 0.07, spot);
        tint(v, (x, y, z, c) => c === body && y >= 15 && Math.abs(x - sx) >= 4, 0xffb4a6);
        tint(v, (x, y, z, c) => c === body && y >= 21, 0xffb4a6);
        // face on the mantle
        v.project(['KW...KW', 'KK...KK'], { W, K }, sx - 3, 13);
        v.project(['PP.......PP'], { P: C.blush }, sx - 5, 11);
        // long arm rowing with an oar
        v.line(sx + 3, 7, 1, sx + 6, 9, 3, body, 0.7);
        v.line(sx + 5, 12, 3, sx + 9, 1, 6, C.woodLight);
        v.box(sx + 8, 1, 5, sx + 10, 3, 6, C.woodLight);
      },
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'panda', name: "Panda's Bakery", jp: 'パンダのパン屋', rarity: 'rare',
      desc: "Panda no pan-ya: 'pan' means bread, so obviously the panda runs a bakery.",
      build(v) {
        const P = 0xfbf8f2, PK = 0x2a2628;
        // tiled floor
        v.box(-12, 0, -9, 12, 1, 10, C.woodDark);
        tint(v, (x, y, z) => y === 1, (x, y, z) => ((x + z + 40) % 2 === 0 ? 0xf3e9d2 : 0xd98a5a));
        // back shelves full of bread
        v.box(-12, 2, -9, -1, 18, -9, C.woodLight);
        v.box(-12, 2, -8, -12, 18, -6, C.wood); v.box(-1, 2, -8, -1, 18, -6, C.wood);
        for (const y of [8, 13, 18]) v.box(-12, y, -8, -1, y, -6, C.wood);
        for (const x of [-10, -6.5, -3]) shokupan(v, Math.round(x), 14, -7);
        for (const x of [-10, -7, -4]) melonPan(v, x, 9.5, -7);
        // a row of baguettes on top of the shelves
        for (const x of [-10, -6.5, -3]) {
          v.ellipsoid(Math.round(x), 20, -7, 1.6, 1.2, 1.4, 0xc8803a);
          v.set(Math.round(x), 21, -6, 0xf2d08a); v.set(Math.round(x) - 1, 21, -7, 0xf2d08a);
        }
        // the panda baker
        const px = 6, pz = -2;
        v.ellipsoid(px, 8, pz, 4.5, 6, 3.5, P);
        v.paint(() => v.shape(px - 5, 2, pz, px + 5, 12, pz + 4, (x, y, z) => z >= pz + 1, 0xff9fb5));
        v.paint(() => v.box(px - 5, 2, pz - 4, px + 5, 4, pz + 4, PK));
        v.project(['NNNNN', '.NRN.', '..R..'], { N: 0xff9fb5, R: C.red }, px - 2, 14, '+z', { raise: true });
        v.ellipsoid(px, 17, pz + 0.5, 5, 4.2, 4.2, P);
        for (const s of [-1, 1]) v.sphere(px + s * 4, 20.5, pz, 1.6, PK);
        v.project([
          '.KK...KK.',
          'KKWK.KWKK',
          'KKKK.KKKK',
          '.KK...KK.',
        ], { K: PK, W }, px - 4, 19);
        v.project(['P..N..P', '...M...'], { P: C.blush, N: PK, M: PK }, px - 3, 15);
        // chef's hat
        v.cylinder(px, 20, pz + 0.5, 3.5, 2, P);
        v.ellipsoid(px, 24, pz + 0.5, 4.3, 2.4, 4.3, P);
        tint(v, (x, y, z, c) => c === P && y >= 22 && hash(x, y, z) < 0.25, 0xece6dc);
        // arms presenting a tray of panda buns
        for (const s of [-1, 1]) v.line(px + s * 4, 12, pz, px + s * 3, 10, pz + 4, PK, 1.2);
        v.box(px - 4, 10, pz + 4, px + 4, 10, pz + 8, metal(C.silver));
        pandaBun(v, px - 2, 11.5, pz + 6); pandaBun(v, px + 2, 11.5, pz + 6);
        // display counter: glass case on the left, painted パン sign on the right
        v.box(-12, 2, 4, 12, 3, 9, C.wood);
        v.box(-12, 4, 9, -1, 7, 9, glass(0xd8f4ff));
        v.box(0, 2, 9, 12, 7, 9, C.woodDark);
        v.box(0, 4, 4, 12, 7, 8, C.wood);
        for (const x of [-12, -1]) v.box(x, 4, 9, x, 7, 9, C.woodDark);
        v.box(-12, 4, 4, -12, 7, 8, C.woodDark);
        v.box(-12, 8, 4, 12, 8, 10, C.woodLight);
        v.project([
          'K.....K......',
          'KWWWWWK..LLL.',
          'WKKWKKW.LLLLL',
          'WWWKWWW.LCCCL',
          '.WWWWW..LCCCL',
          '........LLLLL',
        ], { K: PK, W: C.cream, L: 0xd99a48, C: 0xfff2d0 }, 0, 7);
        for (const x of [-10, -6]) croissant(v, x, 4, 6);
        anpan(v, -3, 4.5, 6);
        // baguettes in a basket on the counter
        v.box(-10, 9, 5, -6, 11, 8, 0xc99a5a);
        v.paint(() => v.shape(-10, 9, 5, -6, 11, 8, (x, y) => (x + y) % 2 === 0, 0xa87a40));
        v.line(-9, 11, 6, -10, 17, 6, 0xdca050, 0.9);
        v.line(-7, 11, 7, -6, 16, 7, 0xdca050, 0.9);
        tint(v, (x, y, z, c) => c === 0xdca050 && y >= 12 && y % 2 === 0, 0xf3d89a);
      },
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'futon', name: 'The Futon Flew Away', jp: 'ふとんがふっとんだ', rarity: 'ultra',
      desc: 'Futon ga futtonda: the futon (futon) went flying (futtonda). Lovely drying weather.',
      build(v) {
        const conc = 0xc2bdb2, wallC = 0xeee4d0, rail = gloss(0xe8ecf0), frame = gloss(0xc8ccd4);
        // balcony slab
        v.box(-10, 0, -6, 10, 1, 5, conc);
        tint(v, (x, y, z) => y === 1 && (x + 30) % 5 === 0, shade(conc, 0.9));
        // back wall with a sliding glass door and a curtain
        v.box(-10, 2, -8, 10, 20, -7, wallC);
        v.box(-10, 2, -9, 10, 20, -9, shade(wallC, 0.97));
        v.box(8, 2, -10, 8, 20, -10, metal(0xb8bcc4));
        for (const y of [6, 13, 19]) v.set(8, y, -9, metal(0x9aa0aa));
        tint(v, (x, y, z, c) => c === wallC && y % 4 === 0, shade(wallC, 0.95));
        v.box(-9, 2, -8, -1, 16, -8, 0x4a5a78);
        v.box(-9, 2, -7, -1, 16, -7, glass(0xa8d8f0));
        v.box(-9, 3, -8, -8, 15, -8, 0xffb7c8);
        v.box(-9, 16, -7, -1, 16, -7, frame); v.box(-9, 2, -7, -1, 2, -7, frame);
        v.box(-9, 2, -7, -9, 16, -7, frame); v.box(-1, 2, -7, -1, 16, -7, frame); v.box(-5, 2, -7, -5, 16, -7, frame);
        // outdoor air-con unit
        v.box(3, 2, -6, 9, 7, -3, 0xf0efe8);
        v.project(['.KKK.', 'KK.KK', 'K.K.K', 'KK.KK', '.KKK.'], { K: 0x6a6a72 }, 4, 7);
        v.box(8, 3, -3, 8, 6, -3, 0xd0d0cc);
        // railing
        v.box(-10, 8, 5, 10, 8, 5, rail);
        v.box(-10, 2, 5, 10, 2, 5, rail);
        for (let x = -10; x <= 10; x += 2) v.box(x, 3, 5, x, 7, 5, gloss(0xc8d0da));
        // futon clip
        const clip = gloss(0x3f86e8);
        v.box(4, 7, 4, 5, 11, 7, clip);
        v.set(4, 12, 6, clip);
        // the futon, held by one corner, lifting off into the sky
        const FW = 8, FH = 12;
        for (let j = 0; j < FH; j++) {
          const sh = Math.floor(j * 0.5), zc = 7 + Math.max(0, j - 7);
          for (let i = 0; i < FW; i++) {
            const x = 4 + i + sh, y = 10 + j;
            const edge = i === 0 || i === FW - 1 || j === 0 || j === FH - 1;
            const fi = (i + 40) % 4, fj = (j + (Math.floor(i / 4) % 2) * 2 + 40) % 4;
            const flower = (fi === 2 && fj >= 1 && fj <= 3) || (fj === 2 && fi >= 1 && fi <= 3);
            const col = edge ? 0xd8406a : (flower ? (fi === 2 && fj === 2 ? C.yellow : W) : 0xff9fb8);
            v.set(x, y, zc + 1, col);
            v.set(x, y, zc, 0xfff0f4);
            if (j > 7) v.set(x, y - 1, zc, 0xfff0f4);
          }
        }
        // whoosh lines
        for (const j of [3, 6]) {
          const xr = 4 + FW + Math.floor(j * 0.5);
          for (let k = 0; k < 2; k++) v.set(xr + k, 10 + j + k, 8, 0xeaf6ff);
        }
        // the shocked resident, futon-beater in hand
        const mx = -6, mz = 0;
        for (const s2 of [-1, 1]) {
          v.box(mx + s2 * 2 - (s2 < 0 ? 1 : 0), 2, mz - 1, mx + s2 * 2 + (s2 > 0 ? 1 : 0), 2, mz + 2, C.pink);
          v.box(mx + s2 * 2, 3, mz, mx + s2 * 2, 4, mz + 1, C.skin);
        }
        v.shape(mx - 4, 5, mz - 3, mx + 4, 12, mz + 3, (x, y, z) => {
          const hw = 3.8 - (y - 5) * 0.12;
          return (Math.abs(x - mx) / hw) ** 4 + (Math.abs(z - mz) / 2.8) ** 4 <= 1;
        }, 0x5a8fd0);
        v.paint(() => v.shape(mx - 4, 5, mz, mx + 4, 11, mz + 4, (x, y, z) => z >= mz + 1 && Math.abs(x - mx) <= 3, 0xfff2b3));
        v.paint(() => v.box(mx - 4, 9, mz - 3, mx + 4, 9, mz + 4, 0xf0c040));
        v.sphere(mx, 15.5, mz, 4, C.skin);
        v.shape(mx - 5, 13, mz - 5, mx + 5, 21, mz + 5, (x, y, z) => {
          const q = ((x - mx) ** 2 + (y - 15.8) ** 2 + (z - mz + 0.3) ** 2);
          return q <= 21 && q > 12 && (y >= 17 || z <= mz - 1);
        }, C.darkbrown);
        v.sphere(mx, 20.5, mz - 1, 1.8, C.darkbrown);
        v.project(['WWW.WWW', 'WKW.WKW', 'WWW.WWW'], { W, K }, mx - 3, 17);
        v.project(['P.MMM.P', '..MTM..', '..MMM..'], { P: C.blush, M: C.mouth, T: C.tongue }, mx - 3, 14);
        v.set(mx + 4, 19, mz + 2, glass(0x9fd9ff)); v.set(mx + 4, 18, mz + 2, glass(0x9fd9ff)); v.set(mx + 5, 18, mz + 2, glass(0x9fd9ff));
        // one arm grabbing at the futon, the other waving the beater
        v.line(mx + 3, 11, mz, mx + 6, 15, mz + 2, 0x5a8fd0, 1);
        v.box(mx + 6, 16, mz + 2, mx + 7, 17, mz + 2, C.skin);
        v.line(mx - 3, 11, mz, mx - 5, 14, mz + 1, 0x5a8fd0, 1);
        v.box(mx - 6, 15, mz + 1, mx - 5, 15, mz + 1, C.skin);
        v.box(mx - 6, 16, mz + 1, mx - 6, 18, mz + 1, 0xc99a5a);
        v.layer([
          '.BBB.',
          'B.B.B',
          'BB.BB',
          'B.B.B',
          '.BBB.',
          '..B..',
        ], { B: 0xd9b06a }, { x: mx - 8, y: 24, z: mz + 1 });
      },
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'samui', name: 'Samui Oyaji', jp: '寒いオヤジギャグ', rarity: 'secret',
      desc: "Dad's pun was so cold (samui) that the audience froze solid. He thinks it went great.",
      build(v) {
        const ice = glass(0xbfe8ff), snow = 0xf4fbff, floorC = 0xd6ecfa;
        // frozen floor
        v.cylinder(0, 0, 0, 12, 2, floorC);
        tint(v, (x, y, z) => y === 1 && hash(x, y, z) < 0.3, snow);
        tint(v, (x, y, z) => y === 0, 0xa8c8e0);
        // mikan crate stage
        v.box(-10, 2, -3, -2, 5, 3, C.woodLight);
        tint(v, (x, y, z, c) => c === C.woodLight && y <= 5 && y >= 2 && (y === 3 || x === -10 || x === -2), C.wood);
        v.project(['.OOO.', 'OOOOO', '.OOO.'], { O: C.orange }, -8, 5);
        v.project(['G'], { G: C.leaf }, -6, 6, '+z', { raise: false });
        // dad
        const dx = -6;
        for (const s of [-1, 1]) {
          v.box(dx + s * 1.5 - 1, 6, -1, dx + s * 1.5, 6, 2, C.charcoal);
          v.box(dx + s * 1.5 - 1, 7, -1, dx + s * 1.5, 10, 1, 0x6a6a78);
        }
        v.ellipsoid(dx, 13.5, 0.3, 4, 3.8, 3.2, W);
        v.paint(() => v.box(dx - 4, 10, -4, dx + 4, 10, 4, C.charcoal));
        v.set(dx, 10, 4, metal(C.gold));
        v.ellipsoid(dx, 13, 1.2, 3.2, 2.8, 2.6, W);
        v.project(['W.W', '.W.'], { W: shade(W, 0.85) }, dx - 1, 17);
        // head: bald, comb-over, browline glasses, moustache, necktie headband
        v.sphere(dx, 20.5, 0, 4.5, C.skin);
        tint(v, (x, y, z, c) => c === C.skin && y >= 24 && (z + 20) % 2 === 0 && Math.abs(x - dx) <= 2, C.charcoal);
        tint(v, (x, y, z, c) => c === C.skin && Math.abs(x - dx) >= 3 && y >= 19 && y <= 22 && z <= 1, C.gray);
        v.paint(() => v.box(dx - 5, 23, -5, dx + 5, 23, 5, C.red));
        v.box(dx - 5, 23, -2, dx - 5, 23, 0, C.red);
        v.box(dx - 6, 19, -1, dx - 6, 23, -1, C.red); v.set(dx - 6, 21, -1, C.navy); v.set(dx - 6, 19, -1, C.navy);
        v.box(dx - 7, 18, -1, dx - 6, 18, -1, C.red);
        v.project(['K...K'], { K }, dx - 2, 21);
        v.project(['P.....P', '.KKKKK.', '..MMM..', '..MTM..'], { P: 0xff8a8a, K: C.darkbrown, M: C.mouth, T: C.tongue }, dx - 3, 20);
        v.project(['R'], { R: 0xff7070 }, dx, 20, '+z', { raise: true });
        v.project(['FFFFFFF', 'ggg.ggg'], { F: gloss(0x6a3a22), g: glass(0xe0f4ff) }, dx - 3, 22, '+z', { raise: true });
        // one hand holding a mic, the other raised: "here's a good one!"
        v.line(dx + 3, 15, 0, dx + 4, 17, 3, W, 1);
        v.box(dx + 4, 17, 3, dx + 4, 17, 4, C.skin);
        v.box(dx + 4, 17, 5, dx + 4, 18, 5, C.charcoal);
        v.box(dx + 4, 19, 5, dx + 4, 19, 6, gloss(0xc8ccd4)); v.set(dx + 3, 19, 6, gloss(0xc8ccd4));
        v.line(dx - 3, 15, 0, dx - 6, 19, 1, W, 1);
        v.box(dx - 7, 20, 1, dx - 6, 21, 1, C.skin); v.box(dx - 6, 22, 1, dx - 6, 23, 1, C.skin);
        // frozen penguin audience
        const penguin = (px, pz, sc = 1) => {
          v.ellipsoid(px, 2 + 4 * sc, pz, 2.6 * sc, 4 * sc, 2.4 * sc, C.navy);
          v.paint(() => v.ellipsoid(px, 1.5 + 3.6 * sc, pz + 1.5 * sc, 1.8 * sc, 2.8 * sc, 1.2 * sc, W));
          v.box(px - 1, 2, pz + 1, px - 1, 2, pz + 2, C.orange); v.box(px + 1, 2, pz + 1, px + 1, 2, pz + 2, C.orange);
          const ey = Math.round(2 + 5.5 * sc);
          v.set(px - 1, ey, Math.round(pz + 2.2 * sc), K); v.set(px + 1, ey, Math.round(pz + 2.2 * sc), K);
          v.set(px - 1, ey, Math.round(pz + 2.2 * sc) - 1, K); v.set(px + 1, ey, Math.round(pz + 2.2 * sc) - 1, K);
          v.set(px, ey - 1, Math.round(pz + 2.4 * sc) + 1, gloss(C.orange));
          v.box(px - Math.round(2.8 * sc), Math.round(3 + 2 * sc), pz, px - Math.round(2.8 * sc), Math.round(3 + 4 * sc), pz, C.navy);
          v.box(px + Math.round(2.8 * sc), Math.round(3 + 2 * sc), pz, px + Math.round(2.8 * sc), Math.round(3 + 4 * sc), pz, C.navy);
        };
        const iceBlock = (x0, y0, z0, x1, y1, z1) => {
          v.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => !v.has(x, y, z) && !(((x === x0 || x === x1) && (y === y1 || z === z0 || z === z1)) && hash(x, y, z) < 0.5), ice);
          for (let x = x0; x <= x1; x += 2) if (hash(x, y0, z1) < 0.6) v.set(x, y1 - 1, z1 + 1, glass(0xeaf8ff));
          v.paint(() => v.box(x0, y1, z0, x1, y1, z1, glass(0xeaf8ff)));
        };
        penguin(3, -1); iceBlock(0, 2, -4, 6, 11, 3);
        penguin(9, -2); iceBlock(6, 2, -5, 12, 11, 2);
        penguin(5, 6, 0.6); iceBlock(3, 2, 4, 7, 8, 8);
        // snow drifts
        for (const [x, z] of [[-11, 3], [-1, 6], [10, 5], [-9, -6], [2, -9]]) { v.set(x, 2, z, snow); v.set(x + 1, 2, z, snow); }
      },
    },
  ],
};
