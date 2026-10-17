// Street props — what you see outside the half-open garage shutter at golden-hour dusk.
// Each entry: { name, voxel (metres per voxel), build(v) }. Facing +z, bottom-centre origin.
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, glow, glass, enc, MAT } from '../../voxel/VoxelModel.js';
import { hash, vnoise, sh, fill, tint, grime, dust, speckle, blotch, rod, path, text, textRows } from './garage.js';

/** Weathered concrete colour function. */
const concrete = (base = 0xa9a59d, s = 1) => (x, y, z) =>
  shade(mix(base, 0x7e7a72, vnoise(x, y * 0.6, z, 3, s) * 0.5), 0.94 + hash(x, y, z, s) * 0.07 - (hash(x, y, z, s + 1) < 0.05 ? 0.1 : 0));

/** Dusk sky reflection for glass that is not lit from inside. */
const duskGlass = (x, y) => {
  const t = Math.max(0, Math.min(1, (y % 23) / 22));
  const streak = Math.abs(((x + y * 0.8) % 11) - 5) < 1;
  return gloss(streak ? 0x9a7a70 : mix(0x2a3450, 0x6a5a68, t));
};

const street = {
  // ------------------------------------------------------------- utility pole
  utility_pole: {
    name: 'Utility Pole', voxel: 0.08,
    build(v) {
      const conc = (x, y, z) => shade(mix(0xb6b2aa, 0x86827c, vnoise(x, y * 0.35, z, 3, 1) * 0.55), 0.95 + hash(x, y, z, 1) * 0.05);
      for (let y = 0; y < 100; y++) v.cylinder(0, y, 0, 2.3 - y * 0.007, 1, conc);
      v.cylinder(0, 100, 0, 1.4, 1, 0x5a5652);
      v.cylinder(0, 0, 0, 3.3, 1, concrete(0x9a968e, 3));
      // tiger-striped guard sleeve
      v.paint(() => v.shape(-3, 1, -3, 3, 23, 3, () => true, (x, y, z) => (Math.floor((y + x * 0.8 + z * 0.8 + 20) / 2) % 2 ? gloss(0xf5c518) : gloss(0x242224))));
      // wrap-around advert band
      v.paint(() => v.shape(-3, 27, -3, 3, 37, 3, () => true, (x, y, z) => {
        if (y === 27 || y === 37) return gloss(0xf4f0e6);
        if (y === 28) return gloss(0xe5383b);
        return z > 0 && (y % 2 === 0) && Math.abs(x) <= 1 ? gloss(0xffffff) : gloss(0x2a52a8);
      }));
      v.box(-1, 41, 3, 1, 42, 3, gloss(0xf4f0e6)); v.box(-1, 41, 3, -1, 42, 3, gloss(0x3a8a4a));
      // step bolts
      for (let y = 46, s = 1; y <= 84; y += 4, s = -s) { v.set(s * 3, y, 0, gloss(0x8a8a88)); v.set(s * 3, y - 1, 0, gloss(0x6a6a68)); }
      // crossarms + braces + insulators
      const steel = (x, y, z) => gloss(shade(0x9aa0a4, 0.9 + vnoise(x, y, z, 2, 4) * 0.15));
      fill(v, -11, 92, 0, 11, 92, 0, steel);
      fill(v, -9, 85, 0, 9, 85, 0, steel);
      for (const s of [-1, 1]) { v.line(s * 2, 89, 0, s * 7, 92, 0, steel); v.line(s * 2, 82, 0, s * 6, 85, 0, steel); }
      for (const x of [-10, -5, 5, 10]) { v.set(x, 93, 0, gloss(0xf2efe6)); v.set(x, 94, 0, gloss(0xe4e0d6)); v.set(x, 95, 0, gloss(0x8a8a88)); }
      for (const x of [-8, 8]) { v.set(x, 86, 0, gloss(0xf2efe6)); v.set(x, 87, 0, gloss(0x8a8a88)); }
      for (const x of [-10, -5, 5, 10]) for (const s of [-1, 1]) { v.set(x, 95, s, 0x2a2a2a); v.set(x, 95, 2 * s, 0x2a2a2a); v.set(x, 94, 3 * s, 0x2a2a2a); }
      // pole-mounted transformers
      const tr = (x, y0, h, r) => {
        v.cylinder(x, y0, 0, r, h, (xx, yy, zz) => gloss(shade(0xaab2ac, (Math.round(Math.atan2(zz, xx - x) * 4) % 2 ? 0.92 : 1) * (0.95 + hash(xx, yy, zz, 5) * 0.06))));
        v.cylinder(x, y0 + h, 0, r - 0.4, 1, gloss(0x8a928c));
        v.set(x, y0 + h + 1, 0, gloss(0xf2efe6)); v.set(x - 1, y0 + h + 1, 1, gloss(0xf2efe6));
        for (const yy of [y0 + 2, y0 + h - 2]) v.box(Math.sign(x) * 2, yy, -1, x, yy, 1, 0x3a3a3a);
        v.project(['WW', 'KW'], { W: 0xf4f0e6, K: 0x2a2a2a }, x - 1, y0 + h - 3, '+z');
      };
      tr(5, 66, 9, 2.4); tr(-5, 69, 6, 1.9);
      v.line(8, 86, 0, 5, 76, 0, 0x2a2a2a); v.line(-8, 86, 0, -5, 76, 0, 0x2a2a2a);
      path(v, [[2, 63, 1], [6, 61, 1], [10, 60, 2], [13, 60, 2]], 0x1e1e1e);
      path(v, [[-2, 60, 1], [-6, 58, 1], [-10, 57, 2], [-13, 57, 2]], 0x1e1e1e);
      for (let y = 50; y <= 56; y++) v.set(2, y, 2, 0x1e1e1e);
      // stains, moss, flyer scraps
      tint(v, -3, 0, -3, 3, 100, 3, (x, y, z, c, m) => (m === 0 && vnoise(x * 3, 0, z * 3, 2, 8) > 0.7 ? shade(c, 0.85) : undefined));
      blotch(v, -4, 0, -4, 4, 6, 4, 0x5a6a3a, 0.7, 2, 9);
      v.project(['WW', 'W.'], { W: 0xe8e4d4 }, 0, 26, '+z');
      grime(v, 0, 3, 0.8);
    },
  },

  // ------------------------------------------------------------- street light
  street_light: {
    name: 'Street Light', voxel: 0.045,
    build(v) {
      const pnt = (x, y, z) => gloss(shade(0x9aa6a2, 0.93 + hash(x, y, z, 1) * 0.06));
      fill(v, -7, 0, -2, -1, 1, 2, concrete(0xa09c94, 2));
      for (let y = 2; y <= 84; y++) v.cylinder(-4, y, 0, y < 12 ? 1.4 : 1.0, 1, pnt);
      for (let k = 0; k <= 12; k++) {
        const th = (Math.PI / 2) * (k / 12);
        v.box(Math.round(2 - 6 * Math.cos(th)), Math.round(84 + 6 * Math.sin(th)), 0, Math.round(2 - 6 * Math.cos(th)), Math.round(84 + 6 * Math.sin(th)), 0, pnt);
      }
      v.box(2, 90, 0, 4, 90, 0, pnt);
      fill(v, 2, 89, -2, 8, 90, 2, (x, y, z) => gloss(shade(0x8a948f, y === 90 ? 1.05 : 0.95)));
      v.box(3, 91, -1, 7, 91, 1, gloss(0x7a8480));
      v.box(3, 88, -1, 7, 88, 1, glow(0xfff2d0));
      v.box(4, 88, -2, 6, 88, 2, glow(0xfff6e0));
      v.set(5, 87, 0, glow(0xffffff));
      // details: access hatch, number plate, sticker, rust
      v.project(['KKK', 'K.K', 'K.K', 'KKK'], { K: 0x5a6460 }, -5, 10, '+z');
      v.project(['W', 'G'], { W: 0xf4f0e6, G: 0x3a8a4a }, -4, 32, '+z');
      v.project(['Y'], { Y: 0xffd23f }, -4, 22, '+z');
      blotch(v, -6, 0, -2, -2, 12, 2, gloss(0x8a4a2a), 0.78, 2, 3);
      grime(v, 0, 6, 0.75);
    },
  },

  // ------------------------------------------------------------- post box
  post_box: {
    name: 'Red Post Box', voxel: 0.014,
    build(v) {
      const red = (x, y, z) => gloss(shade(0xd42a21, 0.9 + vnoise(x, y, z, 4, 1) * 0.08 + hash(x, y, z, 2) * 0.03));
      fill(v, -14, 0, -13, 14, 3, 13, concrete(0xa8a49c, 4));
      v.box(-14, 3, -13, 14, 3, -13, null); v.box(-14, 3, 13, 14, 3, 13, null);
      v.box(-14, 3, -13, -14, 3, 13, null); v.box(14, 3, -13, 14, 3, 13, null);
      v.cylinder(0, 4, 0, 13, 4, red);
      v.cylinder(0, 8, 0, 12.4, 62, red);
      v.cylinder(0, 66, 0, 13, 3, red);
      v.shape(-16, 69, -16, 16, 92, 16, (x, y, z) => {
        const r = Math.hypot(x, z);
        if (y === 69) return r <= 14;
        if (y <= 72) return r <= 15.2;
        if (y <= 89) return r <= 14.6 * Math.sqrt(Math.max(0, 1 - ((y - 72) / 18.5) ** 2));
        if (y === 90) return r <= 3.2;
        return r <= 1.6;
      }, red);
      tint(v, -16, 72, -16, 16, 72, 16, (x, y, z, c, m) => enc(shade(c, 0.78), m));
      // slot with hood
      v.box(-6, 61, 8, 6, 62, 13, null);
      v.box(-6, 61, 7, 6, 62, 7, 0x140e0e);
      v.box(-7, 63, 12, 7, 63, 13, red);
      v.project(['.WWW.', 'W...W'], { W: 0xe8d8c8 }, -2, 60, '+z');
      text(v, 'POST', -7, 58, 0xfbf8f0);
      v.paint(() => v.shape(-5, 38, 8, 5, 51, 13, (x, y, z) => z >= 9, (x, y) => (y === 50 ? 0xd42a21 : (y % 2 === 0 && Math.abs(x) <= 3 ? 0x6a6662 : 0xf6f2ea))));
      // collection door outline + keyhole
      v.paint(() => v.shape(-8, 14, 6, 8, 34, 13, (x, y, z) => z >= 8 && (y === 14 || y === 34 || Math.abs(x) === 8), gloss(0x8a1a16)));
      v.project(['Y', 'K'], { Y: gloss(0xe8b84a), K: C.ink }, 5, 25, '+z');
      text(v, '〒', -3, 85, 0xfbf8f0);
      // weathering: chipped paint, rust, rain streak under the slot, a pigeon's calling card
      speckle(v, -16, 4, -16, 16, 92, 16, gloss(0xe8d8c8), 0.012, 5);
      blotch(v, -14, 4, -14, 14, 14, 14, gloss(0x7a2a1a), 0.74, 2, 6);
      tint(v, -3, 40, 8, 3, 60, 13, (x, y, z, c, m) => (Math.abs(x) <= 1 && vnoise(x, y, z, 2, 7) > 0.45 ? enc(shade(c, 0.82), m) : undefined));
      speckle(v, -14, 84, -14, 14, 92, 14, 0xf4f2ea, 0.03, 8);
      grime(v, 0, 8, 0.75);
    },
  },

  // ------------------------------------------------------------- block wall
  block_wall: {
    name: 'Concrete Block Wall', voxel: 0.03,
    build(v) {
      const W0 = -50, W1 = 49;
      fill(v, W0, 0, -3, W1, 2, 3, concrete(0x8e8a82, 2));
      const OPEN = ['#############', '##..#####..##', '#.##.###.##.#', '#.##.###.##.#', '##..#####..##', '#############'];
      v.shape(W0, 3, -2, W1, 44, 2, (x, y, z) => {
        const c = Math.floor((y - 3) / 7), y0 = 3 + c * 7, off = (c % 2) * 7;
        const bx = (x - W0 + off + 140) % 14;
        const joint = y === y0 + 6 || bx === 13;
        if (joint && Math.abs(z) === 2) return false;
        const bi = Math.floor((x - W0 + off) / 14);
        if (!joint && c === 4 && bi % 2 === 1 && bi > 0 && bi < 7) return OPEN[y0 + 5 - y][bx] === '#';
        return true;
      }, (x, y, z) => {
        const c = Math.floor((y - 3) / 7), y0 = 3 + c * 7, off = (c % 2) * 7;
        const bx = (x - W0 + off + 140) % 14;
        if (y === y0 + 6 || bx === 13) return shade(0x8c887e, 0.95 + hash(x, y, z, 3) * 0.08);
        const bi = Math.floor((x - W0 + off) / 14) * 7 + c;
        const base = shade(0xaaa69c, 0.94 + hash(bi, c, 0, 4) * 0.1);
        return shade(base, 0.95 + hash(x, y, z, 5) * 0.06 - (hash(x, y, z, 6) < 0.06 ? 0.1 : 0));
      });
      fill(v, W0, 45, -3, W1, 47, 3, concrete(0xb8b4ac, 7));
      fill(v, W0, 48, -2, W1, 48, 2, concrete(0xbcb8b0, 8));
      // rain streaks under the coping
      tint(v, W0, 3, -3, W1, 47, 3, (x, y, z, c, m) => {
        const s = vnoise(x, 0, z, 2.5, 9);
        return s > 0.6 && y > 47 - (s - 0.6) * 90 ? shade(c, 0.82) : undefined;
      });
      // moss at the foot and in joints
      blotch(v, W0, 0, -3, W1, 9, 3, 0x6a7a3a, 0.62, 3, 10);
      tint(v, W0, 3, -3, W1, 20, 3, (x, y, z, c) => ((y - 3) % 7 === 6 && hash(x, y, z, 11) < 0.35 ? 0x5a6a34 : undefined));
      speckle(v, W0, 3, -3, W1, 44, 3, 0xe4e2da, 0.015, 12);
      // a crack
      path(v, [[18, 44, 3], [20, 40, 3], [19, 36, 3], [22, 31, 3], [21, 27, 3]], 0x4a4842);
      v.recolor((x, y, z, c, m) => (x >= 18 && x <= 22 && y >= 27 && y <= 44 && z === 3 ? enc(0x4a4842, m) : undefined));
      for (let y = 27; y <= 44; y++) for (let x = 18; x <= 22; x++) if (v.has(x, y, 3)) { v.remove(x, y, 3); v.paint(() => v.set(x, y, 2, 0x4a4842)); }
      // ivy climbing the left end
      let px = W0 + 4;
      for (let y = 1; y <= 46; y++) {
        px += Math.round((vnoise(0, y, 0, 4, 13) - 0.5) * 2.2);
        px = Math.max(W0 + 1, Math.min(W0 + 16, px));
        v.set(px, y, 3, 0x5a4a2a);
        const n = 2 + Math.floor(hash(px, y, 0, 14) * 3);
        for (let k = 0; k < n; k++) {
          const lx = px + Math.round((hash(y, k, 1, 15) - 0.5) * 7), ly = y + Math.round((hash(y, k, 2, 15) - 0.5) * 3);
          if (ly < 1 || ly > 47) continue;
          const lc = hash(lx, ly, 3, 16) < 0.5 ? gloss(0x3f7a32) : gloss(0x5a9a3a);
          v.set(lx, ly, 3, lc);
          if (hash(lx, ly, 4, 17) < 0.5) v.set(lx + 1, ly, 3, lc);
          if (hash(lx, ly, 5, 17) < 0.4) v.set(lx, ly + 1, 4, sh(lc, 1.1));
        }
      }
      grime(v, 0, 6, 0.8);
    },
  },

  // ------------------------------------------------------------- hedge
  hedge: {
    name: 'Trimmed Hedge', voxel: 0.025,
    build(v) {
      fill(v, -40, 0, -12, 39, 3, 11, concrete(0xa8a49c, 1));
      fill(v, -39, 3, -11, 38, 3, 10, (x, y, z) => shade(0x5a4030, 0.9 + hash(x, y, z, 2) * 0.15));
      v.shape(-40, 4, -12, 39, 40, 11, (x, y, z) => {
        const n = vnoise(x, y, z, 2.6, 2) * 2.4 - 1.2;
        const fx = Math.abs(x + 0.5) / (39.5 + n * 0.6), fz = Math.abs(z + 0.5) / (11.5 + n * 0.7);
        if (fx > 1 || fz > 1) return false;
        const top = 38.5 + n * 0.8 - Math.max(0, fz - 0.7) * 14 - Math.max(0, fx - 0.96) * 60;
        if (y > top) return false;
        if (y < 10) {
          const inset = (10 - y) * 0.6;
          if (Math.abs(z + 0.5) > 11 - inset || Math.abs(x + 0.5) > 39 - inset * 0.5) return false;
        }
        return true;
      }, (x, y, z) => {
        const n = vnoise(x, y, z, 2.2, 5), h = hash(x, y, z, 6);
        let c = n < 0.4 ? 0x2f5a2a : n < 0.65 ? 0x3f7a32 : 0x5a9a3a;
        if (y > 34 && h < 0.35) c = 0x86b84a;
        if (y < 12) c = shade(c, 0.7 + (y - 4) * 0.035);
        return shade(c, 0.92 + h * 0.12);
      });
      for (let x = -36; x <= 36; x += 5) v.line(x, 4, 0, x + 1, 9, (x % 3), 0x4a3424);
      // blossoms on the outer leaves (tsutsuji)
      const FL = [0xff6fae, 0xfbe8f0, 0xe85aa8];
      v.recolor((x, y, z, c, m) => {
        if (y < 12 || y > 40) return undefined;
        const out = !v.has(x, y + 1, z) || !v.has(x, y, z + 1) || !v.has(x, y, z - 1);
        if (!out) return undefined;
        const f = vnoise(x, y, z, 2.5, 21) * 0.8 + vnoise(x, y, z, 9, 24) * 0.5 + hash(x, y, z, 22) * 0.12;
        if (f < 0.93) return undefined;
        const fc = FL[Math.floor(vnoise(x, y, z, 12, 23) * 2.2 + 0.5) % 3 === 1 ? 1 : (x > 0 ? 0 : 2)];
        return enc(hash(x, y, z, 25) < 0.2 ? shade(fc, 0.8) : fc, MAT.GLOSS);
      });
    },
  },

  // ------------------------------------------------------------- stop sign (id kept as requested)
  bicycle_parking: {
    name: 'Stop Sign (止まれ)', voxel: 0.02,
    build(v) {
      const galv = (x, y, z) => gloss(shade(0xa8aeb2, 0.88 + vnoise(x, y, z, 3, 1) * 0.16));
      v.cylinder(0, 0, 0, 2.6, 2, concrete(0x9a968e, 3));
      v.cylinder(0, 2, 0, 1.1, 124, galv);
      v.cylinder(0, 126, 0, 1.3, 1, gloss(0x6a7074));
      const T = 124, H = 32, HW = 19.5;
      const inside = (x, y) => { const r = T - y; if (r < 0 || r >= H) return -1; const hw = HW * (1 - (r + 0.5) / H); return Math.min(r + 0.5, (hw - Math.abs(x)) * 0.866); };
      v.shape(-20, T - H, 1, 20, T, 2, (x, y, z) => {
        const d = inside(x, y);
        if (d < 0) return false;
        const r = T - y;
        if (r < 1 && Math.abs(x) > 17) return false;
        if (r > H - 4 && Math.abs(x) > 0 && r > H - 2) return false;
        return true;
      }, (x, y, z) => {
        if (z === 1) return gloss(shade(0x9aa0a4, 0.9 + hash(x, y, z, 2) * 0.1));
        return inside(x, y) < 1.7 ? gloss(0xf8f6f0) : gloss(shade(0xd8241f, 0.95 + hash(x, y, z, 3) * 0.05));
      });
      text(v, '止まれ', -11, T - 2, gloss(0xfbf8f0));
      for (const y of [T - 6, T - 20]) v.box(-2, y, -2, 2, y + 1, 0, gloss(0x8a9094));
      v.project(['Y', 'K'], { Y: 0xffd23f, K: 0x2a2a2a }, 0, 40, '+z');
      v.project(['WW'], { W: 0xe8e4d4 }, -1, 55, '+z');
      blotch(v, -20, T - H, 1, 20, T, 1, gloss(0x8a5a3a), 0.78, 2, 4);
      blotch(v, -2, 0, -2, 2, 20, 2, gloss(0x8a6a4a), 0.72, 2, 5);
      grime(v, 0, 6, 0.8);
    },
  },

  // ------------------------------------------------------------- potted plants
  potted_row: {
    name: 'Potted Plants & Morning Glories', voxel: 0.015,
    build(v) {
      const wd = (x, y, z) => shade(mix(0x8a7258, 0x9a948a, vnoise(x, y, z * 3, 4, 2) * 0.6), 0.92 + hash(x, y, z, 3) * 0.08);
      const tiers = [[6, 13, 8], [-3, 5, 17], [-13, -4, 26]];
      for (const [z0, z1, ty] of tiers) {
        v.shape(-38, ty - 1, z0, 37, ty, z1, (x, y, z) => (z - z0) % 4 !== 3, wd);
        for (const x of [-37, -12, 12, 36]) fill(v, x, 0, z0, x, ty - 2, z0 + 1, wd);
      }
      for (const x of [-38, 37]) v.shape(x, 0, -13, x, 26, 13, (xx, y, z) => {
        const ty = z >= 6 ? 8 : z >= -3 ? 17 : 26;
        return y <= ty && (y >= ty - 2 || z === 13 || z === 5 || z === -4 || z === -13);
      }, wd);
      // pot helper
      const pot = (cx, y0, cz, r, h, col, soil = 0x4a3020) => {
        for (let i = 0; i < h; i++) v.cylinder(cx, y0 + i, cz, r - (h - 1 - i) * 0.12, 1, typeof col === 'function' ? col : (x, y, z) => sh(col, (y === y0 + h - 1 ? 1.08 : 0.95) + hash(x, y, z, 7) * 0.06));
        v.cylinder(cx, y0 + h - 1, cz, r - 0.9, 1, (x, y, z) => shade(soil, 0.9 + hash(x, y, z, 8) * 0.2));
        return y0 + h;
      };
      const terra = 0xc8683a;
      // --- front tier (top y 8)
      let t = pot(-30, 9, 9, 4.5, 6, terra);
      for (let k = 0; k < 7; k++) { const a = k * 0.9; v.ellipsoid(-30 + Math.cos(a) * 3, t + 1 + (k % 2), 9 + Math.sin(a) * 3, 2.2, 1.2, 2.2, gloss(k % 2 ? 0x4a8a3a : 0x5a9a42)); }
      for (const [fx, fz] of [[-31, 8], [-28, 11], [-32, 11]]) { v.line(fx, t, fz, fx, t + 5, fz, 0x5a8a3a); v.sphere(fx, t + 6, fz, 1.5, gloss(0xe5383b)); v.set(fx, t + 7, fz, gloss(0xff6a5a)); }
      t = pot(-17, 9, 9, 3.5, 5, gloss(0x3a6ab0));
      for (let i = 0; i < 9; i++) v.cylinder(-17, t + i, 9, 1.8, 1, (x, y, z) => ((x + y + z) % 3 === 0 ? 0xf4f2e8 : gloss(0x4a9a52)));
      v.cylinder(-15, t + 3, 9, 0.9, 3, gloss(0x4a9a52), 'x'); v.box(-13, t + 3, 9, -13, t + 5, 9, gloss(0x4a9a52));
      v.set(-17, t + 9, 9, gloss(0xff8fb2)); v.set(-17, t + 10, 9, gloss(0xffc2d4));
      t = pot(-6, 9, 9, 3.2, 4, terra);
      for (let ring = 0; ring < 3; ring++) for (let k = 0; k < 6 + ring * 2; k++) {
        const a = k / (6 + ring * 2) * Math.PI * 2 + ring;
        v.set(Math.round(-6 + Math.cos(a) * (ring + 0.8)), t + (2 - ring) * 0.5 | 0, Math.round(9 + Math.sin(a) * (ring + 0.8)), gloss(mix(0x9ac8b0, 0x6aa890, ring / 2)));
      }
      v.set(-6, t + 1, 9, gloss(0xc8e8d0));
      t = pot(6, 9, 9, 4, 5, terra);
      v.ellipsoid(6, t + 3, 9, 3.5, 3, 3, gloss(0x3f7a32)); v.ellipsoid(5, t + 5, 8, 2.5, 2, 2.5, gloss(0x5a9a42));
      t = pot(20, 9, 9, 5, 6, (x, y, z) => gloss(shade(0xf4f0e6, 0.96 + hash(x, y, z, 4) * 0.04)));
      for (let k = 0; k < 9; k++) { const a = k * 0.7; v.line(20, t, 9, 20 + Math.cos(a) * 5, t + 4 + (k % 3), 9 + Math.sin(a) * 4, gloss(k % 2 ? 0x3f8a3a : 0x5aa84a)); }
      t = pot(31, 9, 10, 3, 4, terra);
      // --- middle tier (top y 17): marigold planter + bonsai
      fill(v, -34, 18, -2, -14, 23, 4, (x, y, z) => gloss(shade(0x4a8a4a, 0.95 + hash(x, y, z, 9) * 0.05)));
      fill(v, -33, 23, -1, -15, 23, 3, () => 0x4a3020);
      for (let x = -32; x <= -16; x += 3) { const c = (x / 3) % 2 ? 0xff8c1a : 0xffc21a; v.line(x, 23, 1, x, 26, 1, 0x4a8a3a); v.sphere(x, 27, 1, 1.4, gloss(c)); v.ellipsoid(x + 1, 24, 2, 1.5, 0.8, 1, gloss(0x3f7a32)); }
      fill(v, -6, 18, -2, 8, 20, 4, gloss(0x2f5a8a));
      fill(v, -5, 20, -1, 7, 20, 3, () => 0x6a5a4a);
      path(v, [[0, 21, 1], [-1, 24, 1], [1, 27, 0], [3, 29, 1], [2, 31, 0]], 0x6a4a2a, 0.6);
      for (const [px, py, pz, r] of [[-3, 26, 1, 3], [5, 29, 1, 3.5], [1, 33, 0, 2.6]]) { v.ellipsoid(px, py, pz, r, 1.3, 2.4, gloss(0x2f5a32)); v.ellipsoid(px, py + 1, pz, r - 1, 0.8, 1.6, gloss(0x4a7a3a)); }
      t = pot(20, 18, 1, 4, 5, terra);
      for (let k = 0; k < 5; k++) { const a = k * 1.25; v.ellipsoid(20 + Math.cos(a) * 2.5, t + 1, 1 + Math.sin(a) * 2.5, 1.8, 1, 1.8, gloss(0x5a9a42)); v.set(Math.round(20 + Math.cos(a) * 2), t + 2, Math.round(1 + Math.sin(a) * 2), gloss(k % 2 ? 0x8a5bd6 : 0xffd23f)); }
      t = pot(31, 18, 1, 3.4, 5, gloss(0xe8e0d0));
      v.cylinder(31, t, 1, 1.6, 6, gloss(0x4a8a4a)); v.cylinder(29, t + 2, 1, 0.8, 3, gloss(0x4a8a4a)); v.set(31, t + 6, 1, gloss(0xff8fb2));
      // --- back tier (top y 26): two morning glories on ring supports
      const asagao = (cx, cz, flowers) => {
        const t0 = pot(cx, 27, cz, 5, 7, (x, y, z) => (y >= 31 && y <= 32 ? gloss(0x3a8a4a) : gloss(shade(0xf4f2ec, 0.97 + hash(x, y, z, 5) * 0.03))));
        for (const [sx, sz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) v.line(cx + sx, t0, cz + sz, cx + sx * 0.8, 66, cz + sz * 0.8, gloss(0x4a9a5a));
        v.torus(cx, 48, cz, 4.2, 0.5, gloss(0x4a9a5a), 'y'); v.torus(cx, 62, cz, 3.6, 0.5, gloss(0x4a9a5a), 'y');
        for (let i = 0; i < 70; i++) {
          const y = t0 + i * 0.5, a = i * 0.32 + cx;
          const x = cx + Math.cos(a) * 4, z = cz + Math.sin(a) * 4;
          v.set(Math.round(x), Math.round(y), Math.round(z), 0x5a8a3a);
          if (i % 4 === 0) {
            const lx = Math.round(cx + Math.cos(a) * 5.5), lz = Math.round(cz + Math.sin(a) * 5.5), ly = Math.round(y);
            v.layer(['GG.GG', 'GGGGG', '.GGG.', '..G..'], { G: gloss(hash(lx, ly, lz, 6) < 0.5 ? 0x3f8a3a : 0x5aa84a) }, { x: lx - 2, y: ly + 1, z: lz, plane: Math.abs(Math.cos(a)) > 0.7 ? 'zy' : 'xy' });
          }
        }
        flowers.forEach(([fy, a, col]) => {
          const fx = Math.round(cx + Math.cos(a) * 5.5), fz = Math.round(cz + Math.sin(a) * 5.5) + 1;
          v.layer(['.CCC.', 'CCWCC', 'CWWWC', 'CCWCC', '.CCC.'], { C: gloss(col), W: gloss(0xfbf8f0) }, { x: fx - 2, y: fy + 2, z: fz + 1 });
          v.set(fx, fy, fz, gloss(shade(col, 0.7)));
        });
      };
      asagao(-22, -8, [[52, 1.4, 0x4a5ae0], [41, 0.9, 0x8a4ad8], [58, 2.0, 0x3a4ab8], [46, 2.4, 0x6a6af0]]);
      asagao(12, -8, [[55, 1.2, 0xe868a8], [44, 1.8, 0xd04a98], [61, 0.7, 0x9a5ad8], [50, 2.6, 0xf088c0]]);
      // little watering can on the back tier
      fill(v, 28, 27, -10, 33, 31, -6, gloss(0x3a7ae0)); v.line(33, 28, -8, 36, 32, -8, gloss(0x3a7ae0)); v.box(29, 32, -8, 32, 32, -8, gloss(0x3a7ae0));
      dust(v, 0x9a8a70, 0.15);
    },
  },

  // ------------------------------------------------------------- curve mirror
  mirror_pole: {
    name: 'Curve Mirror', voxel: 0.032,
    build(v) {
      const org = (x, y, z) => gloss(shade(0xf07a1e, 0.88 + vnoise(x, y, z, 4, 1) * 0.12 - (y < 10 ? 0.1 : 0)));
      v.cylinder(0, 0, -2, 2.2, 1, concrete(0x9a968e, 2));
      v.cylinder(0, 1, -2, 1.2, 95, org);
      v.cylinder(0, 96, -2, 1.4, 1, gloss(0xc8601a));
      const CY = 84;
      v.shape(-11, CY - 11, -2, 11, CY + 11, 0, (x, y, z) => Math.hypot(x, y - CY) <= 10.4 - (z === -2 ? 1.6 : z === -1 ? 0.5 : 0), (x, y, z) => gloss(shade(0x8a8e92, 0.95 + hash(x, y, z, 3) * 0.05)));
      v.torus(0, CY, 1, 10, 0.9, org, 'z');
      v.shape(-10, CY - 10, 0, 10, CY + 10, 4, (x, y, z) => {
        const d = Math.hypot(x, y - CY);
        if (d > 9.3) return false;
        return z <= 1 + Math.round(1.8 * (1 - (d * d) / 86));
      }, (x, y, z) => {
        const dy = y - CY, d = Math.hypot(x, dy);
        if (Math.abs(x + dy * 0.6 - 3) < 0.8 && dy > -2) return gloss(0xf4f6f8);
        if (dy > 2) return gloss(mix(0xf0c890, 0xa8c4dc, (dy - 2) / 7));
        if (Math.abs(dy - 1 + x * x * 0.03) < 0.6) return gloss(0x3a4a3a);
        if (Math.abs(x - dy * 0.15) < 0.6 && dy < -1) return gloss(0xf4f0e0);
        return gloss(mix(0x7a7c80, 0x5a5c60, d / 10));
      });
      for (let k = 0; k <= 16; k++) {
        const a = Math.PI * (0.12 + 0.76 * k / 16);
        for (const z of [2, 3, 4]) v.set(Math.round(Math.cos(a) * (10.6 - (z - 2) * 0.3)), Math.round(CY + Math.sin(a) * (10.6 - (z - 2) * 0.3)), z, org(k, 0, z));
      }
      v.box(-2, CY - 2, -3, 2, CY + 2, -3, gloss(0x6a6e72));
      v.box(-2, 60, -1, 2, 63, -1, gloss(0xf4f0e6)); v.box(-2, 62, -1, 2, 62, -1, gloss(0x2a52a8));
      v.cylinder(0, 42, -1, 1.2, 1, gloss(0xff4a2a), 'z');
      grime(v, 0, 8, 0.78);
    },
  },

  // ------------------------------------------------------------- house front
  house_front: {
    name: 'House Across the Road', voxel: 0.08,
    build(v) {
      const X0 = -37, X1 = 37;
      const siding = (base, s) => (x, y, z) => shade(base, (y % 3 === 0 ? 0.88 : 1) * (0.96 + hash(x, y, z, s) * 0.04));
      fill(v, X0, 0, -3, X1, 3, 1, concrete(0x9e9a92, 1));
      fill(v, X0, 4, -3, X1, 37, 0, siding(0xd8c6a2, 2));
      fill(v, X0, 38, -3, X1, 62, 0, siding(0xeadcc0, 3));
      // 1F pent roof (kawara tiles)
      const tile = (x, y, z) => gloss(shade(0x4e5864, (x % 3 === 0 ? 0.8 : 1) * (z % 2 ? 1.06 : 0.96) * (0.95 + hash(x, y, z, 4) * 0.08)));
      for (let z = 1; z <= 6; z++) { const yt = 37 - Math.round((z - 1) * 0.8); fill(v, X0, yt - 1, z, X1, yt, z, tile); }
      v.box(X0, 31, 7, X1, 32, 7, gloss(0x8a8e92));
      // main roof
      const yTop = (z) => 63 + Math.round((6 - z) * 17 / 11);
      for (let z = 6; z >= -5; z--) {
        const yt = yTop(z);
        fill(v, X0 - 1, yt - 1, z, X1 + 1, yt, z, tile);
        if (z >= 1) v.box(X0, yt - 2, z, X1, yt - 2, z, 0xf2ece0);
        else fill(v, X0, 63, z, X1, yt - 2, z, siding(0xeadcc0, 3));
      }
      fill(v, X0 - 1, 80, -5, X1 + 1, 81, -4, gloss(0x3a424c));
      for (const x of [X0 - 1, X1 + 1]) fill(v, x - Math.sign(x), 79, -6, x, 83, -3, gloss(0x343c46));
      v.box(X0, 61, 7, X1, 62, 7, gloss(0x8a8e92));
      blotch(v, X0 - 1, 60, -5, X1 + 1, 82, 7, gloss(0x5a6a42), 0.82, 3, 5);
      // window helper
      const win = (x0, y0, x1, y1, kind) => {
        v.box(x0, y0, -1, x1, y1, 0, null);
        fill(v, x0, y0, -2, x1, y1, -2, (x, y, z) => {
          const cx = (x0 + x1) / 2, w = (x1 - x0) / 2;
          if (kind === 'lit') {
            const curtain = Math.abs(x - cx) > w * 0.62;
            if (curtain) return glow(shade(0xd8884a, (x % 2 ? 0.85 : 1)));
            return glow(mix(0xffd890, 0xffb860, Math.abs(x - cx) / w));
          }
          if (kind === 'lace') return glow(((x + y) % 2 === 0) ? 0xfff0d0 : 0xf0d8a8);
          if (kind === 'tv') return glow(mix(0x4a6aa8, 0x6a8ac8, hash(x >> 1, y >> 1, 0, 7)));
          if (kind === 'frost') return glow(0xf0e4c8);
          return duskGlass(x, y);
        });
        for (const x of [x0 - 1, x1 + 1]) v.box(x, y0 - 1, 1, x, y1 + 1, 1, gloss(0xc8ccd0));
        for (const y of [y0 - 1, y1 + 1]) v.box(x0 - 1, y, 1, x1 + 1, y, 1, gloss(0xc8ccd0));
        const xm = Math.round((x0 + x1) / 2);
        v.box(xm, y0, 0, xm, y1, 0, gloss(0xb8bcc0));
        v.box(x0 - 1, y0 - 2, 1, x1 + 1, y0 - 2, 2, gloss(0xb8bcc0));
        tint(v, x0, 4, -3, x1, y0 - 3, 0, (x, y, z, c, m) => (y > y0 - 9 && vnoise(x, y, 0, 2, 9) > 0.55 ? enc(shade(c, 0.9), m) : undefined));
      };
      // ---- ground floor
      win(-32, 11, -9, 29, 'lit');
      v.layer(['.KKK.', '..K..', '..K..', '.KKK.', 'KKKKK'], { K: glow(0x7a4a2a) }, { x: -23, y: 29, z: -1 });
      fill(v, -36, 9, 1, -34, 31, 2, (x, y, z) => gloss(shade(0x8a7a5a, x === -35 ? 0.85 : 1)));
      fill(v, -32, 7, 1, -9, 9, 3, gloss(0x8a6a4a));
      for (let x = -31; x <= -10; x += 2) v.set(x, 10, 2, gloss(x % 4 === 1 ? 0xe5383b : 0xffd23f));
      win(-3, 19, 4, 27, 'frost');
      for (let x = -3; x <= 4; x += 2) v.box(x, 18, 2, x, 28, 2, gloss(0xc8ccd0));
      // genkan sliding door
      v.box(12, 4, -1, 24, 30, 0, null);
      fill(v, 12, 4, -2, 24, 30, -2, (x, y) => glow(y % 4 === 0 || x === 18 ? 0xb88850 : 0xf8dca8));
      for (const x of [11, 18, 25]) v.box(x, 4, 1, x, 31, 1, gloss(0xc8ccd0));
      v.box(11, 31, 1, 25, 31, 1, gloss(0xc8ccd0)); v.box(11, 27, 1, 25, 27, 1, gloss(0xc8ccd0));
      fill(v, 9, 32, 1, 27, 32, 5, gloss(0xb8bcc0));
      fill(v, 9, 0, 1, 27, 2, 6, concrete(0xb0aca4, 6));
      v.box(9, 2, 1, 27, 2, 6, 0x9a8a7a);
      v.box(27, 24, 1, 28, 26, 2, gloss(0x3a3a3a)); v.box(27, 24, 2, 28, 25, 2, glow(0xffc870));
      v.box(29, 18, 1, 30, 22, 1, woodFnH(0xc8a070));
      v.box(29, 21, 2, 29, 21, 2, 0x2a2a2a); v.box(29, 19, 2, 29, 19, 2, 0x2a2a2a);
      fill(v, 30, 12, 1, 33, 15, 3, gloss(0x9aa0a6)); v.box(31, 15, 3, 32, 15, 3, 0x2a2a2a);
      v.set(29, 16, 1, gloss(0xe8e8e8)); v.set(29, 17, 1, glow(0x6ad0ff));
      // air conditioner outdoor unit
      fill(v, -6, 0, 1, 6, 1, 5, concrete(0x9a968e, 7));
      fill(v, -5, 2, 1, 5, 9, 5, (x, y, z) => gloss(shade(0xe8e6de, 0.95 + hash(x, y, z, 8) * 0.05)));
      v.shape(-4, 3, 5, 1, 8, 5, (x, y) => Math.hypot(x + 1.5, y - 5.5) <= 2.8, (x, y) => (Math.abs(x + 1.5) < 0.6 || Math.abs(y - 5.5) < 0.6 ? gloss(0x8a8a88) : 0x2a2a2a));
      for (let y = 3; y <= 8; y += 2) v.box(3, y, 5, 4, y, 5, 0x9a9890);
      fill(v, 4, 10, 1, 5, 14, 2, gloss(0xe0dcd0)); fill(v, 4, 14, 1, 5, 15, 1, gloss(0xe0dcd0));
      // meters + downpipe
      fill(v, 33, 13, 1, 35, 17, 2, gloss(0xa8acae)); v.set(34, 16, 3, glass(0xdfeef6)); v.set(34, 14, 3, 0x2a2a2a);
      v.box(36, 0, 1, 36, 61, 1, gloss(0x8a8e92));
      for (let y = 10; y <= 58; y += 12) v.box(36, y, 0, 36, y, 2, gloss(0x6a6e72));
      // ---- first floor: balcony with laundry and futon
      fill(v, -35, 38, 1, 3, 39, 8, concrete(0xd8d4cc, 9));
      win(-31, 41, -9, 58, 'lace');
      win(10, 46, 22, 56, 'tv');
      win(27, 48, 31, 54, 'frost');
      for (let x = -35; x <= 3; x += 2) v.box(x, 40, 8, x, 46, 8, gloss(0xc8ccd0));
      v.box(-35, 47, 7, 3, 47, 8, gloss(0xb8bcc0));
      for (const x of [-35, 3]) for (let z = 1; z <= 8; z += 2) v.box(x, 40, z, x, 47, z, gloss(0xc8ccd0));
      for (const x of [-34, 2]) { v.box(x, 56, 1, x, 56, 5, gloss(0x9aa0a6)); v.set(x, 57, 5, gloss(0x9aa0a6)); }
      v.box(-35, 56, 5, 3, 56, 5, gloss(0x7ab0d8));
      // towel, shirt, pinch hanger with socks
      fill(v, -32, 49, 5, -28, 55, 5, (x, y) => (y === 51 ? 0x6a9ad8 : 0xfbf8f0));
      v.box(-23, 55, 5, -19, 55, 5, gloss(0xd8d8d8));
      fill(v, -25, 52, 5, -17, 54, 5, () => 0x5a8ad0); fill(v, -23, 46, 5, -19, 54, 5, () => 0x5a8ad0);
      v.box(-21, 53, 6, -21, 47, 6, 0xf4f4f0);
      v.shape(-15, 55, 3, -8, 55, 7, (x, y, z) => { const e = ((x + 11.5) / 3.6) ** 2 + ((z - 5) / 2.2) ** 2; return e <= 1 && e > 0.45; }, gloss(0xff8fb2));
      [[-14, 0xffd23f], [-12, 0xffffff], [-10, 0x3cae5a], [-9, 0xe5383b]].forEach(([x, c], i) => v.box(x, 51 + (i % 2), i % 2 ? 4 : 6, x, 54, i % 2 ? 4 : 6, c));
      fill(v, -6, 47, 7, 2, 48, 9, (x, y, z) => ((x + z) % 4 === 0 ? 0xffffff : 0xf2a0b8));
      fill(v, -6, 39, 9, 2, 47, 9, (x, y) => ((x * 3 + y * 5) % 11 === 0 ? 0xffffff : (x + y) % 7 === 0 ? 0xe86a8a : 0xf2a0b8));
      v.box(-6, 39, 9, 2, 39, 9, 0xfbf8f0);
      // little vent hood and service cable
      fill(v, 25, 58, 1, 26, 59, 2, gloss(0xb0b4b6));
      path(v, [[X0, 62, 5], [X0 + 3, 59, 3], [X0 + 5, 58, 1]], 0x1e1e1e);
      grime(v, 0, 6, 0.8);
    },
  },
};

/** Light wood colour function for small parts (nameplate etc.). */
function woodFnH(base) {
  return (x, y, z) => shade(base, 0.9 + vnoise(x * 3, y, z, 2, 4) * 0.15);
}

export default street;
