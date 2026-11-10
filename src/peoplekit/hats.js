// Hats, hoods and helmets of the big wardrobe (src/cosmetics/catalog.js, more.js), in head units (head bone at the
// origin, +z the face, +x the wearer's left; chin -4, eyes 6, brows 8, hair line 13.2, crown 16, cranium centre z 2.4).
// Crown hats are built sitting on the hair (the catalogue lifts them by the hair's thickness); hoods and helmets hug
// the head. Every builder returns a BufferGeometry (src/peoplekit/kit.js).
import { Kit, MAT, HEAD, v3, oval, smooth, headRing, headPt, frontZ, sd, shade, mix, lerp } from './kit.js';
import { hood, ear, bead, toothAt, cordRing, pompom, brush, INK, WHITE, GOLD } from './parts.js';

const TAU = Math.PI * 2, CZ = 2.4, SZ = 1.16; // hats are ovals: the head is deeper than it is wide
/** An oval ring of n points at height y, half width rx (depth rx * SZ), centred on the cranium. */
const ring = (rx, y, n = 48, sz = SZ, dz = 0) => oval(rx, rx * sz, n).map(([x, z]) => [x, y, CZ + dz + z]);
/** A lathe centred on the cranium (oval by SZ). */
function hat(K, prof, o = {}) { K.with([0, 0, CZ + (o.dz || 0)], [0, 0, 0], 1, () => K.lathe(prof, { seg: 48, sz: SZ, ...o })); }
/** A brim: from an oval of half width r0 at y0 out to r1 (depth r1 * sz1) at y1, droop / curl by shape. */
function brim(K, r0, y0, r1, y1, th, o = {}) {
  const n = 64, A = oval(r0, r0 * SZ, n), B = oval(r1, r1 * (o.sz1 ?? SZ), n);
  const inner = A.map(([x, z]) => [x, y0, CZ + z]), outer = B.map(([x, z]) => [x, y1, CZ + (o.dz1 || 0) + z]);
  K.washer(inner, outer, th, { rows: 7, ...o });
}
const onCap = (dir, g) => headPt(dir, g);

export const HATS = {
  // ================================================================== on the hair (crown group)
  strawhat() {
    const STRAW = 0xe6c264, STRAW_D = 0xc8a048, BAND = 0xc8302a;
    const K = new Kit();
    hat(K, [[8.0, 12.4], [7.95, 14.5], [7.7, 17.6], [7.2, 19.5], [5.6, 20.4], [2.4, 20.5], [0, 20.25]], { mat: MAT.straw, col: STRAW, sub: 3 });
    hat(K, [[7.45, 12.6], [7.1, 18.8], [0, 19.6]], { mat: MAT.straw, col: STRAW_D, flip: true });
    brim(K, 7.9, 12.7, 13.6, 11.6, 0.55, { mat: MAT.straw, col: STRAW, underCol: STRAW_D, shape: (p, t) => [p[0], p[1] - t * t * 0.9 + (t > 0.92 ? (t - 0.92) * 3 : 0), p[2]] });
    hat(K, [[8.12, 13.7], [8.16, 14.4], [8.12, 15.3]], { mat: MAT.cloth, col: BAND });
    // the band's knot on the left
    K.sculpt((p) => sd.u(sd.ell(p, [8.1, 14.5, CZ + 1], [0.7, 0.9, 1.0]), sd.cone(p, [8.2, 14.3, CZ + 0.4], [8.5, 12.8, CZ - 0.6], 0.55, 0.45), 0.3), [6.8, 11.8, 0, 9.6, 16, 4.6], 0.18, { mat: MAT.cloth, col: shade(BAND, 0.9) });
    return K.build();
  },
  beret() {
    const C = 0x8a2a34;
    const K = new Kit();
    hat(K, [[7.95, 13.4], [8.4, 14.6], [10.2, 15.8], [10.5, 16.9], [9.4, 18.3], [6, 19.3], [2, 19.6], [0, 19.6]], { mat: MAT.cloth, col: C, sub: 3, shift: (y) => [(y - 13.4) / 6 * 1.9, 0.2] });
    hat(K, [[7.6, 13.6], [9.6, 15.9], [8.2, 18.0], [0, 18.8]], { mat: MAT.cloth, col: shade(C, 0.75), flip: true, shift: (y) => [(y - 13.4) / 6 * 1.9, 0.2] });
    K.tube(ring(7.98, 13.5, 48).map((p) => [p[0], p[1], p[2]]), 0.32, { closed: true, sides: 8, mat: MAT.leather, col: 0x3a1e22 });
    K.tube([[1.9, 19.4, CZ + 0.2], [2.0, 20.6, CZ + 0.3]], 0.28, { sides: 8, caps: 'round', mat: MAT.cloth, col: shade(C, 0.85) });
    return K.build();
  },
  kappa() {
    const K = new Kit();
    // a cap of green hair under the dish, and a fringe of wet locks round it
    hat(K, [[7.6, 13.4], [7.6, 14.6], [6.4, 16.2], [0, 16.6]], { mat: MAT.fur, col: 0x4e9a42, sub: 2 });
    const N = 22;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * TAU + (k % 2) * 0.08, s = Math.sin(a), c = Math.cos(a);
      const root = [s * 6.6, 15.4, CZ + c * 7.7], len = 3.2 + (k % 3) * 0.6;
      const tip = [s * (8.2 + (k % 2) * 0.5), 15.2 - len, CZ + c * (9.4 + (k % 2) * 0.5)];
      const mid = [s * 8.4, 14.6, CZ + c * 9.6];
      K.tube(smooth([root, mid, [tip[0] + c * 0.4, tip[1], tip[2] - s * 0.4]], 4), (t) => 1.05 * (1 - t) ** 0.8 + 0.12, { sides: 7, caps: 'round', mat: MAT.fur, col: k % 3 ? 0x5aa64a : 0x3e8a3a });
    }
    // the dish: a pale glazed saucer, a little water in it
    K.with([0, 0, CZ + 0.3], [0, 0, 0], 1, () => {
      K.lathe([[5.4, 15.8], [6.0, 16.4], [6.1, 17.4], [5.7, 17.7], [5.3, 17.2], [3.6, 16.75], [0, 16.6]], { seg: 40, sz: 1.08, mat: MAT.gloss, col: 0xe8e0c6 });
      K.lathe([[5.2, 17.05], [0, 17.05]], { seg: 40, sz: 1.08, mat: MAT.glass, col: 0x6ab4e0, flip: true });
    });
    return K.build();
  },
  onigiri() {
    const RICE = 0xfbf8ee, NORI = 0x1e2a22;
    const K = new Kit();
    const tri = (x, y) => { // exact isosceles triangle: apex at y 27, base 16.4 wide at y 14
      const px = Math.abs(x), py = 27 - y, qx = 8.2, qy = 13;
      const k = Math.max(0, Math.min(1, (px * qx + py * qy) / (qx * qx + qy * qy)));
      const ax = px - qx * k, ay = py - qy * k;
      const kb = Math.max(0, Math.min(1, px / qx)), bx = px - qx * kb, by = py - qy;
      const d = Math.min(ax * ax + ay * ay, bx * bx + by * by);
      const s = Math.max(px * qy - py * qx, py - qy);
      return Math.sqrt(d) * Math.sign(s || -1);
    };
    K.sculpt((p) => {
      const d2 = tri(p[0], p[1]) + 1.9, dz = Math.abs(p[2] - 2) - 3.0;
      let d = Math.hypot(Math.max(d2, 0), Math.max(dz, 0)) + Math.min(Math.max(d2, dz), 0) - 1.9;
      for (const [x, y, z] of [[-5.6, 16.4, 5.4], [-3.4, 21, 5.7], [2.2, 23.5, 5.6], [5.4, 18.5, 5.5], [-6.2, 15, 3], [6.4, 15.6, 0], [0.4, 25.6, 4.6], [-1.6, 24.2, -1.4]]) d = sd.u(d, sd.ell(p, [x, y, z], [0.75, 0.45, 0.45]), 0.25);
      return d;
    }, [-10, 12.5, -3.5, 10, 28.5, 7.5], 0.45, { mat: MAT.soft, col: (p) => (p[1] < 14.6 ? 0xe8e2d0 : RICE) });
    // the nori, wrapped round the bottom front to back
    const nori = smooth([[-3.1, 14], [3.1, 14], [3.1, 19.2], [-3.1, 19.2]], 1, true);
    for (const [zf, ry] of [[7.15, 0], [-3.15, Math.PI]]) K.with([0, 0, zf], [0, ry, 0], 1, () => K.plate(nori, () => 0, 0.22, { mat: MAT.paper, col: NORI, rings: 2 }));
    for (const [x, y] of [[-2, 22], [3, 20], [1, 24.3], [-3.4, 18.6]]) K.blob([x, y, 7.25], [0.32, 0.18, 0.12], { mat: MAT.soft, col: 0x3a2f20, seg: 8 });
    return K.build();
  },
  pigeonBody() {
    const G = 0x8e94a4, G2 = 0x6e7486, BAR = 0x3e4252, BELLY = 0xb4b8c4;
    const K = new Kit();
    K.sculpt((p) => {
      let d = sd.ell(p, [0, 19.6, 0], [5.1, 3.8, 7.0]);
      d = sd.u(d, sd.ell(p, [0, 21.6, 3.6], [3.0, 2.8, 2.8]), 1.4); // the neck rising to the head
      d = sd.u(d, sd.ell([p[0], p[1] - (p[2] + 7) * -0.12, p[2]], [0, 20.2, -9.0], [2.6, 0.75, 3.2]), 0.9); // tail
      for (const sx of [-1, 1]) d = sd.u(d, sd.ell(p, [sx * 4.3, 20.2, -1.4], [1.3, 2.5, 5.6]), 0.8); // folded wings
      return d;
    }, [-7, 14.8, -13, 7, 25, 7.5], 0.5, { mat: MAT.fur, col: (p, n) => (p[1] < 18 ? BELLY : Math.abs(p[0]) > 4.6 && Math.abs(p[2] + 1.6) < 0.6 ? BAR : Math.abs(p[0]) > 4.6 && Math.abs(p[2] - 0.4) < 0.5 ? BAR : p[2] < -10 ? BAR : p[1] > 21 && p[2] > 2 ? mix(G, 0x5a9a7a, 0.6) : G) });
    for (const sx of [-1, 1]) for (const a of [-0.5, 0, 0.5]) K.tube([[sx * 1.9, 16.4, 1.6], [sx * 1.9 + Math.sin(a) * 1.5, 15.7, 1.6 + Math.cos(a) * 1.5]], 0.26, { sides: 6, caps: 'round', mat: MAT.plastic, col: 0xd85a5a });
    void G2;
    return K.build();
  },
  pigeonHead() {
    const K = new Kit();
    K.sculpt((p) => sd.u(sd.ell(p, [0, 24.7, 5.4], [2.7, 2.9, 3.0]), sd.ell(p, [0, 22.8, 4.6], [2.2, 2.0, 2.2]), 1.0), [-3.5, 20.5, 1.8, 3.5, 28, 9], 0.3, { mat: MAT.fur, col: (p) => (p[1] < 23.4 ? (p[0] > 0 ? 0x6a9a82 : 0x8a72a8) : 0x8e94a4) });
    K.with([0, 24.5, 8.0], [Math.PI / 2 - 0.25, 0, 0], 1, () => K.lathe([[0, -0.3], [0.62, 0], [0.48, 0.8], [0.18, 1.5], [0, 1.6]], { seg: 10, mat: MAT.plastic, col: 0x3a2e2e, sz: 0.8 }));
    K.blob([0, 25.1, 8.15], [0.6, 0.4, 0.45], { mat: MAT.soft, col: 0xf0ece4, seg: 10 });
    for (const sx of [-1, 1]) { K.blob([sx * 2.45, 25.3, 6.3], [0.5, 0.55, 0.55], { mat: MAT.eye, col: 0xf08a2a, seg: 12 }); K.blob([sx * 2.85, 25.3, 6.45], [0.2, 0.3, 0.3], { mat: MAT.eye, col: INK, seg: 8 }); }
    return K.build();
  },
  curlers() {
    const COL = [0xf49ac0, 0x8ac8f0, 0xf4d070];
    const K = new Kit();
    [[-4, 17.4, 6], [0, 18, 6.4], [4, 17.4, 6], [-5, 18.4, 1.2], [0, 19.2, 1.4], [5, 18.4, 1.2], [-4, 17.2, -3.4], [0, 17.8, -3.6], [4, 17.2, -3.4]].forEach(([x, y, z], n) => {
      const c = COL[n % 3];
      K.with([x, y, z], [0, 0, Math.PI / 2], 1, () => {
        // a mesh roller: hollow tube with ridges, rims at the ends
        const prof = [];
        for (let k = 0; k <= 8; k++) prof.push([1.85 + (k % 2 ? 0.12 : 0), -2 + k * 0.5]);
        K.lathe(prof, { seg: 16, mat: MAT.plastic, col: c });
        K.lathe([[1.2, 2.0], [1.2, -2.0]], { seg: 16, mat: MAT.plastic, col: shade(c, 0.7) });
        for (const e of [-2.05, 2.05]) K.lathe(e < 0 ? [[1.2, e], [2.05, e], [2.05, e + 0.25], [1.2, e + 0.25]] : [[1.2, e - 0.25], [2.05, e - 0.25], [2.05, e], [1.2, e]], { seg: 16, mat: MAT.plastic, col: 0xf8f6f2 });
      });
      K.tube([[x - 2.6, y + 0.4, z + 1.2], [x + 2.6, y + 0.4, z + 1.2]], 0.13, { sides: 5, caps: 'round', mat: MAT.metal, col: 0xd8d8dc });
    });
    return K.build();
  },
  explorer() {
    const K0 = 0xd8c08a, BAND = 0x7a5a36;
    const K = new Kit();
    hat(K, [[8.5, 13.4], [8.7, 15.2], [8.3, 17.8], [6.6, 20.4], [3.4, 21.6], [0, 21.85]], { mat: MAT.cloth, col: K0, sub: 3 });
    hat(K, [[8.0, 13.6], [7.9, 17.4], [0, 20.8]], { mat: MAT.cloth, col: 0x6a7a4a, flip: true });
    hat(K, [[8.86, 13.6], [8.9, 15.0]], { mat: MAT.cloth, col: BAND });
    brim(K, 8.4, 13.7, 11.6, 11.7, 0.6, { mat: MAT.cloth, col: K0, underCol: 0x6a7a4a, sz1: 1.4, shape: (p, t) => [p[0], p[1] - t * t * 0.8, p[2]] });
    K.with([0, 21.75, CZ], [0, 0, 0], 1, () => K.lathe([[1.1, 0], [1.05, 0.35], [0.6, 0.6], [0, 0.65]], { seg: 16, mat: MAT.cloth, col: shade(K0, 0.9) }));
    K.stitch(ring(8.93, 14.3, 96), 0.07, { closed: true, col: 0x5a4024, dash: 0.5, gap: 0.35 });
    return K.build();
  },
  crown() {
    const AU = 0xf6c838, AU2 = 0xc8901e;
    const K = new Kit();
    const seg = 80, top = (a) => 17.2 + Math.abs(Math.cos(a * 2.5)) ** 3 * 6.4;
    const wall = (r, y) => (i, j) => { const a = (i / seg) * TAU; const yy = lerp(13, top(a), j / 8); return [Math.sin(a) * r, y ? yy : yy, CZ + Math.cos(a) * r * 1.15]; };
    K.grid(seg, 8, wall(8.25), { wrapU: true, mat: MAT.metal, col: AU, out: (p) => [p[0], 0, p[2] - CZ] });
    K.grid(seg, 8, wall(7.75), { wrapU: true, mat: MAT.metal, col: AU2, out: (p) => [-p[0], 0, -(p[2] - CZ)] });
    K.grid(seg, 3, (i, k) => { const a = (i / seg) * TAU, r = lerp(8.25, 7.75, k / 3), y = top(a) + Math.sin((k / 3) * Math.PI) * 0.22; return [Math.sin(a) * r, y, CZ + Math.cos(a) * r * 1.15]; }, { wrapU: true, mat: MAT.metal, col: AU, out: () => [0, 1, 0] });
    for (const y of [13.25, 15.9]) K.tube(oval(8.42, 8.42 * 1.15, 64).map(([x, z]) => [x, y, CZ + z]), 0.32, { closed: true, sides: 8, mat: MAT.metal, col: AU2 });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; K.blob([Math.sin(a) * 8.0, 23.9, CZ + Math.cos(a) * 9.2], 0.75, { mat: MAT.gloss, col: 0xfff2f0, seg: 14 }); }
    for (const [a, c] of [[0, 0xd8303a], [0.65, 0x3a7ad8], [-0.65, 0x3ab06a], [Math.PI * 0.55, 0x3a7ad8], [-Math.PI * 0.55, 0xd8303a]]) {
      const p = [Math.sin(a) * 8.45, 14.6, CZ + Math.cos(a) * 8.45 * 1.15];
      K.with(p, [0, a, 0], 1, () => K.lathe([[0, -0.2], [0.85, 0], [0.75, 0.35], [0, 0.55]], { seg: 8, mat: MAT.gloss, col: c }));
    }
    // a velvet cap inside
    hat(K, [[7.7, 13.4], [7.6, 17], [5.2, 19.6], [0, 20.4]], { mat: MAT.cloth, col: 0xa8202e, sub: 2, sz: 1.15 });
    return K.build();
  },
  sprout() {
    const K = new Kit();
    K.tube(smooth([[0, 14.8, 2], [0.2, 17.5, 2], [-0.1, 20.4, 2.1], [0, 21.6, 2]], 4), (t) => 0.42 - t * 0.12, { sides: 8, mat: MAT.plastic, col: 0x5aa04a, caps: 'round' });
    const leaf = smooth([[0, 0], [1.6, 1.2], [3.6, 1.3], [5.2, 0.3], [3.8, -0.9], [1.6, -0.9]], 4, true);
    for (const sx of [-1, 1]) K.with([0, 21.6, 2], [0, sx > 0 ? 0 : Math.PI, sx * 0.25], 1, () => K.plate(leaf, (x) => -0.05 * x * x + 0.0, 0.35, { mat: MAT.plastic, col: (p, side) => (side === 'front' && Math.abs(p[1]) < 0.12 ? 0x4a8a3a : sx > 0 ? 0x6ab84a : 0x7ac85a), rings: 6 }));
    return K.build();
  },
  catears() {
    const BK = 0x2a2428, PK = 0xf09ab0;
    const K = new Kit();
    const arc = [];
    for (let a = -1.25; a <= 1.25001; a += 0.125) arc.push(headPt([Math.sin(a), Math.cos(a) * 1.05, 0.05], 0.35, [0, 6.2, 3]));
    K.tube(arc, 0.42, { sides: 8, ry: 0.45, up: [0, 0, 1], mat: MAT.plastic, col: BK, caps: 'round' });
    for (const sx of [-1, 1]) {
      const base = headPt([sx * 0.62, 1, 0.05], 0.5, [0, 6.2, 3]);
      ear(K, base, { shape: 'point', w: 3.2, h: 5.4, th: 0.9, col: BK, inner: PK, lean: -sx * 0.32, tilt: -0.1 });
    }
    return K.build();
  },
  oniHorns() {
    const K = new Kit();
    for (const sx of [-1, 1]) {
      const path = smooth([[sx * 3.8, 14.2, 2.2], [sx * 4.4, 18, 2.2], [sx * 5.2, 21.4, 1.9], [sx * 6.5, 23.6, 1.6]], 4);
      K.tube(path, (t) => 2.1 * (1 - t) ** 0.9 + 0.12, { sides: 14, caps: 'round', mat: MAT.gloss, col: (p) => (p[1] > 21.5 ? 0xfff6dc : Math.floor((p[1] - 14) / 1.5) % 2 ? 0xf4e2a8 : 0xe6cc8e) });
    }
    return K.build();
  },
  oniBand() {
    const K = new Kit();
    const tiger = K.paint('tigerBand', 256, 32, (g, w, h) => {
      g.fillStyle = '#f2c030'; g.fillRect(0, 0, w, h); g.fillStyle = '#1c1618';
      for (let k = 0; k < 14; k++) { const x = (k / 14) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 9, 0); g.lineTo(x + 3, h * 0.55); g.lineTo(x + 8, h); g.lineTo(x - 2, h); g.lineTo(x + 1, h * 0.5); g.fill(); }
    }, { rough: 0.85 });
    K.band({ y: 12.5, h: 1.9, th: 0.55, grow: 0.15, mat: tiger, col: 0xffffff, uv: (i, j) => [i / 10, (j / 56) * 4], rawUV: true });
    return K.build();
  },
  towel() {
    const K = new Kit();
    const out = smooth([[-5.2, -3.4], [5.2, -3.4], [5.4, 0], [5.2, 8.4], [-5.2, 8.4], [-5.4, 0]], 2, true);
    K.with([0, 16.6, 0], [-Math.PI / 2, 0, 0], 1, () => K.plate(out.map(([x, y]) => [x, -y + 2.5]), (x, y) => 0.6 - (x / 5.4) ** 2 * 0.9 + Math.sin((y + 6) * 0.9) * 0.08, 1.7, {
      mat: MAT.knit, rings: 8, col: (p) => { const z = -p[1] + 2.5; return Math.abs(z - 6.2) < 0.55 || Math.abs(z + 1.2) < 0.55 ? 0x5a86c8 : 0xfcfaf4; },
    }));
    return K.build();
  },
  octopus() {
    const R = 0xe0503a, R2 = 0xc23a2a, S = 0xf4c0b0;
    const K = new Kit();
    K.sculpt((p) => {
      let d = sd.ell(p, [0, 21.6, 0.2], [5.4, 6.2, 5.8]);
      d = sd.u(d, sd.ell(p, [0, 16.6, 1.2], [6.6, 2.4, 7.2]), 1.6);
      d = sd.u(d, sd.cone(p, [0, 16.8, 6.4], [0, 16.0, 9.0], 1.0, 0.85), 0.6); // the siphon / mouth
      d = sd.cut(d, sd.sphere(p, [0, 16.0, 9.3], 0.55), 0.2);
      return d;
    }, [-8, 13.4, -8, 8, 28.5, 10.5], 0.5, { mat: MAT.soft, col: (p) => (p[1] < 16 ? R2 : R) });
    for (const sx of [-1, 1]) bead(K, [sx * 2.4, 19.1, 5.5], 1.1, { dir: [sx * 0.3, 0, 1], pupil: 0.55 });
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * TAU, s = Math.sin(a), c = Math.cos(a);
      if (c > 0.85) continue; // keep the face clear
      const pts = [];
      for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push(onCap([s, 0.8 - t * 1.25, c * 1.05], 0.55 + (1 - t) * 0.6)); }
      const tip = pts[5], curl = [tip[0] + s * 1.2, tip[1] + 0.9, tip[2] + c * 1.2];
      K.tube(smooth(pts.concat([curl]), 3), (t) => 1.35 * (1 - t) + 0.25, { sides: 9, caps: 'round', mat: MAT.soft, col: R });
      for (let k = 1; k <= 4; k++) { const p = pts[k], q = v3.norm(v3.sub(p, HEAD.C)); K.blob(v3.add(p, v3.mul(q, -0.2)), 0.36, { mat: MAT.soft, col: S, seg: 8 }); }
    }
    return K.build();
  },
  conductor() {
    const NV = 0x22305a, NV2 = 0x1a2446;
    const K = new Kit();
    hat(K, [[8.1, 12.9], [8.25, 14.2], [8.9, 17.2], [9.4, 18.9], [9.0, 19.4], [5, 19.55], [0, 19.6]], { mat: MAT.cloth, col: NV });
    hat(K, [[7.7, 13.0], [8.6, 18.8], [0, 19.1]], { mat: MAT.cloth, col: NV2, flip: true });
    hat(K, [[8.3, 13.5], [8.33, 14.8]], { mat: MAT.metal, col: 0xe0b23a });
    hat(K, [[9.38, 18.75], [9.42, 19.0]], { mat: MAT.cloth, col: NV2 });
    // the glossy black peak
    const n = 33, inner = [], outer = [];
    for (let k = 0; k < n; k++) { const a = -1.25 + (2.5 * k) / (n - 1); inner.push([Math.sin(a) * 8.15, 13.1, CZ + Math.cos(a) * 9.4]); const o = Math.sin(((k / (n - 1)) * Math.PI)) ** 0.6; outer.push([Math.sin(a) * (8.15 + o * 0.6), 13.1 - o * 1.5, CZ + Math.cos(a) * (9.4 + o * 5.4)]); }
    K.washer(inner, outer, 0.45, { closed: false, rows: 5, mat: MAT.gloss, col: 0x141418 });
    // the badge: a winged wheel
    const f = frontZ(0, 16.2, 0.9) + 0.25;
    K.with([0, 16.2, f], [-0.15, 0, 0], 1, () => {
      K.lathe([[0, -0.3], [0.9, -0.3], [1.0, 0], [0.8, 0.3], [0, 0.35]], { seg: 16, mat: MAT.metal, col: 0xf4d050, sz: 1 });
      for (const sx of [-1, 1]) K.slab(smooth([[sx * 0.8, -0.4], [sx * 3.2, 0.5], [sx * 2.8, 1.0], [sx * 0.8, 0.5]], 2, true), 0.3, { mat: MAT.metal, col: 0xe8c040, b: 0.12 });
    });
    return K.build();
  },
  chef() {
    const WH = 0xf8f6f0;
    const K = new Kit();
    // a band round the head, then the pleated, puffed crown
    K.shell({ grow: 0.1, th: 0.6, open: (p) => p[1] < 9.6 || p[1] > 14.6, pole: [0, 0, 1], inner: false, mat: MAT.cloth, col: 0xeeebe4 });
    K.band({ y: 11.6, h: 3.6, th: 0.7, grow: 0.15, mat: MAT.cloth, col: 0xeeebe4 });
    hat(K, [[8.05, 13.2], [8.2, 15.5], [8.6, 18.5], [9.9, 21.6], [10.2, 23.4], [9.0, 25.2], [5.4, 26.0], [0, 26.1]], { mat: MAT.cloth, col: WH, sub: 3, seg: 96, sx: (y, a) => 1 + (y > 14 ? 0.035 * Math.cos(a * 14) : 0), sz: (y, a) => SZ * (1 + (y > 14 ? 0.035 * Math.cos(a * 14) : 0)) });
    return K.build();
  },
  propCap() {
    const K = new Kit();
    const quads = K.paint('propQuads', 256, 64, (g, w, h) => {
      const Q = ['#e5383b', '#ffd23f', '#3f86e8', '#58c06c'];
      for (let k = 0; k < 4; k++) { g.fillStyle = Q[k]; g.fillRect((k * w) / 4, 0, w / 4 + 1, h); }
      g.fillStyle = 'rgba(40,20,20,0.35)'; for (let k = 0; k < 4; k++) g.fillRect((k * w) / 4 - 1, 0, 2, h);
      g.fillStyle = '#f4f0e6'; g.fillRect(0, h - 10, w, 10);
    }, { rough: 0.85 });
    K.shell({ grow: 0.15, th: 1.3, open: (p) => p[1] < 10.2, pole: [0, 1, 0], mat: quads, col: 0xffffff, hem: 0.45, uv: (i, j) => [((i / 48) + 0.125) % 1.0001, j / 18], rawUV: true, hemMat: MAT.cloth, hemCol: 0xf4f0e6, innerMat: MAT.cloth, innerCol: 0xd8d4cc });
    K.with([0, 0, CZ - 0.2], [0, 0, 0], 1, () => K.lathe([[0.55, 17.4], [0.5, 19.6], [0.75, 19.8], [0.6, 20.3], [0, 20.4]], { seg: 12, mat: MAT.metal, col: 0xa8aab0 }));
    return K.build();
  },
  propBlade() {
    const K = new Kit();
    K.lathe([[0, -0.6], [0.9, -0.5], [1.0, 0.3], [0.6, 0.8], [0, 0.95]], { seg: 16, mat: MAT.gloss, col: 0xffd23f });
    const blade = smooth([[0.6, -0.5], [3.2, -0.9], [6.6, -0.75], [7.3, 0], [6.6, 0.75], [3.2, 0.9], [0.6, 0.5]], 4, true);
    for (const [s, c] of [[1, 0xe5383b], [-1, 0x3f86e8]]) K.with([0, 0.1, 0], [Math.PI / 2, s > 0 ? 0 : Math.PI, 0], 1, () => K.with([0, 0, 0], [s * 0.0, 0, 0], 1, () => K.plate(blade, (x, y) => y * 0.22 * (x / 7), 0.32, { mat: MAT.gloss, col: c, rings: 6 })));
    return K.build();
  },
  /** A twisted hand towel tied round the head (the ramen chef's), knotted at the front left. */
  towelBand() {
    const K = new Kit();
    const path = headRing(11.6, 1.0, 72, 0.5);
    K.tube(path, 1.05, { closed: true, sides: 10, ry: 0.85, twist: 22, mat: MAT.knit, col: (p, u) => (Math.abs(((u * 2) % 1) - 0.5) < 0.16 ? 0xe6e2da : 0xfcfaf4) });
    const k = headPt([0.55, 0, 0.84], 1.4, [0, 11.6, HEAD.C[2]]);
    K.sculpt((p) => sd.u(sd.ell(p, k, [1.5, 1.3, 1.2]), sd.cone(p, k, [k[0] + 1.6, k[1] + 1.6, k[2] + 0.4], 0.8, 0.5), 0.5), [k[0] - 2, k[1] - 2, k[2] - 2, k[0] + 3.4, k[1] + 3.4, k[2] + 2], 0.22, { mat: MAT.knit, col: 0xfcfaf4 });
    return K.build();
  },
  // ================================================================== hugging the head (cover)
  beanie() {
    const C = 0xe0a830;
    const K = new Kit();
    const knit = K.paint('knitMustard', 64, 64, (g, w, h) => {
      g.fillStyle = '#d89c2a'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < 4; x++) for (let y = 0; y < 8; y++) {
        const cx = x * 16 + 8, cy = y * 8;
        g.fillStyle = '#e8b038'; g.beginPath(); g.moveTo(cx - 7, cy); g.quadraticCurveTo(cx - 6, cy + 8, cx - 0.5, cy + 9); g.lineTo(cx - 1, cy + 2); g.fill();
        g.beginPath(); g.moveTo(cx + 7, cy); g.quadraticCurveTo(cx + 6, cy + 8, cx + 0.5, cy + 9); g.lineTo(cx + 1, cy + 2); g.fill();
      }
      g.fillStyle = 'rgba(120,70,10,0.45)'; for (let x = 0; x < 4; x++) g.fillRect(x * 16 + 7, 0, 2, h);
    }, { rough: 0.95 });
    K.shell({ grow: 0.2, th: 1.4, open: (p) => p[1] < 11.6, pole: [0, 1, 0.1], mat: knit, col: 0xffffff, uv: (i, j) => [(i / 48) * 22, (j / 18) * 9], rawUV: true, inner: false, hem: 0.2 });
    // the folded, ribbed cuff
    K.band({ y: 11.2, h: 3.4, th: 1.3, grow: 0.2, seg: 72, mat: knit, col: shade(0xffffff, 0.9), uv: (i, j) => [i / 10 * 0.5, (j / 72) * 26], rawUV: true });
    pompom(K, [0, 21.4, 1.8], 2.8, 0xfff2d0, 0xf0dcb0);
    void C;
    return K.build();
  },
  shrub() {
    const K = new Kit();
    const leaves = K.paint('shrubLeaves', 128, 128, (g, w, h) => {
      g.fillStyle = '#3e7a32'; g.fillRect(0, 0, w, h);
      const L = [[18, 20, 0.6, '#5ea448'], [70, 14, -0.4, '#74bc52'], [110, 40, 0.9, '#4e8e3a'], [40, 60, -0.8, '#74bc52'], [90, 76, 0.3, '#5ea448'], [20, 100, 0.5, '#4e8e3a'], [64, 112, -0.2, '#74bc52'], [112, 104, 1.2, '#5ea448'], [50, 36, 1.6, '#4e8e3a'], [100, 0, 2.2, '#74bc52']];
      for (const [x, y, a, c] of L) for (const [dx, dy] of [[0, 0], [w, 0], [0, h], [-w, 0], [0, -h]]) {
        g.save(); g.translate(x + dx, y + dy); g.rotate(a); g.fillStyle = c;
        g.beginPath(); g.moveTo(-15, 0); g.quadraticCurveTo(0, -11, 15, 0); g.quadraticCurveTo(0, 11, -15, 0); g.fill();
        g.strokeStyle = 'rgba(30,60,24,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-13, 0); g.lineTo(13, 0); g.stroke(); g.restore();
      }
    }, { rough: 0.9 });
    hood(K, { col: 0x4a8a3a, rim: 0x3a6a2a, mat: MAT.fur });
    const clumps = [[0, 19.5, 1, 4.6], [-6.2, 16.4, 2.6, 3.8], [6.4, 16, 1.4, 3.9], [-4, 17.8, -5, 4.2], [4.4, 17.4, -4.8, 4.0], [0, 14, -8.6, 4.2], [-8.4, 9.6, -1.4, 3.4], [8.4, 9.2, -2, 3.4], [-8, 4, 2.4, 3.0], [8, 3.6, 2, 3.0], [-3.8, 18.8, 6.6, 3.2], [3.6, 18.4, 7.2, 3.1], [-7.4, 13, 6.4, 2.7], [7.4, 12.6, 6.6, 2.7], [0, 6, -9.4, 3.4], [-6, 2, -6.6, 3], [6, 2, -6.4, 3]];
    K.sculpt((p) => {
      let d = 1e9;
      for (const [x, y, z, r] of clumps) {
        const q = [p[0] - x, p[1] - y, p[2] - z], L = v3.len(q);
        if (L - r * 1.4 > d + 1.2) continue;
        d = sd.u(d, L - r, 1.2);
        for (const [a, b, c] of [[0.55, 0.5, 0.2], [-0.5, 0.35, 0.45], [0.1, -0.2, 0.7]]) d = sd.u(d, v3.len([q[0] - a * r, q[1] - b * r, q[2] - c * r]) - r * 0.5, 0.5);
      }
      return d;
    }, [-13, -1.5, -14, 13, 25, 12], 0.62, { mat: leaves, col: 0xffffff });
    K.tube(smooth([[1.2, 22, 0.6], [2.2, 24.6, 0.9], [3.4, 26.6, 0.4]], 3), (t) => 0.32 - t * 0.18, { sides: 6, caps: 'round', mat: MAT.wood, col: 0x6a4a2a });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; K.blob([-5.9 + Math.cos(a) * 0.75, 17.6 + Math.sin(a) * 0.75, 9.1], [0.7, 0.7, 0.25], { mat: MAT.soft, col: 0xffffff, seg: 8 }); }
    K.blob([-5.9, 17.6, 9.35], 0.38, { mat: MAT.soft, col: 0xffd23f, seg: 8 });
    return K.build();
  },
  paperbag() {
    const KR = 0xc9a068, KR2 = 0xb48a56;
    const K = new Kit();
    const face = K.paint('bagFace', 256, 320, (g, w, h) => {
      g.fillStyle = '#c9a068'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(120,84,44,0.35)'; g.lineWidth = 2;
      for (const [x0, y0, x1, y1] of [[20, 40, 90, 120], [180, 30, 230, 150], [60, 200, 140, 260], [170, 220, 240, 300], [10, 260, 70, 300]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
      g.fillStyle = '#1c1416';
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(w / 2 + sx * 48, h * 0.42, 16, 20, 0, 0, TAU); g.fill(); }
      g.strokeStyle = '#3a2a24'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(w / 2 - 60, h * 0.62); g.quadraticCurveTo(w / 2, h * 0.72, w / 2 + 60, h * 0.62); g.stroke();
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(w / 2 + sx * 72, h * 0.34); g.lineTo(w / 2 + sx * 30, h * 0.31); g.stroke(); }
    }, { rough: 0.9 });
    const X = 9.4, Z0 = -7.8, Z1 = 12.4, Y0 = -7.6, Y1 = 21.4, T = 0.45, H = Y1 - Y0, ym = (Y0 + Y1) / 2, D = Z1 - Z0, zm = (Z0 + Z1) / 2;
    const rect = (w, h) => smooth([[-w, -h], [w, -h], [w, h], [-w, h]], 1, true);
    const crumple = (p) => [p[0], p[1], p[2] + Math.sin(p[0] * 0.7 + p[1] * 0.4) * 0.12];
    K.with([0, ym, Z1], [0, 0, 0], 1, () => K.slab(rect(X, H / 2), T, { mat: MAT.paper, col: KR, b: 0.15, faceMat: face, faceCol: 0xffffff, uvMap: (x, y) => [(x + X) / (2 * X), (y + H / 2) / H], bend: crumple }));
    K.with([0, ym, Z0], [0, Math.PI, 0], 1, () => K.slab(rect(X, H / 2), T, { mat: MAT.paper, col: KR, b: 0.15, bend: crumple }));
    for (const sx of [-1, 1]) K.with([sx * X, ym, zm], [0, sx * Math.PI / 2, 0], 1, () => K.slab(rect(D / 2, H / 2), T, { mat: MAT.paper, col: KR2, b: 0.15, bend: (p) => [p[0], p[1], p[2] - 0.9 * Math.max(0, 1 - Math.abs(p[0]) / (D / 2)) * (p[1] > H / 2 - 4 ? 0 : 1)] }));
    K.with([0, Y1, zm], [-Math.PI / 2, 0, 0], 1, () => K.slab(rect(X, D / 2), T, { mat: MAT.paper, col: shade(KR, 0.95), b: 0.15 }));
    // the folded rim at the bottom
    K.tube(smooth([[-X - 0.3, Y0 + 0.4, Z1 + 0.3], [X + 0.3, Y0 + 0.4, Z1 + 0.3], [X + 0.3, Y0 + 0.4, Z0 - 0.3], [-X - 0.3, Y0 + 0.4, Z0 - 0.3]], 1, true), 0.7, { closed: true, sides: 6, ry: 0.5, sq: 6, up: [0, 1, 0], mat: MAT.paper, col: 0xd8b47c });
    return K.build();
  },
  pompadour(col = 0x2a2428) {
    const K = new Kit();
    const d = shade(col, 0.72), hi = mix(col, 0xc8d0e8, 0.35);
    K.shell({ grow: 0.15, th: 1.6, open: (p) => (p[2] > 8.4 && p[1] < 13.6) || p[1] < (p[2] > 0 ? 7 : 3.2), pole: [0, 0.5, -1], mat: MAT.fur, col: (p, side) => (side === 'out' ? col : d), hem: 0.3 });
    const grooves = [-4.8, -2.4, 0, 2.4, 4.8];
    K.sculpt((p) => {
      // the quiff: a great rolled wave jutting out over the brow like a ship's prow
      let s = sd.ell(p, [0, 18.6, 7.6], [7.7, 6.0, 10.2]);
      s = sd.u(s, sd.ell(p, [0, 18.2, 16.6], [6.3, 4.8, 4.8]), 2.4);
      s = sd.u(s, sd.ell(p, [0, 16.6, 20.6], [4.6, 3.2, 2.6]), 1.6);
      s = sd.cut(s, sd.ell(p, [0, 12.2, 17.4], [6.2, 2.8, 4.8]), 1.2); // swept up underneath
      for (const gx of grooves) s = sd.cut(s, sd.cone(p, [gx * 0.85, 24.6, 3], [gx * 0.6, 19.6, 23.6], 0.42, 0.3), 0.3);
      return s;
    }, [-9, 10.5, -1, 9, 25.5, 24], 0.46, { mat: MAT.gloss, col: (p, n) => (n[1] > 0.55 && p[2] > 6 && Math.abs(p[0]) < 4.5 ? hi : col) });
    return K.build();
  },
  yurei() {
    const K = new Kit();
    K.band({ y: 10.3, h: 0.8, th: 0.35, grow: 0.05, mat: MAT.cloth, col: 0xece8de });
    const tri = smooth([[-3.9, 0], [3.9, 0], [0.15, 5.6], [-0.15, 5.6]], 3, true);
    K.plate(tri.map(([x, y]) => [x, y + 9.2]), (x, y) => frontZ(x, y, 0.1) + 0.12, 0.2, { mat: MAT.cloth, col: (p, side) => (side === 'front' ? 0xfcfaf4 : 0xe4e0d6), rings: 6 });
    return K.build();
  },
  tiehead() {
    const K = new Kit();
    const stripes = K.paint('tieStripes', 64, 64, (g, w, h) => {
      g.fillStyle = '#2a3a78'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8302a';
      for (let k = -2; k < 4; k++) { g.beginPath(); g.moveTo(k * 24, 0); g.lineTo(k * 24 + 9, 0); g.lineTo(k * 24 + 9 + 30, h); g.lineTo(k * 24 + 30, h); g.fill(); }
      g.fillStyle = '#e8e4dc'; for (let k = -2; k < 4; k++) { g.beginPath(); g.moveTo(k * 24 + 12, 0); g.lineTo(k * 24 + 14, 0); g.lineTo(k * 24 + 44, h); g.lineTo(k * 24 + 42, h); g.fill(); }
    }, { rough: 0.6 });
    K.band({ y: 12.4, h: 1.7, th: 0.5, grow: 0.15, mat: stripes, col: 0xffffff, uv: (i, j) => [i / 10, (j / 56) * 14], rawUV: true });
    K.sculpt((p) => sd.box(p, [7.9, 12.3, -2], [0.9, 1.15, 1.2], 0.6), [6.4, 10.4, -4, 9.6, 14.2, 0], 0.2, { mat: stripes, col: 0xffffff, uvMap: (p) => [p[2] * 0.2, p[1] * 0.2] });
    const blade = smooth([[-1.0, 0], [1.0, 0], [1.6, -7.0], [0, -8.4], [-1.6, -7.0]], 2, true);
    K.with([8.5, 11.4, -2.6], [0.1, Math.PI / 2 + 0.3, 0.05], 1, () => K.plate(blade, (x, y) => 0.02 * y * y * 0 + Math.sin(y * 0.4) * 0.2, 0.3, { mat: stripes, col: 0xffffff, rings: 5, uvMap: (x, y) => [x * 0.18, y * 0.18] }));
    return K.build();
  },
  kasa() {
    const P = 0xd8343a, RIB = 0x6a3a22;
    const K = new Kit();
    const sag = (y, a) => 1 - 0.07 * Math.abs(Math.sin(a * 4)) * Math.max(0, 1 - (y - 13.6) / 8);
    K.with([0, 0, CZ], [0, 0, 0], 1, () => {
      K.lathe([[12.6, 13.6], [10.6, 15.6], [7.6, 18.3], [4.2, 20.8], [1.2, 22.4], [0, 22.6]], { seg: 64, sub: 2, mat: MAT.paper, col: (p) => (p[1] < 14.2 ? shade(P, 0.85) : P), sx: sag, sz: sag });
      K.lathe([[12.2, 13.5], [7.4, 17.9], [0, 22.1]], { seg: 64, mat: MAT.paper, col: shade(P, 0.7), flip: true, sx: sag, sz: sag });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + Math.PI / 8;
        const pts = [[12.7, 13.55], [10.7, 15.65], [7.7, 18.35], [4.3, 20.85], [1.2, 22.45]].map(([r, y]) => [Math.sin(a) * r, y + 0.1, Math.cos(a) * r]);
        K.tube(pts, 0.2, { sides: 5, caps: 'round', mat: MAT.wood, col: RIB });
      }
      K.lathe([[0.45, 22.3], [0.5, 24.4], [0.85, 24.7], [0, 25.3]], { seg: 10, mat: MAT.wood, col: RIB });
    });
    // one big eye on the canopy and the long tongue hanging off the rim
    const ep = [0, 18.0, CZ + 9.2];
    K.with(ep, [-0.72, 0, 0], 1, () => { K.plate(oval(2.3, 2.0, 28), () => 0.3, 0.4, { mat: MAT.gloss, col: 0xfffaf0, rings: 4 }); K.plate(oval(1.05, 1.2, 20, 2, 0.2, -0.1), () => 0.62, 0.2, { mat: MAT.eye, col: INK, rings: 3 }); });
    K.tube(smooth([[2.8, 13.9, CZ + 11.2], [3.2, 12.2, CZ + 12.0], [3.0, 10.4, CZ + 11.6], [3.5, 9.6, CZ + 11.0]], 4), (t) => 0.9 - t * 0.2, { sides: 10, ry: 0.35, up: [0, 0, 1], caps: 'round', mat: MAT.soft, col: 0xf07a8a });
    return K.build();
  },
  helmet(o) {
    const K = new Kit();
    K.shell({ grow: o.grow ?? 0.85, th: o.th ?? 1.5, open: (p) => p[1] < (p[2] > 4 ? -5.4 : -6.4), pole: [0, 1, 0], seg: 64, rings: 24, mat: o.mat ?? MAT.gloss, col: (p, side) => (side === 'out' ? o.col(p) : o.inner ?? 0x2a2a30), hem: 0.4, hemCol: o.hem ?? 0x2a2a30, hemMat: MAT.rubber });
    return K;
  },
  ranger() {
    const R = 0xd8303a, W = 0xf4f2ec;
    const K = HATS.helmet({ col: (p) => (Math.abs(p[0]) < 0.9 && p[1] > 9.5 && p[2] > -4 ? W : R) });
    const vz = (x, y) => frontZ(x, y, 2.45) + 0.04;
    const T = smooth([[-6.1, 9.2], [6.1, 9.2], [6.0, 6.4], [2.0, 5.8], [1.7, 2.6], [-1.7, 2.6], [-2.0, 5.8], [-6.0, 6.4]], 2, true);
    K.plate(T, vz, 0.24, { mat: MAT.eye, col: 0x14161c, rings: 6, c: [0, 7.4] });
    K.plate(smooth([[-3.4, -4.6], [3.4, -4.6], [3.8, 1.8], [-3.8, 1.8]], 2, true), vz, 0.24, { mat: MAT.metal, col: 0xc8ccd4, rings: 5 });
    for (const sx of [-1, 1]) K.with([sx * 8.1, 4.5, 3.5], [0, sx * Math.PI / 2, 0], 1, () => K.lathe([[0, -0.2], [1.3, -0.2], [1.3, 0.3], [0.9, 0.5], [0, 0.55]], { seg: 16, mat: MAT.metal, col: 0xc8ccd4 }));
    return K.build();
  },
  astro() {
    const K = HATS.helmet({ grow: 1.2, th: 1.6, mat: MAT.plastic, col: (p) => (Math.abs(p[0]) < 0.9 && p[1] > 12 && p[2] > -6 ? 0xe5383b : 0xf2f4f6) });
    const vz = (x, y) => frontZ(x, y, 2.9) + 0.05;
    K.plate(oval(7.0, 7.4, 48, 2, 0, 5.4), vz, 0.3, { mat: MAT.eye, col: (p) => (p[1] > 8 && p[0] < -2 ? 0x4a6a9a : 0x18223a), rings: 8 });
    K.tube(oval(7.2, 7.6, 64, 2, 0, 5.4).map(([x, y]) => [x, y, vz(x, y) + 0.1]), 0.45, { closed: true, sides: 8, mat: MAT.metal, col: 0xd8a838 });
    K.tube(headRing(-5.6, 2.2, 56), 0.9, { closed: true, sides: 10, ry: 0.8, mat: MAT.plastic, col: 0xb8bcc4 });
    for (const sx of [-1, 1]) K.with([sx * 9.4, 9, 1], [0, 0, -sx * Math.PI / 2], 1, () => K.lathe([[0.8, -0.3], [0.8, 1.2], [0.5, 1.4], [0, 1.45]], { seg: 12, mat: MAT.metal, col: 0xa8acb4 }));
    return K.build();
  },

  // ================================================================== the 1999 closet (more.js)
  duck() {
    const Y = 0xf8d64a, Y2 = 0xfce67e, BILL = 0xf59a2c, BILL2 = 0xd8781e;
    const K = new Kit();
    K.blob([0, 7.6, 2.6], [11.2, 12.2, 11.4], { seg: 48, rings: 28, mat: MAT.fur, col: (p) => (p[1] > 15 ? Y2 : Y) });
    K.sculpt((p) => {
      let up = sd.ell(p, [0, 5.0, 15.4], [6.2, 2.0, 6.0]);
      up = sd.u(up, sd.ell(p, [0, 6.0, 12.2], [5.2, 2.2, 3.4]), 1.2);
      const lo = sd.ell(p, [0, 2.7, 14.0], [4.8, 1.5, 4.4]);
      return Math.max(sd.u(up, lo, 0.4), -(p[2] - 10.4));
    }, [-7, 0.4, 9.6, 7, 8.6, 22], 0.36, { mat: MAT.plastic, col: (p) => (p[1] < 3.9 ? BILL2 : BILL) });
    for (const sx of [-1, 1]) {
      K.blob([sx * 1.8, 6.9, 19.6], [0.4, 0.25, 0.3], { mat: MAT.matte, col: BILL2, seg: 8 });
      bead(K, [sx * 5.0, 11.0, 12.6], 1.5, { white: false, pupil: 1, dir: [sx * 0.4, 0, 1] });
      K.blob([sx * 9.6, 5.6, 9.6], [1.5, 0.9, 0.5], { mat: MAT.fur, col: 0xf4a0a0, seg: 12 });
    }
    for (const [x, h, lean] of [[-0.8, 3.6, -0.45], [0, 4.6, 0], [0.8, 3.6, 0.45]]) K.tube(smooth([[x, 19.2, 2.2], [x + lean * 1.2, 19.2 + h * 0.6, 1.6], [x + lean * 2.2, 19.2 + h, 0.4]], 3), (t) => 0.75 * (1 - t) + 0.12, { sides: 7, caps: 'round', mat: MAT.fur, col: Y2 });
    return K.build();
  },
  hachimaki() {
    const K = new Kit();
    const strip = K.paint('hisshoBand', 512, 32, (g, w, h) => {
      g.fillStyle = '#faf4e6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d42a2a'; for (const x of [0, w]) { g.beginPath(); g.ellipse(x, h / 2, 13, 13, 0, 0, TAU); g.fill(); }
      g.strokeStyle = '#2a2224'; g.lineCap = 'round'; g.lineWidth = 3.2;
      const glyph = (x0) => { // brushed marks (stylised characters)
        g.beginPath(); g.moveTo(x0, 9); g.lineTo(x0 + 12, 8); g.moveTo(x0 + 6, 5); g.lineTo(x0 + 5, 27); g.moveTo(x0 + 1, 17); g.quadraticCurveTo(x0 + 8, 15, x0 + 13, 22); g.stroke();
        g.beginPath(); g.moveTo(x0 + 18, 7); g.lineTo(x0 + 18, 26); g.moveTo(x0 + 18, 7); g.lineTo(x0 + 29, 9); g.lineTo(x0 + 27, 25); g.moveTo(x0 + 19, 16); g.lineTo(x0 + 27, 16); g.stroke();
      };
      glyph(30); glyph(w - 64);
    }, { rough: 0.9 });
    K.band({ y: 11.4, h: 2.3, th: 0.65, grow: 0.12, mat: strip, col: 0xffffff, uv: (i, j) => [i / 10, j / 56], rawUV: true });
    const b = headPt([0, 0, -1], 0.6, [0, 11.4, HEAD.C[2]]);
    K.blob([b[0], b[1], b[2] - 0.5], [1.5, 1.3, 1.0], { mat: MAT.cloth, col: 0xece6d8, seg: 12 });
    for (const sx of [-1, 1]) K.tube(smooth([[sx * 0.6, b[1] - 0.4, b[2] - 0.8], [sx * 1.9, 8.6, b[2] - 1.4], [sx * 2.8, 5.8, b[2] - 1.6]], 4), 1.0, { sides: 8, ry: 0.26, sq: 5, up: [0, 0, 1], mat: MAT.cloth, col: 0xfaf4e6, caps: 'flat' });
    return K.build();
  },
  daruma() {
    const R = 0xd8342e, GOLD2 = 0xe8b440;
    const K = new Kit();
    const hole = [6.2, 7.9, 3.4];
    hood(K, { col: R, rim: 0xf6f0e2, hole, th: 2.0, mat: MAT.gloss, paint: (p) => ((p[0] / 7.6) ** 2 + ((p[1] - 3.4) / 9.4) ** 2 < 1 && p[2] > 3 ? 0xf6f0e2 : R) });
    const fz = (x, y) => frontZ(x, y, 2.35);
    for (const sx of [-1, 1]) {
      const brow = [];
      for (let k = 0; k <= 8; k++) { const t = k / 8, x = sx * (1.0 + t * 5.2), y = 12.6 + Math.sin(t * Math.PI) * 1.8 - t * 0.6; brow.push([x, y, fz(x, y) + 0.1]); }
      K.tube(brow, (t) => 0.75 * Math.sin(Math.PI * (0.15 + t * 0.85)) + 0.15, { sides: 8, ry: 0.5, caps: 'round', mat: MAT.gloss, col: INK });
      for (let w = 0; w < 3; w++) { const pts = []; for (let k = 0; k <= 5; k++) { const t = k / 5, x = sx * (4.6 + t * 2.6), y = -1.4 - w * 1.2 - t * 0.8; pts.push([x, y, fz(x, y) + 0.1]); } K.tube(pts, 0.22, { sides: 6, caps: 'round', mat: MAT.metal, col: GOLD2 }); }
    }
    // a gold good-fortune mark on the forehead
    const fp = [0, 17.6, 0];
    fp[2] = fz(0, 17.6) + 0.1;
    const mark = K.paint('fukuMark', 64, 64, (g, w, h) => {
      g.fillStyle = '#e8b440'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#7a1a14';
      const r = (x, y, ww, hh) => g.fillRect(x, y, ww, hh);
      r(10, 14, 14, 4); r(15, 8, 4, 48); r(8, 26, 18, 4); r(30, 10, 26, 4); r(32, 18, 22, 12); r(34, 21, 18, 6); g.fillStyle = '#e8b440'; r(36, 22, 14, 4); g.fillStyle = '#7a1a14'; r(30, 34, 26, 22); g.fillStyle = '#e8b440'; r(34, 38, 8, 6); r(44, 38, 8, 6); r(34, 47, 8, 5); r(44, 47, 8, 5);
    }, { rough: 0.35 });
    K.with(fp, [-0.35, 0, 0], 1, () => K.plate(smooth([[-2.2, 0], [0, 2.4], [2.2, 0], [0, -2.4]], 2, true), () => 0, 0.2, { mat: mark, col: 0xffffff, rings: 3, uvMap: (x, y) => [(x + 2.2) / 4.4, (y + 2.4) / 4.8] }));
    return K.build();
  },
  capsuleHat() {
    const P = 0xff8ab4;
    const K = new Kit();
    K.with([0, 0, CZ], [0, 0, 0], 1, () => {
      K.lathe([[10.4, 8.5], [10.45, 10.5], [10.0, 14.6], [8.2, 18.2], [4.8, 20.3], [0, 20.9]], { seg: 56, sub: 3, sz: 1.08, mat: MAT.gloss, col: P });
      K.lathe([[9.6, 8.6], [9.2, 14.2], [0, 19.9]], { seg: 56, sz: 1.08, mat: MAT.gloss, col: shade(P, 0.7), flip: true });
      K.lathe([[9.55, 7.5], [10.9, 7.6], [11.0, 8.6], [10.4, 8.9], [9.55, 8.9]], { seg: 56, sz: 1.08, mat: MAT.plastic, col: 0xeee2c8 });
    });
    const star = [];
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r = i % 2 ? 0.95 : 2.2; star.push([Math.sin(a) * r, Math.cos(a) * r]); }
    const sp = [4.6, 15.6, 0];
    sp[2] = CZ + 10.9 * 1.08 * Math.sqrt(Math.max(0, 1 - (4.6 / 10.6) ** 2 - ((15.6 - 8.5) / 12.6) ** 2)) - 0.2;
    K.with(sp, [-0.5, 0.42, 0], 1, () => K.slab(smooth(star, 2, true), 0.25, { mat: MAT.gloss, col: 0xffd23f, b: 0.1 }));
    return K.build();
  },
  fishHat() {
    const K0 = 0x9a9868, K2 = 0x86845a, BAND = 0x6a5a3a;
    const K = new Kit();
    hat(K, [[8.35, 12.9], [8.3, 14.8], [7.6, 19.4], [6.6, 20.2], [3.4, 20.5], [0, 20.5]], { mat: MAT.cloth, col: K0, sub: 3 });
    hat(K, [[7.9, 13.0], [7.2, 19.4], [0, 19.6]], { mat: MAT.cloth, col: K2, flip: true });
    hat(K, [[8.4, 13.4], [8.38, 15.0]], { mat: MAT.cloth, col: BAND });
    brim(K, 8.3, 13.0, 12.6, 10.4, 0.5, { mat: MAT.cloth, col: K0, underCol: K2, ease: (t) => t, shape: (p, t) => [p[0], p[1] - t * t * 0.4, p[2]] });
    for (const r of [0.45, 0.75]) K.stitch(oval(lerp(8.3, 12.6, r), lerp(8.3, 12.6, r) * SZ, 96).map(([x, z]) => [x, lerp(13.0, 10.4, r) - r * r * 0.4 + 0.3, CZ + z]), 0.07, { closed: true, col: K2, dash: 0.6, gap: 0.4 });
    for (const y of [16.6, 18.2]) K.stitch(oval(lerp(8.3, 7.7, (y - 14.8) / 4.6) + 0.06, (lerp(8.3, 7.7, (y - 14.8) / 4.6) + 0.06) * SZ, 96).map(([x, z]) => [x, y, CZ + z]), 0.07, { closed: true, col: K2, dash: 0.6, gap: 0.4 });
    // the lures on the left of the crown: a red-and-white spoon and a feathered fly
    K.with([8.4, 16.4, CZ + 2.2], [0, Math.PI / 2, -0.25], 1, () => {
      K.slab(smooth([[0, 1.8], [0.9, 0.6], [0.8, -1.2], [0, -2.0], [-0.8, -1.2], [-0.9, 0.6]], 3, true), 0.3, { mat: MAT.metal, col: (p) => (p[1] > 0.4 || p[1] < -0.9 ? 0xd8342e : 0xf0ece4), b: 0.12 });
      K.tube(smooth([[0, -2.0, 0], [0, -2.9, 0.3], [0, -3.1, -0.4], [0, -2.6, -0.6]], 3), 0.08, { sides: 5, mat: MAT.metal, col: 0xc8c8d0 });
    });
    K.sculpt((p) => sd.u(sd.cone(p, [8.5, 17.8, CZ - 1.8], [8.9, 19.8, CZ - 3.6], 0.45, 0.15), sd.cone(p, [8.5, 17.8, CZ - 1.8], [8.6, 19.6, CZ - 2.4], 0.4, 0.12), 0.2), [7.6, 17, CZ - 4.4, 9.8, 20.6, CZ - 1], 0.14, { mat: MAT.fur, col: (p) => (p[1] > 18.8 ? 0x5aa04a : 0xffd23f) });
    return K.build();
  },
  kabuto() {
    const K = new Kit();
    const news = K.paint('newsprint', 256, 256, (g, w, h) => {
      g.fillStyle = '#eae4d2'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#9a96a0';
      for (let col = 0; col < 6; col++) for (let y = 8; y < h - 4; y += 7) { const x0 = 6 + col * 42; for (let x = x0; x < x0 + 36; x += 6) if ((x * 7 + y * 3) % 11 > 2) g.fillRect(x, y, 4, 2); }
      g.fillStyle = '#c8302a'; g.fillRect(14, 30, 120, 26); g.fillStyle = '#eae4d2'; for (let k = 0; k < 5; k++) g.fillRect(22 + k * 22, 36, 14, 14);
      g.fillStyle = '#7a7680'; g.fillRect(150, 90, 80, 56); g.fillStyle = '#b8b4bc'; g.fillRect(156, 96, 68, 22);
    }, { rough: 0.92 });
    const T = 0.25;
    const tri = smooth([[-11.6, 0], [11.6, 0], [0.4, 14], [-0.4, 14]], 1, true);
    for (const [z0, tilt, ry] of [[11.0, -0.36, 0], [-6.2, 0.3, Math.PI]]) K.with([0, 13, z0], [tilt, ry, 0], 1, () => K.slab(tri, T, { mat: MAT.paper, col: 0xeae4d2, b: 0.1, faceMat: news, faceCol: 0xffffff, uvMap: (x, y) => [(x + 11.6) / 23.2, y / 14] }));
    // the folded cuff and the horn flaps
    K.with([0, 13.1, 11.4], [-0.45, 0, 0], 1, () => K.slab(smooth([[-12, 0], [12, 0], [10.4, 2.4], [-10.4, 2.4]], 1, true), T * 1.6, { mat: MAT.paper, col: 0xd8d2c0, b: 0.12, faceMat: news, faceCol: 0xffffff, uvMap: (x, y) => [(x + 12) / 24 * 0.5, y / 14] }));
    for (const sx of [-1, 1]) K.with([sx * 5.6, 14.6, 11.6], [-0.3, -sx * 0.35, sx * 0.42], 1, () => K.slab(smooth([[-3.2, 0], [3.2, 0], [0.5, 8.2], [-0.5, 8.2]], 1, true), T, { mat: MAT.paper, col: 0xeae4d2, b: 0.1, faceMat: news, faceCol: 0xffffff, uvMap: (x, y) => [(x + 3.2) / 6.4 * 0.3 + 0.6, y / 8.2 * 0.4] }));
    return K.build();
  },
  sakuraClip() {
    const PK = 0xf6bcd0, PK2 = 0xe896b4;
    const K = new Kit();
    const petal = smooth([[0, 0], [1.3, 0.9], [1.5, 2.4], [0.5, 3.3], [0, 2.8], [-0.5, 3.3], [-1.5, 2.4], [-1.3, 0.9]], 4, true);
    for (let i = 0; i < 5; i++) K.with([0, 0, 0.1], [0, 0, (i / 5) * TAU], 1, () => K.plate(petal, (x, y) => 0.12 * y - 0.05 * x * x, 0.3, { mat: MAT.plastic, col: (p) => (p[1] < 1 ? PK2 : PK), rings: 6, c: [0, 1.4] }));
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; K.tube([[0, 0, 0.3], [Math.sin(a) * 0.9, Math.cos(a) * 0.9, 0.85]], 0.06, { sides: 4, mat: MAT.plastic, col: 0xf2c84a }); K.blob([Math.sin(a) * 0.95, Math.cos(a) * 0.95, 0.9], 0.15, { mat: MAT.plastic, col: 0xd8a83a, seg: 6 }); }
    K.blob([5, -3, 0], [1.1, 1.4, 1.0], { mat: MAT.plastic, col: PK2, seg: 12 });
    K.with([1.4, -2, -0.9], [0, 0, 0], 1, () => K.slab(smooth([[-4.4, -0.45], [4.4, -0.45], [4.6, 0.45], [-4.4, 0.45]], 1, true), 0.35, { mat: MAT.metal, col: 0xc8c8d0, b: 0.12 }));
    return K.build();
  },
  kagami() {
    const M = 0xfaf6ea;
    const K = new Kit();
    const sq = smooth([[-8, -8], [8, -8], [8, 8], [-8, 8]], 1, true);
    K.with([0, 14, CZ], [-Math.PI / 2, 0, 0], 1, () => K.plate(sq, (x, y) => -0.15 * ((x / 8) ** 4 + (y / 8) ** 4), 0.3, { mat: MAT.paper, col: (p, side) => (Math.max(Math.abs(p[0]), Math.abs(p[1])) > 7.2 ? 0xd8302a : 0xfaf4e6), rings: 6 }));
    K.sculpt((p) => Math.max(sd.ell(p, [0, 16.6, CZ], [7.0, 2.6, 7.0]), 14.2 - p[1]), [-8, 14, CZ - 8, 8, 19.5, CZ + 8], 0.45, { mat: MAT.soft, col: (p) => (p[1] < 15.6 ? 0xece6d6 : M) });
    K.sculpt((p) => Math.max(sd.ell(p, [0, 20.4, CZ], [5.3, 2.2, 5.3]), 18.6 - p[1]), [-6.5, 18.2, CZ - 6.5, 6.5, 23, CZ + 6.5], 0.42, { mat: MAT.soft, col: (p) => (p[1] < 19.3 ? 0xece6d6 : M) });
    K.blob([0, 23.9, CZ], [2.55, 2.2, 2.55], { mat: MAT.soft, col: 0xf08a2a, seg: 20 });
    K.tube([[0, 25.9, CZ], [0.1, 26.6, CZ]], 0.22, { sides: 6, caps: 'round', mat: MAT.wood, col: 0x5a4a2a });
    K.with([0.4, 26.3, CZ + 0.3], [0.3, 0.4, -0.5], 1, () => K.plate(smooth([[0, 0], [1.1, 0.7], [2.6, 0.6], [3.4, 0], [2.4, -0.5], [1.0, -0.5]], 3, true), (x) => -0.04 * x * x, 0.22, { mat: MAT.plastic, col: 0x5a8a3a, rings: 5 }));
    return K.build();
  },
  visor() {
    const K = new Kit();
    K.band({ y: 11.6, h: 1.4, th: 0.5, grow: 0.15, mat: MAT.rubber, col: 0x2a2a2a });
    const n = 33, inner = [], outer = [];
    for (let k = 0; k < n; k++) { const a = -1.3 + (2.6 * k) / (n - 1); const p = headPt([Math.sin(a), 0, Math.cos(a)], 0.6, [0, 12.1, HEAD.C[2]]); inner.push(p); const o = Math.sin((k / (n - 1)) * Math.PI) ** 0.55; outer.push([p[0] * (1 + o * 0.15), 12.2 - o * 1.2, p[2] + o * 6.8]); }
    K.washer(inner, outer, 0.3, { closed: false, rows: 5, mat: MAT.glass, col: 0x2ab070 });
    K.tube(outer, 0.24, { sides: 6, mat: MAT.plastic, col: 0x2a7a4a });
    K.tube(inner.map((p) => [p[0], p[1] + 0.1, p[2]]), 0.42, { sides: 6, ry: 1.6, up: [0, 1, 0], mat: MAT.plastic, col: 0x2a7a4a });
    return K.build();
  },
  santa() {
    const R = 0xd8342e, FUR = 0xf6f0e2;
    const K = new Kit();
    K.shell({ grow: 0.35, th: 1.3, open: (p) => p[1] < 12.4, pole: [0, 1, -0.1], mat: MAT.cloth, col: R, inner: false });
    K.band({ y: 12.2, h: 2.8, th: 2.0, grow: 0.3, mat: MAT.fur, col: FUR });
    const path = smooth([[0, 17.2, 0.8], [1.4, 21.4, 0.2], [4.6, 23.4, -0.6], [8.2, 22.6, -1.2], [10.2, 20.4, -1.4]], 4);
    K.tube(path, (t) => 6.2 * (1 - t) ** 1.1 + 0.6, { sides: 16, mat: MAT.cloth, col: (p) => (p[0] > 7 ? shade(R, 0.85) : R) });
    pompom(K, [10.6, 19.6, -1.4], 2.3, FUR, 0xe2dccc);
    return K.build();
  },
  chonmage(skin = 0xecc8aa) {
    const HAIR = 0x24202a;
    const K = new Kit();
    const pate = (p) => Math.abs(p[0]) < 6.0 && p[2] > -3.2 && p[1] > 13.2;
    K.shell({ grow: 0.1, th: 1.0, open: (p) => !pate(p), pole: [0, 1, 0.35], mat: MAT.soft, col: skin, inner: false, hem: 0.1 });
    K.shell({ grow: 0.15, th: 1.7, open: (p) => pate(p) || (p[2] > 8.4 && p[1] < 13.6) || p[1] < (p[2] > 0 ? 6.4 : 2), pole: [0, 0.2, -1], mat: MAT.fur, col: HAIR, hem: 0.3 });
    // the topknot: oiled, folded forward along the crown, tied with white cord
    const top = smooth([[0, 18.0, -6.6], [0, 19.6, -4.4], [0, 20.4, -1], [0, 20.7, 2.8], [0, 20.2, 5.6]], 4);
    K.tube(top, (t) => 1.25 - t * 0.35, { sides: 12, ry: 0.8, caps: 'round', mat: MAT.gloss, col: HAIR });
    K.tube(smooth([[0, 20.2, -1.9], [0, 20.25, -1.1]], 1), 1.42, { sides: 12, ry: 0.8, mat: MAT.cloth, col: 0xfaf4e6 });
    return K.build();
  },
};
