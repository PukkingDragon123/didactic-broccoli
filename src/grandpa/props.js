// Grandpa's things: his walking cane (a crook handle, a rubber foot), the round paper fan he fans himself with (a
// goldfish on it), the beige desk telephone his calls ring on (chunky voxel models), and the taxi that takes him to the
// station (a late-90s yellow-and-green taxi sedan from the vehicle kit, src/vehicles/taxi.js: fender mirrors, the lit
// roof lamp, the red 空車 sign, lace on the seats, a driver in his cap, a rear door that swings open by itself).
//   caneMesh() (origin = the grip, the shaft runs down -y)   fanMesh() (origin = the bottom of the handle)
//   phoneMesh() (origin = bottom centre)   new Taxi(game): root, setPose(x, z, heading), roll(d), setDoor(k), setLights(on)
import * as THREE from 'three';
import { VoxelModel, gloss, metal, glow } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { taxiParts, TAXI } from '../vehicles/taxi.js';

const hash = (x, y, z, s = 0) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(s + 1013, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const shade = (c, f) => { const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f); return (r << 16) | (g << 8) | b; };
const geoCache = {};
const mesh = (key, build, opts) => {
  if (!geoCache[key]) geoCache[key] = meshVoxels(build(), opts);
  const m = new THREE.Mesh(geoCache[key], voxelMaterials('normal'));
  m.castShadow = true; m.receiveShadow = true;
  return m;
};

// ------------------------------------------------------------------ the cane: dark varnished wood, 0.86 m
const CVS = 0.012;
export const CANE_LEN = 0.86;
function buildCane() {
  const v = new VoxelModel();
  v.jitter = 0.03;
  const L = Math.round(CANE_LEN / CVS); // 72
  const wood = (x, y, z) => gloss(shade(0x5a3418, 0.86 + hash(x, y >> 2, z, 2) * 0.2));
  v.box(-1, -L + 3, -1, 0, 0, 0, wood);
  v.box(-1, -L, -1, 0, -L + 2, 0, 0x1e1a18); // rubber foot
  v.box(-1, -L + 3, -1, 0, -L + 3, 0, metal(0x9a8a6a)); // brass ferrule
  // the crook: up, over and down the front
  for (let a = 0; a <= 12; a++) {
    const t = (a / 12) * Math.PI, x = 0, y = Math.round(Math.sin(t) * 5), z = Math.round(5 - Math.cos(t) * 5);
    v.box(x - 1, y, z - 1, x, y + 1, z, wood);
  }
  v.box(-1, -3, 9, 0, 0, 10, wood);
  v.pivot = { x: 0, y: 0, z: 0 };
  return v;
}
export const caneMesh = () => mesh('cane', buildCane, { voxelSize: CVS });

// ------------------------------------------------------------------ the uchiwa: a round paper fan with a goldfish
const FVS = 0.007;
function buildFan() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  const R = 13, cy = 30;
  const fish = [
    '....RR......',
    '..RRRRR...RR',
    '.RRWRRRR.RR.',
    'RRRRRRRRRR..',
    '.RRRRRRR.RR.',
    '..RRRRR...RR',
    '....RR......',
  ];
  for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) {
    if (x * x + y * y > R * R + 2) continue;
    let c = 0xf2ece0;
    if ((x * x + y * y) > (R - 1) * (R - 1)) c = 0x2f5a9a; // blue rim
    else if (y < -5 && Math.sin(x * 0.7 + y) > 0.55) c = 0x8ab0d8; // ripples
    v.set(x, cy + y, 0, c);
  }
  fish.forEach((row, r) => [...row].forEach((ch, i) => { if (ch === 'R') v.set(i - 6, cy + 4 - r, 1, 0xd8402a); else if (ch === 'W') v.set(i - 6, cy + 4 - r, 1, 0x1a1414); }));
  // bamboo ribs behind the paper and the handle
  for (let a = -5; a <= 5; a++) { const t = a * 0.28; for (let k = 3; k < R; k++) v.set(Math.round(Math.sin(t) * k), cy - R + 2 + Math.round(Math.cos(t) * k), -1, 0xc8a46a); }
  v.box(-1, 0, -1, 0, cy - R + 2, 0, 0xb8904a);
  v.pivot = { x: 0, y: 0, z: 0 };
  return v;
}
export const fanMesh = () => mesh('fan', buildFan, { voxelSize: FVS });

// ------------------------------------------------------------------ the desk telephone (beige, push buttons, coiled cord)
function buildPhone() {
  const v = new VoxelModel();
  v.jitter = 0.025;
  const B = 0xe2d6b8, BD = 0xc8ba98;
  v.box(-10, 0, -9, 10, 5, 9, B);
  v.box(-9, 6, -8, 9, 7, 2, BD);
  // the keypad: 3 x 4 buttons
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) v.set(-3 + c * 3, 6, 3 + r * 2 - 1, r === 3 && c !== 1 ? 0x9a8a70 : 0xf4efe2);
  v.box(-10, 0, 9, 10, 2, 9, BD);
  // the handset on its cradle
  v.box(-12, 8, -6, 12, 10, -1, B);
  v.box(-12, 7, -6, -8, 11, -1, BD); v.box(8, 7, -6, 12, 11, -1, BD);
  v.box(-4, 11, -5, 4, 11, -2, BD);
  // a red message lamp and the coiled cord to the left
  v.set(7, 6, 6, glow(0xd83a2a));
  for (let k = 0; k < 16; k++) { const a = k * 1.3; v.set(-13 - Math.round(k * 0.5), 2 + Math.round(Math.sin(a) * 1.2), -3 + Math.round(Math.cos(a) * 1.2), 0x2a2622); }
  return v;
}
export const phoneMesh = () => mesh('phone', buildPhone, { voxelSize: 0.01 });

// ------------------------------------------------------------------ the taxi (src/vehicles/taxi.js)
const SEAT = [0.4, -0.45], DOOR_SPOT = [1.45, -0.5]; // van-local (x, z): the rear seat, where a passenger waits
export class Taxi {
  constructor(game) {
    this.game = game;
    const P = taxiParts(), M = P.mats, T = TAXI;
    const root = this.root = new THREE.Group();
    root.name = 'taxi';
    this.body = new THREE.Group();
    root.add(this.body);
    const b = new THREE.Mesh(P.body, M.body);
    b.castShadow = b.receiveShadow = true;
    this.body.add(b);
    const gl = new THREE.Mesh(P.glass, M.glass);
    gl.renderOrder = 2; gl.raycast = () => {};
    this.body.add(gl);
    // the automatic rear door, hinged at its front edge
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(T.HINGE.x, 0, T.HINGE.z);
    const d = new THREE.Mesh(P.door, M.body);
    d.castShadow = true;
    const dg = new THREE.Mesh(P.doorGlass, M.glass);
    dg.renderOrder = 2; dg.raycast = () => {};
    this.doorPivot.add(d, dg);
    this.body.add(this.doorPivot);
    this.wheels = [];
    for (const [x, z] of [[-T.TRACK, T.AX], [T.TRACK, T.AX], [-T.TRACK, -T.AX], [T.TRACK, -T.AX]]) {
      const w = new THREE.Mesh(x > 0 ? P.wheelL : P.wheelR, M.body);
      w.position.set(x, T.WR, z);
      w.castShadow = true;
      root.add(w);
      this.wheels.push(w);
    }
    // lamps: headlights, tail lamps (as brakes), and the roof lamp / 空車 / meter, always lit
    const lit = (g) => { const m = new THREE.Mesh(g, M.lit); m.raycast = () => {}; this.body.add(m); return m; };
    this.heads = [lit(P.lit.heads)]; this.brakes = [lit(P.lit.brakes)];
    lit(P.lit.signs);
    this.setLights(true); this.setBrake(false);
    this.dist = 0;
    this.door = 0;
  }
  setPose(x, z, heading) { this.root.position.set(x, 0, z); this.root.rotation.y = heading; this.root.updateMatrixWorld(true); }
  roll(d) { this.dist += d; for (const w of this.wheels) w.rotation.x = this.dist / TAXI.WR; }
  /** The rear left door, 0 shut .. 1 open (it swings out on its front hinge). */
  setDoor(k) { this.door = k; this.doorPivot.rotation.y = -k * 1.3; }
  setLights(on) { for (const h of this.heads) h.visible = on; }
  setBrake(on) { for (const b of this.brakes) b.visible = on; }
  local(x, y, z, out = new THREE.Vector3()) { return this.root.localToWorld(out.set(x, y, z)); }
  /** Where a passenger stands to get in at the rear left door, and the seat behind it (world). */
  doorSpot(out = new THREE.Vector3()) { return this.local(DOOR_SPOT[0], 0, DOOR_SPOT[1], out); }
  seat(out = new THREE.Vector3()) { return this.local(SEAT[0], 0, SEAT[1], out); }
  dispose() { this.root.removeFromParent(); }
}
