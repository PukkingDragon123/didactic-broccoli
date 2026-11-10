// Boundary walls and gates: reinforced block walls (0.40 x 0.20 module, flat coping, gate pillars, pierced decorative
// blocks set one in three in the second course from the top, streaks under the coping and moss along the foot), Ōya
// stone, charred-cedar board fences on a block base, aluminium lattice gates.
//   blockWall(t, x0, x1, z, side, o)   woodFence(t, x0, x1, z, side, o)   gate(t, a, b, z, side, open)   yard(t, ...)
import * as THREE from 'three';
import { hash2 } from '../core/util.js';

const dark = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

/** 透かしブロック: one pierced block (0.39 x 0.19, the wall's thickness) with its lower-left corner at (x, y), centred on
 *  zc. Three patterns: a diamond, a cross of four squares, a wave of two arcs. */
function sukashi(t, x, y, zc, th, k, tint) {
  const B = t.B, W = 0.39, H = 0.19, holes = [];
  if (k === 0) holes.push([[0.195, 0.03], [0.32, 0.095], [0.195, 0.16], [0.07, 0.095]].reverse());
  else if (k === 1) for (const cx of [0.105, 0.285]) for (const cy of [0.055, 0.135]) holes.push([[cx - 0.06, cy - 0.028], [cx - 0.06, cy + 0.028], [cx + 0.06, cy + 0.028], [cx + 0.06, cy - 0.028]]);
  else for (const cx of [0.1, 0.29]) { const p = []; for (let i = 0; i <= 6; i++) { const a = Math.PI - (i / 6) * Math.PI; p.push([cx + Math.cos(a) * 0.075, 0.03 + Math.sin(a) * 0.12]); } holes.push(p); }
  B.kit(t.m.pv, (G) => {
    const C = [[0, 0], [W, 0], [W, H], [0, H]];
    G.polyHoles(C, holes, (a, b) => [a, b, th / 2], [0, 0, 1]);
    G.polyHoles(C, holes, (a, b) => [a, b, -th / 2], [0, 0, -1]);
    for (const h of holes) { let cx = 0, cy = 0; for (const [a, b] of h) { cx += a / h.length; cy += b / h.length; } for (let i = 0; i < h.length; i++) { const p = h[i], q = h[(i + 1) % h.length]; G.quad([p[0], p[1], -th / 2], [q[0], q[1], -th / 2], [q[0], q[1], th / 2], [p[0], p[1], th / 2], [cx - (p[0] + q[0]) / 2, cy - (p[1] + q[1]) / 2, 0]); } }
  }, { m: new THREE.Matrix4().makeTranslation(x, y, zc), tint });
}

/** Block wall along a building line with gaps; z is its lane-side face. o: h, gaps [[a, b]], pillars, mat (name:
 *  'block' | 'oya' | ...), deco (pierced blocks), tint, clean [[a, b]] spans kept free of streaks (posters). */
export function blockWall(t, x0, x1, z, side, { h = 1.3, gaps = [], pillars = true, clean = [], mat = null, deco = false, tint = 0xffffff } = {}) {
  const B = t.B, m = t.m, th = 0.15, zc = z - side * th / 2, oya = mat === m.oya, wm = oya ? m.oya : m.concrete;
  const jt = oya ? 0x8d8f7c : 0x97938b, bt = tint !== 0xffffff ? tint : oya ? 0xb6b8a4 : 0xbcb8af; // joints, block faces
  h = Math.round(h / 0.2) * 0.2 + (oya ? 0.1 : 0);
  B.push(0, 0, zc, side > 0 ? 0 : Math.PI); // local +z = toward the lane
  // every block stands a few millimetres proud of its joints, its arrises chamfered (the paint's joints lie between)
  const relief = (xa, xb, y0, y1) => {
    const bw = oya ? 0.9 : 0.4, bh = oya ? 0.3 : 0.2, zf = th / 2, g = 0.007, d = 0.006, P = [], T = [];
    const q = (pts) => { for (const i of [0, 1, 2, 0, 2, 3]) { P.push(pts[i][0], pts[i][1], pts[i][2]); T.push(pts[i][0], pts[i][1]); } };
    for (let r = Math.round(y0 / bh); r * bh < y1 - 0.02; r++) {
      const off = r % 2 === 0 ? bw / 2 : 0, yb = r * bh, yt = Math.min(y1, yb + bh);
      for (let k = Math.floor((xa - off) / bw); k * bw + off < xb; k++) {
        const x0 = Math.max(xa, k * bw + off), x1 = Math.min(xb, (k + 1) * bw + off);
        if (x1 - x0 < 0.07) continue;
        const ax = x0 + g, ay = yb + g, cx = x1 - g, cy = yt - g, ix = ax + d, iy = ay + d, jx = cx - d, jy = cy - d, zo = zf + d;
        q([[ix, iy, zo], [jx, iy, zo], [jx, jy, zo], [ix, jy, zo]]);
        q([[ax, ay, zf], [cx, ay, zf], [jx, iy, zo], [ix, iy, zo]]); q([[ix, jy, zo], [jx, jy, zo], [cx, cy, zf], [ax, cy, zf]]);
        q([[ax, ay, zf], [ix, iy, zo], [ix, jy, zo], [ax, cy, zf]]); q([[cx, ay, zf], [cx, cy, zf], [jx, jy, zo], [jx, iy, zo]]);
      }
    }
    B.tris(wm, P, T, { tint: bt });
  };
  const cope = (xa, xb, y, w = th) => B.extrude(m.concrete, [[-w / 2 - 0.03, 0], [w / 2 + 0.03, 0], [w / 2 + 0.03, 0.022], [w / 2 - 0.012, 0.062], [-w / 2 + 0.012, 0.062], [-w / 2 - 0.03, 0.022]], xa - 0.02, xb + 0.02, { along: 'x', oy: y, tint: cap });
  const X = (x) => (side > 0 ? x : -x), cap = oya ? 0xa9ab98 : 0xb6b2a8;
  let x = x0;
  for (const [a, b] of [...gaps, [x1, x1]]) {
    if (a - x > 0.05) {
      const xa = Math.min(X(x), X(a)), xb = Math.max(X(x), X(a)), len = xb - xa, cx = (xa + xb) / 2;
      const dy = deco && !oya && len > 1.6 && h > 0.95 ? h - 0.4 : -1;
      if (dy > 0) {
        // solid courses, then a course where every third block is pierced, then the top course
        B.box(wm, len, dy, th, cx, 0, 0, { uv: [xa, 0], tint: jt, ao: 0.16, skip: 'ny py' });
        B.box(wm, len, 0.2, th, cx, dy + 0.2, 0, { uv: [xa, dy + 0.2], tint: jt, skip: 'ny' });
        const n = Math.floor(len / 0.4), off = (len - n * 0.4) / 2;
        let run = xa;
        for (let i = 0; i < n; i++) {
          const bx = xa + off + i * 0.4;
          if (i % 3 !== 1 || i === 0 || i === n - 1) continue;
          if (bx - run > 0.01) { B.box(wm, bx - run, 0.2, th, (run + bx) / 2, dy, 0, { uv: [run, dy], tint: jt, skip: 'ny py' }); relief(run, bx, dy, dy + 0.2); }
          sukashi(t, bx + 0.005, dy + 0.005, 0, th, Math.floor(hash2(Math.round(x0 * 7), Math.round(z)) * 3 + i / 3) % 3, bt);
          t.decalQ('drip' + (i % 3), bx + 0.2, dy - 0.5, th / 2 + 0.006, { w: 0.34, h: 0.5 });
          run = bx + 0.4;
        }
        if (xb - run > 0.01) { B.box(wm, xb - run, 0.2, th, (run + xb) / 2, dy, 0, { uv: [run, dy], tint: jt, skip: 'ny py' }); relief(run, xb, dy, dy + 0.2); }
        relief(xa, xb, 0, dy); relief(xa, xb, dy + 0.2, h);
      } else { B.box(wm, len, h, th, cx, 0, 0, { uv: [xa, 0], tint: jt, ao: 0.16, skip: 'ny' }); relief(xa, xb, 0, h); }
      cope(xa, xb, h); // 笠木
      // streaks under the coping, splash-back and moss at the foot (not where a poster must stay clean)
      const mark = (p, q) => {
        for (const [c0, c1] of clean) { const k0 = Math.min(X(c0), X(c1)), k1 = Math.max(X(c0), X(c1)); if (k1 > p && k0 < q) { mark(p, k0); mark(k1, q); return; } }
        if (q - p < 0.4) return;
        t.decalRow('base', p, q, 0, Math.min(0.42, h * 0.4), th / 2 + 0.005);
        t.decalRow('moss', p, q, 0, 0.13, th / 2 + 0.008, 0.8);
        for (let u = p + 0.3; u < q - 0.5; u += 1.1 + hash2(Math.round(u * 3), Math.round(z)) * 1.3) { const k = hash2(Math.round(u * 5), Math.round(z * 2)); if (k < 0.6) t.decalQ('drip' + (Math.floor(k * 10) % 3), u, h - 0.02 - h * (0.4 + k * 0.5), th / 2 + 0.005, { w: 0.4 + k * 0.3, h: h * (0.4 + k * 0.5) }); }
      };
      mark(xa, xb);
    }
    if (b > a && pillars) for (const px of [a - 0.12, b + 0.12]) {
      B.box(wm, 0.3, h + 0.2, 0.3, X(px), 0, 0, { uv: [px, 0], tint: bt, ao: 0.16, skip: 'ny' });
      B.box(m.concrete, 0.37, 0.05, 0.37, X(px), h + 0.2, 0, { tint: cap, bevel: 0.012 }); B.lathe(m.concrete, [[0.24, 0], [0.2, 0.03], [0.04, 0.075]], X(px), h + 0.25, 0, { tint: cap, sides: 4, exact: true, a0: Math.PI / 4 });
    }
    x = b;
  }
  B.pop();
}

/** Charred-cedar board fence (焼杉板塀) on a low block base, posts and a cap rail; little roofed gate posts at the gaps. */
export function woodFence(t, x0, x1, z, side, { h = 1.6, gaps = [] } = {}) {
  const B = t.B, m = t.m, zc = z - side * 0.06;
  let x = x0;
  for (const [a, b] of [...gaps, [x1, x1]]) {
    if (a - x > 0.05) {
      B.box(m.block, a - x, 0.4, 0.15, (x + a) / 2, 0, z - side * 0.075, { uv: [x, 0], ao: 0.15, skip: 'ny' });
      B.box(m.concrete, a - x + 0.02, 0.05, 0.19, (x + a) / 2, 0.4, z - side * 0.075, { tint: 0xb6b2a8 });
      B.box(m.wood, a - x, h - 0.5, 0.03, (x + a) / 2, 0.45, zc + side * 0.02, { tint: 0x5e5650, uv: [x, 0], skip: 'ny' });
      for (let u = x + 0.15; u < a - 0.04; u += 0.3) B.box(m.pv, 0.012, h - 0.5, 0.012, u, 0.45, zc + side * 0.04, { tint: 0x38322e });
      for (const y of [0.7, h - 0.25]) B.box(m.wood, a - x, 0.06, 0.04, (x + a) / 2, y, zc - side * 0.015, { tint: 0x6a5e56 });
      B.box(m.wood, a - x + 0.04, 0.05, 0.13, (x + a) / 2, h - 0.05, zc, { tint: 0x5a4e46 });
      for (let u = x + 0.05; u <= a; u += Math.max(0.5, (a - x) / Math.ceil((a - x) / 1.8))) B.box(m.wood, 0.09, h, 0.09, Math.min(u, a - 0.05), 0, zc - side * 0.03, { tint: 0x5a4e46 });
    }
    x = b;
  }
  for (const [a, b] of gaps) {
    for (const px of [a - 0.06, b + 0.06]) B.box(m.wood, 0.14, 2.1, 0.14, px, 0, zc, { tint: 0x5a4e46 });
    B.box(m.wood, b - a + 0.4, 0.1, 0.16, (a + b) / 2, 1.95, zc, { tint: 0x5a4e46 });
    B.push((a + b) / 2, 2.07, zc);
    for (const s of [-1, 1]) B.face(m.kawara, [-(b - a) / 2 - 0.35, 0, s * 0.32], [(b - a) / 2 + 0.35, 0, s * 0.32], [(b - a) / 2 + 0.35, 0.14, 0], [-(b - a) / 2 - 0.35, 0.14, 0], { tint: 0x868c96, both: true });
    B.rod(m.ridge, [-(b - a) / 2 - 0.38, 0.16, 0], [(b - a) / 2 + 0.38, 0.16, 0], 0.05, { tint: 0x6a7078, sides: 6 });
    B.pop();
  }
}

/** Aluminium lattice gate (門扉) in a wall gap, slid or swung part open. */
export function gate(t, a, b, z, side, open = 0.35) {
  const B = t.B, m = t.m, w = b - a - 0.06, zc = z - side * 0.25, x = a + 0.03 + w / 2 - w * open, c = 0x9a8e7a;
  for (const y of [1.05, 0.55, 0.08]) B.box(m.metal, w, 0.04, 0.035, x, y, zc, { tint: c });
  const n = Math.round(w / 0.1);
  for (let i = 0; i <= n; i++) B.box(m.metal, 0.02, 1.0, 0.02, x - w / 2 + i * (w / n), 0.08, zc, { tint: c, skip: 'py ny' });
  B.box(m.metal, 0.04, 1.08, 0.04, x - w / 2, 0.04, zc, { tint: dark(c, 0.85) }); B.box(m.metal, 0.04, 1.08, 0.04, x + w / 2, 0.04, zc, { tint: dark(c, 0.85) });
  B.box(m.pv, 0.05, 0.1, 0.05, x + w / 2 - 0.06, 0.6, zc + side * 0.03, { tint: 0x3a3a38 });
}

/** A free-standing gate pillar (門柱) with a cap. */
export function pillar(t, x, z, { h = 1.45, mat = null, tint = 0xffffff, w = 0.32 } = {}) {
  const B = t.B, m = t.m;
  B.box(mat || m.block, w, h, w, x, 0, z, { uv: [x, 0], ao: 0.15, tint, skip: 'ny' });
  B.box(m.concrete, w + 0.07, 0.05, w + 0.07, x, h, z, { tint: 0xb6b2a8, bevel: 0.012 }); B.lathe(m.concrete, [[(w + 0.04) * 0.707, 0], [(w - 0.02) * 0.707, 0.03], [0.04, 0.075]], x, h + 0.05, z, { tint: 0xb6b2a8, sides: 4, exact: true, a0: Math.PI / 4 });
  t.game.player.addObstacle(x - w / 2, x + w / 2, z - w / 2, z + w / 2);
}

/** Yard surface between a house front and the building line. */
export function yard(t, x0, x1, z0, z1, mat, tint = 0xffffff) { t.B.plane(mat || t.m.concrete, x1 - x0, z1 - z0, (x0 + x1) / 2, 0.002, (z0 + z1) / 2, { uv: [x0, z0], k: 0.94, tint }); }
