// MIKAWA-YA's own fixtures (ids from src/data/props/dagashi.js, plus the plant wagon from food.js): the open milk case,
// the ice-cream chest, the ramune tub on its stand, the broom bucket, the pocket watch's glass case, the battery peg
// stand, the box of fluorescent tubes, three candy jars, the ¥10 puff-stick box, a carton of snacks, and the old man's
// back room (chabudai, a full ashtray, tea things, zabuton, tansu, the black phone, the kamidana, his cigar box, the
// TV cabinet). Boxes are the old voxel bounds (the shop places stock on these shelves and in these tubs).
import { paint, enamel, plastic, metal, chrome, matte, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, leaf, plank, bottle } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot, photoInto } from '../kit/prints.js';
import { sweep } from '../things/form.js';

const WHITE = 0xe8e6de, BLUE = 0x2f6fd6, RED = 0xd8382e, CARD = 0xc49a62;
const BOUNDS = {
  mk_dairy_case: [-0.45, 0, -0.29, 0.45, 1.72, 0.29], mk_ice_freezer: [-0.6, 0, -0.31, 0.6, 0.88, 0.31], mk_ramune_tub: [-0.42, 0, -0.3, 0.42, 0.66, 0.3],
  mk_broom_bin: [-0.1575, 0, -0.1575, 0.1575, 0.96, 0.1575], mk_watch_case: [-0.105, 0, -0.08, 0.105, 0.17, 0.08], mk_peg_stand: [-0.115, 0, -0.065, 0.115, 0.39, 0.065],
  mk_tube_box: [-0.12, 0, -0.11, 0.12, 0.78, 0.11], mk_candy_jar_a: [-0.075, 0, -0.075, 0.075, 0.23, 0.075], mk_candy_jar_b: [-0.075, 0, -0.075, 0.075, 0.23, 0.075],
  mk_candy_jar_c: [-0.075, 0, -0.075, 0.075, 0.23, 0.075], mk_puff_box: [-0.105, 0, -0.07, 0.105, 0.23, 0.07], mk_chabudai: [-0.39, 0, -0.39, 0.39, 0.32, 0.39],
  mk_ashtray: [-0.099, 0, -0.087, 0.099, 0.048, 0.087], mk_tea_set: [-0.145, 0, -0.095, 0.145, 0.14, 0.095], mk_zabuton: [-0.28, 0, -0.3, 0.28, 0.12, 0.3],
  mk_tansu: [-0.47, 0, -0.24, 0.47, 0.96, 0.24], mk_phone: [-0.12, 0, -0.105, 0.12, 0.12, 0.105], mk_kamidana: [-0.3675, 0, -0.1425, 0.3675, 0.405, 0.1425],
  mk_cigar_box: [-0.16, 0, -0.09, 0.16, 0.21, 0.09], mk_tv_cabinet: [-0.33, 0, -0.26, 0.33, 0.38, 0.26], mk_snack_carton: [-0.23, 0, -0.18, 0.23, 0.38, 0.18],
  mk_wagon: [-0.31, 0, -0.21, 0.31, 0.84, 0.21],
};

/** A paper price card (white, red figures), standing on (x, y, z) facing +z. */
function priceCard(K, x, y, z, txt, w = 0.04) {
  const V = K.patch('pc' + txt, 24, 14, (V) => { framed(V, 0xf2efe6, 0xc8302a); V.text5(txt, 12, 11, 0xc8302a, { align: 'center' }); }, { rough: 0.9, shared: true });
  K.face(V, '+z', x - w / 2, y, x + w / 2, y + w * 0.58, z);
}
/** A little glass bottle of coffee milk (paper cap, a printed band). */
function milkBottle(K, x, y, z, coffee) {
  const lab = K.patch(coffee ? 'cmilk' : 'wmilk', 16, 8, (V) => { V.fill(0xf4efe2); V.box(0, 2, 16, 6, coffee ? 0x8a5a2a : BLUE); V.text5(coffee ? 'CO' : 'MI', 3, 6, 0xf4efe2); }, { rough: 0.4, shared: true });
  bottle(K, x, y, z, 0.022, 0.095, K.tint(0xe8f2f0, 90), { glassy: true, fill: flat(coffee ? 0xc89a6a : 0xf2efe6, 0.4), level: 1.1, shoulder: 0.62, neck: 0.017, label: lab, l0: 0.2, l1: 0.42, cap: flat(coffee ? 0xd8382e : 0x3a7ad8, 0.5), capH: 0.006 });
}
/** A wrapped sweet: a little lozenge with twisted ends. */
function sweet(K, c, x, y, z, ry, rz = 0) {
  K.at([x, y, z], () => {
    K.ball(plastic(c, 0.35), 0, 0, 0, 0.0115, 0.008, 0.008, 8, 3);
    for (const s of [-1, 1]) K.at([s * 0.011, 0, 0], () => K.lathe(plastic(lighten(c, 0.15), 0.3), [0, 0, 0], [[0, 0], [0.006, 0.007]], 6, { axis: 'x' }), { ry: s < 0 ? Math.PI : 0 });
  }, { ry, rz });
}

const models = {
  // ------------------------------------------------------------- the open milk case: a white canopy, wire shelves at 0.8 and 1.16
  mk_dairy_case: (K, B) => {
    const w = enamel(WHITE), blue = enamel(BLUE), steel = metal(0xb8bec4, 0.35), liner = enamel(0xd6e2e8);
    // the side panels: full depth at the foot and under the canopy, cut back to show the shelves
    const side = [[-0.29, 0], [0.27, 0], [0.27, 0.44], [0.13, 0.56], [0.13, 1.47], [0.27, 1.5], [0.27, 1.72], [-0.29, 1.72]];
    for (const s of [-1, 1]) K.prism(w, side, { plane: 'zy', a: s * 0.45, b: s * 0.42 });
    K.box(w, -0.42, 0, -0.29, 0.42, 1.5, -0.255);
    K.box(liner, -0.42, 0.31, -0.256, 0.42, 1.46, -0.252);
    // the plinth with its grille, the well and its front lip (a blue stripe)
    K.box(paint(0x8a9098), -0.42, 0, 0.2, 0.42, 0.29, 0.27, { bevel: 0.006 });
    const gr = K.patch('grille', 64, 16, (V) => { V.fill(0x8a9098); for (let i = 3; i < 62; i += 4) { V.box(i, 2, i + 2, 14, 0x3a3e44); V.box(i + 2, 2, i + 3, 14, 0xa8aeb4); } }, { rough: 0.5 });
    K.face(gr, '+z', -0.38, 0.04, 0.38, 0.24, 0.2705);
    K.box(w, -0.42, 0.29, 0.17, 0.42, 0.44, 0.27, { bevel: 0.01 });
    K.box(blue, -0.42, 0.37, 0.2705, 0.42, 0.395, 0.272);
    K.box(liner, -0.42, 0.29, -0.255, 0.42, 0.31, 0.17);
    // the canopy, its header band (the 牛乳 sign is a separate decal) and the tube under it
    K.box(w, -0.45, 1.5, -0.29, 0.45, 1.72, 0.27, { bevel: 0.012 });
    K.box(blue, -0.45, 1.53, 0.27, 0.45, 1.7, 0.29, { bevel: 0.006 });
    K.box(flat(0x26282c), -0.4, 1.497, 0.1, 0.4, 1.5, 0.25);
    K.glow(() => K.cyl(0xfff4e0, -0.38, 1.485, 0.16, 0.012, 0.76, 10, { axis: 'x' }));
    // wire shelves at 0.80 and 1.16 with red price rails
    for (const y of [0.8, 1.16]) {
      K.box(steel, -0.42, y - 0.012, -0.25, 0.42, y - 0.006, -0.24);
      K.box(steel, -0.42, y - 0.012, 0.11, 0.42, y - 0.004, 0.12);
      for (let k = 0; k <= 20; k++) { const x = -0.41 + k * 0.041; K.box(steel, x - 0.002, y - 0.006, -0.25, x + 0.002, y - 0.002, 0.12); }
      for (let k = 0; k < 4; k++) K.box(steel, -0.42, y - 0.004, -0.2 + k * 0.08, 0.42, y, -0.196 + k * 0.08);
      K.box(paint(RED), -0.42, y - 0.03, 0.12, 0.42, y - 0.004, 0.13);
      for (const [x, t] of [[-0.3, '98'], [0.08, '120'], [0.3, '80']]) priceCard(K, x, y - 0.028, 0.1302, t, 0.035);
    }
    // the well: coffee-milk bottles, yogurt cups, butter
    for (let i = 0; i < 9; i++) {
      const x = -0.36 + i * 0.09, z = -0.12 + (i % 2) * 0.12;
      if (i % 3 === 0) { const c = [0xf4f0e4, 0xf8c8d4, 0xfff2b8][i % 3 === 0 ? (i / 3) % 3 : 0]; K.lathe(plastic(c, 0.2), [x, 0.31, z], [[0, 0], [0.028, 0], [0.034, 0.05], [0, 0.05]], 10); K.lathe(flat(0xd8d4c8, 0.3), [x, 0.36, z], [[0.035, 0], [0, 0.002]], 10); }
      else milkBottle(K, x, 0.31, z, i % 2 === 1);
    }
    // the shelves: juice and coffee milk at the ends (the milk for sale stands in the middle)
    for (const [y, xs] of [[0.8, [-0.38, -0.31, 0.3, 0.37]], [1.16, [-0.37, 0.34]]]) for (const x of xs) milkBottle(K, x, y, -0.08, Math.abs(x * 100) % 2 > 0.5);
  },

  // ------------------------------------------------------------- the ice-cream chest: white, two sliding glass lids, ice cream under frost
  mk_ice_freezer: (K, B) => {
    const w = enamel(WHITE), alu = metal(0xc4c8cc, 0.4);
    K.box(w, -0.6, 0.05, -0.31, 0.6, 0.84, 0.31, { bevel: 0.035 });
    K.box(rubber(0x34363a), -0.57, 0, -0.28, 0.57, 0.06, 0.28);
    for (const x of [-0.52, 0.52]) for (const z of [-0.23, 0.23]) K.cyl(rubber(0x26262a), x, 0, z, 0.025, 0.012, 10);
    const vent = K.patch('vent', 48, 12, (V) => { V.fill(0x4a4e54); for (let i = 2; i < 46; i += 3) V.box(i, 2, i + 2, 10, 0x1e2024); }, { rough: 0.5 });
    K.face(vent, '+z', -0.5, 0.075, -0.1, 0.16, 0.3105);
    K.box(enamel(BLUE), -0.6, 0.58, 0.309, 0.6, 0.61, 0.312);
    K.box(enamel(BLUE), -0.6, 0.58, -0.312, 0.6, 0.61, -0.309);
    // the logo plate
    const logo = K.patch('logo', 40, 16, (V) => { framed(V, 0xf2efe6, BLUE); V.text5('ICE', 20, 13, RED, { align: 'center', s: 1 }); mascot(V, 'kaeru', 29, 14, { g: 0x5ab8d8 }); }, { rough: 0.4 });
    K.face(logo, '+z', 0.3, 0.68, 0.5, 0.76, 0.3105);
    // the rim frame and the well inside
    K.box(alu, -0.6, 0.84, -0.31, 0.6, 0.865, 0.31, { bevel: 0.008 });
    K.box(enamel(0xdfe8ee), -0.56, 0.5, -0.27, 0.56, 0.845, 0.27, { inward: true, skip: ['py'] });
    // ice cream: boxes and bars laid in rows, a dusting of frost on them
    const pal = [[0xd8382e, 0xf2efe6], [0x3a7ad8, 0xf2c21c], [0xf2c21c, 0x8a5a2a], [0x58b06c, 0xf2efe6], [0xf06a8a, 0xf2efe6], [0x8a5a2a, 0xf2c21c]];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
      const [a, b] = pal[(r * 3 + c) % pal.length], x = -0.5 + c * 0.125, z = -0.2 + r * 0.13;
      const lab = K.patch('ice' + ((r * 3 + c) % pal.length), 12, 20, (V) => { V.fill(a); V.box(0, 7, 12, 13, b); V.box(2, 15, 10, 18, lighten(a, 0.3)); V.px(5, 10, a); V.px(6, 10, a); }, { rough: 0.6 });
      K.at([x, 0.72 + ((r + c) % 3) * 0.012, z], () => { K.box(matte(a, 0.1), -0.05, 0, -0.03, 0.05, 0.035, 0.03, { bevel: 0.004 }); K.face(lab, '+y', -0.046, -0.027, 0.046, 0.027, 0.0352, { rot: 1 }); }, { ry: ((r * 7 + c * 3) % 5 - 2) * 0.08 });
    }
    // the lids: aluminium frames, glass slightly frosted, one slid half over the other
    for (const [x0, x1, y] of [[-0.585, 0.02, 0.866], [-0.12, 0.585, 0.878]]) {
      K.box(alu, x0, y, -0.3, x1, y + 0.012, -0.28); K.box(alu, x0, y, 0.28, x1, y + 0.012, 0.3);
      K.box(alu, x0, y, -0.28, x0 + 0.02, y + 0.012, 0.28); K.box(alu, x1 - 0.02, y, -0.28, x1, y + 0.012, 0.28);
      K.box(plastic(0x4a4e54), x1 - 0.06, y + 0.012, -0.03, x1 - 0.03, y + 0.018, 0.03, { bevel: 0.003 });
      K.glass(() => K.box(K.tint(0xe6f2f6, 70, 0.08), x0 + 0.02, y + 0.004, -0.28, x1 - 0.02, y + 0.008, 0.28));
    }
  },

  // ------------------------------------------------------------- the ramune tub: a galvanised oval tub of ice water on a wooden stand
  mk_ramune_tub: (K, B) => {
    const legs = 0x8a5a32;
    for (const x of [-0.34, 0.3]) for (const z of [-0.2, 0.18]) plank(K, legs, x, 0, z, x + 0.04, 0.4, z + 0.04, { bevel: 0.004, axis: 'y' });
    for (const z of [-0.2, 0.18]) plank(K, legs, -0.34, 0.1, z + 0.005, 0.34, 0.13, z + 0.035, { bevel: 0.003 });
    for (const x of [-0.34, 0.3]) plank(K, legs, x + 0.005, 0.1, -0.2, x + 0.035, 0.13, 0.22, { bevel: 0.003, axis: 'z' });
    for (let k = 0; k < 5; k++) plank(K, darken(legs, 0.05), -0.36, 0.38, -0.22 + k * 0.09, 0.36, 0.41, -0.15 + k * 0.09, { bevel: 0.003, v: k });
    // the tub: ridged walls, a rolled rim, drop handles at the ends
    const galv = metal(0xa9afb2, 0.3), y0 = 0.41, ez = 0.7;
    const prof = [[0, 0], [0.37, 0], [0.38, 0.01], [0.385, 0.05], [0.392, 0.056], [0.39, 0.062], [0.395, 0.12], [0.402, 0.126], [0.4, 0.132], [0.405, 0.2], [0.41, 0.21], [0.418, 0.222], [0.41, 0.23], [0.4, 0.226]];
    K.lathe(galv, [0, y0, 0], prof, 22, { sz: ez });
    K.lathe(flat(0x8a9094, 0.4), [0, y0, 0], [[0.4, 0.226], [0.37, 0.01], [0, 0.01]], 22, { sz: ez });
    for (const s of [-1, 1]) K.at([s * 0.415, y0 + 0.17, 0], () => { K.box(galv, -0.006, -0.012, -0.03, 0.006, 0.012, 0.03); K.tube(metal(0x8a9094, 0.2), [[0, 0, -0.035], [s * 0.025, -0.03, -0.03], [s * 0.03, -0.04, 0], [s * 0.025, -0.03, 0.03], [0, 0, 0.035]], 0.004, 5); });
    // ice water: a tinted surface, ice floating, a few bottles lying in it
    K.glass(() => K.lathe(K.tint(0x7ab8d0, 120, 0.05), [0, y0, 0], [[0.396, 0.15], [0, 0.15]], 22, { sz: ez }));
    K.lathe(flat(0x5a98b4, 0.3), [0, y0, 0], [[0.38, 0.06], [0, 0.06]], 22, { sz: ez });
    const ice = K.tint(0xeaf6fa, 200, 0.1);
    for (let i = 0; i < 16; i++) { const a = i * 2.39, r = 0.08 + (i % 5) * 0.06; K.glass(() => K.at([Math.cos(a) * r, y0 + 0.152, Math.sin(a) * r * ez], () => K.box(ice, -0.018, -0.008, -0.016, 0.018, 0.01, 0.016, { bevel: 0.004 }), { ry: a, rz: (i % 3 - 1) * 0.2 })); }
    for (const [x, z, a] of [[-0.24, -0.08, 0.3], [-0.05, 0.12, -0.5], [0.2, -0.1, 1.2]]) K.at([x, y0 + 0.14, z], () => {
      K.glass(() => K.lathe(K.tint(0x9ee0d8, 150, 0.06), [0, 0, 0], [[0, 0], [0.028, 0], [0.03, 0.01], [0.03, 0.1], [0.022, 0.13], [0.016, 0.15], [0.02, 0.165], [0.015, 0.18], [0.013, 0.2]], 10, { axis: 'x' }));
      K.cyl(plastic(0x3f86e8, 0.2), 0.2, 0, 0, 0.015, 0.02, 10, { axis: 'x' });
    }, { ry: a, rz: 0.08 });
    priceCard(K, 0, 0.26, 0.24, '80', 0.06);
  },

  // ------------------------------------------------------------- the broom bucket: a ribbed galvanised can with a duster and hand brushes
  mk_broom_bin: (K, B) => {
    const galv = metal(0x9aa0a6, 0.3), r = 0.148, h = 0.33, prof = [[0, 0.004], [r - 0.012, 0.004], [r - 0.006, 0]];
    for (let k = 0; k <= 5; k++) { const y = 0.015 + k * 0.06; prof.push([r - 0.004, y], [r + 0.003, y + 0.006], [r - 0.004, y + 0.012]); }
    prof.push([r - 0.003, h - 0.008], [r + 0.006, h - 0.004], [r + 0.006, h + 0.004], [r - 0.005, h + 0.004]);
    K.lathe(galv, [0, 0, 0], prof, 18);
    K.lathe(flat(0x6a7074, 0.5), [0, 0, 0], [[r - 0.005, h + 0.004], [r - 0.012, 0.012], [0, 0.012]], 18);
    // the feather duster
    K.rod(wood(0x9a7a4a), [-0.06, 0.02, -0.045], [-0.09, 0.78, -0.075], 0.008, 6);
    const fth = [0x2a2a2a, 0x6a4a3a, 0x8a6a4a, 0x3a2a24];
    for (let k = 0; k < 22; k++) { const a = k * 2.4, t = (k % 5) / 5, r = 0.05 * (1 - t * 0.7); K.at([-0.09 + Math.cos(a) * r * 0.6, 0.83 + t * 0.09, -0.075 + Math.sin(a) * r * 0.6], () => blob(K, matte(fth[k % 4], 0.08), 0, 0, 0, 0.022, 0.06, 0.016, { seed: k, jit: 0.3 }), { rz: Math.cos(a) * 0.7 * (1 - t), rx: -Math.sin(a) * 0.7 * (1 - t) }); }
    // two bamboo hand brushes (hōki), the straw bound in red
    for (const [x, z, h2, tilt] of [[0.06, 0.06, 0.52, 0.12], [0.03, -0.075, 0.46, -0.1]]) {
      K.at([x, 0.02, z], () => {
        K.rod(matte(0xc9c06a, 0.15), [0, 0, 0], [0, h2 - 0.12, 0], 0.007, 6);
        K.lathe(matte(0xd4b46a, 0.1), [0, h2 - 0.13, 0], [[0.008, 0], [0.03, 0.03], [0.042, 0.11], [0.038, 0.125], [0, 0.128]], 10, { sz: 0.45 });
        K.lathe(matte(0xc8302a, 0.1), [0, h2 - 0.115, 0], [[0.016, 0], [0.02, 0.012]], 10, { sz: 0.6 });
      }, { rz: tilt });
    }
    priceCard(K, 0, 0.2, r + 0.008, '300', 0.06);
  },

  // ------------------------------------------------------------- the pocket watch's case: a walnut base, red velvet, glass in a brass frame
  mk_watch_case: (K, B) => {
    plank(K, 0x5a3420, -0.105, 0, -0.08, 0.105, 0.03, 0.08, { bevel: 0.006 });
    K.box(wood(0x4a2a18), -0.1, 0.03, -0.075, 0.1, 0.035, 0.075);
    K.box(fabric(0x8a1a2a), -0.092, 0.035, -0.067, 0.092, 0.045, 0.067, { bevel: 0.004 });
    K.ball(fabric(0xa82a3a), 0, 0.045, 0, 0.06, 0.02, 0.042, 12, 4, { y0: 0 });
    const br = metal(0xc8a44a, 0.35);
    for (const [x, z] of [[-0.098, -0.073], [0.098, -0.073], [-0.098, 0.073], [0.098, 0.073]]) K.box(br, x - 0.004, 0.035, z - 0.004, x + 0.004, 0.17, z + 0.004);
    for (const z of [-0.073, 0.073]) K.box(br, -0.098, 0.162, z - 0.004, 0.098, 0.17, z + 0.004);
    for (const x of [-0.098, 0.098]) K.box(br, x - 0.004, 0.162, -0.073, x + 0.004, 0.17, 0.073);
    K.glass(() => { const g = K.tint(0xe0f0f4, 60, 0.04); K.box(g, -0.094, 0.036, 0.071, 0.094, 0.162, 0.073); K.box(g, -0.094, 0.036, -0.073, 0.094, 0.162, -0.071); K.box(g, -0.096, 0.036, -0.071, -0.094, 0.162, 0.071); K.box(g, 0.094, 0.036, -0.071, 0.096, 0.162, 0.071); K.box(g, -0.094, 0.165, -0.071, 0.094, 0.168, 0.071); });
    K.cyl(metal(0xc8a44a), 0, 0.17, 0, 0.012, 0.006, 10);
    K.at([0.06, 0.006, 0.081], () => priceCard(K, 0, 0, 0, '2800', 0.045), { rx: -0.25 });
  },

  // ------------------------------------------------------------- the battery peg stand: a pegboard on a foot, chrome hooks, a header card
  mk_peg_stand: (K, B) => {
    plank(K, 0x9a6a3c, -0.115, 0, -0.065, 0.115, 0.016, 0.065, { bevel: 0.004 });
    const board = K.patch('peg', 46, 64, (V) => { V.fill(0xc89a62); for (let j = 4; j < 64; j += 6) for (let i = 4; i < 46; i += 6) { V.box(i, j, i + 2, j + 2, 0x5a3a20); V.px(i + 1, j - 1, 0xdab07a); } }, { rough: 0.85 });
    K.box(wood(0xb8885a), -0.115, 0.016, -0.04, 0.115, 0.34, -0.028);
    K.face(board, '+z', -0.11, 0.02, 0.11, 0.335, -0.0278);
    K.box(wood(0x8a5a32), -0.04, 0.016, -0.065, 0.04, 0.05, -0.04, { bevel: 0.004 });
    const head = K.patch('head', 46, 12, (V) => { V.fill(0xd8302a); V.box(0, 0, 46, 2, 0xffd23f); kana(K, V, '電池', 23, 1, 0xfff4d8, { size: 8, align: 'center' }); }, { rough: 0.7 });
    K.box(paint(0xd8302a), -0.115, 0.335, -0.042, 0.115, 0.39, -0.026, { bevel: 0.003 });
    K.face(head, '+z', -0.112, 0.338, 0.112, 0.387, -0.0258);
    for (const x of [-0.055, 0.055]) for (const y of [0.165, 0.305]) K.tube(chrome(0xd8dce2), [[x, y, -0.028], [x, y, 0.035], [x, y + 0.012, 0.05]], 0.0024, 5);
  },

  // ------------------------------------------------------------- a tall carton of fluorescent tubes, open at the top
  mk_tube_box: (K, B) => {
    const c = CARD, lab = K.patch('label', 40, 56, (V) => {
      V.fill(0xf6f2e6); V.box(0, 46, 40, 56, BLUE); V.text5('FL20', 20, 54, 0xf6f2e6, { align: 'center' });
      kana(K, V, '蛍光灯', 20, 30, BLUE, { size: 8, align: 'center' });
      V.box(4, 14, 36, 18, 0xe8eef2); V.box(4, 14, 7, 18, 0x9aa0a6); V.box(33, 14, 36, 18, 0x9aa0a6); V.px(3, 16, 0x6a6e72); V.px(36, 16, 0x6a6e72);
      smallPrint(V, 4, 10, 32, 2, 0x6a6a6a); V.box(0, 0, 40, 3, BLUE);
    }, { rough: 0.8 });
    const m = matte(c, 0.14);
    K.tub(m, -0.12, 0, -0.1, 0.12, 0.7, 0.1, 0.006, { inside: flat(darken(c, 0.25)) });
    K.box(paint(0x2a5aa8), -0.121, 0.32, -0.101, 0.121, 0.36, 0.101);
    K.face(lab, '+z', -0.08, 0.4, 0.08, 0.62, 0.1012);
    for (const s of [-1, 1]) K.at([s * 0.12, 0.7, 0], () => K.box(m, -0.003, 0, -0.1, 0.003, 0.09, 0.1), { rz: -s * 0.25 });
    // the tubes' ends: white glass with aluminium caps and their pins
    for (let k = 0; k < 6; k++) { const x = -0.07 + (k % 3) * 0.07, z = -0.045 + Math.floor(k / 3) * 0.09; K.cyl(ceramic(0xf2f2ee), x, 0.5, z, 0.0135, 0.14, 10); K.cyl(metal(0xc8ccd0), x, 0.64, z, 0.0135, 0.012, 10); for (const s of [-1, 1]) K.cyl(metal(0x9a9ea2), x + s * 0.006, 0.652, z, 0.0012, 0.008, 4); }
  },

  // ------------------------------------------------------------- candy jars
  mk_candy_jar_a: (K, B) => candyJar(K, 0, [0xe5383b, 0xffd23f, 0xff8c2e, 0x58c06c], metal(0xc8ccd0, 0.35)),
  mk_candy_jar_b: (K, B) => candyJar(K, 1, [0xff6f9a, 0xf4f0e4, 0xffb7c8], metal(0xd4a83a, 0.35)),
  mk_candy_jar_c: (K, B) => candyJar(K, 2, [0x8a5a2a, 0xd8b088, 0x5a3a1a], paint(0xd8302a, 0.3)),

  // ------------------------------------------------------------- the ¥10 puff-stick box: a printed display carton, the lid flap up
  mk_puff_box: (K, B) => {
    const side = K.patch('side', 64, 16, (V) => { V.fill(0xf4e6c8); V.box(0, 5, 64, 8, BLUE); for (let i = 2; i < 64; i += 12) mascot(V, 'tanuki', i, 15, { b: 0xc8843a }); }, { rough: 0.8 });
    K.tub(matte(0xf4e6c8, 0.1), -0.105, 0, -0.065, 0.105, 0.09, 0.065, 0.004, { inside: flat(0xd8c49a) });
    K.face(side, '+z', -0.105, 0.005, 0.105, 0.088, 0.0652);
    K.face(side, '-z', -0.105, 0.005, 0.105, 0.088, -0.0652);
    const lid = K.patch('lid', 64, 64, (V) => {
      V.fill(0xffd23f); V.box(0, 48, 64, 64, 0xd8302a);
      kana(K, V, 'ポフ棒', 32, 50, 0xfff4d8, { size: 16, align: 'center' });
      mascot(V, 'tanuki', 6, 40, { b: 0xc8843a }, 2);
      V.disc(46, 26, 13, 0xd8302a); V.text5('10', 46, 31, 0xfff4d8, { align: 'center', s: 2 }); kana(K, V, '円', 46, 15, 0xfff4d8, { size: 8, align: 'center' });
      V.box(0, 0, 64, 6, BLUE); smallPrint(V, 4, 5, 56, 1, 0xf4e6c8);
    }, { rough: 0.7 });
    K.at([0, 0.09, -0.065], () => { K.box(matte(0xffd23f, 0.1), -0.105, 0, -0.003, 0.105, 0.14, 0.0); K.face(lid, '+z', -0.105, 0.001, 0.105, 0.139, 0.0003); }, { rx: -0.12 });
    // the sticks, standing in their wrappers (bright foil, the end twisted)
    const cols = [0xf2c21c, 0xe8463a, 0x3a9a4a, 0x8a5bd6, 0xf28a2a];
    for (let k = 0; k < 10; k++) { const x = -0.085 + (k % 5) * 0.04, z = -0.03 + Math.floor(k / 5) * 0.05; K.at([x, 0.01, z], () => { K.cyl(plastic(cols[k % 5], 0.35), 0, 0, 0, 0.0095, 0.105, 10); K.lathe(plastic(lighten(cols[k % 5], 0.2), 0.3), [0, 0.105, 0], [[0.0095, 0], [0.004, 0.008], [0.007, 0.016]], 8, { sz: 0.4 }); }, { rz: ((k * 3) % 5 - 2) * 0.05, rx: ((k * 7) % 5 - 2) * 0.04 }); }
  },

  // ------------------------------------------------------------- a carton of snacks, flaps open
  mk_snack_carton: (K, B) => {
    const c = CARD, m = matte(c, 0.14), lab = K.patch('lab', 48, 32, (V) => {
      V.fill(c); photoInto(K, V, 'cardboard', c);
      V.box(4, 6, 44, 28, 0xf4efe2); V.frame(4, 6, 44, 28, RED);
      mascot(V, 'neko', 7, 25, { a: 0xf2e6c8 }); kana(K, V, 'おかし', 30, 26, RED, { size: 8, align: 'center' }); V.text5('x 50', 30, 15, 0x3a3020, { align: 'center' });
      V.box(4, 1, 20, 4, 0x3a3020);
    }, { rough: 0.9 });
    K.tub(m, -0.23, 0, -0.18, 0.23, 0.3, 0.18, 0.006, { inside: flat(darken(c, 0.22)) });
    K.face(lab, '+z', -0.13, 0.06, 0.13, 0.23, 0.1812); K.face(lab, '-z', -0.13, 0.06, 0.13, 0.23, -0.1812);
    for (const s of [-1, 1]) K.at([0, 0.3, s * 0.18], () => K.box(m, -0.23, 0, -0.003, 0.23, 0.17, 0.003), { rx: s * 0.75 });
    for (const s of [-1, 1]) K.at([s * 0.23, 0.3, 0], () => K.box(m, -0.003, 0, -0.17, 0.003, 0.08, 0.17), { rz: -s * 1.1 });
    K.box(flat(0xc8a878, 0.5), -0.24, 0.27, -0.025, -0.228, 0.3, 0.025);
    // snack packets heaped inside (pillow bags in bright print)
    const pal = [0xe84a3a, 0xf2c21c, 0x3a7ad8, 0x3a9a4a, 0xe86aa8, 0xe8842a];
    for (let k = 0; k < 14; k++) { const x = -0.17 + (k % 5) * 0.085, z = -0.12 + Math.floor(k / 5) * 0.11, c2 = pal[k % 6]; K.at([x, 0.27 + (k % 3) * 0.012, z], () => { blob(K, plastic(c2, 0.3), 0, 0, 0, 0.05, 0.016, 0.035, { seed: k, jit: 0.1, flatY: -0.6 }); K.box(flat(lighten(c2, 0.4), 0.4), -0.05, -0.004, -0.036, -0.044, 0.004, 0.036); }, { ry: k * 0.9, rz: (k % 3 - 1) * 0.15 }); }
  },

  // ------------------------------------------------------------- the plant wagon: two wooden trays on slim legs, casters
  mk_wagon: (K, B) => {
    const W = 0x9a6a3e, WD = 0x6a4428;
    for (const x of [-0.29, 0.27]) for (const z of [-0.19, 0.17]) { plank(K, WD, x, 0.03, z, x + 0.02, 0.8, z + 0.02, { bevel: 0.003, axis: 'y' }); K.cyl(rubber(0x2a2a2a), x + 0.01, 0, z + 0.01, 0.014, 0.022, 10); K.box(metal(0x8a8e92), x - 0.002, 0.018, z - 0.002, x + 0.022, 0.032, z + 0.022); }
    for (const [y, lip] of [[0.24, 0.03], [0.74, 0.06]]) {
      plank(K, W, -0.305, y, -0.205, 0.305, y + 0.02, 0.205, { bevel: 0.003 });
      plank(K, WD, -0.31, y + 0.02, -0.21, 0.31, y + lip, -0.195, { v: 1, bevel: 0.002 }); plank(K, WD, -0.31, y + 0.02, 0.195, 0.31, y + lip, 0.21, { v: 2, bevel: 0.002 });
      plank(K, WD, -0.31, y + 0.02, -0.195, -0.295, y + lip, 0.195, { axis: 'z', bevel: 0.002 }); plank(K, WD, 0.295, y + 0.02, -0.195, 0.31, y + lip, 0.195, { axis: 'z', v: 1, bevel: 0.002 });
    }
    const card = K.patch('sign', 40, 16, (V) => { V.fill(0xf2ecdc); V.frame(0, 0, 40, 16, 0x3a7a3a); kana(K, V, 'たね', 20, 2, 0x3a7a3a, { size: 8, align: 'center' }); }, { rough: 0.9 });
    K.face(card, '+z', -0.08, 0.765, 0.08, 0.8, 0.2105);
  },

  // ============================================================= the back room
  mk_chabudai: (K, B) => {
    const top = K.patch('top', 96, 96, (V) => { V.fill(0x6a3a22); photoInto(K, V, 'wood_planks', 0x6a3a22, (V) => { for (let j = 0; j < 96; j++) for (let i = 0; i < 96; i++) { const d = Math.hypot(i - 47.5, j - 47.5); if (d > 45 && d < 47.5) V.px(i, j, 0x4a2414); } }); }, { rough: 0.45 });
    const rim = wood(0x5a2e1a, 0.2);
    K.lathe(rim, [0, 0, 0], [[0.37, 0.29], [0.388, 0.296], [0.39, 0.31], [0.385, 0.318], [0.37, 0.32]], 24);
    const N = 48, A0 = Math.PI / N + Math.PI / 2;
    for (let k = 0; k < N; k++) { const a0 = A0 + (k / N) * Math.PI * 2, a1 = A0 + ((k + 1) / N) * Math.PI * 2, p = (a, r) => [Math.cos(a) * r, 0.32, Math.sin(a) * r], st = (a, r) => [0.5 + (Math.cos(a) * r) / 0.78, 0.5 - (Math.sin(a) * r) / 0.78]; K.triUV(top, [0, 0.32, 0], p(a0, 0.37), p(a1, 0.37), [[0.5, 0.5], st(a0, 0.37), st(a1, 0.37)], [0, 1, 0]); }
    K.lathe(rim, [0, 0, 0], [[0, 0.29], [0.37, 0.29]], 24);
    K.ring(wood(0x4a2414), 0, 0.255, 0, 0.3, 0.285, 0.035, 24, { inside: wood(0x3a1c10) });
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * (Math.PI / 2); K.at([Math.sin(a) * 0.27, 0, Math.cos(a) * 0.27], () => { K.lathe(wood(0x5a2e1a, 0.2), [0, 0, 0], [[0, 0], [0.018, 0], [0.02, 0.02], [0.016, 0.12], [0.022, 0.2], [0.024, 0.255], [0, 0.255]], 10); }); }
  },
  mk_ashtray: (K, B) => {
    const g = K.tint(0xb8d4cc, 150, 0.05), ge = K.tint(0x9ac0b4, 210, 0.05);
    K.glass(() => {
      K.lathe(ge, [0, 0, 0], [[0, 0], [0.08, 0], [0.086, 0.006], [0.09, 0.03], [0.087, 0.036], [0.082, 0.036], [0.078, 0.033], [0.072, 0.012], [0, 0.012]], 18, { sz: 0.88 });
    });
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.3; K.at([Math.sin(a) * 0.084, 0.034, Math.cos(a) * 0.084 * 0.88], () => K.glass(() => K.box(g, -0.008, -0.005, -0.008, 0.008, 0.002, 0.008)), { ry: a }); }
    // ash and cigar stubs heaped in it
    K.lathe(matte(0x8a8680, 0.1), [0, 0.012, 0], [[0.074, 0], [0.05, 0.014], [0.02, 0.022], [0, 0.024]], 14, { sz: 0.88 });
    for (let k = 0; k < 8; k++) { const a = k * 2.2, r = 0.02 + (k % 3) * 0.018; K.at([Math.cos(a) * r, 0.028 + (k % 2) * 0.004, Math.sin(a) * r * 0.85], () => { K.cyl(matte(0x6a4628, 0.15), 0, 0, 0, 0.0065, 0.05 - (k % 3) * 0.01, 8, { axis: 'x' }); K.cyl(flat(0x4a4642, 0.3), -0.006, 0, 0, 0.0065, 0.006, 8, { axis: 'x' }); if (k % 2) K.cyl(paint(0xd8302a), 0.012, 0, 0, 0.0068, 0.006, 8, { axis: 'x' }); }, { ry: a, rz: (k % 3 - 1) * 0.25 }); }
  },
  mk_tea_set: (K, B) => {
    K.box(paint(0x4a1e18, 0.25), -0.145, 0, -0.095, 0.145, 0.012, 0.095, { bevel: 0.006 });
    K.box(paint(0x2a1210, 0.1), -0.135, 0.012, -0.085, 0.135, 0.016, 0.085, { bevel: 0.002 });
    // the kyusu: a squat body, a side handle, a spout, a lid with a knob
    const cl = ceramic(0x6a3a26);
    K.at([-0.06, 0.016, 0], () => {
      K.lathe(cl, [0, 0, 0], [[0, 0], [0.035, 0], [0.046, 0.025], [0.044, 0.05], [0.032, 0.062], [0, 0.062]], 14);
      K.lathe(ceramic(0x5a2e1e), [0, 0.06, 0], [[0.032, 0], [0.028, 0.008], [0.008, 0.01], [0.006, 0.02], [0, 0.02]], 12);
      K.tube(cl, [[0.04, 0.02, 0], [0.058, 0.035, 0], [0.068, 0.052, 0]], 0.008, 8, { r1: 0.005 });
      K.tube(cl, [[0, 0.03, -0.042], [0, 0.034, -0.075]], 0.01, 8, { r1: 0.008 });
    });
    // two yunomi cups and a tea caddy
    for (const [x, z] of [[0.04, -0.04], [0.085, 0.03]]) K.lathe(ceramic(0xd8d0bc), [x, 0.016, z], [[0, 0], [0.024, 0], [0.026, 0.004], [0.028, 0.07], [0.025, 0.07], [0.023, 0.012], [0, 0.012]], 14);
    for (const [x, z] of [[0.04, -0.04], [0.085, 0.03]]) K.lathe(flat(0x9aa04a, 0.15), [x, 0.016, z], [[0.024, 0.055], [0, 0.055]], 12);
    K.cyl(metal(0x8a6a3a, 0.3), 0.105, 0.016, -0.05, 0.025, 0.07, 14);
    K.cyl(metal(0x9a7a4a, 0.3), 0.105, 0.086, -0.05, 0.026, 0.012, 14);
  },
  mk_zabuton: (K, B) => {
    const cloth = K.patch('cloth', 64, 64, (V) => { V.fill(0x7a2a3a); photoInto(K, V, 'canvas_cloth', 0x7a2a3a, (V) => { for (let j = 4; j < 64; j += 10) for (let i = (j % 20 === 4 ? 4 : 9); i < 64; i += 10) { V.px(i, j, 0xc89aa4); V.px(i + 1, j, 0xc89aa4); } }); }, { rough: 0.98 });
    const prof = [[0, 0], [0.24, 0], [0.272, 0.02], [0.28, 0.05], [0.27, 0.085], [0.24, 0.1], [0.1, 0.112], [0.02, 0.1], [0, 0.098]];
    sweep(K, cloth, [0, 0, 0], prof, 20, { mod: (r, a) => r / Math.pow(Math.abs(Math.sin(a)) ** 4 + Math.abs(Math.cos(a)) ** 4, 0.25), sz: 0.3 / 0.28 });
    K.lathe(fabric(0x5a1a2a), [0, 0.096, 0], [[0.012, 0], [0.014, 0.006], [0, 0.01]], 8);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.at([x * 0.262, 0.05, z * 0.28], () => { K.ball(fabric(0x5a1a2a), 0, 0, 0, 0.008, 0.01, 0.008, 6, 3); K.lathe(fabric(0xc8a040), [0, -0.035, 0], [[0, 0], [0.008, 0.002], [0.004, 0.03]], 8); });
  },
  mk_tansu: (K, B) => {
    const c = 0x7a4a2a, iron = metal(0x2a2624, 0.15);
    plank(K, c, -0.47, 0.03, -0.24, 0.47, 0.94, 0.22, { bevel: 0.006 });
    plank(K, darken(c, 0.1), -0.47, 0.94, -0.24, 0.47, 0.96, 0.24, { bevel: 0.004, v: 1 });
    plank(K, darken(c, 0.15), -0.46, 0, -0.23, 0.46, 0.03, 0.22, { v: 2 });
    // the drawers: two small over three wide, each with a warabite pull and a lock plate
    const rows = [[0.79, 0.93, 2], [0.57, 0.775, 1], [0.32, 0.555, 1], [0.045, 0.305, 1]];
    rows.forEach(([y0, y1, n], r) => {
      for (let k = 0; k < n; k++) {
        const x0 = -0.455 + (0.91 / n) * k, x1 = x0 + 0.91 / n - 0.006;
        plank(K, lighten(c, 0.06), x0 + 0.003, y0, 0.22, x1, y1, 0.235, { bevel: 0.004, v: r + k });
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        for (const s of n === 1 ? [-0.22, 0.22] : [0]) {
          K.box(iron, cx + s - 0.035, cy - 0.012, 0.235, cx + s + 0.035, cy + 0.012, 0.239, { bevel: 0.003 });
          K.tube(iron, K.arc([cx + s, cy - 0.004, 0.243], 0.026, Math.PI, 2 * Math.PI, 6, 'xy', 0.022), 0.0028, 5);
        }
        if (n === 1 && r < 3) { K.box(iron, cx - 0.022, cy - 0.028, 0.235, cx + 0.022, cy + 0.028, 0.2385, { bevel: 0.004 }); K.box(flat(0x0e0c0a), cx - 0.002, cy - 0.012, 0.2385, cx + 0.002, cy + 0.004, 0.239); }
      }
    });
    for (const [x, y] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) K.box(iron, x * 0.47 - 0.035 * (x > 0 ? 1 : 0), y ? 0.9 : 0.03, 0.218, x * 0.47 + 0.035 * (x < 0 ? 1 : 0), y ? 0.96 : 0.07, 0.24);
    for (const s of [-1, 1]) K.tube(iron, [[s * 0.472, 0.62, -0.04], [s * 0.49, 0.62, -0.04], [s * 0.49, 0.62, 0.04], [s * 0.472, 0.62, 0.04]], 0.004, 5);
  },
  mk_phone: (K, B) => {
    const blk = enamel(0x1a1a1c);
    K.at([0, 0, -0.005], () => {
      K.lathe(blk, [0, 0, 0], [[0, 0], [0.098, 0], [0.1, 0.008], [0.094, 0.05], [0.07, 0.075], [0, 0.08]], 18, { sz: 0.9 });
      // the rotary dial: a chrome finger stop, the clear wheel with ten holes, the number card in the middle
      K.at([0, 0.064, 0.052], () => {
        K.lathe(flat(0x2a2a2c, 0.3), [0, 0, 0], [[0.044, 0], [0.044, 0.004], [0, 0.004]], 18);
        const dial = K.patch('dial', 40, 40, (V) => {
          V.fill(0x2a2a2c);
          for (let k = 0; k < 10; k++) { const a = Math.PI * 0.42 + k * 0.53; V.disc(20 + Math.cos(a) * 14, 20 + Math.sin(a) * 14, 3.6, 0xf2efe6); V.text5(String((k + 1) % 10), Math.round(20 + Math.cos(a) * 14) - 2, Math.round(20 + Math.sin(a) * 14) + 3, 0x2a2a2c); }
          V.disc(20, 20, 8, 0xf2efe6); V.text5('110', 20, 23, RED, { align: 'center' });
        }, { rough: 0.4 });
        K.face(dial, '+y', -0.042, -0.042, 0.042, 0.042, 0.0045);
        K.glass(() => K.lathe(K.tint(0xe8eef0, 60, 0.05), [0, 0, 0], [[0.044, 0.005], [0.044, 0.008], [0, 0.008]], 18));
        K.tube(chrome(), [[0.03, 0.009, 0.03], [0.04, 0.012, 0.038]], 0.002, 5);
      }, { rx: 0.42 });
      // the cradle and the handset
      for (const s of [-1, 1]) K.box(blk, s * 0.07 - 0.015, 0.07, -0.05, s * 0.07 + 0.015, 0.088, -0.02, { bevel: 0.006 });
      K.tube(blk, [[-0.115, 0.098, -0.035], [-0.06, 0.104, -0.035], [0, 0.106, -0.035], [0.06, 0.104, -0.035], [0.115, 0.098, -0.035]], 0.012, 10, { flat: [0.022, 0.018], up: [0, 1, 0] });
      for (const s of [-1, 1]) K.lathe(blk, [s * 0.1, 0.082, -0.035], [[0, 0], [0.02, 0], [0.024, 0.012], [0.02, 0.024], [0, 0.026]], 12);
    });
    const pts = [];
    for (let k = 0; k <= 50; k++) { const t = k / 50, a = k * 0.95; pts.push([-0.1 - t * 0.012 + Math.cos(a) * 0.004, 0.06 - t * 0.055, -0.05 + t * 0.03 + Math.sin(a) * 0.004]); }
    K.tube(flat(0x1a1a1c, 0.4), pts, 0.0016, 4);
  },
  mk_kamidana: (K, B) => {
    const shelf = 0xd8c09a, hinoki = wood(0xe2cba4, 0.12);
    plank(K, shelf, -0.3675, 0, -0.1425, 0.3675, 0.022, 0.1425, { bevel: 0.004 });
    for (const s of [-1, 1]) plank(K, darken(shelf, 0.1), s * 0.33 - 0.015, -0.0, -0.14, s * 0.33 + 0.015, 0.02, -0.12, { v: 1 });
    // the miniature shrine (miyagata): a platform, steps, the hall with doors, a sweeping roof
    K.box(hinoki, -0.13, 0.022, -0.12, 0.13, 0.04, 0.08, { bevel: 0.003 });
    for (let k = 0; k < 3; k++) K.box(hinoki, -0.04, 0.022 + k * 0.006, 0.08 + k * 0.012, 0.04, 0.028 + k * 0.006, 0.096 - (2 - k) * 0.0, { bevel: 0.001 });
    K.box(hinoki, -0.09, 0.04, -0.1, 0.09, 0.2, 0.04, { bevel: 0.003 });
    const doors = K.patch('doors', 32, 32, (V) => { V.fill(0xe8d4ac); V.frame(0, 0, 32, 32, 0xb89a6a); V.vline(16, 0, 31, 0x8a6a3a); V.disc(12, 16, 1.5, 0xc8a040); V.disc(20, 16, 1.5, 0xc8a040); for (let j = 4; j < 30; j += 6) { V.hline(2, 13, j, 0xd8c098); V.hline(19, 30, j, 0xd8c098); } }, { rough: 0.7 });
    K.face(doors, '+z', -0.065, 0.05, 0.065, 0.18, 0.0405);
    const roof = wood(0xb89a6a, 0.12);
    for (const s of [-1, 1]) K.at([0, 0.242, -0.03], () => K.box(roof, -0.128, -0.01, -0.004, 0.128, 0, 0.13), { rx: 0.42, ry: s < 0 ? Math.PI : 0 });
    K.box(wood(0x9a7a4a), -0.13, 0.226, -0.035, 0.13, 0.246, -0.025, { bevel: 0.003 });
    for (const s of [-1, 1]) K.rod(wood(0x9a7a4a), [s * 0.05, 0.235, -0.03], [s * 0.08, 0.28, -0.03], 0.004, 4);
    K.cyl(metal(0xc8a040), 0, 0.12, 0.042, 0.018, 0.004, 14, { axis: 'z' });
    // sakaki in white vases, sake bottles, the rope with paper shide
    for (const s of [-1, 1]) {
      K.lathe(ceramic(0xf2f0ea), [s * 0.2, 0.022, 0], [[0, 0], [0.022, 0], [0.026, 0.04], [0.016, 0.07], [0.012, 0.08], [0.016, 0.085], [0, 0.085]], 12);
      for (let k = 0; k < 7; k++) { const a = k * 0.9; leaf(K, matte(k % 2 ? 0x2a5a32 : 0x3a6a3a, 0.08), [s * 0.2, 0.1 + k * 0.012, 0], [s * 0.2 + Math.cos(a) * 0.05, 0.13 + k * 0.016, Math.sin(a) * 0.05], 0.022); }
      K.lathe(ceramic(0xf2f0ea), [s * 0.29, 0.022, 0.03], [[0, 0], [0.016, 0], [0.018, 0.04], [0.008, 0.06], [0.008, 0.07], [0, 0.07]], 10);
    }
    for (const s of [-1, 1]) K.box(hinoki, s * 0.352 - 0.008, 0.022, 0.12, s * 0.352 + 0.008, 0.345, 0.136);
    K.tube(matte(0xd8c888, 0.15), [[-0.36, 0.33, 0.14], [-0.2, 0.31, 0.146], [0, 0.305, 0.148], [0.2, 0.31, 0.146], [0.36, 0.33, 0.14]], 0.008, 6);
    for (const x of [-0.24, -0.08, 0.08, 0.24]) { const V = K.patch('shide', 8, 24, (V) => { V.fill(0xf6f4ee); V.box(0, 16, 4, 24, 0xe8e6de); V.box(4, 8, 8, 16, 0xe8e6de); V.box(0, 0, 4, 8, 0xe8e6de); }, { rough: 0.9, shared: true }); K.face(V, '+z', x - 0.015, 0.22, x + 0.015, 0.305, 0.15); }
  },
  mk_cigar_box: (K, B) => {
    const c = 0x8a5a2a;
    plank(K, c, -0.16, 0, -0.09, 0.16, 0.055, 0.09, { bevel: 0.003 });
    K.box(flat(0x4a2a12), -0.15, 0.045, -0.08, 0.15, 0.0555, 0.08);
    // the cigars in a row, a paper band on each
    for (let k = 0; k < 9; k++) { const z = -0.07 + k * 0.0175; K.cyl(matte(0x6a4226, 0.15), -0.14, 0.057, z, 0.0082, 0.28, 10, { axis: 'x' }); K.cyl(paint(0xc8302a, 0.3), -0.1, 0.057, z, 0.0086, 0.022, 10, { axis: 'x' }); K.cyl(metal(0xd8b040), -0.098, 0.057, z, 0.0087, 0.004, 10, { axis: 'x' }); }
    // the lid open on its hinge with the printed label inside
    const lab = K.patch('lab', 64, 40, (V) => {
      V.fill(0xf2e2b8); V.frame(0, 0, 64, 40, 0xc8a040); V.frame(2, 2, 62, 38, 0x8a2a1e);
      V.disc(32, 22, 11, 0x8a2a1e); V.disc(32, 22, 9, 0xf2c870); mascot(V, 'tsuru', 27, 27, { w: 0xf6f0e0, r: RED });
      V.text5('HABANA', 32, 9, 0x8a2a1e, { align: 'center' });
    }, { rough: 0.6 });
    K.at([0, 0.055, -0.09], () => { plank(K, c, -0.16, 0, -0.008, 0.16, 0.18, 0, { bevel: 0.003, v: 1 }); K.face(lab, '+z', -0.14, 0.015, 0.14, 0.165, 0.0003); }, { rx: -0.42 });
    K.box(metal(0xc8a040), -0.012, 0.03, 0.09, 0.012, 0.05, 0.093);
  },
  mk_tv_cabinet: (K, B) => {
    const c = 0x6a4428;
    plank(K, c, -0.33, 0.06, -0.26, 0.33, 0.38, 0.24, { bevel: 0.005 });
    plank(K, darken(c, 0.08), -0.33, 0.36, -0.26, 0.33, 0.38, 0.26, { v: 1, bevel: 0.004 });
    for (const x of [-0.31, 0.29]) for (const z of [-0.24, 0.2]) K.lathe(wood(0x4a2c18), [x + 0.01, 0, z + 0.01], [[0, 0], [0.012, 0], [0.016, 0.03], [0.018, 0.06], [0, 0.06]], 8);
    // two sliding doors with frosted panes and recessed pulls, a shelf of tapes showing through
    for (const [x0, x1] of [[-0.31, 0.005], [-0.005, 0.31]]) {
      plank(K, lighten(c, 0.05), x0, 0.08, 0.24, x1, 0.34, 0.25, { bevel: 0.003, v: 2 });
      K.box(flat(0xc8c4b8, 0.5), x0 + 0.03, 0.12, 0.2502, x1 - 0.03, 0.3, 0.2505);
      K.box(flat(0x2a1a10), (x0 + x1) / 2 + (x0 < 0 ? 0.11 : -0.11) - 0.008, 0.19, 0.2504, (x0 + x1) / 2 + (x0 < 0 ? 0.11 : -0.11) + 0.008, 0.24, 0.2508);
    }
    const lace = K.patch('lace', 48, 32, (V) => { for (let j = 0; j < 32; j++) for (let i = 0; i < 48; i++) V.px(i, j, ((i + j) % 4 === 0 || (i - j + 64) % 4 === 0) && j > 3 ? 0xf2efe6 : (j <= 3 && (i % 6 < 3)) ? 0xf2efe6 : 0xe4dfd2); }, { rough: 0.95 });
    K.face(lace, '+y', -0.22, -0.18, 0.22, 0.12, 0.3812);
  },
};

function candyJar(K, v, cols, lid) {
  const n = 14, r = 0.068, prof = [[0, 0.002], [0.06, 0.002], [0.066, 0.008], [r, 0.03], [r, 0.15], [0.064, 0.172], [0.05, 0.182], [0.05, 0.19]];
  // the sweets heaped to two thirds: the core a mass of colour, single wrapped sweets on and against the glass
  K.lathe(matte(darken(mix(cols[0], cols[1], 0.4), 0.35), 0.1), [0, 0, 0], [[0, 0.004], [0.04, 0.004], [0.042, 0.09], [0.02, 0.11], [0, 0.112]], 10);
  // layers of sweets against the glass (what you see) and a heap on top
  for (let k = 0; k < 44; k++) { const layer = Math.floor(k / 9), a = k * 0.7 + layer * 0.35 + v, rr = 0.054 - (layer > 3 ? (k % 3) * 0.018 : 0), y = 0.012 + layer * 0.022 + (k % 2) * 0.006; sweet(K, cols[(k + layer) % cols.length], Math.cos(a) * rr, Math.min(0.13, y), Math.sin(a) * rr, a + 1.6 + (k % 3), (k % 3 - 1) * 0.7); }
  K.glass(() => K.lathe(K.tint(0xdcecec, 70, 0.05), [0, 0, 0], prof, n));
  K.glass(() => K.lathe(K.tint(0xc8e0dc, 150, 0.05), [0, 0, 0], [[0, 0], [0.06, 0], [0.06, 0.002], [0, 0.002]], n));
  // the tin lid with its knob
  K.lathe(lid, [0, 0.188, 0], [[0, 0], [0.056, 0], [0.058, 0.006], [0.058, 0.022], [0.054, 0.028], [0.02, 0.03], [0.014, 0.036], [0.016, 0.042], [0, 0.042]], n);
  const lab = K.patch('jar' + v, 32, 16, (V) => { framed(V, 0xf6f0e0, 0xc8302a); kana(K, V, ['あめ', 'ミルク', 'こくとう'][v], 16, 3, 0xc8302a, { size: 8, align: 'center' }); }, { rough: 0.8 });
  K.wrap(lab, 0, 0.06, 0.1, 0, r, { n, arc: 1.2, turn: 0, lift: 0.0015 });
}

export default { family: 'dagashi', models: Object.fromEntries(Object.entries(models).map(([id, fn]) => [id, { build: fn, box: BOUNDS[id] }])) };
