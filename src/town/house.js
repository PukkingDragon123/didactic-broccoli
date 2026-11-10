// A Shōwa house built the way it is built: strip foundation with floor vents, mortar / totan / clapboard walls, a real
// roof (true slopes; kawara in ridged columns with stacked ridge tiles, onigawara and round eave ends; batten-seam tin;
// hips; sheds; flat roofs with a parapet), boxed or raftered eaves, a gutter and a goose-necked downpipe, pent roofs,
// aluminium sash windows (two leaves in two planes, sill flashing, grilles, shutter boxes, hoods, reed blinds, insect
// screens), genkan / lattice / panel / steel doors with their step, canopy, lamp, name plate, intercom, post and milk box,
// a balcony with washing and futons, meters, air conditioners on brackets, a yagi antenna.
// The house is drawn in its own frame: front wall at local z = 0, body toward -z, then turned to face the lane.
//   house(t, o) -> { top, ridge, anchor }   (o: see Town.house)
import * as THREE from 'three';
import { hash2 } from '../core/util.js';
import { interiorQuad, ROOM } from '../world/interiors.js';
import { NAMES } from './atlas.js';
import { shrub, crown } from './foliage.js';
import { fanGuard, doorDetail } from './detail.js';

// window kinds: [room, lit, curtain]
const ROOMS = {
  lit: [ROOM.living, 1, 1], lit2: [ROOM.kid, 1, 3], lit3: [ROOM.washitsu, 1, 2], lit4: [ROOM.living, 1, 2], lace: [ROOM.living, 0.9, 2],
  tv: [ROOM.tv, 0.5, 1], dark: [ROOM.living, 0, 1], kitchen: [ROOM.kitchen, 1, 0], stair: [ROOM.stair, 0.6, 0], empty: [ROOM.empty, 0, 0],
  frost: [ROOM.frost, 0.55, 0], shoji: [ROOM.shoji, 0.9, 0],
};
export const ALU = 0xb4babf, ALU_D = 0x8e959b;
const mat = (t, v, def) => (!v ? def : Array.isArray(v) ? [t.m[v[0]], v[1] ?? 0xffffff] : [v, 0xffffff]);
const dark = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

export function house(t, o) {
  const B = t.B, m = t.m;
  const W = o.w, D = o.d, side = o.side ?? 1, seed = Math.floor(Math.abs(o.x * 3.7 + o.z * 1.3)), lite = !!o.lite;
  B.push(o.x, o.y0 || 0, o.z, side > 0 ? 0 : Math.PI);
  const base = o.y0 ? 0 : (o.base ?? 0.4);
  const h1 = o.h1 ?? 2.65, h2 = (o.floors ?? 2) > 1 ? (o.h2 ?? 2.55) : 0, fy = [base, base + h1], top = base + h1 + h2;
  const [wA, cA] = mat(t, o.wallA, [m.plaster, 0xe9dcc0]), [wB, cB] = mat(t, o.wallB, [wA, cA]);
  // foundation, walls, the belt course between the floors
  if (base) {
    B.box(m.concrete, W + 0.06, base, D + 0.06, 0, 0, -D / 2, { uv: [seed, 0], skip: 'ny', tint: 0xb9b5ac, ao: 0.25 });
    if (o.vents !== false && !lite) for (const vx of [-W * 0.3, W * 0.3]) { if (o.door && Math.abs(vx - o.door.x) < (o.door.w ?? 1.4) / 2 + 0.45) continue; t.sign('vent', vx, 0.12, 0.034, { w: 0.4 }); }
  }
  const clapA = wA === m.clap && !lite, clapB = wB === m.clap && !lite, dvB = wB === m.clap ? 0.36 : 0.4;
  B.box(wA, W, h1, D, 0, base, -D / 2, { uv: [seed % 3, 0], tint: cA, ao: o.y0 ? 0 : 0.14, skip: 'py ny' });
  if (clapA) lapBoards(t, W, base, h1, seed % 3, 0, cA, !h2);
  if (h2) {
    B.box(wB, W, h2, D, 0, base + h1, -D / 2, { uv: [seed % 5, dvB], tint: cB, skip: 'py ny' });
    if (clapB) lapBoards(t, W, base + h1, h2, seed % 5, dvB, cB, true);
    B.box(m.pv, W + 0.05, 0.11, D + 0.05, 0, base + h1 - 0.055, -D / 2, { tint: o.trim ?? 0x6a5a4a, skip: 'py ny' });
  }
  if (o.skirt) B.box(o.skirt.mat || m.skirt, W + 0.02, o.skirt.h ?? 0.9, 0.03, 0, base, 0.012, { uv: [seed, 0], tint: o.skirt.tint ?? 0xffffff, skip: 'nz ny' });
  if (o.corner !== undefined) for (const sx of [-1, 1]) B.box(m.pv, 0.08, top - base, 0.08, sx * (W / 2 - 0.02), base, 0.02, { tint: o.corner, skip: 'py ny' });
  // the cel shadow the eaves throw on the wall top (front and both sides)
  if (o.roof !== 'flat' && !lite) {
    const [wT, cT] = h2 ? [wB, cB] : [wA, cA], sh = 0.3;
    const hh = h2 || h1, du = h2 ? seed % 5 : seed % 3, dv = h2 ? dvB : 0;
    B.quadUV(wT, W, sh, 0, top - sh, 0.004, [du, hh - sh + dv, du + W, hh + dv], { tint: cT, k: 0.72 });
    for (const sx of [-1, 1]) B.quadUV(wT, D, sh, sx * (W / 2 + 0.004), top - sh, -D / 2, [du, hh - sh + dv, du + D, hh + dv], { tint: cT, k: 0.78, ry: sx * Math.PI / 2 });
  }
  const R = roof(t, W, D, top, o, [wB, cB], lite, seed);
  // pent roof (下屋) over the ground floor, skipping the balcony
  if (o.pent && h2) {
    const spans = o.balcony ? [[-W / 2 - 0.12, o.balcony.x0 - 0.05], [o.balcony.x1 + 0.05, W / 2 + 0.12]] : [[-W / 2 - 0.12, W / 2 + 0.12]];
    const [pm, pc] = mat(t, o.pentM || o.roofM, [m.kawara, 0x8e929a]);
    for (const [a, b] of spans) if (b - a > 0.3) lean(t, a, b, fy[1] - 0.05, 0.3, 0.8, pm, pc, pm === m.kawara && !lite);
  }
  if (o.balcony) balcony(t, o.balcony, fy[1], seed);
  for (const w of o.win || []) { t._dz = (w[0] ? clapB : clapA) && (w[5]?.face || 'f') === 'f' ? 0.021 : 0.008; window(t, W, D, w, fy, lite); }
  if (o.door) door(t, o.door, base, o.win, fy, lite);
  // rain gutter along the front eave, a goose-necked downpipe on brackets, a shoe over a splash block
  const gt = o.gutterTint ?? 0xa39f98, e = o.eave ?? 0.45, dps = seed % 2 ? 1 : -1, dpx = (W / 2 + 0.06) * dps;
  if (o.roof !== 'flat') {
    const ye = R.eaveY - 0.03;
    gutter(t, -W / 2 - (R.side ?? 0.3), W / 2 + (R.side ?? 0.3), ye + 0.02, e + 0.05, gt, !lite);
    if (!lite) {
      B.box(m.pv, 0.13, 0.13, 0.13, dpx, ye - 0.12, e + 0.045, { tint: gt, bevel: 0.015 });
      B.tube(m.pv, [[dpx, ye - 0.1, e + 0.05], [dpx, ye - 0.2, e + 0.05], [dpx, ye - 0.28, e + 0.02], [dpx, top - 0.5, 0.11], [dpx, top - 0.6, 0.078], [dpx, top - 0.72, 0.075], [dpx, 0.24, 0.075], [dpx, 0.15, 0.09], [dpx, 0.08, 0.18], [dpx, 0.06, 0.24]], 0.032, { tint: gt, sides: 12 });
      for (let y = 0.8; y < top - 0.8; y += 1.1) { B.lathe(m.metal, [[0.036, 0], [0.039, 0.004], [0.039, 0.026], [0.036, 0.03]], dpx, y, 0.075, { tint: dark(gt, 0.75), sides: 12 }); B.box(m.metal, 0.02, 0.02, 0.07, dpx, y + 0.005, 0.035, { tint: dark(gt, 0.75) }); }
      if (!o.y0) B.box(m.concrete, 0.26, 0.05, 0.32, dpx, 0, 0.34, { tint: 0xb4b0a6, bevel: 0.012 });
    } else B.tube(m.pv, [[dpx, ye, e], [dpx, top - 0.5, 0.08], [dpx, 0.1, 0.08]], 0.034, { tint: gt, sides: 4 });
  }
  if (!lite) weather(t, W, D, base, fy, top, seed, !!h2, o, clapA ? 0.021 : 0.007);
  // services on the side wall: the watt-hour meter on its board with the conduit up to the eave, the gas meter and its pipe
  const sx = -dps;
  if (!lite) {
    B.push(sx * (W / 2), 0, -1.2, sx * Math.PI / 2);
    B.box(m.wood, 0.3, 0.42, 0.025, 0, base + 1.05, 0.013, { tint: 0x8a7458 });
    B.box(m.pv, 0.17, 0.22, 0.1, 0, base + 1.12, 0.07, { tint: 0x4a4a48, bevel: 0.012 });
    t.sign('elecMeter', 0, base + 1.125, 0.122, { w: 0.165 });
    B.tube(m.pv, [[0.06, base + 1.34, 0.04], [0.06, top - 0.35, 0.04], [0.3, top - 0.25, 0.1]], 0.014, { tint: 0x8a8e90, sides: 4 });
    B.box(m.pv, 0.2, 0.24, 0.12, -0.9, base + 0.62, 0.07, { tint: 0xa8ae9e, bevel: 0.012 });
    t.sign('gasMeter', -0.9, base + 0.625, 0.132, { w: 0.19 });
    B.tube(m.metal, [[-0.98, 0, 0.06], [-0.98, base + 0.92, 0.06], [-0.94, base + 0.92, 0.06], [-0.94, base + 0.86, 0.06]], 0.014, { tint: 0xd8c880, sides: 4 });
    B.tube(m.metal, [[-0.84, base + 0.86, 0.06], [-0.84, base + 0.98, 0.06], [-0.7, base + 0.98, 0.03]], 0.014, { tint: 0xd8c880, sides: 4 });
    B.pop();
  }
  if (o.antenna !== undefined) antenna(t, o.antenna, R.ridge, R.ridgeZ ?? -D / 2, seed);
  // where the service drop meets the house: a bracket with two insulators under the eave corner
  const ax = (W / 2 - 0.3) * dps;
  if (!lite) { B.box(m.metal, 0.05, 0.16, 0.05, ax, top - 0.36, 0.03, { tint: 0x6a6e70 }); for (const dy of [0, 0.09]) B.cyl(m.gloss, 0.022, 0.022, 0.05, ax, top - 0.34 + dy, 0.08, { rx: Math.PI / 2, tint: 0xe8e4d8, sides: 6 }); }
  const anchor = B.world(ax, top - 0.3, 0.13);
  (side > 0 ? t.anchors.near : t.anchors.far).push(anchor);
  const info = { W, D, base, fy, top, seed, ridge: R.ridge, eaveY: R.eaveY };
  if (o.extra) o.extra(B, info);
  B.pop();
  return { top, anchor, ridge: R.ridge };
}

/** 下見板: real lapped boards on the lane face of a clapboard wall (each tilted out at its lower edge, 0.18 m), with
 *  the battens (押縁) that pin them every 0.45 m; uvs follow the wall's own so paint and relief agree. */
function lapBoards(t, W, y0, h, du, dv, tint, shade) {
  const B = t.B, m = t.m;
  for (let y = y0; y < y0 + h - 0.01; y += 0.18) {
    const hh = Math.min(0.18, y0 + h - y), k = shade && y > y0 + h - 0.32 ? 0.74 : 1, v0 = y - y0 + dv;
    B.face(m.clap, [-W / 2, y, 0.017], [W / 2, y, 0.017], [W / 2, y + hh, 0.004], [-W / 2, y + hh, 0.004], { tint, k, uvs: [[du, v0], [du + W, v0], [du + W, v0 + hh], [du, v0 + hh]] });
    B.face(m.pv, [-W / 2, y, 0.004], [W / 2, y, 0.004], [W / 2, y, 0.017], [-W / 2, y, 0.017], { tint: dark(tint, 0.5) });
  }
  for (let u = Math.ceil((du - 0.225) / 0.45) * 0.45 + 0.225; u < du + W - 0.02; u += 0.45) B.box(m.clap, 0.034, h, 0.012, u - du - W / 2, y0, 0.023, { tint, k: 1.06, uv: [u - 0.017, dv], skip: 'ny py nz' });
  for (const sx of [-1, 1]) B.box(m.clap, 0.05, h, 0.03, sx * (W / 2 - 0.025), y0, 0.015, { tint, k: 0.9, skip: 'ny py nz' });
}

// ------------------------------------------------------------------ roofs
const TILE_D = 0.78; // the darker tone of a roof colour for edges, ridges and tile ends
// a J-form tile across its width: the shallow pan, then the round roll on its right (fractions of the width, metres up)
const TILE = [[0, 0], [0.25, -0.012], [0.5, -0.009], [0.62, 0.002], [0.7, 0.026], [0.78, 0.046], [0.86, 0.048], [0.94, 0.028], [1, 0]];
const LIP = 0.028;
/** A sloping tile or tin surface from the low edge (a -> b, left to right seen from below) up to (d <- c). Kawara is
 *  drawn tile by tile when `fine` (every course lapping the one below with its lip, every tile with its curved pan and
 *  roll, smooth), as plain ridged columns when not; anything else is a flat sheet. */
function slope(t, rm, tint, a, b, c, d, ridged, caps = true, fine = false) {
  const B = t.B;
  if (!ridged) { B.face(rm, a, b, c, d, { tint }); return; }
  const wl = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.round(wl / 0.265));
  const sl = Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
  const ex = [(b[0] - a[0]) / wl, (b[1] - a[1]) / wl, (b[2] - a[2]) / wl], up = [(d[0] - a[0]) / sl, (d[1] - a[1]) / sl, (d[2] - a[2]) / sl];
  const nr = [ex[1] * up[2] - ex[2] * up[1], ex[2] * up[0] - ex[0] * up[2], ex[0] * up[1] - ex[1] * up[0]];
  const cw = wl / n, PR = fine ? TILE : [[0, 0], [0.64, 0], [0.74, 0.045], [0.9, 0.05], [1, 0]], nc = fine ? Math.max(1, Math.round(sl / 0.235)) : 1, cl = sl / nc, lip = fine ? LIP : 0;
  const pt = (s, dd, h) => [a[0] + ex[0] * s + up[0] * dd + nr[0] * h, a[1] + ex[1] * s + up[1] * dd + nr[1] * h, a[2] + ex[2] * s + up[2] * dd + nr[2] * h];
  // smooth normals across the tile's curve (leaning a little up the slope with each course's tilt)
  const NK = PR.map((q, k) => { const p0 = PR[Math.max(0, k - 1)], p1 = PR[Math.min(PR.length - 1, k + 1)], g = (p1[1] - p0[1]) / ((p1[0] - p0[0]) * cw || 1), tl = lip / cl; const v = [nr[0] - ex[0] * g + up[0] * tl, nr[1] - ex[1] * g + up[1] * tl, nr[2] - ex[2] * g + up[2] * tl], l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; });
  const P = [], T = [], N = [], dn = [-up[0], -up[1], -up[2]];
  for (let j = 0; j < nc; j++) for (let i = 0; i < n; i++) for (let k = 0; k + 1 < PR.length; k++) {
    const s0 = (i + PR[k][0]) * cw, s1 = (i + PR[k + 1][0]) * cw, r0 = PR[k][1], r1 = PR[k + 1][1], d0 = j * cl, d1 = (j + 1) * cl;
    const A = pt(s0, d0, r0 + lip), Bq = pt(s1, d0, r1 + lip), C = pt(s1, d1, r1), D = pt(s0, d1, r0);
    const u0 = (i + PR[k][0]) * 0.265, u1 = (i + PR[k + 1][0]) * 0.265, v0 = fine ? j * 0.235 : 0, v1 = fine ? (j + 1) * 0.235 : sl;
    P.push(...A, ...Bq, ...C, ...A, ...C, ...D); T.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
    if (fine) N.push(...NK[k], ...NK[k + 1], ...NK[k + 1], ...NK[k], ...NK[k + 1], ...NK[k]); else { const f = flatN(A, Bq, C); for (let q = 0; q < 6; q++) N.push(...f); }
    if (fine) { // the lip: the tile's lower edge standing proud of the course below (the eave course shows its full end)
      const lo = j ? 0 : -0.03, A2 = pt(s0, d0, r0 + lo), B2 = pt(s1, d0, r1 + lo);
      P.push(...A2, ...B2, ...Bq, ...A2, ...Bq, ...A); T.push(u0, v0, u1, v0, u1, v0 + 0.02, u0, v0, u1, v0 + 0.02, u0, v0 + 0.02);
      for (let q = 0; q < 6; q++) N.push(...dn);
    }
  }
  B.tris(fine ? t.m.tileBody : rm, P, T, { tint }, N);
  if (caps) for (let i = 0; i < n; i++) { // 万十: the round boss on the end of every eave tile's roll
    const p = pt((i + 0.83) * cw, 0, 0.02 + lip), dz = Math.sign(a[2] - d[2]) || 1, pts = [];
    for (let k = 0; k < 10; k++) { const an = (k / 10) * Math.PI * 2; pts.push([p[0] + Math.cos(an) * 0.052 * dz, p[1] + Math.sin(an) * 0.052, p[2] + dz * 0.014]); }
    B.poly(t.m.ridge, pts, { tint: dark(tint, 0.88) });
    B.poly(t.m.ridge, pts.map((q, k) => [p[0] + (q[0] - p[0]) * 0.55, p[1] + (q[1] - p[1]) * 0.55, p[2] + dz * 0.022]), { tint: dark(tint, 1.0) });
  }
}
function flatN(a, b, c) { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n) || 1; return [n[0] / l, n[1] / l, n[2] / l]; }

/** 軒樋: a half-round gutter section (open on top, a rolled front bead) along local x, hung on strap brackets. */
export function gutter(t, x0, x1, y, z, tint, brackets = true) {
  const B = t.B, m = t.m, R = 0.056, r = 0.048, pts = [], strap = [];
  for (let k = 0; k <= 10; k++) { const an = Math.PI + (k / 10) * Math.PI; pts.push([Math.cos(an) * R, Math.sin(an) * R]); }
  pts.push([R + 0.008, 0.008], [R - 0.004, 0.012]);
  for (let k = 10; k >= 0; k--) { const an = Math.PI + (k / 10) * Math.PI; pts.push([Math.cos(an) * r, Math.sin(an) * r]); }
  B.extrude(m.pv, pts, x0, x1, { along: 'x', oy: y, oz: z, tint });
  if (!brackets) return;
  for (let k = 0; k <= 8; k++) { const an = Math.PI + (k / 8) * Math.PI; strap.push([Math.cos(an) * (R + 0.007), Math.sin(an) * (R + 0.007)]); }
  strap.push([R + 0.007, 0.03], [R + 0.001, 0.03]);
  for (let k = 8; k >= 0; k--) { const an = Math.PI + (k / 8) * Math.PI; strap.push([Math.cos(an) * (R + 0.001), Math.sin(an) * (R + 0.001)]); }
  strap.push([-R - 0.001, 0.05], [-R - 0.03, 0.05], [-R - 0.03, 0.042], [-R - 0.007, 0.042]);
  const nb = Math.max(2, Math.round((x1 - x0) / 0.9));
  for (let i = 0; i <= nb; i++) { const x = x0 + 0.1 + (x1 - x0 - 0.2) * i / nb; B.extrude(m.metal, strap, x - 0.011, x + 0.011, { along: 'x', oy: y, oz: z, tint: dark(tint, 0.72) }); }
}
/** A curved knee bracket in the y / z plane at local x: an arm of length `out` under height y, a leg down the wall. */
export function bracket(t, x, y, out, drop, tint, th = 0.028) {
  const pts = [[0.012, y - drop], [0.045, y - drop]];
  for (let k = 1; k <= 8; k++) { const an = (k / 8) * Math.PI / 2; pts.push([0.045 + (out - 0.075) * (1 - Math.cos(an)), y - drop + (drop - 0.03) * Math.sin(an)]); }
  pts.push([out, y - 0.03], [out, y], [0.012, y]);
  t.B.extrude(t.m.metal, pts, x - th / 2, x + th / 2, { along: 'x', tint });
}

/** 棟: stacked noshi tiles on a white mortar line, a round cap, onigawara at both ends (along x from x0 to x1). */
function ridgeTiles(t, x0, x1, y, z, tint, full) {
  const B = t.B, m = t.m, c = dark(tint, TILE_D);
  if (!full) { B.box(m.ridge, x1 - x0, 0.16, 0.26, (x0 + x1) / 2, y - 0.03, z, { tint: c }); return y + 0.13; }
  B.box(m.pv, x1 - x0 - 0.04, 0.05, 0.36, (x0 + x1) / 2, y - 0.03, z, { tint: 0xe6e2d8 });
  B.box(m.ridge, x1 - x0, 0.05, 0.32, (x0 + x1) / 2, y + 0.02, z, { tint: c });
  B.box(m.ridge, x1 - x0 + 0.02, 0.05, 0.26, (x0 + x1) / 2, y + 0.07, z, { tint: dark(tint, 0.86) });
  B.rod(m.ridge, [x0 - 0.03, y + 0.12, z], [x1 + 0.03, y + 0.12, z], 0.085, { tint: c, sides: 6 });
  for (const [x, s] of [[x0, -1], [x1, 1]]) {
    B.extrude(m.ridge, [[-0.17, -0.06], [0.17, -0.06], [0.2, 0.14], [0.08, 0.3], [0, 0.36], [-0.08, 0.3], [-0.2, 0.14]], -0.035, 0.035, { along: 'x', ox: x + s * 0.06, oy: y, oz: z, tint: dark(tint, 0.66) });
    B.cyl(m.ridge, 0.06, 0.06, 0.03, x + s * 0.1, y + 0.13, z, { rz: -s * Math.PI / 2, tint: dark(tint, 0.9), sides: 6 });
  }
  return y + 0.21;
}

function roof(t, W, D, yb, o, [wT, cT], lite, seed) {
  const B = t.B, m = t.m, kind = o.roof || 'gable';
  const [rm, rc] = mat(t, o.roofM, [m.kawara, 0x8e929a]);
  const e = o.eave ?? 0.45, es = o.verge ?? 0.3, p = o.pitch ?? (o.rise ?? 0.13) / (o.step ?? 0.3);
  const kaw = rm === m.kawara, ridged = kaw && !lite && o.tiles !== false, edge = dark(rc, TILE_D), barge = o.barge ?? 0x5a4636, th = 0.09;
  const sof = o.soffit ?? (o.rafters ? 0x6a5a48 : 0xcfc8b8), fas = o.fascia ?? (o.rafters ? 0x3e3026 : 0x7a7268);
  if (kind === 'flat') {
    B.box(m.concrete, W + 0.1, 0.5, D + 0.1, 0, yb, -D / 2, { tint: 0xb8b4aa });
    B.box(m.pv, W + 0.18, 0.07, D + 0.18, 0, yb + 0.5, -D / 2, { tint: 0x8a8680 });
    return { ridge: yb + 0.57, eaveY: yb };
  }
  const xl = -W / 2 - es, xr = W / 2 + es, ye = yb - e * p;
  if (kind === 'hip') {
    const a = W / 2 + es, b = D / 2 + e, zc = -D / 2, alongX = a >= b, run = Math.min(a, b), yr = ye + run * p, hl = Math.abs(a - b);
    const P = [[-a, ye, zc + b], [a, ye, zc + b], [a, ye, zc - b], [-a, ye, zc - b]];
    const r0 = alongX ? [-hl, yr, zc] : [0, yr, zc + hl], r1 = alongX ? [hl, yr, zc] : [0, yr, zc - hl];
    if (alongX) {
      B.face(rm, P[0], P[1], r1, r0, { tint: rc }); B.face(rm, P[2], P[3], r0, r1, { tint: rc });
      B.poly(rm, [P[1], P[2], r1], { tint: rc }); B.poly(rm, [P[3], P[0], r0], { tint: rc });
    } else {
      B.face(rm, P[1], P[2], r1, r0, { tint: rc }); B.face(rm, P[3], P[0], r0, r1, { tint: rc });
      B.poly(rm, [P[0], P[1], r0], { tint: rc }); B.poly(rm, [P[2], P[3], r1], { tint: rc });
    }
    // hip and ridge caps, the edge, the soffit
    for (const [c, rr] of [[P[0], r0], [P[1], alongX ? r1 : r0], [P[2], r1], [P[3], alongX ? r0 : r1]]) B.beam(m.ridge, [c[0], c[1] + 0.03, c[2]], [rr[0], rr[1] + 0.03, rr[2]], 0.1, { tint: edge, w: 0.14 });
    B.beam(m.ridge, [r0[0], yr + 0.04, r0[2]], [r1[0], yr + 0.04, r1[2]], 0.12, { tint: edge, w: 0.18 });
    B.box(m.pv, 2 * a, th, 2 * b, 0, ye - th, zc, { tint: fas, skip: 'py' });
    B.box(m.pv, 2 * a - 0.1, 0.02, 2 * b - 0.1, 0, ye - th - 0.02, zc, { tint: sof, skip: 'py' });
    return { ridge: yr + 0.1, eaveY: ye - th, side: es, ridgeZ: zc };
  }
  if (kind === 'shed') { // one slope rising from the front eave to the back
    const zb = -D - e, yt = ye + (D + 2 * e) * p;
    slope(t, rm, rc, [xl, ye, e], [xr, ye, e], [xr, yt, zb], [xl, yt, zb], ridged);
    B.face(m.pv, [xr, ye - th, e], [xl, ye - th, e], [xl, yt - th, zb], [xr, yt - th, zb], { both: true, tint: sof });
    B.face(m.pv, [xl, ye - th, e], [xr, ye - th, e], [xr, ye, e], [xl, ye, e], { both: true, tint: fas });
    B.face(m.pv, [xr, yt - th - 0.06, zb], [xl, yt - th - 0.06, zb], [xl, yt + 0.03, zb], [xr, yt + 0.03, zb], { both: true, tint: fas });
    for (const [x, s] of [[xl, -1], [xr, 1]]) { const q = [[x, ye - th - 0.05, e], [x, yt - th - 0.05, zb], [x, yt + 0.02, zb], [x, ye + 0.02, e]]; B.face(m.pv, ...(s > 0 ? [q[0], q[1], q[2], q[3]] : [q[1], q[0], q[3], q[2]]), { both: true, tint: barge }); }
    if (rm === m.tinroof && !lite) for (let x = xl + 0.1; x < xr; x += 0.455) B.beam(m.pv, [x, ye + 0.02, e], [x, yt + 0.02, zb], 0.035, { tint: dark(rc, 0.9), w: 0.04 });
    // the side walls and the back wall fill up to the slope
    const yA = yb + 0.0, yB = yb + (D + e) * p - e * p;
    for (const s of [-1, 1]) { const x = s * W / 2, q = [[x, yA - 0.02, 0], [x, yA - 0.02, -D], [x, yB, -D]]; B.poly(wT, s > 0 ? q : [q[1], q[0], q[2]], { tint: cT }); }
    B.face(wT, [W / 2, yb, -D], [-W / 2, yb, -D], [-W / 2, yB, -D], [W / 2, yB, -D], { tint: cT });
    return { ridge: yt, eaveY: ye - th, side: es, ridgeZ: zb + 0.3 };
  }
  // gable: the ridge along x over the middle
  const zc = -D / 2, yr = yb + (D / 2) * p, zb = -D - e;
  slope(t, rm, rc, [xl, ye, e], [xr, ye, e], [xr, yr, zc], [xl, yr, zc], ridged, true, ridged);
  slope(t, rm, rc, [xr, ye, zb], [xl, ye, zb], [xl, yr, zc], [xr, yr, zc], ridged && !o.backPlain, false);
  // tile ends along the eaves, the soffits (sloping with the rafters), rafter ends on old houses
  for (const [z, s] of [[e, 1], [zb, -1]]) {
    const q = [[xl, ye - th, z], [xr, ye - th, z], [xr, ye + 0.012, z], [xl, ye + 0.012, z]];
    B.face(m.ridge, ...(s > 0 ? q : [q[1], q[0], q[3], q[2]]), { both: true, tint: kaw ? edge : fas });
    const u = [[xr, ye - th, z], [xl, ye - th, z], [xl, yb - th + 0.02, z - s * e], [xr, yb - th + 0.02, z - s * e]];
    B.face(m.pv, ...(s > 0 ? u : [u[1], u[0], u[3], u[2]]), { both: true, tint: sof });
    if (!lite && s > 0) B.box(m.pv, xr - xl, 0.13, 0.03, 0, ye - th - 0.13, e - 0.02, { tint: fas });
  }
  if (o.rafters && !lite) for (let x = xl + 0.12; x < xr - 0.05; x += 0.45) B.beam(m.wood, [x, ye - th - 0.03, e - 0.03], [x, yb - th - 0.01, 0.02], 0.07, { tint: 0x7a5e48, w: 0.05 });
  // gable walls, barge boards under the verge tiles, a louvred vent
  for (const s of [-1, 1]) {
    const x = s * W / 2, q = [[x, yb - 0.02, 0], [x, yb - 0.02, -D], [x, yr - 0.02, zc]];
    B.poly(wT, s > 0 ? q : [q[1], q[0], q[2]], { tint: cT });
    const xv = s > 0 ? xr : xl;
    for (const [za, zz] of [[e, zc], [zb, zc]]) {
      const lo = [xv, ye - th - 0.1, za], hi = [xv, yr - th - 0.1, zz], hi2 = [xv, yr + 0.02, zz], lo2 = [xv, ye + 0.02, za];
      const front = (za > zz) === (s > 0);
      B.face(m.pv, ...(front ? [lo, hi, hi2, lo2] : [hi, lo, lo2, hi2]), { both: true, tint: barge });
      if (kaw && !lite) B.beam(m.ridge, [xv - s * 0.06, ye + 0.035, za], [xv - s * 0.06, yr + 0.035, zz], 0.05, { tint: edge, w: 0.16 });
    }
    // the verge's underside
    const v = [[x, yb - th + 0.02, 0], [xv, yb - th + 0.02, 0], [xv, yr - th, zc], [x, yr - th, zc]], v2 = [[x, yb - th + 0.02, -D], [xv, yb - th + 0.02, -D], [xv, yr - th, zc], [x, yr - th, zc]];
    B.face(m.pv, ...(s > 0 ? [v[1], v[0], v[3], v[2]] : v), { both: true, tint: sof }); B.face(m.pv, ...(s > 0 ? v2 : [v2[1], v2[0], v2[3], v2[2]]), { both: true, tint: sof });
    if (!lite && yr - yb > 0.9) { B.push(x, 0, zc, s * Math.PI / 2); t.sign('gableVent', 0, yr - 0.75, 0.012, { w: 0.36 }); B.pop(); }
  }
  let ridge;
  if (kaw) ridge = ridgeTiles(t, xl - 0.02, xr + 0.02, yr + 0.02, zc, rc, !lite);
  else { for (const s of [-1, 1]) B.face(rm, ...(s > 0 ? [[xl - 0.03, yr - 0.02, zc + 0.15], [xr + 0.03, yr - 0.02, zc + 0.15], [xr + 0.03, yr + 0.05, zc], [xl - 0.03, yr + 0.05, zc]] : [[xr + 0.03, yr - 0.02, zc - 0.15], [xl - 0.03, yr - 0.02, zc - 0.15], [xl - 0.03, yr + 0.05, zc], [xr + 0.03, yr + 0.05, zc]]), { tint: edge, uvs: [[0, 0], [1, 0], [1, 0.1], [0, 0.1]] }); ridge = yr + 0.05; }
  // 雪止め: a row of snow stops above the front eave (it snows in the north)
  if (ridged) for (let x = xl + 0.4; x < xr - 0.2; x += 0.53) B.box(m.ridge, 0.14, 0.07, 0.03, x, ye + (e + 0.55) * p + 0.03, -0.55, { tint: edge });
  // moss in the lowest courses of old tile roofs
  if (ridged) for (let j = 0; j < 3; j++) { const h = hash2(seed * 7 + j, Math.round(yb * 13 + W)), mx = (h - 0.5) * (xr - xl - 1); if (h < 0.6) B.face(t.dm, [mx - 0.35, ye + 0.07, e - 0.02], [mx + 0.35, ye + 0.07, e - 0.02], [mx + 0.35, ye + 0.07 + 0.3 * p, e - 0.32], [mx - 0.35, ye + 0.07 + 0.3 * p, e - 0.32], { rect: t.atlas.decal.uv('moss'), tint: 0xb8c8a0 }); }
  // a Shōwa solar water heater on the front slope: the collector and its tank on a frame
  if (o.solar !== undefined && !lite) {
    const x = o.solar, ang = Math.atan(p), yat = (z) => ye + (e - z) * p, zc2 = e - 1.15;
    B.box(m.metal, 1.7, 0.07, 1.3, x, yat(zc2) + 0.1, zc2, { rx: ang, tint: 0x8a9096 });
    B.box(m.gloss, 1.6, 0.03, 1.2, x, yat(zc2) + 0.15, zc2, { rx: ang, tint: 0x2a3a52 });
    for (let i = 0; i < 7; i++) B.box(m.metal, 0.02, 0.04, 1.2, x - 0.72 + i * 0.24, yat(zc2) + 0.155, zc2, { rx: ang, tint: 0x9aa4ac });
    const zt = zc2 - 0.86, yt = yat(zt) + 0.36;
    for (const dx of [-0.7, 0.7]) B.box(m.metal, 0.04, 0.34, 0.04, x + dx, yat(zt) + 0.04, zt, { tint: 0x7a8088 });
    B.cyl(m.pv, 0.2, 0.2, 1.85, x - 0.925, yt, zt, { rz: -Math.PI / 2, tint: 0xe4e0d6, sides: 8 });
    B.tube(m.pv, [[x + 0.6, yat(zc2 + 0.55) + 0.2, zc2 + 0.55], [x + 0.6, yat(zt) + 0.3, zt + 0.2], [x + 0.6, yt, zt + 0.15]], 0.02, { tint: 0x2a2a2a, sides: 4 });
  }
  return { ridge, eaveY: ye - th, side: es, ridgeZ: zc };
}

/** A lean-to roof on a wall (pent roofs, door canopies): from the wall at height y, dropping `drop` over `out` metres. */
function lean(t, a, b, y, drop, out, pm, pc, ridged, o = {}) {
  const B = t.B, m = t.m, th = 0.06, edge = dark(pc, TILE_D);
  slope(t, pm, pc, [a, y - drop, out], [b, y - drop, out], [b, y, 0.01], [a, y, 0.01], ridged, true, ridged);
  B.face(m.pv, [b, y - drop - th, out], [a, y - drop - th, out], [a, y - th, 0.01], [b, y - th, 0.01], { both: true, tint: o.soffit ?? 0xc8c0b0 });
  B.face(m.ridge, [a, y - drop - th, out], [b, y - drop - th, out], [b, y - drop + 0.01, out], [a, y - drop + 0.01, out], { both: true, tint: edge });
  for (const [x, s] of [[a, -1], [b, 1]]) { const q = [[x, y - drop - th, out], [x, y - th, 0.01], [x, y + 0.01, 0.01], [x, y - drop + 0.01, out]]; B.face(m.ridge, ...(s > 0 ? q : [q[1], q[0], q[3], q[2]]), { both: true, tint: edge }); }
  B.box(m.pv, b - a, 0.05, 0.03, (a + b) / 2, y, 0.015, { tint: 0x8a8680 }); // flashing against the wall
  if (!o.noBrackets) for (const x of [a + 0.1, b - 0.1]) bracket(t, x, y - drop - th + 0.03, out - 0.06, 0.42, 0x6a6e70);
}

// ------------------------------------------------------------------ windows
/** [floor, u, w, h, kind, opts]: an aluminium sash on the front ('f') or a side wall ('l' / 'r'). */
function window(t, W, D, spec, fy, lite) {
  const B = t.B, m = t.m, [fl, u, w, h, kind, opt = {}] = spec, face = opt.face || 'f';
  const sill = opt.sill ?? (fl ? 0.85 : 0.9), y = fy[fl] + sill;
  if (face === 'f') B.push(u, y, 0, 0); else if (face === 'l') B.push(-W / 2, y, -u, -Math.PI / 2); else B.push(W / 2, y, -u, Math.PI / 2);
  const wp = B.world(0, 0, 0), fc = opt.frame ?? ALU, hk = hash2(Math.round(wp.x * 7 + wp.z * 3), Math.round(y * 5));
  const room = ROOMS[kind] || ROOMS.dark, screen = opt.screen ?? (!lite && !opt.amado && w > 1 && room[0] < 8 && hk > 0.35);
  if (opt.amado) t.sign('amado', 0, 0, 0.03, { w, h, tint: 0xd8d2c4 });
  else {
    const k = Math.floor(hash2(Math.round(wp.x * 3.1), Math.round(wp.z * 2.7 + y * 5)) * 997);
    interiorQuad(B, t.interiorM, 0, 0, 0.022, 0, { w, h, sill, depth: Math.max(1.6, Math.min(3.4, (opt.depth ?? (face === 'f' ? D : W)) - 0.5)),
      kind: opt.room ?? room[0], lit: opt.lit ?? room[1], curtain: opt.curtain ?? room[2], cc: opt.cc ?? (k % 8), seed: k, screen });
  }
  // the frame standing proud of the wall, the two leaves' meeting stiles in two planes, the sill flashing
  const fw = 0.04;
  for (const s of [-1, 1]) B.box(m.metal, fw, h + 2 * fw, 0.07, s * (w / 2 + fw / 2), -fw, 0.03, { tint: fc, skip: 'nz' });
  B.box(m.metal, w, fw, 0.07, 0, h, 0.03, { tint: fc, skip: 'nz' }); B.box(m.metal, w, fw, 0.07, 0, -fw, 0.03, { tint: fc, skip: 'nz' });
  if (!lite) {
    if (!opt.amado) {
      // the leaves: each a frame of stiles and rails round its glass, the right-hand one a track further out
      const leaf = (x0, x1, z, c) => { for (const x of [x0 + 0.016, x1 - 0.016]) B.box(m.metal, 0.032, h, 0.018, x, 0, z, { tint: c, skip: 'py ny nz' }); for (const y of [0, h - 0.034]) B.box(m.metal, x1 - x0 - 0.064, 0.034, 0.018, (x0 + x1) / 2, y, z, { tint: c, skip: 'nz px nx' }); if (h > 1.4) B.box(m.metal, x1 - x0 - 0.064, 0.03, 0.018, (x0 + x1) / 2, h * 0.42, z, { tint: c, skip: 'nz px nx' }); };
      if (w > 0.75) { leaf(-w / 2, 0.016, 0.033, dark(fc, 0.88)); leaf(-0.016, w / 2, 0.052, fc); B.lathe(m.metal, [[0.016, 0], [0.02, 0.006], [0.012, 0.016]], 0, h * 0.5, 0.062, { rx: Math.PI / 2, tint: 0xd8dcde, sides: 6 }); }
      else leaf(-w / 2, w / 2, 0.04, fc);
      if (screen) { const c = 0x6e7478; for (const x of [-w / 2 + 0.012, -0.03]) B.box(m.metal, 0.02, h, 0.01, x, 0, 0.066, { tint: c, skip: 'py ny nz' }); for (const y of [0, h - 0.02]) B.box(m.metal, w / 2 - 0.03, 0.02, 0.01, -w / 4 - 0.009, y, 0.066, { tint: c, skip: 'nz' }); }
    }
    B.extrude(m.metal, [[0, -fw - 0.03], [0.1, -fw - 0.045], [0.104, -fw - 0.03], [0.02, -fw - 0.012], [0, -fw - 0.012]], -w / 2 - 0.07, w / 2 + 0.07, { along: 'x', tint: 0xc8ccd0 });
    if (opt.grille) { // 面格子
      const n = Math.max(3, Math.round(w / 0.11));
      for (let i = 0; i <= n; i++) B.box(m.metal, 0.018, h + 0.1, 0.018, -w / 2 + i * (w / n), -0.05, 0.11, { tint: 0xc4c9cd });
      for (const yy of [-0.03, h + 0.01]) B.box(m.metal, w + 0.06, 0.025, 0.025, 0, yy, 0.11, { tint: ALU });
      for (const s of [-1, 1]) for (const yy of [0.1, h - 0.12]) B.box(m.metal, 0.02, 0.02, 0.1, s * (w / 2 - 0.02), yy, 0.06, { tint: ALU_D });
    }
    if (opt.tobukuro) { const tx = (w / 2 + fw + 0.215) * opt.tobukuro; B.box(m.pv, 0.43, h + 0.1, 0.11, tx, -0.05, 0.055, { tint: opt.tbTint ?? 0xcfc8ba, skip: 'nz' }); t.sign('tobukuro', tx, -0.04, 0.112, { w: 0.41, h: h + 0.08, tint: opt.tbTint ?? 0xffffff }); }
    if (opt.hood) { B.face(m.tinroof, [-w / 2 - 0.16, h + 0.1, 0.34], [w / 2 + 0.16, h + 0.1, 0.34], [w / 2 + 0.16, h + 0.2, 0.01], [-w / 2 - 0.16, h + 0.2, 0.01], { tint: 0x8a9294 }); B.box(m.pv, w + 0.32, 0.03, 0.02, 0, h + 0.075, 0.33, { tint: 0x6a6e70 }); for (const s of [-1, 1]) bracket(t, s * (w / 2 + 0.12), h + 0.1, 0.3, 0.2, 0x6a6e70, 0.02); }
    if (hk < 0.6 && !opt.clean && !opt.flowers) { const dh = 0.4 + hk * 0.7; t.decalQ('drip' + (Math.floor(hk * 10) % 3), 0, -0.1 - dh, t._dz ?? 0.008, { w: w * 0.85, h: dh }); }
    if (opt.sudare) { // a reed blind hung over the window, rolled at the top
      const sh = h * opt.sudare + 0.06;
      B.quadUV(m.reed, w + 0.16, sh, 0, h - sh + 0.06, 0.15, [0, 0, w + 0.16, sh], { tint: 0xe8dcb4, both: true });
      B.rod(m.pv, [-w / 2 - 0.1, h + 0.1, 0.15], [w / 2 + 0.1, h + 0.1, 0.15], 0.035, { tint: 0xc8b47c, sides: 6 });
      for (const s of [-1, 1]) B.box(m.metal, 0.012, 0.1, 0.012, s * (w / 2 - 0.1), h + 0.1, 0.15, { tint: 0x6a6a68 });
    }
    if (opt.flowers) { // a window box
      B.box(m.wood, w * 0.9, 0.15, 0.2, 0, -0.26, 0.18, { tint: 0x9a7458, bevel: 0.012 });
      const n = Math.max(3, Math.round(w * 4)), cols = [0xe5484b, 0xff8fb2, 0xffd23f, 0xfbf8f0, 0x9a6ad8];
      void cols; crown(t, 0, -0.04, 0.18, w * 0.44, 0.12, 0.11, { kind: 'azalea', mix: ['small', 0.4], card: 0.18, flat: -0.3, density: 2.6, seed: n + Math.round(wp.x * 5) });
    }
  }
  B.pop();
}

// ------------------------------------------------------------------ doors
/** Front door: 'genkan' (aluminium sliding lattice doors), 'wood' (an old lattice door), 'west' (a panel door), 'apt'. */
function door(t, d, base, win = [], fy = [base, base + 2.65], lite = false) {
  const B = t.B, m = t.m, kind = d.kind || 'genkan', w = d.w ?? (kind === 'apt' || kind === 'west' ? 0.9 : 1.5), x = d.x, y = base + (d.y ?? 0), H = 2.0;
  const dp = B.world(x, 0, 0), nk = d.name ?? Math.floor(hash2(Math.round(dp.x * 5), Math.round(dp.z * 5)) * NAMES.length), side = d.lamp ?? 1;
  B.push(x, y, 0);
  const fc = kind === 'wood' ? 0x5a4434 : kind === 'west' ? 0xe4e0d6 : 0x9aa0a4;
  if (kind === 'genkan') {
    interiorQuad(B, t.interiorM, 0, 0, 0.018, 0, { w, h: H, sill: 0, depth: 1.6, kind: ROOM.frost, lit: 0.75, curtain: 0, seed: nk + 3 });
    for (let i = 1; i < 6; i++) B.box(m.metal, w, 0.022, 0.02, 0, 0.36 + i * 0.27, 0.035, { tint: fc });
    B.box(m.metal, w, 0.36, 0.02, 0, 0, 0.03, { tint: 0xb0b6b8 });
    B.box(m.metal, 0.04, H, 0.03, -0.02, 0, 0.03, { tint: 0x858c90 }); B.box(m.metal, 0.04, H, 0.03, 0.02, 0, 0.055, { tint: fc });
    for (const s of [-1, 1]) B.box(m.pv, 0.02, 0.14, 0.012, s * 0.08, 0.95, s > 0 ? 0.075 : 0.05, { tint: 0x3a3a38 });
  } else {
    const dt = d.tint ?? (kind === 'wood' ? 0xa88a6a : kind === 'west' ? [0xf0ece2, 0xb8a078, 0x8aa08e][nk % 3] : 0xffffff);
    t.sign(kind === 'wood' ? 'doorWood' : kind === 'west' ? 'doorWest' : 'doorApt', 0, 0, 0.03, { w, h: H, tint: dt });
    if (!lite) doorDetail(t, kind, w, H, dt);
  }
  if (kind !== 'genkan') { // a knob on its rose, a keyhole plate, three hinges on the other edge; a closer on the steel door
    const kx = w / 2 - 0.09, hs = kind === 'wood' ? 0x3a3a38 : 0xc8b070;
    B.lathe(m.gloss, [[0.03, 0], [0.032, 0.006], [0.012, 0.012], [0.012, 0.035], [0.026, 0.045], [0.03, 0.06], [0.022, 0.074], [0.004, 0.078]], kx, 0.98, 0.034, { rx: Math.PI / 2, tint: hs, sides: 8 });
    B.box(m.metal, 0.03, 0.07, 0.006, kx, 1.1, 0.034, { tint: hs, bevel: 0.004 });
    for (const y of [0.22, 1.0, 1.76]) B.lathe(m.metal, [[0.009, 0], [0.009, 0.11]], -w / 2 + 0.004, y, 0.04, { tint: 0x8a8e90, sides: 5, caps: 'tb' });
    if (kind === 'apt') { B.box(m.metal, 0.2, 0.05, 0.05, w / 2 - 0.14, H - 0.12, 0.058, { tint: 0x6a7072, bevel: 0.008 }); B.beam(m.metal, [w / 2 - 0.22, H - 0.09, 0.06], [-0.02, H - 0.02, 0.07], 0.014, { tint: 0x6a7072 }); B.box(m.metal, 0.28, 0.035, 0.012, 0, 1.03, 0.036, { tint: 0xc4c8c8, bevel: 0.004 }); }
  } else for (const s of [-1, 1]) B.lathe(m.metal, [[0.012, 0], [0.014, 0.004], [0.008, 0.012]], s * 0.08, 1.12, s > 0 ? 0.072 : 0.047, { rx: Math.PI / 2, tint: 0xc8b070, sides: 6 });
  for (const s of [-1, 1]) B.box(m.pv, 0.06, H + 0.06, 0.09, s * (w / 2 + 0.03), 0, 0.035, { tint: fc, skip: 'nz' });
  B.box(m.pv, w + 0.12, 0.06, 0.09, 0, H, 0.035, { tint: fc, skip: 'nz' });
  B.pop();
  if (!d.noStep) {
    const tile = d.porch === 'tile';
    B.box(tile ? m.tile : m.concrete, w + 0.5, Math.max(0.1, base - 0.02), 0.6, x, 0, 0.3, { uv: [x, 0], tint: tile ? 0xd8b8a0 : d.porch === 'stone' ? 0xa8a49a : 0xc0bcb2, bevel: 0.015 });
    if (base > 0.25) B.box(m.concrete, w + 0.3, base / 2, 0.3, x, 0, 0.75, { uv: [x, 0.5], tint: 0xb4b0a6, bevel: 0.015 });
  }
  if (!d.noCanopy) lean(t, x - w / 2 - 0.3, x + w / 2 + 0.3, y + 2.4, 0.16, 0.75, m.tinroof, d.canopy ?? 0x8a9294, false, { soffit: 0xb8b4aa });
  const lx = x + (w / 2 + 0.25) * side;
  if (!lite) { const lp = B.world(x, 0, 0.75); t.pool(lp.x, lp.z, 1.25, 0xffc880, 0.42); }
  // porch lamp, 表札, intercom, post, milk box
  B.box(m.pv, 0.1, 0.05, 0.1, lx, y + 2.1, 0.05, { tint: 0x2a2a2a }); B.box(t.G, 0.1, 0.15, 0.08, lx, y + 1.95, 0.06, { tint: 0xffe6b0, bevel: 0.015 }); B.box(m.pv, 0.12, 0.02, 0.1, lx, y + 1.93, 0.06, { tint: 0x2a2a2a });
  B.box(m.wood, 0.13, 0.25, 0.02, lx, y + 1.4, 0.01, { tint: 0x8a6a4a });
  t.sign('name' + (nk % NAMES.length), lx, y + 1.425, 0.022, { w: 0.09 });
  B.box(m.pv, 0.09, 0.14, 0.035, lx, y + 1.17, 0.018, { tint: 0xd8d4ca }); t.sign('intercom', lx, y + 1.175, 0.037, { w: 0.08 });
  if (d.mail) { B.box(m.pv, 0.32, 0.34, 0.13, lx, y + 0.72, 0.065, { tint: d.mail, bevel: 0.015 }); t.sign('mailbox', lx, y + 0.74, 0.132, { w: 0.28, tint: d.mail }); }
  const mx = x - (w / 2 + 0.28) * side;
  const clear = !win.some(([fl, u, ww, , , op = {}]) => fl === 0 && (op.face || 'f') === 'f' && Math.abs(u - mx) < ww / 2 + 0.3 && fy[0] + (op.sill ?? 0.9) < y + 1.3);
  if (d.milk !== false && clear && hash2(nk, Math.round(dp.x)) < 0.6) { B.box(m.woodL, 0.2, 0.24, 0.15, mx, y + 1.0, 0.075, { tint: 0xd8c8a8, bevel: 0.01 }); B.box(m.wood, 0.22, 0.025, 0.17, mx, y + 1.24, 0.08, { tint: 0x9a7a58 }); t.sign('milk', mx, y + 1.08, 0.152, { w: 0.15 }); }
  if (d.umbrella !== false && kind !== 'apt') t.umbrellaStand(x - (w / 2 + 0.2) * side, 0.0, 0.3, nk);
}

// ------------------------------------------------------------------ balconies, washing
const CLOTH = [0xfbf8f0, 0x7aa0d0, 0xe8808a, 0xffdc6a, 0x6ab07a, 0xf4f0e8, 0x3a4a7a, 0xe8c8a0];
/** Things on a line: shirts on hangers, towels, a pinch hanger of socks (pole from x0 to x1 at height y, depth z).
 *  The cloth is its own little mesh hung on the pole's axis, so it sways (Town.swing). */
export function washing(t, x0, x1, y, z, seed, o = {}) {
  const B = t.B, m = t.m, cols = o.colors || CLOTH, small = o.small ? 0.5 : 1;
  B.rod(m.metal, [x0 - 0.12, y, z], [x1 + 0.12, y, z], 0.016, { tint: 0xc8d0d4, sides: 6 });
  for (const x of [x0 - 0.12, x1 + 0.12]) B.cyl(m.pv, 0.02, 0.02, 0.05, x - 0.025, y, z, { rz: -Math.PI / 2, tint: 0x4a8ac8, sides: 6 });
  const C = t.batch();
  let x = x0 + 0.5;
  for (let i = 0; x < x1 - 0.3; i++) {
    const cw = (0.3 + hash2(seed + i, 3) * 0.2) * small, ch = (0.42 + hash2(seed + i, 4) * 0.3) * small, c = cols[Math.floor(hash2(seed + i, 6) * cols.length)], ry = (hash2(i, seed) - 0.5) * 0.3;
    if (hash2(seed + i, 5) < 0.82) {
      C.push(x + cw / 2, 0, 0, ry);
      if (hash2(seed + i, 7) < 0.55 && !o.small) { // a shirt on a hanger: body, sleeves, a collar notch
        C.tube(m.pv, [[0, 0.02, 0], [0, -0.05, 0], [-cw / 2 - 0.08, -0.13, 0]], 0.006, { tint: 0x8a8e90, sides: 4 }); C.tube(m.pv, [[0, -0.05, 0], [cw / 2 + 0.08, -0.13, 0]], 0.006, { tint: 0x8a8e90, sides: 4 });
        const hw = cw / 2, P = [[-hw, -0.08 - ch], [hw, -0.08 - ch], [hw, -0.2], [hw + 0.14, -0.32], [hw + 0.19, -0.26], [hw + 0.09, -0.12], [0.06, -0.06], [0, -0.1], [-0.06, -0.06], [-hw - 0.09, -0.12], [-hw - 0.19, -0.26], [-hw - 0.14, -0.32], [-hw, -0.2]];
        C.extrude(m.pv, P, -0.012, 0.012, { tint: c });
      } else { // a towel folded over the pole, its two falls hanging apart
        C.extrude(m.pv, [[0.022, -ch], [0.034, -ch], [0.03, -0.03], [0.012, 0.012], [-0.012, 0.012], [-0.03, -0.03], [-0.034, -ch * 0.6], [-0.022, -ch * 0.6], [-0.018, -0.03], [0, 0], [0.018, -0.03]], -cw / 2, cw / 2, { along: 'x', tint: c });
      }
      C.pop();
    }
    x += cw + 0.14;
  }
  if (o.pinch !== false) { // ピンチハンガー
    const hx = x0 + 0.22;
    C.tube(m.pv, [[hx, 0, 0], [hx, -0.2, 0]], 0.005, { tint: 0x8a8e90, sides: 4 });
    for (const [dx, dz, w, d] of [[0, -0.13, 0.4, 0.016], [0, 0.13, 0.4, 0.016], [-0.2, 0, 0.016, 0.27], [0.2, 0, 0.016, 0.27]]) C.box(m.pv, w, 0.016, d, hx + dx, -0.21, dz, { tint: 0x7ab0d8 });
    for (let i = 0; i < 6; i++) C.extrude(m.pv, [[-0.022, 0], [0.022, 0], [0.026, 0.09 + (i % 3) * 0.03], [0.05, 0.12 + (i % 3) * 0.03], [0.045, 0.15 + (i % 3) * 0.03], [-0.022, 0.15 + (i % 3) * 0.03]].map(([a, b2]) => [a, -0.23 - b2]).reverse(), -0.005, 0.005, { m: new THREE.Matrix4().makeTranslation(hx - 0.15 + (i % 3) * 0.15, 0, i < 3 ? -0.13 : 0.13), tint: [0xfbf8f0, 0x3a4a7a, 0xe8808a, 0x6ab07a][(i + seed) % 4] });
  }
  t.swing(C, new THREE.Matrix4().multiplyMatrices(B.top, new THREE.Matrix4().makeTranslation(0, y, z)), { ph: seed, amp: o.small ? 1.4 : 1 });
}
/** A futon folded over a rail at height y (rail centre z), held by two big clips. */
export function futon(t, x, y, z, w, col) {
  const B = t.B, m = t.m, pts = [];
  // a quilt's section draped over the rail: two falls and the rounded fold, plump
  for (let k = 0; k <= 8; k++) { const an = Math.PI - (k / 8) * Math.PI; pts.push([Math.cos(an) * 0.115, Math.sin(an) * 0.06 + 0.0]); }
  pts.push([0.125, -0.62], [0.045, -0.64], [0.04, -0.05], [-0.04, -0.05], [-0.045, -0.47], [-0.125, -0.45]);
  B.extrude(m.pv, pts.reverse(), x - w / 2, x + w / 2, { along: 'x', oy: y + 0.02, oz: z, tint: col });
  for (const s of [-1, 1]) { B.box(m.pv, 0.05, 0.13, 0.26, x + s * w * 0.32, y - 0.03, z, { tint: 0x3a8ae0, bevel: 0.02 }); B.lathe(m.pv, [[0.03, 0], [0.03, 0.05]], x + s * w * 0.32 - 0.025, y + 0.12, z, { rz: -Math.PI / 2, tint: 0x2a6ac0, sides: 6, caps: 'tb' }); }
}
export function balcony(t, b, fy1, seed) {
  const B = t.B, m = t.m, w = b.x1 - b.x0, cx = (b.x0 + b.x1) / 2, d = b.d ?? 0.95, rt = b.tint ?? 0xc4c9cd;
  B.box(m.concrete, w + 0.1, 0.14, d, cx, fy1 - 0.14, d / 2, { tint: 0xc4c0b6, uv: [seed, 0] });
  B.box(m.pv, w + 0.12, 0.04, d + 0.02, cx, fy1 - 0.18, d / 2, { tint: 0x8a8680 });
  for (const x of [b.x0 + 0.08, cx, b.x1 - 0.08]) bracket(t, x, fy1 - 0.18, d - 0.08, 0.6, 0x7a7e80, 0.04); // knee brackets
  if (b.panel) {
    B.box(m.pv, w + 0.1, 0.95, 0.04, cx, fy1 + 0.05, d - 0.03, { tint: b.panel });
    for (const sx of [-1, 1]) B.box(m.pv, 0.04, 0.95, d, cx + sx * (w / 2 + 0.03), fy1 + 0.05, d / 2, { tint: b.panel });
    B.box(m.metal, w + 0.16, 0.05, 0.08, cx, fy1 + 1.0, d - 0.03, { tint: ALU });
  } else {
    B.box(m.metal, w + 0.1, 0.05, 0.06, cx, fy1 + 1.0, d - 0.03, { tint: rt }); B.box(m.metal, w + 0.1, 0.035, 0.04, cx, fy1 + 0.1, d - 0.03, { tint: rt });
    const n = Math.round(w / 0.13);
    for (let i = 0; i <= n; i++) B.box(m.metal, 0.02, 0.9, 0.02, b.x0 + i * (w / n), fy1 + 0.1, d - 0.03, { tint: rt, skip: 'py ny' });
    for (const sx of [-1, 1]) { B.box(m.metal, 0.05, 0.05, d, cx + sx * (w / 2 + 0.03), fy1 + 1.0, d / 2, { tint: rt }); B.box(m.metal, 0.035, 0.035, d, cx + sx * (w / 2 + 0.03), fy1 + 0.1, d / 2, { tint: rt }); for (let k = 1; k < 5; k++) B.box(m.metal, 0.02, 0.9, 0.02, cx + sx * (w / 2 + 0.03), fy1 + 0.1, k * d / 5, { tint: rt, skip: 'py ny' }); }
    for (const x of [b.x0 - 0.03, b.x1 + 0.03]) B.box(m.metal, 0.05, 1.0, 0.05, x, fy1, d - 0.03, { tint: rt });
  }
  if (b.laundry !== false) {
    const py = fy1 + 1.85;
    for (const sx of [-1, 1]) { B.box(m.metal, 0.03, 0.03, d * 0.6, cx + sx * (w / 2 - 0.1), py + 0.04, d * 0.3, { tint: 0x9aa0a6 }); B.beam(m.metal, [cx + sx * (w / 2 - 0.1), py + 0.04, d * 0.5], [cx + sx * (w / 2 - 0.1), py - 0.3, 0.02], 0.02, { tint: 0x9aa0a6 }); }
    washing(t, b.x0 + 0.1, b.x1 - 0.1, py, d * 0.55, seed, b);
  }
  if (b.futon) futon(t, cx + (b.futonX ?? 0), fy1 + 1.03, d - 0.03, Math.min(1.5, w - 0.3), b.futon);
  if (b.dish) { B.box(m.metal, 0.03, 0.4, 0.03, b.x1 - 0.15, fy1 + 1.0, d - 0.03, { tint: 0x8a8a88 }); B.lathe(m.pv, [[0.02, 0], [0.16, 0.04], [0.22, 0.1]], b.x1 - 0.15, fy1 + 1.32, d + 0.02, { rx: 1.1, tint: 0xe8e8e0, sides: 10, caps: 'b' }); B.rod(m.metal, [b.x1 - 0.15, fy1 + 1.36, d + 0.06], [b.x1 - 0.15, fy1 + 1.5, d + 0.26], 0.012, { tint: 0x5a5a58, sides: 4 }); }
  for (let i = 0; i < (b.pots || 0); i++) pot(t, b.x1 - 0.25 - i * 0.32, fy1, d - 0.22, 0.85, hash2(seed, i) < 0.5 ? 0x4f8a3a : 0x5c9a44, i % 2 ? 0xe5484b : null);
}

/** A steel roller shutter (w x h, its face at local z): curved slats 75 mm apart, a bottom bar with two hand pulls. */
export function shutter(t, x, y, z, w, h, tint = 0xc8c2b4) {
  const B = t.B, m = t.m, prof = [[-0.006, 0], [0, 0], [0.011, 0.012], [0.016, 0.038], [0.011, 0.064], [0, 0.075], [-0.006, 0.075]];
  for (let k = 0; k * 0.075 < h - 0.1; k++) B.extrude(m.shutter, prof, x - w / 2, x + w / 2, { along: 'x', oy: y + 0.1 + k * 0.075, oz: z, tint, k: k % 7 === 3 ? 0.94 : 1 });
  B.box(m.shutter, w, 0.1, 0.03, x, y, z + 0.006, { tint: dark(tint, 0.85), bevel: 0.006 });
  for (const s of [-1, 1]) B.box(m.metal, 0.12, 0.02, 0.02, x + s * w * 0.28, y + 0.06, z + 0.03, { tint: 0x6a6e70, bevel: 0.006 });
  for (const s of [-1, 1]) B.box(m.metal, 0.05, h, 0.05, x + s * (w / 2 + 0.025), y, z, { tint: 0x8a8e8a });
}

/** A potted plant: a terracotta pot, a faceted clump of leaves, maybe flowers. */
export function pot(t, x, y, z, s = 1, leaf = 0x4f8a3a, flower = null, col = 0xb86a48) {
  const B = t.B, m = t.m;
  B.lathe(m.pv, [[0.08 * s, 0], [0.086 * s, 0.012 * s], [0.12 * s, 0.185 * s], [0.136 * s, 0.19 * s], [0.14 * s, 0.205 * s], [0.136 * s, 0.222 * s], [0.124 * s, 0.222 * s]], x, y, z, { tint: col, sides: 16, caps: 'b' });
  B.cyl(m.dirt, 0.122 * s, 0.122 * s, 0.01, x, y + 0.2 * s, z, { tint: 0x5a4632, sides: 16, caps: 't' });
  void leaf; shrub(t, x, y + 0.17 * s, z, 0.2 * s, flower ? 'azalea' : (Math.round(x * 7 + z * 3) % 2 ? 'small' : 'leaf'), { seed: Math.round(x * 13 + z * 7) });
}

/** A split air conditioner's outdoor unit (0.78 x 0.54 x 0.27), its back to the wall at local z = 0, bottom at y:
 *  casing, fan grille, pipe duct up the wall, a drain hose; on brackets when it hangs (o.hang) or on plastic blocks. */
export function acUnit(t, x, y, z, o = {}) {
  const B = t.B, m = t.m;
  B.push(x, y, z, o.ry || 0);
  if (o.hang) for (const dx of [-0.28, 0.28]) { B.box(m.metal, 0.035, 0.035, 0.4, dx, -0.04, 0.2, { tint: 0x8a8e90 }); B.box(m.metal, 0.035, 0.42, 0.035, dx, -0.42, 0.02, { tint: 0x8a8e90 }); B.beam(m.metal, [dx, -0.05, 0.38], [dx, -0.4, 0.03], 0.025, { tint: 0x8a8e90 }); }
  else for (const dx of [-0.26, 0.26]) B.box(m.pv, 0.1, 0.08, 0.3, dx, -0.08, 0.2, { tint: 0x4a4a4c });
  B.box(m.pv, 0.78, 0.54, 0.27, 0, 0, 0.2, { tint: 0xe4e1d6, bevel: 0.02 });
  t.sign('acFront', 0, 0.01, 0.337, { w: 0.74, h: 0.52 });
  fanGuard(t, -0.098, 0.27, 0.337, 0.205);
  // the top panel's lip, the base pan on its feet, the louvres and the service-valve cover on the right side, the
  // heat-exchanger guard on the left (a dark fin block behind horizontal wires)
  B.box(m.pv, 0.8, 0.018, 0.29, 0, 0.53, 0.2, { tint: 0xeceae2, bevel: 0.006 });
  B.box(m.pv, 0.76, 0.03, 0.25, 0, -0.012, 0.2, { tint: 0xb8b4a8, bevel: 0.006 });
  for (let i = 0; i < 5; i++) B.box(m.pv, 0.012, 0.03, 0.2, 0.392, 0.1 + i * 0.08, 0.2, { tint: 0x9a968a, rz: 0.5 });
  B.box(m.pv, 0.022, 0.15, 0.13, 0.395, 0.02, 0.13, { tint: 0xd8d4c8, bevel: 0.006 });
  B.box(m.pv, 0.004, 0.42, 0.2, -0.392, 0.06, 0.2, { tint: 0x4a5050 });
  for (let i = 0; i < 9; i++) B.box(m.metal, 0.006, 0.006, 0.21, -0.396, 0.08 + i * 0.048, 0.2, { tint: 0xc8c6bc });
  B.box(m.pv, 0.07, o.duct ?? 0.7, 0.06, 0.43, 0.3, 0.03, { tint: 0xe6dfcc });
  B.tube(m.pv, [[0.36, 0.34, 0.14], [0.43, 0.34, 0.08], [0.43, 0.36, 0.04]], 0.03, { tint: 0xe6dfcc, sides: 5 });
  B.tube(m.pv, [[0.43, 0.3, 0.07], [0.45, 0.05, 0.08], [0.42, -0.3 - (o.hang ? 0.3 : -0.26), 0.06]], 0.011, { tint: 0x9a9a94, sides: 4 });
  B.pop();
}

/** Yagi TV antenna on a guyed mast at the ridge. */
function antenna(t, ax, ay, az, seed) {
  const B = t.B, m = t.m, c = 0xb9bfc4;
  B.rod(m.metal, [ax, ay - 0.3, az], [ax, ay + 1.7, az], 0.02, { tint: c, sides: 5 });
  const rot = (seed % 5) * 0.3 - 0.6;
  B.push(ax, ay + 1.55, az, rot);
  B.box(m.metal, 0.025, 0.025, 1.5, 0, 0, 0, { tint: c });
  for (let i = 0; i < 7; i++) B.box(m.metal, 0.62 - i * 0.05, 0.016, 0.016, 0, 0.005, -0.7 + i * 0.22, { tint: 0xc8cdd2 });
  for (const s of [-1, 1]) B.box(m.metal, 0.016, 0.3, 0.016, s * 0.1, -0.15 + 0.01, -0.72, { tint: 0xc8cdd2, rz: s * 0.5 });
  B.pop();
  B.push(ax, ay + 1.1, az, rot + 0.8); B.box(m.metal, 0.02, 0.02, 0.7, 0, 0, 0, { tint: c }); for (let i = 0; i < 4; i++) B.box(m.metal, 0.9 - i * 0.12, 0.014, 0.014, 0, 0.004, -0.3 + i * 0.2, { tint: 0xc8cdd2 }); B.pop();
  for (const [dx, dz] of [[0.9, 0.9], [-0.9, 0.9], [0, -1.1]]) B.rod(m.metal, [ax, ay + 1.2, az], [ax + dx, ay - 0.15 - Math.abs(dz) * 0.3, az + dz], 0.006, { tint: 0x8a8a88, sides: 3, caps: '' });
}

/** Weathering on the lane face: splash-back and moss at the foot, streaks from the eaves, a crack, the block-number
 *  plate, air conditioners on their brackets (o.ac = [[floor, u], ...]). */
function weather(t, W, D, base, fy, top, seed, two, o, zd = 0.007) {
  const B = t.B;
  if (!o.y0) {
    t.decalRow('base', -W / 2, W / 2, base - 0.02, 0.42, o.skirt ? 0.034 : zd + 0.001);
    for (const sx of [-1, 1]) { B.push(sx * W / 2, 0, -D / 2, sx * Math.PI / 2); t.decalRow('base', -D / 2, D / 2, base - 0.02, 0.5, 0.008); B.pop(); }
    if (base) t.decalRow('moss', -W / 2, W / 2, 0, 0.16, 0.04, 0.7);
  }
  for (let i = 0; i < 2; i++) { const k = hash2(seed, i + 3), u = (k - 0.5) * (W - 0.9), dh = 0.9 + k * 1.1; t.decalQ('drip' + ((seed + i) % 3), u, (two ? fy[1] : top) - 0.32 - dh, zd, { w: 0.5 + k * 0.3, h: dh }); }
  if (hash2(seed, 9) < 0.55) t.decalQ('crack', (hash2(seed, 10) - 0.5) * (W - 1.4), fy[0] + 0.5, zd, { w: 0.6, h: 0.6, flip: seed % 2 });
  t.sign('addr' + (seed % 3), (W / 2 - 0.22) * (seed % 2 ? -1 : 1), base + 1.5, zd, {});
  for (const [fl, u] of o.ac || []) acUnit(t, u, fy[fl] + (fl ? 0.34 : 0.08), 0, { hang: !!fl });
}
