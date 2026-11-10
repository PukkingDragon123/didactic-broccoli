// Fixtures and furniture of the museum (src/museum/displays.js), GACHA KAIKAN and the shop annex (src/growth), and the
// customer guestbook's open notebook and pen (src/talk/guestbook.js), modelled with the prop kit. Every model keeps the
// footprint, heights and shelf levels of the boxes it replaces (display slots and collision boxes depend on them); the
// transparent glass panes, glowing LED strips and printed canvases stay with their owners. Front = +z.
import { paint, enamel, plastic, metal, chrome, matte, wood, flat, rubber, fabric, ceramic, stone, lighten, darken, mix } from '../kit/kit.js';
import { plank } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot } from '../kit/prints.js';

const BRASS = metal(0xc8a44a, 0.35), GOLD = metal(0xd8b048, 0.4), STEEL = metal(0xb8bcc2, 0.35), DARK = paint(0x2a2624, 0.12);
const WOOD_D = wood(0x4a2c1c, 0.16), WOOD_M = wood(0x7a4e2c, 0.18), WOOD_L = wood(0xb88a58, 0.16), FELT = fabric(0xc83a4a), VELVET = fabric(0x6a1a2a);
const box = (o) => o; // (readability: the boxes below are [x0, y0, z0, x1, y1, z1] in metres)

/** A raised-and-fielded door panel on the +z face of a carcass at z: frame strips, the sunk field, the raised centre. */
function panel(K, c, x0, y0, x1, y1, z) {
  const f = 0.022;
  K.box(c, x0, y0, z, x1, y0 + f, z + 0.008); K.box(c, x0, y1 - f, z, x1, y1, z + 0.008);
  K.box(c, x0, y0 + f, z, x0 + f, y1 - f, z + 0.008); K.box(c, x1 - f, y0 + f, z, x1, y1 - f, z + 0.008);
  K.box(wood(lighten(typeof c === 'object' ? c.c : c, 0.06)), x0 + f + 0.012, y0 + f + 0.012, z, x1 - f - 0.012, y1 - f - 0.012, z + 0.006, { bevel: 0.005 });
}
/** Thin frame edges round a glass box (w x h x d, bottom centre at x, y, z): corner posts and the rails. */
function glassFrame(K, c, w, h, d, x, y, z, t = 0.012) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(c, x + sx * w / 2 - t / 2, y, z + sz * d / 2 - t / 2, x + sx * w / 2 + t / 2, y + h, z + sz * d / 2 + t / 2);
  for (const yy of [y, y + h - t]) {
    for (const sz of [-1, 1]) K.box(c, x - w / 2, yy, z + sz * d / 2 - t / 2, x + w / 2, yy + t, z + sz * d / 2 + t / 2);
    for (const sx of [-1, 1]) K.box(c, x + sx * w / 2 - t / 2, yy, z - d / 2, x + sx * w / 2 + t / 2, yy + t, z + d / 2);
  }
}
/** A brass plate with an engraved word (pixel print). */
function nameplate(K, x, y, z, w, h, text) {
  K.box(BRASS, x - w / 2, y - h / 2, z, x + w / 2, y + h / 2, z + 0.004, { bevel: 0.0015 });
  const V = K.patch('plate:' + text, Math.max(24, text.length * 6 + 6), 11, (V) => { V.fill(0xc8a44a); V.frame(0, 0, V.W, V.H, 0x9a7a2a); V.text5(text, V.W >> 1, 9, 0x5a4218, { align: 'center' }); }, { rough: 0.35, shared: true });
  K.face(V, '+z', x - w / 2 + 0.003, y - h / 2 + 0.002, x + w / 2 - 0.003, y + h / 2 - 0.002, z + 0.0042);
}
/** A turned table / stand leg (lathe), from y0 to y1. */
function turnedLeg(K, c, x, z, y0, y1, r) {
  const h = y1 - y0;
  K.lathe(c, [x, y0, z], [[r * 0.8, 0], [r, 0.03 * h], [r, 0.12 * h], [r * 0.62, 0.2 * h], [r * 0.85, 0.3 * h], [r * 0.6, 0.38 * h], [r * 0.55, 0.85 * h], [r, 0.88 * h], [r, h]], 10);
}

const MUSEUM = {
  // ------------------------------------------------------------- the glass-topped collector's case (1.0 x 0.84 + hood)
  mu_case_glass: {
    box: [-0.5, 0, -0.26, 0.5, 1.07, 0.27],
    build: (K) => {
      K.box(darken(0x3a2418, 0.2), -0.47, 0, -0.22, 0.47, 0.08, 0.22); // the recessed plinth
      K.box(WOOD_D, -0.5, 0.08, -0.25, 0.5, 0.8, 0.25);
      for (const sx of [-1, 1]) panel(K, WOOD_M, sx > 0 ? 0.01 : -0.48, 0.12, sx > 0 ? 0.48 : -0.01, 0.62, 0.25);
      for (const sx of [-1, 1]) { K.cyl(BRASS, sx * 0.03, 0.4, 0.258, 0.008, 0.014, 8, { axis: 'z' }); K.ball(BRASS, sx * 0.03, 0.4, 0.274, 0.011, 0.011, 0.008, 8, 3); }
      nameplate(K, 0, 0.705, 0.25, 0.42, 0.05, 'COLLECTION');
      // the moulded top and the velvet deck the figures stand on
      K.box(WOOD_M, -0.515, 0.8, -0.265, 0.515, 0.828, 0.265, { bevel: 0.008 });
      K.box(VELVET, -0.48, 0.828, -0.23, 0.48, 0.8408, 0.23, { bevel: 0.003 });
      glassFrame(K, BRASS, 0.96, 0.22, 0.46, 0, 0.84, 0, 0.012);
      for (const sx of [-1, 1]) K.ball(BRASS, sx * 0.48, 1.064, 0.23, 0.01, 0.01, 0.01, 8, 3);
    },
  },
  // ------------------------------------------------------------- open shelves (1.0 x 1.565 x 0.36), shelves at 0.45 / 0.85 / 1.25
  mu_shelf_open: {
    box: [-0.51, 0, -0.18, 0.51, 1.6, 0.19],
    build: (K) => {
      const c = 0xb88a58;
      for (const sx of [-1, 1]) plank(K, c, sx * 0.485 - 0.015, 0, -0.18, sx * 0.485 + 0.015, 1.55, 0.18, { axis: 'y' });
      K.box(WOOD_D, -0.5, 0.0, -0.18, 0.5, 1.55, -0.16);
      for (const y of [0.05, 0.45, 0.85, 1.25]) {
        plank(K, c, -0.47, y - 0.0125, -0.16, 0.47, y + 0.0125, 0.18, { axis: 'x' });
        K.box(wood(darken(c, 0.12)), -0.47, y - 0.02, 0.172, 0.47, y + 0.0125, 0.182, { bevel: 0.003 }); // the lipped front edge
        for (const sx of [-1, 1]) for (const zz of [-0.1, 0.1]) K.cyl(BRASS, sx * 0.468, y - 0.02, zz, 0.004, 0.008, 6);
      }
      K.box(wood(darken(c, 0.2)), -0.47, 0, 0.15, 0.47, 0.04, 0.17); // the kick board
      // the top with a cornice
      plank(K, c, -0.5, 1.535, -0.18, 0.5, 1.565, 0.18, { axis: 'x' });
      K.box(WOOD_M, -0.51, 1.565, -0.18, 0.51, 1.585, 0.19, { bevel: 0.006 });
      K.box(WOOD_M, -0.505, 1.585, -0.17, 0.505, 1.595, 0.18, { bevel: 0.004 });
    },
  },
  // ------------------------------------------------------------- the spotlit pedestal with its glass hood and rope
  mu_pedestal: {
    box: [-0.36, 0, -0.21, 0.36, 1.27, 0.42],
    build: (K) => {
      K.box(stone(0x2a2220, 0.1), -0.21, 0, -0.21, 0.21, 0.06, 0.21, { bevel: 0.01 });
      K.box(stone(0x3a3230, 0.1), -0.19, 0.06, -0.19, 0.19, 0.09, 0.19, { bevel: 0.008 });
      const W = enamel(0xf4f2ec);
      K.box(W, -0.17, 0.09, -0.17, 0.17, 0.93, 0.17, { bevel: 0.012 });
      for (const [f, s] of [['+z', 1], ['-z', -1], ['+x', 1], ['-x', -1]]) {
        if (f.endsWith('z')) K.box(enamel(0xe8e4dc), -0.12, 0.17, s * 0.17 - (s > 0 ? 0 : 0.006), 0.12, 0.85, s * 0.17 + (s > 0 ? 0.006 : 0), { bevel: 0.004 });
        else K.box(enamel(0xe8e4dc), s * 0.17 - (s > 0 ? 0 : 0.006), 0.17, -0.12, s * 0.17 + (s > 0 ? 0.006 : 0), 0.85, 0.12, { bevel: 0.004 });
      }
      K.box(W, -0.185, 0.93, -0.185, 0.185, 0.96, 0.185, { bevel: 0.01 });
      K.box(GOLD, -0.2, 0.96, -0.2, 0.2, 1.0, 0.2, { bevel: 0.008 });
      glassFrame(K, GOLD, 0.3, 0.26, 0.3, 0, 1.0, 0, 0.01);
      // velvet rope on two brass stanchions
      for (const sx of [-1, 1]) {
        K.lathe(BRASS, [sx * 0.32, 0, 0.38], [[0.055, 0], [0.055, 0.012], [0.03, 0.03], [0.012, 0.045], [0.011, 0.76], [0.016, 0.77], [0.024, 0.79], [0.016, 0.81], [0, 0.815]], 12);
        K.ball(BRASS, sx * 0.32, 0.8, 0.38, 0.022, 0.022, 0.022, 10, 4);
      }
      const rope = []; for (let k = 0; k <= 12; k++) { const t = k / 12, x = -0.31 + t * 0.62; rope.push([x, 0.77 - Math.sin(Math.PI * t) * 0.09, 0.38 + Math.sin(Math.PI * t) * 0.02]); }
      K.tube(fabric(0x9a1f2a), rope, 0.013, 6);
    },
  },
  // ------------------------------------------------------------- the tall glass cabinet (1.0 x 1.89 x 0.46): its frame
  mu_cabinet_tall: {
    box: [-0.5, 0, -0.23, 0.5, 1.9, 0.23],
    build: (K) => {
      const F = paint(0x2a2624, 0.12);
      K.box(darken(0x2a2624, 0.3), -0.48, 0, -0.21, 0.48, 0.03, 0.21);
      K.box(F, -0.5, 0.03, -0.23, 0.5, 0.12, 0.23, { bevel: 0.01 });
      K.box(F, -0.5, 1.83, -0.23, 0.5, 1.89, 0.23, { bevel: 0.01 });
      K.box(F, -0.505, 1.86, -0.235, 0.505, 1.875, 0.235, { bevel: 0.005 });
      K.box(WOOD_D, -0.49, 0.12, -0.22, 0.49, 1.83, -0.2);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(F, sx * 0.49 - 0.012, 0.12, sz * 0.22 - 0.012, sx * 0.49 + 0.012, 1.83, sz * 0.22 + 0.012, { bevel: 0.004 });
      // shelf brackets, a lock on the front, the maker's plate
      for (const y of [0.3, 0.78, 1.26]) for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(STEEL, sx * 0.47 - 0.01, y - 0.012, sz * 0.15 - 0.01, sx * 0.47 + 0.01, y - 0.006, sz * 0.15 + 0.01);
      for (const y of [0.3, 0.78, 1.26]) K.box(STEEL, -0.47, y + 0.43, 0.175, 0.47, y + 0.45, 0.2, { bevel: 0.004 }); // the LED strips' housings
      K.cyl(STEEL, 0.44, 0.075, 0.23, 0.01, 0.008, 10, { axis: 'z' });
      nameplate(K, -0.3, 0.075, 0.23, 0.22, 0.035, 'GACHA ARCHIVE');
    },
  },
  // ------------------------------------------------------------- the capsule tower: its machine base, collars and finial
  mu_capsule_tower: {
    box: [-0.26, 0, -0.27, 0.26, 1.64, 0.27],
    build: (K) => {
      const P = plastic(0xff6f91, 0.25), W = plastic(0xf8f4ee, 0.2);
      K.lathe(P, [0, 0, 0], [[0, 0], [0.25, 0], [0.252, 0.03], [0.245, 0.04], [0.235, 0.27], [0.24, 0.285], [0.23, 0.3], [0, 0.3]], 24);
      K.torus(W, 0, 0.04, 0, 0.247, 0.01, 24, 4);
      K.ring(W, 0, 0.3, 0, 0.225, 0.2, 0.03, 24);
      K.ring(W, 0, 1.385, 0, 0.225, 0.2, 0.03, 24);
      K.torus(plastic(0xffffff), 0, 1.4, 0, 0.215, 0.012, 24, 4);
      K.ball(plastic(0xffd23f, 0.3), 0, 1.62, 0, 0.025, 0.025, 0.025, 10, 4);
      // the coin plate, crank and chute on the base's front
      K.box(STEEL, -0.07, 0.12, 0.225, 0.07, 0.26, 0.24, { bevel: 0.004 });
      K.cyl(STEEL, 0, 0.2, 0.24, 0.035, 0.012, 12, { axis: 'z' });
      K.box(plastic(0xf8f4ee), -0.04, 0.195, 0.252, 0.04, 0.205, 0.262, { bevel: 0.003 });
      K.box(darken(0xff6f91, 0.5), -0.05, 0.04, 0.228, 0.05, 0.1, 0.24, { bevel: 0.006 });
    },
  },
  // ------------------------------------------------------------- the hina stand: three felt tiers, the gold screen, bonbori
  mu_hinadan: {
    box: [-0.75, 0, -0.5, 0.75, 1.42, 0.49],
    build: (K) => {
      const LAC = paint(0x1e1a1c, 0.2);
      for (let i = 0; i < 3; i++) {
        const h = 0.25 + i * 0.25, z = 0.33 - i * 0.3;
        K.box(FELT, -0.75, 0, z - 0.15, 0.75, h, z + 0.15, { bevel: 0.006 });
        K.box(LAC, -0.755, h - 0.012, z + 0.145, 0.755, h + 0.001, z + 0.158, { bevel: 0.003 });
        for (let k = 0; k < 7; k++) K.box(fabric(darken(0xc83a4a, 0.12)), -0.75 + k * 0.25 - 0.002, 0.01, z + 0.15, -0.75 + k * 0.25 + 0.002, h - 0.014, z + 0.152);
      }
      // the six-fold gold screen, zig-zag, black lacquered frames, blossom branches painted on the leaf
      const art = K.patch('byobu', 96, 48, (V) => {
        V.fill(0xe0b850);
        for (let i = 0; i < 96; i += 8) for (let j = 0; j < 48; j += 8) if (((i + j) >> 3) % 3 === 0) V.box(i, j, i + 8, j + 8, 0xe8c25a);
        const br = (pts) => { for (let k = 0; k + 1 < pts.length; k++) { const [a, b] = pts[k], [c, d] = pts[k + 1], n = Math.max(Math.abs(c - a), Math.abs(d - b)); for (let s = 0; s <= n; s++) { const x = Math.round(a + (c - a) * s / n), y = Math.round(b + (d - b) * s / n); V.px(x, 47 - y, 0x4a2c20); V.px(x, 46 - y, 0x4a2c20); } } }; // (rows counted from the top; the view's j runs up)
        br([[0, 30], [14, 26], [26, 18], [40, 15]]); br([[14, 26], [20, 34]]); br([[96, 12], [80, 16], [66, 24], [58, 22]]);
        for (const [x, y] of [[8, 27], [16, 24], [22, 19], [30, 16], [38, 13], [20, 33], [86, 12], [76, 15], [70, 21], [62, 21], [27, 22], [44, 15]]) { V.disc(x, 47 - y, 2.2, 0xf6a6c0); V.px(x, 47 - y, 0xffe8f0); }
        for (let i = 0; i < 96; i++) { V.px(i, 3, 0x6a9a5a); if (i % 5 === 0) V.px(i, 4, 0x7aaa64); }
      }, { rough: 0.45 });
      for (let p = 0; p < 6; p++) {
        const x0 = -0.72 + p * 0.24, z = -0.43 + (p % 2) * 0.04;
        K.box(LAC, x0, 0.75, z - 0.012, x0 + 0.24, 1.35, z + 0.012, { bevel: 0.004 });
        K.box(GOLD, x0 + 0.014, 0.764, z + 0.006, x0 + 0.226, 1.336, z + 0.0132, { bevel: 0.002 });
        K.quadUV(art, [x0 + 0.016, 0.766, z + 0.0134], [x0 + 0.224, 0.766, z + 0.0134], [x0 + 0.224, 1.334, z + 0.0134], [x0 + 0.016, 1.334, z + 0.0134], [0, 0, 1], { sub: [p / 6, 0, (p + 1) / 6, 1] });
      }
      // two bonbori lamps on lacquered stands
      for (const sx of [-1, 1]) {
        K.lathe(LAC, [sx * 0.66, 0.75, -0.27], [[0.05, 0], [0.05, 0.012], [0.02, 0.02], [0.009, 0.03], [0.008, 0.25], [0.03, 0.255], [0.03, 0.262]], 10);
        K.glow(() => K.lathe(flat(0xffe0b0, 0.9), [sx * 0.66, 1.012, -0.27], [[0.03, 0], [0.05, 0.02], [0.052, 0.09], [0.04, 0.12], [0, 0.12]], 6));
        K.lathe(LAC, [sx * 0.66, 1.13, -0.27], [[0.044, 0], [0.03, 0.016], [0.008, 0.024], [0, 0.026]], 10);
      }
    },
  },
  // ------------------------------------------------------------- the candy jar on a turned stand: stand, lid, knob, sweets
  mu_candy_jar: {
    box: [-0.21, 0, -0.21, 0.21, 1.1, 0.21],
    build: (K) => {
      K.box(WOOD_D, -0.19, 0, -0.19, 0.19, 0.06, 0.19, { bevel: 0.01 });
      K.box(WOOD_L, -0.17, 0.06, -0.17, 0.17, 0.5, 0.17, { bevel: 0.01 });
      for (const [f, s] of [[0, 1], [0, -1], [1, 1], [1, -1]]) {
        if (!f) K.box(wood(0xa87a48), -0.12, 0.11, s * 0.17 - (s > 0 ? 0 : 0.005), 0.12, 0.45, s * 0.17 + (s > 0 ? 0.005 : 0), { bevel: 0.004 });
        else K.box(wood(0xa87a48), s * 0.17 - (s > 0 ? 0 : 0.005), 0.11, -0.12, s * 0.17 + (s > 0 ? 0.005 : 0), 0.45, 0.12, { bevel: 0.004 });
      }
      K.box(WOOD_D, -0.2, 0.5, -0.2, 0.2, 0.55, 0.2, { bevel: 0.012 });
      // the jar's glass foot ring and the pink lid with its knob
      K.ring(plastic(0xf4f0e8), 0, 0.55, 0, 0.196, 0.18, 0.012, 24);
      K.lathe(plastic(0xff8fb2, 0.25), [0, 0.97, 0], [[0.19, 0], [0.205, 0.006], [0.205, 0.04], [0.19, 0.052], [0.1, 0.06], [0.03, 0.07], [0, 0.07]], 24);
      K.ball(plastic(0xffd23f, 0.3), 0, 1.065, 0, 0.04, 0.035, 0.04, 12, 4);
      // a heap of wrapped sweets
      const C = [0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c, 0xffffff, 0xf08a3a];
      for (let k = 0; k < 24; k++) {
        const a = k * 2.399, r = 0.16 * Math.sqrt((k + 0.5) / 24), x = Math.cos(a) * r, z = Math.sin(a) * r, y = 0.575 + (1 - r / 0.17) * 0.025 + (k % 3) * 0.004;
        const c = plastic(C[k % C.length], 0.25);
        if (k % 3 === 0) { K.ball(c, x, y, z, 0.02, 0.017, 0.02, 7, 2); }
        else { K.at([x, y, z], () => { K.cyl(c, -0.012, -0.0, 0, 0.012, 0.024, 6, { axis: 'x', caps: false }); K.cyl(c, -0.024, 0, 0, 0.003, 0.012, 4, { axis: 'x', r1: 0.009, caps: false }); K.cyl(c, 0.012, 0, 0, 0.009, 0.012, 4, { axis: 'x', r1: 0.003, caps: false }); }, { ry: a }); }
      }
    },
  },
  // ------------------------------------------------------------- the diorama table: turned legs, an apron, a little landscape
  mu_diorama_table: {
    box: [-0.75, 0, -0.5, 0.75, 0.92, 0.5],
    build: (K) => {
      const c = 0x8a5a34;
      plank(K, c, -0.75, 0.69, -0.5, 0.75, 0.75, 0.5, { axis: 'x' });
      K.box(WOOD_M, -0.76, 0.735, -0.51, 0.76, 0.75, 0.51, { bevel: 0.006 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) turnedLeg(K, WOOD_D, sx * 0.69, sz * 0.44, 0, 0.69, 0.03);
      for (const sz of [-1, 1]) K.box(WOOD_D, -0.66, 0.6, sz * 0.44 - 0.012, 0.66, 0.69, sz * 0.44 + 0.012);
      for (const sx of [-1, 1]) K.box(WOOD_D, sx * 0.69 - 0.012, 0.6, -0.41, sx * 0.69 + 0.012, 0.69, 0.41);
      // the landscape: rolling grass, a river with a stony bank, flat pads where the figures stand, little conifers
      const pads = []; for (let i = 0; i < 8; i++) pads.push([-0.6 + (i % 4) * 0.4, i < 4 ? -0.28 : 0.28]);
      const NX = 36, NZ = 24, x0 = -0.7, x1 = 0.68, z0 = -0.44, z1 = 0.44, y0 = 0.75;
      const riverZ = (x) => Math.sin(x / 0.16) * 0.12;
      const H = (x, z) => {
        const dr = Math.abs(z - riverZ(x));
        let h = 0.035 + 0.025 * (Math.sin(x / 0.14) + Math.cos(z / 0.12)) * 0.5 + (x < -0.4 ? (-0.4 - x) * 0.2 : 0);
        h *= Math.min(1, Math.max(0, (dr - 0.05) / 0.06));
        for (const [px, pz] of pads) { const d = Math.hypot(x - px, z - pz); if (d < 0.11) h = h + (0.07 - h) * Math.min(1, (0.11 - d) / 0.04); }
        return Math.max(0.006, h);
      };
      const G0 = matte(0x6db84c, 0.08), G1 = matte(0x5ea842, 0.08), SOIL = matte(0x8a6a4a), WATER = enamel(0x5ab8f0), PAD = matte(0x86c860, 0.06);
      for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
        const xa = x0 + (x1 - x0) * i / NX, xb = x0 + (x1 - x0) * (i + 1) / NX, za = z0 + (z1 - z0) * j / NZ, zb = z0 + (z1 - z0) * (j + 1) / NZ;
        const mx = (xa + xb) / 2, mz = (za + zb) / 2, dr = Math.abs(mz - riverZ(mx));
        const pad = pads.some(([px, pz]) => Math.hypot(mx - px, mz - pz) < 0.075);
        const c = dr < 0.05 ? WATER : dr < 0.07 ? SOIL : pad ? PAD : ((i + j * 3) % 7 === 0 ? G1 : G0);
        K.quad(c, [xa, y0 + H(xa, zb), zb], [xb, y0 + H(xb, zb), zb], [xb, y0 + H(xb, za), za], [xa, y0 + H(xa, za), za], [0, 1, 0]);
      }
      // the base's sides (soil) round the edge
      for (let i = 0; i < NX; i++) for (const [z, s] of [[z0, -1], [z1, 1]]) { const xa = x0 + (x1 - x0) * i / NX, xb = x0 + (x1 - x0) * (i + 1) / NX; K.quad(SOIL, [xa, y0, z], [xb, y0, z], [xb, y0 + H(xb, z), z], [xa, y0 + H(xa, z), z], [0, 0, s]); }
      for (let j = 0; j < NZ; j++) for (const [x, s] of [[x0, -1], [x1, 1]]) { const za = z0 + (z1 - z0) * j / NZ, zb = z0 + (z1 - z0) * (j + 1) / NZ; K.quad(SOIL, [x, y0, za], [x, y0, zb], [x, y0 + H(x, zb), zb], [x, y0 + H(x, za), za], [s, 0, 0]); }
      const pine = (x, z, s) => { const y = y0 + H(x, z); K.cyl(wood(0x6a4a2a), x, y, z, 0.006 * s, 0.03 * s, 6); for (let k = 0; k < 3; k++) K.lathe(matte(k % 2 ? 0x2e7a3a : 0x3a8a42), [x, y + (0.025 + k * 0.03) * s, z], [[0.035 * s * (1 - k * 0.22), 0], [0, 0.05 * s]], 8); };
      for (const [x, z, s] of [[-0.64, -0.06, 1.2], [-0.55, 0.06, 1], [-0.2, 0.4, 0.9], [0.05, -0.4, 1.1], [0.4, 0.42, 1], [0.62, -0.05, 1.2], [0.2, 0.05, 0.8], [-0.36, -0.1, 0.9]]) pine(x, z, s);
      // a little red bridge over the river
      const bx = -0.05, bz = riverZ(bx);
      K.at([bx, y0 + 0.012, bz], () => { K.box(paint(0xc8302a), -0.012, 0, -0.08, 0.012, 0.01, 0.08); for (const sz of [-1, 1]) K.box(paint(0xc8302a), -0.012, 0.01, sz * 0.075 - 0.002, 0.012, 0.03, sz * 0.075 + 0.002); }, { ry: 0.25 });
    },
  },
  // ------------------------------------------------------------- the shrine case: cabinet, wooden posts, a copper roof, shimenawa
  mu_shrine_case: {
    box: [-0.6, 0, -0.32, 0.6, 1.47, 0.3],
    build: (K) => {
      K.box(darken(0x3a2418, 0.2), -0.47, 0, -0.22, 0.47, 0.06, 0.22);
      K.box(WOOD_D, -0.5, 0.06, -0.25, 0.5, 0.6, 0.25);
      for (const sx of [-1, 1]) panel(K, WOOD_M, sx > 0 ? 0.01 : -0.48, 0.1, sx > 0 ? 0.48 : -0.01, 0.56, 0.25);
      plank(K, 0xc89a68, -0.51, 0.6, -0.26, 0.51, 0.64, 0.26, { axis: 'x' });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(WOOD_L, sx * 0.48 - 0.014, 0.64, sz * 0.22 - 0.014, sx * 0.48 + 0.014, 1.22, sz * 0.22 + 0.014);
      for (const sz of [-1, 1]) K.box(WOOD_L, -0.48, 1.2, sz * 0.22 - 0.012, 0.48, 1.225, sz * 0.22 + 0.012);
      plank(K, 0xc89a68, -0.47, 0.924, -0.2, 0.47, 0.936, 0.2, { axis: 'x' });
      // the roof: two curving copper slopes with a ridge, barge boards and gold end caps
      const COP = paint(0x3a5a4a, 0.15), slope = (sz) => {
        const pts = []; for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([sz * (0.02 + t * 0.29), 1.23 + 0.17 * (1 - t) - 0.03 * Math.sin(Math.PI * t) + (t > 0.85 ? (t - 0.85) * 0.12 : 0)]); }
        for (let k = 0; k < 6; k++) { const [za, ya] = pts[k], [zb, yb] = pts[k + 1]; K.quad(COP, [-0.6, ya, za], [0.6, ya, za], [0.6, yb, zb], [-0.6, yb, zb], [0, 1, sz * 0.6]); K.quad(darken(0x3a5a4a, 0.25), [0.6, ya - 0.012, za], [-0.6, ya - 0.012, za], [-0.6, yb - 0.012, zb], [0.6, yb - 0.012, zb], [0, -1, -sz * 0.3]); }
        K.box(paint(0x2e4a3c), -0.6, pts[6][1] - 0.014, sz > 0 ? pts[6][0] - 0.004 : pts[6][0] - 0.006, 0.6, pts[6][1] + 0.004, sz > 0 ? pts[6][0] + 0.006 : pts[6][0] + 0.004);
        return pts;
      };
      const front = slope(1); slope(-1);
      for (const sx of [-1, 1]) K.prism(WOOD_D, [[-0.31, 1.215], [0.31, 1.215], [0.02, 1.4], [-0.02, 1.4]].map(([z, y]) => [z, y]), { plane: 'zy', a: sx * 0.6 - 0.008, b: sx * 0.6 + 0.008 });
      K.box(paint(0x2a2a30), -0.62, 1.39, -0.035, 0.62, 1.43, 0.035, { bevel: 0.01 });
      for (const sx of [-1, 1]) { K.box(GOLD, sx * 0.62 - 0.012, 1.385, -0.04, sx * 0.62 + 0.012, 1.435, 0.04, { bevel: 0.006 }); K.box(GOLD, sx * 0.6 - 0.01, front[6][1] - 0.02, front[6][0] - 0.01, sx * 0.6 + 0.01, front[6][1] + 0.01, front[6][0] + 0.012); }
      K.box(paint(0x2a2a30), -0.035, 1.43, -0.02, 0.035, 1.46, 0.02, { bevel: 0.006 });
      // the shimenawa (two twisted straw strands) and three zig-zag shide
      const strand = (ph) => { const p = []; for (let k = 0; k <= 30; k++) { const t = k / 30, x = -0.49 + t * 0.98, a = t * Math.PI * 14 + ph; p.push([x, 1.2 + Math.cos(a) * 0.007 - Math.sin(Math.PI * t) * 0.03, 0.24 + Math.sin(a) * 0.007]); } return p; };
      K.tube(matte(0xd8c080, 0.1), strand(0), 0.011, 5); K.tube(matte(0xc8b070, 0.1), strand(Math.PI), 0.011, 5);
      for (let i = 0; i < 3; i++) {
        const x = -0.3 + i * 0.3, y = 1.17 - Math.sin(Math.PI * ((x + 0.49) / 0.98)) * 0.03, z = 0.246;
        const Z = [[0, 0], [0.024, 0], [0.024, -0.03], [0.008, -0.03], [0.008, -0.06], [0.03, -0.06], [0.03, -0.1], [0.014, -0.1], [0.014, -0.07], [-0.008, -0.07], [-0.008, -0.04], [0.008, -0.04], [0.008, -0.012], [0, -0.012]];
        K.prism(flat(0xfbf8f0, 0.9), Z.map(([a, b]) => [x - 0.012 + a, y + b]), { plane: 'xy', a: z, b: z + 0.002 });
      }
    },
  },
  // ------------------------------------------------------------- the space pod's base: a round deck with a glowing band
  mu_space_pod: {
    box: [-0.5, 0, -0.5, 0.5, 0.31, 0.5],
    build: (K) => {
      K.lathe(paint(0x1a1e3a, 0.2), [0, 0, 0], [[0, 0], [0.44, 0], [0.47, 0.02], [0.48, 0.07]], 32);
      K.lathe(chrome(0xb8c0d0), [0, 0, 0], [[0.48, 0.07], [0.485, 0.08], [0.485, 0.1], [0.48, 0.11]], 32);
      K.glow(() => K.lathe(flat(0x7ad8ff, 0.9), [0, 0, 0], [[0.48, 0.11], [0.482, 0.13], [0.482, 0.17], [0.48, 0.19]], 32));
      K.lathe(chrome(0xb8c0d0), [0, 0, 0], [[0.48, 0.19], [0.485, 0.2], [0.485, 0.24], [0.475, 0.27], [0.46, 0.28]], 32);
      K.lathe(paint(0x0f1230, 0.1), [0, 0, 0], [[0.46, 0.28], [0.45, 0.29], [0, 0.29]], 32);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; K.cyl(chrome(), Math.cos(a) * 0.483, 0.225, Math.sin(a) * 0.483, 0.006, 0.006, 6, { axis: 'x' }); }
      K.glow(() => { for (let k = 0; k < 18; k++) { const a = k * 2.399, r = 0.42 * Math.sqrt((k + 0.5) / 18); K.cyl(flat(0xffffff, 0.9), Math.cos(a) * r, 0.29, Math.sin(a) * r, 0.006 + (k % 3) * 0.002, 0.002, 6); } });
    },
  },
};

// ================================================================== GACHA KAIKAN
const KAIKAN = {
  // the info counter by the door (3.1 x 1.06 x 0.8): its front (+z) faces the shop floor
  kk_counter: {
    box: [-1.55, 0, -0.4, 1.55, 1.07, 0.42],
    build: (K) => {
      const P = paint(0xf04a8a, 0.18), TOP = ceramic(0xf4f0e8);
      K.box(darken(0xf04a8a, 0.55), -1.47, 0, -0.3, 1.47, 0.1, 0.3); // the recessed kick
      K.box(P, -1.5, 0.1, -0.35, 1.5, 1.0, 0.35, { bevel: 0.012 });
      for (let k = -9; k <= 9; k++) K.box(paint(darken(0xf04a8a, 0.12)), k * 0.15 - 0.006, 0.14, 0.35, k * 0.15 + 0.006, 0.7, 0.356); // fluted front
      K.box(STEEL, -1.5, 0.1, 0.345, 1.5, 0.13, 0.36, { bevel: 0.004 });
      K.box(TOP, -1.55, 1.0, -0.4, 1.55, 1.06, 0.4, { bevel: 0.02 });
      K.glow(() => K.box(flat(0xffd8e8, 0.9), -1.3, 0.76, 0.352, 1.3, 0.84, 0.36));
      K.box(STEEL, -1.32, 0.745, 0.35, 1.32, 0.76, 0.364); K.box(STEEL, -1.32, 0.84, 0.35, 1.32, 0.855, 0.364);
      const V = K.patch('kk_info', 96, 26, (V) => { V.fill(0xf4f0e6); V.frame(0, 0, 96, 26, 0xf04a8a); V.frame(1, 1, 95, 25, 0xf8d0dc); V.box(4, 4, 22, 22, 0xf04a8a); V.disc(13.5, 18.5, 1.7, 0xffffff); V.box(12, 6, 15, 15, 0xffffff); V.box(11, 6, 16, 7, 0xffffff); V.box(11, 14, 15, 15, 0xffffff); kana(K, V, 'ご案内', 59, 24, 0x241a1e, { size: 12, align: 'center' }); V.text5('INFORMATION', 59, 9, 0xb83a68, { align: 'center' }); }, { rough: 0.6 });
      K.box(paint(0xf4f0e6), -0.4, 0.37, 0.352, 0.4, 0.59, 0.364, { bevel: 0.006 }); K.face(V, '+z', -0.385, 0.378, 0.385, 0.582, 0.3645);
      // the back: shelves and a cupboard door for the staff
      K.box(paint(0xe8e2d8), -1.45, 0.12, -0.352, 1.45, 0.98, -0.34);
      for (const y of [0.45, 0.72]) K.box(WOOD_L, -1.44, y, -0.33, 1.44, y + 0.018, -0.05);
    },
  },
  // the escalator / lift signs' cabinets (the printed neon face sits in front of them): aluminium-framed lightboxes
  kk_sign_6: { box: [-3.06, -0.48, -0.1, 3.06, 0.48, 0.02], build: (K) => lightbox(K, 6, 0.9, 0.1) },
  kk_sign_5: { box: [-2.56, -0.48, -0.1, 2.56, 0.48, 0.02], build: (K) => lightbox(K, 5, 0.9, 0.1) },
  kk_sign_dir: { box: [-0.54, -0.69, -0.06, 0.54, 0.69, 0.02], build: (K) => lightbox(K, 1.0, 1.3, 0.05) },
  kk_sign_esc: { box: [-0.94, -0.2, -0.08, 0.94, 1.26, 0.02], build: (K) => { lightbox(K, 1.8, 0.35, 0.06, true); for (const sx of [-1, 1]) { K.cyl(STEEL, sx * 0.7, 0.18, -0.03, 0.006, 1.07, 6); K.box(STEEL, sx * 0.7 - 0.02, 0.16, -0.06, sx * 0.7 + 0.02, 0.2, 0.0, { bevel: 0.004 }); } } },
  // a hanging sale banner's rails (1.6 x 0.8 banner) and its wires up to the ceiling (0.55 m)
  kk_banner: {
    box: [-0.84, -0.44, -0.03, 0.84, 1.07, 0.03],
    build: (K) => {
      for (const y of [-0.41, 0.41]) { K.box(STEEL, -0.82, y - 0.014, -0.012, 0.82, y + 0.014, 0.012, { bevel: 0.006 }); for (const sx of [-1, 1]) K.box(plastic(0x2a2a30), sx * 0.82 - 0.012, y - 0.016, -0.014, sx * 0.82 + 0.012, y + 0.016, 0.014, { bevel: 0.006 }); }
      for (const sx of [-1, 1]) { K.rod(STEEL, [sx * 0.6, 0.425, 0], [sx * 0.6, 1.05, 0], 0.0025, 4); K.cyl(STEEL, sx * 0.6, 1.04, 0, 0.018, 0.01, 8); K.ball(STEEL, sx * 0.6, 0.43, 0, 0.007, 0.01, 0.007, 6, 3); }
    },
  },
  // the floor's round centrepiece plinth (r 1.05, h 0.35), one per floor colour
  ...Object.fromEntries([[1, 0xf04a8a], [2, 0x2ab8e8], [3, 0xc84a2a], [4, 0x2a2630]].map(([n, c]) => [`kk_plinth_${n}`, {
    box: [-1.07, 0, -1.07, 1.07, 0.36, 1.07],
    build: (K) => {
      K.lathe(chrome(0xc8ccd2), [0, 0, 0], [[0, 0], [1.03, 0], [1.04, 0.01], [1.04, 0.05], [1.03, 0.06]], 40);
      K.lathe(paint(c, 0.2), [0, 0, 0], [[1.03, 0.06], [1.035, 0.07], [1.02, 0.3], [1.03, 0.31]], 40);
      K.lathe(ceramic(0xf4f0e8), [0, 0, 0], [[1.03, 0.31], [1.06, 0.318], [1.065, 0.34], [1.05, 0.352], [0, 0.352]], 40);
      K.glow(() => K.lathe(flat(lighten(c, 0.55), 0.9), [0, 0, 0], [[1.022, 0.27], [1.026, 0.275], [1.026, 0.29], [1.022, 0.295]], 40));
    },
  }])),
  // the stock room door: frame, leaf, kick plate, push plate and lever (1.2 x 2.2, flat on the wall, front +z)
  kk_door: {
    box: [-0.62, 0, -0.04, 0.62, 2.22, 0.06],
    build: (K) => {
      const FR = paint(0x8a9098, 0.2);
      for (const sx of [-1, 1]) K.box(FR, sx * 0.55 - 0.05, 0, -0.03, sx * 0.55 + 0.05, 2.2, 0.04, { bevel: 0.008 });
      K.box(FR, -0.6, 2.1, -0.03, 0.6, 2.2, 0.04, { bevel: 0.008 });
      K.box(paint(0x7a8088, 0.18), -0.5, 0.005, -0.02, 0.5, 2.1, 0.02, { bevel: 0.006 });
      K.box(STEEL, -0.48, 0.02, 0.02, 0.48, 0.24, 0.024, { bevel: 0.002 });
      K.box(STEEL, 0.3, 0.95, 0.02, 0.42, 1.3, 0.024, { bevel: 0.002 });
      K.cyl(STEEL, 0.36, 1.0, 0.024, 0.022, 0.02, 10, { axis: 'z' }); K.box(STEEL, 0.36, 0.99, 0.034, 0.48, 1.01, 0.05, { bevel: 0.006 });
      const V = K.patch('kk_stock', 40, 12, (V) => { V.fill(0x2a2a30); V.text5('STOCK', 4, 9, 0xf4f0e6); kana(K, V, '倉庫', 30, 10, 0xf4f0e6, { size: 8, align: 'center' }); }, { rough: 0.5 });
      K.box(plastic(0x2a2a30), -0.25, 1.62, 0.02, 0.25, 1.78, 0.03, { bevel: 0.004 }); K.face(V, '+z', -0.24, 1.63, 0.24, 1.77, 0.0305);
    },
  },
  // the lift: its stainless architrave (0.55 m leaves: 1.1 + frame), the call-button plate and the indicator's case
  kk_lift_frame: {
    box: [-0.7, 0, -0.04, 0.7, 2.3, 0.08],
    build: (K) => {
      const S = chrome(0xc8ccd2);
      for (const sx of [-1, 1]) { K.box(S, sx * 0.59 - 0.05, 0, -0.03, sx * 0.59 + 0.05, 2.2, 0.05, { bevel: 0.012 }); K.box(S, sx * 0.59 - 0.04, 0, 0.05, sx * 0.59 + 0.04, 2.16, 0.065, { bevel: 0.006 }); }
      K.box(S, -0.64, 2.12, -0.03, 0.64, 2.24, 0.05, { bevel: 0.012 }); K.box(S, -0.63, 2.13, 0.05, 0.63, 2.2, 0.065, { bevel: 0.006 });
      K.box(paint(0x3a3c42), -0.55, 0, -0.03, 0.55, 0.012, 0.05); // the sill with its groove
      K.box(STEEL, -0.55, 0.012, 0.0, 0.55, 0.016, 0.02);
    },
  },
  kk_lift_call: {
    box: [-0.08, -0.14, -0.01, 0.08, 0.14, 0.03],
    build: (K) => { K.box(chrome(0xc8ccd2), -0.075, -0.13, -0.005, 0.075, 0.13, 0.008, { bevel: 0.006 }); K.cyl(chrome(0xd8dce2), 0, 0, 0.008, 0.032, 0.006, 16, { axis: 'z' }); },
  },
  kk_lift_ind: {
    box: [-0.22, -0.13, -0.02, 0.22, 0.13, 0.04],
    build: (K) => { const S = chrome(0xc8ccd2); K.box(paint(0x1a1a1e), -0.21, -0.12, -0.01, 0.21, 0.12, 0.012); for (const y of [-0.115, 0.115]) K.box(S, -0.215, y - 0.012, -0.01, 0.215, y + 0.012, 0.03, { bevel: 0.006 }); for (const sx of [-1, 1]) K.box(S, sx * 0.203 - 0.012, -0.115, -0.01, sx * 0.203 + 0.012, 0.115, 0.03, { bevel: 0.006 }); },
  },
};
/** A lightbox cabinet w x h, depth d, its face at z = 0 (the printed face goes on top): a dark aluminium frame with a lip. */
function lightbox(K, w, h, d, hanging = false) {
  const FR = metal(0x34363c, 0.25);
  K.box(paint(0x222228, 0.1), -w / 2, -h / 2, -d, w / 2, h / 2, -0.004, { bevel: 0.008 });
  for (const sy of [-1, 1]) K.box(FR, -w / 2 - 0.02, sy * h / 2 - 0.02, -d - 0.004, w / 2 + 0.02, sy * h / 2 + 0.02, 0.012, { bevel: 0.007 });
  for (const sx of [-1, 1]) K.box(FR, sx * w / 2 - 0.02, -h / 2, -d - 0.004, sx * w / 2 + 0.02, h / 2, 0.012, { bevel: 0.007 });
  if (!hanging) for (const sx of [-1, 1]) for (const sy of [-1, 1]) K.cyl(STEEL, sx * (w / 2 - 0.1), sy * (h / 2 - 0.08), -d - 0.004, 0.012, 0.006, 8, { axis: 'z' });
}

// ================================================================== the annex (old Mr. Sugimoto's tobacco shop)
const ANNEX = {
  // the old tobacco counter under the window: a tiled front, a varnished top (1.5 x 0.9 x 0.66)
  ax_counter: {
    box: [-0.76, 0, -0.34, 0.76, 0.91, 0.34],
    build: (K) => {
      const tiles = K.patch('ax_tiles', 56, 34, (V) => {
        V.fill(0xe8e0d0);
        for (let j = 0; j < 34; j += 4) for (let i = (j / 4) % 2 ? 2 : 0; i < 56; i += 4) { const c = ((i * 7 + j * 3) % 11) < 2 ? 0xd85a46 : ((i + j) % 9 < 1 ? 0xa83a2c : 0xc84a3a); V.box(i, j, i + 3, j + 3, c); }
      }, { rough: 0.35, shared: true });
      K.box(darken(0xc84a3a, 0.6), -0.68, 0, -0.27, 0.68, 0.06, 0.27);
      K.box(paint(0xb8b0a0), -0.7, 0.06, -0.3, 0.7, 0.85, 0.3, { bevel: 0.006 });
      K.face(tiles, '+z', -0.69, 0.07, 0.69, 0.84, 0.3008);
      K.face(tiles, '-x', -0.29, 0.07, 0.29, 0.84, -0.7008); K.face(tiles, '+x', -0.29, 0.07, 0.29, 0.84, 0.7008);
      plank(K, 0xc8a070, -0.75, 0.85, -0.33, 0.75, 0.9, 0.33, { axis: 'x' });
      K.box(wood(0xa88050), -0.752, 0.84, 0.325, 0.752, 0.9, 0.335, { bevel: 0.008 });
      // the old coin tray and the little bell
      K.box(plastic(0x2a5a3a), -0.12, 0.9, 0.06, 0.12, 0.906, 0.24, { bevel: 0.003 });
      K.box(plastic(0x234a30), -0.1, 0.906, 0.08, 0.1, 0.908, 0.22);
    },
  },
  // the cigarette shelves on the right wall (2.6 long, 2.0 tall, 0.32 deep): back, sides, five shelves, a cornice
  ax_shelf: {
    box: [-1.32, 0, -0.17, 1.32, 2.08, 0.18],
    build: (K) => {
      const c = 0x7a5230, L = 0xb89068;
      K.box(wood(darken(c, 0.1)), -1.3, 0, -0.17, 1.3, 2.0, -0.14);
      for (const sx of [-1.3, 1.3]) plank(K, c, sx - 0.02, 0, -0.14, sx + 0.02, 2.0, 0.16, { axis: 'y' });
      for (let i = 0; i < 5; i++) {
        const y = 0.35 + i * 0.38;
        plank(K, L, -1.28, y, -0.14, 1.28, y + 0.025, 0.15, { axis: 'x' });
        K.box(wood(darken(L, 0.2)), -1.28, y + 0.018, 0.14, 1.28, y + 0.045, 0.152, { bevel: 0.003 }); // the price rail's lip
        for (const x of [-0.65, 0, 0.65]) K.prism(wood(c), [[-0.14, y], [-0.02, y], [-0.14, y - 0.12]], { plane: 'zy', a: x - 0.012, b: x + 0.012 });
      }
      plank(K, c, -1.3, 0, 0.12, 1.3, 0.3, 0.16, { axis: 'x' });
      K.box(wood(darken(c, 0.15)), -1.32, 2.0, -0.17, 1.32, 2.05, 0.18, { bevel: 0.01 });
      K.box(wood(darken(c, 0.25)), -1.31, 2.05, -0.16, 1.31, 2.075, 0.17, { bevel: 0.006 });
    },
  },
  // the back door to the old rooms: a framed panel door with a brass knob (0.85 x 1.95), flat on the back wall
  ax_door: {
    box: [-0.5, 0, -0.03, 0.5, 2.05, 0.08],
    build: (K) => {
      const c = 0x6a4a30;
      for (const sx of [-1, 1]) K.box(wood(darken(c, 0.15)), sx * 0.46 - 0.04, 0, -0.02, sx * 0.46 + 0.04, 2.0, 0.035, { bevel: 0.006 });
      K.box(wood(darken(c, 0.15)), -0.5, 1.95, -0.02, 0.5, 2.03, 0.035, { bevel: 0.006 });
      K.box(wood(c), -0.425, 0, -0.01, 0.425, 1.95, 0.02, { bevel: 0.004 });
      panel(K, wood(c), -0.37, 1.05, 0.37, 1.85, 0.02); panel(K, wood(c), -0.37, 0.12, 0.37, 0.92, 0.02);
      K.box(BRASS, -0.32, 0.92, 0.02, -0.26, 1.06, 0.026, { bevel: 0.002 });
      K.cyl(BRASS, -0.29, 0.99, 0.026, 0.006, 0.03, 8, { axis: 'z' }); K.ball(BRASS, -0.29, 0.99, 0.065, 0.024, 0.024, 0.02, 10, 4);
      K.cyl(BRASS, -0.29, 0.94, 0.026, 0.005, 0.002, 8, { axis: 'z' });
    },
  },
};

// ================================================================== the customer guestbook's notebook and pen
const GUESTBOOK = {
  // the open notebook (0.4 x 0.26): its hard covers, the page blocks' edges and the spine; the pages themselves are the
  // guestbook's own redrawn canvas, laid on top by src/talk/guestbook.js (y of the page tops: 0.016 at the outer edge)
  gb_book: {
    box: [-0.21, -0.004, -0.14, 0.21, 0.03, 0.14],
    build: (K) => {
      const COVER = fabric(0x8a2a2a), CLOTH = fabric(0x6a1e22), PAGE = matte(0xf2ecdc, 0.06);
      for (const sx of [-1, 1]) {
        K.box(COVER, sx > 0 ? 0.004 : -0.205, -0.004, -0.135, sx > 0 ? 0.205 : -0.004, 0.0, 0.135, { bevel: 0.0015 });
        // the page block: a stack thickening toward the spine, its edges ruled
        const pts = []; for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([sx * (0.008 + t * 0.19), 0.004 + 0.012 * Math.sin(Math.PI * 0.5 * (1 - t)) ** 0.6 + 0.004 * (1 - t)]); }
        for (const sz of [-1, 1]) for (let k = 0; k < 6; k++) { const [xa, ya] = pts[k], [xb, yb] = pts[k + 1]; K.quad(PAGE, [xa, 0.0, sz * 0.128], [xb, 0.0, sz * 0.128], [xb, yb, sz * 0.128], [xa, ya, sz * 0.128], [0, 0, sz]); }
        K.quad(PAGE, [pts[6][0], 0, -0.128], [pts[6][0], 0, 0.128], [pts[6][0], pts[6][1], 0.128], [pts[6][0], pts[6][1], -0.128], [sx, 0, 0]);
        for (const y of [0.004, 0.008]) K.box(matte(0xd8d0bc), sx > 0 ? pts[6][0] - 0.0004 : pts[6][0] - 0.0002, y, -0.127, sx > 0 ? pts[6][0] + 0.0002 : pts[6][0] + 0.0004, y + 0.0006, 0.127);
      }
      K.box(CLOTH, -0.008, -0.006, -0.137, 0.008, 0.004, 0.137, { bevel: 0.003 }); // the spine
      // a ribbon bookmark trailing out at the bottom
      const rib = [[0.0, 0.0215, -0.06], [0.001, 0.016, -0.128], [0.004, 0.0, -0.142], [0.009, -0.03, -0.148]];
      for (let k = 0; k + 1 < rib.length; k++) { const [a, b] = [rib[k], rib[k + 1]]; K.sheet(fabric(0xd8b048), [a[0] - 0.003, a[1], a[2]], [a[0] + 0.003, a[1], a[2]], [b[0] + 0.003, b[1], b[2]], [b[0] - 0.003, b[1], b[2]]); }
    },
  },
  // a click ballpoint on a little chain: barrel, grip, clip, cone and tip (0.14 long, along +x)
  gb_pen: {
    box: [-0.072, -0.008, -0.008, 0.072, 0.012, 0.008],
    build: (K) => {
      const BODY = plastic(0x2a2a3a, 0.25);
      K.lathe(BODY, [-0.05, 0, 0], [[0, 0], [0.0042, 0.003], [0.0045, 0.08], [0.0046, 0.085]], 10, { axis: 'x' });
      K.lathe(rubber(0x1e1e24), [0.035, 0, 0], [[0.0046, 0], [0.0052, 0.004], [0.0052, 0.018], [0.0046, 0.022]], 10, { axis: 'x' });
      K.lathe(chrome(), [0.057, 0, 0], [[0.0046, 0], [0.0036, 0.006], [0.0012, 0.012], [0.0008, 0.0135], [0, 0.0145]], 10, { axis: 'x' });
      K.lathe(chrome(), [-0.068, 0, 0], [[0, 0], [0.0025, 0.002], [0.0028, 0.012], [0.0042, 0.018]], 8, { axis: 'x' });
      K.box(chrome(), -0.05, 0.0045, -0.0012, -0.012, 0.0062, 0.0012, { bevel: 0.0005 });
      K.box(chrome(), -0.016, 0.0028, -0.0012, -0.012, 0.0062, 0.0012);
    },
  },
};

void box; void mascot; void smallPrint; void framed; void rubber; void flat; void mix;
export default { family: 'fixtures', models: { ...MUSEUM, ...KAIKAN, ...ANNEX, ...GUESTBOOK } };
