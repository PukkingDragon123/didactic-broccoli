// Small modelled parts for the town's buildings (phase 10 detail pass), drawn into the town batch (src/town/batch.js:
// merged per material, so they cost triangles, not draw calls):
//   corrugated(B, mat, x0, x1, z0, z1, yAt, o)   a corrugated sheet (waves down the slope), both faces, smooth normals
//   carport(t, o)                                 a 1980s aluminium carport: posts on base covers, gutter beam, side
//                                                 beams, braces, rafters, a corrugated polycarbonate roof with its hooks
//                                                 and edge trims, the downpipe and its clamps
//   fanGuard(t, cx, cy, z, R, o)                  an outdoor unit's domed wire fan guard, bezel and hub
//   doorDetail(t, kind, w, H)                     modelled panels, lattice bars, glazing beads, letter plate and door
//                                                 viewer over a painted door leaf (house.js door(), its frame)
// Shapes from reference: Japanese carports of the 1980s-90s (four-post, gutter front beam, 76 mm-pitch sheets on
// hooks), split-AC outdoor units (concentric-ring guards on eight spokes), Shōwa panel / lattice / steel doors.
import * as THREE from 'three';

const _a = new THREE.Color(), _b = new THREE.Color();
/** The colour a painted atlas texel (sRGB hex) comes out as under a vertex tint. */
const mul = (a, b) => _a.setHex(a).multiply(_b.setHex(b)).getHex();

/** A corrugated sheet over [x0, x1] x [z0, z1] at height yAt(z): crests run along z, pitch p, depth d, thickness th. */
export function corrugated(B, mat, x0, x1, z0, z1, yAt, o = {}) {
  const p = o.pitch ?? 0.076, d = o.depth ?? 0.018, th = o.th ?? 0.0025, seg = 8;
  const n = Math.max(2, Math.round(((x1 - x0) / p) * seg)), xs = [], ys = [], nx = [], ny = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, a = ((x - x0) / p) * Math.PI * 2;
    xs.push(x); ys.push((d / 2) * Math.cos(a));
    const dy = -(d / 2) * Math.sin(a) * ((Math.PI * 2) / p), l = Math.hypot(dy, 1);
    nx.push(-dy / l); ny.push(1 / l);
  }
  const ya = yAt(z0), yb = yAt(z1), sl = Math.atan2(yb - ya, z1 - z0), cs = Math.cos(sl), sn = Math.sin(sl);
  const P = [], T = [], N = [];
  // the slope tilts the normal about x: (nx, ny, 0) -> (nx, ny cos, -ny sin)... sign by the slope direction
  const nrm = (i, s) => [nx[i] * s, ny[i] * cs * s, -ny[i] * sn * s];
  for (const s of [1, -1]) {
    const off = s > 0 ? th / 2 : -th / 2;
    for (let i = 0; i < n; i++) {
      const A = [xs[i], ya + ys[i] + off, z0], Bq = [xs[i + 1], ya + ys[i + 1] + off, z0], C = [xs[i + 1], yb + ys[i + 1] + off, z1], D = [xs[i], yb + ys[i] + off, z1];
      const na = nrm(i, s), nb = nrm(i + 1, s);
      // top face winds so its front looks up (+y); the underside the other way
      if (s > 0) { P.push(...A, ...D, ...C, ...A, ...C, ...Bq); N.push(...na, ...na, ...nb, ...na, ...nb, ...nb); }
      else { P.push(...A, ...C, ...D, ...A, ...Bq, ...C); N.push(...na, ...nb, ...na, ...na, ...nb, ...nb); }
      T.push(xs[i], z0, xs[i], z1, xs[i + 1], z1, xs[i], z0, xs[i + 1], z1, xs[i + 1], z0);
    }
  }
  B.tris(mat, P, T, o, N);
  return { xs, ys, crest: (i) => xs[0] + i * p };
}

/** The Suzukis' carport (NE1): four posts at [x, z] (o.posts), a roof from (x0, z0 front at y0) back to (z1 at y1). */
export function carport(t, o) {
  const B = t.B, m = t.m, { x0, x1, zf, zb, yf, yb } = o, AL = o.tint ?? 0xb4b8ba, ALD = 0x8e9496;
  const s = (yb - yf) / (zf - zb), yAt = (z) => yf + (zf - z) * s;
  // posts: chamfered square aluminium on cast base covers, a cap under the beam; a knee brace to the side beam
  for (const [x, z] of o.posts) {
    const top = yAt(z) - 0.135;
    B.box(m.metal, 0.072, top, 0.072, x, 0, z, { tint: AL, bevel: 0.01 });
    B.box(m.metal, 0.11, 0.1, 0.11, x, 0, z, { tint: ALD, bevel: 0.014 });
    B.box(m.metal, 0.095, 0.02, 0.095, x, 0.1, z, { tint: ALD, bevel: 0.006 });
    B.box(m.metal, 0.085, 0.025, 0.085, x, top - 0.025, z, { tint: ALD, bevel: 0.006 });
    const dz = z > (zf + zb) / 2 ? -1 : 1;
    B.beam(m.metal, [x, top - 0.42, z], [x, yAt(z + dz * 0.42) - 0.13, z + dz * 0.42], 0.035, { tint: AL, w: 0.04 });
    for (const yy of [top - 0.4, yAt(z + dz * 0.4) - 0.15]) B.box(m.metal, 0.05, 0.03, 0.05, x, yy, z + (yy > top - 0.2 ? dz * 0.4 : 0), { tint: ALD, bevel: 0.006 });
  }
  // the side beams (along z, following the slope) over the posts
  for (const x of o.beamsX) {
    B.face(m.metal, [x - 0.03, yAt(zb) - 0.135, zb], [x - 0.03, yAt(zf) - 0.135, zf], [x - 0.03, yAt(zf) - 0.012, zf], [x - 0.03, yAt(zb) - 0.012, zb], { tint: AL });
    B.face(m.metal, [x + 0.03, yAt(zf) - 0.135, zf], [x + 0.03, yAt(zb) - 0.135, zb], [x + 0.03, yAt(zb) - 0.012, zb], [x + 0.03, yAt(zf) - 0.012, zf], { tint: AL });
    B.face(m.metal, [x - 0.03, yAt(zb) - 0.135, zb], [x + 0.03, yAt(zb) - 0.135, zb], [x + 0.03, yAt(zf) - 0.135, zf], [x - 0.03, yAt(zf) - 0.135, zf], { tint: ALD });
    for (const zz of [zf, zb]) B.box(m.metal, 0.064, 0.13, 0.012, x, yAt(zz) - 0.137, zz + (zz === zf ? -0.006 : 0.006), { tint: ALD });
  }
  // the front beam: an extruded gutter section (outer face rounded, a channel along the top), end caps
  const zg = zf - 0.02, yg = yf - 0.16;
  const G = [[-0.045, 0], [0.03, 0], [0.05, 0.018], [0.058, 0.07], [0.054, 0.15], [0.046, 0.17], [0.036, 0.17], [0.036, 0.075], [-0.028, 0.075], [-0.028, 0.18], [-0.045, 0.18]];
  B.extrude(m.metal, G.map(([z, y]) => [zg + z, yg + y]), x0 - 0.03, x1 + 0.03, { along: 'x', tint: AL });
  for (const x of [x0 - 0.03, x1 + 0.03]) B.box(m.metal, 0.008, 0.19, 0.115, x, yg - 0.005, zg + 0.006, { tint: ALD, bevel: 0.003 });
  // the back beam: a plain box section the sheet rests on, its end caps
  B.box(m.metal, x1 - x0 + 0.06, 0.1, 0.06, (x0 + x1) / 2, yAt(zb) - 0.11, zb + 0.03, { tint: AL, bevel: 0.008 });
  // rafters across under the sheet
  for (let z = zb + 0.45; z < zf - 0.2; z += 0.52) B.box(m.metal, x1 - x0 - 0.02, 0.04, 0.03, (x0 + x1) / 2, yAt(z) - 0.05, z, { tint: AL, bevel: 0.005 });
  // the sheet: corrugated polycarbonate, its crests down the slope; hooks over a crest every other wave on each rafter
  const sh = corrugated(B, m.gloss, x0, x1, zb - 0.04, zf - 0.03, (z) => yAt(z) - 0.002, { tint: o.sheet ?? 0xbcd0d4 });
  void sh;
  for (let z = zb + 0.45; z < zf - 0.2; z += 1.04) for (let x = x0 + 0.076 * 2; x < x1 - 0.1; x += 0.076 * 4) {
    B.lathe(m.metal, [[0.011, 0], [0.011, 0.004], [0.007, 0.008], [0.002, 0.01]], x, yAt(z) + 0.008, z, { tint: 0xd0d4d6, sides: 6, caps: 'b' });
  }
  // edge trims: a cover along the low (front) edge and the high edge, verge flashings on both sides
  B.box(m.metal, x1 - x0 + 0.04, 0.03, 0.04, (x0 + x1) / 2, yAt(zb - 0.04), zb - 0.04, { tint: ALD, bevel: 0.006 });
  for (const [x, sx] of [[x0, -1], [x1, 1]]) {
    const xa = x + sx * 0.012;
    B.face(m.metal, sx > 0 ? [xa, yAt(zb) - 0.04, zb - 0.06] : [xa, yAt(zf) - 0.04, zf], sx > 0 ? [xa, yAt(zf) - 0.04, zf] : [xa, yAt(zb) - 0.04, zb - 0.06],
      sx > 0 ? [xa, yAt(zf) + 0.028, zf] : [xa, yAt(zb) + 0.028, zb - 0.06], sx > 0 ? [xa, yAt(zb) + 0.028, zb - 0.06] : [xa, yAt(zf) + 0.028, zf], { tint: AL, both: true });
    B.face(m.metal, [xa - sx * 0.03, yAt(zb) + 0.028, zb - 0.06], [xa - sx * 0.03, yAt(zf) + 0.028, zf], [xa, yAt(zf) + 0.028, zf], [xa, yAt(zb) + 0.028, zb - 0.06], { tint: ALD, both: true });
  }
  // the downpipe: from the gutter's outlet at one end, a swan neck to the post, down it on clamps, a shoe at the foot
  const [px, pz] = o.pipe, gx = px + 0.09, ox = pz + 0.07;
  B.lathe(m.metal, [[0.028, 0], [0.028, 0.03], [0.022, 0.04]], gx, yg - 0.035, zg, { tint: AL, sides: 8, rx: Math.PI });
  B.tube(m.pv, [[gx, yg - 0.03, zg], [gx, yg - 0.12, zg], [gx - 0.02, yg - 0.2, zg - 0.08], [px + 0.06, yg - 0.3, ox], [px + 0.06, yg - 0.38, ox], [px + 0.06, 0.2, ox], [px + 0.07, 0.07, ox + 0.05], [px + 0.075, 0.04, ox + 0.12]], 0.024, { tint: 0xc8c4b8, sides: 6 });
  for (const yy of [0.5, 1.2, 1.85]) {
    B.box(m.metal, 0.064, 0.022, 0.064, px + 0.06, yy, ox, { tint: 0x9a9e9a, bevel: 0.006 });
    B.box(m.metal, 0.03, 0.018, 0.03, px + 0.035, yy + 0.002, ox - 0.03, { tint: 0x9a9e9a });
  }
}

/** A split AC outdoor unit's fan guard, its centre (cx, cy) on a front face at z (looking +z), radius R. */
export function fanGuard(t, cx, cy, z, R, o = {}) {
  const B = t.B, m = t.m, wire = o.tint ?? 0xdedbd0, dome = o.dome ?? 0.026, seg = 28;
  const zr = (r) => z + 0.004 + dome * (1 - (r / R) ** 2);
  // the casing's rolled bezel round the opening
  B.lathe(m.pv, [[R + 0.004, 0], [R + 0.01, 0.006], [R + 0.02, 0.006], [R + 0.026, 0]], cx, cy, z, { rx: Math.PI / 2, tint: o.bezel ?? 0xe4e1d6, sides: 16, exact: true });
  for (const r of [0.045, 0.078, 0.111, 0.144, 0.177, R - 0.004]) {
    const pts = []; for (let k = 0; k <= seg; k++) { const a = (k / seg) * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, zr(r)]); }
    B.tube(m.metal, pts, 0.0026, { tint: wire, sides: 4 });
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2, c = Math.cos(a), s = Math.sin(a), pts = [];
    for (const r of [0.03, 0.09, 0.15, R]) pts.push([cx + c * r, cy + s * r, zr(r) + 0.003]);
    B.tube(m.metal, pts, 0.0032, { tint: wire, sides: 4 });
  }
  // the hub badge and the fan's spinner behind it
  B.lathe(m.pv, [[0.034, 0], [0.034, 0.004], [0.028, 0.009], [0.012, 0.012], [0, 0.0125]], cx, cy, zr(0.03), { rx: Math.PI / 2, tint: wire, sides: 12 });
  B.lathe(m.pv, [[0.05, 0], [0.04, 0.012], [0.02, 0.018], [0, 0.02]], cx, cy, z - 0.004, { rx: Math.PI / 2, tint: 0x4a4e50, sides: 10 });
  // the fan's three swept blades behind the guard (dark grey plastic)
  for (let k = 0; k < 3; k++) {
    const a0 = (k / 3) * Math.PI * 2 + 0.4, P = [];
    for (let i = 0; i <= 4; i++) { const a = a0 + i * 0.22, r1 = 0.05 + i * 0.002, r2 = R * (0.86 - Math.abs(i - 2) * 0.04); P.push([Math.cos(a - 0.1) * r1, Math.sin(a - 0.1) * r1, Math.cos(a + 0.18) * r2, Math.sin(a + 0.18) * r2]); }
    for (let i = 0; i < 4; i++) {
      const [ax, ay, bx, by] = P[i], [cx2, cy2, dx, dy] = P[i + 1], zz = z + 0.002, zt = z + 0.009;
      B.face(m.pv, [cx + ax, cy + ay, zz], [cx + bx, cy + by, zt], [cx + dx, cy + dy, zt], [cx + cx2, cy + cy2, zz], { tint: 0x5a5e60, both: true });
    }
  }
}

/** Modelled parts over a painted door leaf ('west' panel door, 'apt' steel door, 'wood' lattice sliding pair) of width
 *  w and height H, its face at z = 0.03 (house.js door(): drawn in the door's frame, bottom centre at the origin). */
export function doorDetail(t, kind, w, H, tint = 0xffffff) {
  const B = t.B, m = t.m, z = 0.03;
  if (kind === 'west') { // atlas doorWest: 152 x 320 px over w x H
    const X = (px) => -w / 2 + (px / 152) * w, Y = (py) => H - (py / 320) * H;
    const frameT = mul(0xdcd6c8, tint);
    for (const [px, py, pw, ph, glass] of [[18, 18, 50, 110, true], [84, 18, 50, 110], [18, 150, 50, 150], [84, 150, 50, 150]]) {
      const x0 = X(px), x1 = X(px + pw), y1 = Y(py), y0 = Y(py + ph), mo = 0.014;
      // the bolection moulding round the panel: four chamfered sticks, mitred by overlap
      B.box(m.pv, x1 - x0, mo, 0.012, (x0 + x1) / 2, y1 - mo, z + 0.006, { tint: frameT, bevel: 0.004, k: 1.02 });
      B.box(m.pv, x1 - x0, mo, 0.012, (x0 + x1) / 2, y0, z + 0.006, { tint: frameT, bevel: 0.004, k: 0.9 });
      for (const x of [x0 + mo / 2, x1 - mo / 2]) B.box(m.pv, mo, y1 - y0, 0.012, x, y0, z + 0.006, { tint: frameT, bevel: 0.004, k: 0.95 });
      if (glass) { // the glazing beads of the small light, and its cross bar
        const gx0 = X(24), gx1 = X(62), gy1 = Y(28), gy0 = Y(88);
        for (const yy of [gy0, gy1 - 0.008]) B.box(m.pv, gx1 - gx0, 0.008, 0.008, (gx0 + gx1) / 2, yy, z + 0.004, { tint: frameT, k: 0.92 });
        B.box(m.pv, 0.008, gy1 - gy0, 0.01, (gx0 + gx1) / 2, gy0, z + 0.005, { tint: frameT, k: 0.95 });
      } else B.box(m.pv, x1 - x0 - 2 * mo - 0.02, y1 - y0 - 2 * mo - 0.02, 0.008, (x0 + x1) / 2, y0 + mo + 0.01, z + 0.004, { tint: frameT, bevel: 0.006 }); // the raised field
    }
    // the letter plate: a brass flap in its frame
    B.box(m.gloss, X(102) - X(50), 0.05, 0.01, (X(50) + X(102)) / 2, Y(144), z + 0.005, { tint: 0xc8a860, bevel: 0.003 });
    B.box(m.gloss, X(98) - X(54), 0.022, 0.012, (X(50) + X(102)) / 2, Y(144) + 0.016, z + 0.009, { tint: 0xd8bc70, bevel: 0.004 });
  } else if (kind === 'apt') { // atlas doorApt: 136 x 312 px
    const X = (px) => -w / 2 + (px / 136) * w, Y = (py) => H - (py / 312) * H;
    // the door viewer, the newspaper slot with its hinged flap, the name card holder
    B.lathe(m.gloss, [[0.014, 0], [0.014, 0.006], [0.01, 0.01], [0.005, 0.011], [0, 0.011]], X(68), Y(96), z, { rx: Math.PI / 2, tint: 0xb8bcbc, sides: 10 });
    B.box(m.metal, X(100) - X(36), Y(150) - Y(166), 0.008, (X(36) + X(100)) / 2, Y(166), z + 0.004, { tint: 0xc4c8c8, bevel: 0.003 });
    B.box(m.metal, X(96) - X(40), 0.03, 0.014, (X(36) + X(100)) / 2, Y(166) + 0.012, z + 0.01, { tint: 0xd0d4d4, bevel: 0.004, rx: -0.12 });
    B.box(m.metal, X(92) - X(44), Y(60) - Y(80) + 0.01, 0.006, (X(44) + X(92)) / 2, Y(80) - 0.005, z + 0.003, { tint: 0xb8bcbc, bevel: 0.002 });
    // the steel leaf's pressed edge and the drip at its foot
    B.box(m.metal, w - 0.02, 0.025, 0.016, 0, 0.0, z + 0.008, { tint: 0x7a8486, bevel: 0.004 });
  } else if (kind === 'wood') { // atlas doorWood: 176 x 320 px: two sliding leaves, lattice over glass, a solid lower panel
    const X = (px) => -w / 2 + (px / 176) * w, Y = (py) => H - (py / 320) * H, c = mul(0xcfc7b8, tint);
    for (let i = 0; i < 12; i++) { const x = X(12 + i * 13.2 + 2.5); B.box(m.wood, 0.016, Y(10) - Y(210), 0.016, x, Y(210), z + 0.012, { tint: c, k: 0.96, bevel: 0.003 }); }
    B.box(m.wood, X(166) - X(10), Y(105) - Y(113), 0.022, 0, Y(113), z + 0.012, { tint: c, k: 0.92, bevel: 0.004 });
    B.box(m.wood, X(166) - X(10), 0.03, 0.022, 0, Y(218), z + 0.012, { tint: c, k: 0.9, bevel: 0.004 });
    for (const yy of [Y(226), Y(306)]) B.box(m.wood, X(166) - X(10) - 0.02, 0.012, 0.01, 0, yy, z + 0.006, { tint: c, k: 1.02 });
    // the meeting stiles of the two leaves (one in front of the other) and the screw lock
    B.box(m.wood, 0.03, H - 0.01, 0.03, -0.012, 0, z + 0.014, { tint: c, k: 0.88, bevel: 0.004 });
    B.box(m.wood, 0.03, H - 0.01, 0.03, 0.018, 0, z + 0.03, { tint: c, k: 0.95, bevel: 0.004 });
    B.lathe(m.gloss, [[0.012, 0], [0.012, 0.01], [0.006, 0.018], [0.006, 0.03], [0.012, 0.034], [0, 0.036]], 0.04, Y(165), z + 0.044, { rx: Math.PI / 2, tint: 0xc8b070, sides: 8 });
  }
}
