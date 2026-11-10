// The garage's clutter (ids from src/data/props/garage.js): what a Shōwa lock-up collects. A kerosene stove with its
// guard and kettle, the red 灯油 poly tank and its pump, a beer crate, a boombox, the little fridge, a tin bucket with
// a zōkin over the rim, rice sacks, tyres, the maneki-neko and the daruma, tied manga magazines...
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, tones, leafy, leaf, blade, flower, pot, dirtBox, dirtRing, plank, can, bottle, carton, stack, tied, bucket, bottleCrate, discWheel } from '../kit/shapes.js';
import { kana, smallPrint, hazard, framed, meshTex, meshPanel, louvres, rustEdge, sticker, warnTri, mascot, barcode, clockFace } from '../kit/prints.js';
import { catHead, FUR } from '../kit/animals.js';
import { mamachari } from './street2.js';

const CARD = 0xc49a62;

/** A gacha capsule: two half shells, the top half coloured. */
export function capsule(K, x, y, z, r, c, o = {}) {
  K.at([x, y, z], () => {
    K.ball(plastic(c, 0.3), 0, 0, 0, r, r, r, 7, 2, { y0: 0, cap: false });
    K.ball(plastic(o.c2 ?? 0xe8e4d8, 0.2), 0, 0, 0, r, r, r, 7, 2, { y1: 0, cap: false });
    K.cyl(flat(darken(c, 0.2), 0.6), 0, -r * 0.05, 0, r * 1.02, r * 0.1, 7, { caps: false });
  }, { rx: o.rx ?? 0, rz: o.rz ?? 0 });
}

export default {
  family: 'garage',
  models: {
    // ------------------------------------------------------------- tin watering can (0.343 x 0.28 x 0.133): the spout to +x
    watering_can: (K, B) => {
      const g = paint(0x3a7a52, 0.25), x = B.x0 + 0.07;
      K.cyl(g, x, 0, 0, 0.064, 0.2, 10, { bevel: 0.006 });
      for (const y of [0.05, 0.15]) K.torus(g, x, y, 0, 0.065, 0.004, 10, 3);
      K.lathe(flat(0x26402e, 0.6), [x, 0.2, 0], [[0.055, 0.001], [0, 0.001]], 10, { flip: true });
      K.tube(g, [[x + 0.05, 0.05, 0], [x + 0.15, 0.15, 0], [B.x1 - 0.04, 0.215, 0]], 0.014, 6, { radii: [0.017, 0.012, 0.01] });
      K.lathe(metal(0xb89a5a, 0.3), [B.x1 - 0.045, 0.21, 0], [[0.01, 0], [0.03, 0.03], [0, 0.034]], 8, { axis: 'x' });
      K.tube(g, [[x - 0.05, 0.17, 0], [x - 0.064, 0.24, 0], [x, B.y1 - 0.006, 0], [x + 0.05, 0.25, 0], [x + 0.045, 0.2, 0]], 0.007, 4, { flat: [0.022, 0.006], up: [0, 0, 1] });
    },

    // ------------------------------------------------------------- a drink vending machine (0.98 x 1.84 x 0.76); the working ones are built by src/places/vending
    vending: (K, B) => {
      const red = 0xc8302c, w = 0.48, zf = B.z1 - 0.02, zb = B.z0;
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: -w, u1: w, v0: 0.04, v1: 1.82, ppm: 200, rough: 0.5 }, (V) => {
        const I = (x) => V.i(x), J = (y) => V.j(y), W = 0xeeeae0;
        V.fill(red); V.box(I(-0.44), J(0.86), I(0.3), J(1.74), 0x2a2e34);
        // three shelves of sample cans behind the window, each over its button
        for (let r = 0; r < 3; r++) {
          const y = 1.5 - r * 0.28; V.box(I(-0.43), J(y - 0.06), I(0.29), J(y + 0.2), 0xdfe6e8); V.box(I(-0.43), J(y - 0.06), I(0.29), J(y - 0.02), W);
          for (let k = 0; k < 6; k++) { const x = -0.4 + k * 0.118, c = [0xc8282a, 0x3a2a22, 0x2f8a5a, 0xe8c040, 0x2a52a8, 0xe8842a, 0x8a5bd6][(k + r * 2) % 7]; V.box(I(x), J(y), I(x + 0.066), J(y + 0.17), c); V.box(I(x), J(y + 0.07), I(x + 0.066), J(y + 0.11), W); V.box(I(x), J(y + 0.16), I(x + 0.066), J(y + 0.17), 0xb8bcc0); V.box(I(x + 0.012), J(y - 0.05), I(x + 0.054), J(y - 0.028), r === 0 && k < 3 ? 0xd8322a : 0x3a7ad8); }
        }
        V.frame(I(-0.44), J(0.86), I(0.3), J(1.74), 0x8a8e92);
        // the coin panel: slot, note reader, return lever, the price window
        V.box(I(0.33), J(0.9), I(0.45), J(1.7), 0xd8d4c8); V.frame(I(0.33), J(0.9), I(0.45), J(1.7), 0x8a8e92);
        V.box(I(0.37), J(1.52), I(0.41), J(1.6), 0x26221e); V.box(I(0.35), J(1.36), I(0.43), J(1.44), 0x2a3a2e); V.text5('110', I(0.39), J(1.43), 0x7ae87a, { align: 'center' });
        V.box(I(0.36), J(1.2), I(0.42), J(1.26), 0x3a3a3e); V.disc(I(0.39), J(1.06), 6, 0x8a8e92); V.box(I(0.345), J(0.93), I(0.435), J(0.99), 0x26221e);
        // the lower panel: blue waves, the brand, the pick-up flap
        V.box(0, 0, V.W, J(0.84), W);
        for (let i = 0; i < V.W; i++) { const a = Math.round(J(0.62) + Math.sin(i / 11) * 5), b = Math.round(J(0.5) + Math.sin(i / 9 + 2) * 5); for (let j = J(0.36); j < a; j++) V.px(i, j, j < b ? 0x2a6ac8 : 0x5aa4e8); }
        V.text5('NAMI DRINK', I(-0.1), J(0.79), red, { align: 'center', s: 2 }); kana(K, V, 'つめた〜い', I(0.3), J(0.8), 0x2a6ac8, { size: 16, align: 'center' });
        V.box(I(-0.36), J(0.1), I(0.2), J(0.32), 0x1e2024); V.frame(I(-0.36), J(0.1), I(0.2), J(0.32), 0x8a8e92); V.box(I(-0.34), J(0.12), I(0.18), J(0.28), 0x34383e); V.text5('PUSH', I(-0.08), J(0.24), 0x8a8e92, { align: 'center' });
        V.box(I(0.3), J(0.12), I(0.42), J(0.26), 0xf2c21c); smallPrint(V, I(0.31), J(0.24), 20, 4, 0x26221e);
        rustEdge(V, 0, V.W, 0, 8, 5);
      });
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : K.uv(paint(red, 0.25)))(p, n), (G) => G.box(-w, 0.04, zb, w, 1.82, zf, { bevel: 0.014 }));
      K.glow(() => K.quad(flat(0xf4f8f4), [-0.43, 1.7, zf + 0.002], [0.29, 1.7, zf + 0.002], [0.29, 1.735, zf + 0.002], [-0.43, 1.735, zf + 0.002], [0, 0, 1]));
      K.glass(() => K.box(K.tint(0xcfe4ea, 46), -0.44, 0.86, zf, 0.3, 1.74, zf + 0.012));
      K.box(flat(0x26262a, 0.8), -w + 0.01, 0, zb + 0.02, w - 0.01, 0.04, zf - 0.03);
      const sd = K.patch('side', 64, 96, (V) => { V.fill(red); V.box(8, 30, 56, 66, 0xeeeae0); V.text5('NAMI', 32, 60, red, { align: 'center', s: 2 }); V.text5('DRINK', 32, 42, 0x2a6ac8, { align: 'center' }); }, { rough: 0.5 });
      K.face(sd, '+x', zb + 0.12, 0.9, zf - 0.12, 1.6, w + 0.001); K.face(sd, '-x', zb + 0.12, 0.9, zf - 0.12, 1.6, -w - 0.001);
      dirtBox(K, red, -w, zb, w, zf, 0.04, 0.06, { sides: ['+x', '-x'] });
    },

    // ------------------------------------------------------------- a mint mamachari standing along x (1.78 x 0.96 x 0.44), nose to +x
    bicycle: (K) => K.at([0, 0, 0], () => mamachari(K, { frame: 0x86d0b0, case: 0x6ab094, bag: false }), { ry: Math.PI / 2, s: 0.9 }),

    // ------------------------------------------------------------- the kerosene stove, its wire guard, a kettle on top (0.43 x 0.56 x 0.42)
    heater: (K) => {
      const cream = enamel(0xe6dcc4), n = 12;
      K.cyl(cream, 0, 0, 0, 0.2, 0.13, n, { bevel: 0.012 }); // the tank base
      K.cyl(flat(0x3a3a3e, 0.7), 0, 0.13, 0, 0.17, 0.02, n);
      // the burner: a glowing gauze cylinder inside a ring of guard wires
      K.cyl(metal(0x6a6e72), 0, 0.15, 0, 0.07, 0.035, 10);
      K.glow(() => K.cyl(flat(0xf2913a), 0, 0.185, 0, 0.062, 0.16, 10, { caps: false }));
      K.glow(() => { for (let k = 0; k < 4; k++) K.cyl(flat(0xffc86a), 0, 0.2 + k * 0.036, 0, 0.064, 0.008, 10, { caps: false }); });
      for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.2832; K.rod(chrome(0xb4babf), [Math.cos(a) * 0.165, 0.15, Math.sin(a) * 0.165], [Math.cos(a) * 0.165, 0.37, Math.sin(a) * 0.165], 0.0035, 3, { caps: false }); }
      for (const y of [0.2, 0.28, 0.36]) K.torus(chrome(0xb4babf), 0, y, 0, 0.165, 0.004, n, 3);
      K.lathe(enamel(0x5a5e62), [0, 0.37, 0], [[0.175, 0], [0.18, 0.012], [0.12, 0.03], [0.1, 0.03]], n);
      K.lathe(flat(0x2a2a2e, 0.7), [0, 0.37, 0], [[0.1, 0.03], [0, 0.03]], n);
      // the front: the wick dial, the ignition lever, the fuel gauge window, a caution label
      K.cyl(plastic(0x26262a), 0.06, 0.06, 0.19, 0.026, 0.02, 8, { axis: 'z' }); K.box(flat(0xe8e4d8, 0.5), 0.057, 0.06, 0.209, 0.063, 0.084, 0.2105);
      K.box(plastic(0xc8302a), -0.1, 0.085, 0.185, -0.07, 0.1, 0.215, { bevel: 0.004 });
      const lb = K.patch('caution', 40, 20, (V) => { framed(V, 0xf2c21c, 0x26221e); kana(K, V, '火気注意', 20, 18, 0x26221e, { size: 8, align: 'center' }); smallPrint(V, 6, 6, 28, 2, 0x26221e); }, { rough: 0.5 });
      K.wrap(lb, 0, 0.03, 0.075, 0, 0.2, { n, arc: 6.2832 / n, turn: -6.2832 / n });
      K.box(flat(0x26262a, 0.4), -0.016, 0.04, 0.196, 0.016, 0.1, 0.1975); K.box(flat(0xd8a03a, 0.3), -0.012, 0.044, 0.1975, 0.012, 0.07, 0.198);
      K.tube(chrome(0xb4babf), [[-0.17, 0.3, 0], [-0.2, 0.42, 0], [0, 0.45, 0], [0.2, 0.42, 0], [0.17, 0.3, 0]], 0.005, 4); // the carrying bail
      // the kettle: dented aluminium, a black knob, the handle folded forward
      const al = metal(0xc4c8cc, 0.3);
      K.lathe(al, [0, 0.4, 0], [[0, 0], [0.075, 0], [0.09, 0.02], [0.085, 0.07], [0.055, 0.1], [0, 0.1]], 10);
      K.cyl(plastic(0x26262a), 0, 0.5, 0, 0.012, 0.016, 6); K.tube(al, [[0.08, 0.44, 0], [0.12, 0.48, 0], [0.135, 0.5, 0]], 0.012, 5, { r1: 0.008 });
      K.tube(plastic(0x26262a), K.arc([0, 0.49, 0], 0.07, 0.3, 2.84, 6, 'xy'), 0.006, 4);
    },

    // ------------------------------------------------------------- a crate of beer (0.45 x 0.28 x 0.35): 20 big bottles, the brewery's name on the side
    beercrate: (K, B) => {
      const y = 0xe8b830;
      const pr = K.patch('asanagi', 96, 24, (V) => { V.fill(y); kana(K, V, '朝凪ビール', 48, 21, 0xc8302a, { size: 16, align: 'center' }); V.hline(6, 89, 2, 0xc8302a); }, { rough: 0.68 });
      bottleCrate(K, y, B.x0, 0, B.z0, B.x1, 0.2, B.z1, { print: pr, cells: [5, 4] });
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
        const x = B.x0 + 0.05 + i * (B.w - 0.1) / 4, z = B.z0 + 0.05 + j * (B.d - 0.1) / 3;
        if ((i === 3 && j === 1) || (i === 0 && j === 3)) continue; // two already drunk
        K.lathe(flat(0x5a3418, 0.3), [x, 0.012, z], [[0.03, 0], [0.03, 0.15], [0.012, 0.21], [0.012, 0.25]], 6);
        K.cyl(metal(0xd8b040, 0.3), x, 0.262, z, 0.014, 0.008, 6);
      }
    },

    // ------------------------------------------------------------- the retro electric fan (0.35 x 0.88 x 0.31), blowing to +z
    fan: (K) => {
      const body = plastic(0xe6e0d0, 0.12), cy = 0.7, R = 0.165;
      K.lathe(body, [0, 0, 0], [[0, 0], [0.15, 0], [0.155, 0.02], [0.1, 0.05], [0.03, 0.06]], 10);
      for (const [x, c] of [[-0.05, 0x5ab4e8], [0, 0xe8e4d8], [0.05, 0xe84a3a]]) K.box(plastic(c), x - 0.016, 0.036, 0.085, x + 0.016, 0.05, 0.115, { bevel: 0.004 });
      K.cyl(chrome(0xb4babf), 0, 0.055, 0, 0.016, cy - 0.12, 8);
      K.cyl(body, 0, cy - 0.07, 0, 0.03, 0.07, 8, { bevel: 0.006 });
      K.lathe(body, [0, cy, -0.13], [[0, 0], [0.045, 0.01], [0.06, 0.06], [0.055, 0.14], [0, 0.15]], 8, { axis: 'z' }); // the motor
      // the blades: four pale blue paddles on a hub; the guard: two wire cages (cut-out) with a rim and a badge
      for (let k = 0; k < 4; k++) K.at([0, cy, 0.04], () => K.prism(plastic(0x9ad0e0, 0.15), [[0.02, -0.03], [0.13, -0.05], [0.15, 0.02], [0.1, 0.06], [0.02, 0.03]], { plane: 'xy', a: -0.004, b: 0.004 }), { rz: k * 1.5708 + 0.3, rx: 0.25, order: 'ZXY' });
      K.cyl(body, 0, cy, 0.03, 0.03, 0.03, 8, { axis: 'z' });
      const gd = K.patch('fanguard', 64, 64, (V) => {
        V.box(0, 0, 64, 64, 0xc8ccd0, 0);
        for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const dx = i - 31.5, dy = j - 31.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx); if (d < 32 && (d > 30 || (d > 9 && Math.abs(((a * 28 / 6.2832) % 1 + 1) % 1 - 0.5) > 0.5 - 0.11 * 32 / Math.max(10, d)) || Math.abs(d - 20) < 0.7)) V.px(i, j, d > 30 ? 0x9aa0a6 : 0xc8ccd0, 255); }
        V.disc(32, 32, 7, 0xe6e0d0); V.disc(32, 32, 4, 0x5ab4e8);
      }, { shared: true, rough: 0.4 });
      K.glass(() => { K.face(gd, '+z', -R, cy - R, R, cy + R, 0.09, { both: true }); K.face(gd, '+z', -R, cy - R, R, cy + R, -0.0, { both: true }); });
      K.torus(chrome(0xb4babf), 0, cy, 0.045, R, 0.006, 14, 3, { axis: 'z' });
      K.lathe(chrome(0xb4babf), [0, cy, 0.0], [[R, 0], [R, 0.09]], 14, { axis: 'z' });
    },

    // ------------------------------------------------------------- the radio-cassette boombox (0.488 x 0.28 x 0.152)
    radio: (K, B) => {
      const w = B.w / 2, zf = B.z1 - 0.008, h = 0.225, c = 0xb4b8bc;
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: -w, u1: w, v0: 0, v1: h, ppm: 420, rough: 0.5 }, (V) => {
        const I = (x) => V.i(x), J = (y) => V.j(y), dk = 0x26262a;
        V.fill(c); V.box(0, 0, V.W, J(0.012), darken(c, 0.2));
        for (const s of [-1, 1]) { const cx = I(s * 0.165), cy = J(0.095); V.disc(cx, cy, 30, dk); V.ring(cx, cy, 28, 30.5, 0x8a8e92); for (let r = 6; r < 27; r += 4) V.ring(cx, cy, r, r + 1.2, 0x4a4c52); V.disc(cx, cy, 6, 0x6a6e74); V.disc(cx, cy, 2.5, 0xb4b8bc); V.disc(I(s * 0.165), J(0.19), 8, dk); V.ring(I(s * 0.165), J(0.19), 7, 8.5, 0x8a8e92); }
        // the tuner scale, the cassette door, the keys
        V.box(I(-0.085), J(0.165), I(0.085), J(0.205), 0xeee6c8); V.frame(I(-0.085), J(0.165), I(0.085), J(0.205), dk); for (let k = 0; k < 16; k++) V.vline(I(-0.078) + k * 4, J(0.172), J(0.172) + (k % 4 ? 2 : 5), 0x4a4a4a); V.vline(I(0.02), J(0.168), J(0.2), 0xd8322a); V.text5('FM AM', I(-0.04), J(0.2), 0x4a4a4a);
        V.box(I(-0.075), J(0.065), I(0.075), J(0.15), dk); V.frame(I(-0.075), J(0.065), I(0.075), J(0.15), 0x8a8e92); V.box(I(-0.06), J(0.085), I(0.06), J(0.135), 0x3a4048); V.box(I(-0.05), J(0.095), I(0.05), J(0.125), 0xe8e0c8); V.disc(I(-0.03), J(0.11), 4, dk); V.disc(I(0.03), J(0.11), 4, dk); V.box(I(-0.02), J(0.104), I(0.02), J(0.116), 0x6a4a3a);
        for (let k = 0; k < 6; k++) { V.box(I(-0.072) + k * 10, J(0.022), I(-0.072) + k * 10 + 8, J(0.05), k === 0 ? 0xd8322a : 0xd8dce0); V.hline(I(-0.072) + k * 10, I(-0.072) + k * 10 + 7, J(0.05) - 1, 0xffffff); }
        V.text5('SONORA', I(0), J(0.062) - 1, 0x4a4a4a, { align: 'center' });
        for (const [x, cc] of [[-0.1, 0xe84a3a], [-0.092, 0xf2c21c], [-0.084, 0x3a9a4a]]) V.box(I(x), J(0.212), I(x) + 2, J(0.212) + 3, cc);
      });
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : K.uv(plastic(c, 0.2)))(p, n), (G) => G.box(-w, 0, B.z0, w, h, zf, { bevel: 0.012 }));
      K.box(plastic(0x26262a), -w + 0.004, 0.01, B.z0 + 0.004, w - 0.004, h - 0.01, B.z0 + 0.02);
      for (const x of [-0.12, -0.06, 0.06, 0.12]) K.cyl(chrome(), x, h, 0.01, 0.014, 0.012, 8);
      K.tube(plastic(0x26262a), [[-0.19, h - 0.01, -0.01], [-0.19, B.y1 - 0.012, -0.02], [0.19, B.y1 - 0.012, -0.02], [0.19, h - 0.01, -0.01]], 0.011, 5);
      K.rod(chrome(), [0.2, h, -0.05], [0.05, h + 0.012, -0.055], 0.004, 4);
    },

    // ------------------------------------------------------------- the little two-door fridge (0.49 x 0.85 x 0.51), its doors to +z
    fridge: (K, B) => {
      const c = 0xe2ded2, w = B.w / 2, zf = B.z1 - 0.03;
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: -w, u1: w, v0: 0.03, v1: 0.85, ppm: 300, rough: 0.5 }, (V) => {
        const I = (x) => V.i(x), J = (y) => V.j(y), dk = darken(c, 0.3), lt = lighten(c, 0.3);
        V.fill(c); V.box(0, J(0.595), V.W, J(0.605), dk); V.hline(0, V.W, J(0.595) - 1, lt);
        V.text5('YUKIGUNI', I(0.1), J(0.83), 0x8a9aa8, { align: 'center' });
        // what's stuck to it: a shopping list, a pizza flyer, fruit magnets, a calendar page from the tofu shop
        V.box(I(-0.19), J(0.34), I(-0.07), J(0.52), 0xf2efe6); smallPrint(V, I(-0.18), J(0.5), 28, 9, 0x5a6a8a, { seed: 3 }); V.disc(I(-0.13), J(0.52), 3, 0xd8322a);
        V.box(I(0.02), J(0.2), I(0.16), J(0.4), 0xf2c21c); V.box(I(0.03), J(0.3), I(0.15), J(0.39), 0xd8322a); V.disc(I(0.09), J(0.26), 9, 0xe8a84a); smallPrint(V, I(0.03), J(0.225), 32, 2, 0x26221e); V.disc(I(0.09), J(0.4), 3, 0x3a7ad8);
        V.box(I(-0.18), J(0.66), I(-0.05), J(0.8), 0xf2efe6); V.box(I(-0.18), J(0.77), I(-0.05), J(0.8), 0x2f7a4a); kana(K, V, '豆腐', I(-0.115), J(0.805), 0xf2efe6, { size: 8, align: 'center' }); V.text5('4', I(-0.115), J(0.75), 0xd8322a, { align: 'center', s: 2 }); smallPrint(V, I(-0.17), J(0.685), 30, 2, 0x8a8a8a);
        for (const [x, y, cc] of [[0.12, 0.7, 0xe84a3a], [0.16, 0.74, 0xf2c21c], [0.08, 0.76, 0x3a9a4a]]) { V.disc(I(x), J(y), 4, cc); V.px(I(x) - 1, J(y) + 1, 0xffffff); }
        rustEdge(V, 0, V.W, 0, 7, 4, 0x9a6a3a);
      });
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : K.uv(paint(c, 0.12)))(p, n), (G) => G.box(-w, 0.03, B.z0, w, 0.85, zf - 0.03, { bevel: 0.012 }));
      // the doors hang on the right: each is a part with its handle
      const fuv = (p, n) => (n[2] > 0.9 ? F.map3 : K.uv(paint(c, 0.12)))(p, n);
      K.part('door', [w - 0.01, 0.3, zf - 0.028], 'y', () => { K.use(fuv, (G) => G.box(-w, 0.03, zf - 0.028, w, 0.597, zf, { bevel: 0.01 })); K.box(chrome(0xb4babf), -w + 0.03, 0.42, zf, -w + 0.05, 0.57, zf + 0.026, { bevel: 0.006 }); });
      K.part('door_freezer', [w - 0.01, 0.72, zf - 0.028], 'y', () => { K.use(fuv, (G) => G.box(-w, 0.603, zf - 0.028, w, 0.85, zf, { bevel: 0.01 })); K.box(chrome(0xb4babf), -w + 0.03, 0.63, zf, -w + 0.05, 0.76, zf + 0.026, { bevel: 0.006 }); });
      for (const [x, z] of [[-w + 0.05, B.z0 + 0.05], [w - 0.05, B.z0 + 0.05], [-w + 0.05, zf - 0.07], [w - 0.05, zf - 0.07]]) K.cyl(plastic(0x3a3a3e), x, 0, z, 0.02, 0.032, 6);
      K.box(flat(0x3a3a3e, 0.8), -w + 0.03, 0.12, B.z0 - 0.0, w - 0.03, 0.7, B.z0 + 0.006); // the condenser grid on the back
    },

    // ------------------------------------------------------------- a red steel toolbox (0.456 x 0.224 x 0.208)
    toolbox: (K, B) => {
      const red = paint(0xc42e28, 0.3), w = B.w / 2, d = B.d / 2;
      K.box(red, -w, 0, -d, w, 0.13, d, { bevel: 0.008 });
      K.part('lid', [0, 0.13, -d], 'x', () => { K.prism(red, [[-d, 0.13], [d, 0.13], [d, 0.17], [d * 0.55, 0.2], [-d * 0.55, 0.2], [-d, 0.17]], { plane: 'zy', a: -w, b: w }); K.tube(metal(0x3a3a3e, 0.2), [[-0.09, 0.2, 0], [-0.09, B.y1 - 0.008, 0], [0.09, B.y1 - 0.008, 0], [0.09, 0.2, 0]], 0.008, 5); });
      K.box(flat(0x8a1e1a, 0.6), -w - 0.001, 0.126, -d - 0.001, w + 0.001, 0.134, d + 0.001); // the lid's seam
      for (const x of [-0.14, 0.14]) { K.box(chrome(0xb4babf), x - 0.02, 0.09, d, x + 0.02, 0.16, d + 0.008, { bevel: 0.003 }); K.box(metal(0x7e8486), x - 0.012, 0.1, d + 0.008, x + 0.012, 0.125, d + 0.012); }
      const lb = K.patch('label', 56, 20, (V) => { framed(V, 0xeeeae0, 0x26221e); V.text5('KOGU', 4, 16, 0x26221e); kana(K, V, '工具', 40, 18, 0xc42e28, { size: 16, align: 'center' }); }, { rough: 0.5 });
      K.face(lb, '+z', -0.07, 0.035, 0.07, 0.085, d + 0.001);
      dirtBox(K, 0xc42e28, -w, -d, w, d, 0, 0.02);
    },

    // ------------------------------------------------------------- traffic cone (0.29 x 0.69 x 0.29)
    cone: (K) => {
      const or = plastic(0xe8642a, 0.2);
      K.box(rubber(0x26262a), -0.145, 0, -0.145, 0.145, 0.03, 0.145, { bevel: 0.01 });
      K.lathe(or, [0, 0.03, 0], [[0.11, 0], [0.086, 0.2]], 10); K.lathe(flat(0xe8e6de, 0.4), [0, 0.03, 0], [[0.086, 0.2], [0.066, 0.36]], 10);
      K.lathe(or, [0, 0.03, 0], [[0.066, 0.36], [0.03, 0.64], [0.022, 0.66], [0, 0.66]], 10);
      dirtRing(K, 0xe8642a, 0, 0, 0.11, 0.03, 0.05, 10, { r1: 0.104 });
    },

    // ------------------------------------------------------------- the maneki-neko on its cushion (0.155 x 0.19 x 0.125)
    manekineko: (K) => luckyCat(K, 1),

    // ------------------------------------------------------------- the daruma, one eye still to fill in (0.155 x 0.18 x 0.145)
    daruma: (K) => daruma(K, 1),

    // ------------------------------------------------------------- aluminium stepladder (0.528 x 1.488 x 0.592)
    ladder: (K, B) => {
      const al = metal(0xb8bec4, 0.3), blue = plastic(0x2f5fb8, 0.2), H = 1.44, zf = B.z1 - 0.03, zb = B.z0 + 0.03;
      K.sym((s) => {
        K.tube(al, [[s * 0.24, 0.02, zf], [s * 0.17, H, 0.04]], 0.02, 4, { flat: [0.022, 0.06] });
        K.tube(al, [[s * 0.24, 0.02, zb], [s * 0.17, H, -0.04]], 0.016, 4, { flat: [0.02, 0.04] });
        for (const z of [zf, zb]) K.box(blue, s * 0.24 - 0.022, 0, z - 0.035, s * 0.24 + 0.022, 0.035, z + 0.035, { bevel: 0.008 });
        K.tube(metal(0x8a9094), [[s * 0.215, 0.62, zf - 0.11], [s * 0.2, 0.7, 0], [s * 0.215, 0.62, zb + 0.11]], 0.005, 4, { flat: [0.004, 0.02] });
      });
      for (let k = 1; k <= 4; k++) { const t = k / 5, y = H * t, hw = 0.24 - 0.07 * t, z = zf + (0.04 - zf) * t; K.box(al, -hw, y - 0.012, z - 0.04, hw, y + 0.012, z + 0.04, { bevel: 0.004 }); for (let i = 0; i < 4; i++) K.box(flat(0x8a9094, 0.6), -hw + 0.02, y + 0.012, z - 0.03 + i * 0.018, hw - 0.02, y + 0.0135, z - 0.024 + i * 0.018); }
      for (const t of [0.3, 0.7]) K.box(al, -(0.24 - 0.07 * t), H * t - 0.012, zb + (-0.04 - zb) * t - 0.008, 0.24 - 0.07 * t, H * t + 0.012, zb + (-0.04 - zb) * t + 0.008);
      K.box(blue, -0.2, H, -0.1, 0.2, B.y1, 0.1, { bevel: 0.012 });
      const st = K.patch('warn', 24, 32, (V) => { V.fill(0xf2c21c); warnTri(V, 12, 18, 11, 0xf2c21c); smallPrint(V, 3, 13, 18, 4, 0x26221e); V.frame(0, 0, 24, 32, 0x26221e); }, { rough: 0.5 });
      K.at([0.205, 0.72, zf * 0.5 + 0.02 + 0.031], () => K.face(st, '+z', -0.02, -0.03, 0.02, 0.03, 0));
    },

    // ------------------------------------------------------------- a yellow work helmet (0.264 x 0.152 x 0.32): 安全第一
    helmet: (K, B) => {
      const y = plastic(0xe8b830, 0.25);
      K.ball(y, 0, 0.03, -0.01, 0.118, 0.118, 0.14, 10, 4, { y0: 0 });
      K.lathe(y, [0, 0.03, -0.01], [[0.118, 0], [0.13, -0.012], [0.132, -0.004], [0.118, 0.006]], 10, { sz: 1.19 });
      K.prism(y, [[-0.1, 0.1], [0.1, 0.1], [0.09, B.z1 - 0.01], [-0.09, B.z1 - 0.01]], { plane: 'xz', a: 0.018, b: 0.03 }); // the peak
      K.box(y, -0.012, 0.03, -0.14, 0.012, 0.15, 0.12, { bevel: 0.006 }); // the ridge
      const cr = K.patch('anzen', 28, 28, (V) => { V.fill(0xf2efe6); V.box(11, 3, 17, 25, 0x2f8a4a); V.box(3, 11, 25, 17, 0x2f8a4a); V.frame(0, 0, 28, 28, 0x2f8a4a); }, { rough: 0.5 });
      K.at([0, 0.085, 0.118], () => K.face(cr, '+z', -0.028, -0.028, 0.028, 0.028, 0), { rx: -0.42 });
      K.box(fabric(0x3a3a3e), -0.1, 0.0, -0.1, 0.1, 0.03, 0.09, { bevel: 0.012, edge: null }); // the liner and chin strap, tucked in
    },

    // ------------------------------------------------------------- a cassette gas stove with a red kettle (0.344 x 0.248 x 0.312)
    stove_kettle: (K, B) => {
      const w = B.w / 2, d = B.d / 2, wt = paint(0xdcd8cc, 0.12);
      K.box(wt, -w, 0.008, -d, w, 0.075, d, { bevel: 0.008 });
      K.box(flat(0x2a2a2e, 0.6), -w + 0.02, 0.075, -d + 0.03, w - 0.11, 0.08, d - 0.03); // the drip pan
      K.box(metal(0xa8aeb4), w - 0.1, 0.075, -d + 0.02, w - 0.012, 0.085, d - 0.02, { bevel: 0.004 }); // the cassette cover, slotted
      for (let k = 0; k < 6; k++) K.box(flat(0x3a3a3e, 0.6), w - 0.09, 0.085, -d + 0.05 + k * 0.035, w - 0.022, 0.0855, -d + 0.062 + k * 0.035);
      K.cyl(metal(0x4a4a4e), -0.045, 0.08, 0, 0.035, 0.015, 8); for (let k = 0; k < 4; k++) { const a = k * 1.5708 + 0.785; K.box(metal(0x3a3a3e, 0.2), -0.045 + Math.cos(a) * 0.04 - 0.004, 0.08, Math.sin(a) * 0.04 - 0.004, -0.045 + Math.cos(a) * 0.085 + 0.004, 0.098, Math.sin(a) * 0.085 + 0.004); }
      K.cyl(plastic(0x26262a), w - 0.055, 0.03, d, 0.02, 0.014, 8, { axis: 'z' }); K.box(flat(0xe8842a, 0.5), -w + 0.03, 0.03, d, -w + 0.11, 0.05, d + 0.0012);
      for (const [x, z] of [[-w + 0.03, -d + 0.03], [w - 0.03, -d + 0.03], [-w + 0.03, d - 0.03], [w - 0.03, d - 0.03]]) K.cyl(rubber(), x, 0, z, 0.012, 0.01, 5);
      // the enamel kettle with white flowers
      const red = enamel(0xc8302a), ky = 0.098, kx = -0.045;
      K.lathe(red, [kx, ky, 0], [[0, 0], [0.07, 0], [0.085, 0.02], [0.08, 0.075], [0.05, 0.1], [0, 0.1]], 10);
      K.cyl(plastic(0x26262a), kx, ky + 0.1, 0, 0.012, 0.016, 6); K.tube(red, [[kx + 0.075, ky + 0.04, 0], [kx + 0.115, ky + 0.085, 0], [kx + 0.13, ky + 0.105, 0]], 0.012, 5, { r1: 0.008 });
      K.tube(plastic(0x26262a), K.arc([kx, ky + 0.085, 0], 0.062, 0.2, 2.94, 6, 'xy'), 0.006, 4);
      for (const a of [0.2, 1.3, -0.9]) flower(K, flat(0xf2efe6, 0.5), [kx + Math.sin(a) * 0.083, ky + 0.045, Math.cos(a) * 0.083], 0.014, { dir: [Math.sin(a), 0.1, Math.cos(a)], eye: flat(0xf2c21c) });
    },

    // ------------------------------------------------------------- a case of cup noodles, a few cups on top (0.343 x 0.336 x 0.245)
    noodle_box: (K, B) => {
      const w = B.w / 2, d = B.d / 2;
      const lb = K.patch('ramen', 96, 44, (V) => { V.fill(0xd8322a); V.frame(2, 2, 94, 42, 0xf2c21c); kana(K, V, 'ラーメン', 48, 40, 0xf2efe6, { size: 16, s: 1, align: 'center' }); V.text5('MENKICHI 12', 48, 18, 0xf2c21c, { align: 'center' }); smallPrint(V, 14, 8, 68, 1, 0xf2efe6); }, { rough: 0.9 });
      carton(K, -w, 0, -d, w, 0.235, d, { label: lb, labelSize: [0.24, 0.11], labelAt: 0.52 });
      const cup = (x, z, o = {}, y = 0.237) => K.at([x, y, z], () => { K.lathe(plastic(0xe8e4d8, 0.1), [0, 0, 0], [[0, 0], [0.028, 0], [0.04, 0.085]], 8); K.lathe(flat(0xd8322a, 0.6), [0, 0, 0], [[0.0325, 0.03], [0.036, 0.03], [0.0385, 0.062], [0.036, 0.062]], 8); K.cyl(flat(0xd8d4c8, 0.4), 0, 0.085, 0, 0.042, 0.005, 8); }, o);
      cup(-0.09, 0.02); cup(-0.02, -0.05); K.at([-0.09, 0.325, 0.02], () => K.lathe(plastic(0xe8e4d8, 0.1), [0, 0, 0], [[0, 0.085], [0.028, 0.085], [0.04, 0]], 8, { flip: true }));
      cup(0.1, 0.07, { rz: -1.45, ry: 0.4 }, 0.277);
      K.at([0.02, 0.238, 0.07], () => { K.box(flat(0xe8dcc0, 0.9), -0.05, 0, -0.004, 0.05, 0.004, 0.0); K.box(flat(0xe8dcc0, 0.9), -0.05, 0, 0.004, 0.05, 0.004, 0.008); }, { ry: 0.5 }); // waribashi
    },

    // ------------------------------------------------------------- the red 灯油 poly tank and its siphon pump (0.312 x 0.48 x 0.248)
    polytank: (K, B) => {
      const red = plastic(0xc8302a, 0.22), x0 = B.x0, x1 = B.x1 - 0.03, z0 = B.z0, z1 = B.z1 - 0.05;
      K.box(red, x0, 0, z0, x1, 0.39, z1, { bevel: 0.022 });
      for (const y of [0.1, 0.2, 0.3]) K.box(flat(0xa82622, 0.7), x0 - 0.0008, y - 0.004, z0 + 0.03, x1 + 0.0008, y + 0.004, z1 - 0.03); // moulded ribs
      K.tube(red, [[x0 + 0.05, 0.38, (z0 + z1) / 2], [x0 + 0.06, 0.45, (z0 + z1) / 2], [x1 - 0.1, 0.45, (z0 + z1) / 2], [x1 - 0.09, 0.38, (z0 + z1) / 2]], 0.016, 5); // handle
      K.cyl(plastic(0xb82a24), x1 - 0.045, 0.385, (z0 + z1) / 2, 0.028, 0.03, 8); K.cyl(plastic(0xe8e4d8), x0 + 0.03, 0.385, (z0 + z1) / 2, 0.014, 0.014, 6);
      const lb = K.patch('toyu', 72, 96, (V) => { V.fill(0xf2efe6); V.frame(0, 0, 72, 96, 0xc8302a); V.frame(2, 2, 70, 94, 0xc8302a); kana(K, V, '灯油', 22, 92, 0xc8302a, { size: 16, s: 2, vert: true }); V.text5('18L', 36, 24, 0x26221e, { align: 'center', s: 2 }); warnTri(V, 12, 44, 11); kana(K, V, '火気厳禁', 62, 60, 0x26221e, { size: 8, vert: true, align: 'right' }); }, { rough: 0.7 });
      K.face(lb, '+z', x0 + 0.05, 0.07, x0 + 0.05 + 0.18, 0.31, z1 + 0.0012);
      // the blue squeeze pump hooked on the side, its hose coiled down
      const bl = plastic(0x3a7ad8, 0.2), px = B.x1 - 0.022, pz = z1 + 0.022;
      K.lathe(bl, [px, 0.36, pz], [[0, 0], [0.014, 0.004], [0.024, 0.04], [0.014, 0.085], [0.01, 0.1], [0, 0.1]], 6);
      K.cyl(plastic(0xc8302a), px, 0.46, pz, 0.01, 0.014, 6);
      K.tube(flat(0xe8e4d8, 0.5), [[px, 0.36, pz], [px, 0.03, pz]], 0.006, 5);
      K.tube(flat(0x9acbe8, 0.5), [[px, 0.38, pz], [px - 0.03, 0.34, pz + 0.01], [px - 0.04, 0.15, pz + 0.015], [px - 0.02, 0.02, pz + 0.01]], 0.007, 5);
      dirtBox(K, 0xc8302a, x0, z0, x1, z1, 0, 0.03);
    },
  },
};

/** The lucky cat: s = scale (the shop's big one is the same cat at 2.7 x). Left paw up (it calls people in). */
export function luckyCat(K, s = 1, o = {}) {
  K.at([0, 0, 0], () => {
    const W = ceramic(o.c ?? 0xeeeae0), red = flat(0xc8302a, 0.5), gold = metal(0xd8a83a, 0.3);
    // the cushion: red with a gold border
    K.box(red, -0.075, 0, -0.06, 0.075, 0.018, 0.06, { bevel: 0.007, edge: null }); K.box(gold, -0.077, 0.005, -0.062, 0.077, 0.011, 0.062);
    // body, haunches, the head
    K.ball(W, 0, 0.066, -0.005, 0.048, 0.052, 0.044, 8, 4);
    K.sym((sx) => { K.ball(W, sx * 0.034, 0.036, 0.022, 0.022, 0.022, 0.03, 6, 3); });
    K.ball(W, 0, 0.134, 0.0, 0.046, 0.04, 0.04, 8, 4);
    K.sym((sx) => { K.prism(W, [[sx * 0.016, 0.16], [sx * 0.042, 0.156], [sx * 0.036, 0.186]], { plane: 'xy', a: -0.012, b: 0.008 }); K.tri(flat(0xe88a8a, 0.5), [sx * 0.022, 0.162, 0.0085], [sx * 0.038, 0.16, 0.0085], [sx * 0.034, 0.178, 0.0085], [0, 0, 1]); });
    // the collar and its bell, the bib
    K.cyl(red, 0, 0.098, 0, 0.036, 0.01, 8, { caps: false }); K.ball(gold, 0, 0.094, 0.036, 0.009, 0.009, 0.009, 6, 3);
    // the beckoning paw (left) up by the ear, the other holding the koban
    K.tube(W, [[-0.04, 0.085, 0.01], [-0.052, 0.13, 0.02], [-0.05, 0.168, 0.03]], 0.014, 6, { radii: [0.014, 0.013, 0.015] });
    K.tube(W, [[0.04, 0.085, 0.01], [0.036, 0.065, 0.034]], 0.013, 6);
    K.at([0.012, 0.055, 0.047], () => { K.lathe(gold, [0, 0, 0], [[0, 0], [0.024, 0], [0.024, 0.006], [0, 0.006]], 8, { axis: 'z', sz: 1.5 }); }, { rz: 0.15 });
    const kb = K.patch('koban', 16, 24, (V) => { V.fill(0xd8a83a); kana(K, V, '福', 0, 20, 0x8a5a1a, { size: 16 }); }, { rough: 0.3, shared: true });
    K.at([0.012, 0.055, 0.0535], () => K.face(kb, '+z', -0.012, -0.02, 0.012, 0.02, 0), { rz: 0.15 });
    // the face: closed happy eyes, a red nose, whiskers, the ears' red; spots on the back
    const fc = K.patch('neko', 32, 20, (V) => { V.fill(0xeeeae0); const k = 0x26221e; for (const i of [6, 20]) { V.hline(i, i + 5, 13, k); V.px(i, 12, k); V.px(i + 5, 12, k); V.px(i + 1, 14, k); V.px(i + 4, 14, k); } V.box(15, 9, 17, 11, 0xd8322a); V.hline(13, 18, 7, k); V.px(13, 8, k); V.px(18, 8, k); V.px(15, 8, k); V.px(16, 8, k); for (const j of [8, 10]) { V.hline(1, 5, j, k); V.hline(26, 30, j, k); } V.disc(4, 5, 2, 0xf0a8a8); V.disc(27, 5, 2, 0xf0a8a8); }, { rough: 0.4, shared: true });
    K.face(fc, '+z', -0.03, 0.118, 0.03, 0.155, 0.0398);
    K.ball(flat(0x26221e, 0.4), 0.02, 0.085, -0.04, 0.016, 0.014, 0.008, 6, 3); K.ball(flat(0xe08a3a, 0.4), -0.022, 0.06, -0.042, 0.014, 0.012, 0.008, 6, 3);
  }, { s });
}
/** The daruma: a red tumbler doll, gold brows and belly mark, one pupil painted in. */
export function daruma(K, s = 1, o = {}) {
  K.at([0, 0, 0], () => {
    const red = paint(o.c ?? 0xc8302a, 0.2), n = 10;
    K.lathe(red, [0, 0, 0], [[0, 0], [0.045, 0], [0.068, 0.03], [0.076, 0.075], [0.07, 0.125], [0.05, 0.162], [0.024, 0.178], [0, 0.18]], n);
    const fc = K.patch('daruma', 72, 80, (V) => {
      const R = o.c ?? 0xc8302a, W = 0xeee6d4, k = 0x26221e, g = 0xd8a83a;
      V.fill(R);
      V.disc(36, 52, 25, W); V.box(11, 52, 61, 62, W); V.disc(22, 60, 12, W); V.disc(50, 60, 12, W);
      V.disc(23, 56, 8, 0xffffff); V.disc(49, 56, 8, 0xffffff); V.ring(23, 56, 7, 8.5, k); V.ring(49, 56, 7, 8.5, k); V.disc(24, 55, 4, k); // one pupil in: a wish made
      for (let i = 0; i < 12; i++) { V.px(12 + i, 68 + Math.round(i / 3), k); V.px(13 + i, 68 + Math.round(i / 3), k); V.px(59 - i, 68 + Math.round(i / 3), k); V.px(58 - i, 68 + Math.round(i / 3), k); }
      V.box(33, 42, 39, 47, 0xe8a090); V.hline(28, 44, 37, k); V.px(27, 38, k); V.px(45, 38, k); for (const i of [20, 24, 46, 50]) V.vline(i, 34, 40, k);
      kana(K, V, '福', 28, 30, g, { size: 16 }); V.hline(14, 24, 12, g); V.hline(48, 58, 12, g); V.hline(10, 22, 20, g); V.hline(50, 62, 20, g);
    }, { rough: 0.5, shared: !o.c });
    K.wrapProfile(fc, 0, 0, [[0.068, 0.03], [0.076, 0.075], [0.07, 0.125], [0.05, 0.162]], { n, arc: (6.2832 / n) * 3, lift: 0.0012 });
  }, { s });
}
