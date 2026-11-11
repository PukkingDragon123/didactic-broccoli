// Behind the near-side houses: alley A2 (between NE1 and NE2) opened up into a back passage that turns east into
// the neighbourhood children's park (上山町児童公園), the little back street along its south side, the mangaka's
// white Western-style villa facing the park (岸辺 on the gate), a vacant lot with concrete pipes, and the tall wall of
// an old warehouse closing it all off on the west (the museum lot behind the garage stays out of sight).
//
// Layout (metres, world): passage x∈[9.8,11.3] from the lane (z=5.3) to z=-4.93, turning east through a 1.4 m gap
// (z∈[-4.93,-3.5]) into the entrance plaza x∈[11.3,16.6], z∈[-5.8,-3.5]; the park proper x∈[11.6,25.6],
// z∈[-17.6,-5.8]; an exit gap in the south fence (x∈[17.6,19.0]) onto the back street z∈[-19.95,-17.75]; the villa
// lot x∈[11.45,20.2] and the vacant lot x∈[20.35,26] south of the street. The warehouse face is at x=11.45
// (z∈[-23,-4.93]) and the railway retaining wall at x=26.
//   buildPark(town) -> { spots, route, bounds, entrance, gate }
import * as THREE from 'three';
import { hash2 } from '../core/util.js';
import { townPix } from '../gfx/textures.js';

export const PARK = {
  ax0: 9.8, ax1: 11.3, wx: 11.45, x0: 11.6, x1: 25.6, zN: -5.8, zP: -3.5, xP: 16.6, zS: -17.6,
  exit: [17.6, 19.0], sz0: -17.75, sz1: -19.95, gateX: 16.5,
};
const ZB = 5.3;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildPark(t) {
  const P = PARK, B = t.B, m = t.m, pl = t.game.player;
  const ob = (a, b, c, d) => pl.addObstacle(a, b, c, d);
  const mats = parkMats(t);

  passage(t, mats);
  warehouse(t, mats);

  // ---------------------------------------------------------------- ground: plaza paving, the park's masa-do, planting strips
  B.plane(m.strip, P.xP - P.ax1, P.zP - P.zN, (P.ax1 + P.xP) / 2, 0.003, (P.zP + P.zN) / 2, { uv: [3, 1], k: 0.95 });
  B.plane(mats.dirt, P.x1 + 0.4 - P.x0, P.zN - P.zS, (P.x0 + P.x1 + 0.4) / 2, 0.003, (P.zN + P.zS) / 2, { uv: [0.3, 0.7] });
  B.plane(mats.dirt, 26 - P.xP, -3.2 - P.zN, (26 + P.xP) / 2, 0.002, (-3.2 + P.zN) / 2, { k: 0.85 }); // back gardens behind the fence
  for (const [x0, x1, z0, z1] of [[16.6, 20.75, -6.75, -5.8], [24.9, 25.95, -17.6, -8.7], [11.6, 13.0, -17.6, -14.3]]) B.plane(m.grass, x1 - x0, z1 - z0, (x0 + x1) / 2, 0.01, (z0 + z1) / 2, { uv: [x0, z0], k: 0.95 });
  // worn paths: entrance → swings, entrance → exit (darker, compacted)
  const worn = t.M('gravel', { roughness: 1, color: 0xb8a684, ppm: 28, decal: true });
  for (const [x, z, w, d, r] of [[14.2, -6.9, 1.1, 3.6, 0.9], [17.3, -9.6, 1.0, 5.2, 0.45], [18.3, -15.6, 1.1, 3.8, 0.05]]) B.plane(worn, w, d, x, 0.004, z, { ry: r });
  B.plane(t.decal('chalk', 64, 64), 2.2, 2.2, 18.9, 0.006, -7.75, { unit: true, ry: 0.15, tint: 0xe8e4dc });
  t.puddle(21.0, -7.0, 1.0, 0.6, 0.3);
  t.puddle(14.4, -16.3, 1.4, 0.8, -0.2);

  fences(t, mats);
  playground(t, mats);
  toilet(t, mats);
  furniture(t, mats);
  backsOfHouses(t);
  backStreet(t, mats);
  villa(t, mats);
  vacantLot(t, mats);

  // second row beyond the back street (roofs over the villa from the park)
  for (const [x, w, h] of [[13.4, 5.6, 7.2], [18.9, 5.0, 6.2], [23.6, 4.4, 7.4]]) t.backHouse(x, -30.2, w, 7, h, 1);

  // ---------------------------------------------------------------- bounds (player) and walls for thrown things
  ob(9.6, P.x0, -60, -4.93); // passage end + warehouse (the museum lot beyond)
  ob(P.ax1 - 0.05, P.xP + 0.15, P.zP, ZB); // NE2's lot (and the passage's east side)
  ob(P.xP, 22.65, P.zN, 2.2); // NE3 (Sakura Heights) building + back garden; its front yard stays walkable
  ob(22.6, 28.5, P.zN, ZB); // NE4
  ob(P.x0 - 0.2, P.exit[0], P.zS - 0.15, P.zS + 0.12); ob(P.exit[1], 26, P.zS - 0.15, P.zS + 0.12); // park south fence
  ob(11.3, 26, -60, P.sz1); // villa lot + vacant lot
  const ph = t.game.physics, wall = (x0, x1, z0, z1) => ph.addBox({ center: V((x0 + x1) / 2, 1.5, (z0 + z1) / 2), half: V((x1 - x0) / 2, 1.5, (z1 - z0) / 2), material: 'concrete' });
  ph.addBox({ center: V(18, -0.5, -12.4), half: V(8.6, 0.5, 9.0), material: 'concrete' });
  wall(9.55, 9.8, -5, 5.0); wall(11.3, 11.55, P.zP, 5.0); wall(9.8, 11.45, -5.2, -4.93); wall(11.2, 11.45, -30, -4.93);
  wall(11.3, 16.6, -3.5, -3.2); wall(16.6, 16.9, -5.8, -3.2); wall(16.6, 26, -6.0, -5.8); wall(25.7, 26.2, -23, -5.8); wall(11.45, 26, -20.25, -19.95);

  // ---------------------------------------------------------------- hangout spots for NPCs (rotY: a model facing +z at 0)
  const spot = (x, z, rotY, extra = {}) => ({ pos: V(x, 0, z), rotY, ...extra });
  const spots = {
    rohan_sketch: spot(12.22, -9.4, Math.PI / 2, { seat: 0.42, note: 'west bench, sketching the swings and the tower' }),
    rohan_gate: spot(P.gateX, -19.5, 0, { note: 'outside his own gate, facing the park' }),
    josuke_hang: spot(15.15, -4.05, -Math.PI / 2, { note: 'leaning at the plaza vending machines' }),
    okuyasu_hang: spot(15.15, -5.12, -Math.PI / 2, { note: 'beside josuke_hang' }),
    park_bench: spot(15.9, -16.75, 0, { seat: 0.42, note: 'south bench by the sandbox, facing into the park' }),
    park_swings: spot(20.08, -12.2, 0, { seat: 0.44, note: 'on the west swing seat' }),
    park_entrance: spot(12.0, -5.2, Math.PI / 2),
    park_sandbox: spot(14.9, -10.75, 0),
    park_slide: spot(24.35, -9.6, Math.PI),
  };
  // a walk for anyone who wants to stroll in from the lane and round the park and back (optional)
  const route = [V(10.55, 0, 7.3), V(10.55, 0, 4.6), V(10.5, 0, -4.2), V(12.6, 0, -4.4), V(13.6, 0, -7.0), V(17.6, 0, -8.6), V(18.4, 0, -15.6),
    V(23.0, 0, -15.8), V(23.2, 0, -9.6), V(17.8, 0, -7.0), V(13.0, 0, -5.2), V(10.5, 0, -4.2), V(10.55, 0, 7.3)];
  return { spots, route, bounds: { minX: P.x0, maxX: P.x1, minZ: P.zS, maxZ: P.zN }, entrance: V(11.45, 0, -4.2), gate: V(P.gateX, 0, -19.95) };
}

// ------------------------------------------------------------------ materials
function parkMats(t) {
  if (t._parkMats) return t._parkMats;
  const map = townPix('fenceMesh', 16, 16).texture();
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const fence = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.6, metalness: 0.2, alphaTest: 0.35, side: THREE.DoubleSide });
  // unlit, vertex-coloured paint for the lamp-lit studio seen through the villa's window
  const flat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const flatBack = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  return (t._parkMats = {
    fence, flat, flatBack,
    dirt: t.M('gravel', { roughness: 1, color: 0xd6c6a2, ppm: 30 }),
    sand: t.M('gravel', { roughness: 1, color: 0xf0dcb0, ppm: 56, bump: 0.4 }),
    stucco: t.M('plaster', { roughness: 0.92, color: 0xf6f3ec, ppm: 48 }),
    slate: t.M('roofTile', { roughness: 0.45, metalness: 0.2, color: 0x5c6270 }),
    tile: t.M('tile', { roughness: 0.5, color: 0xd8d2c4, ppm: 64 }),
    floor: t.M('woodFloor', { roughness: 0.7 }),
  });
}

/** Fence mesh panel between two points on the ground (h tall, from y0). */
function meshPanel(t, mats, x0, z0, x1, z1, y0, h) {
  const len = Math.hypot(x1 - x0, z1 - z0), ry = -Math.atan2(z1 - z0, x1 - x0);
  t.quadUV(mats.fence, len, h, (x0 + x1) / 2, y0, (z0 + z1) / 2, [0, 0, len / 0.25, h / 0.25], { ry, tint: 0x9ab89a });
}

// ------------------------------------------------------------------ the passage (alley A2)
function passage(t, mats) {
  const B = t.B, m = t.m, P = PARK;
  B.plane(m.strip, P.ax1 - P.ax0, 5.2 + 4.93, (P.ax0 + P.ax1) / 2, 0.002, (5.2 - 4.93) / 2, { uv: [2, 2], k: 0.85 });
  // a covered drain along the west side, its lids, a water-meter lid
  B.box(m.lid, 0.26, 0.012, 9.9, P.ax0 + 0.13, 0, 0.18, { uv: [0, 0.5] });
  B.plane(t.decal('lidSquare', 24, 24, 0.6), 0.4, 0.4, 10.9, 0.006, -1.8, { unit: true });
  B.plane(t.decal('lidValve', 12, 12, 0.6), 0.22, 0.22, 10.2, 0.006, 3.4, { unit: true });
  // side walls where the yards meet the passage, the closing wall behind NE2's back garden
  for (const [x, z0, z1, h] of [[P.ax0 - 0.075, 1.4, ZB - 0.15, 1.3], [P.ax1 + 0.075, 3.9, ZB - 0.15, 1.3], [P.ax1 + 0.075, P.zP, -2.85, 1.6], [P.ax0 - 0.075, -4.93, -4.75, 1.8]]) {
    B.box(m.block, 0.15, h, z1 - z0, x, 0, (z0 + z1) / 2, { uv: [z0 * 0.7, 0], ao: 0.15 });
    B.box(m.found, 0.21, 0.07, z1 - z0 + 0.02, x, h, (z0 + z1) / 2);
  }
  // NE2's back-garden wall along the plaza (its back windows peek over it)
  t.blockWall(P.ax1, P.xP, P.zP, -1, { h: 1.6, pillars: false });
  // passage clutter: the old twin-tub against NE1, an AC unit on NE2's side, pots, a hose reel, bamboo laundry pole overhead
  t.prop('twin_tub', 10.13, 0, -1.55, Math.PI / 2, { block: true, pad: 0 });
  t.prop('ac_unit', 11.12, 0, -0.35, -Math.PI / 2, { block: true, pad: 0 });
  t.prop('plant_pots', 10.0, 0, 3.55, Math.PI / 2, { scale: 0.6 });
  t.prop('weeds', 11.15, 0, -3.3, 0.8, { scale: 0.7 });
  t.prop('weeds', 9.95, 0, -4.6, 2.2, { scale: 0.8 });
  t.prop('stray_cat_sit', 11.0, 1.4, 2.62, -Math.PI / 2 + 0.4);
  {
    const y = 4.35, z = 0.35;
    B.box(m.pv, 1.72, 0.05, 0.05, 10.55, y, z, { tint: 0xc8b070 });
    for (const x of [9.72, 11.38]) B.box(m.metal, 0.06, 0.06, 0.22, x, y - 0.04, z, { tint: 0x7a7a78 });
    const cols = [0xfbf8f0, 0x2a3a6a, 0xe86a7a, 0xfbf8f0, 0xffd23f];
    cols.forEach((c, i) => B.box(m.pv, 0.22 + hash2(i, 9) * 0.12, 0.38 + hash2(i, 8) * 0.3, 0.03, 9.95 + i * 0.3, y - 0.42 - hash2(i, 8) * 0.3, z, { tint: c, ry: (hash2(i, 7) - 0.5) * 0.4 }));
  }
  // garden hose reel and a watering can by NE1's wall, a cobwebby electric meter on NE2's side wall
  B.box(m.pv, 0.12, 0.4, 0.4, 9.88, 0, 2.6, { tint: 0x3a8a4a });
  B.box(m.pv, 0.06, 0.3, 0.3, 9.86, 0.05, 2.6, { tint: 0x2a6a3a });
  t.prop('watering_can', 10.05, 0, 2.05, 0.6, { scale: 0.9 });
  B.box(m.pv, 0.06, 0.36, 0.26, 11.32, 1.4, 1.2, { tint: 0xc8c4bc });
  B.box(m.gloss, 0.02, 0.1, 0.14, 11.29, 1.52, 1.2, { tint: 0x2a2a2a });
  // direction signs: on NE1's wall at the mouth (alley to the right) and on the warehouse at the turn
  t.sign('parkArrow', 0.48, 0.16, 9.42, 0.86, ZB + 0.012);
  t.sign('parkArrow', 0.6, 0.2, 10.55, 1.75, -4.89);
  t.sign('enamelSoap', 0.26, 0.7, 9.58, 1.6, -3.6, { ry: Math.PI / 2 });
}

// ------------------------------------------------------------------ the old warehouse wall (west side of the park)
function warehouse(t, mats) {
  const B = t.B, m = t.m, P = PARK, H = 6.3, z0 = -30.0, z1 = -4.93, zc = (z0 + z1) / 2;
  const rust = t.decal('stainDrip', 16, 48);
  // east wall (corrugated, sun-faded), north end over the passage, eave and gutter, downpipes
  B.box(m.tin, 0.2, H, z1 - z0, P.wx - 0.1, 0, zc, { uv: [0, 0.2], ao: 0.2, tint: 0xd8d0c0 });
  B.box(m.tin, 1.95, H + 0.25, 0.1, (9.6 + P.wx) / 2, 0, -4.98, { uv: [0.4, 0.2], ao: 0.2, tint: 0xd0c8b8 });
  B.box(m.found, 0.24, 0.35, z1 - z0, P.wx - 0.08, 0, zc, { uv: [0, 0] });
  B.box(m.pv, 0.46, 0.14, z1 - z0 + 0.3, P.wx + 0.1, H, zc, { tint: 0x5a5650 });
  B.box(m.pv, 0.12, 0.12, z1 - z0 + 0.3, P.wx + 0.32, H - 0.05, zc, { tint: 0x6a6a68 });
  for (const z of [-6.0, -14.6, -22.4]) { B.box(m.pv, 0.1, H - 0.1, 0.1, P.wx + 0.06, 0, z, { tint: 0x6a6a68 }); B.box(m.pv, 0.14, 0.08, 0.2, P.wx + 0.1, 0.02, z, { tint: 0x6a6a68 }); }
  // faded painted name, a row of small high windows, rust streaks
  B.quad(t.T('warehouseSign', 96, 28, { rough: 0.85 }), 4.6, 1.34, P.wx + 0.012, 4.15, -11.6, { ry: Math.PI / 2 });
  for (let z = -6.8; z > -22; z -= 2.6) {
    if (Math.abs(z + 11.6) < 2.4) continue;
    B.box(t.win[hash2(z, 3) < 0.3 ? 'frost' : 'dark'], 0.9, 0.55, 0.06, P.wx + 0.01, 4.7, z, { unit: true, ry: Math.PI / 2 });
    B.box(m.metal, 0.08, 0.05, 1.0, P.wx + 0.04, 4.65, z, { tint: 0x8a8e90 });
  }
  for (let i = 0; i < 9; i++) {
    const z = z1 - 0.8 - i * 2.0 - hash2(i, 5) * 0.8, k = hash2(i, 6);
    B.quad(rust, 0.4 + k * 0.5, 1.6 + k * 2.4, P.wx + 0.013, H - 1.6 - k * 2.4, z, { ry: Math.PI / 2, tint: 0xb8845a, flipU: k < 0.5 });
  }
  t.stainRow(t.decal('stainBase', 32, 16), z0, z1, 0, 0.7, P.wx + 0.012, Math.PI / 2, 0xa8a090, 'z');
  // the big rolling door onto the back street, a 立入禁止-style notice and a meter
  B.box(m.shutterM, 0.06, 2.6, 1.9, P.wx + 0.02, 0, -18.85, { uv: [0, 0.2] });
  B.box(m.metal, 0.34, 0.3, 2.1, P.wx + 0.17, 2.6, -18.85, { tint: 0x7a7e7a });
  B.box(m.pv, 0.05, 0.42, 0.3, P.wx + 0.03, 1.3, -17.2, { tint: 0xc8c8c0 });
  // ivy creeping up the wall by the plaza and at the far end
  const ivy = (z, w, h) => { for (let i = 0; i < 18; i++) { const k = hash2(i, z * 3), kk = hash2(z, i); B.box(m.pv, 0.08, 0.2 + kk * 0.25, 0.22 + k * 0.3, P.wx + 0.04, Math.min(h, kk * h * 1.1), z + (k - 0.5) * w, { tint: [0x3f6a2e, 0x4f7a34, 0x5a8a3a][i % 3] }); } };
  ivy(-7.2, 1.6, 2.6); ivy(-16.0, 1.2, 3.4); ivy(-21.6, 1.8, 2.2);
}

// ------------------------------------------------------------------ fences round the park
function fences(t, mats) {
  const B = t.B, m = t.m, P = PARK;
  const green = 0x3e6a4a;
  const post = (x, z, h) => { B.box(m.metal, 0.06, h, 0.06, x, 0, z, { tint: green }); B.box(m.metal, 0.08, 0.04, 0.08, x, h, z, { tint: green }); };
  // north (behind NE3/NE4): block base + mesh, 1.9 m
  B.box(m.block, 23.0 - P.xP, 0.4, 0.15, (P.xP + 23.0) / 2, 0, P.zN + 0.075, { uv: [3, 0], ao: 0.12 });
  for (let x = P.xP; x <= 23.01; x += 1.6) post(Math.min(x, 23.0), P.zN + 0.05, 1.9);
  meshPanel(t, mats, P.xP, P.zN + 0.05, 23.0, P.zN + 0.05, 0.4, 1.45);
  B.box(m.metal, 23.0 - P.xP, 0.04, 0.04, (P.xP + 23.0) / 2, 1.86, P.zN + 0.05, { tint: green });
  // plaza east wall (NE3's back garden), with a gate nobody uses
  B.box(m.block, 0.15, 1.6, P.zP - P.zN, P.xP + 0.075, 0, (P.zP + P.zN) / 2, { uv: [0, 0], ao: 0.15 });
  B.box(m.found, 0.21, 0.07, P.zP - P.zN, P.xP + 0.075, 1.6, (P.zP + P.zN) / 2);
  // south (along the back street): low mesh fence with an exit gap and yellow bollards in it
  for (const [a, b] of [[P.x0, P.exit[0]], [P.exit[1], 25.9]]) {
    for (let x = a; x <= b + 0.01; x += Math.max(1.2, (b - a) / Math.ceil((b - a) / 1.8))) post(Math.min(x, b), P.zS, 1.2);
    meshPanel(t, mats, a, P.zS, b, P.zS, 0.05, 1.12);
    for (const y of [0.05, 1.16]) B.box(m.metal, b - a, 0.04, 0.04, (a + b) / 2, y, P.zS, { tint: green });
    B.box(m.found, b - a, 0.12, 0.2, (a + b) / 2, 0, P.zS, { k: 0.95 });
  }
  t.prop('bollard_u', (P.exit[0] + P.exit[1]) / 2, 0, P.zS, 0, { block: true, pad: 0 });
  // the park's name board at the entrance and the rules board on the warehouse
  for (const z of [-3.62, -4.82]) B.box(m.metal, 0.06, 1.7, 0.06, 11.55, 0, z, { tint: 0x8a8e8a });
  t.sign('parkName', 1.16, 0.29, 11.6, 1.3, -4.22, { ry: Math.PI / 2 });
  B.box(m.pv, 0.03, 0.33, 1.2, 11.585, 1.28, -4.22, { tint: 0x3a4a3a });
  t.sign('parkRules', 0.5, 0.75, P.wx + 0.013, 0.95, -6.55, { ry: Math.PI / 2 });
  t.prop('bollard_u', 12.45, 0, -4.15, Math.PI / 2, { block: true, pad: 0 });
}

// ------------------------------------------------------------------ playground equipment
function playground(t, mats) {
  const B = t.B, m = t.m, pl = t.game.player;
  // swings in their safety rails (open at the sides)
  t.prop('swing_set', 20.8, 0, -12.2, 0);
  pl.addObstacle(19.0, 19.5, -13.05, -11.35); pl.addObstacle(22.1, 22.6, -13.05, -11.35);
  for (const z of [-9.95, -14.45]) {
    for (let x = 19.0; x <= 22.61; x += 1.2) B.box(m.metal, 0.06, 0.7, 0.06, x, 0, z, { tint: 0xf2c41a });
    for (const y of [0.32, 0.68]) B.box(m.metal, 3.66, 0.05, 0.05, 20.8, y, z, { tint: 0x2f6fb8 });
    pl.addObstacle(18.95, 22.65, z - 0.07, z + 0.07);
  }
  // slide (chute runs north), and the dip at its foot
  t.prop('slide', 24.35, 0, -12.1, 0, { block: true, pad: 0 });
  // sandbox: concrete kerb round soft sand, toys, a cat on the kerb
  const sx0 = 13.6, sx1 = 16.2, sz0 = -10.4, sz1 = -7.9;
  B.plane(mats.sand, sx1 - sx0 - 0.2, sz1 - sz0 - 0.2, (sx0 + sx1) / 2, 0.012, (sz0 + sz1) / 2, { uv: [0, 0] });
  for (const [x0, x1, z0, z1] of [[sx0, sx1, sz0, sz0 + 0.12], [sx0, sx1, sz1 - 0.12, sz1], [sx0, sx0 + 0.12, sz0, sz1], [sx1 - 0.12, sx1, sz0, sz1]]) B.box(m.conc, x1 - x0, 0.22, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, { k: 0.95 });
  t.prop('sand_toys', 14.85, 0.012, -9.0, 0.3);
  t.prop('stray_cat_sit', 16.12, 0.22, -8.3, -2.2);
  // jungle gym: a 3×3×3 cube of painted pipe
  {
    const cx = 16.4, cz = -13.3, n = 3, s = 0.55, x0 = cx - n * s / 2, z0 = cz - n * s / 2, cols = [0xd8382e, 0x2f6fb8, 0xf2c41a, 0x3cae5a];
    for (let i = 0; i <= n; i++) for (let k = 0; k <= n; k++) B.box(m.metal, 0.05, n * s + 0.04, 0.05, x0 + i * s, 0, z0 + k * s, { tint: 0xd8382e });
    for (let j = 1; j <= n; j++) for (let i = 0; i <= n; i++) {
      B.box(m.metal, n * s, 0.04, 0.04, cx, j * s, z0 + i * s, { tint: cols[j] });
      B.box(m.metal, 0.04, 0.04, n * s, x0 + i * s, j * s - 0.02, cz, { tint: cols[j] });
    }
    pl.addObstacle(x0 - 0.05, x0 + n * s + 0.05, z0 - 0.05, z0 + n * s + 0.05);
  }
  // 鉄棒: three horizontal bars of rising height
  {
    const xs = [20.2, 21.15, 22.1, 23.05], z = -16.8;
    for (const x of xs) { B.box(m.metal, 0.07, 1.42, 0.07, x, 0, z, { tint: 0xd8382e }); B.box(m.metal, 0.09, 0.05, 0.09, x, 1.42, z, { tint: 0xf4f0e6 }); pl.addObstacle(x - 0.08, x + 0.08, z - 0.08, z + 0.08); }
    [0.85, 1.05, 1.25].forEach((y, i) => B.box(m.metal, xs[i + 1] - xs[i], 0.035, 0.035, (xs[i] + xs[i + 1]) / 2, y, z, { tint: 0xc8ccd0 }));
    for (let i = 0; i < 3; i++) B.plane(t.M('gravel', { roughness: 1, color: 0xb09c7a, ppm: 28, decal: true }), 0.7, 0.9, (xs[i] + xs[i + 1]) / 2, 0.004, z, {});
  }
  // spring rider panda
  t.prop('spring_panda', 14.6, 0, -6.8, 0.5, { block: true, pad: 0 });
}

// ------------------------------------------------------------------ public toilet block (公衆トイレ)
function toilet(t, mats) {
  const B = t.B, m = t.m, x0 = 23.0, x1 = 25.75, z0 = -8.7, z1 = -5.85, H = 2.75;
  const xc = (x0 + x1) / 2, zc = (z0 + z1) / 2;
  B.box(mats.tile, x1 - x0, 1.1, z1 - z0, xc, 0, zc, { ao: 0.18, uv: [0, 0] });
  B.box(mats.stucco, x1 - x0 - 0.01, H - 1.1, z1 - z0 - 0.01, xc, 1.1, zc, { uv: [0.2, 0] });
  B.box(m.pv, x1 - x0 + 0.02, 0.06, z1 - z0 + 0.02, xc, 1.08, zc, { tint: 0x5a8a6a });
  // flat roof slab with an overhang and a parapet; vent louvres high up
  B.box(m.conc, x1 - x0 + 0.6, 0.18, z1 - z0 + 0.6, xc - 0.1, H, zc, { k: 0.9 });
  B.box(m.pv, x1 - x0 + 0.62, 0.06, z1 - z0 + 0.62, xc - 0.1, H + 0.18, zc, { tint: 0x8a8680 });
  for (const z of [-6.5, -7.95]) for (let i = 0; i < 3; i++) B.box(m.pv, 0.04, 0.03, 0.6, x0 - 0.01, 2.25 + i * 0.1, z, { tint: 0x3a3a3a });
  // two doorways on the west face (dark), screen walls, plates, a light
  for (const [z, half] of [[-6.5, 0], [-7.95, 1]]) {
    B.box(t.indoor(m.pv), 0.04, 2.0, 0.78, x0 - 0.005, 0, z, { tint: 0x14120f });
    B.box(m.pv, 0.06, 2.05, 0.06, x0 - 0.03, 0, z - 0.42, { tint: 0x8a8a84 }); B.box(m.pv, 0.06, 2.05, 0.06, x0 - 0.03, 0, z + 0.42, { tint: 0x8a8a84 });
    B.box(m.pv, 0.06, 0.06, 0.9, x0 - 0.03, 2.0, z, { tint: 0x8a8a84 });
    t.sign('wcSign', 0.28, 0.17, x0 - 0.04, 2.1, z, { ry: -Math.PI / 2 }, [half * 24, 0, 24, 14]);
    B.box(m.found, 0.4, 0.06, 0.9, x0 - 0.2, 0, z, { k: 0.95 });
  }
  B.box(mats.tile, 0.1, 2.0, 0.08, x0 - 0.42, 0, -7.22, { k: 0.95 }); // little screen wall between the doors
  B.box(m.pv, 0.12, 0.08, 0.3, x0 - 0.06, 2.38, -7.22, { tint: 0x3a3a3a });
  B.box(t.G, 0.08, 0.06, 0.22, x0 - 0.1, 2.32, -7.22, { tint: 0xfff0d0 });
  // wash basin on the south face, a mirror, soap net, a "keep it clean" plate
  B.box(m.conc, 0.7, 0.75, 0.42, 24.1, 0, z0 - 0.21, { k: 0.95 });
  B.box(m.metal, 0.5, 0.06, 0.3, 24.1, 0.75, z0 - 0.2, { tint: 0xc8ccd0 });
  B.box(m.metal, 0.04, 0.16, 0.04, 24.1, 0.82, z0 - 0.06, { tint: 0xd8dce0 }); B.box(m.metal, 0.04, 0.04, 0.12, 24.1, 0.96, z0 - 0.1, { tint: 0xd8dce0 });
  B.box(m.gloss, 0.42, 0.5, 0.02, 24.1, 1.25, z0 - 0.01, { tint: 0x9ab0c0 });
  B.box(m.pv, 0.1, 0.14, 0.03, 24.5, 0.95, z0 - 0.02, { tint: 0xe86a7a });
  t.prop('pigeon', 24.6, H + 0.24, -6.4, 2.2, { scale: 1.1 });
  t.prop('pigeon', 23.9, H + 0.24, -7.6, -0.6);
  t.game.player.addObstacle(x0 - 0.45, 26, z0 - 0.45, -5.8);
}

// ------------------------------------------------------------------ benches, lamps, bins, trees, the clock, vending machines
function furniture(t, mats) {
  const B = t.B, m = t.m;
  // benches (rohan_sketch is the first one: west side, looking east at the swings and the tower)
  t.prop('park_bench', 12.12, 0, -9.4, Math.PI / 2, { block: true });
  t.prop('park_bench', 12.12, 0, -12.7, Math.PI / 2, { block: true });
  t.prop('park_bench', 15.9, 0, -16.85, 0, { block: true });
  t.prop('trash_basket', 11.98, 0, -11.05, 0, { block: true });
  t.prop('trash_basket', 23.3, 0, -9.6, 0, { block: true });
  t.prop('park_litter', 13.0, 0, -8.6, 0.4);
  t.prop('park_litter', 24.0, 0, -9.7, 2.1);
  t.prop('park_litter', 17.2, 0, -17.05, -0.8, { scale: 0.9 });
  t.prop('drink_cans', 15.3, 0, -5.6, 1.4, { scale: 0.8 });
  // lamps, the park clock (5:40), the drinking fountain
  for (const [x, z] of [[11.95, -6.2], [18.25, -9.4], [23.65, -17.15]]) {
    t.prop('park_lamp', x, 0, z, 0, { block: true });
    t.pool(x, z, 2.4, 0xfff0c8, 0.32);
  }
  t.prop('park_clock', 22.35, 0, -9.25, -Math.PI / 2, { block: true });
  t.prop('drinking_fountain', 21.6, 0, -6.45, 0, { block: true });
  // vending machines in the plaza (the teens' spot), with a recycling bin
  t.prop('vending', 16.22, 0, -4.07, -Math.PI / 2, { dim: true, block: true });
  t.prop('vending', 16.22, 0, -5.09, -Math.PI / 2, { dim: true, block: true });
  t.pool(15.4, -4.6, 1.5, 0xcfe8ff, 0.4);
  B.box(m.pv, 0.38, 0.7, 0.38, 13.3, 0, -3.75, { tint: 0x2a6ad8 });
  B.box(m.pv, 0.4, 0.05, 0.4, 13.3, 0.7, -3.75, { tint: 0x1a4aa8 });
  t.game.player.addObstacle(13.05, 13.55, -4.0, -3.5);
  // trees: the big zelkova shading the SW corner, a smaller one by the slide, hedges along the north fence
  t.prop('keyaki_tree', 12.75, 0, -15.9, 0.3);
  t.game.player.addObstacle(12.4, 13.1, -16.25, -15.55);
  t.prop('keyaki_tree', 25.05, 0, -15.6, 2.1, { scale: 0.72 });
  t.game.player.addObstacle(24.8, 25.6, -15.85, -15.35);
  for (const x of [17.7, 19.8]) t.prop('hedge', x, 0, -6.25, 0, { scale: 0.85 });
  t.game.player.addObstacle(16.6, 20.7, -6.6, -5.8);
  for (const [x, z] of [[25.3, -10.0], [25.3, -12.2]]) t.prop('hedge', x, 0, z, Math.PI / 2, { scale: 0.6 });
  // small finds: a kid's bicycle by the sandbox, a lost glove on a fence post, an umbrella hooked on the rail
  t.prop('bicycle', 13.2, 0, -11.3, 0.25, { scale: 0.62, block: true });
  B.box(m.pv, 0.08, 0.12, 0.04, 14.8, 1.25, PARK.zS - 0.02, { tint: 0xe86a7a });
  B.box(m.pv, 0.02, 0.8, 0.02, 19.3, 0.05, -14.45, { rz: 0.35, tint: 0x2a52a8 });
  B.box(m.pv, 0.16, 0.06, 0.16, 19.55, 0.68, -14.45, { tint: 0x2a52a8 });
  t.prop('weeds', 25.4, 0, -17.2, 1.0);
  t.prop('weeds', 11.85, 0, -17.3, 0.3);
  t.prop('weeds', 22.9, 0, -5.95, 2.0, { scale: 0.8 });
}

// ------------------------------------------------------------------ the backs of NE2 / Sakura Heights / NE4, facing the park
function backsOfHouses(t) {
  const B = t.B, m = t.m;
  const win = (kind, x, y, z, w, h) => {
    B.box(t.win[kind], w, h, 0.1, x, y, z, { unit: true, ry: Math.PI });
    B.box(m.metal, w + 0.1, 0.05, 0.12, x, y - 0.06, z - 0.05, { tint: 0xb8bcc0 });
  };
  // NE2 (back wall z=-2.9): kitchen window, bathroom frosted glass, 2F bedroom, a vent hood, a water heater, an AC
  win('frost', 12.4, 1.75, -2.9, 0.7, 0.55);
  win('lit2', 14.1, 1.4, -2.9, 1.2, 0.9);
  win('lit', 13.0, 3.85, -2.9, 1.4, 1.0);
  win('dark', 15.5, 3.85, -2.9, 1.0, 0.9);
  B.box(m.pv, 0.3, 0.26, 0.2, 14.9, 2.35, -3.0, { tint: 0x9a9690 });
  B.box(m.pv, 0.5, 0.6, 0.22, 15.9, 0.9, -3.02, { tint: 0xe4e2d8 });
  B.box(m.pv, 0.78, 0.54, 0.27, 12.4, 3.3, -3.04, { tint: 0xe4e2d8 });
  // Sakura Heights (back wall z=-4.8): a balcony per flat on both floors, laundry, futons, ACs
  B.push(19.35, 0, -4.8, Math.PI);
  const units = [[-2.45, -0.88], [-0.8, 0.8], [0.88, 2.45]];
  units.forEach(([x0, x1], i) => {
    const cx = (x0 + x1) / 2;
    for (const [fl, fy] of [[0, 0.4], [1, 3.05]]) {
      B.box(t.win[['lit', 'lace', 'lit3', 'tv', 'lit2', 'dark'][(i + fl * 3) % 6]], 1.3, 1.85, 0.1, cx, fy + 0.05, 0, { unit: true });
      t.balcony({ x0: x0 + 0.04, x1: x1 - 0.04, d: 0.85, panel: fl ? null : 0xb8bcc0, laundry: fl === 1 || i !== 1, futon: fl === 1 && i === 2 ? 0xf0d8b0 : null }, fy, 31 + i * 7 + fl);
      B.box(m.pv, 0.62, 0.42, 0.24, cx + 0.45, fy + 0.02, 0.62, { tint: 0xe4e2d8 });
    }
  });
  for (const x of [-0.84, 0.84]) B.box(m.pv, 0.05, 1.2, 0.85, x, 3.05, 0.43, { tint: 0xd8dce0 });
  B.pop();
  // NE4 (back wall z=-3.2): a frosted bathroom window and its boiler chimney
  win('frost', 24.6, 1.6, -3.2, 0.7, 0.55);
  B.box(m.metal, 0.12, 1.3, 0.12, 25.2, 1.2, -3.3, { tint: 0x9a9690 });
}

// ------------------------------------------------------------------ the back street (and the closed footpath under the tracks)
function backStreet(t, mats) {
  const B = t.B, m = t.m, P = PARK, x0 = P.wx, x1 = 26.0, zc = (P.sz0 + P.sz1) / 2;
  B.plane(m.road, x1 - x0, P.sz0 - P.sz1, (x0 + x1) / 2, 0.002, zc, { uv: [3, 7] });
  B.plane(m.strip, x1 - x0, 0.15, (x0 + x1) / 2, 0.003, P.zS - 0.075, {});
  B.box(m.lid, x1 - x0, 0.012, 0.28, (x0 + x1) / 2, 0, P.sz1 + 0.14, { uv: [1, 0] });
  B.box(m.paint, x1 - x0 - 1.4, 0.006, 0.12, (x0 + x1) / 2 + 0.3, 0, P.sz1 + 0.42);
  B.plane(t.decal('roadCrack', 32, 32), 1.2, 1.2, 21.8, 0.004, -18.7, { unit: true, ry: 1.2, tint: 0xa8a4a0 });
  t.prop('manhole', 14.2, 0.002, -18.85, 0.7);
  t.puddle(23.4, -19.4, 1.3, 0.7, 0.1);
  // the closed pedestrian underpass at the east end: dark mouth in the retaining wall, a barricade and a notice
  const ex = 25.98;
  B.box(t.indoor(m.pv), 0.04, 2.1, 1.5, ex, 0, -18.85, { tint: 0x080706 });
  B.box(m.conc, 0.12, 0.25, 1.9, ex - 0.04, 2.1, -18.85, { k: 0.9 });
  for (const z of [-19.65, -18.05]) B.box(m.conc, 0.12, 2.1, 0.2, ex - 0.04, 0, z, { k: 0.9 });
  for (const z of [-19.4, -18.3]) { B.box(m.metal, 0.06, 0.95, 0.06, 25.6, 0, z, { tint: 0x3a3a3a }); }
  B.box(m.hazard, 0.04, 0.22, 1.3, 25.6, 0.7, -18.85, {});
  B.box(m.hazard, 0.04, 0.22, 1.3, 25.6, 0.28, -18.85, {});
  t.sign('closedSign', 0.6, 0.25, 25.56, 1.0, -18.85, { ry: -Math.PI / 2 });
  t.prop('weeds', 25.7, 0, -19.6, 0.3, { scale: 0.9 });
  t.game.player.addObstacle(25.45, 26.2, -19.95, -17.75);
  // a street light on the park side, a utility pole between the villa and the vacant lot, its wires
  t.prop('street_light', 13.3, 0, P.sz0 - 0.15, Math.PI / 2, { block: true });
  t.pool(13.3, -19.0, 2.6, 0xffc880, 0.45);
  t.prop('utility_pole', 20.28, 0, P.sz1 - 0.22, Math.PI / 2);
  t.game.player.addObstacle(20.08, 20.48, P.sz1 - 0.42, P.sz1);
  const wm = t.P(0.9), wire = (a, b, sag, r = 0.012) => {
    const pts = [];
    for (let k = 0; k <= 12; k++) { const u = k / 12, p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * sag; pts.push(p); }
    B.geo(wm, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, r, 4), { tint: 0x1c1818 });
  };
  for (const [dz, y] of [[-0.6, 7.62], [0.6, 7.62], [-0.45, 7.0]]) { wire(V(P.wx + 0.2, y - 1.2, -18.4 + dz * 0.3), V(20.28, y, P.sz1 - 0.22 + dz), 0.5); wire(V(20.28, y, P.sz1 - 0.22 + dz), V(25.9, y - 2.2, -18.6 + dz * 0.4), 0.3); }
  wire(V(20.28, 5.3, P.sz1 - 0.3), V(18.9, 5.6, -22.3), 0.3, 0.01);
  wire(V(20.28, 5.0, P.sz1 - 0.1), V(P.wx + 0.2, 4.6, -18.0), 0.45, 0.025);
}

// ------------------------------------------------------------------ the mangaka's villa (岸辺邸)
function villa(t, mats) {
  const B = t.B, m = t.m, F = mats.flat, P = PARK;
  const X0 = 12.3, X1 = 19.5, ZF = -22.2, ZK = -28.8, cx = (X0 + X1) / 2, W = X1 - X0, D = ZF - ZK;
  const base = 0.45, f1 = 3.0, f2 = 2.85, y1 = base + f1, y2 = y1 + f2;
  const ink = 0x2a2c30, white = 0xf4f2ec;
  // stone plinth, the body (split so the studio behind the big window can be seen into)
  B.box(m.found, W + 0.1, base, D + 0.1, cx, 0, (ZF + ZK) / 2, { tint: 0x8a8a88 });
  const SX0 = 12.3, SX1 = 15.5, SZ = -25.0; // studio column (front-left)
  B.box(mats.stucco, W, f1 + f2, ZF - ZK - (ZF - SZ), cx, base, (SZ + ZK) / 2, { uv: [0, 0] });
  B.box(mats.stucco, X1 - SX1, f1 + f2, ZF - SZ, (SX1 + X1) / 2, base, (ZF + SZ) / 2, { uv: [0.3, 0], ao: 0.12 });
  B.box(mats.stucco, SX1 - SX0, f2, ZF - SZ, (SX0 + SX1) / 2, y1, (ZF + SZ) / 2, { uv: [0.6, 0] });
  // the studio's front wall around the window, and its west wall
  const wx0 = 12.75, wx1 = 15.15, wy0 = 1.0, wy1 = 2.95;
  B.box(mats.stucco, wx0 - SX0, f1, 0.2, (SX0 + wx0) / 2, base, ZF - 0.1, { uv: [0.1, 0], ao: 0.12 });
  B.box(mats.stucco, SX1 - wx1, f1, 0.2, (wx1 + SX1) / 2, base, ZF - 0.1, { uv: [0.2, 0], ao: 0.12 });
  B.box(mats.stucco, wx1 - wx0, wy0 - base, 0.2, (wx0 + wx1) / 2, base, ZF - 0.1, { ao: 0.12 });
  B.box(mats.stucco, wx1 - wx0, y1 - wy1, 0.2, (wx0 + wx1) / 2, wy1, ZF - 0.1, {});
  B.box(mats.stucco, 0.15, f1, ZF - SZ, SX0 + 0.075, base, (SZ + ZF) / 2, {});
  B.box(mats.stucco, 0.1, f1, ZF - SZ, SX1 - 0.05, base, (SZ + ZF) / 2, {});
  // string course, cornice
  B.box(m.pv, W + 0.08, 0.12, D + 0.08, cx, y1 - 0.06, (ZF + ZK) / 2, { tint: 0xe2ded4 });
  B.box(m.pv, W + 0.34, 0.16, D + 0.34, cx, y2, (ZF + ZK) / 2, { tint: 0xeeeae2 });
  B.box(m.pv, W + 0.44, 0.06, D + 0.44, cx, y2 + 0.16, (ZF + ZK) / 2, { tint: ink });
  // hipped dark slate roof in stepped courses, a brick chimney
  {
    let w = W + 0.5, d = D + 0.5, y = y2 + 0.22;
    for (let i = 0; w > 0.6 && d > 0.6; i++) {
      B.box(mats.slate, w, 0.3, d, cx, y, (ZF + ZK) / 2, { uv: [i * 0.2, i * 0.13] });
      w -= 0.86; d -= 0.86; y += 0.3;
    }
    B.box(m.ridge, Math.max(0.5, w + 0.86), 0.12, 0.26, cx, y, (ZF + ZK) / 2, { tint: 0x3a3e46 });
    B.box(m.brick, 0.6, 3.1, 0.6, 18.3, y2 + 0.4, -26.2, { tint: 0xb89a8a });
    B.box(m.pv, 0.72, 0.1, 0.72, 18.3, y2 + 3.5, -26.2, { tint: 0x3a3a3a });
  }
  // ---- the studio window: black steel frame with a grid, glass, the room behind
  const wz = ZF + 0.005;
  for (const x of [wx0, wx1, (wx0 * 2 + wx1) / 3, (wx0 + wx1 * 2) / 3]) B.box(m.pv, 0.06, wy1 - wy0, 0.08, x, wy0, wz, { tint: ink });
  for (const y of [wy0, wy1 - 0.05, 2.45]) B.box(m.pv, wx1 - wx0 + 0.06, 0.05, 0.08, (wx0 + wx1) / 2, y, wz, { tint: ink });
  B.box(m.pv, wx1 - wx0 + 0.3, 0.07, 0.22, (wx0 + wx1) / 2, wy0 - 0.07, ZF + 0.08, { tint: 0xd8d4cc });
  t.add(t.glassPane(wx1 - wx0 - 0.06, wy1 - wy0 - 0.06, (wx0 + wx1) / 2, (wy0 + wy1) / 2, ZF - 0.02));
  studio(t, mats, SX0 + 0.15, SX1 - 0.1, SZ + 0.02, ZF - 0.2, base, y1 - 0.02);
  // ---- front door under a little porch with two slim columns; fanlight; lamp; number plate
  const dx = 16.5, dw = 1.0;
  B.box(t.M('woodDark', { roughness: 0.55 }), dw, 2.3, 0.08, dx, base, ZF + 0.02, { unit: true, tint: 0x8a5a3a });
  for (const [u, v] of [[-0.22, 0.35], [0.22, 0.35], [-0.22, 1.35], [0.22, 1.35]]) B.box(m.pv, 0.32, 0.75, 0.03, dx + u, base + v, ZF + 0.07, { tint: 0x6a4026 });
  B.box(m.metal, 0.04, 0.2, 0.05, dx + 0.36, base + 1.0, ZF + 0.09, { tint: 0xd8b060 });
  B.box(t.G, dw - 0.1, 0.22, 0.04, dx, base + 2.36, ZF + 0.02, { tint: 0xffe0a0 });
  for (const s of [-1, 1]) B.box(m.pv, 0.08, 2.62, 0.1, dx + s * (dw / 2 + 0.04), base, ZF + 0.03, { tint: ink });
  B.box(m.pv, dw + 0.16, 0.08, 0.1, dx, base + 2.3, ZF + 0.03, { tint: ink });
  B.box(m.pv, 1.9, 0.14, 1.15, dx, base + 2.72, ZF + 0.57, { tint: ink });
  B.box(m.pv, 1.95, 0.05, 1.2, dx, base + 2.86, ZF + 0.58, { tint: 0x3a3e46 });
  for (const sx of [-0.82, 0.82]) { B.box(m.pv, 0.12, 2.72, 0.12, dx + sx, base, ZF + 1.05, { tint: white }); B.box(m.pv, 0.2, 0.08, 0.2, dx + sx, base, ZF + 1.05, { tint: 0xd8d4cc }); }
  B.box(m.found, 1.9, base - 0.12, 1.2, dx, 0, ZF + 0.6, { tint: 0xa8a49c });
  B.box(m.found, 1.6, base - 0.28, 0.4, dx, 0, ZF + 1.36, { tint: 0xb0aca4 });
  B.box(m.pv, 0.16, 0.26, 0.1, dx - 0.72, base + 1.85, ZF + 0.05, { tint: ink });
  B.box(t.G, 0.1, 0.16, 0.05, dx - 0.72, base + 1.9, ZF + 0.1, { tint: 0xffd890 });
  t.sign('villaNo', 0.22, 0.13, dx + 0.75, base + 1.7, ZF + 0.012);
  // right ground-floor window (lace, lit), 2F windows with louvred shutters, the balcony with French doors
  const winX = (kind, x, y, w, h, shutters) => {
    B.box(t.win[kind], w, h, 0.1, x, y, ZF, { unit: true });
    B.box(m.pv, w + 0.14, 0.06, 0.18, x, y - 0.06, ZF + 0.06, { tint: 0xd8d4cc });
    B.box(m.pv, w + 0.1, 0.05, 0.08, x, y + h, ZF + 0.03, { tint: ink });
    if (shutters) for (const s of [-1, 1]) {
      B.box(m.pv, w * 0.5, h + 0.05, 0.05, x + s * (w * 0.75 + 0.04), y - 0.02, ZF + 0.03, { tint: 0x2e3a36 });
      for (let k = 1; k < 8; k++) B.box(m.pv, w * 0.46, 0.02, 0.03, x + s * (w * 0.75 + 0.04), y - 0.02 + k * (h / 8), ZF + 0.065, { tint: 0x3e4a46 });
    }
  };
  winX('lace', 18.45, 1.05, 1.3, 1.75, false);
  winX('lit3', 13.0, y1 + 0.75, 0.9, 1.35, true);
  winX('dark', 18.8, y1 + 0.75, 0.9, 1.35, true);
  // balcony: slab, black iron railing with a scroll pattern, French doors, plants
  const bx0 = 14.1, bx1 = 17.6, bd = 0.95, by = y1 - 0.02;
  B.box(m.pv, bx1 - bx0 + 0.1, 0.16, bd, (bx0 + bx1) / 2, by - 0.16, ZF + bd / 2, { tint: 0xe8e4dc });
  B.box(m.pv, bx1 - bx0 + 0.14, 0.05, bd + 0.04, (bx0 + bx1) / 2, by - 0.2, ZF + bd / 2, { tint: 0xd8d4cc });
  for (let k = 0; k < 4; k++) B.box(m.pv, 0.12, 0.14, 0.12, bx0 + 0.3 + k * ((bx1 - bx0 - 0.6) / 3), by - 0.34, ZF + bd - 0.08, { tint: 0xd8d4cc }); // corbels
  const rz = ZF + bd - 0.04;
  B.box(m.metal, bx1 - bx0, 0.05, 0.05, (bx0 + bx1) / 2, by + 0.95, rz, { tint: 0x1e2024 });
  B.box(m.metal, bx1 - bx0, 0.04, 0.04, (bx0 + bx1) / 2, by + 0.1, rz, { tint: 0x1e2024 });
  for (let x = bx0; x <= bx1 + 0.01; x += 0.125) B.box(m.metal, 0.022, 0.85, 0.022, x, by + 0.1, rz, { tint: 0x1e2024 });
  for (let x = bx0 + 0.25; x < bx1; x += 0.5) B.box(m.metal, 0.16, 0.16, 0.02, x, by + 0.72, rz, { tint: 0x1e2024, rz: Math.PI / 4 });
  for (const s of [bx0, bx1]) for (let k = 1; k < 5; k++) B.box(m.metal, 0.022, 0.85, 0.022, s, by + 0.1, ZF + k * (bd / 5), { tint: 0x1e2024 });
  for (const s of [bx0, bx1]) B.box(m.metal, 0.05, 0.05, bd, s, by + 0.95, ZF + bd / 2, { tint: 0x1e2024 });
  for (const u of [-0.36, 0.36]) {
    B.box(t.win.lit4, 0.66, 2.1, 0.1, 15.85 + u, by + 0.02, ZF, { unit: true });
    B.box(m.pv, 0.06, 2.12, 0.06, 15.85 + u + (u < 0 ? -0.34 : 0.34), by + 0.02, ZF + 0.04, { tint: ink });
  }
  B.box(m.pv, 1.5, 0.08, 0.08, 15.85, by + 2.12, ZF + 0.04, { tint: ink });
  for (const [x, c] of [[bx0 + 0.3, 0x4a8a3a], [bx1 - 0.3, 0x5a9a42], [bx0 + 1.0, 0xd84a6a]]) {
    B.box(m.pv, 0.32, 0.3, 0.32, x, by, ZF + bd - 0.32, { tint: 0xb85a3a });
    B.box(m.pv, 0.4, 0.42, 0.4, x, by + 0.3, ZF + bd - 0.32, { tint: c });
  }
  // a little round bistro table and a chair on the balcony
  B.box(m.metal, 0.04, 0.7, 0.04, 17.0, by, ZF + 0.4, { tint: 0x1e2024 });
  B.box(m.pv, 0.5, 0.04, 0.5, 17.0, by + 0.7, ZF + 0.4, { tint: 0xf4f2ec });
  B.box(m.pv, 0.1, 0.12, 0.1, 17.05, by + 0.74, ZF + 0.38, { tint: 0xf4f0e6 });
  // east side: two windows, a gas meter, the AC (the vacant lot sees this side)
  for (const [kind, y, z] of [['lit', 1.1, -24.2], ['dark', y1 + 0.75, -26.6], ['frost', 1.5, -27.4]]) {
    B.box(t.win[kind], 1.0, kind === 'frost' ? 0.6 : 1.2, 0.1, X1, y, z, { unit: true, ry: Math.PI / 2 });
    B.box(m.pv, 0.16, 0.06, 1.12, X1 + 0.06, y - 0.06, z, { tint: 0xd8d4cc });
  }
  B.box(m.pv, 0.22, 0.32, 0.26, X1 + 0.11, 0.9, -25.6, { tint: 0xb8bcb0 });
  B.box(m.pv, 0.3, 0.54, 0.78, X1 + 0.17, 0, -27.8, { tint: 0xe4e2d8 });
  for (const x of [X1 + 0.05, X0 - 0.05]) B.box(m.pv, 0.06, y2 + 0.1, 0.08, x, 0, -22.35, { tint: 0x9a9690 });
  // ---- the front garden: lawn, stepping stones, pots, a rose hedge, a small tree, a garden lamp
  B.plane(m.grass, X1 + 0.6 - X0, P.sz1 - 0.15 - ZF, (X0 + X1 + 0.6) / 2, 0.01, (ZF + P.sz1 - 0.15) / 2, { k: 1.05, uv: [1, 1] });
  for (const [z, r] of [[-20.55, 0.1], [-21.05, -0.2]]) B.box(m.found, 0.55, 0.05, 0.4, dx + (hash2(z * 9, 1) - 0.5) * 0.1, 0, z, { ry: r, tint: 0xc8c4bc });
  for (const [x, c] of [[15.25, 0x4a8a3a], [17.75, 0x3e7a34]]) {
    B.box(m.pv, 0.42, 0.42, 0.42, x, 0, -21.35, { tint: 0xb4603a });
    B.box(m.pv, 0.5, 0.06, 0.5, x, 0.42, -21.35, { tint: 0xa4502e });
    B.box(m.pv, 0.52, 0.5, 0.52, x, 0.48, -21.35, { tint: c });
    B.box(m.pv, 0.36, 0.35, 0.36, x, 0.95, -21.35, { tint: c, k: 1.1 });
  }
  t.prop('hedge', 13.6, 0, -20.45, 0, { scale: 0.62 });
  t.prop('hedge', 19.0, 0, -20.45, 0, { scale: 0.48 });
  for (const [x, c] of [[13.0, 0xe5383b], [13.5, 0xff8fb2], [14.1, 0xfbf8f0], [18.7, 0xe5383b], [19.3, 0xff8fb2]]) B.box(m.pv, 0.1, 0.08, 0.1, x, 0.6, -20.35 - hash2(x, 4) * 0.15, { tint: c });
  t.prop('keyaki_tree', 12.95, 0, -21.4, 1.2, { scale: 0.38 });
  B.box(m.pv, 0.08, 0.9, 0.08, 18.9, 0, -21.6, { tint: ink });
  B.box(t.G, 0.16, 0.2, 0.16, 18.9, 0.9, -21.6, { tint: 0xffe0a0 });
  // ---- the low front wall: white render, dark coping, iron railing on top, gate pillars with lamps, iron gate
  const g0 = P.gateX - 0.6, g1 = P.gateX + 0.6, zW = P.sz1 - 0.1;
  for (const [a, b] of [[P.wx + 0.02, g0 - 0.2], [g1 + 0.2, 20.2]]) {
    B.box(mats.stucco, b - a, 1.0, 0.2, (a + b) / 2, 0, zW, { uv: [a, 0], ao: 0.15 });
    B.box(m.pv, b - a + 0.04, 0.07, 0.28, (a + b) / 2, 1.0, zW, { tint: ink });
    B.box(m.metal, b - a, 0.03, 0.03, (a + b) / 2, 1.62, zW, { tint: 0x1e2024 });
    for (let x = a + 0.06; x < b - 0.02; x += 0.14) { B.box(m.metal, 0.02, 0.56, 0.02, x, 1.07, zW, { tint: 0x1e2024 }); B.box(m.metal, 0.05, 0.08, 0.05, x, 1.6, zW, { tint: 0x1e2024 }); }
    t.stainRow(t.decal('stainBase', 32, 16), a, b, 0, 0.4, zW + 0.111, 0, 0xc8c4bc);
  }
  for (const px of [g0 - 0.1, g1 + 0.1]) {
    B.box(mats.stucco, 0.44, 1.5, 0.44, px, 0, zW, { ao: 0.15 });
    B.box(m.pv, 0.52, 0.08, 0.52, px, 1.5, zW, { tint: ink });
    B.box(m.pv, 0.22, 0.04, 0.22, px, 1.58, zW, { tint: ink });
    B.box(t.G, 0.16, 0.24, 0.16, px, 1.62, zW, { tint: 0xffe8b0 });
    B.box(m.pv, 0.24, 0.05, 0.24, px, 1.86, zW, { tint: ink });
  }
  t.sign('kishibe', 0.3, 0.15, g1 + 0.1, 1.05, zW + 0.223);
  B.box(m.pv, 0.1, 0.14, 0.03, g1 + 0.1, 0.78, zW + 0.235, { tint: 0x3a3a3a });
  B.box(t.G, 0.02, 0.02, 0.01, g1 + 0.1, 0.86, zW + 0.252, { tint: 0xff6040 });
  B.box(m.metal, 0.26, 0.05, 0.03, g0 - 0.1, 0.95, zW + 0.235, { tint: 0xd8b060 });
  // the iron gate (two leaves, closed), rising to a little arch in the middle
  for (const s of [-1, 1]) {
    const lx = P.gateX + s * 0.24;
    for (const y of [0.1, 0.55, 1.2]) B.box(m.metal, 0.46, 0.04, 0.04, lx, y, zW, { tint: 0x1e2024 });
    for (let k = 0; k <= 5; k++) { const c = s < 0 ? k / 5 : 1 - k / 5; B.box(m.metal, 0.022, 1.2 + Math.sin(c * Math.PI / 2) * 0.2, 0.022, lx - 0.21 + k * 0.084, 0.08, zW, { tint: 0x1e2024 }); }
  }
  B.box(m.metal, 0.03, 0.03, 0.04, P.gateX, 0.9, zW + 0.03, { tint: 0xd8b060 });
}

/** The lamp-lit studio behind the villa's big window: a drawing desk, a bookshelf, pinned sketches (unlit paint). */
function studio(t, mats, x0, x1, z0, z1, y0, y1) {
  const B = t.B, F = mats.flat, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // the room shell, seen from inside (back faces): warm walls, darker floor, ceiling
  const shell = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  shell.translate(cx, (y0 + y1) / 2, cz);
  const pos = shell.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), x = pos.getX(i);
    c.setHex(y < y0 + 0.01 ? 0x5a3e2a : y > y1 - 0.01 ? 0xc8b49a : 0xe0cdb0);
    c.multiplyScalar(0.7 + 0.3 * Math.min(1, (x - x0) / (x1 - x0) * 1.6) * (y > y0 + 0.01 ? 1 : 0.9));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  shell.setAttribute('color', new THREE.BufferAttribute(col, 3));
  shell.deleteAttribute('uv');
  const sm = new THREE.Mesh(shell, mats.flatBack);
  sm.matrixAutoUpdate = false;
  t.add(sm);
  const k = (hex, f = 1) => ({ tint: hex, k: f });
  // bookshelf on the back wall, crammed with art books and manuscripts
  const shX0 = x0 + 1.25, shX1 = x1 - 0.15, sz = z0 + 0.18;
  B.box(F, shX1 - shX0, 2.2, 0.32, (shX0 + shX1) / 2, y0, sz, k(0x5a3a26));
  for (let r = 0; r < 5; r++) {
    const yy = y0 + 0.12 + r * 0.42;
    B.box(F, shX1 - shX0 - 0.06, 0.03, 0.3, (shX0 + shX1) / 2, yy - 0.03, sz + 0.02, k(0x7a5236));
    let x = shX0 + 0.06;
    for (let i = 0; x < shX1 - 0.1; i++) {
      const bw = 0.04 + hash2(i, r) * 0.05, bh = 0.24 + hash2(r, i) * 0.12;
      B.box(F, bw, bh, 0.22, x + bw / 2, yy, sz + 0.06, k([0xb83a32, 0x2a4a8a, 0xe8d8b0, 0x3a6a3a, 0x1e1e22, 0xd8a030, 0x6a3a7a][(i * 3 + r) % 7], 0.85 + hash2(i, 5) * 0.2));
      x += bw + 0.008;
    }
  }
  // pinned sketches and a calendar on the walls
  for (let i = 0; i < 7; i++) B.box(F, 0.21, 0.29, 0.01, x0 + 0.2 + (i % 4) * 0.26, y0 + 1.5 + Math.floor(i / 4) * 0.36 + hash2(i, 2) * 0.06, z0 + 0.01, k(0xf4f0e6, 0.95 + hash2(i, 3) * 0.08));
  for (let i = 0; i < 4; i++) B.box(F, 0.01, 0.26, 0.19, x0 + 0.01, y0 + 1.6 + (i % 2) * 0.34, z0 + 0.55 + Math.floor(i / 2) * 0.3, k(0xf0ece0));
  // the drawing desk against the west wall, its tilted board with a page, a lamp, ink and pens; the chair
  const dx0 = x0 + 0.05, dx1 = x0 + 0.85, dz0 = z0 + 0.45, dz1 = z1 - 0.45, dy = y0 + 0.74;
  B.box(F, dx1 - dx0, 0.05, dz1 - dz0, (dx0 + dx1) / 2, dy, (dz0 + dz1) / 2, k(0x8a5a36));
  for (const [x, z] of [[dx0 + 0.05, dz0 + 0.05], [dx0 + 0.05, dz1 - 0.05], [dx1 - 0.05, dz0 + 0.05], [dx1 - 0.05, dz1 - 0.05]]) B.box(F, 0.05, dy - y0, 0.05, x, y0, z, k(0x5a3a26));
  const board = new THREE.BoxGeometry(0.62, 0.03, 0.82);
  board.rotateZ(-0.42); board.translate(dx0 + 0.42, dy + 0.18, (dz0 + dz1) / 2 - 0.05);
  B.geo(F, board, { tint: 0xd8c8a8 });
  const page = new THREE.BoxGeometry(0.42, 0.012, 0.58);
  page.rotateZ(-0.42); page.translate(dx0 + 0.43, dy + 0.205, (dz0 + dz1) / 2 - 0.05);
  B.geo(F, page, { tint: 0xfffcf4 });
  B.box(F, 0.04, 0.55, 0.04, dx0 + 0.15, dy + 0.05, dz0 + 0.12, k(0x2a2a2a));
  B.box(F, 0.32, 0.03, 0.03, dx0 + 0.3, dy + 0.58, dz0 + 0.12, k(0x2a2a2a));
  B.box(t.G, 0.16, 0.08, 0.14, dx0 + 0.44, dy + 0.5, dz0 + 0.12, { tint: 0xfff0c0 });
  B.box(F, 0.07, 0.08, 0.07, dx1 - 0.12, dy + 0.05, dz1 - 0.15, k(0x1a1a24));
  B.box(F, 0.08, 0.12, 0.08, dx1 - 0.12, dy + 0.05, dz1 - 0.3, k(0x6a8aa8));
  for (let i = 0; i < 4; i++) B.box(F, 0.01, 0.14, 0.01, dx1 - 0.14 + i * 0.012, dy + 0.12, dz1 - 0.3, k([0x1a1a1a, 0xd83a2a, 0x2a5ab0, 0xf4f0e6][i]));
  B.box(F, 0.3, 0.12, 0.22, dx1 - 0.2, dy + 0.05, dz0 + 0.1, k(0xf4f0e6));
  // the chair (empty: he's out sketching) and a crumpled page on the floor
  B.box(F, 0.44, 0.06, 0.44, dx1 + 0.4, y0 + 0.45, (dz0 + dz1) / 2, k(0x2a2a2e));
  B.box(F, 0.06, 0.5, 0.4, dx1 + 0.62, y0 + 0.5, (dz0 + dz1) / 2, k(0x2a2a2e));
  B.box(F, 0.05, 0.45, 0.05, dx1 + 0.4, y0, (dz0 + dz1) / 2, k(0x8a8e92));
  B.box(F, 0.09, 0.08, 0.09, dx1 + 0.9, y0, z1 - 0.3, k(0xfbf8f0));
  // a tall plant in the window corner and a floor lamp's warm shade
  B.box(F, 0.3, 0.3, 0.3, x1 - 0.25, y0, z1 - 0.3, k(0xb4603a));
  B.box(F, 0.5, 0.7, 0.5, x1 - 0.25, y0 + 0.3, z1 - 0.3, k(0x3e7a34));
  B.box(F, 0.04, 1.5, 0.04, x1 - 0.3, y0, z0 + 0.6, k(0x2a2a2a));
  B.box(t.G, 0.34, 0.3, 0.34, x1 - 0.3, y0 + 1.5, z0 + 0.6, { tint: 0xffd8a0 });
}

/** Turn a geometry inside out (reverse winding, flip normals). */
function inward(g) {
  const a = g.index.array;
  for (let i = 0; i < a.length; i += 3) { const k = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = k; }
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

// ------------------------------------------------------------------ the vacant lot (空き地): concrete pipes, weeds, a for-sale board
function vacantLot(t, mats) {
  const B = t.B, m = t.m, P = PARK, x0 = 20.35, x1 = 26.0, z0 = -28.0, z1 = P.sz1;
  B.plane(m.grass, x1 - x0, z1 - z0, (x0 + x1) / 2, 0.01, (z0 + z1) / 2, { uv: [2, 3], k: 0.9 });
  // rope fence along the street
  for (let x = x0 + 0.1; x <= x1 - 0.2; x += 1.35) B.box(m.pv, 0.07, 0.7, 0.07, x, 0, z1 - 0.12, { tint: 0x7a5a3a });
  for (const y of [0.42, 0.62]) B.box(m.pv, x1 - x0 - 0.3, 0.025, 0.025, (x0 + x1) / 2 - 0.05, y, z1 - 0.12, { tint: y > 0.5 ? 0xf2c41a : 0x2a2a2a });
  // for-sale board on two posts
  for (const dx of [-0.32, 0.32]) B.box(m.wood, 0.06, 1.3, 0.06, 21.6 + dx, 0, z1 - 0.35, { tint: 0x5a4030 });
  t.sign('forSale', 0.6, 0.73, 21.6, 0.85, z1 - 0.31);
  // three concrete pipes (two side by side, one on top)
  const pipe = (x, y, z) => {
    const R = 0.5, r = 0.41, L = 2.0;
    const out = new THREE.CylinderGeometry(R, R, L, 14, 1, true); out.rotateZ(Math.PI / 2); out.translate(x, y + R, z);
    B.geo(m.conc, out, { tint: 0xc8c4bc });
    const inn = inward(new THREE.CylinderGeometry(r, r, L, 14, 1, true)); inn.rotateZ(Math.PI / 2); inn.translate(x, y + R, z);
    B.geo(m.conc, inn, { tint: 0x8a8680 });
    for (const s of [-1, 1]) { const ring = new THREE.RingGeometry(r, R, 14); ring.rotateY(s * Math.PI / 2); ring.translate(x + s * L / 2, y + R, z); B.geo(m.conc, ring, { tint: 0xb8b4ac }); }
  };
  pipe(23.4, 0, -23.2); pipe(23.4, 0, -24.22); pipe(23.4, 0.86, -23.71);
  t.game.player.addObstacle(22.3, 24.5, -24.8, -22.6);
  // weeds and tall grass all over, an old tyre, a rusty bicycle frame
  for (let i = 0; i < 16; i++) {
    const x = x0 + 0.4 + hash2(i, 61) * (x1 - x0 - 0.8), z = z0 + 0.6 + hash2(i, 62) * (z1 - z0 - 1.0);
    if (x > 22.1 && x < 24.7 && z > -25 && z < -22.4) continue;
    t.prop('weeds', x, 0, z, hash2(i, 63) * 6, { scale: 1.1 + hash2(i, 64) * 0.7 });
  }
  t.prop('tires', 21.3, 0, -24.8, 0.4, { scale: 0.8 });
  t.prop('crt_tv', 25.2, 0, -22.4, -0.8, { scale: 0.9 });
  // block wall at the back of the lot
  B.box(m.block, x1 - x0, 1.6, 0.15, (x0 + x1) / 2, 0, z0, { uv: [x0, 0], ao: 0.15 });
  B.box(m.found, x1 - x0, 0.07, 0.21, (x0 + x1) / 2, 1.6, z0);
}
