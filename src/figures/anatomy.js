// Sculpted anatomy for the figures: forms lofted through hand-set cross-sections instead of spheres and cylinders.
// A head has a skull, a brow line, cheeks and a muzzle; a body has shoulders, a belly and haunches; a paw has a heel
// and toes; ears, wings and flippers are cupped blades; cloth is a sheet with folds. Everything is built in the frame
// you are in (millimetres), inside the same radii a plain ball would have had, so paint laid out for a part still fits.
import { ring, spline } from './sculpt.js';

/** A cross-section round c in the xy plane (facing z): its top half ry0 tall, its bottom half ry1, the lower half
 *  fuller by `cheek` (jowls), n points, superellipse power pow. */
function faceRing(c, rx, ry0, ry1, n, pow, cheek = 0) {
  const out = [], e = 2 / pow, off = Math.PI / 2 - Math.PI / n;
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
    const y = Math.sign(sn) * Math.abs(sn) ** e, x = Math.sign(cs) * Math.abs(cs) ** e * (1 + (y < 0 ? cheek * Math.sin(-y * Math.PI) : 0));
    out.push([c[0] + x * rx, c[1] + y * (y > 0 ? ry0 : ry1), c[2]]);
  }
  return out;
}

/**
 * A head, facing +z, inside the radii r = [rx, ry, rz] round c. o: n (points round), pow (2 round .. 3 squarish), brow
 * (how far the brow overhangs the face, 0..1), cheek (jowls, 0..0.3), muzzle (0 = a flat face; up to 1 = a snout pushed
 * out to the front radius), chin (how far the lower face drops back, 0..1), crown (a taller skull, x ry).
 */
export function head(S, c, r, o = {}) {
  const [rx, ry, rz] = typeof r === 'number' ? [r, r, r] : r, n = o.n ?? 12, pow = o.pow ?? 2.3, brow = o.brow ?? 0.4, cheek = o.cheek ?? 0.12, mz = o.muzzle ?? 0.35, chin = o.chin ?? 0.3, cr = o.crown ?? 1;
  // stations back to front: [z, half width, height above, height below, y shift] as fractions of the radii
  const st = [
    [-0.98, 0.34, 0.36, 0.34, 0.1], [-0.72, 0.8, 0.8 * cr, 0.72, 0.06], [-0.2, 1, 1 * cr, 0.94, 0.02], [0.3, 0.98, 0.94 * cr, 1, -0.02],
    [0.62, 0.86 - 0.1 * brow, 0.78 - 0.16 * brow, 0.92, -0.06], [0.84, 0.6 + 0.12 * mz, 0.44 + 0.1 * mz - 0.1 * brow, 0.8 - 0.2 * chin, -0.1 - 0.06 * mz], [0.985, 0.3 + 0.16 * mz, 0.2 + 0.1 * mz, 0.42 - 0.14 * chin, -0.16 - 0.08 * mz],
  ];
  const rings = spline(st, 2).map(([z, w, h0, h1, dy]) => faceRing([c[0], c[1] + dy * ry, c[2] + z * rz], Math.max(0.05, w) * rx, Math.max(0.05, h0) * ry, Math.max(0.05, h1) * ry, n, pow, z > -0.3 ? cheek : 0));
  return S.loft(rings);
}

/**
 * A torso standing on y, inside the radii r round c: narrow shoulders, a belly that comes forward, haunches that sit
 * wide and low. o: n, pow, belly (0..0.4 forward), hips (width of the haunches x rx), sit (how low the widest point is,
 * 0.2..0.5 of the height), lean (shoulders forward, mm).
 */
export function torso(S, c, r, o = {}) {
  const [rx, ry, rz] = typeof r === 'number' ? [r, r, r] : r, n = o.n ?? 12, belly = o.belly ?? 0.16, hips = o.hips ?? 1, sit = o.sit ?? 0.34, lean = o.lean ?? 0;
  const st = [[-1, 0.42 * hips, 0.4, -0.04], [-1 + sit * 0.5, 0.9 * hips, 0.86, 0], [-1 + sit * 2, 1 * hips, 1, belly * 0.6], [0.05, 0.92, 0.94, belly], [0.5, 0.74, 0.76, belly * 0.5], [0.82, 0.54, 0.56, 0.02], [1, 0.26, 0.28, 0]];
  const rings = spline(st, 2).map(([y, w, d, f]) => ring([c[0], c[1] + y * ry, c[2] + f * rz + lean * (y + 1) / 2], Math.max(0.05, w) * rx, Math.max(0.05, d) * rz * (1 - belly * 0.3), n, { pow: o.pow ?? 2.2 }));
  return S.loft(rings);
}

/** A lying loaf of a body along z (a seal, a fox curled up, a lion at rest): shoulders at +z, haunches at -z. */
export function loaf(S, c, r, o = {}) {
  const [rx, ry, rz] = r, n = o.n ?? 12;
  const st = [[-1, 0.3, 0.34, -0.3], [-0.72, 0.86, 0.8, -0.1], [-0.25, 1, 1, 0], [0.3, 0.9, 0.9, -0.04], [0.74, 0.74, 0.78, -0.08], [1, 0.34, 0.4, -0.2]];
  const rings = spline(st, 2).map(([z, w, h, dy]) => faceRing([c[0], c[1] + dy * ry, c[2] + z * rz], Math.max(0.05, w) * rx, Math.max(0.05, h) * ry, Math.max(0.05, h) * ry * (o.flat ?? 0.8), n, o.pow ?? 2.3, 0.1));
  return S.loft(rings);
}

/** A paw or a foot resting on y = at[1], toes towards +z: a heel, a pad that spreads, `toes` toes. w, l, h in mm. */
export function paw(S, at, w, l, h, o = {}) {
  const toes = o.toes ?? 3, [x, y, z] = at;
  S.loft(spline([[-0.5, 0.5, 0.7, 0.55], [-0.15, 0.82, 1, 0.5], [0.22, 1, 0.74, 0.4], [0.42, 0.9, 0.5, 0.3]], 2).map(([t, ww, hh, cy]) => faceRing([x, y + cy * h, z + t * l], ww * w / 2, hh * h * 0.55, cy * h, 8, 2.6)));
  for (let k = 0; k < toes; k++) {
    const tx = x + ((k + 0.5) / toes - 0.5) * w * 0.92, tw = w / toes * 0.56;
    S.loft([[0.3, 1, 1], [0.5, 1.05, 0.9], [0.62, 0.7, 0.6]].map(([t, ww, hh]) => faceRing([tx, y + h * 0.26 * hh, z + t * l], tw * ww, h * 0.3 * hh, h * 0.26 * hh, 6, 2.2)));
  }
  return S;
}

/**
 * A cupped blade standing on +y from the origin of the frame (an ear, a wing, a flipper, a feather): len long, w wide,
 * th thick. o.shape: width along its length ('ear' pointed, 'round', 'wing' widest near the tip, 'leaf'), cup (curl
 * towards +z, mm), n.
 */
export function blade(S, len, w, th, o = {}) {
  const P = { ear: [[0, 0.62], [0.3, 1], [0.7, 0.66], [1, 0.1]], round: [[0, 0.5], [0.3, 0.94], [0.68, 1], [1, 0.42]], wing: [[0, 0.5], [0.35, 0.86], [0.75, 1], [1, 0.3]], leaf: [[0, 0.3], [0.4, 1], [0.8, 0.6], [1, 0.08]] }[o.shape || 'ear'];
  const cup = o.cup ?? 0;
  return S.loft(spline(P, 2).map(([t, k]) => ring([0, t * len, cup * Math.sin(t * Math.PI)], Math.max(0.06, k) * w / 2, th / 2 * (0.5 + 0.5 * Math.max(0.1, k)), o.n ?? 6, { pow: 2.6 })));
}

/**
 * Cloth: a sheet over [x0, x1] x [z0, z1] at height y, lifted by fold(u, v) -> mm (u, v in 0..1) and th thick, its
 * edge turned down. nx, nz: how finely it is cut (folds need a few facets each).
 */
export function drape(S, x0, z0, x1, z1, y, o = {}) {
  const nx = o.nx ?? 6, nz = o.nz ?? 6, th = o.th ?? 1, fold = o.fold || (() => 0), P = [];
  for (let j = 0; j <= nz; j++) { const row = []; for (let i = 0; i <= nx; i++) { const u = i / nx, v = j / nz; row.push([x0 + (x1 - x0) * u, y + fold(u, v), z0 + (z1 - z0) * v]); } P.push(row); }
  const polys = [], dn = (p) => [p[0], p[1] - th, p[2]];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    polys.push({ pts: [P[j][i], P[j + 1][i], P[j + 1][i + 1], P[j][i + 1]], hint: [0, 1, 0] });
    polys.push({ pts: [dn(P[j][i]), dn(P[j + 1][i]), dn(P[j + 1][i + 1]), dn(P[j][i + 1])], hint: [0, -1, 0] });
  }
  for (let i = 0; i < nx; i++) { polys.push({ pts: [P[0][i], P[0][i + 1], dn(P[0][i + 1]), dn(P[0][i])], hint: [0, 0, z0 < z1 ? -1 : 1] }); polys.push({ pts: [P[nz][i], P[nz][i + 1], dn(P[nz][i + 1]), dn(P[nz][i])], hint: [0, 0, z0 < z1 ? 1 : -1] }); }
  for (let j = 0; j < nz; j++) { polys.push({ pts: [P[j][0], P[j + 1][0], dn(P[j + 1][0]), dn(P[j][0])], hint: [x0 < x1 ? -1 : 1, 0, 0] }); polys.push({ pts: [P[j][nx], P[j + 1][nx], dn(P[j + 1][nx]), dn(P[j][nx])], hint: [x0 < x1 ? 1 : -1, 0, 0] }); }
  return S.emit(polys);
}

/** An egg standing on y (blunt end down), r wide and h tall, its base at c: a real egg's profile, not an ellipsoid. */
export function eggShape(S, c, r, h, o = {}) {
  const prof = spline([[0, 0], [0.62, 0.05], [0.96, 0.26], [1, 0.42], [0.86, 0.66], [0.56, 0.88], [0, 1]], 2).map(([k, t]) => [k * r, t * h]);
  const v0 = o.v0 ?? 0, v1 = o.v1 ?? 1, cut = prof.filter(([, y]) => y >= v0 * h - 1e-6 && y <= v1 * h + 1e-6);
  return S.lathe(cut, { segs: o.segs ?? 10, at: c, cap: true });
}
