// Your van: Grandpa's old kei box van (cab-over, right-hand drive), voxel art at 4 cm a voxel. Dents, rust round the
// arches, a roof rack with a tarp bundle and a ladder, yellow kei plates, moving boxes in the back and the faded
// "Gacha Garage" decal on both sides. The body, the four wheels and the driver's door are separate meshes (the wheels
// turn as it rolls, the door swings open); headlights and brake lights are small unlit boxes switched on and off.
// It drives in during the intro (you drive it yourself: src/drive/) and then stays parked across the lane from the garage.
//   van.root (Group, faces +z locally)   van.setPose(x, z, heading)   van.roll(dist)   van.setDoor(k 0..1)
//   van.setLights(on)  van.setBrake(on)   van.eye(out) driver's eye (world)   van.doorStep(out) where you stand once out
//   van.park() (obstacle + physics + door click)
// The cab, for driving it from the inside: a steering wheel on a steep cab-over column, a speedometer binnacle (needle,
// fuel gauge, handbrake / beam / radio lamps), the dash radio, the rear-view mirror with Grandpa's 交通安全 omamori
// swinging on its cord, and a little daruma on the dash.
//   van.place(x, y, z, heading, slope)   van.lean(pitch, roll, bounce)   van.steer(wheelAngle, steeringWheelTurn)
//   van.gauge(kmh)   van.lamps({ hand, beam, radio })   van.swing(dt, ax, az) (the charm, from the cab's acceleration)
//   van.cabGlass(clear) (near-clear windows while you sit inside)   van.cab = { wheel, spin, needle, charm, ... }
import * as THREE from 'three';
import { VoxelModel, gloss, metal, glass } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { vanDecalPix } from './art.js';
import { mask5, textW5 } from '../gfx/font5x7.js';

const VS = 0.04;
const HW = 18; // half width (voxels)
const ZF = 41, ZR = -41; // front face / rear face
const WR = 7, WZF = 27, WZR = -27; // wheel radius, front / rear axle z
export const PARK = { x: 3.4, z: 12.5, heading: -Math.PI / 2 }; // across the lane from the shutter, nose pointing west

function hash(x, y, z, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(s + 1013, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const shade = (c, f) => { const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f); return (r << 16) | (g << 8) | b; };

/** Outer surface of the body: front / rear faces and the half width at a height. */
const zFront = (y) => (y < 9 ? 41 : y < 24 ? 41 : y <= 41 ? 41 - (y - 24) * 0.25 : 36 - (y - 41) * 0.8);
const zRear = (y) => (y < 43 ? -41 : -40);
const halfW = (y) => (y < 8 ? 17 : y <= 40 ? HW : HW - (y - 40) * 0.5);
const inBody = (x, y, z) => {
  if (y < 5 || y > 45) return false;
  if (z > zFront(y) || z < zRear(y) || Math.abs(x) > halfW(y)) return false;
  // rounded roof edges and corners
  if (y >= 44 && Math.abs(x) > 16) return false;
  // wheel arches
  for (const wz of [WZF, WZR]) if (Math.abs(x) > 12 && (y - WR) ** 2 + (z - wz) ** 2 < 9.4 * 9.4) return false;
  return true;
};
const onShell = (x, y, z) => inBody(x, y, z) && (!inBody(x + 1, y, z) || !inBody(x - 1, y, z) || !inBody(x, y + 1, z) || !inBody(x, y - 1, z) || !inBody(x, y, z + 1) || !inBody(x, y, z - 1));

// the driver's door (vehicle right = -x): between the A-pillar and the B-pillar
const DOOR = { z0: 18, z1: 35, y0: 8, y1: 40 };
const isDoor = (x, y, z) => x < -HW + 1.5 && z >= DOOR.z0 && z <= DOOR.z1 && y >= DOOR.y0 && y <= Math.min(DOOR.y1, 39);

function windowAt(x, y, z) {
  // windscreen
  if (y >= 25 && y <= 40 && z > zFront(y) - 1.5 && Math.abs(x) <= 16) return true;
  if (Math.abs(x) >= HW - 1 && y >= 26 && y <= 39) {
    if (z >= 19 && z <= zFront(y) - 2) return true; // cab door windows
    if ((z >= -11 && z <= 12) || (z >= -37 && z <= -15)) return true; // cargo windows
  }
  if (z <= ZR + 0.5 && y >= 27 && y <= 40 && Math.abs(x) <= 13) return true; // rear hatch window
  return false;
}

function paint(x, y, z) {
  const side = Math.abs(x) >= HW - 0.5;
  // base: old cream paint, a blue band, rust low down near the arches, grime at the sills
  let c = 0xece6d4;
  if (y >= 21 && y <= 22) c = 0x3a6a9a;
  if (y >= 41) c = 0xf2eee2; // the roof, sun-faded whiter
  const n = hash(x >> 1, y >> 1, z >> 1, 3);
  c = shade(c, 0.93 + n * 0.09);
  const nearArch = Math.min(Math.hypot(y - WR, z - WZF), Math.hypot(y - WR, z - WZR));
  if (y < 12 && (nearArch < 12 || y < 8) && hash(x, y, z, 7) < 0.35 + (12 - y) * 0.04) c = hash(x, y, z, 8) < 0.5 ? 0x8a4a2a : 0x6a3a22;
  if (y < 9 && side) c = shade(c, 0.78);
  // seams: the driver's door, the sliding door, the rear hatch
  if (side && ((Math.abs(z - DOOR.z0 + 0.5) < 0.6 || Math.abs(z - DOOR.z1 - 0.5) < 0.6) && y >= DOOR.y0 && y <= 40)) c = 0x5a5850;
  if (side && x > 0 && (z === 14 || z === -13) && y >= 8 && y <= 40) c = 0x5a5850;
  if (z <= ZR && (Math.abs(x) === 15) && y >= 8 && y <= 41) c = 0x5a5850;
  return c;
}

/** The whole van body (with interior) minus the driver's door. */
function buildBody() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.shape(-HW, 5, ZR, HW, 45, ZF, (x, y, z) => onShell(x, y, z) && !isDoor(x, y, z), (x, y, z) => (windowAt(x, y, z) ? glass(0x46525e) : gloss(paint(x, y, z))));
  // the cab's inside: a grey headliner and dark trim over the bare metal (the cargo bay keeps its paint)
  const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let x = -HW + 1; x <= HW - 1; x++) for (let y = 8; y <= 44; y++) for (let z = 15; z <= ZF - 1; z++) {
    if (!inBody(x, y, z) || onShell(x, y, z) || v.has(x, y, z)) continue;
    if (N6.some(([dx, dy, dz]) => onShell(x + dx, y + dy, z + dz) && !isDoor(x + dx, y + dy, z + dz) && !windowAt(x + dx, y + dy, z + dz))) v.set(x, y, z, y >= 41 ? 0x8e8a82 : 0x4c4c4e);
  }
  // floor of the cab and the cargo bay
  v.box(-HW + 1, 6, ZR + 1, HW - 1, 6, ZF - 1, 0x4a4a48);
  // ---- front: grille, headlights, turn signals, bumper, plate
  for (let y = 13; y <= 16; y++) for (let x = -9; x <= 9; x++) v.set(x, y, ZF, gloss(y % 2 ? 0x2a2a2c : 0x46464a));
  for (const s of [-1, 1]) {
    v.box(s * 11, 12, ZF, s * 16, 17, ZF, metal(0xb8bcc2));
    v.box(s * 12, 13, ZF + 1, s * 15, 16, ZF + 1, gloss(0xf2f0e0));
    v.box(s * 12, 10, ZF, s * 15, 11, ZF, gloss(0xf0a030));
  }
  v.box(-HW, 6, ZF + 1, HW, 9, ZF + 2, metal(0x8a8e92));
  v.box(-5, 10, ZF + 1, 5, 12, ZF + 1, gloss(0xf2d23a));
  stamp(v, '50-71', 0, 12, ZF + 2, 0x2a3a2a, 1);
  // wipers, the rear-view mirror and Grandpa's omamori hanging off it
  v.line(-13, 25, ZF - 1, -3, 27, ZF - 2, 0x1a1a1a);
  v.line(2, 25, ZF - 1, 12, 27, ZF - 2, 0x1a1a1a);
  v.box(-2, 39, 36, 1, 39, 36, 0x1a1a1a); v.set(0, 40, 37, 0x1a1a1a); // (the omamori hangs off it: van.cab.charm)
  // door mirrors on stalks
  for (const s of [-1, 1]) { v.box(s * 19, 30, 36, s * 20, 33, 37, 0x1e1e1e); v.set(s * 18.6 | 0, 30, 37, 0x1e1e1e); }
  // ---- rear: tail lights, bumper, plate, hatch handle
  for (const s of [-1, 1]) v.box(s * 15, 12, ZR, s * 17, 19, ZR, gloss(0xc81e1e));
  v.box(-HW, 6, ZR - 2, HW, 9, ZR - 1, metal(0x8a8e92));
  v.box(-5, 11, ZR - 1, 5, 13, ZR - 1, gloss(0xf2d23a));
  stamp(v, '50-71', 0, 13, ZR - 2, 0x2a3a2a, -1);
  v.box(-2, 24, ZR - 1, 2, 24, ZR - 1, metal(0x9a9ea2));
  // door handles, fuel cap
  v.box(-HW - 1, 23, 21, -HW - 1, 23, 23, metal(0x9a9ea2));
  v.box(HW + 1, 23, -9, HW + 1, 23, -7, metal(0x9a9ea2));
  v.box(HW, 15, -33, HW, 17, -31, 0x6a6a68);
  // dents: the passenger-side rear quarter and the front bumper corner
  for (let y = 12; y <= 17; y++) for (let z = -31; z <= -24; z++) if (((y - 14.5) / 3) ** 2 + ((z + 27.5) / 4) ** 2 < 1 && v.has(HW, y, z)) { const c = v.get(HW, y, z); v.remove(HW, y, z); v.set(HW - 1, y, z, c); }
  for (let x = 14; x <= HW; x++) v.remove(x, 9, ZF + 2);
  // ---- inside the cab: dashboard, gauges, the steering wheel (right-hand drive), two seats, a photo on the dash
  v.box(-16, 23, 32, 16, 26, 38, (x, y, z) => (y === 26 ? 0x2e2e30 : 0x3a3a3c));
  v.box(-16, 22, 32, 16, 22, 33, 0x2a2a2c); // the lip under the dash
  // the speedometer binnacle in front of the driver (the dial itself is a textured plane: van.cab.face)
  v.box(-13, 27, 37, -4, 29, 38, 0x2a2a2c);
  v.box(-13, 30, 36, -4, 30, 38, 0x2c2c2e); v.box(-13, 27, 36, -13, 29, 36, 0x262628); v.box(-4, 27, 36, -4, 29, 36, 0x262628); // hood and cheeks
  // the steering column, raked steeply like a bus (the wheel itself turns: van.cab.wheel)
  v.line(-9, 23, 30, -9, 27, 32, 0x2a2a2a, 0.7);
  v.box(-10, 22, 30, -8, 24, 32, 0x2a2a2c);
  // dash radio and the heater sliders, centre console
  v.box(-3, 23, 31, 4, 25, 31, 0x1e1e20); v.box(-2, 24, 30, 3, 24, 30, 0x2a2a2c);
  for (const x of [-2, 0, 2]) v.set(x, 23, 30, 0x8a8a8a);
  v.box(-3, 19, 31, 4, 21, 31, 0x262628); v.set(-1, 20, 30, 0xc8c8c0); v.set(2, 20, 30, 0xc8c8c0);
  v.box(9, 27, 34, 11, 30, 34, 0xf4f0e6); v.box(10, 28, 34, 10, 29, 34, 0x8a6a5a); // Grandpa's photo, propped up
  // a small daruma on the dash and a box of tissues on the passenger side
  v.box(5, 27, 35, 6, 28, 36, gloss(0xc8282a)); v.set(5, 28, 35, 0xf4ecd8); v.set(6, 29, 36, gloss(0xc8282a)); v.set(5, 29, 36, gloss(0xc8282a));
  v.box(11, 27, 36, 15, 28, 38, 0xe8e2d4); v.box(12, 29, 37, 14, 29, 37, 0xf8f6f0);
  for (const [x0, x1] of [[-15, -3], [3, 15]]) {
    v.box(x0, 14, 18, x1, 16, 28, (x, y, z) => ((x + z) % 4 ? 0x5a6a7a : 0x4a5868));
    v.box(x0, 17, 16, x1, 33, 17, (x, y, z) => ((y >> 1) % 3 ? 0x5a6a7a : 0x4a5868));
    v.box(x0 + 3, 34, 16, x1 - 3, 36, 17, 0x4a5868);
  }
  // the bulkhead behind the seats, and your moving boxes in the cargo bay
  v.box(-16, 7, 14, 16, 22, 14, 0x3a3a3c);
  const boxes = [[-14, 7, -36, -2, 17, -22], [0, 7, -38, 13, 15, -26], [-12, 18, -34, -3, 25, -25], [-14, 7, -18, -1, 13, -6], [2, 7, -20, 14, 19, -8]];
  boxes.forEach(([x0, y0, z0, x1, y1, z1], i) => {
    v.box(x0, y0, z0, x1, y1, z1, (x, y, z) => shade(0xc8965a, 0.9 + hash(x, y, z, i) * 0.12));
    v.box(x0, y1, (z0 + z1) >> 1, x1, y1, ((z0 + z1) >> 1) + 1, 0xd8c890);
  });
  // ---- roof rack: rails, cross bars, a tarp bundle roped down, a ladder
  const rack = metal(0x2a2c30);
  for (const s of [-1, 1]) { v.box(s * 14, 47, -38, s * 14, 47, 32, rack); for (const z of [-38, -12, 12, 32]) v.box(s * 14, 46, z, s * 14, 46, z, rack); }
  for (const z of [-30, -10, 10, 28]) v.box(-14, 47, z, 14, 47, z, rack);
  v.box(-11, 48, -27, 9, 52, -4, (x, y, z) => gloss(shade(0x2f6fd6, 0.85 + hash(x >> 1, y, z >> 1, 4) * 0.25)));
  for (const z of [-22, -10]) v.box(-12, 53, z, 10, 53, z, 0xc8b070);
  for (const z of [-22, -10]) for (let y = 48; y <= 52; y++) { v.set(-12, y, z, 0xc8b070); v.set(10, y, z, 0xc8b070); }
  for (const x of [3, 11]) v.box(x, 48, 2, x, 48, 30, 0xd4a46a);
  for (let z = 4; z <= 28; z += 4) v.box(3, 48, z, 11, 48, z, 0xb8884a);
  return v;
}

/** 5x7 digits on a plate face (dir +1: front, read from +z; -1: rear, read from -z). */
function stamp(v, str, cx, y, z, col, dir) {
  const w = textW5(str);
  for (const [i, j] of mask5(str)) v.set(dir > 0 ? cx - (w >> 1) + i : cx + (w >> 1) - i, y - j - 1, z, col);
}

function buildDoor() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.shape(-HW, DOOR.y0, DOOR.z0, -HW + 1, 39, DOOR.z1, (x, y, z) => onShell(x, y, z) && isDoor(x, y, z), (x, y, z) => (windowAt(x, y, z) ? glass(0x46525e) : x > -HW + 0.5 && !onShell(x + 1, y, z) ? 0x4c4c4e : gloss(paint(x, y, z))));
  for (let y = 23; y <= 39; y++) for (let z = DOOR.z0; z <= DOOR.z1; z++) if (!windowAt(-HW, y, z) && !v.has(-HW + 1, y, z) && inBody(-HW + 1, y, z)) v.set(-HW + 1, y, z, 0x4c4c4e);
  v.box(-HW + 2, 10, DOOR.z0 + 1, -HW + 2, 22, DOOR.z1 - 1, 0x4a4a4c); // the door card inside
  v.box(-HW - 1, 23, 21, -HW - 1, 23, 23, metal(0x9a9ea2));
  return v;
}

function buildWheel() {
  const v = new VoxelModel();
  v.jitter = 0.03;
  v.cylinder(0, 0, 0, WR, 4, (x, y, z) => (y * y + z * z > 16 ? 0x1e1e1e : y * y + z * z > 9 ? metal(0xc8ccd2) : metal(0x8a8e92)), 'x');
  for (let a = 0; a < 6; a++) v.set(4, Math.round(Math.cos(a) * 2), Math.round(Math.sin(a) * 2), 0x3a3a3a); // lug nuts
  return v;
}

// ---- the cab, at half the voxel size (2 cm): steering wheel and the omamori
const CS = VS / 2;
/** The steering wheel in its own plane (x right, y up, facing -z towards the driver): rim, three spokes, horn pad. */
function buildSteeringWheel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  const R = 9;
  v.torus(0, 0, 0, R, 1.15, (x, y) => (y > 5 && Math.abs(x) < 4 ? 0x6a5444 : 0x4a3a30), 'z'); // brown bakelite, worn at the top
  for (const [ex, ey] of [[0, -R], [-R + 1, 1], [R - 1, 1]]) v.line(0, 0, 0, ex, ey, 0, 0x2a2a2c, 0.7);
  v.cylinder(0, 0, -2, 3.2, 3, 0x262628, 'z');
  v.cylinder(0, 0, -2, 1.2, 1, metal(0xb8bcc2), 'z'); // the emblem on the horn pad
  for (let y = -2; y <= 2; y++) v.set(0, y, 1, 0x2a2a2a); // the boss into the column
  return v;
}
/** Grandpa's 交通安全 omamori: a red brocade bag on a cord, gold knot, hanging from the pivot at the top (y = 0 down). */
function buildCharm() {
  const v = new VoxelModel();
  v.jitter = 0.03;
  for (let y = -1; y >= -4; y--) v.set(0, y, 0, 0xe8d8b0); // the cord
  v.set(0, -5, 0, 0xf2c83a); // the knot
  v.box(-1, -9, 0, 1, -6, 0, (x, y) => ((x + y) % 3 === 0 ? 0xe8b83a : 0xc8202a));
  v.set(0, -10, 0, 0xc8202a);
  v.pivot = { x: 0, y: 0, z: 0 };
  return v;
}

/** A material for the inside of the cab: the sun's direct light scaled down (the roof shades you), sky and bounce kept. */
export function cabShade(m, k = 0.33) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace(/getDirectionalLightInfo\( directionalLight, directLight \);/g, `getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= ${k.toFixed(2)};`));
  };
  const key = m.customProgramCacheKey?.() || '';
  m.customProgramCacheKey = () => key + '-cab' + k;
  return m;
}

const geoCache = {};
function geos() {
  if (geoCache.body) return geoCache;
  geoCache.body = meshVoxels(buildBody(), { voxelSize: VS, origin: 'none' });
  const d = buildDoor();
  d.pivot = { x: -HW, y: 0, z: DOOR.z1 + 1 }; // the hinge: front edge of the door
  geoCache.door = meshVoxels(d, { voxelSize: VS });
  geoCache.wheel = meshVoxels(buildWheel(), { voxelSize: VS, origin: 'center' });
  geoCache.steer = meshVoxels(buildSteeringWheel(), { voxelSize: CS, origin: 'center' });
  geoCache.charm = meshVoxels(buildCharm(), { voxelSize: CS });
  return geoCache;
}

// where the cab parts sit (van-local metres)
export const CAB = {
  wheel: new THREE.Vector3(-0.34, 1.15, 1.30), wheelTilt: 0.86, wheelR: 9 * CS, // centre, tilt back from vertical, rim radius
  dial: { x: -0.32, y: 1.14, z: 1.478, w: 0.32, h: 0.11 },
  mirror: { x: 0.0, y: 1.58, z: 1.438, w: 0.16, h: 0.045 },
  charm: new THREE.Vector3(0.0, 1.555, 1.45),
};
const DIAL_W = 100, DIAL_H = 30, DIAL_C = [30, 27]; // the dial texture and its needle pivot (px)

/** Paint the binnacle face: speedometer (0-120), fuel gauge, warning lamps. */
function paintDial(ctx, lamps = {}) {
  const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  P(0, 0, DIAL_W, DIAL_H, '#141416');
  P(1, 1, DIAL_W - 2, DIAL_H - 2, '#1c1c20');
  const [cx, cy] = DIAL_C;
  // the speedometer arc: ticks every 10, numbers every 40
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI - (k / 12) * Math.PI, big = k % 2 === 0;
    for (let r = big ? 17 : 19; r <= 21; r++) P(Math.round(cx + Math.cos(a) * r), Math.round(cy - Math.sin(a) * r), 1, 1, big ? '#f4f0e0' : '#a8a498');
  }
  for (let k = 0; k <= 60; k++) { const a = Math.PI - (k / 60) * Math.PI; P(Math.round(cx + Math.cos(a) * 22), Math.round(cy - Math.sin(a) * 22), 1, 1, '#5a5a5e'); }
  const num = (str, x, y, col) => { ctx.fillStyle = col; for (const [i, j] of mask5(str)) ctx.fillRect(x - (textW5(str) >> 1) + i, y + j, 1, 1); };
  num('0', cx - 13, cy - 4, '#f4f0e0'); num('40', cx - 7, cy - 15, '#f4f0e0'); num('80', cx + 7, cy - 15, '#f4f0e0'); num('120', cx + 12, cy - 4, '#f4f0e0');
  num('KM', cx, cy - 8, '#8a8678');
  P(0, DIAL_H - 2, DIAL_W, 2, '#141416');
  // fuel: E . . F with the needle a little over a quarter
  const fx = 74, fy = 24;
  for (let k = 0; k <= 4; k++) { const a = Math.PI * 0.85 - (k / 4) * Math.PI * 0.7; P(Math.round(fx + Math.cos(a) * 11), Math.round(fy - Math.sin(a) * 11), 1, 2, k === 0 ? '#d8402a' : '#c8c4b8'); }
  num('E', fx - 11, fy - 4, '#d8402a'); num('F', fx + 11, fy - 4, '#c8c4b8');
  { const a = Math.PI * 0.85 - 0.3 * Math.PI * 0.7; for (let r = 2; r <= 9; r++) P(Math.round(fx + Math.cos(a) * r), Math.round(fy - Math.sin(a) * r), 1, 1, '#f08a2a'); }
  P(fx - 1, fy - 1, 3, 3, '#3a3a3e');
  // lamps: handbrake (red P), headlights (green), radio (amber FM)
  const lamp = (x, on, col, str) => { P(x, 3, 9, 7, on ? col : '#26262a'); num(str, x + 5, 4, on ? '#1a1416' : '#3a3a3e'); };
  lamp(60, !!lamps.hand, '#e8402a', 'P'); lamp(71, !!lamps.beam, '#58d058', 'L'); lamp(82, !!lamps.radio, '#f0b030', 'FM');
}

/** A fake reflection for the rear-view mirror: the cargo bay, the boxes, the rear window full of sky. */
function paintMirror(ctx) {
  const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  P(0, 0, 40, 16, '#3e4046');
  P(8, 2, 24, 8, '#c8d0d4'); P(8, 7, 24, 3, '#9aa4a0'); P(8, 2, 24, 1, '#e8e4d8');
  P(4, 9, 9, 7, '#a8784a'); P(5, 9, 7, 1, '#c8965a'); P(25, 8, 10, 8, '#b8865a'); P(26, 8, 8, 1, '#d0a46a');
  P(14, 11, 10, 5, '#4a4a48');
  P(0, 0, 40, 1, '#1a1a1a'); P(0, 15, 40, 1, '#1a1a1a'); P(0, 0, 1, 16, '#1a1a1a'); P(39, 0, 1, 16, '#1a1a1a');
}

export class Van {
  constructor(game) {
    this.game = game;
    const G = geos(), mats = voxelMaterials('normal');
    const root = new THREE.Group();
    root.name = 'van';
    this.root = root;
    this.body = new THREE.Group(); // bobs on the suspension
    root.add(this.body);
    const body = new THREE.Mesh(G.body, mats);
    body.castShadow = true; body.receiveShadow = true;
    this.body.add(body);
    this.bodyMesh = body;
    // the door hangs on its hinge (pivot at the door's front edge)
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(-HW * VS, 0, (DOOR.z1 + 1) * VS);
    const door = new THREE.Mesh(G.door, mats);
    door.castShadow = true;
    this.doorPivot.add(door);
    this.body.add(this.doorPivot);
    this.doorMesh = door;
    this.door = 0;
    // wheels (outside the bobbing body)
    this.wheels = [];
    for (const [x, z] of [[-15.5, WZF], [15.5, WZF], [-15.5, WZR], [15.5, WZR]]) {
      const w = new THREE.Mesh(G.wheel, mats);
      w.position.set(x * VS + VS * 0.5, WR * VS + VS * 0.5, (z + 0.5) * VS);
      w.castShadow = true;
      root.add(w);
      this.wheels.push(w);
    }
    // the decal on both sides
    const dt = vanDecalPix().texture();
    const dm = new THREE.MeshStandardMaterial({ map: dt, alphaTest: 0.5, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const s of [-1, 1]) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.44), dm);
      pl.rotation.y = s * Math.PI / 2;
      pl.position.set(s > 0 ? (HW + 1) * VS + 0.003 : -HW * VS - 0.003, 0.56, s > 0 ? -0.5 : -0.62);
      this.body.add(pl);
    }
    // lights: unlit boxes (headlights, brake lights), off until switched on
    const lamp = (col) => new THREE.MeshBasicMaterial({ color: col });
    this.headM = lamp(0xfff4d0); this.brakeM = lamp(0xff3020);
    this.heads = []; this.brakes = [];
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(4 * VS, 4 * VS, VS * 0.4), this.headM);
      h.position.set(s * 13.5 * VS + VS * 0.5, 14.5 * VS + VS * 0.5, (ZF + 2.25) * VS);
      this.body.add(h); this.heads.push(h);
      const b = new THREE.Mesh(new THREE.BoxGeometry(3 * VS, 8 * VS, VS * 0.4), this.brakeM);
      b.position.set(s * 16 * VS + VS * 0.5, 15.5 * VS + VS * 0.5, ZR * VS - VS * 0.25);
      this.body.add(b); this.brakes.push(b);
    }
    this.setLights(false); this.setBrake(false);
    // front wheels steer about their kingpin before they spin
    for (const w of this.wheels.slice(0, 2)) w.rotation.order = 'YXZ';
    root.rotation.order = 'YXZ'; // heading, then the slope of the road
    this.buildCab(G, mats);
    game.scene.add(root);
    this.dist = 0;
    this.bob = 0;
    this.setPose(PARK.x, PARK.z, PARK.heading);
  }

  /** Steering wheel, speedometer, mirror and the swinging omamori (inside the bobbing body). */
  buildCab(G, mats) {
    const cab = this.cab = { charmA: [0, 0], charmV: [0, 0], kmh: 0, lampState: '' };
    // steering wheel: tilt (pivot) -> turn (spin) -> mesh
    cab.wheel = new THREE.Group();
    cab.wheel.position.copy(CAB.wheel);
    cab.wheel.rotation.x = CAB.wheelTilt;
    cab.spin = new THREE.Group();
    cab.wheel.add(cab.spin);
    const sw = new THREE.Mesh(G.steer, mats);
    sw.castShadow = false;
    cab.spin.add(sw);
    this.body.add(cab.wheel);
    // the binnacle face (canvas) and its needle
    const c = document.createElement('canvas');
    c.width = DIAL_W; c.height = DIAL_H;
    cab.dialCtx = c.getContext('2d');
    paintDial(cab.dialCtx);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    cab.dialTex = tex;
    const D = CAB.dial;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(D.w, D.h), cabShade(new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.45, roughness: 0.4 }), 0.2));
    face.position.set(D.x, D.y, D.z);
    face.rotation.y = Math.PI;
    this.body.add(face);
    cab.face = face;
    const ng = new THREE.BoxGeometry(0.0045, 0.05, 0.003);
    ng.translate(0, 0.019, 0);
    const needle = new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ color: 0xff5a2a }));
    needle.position.set((DIAL_C[0] / DIAL_W - 0.5) * D.w, (0.5 - DIAL_C[1] / DIAL_H) * D.h, 0.004);
    face.add(needle);
    cab.needle = needle;
    // rear-view mirror glass
    const mc = document.createElement('canvas');
    mc.width = 40; mc.height = 16;
    paintMirror(mc.getContext('2d'));
    const mt = new THREE.CanvasTexture(mc);
    mt.colorSpace = THREE.SRGBColorSpace; mt.magFilter = THREE.NearestFilter; mt.minFilter = THREE.NearestFilter; mt.generateMipmaps = false;
    const M = CAB.mirror;
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(M.w, M.h), new THREE.MeshBasicMaterial({ map: mt, color: 0xd8d8d8 }));
    mirror.position.set(M.x, M.y, M.z);
    mirror.rotation.y = Math.PI;
    this.body.add(mirror);
    // the omamori on its cord
    cab.charm = new THREE.Group();
    cab.charm.position.copy(CAB.charm);
    cab.charm.add(new THREE.Mesh(G.charm, mats));
    this.body.add(cab.charm);
    this.gauge(0);
  }

  /** Put the van down at a pose: x, ground height y, z, heading, slope (> 0 tips the nose down, as on a descent). */
  place(x, y, z, heading, slope = 0) {
    this.root.position.set(x, y, z);
    this.root.rotation.set(slope, heading, 0);
    this.root.updateMatrixWorld(true);
  }

  /** Body on its springs: pitch (> 0 nose down), roll (> 0 leans to the van's right, -x), bounce (m). */
  lean(pitch, roll = 0, bounce = 0) {
    this.body.rotation.set(pitch, 0, roll);
    this.body.position.y = bounce;
  }

  /** Front wheels turned by `angle` (> 0 to the left), the steering wheel by `turn` (> 0 clockwise for the driver). */
  steer(angle, turn = -angle * 9) {
    this.wheels[0].rotation.y = this.wheels[1].rotation.y = angle;
    if (this.cab) this.cab.spin.rotation.z = turn;
  }

  /** Speedometer needle (km/h, 0-120). */
  gauge(kmh) {
    const cab = this.cab;
    if (!cab) return;
    cab.kmh += (Math.max(0, Math.min(125, kmh)) - cab.kmh) * 0.35; // a little needle lag
    cab.needle.rotation.z = Math.PI / 2 - (cab.kmh / 120) * Math.PI + Math.sin(cab.kmh * 1.7) * 0.01;
  }

  /** Dashboard lamps: { hand, beam, radio } (repaints the dial only when something changes). */
  lamps(l) {
    const cab = this.cab, k = `${+!!l.hand}${+!!l.beam}${+!!l.radio}`;
    if (!cab || k === cab.lampState) return;
    cab.lampState = k;
    paintDial(cab.dialCtx, l);
    cab.dialTex.needsUpdate = true;
  }

  /** The omamori swings with the cab's acceleration: ax forward, az to the van's left (m/s²). */
  swing(dt, ax = 0, az = 0) {
    const cab = this.cab;
    if (!cab || dt <= 0) return;
    const L = 0.11, g = 9.8, c = 2.2, A = cab.charmA, Vv = cab.charmV;
    const h = Math.min(dt, 1 / 30);
    for (let i = 0; i < 2; i++) {
      const f = i === 0 ? ax : -az;
      Vv[i] += (-(g / L) * Math.sin(A[i]) + (f / L) * Math.cos(A[i]) - c * Vv[i]) * h;
      A[i] = Math.max(-1.1, Math.min(1.1, A[i] + Vv[i] * h));
    }
    cab.charm.rotation.set(A[0], 0, A[1]);
  }

  /** While you sit inside: near-clear windows, and the cab in the roof's shade (direct sun cut to a third). */
  cabGlass(clear) {
    const sw = this.cab?.spin.children[0], ch = this.cab?.charm.children[0];
    if (!clear) { this.bodyMesh.material = this.doorMesh.material = voxelMaterials('normal'); if (sw) sw.material = ch.material = voxelMaterials('normal'); return; }
    if (!Van.clearMats) {
      const n = voxelMaterials('normal');
      const gl = n[4].clone();
      gl.opacity = 0.1; gl.clearcoat = 0; gl.roughness = 0.9; gl.specularIntensity = 0.05; gl.envMapIntensity = 0.2; // no hot sun glint on the glass
      const gs = n[1].clone(); gs.clearcoat = 0; gs.roughness = 0.62; // no sharp sun glints in the cab (they bloom)
      const ms = n[2].clone(); ms.roughness = 0.6;
      Van.clearMats = [cabShade(n[0].clone()), cabShade(gs), cabShade(ms), n[3], gl];
    }
    this.bodyMesh.material = this.doorMesh.material = Van.clearMats;
    if (sw) sw.material = ch.material = Van.clearMats;
  }

  setPose(x, z, heading = PARK.heading) {
    this.root.position.set(x, 0, z);
    this.root.rotation.set(0, heading, 0);
    this.root.updateMatrixWorld(true);
  }

  /** Roll the wheels on by `d` metres (and a touch of body bounce). */
  roll(d) {
    this.dist += d;
    const a = this.dist / (WR * VS);
    for (const w of this.wheels) w.rotation.x = a;
  }

  /** Body pitch / bounce: pitch > 0 dips the nose (braking). */
  suspend(pitch, bounce = 0) {
    this.body.rotation.x = pitch;
    this.body.position.y = bounce;
  }

  setLights(on) { for (const h of this.heads) h.visible = on; }
  setBrake(on) { for (const b of this.brakes) b.visible = on; }

  /** Driver door open amount 0..1 (it swings out about its front hinge). */
  setDoor(k) {
    this.door = k;
    this.doorPivot.rotation.y = k * 1.15;
  }

  local(x, y, z, out = new THREE.Vector3()) { return this.root.localToWorld(out.set(x, y, z)); }
  /** The driver's eye, sitting in the cab (world). */
  eye(out = new THREE.Vector3()) { return this.local(-8.5 * VS, 1.42, 25 * VS, out); }
  /** A point ahead of the driver, through the windscreen (world). */
  ahead(dist = 10, out = new THREE.Vector3()) { return this.local(-8.5 * VS, 1.3, 25 * VS + dist, out); }
  /** Where you stand once you're out of the driver's door (world, on the ground). */
  doorStep(out = new THREE.Vector3()) { return this.local(-HW * VS - 0.55, 0, 26 * VS, out); }

  /** Parked for good: something to bump into, a door you can open and shut. */
  park() {
    const g = this.game;
    if (this.parked) return;
    this.parked = true;
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.bodyMesh);
    this.ob = g.player.addObstacle(box.min.x, box.max.x, box.min.z, box.max.z);
    const c = box.getCenter(new THREE.Vector3()), hs = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    g.physics.addBox({ center: c, half: hs, material: 'metal' });
    g.interaction.add(this.doorMesh, {
      reach: 2.4,
      hint: () => ({ key: 'LMB', text: this.door > 0.5 ? 'Shut the van door' : 'Open the van door', sub: "Grandpa's old van" }),
      use: () => { this.toggleDoor(); return false; },
    });
    g.interaction.add(this.bodyMesh, { reach: 2.4, hint: () => ({ key: '', text: "Grandpa's old van", sub: 'It still smells of his cigarettes' }), use: () => false });
  }

  toggleDoor() {
    const g = this.game, from = this.door, to = from > 0.5 ? 0 : 1;
    const p = this.local(-HW * VS, 1.0, 26 * VS);
    if (to) audio.play('carDoor', { pos: p, vol: 0.8 });
    g.tweens.add({ dur: to ? 0.45 : 0.3, ease: to ? ease.outCubic : ease.inQuad, update: (k) => this.setDoor(from + (to - from) * k), done: () => { if (!to) { audio.play('carDoor', { pos: p, close: true, vol: 1 }); g.player.shake = Math.max(g.player.shake, 0.12); } } });
  }
}
