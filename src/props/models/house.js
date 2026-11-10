// The house across the road (house_front, src/data/props/street.js): the museum's backdrop, a two-storey Shōwa
// house front as the lane builds them: a concrete footing, charred cedar boards under cream plaster, an aluminium
// sliding front door under its little tin hood, a barred kitchen window, the outdoor unit of the air conditioner, a tiled
// skirt roof between the floors, a balcony with the futon out to air, and the kawara roof with its gutter and downpipe.
// 6.16 x 6.72 x 1.28 m, facing +z.
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken } from '../kit/kit.js';
import { plank, pot } from '../kit/shapes.js';
import { kana, framed, louvres } from '../kit/prints.js';
import { leaves } from '../kit/foliage.js';

const PLASTER = 0xd8ccb0, CEDAR = 0x4a3c34, ALU = 0xb4b8ba, TILE = 0x5a6670;

export default {
  family: 'house',
  models: {
    house_front: (K, B) => {
      const X = B.x1, Zf = 0.25, Zb = B.z0, y1 = 2.75, y2 = 5.45;
      const alu = metal(ALU, 0.25), conc = stone(0xa8a49a, 0.1);
      // the box of the house: footing, cedar skirt, plaster above, the corner trims
      K.box(conc, -X, 0, Zb, X, 0.32, Zf + 0.03, { bevel: 0.015 });
      K.box(matte(PLASTER, 0.08), -X + 0.02, 0.32, Zb, X - 0.02, y2, Zf, { bevel: 0.01 });
      const ced = K.patch('cedar', 32, 32, (V) => { V.fill(CEDAR); for (let i = 0; i < 32; i += 4) { V.vline(i, 0, 31, darken(CEDAR, 0.3)); V.vline(i + 1, 0, 31, lighten(CEDAR, 0.08)); } }, { rough: 0.9 });
      for (let k = 0; k < 6; k++) { const xa = -X + 0.02 + k * ((2 * X - 0.04) / 6); K.face(ced, '+z', xa, 0.32, xa + (2 * X - 0.04) / 6, 1.0, Zf + 0.012); }
      K.box(wood(darken(CEDAR, 0.1)), -X + 0.02, 1.0, Zf, X - 0.02, 1.04, Zf + 0.025);
      K.box(wood(darken(CEDAR, 0.1)), -X + 0.02, 0.32, Zf, X - 0.02, 1.0, Zf + 0.01);
      for (const s of [-1, 1]) K.box(wood(0x6a5040), s * X - (s > 0 ? 0.08 : 0), 0.32, Zf - 0.02, s * X + (s > 0 ? 0 : 0.08), y2, Zf + 0.03);
      // a few rain stains under the sills, painted by hand
      const stain = K.patch('stain', 16, 32, (V) => { V.fill(PLASTER); for (const [i, l] of [[3, 20], [6, 28], [9, 14], [12, 24]]) for (let j = 31; j > 31 - l; j--) V.px(i + ((31 - j) % 7 === 3 ? 1 : 0), j, darken(PLASTER, 0.12 + (31 - j) / 400)); }, { rough: 0.9 });
      K.face(stain, '+z', 0.4, 0.55, 0.62, 0.98, Zf + 0.004); K.face(stain, '+z', 0.9, 0.1 + y1, 1.12, y1 + 0.35 + 0.1, Zf + 0.004);
      // the front door: two aluminium sliding leaves of frosted glass with bars, a tin hood, the step, a nameplate, the post box
      const dx0 = -2.55, dx1 = -1.15, dy0 = 0.34, dy1 = 2.18;
      K.box(alu, dx0 - 0.05, dy0 - 0.02, Zf, dx1 + 0.05, dy1 + 0.05, Zf + 0.06);
      K.box(flat(0x2a2a2a, 0.9), dx0, dy0, Zf + 0.01, dx1, dy1, Zf + 0.061);
      for (let l = 0; l < 2; l++) {
        const a = dx0 + l * (dx1 - dx0) / 2 + (l ? -0.02 : 0), b = a + (dx1 - dx0) / 2 + 0.02, z = Zf + 0.07 - l * 0.03;
        for (const [p, q, r, t] of [[a, dy0, b, dy0 + 0.06], [a, dy1 - 0.05, b, dy1], [a, dy0, a + 0.04, dy1], [b - 0.04, dy0, b, dy1]]) K.box(alu, p, q, z - 0.025, r, t, z);
        K.glass(() => K.box(K.tint(0xdce4e2, 170, 0.3), a + 0.04, dy0 + 0.06, z - 0.016, b - 0.04, dy1 - 0.05, z - 0.01, { bevel: 0 }));
        for (let k = 1; k < 6; k++) K.box(alu, a + 0.04, dy0 + 0.06 + k * (dy1 - dy0 - 0.11) / 6, z - 0.02, b - 0.04, dy0 + 0.075 + k * (dy1 - dy0 - 0.11) / 6, z - 0.006);
        K.box(metal(0x6a6e72), l ? a + 0.06 : b - 0.08, 1.05, z - 0.005, l ? a + 0.08 : b - 0.06, 1.25, z + 0.008);
      }
      K.box(conc, dx0 - 0.25, 0, Zf, dx1 + 0.25, 0.18, B.z1 - 0.06, { bevel: 0.01 });
      K.prism(metal(0x8a9094, 0.2), [[Zf, dy1 + 0.25], [B.z1 - 0.06, dy1 + 0.12], [B.z1 - 0.06, dy1 + 0.1], [Zf, dy1 + 0.22]], { plane: 'zy', a: dx0 - 0.3, b: dx1 + 0.3 });
      K.sym((s) => K.rod(metal(0x6a6e72), [s > 0 ? dx1 + 0.25 : dx0 - 0.25, dy1 + 0.2, Zf], [s > 0 ? dx1 + 0.25 : dx0 - 0.25, dy1 + 0.12, B.z1 - 0.1], 0.01, 4));
      const name = K.patch('nameplate', 16, 40, (V) => { V.fill(0xd8c8a0); V.frame(0, 0, 16, 40, 0x8a6a44); kana(K, V, '佐野', 1, 37, 0x2a2018, { size: 14, vert: true }); }, { rough: 0.8 });
      K.box(wood(0xd8c8a0), dx1 + 0.12, 1.45, Zf, dx1 + 0.2, 1.65, Zf + 0.02); K.face(name, '+z', dx1 + 0.125, 1.455, dx1 + 0.195, 1.645, Zf + 0.0205);
      K.box(enamel(0x8a3a2a), dx1 + 0.1, 1.0, Zf, dx1 + 0.4, 1.32, Zf + 0.12, { bevel: 0.012 }); K.box(flat(0x2a1a14, 0.8), dx1 + 0.16, 1.24, Zf + 0.12, dx1 + 0.34, 1.26, Zf + 0.122);
      // two pots of geraniums by the door
      for (const [x, r] of [[dx0 - 0.2, 0.13], [dx1 + 0.55, 0.11]]) { const ys = pot(K, x, 0, Zf + 0.25, r, r * 1.3, { n: 10 }); leaves(K, (t, F) => F.shrub(t, x, ys - 0.01, Zf + 0.25, r * 1.05, 'small', { seed: Math.round(x * 10), card: 0.14 })); }
      // the kitchen window: frosted glass behind a grille of bars, a sill, and the air conditioner's outdoor unit below
      const wx0 = 0.25, wx1 = 1.95, wy0 = 1.15, wy1 = 2.15;
      K.box(alu, wx0 - 0.04, wy0 - 0.04, Zf, wx1 + 0.04, wy1 + 0.04, Zf + 0.05);
      K.glass(() => K.box(K.tint(0xdce4e2, 180, 0.3), wx0, wy0, Zf + 0.02, wx1, wy1, Zf + 0.026, { bevel: 0 }));
      K.box(alu, (wx0 + wx1) / 2 - 0.015, wy0, Zf + 0.02, (wx0 + wx1) / 2 + 0.015, wy1, Zf + 0.05);
      K.box(alu, wx0 - 0.08, wy0 - 0.08, Zf, wx1 + 0.08, wy0 - 0.04, Zf + 0.14);
      for (let k = 0; k <= 10; k++) K.box(alu, wx0 + k * (wx1 - wx0) / 10 - 0.008, wy0 - 0.04, Zf + 0.11, wx0 + k * (wx1 - wx0) / 10 + 0.008, wy1 + 0.04, Zf + 0.125);
      for (const y of [wy0 - 0.04, wy1 + 0.02]) K.box(alu, wx0 - 0.03, y, Zf + 0.05, wx1 + 0.03, y + 0.025, Zf + 0.13);
      const fan = K.patch('acfan', 40, 40, (V) => { V.fill(0xdcdad2); V.disc(20, 20, 17, 0x5a5e62); for (let r = 4; r < 17; r += 3) V.ring(20, 20, r, r + 1, 0x8a8e92); V.disc(20, 20, 3, 0x3a3e42); V.line(3, 20, 37, 20, 0x8a8e92); V.line(20, 3, 20, 37, 0x8a8e92); }, { rough: 0.6 });
      K.at([2.35, 0.32, Zf + 0.2], () => { K.box(paint(0xe8e6de, 0.15), -0.4, 0.06, -0.15, 0.4, 0.62, 0.15, { bevel: 0.015 }); K.face(fan, '+z', -0.36, 0.1, 0.12, 0.58, 0.1505); const lv = K.patch('aclouvre', 16, 32, (V) => { V.fill(0xe8e6de); louvres(V, 1, 1, 15, 31, 0xb8b6ae, 3); }, { rough: 0.6 }); K.face(lv, '+z', 0.16, 0.12, 0.36, 0.56, 0.1505); for (const x of [-0.32, 0.32]) K.box(conc, x - 0.05, 0, -0.14, x + 0.05, 0.06, 0.14); K.tube(paint(0xe8e6de), [[0.3, 0.4, -0.15], [0.3, 0.4, -0.18], [0.3, 1.0, -0.18]], 0.025, 6); });
      K.tube(paint(0xe8e6de), [[2.65, 1.32, Zf + 0.02], [2.65, 2.4, Zf + 0.02], [2.4, 2.6, Zf + 0.02]], 0.03, 6);
      // the skirt roof between the floors: three courses of tile on a fascia
      const tile = K.patch('kawara', 64, 16, (V) => { V.fill(TILE); for (let i = 0; i < 64; i += 8) { V.vline(i, 0, 15, darken(TILE, 0.3)); V.vline(i + 1, 2, 15, lighten(TILE, 0.12)); V.vline(i + 5, 3, 14, darken(TILE, 0.12)); } V.hline(0, 63, 0, darken(TILE, 0.4)); V.hline(0, 63, 15, lighten(TILE, 0.2)); }, { rough: 0.55 });
      const roofRun = (zA, yA, zB, yB, courses, x0, x1, segs) => {
        for (let c = 0; c < courses; c++) {
          const t0 = c / courses, t1 = (c + 1) / courses, za = zA + (zB - zA) * t0, ya = yA + (yB - yA) * t0, zb = zA + (zB - zA) * t1, yb = yA + (yB - yA) * t1, lip = 0.022;
          for (let s = 0; s < segs; s++) { const xa = x0 + (s * (x1 - x0)) / segs, xb = x0 + ((s + 1) * (x1 - x0)) / segs; K.quadUV(tile, [xa, ya + lip, za], [xb, ya + lip, za], [xb, yb + lip, zb], [xa, yb + lip, zb], [0, 1, 0.5]); }
          K.box(matte(darken(TILE, 0.2), 0.12), x0, ya - 0.002, za - 0.025, x1, ya + lip, za + 0.005, { bevel: 0.006 });
        }
      };
      K.prism(paint(0x6a5a4a, 0.15), [[Zf, y1 + 0.32], [B.z1 - 0.04, y1 + 0.06], [B.z1 - 0.04, y1 - 0.02], [Zf, y1 + 0.2]], { plane: 'zy', a: -X, b: X });
      roofRun(B.z1 - 0.04, y1 + 0.06, Zf, y1 + 0.32, 3, -X, X, 6);
      // upstairs: a small window on the left, the balcony on the right with the futon airing over its rail
      const ux0 = -2.6, ux1 = -1.0, uy0 = 3.55, uy1 = 4.6;
      K.box(alu, ux0 - 0.04, uy0 - 0.04, Zf, ux1 + 0.04, uy1 + 0.04, Zf + 0.05);
      const sho = K.patch('shoji', 32, 32, (V) => { V.fill(0xeee8d6); for (let i = 0; i < 32; i += 8) V.vline(i, 0, 31, 0xa88a60); for (let j = 0; j < 32; j += 11) V.hline(0, 31, j, 0xa88a60); }, { rough: 0.9 });
      K.face(sho, '+z', ux0, uy0, (ux0 + ux1) / 2, uy1, Zf + 0.01); K.face(sho, '+z', (ux0 + ux1) / 2, uy0, ux1, uy1, Zf + 0.01);
      K.glass(() => K.box(K.tint(0xcfe0e4, 60, 0.08), ux0, uy0, Zf + 0.024, ux1, uy1, Zf + 0.03, { bevel: 0 }));
      K.box(alu, (ux0 + ux1) / 2 - 0.015, uy0, Zf + 0.02, (ux0 + ux1) / 2 + 0.015, uy1, Zf + 0.05);
      const bx0 = 0.05, bx1 = X - 0.25, by = y1 + 0.42;
      K.box(flat(0x2a2a2e, 0.9), bx0 + 0.1, by + 0.05, Zf - 0.001, bx1 - 0.1, y2 - 0.35, Zf + 0.01);
      for (const x of [bx0 + 0.1, (bx0 + bx1) / 2, bx1 - 0.14]) K.box(alu, x, by + 0.05, Zf, x + 0.04, y2 - 0.35, Zf + 0.05);
      K.glass(() => K.box(K.tint(0xcfe0e4, 70, 0.08), bx0 + 0.1, by + 0.05, Zf + 0.02, bx1 - 0.1, y2 - 0.35, Zf + 0.026, { bevel: 0 }));
      K.box(paint(0x8a8e92, 0.15), bx0, by - 0.06, Zf, bx1, by, B.z1 - 0.02, { bevel: 0.01 });
      for (const x of [bx0 + 0.02, bx1 - 0.06]) K.box(alu, x, by, B.z1 - 0.07, x + 0.04, by + 0.95, B.z1 - 0.03);
      K.box(alu, bx0, by + 0.92, B.z1 - 0.08, bx1, by + 0.97, B.z1 - 0.02, { bevel: 0.01 });
      for (let k = 0; k <= 24; k++) K.box(alu, bx0 + 0.06 + k * (bx1 - bx0 - 0.12) / 24, by, B.z1 - 0.06, bx0 + 0.075 + k * (bx1 - bx0 - 0.12) / 24, by + 0.92, B.z1 - 0.045, { bevel: 0 });
      const fut = K.patch('futon', 48, 32, (V) => { V.fill(0xe8e2d0); for (let i = 0; i < 48; i += 12) for (let j = 0; j < 32; j += 12) { V.disc(i + 6, j + 6, 3, 0x6a8ab8); V.ring(i + 6, j + 6, 3.5, 4.5, 0x9ab0d0); } V.box(0, 0, 48, 2, 0x4a6a9a); V.box(0, 30, 48, 32, 0x4a6a9a); }, { rough: 0.95 });
      const fx0 = bx0 + 0.3, fx1 = fx0 + 1.3, zr = B.z1 - 0.035, top = by + 0.98;
      K.box(fabric(0xe8e2d0), fx0, top - 0.6, zr + 0.01, fx1, top, zr + 0.05, { bevel: 0.02 }); K.face(fut, '+z', fx0 + 0.01, top - 0.6, fx1 - 0.01, top - 0.02, zr + 0.0505);
      K.box(fabric(0xe8e2d0), fx0, top - 0.45, zr - 0.08, fx1, top, zr - 0.04, { bevel: 0.02 });
      K.tube(fabric(0xe8e2d0), [[fx0, top - 0.01, zr - 0.06], [fx0, top + 0.02, zr], [fx0, top - 0.01, zr + 0.04]], 0.03, 6, { up: [1, 0, 0] });
      for (const x of [fx0 + 0.25, fx1 - 0.25]) K.box(plastic(0xe8a83a), x - 0.04, top - 0.06, zr - 0.06, x + 0.04, top + 0.03, zr + 0.06, { bevel: 0.01 }); // clothes-pegs
      K.rod(metal(0x9aa0a4), [bx1 - 0.6, y2 - 0.45, Zf + 0.05], [bx1 - 0.6, y2 - 0.45, B.z1 - 0.1], 0.012, 5);
      // the main roof: kawara courses up to the ridge, onigawara at its ends, the fascia, the gutter and downpipe
      const zE = B.z1 - 0.06, yE = y2 + 0.1, zR = -0.35, yR = B.y1 - 0.14;
      K.prism(paint(0x5a4a3c, 0.15), [[zE, yE - 0.02], [zE, yE - 0.16], [Zf, y2 - 0.05], [Zb, y2 - 0.05], [Zb, yR - 0.05], [zR, yR - 0.05]], { plane: 'zy', a: -X - 0.08, b: X + 0.08 });
      roofRun(zE, yE, zR, yR, 8, -X - 0.08, X + 0.08, 6);
      K.box(matte(darken(TILE, 0.15), 0.15), -X - 0.06, yR - 0.04, zR - 0.15, X + 0.06, B.y1 - 0.02, zR + 0.12, { bevel: 0.03 });
      K.prism(matte(darken(TILE, 0.15), 0.15), [[zR - 0.15, yR - 0.08], [zR + 0.12, yR - 0.08], [zR + 0.12, B.y1 - 0.03], [zR - 0.15, B.y1 - 0.03]], { plane: 'zy', a: Zb + 0.0, b: zR - 0.15 });
      K.sym((s) => K.at([s * (X + 0.04), yR + 0.02, zR - 0.01], () => { K.box(matte(darken(TILE, 0.2), 0.15), -0.06, -0.08, -0.16, 0.06, 0.2, 0.14, { bevel: 0.03 }); K.torus(matte(darken(TILE, 0.3)), 0, 0.06, 0.14, 0.07, 0.015, 10, 3, { axis: 'z' }); }));
      K.box(paint(0xe8e2d6, 0.15), -X - 0.08, yE - 0.18, zE - 0.01, X + 0.08, yE - 0.02, zE + 0.02);
      K.lathe(paint(0xb8b4aa, 0.2), [-X - 0.08, yE - 0.17, zE + 0.035], [[0.045, 0], [0.05, 0.005], [0.05, 2 * X + 0.16], [0.045, 2 * X + 0.16]], 8, { axis: 'x', arc: Math.PI, a0: Math.PI });
      K.tube(paint(0xb8b4aa, 0.2), [[X - 0.04, yE - 0.2, zE + 0.035], [X - 0.04, yE - 0.4, Zf + 0.06], [X - 0.04, 0.35, Zf + 0.06], [X - 0.04, 0.08, Zf + 0.16]], 0.035, 8);
      for (const y of [1.0, 2.2, 3.4, 4.6]) K.box(metal(0x8a9094), X - 0.09, y, Zf + 0.02, X + 0.01, y + 0.03, Zf + 0.1);
      // the electricity meter by the door
      K.box(plastic(0xe8e6de, 0.1), -1.0, 1.6, Zf, -0.8, 1.86, Zf + 0.1, { bevel: 0.01 }); K.glass(() => K.cyl(K.tint(0xd8e4e8, 120, 0.08), -0.9, 1.75, Zf + 0.1, 0.06, 0.02, 10, { axis: 'z' }));
    },
  },
};
