// Stand-in geometry for the goods src/products models in full (broom, milk carton, batteries, boxed tube, cup noodles):
// propMesh() hands out the products' own meshes for these ids; code that only takes propGeometry() (the room's batched
// props, the annex) gets these, so nothing falls back to voxels. Labels are original pixel art, kept simple.
import { paint, plastic, metal, matte, wood, flat, fabric, lighten, darken } from '../kit/kit.js';
import { kana } from '../kit/prints.js';

export default {
  family: 'goods',
  models: {
    // a bamboo yard broom: a cane handle, a fan of twigs bound with wire (0.35 x 1.32 x 0.1)
    broom: (K, B) => {
      const cane = wood(0xc8b070);
      K.cyl(cane, 0, 0.3, 0, 0.014, B.y1 - 0.3, 8);
      for (const y of [0.55, 0.85, 1.12]) K.torus(wood(0xa89050), 0, y, 0, 0.0145, 0.003, 8, 3);
      for (let k = 0; k < 15; k++) { const t = k / 14 - 0.5, x = t * (B.w - 0.03), z = (k % 3 - 1) * 0.02; K.tube(wood(k % 2 ? 0x8a6a3a : 0x9a7a44), [[t * 0.03, 0.42, z * 0.3], [t * 0.09, 0.22, z * 0.7], [x, 0.004, z]], 0.005, 4, { radii: [0.006, 0.005, 0.0025] }); }
      for (const y of [0.3, 0.38]) K.torus(metal(0x5a5e62), 0, y, 0, 0.026, 0.004, 10, 3);
      K.lathe(wood(0x8a6a3a), [0, 0.28, 0], [[0.03, 0], [0.02, 0.16]], 8);
    },
    // a one-litre gable-top milk carton (0.07 x 0.21 x 0.077)
    milk_carton: (K, B) => {
      const w = B.x1 - 0.001, d = B.z1 - 0.001, h = 0.165;
      K.box(matte(0xf2efe6, 0.06), -w, 0, -d, w, h, d, { bevel: 0.002 });
      const L = K.patch('milklabel', 24, 56, (V) => { V.fill(0xf2efe6); V.box(0, 0, 24, 10, 0x3a6ab0); V.box(0, 44, 24, 56, 0x3a6ab0); kana(K, V, '牛乳', 2, 40, 0x3a6ab0, { size: 10 }); V.text5('MILK', 12, 27, 0x2a2a2e, { align: 'center' }); V.box(5, 13, 19, 19, 0x9ac87a); V.text5('1L', 12, 8, 0xf2efe6, { align: 'center' }); }, { rough: 0.7 });
      K.face(L, '+z', -w, 0.005, w, h - 0.005, d + 0.0005); K.face(L, '-z', -w, 0.005, w, h - 0.005, -d - 0.0005);
      K.prism(matte(0xf2efe6, 0.06), [[-d, h], [d, h], [0.003, B.y1 - 0.012], [-0.003, B.y1 - 0.012]], { plane: 'zy', a: -w, b: w });
      K.box(matte(0xe8e4da, 0.04), -w, B.y1 - 0.013, -0.004, w, B.y1, 0.004, { bevel: 0.001 });
    },
    // a blister card of four AA cells (0.086 x 0.126 x 0.022)
    battery_pack: (K, B) => {
      const w = B.x1 - 0.001, card = K.patch('battcard', 24, 36, (V) => { V.fill(0xf2c21c); V.box(0, 26, 24, 36, 0xc8302a); V.text5('AA', 12, 34, 0xf2efe6, { align: 'center' }); V.box(10, 31, 14, 34, 0x24221e); V.disc(12, 32.5, 2, 0xf2efe6); V.text5('x4', 20, 6, 0x24221e, { align: 'right' }); }, { rough: 0.6 });
      K.box(matte(0xf2c21c, 0.1), -w, 0, -0.003, w, B.y1, 0.0, { bevel: 0.001 });
      K.face(card, '+z', -w, 0.001, w, B.y1 - 0.001, 0.0005); K.face(card, '-z', -w, 0.001, w, B.y1 - 0.001, -0.0035);
      for (let k = 0; k < 4; k++) { const x = -0.03 + k * 0.02; K.cyl(paint(k % 2 ? 0x24221e : 0x2a2a30, 0.3), x, 0.015, 0.009, 0.007, 0.05, 8); K.cyl(metal(0xc8ccd0, 0.3), x, 0.065, 0.009, 0.0035, 0.002, 6); K.cyl(paint(0xc8a44a, 0.2), x, 0.04, 0.009, 0.0072, 0.012, 8, { caps: false }); }
      K.glass(() => K.box(K.tint(0xe8f0f0, 70, 0.1), -0.042, 0.012, 0.0, 0.042, 0.07, B.z1, { bevel: 0.003 }));
    },
    // a fluorescent tube in its long printed box (1.22 x 0.04 x 0.045)
    tube_box: (K, B) => {
      const pr = K.patch('tubebox', 96, 8, (V) => { V.fill(0xf2efe6); V.box(0, 0, 96, 2, 0x3a6ab0); V.box(0, 6, 96, 8, 0x3a6ab0); V.text5('LUX-40W', 6, 6, 0x3a6ab0); kana(K, V, '蛍光灯', 60, 7, 0x2a2a2e, { size: 6 }); }, { rough: 0.85 });
      K.box(matte(0xf2efe6, 0.06), B.x0, 0, B.z0, B.x1, B.y1, B.z1, { bevel: 0.002 });
      K.face(pr, '+z', B.x0 + 0.01, 0.002, B.x1 - 0.01, B.y1 - 0.002, B.z1 + 0.0005); K.face(pr, '-z', B.x0 + 0.01, 0.002, B.x1 - 0.01, B.y1 - 0.002, B.z0 - 0.0005);
      K.face(pr, '+y', B.x0 + 0.01, B.z0 + 0.002, B.x1 - 0.01, B.z1 - 0.002, B.y1 + 0.0005);
    },
    // a cup of instant noodles: a tapered cup, a printed band, the foil lid with its tab (0.132 x 0.136 x 0.12)
    room_cupnoodle: (K, B) => {
      const r1 = B.x1 - 0.004, r0 = r1 * 0.72, h = B.y1 - 0.006;
      K.lathe(plastic(0xf2efe6, 0.08), [0, 0, 0], [[0, 0], [r0, 0], [r1, h], [r1 + 0.003, h], [r1 + 0.003, h + 0.003], [0, h + 0.003]], 12);
      const L = K.patch('cupband', 64, 24, (V) => { V.fill(0xf2efe6); V.box(0, 14, 64, 23, 0xc8302a); for (const i of [16, 48]) { V.text5('NOODLE', i, 21, 0xf2efe6, { align: 'center' }); V.box(i - 6, 4, i + 6, 9, 0xe8a83a); V.box(i - 5, 3, i + 5, 4, 0xe8a83a); V.hline(i - 4, i + 4, 9, 0xf2d27a); V.vline(i + 2, 9, 12, 0x8a5a2a); V.vline(i + 4, 9, 12, 0x8a5a2a); } V.box(0, 0, 64, 2, 0xc8a44a); }, { rough: 0.6 });
      K.wrap(L, 0, h * 0.25, h * 0.92, 0, r0 + (r1 - r0) * 0.25, { r1: r0 + (r1 - r0) * 0.92, n: 12 });
      K.lathe(metal(0xd8d4c8, 0.3), [0, h + 0.003, 0], [[r1 + 0.002, 0], [r1 + 0.002, 0.002], [0, 0.0025]], 12);
      K.box(metal(0xd8d4c8, 0.3), -0.012, h + 0.002, r1 - 0.002, 0.012, h + 0.0045, r1 + 0.016);
    },
  },
};
