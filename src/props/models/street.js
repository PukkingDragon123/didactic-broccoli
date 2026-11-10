// The lane's street furniture (ids from src/data/props/street.js): Shōwa back-lane things as they are built: a
// tapered concrete utility pole with its tiger guard, advert wrap, step bolts, cross-arms and pole transformers; a
// round red post box; stop signs; a curve mirror; fire buckets; block walls, hedges and the pots people put out.
import { paint, enamel, plastic, metal, matte, stone, wood, flat, rubber, lighten, darken, mix } from '../kit/kit.js';
import { blob, bush, tones, leafy, leaf, leafRing, blade, flower, pot, planter, dirtBox, dirtRing, plank, post, clamps, TERRA } from '../kit/shapes.js';
import { kana, smallPrint, hazard, framed } from '../kit/prints.js';
import { leaves } from '../kit/foliage.js';

const GALV = metal(0xa6acae, 0.3), CONC = 0xb2aea4;
const LEAF = 0x4f8f45, LEAF2 = 0x6aa84f, SOIL = 0x4a3828;

/** The stop sign's face: a red triangle with a white edge, 止まれ in white. */
export function tomareTex(K) {
  return K.patch('tomare', 192, 166, (V) => {
    V.fill(0xf4f1e8);
    V.polyPx([[9, 160], [183, 160], [96, 10]], 0xc8242a);
    kana(K, V, '止まれ', 96, 148, 0xffffff, { size: 16, s: 2, align: 'center' });
    for (const [i, j] of [[30, 154], [161, 154], [95, 22]]) { V.px(i, j, 0x9a2024); V.px(i + 1, j, 0xe8a0a0); }
  }, { shared: true, rough: 0.7 });
}

/** A stop sign: the red inverted triangle 止まれ on a galvanised post (1999: no English on it yet). */
function stopSign(K, B) {
  const top = B.y1 - 0.01, s = Math.min(0.76, B.w - 0.02), th = s * 0.866, pz = -0.012;
  post(K, 0, pz - 0.03, top - th * 0.25, 0.03, { n: 8 });
  dirtRing(K, 0xa6acae, 0, pz - 0.03, 0.03, 0, 0.05, 8);
  const V = tomareTex(K);
  const a = [-s / 2, top, pz + 0.004], b = [s / 2, top, pz + 0.004], c = [0, top - th, pz + 0.004];
  K.triUV(V, a, b, c, [[0.004, 0.996], [0.996, 0.996], [0.5, 0.004]], [0, 0, 1]);
  // the plate's back and its thickness
  K.prism(metal(0x9aa0a2, 0.25), [[-s / 2, top], [s / 2, top], [0, top - th]], { plane: 'xy', a: pz - 0.004, b: pz + 0.0035, caps: 'a' });
  clamps(K, 0, [top - th * 0.2, top - th * 0.62], pz - 0.06, 0.03);
}

export default {
  family: 'street',
  models: {
    // ------------------------------------------------------------- utility pole (2.16 x 8.08 x 0.56)
    utility_pole: (K) => {
      const conc = stone(0xb4b0a6, 0.12), n = 10, R0 = 0.17, R1 = 0.105, H = 7.98, rAt = (y) => R0 + (R1 - R0) * (y / H);
      K.cyl(conc, 0, 0, 0, R0, H, n, { r1: R1, cap0: false });
      K.cyl(flat(0x6a6660, 0.6), 0, H, 0, R1 + 0.006, 0.07, n, { r1: R1 * 0.6 });
      K.cyl(stone(0x9a968e), 0, 0, 0, 0.25, 0.06, n, { bevel: 0.02 });
      dirtRing(K, 0x9a968e, 0, 0, 0.25, 0, 0.04, n);
      // the tiger guard round the foot, the address plate, the advert wrap (a local dentist), a flyer's leftover corner
      const tiger = K.patch('tiger', 80, 120, (V) => { hazard(V, 0, 0, 80, 120, 0xf2c21c, 0x26221e, 12); V.box(0, 118, 80, 120, 0x8a7a2a); V.box(0, 0, 80, 3, 0x6a5e3a); }, { shared: true, rough: 0.55 });
      K.wrap(tiger, 0, 0.1, 1.85, 0, rAt(0.1), { n, r1: rAt(1.85), lift: 0.004 });
      const ad = K.patch('ad', 72, 208, (V) => {
        V.fill(0xf6f2e6); V.box(0, 196, 72, 208, 0x2a52a8); V.box(0, 0, 72, 34, 0x2a52a8); V.frame(0, 0, 72, 208, 0xd8d2c0);
        kana(K, V, 'やまね歯科', 20, 190, 0x1e3a8a, { size: 16, s: 2, vert: true });
        V.box(6, 40, 14, 190, 0xd8322a); // a red rule down the side
        V.text5('50M', 36, 26, 0xffffff, { align: 'center', s: 2 }); V.polyPx([[52, 8], [64, 14], [52, 20]], 0xffffff); V.box(40, 12, 52, 16, 0xffffff);
      }, { rough: 0.5 });
      K.wrap(ad, 0, 2.15, 3.35, 0, rAt(2.15), { n, r1: rAt(3.35), arc: 2.4, lift: 0.006 });
      const plate = K.patch('addr', 40, 20, (V) => { framed(V, 0x2f7a4a, 0xe8e4d4); kana(K, V, '三丁目', 20, 17, 0xffffff, { size: 8, align: 'center' }); V.text5('3-7', 20, 9, 0xffffff, { align: 'center' }); }, { rough: 0.45 });
      K.face(plate, '+z', -0.07, 1.92, 0.07, 1.99, rAt(1.95) * 0.951 + 0.004);
      // step bolts, alternating sides
      for (let y = 3.7, s = 1; y < 6.75; y += 0.34, s = -s) K.rod(metal(0x8a9092), [s * (rAt(y) - 0.01), y, 0], [s * (rAt(y) + 0.11), y, 0], 0.011, 4);
      // cross-arms (galvanised channel) with braces and pin insulators
      const arm = (y, hw) => {
        K.box(GALV, -hw, y - 0.04, -0.035, hw, y + 0.04, 0.035, { bevel: 0.006 });
        K.box(metal(0x7e8486), -0.06, y - 0.06, -R1 - 0.03, 0.06, y + 0.06, R1 + 0.03, { bevel: 0.008 }); // the band clamping it to the pole
        K.sym((s) => K.rod(GALV, [s * 0.13, y - 0.42, 0.04], [s * hw * 0.62, y - 0.04, 0.04], 0.012, 4));
      };
      const pin = (x, y) => { K.cyl(metal(0x7e8486), x, y, 0, 0.012, 0.07, 5); K.lathe(flat(0xf2efe6, 0.3), [x, y + 0.05, 0], [[0, 0], [0.04, 0], [0.045, 0.035], [0.03, 0.05], [0.036, 0.075], [0.02, 0.1], [0, 0.1]], 6); };
      arm(7.42, 0.92); arm(6.84, 0.76);
      for (const x of [-0.82, -0.42, 0.42, 0.82]) pin(x, 7.46);
      for (const x of [-0.66, 0.66]) pin(x, 6.88);
      // pole transformers: grey tanks with cooling fins, bushings on the lid, a rating plate; hung on a hanger band
      const tr = (x, y0, h, r) => {
        const body = paint(0xa7b0aa, 0.22);
        K.cyl(body, x, y0, 0, r, h, 10, { bevel: 0.012 });
        for (let k = 0; k < 5; k++) { const a = Math.sign(x) * (-0.9 + k * 0.45); K.box(paint(0x98a29c, 0.2), x + Math.sin(a) * r * 0.9 - 0.008, y0 + h * 0.12, Math.cos(a) * r * 0.9 - 0.008, x + Math.sin(a) * (r + 0.035) + 0.008, y0 + h * 0.86, Math.cos(a) * (r + 0.035) + 0.008); }
        K.cyl(flat(0x8a928c, 0.4), x, y0 + h, 0, r * 0.82, 0.03, 10);
        for (const dx of [-0.07, 0.07]) K.lathe(flat(0xf2efe6, 0.3), [x + dx, y0 + h + 0.03, 0], [[0, 0], [0.03, 0], [0.034, 0.03], [0.02, 0.045], [0.026, 0.07], [0, 0.08]], 6);
        K.box(metal(0x6e7476), Math.sign(x) * 0.1, y0 + h * 0.3, -0.03, x, y0 + h * 0.4, 0.03); K.box(metal(0x6e7476), Math.sign(x) * 0.1, y0 + h * 0.68, -0.03, x, y0 + h * 0.78, 0.03);
        const pl = K.patch('rating', 24, 16, (V) => { framed(V, 0xf2efe6, 0x4a4a4a); V.text5('30', 3, 13, 0x1e1e1e); smallPrint(V, 3, 4, 18, 1, 0x4a4a4a); }, { shared: true });
        K.face(pl, '+z', x - 0.05, y0 + h * 0.45, x + 0.05, y0 + h * 0.62, r * 0.951 + 0.003);
      };
      tr(0.42, 5.25, 0.74, 0.2); tr(-0.4, 5.5, 0.5, 0.155);
      // the black drop wires down to the tanks, the telephone cable's junction box and its tails
      const wire = flat(0x232323, 0.8);
      K.tube(wire, [[0.66, 6.9, 0], [0.6, 6.5, 0.05], [0.47, 6.08, 0.02]], 0.01, 4); K.tube(wire, [[-0.66, 6.9, 0], [-0.58, 6.4, 0.05], [-0.45, 6.1, 0.02]], 0.01, 4);
      K.box(flat(0x2c2c2e, 0.6), -0.09, 4.62, R0 * 0.75, 0.09, 4.92, R0 * 0.75 + 0.1, { bevel: 0.012 });
      K.tube(wire, [[0.06, 4.9, 0.2], [0.4, 4.86, 0.2], [0.8, 4.8, 0.22], [1.07, 4.78, 0.22]], 0.014, 4); K.tube(wire, [[-0.06, 4.7, 0.2], [-0.4, 4.6, 0.2], [-0.8, 4.56, 0.22], [-1.07, 4.55, 0.22]], 0.014, 4);
      K.tube(wire, [[0.1, 4.0, 0.16], [0.1, 4.62, 0.2]], 0.012, 4);
    },

    // ------------------------------------------------------------- street light (0.72 x 4.14 x 0.225): pole at x = -0.2, the head over the road at +x
    street_light: (K) => {
      const c = paint(0x9aa6a2, 0.25), px = -0.2;
      K.bx(stone(0xa39f96), px, 0, 0, 0.3, 0.07, 0.2, { bevel: 0.012 });
      dirtBox(K, 0xa39f96, px - 0.15, -0.1, px + 0.15, 0.1, 0, 0.035);
      K.cyl(c, px, 0.07, 0, 0.062, 0.5, 8, { bevel: 0.01 });
      K.cyl(c, px, 0.57, 0, 0.045, 3.2, 8, { cap0: false, cap1: false });
      K.tube(c, [[px, 3.76, 0], [px, 3.9, 0], [px + 0.07, 4.02, 0], [px + 0.2, 4.06, 0], [0.1, 4.06, 0]], 0.045, 8, { caps: false, a0: Math.PI / 8 + Math.PI / 2 });
      // the head: a pressed-steel hood, the lit diffuser under it
      K.box(paint(0x8a948f, 0.25), 0.04, 3.99, -0.105, 0.36, 4.09, 0.105, { bevel: 0.022 });
      K.box(flat(0x6f7874, 0.4), 0.1, 4.09, -0.05, 0.3, 4.115, 0.05, { bevel: 0.008 });
      K.glow(() => K.box(flat(0xfff3d6), 0.08, 3.955, -0.085, 0.33, 3.992, 0.085, { bevel: 0.012, skip: ['py'] }));
      // the access hatch, the lamp's number plate, a faded sticker
      K.box(paint(0x8e9a96, 0.2), px - 0.03, 0.3, 0.058, px + 0.03, 0.46, 0.066, { bevel: 0.003 });
      K.box(flat(0x4a5450), px + 0.012, 0.37, 0.066, px + 0.022, 0.39, 0.068);
      const pl = K.patch('no', 20, 28, (V) => { V.fill(0xf4f0e6); V.box(0, 0, 20, 9, 0x3a8a4a); V.text5('27', 10, 24, 0x2a2a2a, { align: 'center' }); V.frame(0, 0, 20, 28, 0xb8b4a8); }, { rough: 0.5 });
      K.face(pl, '+z', px - 0.025, 1.42, px + 0.025, 1.49, 0.045);
      K.box(flat(0xe8c648, 0.6), px - 0.02, 0.98, 0.0425, px + 0.022, 1.02, 0.0445);
    },

    // ------------------------------------------------------------- the round red post box (0.434 x 1.302 x 0.434), its slot towards +z
    post_box: (K) => {
      const red = enamel(0xcf2f28), n = 12, r = 0.172;
      K.bx(stone(0xa8a49c), 0, 0, 0, 0.4, 0.045, 0.37, { bevel: 0.01 });
      dirtBox(K, 0xa8a49c, -0.2, -0.185, 0.2, 0.185, 0, 0.03);
      K.cyl(red, 0, 0.045, 0, 0.186, 0.06, n, { bevel: 0.008 });
      K.cyl(red, 0, 0.105, 0, r, 0.82, n, { caps: false });
      K.cyl(red, 0, 0.925, 0, 0.186, 0.045, n, { bevel: 0.006 });
      // the cap: a brim, a low dome, the knob
      K.lathe(red, [0, 0.97, 0], [[0.18, 0], [0.208, 0.012], [0.208, 0.04], [0.2, 0.052], [0.185, 0.14], [0.145, 0.215], [0.08, 0.265], [0.046, 0.276], [0.046, 0.29], [0.026, 0.312], [0, 0.316]], n);
      // the face: the 〒 mark, POST, the collection times, the door with its keyhole (wrapped on the front facets)
      const V = K.patch('front', 112, 224, (V) => {
        const R = 0xcf2f28, dk = darken(R, 0.3), lt = lighten(R, 0.3), W = 0xf6f0e2;
        V.fill(R);
        kana(K, V, '〒', 56, 222, W, { size: 16, s: 2, align: 'center' });
        V.text5('POST', 56, 184, W, { align: 'center', s: 2 });
        // the slot's rain streak, the times plate
        V.box(54, 96, 58, 150, darken(R, 0.12));
        V.box(30, 100, 82, 146, W); V.frame(30, 100, 82, 146, 0x8a8478); V.box(30, 138, 82, 146, R); V.frame(30, 100, 82, 146, 0xb8b0a0);
        kana(K, V, '取集時刻', 56, 147, W, { size: 8, align: 'center' });
        for (let k = 0; k < 4; k++) { V.text5(`${9 + k * 3}:${k % 2 ? '30' : '00'}`, 36, 134 - k * 8, 0x3a3632); smallPrint(V, 62, 131 - k * 8, 16, 1, 0x8a8478, { seed: k }); }
        // the door: a seam with a lit lower lip, hinges on the left, the brass keyhole on the right
        V.frame(18, 8, 94, 88, dk); V.hline(19, 92, 7, lt); V.vline(94, 8, 87, lt);
        for (const j of [20, 72]) { V.box(14, j, 20, j + 8, dk); V.hline(14, 19, j + 8, lt); }
        V.disc(84, 48, 3.2, 0xd8b04a); V.box(83, 45, 85, 49, 0x2a2018); V.px(82, 50, 0xf6e09a);
      }, { rough: 0.3 });
      K.wrap(V, 0, 0.13, 0.9, 0, r, { n, arc: (Math.PI * 2 / n) * 3, lift: 0.0015 });
      // the slot under its hood
      K.box(red, -0.1, 0.868, 0.14, 0.1, 0.9, 0.215, { bevel: 0.007 });
      K.box(flat(0x160e0e, 0.9), -0.082, 0.838, 0.166, 0.082, 0.868, 0.176);
      K.box(flat(darken(0xcf2f28, 0.25), 0.4), -0.09, 0.83, 0.164, 0.09, 0.838, 0.18);
    },

    // ------------------------------------------------------------- concrete block wall (3 x 1.47 x 0.24)
    block_wall: (K, B) => {
      const c = 0xaeaaa0, bw = 0.375, bh = 0.19, rows = 7, t = 0.15, x0 = -1.5;
      K.box(stone(0x9c988e), x0, 0, -0.1, 1.5, 0.08, 0.1, { bevel: 0.01 });
      // courses of blocks (half a block's offset every other course), the joints left as shadow gaps
      for (let r = 0; r < rows; r++) {
        const y = 0.08 + r * bh, off = r % 2 ? bw / 2 : 0;
        for (let x = x0 - off; x < 1.5 - 0.01; x += bw) {
          const a = Math.max(x0, x) + 0.004, b = Math.min(1.5, x + bw) - 0.004, k = Math.round((x - x0) / bw) + r * 3;
          const open = r === 5 && k % 3 === 0 && b - a > 0.3; // a decorative openwork block here and there
          const tone = stone(mix(c, k % 5 === 0 ? 0x8f8b82 : k % 7 === 0 ? 0xc0bcb2 : c, 0.5), 0.1);
          if (!open) K.box(tone, a, y + 0.004, -t / 2, b, y + bh - 0.004, t / 2, { bevel: 0.006 });
          else {
            K.box(tone, a, y + 0.004, -t / 2, b, y + 0.04, t / 2, { bevel: 0.006 }); K.box(tone, a, y + bh - 0.04, -t / 2, b, y + bh - 0.004, t / 2, { bevel: 0.006 });
            for (const xx of [a, (a + b) / 2 - 0.018, b - 0.036]) K.box(tone, xx, y + 0.04, -t / 2, xx + 0.036, y + bh - 0.04, t / 2);
            K.tube(tone, [[a + 0.036, y + 0.04, 0], [(a + b) / 2 - 0.1, y + bh / 2, 0], [a + 0.036, y + bh - 0.04, 0]], 0.012, 4, { flat: [0.024, t * 0.8] });
            K.tube(tone, [[b - 0.036, y + 0.04, 0], [(a + b) / 2 + 0.1, y + bh / 2, 0], [b - 0.036, y + bh - 0.04, 0]], 0.012, 4, { flat: [0.024, t * 0.8] });
          }
        }
      }
      K.box(flat(0x77736b, 0.95), x0 + 0.01, 0.08, -t / 2 + 0.012, 1.49, 0.08 + rows * bh, t / 2 - 0.012); // the mortar behind the joints
      K.box(stone(0xa29e94), x0 - 0, 0.08 + rows * bh, -0.12, 1.5, B.y1, 0.12, { bevel: 0.015 }); // coping
      dirtBox(K, 0x9c988e, x0, -0.1, 1.5, 0.1, 0, 0.05, { sides: ['+z', '-z'] });
      // ivy creeping up one end, moss tufts at the foot
      const iv = leafy(K, 0x3f7f3e);
      for (const [x, y, s] of [[-1.3, 0.3, 0.16], [-1.18, 0.62, 0.13], [-1.36, 0.8, 0.11], [-1.05, 0.2, 0.1], [-1.25, 1.05, 0.08]]) blob(K, iv, x, y, t / 2 + 0.015, s, s * 0.9, 0.03, { seed: Math.round(x * 100), fine: true, jit: 0.2 });
      for (const x of [-0.4, 0.55, 1.2]) blob(K, leafy(K, 0x5c8a44), x, 0.09, 0.105, 0.06, 0.025, 0.02, { seed: x * 50 });
    },

    // ------------------------------------------------------------- trimmed hedge in its kerb (2 x 1 x 0.6)
    hedge: (K, B) => {
      K.box(stone(0xa6a298), -1.0, 0, -0.3, 1.0, 0.09, 0.3, { bevel: 0.012 });
      dirtBox(K, 0xa6a298, -1, -0.3, 1, 0.3, 0, 0.04);
      K.box(flat(SOIL, 0.98), -0.96, 0.088, -0.26, 0.96, 0.1, 0.26);
      // the clipped mass: the town's hedge of sprig cards (a clipped azalea in flower among the box), the bare stems at its foot
      leaves(K, (t, F) => F.hedge(t, 0, 0, 0, 0, 1, { seed: 3, mix: ['azalea', 0.3] }));
      for (const z of [-0.2, 0.2]) for (let k = 0; k < 6; k++) K.rod(wood(0x5a4632), [-0.8 + k * 0.32, 0.09, z * 0.6], [-0.8 + k * 0.32 + 0.02, 0.24, z * 0.5], 0.012, 5);
      void B;
    },

    bicycle_parking: stopSign,

    // ------------------------------------------------------------- a plant stand with pots and two morning glory poles (1.14 x 1.05 x 0.42)
    potted_row: (K) => {
      const w = 0x8a6a48;
      for (const [y, z0, z1] of [[0.2, 0.0, 0.2], [0.38, -0.2, 0.0]]) { plank(K, w, -0.56, y - 0.022, z0, 0.56, y, z1, { bevel: 0.004, v: y > 0.3 ? 1 : 0 }); }
      for (const x of [-0.52, 0.48]) { K.box(wood(darken(w, 0.15)), x, 0, -0.2, x + 0.04, 0.36, -0.16); K.box(wood(darken(w, 0.15)), x, 0, 0.16, x + 0.04, 0.18, 0.2); K.box(wood(darken(w, 0.15)), x, 0.14, -0.18, x + 0.04, 0.18, 0.18); }
      const P = [[-0.42, 0.2, 0.1, 0.07, 0.1, TERRA], [-0.2, 0.2, 0.1, 0.06, 0.085, 0x2f66b0], [0.02, 0.2, 0.1, 0.075, 0.1, TERRA], [0.26, 0.2, 0.1, 0.055, 0.08, 0xe8e4d8], [0.45, 0.2, 0.1, 0.06, 0.09, TERRA], [-0.3, 0.38, -0.1, 0.07, 0.11, 0x3a8a5a], [0.3, 0.38, -0.1, 0.07, 0.11, 0x3a8a5a]];
      P.forEach(([x, y, z, r, h, c], i) => {
        const ys = pot(K, x, y, z, r, h, { c: matte(c, 0.2) });
        if (i === 5 || i === 6) {
          // morning glories twining up three bamboo canes tied at the top
          for (let k = 0; k < 3; k++) { const a = k * 2.094 + i; K.rod(flat(0xb8a868, 0.8), [x + Math.cos(a) * r * 0.6, ys, z + Math.sin(a) * r * 0.6], [x + Math.cos(a) * 0.02, 1.04, z + Math.sin(a) * 0.02], 0.006, 4); }
          for (let k = 0; k < 9; k++) { const t = k / 9, a = t * 9 + i, rr = r * 0.75 * (1 - t * 0.7), yy = ys + 0.06 + t * 0.56; leaf(K, flat(k % 2 ? LEAF : LEAF2, 0.9), [x + Math.cos(a) * rr * 0.4, yy, z + Math.sin(a) * rr * 0.4], [x + Math.cos(a) * (rr + 0.05), yy + 0.02, z + Math.sin(a) * (rr + 0.05)], 0.05); }
          for (let k = 0; k < 4; k++) { const t = (k + 0.5) / 4, a = t * 7 + i * 2; flower(K, flat([0x5a6ad8, 0xe86aa8, 0x8a5ad8, 0x4a9ae8][(k + i) % 4], 0.8), [x + Math.cos(a) * 0.06, ys + 0.14 + t * 0.5, z + Math.abs(Math.sin(a)) * 0.07 + 0.01], 0.035, { dir: [Math.cos(a) * 0.5, 0.3, 1], eye: flat(0xffffff) }); }
        } else if (i % 3 === 0) bush(K, LEAF, x - r, ys, z - r, x + r, ys + r * 1.8, z + r, { n: 2, seed: i + 2 });
        else if (i % 3 === 1) { leafRing(K, flat(LEAF2, 0.9), x, ys, z, 7, r * 1.5, r * 0.6, { seed: i, rise: 0.9 }); flower(K, flat(0xe84a4a, 0.8), [x, ys + r * 1.3, z], r * 0.5, { dir: [0, 1, 0.3], eye: flat(0xf6d04a) }); }
        else for (let k = 0; k < 5; k++) blade(K, flat(k % 2 ? 0x3f7f4a : 0x5a9a5a, 0.9), [x + (k - 2) * 0.012, ys, z], [x + (k - 2) * 0.04, ys + r * 2.4 - Math.abs(k - 2) * 0.03, z + (k % 2 ? 0.02 : -0.02)], 0.028);
      });
    },

    // ------------------------------------------------------------- curve mirror (0.736 x 3.104 x 0.288)
    mirror_pole: (K) => {
      const or = paint(0xe8742a, 0.25), R = 0.33, cy = 2.72, n = 14;
      K.cyl(or, 0, 0, -0.04, 0.038, 3.06, 8);
      K.cyl(flat(0xb85a22, 0.6), 0, 0, -0.04, 0.06, 0.04, 8, { r1: 0.045 });
      dirtRing(K, 0xe8742a, 0, -0.04, 0.038, 0.04, 0.05, 8);
      // the mirror: an orange dish and hood, the convex glass a painted patch (sky above, the lane below)
      K.lathe(or, [0, cy, 0.02], [[0, -0.06], [R * 0.6, -0.05], [R + 0.03, 0], [R + 0.03, 0.03], [R, 0.03]], n, { axis: 'z' });
      const V = K.view('glass', { u: (p) => p[0], v: (p) => p[1], u0: -R, u1: R, v0: cy - R, v1: cy + R, ppm: 160, rough: 0.12 }, (V) => {
        const c = V.W / 2;
        for (let j = 0; j < V.H; j++) for (let i = 0; i < V.W; i++) {
          const dx = (i + 0.5 - c) / c, dy = (j + 0.5 - c) / c, d = Math.hypot(dx, dy);
          let col = dy > 0.12 ? 0xb9d2e2 : dy > -0.02 ? 0xdcd8c8 : dy > -0.4 ? 0x9a9488 : 0x7c7870; // sky, wall line, road
          if (dy > 0.12 && dy < 0.5 && Math.abs(dx + 0.3) < 0.25 - (dy - 0.12) * 0.3) col = 0x6a6258; // a roof
          if (dy <= -0.02 && Math.abs(dx - dy * 0.5 - 0.1) < 0.03) col = 0xe8e4d4; // the road's edge line
          if (d > 0.9) col = mix(col, 0x4a5258, 0.45);
          if (dx - dy < -0.62 && dx - dy > -0.74 && d < 0.86) col = 0xf4fafa; // a streak of light
          V.px(i, j, col);
        }
      });
      K.lathe(V, [0, cy, 0.05], [[R, 0], [R * 0.6, 0.012], [0, 0.018]], n, { axis: 'z' });
      K.lathe(or, [0, cy, 0.05], [[R, 0], [R + 0.03, 0]], n, { axis: 'z', flip: true });
      // the hood over the top half
      K.lathe(or, [0, cy, 0.03], [[R + 0.03, 0], [R + 0.045, 0.11]], n, { axis: 'z', a0: Math.PI * 0.08, arc: Math.PI * 0.84 });
      K.lathe(flat(0xb85a22, 0.5), [0, cy, 0.03], [[R + 0.03, 0], [R + 0.045, 0.11]], n, { axis: 'z', a0: Math.PI * 0.08, arc: Math.PI * 0.84, flip: true });
      K.box(or, -0.05, cy - 0.06, -0.085, 0.05, cy + 0.06, -0.02, { bevel: 0.008 });
      const pl = K.patch('chui', 44, 20, (V) => { framed(V, 0xf6f2e4, 0x2a52a8); kana(K, V, '注意', 22, 18, 0xc8242a, { size: 16, align: 'center' }); }, { rough: 0.5 });
      K.box(flat(0xf6f2e4, 0.5), -0.11, 2.16, -0.005, 0.11, 2.26, 0.003); K.face(pl, '+z', -0.11, 2.16, 0.11, 2.26, 0.0042);
      clamps(K, 0, [2.21], -0.04, 0.038);
    },

    // ------------------------------------------------------------- a cluster of pots, one knocked over (0.936 x 0.432 x 0.3)
    pot_cluster: (K) => {
      let ys = pot(K, -0.32, 0, -0.02, 0.12, 0.17, { saucer: true });
      const y1 = ys;
      leaves(K, (t, F) => F.shrub(t, -0.32, y1 - 0.01, -0.02, 0.13, 'small', { seed: 5 }));
      ys = pot(K, -0.06, 0, 0.03, 0.08, 0.12, { c: matte(0x2f5fa8, 0.25) });
      for (let k = 0; k < 6; k++) { const a = k * 1.05; blade(K, flat(k % 2 ? 0x6aa07a : 0x86b48a, 0.85), [-0.06 + Math.cos(a) * 0.02, ys, 0.03 + Math.sin(a) * 0.02], [-0.06 + Math.cos(a) * 0.07, ys + 0.2 - (k % 3) * 0.03, 0.03 + Math.sin(a) * 0.07], 0.035); }
      ys = pot(K, 0.13, 0, -0.04, 0.065, 0.09, { c: matte(0xe6e2d6, 0.2) });
      const y2 = ys;
      leaves(K, (t, F) => F.crown(t, 0.13, y2 + 0.05, -0.04, 0.075, 0.055, 0.075, { kind: 'azalea', flat: -0.4, card: 0.12, density: 2.4, seed: 9 }));
      ys = pot(K, 0.25, 0, 0.07, 0.06, 0.08, { c: matte(TERRA, 0.2) });
      K.rod(flat(0x7a5a3a, 0.9), [0.25, ys, 0.07], [0.26, ys + 0.2, 0.065], 0.006, 4);
      leaf(K, flat(LEAF, 0.9), [0.26, ys + 0.12, 0.065], [0.31, ys + 0.16, 0.08], 0.04); leaf(K, flat(LEAF2, 0.9), [0.26, ys + 0.17, 0.065], [0.21, ys + 0.21, 0.05], 0.04);
      // the one the cat knocked over: on its side, soil spilt
      K.at([0.38, 0.062, 0.0], () => pot(K, 0, 0, 0, 0.062, 0.1, { soil: false }), { rz: -Math.PI / 2 + 0.06, ry: 0.3 });
      K.ball(stone(SOIL, 0.1), 0.435, 0.0, 0.04, 0.05, 0.016, 0.038, 8, 3, { y0: 0 });
    },

    // ------------------------------------------------------------- styrofoam fish boxes as vegetable planters (0.924 x 0.994 x 0.322)
    styro_planter: (K) => {
      const st = matte(0xeeece6, 0.1);
      const box = (x0, x1) => {
        const ys = planter(K, st, x0, 0, -0.155, x1, 0.25, 0.155, { t: 0.025, bevel: 0.012 });
        K.box(flat(0xdad8d0, 0.9), x0 - 0.004, 0.17, -0.159, x1 + 0.004, 0.2, 0.159); // the lid's ledge
        dirtBox(K, 0xeeece6, x0, -0.155, x1, 0.155, 0, 0.05);
        return ys;
      };
      let ys = box(-0.46, -0.03);
      // tomatoes on three canes
      for (let k = 0; k < 3; k++) {
        const x = -0.38 + k * 0.13;
        K.rod(flat(0x4f8a46, 0.8), [x, ys, 0], [x, 0.99, 0], 0.007, 4);
        const y0 = ys;
        leaves(K, (t, F) => F.vine(t, x, y0 + 0.06, 0.94, 0.0, 11 + k * 5, { kind: 'leaf', card: 0.15 }));
        for (const [y, c] of [[0.42, 0xd8382a], [0.6, 0xe8842a], [0.75, 0x7aa83a]]) { const yy = y + k * 0.03; K.ball(plastic(c, 0.35), x + 0.02, yy, 0.035, 0.024, 0.021, 0.024, 8, 4); for (let s = 0; s < 5; s++) { const a = s * 1.2566; K.tri(flat(0x3a6a2e, 0.8), [x + 0.02, yy + 0.022, 0.035], [x + 0.02 + Math.cos(a - 0.25) * 0.004, yy + 0.021, 0.035 + Math.sin(a - 0.25) * 0.004], [x + 0.02 + Math.cos(a) * 0.014, yy + 0.017, 0.035 + Math.sin(a) * 0.014], [0, 1, 0]); } }
      }
      ys = box(0.03, 0.46);
      // a bamboo lattice with a bitter melon vine
      const cane = flat(0xc8b878, 0.8);
      for (let k = 0; k < 4; k++) K.rod(cane, [0.08 + k * 0.11, ys, -0.06], [0.08 + k * 0.11, 0.9, -0.06], 0.006, 4);
      for (let k = 0; k < 5; k++) K.rod(cane, [0.06, ys + 0.1 + k * 0.14, -0.06], [0.43, ys + 0.1 + k * 0.14, -0.06], 0.005, 4);
      const yl = ys;
      leaves(K, (t, F) => { for (let k = 0; k < 4; k++) F.vine(t, 0.08 + k * 0.11, yl + 0.04, 0.62 + (k % 2) * 0.16, -0.06, 21 + k * 3, { card: 0.13 }); });
      K.tube(flat(0x5a9a4a, 0.7), [[0.3, 0.62, -0.04], [0.3, 0.56, -0.03], [0.3, 0.5, -0.04]], 0.014, 5, { radii: [0.006, 0.016, 0.005] });
    },

    // ------------------------------------------------------------- fire extinguisher box on a post (0.375 x 1.38 x 0.24)
    fire_ext_box: (K) => {
      const red = paint(0xc82a26, 0.3);
      K.cyl(metal(0x9ea4a6), 0, 0, -0.02, 0.028, 0.84, 8); K.cyl(flat(0x7e8486, 0.6), 0, 0, -0.02, 0.07, 0.02, 8, { r1: 0.04 });
      dirtRing(K, 0x9ea4a6, 0, -0.02, 0.028, 0.02, 0.05, 8);
      K.box(red, -0.185, 0.84, -0.11, 0.185, 1.33, 0.1, { bevel: 0.012 });
      K.box(red, -0.19, 1.33, -0.115, 0.19, 1.36, 0.115, { bevel: 0.006 }); // the lid's rain lip (its slope)
      K.box(red, -0.175, 1.36, -0.1, 0.175, 1.38, 0.06, { bevel: 0.008 });
      const V = K.patch('door', 88, 116, (V) => {
        const R = 0xc82a26, dk = darken(R, 0.3), lt = lighten(R, 0.3), W = 0xf6f0e2;
        V.fill(R); V.frame(2, 2, 86, 114, dk); V.hline(3, 85, 1, lt);
        kana(K, V, '消火器', 44, 110, W, { size: 16, align: 'center' });
        V.box(14, 34, 74, 86, 0x3a2a2a); V.frame(14, 34, 74, 86, dk); // the window: the extinguisher behind the glass
        V.box(34, 38, 54, 76, 0xd83a30); V.box(34, 38, 38, 76, 0xa82a22); V.box(38, 54, 52, 64, 0xf2e8d0); V.box(40, 76, 48, 82, 0x2a2a2a); V.box(48, 78, 58, 80, 0x2a2a2a);
        V.line(18, 82, 30, 70, 0x9ab0b8); V.line(20, 84, 36, 68, 0x6a7a80);
        V.box(76, 54, 82, 66, 0xc8ccd0); V.box(77, 58, 81, 60, 0x4a4a4a); // the latch
        smallPrint(V, 12, 26, 64, 3, 0xf0c8c0, { seed: 8 });
      }, { rough: 0.3 });
      K.face(V, '+z', -0.165, 0.86, 0.165, 1.31, 0.1012);
      clamps(K, 0, [0.9, 1.2], -0.115, 0.028);
    },
  },
};
