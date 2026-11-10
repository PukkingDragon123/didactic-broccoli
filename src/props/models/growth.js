// The growing business (ids from src/data/props/growth.js): stacked route machines in six colours, the flat's
// kitchen (two-ring stove, pan, rice cooker, three dinners), the bath (tiled ofuro, stool, wash bucket), a paint
// roller, a fluorescent tube.
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, plank } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot } from '../kit/prints.js';

const CAPS = [0xe84a3a, 0x3a7ad8, 0xf2c21c, 0x3a9a4a, 0xe86aa8, 0x8a5bd6];
/** Four route machines stacked two by two (0.925 x 2 x 0.525), faces to +z. Everything that reads is geometry: the mall draws these vertex-coloured. */
function stackOf(c) {
  return (K, B) => {
    const body = paint(c, 0.22), dk = flat(darken(c, 0.35), 0.6), w = B.w / 2, zf = B.z1 - 0.03, zb = B.z0;
    K.box(flat(0x26262a, 0.7), -w, 0, zb, w, 0.08, zf, { bevel: 0.008 });
    for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) {
      const x0 = i ? 0.004 : -w, x1 = i ? w : -0.004, y0 = 0.08 + r * 0.9, y1 = y0 + 0.894, cx = (x0 + x1) / 2;
      K.box(body, x0, y0, zb, x1, y1, zf, { bevel: 0.01 });
      // the window with its capsules, the display card above it, the coin plate and crank, the chute
      K.box(flat(0x2a2e34, 0.5), x0 + 0.04, y0 + 0.42, zf, x1 - 0.04, y0 + 0.74, zf + 0.002);
      for (let k = 0; k < 8; k++) K.box(plastic(CAPS[(k + r * 3 + i) % 6], 0.3), x0 + 0.06 + (k % 4) * 0.082, y0 + 0.44 + Math.floor(k / 4) * 0.085 + (k % 2) * 0.012, zf + 0.002, x0 + 0.125 + (k % 4) * 0.082, y0 + 0.515 + Math.floor(k / 4) * 0.085 + (k % 2) * 0.012, zf + 0.006, { bevel: 0.016, edge: null });
      K.glass(() => K.box(K.tint(0xd4e8ec, 60), x0 + 0.04, y0 + 0.42, zf + 0.006, x1 - 0.04, y0 + 0.74, zf + 0.012));
      K.box(flat(0xf2efe6, 0.6), x0 + 0.05, y0 + 0.76, zf, x1 - 0.05, y0 + 0.87, zf + 0.004); K.box(flat([0xe84a3a, 0x3a7ad8, 0xf2c21c, 0x3a9a4a][(r * 2 + i + (c & 3)) % 4], 0.6), x0 + 0.07, y0 + 0.78, zf + 0.004, x1 - 0.07, y0 + 0.85, zf + 0.0052);
      K.box(metal(0xb4b8bc, 0.3), cx - 0.1, y0 + 0.2, zf, cx + 0.1, y0 + 0.38, zf + 0.008, { bevel: 0.004 }); K.cyl(metal(0x8a8e92, 0.3), cx - 0.03, y0 + 0.29, zf + 0.008, 0.045, 0.02, 8, { axis: 'z' }); K.box(flat(0xe8e6de, 0.4), cx - 0.04, y0 + 0.28, zf + 0.028, cx - 0.02, y0 + 0.3, zf + 0.04);
      K.box(flat(0x26262a, 0.6), cx + 0.045, y0 + 0.3, zf + 0.008, cx + 0.075, y0 + 0.34, zf + 0.01);
      K.box(dk, x0 + 0.06, y0 + 0.04, zf, x1 - 0.06, y0 + 0.15, zf + 0.004); K.box(flat(0x1a1a1c, 0.8), x0 + 0.08, y0 + 0.055, zf + 0.004, x1 - 0.08, y0 + 0.135, zf + 0.0052);
    }
    K.box(paint(c === 0x26262a ? 0xe8b830 : lighten(c, 0.25), 0.2), -w, 1.88, zb, w, B.y1, zf + 0.02, { bevel: 0.012 }); K.box(flat(0xf2efe6, 0.6), -w + 0.08, 1.905, zf + 0.02, w - 0.08, B.y1 - 0.025, zf + 0.0215);
  };
}

export default {
  family: 'shop',
  models: {
    gr_stack_red: stackOf(0xc8302a), gr_stack_blue: stackOf(0x2f62b8), gr_stack_yellow: stackOf(0xe8b830), gr_stack_pink: stackOf(0xf08aa8), gr_stack_green: stackOf(0x3a9a52), gr_stack_black: stackOf(0x26262a),

    // ------------------------------------------------------------- the two-ring gas stove (0.57 x 0.13 x 0.41), knobs to +z
    gr_stove: (K, B) => {
      const w = B.w / 2, zf = B.z1 - 0.02;
      K.box(enamel(0xe2ded2), -w, 0.012, B.z0, w, 0.09, zf, { bevel: 0.008 }); K.box(flat(0x2a2a2e, 0.5), -w + 0.015, 0.09, B.z0 + 0.015, w - 0.015, 0.094, zf - 0.03);
      for (const x of [-0.14, 0.14]) { K.cyl(metal(0x4a4a4e, 0.3), x, 0.094, -0.02, 0.04, 0.012, 8); K.torus(metal(0x3a3a3e, 0.3), x, 0.106, -0.02, 0.028, 0.005, 8, 3); for (let k = 0; k < 4; k++) { const a = k * 1.5708 + 0.785; K.box(metal(0x26262a, 0.25), x + Math.cos(a) * 0.045 - 0.005, 0.094, -0.02 + Math.sin(a) * 0.045 - 0.005, x + Math.cos(a) * 0.1 + 0.005, B.y1, -0.02 + Math.sin(a) * 0.1 + 0.005); } K.cyl(plastic(0x26262a), x, 0.045, zf, 0.022, 0.018, 8, { axis: 'z' }); K.box(flat(0xe8e6de, 0.5), x - 0.003, 0.045, zf + 0.018, x + 0.003, 0.066, zf + 0.019); }
      K.box(flat(0xc8302a, 0.5), -0.03, 0.035, zf, 0.03, 0.055, zf + 0.0012);
      for (const [x, z] of [[-w + 0.03, B.z0 + 0.03], [w - 0.03, B.z0 + 0.03], [-w + 0.03, zf - 0.03], [w - 0.03, zf - 0.03]]) K.cyl(rubber(), x, 0, z, 0.012, 0.014, 5);
    },
    // ------------------------------------------------------------- a frying pan (0.368 x 0.04 x 0.216): handle to +x
    gr_pan: (K, B) => { const cx = B.x0 + 0.108; K.lathe(metal(0x2c2c30, 0.3), [cx, 0, 0], [[0, 0], [0.09, 0], [0.106, B.y1], [0.1, B.y1], [0.086, 0.006], [0, 0.006]], 12); K.tube(metal(0x2c2c30, 0.3), [[cx + 0.1, B.y1 - 0.008, 0], [cx + 0.14, B.y1 - 0.004, 0]], 0.007, 4); K.box(wood(0x5a3a26), cx + 0.13, B.y1 - 0.018, -0.012, B.x1, B.y1 - 0.002, 0.012, { bevel: 0.004 }); },
    // ------------------------------------------------------------- the rice cooker (0.248 x 0.2 x 0.256)
    gr_ricecooker: (K, B) => {
      const w = plastic(0xe6e2d8, 0.12);
      K.lathe(w, [0, 0, 0], [[0, 0], [0.1, 0], [0.12, 0.03], [0.12, 0.12], [0.11, 0.15], [0.06, 0.168], [0, 0.17]], 12);
      K.box(plastic(0x8a8e94, 0.2), -0.04, 0.168, -0.02, 0.04, B.y1, 0.02, { bevel: 0.006 }); K.box(flat(0x6a6e74, 0.6), -0.118, 0.118, -0.1, 0.118, 0.122, 0.1);
      K.box(plastic(0xd8d4c8, 0.2), -0.045, 0.03, 0.1, 0.045, 0.1, 0.128, { bevel: 0.008 }); K.glow(() => K.box(flat(0xf2913a), -0.03, 0.075, 0.128, -0.01, 0.09, 0.1292)); K.box(plastic(0x3a7ad8), 0.005, 0.045, 0.128, 0.035, 0.065, 0.132, { bevel: 0.004 });
      const fl = K.patch('hana', 40, 20, (V) => { V.fill(0xe6e2d8); for (const [i, c] of [[8, 0xe86aa8], [20, 0xf2c21c], [32, 0xe86aa8]]) { V.disc(i, 10, 4, c); V.disc(i, 10, 1.5, 0xf2efe6); V.px(i - 5, 5, 0x3a9a4a); V.px(i + 5, 5, 0x3a9a4a); } }, { rough: 0.6 });
      K.wrap(fl, 0, 0.045, 0.105, 0, 0.12, { n: 12, arc: 1.05, turn: 1.57 });
    },
    // ------------------------------------------------------------- dinners: curry rice, yakisoba, tamago kake gohan
    gr_dish_curry: (K, B) => { plate(K, 0.099, 0.018); blob(K, flat(0xf2efe6, 0.7), -0.03, 0.016, 0, 0.045, 0.012, 0.06, { seed: 3, jit: 0.1, flatY: -0.5 }); blob(K, flat(0x9a6a2a, 0.5), 0.03, 0.014, 0, 0.05, 0.009, 0.06, { seed: 5, jit: 0.1, flatY: -0.5 }); for (const [x, z, c] of [[0.02, 0.02, 0xe8842a], [0.045, -0.02, 0xd8c070], [0.03, -0.04, 0xe8842a]]) K.box(flat(c, 0.5), x - 0.008, 0.018, z - 0.008, x + 0.008, 0.026, z + 0.008, { bevel: 0.003, edge: null }); K.box(flat(0xc8302a, 0.5), -0.07, 0.014, 0.04, -0.045, 0.02, 0.06); void B; },
    gr_dish_yakisoba: (K, B) => { plate(K, 0.099, 0.018); blob(K, flat(0xb8843a, 0.6), 0, 0.02, 0, 0.068, 0.016, 0.068, { seed: 7, jit: 0.18, flatY: -0.5, fine: true }); for (let k = 0; k < 8; k++) { const a = k * 0.8; K.box(flat([0x4a9a4a, 0xe8842a, 0xc8302a, 0x8a5a3a][k % 4], 0.6), Math.cos(a) * 0.04 - 0.008, 0.03, Math.sin(a) * 0.04 - 0.004, Math.cos(a) * 0.04 + 0.008, 0.035, Math.sin(a) * 0.04 + 0.004); } K.box(flat(0x3a8a4a, 0.7), -0.012, 0.034, -0.012, 0.012, 0.0365, 0.012); void B; },
    gr_dish_tkg: (K, B) => { K.lathe(ceramic(0x3a4a8a), [0, 0, 0], [[0, 0], [0.03, 0], [0.034, 0.008], [0.074, B.y1 - 0.006], [0.07, B.y1 - 0.006], [0.03, 0.014], [0, 0.014]], 12); blob(K, flat(0xf2efe6, 0.7), 0, B.y1 - 0.014, 0, 0.058, 0.014, 0.058, { seed: 2, jit: 0.08, fine: true }); K.ball(flat(0xf2a82a, 0.3), 0.004, B.y1 - 0.003, 0.004, 0.018, 0.008, 0.018, 8, 3); },

    // ------------------------------------------------------------- the ofuro: a tiled tub with a wooden rim (1.06 x 0.6 x 0.78)
    gr_ofuro: (K, B) => {
      const w = B.w / 2, d = B.d / 2, H = 0.56;
      const tl = K.patch('tile', 32, 32, (V) => { V.fill(0xd8e8ee); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { V.box(i * 8 + 1, j * 8 + 1, i * 8 + 8, j * 8 + 8, (i + j) % 2 ? 0x8ac8e0 : 0x9ad4e8); V.hline(i * 8 + 1, i * 8 + 7, j * 8 + 7, 0xb4e0f0); } }, { shared: true, rough: 0.35 });
      K.use(flat(0xd8e8ee, 0.4), (G) => G.box(-w + 0.02, 0, -d + 0.02, w - 0.02, H, d - 0.02, { skip: ['py'] }));
      const side = (f, a0, a1, wv) => { const n = Math.round(Math.abs(a1 - a0) / 0.2); for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) K.face(tl, f, a0 + (a1 - a0) * (i / n), j * H / 3, a0 + (a1 - a0) * ((i + 1) / n), (j + 1) * H / 3, wv); };
      side('+z', -w + 0.02, w - 0.02, d - 0.019); side('-z', -w + 0.02, w - 0.02, -d + 0.019); side('+x', -d + 0.02, d - 0.02, w - 0.019); side('-x', -d + 0.02, d - 0.02, -w + 0.019);
      K.use(flat(0xb8d8e4, 0.35), (G) => G.box(-w + 0.08, 0.08, -d + 0.08, w - 0.08, H + 0.001, d - 0.08, { inward: true, skip: ['py'] }));
      K.quad(flat(0x9ad0e0, 0.15), [-w + 0.08, H - 0.07, d - 0.08], [w - 0.08, H - 0.07, d - 0.08], [w - 0.08, H - 0.07, -d + 0.08], [-w + 0.08, H - 0.07, -d + 0.08], [0, 1, 0]); // the water
      for (const [a, b, c, e] of [[-w, -d, w, -d + 0.09], [-w, d - 0.09, w, d], [-w, -d + 0.09, -w + 0.09, d - 0.09], [w - 0.09, -d + 0.09, w, d - 0.09]]) plank(K, 0xd8b080, a, H, b, c, B.y1, e, { bevel: 0.006 });
      K.cyl(chrome(0xb4babf), w - 0.1, 0.42, 0, 0.02, 0.04, 6, { axis: 'x' });
    },
    gr_bath_stool: (K, B) => { const pk = plastic(0xf2a8b8, 0.2), w = B.w / 2, d = B.d / 2; K.box(plastic(0xf6c8d0, 0.2), -w, 0.16, -d, w, B.y1, d, { bevel: 0.012 }); for (const s of [-1, 1]) K.box(pk, s * w - (s > 0 ? 0.02 : 0), 0, -d + 0.005, s * w + (s > 0 ? 0 : 0.02), 0.16, d - 0.005, { bevel: 0.006 }); K.box(flat(0xe08a9c, 0.6), -0.03, B.y1, -0.008, 0.03, B.y1 + 0.0006, 0.008); },
    gr_oke: (K, B) => {
      const y = 0xe8b830;
      K.ring(plastic(y, 0.2), 0, 0, 0, 0.1, 0.092, B.y1, 12, { r1: 0.108, ri1: 0.1, inside: flat(darken(y, 0.15), 0.7) }); K.lathe(plastic(y, 0.2), [0, 0, 0], [[0, 0], [0.1, 0]], 12); K.lathe(flat(darken(y, 0.15), 0.7), [0, 0.008, 0], [[0.092, 0], [0, 0]], 12);
      const pr = K.patch('yu', 40, 16, (V) => { V.fill(y); kana(K, V, 'ゆ', 12, 17, 0xc8302a, { size: 16 }); V.hline(2, 37, 1, 0xc8302a); }, { rough: 0.6 });
      K.wrap(pr, 0, 0.02, 0.085, 0, 0.102, { n: 12, r1: 0.107, arc: 1.05 });
    },
    // ------------------------------------------------------------- a paint roller (0.19 x 0.34 x 0.07): the handle at -x, standing
    gr_roller: (K, B) => { const hx = B.x0 + 0.02; K.cyl(plastic(0x2f62b8, 0.2), hx, 0, 0, 0.015, 0.15, 8, { bevel: 0.004 }); K.tube(metal(0xb4b8bc, 0.3), [[hx, 0.15, 0], [hx, 0.28, 0], [hx + 0.02, B.y1 - 0.03, 0], [B.x1 - 0.14, B.y1 - 0.03, 0]], 0.004, 4); K.cyl(fabric(0xeeeae0), hx + 0.02, B.y1 - 0.03, 0, 0.03, B.x1 - hx - 0.03, 10, { axis: 'x' }); K.cyl(flat(0xd8d4c8, 0.9), hx + 0.06, B.y1 - 0.03, 0, 0.0305, 0.03, 10, { axis: 'x', caps: false }); },
    // ------------------------------------------------------------- a fluorescent tube (1.22 long): lit when it's in the fitting
    gr_tube: (K, B) => { K.glow(() => K.cyl(flat(0xf4f8fa), B.x0 + 0.02, 0.015, 0, 0.014, B.w - 0.04, 8, { axis: 'x', caps: false })); for (const x of [B.x0, B.x1 - 0.02]) K.cyl(metal(0xb4b8bc, 0.3), x, 0.015, 0, 0.015, 0.02, 8, { axis: 'x' }); },
  },
};
function plate(K, r, h) { K.lathe(ceramic(0xeeeae0), [0, 0, 0], [[0, 0], [r * 0.5, 0], [r, h * 0.7], [r, h], [r * 0.9, h], [r * 0.5, h * 0.4], [0, h * 0.4]], 14); }
