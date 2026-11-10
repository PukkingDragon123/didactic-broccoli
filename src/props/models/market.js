// Flea-market finds and lucky charms (ids from src/data/props/market.js): engimono from the shrine fair (kumade,
// hamaya, ema, koban, gourds, an Inari fox), the tip jars, the brick in newspaper, trinkets, the outgoing crate.
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, plank, jar, slatCrate, tied } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot } from '../kit/prints.js';
import { daruma } from './garage.js';

const GOLD = metal(0xd8a83a, 0.3), RED = 0xc8302a;
function tipsLabel(K) { return K.patch('tips', 48, 22, (V) => { V.fill(0xf2ead6); V.text5('TIPS', 24, 18, 0x26221e, { align: 'center', s: 2 }); V.hline(6, 42, 2, RED); }, { rough: 0.9, shared: true }); }

export default {
  family: 'shop',
  models: {
    // ------------------------------------------------------------- a kumade: the lucky rake, loaded with charms (0.27 x 0.306 x 0.066)
    mk_kumade: (K, B) => {
      plank(K, 0x7a4e30, -0.045, 0, -0.03, 0.045, 0.014, 0.03, { bevel: 0.003 });
      K.cyl(flat(0xc8a86a, 0.8), 0, 0.014, 0, 0.005, 0.15, 5);
      for (let k = 0; k < 9; k++) { const a = -1.1 + k * 0.275; K.tube(flat(0xc8a86a, 0.8), [[0, 0.16, 0], [Math.sin(a) * 0.09, 0.16 + Math.cos(a) * 0.09, 0], [Math.sin(a) * 0.125, 0.16 + Math.cos(a) * 0.125, 0.012]], 0.003, 3); }
      // the charms: a round okame face, a sea bream, gold koban, a rice bale, pine and plum
      K.cyl(flat(0xf2efe6, 0.5), 0, 0.215, 0.006, 0.034, 0.012, 9, { axis: 'z' });
      const fc = K.patch('okame', 20, 20, (V) => { V.fill(0xf2efe6); V.hline(4, 7, 12, 0x26221e); V.hline(12, 15, 12, 0x26221e); V.box(8, 5, 12, 7, RED); V.disc(4, 8, 2, 0xf0a8a8); V.disc(15, 8, 2, 0xf0a8a8); V.box(4, 17, 16, 20, 0x26221e); }, { rough: 0.5 });
      K.face(fc, '+z', -0.024, 0.191, 0.024, 0.239, 0.0185);
      K.prism(paint(0xd8443a, 0.2), [[0.04, 0.17], [0.09, 0.185], [0.115, 0.165], [0.1, 0.2], [0.115, 0.215], [0.09, 0.2], [0.045, 0.205]], { plane: 'xy', a: 0.008, b: 0.02 });
      for (const [x, y] of [[-0.07, 0.19], [-0.095, 0.225], [0.06, 0.25]]) K.lathe(GOLD, [x, y, 0.008], [[0, 0], [0.016, 0], [0.016, 0.006], [0, 0.006]], 7, { axis: 'z', sz: 1.5 });
      K.cyl(matte(0xc8a05a, 0.15), -0.05, 0.255, 0.01, 0.018, 0.04, 7, { axis: 'x' }); for (const x of [-0.04, -0.02]) K.torus(flat(0x8a6a3a, 0.9), x, 0.255, 0.01, 0.018, 0.002, 7, 3, { axis: 'x' });
      for (const [x, y, c] of [[0.0, 0.27, 0x3a8a4a], [0.03, 0.285, 0xe86aa8], [-0.02, 0.29, 0x3a8a4a], [0.085, 0.24, 0xf2efe6]]) blob(K, flat(c, 0.8), x, y, 0.012, 0.016, 0.016, 0.008, { seed: Math.round(x * 300), jit: 0.2 });
      K.box(flat(RED, 0.7), -0.012, 0.13, 0.005, 0.012, 0.16, 0.007); void B;
    },

    // ------------------------------------------------------------- a hamaya: the demon-breaking arrow with its bell and little ema (0.096 x 0.39 x 0.066)
    mk_hamaya: (K, B) => {
      plank(K, 0x7a4e30, -0.035, 0, -0.025, 0.035, 0.012, 0.025, { bevel: 0.003 });
      K.cyl(flat(0xf2efe6, 0.6), 0, 0.012, 0, 0.004, 0.33, 5); K.cyl(flat(RED, 0.6), 0, 0.2, 0, 0.0045, 0.06, 5, { caps: false });
      K.lathe(metal(0xb4b8bc, 0.3), [0, 0.342, 0], [[0.006, 0], [0.004, 0.02], [0, B.y1 - 0.342]], 4);
      for (const a of [0, 2.094, 4.189]) K.sheet(flat(0xf2efe6, 0.8), [0, 0.03, 0], [Math.cos(a) * 0.022, 0.04, Math.sin(a) * 0.022], [Math.cos(a) * 0.022, 0.1, Math.sin(a) * 0.022], [0, 0.11, 0], { back: flat(0xd8322a, 0.8) });
      K.ball(GOLD, 0.018, 0.16, 0.012, 0.01, 0.01, 0.01, 6, 3); K.rod(flat(RED, 0.8), [0, 0.2, 0.004], [0.018, 0.17, 0.012], 0.0015, 3);
      K.prism(wood(0xd8b88a), [[-0.03, 0.12], [0.005, 0.12], [0.005, 0.155], [-0.0125, 0.168], [-0.03, 0.155]], { plane: 'xy', a: 0.012, b: 0.016 }); K.rod(flat(RED, 0.8), [0, 0.19, 0.004], [-0.0125, 0.166, 0.014], 0.0015, 3);
    },

    // ------------------------------------------------------------- an ema: a votive plaque, the horse of its year (0.125 x 0.135 x 0.045)
    mk_ema: (K, B) => {
      plank(K, 0x7a4e30, B.x0, 0, B.z0, B.x1, 0.012, B.z1, { bevel: 0.003 });
      const V = K.patch('ema', 56, 52, (V) => { V.fill(0xe8cfa0); V.polyPx([[0, 40], [28, 52], [56, 40], [56, 52], [0, 52]], 0xe8cfa0); V.frame(0, 0, 56, 41, 0xb89860);
        V.polyPx([[14, 14], [38, 14], [42, 26], [34, 30], [36, 36], [30, 36], [26, 28], [14, 26]], 0xc8302a); V.box(16, 6, 19, 14, 0xc8302a); V.box(34, 6, 37, 14, 0xc8302a); V.box(10, 22, 15, 26, 0x26221e); V.px(34, 32, 0xf2efe6);
        V.box(10, 3, 46, 5, 0x26221e); kana(K, V, '午', 44, 40, 0x26221e, { size: 8 }); }, { rough: 0.8 });
      K.prism(wood(0xd8b88a), [[B.x0 + 0.004, 0.012], [B.x1 - 0.004, 0.012], [B.x1 - 0.004, 0.105], [0, B.y1 - 0.004], [B.x0 + 0.004, 0.105]], { plane: 'xy', a: -0.004, b: 0.004 });
      K.quadUV(V, [B.x0 + 0.004, 0.012, 0.0046], [B.x1 - 0.004, 0.012, 0.0046], [B.x1 - 0.004, 0.105, 0.0046], [B.x0 + 0.004, 0.105, 0.0046], [0, 0, 1], { sub: [0, 0, 1, 0.79] });
      K.triUV(V, [B.x0 + 0.004, 0.105, 0.0046], [B.x1 - 0.004, 0.105, 0.0046], [0, B.y1 - 0.004, 0.0046], [[0.01, 0.79], [0.99, 0.79], [0.5, 0.99]], [0, 0, 1]);
      K.torus(flat(RED, 0.8), 0, B.y1 - 0.004, 0, 0.007, 0.0015, 6, 3, { axis: 'z' });
    },

    // ------------------------------------------------------------- a lucky koban on its stand (0.116 x 0.108 x 0.084)
    mk_koban: (K, B) => {
      K.box(paint(RED, 0.2), B.x0, 0, B.z0, B.x1, 0.014, B.z1, { bevel: 0.004 }); K.box(GOLD, B.x0 - 0.0005, 0.004, B.z0 - 0.0005, B.x1 + 0.0005, 0.008, B.z1 + 0.0005);
      const kb = K.patch('koban', 32, 48, (V) => { V.fill(0xd8a83a); for (let j = 4; j < 46; j += 3) V.hline(4, 27, j, 0xc0902a); V.box(8, 14, 24, 34, 0xd8a83a); kana(K, V, '福', 8, 32, 0x7a4a12, { size: 16 }); V.disc(16, 41, 3, 0xb8862a); V.disc(16, 7, 3, 0xb8862a); }, { rough: 0.35 });
      K.at([0, 0.016, -0.004], () => { K.lathe(GOLD, [0, 0.042, 0], [[0, 0], [0.028, 0], [0.028, 0.007], [0, 0.007]], 10, { axis: 'z', sz: 1.55 }); K.face(kb, '+z', -0.018, 0.012, 0.018, 0.072, 0.0074); }, { rx: -0.2 });
      for (const [x, z] of [[-0.035, 0.022], [0.034, 0.026]]) K.lathe(GOLD, [x, 0.014, z], [[0.016, 0], [0.016, 0.004], [0, 0.004]], 7, { sx: 1.5 });
    },

    // ------------------------------------------------------------- six gourds (mubyō: six, no illness) on a rack (0.132 x 0.164 x 0.044)
    mk_hyotan: (K, B) => {
      plank(K, 0x7a4e30, B.x0, 0, B.z0, B.x1, 0.01, B.z1, { bevel: 0.002 });
      K.cyl(wood(0x7a4e30), 0, 0.01, 0, 0.005, 0.14, 5); K.cyl(wood(RED), B.x0 + 0.006, 0.146, 0, 0.004, B.w - 0.012, 5, { axis: 'x' });
      for (let k = 0; k < 6; k++) { const x = B.x0 + 0.018 + k * (B.w - 0.036) / 5, y = 0.085 + (k % 2) * 0.02; K.lathe(GOLD, [x, y, 0.004], [[0, 0], [0.008, 0.004], [0.011, 0.014], [0.005, 0.024], [0.008, 0.032], [0.003, 0.042], [0, 0.043]], 6); K.rod(flat(RED, 0.8), [x, y + 0.042, 0.004], [x, 0.146, 0], 0.001, 3); K.cyl(flat(RED, 0.8), x, y + 0.022, 0.004, 0.0062, 0.004, 6, { caps: false }); }
    },

    // ------------------------------------------------------------- an Inari fox (0.095 x 0.17 x 0.085), facing +z
    mk_kitsune: (K, B) => {
      const W = ceramic(0xeeeae0);
      K.box(stone(0x9a968c), B.x0, 0, B.z0, B.x1, 0.022, B.z1, { bevel: 0.004 });
      K.lathe(W, [0, 0.022, -0.004], [[0, 0], [0.026, 0], [0.03, 0.02], [0.02, 0.07], [0.014, 0.085]], 8); // seated body
      K.sym((s) => { K.box(W, s * 0.014 - 0.007, 0.022, 0.012, s * 0.014 + 0.007, 0.075, 0.026, { bevel: 0.003, edge: null }); K.prism(W, [[s * 0.006, 0.142], [s * 0.022, 0.138], [s * 0.017, B.y1]], { plane: 'xy', a: -0.008, b: 0.004 }); K.box(flat(RED, 0.5), s * 0.011 - 0.003, 0.143, 0.0042, s * 0.011 + 0.003, 0.156, 0.0048); });
      K.box(W, -0.02, 0.105, -0.018, 0.02, 0.142, 0.016, { bevel: 0.008, edge: null }); K.prism(W, [[0.014, 0.108], [0.04, 0.112], [0.014, 0.128]].map(([z, y]) => [z, y]), { plane: 'zy', a: -0.009, b: 0.009 });
      for (const s of [-1, 1]) K.box(flat(0x26221e, 0.4), s * 0.012 - 0.004, 0.127, 0.0162, s * 0.012 + 0.004, 0.13, 0.0168);
      K.prism(fabric(RED), [[-0.022, 0.1], [0.022, 0.1], [0.014, 0.07], [0, 0.064], [-0.014, 0.07]], { plane: 'xy', a: 0.022, b: 0.028 }); // the bib
      K.tube(W, [[0, 0.03, -0.03], [0.012, 0.08, -0.04], [0.006, 0.125, -0.032]], 0.012, 5, { radii: [0.01, 0.014, 0.006] }); K.ball(GOLD, 0, 0.11, 0.045, 0.006, 0.006, 0.006, 5, 2); // the tail; the jewel in its mouth
    },

    // ------------------------------------------------------------- tip jars: a pickle jar, a kappa, a ramen bowl, a daruma bank
    mk_jar_pickle: (K, B) => { jar(K, 0, 0, 0, 0.05, B.y1, { n: 10, lid: paint(0x8a2622), lidH: 0.022 }); K.wrap(tipsLabel(K), 0, 0.04, 0.085, 0, 0.05, { n: 10, arc: 1.9 }); for (const [x, z, c] of [[0, 0, 0xc8a84a], [0.018, 0.01, 0xb4b8bc], [-0.012, 0.016, 0xb87a4a]]) K.cyl(metal(c, 0.3), x, 0.003, z, 0.011, 0.003, 7); K.box(flat(0x26221e, 0.5), -0.018, B.y1 + 0.0002, -0.003, 0.018, B.y1 + 0.0006, 0.003); },
    mk_jar_kappa: (K, B) => {
      const g = ceramic(0x4a9a52);
      K.ball(g, 0, 0.05, 0, 0.048, 0.05, 0.046, 9, 4); K.ball(g, 0, 0.12, 0, 0.04, 0.036, 0.038, 9, 4);
      K.lathe(ceramic(0xe8e6de), [0, 0.148, 0], [[0.03, 0], [0.028, 0.008], [0, 0.006]], 9); K.lathe(ceramic(0x3a8a44), [0, 0.142, 0], [[0.042, 0], [0.03, 0.008]], 9); // the dish on its head
      K.prism(ceramic(0xe8b830), [[0.028, 0.108], [0.052, 0.113], [0.028, 0.124]].map(([z, y]) => [z, y]), { plane: 'zy', a: -0.014, b: 0.014 });
      for (const s of [-1, 1]) K.box(flat(0x26221e, 0.4), s * 0.016 - 0.004, 0.128, 0.033, s * 0.016 + 0.004, 0.136, 0.0355);
      K.ball(ceramic(0xe8dca0), 0, 0.05, 0.022, 0.032, 0.036, 0.028, 7, 3); K.box(flat(0x26221e, 0.5), -0.014, 0.156, -0.003, 0.014, 0.1564, 0.003);
      K.at([0, 0.045, 0.049], () => K.face(tipsLabel(K), '+z', -0.03, -0.014, 0.03, 0.014, 0), { rx: -0.1 }); void B;
    },
    mk_jar_ramen: (K, B) => {
      const side = K.patch('raimon', 96, 12, (V) => { V.fill(RED); V.box(0, 0, 96, 2, 0xf2efe6); for (let k = 0; k < 8; k++) { V.frame(2 + k * 12, 3, 12 + k * 12, 11, 0xf2efe6); V.box(5 + k * 12, 6, 9 + k * 12, 8, 0xf2efe6); } }, { rough: 0.4, shared: true });
      K.lathe(ceramic(0xe8e6de), [0, 0, 0], [[0, 0], [0.03, 0], [0.032, 0.008]], 12); K.wrap(side, 0, 0.008, 0.062, 0, 0.032, { n: 12, r1: 0.066, lift: 0 });
      K.lathe(ceramic(RED), [0, 0.062, 0], [[0.066, 0], [0.066, 0.005], [0.06, 0.005]], 12); K.lathe(ceramic(0xe8e6de), [0, 0.067, 0], [[0.06, 0], [0.03, -0.04], [0, -0.042]], 12);
      for (const [x, z, c] of [[0, 0, 0xc8a84a], [0.022, 0.01, 0xb4b8bc], [-0.016, 0.018, 0xb87a4a], [0.006, -0.022, 0xb4b8bc]]) K.cyl(metal(c, 0.3), x, 0.028, z, 0.011, 0.003, 7);
      void B;
    },
    mk_jar_daruma: (K) => daruma(K, 0.74),

    // ------------------------------------------------------------- a brick wrapped in newspaper (0.23 x 0.08 x 0.18)
    mk_brick: (K, B) => {
      const np = K.patch('news', 64, 48, (V) => { V.fill(0xe0dac8); for (let c = 0; c < 3; c++) smallPrint(V, 3 + c * 21, 44, 17, 12, 0x5a564c, { seed: c + 4, lh: 3 }); V.box(24, 28, 40, 40, 0x9a968a); }, { rough: 0.95 });
      K.use(K.along(np, [B.x0, 0, B.z0, B.x1, B.y1, B.z1], 'x'), (G) => G.box(B.x0, 0, B.z0, B.x1, B.y1 - 0.002, B.z1, { bevel: 0.008 }));
      K.face(np, '+y', B.x0 + 0.008, B.z0 + 0.008, B.x1 - 0.008, B.z1 - 0.008, B.y1 - 0.0016);
      K.box(flat(0xc8a878, 0.5), -0.015, 0, B.z0 - 0.0006, 0.015, B.y1 - 0.001, B.z1 + 0.0006); K.box(flat(0xc8302a, 0.6), B.x0 + 0.02, B.y1 - 0.0012, -0.03, B.x0 + 0.07, B.y1 - 0.0006, 0.03); // tape, a 特価 sticker
    },

    // ------------------------------------------------------------- trinkets
    mk_trinket_button: (K) => { K.lathe(plastic(0xe84a5a, 0.3), [0, 0, 0], [[0, 0], [0.02, 0], [0.0225, 0.004], [0.019, 0.009], [0.014, 0.006], [0, 0.006]], 10); for (const [x, z] of [[-0.005, -0.005], [0.005, -0.005], [-0.005, 0.005], [0.005, 0.005]]) K.cyl(flat(0x8a2a34, 0.6), x, 0.0058, z, 0.002, 0.0006, 5); },
    mk_trinket_spoon: (K, B) => { const s = metal(0xb4b8bc, 0.3); K.lathe(s, [0, 0.002, B.z0 + 0.013], [[0, 0], [0.009, 0.002], [0.0098, 0.005]], 7, { sz: 1.3 }); K.box(s, -0.002, 0.003, B.z0 + 0.024, 0.002, 0.005, B.z1 - 0.012); K.box(metal(0xc8a44a, 0.3), -0.007, 0.002, B.z1 - 0.014, 0.007, 0.007, B.z1, { bevel: 0.002 }); },
    mk_trinket_cassette: (K, B) => {
      K.box(plastic(0x2a2c32, 0.15), B.x0, 0, B.z0, B.x1, B.y1 - 0.004, B.z1, { bevel: 0.003 });
      const lb = K.patch('mix', 64, 40, (V) => { V.fill(0xeeeae0); V.box(0, 28, 64, 40, 0xe84a3a); V.text5('MIX 99', 32, 37, 0xf2efe6, { align: 'center' }); V.box(12, 6, 52, 22, 0x2a2c32); V.disc(22, 14, 5, 0xeeeae0); V.disc(42, 14, 5, 0xeeeae0); V.disc(22, 14, 2, 0x2a2c32); V.disc(42, 14, 2, 0x2a2c32); V.box(28, 11, 36, 17, 0x6a4a3a); }, { rough: 0.6 });
      K.face(lb, '+y', B.x0 + 0.006, B.z0 + 0.008, B.x1 - 0.006, B.z1 - 0.006, B.y1 - 0.0036);
    },
    mk_trinket_keychain: (K, B) => { K.torus(metal(0x9aa0a4, 0.3), 0, B.y1 - 0.014, 0, 0.011, 0.002, 8, 3, { axis: 'z' }); K.rod(metal(0x9aa0a4, 0.3), [0, B.y1 - 0.025, 0], [0, 0.03, 0], 0.0015, 3); K.box(plastic(0xf2c21c, 0.25), -0.014, 0, -0.006, 0.014, 0.03, 0.006, { bevel: 0.006 }); for (const s of [-1, 1]) K.box(flat(0x26221e, 0.4), s * 0.006 - 0.003, 0.016, 0.006, s * 0.006 + 0.003, 0.022, 0.0066); K.box(flat(0x26221e, 0.4), -0.006, 0.008, 0.006, 0.006, 0.01, 0.0066); },
    mk_trinket_batteries: (K, B) => { for (let k = 0; k < 3; k++) { const x = B.x0 + 0.0075 + k * 0.015; K.cyl(flat(0x26262a, 0.5), x, 0, 0, 0.007, 0.028, 6); K.cyl(metal(0xd8a83a, 0.3), x, 0.028, 0, 0.007, 0.014, 6); K.cyl(metal(0xb4b8bc, 0.3), x, 0.042, 0, 0.003, 0.003, 5); } },
    mk_trinket_marble: (K) => { K.glass(() => K.ball(K.tint(0x9ad8e8, 150, 0.1), 0, 0.011, 0, 0.011, 0.011, 0.011, 8, 4)); K.ball(flat(0xf2f6f8, 0.2), 0.002, 0.012, 0.002, 0.004, 0.006, 0.003, 5, 2); },

    // ------------------------------------------------------------- the outgoing crate (0.54 x 0.216 x 0.372)
    mk_outbox: (K, B) => {
      slatCrate(K, 0xb8905a, B.x0, 0, B.z0, B.x1, B.y1, B.z1, { rows: 2, t: 0.014, gap: 0.014 });
      const st = K.patch('out', 112, 24, (V) => { V.box(0, 0, 112, 24, 0xb8905a, 255); V.text5('OUTGOING', 56, 19, 0xc8302a, { align: 'center', s: 2 }); V.frame(1, 1, 111, 23, 0xc8302a); }, { rough: 0.8 });
      K.face(st, '+z', -0.2, 0.03, 0.2, 0.115, B.z1 + 0.001);
    },
  },
};
