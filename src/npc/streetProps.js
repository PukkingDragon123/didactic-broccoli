// Little things people carry on the lane (src/npc/street.js): a drink from the vending machine (the modelled can or
// bottle of src/products), a cigarette (with pixel smoke puffs, src/gfx/effects.js), a granny's shopping cart that
// trails behind her, a plastic shop bag, a watering can (modelled in src/props/things/street.js), and a street dog on
// a lead (src/animals/dog.js). Everything is built once per kind and shared (geometry + its atlas materials).
//   holdIn(h, mesh, side, at)   attach to a hand bone        free(mesh)   detach
//   canMesh(drinkId)  cigMesh()  bagMesh()  wateringCan()  new Cart()  new StreetDog(game, kind)  new Lead(game)
import * as THREE from 'three';
import { FOODS } from '../needs/foods.js';
import { drinkGeometry, drinksSheet, isDrink } from '../products/containers.js';
import { cigGeometry, bagGeometry, jouroGeometry, cartGeometry } from '../props/things/street.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);
const cache = new Map();
const once = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
const mesh = (geo, cast = true) => { const m = new THREE.Mesh(geo, geo.userData.page.mats()); m.castShadow = cast; return m; };

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

// ------------------------------------------------------------------ a street dog: the animal kit's (src/animals/dog.js), same API
export { StreetDog, DOG_KINDS } from '../animals/dog.js';

// ------------------------------------------------------------------ a lead: a sagging round cord (hand -> collar)
const NSEG = 14;
export class Lead {
  constructor(scene, color = 0xc83a2a) {
    this.mesh = new THREE.InstancedMesh(once('leadGeo', () => new THREE.CylinderGeometry(0.0055, 0.0055, 1.04, 8, 1, true).rotateX(Math.PI / 2)), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }), NSEG);
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
