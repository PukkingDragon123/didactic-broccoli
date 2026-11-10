// Foliage for the town: leaf masses built the way painted foliage is built, not as lumpy balls. A crown is a shell of
// alpha-cut sprig cards (hand-drawn sprigs of the real plant: clipped kaname-mochi with its red spring tips, azalea in
// flower, black-pine needle tufts, cherry blossom, broad leaves) over a dark core that stops it looking hollow. Every
// card carries the crown's own rounded normals, so the whole mass shades as one soft form with a lit top and a shaded
// underside, while its edge stays broken by single leaves. Cards are drawn without ink lines (they would tangle).
//   crown(t, x, y, z, rx, ry, rz, o)       an ellipsoid mass in the current batch frame. o: { kind, card, density,
//                                          tint, core, flat (cut the underside: -1..1), seed, mix: [kind, share] }
//   hedge(t, x, y, z, ry, s, o)            a clipped hedge 2 x 1 x 0.6 m (x s) in its kerb, like the old prop
//   niwaki(t, x, z, s, seed)               a cloud-pruned garden pine: a twisting trunk, limbs, flat needle pads
//   sakura(t, x, z, s, seed)               a cherry in full bloom: trunk, forked limbs, blossom clouds, fallen petals
//   shrub(t, x, y, z, r, kind, o)          a small rounded plant (pots, window boxes, bonsai)
import * as THREE from 'three';
import { hash2 } from '../core/util.js';
import { noInk } from '../gfx/sunMask.js';

// the sprig sheet: 4 x 2 cells of 256 px. [col, row, card size in metres]
const CELLS = { box: [0, 0, 0.3], boxRed: [1, 0, 0.3], azalea: [2, 0, 0.3], pine: [3, 0, 0.36], blossom: [0, 1, 0.55], blossom2: [1, 1, 0.55], leaf: [2, 1, 0.34], small: [3, 1, 0.28] };
// core tones (the dark inside of each kind)
const CORE = { box: 0x2c4a26, boxRed: 0x2c4a26, azalea: 0x2e4a28, pine: 0x24402c, blossom: 0xc89aa6, blossom2: 0xc89aa6, leaf: 0x2f5228, small: 0x34562a };

let SHEET = null;
function sheet() {
  if (SHEET) return SHEET;
  const W = 1024, H = 512, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round';
  const cell = (c, r, fn) => { g.save(); g.translate(c * 256, r * 256); g.beginPath(); g.rect(0, 0, 256, 256); g.clip(); fn(); g.restore(); };
  cell(0, 0, () => sprigs(g, HEDGE_STEMS, { len: 40, wid: 15, gap: 13, P: PAL.box }));
  cell(1, 0, () => sprigs(g, HEDGE_STEMS, { len: 40, wid: 15, gap: 13, P: PAL.box, tip: PAL.red, tipFrom: 0.62 }));
  cell(2, 0, () => { sprigs(g, AZ_STEMS, { len: 30, wid: 11, gap: 11, P: PAL.az }); for (const [x, y, r] of AZ_FLOWERS) azalea(g, x, y, r); });
  cell(3, 0, () => pine(g));
  cell(0, 1, () => blossom(g, BL_A, PAL.bl));
  cell(1, 1, () => blossom(g, BL_B, PAL.bl2));
  cell(2, 1, () => sprigs(g, BROAD_STEMS, { len: 96, wid: 38, gap: 60, P: PAL.broad }));
  cell(3, 1, () => sprigs(g, HEDGE_STEMS, { len: 34, wid: 20, gap: 15, P: PAL.small }));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = noInk(new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.82, metalness: 0, alphaTest: 0.45, side: THREE.DoubleSide }));
  mat.name = 'foliage';
  const core = noInk(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95 }));
  core.name = 'foliageCore';
  SHEET = { mat, core };
  return SHEET;
}

// palettes: o outline, d shade, m body, l lit, r midrib
const PAL = {
  box: { o: '#1d3a20', d: '#2e5a2e', m: '#3f7838', l: '#64a046', r: '#2a4e28' },
  red: { o: '#4a1e14', d: '#8a3424', m: '#b04a2e', l: '#d0703c', r: '#6a2a1c' },
  az: { o: '#1f3a1e', d: '#335a2a', m: '#4a7a34', l: '#6a9a40', r: '#2a4a24' },
  broad: { o: '#1e3a1c', d: '#2f5a2a', m: '#46803a', l: '#70a84c', r: '#2f5a2a' },
  small: { o: '#22401e', d: '#3a6a2e', m: '#54903e', l: '#7cb456', r: '#3a6a2e' },
  bl: { o: '#b06a82', p: '#fbe4ea', p2: '#f4c4d2', c: '#d0506e' },
  bl2: { o: '#a86078', p: '#fff0f2', p2: '#f8d4de', c: '#c84866' },
};
// stems radiating from the foot of the card (canvas px), hand-set so a card is evenly full of leaves
const HEDGE_STEMS = [[128, 262, 128, 6], [120, 262, 34, 30], [136, 262, 222, 30], [118, 262, 4, 112], [138, 262, 252, 112], [124, 262, 74, 4], [132, 262, 184, 4], [126, 262, 10, 206], [130, 262, 248, 204]];
const AZ_STEMS = [[128, 262, 128, 40], [120, 262, 40, 60], [136, 262, 216, 60], [118, 262, 10, 150], [138, 262, 246, 150], [126, 262, 76, 20], [130, 262, 182, 22]];
const AZ_FLOWERS = [[128, 44, 30], [46, 66, 27], [212, 64, 28], [20, 150, 24], [236, 150, 25], [82, 26, 24], [178, 28, 25], [128, 132, 26], [70, 128, 22], [188, 126, 23]];
const BROAD_STEMS = [[128, 262, 128, 20], [120, 262, 24, 70], [136, 262, 232, 70], [118, 262, 4, 190], [138, 262, 252, 190]];

/** One leaf from its base along `ang` (canvas radians; -PI/2 points up): outline, two-tone body, midrib. */
function leaf(g, x, y, ang, len, wid, P) {
  const c = Math.cos(ang), s = Math.sin(ang), at = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const half = (sg) => { g.moveTo(...at(0, 0)); g.bezierCurveTo(...at(len * 0.2, wid * sg), ...at(len * 0.72, wid * 0.85 * sg), ...at(len, 0)); };
  const up = s < -0.25, lit = up ? P.l : P.m;
  g.beginPath(); half(1); g.bezierCurveTo(...at(len * 0.72, -wid * 0.85), ...at(len * 0.2, -wid), ...at(0, 0)); g.closePath();
  g.fillStyle = lit; g.fill(); g.strokeStyle = P.o; g.lineWidth = 2.2; g.stroke();
  // the half turned from the light, folded down the midrib
  g.beginPath(); half(c > 0 ? -1 : 1); g.lineTo(...at(0, 0)); g.closePath(); g.fillStyle = up ? P.m : P.d; g.fill();
  g.beginPath(); g.moveTo(...at(len * 0.08, 0)); g.lineTo(...at(len * 0.82, 0)); g.strokeStyle = P.r; g.lineWidth = 1.2; g.stroke();
}
/** Leafy sprigs along straight stems [x0, y0, x1, y1]: alternate leaves shrinking to a terminal pair. */
function sprigs(g, stems, { len, wid, gap, P, tip, tipFrom = 1 }) {
  for (const [x0, y0, x1, y1] of stems) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = '#4a3a26'; g.lineWidth = 3; g.stroke(); }
  for (const [x0, y0, x1, y1] of stems) {
    const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0), n = Math.floor((L - 30) / gap);
    for (let i = 0; i <= n; i++) {
      const f = (30 + i * gap) / L, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f, side = i % 2 ? 1 : -1, k = 1 - 0.35 * f;
      leaf(g, x, y, a + side * (0.85 - 0.25 * f), len * k, wid * k / 2, tip && f > tipFrom ? tip : P);
    }
    for (const sd of [-0.32, 0.32]) leaf(g, x1, y1, a + sd, len * 0.62, wid * 0.32, tip && tipFrom < 1 ? tip : P);
  }
}
/** つつじ: a five-lobed funnel flower, magenta with a darker throat and freckles on the top lobe. */
function azalea(g, x, y, r) {
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + k * (Math.PI * 2 / 5), c = Math.cos(a), s = Math.sin(a);
    g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + (c * 0.3 - s * 0.55) * r, y + (s * 0.3 + c * 0.55) * r, x + (c * 1.05 - s * 0.45) * r, y + (s * 1.05 + c * 0.45) * r, x + c * r, y + s * r);
    g.bezierCurveTo(x + (c * 1.05 + s * 0.45) * r, y + (s * 1.05 - c * 0.45) * r, x + (c * 0.3 + s * 0.55) * r, y + (s * 0.3 - c * 0.55) * r, x, y);
    g.fillStyle = k === 0 ? '#e0508e' : '#ec6aa0'; g.fill(); g.strokeStyle = '#a02a5a'; g.lineWidth = 1.6; g.stroke();
  }
  g.fillStyle = '#b8285e'; g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fill();
  for (const [dx, dy] of [[-0.12, -0.42], [0.06, -0.5], [0.16, -0.36]]) { g.fillStyle = '#8a1a46'; g.fillRect(x + dx * r - 1, y + dy * r - 1, 2.4, 2.4); }
  g.strokeStyle = '#f6e0ea'; g.lineWidth = 1;
  for (const a of [-0.3, 0, 0.35]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * r * 0.75, y - Math.cos(a) * r * 0.75); g.stroke(); }
}
/** 黒松: needle tufts in pairs along a few twigs (the pruned pads of a garden pine). */
function pine(g) {
  const twigs = [[128, 262, 128, 60], [124, 262, 40, 90], [132, 262, 216, 90], [120, 262, 8, 180], [136, 262, 248, 180]];
  for (const [x0, y0, x1, y1] of twigs) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = '#5a4030'; g.lineWidth = 4; g.stroke(); }
  const tufts = [[128, 60, 1], [40, 90, 1], [216, 90, 1], [8, 180, 0.9], [248, 180, 0.9], [128, 150, 0.95], [84, 170, 0.85], [172, 170, 0.85], [70, 50, 0.8], [186, 50, 0.8], [128, 220, 0.8], [40, 230, 0.75], [216, 230, 0.75]];
  for (const [x, y, s] of tufts) {
    const n = 26;
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (k / (n - 1) - 0.5) * 2.9, L = (52 - Math.abs(k / (n - 1) - 0.5) * 30) * s;
      g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + Math.cos(a) * L, y + 6 + Math.sin(a) * L);
      g.strokeStyle = pass ? (k % 3 ? '#3e6e3a' : '#5e8e48') : '#1e3a24'; g.lineWidth = pass ? 1.8 : 3.4; g.stroke();
    }
    g.fillStyle = '#7a5a3a'; g.beginPath(); g.ellipse(x, y + 8, 5 * s, 7 * s, 0, 0, Math.PI * 2); g.fill();
  }
}
// blossom clusters: [x, y, flowers, radius]
const BL_A = [[128, 40, 5, 20], [52, 70, 4, 19], [204, 66, 5, 20], [22, 150, 4, 18], [236, 146, 4, 19], [96, 128, 5, 20], [168, 120, 5, 19], [128, 200, 4, 18], [56, 214, 4, 17], [204, 210, 4, 18], [84, 20, 3, 17], [176, 18, 3, 17]];
const BL_B = [[118, 56, 5, 21], [44, 96, 5, 19], [210, 88, 4, 20], [150, 140, 5, 20], [74, 170, 4, 18], [226, 186, 4, 18], [24, 214, 3, 17], [124, 226, 4, 18], [176, 30, 3, 17], [64, 30, 3, 16]];
function blossom(g, clusters, P) {
  // the twigs first (dark, behind), then each umbel of five-petalled flowers with notched petals
  g.strokeStyle = '#5a3a34'; g.lineWidth = 3.5;
  for (const [x, y] of clusters) { g.beginPath(); g.moveTo(128 + (x - 128) * 0.3, 262); g.quadraticCurveTo(x * 0.8 + 25, y + 60, x, y + 8); g.stroke(); }
  clusters.forEach(([cx, cy, n, r], ci) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ci * 0.7, d = i ? r * 0.95 : 0, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8, rot = ci * 0.5 + i * 1.1;
      g.strokeStyle = '#6a3a3a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx, cy + 6); g.lineTo(x, y); g.stroke();
      for (let k = 0; k < 5; k++) {
        const pa = rot + k * (Math.PI * 2 / 5), c = Math.cos(pa), s = Math.sin(pa), w = r * 0.38, at = (u, v) => [x + c * u - s * v, y + s * u + c * v];
        g.beginPath(); g.moveTo(...at(0, 0));
        g.bezierCurveTo(...at(r * 0.3, w * 1.1), ...at(r * 0.85, w * 1.0), ...at(r * 0.98, w * 0.42));
        g.lineTo(...at(r * 0.82, 0)); g.lineTo(...at(r * 0.98, -w * 0.42));
        g.bezierCurveTo(...at(r * 0.85, -w * 1.0), ...at(r * 0.3, -w * 1.1), ...at(0, 0));
        g.fillStyle = (k + i) % 3 ? P.p : P.p2; g.fill(); g.strokeStyle = P.o; g.lineWidth = 1.3; g.stroke();
      }
      g.fillStyle = P.c; g.beginPath(); g.arc(x, y, r * 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f0d070'; for (let k = 0; k < 5; k++) { const pa = rot + 0.6 + k * 1.256; g.fillRect(x + Math.cos(pa) * r * 0.32 - 1, y + Math.sin(pa) * r * 0.32 - 1, 2.2, 2.2); }
    }
  });
}

const cellUV = (kind) => { const [c, r] = CELLS[kind], e = 1.5 / 1024; return [c / 4 + e, 1 - (r + 1) / 2 + e * 2, (c + 1) / 4 - e, 1 - r / 2 - e * 2]; };
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Cards on a surface: sample(i, n) -> { p, nrm, h (0..1 height share for the light) } | null. */
function cards(t, kind, n, sample, o) {
  const S = sheet(), B = t.B, size = o.card ?? CELLS[kind][2], seed = o.seed ?? 1, tilt = o.tilt ?? 0.55;
  const P = [], T = [], N = [], K = [];
  const kinds = [kind, o.mix?.[0]];
  const mixShare = o.mix?.[1] ?? 0;
  const Pm = [], Tm = [], Nm = [], Km = [];
  for (let i = 0; i < n; i++) {
    const s = sample(i, n);
    if (!s) continue;
    const h1 = hash2(i + seed * 131, 17), h2 = hash2(i, seed * 7 + 3), h3 = hash2(seed + i * 3, 29);
    // the card leans off the surface by up to `tilt`, turned at random about the normal
    const ref = Math.abs(s.nrm[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const ta = norm3(cross(ref, s.nrm)), tb = cross(s.nrm, ta), ang = h1 * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
    const u0 = [ta[0] * ca + tb[0] * sa, ta[1] * ca + tb[1] * sa, ta[2] * ca + tb[2] * sa], v0 = cross(s.nrm, u0);
    const lean = (h2 - 0.5) * 2 * tilt, cl = Math.cos(lean), sl = Math.sin(lean);
    const v = [v0[0] * cl + s.nrm[0] * sl, v0[1] * cl + s.nrm[1] * sl, v0[2] * cl + s.nrm[2] * sl];
    const sz = size * (0.85 + 0.3 * h3), hu = sz / 2, flip = h2 > 0.5;
    const useMix = mixShare && hash2(i * 5 + seed, 41) < mixShare;
    const [a0, b0, a1, b1] = cellUV(useMix ? kinds[1] : kind), uvq = flip ? [[a1, b0], [a0, b0], [a0, b1], [a1, b1]] : [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
    // the sprig's foot sits a little inside the surface, its tip out in the air
    const base = [s.p[0] - s.nrm[0] * sz * 0.18, s.p[1] - s.nrm[1] * sz * 0.18, s.p[2] - s.nrm[2] * sz * 0.18];
    const q = [[-hu, -hu * 0.7], [hu, -hu * 0.7], [hu, hu * 1.3], [-hu, hu * 1.3]].map(([a, b]) => [base[0] + u0[0] * a + v[0] * b, base[1] + u0[1] * a + v[1] * b, base[2] + u0[2] * a + v[2] * b]);
    const nq = q.map((p) => (s.normalAt && s.normalAt(p)) || s.nrm);
    const k = 0.68 + 0.42 * s.h;
    const [LP, LT, LN, LK] = useMix ? [Pm, Tm, Nm, Km] : [P, T, N, K];
    for (const j of [0, 1, 2, 0, 2, 3]) { LP.push(...q[j]); LT.push(...uvq[j]); LN.push(...nq[j]); LK.push(k * (j === 0 || j === 1 ? 0.88 : 1.04)); }
  }
  const tint = o.tint ?? 0xffffff;
  if (P.length) B.tris(S.mat, P, T, { tint, K }, N);
  if (Pm.length) B.tris(S.mat, Pm, Tm, { tint, K: Km }, Nm);
}

/** An ellipsoid leaf mass centred on (x, y, z) in the current batch frame. */
export function crown(t, x, y, z, rx, ry, rz, o = {}) {
  const kind = o.kind || 'box', S = sheet(), size = o.card ?? CELLS[kind][2], flat = o.flat ?? -1.1;
  const p = 1.6, area = 4 * Math.PI * Math.pow((Math.pow(rx * ry, p) + Math.pow(rx * rz, p) + Math.pow(ry * rz, p)) / 3, 1 / p);
  const n = Math.max(6, Math.round(area / (size * size) * (o.density ?? 2.4)));
  const seed = o.seed ?? Math.round(x * 17 + z * 31 + y * 7);
  const normalAt = (q) => norm3([(q[0] - x) / (rx * rx), (q[1] - y) / (ry * ry), (q[2] - z) / (rz * rz)]);
  cards(t, kind, n, (i) => {
    const yy = 1 - 2 * (i + 0.5) / n;
    if (yy < flat) return null;
    const r = Math.sqrt(1 - yy * yy), ph = i * 2.39996 + seed, d = [Math.cos(ph) * r, yy, Math.sin(ph) * r];
    const sc = 0.9 + 0.12 * hash2(i, seed + 11), pt = [x + d[0] * rx * sc, y + Math.max(d[1], flat) * ry * sc, z + d[2] * rz * sc];
    return { p: pt, nrm: normalAt(pt), h: Math.max(0, Math.min(1, yy * 0.5 + 0.5)), normalAt };
  }, { ...o, seed });
  const ck = o.coreK ?? 0.8;
  if (o.core !== false) t.B.blob(S.core, x, y - (flat > -1 ? ry * 0.1 : 0), z, rx * ck, ry * ck * (flat > -1 ? 0.8 : 1), rz * ck, { tint: o.coreTint ?? CORE[kind], jitter: 0.08, lo: 0.6, hi: 1.05, seed });
}

/** A clipped hedge (2 x 1 x 0.6 m before `s`) on a low concrete kerb, its foot at (x, y, z), turned ry. */
export function hedge(t, x, y, z, ry = 0, s = 1, o = {}) {
  const B = t.B, m = t.m, S = sheet(), seed = o.seed ?? Math.round(x * 13 + z * 7);
  B.push(x, y, z, ry);
  const W = 2 * s, D = 0.6 * s, hk = 0.09 * s;
  B.box(m.concrete, W, hk, D, 0, 0, 0, { tint: 0xb4b0a6, bevel: 0.012 * s });
  B.box(m.dirt, W - 0.08 * s, 0.012, D - 0.08 * s, 0, hk, 0, { tint: 0x5a4632 });
  // the clipped mass: a rounded box (radius rr) from the kerb to 1 m; cards set in rows over every face
  const hx = 0.96 * s, hz = 0.27 * s, y0 = hk + 0.04 * s, y1 = 1.0 * s, rr = 0.11 * s, cy = (y0 + y1) / 2, hy = (y1 - y0) / 2;
  const ix = hx - rr, iy = hy - rr, iz = hz - rr, cl = (v, a) => Math.max(-a, Math.min(a, v));
  const onBox = (q) => { const c = [cl(q[0], ix), cl(q[1] - cy, iy), cl(q[2], iz)], d = [q[0] - c[0], q[1] - cy - c[1], q[2] - c[2]], l = Math.hypot(...d); if (l < 1e-6) return null; const nn = [d[0] / l, d[1] / l, d[2] / l]; return { p: [c[0] + nn[0] * rr, cy + c[1] + nn[1] * rr, c[2] + nn[2] * rr], nrm: nn }; };
  const pts = [], step = (o.card ?? 0.3) * s * 0.42;
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
  cards(t, o.kind || 'box', pts.length, (i) => {
    const q = pts[i], r = onBox([cl(q[0], hx), cl(q[1] - cy, hy) + cy, cl(q[2], hz)]);
    if (!r) return null;
    return { p: r.p, nrm: r.nrm, h: Math.max(0, Math.min(1, (r.p[1] - y0) / (y1 - y0))) * 0.8 + (r.nrm[1] > 0.5 ? 0.2 : 0), normalAt };
  }, { card: (o.card ?? 0.3) * s, tilt: 0.35, seed, mix: o.mix ?? ['boxRed', 0.3], tint: o.tint });
  B.box(S.core, 2 * hx - 0.06 * s, y1 - y0 - 0.05 * s, 2 * hz - 0.06 * s, 0, y0, 0, { tint: CORE.box, bevel: 0.06 * s });
  // the bare stems at the foot, where the shears never reach
  for (let k = 0; k < 7; k++) for (const sz of [-1, 1]) B.rod(m.wood, [(-0.85 + k * 0.28) * s, hk, sz * 0.12 * s], [(-0.83 + k * 0.28) * s, y0 + 0.12 * s, sz * 0.18 * s], 0.012 * s, { tint: 0x5a4632, sides: 5 });
  B.pop();
}

/** A tapering limb through points (a smooth chain of rods). */
function limb(t, pts, r0, r1, tint) {
  const B = t.B, n = pts.length - 1;
  for (let i = 0; i < n; i++) B.rod(t.m.wood, pts[i], pts[i + 1], r0 + (r1 - r0) * (i / n), { r1: r0 + (r1 - r0) * ((i + 1) / n), tint, sides: 9 });
}

/** 仕立て松: a cloud-pruned black pine, its trunk twisting up, limbs out to flat pads of needles. */
export function niwaki(t, x, z, s = 1, seed = 1) {
  const bark = 0x5e4a3c, rot = seed * 1.7;
  const P = (dx, y, dz) => [x + (dx * Math.cos(rot) - dz * Math.sin(rot)) * s, y * s, z + (dx * Math.sin(rot) + dz * Math.cos(rot)) * s];
  limb(t, [P(0, 0, 0), P(0.12, 0.6, 0.05), P(-0.08, 1.2, 0.02), P(0.1, 1.8, -0.06), P(0, 2.35, 0)], 0.11 * s, 0.04 * s, bark);
  t.B.cyl(t.m.wood, 0.14 * s, 0.11 * s, 0.12 * s, x, 0, z, { tint: dark(bark, 0.9), sides: 10 });
  const pads = [[0.62, 1.05, 0.2, 0.42, 0.5], [-0.55, 1.45, -0.1, 0.38, 0.45], [0.42, 1.9, -0.25, 0.32, 0.4], [0, 2.4, 0, 0.36, 0.42], [-0.3, 0.75, 0.35, 0.3, 0.38]];
  for (const [dx, y, dz, ry, r] of pads) {
    const from = P(dx * 0.15, y - 0.25, dz * 0.15), to = P(dx, y - 0.04, dz);
    if (Math.abs(dx) + Math.abs(dz) > 0.1) limb(t, [from, P(dx * 0.6, y - 0.1, dz * 0.6), to], 0.04 * s, 0.022 * s, bark);
    const c = P(dx, y, dz);
    crown(t, c[0], c[1] + 0.06 * s, c[2], r * s, ry * 0.42 * s, r * 0.9 * s, { kind: 'pine', flat: -0.45, seed: seed * 11 + Math.round(y * 10), density: 2.6, card: 0.32 * s });
  }
}

/** 桜: a cherry in full bloom: a leaning trunk forking into limbs, blossom clouds along them, petals on the ground. */
export function sakura(t, x, z, s = 1, seed = 1) {
  const B = t.B, bark = 0x5a4440;
  B.lathe(t.m.wood, [[0.26 * s, 0], [0.2 * s, 0.25 * s], [0.17 * s, 1.0 * s], [0.15 * s, 1.9 * s]], x, 0, z, { tint: bark, sides: 12, rz: 0.06 });
  const top = [x - 0.11 * s, 1.9 * s, z];
  const limbs = [[1.6, 1.3, 0.4], [-1.4, 1.5, 0.9], [0.3, 1.8, -1.5], [-0.5, 2.4, -0.2], [0.9, 2.1, 1.2]];
  limbs.forEach(([dx, dy, dz], i) => {
    const e = [top[0] + dx * s, top[1] + dy * s, top[2] + dz * s], mid = [top[0] + dx * 0.45 * s, top[1] + dy * 0.62 * s + 0.1 * s, top[2] + dz * 0.45 * s];
    limb(t, [top, mid, e], 0.12 * s, 0.035 * s, bark);
    // two twigs off each limb's end
    for (const sd of [-1, 1]) limb(t, [e, [e[0] + (dz * 0.3 * sd + dx * 0.25) * s, e[1] + 0.35 * s, e[2] + (-dx * 0.3 * sd + dz * 0.25) * s]], 0.035 * s, 0.015 * s, bark);
    const bl = { kind: 'blossom', mix: ['blossom2', 0.45], flat: -0.85, density: 2.6, coreK: 0.62, coreTint: 0xe4b4c2, tilt: 0.8 };
    crown(t, e[0], e[1] + 0.2 * s, e[2], 1.2 * s, 0.82 * s, 1.15 * s, { ...bl, seed: seed * 7 + i });
    crown(t, (mid[0] + e[0]) / 2, (mid[1] + e[1]) / 2 + 0.05 * s, (mid[2] + e[2]) / 2, 0.85 * s, 0.6 * s, 0.85 * s, { ...bl, kind: 'blossom2', mix: ['blossom', 0.5], seed: seed * 13 + i });
  });
  crown(t, top[0], top[1] + 2.25 * s, top[2], 1.45 * s, 0.9 * s, 1.4 * s, { kind: 'blossom', mix: ['blossom2', 0.4], flat: -0.85, density: 2.6, coreK: 0.62, coreTint: 0xe4b4c2, tilt: 0.8, seed: seed * 17 });
  // fallen petals round the foot
  for (let i = 0; i < 40; i++) { const a = hash2(i, seed) * 6.28, r = (0.4 + hash2(i, seed + 5) * 2.4) * s; B.plane(t.m.paint, 0.05, 0.035, x + Math.cos(a) * r, 0.006, z + Math.sin(a) * r, { ry: a, tint: i % 3 ? 0xf8d4dc : 0xfbe8ec }); }
}

/** Ivy on a wall: the wall face is local z = 0 at (x, z) turned ry (local +z out of the wall); a patch w wide at the
 *  foot thinning to tendrils h up, cards lying close to the wall. */
export function creeper(t, x, z, ry, w, h, seed = 1) {
  const B = t.B;
  B.push(x, 0, z, ry);
  const pts = [], st = 0.11;
  for (let y = 0.05; y < h; y += st) {
    const f = y / h, half = (w / 2) * (1 - Math.pow(f, 0.8)) + 0.12 * Math.sin(f * 9 + seed), off = 0.25 * w * Math.sin(f * 3.1 + seed * 2);
    for (let u = -half; u <= half; u += st) pts.push([u + off + (hash2(Math.round(u * 50), Math.round(y * 50) + seed) - 0.5) * st, y, 0.03]);
  }
  const normalAt = (q) => norm3([q[0] * 0.25 / w, 0, 1]);
  cards(t, 'small', pts.length, (i) => ({ p: pts[i], nrm: [0, 0, 1], h: 0.4 + 0.6 * (pts[i][1] / h), normalAt }), { card: 0.24, tilt: 0.3, seed });
  B.pop();
}

/** A climber trained up a string from (x, y0) to (x, y1) at depth z (local frame, the wall behind it at lower z):
 *  leaves on short stalks either side of the string, facing out. */
export function vine(t, x, y0, y1, z, seed = 1, o = {}) {
  const pts = [];
  for (let y = y0, i = 0; y < y1; y += 0.075, i++) { const sd = i % 2 ? 1 : -1, w = 0.06 + 0.05 * hash2(i, seed); pts.push([x + sd * w, y, z + 0.02 + 0.03 * hash2(seed, i)]); }
  const normalAt = (q) => norm3([(q[0] - x) * 3, 0.15, 1]);
  cards(t, o.kind || 'small', pts.length, (i) => ({ p: pts[i], nrm: [0, 0, 1], h: 0.45 + 0.55 * ((pts[i][1] - y0) / (y1 - y0)), normalAt }), { card: o.card ?? 0.2, tilt: 0.5, seed, tint: o.tint });
}

/** A small rounded plant (a pot's, a window box's): r its radius, kind its sprig. */
export function shrub(t, x, y, z, r, kind = 'small', o = {}) {
  crown(t, x, y + r * 0.7, z, r, r * 0.85, r, { kind, flat: -0.5, card: Math.max(0.12, Math.min(CELLS[kind][2], r * 0.9)), density: 2.2, ...o });
}

const dark = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
