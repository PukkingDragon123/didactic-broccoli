// More garage clutter (the second half of src/data/props/garage.js): the old television, umbrellas, tied manga,
// tyres, the desk lamp, the extinguisher, chairs, the cat asleep in a mikan box, the bucket and its zōkin, rice
// sacks, a box of capsules, a shelf of little figures.
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, tones, plank, carton, stack, tied, bucket, dirtBox, dirtRing } from '../kit/shapes.js';
import { kana, smallPrint, framed, rustEdge, warnTri, mascot, plankTex } from '../kit/prints.js';
import { catHead, FUR } from '../kit/animals.js';
import { capsule } from './garage.js';

const CARD = 0xc49a62;
/** An open cardboard box: walls, the four flaps folded out, a print on the front. Returns nothing; inside is empty from y0 + 0.01. */
export function openCarton(K, x0, y0, z0, x1, y1, z1, o = {}) {
  const c = o.c ?? CARD, m = matte(c, 0.16), t = 0.006, fl = o.flap ?? Math.min(0.08, (z1 - z0) * 0.3);
  K.tub(m, x0, y0, z0, x1, y1, z1, t, { inside: flat(darken(c, 0.18), 0.95), bevel: 0.002 });
  const f = flat(lighten(c, 0.06), 0.95), fb = flat(darken(c, 0.1), 0.95);
  K.sheet(f, [x0, y1, z1], [x1, y1, z1], [x1, y1 - fl * 0.45, z1 + fl * 0.9], [x0, y1 - fl * 0.45, z1 + fl * 0.9], { back: fb });
  K.sheet(f, [x1, y1, z0], [x0, y1, z0], [x0, y1 - fl * 0.3, z0 - fl * 0.95], [x1, y1 - fl * 0.3, z0 - fl * 0.95], { back: fb });
  if (o.sideFlaps !== false) { K.sheet(f, [x0, y1, z0], [x0, y1, z1], [x0 - fl * 0.9, y1 - fl * 0.4, z1], [x0 - fl * 0.9, y1 - fl * 0.4, z0], { back: fb }); K.sheet(f, [x1, y1, z1], [x1, y1, z0], [x1 + fl * 0.9, y1 - fl * 0.4, z0], [x1 + fl * 0.9, y1 - fl * 0.4, z1], { back: fb }); }
  if (o.label) { const [lw, lh] = o.labelSize || [(x1 - x0) * 0.7, (y1 - y0) * 0.55], cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - 0.01; K.face(o.label, '+z', cx - lw / 2, cy - lh / 2, cx + lw / 2, cy + lh / 2, z1 + 0.001); }
}

export default {
  family: 'garage',
  models: {
    // ------------------------------------------------------------- the wood-grain television (0.49 x 0.56 x 0.46): rabbit ears, a doily, the screen to +z
    crt_tv: (K, B) => {
      const w = B.w / 2, zf = B.z1 - 0.008, zb = B.z0 + 0.06, h = 0.4, wd = 0x7a5236; // (the build system lays its live screen at z = 0.224: src/build/models.js)
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: -w, u1: w, v0: 0.02, v1: h, ppm: 300, rough: 0.6 }, (V) => {
        const I = (x) => V.i(x), J = (y) => V.j(y), dk = 0x26221e;
        V.fill(0x2e2a28); V.frame(0, 0, V.W, V.H, wd); V.frame(1, 1, V.W - 1, V.H - 1, lighten(wd, 0.2)); V.frame(2, 2, V.W - 2, V.H - 2, wd);
        // the tube: a grey-green bulge with a streak of window light, in a chrome bead
        V.box(I(-0.21), J(0.06), I(0.09), J(0.36), 0x3e4a48); V.frame(I(-0.21) - 1, J(0.06) - 1, I(0.09) + 1, J(0.36) + 1, 0xb8bcc0);
        V.box(I(-0.2), J(0.07), I(0.08), J(0.35), 0x34403e); for (let k = 0; k < 16; k++) { V.px(I(-0.18) + k, J(0.33) - k, 0x5a6a68); V.px(I(-0.17) + k, J(0.33) - k, 0x4a5a58); }
        V.polyPx([[I(-0.2), J(0.07)], [I(-0.2) + 6, J(0.07)], [I(-0.2), J(0.07) + 6]], 0x2e2a28); V.polyPx([[I(0.08), J(0.35)], [I(0.08) - 6, J(0.35)], [I(0.08), J(0.35) - 6]], 0x2e2a28);
        // the controls: two dials, the speaker slots, the maker's badge
        V.box(I(0.11), J(0.04), I(0.23), J(0.38), 0x4a4440);
        for (const y of [0.31, 0.22]) { V.disc(I(0.17), J(y), 9, 0xb8bcc0); V.disc(I(0.17), J(y), 7, 0x3a3a3e); V.line(I(0.17), J(y), I(0.17) + 3, J(y) + 5, 0xe8e4d8); for (let k = 0; k < 8; k++) { const a = k * 0.785; V.px(I(0.17) + Math.round(Math.cos(a) * 11), J(y) + Math.round(Math.sin(a) * 11), 0x9a948c); } }
        for (let k = 0; k < 7; k++) V.box(I(0.125), J(0.06) + k * 4, I(0.215), J(0.06) + k * 4 + 2, dk);
        V.text5('HIKARI', I(0.17), J(0.165), 0xb8a878, { align: 'center' });
      });
      const top = plankTex(K, wd, 1);
      const grain = K.along(top, [-w, 0.02, zb, w, h, zf], 'x');
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : grain)(p, n), (G) => G.box(-w, 0.02, zb, w, h, zf, { bevel: 0.01 }));
      K.box(plastic(0x26262a), -w + 0.06, 0.06, B.z0, w - 0.06, h - 0.06, zb, { bevel: 0.03 }); // the tube's hump at the back
      for (const [x, z] of [[-w + 0.04, zb + 0.04], [w - 0.04, zb + 0.04], [-w + 0.04, zf - 0.04], [w - 0.04, zf - 0.04]]) K.cyl(plastic(0x26262a), x, 0, z, 0.018, 0.022, 6);
      // on top: a lace doily under a little kokeshi, the antenna
      K.lathe(flat(0xeeeae0, 0.95), [-0.08, h, 0.02], [[0.1, 0.001], [0.1, 0.004], [0, 0.005]], 10);
      for (let k = 0; k < 10; k++) { const a = k * 0.6283; K.box(flat(0xeeeae0, 0.95), -0.08 + Math.cos(a) * 0.105 - 0.012, h + 0.001, 0.02 + Math.sin(a) * 0.105 - 0.012, -0.08 + Math.cos(a) * 0.105 + 0.012, h + 0.004, 0.02 + Math.sin(a) * 0.105 + 0.012); }
      K.cyl(paint(0xc8302a, 0.2), -0.08, h + 0.005, 0.02, 0.016, 0.04, 6); K.ball(flat(0xeed8b8, 0.6), -0.08, h + 0.06, 0.02, 0.018, 0.018, 0.018, 6, 3);
      K.cyl(plastic(0x26262a), 0.12, h, -0.06, 0.03, 0.02, 8);
      K.rod(chrome(), [0.12, h + 0.02, -0.06], [0.02, B.y1 - 0.005, -0.1], 0.004, 4); K.rod(chrome(), [0.12, h + 0.02, -0.06], [0.22, B.y1 - 0.02, -0.02], 0.004, 4);
    },

    // ------------------------------------------------------------- umbrella stand (0.25 x 0.89 x 0.25): a seto-ware jar and three umbrellas
    umbrella_stand: (K, B) => {
      const n = 10, R = 0.11;
      const V = K.patch('seto', 120, 64, (V) => { V.fill(0xe8e6de); V.box(0, 0, 120, 4, 0x2a52a8); V.box(0, 60, 120, 64, 0x2a52a8); for (let i = 0; i < 120; i++) for (const [j0, c] of [[20, 0x2a52a8], [30, 0x5a82c8], [40, 0x2a52a8]]) { const j = j0 + Math.round(Math.sin(i / 120 * 6.2832 * 5) * 3.5); V.px(i, j, c); V.px(i, j + 1, c); } }, { rough: 0.4 });
      K.lathe(ceramic(0xe8e6de), [0, 0, 0], [[0, 0], [R * 0.9, 0], [R, 0.02]], n); K.wrap(V, 0, 0.02, 0.4, 0, R, { n, lift: 0 });
      K.lathe(ceramic(0x2a52a8), [0, 0.4, 0], [[R, 0], [R + 0.008, 0.01], [R - 0.012, 0.012]], n); K.lathe(flat(0x4a4a50, 0.6), [0, 0.4, 0], [[R - 0.012, 0.012], [R - 0.012, -0.3], [0, -0.3]], n);
      const umb = (x, z, top, c, hc, lean) => {
        const tip = [x - lean[0] * 0.5, 0.06, z - lean[1] * 0.5], hd = [x + lean[0], top, z + lean[1]];
        K.tube(c, [tip, [x, 0.3, z], [x + lean[0] * 0.75, top - 0.16, z + lean[1] * 0.75]], 0.022, 6, { radii: [0.008, 0.026, 0.016] }); // the furled canopy
        K.rod(metal(0x8a9094), [x + lean[0] * 0.75, top - 0.16, z + lean[1] * 0.75], [hd[0], top - 0.06, hd[2]], 0.005, 4);
        K.tube(hc, [[hd[0], top - 0.07, hd[2]], [hd[0], top - 0.02, hd[2]], [hd[0] + 0.02, top, hd[2]], [hd[0] + 0.045, top - 0.02, hd[2]], [hd[0] + 0.045, top - 0.05, hd[2]]], 0.008, 5);
      };
      umb(-0.03, 0.01, B.y1 - 0.02, flat(0xe8ecee, 0.4), plastic(0xe8e4d8), [-0.02, 0.02]); umb(0.03, 0.03, 0.82, fabric(0x24305a), wood(0x6a4a34), [0.03, 0.01]); umb(0.01, -0.04, 0.78, fabric(0xe8b830), plastic(0x26262a), [0.0, -0.04]);
    },

    // ------------------------------------------------------------- weekly manga magazines tied up for the paper collection (0.276 x 0.336 x 0.192)
    manga_stack: (K, B) => {
      const w = B.w / 2 - 0.006, d = B.d / 2 - 0.004, cols = [0xe84a3a, 0x3a7ad8, 0xf2c21c, 0x3a9a4a, 0xe86aa8, 0xe8842a, 0x8a5bd6, 0x2ab4c8];
      const sp = K.patch('spines', 64, 64, (V) => { for (let k = 0; k < 8; k++) { const j = k * 8; V.box(0, j, 64, j + 8, cols[k]); V.box(0, j, 64, j + 1, darken(cols[k], 0.25)); V.text5(['JUMBO', 'GANGAN', 'KORO', 'SANDEE', 'NAKAYO', 'MAGA', 'CHAMP', 'RIBON'][k], 4, j + 7, 0xffffff); V.box(48, j + 2, 60, j + 6, 0xffffff); V.text5(String(12 + k), 54, j + 7, cols[k], { align: 'center' }); } }, { rough: 0.7 });
      const n = 8, th = 0.29 / n;
      for (let k = 0; k < n; k++) {
        const dx = ((k * 0.37) % 1 - 0.5) * 0.012, dz = ((k * 0.61) % 1 - 0.5) * 0.008, y = k * th;
        K.box(flat(0xe6e0cc, 0.95), -w + dx + 0.002, y + 0.002, -d + dz, w + dx, y + th - 0.002, d + dz - 0.003); // the page block
        K.box(flat(cols[k], 0.7), -w + dx, y, -d + dz - 0.001, w + dx + 0.001, y + 0.002, d + dz); K.box(flat(cols[k], 0.7), -w + dx, y + th - 0.003, -d + dz - 0.001, w + dx + 0.001, y + th - 0.0008, d + dz); // covers
        K.face(sp, '-x', -d + dz, y, d + dz, y + th - 0.0008, -w + dx - 0.0005, { sub: [0, k / 8, 1, (k + 1) / 8] });
      }
      // the top cover: a pixel hero and the title
      const cv = K.patch('cover', 64, 48, (V) => { V.fill(0xf2c21c); V.box(0, 36, 64, 48, 0xd8322a); V.text5('JUMBO', 32, 46, 0xffffff, { align: 'center', s: 1 }); mascot(V, 'kaiju', 6, 30, {}, 2); mascot(V, 'neko', 36, 28, {}, 2); smallPrint(V, 4, 5, 56, 1, 0x26221e); }, { rough: 0.7 });
      K.face(cv, '+y', -w, -d, w, d, n * th + 0.0002, { rot: 1 });
      tied(K, -w - 0.006, 0, -d - 0.004, w + 0.006, n * th, d + 0.004, { c: flat(0xd8ccb0, 0.9), w: 0.003 });
      // one loose volume on top
      K.at([0.02, n * th + 0.008, 0.0], () => { K.box(flat(0xe6e0cc, 0.95), -0.085, 0.002, -0.06, 0.085, 0.028, 0.06); K.box(flat(0xf4b0c4, 0.7), -0.087, 0, -0.062, 0.087, 0.002, 0.062); K.box(flat(0xf4b0c4, 0.7), -0.087, 0.028, -0.062, 0.087, 0.03, 0.062); K.box(flat(0xd8322a, 0.7), -0.06, 0.03, -0.04, 0.0, 0.0305, 0.03); }, { ry: 0.35 });
    },

    // ------------------------------------------------------------- three old tyres (0.61 x 0.57 x 0.61)
    tires: (K) => {
      const tread = K.patch('tread', 16, 32, (V) => { const b = 0x2c2c2e, d = 0x18181a; V.fill(b); for (let j = 0; j < 32; j++) for (let i = 0; i < 16; i++) { const y = j / 32; if (Math.abs(y - 0.5) < 0.05 || Math.abs(y - 0.25) < 0.03 || Math.abs(y - 0.75) < 0.03 || (i + (y > 0.5 ? 3 : 0)) % 8 === 0) V.px(i, j, d); } }, { shared: true, rough: 0.95 });
      const tyre = (y, dx, dz, turn) => K.at([dx, y, dz], () => {
        const R = 0.295, ri = 0.17, h = 0.18, n = 12, rb = rubber(0x2c2c2e);
        K.lathe(rb, [0, 0, 0], [[ri, 0.025], [R - 0.05, 0], [R - 0.015, 0.02]], n); K.lathe(rb, [0, 0, 0], [[R - 0.015, h - 0.02], [R - 0.05, h], [ri, h - 0.025]], n);
        for (let k = 0; k < n; k++) K.wrap(tread, 0, 0.02, h - 0.02, 0, R, { n, arc: 6.2832 / n, turn: k * 6.2832 / n, lift: -0.012, rot: 0 });
        K.lathe(flat(0x1c1c1e, 0.95), [0, 0, 0], [[ri, h - 0.025], [ri, 0.025]], n);
        K.lathe(flat(0x3a3a3c, 0.9), [0, 0, 0], [[R - 0.07, h + 0.0005], [R - 0.1, h + 0.0005]], n, { flip: false }); // the sidewall's lettering band
      }, { ry: turn });
      tyre(0, 0, 0, 0); tyre(0.185, 0.012, -0.008, 0.4); tyre(0.37, -0.008, 0.01, 1.1);
      dirtRing(K, 0x2c2c2e, 0, 0, 0.28, 0, 0.04, 12);
    },

    // ------------------------------------------------------------- the articulated desk lamp (0.114 x 0.432 x 0.264): shade towards +z
    desk_lamp: (K, B) => {
      const g = enamel(0x3a6a52), arm = chrome(0xb4babf), z0 = B.z0 + 0.055;
      K.cyl(g, 0, 0, z0, 0.052, 0.016, 10, { bevel: 0.004 }); K.cyl(arm, 0, 0.016, z0, 0.01, 0.02, 6);
      const a = [0, 0.036, z0], b = [0, 0.25, z0 - 0.03 + 0.0], c = [0, 0.4, z0 + 0.1];
      for (const s of [-1, 1]) { K.rod(arm, [s * 0.008, a[1], a[2]], [s * 0.008, b[1], b[2]], 0.004, 4); K.rod(arm, [s * 0.008, b[1], b[2]], [s * 0.008, c[1], c[2]], 0.004, 4); }
      K.cyl(plastic(0x26262a), -0.014, b[1], b[2], 0.01, 0.028, 6, { axis: 'x' }); K.cyl(plastic(0x26262a), -0.014, c[1], c[2], 0.01, 0.028, 6, { axis: 'x' });
      K.tube(metal(0x8a9094, 0), [[0.012, a[1] + 0.03, a[2] + 0.004], [0.012, b[1] - 0.05, b[2] + 0.012]], 0.004, 4); // a spring
      // the shade: a cone looking down and forward, the bulb glowing inside
      K.at([0, c[1], c[2]], () => {
        K.lathe(g, [0, 0, 0], [[0.018, 0], [0.022, 0.03], [0.05, 0.1]], 10); K.lathe(flat(0xe8e4d8, 0.4), [0, 0, 0], [[0.05, 0.1], [0.022, 0.03]], 10);
        K.cyl(g, 0, -0.012, 0, 0.018, 0.014, 8);
        K.glow(() => K.ball(flat(0xfff2cc), 0, 0.06, 0, 0.02, 0.026, 0.02, 6, 3));
      }, { rx: Math.PI * 0.72 });
    },

    // ------------------------------------------------------------- a fire extinguisher (0.168 x 0.48 x 0.15)
    extinguisher: (K, B) => {
      const red = enamel(0xc8302a), n = 10, r = 0.065, x = 0.012;
      K.lathe(red, [x, 0, 0], [[0, 0.008], [r * 0.85, 0.008], [r, 0.03], [r, 0.33], [r * 0.7, 0.375], [0.022, 0.39], [0.022, 0.405]], n);
      K.cyl(flat(0x26262a, 0.8), x, 0, 0, r * 0.9, 0.012, n);
      const lb = K.patch('shokaki', 64, 96, (V) => { V.fill(0xeeeae0); V.box(0, 84, 64, 96, 0xc8302a); V.box(0, 0, 64, 6, 0xc8302a); kana(K, V, '消火器', 24, 82, 0xc8302a, { size: 16, vert: true }); for (let k = 0; k < 3; k++) { V.disc(50, 66 - k * 20, 7, [0xf2efe6, 0xf2c21c, 0x3a7ad8][k]); V.ring(50, 66 - k * 20, 6, 7.5, 0x26221e); V.text5('ABC'[k], 50, 69 - k * 20, 0x26221e, { align: 'center' }); } smallPrint(V, 6, 22, 52, 5, 0x6a6a6a); }, { rough: 0.5 });
      K.wrap(lb, x, 0.08, 0.3, 0, r, { n, arc: (6.2832 / n) * 3 });
      // the head: valve, squeeze handles, the pin's yellow ring, the gauge, the hose clipped down the side
      K.cyl(metal(0x3a3a3e, 0.2), x, 0.405, 0, 0.018, 0.03, 6);
      K.box(metal(0x26262a, 0.2), x - 0.012, 0.432, -0.012, x + 0.07, 0.444, 0.012, { bevel: 0.003 }); K.at([x, 0.448, 0], () => K.box(metal(0x26262a, 0.2), -0.012, 0, -0.012, 0.075, 0.01, 0.012, { bevel: 0.003 }), { rz: 0.22 });
      K.torus(plastic(0xf2c21c), x + 0.002, 0.45, 0.02, 0.012, 0.003, 8, 3, { axis: 'z' });
      K.cyl(chrome(), x, 0.415, 0.016, 0.012, 0.008, 8, { axis: 'z' }); K.cyl(flat(0x3a9a4a, 0.4), x, 0.415, 0.0245, 0.009, 0.001, 8, { axis: 'z' });
      K.tube(rubber(0x26262a), [[x - 0.016, 0.42, 0], [B.x0 + 0.012, 0.4, 0], [B.x0 + 0.012, 0.16, 0.01]], 0.009, 5); K.cyl(plastic(0x26262a), B.x0 + 0.012, 0.1, 0.01, 0.012, 0.06, 6, { r1: 0.009 });
      K.box(metal(0x8a9094), B.x0 + 0.004, 0.22, -0.012, x - r + 0.004, 0.235, 0.022);
    },

    // ------------------------------------------------------------- folding pipe chair (0.43 x 0.79 x 0.39): seat towards +z
    pipe_chair: (K, B) => {
      const tb = chrome(0xa8aeb4), red = matte(0x9a2e2c, 0.15), hw = 0.2, zf = B.z1 - 0.02, zb = B.z0 + 0.02;
      K.sym((s) => {
        K.tube(tb, [[s * hw, 0.0, zf], [s * hw, 0.42, zb + 0.1], [s * hw * 0.92, 0.77, zb + 0.02]], 0.011, 6); // front leg rising into the back
        K.tube(tb, [[s * hw * 0.94, 0, zb], [s * hw * 0.94, 0.44, zf - 0.06]], 0.011, 6); // rear leg crossing to the seat front
        K.cyl(plastic(0xe8e4d8), s * hw, 0, zf, 0.013, 0.015, 6); K.cyl(plastic(0xe8e4d8), s * hw * 0.94, 0, zb, 0.013, 0.015, 6);
      });
      K.rod(tb, [-hw, 0.1, zf - 0.06], [hw, 0.1, zf - 0.06], 0.009, 5); K.rod(tb, [-hw * 0.94, 0.09, zb + 0.05], [hw * 0.94, 0.09, zb + 0.05], 0.009, 5);
      K.tube(tb, [[-hw * 0.92, 0.77, zb + 0.02], [-hw * 0.6, B.y1 - 0.012, zb + 0.015], [hw * 0.6, B.y1 - 0.012, zb + 0.015], [hw * 0.92, 0.77, zb + 0.02]], 0.011, 6);
      K.box(red, -hw + 0.012, 0.42, zb + 0.08, hw - 0.012, 0.455, zf - 0.03, { bevel: 0.012, edge: null });
      K.at([0, 0.64, zb + 0.05], () => K.box(red, -hw + 0.02, -0.08, -0.012, hw - 0.02, 0.09, 0.012, { bevel: 0.01, edge: null }), { rx: -0.2 });
      for (const x of [-0.12, 0.12]) K.cyl(metal(0x8a9094), x, 0.455, zf - 0.07, 0.006, 0.002, 5);
      K.box(flat(0xe8e4d8, 0.6), -0.05, 0.6, zb + 0.022, 0.05, 0.63, zb + 0.0235); // the school's property label on the back
    },

    // ------------------------------------------------------------- a round wooden stool (0.28 x 0.456 x 0.28)
    stool: (K, B) => {
      const w = 0xa8743e, H = B.y1, top = plankTex(K, w, 2);
      K.lathe(wood(w), [0, H - 0.035, 0], [[0, 0], [0.125, 0], [0.138, 0.012], [0.138, 0.028], [0.13, 0.035]], 12);
      const V = K.view('seat', { u: (p) => p[0], v: (p) => -p[2], u0: -0.14, u1: 0.14, v0: -0.14, v1: 0.14, ppm: 300, rough: 0.8 }, (V) => { const c = V.W / 2; V.fill(w); for (let r = 6; r < c; r += 6) V.ring(c + 3, c - 2, r, r + 1, darken(w, 0.16)); V.ring(c, c, c - 3, c, lighten(w, 0.16)); V.disc(c + 3, c - 2, 2, darken(w, 0.3)); });
      K.lathe(V, [0, H, 0], [[0.13, 0], [0, 0]], 12);
      for (let k = 0; k < 4; k++) {
        const a = k * 1.5708 + 0.785, cx = Math.cos(a), sz = Math.sin(a);
        K.tube(wood(darken(w, 0.08)), [[cx * 0.085, H - 0.03, sz * 0.085], [cx * 0.125, 0, sz * 0.125]], 0.016, 6, { radii: [0.017, 0.013] });
        const a2 = a + 1.5708, y = k % 2 ? 0.14 : 0.2, t = 1 - y / H, r1 = 0.085 + (0.125 - 0.085) * t;
        K.rod(wood(darken(w, 0.14)), [cx * r1, y, sz * r1], [Math.cos(a2) * r1, y, Math.sin(a2) * r1], 0.009, 5);
      }
      void top;
    },

    // ------------------------------------------------------------- the cat asleep in a mikan box (0.432 x 0.24 x 0.352)
    garage_cat: (K, B) => {
      const x0 = B.x0 + 0.02, x1 = B.x1 - 0.02, z0 = B.z0 + 0.03, z1 = B.z1 - 0.03;
      const lb = K.patch('mikan', 128, 40, (V) => { V.fill(CARD); kana(K, V, 'みかん', 30, 36, 0x3a8a4a, { size: 16, s: 2 }); V.disc(14, 20, 10, 0xe8842a); V.disc(12, 22, 3, 0xf2a85a); V.box(13, 30, 16, 33, 0x3a8a4a); V.hline(30, 122, 3, 0x3a8a4a); }, { rough: 0.9 });
      openCarton(K, x0, 0, z0, x1, 0.15, z1, { label: lb, labelSize: [0.3, 0.125], flap: 0.05 });
      K.box(fabric(0x8ab0c8), x0 + 0.01, 0.01, z0 + 0.01, x1 - 0.01, 0.06, z1 - 0.01, { bevel: 0.01, edge: null }); // an old towel
      // an orange tabby curled round: the body a fat crescent, head on its paws, the tail wrapped in front
      const O = matte(FUR.orange, 0.1), st = flat(0xc06a24, 0.9);
      blob(K, O, 0.01, 0.12, -0.02, 0.15, 0.075, 0.11, { fine: true, jit: 0.04, seed: 3, flatY: -0.7 });
      for (const [x, z] of [[-0.03, -0.05], [0.05, -0.06], [0.1, -0.01]]) blob(K, st, x, 0.178, z, 0.03, 0.02, 0.05, { seed: Math.round(x * 100), jit: 0.1 });
      K.at([-0.1, 0.13, 0.07], () => catHead(K, 0, 0, 0, 0.12, { base: FUR.orange, muzzle: 0xf2d8b8, ear: FUR.orange }, { eyes: 'shut' }), { ry: -0.5, rz: 0.2 });
      K.tube(O, [[0.13, 0.1, 0.02], [0.14, 0.09, 0.09], [0.06, 0.085, 0.125], [-0.02, 0.085, 0.12]], 0.02, 5, { radii: [0.022, 0.02, 0.018, 0.014] });
      K.box(matte(0xf2d8b8, 0.1), -0.06, 0.07, 0.09, 0.0, 0.1, 0.13, { bevel: 0.012, edge: null });
    },

    // ------------------------------------------------------------- a tin bucket, a wrung zōkin over its rim (0.273 x 0.287 x 0.287)
    bucket: (K, B) => {
      bucket(K, 0, 0, 0.0, 0.125, 0.23, { handle: 'down', n: 12, water: flat(0x7a9aa8, 0.2) });
      for (const y of [0.07, 0.16]) K.torus(metal(0x9aa0a4, 0.3), 0, y, 0, 0.1 + y * 0.115, 0.003, 12, 3);
      // the zōkin: a folded cloth, white gone grey with blue stitching, hung over the rim
      const z = flat(0xd8d4c8, 0.97), zx = -0.02;
      K.tube(z, [[zx, 0.14, 0.135], [zx, 0.235, 0.132], [zx, 0.245, 0.11], [zx, 0.17, 0.095]], 0.01, 4, { flat: [0.11, 0.012], up: [1, 0, 0] });
      for (const dx of [-0.035, 0, 0.035]) K.box(flat(0x5a82c8, 0.97), zx + dx - 0.002, 0.145, 0.1415, zx + dx + 0.002, 0.23, 0.1425);
      dirtRing(K, 0xaab0b4, 0, 0, 0.098, 0, 0.03, 12);
    },

    // ------------------------------------------------------------- three sacks of rice (0.472 x 0.368 x 0.312)
    rice_sack: (K, B) => {
      const sack = (y, c, dx, turn, kind) => K.at([dx, y, 0], () => {
        K.box(matte(c, 0.1), -0.215, 0, -0.14, 0.215, 0.115, 0.14, { bevel: 0.045, edge: null });
        for (const s of [-1, 1]) K.box(flat(darken(c, 0.12), 0.95), s * 0.215 - 0.012, 0.03, -0.11, s * 0.215 + 0.012, 0.085, 0.11); // the sewn ends
        const lb = K.patch('kome' + kind, 80, 40, (V) => { V.fill(c); if (kind === 0) { V.disc(18, 20, 13, 0xd8322a); kana(K, V, '米', 10, 29, 0xf2efe6, { size: 16 }); kana(K, V, 'お米', 38, 34, 0xd8322a, { size: 16 }); V.text5('10KG', 56, 12, 0x26221e, { align: 'center' }); } else if (kind === 1) { V.box(0, 14, 80, 22, 0x3a6ab8); kana(K, V, '新潟産', 40, 40, 0x3a6ab8, { size: 16, align: 'center' }); V.text5('KOSHI', 40, 10, 0x3a6ab8, { align: 'center' }); } else { V.frame(4, 4, 76, 36, 0x3a8a4a); mascot(V, 'suzume', 8, 28, {}, 2); V.text5('GENMAI', 52, 26, 0x3a8a4a, { align: 'center' }); V.text5('30KG', 52, 15, 0x26221e, { align: 'center' }); } }, { rough: 0.95 });
        K.face(lb, '+y', -0.15, -0.075, 0.15, 0.075, 0.1155); K.face(lb, '+z', -0.14, 0.02, 0.14, 0.1, 0.1405, { sub: [0, 0.25, 1, 0.8] });
      }, { ry: turn });
      sack(0, 0xc8a878, 0.01, 0.04, 2); sack(0.115, 0xe8e4d8, -0.012, -0.06, 1); sack(0.23, 0xeeeae0, 0.008, 0.05, 0);
    },

    // ------------------------------------------------------------- a box of gacha capsules, a few rolled out (0.48 x 0.344 x 0.432)
    capsule_crate: (K, B) => {
      const x0 = B.x0 + 0.06, x1 = B.x1 - 0.06, z0 = B.z0 + 0.07, z1 = B.z1 - 0.1;
      const lb = K.patch('gacha', 96, 40, (V) => { V.fill(CARD); kana(K, V, 'ガチャ', 48, 38, 0x3a2a22, { size: 16, s: 2, align: 'center' }); V.text5('100', 82, 10, 0xd8322a, { align: 'center' }); V.hline(8, 70, 5, 0x3a2a22); }, { rough: 0.9 });
      openCarton(K, x0, 0, z0, x1, 0.23, z1, { label: lb, labelSize: [0.3, 0.125], flap: 0.07 });
      const cols = [0xe84a3a, 0x3a7ad8, 0xf2c21c, 0x3a9a4a, 0xe86aa8, 0xe8842a, 0x8a5bd6, 0x2ab4c8];
      K.box(flat(0x8a6a48, 0.95), x0 + 0.008, 0.01, z0 + 0.008, x1 - 0.008, 0.2, z1 - 0.008);
      let k = 0;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const x = x0 + 0.045 + i * (x1 - x0 - 0.09) / 4, z = z0 + 0.04 + j * (z1 - z0 - 0.08) / 3; capsule(K, x + ((k * 0.37) % 1 - 0.5) * 0.02, 0.215 + ((k * 0.61) % 1) * 0.035, z, 0.034, cols[k % 8], { rx: (k * 1.7) % 3, rz: (k * 2.3) % 3 }); k++; }
      for (const [x, z, c] of [[B.x0 + 0.05, B.z1 - 0.05, 0], [B.x0 + 0.14, B.z1 - 0.04, 3], [B.x1 - 0.05, B.z1 - 0.06, 5], [B.x0 + 0.04, z0 + 0.1, 6]]) capsule(K, x, 0.034, z, 0.034, cols[c], { rx: 1.2 + c, rz: 0.7 * c });
    },

    // ------------------------------------------------------------- a row of little figures (0.375 x 0.16 x 0.09)
    shelf_figures: (K, B) => {
      const x0 = B.x0;
      // a tin robot
      let x = x0 + 0.04;
      K.box(metal(0xa8b0b8, 0.3), x - 0.024, 0.03, -0.016, x + 0.024, 0.085, 0.016, { bevel: 0.004 }); K.box(metal(0xb8c0c8, 0.3), x - 0.018, 0.09, -0.014, x + 0.018, 0.122, 0.014, { bevel: 0.004 });
      K.sym((s) => { K.box(paint(0xc8302a, 0.2), x + s * 0.012 - 0.008, 0, -0.012, x + s * 0.012 + 0.008, 0.03, 0.014); K.box(metal(0x8a9298, 0.3), x + s * 0.03 - 0.005, 0.045, -0.006, x + s * 0.03 + 0.005, 0.082, 0.006); K.glow(() => K.box(flat(0xf2c21c), x + s * 0.008 - 0.004, 0.104, 0.014, x + s * 0.008 + 0.004, 0.112, 0.0155)); });
      K.box(paint(0xc8302a, 0.2), x - 0.012, 0.045, 0.016, x + 0.012, 0.07, 0.018); K.cyl(metal(0x8a9298), x, 0.122, 0, 0.003, 0.016, 4);
      // a black lucky cat, a green kaiju, a kokeshi
      x = x0 + 0.13;
      K.ball(ceramic(0x26262a), x, 0.035, 0, 0.026, 0.035, 0.024, 7, 3); K.ball(ceramic(0x26262a), x, 0.083, 0, 0.024, 0.022, 0.022, 7, 3);
      K.sym((s) => K.prism(ceramic(0x26262a), [[x + s * 0.008, 0.096], [x + s * 0.022, 0.094], [x + s * 0.019, 0.112]], { plane: 'xy', a: -0.006, b: 0.006 }));
      K.cyl(flat(0xc8302a, 0.5), x, 0.062, 0, 0.02, 0.006, 7, { caps: false }); K.box(metal(0xd8a83a, 0.3), x - 0.008, 0.03, 0.022, x + 0.008, 0.05, 0.027, { bevel: 0.002 });
      for (const s of [-1, 1]) K.glow(() => K.box(flat(0xf2e06a), x + s * 0.009 - 0.004, 0.084, 0.0205, x + s * 0.009 + 0.004, 0.09, 0.022));
      x = x0 + 0.225;
      const gk = plastic(0x4a9a4a, 0.2);
      K.ball(gk, x, 0.045, 0, 0.028, 0.045, 0.026, 7, 3); K.ball(gk, x, 0.105, 0.008, 0.022, 0.02, 0.024, 7, 3);
      K.box(flat(0xe8d88a, 0.6), x - 0.014, 0.02, 0.022, x + 0.014, 0.07, 0.027, { bevel: 0.004, edge: null });
      for (let k = 0; k < 3; k++) K.prism(plastic(0xe8842a, 0.2), [[0.028 - k * 0.012, 0.07 + k * 0.025], [0.012 - k * 0.012, 0.07 + k * 0.025], [0.02 - k * 0.012 - 0.02, 0.092 + k * 0.025]].map(([z, y]) => [-z, y]), { plane: 'zy', a: x - 0.003, b: x + 0.003 });
      K.tube(gk, [[x, 0.03, -0.02], [x, 0.012, -0.04], [x + 0.01, 0.006, B.z0 + 0.006]], 0.012, 5, { r1: 0.004 });
      K.sym((s) => { K.box(gk, x + s * 0.014 - 0.008, 0, -0.008, x + s * 0.014 + 0.008, 0.016, 0.02); K.box(flat(0xf2efe6, 0.4), x + s * 0.008 - 0.003, 0.108, 0.03, x + s * 0.008 + 0.003, 0.114, 0.0315); });
      x = x0 + 0.325;
      K.lathe(paint(0xc8302a, 0.2), [x, 0, 0], [[0, 0], [0.02, 0], [0.024, 0.02], [0.022, 0.085], [0.014, 0.095]], 8); K.ball(flat(0xeed8b8, 0.6), x, 0.12, 0, 0.026, 0.026, 0.026, 8, 4);
      K.ball(flat(0x26221e, 0.5), x, 0.128, -0.003, 0.0265, 0.022, 0.026, 8, 3, { y0: 0.0 });
      const ks = K.patch('kokeshi', 16, 12, (V) => { V.fill(0xeed8b8); V.hline(3, 5, 7, 0x26221e); V.hline(10, 12, 7, 0x26221e); V.px(7, 4, 0xd8322a); V.px(8, 4, 0xd8322a); V.disc(3, 4, 1.5, 0xf0a8a8); V.disc(13, 4, 1.5, 0xf0a8a8); }, { rough: 0.6 });
      K.face(ks, '+z', x - 0.016, 0.106, x + 0.016, 0.13, 0.0245);
      for (const y of [0.03, 0.05]) flowerDots(K, x, y);
    },
  },
};
function flowerDots(K, x, y) { for (const dx of [-0.01, 0.008]) K.box(flat(0xf2efe6, 0.5), x + dx - 0.003, y, 0.0225, x + dx + 0.003, y + 0.006, 0.0245); }
