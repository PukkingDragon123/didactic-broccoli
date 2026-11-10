// Shape helpers for src/props/things (on top of the prop kit):
//   sweep(K, c, [cx, cy, cz], prof, n, o)  a solid of revolution whose radius can vary round the turn (pleats, flutes,
//                                          a squashed pouch): prof = [[r, y], ...] bottom to top; o.mod(r, a, k, y)
//                                          returns the radius at turn angle a on profile row k; c: colour or a View
//                                          (wrapped: s round the turn, t up the profile); o.flip for inner walls
//   glyphs(K, c, text, x, z, h, y0, y1, o) raised numerals on a horizontal face (relief: coins, dials, keycaps)
//   rrect(w, h, r, n) -> outline of a rounded rectangle (centred), for K.prism
//   ellipse(rx, ry, n, cx, cy) -> outline
export function sweep(K, c, at, prof, n = 16, o = {}) {
  const G = K.G, V = c && c.map3 ? c : null, uvf = V ? null : K.uv(c), prev = G.uv;
  if (uvf) G.uv = uvf;
  n = K.seg(n);
  const a0 = o.a0 ?? 0, mod = o.mod || ((r) => r), sx = o.sx ?? 1, sz = o.sz ?? 1;
  const ys = prof.map((p) => p[1]), yMin = Math.min(...ys), yMax = Math.max(...ys);
  const P = (k, s) => {
    const a = a0 + (s / n) * Math.PI * 2, r = mod(prof[k][0], a, k, prof[k][1]);
    return [at[0] + Math.sin(a) * r * sx, at[1] + prof[k][1], at[2] + Math.cos(a) * r * sz];
  };
  const tOf = (k) => (prof[k][1] - yMin) / ((yMax - yMin) || 1);
  for (let k = 0; k + 1 < prof.length; k++) {
    for (let s = 0; s < n; s++) {
      const q = [P(k, s), P(k, s + 1), P(k + 1, s + 1), P(k + 1, s)];
      const am = a0 + ((s + 0.5) / n) * Math.PI * 2;
      // outward hint: radial, tipped by the profile's slope
      const dr = prof[k + 1][0] - prof[k][0], dy = prof[k + 1][1] - prof[k][1], l = Math.hypot(dr, dy) || 1;
      let h = [Math.sin(am) * (dy / l), -dr / l, Math.cos(am) * (dy / l)];
      if (o.flip) h = h.map((v) => -v);
      const uvs = V ? [V.st(s / n, tOf(k)), V.st((s + 1) / n, tOf(k)), V.st((s + 1) / n, tOf(k + 1)), V.st(s / n, tOf(k + 1))] : null;
      if (prof[k][0] < 1e-7) G.tri(q[0], q[2], q[3], h, uvs ? [uvs[0], uvs[2], uvs[3]] : null);
      else if (prof[k + 1][0] < 1e-7) G.tri(q[0], q[1], q[2], h, uvs ? [uvs[0], uvs[1], uvs[2]] : null);
      else G.quad(q[0], q[1], q[2], q[3], h, uvs);
    }
  }
  G.uv = prev;
  return K;
}

export function ellipse(rx, ry, n = 16, cx = 0, cy = 0) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return out;
}
export function rrect(w, h, r, n = 3, cx = 0, cy = 0) {
  const out = [], hw = w / 2, hh = h / 2;
  r = Math.min(r, hw, hh);
  const corners = [[hw - r, hh - r, 0], [-hw + r, hh - r, Math.PI / 2], [-hw + r, -hh + r, Math.PI], [hw - r, -hh + r, Math.PI * 1.5]];
  for (const [x, y, a0] of corners) for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); out.push([cx + x + Math.cos(a) * r, cy + y + Math.sin(a) * r]); }
  return out;
}

// Numeral outlines in a 5 x 7 unit cell (x right, y up), drawn as relief (prisms, with holes for 0 / 6 / 8 / 9)
const GLYPH = {
  1: { o: [[1.6, 0], [3.4, 0], [3.4, 7], [2.2, 7], [0.4, 5.6], [0.4, 4.6], [1.6, 5.2]] },
  0: { o: ellipse(2.5, 3.5, 14, 2.5, 3.5), h: [ellipse(1.25, 2.3, 14, 2.5, 3.5)] },
  5: { o: [[0.4, 0.4], [1.4, 0], [3.2, 0], [4.6, 0.9], [4.8, 2.4], [4.2, 3.7], [2.8, 4.3], [1.7, 4.2], [1.9, 5.8], [4.6, 5.8], [4.6, 7], [0.8, 7], [0.4, 3.2], [1.4, 3.1], [2.6, 3.2], [3.5, 2.6], [3.6, 1.8], [3.0, 1.2], [1.8, 1.2], [0.8, 1.6]] },
};
/** Raised numerals on an upward face at height y0..y1, centred on (x, z), h tall (glyph up = -z), o.down: on a face looking down. */
export function glyphs(K, c, text, x, z, h, y0, y1, o = {}) {
  const u = h / 7, gap = o.gap ?? 0.9, wOf = (ch) => (ch === '1' ? 3.8 : 5);
  let W = 0;
  for (const ch of text) W += wOf(ch) + gap;
  W -= gap;
  let px = -W / 2;
  for (const ch of text) {
    const g = GLYPH[ch];
    if (g) {
      const map = (p) => { const gx = (px + p[0] - (ch === '1' ? 0.4 : 0)) * u, gy = (p[1] - 3.5) * u; return o.down ? [x - gx, z - gy] : [x + gx, z - gy]; };
      K.prism(c, g.o.map(map), { plane: 'xz', a: y0, b: y1, holes: (g.h || []).map((hl) => hl.map(map)), caps: o.down ? 'a' : 'b' });
    }
    px += wOf(ch) + gap;
  }
  return K;
}

/** Quads between consecutive loops of 3D points (same point count, same winding): a lofted skin. o.flip: inward. */
export function loft(K, c, loops, o = {}) {
  const G = K.G, prev = G.uv;
  G.uv = K.uv(c);
  const L = loops[0].length;
  // a centre to aim the hints away from
  const cen = [0, 0, 0];
  for (const lp of loops) for (const p of lp) { cen[0] += p[0]; cen[1] += p[1]; cen[2] += p[2]; }
  const nn = loops.length * L; cen[0] /= nn; cen[1] /= nn; cen[2] /= nn;
  for (let k = 0; k + 1 < loops.length; k++) for (let i = 0; i < L; i++) {
    const a = loops[k][i], b = loops[k][(i + 1) % L], c2 = loops[k + 1][(i + 1) % L], d = loops[k + 1][i];
    const m = [(a[0] + b[0] + c2[0] + d[0]) / 4 - cen[0], (a[1] + b[1] + c2[1] + d[1]) / 4 - cen[1], (a[2] + b[2] + c2[2] + d[2]) / 4 - cen[2]];
    G.quad(a, b, c2, d, o.flip ? m.map((v) => -v) : (o.hint || m));
  }
  G.uv = prev;
  return K;
}
/** A flat face at depth w on axis 'z' | 'y' | 'x' (dir +1 / -1): outline + holes in the plane (2D points as for K.prism). */
export function cap(K, c, outline, holes, axis, w, dir = 1) {
  const to3 = axis === 'z' ? (u, v) => [u, v, w] : axis === 'y' ? (u, v) => [u, w, v] : (u, v) => [w, v, u];
  const hint = axis === 'z' ? [0, 0, dir] : axis === 'y' ? [0, dir, 0] : [dir, 0, 0];
  K.use(c, (G) => G.polyHoles(outline, holes || [], to3, hint));
  return K;
}
/** A 2D outline (xy) lifted to a loop at depth z. */
export const atZ = (pts, z) => pts.map(([x, y]) => [x, y, z]);
