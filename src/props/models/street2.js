// More of the lane (ids from src/data/props/street2.js): the manhole cover, litter, the power cabinet, an air
// conditioner's outdoor unit, a scooter and a mamachari, the garbage station and the recycling cage, a house gate,
// laundry poles, the roadside Jizō, potted plants, pigeons and the stray cats.
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, lighten, darken, mix } from '../kit/kit.js';
import { blob, bush, tones, leafy, leaf, leafRing, blade, flower, pot, planter, dirtBox, dirtRing, plank, post, clamps, spokeWheel, discWheel, can, carton, stack, tied, bucket, TERRA } from '../kit/shapes.js';
import { kana, smallPrint, hazard, framed, meshTex, meshPanel, louvres, rustEdge, sticker, warnTri, mascot, barcode } from '../kit/prints.js';
import { tomareTex } from './street.js';
import { leaves } from '../kit/foliage.js';
import { catHead, catTail, CALICO, FUR, pigeon, crow } from '../kit/animals.js';

const GALV = metal(0xa6acae, 0.3), LEAF = 0x4f8f45, LEAF2 = 0x6aa84f, SOIL = 0x4a3828;

/** Drink can labels (original brands), 96 x 36: the design twice round the can so it reads from any side. */
function canLabel(K, kind) {
  return K.patch('can:' + kind, 96, 36, (V) => {
    for (const x of [0, 48]) {
      if (kind === 'cola') { V.box(x, 0, x + 48, 36, 0xc8282a); V.polyPx([[x, 14], [x + 16, 19], [x + 32, 12], [x + 48, 16], [x + 48, 11], [x + 32, 8], [x + 16, 15], [x, 10]], 0xf2efe6); V.text5('POPPO', x + 24, 31, 0xffffff, { align: 'center' }); }
      else if (kind === 'coffee') { V.box(x, 0, x + 48, 36, 0x3a2a22); V.box(x, 0, x + 48, 4, 0xc8a04a); V.box(x, 32, x + 48, 36, 0xc8a04a); V.text5('KISSA', x + 24, 29, 0xe8c878, { align: 'center' }); mascot(V, 'suzume', x + 19, 19, { b: 0xc8a04a, w: 0xf2efe6, k: 0x1a1210 }); }
      else { V.box(x, 0, x + 48, 36, 0x2f8a5a); V.box(x, 27, x + 48, 36, 0xf2efe6); kana(K, V, 'お茶', x + 24, 25, 0xf2efe6, { size: 16, align: 'center' }); }
    }
  }, { shared: true, rough: 0.5 });
}
export { canLabel };

/** A cat's body + legs for the standing / sitting / held poses. */
function cat(K, pose) {
  const W = matte(FUR.white, 0.1), O = flat(FUR.orange, 0.9), Bk = flat(FUR.black, 0.9);
  if (pose === 'stand') {
    K.box(W, -0.07, 0.12, -0.17, 0.07, 0.25, 0.1, { bevel: 0.04, edge: null });
    K.box(O, -0.072, 0.17, -0.1, 0.072, 0.252, 0.0, { bevel: 0.04, edge: null }); K.box(Bk, -0.071, 0.16, -0.172, 0.0, 0.251, -0.11, { bevel: 0.035, edge: null });
    for (const [x, z, c] of [[-0.045, 0.06, W], [0.045, 0.06, W], [-0.045, -0.13, W], [0.045, -0.13, O]]) { K.box(c, x - 0.022, 0.012, z - 0.024, x + 0.022, 0.15, z + 0.024, { bevel: 0.01, edge: null }); K.box(W, x - 0.024, 0, z - 0.024, x + 0.024, 0.024, z + 0.038, { bevel: 0.01, edge: null }); }
    catHead(K, 0, 0.27, 0.13, 0.17, CALICO);
    catTail(K, [[0, 0.22, -0.16], [0, 0.27, -0.19], [0.005, 0.32, -0.185], [0.01, 0.345, -0.16]], 0.017, [FUR.orange, FUR.black, FUR.orange]);
  } else if (pose === 'sit') {
    K.box(W, -0.075, 0, -0.1, 0.075, 0.2, 0.05, { bevel: 0.045, edge: null }); // haunches
    K.box(W, -0.06, 0.1, -0.06, 0.06, 0.27, 0.06, { bevel: 0.04, edge: null }); // chest
    K.box(O, -0.077, 0.03, -0.102, 0.0, 0.16, -0.02, { bevel: 0.04, edge: null }); K.box(Bk, 0.02, 0.1, -0.103, 0.077, 0.2, -0.03, { bevel: 0.035, edge: null });
    for (const x of [-0.035, 0.035]) { K.box(W, x - 0.02, 0.012, 0.03, x + 0.02, 0.17, 0.07, { bevel: 0.01, edge: null }); K.box(W, x - 0.023, 0, 0.03, x + 0.023, 0.024, 0.09, { bevel: 0.01, edge: null }); }
    catHead(K, 0, 0.31, 0.03, 0.18, CALICO);
    catTail(K, [[0.05, 0.02, -0.09], [0.1, 0.02, -0.06], [0.11, 0.02, 0.0], [0.09, 0.02, 0.05]], 0.017, [FUR.orange, FUR.black, FUR.orange]);
  } else {
    // held under the arms: the body hangs long, the legs dangle
    K.box(W, -0.065, 0.1, -0.06, 0.065, 0.4, 0.06, { bevel: 0.04, edge: null });
    K.box(O, -0.067, 0.24, -0.062, 0.0, 0.36, 0.0, { bevel: 0.035, edge: null }); K.box(Bk, 0.01, 0.12, -0.062, 0.067, 0.22, 0.01, { bevel: 0.035, edge: null });
    for (const x of [-0.04, 0.04]) { K.box(W, x - 0.02, 0.0, 0.0, x + 0.02, 0.14, 0.045, { bevel: 0.012, edge: null }); K.at([x * 1.9, 0.33, 0.04], () => K.box(W, -0.02, -0.02, 0, 0.02, 0.02, 0.09, { bevel: 0.012, edge: null }), { rx: 0.5 }); }
    catHead(K, 0, 0.455, 0.01, 0.17, CALICO, { eyes: 'shut' });
    catTail(K, [[0, 0.12, -0.05], [0.01, 0.06, -0.07], [0.02, 0.01, -0.065]], 0.016, [FUR.orange, FUR.black]);
  }
}

export default {
  family: 'street',
  models: {
    tomare_sign: (K, B) => {
      const top = B.y1 - 0.01, s = 0.76, th = s * 0.866, pz = 0.02;
      post(K, 0, pz - 0.04, top - th * 0.2, 0.03, { n: 8 });
      dirtRing(K, 0xa6acae, 0, pz - 0.04, 0.03, 0, 0.05, 8);
      const V = tomareTex(K);
      K.triUV(V, [-s / 2, top, pz + 0.005], [s / 2, top, pz + 0.005], [0, top - th, pz + 0.005], [[0.004, 0.996], [0.996, 0.996], [0.5, 0.004]], [0, 0, 1]);
      K.prism(metal(0x9aa0a2, 0.25), [[-s / 2, top], [s / 2, top], [0, top - th]], { plane: 'xy', a: pz - 0.003, b: pz + 0.0045, caps: 'a' });
      clamps(K, 0, [top - th * 0.2, top - th * 0.62], pz - 0.07, 0.03);
      // the lane's name on a blue plate under it
      const nm = K.patch('lane', 56, 20, (V) => { framed(V, 0x2a52a8, 0xe8e4d4); kana(K, V, '銀座通り', 28, 18, 0xffffff, { size: 8, s: 1, align: 'center' }); smallPrint(V, 10, 5, 36, 1, 0xc8d4f0); }, { rough: 0.7 });
      K.box(flat(0x2a52a8, 0.7), -0.16, 1.32, pz - 0.006, 0.16, 1.44, pz + 0.002); K.face(nm, '+z', -0.16, 1.32, 0.16, 1.44, pz + 0.0032);
    },

    // ------------------------------------------------------------- a design manhole cover (0.616 across)
    manhole: (K) => {
      const R = 0.306;
      const V = K.view('lid', { u: (p) => p[0], v: (p) => -p[2], u0: -R, u1: R, v0: -R, v1: R, ppm: 250, rough: 0.6 }, (V) => {
        const c = V.W / 2, iron = 0x4a4844, hi = 0x6a6660, lo = 0x2e2c2a;
        for (let j = 0; j < V.H; j++) for (let i = 0; i < V.W; i++) {
          const dx = i + 0.5 - c, dy = j + 0.5 - c, d = Math.hypot(dx, dy) / c, a = Math.atan2(dy, dx);
          let col = iron;
          if (d > 0.93) col = lo; else if (d > 0.86) col = hi; else if (d > 0.8) col = (Math.floor((a + 4) * 14) % 2 ? iron : lo); // rim, a ring of teeth
          else if (d > 0.76) col = hi;
          else {
            // the picture: evening sky, a far hill, the river, cherry blossom from the upper right
            const y = dy / c;
            col = y > 0.12 ? 0x9cc4dc : y > 0.0 ? 0x7aa88a : 0x4a7ab8;
            if (y <= 0 && Math.floor((dx + Math.sin(dy * 0.3) * 6 + 200) / 9) % 2 === 0 && Math.floor((dy + 200) / 5) % 2 === 0) col = 0x7aa4d8;
            if (y > 0.0 && y < 0.12 + 0.1 * Math.cos(dx / c * 4)) col = 0x5f946a;
            if ((i + j) % 9 === 0 && d < 0.74 && (i * 7 + j * 3) % 4 === 0) col = mix(col, lo, 0.35); // cast grip dots
          }
          V.px(i, j, col);
        }
        V.line(c + 52, c + 50, c + 12, c + 26, 0x5a3a2a); V.line(c + 52, c + 49, c + 12, c + 25, 0x5a3a2a); V.line(c + 30, c + 36, c + 20, c + 50, 0x5a3a2a);
        for (const [x, y, r] of [[40, 44, 7], [26, 34, 6], [14, 28, 5], [22, 50, 6], [48, 30, 5], [6, 40, 4]]) { V.disc(c + x, c + y, r, 0xf2a8bc); V.disc(c + x, c + y, r * 0.45, 0xf8d0da); V.px(c + x, c + y, 0xd8627a); }
        V.text5('MORIO', c, c - 38, 0xe8e4d8, { align: 'center' }); V.text5('OSUI', c, c - 48, 0xc8c4b8, { align: 'center' });
      });
      K.lathe(V, [0, 0, 0], [[R, 0], [R, 0.012], [R - 0.012, 0.016], [0, 0.016]], 16);
      K.box(flat(0x2e2c2a, 0.7), -0.03, 0.016, R - 0.07, 0.03, 0.0175, R - 0.045); // the pick hole's plug
    },

    // ------------------------------------------------------------- litter: a crushed bottle, two cans, a butt (0.5 x 0.105 x 0.255)
    drink_cans: (K) => {
      K.at([-0.05, 0.034, 0.02], () => can(K, 0, 0, -0.061, canLabel(K, 'cola'), { turn: 1 }), { rx: Math.PI / 2, ry: 1.25 });
      can(K, 0.2, 0, -0.06, canLabel(K, 'coffee'), { r: 0.027, h: 0.104, turn: 0.4 });
      // the PET bottle, stepped on: flattened body, label half torn, its cap still on
      K.at([-0.17, 0.03, -0.01], () => {
        K.glass(() => K.lathe(K.tint(0xd8ecec, 96), [0, 0, 0], [[0, 0], [0.03, 0.005], [0.034, 0.02], [0.03, 0.09], [0.034, 0.15], [0.014, 0.185], [0.014, 0.2]], 8, { sz: 0.6 }));
        K.lathe(flat(0x3a8ad8, 0.6), [0, 0, 0], [[0.031, 0.06], [0.031, 0.1]], 8, { sz: 0.62 });
        K.cyl(plastic(0x2a5ab8), 0, 0.2, 0, 0.016, 0.014, 8);
      }, { rz: Math.PI / 2 - 0.05, ry: -0.3 });
      K.at([0.08, 0.004, 0.09], () => { K.cyl(flat(0xe8e4d8, 0.9), 0, 0, 0, 0.004, 0.022, 5, { axis: 'x' }); K.cyl(flat(0xd89a4a, 0.9), 0.022, 0, 0, 0.004, 0.012, 5, { axis: 'x' }); }, { ry: 0.6 });
      blob(K, flat(0xe8e4d8, 0.95), 0.0, 0.006, 0.1, 0.02, 0.006, 0.015, { seed: 3, flatY: -0.3 });
    },

    // ------------------------------------------------------------- the power company's cabinet (1.22 x 1.38 x 0.66)
    power_box: (K) => {
      const c = 0x9aa29e, st = paint(c, 0.22), w = 0.58, d = 0.3;
      K.box(stone(0xa39f96), -0.61, 0, -0.33, 0.61, 0.13, 0.33, { bevel: 0.015 });
      dirtBox(K, 0xa39f96, -0.61, -0.33, 0.61, 0.33, 0, 0.05);
      // the front: two doors, recessed handles, hinges, the danger plate, the number, rust along the sill
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: -w, u1: w, v0: 0.13, v1: 1.3, ppm: 190, rough: 0.55 }, (V) => {
        const dk = darken(c, 0.3), lt = lighten(c, 0.25), I = (x) => V.i(x), J = (y) => V.j(y);
        V.fill(c); V.box(0, J(1.24), V.W, V.H, lighten(c, 0.1)); V.box(0, 0, V.W, J(0.2), darken(c, 0.08));
        for (const [x0, x1] of [[-0.55, -0.01], [0.01, 0.55]]) { V.frame(I(x0), J(0.19), I(x1), J(1.24), dk); V.hline(I(x0) + 1, I(x1) - 1, J(0.19) - 1, lt); V.vline(I(x1), J(0.19), J(1.24) - 1, lt); }
        for (const x of [-0.07, 0.03]) { V.box(I(x), J(0.62), I(x) + 8, J(0.84), dk); V.box(I(x) + 2, J(0.64), I(x) + 6, J(0.82), 0x3a3e3c); V.vline(I(x) + 3, J(0.68), J(0.78), 0xc8ccc8); }
        for (const x of [-0.545, 0.535]) for (const y of [0.3, 0.7, 1.1]) { V.box(I(x), J(y), I(x) + 3, J(y) + 14, dk); V.vline(I(x) + 3, J(y), J(y) + 13, lt); }
        // stickers: the lightning warning, キケン, the unit number, an inspection slip
        V.box(I(-0.44), J(0.92), I(-0.24), J(1.14), 0xf2c21c); V.frame(I(-0.44), J(0.92), I(-0.24), J(1.14), 0x26221e);
        V.polyPx([[I(-0.33), J(1.11)], [I(-0.39), J(1.02)], [I(-0.345), J(1.02)], [I(-0.37), J(0.95)], [I(-0.29), J(1.045)], [I(-0.335), J(1.045)], [I(-0.31), J(1.11)]], 0x26221e);
        V.box(I(-0.48), J(0.7), I(-0.16), J(0.84), 0xf2efe6); V.frame(I(-0.48), J(0.7), I(-0.16), J(0.84), 0xc8242a);
        kana(K, V, 'キケン', I(-0.32), J(0.82), 0xc8242a, { size: 16, s: 1, align: 'center' });
        V.box(I(0.2), J(0.96), I(0.42), J(1.12), 0xf2efe6); V.frame(I(0.2), J(0.96), I(0.42), J(1.12), 0x3a3a3a); V.text5('108', I(0.31), J(1.09), 0x1e1e1e, { align: 'center', s: 2 });
        V.box(I(0.24), J(0.44), I(0.4), J(0.62), 0xf2efe6); smallPrint(V, I(0.26), J(0.59), 22, 5, 0x6a6a6a, { seed: 4 }); V.box(I(0.24), J(0.44), I(0.4), J(0.47), 0x3a8a4a);
        rustEdge(V, 0, V.W, 0, 12, 3); rustEdge(V, I(-0.2), I(0.1), J(1.24) - 6, 5, 9);
        for (const x of [-0.3, 0.18, 0.47]) for (let j = J(1.0); j < J(1.24); j++) if ((j + Math.round(x * 100)) % 3) V.px(I(x), j, darken(c, 0.12)); // rain streaks under the cap
      });
      const side = K.patch('side', 72, 152, (V) => { V.fill(c); V.box(0, 0, 72, 10, darken(c, 0.08)); louvres(V, 14, 96, 58, 132, c, 4); louvres(V, 14, 30, 58, 50, c, 4); rustEdge(V, 0, 72, 0, 10, 5); V.frame(0, 0, 72, 152, darken(c, 0.18)); }, { rough: 0.55 });
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : K.uv(st))(p, n), (G) => G.box(-w, 0.13, -d, w, 1.3, d, { bevel: 0.012 }));
      K.face(side, '+x', -d + 0.02, 0.15, d - 0.02, 1.28, w + 0.001); K.face(side, '-x', -d + 0.02, 0.15, d - 0.02, 1.28, -w - 0.001);
      // the cap: a shallow pitched lid with a drip edge
      K.prism(paint(lighten(c, 0.06), 0.25), [[-0.34, 1.3], [0.34, 1.3], [0.34, 1.325], [0, 1.375], [-0.34, 1.325]].map(([z, y]) => [z, y]), { plane: 'zy', a: -0.61, b: 0.61 });
      for (const x of [-0.56, 0.56]) K.box(metal(0x7e8486), x - 0.012, 0.13, d - 0.01, x + 0.012, 0.15, d + 0.012);
      // weeds in the crack along the plinth
      for (const [x, s] of [[-0.45, 1], [0.2, 0.8], [0.5, 1.1]]) for (let k = 0; k < 4; k++) blade(K, flat(k % 2 ? 0x5c8f45 : 0x77a554, 0.9), [x + k * 0.012, 0, 0.335], [x + (k - 1.5) * 0.045 * s, 0.1 * s + (k % 2) * 0.04, 0.34 + (k % 2) * 0.02], 0.016);
    },

    // ------------------------------------------------------------- an air conditioner's outdoor unit, its pipe cover up the wall (1.0 x 0.96 x 0.35)
    ac_unit: (K, B) => {
      const c = 0xdcd8cc, body = paint(c, 0.15), x0 = B.x0, x1 = x0 + 0.78, z1 = 0.165, z0 = -0.125, y0 = 0.09, y1 = 0.64;
      for (const x of [x0 + 0.1, x1 - 0.1]) K.box(plastic(0x8a8a86), x - 0.05, 0, z0 - 0.02, x + 0.05, y0, z1 + 0.0, { bevel: 0.012 });
      const F = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: x0, u1: x1, v0: y0, v1: y1, ppm: 256, rough: 0.6 }, (V) => {
        const dk = darken(c, 0.3), lt = lighten(c, 0.3), I = (x) => V.i(x0 + x), J = (y) => V.j(y0 + y);
        V.fill(c); V.box(0, 0, V.W, 4, darken(c, 0.1));
        // the fan: a dark throat, blades behind a guard of rings and spokes
        const cx = I(0.27), cy = J(0.275), R = 62;
        V.disc(cx, cy, R, 0x34383a); V.ring(cx, cy, R, R + 3, dk);
        for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.4; V.polyPx([[cx, cy], [cx + Math.cos(a) * 54, cy + Math.sin(a) * 54], [cx + Math.cos(a + 0.9) * 50, cy + Math.sin(a + 0.9) * 50]], 0x54595c); }
        V.disc(cx, cy, 9, 0x6a6e70);
        for (let r = 10; r < R; r += 7) V.ring(cx, cy, r, r + 1.6, 0xc4c0b4);
        for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283; V.line(cx + Math.round(Math.cos(a) * 9), cy + Math.round(Math.sin(a) * 9), cx + Math.round(Math.cos(a) * R), cy + Math.round(Math.sin(a) * R), 0xd0ccc0); }
        V.disc(cx, cy, 6, 0xd4d0c4); V.disc(cx, cy, 3, 0x9a9a92);
        // the service panel: a seam, a brand badge, the rating label, the energy sticker
        V.vline(I(0.56), 3, V.H - 3, dk); V.vline(I(0.56) + 1, 3, V.H - 3, lt);
        V.box(I(0.6), J(0.46), I(0.74), J(0.5), 0x2a52a8); V.text5('KAZE', I(0.67), J(0.498), 0xffffff, { align: 'center' });
        V.box(I(0.6), J(0.2), I(0.74), J(0.38), 0xf2efe6); V.frame(I(0.6), J(0.2), I(0.74), J(0.38), 0x9a9a92); smallPrint(V, I(0.61), J(0.36), 30, 7, 0x6a6a6a, { seed: 2 }); V.box(I(0.61), J(0.21), I(0.73), J(0.235), 0xd8322a);
        V.box(I(0.62), J(0.07), I(0.72), J(0.15), 0xf2c21c); V.text5('E', I(0.67), J(0.14), 0x26221e, { align: 'center' });
        rustEdge(V, I(0.05), I(0.5), 0, 7, 6, 0x9a6a3a);
        for (const [x, y] of [[0.02, 0.02], [0.76, 0.02], [0.02, 0.53], [0.76, 0.53]]) { V.px(I(x), J(y), dk); V.px(I(x) + 1, J(y), lt); }
      });
      K.use((p, n) => (n[2] > 0.9 ? F.map3 : K.uv(body))(p, n), (G) => G.box(x0, y0, z0, x1, y1, z1, { bevel: 0.014 }));
      const sd = K.patch('side', 64, 128, (V) => { V.fill(c); louvres(V, 8, 16, 56, 112, c, 5); }, { rough: 0.6 });
      K.face(sd, '-x', z0 + 0.03, y0 + 0.04, z1 - 0.03, y1 - 0.04, x0 - 0.001);
      K.box(paint(darken(c, 0.06), 0.15), x0 - 0.006, y1 - 0.01, z0 - 0.006, x1 + 0.006, y1 + 0.012, z1 + 0.006, { bevel: 0.006 }); // the lid's lip
      // the valve cover on the right flank, the pipe cover up the wall, the drain hose
      K.box(body, x1 - 0.002, y0 + 0.06, z0 + 0.03, x1 + 0.05, y0 + 0.3, z0 + 0.19, { bevel: 0.012 });
      const iv = plastic(0xe6e0d0, 0.12), dx = B.x1 - 0.05;
      K.tube(iv, [[x1 + 0.03, y0 + 0.2, z0 + 0.05], [dx - 0.03, y0 + 0.22, z0 + 0.02], [dx, y0 + 0.3, z0 - 0.02]], 0.034, 4, { flat: [0.07, 0.06] });
      K.box(iv, dx - 0.042, y0 + 0.26, z0 - 0.06, dx + 0.042, B.y1 - 0.06, z0 + 0.0, { bevel: 0.01 });
      K.box(plastic(0xd8d2c2, 0.1), dx - 0.05, B.y1 - 0.07, z0 - 0.065, dx + 0.05, B.y1, z0 + 0.01, { bevel: 0.014 });
      for (const y of [0.5, 0.74]) K.box(flat(0xc4beae, 0.7), dx - 0.046, y, z0 - 0.06, dx + 0.046, y + 0.012, z0 + 0.004);
      K.tube(flat(0x5a5a58, 0.8), [[x1 + 0.02, y0 + 0.08, z0 + 0.1], [x1 + 0.06, 0.05, z0 + 0.16], [x1 + 0.1, 0.012, z1 + 0.05], [x1 + 0.06, 0.012, B.z1 - 0.012]], 0.011, 5);
    },

    // ------------------------------------------------------------- a 50cc scooter on its stand (0.615 x 1.29 x 1.695), nose to +z
    scooter: (K) => {
      const red = paint(0xc8302c, 0.3), blk = plastic(0x2a2a2c, 0.15), FZ = 0.6, RZ = -0.56, WR = 0.2;
      K.part('wheel_front', [0, WR, FZ], 'x', () => discWheel(K, 0, WR, FZ, WR, 0.09)); K.part('wheel_rear', [0, WR, RZ], 'x', () => discWheel(K, 0, WR, RZ, WR, 0.1));
      // front: forks, the mudguard, the leg shield rising to the handlebar cowl
      K.sym((s) => K.rod(chrome(), [s * 0.065, WR, FZ], [s * 0.05, 0.62, FZ - 0.14], 0.016, 6));
      K.prism(red, K.arc([0, WR, FZ], WR + 0.045, 0.2, 2.6, 6, 'zy').map((p) => [p[2], p[1]]).concat(K.arc([0, WR, FZ], WR + 0.02, 2.6, 0.2, 6, 'zy').map((p) => [p[2], p[1]])), { plane: 'zy', a: -0.07, b: 0.07 });
      K.prism(red, [[0.32, 0.26], [0.42, 0.34], [0.46, 0.7], [0.4, 0.9], [0.3, 0.9], [0.3, 0.3]], { plane: 'zy', a: -0.2, b: 0.2 });
      K.box(blk, -0.2, 0.3, 0.27, 0.2, 0.86, 0.302, { bevel: 0.01 }); // the inner shield and its glove pocket
      K.box(flat(0x1a1a1c, 0.7), -0.13, 0.52, 0.262, 0.13, 0.7, 0.272);
      K.box(red, -0.11, 0.86, 0.25, 0.11, 1.0, 0.45, { bevel: 0.035 }); // the cowl
      K.glow(() => K.cyl(flat(0xf2ecd0), 0, 0.93, 0.435, 0.06, 0.02, 10, { axis: 'z' }));
      K.cyl(chrome(), 0, 0.93, 0.43, 0.068, 0.012, 10, { axis: 'z', cap0: false });
      K.sym((s) => { K.box(flat(0xe8842a, 0.5), s * 0.2 - 0.025, 0.72, 0.44, s * 0.2 + 0.025, 0.76, 0.462, { bevel: 0.008 }); });
      K.sym((s) => {
        K.tube(chrome(), [[s * 0.06, 0.98, 0.33], [s * 0.2, 1.0, 0.31], [s * 0.29, 1.01, 0.27]], 0.012, 5);
        K.cyl(rubber(0x26262a), s * 0.2, 1.003, 0.303, 0.018, 0.1, 6, { axis: 'x', a0: 0 });
        K.rod(chrome(), [s * 0.17, 1.0, 0.31], [s * 0.24, 1.2, 0.3], 0.006, 4);
        K.box(blk, s * 0.24 - 0.05, 1.19, 0.292, s * 0.24 + 0.05, 1.27, 0.31, { bevel: 0.012 }); K.box(flat(0xa9c0cc, 0.2), s * 0.24 - 0.04, 1.2, 0.29, s * 0.24 + 0.04, 1.26, 0.2915);
      });
      // the floor, the body under the seat, the seat, the rear rack with a crate strapped on
      K.box(blk, -0.17, 0.25, -0.16, 0.17, 0.31, 0.32, { bevel: 0.015 });
      K.prism(red, [[-0.14, 0.31], [-0.1, 0.62], [-0.2, 0.7], [-0.78, 0.72], [-0.84, 0.6], [-0.78, 0.4], [-0.3, 0.3]], { plane: 'zy', a: -0.17, b: 0.17 });
      K.box(red, -0.175, 0.44, -0.74, 0.175, 0.56, -0.2, { bevel: 0.02 });
      K.box(matte(0x3a2c26, 0.1), -0.15, 0.7, -0.6, 0.15, 0.79, -0.12, { bevel: 0.03 });
      K.box(flat(0x54403a, 0.9), -0.152, 0.74, -0.38, 0.152, 0.748, -0.37);
      K.tube(chrome(), [[-0.13, 0.74, -0.62], [-0.13, 0.76, -0.84], [0.13, 0.76, -0.84], [0.13, 0.74, -0.62]], 0.01, 5);
      K.box(plastic(0xe8e2d0, 0.1), -0.15, 0.775, -0.83, 0.15, 0.95, -0.63, { bevel: 0.012 }); K.box(plastic(0xd8d2c0, 0.1), -0.156, 0.93, -0.836, 0.156, 0.96, -0.624, { bevel: 0.008 });
      const pl = K.patch('plate', 40, 24, (V) => { framed(V, 0xf2efe6, 0x8a8a80); kana(K, V, '杜王市', 20, 22, 0x2a52a8, { size: 8, align: 'center' }); V.text5('38-21', 20, 11, 0x2a52a8, { align: 'center' }); }, { rough: 0.5 });
      K.box(flat(0xf2efe6, 0.5), -0.07, 0.4, -0.853, 0.07, 0.49, -0.846); K.face(pl, '-z', -0.07, 0.4, 0.07, 0.49, -0.8535);
      K.glow(() => K.box(flat(0xd8322a), -0.06, 0.6, -0.848, 0.06, 0.66, -0.83, { bevel: 0.01 }));
      K.prism(red, K.arc([0, WR, RZ], WR + 0.05, 0.9, 3.0, 5, 'zy').map((p) => [p[2], p[1]]).concat(K.arc([0, WR, RZ], WR + 0.025, 3.0, 0.9, 5, 'zy').map((p) => [p[2], p[1]])), { plane: 'zy', a: -0.075, b: 0.075 });
      // the engine, exhaust, the centre stand
      K.box(metal(0x7e8284), -0.11, 0.14, -0.5, 0.06, 0.3, -0.2, { bevel: 0.02 });
      K.cyl(metal(0x9a9ea2), 0.1, 0.2, -0.72, 0.04, 0.4, 8, { axis: 'z', bevel: 0.01 });
      K.sym((s) => K.rod(metal(0x6e7476), [s * 0.06, 0.25, -0.2], [s * 0.15, 0.0, -0.3], 0.012, 4)); K.rod(metal(0x6e7476), [-0.16, 0.012, -0.3], [0.16, 0.012, -0.3], 0.012, 4);
    },

    // ------------------------------------------------------------- the mamachari (0.612 x 1.188 x 1.836), nose to +z; the rider's saddle at 1.03
    mamachari: (K) => mamachari(K),

    // ------------------------------------------------------------- the garbage station: pad, crow net, the rules board (1.54 x 1.74 x 1.12)
    garbage_station: (K, B) => station(K, B, true),

    // ------------------------------------------------------------- the can / PET recycling cage and a cardboard bundle (1.32 x 0.88 x 0.66)
    recycle_cage: (K, B) => {
      const g = 0x2f7a4a, fr = paint(g, 0.25), x0 = B.x0, x1 = x0 + 0.86, z0 = -0.33, z1 = 0.33, H = 0.86, mesh = meshTex(K, g, 8, { n: 4 });
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) K.cyl(fr, x + (x === x0 ? 0.015 : -0.015), 0, z + (z === z0 ? 0.015 : -0.015), 0.015, H, 6);
      for (const y of [0.03, H - 0.015]) K.tube(fr, [[x0 + 0.015, y, z0 + 0.015], [x1 - 0.015, y, z0 + 0.015], [x1 - 0.015, y, z1 - 0.015], [x0 + 0.015, y, z1 - 0.015]], 0.013, 4, { closed: true });
      meshPanel(K, mesh, '+z', x0 + 0.02, 0.04, x1 - 0.02, H - 0.02, z1 - 0.015, 0.21); meshPanel(K, mesh, '+z', x0 + 0.02, 0.04, x1 - 0.02, H - 0.02, z0 + 0.015, 0.21);
      meshPanel(K, mesh, '+x', z0 + 0.02, 0.04, z1 - 0.02, H - 0.02, x0 + 0.015, 0.21); meshPanel(K, mesh, '+x', z0 + 0.02, 0.04, z1 - 0.02, H - 0.02, x1 - 0.015, 0.21);
      K.box(fr, (x0 + x1) / 2 - 0.012, 0.04, z1 - 0.027, (x0 + x1) / 2 + 0.012, H - 0.02, z1 - 0.004); // the divider between the two halves
      // inside: a heap of cans one side, bottles the other (seen through the mesh)
      const xm = (x0 + x1) / 2;
      blob(K, flat(0xa8aeb2, 0.4), (x0 + xm) / 2, 0.2, 0, 0.19, 0.22, 0.28, { fine: true, jit: 0.2, seed: 4, flatY: -0.7 });
      for (let k = 0; k < 10; k++) K.box(flat([0xc8282a, 0x2f8a5a, 0x3a2a22, 0xe8c040, 0x2a52a8][k % 5], 0.5), x0 + 0.06 + (k * 0.37 % 1) * 0.28, 0.1 + (k * 0.61 % 1) * 0.3, z1 - 0.1 - (k % 3) * 0.04, x0 + 0.12 + (k * 0.37 % 1) * 0.28, 0.16 + (k * 0.61 % 1) * 0.3, z1 - 0.04 - (k % 3) * 0.04, { bevel: 0.01, edge: null });
      K.glass(() => blob(K, K.tint(0xd4e8e8, 120), (xm + x1) / 2, 0.24, 0, 0.19, 0.26, 0.28, { fine: true, jit: 0.2, seed: 9, flatY: -0.7 }));
      for (let k = 0; k < 7; k++) K.cyl(plastic([0x2a5ab8, 0xe8e4d8, 0x3a8a4a][k % 3]), xm + 0.07 + (k * 0.43 % 1) * 0.3, 0.12 + (k * 0.29 % 1) * 0.36, z1 - 0.07 - (k % 2) * 0.05, 0.014, 0.014, 6);
      // the signs: カン on red, PET on blue
      const sg = (key, bg, x) => {
        const V = K.patch(key, 56, 36, (V) => { framed(V, 0xf2efe6, bg, bg); if (key === 'kan') kana(K, V, 'カン', 28, 34, bg, { size: 16, s: 2, align: 'center' }); else V.text5('PET', 28, 27, bg, { align: 'center', s: 3 }); }, { rough: 0.6 });
        K.box(flat(0xf2efe6, 0.6), x - 0.17, 0.5, z1 - 0.004, x + 0.17, 0.72, z1 + 0.004); K.face(V, '+z', x - 0.17, 0.5, x + 0.17, 0.72, z1 + 0.0052);
      };
      sg('kan', 0xc8282a, (x0 + xm) / 2); sg('pet', 0x2a52a8, (xm + x1) / 2);
      // beside it: flattened cartons tied with string, put out for the paper collection
      const bx0 = x1 + 0.06, bx1 = B.x1 - 0.01;
      stack(K, 0xc49a62, bx0, 0, -0.2, bx1, 0.3, 0.16, 7, { seed: 3, jit: 0.008 });
      tied(K, bx0 - 0.008, 0, -0.208, bx1 + 0.008, 0.3, 0.168);
    },

    // ------------------------------------------------------------- a house gate in its block wall (3.1 x 2.1 x 1.1)
    gate_house: (K, B) => {
      const st = stone(0xb4ac9c), zf = B.z1 - 0.12, bw = 0.375, bh = 0.19;
      const wall = (xa, xb) => {
        K.box(stone(0x9c988e), xa, 0, zf - 0.09, xb, 0.08, zf + 0.09, { bevel: 0.01 });
        for (let r = 0; r < 5; r++) for (let x = xa - (r % 2 ? bw / 2 : 0); x < xb - 0.01; x += bw) { const a = Math.max(xa, x) + 0.004, b = Math.min(xb, x + bw) - 0.004, k = Math.round(x * 7 + r * 3); if (b - a > 0.02) K.box(stone(mix(0xaeaaa0, k % 4 === 0 ? 0x8f8b82 : 0xaeaaa0, 0.5), 0.1), a, 0.084 + r * bh, zf - 0.075, b, 0.076 + (r + 1) * bh, zf + 0.075, { bevel: 0.006 }); }
        K.box(flat(0x77736b, 0.95), xa + 0.01, 0.08, zf - 0.06, xb - 0.01, 0.08 + 5 * bh, zf + 0.06);
        K.box(stone(0xa29e94), xa, 0.08 + 5 * bh, zf - 0.1, xb, 1.1, zf + 0.1, { bevel: 0.012 });
        dirtBox(K, 0x9c988e, xa, zf - 0.09, xb, zf + 0.09, 0, 0.05, { sides: ['+z'] });
      };
      wall(B.x0, -0.82); wall(0.82, B.x1);
      // the gate posts: stone-faced, a cap each; the nameplate and the post slot on one, a lamp on the other
      for (const s of [-1, 1]) {
        const x = s * 0.66;
        K.bx(st, x, 0, zf, 0.32, 1.42, 0.32, { bevel: 0.012 });
        for (let r = 1; r < 6; r++) K.box(flat(0x8f887a, 0.95), x - 0.161, r * 0.235, zf - 0.161, x + 0.161, r * 0.235 + 0.008, zf + 0.161);
        K.bx(stone(0x9a9488), x, 1.42, zf, 0.38, 0.07, 0.38, { bevel: 0.02 });
        dirtBox(K, 0xb4ac9c, x - 0.16, zf - 0.16, x + 0.16, zf + 0.16, 0, 0.05);
      }
      const np = K.patch('name', 28, 56, (V) => { framed(V, 0xe8e2d0, 0x6a6258); kana(K, V, '鈴木', 6, 50, 0x2a2622, { size: 16, vert: true }); }, { rough: 0.6 });
      K.box(flat(0xe8e2d0, 0.6), -0.72, 1.02, zf + 0.16, -0.6, 1.26, zf + 0.17); K.face(np, '+z', -0.72, 1.02, -0.6, 1.26, zf + 0.1712);
      K.box(paint(0xc8302a), -0.76, 0.62, zf + 0.16, -0.56, 0.86, zf + 0.26, { bevel: 0.012 }); K.box(flat(0x1a1210, 0.8), -0.73, 0.78, zf + 0.26, -0.59, 0.8, zf + 0.262);
      const tm = K.patch('yubin', 24, 12, (V) => { V.fill(0xc8302a); kana(K, V, '〒', 12, 13, 0xf2efe6, { size: 16, align: 'center' }); }, { rough: 0.5 });
      K.face(tm, '+z', -0.71, 0.64, -0.61, 0.69, zf + 0.2612);
      // the lamp on the right post: an iron box lantern
      K.bx(metal(0x3a3a3e, 0.2), 0.66, 1.49, zf, 0.16, 0.03, 0.16); K.glow(() => K.bx(flat(0xf6e2a8), 0.66, 1.52, zf, 0.12, 0.16, 0.12));
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(metal(0x3a3a3e, 0.2), 0.66 + dx * 0.065 - 0.008, 1.52, zf + dz * 0.065 - 0.008, 0.66 + dx * 0.065 + 0.008, 1.68, zf + dz * 0.065 + 0.008);
      K.prism(metal(0x3a3a3e, 0.2), [[0.55, 1.68], [0.77, 1.68], [0.69, 1.76], [0.63, 1.76]], { plane: 'xy', a: zf - 0.11, b: zf + 0.11 });
      // the iron gate: two leaves of bars
      const iron = metal(0x34343a, 0.25);
      for (const s of [-1, 1]) {
        const xa = s * 0.5, xb = s * 0.02;
        K.box(iron, Math.min(xa, xb), 0.12, zf - 0.015, Math.max(xa, xb), 0.16, zf + 0.015); K.box(iron, Math.min(xa, xb), 1.12, zf - 0.015, Math.max(xa, xb), 1.16, zf + 0.015);
        for (let k = 0; k <= 5; k++) { const x = xa + (xb - xa) * (k / 5); K.box(iron, x - 0.01, 0.12, zf - 0.01, x + 0.01, 1.22 + (k === 0 ? 0.06 : 0), zf + 0.01); }
        K.torus(iron, (xa + xb) / 2, 0.66, zf, 0.1, 0.01, 8, 4, { axis: 'z' });
      }
      K.box(flat(0xc8a04a, 0.4), -0.03, 0.62, zf + 0.015, 0.03, 0.7, zf + 0.03);
      // inside the gate: a clipped shrub and a stone step
      K.box(stone(0x9c988e), -0.5, 0, zf - 0.5, 0.5, 0.06, zf - 0.1, { bevel: 0.01 });
      bush(K, 0x3d7c3c, 0.95, 0.9, zf - 0.75, 1.5, 1.75, zf - 0.25, { n: 3, seed: 8 });
      K.rod(flat(0x5a4632, 0.9), [1.22, 0, zf - 0.5], [1.22, 1.0, zf - 0.5], 0.03, 5);
    },

    // ------------------------------------------------------------- laundry poles with the washing out (2.62 x 1.82 x 0.64)
    laundry_pole: (K) => {
      const stl = paint(0x7a8a98, 0.25);
      for (const s of [-1, 1]) {
        const x = s * 1.2;
        K.cyl(stone(0x9c988e), x, 0, 0, 0.14, 0.09, 8, { bevel: 0.02 });
        K.cyl(stl, x, 0.09, 0, 0.022, 1.7, 6);
        for (const [y, z] of [[1.74, 0.16], [1.58, -0.16]]) { K.rod(stl, [x, y - 0.1, 0], [x, y - 0.02, z], 0.014, 5); K.torus(stl, x, y, z, 0.03, 0.008, 6, 4, { axis: 'x', arc: 4.2, a0: -0.5 }); }
      }
      K.cyl(paint(0x3a6ab8, 0.2), -1.3, 1.74, 0.16, 0.016, 2.6, 6, { axis: 'x' }); K.cyl(metal(0xb8bec2), -1.3, 1.58, -0.16, 0.016, 2.6, 6, { axis: 'x' });
      for (const [x, z, y] of [[-1.31, 0.16, 1.74], [1.3, 0.16, 1.74]]) K.cyl(plastic(0xe8e4d8), x - 0.01, y, z, 0.02, 0.03, 6, { axis: 'x' });
      // on the front pole: a T-shirt, a striped towel, a work shirt; on the back one: socks on a pinch hanger
      const cloth = (x0, x1, y1, h, z, c, o = {}) => { K.box(fabric(c), x0, y1 - h, z - 0.006, x1, y1, z + 0.006); if (o.stripe) for (let k = 0; k < 5; k++) K.box(fabric(o.stripe), x0 - 0.001, y1 - h + h * (k / 5) + 0.02, z - 0.0075, x1 + 0.001, y1 - h + h * (k / 5) + 0.02 + h * 0.08, z + 0.0075); };
      const tee = (x, c, w = 0.4) => { cloth(x - w / 2, x + w / 2, 1.72, 0.5, 0.16, c); K.sym((s) => K.at([x + s * w / 2, 1.7, 0.16], () => K.box(fabric(c), 0, -0.2, -0.006, 0.14, 0, 0.006), { rz: s > 0 ? -0.5 : Math.PI + 0.5 })); K.box(fabric(darken(c, 0.15)), x - 0.07, 1.7, 0.166, x + 0.07, 1.724, 0.1675); };
      tee(-0.75, 0xf2efe6); cloth(-0.3, 0.0, 1.725, 0.62, 0.16, 0xf2efe6, { stripe: 0x3a6ab8 }); tee(0.5, 0x5a9ad8, 0.44); cloth(0.9, 1.08, 1.725, 0.3, 0.16, 0xf4b0c4);
      for (const x of [-0.75, -0.15, 0.5, 0.99]) K.box(plastic(0xf2c21c), x - 0.012, 1.72, 0.15, x + 0.012, 1.775, 0.17);
      K.box(plastic(0x8ac8e8), -0.5, 1.44, -0.3, 0.0, 1.455, -0.02); K.rod(metal(0xb8bec2), [-0.25, 1.455, -0.16], [-0.25, 1.58, -0.16], 0.005, 4);
      for (let k = 0; k < 5; k++) { const x = -0.46 + k * 0.105, c = [0xf2efe6, 0x3a3a3e, 0xf2efe6, 0xd8322a, 0x3a3a3e][k]; K.box(fabric(c), x, 1.2, -0.3 + (k % 2) * 0.24, x + 0.06, 1.44, -0.29 + (k % 2) * 0.24); K.box(fabric(c), x, 1.2, -0.3 + (k % 2) * 0.24, x + 0.06, 1.25, -0.24 + (k % 2) * 0.24); }
      cloth(0.35, 0.95, 1.565, 0.75, -0.16, 0xe8dcc0, { stripe: 0xd89a4a });
    },

    // ------------------------------------------------------------- the roadside Jizō in its little shrine (1.125 x 1.305 x 0.87)
    jizo_shrine: (K, B) => {
      const wd = 0x6a4a34, W = wood(wd), zf = 0.28, zb = -0.36;
      K.box(stone(0xa39f96), -0.5, 0, -0.42, 0.5, 0.14, 0.4, { bevel: 0.02 }); dirtBox(K, 0xa39f96, -0.5, -0.42, 0.5, 0.4, 0, 0.05);
      K.box(stone(0x8f8b82), -0.44, 0.14, -0.38, 0.44, 0.19, 0.34, { bevel: 0.01 });
      for (const [x, z] of [[-0.4, zf], [0.4, zf], [-0.4, zb], [0.4, zb]]) plank(K, wd, x - 0.03, 0.19, z - 0.03, x + 0.03, 0.9, z + 0.03, { bevel: 0.004 });
      plank(K, darken(wd, 0.1), -0.4, 0.19, zb - 0.01, 0.4, 0.9, zb + 0.01, { axis: 'y' }); // back wall
      for (const s of [-1, 1]) { for (let k = 0; k < 6; k++) K.box(W, s * 0.4 - 0.01, 0.4, zb + 0.07 + k * 0.1, s * 0.4 + 0.01, 0.86, zb + 0.095 + k * 0.1); plank(K, wd, s * 0.4 - 0.015, 0.19, zb, s * 0.4 + 0.015, 0.4, zf, { v: 1 }); plank(K, wd, s * 0.4 - 0.02, 0.84, zb, s * 0.4 + 0.02, 0.9, zf, { v: 2 }); }
      plank(K, wd, -0.46, 0.86, zf - 0.03, 0.46, 0.92, zf + 0.03, { bevel: 0.004 });
      // the roof: tiled gables with an upswept ridge, moss on the weather side
      const tile = 0x4a5258, rf = (s) => K.prism(stone(tile, 0.14), [[0, 1.2], [s * 0.6, 0.93], [s * 0.6, 0.89], [0, 1.14]], { plane: 'xy', a: -0.47, b: 0.45 });
      rf(1); rf(-1);
      for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const t = (k + 0.5) / 6, x = s * 0.6 * t, y = 1.2 - 0.27 * t; K.box(flat(darken(tile, 0.22), 0.9), x - 0.012, y + 0.002, -0.47, x + 0.012, y + 0.016, 0.45); }
      K.box(stone(0x3e464c), -0.05, 1.18, -0.49, 0.05, 1.25, 0.47, { bevel: 0.015 }); for (const z of [-0.49, 0.47]) K.box(stone(0x3e464c), -0.07, 1.2, z - 0.03, 0.07, B.y1, z + 0.03, { bevel: 0.015 });
      for (const [x, z, s] of [[0.3, 0.1, 0.1], [0.42, -0.2, 0.08], [0.2, -0.3, 0.06], [-0.35, 0.25, 0.05]]) blob(K, leafy(K, 0x5c8a44), x, 1.2 - 0.27 * Math.abs(x) / 0.6 + 0.012, z, s, 0.012, s * 0.8, { seed: Math.round(x * 91), jit: 0.25 });
      // two Jizō: round heads, folded hands, red bibs and knitted caps
      const jizo = (x, s) => {
        const g = stone(0xa8a69c, 0.1);
        K.lathe(g, [x, 0.19, -0.1], [[0, 0], [0.085 * s, 0], [0.09 * s, 0.04], [0.075 * s, 0.26 * s], [0.045 * s, 0.31 * s]], 8);
        blob(K, g, x, 0.19 + 0.38 * s, -0.1, 0.07 * s, 0.075 * s, 0.07 * s, { fine: true, jit: 0, seed: 1 });
        K.lathe(fabric(0xc8302a), [x, 0.19 + 0.41 * s, -0.1], [[0.072 * s, 0], [0.074 * s, 0.03 * s], [0.05 * s, 0.065 * s], [0, 0.075 * s]], 8);
        K.prism(fabric(0xc8302a), [[x - 0.07 * s, 0.19 + 0.31 * s], [x + 0.07 * s, 0.19 + 0.31 * s], [x + 0.05 * s, 0.19 + 0.18 * s], [x, 0.19 + 0.15 * s], [x - 0.05 * s, 0.19 + 0.18 * s]], { plane: 'xy', a: -0.1 + 0.07 * s, b: -0.1 + 0.082 * s });
        const fc = K.patch('jizo', 16, 10, (V) => { V.fill(0xa8a69c); V.hline(3, 5, 6, 0x5a5850); V.hline(10, 12, 6, 0x5a5850); V.hline(6, 9, 2, 0x5a5850); V.px(5, 3, 0x5a5850); V.px(10, 3, 0x5a5850); }, { shared: true });
        K.face(fc, '+z', x - 0.04 * s, 0.19 + 0.34 * s, x + 0.04 * s, 0.19 + 0.4 * s, -0.1 + 0.067 * s);
      };
      jizo(-0.14, 1); jizo(0.16, 0.82);
      // offerings: flowers in bamboo vases, a cup of water, coins on the offering box, two pinwheels
      for (const x of [-0.32, 0.33]) { K.cyl(flat(0x6f8a4a, 0.7), x, 0.19, 0.12, 0.022, 0.12, 6); for (let k = 0; k < 3; k++) { K.rod(flat(0x4f8f45, 0.8), [x, 0.3, 0.12], [x + (k - 1) * 0.03, 0.42 + k * 0.02, 0.12], 0.004, 3); flower(K, flat([0xf2c21c, 0xf2efe6, 0xe86aa8][k], 0.8), [x + (k - 1) * 0.03, 0.43 + k * 0.02, 0.125], 0.024, { dir: [0, 0.6, 1], eye: flat(0xf29a2a) }); } }
      K.cyl(flat(0xe8e4d8, 0.4), 0.02, 0.19, 0.16, 0.022, 0.04, 6);
      plank(K, 0x5a3a28, -0.12, 0.19, 0.26, 0.12, 0.3, 0.38, { bevel: 0.006 }); K.box(flat(0x1a1210, 0.9), -0.07, 0.3, 0.31, 0.07, 0.302, 0.33);
      for (const [x, c] of [[-0.42, 0xe84a6a], [0.43, 0x4a9ae8]]) { K.rod(flat(0xc8b878, 0.8), [x, 0.14, 0.36], [x, 0.56, 0.36], 0.005, 4); for (let k = 0; k < 4; k++) K.at([x, 0.56, 0.368], () => K.tri(flat(k % 2 ? c : 0xf2efe6, 0.6), [0, 0, 0], [0.05, 0.012, 0], [0.03, 0.045, 0.01], [0, 0, 1]), { rz: k * 1.571 }); }
      // paper lanterns under the eaves
      for (const x of [-0.3, 0.3]) { K.lathe(flat(0xd8463a, 0.7), [x, 0.74, zf + 0.02], [[0, 0], [0.03, 0.01], [0.042, 0.05], [0.03, 0.09], [0, 0.1]], 6); K.cyl(flat(0x26221e, 0.6), x, 0.84, zf + 0.02, 0.016, 0.012, 6); }
    },

    // ------------------------------------------------------------- a row of potted plants along a wall (1.764 x 1.128 x 0.312)
    plant_pots: (K, B) => {
      const x0 = B.x0;
      // a morning glory trained up a net at the left end
      let ys = planter(K, plastic(0x8a5a3a, 0.15), x0, 0, -0.1, x0 + 0.34, 0.16, 0.12, { t: 0.012 });
      for (const x of [x0 + 0.04, x0 + 0.3]) K.rod(flat(0x4f8a46, 0.7), [x, ys, 0], [x, B.y1 - 0.01, 0], 0.007, 4);
      for (let k = 0; k < 5; k++) K.rod(flat(0x4f8a46, 0.7), [x0 + 0.04, ys + 0.14 + k * 0.19, 0], [x0 + 0.3, ys + 0.14 + k * 0.19, 0], 0.004, 3);
      const yv = ys;
      leaves(K, (t, F) => { for (let k = 0; k < 3; k++) F.vine(t, x0 + 0.07 + k * 0.1, yv + 0.04, B.y1 - 0.06 - (k % 2) * 0.12, 0, 31 + k * 7, { card: 0.12 }); });
      for (let k = 0; k < 6; k++) flower(K, flat([0x5a6ad8, 0xe86aa8, 0x8a5ad8][k % 3], 0.8), [x0 + 0.08 + ((k * 0.43) % 1) * 0.2, ys + 0.2 + ((k * 0.29) % 1) * 0.7, 0.04], 0.034, { dir: [0, 0.3, 1], eye: flat(0xffffff) });
      // then pots of every sort: a tall sansevieria, geraniums, a trough of pansies, a jade plant, a herb pot, a green watering can
      let x = x0 + 0.46;
      ys = pot(K, x, 0, 0, 0.075, 0.13, { c: matte(0xe6e2d6, 0.15) });
      for (let k = 0; k < 6; k++) { const a = k * 1.05; blade(K, flat(k % 2 ? 0x4f8a5a : 0x7aa86a, 0.85), [x + Math.cos(a) * 0.02, ys, Math.sin(a) * 0.02], [x + Math.cos(a) * 0.05, ys + 0.3 - (k % 3) * 0.05, Math.sin(a) * 0.05], 0.036); }
      x += 0.2; ys = pot(K, x, 0, 0.01, 0.09, 0.15, { saucer: true });
      { const cx = x, cy = ys; leaves(K, (t, F) => F.crown(t, cx, cy + 0.07, 0.01, 0.11, 0.08, 0.1, { kind: 'leaf', flat: -0.45, card: 0.13, density: 2.6, seed: 4 })); }
      for (const [dx, dz] of [[-0.05, 0.05], [0.04, 0.07], [0, -0.02], [0.07, 0.0]]) { for (let p = 0; p < 4; p++) { const a = p * 1.571 + dx * 9; K.rod(flat(0x4a7a34, 0.8), [x + dx * 0.6, ys + 0.1, dz * 0.6], [x + dx + Math.cos(a) * 0.012, ys + 0.17, dz + 0.01 + Math.sin(a) * 0.012], 0.0025, 3); flower(K, flat(p % 2 ? 0xe8443a : 0xd8382e, 0.8), [x + dx + Math.cos(a) * 0.014, ys + 0.172 + (p % 2) * 0.006, dz + 0.01 + Math.sin(a) * 0.014], 0.017, { dir: [Math.cos(a), 1.4, Math.sin(a) + 0.3], eye: flat(0xf6d04a) }); } }
      x += 0.16; ys = planter(K, plastic(0xe8e4d8, 0.1), x, 0, -0.08, x + 0.36, 0.13, 0.1, { t: 0.012 });
      for (let k = 0; k < 5; k++) { const px = x + 0.05 + k * 0.065; leafRing(K, flat(LEAF2, 0.9), px, ys, 0.01, 4, 0.035, 0.03, { seed: k, rise: 0.5 }); flower(K, flat([0xf2c21c, 0x8a5ad8, 0xf2efe6, 0xe8842a, 0x8a5ad8][k], 0.8), [px, ys + 0.045, 0.02], 0.03, { dir: [0, 1, 0.5], eye: flat(0x3a2a4a) }); }
      x += 0.5; ys = pot(K, x, 0, 0, 0.07, 0.11, { c: matte(0x3a6aa8, 0.25) });
      K.rod(flat(0x7a6a4a, 0.9), [x, ys, 0], [x, ys + 0.16, 0], 0.012, 5); for (let k = 0; k < 9; k++) { const a = k * 2.4, r = 0.03 + (k % 3) * 0.012, y = ys + 0.09 + k * 0.012; K.rod(flat(0x7a6a4a, 0.9), [x, y - 0.02, 0], [x + Math.cos(a) * r * 0.7, y, Math.sin(a) * r * 0.7], 0.004, 4); K.at([x + Math.cos(a) * r, y + 0.004, Math.sin(a) * r], () => K.ball(plastic(k % 2 ? 0x5a9a5a : 0x4a8a50, 0.25), 0, 0, 0, 0.022, 0.009, 0.014, 8, 3), { ry: -a, rz: 0.3 }); }
      x += 0.17; ys = pot(K, x, 0, 0.02, 0.06, 0.09);
      { const cx = x, cy = ys; leaves(K, (t, F) => F.shrub(t, cx, cy - 0.01, 0.02, 0.075, 'small', { seed: 6, card: 0.11 })); }
      // the watering can at the end
      x = B.x1 - 0.1; const gc = plastic(0x3a8a4a, 0.2);
      K.cyl(gc, x, 0, 0, 0.065, 0.14, 8, { bevel: 0.008 }); K.tube(gc, [[x - 0.06, 0.05, 0], [x - 0.13, 0.13, 0], [x - 0.16, 0.16, 0]], 0.012, 5); K.cyl(gc, x - 0.175, 0.15, 0, 0.022, 0.02, 6, { axis: 'x' });
      K.tube(gc, [[x + 0.05, 0.12, 0], [x + 0.1, 0.14, 0], [x + 0.1, 0.06, 0], [x + 0.06, 0.03, 0]], 0.009, 4);
    },

    pigeon: (K) => pigeon(K, 0, 0, 0),
    pigeon_fly: (K) => {
      K.at([0, -0.03, 0], () => pigeon(K, 0, 0, 0, { fly: true }));
      // wings spread: three stepped panels a side, dark bars on the secondaries
      K.sym((s) => {
        const P = (x, y, z) => [s * x, y, z];
        K.sheet(flat(0x9aa0ac, 0.85), P(0.04, 0.07, 0.05), P(0.2, 0.1, 0.04), P(0.2, 0.09, -0.09), P(0.04, 0.06, -0.07), { back: flat(0xb4b8c0, 0.85) });
        K.sheet(flat(0x8a909c, 0.85), P(0.2, 0.1, 0.04), P(0.34, 0.085, -0.0), P(0.33, 0.075, -0.1), P(0.2, 0.09, -0.09), { back: flat(0xa8acb6, 0.85) });
        K.sheet(flat(0x5a5e68, 0.85), P(0.1, 0.082, -0.035), P(0.3, 0.092, -0.05), P(0.3, 0.09, -0.075), P(0.1, 0.08, -0.06));
      });
      K.sheet(flat(0x5a5e68, 0.85), [-0.05, 0.04, -0.12], [0.05, 0.04, -0.12], [0.07, 0.035, -0.185], [-0.07, 0.035, -0.185]);
    },
    stray_cat: (K) => cat(K, 'stand'),
    stray_cat_sit: (K) => cat(K, 'sit'),
    stray_cat_held: (K) => cat(K, 'held'),

    // ------------------------------------------------------------- 防火用水: three red fire buckets on a steel stand (0.6 x 0.85 x 0.27)
    fire_buckets: (K) => {
      const steel = paint(0x5c6a60, 0.25), red = enamel(0xc8302a), sq = 0.022;
      for (const x of [-0.275, 0.275]) for (const z of [-0.1, 0.1]) K.bx(steel, x, 0, z, sq, 0.43, sq, { bevel: 0.003 });
      for (const z of [-0.1, 0.1]) { K.bx(steel, 0, 0.405, z, 0.6, 0.025, 0.022, { bevel: 0.003 }); K.bx(steel, 0, 0.1, z, 0.6, 0.02, 0.018, { bevel: 0.003 }); }
      for (const x of [-0.275, 0.275]) { K.bx(steel, x, 0.405, 0, 0.022, 0.025, 0.24, { bevel: 0.003 }); K.bx(steel, x, 0.1, 0, 0.018, 0.02, 0.24, { bevel: 0.003 }); }
      K.bx(steel, 0, 0.428, 0, 0.6, 0.008, 0.25);
      for (const x of [-0.275, 0.275]) for (const z of [-0.1, 0.1]) K.bx(rubber(0x2a2a2a), x, 0, z, 0.034, 0.012, 0.034);
      // the label: 消火用 in white on the bucket's red
      const lab = K.patch('fireBucketLabel', 64, 24, (V) => { V.fill(0xc8302a); kana(K, V, '消火用', 32, 20, 0xfbf8f0, { size: 16, align: 'center' }); }, { shared: true, rough: 0.6 });
      const r = 0.128, h = 0.21, rb = r * 0.76, lr = (y) => rb + (r - rb) * (y / h);
      for (const x of [-0.148, 0.148]) {
        bucket(K, x, 0.436, 0, r, h, { c: red, n: 12, taper: 0.76, handle: 'down', water: flat(0x6a8a94, 0.2) });
        K.wrap(lab, x, 0.436 + 0.06, 0.436 + 0.15, 0, lr(0.06), { r1: lr(0.15), n: 12, arc: 1.5, lift: 0.002 });
      }
      // the third bucket upside down across the other two, its bail hanging
      K.at([0, 0.436 + h + 0.004 + h, 0], () => bucket(K, 0, 0, 0, r, h, { c: red, n: 12, taper: 0.76, handle: 'down' }), { rx: Math.PI });
      K.wrap(lab, 0, 0.436 + h + 0.06, 0.436 + h + 0.15, 0, lr(h - 0.06), { r1: lr(h - 0.15), n: 12, arc: 1.5, lift: 0.002, sub: [1, 1, 0, 0] });
    },

    // ------------------------------------------------------------- 灰皿スタンド: the tobacco shop's standing ashtray (0.27 x 0.67)
    mk_stand_ashtray: { box: [-0.135, 0, -0.135, 0.135, 0.675, 0.135], build: (K) => {
      const red = enamel(0xc0302c), steel = metal(0xc8ccd0, 0.3), dark = metal(0x5a5e62, 0.2);
      K.lathe(dark, [0, 0, 0], [[0, 0.004], [0.128, 0.004], [0.135, 0.012], [0.13, 0.026], [0.09, 0.034]], 12);
      K.lathe(red, [0, 0, 0], [[0.09, 0.034], [0.092, 0.05], [0.092, 0.58], [0.09, 0.6]], 12);
      for (const y of [0.16, 0.42]) K.lathe(steel, [0, 0, 0], [[0.093, y], [0.096, y + 0.006], [0.096, y + 0.02], [0.093, y + 0.026]], 12);
      // the bowl: a pressed steel dish with a rolled rim, sand in it and a few butts
      K.lathe(steel, [0, 0, 0], [[0.09, 0.6], [0.11, 0.62], [0.124, 0.655], [0.128, 0.665], [0.122, 0.668], [0.11, 0.66], [0.06, 0.648], [0, 0.646]], 12);
      K.lathe(flat(0x8a8274, 0.98), [0, 0, 0], [[0, 0.652], [0.105, 0.652]], 12, { flip: true });
      for (const [x, z, a, c] of [[0.03, 0.02, 0.4, 0xf4f0e4], [-0.04, 0.03, 2.1, 0xd8a868], [0.01, -0.05, 4.0, 0xf4f0e4], [-0.05, -0.02, 5.2, 0xf4f0e4]]) {
        K.rod(flat(c, 0.9), [x, 0.656, z], [x + Math.cos(a) * 0.035, 0.66, z + Math.sin(a) * 0.035], 0.0045, 6);
      }
      // a sticker on the column: no smoking while walking (an original design)
      const st = K.patch('ashSticker', 40, 24, (V) => { V.fill(0xfbf8f0); kana(K, V, '吸殻入', 20, 20, 0x2a2a2a, { size: 12, align: 'center' }); V.box(0, 0, 40, 3, 0xc0302c); }, { shared: true, rough: 0.5 });
      K.wrap(st, 0, 0.44, 0.54, 0, 0.092, { n: 12, arc: 1.3, lift: 0.002 });
    } },
  },
};

/** A mamachari, nose to +z, wheels on y = 0. o: { frame, case: chain case colour, bag: false to leave the shopping out } */
export function mamachari(K, o = {}) {
      const fr = paint(o.frame ?? 0x9cc8dc, 0.3), ch = chrome(0xd0d6dc), stl = metal(0xa8aeb4), cream = paint(0xeee8d6, 0.15), RZ = -0.552, FZ = 0.564, WY = 0.331, WR = 0.331;
      K.part('wheel_rear', [0, WY, RZ], 'x', () => spokeWheel(K, 0, WY, RZ, WR, 0.017, { spokes: 12 })); K.part('wheel_front', [0, WY, FZ], 'x', () => spokeWheel(K, 0, WY, FZ, WR, 0.017, { spokes: 12, turn: 0.5 }));
      const fender = (cz, a0, a1) => K.tube(cream, K.arc([0, WY, cz], WR + 0.022, a0, a1, 8, 'zy'), 0.01, 4, { flat: [0.06, 0.008], up: [1, 0, 0] });
      fender(FZ, 0.15, 2.5); fender(RZ, 0.7, 3.75);
      K.box(flat(0xd8322a, 0.4), -0.014, 0.22, RZ - 0.368, 0.014, 0.26, RZ - 0.358);
      // the frame: a swooping step-through tube, the seat tube, stays, the fork
      const BB = [0, 0.276, -0.072], HT0 = [0, 0.768, 0.468], HT1 = [0, 0.924, 0.432];
      const bez = (a, b, c, n = 7) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1, 2].map((k) => u * u * a[k] + 2 * u * t * b[k] + t * t * c[k]); });
      K.tube(fr, [HT0, HT1], 0.022, 6);
      K.tube(fr, bez([0, 0.792, 0.444], [0, 0.264, 0.336], BB), 0.02, 6);
      K.tube(fr, bez([0, 0.72, 0.432], [0, 0.36, 0.264], [0, 0.312, -0.024]), 0.013, 5);
      K.tube(fr, [BB, [0, 0.864, -0.204]], 0.017, 6);
      K.sym((s) => {
        K.rod(fr, [s * 0.036, 0.276, -0.072], [s * 0.045, WY, RZ], 0.011, 5); K.rod(fr, [s * 0.024, 0.816, -0.192], [s * 0.045, WY, RZ], 0.01, 5);
        K.tube(fr, bez([s * 0.03, 0.768, 0.468], [s * 0.04, 0.528, 0.552], [s * 0.045, WY, FZ]), 0.012, 5);
      });
      K.box(flat(0xf2eee0, 0.5), -0.019, 0.5, -0.135, 0.019, 0.56, -0.118); K.box(flat(0xf2c21c, 0.5), -0.0195, 0.52, -0.136, 0.0195, 0.535, -0.117); // the registration sticker
      // seat post and the sprung saddle
      K.rod(ch, [0, 0.864, -0.204], [0, 0.965, -0.228], 0.012, 6);
      K.prism(matte(0x6a4430, 0.15), [[-0.095, -0.36], [0.095, -0.36], [0.09, -0.27], [0.03, -0.12], [-0.03, -0.12], [-0.09, -0.27]], { plane: 'xz', a: 0.975, b: 1.03, side: flat(0x54362a, 0.9) });
      K.sym((s) => K.cyl(ch, s * 0.048, 0.925, -0.312, 0.014, 0.05, 6));
      // the chain case (right side), cranks and pedals
      K.prism(paint(o.case ?? 0x7aa8bc, 0.2), [[-0.072 + 0.1, 0.276 + 0.04], [RZ, WY + 0.06], [RZ - 0.06, WY], [RZ, WY - 0.06], [-0.072 + 0.1, 0.276 - 0.1], [-0.072 + 0.14, 0.276]], { plane: 'zy', a: -0.078, b: -0.05 });
      K.part('crank', [0, 0.276, -0.072], 'x', () => {
      K.cyl(ch, -0.09, 0.276, -0.072, 0.03, 0.18, 8, { axis: 'x' });
      K.rod(stl, [-0.096, 0.276, -0.072], [-0.096, 0.18, 0.0], 0.01, 4); K.box(rubber(), -0.16, 0.168, -0.03, -0.1, 0.19, 0.04); K.box(flat(0xf29a2a, 0.5), -0.158, 0.172, 0.04, -0.102, 0.186, 0.043);
      K.rod(stl, [0.09, 0.276, -0.072], [0.09, 0.372, -0.144], 0.01, 4); K.box(rubber(), 0.094, 0.36, -0.18, 0.154, 0.382, -0.11); K.box(flat(0xf29a2a, 0.5), 0.096, 0.364, -0.183, 0.152, 0.378, -0.18);
      });
      // stem, the swept-back bars, grips, bell, brake levers
      K.rod(ch, HT1, [0, 1.02, 0.42], 0.012, 6);
      K.sym((s) => {
        K.tube(ch, [[0, 1.02, 0.42], [s * 0.108, 1.02, 0.42], [s * 0.192, 1.032, 0.372], [s * 0.252, 1.032, 0.3]], 0.011, 5);
        K.rod(matte(0x6a4430, 0.15), [s * 0.252, 1.032, 0.3], [s * 0.288, 1.032, 0.24], 0.016, 6);
        K.rod(stl, [s * 0.18, 1.03, 0.36], [s * 0.255, 1.008, 0.385], 0.005, 4);
      });
      blob(K, ch, 0.18, 1.058, 0.36, 0.02, 0.016, 0.02, { fine: true, jit: 0 });
      // the wire basket with a shopping bag and a leek, its struts, the dynamo lamp
      const BX = 0.156, BY0 = 0.804, BY1 = 0.996, BZ0 = 0.504, BZ1 = 0.744, mesh = meshTex(K, 0x34343a, 8, { n: 4 }), rim = flat(0x3a3a40, 0.5);
      meshPanel(K, mesh, '+z', -BX, BY0, BX, BY1, BZ1, 0.1); meshPanel(K, mesh, '+z', -BX, BY0, BX, BY1, BZ0, 0.1);
      meshPanel(K, mesh, '+x', BZ0, BY0, BZ1, BY1, BX, 0.1); meshPanel(K, mesh, '+x', BZ0, BY0, BZ1, BY1, -BX, 0.1); meshPanel(K, mesh, '+y', -BX, BZ0, BX, BZ1, BY0, 0.1);
      K.tube(rim, [[-BX, BY1, BZ0], [BX, BY1, BZ0], [BX, BY1, BZ1], [-BX, BY1, BZ1]], 0.007, 4, { closed: true });
      K.sym((s) => K.rod(stl, [s * 0.096, BY0, BZ1 - 0.024], [s * 0.04, WY, FZ], 0.005, 4));
      if (o.bag !== false) {
        K.box(fabric(0xf4b0c4), -0.11, BY0 + 0.01, BZ0 + 0.04, 0.05, BY0 + 0.14, BZ0 + 0.19, { bevel: 0.02, edge: null });
        K.rod(flat(0xf2f2e6, 0.8), [0.08, BY0 + 0.03, 0.6], [0.105, 1.1, 0.565], 0.011, 5); K.rod(flat(0x4f9a40, 0.8), [0.105, 1.07, 0.565], [0.13, 1.18, 0.54], 0.012, 4); K.rod(flat(0x5aaa48, 0.8), [0.105, 1.08, 0.565], [0.07, 1.17, 0.58], 0.01, 4);
      }
      K.box(ch, -0.03, 0.69, 0.57, 0.03, 0.75, 0.615, { bevel: 0.012 }); K.glow(() => K.cyl(flat(0xf6f0d8), 0, 0.72, 0.612, 0.022, 0.008, 8, { axis: 'z' }));
      // rear carrier, the ring lock, the two-leg stand, the rear reflector
      const car = [-0.072, -0.024, 0.024, 0.072];
      for (const x of car) K.rod(ch, [x, 0.744, -0.312], [x, 0.744, -0.72], 0.006, 4);
      for (const z of [-0.312, -0.516, -0.72]) K.rod(ch, [-0.072, 0.744, z], [0.072, 0.744, z], 0.006, 4);
      K.sym((s) => { K.rod(ch, [s * 0.072, 0.744, -0.7], [s * 0.048, WY, RZ], 0.006, 4); K.rod(ch, [s * 0.072, 0.744, -0.32], [s * 0.03, 0.8, -0.2], 0.006, 4); K.rod(stl, [s * 0.048, WY, RZ], [s * 0.075, 0.012, RZ - 0.06], 0.01, 4); });
      K.rod(stl, [-0.08, 0.012, RZ - 0.06], [0.08, 0.012, RZ - 0.06], 0.01, 4);
      K.box(stl, -0.05, 0.444, -0.5, 0.05, 0.49, -0.455, { bevel: 0.008 });
      K.box(flat(0xd8322a, 0.4), -0.016, 0.65, RZ - 0.305, 0.016, 0.68, RZ - 0.295);
    }

/** The neighbourhood garbage station. bags: the crow net lies rolled along the back (the bags themselves are drawn by src/life/trash.js). */
export function station(K, B, net) {
  const pad = 0xb4b0a8;
  K.box(stone(pad), B.x0, 0, B.z0 + 0.04, B.x1, 0.04, B.z1, { bevel: 0.008 });
  // the yellow outline painted on the pad
  const y = flat(0xe8c040, 0.8), e = 0.0412;
  for (const [a, b, c, d] of [[B.x0 + 0.04, B.z0 + 0.1, B.x1 - 0.04, B.z0 + 0.14], [B.x0 + 0.04, B.z1 - 0.08, B.x1 - 0.04, B.z1 - 0.04], [B.x0 + 0.04, B.z0 + 0.1, B.x0 + 0.08, B.z1 - 0.04], [B.x1 - 0.08, B.z0 + 0.1, B.x1 - 0.04, B.z1 - 0.04]]) K.quad(y, [a, e, d], [c, e, d], [c, e, b], [a, e, b], [0, 1, 0]);
  dirtBox(K, pad, B.x0, B.z0 + 0.04, B.x1, B.z1, 0, 0.025);
  // the rules board on two posts at the back
  const bz = B.z0 + 0.07, bx = 0.42;
  for (const s of [-1, 1]) post(K, bx + s * 0.27, bz, 1.52, 0.022, { n: 6 });
  const V = K.patch('rules', 144, 128, (V) => {
    V.fill(0xf2efe6); V.box(0, 100, 144, 128, 0x2f7a4a); V.frame(0, 0, 144, 128, 0x24603a);
    kana(K, V, 'ゴミ出しルール', 72, 123, 0xffffff, { size: 16, align: 'center' });
    const rows = [['燃えるゴミ', 0xc8302a, '月・木'], ['燃えないゴミ', 0x2a52a8, '第二水'], ['資源・カン', 0x2f7a4a, '金'], ['古紙', 0x8a6a2a, '第四土']];
    rows.forEach(([t, c, d], k) => { const j = 94 - k * 22; V.box(6, j - 16, 16, j - 4, c); kana(K, V, t, 22, j, 0x26221e, { size: 16 }); V.box(118, j - 17, 138, j - 2, c); kana(K, V, d[0], 128, j - 1, 0xffffff, { size: 16, align: 'center' }); });
    V.box(6, 4, 138, 6, 0xc8302a); smallPrint(V, 8, 3, 100, 1, 0x6a6a6a);
  }, { rough: 0.7 });
  K.box(paint(0x2f7a4a, 0.2), bx - 0.36, 0.92, bz + 0.02, bx + 0.36, 1.56, bz + 0.04, { bevel: 0.004 });
  K.face(V, '+z', bx - 0.345, 0.935, bx + 0.345, 1.545, bz + 0.0412);
  K.at([bx + 0.2, 1.56, bz + 0.03], () => crow(K, 0, 0, 0, 1.0), { ry: -0.9 });
  if (net) {
    // the green crow net, rolled up along the kerb with its weights
    K.cyl(flat(0x2f8a4a, 0.9), B.x0 + 0.5, 0.1, B.z0 + 0.28, 0.06, 0.98, 7, { axis: 'x' });
    for (let k = 0; k < 6; k++) K.torus(flat(0x24703a, 0.9), B.x0 + 0.58 + k * 0.16, 0.1, B.z0 + 0.28, 0.058, 0.008, 7, 3, { axis: 'x' });
    for (const x of [B.x0 + 0.47, B.x0 + 1.51]) K.cyl(flat(0xc8302a, 0.7), x - 0.03, 0.1, B.z0 + 0.28, 0.05, 0.06, 7, { axis: 'x' });
  }
}
