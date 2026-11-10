// The dagashi-shop furniture and shopfront dressing (ids from src/data/props/shop.js): the Shōwa cash register, the
// glass showcase counter, the pendulum clock, the enamel lamp, jars of sweets, the soroban, the dagashi rack, the
// ramune cooler, the bench, the pink public phone, the 氷 flag, a Shigaraki tanuki, the chalk menu, morning glories,
// twin gacha machines and the big lucky cat.
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, tones, leafy, leaf, flower, pot, plank, jar, bottle, dirtBox, dirtRing, TERRA } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot, clockFace, rustEdge, plankTex } from '../kit/prints.js';
import { luckyCat, capsule } from './garage.js';

const WD = 0x7a4e30, WL = 0xb8905a;
/** A paper price tag: white card, red figures. */
function priceTag(K, x, y, z, yen, w = 0.05) {
  const V = K.patch('yen' + yen, 24, 14, (V) => { framed(V, 0xf2efe6, 0xc8302a); V.text5(String(yen), 12, 11, 0xc8302a, { align: 'center' }); }, { rough: 0.9, shared: true });
  K.face(V, '+z', x - w / 2, y, x + w / 2, y + w * 0.58, z);
}
/** A row of small sweet boxes / packets standing on a shelf (solid colours with a band: they read without the atlas too). */
function sweets(K, x0, x1, y, z, seed, o = {}) {
  seed = Math.round(seed);
  const pal = [0xe84a3a, 0xf2c21c, 0x3a7ad8, 0x3a9a4a, 0xe86aa8, 0xe8842a, 0x8a5bd6, 0xf2efe6], W = o.w ?? 0.07, n = Math.floor((x1 - x0) / (W + 0.008)), h = o.h ?? 0.08, d = o.d ?? 0.05;
  for (let k = 0; k < n; k++) { const x = x0 + (x1 - x0 - n * W) / 2 / n + k * ((x1 - x0) / n), c = pal[(k * 3 + seed) % 8]; K.box(matte(c, 0.18), x, y, z - d, x + W, y + h * (0.8 + ((k + seed) % 3) * 0.1), z, { bevel: 0.004 }); K.box(flat(pal[(k * 5 + seed + 3) % 8], 0.8), x + W * 0.15, y + h * 0.3, z, x + W * 0.85, y + h * 0.55, z + 0.0012); }
}

export default {
  family: 'shop',
  models: {
    // ------------------------------------------------------------- the Shōwa cash register (0.35 x 0.32 x 0.32): keys towards +z
    cash_register: (K, B) => {
      const w = 0.155, zf = B.z1 - 0.01, zb = B.z0 + 0.005, body = enamel(0x3a2c26), brass = metal(0xc8a44a, 0.3);
      plank(K, 0x5a3a26, -w - 0.005, 0, zb, w + 0.005, 0.075, zf, { bevel: 0.006 }); // the drawer base
      K.part('drawer', [0, 0.04, zf], 'z', () => { plank(K, 0x6a4630, -w + 0.01, 0.022, zf - 0.02, w - 0.01, 0.066, zf + 0.004, { bevel: 0.004, v: 1 }); K.box(brass, -0.03, 0.036, zf + 0.004, 0.03, 0.05, zf + 0.012, { bevel: 0.003 }); });
      // the body: a sloped key bank rising to the indicator box
      K.prism(body, [[zf - 0.01, 0.075], [zf - 0.01, 0.1], [zb + 0.11, 0.2], [zb + 0.11, 0.29], [zb + 0.01, 0.29], [zb + 0.01, 0.075]], { plane: 'zy', a: -w, b: w });
      const cols = [0xc8302a, 0xeeeae0, 0xeeeae0, 0x26221e, 0x26221e];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { const t = (r + 0.5) / 5, z = zf - 0.02 - t * (zf - zb - 0.14), y = 0.105 + t * 0.095; K.cyl(plastic(cols[(r + (c > 3 ? 1 : 0)) % 5], 0.2), -w + 0.03 + c * 0.05, y, z, 0.014, 0.014, 6); }
      // the indicator window with its price flags, a brass crest on top, the crank on the right
      const win = K.patch('flags', 64, 24, (V) => { V.fill(0x1e1a18); for (const [i, t] of [[6, '¥'], [22, '1'], [36, '5'], [50, '0']]) { V.box(i - 4, 3, i + 9, 21, 0xeeeae0); V.text5(t, i + 2, 17, 0xc8302a, { align: 'center', s: 2 }); } }, { rough: 0.4 });
      K.face(win, '+z', -w + 0.02, 0.215, w - 0.02, 0.28, zb + 0.1112); K.box(brass, -w + 0.012, 0.208, zb + 0.11, w - 0.012, 0.214, zb + 0.116); K.box(brass, -w + 0.012, 0.281, zb + 0.11, w - 0.012, 0.287, zb + 0.116);
      K.prism(brass, [[-0.06, 0.29], [0.06, 0.29], [0.04, 0.305], [0, B.y1], [-0.04, 0.305]], { plane: 'xy', a: zb + 0.03, b: zb + 0.09 });
      K.tube(brass, [[w, 0.14, zb + 0.07], [B.x1 - 0.012, 0.14, zb + 0.07], [B.x1 - 0.012, 0.2, zb + 0.07]], 0.007, 5); K.ball(plastic(0x26221e), B.x1 - 0.012, 0.21, zb + 0.07, 0.013, 0.013, 0.013, 6, 3);
      const side = K.patch('scroll', 32, 32, (V) => { V.fill(0x3a2c26); V.ring(16, 16, 9, 10.5, 0xc8a44a); V.ring(16, 16, 4, 5.5, 0xc8a44a); for (const [i, j] of [[4, 4], [27, 4], [4, 27], [27, 27]]) V.disc(i, j, 2, 0xc8a44a); V.frame(1, 1, 31, 31, 0xc8a44a); }, { rough: 0.45, shared: true });
      K.face(side, '+x', zb + 0.02, 0.1, zb + 0.1, 0.18, w + 0.0008); K.face(side, '-x', zb + 0.02, 0.1, zb + 0.1, 0.18, -w - 0.0008);
    },

    // ------------------------------------------------------------- the wooden glass showcase counter (1.6 x 0.96 x 0.56)
    shop_counter: (K, B) => {
      const w = B.w / 2, d = B.d / 2, H = B.y1 - 0.02, glass = K.tint(0xcfe4e4, 54);
      plank(K, WD, -w, 0, -d, w, 0.1, d, { bevel: 0.008 }); // the plinth
      plank(K, darken(WD, 0.1), -w, 0.1, -d, w, H, -d + 0.02, { axis: 'y' }); // the back board
      for (const [x, z] of [[-w, -d], [w - 0.05, -d], [-w, d - 0.05], [w - 0.05, d - 0.05], [-0.025, d - 0.05]]) plank(K, WD, x, 0.1, z, x + 0.05, H, z + 0.05, { bevel: 0.005, v: 1 });
      plank(K, WD, -w, H - 0.04, d - 0.05, w, H, d, { bevel: 0.005 }); plank(K, WD, -w, H - 0.04, -d, w, H, -d + 0.05, { bevel: 0.005, v: 2 });
      for (const s of [-1, 1]) plank(K, WD, s * w - (s > 0 ? 0.05 : 0), H - 0.04, -d + 0.05, s * w + (s > 0 ? 0 : 0.05), H, d - 0.05, { v: 1 });
      // two shelves of stock: boxes of sweets, their price cards
      for (const y of [0.1, 0.42]) { K.box(wood(WL), -w + 0.04, y, -d + 0.02, w - 0.04, y + 0.016, d - 0.06); sweets(K, -w + 0.07, -0.05, y + 0.016, d - 0.1, y * 30, { h: 0.11, w: 0.1, d: 0.12 }); sweets(K, 0.05, w - 0.07, y + 0.016, d - 0.1, y * 30 + 4, { h: 0.09, w: 0.085, d: 0.12 }); sweets(K, -w + 0.07, w - 0.07, y + 0.016, d - 0.28, y * 30 + 2, { h: 0.14, w: 0.11, d: 0.1 }); }
      priceTag(K, 0.45, 0.66, d - 0.06, 10, 0.12);
      // the glass: front panes, the top; brass corner plates
      K.glass(() => { K.box(glass, -w + 0.05, 0.1, d - 0.03, -0.025, H - 0.04, d - 0.022); K.box(glass, 0.025, 0.1, d - 0.03, w - 0.05, H - 0.04, d - 0.022); K.box(glass, -w + 0.05, H - 0.012, -d + 0.05, w - 0.05, H - 0.004, d - 0.05); for (const s of [-1, 1]) K.box(glass, s * w - (s > 0 ? 0.03 : 0.022), 0.1, -d + 0.05, s * w - (s > 0 ? 0.022 : 0.03) + 0.0, H - 0.04, d - 0.05); });
      for (const s of [-1, 1]) for (const y of [0.12, H - 0.07]) K.box(metal(0xc8a44a, 0.3), s * w - (s > 0 ? 0.052 : -0.002), y, d - 0.002, s * w - (s > 0 ? 0.002 : -0.052), y + 0.05, d + 0.002);
      dirtBox(K, WD, -w, -d, w, d, 0, 0.03, { sides: ['+z'] });
    },

    // ------------------------------------------------------------- the pendulum wall clock (0.32 x 0.64 x 0.12): back to the wall at -z
    pendulum_clock: (K, B) => {
      const z0 = B.z0, zf = B.z1 - 0.02, cy = 0.46, R = 0.13;
      K.lathe(wood(WD), [0, cy, z0], [[0, 0], [R + 0.03, 0], [R + 0.03, zf - z0 - 0.01], [R + 0.012, zf - z0]], 8, { axis: 'z' });
      const F = K.patch('dial', 72, 72, (V) => { clockFace(V, 8, 20, { bg: 0xf2ead6, rim: 0x5a3a26, ink: 0x26221e }); for (const [t, a] of [['12', 0], ['3', 1.5708], ['6', 3.1416], ['9', 4.7124]]) V.text5(t, Math.round(36 + Math.sin(a) * 23), Math.round(39 + Math.cos(a) * 23), 0x26221e, { align: 'center' }); }, { rough: 0.5 });
      K.face(F, '+z', -R, cy - R, R, cy + R, zf + 0.0006);
      K.torus(metal(0xc8a44a, 0.3), 0, cy, zf, R + 0.004, 0.007, 12, 3, { axis: 'z' });
      // the case below: a glazed door, the brass pendulum behind it
      plank(K, WD, -0.1, 0.02, z0, 0.1, cy - R + 0.02, zf - 0.03, { axis: 'y', bevel: 0.006 });
      K.box(flat(0x2a1e18, 0.9), -0.075, 0.05, zf - 0.03, 0.075, cy - R - 0.02, zf - 0.029);
      K.rod(metal(0xc8a44a, 0.3), [0.012, cy - R - 0.02, zf - 0.024], [-0.012, 0.11, zf - 0.024], 0.003, 4); K.cyl(metal(0xd8b44a, 0.3), -0.014, 0.095, zf - 0.028, 0.028, 0.006, 10, { axis: 'z' });
      K.glass(() => K.box(K.tint(0xcfe4e4, 46), -0.075, 0.05, zf - 0.02, 0.075, cy - R - 0.02, zf - 0.016));
      for (const [a, b, c, d] of [[-0.085, 0.04, 0.085, 0.052], [-0.085, cy - R - 0.022, 0.085, cy - R - 0.01], [-0.085, 0.04, -0.073, cy - R - 0.01], [0.073, 0.04, 0.085, cy - R - 0.01]]) K.box(wood(lighten(WD, 0.1)), a, b, zf - 0.03, c, d, zf - 0.012);
      K.prism(wood(WD), [[-0.07, 0.02], [0.07, 0.02], [0.04, 0], [-0.04, 0]], { plane: 'xy', a: z0, b: zf - 0.04 });
      K.prism(wood(WD), [[-0.09, cy + R + 0.02], [0.09, cy + R + 0.02], [0, B.y1]], { plane: 'xy', a: z0, b: zf - 0.03 });
    },

    // ------------------------------------------------------------- the enamel pendant lamp (0.29 x 0.7 x 0.29): hung by the top
    shop_lamp: (K, B) => {
      const g = enamel(0x2f5a44), top = B.y1;
      K.torus(metal(0x3a3a3e, 0.2), 0, top - 0.014, 0, 0.012, 0.003, 8, 3, { axis: 'z' });
      for (let k = 0; k < 9; k++) K.cyl(flat(k % 2 ? 0x26221e : 0x3a3430, 0.8), 0, 0.22 + k * 0.05, 0, 0.005, 0.05, 5, { caps: false }); // the twisted cloth flex
      K.cyl(metal(0xc8a44a, 0.3), 0, 0.16, 0, 0.022, 0.06, 8, { bevel: 0.006 });
      K.lathe(g, [0, 0, 0], [[0.14, 0], [0.142, 0.012], [0.1, 0.07], [0.04, 0.13], [0.026, 0.16]], 12);
      K.lathe(flat(0xeeeae0, 0.4), [0, 0, 0], [[0.026, 0.158], [0.038, 0.128], [0.097, 0.068], [0.137, 0.012], [0.14, 0]], 12, { flip: true });
      K.glow(() => K.ball(flat(0xfff0c4), 0, 0.06, 0, 0.034, 0.042, 0.034, 8, 4));
      K.cyl(metal(0xc8a44a, 0.3), 0, 0.1, 0, 0.016, 0.04, 6);
    },

    // ------------------------------------------------------------- a wall shelf of sweet jars (1.0 x 0.56 x 0.23): back to the wall at -z
    wall_shelf_jars: (K, B) => {
      const w = B.w / 2, z0 = B.z0, z1 = B.z1 - 0.01;
      plank(K, WD, -w, 0.02, z0, w, B.y1 - 0.02, z0 + 0.016, { v: 1 });
      for (const y of [0.02, 0.28]) { plank(K, WD, -w, y, z0, w, y + 0.022, z1, { bevel: 0.004 }); K.sym((s) => K.prism(wood(darken(WD, 0.1)), [[z0 + 0.016, y], [z1 - 0.03, y], [z0 + 0.016, y - 0.02 - (y < 0.1 ? 0 : 0.1)]].map(([z, yy]) => [z, Math.max(0, yy)]), { plane: 'zy', a: s * (w - 0.05) - 0.01, b: s * (w - 0.05) + 0.01 })); }
      for (const s of [-1, 1]) plank(K, WD, s * w - (s > 0 ? 0.02 : 0), 0.02, z0, s * w + (s > 0 ? 0 : 0.02), B.y1, z1 - 0.02, { axis: 'y', v: 2 });
      const fills = [0xe84a3a, 0xf2c21c, 0x8ac8e8, 0xe86aa8, 0x3a9a4a, 0xe8842a, 0xeeeae0, 0x8a5bd6], lids = [0xc8302a, 0x3a7ad8, 0xe8b830, 0x3a9a4a];
      [0.042, 0.302].forEach((y, r) => { for (let k = 0; k < 5; k++) { const x = -w + 0.11 + k * (B.w - 0.22) / 4; jar(K, x, y, (z0 + z1) / 2 + 0.01, 0.068, 0.2, { n: 8, lid: paint(lids[(k + r) % 4]), fill: flat(fills[(k * 3 + r * 5) % 8], 0.6), level: 0.5 + ((k + r) % 3) * 0.18 }); priceTag(K, x, y - 0.02, z1 + 0.0012, [10, 20, 30, 5, 50][(k + r * 2) % 5], 0.06); } });
    },

    // ------------------------------------------------------------- the soroban (0.3 x 0.02 x 0.105)
    abacus: (K, B) => {
      const w = B.w / 2, d = B.d / 2, fr = wood(0x4a2e20);
      for (const z of [-d, d - 0.008]) K.box(fr, -w, 0, z, w, 0.016, z + 0.008); for (const x of [-w, w - 0.008]) K.box(fr, x, 0, -d, x + 0.008, 0.016, d);
      K.box(fr, -w, 0.004, -d + 0.03, w, 0.014, -d + 0.036); // the beam
      for (let k = 0; k < 15; k++) { const x = -w + 0.02 + k * (B.w - 0.04) / 14; K.rod(flat(0xb8a878, 0.7), [x, 0.009, -d + 0.006], [x, 0.009, d - 0.006], 0.0014, 3, { caps: false }); const up = k % 4 === 1; K.lathe(wood(0x8a5a34), [x, 0.009, -d + (up ? 0.022 : 0.012)], [[0.002, -0.004], [0.007, 0], [0.002, 0.004]], 6, { axis: 'z' }); for (let j = 0; j < 4; j++) K.lathe(wood(0x8a5a34), [x, 0.009, d - 0.014 - j * 0.0095 - (j < k % 5 ? 0.012 : 0)], [[0.002, -0.004], [0.007, 0], [0.002, 0.004]], 6, { axis: 'z' }); }
    },

    // ------------------------------------------------------------- the dagashi rack (0.99 x 1.215 x 0.495)
    dagashi_rack: (K, B) => {
      const w = B.w / 2, z0 = B.z0, z1 = B.z1;
      for (const s of [-1, 1]) plank(K, WD, s * w - (s > 0 ? 0.03 : 0), 0, z0, s * w + (s > 0 ? 0 : 0.03), 1.06, z1 - 0.04, { axis: 'y', v: 1 });
      plank(K, darken(WD, 0.1), -w + 0.03, 0.05, z0, w - 0.03, 1.06, z0 + 0.014, { axis: 'y' });
      // stepped shelves, each with a lip; rows of sweets, price cards on the lips
      [[0.05, 0.42], [0.36, 0.34], [0.64, 0.27], [0.88, 0.2]].forEach(([y, depth], k) => { plank(K, WL, -w + 0.03, y, z0, w - 0.03, y + 0.02, z0 + depth, { v: k }); K.box(wood(WD), -w + 0.03, y, z0 + depth, w - 0.03, y + 0.05, z0 + depth + 0.012); sweets(K, -w + 0.05, w - 0.05, y + 0.02, z0 + depth - 0.01, k * 3 + 1, { h: 0.1 + (k % 2) * 0.03, w: 0.075, d: 0.06 }); K.box(flat(0x6a4a34, 0.95), -w + 0.04, y + 0.02, z0 + 0.014, w - 0.04, y + 0.16, z0 + depth - 0.08); for (let i = 0; i < 4; i++) priceTag(K, -w + 0.16 + i * 0.22, y + 0.006, z0 + depth + 0.0132, [10, 20, 30, 50][(i + k) % 4], 0.07); });
      // strips of packets hanging from the top rail, the sign above
      plank(K, WD, -w, 1.06, z0, w, 1.09, z0 + 0.22, { bevel: 0.004 });
      for (let k = 0; k < 4; k++) { const x = -w + 0.14 + k * 0.235; for (let j = 0; j < 3; j++) K.box(plastic([0xe84a3a, 0xf2c21c, 0x3a9a4a, 0xe86aa8][(k + j) % 4], 0.25), x - 0.04, 0.95 - j * 0.085, z0 + 0.2, x + 0.04, 1.03 - j * 0.085, z0 + 0.212, { bevel: 0.004 }); }
      const sg = K.patch('dagashi', 128, 24, (V) => { V.fill(0xc8302a); V.frame(1, 1, 127, 23, 0xf2c21c); kana(K, V, 'だがし', 64, 22, 0xf2efe6, { size: 16, align: 'center' }); mascot(V, 'neko', 8, 17, {}); mascot(V, 'kaeru', 110, 16, {}); }, { rough: 0.7 });
      K.box(paint(0xc8302a, 0.15), -w + 0.04, 1.09, z0 + 0.06, w - 0.04, B.y1, z0 + 0.08); K.face(sg, '+z', -w + 0.04, 1.09, w - 0.04, B.y1, z0 + 0.0812);
    },

    // ------------------------------------------------------------- the ramune cooler (0.93 x 0.735 x 0.48)
    ramune_cooler: (K, B) => {
      const w = B.w / 2, d = B.d / 2, y0 = 0.14, y1 = B.y1 - 0.03, c = 0xdfe6ea;
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: -w, u1: w, v0: y0, v1: y1, ppm: 256, rough: 0.5 }, (V) => {
        const I = (x) => V.i(x), J = (y) => V.j(y0 + y), bl = 0x3a7ac8;
        V.fill(c); V.box(0, J(0.38), V.W, J(0.48), bl); V.box(0, 0, V.W, J(0.07), bl); V.box(0, J(0.07), V.W, J(0.085), 0xc8302a);
        kana(K, V, 'ラムネ', I(0.04), J(0.34), bl, { size: 16, s: 3, align: 'center' });
        // a bottle with its marble, bubbles
        V.box(I(-0.38), J(0.12), I(-0.32), J(0.3), 0x8ad0d8); V.box(I(-0.365), J(0.3), I(-0.335), J(0.36), 0x8ad0d8); V.disc(I(-0.35), J(0.3), 3, 0xf2f6f6); V.box(I(-0.38), J(0.17), I(-0.32), J(0.23), 0xf2efe6);
        for (const [x, y, r] of [[-0.27, 0.3, 3], [-0.25, 0.2, 2], [0.36, 0.32, 3], [0.38, 0.18, 2], [0.33, 0.24, 1.5]]) V.ring(I(x), J(y), r - 1, r, 0x8ac0e0);
        V.text5('ICE COLD', I(0), J(0.46), 0xf2efe6, { align: 'center' }); rustEdge(V, 0, V.W, 0, 5, 6, 0x9a6a3a);
      });
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : K.uv(paint(c, 0.12)))(p, n), (G) => G.box(-w, y0, -d, w, y1, d, { bevel: 0.014 }));
      for (const [x, z] of [[-w + 0.06, -d + 0.06], [w - 0.06, -d + 0.06], [-w + 0.06, d - 0.06], [w - 0.06, d - 0.06]]) { K.cyl(metal(0x9aa0a4), x, 0.03, z, 0.016, y0 - 0.03, 6); K.cyl(rubber(), x, 0, z, 0.024, 0.03, 6); }
      // the well: ice and bottle necks, two sliding glass lids, the opener on the side
      K.use(flat(0xc8d4d8, 0.5), (G) => G.box(-w + 0.03, y1 - 0.14, -d + 0.03, w - 0.03, y1 + 0.001, d - 0.03, { inward: true, skip: ['py'] }));
      for (let k = 0; k < 14; k++) { const x = -w + 0.08 + ((k * 0.37) % 1) * (B.w - 0.16), z = -d + 0.07 + ((k * 0.61) % 1) * (B.d - 0.14); K.box(flat(0xe8f2f4, 0.2), x - 0.03, y1 - 0.11, z - 0.03, x + 0.03, y1 - 0.07, z + 0.03, { bevel: 0.01, edge: null }); if (k % 2) { K.cyl(flat(0x7ac8d0, 0.2), x, y1 - 0.09, z, 0.014, 0.07, 6); K.cyl(plastic(0x3a7ac8), x, y1 - 0.02, z, 0.016, 0.012, 6); } }
      K.part('lid_left', [-w / 2, y1, 0], 'x', () => K.glass(() => K.box(K.tint(0xcfe4ea, 60), -w + 0.03, y1, -d + 0.03, 0.05, y1 + 0.008, d - 0.03))); K.part('lid_right', [w / 2, y1 + 0.01, 0], 'x', () => K.glass(() => K.box(K.tint(0xcfe4ea, 60), -0.05, y1 + 0.01, -d + 0.03, w - 0.03, y1 + 0.018, d - 0.03)));
      for (const z of [-d + 0.015, d - 0.03]) K.box(metal(0xb4babf, 0.3), -w + 0.02, y1, z, w - 0.02, B.y1, z + 0.015);
      K.box(metal(0x8a9094), w, y0 + 0.3, 0.04, w + 0.012, y0 + 0.38, 0.1, { bevel: 0.003 });
    },

    // ------------------------------------------------------------- the shopfront bench (0.95 x 0.525 x 0.35): a cushion, tea on a tray
    shop_bench: (K, B) => {
      const w = B.w / 2, d = B.d / 2, H = 0.44;
      for (let k = 0; k < 3; k++) plank(K, WL, -w, H - 0.03, -d + k * (B.d / 3) + 0.004, w, H, -d + (k + 1) * (B.d / 3) - 0.004, { bevel: 0.004, v: k });
      for (const [x, z] of [[-w + 0.05, -d + 0.04], [w - 0.09, -d + 0.04], [-w + 0.05, d - 0.08], [w - 0.09, d - 0.08]]) plank(K, darken(WL, 0.1), x, 0, z, x + 0.04, H - 0.03, z + 0.04, { axis: 'y', v: 1 });
      for (const z of [-d + 0.05, d - 0.07]) plank(K, darken(WL, 0.1), -w + 0.07, 0.12, z, w - 0.07, 0.15, z + 0.02);
      plank(K, darken(WL, 0.1), -w + 0.06, H - 0.07, -d + 0.05, w - 0.06, H - 0.03, -d + 0.07); plank(K, darken(WL, 0.1), -w + 0.06, H - 0.07, d - 0.07, w - 0.06, H - 0.03, d - 0.05);
      K.box(fabric(0xb82a2a), -w + 0.08, H, -0.11, -0.02, H + 0.045, 0.11, { bevel: 0.02, edge: null }); K.box(flat(0xe8c040, 0.9), -0.26, H + 0.0452, -0.012, -0.236, H + 0.047, 0.012); // zabuton with its centre tuft
      plank(K, 0x5a3a26, 0.14, H, -0.09, 0.4, H + 0.012, 0.09, { bevel: 0.003 });
      K.lathe(ceramic(0xe8e6de), [0.22, H + 0.012, 0.0], [[0, 0], [0.022, 0], [0.032, 0.05], [0.028, 0.05], [0.02, 0.008], [0, 0.008]], 8); K.lathe(flat(0x7a9a4a, 0.3), [0.22, H + 0.05, 0], [[0.027, 0], [0, 0]], 8);
      K.lathe(ceramic(0x3a5a8a), [0.33, H + 0.012, 0.02], [[0, 0], [0.03, 0], [0.04, 0.012], [0, 0.012]], 8); for (const [dx, dz] of [[0, 0], [0.012, 0.01], [-0.01, 0.012]]) K.ball(flat(0xf2e6d0, 0.7), 0.33 + dx, H + 0.034, 0.02 + dz, 0.012, 0.01, 0.012, 6, 3); // dango
    },

    // ------------------------------------------------------------- the pink public phone on its stand (0.36 x 0.97 x 0.3)
    pink_phone: (K, B) => {
      const w = B.w / 2, d = B.d / 2, H = 0.7, pk = plastic(0xf08aa0, 0.2);
      plank(K, WL, -w, H - 0.025, -d, w, H, d, { bevel: 0.004 });
      for (const [x, z] of [[-w + 0.02, -d + 0.02], [w - 0.055, -d + 0.02], [-w + 0.02, d - 0.055], [w - 0.055, d - 0.055]]) plank(K, darken(WL, 0.1), x, 0, z, x + 0.035, H - 0.025, z + 0.035, { axis: 'y', v: 1 });
      plank(K, WL, -w + 0.03, 0.22, -d + 0.03, w - 0.03, 0.24, d - 0.03, { v: 2 });
      K.box(flat(0xf2c21c, 0.9), -0.1, 0.24, -0.08, 0.1, 0.29, 0.08); K.box(flat(0xe8e6de, 0.9), -0.098, 0.245, 0.08, 0.098, 0.285, 0.0806); // the phone book
      // the phone: a wedge body, the dial, the receiver on its cradle, the coin slot
      K.prism(pk, [[-0.1, 0], [0.1, 0], [0.1, 0.1], [-0.02, 0.2], [-0.1, 0.2]].map(([z, y]) => [z, H + y]), { plane: 'zy', a: -0.13, b: 0.13 });
      const dial = K.patch('dial', 48, 48, (V) => { V.fill(0xf08aa0); V.disc(24, 24, 22, 0xe8e6de); V.disc(24, 24, 9, 0xf08aa0); for (let k = 0; k < 10; k++) { const a = 0.9 + k * 0.52; V.disc(24 + Math.cos(a) * 15.5, 24 + Math.sin(a) * 15.5, 3, 0x3a2a2e); } V.box(36, 8, 41, 11, 0xb4b8bc); }, { rough: 0.5 });
      K.quadUV(dial, [-0.075, H + 0.105, 0.097], [0.075, H + 0.105, 0.097], [0.075, H + 0.195, -0.013], [-0.075, H + 0.195, -0.013], [0, 0.77, 0.64]);
      K.box(plastic(0xe0708a, 0.2), -0.13, H + 0.2, -0.085, 0.13, H + 0.225, -0.035, { bevel: 0.006 });
      K.box(pk, -0.14, H + 0.225, -0.085, 0.14, H + 0.255, -0.04, { bevel: 0.012 }); for (const s of [-1, 1]) K.box(pk, s * 0.14 - 0.035, H + 0.2, -0.095, s * 0.14 + 0.035, H + 0.262, -0.03, { bevel: 0.014 });
      K.box(metal(0xb4b8bc, 0.3), 0.07, H + 0.2, 0.0, 0.11, H + 0.212, 0.03); K.box(flat(0x26221e, 0.6), 0.082, H + 0.212, 0.008, 0.098, H + 0.2125, 0.022);
      const tg = K.patch('ten', 24, 14, (V) => { V.fill(0xf2efe6); V.text5('10', 3, 11, 0xc8302a); kana(K, V, '円', 14, 13, 0xc8302a, { size: 8 }); }, { rough: 0.6 });
      K.face(tg, '+z', -0.11, H + 0.03, -0.05, H + 0.065, 0.1008);
      K.tube(flat(0x3a2a2e, 0.7), [[-0.13, H + 0.22, -0.06], [-0.17, H + 0.1, -0.03], [-0.15, H + 0.02, 0.02], [-0.13, H + 0.03, 0.06]], 0.005, 4);
    },

    // ------------------------------------------------------------- the shaved-ice flag 氷 (0.495 x 1.545 x 0.225)
    kakigori_flag: (K, B) => {
      const px = B.x1 - 0.06;
      K.cyl(paint(0x2f5a44, 0.2), px, 0, 0, 0.09, 0.05, 10, { bevel: 0.012 }); K.cyl(metal(0xb4babf, 0.3), px, 0.05, 0, 0.012, B.y1 - 0.07, 6); K.ball(metal(0xc8a44a, 0.3), px, B.y1 - 0.016, 0, 0.016, 0.016, 0.016, 6, 3);
      K.rod(metal(0xb4babf, 0.3), [px, 1.44, 0], [B.x0 + 0.01, 1.44, 0], 0.006, 5);
      const fl = K.patch('kori', 72, 144, (V) => {
        V.fill(0xf2f0e8); kana(K, V, '氷', 36, 132, 0xd8322a, { size: 16, s: 4, align: 'center' });
        for (let i = 0; i < 72; i++) { const a = Math.round(26 + Math.sin(i / 72 * 6.2832 * 2) * 5), b = Math.round(14 + Math.sin(i / 72 * 6.2832 * 2 + 1.6) * 5); for (let j = 0; j < a; j++) V.px(i, j, j < b ? 0x2a6ac8 : 0x5aa4e8); }
        for (const [i, j] of [[10, 36], [30, 40], [52, 37], [64, 42]]) V.disc(i, j, 2, 0x5aa4e8); V.box(0, 138, 72, 144, 0x2a6ac8);
      }, { rough: 0.95 });
      K.quadUV(fl, [B.x0 + 0.02, 0.76, 0.004], [px - 0.03, 0.76, -0.004], [px - 0.03, 1.435, 0], [B.x0 + 0.02, 1.435, 0], null, { both: true });
      for (const x of [B.x0 + 0.06, B.x0 + 0.2, px - 0.07]) K.box(fabric(0xf2f0e8), x - 0.012, 1.43, -0.008, x + 0.012, 1.452, 0.008);
    },

    // ------------------------------------------------------------- a Shigaraki tanuki (0.4 x 0.53 x 0.33)
    tanuki_statue: (K, B) => {
      const br = ceramic(0x7a5236), belly = ceramic(0xe0cfa4), dk = ceramic(0x3a2a20);
      K.ball(br, 0, 0.16, -0.02, 0.15, 0.17, 0.13, 9, 5); K.ball(belly, 0, 0.15, 0.03, 0.115, 0.13, 0.1, 8, 4);
      K.ball(br, 0, 0.35, 0.0, 0.11, 0.095, 0.1, 9, 4); K.ball(belly, 0, 0.325, 0.06, 0.06, 0.045, 0.05, 7, 3);
      K.sym((s) => { K.ball(br, s * 0.075, 0.02, 0.06, 0.05, 0.025, 0.07, 7, 3); K.prism(br, [[s * 0.05, 0.42], [s * 0.11, 0.41], [s * 0.095, 0.47]], { plane: 'xy', a: -0.02, b: 0.02 }); K.ball(dk, s * 0.045, 0.36, 0.085, 0.028, 0.03, 0.014, 6, 3); K.ball(flat(0xf2efe6, 0.3), s * 0.045, 0.362, 0.096, 0.012, 0.014, 0.006, 6, 3); K.ball(flat(0x26221e, 0.3), s * 0.045, 0.36, 0.101, 0.006, 0.007, 0.004, 5, 2); });
      K.ball(dk, 0, 0.325, 0.11, 0.016, 0.012, 0.012, 6, 3);
      // the straw hat pushed back, the sake flask, the passbook, the tail
      K.lathe(matte(0xc8a05a, 0.15), [0, 0.42, -0.04], [[0.19, -0.03], [0.07, 0.04], [0, 0.06]], 10); K.lathe(flat(0x9a7a3a, 0.95), [0, 0.42, -0.04], [[0.19, -0.032], [0.07, 0.034]], 10, { flip: true });
      K.lathe(ceramic(0x8a6a48), [-0.155, 0.1, 0.07], [[0, 0], [0.03, 0], [0.04, 0.04], [0.03, 0.08], [0.014, 0.1], [0.014, 0.125], [0, 0.125]], 7); K.rod(flat(0x5a4632, 0.9), [-0.155, 0.225, 0.07], [-0.13, 0.25, 0.04], 0.004, 4);
      const kn = K.patch('tsu', 20, 28, (V) => { framed(V, 0xe8dcc0, 0x5a4632); kana(K, V, '通', 2, 22, 0x26221e, { size: 16 }); }, { rough: 0.6 });
      K.box(flat(0xe8dcc0, 0.6), 0.12, 0.09, 0.09, 0.19, 0.19, 0.1); K.face(kn, '+z', 0.12, 0.09, 0.19, 0.19, 0.1008);
      K.ball(br, 0.0, 0.08, -0.14, 0.06, 0.06, 0.05, 7, 3);
      void B;
    },

    // ------------------------------------------------------------- the chalk menu board (0.448 x 0.816 x 0.36): an A-frame, the menu to +z
    sign_stand: (K, B) => {
      const w = B.w / 2, zf = B.z1 - 0.012, tilt = Math.atan2(B.d * 0.42, 0.8);
      const bd = K.patch('menu', 100, 172, (V) => {
        V.fill(0x2a3a32); V.frame(0, 0, 100, 172, 0x8a6a48); V.frame(1, 1, 99, 171, 0x6a4a34);
        kana(K, V, 'メニュー', 50, 166, 0xf2efe6, { size: 16, align: 'center' }); V.hline(14, 86, 146, 0xf2c21c);
        [['ラムネ', '50', 0x8ad0d8], ['くじ', '20', 0xf4b0c0], ['ガチャ', '100', 0xf2c21c], ['アイス', '60', 0xf2efe6]].forEach(([t, p, c], k) => { kana(K, V, t, 8, 140 - k * 24, c, { size: 16 }); V.text5(p, 92, 134 - k * 24, 0xf2efe6, { align: 'right', s: 2 }); });
        mascot(V, 'neko', 12, 36, { a: 0xf2efe6, k: 0x2a3a32 }, 2); V.text5('OPEN', 70, 26, 0xf4b0c0, { align: 'center', s: 2 });
        for (const [i, j] of [[30, 10], [60, 8], [80, 44]]) { V.px(i, j, 0x8a9a92); V.px(i + 1, j, 0x8a9a92); } // chalk dust
      }, { rough: 0.95 });
      K.at([0, 0, zf], () => { plank(K, WL, -w, 0, -0.016, w, 0.82, 0, { axis: 'y', bevel: 0.003 }); K.face(bd, '+z', -w + 0.012, 0.09, w - 0.012, 0.8, 0.0008); for (const s of [-1, 1]) plank(K, darken(WL, 0.1), s * w - (s > 0 ? 0.022 : 0), 0, -0.02, s * w + (s > 0 ? 0 : 0.022), 0.82, 0.004, { axis: 'y', v: 1 }); }, { rx: -tilt });
      K.at([0, 0, B.z0 + 0.012], () => { for (const s of [-1, 1]) plank(K, darken(WL, 0.1), s * w - (s > 0 ? 0.022 : 0), 0, -0.004, s * w + (s > 0 ? 0 : 0.022), 0.82, 0.02, { axis: 'y', v: 2 }); plank(K, WL, -w, 0.2, 0, w, 0.24, 0.016); plank(K, WL, -w, 0.6, 0, w, 0.64, 0.016); }, { rx: tilt });
      K.rod(metal(0x8a9094), [w - 0.011, 0.3, zf - 0.11], [w - 0.011, 0.3, B.z0 + 0.12], 0.003, 4);
    },

    // ------------------------------------------------------------- morning glories trained up a lantern frame (0.4 x 0.81 x 0.31)
    asagao_pot: (K, B) => {
      const x = -0.04, ys = pot(K, x, 0, 0, 0.12, 0.16, { c: ceramic(0x2f5a8a), n: 10, saucer: true }), cane = flat(0x4f8a46, 0.8);
      for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; K.rod(cane, [x + Math.cos(a) * 0.085, ys, Math.sin(a) * 0.085], [x + Math.cos(a) * 0.085, B.y1 - 0.02, Math.sin(a) * 0.085], 0.005, 4); }
      for (const y of [0.36, 0.56, 0.76]) K.torus(cane, x, y, 0, 0.088, 0.004, 10, 3);
      for (let k = 0; k < 22; k++) { const t = k / 22, a = t * 16, y = ys + 0.04 + t * 0.56, r = 0.09; leaf(K, flat(k % 2 ? 0x4f8f45 : 0x6aa84f, 0.9), [x + Math.cos(a) * r * 0.8, y, Math.sin(a) * r * 0.8], [x + Math.cos(a) * (r + 0.055), y + 0.02, Math.sin(a) * (r + 0.055)], 0.06); }
      for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.3, y = ys + 0.14 + (k % 4) * 0.13; flower(K, flat([0x5a6ad8, 0xe86aa8, 0x8a5ad8, 0x4a9ae8][k % 4], 0.8), [x + Math.cos(a) * 0.13, y, Math.sin(a) * 0.13], 0.04, { dir: [Math.cos(a), 0.35, Math.sin(a)], eye: flat(0xffffff) }); }
      // a seedling in a small pot beside it
      const y2 = pot(K, B.x1 - 0.06, 0, B.z1 - 0.07, 0.05, 0.07);
      leaf(K, flat(0x6aa84f, 0.9), [B.x1 - 0.06, y2, B.z1 - 0.07], [B.x1 - 0.02, y2 + 0.05, B.z1 - 0.06], 0.035); leaf(K, flat(0x4f8f45, 0.9), [B.x1 - 0.06, y2, B.z1 - 0.07], [B.x1 - 0.1, y2 + 0.045, B.z1 - 0.08], 0.035);
    },

    // ------------------------------------------------------------- twin retro gacha machines on a stand (0.925 x 1.0 x 0.425)
    gacha_twin: (K, B) => {
      const w = B.w / 2, d = B.d / 2, H = 0.4;
      plank(K, WL, -w, H - 0.03, -d, w, H, d, { bevel: 0.004 }); plank(K, WL, -w + 0.04, 0.12, -d + 0.03, w - 0.04, 0.14, d - 0.03, { v: 1 });
      for (const [x, z] of [[-w + 0.02, -d + 0.02], [w - 0.06, -d + 0.02], [-w + 0.02, d - 0.06], [w - 0.06, d - 0.06]]) plank(K, darken(WL, 0.1), x, 0, z, x + 0.04, H - 0.03, z + 0.04, { axis: 'y', v: 2 });
      const cols = [0xe84a3a, 0x3a7ad8, 0xf2c21c, 0x3a9a4a, 0xe86aa8, 0x8a5bd6];
      const machine = (x, c, yen) => {
        const body = paint(c, 0.25), hw = 0.14, z1 = 0.12;
        K.box(body, x - hw, H, -0.12, x + hw, H + 0.25, z1, { bevel: 0.012 });
        const pn = K.patch('panel' + c, 56, 48, (V) => { V.fill(c); V.box(4, 26, 52, 44, 0xf2efe6); V.text5(String(yen), 20, 40, 0xc8302a, { align: 'center', s: 2 }); kana(K, V, '円', 34, 42, 0xc8302a, { size: 16 }); V.disc(16, 12, 9, 0xb4b8bc); V.disc(16, 12, 6, 0x8a8e92); V.box(14, 6, 18, 18, 0xdcdcd8); V.box(34, 4, 50, 20, 0x26221e); V.frame(34, 4, 50, 20, 0xb4b8bc); }, { rough: 0.5 });
        K.face(pn, '+z', x - hw + 0.02, H + 0.02, x + hw - 0.02, H + 0.23, z1 + 0.001);
        K.cyl(chrome(0xb4babf), x - 0.06, H + 0.07, z1, 0.03, 0.03, 8, { axis: 'z' }); K.box(chrome(0xb4babf), x - 0.068, H + 0.045, z1 + 0.03, x - 0.052, H + 0.095, z1 + 0.04);
        for (let k = 0; k < 9; k++) capsule(K, x - 0.08 + ((k * 0.37) % 1) * 0.16, H + 0.29 + ((k * 0.23) % 1) * 0.16, -0.06 + ((k * 0.61) % 1) * 0.12, 0.034, cols[(k + yen) % 6], { rx: k, rz: k * 0.6, c2: 0xdcecec });
        K.glass(() => K.box(K.tint(0xd4e8ec, 56), x - hw + 0.012, H + 0.25, -0.108, x + hw - 0.012, H + 0.5, z1 - 0.012));
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(body, x + dx * (hw - 0.012) - 0.012, H + 0.25, (dz > 0 ? z1 - 0.024 : -0.12), x + dx * (hw - 0.012) + 0.012, H + 0.5, (dz > 0 ? z1 : -0.096));
        K.box(body, x - hw - 0.004, H + 0.5, -0.124, x + hw + 0.004, B.y1 - 0.04, z1 + 0.004, { bevel: 0.01 }); K.cyl(body, x, B.y1 - 0.04, 0, 0.05, 0.04, 8, { bevel: 0.008 });
      };
      machine(-0.2, 0xc8302a, 20); machine(0.2, 0xe8e6de, 10);
      const sg = K.patch('gacha', 96, 20, (V) => { framed(V, 0xf2efe6, 0xc8302a); kana(K, V, 'ガチャガチャ', 48, 18, 0xc8302a, { size: 16, align: 'center' }); }, { rough: 0.8 });
      K.box(flat(0xf2efe6, 0.8), -0.2, H - 0.14, d - 0.012, 0.2, H - 0.05, d - 0.004); K.face(sg, '+z', -0.2, H - 0.14, 0.2, H - 0.05, d - 0.0032);
    },

    // ------------------------------------------------------------- the big lucky cat (0.42 x 0.51 x 0.42)
    lucky_cat_big: (K) => luckyCat(K, 2.66),
  },
};
