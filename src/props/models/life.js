// Chores and odd jobs (ids from src/data/props/life.js): the rag, bin bags, the change float, boxes of junk, the
// shop's trash can, the dog walker's kit, the car-wash bucket and sponge, window tools, street litter, the bare
// garbage station, the breaker's lever and the 営業中 sign.
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, tones, plank, carton, stack, tied, bucket, dirtBox, can } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot, recycle } from '../kit/prints.js';
import { station, canLabel } from './street2.js';
import { openCarton } from './garage_b.js';

const CARD = 0xc49a62;
function partsLabel(K) { return K.patch('parts', 72, 28, (V) => { V.fill(0x2a2a30); V.text5('PARTS', 30, 20, 0xc8a05a, { align: 'center', s: 2 }); V.line(54, 6, 66, 22, 0xd8322a); V.line(55, 6, 67, 22, 0xd8322a); V.line(66, 6, 54, 22, 0xd8322a); V.line(67, 6, 55, 22, 0xd8322a); }, { rough: 0.9, shared: true }); }

export default {
  family: 'garage',
  models: {
    // ------------------------------------------------------------- a folded tenugui (0.174 x 0.042 x 0.162)
    rag: (K, B) => {
      const ck = K.patch('ichimatsu', 48, 48, (V) => { V.box(0, 0, 48, 48, (i, j) => ((Math.floor(i / 8) + Math.floor(j / 8)) % 2 ? 0x2f6fb8 : 0xe8e6de)); V.frame(0, 0, 48, 48, 0xe8e6de); }, { rough: 0.97, shared: true });
      K.use(fabric(0xdcdad2), (G) => G.box(B.x0, 0, B.z0, B.x1 - 0.03, 0.022, B.z1 - 0.02, { bevel: 0.006 }));
      K.face(ck, '+y', B.x0 + 0.004, B.z0 + 0.004, B.x1 - 0.034, B.z1 - 0.024, 0.0224);
      K.at([0.03, 0.022, 0.03], () => { K.use(fabric(0xdcdad2), (G) => G.box(-0.05, 0, -0.045, 0.055, 0.016, 0.05, { bevel: 0.005 })); K.face(ck, '+y', -0.046, -0.041, 0.051, 0.046, 0.0164, { sub: [0, 0, 0.66, 0.66] }); }, { ry: 0.35 });
    },

    // ------------------------------------------------------------- a roll of bin bags (0.27 x 0.078 x 0.126)
    bin_bags: (K, B) => {
      const g = 0x3a9a4a, r = 0.037;
      K.cyl(plastic(g, 0.2), B.x0 + 0.03, r, -0.02, r, 0.2, 10, { axis: 'x' });
      const lb = K.patch('gomi', 56, 24, (V) => { V.fill(0xe8e6de); V.text5('GOMI', 4, 19, g, { s: 2 }); kana(K, V, '袋', 40, 22, 0x26221e, { size: 16 }); smallPrint(V, 4, 4, 30, 1, 0x6a6a6a); }, { rough: 0.6 });
      K.face(lb, '+y', B.x0 + 0.07, 0.01, B.x0 + 0.19, B.z1 - 0.012, 0.0036);
      // the loose end pulled out flat
      K.sheet(plastic(g, 0.2), [B.x0 + 0.03, 0.003, 0.0], [B.x0 + 0.23, 0.003, 0.0], [B.x0 + 0.23, 0.002, B.z1], [B.x0 + 0.03, 0.002, B.z1]);
    },

    // ------------------------------------------------------------- the change float: a cloth bank bag and loose coins (0.138 x 0.126 x 0.108)
    coin_float: (K) => {
      blob(K, matte(0x8a6a48, 0.12), -0.01, 0.045, 0, 0.052, 0.05, 0.046, { fine: true, jit: 0.08, seed: 4, flatY: -0.85 });
      K.lathe(matte(0x8a6a48, 0.12), [-0.01, 0.085, 0], [[0.02, 0], [0.014, 0.012], [0.026, 0.035]], 7);
      K.torus(flat(0xc8302a, 0.9), -0.01, 0.097, 0, 0.017, 0.004, 7, 3);
      for (const [x, z, c] of [[0.05, 0.03, 0xc8a84a], [0.058, 0.0, 0xb4b8bc], [0.045, -0.03, 0xb4b8bc], [0.035, 0.045, 0xb87a4a]]) K.cyl(metal(c, 0.3), x, 0, z, 0.012, 0.003, 8);
      K.cyl(metal(0xb4b8bc, 0.3), 0.052, 0.003, 0.012, 0.012, 0.003, 8);
    },

    // ------------------------------------------------------------- a box of old parts, shut (0.468 x 0.396 x 0.408) and open (0.468 x 0.468 x 0.588)
    junk_box: (K, B) => {
      carton(K, B.x0, 0, B.z0, B.x1, B.y1 - 0.004, B.z1, { c: 0x34323a, tape: 0xc8a878, label: partsLabel(K), labelSize: [0.26, 0.1], labelAt: 0.62 });
      K.box(flat(0xc8a05a, 0.9), 0.06, 0.06, B.z1, 0.14, 0.17, B.z1 + 0.0012); smallPrintBox(K, 0.06, 0.06, B.z1);
    },
    junk_box_open: (K, B) => {
      const x0 = B.x0, x1 = B.x1, z0 = B.z0 + 0.09, z1 = B.z1 - 0.09, h = 0.39;
      openCarton(K, x0 + 0.004, 0, z0, x1 - 0.004, h, z1, { c: 0x34323a, label: partsLabel(K), labelSize: [0.26, 0.1], flap: 0.1, sideFlaps: false });
      // what's inside: a tangle of old machine parts
      K.box(flat(0x26242a, 0.95), x0 + 0.012, 0.01, z0 + 0.008, x1 - 0.012, h - 0.09, z1 - 0.008);
      K.cyl(metal(0x8a8e92), -0.1, h - 0.09, 0.02, 0.06, 0.03, 8); K.cyl(metal(0x6a6e72), -0.1, h - 0.06, 0.02, 0.02, 0.03, 6);
      K.at([0.08, h - 0.08, -0.04], () => K.box(metal(0xb4a05a), -0.07, 0, -0.03, 0.07, 0.04, 0.03, { bevel: 0.006 }), { ry: 0.5, rz: 0.2 });
      K.tube(flat(0xc8302a, 0.7), [[0.12, h - 0.08, 0.08], [0.02, h - 0.03, 0.1], [-0.06, h - 0.07, 0.09]], 0.007, 4); K.cyl(chrome(), 0.1, h - 0.09, 0.08, 0.012, 0.09, 6, { axis: 'z' });
    },

    // ------------------------------------------------------------- flattened cardboard, tied (0.564 x 0.144 x 0.42)
    cardboard_flat: (K, B) => {
      stack(K, CARD, B.x0 + 0.014, 0, B.z0 + 0.012, B.x1 - 0.014, B.y1 - 0.006, B.z1 - 0.012, 6, { seed: 9, jit: 0.012 });
      tied(K, B.x0 + 0.004, 0, B.z0 + 0.004, B.x1 - 0.004, B.y1 - 0.008, B.z1 - 0.004, { dx: -0.03, c: flat(0xe8e6de, 0.9) });
    },

    // ------------------------------------------------------------- the shop's trash can (0.372 x 0.576 x 0.372) and what's in it (can_fill)
    shop_trash_can: (K, B) => {
      const bl = 0x2f6fb8, w = B.w / 2 - 0.01;
      K.prism(plastic(bl, 0.2), [[-w * 0.82, -w * 0.82], [w * 0.82, -w * 0.82], [w * 0.82, w * 0.82], [-w * 0.82, w * 0.82]], { plane: 'xz', a: 0, b: 0.02 });
      for (const [f, sx, sz] of [['+z', 0, 1], ['-z', 0, -1], ['+x', 1, 0], ['-x', -1, 0]]) {
        const a = [sx * w * 0.82 + (sz ? -w * 0.82 : 0), 0.02, sz * w * 0.82 + (sx ? w * 0.82 : 0)], b = [sx * w * 0.82 + (sz ? w * 0.82 : 0), 0.02, sz * w * 0.82 + (sx ? -w * 0.82 : 0)];
        const c = [sx * w + (sz ? w : 0), 0.53, sz * w + (sx ? -w : 0)], d = [sx * w + (sz ? -w : 0), 0.53, sz * w + (sx ? w : 0)];
        K.quad(plastic(bl, 0.2), a, b, c, d, [sx, 0.1, sz]); K.quad(flat(0x24568f, 0.8), a, b, c, d, [-sx, 0, -sz]);
        void f;
      }
      K.tub(plastic(0xe8e6de, 0.1), -w - 0.008, 0.5, -w - 0.008, w + 0.008, B.y1, w + 0.008, 0.02, { floor: 0.0001, inside: flat(0xd8d6ce, 0.9), bevel: 0.006 }); // the liner bag folded over the rim
      const lb = K.patch('gomi', 48, 40, (V) => { V.fill(0xe8e6de); V.frame(0, 0, 48, 40, 0x24568f); kana(K, V, 'ゴミ', 24, 37, 0x24568f, { size: 16, align: 'center' }); recycle(V, 20, 14, 0x24568f); }, { rough: 0.6 });
      K.quadUV(lb, [-0.07, 0.24, w * 0.9 + 0.002], [0.07, 0.24, w * 0.9 + 0.002], [0.07, 0.36, w * 0.925 + 0.002], [-0.07, 0.36, w * 0.925 + 0.002], [0, 0, 1]);
      dirtBox(K, bl, -w * 0.82, -w * 0.82, w * 0.82, w * 0.82, 0, 0.03);
    },
    can_fill: (K, B) => {
      const c = [0xe8e6de, 0xd8322a, 0x3a7ad8, 0xf2c21c, 0xc49a62, 0x3a9a4a, 0xe86aa8];
      K.box(flat(0xb8b4a8, 0.95), B.x0 + 0.01, 0, B.z0 + 0.01, B.x1 - 0.01, 0.025, B.z1 - 0.01);
      for (let k = 0; k < 16; k++) blob(K, flat(c[k % 7], 0.9), B.x0 + 0.05 + ((k * 0.37) % 1) * (B.w - 0.1), 0.03, B.z0 + 0.05 + ((k * 0.61) % 1) * (B.d - 0.1), 0.04, 0.026, 0.035, { seed: k, jit: 0.3 });
    },

    // ------------------------------------------------------------- the dog walker's kit
    leash_handle: (K, B) => {
      K.torus(fabric(0xc8302a), 0, 0.105, 0, 0.05, 0.011, 10, 4, { axis: 'z' });
      K.box(fabric(0xa82622), -0.012, 0.022, -0.008, 0.012, 0.06, 0.008); K.box(chrome(), -0.01, 0, -0.006, 0.01, 0.024, 0.006, { bevel: 0.003 });
    },
    poop_bags: (K, B) => {
      K.cyl(plastic(0x3a9a4a, 0.2), 0, 0, 0, 0.03, 0.075, 8, { bevel: 0.006 });
      K.cyl(plastic(0x26262a), 0, 0.075, 0, 0.012, B.y1 - 0.075, 6); K.box(plastic(0x2f8a40), -0.004, 0.02, 0.028, 0.02, 0.06, 0.033);
    },
    poop_bag_full: (K, B) => {
      blob(K, plastic(0x3a9a4a, 0.25), 0, 0.036, 0, 0.036, 0.036, 0.032, { fine: true, jit: 0.1, seed: 2, flatY: -0.8 });
      K.lathe(plastic(0x3a9a4a, 0.25), [0, 0.066, 0], [[0.012, 0], [0.006, 0.012], [0.016, 0.034]], 6); K.torus(plastic(0x2f8a40), 0, 0.078, 0, 0.008, 0.003, 6, 3);
    },
    dog_poop: (K) => {
      const b = matte(0x6a4426, 0.2);
      K.lathe(b, [0, 0, 0], [[0, 0], [0.048, 0], [0.05, 0.018], [0.034, 0.03]], 8); K.lathe(b, [0.004, 0.026, 0.002], [[0.036, 0], [0.038, 0.014], [0.022, 0.026]], 7); K.lathe(b, [-0.002, 0.05, 0], [[0.024, 0], [0.024, 0.012], [0.006, 0.034], [0, 0.036]], 6);
    },

    // ------------------------------------------------------------- the car-wash bucket of suds (0.252 x 0.42 x 0.276), a sponge, the ladle
    wash_bucket: (K, B) => {
      bucket(K, 0, 0, 0, 0.118, 0.27, { c: plastic(0x3f86e8, 0.2), n: 12, handle: 'up', handleC: plastic(0x26262a), water: flat(0xcfe4f4, 0.3) });
      for (let k = 0; k < 7; k++) blob(K, flat(0xf2f6f8, 0.5), ((k * 0.37) % 1 - 0.5) * 0.14, 0.225 + (k % 3) * 0.012, ((k * 0.61) % 1 - 0.5) * 0.14, 0.035, 0.022, 0.035, { seed: k, jit: 0.2 });
    },
    sponge: (K, B) => {
      K.box(matte(0xe8c84a, 0.15), B.x0, 0, B.z0, B.x1, 0.032, B.z1, { bevel: 0.008 }); K.box(matte(0x3a9a4a, 0.12), B.x0, 0.03, B.z0, B.x1, B.y1, B.z1, { bevel: 0.006 });
      for (let k = 0; k < 6; k++) K.box(flat(0xc8a83a, 0.95), B.x0 + 0.015 + k * 0.018, 0.008 + (k % 3) * 0.006, B.z1, B.x0 + 0.021 + k * 0.018, 0.014 + (k % 3) * 0.006, B.z1 + 0.0006);
    },
    ladle: (K, B) => {
      const bm = 0xc8a86a, z = B.z1 - 0.045;
      K.ring(matte(bm, 0.15), 0, 0, z, 0.042, 0.036, 0.075, 8, { inside: flat(darken(bm, 0.25), 0.9) }); K.lathe(matte(bm, 0.15), [0, 0, z], [[0, 0], [0.042, 0]], 8); K.lathe(flat(darken(bm, 0.25), 0.9), [0, 0.006, z], [[0.036, 0], [0, 0]], 8);
      for (const y of [0.018, 0.058]) K.torus(flat(darken(bm, 0.35), 0.9), 0, y, z, 0.043, 0.002, 8, 3);
      K.rod(matte(lighten(bm, 0.1), 0.15), [0, 0.04, z + 0.03], [0, B.y1 - 0.008, B.z0 + 0.008], 0.007, 6);
    },

    // ------------------------------------------------------------- window tools: the squeegee (0.27 x 0.228 x 0.042) and the spray bottle
    squeegee: (K, B) => {
      K.box(rubber(0x26262a), B.x0, 0, -0.004, B.x1, 0.022, 0.004); K.box(metal(0xb4b8bc, 0.3), B.x0 + 0.004, 0.016, -0.009, B.x1 - 0.004, 0.036, 0.009, { bevel: 0.003 });
      K.box(plastic(0x26262a), -0.02, 0.034, -0.012, 0.02, 0.07, 0.012, { bevel: 0.005 });
      K.cyl(plastic(0x3a7ad8, 0.2), 0, 0.07, 0, 0.015, B.y1 - 0.07, 8, { bevel: 0.006 });
      for (let k = 0; k < 4; k++) K.torus(flat(0x2f62b0, 0.8), 0, 0.1 + k * 0.026, 0, 0.0155, 0.002, 8, 3);
    },
    spray_bottle: (K, B) => {
      K.glass(() => K.lathe(K.tint(0xcfe8f4, 120), [0, 0, -0.004], [[0, 0], [0.028, 0], [0.03, 0.012], [0.03, 0.09], [0.014, 0.125], [0.012, 0.14]], 8));
      K.lathe(flat(0x8ac8e8, 0.3), [0, 0.002, -0.004], [[0, 0], [0.026, 0], [0.026, 0.07], [0, 0.07]], 8);
      K.cyl(plastic(0xe8e6de, 0.1), 0, 0.14, -0.004, 0.014, 0.014, 8);
      K.box(plastic(0xe8e6de, 0.1), -0.013, 0.154, -0.02, 0.013, B.y1, 0.03, { bevel: 0.006 }); K.box(plastic(0xe8e6de, 0.1), -0.006, 0.166, 0.03, 0.006, 0.178, B.z1);
      K.tube(plastic(0xd8d6ce, 0.1), [[0, 0.156, 0.016], [0, 0.135, 0.03], [0, 0.118, 0.026]], 0.005, 4);
      const lb = K.patch('mado', 32, 24, (V) => { V.fill(0xe8e6de); V.box(0, 16, 32, 24, 0x3a7ad8); kana(K, V, '窓', 8, 17, 0x3a7ad8, { size: 16 }); V.text5('PIKA', 4, 22, 0xffffff); }, { rough: 0.6 });
      K.wrap(lb, 0, 0.025, 0.08, -0.004, 0.03, { n: 8, arc: 2.36 });
    },

    // ------------------------------------------------------------- street litter for the sweeping job
    litter_can: (K) => {
      K.at([0, 0.026, 0], () => { K.lathe(metal(0xb4b8bc, 0.3), [0, -0.036, 0], [[0, 0], [0.024, 0], [0.027, 0.006]], 7, { sz: 0.82 }); K.lathe(flat(0xc8282a, 0.5), [0, -0.036, 0], [[0.027, 0.006], [0.02, 0.03], [0.026, 0.05], [0.027, 0.066]], 7, { sz: 0.82 }); K.lathe(metal(0xb4b8bc, 0.3), [0, -0.036, 0], [[0.027, 0.066], [0.022, 0.072], [0, 0.07]], 7, { sz: 0.82 }); K.box(flat(0xeeeae0, 0.5), -0.012, -0.01, 0.0195, 0.012, 0.004, 0.021); }, { rz: Math.PI / 2 });
    },
    litter_paper: (K, B) => {
      blob(K, matte(0xe8e6de, 0.1), -0.03, 0.026, 0, 0.034, 0.026, 0.034, { seed: 4, jit: 0.35 });
      blob(K, matte(0xe8d88a, 0.1), 0.03, 0.02, 0.012, 0.028, 0.02, 0.026, { seed: 8, jit: 0.35 });
      K.sheet(flat(0xe8e6de, 0.9), [0.0, 0.002, -0.04], [0.06, 0.004, -0.03], [0.055, 0.012, 0.0], [0.005, 0.003, -0.005]);
    },
    petal_drift: (K, B) => {
      const cols = [0xf4b8c8, 0xf8d0da, 0xeea0b6, 0xc8a05a, 0xa8b46a];
      K.lathe(flat(0xe8c8cc, 0.95), [0, 0, 0], [[0.16, 0.001], [0, 0.004]], 9, { sx: 1.3, sz: 0.9 });
      for (let k = 0; k < 46; k++) { const a = k * 2.399, r = Math.sqrt((k + 0.5) / 46), x = Math.cos(a) * r * (B.w / 2 - 0.02), z = Math.sin(a) * r * (B.d / 2 - 0.02), s = 0.012 + (k % 3) * 0.004, t = k * 1.3; K.quad(flat(cols[k % 5], 0.9), [x - Math.cos(t) * s, 0.006 + (k % 4) * 0.003, z - Math.sin(t) * s], [x + Math.sin(t) * s * 0.6, 0.007 + (k % 4) * 0.003, z - Math.cos(t) * s * 0.6], [x + Math.cos(t) * s, 0.008 + (k % 4) * 0.003, z + Math.sin(t) * s], [x - Math.sin(t) * s * 0.6, 0.007 + (k % 4) * 0.003, z + Math.cos(t) * s * 0.6], [0, 1, 0]); }
    },
    litter_butts: (K) => {
      for (const [x, z, ry] of [[-0.025, 0.004, 0.3], [0.02, -0.008, -0.5], [0.028, 0.012, 1.2]]) K.at([x, 0.003, z], () => { K.box(flat(0xe8e6de, 0.9), -0.012, -0.003, -0.003, 0.006, 0.003, 0.003); K.box(flat(0xd89a4a, 0.9), 0.006, -0.003, -0.003, 0.016, 0.003, 0.003); }, { ry });
    },

    garbage_station_empty: (K, B) => station(K, B, false),

    // ------------------------------------------------------------- small fittings: the sign's hook, the breaker's lever, the 営業中 board
    hook_nail: (K, B) => { K.tube(metal(0xb4a05a, 0.3), [[0, B.y1 - 0.01, B.z0], [0, B.y1 - 0.012, B.z1 - 0.006], [0, B.y1 - 0.004, B.z1 - 0.003]], 0.004, 5); K.cyl(metal(0x8a8e92), 0, B.y1 - 0.01, B.z0, 0.008, 0.003, 6, { axis: 'z' }); },
    breaker_lever: (K, B) => {
      K.box(plastic(0x26262a, 0.15), -0.014, 0, -0.012, 0.014, 0.05, 0.012, { bevel: 0.003 }); K.box(plastic(0xc8302a, 0.2), B.x0, 0.05, B.z0, B.x1, B.y1, B.z1, { bevel: 0.006 });
      K.cyl(metal(0xc8a84a), 0, 0.018, 0.012, 0.006, 0.002, 6, { axis: 'z' });
    },
    open_sign_prop: (K, B) => {
      const w = 0xc89a5f;
      plank(K, w, B.x0, 0, -0.01, B.x1, 0.208, 0.008, { bevel: 0.004 });
      const V = K.patch('eigyo', 96, 40, (V) => { framed(V, 0xf2ead6, 0x6a4424); kana(K, V, '営業中', 48, 37, 0xd8282a, { size: 16, s: 2, align: 'center' }); }, { rough: 0.8 });
      K.face(V, '+z', B.x0 + 0.03, 0.022, B.x1 - 0.03, 0.186, 0.0092);
      const Vb = K.patch('junbi', 96, 40, (V) => { framed(V, 0xf2ead6, 0x6a4424); kana(K, V, '準備中', 48, 37, 0x2a52a8, { size: 16, s: 2, align: 'center' }); }, { rough: 0.8 });
      K.face(Vb, '-z', B.x0 + 0.03, 0.022, B.x1 - 0.03, 0.186, -0.0112);
      K.tube(flat(0x8a6a4a, 0.9), [[-0.16, 0.2, 0], [0, B.y1 - 0.004, 0], [0.16, 0.2, 0]], 0.003, 4);
    },
  },
};
function smallPrintBox(K, x, y, z) { for (let k = 0; k < 4; k++) K.box(flat(0x5a4a3a, 0.9), x + 0.01, y + 0.02 + k * 0.022, z + 0.0012, x + 0.07 - (k % 2) * 0.02, y + 0.026 + k * 0.022, z + 0.0018); }
