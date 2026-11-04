// Grandpa's things, as chunky voxel models: his walking cane (a crook handle, a rubber foot), the round paper fan he
// fans himself with (a goldfish on it), the beige desk telephone his calls ring on, and the taxi that takes him to
// the station (a boxy late-Shōwa sedan, two-tone green and cream, fender mirrors, the roof lamp and the red VACANT
// plate behind the windscreen, a rear door that swings open by itself).
//   caneMesh() (origin = the grip, the shaft runs down -y)   fanMesh() (origin = the bottom of the handle)
//   phoneMesh() (origin = bottom centre)   new Taxi(game): root, setPose(x, z, heading), roll(d), setDoor(k), setLights(on)
import * as THREE from 'three';
import { VoxelModel, gloss, metal, glass, glow } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';

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

// ------------------------------------------------------------------ the taxi
const TVS = 0.05;
const THW = 17, TZF = 45, TZR = -45, TWR = 6, TWZ = 28;
// side profile: hood, cabin, boot (y of the top surface by z)
const topAt = (z) => (z > 22 ? 16 - Math.max(0, z - 38) * 0.4 : z > 13 ? 16 + (22 - z) * 1.4 : z > -16 ? 29 : z > -24 ? 29 - (-16 - z) * 1.5 : 17);
const halfAt = (y) => (y <= 17 ? THW : THW - Math.round((y - 17) * 0.25));
const inTaxi = (x, y, z) => {
  if (y < 4 || z > TZF || z < TZR) return false;
  if (y > topAt(z)) return false;
  if (Math.abs(x) > halfAt(y)) return false;
  if (y >= topAt(z) && Math.abs(x) > halfAt(y) - 1) return false; // rounded roof edges
  for (const wz of [TWZ, -TWZ]) if (Math.abs(x) > 11 && (y - TWR) ** 2 + (z - wz) ** 2 < 8.6 * 8.6) return false;
  return true;
};
const onTaxi = (x, y, z) => inTaxi(x, y, z) && (!inTaxi(x + 1, y, z) || !inTaxi(x - 1, y, z) || !inTaxi(x, y + 1, z) || !inTaxi(x, y - 1, z) || !inTaxi(x, y, z + 1) || !inTaxi(x, y, z - 1));
const REAR_DOOR = { z0: -19, z1: -1, y0: 6, y1: 27 };
const isRearDoor = (x, y, z) => x > THW - 1.5 && z >= REAR_DOOR.z0 && z <= REAR_DOOR.z1 && y >= REAR_DOOR.y0 && y <= REAR_DOOR.y1;
const taxiWindow = (x, y, z) => {
  if (y >= 18 && y <= 27 && z <= 12 && z >= -15 && Math.abs(x) >= halfAt(y) - 0.5 && !(z >= -1 && z <= 1)) return true; // side windows (a pillar between)
  if (z > 13 && z < 22 && y > 17 && Math.abs(x) <= halfAt(y) - 2) return true; // windscreen
  if (z < -16 && z > -24 && y > 17 && Math.abs(x) <= halfAt(y) - 2) return true; // rear window
  return false;
};
function taxiPaint(x, y, z) {
  let c = y >= 15 ? 0xeee4cc : 0x2a6a46; // cream upper, deep green lower
  if (y === 14) c = 0xe08a2a; // the orange pinstripe
  if (y >= 28) c = 0xeee4cc;
  c = shade(c, 0.94 + hash(x >> 1, y >> 1, z >> 1, 5) * 0.08);
  if (y < 7) c = shade(c, 0.75);
  // door seams
  const side = Math.abs(x) >= THW - 0.5;
  if (side && (z === 13 || z === 0 || z === -19) && y >= 6 && y <= 27) c = 0x3a3a34;
  return c;
}
function buildTaxiBody() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.shape(-THW, 4, TZR, THW, 30, TZF, (x, y, z) => onTaxi(x, y, z) && !isRearDoor(x, y, z), (x, y, z) => (taxiWindow(x, y, z) ? glass(0x3a4652) : gloss(taxiPaint(x, y, z))));
  v.box(-THW + 1, 5, TZR + 1, THW - 1, 5, TZF - 1, 0x3a3a38);
  // bumpers, grille, lamps, plates
  v.box(-THW, 5, TZF + 1, THW, 8, TZF + 2, metal(0xb8bcc2));
  v.box(-THW, 5, TZR - 2, THW, 8, TZR - 1, metal(0xb8bcc2));
  for (let y = 10; y <= 13; y++) for (let x = -8; x <= 8; x++) v.set(x, y, TZF, metal(y % 2 ? 0x8a8e92 : 0x5a5e62));
  for (const s of [-1, 1]) { v.box(s * 10, 9, TZF, s * 15, 13, TZF, gloss(0xf4f0e0)); v.box(s * 13, 9, TZR, s * 16, 14, TZR, gloss(0xc81e1e)); }
  v.box(-4, 9, TZF + 2, 4, 11, TZF + 2, gloss(0xf2f2ea));
  v.box(-4, 9, TZR - 2, 4, 11, TZR - 2, gloss(0xf2f2ea));
  // fender mirrors on stalks, out on the front wings (the Japanese taxi look)
  for (const s of [-1, 1]) { v.box(s * 14, 17, 34, s * 14, 18, 34, 0x1e1e1e); v.box(s * 13, 19, 33, s * 15, 20, 35, 0x1e1e1e); }
  // the roof lamp (andon): a glowing box with a dark band and the company's red dot
  v.box(-6, 30, -5, 6, 32, 3, glow(0xf6d860));
  v.box(-7, 30, -6, 7, 30, 4, 0x2a2a2a);
  v.box(-6, 33, -4, 6, 33, 2, 0x2a2a2a);
  for (const z of [-6, 4]) { v.box(-4, 31, z, 4, 31, z, 0x2a3a2a); v.set(0, 31, z, glow(0xd8282a)); }
  // the red VACANT plate behind the windscreen, a dash, two seats, a lace seat cover
  v.box(4, 17, 19, 10, 19, 19, glow(0xd8282a));
  v.box(-15, 14, 14, 15, 16, 20, 0x2a2a2c);
  for (const z0 of [0, -16]) for (const [x0, x1] of [[-15, -2], [2, 15]]) { v.box(x0, 8, z0, x1, 10, z0 + 10, 0x6a3a3a); v.box(x0, 11, z0, x1, 22, z0 + 1, 0x6a3a3a); v.box(x0 + 2, 20, z0 + 2, x1 - 2, 22, z0 + 2, 0xf4f0e6); }
  // the company's mark on the front doors: a yellow diamond with a green heart
  for (const s of [-1, 1]) for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) {
    const a = Math.abs(dy) + Math.abs(dz);
    if (a <= 3) v.set(s * (THW + 1), 11 + dy, 7 + dz, a <= 1 ? 0x2a6a46 : 0xf2d23a);
  }
  return v;
}
function buildTaxiDoor() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.shape(THW - 1, REAR_DOOR.y0, REAR_DOOR.z0, THW, REAR_DOOR.y1, REAR_DOOR.z1, (x, y, z) => onTaxi(x, y, z) && isRearDoor(x, y, z), (x, y, z) => (taxiWindow(x, y, z) ? glass(0x3a4652) : gloss(taxiPaint(x, y, z))));
  v.box(THW - 2, 8, REAR_DOOR.z0 + 1, THW - 2, 16, REAR_DOOR.z1 - 1, 0x5a4a44);
  v.pivot = { x: THW, y: 0, z: REAR_DOOR.z1 + 1 };
  return v;
}
function buildTaxiWheel() {
  const v = new VoxelModel();
  v.jitter = 0.03;
  v.cylinder(0, 0, 0, TWR, 4, (x, y, z) => (y * y + z * z > 12 ? 0x1e1e1e : metal(0xc8ccd2)), 'x');
  return v;
}

export class Taxi {
  constructor(game) {
    this.game = game;
    const mats = voxelMaterials('normal');
    if (!geoCache.taxi) {
      geoCache.taxi = meshVoxels(buildTaxiBody(), { voxelSize: TVS, origin: 'none' });
      geoCache.taxiDoor = meshVoxels(buildTaxiDoor(), { voxelSize: TVS });
      geoCache.taxiWheel = meshVoxels(buildTaxiWheel(), { voxelSize: TVS, origin: 'center' });
    }
    const root = this.root = new THREE.Group();
    root.name = 'taxi';
    this.body = new THREE.Group();
    root.add(this.body);
    const b = new THREE.Mesh(geoCache.taxi, mats);
    b.castShadow = b.receiveShadow = true;
    this.body.add(b);
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(THW * TVS, 0, (REAR_DOOR.z1 + 1) * TVS);
    const d = new THREE.Mesh(geoCache.taxiDoor, mats);
    d.castShadow = true;
    this.doorPivot.add(d);
    this.body.add(this.doorPivot);
    this.wheels = [];
    for (const [x, z] of [[-14.5, TWZ], [14.5, TWZ], [-14.5, -TWZ], [14.5, -TWZ]]) {
      const w = new THREE.Mesh(geoCache.taxiWheel, mats);
      w.position.set(x * TVS + TVS * 0.5, TWR * TVS + TVS * 0.5, (z + 0.5) * TVS);
      w.castShadow = true;
      root.add(w);
      this.wheels.push(w);
    }
    const lamp = (col) => new THREE.MeshBasicMaterial({ color: col });
    this.heads = []; this.brakes = [];
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(5 * TVS, 3 * TVS, 0.02), lamp(0xfff2c8));
      h.position.set(s * 12.5 * TVS + TVS * 0.5, 11.5 * TVS, (TZF + 1) * TVS);
      this.body.add(h); this.heads.push(h);
      const r = new THREE.Mesh(new THREE.BoxGeometry(3 * TVS, 5 * TVS, 0.02), lamp(0xff3020));
      r.position.set(s * 14.5 * TVS + TVS * 0.5, 12 * TVS, TZR * TVS - 0.02);
      this.body.add(r); this.brakes.push(r);
    }
    this.setLights(true); this.setBrake(false);
    this.dist = 0;
    this.door = 0;
  }
  setPose(x, z, heading) { this.root.position.set(x, 0, z); this.root.rotation.y = heading; this.root.updateMatrixWorld(true); }
  roll(d) { this.dist += d; for (const w of this.wheels) w.rotation.x = this.dist / (TWR * TVS); }
  setDoor(k) { this.door = k; this.doorPivot.rotation.y = k * 1.05; }
  setLights(on) { for (const h of this.heads) h.visible = on; }
  setBrake(on) { for (const b of this.brakes) b.visible = on; }
  local(x, y, z, out = new THREE.Vector3()) { return this.root.localToWorld(out.set(x, y, z)); }
  /** Where a passenger stands to get in at the rear left door, and the seat behind it (world). */
  doorSpot(out = new THREE.Vector3()) { return this.local(THW * TVS + 0.6, 0, -10 * TVS, out); }
  seat(out = new THREE.Vector3()) { return this.local(8 * TVS, 0, -9 * TVS, out); }
  dispose() { this.root.removeFromParent(); }
}
