// What is on and in a capsule besides its two shells (src/gachakit/capsuleShell.js), as shared low-poly geometry:
//  * the folded mini-book (cover out, line-up in), the bag of parts (frosted film with a crimped seal, the parts
//    moulded in the series' colours), the scrunched foil inner wrap of the top tiers;
//  * the shrink band round the seam, built segment by segment from its pull tab so it can be peeled (a draw range),
//    and the curled strip that comes off it;
//  * the tamper seals over the seam, each in an upper and a lower piece that part with the halves: a printed sticker,
//    a wax seal (whole and cracked), and the 当 sticker; glitter flecks set in the plastic.
// Everything is in metres with the seam at y = 0 and the seals facing +z (the side you hold towards you).
import * as THREE from 'three';
import { Geo } from '../vehicles/geom.js';
import { GeoS } from './geo.js';
import { profileAt, shapeLip, shellSkin } from './capsuleShell.js';
import { SHEET, SEALS, uvRect } from './capsulePrint.js';

const D2R = Math.PI / 180;
const cache = new Map();
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const inRect = (rc, s, t) => [rc[0] + (rc[2] - rc[0]) * s, rc[1] + (rc[3] - rc[1]) * t];
const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const scaleM = (r) => new THREE.Matrix4().makeScale(r, r, r);
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const done = (G) => { const g = G.build(); g.clearGroups(); return g; };

/** The mini-book: two leaves, the cover bowed towards +z. 0.95 r wide, 1.27 r tall, centred. */
export function leafletGeo(r) {
  return memo('leaf' + r, () => {
    const G = new GeoS(1), w = 0.95, h = 1.27, cov = uvRect(SHEET.cover), ins = uvRect(SHEET.inside);
    G.push(scaleM(r));
    const leaf = (z0, fan, front, back) => {
      const at = (sgn) => (s, t) => { const u = 2 * s - 1; return { p: [u * w / 2, (t - 0.5) * h, z0 + 0.05 * (1 - u * u) - fan * s], n: nrm([(0.21 * u + fan) * sgn, 0, sgn]) }; };
      G.patch(4, 1, at(1), (s, t) => inRect(front, s, t));
      G.patch(4, 1, at(-1), (s, t) => inRect(back, 1 - s, t));
    };
    leaf(0, 0, cov, ins);
    leaf(-0.04, 0.09, ins, ins);
    return done(G);
  });
}

const swUV = (k) => { const [x, y] = SHEET.sw[k]; const t = [(x + 8) / 512, 1 - (y + 8) / 256]; return () => t; };
const WHITE_UV = () => [(384 + 12) / 512, 1 - 30 / 256];
/** The bagged parts: three chunky pieces in the series' colours and the bag's heat-seal strip (variant 0..3). */
export function partsGeo(r, variant = 0) {
  return memo(`parts${r}|${variant}`, () => {
    // what a capsule toy comes in: the figure's body, its round head, the stand it clips onto and a fold of stickers,
    // each a moulding in one of the series' colours with its own profile (smooth, the way injection moulding is)
    const G = new GeoS(1), c = [1, 2, 0, 3].map((k) => swUV((k + variant) % 4));
    G.push(scaleM(r));
    const piece = (pos, rot, s, fn, uv) => { G.push(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(s, s, s))); G.with(uv, 0, fn); G.pop(); };
    // the body: a pear of a torso with a flared hem and a neck peg
    piece([-0.13, -0.6, 0.12], [0.45, 0.3, 0.95], 1, () => G.revolve([[0, -0.2, 1], [0.15, -0.2, 1], [0.17, -0.18], [0.16, -0.12], [0.13, -0.02], [0.11, 0.06], [0.1, 0.1, 1], [0.045, 0.11, 1], [0.045, 0.17, 1], [0.035, 0.18], [0, 0.18, 1]], 20, { uv: c[0] }), c[0]);
    // the head: a rounded bun, wider than tall, with the socket underneath
    piece([0.2, -0.47, 0.2], [0.3, 0.8, -0.5], 1, () => G.revolve([[0, -0.07, 1], [0.045, -0.07, 1], [0.045, -0.105, 1], [0.1, -0.11, 1], [0.15, -0.09], [0.18, -0.03], [0.175, 0.04], [0.14, 0.1], [0.08, 0.135], [0, 0.145]], 20, { uv: c[1] }), c[1]);
    // the stand: a disc with a bevelled rim, a raised foot-plate and its peg hole
    piece([0.03, -0.73, 0.06], [0.12, 0.4, 1.45], 1, () => G.revolve([[0, -0.042, 1], [0.27, -0.042], [0.29, -0.03, 1], [0.29, 0.004, 1], [0.27, 0.016, 1], [0.13, 0.016, 1], [0.12, 0.026, 1], [0.04, 0.026, 1], [0.04, 0.006, 1], [0, 0.006, 1]], 28, { uv: c[2] }), c[2]);
    // a fold of stickers on its backing card
    piece([0.11, -0.28, -0.02], [0.2, -0.5, 0.85], 1, () => { G.box(-0.2, -0.13, -0.006, 0, 0.13, 0.006, { bevel: 0.004 }); G.push(new THREE.Matrix4().makeRotationY(0.5)); G.box(0, -0.13, -0.006, 0.2, 0.13, 0.006, { bevel: 0.004 }); G.pop(); }, c[3]);
    return done(G);
  });
}
/**
 * The parts bag: a pillow of frosted film, bulging front and back, with the crimped heat seal along its top edge (the
 * film is frosted: the parts show through it as soft shapes, the way a real bag hides the toy until it is opened).
 */
export function bagGeo(r) {
  return memo('bag' + r, () => {
    const G = new GeoS(1), a = 0.43, b = 0.44, cz = 0.3, uv = () => [(384 + 12) / 512, 1 - 30 / 256];
    G.push(new THREE.Matrix4().compose(new THREE.Vector3(0.02 * r, -0.5 * r, 0.14 * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08, 0.15, -0.06)), new THREE.Vector3(r, r * 0.82, r * 0.8)));
    // the bulge falls off towards the welded rim (a softened superellipse), the film creasing a little at the corners
    const bulge = (x, y) => cz * Math.sqrt(Math.max(0, 1 - Math.abs(x / a) ** 3.2)) * Math.sqrt(Math.max(0, 1 - Math.abs(y / b) ** 2.6)) * (1 - 0.06 * Math.cos(x * 9));
    for (const side of [1, -1]) {
      const at = (s, t) => {
        const x = (2 * s - 1) * a, y = (2 * t - 1) * b, e = 1e-3, z = side * bulge(x, y);
        const dx = side * (bulge(x + e, y) - bulge(x - e, y)) / (2 * e), dy = side * (bulge(x, y + e) - bulge(x, y - e)) / (2 * e);
        return { p: [x, y, z], n: nrm([-dx * side, -dy * side, side]) };
      };
      G.patch(18, 14, at, uv);
    }
    // the heat seal: a flat welded strip along the top, pressed into fine pleats
    const N = 22, y0 = b, y1 = b + 0.1;
    for (let i = 0; i < N; i++) {
      const xa = -a + (2 * a * i) / N, xb = -a + (2 * a * (i + 1)) / N, za = (i % 2 ? 1 : -1) * 0.006, zb = -za;
      G.quadN([xa, y0, za], [xb, y0, zb], [xb, y1, zb], [xa, y1, za], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], uv(), uv(), uv(), uv());
    }
    return done(G);
  });
}
/** The foil inner wrap: a ball of foil scrunched round the toy, its creases laid by hand, faceted the way foil folds. */
export function foilGeo(r) {
  return memo('foil' + r, () => {
    const G = new Geo(1), uv = shellSkin('plastic').sw.lite;
    G.push(new THREE.Matrix4().compose(new THREE.Vector3(0, -0.2 * r, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(r, r, r)));
    // creases: [axis, depth, width] each a fold running round the ball (a groove where the foil was pressed together)
    const CR = [[[0.3, 1, 0.2], 0.07, 0.18], [[1, 0.2, -0.4], 0.06, 0.14], [[-0.5, 0.3, 1], 0.08, 0.2], [[0.7, -0.6, 0.4], 0.05, 0.12], [[-0.2, -0.9, -0.6], 0.06, 0.16], [[0.9, 0.5, 0.9], 0.04, 0.1]].map(([n, d, w]) => [nrm(n), d, w]);
    const rad = (d) => {
      // an egg of foil, the wrap gathered and twisted at one end (+y), pinched by the creases
      const base = 0.6 * (1 - 0.12 * Math.max(0, d[1]) ** 3);
      let k = 1;
      for (const [n, dep, w] of CR) { const q = Math.abs(d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) / w; if (q < 1) k -= dep * (1 - q) * (1 - q); }
      return base * k;
    };
    const R = 14, S = 26, P = [];
    for (let j = 0; j <= R; j++) {
      P.push([]);
      const lat = -Math.PI / 2 + (Math.PI * j) / R;
      for (let i = 0; i < S; i++) { const lon = (Math.PI * 2 * i) / S + (j % 2) * Math.PI / S, d = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)], k = rad(d); P[j].push([d[0] * k, d[1] * k * 1.02, d[2] * k]); }
    }
    G.with(uv, 0, () => {
      for (let j = 0; j < R; j++) for (let i = 0; i < S; i++) {
        const a = P[j][i], b = P[j][(i + 1) % S], c2 = P[j + 1][(i + 1) % S], d = P[j + 1][i], out = nrm([(a[0] + c2[0]) / 2, (a[1] + c2[1]) / 2, (a[2] + c2[2]) / 2]);
        G.tri(a, b, c2, out); G.tri(a, c2, d, out);
      }
    });
    return done(G);
  });
}

// ----------------------------------------------------------------------------- the shrink band
export const BAND_N = 48, BAND_VERTS = 24, BAND_TAB = 6, RIBBON_N = 22, BAND_A0 = 62 * D2R;
/**
 * The band round the seam and the strip peeled off it. ring: the pull tab first, then BAND_N segments of BAND_VERTS
 * vertices from the tab round (peeled = draw range from BAND_TAB + k * BAND_VERTS); ribbon: RIBBON_N quads curling
 * away from a peel front at the origin (x out of the capsule, the strip leaving along -z). o: { which: 'band' | 'band2', grow }
 */
export function bandGeo(shape, r, which = 'band', grow = 0) {
  return memo(`band|${shape}|${r}|${which}|${grow}`, () => {
    const lip = shapeLip(shape), rc = uvRect(SEALS[which]);
    const ys = [0.105, 0.02, 0, -0.118, -0.165], vs = [1, 0.72, 0.62, 0.2, 0];
    const Rs = [profileAt(shape, 'top', 0.105) + 0.008, profileAt(shape, 'top', 0.02) + 0.012, lip * 1.07, lip * 1.07, profileAt(shape, 'bottom', -0.165) + 0.008].map((v) => v + grow);
    const dth = Math.PI * 2 / BAND_N, per = BAND_N / 2;
    const G = new GeoS(1);
    G.push(scaleM(r));
    const P = (a, k) => [Math.cos(a) * Rs[k], ys[k], Math.sin(a) * Rs[k]], Nn = (a) => [Math.cos(a), 0, Math.sin(a)];
    // the pull tab: a flap standing off the band's leading edge
    { const a = BAND_A0, o = [Math.cos(a - 0.5) * 0.16, 0, Math.sin(a - 0.5) * 0.16], p0 = P(a, 1), p1 = P(a, 3), q0 = [p0[0] + o[0], p0[1] - 0.01, p0[2] + o[2]], q1 = [p1[0] + o[0], p1[1] + 0.01, p1[2] + o[2]], n = Nn(a - 0.9); G.quadN(p1, q1, q0, p0, n, n, n, n, inRect(rc, 0.80, 0.2), inRect(rc, 0.86, 0.2), inRect(rc, 0.86, 0.72), inRect(rc, 0.80, 0.72)); }
    for (let k = 0; k < BAND_N; k++) {
      const aA = BAND_A0 + k * dth, aB = aA + dth, uA = 1 - (k % per) / per, uB = 1 - ((k % per) + 1) / per;
      for (let q = 0; q < 4; q++) G.quadN(P(aA, q + 1), P(aB, q + 1), P(aB, q), P(aA, q), Nn(aA), Nn(aB), Nn(aB), Nn(aA), inRect(rc, uA, vs[q + 1]), inRect(rc, uB, vs[q + 1]), inRect(rc, uB, vs[q]), inRect(rc, uA, vs[q]));
    }
    const ring = done(G);
    // the peeled strip
    const R = new GeoS(1), len = dth * lip * 1.07;
    R.push(scaleM(r));
    const col = [];
    let x = 0, z = 0;
    for (let m = 0; m <= RIBBON_N; m++) { const phi = (18 + m * 9.5) * D2R; col.push({ x, z, n: [Math.cos(phi), 0, Math.sin(phi)] }); x += Math.sin(phi) * len; z -= Math.cos(phi) * len; }
    for (let m = 0; m < RIBBON_N; m++) {
      const a = col[m], b = col[m + 1], uA = 1 - (m % per) / per, uB = 1 - ((m % per) + 1) / per, y0 = ys[4], y1 = ys[0], tw = 0.02 * m; // the strip twists a little as it goes
      R.quadN([a.x, y0 + tw, a.z], [b.x, y0 + tw + 0.02, b.z], [b.x, y1 + tw + 0.02, b.z], [a.x, y1 + tw, a.z], a.n, b.n, b.n, a.n, inRect(rc, uA, 0), inRect(rc, uB, 0), inRect(rc, uB, 1), inRect(rc, uA, 1));
    }
    return { ring, ribbon: done(R), lipR: lip * 1.07 * r };
  });
}

// ----------------------------------------------------------------------------- seals over the seam
const SEAL_A = 90 * D2R; // facing +z
/** A patch lying on a half of the capsule: aC centre azimuth, half (deg) its half width, ys rows (units of r), vs their v. */
function wrapPatch(G, shape, part, aC, half, ys, vs, rc, off, RsOverride = null, cols = 6) {
  const rows = ys.length - 1;
  G.patch(cols, rows, (s, t) => {
    const k = Math.min(rows - 1, Math.floor(t * rows + 1e-6)), f = t * rows - k, y = ys[k] + (ys[Math.min(rows, k + 1)] - ys[k]) * f;
    const a = aC + (0.5 - s) * 2 * half * D2R;
    const R = RsOverride ? RsOverride[k] + (RsOverride[Math.min(rows, k + 1)] - RsOverride[k]) * f : profileAt(shape, part, y) + off;
    return { p: [Math.cos(a) * R, y, Math.sin(a) * R], n: nrm([Math.cos(a) * R, y * 0.9, Math.sin(a) * R]) };
  }, (s, t) => { const k = Math.min(rows - 1, Math.floor(t * rows + 1e-6)), f = t * rows - k; return inRect(rc, s, vs[k] + (vs[Math.min(rows, k + 1)] - vs[k]) * f); });
}
/** A printed sticker bridging the seam: { top, bottom } pieces. rect: its pixel rectangle; sheetW / sheetH of its sheet. */
export function stickerGeo(shape, r, rect, half = 12) {
  return memo(`sticker|${shape}|${r}|${rect.join()}|${half}`, () => {
    const rc = uvRect(rect), lip = shapeLip(shape);
    const T = new GeoS(1); T.push(scaleM(r));
    wrapPatch(T, shape, 'top', SEAL_A, half, [0.001, 0.12, 0.25, 0.37], [0.5, 0.66, 0.84, 1], rc, 0.007);
    const B = new GeoS(1); B.push(scaleM(r));
    const yb = [-0.001, -0.118, -0.15, -0.25, -0.34];
    wrapPatch(B, shape, 'bottom', SEAL_A, half, yb, [0.5, 0.34, 0.3, 0.14, 0], rc, 0.007, [lip * 1.06, lip * 1.06, profileAt(shape, 'bottom', -0.15) + 0.007, profileAt(shape, 'bottom', -0.25) + 0.007, profileAt(shape, 'bottom', -0.34) + 0.007]);
    return { top: done(T), bottom: done(B) };
  });
}
/** A small round sticker on the dome (the 当 mark), right of the seal. */
export function dotStickerGeo(shape, r, rect) {
  return memo(`dot|${shape}|${r}|${rect.join()}`, () => {
    const G = new GeoS(1); G.push(scaleM(r));
    wrapPatch(G, shape, 'top', SEAL_A - 34 * D2R, 8.5, [0.3, 0.38, 0.46, 0.55], [0, 0.33, 0.66, 1], uvRect(rect), 0.007);
    return done(G);
  });
}
/** Print on the front of a half (the daruma's face, the 福 on its belly): rows ys (units of r), half its half width in degrees. */
export function faceGeo(shape, r, part, rect, half, ys) {
  return memo(`face|${shape}|${r}|${part}|${rect.join()}`, () => {
    const G = new GeoS(1); G.push(scaleM(r));
    const lo = ys[0], hi = ys[ys.length - 1];
    wrapPatch(G, shape, part, SEAL_A, half, ys, ys.map((y) => (y - lo) / (hi - lo)), uvRect(rect), 0.006, null, 6);
    return done(G);
  });
}
/** A label wrapped all the way round a half between y0 and y1 (the can's), the art repeated `reps` times. */
export function labelBandGeo(shape, r, part, rect, y0, y1, reps = 2) {
  return memo(`lband|${shape}|${r}|${part}|${rect.join()}`, () => {
    const G = new GeoS(1), rc = uvRect(rect), N = 14 * reps, R0 = profileAt(shape, part, y0) + 0.006, R1 = profileAt(shape, part, y1) + 0.006;
    G.push(scaleM(r));
    for (let k = 0; k < N; k++) {
      const aA = SEAL_A + Math.PI / reps - (k / N) * Math.PI * 2, aB = SEAL_A + Math.PI / reps - ((k + 1) / N) * Math.PI * 2, per = N / reps, uA = (k % per) / per, uB = ((k % per) + 1) / per;
      const P = (a, y, R) => [Math.cos(a) * R, y, Math.sin(a) * R], Nn = (a) => [Math.cos(a), 0, Math.sin(a)];
      G.quadN(P(aA, y0, R0), P(aB, y0, R0), P(aB, y1, R1), P(aA, y1, R1), Nn(aA), Nn(aB), Nn(aB), Nn(aA), inRect(rc, uA, 0), inRect(rc, uB, 0), inRect(rc, uB, 1), inRect(rc, uA, 1));
    }
    return done(G);
  });
}
/** A wax seal pressed over the seam: { top, bottom } half-discs with the stamp's art from above. */
export function waxGeo(shape, r, rect) {
  return memo(`wax|${shape}|${r}|${rect.join()}`, () => {
    const rc = uvRect(rect), R0 = shapeLip(shape) * 1.058, rad = 0.24, yc = -0.035;
    const rings = [[0, 0.06], [0.3, 0.059], [0.55, 0.054], [0.75, 0.044], [0.9, 0.028], [1, 0.004]];
    const vtx = (rho, h, psi) => {
      const x = Math.cos(psi) * rho * rad, y = yc + Math.sin(psi) * rho * rad, a = SEAL_A - x / R0;
      // above the lip the dome is set back: the wax fills the step
      const rr = R0 + h;
      const out = [Math.cos(a), 0, Math.sin(a)], tilt = rho * 0.9;
      const n = nrm([out[0] * Math.cos(tilt) - Math.sin(a) * -Math.cos(psi) * Math.sin(tilt), Math.sin(psi) * Math.sin(tilt), out[2] * Math.cos(tilt) + Math.cos(a) * -Math.cos(psi) * Math.sin(tilt)]);
      return { p: [out[0] * rr, y, out[2] * rr], n, t: inRect(rc, 0.5 + Math.cos(psi) * rho * 0.453, 0.5 + Math.sin(psi) * rho * 0.453) };
    };
    const half = (psi0) => {
      const G = new GeoS(1); G.push(scaleM(r));
      const S = 16;
      for (let s = 0; s < S; s++) for (let k = 0; k + 1 < rings.length; k++) {
        const pA = psi0 + (s / S) * Math.PI, pB = psi0 + ((s + 1) / S) * Math.PI;
        const a = vtx(rings[k][0], rings[k][1], pA), b = vtx(rings[k + 1][0], rings[k + 1][1], pA), c = vtx(rings[k + 1][0], rings[k + 1][1], pB), d = vtx(rings[k][0], rings[k][1], pB);
        if (k > 0) G.triN(a.p, c.p, d.p, a.n, c.n, d.n, a.t, c.t, d.t);
        G.triN(a.p, b.p, c.p, a.n, b.n, c.n, a.t, b.t, c.t);
      }
      return done(G);
    };
    // seen from outside (+z), psi runs anticlockwise from the viewer's right: 0..180 is the upper half
    return { top: half(0), bottom: half(Math.PI) };
  });
}

/** Glitter set in the plastic of one half: flecks as little quads just inside the wall, each on one of 4 phases. */
export function glitterGeo(r, part, n = 22) {
  return memo(`glit|${r}|${part}|${n}`, () => {
    const G = new GeoS(1), rnd = seeded(part === 'top' ? 9 : 21), [X, Y] = SEALS.glitter;
    G.push(scaleM(r));
    for (let i = 0; i < n; i++) {
      const y = part === 'top' ? 0.1 + rnd() * 0.78 : -0.2 - rnd() * 0.6, a = rnd() * Math.PI * 2, rho = Math.sqrt(Math.max(0, 0.9 * 0.9 - y * y));
      const c = new THREE.Vector3(Math.cos(a) * rho, y, Math.sin(a) * rho), nn = c.clone().normalize();
      const t1 = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), t2 = new THREE.Vector3().crossVectors(nn, t1), rot = rnd() * 6, hs = 0.06 + rnd() * 0.035;
      const e1 = t1.clone().multiplyScalar(Math.cos(rot)).addScaledVector(t2, Math.sin(rot)).multiplyScalar(hs), e2 = new THREE.Vector3().crossVectors(nn, e1);
      const rc = uvRect([X + (i % 4) * 8, Y, 8, 8]), q = (sx, sy) => { const v = c.clone().addScaledVector(e1, sx).addScaledVector(e2, sy); return [v.x, v.y, v.z]; }, N = [nn.x, nn.y, nn.z];
      G.quadN(q(-1, -1), q(1, -1), q(1, 1), q(-1, 1), N, N, N, N, inRect(rc, 0, 0), inRect(rc, 1, 0), inRect(rc, 1, 1), inRect(rc, 0, 1));
    }
    return done(G);
  });
}
