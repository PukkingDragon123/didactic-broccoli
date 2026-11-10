// The first wardrobe (src/people/cosmetics.js): the dino and banana suits' hoods, the happi band, the box robot, the
// shark / bear / frog hoods, the cone, party hat, bow, nigiri and chicken, the shades / star glasses / disguise kit and
// the kitsune mask, plus the dino's spikes and tail and the thumbnails' wooden display head. Head pieces in head units
// (head bone at the origin, +z the face, +x the wearer's left); body pieces in metric 'voxel' units (V = height / 140).
// Every builder returns a BufferGeometry (src/peoplekit/kit.js).
import { Kit, MAT, HEAD, v3, oval, smooth, headRing, headPt, sd, shade, mix, lerp } from './kit.js';
import { hood, ear, bead, toothAt, cordRing, pompom, specs, brush, INK, WHITE, MOUTH, TOOTH } from './parts.js';

export const DINO = 0x5fb64a, DINO_D = 0x3f8c36, DINO_BELLY = 0xf0dc9c, SPIKE = 0xf4ae32, SPIKE_D = 0xd8862a;
export const BANANA = 0xf6d43c, BANANA_D = 0xd8ac22, BANANA_SPOT = 0x7a5a26;
const TAU = Math.PI * 2;

/** A point on the outside of a hood (grow + th from the hair) in the direction of (x, y, z) from the head centre. */
const onHood = (x, y, z, out = 2.1) => headPt([x - HEAD.C[0], y - HEAD.C[1], z - HEAD.C[2]], out);
/** A rounded spike / fin plate standing on a surface point p with normal n (in the y-z plane), size s, swept back. */
function spikeOn(K, p, n, s, col = SPIKE, col2 = SPIKE_D, th = 0.9) {
  const tilt = Math.atan2(n[2], n[1]);
  const out = smooth([[-s * 0.55, -0.6], [s * 0.55, -0.6], [s * 0.42, s * 0.35], [s * 0.18, s * 0.92], [-s * 0.08, s * 0.5]], 4, true);
  K.with(p, [tilt, Math.PI / 2, 0], 1, () => K.slab(out, th, { mat: MAT.fur, b: th * 0.45, col: (q) => (q[1] > s * 0.55 ? col2 : col) }));
}
/** Teeth along the jaw: front row (x from -w to w at y, z) and side rows; dir 1 = pointing down, -1 = up. */
function jawTeeth(K, y, zf, w, dir, n = 6, len = 1.15) {
  for (let k = 0; k < n; k++) {
    const x = -w + (2 * w * k) / (n - 1), z = zf - (x / (w + 1.6)) ** 2 * 3.2;
    toothAt(K, [x, y, z], [dir > 0 ? Math.PI : 0, 0, 0], len * (k % 2 ? 0.8 : 1), 0.42);
  }
}

export const BASE = {
  // ================================================================== hoods
  dinoHood() {
    const K = new Kit();
    hood(K, { col: DINO, rim: MOUTH, paint: (p) => (p[1] < 2 && p[2] < 2 ? mix(DINO, DINO_BELLY, 0.25) : DINO) });
    // upper jaw over the forehead, with nostrils and heavy brows; the lower jaw under the chin
    K.sculpt((p) => {
      let d = sd.box(p, [0, 12.3, 11.2], [6.3, 2.4, 4.3], 2.1);
      d = sd.u(d, sd.ell(p, [0, 14.6, 8.6], [6.6, 3.2, 3.6]), 1.2);
      for (const sx of [-1, 1]) {
        d = sd.u(d, sd.ell(p, [sx * 4.4, 15.6, 9.6], [2.3, 1.2, 1.9]), 0.6); // brow
        d = sd.cut(d, sd.sphere(p, [sx * 1.9, 13.9, 15.3], 0.55), 0.3); // nostril
      }
      return d;
    }, [-8, 8.5, 5, 8, 18.5, 16.5], 0.5, { mat: MAT.fur, col: (p) => (p[1] < 10.3 ? MOUTH : p[1] < 11.2 && p[2] > 14 ? mix(DINO, MOUTH, 0.4) : DINO) });
    K.sculpt((p) => sd.box(p, [0, -5.5, 8.4], [5.6, 1.4, 3.9], 1.3), [-7.5, -8, 3, 7.5, -3, 13.5], 0.42, { mat: MAT.fur, col: (p) => (p[1] > -4.6 ? MOUTH : DINO_BELLY) });
    jawTeeth(K, 10.2, 15.0, 5.2, 1, 7);
    jawTeeth(K, -4.3, 11.9, 4.4, -1, 6, 1.0);
    for (const sx of [-1, 1]) bead(K, [sx * 4.3, 14.6, 10.9], 1.35, { dir: [sx * 0.35, 0.1, 1], pupil: 0.66 });
    // spikes down the middle, from the brow over the crown and down the back
    [[0.42, 3.2], [0.15, 4], [-0.18, 4.4], [-0.55, 4], [-0.95, 3.2], [-1.3, 2.4]].forEach(([a, s]) => {
      const dir = [0, Math.cos(a), Math.sin(a)];
      const p = headPt(dir, 2.0), n = v3.norm(v3.sub(headPt(dir, 2.6), p));
      spikeOn(K, p, n, s);
    });
    return K.build();
  },
  bananaHood() {
    const K = new Kit();
    hood(K, { col: BANANA, rim: 0xf8eec6, paint: (p) => (p[1] > 15 ? mix(BANANA, BANANA_D, 0.35) : BANANA) });
    // the curved tip (five soft ridges), the stem and its dark end
    const path = [], N = 12;
    for (let k = 0; k <= N; k++) { const t = k / N, y = 15.5 + t * 14.5; path.push([0, y, 2 + Math.pow(Math.max(0, y - 16), 1.6) * 0.15]); }
    const sec = [];
    for (let k = 0; k < 30; k++) { const a = (k / 30) * TAU, r = 1 - 0.075 * Math.cos(5 * a); sec.push([Math.cos(a) * r, Math.sin(a) * r]); }
    K.sweep(smooth(path, 3), sec, { mat: MAT.soft, scale: (t) => 6.6 * (1 - t) ** 0.9 + 1.25, up: [1, 0, 0], col: (p) => (p[1] > 28.6 ? 0x6a4a24 : p[1] > 26.5 ? mix(BANANA, 0x9aa83a, 0.5) : BANANA) });
    const top = path[N], tip = [top[0], top[1] + 1.6, top[2] + 1.6];
    K.tube([top, tip], 1.15, { sides: 10, caps: 'round', mat: MAT.wood, col: 0x3a2a18 });
    // a few ripe freckles, placed by hand
    for (const [x, y, z, r] of [[4.2, 19.5, 6.5, 0.45], [-3.6, 21.5, 8.2, 0.35], [2.2, 24, 10.4, 0.3], [-5.6, 15.8, 4, 0.4], [5.4, 13.5, 2.5, 0.38]]) {
      const p = y < 17 ? onHood(x, y, z, 1.95) : [x * 0.9, y, z];
      K.blob(p, [r, r * 0.8, r], { mat: MAT.soft, col: BANANA_SPOT, seg: 8 });
    }
    return K.build();
  },
  happiBand() {
    const K = new Kit();
    K.band({ y: 10, h: 2.5, th: 0.7, grow: 0.1, mat: MAT.cloth, col: 0xf6f4ee });
    // the red rising sun at the front, the knot and its two tails at the back
    const f = headPt([0, 0, 1], 0.85, [0, 10, HEAD.C[2]]);
    K.with([f[0], f[1], f[2] + 0.05], [0, 0, 0], 1, () => K.plate(oval(1.15, 1.15, 24), () => 0, 0.12, { mat: MAT.cloth, col: 0xd42a2a, rings: 3 }));
    const b = headPt([0, 0, -1], 0.6, [0, 10, HEAD.C[2]]);
    K.blob([b[0], b[1], b[2] - 0.4], [1.4, 1.2, 1.0], { mat: MAT.cloth, col: 0xece8dc, seg: 12 });
    for (const sx of [-1, 1]) K.tube(smooth([[b[0] + sx * 0.6, b[1] - 0.4, b[2] - 0.6], [sx * 1.6, 7.6, b[2] - 1.3], [sx * 2.2, 5.2, b[2] - 1.5]], 4), 0.95, { sides: 8, ry: 0.28, sq: 5, up: [0, 0, 1], mat: MAT.cloth, col: 0xf6f4ee, caps: 'flat' });
    return K.build();
  },
  sharkHood() {
    const TOP = 0x6f92b4, TOP_D = 0x5a7c9e, BELLY = 0xf2f4f6;
    const K = new Kit();
    hood(K, { col: TOP, rim: MOUTH, paint: (p) => (p[1] < 4.5 && Math.abs(p[0]) > 5.8 ? BELLY : TOP) });
    K.sculpt((p) => sd.u(sd.box(p, [0, 12.6, 11.4], [7, 2.4, 3.3], 2.2), sd.ell(p, [0, 14.4, 8], [7.6, 3, 4]), 1.4), [-9.5, 9, 4, 9.5, 18, 16], 0.5, { mat: MAT.fur, col: (p) => (p[1] < 10.6 ? MOUTH : TOP) });
    K.sculpt((p) => sd.box(p, [0, -5.6, 8.4], [6.2, 1.5, 4.1], 1.4), [-8, -8, 3, 8, -3, 13.5], 0.42, { mat: MAT.fur, col: (p) => (p[1] > -4.6 ? MOUTH : BELLY) });
    jawTeeth(K, 10.4, 14.3, 6, 1, 8, 1.3);
    jawTeeth(K, -4.3, 12.1, 4.8, -1, 6, 1.1);
    // the dorsal fin, leaning back
    const top = headPt([0, 1, -0.12], 1.9);
    const fin = smooth([[-4.6, -1.2], [4.8, -1.2], [5.6, 3.5], [7.2, 9.6], [3.2, 6.4], [-1.6, 2.8]], 5, true);
    K.with(top, [0, Math.PI / 2, 0], 1, () => K.slab(fin, 1.1, { mat: MAT.fur, b: 0.5, col: (q) => (q[1] > 6 ? TOP_D : TOP) }));
    for (const sx of [-1, 1]) {
      bead(K, onHood(sx * 9, 10.6, 8.6, 2.05), 0.62, { white: false, pupil: 1, dir: [sx, 0, 0.3] });
      for (const z of [0.5, -1.6, -3.7]) {
        const g = [];
        for (let y = 3; y <= 8.5; y += 0.9) g.push(onHood(sx * 9, y, z + (y < 5.5 ? (5.5 - y) * 0.25 : 0), 2.0));
        K.tube(g, 0.24, { sides: 6, caps: 'round', mat: MAT.fur, col: TOP_D });
      }
    }
    return K.build();
  },
  bearHood() {
    const B = 0x8c5a38, T = 0xe0bc88;
    const K = new Kit();
    hood(K, { col: B, rim: T });
    K.sculpt((p) => sd.ell(p, [0, 12.1, 12.1], [3.3, 2.1, 2.0]), [-4, 9.5, 9.5, 4, 14.5, 14.8], 0.32, { mat: MAT.fur, col: T });
    K.blob([0, 12.9, 13.9], [1.05, 0.7, 0.65], { mat: MAT.eye, col: 0x2a1a14, seg: 14 });
    K.tube(smooth([[-1.2, 11.2, 13.85], [0, 11.6, 14.05], [1.2, 11.2, 13.85]], 3), 0.16, { sides: 6, mat: MAT.matte, col: 0x4a2a1c, caps: 'round' });
    K.tube([[0, 12.3, 14.05], [0, 11.6, 14.05]], 0.15, { sides: 6, mat: MAT.matte, col: 0x4a2a1c, caps: 'round' });
    for (const sx of [-1, 1]) bead(K, onHood(sx * 4.1, 14.9, 11, 2.1), 0.75, { white: false, pupil: 1 });
    return K.build();
  },
  bearEar(sx) {
    const K = new Kit();
    ear(K, [0, -0.8, 0], { w: 3.3, h: 3.3, col: 0x8c5a38, inner: 0xe0bc88, tilt: 0, lean: 0, yaw: 0 });
    void sx;
    return K.build();
  },
  frogCap() {
    const G1 = 0x7cc84a, G2 = 0x5aa63a;
    const K = new Kit();
    K.shell({ grow: 0.15, th: 1.5, open: (p) => p[1] < 10.2, pole: [0, 1, 0], mat: MAT.fur, col: (p, side) => (side === 'out' ? G1 : G2), hem: 0.35 });
    for (const sx of [-1, 1]) {
      K.sculpt((p) => sd.ell(p, [sx * 4.1, 18.2, 5.2], [3.4, 3.3, 3.3]), [sx * 4.1 - 4, 14.5, 1.5, sx * 4.1 + 4, 22, 9], 0.34, { mat: MAT.fur, col: G1 });
      K.blob([sx * 4.1, 18.0, 7.6], [2.35, 2.25, 1.5], { mat: MAT.eye, col: 0xfdfdf6, seg: 20 });
      K.blob([sx * 3.9, 17.8, 8.95], [1.1, 1.2, 0.4], { mat: MAT.eye, col: INK, seg: 14 });
      K.blob([sx * 3.4, 18.4, 9.3], [0.32, 0.32, 0.12], { mat: MAT.eye, col: 0xffffff, seg: 8 });
      // green lids over the top of the eyes
      K.sculpt((p) => Math.max(sd.ell(p, [sx * 4.1, 18.3, 6.9], [2.7, 2.3, 2.05]), 18.5 - p[1]), [sx * 4.1 - 3, 18, 4.5, sx * 4.1 + 3, 21, 9.5], 0.3, { mat: MAT.fur, col: G1 });
      K.blob(onHood(sx * 6.4, 12.7, 10, 1.75), [1.3, 0.9, 0.5], { mat: MAT.fur, col: 0xff9aa8, seg: 12 });
    }
    // the big smile
    const smile = [];
    for (let a = -0.85; a <= 0.85; a += 0.1) smile.push(headPt([Math.sin(a), 0, Math.cos(a)], 1.75, [0, 12.4 + a * a * 1.3, HEAD.C[2]]));
    K.tube(smile, 0.3, { sides: 6, caps: 'round', mat: MAT.matte, col: 0xc8405a });
    return K.build();
  },
  // ================================================================== hats
  cone() {
    const OR = 0xf26a1f, WH = 0xf8f8f2;
    const K = new Kit();
    const R = (y) => lerp(8.9, 1.15, (y - 9.8) / 22.2);
    const bands = [[9.8, 16, OR], [16, 18.6, WH], [18.6, 22, OR], [22, 23.8, WH], [23.8, 31.4, OR]];
    for (const [y0, y1, c] of bands) K.lathe([[R(y0), y0], [R(y1), y1]], { seg: 40, mat: c === WH ? MAT.gloss : MAT.plastic, col: c });
    K.lathe([[R(31.4), 31.4], [0.95, 31.9], [0.55, 32.2], [0, 32.25]], { seg: 40, mat: MAT.plastic, col: OR });
    K.lathe([[R(9.8) - 0.6, 9.8], [R(31.4) - 0.5, 31]], { seg: 40, mat: MAT.plastic, col: shade(OR, 0.7), flip: true });
    // the square base round the head
    const n = 48, inner = [], outer = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
      inner.push([s * 8.3, 9.4, HEAD.C[2] + 0.2 + c * 9.3]);
      const k = 1 / Math.max(Math.abs(c), Math.abs(s)) ** 0.82;
      outer.push([s * 10.2 * Math.min(k, 1.32), 9.4, HEAD.C[2] + 0.2 + c * 10.2 * Math.min(k, 1.32)]);
    }
    K.washer(inner, outer, 1.0, { mat: MAT.plastic, col: 0xd8561a, rows: 3 });
    return K.build();
  },
  party() {
    const K = new Kit();
    const mat = K.paint('partyStripes', 128, 128, (g, w, h) => {
      const C = ['#ff5fa0', '#ffd23f', '#46c2d8'];
      for (let k = -6; k < 12; k++) { g.fillStyle = C[((k % 3) + 3) % 3]; g.beginPath(); g.moveTo(k * w / 6, h); g.lineTo((k + 1) * w / 6, h); g.lineTo((k + 1) * w / 6 + w / 3, 0); g.lineTo(k * w / 6 + w / 3, 0); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let k = 0; k < 6; k++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc((k + (j % 2) * 0.5) * w / 6 + 6, j * h / 4 + 14, 3, 0, TAU); g.fill(); }
    }, { rough: 0.6 });
    K.lathe([[4.5, 0], [3.3, 3.4], [0.2, 13.1], [0, 13.2]], { seg: 36, mat, col: 0xffffff, uv: (i, j) => [i / 36 * 3, j / 3 * 1.4], rawUV: true });
    K.lathe([[4.1, 0.2], [0.2, 12.6]], { seg: 36, mat: MAT.paper, col: 0xe8e0d8, flip: true });
    K.tube(oval(4.5, 4.5, 36).map(([x, z]) => [x, 0.05, z]), 0.28, { closed: true, sides: 6, mat: MAT.cloth, col: 0xfff4f8 });
    return K.build();
  },
  pompom() { const K = new Kit(); pompom(K, [0, 0, 0], 1.9, 0xfff8e8, 0xf0e2c8); return K.build(); },
  bow() {
    const R = 0xe8384f, R2 = 0xc42a40;
    const K = new Kit();
    const dots = K.paint('bowDots', 64, 64, (g, w, h) => {
      g.fillStyle = '#e8384f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff4f4';
      for (const [x, y] of [[0.25, 0.25], [0.75, 0.75]]) { g.beginPath(); g.arc(x * w, y * h, w * 0.12, 0, TAU); g.fill(); }
    }, { rough: 0.55 });
    // each lobe: a ribbon loop round from the knot to the tip and back (its broad faces front and back), gathered at the knot
    const sec = oval(1, 0.13, 20, 6);
    for (const sx of [-1, 1]) {
      const loop = smooth([[sx * 0.9, 0.2, 0.7], [sx * 4.8, 1.6, 1.5], [sx * 9.4, 2.4, 0.9], [sx * 10.6, 1.2, 0], [sx * 9.4, 0.4, -0.9], [sx * 4.8, 0.6, -1.4], [sx * 0.9, 0.2, -0.6]], 5, true);
      K.sweep(loop, sec, { closed: true, up: [0, 1, 0], mat: dots, col: 0xffffff, scale: (t) => 1.5 + 2.6 * Math.sin(Math.PI * t) ** 0.8, uv: (i, j, d) => [(i / 20) * 4, d[1] / 2.6], rawUV: true });
      // tails hanging from the knot
      K.sweep(smooth([[sx * 0.7, -0.6, 0.5], [sx * 2.6, -3.4, 0.9], [sx * 3.8, -6.6, 0.4]], 3), sec, { up: [0, 0, 1], mat: dots, col: 0xffffff, scale: (t) => 1.1 + t * 0.5, uv: (i, j, d) => [(i / 20) * 2.5, d[1] / 2.6], rawUV: true });
    }
    K.sculpt((p) => sd.box(p, [0, 0.4, 0.1], [1.3, 1.9, 1.5], 1.0), [-2.6, -2, -2, 2.6, 2.8, 2.2], 0.24, { mat: MAT.cloth, col: R2 });
    void R;
    return K.build();
  },
  nigiri() {
    const K = new Kit();
    K.sculpt((p) => {
      let d = sd.box(p, [0, 2.3, 0], [5.2, 2.4, 7.0], 2.3);
      for (const [x, y, z] of [[-4.6, 1.2, 4], [4.4, 2.6, -2], [-3.8, 3.4, -5.2], [3.6, 0.8, 5.8], [0, 0.6, -6.9], [-1.5, 1.4, 7.1]]) d = sd.u(d, sd.ell([p[0] - x, p[1] - y, p[2] - z], [0, 0, 0], [0.9, 0.55, 0.55]), 0.35);
      return d;
    }, [-6.5, -0.5, -8.5, 6.5, 5.5, 8.5], 0.32, { mat: MAT.soft, col: (p) => (p[1] < 0.8 ? 0xe8e2d2 : 0xfaf8ee) });
    const fish = K.paint('salmon', 128, 128, (g, w, h) => {
      g.fillStyle = '#f07642'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffd6c2'; g.lineCap = 'round';
      for (let k = -2; k < 8; k++) { g.lineWidth = 5 + (k % 2) * 2; g.beginPath(); g.moveTo(k * 22, h + 4); g.quadraticCurveTo(k * 22 + 18, h / 2, k * 22 + 40, -4); g.stroke(); }
      g.fillStyle = 'rgba(255,170,120,0.35)'; g.fillRect(0, 0, w, h * 0.15);
    }, { rough: 0.35 });
    // the slice, draped over both ends
    const out = oval(5.7, 9.7, 40, 3.2);
    K.with([0, 0, 0], [-Math.PI / 2, 0, 0], 1, () => K.plate(out, (x, y) => {
      const a = Math.abs(y);
      return 5.3 - (a > 6.2 ? (a - 6.2) ** 1.6 * 0.42 : 0) - (Math.abs(x) / 5.7) ** 4 * 0.6;
    }, 0.8, { mat: fish, col: 0xffffff, backCol: 0xe86438, backMat: MAT.soft, rimCol: 0xe86438, rimMat: MAT.soft, rings: 12, uvMap: (x, y) => [(x + 5.7) / 11.4, (y + 9.7) / 19.4] }));
    return K.build();
  },
  chickenBody() {
    const W = 0xfcfaf2, W2 = 0xe8e2d2, OR = 0xf5a524;
    const K = new Kit();
    K.sculpt((p) => {
      let d = sd.ell(p, [0, 20.8, 0.4], [6.1, 4.8, 7.3]);
      d = sd.u(d, sd.ell(p, [0, 23.2, 4.2], [3.2, 3.2, 3.2]), 1.6); // the breast up to the neck
      for (const [x, a] of [[-1.9, -0.32], [0, 0], [1.9, 0.32]]) d = sd.u(d, sd.ell([p[0] - x - Math.sin(a) * (p[1] - 24), p[1], p[2]], [0, 25.4, -6.4], [0.9, 4.6, 2.2]), 1.1); // tail feathers
      return d;
    }, [-8, 14.5, -10.5, 8, 31, 9], 0.5, { mat: MAT.fur, col: (p) => (p[1] < 17.6 ? W2 : W) });
    for (const sx of [-1, 1]) for (const a of [-0.45, 0, 0.45]) K.tube([[sx * 2, 16.3, 5.2], [sx * 2 + Math.sin(a) * 1.8, 15.9, 5.2 + Math.cos(a) * 1.8]], 0.32, { sides: 6, caps: 'round', mat: MAT.plastic, col: OR });
    return K.build();
  },
  chickenHead() {
    const W = 0xfcfaf2, OR = 0xf5b02a, RED = 0xe5383b;
    const K = new Kit();
    K.sculpt((p) => sd.u(sd.ell(p, [0, 26, 6.6], [3.3, 3.6, 3.5]), sd.ell(p, [0, 23.4, 5.6], [2.4, 2.2, 2.4]), 1.2), [-4, 20.5, 2.5, 4, 30, 10.6], 0.38, { mat: MAT.fur, col: W });
    K.with([0, 25.4, 9.6], [Math.PI / 2 - 0.15, 0, 0], 1, () => K.lathe([[0, -0.4], [1.0, 0], [0.75, 1.0], [0.25, 2.0], [0, 2.2]], { seg: 12, mat: MAT.plastic, col: OR, sx: 1, sz: 0.8 }));
    K.sculpt((p) => sd.u(sd.ell(p, [0, 22.6, 9.0], [0.75, 1.4, 0.7]), sd.ell(p, [0, 21.4, 9.1], [0.85, 0.9, 0.75]), 0.4), [-1.5, 19.8, 7.8, 1.5, 24.4, 10.4], 0.18, { mat: MAT.soft, col: RED });
    for (const sx of [-1, 1]) bead(K, [sx * 2.75, 26.8, 8.3], 0.6, { white: false, pupil: 1, dir: [sx, 0, 0.5] });
    return K.build();
  },
  chickenComb() {
    const K = new Kit();
    K.sculpt((p) => {
      let d = sd.ell(p, [0, 29.2, 6.6], [0.75, 0.9, 2.8]);
      for (const [z, y, r] of [[4.4, 30.5, 1.35], [6.6, 31.4, 1.6], [8.6, 30.6, 1.25]]) d = sd.u(d, sd.ell(p, [0, y, z], [0.72, r, r * 0.95]), 0.5);
      return d;
    }, [-1.5, 27.5, 2.2, 1.5, 33.5, 10.5], 0.3, { mat: MAT.soft, col: 0xe5383b });
    return K.build();
  },
  chickenWing(sx) {
    const K = new Kit();
    K.sculpt((p) => {
      let d = sd.ell(p, [sx * 6.25, 20.8, 0], [1.25, 3.3, 4.6]);
      for (const [y, z] of [[18.4, -3.6], [17.8, -2], [17.6, -0.3]]) d = sd.u(d, sd.ell(p, [sx * 6.3, y, z], [0.8, 1.5, 1.0]), 0.6);
      return d;
    }, [sx * 6.25 - 2.2, 15.6, -5.6, sx * 6.25 + 2.2, 25, 5.6], 0.34, { mat: MAT.fur, col: (p) => (p[2] < -2.6 || p[1] < 18 ? 0xe8e2d0 : 0xfcfaf2) });
    return K.build();
  },
  // ================================================================== glasses and masks (eyes frame)
  shades() {
    const K = new Kit();
    const lens = smooth([[-2.15, 1.25], [0, 1.45], [2.25, 1.35], [2.4, -0.1], [1.5, -1.55], [-0.6, -1.7], [-2.2, -0.5]], 4, true);
    specs(K, { lens, cx: 3.25, cy: 0.35, rim: 0.3, rimRy: 1.25, rimCol: 0x141416, lensMat: MAT.eye, lensCol: 0x1e2a38, bridge: 'double' });
    return K.build();
  },
  stars() {
    const K = new Kit();
    const star = [];
    for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU, R = 3.5 * (0.55 + 0.45 * Math.abs(Math.cos(a * 2.5)) ** 1.5); star.push([Math.sin(a) * R, Math.cos(a) * R]); }
    specs(K, { lens: star, cx: 3.7, cy: 0.5, rim: 0.36, rimRy: 1.3, rimMat: MAT.gloss, rimCol: 0xff4f9a, lensCol: 0xffd23a, lensMat: MAT.glass, bridge: 'bar', hingeY: 0.2, lensIn: 0.9 });
    return K.build();
  },
  groucho() {
    const BR = 0x2a1a14, NOSE = 0xf0a48c;
    const K = new Kit();
    specs(K, { lens: oval(2.2, 1.85, 32, 3.4), cx: 3.3, cy: 0.1, rim: 0.42, rimRy: 1.3, rimCol: 0x141416, lensCol: 0xe4ecef, bridge: 'arch' });
    K.sculpt((p) => {
      let d = sd.ell(p, [0, -3.0, 12.9], [1.9, 2.3, 2.0]);
      d = sd.u(d, sd.ell(p, [0, -0.6, 12.2], [0.95, 1.6, 1.0]), 0.6);
      for (const sx of [-1, 1]) d = sd.u(d, sd.ell(p, [sx * 1.3, -4.3, 12.4], [0.95, 0.8, 0.9]), 0.4);
      for (const sx of [-1, 1]) d = sd.cut(d, sd.ell(p, [sx * 0.75, -4.95, 13.0], [0.42, 0.3, 0.5]), 0.15);
      return d;
    }, [-3, -6.2, 9.8, 3, 1.6, 15.3], 0.3, { mat: MAT.soft, col: NOSE });
    // brows and the moustache
    for (const sx of [-1, 1]) {
      K.sculpt((p) => sd.cone([p[0] * sx, p[1], p[2]], [1.3, 3.5, 12.3], [5.0, 3.9, 11.5], 0.75, 0.5), [sx > 0 ? 0 : -6.2, 2.2, 10, sx > 0 ? 6.2 : 0, 5, 13.6], 0.28, { mat: MAT.fur, col: BR });
      K.sculpt((p) => {
        const q = [p[0] * sx, p[1], p[2]];
        return sd.u(sd.cone(q, [0.2, -5.4, 13.2], [3.3, -5.6, 12.6], 1.05, 0.75), sd.cone(q, [3.3, -5.6, 12.6], [4.7, -7.1, 11.9], 0.75, 0.32), 0.5);
      }, [sx > 0 ? -0.5 : -6, -8.4, 10.2, sx > 0 ? 6 : 0.5, -3.8, 15], 0.28, { mat: MAT.fur, col: BR });
    }
    return K.build();
  },
  /** The kitsune mask (side-worn frame: face toward +z, centred near the origin); `pal` recolours it (the black fox). */
  kitsune(pal = {}) {
    const P = { base: '#f8f4ea', base2: '#e8e2d4', red: '#d8302a', gold: '#e0b040', ink: '#1c1418', ...pal };
    const K = new Kit();
    const face = K.paint('kitsune:' + P.base, 256, 256, (g, w, h) => {
      const B = brush(g, w, h);
      B.bg(P.base);
      // u = (x + 7) / 14, v = (y + 8) / 18
      const U = (x) => (x + 7) / 14, V = (y) => (y + 8) / 18;
      for (const sx of [-1, 1]) {
        const X = (x) => U(sx * x);
        B.fill(P.red, (b) => { b.m(X(0.7), V(3.3)); b.c(X(1.6), V(4.4), X(3.2), V(4.8), X(4.6), V(4.2)); b.c(X(3.6), V(4.3), X(2.6), V(3.9), X(2.3), V(3.4)); b.c(X(1.8), V(3.6), X(1.2), V(3.6), X(0.7), V(3.3)); });
        B.fill(P.ink, (b) => { b.m(X(0.9), V(1.6)); b.c(X(1.8), V(2.4), X(3.0), V(2.6), X(3.9), V(2.3)); b.c(X(3.0), V(2.0), X(1.8), V(1.6), X(0.9), V(1.6)); });
        B.fill(P.red, (b) => { b.m(X(3.4), V(-0.6)); b.c(X(4.2), V(-0.2), X(4.8), V(0.6), X(5.0), V(1.2)); b.c(X(4.3), V(0.6), X(3.8), V(0.2), X(3.4), V(-0.6)); });
        B.fill(P.red, (b) => { b.m(X(3.0), V(-1.6)); b.c(X(3.8), V(-1.3), X(4.4), V(-0.7), X(4.6), V(-0.2)); b.c(X(4.0), V(-0.6), X(3.4), V(-1.0), X(3.0), V(-1.6)); });
        // ears: red inside
        B.fill(P.red, (b) => { b.m(X(2.4), V(4.9)); b.c(X(2.8), V(6.4), X(3.6), V(7.8), X(4.3), V(8.4)); b.c(X(4.6), V(7.2), X(4.4), V(5.8), X(3.9), V(4.8)); b.l(X(2.4), V(4.9)); });
      }
      B.fill(P.gold, (b) => { b.m(U(0), V(5.4)); b.c(U(0.9), V(4.8), U(0.7), V(3.9), U(0), V(3.3)); b.c(U(-0.7), V(3.9), U(-0.9), V(4.8), U(0), V(5.4)); });
      B.fill(P.ink, (b) => b.e(U(0), V(-6.85), 0.065, 0.035));
      B.stroke(P.red, 0.022, (b) => { b.m(U(-1.2), V(-7.6)); b.q(U(0), V(-7.0), U(1.2), V(-7.6)); });
    }, { rough: 0.32 });
    K.sculpt((p) => {
      let d = sd.ell(p, [0, 1.4, 0.2], [5.4, 4.6, 2.4]);
      d = sd.u(d, sd.cone(p, [0, 0.2, 1.3], [0, -6.1, 2.3], 2.4, 1.0), 1.4);
      d = sd.u(d, sd.sphere(p, [0, -6.7, 2.6], 0.95), 0.6);
      for (const sx of [-1, 1]) {
        d = sd.u(d, sd.cone([p[0], p[1], (p[2] - 0.4) * 2.2 + 0.4], [sx * 3.0, 4.6, 0.4], [sx * 4.4, 8.4, 0.4], 1.9, 0.35), 0.8);
        d = sd.u(d, sd.ell(p, [sx * 2.2, 3.0, 1.9], [1.7, 0.7, 0.9]), 0.7);
        d = sd.cut(d, sd.ell(p, [sx * 2.4, 2.0, 2.5], [1.5, 0.45, 0.6]), 0.4);
      }
      return Math.max(d, -p[2] - 0.2);
    }, [-7, -8.2, -0.6, 7, 9.6, 4.6], 0.3, { mat: face, col: 0xffffff, uvMap: (p) => [(p[0] + 7) / 14, (p[1] + 8) / 18] });
    return K.build();
  },
  cord() { const K = new Kit(); cordRing(K, 11, 0.3, { col: 0xd8302a, grow: 0.05 }); return K.build(); },

  // ================================================================== body pieces (metric voxel units)
  spike(size) {
    const K = new Kit();
    const hl = size * 0.62;
    const out = smooth([[0, -hl], [size * 0.45, -hl * 0.55], [size * 1.05, -hl * 0.05], [size * 0.5, hl * 0.6], [0, hl]], 4, true);
    K.with([0, 0, 0], [0, Math.PI / 2, 0], 1, () => K.slab(out, 1.5, { mat: MAT.fur, b: 0.7, col: (q) => (q[0] > size * 0.6 ? SPIKE_D : SPIKE) }));
    return K.build();
  },
  tailSeg(len, r0, r1, spikeH) {
    const K = new Kit();
    const path = [];
    for (let k = 0; k <= 6; k++) path.push([0, 0, -len * k / 6]);
    K.tube(path, (t) => lerp(r0, r1, t), { sides: 16, caps: 'round', mat: MAT.fur, col: (p) => (p[1] < -0.3 * lerp(r0, r1, -p[2] / len) ? DINO_BELLY : DINO) });
    if (spikeH) {
      const z = -len * 0.5, y = lerp(r0, r1, 0.5) * 0.92;
      const out = smooth([[-spikeH, 0], [spikeH, 0], [spikeH * 0.2, spikeH * 1.05], [-spikeH * 0.3, spikeH * 0.6]], 4, true);
      K.with([0, y - 0.4, z], [0, Math.PI / 2, 0], 1, () => K.slab(out, 1.2, { mat: MAT.fur, b: 0.55, col: SPIKE }));
    }
    return K.build();
  },
  /** The box robot (chest bone, V units); dims from the wearer: X half width, Y0..Y1, Zb..Zf. */
  box(X, Y0, Y1, Zb, Zf) {
    const CB = 0xc89a5e, TAPE = 0xe8d6a6, T = 0.9;
    const K = new Kit();
    const face = K.paint(`boxface`, 256, 256, (g, w, h) => {
      g.fillStyle = '#c89a5e'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(120,80,40,0.18)'; for (let y = 6; y < h; y += 26) g.fillRect(0, y, w, 2);
      g.fillStyle = '#e8d6a6'; g.fillRect(w * 0.45, 0, w * 0.1, h * 0.26);
      g.fillStyle = '#1c1418'; g.strokeStyle = '#1c1418'; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const sx of [-1, 1]) { g.beginPath(); g.roundRect(w * (0.5 + sx * 0.2) - 26, h * 0.34, 52, 34, 7); g.fill(); g.fillStyle = '#f8f4ea'; g.beginPath(); g.arc(w * (0.5 + sx * 0.2) + 8, h * 0.34 + 10, 6, 0, TAU); g.fill(); g.fillStyle = '#1c1418'; }
      g.lineWidth = 6; g.beginPath(); g.roundRect(w * 0.26, h * 0.56, w * 0.48, h * 0.17, 6); g.stroke();
      g.lineWidth = 4; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(w * (0.26 + k * 0.08), h * 0.565); g.lineTo(w * (0.26 + k * 0.08), h * 0.72); g.stroke(); }
    }, { rough: 0.9 });
    const side = K.paint(`boxside`, 128, 256, (g, w, h) => {
      g.fillStyle = '#c89a5e'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(120,80,40,0.18)'; for (let y = 6; y < h; y += 26) g.fillRect(0, y, w, 2);
      g.strokeStyle = '#1c1418'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const x of [0.32, 0.68]) { g.beginPath(); g.moveTo(w * x, h * 0.78); g.lineTo(w * x, h * 0.5); g.moveTo(w * x - 14, h * 0.56); g.lineTo(w * x, h * 0.48); g.lineTo(w * x + 14, h * 0.56); g.stroke(); }
      g.lineWidth = 5; g.beginPath(); g.moveTo(w * 0.2, h * 0.84); g.lineTo(w * 0.8, h * 0.84); g.stroke();
    }, { rough: 0.9 });
    const H = Y1 - Y0, D = Zf - Zb, ym = (Y0 + Y1) / 2, zm = (Zf + Zb) / 2;
    const rect = (w, h) => smooth([[-w, -h], [w, -h], [w, h], [-w, h]], 1, true);
    // front, back, sides (the painted faces outward)
    K.with([0, ym, Zf - T / 2], [0, 0, 0], 1, () => K.slab(rect(X, H / 2), T, { mat: MAT.card, col: CB, b: 0.2, faceMat: face, faceCol: 0xffffff, uvMap: (x, y) => [(x + X) / (2 * X), (y + H / 2) / H] }));
    K.with([0, ym, Zb + T / 2], [0, Math.PI, 0], 1, () => K.slab(rect(X, H / 2), T, { mat: MAT.card, col: CB, b: 0.2 }));
    for (const sx of [-1, 1]) K.with([sx * (X - T / 2), ym, zm], [0, sx * Math.PI / 2, 0], 1, () => K.slab(rect(D / 2 - T, H / 2), T, { mat: MAT.card, col: CB, b: 0.2, faceMat: side, faceCol: 0xffffff, uvMap: (x, y) => [(x + D / 2) / D, (y + H / 2) / H] }));
    // flaps folded outward at the top
    for (const [ax, sgn] of [['z', 1], ['z', -1], ['x', 1], ['x', -1]]) {
      const len = ax === 'z' ? D * 0.45 : X * 0.8;
      if (ax === 'z') K.with([0, Y1, sgn > 0 ? Zf - T / 2 : Zb + T / 2], [sgn * 0.75 - Math.PI / 2, 0, 0], 1, () => K.slab(smooth([[-X + 0.6, 0], [X - 0.6, 0], [X - 0.9, len], [-X + 0.9, len]], 1, true), T * 0.8, { mat: MAT.card, col: shade(CB, 0.92), b: 0.2 }));
      else K.with([sgn * (X - T / 2), Y1, zm], [0, sgn * Math.PI / 2, 0], 1, () => K.with([0, 0, 0], [-0.75 - Math.PI / 2 + Math.PI, 0, 0], 1, () => K.slab(smooth([[-D / 2 + 1.2, 0], [D / 2 - 1.2, 0], [D / 2 - 1.6, -len], [-D / 2 + 1.6, -len]], 1, true), T * 0.8, { mat: MAT.card, col: shade(CB, 0.92), b: 0.2 })));
    }
    // two buttons (a red one, a blue one)
    for (const [x, c] of [[X - 4, 0xe5383b], [-X + 4, 0x3f86e8]]) K.with([x, Y0 + 4, Zf + 0.1], [Math.PI / 2, 0, 0], 1, () => K.lathe([[0, -0.3], [1.3, -0.3], [1.3, 0.3], [1.0, 0.7], [0, 0.8]], { seg: 16, mat: MAT.gloss, col: c }));
    void TAPE;
    return K.build();
  },
  /** The thumbnails' display head: carved, varnished wood on a short neck. */
  mannequin() {
    const K = new Kit();
    K.sculpt((p) => {
      let d = sd.box(p, [0, 6, 2.4], [6.4, 9.8, 8.1], 4.4);
      d = sd.u(d, sd.ell(p, [0, 1.6, 9.6], [0.9, 1.6, 1.4]), 0.8); // a hint of a nose
      d = sd.u(d, sd.cone(p, [0, -2, 1.2], [0, -12.5, 0.8], 4.0, 4.4), 1.2);
      return Math.max(d, -(p[1] + 12));
    }, [-8, -12.5, -7.5, 8, 17, 12.5], 0.62, { mat: MAT.wood, col: (p) => (p[1] < -4 ? 0x9c805e : 0xb89a74) });
    return K.build();
  },
};
