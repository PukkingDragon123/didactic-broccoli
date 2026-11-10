// More hand-shaped forms for the sculpted figures (on top of src/figures/anatomy.js), in millimetres:
//   sweep   a soft body swept along a path in the yz plane: a towel over a line, a futon over a rail, a sock, a sleeve
//   peg     a plastic clothes peg (two prongs and a wire spring), jaws at the frame's origin, pointing down
//   coil    a wire spring along x
//   rail    a round rail with end caps
// Everything is built in the frame you are in.
import { spline, QUAL, V } from './sculpt.js';

const R = (f, v) => (typeof f === 'function' ? f(v) : f);

/**
 * A soft body swept along a path ([x, y, z] points, the bends in the yz plane). rx: half its width across x, rn: half
 * its thickness (numbers or (v 0..1) -> mm, so it can taper); o: sides, pow (2 round .. 4 a soft slab), steps (spline
 * steps a span), caps ('both' | 'start' | 'end' | 'none').
 */
export function sweep(S, path, rx, rn, o = {}) {
  const P = o.smooth === false ? path : spline(path, o.steps ?? 3), n = Math.max(4, Math.round((o.sides ?? 10) * QUAL.k)), e = 2 / (o.pow ?? 2.6);
  const rings = P.map((c, j) => {
    const a = P[Math.max(0, j - 1)], b = P[Math.min(P.length - 1, j + 1)], t = V.norm(V.sub(b, a));
    let nn = [0, -t[2], t[1]];
    nn = V.len(nn) < 1e-4 ? [0, 0, 1] : V.norm(nn);
    const v = j / (P.length - 1), ax = R(rx, v), an = R(rn, v), dense = [], M = n * 8;
    // (a squarish section is sampled densely and then evenly by length: equal cells, so the atlas patch stays narrow)
    for (let i = 0; i <= M; i++) {
      const ang = Math.PI / 2 + (i / M) * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang);
      dense.push([Math.sign(cs) * Math.abs(cs) ** e * ax, Math.sign(sn) * Math.abs(sn) ** e * an]);
    }
    const acc = [0];
    for (let i = 1; i <= M; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const out = [];
    for (let i = 0, k = 0; i < n; i++) {
      const L = ((i + 0.5) / n) * acc[M];
      while (k < M - 1 && acc[k + 1] < L) k++;
      const f = (L - acc[k]) / ((acc[k + 1] - acc[k]) || 1), x = dense[k][0] + (dense[k + 1][0] - dense[k][0]) * f, q = dense[k][1] + (dense[k + 1][1] - dense[k][1]) * f;
      out.push([c[0] + x, c[1] + nn[1] * q, c[2] + nn[2] * q]);
    }
    return out;
  });
  return S.loft(rings, { caps: o.caps ?? 'both' });
}

/** A wire spring along x from x0 to x1, coil radius r, wire radius w, turns. */
export function coil(S, c, x0, x1, r, w = 0.3, turns = 4) {
  const pts = [], n = Math.round(turns * 8);
  for (let i = 0; i <= n; i++) { const a = (i / 8) * Math.PI * 2, x = x0 + (x1 - x0) * (i / n); pts.push([c[0] + x, c[1] + Math.cos(a) * r, c[2] + Math.sin(a) * r]); }
  return S.tube(pts, w, { sides: 4 });
}

/**
 * A plastic clothes peg standing upright, the jaws closing on the frame's origin, the handles up to 13 mm (x k).
 * paints: [prong, spring].
 */
export function peg(S, at, rot, paints, k = 1) {
  return S.at(at, rot, () => {
    S.paint(...paints[0]);
    for (const s of [1, -1]) {
      const o = [[0.15, 0], [1.5, 0.3], [1.9, 2.6], [1.5, 4.6], [2.1, 6.2], [2.9, 12.6], [2.2, 13.2], [1.2, 12.4], [0.5, 6.4], [0.25, 4.6], [0.15, 2.4]].map(([x, y]) => [s * x, y]);
      S.extrude(s > 0 ? o : o.slice().reverse(), -1.7, 1.7, { bevel: 0.35 });
    }
    S.paint(...paints[1]);
    coil(S, [0, 5.4, 0], -2.4, 2.4, 1.15, 0.28, 3.5);
  }, k);
}

/** A round rail from a to b (along any axis) with rounded end caps. */
export function rail(S, a, b, r, capR = r * 1.25, capPaint = null) {
  S.tube([a, b], r, { sides: 10 });
  if (capPaint) S.paint(...capPaint);
  for (const p of [a, b]) S.ball(p, capR, { segs: 8, rings: 5 });
  return S;
}
