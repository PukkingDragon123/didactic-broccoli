// Little voxel things people carry on the lane (src/npc/street.js): a can from the vending machine (in the colours of a
// real drink from src/needs/foods.js), a cigarette (with pixel smoke puffs, src/gfx/effects.js), a granny's shopping
// cart that trails behind her, a plastic shop bag, a watering can, and a street dog on a lead (voxel, a small rig:
// walk cycle, sniffing, tail wag). Everything is built once per kind and shared (geometry + the voxel material set).
//   holdIn(h, mesh, side, at)   attach to a hand bone        free(mesh)   detach
//   canMesh(drinkId)  cigMesh()  bagMesh()  wateringCan()  new Cart()  new StreetDog(game, kind)  new Lead(game)
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { FOODS } from '../needs/foods.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);
const cache = new Map();
const once = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
const vox = (vs, build, pivot = null, origin) => { const v = new VoxelModel(); v.jitter = 0.02; build(v); if (pivot) v.pivot = pivot; return meshVoxels(v, { voxelSize: vs, origin }); };
const mesh = (geo, cast = true) => { const m = new THREE.Mesh(geo, voxelMaterials('normal')); m.castShadow = cast; return m; };

/** Attach a mesh to a hand (side 'R' | 'L'), offset in the hand's frame (metres for a 1.72 m adult). */
export function holdIn(h, m, side = 'R', at = [0, -0.07, 0.02]) {
  const k = h.P.H / 1.72;
  m.position.set(at[0] * k * (side === 'L' ? -1 : 1), at[1] * k, at[2] * k);
  h.b['hand' + side].add(m);
  return m;
}
export function free(m) { m?.removeFromParent(); }

// ------------------------------------------------------------------ a drink can (or a PET bottle)
const DRINKS = Object.keys(FOODS).filter((k) => FOODS[k]?.art && ['can', 'mini', 'pet'].includes(FOODS[k].art.shape));
export function pickDrink(hot = false) {
  const L = DRINKS.filter((k) => !!FOODS[k].hot === hot && !FOODS[k].drunk);
  const A = L.length ? L : DRINKS;
  return A[Math.floor(Math.random() * A.length)] || null;
}
export function canMesh(id) {
  const art = FOODS[id]?.art || { shape: 'can', body: 0xc83030, band: 0xf2f2f2, band2: 0x2a2a2a };
  const geo = once('can:' + id, () => vox(0.009, (v) => {
    const pet = art.shape === 'pet', H = pet ? 20 : art.shape === 'mini' ? 10 : 13, R = pet ? 2.6 : 3.1;
    v.shape(-4, 0, -4, 4, H, 4, (x, y, z) => x * x + z * z <= R * R + 0.5, (x, y, z) => {
      if (y === H || y === 0) return pet ? 0xd8e8e8 : 0xb8bcc0;
      const u = y / H;
      if (u > 0.36 && u < 0.6) return art.band;
      if (art.band2 && u > 0.6 && u < 0.7) return art.band2;
      return art.body;
    });
    if (pet) v.box(-1, H + 1, -1, 1, H + 2, 1, art.band2 || 0xf2f2f2);
    else v.box(-1, H + 1, -1, 1, H + 1, 1, 0x9a9ea2);
  }, { x: 0, y: 6, z: 0 }));
  return mesh(geo, false);
}

// ------------------------------------------------------------------ a cigarette (white with a filter and an ember)
export function cigMesh() {
  const geo = once('cig', () => vox(0.005, (v) => {
    v.box(0, 0, 0, 0, 0, 3, 0xd8a050); // filter
    v.box(0, 0, 4, 0, 0, 12, 0xf2f0ea);
    v.set(0, 0, 13, 0xd84a20); // ember
  }, { x: 0, y: 0, z: 2 }));
  return mesh(geo, false);
}

// ------------------------------------------------------------------ a plastic shop bag (Mikawa-ya)
export function bagMesh() {
  const geo = once('bag', () => vox(0.02, (v) => {
    v.shape(-4, 0, -2, 4, 9, 2, (x, y, z) => Math.abs(x) <= 4 - (y < 2 ? 1 : 0) && Math.abs(z) <= 2 - (y < 1 ? 1 : 0), (x, y) => (y === 5 && Math.abs(x) < 3 ? 0xd84a3a : 0xeeece6));
    for (const s of [-1, 1]) v.box(s * 2, 10, 0, s * 2, 13, 0, 0xe8e6e0);
    v.box(-2, 13, 0, 2, 13, 0, 0xe8e6e0);
  }, { x: 0, y: 13, z: 0 }));
  return mesh(geo);
}

// ------------------------------------------------------------------ a little watering can
export function wateringCan() {
  const geo = once('jouro', () => vox(0.015, (v) => {
    v.shape(-5, 0, -4, 5, 9, 4, (x, y, z) => x * x + z * z <= 17, (x, y) => (y > 7 ? 0x3a8a5a : 0x4aa06a));
    for (let i = 0; i < 9; i++) v.box(0, 3 + i, 4 + i, 0, 3 + i, 5 + i, 0x3a8a5a); // spout
    v.box(-1, 11, -4, 1, 12, 4, 0x2a6a44); // handle
    v.box(-1, 9, -4, 1, 11, -4, 0x2a6a44);
  }, { x: 0, y: 12, z: 0 }));
  return mesh(geo);
}

// ------------------------------------------------------------------ the granny cart (ショッピングカート): pulled behind
export class Cart {
  constructor(scene) {
    const geo = once('cart', () => vox(0.02, (v) => {
      // wheels at the bottom (axle on x), the frame up the back, a tartan bag
      for (const s of [-1, 1]) v.shape(s * 7, -4, -4, s * 6, 4, 4, (x, y, z) => y * y + z * z <= 16, (x, y, z) => (y * y + z * z > 7 ? 0x222224 : 0xa8aeb4));
      v.box(-6, 0, 0, 6, 0, 0, 0x8a8e92); // axle
      for (const s of [-1, 1]) v.box(s * 5, 0, -3, s * 5, 44, -3, 0xb8bcc0);
      v.box(-5, 44, -3, 5, 45, -3, 0x2a2a2c); // handle grip
      const tart = (x, y, z) => { const a = (x + 40) % 6 < 2, b = (y + 40) % 6 < 2; return a && b ? 0x1e2a4a : a || b ? 0x3a5a8a : ((x + y) & 1 ? 0x7a2a3a : 0x8a3442); };
      v.box(-5, 4, -2, 5, 34, 4, tart);
      v.box(-5, 35, -2, 5, 35, 4, 0x1e2a4a); // the drawstring top
    }, { x: 0, y: 0, z: 0 }));
    this.root = new THREE.Group();
    this.root.add(mesh(geo));
    this.root.rotation.order = 'YXZ';
    scene.add(this.root);
    this.init = false;
    this.wheelR = 4 * 0.02;
    this.len = 0.82;
  }
  /** Trail behind the hand that pulls it (world point). */
  update(hand) {
    const r = this.root.position;
    if (!this.init) { this.init = true; r.set(hand.x, this.wheelR, hand.z - 0.5); }
    const dx = hand.x - r.x, dz = hand.z - r.z, dh = Math.hypot(dx, dz);
    const dy = Math.max(0.1, hand.y - this.wheelR);
    const flat = Math.sqrt(Math.max(0.01, this.len * this.len - dy * dy));
    if (dh > flat) { r.x = hand.x - dx / dh * flat; r.z = hand.z - dz / dh * flat; }
    else if (dh < flat * 0.6 && dh > 1e-3) { r.x = hand.x - dx / dh * flat * 0.6; r.z = hand.z - dz / dh * flat * 0.6; }
    r.y = this.wheelR;
    const d2 = Math.hypot(hand.x - r.x, hand.z - r.z);
    this.root.rotation.y = Math.atan2(hand.x - r.x, hand.z - r.z);
    this.root.rotation.x = Math.atan2(d2, dy);
  }
  dispose() { this.root.removeFromParent(); }
}

// ------------------------------------------------------------------ a street dog: the animal kit's (src/animals/dog.js), same API
// (pos, heading, speed, pose, wag, vel, collar(), nose(), bark(), update(dt), dispose()): a white Kishu, a sesame shiba, a
// brown mutt with folded ears, each one skinned mesh on a rigged skeleton with its legs on IK.
export { StreetDog, DOG_KINDS } from '../animals/dog.js';

// ------------------------------------------------------------------ a lead: a sagging line of blocks (hand -> collar)
const NSEG = 8;
export class Lead {
  constructor(scene, color = 0xc83a2a) {
    this.mesh = new THREE.InstancedMesh(once('leadGeo', () => new THREE.BoxGeometry(0.012, 0.012, 1)), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }), NSEG);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  update(a, b, slack = 0.25) {
    const d = Math.hypot(b.x - a.x, b.z - a.z, b.y - a.y), sag = Math.max(0, slack * (1 - Math.min(1, d / 1.9)));
    let px = a.x, py = a.y, pz = a.z;
    for (let i = 1; i <= NSEG; i++) {
      const t = i / NSEG;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag;
      _v2.set(x - px, y - py, z - pz);
      const len = _v2.length() || 1e-4;
      _q.setFromUnitVectors(_z, _v2.multiplyScalar(1 / len));
      _m.compose(_v.set((x + px) / 2, (y + py) / 2, (z + pz) / 2), _q, _s.set(1, 1, len));
      this.mesh.setMatrixAt(i - 1, _m);
      px = x; py = y; pz = z;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() { this.mesh.removeFromParent(); this.mesh.material.dispose(); }
}
