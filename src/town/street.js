// The street itself: worn asphalt (paler wheel tracks, a darker crown), patched repairs and a utility trench, the
// white edge lines set in from the gutters so the lane between them is about 4 m, 止まれ and its stop line at the
// alley, the yellow 30, a school-zone legend, gutter lids with hand notches and steel gratings at the driveways, iron
// lids, cracks, puddles, grit along the kerbs; then the lane's dressing (the prop library) and its bounds.
import * as THREE from 'three';
import { hash2 } from '../core/util.js';
import { GARAGE } from '../world/Garage.js';
import { ZB, ZG0, ZG1, ZR1, ZG3, ZF, XT, XE, XW, TZ0, TZ1, WALK, LINE_N, LINE_F, ZP, POLE_X, POLE } from './layout.js';

const WHITE = 0xe6e4dc, YELLOW = 0xe2b840;

export function buildGround(t) {
  const B = t.B, m = t.m;
  // a catch-all ground under everything (no void between lots)
  B.plane(m.dirt, 110, 90, 0, -0.02, 8, { k: 0.8 });
  // the asphalt: brighter where the wheels run, darker along the gutters and the crown
  const mid = (ZG1 + ZR1) / 2, wz = ZR1 - ZG1;
  const wear = (x, z) => { const d = Math.abs(z), g = Math.min(1, (wz / 2 - d) / 0.9); return (0.9 + 0.1 * g) * (1 + 0.05 * Math.exp(-((d - 1.05) ** 2) / 0.12) - 0.04 * Math.exp(-(d * d) / 0.1)) * (0.985 + 0.03 * hash2(Math.round(x * 3), Math.round(z * 5))); };
  B.plane(m.asphalt, 2 * XT, wz, 0, 0, mid, { sx: 26, sz: 16, kf: wear, tint: 0x868482 });
  // near strip (aprons, house fronts; the garage lays its own) and the far paved strip
  for (const sx of [-1, 1]) B.plane(m.concrete, XT - 4.3, ZG0 - 5.2, sx * (XT + 4.3) / 2, 0, (5.2 + ZG0) / 2, { uv: [sx * 0.3, 0], tint: 0xc9c5bb });
  if (!t.garage?.ownsFront) B.plane(m.concrete, 8.6, ZG0 - 5.2, 0, 0, (5.2 + ZG0) / 2, { uv: [0, 0.4], tint: 0xbdb9b0 });
  for (const [a, b] of [[-XT, -9.5], [-7.4, XT]]) B.plane(m.paving, b - a, ZF - ZG3, (a + b) / 2, 0, (ZG3 + ZF) / 2, { uv: [a, 0] });
  // side ditches: concrete lids, steel gratings at driveways and the shop front
  // side ditches: a dark channel, concrete lids one by one (0.6 m, a hand notch at each end), steel gratings at the
  // driveways and the shop front (bearing bars across, a frame every metre)
  const LIDT = [0xb9b5ac, 0xc2beb4, 0xb0aca2, 0xbdb9af, 0xb5b1a8], rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  const gutter = (z0, z1, grates) => {
    const w = z1 - z0;
    B.box(m.pv, 2 * XT, 0.02, w, 0, -0.09, (z0 + z1) / 2, { tint: 0x2c2c2e, skip: 'ny' });
    const lidShape = (L) => { const p = [[0, 0], [L, 0]], r = 0.032, c = w / 2; for (let k = 0; k <= 5; k++) { const an = -Math.PI / 2 + (k / 5) * Math.PI; p.push([L - Math.cos(an) * r, c + Math.sin(an) * r]); } p.push([L, w], [0, w]); for (let k = 0; k <= 5; k++) { const an = Math.PI / 2 - (k / 5) * Math.PI; p.push([Math.cos(an) * r, c + Math.sin(an) * r]); } return p; };
    let x = -XT, n = 0;
    for (const [a, b] of [...grates.sort((p, q) => p[0] - q[0]), [XT, XT]]) {
      for (let s = x; s < a - 0.01; n++) { const e = Math.min(a, s + 0.6), L = e - s - 0.008; B.extrude(m.concrete, lidShape(L), 0, 0.05, { m: new THREE.Matrix4().makeTranslation(s + 0.004, -0.05, z1 - 0.003).multiply(rot), tint: LIDT[(n * 3 + (z0 > 10 ? 2 : 0)) % 5] }); s = e; }
      if (b > a) {
        for (let s = a; s < b - 0.01; s += 1) { const e = Math.min(b, s + 1); for (const [fx, fw] of [[s + 0.012, 0.024], [e - 0.012, 0.024]]) B.box(m.grate, fw, 0.035, w - 0.01, fx, -0.035, (z0 + z1) / 2, { tint: 0x8d9296 }); for (const fz of [z0 + 0.012, z1 - 0.012]) B.box(m.grate, e - s, 0.035, 0.024, (s + e) / 2, -0.035, fz, { tint: 0x8d9296 }); B.box(m.grate, e - s - 0.04, 0.012, 0.012, (s + e) / 2, -0.02, (z0 + z1) / 2, { tint: 0x7d8286 }); }
        for (let s = a + 0.045; s < b - 0.03; s += 0.036) B.box(m.grate, 0.006, 0.028, w - 0.05, s, -0.032, (z0 + z1) / 2, { tint: 0x9aa0a4, skip: 'ny' });
      }
      x = b;
    }
  };
  gutter(ZG0, ZG1, [[-3.4, 3.4], [4.6, 7.6], [9.8, 11.3], [-20.6, -19.4]]);
  gutter(ZR1, ZG3, [[-9.5, -7.4], [10.1, 12.6], [-1.6, -0.9]]);
  // kerbstones along both strips (a rounded nose, worn and chipped by rule), dropped at driveways and doorways
  const kerbs = (z, far, gaps) => {
    const prof = far ? [[0, 0], [0.13, 0], [0.13, 0.048], [0.03, 0.048], [0.012, 0.042], [0, 0.03]] : [[-0.13, 0], [0, 0], [0, 0.03], [-0.012, 0.042], [-0.03, 0.048], [-0.13, 0.048]];
    let x = -XT + 0.4;
    for (const [a, b] of [...gaps.sort((p, q) => p[0] - q[0]), [XT - 0.4, XT]]) {
      for (let s = x; s < a - 0.2;) { const k = hash2(Math.round(s * 9), far ? 3 : 5), e = Math.min(a, s + 0.9 + (k < 0.2 ? 0.3 : 0)); B.extrude(m.concrete, prof, s + 0.004, e - 0.004, { along: 'x', oz: z, tint: k < 0.25 ? 0xaeaaa0 : k > 0.8 ? 0xc6c2b8 : 0xbab6ac, uv: [s, 0] }); s = e; }
      x = b;
    }
  };
  kerbs(ZG0, false, [[-25.9, -25.0], [-20.7, -19.3], [-16.7, -15.4], [-7.6, -5.6], [-4.45, 4.45], [4.45, 7.7], [9.7, 11.4], [18.5, 20.3]]);
  kerbs(ZG3, true, [[-13.5, -11.3], [-9.6, -7.3], [-1.7, -0.8], [10.0, 12.7]]);
  // white edge lines (worn through in places, dashed across the alley mouths), narrowing into the underpasses
  const line = (x0, x1, z, w = 0.15, c = WHITE) => B.box(m.paint, x1 - x0, 0.006, w, (x0 + x1) / 2, 0, z, { tint: c, skip: 'ny' });
  const worn = (x0, x1, z, gaps = []) => {
    for (let x = x0; x < x1;) {
      const g = gaps.find(([a, b]) => x >= a - 0.01 && x < b);
      if (g) { const e = Math.min(x + 0.5, g[1], x1); line(x, e, z); x = e + 0.5; continue; }
      const k = hash2(Math.round(x * 11), Math.round(z * 7)), len = 1.6 + k * 3.2, lim = gaps.reduce((v, [a]) => (a > x + 0.01 && a < v ? a : v), x1), e = Math.min(x + len, lim);
      line(x, e, z, 0.15, k < 0.3 ? 0xd8d6ce : WHITE); x = e + (e < lim && k < 0.45 ? 0.12 + k * 0.5 : 0);
    }
  };
  worn(-24, 24, LINE_N, [[9.6, 11.5]]); worn(-24, 24, LINE_F, [[-9.7, -7.2]]);
  const diag = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0); B.box(m.paint, len, 0.006, 0.15, (x0 + x1) / 2, 0, (z0 + z1) / 2, { ry: -Math.atan2(z1 - z0, x1 - x0), tint: WHITE, skip: 'ny' }); };
  for (const s of [-1, 1]) {
    diag(s * 24, LINE_N, s * XT, 6.95); diag(s * 24, LINE_F, s * XT, 11.4);
    const pin = t.indoor(m.paint);
    B.box(pin, XE - XT + 3, 0.006, 0.15, s * (XT + XE + 3) / 2, 0, 6.95, { tint: WHITE, skip: 'ny' });
    B.box(pin, XE - XT, 0.006, 0.15, s * (XT + XE) / 2, 0, 11.4, { tint: WHITE, skip: 'ny' });
  }
  // the alley's own asphalt, its stop line and 止まれ; the yellow 30s; the school-zone legend
  B.plane(m.asphalt, 2.1, 22.4 - ZG3, -8.45, 0, (ZG3 + 22.4) / 2, { uv: [7, 2], k: 0.96, tint: 0x868482 });
  line(-9.4, -7.5, 15.15, 0.3);
  t.decalG('tomare', -8.45, 16.25, { w: 1.5, d: 1.7 });
  t.decalG('speed30', 15.5, 8.6, { w: 1.1, d: 1.9, ry: -Math.PI / 2 });
  t.decalG('speed30', -17.5, 10.6, { w: 1.1, d: 1.9, ry: Math.PI / 2 });
  t.decalG('schoolPaint', -12.6, 8.55, { w: 1.6, d: 3.6, ry: -Math.PI / 2 });
}

export function buildDressing(t) {
  // vending machines + post box by the lamp (softened glow, one light for the pair)
  t.prop('vending', -0.62, 0, 14.43, Math.PI, { dim: true, block: true });
  t.prop('vending', 0.4, 0, 14.43, Math.PI, { dim: true, block: true });
  const vl = new THREE.PointLight(0xdff0ff, 2.2, 5, 1.6);
  vl.position.set(-0.1, 1.2, 13.4);
  t.add(vl);
  t.vendingLight = vl;
  t.pool(-0.1, 13.4, 1.6, 0xcfe8ff, 0.45);
  t.pool(-16.5, 13.5, 1.5, 0xcfe8ff, 0.4);
  t.pool(-16.05, 6.3, 1.2, 0xcfe8ff, 0.35);
  if (!t.garage?.ownsFront) t.pool(0, 6.6, 3.2, 0xff9a60, 0.35);
  t.pool(-12.45, 14.0, 2.2, 0xfff0c8, 0.5);
  t.prop('post_box', 1.5, 0, 14.3, Math.PI, { block: true });
  t.prop('drink_cans', -1.5, 0, 13.95, 0.3);
  // the garbage station by the shop (contract)
  t.garbageStation = t.single('garbage_station', -6.6, 0, 5.82, 0, { block: true });
  t.prop('weeds', -5.4, 0, 5.42, 0);
  // manholes, a power box, weeds along the walls and under the embankment
  for (const [x, z] of [[3.6, 9.4], [-14.8, 10.1]]) t.prop('manhole', x, 0.001, z, hash2(x, z) * 6);
  t.prop('power_box', 16.7, 0, 5.62, 0, { block: true });
  for (const [x, z] of [[-25.4, 5.45], [25.3, 5.45], [-25.2, 14.75], [25.3, 14.8], [-11.6, 5.45], [12.6, 5.4], [-3.0, 14.75], [9.2, 14.8], [21.2, 14.78], [-24.0, 14.78]]) t.prop('weeds', x, 0, z, hash2(x, z) * 6, { scale: 0.8 + hash2(z, x) * 0.4 });
  for (const s of [-1, 1]) for (const z of [5.7, 13.95]) t.prop('weeds', s * 25.6, 0, z, s, { scale: 1.1 });
  // street lights (one real light by the vending machines)
  for (const [x, z, ry] of [[-2.4, 14.42, Math.PI / 2], [13.6, 14.42, Math.PI / 2], [-19.0, 5.48, -Math.PI / 2], [21.8, 5.5, -Math.PI / 2]]) {
    t.prop('street_light', x, 0, z, ry, { block: true });
    t.pool(x, z + (z > 10 ? -0.9 : 0.9), 3.2, 0xffc880, 0.6);
  }
  const lamp = new THREE.PointLight(0xffc880, 4, 9, 1.5);
  lamp.position.set(-2.4, 3.9, 13.7);
  t.add(lamp);
  t.streetLamp = lamp; // switched by the time of day (applySky), never removed: no shader rebuilds
}

export function buildDetails(t) {
  const B = t.B, m = t.m, P = t.game.player;
  // ---- the road: patch repairs and a utility trench (newer, darker asphalt with tar joints), cracks, lids, puddles
  if (!m.patch) { m.patch = m.patchA.clone(); m.patch.polygonOffset = true; m.patch.polygonOffsetFactor = -2; m.patch.polygonOffsetUnits = -4; m.patch.name = 'patch'; }
  const patchAt = (x, z, w, d, ry = 0, k = 0.8) => { B.plane(m.patch, w, d, x, 0.002, z, { ry, uv: [x * 0.37, z * 0.21], k, tint: 0x7c7a79 }); B.plane(m.paint, w + 0.05, d + 0.05, x, 0.0012, z, { ry, tint: 0x4a4848 }); };
  patchAt(5.3, 9.73, 0.55, 7.2, 0, 0.84);
  patchAt(-10.2, 8.25, 9.4, 0.5, 0, 0.78);
  patchAt(3.6, 9.4, 1.5, 1.5, 0.12);
  patchAt(-20.6, 11.9, 2.2, 1.3, 0.05, 0.86);
  patchAt(12.6, 7.3, 1.7, 1.1, -0.08, 0.76);
  patchAt(-2.9, 12.3, 1.2, 0.9, 0, 0.84);
  patchAt(19.4, 10.6, 0.9, 2.6, 0.3);
  for (const [x, z, sz, r] of [[-22.5, 9.0, 1.4, 0.4], [-16.8, 12.3, 1.1, 2.0], [-6.8, 10.9, 1.5, 1.1], [-1.2, 7.4, 1.0, 2.8], [8.6, 11.6, 1.6, 0.2], [14.3, 9.3, 1.3, 1.9], [22.6, 8.0, 1.5, 0.9], [-12.8, 6.9, 1.0, 1.5], [10.8, 12.9, 0.9, 3.1], [17.6, 7.0, 1.2, 2.4]]) t.decalG('roadCrack', x, z, { w: sz, ry: r });
  for (const [x, z] of [[2.4, 9.6], [-8.3, 9.2], [16.2, 10.4]]) t.decalG('oil', x, z, { w: 0.7 + hash2(x, z) * 0.4, ry: hash2(z, x) * 6 });
  // lids: fire hydrants in their yellow boxes, water valves, square utility covers
  for (const [x, z] of [[-10.6, 12.55], [17.2, 6.85]]) t.decalG('lidHydrant', x, z, { w: 0.9 });
  for (const [x, z] of [[-3.9, 12.95], [7.8, 12.9], [-17.9, 6.6], [21.4, 6.72], [11.2, 6.62], [-24.0, 6.7]]) t.decalG('lidValve', x, z, { w: 0.22, ry: hash2(z, x) * 6 });
  for (const [x, z] of [[-24.2, 12.75], [14.6, 12.92], [-8.0, 6.72], [9.6, 6.62]]) t.decalG('lidSquare', x, z, { w: 0.5, ry: Math.round(hash2(x, 1) * 4) * Math.PI / 2 });
  // rain puddles where the camber dips toward the gutters
  for (const [x, z, w, d, r] of [[-12.0, 12.8, 1.7, 0.9, 0.1], [7.3, 6.75, 1.3, 0.8, -0.2], [19.6, 12.75, 1.9, 0.95, 0.05], [-20.4, 6.8, 1.2, 0.7, 0.3], [1.3, 12.95, 1.0, 0.55, -0.1], [-4.9, 6.75, 0.9, 0.5, 0.2]]) t.puddle(x, z, w, d, r);
  // grit, leaves and fag ends along both kerbs and at the foot of the walls
  for (let x = -XT + 1.5; x < XT; x += 3) {
    t.decalG('grit', x, ZG1 + 0.2, { w: 3, d: 0.4, ry: Math.PI });
    t.decalG('grit', x, ZR1 - 0.2, { w: 3, d: 0.4 });
    if (Math.abs(x) > 5.5) t.decalG('grit', x, ZB + 0.15, { w: 3, d: 0.3, ry: Math.PI, tint: 0xd8d4cc });
    if (x < -15.5 || x > -6) t.decalG('grit', x, ZF - 0.15, { w: 3, d: 0.3, tint: 0xd8d4cc });
  }
  // ---- house-front clutter from the prop library: pots, planters, fire buckets, bicycles, an extinguisher box
  t.prop('pot_cluster', 12.45, 0, 5.5, 0, { block: true, scale: 0.8 });
  t.prop('fire_ext_box', 15.7, 0, 5.5, 0, { block: true });
  t.prop('styro_planter', 15.85, 0, 4.6, 0);
  t.prop('pot_cluster', -19.75, 0, 14.65, Math.PI, { block: true, scale: 0.85 });
  t.prop('fire_buckets', 15.8, 0, 14.62, Math.PI, { block: true });
  t.prop('styro_planter', -24.9, 0, 14.6, Math.PI, { block: true, scale: 0.85 });
  t.prop('fire_ext_box', -20.75, 0, 14.72, Math.PI, { block: true });
  t.prop('mamachari', 22.35, 0, 14.5, -Math.PI / 2 + 0.05, { block: true });
  t.prop('mamachari', -14.55, 0, 5.62, Math.PI / 2 - 0.06, { block: true });
  t.prop('pot_cluster', -21.2, 0, 2.45, 0, { scale: 0.7 });
  // a reed screen (よしず) leaning against the side of the garden house
  B.face(m.reed, [25.92, 0, 2.1], [25.92, 0, 1.1], [25.66, 1.85, 1.1], [25.66, 1.85, 2.1], { tint: 0xe4d8b0, both: true });
  B.rod(m.pv, [25.66, 1.85, 1.05], [25.66, 1.85, 2.15], 0.05, { tint: 0xc8b47c, sides: 6 });
  // stepping stones from the gate to the door in the garden of NW4
  for (const [x, z, r] of [[-22.2, 4.8, 0.2], [-22.05, 4.2, -0.3], [-22.15, 3.6, 0.5], [-21.95, 3.05, 0.1]]) B.blob(m.concrete, x, 0.012, z, 0.26, 0.035, 0.2, { ry: r, tint: 0xb8b4ac, seed: Math.round(z * 10), lo: 0.9, hi: 1.04 });
  // 飛び出し注意 boy at the mouth of alley A2 (a painted cut-out board on a foot)
  t.decalQ('tobidashi', 11.48, 0.03, 5.47, { w: 0.5, cut: true });
  B.box(m.concrete, 0.3, 0.04, 0.2, 11.48, 0, 5.47, { tint: 0xa8a49a });
  P.addObstacle(11.3, 11.66, 5.38, 5.56);
  // the neighbourhood notice board by SAKURA HEIGHTS (wooden posts, a little tin roof)
  for (const dx of [-0.46, 0.46]) B.box(m.wood, 0.08, 1.8, 0.08, 17.45 + dx, 0, 5.52, { tint: 0x9a7a5a, bevel: 0.01 });
  B.box(m.wood, 1.0, 0.68, 0.05, 17.45, 0.97, 5.5, { tint: 0x8a6a4a });
  t.sign('notice', 17.45, 1.01, 5.527, { w: 0.92 });
  for (const s of [-1, 1]) B.face(m.tinroof, [17.45 - 0.6, 1.72, 5.5 + s * 0.24], [17.45 + 0.6, 1.72, 5.5 + s * 0.24], [17.45 + 0.6, 1.84, 5.5], [17.45 - 0.6, 1.84, 5.5], { tint: 0x7fa8a0, both: true });
  P.addObstacle(16.95, 17.95, 5.42, 5.62);
  // a few birds perched on the telecom cable between the poles
  for (const [i, tt] of [[0, 0.4], [0, 0.47], [3, 0.55], [4, 0.3], [4, 0.36], [5, 0.62]]) {
    const a = POLE_X[i], b = POLE_X[i + 1], x = a + (b - a) * tt, y = POLE.tel - 4 * 0.3 * tt * (1 - tt);
    t.prop('pigeon', x, y + 0.02, ZP - 0.17, hash2(i, tt * 10) < 0.5 ? 0.15 : Math.PI - 0.2, { scale: 0.9 });
  }
  // a sprinkle of weeds where the paving meets the walls
  for (let x = -25; x < 25; x += 1.35) {
    const k = hash2(Math.round(x * 10), 7), spots = [];
    if (k < 0.45) spots.push([x + k, ZF - 0.12, Math.PI]);
    if (hash2(Math.round(x * 10), 8) < 0.35 && Math.abs(x) > 4.6) spots.push([x + 0.5, ZB + 0.12, 0]);
    for (const [wx, z, r] of spots) {
      if (z > 10 && ((wx > -6.6 && wx < -4.4) || (wx > -15.6 && wx < -7.2) || (wx > 10.1 && wx < 15.4))) continue; // posters, Mikawa-ya, the driveway
      if (z < 10 && wx > -7.6 && wx < -5.6) continue; // the garbage station
      t.prop('weeds', wx, 0, z, r + hash2(z, wx) * 2, { scale: 0.55 + hash2(wx, 3) * 0.4 });
    }
  }
}

export function buildBounds(t) {
  const P = t.game.player, G = GARAGE;
  // lane ends inside the underpasses
  P.addObstacle(-90, -XW, -60, 60); P.addObstacle(XW, 90, -60, 60);
  for (const s of [-1, 1]) {
    const a = s > 0 ? XT - 0.4 : -XW - 1, b = s > 0 ? XW + 1 : -XT + 0.4;
    P.addObstacle(a, b, -60, TZ0); P.addObstacle(a, b, TZ1, 60);
    // guard rail along the walkway (open at the mouth so you can step up)
    const ra = s > 0 ? XT + 0.55 : -XW - 1, rb = s > 0 ? XW + 1 : -XT - 0.55;
    P.addObstacle(ra, rb, WALK, WALK + 0.12);
  }
  // near building line (walls, yards) except the garage opening and the A2 alley
  // (x > 11.3 is fenced by the park's own bounds and Sakura Heights' walkable yard: src/world/Park.js, Neighbours.js)
  for (const [a, b] of [[-XT, -4.3], [4.3, 9.8]]) P.addObstacle(a, b, -60, ZB);
  P.addObstacle(9.65, 9.85, -60, ZB);
  if (!t.park) { P.addObstacle(11.3, XT, -60, ZB); P.addObstacle(9.6, 11.5, -60, -3.1); }
  // far building line except the corner shop door and the A1 alley
  for (const [a, b] of [[-XT, -15.45], [-7.45, XT]]) P.addObstacle(a, b, ZF, 60);
  P.addObstacle(-9.55, -9.3, ZF, 60); P.addObstacle(-7.5, -7.25, ZF, 60); P.addObstacle(-9.6, -7.2, 22.3, 60);
  P.addObstacle(-15.45, -9.4, 19.95, 60);
  // thrown things stay on the street
  const ph = t.game.physics;
  for (const [cx, cz, hx, hz] of [[-15.15, ZB - 0.3, 10.85, 0.3], [15.15, ZB - 0.3, 10.85, 0.3], [0, ZF + 6, 26, 0.3], [-XW - 0.3, 9.6, 0.3, 4], [XW + 0.3, 9.6, 0.3, 4]]) {
    ph.addBox({ center: new THREE.Vector3(cx, 1.5, cz), half: new THREE.Vector3(hx, 1.5, hz), material: 'concrete' });
  }
  ph.addBox({ center: new THREE.Vector3(0, -0.5, G.maxZ + 7), half: new THREE.Vector3(45, 0.5, 16), material: 'concrete' });
}
