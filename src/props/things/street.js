// What people carry on the lane (src/npc/streetProps.js) and the guestbook lectern (src/npc/props.js), modelled with
// the prop kit. Origins are where the old voxel pivots were, so hands and rigs hold them as before:
//   cigGeometry()   origin 1 cm from the filter end, the cigarette along +z (0.07 m)
//   bagGeometry()   origin at the top of the handles, the Mikawa-ya bag hanging below (0.18 x 0.28 x 0.10)
//   canGeometry()   (see streetProps: the drinks themselves come from src/products/containers.js)
//   jouroGeometry() origin at the top of the handle, the can below, the spout towards +z
//   cartGeometry()  origin on the axle: wheels r 0.08, the frame up the back (-z), the bag in front, handle at 0.9 m
//   lecternMesh()   the guestbook stand: base, post, the slanted top the book lies on (y 1.0, tilted 0.36 rad)
import { thingGeometry, thingMesh } from './make.js';
import { sweep } from './form.js';
import { plastic, metal, rubber, matte, flat, fabric } from '../kit/kit.js';
import { kana, framed } from '../kit/prints.js';
import { plank } from '../kit/shapes.js';

// ------------------------------------------------------------------ a cigarette
export function cigGeometry() {
  return thingGeometry('street', 'cig', [-0.003, -0.003, -0.01, 0.003, 0.003, 0.06], (K) => {
    const r = 0.0028;
    K.cyl(matte(0xd8a050, 0.06), 0, 0, -0.01, r, 0.02, 8, { axis: 'z' });
    K.cyl(matte(0xc89040, 0), 0, 0, 0.0085, r * 1.01, 0.0015, 8, { axis: 'z', caps: false });
    K.cyl(matte(0xece8e0, 0.04), 0, 0, 0.01, r, 0.044, 8, { axis: 'z' });
    K.cyl(flat(0x6a6660, 0.9), 0, 0, 0.054, r * 0.96, 0.003, 8, { axis: 'z' });
    K.glow(() => K.lathe(0xe8602a, [0, 0, 0.057], [[r * 0.9, 0], [r * 0.5, 0.0022], [0, 0.0026]], 8, { axis: 'z' }));
    for (let k = 0; k < 3; k++) K.box(flat(0xc89040, 0.4), -0.0004, r * 0.99, -0.008 + k * 0.006, 0.0004, r * 1.02, -0.0065 + k * 0.006);
  });
}

// ------------------------------------------------------------------ the Mikawa-ya shopping bag (semi-clear white HDPE, red print)
export function bagGeometry() {
  return thingGeometry('street', 'bag', [-0.09, -0.28, -0.05, 0.09, 0, 0.05], (K) => {
    const print = K.patch('print', 48, 40, (V) => {
      V.fill(0xeeece6);
      V.box(0, 30, 48, 34, 0xd84a3a);
      kana(K, V, '三河屋', 24, 26, 0xd84a3a, { size: 16, align: 'center' });
      kana(K, V, 'よろず', 24, 8, 0xd84a3a, { size: 8, align: 'center' });
    }, { rough: 0.55 });
    // the body: a soft box with the shopping pushing out the sides, gathered under the handles
    const prof = [[0, -0.28], [0.075, -0.28], [0.088, -0.27], [0.09, -0.22], [0.088, -0.14], [0.08, -0.1], [0.06, -0.085], [0.035, -0.08]];
    const sq = (r, a, k) => r / Math.pow(Math.abs(Math.sin(a)) ** 3 + Math.abs(Math.cos(a)) ** 3 * 1.0, 1 / 3) * (1 + (k > 1 && k < 6 ? 0.05 * Math.sin(a * 3 + k) : 0));
    sweep(K, matte(0xe8e6e0, 0.05), [0, 0, 0], prof, 16, { mod: sq, sz: 0.55 });
    K.face(print, '+z', -0.042, -0.225, 0.042, -0.155, 0.0528);
    K.face(print, '-z', -0.042, -0.225, 0.042, -0.155, -0.0528);
    // goods showing through: a milk carton corner, a packet
    K.box(flat(0xd8dce8, 0.7), -0.06, -0.275, -0.035, -0.005, -0.12, 0.03);
    // the handles: two loops gathered into the hand
    for (const s of [-1, 1]) K.tube(matte(0xe8e6e0, 0.04), [[s * 0.04, -0.085, s * 0.004], [s * 0.034, -0.05, s * 0.006], [s * 0.016, -0.012, 0], [0, -0.002, 0], [-s * 0.016, -0.012, 0], [-s * 0.034, -0.05, -s * 0.006], [-s * 0.04, -0.085, -s * 0.004]], 0.004, 5, { flat: [0.012, 0.003], up: [0, 0, 1] });
  });
}

// ------------------------------------------------------------------ a small plastic watering can
export function jouroGeometry() {
  return thingGeometry('street', 'jouro', [-0.07, -0.18, -0.065, 0.07, 0, 0.14], (K) => {
    const g = plastic(0x4aa06a, 0.2), gd = plastic(0x2a6a44, 0.15);
    K.lathe(g, [0, -0.18, -0.005], [[0, 0], [0.056, 0], [0.06, 0.006], [0.062, 0.1], [0.058, 0.115], [0.04, 0.124], [0.026, 0.128]], 14);
    K.lathe(gd, [0, -0.052, -0.005], [[0.026, 0], [0.028, 0.006], [0.024, 0.008], [0, 0.008]], 12);
    // the spout from the foot of the body up and out, the rose on its end
    K.tube(g, [[0, -0.155, 0.05], [0, -0.12, 0.09], [0, -0.075, 0.12]], 0.009, 8, { r1: 0.0065 });
    K.lathe(gd, [0, -0.075, 0.12], [[0.007, 0], [0.016, 0.012], [0.016, 0.016], [0, 0.017]].map(([r, t]) => [r, t]), 12, { axis: 'z' });
    // the handle arching over the top
    K.tube(gd, [[0, -0.075, -0.062], [0, -0.012, -0.05], [0, -0.004, -0.005], [0, -0.012, 0.035], [0, -0.06, 0.045]], 0.007, 6, { flat: [0.016, 0.01], up: [1, 0, 0] });
  });
}

// ------------------------------------------------------------------ the granny cart
export function cartGeometry() {
  return thingGeometry('street', 'cart', [-0.15, -0.08, -0.1, 0.15, 0.92, 0.09], (K) => {
    const tart = K.patch('tartan', 32, 32, (V) => {
      V.fill(0x7a2a3a);
      for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) {
        const a = i % 16 < 5, b = j % 16 < 5, c = i % 16 === 9, d = j % 16 === 9;
        if (a && b) V.px(i, j, 0x1e2a4a); else if (a || b) V.px(i, j, 0x3a5a8a); else if (c || d) V.px(i, j, 0xd8b040);
      }
    }, { rough: 0.95 });
    const al = metal(0xb8bcc0, 0.35);
    // wheels: grey tyres on white hubs, the axle
    for (const s of [-1, 1]) {
      K.lathe(rubber(0x26262a), [s * 0.12, 0, 0], [[0.05, -0.014], [0.072, -0.014], [0.08, -0.006], [0.08, 0.006], [0.072, 0.014], [0.05, 0.014]], 16, { axis: 'x' });
      K.lathe(plastic(0xd8dce0, 0.2), [s * 0.12, 0, 0], [[0.05, -0.012], [0.05, 0.012], [0.012, 0.016], [0, 0.017]], 12, { axis: 'x' });
      K.lathe(plastic(0xd8dce0, 0.2), [s * 0.12, 0, 0], [[0, -0.017], [0.012, -0.016], [0.05, -0.012]], 12, { axis: 'x' });
    }
    K.cyl(al, -0.12, 0, 0, 0.006, 0.24, 8, { axis: 'x' });
    // the frame: two uprights bent back at the top into the handle, a foot plate
    for (const s of [-1, 1]) K.tube(al, [[s * 0.1, -0.01, -0.06], [s * 0.1, 0.4, -0.065], [s * 0.1, 0.8, -0.07], [s * 0.085, 0.9, -0.075]], 0.008, 8);
    K.tube(al, [[-0.085, 0.9, -0.075], [0.085, 0.9, -0.075]], 0.008, 8);
    K.cyl(rubber(0x2a2a2c), -0.07, 0.9, -0.075, 0.013, 0.14, 12, { axis: 'x' });
    K.box(al, -0.1, 0.02, -0.06, 0.1, 0.028, 0.08);
    // the bag: a soft tartan bag strapped to the frame, a drawstring top and a flap
    const prof = [[0, 0.03], [0.075, 0.03], [0.085, 0.05], [0.088, 0.4], [0.086, 0.62], [0.08, 0.66], [0.07, 0.68]];
    sweep(K, tart, [0, 0, 0.02], prof.map(([r, y]) => [r * 1.3, y]), 16, { mod: (r, a) => r / Math.pow(Math.abs(Math.sin(a)) ** 4 + Math.abs(Math.cos(a)) ** 4, 0.25), sz: 0.62 });
    K.lathe(fabric(0x1e2a4a), [0, 0.66, 0.02], [[0.104, 0], [0.09, 0.03], [0.06, 0.045], [0, 0.05]], 14, { sz: 0.62 });
    K.at([0, 0.68, -0.05], () => K.box(fabric(0x1e2a4a), -0.11, -0.004, 0, 0.11, 0.004, 0.13), { rx: 0.35 });
    for (const y of [0.25, 0.55]) K.box(fabric(0x26262a), -0.115, y, -0.068, 0.115, y + 0.025, -0.06);
  });
}

// ------------------------------------------------------------------ the guestbook lectern
export function lecternMesh() {
  return thingMesh('street', 'lectern', [-0.285, 0, -0.255, 0.285, 1.04, 0.255], (K) => {
    const W = 0x8a6038, D = 0x6a4428;
    plank(K, D, -0.19, 0, -0.16, 0.19, 0.035, 0.16, { bevel: 0.008 });
    plank(K, D, -0.15, 0.035, -0.12, 0.15, 0.05, 0.12, { bevel: 0.004, v: 1 });
    plank(K, W, -0.035, 0.05, -0.035, 0.035, 0.94, 0.035, { bevel: 0.006, axis: 'y' });
    for (const s of [-1, 1]) K.at([s * 0.035, 0.05, 0], () => K.prism(matte(D, 0.1), [[0, 0], [0.09, 0], [0, 0.14]].map(([x, y]) => [x * s, y]), { plane: 'xy', a: -0.008, b: 0.008 }));
    // the slanted top: a board with a lip at the front edge (the book lies on it)
    K.at([0, 0.985, 0], () => {
      plank(K, W, -0.27, -0.018, -0.2, 0.27, 0, 0.2, { bevel: 0.005, v: 2 });
      plank(K, D, -0.27, 0, 0.18, 0.27, 0.02, 0.2, { bevel: 0.003, v: 3 });
      K.box(matte(D, 0.1), -0.06, -0.06, -0.06, 0.06, -0.018, 0.06, { bevel: 0.006 });
    }, { rx: 0.36 });
    // a small brass plate on the post
    const pl = K.patch('plate', 32, 10, (V) => { framed(V, 0xc8a44a, 0x8a6a2a); kana(K, V, 'ごあいさつ', 16, 1, 0x4a3418, { size: 8, align: 'center' }); }, { rough: 0.4 });
    K.face(pl, '+z', -0.032, 0.62, 0.032, 0.64, 0.0355);
  }, { name: 'guestbook-lectern' });
}
