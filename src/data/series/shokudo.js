// Series 2 — Tiny Shokudō (ミニチュア食堂)
// Hyper-real miniature diner food, in the spirit of plastic food-sample (shokuhin sampuru) capsule toys.
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow } from '../../voxel/VoxelModel.js';

const K = C.ink;

/** Deterministic hash noise in [0,1). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 668265263);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** Fill a box using a colour function (x,y,z) => colour. */
function fill(v, x0, y0, z0, x1, y1, z1, fn) {
  return v.shape(x0, y0, z0, x1, y1, z1, () => true, fn);
}

/** Light wood with soft grain lines running along x. */
function grain(base, dark = 0.86) {
  return (x, y, z) => {
    const w = z + Math.round(Math.sin(x * 0.35 + z) * 0.8);
    if (((w % 4) + 4) % 4 === 0) return shade(base, dark);
    return hash(x, y, z, 3) < 0.08 ? shade(base, 1.05) : base;
  };
}

/** Plain short-grain rice texture. */
const riceCol = (x, y, z) => {
  const n = hash(x, y, z, 11);
  return n < 0.2 ? 0xf1ece0 : n > 0.88 ? 0xffffff : C.rice;
};

// ---------------------------------------------------------------- onigiri
function onigiri(v, cx, y0, cz, { hw = 4.5, h = 9, d = 5, col = riceCol } = {}) {
  const hd = (d - 1) / 2;
  v.shape(cx - hw - 1, y0, cz - hd - 1, cx + hw + 1, y0 + h, cz + hd + 1, (x, y, z) => {
    const dx = x - cx, dy = y - y0, dz = z - cz;
    if (dy >= h) return false;
    const t = (dy + 0.5) / h;
    const half = hw * (1 - t) + 0.9;
    if (Math.abs(dx) > half) return false;
    const ex = dx / (hw + 0.6), ey = (dy - h * 0.42) / (h * 0.62);
    if (ex * ex + ey * ey > 1) return false;
    const edge = Math.abs(dx) / half;
    const th = hd + 0.5 - (edge > 0.72 ? 1 : 0) - (t > 0.82 ? 1 : 0) - (dy === 0 ? 1 : 0);
    return Math.abs(dz) <= th;
  }, col);
}

// ---------------------------------------------------------------- tamagoyaki
const EGG = 0xffd447, EGG_PALE = 0xfff0a6, EGG_SKIN = 0xf3bb3c, EGG_BROWN = 0xd99a3a;
/** Rectangular omelette piece. cut = which faces show the rolled layers: 'x0','x1','y1'. */
function eggPiece(v, x0, x1, y0, y1, z0, z1, cut = []) {
  v.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => {
    const ey = y === y0 || y === y1, ez = z === z0 || z === z1, exx = x === x0 || x === x1;
    if (ey && ez) return false; // bevel long edges
    if (!cut.includes('x0') && x === x0 && (ey || ez)) return false; // rounded natural end
    if (!cut.includes('y1') && cut.includes('flat') && exx && ez) return false;
    return true;
  }, (x, y, z) => {
    const layer = (a, b) => (a === 0 ? EGG_SKIN : a % 2 ? EGG_PALE : EGG);
    if (cut.includes('x1') && x === x1) return layer(Math.min(y - y0, y1 - y, z - z0, z1 - z));
    if (cut.includes('x0') && x === x0) return layer(Math.min(y - y0, y1 - y, z - z0, z1 - z));
    if (cut.includes('y1') && y === y1) return layer(Math.min(x - x0, x1 - x, z - z0, z1 - z));
    const n = hash(x, y, z, 5);
    if (y === y1 && n < 0.22) return EGG_BROWN;
    return n < 0.3 ? EGG_SKIN : EGG;
  });
}

/** Serrated green shiso leaf lying flat (y), pointing along +x. */
function shiso(v, cx, y, cz, len = 6, wid = 3.5) {
  v.shape(cx - len, y, cz - wid - 1, cx + len, y, cz + wid + 1, (x, yy, z) => {
    const u = (x - cx) / len;
    if (Math.abs(u) > 1) return false;
    let w = wid * Math.pow(1 - u * u, 0.7);
    if ((x & 1) === 0) w -= 0.5; // serrated edge
    return Math.abs(z - cz) <= w;
  }, (x, yy, z) => (z === Math.round(cz) ? 0x8fd86a : (x + Math.abs(z - cz)) % 3 === 0 ? 0x4f9e3c : 0x5fb548));
}

// ---------------------------------------------------------------- shared bits
/** Patterned donburi bowl outer profile radius at height y (foot at y=0, rim at y=top). */
function bowlR(y, rFoot, rTop, top) {
  return rFoot + (rTop - rFoot) * Math.pow(Math.max(0, y - 1) / (top - 1), 0.75);
}

function chopsticks(v, x0, y0, z0, x1, y1, z1, col = C.lacquer, tip = C.woodLight) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const n = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const c = t < 0.3 ? tip : col;
    v.set(Math.round(x0 + dx * t), Math.round(y0 + dy * t), Math.round(z0 + dz * t), gloss(c));
  }
}

export default {
  id: 'shokudo',
  order: 2,
  name: 'Tiny Shokudō',
  jp: 'ミニチュア食堂',
  tagline: 'Hyper-real miniature diner food',
  taglineJp: '本物そっくり！食品サンプル',
  price: 200,
  themes: ['food', 'retro'],
  card: { bg: '#fff3d6', accent: '#e34234', text: '#3a2410', accent2: '#2f6fd6', pattern: 'checker' },
  capsule: { colors: [0xffd447, 0xe34234, 0xfbf8f2, 0x8fb85a, 0xf2c27b] },
  items: [
    // ------------------------------------------------------------ 1. onigiri
    {
      id: 'onigiri', name: 'Onigiri Trio', jp: 'おにぎり三兄弟', rarity: 'common',
      desc: 'Ume, salmon and grilled. Hand-pressed by a grandma who says "eat more".',
      build(v) {
        // woven bamboo zaru
        v.cylinder(0, 0, 0, 12, 1, (x, y, z) => ((Math.floor((x + 64) / 2) + Math.floor((z + 64) / 2)) % 2 ? 0xdcc58c : 0xc4a96c));
        v.torus(0, 1, 0, 12, 1, (x, y, z) => ((Math.atan2(z, x) * 12 | 0) % 2 ? 0xb89a5c : 0xa98a4e));
        // bamboo leaf (sasa), lying diagonally
        const ang = 0.35, ca = Math.cos(ang), sa = Math.sin(ang);
        v.shape(-12, 1, -10, 12, 1, 10, (x, y, z) => {
          const u = x * ca + z * sa, w = -x * sa + z * ca;
          if (Math.abs(u) > 11.5) return false;
          const half = 5.2 * Math.pow(1 - (u / 11.5) ** 2, 0.75);
          return Math.abs(w + u * 0.06) <= half && x * x + z * z < 125;
        }, (x, y, z) => {
          const u = x * ca + z * sa, w = -x * sa + z * ca + u * 0.06;
          if (Math.abs(w) < 0.6) return 0x9ed36a;
          return (Math.round(u - Math.abs(w) * 0.9) % 3 === 0) ? 0x4e9a38 : 0x3f8a2e;
        });
        // back: salmon onigiri (biggest)
        onigiri(v, 0, 2, -3, { hw: 5, h: 10, d: 5 });
        v.paint(() => v.box(-2, 2, -6, 2, 5, 0, C.nori));
        v.layer(['.SoS.', 'SoSoS', '.oSo.'], { S: C.salmon, o: 0xffb48a }, { x: -2, y: 10, z: 0 });
        // left: umeboshi onigiri
        onigiri(v, -6, 2, 2);
        v.paint(() => v.box(-8, 2, -1, -4, 4, 5, C.nori));
        v.sphere(-6, 8, 4, 1.2, gloss(0xb8203a));
        v.set(-6, 9, 5, gloss(0xe0506a));
        // right: yaki-onigiri, soy-glazed & grilled
        onigiri(v, 6, 2, 2, {
          col: (x, y, z) => {
            const n = hash(x, y, z, 21);
            return gloss(n < 0.18 ? 0x9a4e1c : n < 0.55 ? 0xc77a32 : 0xd99448);
          },
        });
        // sesame on the salmon one
        v.project(['K..K.', '..K..', 'K...K'], { K: 0x2a2420 }, -2, 11, '+z');
        // takuan slices
        for (const [x, y, z] of [[-1, 2, 8], [1, 2, 9], [3, 2, 8]]) {
          v.cylinder(x, y, z, 1.8, 1, (xx, yy, zz) => ((xx - x) ** 2 + (zz - z) ** 2 > 2.2 ? 0xe9b520 : 0xf8dc5a));
        }
      },
    },
    // ------------------------------------------------------------ 2. tamagoyaki
    {
      id: 'tamago', name: 'Tamagoyaki Board', jp: '玉子焼き', rarity: 'common',
      desc: 'Rolled omelette, sliced on a hinoki board. Sweet style, as is tradition.',
      build(v) {
        // manaita with geta feet
        fill(v, -13, 2, -7, 13, 3, 7, grain(0xe8cd98));
        v.paint(() => v.box(-13, 2, 7, 13, 2, 7, 0xd2b27a));
        v.box(-11, 0, -6, -9, 1, 6, 0xc8a46a);
        v.box(9, 0, -6, 11, 1, 6, 0xc8a46a);
        // knife at the back
        v.box(-4, 4, -6, 10, 4, -5, metal(C.silver));
        v.box(-4, 4, -7, 10, 4, -7, metal(0x7d8590)); // spine
        v.box(10, 4, -5, 10, 4, -5, null);
        v.box(-9, 4, -7, -5, 5, -6, C.woodDark); // handle
        v.box(-5, 4, -7, -5, 5, -6, metal(C.brass));
        // the roll + slices
        eggPiece(v, -12, -6, 4, 9, -4, 1, ['x1']);
        eggPiece(v, -4, -2, 4, 9, -3, 2, ['x0', 'x1']);
        eggPiece(v, 0, 2, 4, 9, -2, 3, ['x0', 'x1']);
        eggPiece(v, 4, 9, 4, 6, 0, 5, ['y1', 'flat']);
        // daikon oroshi on shiso, with a drop of soy
        shiso(v, -8, 4, 4, 4, 2.5);
        v.ellipsoid(-8, 5, 4, 2.2, 1.5, 1.8, (x, y, z) => (hash(x, y, z, 9) < 0.35 ? 0xe9e7da : 0xfbfaf2));
        v.set(-8, 7, 4, gloss(C.soy));
        v.set(-8, 6, 5, gloss(0x7a3e22));
      },
    },
    // ------------------------------------------------------------ 3. takoyaki
    {
      id: 'takoyaki', name: 'Takoyaki Boat', jp: 'たこ焼き舟', rarity: 'common',
      desc: 'Six octopus balls at the temperature of the sun. Bonito flakes still dancing.',
      build(v) {
        // balls first, the boat walls overwrite any overlap
        const balls = [];
        for (const z of [-3.5, 3.5]) for (const x of [-7, 0, 7]) balls.push([x, 4, z]);
        for (const [bx, by, bz] of balls) {
          v.sphere(bx, by, bz, 3.4, (x, y, z) => {
            const a = Math.atan2(z - bz, x - bx);
            const drip = by + 0.2 + Math.sin(a * 3 + bx) * 0.9;
            if (y >= drip) {
              const n = hash(x, y, z, 13);
              if (n < 0.13) return 0x4f8a2a; // aonori
              return gloss(n < 0.5 ? 0x5a2a12 : 0x6e3518);
            }
            return hash(x, y, z, 4) < 0.4 ? 0xc77c34 : 0xdb9a4c;
          });
        }
        // kyogi wooden boat
        for (let y = 0; y <= 3; y++) {
          const ax = 11 + Math.floor(y * 0.6), az = 7 + Math.floor(y * 0.6);
          v.shape(-ax, y, -az, ax, y, az, (x, yy, z) => y === 0 || Math.abs(x) === ax || Math.abs(z) === az,
            (x, yy, z) => (y === 3 ? 0xd6bb86 : (z + 40) % 3 === 0 ? 0xdcc38e : 0xecd8aa));
        }
        // mayo zigzags across each row
        for (const zc of [-3.5, 3.5]) {
          for (let x = -10; x <= 10; x++) {
            const p = ((x % 4) + 4) % 4;
            const z = Math.round(zc + (p < 2 ? p - 1 : 3 - p) * 1.6);
            let top = -1;
            for (let y = 9; y >= 0; y--) if (v.has(x, y, z)) { top = y; break; }
            if (top >= 6) v.set(x, top + 1, z, gloss(0xfffbe8));
          }
        }
        // katsuobushi flakes
        const flake = [0xe8b49a, 0xd9967a, 0xf3d0b8, 0xc98468];
        for (const [bx, , bz] of balls) {
          for (const [ox, oz, i] of [[-1, -1, 0], [1, 0, 1], [0, 2, 2], [2, -2, 3]]) {
            const x = bx + ox, z = Math.round(bz + oz);
            let top = -1;
            for (let y = 10; y >= 0; y--) if (v.has(x, y, z)) { top = y; break; }
            if (top < 6) continue;
            const c = flake[(i + bx + 8) % 4];
            v.set(x, top + 1, z, c);
            if ((i + bx) % 2 === 0) v.set(x, top + 2, z, c);
            v.set(x + (i % 2 ? 1 : 0), top + 1, z + (i % 2 ? 0 : 1), flake[(i + 1) % 4]);
          }
        }
        // beni-shoga on the middle back ball
        v.layer(['.R.', 'RrR', '.R.'], { R: 0xe8364e, r: 0xff5c72 }, { x: -1, y: 9, z: -5, plane: 'xz' });
        // two toothpicks in the front-right ball
        v.line(7, 7, 4, 10, 13, 6, 0xf2dcb0);
        v.line(6, 7, 4, 4, 13, 7, 0xf2dcb0);
      },
    },
    // ------------------------------------------------------------ 4. ramen
    {
      id: 'ramen', name: 'Shoyu Ramen', jp: '醤油ラーメン', rarity: 'uncommon',
      desc: 'The noodle lift is frozen forever. The chopsticks are tired.',
      build(v) {
        const top = 12, rF = 7, rT = 13;
        const RED = 0xd8322e;
        const key = ['RRRRR.', 'R...R.', 'R.R.R.', 'R.RRR.', 'R.....'];
        // bowl
        v.tube(0, 0, 0, 6, 4.6, 1, gloss(C.ceramic));
        v.shape(-rT - 1, 1, -rT - 1, rT + 1, top, rT + 1, (x, y, z) => {
          const r = Math.hypot(x, z), ro = bowlR(y, rF, rT, top) + 0.2;
          return r <= ro && (y === 1 || r > ro - 1.5);
        }, (x, y, z) => {
          const r = Math.hypot(x, z), ro = bowlR(y, rF, rT, top) + 0.2;
          if (y === top) return gloss(RED);
          if (r < ro - 1) return gloss(C.ceramic);
          if (y === 5) return gloss(RED);
          if (y >= 6 && y <= 10) {
            const col = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 72) % 6;
            return gloss(key[10 - y][col] === 'R' ? RED : C.ceramic);
          }
          return gloss(C.ceramic);
        });
        // broth
        v.shape(-rT, 2, -rT, rT, 10, rT, (x, y, z) => Math.hypot(x, z) <= bowlR(y, rF, rT, top) - 0.9,
          (x, y, z) => gloss(hash(x, y, z, 2) < 0.12 ? 0xe0a85a : 0xb06a26));
        // noodles in the broth (front)
        v.shape(-10, 10, -2, 6, 11, 10, (x, y, z) => {
          if (Math.hypot(x, z) > bowlR(10, rF, rT, top) - 2) return false;
          const s = (z + Math.round(Math.sin(x * 0.8) * 1.2) + 40) % 2 === 0;
          if (!s) return false;
          return y === 10 || (Math.hypot(x + 2, z - 3) < 4.5 && hash(x, y, z, 4) < 0.8);
        }, (x, y, z) => (hash(x, y, z, 6) < 0.3 ? 0xe9c766 : C.noodle));
        // nori sheet leaning on the back
        fill(v, -3, 9, -10, 3, 13, -9, (x, y, z) => (hash(x, y, z, 8) < 0.25 ? 0x2c3a2c : C.nori));
        fill(v, -3, 14, -11, 3, 18, -11, (x, y, z) => (hash(x, y, z, 8) < 0.25 ? 0x2c3a2c : C.nori));
        // chashu x2
        for (const [cx, cy, cz] of [[-6, 11, -3], [-3, 12, -6]]) {
          v.cylinder(cx, cy, cz, 3.2, 1, (x, y, z) => {
            const r = Math.hypot(x - cx, z - cz), a = Math.atan2(z - cz, x - cx);
            if (r > 2.6) return 0x8a4524;
            if (Math.abs(r - 1.6 - Math.sin(a * 2) * 0.4) < 0.45) return 0xf8e6d6;
            return hash(x, y, z, 1) < 0.3 ? 0xd99a86 : 0xe8b4a0;
          });
        }
        // ajitama half
        v.ellipsoid(5, 11, -4, 2.4, 1.5, 3.2, (x, y, z) => {
          const dx = x - 5, dz = z + 4;
          if (y === 11 && (dx * dx) / 1.8 + (dz * dz) / 3.8 <= 1) return gloss(dx === 0 && Math.abs(dz) <= 1 ? 0xf07a10 : 0xf6a024);
          if (y === 11 && (dx * dx) / 5.5 + (dz * dz) / 10 <= 1) return 0xfbf3e2;
          return 0xd9a35e;
        });
        v.box(3, 10, -8, 7, 10, 0, null);
        v.ellipsoid(5, 11, -4, 2.4, 1.5, 3.2, null);
        v.shape(2, 11, -8, 8, 12, 0, (x, y, z) => {
          const dx = x - 5, dz = z + 4;
          return y === 11 && (dx * dx) / 6.8 + (dz * dz) / 11 <= 1;
        }, (x, y, z) => {
          const dx = x - 5, dz = z + 4;
          if ((dx * dx) / 1.8 + (dz * dz) / 3.8 <= 1) return gloss(dx === 0 && Math.abs(dz) <= 1 ? 0xf07a10 : 0xf6a024);
          if ((dx * dx) / 4.2 + (dz * dz) / 7.6 <= 1) return 0xfbf3e2;
          return 0xd9a35e;
        });
        // naruto with wavy edge & pink swirl
        v.shape(4, 11, 1, 10, 11, 7, (x, y, z) => {
          const r = Math.hypot(x - 7, z - 4), a = Math.atan2(z - 4, x - 7);
          return r <= 2.6 + Math.sin(a * 8) * 0.4;
        }, (x, y, z) => {
          const r = Math.hypot(x - 7, z - 4), a = Math.atan2(z - 4, x - 7);
          const sp = (((a + r * 1.9) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          return r < 0.6 || sp < 1.6 ? C.narutoSwirl : C.naruto;
        });
        // menma
        for (let i = 0; i < 3; i++) v.box(8 - i, 11 + (i === 1 ? 1 : 0), -6 + i, 10 - i, 11 + (i === 1 ? 1 : 0), -6 + i, i % 2 ? 0xc89a52 : 0xb88a44);
        // scallions
        for (const [x, z] of [[0, 1], [1, 2], [-1, 3], [2, 0], [0, -1], [1, 4], [-2, 1], [3, 2]]) {
          v.set(x, 11, z, hash(x, 0, z, 3) < 0.4 ? 0xd6f0a0 : C.scallion);
        }
        // chopsticks lifting noodles
        chopsticks(v, -1, 20, 2, 13, 24, 5);
        chopsticks(v, -1, 21, 3, 13, 25, 6);
        for (const [sx, sz, ph] of [[0, 2, 0], [1, 3, 1.3], [2, 2, 2.4], [1, 1, 3.1]]) {
          let px = null;
          for (let y = 11; y <= 20; y++) {
            const x = sx + Math.round(Math.sin(y * 0.9 + ph) * 0.7);
            if (px !== null && px !== x) v.set(px, y, sz, C.noodle);
            v.set(x, y, sz, y % 3 === 0 ? 0xe9c766 : C.noodle);
            px = x;
          }
        }
      },
    },
    // ------------------------------------------------------------ 5. tempura soba
    {
      id: 'soba', name: 'Ebi Tempura Soba Set', jp: '天ざるそば', rarity: 'uncommon',
      desc: 'Two prawns, one shishito, zero regrets. Slurping loudly is good manners.',
      build(v) {
        const LAQ = 0x2a1a16, LAQR = 0xa3241c;
        // lacquer tray
        v.box(-13, 0, -9, 13, 0, 9, gloss(LAQR));
        v.hollowBox(-13, 0, -9, 13, 1, 9, gloss(LAQ), 1, ['top', 'bottom']);
        // seiro box with bamboo mat
        v.hollowBox(-12, 1, -8, -1, 3, 3, gloss(LAQ), 1, ['top']);
        fill(v, -11, 3, -7, -2, 3, 2, (x) => (x % 2 ? 0xd8c27a : 0xc2a862));
        // soba mound
        v.ellipsoid(-6.5, 4, -2.5, 4.5, 3.5, 4.2, (x, y, z) => {
          const s = (x + Math.round(Math.sin(z * 1.1 + y) * 1.2) + 40) % 2;
          return s ? 0x8f7f68 : hash(x, y, z, 3) < 0.4 ? 0x7a6a56 : 0xa29176;
        });
        v.box(-12, 1, -8, -1, 3, 3, null).box(-12, 1, -8, -1, 0, 3, null); // (re-cut below mound)
        v.hollowBox(-12, 1, -8, -1, 3, 3, gloss(LAQ), 1, ['top']);
        fill(v, -11, 3, -7, -2, 3, 2, (x) => (x % 2 ? 0xd8c27a : 0xc2a862));
        v.box(-11, 1, -7, -2, 2, 2, gloss(LAQ));
        // shredded nori on top
        for (const [x, z] of [[-7, -3], [-6, -2], [-5, -3], [-8, -2], [-6, -4], [-7, -1]]) {
          let top = 0; for (let y = 12; y > 0; y--) if (v.has(x, y, z)) { top = y; break; }
          v.set(x, top + 1, z, C.nori);
        }
        // tempura plate with kaishi paper
        v.box(1, 1, -8, 12, 1, 1, gloss(0xdfe6ea));
        v.paint(() => v.box(1, 1, -8, 12, 1, -8, gloss(0x4a7ab0)));
        v.shape(2, 2, -7, 11, 2, 0, (x, y, z) => Math.abs((x - 6.5) + (z + 3.5)) <= 6.5 && Math.abs((x - 6.5) - (z + 3.5)) <= 6.5, C.paper);
        // two ebi tempura
        const fry = (x, y, z) => { const n = hash(x, y, z, 17); return n < 0.3 ? 0xfbe08a : n < 0.55 ? 0xe9a83e : C.tempura; };
        for (const [z, y] of [[-5, 3], [-2, 3]]) {
          v.cylinder(2, y, z, 1.4, 8, fry, 'x');
          v.sphere(3, y, z, 1.5, fry);
          for (let x = 2; x <= 9; x += 2) v.set(x, y + 2, z, hash(x, y, z, 1) < 0.5 ? 0xfbe08a : 0xf0c060);
          v.box(10, y - 1, z, 11, y + 1, z, gloss(0xe8452a)); // tail
          v.set(11, y + 2, z, gloss(0xb82418)).set(11, y - 2, z, gloss(0xb82418));
        }
        // shishito & sweet potato
        v.cylinder(3, 2, 0, 0.8, 6, gloss(0x4e9a2e), 'x');
        v.set(9, 2, 0, 0x6a8a3a);
        v.cylinder(9, 2, -2, 1.6, 1, (x, y, z) => (Math.hypot(x - 9, z + 2) > 1.2 ? 0x7a2a5a : 0xf4cf52));
        v.box(8, 2, -2, 10, 2, -2, null);
        v.cylinder(9, 2, -1, 1.8, 2, (x, y, z) => (Math.hypot(x - 9, y - 3) > 1.3 ? 0x7a2a5a : 0xf4cf52), 'z');
        // soba choko with tsuyu
        v.cylinder(7, 1, 6, 2.6, 4, (x, y, z) => gloss(y === 2 || y === 4 ? 0x2b4f9e : C.ceramic));
        v.cylinder(7, 4, 6, 1.7, 1, gloss(0x3a1a0c));
        // yakumi dish: wasabi + scallions
        v.box(-11, 1, 5, -4, 1, 8, gloss(0xe6dccb));
        v.cone(-9, 2, 6.5, 1.3, 3, 0x8fbf4a);
        v.ellipsoid(-6, 2, 6.5, 1.6, 0.8, 1.2, (x, y, z) => (hash(x, y, z, 2) < 0.5 ? 0xd6f0a0 : C.scallion));
        // chopsticks on a rest
        v.box(0, 1, 7, 1, 2, 8, gloss(0x3a6fb0));
        chopsticks(v, -3, 2, 7, 10, 2, 7, C.woodLight, C.woodLight);
        chopsticks(v, -3, 2, 8, 10, 2, 8, C.woodLight, C.woodLight);
      },
    },
    // ------------------------------------------------------------ 6. omurice
    {
      id: 'omurice', name: 'Ketchup-Heart Omurice', jp: 'オムライス', rarity: 'rare',
      desc: 'Comes with a flag. Every adult who orders it secretly wants the flag.',
      build(v) {
        // oval plate
        v.shape(-14, 0, -11, 14, 2, 11, (x, y, z) => {
          const e = (x / 13.6) ** 2 + (z / 10.2) ** 2;
          if (y === 0) return (x / 9) ** 2 + (z / 6.5) ** 2 <= 1;
          if (y === 1) return e <= 1;
          return e <= 1 && e > 0.8;
        }, (x, y, z) => {
          const e = (x / 13.6) ** 2 + (z / 10.2) ** 2;
          if (y === 2 && e > 0.86 && e < 0.93) return gloss(0x3a6fd6);
          return gloss(C.ceramic);
        });
        // omelette (lemon-shaped)
        const ox = -1, oz = -1;
        v.shape(-12, 2, -8, 10, 8, 6, (x, y, z) => {
          const dx = (x - ox) / 9.6, dy = (y - 2) / 5.4;
          const rz = 5.6 * (1 - 0.45 * dx * dx);
          const dz = (z - oz) / rz;
          return dx * dx + dy * dy + dz * dz <= 1;
        }, (x, y, z) => {
          if (y === 2) return 0xe9a92a;
          const n = hash(x, y, z, 19);
          return gloss(n < 0.15 ? 0xffe27a : n > 0.9 ? 0xf2b630 : 0xffcf3a);
        });
        // ketchup heart
        v.project(['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
          { R: gloss(0xd0242a) }, ox - 3, oz - 3, '+y', { raise: true });
        v.project(['.H'], { H: gloss(0xff6a5a) }, ox - 3, oz - 3, '+y', { raise: true });
        // flag on a toothpick
        v.box(ox + 4, 6, oz - 1, ox + 4, 14, oz - 1, 0xf2dcb0);
        v.layer(['WWWWWW', 'WWRRWW', 'WWRRWW', 'WWWWWW'], { W: C.white, R: 0xe5383b }, { x: ox + 5, y: 14, z: oz - 1 });
        // cabbage + tomato + parsley
        v.ellipsoid(9, 3, -4, 3, 2.2, 3, (x, y, z) => {
          const n = hash(x, y, z, 23);
          return n < 0.3 ? 0xf2f8e0 : n < 0.65 ? 0xd4eca4 : 0xbfe08a;
        });
        v.box(6, 1, -8, 12, 1, 0, null);
        v.box(6, 1, -8, 12, 1, 0, gloss(C.ceramic));
        for (const [x, y, z] of [[9, 6, -4], [8, 5, -3], [10, 5, -5], [9, 5, -2]]) v.sphere(x, y, z, 0.9, x % 2 ? 0x3c9a3a : 0x2f8a30);
        v.shape(7, 2, 2, 12, 5, 6, (x, y, z) => {
          const dx = x - 9.5, dy = y - 2;
          return dx * dx + dy * dy * 1.4 <= 7.5 && Math.abs(z - 4) <= 1;
        }, (x, y, z) => {
          const dx = x - 9.5, dy = y - 2;
          if (z === 5 && dx * dx + dy * dy * 1.4 <= 3) return (x + y) % 2 ? 0xf8a06a : 0xffd0a0;
          return gloss(0xe0302a);
        });
        // spoon
        v.ellipsoid(-10, 2, 5, 1.6, 0.5, 1.2, metal(C.silver));
        v.line(-8, 2, 6, -2, 2, 8, metal(C.silver));
      },
    },
    // ------------------------------------------------------------ 7. sushi geta
    {
      id: 'sushi', name: 'Sushi Geta Platter', jp: '寿司下駄盛り', rarity: 'ultra',
      desc: 'Chef’s choice. The chef chose “all the good ones”.',
      build(v) {
        // geta board
        fill(v, -13, 3, -6, 13, 4, 6, grain(0xe8c890, 0.88));
        v.box(-11, 0, -6, -9, 2, 6, 0xc49a5e);
        v.box(9, 0, -6, 11, 2, 6, 0xc49a5e);
        const RY = 5;
        const nigiri = (x0, topFn, { z0 = -5, thick = 1 } = {}) => {
          // rice
          v.shape(x0, RY, z0, x0 + 3, RY + 2, z0 + 6, (x, y, z) => {
            const ex = x === x0 || x === x0 + 3, ez = z === z0 || z === z0 + 6;
            return !(y === RY + 2 && (ex || ez));
          }, riceCol);
          // draping topping
          v.shape(x0, RY + 1, z0 - 1, x0 + 3, RY + 2 + thick, z0 + 7, (x, y, z) => {
            const end = z === z0 - 1 || z === z0 + 7;
            if (end) return y === RY + 1 || (y === RY + 2 && thick > 1);
            const end2 = z === z0 || z === z0 + 6;
            if (end2) return y >= RY + 2 && y <= RY + 1 + thick;
            return y >= RY + 3 && y <= RY + 2 + thick;
          }, topFn);
        };
        // maguro
        nigiri(-12, (x, y, z) => gloss((x + z) % 4 === 0 ? 0xd8485a : 0xbf2238));
        // salmon
        nigiri(-7, (x, y, z) => gloss((x + z + 40) % 3 === 0 ? 0xffd2bc : 0xff8450));
        // ebi
        nigiri(-2, (x, y, z) => gloss((z + 40) % 2 ? 0xfff0e6 : 0xff7246));
        v.box(-2, RY + 2, -8, 1, RY + 4, -8, gloss(0xe8402a));
        v.box(-2, RY + 5, -8, -2, RY + 5, -8, gloss(0xb02414)).box(1, RY + 5, -8, 1, RY + 5, -8, gloss(0xb02414));
        // tamago with nori belt
        nigiri(3, (x, y, z) => (hash(x, y, z, 7) < 0.3 ? 0xf6c236 : 0xffd447), { thick: 2 });
        v.box(2, RY, -2, 7, RY + 5, -2, C.nori);
        v.box(3, RY, -2, 6, RY + 4, -2, null);
        v.box(3, RY + 5, -2, 6, RY + 5, -2, C.nori);
        v.box(2, RY, -2, 2, RY + 5, -2, C.nori).box(7, RY, -2, 7, RY + 5, -2, C.nori);
        v.box(3, RY, -2, 6, RY + 1, -2, riceCol(3, RY, -2));
        v.box(3, RY + 2, -2, 6, RY + 4, -2, 0xffd447);
        // ikura gunkan
        v.tube(10, RY, -3, 2.5, 1.4, 4, (x, y, z) => (hash(x, y, z, 2) < 0.3 ? 0x2c3a2c : C.nori));
        v.cylinder(10, RY, -3, 1.6, 3, C.rice);
        v.shape(7, RY + 3, -6, 13, RY + 5, 0, (x, y, z) => {
          const r = Math.hypot(x - 10, z + 3);
          return (y === RY + 3 && r <= 2) || (y === RY + 4 && r <= 1.6 && (x + z) % 2 === 0) || (y === RY + 5 && r < 0.6);
        }, (x, y, z) => gloss(hash(x, y, z, 31) < 0.25 ? 0xffb050 : (x + z) % 2 ? 0xff5a14 : 0xe8400c));
        v.set(11, RY + 4, -2, C.lime); v.set(12, RY + 4, -2, C.lime);
        // shiso + gari + wasabi at the front
        shiso(v, 8, RY, 3.5, 4.5, 2.2);
        v.shape(7, RY + 1, 2, 12, RY + 3, 5, (x, y, z) => {
          const dx = (x - 9.5) / 2.6, dy = (y - RY - 1) / 2.3, dz = (z - 3.5) / 2;
          return dx * dx + dy * dy + dz * dz <= 1;
        }, (x, y, z) => ((y + x) % 2 ? 0xf6c4c0 : 0xf0a8ae));
        v.cone(-9, RY, 3, 1.5, 3, (x, y, z) => (hash(x, y, z, 5) < 0.4 ? 0x9fcf5a : 0x82b444));
        v.set(-9, RY + 3, 3, 0x9fcf5a);
      },
    },
    // ------------------------------------------------------------ 8. neko yatai (secret)
    {
      id: 'yatai', name: 'Neko Yatai', jp: 'ねこ屋台', rarity: 'secret',
      desc: 'Opens at midnight. Accepts payment in dried sardines only.',
      build(v) {
        const W = 0xffffff;
        const WOOD = 0x9a6239, WOODL = 0xc08a54, WOODD = 0x5e3a22;
        const boards = (x, y, z) => ((x + 40) % 3 === 0 ? WOODD : hash(x, y, z, 4) < 0.2 ? WOODL : WOOD);
        // cart body
        fill(v, -10, 3, -5, 10, 11, 5, boards);
        v.paint(() => {
          v.box(-10, 10, 5, 10, 10, 5, 0x7a2a1e);
          v.box(-10, 3, 5, 10, 3, 5, WOODD);
        });
        // menu tags on the front
        for (const x of [-7, -4, 4, 7]) {
          v.set(x, 8, 6, C.paper); v.set(x, 7, 6, C.paper); v.set(x, 6, 6, C.paper);
          v.set(x, 7, 6, x % 2 ? K : 0x444040);
        }
        // counter (customer side overhangs the front)
        fill(v, -11, 12, -6, 11, 12, 8, (x, y, z) => (z > 5 ? 0x6a4028 : WOODL));
        // support legs
        for (const x of [-9, 9]) for (const z of [-4, 4]) v.box(x, 0, z, x, 2, z, WOODD);
        // big spoked wheels
        for (const x of [-12, 12]) {
          v.torus(x, 5, 0, 4.5, 0.6, 0x3a2a20, 'x');
          v.cylinder(x, 5, 0, 1, 1, metal(C.steel), 'x');
          for (let a = 0; a < 6; a++) {
            const t = (a / 6) * Math.PI * 2;
            v.line(x, 5, 0, x, 5 + Math.round(Math.sin(t) * 4), Math.round(Math.cos(t) * 4), WOODL);
          }
          v.box(x > 0 ? 11 : -11, 5, 0, x > 0 ? 11 : -11, 5, 0, metal(C.steel));
        }
        // corner posts & roof
        for (const x of [-10, 10]) for (const z of [-5, 6]) v.box(x, 13, z, x, 26, z, WOODD);
        v.shape(-12, 26, -8, 12, 29, 9, (x, y, z) => {
          const ry = Math.round(29 - Math.abs(z - 0.5) / 3.2);
          return y === ry || y === ry - 1;
        }, (x, y, z) => ((x + 40) % 3 === 0 ? 0x4a2c18 : 0x6a4028));
        // noren curtain
        for (const x0 of [-9, -4, 1, 6]) {
          fill(v, x0, 22, 7, x0 + 3, 26, 7, (x, y) => (y === 26 ? 0x1c2a52 : C.navy));
        }
        v.project(['.W.W.', 'W.W.W', '.WWW.', '.WWW.'], { W }, -2, 25, '+z'); // paw crest (spans the gap)
        // red lantern
        v.box(12, 24, 8, 12, 25, 8, K);
        v.box(12, 23, 8, 12, 23, 8, C.lacquerBlack);
        v.ellipsoid(12, 19, 8, 2.6, 3.4, 2.6, (x, y, z) => glow(y % 2 ? 0xff5a3a : 0xe8402a));
        v.box(11, 15, 7, 13, 15, 9, C.lacquerBlack);
        v.box(11, 23, 7, 13, 23, 9, C.lacquerBlack);
        v.project(['K', 'K', 'K'], { K: glow(0x5a1010) }, 12, 20, '+z');
        // stock pot + bowls
        v.cylinder(-6, 13, -2, 3, 5, metal(C.steel));
        v.cylinder(-6, 18, -2, 3, 1, metal(C.chrome));
        v.box(-6, 19, -2, -6, 19, -2, K);
        for (let i = 0; i < 3; i++) v.cylinder(6, 13 + i, -3, 2, 1, gloss(i === 2 ? 0xd8322e : C.ceramic));
        // customer bowl on the counter
        v.cylinder(-5, 13, 6, 2, 2, gloss(C.ceramic));
        v.paint(() => v.cylinder(-5, 14, 6, 2, 1, gloss(0xd8322e)));
        v.cylinder(-5, 14, 6, 1.2, 1, gloss(0xb06a26));
        v.box(-6, 15, 6, -4, 15, 6, C.noodle);
        // cat chef
        v.ellipsoid(0, 15, -2, 3.6, 3, 3, C.navy); // samue jacket
        v.paint(() => v.box(-1, 13, 0, 1, 17, 2, C.white)); // collar
        v.ellipsoid(0, 20, -2, 4, 3.4, 3.4, W);
        v.paint(() => v.ellipsoid(-3, 22, -2, 2, 2, 3, C.orange));
        // ears
        for (const x of [-3, 3]) {
          v.box(x - 1, 23, -3, x + 1, 23, -2, W);
          v.box(x, 24, -3, x, 24, -2, x < 0 ? C.orange : W);
          v.set(x, 23, -1, C.pink);
        }
        // hachimaki headband
        v.paint(() => v.box(-5, 22, -6, 5, 22, 2, C.white));
        v.paint(() => { for (let x = -5; x <= 5; x += 2) v.box(x, 22, -6, x, 22, 2, 0xe5383b); });
        v.set(4, 23, -5, C.white).set(5, 23, -6, 0xe5383b);
        // face
        v.project(['K.....K', '.......', '..M.M..', 'P..M..P'], { K, M: K, P: C.blush }, -3, 21, '+z');
        v.project(['WW.....WW'], { W: C.lightgray }, -4, 19, '+z');
        // paws + ladle
        v.sphere(-3, 14, 1, 1, W);
        v.sphere(3, 15, 1, 1, W);
        v.line(3, 15, 2, 3, 20, 2, metal(C.chrome));
        v.cylinder(3, 13, 3, 1, 2, metal(C.steel));
        // stools
        for (const x of [-5, 5]) {
          v.box(x, 0, 11, x, 3, 11, metal(C.steel));
          v.box(x - 1, 0, 10, x + 1, 0, 12, metal(C.steel));
          v.cylinder(x, 4, 11, 1.8, 1, gloss(0xd8322e));
        }
      },
    },
  ],
};
