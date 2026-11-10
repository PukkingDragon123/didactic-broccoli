// Garden and shrine decor (ids from src/data/props/decor_nature.js): house plants, a bonsai, bamboo, the cherry, the
// maple and the black pine, stones, hydrangeas, a stone lantern, a torii, chōchin, an andon, the red nodate parasol,
// a bamboo fence, the koi pond, Mt. Fuji on a table, a shishi-odoshi and a tuft of grass.
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, bush, tones, leafy, leaf, leafRing, blade, flower, pot, planter, plank, dirtBox, TERRA } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot } from '../kit/prints.js';
import { leaves } from '../kit/foliage.js';

const BARK = 0x4a3830, VERM = 0xc8402a, BAMBOO = 0x7aa850, SOIL = 0x4a3828;
const rock = (K, c = 0x8a8c88) => tones(K, c, { light: lighten(c, 0.2), dark: darken(c, 0.28), hi: 0.4, lo: 0.0, rough: 0.95 });
/** A tree: a trunk through `trunk` (radii `tr`), limbs [[points], r], foliage pads [[x, y, z, rx, ry, rz, tone]]. */
function tree(K, o) {
  const bk = stone(o.bark ?? BARK, 0.14);
  K.tube(bk, o.trunk, 0.1, 7, { radii: o.tr });
  for (const [pts, r] of o.limbs || []) K.tube(bk, pts, r, 5, { r1: r * 0.45 });
  const T = o.tones;
  (o.pads || []).forEach(([x, y, z, rx, ry, rz, t], i) => blob(K, T[t ?? i % T.length], x, y, z, rx, ry, rz, { fine: 2, jit: o.jit ?? 0.15, seed: i * 13 + (o.seed ?? 3), flatY: o.flat }));
}
/** A paper chōchin hanging from (x, y, z): red with a black hoop top and bottom, a kanji on its belly; lit (slot 3). */
function chochin(K, x, y, z, r, h, text) {
  K.cyl(flat(0x26221e, 0.6), x, y - h * 0.08, z, r * 0.5, h * 0.08, 8); K.cyl(flat(0x26221e, 0.6), x, y - h, z, r * 0.5, h * 0.08, 8);
  const V = K.patch('chochin' + text, 64, 40, (V) => { V.fill(0xd8463a); for (let j = 3; j < 40; j += 5) V.hline(0, 63, j, 0xb8362c); kana(K, V, text, 8, 30, 0x26221e, { size: 16 }); kana(K, V, text, 40, 30, 0x26221e, { size: 16 }); }, { shared: true, bright: true });
  K.glow(() => K.wrapProfile(V, x, z, [[r * 0.55, y - h * 0.92], [r, y - h * 0.68], [r, y - h * 0.32], [r * 0.55, y - h * 0.08]], { n: 8, lift: 0 }));
}

export default {
  family: 'decor',
  models: {
    // ------------------------------------------------------------- pothos on a stand (0.435 x 0.855 x 0.435)
    plant_pothos: (K, B) => {
      const w = 0x9a6a40, hw = 0.16;
      for (const y of [0.2, 0.56]) plank(K, w, -hw, y, -hw, hw, y + 0.02, hw, { bevel: 0.004 });
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) plank(K, darken(w, 0.1), x * hw - (x > 0 ? 0.03 : 0), 0, z * hw - (z > 0 ? 0.03 : 0), x * hw + (x > 0 ? 0 : 0.03), 0.56, z * hw + (z > 0 ? 0 : 0.03), { axis: 'y', v: 1 });
      const ys = pot(K, 0, 0.58, 0, 0.11, 0.14, { c: ceramic(0xe6e2d8), n: 10 });
      bush(K, 0x4a9044, -0.15, ys - 0.02, -0.15, 0.15, B.y1, 0.15, { n: 3, seed: 4 });
      // trailing vines down the sides
      for (let v = 0; v < 6; v++) { const a = v * 1.05 + 0.3, len = 0.3 + (v % 3) * 0.12; let p = [Math.cos(a) * 0.12, ys + 0.02, Math.sin(a) * 0.12]; for (let k = 0; k < 6; k++) { const q = [Math.cos(a) * (0.16 + k * 0.006), ys - (k + 1) * len / 6, Math.sin(a) * (0.16 + k * 0.006)]; leaf(K, flat(k % 2 ? 0x4a9044 : 0x6aac50, 0.9), p, [q[0] + Math.cos(a + 1.2) * 0.04, q[1] - 0.02, q[2] + Math.sin(a + 1.2) * 0.04], 0.05); p = q; } }
    },
    // ------------------------------------------------------------- a monstera (0.72 x 1.3 x 0.74)
    plant_monstera: (K, B) => {
      const ys = pot(K, 0, 0, 0, 0.17, 0.26, { c: ceramic(0x2f5a8a), n: 10 });
      const L = [[0.3, 0.9, 0.1, 0.34], [-0.28, 1.05, -0.05, 0.36], [0.05, 1.2, -0.28, 0.32], [-0.1, 0.8, 0.3, 0.3], [0.25, 0.65, -0.2, 0.26], [-0.3, 0.6, 0.15, 0.24], [0.02, 1.26, 0.06, 0.28]];
      L.forEach(([x, y, z, s], i) => {
        K.tube(flat(0x4a8a48, 0.8), [[x * 0.08, ys, z * 0.08], [x * 0.5, y * 0.6, z * 0.5], [x * 0.85, y - 0.04, z * 0.85]], 0.012, 4, { r1: 0.007 });
        // a split leaf: a heart cut into fingers
        const c = flat(i % 2 ? 0x3f8a44 : 0x57a04e, 0.85), n = [x, 0.9, z], l = Math.hypot(...n), up = n.map((v) => v / l), ax = Math.atan2(z, x);
        K.at([x * 0.85, y - 0.04, z * 0.85], () => { for (let k = -3; k <= 3; k++) { if (k === 0) continue; const a = k * 0.36, r = s * (0.52 - Math.abs(k) * 0.05); K.tri(c, [0, 0, 0], [Math.sin(a - 0.13) * r, 0.02, Math.cos(a - 0.13) * r], [Math.sin(a + 0.13) * r, 0.02, Math.cos(a + 0.13) * r], [0, 1, 0]); K.tri(flat(0x356f3c, 0.85), [0, 0, 0], [Math.sin(a - 0.13) * r, 0.02, Math.cos(a - 0.13) * r], [Math.sin(a + 0.13) * r, 0.02, Math.cos(a + 0.13) * r], [0, -1, 0]); } K.tri(c, [0, 0, 0], [-0.04 * s, 0.02, s * 0.56], [0.04 * s, 0.02, s * 0.56], [0, 1, 0]); }, { ry: -ax + 1.5708, rx: -0.5 });
        void up;
      });
      void B;
    },
    // ------------------------------------------------------------- a pine bonsai on its table (0.588 x 0.763 x 0.338)
    bonsai: (K, B) => {
      const w = 0x5a3a28;
      plank(K, w, B.x0, 0.1, B.z0 + 0.02, B.x1, 0.13, B.z1 - 0.02, { bevel: 0.004 }); for (const [x, z] of [[B.x0 + 0.03, B.z0 + 0.04], [B.x1 - 0.06, B.z0 + 0.04], [B.x0 + 0.03, B.z1 - 0.07], [B.x1 - 0.06, B.z1 - 0.07]]) K.box(wood(darken(w, 0.1)), x, 0, z, x + 0.03, 0.1, z + 0.03);
      planter(K, ceramic(0x4a5a52), -0.2, 0.13, -0.1, 0.2, 0.2, 0.1, { t: 0.012, soil: 0x5a7a44, drop: 0.012 });
      // the trunk and limbs; the needle pads are the town's pine sprig crowns, flat underneath like clipped pads
      tree(K, { trunk: [[-0.02, 0.19, 0], [0.02, 0.32, 0.01], [-0.05, 0.44, 0], [0.0, 0.56, -0.01]], tr: [0.035, 0.028, 0.02, 0.012], limbs: [[[[0.02, 0.32, 0.01], [0.14, 0.38, 0.02]], 0.014], [[[-0.05, 0.44, 0], [-0.17, 0.46, 0.01]], 0.012], [[[0.0, 0.5, 0], [0.05, 0.66, -0.01]], 0.01]], tones: [], pads: [] });
      leaves(K, (t, F) => { [[0.17, 0.42, 0.02, 0.1, 0.04, 0.09], [-0.19, 0.5, 0.0, 0.1, 0.04, 0.08], [0.0, 0.62, 0.0, 0.13, 0.05, 0.11], [0.06, 0.7, -0.01, 0.09, 0.045, 0.08], [-0.06, 0.34, 0.06, 0.06, 0.03, 0.05]].forEach(([x, y, z, rx, ry, rz], i) => F.crown(t, x, y + 0.012, z, rx * 1.05, ry * 1.1, rz * 1.05, { kind: 'pine', flat: -0.15, card: 0.085, density: 3.2, tilt: 0.35, seed: 7 + i * 5 })); });
      blob(K, rock(K), 0.12, 0.2, 0.04, 0.035, 0.025, 0.03, { seed: 2 }); void B;
    },
    // ------------------------------------------------------------- bamboo in a planter (1.155 x 2.625 x 0.84)
    bamboo: (K, B) => {
      const ys = planter(K, wood(0x7a5a3a), -0.42, 0, -0.26, 0.42, 0.34, 0.26, { t: 0.03, bevel: 0.01 });
      for (const y of [0.06, 0.26]) K.box(metal(0x4a4a4e, 0.2), -0.425, y, -0.265, 0.425, y + 0.03, 0.265);
      for (let c = 0; c < 9; c++) {
        const x = -0.32 + (c % 5) * 0.16 + ((c * 0.37) % 1) * 0.04, z = -0.12 + (c % 3) * 0.12, h = 1.7 + ((c * 0.61) % 1) * 0.85, lean = ((c * 0.29) % 1 - 0.5) * 0.25, col = c % 3 ? BAMBOO : darken(BAMBOO, 0.12);
        K.tube(matte(col, 0.2), [[x, ys, z], [x + lean * 0.4, h * 0.5, z], [x + lean, h, z + lean * 0.3]], 0.022, 6, { r1: 0.012 });
        for (let k = 1; k < 7; k++) { const t = k / 7; K.torus(flat(darken(col, 0.25), 0.8), x + lean * t * (t < 0.5 ? 0.8 : 1), ys + (h - ys) * t, z + lean * 0.3 * Math.max(0, t * 2 - 1), 0.021 - t * 0.008, 0.003, 6, 3); }
        for (let k = 0; k < 5; k++) { const t = 0.5 + k * 0.1, bx = x + lean * t, by = ys + (h - ys) * t, a = c * 2 + k * 2.2; for (let j = 0; j < 3; j++) leaf(K, flat((k + j) % 2 ? 0x5a9a48 : 0x74b058, 0.9), [bx, by, z], [bx + Math.cos(a + j * 0.5) * 0.24, by + 0.06 - j * 0.07, z + Math.sin(a + j * 0.5) * 0.2], 0.05, { at: 0.5 }); }
      }
      void B;
    },
    // ------------------------------------------------------------- the cherry in bloom (2.08 x 2.88 x 1.64)
    sakura_tree: (K, B) => {
      const p = [tones(K, 0xf4b8c8, { light: 0xf8d4de, dark: 0xe090aa, rough: 0.95 }), tones(K, 0xf8ccd8, { light: 0xfbe0e8, dark: 0xe8a0b6, rough: 0.95 })];
      tree(K, { bark: 0x4a342e, trunk: [[0, 0, 0], [0.04, 0.6, 0.02], [-0.03, 1.2, 0], [0.05, 1.7, 0.0]], tr: [0.16, 0.11, 0.095, 0.07], limbs: [[[[-0.03, 1.2, 0], [-0.5, 1.75, 0.1], [-0.75, 2.0, 0.15]], 0.06], [[[0.05, 1.5, 0], [0.5, 1.9, -0.15], [0.72, 2.1, -0.2]], 0.06], [[[0.0, 1.4, 0], [0.1, 1.9, 0.4]], 0.05]], tones: p,
        pads: [[-0.62, 2.1, 0.15, 0.4, 0.3, 0.38], [0.62, 2.2, -0.2, 0.4, 0.3, 0.36], [0.05, 2.45, 0.05, 0.5, 0.36, 0.45], [0.1, 2.05, 0.5, 0.36, 0.26, 0.3], [-0.2, 2.2, -0.45, 0.36, 0.26, 0.3], [0.35, 1.85, 0.3, 0.26, 0.2, 0.24], [-0.35, 1.8, -0.2, 0.24, 0.18, 0.22]] });
      for (let k = 0; k < 16; k++) { const a = k * 2.4, r = 0.3 + ((k * 0.37) % 1) * 0.6; K.quad(flat(k % 2 ? 0xf4b8c8 : 0xf8d4de, 0.9), [Math.cos(a) * r - 0.03, 0.004, Math.sin(a) * r * 0.75], [Math.cos(a) * r, 0.005, Math.sin(a) * r * 0.75 - 0.03], [Math.cos(a) * r + 0.03, 0.004, Math.sin(a) * r * 0.75], [Math.cos(a) * r, 0.005, Math.sin(a) * r * 0.75 + 0.03], [0, 1, 0]); }
      void B;
    },
    // ------------------------------------------------------------- the maple in autumn (1.645 x 2.45 x 1.295)
    momiji_tree: (K, B) => {
      const p = [tones(K, 0xd8482a, { light: 0xf07a3a, dark: 0xa8302a, rough: 0.95 }), tones(K, 0xe8742a, { light: 0xf2a03a, dark: 0xc04a26, rough: 0.95 }), tones(K, 0xc8382a, { light: 0xe85a34, dark: 0x982a28, rough: 0.95 })];
      tree(K, { bark: 0x3a2c28, trunk: [[0, 0, 0], [-0.03, 0.6, 0], [0.04, 1.1, 0.02]], tr: [0.12, 0.085, 0.07], limbs: [[[[0.04, 1.0, 0], [0.42, 1.5, 0.1]], 0.05], [[[0.0, 1.0, 0], [-0.42, 1.55, -0.05]], 0.05], [[[0.02, 1.1, 0], [0.05, 1.7, -0.2]], 0.045]], tones: p,
        pads: [[0.48, 1.65, 0.1, 0.34, 0.2, 0.3], [-0.48, 1.7, -0.05, 0.34, 0.2, 0.3], [0.05, 2.0, -0.1, 0.42, 0.26, 0.36], [0.0, 1.55, 0.3, 0.3, 0.18, 0.26], [-0.1, 2.25, 0.05, 0.28, 0.18, 0.24], [0.3, 1.95, -0.3, 0.24, 0.15, 0.22]] });
      for (let k = 0; k < 14; k++) { const a = k * 2.4, r = 0.25 + ((k * 0.37) % 1) * 0.5; K.tri(flat([0xd8482a, 0xe8742a, 0xe8a03a][k % 3], 0.9), [Math.cos(a) * r - 0.03, 0.004, Math.sin(a) * r * 0.7], [Math.cos(a) * r + 0.03, 0.004, Math.sin(a) * r * 0.7 - 0.01], [Math.cos(a) * r, 0.005, Math.sin(a) * r * 0.7 + 0.035], [0, 1, 0]); }
      void B;
    },
    // ------------------------------------------------------------- a black pine, cloud pruned (1.995 x 2.45 x 1.015)
    pine_tree: (K, B) => {
      const g = [leafy(K, 0x2f6a3a), leafy(K, 0x3a7a42)];
      tree(K, { bark: 0x3e3230, trunk: [[0.1, 0, 0], [-0.1, 0.6, 0], [0.12, 1.2, 0.02], [-0.05, 1.8, 0], [0.0, 2.15, 0]], tr: [0.15, 0.11, 0.09, 0.06, 0.04], limbs: [[[[-0.1, 0.7, 0], [-0.6, 0.95, 0.05]], 0.05], [[[0.12, 1.2, 0], [0.65, 1.4, -0.05]], 0.05], [[[-0.05, 1.7, 0], [-0.5, 1.85, 0.05]], 0.04]], tones: g,
        pads: [[-0.7, 1.02, 0.05, 0.3, 0.1, 0.26], [0.72, 1.48, -0.05, 0.3, 0.1, 0.26], [-0.55, 1.92, 0.05, 0.26, 0.09, 0.22], [0.0, 2.3, 0.0, 0.36, 0.13, 0.3], [0.3, 1.95, 0.1, 0.2, 0.08, 0.18], [0.1, 0.9, 0.2, 0.18, 0.07, 0.16]], flat: -0.45, jit: 0.1 });
      K.lathe(leafy(K, 0x5c8a44), [0.1, 0, 0], [[0.3, 0.003], [0, 0.03]], 8); void B;
    },
    // ------------------------------------------------------------- mossy rocks (0.94 x 0.36 x 0.54), the standing stone in raked gravel (0.82 x 0.96 x 0.82)
    rock_moss: (K, B) => {
      const r = rock(K), m = leafy(K, 0x5c8a44);
      blob(K, r, -0.18, 0.13, -0.02, 0.26, 0.2, 0.2, { fine: true, jit: 0.22, seed: 3, flatY: -0.7 }); blob(K, r, 0.22, 0.1, 0.03, 0.22, 0.14, 0.2, { fine: true, jit: 0.22, seed: 7, flatY: -0.7 }); blob(K, r, 0.02, 0.07, 0.17, 0.14, 0.09, 0.1, { jit: 0.2, seed: 9, flatY: -0.7 });
      blob(K, m, -0.2, 0.3, -0.03, 0.17, 0.045, 0.14, { fine: true, jit: 0.2, seed: 4 }); blob(K, m, 0.26, 0.21, 0.0, 0.13, 0.035, 0.12, { jit: 0.2, seed: 5 }); blob(K, m, 0.05, 0.02, -0.16, 0.2, 0.03, 0.08, { jit: 0.2, seed: 6 });
      for (let k = 0; k < 4; k++) blade(K, flat(0x6aa052, 0.9), [0.38 + k * 0.012, 0, 0.14], [0.36 + k * 0.03, 0.14 + (k % 2) * 0.05, 0.16], 0.02); void B;
    },
    rock_zen: (K, B) => {
      const w = B.w / 2, sand = 0xd8d2c0;
      K.box(matte(sand, 0.1), -w + 0.02, 0, -w + 0.02, w - 0.02, 0.05, w - 0.02); for (const [a, b, c, d] of [[-w, -w, w, -w + 0.03], [-w, w - 0.03, w, w], [-w, -w + 0.03, -w + 0.03, w - 0.03], [w - 0.03, -w + 0.03, w, w - 0.03]]) plank(K, 0x5a4636, a, 0, b, c, 0.07, d, { bevel: 0.004 });
      for (const r of [0.2, 0.27, 0.34]) K.torus(flat(darken(sand, 0.12), 0.95), 0.02, 0.05, 0.0, r, 0.006, 14, 3); for (let k = 0; k < 5; k++) K.box(flat(darken(sand, 0.12), 0.95), -w + 0.05, 0.05, -w + 0.06 + k * 0.03, w - 0.05, 0.053, -w + 0.068 + k * 0.03);
      K.tube(rock(K, 0x6a6e72), [[0.02, 0.04, 0], [0.0, 0.45, 0.02], [0.05, 0.94, -0.01]], 0.13, 6, { radii: [0.16, 0.13, 0.03] });
      blob(K, rock(K), -0.2, 0.08, 0.2, 0.07, 0.05, 0.06, { seed: 3, jit: 0.2 }); blob(K, leafy(K, 0x5c8a44), 0.02, 0.06, 0.02, 0.19, 0.02, 0.17, { seed: 5, jit: 0.15 }); void B;
    },
    // ------------------------------------------------------------- hydrangeas in a planter (1.02 x 0.52 x 0.52)
    flower_bed: (K, B) => {
      const w = B.w / 2, d = B.d / 2;
      for (let r = 0; r < 3; r++) for (const s of [-1, 1]) { plank(K, 0x8a5234, -w, r * 0.085, s * d - (s > 0 ? 0.03 : 0), w, r * 0.085 + 0.08, s * d + (s > 0 ? 0 : 0.03), { v: r, bevel: 0.003 }); plank(K, 0x8a5234, s * w - (s > 0 ? 0.03 : 0), r * 0.085, -d + 0.03, s * w + (s > 0 ? 0 : 0.03), r * 0.085 + 0.08, d - 0.03, { v: r + 1 }); }
      K.box(flat(SOIL, 0.98), -w + 0.03, 0.1, -d + 0.03, w - 0.03, 0.22, d - 0.03);
      bush(K, 0x3f8040, -w + 0.04, 0.2, -d + 0.04, w - 0.04, 0.36, d - 0.04, { n: 5, seed: 6 });
      const cols = [[0x6a8ad8, 0x8aa8e8], [0x8a6ad0, 0xa88ae0], [0x5a9ad8, 0x8ac0e8], [0xa87ad0, 0xc4a0e4]];
      [[-0.34, 0.4, 0.02], [-0.1, 0.43, -0.05], [0.14, 0.41, 0.06], [0.36, 0.42, -0.02], [0.02, 0.38, 0.14]].forEach(([x, y, z], i) => blob(K, tones(K, cols[i % 4][0], { light: cols[i % 4][1], dark: darken(cols[i % 4][0], 0.2), rough: 0.9 }), x, y, z, 0.12, 0.09, 0.11, { fine: true, jit: 0.1, seed: i * 5 + 2 }));
      void B;
    },
    // ------------------------------------------------------------- a stone lantern (0.625 x 1.325 x 0.475), its window lit
    stone_lantern: (K, B) => {
      const s = stone(0x9a9c96), n = 6;
      K.cyl(s, 0, 0, 0, 0.22, 0.1, n, { bevel: 0.02 }); K.cyl(s, 0, 0.1, 0, 0.09, 0.5, n); K.lathe(s, [0, 0.6, 0], [[0.09, 0], [0.2, 0.08], [0.2, 0.12], [0.13, 0.12]], n);
      K.cyl(s, 0, 0.72, 0, 0.13, 0.22, n, { caps: false }); K.glow(() => { K.box(flat(0xf6d28a), -0.06, 0.76, 0.108, 0.06, 0.9, 0.114); K.box(flat(0xf6d28a), -0.06, 0.76, -0.114, 0.06, 0.9, -0.108); });
      for (const z of [0.115, -0.115]) { K.box(s, -0.008, 0.76, z - 0.004, 0.008, 0.9, z + 0.004); K.box(s, -0.06, 0.825, z - 0.004, 0.06, 0.838, z + 0.004); }
      K.lathe(s, [0, 0.94, 0], [[0.13, 0], [0.3, 0.03], [0.31, 0.06], [0.1, 0.2], [0.05, 0.22]], n); K.lathe(s, [0, 1.16, 0], [[0.05, 0], [0.07, 0.05], [0.04, 0.12], [0, 0.16]], n);
      for (const [x, y, z, r] of [[0.1, 1.06, 0.1, 0.08], [-0.16, 0.1, 0.1, 0.07], [0.0, 0.69, -0.14, 0.05]]) blob(K, leafy(K, 0x5c8a44), x, y, z, r, 0.02, r * 0.8, { seed: Math.round(x * 100 + y * 10), jit: 0.2 });
      dirtBox(K, 0x9a9c96, -0.2, -0.2, 0.2, 0.2, 0, 0.03); void B;
    },
    // ------------------------------------------------------------- a torii (2.12 x 2.32 x 0.2)
    torii: (K, B) => {
      const v = paint(VERM, 0.2), blk = paint(0x26221e, 0.15);
      K.sym((s) => { K.cyl(v, s * 0.78, 0.2, 0, 0.075, 1.8, 10, { r1: 0.065 }); K.cyl(blk, s * 0.78, 0, 0, 0.09, 0.2, 10, { bevel: 0.01 }); });
      K.box(v, -0.96, 1.52, -0.045, 0.96, 1.64, 0.045, { bevel: 0.008 }); // nuki
      K.prism(v, [[-1.04, 1.98], [1.04, 1.98], [1.06, 2.12], [-1.06, 2.12]], { plane: 'xy', a: -0.06, b: 0.06 }); // shimaki
      K.prism(blk, [[-1.06, 2.12], [1.06, 2.12], [1.06, B.y1 - 0.02], [0.5, 2.2], [-0.5, 2.2], [-1.06, B.y1 - 0.02]], { plane: 'xy', a: -0.085, b: 0.085 }); // kasagi, its ends swept up
      const pl = K.patch('gaku', 28, 44, (V) => { framed(V, 0x26221e, 0xd8a83a); kana(K, V, '稲荷', 6, 40, 0xd8a83a, { size: 16, vert: true }); }, { rough: 0.5 });
      K.box(blk, -0.09, 1.66, -0.02, 0.09, 1.96, 0.05); K.face(pl, '+z', -0.08, 1.67, 0.08, 1.95, 0.0512); K.face(pl, '-z', -0.08, 1.67, 0.08, 1.95, -0.0212);
      for (const s of [-1, 1]) K.box(v, s * 0.78 - 0.03, 1.5, -0.07, s * 0.78 + 0.03, 1.66, 0.07); // the wedges
    },
    // ------------------------------------------------------------- a rack of four chōchin (1.075 x 1.85 x 0.35)
    chochin_stand: (K, B) => {
      const w = 0x4a2e22;
      K.sym((s) => { plank(K, w, s * 0.48 - 0.03, 0.06, -0.03, s * 0.48 + 0.03, B.y1, 0.03, { axis: 'y', bevel: 0.004 }); plank(K, w, s * 0.48 - 0.035, 0, B.z0, s * 0.48 + 0.035, 0.07, B.z1, { bevel: 0.006, v: 1 }); });
      for (const y of [1.74, 0.98]) plank(K, w, -0.52, y, -0.025, 0.52, y + 0.05, 0.025, { bevel: 0.004, v: 2 });
      for (const y of [1.74, 0.98]) for (const x of [-0.22, 0.22]) { K.rod(flat(0x26221e, 0.8), [x, y, 0], [x, y - 0.06, 0], 0.003, 3); chochin(K, x, y - 0.06, 0, 0.15, 0.56, y > 1.2 ? '祭' : '祝'); }
    },
    // ------------------------------------------------------------- an andon (0.405 x 0.93 x 0.405): lit paper in a wooden frame
    andon_lamp: (K, B) => {
      const w = 0x6a4a34, h = 0.18;
      K.glow(() => K.box(flat(0xf8e6b8), -h + 0.012, 0.1, -h + 0.012, h - 0.012, 0.84, h - 0.012));
      for (const [x, z] of [[-h, -h], [h - 0.02, -h], [-h, h - 0.02], [h - 0.02, h - 0.02]]) plank(K, w, x, 0, z, x + 0.02, 0.88, z + 0.02, { axis: 'y' });
      for (const y of [0.08, 0.46, 0.84]) for (const s of [-1, 1]) { K.box(wood(w), -h, y, s * h - (s > 0 ? 0.016 : 0), h, y + 0.016, s * h + (s > 0 ? 0 : 0.016)); K.box(wood(w), s * h - (s > 0 ? 0.016 : 0), y, -h, s * h + (s > 0 ? 0 : 0.016), y + 0.016, h); }
      K.tube(wood(darken(w, 0.1)), [[-h + 0.01, 0.88, 0], [0, B.y1 - 0.012, 0], [h - 0.01, 0.88, 0]], 0.008, 4);
    },
    // ------------------------------------------------------------- the nodate parasol over a red bench (1.645 x 2.135 x 1.645)
    wagasa_parasol: (K, B) => {
      const red = 0xc8302a, R = 0.8, py = 1.9, px = 0, pz = -0.18;
      K.cyl(wood(0x5a3a28), px, 0, pz, 0.022, py + 0.16, 6); K.cyl(stone(0x8a8c88), px, 0, pz, 0.12, 0.08, 8, { bevel: 0.02 });
      K.lathe(fabric(red), [px, py - 0.22, pz], [[R, 0], [R * 0.6, 0.14], [0.03, 0.3]], 16); K.lathe(flat(0xe8c8a0, 0.9), [px, py - 0.22, pz], [[R, -0.002], [R * 0.6, 0.136], [0.03, 0.296]], 16, { flip: true });
      for (let k = 0; k < 16; k++) { const a = k * 0.3927 + 0.196; K.rod(flat(0x8a2622, 0.9), [px + Math.sin(a) * R, py - 0.218, pz + Math.cos(a) * R], [px + Math.sin(a) * 0.03, py + 0.082, pz + Math.cos(a) * 0.03], 0.004, 3, { caps: false }); }
      for (const r of [0.5, 0.72]) K.torus(flat(0xf2efe6, 0.9), px, py - 0.22 + (R - r) * 0.35 + 0.004, pz, r, 0.006, 16, 3); K.cyl(flat(0x26221e, 0.6), px, py + 0.08, pz, 0.035, 0.05, 8); K.ball(metal(0xd8a83a, 0.3), px, py + 0.15, pz, 0.02, 0.02, 0.02, 6, 3);
      // the bench with its red felt
      const bz = 0.42;
      plank(K, 0x6a4a34, -0.55, 0.36, bz - 0.2, 0.55, 0.4, bz + 0.2, { bevel: 0.004 }); for (const [x, z] of [[-0.5, bz - 0.16], [0.45, bz - 0.16], [-0.5, bz + 0.11], [0.45, bz + 0.11]]) K.box(wood(0x5a3a28), x, 0, z, x + 0.05, 0.36, z + 0.05);
      K.box(fabric(red), -0.57, 0.4, bz - 0.22, 0.57, 0.415, bz + 0.22); K.box(fabric(red), -0.57, 0.2, bz + 0.215, 0.57, 0.41, bz + 0.225);
      K.lathe(ceramic(0x3a5a4a), [0.25, 0.415, bz], [[0, 0], [0.03, 0], [0.045, 0.05], [0.04, 0.05], [0.028, 0.01], [0, 0.01]], 8); void B;
    },
    // ------------------------------------------------------------- a bamboo fence panel (1.02 x 1.22 x 0.12)
    bamboo_fence: (K, B) => {
      const c = 0xc8b86a;
      for (let k = 0; k < 14; k++) { const x = B.x0 + 0.05 + k * (B.w - 0.1) / 13; K.cyl(matte(k % 3 ? c : darken(c, 0.1), 0.2), x, 0.03, 0, 0.03, 1.15, 6); for (const y of [0.35, 0.75]) K.torus(flat(darken(c, 0.3), 0.8), x, y + (k % 2) * 0.05, 0, 0.03, 0.003, 6, 3); }
      for (const y of [0.2, 0.6, 1.0]) for (const z of [-0.04, 0.04]) K.cyl(matte(darken(c, 0.15), 0.2), B.x0, y, z, 0.022, B.w, 6, { axis: 'x' });
      for (let k = 0; k < 14; k += 2) for (const y of [0.2, 0.6, 1.0]) { const x = B.x0 + 0.05 + k * (B.w - 0.1) / 13; K.box(flat(0x26221e, 0.9), x - 0.034, y - 0.012, -0.05, x + 0.034, y + 0.012, 0.05); }
      K.sym((s) => K.cyl(wood(0x5a4636), s * (B.w / 2 - 0.03), 0, 0, 0.035, B.y1, 6));
    },
    // ------------------------------------------------------------- the koi pond (1.96 x 0.48 x 1.76)
    koi_pond: (K, B) => {
      const r = rock(K), rx = 0.82, rz = 0.72;
      K.lathe(flat(0x3a6a8a, 0.15), [0, 0.1, 0], [[rx, 0], [0, 0]], 14, { sz: rz / rx }); K.lathe(flat(0x2a5070, 0.2), [0, 0.1, 0], [[rx * 0.6, 0.001], [0, 0.001]], 12, { sz: rz / rx });
      for (let k = 0; k < 15; k++) { const a = k * 0.4189, s = 0.14 + ((k * 0.37) % 1) * 0.1; blob(K, r, Math.cos(a) * (rx + 0.05), 0.09, Math.sin(a) * (rz + 0.05), s, 0.09 + ((k * 0.61) % 1) * 0.08, s * 0.9, { seed: k + 2, jit: 0.22, flatY: -0.8 }); }
      for (const [x, z, ry, c] of [[0.2, 0.1, 0.5, 0xe8642a], [-0.3, -0.15, 2.2, 0xf2efe6], [0.0, 0.35, -1.0, 0xe8a02a], [-0.1, -0.4, 0.2, 0xf2efe6]]) K.at([x, 0.104, z], () => { K.prism(flat(c, 0.4), [[-0.1, 0], [-0.02, 0.035], [0.08, 0.02], [0.14, 0.05], [0.14, -0.05], [0.08, -0.02], [-0.02, -0.035]], { plane: 'xz', a: 0, b: 0.004, caps: 'a' }); if (c === 0xf2efe6) K.box(flat(0xe8642a, 0.4), -0.04, 0.004, -0.02, 0.02, 0.0046, 0.02); }, { ry });
      for (const [x, z, s] of [[0.45, -0.3, 0.1], [0.55, -0.15, 0.07], [-0.5, 0.3, 0.09]]) { K.lathe(flat(0x4a9048, 0.8), [x, 0.106, z], [[s, 0], [0, 0]], 8, { arc: 5.6, a0: 0.3 }); }
      flower(K, flat(0xf4b8c8, 0.7), [0.47, 0.12, -0.3], 0.04, { dir: [0, 1, 0.2], eye: flat(0xf2c21c) });
      for (let k = 0; k < 5; k++) blade(K, flat(0x5a9048, 0.9), [-0.75 + k * 0.02, 0.1, -0.35], [-0.78 + k * 0.05, 0.36 + (k % 2) * 0.1, -0.33], 0.03); void B;
    },
    // ------------------------------------------------------------- Mt. Fuji on a table (0.98 x 0.92 x 0.86)
    fuji_diorama: (K, B) => {
      const w = B.w / 2, d = B.d / 2, T = 0.42;
      plank(K, 0x5a3a28, -w, T - 0.04, -d, w, T, d, { bevel: 0.006 }); for (const [x, z] of [[-w + 0.03, -d + 0.03], [w - 0.08, -d + 0.03], [-w + 0.03, d - 0.08], [w - 0.08, d - 0.08]]) K.box(wood(0x4a2e22), x, 0, z, x + 0.05, T - 0.04, z + 0.05);
      K.box(flat(0x4a8a48, 0.9), -w + 0.02, T, -d + 0.02, w - 0.02, T + 0.02, d - 0.02); K.box(flat(0x3a7ab8, 0.2), -w + 0.06, T + 0.02, 0.05, 0.1, T + 0.022, d - 0.06); // the lake
      K.lathe(stone(0x5a6a8a), [0.1, T + 0.02, -0.12], [[0.34, 0], [0.16, 0.26], [0.1, 0.32]], 9); K.lathe(flat(0xeef2f4, 0.6), [0.1, T + 0.02, -0.12], [[0.1, 0.32], [0.045, 0.44], [0, 0.44]], 9);
      for (let k = 0; k < 9; k++) { const a = k * 0.698; K.tri(flat(0xeef2f4, 0.6), [0.1 + Math.cos(a) * 0.1, T + 0.34, -0.12 + Math.sin(a) * 0.1], [0.1 + Math.cos(a + 0.35) * 0.115, T + 0.27, -0.12 + Math.sin(a + 0.35) * 0.115], [0.1 + Math.cos(a + 0.7) * 0.1, T + 0.34, -0.12 + Math.sin(a + 0.7) * 0.1], [Math.cos(a + 0.35), 0.5, Math.sin(a + 0.35)]); }
      K.sym((s) => K.box(paint(VERM, 0.2), 0.3 + s * 0.035 - 0.006, T + 0.02, 0.2, 0.3 + s * 0.035 + 0.006, T + 0.11, 0.212)); K.box(paint(VERM, 0.2), 0.25, T + 0.1, 0.198, 0.35, T + 0.115, 0.214);
      for (const [x, z, h] of [[-0.35, -0.25, 0.1], [-0.28, -0.3, 0.13], [-0.4, -0.15, 0.08], [0.38, 0.0, 0.1]]) { K.cyl(flat(0x4a342a, 0.9), x, T + 0.02, z, 0.008, h * 0.4, 4); K.lathe(leafy(K, 0x2f6a3a), [x, T + 0.02 + h * 0.3, z], [[0.035, 0], [0, h]], 5); }
      K.box(paint(0x8a2a22, 0.2), -0.2, T + 0.02, 0.28, -0.14, T + 0.05, 0.33); K.prism(paint(0x3a3a3e, 0.2), [[-0.21, T + 0.05], [-0.13, T + 0.05], [-0.17, T + 0.08]], { plane: 'xy', a: 0.275, b: 0.335 }); void B;
    },
    // ------------------------------------------------------------- a shishi-odoshi (0.8 x 0.78 x 0.58)
    shishi_odoshi: (K, B) => {
      const bm = matte(BAMBOO, 0.2), w = B.w / 2, d = B.d / 2;
      K.box(matte(0xd8d2c0, 0.1), -w, 0, -d, w, 0.04, d, { bevel: 0.01 });
      K.lathe(rock(K, 0x7a7c80), [-0.12, 0.04, 0.02], [[0.14, 0], [0.17, 0.08], [0.15, 0.16], [0.1, 0.16]], 8); K.lathe(flat(0x4a7a9a, 0.15), [-0.12, 0.18, 0.02], [[0.1, 0], [0, 0]], 8);
      K.cyl(bm, 0.25, 0.04, -0.05, 0.035, 0.72, 7); for (const y of [0.3, 0.55]) K.torus(flat(darken(BAMBOO, 0.3), 0.8), 0.25, y, -0.05, 0.035, 0.004, 7, 3);
      K.at([0.12, 0.62, -0.05], () => K.cyl(bm, 0, 0, 0, 0.018, 0.22, 6, { axis: 'x' }), { rz: 2.9 }); // the spout
      K.sym((s) => K.cyl(bm, 0.02, 0.04, 0.1 + s * 0.06, 0.016, 0.3, 6)); K.rod(flat(0x5a4636, 0.9), [0.02, 0.33, 0.03], [0.02, 0.33, 0.17], 0.006, 4);
      K.at([0.02, 0.33, 0.1], () => K.cyl(bm, -0.2, 0, 0, 0.028, 0.36, 7, { axis: 'x' }), { rz: 0.35 }); // the rocking arm
      blob(K, rock(K), 0.05, 0.07, -0.18, 0.07, 0.05, 0.06, { seed: 4, jit: 0.2 }); blob(K, leafy(K, 0x5c8a44), -0.28, 0.05, -0.15, 0.08, 0.02, 0.07, { seed: 6, jit: 0.2 });
      for (let k = 0; k < 4; k++) blade(K, flat(0x5a9048, 0.9), [-0.3 + k * 0.012, 0.04, 0.18], [-0.33 + k * 0.03, 0.2 + (k % 2) * 0.06, 0.2], 0.022); void B;
    },
    // ------------------------------------------------------------- a tuft of wild grass (0.438 x 0.35 x 0.388)
    grass_tuft: (K, B) => {
      const g = [0x5c9048, 0x76aa58, 0x4a7c40];
      for (let k = 0; k < 22; k++) { const a = k * 2.4, r0 = 0.02 + ((k * 0.37) % 1) * 0.05, r1 = 0.08 + ((k * 0.61) % 1) * 0.12, h = 0.16 + ((k * 0.29) % 1) * 0.18; blade(K, flat(g[k % 3], 0.9), [Math.cos(a) * r0, 0, Math.sin(a) * r0], [Math.cos(a) * r1, h, Math.sin(a) * r1 * 0.9], 0.03); }
      flower(K, flat(0x8a6ad8, 0.8), [0.08, 0.3, 0.02], 0.022, { dir: [0.2, 1, 0.3], eye: flat(0xf2c21c) }); flower(K, flat(0xf2efe6, 0.8), [-0.06, 0.26, 0.06], 0.018, { dir: [0, 1, 0.3], eye: flat(0xf2c21c) }); void B;
    },
  },
};
