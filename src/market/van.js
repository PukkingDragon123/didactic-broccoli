// The FREE CANDY van and Gen-san, the old delivery uncle who drives it. A 1980s one-box kei van (the imported, repainted
// model public/models/lowpix/world_arch/kei_van.glb, its wear painted on by src/world/carModels.js) still in the livery
// of the sweets wholesaler he bought it from (丸福製菓, FREE CANDY sign-painted down both sides: it's a running joke on
// the lane), with their roof sign on a rack and a wooden tray of sweets at the sliding door (the kit modelled in Blender:
// art/blender/vehicles/van_kit.py, public/models/lowpix/world_arch/candy_kit.glb). The driver's door and the rear
// hatch are cut from the van's own mesh and swing on their hinges; the wheels turn; its own engine sound moves with it.
//   buildVan() -> { root, wheels[], door (pivot), hatch (pivot), cargo (Group), length, width, setWheels(dist) }
//   makeDriver() -> Human (cap, moustache, round glasses, Lane Express polo)
//   VanEngine: start(pos), move(pos, speed), stop()
import * as THREE from 'three';
import { Human } from '../people/Human.js';
import { makeSpec } from '../people/presets.js';
import { audio } from '../core/audio.js';
import { carBody } from '../world/carModels.js';
import { loadAsset, assetNow, assetSlot } from '../kit/assets.js';
import { archAsset } from '../kit/lowpixArch.js';
import { lpAsset } from '../kit/lowpixWorld.js';

// the kei van's own frame (metres, facing +z, the kerb side +x): its wheels, the driver's door (right, -x) and its
// front hinge, the top-hinged rear hatch, the load floor
const KV = {
  W: 0.70, ZF: 1.645, ZR: -1.645, WR: 0.26,
  WHEELS: [[0.85, -0.55], [0.85, 0.55], [-0.94, -0.55], [-0.94, 0.55]],
  DOOR: { x0: -0.82, x1: -0.58, z0: 0.38, z1: 1.40, y0: 0.60, y1: 1.68 }, HINGE_Z: 1.38,
  HATCH: { x: 0.57, z1: -1.40, y0: 0.55, y1: 1.80 }, HATCH_TOP: 1.74, HATCH_Z: -1.60, FLOOR: 0.5,
  TRAY: { x0: 0.717, x1: 0.953, y: 0.597, bins: [[-0.428, -0.275], [-0.265, -0.095], [-0.085, 0.068]] },
};
const KIT = archAsset('candy_kit');

/** Load the van, its kit and the sweets ahead of its first visit (idle time), so the first delivery doesn't hitch. */
export function prewarmVan() { return Promise.all([archAsset('kei_van'), KIT, lpAsset('candy_own'), lpAsset('lollipop_m')].map((id) => loadAsset(id).catch(() => null))); }

/** Triangles of a model's meshes sorted out by where their centroids are: test(material, x, y, z) -> part name or null.
 *  The parts share the meshes' vertex buffers (only the index differs). -> { part: [Mesh...] } */
function cutParts(meshes, test) {
  const out = {};
  for (const m of meshes) {
    const g = m.geometry, I = g.index, P = g.attributes.position, name = m.material.name || '';
    if (!I) continue;
    const keep = [], parts = {};
    for (let k = 0; k < I.count; k += 3) {
      const a = I.getX(k), b = I.getX(k + 1), c = I.getX(k + 2);
      const part = test(name, (P.getX(a) + P.getX(b) + P.getX(c)) / 3, (P.getY(a) + P.getY(b) + P.getY(c)) / 3, (P.getZ(a) + P.getZ(b) + P.getZ(c)) / 3);
      (part ? (parts[part] ||= []) : keep).push(a, b, c);
    }
    if (!Object.keys(parts).length) continue;
    const sub = (idx) => {
      const ng = new THREE.BufferGeometry();
      for (const k in g.attributes) ng.setAttribute(k, g.attributes[k]);
      ng.setIndex(idx);
      const box = new THREE.Box3(), v = new THREE.Vector3();
      for (const i of idx) box.expandByPoint(v.fromBufferAttribute(P, i));
      ng.boundingBox = box; ng.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      return ng;
    };
    m.geometry = sub(keep);
    for (const [part, idx] of Object.entries(parts)) {
      const pm = new THREE.Mesh(sub(idx), m.material);
      pm.castShadow = m.castShadow; pm.receiveShadow = m.receiveShadow;
      (out[part] ||= []).push(pm);
    }
  }
  return out;
}

/** The van: root faces +x (its nose); y = 0 is the road. (The model faces +z and is turned.) */
export function buildVan() {
  const root = new THREE.Group();
  root.name = 'freeCandyVan';
  const turned = (parent) => { const g = new THREE.Group(); g.rotation.y = Math.PI / 2; parent.add(g); return g; };
  const model = turned(root);
  // pivots first (the model fills them once it has loaded): the wheels roll about root z, the door swings out on its
  // front hinge (the van's right, root +z), the hatch lifts on its top edge
  const wheels = KV.WHEELS.map(([z, x]) => {
    const piv = new THREE.Group();
    piv.position.set(z, KV.WR, -x);
    turned(piv);
    root.add(piv);
    return piv;
  });
  const door = new THREE.Group();
  door.position.set(KV.HINGE_Z, 0, KV.W);
  const dIn = turned(door);
  root.add(door);
  const hatch = new THREE.Group();
  hatch.position.set(KV.HATCH_Z, KV.HATCH_TOP, 0);
  const hIn = turned(hatch);
  root.add(hatch);
  const cargo = new THREE.Group();
  cargo.position.set(KV.ZR + 0.36, KV.FLOOR, 0);
  root.add(cargo);
  const kitSlot = new THREE.Group();
  model.add(kitSlot);

  const body = carBody('kei_van', { plate: { cls: '40', kana: 'す', num: '19-79' }, onLoad: () => { rig(); kit(); } });
  if (body) model.add(body);
  let rigged = false;
  function rig() {
    if (rigged || !body) return;
    const meshes = [];
    body.traverse((o) => { if (o.isMesh && !/^(numberPlate|grilleSlats|carLettering)$/.test(o.material.name || '')) meshes.push(o); });
    if (!meshes.length) return;
    rigged = true;
    const D = KV.DOOR, H = KV.HATCH;
    const parts = cutParts(meshes, (mat, x, y, z) => {
      if (/^wheel$/i.test(mat)) return 'w' + ((z > 0 ? 0 : 2) + (x > 0 ? 1 : 0));
      if (x > D.x0 && x < D.x1 && z > D.z0 && z < D.z1 && y > D.y0 && y < D.y1) return 'door';
      if (Math.abs(x) < H.x && z < H.z1 && y > H.y0 && y < H.y1) return 'hatch';
      return null;
    });
    for (const m of parts.door || []) { m.position.set(KV.W, 0, -KV.HINGE_Z); dIn.add(m); }
    for (const m of parts.hatch || []) { m.position.set(0, -KV.HATCH_TOP, -KV.HATCH_Z); hIn.add(m); }
    KV.WHEELS.forEach(([z, x], i) => {
      for (const m of parts['w' + i] || []) {
        const c = m.geometry.boundingBox.getCenter(new THREE.Vector3());
        m.position.set(-c.x, -c.y, -c.z);
        wheels[i].children[0].add(m);
        wheels[i].position.set(c.z, c.y, -c.x);
      }
    });
  }
  function kit() {
    const k = assetNow(KIT);
    if (!k) { loadAsset(KIT).then(kit).catch(() => {}); return; }
    if (kitSlot.children.length) return;
    kitSlot.add(k);
    for (const m of k.children) {  // the side panels' sign-painting (shrink-wrapped onto the flanks in Blender), kept above the paint
      if (!/candy_side/.test(m.name)) continue;
      Object.assign(m.material, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      m.castShadow = false;
    }
    // the tray: wrapped candies heaped in two bins, lollipops in the third
    const T = KV.TRAY, rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    for (let b = 0; b < 2; b++) {
      const [z0, z1] = T.bins[b];
      for (let i = 0; i < 11; i++) {
        const c = assetSlot(lpAsset('candy_own'), { cast: false });
        const layer = i < 7 ? 0 : 1;
        c.position.set(T.x0 + 0.03 + rnd(i, b) * (T.x1 - T.x0 - 0.06), T.y + 0.009 + layer * 0.016, z0 + 0.03 + rnd(i, b + 5) * (z1 - z0 - 0.06));
        c.rotation.set(0, rnd(i, b + 9) * Math.PI * 2, layer ? (rnd(i, 3) - 0.5) * 0.5 : 0);
        kitSlot.add(c);
      }
    }
    const [z0] = T.bins[2];
    for (let i = 0; i < 3; i++) {  // lollipops laid across the bin, sticks to the van
      const l = assetSlot(lpAsset('lollipop_m'), { size: 0.12, cast: false });
      l.position.set(T.x0 + 0.02, T.y + 0.024, z0 + 0.035 + i * 0.042);
      l.rotation.set(0, (i - 1) * 0.12, -Math.PI / 2);
      kitSlot.add(l);
    }
  }

  const api = {
    root, wheels, door, hatch, cargo, length: KV.ZF - KV.ZR, width: KV.W * 2,
    rearX: KV.ZR, frontX: KV.ZF, doorX: (KV.DOOR.z0 + KV.HINGE_Z) / 2, sideZ: KV.W + 0.04,
    roll: 0,
    setWheels(dist) { api.roll = dist / KV.WR; for (const w of wheels) w.rotation.z = -api.roll; },
  };
  return api;
}

// ------------------------------------------------------------------ Gen-san
export function makeDriver() {
  const spec = makeSpec('grandpa', 1979);
  Object.assign(spec, {
    name: 'Gen-san', H: 1.6, build: 1.04, belly: 0.75,
    hair: { ...spec.hair, style: 'short', col: [196, 192, 186], grey: 1 },
    face: { ...spec.face, mustache: true, wrinkles: 1, spots: 1, stubble: 0.15, browW: 1.35, lipFull: 0.75 },
    glasses: { kind: 'round', col: [70, 50, 34], thick: 1 },
    hat: { kind: 'cap', col: [228, 84, 120], col2: [250, 240, 228] },
    top: { kind: 'polo', col: [236, 228, 210], band: [200, 48, 42], sleeve: 'short', uniform: true },
    bottom: { kind: 'cargo', col: [58, 64, 80] },
    shoes: { kind: 'sneaker', col: [240, 240, 236], col2: [200, 48, 42] }, socks: { col: [236, 236, 232] },
    acc: [{ kind: 'pouch', col: [42, 38, 34] }],
    walk: { style: 'elder', hunch: 0.35 },
  });
  const h = new Human(spec, { lazy: true });
  h.root.name = 'gensan';
  return h;
}

// ------------------------------------------------------------------ engine sound that follows the van
export class VanEngine {
  constructor() { this.on = false; }
  start(pos) {
    if (this.on || !audio.ready) return;
    const ctx = audio.ctx;
    try {
      const pan = ctx.createPanner();
      pan.panningModel = 'equalpower'; pan.distanceModel = 'inverse'; pan.refDistance = 3; pan.rolloffFactor = 1.2; pan.maxDistance = 80;
      const g = ctx.createGain(); g.gain.value = 0;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 42;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 21;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 2;
      const g2 = ctx.createGain(); g2.gain.value = 0.35;
      o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(pan).connect(audio.sfx);
      o.start(); o2.start();
      Object.assign(this, { pan, g, o, o2, lp, on: true });
      this.move(pos, 0);
      g.gain.setTargetAtTime(0.16, ctx.currentTime, 0.3);
    } catch { this.on = false; }
  }
  move(pos, speed = 0) {
    if (!this.on) return;
    const t = audio.ctx.currentTime;
    const P = this.pan;
    if (P.positionX) { P.positionX.setTargetAtTime(pos.x, t, 0.05); P.positionY.setTargetAtTime(pos.y, t, 0.05); P.positionZ.setTargetAtTime(pos.z, t, 0.05); } else P.setPosition(pos.x, pos.y, pos.z);
    const f = 38 + Math.min(1, Math.abs(speed) / 7) * 46;
    this.o.frequency.setTargetAtTime(f, t, 0.15); this.o2.frequency.setTargetAtTime(f / 2, t, 0.15);
    this.lp.frequency.setTargetAtTime(220 + Math.abs(speed) * 60, t, 0.2);
  }
  stop() {
    if (!this.on) return;
    this.on = false;
    const t = audio.ctx.currentTime;
    this.g.gain.setTargetAtTime(0, t, 0.25);
    const { o, o2 } = this;
    setTimeout(() => { try { o.stop(); o2.stop(); } catch { /* stopped */ } }, 1200);
  }
}
