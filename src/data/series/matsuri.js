// Series 15 — Natsu Matsuri Yomise (夏まつり夜店)
// A summer festival night in your palm: goldfish scooping, yo-yo balloons, fox masks,
// takoyaki stalls and the bon-odori tower.
import { C, shade, mix } from '../../voxel/palette.js';
import { VoxelModel, gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;
const RED = 0xe5383b;
const KINGYO = 0xff5a2a;
const WATER = 0x9fd8ff;

/** Deterministic coordinate hash in [0, 1). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const floorClip = (v) => v.box(-40, -12, -40, 40, -1, 40, null);

/**
 * Chibi goldfish (own model) centred on its body, facing +z, tail fanning out behind.
 * s = scale (1 ≈ 7 voxels wide).
 */
function goldfish(s = 1, { col = KINGYO, belly = 0xfff2e4, fin = 0xff8a5a, eye = K, mouth = 'o' } = {}) {
  const m = new VoxelModel();
  m.ellipsoid(0, 0, 0, 3 * s, 2.7 * s, 3.1 * s, gloss(col));
  m.paint(() => m.ellipsoid(0, -1.5 * s, 1 * s, 2.4 * s, 1.4 * s, 2.4 * s, gloss(belly)));
  // fan tail flowing up and out behind
  const T = Math.max(2, Math.round(3.4 * s));
  for (let i = 0; i <= T; i++) {
    const z = Math.round(-2.8 * s - i);
    const w = Math.round(0.6 + i * 0.85 * Math.min(1, s));
    for (let x = -w; x <= w; x++) {
      if (i === T && x === 0) continue; // forked end
      const top = Math.round(0.6 * s + i * 0.55 - Math.abs(x) * 0.25), bot = Math.round(-0.6 * s + i * 0.25);
      for (let y = Math.min(bot, top); y <= Math.max(bot, top); y++) m.set(x, y, z, gloss(i >= T - 1 ? mix(fin, W, 0.35) : fin));
    }
  }
  // dorsal + side fins
  m.box(0, Math.round(2.6 * s), Math.round(-1.4 * s), 0, Math.round(3.3 * s), Math.round(0.4 * s), gloss(fin));
  for (const d of [-1, 1]) m.box(d * Math.round(3 * s), Math.round(-1 * s), Math.round(0.6 * s), d * Math.round(3 * s + 0.8), Math.round(-0.2 * s), Math.round(1.6 * s), gloss(fin));
  // face
  const L = { K: eye, W, P: C.blush, M: 0xc83c4a };
  if (s >= 1.3) {
    m.project(['WK...WK', 'KK...KK', 'KK...KK'], L, -3, Math.round(1.4 * s));
    m.project(mouth === 'o' ? ['.M.', 'M.M', '.M.'] : ['MMM'], L, -1, Math.round(1.4 * s) - 3);
    m.project(['PP.....PP'], L, -4, Math.round(1.4 * s) - 3);
  } else if (s >= 0.9) {
    m.project(['WK.WK', 'KK.KK'], L, -2, 1);
    m.project(['M'], L, 0, -1);
    m.project(['P...P'], L, -2, -1);
  } else {
    m.project(['K.K'], L, -1, 0);
  }
  return m;
}

/**
 * Chibi festival kid in a yukata (own model), facing +z, feet on y=0, head centre (0, 15.5, 0.3).
 * o: { yukata, pattern(x,y,z)->col|undefined, obi, hair, style: 'bun'|'boy', eyes, mouth, arms: [[from,to],[from,to]] }
 */
function kid(o) {
  const m = new VoxelModel();
  const skin = C.skin, hair = o.hair ?? 0x2a1e24, yk = o.yukata, obi = o.obi;
  // geta with red hanao straps
  for (const s of [-1, 1]) {
    m.box(s * 1, 0, -1, s * 3, 0, 2, C.woodLight);
    m.box(s * 1, 1, 0, s * 3, 1, 1, skin);
    m.set(s * 2, 1, 2, RED);
  }
  // yukata: a soft bell shape
  m.shape(-6, 2, -5, 6, 10, 5, (x, y, z) => {
    const r = 4.4 - (y - 2) * 0.1;
    return (x * x) / (r * r) + (z * z) / ((r - 0.9) * (r - 0.9)) <= 1;
  }, yk);
  if (o.pattern) m.recolor((x, y, z, c) => (c === yk ? o.pattern(x, y, z) : undefined));
  // crossed collar
  m.paint(() => m.shape(-4, 8, 1, 4, 10, 6, (x, y) => Math.abs(Math.abs(x) - (10 - y) * 0.8) < 0.7 && y >= 8, W));
  // obi + bow at the back
  m.paint(() => m.box(-6, 6, -6, 6, 7, 6, obi));
  m.box(-3, 6, -5, 3, 8, -4, obi).box(-1, 5, -5, 1, 9, -5, shade(obi, 0.85));
  // head + hair
  m.ellipsoid(0, 15.5, 0.3, 6.1, 5.6, 5.5, skin);
  m.recolor((x, y, z, c) => {
    if (c !== skin || y < 10) return undefined;
    const fringe = 18 - ((x + 12) % 3 === 0 ? 1 : 0);
    return y >= fringe || z <= -1 || (Math.abs(x) >= 5 && y >= 12) ? hair : undefined;
  });
  if (o.style === 'bun') {
    m.sphere(0, 21.5, -1.5, 2.3, hair);
    m.sphere(-3, 21, 0, 1.2, gloss(o.kanzashi ?? RED));
    m.set(-4, 22, 0, gloss(W)).set(-2, 22, 1, gloss(W));
  } else if (o.style === 'boy') {
    for (const [x, z] of [[-3, -1], [0, -2], [3, -1], [-1, 1], [2, 0]]) m.set(x, 21, z, hair);
  }
  // face
  const L = { K, W, P: C.blush, M: 0x8a3a3a, T: C.tongue };
  const eyes = {
    open: ['KW...KW', 'KK...KK', 'KK...KK'],
    happy: ['.K.....K.', 'K.K...K.K'],
    closed: ['.......', 'KK...KK'],
    shock: ['KK...KK', 'KK...KK'],
  }[o.eyes || 'open'];
  m.project(eyes, L, o.eyes === 'happy' ? -4 : -3, 15);
  const mouths = { smile: ['M.M', '.M.'], open: ['MMM', 'MTM'], o: ['.M.', 'M.M', '.M.'] };
  m.project(mouths[o.mouth || 'smile'], L, -1, 12);
  m.project(['PP.......PP'], L, -5, 12);
  // arms in sleeves
  for (const [from, to] of o.arms || [[[-4, 9, 0.5], [-5, 5, 2]], [[4, 9, 0.5], [5, 5, 2]]]) {
    m.line(...from, ...to, yk, 1.3);
    m.sphere(...to, 1.1, skin);
  }
  return m;
}

/** Glowing paper lantern (chōchin) hanging at (x, y, z) = top centre. */
function lantern(v, x, y, z, col = 0xff6a4a, r = 1.6) {
  v.set(x, y, z, K);
  v.ellipsoid(x, y - 1 - r * 1.1, z, r, r * 1.2, r, glow(col));
  v.set(x, y - 2 - Math.round(r * 2.2), z, K);
  v.paint(() => v.shape(x - 3, y - 6, z - 3, x + 3, y, z + 3, (xx, yy) => yy === y - 1 || yy === y - 1 - Math.round(r * 2.2), K));
}

/** Stall striped awning, slanting down toward +z. */
function awning(v, x0, x1, y0, z0, z1, c1, c2) {
  for (let z = z0; z <= z1; z++) {
    const y = y0 - Math.round((z - z0) * 0.45);
    for (let x = x0; x <= x1; x++) v.set(x, y, z, gloss(Math.floor((x - x0) / 2) % 2 ? c2 : c1));
  }
  for (let x = x0; x <= x1; x++) if ((x - x0) % 2 === 0) v.set(x, y0 - Math.round((z1 - z0) * 0.45) - 1, z1, gloss(Math.floor((x - x0) / 2) % 2 ? c2 : c1));
}

export default {
  id: 'matsuri',
  order: 15,
  name: 'Natsu Matsuri Yomise',
  jp: '夏まつり夜店',
  tagline: 'Summer festival stalls under paper lanterns',
  taglineJp: 'ドンドン、ヒュ～、夏の夜！',
  price: 400,
  themes: ['retro', 'shrine', 'food'],
  card: { bg: '#ffeccc', accent: '#e5383b', text: '#2e1c3a', accent2: '#2f5fb8', pattern: 'waves' },
  capsule: { colors: [0xe5383b, 0xffffff, 0x2f5fb8, 0xffd23f, 0xff8a5a] },
  items: [
    {
      id: 'kingyo', name: 'Goldfish in a Bag', jp: '金魚ぶくろ', rarity: 'common',
      desc: 'Scooped on the fifth try. Has already been named "Captain" by the whole family.',
      build(v) {
        // the goldfish first, so the bag wraps around it
        v.merge(goldfish(1.15), 0, 6, 1);
        v.merge(goldfish(0.6, { col: 0xfff6f0, belly: W, fin: 0xff9a7a }), -3, 10, -2);
        // plastic bag shell: water-tinted below the line, clear above, gathered at the neck
        const inBag = (x, y, z, d) => {
          if (y < 0) return false;
          if (y <= 12) return (x * x) / ((6.4 - d) ** 2) + ((y - 6.4) ** 2) / ((6.6 - d) ** 2) + (z * z) / ((5.6 - d) ** 2) <= 1;
          const r = Math.max(0.8, 3.6 - (y - 12) * 0.62) - d;
          return y <= 17 && x * x + z * z <= r * r;
        };
        v.shape(-8, 0, -7, 8, 17, 7, (x, y, z) => inBag(x, y, z, 0) && !inBag(x, y, z, 1) && !v.has(x, y, z), (x, y) => glass(y <= 10 ? 0xdff4ff : 0xf6fcff));
        v.shape(-7, 0, -6, 7, 0, 6, (x, y, z) => inBag(x, y, z, 0) && !v.has(x, y, z), glass(0xcfeeff));
        // red string tie + carrying loop
        v.box(-1, 17, -1, 1, 17, 1, gloss(RED));
        for (const [x, y] of [[-1, 18], [1, 18]]) v.set(x, y, 0, glass(0xeef8ff));
        v.set(-2, 19, 0, glass(0xeef8ff)).set(2, 19, 0, glass(0xeef8ff)).set(0, 19, 0, glass(0xeef8ff));
        v.line(0, 17, 0, 0, 20, 0, gloss(RED));
        v.ring(0, 23, 0, gloss(RED), 'z');
        // a torn poi lying beside it
        const px = 8, pz = 5;
        v.shape(px - 4, 0, pz - 4, px + 4, 0, pz + 4, (x, y, z) => { const d = Math.hypot(x - px, z - pz); return d <= 3.2 && d > 2.2; }, gloss(0xff8fb2));
        v.shape(px - 3, 0, pz - 3, px + 3, 0, pz + 3, (x, y, z) => Math.hypot(x - px, z - pz) <= 2.2 && !(x > px - 1 && z > pz - 1 && x < px + 2), W);
        v.line(px + 2, 0, pz + 2, px + 5, 0, pz + 6, gloss(0xff8fb2));
      },
    },
    {
      id: 'yoyo', name: 'Yo-yo Balloon', jp: 'ヨーヨーつり', rarity: 'common',
      desc: 'Bounces back every time. Pops on the walk home, every year, without fail.',
      build(v) {
        // blue plastic tub with water
        v.tube(0, 0, 0, 10, 9, 4, gloss(0x3f86e8));
        v.cylinder(0, 0, 0, 9, 1, gloss(0x3f86e8));
        v.paint(() => v.shape(-11, 3, -11, 11, 3, 11, () => true, gloss(0x7fb6ff)));
        v.cylinder(0, 1, 0, 9, 2, glass(WATER));
        // splashy-striped balloons
        const balloon = (cx, cy, cz, r, base, lines) => {
          v.sphere(cx, cy, cz, r, gloss(base));
          v.paint(() => v.shape(cx - r - 1, cy - r - 1, cz - r - 1, cx + r + 1, cy + r + 1, cz + r + 1, (x, y, z) => {
            const a = Math.atan2(z - cz, x - cx);
            return Math.abs(Math.sin(a * 2 + (y - cy) * 0.55)) > 0.95;
          }, (x, y, z) => gloss(lines[Math.floor(((Math.atan2(z - cz, x - cx) + Math.PI) / (Math.PI * 2)) * 4 + 0.5) % lines.length])));
          v.set(cx, cy + r + 1, cz, gloss(base));
        };
        balloon(-6, 4, -4, 3, 0xffb7d0, [0x3f86e8, 0xffd23f]);
        balloon(6, 4, -3, 3, 0xbff0d8, [RED, 0x8a5bd6]);
        balloon(0, 9, 1.5, 6, 0xfff2a8, [RED, 0x3f86e8]);
        v.shape(-5, 6, 4, 5, 13, 9, (x, y, z) => z >= 7, null); // soft flat front for the face
        v.project(['KW.....KW', 'KK.....KK', 'KK.....KK'], { K, W }, -4, 11);
        v.project(['PP.........PP'], { P: C.blush }, -6, 8);
        v.project(['M.M', '.M.'], { M: 0xc83c4a }, -1, 8);
        // rubber band loop on top
        v.line(0, 16, 1, 0, 21, 1, gloss(0xfff8f0));
        v.ring(0, 23, 1, gloss(0xfff8f0), 'z');
        // paper-string hook resting on the rim
        v.line(7, 4, 6, 11, 8, 8, 0xf4ecd8);
        v.set(11, 7, 8, metal(C.silver)).set(12, 7, 8, metal(C.silver)).set(12, 6, 8, metal(C.silver));
      },
    },
    {
      id: 'kitsune', name: 'Fox Mask', jp: 'きつねのお面', rarity: 'common',
      desc: 'Worn on the side of the head, the official way. The fox does not mind either way.',
      build(v) {
        // display stand
        v.box(-5, 0, -5, 5, 1, 3, C.woodDark);
        v.paint(() => v.box(-5, 1, -5, 5, 1, 3, C.wood));
        v.box(0, 2, -3, 0, 14, -3, C.woodDark);
        // mask
        const mc = gloss(0xfffaf2);
        v.ellipsoid(0, 14, 0, 6.4, 6, 2.6, mc);
        v.ellipsoid(0, 10.5, 2.4, 3.2, 2.6, 2.6, mc); // snout
        v.ellipsoid(0, 9.5, 4.6, 1.6, 1, 0.8, mc);
        for (const s of [-1, 1]) {
          const rows = ['c...', 'cc..', 'crc.', 'crrc', 'crrc'];
          rows.forEach((row, r) => [...row].forEach((ch, i) => {
            if (ch === '.') return;
            const x = s * (6 - i), y = 23 - r;
            v.set(x, y, 0, mc).set(x, y, -1, mc);
            v.set(x, y, 1, ch === 'r' ? gloss(RED) : mc);
          }));
        }
        // painted face: red eye shadow, slit eyes, forehead jewel, whiskers, mouth
        const L = { R: gloss(RED), K: gloss(K), G: gloss(C.gold), P: gloss(0xff8fb2) };
        v.project(['.RRR...RRR.', 'RKKK...KKKR', '.R.......R.'], L, -5, 16);
        v.project(['.R.', 'RGR', '.R.'], L, -1, 20);
        v.project(['R.R...R.R'], L, -4, 11);
        v.project(['K'], L, 0, 10);
        v.project(['RRR'], L, -1, 8);
        // cord + tassels
        for (const s of [-1, 1]) {
          v.line(s * 6, 14, -1, s * 7, 6, 0, gloss(RED));
          v.set(s * 7, 5, 0, gloss(C.yellow)).set(s * 7, 4, 0, gloss(C.yellow)).set(s * 7, 3, 0, gloss(RED));
        }
      },
    },
    {
      id: 'chocoban', name: 'Choco Banana Trio', jp: 'チョコバナナ', rarity: 'uncommon',
      desc: 'Rock-paper-scissors for a bonus banana. Lost. Bought three anyway.',
      build(v) {
        // styrofoam block
        v.box(-9, 0, -4, 9, 5, 4, 0xf6f6f2);
        v.recolor((x, y, z, c) => (c === 0xf6f6f2 && hash(x, y, z, 1) < 0.25 ? 0xe6e6e0 : undefined));
        const banana = (bx, bz, h, lean, choco, sprinkle, faceOpt) => {
          v.box(bx, 4, bz, bx, 8, bz, C.woodLight);
          const pts = [];
          for (let t = 0; t <= h; t++) pts.push([bx + lean * (t / h) ** 2 * 3, 8 + t, bz, t]);
          for (const [x, y, z, t] of pts) {
            const r = t < 1 ? 2.2 : t > h - 3 ? 2.4 - (t - (h - 3)) * 0.6 : 2.6;
            v.sphere(x, y, z, r, t > h - 2 ? 0xf6e08a : gloss(choco));
          }
          v.set(Math.round(bx + lean * 3), 9 + h, bz, 0x6a4a2a);
          v.paint(() => v.shape(bx - 5, 8, bz - 4, bx + 5, 8 + h - 2, bz + 4, (x, y, z) => y > 8 + h * 0.45 && hash(x, y, z, 5) < 0.17, (x, y, z) => gloss(sprinkle[Math.floor(hash(x, y, z, 6) * sprinkle.length)])));
          if (faceOpt) {
            v.shape(bx - 3, 12, bz + 2, bx + 3, 17, bz + 4, () => true, null);
            v.project(faceOpt.eyes, { K, W, P: C.blush }, bx - 2, 16);
            v.project(['P...P'], { P: faceOpt.blush }, bx - 2, 14);
            v.project(['.K.'], { K }, bx - 1, 13);
          }
        };
        banana(-5, -1, 14, -1, 0x5a3220, [C.yellow, W, C.sky], { eyes: ['K...K', 'K...K'], blush: C.blush });
        banana(5, -1, 13, 1, 0xfff4e8, [0xff6f9a, C.sky, C.lime], { eyes: ['.....', 'K...K'], blush: 0xff9fae });
        banana(0, 1.5, 17, 0, 0xff8fb8, [W, C.yellow, 0x5cc4ff, 0x9bd94a], { eyes: ['WK.WK'.replace('WK.WK', 'KW.KW'), 'KK.KK'], blush: 0xff5f8a });
        // price tag on a toothpick
        v.line(8, 5, 3, 9, 10, 3, C.woodLight);
        v.box(9, 10, 3, 12, 12, 3, W);
        v.project(['RRRR'], { R: RED }, 9, 11);
      },
    },
    {
      id: 'wataame', name: 'Wataame Girl', jp: 'わたあめちゃん', rarity: 'uncommon',
      desc: 'Cotton candy bigger than her head, fox mask on the side, goldfish in hand. Peak summer.',
      build(v) {
        const navy = 0x2a3a7a;
        v.merge(kid({
          yukata: navy, obi: 0xff8fb2, style: 'bun', eyes: 'happy', mouth: 'open',
          pattern: (x, y, z) => {
            const k = (x + 20) % 5 === 0 && (y + (x > 0 ? 2 : 0)) % 4 === 0;
            return k ? 0xff8fb2 : (x + y * 2 + z + 40) % 7 === 0 ? 0xe8eaff : undefined;
          },
          arms: [[[-4, 9, 0.5], [-6, 6, 3]], [[4, 9, 0.5], [6, 8, 4]]],
        }));
        // fox mask worn on the side of her head
        v.ellipsoid(-6.5, 16.5, 0, 1.4, 2.6, 2.4, gloss(0xfffaf2));
        v.set(-8, 17, 0, gloss(RED)).set(-8, 16, 1, gloss(RED)).set(-8, 15.5, 0, gloss(K)).set(-7, 19, -1, gloss(0xfffaf2)).set(-7, 19, 1, gloss(0xfffaf2));
        // cotton candy on a stick
        v.line(6, 8, 4, 8, 15, 3, C.woodLight);
        for (const [x, y, z, r] of [[8, 19, 2, 3.6], [10, 18, 3, 2.6], [6, 20, 3, 2.6], [8, 22, 1, 2.6], [9, 17, 5, 2]]) v.sphere(x, y, z, r, 0xffc8e0);
        v.recolor((x, y, z, c) => (c === 0xffc8e0 && hash(x, y, z, 4) < 0.3 ? 0xffe2ef : c === 0xffc8e0 && hash(x, y, z, 5) < 0.15 ? 0xffaed0 : undefined));
        // a tiny goldfish bag in the other hand
        v.line(-6, 6, 3, -6, 3, 3, gloss(RED));
        v.ellipsoid(-6, 1.5, 3, 1.6, 1.5, 1.6, glass(0xa8dcff));
        v.set(-6, 1, 4, gloss(KINGYO)).set(-6, 1, 3, gloss(KINGYO));
      },
    },
    {
      id: 'takoyaki', name: 'Takoyaki Stall', jp: 'たこ焼き屋台', rarity: 'rare',
      desc: 'Eight balls a boat, one octopus each. The mascot on the roof has no comment.',
      build(v) {
        // ground
        v.box(-13, 0, -7, 13, 0, 9, 0x5a5a66);
        v.recolor((x, y, z, c) => (c === 0x5a5a66 && hash(x, y, z, 2) < 0.2 ? 0x4a4a56 : undefined));
        // wooden counter with a yellow octopus skirt
        v.box(-11, 1, -4, 11, 9, 4, C.wood);
        v.box(-11, 1, 5, 11, 8, 5, gloss(0xffd23f));
        v.paint(() => v.box(-11, 1, 5, 11, 1, 5, gloss(0xe0a020)));
        v.layer([
          '..RRR..',
          '.RRRRR.',
          'RRWRWRR',
          '.RRRRR.',
          'R.R.R.R',
          'R.R.R.R',
        ], { R: gloss(RED), W: gloss(W) }, { x: -3, y: 7, z: 6 });
        v.box(-12, 10, -5, 12, 10, 6, C.woodLight);
        v.paint(() => v.box(-12, 10, 6, 12, 10, 6, C.woodDark));
        // iron griddle full of takoyaki
        v.box(-7, 11, -2, 5, 11, 3, metal(0x3a3a44));
        for (let x = -6; x <= 4; x += 2) for (let z = -1; z <= 2; z += 3) {
          v.sphere(x, 12, z, 1, gloss(0xc87a3a));
          v.set(x, 13, z, gloss(0x6a3018));
        }
        // boat tray with sauce, mayo and aonori
        v.box(7, 11, 0, 11, 11, 4, C.woodLight);
        v.box(7, 12, 0, 7, 12, 4, C.woodLight).box(11, 12, 0, 11, 12, 4, C.woodLight);
        for (const [x, z] of [[8, 1], [10, 1], [8, 3], [10, 3], [9, 2]]) v.sphere(x, 12.5, z, 1, gloss(0x6a3018));
        v.paint(() => v.shape(7, 13, 0, 11, 14, 4, (x, y, z) => (x + z) % 2 === 0, 0xfff6c8));
        v.set(9, 14, 2, 0x5aa83c).set(8, 13, 1, 0x5aa83c);
        // posts + striped awning
        for (const x of [-11, 11]) { v.box(x, 11, -4, x, 23, -4, C.woodDark); v.box(x, 11, 5, x, 19, 5, C.woodDark); }
        awning(v, -12, 12, 24, -5, 7, RED, W);
        // hanging lanterns
        lantern(v, -6, 18, 6, 0xff5a3a);
        lantern(v, 6, 18, 6, 0xffe08a);
        // octopus mascot sitting on the roof, with a twisted headband
        const ty = 24;
        v.sphere(0, ty + 4, -1, 3.6, gloss(0xf05a5a));
        v.ellipsoid(0, ty + 1.5, 0, 3.2, 1.4, 3, gloss(0xf05a5a));
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          v.line(Math.round(Math.cos(a) * 3), ty + 1, Math.round(Math.sin(a) * 3), Math.round(Math.cos(a) * 5), ty + 2, Math.round(Math.sin(a) * 5), gloss(0xf05a5a));
        }
        v.paint(() => v.box(-4, ty + 5, -5, 4, ty + 5, 3, gloss(W)));
        v.set(3, ty + 6, -3, gloss(W)).set(4, ty + 6, -2, gloss(W));
        v.project(['KW.KW', 'KK.KK'], { K, W }, -2, ty + 4);
        v.project(['.M.', 'M.M'], { M: 0xa02020 }, -1, ty + 2);
        v.project(['P...P'], { P: 0xffb0b0 }, -2, ty + 2);
        floorClip(v);
      },
    },
    {
      id: 'yagura', name: 'Bon Odori Yagura', jp: '盆踊りやぐら', rarity: 'ultra',
      desc: 'The taiko kid has been drumming since sunset. The aunties will not let him stop.',
      build(v) {
        // packed-earth ground
        v.box(-12, 0, -12, 12, 0, 12, 0xd8c08a);
        v.recolor((x, y, z, c) => (c === 0xd8c08a && hash(x, y, z, 1) < 0.25 ? 0xc8ae78 : undefined));
        // legs
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(sx * 8, 1, sz * 8, sx * 9, 13, sz * 9, C.woodDark);
        // deck
        v.box(-10, 13, -10, 10, 14, 10, C.wood);
        v.paint(() => v.box(-10, 14, -10, 10, 14, 10, C.woodLight));
        // kohaku (red-white) curtain round the platform
        v.shape(-10, 8, -10, 10, 12, 10, (x, y, z) => Math.max(Math.abs(x), Math.abs(z)) === 10, (x, y, z) => (Math.floor((x + z + 40) / 2) % 2 ? gloss(RED) : gloss(W)));
        v.shape(-10, 8, -10, 10, 8, 10, (x, y, z) => Math.max(Math.abs(x), Math.abs(z)) === 10 && (x + z) % 2 === 0, null);
        // railing + corner posts
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(sx * 10, 15, sz * 10, sx * 10, 22, sz * 10, C.woodDark);
        v.shape(-10, 17, -10, 10, 17, 10, (x, y, z) => Math.max(Math.abs(x), Math.abs(z)) === 10, C.woodDark);
        // ladder at the front
        for (let y = 1; y <= 13; y += 3) v.box(-2, y, 11, 2, y, 11, C.woodLight);
        v.box(-3, 1, 11, -3, 14, 11, C.woodDark).box(3, 1, 11, 3, 14, 11, C.woodDark);
        // lantern strings along the top
        const lan = [0xff5a3a, 0xfff0d0];
        for (const [ax, az, bx, bz] of [[-10, 10, 10, 10], [-10, -10, 10, -10], [-10, -10, -10, 10], [10, -10, 10, 10]]) {
          for (let i = 0; i <= 20; i++) {
            const t = i / 20, x = Math.round(ax + (bx - ax) * t), z = Math.round(az + (bz - az) * t);
            const y = Math.round(22 - Math.sin(t * Math.PI) * 2);
            v.set(x, y, z, K);
            if (i % 4 === 2) { v.ellipsoid(x, y - 2, z, 0.9, 1.2, 0.9, glow(lan[(i / 4 | 0) % 2])); }
          }
        }
        // taiko drum on a low stand
        const dz = 3;
        v.box(-3, 15, dz - 1, -3, 17, dz + 1, C.woodDark).box(3, 15, dz - 1, 3, 17, dz + 1, C.woodDark);
        v.cylinder(0, 19, dz - 2, 3.2, 5, 0x8a3a22, 'z');
        v.paint(() => v.cylinder(0, 19, dz - 2, 3.4, 1, 0xf2e4c4, 'z'));
        v.paint(() => v.cylinder(0, 19, dz + 2, 3.4, 1, 0xf2e4c4, 'z'));
        v.paint(() => v.shape(-4, 15, dz - 2, 4, 23, dz + 2, (x, y, z) => Math.abs(Math.hypot(x, y - 19) - 3) < 0.5 && (z === dz - 1 || z === dz + 1) && (x + y) % 2 === 0, gloss(C.gold)));
        v.project(['.KKK.', 'K.K.K', '.KKK.'], { K: 0x2a1a1a }, -2, 20, '+z');
        // drummer in happi coat + hachimaki, behind the drum facing us
        const by = 15;
        v.ellipsoid(0, by + 3.5, -2, 2.8, 3, 2.4, 0x2a3a8a);
        v.paint(() => v.shape(-3, by, -5, 3, by + 7, 1, (x, y, z) => z >= -1 && Math.abs(x) <= 1 && y > by + 2, W));
        v.ellipsoid(0, by + 9, -1.6, 4.2, 3.9, 3.8, C.skin);
        v.recolor((x, y, z, c) => (c === C.skin && y >= by + 11 && (y >= by + 12 || z <= -3) ? 0x2a1e24 : undefined));
        v.recolor((x, y, z, c) => (c === C.skin && y >= by + 7 && z <= -4 ? 0x2a1e24 : undefined));
        v.paint(() => v.shape(-5, by + 11, -6, 5, by + 11, 3, () => true, W));
        v.set(-4, by + 11, -5, W).set(-5, by + 10, -5, W).set(-5, by + 12, -5, W);
        v.project(['K...K', 'K...K'], { K }, -2, by + 10);
        v.project(['.M.'], { M: 0x8a3a3a }, -1, by + 7);
        v.project(['P.....P'], { P: C.blush }, -3, by + 8);
        // arms swinging the bachi
        v.line(-3, by + 5, -2, -5, by + 9, 0, 0x2a3a8a, 1);
        v.line(-5, by + 9, 0, -6, by + 14, 1, C.woodLight);
        v.line(3, by + 5, -2, 5, by + 7, 1, 0x2a3a8a, 1);
        v.line(5, by + 7, 1, 3, by + 8, 3, C.woodLight);
      },
    },
    {
      id: 'gyakuten', name: 'Goldfish Strikes Back', jp: '逆・金魚すくい', rarity: 'secret',
      desc: 'Tonight the goldfish is doing the scooping. Prize: one very surprised child.',
      build(v) {
        // stall tank with water
        v.hollowBox(-12, 0, -7, 12, 5, 7, gloss(0x3f86e8), 1, ['top']);
        v.paint(() => v.shape(-12, 5, -7, 12, 5, 7, () => true, gloss(0x7fb6ff)));
        v.box(-11, 1, -6, 11, 3, 6, glass(WATER));
        v.box(-11, 4, -6, 11, 4, 6, glass(0x8fcfff));
        // small goldfish swimming about
        v.merge(goldfish(0.6), -8, 4, 3);
        v.merge(goldfish(0.6, { col: 0x2a2430, belly: 0x4a4458, fin: 0x3a3448, eye: 0xffd447 }), 8, 4, -3);
        v.merge(goldfish(0.6, { col: W, belly: W, fin: 0xffd0c0 }), -7, 4, -4);
        // the boss goldfish leaping up, headband on
        const g = goldfish(1.7, { mouth: 'open' });
        g.paint(() => g.box(-7, 4, -7, 7, 4, 7, gloss(W)));
        g.box(-1, 4, -6, 1, 4, -6, gloss(W)).set(-2, 5, -6, gloss(W)).set(2, 3, -6, gloss(W)).set(-3, 5, -6, gloss(W));
        g.project(['R'], { R: gloss(RED) }, 0, 4);
        v.merge(g, -1, 12, 0);
        // splash ring where it broke the surface
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          v.set(Math.round(-1 + Math.cos(a) * 5), 5 + (i % 3 === 0 ? 1 : 0), Math.round(Math.sin(a) * 4.5), glass(0xd8f0ff));
        }
        // fin holding the poi up high
        v.line(4, 11, 3, 8, 15, 4, gloss(0xff8a5a), 0.8);
        v.line(8, 15, 4, 9, 18, 4, gloss(0xff8fb2));
        v.shape(5, 18, 4, 14, 27, 4, (x, y) => { const d = Math.hypot(x - 9.5, y - 22.5); return d <= 4.2 && d > 3.2; }, gloss(0xff8fb2));
        v.shape(5, 18, 3, 14, 27, 3, (x, y) => Math.hypot(x - 9.5, y - 22.5) <= 3.2, W);
        // tiny surprised kid sitting in the poi
        const kx = 9.5, ky = 21, kz = 5;
        v.ellipsoid(kx, ky, kz, 1.8, 1.6, 1.4, 0x3f6fd8);
        v.sphere(kx, ky + 3, kz, 2.2, C.skin);
        v.paint(() => v.shape(kx - 3, ky + 3, kz - 3, kx + 3, ky + 6, kz + 3, (x, y, z) => y >= ky + 4 || z <= kz - 1, 0x2a1e24));
        v.set(kx - 1, ky + 3, kz + 2, K).set(kx + 1, ky + 3, kz + 2, K).set(kx, ky + 2, kz + 2, 0xc83c4a);
        v.set(kx + 2, ky + 5, kz + 1, glass(0x9fe3ff)).set(kx + 3, ky + 4, kz + 1, glass(0x9fe3ff)); // sweat drop
        v.line(kx - 1, ky - 1, kz + 1, kx - 2, ky - 2, kz + 2, C.skin).line(kx + 1, ky - 1, kz + 1, kx + 2, ky - 2, kz + 2, C.skin);
        floorClip(v);
      },
    },
  ],
};
