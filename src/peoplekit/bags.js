// Things worn on the body (src/cosmetics/catalog.js, more.js), in metric 'voxel' units (V = height / 140, so one unit is
// about 1.2 cm): the capsule and teddy backpacks and the thief's furoshiki (on the chest bone, against the back at
// z = 0, hanging down from y = 0), the yukata's obi (round the waist), a loosened tie, the tanuki tail's segments, and the
// kigurumi hoods' animals (head units). Every builder returns a BufferGeometry (src/peoplekit/kit.js).
import { Kit, MAT, v3, oval, smooth, sd, shade, mix, lerp } from './kit.js';
import { hood, ear, bead, INK } from './parts.js';
import { HEAD, headPt } from './kit.js';

const TAU = Math.PI * 2;
/** Shoulder straps from the top of a backpack over the shoulders (V units; the front of the shoulder is at z ~ +4). */
function straps(K, col, mat = MAT.cloth, x = 6, y0 = -9, w = 1.5) {
  for (const sx of [-1, 1]) {
    const path = smooth([[sx * x, y0, -1.2], [sx * x, 4, -1.1], [sx * x * 1.02, 10.5, -0.6], [sx * x * 1.05, 13.4, 1.6], [sx * x * 1.05, 13.2, 4.6], [sx * x * 1.04, 11.2, 6.6]], 4);
    K.tube(path, w, { sides: 8, ry: 0.22, sq: 6, up: [1, 0, 0], mat, col, caps: 'flat' });
  }
}

export const BAGS = {
  capsulePack() {
    const R = 0xe5383b, C = 0xf4f2ee;
    const K = new Kit();
    // half a capsule against the back: an ellipsoid (10 x 11 x 7.6) cut flat at z -1.6
    const prof = [[0, 0]];
    for (let k = 0; k <= 16; k++) { const a = -Math.asin(5.6 / 7.6) + (k / 16) * (Math.PI / 2 + Math.asin(5.6 / 7.6)); prof.push([10 * Math.cos(a), 5.6 + 7.6 * Math.sin(a)]); }
    K.with([0, 0, -1.6], [-Math.PI / 2, 0, 0], 1, () => K.lathe(prof, { seg: 48, sz: 1.1, mat: MAT.gloss, col: (p) => (p[2] > 0.25 ? R : C) }));
    K.tube(oval(10.1, 7.7, 64).map(([x, z]) => [x, 0, z - 7.2]).filter((p) => p[2] < -1.4), 0.42, { sides: 8, ry: 1.4, mat: MAT.plastic, col: 0xb02a30 });
    // a window in the bottom half with a little figure inside
    K.with([0, -4.6, -14.0], [Math.PI / 2 + 0.35, 0, 0], 1, () => K.lathe([[3.1, 0], [3.0, 0.5], [2.2, 1.3], [0, 1.6]], { seg: 24, mat: MAT.glass, col: 0xe8f2f6 }));
    K.sculpt((p) => sd.u(sd.ell(p, [0, -4.9, -13.5], [1.4, 1.6, 1.0]), sd.sphere(p, [0, -3.2, -13.6], 1.0), 0.4), [-2, -7, -15, 2, -1.8, -12], 0.2, { mat: MAT.plastic, col: 0xffd23f });
    K.tube(oval(3.2, 3.2, 32).map(([x, y]) => [x, y - 4.6, -14.0 + y * 0.35 + 0.3]), 0.3, { closed: true, sides: 6, mat: MAT.plastic, col: 0xb02a30 });
    straps(K, 0x2a2428, MAT.cloth);
    return K.build();
  },
  teddyPack() {
    const B = 0x9a6a42, B2 = 0x7a5232, M = 0xe0bc88;
    const K = new Kit();
    K.sculpt((p) => {
      let d = sd.ell(p, [0, -2, -6.4], [8.2, 9.2, 5.8]);
      d = sd.u(d, sd.ell(p, [0, 10, -6.6], [6.4, 5.5, 5.4]), 1.6);
      d = sd.u(d, sd.ell(p, [0, 8.4, -11.4], [2.7, 2.1, 1.6]), 0.8); // muzzle
      for (const sx of [-1, 1]) {
        d = sd.u(d, sd.ell(p, [sx * 4.8, 15.0, -6.4], [2.1, 2.1, 1.3]), 0.7); // ears
        d = sd.u(d, sd.cone(p, [sx * 4.4, -9.4, -7.4], [sx * 4.2, -10.6, -10.0], 2.3, 2.1), 1.0); // legs
        d = sd.u(d, sd.cone(p, [sx * 6.4, 3.6, -5.4], [sx * 6.4, 12.6, -0.6], 1.9, 1.6), 1.0); // arms up over your shoulders
      }
      return Math.max(d, p[2] + 0.6);
    }, [-10, -14, -14, 10, 18, 0], 0.55, { mat: MAT.fur, col: (p) => (p[2] < -11 && p[1] > 6 && p[1] < 11 ? M : Math.abs(p[0]) > 3.8 && p[1] > 13.6 && p[2] < -7.4 ? M : B) });
    K.blob([0, 9.2, -13.1], [0.9, 0.65, 0.5], { mat: MAT.eye, col: 0x2a1a14, seg: 12 });
    for (const sx of [-1, 1]) bead(K, [sx * 2.2, 11.4, -11.6], 0.62, { white: false, pupil: 1, dir: [0, 0, -1] });
    for (const sx of [-1, 1]) K.blob([sx * 4.2, -10.7, -10.7], [1.4, 1.6, 0.4], { mat: MAT.fur, col: M, seg: 12 });
    K.stitch(smooth([[0, 5.2, -12.1], [0, 1.0, -12.2], [0, -6.0, -11.8]], 4), 0.09, { col: B2, dash: 0.6, gap: 0.45 });
    return K.build();
  },
  furoshiki() {
    const K = new Kit();
    const cloth = K.paint('karakusa', 128, 128, (g, w, h) => {
      g.fillStyle = '#3a8a4a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f2eee0'; g.lineWidth = 5; g.lineCap = 'round';
      for (const [cx, cy, s] of [[32, 32, 1], [96, 96, 1], [96, 32, -1], [32, 96, -1]]) {
        g.beginPath();
        for (let a = 0; a < 9; a += 0.15) { const r = 3 + a * 2.6, x = cx + Math.cos(a * s) * r, y = cy + Math.sin(a * s) * r; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); }
        g.stroke();
      }
    }, { rough: 0.9 });
    K.sculpt((p) => {
      let d = sd.ell(p, [0, -1, -8], [9.6, 9.2, 6.8]);
      d = sd.u(d, sd.ell(p, [0, 8.6, -8], [3.0, 2.4, 2.6]), 1.6); // the knot
      for (const sx of [-1, 1]) d = sd.u(d, sd.cone(p, [sx * 1.6, 9.4, -8], [sx * 5.0, 12.4, -8.4], 1.5, 0.6), 0.6); // its two ears
      for (const [x, y] of [[-5.2, -4.4], [4.6, 2.2], [-3.4, 4.6], [5.6, -6]]) d = sd.u(d, sd.ell(p, [x, y, -13.6], [2.2, 2.2, 1.2]), 1.6); // lumpy cucumbers inside
      return Math.max(d, p[2] + 1.6);
    }, [-12, -12, -17, 12, 15, -1], 0.55, { mat: cloth, col: 0xffffff });
    straps(K, 0x2a6a3a, cloth, 6.2, -6, 1.3);
    return K.build();
  },
  /** An obi round the waist: half widths X, Z, height h (voxels), colours, and a butterfly bow (or a plain knot) at the back. */
  obi(X, Z, h, col, col2, bow = true) {
    const K = new Kit();
    const path = oval(X + 0.6, Z + 0.6, 64, 5);
    const sec = smooth([[-h / 2, -0.7], [h / 2, -0.7], [h / 2, 0.7], [-h / 2, 0.7]], 2, true);
    K.sweep(path.map(([x, z]) => [x, h / 2, z]), sec, { closed: true, up: [0, 1, 0], mat: MAT.cloth, col: (p) => (Math.abs(p[1] - h / 2) < h * 0.1 ? shade(col, 0.88) : col) });
    K.tube(oval(X + 1.4, Z + 1.4, 64, 5).map(([x, z]) => [x, h * 0.5, z]), 0.55, { closed: true, sides: 8, mat: MAT.cloth, col: col2 });
    const back = -Z - 1.4;
    if (bow) {
      const lsec = oval(1, 0.14, 16, 6);
      for (const sx of [-1, 1]) {
        const loop = smooth([[sx * 1.4, h / 2, back - 1.0], [sx * 6.0, h / 2 + 2.6, back - 2.2], [sx * 10.6, h / 2 + 1.4, back - 1.8], [sx * 11.2, h / 2 - 0.6, back - 0.8], [sx * 9.8, h / 2 - 1.6, back - 0.2], [sx * 5.6, h / 2 - 0.4, back - 0.1], [sx * 1.4, h / 2, back - 0.3]], 5, true);
        K.sweep(loop, lsec, { closed: true, up: [0, 1, 0], mat: MAT.cloth, col, scale: (t) => 1.6 + 2.6 * Math.sin(Math.PI * t) ** 0.8 });
        K.sweep(smooth([[sx * 1.0, h / 2 - 1.4, back - 0.9], [sx * 2.4, h / 2 - 6, back - 1.2], [sx * 3.2, -9, back - 0.8]], 3), lsec, { up: [0, 0, 1], mat: MAT.cloth, col: shade(col, 0.92), scale: () => 1.9 });
      }
      K.sculpt((p) => sd.box(p, [0, h / 2, back - 1.0], [1.8, 2.3, 1.2], 0.9), [-3, h / 2 - 3.5, back - 3, 3, h / 2 + 3.5, back + 1], 0.25, { mat: MAT.cloth, col: col2 });
    } else {
      K.sculpt((p) => sd.box(p, [0, h / 2, back - 0.5], [1.6, h / 2 - 0.4, 0.9], 0.8), [-3, -1, back - 2.5, 3, h + 1, back + 1], 0.25, { mat: MAT.cloth, col: col2 });
      for (const sx of [-1, 1]) K.tube(smooth([[sx * 0.8, 0.6, back - 0.8], [sx * 2.0, -3, back - 1.0], [sx * 2.6, -6.2, back - 0.7]], 3), 1.4, { sides: 8, ry: 0.22, sq: 6, up: [0, 0, 1], mat: MAT.cloth, col, caps: 'flat' });
    }
    return K.build();
  },
  /** A loosened tie (chest front): the knot pulled down, the blade swinging a little off-centre. */
  tie(col = 0xb02a30, col2 = 0x2a2a4a) {
    const K = new Kit();
    const hexs = (c) => '#' + c.toString(16).padStart(6, '0');
    const st = K.paint('tie:' + col + ':' + col2, 64, 64, (g, w, h) => {
      g.fillStyle = hexs(col); g.fillRect(0, 0, w, h); g.fillStyle = hexs(col2);
      for (let k = -2; k < 4; k++) { g.beginPath(); g.moveTo(k * 22, 0); g.lineTo(k * 22 + 8, 0); g.lineTo(k * 22 + 8 + 26, h); g.lineTo(k * 22 + 26, h); g.fill(); }
    }, { rough: 0.55 });
    K.sculpt((p) => sd.u(sd.box(p, [0, -1.2, 0.6], [1.4, 1.3, 0.8], 0.6), sd.cone(p, [0, -0.2, 0.4], [0, -2.6, 0.7], 1.6, 1.0), 0.5), [-3, -4, -1.4, 3, 1.6, 2.6], 0.2, { mat: st, col: 0xffffff, uvMap: (p) => [p[0] * 0.2, p[1] * 0.2] });
    const blade = smooth([[-1.1, -2.2], [1.1, -2.2], [2.2, -24.5], [0, -27.4], [-2.2, -24.5]], 2, true);
    K.plate(blade.map(([x, y]) => [x + (-y) * 0.06, y]), (x, y) => 0.4 + (y / 27) ** 2 * 2.2, 0.32, { mat: st, col: 0xffffff, rings: 6, uvMap: (x, y) => [x * 0.16, y * 0.16] });
    return K.build();
  },
  /** A fat, fluffy tanuki tail segment (len long, radius r0 -> r1), brown with dark rings; tip: the dark end. */
  tanukiSeg(len, r0, r1, tip = false) {
    const K = new Kit();
    const n = Math.max(6, Math.round(len / 0.6)), path = [];
    for (let k = 0; k <= n; k++) path.push([0, 0, -len * k / n]);
    K.tube(path, (t) => lerp(r0, r1, t), { sides: 16, caps: 'round', mat: MAT.fur, col: (p) => { const d = -p[2]; return tip && d > len - 3 ? 0x3a2a22 : d % 6 < 2 && d > 0.4 ? 0x5a4030 : 0x8a6644; } });
    return K.build();
  },
};

// ------------------------------------------------------------------ kigurumi hoods (head units)
/** The animal hoods of the kigurumi onesies: key -> extra features over the plain hood with ears. o: catalogue options. */
export function kigurumi(key, o) {
  const K = new Kit();
  const col = o.col, rim = o.rim ?? o.col;
  const patches = {
    cx_cowhood: [[4.6, 16, 3, 3.6, 0x1e1c22], [-6.6, 3.8, -1, 3.4, 0x1e1c22], [-2.6, 14.6, -6.6, 3.2, 0x1e1c22]],
    cx_calicohood: [[4.4, 16.6, 2.8, 3.8, 0xd8843a], [-4.6, 16.6, 0.6, 3.6, 0x2a2224], [0.6, 12.4, -7.2, 3.6, 0xd8843a]],
  }[key] || [];
  const paint = (p) => { for (const [x, y, z, r, c] of patches) if (Math.hypot(p[0] - x, p[1] - y, p[2] - z) < r) return c; return col; };
  const rimF = key === 'cx_tanukihood' ? (p) => (Math.abs(p[0]) > 2.2 && p[1] > 4.6 && p[1] < 10.4 ? 0x4a3a2e : rim) : rim;
  hood(K, { col, rim: rimF, paint: patches.length ? paint : undefined });
  const earShape = o.ears === 'point' ? 'point' : 'round';
  for (const sx of [-1, 1]) {
    const base = headPt([sx * 0.62, 1, 0.05], 1.9);
    ear(K, [base[0], base[1] - 0.6, base[2]], { shape: earShape, w: earShape === 'point' ? 2.9 : 3.0, h: earShape === 'point' ? 4.4 : 3.2, th: 1.2, col: o.ear ?? col, inner: o.earIn ?? null, lean: -sx * 0.38, tilt: -0.08 });
  }
  const fz = (x, y) => headPt([x - HEAD.C[0], y - HEAD.C[1], 9.6], 1.95);
  if (key === 'cx_cowhood') {
    K.sculpt((p) => sd.ell(p, [0, 12.9, 12.3], [3.8, 1.5, 1.4]), [-4.6, 10.8, 10, 4.6, 15, 14.2], 0.3, { mat: MAT.fur, col: 0xf0a0b0 });
    for (const sx of [-1, 1]) {
      K.blob([sx * 1.3, 13.0, 13.55], [0.42, 0.3, 0.2], { mat: MAT.matte, col: 0x8a4a5a, seg: 8 });
      const hb = headPt([sx * 0.3, 1, 0.25], 1.9);
      K.tube(smooth([hb, [hb[0] + sx * 0.6, hb[1] + 1.6, hb[2]], [hb[0] + sx * 1.6, hb[1] + 2.6, hb[2] - 0.2]], 3), (t) => 0.75 * (1 - t) + 0.2, { sides: 8, caps: 'round', mat: MAT.gloss, col: 0xf4e8c8 });
      bead(K, fz(sx * 3.6, 15.2), 0.62, { white: false, pupil: 1 });
    }
  } else if (key === 'cx_shibahood') {
    K.blob(fz(0, 13.4), [1.05, 0.7, 0.6], { mat: MAT.eye, col: INK, seg: 12 });
    for (const sx of [-1, 1]) { bead(K, fz(sx * 3.8, 15.2), 0.62, { white: false, pupil: 1 }); K.blob(fz(sx * 3.6, 16.7), [0.85, 0.42, 0.3], { mat: MAT.fur, col: 0xf6ecd8, seg: 10 }); }
  } else if (key === 'cx_calicohood') {
    K.blob(fz(0, 13.2), [0.75, 0.5, 0.45], { mat: MAT.gloss, col: 0xf08a9a, seg: 12 });
    for (const sx of [-1, 1]) {
      bead(K, fz(sx * 3.8, 15.2), 0.75, { white: false, col: 0x5a9a3a, pupil: 1, glint: true });
      for (const dy of [-0.5, 0.4]) K.tube([fz(sx * 2.2, 13.0 + dy), v3.add(fz(sx * 5.4, 12.6 + dy * 1.6), [0, 0, 0.6])], 0.07, { sides: 4, mat: MAT.matte, col: 0x5a4a44 });
    }
  } else if (key === 'cx_tanukihood') {
    K.blob(fz(0, 12.9), [1.0, 0.7, 0.6], { mat: MAT.eye, col: INK, seg: 12 });
    for (const sx of [-1, 1]) bead(K, fz(sx * 3.7, 15), 0.6, { white: false, pupil: 1 });
  }
  return K.build();
}
/** The raincoat's hood: yellow rubberised cotton, a seam down the middle, drawstring toggles at the chin. */
export function rainHood() {
  const K = new Kit();
  hood(K, { col: 0xf4c430, rim: 0xe0a820, hole: [6.6, 8.4, 3.6], th: 1.2, mat: MAT.plastic, hem: 0.45 });
  const seam = [];
  for (let a = -1.05; a <= 1.25; a += 0.1) seam.push(headPt([0, Math.cos(a), Math.sin(a) * 1.1], 1.62));
  K.tube(seam, 0.22, { sides: 6, mat: MAT.plastic, col: 0xe0a820 });
  for (const sx of [-1, 1]) {
    K.tube(smooth([[sx * 3.2, -4.6, 9.4], [sx * 3.0, -7.0, 10.2], [sx * 2.8, -8.6, 10.0]], 3), 0.14, { sides: 5, mat: MAT.cloth, col: 0xf6f2e6 });
    K.with([sx * 2.8, -9.3, 10.0], [0, 0, 0], 1, () => K.lathe([[0, -0.6], [0.45, -0.5], [0.5, 0.4], [0.3, 0.6], [0, 0.65]], { seg: 10, mat: MAT.plastic, col: 0x2a2a30 }));
  }
  return K.build();
}
void mix;
