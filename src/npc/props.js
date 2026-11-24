// Props for the people of the lane: the bush guy's camp, the biologist's potted plants, the pigeons, and the yokai
// themselves (kappa, kitsune, tanuki, kasa-obake) with the same small API as a Human (root, height, headTop(out),
// update(dt, { speed, lookAt, talking }), gesture, setExpression, clearGesture, currentGesture, dispose).
// Everything is a lowpix world model (imported hand-made models and our own, art/lowpix/world/world.json), loaded
// lazily; the shrub is the lane's sprig-card foliage (src/world/foliage.js).
import * as THREE from 'three';
import { assetSlot } from '../kit/assets.js';
import { lpAsset } from '../kit/lowpixWorld.js';
import { Leaves } from '../world/foliage.js';

/** A world model (origin at its bottom centre), lazily loaded; o: { size (m), fit ('x' | 'y' | 'z'), cast }. */
function model(id, o = {}) {
  const s = assetSlot(lpAsset(id), { cast: o.cast ?? true, size: o.size, fit: o.fit });
  const noRay = () => s.traverse((m) => { m.raycast = () => {}; });
  noRay();
  s.addEventListener?.('assetloaded', noRay);
  return s;
}

// ------------------------------------------------------------------ world props
/** The bush guy's camp: a big leafy shrub with a gap on top to look out of, a rolled sleeping bag, a thermos and a
 *  cardboard sign on a stick (NOT A BUSH). */
export function bushCamp() {
  const g = new THREE.Group();
  // two layers of overlapping leaf masses round a hollow, like the lane's hedges: reads dense from every side
  const clumps = [
    [-0.42, 0.5, 0.05, 0.5, 0.48, 0.5], [0.42, 0.52, -0.05, 0.5, 0.5, 0.48], [0, 0.42, 0.32, 0.55, 0.42, 0.3],
    [0, 0.45, -0.34, 0.55, 0.44, 0.3], [-0.3, 0.86, -0.1, 0.34, 0.26, 0.32], [0.3, 0.88, 0.12, 0.34, 0.26, 0.3],
  ];
  const L = new Leaves(17);
  L.bush(null, null, null, { clumps, kind: 'camellia', mix: ['broad', 0.3], size: 0.32, density: 2.6, seed: 31 }); // glossy evergreen, no flowers
  L.build(g, { cast: true, name: 'bush' });
  const bag = model('sleepbag', { size: 0.22, fit: 'y' });
  bag.position.set(0.95, 0, 0.15); bag.rotation.y = 0.4;
  const flask = model('thermos', { size: 0.25, fit: 'y' });
  flask.position.set(0.72, 0, 0.55);
  const sign = model('bush_sign');
  sign.position.set(-0.85, 0, 0.45); sign.rotation.set(0, 0.25, 0.03);
  g.add(bag, flask, sign);
  return g;
}

/** A potted plant for the biologist's survey: kind 'asagao' (morning glory on a trellis), 'bonsai', 'tomato'. */
const PLANTS = { asagao: ['asagao_bloom', 0.78], bonsai: ['bonsai', 0.46], tomato: ['tomato_plant2', 0.5] };
export function planter(kind) {
  const [id, h] = PLANTS[kind] || PLANTS.asagao;
  const g = new THREE.Group();
  g.add(model(id, { size: h, fit: 'y' }));
  return g;
}

// ------------------------------------------------------------------ pigeons: the animal kit's ground flock (src/animals/pigeon.js), same API
// (group, birds[i].b, setVisible, feed(p), scatter(), update(dt), dispose()): one instanced, morphing draw call.
export { GroundFlock as Flock } from '../animals/pigeon.js';

// ------------------------------------------------------------------ yokai
// kappa: a scaly river imp with its shell (Kappa by samnorwoodgo), kitsune: the white nine-tailed fox with red-tipped
// tails (kitsune by divivan), tanuki: the round-bellied Shigaraki statue come alive (Statue Tanuki by Sonkiam),
// kasa-obake: the one-eyed, one-legged old umbrella (Kasa-obake by imed). All CC BY, converted by lowpix.
const YOKAI = { kappa: ['yokai_kappa', 0.95], kitsune: ['yokai_kitsune', 0.65], tanuki: ['yokai_tanuki', 0.95], kasa: ['yokai_kasa', 1.15] };

// Yokai are faintly self-lit after dark (flat, from their own colours: readable in an unlit lane, never a halo)
export const yokaiSelfLit = { value: 0 };
const _selfLit = new WeakMap();
function selfLit(m) {
  if (!m || !m.isMeshStandardMaterial) return m;
  if (!_selfLit.has(m)) {
    const c = m.clone();
    c.onBeforeCompile = (sh) => {
      sh.uniforms.uSelf = yokaiSelfLit;
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uSelf;\nvoid main() {')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * uSelf;');
    };
    c.customProgramCacheKey = () => 'yokai-self-lit';
    _selfLit.set(m, c);
  }
  return _selfLit.get(m);
}
function lightUp(root) {
  root.traverse((o) => {
    if (!o.isMesh || o.userData.selfLit) return;
    o.material = Array.isArray(o.material) ? o.material.map(selfLit) : selfLit(o.material);
    o.userData.selfLit = true; o.castShadow = true; o.receiveShadow = true; o.raycast = () => {};
  });
}

/** An animated yokai with the Human-like API the lane uses. kind: kappa | kitsune | tanuki | kasa. */
export class Creature {
  constructor(kind) {
    this.kind = kind;
    this.spec = null;
    const [id, h] = YOKAI[kind] || YOKAI.tanuki;
    this.root = new THREE.Group();
    this.root.name = 'yokai:' + kind;
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.mesh = model(id, { size: h, fit: 'y' });
    lightUp(this.mesh);
    this.mesh.addEventListener?.('assetloaded', () => lightUp(this.mesh));
    this.body.add(this.mesh);
    this.tails = []; // (the kitsune's nine tails are part of its model)
    this.height = h;
    this.t = Math.random() * 5;
    this.gestures = [];
    this.g = null; this.gT = 0;
    this.statue = false;
  }
  headTop(out = new THREE.Vector3()) { this.root.updateWorldMatrix(true, false); return out.set(0, this.height + 0.12, 0).applyMatrix4(this.root.matrixWorld); }
  gesture(name) { this.g = name; this.gT = 0; }
  clearGesture() { this.g = null; }
  get currentGesture() { return this.g; }
  setExpression() {}
  update(dt, { speed = 0, talking = false } = {}) {
    this.t += dt; this.gT += dt;
    const b = this.body, t = this.t;
    if (this.statue) { b.position.set(0, 0, 0); b.rotation.set(0, 0, 0); return; }
    let y = 0, rx = 0, rz = 0;
    if (this.kind === 'kasa') { y = Math.abs(Math.sin(t * (speed > 0.1 ? 7 : 2.5))) * (speed > 0.1 ? 0.18 : 0.05); rz = Math.sin(t * 2.5) * 0.06; }
    else if (this.kind === 'kappa') { rz = Math.sin(t * (speed > 0.1 ? 8 : 1.6)) * (speed > 0.1 ? 0.14 : 0.04); y = speed > 0.1 ? Math.abs(Math.sin(t * 8)) * 0.03 : 0; }
    else if (this.kind === 'tanuki') { y = Math.abs(Math.sin(t * (speed > 0.1 ? 6 : 1.2))) * (speed > 0.1 ? 0.06 : 0.015); rz = speed > 0.1 ? Math.sin(t * 6) * 0.08 : 0; }
    else { y = speed > 0.1 ? Math.abs(Math.sin(t * 9)) * 0.05 : Math.sin(t * 1.4) * 0.008; }
    if (talking) y += Math.abs(Math.sin(t * 14)) * 0.012;
    if (this.g === 'bow') { const k = this.gT < 0.6 ? this.gT / 0.6 : this.gT < 1.8 ? 1 : Math.max(0, 1 - (this.gT - 1.8) / 0.6); rx = 0.7 * k; if (this.gT > 2.6) this.g = null; }
    else if (this.g === 'cheer' || this.g === 'hop') { y += Math.abs(Math.sin(this.gT * 9)) * 0.12; if (this.gT > 1.6) this.g = null; }
    else if (this.g === 'shrug') { rz += Math.sin(this.gT * 10) * 0.1 * Math.max(0, 1 - this.gT); if (this.gT > 1.2) this.g = null; }
    else if (this.g && this.gT > 2.5) this.g = null;
    b.position.y = y; b.rotation.set(rx, 0, rz);
  }
  dispose() { this.root.removeFromParent(); }
}
