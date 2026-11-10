// Little things people carry on the lane (src/npc/street.js): a drink from the vending machine (the modelled can or
// bottle of src/products), a cigarette (with pixel smoke puffs, src/gfx/effects.js), a granny's shopping cart that
// trails behind her, a plastic shop bag, a watering can (modelled in src/props/things/street.js), and a street dog on
// a lead (still voxel: a small rig: walk cycle, sniffing, tail wag; the dog belongs to the animal kit). Everything is built once per kind and shared (geometry + the voxel material set).
//   holdIn(h, mesh, side, at)   attach to a hand bone        free(mesh)   detach
//   canMesh(drinkId)  cigMesh()  bagMesh()  wateringCan()  new Cart()  new StreetDog(game, kind)  new Lead(game)
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { FOODS } from '../needs/foods.js';
import { audio } from '../core/audio.js';
import { drinkGeometry, drinksSheet, isDrink } from '../products/containers.js';
import { cigGeometry, bagGeometry, jouroGeometry, cartGeometry } from '../props/things/street.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);
const cache = new Map();
const once = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
const vox = (vs, build, pivot = null, origin) => { const v = new VoxelModel(); v.jitter = 0.02; build(v); if (pivot) v.pivot = pivot; return meshVoxels(v, { voxelSize: vs, origin }); };
const mesh = (geo, cast = true) => { const m = new THREE.Mesh(geo, geo.userData.page ? geo.userData.page.mats() : voxelMaterials('normal')); m.castShadow = cast; return m; };

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
  // the drink itself (src/products: the modelled can / PET bottle with its full label), its origin at the old grip
  const geo = once('can:' + id, () => { const g = drinkGeometry(isDrink(id) ? id : null).clone(); g.translate(0, -0.054, 0); return g; });
  const m = new THREE.Mesh(geo, drinksSheet().material());
  m.castShadow = false;
  return m;
}

// ------------------------------------------------------------------ a cigarette, a plastic shop bag (Mikawa-ya), a little watering can
export function cigMesh() { return mesh(cigGeometry(), false); }
export function bagMesh() { return mesh(bagGeometry()); }
export function wateringCan() { return mesh(jouroGeometry()); }

// ------------------------------------------------------------------ the granny cart (ショッピングカート): pulled behind
export class Cart {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.add(mesh(cartGeometry()));
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

// ------------------------------------------------------------------ a street dog (voxel, its own rig)
const DOGS = {
  shiro: { fur: 0xf2ece0, furD: 0xd8d0c0, cream: 0xfffaf0, nose: 0x2a2020, collar: 0x2f8a4a, ear: 0xf0c0b0 }, // a white Kishu
  goma: { fur: 0x8a6a4a, furD: 0x3a2e26, cream: 0xf2e2c8, nose: 0x1a1414, collar: 0xd8a020, ear: 0xd09080 }, // a sesame shiba
  chibi: { fur: 0xb07a4a, furD: 0x8a5a36, cream: 0xf0dcc0, nose: 0x1a1414, collar: 0x3a6ad8, ear: 0xd09a80, small: true }, // a brown mutt
};
export const DOG_KINDS = Object.keys(DOGS);
const DVS = 0.016;
function dogGeo(kind) {
  return once('dog:' + kind, () => {
    const P = DOGS[kind];
    const hsh = (x, y, z) => ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 7;
    const fur = (x, y, z) => (hsh(x, y, z) === 0 ? P.furD : (kind === 'goma' && y > 22 && hsh(x, y, z) < 3 ? P.furD : P.fur));
    const mk = (b) => vox(DVS, b, { x: 0, y: 0, z: 0 });
    return {
      body: mk((v) => {
        v.shape(-6, 13, -13, 6, 25, 13, (x, y, z) => ((x / 6.4) ** 2 + ((y - 19) / 6.2) ** 2 <= 1 + (Math.abs(z) > 10 ? -0.25 : 0)), (x, y, z) => (y < 16 || (z > 8 && y < 21 && Math.abs(x) < 4) ? P.cream : fur(x, y, z)));
        v.shape(-4, 19, 9, 4, 28, 15, (x, y, z) => (x / 4.5) ** 2 + ((y - 23.5) / 5) ** 2 <= 1, (x, y, z) => (z > 12 && y < 24 ? P.cream : fur(x, y, z)));
        v.torus(0, 24, 12, 4, 0.8, P.collar, 'y');
      }),
      head: mk((v) => {
        v.shape(-5, -2, -3, 5, 8, 6, (x, y, z) => (x / 5.4) ** 2 + ((y - 3) / 5.4) ** 2 + ((z - 1.5) / 5.6) ** 2 <= 1, (x, y, z) => (y < 2 && z > 1 ? P.cream : fur(x, y, z)));
        v.box(-2, -1, 5, 2, 2, 9, (x, y, z) => (y > 1 && z < 7 ? P.fur : P.cream));
        v.box(-1, 1, 9, 1, 2, 10, P.nose);
        for (const s of [-1, 1]) {
          v.set(s * 3, 4, 5, 0x1a1414); v.set(s * 3, 5, 5, 0x1a1414);
          for (let i = 0; i < 4; i++) v.box(s * (2 + (i >> 1)), 7 + i, 0, s * (5 - (i >> 1)), 7 + i, 1, i > 1 ? P.furD : P.fur);
          v.set(s * 4, 8, 1, P.ear);
        }
      }),
      tail: mk((v) => { v.torus(0, 4, 0, 3, 1.4, (x, y) => (y < 3 ? P.cream : P.fur), 'z'); v.box(-1, 0, -1, 1, 2, 1, P.fur); }),
      leg: mk((v) => { v.box(-1, -12, -1, 1, 0, 1, (x, y, z) => (y < -9 ? P.cream : fur(x, y, z))); v.box(-1, -13, -1, 1, -13, 2, P.cream); }),
    };
  });
}
export class StreetDog {
  constructor(game, kind = 'shiro') {
    this.game = game;
    const G = dogGeo(kind);
    this.root = new THREE.Group();
    const sc = DOGS[kind].small ? 0.85 : 1;
    this.root.scale.setScalar(sc);
    this.hips = new THREE.Group(); this.root.add(this.hips);
    this.hips.add(mesh(G.body));
    this.headP = new THREE.Group(); this.headP.position.set(0, 25 * DVS, 13 * DVS); this.hips.add(this.headP); this.headP.add(mesh(G.head));
    this.tailP = new THREE.Group(); this.tailP.position.set(0, 23 * DVS, -12 * DVS); this.tailP.rotation.x = -0.35; this.hips.add(this.tailP); this.tailP.add(mesh(G.tail));
    this.legs = [];
    for (const [x, z, hind] of [[-3, 8, 0], [3, 8, 0], [-3, -8, 1], [3, -8, 1]]) {
      const p = new THREE.Group(); p.position.set(x * DVS, 14 * DVS, z * DVS); p.add(mesh(G.leg)); this.hips.add(p); this.legs.push({ p, hind });
    }
    this.pos = this.root.position;
    this.heading = 0; this.phase = 0; this.speed = 0; this.pose = 'stand'; this.wag = 0.5; this.t = Math.random() * 9; this.barkT = 0;
    this.vel = { x: 0, z: 0 };
    game.scene.add(this.root);
  }
  collar(out = new THREE.Vector3()) { return this.headP.localToWorld(out.set(0, -1.5 * DVS, -1.5 * DVS)); }
  nose(out = new THREE.Vector3()) { return this.headP.localToWorld(out.set(0, 2 * DVS, 10 * DVS)); }
  bark() {
    this.barkT = 0.35;
    try { audio.play('bark', { pos: this.nose(_v), vol: 0.7, pitch: 1.15 }); } catch { /* */ }
  }
  update(dt) {
    this.t += dt;
    const sp = this.speed, k = Math.min(1, sp / 1.4);
    this.phase += dt * (2 + sp * 8);
    this.root.rotation.y += Math.atan2(Math.sin(this.heading - this.root.rotation.y), Math.cos(this.heading - this.root.rotation.y)) * Math.min(1, dt * 8);
    const pose = this.pose;
    for (const [i, L] of this.legs.entries()) {
      const off = i === 0 || i === 3 ? 0 : Math.PI;
      let a = Math.sin(this.phase + off) * 0.6 * k;
      if (pose === 'sit' && L.hind) a = -1.25;
      if (pose === 'sit' && !L.hind) a = 0.15;
      L.p.rotation.x += (a - L.p.rotation.x) * Math.min(1, dt * 14);
    }
    const sit = pose === 'sit' ? 1 : 0;
    this.hips.rotation.x += (-sit * 0.38 - this.hips.rotation.x) * Math.min(1, dt * 8);
    this.hips.position.y = -sit * 0.05 + Math.abs(Math.sin(this.phase)) * 0.012 * k;
    this.barkT = Math.max(0, this.barkT - dt);
    const hx = pose === 'sniff' ? 0.8 + Math.sin(this.t * 9) * 0.06 : this.barkT > 0 ? -0.35 : sp > 0.2 ? 0.06 : Math.sin(this.t * 0.7) * 0.1;
    const hy = pose === 'sniff' ? Math.sin(this.t * 1.7) * 0.35 : sp > 0.2 ? 0 : Math.sin(this.t * 0.45) * 0.5;
    this.headP.rotation.x += (hx - this.headP.rotation.x) * Math.min(1, dt * 10);
    this.headP.rotation.y += (hy - this.headP.rotation.y) * Math.min(1, dt * 4);
    this.tailP.rotation.z = Math.sin(this.t * (8 + this.wag * 10)) * 0.35 * this.wag;
  }
  dispose() { this.root.removeFromParent(); }
}

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
