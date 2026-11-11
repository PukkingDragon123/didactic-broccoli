// Series 17 — Chibi Densha Daishūgō (ちびでんしゃ大集合)
// Squashed, big-faced chibi trains (and the friends who keep them running). Choo-choo, but chunky.
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

/**
 * Kawaii face projected from the front, centred on cx. eyeY = top row of the eyes.
 * Eyes sit at cx±spread(+1); blush one row below the eyes; mouth two rows below.
 */
function face(v, cx, eyeY, { spread = 3, mouth = 'smile', blush = C.blush, eyes = 'open', dir = '+z', my = null } = {}) {
  const L = { K, W, P: blush, M: K, T: C.tongue };
  const gap = '.'.repeat(2 * spread - 1);
  const x0 = cx - spread - 1;
  if (eyes === 'open') v.project([`WK${gap}WK`, `KK${gap}KK`], L, x0, eyeY, dir);
  else if (eyes === 'big') v.project([`WK${gap}WK`, `KK${gap}KK`, `KK${gap}KK`], L, x0, eyeY, dir);
  else if (eyes === 'happy') v.project([`.K.${gap}.K.`, `K.K${gap}K.K`], L, x0 - 1, eyeY, dir);
  else if (eyes === 'closed') v.project([`KK${gap}KK`], L, x0, eyeY - 1, dir);
  const rows = eyes === 'big' ? 3 : 2;
  const mY = my ?? eyeY - rows;
  const mouths = { smile: ['M.M', '.M.'], wide: ['M...M', '.MMM.'], open: ['MMM', 'MTM'], o: ['.M.'], cat: ['M.M'] };
  const mo = mouths[mouth];
  v.project(mo, L, cx - Math.floor(mo[0].length / 2), mY, dir);
  if (blush) {
    v.project(['PP'], L, cx - spread - 3, mY, dir);
    v.project(['PP'], L, cx + spread + 2, mY, dir);
  }
}

/** Two wheel axles per bogie, hubs showing on the sides. */
function bogies(v, hw, zs, y = 1, cx = 0) {
  for (const zc of zs) {
    v.box(cx - hw + 2, 0, zc - 3, cx + hw - 2, y, zc + 3, C.charcoal);
    for (const dz of [-1.5, 1.5]) {
      const z = Math.round(zc + dz);
      v.cylinder(cx - hw + 1, y, z, 1.5, 2 * hw - 1, gloss(0x3a3640), 'x');
      v.set(cx - hw + 1, y, z, metal(C.silver)).set(cx + hw - 1, y, z, metal(C.silver));
    }
    v.box(cx - hw + 1, y + 1, zc - 2, cx - hw + 1, y + 1, zc + 2, C.darkgray);
    v.box(cx + hw - 1, y + 1, zc - 2, cx + hw - 1, y + 1, zc + 2, C.darkgray);
  }
}

/** Chunky car body with rounded vertical corners and roof edges. */
function carBody(v, { cx = 0, hw, z0, z1, y0, y1, body, roof }) {
  v.box(cx - hw, y0, z0, cx + hw, y1, z1, body);
  for (const x of [cx - hw, cx + hw]) for (const z of [z0, z1]) v.box(x, y0, z, x, y1, z, null);
  for (const x of [cx - hw, cx + hw]) v.box(x, y1, z0, x, y1, z1, null);
  v.box(cx - hw, y1, z0, cx + hw, y1, z0, null).box(cx - hw, y1, z1, cx + hw, y1, z1, null);
  if (roof) v.paint(() => v.box(cx - hw, y1, z0, cx + hw, y1, z1, roof));
}

/** Single-arm pantograph on the roof (folded low, chibi-sized). */
function pantograph(v, x, y, z) {
  const m = metal(0xb8bcc6), ins = gloss(0xf0ece2);
  v.box(x - 2, y, z - 1, x + 2, y, z + 2, C.darkgray);
  v.set(x - 2, y + 1, z - 1, ins).set(x + 2, y + 1, z - 1, ins).set(x - 2, y + 1, z + 2, ins).set(x + 2, y + 1, z + 2, ins);
  v.line(x, y + 1, z + 2, x, y + 3, z - 1, m);
  v.line(x, y + 3, z - 1, x, y + 4, z + 1, m);
  v.box(x - 3, y + 4, z + 1, x + 3, y + 4, z + 1, m);
  v.set(x - 3, y + 3, z + 1, m).set(x + 3, y + 3, z + 1, m);
}

/** Streamlined bullet-train nose + body. o: { nose, hw, top, bump, z0, body } along +z; returns nothing. */
function bullet(v, { z0 = -10, nose = 12, hw = 5.4, yb = 3, top = 12.5, bump = 0, body, blunt = 1.4, dy = 0 }) {
  const yt0 = top;
  const prof = (z) => {
    if (z <= 0) return { h: hw, t: yt0 };
    const t = z / nose;
    const tt = yt0 - (yt0 - yb - 1.2) * Math.pow(t, blunt) + bump * Math.exp(-(((t - 0.3) / 0.13) ** 2));
    return { h: hw * Math.sqrt(Math.max(0, 1 - Math.pow(t, 3.2))) + 0.4 * (1 - t), t: tt };
  };
  v.shape(-8, yb + dy, z0, 8, yt0 + 3 + dy, nose + 1, (x, y, z) => {
    const { h, t } = prof(z);
    y -= dy;
    if (z > nose || t <= yb) return false;
    const u = (y - yb) / (t - yb);
    if (u < 0 || u > 1) return false;
    const lim = h * Math.pow(Math.max(0, 1 - Math.pow(u, 2.6)), 1 / 2.6);
    return Math.abs(x) <= lim + 0.25;
  }, body);
  return prof;
}

export default {
  id: 'densha',
  order: 17,
  name: 'Chibi Densha',
  jp: 'ちびでんしゃ大集合',
  tagline: 'Pocket trains with very big faces',
  taglineJp: 'ガタンゴトン！しゅっぱつしんこう',
  price: 300,
  themes: ['city', 'retro'],
  card: { bg: '#e4f1fb', accent: '#2f7fd0', text: '#1e2f4a', accent2: '#8cc63f', pattern: 'stripes' },
  capsule: { colors: [0x8cc63f, 0x2f7fd0, 0xffd23f, 0xffffff, 0xe5383b] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'loop', name: 'Loop Line Densha', jp: '環状線でんしゃ', rarity: 'common',
      desc: 'Goes round and round the city all day. Has never once been late or dizzy.',
      build(v) {
        const sil = 0xdfe3e8, silD = 0xb2b8c2, grn = 0x8cc63f, grnD = 0x5c9a2c, mask = gloss(0x1e2430);
        const hw = 6, z0 = -8, z1 = 8, y0 = 2, y1 = 18;
        bogies(v, hw, [-4, 4]);
        carBody(v, { hw, z0, z1, y0, y1, body: sil, roof: silD });
        v.paint(() => {
          v.box(-hw, 2, z0, hw, 2, z1, C.darkgray); // skirt
          v.box(-hw, 3, z0, hw, 4, z1, grn); // stripe
          v.box(-hw, 16, z0, hw, 16, z1, grnD);
        });
        // side windows + doors
        for (const s of [-1, 1]) {
          const x = s * hw;
          v.paint(() => {
            for (const [a, b] of [[-7, -6], [-2, 2], [6, 7]]) v.box(x, 10, a, x, 13, b, gloss(0x2c3a52));
            for (const [a, b] of [[-5, -3], [3, 5]]) {
              v.box(x, 3, a, x, 15, b, silD);
              v.box(x, 3, a, x, 4, b, grnD);
              v.box(x, 9, a + 1, x, 13, b - 1, gloss(0x2c3a52));
            }
          });
          v.set(x, 12, -1, W).set(x, 13, -2, W);
        }
        // front: black mask with windshield and LED destination sign
        v.paint(() => v.box(-5, 9, z1, 5, 15, z1, mask));
        v.paint(() => v.box(-3, 14, z1, 3, 14, z1, gloss(0x111418)));
        for (const x of [-3, -1, 0, 2]) v.set(x, 14, z1, glow(0xffa53a));
        v.set(-4, 12, z1, W).set(-3, 11, z1, W).set(-4, 11, z1, gloss(0x8090a8));
        v.box(-5, 9, z1 + 1, 5, 9, z1 + 1, grn); // green brow under the mask
        face(v, 0, 8, { spread: 3, mouth: 'smile', my: 6 });
        v.box(-5, 3, z1 + 1, -4, 4, z1 + 1, glow(0xfff4d0));
        v.box(4, 3, z1 + 1, 5, 4, z1 + 1, glow(0xfff4d0));
        v.box(-1, 2, z1 + 1, 1, 2, z1 + 1, gloss(C.charcoal)); // coupler
        // back: tail lights
        v.paint(() => v.box(-5, 9, z0, 5, 15, z0, mask));
        v.set(-4, 4, z0 - 1, glow(0xff3a30)).set(4, 4, z0 - 1, glow(0xff3a30));
        // roof gear
        pantograph(v, 0, y1 + 1, -5);
        v.box(-3, y1 + 1, 2, 3, y1 + 1, 6, silD);
        for (const z of [3, 5]) v.box(-2, y1 + 1, z, 2, y1 + 1, z, C.gray);
        floorClip(v);
      },
    },
    {
      id: 'tram', name: 'Chin-Chin Tram', jp: 'ちんちん電車', rarity: 'common',
      desc: 'Rings its little bell at every corner. Chin-chin! Chin-chin! Thank you, chin-chin.',
      build(v) {
        const grn = 0x2f7a4c, grnD = 0x1f5434, cream = 0xf4e7c6, roof = 0x6b6f78, roofD = 0x50535c;
        const hw = 5, z0 = -7, z1 = 7, y0 = 2, y1 = 13;
        bogies(v, hw, [-4, 4]);
        carBody(v, { hw, z0, z1, y0, y1, body: cream });
        v.paint(() => { v.box(-hw, y0, z0, hw, 7, z1, grn); v.box(-hw, 8, z0, hw, 8, z1, grnD); });
        // arched roof + clerestory
        v.box(-4, 14, z0, 4, 14, z1, roof);
        v.box(-3, 15, z0 + 1, 3, 15, z1 - 1, roofD);
        v.box(-2, 16, z0 + 2, 2, 16, z1 - 2, roof);
        for (let z = z0 + 3; z <= z1 - 3; z += 2) { v.set(-3, 16, z, gloss(0xc8e4f0)); v.set(3, 16, z, gloss(0xc8e4f0)); v.set(-3, 16, z + 1, null); v.set(3, 16, z + 1, null); }
        // front: three-pane windshield, face oval, headlamp, destination board
        v.paint(() => {
          for (const [a, b] of [[-4, -2], [-1, 1], [2, 4]]) v.box(a, 9, z1, b, 12, z1, gloss(0x8ec3e0));
          v.box(-3, 13, z1, 3, 13, z1, gloss(K));
          v.shape(-5, 3, z1, 5, 8, z1, (x, y) => (x / 4.6) ** 2 + ((y - 5) / 2.7) ** 2 <= 1, cream);
        });
        for (const x of [-2, 0, 2]) v.set(x, 13, z1, glow(0xfff4d0));
        v.set(-4, 12, z1, W).set(-1, 12, z1, W).set(2, 12, z1, W).set(-3, 11, z1, W).set(0, 11, z1, W).set(3, 11, z1, W);
        v.paint(() => { v.box(-4, 9, z1, 4, 9, z1, gloss(0x5f8fb0)); });
        face(v, 0, 6, { spread: 2, mouth: 'smile', my: 4 });
        v.cylinder(0, 14, z1, 1, 1, metal(C.silver), 'z');
        v.set(0, 14, z1 + 1, glow(0xfff2c0));
        v.box(-hw, 1, z1 + 1, hw, 2, z1 + 1, gloss(C.charcoal)); // bumper
        v.box(-hw, 1, z0 - 1, hw, 2, z0 - 1, gloss(C.charcoal));
        // side windows with cream pillars, door + step on the right
        for (const s of [-1, 1]) {
          const x = s * hw;
          v.paint(() => { for (let z = z0 + 1; z <= z1 - 2; z += 3) v.box(x, 9, z, x, 12, z + 1, gloss(0x33475e)); });
          v.set(x, 12, z0 + 1, W).set(x, 12, z0 + 4, W);
        }
        v.paint(() => { v.box(hw, 3, 2, hw, 12, 4, grnD); v.box(hw, 9, 3, hw, 12, 3, gloss(0x33475e)); });
        v.box(hw + 1, 2, 2, hw + 1, 2, 4, C.darkgray);
        v.project(['WKW'], { W: cream, K: grnD }, -1, 6, '+x'); // car number plate on the side? (tiny)
        // brass bell + trolley pole
        v.sphere(-3, 15.5, z1 - 1, 1, metal(C.brass));
        v.set(-3, 17, z1 - 1, metal(C.brass));
        v.line(0, 17, -2, 0, 23, -8, metal(C.steel));
        v.set(0, 24, -9, metal(C.brass)).set(0, 23, -9, metal(C.brass));
        v.box(-1, 17, -2, 1, 17, -1, C.darkgray);
        floorClip(v);
      },
    },
    {
      id: 'ekiben', name: 'Ekiben-chan', jp: '駅弁ちゃん', rarity: 'common',
      desc: 'Tastes twice as good when eaten at 80 km/h with a view of rice fields.',
      build(v) {
        const wd = C.woodLight, wdD = shade(C.woodLight, 0.82);
        // lid leaning up behind, wrapped in its printed paper label (kakegami)
        v.box(-8, 0, -7, 8, 12, -6, wdD);
        v.paint(() => v.box(-8, 1, -6, 8, 12, -6, 0xfbf3e0));
        v.project([
          'RRRRRRRRRRRRRRRRR',
          'R...............R',
          'R..ssss.........R',
          'R.sssss.........R',
          'R.kkk..bbbbbbb..R',
          'R.kkkwwbwwbwwb..R',
          'R.kkkkkbbbbbbb..R',
          'R..g.g...g...g..R',
          'R...............R',
          'RRRRRRRRRRRRRRRRR',
        ], { R: C.vermilion, s: 0x9a9a9a, k: C.blue, b: C.blue, w: 0xd8ecff, g: K }, -8, 11);
        v.box(-1, 0, -5, 1, 12, -5, C.vermilion); // string around the lid
        // box
        v.hollowBox(-8, 0, -5, 8, 5, 5, wd, 1, ['top']);
        v.paint(() => { v.box(-8, 5, -5, 8, 5, 5, shade(wd, 1.08)); v.box(-8, 0, -5, 8, 0, 5, wdD); });
        v.box(-1, 1, -4, -1, 4, 4, wdD); // divider
        v.box(0, 3, 0, 7, 3, 0, wdD);
        // rice + umeboshi + sesame
        v.box(-7, 1, -4, -2, 4, 4, C.rice);
        v.paint(() => v.shape(-7, 4, -4, -2, 4, 4, (x, y, z) => hash(x, y, z, 3) < 0.12, K));
        v.sphere(-4.5, 4.6, 0, 1.2, gloss(0xc8243a));
        v.set(-5, 5, -1, gloss(0xff6a78));
        // ebi fry, tamagoyaki, karaage, pickles, sausage octopus
        v.box(0, 1, 1, 7, 3, 4, C.rice);
        for (let i = 0; i < 5; i++) v.set(1 + i, 4, 2, i === 4 ? C.shrimp : C.tempura).set(1 + i, 4, 3, i === 4 ? C.shrimp : C.tempura);
        v.set(6, 5, 2, gloss(C.red)).set(7, 5, 2, gloss(C.red));
        v.paint(() => v.shape(1, 4, 2, 5, 4, 3, (x, y, z) => hash(x, y, z, 9) < 0.35, C.crust));
        v.box(0, 1, -4, 3, 4, -1, C.egg);
        v.paint(() => { v.box(0, 2, -1, 3, 2, -1, 0xf5b82e); v.box(0, 4, -1, 3, 4, -1, shade(C.egg, 1.06)); });
        v.sphere(5.5, 4, -2.5, 1.6, 0x9a5226);
        v.paint(() => v.shape(4, 3, -4, 7, 6, -1, (x, y, z) => hash(x, y, z, 5) < 0.4, 0xc0763a));
        v.set(4, 4, 0, 0xff8fb2).set(5, 4, 0, 0xff8fb2).set(4, 4, 1, 0xff8fb2); // sakura-zuke
        v.layer(['.g.g.g.g'], { g: C.green }, { x: 0, y: 5, z: 0 }); // baran grass divider
        // face on the box front
        face(v, 0, 4, { spread: 3, mouth: 'smile', my: 2 });
        // poly-cha tea bottle beside it
        v.cylinder(11, 0, 2, 2, 6, gloss(0xc89650));
        v.paint(() => v.cylinder(11, 2, 2, 2, 2, gloss(0xe8d6a8)));
        v.cylinder(11, 6, 2, 1, 1, gloss(0xc89650));
        v.cylinder(11, 7, 2, 1, 2, gloss(C.red));
        v.set(11, 4, 4, W);
        // chopsticks in a paper sleeve leaning on the front
        v.line(-10, 0, 6, -10, 7, 3, 0xfbf3e0);
        v.line(-11, 0, 6, -11, 7, 3, 0xfbf3e0);
        v.set(-10, 5, 4, C.vermilion).set(-11, 5, 4, C.vermilion);
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ uncommon
    {
      id: 'ekicho', name: 'Station Master Mike', jp: '駅長ねこ', rarity: 'uncommon',
      desc: 'Official station master. Duties: napping on the ticket gate, accepting chin scritches.',
      build(v) {
        const navy = 0x26336a, navyD = shade(navy, 0.72), org = 0xf0a24e, blk = 0x3a3434, gold = gloss(C.gold);
        // platform slab: tactile strip + white safety line
        v.box(-9, 0, -6, 9, 1, 8, 0xc6c1b8);
        v.paint(() => {
          v.shape(-9, 1, -6, 9, 1, 8, (x, y, z) => hash(x, y, z, 2) < 0.15, 0xb4afa6);
          v.box(-9, 1, 3, 9, 1, 4, C.plasticYellow);
          v.box(-9, 1, 7, 9, 1, 8, W);
          v.box(-9, 0, 8, 9, 0, 8, 0x8a867e);
        });
        for (let x = -8; x <= 8; x += 2) v.set(x, 2, 3 + ((x / 2) & 1), C.plasticYellow);
        // legs + shoes
        v.box(-3, 2, -1, -1, 5, 1, navyD).box(1, 2, -1, 3, 5, 1, navyD);
        v.box(-3, 2, 2, -1, 3, 2, gloss(K)).box(1, 2, 2, 3, 3, 2, gloss(K));
        // jacket
        v.ellipsoid(0, 9, 0, 4.8, 4.2, 3.6, navy);
        v.paint(() => v.box(-5, 6, -4, 5, 6, 4, navyD)); // belt
        v.project(['W.W', '.R.', '.R.'], { W, R: C.red }, -1, 12); // collar + tie
        v.project(['g', '.', 'g'], { g: gold }, -2, 9, '+z', { raise: true });
        v.project(['g', '.', 'g'], { g: gold }, 2, 9, '+z', { raise: true });
        v.set(-3, 8, 4, metal(C.silver)); // whistle
        // calico head
        v.ellipsoid(0, 16, 0.5, 6.5, 5, 5, W);
        v.paint(() => {
          v.ellipsoid(-5, 19, -1, 4, 3, 6, org);
          v.ellipsoid(5, 18, -2, 3.5, 3, 5, blk);
          v.ellipsoid(0, 15, -5, 5, 4, 2, org);
        });
        for (const s of [-1, 1]) {
          for (let i = 0; i < 3; i++) v.box(s * (5 - i), 19 + i, -1, s * (6 - i), 19 + i, 1, s < 0 ? org : blk);
          v.set(s * 5, 20, 1, C.pink);
        }
        // cap: crown, gold band, glossy visor, badge
        v.cylinder(0, 20, 0, 4.4, 2, navy);
        v.cylinder(0, 22, 0, 5, 1, navy);
        v.paint(() => v.cylinder(0, 20, 0, 5, 1, gold));
        v.shape(-4, 20, 3, 4, 20, 7, (x, y, z) => x * x / 16 + (z - 3) * (z - 3) / 12 <= 1 && z >= 4, gloss(0x15182a));
        v.set(0, 22, 5, gold).set(0, 21, 5, gloss(C.red));
        face(v, 0, 16, { spread: 2, mouth: 'cat', blush: C.blush, my: 13 });
        v.project(['N'], { N: C.hotpink }, 0, 14);
        v.project(['WW....WW', '........', 'WW....WW'], { W: C.lightgray }, -9, 15, '+z', { raise: false });
        // arms: right raises the departure flag, left at the side
        v.line(4, 11, 0, 7, 13, 2, navy, 1.2);
        v.sphere(7, 14, 2, 1.3, W);
        v.box(8, 10, 2, 8, 24, 2, C.woodLight);
        v.box(9, 19, 2, 13, 23, 2, C.red);
        v.paint(() => v.box(9, 19, 2, 13, 19, 2, shade(C.red, 0.8)));
        v.line(-4, 11, 0, -6, 7, 1, navy, 1.2);
        v.sphere(-6, 6.5, 1, 1.3, W);
        // calico tail curling up behind
        for (const [x, y, z, r, c] of [[0, 4, -4, 1.4, org], [-2, 5, -6, 1.3, W], [-4, 7, -7, 1.2, blk], [-5, 10, -7, 1.1, org], [-4, 12, -6, 1, W]]) v.sphere(x, y, z, r, c);
        floorClip(v);
      },
    },
    {
      id: 'dango', name: 'Dango-Nose Shinkansen', jp: 'だんごっ鼻の新幹線', rarity: 'uncommon',
      desc: 'The original round-nosed bullet train. Smiles at 210 km/h and waves with its wipers.',
      build(v) {
        const iv = 0xf6f2e6, blu = 0x2a55b0, gl = gloss(0x1f2a40);
        const yc = 8;
        // boxy-round body
        v.shape(-6, 2, -9, 6, 14, -1, (x, y) => Math.abs(x / 5.6) ** 3 + Math.abs((y - yc) / 6) ** 3 <= 1, iv);
        // bulbous round nose
        v.shape(-6, 2, 0, 6, 14, 10, (x, y, z) => {
          const s = Math.sqrt(Math.max(0, 1 - (z / 10) ** 2));
          return Math.abs(x / (5.6 * s + 0.3)) ** 2.6 + Math.abs((y - yc + (1 - s) * 1.5) / (6 * s + 0.3)) ** 2.6 <= 1;
        }, iv);
        v.box(-6, 0, -12, 6, 1, 12, null);
        v.box(-6, 2, -9, 6, 2, 12, null);
        bogies(v, 5, [-6, 4], 1);
        v.box(-4, 2, -9, 4, 2, 6, C.charcoal);
        // blue skirt + window band
        v.paint(() => {
          v.box(-7, 3, -10, 7, 4, 12, blu);
          v.box(-7, 9, -10, 7, 11, -1, blu);
        });
        v.paint(() => { for (let z = -9; z <= -2; z += 2) v.box(-7, 10, z, 7, 10, z, gloss(0x26334c)); });
        // two-pane windshield on top of the nose
        v.paint(() => v.shape(-5, 11, 3, 5, 15, 6, (x) => x !== 0 && Math.abs(x) <= 4, gloss(0x8ec3e0)));
        v.paint(() => v.shape(-5, 11, 3, 5, 15, 3, (x) => x !== 0 && Math.abs(x) <= 4, gloss(0x4f7fa8)));
        for (const s of [-1, 1]) {
          let y = 15; while (y > 2 && !v.has(s * 3, y, 4)) y--;
          v.set(s * 3, y, 4, W).set(s * 2, y, 5, W);
        }
        // big face on the round nose + headlights
        face(v, 0, 9, { spread: 2, eyes: 'open', mouth: 'wide', my: 6 });
        v.project(['L.......L'], { L: glow(0xfff4c8) }, -4, 5);
        // tail lights + pantograph
        v.set(-3, 5, -10, glow(0xff3a30)).set(3, 5, -10, glow(0xff3a30));
        pantograph(v, 0, 14, -6);
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ rare
    {
      id: 'fumikiri', name: 'Kan-Kan Crossing', jp: 'カンカン踏切', rarity: 'rare',
      desc: 'Kan-kan-kan-kan... Shiba has been waiting for the train since breakfast. It is a good wait.',
      build(v) {
        const asph = 0x4c4b54, yel = gloss(0xf7c934), blk = gloss(0x23202a);
        // ground: road crossing the tracks, gravel shoulders
        v.box(-12, 0, -9, 12, 1, 11, 0x8f8a80);
        v.paint(() => {
          v.shape(-12, 1, -9, 12, 1, 11, (x, y, z) => hash(x, y, z, 4) < 0.3, 0x77726a);
          v.box(-5, 0, -9, 5, 1, 11, asph);
          v.box(-5, 1, -4, 5, 1, 1, 0x8a8a92); // crossing pad
          v.box(-5, 1, 9, 0, 1, 9, W); // stop line
          for (const z of [-8, -7, 3, 5, 7, 10]) { v.set(-5, 1, z, W); v.set(5, 1, z, W); }
          v.box(0, 1, 4, 0, 1, 5, C.yellow); v.box(0, 1, 7, 0, 1, 8, C.yellow); v.box(0, 1, -8, 0, 1, -7, C.yellow);
        });
        for (let x = -11; x <= 11; x += 2) if (Math.abs(x) > 5) v.box(x, 2, -4, x, 2, 1, C.woodDark);
        v.box(-12, 2, -3, 12, 2, -3, metal(C.steel)).box(-12, 2, 0, 12, 2, 0, metal(C.steel));
        // signal post (round, black-yellow stripes at the bottom)
        const px = 8, pz = 5;
        v.cylinder(px, 2, pz, 1, 21, gloss(0xf0eee8));
        v.box(px, 2, pz, px, 22, pz, gloss(0xf0eee8));
        v.paint(() => v.shape(px - 2, 2, pz - 2, px + 2, 9, pz + 2, (x, y) => ((y + x) >> 1) % 2 === 0, blk));
        v.paint(() => v.shape(px - 2, 2, pz - 2, px + 2, 9, pz + 2, (x, y) => ((y + x) >> 1) % 2 !== 0, yel));
        // crossbuck: two striped boards in an X
        const xb = [];
        for (let r = 0; r < 9; r++) {
          const row = [...'.........'];
          for (const c of [r, r + 1, 8 - r, 7 - r]) if (c >= 0 && c <= 8) row[c] = r === 0 || r === 8 ? 'K' : 'Y';
          xb.push(row.join(''));
        }
        v.layer(xb, { Y: yel, K: blk }, { x: px - 4, y: 26, z: pz + 3, depth: 2 });
        // twin warning lamps (one lit mid-blink): black backplates, hoods, front and back
        v.box(px - 4, 15, pz, px + 4, 15, pz, blk);
        for (const side of [-1, 1]) {
          const lx = px + side * 4;
          v.box(lx - 1, 13, pz - 1, lx + 1, 16, pz + 1, blk);
          const on = side < 0;
          v.box(lx - 1, 14, pz + 2, lx + 1, 15, pz + 2, on ? glow(0xff3a2a) : gloss(0x6a1616));
          v.box(lx - 1, 14, pz - 2, lx + 1, 15, pz - 2, on ? gloss(0x6a1616) : glow(0xff3a2a));
          v.box(lx - 1, 16, pz + 2, lx + 1, 16, pz + 3, blk);
          v.box(lx - 1, 16, pz - 3, lx + 1, 16, pz - 2, blk);
        }
        v.set(px - 5, 15, pz + 2, glow(0xffb0a0));
        // direction arrows + bell
        v.box(px - 2, 10, pz + 1, px + 2, 11, pz + 1, blk);
        v.layer(['.G.G.', 'GG.GG'], { G: glow(0xffd84a) }, { x: px - 2, y: 11, z: pz + 2 });
        v.box(px, 23, pz, px, 26, pz, gloss(0xf0eee8));
        v.sphere(px, 27, pz, 1.3, blk);
        // gate machine + lowered striped arm across the road
        v.box(px - 1, 2, pz + 2, px + 1, 6, pz + 4, yel);
        v.paint(() => v.box(px - 1, 6, pz + 2, px + 1, 6, pz + 4, blk));
        for (let x = px - 1; x >= -6; x--) {
          const c = Math.floor((x + 20) / 2) % 2 ? yel : blk;
          v.set(x, 7, pz + 3, c);
          if (x > px - 4) v.set(x, 6, pz + 3, c);
        }
        v.set(-6, 6, pz + 3, glow(0xff3a2a));
        // shiba, sitting very patiently
        const sx = -2, sz = 9;
        v.ellipsoid(sx, 4, sz, 2.6, 2.4, 2, C.shiba);
        v.paint(() => v.ellipsoid(sx, 3.5, sz + 1.5, 1.6, 1.8, 1, C.shibaLight));
        v.sphere(sx, 8, sz + 0.5, 2.6, C.shiba);
        v.paint(() => v.ellipsoid(sx, 7, sz + 2.5, 1.8, 1.2, 1, C.shibaLight));
        v.set(sx - 2, 11, sz, C.shiba).set(sx + 2, 11, sz, C.shiba).set(sx - 2, 10, sz + 1, C.shibaLight).set(sx + 2, 10, sz + 1, C.shibaLight);
        v.project(['K...K', '..N..'], { K, N: K }, sx - 2, 9);
        v.set(sx - 3, 7, sz + 2, C.blush).set(sx + 3, 7, sz + 2, C.blush);
        v.torus(sx, 5, sz - 3, 1.2, 0.6, C.shibaLight, 'z');
        v.set(sx, 6, sz + 2, C.red).set(sx - 1, 6, sz + 2, C.red).set(sx + 1, 6, sz + 2, C.red); // collar
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ ultra
    {
      id: 'mujineki', name: 'Countryside Station', jp: 'いなかの無人駅', rarity: 'ultra',
      desc: 'Two trains a day. The cat on the bench is the only one who knows the timetable.',
      build(v) {
        const grass = C.grass, conc = 0xc0b8aa, concD = 0x9a9284;
        // base: grass, ballast bed with sleepers + rails (track runs front-to-back on the right)
        v.box(-13, 0, -12, 13, 1, 12, grass);
        v.paint(() => v.shape(-13, 1, -12, 13, 1, 12, (x, y, z) => hash(x, y, z, 1) < 0.25, C.grassDark));
        v.box(3, 1, -12, 13, 2, 12, 0x8e8a84);
        v.paint(() => v.shape(3, 2, -12, 13, 2, 12, (x, y, z) => hash(x, y, z, 6) < 0.35, 0x6e6a64));
        for (let z = -11; z <= 11; z += 3) v.box(4, 3, z, 12, 3, z, C.woodDark);
        v.box(5, 3, -12, 5, 3, 12, metal(C.steel)).box(11, 3, -12, 11, 3, 12, metal(C.steel));
        // platform
        v.box(-12, 2, -11, 2, 5, 9, conc);
        v.paint(() => {
          v.box(-12, 5, -11, 2, 5, 9, shade(conc, 1.06));
          v.box(2, 2, -11, 2, 5, 9, concD);
          v.box(0, 5, -11, 0, 5, 9, C.plasticYellow);
          v.box(2, 5, -11, 2, 5, 9, W);
          v.shape(-12, 2, 9, 2, 4, 9, (x, y, z) => hash(x, y, z, 3) < 0.3, concD);
        });
        // wooden waiting shelter with red tin roof
        const wd = 0x8a5a36, wdL = 0xb07a4a;
        v.box(-11, 6, -10, -2, 13, -10, wd);
        v.box(-11, 6, -10, -11, 13, -6, wd).box(-2, 6, -10, -2, 13, -6, wd);
        v.paint(() => { for (let y = 7; y <= 13; y += 2) { v.box(-11, y, -10, -2, y, -10, wdL); v.box(-11, y, -10, -11, y, -6, wdL); v.box(-2, y, -10, -2, y, -6, wdL); } });
        v.box(-11, 9, -8, -11, 11, -7, gloss(0x9fc8de)); // side window
        for (let z = -11; z <= -4; z++) { const y = 14 + Math.floor((z + 11) / 4) * 0; v.box(-12, y + (z < -7 ? 0 : 0), z, -1, y, z, 0xb83a2e); }
        v.box(-12, 15, -11, -1, 15, -7, 0xb83a2e);
        v.paint(() => { for (let x = -12; x <= -1; x += 2) v.box(x, 14, -11, x, 15, -4, shade(0xb83a2e, 0.82)); });
        v.box(-12, 13, -4, -1, 13, -4, shade(0xb83a2e, 0.7));
        // bench + sleeping cat loaf
        v.box(-10, 8, -9, -3, 8, -7, wdL);
        v.box(-10, 6, -8, -10, 7, -8, wd).box(-3, 6, -8, -3, 7, -8, wd);
        v.ellipsoid(-6, 10, -8, 2.2, 1.5, 1.5, C.orange);
        v.sphere(-4, 10, -7.5, 1.3, C.orange);
        v.set(-4, 12, -8, C.orange).set(-3, 11, -7, K).set(-5, 11, -7, K);
        v.set(-8, 9, -8, C.orange).set(-9, 9, -8, C.orange);
        // station name board (ekimeihyo) on two posts
        v.box(-9, 6, 4, -9, 10, 4, K).box(-3, 6, 4, -3, 10, 4, K);
        v.box(-10, 11, 4, -2, 15, 4, W);
        v.project([
          '.........',
          '.KKK.KKK.',
          '.........',
          '..K.K.K..',
          'BBBBBBBBB',
        ], { K, B: C.blue }, -10, 15);
        v.set(-10, 11, 5, W).set(-2, 11, 5, W);
        // lamp post
        v.box(0, 6, 7, 0, 15, 7, C.darkgray);
        v.box(-1, 16, 7, 1, 16, 7, C.darkgray);
        v.set(-1, 15, 7, glow(0xfff0b0)).set(1, 15, 7, glow(0xfff0b0));
        // little sakura tree behind the shelter
        v.box(-12, 2, -12, -11, 18, -11, C.woodDark);
        v.line(-11, 16, -11, -8, 20, -10, C.woodDark, 0.6);
        v.sphere(-11, 20, -10, 4, C.sakura);
        v.sphere(-8, 18, -10, 3, C.sakura);
        v.sphere(-13, 17, -8, 2.5, C.sakura);
        v.recolor((x, y, z, c) => (c === C.sakura && hash(x, y, z, 8) < 0.3 ? C.sakuraDeep : c === C.sakura && y > 21 ? 0xffe2ea : undefined));
        // one-car diesel railcar (cream + red), facing the viewer
        const cx = 8, cr = 0xf1e3c2, red = 0xc8323a;
        bogies(v, 4, [-7, 5], 4, cx);
        carBody(v, { cx, hw: 4, z0: -11, z1: 10, y0: 5, y1: 17, body: cr, roof: 0x8c8c90 });
        v.paint(() => { v.box(cx - 4, 5, -11, cx + 4, 6, 10, red); v.box(cx - 4, 15, -11, cx + 4, 15, 10, red); });
        for (const s of [-1, 1]) v.paint(() => { for (let z = -9; z <= 6; z += 3) v.box(cx + s * 4, 11, z, cx + s * 4, 13, z + 1, gloss(0x33475e)); });
        v.paint(() => { v.box(cx - 3, 11, 10, cx - 1, 14, 10, gloss(0x2c3a52)); v.box(cx + 1, 11, 10, cx + 3, 14, 10, gloss(0x2c3a52)); });
        v.set(cx - 3, 14, 10, W).set(cx + 1, 14, 10, W);
        v.set(cx + 3, 11, 11, W).set(cx + 2, 11, 11, C.blue); // one-man sign
        v.set(cx - 1, 16, 11, glow(0xfff4c8)).set(cx + 1, 16, 11, glow(0xfff4c8));
        face(v, cx, 9, { spread: 2, mouth: 'smile', my: 7 });
        v.set(cx - 3, 5, 11, glow(0xff3a30)).set(cx + 3, 5, 11, glow(0xff3a30));
        v.box(cx - 1, 4, 11, cx + 1, 4, 11, gloss(C.charcoal));
        v.box(cx - 1, 18, -5, cx, 19, -5, gloss(K)); // exhaust stack
        v.box(cx - 2, 18, 0, cx + 2, 18, 4, 0xa0a0a4);
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'yellow', name: 'Lucky Yellow Inspector', jp: '幸せの黄色い検測車', rarity: 'secret',
      desc: 'Spot it and you get a lucky day. It is quietly inspecting your luck, too.',
      build(v) {
        const yel = gloss(0xffd21f), blu = gloss(0x2a52b8), base = gloss(0x23284a);
        // turntable display base: gold rim, glowing ring, rails
        v.cylinder(0, 0, 0, 13, 2, base);
        v.paint(() => v.shape(-14, 0, -14, 14, 1, 14, (x, y, z) => Math.hypot(x, z) > 12.2, metal(C.gold)));
        v.paint(() => v.shape(-14, 1, -14, 14, 1, 14, (x, y, z) => Math.abs(Math.hypot(x, z) - 10.5) < 0.6, glow(0x7ff0ff)));
        v.box(-4, 2, -13, 4, 2, 13, gloss(0x4a4f6a));
        v.box(-3, 3, -13, -3, 3, 13, metal(C.chrome)).box(3, 3, -13, 3, 3, 13, metal(C.chrome));
        // the train
        bullet(v, { z0: -11, nose: 13, hw: 5, yb: 4, top: 13, bump: 1.4, body: yel });
        v.box(-6, 4, -11, 6, 4, 14, null);
        bogies(v, 5, [-8, 3], 4);
        v.box(-3, 4, -10, 3, 4, 7, C.charcoal);
        v.paint(() => {
          v.box(-7, 5, -12, 7, 6, 14, blu); // blue stripe
          for (let z = -10; z <= -2; z += 2) v.box(-7, 10, z, 7, 11, z, gloss(0x22304c)); // windows
        });
        // wraparound cockpit canopy on the hump
        v.paint(() => v.shape(-5, 11, 1, 5, 16, 5, (x, y, z) => Math.abs(x) <= 4, gloss(0x8ec3e0)));
        v.paint(() => v.shape(-5, 11, 1, 5, 16, 1, (x) => Math.abs(x) <= 4, gloss(0x4f7fa8)));
        for (let z = 1; z <= 5; z++) { let y = 17; while (y > 4 && !v.has(-2, y, z)) y--; if (z === 3 || z === 4) v.set(-2, y, z, W); }
        // face painted on top of the duck-bill nose (seen from above), headlights at the sides
        v.project(['WK...WK', 'KK...KK', 'KK...KK', '.......', 'P.M.M.P', '...M...'], { K, W, M: K, P: C.blush }, -3, 7, '+y');
        for (const s of [-1, 1]) { let z = 14; while (z > 0 && !v.has(s * 4, 5, z)) z--; v.set(s * 4, 5, z, glow(0xfff8d8)); }
        // measuring dome on the roof + pantograph
        v.cylinder(0, 13, -6, 2, 1, gloss(0xe8e8f0));
        v.sphere(0, 14, -6, 1.6, glass(0xbfefff));
        v.set(0, 14, -6, glow(0x7ff0ff));
        pantograph(v, 0, 13, -10);
        // floating lucky sparkles
        for (const [x, y, z] of [[-9, 16, 4], [9, 18, -2], [-7, 21, -8], [8, 12, 9]]) {
          const g = glow(0xfff0a0);
          v.set(x, y, z, g).set(x - 1, y, z, g).set(x + 1, y, z, g).set(x, y - 1, z, g).set(x, y + 1, z, g);
          v.box(x, 3, z, x, y - 2, z, glass(0xe8f8ff));
        }
        // four-leaf clover decal on the side
        v.project(['.g.', 'gWg', '.g.'], { g: gloss(C.green), W: yel }, -4, 9, '+x');
        floorClip(v);
      },
    },
  ],
};
