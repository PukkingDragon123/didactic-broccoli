// The corner shop's stock and the park (ids from src/data/props/town.js and park.js): grocery shelves, the milk
// fridge, the counter bell, propane cylinders, a twin-tub washer, weeds; the bench, swings, slide, drinking fountain,
// lamp, litter basket, bollard, the panda spring rider, the clock, sand toys, litter and the big zelkova.
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, lighten, darken, mix } from '../kit/kit.js';
import { blob, bush, tones, leafy, leaf, blade, flower, dirtBox, dirtRing, plank, post, can, bucket } from '../kit/shapes.js';
import { kana, smallPrint, hazard, framed, meshTex, meshPanel, louvres, rustEdge, clockFace, mascot } from '../kit/prints.js';
import { canLabel } from './street2.js';

const GALV = metal(0xa6acae, 0.3);

/** One shelf's row of goods as solid little packs (they read in flat colour too: the shop merges them vertex-coloured). */
function goodsRow(K, kind, x0, x1, y, z, seed) {
  const pal = [0xd8382e, 0xf2a21a, 0x2a7ad8, 0x3cae5a, 0x8a5bd6, 0xf4e0b0, 0xff8fb2, 0x5ab4e8];
  const W = { cup: 0.085, bag: 0.1, tin: 0.07, bottle: 0.06, box: 0.09, soap: 0.075, roll: 0.11, milk: 0.075 }[kind], n = Math.floor((x1 - x0) / (W + 0.012));
  const gap = (x1 - x0 - n * W) / n;
  for (let k = 0; k < n; k++) {
    const x = x0 + gap / 2 + k * (W + gap), c = pal[(k * 3 + seed) % pal.length], cx = x + W / 2, wt = 0xeeeadc;
    if (kind === 'cup') { K.lathe(plastic(wt, 0.1), [cx, y, z], [[W * 0.36, 0], [W * 0.5, 0.1]], 6); K.lathe(flat(c, 0.6), [cx, y, z], [[W * 0.43, 0.035], [W * 0.475, 0.035], [W * 0.5, 0.075], [W * 0.46, 0.075]], 6); K.cyl(flat(0xd8d4c8, 0.4), cx, y + 0.1, z, W * 0.52, 0.006, 6, { cap0: false }); }
    else if (kind === 'bag') { K.box(plastic(c, 0.25), x, y, z - 0.025, x + W, y + 0.15, z + 0.025, { bevel: 0.016 }); K.box(flat(wt, 0.6), x + W * 0.2, y + 0.07, z + 0.024, x + W * 0.8, y + 0.11, z + 0.027); K.box(flat(darken(c, 0.35), 0.6), x + W * 0.2, y + 0.035, z + 0.024, x + W * 0.8, y + 0.05, z + 0.027); }
    else if (kind === 'tin') { K.cyl(metal(0xc8ccd0, 0.3), cx, y, z, W * 0.48, 0.09, 6, { cap0: false }); K.cyl(flat(c, 0.6), cx, y + 0.012, z, W * 0.495, 0.066, 6, { caps: false }); K.cyl(flat(wt, 0.6), cx, y + 0.035, z, W * 0.505, 0.02, 6, { caps: false }); }
    else if (kind === 'bottle') { const b = [0x4a2a1a, 0xd8b03a, 0x8a5a2a, 0xe8e2cc][(k + seed) % 4]; K.lathe(flat(b, 0.35), [cx, y, z], [[W * 0.45, 0], [W * 0.45, 0.12], [W * 0.18, 0.17], [W * 0.18, 0.2]], 6); K.cyl(flat(wt, 0.6), cx, y + 0.04, z, W * 0.465, 0.05, 6, { caps: false }); K.cyl(plastic([0xd8382e, 0x3cae5a, 0xf2c41a][k % 3]), cx, y + 0.2, z, W * 0.22, 0.018, 6); }
    else if (kind === 'box') { K.box(matte(c, 0.2), x, y, z - 0.03, x + W, y + 0.17, z + 0.03, { bevel: 0.004 }); K.box(flat(wt, 0.6), x + W * 0.18, y + 0.05, z + 0.03, x + W * 0.82, y + 0.11, z + 0.032); K.box(flat(darken(c, 0.3), 0.6), x + W * 0.3, y + 0.07, z + 0.032, x + W * 0.7, y + 0.09, z + 0.0335); }
    else if (kind === 'soap') { const s = [0x5ab4e8, 0xff8fb2, 0x9ad86a, 0xeeeadc][(k + seed) % 4]; K.box(plastic(s, 0.25), x, y, z - 0.03, x + W, y + 0.16, z + 0.03, { bevel: 0.02 }); K.cyl(plastic(wt), cx, y + 0.16, z, W * 0.2, 0.035, 6); K.box(flat(wt, 0.6), x + W * 0.15, y + 0.05, z + 0.03, x + W * 0.85, y + 0.1, z + 0.032); }
    else if (kind === 'roll') { K.box(plastic([0xf4c0d0, 0xc0dcf0, 0xf2efe6][k % 3], 0.2), x, y, z - 0.05, x + W, y + 0.2, z + 0.05, { bevel: 0.022 }); K.box(flat(c, 0.6), x + W * 0.15, y + 0.08, z + 0.05, x + W * 0.85, y + 0.13, z + 0.052); }
    else { K.box(matte(wt, 0.1), x, y, z - 0.035, x + W, y + 0.17, z + 0.035); K.prism(matte(wt, 0.1), [[x, y + 0.17], [x + W, y + 0.17], [cx, y + 0.21]], { plane: 'xy', a: z - 0.035, b: z + 0.035 }); K.box(flat([0x2a7ad8, 0xd8382e, 0x8a5a2a][k % 3], 0.6), x - 0.0006, y + 0.04, z - 0.0356, x + W + 0.0006, y + 0.11, z + 0.0356); }
  }
}
/** A steel grocery gondola: pegboard back, four shelves with price rails. rows: the kind of goods on each shelf from the top. */
function gondola(K, B, rows, seed) {
  const w = B.w - 0.02, fr = paint(0xe6e2d6, 0.1);
  K.box(fr, -w / 2, 0, B.z0, w / 2, 0.1, B.z1 - 0.02, { bevel: 0.01 });
  K.box(paint(0xdedad0, 0.08), -w / 2, 0.1, B.z0, w / 2, B.y1, B.z0 + 0.04, { bevel: 0.006 });
  for (const s of [-1, 1]) K.box(fr, s * w / 2 - 0.02, 0.1, B.z0, s * w / 2 + 0.02, B.y1, B.z0 + 0.07, { bevel: 0.006 });
  // pegboard holes: a sparse grid of dark dots where no stock hides it
  for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) K.box(flat(0x8a867c, 0.9), -w / 2 + 0.1 + i * (w - 0.2) / 8 - 0.006, B.y1 - 0.06 - j * 0.07, B.z0 + 0.04, -w / 2 + 0.1 + i * (w - 0.2) / 8 + 0.006, B.y1 - 0.048 - j * 0.07, B.z0 + 0.0412);
  rows.forEach((kind, k) => {
    const y = 0.1 + (rows.length - 1 - k) * ((B.y1 - 0.42) / (rows.length - 1)) + 0.02, d = B.z1 - B.z0 - 0.06 - k * 0.0;
    K.box(fr, -w / 2 + 0.01, y - 0.025, B.z0 + 0.04, w / 2 - 0.01, y, B.z0 + 0.04 + d, { bevel: 0.004 });
    K.box(flat(0xe8842a, 0.6), -w / 2 + 0.01, y - 0.03, B.z0 + 0.04 + d, w / 2 - 0.01, y + 0.012, B.z0 + 0.048 + d); // the orange price rail
    for (let i = 0; i < 6; i++) K.box(flat(0xf2efe6, 0.6), -w / 2 + 0.08 + i * (w - 0.2) / 5, y - 0.024, B.z0 + 0.048 + d, -w / 2 + 0.14 + i * (w - 0.2) / 5, y + 0.006, B.z0 + 0.0495 + d);
    goodsRow(K, kind, -w / 2 + 0.03, w / 2 - 0.03, y, B.z0 + 0.04 + d - 0.08, seed + k * 5);
    K.box(flat(0xb8b4a8, 0.9), -w / 2 + 0.03, y, B.z0 + 0.041, w / 2 - 0.03, y + 0.13, B.z0 + 0.04 + d - 0.16); // the stock behind the facings
  });
}

export default {
  family: 'street',
  models: {
    goods_shelf: (K, B) => gondola(K, B, ['box', 'tin', 'cup', 'bag'], 1),
    goods_shelf2: (K, B) => gondola(K, B, ['soap', 'bottle', 'box', 'roll'], 4),

    // ------------------------------------------------------------- the milk and drinks fridge (0.86 x 1.86 x 0.7), its glass door to +z
    milk_fridge: (K, B) => {
      const body = paint(0x2c2e32, 0.2), w = 0.42, zf = B.z1 - 0.03, zb = B.z0;
      K.box(body, -w, 0, zb, w, 1.84, zf - 0.04, { bevel: 0.012, skip: ['pz'] });
      K.box(body, -w + 0.012, 1.6, zf - 0.06, w - 0.012, 1.828, zf - 0.04); K.box(body, -w + 0.012, 0.012, zf - 0.06, w - 0.012, 0.24, zf - 0.04);
      K.box(flat(0x1c1e20, 0.8), -w + 0.02, 0.02, zf - 0.04, w - 0.02, 0.22, zf - 0.03); // kick plate with a grille
      for (let k = 0; k < 6; k++) K.box(flat(0x3a3c40, 0.7), -w + 0.06, 0.05 + k * 0.026, zf - 0.03, w - 0.06, 0.062 + k * 0.026, zf - 0.027);
      // the lit header
      const H = K.patch('milk', 96, 24, (V) => { V.fill(0xeef4f6); V.box(0, 0, 96, 3, 0x5ab4e8); V.box(0, 21, 96, 24, 0x5ab4e8); V.text5('MILK', 30, 17, 0x2a7ad8, { align: 'center', s: 2 }); kana(K, V, '牛乳', 76, 20, 0x2a7ad8, { size: 16, align: 'center' }); }, { bright: true });
      K.glow(() => K.face(H, '+z', -w + 0.03, 1.62, w - 0.03, 1.81, zf - 0.0385));
      // the cabinet: white liner, wire shelves, rows of cartons and bottles, all behind the glass door
      K.use(flat(0xdfe3e2, 0.5), (G) => G.box(-w + 0.04, 0.24, zb + 0.06, w - 0.04, 1.6, zf - 0.05, { inward: true, skip: ['pz'] }));
      K.glow(() => K.box(flat(0xf4f8f0), -w + 0.06, 1.575, zb + 0.2, w - 0.06, 1.59, zf - 0.12));
      ['milk', 'bottle', 'milk', 'tin'].forEach((kind, k) => { const y = 0.27 + (3 - k) * 0.33; K.box(metal(0xc8ccd0), -w + 0.04, y - 0.012, zb + 0.06, w - 0.04, y, zf - 0.06); goodsRow(K, kind, -w + 0.06, w - 0.06, y, zf - 0.13, k * 3 + 2); K.box(flat(0xc8ccc8, 0.9), -w + 0.07, y, zb + 0.08, w - 0.07, y + 0.14, zf - 0.2); });
      K.part('door', [-w + 0.03, 0.9, zf - 0.035], 'y', () => {
        K.glass(() => K.box(K.tint(0xcfe4ea, 70), -w + 0.05, 0.25, zf - 0.05, w - 0.05, 1.59, zf - 0.035));
        for (const [a, b, c, d] of [[-w + 0.02, 0.23, w - 0.02, 0.27], [-w + 0.02, 1.57, w - 0.02, 1.61], [-w + 0.02, 0.23, -w + 0.06, 1.61], [w - 0.06, 0.23, w - 0.02, 1.61]]) K.box(metal(0x8a9094, 0.3), a, b, zf - 0.05, c, d, zf - 0.02, { bevel: 0.005 });
        K.box(chrome(), w - 0.11, 0.7, zf - 0.02, w - 0.085, 1.15, zf, { bevel: 0.006 });
      });
      K.box(flat(0xf2c21c, 0.6), -w + 0.075, 0.78, zf - 0.034, -w + 0.15, 0.86, zf - 0.0335);
    },

    // ------------------------------------------------------------- the counter bell (7.5 cm)
    call_bell: (K) => {
      K.cyl(plastic(0x26221e, 0.15), 0, 0, 0, 0.0375, 0.008, 10, { bevel: 0.002 });
      K.lathe(chrome(0xb4babf), [0, 0.008, 0], [[0.034, 0], [0.033, 0.012], [0.026, 0.026], [0.014, 0.035], [0, 0.038]], 10);
      K.cyl(metal(0x8a9094), 0, 0.045, 0, 0.004, 0.012, 6); K.cyl(plastic(0x26221e), 0, 0.056, 0, 0.011, 0.009, 8, { bevel: 0.002 });
    },

    // ------------------------------------------------------------- two LP gas cylinders on a slab (0.825 x 1.425 x 0.425)
    propane: (K, B) => {
      const g = 0xa8aeb0, tank = paint(g, 0.18);
      K.box(stone(0xa39f96), B.x0, 0, B.z0, B.x1, 0.06, B.z1, { bevel: 0.01 }); dirtBox(K, 0xa39f96, B.x0, B.z0, B.x1, B.z1, 0, 0.03);
      const lab = K.patch('lpg', 56, 72, (V) => { V.fill(g); V.box(6, 22, 50, 62, 0xf2efe6); V.frame(6, 22, 50, 62, 0x8a8e90); kana(K, V, 'ＬＰ', 28, 60, 0xc8302a, { size: 16, align: 'center' }); kana(K, V, 'ガス', 28, 43, 0xc8302a, { size: 16, align: 'center' }); V.text5('50KG', 28, 18, 0x4a4e50, { align: 'center' }); rustEdge(V, 0, 56, 0, 6, 4); }, { rough: 0.55 });
      for (const x of [-0.2, 0.2]) {
        K.cyl(paint(darken(g, 0.15), 0.1), x, 0.06, 0, 0.165, 0.05, 10, { cap0: false });
        K.lathe(tank, [x, 0.1, 0], [[0, 0], [0.15, 0], [0.185, 0.04], [0.185, 0.98], [0.15, 1.08], [0.08, 1.12], [0, 1.12]], 10);
        K.ring(paint(darken(g, 0.1), 0.2), x, 1.2, 0, 0.1, 0.092, 0.1, 10); // the valve guard
        K.cyl(metal(0xb89a4a), x, 1.22, 0, 0.022, 0.07, 6); K.cyl(metal(0x8a9094), x - 0.04, 1.26, 0, 0.012, 0.08, 5, { axis: 'x' });
        K.wrap(lab, x, 0.36, 0.82, 0, 0.185, { n: 10, arc: (Math.PI * 2 / 10) * 3 });
      }
      // the regulator and its hoses between them, the chain that keeps them upright
      K.box(metal(0x8a9094), -0.07, 1.3, -0.04, 0.07, B.y1, 0.04, { bevel: 0.015 });
      K.sym((s) => K.tube(flat(0x2a2a2c, 0.8), [[s * 0.2, 1.29, 0], [s * 0.2, 1.36, 0], [s * 0.07, 1.37, 0]], 0.012, 5));
      K.tube(metal(0x7e8486, 0), [[B.x0 + 0.02, 0.8, 0.19], [-0.2, 0.78, 0.2], [0, 0.76, 0.19], [0.2, 0.78, 0.2], [B.x1 - 0.02, 0.8, 0.19]], 0.006, 4);
    },

    // ------------------------------------------------------------- a twin-tub washing machine left outside (0.875 x 0.925 x 0.525)
    twin_tub: (K, B) => {
      const c = 0xdcd8cc, body = paint(c, 0.15), x0 = B.x0, x1 = x0 + 0.78, z0 = B.z0 + 0.02, z1 = z0 + 0.45;
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: x0, u1: x1, v0: 0.04, v1: 0.8, ppm: 256, rough: 0.6 }, (V) => {
        const I = (x) => V.i(x0 + x), J = (y) => V.j(y), dk = darken(c, 0.3);
        V.fill(c); V.box(0, 0, V.W, J(0.1), darken(c, 0.08));
        V.box(I(0.03), J(0.66), I(0.75), J(0.78), 0x5a9ac8); V.frame(I(0.03), J(0.66), I(0.75), J(0.78), 0x3a6a98);
        for (const [x, t] of [[0.12, 'SEN'], [0.36, 'MIZU'], [0.6, 'DASSUI']]) { V.disc(I(x), J(0.72), 9, 0xeeeadc); V.ring(I(x), J(0.72), 8, 9.5, 0x3a4a5a); V.line(I(x), J(0.72), I(x) + 4, J(0.72) + 6, 0x3a4a5a); V.text5(t, I(x), J(0.66) - 3, 0x4a6a8a, { align: 'center' }); }
        kana(K, V, '二槽式', I(0.2), J(0.52), 0x3a6a98, { size: 16, s: 2, align: 'center' }); V.text5('WASH', I(0.58), J(0.5), 0x3a6a98, { align: 'center', s: 2 });
        V.vline(I(0.47), J(0.1), J(0.64), dk); rustEdge(V, 0, V.W, 0, 22, 7); rustEdge(V, I(0.3), I(0.6), J(0.1), 14, 2);
        for (const x of [0.1, 0.52, 0.7]) for (let j = J(0.2); j < J(0.6); j++) if ((j * 7 + Math.round(x * 50)) % 5 < 2) V.px(I(x), j, darken(c, 0.12)); // rain streaks
      });
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : K.uv(body))(p, n), (G) => G.box(x0, 0.04, z0, x1, 0.8, z1, { bevel: 0.016 }));
      dirtBox(K, c, x0, z0, x1, z1, 0.04, 0.05, { sides: ['+x', '-x', '-z'] });
      for (const [x, z] of [[x0 + 0.06, z0 + 0.05], [x1 - 0.06, z0 + 0.05], [x0 + 0.06, z1 - 0.05], [x1 - 0.06, z1 - 0.05]]) K.cyl(rubber(), x, 0, z, 0.025, 0.045, 6);
      // the two lids (wash tub wide, spinner narrow), the control ledge behind
      K.part('lid_wash', [x0 + 0.24, 0.8, z0 + 0.1], 'x', () => K.box(plastic(0x6aa8d0, 0.2), x0 + 0.015, 0.8, z0 + 0.1, x0 + 0.46, 0.83, z1 - 0.01, { bevel: 0.01 })); K.part('lid_spin', [x0 + 0.63, 0.8, z0 + 0.1], 'x', () => K.box(plastic(0x6aa8d0, 0.2), x0 + 0.48, 0.8, z0 + 0.1, x1 - 0.015, 0.83, z1 - 0.01, { bevel: 0.01 }));
      K.box(body, x0, 0.8, z0, x1, 0.9, z0 + 0.09, { bevel: 0.012 });
      for (const x of [0.12, 0.36, 0.6]) K.cyl(plastic(0xeeeadc), x0 + x, 0.9, z0 + 0.045, 0.028, 0.02, 8);
      // the drain hose looped over the side
      K.tube(flat(0x8a8a86, 0.8), [[x1 - 0.02, 0.2, z0 + 0.1], [x1 + 0.04, 0.3, z0 + 0.12], [B.x1 - 0.02, 0.2, z0 + 0.2], [B.x1 - 0.03, 0.02, z1 + 0.03]], 0.016, 5);
    },

    // ------------------------------------------------------------- roadside weeds (0.75 x 0.33 x 0.21)
    weeds: (K, B) => {
      const g = [0x5c8f45, 0x77a554, 0x4a7a3c];
      for (let k = 0; k < 13; k++) { const t = k / 12, x = B.x0 + 0.04 + t * (B.w - 0.08), h = 0.12 + ((k * 0.618) % 1) * 0.2, lean = ((k * 0.37) % 1 - 0.5) * 0.16; blade(K, flat(g[k % 3], 0.9), [x, 0, ((k * 0.29) % 1 - 0.5) * 0.1], [x + lean, h, ((k * 0.71) % 1 - 0.5) * 0.16], 0.028); }
      flower(K, flat(0xf2efe6, 0.8), [-0.2, 0.2, 0.03], 0.022, { dir: [0, 1, 0.4], eye: flat(0xf2c21c) }); flower(K, flat(0xf2c21c, 0.8), [0.16, 0.15, -0.02], 0.02, { dir: [0.2, 1, 0.3], eye: flat(0xe8842a) });
    },

    // ------------------------------------------------------------- park bench (1.59 x 0.93 x 0.66): seat towards +z
    park_bench: (K, B) => {
      const w = 0x9a6a3e, iron = paint(0x26282a, 0.18), z0 = B.z0;
      for (let k = 0; k < 3; k++) plank(K, w, -0.76, 0.42, z0 + 0.2 + k * 0.145, 0.76, 0.455, z0 + 0.33 + k * 0.145, { bevel: 0.006, v: k });
      for (let k = 0; k < 3; k++) K.at([0, 0.52 + k * 0.135, z0 + 0.13 - k * 0.035], () => plank(K, w, -0.76, 0, -0.0175, 0.76, 0.115, 0.0175, { bevel: 0.006, v: k + 1 }), { rx: -0.26 });
      K.sym((s) => {
        const x = s * 0.62;
        K.tube(iron, [[x, 0, z0 + 0.62], [x, 0.41, z0 + 0.6], [x, 0.41, z0 + 0.2], [x, 0.0, z0 + 0.16]], 0.022, 4, { flat: [0.05, 0.045] }); // legs + seat rail
        K.tube(iron, [[x, 0.41, z0 + 0.2], [x, 0.9, z0 + 0.05]], 0.02, 4, { flat: [0.05, 0.04] }); // back stay
        K.tube(iron, [[x, 0.41, z0 + 0.6], [x, 0.62, z0 + 0.62], [x, 0.64, z0 + 0.2]], 0.018, 4, { flat: [0.05, 0.035] }); // armrest
        K.box(iron, x - 0.04, 0, z0 + 0.58, x + 0.04, 0.02, z0 + 0.66); K.box(iron, x - 0.04, 0, z0 + 0.12, x + 0.04, 0.02, z0 + 0.2);
        for (const z of [z0 + 0.26, z0 + 0.41, z0 + 0.55]) K.box(metal(0x8a9094), x - 0.012, 0.455, z - 0.012, x + 0.012, 0.459, z + 0.012);
      });
    },

    // ------------------------------------------------------------- swings (3.32 x 2.48 x 1.8)
    swing_set: (K) => {
      const blue = paint(0x2f6fb8, 0.25), yel = paint(0xf2c41a, 0.25), T = 2.36;
      K.cyl(yel, -1.62, T, 0, 0.04, 3.24, 8, { axis: 'x' });
      K.sym((s) => {
        const x = s * 1.56;
        for (const z of [-0.8, 0.8]) { K.rod(blue, [x, 0.02, z], [x, T, 0], 0.035, 6); K.cyl(stone(0xa8a49c), x, 0, z, 0.1, 0.05, 8, { bevel: 0.015 }); }
        K.rod(blue, [x, 0.72, -0.55], [x, 0.72, 0.55], 0.025, 5);
        K.box(yel, x - 0.07, T - 0.06, -0.07, x + 0.07, T + 0.07, 0.07, { bevel: 0.015 });
      });
      for (const [cx, sw] of [[-0.72, 0], [0.72, 0.16]]) {
        for (const dx of [-0.24, 0.24]) {
          K.box(metal(0x8a8e92), cx + dx - 0.03, T - 0.07, -0.03, cx + dx + 0.03, T - 0.03, 0.03);
          // the chain: links drawn as a thin flat bar with alternating beads
          K.rod(metal(0xb8bcc0, 0), [cx + dx, T - 0.05, 0], [cx + dx, 0.5, sw], 0.008, 4);
          for (let k = 1; k < 12; k++) { const t = k / 12; K.box(metal(0x9aa0a4, 0), cx + dx - 0.013, T - 0.05 + (0.55 - T) * t - 0.012, sw * t - 0.006, cx + dx + 0.013, T - 0.05 + (0.55 - T) * t + 0.012, sw * t + 0.006); }
        }
        K.box(rubber(0x222224), cx - 0.28, 0.42, sw - 0.12, cx + 0.28, 0.47, sw + 0.12, { bevel: 0.015 });
        for (const dx of [-0.26, 0.26]) K.box(paint(0xd8342c, 0.2), cx + dx - 0.035, 0.44, sw - 0.125, cx + dx + 0.035, 0.5, sw + 0.125, { bevel: 0.01 });
        // the hollow worn into the ground under each seat
        K.lathe(flat(0x8a7458, 0.98), [cx, 0, 0], [[0.34, 0.004], [0, 0.006]], 9, { sz: 0.55 });
      }
    },

    // ------------------------------------------------------------- the slide (0.88 x 2.12 x 3.96): ladder at -z, the chute runs down to +z
    slide: (K) => {
      const red = paint(0xd8382e, 0.25), yel = paint(0xf2c41a, 0.25), st = metal(0xc8ced2, 0.35), PY = 1.48, Z0 = -1.5, Z1 = -0.78;
      K.box(metal(0x8a9096, 0.2), -0.4, PY - 0.05, Z0, 0.4, PY, Z1, { bevel: 0.006 });
      for (const [x, z] of [[-0.4, Z0], [0.4, Z0], [-0.4, Z1], [0.4, Z1]]) { K.cyl(red, x, 0, z, 0.03, PY + 0.6, 6); K.cyl(stone(0xa8a49c), x, 0, z, 0.07, 0.03, 6); }
      K.sym((s) => { for (const y of [PY + 0.32, PY + 0.6]) K.rod(yel, [s * 0.4, y, Z0], [s * 0.4, y, Z1], 0.022, 6); K.rod(red, [s * 0.32, 0, Z0 - 0.48], [s * 0.32, PY + 0.56, Z0 - 0.02], 0.024, 6); });
      K.rod(yel, [-0.4, PY + 0.6, Z0], [0.4, PY + 0.6, Z0], 0.022, 6);
      for (let i = 1; i <= 7; i++) { const t = i / 8; K.rod(st, [-0.32, PY * t, Z0 - 0.48 + 0.44 * t], [0.32, PY * t, Z0 - 0.48 + 0.44 * t], 0.018, 5); }
      // the chute: a steep run easing into a flat run-out, raised lips both sides
      const N = 9, pts = [];
      for (let k = 0; k <= N; k++) { const t = k / N, z = Z1 + t * 2.24; pts.push([z, PY - (PY - 0.36) * Math.pow(Math.sin(t * Math.PI / 2), 0.85)]); }
      pts.push([1.92, 0.36]);
      for (let k = 0; k + 1 < pts.length; k++) {
        const [za, ya] = pts[k], [zb, yb] = pts[k + 1];
        K.quad(st, [-0.3, ya, za], [0.3, ya, za], [0.3, yb, zb], [-0.3, yb, zb], [0, 1, 0.3]); K.quad(metal(0x9aa0a6, 0.2), [-0.3, ya - 0.03, za], [0.3, ya - 0.03, za], [0.3, yb - 0.03, zb], [-0.3, yb - 0.03, zb], [0, -1, -0.3]);
        K.sym((s) => { K.quad(st, [s * 0.3, ya, za], [s * 0.3, yb, zb], [s * 0.3, yb + 0.12, zb], [s * 0.3, ya + 0.12, za], [-s, 0, 0]); K.quad(metal(0xaab0b6, 0.3), [s * 0.33, ya - 0.03, za], [s * 0.33, yb - 0.03, zb], [s * 0.33, yb + 0.12, zb], [s * 0.33, ya + 0.12, za], [s, 0, 0]); K.quad(st, [s * 0.3, ya + 0.12, za], [s * 0.33, ya + 0.12, za], [s * 0.33, yb + 0.12, zb], [s * 0.3, yb + 0.12, zb], [0, 1, 0]); });
      }
      K.sym((s) => K.cyl(red, s * 0.24, 0, 1.8, 0.025, 0.34, 6));
      K.lathe(flat(0x8a7458, 0.98), [0, 0, 2.0], [[0.3, 0.004], [0, 0.006]], 8, { sz: 0.6 }); // the scuffed landing
    },

    // ------------------------------------------------------------- drinking fountain (0.725 x 0.975 x 0.525)
    drinking_fountain: (K, B) => {
      const c = 0xa8a69c, st = stone(c);
      K.box(stone(0x9a988e), B.x0, 0, B.z0, B.x1, 0.07, B.z1, { bevel: 0.012 }); dirtBox(K, 0x9a988e, B.x0, B.z0, B.x1, B.z1, 0, 0.035);
      K.cyl(st, 0, 0.07, 0, 0.15, 0.62, 8, { r1: 0.13, bevel: 0.01 });
      K.lathe(st, [0, 0.69, 0], [[0.13, 0], [0.22, 0.1], [0.22, 0.16], [0.19, 0.16]], 8);
      K.lathe(stone(darken(c, 0.2)), [0, 0.69, 0], [[0.19, 0.16], [0.12, 0.09], [0, 0.085]], 8);
      // the bubbler spout in the middle, the tap and its red handle on the side, a wet stain under the tap
      K.tube(chrome(), [[0, 0.775, 0], [0, 0.9, 0], [0.03, 0.93, 0], [0.06, 0.92, 0]], 0.012, 5);
      K.cyl(chrome(), 0.14, 0.4, 0, 0.014, 0.08, 6, { axis: 'x' }); K.tube(chrome(), [[0.2, 0.4, 0], [0.22, 0.38, 0], [0.22, 0.35, 0]], 0.011, 5);
      K.box(paint(0xc8302a, 0.2), 0.17, 0.41, -0.03, 0.2, 0.425, 0.03, { bevel: 0.004 });
      K.box(flat(darken(c, 0.25), 0.9), 0.142, 0.08, -0.03, 0.146, 0.34, 0.03);
      for (const [x, z, s] of [[-0.2, 0.15, 0.07], [0.25, -0.12, 0.05], [-0.1, -0.16, 0.04]]) blob(K, leafy(K, 0x5c8a44), x, 0.072, z, s, 0.012, s * 0.8, { seed: Math.round(x * 91), jit: 0.25, flatY: 0 });
    },

    // ------------------------------------------------------------- park lamp (0.45 x 4.75 x 0.45)
    park_lamp: (K) => {
      const g = paint(0x24402e, 0.25);
      K.cyl(g, 0, 0, 0, 0.11, 0.5, 8, { r1: 0.07, bevel: 0.015 }); K.cyl(g, 0, 0.5, 0, 0.05, 3.7, 8); K.cyl(g, 0, 1.2, 0, 0.065, 0.06, 8, { bevel: 0.01 });
      dirtRing(K, 0x24402e, 0, 0, 0.11, 0, 0.05, 8, { r1: 0.105 });
      K.lathe(g, [0, 4.2, 0], [[0.05, 0], [0.1, 0.06], [0.16, 0.08], [0.16, 0.11], [0, 0.11]], 8);
      K.glow(() => K.lathe(flat(0xfff2cc), [0, 4.31, 0], [[0.13, 0], [0.19, 0.26], [0, 0.26]], 8));
      for (let k = 0; k < 4; k++) { const a = k * 1.5708 + 0.785; K.rod(g, [Math.cos(a) * 0.14, 4.31, Math.sin(a) * 0.14], [Math.cos(a) * 0.2, 4.58, Math.sin(a) * 0.2], 0.012, 4); }
      K.lathe(g, [0, 4.57, 0], [[0.22, 0], [0.225, 0.02], [0.08, 0.13], [0.03, 0.15], [0.03, 0.17], [0, 0.18]], 8);
      const pl = K.patch('no', 16, 24, (V) => { V.fill(0xf2efe6); V.text5('P', 8, 20, 0x24402e, { align: 'center' }); V.text5('4', 8, 10, 0x24402e, { align: 'center' }); }, { rough: 0.6 });
      K.face(pl, '+z', -0.025, 1.5, 0.025, 1.58, 0.05 * 0.924 + 0.002);
    },

    // ------------------------------------------------------------- litter basket on a post (0.45 x 0.875 x 0.425)
    trash_basket: (K) => {
      const g = 0x24402e, gp = paint(g, 0.25), mesh = meshTex(K, g, 8, { n: 4, diag: true }), R = 0.2, n = 10;
      K.cyl(gp, 0, 0, 0, 0.03, 0.3, 6); K.cyl(gp, 0, 0, 0, 0.07, 0.02, 6);
      K.cyl(gp, 0, 0.28, 0, R * 0.86, 0.02, n);
      K.glass(() => { for (let k = 0; k < n; k++) for (let j = 0; j < 3; j++) { const y0 = 0.3 + j * 0.18, ra = R * (0.86 + 0.14 * (j / 3)), rb = R * (0.86 + 0.14 * ((j + 1) / 3)); K.wrap(mesh, 0, y0, y0 + 0.18, 0, ra, { n, r1: rb, arc: 6.2832 / n, turn: k * 6.2832 / n, lift: 0 }); K.wrap(mesh, 0, y0, y0 + 0.18, 0, ra - 0.004, { n, r1: rb - 0.004, arc: 6.2832 / n, turn: k * 6.2832 / n, lift: 0, sub: [1, 0, 0, 1] }); } });
      K.torus(gp, 0, 0.845, 0, R, 0.014, n, 4);
      for (let k = 0; k < n; k += 2) { const a = k * 6.2832 / n + Math.PI / n; K.rod(gp, [Math.sin(a) * R * 0.86, 0.3, Math.cos(a) * R * 0.86], [Math.sin(a) * R, 0.84, Math.cos(a) * R], 0.008, 4); }
      // what's in it
      blob(K, flat(0xe8e4d8, 0.9), 0.03, 0.56, 0.02, 0.13, 0.22, 0.13, { fine: true, jit: 0.22, seed: 5 });
      K.at([-0.05, 0.72, 0.04], () => can(K, 0, 0, 0, canLabel(K, 'cola')), { rz: 0.9, ry: 0.4 });
    },

    // ------------------------------------------------------------- the striped arch bollard (0.875 x 0.925 x 0.175)
    bollard_u: (K) => {
      const tiger = K.patch('tigerU', 96, 16, (V) => hazard(V, 0, 0, 96, 16, 0xf2c21c, 0x26221e, 8), { shared: true, rough: 0.55 });
      const R = 0.36, r = 0.045, n = 8, P = [];
      for (let k = 0; k <= 10; k++) { const a = Math.PI * (k / 10); P.push([-Math.cos(a) * R, 0.5 + Math.sin(a) * 0.38, 0]); }
      K.tube(paint(0xf2c21c, 0.2), [[-R, 0.3, 0], ...P, [R, 0.3, 0]], r, n);
      // black bands painted round the arch
      for (let k = 1; k < 10; k += 2) { const a = Math.PI * (k / 10), b = Math.PI * ((k + 0.9) / 10); K.tube(flat(0x26221e, 0.6), [[-Math.cos(a) * R, 0.5 + Math.sin(a) * 0.38, 0], [-Math.cos(b) * R, 0.5 + Math.sin(b) * 0.38, 0]], r + 0.002, n, { caps: false }); }
      K.sym((s) => { K.cyl(paint(0xe8e4d8, 0.15), s * R, 0, 0, r, 0.3, n); K.cyl(paint(0xc8302a, 0.2), s * R, 0.16, 0, r + 0.002, 0.08, n, { caps: false }); K.cyl(stone(0xa8a49c), s * R, 0, 0, 0.075, 0.03, n, { bevel: 0.01 }); dirtRing(K, 0xe8e4d8, s * R, 0, r, 0.03, 0.04, n); });
      void tiger;
    },

    // ------------------------------------------------------------- the panda spring rider (0.575 x 0.975 x 0.75), nose to +z
    spring_panda: (K, B) => {
      const W = plastic(0xe8e6dc, 0.1), Bk = plastic(0x26262a, 0.15);
      K.box(stone(0xa8a49c), B.x0, 0, B.z0 + 0.06, B.x1, 0.05, B.z1 - 0.06, { bevel: 0.01 });
      // the coil spring
      const sp = []; for (let k = 0; k <= 28; k++) { const a = k * 0.9; sp.push([Math.cos(a) * 0.07, 0.05 + k * 0.011, Math.sin(a) * 0.07]); }
      K.tube(metal(0x3a3a40, 0.3), sp, 0.013, 4);
      // the body: a fat panda, black legs and ears, eye patches; red handles and foot pegs
      K.box(W, -0.14, 0.36, -0.26, 0.14, 0.66, 0.2, { bevel: 0.07, edge: null });
      K.box(W, -0.13, 0.56, 0.08, 0.13, 0.84, 0.34, { bevel: 0.07, edge: null }); // head
      K.box(W, -0.07, 0.6, 0.32, 0.07, 0.7, 0.385, { bevel: 0.03, edge: null }); K.box(Bk, -0.025, 0.665, 0.38, 0.025, 0.695, 0.392, { bevel: 0.008, edge: null });
      K.sym((s) => {
        K.box(Bk, s * 0.09 - 0.045, 0.8, 0.14, s * 0.09 + 0.045, 0.9, 0.22, { bevel: 0.03, edge: null }); // ears
        K.box(Bk, s * 0.07 - 0.03, 0.7, 0.325, s * 0.07 + 0.03, 0.77, 0.343, { bevel: 0.012, edge: null }); K.box(flat(0xf2efe6, 0.4), s * 0.07 - 0.008, 0.728, 0.342, s * 0.07 + 0.008, 0.746, 0.3445);
        K.box(Bk, s * 0.145 - 0.04, 0.32, 0.02, s * 0.145 + 0.04, 0.56, 0.18, { bevel: 0.035, edge: null }); K.box(Bk, s * 0.145 - 0.04, 0.32, -0.25, s * 0.145 + 0.04, 0.56, -0.09, { bevel: 0.035, edge: null });
        K.rod(paint(0xd8342c, 0.2), [s * 0.1, 0.8, 0.2], [s * 0.26, 0.82, 0.2], 0.016, 6); K.rod(paint(0xd8342c, 0.2), [s * 0.13, 0.36, 0.08], [s * 0.27, 0.34, 0.08], 0.016, 6);
      });
      K.box(paint(0xd8342c, 0.2), -0.1, 0.655, -0.2, 0.1, 0.68, 0.04, { bevel: 0.012 }); // the saddle pad
      K.box(Bk, -0.03, 0.42, -0.3, 0.03, 0.5, -0.25, { bevel: 0.02, edge: null });
    },

    // ------------------------------------------------------------- the park clock on its pole (0.84 x 3.68 x 0.32)
    park_clock: (K) => {
      const g = metal(0xb4babc, 0.3), R = 0.34, cy = 3.2;
      K.cyl(g, 0, 0, 0, 0.045, cy - R, 8); K.cyl(flat(0x8a9092, 0.6), 0, 0, 0, 0.09, 0.04, 8, { r1: 0.06 }); dirtRing(K, 0xb4babc, 0, 0, 0.045, 0.04, 0.05, 8);
      K.lathe(paint(0x34383c, 0.2), [0, cy, -0.13], [[0, 0], [R + 0.04, 0], [R + 0.04, 0.26], [0, 0.26]], 14, { axis: 'z' });
      const F = K.patch('dial', 88, 88, (V) => clockFace(V, 3, 42, { rim: 0x34383c }), { rough: 0.6 });
      for (const [f, z] of [['+z', 0.131], ['-z', -0.131]]) K.face(F, f, -R, cy - R, R, cy + R, z);
      // a little hat, and a crow that has made it home (the old one had one too)
      K.lathe(paint(0x2a2c30, 0.2), [0, cy + R + 0.03, 0], [[0.2, 0], [0.2, 0.02], [0.06, 0.07], [0, 0.075]], 8);
      K.box(g, -0.06, cy - R - 0.08, -0.06, 0.06, cy - R + 0.02, 0.06, { bevel: 0.012 });
    },

    // ------------------------------------------------------------- toys left in the sand (1.06 x 0.4 x 0.84)
    sand_toys: (K, B) => {
      const sand = 0xd8c49a;
      // a sand castle turned out of the bucket, a moat scratched round it
      K.lathe(matte(sand, 0.1), [0.02, 0, 0.04], [[0.19, 0], [0.15, 0.1], [0.11, 0.11], [0.09, 0.24], [0.05, 0.25], [0.04, 0.32], [0, 0.33]], 9);
      for (let k = 0; k < 5; k++) { const a = k * 1.2566; K.box(matte(darken(sand, 0.08), 0.1), 0.02 + Math.cos(a) * 0.07 - 0.02, 0.24, 0.04 + Math.sin(a) * 0.07 - 0.02, 0.02 + Math.cos(a) * 0.07 + 0.02, 0.28, 0.04 + Math.sin(a) * 0.07 + 0.02); }
      K.rod(flat(0xc8b878, 0.8), [0.02, 0.32, 0.04], [0.02, B.y1 - 0.01, 0.04], 0.004, 3); K.tri(flat(0xd8342c, 0.6), [0.02, B.y1 - 0.01, 0.04], [0.02, B.y1 - 0.05, 0.04], [0.08, B.y1 - 0.03, 0.04]); K.tri(flat(0xd8342c, 0.6), [0.02, B.y1 - 0.01, 0.04], [0.08, B.y1 - 0.03, 0.04], [0.02, B.y1 - 0.05, 0.04]);
      // the orange bucket on its side, a blue spade, a green rake
      K.at([0.32, 0.075, -0.2], () => bucket(K, 0, 0, 0, 0.075, 0.13, { c: plastic(0xe8842a, 0.2), handle: false, n: 9 }), { rz: 1.45, ry: 0.5 });
      K.at([-0.38, 0.012, 0.05], () => { K.box(plastic(0x2f6fb8, 0.2), -0.05, 0, -0.06, 0.05, 0.012, 0.06, { bevel: 0.005 }); K.rod(plastic(0x2f6fb8, 0.2), [0, 0.006, 0.05], [0, 0.02, 0.2], 0.012, 5); K.box(plastic(0x2f6fb8, 0.2), -0.03, 0.01, 0.19, 0.03, 0.03, 0.215, { bevel: 0.006 }); }, { ry: 0.9 });
      K.at([0.38, 0.01, 0.26], () => { K.box(plastic(0x3a9a4a, 0.2), -0.05, 0, 0, 0.05, 0.012, 0.02); for (let k = 0; k < 4; k++) K.box(plastic(0x3a9a4a, 0.2), -0.045 + k * 0.027, 0, -0.035, -0.035 + k * 0.027, 0.01, 0); K.rod(plastic(0x3a9a4a, 0.2), [0, 0.006, 0.02], [0, 0.012, 0.17], 0.009, 5); }, { ry: -0.5 });
      blob(K, matte(sand, 0.1), -0.25, 0.01, -0.25, 0.1, 0.03, 0.08, { seed: 3, flatY: -0.3 });
    },

    // ------------------------------------------------------------- park litter (0.76 x 0.14 x 0.34)
    park_litter: (K) => {
      K.at([-0.2, 0.033, 0.0], () => can(K, 0, 0, -0.06, canLabel(K, 'cola'), { turn: 2 }), { rx: Math.PI / 2, ry: 0.5 });
      // an ice-lolly wrapper and its stick, a crumpled paper bag
      K.at([0.1, 0.004, 0.02], () => { K.box(plastic(0x5ab4e8, 0.3), -0.07, 0, -0.03, 0.07, 0.008, 0.03, { bevel: 0.003 }); K.box(flat(0xf2efe6, 0.5), -0.04, 0.008, -0.02, 0.03, 0.0086, 0.02); K.box(flat(0xe84a6a, 0.5), -0.02, 0.0086, -0.01, 0.01, 0.009, 0.01); }, { ry: -0.4 });
      K.at([0.28, 0.004, 0.08], () => K.box(flat(0xd8b88a, 0.9), -0.05, 0, -0.006, 0.05, 0.004, 0.006, { bevel: 0.002 }), { ry: 0.7 });
      blob(K, matte(0xc8a878, 0.1), 0.25, 0.04, -0.08, 0.06, 0.04, 0.05, { seed: 8, jit: 0.3, flatY: -0.9 });
      K.cyl(flat(0x4a3a2a, 0.9), -0.02, 0, 0.1, 0.012, 0.012, 5);
    },

    // ------------------------------------------------------------- the big zelkova (6.93 x 8.36 x 5.83)
    keyaki_tree: (K, B) => {
      const bark = stone(0x6a5646, 0.14), g = leafy(K, 0x3f8040, { k: 0.32 }), g2 = leafy(K, 0x4f9046, { k: 0.32 }), g3 = leafy(K, 0x356f3c, { k: 0.3 });
      // the trunk: a flared foot, a twist, the fork into three limbs (zelkovas open like a broom)
      K.tube(bark, [[0, 0, 0], [0.03, 0.5, 0], [0.0, 1.6, 0.04], [0.05, 2.9, 0.0]], 0.3, 8, { radii: [0.48, 0.34, 0.29, 0.26] });
      for (let k = 0; k < 5; k++) { const a = k * 1.2566 + 0.3; K.tube(bark, [[Math.cos(a) * 0.36, 0.26, Math.sin(a) * 0.36], [Math.cos(a) * 0.62, 0.03, Math.sin(a) * 0.62]], 0.13, 5, { r1: 0.05 }); }
      const limbs = [[[0.05, 2.8, 0], [0.8, 4.0, 0.3], [1.7, 5.0, 0.5]], [[0.05, 2.8, 0], [-0.7, 4.1, -0.2], [-1.6, 5.2, -0.5]], [[0.05, 2.8, 0], [0.1, 4.2, -0.6], [0.2, 5.4, -1.3]], [[0.05, 2.8, 0], [-0.2, 4.0, 0.7], [-0.5, 5.0, 1.5]]];
      for (const L of limbs) K.tube(bark, L, 0.2, 6, { radii: [0.22, 0.15, 0.08] });
      // the crown: big clumps, a ring of them round the middle and a cap on top
      const C = [[1.7, 5.4, 0.6, 1.6, 1.2, 1.5, g], [-1.6, 5.5, -0.6, 1.7, 1.3, 1.5, g2], [0.2, 5.8, -1.5, 1.6, 1.2, 1.4, g3], [-0.5, 5.4, 1.6, 1.6, 1.2, 1.3, g2], [0.1, 6.6, 0.1, 2.1, 1.6, 1.9, g], [2.3, 4.8, -0.7, 1.1, 0.9, 1.1, g3], [-2.4, 4.9, 0.6, 1.0, 0.9, 1.1, g], [1.0, 4.9, 1.8, 1.1, 0.85, 1.0, g3], [-1.2, 4.9, -1.8, 1.2, 0.9, 1.0, g2], [0.9, 7.3, -0.5, 1.3, 1.0, 1.2, g2], [-0.9, 7.2, 0.5, 1.3, 1.05, 1.2, g3]];
      C.forEach(([x, y, z, rx, ry, rz, c], i) => blob(K, c, x, y, z, rx, ry, rz, { fine: 2, jit: 0.16, seed: i * 17 + 5 }));
      void B;
    },
  },
};
