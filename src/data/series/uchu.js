// Series 11 — Uchū Neko Station (宇宙ねこステーション)
// Cats in space: helmets, rockets, UFOs and one very stunned cosmic kitty.
import { C, shade } from '../../voxel/palette.js';
import { VoxelModel, gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;
const HELMET = 0xd8f2ff;

/** Deterministic coordinate hash in [0, 1). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Solid of revolution along an arbitrary direction. rFn(t) = radius at distance t from the base. */
function lathe(v, [bx, by, bz], dir, len, rFn, c) {
  const n = Math.hypot(dir[0], dir[1], dir[2]);
  const [ax, ay, az] = dir.map((k) => k / n);
  let rMax = 0;
  for (let t = 0; t <= len; t += 0.25) rMax = Math.max(rMax, rFn(t));
  const ex = [bx, bx + ax * len], ey = [by, by + ay * len], ez = [bz, bz + az * len];
  const tOf = (x, y, z) => (x - bx) * ax + (y - by) * ay + (z - bz) * az;
  v.shape(
    Math.floor(Math.min(...ex) - rMax - 1), Math.floor(Math.min(...ey) - rMax - 1), Math.floor(Math.min(...ez) - rMax - 1),
    Math.ceil(Math.max(...ex) + rMax + 1), Math.ceil(Math.max(...ey) + rMax + 1), Math.ceil(Math.max(...ez) + rMax + 1),
    (x, y, z) => {
      const t = tOf(x, y, z);
      if (t < -0.5 || t > len + 0.5) return false;
      const px = x - bx - ax * t, py = y - by - ay * t, pz = z - bz - az * t;
      const r = rFn(Math.max(0, Math.min(len, t)));
      return r > 0 && px * px + py * py + pz * pz <= (r + 0.2) * (r + 0.2);
    },
    typeof c === 'function' ? (x, y, z) => c(tOf(x, y, z), x, y, z) : c,
  );
  return v;
}

const floorClip = (v) => v.box(-40, -12, -40, 40, -1, 40, null);

/** Cut the front of a glass bubble helmet open so the face reads clearly. */
function openVisor(v, cx, cy, zFrom, r) {
  const R = Math.ceil(r) + 2;
  v.shape(cx - R, cy - R, zFrom, cx + R, cy + R, zFrom + 8, (x, y, z) => Math.hypot(x - cx, y - cy) <= r && v.get(x, y, z) !== null && v.get(x, y, z) >= 0x8000000 + 4 * 0x1000000, null);
}

/** Dark display stand: round base + metal post up to `top`. */
function stand(v, r, top, { base = 0x262a4a, trim = gloss(0xf2c14e), post = 1 } = {}) {
  v.cylinder(0, 0, 0, r, 2, gloss(base));
  const R = Math.ceil(r) + 1;
  v.paint(() => v.shape(-R, 1, -R, R, 1, R, (x, y, z) => Math.hypot(x, z) > r - 0.6, trim));
  if (top > 2) v.box(-post + 1, 2, -post + 1, post - 1, top, post - 1, metal(C.steel));
}

/**
 * Big cat head (r≈4) as its own model, centred at 0, facing +z.
 * o: { coat, inner, eyes: 'open'|'closed'|'stunned'|'red', muzzle, stripes, patch, mouth }
 */
function catHead(o = {}) {
  const h = new VoxelModel();
  const coat = o.coat ?? C.orange;
  const sm = o.small ? 1 : 0;
  if (sm) h.ellipsoid(0, 0, 0, 3.4, 2.9, 2.8, coat);
  else h.ellipsoid(0, 0, 0, 4, 3.4, 3.3, coat);
  if (o.patch) h.paint(() => h.ellipsoid(o.patch[0], o.patch[1], 1, 2.6, 2.4, 4, o.patch[2]));
  if (o.muzzle) h.paint(() => h.ellipsoid(0, -1.6, 2.6, 2.3, 1.5, 1.2, o.muzzle));
  // ears with pink insides
  for (const s of [-1, 1]) {
    const ec = o.earC?.[s > 0 ? 1 : 0] ?? coat;
    if (sm) {
      h.box(s * 1, 3, -1, s * 3, 3, 0, ec).box(s * 2, 4, -1, s * 3, 4, 0, ec);
      h.set(s * 2, 3, 0, o.inner ?? C.pink);
    } else {
      h.box(s * 1, 3, -1, s * 3, 3, 0, ec).box(s * 2, 4, -1, s * 3, 4, 0, ec).set(s * 3, 5, -1, ec).set(s * 3, 5, 0, ec);
      h.set(s * 2, 3, 0, o.inner ?? C.pink).set(s * 2, 4, 0, o.inner ?? C.pink);
    }
  }
  if (o.stripes) {
    h.project(['D.D', 'D.D', '.D.'], { D: o.stripes }, -1, 3);
    h.project(['D', '.', 'D'], { D: o.stripes }, -4, 3, '+x');
    h.project(['D', '.', 'D'], { D: o.stripes }, -4, 3, '-x');
  }
  const F = { K, W, P: C.blush, M: K, N: C.hotpink, R: C.red, T: C.tongue };
  const eyes = {
    open: ['KW...KW', 'KK...KK'],
    closed: ['.......', 'KK...KK'],
    red: ['RW...RW', 'RR...RR'],
    happy: ['.K...K.', 'K.K.K.K'],
  }[o.eyes || 'open'];
  h.project(eyes, F, -3, 1);
  h.project(['P.....P'], F, -3, -1);
  h.project(['.N.', 'M.M'], F, -1, -1);
  if (o.mouth === 'open') h.project(['T'], F, 0, -3);
  return h;
}

/** Tiny whole cat (≈5 wide, 8 tall) sitting at the origin facing +z. */
function miniCat(coat, { patch, eye = K, wave = 0, scarf } = {}) {
  const m = new VoxelModel();
  m.ellipsoid(0, 1.6, 0, 1.9, 1.7, 1.7, coat);
  m.ellipsoid(0, 4.6, 0.3, 2.3, 2, 2, coat);
  floorClip(m);
  for (const s of [-1, 1]) m.set(s * 1, 6, 0, coat).set(s * 2, 6, 0, coat).set(s * 2, 7, 0, coat).set(s * 1, 6, 1, C.pink);
  if (patch) m.paint(() => m.ellipsoid(1.5, 5.5, 0, 1.6, 1.4, 2.5, patch));
  m.project(['K.K'], { K: eye }, -1, 5);
  m.project(['P.P'], { P: C.blush }, -2, 4);
  m.project(['N'], { N: C.hotpink }, 0, 4);
  m.set(-1, 0, 1, shade(coat, 1.08)).set(1, 0, 1, shade(coat, 1.08)); // paws
  for (const [x, y, z] of [[0, 1, -2], [0, 1, -3], [0, 2, -3], [0, 3, -3], [1, 3, -3], [1, 4, -3]]) m.set(x, y, z, coat); // tail
  if (wave) for (const [x, y, z] of [[-2, 3, 0], [-3, 3, 0], [-3, 4, 0], [-3, 5, 0], [-3, 6, 0], [-3, 7, 0]]) m.set(x, y, z, coat);
  if (scarf) m.paint(() => m.box(-3, 3, -3, 3, 3, 3, scarf));
  return m;
}

export default {
  id: 'uchu',
  order: 11,
  name: 'Uchū Neko Station',
  jp: '宇宙ねこステーション',
  tagline: 'Cats on a mission to nap in orbit',
  taglineJp: 'にゃんと宇宙へ！',
  price: 800,
  themes: ['space', 'cute'],
  card: { bg: '#1e2452', accent: '#ffd23f', text: '#f4ecff', accent2: '#8fd3ff', pattern: 'stars' },
  capsule: { colors: [0x2c3f86, 0x8a5bd6, 0xffd23f, 0xbfe3ff, 0xff9fd0] },
  items: [
    {
      id: 'astro', name: 'Astro-Neko', jp: 'アストロにゃん', rarity: 'common',
      desc: 'First cat in orbit. Knocked the Moon off its shelf on day one.',
      build(v) {
        const suit = 0xf4f1ea, suitD = shade(suit, 0.85);
        // glass helmet bubble first, so everything inside overwrites it
        v.sphere(0, 15.5, 0.5, 5.6, glass(HELMET));
        v.paint(() => { v.box(-4, 18, 4, -2, 19, 7, glass(W)); v.set(-5, 17, 3, glass(W)); });
        // boots + legs
        for (const s of [-1, 1]) {
          v.ellipsoid(2.2 * s, 1, 1, 1.9, 1.2, 2.3, gloss(C.gray));
          v.cylinder(2.2 * s, 1, 0, 1.6, 3, suit);
        }
        // suit body
        v.ellipsoid(0, 7, 0, 4.8, 4.4, 3.9, suit);
        v.paint(() => v.box(-6, 4, -5, 6, 4, 5, suitD));
        v.paint(() => v.box(-6, 5, -5, 6, 5, 5, C.orange));
        // chest control panel with blinking buttons
        v.box(-2, 7, 4, 2, 9, 4, gloss(C.lightgray));
        v.set(-1, 8, 5, glow(C.red)).set(0, 8, 5, glow(C.lime)).set(1, 8, 5, glow(C.sky));
        v.box(-1, 7, 5, 1, 7, 5, gloss(C.darkgray));
        // backpack with a beacon
        v.box(-3, 5, -6, 3, 11, -4, gloss(0xd9d4ca));
        v.box(-2, 6, -7, 2, 7, -7, gloss(C.gray));
        v.set(0, 12, -5, glow(C.orange));
        // arms: one waving, one holding a fishy treat
        v.line(-4.5, 9, 0, -7, 13, 1, suit, 1.3);
        v.sphere(-7, 13.5, 1, 1.5, gloss(C.gray));
        v.line(4.5, 9, 0, 5.5, 5.5, 1.5, suit, 1.3);
        v.sphere(5.5, 5, 2, 1.5, gloss(C.gray));
        // niboshi (dried sardine) treat
        v.layer(['s.sss.', 'ssssKs', 's.sss.'], { s: gloss(0xb9cadb), K }, { x: 4, y: 6, z: 4 });
        // metal neck ring + mission patch
        v.torus(0, 11, 0.5, 3.4, 0.8, metal(C.silver));
        v.project(['bY', 'bb'], { b: C.navy, Y: C.yellow }, 2, 10, '+x');
        // orange tabby head inside
        v.merge(catHead({ coat: C.orange, stripes: shade(C.orange, 0.78), muzzle: C.white }), 0, 15, 1);
        openVisor(v, 0, 15, 3, 4.6);
        // tail poking out the back of the suit
        v.line(0, 5, -4, 0, 9, -8, C.orange, 1);
        v.set(0, 10, -9, shade(C.orange, 0.72)).set(0, 11, -9, shade(C.orange, 0.72));
        v.paint(() => v.box(-1, 7, -7, 1, 7, -6, shade(C.orange, 0.72)));
        // antenna on the helmet
        v.box(3, 20, 0, 3, 23, 0, metal(C.silver));
        v.sphere(3, 24, 0, 0.8, glow(C.red));
      },
    },
    {
      id: 'nap', name: 'Planet Nap', jp: 'わくせいおひるね', rarity: 'common',
      desc: 'Found the warmest planet in the galaxy. Will not be moving, thanks.',
      build(v) {
        stand(v, 4.5, 4);
        // little blue-green planet with clouds
        const sea = 0x7fc8ff, land = 0x8fd46a;
        v.sphere(0, 11, 0, 7, gloss(sea));
        v.recolor((x, y, z) => {
          if (y < 4) return undefined;
          const n = hash(x >> 1, y >> 1, z >> 1, 3) + hash(x >> 2, y >> 2, z >> 2, 9) * 0.8;
          return n > 1.05 ? gloss(land) : n > 0.98 ? gloss(shade(land, 1.12)) : undefined;
        });
        v.recolor((x, y, z) => (y >= 4 && Math.abs(y - 13) < 1 && hash(x, 0, z, 5) < 0.5 ? gloss(W) : undefined));
        // curled-up sleeping cat (white with orange + black patches)
        const coat = 0xfdfaf4, pa = C.orange, pb = C.charcoal;
        v.ellipsoid(-0.5, 18.4, -0.5, 4.4, 2, 3.4, coat);
        v.paint(() => { v.ellipsoid(-3.5, 19.5, -1, 2, 2, 2.5, pa); v.ellipsoid(0.5, 20, -2.8, 2, 1.5, 1.6, pb); });
        v.merge(catHead({ coat, small: true, eyes: 'closed', earC: [pa, coat], patch: [-2, 1.5, pa] }), 2, 19, 2);
        // tail wrapping round the front
        v.line(-4.5, 18, 0, -2.5, 18, 3, pa, 1);
        v.line(-2.5, 18, 3, 0, 17.5, 4, pa, 1);
        v.set(0, 18, 5, pb).set(1, 18, 5, pb);
        // striped nightcap with pom-pom, drooping back
        lathe(v, [2, 21, 1.5], [-0.8, 0.5, -0.4], 5.5, (t) => 2.2 - t * 0.32, (t) => (Math.floor(t * 0.75) % 2 ? W : C.red));
        v.sphere(-2.5, 23.5, -0.8, 1.1, W);
        // sleepy z's hanging off the pom-pom
        v.layer(['zzz', '.z.', 'zzz'], { z: glow(0xbfe3ff) }, { x: -6, y: 26, z: -1 });
        v.set(-4, 24, -1, glow(0xbfe3ff));
      },
    },
    {
      id: 'rocket', name: 'Neko Rocket No.1', jp: 'ねこロケット1号', rarity: 'common',
      desc: 'Fuelled entirely by bonito flakes. Smells amazing at launch.',
      build(v) {
        const body = gloss(0xfbf8f2), red = gloss(C.red), redD = gloss(shade(C.red, 0.8));
        // ogive body
        const prof = (t) => (t < 11 ? 3.6 : 3.6 * Math.sqrt(Math.max(0, 1 - ((t - 11) / 8.6) ** 2)));
        lathe(v, [0, 2, 0], [0, 1, 0], 19.6, prof, (t) => ((t > 14 && t < 16) || t < 1.5 ? red : body));
        v.paint(() => v.box(-5, 8, -5, 5, 8, 5, gloss(C.lightgray)));
        v.set(0, 22, 0, red);
        // little cat ears on the nose cone
        for (const s of [-1, 1]) {
          v.box(s * 1, 20, -1, s * 2, 20, 0, red).set(s * 2, 21, -1, red).set(s * 2, 21, 0, red);
          v.set(s * 1, 20, 1, gloss(C.pink)).set(s * 2, 20, 1, red);
        }
        // four slim fins doubling as landing legs
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          for (let i = 0; i < 3; i++) {
            const d = 4 + i;
            v.box(dx * d, 0, dz * d, dx * d, 7 - i * 2, dz * d, i === 2 ? redD : red);
          }
        }
        // nozzle + flame
        v.cylinder(0, 1, 0, 2.2, 1, metal(C.steel));
        v.cylinder(0, 0, 0, 1.6, 1, glow(C.orange));
        v.set(0, 0, 0, glow(C.yellow));
        // open porthole with a grey cat leaning out
        v.shape(-3, 10, 2, 3, 16, 4, (x, y, z) => Math.hypot(x, y - 13) <= 2.4 && z >= 3, null);
        v.layer(['FFFFF', 'FKFKF', 'PFNFP', 'FWMWF', '.WWW.'], { F: 0x9aa3ad, K, N: C.hotpink, P: C.blush, W, M: K }, { x: -2, y: 15, z: 2 });
        v.set(-1, 15, 2, 0x9aa3ad);
        v.torus(0, 13, 3, 3, 0.55, gloss(0xf2c14e), 'z');
        v.set(-1, 15, 3, glass(W)).set(-2, 14, 3, glass(W));
        // fish emblem on both sides
        v.project(['.bb.b', 'bbbbb', '.bb.b'], { b: gloss(C.blue) }, -2, 7, '+x');
        v.project(['.bb.b', 'bbbbb', '.bb.b'], { b: gloss(C.blue) }, -2, 7, '-x');
      },
    },
    {
      id: 'ufo', name: 'Fish Abduction UFO', jp: 'さかなアブダクション', rarity: 'uncommon',
      desc: 'Travelled forty light-years for one mackerel. Worth it.',
      build(v) {
        // grassy patch with a pond
        v.cylinder(0, 0, 0, 7, 2, C.grassDark);
        v.paint(() => v.cylinder(0, 0, 0, 7, 1, C.brown));
        v.paint(() => v.shape(-8, 1, -8, 8, 1, 8, (x, y, z) => hash(x, y, z, 2) < 0.3, C.grass));
        v.cylinder(0, 1, 1, 3.2, 1, glass(0x6fc8ff));
        v.cylinder(0, 0, 1, 3.2, 1, gloss(C.sea));
        for (const [x, z] of [[-5, -2], [5, 3], [-4, 5]]) v.box(x, 2, z, x, 3, z, C.moss).set(x, 4, z, C.bamboo);
        // the abducted mackerel, very surprised
        const fb = gloss(0x4f8fd6), fd = gloss(0x24508f), fw = gloss(0xf2f6fb);
        const fish = new VoxelModel();
        fish.ellipsoid(0, 0, 0, 3.6, 1.6, 1.2, fb);
        fish.paint(() => fish.box(-4, -2, -2, 4, -1, 2, fw));
        fish.recolor((x, y, z, c) => (y >= 1 && (x + 10) % 2 === 0 && c === fb ? fd : undefined));
        fish.box(-5, -1, 0, -4, 1, 0, fb).box(-6, -2, 0, -6, -1, 0, fb).box(-6, 1, 0, -6, 2, 0, fb);
        fish.set(0, 2, 0, fd).set(1, 2, 0, fd);
        fish.project(['W', 'K'], { W, K }, 2, 1).project(['K'], { K }, 3, -1);
        // dome first (its lower half gets replaced by the saucer)
        v.ellipsoid(0, 16, 0, 4.8, 4.8, 4.8, glass(HELMET));
        v.box(-6, 11, -6, 6, 16, 6, null);
        // the saucer
        v.ellipsoid(0, 15, 0, 9, 1.8, 9, metal(C.silver));
        v.paint(() => v.shape(-10, 14, -10, 10, 15, 10, (x, y, z) => Math.hypot(x, z) > 7.5, gloss(0x8a5bd6)));
        v.paint(() => v.shape(-10, 16, -10, 10, 16, 10, (x, y, z) => Math.hypot(x, z) > 5, gloss(0xd9dde6)));
        const lights = [glow(C.yellow), glow(C.hotpink), glow(0x7ff5ff)];
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          v.set(Math.round(Math.cos(a) * 8.6), 15, Math.round(Math.sin(a) * 8.6), lights[i % 3]);
        }
        v.cylinder(0, 13, 0, 2.6, 1, glow(0xf8ffc0));
        // tractor beam (glass cone) with sparkles
        lathe(v, [0, 2, 0], [0, 1, 0], 10, (t) => 4.4 - t * 0.17, glass(0xfaffc8));
        v.merge(fish, 0, 7, 0);
        v.paint(() => v.shape(-5, 3, -5, 5, 12, 5, (x, y, z) => hash(x, y, z, 8) < 0.04, glow(0xfffbd0)));
        // black-cat pilot with green eyes
        const pilot = catHead({ coat: C.charcoal, small: true, inner: C.pink });
        pilot.recolor((x, y, z, c) => (c === K ? 0x9be05a : undefined));
        v.merge(pilot, 0, 18, 0);
        v.ellipsoid(0, 16.5, 0, 2.4, 1, 2, C.charcoal);
      },
    },
    {
      id: 'usagi', name: 'Moon Rabbit Landing', jp: '月うさぎ着陸', rarity: 'uncommon',
      desc: 'One small hop for a rabbit. One giant mochi for rabbitkind.',
      build(v) {
        // cratered moon surface
        v.cylinder(0, 0, 0, 9, 2, C.stone);
        v.paint(() => v.cylinder(0, 0, 0, 9, 1, shade(C.stone, 0.8)));
        for (const [x, z, r] of [[-5, 4, 2], [5, -4, 2.5], [6, 4, 1.5], [-6, -4, 1.5]]) {
          v.sphere(x, 2.6, z, r, null);
          v.paint(() => v.shape(x - 4, 1, z - 4, x + 4, 1, z + 4, (xx, yy, zz) => Math.hypot(xx - x, zz - z) <= r + 0.6, shade(C.stone, 0.82)));
        }
        v.paint(() => v.shape(-9, 1, -9, 9, 1, 9, (x, y, z) => hash(x, y, z, 4) < 0.15, shade(C.stone, 1.1)));
        // bunny footprints
        for (const [x, z] of [[-3, 7], [-1, 8], [-4, 5]]) v.paint(() => v.box(x, 1, z, x, 1, z, shade(C.stone, 0.7)));
        // ear-tubes + helmet glass first
        v.sphere(0, 15, 0.5, 5, glass(HELMET));
        for (const s of [-1, 1]) v.cylinder(s * 1.8, 18, 0, 1.6, 6, glass(HELMET));
        v.paint(() => v.box(-3, 17, 4, -2, 18, 6, glass(W)));
        // suit
        const suit = 0xf4f1ea;
        for (const s of [-1, 1]) {
          v.ellipsoid(2 * s, 3, 1, 1.8, 1.2, 2.2, gloss(C.gray));
          v.cylinder(2 * s, 3, 0, 1.5, 3, suit);
        }
        v.ellipsoid(0, 8.5, 0, 4.4, 4.2, 3.8, suit);
        v.paint(() => v.box(-5, 6, -5, 5, 6, 5, C.sakuraDeep));
        v.box(-1, 8, 4, 1, 10, 4, gloss(C.lightgray));
        v.set(0, 9, 5, glow(C.lime)).set(0, 10, 5, glow(C.red));
        v.box(-3, 6, -6, 3, 12, -4, gloss(0xd9d4ca));
        v.torus(0, 12, 0.5, 3.2, 0.8, metal(C.silver));
        // white rabbit head with red eyes; long ears inside the tubes
        const head = catHead({ coat: W, eyes: 'red', inner: C.pink });
        head.box(-4, 3, -2, 4, 6, 2, null);
        v.merge(head, 0, 15, 1);
        for (const s of [-1, 1]) {
          v.box(s * 2, 18, -1, s * 2, 23, 0, W).box(s * 1, 18, -1, s * 1, 22, 0, W);
          v.box(s * 2, 18, 0, s * 2, 22, 0, C.pink);
        }
        v.sphere(0, 14, -3.5, 1.3, W);
        openVisor(v, 0, 15, 3, 3.4);
        // flag: pole held in the right paw, carrot banner
        v.box(6, 2, 2, 6, 22, 2, metal(C.silver));
        v.box(6, 22, 2, 13, 22, 2, metal(C.silver));
        v.layer([
          'bbbbbbb',
          'bbbbgGb',
          'bbbOgbb',
          'bbOObbb',
          'bOObbbb',
          'bbbbbbb',
        ], { b: W, O: C.orange, g: C.leaf, G: C.lime }, { x: 7, y: 21, z: 2 });
        v.line(4, 10, 0, 6, 11, 2, suit, 1.2);
        v.sphere(6, 11, 2, 1.4, gloss(C.gray));
        v.line(-4, 10, 0, -6, 8, 1, suit, 1.2);
        v.sphere(-6, 7.5, 1.5, 1.4, gloss(C.gray));
      },
    },
    {
      id: 'station', name: 'Neko Space Station', jp: 'ねこ宇宙ステーション', rarity: 'rare',
      desc: 'Crew of four. Mission: find the sunniest window. Going great.',
      build(v) {
        stand(v, 5, 8);
        const hull = 0xf2f0ea;
        // main module (along x)
        v.cylinder(-6, 12, 0, 4, 13, gloss(hull), 'x');
        v.paint(() => { for (const x of [-6, -2, 2, 6]) v.cylinder(x, 12, 0, 4, 1, gloss(C.lightgray), 'x'); });
        v.paint(() => v.shape(-7, 7, -5, 7, 9, 5, () => true, gloss(0xe8c060))); // gold foil underside
        // docking ports
        for (const s of [-1, 1]) {
          v.cylinder(s > 0 ? 7 : -8, 12, 0, 2.6, 2, metal(C.steel), 'x');
          v.cylinder(s > 0 ? 9 : -9, 12, 0, 1.2, 1, metal(C.silver), 'x');
        }
        // windows with cat crew
        const crew = [
          [-4, 0xf0a050, 0xf0a050],
          [0, 0x8f949c, 0x8f949c],
          [4, 0xfdfaf4, C.charcoal],
        ];
        for (const [cx, fur, ear] of crew) {
          v.cylinder(cx, 12, 2, 1.9, 3, null, 'z');
          v.layer(['E...E', 'FFFFF', 'FKFKF', 'FFNFF', '.FFF.'], { F: fur, E: ear, K, N: C.hotpink }, { x: cx - 2, y: 14, z: 2 });
          v.cylinder(cx, 12, 4, 1.9, 1, glass(HELMET), 'z');
          v.torus(cx, 12, 4, 2.3, 0.45, metal(C.silver), 'z');
        }
        // solar arrays
        for (const s of [-1, 1]) {
          v.box(s * 10, 12, 0, s * 10, 12, 0, metal(C.steel));
          v.box(s * 9, 12, 0, s * 11, 12, 0, metal(C.steel));
          for (const [y0, y1] of [[14, 20], [4, 10]]) {
            v.box(s * 10, y0 > 12 ? 13 : y1 + 1, 0, s * 10, y0 > 12 ? y0 - 1 : 11, 0, metal(C.steel));
            v.box(s * 9, y0, 0, s * 14, y1, 0, gloss(0x2f5fd6));
            v.paint(() => v.shape(s * 9, y0, 0, s * 14, y1, 0, (x, y) => (y - y0) % 2 === 0, gloss(0x8fb4f0)));
            v.paint(() => v.shape(s * 9, y0, 0, s * 14, y1, 0, (x, y) => y === y0 || y === y1 || Math.abs(x) === 9 || Math.abs(x) === 14, gloss(0x3a4150)));
          }
        }
        // radio dish on top
        v.box(3, 16, 0, 3, 17, 0, metal(C.steel));
        v.cylinder(3, 18, 0, 2, 1, metal(C.silver));
        v.set(3, 19, 0, glow(C.red));
        // a fourth cat out on a spacewalk, sitting on the roof
        v.sphere(-3, 20.5, 0, 3, glass(HELMET));
        v.merge(miniCat(0xf6d2a0, { patch: 0xf0a050, wave: 1 }), -3, 16, 0);
        v.box(-5, 16, -1, -1, 16, 1, gloss(0xf4f1ea));
        v.box(-3, 16, -2, -3, 16, -3, gloss(0xf2c14e)).box(-2, 16, -3, 0, 16, -3, gloss(0xf2c14e));
        // fish logo on the hull
        v.project(['.bb.b', 'bbbbb', '.bb.b'], { b: gloss(C.vermilion) }, -3, 13, '+x');
      },
    },
    {
      id: 'saturn', name: 'Saturn Ring Ride', jp: '土星リングライド', rarity: 'ultra',
      desc: 'The rings go round every ten hours. The cats have been on since Tuesday.',
      build(v) {
        stand(v, 6, 5, { base: 0x1b2347 });
        v.paint(() => v.shape(-6, 1, -6, 6, 1, 6, (x, y, z) => Math.hypot(x, z) < 5 && hash(x, y, z, 6) < 0.08, glow(0xfff4b0)));
        // banded planet
        const cy = 13;
        const bands = [0xfbefd5, 0xe8a060, 0xfbefd5, 0xc8703a, 0xf6d9a8, 0xe8a060, 0xfbefd5, 0xd98a4a];
        v.sphere(0, cy, 0, 7.5, (x, y, z) => gloss(bands[Math.max(0, Math.min(7, Math.floor((y - cy + 7.5 + (hash(x, 0, z, 1) < 0.25 ? 1 : 0)) / 2)))]));
        v.paint(() => v.ellipsoid(-3, cy - 2, 6, 1.6, 0.8, 2, gloss(0xb85a30))); // little storm spot
        // tilted ring with a dark gap
        const ax = 0.3, az = -0.38;
        const n = [-Math.sin(az), Math.cos(ax) * Math.cos(az), Math.sin(ax) * Math.cos(az)];
        const nl = Math.hypot(...n); n[0] /= nl; n[1] /= nl; n[2] /= nl;
        const ringAt = (x, y, z) => {
          const py = y - cy, d = x * n[0] + py * n[1] + z * n[2];
          return [d, Math.hypot(x - d * n[0], py - d * n[1], z - d * n[2])];
        };
        v.shape(-14, cy - 9, -14, 14, cy + 9, 14, (x, y, z) => {
          const [d, rr] = ringAt(x, y, z);
          return Math.abs(d) <= 0.85 && rr >= 8 && rr <= 13.4 && !v.has(x, y, z);
        }, (x, y, z) => {
          const rr = ringAt(x, y, z)[1];
          if (rr > 10.4 && rr < 11.1) return gloss(0x6a58a8);
          return gloss(rr < 9.2 ? 0xc9b3ff : rr < 10.4 ? 0xe6d9ff : rr < 12.4 ? 0xffe2c4 : 0xc9b3ff);
        });
        // tidy up stray ring voxels that only touch at corners
        for (let pass = 0; pass < 2; pass++) {
          const lone = [];
          v.forEach((x, y, z) => {
            if (y < cy - 9 || Math.hypot(x, y - cy, z) < 7.9) return;
            let nb = 0;
            for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (v.has(x + dx, y + dy, z + dz)) nb++;
            if (nb <= 1) lone.push([x, y, z]);
          });
          for (const [x, y, z] of lone) v.remove(x, y, z);
        }
        // cats riding the rings
        const ride = (ang, cat) => {
          const x = Math.round(Math.cos(ang) * 11.8), z = Math.round(Math.sin(ang) * 11.8);
          let y = cy + 9; while (y > cy - 9 && !v.has(x, y, z)) y--;
          v.merge(cat, x, y + 1, z);
        };
        ride(Math.PI * 0.6, miniCat(C.orange, { wave: 1, scarf: C.sky }));
        ride(Math.PI * 0.12, miniCat(C.charcoal, { eye: 0xffe14a, scarf: C.red }));
        ride(Math.PI * 1.12, miniCat(W, { patch: C.orange, scarf: C.lime }));
        ride(Math.PI * 1.62, miniCat(0x9aa3ad, { scarf: C.yellow }));
      },
    },
    {
      id: 'cosmic', name: 'Cosmic Cat', jp: '宇宙ねこ', rarity: 'secret',
      desc: 'Understood the entire universe in one second. Has made this face ever since.',
      build(v) {
        stand(v, 7, 3, { base: 0x141a3a, trim: glow(0x9b7bff) });
        v.paint(() => v.shape(-7, 1, -7, 7, 1, 7, (x, y, z) => Math.hypot(x, z) < 6 && hash(x, y, z, 2) < 0.1, glow(0xfff4b0)));
        // ☾ crescent moon, standing on its round back
        const oy = 3, moon = 0xffe58a, moonD = 0xf0c858;
        v.shape(-12, oy, -3, 8, oy + 22, 3, (x, y, z) => {
          const a = Math.hypot(x, y - oy - 11) - 11, b = Math.hypot(x - 5.5, y - oy - 11) - 9.4;
          if (!(a <= 0 && b >= 0)) return false;
          const edge = Math.min(-a, b);
          return Math.abs(z) <= 0.6 + Math.min(1.9, edge * 0.8);
        }, (x, y, z) => gloss(moon));
        // craters + a sleepy moon face
        for (const [x, y, r] of [[-8, oy + 15, 1.5], [-6, oy + 5, 1.2], [-2, oy + 19, 1], [-9, oy + 8, 1]]) {
          v.paint(() => v.shape(x - 2, y - 2, -4, x + 2, y + 2, 4, (xx, yy) => Math.hypot(xx - x, yy - y) <= r + 0.3, gloss(moonD)));
        }
        v.project(['KK.KK', '.....', 'P...P', '..M..'], { K: gloss(0x9a6a20), P: gloss(0xffb0a0), M: gloss(0x9a6a20) }, -10, oy + 12);
        // galaxy cat: indigo fur with nebula clouds and twinkling stars
        const base = 0x2a2370;
        const neb = (x, y, z) => {
          const n = hash(x >> 1, y >> 1, z >> 1, 5) * 0.6 + hash(x >> 2, y >> 2, z >> 2, 7) * 0.7;
          if (hash(x, y, z, 9) < 0.08) return glow(hash(x, y, z, 3) < 0.5 ? W : 0xfff1a0);
          if (n > 0.95) return 0xd65cc8;
          if (n > 0.8) return 0x8a4fd6;
          if (n < 0.38) return 0x2fa6c8;
          return base;
        };
        const cat = new VoxelModel();
        cat.ellipsoid(0, 3.6, 0, 3.6, 3.8, 3.2, base);
        cat.ellipsoid(-1.8, 0.8, 2.4, 1.2, 1, 1.3, base).ellipsoid(1.8, 0.8, 2.4, 1.2, 1, 1.3, base);
        cat.box(-5, -3, -5, 5, -1, 5, null);
        cat.line(2.5, 1.5, -2.5, 5, 2, -3, base, 1).line(5, 2, -3, 6.5, 5, -2, base, 1).line(6.5, 5, -2, 6, 7.5, -1, base, 0.8);
        cat.recolor((x, y, z, c) => (c === base ? neb(x, y, z) : undefined));
        cat.layer(['.s.', 'sSs', '.s.'], { s: glow(0xfff1a0), S: glow(W) }, { x: 5, y: 10, z: -1 });
        const head = catHead({ coat: base, inner: 0xd65cc8 });
        head.recolor((x, y, z, c) => (c === base && (z < 1 || y > 2) ? neb(x, y + 9, z) : c === base && hash(x, y, z, 13) < 0.05 ? glow(W) : undefined));
        // stunned 宇宙猫 face: wide glowing eyes, tiny pupils, little open mouth
        head.project(['WWW...WWW', 'WKW...WKW', 'WWW...WWW'], { W: glow(0xf4f8ff), K }, -4, 2);
        head.project(['.N.', '.T.'], { N: C.hotpink, T: C.tongue }, -1, -1);
        cat.merge(head, 0, 9, 1);
        v.merge(cat, 1, oy + 3, 0);
        // star charms on wires
        v.box(-4, 2, 5, -4, 8, 5, gloss(0xf2c14e));
        v.layer(['.s.', 'sSs', '.s.'], { s: glow(0xfff1a0), S: glow(W) }, { x: -5, y: 11, z: 5 });
        v.box(5, 2, -4, 5, 13, -4, gloss(0xf2c14e));
        v.sphere(5, 15, -4, 1.4, gloss(0xff9fd0));
        v.torus(5, 15, -4, 2.3, 0.4, glow(0x9fe0ff), 'y');
      },
    },
  ],
};
