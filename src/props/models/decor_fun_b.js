// The museum's "fun" decor (ids from src/data/props/decor_fun.js), part two: the ocean set (an aquarium on its cabinet,
// a ship's anchor in a coil of rope, a giant scallop with its pearl, a beach parasol), the home set (a mustard retro
// sofa, a cosy wingback, a tripod floor lamp, a cat tower with its sleeping cat, a collector's bookcase) and the spooky
// set (a jack-o'-lantern pile, a ghost lamp, the plate-counting well). Facing +z, bottom-centre origin.
import { mat, paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { tones, leaf, flower, plank, blade, bucket } from '../kit/shapes.js';
import { kana, framed } from '../kit/prints.js';
import { catHead } from '../kit/animals.js';
import { leaves } from '../kit/foliage.js';
import { TAU, candy, stick, surf, disc, striped, sphereDots } from './decor_fun.js';

/** A fish facing +x at the origin: a squashed body of revolution, a forked tail, a dorsal fin, two eyes. */
function fish(K, c, s = 1, o = {}) {
  K.lathe(matte(c, 0.2), [-0.03 * s, 0, 0], [[0, 0], [0.008 * s, 0.004 * s], [0.014 * s, 0.02 * s], [0.012 * s, 0.045 * s], [0.006 * s, 0.056 * s], [0, 0.06 * s]], 6, { axis: 'x', sz: 0.45 });
  K.sheet(flat(o.fin ?? c, 0.8), [-0.03 * s, 0, 0], [-0.05 * s, 0.014 * s, 0], [-0.045 * s, 0, 0], [-0.05 * s, -0.014 * s, 0]);
  K.tri(flat(o.fin ?? c, 0.8), [-0.005 * s, 0.012 * s, 0], [0.012 * s, 0.012 * s, 0], [-0.012 * s, 0.022 * s, 0], [0, 0, 1]); K.tri(flat(o.fin ?? c, 0.8), [-0.005 * s, 0.012 * s, 0], [0.012 * s, 0.012 * s, 0], [-0.012 * s, 0.022 * s, 0], [0, 0, -1]);
  if (o.band) K.lathe(flat(o.band, 0.6), [-0.005 * s, 0, 0], [[0.0135 * s, 0], [0.0135 * s, 0.012 * s]], 6, { axis: 'x', sz: 0.47 });
  K.sym((d) => K.ball(flat(0x1a1a1a, 0.3), 0.018 * s, 0.003 * s, d * 0.005 * s, 0.003 * s, 0.003 * s, 0.002 * s, 5, 2));
}
/** A carpeted platform / a cushion: a soft box. */
const soft = (K, c, x0, y0, z0, x1, y1, z1, b = 0.03) => K.box(fabric(c), x0, y0, z0, x1, y1, z1, { bevel: b });
/** A pumpkin: ribbed (lobes), squat, a curved stem. Returns the top. */
function pumpkin(K, x, y, z, R, H, o = {}) {
  const L = o.lobes ?? 10, c = tones(K, o.c ?? 0xe0782a, { light: lighten(o.c ?? 0xe0782a, 0.18), dark: darken(o.c ?? 0xe0782a, 0.22), hi: 0.55, lo: -0.2, rough: 0.6 });
  const P = (u, v) => { const th = u * TAU, ph = -Math.PI / 2 + v * Math.PI, rib = 1 - 0.08 * (1 - Math.abs(Math.cos((L * th) / 2))) ** 1.5, k = Math.pow(Math.max(0, Math.cos(ph)), 0.75) * rib; return [x + Math.cos(th) * R * k, y + H / 2 + Math.sin(ph) * H / 2 - (Math.abs(ph) > 1.2 ? (Math.abs(ph) - 1.2) * 0.1 * H * Math.sign(ph) : 0), z + Math.sin(th) * R * k]; };
  surf(K, c, L * 4, 10, P, (u, v) => { const p = P(u, v); return [p[0] - x, p[1] - y - H / 2, p[2] - z]; });
  K.tube(wood(0x5a6a2a), [[x, y + H - 0.02, z], [x + 0.005, y + H + 0.03 * (R / 0.2), z], [x + 0.025 * (R / 0.2), y + H + 0.05 * (R / 0.2), z + 0.01]], 0.016 * (R / 0.2), 6, { radii: [0.02 * (R / 0.2), 0.015 * (R / 0.2), 0.012 * (R / 0.2)] });
  return { P };
}

export default {
  family: 'fun',
  models: {
    // ------------------------------------------------------------- an aquarium on a wooden cabinet, a torii in the gravel (1.03 x 1.15 x 0.53)
    aquarium: (K, B) => {
      const WD = 0x8a5a36, X = B.x1 - 0.01, Z = B.z1 - 0.01, yt = 0.56, top = B.y1;
      plank(K, WD, -X, 0.05, -Z, X, yt - 0.02, Z, { axis: 'x', bevel: 0.008 });
      plank(K, darken(WD, 0.15), -X - 0.008, yt - 0.025, -Z - 0.008, X + 0.008, yt, Z + 0.008, { bevel: 0.006 });
      K.box(wood(darken(WD, 0.3)), -X + 0.02, 0, -Z + 0.02, X - 0.02, 0.05, Z - 0.03);
      K.sym((s) => { plank(K, lighten(WD, 0.08), s > 0 ? 0.005 : -X + 0.03, 0.08, Z, s > 0 ? X - 0.03 : -0.005, yt - 0.05, Z + 0.012, { axis: 'y', bevel: 0.006, v: s > 0 ? 1 : 2 }); K.cyl(metal(0xc8a44a, 0.3), s * 0.04, 0.33, Z + 0.012, 0.012, 0.018, 8, { axis: 'z' }); });
      // the tank: black rims top and bottom, glass all round, the lit hood
      const y0 = yt, y1 = top - 0.06, rim = paint(0x24242a, 0.15);
      K.box(rim, -X + 0.01, y0, -Z + 0.02, X - 0.01, y0 + 0.03, Z - 0.02);
      K.box(rim, -X + 0.01, y1 - 0.02, -Z + 0.02, X - 0.01, y1, Z - 0.02);
      K.box(paint(0x2a2a30, 0.15), -X + 0.005, y1, -Z + 0.015, X - 0.005, top, Z - 0.015, { bevel: 0.01 });
      K.glow(() => K.box(flat(0x8a9aa0, 0.5), -X + 0.05, y1 - 0.004, -Z + 0.06, X - 0.05, y1, Z - 0.06));
      K.box(flat(0x2a3a4a, 0.8), -X + 0.025, y0 + 0.03, -Z + 0.025, X - 0.025, y1 - 0.02, -Z + 0.03); // the backing sheet
      // gravel, stones, plants, a little torii, the airstone
      const yg = y0 + 0.065;
      K.box(stone(0xc8b090, 0.1), -X + 0.025, y0 + 0.03, -Z + 0.03, X - 0.025, yg, Z - 0.025);
      for (const [x, z, r, c] of [[-0.3, -0.05, 0.06, 0x7a7a72], [-0.22, 0.02, 0.04, 0x8a867a], [0.32, -0.1, 0.07, 0x6a6a64]]) K.ball(stone(c, 0.12), x, yg, z, r, r * 0.7, r * 0.8, 8, 4, { y0: 0 });
      for (let k = 0; k < 14; k++) { const x = -0.42 + ((k * 0.37) % 1) * 0.84, z = -0.17 + ((k * 0.61) % 1) * 0.12, h = 0.18 + ((k * 0.29) % 1) * 0.22; blade(K, flat(k % 2 ? 0x4a8a3a : 0x5a9a44, 0.8), [x, yg, z], [x + 0.03 * Math.sin(k), yg + h, z + 0.02], 0.022); }
      for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; leaf(K, flat(0x3a7a34, 0.8), [0.12, yg, -0.08], [0.12 + Math.cos(a) * 0.08, yg + 0.12 + (k % 2) * 0.04, -0.08 + Math.sin(a) * 0.05], 0.035); }
      K.at([-0.1, yg, 0.05], () => { const v = enamel(0xc8402a); K.sym((s) => K.cyl(v, s * 0.04, 0, 0, 0.007, 0.1, 8)); K.box(v, -0.06, 0.07, -0.006, 0.06, 0.08, 0.006); K.box(paint(0x24221e), -0.07, 0.09, -0.008, 0.07, 0.102, 0.008); }, { ry: 0.3 });
      K.cyl(stone(0x6a8aa0), 0.25, yg, 0.08, 0.015, 0.012, 8);
      K.glass(() => { for (const [dy, r] of [[0.06, 0.006], [0.13, 0.008], [0.21, 0.007], [0.3, 0.009]]) K.ball(K.tint(0xe8f8ff, 150, 0.05), 0.25 + Math.sin(dy * 40) * 0.008, yg + dy, 0.08, r, r, r, 6, 3); });
      // the fish
      for (const [x, y, z, ry, c, o, s] of [[-0.2, 0.82, 0.05, 0.3, 0xe8782a, { fin: 0xf2a85a }, 1.3], [0.15, 0.9, -0.02, 2.8, 0xe86a3a, { fin: 0xf2efe6 }, 1.1], [0.05, 0.72, 0.1, -0.2, 0x3a7ad8, { band: 0xd8402a }, 0.7], [-0.05, 0.75, 0.06, -0.3, 0x3a7ad8, { band: 0xd8402a }, 0.7], [0.3, 0.8, 0.12, 3.4, 0x2a2a2e, { fin: 0x3a3a3e }, 1.2]]) K.at([x, y, z], () => fish(K, c, s, o), { ry });
      // the water (tinted) and the panes
      K.glass(() => {
        K.box(K.tint(0x8ac8e0, 46, 0.1), -X + 0.03, yg, -Z + 0.03, X - 0.03, y1 - 0.045, Z - 0.03, { bevel: 0 });
        K.box(K.tint(0xd8ecf0, 40, 0.06), -X + 0.012, y0 + 0.03, Z - 0.03, X - 0.012, y1 - 0.02, Z - 0.022, { bevel: 0 });
        K.sym((s) => K.box(K.tint(0xd8ecf0, 40, 0.06), s > 0 ? X - 0.022 : -X + 0.014, y0 + 0.03, -Z + 0.03, s > 0 ? X - 0.014 : -X + 0.022, y1 - 0.02, Z - 0.03, { bevel: 0 }));
      });
      K.box(paint(0x3a3a40), X - 0.12, y1 - 0.14, -Z + 0.035, X - 0.05, y1 - 0.02, -Z + 0.08); // the filter
    },

    // ------------------------------------------------------------- a ship's anchor in a coil of rope on a wooden base (0.78 x 1.23 x 0.53)
    anchor: (K, B) => {
      const ink = paint(0x2a3a5a, 0.2), rope = matte(0xc8a46a, 0.12);
      K.lathe(wood(0x6a4630), [0, 0, 0], [[0, 0], [0.26, 0], [0.26, 0.05], [0.24, 0.065], [0, 0.065]], 16, { sz: 0.92 });
      for (let k = 0; k < 3; k++) K.torus(rope, 0, 0.083 + k * 0.034, 0, 0.2 - k * 0.025, 0.018, 18, 5);
      // the shank, the crown and the arms (an arc), the flukes, the stock and the ring
      K.tube(ink, [[0, 0.12, 0], [0, 0.6, 0], [0, 1.08, 0]], 0.034, 9, { radii: [0.042, 0.036, 0.03] });
      const arm = []; for (let k = 0; k <= 12; k++) { const a = -Math.PI * 0.82 + (k / 12) * Math.PI * 0.64; arm.push([Math.cos(a) * 0.36, 0.48 + Math.sin(a) * 0.36, 0]); }
      K.tube(ink, arm, 0.032, 9, { radii: arm.map((_, k) => 0.022 + 0.014 * Math.sin((k / 12) * Math.PI)) });
      K.ball(ink, 0, 0.125, 0, 0.05, 0.035, 0.04, 10, 4);
      K.sym((s) => { const e = arm[s > 0 ? 12 : 0]; K.at([e[0], e[1], 0], () => K.prism(ink, [[0, -0.02], [0.07, 0.04], [0.02, 0.15], [0, 0.11], [-0.02, 0.15], [-0.07, 0.04]], { plane: 'xy', a: -0.016, b: 0.016 }), { rz: -s * 0.75 }); });
      K.tube(ink, [[0, 0.98, -B.z1 + 0.04], [0, 0.98, B.z1 - 0.04]], 0.024, 8, { radii: [0.018, 0.024] });
      K.sym((s) => K.ball(ink, 0, 0.98, s * (B.z1 - 0.035), 0.028, 0.028, 0.028, 8, 4));
      K.torus(ink, 0, B.y1 - 0.09, 0, 0.07, 0.017, 16, 5, { axis: 'z' });
      // the rope: through the ring, twice round the shank, down into the coil
      const rp = [[0.06, B.y1 - 0.06, 0], [0.09, B.y1 - 0.14, 0.01]];
      for (let k = 0; k <= 24; k++) { const t = k / 24, a = t * TAU * 2.2 + 0.4; rp.push([Math.cos(a) * 0.055, 1.0 - t * 0.6, Math.sin(a) * 0.055]); }
      rp.push([0.1, 0.3, 0.06], [0.15, 0.15, 0.1], [0.18, 0.15, 0.04]);
      K.tube(rope, rp, 0.014, 6);
    },

    // ------------------------------------------------------------- a giant scallop, open, a pearl inside, a starfish beside it (0.7 x 0.48 x 0.46)
    shell_giant: (K, B) => {
      const hz = B.z0 + 0.03, R = 0.41, N = 13, out = matte(0xf2c8b8, 0.12), inn = ceramic(0xf6dcd4), rim = matte(0xe8a898, 0.1);
      // one valve: a fan of ribs from the hinge; cup = how deep it dishes (sign: which way it bulges)
      const valve = (cup) => {
        const P = (u, v, t) => { const th = (u - 0.5) * 2.05, r = v * R, rib = 0.012 * Math.abs(Math.cos(((u * N) % 1) * Math.PI)) * Math.min(1, v * 3); return [Math.sin(th) * r, cup * (Math.sin(Math.PI * Math.min(1, v * 1.05)) * 0.07 * Math.cos(th * 0.7)) + cup * rib + t, Math.cos(th) * r]; };
        surf(K, out, N * 4, 8, (u, v) => P(u, v, 0), () => [0, cup, 0]);
        surf(K, inn, N * 2, 6, (u, v) => P(u, v, -cup * 0.014), () => [0, -cup, 0]);
        K.use(rim, (G) => { const n = N * 4; for (let i = 0; i < n; i++) { const a = P(i / n, 1, 0), b = P((i + 1) / n, 1, 0), c = P((i + 1) / n, 1, -cup * 0.014), d = P(i / n, 1, -cup * 0.014); G.quad(a, b, c, d, [a[0], 0, a[2]]); } });
        // the two "ears" at the hinge
        K.prism(out, [[-0.07, 0], [0.07, 0], [0.05, 0.05], [-0.05, 0.05]], { plane: 'xz', a: -0.006, b: 0.006 });
      };
      K.at([0, 0.08, hz], () => valve(-1));
      K.at([0, 0.08, hz], () => valve(1), { rx: -0.95 });
      K.ball(ceramic(0xf6f0f4), 0, 0.08 + 0.065, hz + 0.21, 0.07, 0.07, 0.07, 14, 6);
      // a starfish leaning on the shell
      const st = []; for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k / 10) * TAU, r = k % 2 ? 0.025 : 0.065; st.push([Math.cos(a) * r, Math.sin(a) * r]); }
      K.at([0.25, 0.06, B.z1 - 0.07], () => { K.prism(matte(0xe8843a, 0.15), st, { plane: 'xy', a: -0.008, b: 0.008 }); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + (k / 5) * TAU; K.ball(matte(0xf2b07a), Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0.009, 0.006, 0.006, 0.003, 5, 2); } }, { rx: -0.35, ry: -0.4 });
    },

    // ------------------------------------------------------------- a beach parasol on a sand mound, a towel and a beach ball (1.48 x 1.98 x 1.53)
    beach_parasol: (K, B) => {
      K.lathe(matte(0xe8d4a8, 0.1), [0.05, 0, 0.05], [[0, 0], [0.62, 0], [0.5, 0.025], [0.25, 0.05], [0, 0.06]], 18, { sz: 0.92 });
      K.cyl(wood(0xe8e2d6), 0, 0, 0, 0.02, 1.86, 10);
      for (const y of [0.3, 0.7, 1.1, 1.5]) K.cyl(paint(0xd8402a), 0, y, 0, 0.021, 0.14, 10, { caps: false });
      // the canopy: eight panels sagging between the ribs, red and white, a scalloped valance
      const R = B.x1 - 0.02, yA = B.y1 - 0.05, yR = 1.52, n = 8;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, c = k % 2 ? 0xf2efe6 : 0xd8402a;
        const P = (u, v) => { const a = a0 + (a1 - a0) * u, r = v * R * (1 - 0.04 * Math.sin(Math.PI * u)), y = yA - (yA - yR) * Math.pow(v, 1.15) - 0.03 * Math.sin(Math.PI * u) * v; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
        surf(K, fabric(c), 4, 5, P, () => [0, 1, 0]);
        surf(K, fabric(darken(c, 0.12)), 4, 5, (u, v) => { const p = P(u, v); return [p[0], p[1] - 0.004, p[2]]; }, () => [0, -1, 0]);
        const am = (a0 + a1) / 2, e0 = P(0, 1), e1 = P(1, 1), m = [Math.cos(am) * R * 0.97, yR - 0.03 - 0.06, Math.sin(am) * R * 0.97];
        K.sheet(fabric(c), e0, e1, [m[0] * 1.0, m[1], m[2] * 1.0], [m[0], m[1], m[2]]);
        K.rod(metal(0xb8bcc0), [0, yA - 0.02, 0], [Math.cos(a0) * R * 0.98, yR - 0.012, Math.sin(a0) * R * 0.98], 0.005, 4);
        K.rod(metal(0xb8bcc0), [0, 1.3, 0], [Math.cos(a0) * R * 0.5, yA - (yA - yR) * 0.5 - 0.01, Math.sin(a0) * R * 0.5], 0.004, 4);
      }
      K.ball(wood(0xe8e2d6), 0, yA + 0.02, 0, 0.03, 0.04, 0.03, 8, 4);
      // the towel (striped) and the ball (six gores)
      const tw = K.patch('towel', 24, 48, (V) => { V.fill(0xf2efe6); for (let j = 0; j < 48; j += 8) V.box(0, j, 24, j + 4, 0x3a8ac8); V.box(0, 0, 24, 2, 0xf2c21c); V.box(0, 46, 24, 48, 0xf2c21c); }, { rough: 0.95 });
      K.at([0.42, 0.045, 0.3], () => { K.box(fabric(0xf2efe6), -0.18, 0, -0.36, 0.18, 0.008, 0.36, { bevel: 0.003 }); K.face(tw, '+y', -0.18, -0.36, 0.18, 0.36, 0.0085); }, { ry: -0.35, rz: -0.04 });
      const G = [0xd8402a, 0xf2efe6, 0x3a8ac8, 0xf2efe6, 0xf2c21c, 0xf2efe6];
      for (let k = 0; k < 6; k++) K.ball(candy(G[k], 0.2), -0.42, 0.16, 0.36, 0.11, 0.11, 0.11, 6, 6, { arc: TAU / 6, a0: (k / 6) * TAU });
      K.sym((s) => K.cyl(candy(0xf2efe6), -0.42, 0.16 + s * 0.108 - (s < 0 ? 0.004 : 0), 0.36, 0.022, 0.004, 8));
    },

    // ------------------------------------------------------------- a mustard retro sofa with tufted cushions and two throw pillows (1.48 x 0.78 x 0.75)
    sofa_retro: (K, B) => {
      const F = 0xd8a83a, Fd = darken(F, 0.12), X = B.x1, Z = B.z1;
      K.sym((s) => { for (const z of [-Z + 0.06, Z - 0.08]) { K.tube(wood(0x6a4630), [[s * (X - 0.1), 0.13, z], [s * (X - 0.07), 0, z + Math.sign(z) * 0.03]], 0.02, 8, { radii: [0.024, 0.013] }); K.cyl(metal(0xc8a44a, 0.3), s * (X - 0.07), 0, z + Math.sign(z) * 0.03, 0.014, 0.025, 8); } });
      soft(K, F, -X + 0.02, 0.12, -Z, X - 0.02, 0.3, Z - 0.03, 0.03);
      soft(K, F, -X + 0.02, 0.28, -Z, X - 0.02, B.y1, -Z + 0.17, 0.05);
      K.sym((s) => { soft(K, F, s > 0 ? X - 0.15 : -X, 0.12, -Z, s > 0 ? X : -X + 0.15, 0.53, Z, 0.045); K.tube(fabric(F), [[s * (X - 0.075), 0.55, -Z + 0.04], [s * (X - 0.075), 0.55, Z - 0.03]], 0.075, 10, { radii: [0.07, 0.075] }); K.cyl(fabric(Fd), s * (X - 0.075), 0.55, Z - 0.03, 0.07, 0.006, 12, { axis: 'z' }); });
      // three seat cushions with piped fronts, three tufted back cushions
      for (let k = 0; k < 3; k++) {
        const x0 = -X + 0.15 + k * ((2 * X - 0.3) / 3), x1 = x0 + (2 * X - 0.3) / 3;
        soft(K, F, x0 + 0.004, 0.3, -Z + 0.15, x1 - 0.004, 0.43, Z - 0.01, 0.045);
        K.tube(fabric(Fd), [[x0 + 0.03, 0.43 - 0.012, Z - 0.012], [x1 - 0.03, 0.43 - 0.012, Z - 0.012]], 0.007, 5);
        K.at([0, 0.43, -Z + 0.2], () => { soft(K, F, x0 + 0.006, 0, -0.07, x1 - 0.006, 0.31, 0.06, 0.05); for (const dx of [0.33, 0.67]) for (const y of [0.11, 0.21]) K.ball(fabric(Fd), x0 + (x1 - x0) * dx, y, 0.06, 0.012, 0.012, 0.008, 6, 3); }, { rx: -0.12 });
      }
      // a pink square pillow and a teal round one
      K.at([-X + 0.3, 0.52, -Z + 0.3], () => { soft(K, 0xf0a0b8, -0.12, -0.12, -0.045, 0.12, 0.12, 0.045, 0.045); K.ball(fabric(0xd8809a), 0, 0, 0.045, 0.012, 0.012, 0.006, 6, 3); }, { rx: -0.3, rz: 0.2, ry: 0.15 });
      K.at([X - 0.28, 0.53, -Z + 0.3], () => { K.lathe(fabric(0x4aa8a0), [0, 0, 0], [[0, -0.05], [0.09, -0.045], [0.12, -0.02], [0.125, 0], [0.12, 0.02], [0.09, 0.045], [0, 0.05]], 12, { axis: 'z' }); K.ball(fabric(0x3a8a84), 0, 0, 0.05, 0.016, 0.016, 0.008, 8, 3); }, { rx: -0.3, ry: -0.2 });
    },

    // ------------------------------------------------------------- a green wingback armchair, a round cushion, a striped blanket (0.8 x 0.9 x 0.7)
    armchair: (K, B) => {
      const F = 0x7aa88a, Fd = darken(F, 0.14), X = B.x1, Z = B.z1;
      K.sym((s) => { for (const z of [-Z + 0.05, Z - 0.06]) K.lathe(wood(0x5a3a26), [s * (X - 0.07), 0, z], [[0.012, 0], [0.024, 0.1], [0.026, 0.12], [0, 0.12]], 8); });
      soft(K, F, -X + 0.02, 0.11, -Z + 0.02, X - 0.02, 0.3, Z - 0.02, 0.035);
      soft(K, F, -X + 0.06, 0.28, -Z, X - 0.06, B.y1, -Z + 0.15, 0.06); // the back
      K.sym((s) => {
        soft(K, F, s > 0 ? X - 0.13 : -X, 0.11, -Z + 0.04, s > 0 ? X : -X + 0.13, 0.52, Z - 0.02, 0.045); // the arms
        K.tube(fabric(F), [[s * (X - 0.065), 0.54, -Z + 0.1], [s * (X - 0.06), 0.54, Z - 0.04]], 0.065, 10);
        K.cyl(fabric(Fd), s * (X - 0.06), 0.54, Z - 0.04, 0.062, 0.006, 12, { axis: 'z' });
        K.prism(fabric(F), [[-Z + 0.02, 0.5], [-Z + 0.02, B.y1 - 0.06], [-Z + 0.1, B.y1 - 0.02], [-Z + 0.26, 0.74], [-Z + 0.3, 0.56]], { plane: 'zy', a: s * (X - 0.01), b: s * (X - 0.12) }); // the wings
      });
      soft(K, F, -X + 0.13, 0.3, -Z + 0.13, X - 0.13, 0.43, Z - 0.01, 0.05);
      K.tube(fabric(Fd), [[-X + 0.16, 0.42, Z - 0.012], [X - 0.16, 0.42, Z - 0.012]], 0.007, 5);
      for (const x of [-0.12, 0, 0.12]) for (const y of [0.55, 0.72]) K.ball(fabric(Fd), x, y, -Z + 0.152, 0.012, 0.012, 0.008, 6, 3);
      K.at([-0.02, 0.6, -Z + 0.22], () => { K.lathe(fabric(0xf2c84a), [0, 0, 0], [[0, -0.05], [0.1, -0.045], [0.13, -0.02], [0.135, 0], [0.13, 0.02], [0.1, 0.045], [0, 0.05]], 12, { axis: 'z' }); K.ball(fabric(0xd8a83a), 0, 0, 0.05, 0.018, 0.018, 0.008, 8, 3); }, { rx: -0.25 });
      // the blanket over the right arm: bands of colour, a fringe
      const C = [0xd8402a, 0xf2efe6, 0x3a6aa8, 0xf2efe6];
      for (let k = 0; k < 8; k++) { const z0 = -0.18 + k * 0.05, c = fabric(C[k % 4]); K.box(c, X - 0.15, 0.6, z0, X + 0.004, 0.618, z0 + 0.05, { bevel: 0.003 }); K.box(c, X + 0.002, 0.3, z0, X + 0.016, 0.62, z0 + 0.05, { bevel: 0.003 }); }
      for (let k = 0; k < 9; k++) K.rod(fabric(0xf2efe6), [X + 0.009, 0.3, -0.18 + k * 0.05], [X + 0.012, 0.27, -0.18 + k * 0.05], 0.003, 3);
    },

    // ------------------------------------------------------------- a tripod floor lamp with a fabric drum shade (0.43 x 1.55 x 0.43)
    floor_lamp: (K, B) => {
      const W = wood(0x8a5a36), brass = metal(0xc8a44a, 0.3), yJ = 0.72, yS = 1.2;
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + Math.PI / 2, f = [Math.cos(a) * (B.x1 - 0.03), 0, Math.sin(a) * (B.x1 - 0.03)]; K.tube(W, [[Math.cos(a) * 0.025, yJ, Math.sin(a) * 0.025], f], 0.016, 8, { radii: [0.02, 0.011] }); K.cyl(brass, f[0], 0, f[2], 0.012, 0.03, 8); }
      K.lathe(brass, [0, yJ - 0.04, 0], [[0, 0], [0.035, 0], [0.04, 0.03], [0.03, 0.07], [0.012, 0.08]], 10);
      K.cyl(brass, 0, yJ + 0.04, 0, 0.011, yS - yJ, 8);
      // the shade: cream linen outside, lit from inside, braid at both rims; the bulb, the pull chain
      const r0 = B.x1 - 0.005, r1 = 0.15, H = B.y1 - yS - 0.03;
      K.lathe(fabric(0xf2e6cc), [0, yS, 0], [[r0, 0], [r1, H]], 16);
      K.glow(() => K.lathe(flat(0x9a8058, 0.5), [0, yS, 0], [[r0 - 0.003, 0], [r1 - 0.003, H]], 16, { flip: true }));
      K.torus(fabric(0xc8a46a), 0, yS, 0, r0, 0.007, 20, 3); K.torus(fabric(0xc8a46a), 0, yS + H, 0, r1, 0.007, 20, 3);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; K.rod(brass, [0, yS + H - 0.02, 0], [Math.cos(a) * (r1 - 0.004), yS + H - 0.004, Math.sin(a) * (r1 - 0.004)], 0.003, 3); }
      K.cyl(brass, 0, yS + 0.02, 0, 0.022, 0.05, 8);
      K.glow(() => K.ball(flat(0xa89060, 0.5), 0, yS + 0.11, 0, 0.035, 0.045, 0.035, 10, 5));
      for (let k = 0; k < 10; k++) K.ball(brass, 0.03, yS + 0.04 - k * 0.012, 0.0, 0.003, 0.004, 0.003, 4, 2);
    },

    // ------------------------------------------------------------- a cat tower: sisal posts, a cube den, platforms, a bed with a sleeping cat (0.68 x 1.58 x 0.58)
    cat_tower: (K, B) => {
      const C = 0xb8d8c8, X = B.x1, Z = B.z1;
      const sisal = K.patch('sisal', 16, 32, (V) => { V.fill(0xc8a874); for (let j = 0; j < 32; j += 2) V.hline(0, 15, j, 0xa88a58); for (let j = 1; j < 32; j += 4) V.hline(0, 15, j, 0xd8bc88); }, { rough: 0.95 });
      const post = (x, z, y0, y1) => { K.cyl(matte(0xc8a874), x, y0, z, 0.045, y1 - y0, 10, { caps: false }); K.wrap(sisal, x, y0, y1, z, 0.045, { n: 10, lift: 0.001 }); };
      soft(K, C, -X, 0, -Z, X, 0.05, Z, 0.02);
      // the den: carpeted walls, a round door
      const dx0 = 0.0, dx1 = X - 0.01, dz0 = -Z + 0.02, dz1 = 0.2, dy0 = 0.05, dy1 = 0.42, t = 0.025;
      soft(K, C, dx0, dy0, dz0, dx0 + t, dy1, dz1, 0.008); soft(K, C, dx1 - t, dy0, dz0, dx1, dy1, dz1, 0.008); soft(K, C, dx0, dy0, dz0, dx1, dy1, dz0 + t, 0.008);
      soft(K, C, dx0 - 0.01, dy1, dz0 - 0.01, dx1 + 0.005, dy1 + 0.03, dz1 + 0.01, 0.012);
      const hole = []; for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; hole.push([(dx0 + dx1) / 2 + Math.cos(a) * 0.09, 0.2 + Math.sin(a) * 0.09]); }
      K.prism(fabric(C), [[dx0, dy0], [dx1, dy0], [dx1, dy1], [dx0, dy1]], { plane: 'xy', a: dz1 - t, b: dz1, holes: [hole] });
      K.box(flat(0x3a4a44, 0.95), dx0 + t, dy0 + 0.001, dz0 + t, dx1 - t, dy0 + 0.004, dz1 - t);
      // posts and platforms
      post(-0.2, -0.05, 0.05, 0.78); post(0.17, -0.05, 0.45, 1.04); post(-0.08, -0.02, 0.81, 1.3);
      soft(K, C, -X + 0.01, 0.78, -Z + 0.04, 0.02, 0.81, 0.16, 0.012);
      soft(K, C, 0.02, 1.04, -0.24, X - 0.01, 1.07, 0.12, 0.012);
      // the dangling toy: a string and a feather pompom
      K.rod(matte(0xf2efe6), [-0.3, 0.78, 0.14], [-0.3, 0.58, 0.15], 0.002, 3); K.ball(fabric(0xf06a9a), -0.3, 0.56, 0.15, 0.025, 0.025, 0.025, 8, 4);
      // the bed on top, a ginger cat curled up asleep in it
      const yb = 1.3;
      K.lathe(fabric(0xf0a8c0), [-0.08, yb, -0.02], [[0, 0], [0.2, 0], [0.22, 0.04], [0.2, 0.09], [0.17, 0.09], [0.16, 0.05], [0, 0.04]], 14);
      const g = 0xe08a3a, gd = 0xc8702a;
      K.ball(matte(g, 0.12), -0.09, yb + 0.1, -0.03, 0.13, 0.075, 0.11, 12, 6);
      K.at([0.0, yb + 0.12, 0.05], () => catHead(K, 0, 0, 0, 0.1, { base: g, ear: gd, patch: gd }), { ry: 0.6, rz: 0.25 });
      K.tube(matte(g, 0.1), [[-0.2, yb + 0.08, -0.06], [-0.2, yb + 0.07, 0.06], [-0.1, yb + 0.07, 0.12], [0.0, yb + 0.07, 0.11]], 0.02, 8, { radii: [0.024, 0.022, 0.02, 0.014] });
      for (const z of [-0.08, -0.03, 0.02]) K.tube(matte(gd), [[-0.15, yb + 0.165, z], [-0.08, yb + 0.175, z + 0.005], [-0.02, yb + 0.16, z]], 0.006, 4);
    },

    // ------------------------------------------------------------- a collector's bookcase: books, a shelf of capsules and figures, a plant on top (1.07 x 1.83 x 0.48)
    bookcase: (K, B) => {
      const WD = 0x8a5a36, X = B.x1, Z = B.z1, t = 0.025, top = B.y1 - 0.12;
      plank(K, WD, -X, 0, -Z, -X + t, top, Z, { axis: 'y', bevel: 0.004 }); plank(K, WD, X - t, 0, -Z, X, top, Z, { axis: 'y', bevel: 0.004, v: 1 });
      plank(K, darken(WD, 0.1), -X - 0.01, top, -Z - 0.01, X + 0.01, top + 0.03, Z + 0.01, { bevel: 0.006 });
      plank(K, darken(WD, 0.2), -X + t, 0, -Z, X - t, top, -Z + 0.012, { axis: 'y' });
      K.box(wood(darken(WD, 0.15)), -X + t, 0, Z - 0.03, X - t, 0.08, Z - 0.01);
      const ys = [0.08, 0.44, 0.8, 1.16, 1.5];
      for (const y of ys) plank(K, WD, -X + t, y - 0.02, -Z + 0.012, X - t, y, Z - 0.01, { bevel: 0.003, v: 2 });
      // books: a hand-set rhythm of widths, heights and colours, a gold band on some spines, one leaning
      const PAL = [0x8a2a2a, 0x2a4a7a, 0x3a6a3a, 0xc8a44a, 0x5a3a6a, 0xd8d0b8, 0x2a2a2e, 0xa85a2a, 0x4a7a8a];
      const W = [0.035, 0.028, 0.045, 0.03, 0.04, 0.025, 0.05, 0.032, 0.038, 0.027, 0.042];
      [0, 1, 3].forEach((s, si) => {
        const y = ys[s]; let x = -X + t + 0.01, k = si * 5;
        while (x < X - t - 0.12) {
          const w = W[k % W.length], h = 0.2 + ((k * 7) % 5) * 0.025, c = PAL[(k * 4 + si) % PAL.length];
          if (k % 13 === 7) { K.at([x + 0.02, y, 0], () => { K.box(matte(c, 0.15), 0, 0, -0.1, w, h, 0.1, { bevel: 0.004 }); }, { rz: -0.35 }); x += 0.09; k++; continue; }
          K.box(matte(c, 0.15), x, y, -0.1, x + w - 0.003, y + h, 0.11, { bevel: 0.004 });
          if (k % 3 !== 1) for (const yy of [0.025, h - 0.04]) K.box(flat(0xd8b44a, 0.5), x + 0.004, y + yy, 0.11, x + w - 0.007, y + yy + 0.01, 0.1112);
          x += w; k++;
        }
        K.box(metal(0x6a6e72), X - t - 0.06, y, -0.08, X - t - 0.055, y + 0.16, 0.06); // a bookend
      });
      // the collector's shelf: capsules in a row, two little figures on bases
      const y2 = ys[2], CC = [0xf07aa0, 0x5aa8e8, 0xf2c84a, 0x7ac86a, 0xb88ae8];
      for (let k = 0; k < 5; k++) { const x = -X + 0.12 + k * 0.1; K.ball(candy(CC[k], 0.3), x, y2 + 0.04, 0.05, 0.04, 0.04, 0.04, 10, 4, { y0: 0 }); K.ball(candy(0xf2ece0, 0.1), x, y2 + 0.04, 0.05, 0.04, 0.04, 0.04, 10, 4, { y1: 0 }); }
      for (const [x, c] of [[0.2, 0xd8402a], [0.38, 0x3a6aa8]]) { K.cyl(paint(0x24242a), x, y2, 0.0, 0.05, 0.015, 12); K.ball(matte(c, 0.15), x, y2 + 0.07, 0.0, 0.03, 0.05, 0.026, 10, 5); K.ball(matte(0xf2d8c0), x, y2 + 0.15, 0.0, 0.032, 0.032, 0.03, 10, 5); K.ball(matte(darken(c, 0.4)), x, y2 + 0.165, -0.005, 0.034, 0.024, 0.031, 10, 4, { y0: 0 }); }
      K.box(matte(0xf2efe6, 0.1), X - 0.2, y2, -0.1, X - 0.06, y2 + 0.2, 0.06, { bevel: 0.006 }); // a boxed figure
      // on top: a pothos in a pot trailing over the edge, and a little clock
      const yt = top + 0.03;
      K.lathe(ceramic(0xe8e2d6), [X - 0.17, yt, 0], [[0, 0], [0.06, 0], [0.075, 0.1], [0.07, 0.1], [0, 0.095]], 10);
      leaves(K, (t2, F) => { F.shrub(t2, X - 0.17, yt + 0.06, 0, 0.09, 'pothos', { seed: 12, card: 0.12 }); F.vine(t2, X - 0.06, yt - 0.42, yt + 0.06, Z - 0.02, 7, { kind: 'pothos', card: 0.11 }); });
      K.lathe(paint(0xc8402a), [-X + 0.2, yt, 0], [[0, 0], [0.06, 0], [0.06, 0.1], [0, 0.1]], 12);
      disc(K, flat(0xf2efe6, 0.5), -X + 0.2, yt + 0.06, 0.05, 0.035, 12);
    },

    // ------------------------------------------------------------- a jack-o'-lantern in a witch's hat with two small pumpkins (0.7 x 0.66 x 0.52)
    jack_lantern: (K, B) => {
      const bx = -0.04, R = 0.21, H = 0.33;
      const { P } = pumpkin(K, bx, 0, 0, R, H, { lobes: 10 });
      // the carved face, lit from inside: two eyes, a nose, a jagged grin, each pressed into the surface where it sits
      const face = [[[-0.07, 0.2], [[-0.035, -0.02], [0.035, -0.02], [0, 0.04]]], [[0.07, 0.2], [[-0.035, -0.02], [0.035, -0.02], [0, 0.04]]], [[0, 0.155], [[-0.018, -0.012], [0.018, -0.012], [0, 0.02]]],
        [[0, 0.09], [[-0.11, 0.02], [-0.08, 0.0], [-0.06, 0.02], [-0.03, -0.005], [0, 0.015], [0.03, -0.005], [0.06, 0.02], [0.08, 0.0], [0.11, 0.02], [0.06, -0.035], [0, -0.045], [-0.06, -0.035]]]];
      for (const [[x, y], pts] of face) { const z = Math.sqrt(Math.max(0, R * R * 0.94 - x * x)) * Math.sqrt(Math.max(0, 1 - ((y - H / 2) / (H / 2)) ** 2)); K.at([bx + x, y, z], () => { K.prism(flat(0x7a3a14, 0.7), pts.map(([a, b]) => [a * 1.14, b * 1.14 - 0.002]), { plane: 'xy', a: -0.012, b: 0.009 }); K.glow(() => K.prism(flat(0xb08a2a, 0.5), pts, { plane: 'xy', a: -0.012, b: 0.0115 })); }, { ry: Math.atan2(x, z) }); }
      // the witch's hat: a wide brim, a crooked cone, a band and a buckle
      const hy = H - 0.02, hat = matte(0x4a3a6a, 0.12);
      K.lathe(hat, [bx, hy, 0], [[0, 0], [0.18, -0.008], [0.19, 0.0], [0.17, 0.012], [0.09, 0.02], [0, 0.02]], 14);
      K.tube(hat, [[bx, hy + 0.01, 0], [bx + 0.005, hy + 0.12, -0.005], [bx + 0.02, hy + 0.22, -0.01], [bx + 0.07, B.y1 - 0.04, -0.02], [bx + 0.11, B.y1 - 0.06, -0.02]], 0.08, 10, { radii: [0.085, 0.06, 0.035, 0.016, 0.006] });
      K.lathe(fabric(0x3a8a5a), [bx, hy + 0.018, 0], [[0.087, 0], [0.08, 0.035]], 14);
      K.box(metal(0xd8b44a, 0.3), bx - 0.022, hy + 0.02, 0.078, bx + 0.022, hy + 0.05, 0.088, { bevel: 0.004 });
      // two small pumpkins, one pale
      pumpkin(K, 0.23, 0, 0.11, 0.1, 0.15, { lobes: 8 });
      pumpkin(K, -0.25, 0, -0.08, 0.1, 0.13, { lobes: 8, c: 0xe8c890 });
      K.tube(matte(0x4a7a3a), [[0.23, 0.15, 0.11], [0.28, 0.17, 0.14], [0.3, 0.14, 0.17], [0.27, 0.13, 0.19]], 0.004, 4);
      leaf(K, matte(0x4a7a3a), [0.2, 0.14, 0.12], [0.12, 0.13, 0.2], 0.07);
      void P;
    },

    // ------------------------------------------------------------- a ghost lamp: a sheet-ghost lit from inside, on a round base (0.58 x 0.98 x 0.56)
    ghost_lamp: (K, B) => {
      K.lathe(wood(0x6a4630), [0, 0, 0], [[0, 0], [0.2, 0], [0.2, 0.035], [0.17, 0.05], [0, 0.05]], 16);
      K.tube(rubber(), [[0.1, 0.02, -0.15], [0.2, 0.01, -0.22], [0.27, 0.005, -0.26]], 0.006, 4);
      const top = B.y1 - 0.04, hem = (th) => 0.075 + 0.025 * Math.sin(th * 5 + 0.6);
      const rp = (y) => (y < 0.62 ? 0.25 - (y - 0.07) * 0.07 : 0.212 * Math.sqrt(Math.max(0, 1 - ((y - 0.62) / (top - 0.62)) ** 2)));
      const P = (u, v) => { const th = u * TAU, y0 = hem(th), y = y0 + (top - y0) * Math.sin((v * Math.PI) / 2) ** 1.1, r = rp(y) * (1 + 0.03 * Math.sin(th * 5 + 0.6) * (1 - v)); return [Math.sin(th) * r, y, Math.cos(th) * r]; };
      K.glow(() => {
        surf(K, flat(0xb0bad4, 0.5), 30, 12, P, (u, v) => { const p = P(u, v); return [p[0], p[1] - 0.5, p[2]]; });
        K.tube(flat(0xb0bad4, 0.5), [[0, top - 0.03, 0], [0.01, top + 0.0, 0.0], [0.035, top - 0.0, -0.01], [0.04, top - 0.025, -0.01]], 0.02, 8, { radii: [0.03, 0.02, 0.012, 0.005] });
        surf(K, flat(0x9aa4c0, 0.5), 30, 1, (u, v) => { const p = P(u, 0); return [p[0] * (1 - v * 0.98), p[1] + v * 0.02, p[2] * (1 - v * 0.98)]; }, () => [0, -1, 0]);
        K.sym((s) => K.ball(flat(0xb0bad4, 0.5), s * 0.235, 0.5, 0.03, 0.06, 0.035, 0.04, 8, 4)); // the little arms
      });
      // the face: dark oval eyes with a glint, pink cheeks, a small open mouth
      const fz = (x, y) => Math.sqrt(Math.max(0, rp(y) ** 2 - x * x));
      K.sym((s) => { const x = s * 0.07, y = 0.66; K.at([x, y, fz(x, y) - 0.004], () => { K.ball(flat(0x24222a, 0.3), 0, 0, 0, 0.022, 0.032, 0.01, 10, 4); K.ball(flat(0xf2efe6, 0.3), 0.007, 0.012, 0.009, 0.006, 0.007, 0.003, 6, 2); }, { ry: Math.atan2(x, fz(x, y)) }); const xc = s * 0.12; K.at([xc, 0.6, fz(xc, 0.6) - 0.002], () => K.ball(flat(0xe8a0b0, 0.8), 0, 0, 0, 0.025, 0.014, 0.004, 8, 2), { ry: Math.atan2(xc, fz(xc, 0.6)) }); });
      K.at([0, 0.58, fz(0, 0.58) - 0.004], () => K.ball(flat(0x3a2230, 0.4), 0, 0, 0, 0.02, 0.026, 0.008, 8, 3));
    },

    // ------------------------------------------------------------- the plate-counting well: a stone ring, a roof, a bucket and a ghost girl (0.98 x 1.38 x 0.83)
    haunted_well: (K, B) => {
      const Ro = 0.36, Ri = 0.28, hc = 0.13;
      // three courses of dressed stone, staggered, a dark mossy foot, the black water
      for (let c = 0; c < 3; c++) {
        const n = 12;
        for (let k = 0; k < n; k++) {
          const a = ((k + (c % 2) * 0.5) / n) * TAU, tone = [0x8a8a82, 0x7a7a74, 0x949488, 0x84847c][(k + c * 3) % 4];
          K.at([0, c * hc, 0], () => K.box(stone(tone, 0.12), Ri, 0.004, -0.098, Ro + (k % 3) * 0.006, hc - 0.004, 0.098, { bevel: 0.014 }), { ry: -a });
        }
      }
      K.lathe(stone(0x9a9890), [0, 3 * hc, 0], [[Ri - 0.02, 0], [Ro + 0.03, 0], [Ro + 0.03, 0.04], [Ri - 0.02, 0.04]], 14);
      K.lathe(flat(0x3a3e34, 0.95), [0, 0, 0], [[Ri, 0.2], [Ri, 3 * hc]], 14, { flip: true });
      K.cyl(mat(0x1a2420, 0.1), 0, 0.2, 0, Ri, 0.01, 14);
      for (const [a, w] of [[0.4, 0.5], [2.2, 0.7], [4.1, 0.4], [5.3, 0.6]]) K.lathe(matte(0x4a6a34, 0.1), [0, 0, 0], [[Ro + 0.01, 0], [Ro + 0.012, 0.05], [Ro + 0.006, 0.08]], 6, { arc: w, a0: a });
      // the frame: two posts, a tie beam, the windlass with its rope, a crank; the bucket on the rope
      const yr = B.y1 - 0.24, px = B.x1 - 0.05, WD = 0x5a4632;
      K.sym((s) => { plank(K, WD, s * px - 0.035, 0, -0.035, s * px + 0.035, yr + 0.02, 0.035, { axis: 'y', bevel: 0.006, v: s > 0 ? 1 : 2 }); K.box(stone(0x8a8a82), s * px - 0.05, 0, -0.05, s * px + 0.05, 0.05, 0.05); });
      plank(K, WD, -px - 0.05, yr - 0.03, -0.04, px + 0.05, yr + 0.02, 0.04, { bevel: 0.005 });
      K.cyl(wood(0x7a5a3a), -px + 0.035, 0.95, 0, 0.035, 2 * px - 0.07, 10, { axis: 'x' });
      for (let k = 0; k < 9; k++) K.torus(matte(0xb89a6a), -0.15 + k * 0.022, 0.95, 0, 0.038, 0.008, 10, 3, { axis: 'x' });
      K.tube(metal(0x4a4a4a), [[px + 0.035, 0.95, 0], [px + 0.06, 0.95, 0], [px + 0.06, 0.85, 0], [px + 0.1, 0.85, 0]], 0.008, 5);
      K.rod(matte(0xb89a6a), [0.0, 0.95, 0.035], [0.0, 0.76, 0.02], 0.007, 4);
      K.at([0, 0.62, 0.02], () => { bucket(K, 0, 0, 0, 0.09, 0.13, { c: wood(0x8a6a44) }); K.tube(metal(0x5a5a5a), [[-0.09, 0.12, 0], [-0.06, 0.15, 0], [0.06, 0.15, 0], [0.09, 0.12, 0]], 0.004, 4); });
      // the roof: two boards of dark shingles on rafters, a ridge board
      const sh = K.patch('shingle', 64, 32, (V) => { V.fill(0x3a3430); for (let j = 0; j < 32; j += 8) { V.hline(0, 63, j, 0x24201e); for (let i = (j / 8) % 2 ? 6 : 0; i < 64; i += 12) V.vline(i, j, j + 7, 0x2a2624); V.hline(0, 63, j + 1, 0x4a4440); } }, { rough: 0.9 });
      K.sym((s) => {
        const zE = s * (B.z1 - 0.01), yE = yr + 0.04, yT = B.y1 - 0.02;
        K.prism(wood(0x3a3430), [[0, yT], [zE, yE], [zE, yE - 0.025], [0, yT - 0.025]].map(([z, y]) => [z, y]), { plane: 'zy', a: -B.x1, b: B.x1 });
        for (let i = 0; i < 3; i++) { const xa = -B.x1 + (i * 2 * B.x1) / 3, xb = xa + (2 * B.x1) / 3, L = s > 0 ? xa : xb, Rr = s > 0 ? xb : xa; K.quadUV(sh, [L, yE + 0.001, zE], [Rr, yE + 0.001, zE], [Rr, yT + 0.001, 0], [L, yT + 0.001, 0], [0, 1, s * 0.6]); }
        K.rod(wood(0x4a3a2a), [s * px, yr + 0.02, 0], [s * px, yT - 0.03, 0], 0.02, 6);
      });
      K.box(wood(0x2a2420), -B.x1 - 0.005, B.y1 - 0.035, -0.03, B.x1 + 0.005, B.y1, 0.03, { bevel: 0.008 });
      // the ghost girl peeping over the rim with her plate: pale face, long black hair over the stones, two hands
      const gz = Ri - 0.02, gy = 3 * hc + 0.04;
      K.ball(matte(0xe8ecf0, 0.06), 0.06, gy + 0.03, gz - 0.06, 0.07, 0.08, 0.065, 12, 6);
      K.ball(matte(0x1a1a1e, 0.06), 0.06, gy + 0.045, gz - 0.085, 0.078, 0.082, 0.068, 12, 6, { y0: -0.5 });
      K.ball(matte(0x1a1a1e, 0.06), 0.06, gy + 0.075, gz - 0.035, 0.074, 0.04, 0.05, 12, 4, { y0: 0 }); // the fringe
      for (let k = 0; k < 6; k++) { const x = [-0.012, 0.004, 0.018, 0.102, 0.116, 0.132][k]; K.tube(matte(0x1a1a1e, 0.04), [[x, gy + 0.06, gz - 0.02], [x + 0.003, gy + 0.03, gz + 0.03], [x - 0.002, gy - 0.05, gz + 0.075 + (k % 2) * 0.01], [x + 0.004, gy - 0.16 - (k % 3) * 0.03, gz + 0.085]], 0.012, 5, { radii: [0.014, 0.012, 0.01, 0.005] }); }
      K.sym((s) => K.ball(flat(0x1a1a1e, 0.3), 0.06 + s * 0.026, gy + 0.03, gz + 0.0, 0.01, 0.014, 0.006, 6, 3));
      for (const x of [-0.1, 0.2]) K.ball(matte(0xe8ecf0, 0.06), x, gy + 0.005, gz + 0.05, 0.03, 0.018, 0.04, 8, 4);
      K.at([-0.1, gy + 0.03, gz + 0.02], () => { K.lathe(ceramic(0xf2f0ea), [0, 0, 0], [[0, 0], [0.05, 0.004], [0.065, 0.014]], 14); K.torus(ceramic(0x3a5a9a), 0, 0.014, 0, 0.064, 0.003, 14, 3); }, { rx: 1.1 });
    },
  },
};
