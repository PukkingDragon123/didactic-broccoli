// Series 18 — Puchi Puchi Suizokukan (ぷちぷち水族館)
// Chibi sea creatures from the aquarium: the squishy, the flat, the ancient and the enormous.
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

/** Recolour the first voxel found scanning from +z (front) at (x, y). */
const dot = (v, x, y, c) => v.project(['c'], { c }, x, y);
/** Recolour the first voxel found scanning from +x (right side) at (z, y). */
const dotX = (v, z, y, c) => v.project(['c'], { c }, z, y, '+x');

/** Kawaii face from the front, centred on cx. */
function face(v, cx, eyeY, { spread = 3, mouth = 'smile', blush = C.blush, eyes = 'open', my = null } = {}) {
  const L = { K, W, P: blush, M: K, T: C.tongue };
  const gap = '.'.repeat(2 * spread - 1);
  const x0 = cx - spread - 1;
  if (eyes === 'open') v.project([`WK${gap}WK`, `KK${gap}KK`], L, x0, eyeY);
  else if (eyes === 'big') v.project([`WK${gap}WK`, `KK${gap}KK`, `KK${gap}KK`], L, x0, eyeY);
  else if (eyes === 'happy') v.project([`.K.${gap}.K.`, `K.K${gap}K.K`], L, x0 - 1, eyeY);
  else if (eyes === 'dot') v.project([`K${'.'.repeat(2 * spread + 1)}K`], L, x0, eyeY);
  const mY = my ?? eyeY - (eyes === 'big' ? 3 : 2);
  const mouths = { smile: ['M.M', '.M.'], wide: ['M...M', '.MMM.'], open: ['MMM', 'MTM'], o: ['.M.'], w: ['M.M.M', '.M.M.'] };
  const mo = mouths[mouth];
  v.project(mo, L, cx - Math.floor(mo[0].length / 2), mY);
  if (blush) { v.project(['PP'], L, cx - spread - 3, mY); v.project(['PP'], L, cx + spread + 2, mY); }
}

/** Tube of spheres along a polyline; r may be a number or (t)=>radius; c may be (t, i)=>colour. */
function tube(v, pts, r, c) {
  let total = 0;
  const seg = [];
  for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]); seg.push(d); total += d; }
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const n = Math.max(1, Math.ceil(seg[i] * 2));
    for (let k = 0; k <= n; k++) {
      const f = k / n, t = (acc + seg[i] * f) / total;
      const p = pts[i].map((a, j) => a + (pts[i + 1][j] - a) * f);
      v.sphere(p[0], p[1], p[2], typeof r === 'function' ? r(t) : r, typeof c === 'function' ? c(t) : c);
    }
    acc += seg[i];
  }
}

export default {
  id: 'umi',
  order: 18,
  name: 'Puchi Aquarium',
  jp: 'ぷちぷち水族館',
  tagline: 'Tiny friends from the big blue tank',
  taglineJp: 'ゆらゆら～ぷかぷか～',
  price: 400,
  themes: ['ocean', 'cute'],
  card: { bg: '#dcf2fb', accent: '#1f8fc4', text: '#123a52', accent2: '#ff8a5c', pattern: 'waves' },
  capsule: { colors: [0x6fd3f0, 0xffffff, 0xff9a7a, 0x2f6fd6, 0xbff0e0] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'mendako', name: 'Mendako', jp: 'メンダコ', rarity: 'common',
      desc: 'A deep-sea pancake with ears. Flaps them to swim, very slowly, very proudly.',
      build(v) {
        const o = 0xf27a5e, oL = 0xffa98e, oD = 0xc8503e;
        v.ellipsoid(0, 5, 0, 8, 5.5, 7.5, o);
        // flared webbed skirt with eight scallops
        v.shape(-11, 0, -11, 11, 2, 11, (x, y, z) => {
          const a = Math.atan2(z, x), d = Math.hypot(x / 10, z / 9.5);
          return d <= 1 + 0.06 * Math.cos(a * 8) && (y === 0 || d < 0.92);
        }, o);
        v.paint(() => v.shape(-11, 0, -11, 11, 0, 11, (x, y, z) => Math.hypot(x / 10, z / 9.5) > 0.8, oD));
        // ear fins
        for (const s of [-1, 1]) {
          v.ellipsoid(s * 5, 10.5, -0.5, 2.2, 1.6, 1.2, o);
          v.set(s * 6, 12, -0.5, o).set(s * 7, 12, -0.5, oL).set(s * 6, 13, -0.5, oL);
          v.set(s * 5, 11, 1, oL);
        }
        // soft highlight + freckles
        v.paint(() => v.ellipsoid(-2, 10, 0, 4, 1.5, 4, oL));
        v.recolor((x, y, z, c) => (c === o && y > 6 && hash(x, y, z, 2) < 0.08 ? oL : undefined));
        face(v, 0, 7, { spread: 3, mouth: 'o', eyes: 'big', my: 3 });
        v.project(['PP.........PP'], { P: C.blush }, -6, 4);
        floorClip(v);
      },
    },
    {
      id: 'chinanago', name: 'Garden Eel Trio', jp: 'チンアナゴ三兄弟', rarity: 'common',
      desc: 'If you look at them, they hide. If you look away, they stare at you.',
      build(v) {
        const sand = C.sand, sandD = shade(C.sand, 0.86), sandL = shade(C.sand, 1.07);
        v.ellipsoid(0, 0, 0, 11, 3, 8.5, sand);
        v.recolor((x, y, z) => (y >= 2 && (x + z * 2 + 40) % 5 === 0 ? sandL : hash(x, y, z, 1) < 0.18 ? sandD : undefined));
        // burrow holes
        for (const [hx, hz] of [[-4, 1], [3, -2], [6, 4]]) v.paint(() => v.shape(hx - 3, 0, hz - 3, hx + 3, 4, hz + 3, (x, y, z) => { const d = Math.hypot(x - hx, z - hz); return d < 2.6 && d > 1.4; }, shade(sand, 0.7)));
        // spotty chin-anago (white with black freckles)
        const spot = 0xf6f2e4;
        const spotted = (x, y, z) => (hash(x, y, z, 5) < 0.14 ? K : spot);
        const A = [[-4, 1, 1], [-4, 8, 1], [-3.6, 13, 1.3], [-3, 16, 2.4], [-2.2, 17.4, 3.8]];
        tube(v, A, (t) => 1.5 + 0.15 * t, spot);
        v.sphere(-2.2, 17.6, 4, 2, spot);
        v.recolor((x, y, z, c) => (c === spot ? spotted(x, y, z) : undefined));
        // orange-striped nishiki-anago
        const org = 0xf28a2e;
        const B = [[3, 1, -2], [3, 9, -2], [3.6, 15, -1.6], [4.4, 19, -0.6], [5.2, 20.6, 1]];
        tube(v, B, 1.5, (t) => (Math.floor(t * 9) % 2 ? W : org));
        v.sphere(5.2, 20.8, 1.2, 2, org);
        // the shy little one, only just peeking out
        const C2 = [[6, 1, 4], [6, 5, 4], [6.6, 8, 4.6]];
        tube(v, C2, 1.4, spot);
        v.sphere(6.6, 8.6, 5, 1.8, spot);
        v.recolor((x, y, z, c) => (c === spot && y > 3 && hash(x, y, z, 9) < 0.12 ? K : undefined));
        // faces
        for (const [hx, hy, s] of [[-2, 18, 1], [5, 21, 1], [7, 9, 0]]) {
          dot(v, hx - 1, hy, K); dot(v, hx + 1, hy, K);
          dot(v, hx - 1, hy + 1, W);
          if (s) { dot(v, hx - 2, hy - 1, C.blush); dot(v, hx + 2, hy - 1, C.blush); dot(v, hx, hy - 1, K); }
        }
        // pebbles + a pink shell
        for (const [x, z, c] of [[-8, 4, 0x9a9690], [9, -3, 0xb8b0a4], [-7, -4, 0x8a8680], [1, 6, 0xc8c0b4]]) { let y = 4; while (y > 0 && !v.has(x, y - 1, z)) y--; v.set(x, y, z, c); }
        v.set(-1, 3, 6, C.pink).set(0, 3, 6, C.pink).set(-1, 3, 7, C.sakuraDeep);
        floorClip(v);
      },
    },
    {
      id: 'clione', name: 'Clione Sea Angel', jp: 'クリオネ', rarity: 'common',
      desc: 'Looks like a tiny angel. Eats like a tiny monster. Both are true.',
      build(v) {
        const body = gloss(0xeef8ff), bodyS = gloss(0xcfe6f6), core = glow(0xff6a3a), wing = glass(0xc8ecff);
        // little acrylic display stand
        v.cylinder(0, 0, 0, 5, 1, gloss(0x2a6fb0));
        v.paint(() => v.shape(-6, 1, -6, 6, 1, 6, (x, y, z) => Math.hypot(x, z) > 4, gloss(0x5aa8e0)));
        v.cylinder(0, 2, 0, 1, 5, glass(0xeaf8ff));
        // body: head, plump torso, pointy tail (pearly, softly shaded)
        v.sphere(0, 19, 0, 3.4, body);
        v.ellipsoid(0, 13.5, 0, 3.6, 4.5, 3.2, body);
        v.cone(0, 9.5, 0, 2.6, -3, body);
        v.recolor((x, y, z, c, m) => (y >= 7 && (Math.abs(x) >= 3 || z <= -2) ? bodyS : undefined));
        // glowing heart-shaped insides showing through + red head tips
        v.project(['.c.c.', 'ccccc', 'ccccc', '.ccc.', '..c..'], { c: core }, -2, 15);
        v.project(['W'], { W: glow(0xffd0a0) }, -1, 14);
        v.set(-1, 22, 0, glow(0xff8a5a)).set(1, 22, 0, glow(0xff8a5a)).set(-1, 23, 0, glow(0xff8a5a)).set(1, 23, 0, glow(0xff8a5a));
        // flapping wings
        for (const s of [-1, 1]) {
          v.ellipsoid(s * 5.5, 15, 0, 2.4, 1.6, 0.8, wing);
          v.set(s * 7, 16, 0, wing).set(s * 8, 17, 0, wing);
        }
        // sweet face
        v.project(['K.K'], { K }, -1, 20);
        v.project(['P...P', '..M..'], { P: C.blush, M: K }, -2, 18);
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ uncommon
    {
      id: 'manbou', name: 'Fainting Sunfish', jp: 'マンボウ', rarity: 'uncommon',
      desc: 'Famously delicate. Has already fainted twice while reading this description.',
      build(v) {
        const top = 0x7e98ae, mid = 0xa9bccb, belly = 0xe2eaef;
        // rock it leans on
        v.ellipsoid(0, 0, 0, 7, 2.5, 5, 0x8a8680);
        v.recolor((x, y, z) => (hash(x, y, z, 3) < 0.25 ? 0x6e6a66 : y >= 2 && hash(x, y, z, 4) < 0.3 ? C.moss : undefined));
        // flat round body
        v.ellipsoid(0, 13, 0, 8.5, 8, 3.2, mid);
        v.recolor((x, y, z, c) => (c !== mid ? undefined : y > 16 ? top : y < 9 ? belly : undefined));
        v.recolor((x, y, z, c) => (c === mid && y === 16 && hash(x, y, z, 1) < 0.5 ? top : c === mid && y === 9 && hash(x, y, z, 2) < 0.5 ? belly : undefined));
        // tall dorsal + anal fins
        v.shape(-5, 19, -1, 1, 28, 1, (x, y, z) => Math.abs(z) <= (y < 25 ? 1 : 0) && x <= 0 && x >= -5 + (y - 19) * 0.55 && x <= 0 - (y - 19) * 0.15, top);
        v.shape(-5, 1, -1, 1, 7, 1, (x, y, z) => Math.abs(z) <= (y > 3 ? 1 : 0) && x <= 0 && x >= -5 + (7 - y) * 0.55 && x <= -(7 - y) * 0.15, mid);
        // scalloped clavus (the "tail" that isn't a tail)
        for (let y = 7; y <= 19; y++) {
          const w = 1 + ((y + 1) % 3 === 0 ? 1 : 0);
          v.box(-9 - w, y, -1, -9, y, 1, mid);
        }
        v.recolor((x, y, z, c) => (x <= -9 ? shade(mid, 0.88) : undefined));
        // speckles
        v.recolor((x, y, z, c) => ((c === mid || c === top) && hash(x, y, z, 7) < 0.07 ? W : undefined));
        // face on the side: big eye, tiny "o" mouth, blush, pectoral fin
        v.project(['WKK', 'KKK', 'KKK'], { W, K }, 3, 16);
        v.project(['W'], { W }, 4, 14);
        v.project(['PP'], { P: C.blush }, 3, 12);
        v.box(9, 12, -1, 9, 13, 1, mid);
        v.set(10, 12, 0, K).set(10, 13, 0, shade(mid, 0.8));
        v.ellipsoid(0, 11, 3.5, 1.4, 2, 0.6, shade(mid, 0.9));
        // sweat drop of nervousness
        v.set(6, 20, 2, glass(0x9fe3ff)).set(6, 19, 2, glass(0x9fe3ff)).set(7, 19, 2, glass(0x9fe3ff));
        floorClip(v);
      },
    },
    {
      id: 'gusokumushi', name: 'Giant Isopod', jp: 'ダイオウグソクムシ', rarity: 'uncommon',
      desc: 'Has not eaten in five years. Is not hungry. Is, frankly, thriving.',
      build(v) {
        const sh = 0xc4bccf, shD = shade(0xc4bccf, 0.78), shL = 0xe2dcea, leg = 0xe9d9c8;
        // legs peeking out underneath
        for (let z = -8; z <= 6; z += 2) { v.box(-9, 0, z, -7, 0, z, leg); v.box(7, 0, z, 9, 0, z, leg); }
        // armoured, segmented body
        v.ellipsoid(0, 4, -2, 8.4, 5.6, 11, sh);
        v.box(-10, -6, -14, 10, 0, 12, null);
        v.recolor((x, y, z, c) => (c === sh && (z + 30) % 3 === 0 && y >= 2 ? shD : undefined));
        v.recolor((x, y, z, c) => (c === sh && y >= 7 && (z + 30) % 3 === 1 ? shL : undefined));
        v.recolor((x, y, z, c) => (c === sh && Math.abs(x) >= 7 ? shade(sh, 0.9) : undefined));
        // spiky tail fan
        v.ellipsoid(0, 1.5, -13, 5, 1.6, 2.4, shD);
        for (const x of [-4, -2, 0, 2, 4]) v.set(x, 1, Math.round(-16 + Math.abs(x) * 0.3), shD);
        // head with huge compound eyes + antennae
        v.ellipsoid(0, 3.5, 8, 6, 3.5, 3.4, sh);
        v.paint(() => v.box(-7, 6, 6, 7, 7, 12, shL));
        for (const s of [-1, 1]) {
          v.box(s * 3, 3, 10, s * 6, 6, 11, gloss(0x24202c));
          v.set(s * (s < 0 ? 5 : 4), 6, 12, W).set(s * (s < 0 ? 4 : 5), 5, 12, gloss(0x3a3448));
          v.line(s * 2, 2, 12, s * 6, 1, 15, shD);
          v.line(s * 6, 1, 15, s * 10, 1, 14, shD);
        }
        v.project(['P.......P', '....M....'], { P: C.blush, M: K }, -4, 3);
        // the untouched dinner plate
        v.cylinder(10, 0, 10, 3, 1, gloss(C.ceramic));
        v.paint(() => v.shape(6, 0, 6, 14, 0, 14, (x, y, z) => Math.abs(Math.hypot(x - 10, z - 10) - 2.6) < 0.45, gloss(C.blue)));
        v.box(9, 1, 10, 11, 1, 10, gloss(0xd8dce4)).set(12, 1, 10, gloss(0xb8c0cc)).set(12, 1, 9, gloss(0xb8c0cc)).set(12, 1, 11, gloss(0xb8c0cc));
        v.set(9, 1, 10, K).set(10, 2, 10, gloss(0xd8dce4));
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ rare
    {
      id: 'kurage', name: 'Moon Jelly Tank', jp: 'ミズクラゲの水槽', rarity: 'rare',
      desc: 'Stare for five minutes and all your worries go poyo~n. Clinically unproven.',
      build(v) {
        const base = gloss(0x1e2434), tank = glass(0xd4f0ff);
        // base with glowing ring + brass plate
        v.cylinder(0, 0, 0, 9, 3, base);
        v.paint(() => v.shape(-10, 2, -10, 10, 2, 10, (x, y, z) => Math.hypot(x, z) > 8.2, glow(0x5fc8ff)));
        v.box(-3, 1, 9, 3, 1, 9, metal(C.brass));
        // gravel floor + bubbler stone
        v.cylinder(0, 3, 0, 7, 1, 0x8fa8be);
        v.recolor((x, y, z, c) => (y === 3 && c === 0x8fa8be && hash(x, y, z, 2) < 0.3 ? 0xb8cad8 : undefined));
        v.shape(-7, 4, -7, 7, 23, 0, (x, y, z) => { const d = Math.hypot(x, z); return z < -1 && d <= 6.9 && d > 5.9; }, (x, y) => gloss(mix(0x123a78, 0x3a8ad0, y / 23)));
        v.set(4, 4, -3, 0x8a8680).set(4, 4, -2, 0x8a8680);
        for (const [y, dx] of [[7, 0], [10, 1], [13, 0], [17, 1], [21, 0]]) v.set(4 + dx, y, -3, glass(0xffffff));
        // tank walls + lid with blue LED
        v.tube(0, 4, 0, 8, 7, 20, tank);
        v.cylinder(0, 24, 0, 8.6, 2, base);
        v.paint(() => v.shape(-9, 24, -9, 9, 24, 9, (x, y, z) => Math.hypot(x, z) > 7.6, glow(0x7fd8ff)));
        // three moon jellies: glassy bells, glowing four-leaf rings, frilly fringe and oral arms
        const jelly = (cx, cy, cz, r) => {
          v.shape(cx - r - 1, cy, cz - r - 1, cx + r + 1, cy + r, cz + r + 1, (x, y, z) => ((x - cx) / r) ** 2 + ((y - cy) / (r * 0.62)) ** 2 + ((z - cz) / r) ** 2 <= 1, gloss(0xeef6ff));
          for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const gx = Math.round(cx + dx * r * 0.32), gz = Math.round(cz + dz * r * 0.32);
            let y = cy + r; while (y > cy && !v.has(gx, y, gz)) y--;
            v.set(gx, y, gz, glow(0xb88aff));
          }
          v.shape(cx - r - 1, cy - 1, cz - r - 1, cx + r + 1, cy - 1, cz + r + 1, (x, y, z) => { const d = Math.hypot(x - cx, z - cz); return d <= r + 0.3 && d >= r - 1.2 && (x + z) % 2 === 0; }, glass(0xf4faff));
          for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) v.line(cx + dx, cy - 1, cz + dz, cx + dx * 2, cy - Math.round(r), cz + dz * 2, glass(0xf0d8ff));
        };
        jelly(-2, 17, 1, 3.8);
        jelly(3, 11, -1, 3);
        jelly(-3, 7.5, -2, 2.4);
        // a tiny face on the biggest one
        v.project(['K.K', 'P.P'], { K, P: C.blush }, -3, 19);
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ ultra
    {
      id: 'irukashow', name: 'Dolphin Show!', jp: 'イルカショー', rarity: 'ultra',
      desc: 'Jumps through the hoop, balances the ball, and still finds time to splash row one.',
      build(v) {
        const tile = 0xf2f6f8, tileB = 0x5aa8e0, water = gloss(0x3cb4ea), deep = gloss(0x2585c8);
        // pool: tiled rim, water
        v.box(-13, 0, -10, 13, 3, 10, deep);
        v.paint(() => v.box(-13, 3, -10, 13, 3, 10, water));
        v.recolor((x, y, z, c) => (y === 3 && hash(x, y, z, 3) < 0.14 ? gloss(0xa8e8ff) : undefined));
        v.shape(-13, 0, -10, 13, 4, 10, (x, y, z) => Math.abs(x) >= 12 || Math.abs(z) >= 9, tile);
        v.paint(() => v.shape(-13, 0, -10, 13, 4, 10, (x, y, z) => y === 2 && (Math.abs(x) === 13 || Math.abs(z) === 10), gloss(tileB)));
        v.paint(() => v.shape(-13, 4, -10, 13, 4, 10, (x, y, z) => (x + z) % 4 === 0, 0xdde6ea));
        // the dolphin, arcing through the air
        const top = 0x6e92b6, belly = 0xeef3f6;
        const sx = (t) => -9 + 17 * t;
        const sy = (t) => 6 + 12 * Math.sin(Math.PI * (0.18 + 0.68 * t));
        const rr = (t) => (t < 0.12 ? 0.7 + t * 6 : t < 0.6 ? 1.4 + (t - 0.12) * 3 : t < 0.88 ? 2.8 - (t - 0.6) * 2.5 : 2.1 - (t - 0.88) * 10);
        for (let i = 0; i <= 120; i++) { const t = i / 120; v.sphere(sx(t), sy(t), 0, Math.max(0.6, rr(t)), top); }
        v.recolor((x, y, z, c) => {
          if (c !== top) return undefined;
          const t = (x + 9) / 17;
          return y < sy(Math.min(1, Math.max(0, t))) - 0.6 ? belly : undefined;
        });
        // rostrum + fins + flukes
        v.line(Math.round(sx(1)), Math.round(sy(1)), 0, Math.round(sx(1)) + 2, Math.round(sy(1)) - 1, 0, top);
        v.set(Math.round(sx(1)) + 2, Math.round(sy(1)) - 2, 0, belly);
        v.shape(-3, 19, -1, 2, 24, 1, (x, y, z) => z === 0 && x <= 0 - (y - 19) * 0.2 && x >= -3 + (y - 19) * 0.55, top);
        for (const s of [-1, 1]) v.line(4, 13, s * 2, 3, 10, s * 5, top, 0.7);
        for (const s of [-1, 1]) { v.line(-9, 9, 0, -11, 9, s * 4, top, 0.7); v.set(-12, 9, s * 4, top); }
        // face
        const ex = 5;
        v.project(['WK', 'KK'], { W, K }, ex, 17);
        v.project(['P'], { P: C.blush }, ex - 1, 15);
        v.project(['MMM.'], { M: K }, ex + 2, 15);
        // ball on the nose
        const bx = Math.round(sx(1)) + 2, by = Math.round(sy(1)) + 2;
        v.sphere(bx, by, 0, 2, gloss(W));
        v.recolor((x, y, z, c) => (Math.hypot(x - bx, y - by, z) <= 2.6 && y >= by - 3 ? gloss([C.red, C.yellow, C.blue, W][((Math.round(Math.atan2(z, x - bx) / (Math.PI / 2)) % 4) + 4) % 4]) : undefined));
        // striped hoop on a pole
        v.torus(-2, 15, 0, 5.5, 0.7, gloss(C.red), 'x');
        v.recolor((x, y, z, c, m) => (x >= -3 && x <= -1 && Math.abs(Math.hypot(y - 15, z) - 5.5) < 1.3 && Math.floor((Math.atan2(y - 15, z) + 4) * 2.2) % 2 ? gloss(W) : undefined));
        v.line(-2, 4, -9, -2, 9.5, -5, metal(C.silver));
        // splash where it took off + baby peeking out
        for (const [x, y, z] of [[-10, 4, 1], [-11, 5, -1], [-9, 6, 2], [-12, 4, -2], [-10, 7, 0], [-8, 4, -2]]) v.set(x, y, z, glass(0xd8f6ff));
        v.sphere(7, 4, 5, 2, top);
        v.paint(() => v.box(5, 2, 7, 9, 3, 7, belly));
        v.box(7, 3, 7, 7, 3, 8, top);
        v.set(6, 5, 7, K).set(8, 5, 7, K).set(5, 4, 7, C.blush).set(9, 4, 7, C.blush);
        v.set(6, 4, 3, glass(0xd8f6ff)).set(8, 4, 3, glass(0xd8f6ff));
        floorClip(v);
      },
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'jinbei', name: 'Gentle Jinbei-san', jp: 'ジンベエザメ', rarity: 'secret',
      desc: 'The biggest fish in the sea. Eats only the tiniest snacks. Gives free rides.',
      build(v) {
        const top = 0x3f5c7e, topD = 0x30486a, belly = 0xedf2f4, spot = 0xf4f8fa;
        // wave display base
        v.box(-13, 0, -7, 13, 2, 7, gloss(0x1c3a66));
        v.paint(() => v.shape(-13, 2, -7, 13, 2, 7, (x, y, z) => (Math.round(z + 2 * Math.sin(x * 0.6)) % 4 + 4) % 4 === 0, glow(0x6fe0ff)));
        v.box(-3, 1, 7, 3, 1, 7, metal(C.gold));
        // body: a long broad lathe along x with a flat, wide head
        const cy = 12;
        const prof = (x) => {
          const t = (x + 12) / 25;
          let hz = 1.2 + 5.4 * Math.sin((Math.PI / 2) * Math.min(1, Math.max(0, t) / 0.72));
          let hy = 1 + 4.2 * Math.sin((Math.PI / 2) * Math.min(1, Math.max(0, t) / 0.6));
          if (t > 0.82) hy -= (t - 0.82) * 6;
          if (x > 9.5) { const f = Math.sqrt(Math.max(0, 1 - ((x - 9.5) / 3.8) ** 2)); hz *= f; hy *= Math.sqrt(f); }
          return { hz, hy };
        };
        v.shape(-13, cy - 7, -8, 13, cy + 7, 8, (x, y, z) => {
          const { hz, hy } = prof(x);
          return hz > 0.3 && ((y - cy) / hy) ** 2 + (z / hz) ** 2 <= 1.05;
        }, top);
        v.recolor((x, y, z, c) => {
          if (c !== top) return undefined;
          const { hy } = prof(x);
          if (y < cy - hy * 0.25) return belly;
          if (x > 3 ? hash(x, y, z, 4) < 0.22 : (x % 3 === 0 && (y + z) % 3 === 0) || ((x + 1) % 3 === 0 && hash(x, y, z, 2) < 0.12)) return spot;
          if (Math.abs(z) === 2 && y > cy + 2) return topD;
          return undefined;
        });
        // fins: dorsals, big pectorals, crescent tail
        v.shape(-4, cy + 3, -1, 1, cy + 10, 1, (x, y, z) => z === 0 && x <= 0 - (y - cy - 3) * 0.2 && x >= -4 + (y - cy - 3) * 0.5, top);
        v.shape(-9, cy + 2, 0, -7, cy + 5, 0, (x, y) => x >= -9 + (y - cy - 2) * 0.7, top);
        for (const s of [-1, 1]) v.shape(1, cy - 4, -12, 7, cy - 1, 12, (x, y, z) => s * z >= 4 && s * z <= 11 - (6 - x) * 0.2 && x <= 7 - (s * z - 4) * 0.55 && y === cy - 2 - Math.floor((s * z - 4) / 3), top);
        v.shape(-17, cy - 5, 0, -11, cy + 10, 0, (x, y) => {
          const u = -11 - x;
          return (y >= cy && y <= cy + 1 + u * 1.5 && u <= 5) || (y < cy && y >= cy - u * 0.8 && u <= 4);
        }, top);
        v.recolor((x, y, z, c) => (x <= -13 && c === top ? topD : undefined));
        // wide grin + little eyes on the side of the head
        for (let x = 9; x <= 13; x++) { let z = 8; while (z > 0 && !v.has(x, cy - 1, z)) z--; if (z > 0) v.set(x, cy - 1, z, K); }
        v.project(['MMMMMMM'], { M: K }, -3, cy - 1, '+x');
        v.project(['WK', 'KK'], { W, K }, 7, cy + 2);
        v.project(['PP'], { P: C.blush }, 9, cy);
        // passengers: a mendako riding on its head, a remora underneath, a fish school on clear rods
        v.ellipsoid(7, cy + 4.5, 0, 2.2, 1.5, 2, 0xf27a5e);
        v.set(6, cy + 6, 0, 0xffa98e).set(8, cy + 6, 0, 0xffa98e);
        v.set(6, cy + 5, 2, K).set(8, cy + 5, 2, K);
        v.ellipsoid(2, cy - 5, 0, 3, 0.8, 1, 0x8a96a2);
        v.box(-8, 3, 5, -8, 22, 5, glass(0xeaf8ff));
        for (const [x, y] of [[-6, 22], [-10, 20], [-6, 18], [-10, 16]]) {
          v.set(x - 2, y, 5, gloss(0x4a90d0)).box(x - 1, y, 5, x + 1, y, 5, gloss(C.yellow)).set(x, y + 1, 5, gloss(C.yellow)).set(x + 1, y, 6, K);
        }
        for (const x of [-4, 6]) v.box(x, 3, 0, x, cy - 5, 0, glass(0xeaf8ff));
        floorClip(v);
      },
    },
  ],
};
