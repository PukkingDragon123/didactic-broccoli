// Museum decoration props — the "fun" set: candy, space, city/retro, ocean, home and spooky pieces.
// Each entry: { name, jp, voxel, footprint:[w,d] (m), themes, beauty (1–10), light?, build(v) }.
// Facing +z, bottom-centre origin, deterministic builds (hash noise only).
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';

// ------------------------------------------------------------------ helpers
const TAU = Math.PI * 2;
const K = C.ink;
const frac = (a) => a - Math.floor(a);
const clamp01 = (a) => Math.max(0, Math.min(1, a));

/** Deterministic hash → [0,1). */
function hsh(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 977) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 668265263);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** Rounded box (corner radius r). */
function rbox(v, x0, y0, z0, x1, y1, z1, r, c) {
  return v.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => {
    const dx = Math.max(x0 + r - x, 0, x - (x1 - r));
    const dy = Math.max(y0 + r - y, 0, y - (y1 - r));
    const dz = Math.max(z0 + r - z, 0, z - (z1 - r));
    return dx * dx + dy * dy + dz * dz <= (r + 0.35) ** 2;
  }, c);
}

/** Box that accepts a colour function (x,y,z) => colour. */
const fbox = (v, x0, y0, z0, x1, y1, z1, c) => v.shape(x0, y0, z0, x1, y1, z1, () => true, c);

/** Front-most z of column (x,y), optionally skipping voxels for which skip(value) is true. */
function frontZ(v, x, y, zFrom = 40, zTo = -40, skip = null) {
  for (let z = zFrom; z >= zTo; z--) {
    const g = v.get(x, y, z);
    if (g !== null && !(skip && skip(g))) return z;
  }
  return null;
}
/** Top-most y of column (x,z). */
function topY(v, x, z, yFrom = 100, yTo = -1) {
  for (let y = yFrom; y >= yTo; y--) if (v.has(x, y, z)) return y;
  return null;
}
const isGlassVal = (g) => g >= 0x8000000 && Math.floor((g - 0x8000000) / 0x1000000) === 4;

const exposed = (v, x, y, z) => !v.has(x + 1, y, z) || !v.has(x - 1, y, z) || !v.has(x, y + 1, z) ||
  !v.has(x, y - 1, z) || !v.has(x, y, z + 1) || !v.has(x, y, z - 1);

/** Fake soft lighting for emissive surfaces (glow has no shading of its own). */
const LDIR = (() => { const l = [-0.35, 0.62, 0.7]; const n = Math.hypot(...l); return l.map((a) => a / n); })();
function lit(base, nx, ny, nz, amt = 0.25) {
  const n = Math.hypot(nx, ny, nz) || 1;
  const d = (nx * LDIR[0] + ny * LDIR[1] + nz * LDIR[2]) / n;
  return shade(base, 1 - amt * (1 - d) / 2);
}

/** Point-in-polygon (2D). */
function inPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Five-point star polygon (point up). */
function starPts(cx, cy, R, r) {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r : R;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

/**
 * Sweep a round tube along a dense path of points. col may be a value or
 * fn(s, phi, t, x, y, z) where s = arc length, phi = angle around the tube (frame uses +z as "up").
 */
function sweep(v, path, r, col) {
  const n = path.length;
  const S = [0];
  for (let i = 1; i < n; i++) S[i] = S[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const p of path) {
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); z0 = Math.min(z0, p[2]);
    x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); z1 = Math.max(z1, p[2]);
  }
  const m = r + 1;
  let hit = 0;
  const rr = (r + 0.25) ** 2;
  v.shape(Math.floor(x0 - m), Math.floor(y0 - m), Math.floor(z0 - m), Math.ceil(x1 + m), Math.ceil(y1 + m), Math.ceil(z1 + m), (x, y, z) => {
    let best = Infinity, bi = 0;
    for (let i = 0; i < n; i++) {
      const p = path[i];
      const d = (x - p[0]) ** 2 + (y - p[1]) ** 2 + (z - p[2]) ** 2;
      if (d < best) { best = d; bi = i; }
    }
    hit = bi;
    return best <= rr;
  }, typeof col !== 'function' ? col : (x, y, z) => {
    const i = hit, p = path[i];
    const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)];
    let T = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const tl = Math.hypot(...T) || 1; T = T.map((q) => q / tl);
    let N = [T[1], -T[0], 0];
    const nl = Math.hypot(...N);
    N = nl < 1e-6 ? [1, 0, 0] : N.map((q) => q / nl);
    const B = [N[1] * T[2] - N[2] * T[1], N[2] * T[0] - N[0] * T[2], N[0] * T[1] - N[1] * T[0]];
    const d = [x - p[0], y - p[1], z - p[2]];
    const phi = Math.atan2(d[0] * B[0] + d[1] * B[1] + d[2] * B[2], d[0] * N[0] + d[1] * N[1] + d[2] * N[2]);
    return col(S[i], phi, i / (n - 1), x, y, z);
  });
  return v;
}

/** Dense polyline (array of [x,y,z]) through control points. */
function polyline(pts, step = 0.35) {
  const out = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
    for (let i = 0; i < n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, a[2] + (b[2] - a[2]) * i / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Rasterise 2D strokes (glyph space, y up) with a square brush. Returns [[x,y],...]. */
function rast(strokes, brush = 2) {
  const set = new Set();
  for (const s of strokes) for (let k = 0; k < s.length - 1; k++) {
    const [ax, ay] = s[k], [bx, by] = s[k + 1];
    const n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2) || 1;
    for (let i = 0; i <= n; i++) {
      const px = Math.round(ax + ((bx - ax) * i) / n), py = Math.round(ay + ((by - ay) * i) / n);
      for (let dx = 0; dx < brush; dx++) for (let dy = 0; dy < brush; dy++) set.add(`${px + dx},${py + dy}`);
    }
  }
  return [...set].map((s) => s.split(',').map(Number));
}

/** Tiny 3×5 pixel font. */
const FONT = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], E: ['###', '#..', '##.', '#..', '###'], G: ['.##', '#..', '#.#', '#.#', '.##'],
  L: ['#..', '#..', '#..', '#..', '###'], M: ['#.#', '###', '###', '#.#', '#.#'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
};
function textRows(str) {
  const rows = ['', '', '', '', ''];
  [...str].forEach((ch, i) => { for (let r = 0; r < 5; r++) rows[r] += (i ? '.' : '') + FONT[ch][r]; });
  return rows;
}

/** Recess a pixel pattern into the front of the model and fill the hole with colour (carved, lit faces). */
function carve(v, rows, legend, x0, y0, zFrom, depth = 2) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const col = legend[ch];
    if (col === undefined) return;
    const x = x0 + c, y = y0 - r;
    const z = frontZ(v, x, y, zFrom, zFrom - 25);
    if (z === null) return;
    for (let d = 0; d < depth; d++) if (v.has(x, y, z - d)) v.set(x, y, z - d, col);
  }));
}

/** Simple kawaii face painted on the front surface. */
function cuteFace(v, cx, eyeY, spread, { blush = C.blush, mouth = 'smile', eye = K, skip = null, zFrom = 40 } = {}) {
  const put = (x, y, c) => { const z = frontZ(v, x, y, zFrom, -40, skip); if (z !== null) v.set(x, y, z, c); };
  for (const s of [-1, 1]) {
    const ex = cx + s * spread;
    put(ex, eyeY, eye); put(ex, eyeY - 1, eye);
    if (blush) { put(ex + s * 2, eyeY - 2, blush); put(ex + s * 2 - s, eyeY - 2, blush); }
  }
  if (mouth === 'smile') { put(cx - 1, eyeY - 2, K); put(cx, eyeY - 3, K); put(cx + 1, eyeY - 2, K); }
  else if (mouth === 'o') { put(cx, eyeY - 3, K); put(cx, eyeY - 2, K); }
  else if (mouth === 'w') { put(cx - 1, eyeY - 2, K); put(cx, eyeY - 3, K); put(cx + 1, eyeY - 2, K); put(cx - 2, eyeY - 3, K); put(cx + 2, eyeY - 3, K); }
}

// ----------------------------------------------------------- sub-models
/** Cow standing/floating, facing +x, belly at y0. */
function cow(v, x0, y0, z0) {
  const W = C.white, B = 0x2a2426, P = 0xffb3c0;
  rbox(v, x0 - 5, y0, z0 - 3, x0 + 4, y0 + 5, z0 + 3, 1, W);
  v.paint(() => {
    v.ellipsoid(x0 - 2, y0 + 4, z0 + 3, 2.6, 2, 1.6, B);
    v.ellipsoid(x0 + 2, y0 + 1, z0 - 3, 2.2, 2, 1.6, B);
    v.ellipsoid(x0 - 4.5, y0 + 1, z0 + 2, 1.6, 1.6, 1.6, B);
    v.ellipsoid(x0 + 2.5, y0 + 5, z0 + 1, 1.6, 1, 2, B);
  });
  for (const [lx, lz, dy] of [[-4, -2, 0], [-4, 2, 1], [2, -2, 1], [2, 2, 0]]) {
    v.box(x0 + lx, y0 - 4 + dy, z0 + lz, x0 + lx + 1, y0 - 1, z0 + lz, W);
    v.box(x0 + lx, y0 - 5 + dy, z0 + lz, x0 + lx + 1, y0 - 5 + dy, z0 + lz, 0x4a3a30);
  }
  v.box(x0 - 1, y0 - 1, z0 - 1, x0, y0 - 1, z0 + 1, P); // udder
  rbox(v, x0 + 5, y0 + 2, z0 - 2, x0 + 8, y0 + 7, z0 + 2, 1, W); // head
  v.box(x0 + 8, y0 + 2, z0 - 2, x0 + 9, y0 + 4, z0 + 2, P); // snout
  v.set(x0 + 9, y0 + 3, z0 - 1, 0xd8808f); v.set(x0 + 9, y0 + 3, z0 + 1, 0xd8808f);
  v.set(x0 + 7, y0 + 5, z0 + 2, K); v.set(x0 + 7, y0 + 5, z0 - 2, K);
  v.set(x0 + 7, y0 + 6, z0 + 2, W);
  v.set(x0 + 6, y0 + 8, z0 - 2, C.cream); v.set(x0 + 6, y0 + 8, z0 + 2, C.cream); // horns
  v.set(x0 + 5, y0 + 6, z0 - 3, P); v.set(x0 + 5, y0 + 6, z0 + 3, P); // ears
  v.paint(() => v.box(x0 + 5, y0 + 6, z0 - 2, x0 + 6, y0 + 7, z0 - 1, B));
  v.line(x0 - 6, y0 + 4, z0, x0 - 7, y0 + 1, z0, W);
  v.set(x0 - 7, y0, z0, B);
}

/** Horizontal macaron: shells, ruffled feet and filling (6 voxels tall from y0). */
function macaron(v, cx, y0, cz, r, col, fill) {
  const foot = shade(col, 1.08);
  v.cylinder(cx, y0, cz, r - 0.9, 1, col);
  v.cylinder(cx, y0 + 1, cz, r, 1, (x, y, z) => (hsh(x, y, z, 3) < 0.5 ? foot : shade(foot, 0.94)));
  v.cylinder(cx, y0 + 2, cz, r - 0.6, 1, fill);
  v.cylinder(cx, y0 + 3, cz, r, 1, (x, y, z) => (hsh(x, y, z, 4) < 0.5 ? foot : shade(foot, 0.94)));
  v.cylinder(cx, y0 + 4, cz, r - 0.2, 1, col);
  v.cylinder(cx, y0 + 5, cz, r - 1.3, 1, shade(col, 1.04));
}

/** Small maneki-neko figure sitting at floor y0. */
function manekiNeko(v, cx, y0, cz) {
  const W = C.white;
  v.ellipsoid(cx, y0 + 3, cz, 2.6, 3, 2.2, W);
  v.sphere(cx, y0 + 7.5, cz, 2.6, W);
  v.box(cx - 2, y0 + 10, cz, cx - 2, y0 + 10, cz, W); v.box(cx + 2, y0 + 10, cz, cx + 2, y0 + 10, cz, W);
  v.set(cx - 2, y0 + 10, cz + 1, C.pink); v.set(cx + 2, y0 + 10, cz + 1, C.pink);
  v.line(cx + 2, y0 + 5, cz + 1, cx + 3, y0 + 9, cz + 1, W); // raised paw
  v.set(cx + 3, y0 + 10, cz + 1, W);
  v.paint(() => v.box(cx - 3, y0 + 5, cz - 3, cx + 3, y0 + 5, cz + 3, C.red));
  v.set(cx, y0 + 4, cz + 3, metal(C.gold));
  v.set(cx - 1, y0 + 8, cz + 3, K); v.set(cx + 1, y0 + 8, cz + 3, K);
  v.set(cx, y0 + 7, cz + 3, C.pink);
  v.set(cx - 1, y0 + 2, cz + 2, C.orange); v.set(cx + 1, y0 + 1, cz + 2, C.charcoal);
}

// ================================================================== props
export default {
  // ================================================================ CANDY
  lollipop: {
    name: 'Swirl Lollipop', jp: 'ぐるぐるキャンディ', voxel: 0.025, footprint: [0.5, 0.5],
    themes: ['candy', 'cute'], beauty: 6,
    build(v) {
      // little candy-tin base with a mint sugar dome
      v.ellipsoid(0, 6, 0, 5, 2.2, 5, gloss(0x9fe6c8));
      v.cylinder(0, 0, 0, 8, 2, gloss(0xff6f9a));
      v.cylinder(0, 2, 0, 7, 3, gloss(C.white));
      v.cylinder(0, 5, 0, 7.5, 1, gloss(0xff6f9a));
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU, y = k % 2 ? 2.6 : 3.6;
        v.paint(() => v.sphere(Math.cos(a) * 7, y, Math.sin(a) * 7, 0.9, gloss(k % 4 < 2 ? 0x5cc4ff : 0xffd23f)));
      }
      // paper stick
      v.box(-1, 6, -1, 1, 53, 1, C.white);
      v.paint(() => v.box(1, 6, -1, 1, 53, 1, 0xece6da));
      // swirl disc
      const cy = 62, R = 10.6;
      const swirl = [0xff4f8b, C.white, 0x6fd3f2, C.white, 0xffd23f, C.white];
      v.shape(-11, cy - 11, -2, 11, cy + 11, 1, (x, y, z) => {
        const d = Math.hypot(x, y - cy);
        if (d > R) return false;
        return d > 9.3 ? (z === -1 || z === 0) : true;
      }, (x, y) => {
        const d = Math.hypot(x, y - cy), a = Math.atan2(y - cy, x);
        if (d > 9.9) return gloss(0xff4f8b);
        const u = frac(a / TAU + d * 0.11);
        return gloss(swirl[Math.floor(u * 6)]);
      });
      // glossy shine arc
      v.paint(() => v.shape(-11, cy - 11, 1, 11, cy + 11, 1, (x, y) => {
        const d = Math.hypot(x, y - cy), a = Math.atan2(y - cy, x);
        return d > 6 && d < 7.8 && a > 1.9 && a < 2.7;
      }, gloss(0xfff6fa)));
      // ribbon bow
      const by = 51, bz = 2, bow = gloss(0x5cb8ff);
      v.box(-2, by - 1, -2, 2, by, 2, bow);
      v.ellipsoid(-3.5, by + 0.5, bz, 2.5, 1.8, 1, bow);
      v.ellipsoid(3.5, by + 0.5, bz, 2.5, 1.8, 1, bow);
      v.sphere(0, by, bz + 0.5, 1.2, gloss(0x3a8ee0));
      v.line(-1, by - 1, bz, -3, by - 6, bz + 1, bow);
      v.line(1, by - 1, bz, 3, by - 6, bz + 1, bow);
    },
  },

  cupcake: {
    name: 'Giant Cupcake', jp: 'ジャンボカップケーキ', voxel: 0.02, footprint: [1, 1],
    themes: ['candy', 'food'], beauty: 6,
    build(v) {
      const wrapA = 0x8fd8c0, wrapB = 0x66bfa4;
      v.shape(-17, 0, -17, 17, 12, 17, (x, y, z) => {
        const a = Math.atan2(z, x), r = 12 + (3.5 * y) / 12;
        return Math.hypot(x, z) <= r + (Math.cos(a * 16) > 0 ? 0.55 : 0);
      }, (x, y, z) => {
        const c = Math.cos(Math.atan2(z, x) * 16) > 0 ? wrapA : wrapB;
        return y === 0 ? shade(c, 0.85) : c;
      });
      // frilly paper rim
      v.shape(-17, 13, -17, 17, 14, 17, (x, y, z) => {
        const k = Math.cos(Math.atan2(z, x) * 16);
        return Math.hypot(x, z) <= 15.8 + 0.6 * k && (y === 13 || k > 0.2);
      }, C.white);
      // chocolate sponge dome
      v.shape(-17, 14, -17, 17, 18, 17, (x, y, z) => (x * x + z * z) / 16.4 ** 2 + ((y - 14) / 4.2) ** 2 <= 1, 0x8a5232);
      // strawberry frosting swirl
      const fr = 0xffb3c9;
      v.torus(0, 19, 0, 11, 4.4, fr);
      v.ellipsoid(0, 19, 0, 11, 4.4, 11, fr);
      v.torus(0, 25, 0, 7.5, 3.9, fr);
      v.ellipsoid(0, 25, 0, 8, 3.9, 8, fr);
      v.torus(0, 30, 0, 4, 3.2, fr);
      v.sphere(0, 30, 0, 4, fr);
      v.sphere(0, 33.5, 0, 2.6, fr);
      v.sphere(0.6, 36, 0, 1.6, fr);
      v.recolor((x, y, z, c) => {
        if (c !== fr) return undefined;
        let col = shade(fr, 0.9 + clamp01((y - 15) / 22) * 0.14);
        if (exposed(v, x, y, z) && hsh(x, y, z, 9) < 0.08) {
          col = [0xffd23f, 0x6fd3f2, 0x9be7a0, C.white, 0xc7a8ff, 0xff5c93][Math.floor(hsh(x, y, z, 2) * 6)];
          return gloss(col);
        }
        return col;
      });
      // cherry on top
      v.sphere(0, 40, 0, 3, gloss(0xd81e3a));
      v.set(-1, 42, 2, gloss(0xff9aa8)); v.set(-2, 41, 2, gloss(0xff6f80));
      v.line(0, 43, 0, 1, 45, 0, 0x5f7a2a);
      v.line(1, 45, 0, 3, 47, -1, 0x5f7a2a);
    },
  },

  donut_seat: {
    name: 'Donut Seat', jp: 'ドーナツいす', voxel: 0.02, footprint: [1, 1],
    themes: ['candy', 'food'], beauty: 6,
    build(v) {
      const R = 14.2, rr = 7.8, rh = 9, cy = 9;
      const dough = 0xe9b06a, crust = 0xc98a45, band = 0xf7e2b8, glaze = 0xff8fbf;
      v.shape(-23, 0, -23, 23, 18, 23, (x, y, z) => {
        const q = Math.hypot(x, z) - R;
        return (q / rr) ** 2 + ((y - cy) / rh) ** 2 <= 1;
      }, (x, y, z) => {
        const a = Math.atan2(z, x), q = Math.hypot(x, z) - R;
        const sec = Math.floor(((a + Math.PI) / TAU) * 22), t = frac(((a + Math.PI) / TAU) * 22);
        const drip = hsh(sec, 3, 7) * 3.6 * Math.sin(Math.PI * t);
        const gl = q >= 0 ? y >= 12 - drip : y >= 12.5 - drip * 0.4;
        if (gl) {
          const shine = q > -2 && q < 3 && a > 1.6 && a < 2.6 && y >= 17;
          return gloss(shine ? 0xffc6de : glaze);
        }
        if (Math.abs(y - 9) <= 0.5 && q > 3) return band;
        return y < 6 ? crust : dough;
      });
      const spr = [C.white, 0xffd23f, 0x6cc8ff, 0x8fe08a, 0xc9a0ff, 0xff5a5a];
      for (let i = 0; i < 90; i++) {
        const a = hsh(i, 1, 2) * TAU, rad = R + (hsh(i, 2, 3) - 0.5) * 11;
        const x = Math.round(Math.cos(a) * rad), z = Math.round(Math.sin(a) * rad);
        const y = topY(v, x, z, 20);
        if (y === null || y < 13) continue;
        const c = gloss(spr[i % spr.length]);
        v.set(x, y + 1, z, c);
        const [dx, dz] = hsh(i, 4, 5) < 0.5 ? [1, 0] : [0, 1];
        if (v.has(x + dx, y, z + dz) && !v.has(x + dx, y + 1, z + dz)) v.set(x + dx, y + 1, z + dz, c);
      }
    },
  },

  candy_cane: {
    name: 'Candy Cane Heart', jp: 'キャンディケイン', voxel: 0.025, footprint: [0.5, 0.5],
    themes: ['candy'], beauty: 6,
    build(v) {
      // candy tin with gold rim + sugar snow
      v.cylinder(0, 0, 0, 9, 4, gloss(0x3cae5a));
      v.cylinder(0, 4, 0, 9.4, 1, metal(C.gold));
      v.paint(() => {
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * TAU;
          v.sphere(Math.cos(a) * 9, k % 2 ? 1.5 : 2.5, Math.sin(a) * 9, 0.8, C.white);
        }
      });
      v.shape(-9, 5, -9, 9, 10, 9, (x, y, z) => (x * x + z * z) / 72 + ((y - 5) / 4) ** 2 <= 1, C.white);
      // two canes forming a heart
      const cane = (s, z, main, accent) => {
        const ctl = [[-s * 3, 4, z], [s * 9.6, 57, z]];
        const pts = polyline(ctl, 0.35);
        const cx = s * 4.8, cy = 57, r = 4.8;
        for (let i = 1; i <= 60; i++) {
          const t = i / 60, ang = s < 0 ? Math.PI - t * 1.25 * Math.PI : t * 1.25 * Math.PI;
          pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, z]);
        }
        sweep(v, pts, 1.8, (sArc, phi) => {
          const u = frac(sArc / 6 + phi / TAU);
          if (u < 0.42) return gloss(main);
          if (u > 0.56 && u < 0.66) return gloss(accent);
          return gloss(C.white);
        });
      };
      cane(-1, -1.5, 0xe8323c, 0x3cae5a);
      cane(1, 1.5, 0x2fa85a, 0xe8323c);
      // bow at the crossing
      const bow = gloss(0xff6fa0);
      v.ellipsoid(-3, 17.5, 3.5, 2.6, 1.8, 1.1, bow);
      v.ellipsoid(3, 17.5, 3.5, 2.6, 1.8, 1.1, bow);
      v.sphere(0, 17, 4, 1.2, gloss(0xe0457f));
      v.line(-1, 16, 3, -2.5, 12, 4, bow); v.line(1, 16, 3, 2.5, 12, 4, bow);
    },
  },

  gumdrop_tree: {
    name: 'Gumdrop Tree', jp: 'グミの木', voxel: 0.025, footprint: [1, 1],
    themes: ['candy', 'cute'], beauty: 8,
    build(v) {
      // polka-dot pot
      v.cylinder(0, 0, 0, 7, 7, gloss(0xff8fb0));
      v.tube(0, 7, 0, 8.5, 6.8, 3, gloss(0xffb3c9));
      v.cylinder(0, 7, 0, 7, 2, 0x5a3420);
      for (let k = 0; k < 14; k++) {
        const a = (k / 7) * Math.PI + (k % 2) * 0.45, y = k % 2 ? 2 : 5;
        v.paint(() => v.sphere(Math.cos(a) * 7, y, Math.sin(a) * 7, 0.95, gloss(C.white)));
      }
      // twisted chocolate trunk
      v.cylinder(0, 9, 0, 2.3, 37, (x, y, z) => (frac(Math.atan2(z, x) / TAU + y / 9) < 0.3 ? C.cream : 0x6b3f24));
      v.line(0, 36, 0, -8, 46, 1, 0x6b3f24, 1.3);
      v.line(0, 38, 0, 8, 47, -1, 0x6b3f24, 1.3);
      // fluffy mint canopy
      const leafA = 0x5fc489, leafB = 0xd2f7dc;
      const ccol = (x, y, z) => mix(leafA, leafB, clamp01((y - 40) / 30) * 0.8 + (hsh(x, y, z, 5) - 0.5) * 0.08);
      const canopy = [[0, 53, 0, 12], [-10, 48, 1, 8.5], [10, 49, -1, 8.5], [-5, 61, -1, 8.5], [6, 60, 1, 8.5], [0, 64, 0, 7], [0, 50, 6, 8]];
      for (const [x, y, z, r] of canopy) v.sphere(x, y, z, r, ccol);
      // gumdrops studded over the canopy
      const gcols = [0xff4d6a, 0xff9a3c, 0xffd84a, 0xb07ce8, 0x4fcf6a, 0xff7fc0, 0x5cc4ff];
      const N = 60;
      for (let i = 0; i < N; i++) {
        const yy = 1 - ((i + 0.5) / N) * 2, rad = Math.sqrt(1 - yy * yy), th = i * 2.39996;
        const d = [Math.cos(th) * rad, yy, Math.sin(th) * rad];
        if (d[1] < -0.5) continue;
        let t = 0;
        while (t < 30 && v.has(Math.round(d[0] * t), Math.round(54 + d[1] * t), Math.round(d[2] * t))) t += 0.5;
        const p = [d[0] * (t - 0.2), 54 + d[1] * (t - 0.2), d[2] * (t - 0.2)];
        const c = gcols[i % gcols.length];
        v.sphere(p[0], p[1], p[2], 1.9, (x, y, z) => (hsh(x, y, z, 1) < 0.22 ? shade(c, 1.25) : c));
      }
      // fallen gumdrops on the soil
      v.sphere(-3, 10, 3, 1.5, 0xff4d6a); v.sphere(3, 10, -2, 1.5, 0xffd84a);
    },
  },

  softserve: {
    name: 'Soft-Serve Stand', jp: 'ソフトクリーム', voxel: 0.025, footprint: [0.5, 0.5],
    themes: ['candy', 'food'], beauty: 6,
    build(v) {
      v.cylinder(0, 0, 0, 7, 2, metal(C.silver));
      v.cylinder(0, 2, 0, 5, 1, gloss(0xff8fb0));
      v.cylinder(0, 3, 0, 1, 21, metal(C.chrome));
      v.cylinder(0, 24, 0, 4.2, 1, metal(C.silver));
      v.tube(0, 25, 0, 4.2, 3.2, 4, metal(C.silver));
      // waffle cone
      const cr = (y) => 0.6 + (7.4 * (y - 25)) / 21;
      v.shape(-9, 25, -9, 9, 45, 9, (x, y, z) => Math.hypot(x, z) <= cr(y) + 0.2, (x, y, z) => {
        const u = (Math.atan2(-x, z) / TAU) * 14;
        const g = frac(u + y / 3.2) < 0.22 || frac(u - y / 3.2) < 0.22;
        return g ? 0xb06a2c : 0xe3a75a;
      });
      v.torus(0, 46, 0, 7.6, 1.2, 0xf0bf72);
      // vanilla-strawberry twist
      const sc = (x, y, z) => (frac(Math.atan2(-x, z) / TAU * 2 + y * 0.09) < 0.5 ? 0xfff4e2 : 0xffbfd0);
      v.ellipsoid(0, 48, 0, 8.6, 2.6, 8.6, sc);
      v.torus(0, 49.5, 0, 6.2, 3.2, sc);
      v.torus(0, 54, 0, 4.8, 3, sc);
      v.ellipsoid(0, 54, 0, 5, 3, 5, sc);
      v.torus(0, 58.5, 0, 3.2, 2.6, sc);
      v.sphere(0, 58.5, 0, 3, sc);
      v.torus(0, 62.2, 0, 1.6, 2.1, sc);
      v.sphere(0, 62.5, 0, 2.2, sc);
      v.cone(0, 64, 0, 1.8, 3, sc);
      v.set(1, 67, 0, sc(1, 67, 0)); v.set(2, 67, 0, sc(2, 67, 0));
      // wafer stick
      v.line(3, 54, 4, 6, 64, 6, 0xf2c27b, 1);
      v.paint(() => { for (let y = 55; y < 65; y += 3) v.box(2, y, 3, 7, y, 7, 0xc98a45); });
    },
  },

  macaron_tower: {
    name: 'Macaron Tower', jp: 'マカロンタワー', voxel: 0.02, footprint: [0.5, 0.5],
    themes: ['candy', 'food'], beauty: 7,
    build(v) {
      // cake stand
      v.cylinder(0, 0, 0, 6, 2, metal(C.gold));
      v.cylinder(0, 2, 0, 2, 3, metal(C.gold));
      v.cylinder(0, 5, 0, 12.5, 1, (x, y, z) => (Math.hypot(x, z) > 11.6 ? metal(C.gold) : gloss(C.ceramic)));
      v.cone(0, 6, 0, 8, 46, 0xfff1dc);
      const cols = [0xffb8cc, 0xc4e6a0, 0xd2b8f0, 0xfff0a0, 0xffc8a0, 0xb8e0ff];
      const fills = [C.white, 0xfff7e6, 0x8a5232, 0xffffff, 0xff8fb0, 0xfff7e6];
      let m = 0;
      for (let k = 0; k < 9; k++) {
        const y0 = 6 + k * 6, R = 8.2 * (1 - k / 8.4);
        const n = k === 8 ? 1 : Math.max(3, Math.round((TAU * R) / 7));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + k * 0.55;
          const ci = m++ % cols.length;
          macaron(v, n === 1 ? 0 : Math.cos(a) * R, y0, n === 1 ? 0 : Math.sin(a) * R, 4.2, cols[ci], fills[ci]);
        }
      }
      // strawberry on top
      v.sphere(0, 61.5, 0, 2.2, gloss(0xe8323c));
      v.set(-1, 62, 2, gloss(0xffd0d0)); v.set(1, 61, 2, C.yellow);
      v.box(-1, 63, 0, 1, 63, 0, 0x3cae5a); v.box(0, 63, -1, 0, 64, 1, 0x3cae5a);
    },
  },

  // ================================================================ SPACE
  rocket: {
    name: 'Retro Rocket', jp: 'レトロロケット', voxel: 0.03, footprint: [1, 1],
    themes: ['space', 'retro'], beauty: 9,
    build(v) {
      // launch pad with hazard ring
      v.cylinder(0, 0, 0, 15.5, 3, 0x8d8a86);
      v.paint(() => v.shape(-16, 2, -16, 16, 2, 16, (x, y, z) => Math.hypot(x, z) >= 13.2,
        (x, y, z) => (frac(((Math.atan2(z, x) + Math.PI) / TAU) * 20) < 0.5 ? C.yellow : C.charcoal)));
      v.paint(() => v.shape(-16, 0, -16, 16, 0, 16, () => true, 0x6f6c68));
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        v.set(Math.round(Math.cos(a) * 12), 3, Math.round(Math.sin(a) * 12), glow(0xff5040));
      }
      v.cylinder(0, 3, 0, 9, 1, 0x6a6764);
      // fins (drawn first, body overwrites the root)
      for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        v.shape(-15, 4, -15, 15, 40, 15, (x, y, z) => {
          const u = x * ax + z * az, w = x * az - z * ax;
          if (u < 3 || u > 14.5 || Math.abs(w) > 1) return false;
          const top = 12 + (14.5 - u) * 1.9;
          const bot = u >= 9 ? 4 : 4 + (9 - u) * 0.9;
          return y >= bot && y <= top;
        }, (x, y, z) => {
          const u = x * ax + z * az;
          if (y <= 5 && u >= 11) return metal(C.silver);
          const top = 12 + (14.5 - u) * 1.9;
          if (y >= top - 1.2 || u >= 13.6) return gloss(C.white);
          return gloss(C.red);
        });
      }
      // body
      const prof = (y) => {
        const t = (y - 8) / 70;
        if (t < 0 || t > 1) return -1;
        if (t < 0.3) return 7.5 * Math.sqrt(1 - ((0.3 - t) / 0.3) ** 2 * 0.45);
        return 7.5 * Math.pow(Math.max(0, 1 - ((t - 0.3) / 0.7) ** 2.2), 0.65);
      };
      v.shape(-8, 8, -8, 8, 78, 8, (x, y, z) => Math.hypot(x, z) <= prof(y) + 0.25, (x, y, z) => {
        if (y >= 60) return gloss(C.red);
        if (y === 58) return gloss(C.navy);
        if (y >= 24 && y <= 26) return gloss(C.red);
        if (y <= 9) return metal(C.silver);
        return gloss(C.white);
      });
      v.set(0, 79, 0, metal(C.silver)); v.set(0, 80, 0, glow(0xff5040));
      // nozzle
      v.tube(0, 4, 0, 4.2, 2.6, 4, metal(0x7d828c));
      v.cylinder(0, 7, 0, 2.6, 1, glow(0xffa040));
      // portholes
      const port = (cy, r) => {
        for (let x = -Math.ceil(r) - 1; x <= r + 1; x++) for (let y = cy - Math.ceil(r) - 1; y <= cy + r + 1; y++) {
          const d = Math.hypot(x, y - cy);
          if (d > r + 0.3) continue;
          const z = frontZ(v, x, y, 12, 0);
          if (z === null) continue;
          if (d > r - 1) v.set(x, y, z + 1, metal(C.chrome));
          else v.set(x, y, z, gloss((x === -1 && y === cy + 1) || (x === 0 && y === cy + 1) || (x === -1 && y === cy) ? 0xa8dcff : 0x2a4a8a));
        }
      };
      port(46, 3.6);
      port(36, 2.6);
      // little gold star decal
      v.project(['..Y..', 'YYYYY', '.YYY.', 'Y...Y'], { Y: metal(C.gold) }, -2, 21);
    },
  },

  planet_lamp: {
    name: 'Saturn Lamp', jp: '土星ランプ', voxel: 0.02, footprint: [1, 1],
    themes: ['space'], beauty: 8, light: 0xffd8a0,
    build(v) {
      v.cylinder(0, 0, 0, 9, 2, gloss(C.woodDark));
      v.cylinder(0, 2, 0, 7, 2, gloss(C.wood));
      v.cylinder(0, 4, 0, 2.2, 2, metal(C.brass));
      v.cylinder(0, 6, 0, 1, 34, gloss(0xd8aa48));
      v.set(0, 3, 7, metal(C.brass)); v.set(0, 3, 8, metal(C.brass));
      // glowing banded planet
      const cy = 52, R = 12.5;
      const bands = [0xffe9c2, 0xffd6a4, 0xf7c08c, 0xffe2b4, 0xf2ae7e, 0xffd8a8, 0xffeccc];
      v.sphere(0, cy, 0, R, (x, y, z) => {
        const a = Math.atan2(z, x);
        const t = (y - cy) / R + 0.07 * Math.sin(a * 3 + y * 0.3);
        let c = bands[Math.max(0, Math.min(6, Math.floor(((t + 1) / 2) * 7)))];
        if (Math.hypot(x - 6, (y - 48.5) * 1.5, z - 10) < 3.2) c = 0xe8946a;
        return glow(lit(c, x, y - cy, z, 0.3));
      });
      // tilted ring
      const a = 0.36, ca = Math.cos(a), sa = Math.sin(a), b = -0.42, cb = Math.cos(b), sb = Math.sin(b);
      const loc = (x, y, z) => {
        const x1 = x * ca + (y - cy) * sa, y1 = -x * sa + (y - cy) * ca;
        return [x1, y1 * cb + z * sb, -y1 * sb + z * cb];
      };
      v.shape(-22, cy - 16, -22, 22, cy + 16, 22, (x, y, z) => {
        const [xr, yr, zr] = loc(x, y, z), rr = Math.hypot(xr, zr);
        return Math.abs(yr) <= 0.85 && rr >= 15.5 && rr <= 21;
      }, (x, y, z) => {
        const [xr, , zr] = loc(x, y, z), rr = Math.hypot(xr, zr);
        if (rr < 16.8) return gloss(0xd9b6f2);
        if (rr < 17.7) return gloss(0x9f7cc4);
        if (rr < 20) return gloss(0xeed6ff);
        return gloss(0xc4a0e8);
      });
      for (const s of [-1, 1]) v.line(s * 12 * ca, cy + s * 12 * sa, 0, s * 15.9 * ca, cy + s * 15.9 * sa, 0, metal(C.brass), 0.6);
    },
  },

  ufo: {
    name: 'UFO Abduction', jp: 'UFOと牛', voxel: 0.025, footprint: [1, 1],
    themes: ['space', 'weird'], beauty: 9, light: 0x80ffd0,
    build(v) {
      v.cylinder(0, 0, 0, 11, 2, metal(0x4a4f5c));
      v.cylinder(0, 2, 0, 10, 1, C.grass);
      for (let x = -9; x <= 9; x++) for (let z = -9; z <= 9; z++) {
        if (Math.hypot(x, z) > 9.3 || Math.hypot(x, z) < 8.5 * 0 + 0 && false) continue;
        const h = hsh(x, 3, z, 11);
        if (Math.hypot(x, z) > 9.3) continue;
        if (h < 0.05) v.set(x, 3, z, [C.white, C.yellow, C.pink][Math.floor(hsh(x, 4, z) * 3)]);
        else if (h < 0.16) v.set(x, 3, z, C.grassDark);
      }
      // tractor beam
      v.shape(-10, 3, -10, 10, 41, 10, (x, y, z) => Math.hypot(x, z) <= 9 - (5.5 * (y - 3)) / 38 + 0.2, glass(0x9effd8));
      cow(v, -1, 22, 0);
      // saucer
      v.ellipsoid(0, 46, 0, 22, 4.3, 22, (x, y, z) => {
        const d = Math.hypot(x, z);
        if (y === 46 && d >= 20) {
          const seg = Math.floor(((Math.atan2(z, x) + Math.PI) / TAU) * 24);
          return seg % 2 ? gloss(0x5a606c) : glow([0x80ffd0, 0xffe070, 0xff80c0][(seg / 2) % 3]);
        }
        if (y === 47 && d >= 17) return gloss(0x4fc8a8);
        if (y <= 42 && d < 6) return glow(0x9fffe0);
        if (y <= 44) return gloss(0x9aa0ac);
        return gloss(y >= 49 ? 0xe6e9ef : 0xcfd3db);
      });
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        v.set(Math.round(Math.cos(a) * 12), 49, Math.round(Math.sin(a) * 12), glow(0xffe070));
      }
      // glass dome with a little alien pilot
      v.shape(-9, 51, -9, 9, 60, 9, (x, y, z) => x * x + (y - 50) ** 2 + z * z <= 8.6 ** 2, glass(0xc8f4ff));
      v.torus(0, 51, 0, 8.6, 0.8, metal(C.silver));
      v.cylinder(0, 51, 0, 2, 2, gloss(0x7fd85a));
      v.sphere(0, 55, 0, 3.2, gloss(0x8fe36a));
      v.ellipsoid(-1.4, 55.5, 2.4, 1, 1.3, 0.8, gloss(K));
      v.ellipsoid(1.4, 55.5, 2.4, 1, 1.3, 0.8, gloss(K));
      v.set(-1, 56, 3, C.white); v.set(2, 56, 3, C.white);
      v.line(-1, 58, 0, -2, 59, 0, gloss(0x7fd85a)); v.line(1, 58, 0, 2, 59, 0, gloss(0x7fd85a));
      v.set(-2, 59, 1, glow(0xff80c0)); v.set(2, 59, 1, glow(0xff80c0));
    },
  },

  astronaut: {
    name: 'Astronaut Statue', jp: '宇宙飛行士像', voxel: 0.03, footprint: [1, 1],
    themes: ['space'], beauty: 8,
    build(v) {
      const suit = 0xf4f2ec, suitS = 0xdcdad4, gray = 0x9aa0a8;
      // moon-rock plinth
      v.cylinder(0, 0, 0, 9.5, 4, (x, y, z) => shade(0xaaa69e, 0.92 + hsh(x, y, z, 2) * 0.12));
      v.paint(() => {
        for (const [a, y, r] of [[0.6, 2, 1.6], [2.2, 1.5, 1.2], [3.6, 2.3, 1.4], [5.1, 1.8, 1.1]]) v.sphere(Math.cos(a) * 9.5, y, Math.sin(a) * 9.5, r, 0x7f7b75);
      });
      // boots + legs
      for (const s of [-1, 1]) {
        rbox(v, s > 0 ? 1 : -5, 4, -3, s > 0 ? 5 : -1, 7, 4, 1, gray);
        rbox(v, s > 0 ? 1 : -5, 8, -3, s > 0 ? 5 : -1, 20, 3, 1, suit);
        v.box(s > 0 ? 2 : -4, 13, 4, s > 0 ? 4 : -2, 14, 4, gray);
      }
      // torso, belt, chest panel, backpack
      v.ellipsoid(0, 27, 0, 7, 8, 5, suit);
      v.paint(() => v.box(-8, 19, -6, 8, 20, 6, gray));
      rbox(v, -6, 21, -9, 6, 35, -4, 1, suitS);
      v.paint(() => { for (let y = 24; y <= 32; y += 4) v.box(-4, y, -9, 4, y, -9, gray); });
      v.box(-3, 24, 4, 3, 29, 5, 0x6a707a);
      [[-2, 28, 0xff5050], [0, 28, 0xffd040], [2, 28, 0x60e070], [-2, 26, 0x60b0ff], [1, 26, 0xffffff]].forEach(([x, y, c]) => v.set(x, y, 5, glow(c)));
      v.box(1, 25, 5, 2, 25, 5, 0x3a3f48);
      // arms: left down, right waving
      v.line(-7.5, 33, 0, -9.3, 24, 1, suit, 2.2);
      v.sphere(-9.6, 22, 1.5, 2.3, gray);
      v.line(7.5, 33, 0, 9.5, 37, 1, suit, 2.2);
      v.line(9.5, 37, 1, 10, 44, 1.5, suit, 2.2);
      v.sphere(10.2, 46.5, 1.5, 2.3, gray);
      v.sphere(8.2, 46, 2.5, 1.1, gray);
      v.paint(() => { v.sphere(-7.5, 33, 0, 2.5, suit); v.box(-10, 31, 3, -6, 33, 3, C.red); v.box(-9, 32, 3, -8, 32, 3, C.white); });
      // helmet with glass visor and a happy face inside
      v.torus(0, 35, 0, 5, 1, gloss(0xb8bec8));
      v.sphere(0, 43, 0, 8.5, gloss(suit));
      v.shape(-9, 34, 0, 9, 52, 9, (x, y, z) => v.has(x, y, z) && (x / 5.8) ** 2 + ((y - 43.5) / 4.6) ** 2 <= 1, (x, y, z) => {
        const d = Math.hypot(x, y - 43, z);
        return d > 7.4 ? glass(0xb8e4ff) : d > 6.0 ? glow(shade(C.skin, 0.8)) : C.skinShade;
      });
      v.paint(() => v.shape(-9, 34, 1, 9, 52, 9, (x, y, z) => {
        const e = (x / 7) ** 2 + ((y - 43.5) / 5.8) ** 2;
        return e <= 1 && (x / 5.8) ** 2 + ((y - 43.5) / 4.6) ** 2 > 1 && Math.hypot(x, y - 43, z) > 7.2;
      }, gloss(0xf2c14e)));
      cuteFace(v, 0, 45, 2, { skip: isGlassVal, zFrom: 10 });
      v.cylinder(-10, 43, 0, 2.2, 2, gray, 'x');
      v.cylinder(9, 43, 0, 2.2, 2, gray, 'x');
      v.line(-9, 45, 0, -10, 51, -1, metal(C.silver));
      v.set(-10, 52, -1, glow(0xff5050));
    },
  },

  moon_rock: {
    name: 'Moon Rock', jp: '月の石', voxel: 0.02, footprint: [1, 1],
    themes: ['space'], beauty: 5,
    build(v) {
      const rock = [[0, 7, 0, 17, 8, 13], [-8, 9, 3, 9, 8, 8], [7, 10, -2, 10, 9, 9], [3, 5, 7, 11, 5, 7], [-12, 5, -4, 7, 5, 6]];
      for (const [x, y, z, a, b, c] of rock) v.ellipsoid(x, y, z, a, b, c, (px, py, pz) => shade(mix(0xa9a59d, 0xd6d2c8, clamp01(py / 18)), 0.93 + hsh(px, py, pz, 6) * 0.12));
      v.box(-20, -6, -16, 20, -1, 16, null);
      // craters
      const craters = [[[-0.5, 0.5, 0.7], 3.2], [[0.6, 0.7, 0.3], 2.8], [[-0.85, 0.3, 0.4], 2.4], [[0.1, 1, -0.2], 3], [[0.7, 0.2, 0.7], 2.2], [[-0.2, 0.2, 1], 2.5], [[0.9, 0.4, -0.5], 2.4]];
      for (const [dir, r] of craters) {
        const n = Math.hypot(...dir), d = dir.map((q) => q / n);
        let t = 0;
        while (t < 25 && v.has(Math.round(d[0] * t), Math.round(8 + d[1] * t), Math.round(d[2] * t))) t += 0.5;
        const c = [d[0] * (t + 0.6), 8 + d[1] * (t + 0.6), d[2] * (t + 0.6)];
        v.sphere(c[0], c[1], c[2], r, null);
        v.paint(() => v.shape(Math.floor(c[0] - r - 3), Math.floor(c[1] - r - 3), Math.floor(c[2] - r - 3), Math.ceil(c[0] + r + 3), Math.ceil(c[1] + r + 3), Math.ceil(c[2] + r + 3),
          (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) <= r + 2.2,
          (x, y, z) => (Math.hypot(x - c[0], y - c[1], z - c[2]) <= r + 1 ? 0x85817b : 0xe2ded6)));
      }
      // glowing moon crystals
      for (const [x, z, h] of [[-13, 6, 4], [11, 9, 3], [-4, -11, 3]]) {
        const y = topY(v, x, z, 25) ?? 0;
        v.line(x, y, z, x, y + h, z, glow(0xc8b0ff));
        v.line(x + 1, y, z, x + 2, y + h - 1, z, glow(0xa890ff));
      }
      // little flag
      const fy = topY(v, 4, -2, 25);
      v.line(4, fy, -2, 4, fy + 15, -2, metal(C.silver));
      v.set(4, fy + 16, -2, metal(C.gold));
      for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) {
        const z = -2 + Math.round(Math.sin(i * 0.7) * 1.2);
        const cap = (i >= 2 && i <= 6 && j >= 1 && j <= 4);
        const top = j <= 2;
        v.set(5 + i, fy + 15 - j, z, cap ? (top ? 0xff6f9a : C.white) : 0x2f6fd6);
      }
      v.set(5 + 4, fy + 15 - 1, -2 + Math.round(Math.sin(4 * 0.7) * 1.2), 0xff6f9a);
      // boot prints
      for (const [x, z] of [[-2, 4], [1, 7], [-6, 1]]) {
        const y = topY(v, x, z, 25);
        if (y !== null) v.box(x, y, z, x + 1, y, z + 1, 0x8f8b85);
      }
    },
  },

  star_lamp: {
    name: 'Star Lamp', jp: 'お星さまランプ', voxel: 0.025, footprint: [0.5, 0.5],
    themes: ['space', 'cute'], beauty: 7, light: 0xfff0a0,
    build(v) {
      v.cylinder(0, 0, 0, 6, 2, (x, y, z) => (Math.hypot(x, z) > 5.2 ? metal(C.gold) : gloss(C.navy)));
      v.paint(() => { for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; v.set(Math.round(Math.cos(a) * 4), 1, Math.round(Math.sin(a) * 4), metal(C.gold)); } });
      v.cylinder(0, 2, 0, 4, 1, gloss(C.navy));
      v.cylinder(0, 3, 0, 1, 42, gloss(0xd8aa48));
      // small crescent moon on a side arm
      v.line(1, 28, 0, 5, 31, 0, metal(C.brass));
      v.shape(3, 26, -1, 11, 38, 0, (x, y) => Math.hypot(x - 7, y - 32) <= 4.2 && Math.hypot(x - 8.8, y - 33.2) > 3.4, (x, y, z) => glow(lit(0xdfe8ff, x - 7, y - 32, 3)));
      // puffy star
      const cy = 49, outer = starPts(0, cy, 10.5, 4.7), inner = starPts(0, cy, 6.6, 3);
      v.shape(-11, cy - 11, -2, 11, cy + 11, 1, (x, y, z) => {
        if (!inPoly(x, y, outer)) return false;
        return inPoly(x, y, inner) ? true : z === -1 || z === 0;
      }, (x, y, z) => glow(inPoly(x, y, inner) ? lit(0xfff3b0, x, y - cy, 6, 0.18) : lit(0xffd860, x, y - cy, 3, 0.2)));
      // sleepy-happy face
      v.set(-3, 50, 1, K); v.set(-3, 51, 1, K); v.set(3, 50, 1, K); v.set(3, 51, 1, K);
      v.set(-5, 48, 1, 0xff9fae); v.set(5, 48, 1, 0xff9fae);
      v.set(-1, 48, 1, K); v.set(0, 47, 1, K); v.set(1, 48, 1, K);
    },
  },

  // ============================================================ CITY / RETRO
  neon_gacha: {
    name: 'Neon Gacha Sign', jp: 'ネオン看板「ガチャ」', voxel: 0.025, footprint: [1.5, 0.5],
    themes: ['city', 'retro'], beauty: 8, light: 0xff60c0,
    build(v) {
      // feet + posts
      for (const s of [-1, 1]) {
        v.box(s * 17, 0, -5, s * 23, 1, 3, metal(0x3a3f50));
        v.box(s * 20, 2, -3, s * 21, 34, -2, metal(0x50566a));
      }
      // board
      v.box(-27, 9, -1, 27, 36, 0, 0x1d2238);
      v.paint(() => v.shape(-27, 9, -1, 27, 36, 0, (x, y) => Math.abs(x) === 27 || y === 9 || y === 36, metal(0x4a5068)));
      for (let x = -27; x <= 27; x++) { v.set(x, 9, 1, metal(0x4a5068)); v.set(x, 36, 1, metal(0x4a5068)); }
      for (let y = 9; y <= 36; y++) { v.set(-27, y, 1, metal(0x4a5068)); v.set(27, y, 1, metal(0x4a5068)); }
      // cyan border tube
      const cyan = glow(0x5ae0ff);
      for (let x = -24; x <= 24; x++) { v.set(x, 11, 1, cyan); v.set(x, 34, 1, cyan); }
      for (let y = 12; y <= 33; y++) { v.set(-25, y, 1, cyan); v.set(25, y, 1, cyan); }
      // ガチャ in pink neon tubes
      const GA = [[[0, 11], [11, 11], [11, 3], [10, 1], [8, 0]], [[5, 16], [5, 9], [4, 5], [2, 2], [0, 0]], [[13, 17], [14, 15]], [[16, 17], [17, 15]]];
      const CHI = [[[11, 16], [7, 15], [3, 14]], [[0, 10], [13, 10]], [[7, 14], [7, 5], [6, 2], [3, 0]]];
      const YA = [[[0, 7], [9, 8], [9, 6], [7, 4]], [[2, 10], [5, 0]]];
      const pink = glow(0xff6ac8), base = 13;
      const place = (strokes, ox, oy) => {
        for (const [gx, gy] of rast(strokes)) {
          v.set(ox + gx, oy + gy, 1, pink);
          if (!v.has(ox + gx, oy + gy - 1, 1)) v.set(ox + gx, oy + gy - 1, 1, 0x3a1030); // tube shadow
        }
      };
      place(GA, -22, base);
      place(CHI, -2, base);
      place(YA, 13, base);
      // sparkles
      for (const [x, y] of [[-21, 31], [21, 30], [23, 16]]) {
        const c = glow(0xffe060);
        v.set(x, y, 1, c); v.set(x - 1, y, 1, c); v.set(x + 1, y, 1, c); v.set(x, y + 1, 1, c); v.set(x, y - 1, 1, c);
      }
    },
  },

  capsule_statue: {
    name: 'Capsule Statue', jp: 'カプセル像', voxel: 0.025, footprint: [1, 1],
    themes: ['cute', 'retro'], beauty: 8,
    build(v) {
      const marble = (x, y, z) => mix(0xf3ece0, 0xd9cfbf, hsh(x, y, z, 4) * 0.6 + (frac((x + y * 0.7 + z * 0.4) / 9) < 0.1 ? 0.6 : 0));
      v.box(-15, 0, -13, 15, 1, 13, 0xcfc4b2);
      fbox(v, -13, 2, -11, 13, 9, 11, marble);
      fbox(v, -15, 10, -13, 15, 11, 13, marble);
      v.paint(() => {
        v.shape(-15, 11, -13, 15, 11, 13, (x, y, z) => Math.abs(x) === 15 || Math.abs(z) === 13, gloss(0xf0c04a));
        v.shape(-15, 1, -13, 15, 1, 13, (x, y, z) => Math.abs(x) === 15 || Math.abs(z) === 13, gloss(0xf0c04a));
      });
      // gold plaque with star
      v.box(-6, 4, 12, 6, 7, 12, gloss(0xf0c04a));
      v.project(['...#...', '.#####.', '..###..', '.#...#.'], { '#': gloss(0xb8862a) }, -3, 7, '+z');
      // cradle
      v.torus(0, 13, 0, 9, 1.5, gloss(0xf0c04a));
      // two-tone capsule
      const cy = 29;
      const L = [-0.45, 0.62, 0.64];
      v.ellipsoid(0, cy, 0, 15, 16.5, 15, (x, y, z) => {
        const n = [x / 15, (y - cy) / 16.5, z / 15], nl = Math.hypot(...n);
        const spec = (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl;
        const baseC = y > cy ? 0xff7aa8 : C.white;
        if (spec > 0.93) return gloss(mix(baseC, 0xffffff, 0.75));
        if (spec > 0.86) return gloss(mix(baseC, 0xffffff, 0.35));
        return gloss(y < cy - 10 ? shade(baseC, 0.94) : baseC);
      });
      v.shape(-16, cy, -16, 16, cy, 16, (x, y, z) => (x / 15) ** 2 + (z / 15) ** 2 > 0.88, null);
      v.paint(() => v.shape(-16, cy, -16, 16, cy, 16, () => true, gloss(0xd8c8d0)));
      v.box(-2, cy - 1, 14, 2, cy + 1, 15, gloss(C.white)); // latch
      v.box(-1, cy - 1, 15, 1, cy - 1, 15, gloss(0xff7aa8));
    },
  },

  arcade_cabinet: {
    name: 'Arcade Cabinet', jp: 'アーケード筐体', voxel: 0.025, footprint: [1, 1],
    themes: ['retro', 'city'], beauty: 8, light: 0x80a0ff,
    build(v) {
      const prof = [[-13, 0], [9.5, 0], [9.5, 30], [14.5, 32], [14.5, 35.5], [8.5, 37.5], [8.5, 39], [5.5, 56], [9.5, 56.6], [9.5, 66.5], [-13, 66.5]];
      const inP = (z, y) => inPoly(z, y + 0.01, prof);
      const body = 0x2b2440, side = 0x6a3cc8;
      v.shape(-13, 0, -13, 13, 66, 15, (x, y, z) => inP(z, y), (x, y, z) => {
        if (Math.abs(x) >= 12) {
          const edge = !inP(z + 1, y) || !inP(z, y + 1) || !inP(z - 1, y) || !inP(z, y - 1);
          if (edge) return gloss(0xffd23f);
          const u = frac((y + z * 0.8) / 26);
          if (u < 0.1) return gloss(0xff5ca8);
          if (u > 0.14 && u < 0.18) return gloss(0x5ae0ff);
          return gloss(side);
        }
        return body;
      });
      // screen (sloped) with a little pixel game
      const scr = (x, y) => {
        const px = x + 8, py = 54 - y;
        const bg = 0x18286a;
        if ((px === 2 && py === 1) || (px === 13 && py === 3) || (px === 6 && py === 5) || (px === 15 && py === 8)) return 0xffffff;
        for (const ix of [1, 6, 11]) {
          if (py === 2 && px >= ix && px <= ix + 3) return 0x6cff8a;
          if (py === 3 && (px === ix || px === ix + 3)) return 0x6cff8a;
        }
        if (py === 9 && px === 8) return 0xfff070;
        if (py === 11 && px === 8) return 0xff6ac8;
        if (py === 12 && px >= 7 && px <= 9) return 0xff6ac8;
        if (py === 13) return 0x5ae0ff;
        if (py === 0 && px <= 4 && px % 2 === 0) return 0xffd040;
        return bg;
      };
      for (let x = -11; x <= 11; x++) for (let y = 38; y <= 57; y++) {
        const z = frontZ(v, x, y, 15, -13);
        if (z === null) continue;
        const inScreen = Math.abs(x) <= 8 && y >= 41 && y <= 54;
        const bezel = Math.abs(x) <= 10 && y >= 39 && y <= 56;
        if (inScreen) v.set(x, y, z, glow(scr(x, y)));
        else if (bezel) v.set(x, y, z, gloss(0x121014));
      }
      // marquee
      for (let x = -11; x <= 11; x++) for (let y = 58; y <= 65; y++) v.set(x, y, 9, glow(0xffd070));
      v.project(textRows('GAME'), { '#': glow(0xff3c78) }, -7, 64, '+z');
      for (const sx of [-10, 10]) { v.set(sx, 62, 9, glow(0xff3c78)); v.set(sx, 61, 9, glow(0xff8a3c)); v.set(sx, 63, 9, glow(0xff8a3c)); }
      // control panel: joystick + buttons
      for (let x = -11; x <= 11; x++) for (let z = 9; z <= 14; z++) {
        const y = topY(v, x, z, 40, 30);
        if (y !== null && y >= 34) v.set(x, y, z, z === 14 ? gloss(0xffd23f) : 0x3a3060);
      }
      const jy = topY(v, -5, 11, 40, 30);
      v.box(-5, jy + 1, 11, -5, jy + 2, 11, metal(C.chrome));
      v.sphere(-5, jy + 3.5, 11, 1.3, gloss(C.red));
      [[1, 11, 0xffd23f], [4, 11, 0x5ae0ff], [7, 11, 0xff5ca8], [2, 13, 0xff5ca8], [5, 13, 0x6cff8a], [8, 13, 0xffd23f]].forEach(([x, z, c]) => {
        const y = topY(v, x, z, 40, 30);
        v.set(x, y + 1, z, gloss(c));
      });
      // coin door + kick plate
      v.box(-4, 12, 10, 4, 24, 10, metal(0x9aa3ad));
      v.set(-2, 21, 10, glow(0xff4040)); v.set(-2, 22, 10, glow(0xff4040));
      v.set(2, 21, 10, glow(0xff4040)); v.set(2, 22, 10, glow(0xff4040));
      v.box(-2, 15, 10, 2, 15, 10, 0x1a1819);
      v.paint(() => v.box(-11, 0, 9, 11, 2, 9, 0x121014));
    },
  },

  phone_booth: {
    name: 'Green Payphone', jp: '公衆電話', voxel: 0.025, footprint: [0.5, 0.5],
    themes: ['retro', 'city'], beauty: 6,
    build(v) {
      // little wooden cabinet
      v.box(-8, 0, -6, 8, 1, 6, C.woodDark);
      v.box(-8, 2, -6, 8, 29, 6, C.wood);
      v.box(-9, 30, -7, 9, 31, 7, C.woodLight);
      for (const [y0, y1] of [[4, 15], [17, 28]]) {
        v.paint(() => v.box(-7, y0, 6, 7, y1, 6, shade(C.wood, 1.08)));
        v.box(-1, (y0 + y1) / 2, 7, 1, (y0 + y1) / 2, 7, metal(C.brass));
      }
      v.paint(() => v.box(-8, 2, 6, 8, 2, 6, C.woodDark));
      // lace doily
      v.cylinder(0, 32, 1, 7.5, 1, (x, y, z) => (hsh(x, y, z, 7) < 0.25 ? C.cream : C.white));
      // payphone body
      const green = 0x7cc66d, dgreen = 0x4e9a52;
      rbox(v, -6, 33, -4, 6, 51, 3, 1, gloss(green));
      v.box(-6, 50, 3, 6, 51, 3, gloss(C.white));
      v.box(-4, 47, 4, 1, 49, 4, glow(0x9fe0a0));
      v.set(-3, 48, 4, glow(0x2a5a2a)); v.set(-1, 48, 4, glow(0x2a5a2a));
      v.box(3, 48, 4, 4, 48, 4, metal(C.steel));
      v.box(-3, 45, 4, 3, 45, 4, metal(0x4a4f5a));
      v.set(4, 45, 4, gloss(C.orange));
      for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) v.set(c * 2, 42 - r * 2, 4, gloss(r === 3 && c !== 0 ? 0xffd23f : C.white));
      v.box(-2, 34, 4, 2, 35, 4, metal(C.steel));
      v.box(-1, 34, 4, 1, 34, 4, 0x2a2a2e);
      // handset on the left side + curly cord
      rbox(v, -9, 36, -2, -7, 50, 2, 0, gloss(dgreen));
      v.box(-10, 47, -2, -9, 50, 2, gloss(dgreen));
      v.box(-10, 36, -2, -9, 39, 2, gloss(dgreen));
      for (let i = 0; i < 6; i++) v.set(-8 - (i % 2), 35 - Math.floor(i / 2), 1 - (i % 3), metal(0x5a5f68));
      v.box(-7, 33, 0, -7, 33, 1, metal(0x5a5f68));
      // "TEL" sign
      v.box(-1, 52, -1, 1, 52, 0, gloss(dgreen));
      v.box(-8, 53, -1, 8, 61, 0, gloss(C.white));
      v.paint(() => v.shape(-8, 53, -1, 8, 61, 0, (x, y) => Math.abs(x) === 8 || y === 53 || y === 61, gloss(dgreen)));
      v.project(textRows('TEL'), { '#': gloss(0x2f7a3a) }, -5, 59, '+z');
    },
  },

  street_lamp: {
    name: 'Old Street Lamp', jp: 'レトロ街灯', voxel: 0.03, footprint: [0.5, 0.5],
    themes: ['city', 'retro'], beauty: 7, light: 0xffe0a0,
    build(v) {
      const iron = gloss(0x2d4a3e), ironD = gloss(0x223a30), gold = metal(C.gold);
      v.cylinder(0, 0, 0, 5.5, 2, ironD);
      v.cylinder(0, 2, 0, 4.5, 4, (x, y, z) => (Math.cos(Math.atan2(z, x) * 8) > 0.6 ? ironD : iron));
      v.cylinder(0, 6, 0, 3.5, 2, iron);
      v.torus(0, 8, 0, 2.5, 0.8, gold);
      v.cylinder(0, 8, 0, 1.5, 56, iron);
      v.torus(0, 30, 0, 1.8, 0.8, gold);
      v.torus(0, 56, 0, 1.8, 0.8, gold);
      // crossbar with gold ball ends
      fbox(v, -5, 57, 0, 5, 57, 0, iron);
      v.set(-6, 57, 0, gold); v.set(6, 57, 0, gold);
      // shotengai banner
      fbox(v, 2, 55, 0, 5, 55, 0, iron);
      v.box(2, 44, 1, 5, 54, 1, 0xff9fbf);
      v.project(['.W.', 'WYW', '.W.'], { W: C.white, Y: C.yellow }, 3, 51, '+z');
      v.paint(() => v.box(2, 44, 1, 5, 44, 1, 0xe86f98));
      // lantern
      v.cylinder(0, 63, 0, 2.5, 2, ironD);
      v.box(-4, 65, -4, 4, 65, 4, ironD);
      v.hollowBox(-4, 66, -4, 4, 73, 4, glass(0xfff2c8), 1, ['top', 'bottom']);
      for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) v.box(x, 66, z, x, 73, z, ironD);
      v.sphere(0, 69, 0, 2.2, glow(0xffe6a8));
      v.box(0, 66, 0, 0, 67, 0, gold);
      for (let y = 74; y <= 77; y++) {
        const h = Math.round(5 - (y - 74) * 1.4);
        v.box(-h, y, -h, h, y, h, ironD);
      }
      v.sphere(0, 79, 0, 1, gold);
      v.set(0, 78, 0, gold);
    },
  },

  bus_stop: {
    name: 'Bus Stop', jp: 'バス停', voxel: 0.025, footprint: [1.5, 0.5],
    themes: ['city', 'retro'], beauty: 6,
    build(v) {
      const px = -21;
      // weighted base + pole
      v.cylinder(px, 0, 0, 5.5, 3, (x, y, z) => shade(0xa8a49c, 0.92 + hsh(x, y, z) * 0.12));
      v.cylinder(px, 3, 0, 4.5, 1, 0x8a8680);
      v.cylinder(px, 4, 0, 1, 64, metal(C.silver));
      // round sign with bus icon
      v.cylinder(px, 68, -1, 8, 2, (x, y) => (Math.hypot(x - px, y - 68) > 6.4 ? gloss(C.red) : gloss(C.white)), 'z');
      const bus = ['.#######.', '#ccccccc#', '#ccccccc#', '#########', '#########', '#y#####y#', '#########', '.##...##.'];
      v.project(bus, { '#': gloss(C.blue), c: gloss(0x9fd9ff), y: gloss(C.yellow) }, px - 4, 72, '+z');
      v.project(bus, { '#': gloss(C.blue), c: gloss(0x9fd9ff), y: gloss(C.yellow) }, px - 4, 72, '-z');
      // timetable panel
      v.box(px - 6, 40, 2, px + 6, 56, 2, C.white);
      v.paint(() => {
        v.box(px - 6, 54, 2, px + 6, 56, 2, gloss(C.blue));
        for (let y = 42; y <= 52; y += 2) v.box(px - 5, y, 2, px + 5, y, 2, 0xb8c0cc);
        v.box(px - 2, 41, 2, px - 2, 53, 2, 0xb8c0cc);
      });
      for (let y = 40; y <= 56; y++) { v.set(px - 7, y, 2, metal(C.steel)); v.set(px + 7, y, 2, metal(C.steel)); }
      v.box(px - 7, 39, 2, px + 7, 39, 2, metal(C.steel)); v.box(px - 7, 57, 2, px + 7, 57, 2, metal(C.steel));
      v.box(px - 1, 46, 1, px + 1, 50, 1, metal(C.steel));
      // bench
      const frame = gloss(0x2f5a46), bx0 = -10, bx1 = 26;
      for (const lx of [bx0 + 2, bx1 - 2]) {
        v.box(lx, 0, -5, lx, 15, -5, frame); v.box(lx, 0, 5, lx, 15, 5, frame);
        v.box(lx, 15, -6, lx, 15, 6, frame);
        v.line(lx, 15, -7, lx, 28, -8, frame);
        v.box(lx, 21, -6, lx, 21, 6, frame); v.box(lx, 16, 6, lx, 20, 6, frame);
      }
      for (const [z0, z1] of [[-6, -5], [-3, -2], [0, 1], [3, 4]]) fbox(v, bx0, 16, z0, bx1, 16, z1, (x) => (x % 7 === 0 ? C.woodDark : C.woodLight));
      for (const y of [19, 22, 25]) v.box(bx0, y, -8 + Math.round((y - 19) / 6 * -0.5), bx1, y + 1, -8 + Math.round((y - 19) / 6 * -0.5), C.woodLight);
      v.paint(() => { for (let x = bx0; x <= bx1; x += 6) v.box(x, 16, -6, x, 26, 6, C.wood); });
      // forgotten red umbrella
      v.line(28, 1, 4, 26, 19, 4, 0xd8323c, 1);
      v.line(28, 1, 4, 27.5, 6, 4, 0xb02a30, 1.4);
      v.line(26, 19, 4, 26, 22, 4, metal(C.silver));
      v.set(27, 23, 4, C.woodDark); v.set(28, 22, 4, C.woodDark);
    },
  },

  // ================================================================ OCEAN
  aquarium: {
    name: 'Aquarium', jp: '水槽', voxel: 0.025, footprint: [1, 0.5],
    themes: ['ocean', 'nature'], beauty: 9, light: 0x80d0ff,
    build(v) {
      // cabinet
      v.box(-19, 0, -8, 19, 18, 8, C.woodDark);
      v.box(-20, 19, -9, 20, 19, 9, C.wood);
      for (const [x0, x1] of [[-18, -1], [1, 18]]) {
        v.box(x0, 2, 9, x1, 16, 9, C.wood);
        v.box(x0 + 2, 4, 10, x1 - 2, 14, 10, shade(C.wood, 1.08));
        v.set(x0 === -18 ? -3 : 3, 10, 11, metal(C.brass));
      }
      // tank frame + glass + water
      v.box(-18, 20, -7, 18, 20, 7, metal(0x2a2a30));
      v.box(-17, 21, -6, 17, 40, 6, glass(0x7fd0ff));
      v.hollowBox(-18, 21, -7, 18, 42, 7, glass(0xd8f2ff), 1, ['top', 'bottom']);
      for (const [x, z] of [[-18, -7], [18, -7], [-18, 7], [18, 7]]) v.box(x, 20, z, x, 42, z, metal(0x2a2a30));
      v.shape(-18, 42, -7, 18, 42, 7, (x, y, z) => Math.abs(x) === 18 || Math.abs(z) === 7, metal(0x2a2a30));
      // gravel
      v.shape(-17, 21, -6, 17, 25, 6, (x, y, z) => y <= 22 + (z < 0 ? 1 : 0) + (hsh(x, 0, z, 5) < 0.3 ? 1 : 0) - (Math.abs(x) < 4 && z > 2 ? 1 : 0),
        (x, y, z) => [0xe8d29a, 0xd8b880, 0xf4e6c0, 0xc8a070, 0xffc8c8, 0xb8b4ac][Math.floor(hsh(x, y, z, 2) * 6)]);
      // rocks and a little torii
      v.ellipsoid(-12, 23, -3, 3.5, 3, 2.5, (x, y, z) => shade(C.stone, 0.85 + hsh(x, y, z) * 0.2));
      v.ellipsoid(-9, 23, -4, 2.2, 2, 2, (x, y, z) => shade(C.stone, 0.75 + hsh(x, y, z) * 0.2));
      const tx = 10, tz = -3, ver = C.vermilion;
      v.box(tx - 3, 23, tz, tx - 3, 31, tz, ver); v.box(tx + 3, 23, tz, tx + 3, 31, tz, ver);
      v.box(tx - 5, 32, tz, tx + 5, 32, tz, C.lacquerBlack); v.box(tx - 4, 30, tz, tx + 4, 30, tz, ver);
      v.set(tx, 31, tz, ver);
      // seaweed
      for (const [x, z, h, c] of [[-15, -4, 15, C.leaf], [-14, -2, 11, C.grassDark], [-6, -5, 13, C.leaf], [15, -5, 16, C.grassDark], [14, -1, 10, C.leaf], [3, -5, 9, C.moss], [-2, -4, 12, C.grassDark]]) {
        for (let i = 0; i < h; i++) v.set(x + Math.round(Math.sin(i * 0.6 + x) * 0.8), 23 + i, z, c);
        for (let i = 2; i < h; i += 3) v.set(x + Math.round(Math.sin(i * 0.6 + x) * 0.8) + (i % 2 ? 1 : -1), 23 + i, z, shade(c, 1.2));
      }
      // fish
      const fish = (x, y, z, dir, body, fin, stripe) => {
        const rows = ['.bbb.', 'bbbbt', '.bbb.'];
        rows.forEach((row, r) => [...row].forEach((ch, c) => {
          if (ch === '.') return;
          const xx = x + (dir > 0 ? 4 - c : c - 4) * 1, col = ch === 't' ? fin : (stripe && c === 2 ? stripe : body);
          v.set(xx, y - r + 1, z, gloss(col)); v.set(xx, y - r + 1, z - 1, gloss(col));
        }));
        v.set(x + dir * 5, y + 1, z, gloss(fin)); v.set(x + dir * 5, y - 1, z, gloss(fin));
        v.set(x + dir * 5, y, z, gloss(fin));
        v.set(x + dir * 1 - (dir > 0 ? 0 : 0), y + 2, z, gloss(fin));
        v.set(x + (dir > 0 ? 3 : -3), y + 1, z + 1, K);
      };
      fish(-8, 34, 2, -1, 0xff8a2e, 0xfff0e0, null);
      fish(6, 37, 3, 1, 0xff7a20, C.white, C.white);
      fish(9, 29, 1, -1, 0x3f86e8, 0xffd23f, null);
      fish(-3, 27, 3, 1, 0xffd447, 0xff6f9a, null);
      // bubbles
      for (let i = 0; i < 7; i++) v.set(-11 + Math.round(Math.sin(i * 1.3)), 27 + i * 2, 1, gloss(0xeaf8ff));
      for (let i = 0; i < 4; i++) v.set(13 + (i % 2), 32 + i * 2, 2, gloss(0xeaf8ff));
      // hood with light
      v.box(-19, 43, -8, 19, 45, 8, gloss(0x2a2a30));
      v.box(-17, 42, 3, 17, 42, 5, glow(0xbfeeff));
      v.box(14, 44, 9, 16, 44, 9, glow(0x80ffb0));
    },
  },

  anchor: {
    name: 'Big Anchor', jp: 'いかり', voxel: 0.025, footprint: [1, 0.5],
    themes: ['ocean'], beauty: 6,
    build(v) {
      // wooden base with plank lines + rope coil
      v.cylinder(0, 0, 0, 10.5, 3, (x, y, z) => (y === 1 && Math.hypot(x, z) > 9.6 ? metal(0x8a8f99) : ((x + 20) % 5 === 0 ? C.woodDark : C.wood)));
      const rope = (s) => (Math.floor(s * 1.4) % 2 ? 0xd9b77a : 0xb8955a);
      const iron = (x, y, z) => gloss(y > 0 && (z === 1 || y % 7 === 0) ? 0x34456a : 0x23365e);
      // shank, stock, ring
      fbox(v, -1, 4, -1, 1, 40, 1, iron);
      fbox(v, -9, 35, -1, 9, 36, 1, iron);
      v.sphere(-10, 35.5, 0, 1.6, gloss(0x23365e)); v.sphere(10, 35.5, 0, 1.6, gloss(0x23365e));
      v.torus(0, 43.5, 0, 3.5, 1, gloss(0x23365e), 'z');
      // arms (arc) + flukes
      const acx = 0, acy = 18, AR = 15;
      v.shape(-16, 3, -1, 16, 16, 1, (x, y) => {
        const d = Math.hypot(x - acx, y - acy);
        return Math.abs(d - AR) <= 1.4 && y <= acy - 6;
      }, iron);
      for (const s of [-1, 1]) {
        const tri = [[s * 9, 8.5], [s * 15.5, 7], [s * 14.5, 16.5]];
        v.shape(-17, 5, -1, 17, 18, 1, (x, y) => inPoly(x, y, tri), iron);
      }
      v.sphere(0, 3.6, 0, 2, gloss(0x23365e));
      // rope: wrapped around the shank, coiled on the base
      const pts = [];
      pts.push([0, 40, 2.2]);
      for (let i = 0; i <= 120; i++) {
        const t = i / 120, a = Math.PI / 2 + t * 5 * Math.PI;
        pts.push([Math.cos(a) * 2.4, 38 - t * 26, Math.sin(a) * 2.4]);
      }
      const end = pts[pts.length - 1];
      for (const p of polyline([end, [4, 8, 5], [6, 4.5, 6]], 0.35)) pts.push(p);
      for (let i = 0; i <= 140; i++) {
        const a = Math.atan2(6, 6) + (i / 140) * TAU * 1.05;
        pts.push([Math.cos(a) * 8.2, 4.4, Math.sin(a) * 8.2]);
      }
      sweep(v, pts, 1.05, (s) => rope(s));
    },
  },

  shell_giant: {
    name: 'Giant Scallop', jp: 'ジャンボホタテ', voxel: 0.02, footprint: [1, 0.5],
    themes: ['ocean', 'cute'], beauty: 7,
    build(v) {
      const hz = -12, hy = 3, F = 26, SPAN = 1.15;
      const shellCol = (d, phi, inner) => {
        const rib = Math.cos(phi * F) > 0.15;
        const t = clamp01(d / 19);
        let c = inner ? mix(0xff8c9c, 0xffd8c8, t) : mix(0xe8604e, 0xffa47c, t);
        if (((Math.floor((phi * F) / TAU + 100) % 3) + 3) % 3 === 0) c = shade(c, 0.93);
        if (frac(d / 3.4) < 0.2 && d > 3) c = shade(c, 0.9);
        if (d > 18.4) c = inner ? 0xfff0e4 : 0xffc8a8;
        return rib ? shade(c, 1.05) : shade(c, 0.9);
      };
      const rim = (phi) => 19.5 + 0.8 * Math.cos(phi * F);
      // bottom valve
      v.shape(-20, 0, hz - 2, 20, 4, 9, (x, y, z) => {
        const w = z - hz, d = Math.hypot(x, w), phi = Math.atan2(x, w);
        if (w < 0 || Math.abs(phi) > SPAN || d > rim(phi)) return false;
        const rib = Math.cos(phi * F) > 0.15 && d > 4;
        return y <= 2 + (rib ? 1 : 0);
      }, (x, y, z) => {
        const w = z - hz, d = Math.hypot(x, w), phi = Math.atan2(x, w);
        return shellCol(d, phi, y >= 2);
      });
      // top valve, hinged open at the back
      const A = (74 * Math.PI) / 180, ca = Math.cos(A), sa = Math.sin(A);
      v.shape(-20, 0, hz - 6, 20, 26, 2, (x, y, z) => {
        const dz = z - hz, dy = y - hy;
        const w = dz * ca + dy * sa, h = -dz * sa + dy * ca;
        const d = Math.hypot(x, w), phi = Math.atan2(x, w);
        if (w < -0.5 || Math.abs(phi) > SPAN || d > rim(phi)) return false;
        const rib = Math.cos(phi * F) > 0.15 && d > 4;
        return h >= -0.6 && h <= 2.0 + (rib ? 1 : 0);
      }, (x, y, z) => {
        const dz = z - hz, dy = y - hy;
        const w = dz * ca + dy * sa, h = -dz * sa + dy * ca;
        const d = Math.hypot(x, w), phi = Math.atan2(x, w);
        return shellCol(d, phi, h < 0.6);
      });
      // hinge "ears"
      for (const s of [-1, 1]) v.box(s * 2, 0, hz - 2, s * 6, 4, hz + 1, 0xf07868);
      v.box(-2, 0, hz - 2, 2, 5, hz + 1, 0xf07868);
      // pearl
      v.sphere(0, 8, -2, 5, (x, y, z) => {
        const n = [x, y - 8, z + 2], l = Math.hypot(...n) || 1;
        const s = (n[0] * LDIR[0] + n[1] * LDIR[1] + n[2] * LDIR[2]) / l;
        return gloss(s > 0.8 ? 0xffffff : s > 0.2 ? 0xfff4f0 : s > -0.4 ? 0xf6e4ee : 0xe2d4ec);
      });
      // tiny starfish
      const sp = starPts(8, 4, 3.6, 1.6);
      v.shape(3, 4, 0, 13, 4, 9, (x, y, z) => inPoly(x, z, sp.map(([a, b]) => [a, b])), 0xff9a5a);
      v.set(8, 4, 4, 0xffc08a);
    },
  },

  beach_parasol: {
    name: 'Beach Parasol', jp: 'ビーチパラソル', voxel: 0.025, footprint: [1.5, 1.5],
    themes: ['ocean'], beauty: 7,
    build(v) {
      // sand patch
      v.shape(-30, 0, -30, 30, 0, 30, (x, y, z) => Math.hypot(x, z) <= 27.5 + 1.2 * Math.sin(Math.atan2(z, x) * 5) + 0.8 * Math.sin(Math.atan2(z, x) * 9),
        (x, y, z) => (hsh(x, 0, z, 8) < 0.15 ? 0xf4e2b0 : hsh(x, 0, z, 9) < 0.1 ? 0xd8bf88 : C.sand));
      for (const [x, z, c] of [[-20, -10, 0xffd0dc], [17, -14, C.white], [-10, 20, 0xffc0a0]]) { v.set(x, 1, z, c); v.set(x + 1, 1, z, c); }
      // pole + canopy
      const pxp = -2, pzp = -3;
      v.ellipsoid(pxp, 1, pzp, 4, 2, 4, C.sand);
      v.cylinder(pxp, 1, pzp, 1, 72, (x, y) => (y === 40 || y === 41 ? metal(C.silver) : C.woodLight));
      const Rmax = 28;
      v.shape(pxp - 29, 60, pzp - 29, pxp + 29, 76, pzp + 29, (x, y, z) => {
        const r = Math.hypot(x - pxp, z - pzp), a = Math.atan2(z - pzp, x - pxp);
        const edge = Rmax - 1.6 * (1 - Math.abs(Math.cos(a * 4)));
        if (r > edge) return false;
        const ys = 74 - r * 0.36;
        return y <= ys + 0.5 && y >= ys - 1.2;
      }, (x, y, z) => {
        const a = Math.atan2(z - pzp, x - pxp), r = Math.hypot(x - pxp, z - pzp);
        const seg = Math.floor(((a + Math.PI) / TAU) * 8 + 0.5) % 8;
        let c = seg % 2 ? C.white : 0xe84a4a;
        if (r > 25) c = seg % 2 ? 0xfff2b3 : 0xc93a3a;
        return c;
      });
      // underside ribs + fringe
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + Math.PI / 8 - Math.PI;
        v.line(pxp, 72, pzp, pxp + Math.cos(a) * 26, 74 - 26 * 0.36 - 1.5, pzp + Math.sin(a) * 26, metal(C.silver));
      }
      v.sphere(pxp, 76, pzp, 1.6, C.woodLight);
      // beach ball
      v.sphere(12, 6.5, 9, 5.5, (x, y, z) => {
        if (y - 6.5 > 4.6) return gloss(C.white);
        const seg = Math.floor(((Math.atan2(z - 9, x - 12) + Math.PI) / TAU) * 6) % 6;
        return gloss([0xe8323c, C.white, 0x2f6fd6, C.white, 0xffd23f, C.white][seg]);
      });
      // striped towel + sunglasses
      fbox(v, -19, 1, 3, -4, 1, 23, (x) => [0xff8fb0, C.white, 0x2fb5a6, C.white][Math.floor((x + 19) / 2) % 4]);
      for (let x = -19; x <= -4; x += 2) { v.set(x, 1, 24, C.white); v.set(x, 1, 2, C.white); }
      v.box(-14, 2, 12, -12, 2, 13, gloss(K)); v.box(-10, 2, 12, -8, 2, 13, gloss(K)); v.set(-11, 2, 12, metal(C.gold));
      // bucket + spade
      v.tube(9, 1, -12, 3, 2, 5, gloss(0x3f86e8));
      v.cylinder(9, 1, -12, 2, 1, gloss(0x3f86e8));
      v.cylinder(9, 2, -12, 2, 2, C.sand);
      v.line(11, 3, -12, 13, 9, -11, gloss(C.yellow));
      v.box(13, 9, -12, 14, 11, -11, gloss(C.yellow));
    },
  },

  // ================================================================= HOME
  sofa_retro: {
    name: 'Retro Sofa', jp: 'レトロソファ', voxel: 0.025, footprint: [1.5, 1],
    themes: ['home', 'retro'], beauty: 7,
    build(v) {
      const fab = 0xd9a23a, fabL = 0xe8b24c, pipe = 0xb88628;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        v.line(sx * 27, 0, sz * 12, sx * 25, 6, sz * 10, C.woodDark, 0.9);
        v.set(sx * 27, 0, sz * 12, metal(C.gold));
      }
      rbox(v, -29, 6, -14, 29, 10, 14, 1, fab);
      rbox(v, -29, 10, -15, 29, 27, -9, 2, fab);
      for (const s of [-1, 1]) {
        rbox(v, s > 0 ? 24 : -29, 6, -14, s > 0 ? 29 : -24, 20, 14, 2, fab);
        v.paint(() => v.box(s > 0 ? 24 : -29, 19, -14, s > 0 ? 29 : -24, 20, 14, fabL));
      }
      for (const [x0, x1] of [[-23, -9], [-7, 7], [9, 23]]) {
        rbox(v, x0, 11, -9, x1, 14, 14, 1, fabL);
        v.paint(() => v.box(x0, 12, 14, x1, 12, 14, pipe));
        rbox(v, x0, 15, -12, x1, 29, -8, 2, fabL);
        for (const bx of [x0 + 4, x1 - 4]) for (const by of [19, 25]) { v.set(bx, by, -8, pipe); v.remove(bx, by, -7); }
        v.set((x0 + x1) / 2, 22, -8, pipe);
      }
      // throw pillows
      rbox(v, -22, 15, -8, -13, 23, -5, 1, 0xff8fb0);
      v.paint(() => { for (const [x, y] of [[-20, 21], [-16, 21], [-18, 19], [-20, 17], [-16, 17]]) v.set(x, y, -5, C.white); });
      v.cylinder(17, 19, -8, 4.2, 3, 0x2fb5a6, 'z');
      v.set(17, 19, -5, 0x1f8a7e);
    },
  },

  armchair: {
    name: 'Cozy Armchair', jp: 'ひとりがけソファ', voxel: 0.025, footprint: [1, 1],
    themes: ['home'], beauty: 6,
    build(v) {
      const fab = 0x7fa07a, fabL = 0x93b48d, fabD = 0x5f8060;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.sphere(sx * 12, 1.5, sz * 10, 1.6, C.woodDark);
      rbox(v, -15, 3, -13, 15, 10, 13, 2, fab);
      rbox(v, -11, 10, -8, 11, 14, 13, 2, fabL);
      // arched wingback
      v.shape(-15, 10, -14, 15, 36, -8, (x, y, z) => {
        const top = 31 + 4 * Math.cos((x / 15) * (Math.PI / 2));
        const dx = Math.max(0, Math.abs(x) - 12), dz = Math.max(0, -11 - z, z + 9);
        return y <= top && dx * dx + dz * dz <= 9.5;
      }, fab);
      for (const s of [-1, 1]) {
        rbox(v, s > 0 ? 11 : -15, 3, -13, s > 0 ? 15 : -11, 20, 12, 2, fab);
        v.cylinder(s * 13, 18, 10, 2.6, 3, fabL, 'z');
        v.shape(s > 0 ? 13 : -15, 20, -13, s > 0 ? 15 : -13, 32, -6, (x, y, z) => y <= 32 - (z + 13) * 0.9, fab);
      }
      v.paint(() => { for (const x of [-6, 0, 6]) for (const y of [20, 27]) v.set(x + (y === 27 ? 3 : 0) * (x === 6 ? -2 : 1) * 0, y, -8, fabD); });
      // knitted blanket over the right arm
      const knit = (x, y, z) => ((z + 20) % 6 < 2 ? 0xd8434b : (z + 20) % 6 === 3 ? 0x2fb5a6 : C.cream);
      for (let z = -3; z <= 8; z++) {
        for (let x = 11; x <= 16; x++) { const y = topY(v, x, z, 40, 0); if (y !== null && x <= 15) v.set(x, y + 1, z, knit(x, y, z)); }
        for (let y = 9; y <= 21; y++) v.set(16, y, z, knit(16, y, z));
      }
      for (let z = -3; z <= 8; z += 2) v.set(16, 8, z, C.cream);
      // round mustard cushion
      v.cylinder(-4, 21, -8, 4.6, 3, 0xe0a83a, 'z');
      v.set(-4, 21, -5, 0xb88628);
    },
  },

  floor_lamp: {
    name: 'Fabric Floor Lamp', jp: 'フロアランプ', voxel: 0.025, footprint: [0.5, 0.5],
    themes: ['home'], beauty: 6, light: 0xffd8a8,
    build(v) {
      const feet = [[0, -7], [6.1, 3.5], [-6.1, 3.5]];
      for (const [x, z] of feet) {
        v.line(0, 22, 0, x, 1, z, C.wood, 1);
        v.set(Math.round(x), 0, Math.round(z), metal(C.brass));
      }
      v.cylinder(0, 20, 0, 1.6, 4, metal(C.brass));
      v.cylinder(0, 24, 0, 1, 26, gloss(0xd8aa48));
      // drum shade (lit fabric) with trims and pompom fringe
      v.shape(-8, 45, -8, 8, 61, 8, (x, y, z) => {
        const r = 7.6 - ((y - 46) / 15) * 2.2, d = Math.hypot(x, z);
        return y >= 46 && d <= r + 0.2 && d > r - 1.1;
      }, (x, y, z) => {
        if (y === 46 || y === 61) return 0xc8643a;
        const seam = Math.cos(Math.atan2(z, x) * 8) > 0.92;
        return glow(lit(seam ? 0xffd8a8 : 0xffe6c4, x, 0, z, 0.25));
      });
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU;
        v.set(Math.round(Math.cos(a) * 7.6), 45, Math.round(Math.sin(a) * 7.6), 0xd87a48);
      }
      v.cylinder(0, 48, 0, 1, 2, metal(C.brass));
      v.sphere(0, 51.5, 0, 1.6, glow(0xfff2d8));
      v.box(0, 50, 0, 0, 50, 0, metal(C.brass));
      v.box(0, 54, 0, 0, 60, 0, metal(C.brass)); v.box(-5, 60, 0, 5, 60, 0, metal(C.brass)); v.box(0, 60, -5, 0, 60, 5, metal(C.brass));
      // pull chain
      for (let y = 41; y <= 47; y++) v.set(1, y, 0, metal(C.brass));
      v.set(1, 40, 0, gloss(0xc8643a));
    },
  },

  cat_tower: {
    name: 'Cat Tower', jp: 'キャットタワー', voxel: 0.025, footprint: [1, 1],
    themes: ['home', 'cute'], beauty: 8,
    build(v) {
      const plush = (x, y, z) => (hsh(x, y, z, 3) < 0.3 ? 0xd8c7ae : 0xe6d5bd);
      const sisal = (x, y) => (y % 2 ? 0xd9b77a : 0xbf9a5c);
      rbox(v, -13, 0, -11, 13, 3, 11, 1, plush);
      // cubby house
      rbox(v, -13, 4, -9, -1, 16, 9, 1, 0xa8dcc8);
      v.box(-12, 5, -8, -2, 15, 8, null);
      v.shape(-13, 4, 9, -1, 16, 9, (x, y) => Math.hypot(x + 7, y - 10) <= 3.4, null);
      v.paint(() => v.shape(-13, 4, 9, -1, 16, 9, (x, y) => Math.abs(Math.hypot(x + 7, y - 10) - 4.2) < 0.7, 0x84c4ac));
      v.box(-12, 5, -8, -2, 5, 8, 0xc9b6e6);
      rbox(v, -14, 17, -10, 0, 18, 10, 1, plush);
      // posts
      v.cylinder(7, 4, 0, 2, 38, sisal);
      v.cylinder(-7, 19, -2, 2, 31, sisal);
      // mid platform
      rbox(v, 1, 29, -9, 13, 31, 9, 1, plush);
      // top bed
      v.cylinder(-4, 50, 0, 9, 2, 0xf2b8c6);
      v.torus(-4, 53, 0, 7.5, 1.8, 0xf2b8c6);
      v.cylinder(-4, 52, 0, 6.5, 1, 0xfbe0e6);
      // sleeping tabby, chin resting on the rim
      const fur = 0xf0a050, stripe = 0xc8742e;
      v.ellipsoid(-4, 56, -1, 6, 3.4, 5, fur);
      v.paint(() => v.shape(-11, 57, -7, 3, 60, 3, (x) => frac((x + 20) / 3) < 0.34, stripe));
      const hx = -2, hy = 57.5, hz = 5;
      v.sphere(hx, hy, hz, 3.8, fur);
      v.paint(() => {
        v.ellipsoid(hx, hy - 1.6, hz + 2.5, 2.6, 1.6, 1.4, C.white);
        v.box(hx - 1, hy + 2, hz - 2, hx + 1, hy + 4, hz + 1, stripe);
      });
      for (const s of [-1, 1]) {
        const ex = hx + s * 2;
        v.box(ex - 1, 61, hz - 1, ex, 61, hz, fur); v.set(s < 0 ? ex - 1 : ex, 62, hz - 1, fur);
        v.set(s < 0 ? ex : ex - 1, 61, hz + 1, C.pink);
      }
      const fz = (x, y) => frontZ(v, x, y, 14, -5);
      for (const [x, y, c] of [[-5, 58, K], [-4, 57, K], [0, 58, K], [1, 57, K], [-2, 56, 0xff8fa0], [-3, 55, K], [-1, 55, K], [-5, 56, C.blush], [1, 56, C.blush]]) {
        const z = fz(x, y); if (z !== null) v.set(x, y, z, c);
      }
      v.sphere(-5, 54.5, 6.5, 1.3, C.white); v.sphere(1.5, 54.5, 6.8, 1.3, C.white); // paws
      const tail = [];
      for (let i = 0; i <= 40; i++) { const a = -1.4 + (i / 40) * 2.2; tail.push([-4 + Math.cos(a) * 6.6, 54, -1 + Math.sin(a) * 6.2]); }
      sweep(v, tail, 1.2, (s, phi, t) => (t > 0.85 ? C.white : t % 0.2 < 0.08 ? stripe : fur));
      // dangling pompom + toy mouse
      v.box(11, 22, 7, 11, 28, 7, C.white);
      v.sphere(11, 20.5, 7, 1.5, 0xff6f9a);
      v.box(8, 4, 7, 10, 5, 8, 0x9a9690); v.set(11, 4, 8, C.pink); v.set(7, 4, 7, C.pink); v.set(10, 6, 8, C.pink);
    },
  },

  bookcase: {
    name: 'Collector Bookcase', jp: '本棚', voxel: 0.025, footprint: [1, 0.5],
    themes: ['home', 'retro'], beauty: 7,
    build(v) {
      const wood = C.wood, woodD = C.woodDark;
      v.box(-20, 0, -8, 20, 2, 7, woodD);
      v.box(-20, 0, -8, -19, 60, 7, wood); v.box(19, 0, -8, 20, 60, 7, wood);
      v.box(-18, 3, -8, 18, 57, -8, shade(woodD, 0.9));
      for (const y of [16, 30, 44]) v.box(-18, y, -7, 18, y, 7, wood);
      v.box(-20, 58, -8, 20, 59, 7, wood);
      v.box(-21, 60, -9, 21, 60, 8, woodD);
      v.paint(() => v.box(-20, 58, 7, 20, 58, 7, woodD));
      const cols = [0xc0392b, 0x2f6fd6, 0x3cae5a, 0xf2c14e, 0x8a5bd6, 0xe8743b, 0x2fb5a6, 0x9e1b1b, 0x233a72, 0xd94fb0, 0xf3e9d2, 0x5e3a22];
      const books = (x0, x1, yb, hMax, seed) => {
        let x = x0, i = 0;
        while (x <= x1) {
          const w = 2 + Math.floor(hsh(i, seed, 1) * 2.2);
          const xe = Math.min(x1, x + w - 1);
          const h = hMax - Math.floor(hsh(i, seed, 2) * 4);
          const c = cols[Math.floor(hsh(i, seed, 3) * cols.length)];
          const zf = 4 - Math.floor(hsh(i, seed, 4) * 2);
          v.box(x, yb, -6, xe, yb + h - 1, zf, c);
          v.box(x, yb + h - 1, -6, xe, yb + h - 1, zf - 1, C.paper);
          const band = hsh(i, seed, 5) < 0.5 ? metal(C.gold) : shade(c, 1.4);
          v.box(x, yb + h - 3, zf, xe, yb + h - 3, zf, band);
          v.box(x, yb + 1, zf, xe, yb + 1, zf, band);
          x = xe + 1; i++;
        }
      };
      // shelf 1: big books + lying stack
      books(-18, 6, 3, 12, 1);
      for (let k = 0; k < 4; k++) v.box(9 + (k % 2), 3 + k * 2, -5, 17 - (k % 2), 4 + k * 2, 4, cols[(k * 5) % cols.length]);
      // shelf 2: books + maneki-neko
      books(-18, 4, 17, 11, 2);
      manekiNeko(v, 11, 17, 0);
      // shelf 3: gacha capsules + mochi figure
      books(-18, -6, 31, 11, 3);
      [[-2, 0xff7aa8], [4, 0x5cc4ff], [10, 0xffd23f]].forEach(([x, c]) => v.sphere(x, 33.5, 1, 2.5, (px, py) => gloss(py >= 34 ? c : C.white)));
      v.ellipsoid(15.5, 33.5, 1, 2.6, 2.4, 2.4, C.white);
      v.set(14, 34, 3, K); v.set(17, 34, 3, K); v.set(15, 33, 4, C.blush); v.set(16, 33, 4, C.blush);
      // shelf 4: books + potted succulent + globe
      books(-18, 0, 45, 11, 4);
      v.cylinder(5, 45, 0, 2.2, 3, C.copper);
      v.sphere(5, 49, 0, 2, C.leaf); v.set(5, 51, 0, 0xff8fb0);
      v.cylinder(13, 45, 0, 2, 1, metal(C.brass));
      v.box(13, 46, 0, 13, 47, 0, metal(C.brass));
      v.sphere(13, 51, 0, 3.2, (x, y, z) => (hsh(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2), 3) < 0.4 ? C.grass : C.sea));
      // top: retro tin robot + trailing pothos
      v.box(-15, 61, -2, -10, 66, 2, gloss(0xb8c8d8));
      v.box(-14, 67, -2, -11, 70, 2, gloss(0xc8d6e4));
      v.set(-13, 69, 3, glow(0xffd040)); v.set(-12, 69, 3, glow(0xffd040));
      v.box(-14, 63, 3, -11, 64, 3, gloss(C.red));
      v.set(-12, 71, 0, metal(C.silver)); v.set(-12, 72, 0, glow(0xff5050));
      v.box(-16, 64, 0, -16, 66, 0, gloss(0xa0b0c0)); v.box(-9, 64, 0, -9, 66, 0, gloss(0xa0b0c0));
      v.cylinder(13, 61, 0, 3, 4, gloss(C.cream));
      v.ellipsoid(13, 66, 0, 4.5, 2.5, 4, (x, y, z) => (hsh(x, y, z) < 0.3 ? 0x7cc95a : C.leaf));
      v.line(15, 65, 3, 18, 63, 7, C.grassDark);
      v.line(18, 63, 7, 19, 61, 8, C.grassDark);
      v.set(17, 64, 6, C.leaf); v.set(18, 64, 7, 0x7cc95a);
      for (let i = 0; i < 24; i++) {
        const y = 60 - i, x = 19 + (i % 4 < 2 ? 0 : 1);
        v.set(x, y, 8, C.grassDark);
        if (i % 3 === 1) { v.set(x + (i % 2 ? 1 : -1), y, 8, i % 2 ? 0x7cc95a : C.leaf); v.set(x, y, 9, C.leaf); }
      }
    },
  },

  // =============================================================== SPOOKY
  jack_lantern: {
    name: "Jack-o'-Lantern Pile", jp: 'ジャック・オー・ランタン', voxel: 0.02, footprint: [1, 0.5],
    themes: ['spooky', 'cute'], beauty: 7, light: 0xff9030,
    build(v) {
      const pumpkin = (cx, cy, cz, rx, ry, rz) => {
        v.shape(Math.floor(cx - rx - 1), Math.max(0, Math.floor(cy - ry - 1)), Math.floor(cz - rz - 1), Math.ceil(cx + rx + 1), Math.ceil(cy + ry + 1), Math.ceil(cz + rz + 1), (x, y, z) => {
          const a = Math.atan2(z - cz, x - cx), g = Math.cos(a * 8) > 0.82 ? 0.93 : 1;
          return ((x - cx) / (rx * g + 0.15)) ** 2 + ((y - cy) / (ry + 0.15)) ** 2 + ((z - cz) / (rz * g + 0.15)) ** 2 <= 1;
        }, (x, y, z) => {
          const a = Math.atan2(z - cz, x - cx), groove = Math.cos(a * 8) > 0.7;
          let c = groove ? 0xb85414 : 0xec7a1c;
          if (y < cy - ry * 0.6) c = shade(c, 0.85);
          if (y > cy + ry * 0.75) c = shade(c, 0.9);
          return c;
        });
        v.cylinder(cx, Math.round(cy + ry - 1), cz, 1.2, 3, 0x6a7a2a);
        v.set(cx + 1, Math.round(cy + ry + 2), cz, 0x6a7a2a);
      };
      const lightC = glow(0xffd25a);
      pumpkin(-3, 9, -4, 10, 9, 9);
      carve(v, ['..Y.....Y..', '.YYY...YYY.', 'YYYYY.YYYYY', '...........', 'Y.........Y', 'YY.Y.Y.Y.YY', '.YYYYYYYYY.', '..YYYYYYY..'], { Y: lightC }, -8, 16, 8);
      pumpkin(9, 7, 5, 7.5, 6.5, 7);
      carve(v, ['YY...YY', 'YY...YY', '.......', 'Y.....Y', '.YYYYY.'], { Y: lightC }, 6, 10, 13);
      pumpkin(-12, 5, 7, 5.5, 5, 5.5);
      carve(v, ['YY.YY', '.....', '.YYY.', '..Y..'], { Y: lightC }, -14, 7, 13);
      // tiny pumpkin on top wearing a witch hat
      pumpkin(-2, 20.5, -3, 4.5, 3.8, 4.2);
      v.cylinder(-2, 24, -3, 5.5, 1, 0x5a3a8a);
      v.cone(-2, 25, -3, 3.4, 8, 0x5a3a8a);
      v.paint(() => v.box(-6, 25, -7, 2, 25, 1, 0xffb040));
      v.set(-1, 32, -3, 0x5a3a8a); v.set(0, 32, -3, 0x5a3a8a);
      // curly vine
      v.line(13, 13, 4, 15, 15, 6, 0x4e8a2e); v.line(15, 15, 6, 16, 13, 8, 0x4e8a2e);
      v.ellipsoid(16, 12, 9, 1.5, 0.8, 1.5, C.leaf);
    },
  },

  ghost_lamp: {
    name: 'Ghost Lamp', jp: 'おばけランプ', voxel: 0.02, footprint: [0.5, 0.5],
    themes: ['spooky', 'cute'], beauty: 7, light: 0xc0d0ff,
    build(v) {
      v.cylinder(0, 0, 0, 11.5, 3, gloss(C.woodDark));
      v.cylinder(0, 3, 0, 10.5, 1, gloss(C.wood));
      v.box(0, 0, -16, 0, 0, -11, 0x2a2828);
      v.box(5, 1, 10, 6, 2, 11, metal(C.brass));
      const ghostC = (x, y, z) => {
        const base = mix(0xb4c4ff, 0xf4f7ff, clamp01((y - 6) / 34));
        return glow(lit(base, x, y - 30, z, 0.3));
      };
      v.shape(-13, 4, -12, 13, 46, 12, (x, y, z) => {
        if (y >= 34) return x * x + (y - 34) ** 2 + (z / 0.86) ** 2 <= 10.8 ** 2;
        const r = 10.8 + (34 - y) * 0.05;
        if ((x * x) + (z / 0.86) ** 2 > r * r) return false;
        const a = Math.atan2(z, x);
        const hem = 4 + 3 * (0.5 + 0.5 * Math.cos(a * 5));
        return y >= hem;
      }, ghostC);
      v.set(0, 45, 0, ghostC(0, 45, 0)); v.set(0, 46, 0, ghostC(0, 46, 0)); v.set(1, 46, 0, ghostC(1, 46, 0)); v.set(2, 47, 0, ghostC(2, 47, 0)); v.set(2, 48, 0, ghostC(2, 48, 0));
      // little arms: one up ("boo!"), one out
      v.ellipsoid(-11.5, 29, 3, 2.5, 3, 2, ghostC);
      v.ellipsoid(11.5, 23, 3, 3, 2, 2, ghostC);
      // face
      const put = (x, y, c) => { const z = frontZ(v, x, y, 14, -2); if (z !== null) v.set(x, y, z, c); };
      for (const ex of [-4, 4]) { put(ex, 33, K); put(ex, 34, K); put(ex, 35, K); put(ex + (ex < 0 ? 1 : -1), 34, K); }
      put(-3, 35, C.white); put(5, 35, C.white);
      for (const [x, y] of [[-7, 30], [-6, 30], [6, 30], [7, 30]]) put(x, y, 0xff9fbe);
      put(0, 29, K); put(-1, 28, K); put(1, 28, K); put(0, 27, K); put(0, 28, 0xff7a86);
    },
  },

  haunted_well: {
    name: 'Haunted Well', jp: '古井戸', voxel: 0.025, footprint: [1, 1],
    themes: ['spooky', 'shrine'], beauty: 8,
    build(v) {
      // stone well wall
      const stones = [0x9a9690, 0x8a8680, 0xa8a49c, 0x7f7b76];
      v.tube(0, 0, 0, 13, 10, 15, (x, y, z) => {
        const row = Math.floor(y / 3), a = Math.atan2(z, x) / TAU * 18 + (row % 2) * 0.5;
        if (y % 3 === 2 || frac(a) < 0.1) return 0x5e5a55;
        let c = stones[Math.floor(hsh(Math.floor(a), row, 1) * 4)];
        if (hsh(x, y, z, 5) < (y < 4 ? 0.35 : 0.12)) c = mix(c, C.moss, 0.6);
        return c;
      });
      v.cylinder(0, 0, 0, 10, 6, 0x1a2228);
      v.cylinder(0, 6, 0, 9.6, 1, gloss(0x0e161c));
      // something peeking from the dark…
      v.sphere(0, 9, -6, 3.6, 0x14181c);
      v.box(-2, 10, -3, -1, 10, -3, glow(0xd8ff60)); v.box(1, 10, -3, 2, 10, -3, glow(0xd8ff60));
      for (let i = -3; i <= 3; i++) v.set(i, 7 + Math.abs(i % 2), -8 + Math.abs(i), 0x14181c);
      // igeta frame
      const beam = (x, y, z) => (hsh(x, y, z, 2) < 0.2 ? 0x6a4e34 : 0x8a6a4a);
      fbox(v, -16, 15, -8, 16, 16, -6, beam); fbox(v, -16, 15, 6, 16, 16, 8, beam);
      fbox(v, -8, 17, -16, -6, 18, 16, beam); fbox(v, 6, 17, -16, 8, 18, 16, beam);
      // posts, crossbeam, pulley
      for (const s of [-1, 1]) fbox(v, s * 14, 0, -1, s * 15, 45, 0, beam);
      fbox(v, -17, 43, -1, 17, 44, 0, beam);
      v.line(0, 42, 0, 0, 40, 0, metal(0x5a5a60));
      v.torus(0, 38, 0, 2.2, 0.8, metal(0x6a6a70), 'z');
      // gable roof with gable trusses
      for (const s of [-1, 1]) v.shape(s * 16, 45, -10, s * 16, 54, 10, (x, y, z) => y <= 53 - Math.abs(z) * 0.8, beam);
      v.shape(-19, 44, -12, 19, 55, 12, (x, y, z) => {
        const ys = 54 - Math.abs(z) * 0.8;
        return y <= ys + 0.5 && y >= ys - 1.3;
      }, (x, y, z) => (Math.abs(z) <= 0.5 ? 0x2f3238 : (Math.round(Math.abs(z)) % 3 === 0 ? 0x3e424c : 0x50555f)));
      // rope + hanging bucket
      v.line(-2, 38, 1, -2, 6, 1, 0xc9a86a);
      v.line(2, 38, 1, 2, 31, 1, 0xc9a86a);
      v.tube(2, 24, 1, 3.4, 2.4, 6, (x, y) => (y === 25 || y === 28 ? metal(0x5a5a60) : 0x9a7048));
      v.cylinder(2, 24, 1, 2.4, 1, 0x7a5236);
      v.line(-1, 30, 1, 2, 31, 1, metal(0x5a5a60)); v.line(5, 30, 1, 2, 31, 1, metal(0x5a5a60));
      // chōchin-obake lantern
      v.box(-10, 38, 0, -10, 42, 0, 0x2a2420);
      v.box(-12, 37, -2, -8, 37, 2, 0x2a2420);
      v.ellipsoid(-10, 32, 0, 3.6, 4.4, 3.6, (x, y) => glow(y % 2 ? 0xfff0d0 : 0xf2d8a8));
      v.box(-12, 27, -2, -8, 27, 2, 0x2a2420);
      v.set(-11, 33, 4, K); v.set(-10, 33, 4, K); v.set(-11, 34, 4, C.white); v.set(-10, 34, 4, K);
      v.box(-11, 30, 3, -9, 30, 4, 0xc8303a); v.box(-10, 28, 4, -10, 29, 4, 0xe85060);
      // ofuda talisman on the right post
      v.box(14, 28, 1, 15, 35, 1, C.paper);
      v.paint(() => { v.box(14, 34, 1, 15, 34, 1, C.red); v.set(14, 31, 1, C.red); v.set(15, 30, 1, C.red); });
      // weeds
      for (let k = 0; k < 20; k++) {
        const a = hsh(k, 1, 1) * TAU, r = 13.5 + hsh(k, 2, 2) * 1.5;
        const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
        if (!v.has(x, 0, z)) { v.set(x, 0, z, C.grassDark); if (k % 3 === 0) v.set(x, 1, z, C.grass); }
      }
    },
  },
};
