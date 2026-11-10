// Props for the people of the lane: the bush guy's bush camp, pigeons, the biologist's potted plants, the customer
// guestbook lectern, and the yokai themselves (kappa, kitsune, tanuki, kasa-obake: src/peoplekit/yokai.js) as little animated creatures
// with the same small API as a Human (root, height, headTop(out), update(dt, { speed, lookAt, talking }), gesture,
// setExpression, clearGesture, currentGesture, dispose).
import * as THREE from 'three';
import { VoxelModel, gloss, metal } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { audio } from '../core/audio.js';
import { lecternMesh } from '../props/things/street.js';
import { Kit, fabric, enamel, chrome, plastic, wood, matte, ceramic, stone, flat, metal as kmetal } from '../props/kit/kit.js';
import { flower } from '../props/kit/shapes.js';
import { leaves } from '../props/kit/foliage.js';
import { pageFor } from '../props/kit/page.js';
import { Batch } from '../town/batch.js';
import { crown } from '../town/foliage.js';
import { kitMesh, selfLit } from '../peoplekit/kit.js';
import { yokaiGeometry } from './yokaiBuild.js';

const _geo = new Map();
const hash = (x, y, z, s = 0) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1013904223) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vm = (j = 0.03) => { const v = new VoxelModel(); v.jitter = j; return v; };
function rbox(x, y, z, c, a, r) {
  const qx = Math.abs(x - c[0]) - a[0] + r, qy = Math.abs(y - c[1]) - a[1] + r, qz = Math.abs(z - c[2]) - a[2] + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
/** Fill an ellipsoid (centre c, radii r) with col(x, y, z) (return null to skip). */
function ell(v, c, r, col) {
  for (let x = Math.floor(c[0] - r[0]); x <= Math.ceil(c[0] + r[0]); x++) for (let y = Math.floor(c[1] - r[1]); y <= Math.ceil(c[1] + r[1]); y++) for (let z = Math.floor(c[2] - r[2]); z <= Math.ceil(c[2] + r[2]); z++) {
    const d = ((x - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2 + ((z - c[2]) / r[2]) ** 2;
    if (d > 1) continue;
    const k = typeof col === 'function' ? col(x, y, z, d) : col;
    if (k !== null && k !== undefined) v.set(x, y, z, k);
  }
}
function box(v, x0, x1, y0, y1, z0, z1, col) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const k = typeof col === 'function' ? col(x, y, z) : col;
    if (k !== null && k !== undefined) v.set(x, y, z, k);
  }
}
/** A mesh of a cached voxel model; `vox` metres per voxel; pivot in voxel units. */
export function vmesh(key, build, vox = 1, pivot = [0, 0, 0]) {
  let g = _geo.get(key);
  if (!g) {
    g = meshVoxels(build(), { voxelSize: 1, origin: 'none' });
    g.translate(-0.5 - pivot[0], -0.5 - pivot[1], -0.5 - pivot[2]);
    g.computeBoundingSphere();
    _geo.set(key, g);
  }
  const m = new THREE.Mesh(g, voxelMaterials('normal'));
  m.scale.setScalar(vox);
  m.castShadow = true; m.receiveShadow = true; m.raycast = () => {};
  return m;
}

// (the people's worn / held props, the sorcerer's hood and wand, the binoculars and the meat: src/peoplekit/npc.js)

// ------------------------------------------------------------------ world props
/** The bush guy's camp: a big leafy shrub with a hollow, a rolled sleeping bag, a thermos and a cardboard sign. */
export function bushCamp() {
  const g = new THREE.Group();
  // the shrub: a ring of leaf masses round a hollow (the town's sprig-card crowns, src/town/foliage.js), open on top
  // where he looks out; two taller masses behind so the gap reads as part of the bush
  const B = new Batch(), t = { B };
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    crown(t, Math.cos(a) * 0.4, 0.42, Math.sin(a) * 0.33, 0.36, 0.44, 0.34, { kind: 'box', mix: ['small', 0.35], flat: -0.75, coreK: 0.55, density: 2.8, seed: 40 + k * 7 });
  }
  for (const sx of [-1, 1]) crown(t, sx * 0.24, 0.74, -0.26, 0.26, 0.24, 0.22, { kind: 'small', mix: ['box', 0.4], flat: -0.6, coreK: 0.5, density: 2.8, seed: 90 + sx });
  for (const m of B.build(g, { cast: true, receive: true, name: 'bush' })) m.raycast = () => {};
  g.add(campKit());
  return g;
}
let _campGeo = null;
/** The sleeping bag, the thermos and the NOT A BUSH sign, modelled with the prop kit on its own page. */
function campKit() {
  const page = pageFor('npc');
  if (!_campGeo) {
    const K = new Kit(page, 'bushCamp', { w: 2, h: 0.7, d: 1.2 }, 1);
    // the rolled sleeping bag: quilted nylon, two straps, the spiral of the roll at each end
    K.at([0.95, 0.13, 0.15], () => {
      const bag = fabric(0x2a5aa8), end = K.patch('bagEnd', 32, 32, (V) => { V.fill(0x2a5aa8); for (let r = 3; r < 16; r += 3.2) V.ring(16, 16, r, r + 1.2, 0x1e3a6a); V.disc(16, 16, 2, 0x24508e); }, { rough: 0.95 });
      K.lathe(bag, [-0.31, 0, 0], [[0.115, 0], [0.13, 0.02], [0.128, 0.16], [0.134, 0.31], [0.128, 0.46], [0.13, 0.6], [0.115, 0.62]], 14, { axis: 'x' });
      for (const s of [-1, 1]) { for (let k = 0; k < 14; k++) { const a0 = (k / 14) * Math.PI * 2, a1 = ((k + 1) / 14) * Math.PI * 2, P = (a) => [s * 0.31, Math.sin(a) * 0.115, Math.cos(a) * 0.115 * s], T = (a) => [0.5 + Math.cos(a) * 0.48, 0.5 + Math.sin(a) * 0.48]; K.triUV(end, [s * 0.31, 0, 0], P(a0), P(a1), [[0.5, 0.5], T(a0), T(a1)], [s, 0, 0]); } K.torus(fabric(0x1e2a3a), s * 0.17, 0, 0, 0.133, 0.008, 14, 4, { axis: 'x' }); K.box(kmetal(0x9aa0a4), s * 0.17 - 0.012, 0.125, -0.02, s * 0.17 + 0.012, 0.142, 0.02); }
    }, { ry: 0.4 });
    // the thermos: red enamel body, a steel shoulder and the cup on top
    K.lathe(enamel(0xb02a30), [0.72, 0, 0.55], [[0, 0], [0.038, 0], [0.042, 0.01], [0.042, 0.18], [0.036, 0.2]], 12);
    K.lathe(chrome(0xc8ccd4), [0.72, 0.2, 0.55], [[0.036, 0], [0.03, 0.02], [0.03, 0.03], [0.04, 0.032], [0.04, 0.075], [0, 0.078]], 12);
    K.tube(plastic(0x26221e), [[0.762, 0.06, 0.55], [0.79, 0.09, 0.55], [0.79, 0.15, 0.55], [0.762, 0.17, 0.55]], 0.007, 5);
    // the sign on its stick: corrugated card, NOT A / BUSH in marker
    K.cyl(wood(0x6a4a2a), -0.85, 0, 0.44, 0.012, 0.56, 6);
    K.at([-0.85, 0.55, 0.45], () => {
      const card = K.patch('notabush', 64, 22, (V) => {
        V.fill(0xc8a670); V.hline(0, 63, 21, 0xb0905a); V.hline(0, 63, 0, 0xa8864e); V.line(3, 17, 9, 21, 0xb0905a); V.line(55, 0, 63, 6, 0xb0905a);
        V.text5('NOT A', 32, 18, 0x2a1e18, { align: 'center' }); V.text5('BUSH', 32, 9, 0xb8322e, { align: 'center', s: 1 });
      }, { rough: 0.95 });
      K.box(matte(0xa8864e, 0), -0.2, -0.07, -0.006, 0.2, 0.07, 0.005);
      K.face(card, '+z', -0.2, -0.07, 0.2, 0.07, 0.0056);
      K.box(matte(0xc8b48a, 0), -0.012, -0.04, -0.012, 0.012, 0.04, -0.006);
    }, { rx: -0.05, ry: 0.25, rz: 0.04 });
    _campGeo = K.finish();
  }
  const m = new THREE.Mesh(_campGeo, page.mats());
  m.castShadow = true; m.receiveShadow = true; m.raycast = () => {};
  return m;
}

/** A potted plant for the biologist's survey: kind 'asagao' (morning glory on a trellis), 'bonsai', 'tomato'. Modelled
 *  with the prop kit; the leaves are the town's sprig cards (src/props/kit/foliage.js). Bottom-centre origin. */
const _plant = new Map();
export function planter(kind) {
  const page = pageFor('npc');
  let geo = _plant.get(kind);
  if (!geo) {
    const K = new Kit(page, 'planter:' + kind, { w: 0.4, h: 0.8, d: 0.3 }, 1);
    const pc = kind === 'bonsai' ? 0x5a4a6a : kind === 'tomato' ? 0xe8e8e4 : 0x3a6ab0, W = kind === 'tomato' ? 0.19 : 0.13, D = 0.13, H = 0.17;
    // a square glazed pot (tapered, a rolled rim), dark soil
    K.lathe(ceramic(pc), [0, 0, 0], [[0, 0], [W * 0.82, 0], [W, H - 0.02], [W + 0.012, H - 0.015], [W + 0.012, H], [W - 0.008, H], [W - 0.008, H - 0.02]], 4, { a0: Math.PI / 4, sx: 1.414, sz: (D / W) * 1.414 });
    K.box(matte(0x4a3424, 0.06), -W + 0.01, H - 0.03, -D + 0.01, W - 0.01, H - 0.022, D - 0.01, { bevel: 0 });
    if (kind === 'asagao') {
      // two bamboo canes and a crosspiece, the vine wound up them, a few flowers open
      const cane = wood(0xc8b070);
      for (const sx of [-0.09, 0.09]) K.cyl(cane, sx, H - 0.03, 0, 0.006, 0.66, 6);
      K.rod(cane, [-0.1, H + 0.6, 0], [0.1, H + 0.6, 0], 0.005, 4);
      leaves(K, (t, F) => { F.vine(t, -0.09, H, H + 0.6, 0.0, 3, { kind: 'asagao', card: 0.14 }); F.vine(t, 0.09, H + 0.05, H + 0.55, 0.0, 9, { kind: 'asagao', card: 0.14 }); });
    } else if (kind === 'bonsai') {
      // a bonsai black pine: gnarled plated trunk, kinked limbs, domed needle pads (the town's foliage)
      leaves(K, (t, F) => F.bonsaiPine(t, 0, H - 0.03, 0, 0.3, 5));
    } else {
      // tomatoes: two stems on canes, leaves, fruit from green to red
      for (const sx of [-0.08, 0.08]) {
        K.cyl(wood(0xc8b070), sx - 0.02, H - 0.03, -0.02, 0.005, 0.38, 6);
        K.tube(matte(0x4a8a34), [[sx, H - 0.03, 0], [sx + 0.01, H + 0.15, 0.01], [sx, H + 0.32, 0]], 0.006, 5);
        leaves(K, (t, F) => F.vine(t, sx, H + 0.02, H + 0.34, 0.0, sx > 0 ? 5 : 2, { kind: 'tomato', card: 0.13 }));
        for (const [dy, c] of [[0.1, 0xd83a2a], [0.17, 0xd85a2a], [0.24, 0x8ac04a]]) K.ball(plastic(c, 0.35), sx + 0.03, H + dy, 0.04, 0.02, 0.018, 0.02, 8, 4);
      }
    }
    geo = K.finish();
    _plant.set(kind, geo);
  }
  const m = new THREE.Mesh(geo, page.mats());
  m.castShadow = true; m.receiveShadow = true; m.raycast = () => {};
  for (const x of geo.userData.extras || []) { const c = new THREE.Mesh(x.geometry, x.material); c.castShadow = true; c.raycast = () => {}; m.add(c); }
  return m;
}

/** The customer guestbook: a little wooden lectern with an open notebook and a pen on a string. */
export function guestbookStand() {
  const g = new THREE.Group();
  // the lectern is modelled in src/props/things/street.js; the open book on its slanted top is drawn by the guestbook module
  const m = lecternMesh(); m.raycast = () => {};
  g.add(m);
  return g;
}

// ------------------------------------------------------------------ pigeons: the animal kit's ground flock (src/animals/pigeon.js), same API
export { GroundFlock as Flock } from '../animals/pigeon.js';

// ------------------------------------------------------------------ yokai
// Yokai are faintly self-lit after dark (flat, from their own colours: readable in an unlit lane, never a halo). The
// creatures are modelled in src/peoplekit/yokai.js and drawn with the people kit's self-lit materials.
export const yokaiSelfLit = selfLit;
// (their models are sculpted in a background worker after boot: src/npc/yokaiBuild.js)
const ygeo = yokaiGeometry;

/** An animated yokai with the Human-like API the lane uses. kind: kappa | kitsune | tanuki | kasa. */
export class Creature {
  constructor(kind) {
    this.kind = kind;
    this.spec = null;
    this.root = new THREE.Group();
    this.root.name = 'yokai:' + kind;
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.mesh = kitMesh(ygeo(kind), 'self');
    this.body.add(this.mesh);
    this.tails = [];
    if (kind === 'kitsune') for (let i = 0; i < 3; i++) { const t = kitMesh(ygeo('kitsuneTail'), 'self'); t.position.set((i - 1) * 0.08, 0.1, -0.1); t.rotation.set(-0.9, (i - 1) * 0.5, 0); this.body.add(t); this.tails.push(t); }
    this.height = { kappa: 0.95, kitsune: 0.65, tanuki: 0.95, kasa: 1.15 }[kind];
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
    for (let i = 0; i < this.tails.length; i++) this.tails[i].rotation.y = (i - 1) * 0.5 + Math.sin(t * 2.2 + i) * 0.3;
  }
  dispose() { this.root.removeFromParent(); }
}
