// The garage's fittings and shelf bits (ids from src/data/props/garage2.js): the capsule return box, the coin
// changer, the utility sink and the instant water heater over it, paint tins, a cord reel, jars of screws, a straw
// hat and a coil of rope on their nails, a wind chime, a tin robot, sandals, a fuel can, a jar of capsules...
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, leafy, blade, flower, pot, plank, jar, stack, tied, bucket, dirtBox, TERRA } from '../kit/shapes.js';
import { kana, smallPrint, framed, rustEdge, warnTri, mascot, louvres, recycle, hazard } from '../kit/prints.js';
import { capsule } from './garage.js';

const CARD = 0xc49a62;

export default {
  family: 'garage',
  models: {
    // ------------------------------------------------------------- the capsule return box (0.32 x 0.6 x 0.28)
    capsule_return: (K, B) => {
      const w = B.w / 2 - 0.005, d = B.d / 2 - 0.005, wt = paint(0xe6e2d6, 0.12);
      K.box(wt, -w, 0, -d, w, 0.27, d, { bevel: 0.008 });
      const lb = K.patch('kaishu', 96, 72, (V) => { V.fill(0xe6e2d6); V.frame(2, 2, 94, 70, 0x3a8a4a); kana(K, V, 'カプセル', 48, 66, 0x3a8a4a, { size: 16, align: 'center' }); kana(K, V, '回収', 48, 48, 0xd8322a, { size: 16, s: 2, align: 'center' }); recycle(V, 8, 14, 0x3a8a4a); recycle(V, 79, 14, 0x3a8a4a); V.text5('RETURN', 48, 12, 0x6a6a6a, { align: 'center' }); }, { rough: 0.55 });
      K.face(lb, '+z', -0.12, 0.05, 0.12, 0.23, d + 0.001);
      dirtBox(K, 0xe6e2d6, -w, -d, w, d, 0, 0.03);
      // the clear bin: empties heaped inside, a white frame, the red lid with its round hole
      const cols = [0xe84a3a, 0x3a7ad8, 0xf2c21c, 0x3a9a4a, 0xe86aa8, 0x8a5bd6];
      for (let k = 0; k < 14; k++) capsule(K, -0.09 + ((k * 0.37) % 1) * 0.18, 0.3 + ((k * 0.23) % 1) * 0.1, -0.07 + ((k * 0.61) % 1) * 0.14, 0.03, cols[k % 6], { rx: k * 1.3, rz: k * 0.7, c2: 0xdcecec });
      K.glass(() => K.box(K.tint(0xd8ecf0, 60), -w + 0.012, 0.27, -d + 0.012, w - 0.012, 0.53, d - 0.012));
      for (const [x, z] of [[-w, -d], [w - 0.016, -d], [-w, d - 0.016], [w - 0.016, d - 0.016]]) K.box(wt, x, 0.27, z, x + 0.016, 0.53, z + 0.016);
      K.box(paint(0xc8302a, 0.2), -w - 0.004, 0.53, -d - 0.004, w + 0.004, B.y1, d + 0.004, { bevel: 0.008 });
      K.lathe(flat(0x26221e, 0.8), [0, B.y1 + 0.0006, 0], [[0.06, 0], [0, 0]], 10); K.torus(flat(0xe6e2d6, 0.5), 0, B.y1, 0, 0.064, 0.006, 10, 3);
    },

    // ------------------------------------------------------------- the coin changer 両替機 (0.42 x 1.28 x 0.37)
    coin_changer: (K, B) => {
      const c = 0xdcd8cc, w = B.w / 2 - 0.004, zf = B.z1 - 0.012, zb = B.z0;
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: -w, u1: w, v0: 0.04, v1: 1.06, ppm: 256, rough: 0.55 }, (V) => {
        const I = (x) => V.i(x), J = (y) => V.j(y), dk = darken(c, 0.3), R = 0xc8302a;
        V.fill(c); V.box(0, J(0.86), V.W, J(0.9), R); V.box(0, J(0.34), V.W, J(0.37), R); V.box(0, J(0.31), V.W, J(0.325), R);
        V.box(I(-0.15), J(0.92), I(0.15), J(1.03), 0x2a2e34); kana(K, V, '千円札', I(-0.06), J(1.02), 0x7ae87a, { size: 16, align: 'center' }); V.polyPx([[I(0.06), J(0.95)], [I(0.13), J(0.975)], [I(0.06), J(1.0)]], 0x7ae87a);
        V.box(I(-0.13), J(0.72), I(0.13), J(0.8), 0x3a3e44); V.frame(I(-0.13), J(0.72), I(0.13), J(0.8), 0x8a8e92); V.box(I(-0.11), J(0.752), I(0.11), J(0.768), 0x16181a); // the note slot
        V.box(I(-0.14), J(0.5), I(-0.02), J(0.66), 0xf2efe6); kana(K, V, '百円', I(-0.08), J(0.655), 0x26221e, { size: 16, align: 'center' }); V.text5('X10', I(-0.08), J(0.56), R, { align: 'center' });
        V.disc(I(0.08), J(0.6), 12, 0x8a8e92); V.disc(I(0.08), J(0.6), 9, R); V.text5('GO', I(0.08), J(0.615), 0xf2efe6, { align: 'center' });
        V.box(I(-0.13), J(0.12), I(0.13), J(0.27), 0x26282c); V.frame(I(-0.13), J(0.12), I(0.13), J(0.27), 0x8a8e92); V.box(I(-0.11), J(0.12), I(0.11), J(0.16), 0x4a4e54); // the coin cup
        V.box(I(0.1), J(0.4), I(0.16), J(0.46), 0xf2c21c); smallPrint(V, I(-0.15), J(0.44), 50, 3, dk, { seed: 6 });
        rustEdge(V, 0, V.W, 0, 6, 8, 0x9a6a3a);
      });
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : K.uv(paint(c, 0.15)))(p, n), (G) => G.box(-w, 0.04, zb, w, 1.06, zf, { bevel: 0.01 }));
      K.box(flat(0x3a3a3e, 0.8), -w + 0.01, 0, zb + 0.02, w - 0.01, 0.04, zf - 0.02);
      // the lit header box
      const H = K.patch('ryogae', 80, 40, (V) => { V.fill(0xf6f2e4); V.frame(0, 0, 80, 40, 0xc8302a); kana(K, V, '両替', 40, 37, 0xc8302a, { size: 16, s: 2, align: 'center' }); }, { bright: true });
      K.box(paint(c, 0.15), -w, 1.06, zb + 0.04, w, B.y1, zf, { bevel: 0.01 });
      K.glow(() => K.face(H, '+z', -w + 0.02, 1.08, w - 0.02, B.y1 - 0.02, zf + 0.001));
      K.box(chrome(0xb4babf), -0.11, 0.115, zf, 0.11, 0.13, zf + 0.012, { bevel: 0.003 });
    },

    // ------------------------------------------------------------- the utility sink (0.64 x 0.97 x 0.44): a deep steel tub on a frame, the tap at the back
    utility_sink: (K, B) => {
      const st = metal(0x5a5e64, 0.3), w = B.w / 2, d = B.d / 2, top = 0.82;
      K.tub(st, -w, top - 0.2, -d + 0.02, w, top, d, 0.018, { inside: flat(0x44484e, 0.5), bevel: 0.006 });
      K.box(st, -w, top, -d, w, B.y1 - 0.02, -d + 0.03, { bevel: 0.006 }); // the splash back
      for (const [x, z] of [[-w + 0.03, -d + 0.05], [w - 0.03, -d + 0.05], [-w + 0.03, d - 0.03], [w - 0.03, d - 0.03]]) { K.box(st, x - 0.018, 0, z - 0.018, x + 0.018, top - 0.2, z + 0.018); }
      K.box(st, -w + 0.02, 0.2, -d + 0.04, w - 0.02, 0.225, d - 0.02, { bevel: 0.004 }); // the shelf under it
      for (const z of [-d + 0.05, d - 0.03]) K.box(st, -w + 0.03, top - 0.26, z - 0.01, w - 0.03, top - 0.22, z + 0.01);
      // the tap: a brass bib cock on a riser, its cross handle; the drain trap below
      K.tube(metal(0xb89a4a, 0.3), [[0, top + 0.02, -d + 0.03], [0, top + 0.1, -d + 0.05], [0, top + 0.1, -d + 0.14], [0, top + 0.06, -d + 0.15]], 0.012, 6);
      K.cyl(metal(0xb89a4a, 0.3), 0, top + 0.1, -d + 0.06, 0.008, 0.035, 5); K.box(metal(0xb89a4a, 0.3), -0.03, top + 0.135, -d + 0.054, 0.03, top + 0.145, -d + 0.066); K.box(metal(0xb89a4a, 0.3), -0.006, top + 0.135, -d + 0.03, 0.006, top + 0.145, -d + 0.09);
      K.tube(metal(0x8a9094), [[0.05, top - 0.2, 0], [0.05, top - 0.3, 0], [0.09, top - 0.33, 0], [0.09, top - 0.28, -0.04], [0.09, top - 0.28, -d + 0.03]], 0.016, 6);
      // on the shelf: a wicker basket of pegs, a blue bucket; on the rim: a bar of soap, a scrubbing brush
      K.at([0.14, 0.225, 0.02], () => bucket(K, 0, 0, 0, 0.07, 0.11, { c: plastic(0x3a7ad8, 0.2), handle: 'down', n: 8 }));
      K.lathe(matte(0xc8a05a, 0.15), [-0.13, 0.225, 0.0], [[0, 0], [0.06, 0], [0.085, 0.06], [0.07, 0.06], [0.05, 0.012], [0, 0.012]], 8);
      K.box(flat(0xf2c21c, 0.5), w - 0.1, top, d - 0.07, w - 0.03, top + 0.02, d - 0.03, { bevel: 0.006, edge: null });
      K.box(wood(0xb8905a), -w + 0.03, top, d - 0.065, -w + 0.12, top + 0.016, d - 0.03, { bevel: 0.004 }); K.box(flat(0xe8e0c8, 0.95), -w + 0.035, top - 0.0, d - 0.062, -w + 0.115, top - 0.0, d - 0.033);
      rustLine(K, st, -w, w, top - 0.2, d);
    },

    // ------------------------------------------------------------- the instant water heater on the wall (0.3 x 0.68 x 0.4): back to the wall at -z
    water_heater: (K, B) => {
      const c = 0xe2ded2, w = B.w / 2 - 0.004, y0 = 0.24, zb = B.z0, zf = zb + 0.16;
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: -w, u1: w, v0: y0, v1: B.y1, ppm: 300, rough: 0.55 }, (V) => {
        const I = (x) => V.i(x), J = (y) => V.j(y0 + y), dk = darken(c, 0.3);
        V.fill(c); louvres(V, I(-0.1), J(0.36), I(0.1), J(0.42), c, 4);
        V.box(I(-0.11), J(0.2), I(0.11), J(0.33), 0x3a6aa8); V.text5('YUWAKASHI', I(0), J(0.31), 0xe8f0f8, { align: 'center' }); kana(K, V, '湯沸器', I(0), J(0.29), 0xe8f0f8, { size: 16, align: 'center' });
        V.box(I(-0.03), J(0.13), I(0.03), J(0.17), 0x26282c); V.box(I(-0.022), J(0.138), I(0.022), J(0.162), 0xf2913a); // the pilot window
        smallPrint(V, I(-0.11), J(0.11), 60, 2, dk, { seed: 3 }); warnTri(V, I(0.1), J(0.12), 9);
        for (const x of [-0.07, 0.07]) { V.disc(I(x), J(0.05), 11, dk); V.disc(I(x), J(0.05), 9, 0x26282c); V.line(I(x), J(0.05), I(x) + 4, J(0.05) + 7, 0xe8e4d8); }
        rustEdge(V, 0, V.W, 0, 5, 3, 0x9a6a3a);
      });
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : K.uv(enamel(c)))(p, n), (G) => G.box(-w, y0, zb, w, B.y1 - 0.03, zf, { bevel: 0.012 }));
      K.box(metal(0x9aa0a4), -0.08, B.y1 - 0.03, zb + 0.03, 0.08, B.y1, zf - 0.03, { bevel: 0.01 }); // the flue cap
      for (const x of [-0.07, 0.07]) K.cyl(plastic(0x26262a), x, y0 + 0.05, zf, 0.026, 0.02, 8, { axis: 'z' });
      // the long swivel spout out over the sink, the gas cock and hose underneath
      K.tube(chrome(0xb4babf), [[0, y0, zf - 0.05], [0, y0 - 0.05, zf - 0.04], [0.0, y0 - 0.07, B.z1 - 0.05], [0, y0 - 0.12, B.z1 - 0.02]], 0.011, 6);
      K.tube(flat(0xe8842a, 0.7), [[-0.09, y0, zb + 0.05], [-0.1, y0 - 0.12, zb + 0.04], [-0.06, 0.02, zb + 0.03]], 0.009, 5);
      K.cyl(metal(0xb89a4a), -0.09, y0 - 0.03, zb + 0.05, 0.012, 0.03, 6); K.box(paint(0xc8302a), -0.115, y0 - 0.022, zb + 0.062, -0.065, y0 - 0.012, zb + 0.074);
    },

    // ------------------------------------------------------------- paint tins (0.31 x 0.21 x 0.28)
    paint_tins: (K, B) => {
      const tin = (x, z, r, h, c, o = {}) => {
        K.cyl(metal(0xb4b8bc, 0.3), x, o.y ?? 0, z, r, h, 10, { bevel: 0.004 });
        const lb = K.patch('tin' + c, 64, 24, (V) => { V.fill(c); V.box(0, 0, 64, 3, 0xe8e4d8); V.box(22, 5, 42, 21, 0xe8e4d8); V.text5('PENKI', 32, 17, darken(c, 0.4), { align: 'center' }); smallPrint(V, 24, 9, 16, 1, 0x4a4a4a); V.disc(8, 12, 5, lighten(c, 0.3)); }, { rough: 0.6, shared: true });
        K.wrap(lb, x, (o.y ?? 0) + h * 0.12, (o.y ?? 0) + h * 0.88, z, r, { n: 10 });
        if (o.open) { K.lathe(flat(c, 0.3), [x, (o.y ?? 0) + h + 0.0005, z], [[r * 0.86, 0], [0, 0]], 10); K.box(flat(c, 0.3), x + r * 0.3, (o.y ?? 0) + h * 0.5, z + r * 0.86, x + r * 0.5, (o.y ?? 0) + h, z + r * 0.86 + 0.002); } // a drip down the side
        else K.torus(metal(0x8a9094, 0.3), x, (o.y ?? 0) + h, z, r * 0.8, 0.003, 10, 3);
        if (o.bail) K.tube(metal(0x8a9094, 0), K.arc([x, (o.y ?? 0) + h * 0.85, z], r + 0.004, 0, Math.PI, 6, 'xy').map(([a, b, cc]) => [a, (o.y ?? 0) + h * 0.85 - (b - (o.y ?? 0) - h * 0.85) * 0.4, cc + (b - (o.y ?? 0) - h * 0.85) * 0.9]), 0.0025, 3);
      };
      tin(B.x0 + 0.09, -0.04, 0.085, 0.17, 0x3a6ab8, { bail: true }); tin(B.x1 - 0.07, B.z0 + 0.07, 0.065, 0.13, 0xc8a05a, { open: true }); tin(B.x1 - 0.08, B.z1 - 0.06, 0.055, 0.1, 0xc8302a); tin(B.x0 + 0.05, B.z1 - 0.045, 0.04, 0.07, 0x3a8a4a);
      // a brush lying across the open one
      K.at([B.x1 - 0.07, 0.132, B.z0 + 0.07], () => { plank(K, 0xb8905a, -0.09, 0, -0.012, 0.02, 0.01, 0.012); K.box(metal(0x9aa0a4), 0.02, -0.001, -0.016, 0.045, 0.011, 0.016); K.box(flat(0x3a3028, 0.9), 0.045, 0, -0.016, 0.085, 0.01, 0.016); K.box(flat(0xc8a05a, 0.5), 0.07, 0, -0.016, 0.086, 0.0102, 0.016); }, { ry: 0.5 });
    },

    // ------------------------------------------------------------- a cord reel (0.33 x 0.34 x 0.43)
    cord_reel: (K, B) => {
      const or = plastic(0xe8742a, 0.2), cy = 0.19, z = B.z0 + 0.15, bl = flat(0x26262a, 0.6);
      K.sym((s) => { K.lathe(or, [s * 0.11, cy, z], [[0, 0], [0.13, 0], [0.13, 0.012], [0, 0.012]], 12, { axis: 'x' }); K.tube(metal(0x3a3a3e, 0.2), [[s * 0.145, 0.006, z - 0.11], [s * 0.145, cy, z], [s * 0.145, 0.006, z + 0.11]], 0.009, 5); });
      K.cyl(bl, -0.1, cy, z, 0.105, 0.2, 12, { axis: 'x', caps: false });
      for (let k = 0; k < 9; k++) K.torus(flat(k % 2 ? 0x1e1e20 : 0x303034, 0.7), -0.09 + k * 0.0225, cy, z, 0.105, 0.007, 12, 3, { axis: 'x' });
      K.rod(metal(0x3a3a3e, 0.2), [-0.145, 0.006, z - 0.11], [0.145, 0.006, z - 0.11], 0.009, 5); K.rod(metal(0x3a3a3e, 0.2), [-0.145, 0.006, z + 0.11], [0.145, 0.006, z + 0.11], 0.009, 5);
      K.tube(metal(0x3a3a3e, 0.2), [[-0.145, cy + 0.1, z], [-0.145, B.y1 - 0.01, z], [0.145, B.y1 - 0.01, z], [0.145, cy + 0.1, z]], 0.009, 5);
      K.box(flat(0xe8e4d8, 0.5), 0.124, cy - 0.04, z - 0.03, 0.1255, cy + 0.04, z + 0.03); K.cyl(or, 0.123, cy + 0.07, z + 0.05, 0.012, 0.03, 6, { axis: 'x' }); // sockets, the crank
      // the loose end runs out along the floor to its plug
      K.tube(bl, [[0.02, cy - 0.1, z + 0.02], [0.03, 0.01, z + 0.1], [0.0, 0.01, B.z1 - 0.08], [0.02, 0.012, B.z1 - 0.04]], 0.007, 5);
      K.box(flat(0xe8e4d8, 0.5), 0.005, 0, B.z1 - 0.045, 0.04, 0.025, B.z1 - 0.008, { bevel: 0.006 }); for (const x of [0.015, 0.03]) K.box(metal(0xc8a84a), x - 0.002, 0.008, B.z1 - 0.008, x + 0.002, 0.016, B.z1);
    },

    // ------------------------------------------------------------- jars of screws (0.28 x 0.144 x 0.104)
    screw_jars: (K, B) => {
      [[B.x0 + 0.048, 0.046, 0.13, 0xc8302a, 0x8a8e92], [-0.005, 0.04, 0.105, 0x3a6ab8, 0xb8a05a], [B.x1 - 0.045, 0.042, 0.09, 0xe8b830, 0x6a6e72]].forEach(([x, r, h, lid, fill], i) => {
        jar(K, x, 0, 0, r, h, { n: 8, lid: paint(lid), fill: flat(fill, 0.4), level: 0.55 + i * 0.12 });
        for (let k = 0; k < 5; k++) K.box(metal(lighten(fill, 0.3), 0), x - r * 0.5 + k * r * 0.22, h * 0.86 * (0.55 + i * 0.12) - 0.002, -0.004 + (k % 2) * 0.008, x - r * 0.5 + k * r * 0.22 + 0.014, h * 0.86 * (0.55 + i * 0.12) + 0.002, 0.0 + (k % 2) * 0.008);
      });
    },

    // ------------------------------------------------------------- a straw hat on its nail (0.376 x 0.376 x 0.104): flat to the wall, crown to +z
    straw_hat: (K, B) => {
      const s = 0xdcc07a, cy = B.h / 2, zb = B.z0, st = matte(s, 0.14);
      K.lathe(st, [0, cy, zb + 0.004], [[0, 0], [0.186, 0], [0.186, 0.008], [0.095, 0.014]], 14, { axis: 'z' });
      K.lathe(st, [0, cy, zb + 0.018], [[0.095, 0], [0.09, 0.05], [0.07, 0.078], [0, 0.084]], 14, { axis: 'z' });
      for (const r of [0.12, 0.15, 0.175]) K.torus(flat(darken(s, 0.14), 0.95), 0, cy, zb + 0.0125 - (r - 0.095) * 0.066, r, 0.0018, 14, 3, { axis: 'z' }); // the plait's rings
      K.lathe(fabric(0xc8302a), [0, cy, zb + 0.02], [[0.097, 0], [0.094, 0.028]], 14, { axis: 'z' });
      K.box(fabric(0xa82622), -0.02, cy - 0.105, zb + 0.022, 0.02, cy - 0.085, zb + 0.05, { bevel: 0.004, edge: null }); // the ribbon's bow
      K.cyl(metal(0x8a9094), 0, B.y1 - 0.012, zb, 0.004, 0.02, 5, { axis: 'z' });
    },

    // ------------------------------------------------------------- a coil of rope on a nail (0.28 x 0.37 x 0.1)
    rope_coil: (K, B) => {
      const r = 0xc8a86a, cy = 0.15, z = B.z0 + 0.03;
      for (let k = 0; k < 5; k++) K.torus(flat(k % 2 ? r : darken(r, 0.1), 0.95), (k % 2 ? 0.004 : -0.004), cy + (k % 3) * 0.004, z + k * 0.012, 0.11 + (k % 2) * 0.008, 0.013, 12, 4, { axis: 'z' });
      K.tube(flat(r, 0.95), [[0.02, cy + 0.11, z + 0.03], [0.0, B.y1 - 0.03, z + 0.01], [-0.02, cy + 0.11, z + 0.02]], 0.011, 5); // the hitch it hangs by
      K.tube(flat(r, 0.95), [[0.09, cy - 0.06, z + 0.05], [0.12, cy - 0.12, z + 0.045], [0.11, 0.012, z + 0.04]], 0.011, 5); K.cyl(flat(darken(r, 0.3), 0.9), 0.11, 0, z + 0.04, 0.013, 0.02, 5);
      K.cyl(metal(0x8a9094), 0, B.y1 - 0.02, B.z0, 0.005, 0.045, 5, { axis: 'z' });
    },

    // ------------------------------------------------------------- a little cactus (0.072 x 0.15 x 0.066), an aloe (0.12 x 0.12 x 0.108)
    cactus_pot: (K) => {
      const ys = pot(K, 0, 0, 0, 0.03, 0.05, { n: 8 }), g = 0x4a9a4a;
      K.lathe(matte(g, 0.2), [0, ys, 0], [[0.016, 0], [0.019, 0.03], [0.017, 0.07], [0.009, 0.082], [0, 0.084]], 8);
      K.tube(matte(g, 0.2), [[0.014, ys + 0.03, 0], [0.028, ys + 0.036, 0], [0.03, ys + 0.058, 0]], 0.008, 5);
      for (let k = 0; k < 8; k++) { const a = k * 0.785; K.box(flat(lighten(g, 0.35), 0.9), Math.cos(a) * 0.019 - 0.001, ys + 0.012, Math.sin(a) * 0.019 - 0.001, Math.cos(a) * 0.019 + 0.001, ys + 0.066, Math.sin(a) * 0.019 + 0.001); }
      flower(K, flat(0xe86aa8, 0.6), [0, ys + 0.09, 0.002], 0.012, { dir: [0, 1, 0.3], eye: flat(0xf2c21c) });
    },
    aloe_pot: (K) => {
      const ys = pot(K, 0, 0, 0, 0.04, 0.055, { c: matte(0x3a6ab8, 0.25), n: 8 });
      for (let k = 0; k < 8; k++) { const a = k * 0.785 + 0.3, l = 0.04 + (k % 3) * 0.008; blade(K, flat(k % 2 ? 0x5a9a6a : 0x6aaa74, 0.7), [Math.cos(a) * 0.008, ys, Math.sin(a) * 0.008], [Math.cos(a) * l, ys + 0.05 + (k % 2) * 0.012, Math.sin(a) * l], 0.016); }
    },

    // ------------------------------------------------------------- the wind chime (0.078 x 0.27 x 0.078): hung by its top
    furin: (K, B) => {
      const top = B.y1;
      K.rod(flat(0xd8322a, 0.8), [0, top, 0], [0, top - 0.05, 0], 0.0015, 3);
      K.glass(() => K.lathe(K.tint(0xcfe8f0, 110), [0, top - 0.105, 0], [[0.036, 0], [0.038, 0.02], [0.03, 0.045], [0.012, 0.056], [0, 0.057]], 10));
      const gf = K.patch('kingyo', 40, 16, (V) => { V.box(0, 0, 40, 16, 0xd8322a, 0); mascot(V, 'kingyo', 2, 12, {}, 1); mascot(V, 'kingyo', 24, 11, { r: 0xe8842a }, 1); V.hline(14, 22, 3, 0x5aa4e8); V.hline(16, 24, 5, 0x5aa4e8); }, { rough: 0.2 });
      K.glass(() => K.wrap(gf, 0, top - 0.1, top - 0.068, 0, 0.038, { n: 10, r1: 0.032, lift: 0.0008 }));
      K.rod(flat(0xe8e4d8, 0.8), [0, top - 0.05, 0], [0, top - 0.17, 0], 0.0012, 3); K.cyl(flat(0xb8d8e0, 0.2), 0, top - 0.112, 0, 0.004, 0.012, 5);
      // the paper strip that catches the wind
      const tz = K.patch('tanzaku', 12, 36, (V) => { V.fill(0xf2efe6); for (const j of [6, 12, 18]) V.box(0, j, 12, j + 3, 0x3a7ad8); V.box(4, 28, 8, 32, 0xd8322a); }, { rough: 0.9 });
      K.quadUV(tz, [-0.012, 0, 0.004], [0.012, 0, -0.004], [0.012, top - 0.17, -0.004], [-0.012, top - 0.17, 0.004], null, { both: true });
    },

    // ------------------------------------------------------------- the tin robot (0.16 x 0.32 x 0.08)
    tin_robot: (K, B) => {
      const m = metal(0x4a4e58, 0.25), red = paint(0xc8302a, 0.2);
      K.sym((s) => { K.box(red, s * 0.03 - 0.024, 0, -0.03, s * 0.03 + 0.024, 0.03, 0.04, { bevel: 0.006 }); K.box(m, s * 0.03 - 0.016, 0.03, -0.016, s * 0.03 + 0.016, 0.11, 0.016); });
      K.box(m, -0.055, 0.11, -0.032, 0.055, 0.225, 0.032, { bevel: 0.008 });
      const ch = K.patch('chest', 40, 40, (V) => { V.fill(0x3a3e48); V.frame(2, 2, 38, 38, 0x8a8e98); V.box(6, 22, 34, 34, 0x16181c); for (let k = 0; k < 4; k++) V.box(8 + k * 7, 25, 12 + k * 7, 31, [0xd8322a, 0xf2c21c, 0x3a9a4a, 0x3a7ad8][k]); V.disc(12, 12, 5, 0x8a8e98); V.line(12, 12, 15, 15, 0xd8322a); V.box(22, 8, 34, 16, 0x16181c); for (let k = 0; k < 4; k++) V.vline(24 + k * 3, 9, 14, 0x8a8e98); }, { rough: 0.5 });
      K.face(ch, '+z', -0.045, 0.12, 0.045, 0.215, 0.0325);
      K.box(m, -0.04, 0.235, -0.03, 0.04, 0.295, 0.03, { bevel: 0.008 }); K.cyl(m, 0, 0.225, 0, 0.014, 0.012, 6);
      K.sym((s) => { K.glow(() => K.cyl(flat(0xf2c84a), s * 0.018, 0.27, 0.03, 0.009, 0.003, 8, { axis: 'z' })); K.box(m, s * 0.065 - 0.012, 0.13, -0.014, s * 0.065 + 0.012, 0.215, 0.014, { bevel: 0.004 }); K.box(red, s * 0.065 - 0.014, 0.1, -0.016, s * 0.065 + 0.014, 0.13, 0.02, { bevel: 0.005 }); K.cyl(metal(0x8a8e98), s * 0.04, 0.26, 0, 0.006, 0.012, 5, { axis: 'x' }); });
      K.box(flat(0x16181c, 0.6), -0.02, 0.245, 0.03, 0.02, 0.252, 0.0305);
      K.cyl(metal(0x8a8e98), 0, 0.295, 0, 0.003, 0.016, 4); K.ball(red, 0, 0.314, 0, 0.007, 0.007, 0.007, 6, 3);
      K.box(metal(0x8a8e98), 0.02, 0.15, -0.045, 0.045, 0.175, -0.032); K.torus(metal(0xc8a84a, 0.3), 0.0325, 0.1625, -0.055, 0.012, 0.0025, 8, 3, { axis: 'x' }); // the wind-up key
    },

    // ------------------------------------------------------------- rubber sandals (0.176 x 0.048 x 0.232)
    sandals: (K) => {
      const br = rubber(0x6a4a34);
      [[-0.045, 0.0, 0.06], [0.045, 0.012, -0.05]].forEach(([x, dz, ry]) => K.at([x, 0, dz], () => {
        K.prism(br, [[-0.036, -0.1], [0.036, -0.1], [0.042, 0.02], [0.034, 0.1], [-0.034, 0.1], [-0.042, 0.02]], { plane: 'xz', a: 0, b: 0.016, side: flat(0x4a3424, 0.95) });
        K.tube(flat(0x54392a, 0.9), [[-0.04, 0.016, 0.0], [-0.03, 0.04, 0.04], [0.03, 0.04, 0.04], [0.04, 0.016, 0.0]], 0.006, 4, { flat: [0.034, 0.005], up: [0, 0, 1] });
        for (let k = 0; k < 4; k++) K.box(flat(0x54392a, 0.95), -0.03, 0.016, -0.08 + k * 0.03, 0.03, 0.0172, -0.07 + k * 0.03);
      }, { ry }));
    },

    // ------------------------------------------------------------- the red fuel can (0.26 x 0.39 x 0.16)
    fuel_can: (K, B) => {
      const red = paint(0xc8302a, 0.25), w = B.w / 2, d = B.d / 2;
      K.box(red, -w, 0, -d, w, 0.3, d, { bevel: 0.016 });
      for (const s of [-1, 1]) K.box(flat(0xa82622, 0.6), -w + 0.03, 0.04, s * d - 0.001, w - 0.03, 0.26, s * d + 0.001); // the pressed panel
      const lb = K.patch('gasoline', 44, 44, (V) => { V.fill(0xeeeae0); V.frame(0, 0, 44, 44, 0xc8302a); kana(K, V, '危', 6, 40, 0xc8302a, { size: 16, s: 2 }); warnTri(V, 34, 6, 9); }, { rough: 0.6 });
      K.face(lb, '+z', -0.055, 0.09, 0.055, 0.2, d + 0.0015);
      K.tube(red, [[-0.07, 0.3, 0], [-0.07, B.y1 - 0.012, 0], [0.03, B.y1 - 0.012, 0], [0.03, 0.3, 0]], 0.012, 4, { flat: [0.018, 0.03], up: [0, 0, 1] });
      K.cyl(paint(0xe8b830, 0.2), 0.085, 0.3, 0, 0.022, 0.035, 8, { bevel: 0.004 });
      dirtBox(K, 0xc8302a, -w, -d, w, d, 0, 0.025);
    },

    // ------------------------------------------------------------- a sweet-shop jar full of capsules (0.19 x 0.3 x 0.19)
    capsule_jar: (K, B) => {
      const cols = [0xe84a3a, 0x3a7ad8, 0xf2c21c, 0x3a9a4a, 0xe86aa8, 0x8a5bd6, 0x2ab4c8];
      let k = 0;
      for (let y = 0; y < 4; y++) for (let i = 0; i < 4; i++) { const a = i * 1.5708 + y * 0.7; capsule(K, Math.cos(a) * 0.04, 0.035 + y * 0.052, Math.sin(a) * 0.04, 0.03, cols[k % 7], { rx: k * 1.1, rz: k * 0.6, c2: 0xdcecec }); k++; }
      K.glass(() => K.lathe(K.tint(0xd4e8ec, 66), [0, 0, 0], [[0, 0], [0.078, 0], [0.092, 0.03], [0.092, 0.2], [0.066, 0.235], [0.066, 0.25]], 10));
      K.cyl(paint(0xc8302a, 0.2), 0, 0.25, 0, 0.074, B.y1 - 0.25, 10, { bevel: 0.008 });
      for (let i = 0; i < 10; i++) { const a = i * 0.6283; K.box(flat(0xa82622, 0.6), Math.cos(a) * 0.074 - 0.003, 0.256, Math.sin(a) * 0.074 - 0.003, Math.cos(a) * 0.074 + 0.003, B.y1 - 0.01, Math.sin(a) * 0.074 + 0.003); }
    },

    // ------------------------------------------------------------- Grandpa's rubber coin tray (0.168 x 0.024 x 0.12)
    coin_tray: (K, B) => {
      const bl = rubber(0x2f6fb8), w = B.w / 2, d = B.d / 2;
      K.tub(bl, -w, 0, -d, w, B.y1, d, 0.008, { floor: 0.005, bevel: 0.003, inside: flat(0x265a98, 0.9) });
      for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) K.box(flat(0x3a7ac8, 0.9), -w + 0.016 + i * 0.016, 0.005, -d + 0.016 + j * 0.016, -w + 0.021 + i * 0.016, 0.0075, -d + 0.021 + j * 0.016);
    },

    // ------------------------------------------------------------- flattened cardboard tied in a bundle (0.59 x 0.15 x 0.44)
    cardboard_bundle: (K, B) => {
      stack(K, CARD, B.x0 + 0.012, 0, B.z0 + 0.01, B.x1 - 0.012, B.y1 - 0.004, B.z1 - 0.01, 6, { seed: 5, jit: 0.01 });
      tied(K, B.x0 + 0.004, 0, B.z0 + 0.004, B.x1 - 0.004, B.y1 - 0.006, B.z1 - 0.004, { dx: 0.02 });
      K.box(flat(0x26221e, 0.7), -0.06, B.y1 - 0.0055, -0.05, 0.06, B.y1 - 0.005, 0.05); // a shipping label's black square
    },

    // ------------------------------------------------------------- a wooden step stool (0.32 x 0.39 x 0.24)
    step_stool: (K, B) => {
      const w = 0xb8905a, x0 = B.x0, x1 = B.x1, z0 = B.z0, z1 = B.z1;
      plank(K, w, x0, B.y1 - 0.022, z0, x1, B.y1, z1, { bevel: 0.004 });
      for (const x of [x0, x1 - 0.022]) plank(K, w, x, 0, z0 + 0.01, x + 0.022, B.y1 - 0.022, z1 - 0.01, { axis: 'y', v: 1 });
      plank(K, w, x0 + 0.022, 0.16, z0 + 0.02, x1 - 0.022, 0.18, z1 - 0.02, { v: 2 });
      plank(K, darken(w, 0.08), x0 + 0.022, 0.02, z0 + 0.012, x1 - 0.022, B.y1 - 0.022, z0 + 0.026, { v: 1 });
      K.box(flat(0x3a3028, 0.9), -0.05, B.y1 - 0.024, -0.012, 0.05, B.y1 + 0.0005, 0.012); // the hand hole
    },
  },
};
function rustLine(K, st, x0, x1, y, d) { K.box(flat(0x8a4a26, 0.9), x0 + 0.1, y + 0.01, d, x0 + 0.24, y + 0.03, d + 0.0012); K.box(flat(0x8a4a26, 0.9), x1 - 0.2, y + 0.006, d, x1 - 0.12, y + 0.02, d + 0.0012); void st; }
