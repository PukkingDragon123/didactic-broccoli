// A jointed voxel cat: body, head, four legs and a 7-segment tail, posed and animated in code.
// Poses: walk, sit, groom, sleep (loaf), held. The calico coat, eyes and eyelids are voxel-painted.
import * as THREE from 'three';
import { VoxelModel, gloss } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';

const VS = 0.0085;
const WHITE = 0xf6f2ea, ORANGE = 0xe08a3a, ORANGE_D = 0xb8662a, BLACK = 0x2c2622, PINK = 0xf2a0a8, INK = 0x1a1412;

const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const n3 = (x, y, z) => (Math.sin(x * 0.31 + z * 0.17) + Math.sin(y * 0.27 - x * 0.13) + Math.sin(z * 0.23 + y * 0.11)) / 3;

/** Calico coat: white belly/legs, big orange and black patches with a little fur jitter. */
function coat(x, y, z, belly = -99) {
  if (y < belly) return WHITE;
  const k = n3(x, y, z) + (hash(x, y, z) - 0.5) * 0.12;
  if (k > 0.33) return hash(x, y, z) < 0.15 ? ORANGE_D : ORANGE;
  if (k < -0.38) return BLACK;
  return WHITE;
}

function mesh(build, origin = 'none') {
  const v = new VoxelModel();
  v.jitter = 0.03;
  build(v);
  const m = new THREE.Mesh(meshVoxels(v, { voxelSize: VS, origin }), voxelMaterials('normal'));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

const geoCache = {};
function parts() {
  if (geoCache.body) return geoCache;
  // body: origin at the body centre; +z is the front
  geoCache.body = mesh((v) => {
    v.shape(-7, -6, -15, 7, 6, 15, (x, y, z) => (x * x) / 42 + (y * y) / 36 + (z * z) / 230 <= 1, (x, y, z) => coat(x + 3, y, z, -3));
    v.shape(-6, -5, 11, 6, 6, 17, (x, y, z) => (x * x) / 30 + ((y - 1) * (y - 1)) / 28 + ((z - 13) * (z - 13)) / 18 <= 1, (x, y, z) => coat(x + 3, y, z, -2)); // chest
  });
  // head: origin at the neck joint
  geoCache.head = mesh((v) => {
    v.shape(-8, -1, -6, 8, 13, 8, (x, y, z) => (x * x) / 60 + ((y - 6) * (y - 6)) / 42 + ((z - 1) * (z - 1)) / 44 <= 1, (x, y, z) => (y < 4 && z > 2 ? WHITE : coat(x, y + 40, z)));
    // muzzle + chin
    v.shape(-4, 1, 5, 4, 6, 9, (x, y, z) => (x * x) / 14 + ((y - 3.5) * (y - 3.5)) / 7 + ((z - 6) * (z - 6)) / 8 <= 1, WHITE);
    // ears (triangular, pink inside)
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      const w = 3 - Math.floor(i / 2);
      for (let dx = -w; dx <= w; dx++) for (let dz = -1; dz <= 1; dz++) v.set(s * 5 + dx + s * Math.floor(i / 3), 11 + i, dz, dz === 1 && Math.abs(dx) < w && i < 4 ? PINK : (s < 0 ? ORANGE : BLACK));
    }
    // face: big eyes with highlights, pink nose, mouth, whiskers
    for (const s of [-1, 1]) {
      const ex = s * 3;
      for (let dy = 0; dy < 3; dy++) for (let dx = -1; dx <= 0; dx++) v.set(ex + dx + (s > 0 ? 1 : 0), 6 + dy, 8, dy === 2 ? INK : 0x5ab84a);
      v.set(ex + (s > 0 ? 1 : 0), 6, 8, INK); v.set(ex - 1 + (s > 0 ? 1 : 0), 6, 8, INK);
      v.set(ex + (s > 0 ? 0 : -1), 8, 8, 0xffffff);
      for (let k = 0; k < 4; k++) v.set(s * (5 + k), 3 + (k % 2), 7 - Math.floor(k / 2), 0xd8d4cc);
    }
    v.set(0, 5, 10, PINK); v.set(-1, 5, 9, PINK); v.set(1, 5, 9, PINK);
    v.set(0, 4, 10, INK); v.set(-1, 3, 10, INK); v.set(1, 3, 10, INK);
  });
  geoCache.lids = mesh((v) => { for (const s of [-1, 1]) for (let dx = -1; dx <= 0; dx++) for (let dy = 0; dy < 3; dy++) v.set(s * 3 + dx + (s > 0 ? 1 : 0), 6 + dy, 9, dy === 0 ? INK : (s < 0 ? ORANGE : WHITE)); });
  // legs: origin at the hip/shoulder joint, hanging down
  const leg = (front, side) => mesh((v) => {
    v.shape(-2, -8, -2, 2, 0, 2, (x, y, z) => x * x + z * z <= 5, (x, y, z) => (y < -5 ? WHITE : coat(x + side * 9, y + (front ? 20 : -20), z, -99)));
    v.shape(-2, -9, -2, 2, -7, 3, (x, y, z) => x * x + (z - 0.5) * (z - 0.5) <= 6, WHITE); // paw
    v.set(0, -9, 3, PINK);
  });
  geoCache.legFL = leg(true, -1); geoCache.legFR = leg(true, 1); geoCache.legBL = leg(false, -1); geoCache.legBR = leg(false, 1);
  // tail segments: origin at the segment's base, extending -z
  geoCache.tail = [];
  for (let i = 0; i < 7; i++) geoCache.tail.push(mesh((v) => {
    const r = 2.4 - i * 0.18;
    v.shape(-3, -3, -5, 3, 3, 0, (x, y, z) => x * x + y * y <= r * r + 0.5, () => (i === 6 ? BLACK : i % 2 ? ORANGE : ORANGE_D));
  }));
  return geoCache;
}

export class CatRig {
  constructor() {
    const P = parts();
    this.root = new THREE.Group();
    this.hip = new THREE.Group(); // overall body pivot (height & pitch)
    this.root.add(this.hip);
    const c = (m) => m.clone();
    this.body = c(P.body); this.hip.add(this.body);
    this.neck = new THREE.Group(); this.neck.position.set(0, 4 * VS, 15 * VS); this.hip.add(this.neck);
    this.head = new THREE.Group(); this.neck.add(this.head);
    this.head.add(c(P.head));
    this.lids = c(P.lids); this.lids.visible = false; this.head.add(this.lids);
    this.legs = {};
    for (const [k, x, z] of [['FL', -4, 10], ['FR', 4, 10], ['BL', -4, -10], ['BR', 4, -10]]) {
      const g = new THREE.Group(); g.position.set(x * VS, -2 * VS, z * VS); g.add(c(P['leg' + k])); this.hip.add(g); this.legs[k] = g;
    }
    this.tail = [];
    let parent = new THREE.Group(); parent.position.set(0, 2 * VS, -14 * VS); this.hip.add(parent);
    for (let i = 0; i < 7; i++) {
      const seg = new THREE.Group();
      if (i > 0) seg.position.z = -4.6 * VS;
      seg.add(c(P.tail[i]));
      parent.add(seg);
      this.tail.push(seg);
      parent = seg;
    }
    this.pose = 'walk';
    this.blend = { walk: 1, sit: 0, sleep: 0, groom: 0, held: 0, drink: 0 };
    this.t = Math.random() * 10;
    this.walkT = 0;
    this.speed = 0;
    this.blinkT = 2;
    this.lookYaw = 0;
  }

  setPose(p) { this.pose = p; }

  update(dt, speed = 0) {
    this.t += dt;
    for (const k of Object.keys(this.blend)) this.blend[k] += ((k === this.pose ? 1 : 0) - this.blend[k]) * Math.min(1, dt * 5);
    const B = this.blend;
    this.walkT += dt * speed * 22;
    const sw = Math.sin(this.walkT), moving = Math.min(1, speed * 3);
    const legH = 10 * VS;
    // hip height & pitch
    const y = legH * (B.walk + B.groom * 0.95 + B.drink * 0.86) + legH * 0.55 * B.sit + 6 * VS * B.sleep + 0.02 * B.held + Math.abs(Math.cos(this.walkT)) * 0.006 * moving * B.walk;
    this.hip.position.set(0, y, -6 * VS * B.sit);
    this.hip.rotation.x = -0.75 * B.sit - 1.35 * B.held + 0.16 * B.drink;
    this.hip.position.y += 0.12 * B.held;
    // legs
    const L = this.legs;
    L.FL.rotation.x = sw * 0.6 * moving * B.walk + 0.75 * B.sit - 1.5 * B.sleep + 0.2 * B.held - 0.25 * B.drink;
    L.FR.rotation.x = -sw * 0.6 * moving * B.walk + 0.75 * B.sit - 1.5 * B.sleep + 0.2 * B.held + Math.max(0, Math.sin(this.t * 6)) * -1.4 * B.groom - 0.25 * B.drink;
    L.BL.rotation.x = -sw * 0.6 * moving * B.walk - 0.9 * B.sit + 1.5 * B.sleep + 0.4 * B.held;
    L.BR.rotation.x = sw * 0.6 * moving * B.walk - 0.9 * B.sit + 1.5 * B.sleep + 0.4 * B.held;
    for (const k of ['FL', 'FR', 'BL', 'BR']) L[k].scale.y = 1 - 0.35 * B.sleep;
    // head: looks around, bobs while walking, ducks to groom, rests when sleeping
    const look = Math.sin(this.t * 0.4) * 0.5 * (B.sit + B.walk * (1 - moving)) + this.lookYaw;
    this.head.rotation.set(0.75 * B.sit + 0.6 * B.held + Math.sin(this.walkT * 2) * 0.05 * moving + (0.5 + Math.sin(this.t * 6) * 0.15) * B.groom + 0.25 * B.sleep + (0.95 + Math.sin(this.t * 11) * 0.06) * B.drink, look * (1 - B.sleep - B.drink), -0.25 * B.groom);
    this.neck.position.y = (4 - 3 * B.sleep) * VS;
    // tail: up and curling while walking, curled around when sitting/sleeping, swishing when held
    this.tail.forEach((s, i) => {
      const k = i / 6;
      const swish = Math.sin(this.t * (B.held ? 5 : 2) - i * 0.6) * (0.08 + 0.25 * B.held + 0.1 * B.sit);
      // +x lifts the tail (segments extend toward -z)
      s.rotation.x = (i === 0 ? 1.15 : 0.1 + k * 0.18) * B.walk + (i === 0 ? -0.55 : -0.04) * B.sit + (i === 0 ? -0.35 : -0.02) * B.sleep + (i === 0 ? -0.9 : 0.05) * B.held + (i === 0 ? 0.6 : 0.05) * B.groom;
      s.rotation.y = swish + (0.35 * B.sit + 0.45 * B.sleep) * (i > 0 ? 1 : 0.3);
    });
    // blinking; eyes closed when asleep
    this.blinkT -= dt;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4;
    this.lids.visible = B.sleep > 0.5 || this.blinkT < 0.12;
  }
}
