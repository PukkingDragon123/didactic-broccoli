// The FREE CANDY van and Gen-san, the old delivery uncle who drives it. A battered 1980s one-box panel van, low-poly
// with a hand-painted pixel atlas (src/vehicles/candyVan.js: cream paint, a faded red stripe, chrome bumpers and round
// headlights, rust, a roof rack with a spare), FREE CANDY sign-painted down both sides (he bought it from a sweets
// wholesaler and never repainted it: it's a running joke on the lane), a driver's door and a rear hatch that open,
// wheels that turn, and its own little engine sound that moves with it.
//   buildVan() -> { root, wheels[], door (pivot), hatch (pivot), cargo (Group), length, width, setWheels(dist) }
//   makeDriver() -> Human (cap, moustache, round glasses, Lane Express polo)
//   VanEngine: start(pos), move(pos, speed), stop()
import * as THREE from 'three';
import { Human } from '../people/Human.js';
import { makeSpec } from '../people/presets.js';
import { audio } from '../core/audio.js';
import { candyVanParts, CANDY } from '../vehicles/candyVan.js';

/** Build the van's geometry and atlas ahead of its first visit (idle time), so the first delivery doesn't hitch. */
export function prewarmVan() { candyVanParts(); }

/** The van: root faces +x (its nose); y = 0 is the road. (The model is built facing +z and turned.) */
export function buildVan() {
  const P = candyVanParts(), M = P.mats, C = CANDY;
  const root = new THREE.Group();
  root.name = 'freeCandyVan';
  const turned = (parent) => { const g = new THREE.Group(); g.rotation.y = Math.PI / 2; parent.add(g); return g; };
  const model = turned(root);
  const mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = shadow; if (mat === M.glass) { m.renderOrder = 2; m.raycast = () => {}; } return m; };
  model.add(mesh(P.body, M.body), mesh(P.spare, M.body), mesh(P.glass, M.glass, false));
  // the wheels: pivots in the van's frame (they roll about z), the tyres turned to face out
  const wheels = [[C.AXF, -C.TRACK], [C.AXF, C.TRACK], [C.AXR, -C.TRACK], [C.AXR, C.TRACK]].map(([z, x]) => {
    const piv = new THREE.Group();
    piv.position.set(z, C.WR, -x);
    const w = mesh(x > 0 ? P.wheelL : P.wheelR, M.body);
    w.receiveShadow = false;
    turned(piv).add(w);
    root.add(piv);
    return piv;
  });
  // the driver's door, hinged at its front edge (the van's right, +z)
  const door = new THREE.Group();
  door.position.set(C.HINGE_Z, 0, C.W);
  const dIn = turned(door);
  for (const [g, m] of [[P.door, M.body], [P.doorGlass, M.glass]]) { const d = mesh(g, m, m !== M.glass); d.position.set(C.W, 0, -C.HINGE_Z); dIn.add(d); }
  root.add(door);
  // the rear hatch, hinged along its top edge
  const hatch = new THREE.Group();
  hatch.position.set(C.ZR, C.HATCH_TOP, 0);
  const hIn = turned(hatch);
  for (const [g, m] of [[P.hatch, M.body], [P.hatchGlass, M.glass]]) { const h = mesh(g, m, m !== M.glass); h.position.set(0, -C.HATCH_TOP, -C.ZR); hIn.add(h); }
  root.add(hatch);
  // the cargo: the boxes for this stop sit in the back, visible when the hatch is up
  const cargo = new THREE.Group();
  cargo.position.set(C.ZR + 0.28, 0.36, 0);
  root.add(cargo);
  const api = {
    root, wheels, door, hatch, cargo, length: 3.72, width: C.W * 2,
    rearX: -1.86, frontX: 1.86, doorX: (C.DOOR_Z0 + C.HINGE_Z) / 2, sideZ: C.W + 0.04,
    roll: 0,
    setWheels(dist) { api.roll = dist / C.WR; for (const w of wheels) w.rotation.z = -api.roll; },
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
