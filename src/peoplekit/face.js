// Glasses, face masks and the side-worn festival masks of the big wardrobe (src/cosmetics/catalog.js, more.js).
// Glasses and face masks are in the "eyes" frame (head units, origin at eye level, lenses at z 12, temples back to the
// ears at x +-7); side masks are built facing +z, centred near the origin (the kitsune mask's frame). Every builder
// returns a BufferGeometry (src/peoplekit/kit.js).
import { Kit, MAT, HEAD, v3, oval, smooth, headPt, frontZ, sd, shade, mix, lerp } from './kit.js';
import { specs, brush, INK, GOLD } from './parts.js';
import { BASE } from './base.js';

const TAU = Math.PI * 2, EYE = 6; // the eyes group sits at eye level (head y 6)

/** A pleated cloth mask over the nose and mouth with ear loops (eyes frame). */
function clothMask(K, col, col2, loop) {
  const out = smooth([[-6.3, -2.4], [0, -1.6], [6.3, -2.4], [6.1, -9.0], [3.6, -10.5], [0, -10.9], [-3.6, -10.5], [-6.1, -9.0]], 4, true);
  const f = (x, y) => 12.1 - (x / 7) ** 2 * 4.6 - (y < -7.5 ? (y + 7.5) ** 2 * 0.12 : 0) + 0.25 * Math.max(0, Math.sin((y + 2.4) * 1.05)) ** 3 * (1 - (x / 7) ** 2) + (Math.abs(y + 3) < 1.2 ? 0.2 * (1 - (x / 7) ** 2) : 0);
  K.plate(out, f, 0.45, { mat: MAT.cloth, rings: 12, c: [0, -6.2], col: (p, side) => (side === 'back' ? col2 : Math.abs(Math.sin((p[1] + 2.4) * 1.05)) < 0.18 && p[1] < -3.5 ? col2 : col) });
  K.tube(smooth([[-6.0, -2.7, f(-6, -2.7) - 0.1], [6.0, -2.7, f(6, -2.7) - 0.1]].map((p, i, a) => p), 1), 0.1, { sides: 4, mat: MAT.metal, col: 0xd8dade });
  for (const sx of [-1, 1]) for (const y0 of [-2.8, -9.2]) K.tube(smooth([[sx * 6.1, y0, f(sx * 6.1, y0) - 0.2], [sx * 7.3, y0 * 0.55 - 1.2, 5.6], [sx * 7.4, -2.6, 2.4], [sx * 7.2, -1.2, 1.6]], 4), 0.13, { sides: 5, mat: MAT.cloth, col: loop, caps: 'round' });
  return f;
}

/** A side-worn festival mask: sculpted relief, painted face (canvas u = (x + 7) / 14, v = (y + 8) / 18). */
function festival(K, name, f, paint, o = {}) {
  const face = K.paint(name, 256, 256, (g, w, h) => paint(brush(g, w, h), (x) => (x + 7) / 14, (y) => (y + 8) / 18, g, w, h), { rough: o.rough ?? 0.34 });
  K.sculpt((p) => Math.max(f(p), -p[2] - 0.2), o.box || [-7.2, -8.6, -0.6, 7.2, 10.4, 6], o.cell ?? 0.34, { mat: face, col: 0xffffff, uvMap: (p) => [(p[0] + 7) / 14, (p[1] + 8) / 18] });
}
/** The common festival mask face: a soft dome, brow ridge, nose and chin. */
function maskFace(p, o = {}) {
  let d = sd.ell(p, [0, 0.2, 0.2], [o.w ?? 5.7, o.h ?? 6.9, o.d ?? 2.6]);
  d = sd.u(d, sd.ell(p, [0, -0.3, 2.2], [0.9, 1.5, 1.0]), 0.8); // nose
  for (const sx of [-1, 1]) d = sd.u(d, sd.ell(p, [sx * 3.0, -1.6, 1.6], [1.8, 1.6, 1.0]), 1.0); // cheeks
  return d;
}

export const FACE = {
  maskSurgical() { const K = new Kit(); clothMask(K, 0xf6f6f4, 0xdcdcdc, 0xf0f0ee); return K.build(); },
  blackMask() { const K = new Kit(); clothMask(K, 0x3a3c52, 0x2a2c3a, 0x2a2c3a); return K.build(); },
  kafun() {
    const K = new Kit();
    clothMask(K, 0xf6f6f4, 0xdcdcdc, 0xf0f0ee);
    // wraparound pollen goggles
    const out = smooth([[-8.0, 2.6], [0, 3.0], [8.0, 2.6], [8.2, -2.2], [1.2, -2.8], [0, -1.8], [-1.2, -2.8], [-8.2, -2.2]], 4, true);
    const g = (x) => 12.6 - (x / 8.6) ** 2 * 4.2;
    K.plate(out, (x) => g(x), 0.3, { mat: MAT.glass, col: 0xbcdcec, rings: 6, c: [0, 0.4] });
    K.tube(out.map(([x, y]) => [x * 1.02, y * 1.06 + 0.05, g(x) - 0.1]), 0.42, { closed: true, sides: 7, ry: 1.5, up: [0, 0, 1], mat: MAT.rubber, col: 0xf2eee4 });
    for (const sx of [-1, 1]) K.tube(smooth([[sx * 8.2, 0.6, g(8.2) - 0.3], [sx * 7.6, 0.9, 3.0], [sx * 6.6, 1.4, -2.6]], 3), 0.5, { sides: 6, ry: 0.3, up: [0, 1, 0], mat: MAT.cloth, col: 0x5a8ac8 });
    return K.build();
  },
  heartglasses() {
    const K = new Kit();
    const heart = [];
    for (let i = 0; i < 64; i++) { const t = (i / 64) * TAU; heart.push([16 * Math.sin(t) ** 3 * 0.17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.17 + 0.3]); }
    specs(K, { lens: heart, cx: 3.6, cy: 0.2, rim: 0.4, rimRy: 1.3, rimMat: MAT.gloss, rimCol: 0xe03a6a, lensMat: MAT.glass, lensCol: 0xff6aa0, bridge: 'bar', hingeY: 0.4 });
    return K.build();
  },
  glasses3d() {
    const K = new Kit();
    const CARD = 0xf6f4ee, z = 12;
    const bar = (x0, x1, y0, y1) => K.with([(x0 + x1) / 2, (y0 + y1) / 2, z - 0.06 * ((x0 + x1) / 2) ** 2], [0, -0.12 * (x0 + x1) / 2, 0], 1, () => K.slab(smooth([[-(x1 - x0) / 2, -(y1 - y0) / 2], [(x1 - x0) / 2, -(y1 - y0) / 2], [(x1 - x0) / 2, (y1 - y0) / 2], [-(x1 - x0) / 2, (y1 - y0) / 2]], 1, true), 0.3, { mat: MAT.paper, col: CARD, b: 0.1 }));
    bar(-7.6, 7.6, 2.2, 3.4); bar(-7.6, 7.6, -3.4, -2.2); bar(-1, 1, -2.2, 2.2); bar(-7.6, -6.4, -2.2, 2.2); bar(6.4, 7.6, -2.2, 2.2);
    for (const [sx, c] of [[-1, 0x30c8e8], [1, 0xe83838]]) {
      const cx = sx * 3.7;
      K.with([cx, 0, z - 0.06 * cx * cx - 0.05], [0, -0.12 * cx, 0], 1, () => K.plate(smooth([[-2.8, -2.3], [2.8, -2.3], [2.8, 2.3], [-2.8, 2.3]], 1, true), () => 0, 0.12, { mat: MAT.glass, col: c, rings: 2 }));
      K.with([sx * 7.3, 1.0, 7.0], [0, Math.PI / 2, 0], 1, () => K.slab(smooth([[-4.6, -0.5], [4.6, -0.5], [4.6, 0.5], [-4.6, 0.5]], 1, true), 0.25, { mat: MAT.paper, col: CARD, b: 0.08 }));
    }
    return K.build();
  },
  monocle() {
    const AU = 0xe0b23a;
    const K = new Kit();
    const c = [-3.6, 0, 12];
    K.tube(oval(2.75, 2.75, 40).map(([x, y]) => [c[0] + x, c[1] + y, c[2]]), 0.42, { closed: true, sides: 10, mat: MAT.metal, col: AU });
    K.with(c, [0, 0, 0], 1, () => K.plate(oval(2.5, 2.5, 32), (x, y) => 0.2 * (1 - (x * x + y * y) / 6.25), 0.2, { mat: MAT.glass, col: 0xc8e6f0, rings: 4 }));
    // the chain: little gold links down to a waistcoat that isn't there
    const path = smooth([[-6.2, -1.2, 11.6], [-6.8, -5, 10.8], [-6.6, -9, 10.2], [-5.6, -12.5, 9.6]], 6);
    for (let k = 0; k < path.length - 1; k++) {
      const a = path[k], b = path[k + 1], m = v3.lerp(a, b, 0.5), dir = v3.norm(v3.sub(b, a));
      const yaw = Math.atan2(dir[0], dir[2]), pitch = Math.asin(-dir[1]);
      K.with(m, [Math.PI / 2 - pitch, yaw, k % 2 ? Math.PI / 2 : 0, 'YXZ'], 1, () => K.tube(oval(0.42, 0.62, 12).map(([x, y]) => [x, y, 0]), 0.11, { closed: true, sides: 5, mat: MAT.metal, col: k % 2 ? 0xc8901e : AU }));
    }
    return K.build();
  },
  eyepatch() {
    const K = new Kit();
    const pc = [3.7, 0, 0];
    const pf = (x, y) => frontZ(x, y + EYE, 0.25) + 0.15 + 0.35 * (1 - ((x - pc[0]) / 3) ** 2 - (y / 2.7) ** 2);
    K.plate(oval(2.9, 2.6, 36, 2.2, pc[0], 0), pf, 0.4, { mat: MAT.leather, col: 0x1c1618, rings: 6 });
    K.stitch(oval(2.5, 2.2, 48, 2.2, pc[0], 0).map(([x, y]) => [x, y, pf(x, y) + 0.22]), 0.06, { closed: true, col: 0x3a3438, dash: 0.35, gap: 0.3 });
    const pts = [[6.3, 0.6, 9.9], [7.6, 1.6, 5], [6.4, 3.4, -2.6], [2, 6.4, -6.6], [-3.6, 9.6, -5.2], [-7.4, 11.4, 1], [-5.2, 11.6, 7.6], [-1.5, 9.4, 10.2], [1.0, 2.6, 11.2]].map(([x, y, z]) => { const p = headPt([x, y + EYE - HEAD.C[1], z - HEAD.C[2]], 0.35); return [p[0], p[1] - EYE, p[2]]; });
    K.tube(smooth(pts, 4), 0.3, { sides: 6, ry: 0.4, mat: MAT.leather, col: 0x1c1618, caps: 'round' });
    return K.build();
  },
  swirl() {
    const K = new Kit();
    const sw = K.paint('swirlLens', 128, 128, (g, w, h) => {
      g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#3a6ab8'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath();
      for (let a = 0; a < 6 * Math.PI; a += 0.05) { const r = 2 + a * 3.2; const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
    }, { rough: 0.3 });
    specs(K, { lens: oval(3.6, 3.6, 40), cx: 4.0, cy: 0.2, rim: 0.55, rimRy: 1.2, rimCol: 0x1c1a20, lensMat: sw, lensCol: 0xffffff, bridge: 'arch', bulge: 0.6 });
    // (the lens plate takes raw uvs from its outline)
    return K.build();
  },
  yenshades() {
    const K = new Kit();
    const lens = K.paint('yenLens', 128, 128, (g, w, h) => {
      g.fillStyle = '#1a1418'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffe070'; g.lineWidth = 10; g.lineCap = 'round';
      g.beginPath(); g.moveTo(34, 22); g.lineTo(64, 62); g.lineTo(94, 22); g.moveTo(64, 62); g.lineTo(64, 108); g.moveTo(36, 66); g.lineTo(92, 66); g.moveTo(36, 86); g.lineTo(92, 86); g.stroke();
    }, { rough: 0.2 });
    const sq = smooth([[-2.9, -2.4], [2.9, -2.4], [2.9, 2.4], [-2.9, 2.4]], 1, true).map(([x, y]) => [x, y]);
    const rr = [];
    for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU, c = Math.cos(a), s = Math.sin(a), k = 1 / Math.max(Math.abs(c) / 3.1, Math.abs(s) / 2.6); rr.push([c * k * 0.94, s * k * 0.94]); }
    specs(K, { lens: smooth(rr, 1, true), cx: 4.0, cy: 0.0, rim: 0.4, rimRy: 1.3, rimMat: MAT.metal, rimCol: 0xf6c838, lensMat: lens, lensCol: 0xffffff, bridge: 'bar', wrap: 0.04 });
    void sq;
    return K.build();
  },
  bandaid() {
    const K = new Kit();
    const pad = K.paint('plaster', 128, 32, (g, w, h) => {
      g.fillStyle = '#f2b890'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f8e4d0'; g.fillRect(w * 0.36, 3, w * 0.28, h - 6);
      g.fillStyle = 'rgba(160,96,64,0.45)'; for (let x = 8; x < w; x += 10) for (let y = 7; y < h; y += 9) if (x < w * 0.34 || x > w * 0.66) g.fillRect(x, y, 2, 2);
    }, { rough: 0.7 });
    const strip = smooth([[-3.6, -0.8], [3.6, -0.8], [3.9, 0], [3.6, 0.8], [-3.6, 0.8], [-3.9, 0]], 2, true);
    const cheek = (x, y) => frontZ(x, y + EYE, -0.2) + 0.2;
    for (const [cx, cy, a] of [[-4.2, -4.2, 0.7], [-4.2, -4.2, -0.7]]) {
      const c = Math.cos(a), s = Math.sin(a);
      const pts = strip.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
      K.plate(pts, (x, y) => cheek(x, y) + (a > 0 ? 0.12 : 0), 0.12, { mat: pad, col: 0xffffff, rings: 4, c: [cx, cy], uvMap: (x, y) => { const dx = x - cx, dy = y - cy; return [(dx * c + dy * s + 3.9) / 7.8, (-dx * s + dy * c + 0.8) / 1.6]; } });
    }
    K.plate(strip.map(([x, y]) => [x * 0.9, y - 2.6]), (x, y) => cheek(x, y) + 0.05, 0.12, { mat: pad, col: 0xffffff, rings: 4, c: [0, -2.6], uvMap: (x, y) => [(x / 0.9 + 3.9) / 7.8, (y + 2.6 + 0.8) / 1.6] });
    return K.build();
  },
  gariben() {
    const K = new Kit();
    specs(K, { lens: oval(3.6, 3.6, 40), cx: 3.9, cy: 0.4, rim: 0.62, rimRy: 1.35, rimCol: 0x1c1a20, lensCol: 0xd8e4ec, lensTh: 0.35, bridge: 'arch', bulge: 0.9 });
    for (const sx of [-1, 1]) for (const [r, dz] of [[2.5, 0.35], [1.5, 0.62], [0.7, 0.8]]) K.plate(oval(r, r, 28, 2, sx * 3.9, 0.4), () => 12.0 + dz - 0.06 * 15, 0.12, { mat: MAT.glass, col: 0xa8bccc, rings: 3 });
    return K.build();
  },
  wrapShades() {
    const K = new Kit();
    const COL = [0x6a4ab8, 0x4a6ad8, 0x3a9ac8, 0x58b89a, 0xd8a83a, 0xe8683a];
    const g = (x) => 12.5 - (x / 9.4) ** 2 * 5.4;
    const out = smooth([[-8.8, 1.9], [0, 2.3], [8.8, 1.9], [8.6, -0.6], [6, -2.2], [1.4, -1.9], [0, -0.9], [-1.4, -1.9], [-6, -2.2], [-8.6, -0.6]], 4, true);
    const grad = (x) => { const t = (x + 9) / 18 * (COL.length - 1), i = Math.max(0, Math.min(COL.length - 2, Math.floor(t))); return mix(COL[i], COL[i + 1], t - i); };
    K.plate(out, (x) => g(x), 0.35, { mat: MAT.eye, col: (p) => grad(p[0]), rings: 6, c: [0, 0.4] });
    K.tube(smooth([[-9.0, 2.5, g(9) - 0.1], [0, 2.75, g(0) + 0.05], [9.0, 2.5, g(9) - 0.1]], 6), 0.28, { sides: 7, mat: MAT.metal, col: 0xc8ccd8 });
    for (const sx of [-1, 1]) K.tube(smooth([[sx * 9.0, 2.4, g(9) - 0.2], [sx * 7.4, 2.2, 4.4], [sx * 7.3, 0.4, 1.8]], 3), 0.22, { sides: 6, ry: 1.5, up: [1, 0, 0], caps: 'round', mat: MAT.metal, col: 0xc8ccd8 });
    return K.build();
  },
  kaiser() {
    const B = 0x3a2a22;
    const K = new Kit();
    for (const sx of [-1, 1]) K.sculpt((p) => {
      const q = [p[0] * sx, p[1], p[2]];
      let d = sd.cone(q, [0.2, -4.4, 12.4], [3.4, -4.9, 12.0], 1.0, 0.7);
      d = sd.u(d, sd.cone(q, [3.4, -4.9, 12.0], [6.4, -3.6, 11.0], 0.7, 0.32), 0.4);
      d = sd.u(d, sd.cone(q, [6.4, -3.6, 11.0], [7.6, -1.2, 10.4], 0.32, 0.16), 0.25);
      return d;
    }, [sx > 0 ? -0.6 : -8.6, -6.4, 9.4, sx > 0 ? 8.6 : 0.6, 0, 14], 0.22, { mat: MAT.fur, col: (p) => (Math.abs(p[0]) > 6 ? shade(B, 1.25) : B) });
    return K.build();
  },
  tengu() {
    const K = new Kit();
    const face = K.paint('tenguFace', 256, 256, (g, w, h) => {
      const B = brush(g, w, h), U = (x) => (x + 8) / 16, V = (y) => (y + 12) / 20;
      B.bg('#d8382e');
      for (const sx of [-1, 1]) {
        B.fill('#e8b440', (b) => b.e(U(sx * 3.2), V(0.9), 0.07, 0.055));
        B.fill('#1c1418', (b) => b.e(U(sx * 3.1), V(0.8), 0.03, 0.04));
        B.fill('#a8241e', (b) => { b.m(U(sx * 1.2), V(-0.6)); b.q(U(sx * 3.4), V(-1.6), U(sx * 5.4), V(-0.2)); b.q(U(sx * 3.4), V(-0.9), U(sx * 1.2), V(-0.6)); });
      }
      B.fill('#7a1a1a', (b) => b.e(U(0), V(-7.3), 0.11, 0.03));
    }, { rough: 0.33 });
    K.sculpt((p) => {
      const zf = 13.4 - (p[0] / 7.8) ** 2 * 2.8;
      let d = Math.max(sd.ell(p, [0, -2.2, 11.2], [7.3, 9.6, 3.6]), p[2] - zf - 0.4 + 0, 11.1 - p[2]);
      d = sd.u(d, sd.cone(p, [0, -0.6, 13.2], [0, 1.4, 27.5], 1.9, 0.5), 1.0); // the nose
      for (const sx of [-1, 1]) d = sd.u(d, sd.ell(p, [sx * 3.2, -2.6, 13.6], [2.0, 1.4, 1.0]), 0.8);
      return d;
    }, [-8, -12.4, 10.6, 8, 8.2, 28.6], 0.44, { mat: face, col: 0xffffff, uvMap: (p) => [(p[0] + 8) / 16, (p[1] + 12) / 20] });
    // bushy white brows, moustache and beard
    for (const sx of [-1, 1]) {
      K.sculpt((p) => {
        const q = [p[0] * sx, p[1], p[2]];
        let d = sd.cone(q, [0.8, 2.6, 14.0], [6.6, 4.6, 12.4], 0.75, 0.95);
        d = sd.u(d, sd.ell(q, [5.4, 4.3, 12.8], [1.6, 0.9, 0.9]), 0.6);
        return d;
      }, [sx > 0 ? -0.5 : -8.5, 1, 10.5, sx > 0 ? 8.5 : 0.5, 6.4, 15.6], 0.24, { mat: MAT.fur, col: 0xf4ecdc });
      K.sculpt((p) => { const q = [p[0] * sx, p[1], p[2]]; return sd.u(sd.cone(q, [0.6, -5.4, 13.6], [5.4, -6.8, 12.0], 0.7, 0.4), sd.cone(q, [5.4, -6.8, 12.0], [6.4, -8.6, 11.6], 0.4, 0.2), 0.3); }, [sx > 0 ? -0.5 : -8, -10, 10.6, sx > 0 ? 8 : 0.5, -4, 15], 0.24, { mat: MAT.fur, col: 0xf4ecdc });
    }
    K.sculpt((p) => sd.u(sd.ell(p, [0, -10.4, 12.3], [2.8, 2.0, 1.5]), sd.cone(p, [0, -10.6, 12.4], [0, -14.6, 12.0], 1.6, 0.3), 0.6), [-3.6, -15.6, 10.2, 3.6, -8, 14.4], 0.24, { mat: MAT.fur, col: 0xf4ecdc });
    return K.build();
  },

  // ================================================================== side-worn festival masks (kitsune frame)
  hyottoko() {
    const K = new Kit();
    festival(K, 'hyottokoFace', (p) => {
      let d = maskFace(p);
      d = sd.u(d, sd.cone(p, [2.2, -4.0, 1.6], [2.8, -4.6, 4.6], 1.5, 0.9), 0.7); // the pursed mouth
      d = sd.cut(d, sd.sphere(p, [2.85, -4.65, 4.9], 0.45), 0.2);
      d = sd.u(d, sd.ell(p, [0, 6.0, 0.8], [5.9, 1.8, 1.9]), 0.8); // the headscarf knot band
      return d;
    }, (B, U, V) => {
      B.bg('#f4e4cc');
      B.fill('#3a6ab8', (b) => { b.m(U(-7), V(5.0)); b.q(U(0), V(4.2), U(7), V(5.0)); b.l(U(7), V(10)); b.l(U(-7), V(10)); });
      for (const x of [-4.6, -1.6, 1.4, 4.4]) B.fill('#f4f4f0', (b) => b.e(U(x), V(6.4), 0.03, 0.025));
      B.stroke('#1c1418', 0.016, (b) => { b.m(U(-3.8), V(3.4)); b.q(U(-2.4), V(4.4), U(-1.0), V(3.5)); });
      B.stroke('#1c1418', 0.016, (b) => { b.m(U(1.0), V(3.3)); b.q(U(2.6), V(4.6), U(4.2), V(3.2)); });
      B.fill('#1c1418', (b) => b.e(U(-2.4), V(1.9), 0.042, 0.05));
      B.stroke('#1c1418', 0.02, (b) => { b.m(U(1.4), V(2.0)); b.l(U(3.6), V(1.8)); });
      B.fill('#f0a0a0', (b) => b.e(U(-4), V(-1.9), 0.075, 0.05));
      B.fill('#f0a0a0', (b) => b.e(U(4.2), V(-1.9), 0.06, 0.045));
      B.fill('#9a2a2a', (b) => b.e(U(2.85), V(-4.65), 0.035, 0.028));
    });
    return K.build();
  },
  onimask() {
    const K = new Kit();
    festival(K, 'oniFace', (p) => {
      let d = maskFace(p, { w: 5.9 });
      for (const sx of [-1, 1]) {
        d = sd.u(d, sd.cone(p, [sx * 0.6, 3.0, 2.2], [sx * 4.4, 4.2, 1.6], 1.1, 0.6), 0.9); // scowling brows
        d = sd.u(d, sd.cone([p[0], p[1], p[2]], [sx * 3.2, 5.4, 0.6], [sx * 4.8, 10.2, 0.4], 1.3, 0.2), 0.6); // horns
        d = sd.u(d, sd.cone(p, [sx * 1.9, -4.6, 2.2], [sx * 2.1, -6.4, 2.4], 0.5, 0.12), 0.25); // fangs
      }
      d = sd.u(d, sd.ell(p, [0, -0.6, 2.6], [1.5, 1.4, 1.2]), 0.8);
      d = sd.cut(d, sd.ell(p, [0, -4.4, 2.6], [3.0, 0.8, 1.2]), 0.4); // the snarl
      return d;
    }, (B, U, V) => {
      B.bg('#d8382e');
      for (const sx of [-1, 1]) {
        B.fill('#ffd23f', (b) => b.e(U(sx * 2.4), V(1.6), 0.07, 0.045));
        B.fill('#1c1418', (b) => b.e(U(sx * 2.3), V(1.5), 0.025, 0.03));
        B.fill('#f4e2a8', (b) => { b.m(U(sx * 2.6), V(5.2)); b.l(U(sx * 5.6), V(6.6)); b.l(U(sx * 4.8), V(10.4)); b.l(U(sx * 3.6), V(10.4)); b.l(U(sx * 2.4), V(6.2)); });
        B.fill('#fff6e0', (b) => { b.m(U(sx * 1.4), V(-4.4)); b.l(U(sx * 2.6), V(-4.4)); b.l(U(sx * 2.1), V(-6.6)); });
      }
      B.fill('#3a0e0e', (b) => b.e(U(0), V(-4.4), 0.2, 0.035));
      B.fill('#a82a22', (b) => b.e(U(0), V(-0.8), 0.08, 0.05));
    });
    return K.build();
  },
  okame() {
    const K = new Kit();
    festival(K, 'okameFace', (p) => {
      let d = sd.ell(p, [0, 0.4, 0.3], [5.8, 6.8, 2.4]);
      d = sd.u(d, sd.ell(p, [0, 3.2, 1.0], [4.0, 2.4, 1.8]), 1.2); // the round forehead
      for (const sx of [-1, 1]) d = sd.u(d, sd.ell(p, [sx * 3.0, -2.2, 1.6], [2.4, 2.2, 1.6]), 1.2); // fat cheeks
      d = sd.u(d, sd.ell(p, [0, -0.4, 2.2], [0.8, 1.0, 0.8]), 0.6);
      return d;
    }, (B, U, V) => {
      B.bg('#faf2e4');
      for (const sx of [-1, 1]) {
        B.stroke('#1c1418', 0.016, (b) => { b.m(U(sx * 1.2), V(1.4)); b.q(U(sx * 2.6), V(2.3), U(sx * 4.0), V(1.4)); });
        B.fill('#1c1418', (b) => b.e(U(sx * 2.4), V(5.4), 0.045, 0.02));
        B.fill('#f4a0a8', (b) => b.e(U(sx * 3.4), V(-2.2), 0.08, 0.06));
      }
      B.fill('#c8302a', (b) => { b.m(U(-0.8), V(-4.3)); b.q(U(0), V(-3.8), U(0.8), V(-4.3)); b.q(U(0), V(-4.8), U(-0.8), V(-4.3)); });
      B.fill('#d84040', (b) => b.e(U(0), V(4.6), 0.015, 0.012));
      B.fill('#1c1418', (b) => { b.m(U(-6.4), V(6.8)); b.q(U(0), V(9.8), U(6.4), V(6.8)); b.l(U(7), V(10)); b.l(U(-7), V(10)); });
    });
    return K.build();
  },
  heroMask() {
    const K = new Kit();
    festival(K, 'heroFace', (p) => {
      let d = sd.ell(p, [0, 0.3, 0.2], [5.4, 7.2, 2.6]);
      d = sd.u(d, sd.ell(p, [0, 3.4, 2.2], [0.75, 4.6, 1.0]), 0.5); // the crest
      d = sd.u(d, sd.ell(p, [0, -1.6, 2.2], [0.9, 1.6, 0.9]), 0.7);
      d = sd.cut(d, sd.ell(p, [0, -4.8, 2.4], [2.6, 0.35, 0.8]), 0.25); // the mouth slit
      return d;
    }, (B, U, V) => {
      B.bg('#d8dce4');
      B.fill('#d8302a', (b) => { b.m(U(-0.7), V(-0.2)); b.l(U(0.7), V(-0.2)); b.l(U(0.6), V(8.4)); b.l(U(-0.6), V(8.4)); });
      for (const sx of [-1, 1]) { B.fill('#d8302a', (b) => b.e(U(sx * 4.6), V(-3), 0.05, 0.025)); B.fill('#1c1418', (b) => b.e(U(sx * 4.8), V(3.2), 0.02, 0.02)); }
      B.fill('#8a8e98', (b) => b.e(U(0), V(-4.8), 0.16, 0.012));
    });
    for (const sx of [-1, 1]) K.sculpt((p) => sd.ell(p, [sx * 2.6, 1.6, 2.4], [1.9, 1.15, 1.0]), [sx * 2.6 - 2.4, 0, 1, sx * 2.6 + 2.4, 3.2, 3.8], 0.18, { mat: MAT.gloss, col: 0xf2a83a });
    return K.build();
  },
  kurogitsune() { return BASE.kitsune({ base: '#2a2630', base2: '#1c1a22', ink: '#f2c040', gold: '#c8302a', red: '#c8302a' }); },
};
