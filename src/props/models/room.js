// The flat above the shop (ids from src/data/props/room.js). The room builder (src/room/build.js) stands things on
// these, so the working heights are kept: the desk top at 0.72, the chabudai at 0.33, the TV rack at 0.39, the figure
// shelf's boards at 0.02 / 0.26 / 0.50, the ceiling lamp's lit shade in material slot 3 (it is switched off by slot).
// (room_cupnoodle is a product: src/products models it.)
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, plank, carton, bucket } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot, clockFace, louvres, plankTex } from '../kit/prints.js';
import { catHead, CALICO, FUR } from '../kit/animals.js';

const WHITE = 0xe6e2d8, WD = 0x8a5a36;
/** A sashiko-stitched indigo cover (shared). */
function indigo(K) { return K.patch('sashiko', 48, 48, (V) => { V.fill(0x2f4f9a); for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const x = i * 8 + (j % 2 ? 4 : 0), y = j * 8 + 3; V.px(x, y, 0xdfe6f2); V.px(x + 1, y + 1, 0xdfe6f2); V.px(x - 1, y + 1, 0xdfe6f2); V.px(x, y + 2, 0xdfe6f2); } }, { shared: true, rough: 0.97 }); }
function tileUV(K, V, facing, a0, b0, a1, b1, w, size) { const na = Math.max(1, Math.round(Math.abs(a1 - a0) / size)), nb = Math.max(1, Math.round(Math.abs(b1 - b0) / size)); for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) K.face(V, facing, a0 + (a1 - a0) * (i / na), b0 + (b1 - b0) * (j / nb), a0 + (a1 - a0) * ((i + 1) / na), b0 + (b1 - b0) * ((j + 1) / nb), w); }
/** Books on a shelf between x0..x1 (spines to +z). */
function books(K, x0, x1, y, z, seed, o = {}) {
  const pal = [0xe84a3a, 0x3a7ad8, 0xf2c21c, 0x3a9a4a, 0xe86aa8, 0xe8842a, 0x8a5bd6, 0xeeeae0, 0x2ab4c8];
  let x = x0, k = seed;
  while (x < x1 - 0.012) { const w = 0.014 + ((k * 0.37) % 1) * 0.02, h = (o.h ?? 0.2) * (0.78 + ((k * 0.61) % 1) * 0.22); if (x + w > x1) break; K.box(matte(pal[k % 9], 0.14), x, y, z - (o.d ?? 0.15), x + w, y + h, z, {}); K.box(flat(0xeeeae0, 0.8), x + w * 0.2, y + h * 0.62, z, x + w * 0.8, y + h * 0.8, z + 0.0008); x += w + 0.001; k++; }
}

export default {
  family: 'room',
  models: {
    // ------------------------------------------------------------- bedding
    room_futon: (K, B) => {
      const w = B.w / 2, ind = indigo(K);
      K.box(fabric(0xe8e4d8), -w + 0.02, 0, B.z0, w - 0.02, 0.09, B.z1, { bevel: 0.03, edge: null });
      K.use(fabric(0x2f4f9a), (G) => G.box(-w, 0.05, B.z0 + 0.42, w, 0.2, B.z1, { bevel: 0.05 })); tileUV(K, ind, '+y', -w + 0.05, B.z0 + 0.47, w - 0.05, B.z1 - 0.05, 0.2006, 0.25);
      K.box(fabric(0xe8e4d8), -w + 0.02, 0.16, B.z0 + 0.4, w - 0.02, 0.21, B.z0 + 0.56, { bevel: 0.02, edge: null }); // the turned-down sheet
      K.box(fabric(0xf2efe6), -0.26, 0.09, B.z0 + 0.06, 0.26, B.y1 - 0.06, B.z0 + 0.36, { bevel: 0.05, edge: null }); K.box(fabric(0xd8c8a0), -0.2, B.y1 - 0.07, B.z0 + 0.1, 0.2, B.y1 - 0.05, B.z0 + 0.32, { bevel: 0.01, edge: null });
    },
    bed_base: (K, B) => {
      K.box(fabric(0xe8e4d8), B.x0, 0, B.z0, B.x1, 0.09, B.z1, { bevel: 0.03, edge: null });
      for (const z of [B.z0 + 0.5, 0, B.z1 - 0.5]) K.box(flat(0xd4d0c4, 0.97), B.x0 + 0.03, 0.089, z - 0.004, B.x1 - 0.03, 0.0905, z + 0.004); // the quilting seams
      K.box(fabric(0xf2efe6), -0.26, 0.09, B.z0 + 0.06, 0.26, B.y1 - 0.03, B.z0 + 0.36, { bevel: 0.06, edge: null }); K.box(fabric(0xd8c8a0), -0.2, B.y1 - 0.045, B.z0 + 0.1, 0.2, B.y1 - 0.025, B.z0 + 0.32, { bevel: 0.01, edge: null });
    },
    bed_duvet_made: (K, B) => {
      K.use(fabric(0x2f4f9a), (G) => G.box(B.x0, 0.02, B.z0, B.x1, B.y1, B.z1, { bevel: 0.045 })); tileUV(K, indigo(K), '+y', B.x0 + 0.045, B.z0 + 0.045, B.x1 - 0.045, B.z1 - 0.045, B.y1 + 0.0006, 0.25);
      K.box(fabric(0xe8e4d8), B.x0 + 0.01, 0.06, B.z0 - 0.0, B.x1 - 0.01, B.y1 + 0.004, B.z0 + 0.16, { bevel: 0.02, edge: null });
    },
    bed_duvet_messy: (K, B) => {
      const uv = fabric(0x2f4f9a), dk = fabric(0x284488);
      blob(K, uv, -0.08, 0.14, 0.1, 0.5, 0.16, 0.6, { fine: true, jit: 0.2, seed: 5, flatY: -0.85 });
      blob(K, dk, 0.22, 0.12, -0.35, 0.34, 0.14, 0.34, { fine: true, jit: 0.22, seed: 8, flatY: -0.85 });
      blob(K, uv, -0.3, 0.2, 0.42, 0.26, B.y1 - 0.2, 0.28, { fine: true, jit: 0.2, seed: 12, flatY: -0.9 });
      K.sheet(fabric(0xe8e4d8), [B.x0 + 0.05, 0.03, B.z0 + 0.02], [0.3, 0.03, B.z0 + 0.06], [0.25, 0.1, B.z0 + 0.3], [B.x0 + 0.1, 0.09, B.z0 + 0.25]);
    },
    room_zabuton: (K, B) => {
      const c = 0xc8562e, w = B.w / 2 - 0.01;
      K.box(fabric(c), -w, 0, -w, w, B.y1 - 0.01, w, { bevel: 0.035, edge: null });
      for (const r of [0.2, 0.13]) for (const [a, b, cc, d] of [[-r, -r, r, -r + 0.006], [-r, r - 0.006, r, r], [-r, -r, -r + 0.006, r], [r - 0.006, -r, r, r]]) K.box(flat(darken(c, 0.14), 0.97), a, B.y1 - 0.0104, b, cc, B.y1 - 0.0096, d);
      K.box(flat(0xe8c040, 0.9), -0.012, B.y1 - 0.0104, -0.012, 0.012, B.y1 - 0.007, 0.012);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.cyl(flat(0xe8c040, 0.9), sx * (w - 0.01), 0.02, sz * (w - 0.01), 0.008, 0.03, 5);
    },
    // ------------------------------------------------------------- the calico plush (0.2 x 0.28 x 0.16)
    room_plush: (K) => {
      const W = fabric(FUR.white);
      K.box(W, -0.075, 0, -0.06, 0.075, 0.15, 0.06, { bevel: 0.045, edge: null });
      K.box(fabric(FUR.orange), -0.077, 0.02, -0.062, 0.0, 0.11, 0.0, { bevel: 0.035, edge: null }); K.box(fabric(FUR.black), 0.01, 0.06, -0.062, 0.077, 0.14, -0.01, { bevel: 0.03, edge: null });
      K.sym((s) => { K.box(W, s * 0.05 - 0.022, 0, 0.03, s * 0.05 + 0.022, 0.04, 0.085, { bevel: 0.015, edge: null }); K.box(W, s * 0.06 - 0.018, 0.07, 0.03, s * 0.06 + 0.018, 0.13, 0.07, { bevel: 0.014, edge: null }); });
      catHead(K, 0, 0.2, 0.01, 0.17, CALICO);
      K.cyl(fabric(0xc8302a), 0, 0.142, 0.01, 0.062, 0.014, 8, { caps: false }); K.ball(metal(0xd8a83a, 0.3), 0, 0.14, 0.072, 0.012, 0.012, 0.012, 6, 3);
      K.tube(fabric(FUR.orange), [[0.06, 0.02, -0.05], [0.09, 0.03, -0.02], [0.095, 0.06, 0.02]], 0.014, 5);
    },
    room_laundry: (K, B) => {
      blob(K, fabric(0x2f4f9a), -0.1, 0.045, 0.02, 0.15, 0.05, 0.14, { fine: true, jit: 0.2, seed: 3, flatY: -0.8 });
      blob(K, fabric(0xc8302a), 0.1, 0.04, -0.04, 0.12, 0.045, 0.12, { fine: true, jit: 0.2, seed: 7, flatY: -0.8 }); for (let k = 0; k < 3; k++) K.box(fabric(0xf2efe6), 0.03 + k * 0.05, 0.07, -0.13, 0.05 + k * 0.05, 0.086, 0.05);
      blob(K, fabric(0x8ac8e0), 0.08, 0.035, 0.12, 0.1, 0.04, 0.09, { fine: true, jit: 0.2, seed: 11, flatY: -0.8 });
      for (const [x, z, r] of [[B.x0 + 0.05, 0.02, 0.3], [B.x0 + 0.07, 0.06, -0.2]]) K.at([x, 0, z], () => { K.box(fabric(0xe8e4d8), -0.035, 0, -0.014, 0.035, 0.022, 0.014, { bevel: 0.008, edge: null }); K.box(fabric(0x8a8e94), 0.018, 0, -0.0145, 0.036, 0.0225, 0.0145, { bevel: 0.008, edge: null }); }, { ry: r });
    },

    // ------------------------------------------------------------- the study desk (1.11 x 0.91 x 0.57): top at 0.72, the knee hole to +z
    room_desk: (K, B) => {
      const w = B.w / 2, d = B.d / 2, T = 0.72, wt = paint(WHITE, 0.1);
      plank(K, 0xc8a05a, -w, T - 0.03, -d, w, T, d, { bevel: 0.005 });
      K.box(wt, -w + 0.01, 0, -d + 0.02, -w + 0.035, T - 0.03, d - 0.02); K.box(wt, -w + 0.035, 0.2, -d + 0.02, w - 0.36, T - 0.03, -d + 0.04); // left leg panel, the modesty board
      K.box(wt, w - 0.36, 0, -d + 0.02, w - 0.01, T - 0.03, d - 0.02, { bevel: 0.006 }); // the drawer pedestal
      for (let k = 0; k < 3; k++) { const y0 = 0.05 + k * 0.215; K.box(paint(0xdcd8cc, 0.1), w - 0.345, y0, d - 0.02, w - 0.025, y0 + 0.2, d - 0.012, { bevel: 0.004 }); K.box(chrome(0xb4babf), w - 0.22, y0 + 0.13, d - 0.012, w - 0.15, y0 + 0.145, d - 0.002); }
      K.box(flat(0xf4b0c0, 0.8), w - 0.14, 0.6, d - 0.0118, w - 0.08, 0.64, d - 0.0112); // a sticker on the top drawer
      // on top: a pen cup, a block of sticky notes, an eraser
      K.cyl(plastic(0x3a7ad8, 0.2), -w + 0.14, T, -d + 0.1, 0.035, 0.09, 8); for (const [dx, dz, c, h] of [[-0.01, 0, 0xe8b830, 0.17], [0.012, 0.01, 0xc8302a, 0.15], [0, -0.012, 0x26221e, 0.19]]) K.rod(flat(c, 0.6), [-w + 0.14 + dx, T + 0.01, -d + 0.1 + dz], [-w + 0.14 + dx * 2.5, T + h, -d + 0.1 + dz * 2.5], 0.004, 5);
      K.box(flat(0x3a9a6a, 0.9), -w + 0.2, T, -d + 0.06, -w + 0.29, T + 0.02, -d + 0.15); K.box(flat(0xe86aa8, 0.9), -w + 0.2, T + 0.02, -d + 0.06, -w + 0.29, T + 0.034, -d + 0.15); K.box(flat(0xf2c21c, 0.9), -w + 0.2, T + 0.034, -d + 0.06, -w + 0.29, T + 0.046, -d + 0.15);
    },
    // ------------------------------------------------------------- the swivel chair (0.55 x 0.89 x 0.6): a jacket over the back, seat to +z
    room_chair: (K, B) => {
      const bl = fabric(0x2f4f9a), blk = plastic(0x26262a, 0.15);
      for (let k = 0; k < 5; k++) { const a = k * 1.2566 + 0.3; K.tube(blk, [[0, 0.09, 0], [Math.sin(a) * 0.25, 0.05, Math.cos(a) * 0.25]], 0.016, 4, { flat: [0.03, 0.022] }); K.cyl(blk, Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25, 0.022, 0.045, 6); }
      K.cyl(chrome(0xb4babf), 0, 0.09, 0, 0.022, 0.3, 8); K.cyl(blk, 0, 0.36, 0, 0.05, 0.04, 8);
      K.box(bl, -0.23, 0.4, -0.2, 0.23, 0.48, 0.24, { bevel: 0.03, edge: null });
      K.at([0, 0.5, -0.22], () => { K.box(blk, -0.03, -0.1, -0.012, 0.03, 0.12, 0.012); K.box(bl, -0.21, 0.08, -0.03, 0.21, 0.38, 0.03, { bevel: 0.03, edge: null }); K.box(fabric(0x4a7a52), -0.23, 0.2, -0.045, 0.23, 0.385, 0.04, { bevel: 0.03, edge: null }); K.sym((s) => K.box(fabric(0x4a7a52), s * 0.2 - 0.04, 0.0, -0.05, s * 0.2 + 0.04, 0.32, -0.02, { bevel: 0.015, edge: null })); }, { rx: -0.12 });
      K.sym((s) => { K.tube(blk, [[s * 0.23, 0.42, -0.1], [s * 0.26, 0.6, -0.08], [s * 0.26, 0.6, 0.12]], 0.012, 4); K.box(blk, s * 0.26 - 0.025, 0.6, -0.1, s * 0.26 + 0.025, 0.625, 0.14, { bevel: 0.008 }); });
      void B;
    },
    // ------------------------------------------------------------- the colour-box bookshelf (0.44 x 0.91 x 0.33)
    room_bookshelf: (K, B) => {
      const w = B.w / 2, wt = paint(WHITE, 0.1), z0 = B.z0, z1 = B.z1 - 0.02;
      for (const s of [-1, 1]) K.box(wt, s * w - (s > 0 ? 0.016 : 0), 0, z0, s * w + (s > 0 ? 0 : 0.016), B.y1, z1); K.box(paint(0xd8d4c8, 0.1), -w + 0.016, 0, z0, w - 0.016, B.y1, z0 + 0.008);
      for (const y of [0, 0.3, 0.6, B.y1 - 0.016]) K.box(wt, -w + 0.016, y, z0, w - 0.016, y + 0.016, z1);
      books(K, -w + 0.02, 0.06, 0.016, z1 - 0.03, 1, { h: 0.24 }); K.box(plastic(0xe8842a, 0.2), 0.07, 0.016, z1 - 0.2, w - 0.025, 0.2, z1 - 0.03, { bevel: 0.01 }); K.box(flat(0xeeeae0, 0.6), 0.09, 0.07, z1 - 0.03, w - 0.045, 0.14, z1 - 0.029);
      books(K, -w + 0.02, w - 0.02, 0.316, z1 - 0.04, 5, { h: 0.22 });
      K.box(plastic(0x5ac8b0, 0.2), -w + 0.03, 0.616, z1 - 0.2, 0.0, 0.8, z1 - 0.03, { bevel: 0.01 }); books(K, 0.02, w - 0.06, 0.616, z1 - 0.04, 9, { h: 0.2 });
      K.cyl(flat(0xe8e6de, 0.4), w - 0.045, 0.616, z1 - 0.07, 0.022, 0.1, 7); K.cyl(plastic(0xc8302a), w - 0.045, 0.716, z1 - 0.07, 0.014, 0.02, 6); // a spray can
    },
    // ------------------------------------------------------------- the figure display shelf (0.72 x 0.76 x 0.21): boards at 0.02 / 0.26 / 0.50, back to the wall at -z
    room_figshelf: (K, B) => {
      const w = B.w / 2, wt = paint(WHITE, 0.1), z0 = B.z0, z1 = B.z1;
      K.box(paint(0xd8d4c8, 0.1), -w, 0, z0, w, B.y1, z0 + 0.012);
      for (const s of [-1, 1]) K.box(wt, s * w - (s > 0 ? 0.016 : 0), 0, z0, s * w + (s > 0 ? 0 : 0.016), B.y1, z1 - 0.01, { bevel: 0.003 });
      for (const y of [0.02, 0.26, 0.5]) K.box(wt, -w + 0.016, y - 0.018, z0, w - 0.016, y, z1, { bevel: 0.003 });
      K.box(wt, -w, B.y1 - 0.02, z0, w, B.y1, z1 - 0.01, { bevel: 0.003 });
      K.glow(() => K.box(flat(0xf6f2e2), -w + 0.05, B.y1 - 0.026, z0 + 0.03, w - 0.05, B.y1 - 0.02, z0 + 0.05)); // a strip light under the top
    },
    // ------------------------------------------------------------- the chabudai (0.75 across): top at 0.33
    room_table: (K, B) => {
      const R = B.w / 2, w = 0x8a5a36;
      K.lathe(wood(w), [0, 0.3, 0], [[0, 0], [R - 0.02, 0], [R, 0.012], [R, 0.03]], 16);
      const V = K.view('top', { u: (p) => p[0], v: (p) => -p[2], u0: -R, u1: R, v0: -R, v1: R, ppm: 190, rough: 0.7 }, (V) => { const c = V.W / 2; V.fill(w); for (let j = 0; j < V.H; j++) for (let i = 0; i < V.W; i++) { const d = Math.hypot(i - c, j - c); if (d < c) { const g = Math.sin(j * 0.55 + Math.sin(i * 0.05) * 3); if (g > 0.86) V.px(i, j, darken(w, 0.14)); else if (g < -0.93) V.px(i, j, lighten(w, 0.1)); if (d > c - 3) V.px(i, j, lighten(w, 0.16)); } } V.ring(c * 0.7, c * 1.2, 9, 11, darken(w, 0.1)); });
      K.lathe(V, [0, 0.33, 0], [[R, 0], [0, 0]], 16);
      for (let k = 0; k < 4; k++) { const a = k * 1.5708 + 0.785; K.tube(wood(darken(w, 0.1)), [[Math.cos(a) * 0.24, 0.3, Math.sin(a) * 0.24], [Math.cos(a) * 0.27, 0, Math.sin(a) * 0.27]], 0.022, 6, { r1: 0.016 }); }
      K.at([0.1, 0.33, 0.14], () => { K.box(plastic(0x26262a, 0.15), -0.022, 0, -0.07, 0.022, 0.016, 0.07, { bevel: 0.005 }); for (let k = 0; k < 6; k++) K.box(flat(k ? 0x8a8e92 : 0xc8302a, 0.6), -0.014 + (k % 2) * 0.016, 0.016, -0.055 + Math.floor(k / 2) * 0.03, -0.004 + (k % 2) * 0.016, 0.019, -0.04 + Math.floor(k / 2) * 0.03); }, { ry: 0.5 });
      void B;
    },
    // ------------------------------------------------------------- the TV rack (0.72 x 0.39 x 0.36): the video deck, tapes, game carts
    room_tvrack: (K, B) => {
      const w = B.w / 2, z0 = B.z0, z1 = B.z1, T = B.y1;
      plank(K, WD, -w, T - 0.022, z0, w, T, z1, { bevel: 0.004 }); plank(K, WD, -w, 0, z0, w, 0.022, z1, { v: 1 });
      for (const s of [-1, 1]) plank(K, WD, s * w - (s > 0 ? 0.022 : 0), 0.022, z0, s * w + (s > 0 ? 0 : 0.022), T - 0.022, z1, { axis: 'y', v: 2 });
      plank(K, darken(WD, 0.12), -w + 0.022, 0.022, z0, w - 0.022, T - 0.022, z0 + 0.012, { v: 1 }); plank(K, WD, -w + 0.022, 0.19, z0 + 0.012, w - 0.022, 0.206, z1 - 0.02, { v: 0 });
      K.box(plastic(0x26262a, 0.15), -0.25, 0.206, z1 - 0.3, 0.2, 0.29, z1 - 0.04, { bevel: 0.006 }); K.box(flat(0x16181a, 0.4), -0.2, 0.235, z1 - 0.04, 0.02, 0.265, z1 - 0.039); K.glow(() => K.box(flat(0x5ae87a), 0.08, 0.24, z1 - 0.04, 0.16, 0.258, z1 - 0.039));
      books(K, -w + 0.03, -0.02, 0.022, z1 - 0.04, 3, { h: 0.15, d: 0.12 });
      for (let k = 0; k < 5; k++) K.box(plastic([0x8a8e94, 0xc8302a, 0xe8b830, 0x8a8e94, 0x3a7ad8][k], 0.2), 0.02 + k * 0.055, 0.022, z1 - 0.16, 0.065 + k * 0.055, 0.14, z1 - 0.05, { bevel: 0.004 });
    },
    // ------------------------------------------------------------- the home console, two pads and a cartridge on the floor (0.365 x 0.135 x 0.375)
    room_console: (K, B) => {
      const wt = plastic(0xe8e4d8, 0.12), red = plastic(0xb82a2a, 0.2), x0 = B.x0, z0 = B.z0;
      K.box(wt, x0, 0, z0, x0 + 0.24, 0.05, z0 + 0.19, { bevel: 0.008 }); K.box(red, x0 + 0.03, 0.05, z0 + 0.03, x0 + 0.21, 0.06, z0 + 0.13, { bevel: 0.003 });
      K.box(plastic(0x4a6aa8, 0.2), x0 + 0.07, 0.06, z0 + 0.05, x0 + 0.17, B.y1, z0 + 0.075, { bevel: 0.004 }); K.box(flat(0xe8b830, 0.6), x0 + 0.08, 0.085, z0 + 0.075, x0 + 0.16, 0.125, z0 + 0.0756); // the cartridge standing in its slot
      K.box(red, x0 + 0.03, 0.05, z0 + 0.15, x0 + 0.08, 0.058, z0 + 0.175); K.box(red, x0 + 0.16, 0.05, z0 + 0.15, x0 + 0.21, 0.058, z0 + 0.175);
      const pad = (x, z, ry) => K.at([x, 0, z], () => { K.box(red, -0.06, 0, -0.025, 0.06, 0.016, 0.025, { bevel: 0.005 }); K.box(metal(0xc8a84a, 0.3), -0.055, 0.016, -0.02, 0.055, 0.0172, 0.02); K.box(flat(0x26221e, 0.5), -0.045, 0.0172, -0.004, -0.021, 0.021, 0.004); K.box(flat(0x26221e, 0.5), -0.037, 0.0172, -0.012, -0.029, 0.021, 0.012); for (const dx of [0.025, 0.043]) K.cyl(flat(0x26221e, 0.5), dx, 0.0172, 0, 0.007, 0.003, 6); }, { ry });
      pad(B.x1 - 0.1, z0 + 0.25, 0.4); pad(x0 + 0.1, B.z1 - 0.04, -0.2);
      K.tube(flat(0x3a3a3e, 0.8), [[x0 + 0.12, 0.02, z0 + 0.19], [x0 + 0.16, 0.004, z0 + 0.26], [B.x1 - 0.14, 0.004, z0 + 0.24]], 0.003, 4); K.tube(flat(0x3a3a3e, 0.8), [[x0 + 0.08, 0.02, z0 + 0.19], [x0 + 0.06, 0.004, z0 + 0.28], [x0 + 0.1, 0.004, B.z1 - 0.065]], 0.003, 4);
    },
    // ------------------------------------------------------------- the kitchenette (1.22 x 1.13 x 0.6): sink to the left, the gas ring and kettle to the right
    room_kitchen: (K, B) => {
      const w = B.w / 2, d = B.d / 2, T = 0.86, wt = paint(WHITE, 0.1);
      K.box(wt, -w, 0.08, -d, w, T - 0.03, d - 0.02, { bevel: 0.006 }); K.box(flat(0x3a3a3e, 0.8), -w + 0.02, 0, -d + 0.04, w - 0.02, 0.08, d - 0.06);
      K.box(metal(0xb8bec4, 0.35), -w, T - 0.03, -d, w, T, d, { bevel: 0.006 }); // the steel top
      for (let k = 0; k < 3; k++) { const x0 = -w + 0.02 + k * 0.395; K.box(paint(0xdcd8cc, 0.1), x0, 0.1, d - 0.02, x0 + 0.38, T - 0.06, d - 0.008, { bevel: 0.004 }); K.box(chrome(0xb4babf), x0 + 0.31, 0.42, d - 0.008, x0 + 0.33, 0.52, d + 0.004); }
      K.box(flat(0xc8302a, 0.6), w - 0.2, 0.5, d - 0.0078, w - 0.1, 0.62, d - 0.0072); K.box(flat(0xeeeae0, 0.6), w - 0.19, 0.53, d - 0.0072, w - 0.11, 0.56, d - 0.0066); // the gas company's sticker
      // the sink, its tap, a sponge and washing-up liquid
      K.use(metal(0x8a9096, 0.35), (G) => G.box(-w + 0.06, T - 0.14, -d + 0.1, -0.06, T + 0.001, d - 0.08, { inward: true, skip: ['py'] }));
      K.tube(chrome(0xb4babf), [[-0.32, T, -d + 0.06], [-0.32, T + 0.2, -d + 0.06], [-0.32, T + 0.22, -d + 0.2], [-0.32, T + 0.17, -d + 0.22]], 0.012, 6); K.box(chrome(0xb4babf), -0.36, T + 0.06, -d + 0.045, -0.28, T + 0.075, -d + 0.075);
      K.lathe(plastic(0x3a9a52, 0.2), [-0.12, T, -d + 0.07], [[0, 0], [0.025, 0], [0.025, 0.1], [0.01, 0.13], [0.01, 0.15], [0, 0.15]], 7); K.box(matte(0xe8c84a, 0.15), -0.02, T, d - 0.07, 0.05, T + 0.025, d - 0.03, { bevel: 0.006 });
      // the single ring and the kettle
      K.box(enamel(0x4a4a4e), 0.14, T, -d + 0.08, w - 0.06, T + 0.05, d - 0.08, { bevel: 0.008 }); K.torus(metal(0x26262a, 0.3), 0.35, T + 0.055, 0, 0.06, 0.006, 8, 3); for (let k = 0; k < 4; k++) { const a = k * 1.5708; K.box(metal(0x26262a, 0.3), 0.35 + Math.cos(a) * 0.05 - 0.005, T + 0.05, Math.sin(a) * 0.05 - 0.005, 0.35 + Math.cos(a) * 0.11 + 0.005, T + 0.064, Math.sin(a) * 0.11 + 0.005); }
      K.cyl(plastic(0x26262a), 0.35, T + 0.025, d - 0.08, 0.018, 0.014, 8, { axis: 'z' });
      const ke = enamel(0xe8b830);
      K.lathe(ke, [0.35, T + 0.064, 0], [[0, 0], [0.075, 0], [0.09, 0.02], [0.085, 0.08], [0.05, 0.11], [0, 0.11]], 10); K.cyl(plastic(0x26262a), 0.35, T + 0.174, 0, 0.012, 0.016, 6); K.tube(ke, [[0.43, T + 0.1, 0], [0.47, T + 0.15, 0], [0.485, T + 0.17, 0]], 0.012, 5, { r1: 0.008 }); K.tube(plastic(0x26262a), K.arc([0.35, T + 0.15, 0], 0.066, 0.2, 2.94, 6, 'xy'), 0.006, 4);
      void B;
    },
    // ------------------------------------------------------------- the wall air conditioner (0.8 x 0.28 x 0.23): back to the wall at -z
    room_ac: (K, B) => {
      const w = B.w / 2, wt = plastic(WHITE, 0.1);
      K.box(wt, -w, 0.03, B.z0, w, B.y1, B.z1 - 0.02, { bevel: 0.022 });
      K.box(plastic(0xdcd8cc, 0.1), -w + 0.02, 0, B.z0 + 0.04, w - 0.02, 0.05, B.z1 - 0.04, { bevel: 0.01 }); K.box(flat(0x4a4c52, 0.7), -w + 0.05, 0.012, B.z1 - 0.045, w - 0.05, 0.03, B.z1 - 0.039); // the louvre
      for (let k = 0; k < 5; k++) K.box(flat(0xc8c4b8, 0.8), -w + 0.04, 0.12 + k * 0.026, B.z1 - 0.02, w - 0.04, 0.126 + k * 0.026, B.z1 - 0.0192); // intake slats
      K.box(flat(0x8a9aa8, 0.6), -w + 0.05, 0.07, B.z1 - 0.02, -w + 0.16, 0.09, B.z1 - 0.0192); K.glow(() => K.box(flat(0x5ae87a), w - 0.09, 0.07, B.z1 - 0.02, w - 0.075, 0.08, B.z1 - 0.0192));
    },
    // ------------------------------------------------------------- the ceiling lamp (0.53 x 0.56 x 0.53): hung by its top; the lit shade is slot 3
    room_lamp: (K, B) => {
      const top = B.y1;
      K.cyl(plastic(WHITE, 0.1), 0, top - 0.03, 0, 0.06, 0.03, 10); K.cyl(flat(0x3a3a3e, 0.6), 0, top - 0.2, 0, 0.006, 0.17, 5);
      K.glow(() => K.lathe(flat(0xf6f0dc), [0, 0.2, 0], [[0, 0], [0.2, 0], [0.26, 0.05], [0.26, 0.09], [0.16, 0.15], [0, 0.16]], 14));
      K.lathe(wood(0x8a5a36), [0, 0.2, 0], [[0.262, 0.045], [0.266, 0.07], [0.262, 0.095]], 14); // the wooden hoop round the shade
      K.rod(flat(0xe8e4d8, 0.8), [0.06, 0.2, 0.05], [0.06, 0.03, 0.05], 0.002, 3); K.cyl(plastic(0xc8302a), 0.06, 0, 0.05, 0.008, 0.03, 6);
    },
    room_trash: (K, B) => {
      bucket(K, 0, 0, 0, B.w / 2 - 0.008, B.y1 - 0.03, { c: plastic(0x5ab0d8, 0.2), handle: false, n: 10, taper: 0.8 });
      blob(K, matte(0xe8e6de, 0.1), 0.01, B.y1 - 0.06, 0, 0.07, 0.05, 0.07, { seed: 3, jit: 0.3 }); K.box(flat(0xc8302a, 0.6), -0.03, B.y1 - 0.06, -0.02, 0.01, B.y1 - 0.004, 0.02, { bevel: 0.006, edge: null });
    },
    // ------------------------------------------------------------- the room's wall clock (0.285 across): back to the wall at -z
    room_clock: (K, B) => {
      const R = 0.14, cy = B.h / 2;
      K.lathe(plastic(0x3a7a5a, 0.2), [0, cy, B.z0], [[0, 0], [R, 0], [R, 0.03], [R - 0.012, 0.038], [R - 0.02, 0.038]], 16, { axis: 'z' });
      const F = K.patch('dial', 96, 96, (V) => clockFace(V, 7, 12, { bg: 0xf2efe6, rim: 0x3a7a5a, ink: 0x26221e, sec: 24 }), { rough: 0.5 });
      K.lathe(flat(0xf2efe6, 0.5), [0, cy, B.z0], [[R - 0.02, 0.03], [0, 0.03]], 16, { axis: 'z' }); K.face(F, '+z', -R + 0.022, cy - R + 0.022, R - 0.022, cy + R - 0.022, B.z0 + 0.0306);
    },
    room_shoes: (K, B) => {
      const shoe = (x, z, ry) => K.at([x, 0, z], () => { K.prism(rubber(0xe8e4d8), [[-0.04, -0.11], [0.04, -0.11], [0.045, 0.06], [0.03, 0.12], [-0.03, 0.12], [-0.045, 0.06]], { plane: 'xz', a: 0, b: 0.02 }); K.box(fabric(0xc8302a), -0.04, 0.02, -0.105, 0.04, 0.075, 0.02, { bevel: 0.02, edge: null }); K.box(fabric(0xc8302a), -0.038, 0.02, 0.0, 0.038, 0.05, 0.11, { bevel: 0.018, edge: null }); K.box(fabric(0xf2efe6), -0.026, 0.045, 0.01, 0.026, 0.056, 0.085, { bevel: 0.004, edge: null }); K.box(flat(0x26221e, 0.9), -0.03, 0.068, -0.09, 0.03, 0.0755, -0.02); for (let k = 0; k < 3; k++) K.box(flat(0xf2efe6, 0.9), -0.022, 0.056, 0.02 + k * 0.02, 0.022, 0.058, 0.026 + k * 0.02); }, { ry });
      shoe(B.x0 + 0.055, 0.0, 0.12); shoe(B.x1 - 0.06, 0.02, -0.25);
    },
    // ------------------------------------------------------------- a shirt on a hanger (0.48 x 0.68 x 0.05)
    room_hanger: (K, B) => {
      const top = B.y1, sh = 0x3a8ad8;
      K.tube(metal(0x8a9094, 0.3), [[0, top - 0.06, 0], [0, top - 0.03, 0], [0.02, top - 0.012, 0], [0.04, top - 0.03, 0]], 0.004, 4);
      K.tube(wood(0xb8905a), [[-0.2, top - 0.13, 0], [0, top - 0.06, 0], [0.2, top - 0.13, 0]], 0.008, 5);
      const V = K.patch('aloha', 56, 64, (V) => { V.fill(sh); for (let k = 0; k < 14; k++) { const i = 4 + ((k * 0.37) % 1) * 48, j = 4 + ((k * 0.61) % 1) * 56; V.disc(i, j, 3, k % 2 ? 0xf2efe6 : 0x5ac86a); V.px(Math.round(i), Math.round(j), 0xf2c21c); } V.vline(28, 0, 63, darken(sh, 0.25)); for (let j = 8; j < 60; j += 10) V.px(29, j, 0xf2efe6); }, { rough: 0.97 });
      K.prism(fabric(sh), [[-0.17, 0], [0.17, 0], [0.18, top - 0.2], [0.235, top - 0.25], [0.2, top - 0.1], [0.05, top - 0.07], [0, top - 0.11], [-0.05, top - 0.07], [-0.2, top - 0.1], [-0.235, top - 0.25], [-0.18, top - 0.2]], { plane: 'xy', a: -0.016, b: 0.016 });
      K.face(V, '+z', -0.17, 0.005, 0.17, top - 0.12, 0.0166);
    },
    // ------------------------------------------------------------- moving boxes never unpacked (0.5 x 0.57 x 0.37)
    room_boxes: (K, B) => {
      const l1 = K.patch('hon', 64, 28, (V) => { V.fill(0xc49a62); kana(K, V, '本・マンガ', 32, 26, 0x26221e, { size: 16, align: 'center' }); V.hline(6, 58, 4, 0x26221e); }, { rough: 0.9 });
      const l2 = K.patch('ware', 64, 28, (V) => { V.fill(0xc49a62); V.box(4, 4, 28, 24, 0xc8302a); kana(K, V, '割', 8, 22, 0xf2efe6, { size: 16 }); V.text5('FRAGILE', 46, 18, 0xc8302a, { align: 'center' }); }, { rough: 0.9 });
      carton(K, B.x0, 0, B.z0, B.x1, 0.3, B.z1, { label: l1, labelSize: [0.3, 0.13] });
      K.at([0.02, 0.301, 0.0], () => carton(K, -0.2, 0, -0.16, 0.2, B.y1 - 0.305, 0.16, { label: l2, labelSize: [0.28, 0.12], c: 0xc8a06a }), { ry: 0.12 });
    },
    room_mug: (K, B) => {
      const cx = B.x0 + 0.042, R = 0.04;
      K.ring(ceramic(0xeeeae0), cx, 0, 0, R, R - 0.005, B.y1, 10, { inside: flat(0xd8d4c8, 0.5) }); K.lathe(ceramic(0xeeeae0), [cx, 0, 0], [[0, 0], [R, 0]], 10); K.lathe(flat(0x6a4a2a, 0.3), [cx, B.y1 - 0.016, 0], [[R - 0.005, 0], [0, 0]], 10);
      K.tube(ceramic(0xeeeae0), [[cx + R - 0.004, B.y1 - 0.02, 0], [B.x1 - 0.008, B.y1 - 0.025, 0], [B.x1 - 0.008, 0.03, 0], [cx + R - 0.004, 0.022, 0]], 0.007, 5);
      const fc = K.patch('face', 24, 12, (V) => { V.fill(0xeeeae0); V.box(4, 6, 7, 9, 0xc8302a); V.box(17, 6, 20, 9, 0xc8302a); V.hline(9, 14, 3, 0x26221e); V.px(8, 4, 0x26221e); V.px(15, 4, 0x26221e); }, { rough: 0.4 });
      K.wrap(fc, cx, 0.02, 0.07, 0, R, { n: 10, arc: 1.26 });
    },
    room_phone: (K, B) => {
      const wt = plastic(0xe8e4d8, 0.12);
      K.prism(wt, [[B.z0, 0], [B.z1, 0], [B.z1, 0.02], [B.z0 + 0.03, 0.05], [B.z0, 0.05]], { plane: 'zy', a: B.x0, b: B.x1 - 0.03 });
      K.at([-0.02, 0.036, 0.02], () => { K.box(wt, -0.03, 0, -0.07, 0.03, 0.022, 0.08, { bevel: 0.008 }); K.glow(() => K.box(flat(0x8ae8a0), -0.02, 0.022, -0.055, 0.02, 0.0226, -0.03)); for (let k = 0; k < 12; k++) K.box(flat(0x8a8e94, 0.6), -0.02 + (k % 3) * 0.015, 0.022, -0.02 + Math.floor(k / 3) * 0.018, -0.01 + (k % 3) * 0.015, 0.0245, -0.008 + Math.floor(k / 3) * 0.018); }, { rx: 0.28 });
      K.box(wt, B.x1 - 0.03, 0, B.z0, B.x1, 0.05, B.z0 + 0.06, { bevel: 0.006 }); K.rod(plastic(0xc8302a), [B.x1 - 0.015, 0.05, B.z0 + 0.03], [B.x1 - 0.015, B.y1, B.z0 + 0.03], 0.008, 5);
    },
  },
};
