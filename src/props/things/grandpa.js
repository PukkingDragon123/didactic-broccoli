// Grandpa's things (src/grandpa/props.js hands them out): the crook cane in varnished chestnut with its brass ferrule
// and rubber tip, the round paper uchiwa (a goldfish over ripples on washi, bamboo ribs fanning from a split-bamboo
// handle, a blue paper edging) and the beige push-button desk telephone with its handset and coiled cord.
//   caneMesh()  origin = the grip (top of the shaft), the shaft runs down -y, the crook curls over towards +z
//   fanMesh()   origin = the bottom of the handle, the face in the xy plane (front +z)
//   phoneMesh() bottom centre (as the old voxel phone: the body a little right of centre, the cord off to the left)
import { thingMesh } from './make.js';
import { plastic, wood, metal, rubber, matte, flat, darken } from '../kit/kit.js';

export const CANE_LEN = 0.86;

function cane(K) {
  const w = wood(0x5e3a1e, 0.22), r = 0.0112, L = CANE_LEN;
  // the shaft up into the crook: one swept bar, a hair thinner at the foot
  const path = [[0, -L + 0.045, 0], [0, -0.3, 0], [0, -0.02, 0]];
  for (let k = 0; k <= 12; k++) { const a = Math.PI - (k / 12) * Math.PI; path.push([0, Math.sin(a) * 0.046, 0.046 + Math.cos(a) * 0.046]); }
  path.push([0, -0.022, 0.093], [0, -0.034, 0.091]);
  K.tube(w, path, r, 8, { radii: path.map((p, i) => (i === 0 ? 0.0098 : i === path.length - 1 ? 0.0094 : r)) });
  K.ball(w, 0, -0.034, 0.091, 0.0094, 0.007, 0.0094, 10, 3, { y0: -1, y1: 0 });
  // the brass ferrule and the rubber tip
  K.cyl(metal(0xa8884a, 0.4), 0, -L + 0.03, 0, 0.0104, 0.016, 12);
  K.lathe(rubber(0x24201e), [0, -L, 0], [[0, 0], [0.0128, 0], [0.0135, 0.004], [0.0124, 0.022], [0.0106, 0.032], [0, 0.032]], 12);
  // a darker ring where the hand wears the varnish
  K.cyl(wood(0x4a2c16, 0.1), 0, -0.07, 0, 0.0114, 0.06, 12, { caps: false });
}
export function caneMesh() {
  const m = thingMesh('grandpa', 'cane', [-0.0135, -CANE_LEN, -0.0135, 0.0135, 0.058, 0.104], cane, { name: 'grandpa-cane' });
  return m;
}

// ------------------------------------------------------------------ the uchiwa
const FR = 0.091, FCY = 0.21;
function fan(K) {
  const face = K.patch('face', 64, 64, (V) => {
    const c = 32, Rp = 31;
    for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) {
      const d = Math.hypot(i - c + 0.5, j - c + 0.5);
      if (d > Rp + 1) continue;
      let col = 0xf2ece0;
      if (j < 26 && d < Rp - 2) { const w = Math.sin(i * 0.42 + j * 0.9); if (w > 0.7) col = 0x8ab0d8; else if (w > 0.55) col = 0xb6cde4; }
      V.px(i, j, col);
    }
    // the goldfish, hand-pixelled: a round body, a split veil tail, a fin, an eye
    const fish = [
      '......RRRR..........',
      '....RRRRRRRR....RR..',
      '...RRRRRRRRRR..RRRR.',
      '..RRWKRRRRRRRRRRRR..',
      '..RRKKRRRRRRRRRRR...',
      '.RRRRRRRRRRRRRRRRR..',
      '..RRRRRRRRRRRRRRRRR.',
      '...RRRRRRRRRRR..RRRR',
      '....RRRRRRRRR....RR.',
      '......RRRRR.........',
      '........RR..........',
    ];
    V.sprite(fish, { R: 0xd8402a, W: 0xf8f0e8, K: 0x1a1414 }, 20, 44);
    V.sprite(['RR', 'R.'], { R: 0xb8301e }, 28, 39);
    for (const [i, j] of [[24, 49], [25, 50], [26, 49]]) V.px(i, j, 0xf06a3a);
    // a second, smaller fish lower down
    V.sprite(['..RRR..R', '.RWRRRRR', 'RRRRRR.R', '.RRRR...'], { R: 0xe8682a, W: 0xf8f0e8 }, 12, 26);
    for (const [i, j] of [[44, 32], [46, 35], [43, 37]]) V.ring(i, j, 0.5, 1.6, 0xb6cde4);
  }, { rough: 0.95 });
  const back = K.patch('back', 32, 32, (V) => {
    for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) V.px(i, j, 0xe8e0cc);
    for (let a = -5; a <= 5; a++) { const t = a * 0.27; for (let k = 2; k < 15; k++) V.px(Math.round(16 + Math.sin(t) * k), Math.round(1 + Math.cos(t) * k), 0xcfc0a0); }
  }, { rough: 0.95 });
  // the paper: a disc, two-sided, a hair apart
  const n = 32, pts = [];
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; pts.push([Math.sin(a) * FR, FCY + Math.cos(a) * FR * (Math.cos(a) < 0 ? 0.96 : 1)]); }
  const st = (p) => [(p[0] / FR + 1) / 2, ((p[1] - FCY) / FR + 1) / 2];
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[(k + 1) % n], o = [0, FCY];
    K.triUV(face, [o[0], o[1], 0.0012], [a[0], a[1], 0.0012], [b[0], b[1], 0.0012], [st(o), st(a), st(b)], [0, 0, 1]);
    K.triUV(back, [o[0], o[1], -0.0012], [b[0], b[1], -0.0012], [a[0], a[1], -0.0012], [st(o), st(b), st(a)].map(([s, t]) => [1 - s, t]), [0, 0, -1]);
  }
  // the blue paper edging folded over the rim
  K.tube(matte(0x2f5a9a, 0.1), pts.map(([x, y]) => [x, y, 0]), 0.0022, 6, { closed: true });
  // bamboo ribs fanning from the top of the handle (between the papers)
  const rib = matte(0xc8a46a, 0.12), hub = [0, FCY - FR + 0.012, 0];
  const h0 = FCY - hub[1], Rr = FR - 0.005;
  for (let a = -7; a <= 7; a++) {
    const t = a * 0.2, ct = Math.cos(t), len = h0 * ct + Math.sqrt(h0 * h0 * ct * ct - h0 * h0 + Rr * Rr);
    K.rod(rib, hub, [Math.sin(t) * len, hub[1] + ct * len, 0], 0.001, 4);
  }
  // the handle: split bamboo, flattened, with a node and a burnt maker's mark
  const hb = matte(0xb8904a, 0.18);
  K.tube(hb, [[0, 0.004, 0], [0, hub[1] + 0.002, 0]], 0.0065, 8, { radii: [0.006, 0.0068] });
  K.lathe(matte(0xa07838, 0.1), [0, 0.06, 0], [[0.0068, 0], [0.0078, 0.003], [0.0068, 0.006]], 8);
  K.ball(hb, 0, 0.004, 0, 0.006, 0.004, 0.006, 8, 3, { y0: -1, y1: 0 });
  K.box(flat(0x6a4a22, 0.6), -0.003, 0.02, 0.0062, 0.003, 0.03, 0.0066);
}
export function fanMesh() {
  return thingMesh('grandpa', 'fan', [-0.094, 0, -0.008, 0.094, 0.304, 0.008], fan, { name: 'grandpa-fan' });
}

// ------------------------------------------------------------------ the desk telephone
function phone(K) {
  const B = 0xe2d6b8, BD = 0xc8ba98, sh = plastic(B, 0.14), shd = plastic(BD, 0.1), X = 0.045;
  // the body: a wedge, low at the front, the cradle raised at the back
  const sec = [[0.094, 0], [0.094, 0.026], [0.06, 0.05], [-0.03, 0.068], [-0.094, 0.07], [-0.094, 0]];
  K.at([X, 0, 0], () => {
    K.prism(sh, sec, { plane: 'zy', a: -0.1, b: 0.1 });
    K.box(rubber(0x3a3632), -0.096, -0.0006, -0.09, 0.096, 0.002, 0.09);
    // the keypad on the slope: 12 keys with printed figures, the message lamp, a number card under a clear window
    const digits = K.patch('digits', 30, 40, (V) => {
      V.fill(0xf4efe2);
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].forEach((t, k) => {
        const c = k % 3, r = Math.floor(k / 3), grey = r === 3 && c !== 1;
        V.box(c * 10, 30 - r * 10, c * 10 + 10, 40 - r * 10, grey ? 0x9a8a70 : 0xf4efe2);
        V.text5(t, c * 10 + 3, 38 - r * 10, grey ? 0xf4efe2 : 0x4a4238);
      });
    }, { rough: 0.5 });
    const slope = Math.atan2(0.018, 0.09), yOn = (z) => 0.05 + (0.06 - z) * 0.2;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      const x = -0.026 + c * 0.024, kz = -0.022 + r * 0.0165, grey = r === 3 && c !== 1;
      K.at([x, yOn(kz) - 0.001, kz], () => {
        K.box(plastic(grey ? 0x9a8a70 : 0xf4efe2, 0.15), -0.0085, 0, -0.0062, 0.0085, 0.006, 0.0062, { bevel: 0.0016 });
        K.face(digits, '+y', -0.0068, -0.0045, 0.0068, 0.0045, 0.0061, { sub: [c / 3, (3 - r) / 4, (c + 1) / 3, (4 - r) / 4] });
      }, { rx: slope });
    }
    K.glow(() => K.box(0xd83a2a, 0.056, 0.0545, 0.026, 0.064, 0.0575, 0.034));
    const card = K.patch('card', 46, 12, (V) => { V.fill(0xf8f2e2); V.box(0, 10, 46, 12, 0xd8483a); V.text5('0557-24', 2, 8, 0x2a3a6a); }, { rough: 0.3 });
    K.at([0, 0.0388, 0.0778], () => K.face(card, '+z', -0.03, -0.006, 0.03, 0.006, 0), { rx: -0.6 });
    // the cradle: two forks with the hook switch between
    for (const s of [-1, 1]) K.box(shd, s * 0.083 - 0.012, 0.064, -0.07, s * 0.083 + 0.012, 0.082, -0.02, { bevel: 0.006 });
    K.box(plastic(0x9a8a70, 0.1), -0.008, 0.068, -0.05, 0.008, 0.074, -0.036, { bevel: 0.002 });
    // the handset resting on the forks: two cups on a curved grip
    const hz = -0.045, hy = 0.084;
    K.tube(sh, [[-0.1, hy + 0.004, hz], [-0.06, hy + 0.012, hz], [0, hy + 0.015, hz], [0.06, hy + 0.012, hz], [0.1, hy + 0.004, hz]], 0.013, 10, { flat: [0.024, 0.02], up: [0, 1, 0] });
    for (const s of [-1, 1]) {
      K.lathe(sh, [s * 0.098, hy - 0.012, hz], [[0, 0], [0.019, 0], [0.024, 0.01], [0.023, 0.024], [0, 0.026]], 14, { sx: 0.9 });
      K.lathe(flat(darken(B, 0.35)), [s * 0.098, hy - 0.0125, hz], [[0.016, 0], [0, 0]], 14);
    }
  });
  // the coiled cord from the handset's end down to the left
  const pts = [];
  for (let k = 0; k <= 70; k++) {
    const t = k / 70, a = k * 0.9, cx = X - 0.1 - t * 0.075, cy = 0.07 * (1 - t) + 0.008, cz = -0.045 + t * 0.03;
    pts.push([cx + Math.cos(a) * 0.006 * 0.4, cy + Math.sin(a) * 0.006, cz + Math.cos(a) * 0.006]);
  }
  K.tube(plastic(0x2a2622, 0.1), pts, 0.0018, 5);
}
export function phoneMesh() {
  return thingMesh('grandpa', 'phone', [-0.17, 0, -0.095, 0.17, 0.12, 0.095], phone, { name: 'desk-phone' });
}
