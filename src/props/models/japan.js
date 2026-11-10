// New props for the "real Japan" pass (ids from src/data/props/japan.js): the mosquito-coil pig, a calendar from the
// local dentist, a kamidana, geta by the door, a crate of sake (isshōbin), a wooden ramune crate, empty beer crates
// stacked for the bottle collection. Each declares its own box (they never had a voxel model).
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, leaf, plank, bottleCrate, slatCrate } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot } from '../kit/prints.js';

export default {
  family: 'garage',
  models: {
    // ------------------------------------------------------------- kayari-buta: a ceramic pig with a mosquito coil smouldering inside, snout to +z
    katori_buta: { box: [-0.1, 0, -0.13, 0.1, 0.17, 0.13], build: (K) => {
      const c = ceramic(0xe6ded0), n = 12;
      K.lathe(c, [0, 0.085, -0.12], [[0, 0], [0.05, 0.004], [0.075, 0.04], [0.078, 0.14], [0.066, 0.2], [0.05, 0.225]], n, { axis: 'z' }); // the body, open at the snout
      K.lathe(flat(0x4a4038, 0.9), [0, 0.085, -0.12], [[0.046, 0.225], [0.062, 0.2], [0.072, 0.14], [0.07, 0.04], [0, 0.01]], n, { axis: 'z', flip: true });
      K.torus(ceramic(0xd8a0a0), 0, 0.085, 0.105, 0.05, 0.006, n, 4, { axis: 'z' });
      K.sym((s) => { for (const z of [-0.06, 0.05]) K.cyl(c, s * 0.04, 0, z, 0.016, 0.03, 6, { r1: 0.02 }); K.prism(c, [[s * 0.03, 0.15], [s * 0.065, 0.14], [s * 0.055, 0.17]], { plane: 'xy', a: 0.04, b: 0.06 }); K.ball(flat(0x26221e, 0.3), s * 0.045, 0.12, 0.078, 0.007, 0.009, 0.005, 6, 3); });
      for (const [x, z] of [[0.05, -0.02], [-0.055, 0.0], [0.02, -0.07]]) K.ball(flat(0x3a6ab8, 0.3), x * 1.38, 0.1 + Math.abs(x), z, 0.012, 0.012, 0.006, 6, 3); // blue spots
      K.tube(metal(0x8a9094, 0.3), K.arc([0, 0.155, -0.01], 0.04, 0.3, 2.84, 6, 'zy'), 0.003, 4); // the wire handle
      // the coil on its stand, the tip alight
      for (let k = 0; k < 3; k++) K.torus(flat(0x4a7a44, 0.9), 0, 0.07, -0.02, 0.018 + k * 0.014, 0.004, 10, 3);
      K.glow(() => K.ball(flat(0xf2913a), 0.046, 0.07, -0.02, 0.005, 0.005, 0.005, 5, 2));
    } },
    // ------------------------------------------------------------- a wall calendar from the dentist down the lane (hung by its top, back to the wall at -z)
    wall_calendar: { box: [-0.15, 0, -0.008, 0.15, 0.52, 0.008], build: (K, B) => {
      const V = K.patch('cal', 120, 208, (V) => {
        V.fill(0xf2efe6); V.box(0, 150, 120, 208, 0x8ac0d8); V.disc(88, 186, 12, 0xf2e8a0); V.polyPx([[0, 150], [40, 182], [70, 160], [120, 176], [120, 150]], 0x5a9a6a); V.polyPx([[20, 150], [48, 172], [76, 150]], 0xeef2f4); // a mountain view
        V.text5('1999', 14, 144, 0x26221e); V.text5('4', 60, 146, 0xc8302a, { align: 'center', s: 3 }); kana(K, V, '四月', 98, 146, 0x26221e, { size: 16, align: 'center' });
        for (let c = 0; c < 7; c++) { V.text5('SMTWTFS'[c], 12 + c * 16, 120, c === 0 ? 0xc8302a : c === 6 ? 0x2a52a8 : 0x26221e, { align: 'center' }); for (let r = 0; r < 5; r++) { const d = r * 7 + c - 3; if (d >= 1 && d <= 30) V.text5(String(d), 12 + c * 16, 108 - r * 14, c === 0 || d === 29 ? 0xc8302a : c === 6 ? 0x2a52a8 : 0x26221e, { align: 'center' }); } }
        V.hline(4, 115, 124, 0x8a8478); V.ring(44, 76, 6, 7.5, 0xc8302a); // a day ringed in red
        V.box(0, 0, 120, 30, 0x2a52a8); kana(K, V, 'やまね歯科', 60, 27, 0xf2efe6, { size: 16, align: 'center' }); V.text5('TEL 22-4618', 60, 9, 0xc8d4f0, { align: 'center' });
      }, { rough: 0.9 });
      K.box(flat(0xe8e4d8, 0.9), B.x0, 0, -0.004, B.x1, 0.5, 0.002, { bevel: 0 }); K.face(V, '+z', B.x0, 0, B.x1, 0.5, 0.0028);
      K.box(metal(0x8a9094, 0.3), B.x0, 0.495, -0.005, B.x1, 0.507, 0.005); K.torus(metal(0x8a9094, 0.3), 0, 0.512, 0, 0.007, 0.0015, 8, 3, { axis: 'z' });
    } },
    // ------------------------------------------------------------- a kamidana: the god shelf (back to the wall at -z, hung at its foot)
    kamidana: { box: [-0.32, 0, -0.13, 0.32, 0.42, 0.13], build: (K, B) => {
      const w = 0xd8c090;
      plank(K, w, B.x0, 0.03, B.z0, B.x1, 0.05, B.z1, { bevel: 0.003 }); K.sym((s) => K.prism(wood(darken(w, 0.1)), [[B.z0, 0.03], [B.z1 - 0.04, 0.03], [B.z0, 0]], { plane: 'zy', a: s * 0.24 - 0.008, b: s * 0.24 + 0.008 }));
      // the little shrine: steps, doors with gold fittings, a thatched roof with crossed finials
      plank(K, w, -0.13, 0.05, -0.09, 0.13, 0.07, 0.06, { bevel: 0.002 }); plank(K, w, -0.11, 0.07, -0.09, 0.11, 0.22, 0.02, { axis: 'y', bevel: 0.002, v: 1 });
      for (const s of [-1, 1]) { K.box(wood(lighten(w, 0.1)), s * 0.045 - 0.04, 0.085, 0.02, s * 0.045 + 0.04, 0.2, 0.026); K.box(metal(0xd8a83a, 0.3), s * 0.012 - 0.006, 0.13, 0.026, s * 0.012 + 0.006, 0.15, 0.029); }
      K.prism(matte(0xb89a5a, 0.15), [[-0.16, 0.22], [0.16, 0.22], [0.02, 0.31], [-0.02, 0.31]], { plane: 'xy', a: -0.11, b: 0.06 });
      for (const z of [-0.09, 0.04]) K.sym((s) => K.rod(wood(w), [s * 0.03, 0.28, z], [-s * 0.05, 0.37, z], 0.006, 4));
      K.cyl(wood(w), -0.1, 0.31, -0.025, 0.012, 0.2, 6, { axis: 'x' });
      // the offerings: sakaki in white vases, a saucer of salt, sake flasks; the shimenawa with its paper shide
      K.sym((s) => { K.lathe(ceramic(0xeeeae0), [s * 0.22, 0.05, 0.02], [[0, 0], [0.018, 0], [0.024, 0.03], [0.012, 0.06], [0.014, 0.075]], 8); for (let k = 0; k < 4; k++) leaf(K, flat(k % 2 ? 0x3a7a40 : 0x4a8a48, 0.9), [s * 0.22, 0.12, 0.02], [s * 0.22 + (k - 1.5) * 0.03, 0.2 + (k % 2) * 0.03, 0.02 + (k % 2 ? 0.02 : -0.02)], 0.035); K.lathe(ceramic(0xeeeae0), [s * 0.06, 0.05, 0.09], [[0, 0], [0.012, 0], [0.016, 0.02], [0.006, 0.04], [0.008, 0.05]], 8); });
      K.lathe(ceramic(0xeeeae0), [0, 0.05, 0.1], [[0, 0], [0.02, 0], [0.026, 0.008], [0, 0.008]], 8); K.lathe(flat(0xf6f4ec, 0.8), [0, 0.058, 0.1], [[0.014, 0], [0, 0.016]], 6);
      K.tube(matte(0xc8b06a, 0.15), [[B.x0 + 0.02, 0.39, 0.08], [0, 0.375, 0.09], [B.x1 - 0.02, 0.39, 0.08]], 0.012, 6);
      for (const x of [-0.18, -0.06, 0.06, 0.18]) for (let k = 0; k < 3; k++) K.sheet(flat(0xf2efe6, 0.9), [x - 0.012 + (k % 2) * 0.012, 0.375 - k * 0.03, 0.092], [x + 0.012 + (k % 2) * 0.012, 0.375 - k * 0.03, 0.092], [x + 0.012 + (k % 2) * 0.012, 0.345 - k * 0.03, 0.092], [x - 0.012 + (k % 2) * 0.012, 0.345 - k * 0.03, 0.092]);
    } },
    // ------------------------------------------------------------- geta left at the door
    geta: { box: [-0.11, 0, -0.13, 0.11, 0.075, 0.13], build: (K) => {
      [[-0.055, 0.0, 0.06], [0.055, 0.015, -0.1]].forEach(([x, z, ry]) => K.at([x, 0, z], () => {
        plank(K, 0xc8a06a, -0.045, 0.045, -0.115, 0.045, 0.062, 0.115, { bevel: 0.006, axis: 'z' });
        for (const zz of [-0.06, 0.035]) plank(K, 0xb8905a, -0.043, 0, zz, 0.043, 0.045, zz + 0.022, { axis: 'x', v: 1 }); // the two teeth
        const h = fabric(0x2a2a4a); // the hanao: a thong from the toe post back to both sides
        K.tube(h, [[0, 0.062, 0.06], [-0.012, 0.074, 0.02], [-0.036, 0.064, -0.05]], 0.005, 5); K.tube(h, [[0, 0.062, 0.06], [0.012, 0.074, 0.02], [0.036, 0.064, -0.05]], 0.005, 5);
        for (const [i, j] of [[-0.025, 0.09], [0.02, 0.085], [0.0, -0.08]]) K.box(flat(0xa07a48, 0.9), i - 0.008, 0.062, j - 0.004, i + 0.008, 0.0626, j + 0.004); // grain worn by feet
      }, { ry }));
    } },
    // ------------------------------------------------------------- a crate of sake: six isshōbin in a blue P-box, the brewery's name on its side
    sake_crate: { box: [-0.23, 0, -0.155, 0.23, 0.42, 0.155], build: (K, B) => {
      const bl = 0x2f5fa8;
      const pr = K.patch('tsukimi', 96, 24, (V) => { V.fill(bl); kana(K, V, '月見酒造', 48, 21, 0xf2efe6, { size: 16, align: 'center' }); V.hline(6, 89, 2, 0xf2efe6); }, { rough: 0.68 });
      bottleCrate(K, bl, B.x0, 0, B.z0, B.x1, 0.3, B.z1, { print: pr, cells: [3, 2] });
      const lb = K.patch('label', 40, 40, (V) => { V.fill(0xf2ead6); V.frame(1, 1, 39, 39, 0xc8302a); kana(K, V, '月', 12, 36, 0x26221e, { size: 16 }); kana(K, V, '見', 12, 19, 0x26221e, { size: 16 }); V.disc(30, 28, 5, 0xe8c040); }, { rough: 0.8 });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = B.x0 + 0.08 + i * 0.15, z = B.z0 + 0.08 + j * 0.15; K.lathe(flat(i === 1 && j === 0 ? 0x2a4a3a : 0x5a3a20, 0.3), [x, 0.014, z], [[0, 0], [0.05, 0], [0.052, 0.01], [0.052, 0.24], [0.02, 0.33], [0.018, 0.385]], 10); K.cyl(flat(0xc8302a, 0.5), x, 0.39, z, 0.02, 0.016, 8); if (j === 1) K.wrap(lb, x, 0.31, 0.24, z, 0.052, { n: 10, arc: 2.0, sub: [0, 1, 1, 0] }); }
    } },
    // ------------------------------------------------------------- a wooden ramune crate, the bottles' blue-green glass showing over the slats
    ramune_crate: { box: [-0.21, 0, -0.15, 0.21, 0.26, 0.15], build: (K, B) => {
      slatCrate(K, 0xb8905a, B.x0, 0, B.z0, B.x1, 0.17, B.z1, { rows: 2, t: 0.012 });
      const st = K.patch('hoshizora', 112, 22, (V) => { V.box(0, 0, 112, 22, 0xb8905a, 255); kana(K, V, 'ほしぞらラムネ', 56, 20, 0x2a52a8, { size: 16, align: 'center' }); }, { rough: 0.8 });
      K.face(st, '+z', B.x0 + 0.02, 0.095, B.x1 - 0.02, 0.165, B.z1 + 0.001);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { if ((i + j * 2) % 7 === 3) continue; const x = B.x0 + 0.05 + i * 0.08, z = B.z0 + 0.06 + j * 0.09; K.glass(() => K.lathe(K.tint(0x8ad0d0, 150, 0.1), [x, 0.014, z], [[0, 0], [0.026, 0], [0.028, 0.01], [0.028, 0.1], [0.016, 0.13], [0.02, 0.15], [0.014, 0.19], [0.016, 0.22]], 8)); K.cyl(plastic(0x3a7ac8, 0.3), x, 0.232, z, 0.017, 0.012, 8); K.ball(flat(0xdcecec, 0.15), x, 0.168, z, 0.008, 0.008, 0.008, 6, 3); }
    } },
    // ------------------------------------------------------------- two empty beer crates stacked for the bottle collection, a few returns in the top one
    bottle_crates: { box: [-0.23, 0, -0.18, 0.23, 0.6, 0.18], build: (K, B) => {
      const pr = K.patch('asanagi', 96, 24, (V) => { V.fill(0xe8b830); kana(K, V, '朝凪ビール', 48, 21, 0xc8302a, { size: 16, align: 'center' }); V.hline(6, 89, 2, 0xc8302a); }, { rough: 0.68, shared: true });
      bottleCrate(K, 0xe8b830, B.x0, 0, B.z0, B.x1, 0.28, B.z1, { print: pr, cells: [5, 4] });
      K.at([0.012, 0.285, 0.0], () => { bottleCrate(K, 0xc8302a, B.x0, 0, B.z0, B.x1, 0.28, B.z1, { cells: [5, 4] }); for (const [i, j] of [[0, 0], [1, 0], [4, 3], [2, 1], [3, 3]]) { const x = B.x0 + 0.05 + i * 0.09, z = B.z0 + 0.05 + j * 0.087; K.lathe(flat(0x5a3418, 0.3), [x, 0.012, z], [[0.03, 0], [0.03, 0.15], [0.012, 0.21], [0.012, 0.25]], 8); } }, { ry: 0.06 });
    } },
  },
};
