// The ramen shop's things (ids from src/data/props/food.js): the bowls in every state (five ramen, empty, dirty, clean),
// gyoza, rice, a chashu don, beer with its glass, sake, oolong tea, the red lantern, the stools, the stock pot, the
// noodle boiler with its tebo baskets, the sink, the dish rack and the sponge. Boxes are the old voxel bounds.
import { paint, plastic, metal, chrome, matte, wood, flat, rubber, ceramic, lighten } from '../kit/kit.js';
import { blob, plank, bottle } from '../kit/shapes.js';
import { kana, framed, mascot } from '../kit/prints.js';
import { sweep } from '../things/form.js';

const BOUNDS = {
  rm_stool: [-0.19, 0, -0.19, 0.19, 0.68, 0.19], rm_pot: [-0.25, 0, -0.21, 0.25, 0.4, 0.21], rm_boiler: [-0.37, 0, -0.26, 0.37, 1.06, 0.26],
  rm_gyoza: [-0.0925, 0, -0.0475, 0.0925, 0.03, 0.0475], rm_rice: [-0.0575, 0, -0.0575, 0.0575, 0.07, 0.0575], rm_chashu: [-0.0625, 0, -0.0625, 0.0625, 0.055, 0.0625],
  rm_beer: [-0.066, 0, -0.039, 0.066, 0.276, 0.039], rm_sake: [-0.0525, 0, -0.0375, 0.0525, 0.13, 0.0375], rm_oolong: [-0.0275, 0, -0.0275, 0.0275, 0.12, 0.0275],
  rm_lantern: [-0.25, 0, -0.25, 0.25, 0.76, 0.25], rm_sink: [-0.45, 0, -0.29, 0.45, 1.18, 0.29], rm_rack: [-0.205, 0, -0.105, 0.205, 0.15, 0.105], rm_sponge: [-0.0375, 0, -0.0225, 0.0375, 0.03, 0.0225],
};
const BOWL_BOX = [-0.111, 0, -0.111, 0.111, 0.072, 0.111];
const NOODLE = 0xf0d48a, CHASHU = 0xd8a088, CHASHU_RIM = 0x8a4a26, NORI = 0x1e2a22, NEGI = 0x5a9a3a, EGG = 0xf4ecd8, YOLK = 0xf0a028;

// ------------------------------------------------------------------ the donburi: white porcelain, a red raimon band round the rim
const OUT = [[0.04, 0], [0.043, 0.002], [0.043, 0.008], [0.05, 0.009], [0.075, 0.018], [0.095, 0.034], [0.106, 0.052], [0.111, 0.07], [0.109, 0.072]];
const IN = [[0.109, 0.072], [0.104, 0.068], [0.1, 0.052], [0.088, 0.034], [0.066, 0.02], [0.03, 0.014], [0, 0.013]];
const rIn = (y) => { for (let k = 0; k + 1 < IN.length; k++) { const [r0, y0] = IN[k], [r1, y1] = IN[k + 1]; if (y <= y0 && y >= y1) return r0 + (r1 - r0) * ((y - y0) / (y1 - y0)); } return 0.03; };
function donburi(K) {
  const band = K.patch('raimon', 128, 12, (V) => {
    V.fill(0xf2eee4);
    V.box(0, 0, 128, 2, 0xc8302a); V.box(0, 10, 128, 12, 0xc8302a);
    // the key fret, hand set: one motif every 8 px
    for (let i = 0; i < 128; i += 8) { V.box(i, 3, i + 6, 4, 0xc8302a); V.box(i + 5, 3, i + 6, 9, 0xc8302a); V.box(i + 1, 8, i + 6, 9, 0xc8302a); V.box(i + 1, 5, i + 2, 9, 0xc8302a); V.box(i + 1, 5, i + 4, 6, 0xc8302a); }
  }, { rough: 0.3, shared: true });
  const por = ceramic(0xf2eee4);
  K.lathe(por, [0, 0, 0], [[0, 0.006], [0.036, 0.006], [0.04, 0]], 16);
  K.lathe(por, [0, 0, 0], OUT.slice(0, 7), 16);
  K.wrapProfile(band, 0, 0, [[0.1062, 0.053], [0.111, 0.0695]], { n: 16, lift: 0.0006 });
  K.lathe(por, [0, 0, 0], OUT.slice(6), 16);
  K.lathe(ceramic(0xf4f0e8), [0, 0, 0], IN, 16);
  K.lathe(flat(0xc8302a, 0.3), [0, 0, 0], [[0.1046, 0.0687], [0.1038, 0.0665]], 16);
}
/** The broth's surface at height y (with a few fat rings painted on it). */
function broth(K, c, y, key) {
  const V = K.patch('broth' + key, 32, 32, (V) => {
    V.fill(c);
    for (const [i, j, r] of [[8, 9, 2], [22, 6, 1.5], [25, 20, 2.5], [6, 24, 1.5], [15, 15, 1], [19, 27, 1.2], [11, 19, 1]]) V.ring(i, j, r - 0.6, r + 0.4, lighten(c, 0.28));
  }, { rough: 0.15, shared: true });
  const R = rIn(y) - 0.0006, n = 32;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, p = (a) => [Math.cos(a) * R, y, Math.sin(a) * R], st = (a) => [0.5 + Math.cos(a) * 0.5, 0.5 - Math.sin(a) * 0.5];
    K.triUV(V, [0, y, 0], p(a0), p(a1), [[0.5, 0.5], st(a0), st(a1)], [0, 1, 0]);
  }
}
/** A nest of noodles breaking the surface: a few folded strands. */
function noodles(K, x, z, y, r, n = 9) {
  const m = matte(NOODLE, 0.12);
  for (let k = 0; k < n; k++) {
    const a = k * 0.7, pts = [];
    for (let s = 0; s <= 8; s++) { const t = s / 8, rr = r * (0.2 + 0.8 * Math.sin(t * Math.PI)), aa = a + t * 1.6; pts.push([x + Math.cos(aa) * rr, y + 0.002 + Math.sin(t * Math.PI * 3 + k) * 0.0016, z + Math.sin(aa) * rr * 0.8]); }
    K.tube(m, pts, 0.0019, 4);
  }
}
function chashu(K, x, y, z, ry, r = 0.032) {
  K.at([x, y, z], () => {
    K.lathe(matte(CHASHU, 0.12), [0, 0, 0], [[0, 0.006], [r * 0.85, 0.006], [r, 0.003], [r * 0.95, 0], [0, 0]], 12, { sz: 0.82 });
    K.lathe(matte(CHASHU_RIM, 0.1), [0, 0, 0], [[r * 0.86, 0.0062], [r * 1.01, 0.0032], [r * 0.95, 0.0002]], 12, { sz: 0.82 });
    K.box(flat(lighten(CHASHU, 0.25), 0.6), -r * 0.5, 0.0061, -0.002, r * 0.4, 0.0064, 0.003);
  }, { ry, rz: 0.12 });
}
function egg(K, x, y, z, ry) {
  K.at([x, y, z], () => {
    K.ball(ceramic(EGG), 0, 0, 0, 0.018, 0.012, 0.024, 10, 3, { y0: 0, y1: 1 });
    K.ball(flat(YOLK, 0.4), 0, 0.0002, 0, 0.0105, 0.004, 0.012, 10, 2, { y0: 0, y1: 1 });
  }, { ry, rx: -0.2 });
}
function nori(K, x, y, z, ry) { K.at([x, y, z], () => K.box(matte(NORI, 0.06), -0.022, 0, -0.0008, 0.022, 0.05, 0.0008), { ry, rx: 0.35 }); }
function naruto(K, x, y, z) {
  const V = K.patch('naruto', 16, 16, (V) => { V.fill(0xf4eee6); for (let k = 0; k < 40; k++) { const t = k / 40, a = t * Math.PI * 4, r = 1 + t * 6; V.px(Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r), 0xe86a8a); } }, { rough: 0.5, shared: true });
  K.cyl(matte(0xf4eee6, 0.06), x, y, z, 0.014, 0.004, 12);
  K.face(V, '+y', x - 0.0125, z - 0.0125, x + 0.0125, z + 0.0125, y + 0.0042);
}
function negi(K, x, y, z, n = 7) { for (let k = 0; k < n; k++) { const a = k * 2.3; K.at([x + Math.cos(a) * 0.012 * (k % 3), y, z + Math.sin(a) * 0.01 * (k % 3)], () => K.torus(matte(NEGI, 0.2), 0, 0, 0, 0.004, 0.0013, 8, 3), { rx: 0.3 * (k % 2) }); } }
function menma(K, x, y, z) { for (let k = 0; k < 4; k++) K.at([x + k * 0.006, y, z + (k % 2) * 0.006], () => K.box(matte(0xc89a50, 0.15), -0.003, 0, -0.012, 0.003, 0.004, 0.012), { ry: 0.3 + k * 0.25 }); }

const RAMEN = {
  shoyu: { c: 0x8a4a1e, top: (K, y) => { chashu(K, -0.04, y, -0.028, 0.4); chashu(K, -0.05, y + 0.003, 0.012, -0.2, 0.028); egg(K, 0.042, y, -0.03, 0.6); nori(K, 0, y - 0.01, -0.07, 0); naruto(K, 0.05, y, 0.035); menma(K, 0.01, y, 0.045); negi(K, -0.005, y + 0.002, 0.005); } },
  miso: { c: 0xc8883a, top: (K, y) => { chashu(K, -0.045, y, -0.03, 0.2); for (let k = 0; k < 14; k++) K.ball(matte(0xf4d040, 0.2), 0.035 + (k % 4) * 0.009, y + 0.002, 0.01 + Math.floor(k / 4) * 0.009, 0.004, 0.003, 0.004, 6, 2); K.box(matte(0xfff2c0, 0.2), 0.005, y, -0.04, 0.025, y + 0.008, -0.02, { bevel: 0.002 }); nori(K, 0, y - 0.01, -0.07, 0); negi(K, -0.02, y + 0.002, 0.04); } },
  tonkotsu: { c: 0xf0e4c8, top: (K, y) => { chashu(K, -0.04, y, -0.025, 0.4); egg(K, 0.045, y, -0.025, 0.4); nori(K, 0, y - 0.01, -0.07, 0); for (let k = 0; k < 10; k++) K.box(matte(0x4a7a2a, 0.15), 0.02 + (k % 3) * 0.008, y, 0.03 + Math.floor(k / 3) * 0.006, 0.024 + (k % 3) * 0.008, y + 0.002, 0.033 + Math.floor(k / 3) * 0.006); negi(K, -0.03, y + 0.002, 0.04); } },
  shio: { c: 0xe8d8a0, top: (K, y) => { chashu(K, -0.045, y, -0.02, 0.3); egg(K, 0.04, y, 0.025, 1.2); naruto(K, 0.045, y, -0.03); for (let k = 0; k < 3; k++) K.at([0.0 + k * 0.012, y + 0.002, 0.05], () => K.box(matte(0x3a7a2a, 0.15), -0.004, 0, -0.012, 0.004, 0.001, 0.012), { ry: k * 0.5 }); negi(K, -0.01, y + 0.002, 0.0); } },
  tantan: { c: 0xd04a1e, top: (K, y) => { for (let k = 0; k < 18; k++) blob(K, matte(0x8a4a22, 0.15), -0.01 + Math.cos(k) * 0.02 * (k % 3) * 0.5, y + 0.002, Math.sin(k * 1.7) * 0.02, 0.006, 0.003, 0.006, { seed: k, jit: 0.3 }); K.at([0.045, y + 0.003, -0.02], () => { for (let k = 0; k < 3; k++) leafBok(K, k); }); egg(K, -0.045, y, 0.03, 0.2); negi(K, 0.03, y + 0.002, 0.04); } },
};
function leafBok(K, k) { K.at([0, 0, 0], () => K.ball(matte(k % 2 ? 0x4a9a3a : 0x6aaa4a, 0.15), 0, 0, 0, 0.01, 0.002, 0.024, 8, 2), { ry: k * 0.9 }); }

function ramen(kind) {
  return (K) => {
    const R = RAMEN[kind], y = 0.058;
    donburi(K);
    broth(K, R.c, y, kind);
    noodles(K, 0.0, -0.005, y, 0.05);
    R.top(K, y + 0.001);
  };
}

const models = {
  rm_bowl_shoyu: ramen('shoyu'), rm_bowl_miso: ramen('miso'), rm_bowl_tonkotsu: ramen('tonkotsu'), rm_bowl_shio: ramen('shio'), rm_bowl_tantan: ramen('tantan'),
  rm_bowl_empty: (K) => { donburi(K); broth(K, 0x8a5a2a, 0.024, 'dregs'); noodles(K, 0.02, 0.01, 0.024, 0.02, 3); },
  rm_bowl_dirty: (K) => { donburi(K); broth(K, 0x7a522a, 0.02, 'dirty'); for (const [x, z, r] of [[-0.04, 0.03, 0.012], [0.035, -0.02, 0.008]]) K.ball(matte(0x9a7a4a, 0.1), x, 0.03 + Math.abs(x) * 0.2, z, r, 0.002, r * 1.4, 8, 2); K.box(flat(0x7a5a3a, 0.3), -0.07, 0.04, -0.06, -0.06, 0.05, -0.05); },
  rm_bowl_clean: (K) => { donburi(K); K.lathe(flat(0xe8f0f4, 0.2), [0, 0, 0], [[0.04, 0.0145], [0, 0.0145]], 12); },

  // gyoza on a white oblong plate: browned bottoms, pleated tops
  rm_gyoza: (K) => {
    K.lathe(ceramic(0xf2f0ea), [0, 0, 0], [[0, 0.003], [0.085, 0.003], [0.09, 0.006], [0.091, 0.009], [0.088, 0.0095], [0.08, 0.0055], [0, 0.0055]], 20, { sz: 0.5 });
    for (let k = 0; k < 5; k++) {
      K.at([-0.064 + k * 0.032, 0.0055, 0], () => {
        sweep(K, matte(0xf2e4c4, 0.08), [0, 0, 0], [[0, 0], [0.032, 0], [0.034, 0.004], [0.026, 0.014], [0.012, 0.02], [0, 0.021]], 10, { sx: 0.42, mod: (r, a) => r * (1 - 0.35 * Math.max(0, Math.cos(a)) ** 4) });
        K.lathe(matte(0xa8622a, 0.1), [0, 0, 0], [[0.0335, 0.0005], [0.0345, 0.0035], [0, 0.0036]].map(([r, y]) => [r, y]), 10, { sx: 0.43 });
        for (let p = 0; p < 4; p++) K.at([0, 0.016, -0.018 + p * 0.012], () => K.box(matte(0xe8d8b0, 0.06), -0.004, 0, -0.002, 0.004, 0.006, 0.002), { rz: 0.4 * (p % 2 ? 1 : -1) });
      }, { ry: k % 2 ? 0.08 : -0.06 });
    }
  },
  // a rice bowl, a heap of rice (grains painted), a blue rim line
  rm_rice: (K) => {
    const rim = K.patch('ricerim', 64, 8, (V) => { V.fill(0xf4f0e8); V.box(0, 5, 64, 7, 0x2a4a8a); for (let i = 2; i < 64; i += 8) V.box(i, 1, i + 3, 3, 0x2a4a8a); }, { rough: 0.3 });
    K.lathe(ceramic(0xf4f0e8), [0, 0, 0], [[0, 0.004], [0.022, 0.004], [0.024, 0], [0.028, 0.006], [0.04, 0.012]], 14);
    K.wrapProfile(rim, 0, 0, [[0.04, 0.012], [0.054, 0.035], [0.0575, 0.05]], { n: 14, lift: 0.0003 });
    K.lathe(ceramic(0xf4f0e8), [0, 0, 0], [[0.04, 0.012], [0.054, 0.035], [0.0575, 0.05], [0.0555, 0.052], [0.051, 0.035], [0.02, 0.01], [0, 0.009]], 14);
    const grain = K.view('grain', { u: (p) => p[0], v: (p) => p[2], u0: -0.056, u1: 0.056, v0: -0.056, v1: 0.056, ppm: 900, rough: 0.6 }, (V) => { V.fill(0xeeebe2); for (let j = 1; j < V.H; j += 3) for (let i = (j % 2) * 2; i < V.W; i += 4) { V.box(i, j, i + 2, j + 1, 0xfaf8f2); V.px(i + 1, j - 1, 0xd8d4c8); } });
    K.ball(grain, 0, 0.044, 0, 0.052, 0.026, 0.052, 14, 4, { y0: 0, y1: 1 });
  },
  // a chashu don in a black-and-red lacquer bowl
  rm_chashu: (K) => {
    K.lathe(paint(0x1e1a1a, 0.15), [0, 0, 0], [[0, 0.004], [0.028, 0.004], [0.03, 0], [0.034, 0.005], [0.05, 0.016], [0.06, 0.035], [0.0625, 0.046]], 14);
    K.lathe(paint(0xb8281e, 0.25), [0, 0, 0], [[0.0625, 0.046], [0.0605, 0.048], [0.056, 0.034], [0.046, 0.016], [0, 0.012]], 14);
    K.lathe(matte(0xf6f4ee, 0.05), [0, 0.04, 0], [[0.057, 0], [0.04, 0.004], [0, 0.005]], 12);
    for (let k = 0; k < 4; k++) chashu(K, Math.cos(k * 1.6) * 0.022, 0.043 + k * 0.001, Math.sin(k * 1.6) * 0.02, k * 1.1, 0.026);
    negi(K, 0.0, 0.05, 0.0, 6);
  },
  // a big brown beer bottle (an original label) and a small glass with a head of foam
  rm_beer: (K) => {
    const lab = K.patch('beerlabel', 48, 32, (V) => {
      V.fill(0xf4e8c0); V.box(0, 22, 48, 26, 0x1e2a6a); V.box(0, 4, 48, 6, 0x1e2a6a);
      mascot(V, 'tsuru', 4, 21, { w: 0xf6f0e0, r: 0xc8302a });
      kana(K, V, 'ツル生', 31, 8, 0x1e2a6a, { size: 8, align: 'center' }); V.text5('BEER', 31, 20, 0xc8302a, { align: 'center' });
    }, { rough: 0.5 });
    K.at([-0.022, 0, 0], () => {
      bottle(K, 0, 0, 0, 0.036, 0.262, K.tint(0x5a2e0e, 225, 0.08), { glassy: true, shoulder: 0.62, neck: 0.013, neckAt: 0.82, label: lab, l0: 0.18, l1: 0.48, labelArc: Math.PI * 1.2, cap: metal(0xd8b040, 0.4), capH: 0.012, n: 12 });
    });
    K.at([0.046, 0, 0.004], () => {
      K.glass(() => K.lathe(K.tint(0xf0f4f2, 70, 0.04), [0, 0, 0], [[0, 0], [0.022, 0], [0.025, 0.1], [0.023, 0.1], [0.02, 0.004], [0, 0.004]], 14));
      K.lathe(flat(0xe8a830, 0.2), [0, 0, 0], [[0, 0.004], [0.0205, 0.004], [0.0228, 0.078], [0, 0.078]], 14);
      K.lathe(matte(0xf8f4ea, 0.1), [0, 0, 0], [[0.0228, 0.078], [0.0242, 0.098], [0.016, 0.102], [0, 0.103]], 14);
    });
  },
  // a tokkuri (a blue band) and its ochoko
  rm_sake: (K) => {
    const p = ceramic(0xf2eee4);
    K.at([-0.018, 0, 0], () => {
      K.lathe(p, [0, 0, 0], [[0, 0.002], [0.026, 0.002], [0.028, 0], [0.034, 0.025], [0.036, 0.045], [0.03, 0.07], [0.014, 0.095], [0.011, 0.11], [0.015, 0.124], [0.013, 0.126], [0.009, 0.115], [0, 0.112]], 14);
      K.lathe(ceramic(0x1e3a6a), [0, 0, 0], [[0.0362, 0.04], [0.0362, 0.052]].map(([r, y]) => [r, y]), 14);
    });
    K.at([0.036, 0, 0.004], () => {
      K.lathe(p, [0, 0, 0], [[0, 0.002], [0.012, 0.002], [0.013, 0], [0.018, 0.012], [0.02, 0.026], [0.018, 0.026], [0.015, 0.012], [0, 0.009]], 12);
      K.lathe(ceramic(0x2a4a8a), [0, 0, 0], [[0.0099, 0.0092], [0, 0.0092]].map(([r, y]) => [r, y + 0.0004]), 12);
      K.lathe(flat(0xe8e2cc, 0.15), [0, 0, 0], [[0.0165, 0.02], [0, 0.02]], 12);
    });
  },
  // oolong tea in a tumbler, two ice cubes
  rm_oolong: (K) => {
    K.glass(() => K.lathe(K.tint(0xf0f4f2, 70, 0.04), [0, 0, 0], [[0, 0], [0.024, 0], [0.0272, 0.118], [0.0254, 0.118], [0.0226, 0.006], [0, 0.006]], 14));
    K.lathe(flat(0x5a2a0e, 0.12), [0, 0, 0], [[0, 0.006], [0.0224, 0.006], [0.0258, 0.096], [0, 0.096]], 14);
    K.lathe(flat(0x8a4a1a, 0.05), [0, 0, 0], [[0.0259, 0.0905], [0.0259, 0.0955]], 14);
    for (const [x, z, a] of [[-0.006, 0.004, 0.3], [0.007, -0.006, 1.1]]) K.at([x, 0.094, z], () => K.box(flat(0xc8d8d8, 0.1), -0.009, -0.006, -0.009, 0.009, 0.008, 0.009, { bevel: 0.002 }), { ry: a, rz: 0.2 });
  },
  // the red lantern: ribbed washi glowing from inside, black lacquer ends, らーめん down the front
  rm_lantern: (K) => {
    const txt = K.patch('chochin', 32, 80, (V) => {
      V.fill(0xe8402a);
      for (let j = 0; j < 80; j += 8) V.box(0, j, 32, j + 1, 0xb82a1e);
      [...'らーめん'].forEach((ch, k) => (ch === 'ー' ? V.box(15, 52 - k * 18 - 12, 17, 52 - k * 18 + 2, 0x1e1210) : kana(K, V, ch, 16, 60 - k * 18, 0x1e1210, { size: 16, align: 'center' })));
    }, { rough: 0.9, bright: true });
    const prof = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10; prof.push([0.165 + Math.sin(t * Math.PI) * 0.08, 0.06 + t * 0.6]); }
    K.glow(() => {
      sweep(K, 0xe8402a, [0, 0, 0], prof, 16, { mod: (r, a, k) => r * (1 + 0.012 * Math.cos(a * 16)) });
      K.wrapProfile(txt, 0, 0, prof.slice(1, 10), { n: 16, arc: Math.PI * 0.42, turn: 0, lift: 0.002 });
    });
    for (const y of [0.0, 0.66]) K.cyl(paint(0x1a1414, 0.25), 0, y, 0, 0.175, 0.06, 18);
    K.cyl(paint(0x1a1414, 0.2), 0, 0.72, 0, 0.012, 0.03, 8);
    K.torus(metal(0x2a2624), 0, 0.755, 0, 0.012, 0.0025, 10, 4, { axis: 'z' });
  },
  // the round stool: red vinyl with a button, chrome pedestal, a weighted foot
  rm_stool: (K) => {
    K.lathe(plastic(0xb82a24, 0.18), [0, 0.6, 0], [[0.12, 0], [0.175, 0.004], [0.185, 0.02], [0.184, 0.06], [0.172, 0.074], [0.1, 0.08], [0.01, 0.074], [0, 0.074]], 20);
    K.lathe(plastic(0x8a1a18), [0, 0.6, 0], [[0.172, 0.074], [0.174, 0.072]], 20);
    K.ball(plastic(0x9a1e1a, 0.2), 0, 0.673, 0, 0.012, 0.004, 0.012, 8, 2);
    K.lathe(chrome(0xb8bcc2), [0, 0, 0], [[0.12, 0.6], [0.13, 0.59], [0.06, 0.575], [0.024, 0.56]], 16);
    K.cyl(chrome(0xc8ccd2), 0, 0.03, 0, 0.022, 0.53, 14);
    K.lathe(metal(0x6a6e72, 0.3), [0, 0, 0], [[0, 0], [0.15, 0], [0.152, 0.008], [0.12, 0.022], [0.04, 0.032], [0.024, 0.04], [0, 0.04]], 20);
    K.lathe(rubber(0x26262a), [0, 0, 0], [[0.13, -0.001], [0.15, -0.001], [0.152, 0.003]], 20);
  },
  // the stock pot: stainless, rolled rim, riveted handles, broth with fat, a ladle in it
  rm_pot: (K) => {
    const st = metal(0xb8bcc2, 0.35);
    K.lathe(st, [0, 0, 0], [[0, 0.004], [0.19, 0.004], [0.198, 0], [0.2, 0.012], [0.2, 0.38], [0.206, 0.385], [0.203, 0.392], [0.196, 0.39]], 22);
    K.lathe(metal(0x8a9096, 0.2), [0, 0, 0], [[0.196, 0.39], [0.194, 0.02], [0, 0.02]], 22);
    const br = K.patch('stock', 32, 32, (V) => { V.fill(0xc89858); for (const [i, j, r] of [[8, 9, 2.5], [22, 7, 2], [24, 22, 3], [7, 23, 2], [15, 16, 1.5]]) V.ring(i, j, r - 0.6, r + 0.5, 0xf0dca8); }, { rough: 0.15 });
    for (let k = 0; k < 24; k++) { const a0 = (k / 24) * Math.PI * 2, a1 = ((k + 1) / 24) * Math.PI * 2, P = (a) => [Math.cos(a) * 0.194, 0.32, Math.sin(a) * 0.194], st2 = (a) => [0.5 + Math.cos(a) * 0.5, 0.5 - Math.sin(a) * 0.5]; K.triUV(br, [0, 0.32, 0], P(a0), P(a1), [[0.5, 0.5], st2(a0), st2(a1)], [0, 1, 0]); }
    for (const s of [-1, 1]) K.at([s * 0.2, 0.33, 0], () => { K.tube(st, [[0, 0, -0.04], [s * 0.035, 0.005, -0.03], [s * 0.04, 0.01, 0], [s * 0.035, 0.005, 0.03], [0, 0, 0.04]], 0.006, 6, { flat: [0.016, 0.006], up: [0, 1, 0] }); for (const z of [-0.035, 0.035]) K.ball(chrome(), 0, 0, z, 0.004, 0.004, 0.004, 6, 2); });
    K.tube(chrome(0xc8ccd2), [[0.08, 0.3, 0.06], [0.11, 0.39, 0.08], [0.16, 0.45, 0.11]], 0.006, 6);
    K.ball(chrome(0xc8ccd2), 0.06, 0.3, 0.045, 0.032, 0.014, 0.032, 10, 3, { y0: -1, y1: 0 });
  },
  // the noodle boiler (yudemenki): a stainless tank, boiling water, four tebo baskets on wooden handles, the burner
  rm_boiler: (K) => {
    const st = metal(0xa8acb2, 0.35), top = metal(0xd0d4d8, 0.4);
    K.box(st, -0.36, 0.06, -0.24, 0.36, 0.78, 0.24, { bevel: 0.008 });
    for (const x of [-0.33, 0.33]) for (const z of [-0.21, 0.21]) { K.cyl(st, x, 0, z, 0.018, 0.07, 10); K.cyl(rubber(), x, 0, z, 0.022, 0.012, 10); }
    K.box(top, -0.37, 0.78, -0.25, 0.37, 0.8, 0.25, { bevel: 0.004 });
    K.box(metal(0x8a9096, 0.2), -0.33, 0.72, -0.22, 0.33, 0.8, 0.22, { inward: true, skip: ['py'] });
    // the boiling water: a pale surface with bubbles painted, a few raised bubbles
    const wat = K.patch('boil', 64, 40, (V) => { V.fill(0xb8d8e8); for (const [i, j, r] of [[6, 6, 2], [18, 12, 3], [30, 5, 2], [44, 14, 2.5], [56, 8, 2], [12, 28, 2], [26, 32, 3], [40, 26, 2], [52, 33, 2.5], [34, 20, 1.5]]) V.ring(i, j, r - 0.7, r + 0.5, 0xf4f8fc); }, { rough: 0.1 });
    K.face(wat, '+y', -0.33, -0.22, 0.33, 0.22, 0.765);
    for (let k = 0; k < 8; k++) K.ball(K.tint(0xf4f8fc, 150, 0.05), -0.28 + k * 0.08, 0.766, ((k * 7) % 5 - 2) * 0.06, 0.008, 0.004, 0.008, 6, 2, { y0: 0 });
    // the tebo: mesh cups in the water, long wooden handles leaning on the rim
    for (let i = 0; i < 4; i++) {
      const x = -0.22 + i * 0.146;
      K.ring(metal(0x8a9096, 0.2), x, 0.69, 0, 0.06, 0.056, 0.08, 14, { inside: flat(0x6a7074) });
      K.torus(chrome(), x, 0.77, 0, 0.06, 0.003, 14, 4);
      K.rod(chrome(), [x, 0.77, -0.06], [x, 0.84, -0.13], 0.004, 5);
      K.rod(wood(0x6a4428), [x, 0.84, -0.13], [x, 1.04, -0.23], 0.011, 8);
    }
    // the front: the gas burner window, two knobs, a maker's plate
    K.box(flat(0x2a2a2a, 0.5), -0.3, 0.1, 0.24, 0.3, 0.2, 0.243);
    K.glow(() => { for (let k = 0; k < 10; k++) K.box(0x4a8af0, -0.25 + k * 0.05, 0.13, 0.2432, -0.235 + k * 0.05, 0.15, 0.2436); });
    for (const x of [-0.22, 0.22]) { K.cyl(plastic(0x1e1e1e, 0.2), x, 0.33, 0.24, 0.028, 0.02, 14, { axis: 'z' }); K.box(flat(0xe8e8e8), x - 0.003, 0.33, 0.26, x + 0.003, 0.355, 0.2604); }
    const pl = K.patch('plate', 40, 12, (V) => { framed(V, 0xd8dce0, 0x6a6e72); kana(K, V, 'ゆで麺機', 20, 2, 0x2a2a2a, { size: 8, align: 'center' }); }, { rough: 0.4 });
    K.face(pl, '+z', -0.08, 0.5, 0.08, 0.55, 0.2402);
  },
  // the sink: a stainless cabinet, the basin, a gooseneck tap
  rm_sink: (K) => {
    const st = metal(0xb8bcc2, 0.35), dk = metal(0x8a9096, 0.2);
    K.box(st, -0.44, 0.06, -0.28, 0.44, 0.84, 0.28, { bevel: 0.006 });
    for (const x of [-0.42, 0.42]) for (const z of [-0.26, 0.26]) K.cyl(st, x, 0, z, 0.016, 0.07, 10);
    K.box(dk, -0.36, 0.6, -0.2, 0.36, 0.842, 0.2, { inward: true, skip: ['py'] });
    K.lathe(flat(0x4a4e52), [0, 0.6005, 0], [[0.03, 0], [0.024, 0.0005], [0, 0.0005]], 12);
    for (let k = 0; k < 6; k++) K.box(flat(0x2a2e32), -0.016 + k * 0.006, 0.601, -0.0015, -0.014 + k * 0.006, 0.6012, 0.0015);
    // the cabinet doors, the front lip
    for (const [x0, x1] of [[-0.43, -0.005], [0.005, 0.43]]) { K.box(st, x0, 0.1, 0.28, x1, 0.7, 0.285, { bevel: 0.003 }); K.box(dk, x0 < 0 ? x1 - 0.04 : x0 + 0.02, 0.52, 0.285, x0 < 0 ? x1 - 0.02 : x0 + 0.04, 0.62, 0.293, { bevel: 0.002 }); }
    // the tap: a riser, the gooseneck, two cross handles
    K.cyl(chrome(), 0, 0.84, -0.24, 0.016, 0.1, 12);
    K.tube(chrome(), [[0, 0.94, -0.24], [0, 1.1, -0.22], [0, 1.15, -0.16], [0, 1.12, -0.1], [0, 1.06, -0.09]], 0.011, 10);
    for (const s of [-1, 1]) { K.cyl(chrome(), s * 0.05, 0.84, -0.24, 0.01, 0.07, 10); K.box(s < 0 ? paint(0xd8382e) : paint(0x2a6ad8), s * 0.05 - 0.024, 0.905, -0.244, s * 0.05 + 0.024, 0.913, -0.236, { bevel: 0.002 }); }
  },
  // the dish drainer: a stainless wire basket on feet
  rm_rack: (K) => {
    const w = chrome(0xc8ccd2);
    for (const [y, inset] of [[0.004, 0.01], [0.15, 0]]) K.tube(w, [[-0.2 + inset, y, -0.1 + inset], [0.2 - inset, y, -0.1 + inset], [0.2 - inset, y, 0.1 - inset], [-0.2 + inset, y, 0.1 - inset]], 0.0028, 5, { closed: true });
    K.tube(w, [[-0.2, 0.08, -0.1], [0.2, 0.08, -0.1], [0.2, 0.08, 0.1], [-0.2, 0.08, 0.1]], 0.002, 4, { closed: true });
    for (let k = 0; k <= 12; k++) { const x = -0.19 + k * (0.38 / 12); for (const z of [-0.1, 0.1]) K.rod(w, [x, 0.004, z * 0.9], [x, 0.15, z], 0.0018, 4); K.rod(w, [x, 0.006, -0.09], [x, 0.006, 0.09], 0.0018, 4); }
    for (let k = 0; k < 6; k++) K.rod(w, [-0.12 + k * 0.05, 0.006, -0.07], [-0.12 + k * 0.05, 0.1, -0.07], 0.0018, 4);
    for (const x of [-0.18, 0.18]) for (const z of [-0.08, 0.08]) K.cyl(rubber(0x3a3a3e), x, 0, z, 0.006, 0.006, 6);
  },
  // the sponge: yellow foam, a green scouring pad
  rm_sponge: (K) => {
    K.box(matte(0xf4d040, 0.1), -0.037, 0, -0.022, 0.037, 0.02, 0.022, { bevel: 0.004 });
    K.box(matte(0x3a9a4a, 0.08), -0.036, 0.02, -0.0215, 0.036, 0.029, 0.0215, { bevel: 0.002 });
  },
};

export default {
  family: 'ramen',
  models: Object.fromEntries(Object.entries(models).map(([id, fn]) => [id, { build: fn, box: BOUNDS[id] || BOWL_BOX }])),
};
