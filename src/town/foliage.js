// The town's plants, built the way they grow: modelled trunks, limbs and twigs (smooth tapering sweeps with photo bark:
// the cherry's horizontal lenticel bands, the black pine's plates) carrying clumps of hand-pixelled sprig cards (the
// foliage sheet, src/town/leafSheet.js: kaname-mochi, azalea, black pine, somei-yoshino, maple, camellia, hydrangea,
// morning glory, bamboo, ivy, grass, pelargonium...) at the ends of the twigs and along the limbs, never one ball on a
// stick. Cards carry soft normals blended from their clump and the whole crown, so a tree shades as one form with a lit
// top and a shaded inside while its edge stays broken by single leaves. Cards are drawn without ink lines.
//   crown(t, x, y, z, rx, ry, rz, o)     an ellipsoid mass of cards. o: { kind, card, density, tint, core, flat (cut the
//                                        underside: -1..1), seed, mix: [kind, share], coreK, coreTint, tilt, dome }
//   hedge(t, x, y, z, ry, s, o)          a clipped kaname-mochi hedge 2 x 1 x 0.6 m (x s) in its kerb
//   niwaki(t, x, z, s, seed, o)          a cloud-pruned black pine: twisting plated trunk, kinked limbs, layered pads
//   sakura(t, x, z, s, seed, o)          a somei-yoshino in full bloom: short trunk, spreading scaffold limbs, twigs,
//                                        blossom clumps along and at the ends of the limbs, fallen petals
//   maple(t, x, z, s, seed, o)           a Japanese maple (o.red for a red one)
//   bamboo(t, x, z, o)                   a clump of culms with their leaf fans
//   creeper(t, x, z, ry, w, h, seed)     ivy up a wall;  vine(t, x, y0, y1, z, seed, o)  a climber up a string
//   shrub(t, x, y, z, r, kind, o)        a small rounded plant (pots, window boxes)
//   tuft(t, x, y, z, s, kind, seed)      a tuft of grass / weeds / fern on crossed cards
//   potted(t, x, y, z, o)                a real pot (terracotta, glazed, styrofoam box, bonsai tray, planter) with soil
//                                        and its plant; returns the soil height
//   limb(t, pts, radii, o)               a smooth tapering branch (bark sweep) through control points
//   SAKURA_SPOTS                         where the town's cherries stand (falling petals: src/plugins/petals.js)
import * as THREE from 'three';
import { hash2 } from '../core/util.js';
import { noInk } from '../gfx/sunMask.js';
import { photoTex, PHOTO_TEX } from '../kit/photoTex.js';
import { CELLS, ALIAS, cellUV, leafTexture } from './leafSheet.js';

export const SAKURA_SPOTS = [];

// ------------------------------------------------------------------------------------------------ materials
let M = null;
function mats() {
  if (M) return M;
  const leaf = noInk(new THREE.MeshStandardMaterial({ map: leafTexture(), vertexColors: true, roughness: 0.8, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide }));
  leaf.name = 'foliage';
  const core = noInk(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95 }));
  core.name = 'foliageCore';
  const photo = (name, rough, label) => {
    const e = PHOTO_TEX[name], r = 1 / (e?.metres || 1), m = new THREE.MeshStandardMaterial({ map: photoTex(name, { repeat: [r, r] }), vertexColors: true, roughness: rough });
    const c = new THREE.Color(e?.avg ?? 0x808080);
    m.userData.norm = [c.r, c.g, c.b];
    m.name = label;
    return m;
  };
  const paint = (rough, label) => { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough }); m.name = label; return m; };
  M = { leaf, core, cherry: photo('bark_cherry', 0.85, 'bark:cherry'), pine: photo('bark_pine', 0.92, 'bark:pine'), soil: photo('soil', 1, 'foliageSoil'),
    stem: paint(0.75, 'foliageStem'), pot: paint(0.88, 'foliagePot'), glaze: paint(0.35, 'foliageGlaze') };
  return M;
}
/** The town's own material for a part when there is one (fewer draw calls per batch); in a prop (t.m drops
 *  everything) the foliage kit's. */
const own = (t, name, fallback) => { const m = t.m?.[name]; return m && m.isMeshStandardMaterial && m.vertexColors ? m : fallback; };
const kindOf = (k) => (CELLS[k] ? k : ALIAS[k] && CELLS[ALIAS[k]] ? ALIAS[k] : 'small');
const cardSize = (k) => CELLS[kindOf(k)][2];
const coreOf = (k) => CELLS[kindOf(k)][3];
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp3 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const dark = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

// ------------------------------------------------------------------------------------------------ cards
/** Cards on a surface: sample(i, n) -> { p, nrm, h (0..1 height share for the light), normalAt? } | null. */
function cards(t, kind, n, sample, o) {
  const S = mats(), B = t.B, seed = o.seed ?? 1, tilt = o.tilt ?? 0.55;
  const kA = kindOf(kind), kB = o.mix ? kindOf(o.mix[0]) : null, share = o.mix?.[1] ?? 0;
  const size = o.card ?? cardSize(kA);
  const L = { [kA]: [[], [], [], []] };
  if (kB) L[kB] ||= [[], [], [], []];
  for (let i = 0; i < n; i++) {
    const s = sample(i, n);
    if (!s) continue;
    const h1 = hash2(i + seed * 131, 17), h2 = hash2(i, seed * 7 + 3), h3 = hash2(seed + i * 3, 29);
    // the card leans off the surface by up to `tilt`, turned about the normal
    const ref = Math.abs(s.nrm[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const ta = norm3(cross(ref, s.nrm)), tb = cross(s.nrm, ta), ang = s.ang ?? h1 * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
    const u0 = [ta[0] * ca + tb[0] * sa, ta[1] * ca + tb[1] * sa, ta[2] * ca + tb[2] * sa], v0 = cross(s.nrm, u0);
    const lean = s.lean ?? (h2 - 0.5) * 2 * tilt, cl = Math.cos(lean), sl = Math.sin(lean);
    const v = [v0[0] * cl + s.nrm[0] * sl, v0[1] * cl + s.nrm[1] * sl, v0[2] * cl + s.nrm[2] * sl];
    const sz = (s.size ?? size) * (0.85 + 0.3 * h3), hu = sz / 2, flip = h2 > 0.5;
    const k = s.kind ? kindOf(s.kind) : kB && hash2(i * 5 + seed, 41) < share ? kB : kA;
    const [a0, vf, a1, vt] = cellUV(k), uvq = flip ? [[a1, vf], [a0, vf], [a0, vt], [a1, vt]] : [[a0, vf], [a1, vf], [a1, vt], [a0, vt]];
    // the sprig's foot sits a little inside the surface, its tip out in the air
    const base = add(s.p, s.nrm, -sz * (s.sink ?? 0.18));
    const q = [[-hu, -hu * 0.1], [hu, -hu * 0.1], [hu, hu * 1.9], [-hu, hu * 1.9]].map(([a, b]) => [base[0] + u0[0] * a + v[0] * b, base[1] + u0[1] * a + v[1] * b, base[2] + u0[2] * a + v[2] * b]);
    const nq = q.map((p) => (s.normalAt && s.normalAt(p)) || s.nrm);
    const k0 = o.kmin ?? 0.62, kk = k0 + (1.08 - k0) * s.h;
    const [P, T, N, K] = (L[k] ||= [[], [], [], []]);
    for (const j of [0, 1, 2, 0, 2, 3]) { P.push(...q[j]); T.push(...uvq[j]); N.push(...nq[j]); K.push(kk * (j < 2 ? 0.86 : 1.05)); }
  }
  const tint = o.tint ?? 0xffffff;
  for (const [P, T, N, K] of Object.values(L)) if (P.length) B.tris(S.leaf, P, T, { tint, K }, N);
}

/** An ellipsoid leaf mass centred on (x, y, z) in the current batch frame. o.dome [cx, cy, cz, r, share]: blend the
 *  shading normals towards a bigger form (a whole tree crown) so clumps shade together. */
export function crown(t, x, y, z, rx, ry, rz, o = {}) {
  const kind = o.kind || 'kaname', S = mats(), size = o.card ?? cardSize(kind), flat = o.flat ?? -1.1;
  const p = 1.6, area = 4 * Math.PI * Math.pow((Math.pow(rx * ry, p) + Math.pow(rx * rz, p) + Math.pow(ry * rz, p)) / 3, 1 / p);
  const n = Math.max(o.min ?? 5, Math.round(area / (size * size) * (o.density ?? 2.4)));
  const seed = o.seed ?? Math.round(x * 17 + z * 31 + y * 7);
  const D = o.dome;
  const normalAt = (q) => {
    const a = norm3([(q[0] - x) / (rx * rx), (q[1] - y) / (ry * ry), (q[2] - z) / (rz * rz)]);
    if (!D) return a;
    const b = norm3([q[0] - D[0], (q[1] - D[1]) * 1.4, q[2] - D[2]]);
    return norm3(lerp3(a, b, D[4] ?? 0.6));
  };
  cards(t, kind, n, (i) => {
    const yy = 1 - 2 * (i + 0.5) / n;
    if (yy < flat) return null;
    const r = Math.sqrt(1 - yy * yy), ph = i * 2.39996 + seed, d = [Math.cos(ph) * r, yy, Math.sin(ph) * r];
    const sc = 0.9 + 0.12 * hash2(i, seed + 11), pt = [x + d[0] * rx * sc, y + Math.max(d[1], flat) * ry * sc, z + d[2] * rz * sc];
    const hh = D ? Math.max(0, Math.min(1, (pt[1] - (D[1] - D[3] * 0.7)) / (D[3] * 1.4))) : yy * 0.5 + 0.5;
    return { p: pt, nrm: norm3([(pt[0] - x) / (rx * rx), (pt[1] - y) / (ry * ry), (pt[2] - z) / (rz * rz)]), h: Math.max(0, Math.min(1, hh)), normalAt };
  }, { ...o, seed });
  const ck = o.coreK ?? 0.78;
  if (o.core !== false) t.B.blob(S.core, x, y - (flat > -1 ? ry * 0.1 : 0), z, rx * ck, ry * ck * (flat > -1 ? 0.8 : 1), rz * ck, { tint: o.coreTint ?? coreOf(kind), jitter: 0.08, lo: 0.6, hi: 1.05, seed });
}

// ------------------------------------------------------------------------------------------------ limbs
const cr = (p0, p1, p2, p3, u) => {
  const u2 = u * u, u3 = u2 * u;
  return [0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * u3));
};
/**
 * A smooth tapering branch through control points (Catmull-Rom), radius per control point (or [r0, r1] tapered by
 * length), parallel-transported rings so it never twists. o: { bark 'cherry' | 'pine' | material, tint, sides, seg,
 * flare (root buttresses at the foot: amount), lobes, cap }. Bark uvs run in metres (v along the limb).
 */
export function limb(t, pts, radii, o = {}) {
  if (o.gnarl) {
    // a grown branch is never straight: a kink between every pair of control points, sideways to the run
    const q = [pts[0]], R = radii.length === pts.length ? [radii[0]] : null;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], d = sub(b, a), L = Math.hypot(...d), side = norm3(cross(d, [0, 1, 0])), h1 = hash2(i * 7 + (o.gseed || 0), 3) - 0.5, h2 = hash2(i * 3, 11 + (o.gseed || 0)) - 0.5;
      q.push(add(add(lerp3(a, b, 0.5), side, h1 * o.gnarl * L), [0, 1, 0], h2 * o.gnarl * L * 0.6), b);
      if (R) R.push((radii[i - 1] + radii[i]) / 2, radii[i]);
    }
    pts = q; if (R) radii = R;
  }
  const S = mats(), mat = o.mat || S[o.bark || 'cherry'] || S.cherry, n = pts.length, seg = o.seg ?? 3;
  const C = [], F = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < seg; k++) { C.push(cr(p0, p1, p2, p3, k / seg)); F.push(i + k / seg); }
  }
  C.push(pts[n - 1]); F.push(n - 1);
  const Ls = [0];
  for (let i = 1; i < C.length; i++) Ls.push(Ls[i - 1] + Math.hypot(...sub(C[i], C[i - 1])));
  const tot = Ls[Ls.length - 1] || 1;
  const rad = (i) => (radii.length === n ? radii[Math.floor(F[i])] + ((radii[Math.min(n - 1, Math.floor(F[i]) + 1)] - radii[Math.floor(F[i])]) * (F[i] % 1)) : radii[0] + (radii[1] - radii[0]) * Math.pow(Ls[i] / tot, 0.85));
  const r0 = rad(0), sides = o.sides ?? (r0 > 0.1 ? 14 : r0 > 0.05 ? 10 : r0 > 0.02 ? 7 : 5);
  let tan = norm3(sub(C[1], C[0])), nr = norm3(cross(tan, Math.abs(tan[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0]));
  const rings = [];
  for (let i = 0; i < C.length; i++) {
    const tn = norm3(sub(C[Math.min(C.length - 1, i + 1)], C[Math.max(0, i - 1)]));
    nr = norm3(add(nr, tn, -dot(nr, tn))); tan = tn;
    const bn = cross(tan, nr), r = rad(i), ring = [];
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2, d = [nr[0] * Math.cos(a) + bn[0] * Math.sin(a), nr[1] * Math.cos(a) + bn[1] * Math.sin(a), nr[2] * Math.cos(a) + bn[2] * Math.sin(a)];
      let rr = r;
      if (o.flare) rr *= 1 + o.flare * Math.exp(-Ls[i] / 0.3) * (0.55 + 0.45 * Math.cos((o.lobes || 4) * a + (o.phase || 0)));
      if (o.ribs) rr *= 1 - o.ribs[1] * (0.5 - 0.5 * Math.cos(o.ribs[0] * a));
      ring.push([add(C[i], d, rr), d, (s / sides) * Math.PI * 2 * Math.max(r, 0.015)]);
    }
    rings.push(ring);
  }
  const P = [], T = [], N = [];
  for (let i = 0; i + 1 < rings.length; i++) for (let s = 0; s < sides; s++) {
    const a = rings[i][s], b = rings[i][s + 1], c = rings[i + 1][s + 1], d = rings[i + 1][s];
    for (const [q, v] of [[a, Ls[i]], [b, Ls[i]], [c, Ls[i + 1]], [a, Ls[i]], [c, Ls[i + 1]], [d, Ls[i + 1]]]) { P.push(...q[0]); N.push(...q[1]); T.push(q[2], v); }
  }
  if (o.cap) { const e = rings[rings.length - 1], tip = C[C.length - 1]; for (let s = 0; s < sides; s++) { P.push(...e[s][0], ...e[s + 1][0], ...tip); N.push(...tan, ...tan, ...tan); T.push(0, 0, 0.05, 0, 0.02, 0.05); } }
  t.B.tris(mat, P, T, { tint: o.tint }, N);
  return C;
}
/** A point a share f along a polyline (by control points, linear). */
function along(pts, f) {
  const n = pts.length - 1, x = Math.min(n - 1e-6, Math.max(0, f * n)), i = Math.floor(x);
  return lerp3(pts[i], pts[i + 1], x - i);
}

// ------------------------------------------------------------------------------------------------ the cherry
// 染井吉野, from reference: a short trunk forking at 1.5 m into four or five scaffold limbs that climb at about 45
// degrees and then spread almost level, the crown wider than tall (6 m across at s = 1). Two hand-drawn frames;
// the secondaries, twigs and blossom follow the way the tree grows (alternate, outward, the tips turned up).
const SAKURA = [
  { trunk: [[0, 0, 0], [0.05, 0.55, 0.02], [0.0, 1.1, 0.05], [0.06, 1.55, 0.03]], r: [0.2, 0.16, 0.15, 0.14],
    limbs: [[[0.06, 1.45, 0.03], [0.55, 2.15, 0.25], [1.4, 2.8, 0.55], [2.35, 3.1, 0.8], [2.95, 3.0, 1.0]],
      [[0.04, 1.5, 0.03], [-0.4, 2.3, 0.35], [-1.15, 3.0, 0.65], [-2.1, 3.35, 0.95], [-2.75, 3.2, 1.1]],
      [[0.06, 1.5, 0.0], [0.15, 2.35, -0.5], [0.35, 3.15, -1.3], [0.55, 3.6, -2.2], [0.65, 3.5, -2.8]],
      [[0.06, 1.55, 0.03], [0.05, 2.5, 0.15], [-0.05, 3.4, 0.35], [-0.2, 4.1, 0.5]],
      [[0.02, 1.15, 0.03], [-0.55, 1.6, -0.35], [-1.45, 2.15, -0.95], [-2.35, 2.4, -1.45], [-2.9, 2.25, -1.7]]] },
  { trunk: [[0, 0, 0], [-0.04, 0.6, 0.03], [0.04, 1.2, 0.0], [0.0, 1.7, 0.04]], r: [0.19, 0.15, 0.14, 0.13],
    limbs: [[[0.0, 1.6, 0.04], [0.65, 2.3, -0.1], [1.6, 2.95, -0.3], [2.5, 3.2, -0.45], [3.0, 3.05, -0.5]],
      [[0.0, 1.65, 0.04], [-0.5, 2.4, -0.2], [-1.4, 3.1, -0.55], [-2.3, 3.4, -0.9], [-2.8, 3.25, -1.0]],
      [[0.0, 1.6, 0.04], [0.2, 2.4, 0.6], [0.5, 3.2, 1.4], [0.8, 3.55, 2.3], [0.9, 3.45, 2.8]],
      [[0.0, 1.7, 0.04], [-0.1, 2.6, -0.1], [0.05, 3.5, -0.4], [0.2, 4.15, -0.55]],
      [[0.03, 1.25, 0.02], [0.55, 1.75, 0.4], [1.4, 2.25, 1.0], [2.2, 2.45, 1.5], [2.7, 2.3, 1.8]]] },
];
/** A somei-yoshino in full bloom. o: { dir (radians, the side it leans towards), bias (0..1: limbs against dir are
 *  cut back, a tree beside a wall), petals (fallen petals, default true) }. */
export function sakura(t, x, z, s = 1, seed = 1, o = {}) {
  const def = SAKURA[seed % 2], rot = o.rot ?? seed * 1.9, cR = Math.cos(rot), sR = Math.sin(rot), hs = o.hs ?? 1;
  const dir = o.dir, bias = o.bias ?? 0;
  const W = (p) => {
    let px = (p[0] * cR - p[2] * sR) * hs, pz = (p[0] * sR + p[2] * cR) * hs;
    if (dir != null && bias) { const h = Math.hypot(px, pz); if (h > 0.01) { const c = (px * Math.cos(dir) + pz * Math.sin(dir)) / h, k = c < 0 ? 1 - bias * -c : 1; px *= k; pz *= k; } }
    return [x + px * s, p[1] * s, z + pz * s];
  };
  // everything grown off the limbs is pulled in on the cut-back side too
  const pull = (p) => {
    if (dir == null || !bias) return p;
    const dx = p[0] - x, dz = p[2] - z, h = Math.hypot(dx, dz);
    if (h < 0.01) return p;
    const c = (dx * Math.cos(dir) + dz * Math.sin(dir)) / h, k = c < 0 ? 1 - bias * -c * 0.8 : 1;
    return [x + dx * k, p[1], z + dz * k];
  };
  const tint = 0xffffff;
  limb(t, def.trunk.map(W), def.r.map((r) => r * s), { bark: 'cherry', flare: 0.45, lobes: 5, phase: seed, seg: 3, tint });
  const dome = [x, 3.0 * s, z, 3.0 * s * hs, 0.55];
  const clumps = [];
  def.limbs.forEach((L, li) => {
    const pts = L.map(W), lead = li === 3;
    limb(t, pts, [0.12 * s, 0.095 * s, 0.065 * s, 0.04 * s, 0.018 * s].slice(-pts.length), { bark: 'cherry', tint, gnarl: 0.18, gseed: seed * 5 + li, seg: 2, cap: true });
    clumps.push([pts[pts.length - 1], 0.55]);
    // secondaries: alternate sides along the limb, outward and a little up, drooping at the tips
    for (const [f, side] of [[0.38, 1], [0.55, -1], [0.72, 1], [0.86, -1]]) {
      const a = along(pts, f), b = along(pts, Math.min(1, f + 0.08)), d = norm3([b[0] - a[0], 0, b[2] - a[2]]), sd = side * (lead ? 1.4 : 0.85) + hash2(li, f * 10 + seed) * 0.3;
      const h = [d[0] * Math.cos(sd) - d[2] * Math.sin(sd), 0, d[0] * Math.sin(sd) + d[2] * Math.cos(sd)], len = (1.5 - f * 0.6) * s;
      const e1 = pull([a[0] + h[0] * len * 0.5, a[1] + 0.35 * s, a[2] + h[2] * len * 0.5]), e2 = pull([a[0] + h[0] * len, a[1] + (0.3 - f * 0.3) * s, a[2] + h[2] * len]);
      limb(t, [a, e1, e2], [0.04 * s, 0.01 * s], { bark: 'cherry', tint, seg: 2, gnarl: 0.22, gseed: li * 13 + Math.round(f * 100), cap: true });
      clumps.push([e2, 0.5], [e1, 0.42]);
      // twigs off the secondary's end: a little fan, tips up
      for (const tw of [-0.7, 0, 0.7]) {
        const g = pull([e2[0] + (h[0] * Math.cos(tw) - h[2] * Math.sin(tw)) * 0.5 * s, e2[1] + 0.22 * s, e2[2] + (h[0] * Math.sin(tw) + h[2] * Math.cos(tw)) * 0.5 * s]);
        limb(t, [e2, g], [0.012 * s, 0.004 * s], { bark: 'cherry', tint, seg: 1, sides: 4 });
        clumps.push([g, 0.4]);
      }
    }
  });
  // the blossom: clumps of sprig cards at the twig ends and along the limbs, shaded as one dome
  clumps.forEach(([p, r], i) => crown(t, p[0], p[1] + 0.12 * s, p[2], r * 1.25 * s * Math.max(0.6, hs), r * 0.8 * s, r * 1.25 * s * Math.max(0.6, hs), { kind: 'blossom', mix: ['blossom2', 0.45], density: 2.2, tilt: 0.8, core: false, seed: seed * 97 + i * 13, dome, min: 8, kmin: 0.78 }));
  // fallen petals on the ground under the crown
  if (o.petals !== false) {
    const S = mats(), P = [], T = [], N = [];
    for (let i = 0; i < 18; i++) {
      const a = i * 2.39996 + seed, r = (0.5 + 2.4 * Math.sqrt((i + 0.5) / 18)) * s * hs, cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r, h = 0.3 + 0.3 * hash2(i, seed);
      const [u0, vf, u1, vt] = cellUV('petals'), ra = a * 3, c = Math.cos(ra) * h, sn = Math.sin(ra) * h;
      const q = [[-c + sn, -sn - c], [c + sn, sn - c], [c - sn, sn + c], [-c - sn, -sn + c]].map(([dx, dz]) => [cx + dx, 0.012 + i * 0.0004, cz + dz]);
      for (const [j, uv] of [[0, [u0, vf]], [1, [u1, vf]], [2, [u1, vt]], [0, [u0, vf]], [2, [u1, vt]], [3, [u0, vt]]]) { P.push(...q[j]); T.push(...uv); N.push(0, 1, 0); }
    }
    t.B.tris(S.leaf, P, T, {}, N);
  }
  if (t.game) { const w = t.B.world(x, 0, z); SAKURA_SPOTS.push({ x: w.x, z: w.z, y0: 2.0 * s, y1: 3.8 * s, r: 2.6 * s }); }
}

// ------------------------------------------------------------------------------------------------ the black pine
// 仕立て松: the trunk twists up in an S, the limbs are trained down and out from it in a kink, and each ends in a
// flat cloud of needles: a level top of tufts seen from above, a rim of tufts on edge, spring candles standing up.
const NIWAKI = [
  { trunk: [[0, 0, 0], [0.18, 0.55, 0.05], [-0.05, 1.05, 0.02], [0.16, 1.6, -0.06], [0.02, 2.15, 0], [0.06, 2.45, 0.02]], r: [0.13, 0.11, 0.095, 0.08, 0.06, 0.045],
    pads: [[0.18, 0.6, 0.95, 0.8, 0.5], [-0.05, 1.05, -0.85, 1.1, 0.46], [0.15, 1.5, 0.8, 1.55, 0.4], [-0.02, 1.85, -0.65, 1.95, 0.36], [0.04, 2.3, 0.15, 2.5, 0.42], [0.1, 1.2, 0.2, 1.25, 0.32, 0.62]] },
  { trunk: [[0, 0, 0], [-0.15, 0.5, 0.04], [0.1, 1.0, 0.0], [-0.12, 1.55, 0.05], [0.04, 2.05, 0], [0.0, 2.4, 0.0]], r: [0.14, 0.115, 0.1, 0.08, 0.06, 0.045],
    pads: [[-0.15, 0.5, -0.9, 0.75, 0.48], [0.1, 1.0, 0.95, 1.05, 0.5], [-0.1, 1.45, -0.8, 1.6, 0.42], [0.02, 1.8, 0.7, 1.95, 0.36], [0.0, 2.25, -0.1, 2.45, 0.44], [-0.05, 1.25, 0.1, 1.3, 0.3, -0.58]] },
];
/** A cloud-pruned black pine. o: { rot } */
export function niwaki(t, x, z, s = 1, seed = 1, o = {}) {
  const def = NIWAKI[seed % 2], rot = o.rot ?? seed * 1.7, cR = Math.cos(rot), sR = Math.sin(rot);
  const W = (dx, y, dz) => [x + (dx * cR - dz * sR) * s, y * s, z + (dx * sR + dz * cR) * s];
  const tint = o.tint ?? 0xffffff;
  limb(t, def.trunk.map((p) => W(...p)), def.r.map((r) => r * s), { bark: 'pine', flare: 0.35, lobes: 3, phase: seed, tint, gnarl: 0.12, gseed: seed, seg: 2 });
  def.pads.forEach(([tx, ty, px, py, pr, side], i) => {
    // the limb: from the trunk out level, kinked down, then up into the pad's heart
    const from = W(tx, ty, 0), sideZ = side ?? 0, end = W(px, py - pr * 0.12, sideZ);
    if (Math.hypot(px - tx, sideZ) > 0.15) {
      const k1 = W(tx + (px - tx) * 0.35, ty + 0.05, sideZ * 0.35), k2 = W(tx + (px - tx) * 0.7, Math.min(ty, py) - 0.08, sideZ * 0.7);
      limb(t, [from, k1, k2, end], [0.05 * s, 0.025 * s], { bark: 'pine', tint, seg: 2 });
    }
    pad(t, ...W(px, py, sideZ), pr * s, seed * 31 + i * 7);
  });
}
/** A needle pad: a domed cloud of tufts seen from above, two rows of tufts on edge round its rim (candles standing up
 *  out of the top row), a dark mass inside so it never looks hollow. */
function pad(t, x, y, z, r, seed) {
  const S = mats(), th = r * 0.48, rz = r * 0.86, lob = (a) => 0.86 + 0.14 * Math.cos(3 * a + seed) * Math.cos(2 * a - seed * 0.7);
  t.B.blob(S.core, x, y - th * 0.05, z, r * 0.76, th * 0.66, rz * 0.76, { tint: 0x2e4a34, jitter: 0.18, lo: 0.66, hi: 1.0, seed });
  const dome = (d) => th * (0.6 - 0.55 * d * d);
  const normalAt = (q) => norm3([(q[0] - x) / (r * r), (q[1] - y + th * 0.4) / (th * th * 1.6), (q[2] - z) / (rz * rz)]);
  const sz = 0.3 * Math.max(0.55, r / 0.45);
  const nT = Math.max(5, Math.round(r * r * 30));
  cards(t, 'pineTop', nT, (i) => {
    const a = i * 2.39996 + seed, f = Math.sqrt((i + 0.5) / nT) * 0.86 * lob(a), p = [x + Math.cos(a) * f * r, y + dome(f), z + Math.sin(a) * f * rz];
    const nrm = norm3([Math.cos(a) * f * 0.9, 1, Math.sin(a) * f * 0.9]);
    return { p, nrm, h: 0.9 + 0.1 * (1 - f), lean: (hash2(i, seed) - 0.5) * 0.4, sink: 0.12, normalAt, size: sz };
  }, { seed });
  for (const [row, yy, out, up, share] of [[0, 0.05, 0.86, 0.5, 0.3], [1, -0.32, 0.8, -0.2, 0]]) {
    const nR = Math.max(6, Math.round(r * (row ? 18 : 26)));
    cards(t, 'pine', nR, (i) => {
      const a = (i / nR) * Math.PI * 2 + seed + row * 0.4, L = lob(a), p = [x + Math.cos(a) * r * out * L, y + th * yy + (i % 2) * th * 0.12, z + Math.sin(a) * rz * out * L];
      return { p, nrm: norm3([Math.cos(a), up, Math.sin(a)]), h: row ? 0.35 : 0.65, normalAt, ang: (i % 3 - 1) * 0.3, lean: row ? -0.2 : 0.3, sink: 0.35, size: sz * (row ? 1.0 : 1.15) };
    }, { seed: seed + 3 + row, mix: share ? ['candle', share] : null });
  }
}

// ------------------------------------------------------------------------------------------------ maple, bamboo
/** いろはもみじ: a slender multi-stemmed maple, layered sprays of palmate leaves. o: { red } */
export function maple(t, x, z, s = 1, seed = 1, o = {}) {
  const rot = o.rot ?? seed * 2.3, cR = Math.cos(rot), sR = Math.sin(rot), W = (dx, y, dz) => [x + (dx * cR - dz * sR) * s, y * s, z + (dx * sR + dz * cR) * s];
  const kind = o.red ? 'mapleRed' : 'maple', bark = 0xa09090;
  limb(t, [W(0, 0, 0), W(0.05, 0.6, 0), W(-0.02, 1.1, 0.03)], [0.09 * s, 0.07 * s], { bark: 'cherry', flare: 0.3, tint: bark });
  const tips = [[1.0, 1.9, 0.3], [-0.9, 2.1, -0.2], [0.2, 2.5, -0.8], [-0.3, 2.3, 0.9], [0.5, 2.7, 0.4]];
  const dome = [...W(0, 2.0, 0), 1.3 * s, 0.5];
  tips.forEach(([dx, y, dz], i) => {
    const a = W(-0.02, 1.0 + i * 0.05, 0.03), m = W(dx * 0.5, (1.1 + y) / 2 + 0.15, dz * 0.5), e = W(dx, y, dz);
    limb(t, [a, m, e], [0.045 * s, 0.01 * s], { bark: 'cherry', tint: bark, seg: 2 });
    // layered sprays: level clumps along the branch and at its end
    for (const [p, r] of [[e, 0.55], [m, 0.42]]) crown(t, p[0], p[1] + 0.05 * s, p[2], r * s, r * 0.45 * s, r * s, { kind, density: 2.6, tilt: 0.5, core: false, seed: seed * 17 + i * 5 + Math.round(r * 10), dome, flat: -0.5 });
  });
}
/** A clump of bamboo: culms (nodes, a bloom of white below each node) fanning slightly, leaf fans from the upper half.
 *  o: { n (culms), h (height), r (spread), seed } */
export function bamboo(t, x, z, o = {}) {
  const S = { stem: own(t, 'pv', mats().stem) }, n = o.n ?? 7, H = o.h ?? 3.2, R = o.r ?? 0.3, seed = o.seed ?? 3;
  for (let c = 0; c < n; c++) {
    const a = c * 2.39996 + seed, d = R * Math.sqrt((c + 0.5) / n), bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
    const h = H * (0.75 + 0.25 * hash2(c, seed)), lean = 0.08 + 0.1 * hash2(seed, c), lx = Math.cos(a) * lean * h, lz = Math.sin(a) * lean * h;
    const pts = [[bx, 0, bz], [bx + lx * 0.2, h * 0.4, bz + lz * 0.2], [bx + lx * 0.6, h * 0.8, bz + lz * 0.6], [bx + lx, h, bz + lz]];
    const r0 = 0.02 + 0.012 * hash2(c, 7), green = c % 3 ? 0x7a9a50 : 0x8aa45a;
    limb(t, pts, [r0, r0 * 0.4], { mat: S.stem, tint: green, sides: 8, cap: true });
    // the nodes: a slight swelling ring every 25-30 cm
    for (let y = 0.28; y < h * 0.95; y += 0.27) {
      const f = y / h, p = along(pts, f), q = along(pts, f + 0.01), rr = (r0 + (r0 * 0.4 - r0) * f) * 1.12;
      limb(t, [add(p, norm3(sub(q, p)), -0.008), add(p, norm3(sub(q, p)), 0.008)], [rr, rr], { mat: S.stem, tint: dark(green, 0.82), sides: 8, seg: 1 });
    }
    // leaf fans from twigs on the upper culm
    for (let k = 0; k < 5; k++) {
      const f = 0.5 + k * 0.1, p = along(pts, f), aa = a + k * 2.1;
      crown(t, p[0] + Math.cos(aa) * 0.25, p[1] + 0.1, p[2] + Math.sin(aa) * 0.25, 0.32, 0.22, 0.32, { kind: 'bamboo', density: 1.8, tilt: 0.9, core: false, seed: seed * 13 + c * 7 + k, min: 4 });
    }
  }
}

// ------------------------------------------------------------------------------------------------ hedges, walls, vines
/** A clipped hedge (2 x 1 x 0.6 m before `s`) on a low concrete kerb, its foot at (x, y, z), turned ry. */
export function hedge(t, x, y, z, ry = 0, s = 1, o = {}) {
  const B = t.B, m = t.m, S = mats(), seed = o.seed ?? Math.round(x * 13 + z * 7);
  B.push(x, y, z, ry);
  const W = 2 * s, D = 0.6 * s, hk = 0.09 * s;
  B.box(m.concrete, W, hk, D, 0, 0, 0, { tint: 0xb4b0a6, bevel: 0.012 * s });
  B.box(m.dirt, W - 0.08 * s, 0.012, D - 0.08 * s, 0, hk, 0, { tint: 0x5a4632 });
  // the clipped mass: a rounded box (radius rr) from the kerb to 1 m; cards set in rows over every face
  const hx = 0.96 * s, hz = 0.27 * s, y0 = hk + 0.04 * s, y1 = 1.0 * s, rr = 0.11 * s, cy = (y0 + y1) / 2, hy = (y1 - y0) / 2;
  const ix = hx - rr, iy = hy - rr, iz = hz - rr, cl = (v, a) => Math.max(-a, Math.min(a, v));
  const onBox = (q) => { const c = [cl(q[0], ix), cl(q[1] - cy, iy), cl(q[2], iz)], d = [q[0] - c[0], q[1] - cy - c[1], q[2] - c[2]], l = Math.hypot(...d); if (l < 1e-6) return null; const nn = [d[0] / l, d[1] / l, d[2] / l]; return { p: [c[0] + nn[0] * rr, cy + c[1] + nn[1] * rr, c[2] + nn[2] * rr], nrm: nn }; };
  const pts = [], step = (o.card ?? 0.3) * s * 0.4;
  const face = (ax, sign, ua, va, ul, vl) => {
    const nu = Math.max(1, Math.round(ul * 2 / step)), nv = Math.max(1, Math.round(vl * 2 / step));
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const q = [0, cy, 0], hh = hash2(i * 31 + ax * 7 + (sign > 0 ? 1 : 0), j * 17 + seed);
      q[ax] = (ax === 1 ? cy : 0) + sign * (ax === 0 ? hx : ax === 1 ? hy : hz) * 1.6;
      q[ua] = (ua === 1 ? cy : 0) + (-ul + (i + 0.5 + (hh - 0.5) * 0.7) * (2 * ul / nu));
      q[va] = (va === 1 ? cy : 0) + (-vl + (j + 0.5 + (hash2(j * 13, i * 7 + seed) - 0.5) * 0.7) * (2 * vl / nv));
      pts.push(q);
    }
  };
  face(2, 1, 0, 1, hx, hy); face(2, -1, 0, 1, hx, hy); face(1, 1, 0, 2, hx, hz); face(0, 1, 2, 1, hz, hy); face(0, -1, 2, 1, hz, hy);
  // shading normals from a much rounder box, so the faces turn softly into each other like a real clipped hedge
  const sx2 = Math.max(0, hx - 0.4 * s), sy2 = Math.max(0, hy - 0.3 * s), normalAt = (q) => { const d = [q[0] - cl(q[0], sx2), q[1] - cy - cl(q[1] - cy, sy2), q[2]]; return Math.hypot(...d) > 1e-4 ? norm3(d) : null; };
  cards(t, o.kind || 'kaname', pts.length, (i) => {
    const q = pts[i], r = onBox([cl(q[0], hx), cl(q[1] - cy, hy) + cy, cl(q[2], hz)]);
    if (!r) return null;
    return { p: r.p, nrm: r.nrm, h: Math.max(0, Math.min(1, (r.p[1] - y0) / (y1 - y0))) * 0.8 + (r.nrm[1] > 0.5 ? 0.2 : 0), normalAt, sink: 0.3 };
  }, { card: (o.card ?? 0.3) * s, tilt: 0.35, seed, mix: o.mix ?? ['kanameRed', 0.35], tint: o.tint });
  B.box(S.core, 2 * hx - 0.06 * s, y1 - y0 - 0.05 * s, 2 * hz - 0.06 * s, 0, y0, 0, { tint: coreOf('kaname'), bevel: 0.06 * s });
  // the bare stems at the foot, where the shears never reach
  for (let k = 0; k < 7; k++) for (const sz of [-1, 1]) limb(t, [[(-0.85 + k * 0.28) * s, hk, sz * 0.12 * s], [(-0.84 + k * 0.28) * s, y0 + 0.07 * s, sz * 0.15 * s], [(-0.83 + k * 0.28) * s, y0 + 0.14 * s, sz * 0.18 * s]], [0.014 * s, 0.01 * s], { bark: 'cherry', sides: 5, seg: 1, tint: 0x8a7a6a });
  B.pop();
}

/** Ivy on a wall: the wall face is local z = 0 at (x, z) turned ry (local +z out of the wall); a patch w wide at the
 *  foot thinning to tendrils h up, cards lying close to the wall, its woody stems showing at the foot. */
export function creeper(t, x, z, ry, w, h, seed = 1) {
  const B = t.B;
  B.push(x, 0, z, ry);
  for (let k = 0; k < 4; k++) { const sx = (k - 1.5) * w * 0.18; limb(t, [[sx, 0, 0.02], [sx + 0.05 * Math.sin(k + seed), h * 0.25, 0.025], [sx - 0.04, h * 0.5, 0.02]], [0.014, 0.005], { bark: 'cherry', sides: 5, seg: 2, tint: 0x8a7868 }); }
  const pts = [], st = 0.08;
  for (let y = 0.05; y < h; y += st) {
    const f = y / h, half = (w / 2) * (1 - Math.pow(f, 0.8)) + 0.12 * Math.sin(f * 9 + seed), off = 0.25 * w * Math.sin(f * 3.1 + seed * 2);
    for (let u = -half; u <= half; u += st) pts.push([u + off + (hash2(Math.round(u * 50), Math.round(y * 50) + seed) - 0.5) * st, y, 0.03]);
  }
  const normalAt = (q) => norm3([q[0] * 0.25 / w, 0.2, 1]);
  cards(t, 'ivy', pts.length, (i) => ({ p: pts[i], nrm: [0, 0, 1], h: 0.4 + 0.6 * (pts[i][1] / h), normalAt }), { card: 0.26, tilt: 0.3, seed });
  B.pop();
}

/** A climber trained up a string from (x, y0) to (x, y1) at depth z (local frame, the wall behind it at lower z):
 *  its twining stem, leaves on short stalks either side, facing out. o: { kind, card, tint } */
export function vine(t, x, y0, y1, z, seed = 1, o = {}) {
  const S = { stem: own(t, 'pv', mats().stem) }, pts = [], stem = [];
  for (let y = y0, i = 0; y < y1; y += 0.075, i++) { const sd = i % 2 ? 1 : -1, w = 0.06 + 0.05 * hash2(i, seed); pts.push([x + sd * w, y, z + 0.02 + 0.03 * hash2(seed, i)]); }
  for (let y = y0; y <= y1; y += 0.15) stem.push([x + 0.012 * Math.sin(y * 21 + seed), y, z + 0.012 * Math.cos(y * 21 + seed)]);
  if (stem.length > 1) limb(t, stem, [0.005, 0.003], { mat: S.stem, tint: 0x5a7a3a, sides: 4, seg: 1 });
  const normalAt = (q) => norm3([(q[0] - x) * 3, 0.15, 1]);
  cards(t, o.kind || 'asagao', pts.length, (i) => ({ p: pts[i], nrm: [0, 0, 1], h: 0.45 + 0.55 * ((pts[i][1] - y0) / (y1 - y0)), normalAt }), { card: o.card ?? 0.24, tilt: 0.5, seed, tint: o.tint });
}

/** A small rounded plant (a pot's, a window box's): r its radius, kind its sprig. */
export function shrub(t, x, y, z, r, kind = 'small', o = {}) {
  crown(t, x, y + r * 0.7, z, r, r * 0.85, r, { kind, flat: -0.5, card: Math.max(0.1, Math.min(cardSize(kind), r * 0.95)), density: 2.4, coreK: 0.6, ...o });
}

/** A tuft on crossed cards (grass, weeds, fern, moss), its foot at (x, y, z), s metres tall. */
export function tuft(t, x, y, z, s = 0.35, kind = 'grass', seed = 1) {
  const S = mats(), [u0, vf, u1, vt] = cellUV(kind), P = [], T = [], N = [], K = [];
  const n = 3, a0 = hash2(seed, 5) * Math.PI;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * Math.PI, c = Math.cos(a) * s / 2, sn = Math.sin(a) * s / 2, lean = (hash2(seed, k) - 0.5) * 0.15 * s;
    const q = [[x - c, y, z - sn], [x + c, y, z + sn], [x + c + lean, y + s, z + sn], [x - c + lean, y + s, z - sn]];
    const nr = norm3([-Math.sin(a) * 0.35, 1, Math.cos(a) * 0.35]);
    for (const [j, uv] of [[0, [u0, vf]], [1, [u1, vf]], [2, [u1, vt]], [0, [u0, vf]], [2, [u1, vt]], [3, [u0, vt]]]) { P.push(...q[j]); T.push(...uv); N.push(...nr); K.push(j < 2 ? 0.7 : 1.05); }
  }
  t.B.tris(S.leaf, P, T, { K }, N);
}

/** One sprig card: its foot at p, growing along `up`, its face towards `nrm` (both unit vectors), `size` metres. */
export function card(t, kind, p, up, nrm, size, o = {}) {
  const S = mats(), [u0, vf, u1, vt] = cellUV(kind), side = norm3(cross(up, nrm)), h = size / 2;
  const q = [add(p, side, -h), add(p, side, h), add(add(p, side, h), up, size), add(add(p, side, -h), up, size)];
  const P = [], T = [], N = [], K = [];
  for (const [j, uv] of [[0, [u0, vf]], [1, [u1, vf]], [2, [u1, vt]], [0, [u0, vf]], [2, [u1, vt]], [3, [u0, vt]]]) { P.push(...q[j]); T.push(...uv); N.push(...(o.normal || nrm)); K.push(j < 2 ? 0.85 : 1.05); }
  t.B.tris(S.leaf, P, T, { K, tint: o.tint }, N);
}

// ------------------------------------------------------------------------------------------------ pots
const POT_COL = { terra: 0xb8673e, glazed: 0x2f5a7a, styro: 0xeceae2, bonsai: 0x5a4a6a, planter: 0x8a5a3a, plastic: 0x4a7a4a };
/**
 * A pot with soil and its plant, its foot at (x, y, z). o: { pot 'terra' | 'glazed' | 'styro' | 'bonsai' | 'planter',
 * r (radius, or half-width), h (height), d (half-depth for box pots), col, plant: 'pelargonium' | 'azalea' | 'small' |
 * 'aloe' | 'asagao' | 'pine' | 'maple' | 'camellia' | 'fern' | 'pothos' | 'sprout' | 'tomato' | 'hydrangea' | kind,
 * size (plant scale, m), seed, ry }. Returns the soil height.
 */
export function potted(t, x, y, z, o = {}) {
  const S0 = mats(), S = { ...S0, pot: own(t, 'pv', S0.pot), glaze: own(t, 'gloss', S0.glaze), soil: own(t, 'dirt', S0.soil) }, B = t.B, kind = o.pot || 'terra', r = o.r ?? 0.13, h = o.h ?? r * 1.5, seed = o.seed ?? Math.round(x * 13 + z * 7), col = o.col ?? POT_COL[kind];
  B.push(x, y, z, o.ry || 0);
  let ys;
  if (kind === 'terra' || kind === 'glazed') {
    // a tapered terracotta pot with its rolled rim / a round-bellied glazed one
    const prof = kind === 'terra'
      ? [[r * 0.7, 0], [r * 0.72, h * 0.03], [r * 0.93, h * 0.84], [r * 1.0, h * 0.85], [r * 1.05, h * 0.88], [r * 1.05, h * 0.98], [r * 1.0, h], [r * 0.93, h], [r * 0.9, h * 0.92]]
      : [[r * 0.62, 0], [r * 0.66, h * 0.04], [r * 0.95, h * 0.3], [r * 1.0, h * 0.55], [r * 0.9, h * 0.86], [r * 0.86, h * 0.95], [r * 0.9, h], [r * 0.84, h], [r * 0.8, h * 0.94]];
    B.lathe(kind === 'terra' ? S.pot : S.glaze, prof, 0, 0, 0, { tint: col, sides: 16, caps: 'b', exact: true });
    if (kind === 'terra') B.lathe(S.pot, [[r * 1.051, h * 0.875], [r * 1.051, h * 0.885]], 0, 0, 0, { tint: dark(col, 0.82), sides: 16, exact: true });
    ys = h * 0.9;
    B.lathe(S.soil, [[r * (kind === 'terra' ? 0.9 : 0.8), ys], [0, ys + 0.004]], 0, 0, 0, { tint: 0x5a4632, sides: 16, exact: true });
  } else {
    // box pots: a styrofoam fish box, a long planter, a bonsai tray on little feet
    const d = o.d ?? r * 0.6, w = r, bv = kind === 'styro' ? 0.006 : 0.004, mat = kind === 'bonsai' ? S.glaze : S.pot, t0 = kind === 'styro' ? 0.025 : 0.012;
    const foot = kind === 'bonsai' ? h * 0.18 : 0;
    if (foot) for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(mat, w * 0.16, foot, d * 0.2, sx * w * 0.72, 0, sz * d * 0.62, { tint: dark(col, 0.85), bevel: 0.003 });
    B.box(mat, 2 * w, h - foot, 2 * d, 0, foot, 0, { tint: col, bevel: bv, skip: 'py' });
    for (const [sx, sz, ww, dd] of [[0, 1, 2 * w, t0], [0, -1, 2 * w, t0], [1, 0, t0, 2 * d], [-1, 0, t0, 2 * d]]) B.box(mat, ww, 0.004, dd, sx * (w - t0 / 2), h, sz * (d - t0 / 2), { tint: dark(col, kind === 'styro' ? 0.95 : 1.05) });
    if (kind === 'styro') B.box(S.pot, 2 * w * 0.98, 0.012, 0.004, 0, h * 0.62, d + 0.001, { tint: 0x3a5aa8 });
    ys = h - 0.015;
    B.box(S.soil, 2 * (w - t0), 0.004, 2 * (d - t0), 0, ys - 0.004, 0, { tint: 0x5a4632 });
  }
  plant(t, 0, ys, 0, o.plant || 'small', o.size ?? r * 1.6, seed, o);
  B.pop();
  return y + ys;
}
/** A pot plant without the pot (a prop that models its own pot): kind and size as potted's plant. */
export function potPlant(t, x, y, z, kind, size, seed = 1, o = {}) { plant(t, x, y, z, kind, size, seed, o); }
/** The plant in a pot, its foot at (x, y, z) in the pot's frame; size: its height in metres. */
function plant(t, x, y, z, kind, size, seed, o = {}) {
  const S0 = mats(), S = { ...S0, stem: own(t, 'pv', S0.stem), glaze: own(t, 'gloss', S0.glaze) };
  switch (kind) {
    case 'aloe': { // fleshy toothed spears in a rosette, each a flattened tapering sweep
      for (let k = 0; k < 9; k++) {
        const a = k * 2.39996 + seed, out = 0.25 + 0.5 * (k / 9), L = size * (0.6 + 0.4 * (1 - k / 9));
        const p = [[x, y, z], [x + Math.cos(a) * L * out * 0.4, y + L * 0.55, z + Math.sin(a) * L * out * 0.4], [x + Math.cos(a) * L * out, y + L * (0.85 - out * 0.3), z + Math.sin(a) * L * out]];
        limb(t, p, [size * 0.07, size * 0.008], { mat: S.stem, tint: k % 2 ? 0x6a8c6e : 0x7a9a7c, sides: 5, seg: 3, cap: true });
      }
      return;
    }
    case 'pine': niwakiMini(t, x, y, z, size, seed); return;
    case 'none': return;
    case 'cactus': { // a ribbed column with an arm, white areoles along the ribs, a pink flower on top when it blooms
      const r = size * 0.24, top = [x, y + size, z];
      limb(t, [[x, y - 0.01, z], [x, y + size * 0.5, z], [x, y + size * 0.88, z], top], [r, r * 1.04, r * 0.86, r * 0.3], { mat: S.stem, tint: 0x4e8a4e, sides: 24, ribs: [8, 0.22], seg: 3, cap: true });
      if (o.arm) limb(t, [[x, y + size * 0.4, z], [x + r * 1.6, y + size * 0.42, z], [x + r * 1.8, y + size * 0.62, z], [x + r * 1.8, y + size * 0.7, z]], [r * 0.5, r * 0.4], { mat: S.stem, tint: 0x4e8a4e, sides: 16, ribs: [6, 0.2], cap: true });
      if (o.bloom) t.B.lathe(S.glaze, [[0, 0], [r * 0.25, r * 0.1], [r * 0.7, r * 0.55], [r * 0.9, r * 0.9], [r * 0.5, r * 0.75], [0, r * 0.5]], x, y + size * 0.97, z, { tint: 0xf27aa8, sides: 10, exact: true });
      return;
    }
    case 'maple': { limb(t, [[x, y, z], [x + 0.02, y + size * 0.4, z], [x - 0.03, y + size * 0.7, z + 0.01]], [size * 0.07, size * 0.02], { bark: 'cherry', tint: 0xa09090 }); for (const [dx, dy, dz, r] of [[0.12, 0.75, 0.02, 0.2], [-0.1, 0.9, -0.03, 0.2], [0.0, 1.0, 0.04, 0.16]]) crown(t, x + dx * size, y + dy * size, z + dz * size, r * size * 1.4, r * size * 0.6, r * size * 1.2, { kind: o.red ? 'mapleRed' : 'maple', card: size * 0.35, density: 2.8, core: false, seed: seed + Math.round(dy * 10), flat: -0.4 }); return; }
    case 'asagao': { // あんどん仕立て: three canes and two hoops, the vine spiralling up (o.leaf: leaves only, before it flowers)
      const H = size, R = Math.max(0.06, (o.r ?? 0.1) * 0.8);
      for (let k = 0; k < 3; k++) { const a = k * 2.094; limb(t, [[x + Math.cos(a) * R, y - 0.02, z + Math.sin(a) * R], [x + Math.cos(a) * R, y + H, z + Math.sin(a) * R]], [0.004, 0.003], { mat: S.stem, tint: 0xc8b47c, sides: 4, seg: 1 }); }
      for (const f of [0.5, 0.95]) { const ring = []; for (let k = 0; k <= 16; k++) ring.push([x + Math.cos(k / 16 * Math.PI * 2) * R, y + H * f, z + Math.sin(k / 16 * Math.PI * 2) * R]); limb(t, ring, [0.003, 0.003], { mat: S.stem, tint: 0xb8b8b0, sides: 3, seg: 1 }); }
      const n = Math.round(H / 0.05);
      cards(t, o.leaf || 'asagao', n, (i) => { const f = i / n, a = f * Math.PI * 6 + seed; const p = [x + Math.cos(a) * R * 1.05, y + 0.03 + f * H, z + Math.sin(a) * R * 1.05]; return { p, nrm: norm3([Math.cos(a), 0.3, Math.sin(a)]), h: 0.4 + 0.6 * f }; }, { card: Math.min(0.2, H * 0.28), tilt: 0.4, seed });
      return;
    }
    case 'tomato': { // three canes, the plant tied up them, a truss of fruit
      for (const dx of [-0.05, 0, 0.05]) limb(t, [[x + dx, y - 0.02, z + dx * 0.5], [x + dx * 1.4, y + size, z + dx * 0.7]], [0.005, 0.004], { mat: S.stem, tint: 0xc8b47c, sides: 4, seg: 1 });
      limb(t, [[x, y, z], [x + 0.01, y + size * 0.5, z], [x - 0.01, y + size * 0.92, z + 0.01]], [0.008, 0.004], { mat: S.stem, tint: 0x5a8a3a, sides: 5 });
      crown(t, x, y + size * 0.55, z, size * 0.28, size * 0.42, size * 0.26, { kind: 'tomato', card: Math.min(0.3, size * 0.45), density: 2.6, core: false, seed });
      if (o.fruit) for (const [dx, dy, dz] of [[0.06, 0.5, 0.05], [-0.05, 0.42, 0.06], [0.02, 0.62, -0.06], [-0.06, 0.66, -0.02]]) t.B.lathe(S.glaze, [[0, -0.024], [0.02, -0.018], [0.026, 0], [0.02, 0.016], [0.006, 0.02], [0, 0.018]], x + dx * size, y + dy * size, z + dz * size, { tint: o.fruit, sides: 10, exact: true });
      return;
    }
    case 'pothos': crown(t, x, y + size * 0.3, z, size * 0.55, size * 0.4, size * 0.55, { kind: 'pothos', card: size * 0.6, density: 2.4, core: false, seed, flat: -0.6 }); return;
    case 'sprout': tuft(t, x, y, z, size, 'sprout', seed); return;
    case 'fern': case 'grass': case 'weeds': for (let k = 0; k < 2; k++) tuft(t, x + (k - 0.5) * 0.02, y, z, size * (1 - k * 0.15), kind, seed + k); return;
    default: {
      const k = kind === 'hydrangea' ? 'hydrangea' : kind;
      shrub(t, x, y - size * 0.12, z, size * 0.5, k, { seed, mix: o.mix, card: Math.min(cardSize(k), size * 0.6) });
      if (kind === 'hydrangea') for (const [dx, dz] of [[0.3, 0.1], [-0.25, 0.2], [0.05, -0.3]]) crown(t, x + dx * size, y + size * 0.62, z + dz * size, size * 0.18, size * 0.15, size * 0.18, { kind: 'hydrangeaFlower', card: size * 0.3, density: 2, core: false, seed: seed + Math.round(dx * 10) });
    }
  }
}
/** A bonsai black pine: a gnarled little trunk and three or four pads. */
export function bonsaiPine(t, x, y, z, s, seed = 1) { niwakiMini(t, x, y, z, s, seed); }
function niwakiMini(t, x, y, z, s, seed) {
  const W = (dx, dy, dz) => [x + dx * s, y + dy * s, z + dz * s];
  limb(t, [W(0, 0, 0), W(0.12, 0.25, 0.02), W(-0.06, 0.5, 0), W(0.05, 0.75, -0.02), W(0.0, 0.92, 0)], [0.07 * s, 0.025 * s], { bark: 'pine', flare: 0.4, lobes: 3, phase: seed });
  for (const [dx, dy, dz, r] of [[0.38, 0.42, 0.04, 0.2], [-0.34, 0.6, -0.02, 0.18], [0.24, 0.8, 0.0, 0.16], [0.0, 0.98, 0.02, 0.2]]) {
    const st = W(dx * 0.2, dy - 0.08, 0), e = W(dx, dy - 0.03, dz);
    limb(t, [st, W(dx * 0.6, dy - 0.1, dz * 0.5), e], [0.025 * s, 0.012 * s], { bark: 'pine', seg: 2 });
    crown(t, ...W(dx, dy, dz), r * s, r * 0.35 * s, r * 0.85 * s, { kind: 'pine', mix: ['pineTop', 0.4], card: Math.max(0.05, r * s * 0.9), flat: -0.2, density: 3, tilt: 0.35, seed: seed + Math.round(dy * 10), coreK: 0.7 });
  }
}
