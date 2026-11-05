// Voxel models for the bigger wardrobe (src/cosmetics/catalog.js), in the same frames as src/people/cosmetics.js:
// head pieces in head units (1 voxel = 1/20 of the head height, head bone at the origin, +z = the face, +x = the
// wearer's left; chin -4, eyes 6, brows 8, hair line 13.2, crown 16, cranium centre z 2.4, face plane z 10.8). Hats that
// sit on the hair go on the "crown" group (lifted by the hair), glasses on the "eyes" group (origin at eye level, lenses
// at z 12). Side-worn masks share the kitsune mask's frame (face towards +z, centred on the origin). Bags are metric
// voxels (V = height / 140) on the chest bone. Every builder returns a VoxelModel.
import { VOX } from '../people/cosmetics.js';

const { vm, each, rbox, front, hash, hood, gloss, INK } = VOX;
const WH = 0xf6f2e8;
/** Fill an ellipsoid (centre c, radii r) calling col(x, y, z, q) for the colour (null = skip). */
function blob(v, c, r, col) {
  each(Math.floor(c[0] - r[0]), Math.ceil(c[0] + r[0]), Math.floor(c[1] - r[1]), Math.ceil(c[1] + r[1]), Math.floor(c[2] - r[2]), Math.ceil(c[2] + r[2]), (x, y, z) => {
    const q = ((x - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2 + ((z - c[2]) / r[2]) ** 2;
    if (q > 1) return;
    const k = typeof col === 'function' ? col(x, y, z, q) : col;
    if (k != null) v.set(x, y, z, k);
  });
  return v;
}
/** A shell hugging the head (the hood's inner box grown by `grow`), thickness th, where keep(x, y, z, d) says so. */
function cap(v, { grow = 0, th = 1.4, y0 = 9, col, keep }) {
  each(-12, 12, y0, 22, -12, 14, (x, y, z) => {
    const d = rbox(x, y, z, [0, 6.2, 2.2], [7.5 + grow, 10.8 + grow, 8.9 + grow], 4.4);
    if (d < 0 || d > th) return;
    if (keep && !keep(x, y, z, d)) return;
    const k = typeof col === 'function' ? col(x, y, z, d) : col;
    if (k != null) v.set(x, y, z, k);
  });
  return v;
}
/** A band around the head between y0 and y1 (just outside the hair), coloured by col(x, y, z, a) (a: angle, 0 = front). */
function band(v, y0, y1, col, grow = 0.4) {
  each(-11, 11, Math.floor(y0), Math.ceil(y1), -12, 14, (x, y, z) => {
    if (y < y0 || y > y1) return;
    const d = rbox(x, y, z, [0, 6.2, 2.2], [7.5 + grow, 10.8, 8.9 + grow], 4.4);
    if (d < 0 || d > 1.1) return;
    const k = typeof col === 'function' ? col(x, y, z, Math.atan2(x, z - 2.2)) : col;
    if (k != null) v.set(x, y, z, k);
  });
  return v;
}

/** The shape helpers, for the newer models (src/cosmetics/voxels99.js). */
export const SHAPES = { blob, cap, band };

export const VX = {
  // ================================================================== hats on the hair (crown group)
  strawhat() {
    const v = vm(0.04);
    const straw = (x, y, z) => { const h = hash(x, y, z, 31); return h > 0.86 ? 0xc8963c : (x + z + y * 2) % 3 === 0 ? 0xdcb050 : 0xeac462; };
    // the brim (drooping at the edge), the crown and a red band
    each(-14, 14, 11, 13, -12, 17, (x, y, z) => {
      const r = Math.hypot(x / 13.5, (z - 2.4) / 14.5);
      if (r > 1) return;
      const yy = r > 0.82 ? 12 : 13;
      if (y !== yy && !(r > 0.97 && y === 11 && hash(x, z, 1, 5) > 0.5)) return;
      v.set(x, y, z, straw(x, y, z));
    });
    for (let y = 13; y <= 20; y++) each(-9, 9, y, y, -8, 13, (x, yy, z) => {
      const r = Math.hypot(x / 7.9, (z - 2.4) / 9.2) * (y > 18 ? 1 + (y - 18) * 0.12 : 1);
      if (r > 1 || (r < 0.8 && y < 20)) return;
      v.set(x, y, z, y >= 14 && y <= 15 ? 0xc8302a : straw(x, y, z));
    });
    return v;
  },
  beret() {
    const v = vm(0.03);
    const C = 0x8a2a34, C2 = 0x6e1e2a;
    blob(v, [1.5, 16.6, 2.6], [9.6, 2.8, 10.4], (x, y) => (y < 14.5 ? null : hash(x, y, 1, 9) > 0.85 ? C2 : C));
    each(-8, 8, 14, 14, -7, 12, (x, y, z) => { if (Math.hypot(x / 7.8, (z - 2.4) / 9.1) <= 1 && Math.hypot(x / 7.8, (z - 2.4) / 9.1) > 0.82) v.set(x, y, z, C2); });
    v.set(1, 20, 3, C2).set(1, 21, 3, C2).set(2, 21, 3, C2);
    return v;
  },
  kappa() {
    const v = vm(0.03);
    // a fringe of green kappa hair around a cream dish
    each(-9, 9, 13, 17, -8, 13, (x, y, z) => {
      const r = Math.hypot(x / 8.2, (z - 2.4) / 9.4);
      if (r > 1 || r < 0.66) return;
      const drop = Math.floor(hash(x, 0, z, 3) * 3);
      if (y < 14 - drop) return;
      if (y > 15) return;
      v.set(x, y, z, hash(x, y, z, 4) > 0.7 ? 0x3e8a3a : 0x5aa64a);
    });
    each(-6, 6, 16, 17, -5, 10, (x, y, z) => {
      const r = Math.hypot(x / 5.6, (z - 2.4) / 6.2);
      if (r > 1) return;
      v.set(x, y, z, y === 17 && r < 0.78 ? gloss(0xf4ecd0) : gloss(0xd8ccaa));
    });
    return v;
  },
  onigiri() {
    const v = vm(0.03);
    const RICE = 0xfbf8ee, RICE2 = 0xe8e2d0, NORI = 0x1e2a22;
    for (let y = 14; y <= 27; y++) {
      const half = 8 * (1 - (y - 14) / 15) + (y < 16 ? -1 : 0);
      each(-9, 9, y, y, -2, 6, (x, yy, z) => {
        if (Math.abs(x) > half + 0.3) return;
        const edge = Math.abs(x) > half - 1 || z === -2 || z === 6;
        let c = hash(x, y, z, 6) > 0.8 ? RICE2 : RICE;
        if (y <= 18 && Math.abs(x) <= 3) c = NORI;
        if (y === 26 && edge) return;
        v.set(x, y, z, c);
      });
    }
    v.set(-2, 22, 6, 0x2a2a20).set(3, 20, 6, 0x2a2a20).set(1, 24, 6, 0x2a2a20); // sesame
    return v;
  },
  pigeonBody() {
    const v = vm(0.03);
    const G = 0x8e94a4, G2 = 0x6e7486, BAR = 0x3e4252;
    blob(v, [0, 19.5, 0], [5.2, 3.8, 7.2], (x, y, z) => (y < 17.5 ? 0xb4b8c4 : Math.abs(x) > 3.6 && (z === -1 || z === 1) ? BAR : hash(x, y, z, 2) > 0.85 ? G2 : G));
    for (let i = 0; i < 5; i++) each(-2, 2, 19 + Math.round(i * 0.4), 20 + Math.round(i * 0.4), -7 - i, -7 - i, (x, y, z) => v.set(x, y, z, i > 3 ? BAR : G2));
    for (const sx of [-1, 1]) v.set(sx * 2, 15.6, 2, 0xd85a5a).set(sx * 2, 15.6, 3, 0xd85a5a);
    return v;
  },
  pigeonHead() {
    const v = vm(0.03);
    blob(v, [0, 24.6, 5.4], [2.9, 3.1, 3], (x, y) => (y < 23 ? (x + y) % 2 ? 0x5a9a7a : 0x8a6aa8 : 0x8e94a4));
    v.set(0, 24.6, 8.6, 0x4a3a3a).set(0, 24.6, 9.4, 0x2a2224).set(0, 25.3, 8.4, 0xf4f0ea);
    for (const sx of [-1, 1]) v.set(sx * 2.6, 25.4, 6.4, 0xf08a2a).set(sx * 2.8, 25.4, 6.6, gloss(INK));
    return v;
  },
  curlers() {
    const v = vm(0.02);
    const COL = [0xf49ac0, 0x8ac8f0, 0xf4d070];
    let n = 0;
    for (const [cx, cy, cz] of [[-4, 17.4, 6], [0, 18, 6.4], [4, 17.4, 6], [-5, 18.4, 1.2], [0, 19.2, 1.4], [5, 18.4, 1.2], [-4, 17.2, -3.4], [0, 17.8, -3.6], [4, 17.2, -3.4]]) {
      const col = COL[n++ % 3];
      each(cx - 2, cx + 2, cy - 2, cy + 2, cz - 2, cz + 2, (x, y, z) => {
        const r = Math.hypot(y - cy, z - cz);
        if (r > 1.9 || Math.abs(x - cx) > 2) return;
        v.set(x, y, z, Math.abs(x - cx) === 2 ? 0xffffff : r < 0.9 ? 0x2a2224 : (x + Math.round(y)) % 2 ? col : col - 0x101010);
      });
    }
    return v;
  },
  explorer() {
    const v = vm(0.03);
    const K = 0xd8c08a, K2 = 0xc4a870, BAND = 0x7a5a36;
    blob(v, [0, 14.2, 2.4], [8.6, 7.6, 9.8], (x, y, z, q) => (y < 14 || q < 0.72 ? null : y <= 15 ? BAND : hash(x, y, z, 3) > 0.86 ? K2 : K));
    each(-12, 12, 13, 14, -10, 15, (x, y, z) => {
      const r = Math.hypot(x / 11.5, (z - 2.6) / 12.5);
      if (r > 1 || r < 0.72) return;
      if (y !== (r > 0.9 ? 13 : 14)) return;
      v.set(x, y, z, r > 0.97 ? K2 : K);
    });
    v.set(0, 21.8, 2, K2);
    return v;
  },
  crown() {
    const v = vm(0.01);
    const AU = gloss(0xf6c838), AU2 = gloss(0xc8901e);
    each(-10, 10, 13, 24, -9, 14, (x, y, z) => {
      const r = Math.hypot(x / 8.1, (z - 2.4) / 9.3);
      if (r > 1 || r < 0.86) return;
      const a = Math.atan2(x, z - 2.4), spike = Math.abs(Math.cos(a * 2.5));
      const top = 17 + Math.round(spike ** 3 * 6);
      if (y > top) return;
      v.set(x, y, z, y === 13 || y === 16 ? AU2 : AU);
    });
    // gems on the band and the tips
    v.set(0, 15, 12, gloss(0xd8303a)).set(-1, 15, 12, gloss(0xd8303a)).set(4, 15, 10, gloss(0x3a7ad8)).set(-5, 15, 10, gloss(0x3ab06a));
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; v.set(Math.round(Math.sin(a) * 7.6), 24, Math.round(2.4 + Math.cos(a) * 8.8), gloss(0xfff0f0)); }
    return v;
  },
  sprout() {
    const v = vm(0.02);
    for (let y = 15; y <= 21; y++) v.set(0, y, 2, 0x5aa04a);
    blob(v, [-3, 22, 2], [3, 1.4, 2], (x) => (x > -1 ? null : 0x7ac85a));
    blob(v, [3, 22.6, 2], [3, 1.4, 2], (x) => (x < 1 ? null : 0x6ab84a));
    v.set(-4, 23, 2, 0x9ad87a).set(4, 23.4, 2, 0x9ad87a);
    return v;
  },
  catears() {
    const v = vm(0.02);
    const BK = 0x2a2428, PK = 0xf09ab0;
    each(-9, 9, 10, 20, 2, 4, (x, y, z) => { const r = Math.hypot(x / 8.4, (y - 10) / 9.6); if (r > 1 || r < 0.88) return; v.set(x, y, z, BK); });
    for (const sx of [-1, 1]) for (let y = 16; y <= 23; y++) {
      const w = 3.6 * (1 - (y - 16) / 8);
      for (let x = Math.round(sx * 5 - w); x <= Math.round(sx * 5 + w); x++) for (const z of [2, 3]) v.set(x, y, z, z === 3 && Math.abs(x - sx * 5) < w - 1.2 && y < 21 ? PK : BK);
    }
    return v;
  },
  oniHorns() {
    const v = vm(0.02);
    for (const sx of [-1, 1]) for (let y = 0; y <= 8; y++) {
      const r = 2.2 * (1 - y / 9) + 0.4, cx = sx * (4 + y * 0.25);
      each(-9, 9, 15 + y, 15 + y, -2, 6, (x, yy, z) => { if (Math.hypot(x - cx, z - 2) <= r) v.set(x, 15 + y, z, y > 6 ? 0xfff6dc : (x + y) % 3 ? 0xf4e2a8 : 0xe0c68a); });
    }
    return v;
  },
  oniBand() {
    const v = vm(0.01);
    band(v, 12, 13, (x, y, z, a) => (Math.floor(a * 7 + y * 0.5) % 2 ? 0x1c1618 : 0xf2c030), 0.5);
    return v;
  },
  towel() {
    const v = vm(0.03);
    each(-5, 5, 16, 18, -3, 8, (x, y, z) => {
      if (y === 18 && (Math.abs(x) === 5 || z === -3 || z === 8)) return;
      v.set(x, y, z, z === 6 || z === -1 ? 0x5a86c8 : (x + z) % 2 ? 0xfcfaf4 : 0xeeeae2);
    });
    return v;
  },
  octopus() {
    const v = vm(0.03);
    const R = 0xe0503a, R2 = 0xc23a2a, S = 0xf4b0a0;
    blob(v, [0, 21, 0.4], [5.6, 6, 6], (x, y, z) => (hash(x, y, z, 7) > 0.88 ? S : y < 17 ? R2 : R));
    for (const sx of [-1, 1]) { v.set(sx * 2, 19, 6, 0xffffff).set(sx * 2, 18, 6, gloss(INK)).set(sx * 3, 19, 6, 0xffffff); }
    v.set(0, 16, 6, R2).set(0, 15, 6, R2).set(0, 15, 7, R2).set(-1, 15, 7, R2).set(1, 15, 7, R2);
    // tentacles draped down around the head
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * Math.PI * 2;
      for (let s = 0; s < 6; s++) {
        const rr = 6 + s * 0.6, y = 16 - s * 0.8 + (s > 4 ? 0.6 : 0);
        const x = Math.round(Math.sin(a) * rr * 1.05), z = Math.round(0.4 + Math.cos(a) * rr * 1.2);
        if (z > 9 && y < 14) continue;
        v.set(x, Math.round(y), z, s % 2 ? S : R);
        v.set(x + Math.sign(x || 1), Math.round(y), z, R2);
      }
    }
    return v;
  },
  conductor() {
    const v = vm(0.02);
    const NV = 0x22305a, NV2 = 0x1a2446;
    each(-10, 10, 13, 19, -9, 14, (x, y, z) => {
      const r = Math.hypot(x / (8.1 + (y - 13) * 0.18), (z - 2.4) / (9.3 + (y - 13) * 0.2));
      if (r > 1 || (r < 0.84 && y < 19)) return;
      v.set(x, y, z, y === 14 ? gloss(0xe0b23a) : y === 19 ? NV2 : NV);
    });
    // glossy visor + a little gold badge
    each(-6, 6, 13, 13, 9, 15, (x, y, z) => { if (Math.hypot(x / 6.4, (z - 9.4) / 5.6) <= 1 && z > 10) v.set(x, y, z, gloss(0x141418)); });
    v.set(0, 16, 12, gloss(0xf4d050)).set(-1, 16, 12, gloss(0xf4d050)).set(1, 16, 12, gloss(0xf4d050)).set(0, 17, 12, gloss(0xf4d050));
    return v;
  },
  chef() {
    const v = vm(0.02);
    for (let y = 10; y <= 24; y++) {
      const puff = y > 17 ? 1.06 + Math.sin((y - 17) / 7 * Math.PI) * 0.2 : 1;
      each(-12, 12, y, y, -10, 15, (x, yy, z) => {
        const a = Math.atan2(x, z - 2.2), pleat = y > 14 ? Math.cos(a * 8) * 0.04 : 0;
        const r = Math.hypot(x / (7.9 * puff), (z - 2.2) / (9.3 * puff)) - pleat;
        if (r > 1 || (r < 0.84 && y < 24)) return;
        v.set(x, y, z, y <= 12 ? 0xe8e6e0 : Math.cos(a * 8) > 0.6 ? 0xe2ded6 : WH);
      });
    }
    return v;
  },
  propBlade() {
    const v = vm(0.01);
    for (const s of [-1, 1]) each(-7, 7, 0, 0, -1, 1, (x, y, z) => { if (Math.sign(x) === s && Math.abs(x) > 0) v.set(x, y, z, s > 0 ? 0xe5383b : 0x3f86e8); });
    v.set(0, 0, 0, gloss(0xffd23f)).set(0, 1, 0, gloss(0xffd23f));
    return v;
  },

  // ================================================================== hats that hug the head (cover)
  beanie() {
    const v = vm(0.03);
    const C = 0xe0a830, C2 = 0xc48e22;
    cap(v, { th: 1.6, y0: 9, col: (x, y, z) => { const a = Math.atan2(x, z - 2.2); const rib = Math.floor((a + 4) * 9) % 2; return y <= 11 ? (rib ? C2 : C) : rib ? C : 0xd89c2a; } });
    blob(v, [0, 22, 1.6], [2.6, 2.4, 2.6], (x, y, z) => (hash(x, y, z, 5) > 0.5 ? 0xfff2d0 : 0xf4e2b8));
    return v;
  },
  propCap() {
    const v = vm(0.02);
    const Q = [0xe5383b, 0xffd23f, 0x3f86e8, 0x58c06c];
    cap(v, { th: 1.4, y0: 10, col: (x, y, z) => (y <= 10 ? 0xf4f0e6 : Q[((Math.floor((Math.atan2(x, z - 2.2) + Math.PI) / (Math.PI / 2)) % 4) + 4) % 4]) });
    v.set(0, 20, 2, 0x8a8a90).set(0, 21, 2, 0x8a8a90);
    return v;
  },
  shrub() {
    const v = hood(vm(0.06), {
      col: 0x4a8a3a, rim: 0x3a6a2a,
      paint: (x, y, z, col) => (col === 0x4a8a3a ? (hash(x >> 1, y >> 1, z >> 1, 11) > 0.6 ? 0x5ea448 : hash(x, y, z, 12) > 0.8 ? 0x2e6a28 : col) : col),
    });
    // leafy clumps poking out, a twig and a flower
    for (let i = 0; i < 46; i++) {
      const a = hash(i, 1, 2, 3) * Math.PI * 2, e = hash(i, 4, 5, 6) * 1.45 - 0.3;
      const x = Math.round(Math.sin(a) * Math.cos(e) * 9.8), y = Math.round(6.5 + Math.sin(e) * 13.5), z = Math.round(2.2 + Math.cos(a) * Math.cos(e) * 11.4);
      if (z > 6 && y < 14 && y > -4 && Math.abs(x) < 8) continue;
      const r = 2.2 + hash(i, 7, 7, 7) * 1.4;
      blob(v, [x, y, z], [r, r * 0.85, r], (xx, yy, zz) => (hash(xx, yy, zz, 9) > 0.6 ? 0x74bc52 : hash(xx, yy, zz, 8) > 0.5 ? 0x4e8e3a : 0x3e7a32));
    }
    for (let y = 18; y <= 23; y++) v.set(2 + Math.floor((y - 18) / 2), y, 1, 0x6a4a2a);
    v.set(-6, 15, 8, 0xffffff).set(-6, 16, 8, 0xffd23f).set(-5, 15, 8, 0xffffff).set(-7, 15, 8, 0xffffff).set(-6, 14, 8, 0xffffff);
    return v;
  },
  paperbag() {
    const v = vm(0.03);
    const K = 0xc9a068, K2 = 0xb48a56, K3 = 0xd8b47c, PEN = 0x3a2a24;
    each(-10, 10, -8, 22, -9, 14, (x, y, z) => {
      const d = rbox(x, y, z, [0, 7.6, 2.4], [8.8, 13, 10], 1.2);
      if (d < 0 || d > 1.1) return;
      v.set(x, y, z, y > 19 ? K2 : (x + y) % 7 === 0 ? K3 : hash(x, y, z, 2) > 0.85 ? K2 : K);
    });
    // a folded rim, two eye holes and a drawn smile
    each(-10, 10, -8, -7, -10, 15, (x, y, z) => { const d = rbox(x, y, z, [0, 7.6, 2.4], [9.8, 13, 11], 1.2); if (d >= 0 && d <= 1) v.set(x, y, z, K3); });
    for (const sx of [-1, 1]) each(sx * 3 - 1, sx * 3 + 1, 6, 8, 11, 13, (x, y, z) => v.set(x, y, z, null));
    for (let x = -5; x <= 5; x++) front(v, x, 1 - (Math.abs(x) > 3 ? -1 : 0) - (Math.abs(x) < 2 ? 1 : 0), PEN);
    front(v, -6, 9, PEN); front(v, -5, 10, PEN); front(v, 5, 10, PEN); front(v, 6, 9, PEN);
    return v;
  },
  pompadour(col = 0x2a2428) {
    const v = vm(0.03);
    const c = col, d = shade(col, 0.7), hi = shade(col, 1.6);
    cap(v, { th: 1.8, y0: 7, col: (x, y, z) => ((x * 3 + y) % 5 === 0 ? d : c), keep: (x, y, z) => z < 9 || y > 13 });
    // the quiff: a huge rolled wave jutting out over the brow like a ship's prow
    blob(v, [0, 18.5, 8], [7.6, 6, 10], (x, y, z) => ((z + y) % 4 === 0 ? hi : (x + z) % 5 === 0 ? d : c));
    blob(v, [0, 17.5, 17], [6.2, 4.6, 4.4], (x, y, z) => ((y + z) % 3 === 0 ? hi : c));
    blob(v, [0, 15.6, 20], [4.4, 3, 2.4], (x, y, z) => ((y + x) % 3 === 0 ? hi : d));
    return v;
  },
  yurei() {
    const v = vm(0.01);
    // a thin white tie round the head (mostly under the hair) and the white triangle (hitai-kakushi) on the forehead
    each(-9, 9, 10, 10, -8, 13, (x, y, z) => { const d = rbox(x, y, z, [0, 6, 2.4], [7.1, 10.4, 8.8], 3.6); if (d >= 0 && d <= 0.8) v.set(x, y, z, 0xece8de); });
    for (let y = 9; y <= 15; y++) {
      const w = 3.8 * (1 - (y - 9) / 6.6);
      for (let x = Math.round(-w); x <= Math.round(w); x++) v.set(x, y, 12.6 - Math.round((x / 6) ** 2 * 2), y === 9 ? 0xe4e0d6 : 0xfcfaf4);
    }
    return v;
  },
  tiehead() {
    const v = vm(0.02);
    const T = 0x2a3a78, S = 0xc8302a;
    band(v, 12, 13, (x, y, z, a) => (Math.floor((a * 6 + y) * 1.2) % 2 ? T : S), 0.6);
    // the knot at the side and the blade hanging down the back
    blob(v, [7.8, 12.5, -2], [1.6, 1.8, 1.6], T);
    for (let i = 0; i < 9; i++) each(7, 8, 11 - i, 11 - i, -3 - Math.round(i * 0.35), -1 - Math.round(i * 0.35) + (i > 6 ? -1 : 0), (x, y, z) => v.set(x + (i > 4 ? 1 : 0), y, z, (i + Math.floor(z)) % 3 === 0 ? S : T));
    return v;
  },
  kasa() {
    const v = vm(0.02);
    const P = 0xd8343a, P2 = 0xb02830, RIB = 0x6a3a22;
    for (let y = 14; y <= 22; y++) {
      const r = 12 * (1 - (y - 14) / 9) + 0.6;
      each(-13, 13, y, y, -11, 16, (x, yy, z) => {
        const d = Math.hypot(x, z - 2.4);
        if (d > r || d < r - 1.6) return;
        const a = Math.atan2(x, z - 2.4), rib = Math.abs(((a / (Math.PI / 4)) % 1 + 1) % 1 - 0.5) < 0.08;
        v.set(x, y, z, rib ? RIB : y % 3 === 0 ? P2 : P);
      });
    }
    v.set(0, 23, 2, RIB).set(0, 24, 2, RIB);
    // one big eye on the canopy, and the long tongue hanging off the rim
    each(-2, 2, 17, 19, 7, 12, (x, y, z) => { if (Math.hypot(x, y - 18) <= 2.2) front(v, x, y, Math.hypot(x, y - 18) < 1 ? gloss(INK) : 0xfffaf0, 4, 14); });
    for (let i = 0; i < 6; i++) each(3, 4, 13 - i, 13 - i, 12 - Math.round(i * 0.3), 12 - Math.round(i * 0.3), (x, y, z) => v.set(x, y, z, i === 5 ? 0xd85a6a : 0xf07a8a));
    return v;
  },

  // ================================================================== full helmets (cover)
  helmet(o) {
    const v = vm(0.02);
    each(-11, 11, -7, 21, -11, 14, (x, y, z) => {
      const d = rbox(x, y, z, [0, 6.6, 2.4], [8.4, 11.6, 9.8], 5);
      if (d < 0 || d > 1.6) return;
      if (y < (z > 4 ? -6 : -7)) return;
      v.set(x, y, z, o.col(x, y, z));
    });
    return v;
  },
  ranger() {
    const R = 0xd8303a, R2 = 0xa8242c, W = 0xf4f2ec;
    return VX.helmet({
      col: (x, y, z) => {
        const fr = z > 6;
        if (fr && y >= 3 && y <= 9 && Math.abs(x) <= 6 - (y < 5 ? 2 : 0) && !(y < 6 && Math.abs(x) < 2)) return gloss(0x14161c); // the black visor (a T)
        if (fr && y < 3 && y > -5 && Math.abs(x) < 4) return gloss(0xc8ccd4); // mouth plate
        if (Math.abs(x) <= 1 && y > 9) return W;
        return hash(x, y, z, 2) > 0.92 ? R2 : R;
      },
    });
  },
  astro() {
    return VX.helmet({
      col: (x, y, z) => {
        if (z > 5 && Math.hypot(x / 7.2, (y - 5.5) / 7.6) <= 1) return gloss(Math.hypot(x / 7.2, (y - 5.5) / 7.6) > 0.86 ? 0xd8a838 : y > 8 && x < -2 ? 0x5a7aaa : 0x1a2440);
        if (y < -3) return 0xb8bcc4;
        return x === 0 && y > 12 ? 0xe5383b : hash(x, y, z, 6) > 0.9 ? 0xdcdee4 : 0xf2f4f6;
      },
    });
  },

  // ================================================================== glasses & masks (eyes group, lenses at z 12)
  maskSurgical() {
    const v = vm(0.01);
    for (let x = -6; x <= 6; x++) {
      const z = Math.round(11.8 - (x / 7) ** 2 * 4.4);
      for (let y = -10; y <= -2; y++) {
        if (y <= -9 && Math.abs(x) > 4) continue;
        if (y === -2 && Math.abs(x) > 5) continue;
        v.set(x, y, z, y === -4 || y === -7 ? 0xdcdcdc : 0xf6f6f4);
      }
    }
    for (const sx of [-1, 1]) for (let z = 2; z <= 8; z++) v.set(sx * 7, Math.round(-3 - (8 - z) * 0.15), z, 0xf0f0ee);
    return v;
  },
  heartglasses() {
    const F = gloss(0xe03a6a), L = gloss(0xff8ab0);
    const v = vm(0.01);
    for (const sx of [-1, 1]) {
      each(-9, 9, -5, 4, 12, 12, (x, y, z) => {
        const X = (x - sx * 3.6) / 3.6, Y = (y - 0.2) / 3.6 + 0.2;
        const m = (X * X + Y * Y - 0.5) ** 3 - X * X * Y * Y * Y;
        if (m > 0.02) return;
        v.set(x, y, z, m > -0.03 ? F : L);
      });
      for (let z = 3; z <= 11; z++) v.set(sx * 8, 1, z, F);
    }
    v.set(0, 1, 12, F);
    return v;
  },
  eyepatch() {
    const v = vm(0.01);
    each(1, 7, -3, 3, 12, 12, (x, y, z) => { if (((x - 3.8) / 2.9) ** 2 + (y / 2.6) ** 2 <= 1) v.set(x, y, z, x === 3 && y === 1 ? 0x3a3438 : 0x1c1618); });
    // the strap runs up across the forehead and round the back
    each(-11, 11, -6, 14, -11, 13, (x, y, z) => {
      const d = rbox(x, y + 6, z, [0, 6.2, 2.2], [7.6, 10.8, 9], 4.4);
      if (d < 0 || d > 0.9) return;
      const p = (y - 1) - (x - 5) * -0.55; // a tilted plane through the patch
      if (Math.abs(p) > 0.6 || (z > 8 && x > 1 && x < 7)) return;
      v.set(x, y, z, 0x1c1618);
    });
    return v;
  },
  monocle() {
    const v = vm(0.01);
    const AU = gloss(0xe0b23a);
    each(-7, 0, -4, 4, 12, 12, (x, y, z) => { const r = Math.hypot(x + 3.6, y); if (r > 3.2) return; v.set(x, y, z, r > 2.3 ? AU : gloss(r < 1 && x < -3 ? 0xffffff : 0xc8e6f0)); });
    for (let i = 0; i < 9; i++) v.set(-6 - (i > 6 ? 1 : 0), -3 - i, 11 - Math.round(i * 0.3), i % 2 ? AU : gloss(0xc8901e));
    return v;
  },
  swirl() {
    const F = 0x1c1a20, v = vm(0.01);
    for (const sx of [-1, 1]) {
      each(-9, 9, -5, 5, 12, 12, (x, y, z) => {
        const dx = x - sx * 4, r = Math.hypot(dx, y);
        if (r > 4.6) return;
        const a = Math.atan2(y, dx), sw = (r - a / Math.PI * 1.1 + 20) % 2.2;
        v.set(x, y, z, r > 3.9 ? F : sw < 0.9 ? 0x3a6ab8 : 0xf4f6fa);
      });
      for (let z = 3; z <= 11; z++) v.set(sx * 8, 1, z, F);
    }
    v.set(0, 1, 12, F).set(0, 2, 12, F);
    return v;
  },
  glasses3d() {
    const v = vm(0.01);
    each(-8, 8, -3, 3, 12, 12, (x, y, z) => {
      const lens = Math.abs(y) <= 2 && Math.abs(x) >= 1 && Math.abs(x) <= 6;
      v.set(x, y, z, lens ? gloss(x < 0 ? 0x30c8e8 : 0xe83838) : 0xf6f4ee);
    });
    for (const sx of [-1, 1]) for (let z = 3; z <= 11; z++) v.set(sx * 8, 1, z, 0xf6f4ee);
    return v;
  },
  yenshades() {
    const F = gloss(0xf6c838), L = gloss(0x1a1418), AU = gloss(0xffe070), v = vm(0.01);
    const YEN = ['#...#', '.#.#.', '..#..', '#####', '..#..', '#####', '..#..'];
    for (const sx of [-1, 1]) {
      each(1, 8, -5, 4, 12, 12, (x, y, z) => {
        const edge = x === 1 || x === 8 || y === 4 || y === -5;
        const gx = x - 2, gy = 3 - y;
        const lit = gx >= 0 && gx < 5 && gy >= 0 && gy < 7 && YEN[gy][gx] === '#';
        v.set(sx * x, y, z, edge ? F : lit ? AU : L);
      });
      for (let z = 3; z <= 11; z++) v.set(sx * 9, 2, z, F);
    }
    v.set(0, 2, 12, F);
    return v;
  },
  bandaid() {
    const v = vm(0.01);
    const B = 0xf2b890, B2 = 0xd89070, PAD = 0xf8e4d0;
    // two crossed plasters on the cheek, one across the nose
    for (const sx of [-1, 1]) for (let i = -3; i <= 3; i++) for (const w of [0, 1]) v.set(-4 + i, -4 + sx * i + w, 11, Math.abs(i) <= 1 ? PAD : (i + w) % 2 ? B2 : B);
    for (let x = -3; x <= 3; x++) for (const y of [-3, -2]) v.set(x, y, 12, Math.abs(x) <= 1 ? PAD : B);
    return v;
  },
  // ================================================================== side-worn festival masks (kitsune frame)
  maskBase(skin, paint) {
    const v = vm(0.015);
    for (let y = -7; y <= 6; y++) for (let x = -6; x <= 6; x++) {
      const w = y > 2 ? 5.6 - (y - 2) * 0.5 : y < -4 ? 5.6 - (-4 - y) * 1.1 : 5.6;
      if (Math.abs(x) > w + 0.3) continue;
      const zt = Math.round(2.6 - (x / (w + 0.5)) ** 2 * 1.6);
      for (let z = 0; z <= zt; z++) v.set(x, y, z, z === 0 ? skin - 0x101010 : skin);
    }
    paint(v);
    return v;
  },
  hyottoko() {
    return VX.maskBase(0xf4e4cc, (v) => {
      for (const sx of [-1, 1]) { front(v, sx * 2, 2, INK); front(v, sx * 3, 2, INK); front(v, sx * 2, 4, INK); front(v, sx * 3, 5, INK); front(v, sx * 4, 4, INK); }
      // round cheeks, the puckered mouth off to one side
      front(v, -4, -2, 0xf0a0a0); front(v, 4, -2, 0xf0a0a0);
      each(1, 4, -6, -3, 3, 6, (x, y, z) => { if (Math.hypot(x - 2.5, y + 4.5, z - 4.2) < 1.8) v.set(x, y, z, Math.hypot(x - 2.5, y + 4.5) < 0.8 ? 0x9a2a2a : 0xf0c8b0); });
      front(v, -5, 6, 0x3a6ab8); front(v, 5, 6, 0x3a6ab8); front(v, 0, 6, 0x3a6ab8);
    });
  },
  onimask() {
    const R = 0xd8382e;
    return VX.maskBase(R, (v) => {
      for (const sx of [-1, 1]) {
        front(v, sx * 2, 2, gloss(0xffd23f)); front(v, sx * 3, 2, gloss(0xffd23f)); front(v, sx * 2, 1, INK);
        front(v, sx * 1, 4, INK); front(v, sx * 2, 4, INK); front(v, sx * 3, 5, INK); front(v, sx * 4, 5, INK);
        front(v, sx * 2, -5, 0xfff6e0); front(v, sx * 2, -6, 0xfff6e0);
        for (let y = 6; y <= 10; y++) v.set(sx * (3 + (y - 6) * 0.3) | 0, y, 1, y > 8 ? 0xfff6dc : 0xf4e2a8);
      }
      for (let x = -3; x <= 3; x++) front(v, x, -4, INK);
      front(v, 0, 0, 0xa82a22); front(v, 0, -1, 0xa82a22);
    });
  },

  // ================================================================== voxel bags (metric voxels on the chest bone)
  capsulePack() {
    const v = vm(0.02);
    const R = gloss(0xe5383b), C = gloss(0xf4f2ee), RIM = 0xb02a30;
    blob(v, [0, 0, -7], [10, 11, 7.5], (x, y, z) => (z > -2 ? null : Math.abs(y) <= 0 ? RIM : y > 0 ? R : C));
    // straps over the shoulders + a little window showing a figure inside
    for (const sx of [-1, 1]) for (let y = -9; y <= 13; y++) v.set(sx * 6, y, y > 9 ? Math.round(-1 + (y - 9) * 0.9) : -1, 0x2a2428);
    each(-3, 3, -7, -3, -15, -14, (x, y, z) => v.set(x, y, z, gloss(0xffd23f)));
    return v;
  },
  teddyPack() {
    const v = vm(0.03);
    const B = 0x9a6a42, B2 = 0x7a5232, M = 0xe0bc88;
    blob(v, [0, -2, -6], [8.5, 9.5, 6], (x, y, z) => (z > -1 ? null : hash(x, y, z, 3) > 0.85 ? B2 : B));
    blob(v, [0, 10, -6], [6.5, 5.5, 5.5], (x, y, z) => (z > -1 ? null : B));
    for (const sx of [-1, 1]) { blob(v, [sx * 5, 15, -6], [2.2, 2.2, 1.6], B2); blob(v, [sx * 4, -10, -9], [2.6, 2, 2.6], B2); }
    blob(v, [0, 8.5, -11], [2.6, 2, 1.4], M);
    v.set(0, 9, -13, gloss(INK)).set(-2, 11, -12, gloss(INK)).set(2, 11, -12, gloss(INK));
    for (const sx of [-1, 1]) for (let y = -8; y <= 13; y++) v.set(sx * 6, y, y > 9 ? Math.round(-1 + (y - 9) * 0.9) : -1, 0x5a3a24);
    return v;
  },
};

function shade(c, k) { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; const f = (v) => Math.max(0, Math.min(255, Math.round(v * k + (k > 1 ? 18 : 0)))); return (f(r) << 16) | (f(g) << 8) | f(b); }
