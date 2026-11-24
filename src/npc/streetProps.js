// Little things people carry on the lane (src/npc/street.js): a can from the vending machine (the drink's own can or
// bottle in its pixel wrap, src/drinks/drinks.js), a cigarette (with pixel smoke puffs, src/gfx/effects.js), a granny's shopping
// cart that trails behind her, a plastic shop bag, a watering can, and a street dog on a lead (the animal kit's rigged
// dog). The props are lowpix world models (our own cigarette and cart, art/lowpix/world/made/r4_props.py; the imported
// bag and can), loaded lazily and shared.
//   holdIn(h, mesh, side, at)   attach to a hand bone        free(mesh)   detach
//   canMesh(drinkId)  cigMesh()  bagMesh()  wateringCan()  new Cart()  new StreetDog(game, kind)  new Lead(game)
import * as THREE from 'three';
import { assetSlot } from '../kit/assets.js';
import { lpAsset } from '../kit/lowpixWorld.js';
import { FOODS } from '../needs/foods.js';
import { drinkMesh } from '../drinks/drinks.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);
const cache = new Map();
const once = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
/** A world model (origin at its bottom centre) in a group, offset so the group's origin is the model's grip / pivot. */
const model = (id, at = [0, 0, 0], cast = true) => {
  const g = new THREE.Group(), s = assetSlot(lpAsset(id), { cast });
  s.position.set(...at);
  g.add(s);
  return g;
};

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
  // the same can / bottle as the vending machine's (src/drinks/drinks.js: a lathe in its pixel-art wrap), built once
  // per drink and shared; centred on the hand like the grip expects (the drink's own origin is its base)
  const f = FOODS[id] || { id, art: { shape: 'can', body: 0xc83030 } };
  const src = once('drink:' + id, () => drinkMesh(f));
  const m = new THREE.Mesh(src.geometry, src.material);
  m.position.y = -src.geometry.userData.size.y / 2;
  m.castShadow = false;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

// ------------------------------------------------------------------ a cigarette (cork filter, paper, ash and ember)
// our own model, 8.5 cm along +z with the filter end at -z; the grip is 1 cm up the filter
export function cigMesh() { return model('cig_own', [0, -0.0042, 0.0325], false); }

// ------------------------------------------------------------------ a plastic shop bag, held by its handles
export function bagMesh() { return model('shopbag_own', [0, -0.387, 0]); }

// ------------------------------------------------------------------ a watering can, held by its handle
export function wateringCan() { return model('watering_can', [0, -0.197, 0]); }

// ------------------------------------------------------------------ the granny cart (ショッピングカート): pulled behind
// our own model (r4_props.py 'cart'): two wheels on an axle, a tube frame up to a foam grip, a tartan bag on a foot plate;
// the root's origin is the axle (the model is 0.235 deep with the axle 0.0375 behind its centre, 0.08 above its bottom)
export class Cart {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.add(model('cart_own', [0, -0.08, 0.0375]));
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

// ------------------------------------------------------------------ a lead: a sagging line of nylon webbing (hand -> collar)
const NSEG = 8;
/** Woven nylon webbing: hard-pixel lengthwise weave lines and stitched edges (tinted by the lead's colour). */
const webbing = () => once('webbing', () => {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 4;
  const x = cv.getContext('2d');
  x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, 16, 4);
  x.fillStyle = '#b4b4b4'; x.fillRect(0, 0, 1, 4); x.fillRect(15, 0, 1, 4);
  x.fillStyle = '#cfcfcf'; for (const c of [3, 6, 9, 12]) x.fillRect(c, 0, 1, 4);
  x.fillStyle = '#ffffff'; for (let r = 0; r < 4; r += 2) x.fillRect(1, r, 1, 1), x.fillRect(14, r + 1, 1, 1);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
});
export class Lead {
  constructor(scene, color = 0xc83a2a) {
    this.mesh = new THREE.InstancedMesh(once('leadGeo', () => new THREE.BoxGeometry(0.014, 0.004, 1)), new THREE.MeshStandardMaterial({ color, map: webbing(), roughness: 0.7 }), NSEG);
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
