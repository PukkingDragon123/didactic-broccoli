// A vehicle body from its side profile: the outline in the side plane (z forward, y up), extruded across the width
// with rounded edges (the roof's shoulders, the corners of the nose and the tail), holes in the flat sides (windows, a
// door's opening), holes in the bands across (the windscreen, the rear window) with glass set in, and a matching
// inner shell (offset inwards, faces turned in) so the cab and the load space have walls, a floor and a headliner.
//   shell(G, { pts: [[z, y, f]...] (counter-clockwise, f: 1 = rounded edge, 0 = sharp), W, R, K,
//              sideHoles: { pos: [hole], neg: [hole] }  hole = { pts: [[z, y]...], glass, inset, wall }
//              bandHoles: [{ e, u0, u1, hx, inset }], uv, bandUv(e) (an edge's own uv, e.g. the wheel arches),
//              glassUv, glassGeo (a Geo for the glass) or glassSlot, wallUv, inner: { t, uv, slot } })
//   slab(G, ...)  a flat panel with thickness (a door), with window holes
import { norm } from './geom.js';

/** Offset a closed counter-clockwise polygon inwards by d[i] along edge i (mitred corners). */
export function offsetPoly(pts, d) {
  const n = pts.length, L = [];
  for (let i = 0; i < n; i++) {
    const [z0, y0] = pts[i], [z1, y1] = pts[(i + 1) % n];
    const dz = z1 - z0, dy = y1 - y0, l = Math.hypot(dz, dy) || 1;
    L.push({ p: [z0 - (dy / l) * d[i], y0 + (dz / l) * d[i]], dir: [dz / l, dy / l] });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = L[(i - 1 + n) % n], B = L[i];
    const den = A.dir[0] * B.dir[1] - A.dir[1] * B.dir[0];
    if (Math.abs(den) < 1e-6) { out.push(B.p); continue; }
    const dx = B.p[0] - A.p[0], dy = B.p[1] - A.p[1];
    const s = (dx * B.dir[1] - dy * B.dir[0]) / den;
    out.push([A.p[0] + A.dir[0] * s, A.p[1] + A.dir[1] * s]);
  }
  return out;
}

const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const [z0, y0] = pts[i], [z1, y1] = pts[(i + 1) % pts.length]; a += z0 * y1 - z1 * y0; } return a / 2; };

/** Walls round a hole in a flat side (x = xa outside, xb inside), facing into the opening. */
function holeWalls(G, h, xa, xb) {
  const ccw = area(h) > 0;
  for (let i = 0; i < h.length; i++) {
    const [z0, y0] = h[i], [z1, y1] = h[(i + 1) % h.length];
    const dz = z1 - z0, dy = y1 - y0;
    const hint = ccw ? [0, dz, -dy] : [0, -dz, dy];
    G.quad([xa, y0, z0], [xa, y1, z1], [xb, y1, z1], [xb, y0, z0], norm(hint));
  }
}

function rowsOf(base, f, W, R, K, extra) {
  const rows = [];
  for (let k = 0; k <= K; k++) {
    const th = (k / K) * Math.PI / 2;
    const d = f.map((fe) => fe * R * (1 - Math.sin(th)) + extra);
    rows.push({ x: W - R * (1 - Math.cos(th)), P: offsetPoly(base, d), th });
  }
  return rows;
}

/** Build the body shell into G. Returns { rows, inner } (the profiles, for fitting doors and trim). */
export function shell(G, o) {
  const base = o.pts.map((p) => [p[0], p[1]]), f = o.pts.map((p) => p[2] ?? 1);
  const K = o.K ?? 2, W = o.W, R = o.R, n = base.length;
  const SH = o.sideHoles || { pos: [], neg: [] };
  const GG = o.glassGeo || (o.glassSlot !== undefined ? G : null); // the glass: its own geometry, or a slot of G
  const BH = o.bandHoles || [];
  const res = { rows: rowsOf(base, f, W, R, K, 0) };
  const O = base.map((p, i) => { const q = base[(i + 1) % n], dz = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dz, dy) || 1; return [0, -dz / l, dy / l]; }); // outward, 3D (x, y, z)
  const T3 = base.map((p, i) => { const q = base[(i + 1) % n], dz = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dz, dy) || 1; return [0, dy / l, dz / l]; });

  const build = (rows, inward, t) => {
    const sgn = inward ? -1 : 1;
    const flip = (h) => h.map((v) => v * sgn);
    const P3 = (x, p) => [x, p[1], p[0]];
    const r0 = rows[0], rK = rows[K], xK = rK.x;
    // flat sides with their holes
    for (const sx of [1, -1]) {
      const holes = (sx > 0 ? SH.pos : SH.neg) || [];
      G.polyHoles(r0.P, holes.map((h) => h.pts), (z, y) => [sx * r0.x, y, z], flip([sx, 0, 0]));
    }
    // rounded bands
    const uv0 = G.uv;
    for (let e = 0; e < n; e++) {
      const e1 = (e + 1) % n;
      if (!inward && o.bandUv) G.uv = o.bandUv(e) || uv0;
      for (let k = 0; k < K; k++) {
        const A = rows[k], B = rows[k + 1], thm = (A.th + B.th) / 2;
        for (const sx of [1, -1]) {
          const hint = norm([sx * Math.cos(thm), O[e][1] * Math.sin(thm), O[e][2] * Math.sin(thm)]);
          G.quad(P3(sx * A.x, A.P[e]), P3(sx * A.x, A.P[e1]), P3(sx * B.x, B.P[e1]), P3(sx * B.x, B.P[e]), flip(hint));
        }
      }
      // the middle strip, maybe with a window in it
      const E0 = rK.P[e], E1 = rK.P[e1];
      const at = (u) => [E0[0] + (E1[0] - E0[0]) * u, E0[1] + (E1[1] - E0[1]) * u];
      const hole = BH.find((h) => h.e === e);
      if (!hole) { G.quad(P3(-xK, E0), P3(-xK, E1), P3(xK, E1), P3(xK, E0), flip(O[e])); G.uv = uv0; continue; }
      let { u0, u1 } = hole;
      const hx = hole.hx;
      if (inward) {
        // the inner strip's own fractions for the outer hole's corners pushed in by t
        const Ob = base[e], Oe = base[e1];
        const L2 = (E1[0] - E0[0]) ** 2 + (E1[1] - E0[1]) ** 2;
        const proj = (u) => { const q = [Ob[0] + (Oe[0] - Ob[0]) * u - O[e][2] * t, Ob[1] + (Oe[1] - Ob[1]) * u - O[e][1] * t]; return ((q[0] - E0[0]) * (E1[0] - E0[0]) + (q[1] - E0[1]) * (E1[1] - E0[1])) / L2; };
        u0 = proj(hole.u0); u1 = proj(hole.u1);
      }
      const a = at(u0), b = at(u1);
      G.quad(P3(-xK, E0), P3(-xK, a), P3(xK, a), P3(xK, E0), flip(O[e]));
      G.quad(P3(-xK, b), P3(-xK, E1), P3(xK, E1), P3(xK, b), flip(O[e]));
      G.quad(P3(-xK, a), P3(-xK, b), P3(-hx, b), P3(-hx, a), flip(O[e]));
      G.quad(P3(hx, a), P3(hx, b), P3(xK, b), P3(xK, a), flip(O[e]));
      if (!inward) {
        // the window's walls (rubber) and its glass
        const dep = (p, d) => [p[0] - O[e][2] * d, p[1] - O[e][1] * d];
        const wall = () => {
          const ai = dep(a, t), bi = dep(b, t);
          G.quad(P3(-hx, a), P3(-hx, b), P3(-hx, bi), P3(-hx, ai), [1, 0, 0]);
          G.quad(P3(hx, a), P3(hx, b), P3(hx, bi), P3(hx, ai), [-1, 0, 0]);
          G.quad(P3(-hx, a), P3(hx, a), P3(hx, ai), P3(-hx, ai), T3[e]);
          G.quad(P3(-hx, b), P3(hx, b), P3(hx, bi), P3(-hx, bi), T3[e].map((v) => -v));
        };
        const wuv = hole.wall || o.wallUv;
        if (wuv) G.with(wuv, null, wall); else wall();
        if (GG && hole.glass !== false) {
          const gi = hole.inset ?? 0.012, ga = dep(a, gi), gb = dep(b, gi);
          GG.with(o.glassUv || null, o.glassSlot ?? 0, () => GG.quad(P3(-hx, ga), P3(-hx, gb), P3(hx, gb), P3(hx, ga), O[e]));
        }
      }
      G.uv = uv0;
    }
    if (!inward) {
      // walls round the side holes, and their glass
      for (const sx of [1, -1]) for (const h of (sx > 0 ? SH.pos : SH.neg) || []) {
        const x0 = sx * W, x1 = sx * (W - (h.depth ?? t));
        G.with(h.wall || o.wallUv || null, null, () => holeWalls(G, h.pts, x0, x1));
        if (h.glass && GG) {
          const gx = sx * (W - (h.inset ?? 0.012));
          GG.with(o.glassUv || null, o.glassSlot ?? 0, () => GG.polyHoles(h.pts, [], (z, y) => [gx, y, z], [sx, 0, 0]));
        }
      }
    }
  };
  G.with(o.uv, o.slot ?? 0, () => build(res.rows, false, o.inner?.t ?? 0.03));
  if (o.inner) {
    const t = o.inner.t, Ri = Math.max(0.004, R - t);
    res.inner = rowsOf(base, f, W - t, Ri, K, t);
    // the inner shell's flat sides: same holes; the band middle strips: their windows pushed in by t
    G.with(o.inner.uv, o.inner.slot ?? o.slot ?? 0, () => build(res.inner, true, t));
  }
  return res;
}

/**
 * A flat panel with thickness (a door, a hatch): outline pts [[a, b]] and window holes in the panel's plane, its outside
 * face at `xo` and inside at `xi` along the panel's normal axis. axis 'x' (default): a side panel, (a, b) = (z, y);
 * axis 'z': an end panel, (a, b) = (x, y). uvOut / uvIn for the faces, uvEdge for its edges, uvHole for the windows'
 * walls; glass: { geo (a Geo), uv, inset }.
 */
export function slab(G, pts, holes, xo, xi, o = {}) {
  const ax = o.axis || 'x';
  const P = ax === 'x' ? (a, b, x) => [x, b, a] : (a, b, x) => [a, b, x];
  const N = ax === 'x' ? (s) => [s, 0, 0] : (s) => [0, 0, s];
  // the panel's in-plane normal for an edge (a, b) direction, as a 3D vector
  const E = ax === 'x' ? (da, db) => [0, db, da] : (da, db) => [da, db, 0];
  const sx = Math.sign(xo - xi);
  G.with(o.uvOut, o.slot ?? 0, () => G.polyHoles(pts, holes, (a, b) => P(a, b, xo), N(sx)));
  G.with(o.uvIn, o.slot ?? 0, () => G.polyHoles(pts, holes, (a, b) => P(a, b, xi), N(-sx)));
  const walls = (poly, outward) => {
    const ccw = area(poly) > 0;
    for (let i = 0; i < poly.length; i++) {
      const [a0, b0] = poly[i], [a1, b1] = poly[(i + 1) % poly.length];
      const da = a1 - a0, db = b1 - b0;
      // right normal (db, -da) points out of a ccw outline
      let h = ccw ? E(db, -da) : E(-db, da);
      if (!outward) h = h.map((v) => -v);
      G.quad(P(a0, b0, xo), P(a1, b1, xo), P(a1, b1, xi), P(a0, b0, xi), norm(h));
    }
  };
  G.with(o.uvEdge, o.slot ?? 0, () => walls(pts, true));
  G.with(o.uvHole || o.uvEdge, o.slot ?? 0, () => { for (const h of holes) walls(h, false); });
  if (o.glass) for (const h of holes) {
    const gx = xo - sx * (o.glass.inset ?? 0.012), GG = o.glass.geo || G;
    GG.with(o.glass.uv, o.glass.slot ?? 0, () => GG.polyHoles(h, [], (a, b) => P(a, b, gx), N(sx)));
  }
}
