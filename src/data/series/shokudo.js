// Series 2 — Tiny Shokudō (ミニチュア食堂)
// Hyper-real miniature diner food, in the spirit of plastic food-sample (shokuhin sampuru) capsule toys.
import { C, shade } from '../../voxel/palette.js';
import { gloss, metal, glow } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

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

/** Highest filled y in column (x,z), or -1. */
function topY(v, x, z, from = 40) {
  for (let y = from; y >= 0; y--) if (v.has(x, y, z)) return y;
  return -1;
}

/**
 * Paint a pixel pattern onto the model as seen along a tilted view direction (default: from the front,
 * ~30° above), so decals on curved tops stay readable from the shelf. (cx,cy,cz) = pattern centre.
 */
function projectView(v, rows, legend, cx, cy, cz, elev = 0.52) {
  const dy = -Math.sin(elev), dz = -Math.cos(elev); // ray direction (into the model)
  const uy = Math.cos(elev), uz = -Math.sin(elev); // pattern "up" on the view plane
  const h = rows.length, w = rows[0].length;
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const col = legend[ch];
    if (col === undefined) return;
    for (const su of [-0.3, 0, 0.3]) for (const sv of [-0.3, 0, 0.3]) {
      const u = c - (w - 1) / 2 + su, vv = (h - 1) / 2 - r + sv;
      const px = Math.round(cx + u);
      let py = cy + uy * vv - dy * 20, pz = cz + uz * vv - dz * 20;
      for (let i = 0; i < 200; i++) {
        const y = Math.round(py), z = Math.round(pz);
        if (v.has(px, y, z)) { v.set(px, y, z, col); break; }
        py += dy * 0.2; pz += dz * 0.2;
      }
    }
  }));
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
    if (cut.includes('flat') && exx && ez) return false;
    return true;
  }, (x, y, z) => {
    const layer = (a) => (a === 0 ? EGG_SKIN : a % 2 ? EGG_PALE : EGG);
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
/** Donburi bowl outer profile radius at height y (foot at y=0, rim at y=top). */
function bowlR(y, rFoot, rTop, top) {
  return rFoot + (rTop - rFoot) * Math.pow(Math.max(0, y - 1) / (top - 1), 0.75);
}

/** One chopstick as a face-connected 1-voxel line, optional tip colour near the start. */
function chopstick(v, x0, y0, z0, x1, y1, z1, col = C.woodLight, tip = null) {
  const p0 = [x0, y0, z0], p1 = [x1, y1, z1];
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)) * 4 || 1;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const c = tip && t < 0.25 ? tip : col;
    const q = [0, 1, 2].map((k) => Math.round(p0[k] + (p1[k] - p0[k]) * t));
    if (prev) {
      const m = prev.slice();
      for (const k of [0, 2, 1]) {
        if (m[k] !== q[k]) { m[k] = q[k]; if (m[0] !== q[0] || m[1] !== q[1] || m[2] !== q[2]) v.set(m[0], m[1], m[2], c); }
      }
    }
    v.set(q[0], q[1], q[2], c);
    prev = q;
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
        v.cylinder(0, 0, 0, 12.4, 1, (x, y, z) => ((Math.floor((x + 64) / 2) + Math.floor((z + 64) / 2)) % 2 ? 0xdcc48c : 0xcbb078));
        v.tube(0, 1, 0, 12.4, 11.2, 1, (x, y, z) => ((Math.round(Math.atan2(z, x) * 7) + 64) % 2 ? 0xb39558 : 0x9f8048));
        // bamboo leaf (sasa), lying diagonally
        const ang = 0.35, ca = Math.cos(ang), sa = Math.sin(ang);
        v.shape(-12, 1, -10, 12, 1, 10, (x, y, z) => {
          const u = x * ca + z * sa, w = -x * sa + z * ca;
          if (Math.abs(u) > 11.5) return false;
          const half = 5.2 * Math.pow(1 - (u / 11.5) ** 2, 0.75);
          return Math.abs(w + u * 0.06) <= half && x * x + z * z < 118;
        }, (x, y, z) => {
          const u = x * ca + z * sa, w = -x * sa + z * ca + u * 0.06;
          if (Math.abs(w) < 0.6) return 0x9ed36a;
          return (Math.round(u - Math.abs(w) * 0.9) % 3 === 0) ? 0x4e9a38 : 0x3f8a2e;
        });
        // back: salmon onigiri (biggest), flakes heaped on top
        onigiri(v, 0, 2, -3, { hw: 5, h: 10, d: 5 });
        v.paint(() => v.box(-2, 2, -6, 2, 5, 0, C.nori));
        v.paint(() => v.shape(-2, 10, -6, 2, 11, 0, () => true, (x, y, z) => (hash(x, y, z, 5) < 0.4 ? 0xffb48a : C.salmon)));
        v.set(0, 12, -3, C.salmon).set(-1, 12, -3, 0xffb48a).set(0, 12, -4, 0xff7c4c);
        // left: umeboshi onigiri
        onigiri(v, -6, 2, 2);
        v.paint(() => v.box(-8, 2, -1, -4, 4, 5, C.nori));
        v.layer(['.R.', 'RRR', '.R.'], { R: gloss(0xa8182e) }, { x: -7, y: 9, z: 5 });
        v.layer(['hRR', 'RRR', 'RRR'], { R: gloss(0x98142a), h: gloss(0xe0506a) }, { x: -7, y: 9, z: 4 });
        v.set(-6, 8, 6, gloss(0xc02038));
        // right: yaki-onigiri, soy-glazed with grill marks
        onigiri(v, 6, 2, 2, {
          col: (x, y, z) => {
            const n = hash(x, y, z, 21);
            if ((x + y + 40) % 4 === 0) return gloss(0x8e4a1c);
            return gloss(n < 0.06 ? 0x6e3410 : n < 0.4 ? 0xbf7430 : 0xcf8a3e);
          },
        });
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
        fill(v, -13, 2, -7, 13, 3, 7, grain(0xe8cd98, 0.82));
        v.paint(() => v.box(-13, 2, -7, 13, 2, 7, 0xd8b884));
        v.box(-11, 0, -6, -9, 1, 6, 0xc8a46a);
        v.box(9, 0, -6, 11, 1, 6, 0xc8a46a);
        // knife at the back
        v.box(-3, 4, -6, 10, 4, -5, gloss(0xcfd4dc));
        v.box(-3, 4, -5, 10, 4, -5, metal(C.chrome)); // edge
        v.box(-3, 4, -7, 9, 4, -7, gloss(0x8a929c)); // spine
        v.set(10, 4, -5, null);
        v.box(-9, 4, -7, -5, 5, -5, C.woodDark); // handle
        v.box(-4, 4, -7, -4, 5, -5, metal(C.brass));
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
        const balls = [];
        for (const z of [-3.6, 3.6]) for (const x of [-7.5, 0, 7.5]) balls.push([x, 4.2, z]);
        for (const [bx, by, bz] of balls) {
          v.sphere(bx, by, bz, 3.4, (x, y, z) => {
            const dy = y - by, n = hash(x, y, z, 13);
            if (dy >= 0) return gloss(n < 0.15 ? 0x6e3518 : 0x5a2a12); // sauce
            if (dy < -2) return 0xbf7834;
            return n < 0.25 ? 0xd28c3e : 0xe2a454;
          });
        }
        // kyogi wooden boat (walls overwrite any ball overlap)
        for (let y = 0; y <= 3; y++) {
          const ax = 12 + Math.floor(y * 0.6), az = 8 + Math.floor(y * 0.6);
          v.shape(-ax, y, -az, ax, y, az, (x, yy, z) => y === 0 || Math.abs(x) === ax || Math.abs(z) === az,
            (x, yy, z) => (y === 3 ? 0xd6bb86 : (z + 40) % 3 === 0 ? 0xdcc38e : 0xecd8aa));
        }
        // mayo drizzle: two diagonal stripes over each ball
        balls.forEach(([bx, , bz]) => {
          for (let i = -4; i <= 4; i++) for (const off of [-1.5, 1.5]) {
            const x = Math.round(bx + i), z = Math.round(bz + i * 0.5 + off);
            const t = topY(v, x, z, 12);
            if (t >= 6) v.set(x, t, z, gloss(0xfff6dc));
          }
        });
        // aonori specks + katsuobushi flakes (one curling up per ball)
        const flake = [0xe8b49a, 0xd9967a, 0xf3d0b8, 0xc98468];
        balls.forEach(([bx, , bz], i) => {
          const xc = Math.round(bx), zc = Math.round(bz);
          for (const [ox, oz] of [[-1, 0], [2, 1]]) {
            const t = topY(v, xc + ox, zc + oz, 12);
            if (t >= 5) v.set(xc + ox, t, zc + oz, 0x4f9a2a);
          }
          const [fx, fz] = [[0, -1], [1, 0], [-1, 1]][i % 3];
          const t = topY(v, xc + fx, zc + fz, 12);
          v.set(xc + fx, t + 1, zc + fz, flake[i % 4]).set(xc + fx, t + 2, zc + fz, flake[(i + 1) % 4]);
          v.set(xc + fx + 1, t + 1, zc + fz, flake[(i + 2) % 4]);
        });
        // beni-shoga on the middle back ball
        const tb = topY(v, 0, -4, 12);
        v.layer(['.R.', 'RrR'], { R: 0xe8364e, r: 0xff5c72 }, { x: -1, y: tb + 1, z: -5, plane: 'xz' });
        // toothpick in the front-right ball
        chopstick(v, 8, 7, 4, 10, 13, 4, 0xf2dcb0);
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
        // bowl with raimon (thunder) band
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
        // noodles in the broth (front half)
        v.shape(-10, 10, -2, 6, 11, 10, (x, y, z) => {
          if (Math.hypot(x, z) > bowlR(10, rF, rT, top) - 2) return false;
          const s = (z + Math.round(Math.sin(x * 0.8) * 1.2) + 40) % 2 === 0;
          if (!s) return false;
          return y === 10 || (Math.hypot(x + 2, z - 3) < 4 && hash(x, y, z, 4) < 0.7);
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
        // ajitama half: cut face up, jammy yolk
        v.shape(2, 11, -8, 8, 12, 0, (x, y, z) => {
          const dx = x - 5, dz = z + 4;
          if (y === 12) return dx * dx / 1.2 + dz * dz / 2.4 <= 1;
          return dx * dx / 6.2 + dz * dz / 11 <= 1;
        }, (x, y, z) => {
          const dx = x - 5, dz = z + 4;
          if (y === 12) return gloss(0xf07a10);
          if (dx * dx / 2 + dz * dz / 4.2 <= 1) return gloss(0xf6a024);
          if (dx * dx / 4.4 + dz * dz / 8 <= 1) return 0xfbf3e2;
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
        for (let i = 0; i < 3; i++) v.box(8 - i, 11, -7 + i, 10 - i, 11, -7 + i, i % 2 ? 0xc89a52 : 0xb88a44);
        // scallions
        for (const [x, z] of [[0, 1], [1, 2], [-1, 3], [2, 0], [0, -1], [1, 4], [-2, 1], [3, 2], [-1, 0]]) {
          v.set(x, topY(v, x, z, 14) + 1, z, hash(x, 0, z, 3) < 0.4 ? 0xd6f0a0 : C.scallion);
        }
        // waribashi lifting a tangle of noodles
        chopstick(v, -1, 20, 1, 13, 25, 4);
        chopstick(v, -1, 20, 3, 13, 25, 6);
        for (const [sx, sz, ph] of [[-1, 2, 0], [0, 2, 1.7], [1, 2, 3.1], [0, 1, 4.4], [0, 3, 2.2]]) {
          let px = null;
          for (let y = 11; y <= 20; y++) {
            const x = sx + Math.round(Math.sin(y * 0.9 + ph) * 0.8);
            if (px !== null && px !== x) v.set(px, y, sz, C.noodle);
            v.set(x, y, sz, (y + sx) % 3 === 0 ? 0xe9c766 : C.noodle);
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
        // lacquer tray (red inside, black rim)
        v.box(-13, 0, -9, 13, 0, 9, gloss(LAQR));
        v.hollowBox(-13, 0, -9, 13, 1, 9, gloss(LAQ), 1, ['top', 'bottom']);
        // seiro box with bamboo mat
        v.hollowBox(-12, 1, -8, -1, 3, 2, gloss(LAQ), 1, ['top']);
        v.box(-11, 1, -7, -2, 2, 1, gloss(LAQ));
        fill(v, -11, 3, -7, -2, 3, 1, (x) => (x % 2 ? 0xd8c27a : 0xc2a862));
        // soba heap: neat wavy strands
        v.shape(-11, 4, -7, -2, 8, 1, (x, y, z) => {
          const dx = (x + 6.5) / 4.8, dy = (y - 3.5) / 3.6, dz = (z + 3) / 4.4;
          return dx * dx + dy * dy + dz * dz <= 1;
        }, (x, y, z) => {
          const s2 = (((x + Math.round(Math.sin(z * 0.7 + y) * 1.2)) % 2) + 2) % 2;
          return s2 ? 0x9e8c72 : hash(x, y, z, 3) < 0.5 ? 0x6e5e4c : 0x7c6a56;
        });
        // shredded nori on top
        for (const [x, z] of [[-7, -3], [-6, -2], [-5, -3], [-8, -2], [-6, -4], [-7, -1], [-5, -1]]) {
          v.set(x, topY(v, x, z, 12) + 1, z, C.nori);
        }
        // tempura plate with kaishi paper
        v.box(1, 1, -8, 12, 1, 1, gloss(0xe6ecef));
        v.paint(() => { v.box(1, 1, -8, 12, 1, -8, gloss(0x4a7ab0)); v.box(1, 1, 1, 12, 1, 1, gloss(0x4a7ab0)); });
        v.shape(2, 2, -7, 11, 2, 0, (x, y, z) => Math.abs((x - 6.5) + (z + 3.5)) <= 6.5 && Math.abs((x - 6.5) - (z + 3.5)) <= 6.5, C.paper);
        // two ebi tempura
        const fry = (x, y, z) => { const n = hash(x, y, z, 17); return n < 0.25 ? 0xfbe08a : n < 0.45 ? 0xe9a83e : C.tempura; };
        for (const z of [-6, -2]) {
          const y = 4;
          v.cylinder(2, y, z, 1.5, 8, fry, 'x');
          v.sphere(3, y, z, 1.6, fry);
          for (let x = 2; x <= 9; x += 2) v.set(x, y + 2, z + ((x / 2) % 2 ? 1 : 0), 0xfbe08a);
          v.box(10, y - 1, z, 10, y + 1, z, gloss(0xe8452a)); // tail
          v.box(11, y - 2, z, 11, y - 1, z, gloss(0xc8301c)).box(11, y + 1, z, 11, y + 2, z, gloss(0xc8301c));
        }
        // shishito & sweet potato
        v.cylinder(3, 2, 0, 0.8, 6, gloss(0x4e9a2e), 'x');
        v.set(9, 2, 0, 0x6a8a3a);
        v.cylinder(9, 2, -3, 1.8, 2, (x, y, z) => (Math.hypot(x - 9, y - 3.5) > 1.3 ? 0x7a2a5a : 0xf4cf52), 'z');
        // soba choko with tsuyu
        v.cylinder(8, 1, 5, 2.4, 4, (x, y, z) => gloss(y === 2 || y === 4 ? 0x2b4f9e : C.ceramic));
        v.cylinder(8, 4, 5, 1.6, 1, gloss(0x3a1a0c));
        // yakumi dish: wasabi + scallions
        v.box(-11, 1, 4, -5, 1, 7, gloss(0xe6dccb));
        v.cone(-9, 2, 5.5, 1.3, 3, 0x8fbf4a);
        v.ellipsoid(-6.5, 2, 5.5, 1.2, 0.8, 1.2, (x, y, z) => (hash(x, y, z, 2) < 0.5 ? 0xd6f0a0 : C.scallion));
        // chopsticks on a little rest
        v.box(-3, 1, 5, -3, 2, 8, gloss(0x3a6fb0));
        chopstick(v, -4, 3, 6, 4, 2, 6, gloss(C.lacquer), gloss(C.gold));
        chopstick(v, -4, 3, 8, 4, 2, 8, gloss(C.lacquer), gloss(C.gold));
      },
    },
    // ------------------------------------------------------------ 6. omurice
    {
      id: 'omurice', name: 'Ketchup-Heart Omurice', jp: 'オムライス', rarity: 'rare',
      desc: 'Comes with a flag. Every adult who orders it secretly wants the flag.',
      build(v) {
        // oval plate with a blue line
        v.shape(-14, 0, -11, 14, 2, 11, (x, y, z) => {
          const e = (x / 13.6) ** 2 + (z / 10.2) ** 2;
          if (y === 0) return (x / 9) ** 2 + (z / 6.5) ** 2 <= 1;
          if (y === 1) return e <= 1;
          return e <= 1 && e > 0.8;
        }, (x, y, z) => {
          const e = (x / 13.6) ** 2 + (z / 10.2) ** 2;
          if (y === 1 && e > 0.6 && e <= 0.72) return gloss(0x3a6fd6);
          return gloss(C.ceramic);
        });
        // omelette (lemon-shaped), smooth gloss
        const ox = -1, oz = -1;
        v.shape(-12, 2, -8, 10, 8, 6, (x, y, z) => {
          const dx = (x - ox) / 9.6, dy = (y - 2) / 6;
          const rz = 6 * (1 - 0.35 * dx * dx);
          const dz = (z - oz) / rz;
          return dx * dx + dy * dy + dz * dz <= 1;
        }, (x, y, z) => {
          if (y === 2) return 0xe9a92a;
          if (y === 3) return gloss(0xf6be34);
          return gloss(hash(x, y, z, 19) < 0.12 ? 0xffd650 : 0xffcc3a);
        });
        // ketchup heart
        const heart = ['.RR...RR.', 'RRRR.RRRR', 'RRRRRRRRR', 'RRRRRRRRR', '.RRRRRRR.', '..RRRRR..', '...RRR...', '....R....'];
        projectView(v, heart, { R: gloss(0xd0242a) }, ox, 5.5, oz + 1, 0.38);
        projectView(v, ['hh', 'h.'], { h: gloss(0xff7a6a) }, ox - 2.5, 8, oz + 1, 0.38);
        // flag on a toothpick
        v.box(ox + 5, 6, oz - 2, ox + 5, 15, oz - 2, 0xf2dcb0);
        v.layer(['WWWWWW', 'WWRRWW', 'WWRRWW', 'WWWWWW'], { W: C.white, R: 0xe5383b }, { x: ox + 6, y: 15, z: oz - 2 });
        // shredded cabbage + parsley
        v.ellipsoid(9, 3, -4, 3, 2.2, 3, (x, y, z) => {
          const n = hash(x, y, z, 23);
          return n < 0.3 ? 0xf2f8e0 : n < 0.65 ? 0xd4eca4 : 0xbfe08a;
        });
        v.box(6, 1, -8, 12, 1, 0, gloss(C.ceramic));
        for (const [x, y, z] of [[9, 6, -4], [8, 5, -3], [10, 5, -5], [9, 5, -2]]) v.sphere(x, y, z, 0.9, x % 2 ? 0x3c9a3a : 0x2f8a30);
        // tomato wedge (cut face to the front)
        v.shape(7, 2, 3, 12, 5, 4, (x, y, z) => {
          const dx = x - 9.5, dy = y - 2;
          return dx * dx + dy * dy * 1.6 <= 8;
        }, (x, y, z) => {
          const dx = x - 9.5, dy = y - 2;
          const r = dx * dx + dy * dy * 1.6;
          if (z === 4 && r <= 3.5) return dy >= 1 ? gloss(0xf8c060) : gloss(0xf06048);
          return gloss(0xd8282a);
        });
        // spoon
        v.ellipsoid(-10, 2, 5, 1.6, 0.5, 1.2, gloss(0xd8dde6));
        v.line(-8, 2, 6, -3, 2, 7, gloss(0xd8dde6));
      },
    },
    // ------------------------------------------------------------ 7. sushi geta
    {
      id: 'sushi', name: 'Sushi Geta Platter', jp: '寿司下駄盛り', rarity: 'ultra',
      desc: 'Chef’s choice. The chef chose “all the good ones”.',
      build(v) {
        // geta board
        fill(v, -13, 3, -6, 13, 4, 6, grain(0xe8c890, 0.86));
        v.box(-11, 0, -6, -9, 2, 6, 0xc49a5e);
        v.box(9, 0, -6, 11, 2, 6, 0xc49a5e);
        const RY = 5;
        const nigiri = (x0, topFn, { z0 = -5, thick = 1 } = {}) => {
          v.shape(x0, RY, z0, x0 + 3, RY + 2, z0 + 6, (x, y, z) => {
            const ex = x === x0 || x === x0 + 3, ez = z === z0 || z === z0 + 6;
            return !(y === RY + 2 && (ex || ez));
          }, riceCol);
          v.shape(x0, RY + 1, z0 - 1, x0 + 3, RY + 2 + thick, z0 + 7, (x, y, z) => {
            if (z === z0 - 1 || z === z0 + 7) return y === RY + 1 || (y === RY + 2 && thick > 1);
            if (z === z0 || z === z0 + 6) return y >= RY + 2 && y <= RY + 1 + thick;
            return y >= RY + 3 && y <= RY + 2 + thick;
          }, topFn);
        };
        // maguro
        nigiri(-12, (x, y, z) => gloss((x + z + 40) % 4 === 0 ? 0xd8485a : 0xbf2238));
        // salmon
        nigiri(-7, (x, y, z) => gloss((x + z + 40) % 3 === 0 ? 0xffd2bc : 0xff8450));
        // ebi with tail fan
        nigiri(-2, (x, y, z) => gloss((z + 40) % 2 ? 0xfff0e6 : 0xff7246));
        v.box(-2, RY + 1, -7, 1, RY + 3, -7, gloss(0xe8402a));
        v.box(-2, RY + 3, -8, -2, RY + 4, -8, gloss(0xb82414)).box(1, RY + 3, -8, 1, RY + 4, -8, gloss(0xb82414));
        v.box(-1, RY + 2, -8, 0, RY + 3, -8, gloss(0xd83420));
        // tamago with nori belt
        nigiri(3, (x, y, z) => (hash(x, y, z, 7) < 0.3 ? 0xf6c236 : 0xffd447), { thick: 2 });
        v.box(3, RY + 5, -2, 6, RY + 5, -2, C.nori);
        v.box(2, RY, -2, 2, RY + 5, -2, C.nori).box(7, RY, -2, 7, RY + 5, -2, C.nori);
        // ikura gunkan (oval nori wall, glistening roe heaped above)
        v.shape(8, RY, -7, 12, RY + 3, 1, (x, y, z) => {
          const e = ((x - 10) / 2.6) ** 2 + ((z + 3) / 3.6) ** 2;
          return e <= 1;
        }, (x, y, z) => {
          const e = ((x - 10) / 2.6) ** 2 + ((z + 3) / 3.6) ** 2;
          if (e > 0.5) return hash(x, y, z, 2) < 0.3 ? 0x2c3a2c : C.nori;
          return y === RY + 3 ? gloss((x + z) % 2 ? 0xff5a14 : 0xe8400c) : C.rice;
        });
        v.shape(8, RY + 4, -7, 12, RY + 5, 1, (x, y, z) => {
          const e = ((x - 10) / 1.9) ** 2 + ((z + 3) / 2.8) ** 2;
          return y === RY + 4 ? e <= 1 : e <= 0.3;
        }, (x, y, z) => gloss(hash(x, y, z, 31) < 0.25 ? 0xffb050 : (x + z + y) % 2 ? 0xff5a14 : 0xe8400c));
        v.box(10, RY + 5, -1, 11, RY + 5, -1, C.lime);
        // soy dish
        v.cylinder(-9, RY, 3, 2.3, 1, gloss(0x2b4f9e));
        v.cylinder(-9, RY, 3, 1.4, 1, gloss(0x3a1a0c));
        // shiso + gari + wasabi
        shiso(v, 8, RY, 3.5, 4.5, 2.2);
        v.shape(8, RY + 1, 2, 12, RY + 3, 5, (x, y, z) => {
          const dx = (x - 10) / 2.2, dy = (y - RY - 1) / 2.3, dz = (z - 3.5) / 2;
          return dx * dx + dy * dy + dz * dz <= 1;
        }, (x, y, z) => ((y + x) % 2 ? 0xf6c4c0 : 0xf0a8ae));
        v.box(5, RY + 1, 3, 6, RY + 1, 4, (0x8fbf4a));
        v.set(5, RY + 2, 3, 0x9fcf5a).set(6, RY + 2, 4, 0x82b444).set(5, RY + 2, 4, 0x8fbf4a);
        v.set(5, RY + 3, 4, 0x9fcf5a);
      },
    },
    // ------------------------------------------------------------ 8. neko yatai (secret)
    {
      id: 'yatai', name: 'Neko Yatai', jp: 'ねこ屋台', rarity: 'secret',
      desc: 'Opens at midnight. Accepts payment in dried sardines only.',
      build(v) {
        const WOOD = 0x9a6239, WOODL = 0xc08a54, WOODD = 0x5e3a22;
        const boards = (x, y, z) => ((x + 40) % 3 === 0 ? WOODD : hash(x, y, z, 4) < 0.2 ? WOODL : WOOD);
        // cart body
        fill(v, -10, 3, -5, 10, 11, 5, boards);
        v.paint(() => {
          v.box(-10, 10, 5, 10, 10, 5, 0x7a2a1e);
          v.box(-10, 3, 5, 10, 3, 5, WOODD);
        });
        // menu slips on the front
        for (const x of [-8, -5, 4, 7]) {
          v.layer(['PP', 'KP', 'PP', 'KP', 'PP'], { P: C.paper, K: 0x6a5a50 }, { x, y: 9, z: 6 });
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
          v.set(x > 0 ? 11 : -11, 5, 0, metal(C.steel));
        }
        // corner posts & gabled roof
        for (const x of [-10, 10]) for (const z of [-5, 6]) v.box(x, 13, z, x, 27, z, WOODD);
        v.shape(-12, 27, -8, 12, 30, 9, (x, y, z) => {
          const ry = Math.round(30 - Math.abs(z - 0.5) / 3.2);
          return y === ry || y === ry - 1;
        }, (x, y, z) => ((x + 40) % 3 === 0 ? 0x4a2c18 : 0x6a4028));
        // noren curtain, with white crests on the middle panels
        const glyphs = [['WW.', '...', 'W..', 'WWW'], ['...', 'WWW', '...', '...'], ['W.W', 'WWW', 'W.W', '.W.'], ['.W.', '.W.', 'W.W', 'W.W']];
        [-9, -4, 1, 6].forEach((x0, i) => {
          fill(v, x0, 23, 7, x0 + 3, 27, 7, (x, y) => (y === 27 ? 0x1c2a52 : C.navy));
          v.project(glyphs[i], { W }, x0 + 1, 26, '+z');
        });
        // red lantern with a glowing "ら"
        v.box(12, 26, 8, 12, 27, 8, K);
        v.ellipsoid(12, 20, 8, 2.6, 3.6, 2.6, (x, y, z) => glow(y % 2 ? 0xff5a3a : 0xee4630));
        v.box(11, 16, 7, 13, 16, 9, C.lacquerBlack);
        v.box(11, 24, 7, 13, 25, 9, C.lacquerBlack);
        v.project(['KK.', '...', 'K..', 'KKK', '..K', 'KK.'], { K: glow(0x4a0c08) }, 11, 23, '+z');
        // kitchen: stock pot + stacked bowls
        v.cylinder(-6, 13, -2, 3, 5, metal(C.steel));
        v.cylinder(-6, 18, -2, 3, 1, metal(C.chrome));
        v.set(-6, 19, -2, K);
        for (let i = 0; i < 3; i++) v.cylinder(6, 13 + i, -3, 2, 1, gloss(i === 2 ? 0xd8322e : C.ceramic));
        // customer bowl on the counter, chopsticks resting across
        v.cylinder(-5, 13, 6, 2, 2, gloss(C.ceramic));
        v.paint(() => v.cylinder(-5, 14, 6, 2, 1, gloss(0xd8322e)));
        v.cylinder(-5, 14, 6, 1.2, 1, gloss(0xb06a26));
        v.box(-6, 15, 6, -3, 15, 6, C.woodLight);
        // cat chef: navy samue, white fur, calico patch, hachimaki
        v.ellipsoid(0, 14, -1, 3.8, 2.8, 3, C.navy);
        v.paint(() => { v.box(-1, 13, 0, 1, 16, 2, W); v.box(0, 13, 0, 0, 14, 2, C.navy); });
        v.ellipsoid(0, 19.5, -1, 4.6, 3.8, 3.6, W);
        v.paint(() => v.ellipsoid(-3.5, 22, -2, 2.2, 2, 3, C.orange));
        for (const x of [-3, 3]) { // ears
          v.box(x - 1, 23, -2, x + 1, 23, -1, x < 0 ? C.orange : W);
          v.box(x, 24, -2, x, 24, -1, x < 0 ? C.orange : W);
          v.set(x, 23, 0, C.pink);
        }
        v.paint(() => v.box(-6, 22, -6, 6, 22, 3, C.white)); // hachimaki
        v.paint(() => { for (let x = -6; x <= 6; x += 2) v.box(x, 22, -6, x, 22, 3, 0xe5383b); });
        v.set(0, 22, -5, C.white).set(1, 22, -5, 0xe5383b).set(1, 21, -5, C.white).set(1, 21, -6, 0xe5383b).set(2, 20, -6, C.white); // knot
        v.project(['KW...KW', 'KK...KK', '...N...', '..M.M..', 'PP.M.PP'], { K, W, N: C.pink, M: K, P: C.blush }, -3, 21, '+z');
        v.project(['WW.......WW'], { W: C.lightgray }, -5, 18, '+z');
        // paws + ladle
        v.sphere(-3, 14, 2, 1, W);
        v.sphere(4, 15, 2, 1, W);
        v.line(4, 15, 3, 4, 21, 3, metal(C.chrome));
        v.cylinder(4, 13, 4, 1, 2, metal(C.steel));
        // plastic crate stools
        for (const [x, col] of [[-6, 0xf2c230], [5, 0x3f86e8]]) {
          v.hollowBox(x - 2, 0, 10, x + 1, 3, 13, gloss(col), 1, ['bottom']);
          for (const z of [10, 13]) v.box(x - 1, 1, z, x, 2, z, null);
          for (const xx of [x - 2, x + 1]) v.box(xx, 1, 11, xx, 2, 12, null);
          v.box(x - 2, 4, 10, x + 1, 4, 13, x < 0 ? 0x8a3a7a : 0xd8582e); // zabuton cushion
          v.box(x - 1, 5, 11, x, 5, 12, x < 0 ? 0xa04a90 : 0xe86a3e);
        }
        // everything on a little cobbled street
        v.translate(0, 1, 0);
        fill(v, -13, 0, -8, 13, 0, 14, (x, y, z) => {
          const off = Math.floor((z + 40) / 3) % 2 ? 2 : 0;
          if ((z + 40) % 3 === 0 || (x + off + 40) % 4 === 0) return 0x6e6a64;
          return hash(x, 0, z, 41) < 0.3 ? 0x9a948c : 0x8a857e;
        });
      },
    },
  ],
};
