// Series 8 — Onsen Friends (おんせんどうぶつ)
// Animals melting happily into hot springs. Water is glass(), wood is hinoki.
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

/** Deterministic 0..1 hash of integer coordinates (no Math.random in builds). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1442695041 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const mod = (a, n) => ((a % n) + n) % n;

/** Face-connected 1-voxel line (staircase) so thin parts never touch only by an edge. */
function stair(v, x0, y0, z0, x1, y1, z1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
  let p = [x0, y0, z0];
  v.set(...p, c);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const q = [Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), Math.round(z0 + (z1 - z0) * t)];
    for (let a = 0; a < 3; a++) if (q[a] !== p[a]) { p = [...p]; p[a] = q[a]; v.set(...p, c); }
  }
  return v;
}

// shared colours
const HINOKI = 0xecc98f;
const HINOKI_D = 0xd2aa6e;
const COPPER = 0xb8703e;
const WATER = 0x7fd0e6;
const CAPY = 0xb07a4c;
const YUZU = 0xffd21f;
const WET = mix(HINOKI, 0x2f8fb8, 0.5);
const STONES = [0x9a958e, 0x878279, 0xaaa59c, 0x7c776f];

/** Round hinoki oke tub centred on (0,0): bottom y=0, staves, protruding copper hoops, water inside. */
function okeTub(v, r, h, { cx = 0, cz = 0, waterH = h - 3, water = WATER, hoops = [2, h - 3] } = {}) {
  v.cylinder(cx, 0, cz, r, 1, HINOKI_D);
  v.tube(cx, 1, cz, r, r - 1, h - 1, HINOKI);
  v.paint(() => v.shape(cx - r - 1, 1, cz - r - 1, cx + r + 1, h, cz + r + 1,
    (x, y, z) => mod(Math.floor((Math.atan2(z - cz, x - cx) + Math.PI) * r / 2.2), 2) === 0, shade(HINOKI, 0.93)));
  v.paint(() => v.cylinder(cx, h - 1, cz, r, 1, shade(HINOKI, 1.06)));
  for (const y of hoops) v.tube(cx, y, cz, r + 1, r, 1, gloss(COPPER));
  if (waterH > 0) {
    v.tube(cx, 1, cz, r - 1, r - 2, waterH, WET); // wet inner liner seen through the water
    v.paint(() => v.cylinder(cx, 0, cz, r - 2, 1, WET));
    v.cylinder(cx, 1, cz, r - 2, waterH, glass(water));
  }
}

/** Recolour the front-most voxel at (x,y), scanning -z from zFrom (local projection that ignores other objects). */
function dot(v, x, y, zFrom, c, depth = 8) {
  for (let z = zFrom; z > zFrom - depth; z--) if (v.has(x, y, z)) { v.set(x, y, z, c); return z; }
  return null;
}
/** Paint a small pixel pattern onto the front surface around (x0,y0) (top-left), scanning from zFrom. */
function decal(v, rows, legend, x0, y0, zFrom) {
  rows.forEach((row, r) => [...row].forEach((ch, i) => { if (legend[ch] !== undefined) dot(v, x0 + i, y0 - r, zFrom, legend[ch]); }));
}

/** Rounded box ("superellipsoid") — good for blocky-but-soft animal heads. */
function rbox(v, cx, cy, cz, rx, ry, rz, c, p = 2.8) {
  return v.shape(Math.floor(cx - rx), Math.floor(cy - ry), Math.floor(cz - rz), Math.ceil(cx + rx), Math.ceil(cy + ry), Math.ceil(cz + rz),
    (x, y, z) => Math.abs((x - cx) / (rx + 0.3)) ** p + Math.abs((y - cy) / (ry + 0.3)) ** p + Math.abs((z - cz) / (rz + 0.3)) ** p <= 1, c);
}

/**
 * Capybara head facing +z. (cx,cy,cz) = head centre, k = scale.
 * Long blocky head, blissfully closed eyes, big soft nose, tiny round ears.
 */
function capyHead(v, cx, cy, cz, k = 1, { fur = CAPY, blush = true, nose = null, len = 1 } = {}) {
  const furL = shade(fur, 1.1), furM = nose ?? shade(fur, 0.9);
  const q = k * len;
  rbox(v, cx, cy, cz - 0.4 * q, 3.1 * k, 2.6 * k, 3.8 * q, fur);
  rbox(v, cx, cy - 0.7 * k, cz + 2.4 * q, 2.4 * k, 1.9 * k, 2.6 * q, fur);
  v.paint(() => v.ellipsoid(cx, cy + 2 * k, cz - 0.5 * q, 2.4 * k, 1 * k, 3.4 * q, furL));
  const zf = Math.ceil(cz + 5.2 * q) + 1;
  const ny = Math.round(cy - 0.3 * k);
  const nw = Math.max(1, Math.round(1.6 * k));
  // muzzle patch, nostrils and a tiny mouth
  for (let x = cx - nw; x <= cx + nw; x++) for (let y = ny - Math.max(1, Math.round(1.4 * k)); y <= ny; y++) dot(v, x, y, zf, furM, 3);
  const nc = shade(furM, 0.62);
  dot(v, cx - Math.max(1, Math.round(0.9 * k)), ny, zf, nc, 3);
  dot(v, cx + Math.max(1, Math.round(0.9 * k)), ny, zf, nc, 3);
  // blissfully closed eyes (sit a little further back than the nose)
  const ex = Math.max(1, Math.round(1.9 * k)), ey = Math.round(cy + 1.9 * k);
  const ew = k >= 0.9 ? 2 : 1;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < ew; i++) dot(v, cx + sx * (ex + i), ey, zf, K, 10);
    if (blush) dot(v, cx + sx * (ex + ew - 1), ey - 1, zf, C.blush, 10);
  }
  // ears
  const ay = Math.round(cy + 2.4 * k), az = Math.round(cz - 2 * q), aw = Math.max(2, Math.round(2.4 * k));
  for (const sx of [-1, 1]) {
    v.box(cx + sx * aw, ay, az, cx + sx * (aw + (k >= 0.9 ? 1 : 0)), ay + 1, az, shade(fur, 0.7));
  }
}

/** Small yuzu with a leaf. Sits on top of (x,y,z) (y = lowest voxel). */
function yuzu(v, x, y, z, big = false) {
  if (big) {
    v.sphere(x, y + 2, z, 2, gloss(YUZU));
    v.paint(() => v.set(x - 1, y + 3, z + 1, gloss(0xffe98a)));
    v.set(x, y + 4, z, C.darkbrown);
    v.box(x + 1, y + 4, z, x + 2, y + 4, z, C.leaf);
  } else {
    v.sphere(x, y + 1, z, 1.5, gloss(YUZU));
    v.set(x, y + 3, z, C.leaf);
  }
}

/** Folded white towel with blue stripes (tenugui) lying on a head. */
function towel(v, x0, y, z0, x1, z1, stripe = C.blue) {
  v.box(x0, y, z0, x1, y + 1, z1, W);
  v.paint(() => v.shape(x0, y, z0, x1, y + 1, z1, (x) => mod(x - x0, 3) === 1, stripe));
}

/** Boulder: lumpy ellipsoid with a deterministic tint. */
function rock(v, x, y, z, rx, ry, rz, seed = 0, moss = false) {
  const base = STONES[Math.floor(hash(x, y, z, seed) * STONES.length)];
  v.shape(Math.floor(x - rx - 1), Math.floor(y - ry - 1), Math.floor(z - rz - 1), Math.ceil(x + rx + 1), Math.ceil(y + ry), Math.ceil(z + rz + 1),
    (xx, yy, zz) => {
      const d = ((xx - x) / (rx + 0.2)) ** 2 + ((yy - y) / (ry + 0.2)) ** 2 + ((zz - z) / (rz + 0.2)) ** 2;
      return yy >= 0 && d <= 1 + (hash(xx, yy, zz, seed + 9) - 0.5) * 0.35;
    },
    (xx, yy, zz) => (moss && yy >= y + ry * 0.4 && hash(xx, yy, zz, seed + 3) < 0.55 ? C.moss : shade(base, 0.92 + hash(xx, yy, zz, seed) * 0.16)));
}

export default {
  id: 'onsen',
  order: 8,
  name: 'Onsen Friends',
  jp: 'おんせんどうぶつ',
  tagline: 'Animals melting happily into hot springs',
  taglineJp: 'いいゆだな〜♨',
  price: 400,
  themes: ['nature', 'cute'],
  card: { bg: '#e2f3ef', accent: '#e0553a', text: '#25403b', accent2: '#f2b33d', pattern: 'waves' },
  capsule: { colors: [0x8fd8e6, 0xb07a4c, 0xffd21f, 0xffffff, 0xf08a6a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'yuzucapy', name: 'Yuzu-yu Capybara', jp: 'ゆず湯カピバラ', rarity: 'common',
      desc: 'Winter solstice yuzu bath. It has not moved in four hours. Possibly forever.',
      build(v) {
        okeTub(v, 10, 9, { water: 0xbfe6b8, waterH: 7 });
        // body under the water, shoulders breaking the surface
        v.ellipsoid(0, 5, -2, 6.5, 4.2, 6.5, CAPY);
        v.ellipsoid(0, 7.5, 0, 4.2, 2.6, 3.6, CAPY);
        capyHead(v, 0, 11, 0.5, 1.15);
        yuzu(v, 0, 14, -0.5, true);
        // floating yuzu
        yuzu(v, -6, 7, 4); yuzu(v, 6, 7, 3); yuzu(v, 4, 7, -6);
      },
    },
    {
      id: 'saru', name: 'Snow Monkey Soak', jp: 'ゆきみざる', rarity: 'common',
      desc: 'Snow on the rocks, towel on the head, absolutely zero plans for today.',
      build(v) {
        // rock pool on a mossy base
        v.cylinder(0, 0, 0, 10.5, 1, 0x6d6a64);
        v.cylinder(0, 1, 0, 7.6, 1, 0x4f6b70);
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2 + 0.2;
          const r = 1.9 + hash(i, 0, 0, 5) * 1.1;
          rock(v, Math.round(Math.cos(a) * 9), 2, Math.round(Math.sin(a) * 9), r, 1.8 + hash(i, 1, 0, 5) * 1.6, r, i);
        }
        v.cylinder(0, 1, 0, 7.6, 3, glass(WATER));
        // snow caps on the rocks
        v.recolor((x, y, z, c, m) => {
          if (m !== 0 || y < 3 || Math.hypot(x, z) < 7.2) return undefined;
          return v.has(x, y + 1, z) ? undefined : (hash(x, y, z, 2) < 0.85 ? C.white : undefined);
        });
        // macaque
        const fur = 0xa8957c, furL = 0xcbbba3, face = 0xef8a86;
        v.ellipsoid(0, 5, -1, 4.6, 4.2, 4, fur);
        v.ellipsoid(0, 11, 0, 3.8, 3.4, 3.4, fur);
        v.paint(() => {
          v.ellipsoid(0, 10.6, 2.8, 3.2, 2.8, 1.4, furL); // fluffy cheek ruff
          v.ellipsoid(0, 10.4, 3.1, 2.2, 2.2, 1.2, face);
        });
        v.paint(() => v.ellipsoid(0, 10.4, 3.4, 2.3, 2.3, 1.2, face));
        v.project(['KK.KK', '.....', '.N.N.', '..M..'], { K, N: 0x9a4a46, M: 0xb04a4a }, -2, 11);
        v.project(['P...P'], { P: 0xff6f7a }, -2, 9);
        // ears
        v.set(-4, 11, 0, face); v.set(4, 11, 0, face);
        // hands resting on the pool edge
        v.ellipsoid(-4, 6, 3, 1.4, 1.2, 1.4, fur);
        v.ellipsoid(4, 6, 3, 1.4, 1.2, 1.4, fur);
        v.box(-4, 6, 4, -3, 6, 5, face); v.box(3, 6, 4, 4, 6, 5, face);
        // folded towel on the head
        towel(v, -2, 14, -2, 2, 1, C.sky);
        v.set(-2, 15, -2, W);
        // a tiny snowball on a rock
        v.sphere(-7, 7, 5, 1, C.white);
      },
    },
    {
      id: 'penguin', name: 'Bath Pail Penguin', jp: 'せんめんきペンギン', rarity: 'common',
      desc: 'Brought its own yellow pail, soap and shampoo. A seasoned sento regular.',
      build(v) {
        // wooden sunoko duckboard
        v.box(-7, 0, -6, 7, 0, 6, shade(HINOKI_D, 0.8));
        v.shape(-7, 1, -6, 7, 1, 6, (x, y, z) => mod(z, 3) !== 0, HINOKI);
        // Adélie-style penguin
        const back = 0x2b3140;
        v.ellipsoid(0, 10.5, -1, 5, 8.5, 4.6, back);
        v.paint(() => v.ellipsoid(0, 9, 1.8, 3.9, 6.6, 3.2, W));
        decal(v, ['.W...W.', 'WKW.WKW', '.W...W.'], { W, K }, -3, 16, 8);
        decal(v, ['P.....P'], { P: C.blush }, -3, 13, 8);
        v.box(-1, 14, 4, 1, 14, 4, gloss(C.orange));
        v.set(0, 14, 5, gloss(C.orange)); v.set(0, 13, 4, gloss(shade(C.orange, 0.85)));
        // feet + little tail
        v.box(-3, 2, 2, -1, 2, 4, C.orange); v.box(1, 2, 2, 3, 2, 4, C.orange);
        v.box(-1, 3, -5, 1, 4, -5, back); v.set(0, 3, -6, back);
        // pink towel scarf (wraps round the neck, one end hanging)
        const scarf = [];
        for (let y = 10; y <= 10; y++) for (let x = -7; x <= 7; x++) for (let z = -8; z <= 7; z++) {
          if (!v.has(x, y, z) && (v.has(x + 1, y, z) || v.has(x - 1, y, z) || v.has(x, y, z + 1) || v.has(x, y, z - 1))) scarf.push([x, y, z]);
        }
        for (const [x, y, z] of scarf) v.set(x, y, z, mod(x + z, 4) === 0 ? C.hotpink : C.pastelPink);
        v.box(2, 6, 4, 3, 9, 4, C.pastelPink);
        v.paint(() => v.box(2, 6, 4, 3, 6, 4, C.hotpink));
        // flippers reaching down to the pail rim
        for (const sx of [-1, 1]) {
          v.line(sx * 5, 12, -0.5, sx * 5.5, 8, 2.5, back, 1);
          v.line(sx * 5.5, 8, 2.5, sx * 4, 6, 5, back, 1);
        }
        // yellow bath pail with soap, shampoo and a towel
        v.tube(0, 2, 7, 3, 2, 4, gloss(C.yellow));
        v.cylinder(0, 2, 7, 2, 1, gloss(C.yellow));
        v.paint(() => v.tube(0, 5, 7, 3, 2, 1, gloss(0xffe46a)));
        v.box(-1, 3, 6, 1, 5, 8, W);
        v.box(-2, 6, 6, -1, 6, 7, gloss(C.pastelPink));
        v.box(1, 6, 7, 1, 7, 7, gloss(C.sky)); v.set(1, 8, 7, W);
        v.box(-1, 6, 8, 0, 6, 8, W); v.set(0, 6, 9, W);
      },
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'tanukimilk', name: 'Coffee Milk Tanuki', jp: 'コーヒー牛乳たぬき', rarity: 'uncommon',
      desc: 'Hand on hip, head tilted back, bottle drained in one go. The sacred ritual.',
      build(v) {
        // changing-room floorboards
        v.box(-8, 0, -6, 8, 0, 6, 0xc79a62);
        v.paint(() => v.shape(-8, 0, -6, 8, 0, 6, (x) => mod(x, 3) === 0, 0xa87c4a));
        const fur = C.tanuki, furD = C.tanukiDark, cream = 0xe9d2b0;
        const yk = 0x2f4f8f, ykL = 0xdfe8f5, obi = 0xe0a030;
        // feet + legs
        v.box(-3, 1, -1, -1, 2, 2, furD); v.box(1, 1, -1, 3, 2, 2, furD);
        // bushy tail
        v.ellipsoid(0, 5, -5, 2.4, 3, 2.4, fur);
        v.paint(() => { v.box(-3, 4, -8, 3, 4, -3, furD); v.box(-3, 7, -8, 3, 7, -3, furD); });
        // yukata body
        v.ellipsoid(0, 9, 0, 5, 6.2, 4, yk);
        v.box(-4, 3, -3, 4, 4, 3, yk);
        v.paint(() => v.shape(-6, 3, -5, 6, 15, 5, (x, y, z) => mod(x + y * 2, 4) === 0 && mod(y + z, 3) === 0, ykL));
        v.paint(() => v.box(-6, 8, -5, 6, 9, 5, obi));
        v.paint(() => v.box(-6, 8, -5, 6, 8, 5, shade(obi, 0.85)));
        v.ellipsoid(0, 8.5, -4.5, 2, 1.4, 1, obi); // obi bow
        // crossed collar showing a cream chest
        v.paint(() => v.shape(-3, 10, 2, 3, 15, 5, (x, y) => Math.abs(x) <= (y - 10) * 0.6, cream));
        v.paint(() => v.shape(-3, 10, 2, 3, 15, 5, (x, y) => Math.abs(Math.abs(x) - (y - 10) * 0.6) < 0.6, ykL));
        // head
        v.ellipsoid(0, 18, 0.5, 4.3, 3.6, 3.8, fur);
        v.paint(() => {
          v.ellipsoid(0, 16.8, 3.2, 2.6, 1.8, 1.6, cream); // muzzle
          v.box(-5, 18, 2, -1, 19, 5, furD); v.box(1, 18, 2, 5, 19, 5, furD); // mask
        });
        v.project(['K...K', '.K.K.'], { K: cream }, -5, 19);
        v.project(['.K...K.'], { K: cream }, -3, 19);
        v.project(['N'], { N: K }, 0, 17);
        v.set(0, 17, 5, K);
        v.project(['P.....P'], { P: C.blush }, -3, 17);
        v.box(-4, 21, -1, -3, 22, 0, furD); v.box(3, 21, -1, 4, 22, 0, furD); // ears
        // towel round the neck
        v.paint(() => v.shape(-5, 14, -5, 5, 14, 5, () => true, W));
        v.box(-2, 11, 4, -1, 14, 4, W);
        // right arm: hand on hip (wide yukata sleeve)
        v.line(4.5, 12.5, 0, 7, 10, 0, yk, 1);
        v.line(7, 10, 0, 5, 8, 1, yk, 1);
        v.box(6, 8, -1, 8, 10, 1, yk);
        v.paint(() => v.box(6, 8, -1, 8, 8, 1, ykL));
        v.box(5, 8, 2, 5, 9, 2, furD);
        // left arm raised: coffee-milk bottle tipped up at the mouth
        v.line(-4.5, 13, 0, -6.5, 16, 3, yk, 1);
        v.box(-7, 13, 2, -6, 15, 4, yk);
        v.line(-6, 17, 4, -3, 19, 6, furD, 0.8);
        // glass bottle of coffee milk, tipped bottom-up: cap at the mouth, milk, glass shoulder
        const A = [0, 17, 6], B = [-3.4, 22, 8.2];
        const seg = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L2 = seg[0] ** 2 + seg[1] ** 2 + seg[2] ** 2;
        v.shape(-6, 15, 4, 2, 24, 11, (x, y, z) => {
          const t = Math.max(0, Math.min(1, ((x - A[0]) * seg[0] + (y - A[1]) * seg[1] + (z - A[2]) * seg[2]) / L2));
          const d2 = (x - A[0] - seg[0] * t) ** 2 + (y - A[1] - seg[1] * t) ** 2 + (z - A[2] - seg[2] * t) ** 2;
          return d2 <= (t < 0.3 ? 0.7 : 2.1);
        }, (x, y, z) => {
          const t = ((x - A[0]) * seg[0] + (y - A[1]) * seg[1] + (z - A[2]) * seg[2]) / L2;
          const tc = Math.max(0, Math.min(1, t));
          const d2 = (x - A[0] - seg[0] * tc) ** 2 + (y - A[1] - seg[1] * tc) ** 2 + (z - A[2] - seg[2] * tc) ** 2;
          if (t < 0.12) return W;
          if (t > 0.94) return glass(0xe8f4f8);
          return d2 <= 0.8 && t < 0.88 ? 0xa8703e : glass(0xe8f4f8);
        });
        v.set(-1, 18, 7, C.red); // printed paper cap
      },
    },
    {
      id: 'kaeru', name: 'Hinoki Tub Frog', jp: 'ひのき風呂ガエル', rarity: 'uncommon',
      desc: 'Elbows on the rim, sake tray floating by. Frogs have simply figured life out.',
      build(v) {
        // square hinoki tub
        v.box(-8, 0, -6, 8, 0, 6, HINOKI_D);
        v.hollowBox(-8, 1, -6, 8, 6, 6, HINOKI, 1, ['top', 'bottom']);
        v.paint(() => {
          v.shape(-8, 1, -6, 8, 6, 6, (x, y, z) => (Math.abs(z) === 6 && mod(x, 3) === 1) || (Math.abs(x) === 8 && mod(z, 3) === 0), shade(HINOKI, 0.92));
          v.box(-8, 6, -6, 8, 6, 6, shade(HINOKI, 1.07));
          for (const sx of [-8, 8]) for (const sz of [-6, 6]) v.box(sx, 0, sz, sx, 6, sz, HINOKI_D);
        });
        v.hollowBox(-7, 1, -5, 7, 4, 5, WET, 1, ['top', 'bottom']);
        v.paint(() => v.box(-7, 0, -5, 7, 0, 5, WET));
        v.box(-6, 1, -4, 6, 4, 4, glass(WATER));
        // frog
        const g = 0x86d160, gD = 0x5aa83c, belly = 0xf6f2b8;
        v.ellipsoid(0, 4.5, -1, 5, 3.4, 4, g);
        v.paint(() => v.ellipsoid(0, 4, 1.8, 4, 2.8, 2.2, belly));
        v.ellipsoid(0, 8.6, 0, 5.2, 3.1, 4.2, g);
        v.paint(() => v.ellipsoid(0, 6.6, 2.6, 4, 1, 1.8, belly));
        // eye bumps with blissfully closed eyes
        for (const sx of [-1, 1]) {
          v.sphere(sx * 3, 11, 1, 1.5, g);
          decal(v, ['.W.', 'WKW', '.W.'], { K, W }, sx * 3 - 1, 12, 6);
        }
        // spots
        v.paint(() => { v.set(-4, 10, -2, gD); v.set(3, 11, -3, gD); v.set(5, 9, -1, gD); v.set(-2, 11, -3, gD); });
        // happy smile + cheeks
        decal(v, ['M...M', '.MMM.'], { M: 0x2f6a2a }, -2, 8, 8);
        decal(v, ['PP.....PP'], { P: C.blush }, -4, 9, 8);
        // arms draped over the back rim
        for (const sx of [-1, 1]) {
          v.line(sx * 4.6, 7, -2, sx * 6, 7, -5, g, 1);
          v.box(sx * 5 - (sx > 0 ? 0 : 2), 7, -7, sx * 5 + (sx > 0 ? 2 : 0), 7, -6, gD);
        }
        // towel between the eyes
        towel(v, -1, 12, -2, 1, 0, C.pink);
        // floating sake tray: tokkuri + two cups
        v.box(2, 5, 2, 6, 5, 5, 0x9e4a2c);
        v.paint(() => v.box(3, 5, 3, 5, 5, 4, 0x7a2e1c));
        v.box(4, 6, 3, 4, 8, 3, gloss(C.ceramic)); v.set(4, 9, 3, gloss(C.ceramic));
        v.paint(() => v.set(4, 7, 3, gloss(C.blue)));
        v.set(3, 6, 5, gloss(C.ceramic)); v.set(5, 6, 4, gloss(C.ceramic));
      },
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'kawauso', name: 'Sea Otter Family Bath', jp: 'ラッコ親子のおふろ', rarity: 'rare',
      desc: 'Holding hands so nobody drifts away. Dad brought his favourite rock.',
      build(v) {
        // shallow oval hinoki tarai
        const inOval = (x, z, rx, rz) => (x / rx) ** 2 + (z / rz) ** 2 <= 1;
        v.shape(-13, 0, -9, 13, 0, 9, (x, y, z) => inOval(x, z, 12.4, 8.4), HINOKI_D);
        v.shape(-13, 1, -9, 13, 4, 9, (x, y, z) => inOval(x, z, 12.4, 8.4) && !inOval(x, z, 11.3, 7.3), HINOKI);
        v.paint(() => v.shape(-13, 1, -9, 13, 4, 9, (x, y, z) => mod(x + Math.round(z / 3), 3) === 0, shade(HINOKI, 0.93)));
        v.paint(() => v.shape(-13, 4, -9, 13, 4, 9, () => true, shade(HINOKI, 1.07)));
        v.shape(-14, 2, -10, 14, 2, 10, (x, yy, z) => inOval(x, z, 13.3, 9.3) && !inOval(x, z, 12.4, 8.4), gloss(COPPER));
        v.shape(-12, 1, -8, 12, 3, 8, (x, y, z) => inOval(x, z, 11.3, 7.3) && !inOval(x, z, 10.3, 6.3), WET);
        v.paint(() => v.shape(-12, 0, -8, 12, 0, 8, (x, y, z) => inOval(x, z, 11.3, 7.3), WET));
        v.shape(-12, 1, -8, 12, 3, 8, (x, y, z) => inOval(x, z, 10.3, 6.3), glass(WATER));
        const fur = 0x8a5e3a, furD = 0x5a3a22, belly = 0xa8784c, face = 0xeee0c4;
        // sea otter floating on its back: head raised at the back, toes poking up at the front
        const otter = (ax, eyes = 'open') => {
          v.ellipsoid(ax, 3.8, 0.8, 3.3, 1.9, 5, fur);
          v.paint(() => v.ellipsoid(ax, 5.1, 1, 2.5, 0.9, 4, belly));
          v.ellipsoid(ax, 7, -3.6, 3, 2.7, 2.5, fur);
          v.paint(() => v.ellipsoid(ax, 6.8, -2, 2.6, 2.2, 1.4, face));
          v.ellipsoid(ax, 6, -1.2, 1.6, 1.1, 1, face);
          v.set(ax, 6, 0, K); v.set(ax, 5, 0, face);
          if (eyes === 'open') { dot(v, ax - 1, 8, 1, K); dot(v, ax + 1, 8, 1, K); }
          else { for (const ex of [-2, -1, 1, 2]) dot(v, ax + ex, 8, 1, K); }
          dot(v, ax - 2, 7, 1, C.blush); dot(v, ax + 2, 7, 1, C.blush);
          v.set(ax - 2, 6, 0, W); v.set(ax + 2, 6, 0, W); // whiskers
          v.box(ax - 2, 9, -4, ax - 2, 10, -4, furD); v.box(ax + 2, 9, -4, ax + 2, 10, -4, furD); // ears
          v.box(ax - 1, 5, 5, ax - 1, 6, 5, furD); v.box(ax + 1, 5, 5, ax + 1, 6, 5, furD); // toes
        };
        otter(-5);
        otter(5, 'closed');
        // holding hands across the gap
        stair(v, -3, 5, 0, -1, 5, 0, fur);
        stair(v, 3, 5, 0, 0, 5, 0, fur);
        v.set(0, 5, 0, furD); v.set(-1, 5, 0, furD);
        // dad's favourite rock on his tummy, held in both paws
        v.box(4, 6, 1, 6, 6, 2, 0x9a958e);
        v.set(5, 7, 1, 0xb0aba2);
        v.set(3, 6, 2, fur); v.set(7, 6, 2, fur);
        // pup napping on mum's tummy, hugging a clam
        v.ellipsoid(-5, 6.6, 1.6, 1.9, 1.3, 2.2, fur);
        v.ellipsoid(-5, 8.6, 2.6, 1.8, 1.6, 1.5, fur);
        v.paint(() => v.ellipsoid(-5, 8.3, 3.6, 1.4, 1.2, 0.8, face));
        v.set(-5, 8, 4, K); dot(v, -6, 9, 6, K); dot(v, -4, 9, 6, K);
        v.set(-6, 10, 2, furD); v.set(-4, 10, 2, furD);
        v.box(-6, 7, 4, -4, 7, 4, gloss(0xffb0a0));
        v.paint(() => v.set(-5, 7, 4, gloss(0xffd5cb)));
        // floating kelp so nobody drifts off
        v.box(-10, 3, 2, -9, 3, 4, 0x4f7a3a); v.set(-8, 3, 5, 0x4f7a3a); v.box(9, 3, -4, 10, 3, -3, 0x4f7a3a); v.set(9, 3, 3, 0x4f7a3a);
      },
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'rotenburo', name: 'Rotenburo Retreat', jp: '露天風呂でゆったり', rarity: 'ultra',
      desc: 'Bamboo fence, stone lantern, autumn leaves. Reservations: capybaras only.',
      build(v) {
        // ground
        v.box(-13, 0, -11, 13, 1, 11, 0x6f8f4a);
        v.paint(() => v.shape(-13, 1, -11, 13, 1, 11, (x, y, z) => hash(x, 1, z, 4) < 0.3, 0x5f7f3e));
        v.paint(() => v.box(-13, 0, -11, 13, 0, 11, 0x6a5440));
        // pool
        const pcx = -1, pcz = 1;
        const inPool = (x, z) => ((x - pcx) / 9.5) ** 2 + ((z - pcz) / 7.2) ** 2 <= 1 + (hash(x, 0, z, 8) - 0.5) * 0.12;
        v.shape(-13, 1, -11, 13, 1, 11, (x, y, z) => inPool(x, z), 0x45606a);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const front = Math.sin(a) > 0.4;
          const rx = pcx + Math.cos(a) * 10.4, rz = pcz + Math.sin(a) * 8;
          const r = (front ? 1.4 : 1.9) + hash(i, 0, 0, 3) * 1.1;
          rock(v, Math.round(rx), 2, Math.round(rz), r, front ? 1.3 : 1.6 + hash(i, 2, 0, 3) * 1.5, r * 0.9, i + 20, !front);
        }
        v.shape(-13, 2, -11, 13, 3, 11, (x, y, z) => inPool(x, z) && !v.has(x, y, z), glass(WATER));
        // bamboo fence at the back
        for (let x = -13; x <= 13; x++) {
          const tone = mod(x, 3) === 0 ? 0xa9b55a : mod(x, 3) === 1 ? 0xbcc86a : 0x9fae52;
          const top = 18 + (mod(x, 2) === 0 ? 1 : 0);
          v.box(x, 2, -11, x, top, -10, tone);
          v.paint(() => { for (let y = 4 + mod(x * 2, 3); y <= top; y += 5) v.set(x, y, -10, shade(tone, 0.75)); });
        }
        for (const y of [6, 14]) {
          v.box(-13, y, -9, 13, y, -9, 0x6b4a2a);
          v.box(-13, y, -12, 13, y, -12, 0x6b4a2a);
          for (let x = -12; x <= 12; x += 4) { v.set(x, y, -8, K); v.set(x, y + 1, -9, K); v.set(x, y - 1, -9, K); }
        }
        v.box(-13, 20, -11, 13, 20, -10, 0x6b4a2a); // cap rail
        // bamboo spout (kakehi) pouring into the pool
        v.box(-6, 4, -9, -6, 10, -9, 0x9fae52);
        v.box(-6, 10, -8, -6, 10, -5, 0xbcc86a);
        v.set(-6, 9, -5, 0xbcc86a);
        v.box(-6, 4, -4, -6, 8, -4, glass(0xc8f0ff));
        // stone lantern (tōrō)
        const st = 0xa8a39a, stD = 0x8c877f;
        v.box(8, 2, -8, 12, 2, -4, stD);
        v.cylinder(10, 3, -6, 1, 4, st);
        v.box(8, 7, -8, 12, 7, -4, stD);
        v.box(9, 8, -7, 11, 10, -5, st);
        v.box(10, 9, -5, 10, 9, -5, glow(0xffc864));
        v.set(9, 9, -6, glow(0xffc864)); v.set(11, 9, -6, glow(0xffc864)); v.set(10, 9, -6, glow(0xffd88a));
        v.box(7, 11, -9, 13, 11, -3, stD);
        v.box(8, 12, -8, 12, 12, -4, st);
        v.box(9, 13, -7, 11, 13, -5, st);
        for (const [cx, cz] of [[7, -9], [13, -9], [7, -3], [13, -3]]) v.set(cx, 12, cz, stD);
        v.sphere(10, 14.5, -6, 1, st);
        // little momiji maple
        v.box(-11, 2, -7, -11, 9, -7, C.darkbrown);
        v.line(-11, 7, -7, -9, 10, -6, C.darkbrown);
        for (const [mx, my, mz, r] of [[-11, 12, -7, 2.6], [-8.5, 11, -6, 1.9], [-12, 10, -5, 1.7]]) {
          v.shape(Math.floor(mx - r - 1), Math.floor(my - r - 1), Math.floor(mz - r - 1), Math.ceil(mx + r + 1), Math.ceil(my + r + 1), Math.ceil(mz + r + 1),
            (x, y, z) => ((x - mx) ** 2 + (y - my) ** 2 + (z - mz) ** 2) <= (r + 0.2) ** 2 && hash(x, y, z, 6) < 0.85,
            (x, y, z) => [0xe0452c, 0xf26b2a, 0xc8321f, 0xf5a03a][Math.floor(hash(x, y, z, 7) * 4)]);
        }
        // fallen leaves floating on the water
        for (const [lx, lz, c] of [[3, 5, 0xe0452c], [-4, 6, 0xf5a03a], [5, -2, 0xf26b2a]]) v.set(lx, 4, lz, c);
        // capybara family
        v.ellipsoid(-4, 3, -1.5, 4.2, 2, 4.5, CAPY);
        capyHead(v, -4, 6.8, 0, 1);
        yuzu(v, -4, 10, -0.5);
        v.ellipsoid(4, 3, -0.5, 3.8, 2, 4, CAPY);
        capyHead(v, 4, 6.5, 0.5, 0.9);
        towel(v, 3, 10, -0, 5, 2, C.pink);
        v.ellipsoid(0, 3.5, 4.5, 2, 1.3, 2, CAPY);
        capyHead(v, 0, 5.3, 5.2, 0.6, { blush: false });
        // wash bucket left by the pool
        v.cylinder(11, 2, 9, 2, 3, HINOKI);
        v.cylinder(11, 3, 9, 1, 2, glass(WATER));
        v.paint(() => v.tube(11, 3, 9, 2, 1, 1, gloss(COPPER)));
      },
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'kinkapi', name: 'Golden Kapi-sama', jp: '金のカピバラさま', rarity: 'secret',
      desc: 'Bathing deity of eternal relaxation. Grants one wish: five more minutes.',
      build(v) {
        const G = 0xf2c14e, GL = 0xffe08a, GD = 0xc9952a;
        // two-tier stone platform
        v.cylinder(0, 0, 0, 12.5, 1, 0x7d7870);
        v.cylinder(0, 1, 0, 11.5, 1, 0x9a958d);
        v.paint(() => v.shape(-13, 0, -13, 13, 1, 13, (x, y, z) => hash(x, y, z, 1) < 0.25, 0x8a857d));
        // aureole (glowing halo) behind the head, with sun-ray tips
        v.cylinder(0, 15, -5, 8, 1, gloss(GD), 'z');
        v.paint(() => {
          v.tube(0, 15, -5, 8, 6.8, 1, glow(0xffe38a), 'z');
          v.tube(0, 15, -5, 5.6, 4.6, 1, glow(0xfff2c0), 'z');
        });
        v.shape(-10, 5, -5, 10, 25, -5, (x, y, z) => {
          const a = Math.atan2(y - 15, x);
          const d = Math.hypot(x, y - 15);
          return y > 6 && d > 8.2 && d < 9.7 && mod(Math.round(a * 8 / Math.PI), 2) === 0;
        }, glow(0xffe38a));
        // rock-ringed sacred pool
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + 0.1;
          const front = Math.sin(a) > 0.3;
          const r = 1.7 + hash(i, 4, 0, 1) * 0.8;
          rock(v, Math.round(Math.cos(a) * 9.6), 3, Math.round(Math.sin(a) * 9.2), r, front ? 1.2 : 1.6, r, i + 40);
        }
        v.paint(() => v.shape(-9, 1, -9, 9, 1, 9, (x, y, z) => Math.hypot(x, z) <= 8.6, 0x3f8f96));
        v.shape(-9, 2, -9, 9, 3, 9, (x, y, z) => Math.hypot(x, z) <= 8.6 && !v.has(x, y, z), glass(0x9fe8e0));
        // the golden capybara, sitting upright like a lucky cat
        v.ellipsoid(0, 7.5, -0.5, 6, 5.6, 5.2, G);
        capyHead(v, 0, 14.5, 1.5, 1.3, { fur: G, nose: G, len: 0.8 });
        v.recolor((x, y, z, c, m) => (m === 0 && (c === G || c === shade(G, 1.1) || c === shade(G, 0.7)) ? gloss(c) : undefined));
        v.paint(() => {
          v.ellipsoid(-2, 17, 0, 2, 0.8, 2.5, gloss(GL));
          v.ellipsoid(-3, 10, 2.5, 1.5, 2, 1.8, gloss(GL));
          v.box(-7, 2, -6, 7, 3, 5, gloss(GD));
        });
        // red bib with a gold bell
        v.paint(() => v.shape(-6, 10, -4, 6, 11, 6, (x, y, z) => y === 11 || (z > 2 && Math.abs(x) <= 2), gloss(C.red)));
        v.sphere(0, 9, 5, 1, gloss(0xffe066));
        v.set(0, 8, 6, gloss(GD));
        // beckoning paw raised high (maneki style)
        v.line(4.5, 10, 1, 7, 14, 3, gloss(G), 1.2);
        v.ellipsoid(7, 15.5, 3, 1.5, 1.6, 1.3, gloss(G));
        v.box(6, 15, 4, 8, 16, 4, gloss(C.pink));
        v.paint(() => v.set(7, 16, 4, gloss(C.hotpink)));
        // other paw hugging a koban coin
        v.ellipsoid(-3.5, 7, 4.5, 1.4, 1.4, 1.2, gloss(G));
        v.box(-3, 5, 6, -1, 9, 6, gloss(0xffe066));
        v.remove(-3, 5, 6); v.remove(-3, 9, 6); v.remove(-1, 5, 6); v.remove(-1, 9, 6);
        v.box(-2, 6, 7, -2, 8, 7, gloss(GD));
        // lucky mikan crown
        v.sphere(0, 19, 0, 2, gloss(0xff9a1f));
        v.paint(() => v.set(-1, 20, 1, gloss(0xffbb55)));
        v.set(0, 21, 0, C.darkbrown); v.box(1, 21, 0, 2, 21, 0, C.leaf); v.set(-1, 21, 0, C.leaf);
        // shimenawa rope with zig-zag shide papers round the rocks
        const rope = [];
        for (let x = -12; x <= 12; x++) for (let z = -12; z <= 12; z++) {
          const d = Math.hypot(x, z / 0.96);
          if (d > 10 && d < 11.1 && z > -7) rope.push([x, z]);
        }
        for (const [x, z] of rope) v.set(x, 4, z, mod(x + z, 2) === 0 ? 0xeedc96 : 0xc8ac5a);
        for (const [sx, sz] of [[-6, 9], [0, 11], [6, 9]]) {
          v.layer(['W.', 'WW', '.W'], { W }, { x: sx, y: 3, z: sz + 1 });
        }
        // koban coins floating in the water
        for (const [cx, cz] of [[-6, 2], [5, 6], [-5, -4], [6, -3]]) { v.box(cx, 4, cz, cx + 1, 4, cz, gloss(0xffe066)); }
        // offering box at the front
        v.box(-2, 2, 10, 2, 4, 12, 0x9a6438);
        v.paint(() => v.shape(-2, 4, 10, 2, 4, 12, (x) => mod(x, 2) === 0, 0x3a2414));
        v.paint(() => v.box(-2, 3, 12, 2, 3, 12, gloss(C.gold)));
      },
    },
  ],
};
