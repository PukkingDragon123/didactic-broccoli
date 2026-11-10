// Things you buy and place in the shop (ids from src/data/props/build.js). Several are assembled from parts by
// src/build/models.js and src/money/atm.js, so their origins and the spots the code hangs things on are kept exactly:
// the ATM's screen (0.44 x 0.28 at y 1.06, z 0.2), its console ledge and card slot; the gumball machine's globe at
// y 0.965 and its fills inside the globe; the wall clock's dial under the hands; the fan's head pivot (stand top at
// 0.55, 2 cm back) and the blades' hub (0.15 up the head, 2 cm forward).
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, flower, dirtBox } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot, clockFace, louvres } from '../kit/prints.js';

const GUM = [0xe84a6a, 0xf2c21c, 0x3a7ad8, 0x3a9a4a, 0xe8842a, 0x8a5bd6, 0xf4a0c0, 0x5ac8d8];
/** Gumballs filling the globe up to height y1 (the globe is centred on the origin, 0.145 inside). */
function gumFill(K, y1) {
  const R = 0.14, y0 = -0.132;
  K.ball(flat(0xd8a8b8, 0.6), 0, 0, 0, R * 0.96, R * 0.96, R * 0.96, 8, 4, { y0: -0.95, y1: Math.min(0.9, (y1 - 0.02) / R) });
  let k = 0;
  for (let y = y0 + 0.014; y < y1; y += 0.024) { const rr = Math.sqrt(Math.max(0.0004, R * R - y * y)) - 0.012, n = Math.max(3, Math.round(rr * 44)); for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832 + y * 40; K.ball(plastic(GUM[k % 8], 0.3), Math.cos(a) * rr, y, Math.sin(a) * rr, 0.0135, 0.0135, 0.0135, 5, 2); k++; } }
  const rt = Math.sqrt(Math.max(0.0004, R * R - y1 * y1)) - 0.014;
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = rt * Math.sqrt((i + 0.5) / 9); K.ball(plastic(GUM[(i + 3) % 8], 0.3), Math.cos(a) * r, y1 - 0.004, Math.sin(a) * r, 0.0135, 0.0135, 0.0135, 5, 2); }
}

export default {
  family: 'shop',
  models: {
    // ------------------------------------------------------------- the Shinkin ATM kiosk (0.76 x 1.56 x 0.66), origin at the cabinet's foot
    atm_kiosk: (K) => {
      const c = 0xe2ded2, cream = enamel(c), grey = paint(0x8a9096, 0.2), green = 0x2f8a5a, dark = flat(0x2a2c30, 0.5);
      K.box(flat(0x3a3c40, 0.6), -0.38, 0, -0.28, 0.38, 0.06, 0.24, { bevel: 0.008 });
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: -0.38, u1: 0.38, v0: 0.06, v1: 1.4, ppm: 256, rough: 0.5 }, (V) => {
        const I = (x) => V.i(x), J = (y) => V.j(y), g = 0x8a9096, dk = 0x2a2c30;
        V.fill(c); V.box(0, J(1.24), V.W, J(1.34), green);
        V.box(I(-0.28), J(0.88), I(0.28), J(1.24), g); V.box(I(-0.23), J(0.915), I(0.23), J(1.205), dk); // the fascia round the screen
        V.box(I(-0.24), J(0.42), I(0.24), J(0.64), g); V.frame(I(-0.2), J(0.46), I(0.2), J(0.6), dk); V.text5('COIN', I(0), J(0.55), dk, { align: 'center' }); // the (blind) coin door
        V.box(I(-0.24), J(0.24), I(0.24), J(0.38), 0xf2efe6); smallPrint(V, I(-0.22), J(0.36), 70, 5, 0x6a6e74, { seed: 5 }); V.box(I(0.08), J(0.26), I(0.2), J(0.36), 0xd8322a); kana(K, V, 'ご案内', I(0.14), J(0.345), 0xf2efe6, { size: 8, align: 'center' });
        kana(K, V, 'しんきん', I(0), J(1.335), 0xf2efe6, { size: 16, align: 'center' });
      });
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : K.uv(cream))(p, n), (G) => G.box(-0.38, 0.06, -0.28, 0.38, 1.4, 0.2, { bevel: 0.01 }));
      for (const s of [-1, 1]) { K.box(paint(green, 0.2), s * 0.38 - (s > 0 ? 0.004 : 0), 0.06, -0.28, s * 0.38 + (s > 0 ? 0 : 0.004), 1.4, -0.2); K.box(grey, s * 0.38 - (s > 0 ? 0.03 : 0), 0.8, 0.2, s * 0.38 + (s > 0 ? 0 : 0.03), 1.3, 0.3, { bevel: 0.008 }); } // the side bands, the privacy wings
      K.box(grey, -0.38, 1.28, 0.2, 0.38, 1.31, 0.26, { bevel: 0.006 }); // the brow over the screen
      // the console ledge with the keypad well, the card slot block and its green light, the cash and receipt slots
      K.box(cream, -0.35, 0.66, 0.2, 0.33, 0.76, 0.38, { bevel: 0.012 });
      K.box(grey, -0.32, 0.76, 0.22, 0.08, 0.763, 0.37); K.box(grey, 0.12, 0.76, 0.22, 0.3, 0.84, 0.32, { bevel: 0.008 });
      K.box(dark, 0.14, 0.785, 0.32, 0.28, 0.797, 0.3212); K.glow(() => K.box(flat(0x3ac86a), 0.14, 0.805, 0.32, 0.28, 0.815, 0.3212));
      K.box(dark, -0.24, 0.69, 0.38, 0.06, 0.72, 0.3812); K.box(dark, 0.14, 0.7, 0.38, 0.28, 0.71, 0.3812);
      // the lit sign on top: ATM, the credit union's leaf
      K.box(paint(0x1e3e78, 0.2), -0.38, 1.4, -0.24, 0.38, 1.56, 0.22, { bevel: 0.01 });
      const S = K.patch('atm', 152, 30, (V) => { V.fill(0x1e3e78); V.box(0, 0, 152, 2, 0x2a5aa8); V.box(0, 28, 152, 30, 0x2a5aa8); V.text5('ATM', 76, 25, 0xe8f0ff, { align: 'center', s: 3 }); V.polyPx([[14, 8], [24, 22], [34, 8], [24, 12]], 0x58c06c); V.vline(24, 4, 12, 0x58c06c); kana(K, V, '現金', 120, 23, 0xe8f0ff, { size: 16 }); }, { bright: true });
      K.glow(() => K.face(S, '+z', -0.36, 1.415, 0.36, 1.545, 0.2212));
      const bk = K.patch('back', 64, 96, (V) => { V.fill(c); louvres(V, 8, 20, 56, 60, c, 5); }, { rough: 0.5 });
      K.face(bk, '-z', -0.24, 0.16, 0.24, 0.9, -0.2812);
      dirtBox(K, 0x3a3c40, -0.38, -0.28, 0.38, 0.24, 0, 0.03);
    },

    // ------------------------------------------------------------- a pink piggy bank with painted flowers (0.136 x 0.144 x 0.192): snout to +z
    piggy_bank: (K) => {
      const pk = ceramic(0xf2a0b4), dk = ceramic(0xe07a94);
      K.ball(pk, 0, 0.078, -0.005, 0.062, 0.058, 0.08, 9, 5);
      K.cyl(dk, 0, 0.066, 0.068, 0.024, 0.022, 8, { axis: 'z' }); for (const s of [-1, 1]) K.box(flat(0xb85a74, 0.5), s * 0.009 - 0.004, 0.061, 0.09, s * 0.009 + 0.004, 0.073, 0.0908);
      K.sym((s) => { K.prism(dk, [[s * 0.022, 0.118], [s * 0.052, 0.112], [s * 0.044, 0.144]], { plane: 'xy', a: 0.02, b: 0.036 }); K.box(flat(0x26221e, 0.3), s * 0.03 - 0.005, 0.092, 0.062, s * 0.03 + 0.005, 0.102, 0.0655); for (const z of [0.04, -0.045]) K.cyl(dk, s * 0.035, 0, z, 0.016, 0.03, 6); });
      K.box(flat(0x6a3a4a, 0.6), -0.02, 0.134, -0.012, 0.02, 0.137, -0.004); // the slot
      K.tube(dk, [[0, 0.09, -0.082], [0.01, 0.105, -0.094], [0, 0.115, -0.088], [-0.006, 0.105, -0.09]], 0.004, 4);
      for (const [x, y, z, c] of [[0.058, 0.09, 0.0, 0xf2efe6], [0.054, 0.07, -0.04, 0xf2c21c], [-0.058, 0.085, -0.02, 0xf2efe6], [-0.054, 0.068, 0.03, 0x8ac8e8]]) flower(K, flat(c, 0.5), [x, y, z], 0.012, { dir: [Math.sign(x), 0.2, 0], eye: flat(0xd8322a) });
    },

    // ------------------------------------------------------------- the tip jar (0.12 x 0.136 x 0.12): a glass jar, a hand-written label
    tip_jar: (K) => {
      K.glass(() => K.lathe(K.tint(0xd4e8ec, 58), [0.004, 0, 0.004], [[0, 0], [0.05, 0], [0.056, 0.012], [0.056, 0.1], [0.046, 0.12], [0.046, 0.134]], 10));
      const lb = K.patch('tips', 48, 22, (V) => { V.fill(0xf2ead6); V.text5('TIPS', 24, 18, 0xc8302a, { align: 'center', s: 2 }); V.hline(6, 42, 2, 0xc8302a); }, { rough: 0.9 });
      K.wrap(lb, 0.004, 0.035, 0.085, 0.004, 0.056, { n: 10, arc: 1.9 });
      for (const [x, z, c] of [[0.0, 0.0, 0xc8a84a], [0.02, 0.012, 0xb4b8bc], [-0.014, 0.016, 0xb87a4a]]) K.cyl(metal(c, 0.3), 0.004 + x, 0.003, 0.004 + z, 0.012, 0.003, 7);
    },

    // ------------------------------------------------------------- the gumball machine: its stand and head (0.3 x 0.816 x 0.312), the globe, the fills
    gumball_base: (K) => {
      const red = paint(0xc8302a, 0.25);
      K.lathe(red, [0, 0, 0], [[0, 0], [0.13, 0], [0.14, 0.02], [0.09, 0.05], [0.03, 0.065]], 12);
      K.cyl(chrome(0xb4babf), 0, 0.06, 0, 0.022, 0.53, 8);
      K.box(red, -0.11, 0.59, -0.11, 0.11, 0.8, 0.11, { bevel: 0.014 });
      const pn = K.patch('panel', 64, 56, (V) => { V.fill(0xc8302a); V.box(6, 30, 58, 52, 0xf2efe6); V.text5('GUM', 32, 48, 0xc8302a, { align: 'center', s: 2 }); V.text5('10', 44, 16, 0xf2efe6, { align: 'center', s: 2 }); V.disc(18, 14, 8, 0xb4b8bc); V.box(16, 8, 20, 20, 0x26221e); V.box(40, 2, 56, 5, 0x26221e); }, { rough: 0.55 });
      K.face(pn, '+z', -0.09, 0.6, 0.09, 0.79, 0.1108);
      K.cyl(chrome(0xb4babf), 0, 0.714, 0.11, 0.03, 0.045, 8, { axis: 'z' }); // the hub the handle turns on
      K.box(flat(0x26221e, 0.6), -0.05, 0.6, 0.11, 0.05, 0.64, 0.135, { bevel: 0.006 }); // the chute's flap
      K.lathe(red, [0, 0.8, 0], [[0.11, 0], [0.09, 0.012], [0, 0.012]], 12);
    },
    gumball_globe: (K) => {
      K.glass(() => K.ball(K.tint(0xd8ecf0, 50), 0, 0, 0, 0.154, 0.154, 0.154, 12, 6, { y0: -0.92, y1: 0.9 }));
      K.lathe(paint(0xc8302a, 0.25), [0, 0.138, 0], [[0.07, 0], [0.072, 0.02], [0.03, 0.04], [0.03, 0.055], [0.012, 0.066], [0, 0.066]], 10);
      K.lathe(paint(0xc8302a, 0.25), [0, -0.154, 0], [[0, 0], [0.07, 0], [0.066, 0.016]], 10);
    },
    gumball_fill_1: (K) => gumFill(K, -0.06), gumball_fill_2: (K) => gumFill(K, 0.012), gumball_fill_3: (K) => gumFill(K, 0.06), gumball_fill_4: (K) => gumFill(K, 0.118),
    gumball: (K) => K.ball(plastic(0xe84a6a, 0.3), 0, 0.014, 0, 0.014, 0.014, 0.014, 8, 4),

    // ------------------------------------------------------------- the robot vacuum (0.342 across) and its dock
    robot_vacuum: (K) => {
      const R = 0.168;
      K.lathe(plastic(0xe6e2d8, 0.12), [0, 0.012, 0], [[R - 0.012, 0], [R, 0.012], [R, 0.05]], 16); K.lathe(plastic(0x34363c, 0.15), [0, 0.062, 0], [[R, 0], [R - 0.012, 0.018], [0, 0.02]], 16);
      K.lathe(flat(0x26262a, 0.8), [0, 0.012, 0], [[0, 0], [R - 0.012, 0]], 16);
      K.cyl(plastic(0x26262a, 0.2), 0, 0.082, 0, 0.045, 0.018, 12, { bevel: 0.004 }); K.glow(() => K.cyl(flat(0x5ac8ff), 0, 0.1, 0, 0.012, 0.001, 8));
      K.box(plastic(0x4a4c52, 0.2), -0.03, 0.08, 0.09, 0.03, 0.084, 0.13, { bevel: 0.002 }); K.glow(() => K.box(flat(0x5ae87a), -0.004, 0.084, 0.106, 0.004, 0.0846, 0.114));
      K.lathe(rubber(0x26262a), [0, 0.022, 0], [[R, 0], [R + 0.004, 0.006], [R + 0.004, 0.028], [R, 0.034]], 16, { arc: Math.PI, a0: 0 }); // the front bumper
    },
    vacuum_dock: (K) => {
      const w = plastic(0xe6e2d8, 0.12);
      K.box(w, -0.132, 0, -0.036, 0.132, 0.114, 0.0, { bevel: 0.008 }); K.box(w, -0.132, 0, 0, 0.132, 0.012, 0.066, { bevel: 0.004 });
      K.glow(() => K.box(flat(0x5ac8ff), -0.012, 0.07, 0, 0.012, 0.086, 0.001));
      for (const x of [-0.06, 0.06]) K.box(metal(0xc8a44a, 0.3), x - 0.012, 0.012, 0.03, x + 0.012, 0.016, 0.05);
    },

    // ------------------------------------------------------------- the wall clock's case and dial (0.31 across); the hands are separate
    wall_clock: (K) => {
      const R = 0.15;
      K.lathe(wood(0x6a4028), [0.005, 0.005, -0.03], [[0, 0], [R, 0], [R, 0.04], [R - 0.012, 0.05], [R - 0.022, 0.05]], 16, { axis: 'z' });
      const F = K.patch('dial', 96, 96, (V) => { clockFace(V, 0, 0, { bg: 0xf2ead6, rim: 0x6a4028, ink: 0x26221e }); const c = 48; V.disc(c, c, 12, 0xf2ead6); for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.2832; if (k % 3 === 0) V.box(Math.round(c + Math.sin(a) * 33) - 2, Math.round(c + Math.cos(a) * 33) - 2, Math.round(c + Math.sin(a) * 33) + 2, Math.round(c + Math.cos(a) * 33) + 2, 0x26221e); } V.disc(c, c, 2, 0x26221e); V.text5('SEIKA', c, c - 14, 0x8a7a5a, { align: 'center' }); }, { rough: 0.5 });
      K.lathe(F ? flat(0xf2ead6, 0.5) : 0, [0.005, 0.005, 0.0], [[R - 0.022, 0.011], [0, 0.011]], 16, { axis: 'z' });
      K.face(F, '+z', 0.005 - (R - 0.03), 0.005 - (R - 0.03), 0.005 + R - 0.03, 0.005 + R - 0.03, 0.0116);
    },

    // ------------------------------------------------------------- the electric fan in three parts: stand, head (pivot at its neck), blades (hub at the origin)
    fan_stand: (K) => {
      const body = plastic(0xe6e0d0, 0.12);
      K.lathe(body, [0, 0, 0], [[0, 0], [0.145, 0], [0.15, 0.02], [0.1, 0.05], [0.035, 0.062]], 12);
      for (const [x, c] of [[-0.05, 0x5ab4e8], [0, 0xf2c21c], [0.05, 0x5ae87a], [0.1, 0xe84a3a]]) K.box(plastic(c), x - 0.04, 0.036, 0.08, x - 0.012, 0.05, 0.11, { bevel: 0.004 });
      K.cyl(chrome(0xb4babf), 0, 0.06, -0.02, 0.016, 0.43, 8); K.cyl(body, 0, 0.47, -0.02, 0.026, 0.08, 8, { bevel: 0.006 });
    },
    fan_head: (K) => {
      const body = plastic(0xe6e0d0, 0.12), cy = 0.15, R = 0.165;
      K.cyl(body, 0, -0.02, 0, 0.022, 0.06, 8);
      K.lathe(body, [0, cy, -0.12], [[0, 0], [0.045, 0.01], [0.062, 0.05], [0.058, 0.12], [0.03, 0.135]], 10, { axis: 'z' }); // the motor housing
      // the cage: a ring, a rear and a front guard of spokes and hoops (cut-out), the badge
      const gd = K.patch('guard', 64, 64, (V) => {
        V.box(0, 0, 64, 64, 0xc8ccd0, 0);
        for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const dx = i - 31.5, dy = j - 31.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx); if (d < 32 && (d > 30 || (d > 8 && Math.abs((((a * 30) / 6.2832) % 1 + 1) % 1 - 0.5) > 0.5 - 3.4 / Math.max(10, d)) || Math.abs(d - 21) < 0.7)) V.px(i, j, d > 30 ? 0x9aa0a6 : 0xc8ccd0, 255); }
        V.disc(32, 32, 7, 0xe6e0d0); V.disc(32, 32, 4, 0x5ab4e8);
      }, { shared: true, rough: 0.4 });
      K.glass(() => { K.face(gd, '+z', -R, cy - R, R, cy + R, 0.095, { both: true }); K.face(gd, '+z', -R, cy - R, R, cy + R, 0.012, { both: true }); });
      K.lathe(chrome(0xb4babf), [0, cy, 0.012], [[R, 0], [R + 0.004, 0.04], [R, 0.083]], 16, { axis: 'z' });
    },
    fan_blades: (K) => {
      for (let k = 0; k < 4; k++) K.at([0, 0, 0.042], () => K.prism(plastic(0x8fd0e4, 0.15), [[0.02, -0.03], [0.12, -0.055], [0.142, 0.01], [0.1, 0.06], [0.02, 0.03]], { plane: 'xy', a: -0.004, b: 0.004 }), { rz: k * 1.5708 + 0.3, rx: 0.28, order: 'ZXY' });
      K.cyl(plastic(0xe6e0d0, 0.12), 0, 0, 0.022, 0.03, 0.04, 8, { axis: 'z' }); K.cyl(plastic(0x5ab4e8), 0, 0, 0.062, 0.016, 0.006, 8, { axis: 'z' });
    },

    // ------------------------------------------------------------- the cat's donut cushion (0.45 across)
    cat_cushion: (K) => {
      K.torus(fabric(0xe08a3a), 0, 0.06, 0, 0.165, 0.058, 14, 6);
      K.lathe(fabric(0xf2c88a), [0, 0.03, 0], [[0.12, 0], [0, 0.004]], 14);
      for (let k = 0; k < 7; k++) { const a = k * 0.8976; K.box(flat(0xc8742a, 0.97), Math.cos(a) * 0.165 - 0.004, 0.117, Math.sin(a) * 0.165 - 0.004, Math.cos(a) * 0.165 + 0.004, 0.1185, Math.sin(a) * 0.165 + 0.004); }
    },
  },
};
