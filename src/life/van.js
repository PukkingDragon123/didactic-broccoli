// Your van: Grandpa's old kei box van (cab-over, right-hand drive), voxel art at 4 cm a voxel. Dents, rust round the
// arches, a roof rack with a tarp bundle and a ladder, yellow kei plates, moving boxes in the back and the faded
// "Gacha Garage" decal on both sides. The body, the four wheels and the driver's door are separate meshes (the wheels
// turn as it rolls, the door swings open); headlights and brake lights are small unlit boxes switched on and off.
// It drives in during the intro (src/game/Story.js introScene) and then stays parked across the lane from the garage.
//   van.root (Group, faces +z locally)   van.setPose(x, z, heading)   van.roll(dist)   van.setDoor(k 0..1)
//   van.setLights(on)  van.setBrake(on)   van.eye(out) driver's eye (world)   van.doorStep(out) where you stand once out
//   van.park() (obstacle + physics + door click)
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
  if (y >= 25 && y <= 40 && z > zFront(y) - 1.5 && Math.abs(x) <= 15) return true;
  if (Math.abs(x) >= HW - 1 && y >= 26 && y <= 39) {
    if (z >= 19 && z <= zFront(y) - 3) return true; // cab door windows
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
  v.box(-2, 38, 34, 2, 39, 34, 0x1a1a1a);
  v.box(0, 34, 34, 1, 36, 34, gloss(0xd8282a)); v.set(0, 37, 34, 0xf2d23a);
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
  v.box(-16, 23, 32, 16, 26, 38, 0x3a3a3c);
  v.box(-13, 27, 33, -4, 27, 35, 0x1e1e20); v.set(-9, 27, 35, 0xffb040); v.set(-7, 27, 35, 0x60d060);
  v.torus(-8, 28, 31, 3.6, 0.55, 0x1a1a1a, 'z'); v.line(-8, 28, 31, -8, 25, 34, 0x2a2a2a);
  v.box(9, 27, 34, 11, 30, 34, 0xf4f0e6); v.box(10, 28, 34, 10, 29, 34, 0x8a6a5a); // Grandpa's photo, propped up
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
  v.shape(-HW, DOOR.y0, DOOR.z0, -HW + 1, 39, DOOR.z1, (x, y, z) => onShell(x, y, z) && isDoor(x, y, z), (x, y, z) => (windowAt(x, y, z) ? glass(0x46525e) : gloss(paint(x, y, z))));
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

const geoCache = {};
function geos() {
  if (geoCache.body) return geoCache;
  geoCache.body = meshVoxels(buildBody(), { voxelSize: VS, origin: 'none' });
  const d = buildDoor();
  d.pivot = { x: -HW, y: 0, z: DOOR.z1 + 1 }; // the hinge: front edge of the door
  geoCache.door = meshVoxels(d, { voxelSize: VS });
  geoCache.wheel = meshVoxels(buildWheel(), { voxelSize: VS, origin: 'center' });
  return geoCache;
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
    game.scene.add(root);
    this.dist = 0;
    this.bob = 0;
    this.setPose(PARK.x, PARK.z, PARK.heading);
  }

  setPose(x, z, heading = PARK.heading) {
    this.root.position.set(x, 0, z);
    this.root.rotation.y = heading;
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
