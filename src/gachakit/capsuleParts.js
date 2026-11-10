// What is on and in a capsule besides its two shells (src/gachakit/capsuleShell.js), as shared low-poly geometry:
//  * the folded mini-book (cover out, line-up in), the bag of parts (faceted film, the parts cast in the series'
//    colours, a heat-seal strip), the foil inner wrap of the top tiers;
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
    const G = new Geo(1), rnd = seeded(77 + variant * 13), c = [1, 2, 0, 3].map((k) => swUV((k + variant) % 4));
    G.push(scaleM(r));
    const piece = (pos, rot, fn, uv) => { G.push(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1))); G.with(uv, 0, fn); G.pop(); };
    piece([-0.14, -0.5, 0.16], [0.3 + rnd(), rnd() * 2, 0.4], () => G.box(-0.2, -0.17, -0.15, 0.2, 0.17, 0.15, { bevel: 0.06 }), c[0]);
    piece([0.2, -0.46, 0.22], [rnd(), 0.6, rnd() * 2], () => G.lathe([[0, -0.13], [0.16, -0.13], [0.2, -0.06], [0.2, 0.06], [0.16, 0.13], [0, 0.13]], 8), c[1]);
    piece([0.02, -0.72, 0.1], [0.1, rnd(), 1.5 + rnd() * 0.2], () => G.lathe([[0, -0.045], [0.27, -0.045], [0.3, 0], [0.27, 0.045], [0, 0.045]], 10), c[2]);
    piece([0.1, -0.3, -0.02], [rnd(), rnd(), 0.9], () => G.box(-0.22, -0.045, -0.045, 0.22, 0.045, 0.045, { bevel: 0.02 }), c[3]);
    // the heat seal along the top of the bag, with its row of pressed ticks
    G.with(WHITE_UV, 0, () => G.box(-0.36, -0.12, 0.12, 0.36, -0.03, 0.135));
    return done(G);
  });
}
/** The parts bag: a faceted pillow of film (drawn with the clear coat: only its facets' reflections show). */
export function bagGeo(r) {
  return memo('bag' + r, () => {
    const G = new Geo(1), rnd = seeded(5);
    G.push(new THREE.Matrix4().compose(new THREE.Vector3(0.02 * r, -0.5 * r, 0.14 * r), new THREE.Quaternion(), new THREE.Vector3(r, r * 0.82, r * 0.8)));
    G.lathe([[0, -0.5], [0.3 + rnd() * 0.06, -0.4], [0.42, -0.12], [0.4 + rnd() * 0.05, 0.16], [0.3, 0.4], [0, 0.48]], 7, { a0: 0.3 });
    return done(G);
  });
}
/** The foil inner wrap: a crumpled ball sitting in the lower half. */
export function foilGeo(r) {
  return memo('foil' + r, () => {
    const G = new Geo(1), rnd = seeded(31), uv = shellSkin('plastic').sw.lite;
    G.push(new THREE.Matrix4().compose(new THREE.Vector3(0, -0.2 * r, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(r, r, r)));
    const j = () => 0.9 + rnd() * 0.2;
    G.with(uv, 0, () => G.lathe([[0, -0.62], [0.36 * j(), -0.5], [0.58 * j(), -0.22], [0.62 * j(), 0.1], [0.5 * j(), 0.4], [0.24 * j(), 0.58], [0, 0.6]], 9, { a0: 0.2 }));
    return done(G);
  });
}

// ----------------------------------------------------------------------------- the shrink band
export const BAND_N = 36, BAND_VERTS = 24, BAND_TAB = 6, RIBBON_N = 16, BAND_A0 = 62 * D2R;
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
    for (let m = 0; m <= RIBBON_N; m++) { const phi = (18 + m * 13) * D2R; col.push({ x, z, n: [Math.cos(phi), 0, Math.sin(phi)] }); x += Math.sin(phi) * len; z -= Math.cos(phi) * len; }
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
function wrapPatch(G, shape, part, aC, half, ys, vs, rc, off, RsOverride = null) {
  const rows = ys.length - 1;
  G.patch(3, rows, (s, t) => {
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
    wrapPatch(B, shape, 'bottom', SEAL_A, half, yb, [0.5, 0.34, 0.3, 0.14, 0], rc, 0.007, [lip * 1.047, lip * 1.047, profileAt(shape, 'bottom', -0.15) + 0.007, profileAt(shape, 'bottom', -0.25) + 0.007, profileAt(shape, 'bottom', -0.34) + 0.007]);
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
/** A wax seal pressed over the seam: { top, bottom } half-discs with the stamp's art from above. */
export function waxGeo(shape, r, rect) {
  return memo(`wax|${shape}|${r}|${rect.join()}`, () => {
    const rc = uvRect(rect), R0 = shapeLip(shape) * 1.046, rad = 0.24, yc = -0.035;
    const rings = [[0, 0.06], [0.5, 0.056], [0.82, 0.04], [1, 0.006]];
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
      const S = 7;
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
