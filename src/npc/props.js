// Chunky voxel props for the people of the lane: the sorcerer's hood, eyepatch and chopstick wand, the bush guy's
// binoculars and his bush camp, the pirate's meat on the bone, pigeons, the biologist's potted plants, the customer
// guestbook lectern, and the yokai themselves (kappa, kitsune, tanuki, kasa-obake) as little animated voxel creatures
// with the same small API as a Human (root, height, headTop(out), update(dt, { speed, lookAt, talking }), gesture,
// setExpression, clearGesture, currentGesture, dispose).
import * as THREE from 'three';
import { VoxelModel, gloss, metal } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { audio } from '../core/audio.js';
import { Kit, fabric, enamel, chrome, plastic, wood, matte, ceramic, stone, flat, metal as kmetal } from '../props/kit/kit.js';
import { flower } from '../props/kit/shapes.js';
import { leaves } from '../props/kit/foliage.js';
import { pageFor } from '../props/kit/page.js';
import { Batch } from '../town/batch.js';
import { crown } from '../town/foliage.js';

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

// ------------------------------------------------------------------ worn / held props (head units: 1 = 1/20 head)
export const MODELS = {
  /** A hoodie's hood: a shell around the head with an oval face opening and two drawstrings. */
  hood() {
    const v = vm(0.03), C = 0x2c2438, D = 0x221c2c, L = 0x3e3450, S = 0xd8d0c0;
    for (let x = -13; x <= 13; x++) for (let y = -9; y <= 21; y++) for (let z = -13; z <= 15; z++) {
      const d = rbox(x, y, z, [0, 6.8, 1.6], [9.2, 12.4, 10.2], 5.2);
      if (d > 0 || d < -1.7) continue;
      if (z > 2 && Math.hypot(x / 6.6, (y - 5.4) / 8.4) < 1) continue; // the face
      if (z > 4 && y < -1.5) continue; // open under the chin
      const rim = z > 1 && Math.hypot(x / 7.8, (y - 5.4) / 9.6) < 1;
      v.set(x, y, z, rim ? L : hash(x >> 1, y >> 1, z, 3) > 0.8 ? D : C);
    }
    // drawstrings
    for (const sx of [-3, 3]) for (let y = -6; y <= -1; y++) v.set(sx, y, 9, S);
    return v;
  },
  /** A black eyepatch over the right eye with its band. */
  eyepatch() {
    const v = vm(0.01), K = 0x18141a, B = 0x2a2428;
    box(v, -9, -3, 9, 15, 22, 22, (x, y) => (Math.hypot((x + 6) / 3.6, (y - 12) / 3.6) < 1 ? K : null));
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const x = Math.round(Math.sin(a) * 16.6), z = Math.round(4.8 + Math.cos(a) * 19), y = Math.round(16 + Math.sin(a) * 1.2);
      if (Math.cos(a) > 0.9 && x < -2) continue;
      v.set(x, y, z, B);
    }
    return v;
  },
  /** Binoculars (metric voxels of 1 cm): two barrels and a hinge. */
  binoculars() {
    const v = vm(0.02), K = 0x22242a, G = 0x3a3e46, L = gloss(0x3a5a8a);
    for (const sx of [-4, 4]) {
      for (let z = -7; z <= 7; z++) for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) if (x * x + y * y <= 5) v.set(sx + x, y, z, z === 7 ? L : z > 4 ? G : K);
    }
    box(v, -2, 2, -1, 1, -2, 2, G);
    return v;
  },
  /** A big manga steak on the bone. */
  meat() {
    const v = vm(0.04), M = 0xa0522d, D = 0x7a3a1c, F = 0xe8b07a, B = 0xf4eee0;
    ell(v, [0, 0, 0], [5, 4, 4], (x, y, z, d) => (d > 0.8 ? (hash(x, y, z) > 0.6 ? D : M) : F));
    for (const sx of [-1, 1]) { box(v, sx * 5, sx * 8, -1, 1, -1, 1, B); ell(v, [sx * 9, 1, 0], [1.4, 1.4, 1.4], B); ell(v, [sx * 9, -1, 0], [1.4, 1.4, 1.4], B); }
    return v;
  },
  /** The sorcerer's "wand": a lacquered chopstick with a paper star on top (metric, 5 mm voxels). */
  wand() {
    const v = vm(0.01), R = gloss(0x8a1e1e), Y = 0xf6d43c, O = 0xd8a020;
    box(v, 0, 0, -20, 22, 0, 0, R);
    const star = ['..#..', '..#..', '#####', '.###.', '##.##'];
    star.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') { v.set(x - 2, 28 - y, 0, Y); v.set(x - 2, 28 - y, -1, O); } }));
    return v;
  },
};

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
      leaves(K, (t, F) => { F.vine(t, -0.09, H, H + 0.6, 0.0, 3, { card: 0.12 }); F.vine(t, 0.09, H + 0.05, H + 0.55, 0.0, 9, { card: 0.12 }); });
      for (const [x, y, c] of [[-0.12, 0.42, 0x6a5ad8], [0.06, 0.55, 0x8a7ae8], [0.12, 0.33, 0x6a5ad8], [-0.05, 0.7, 0xd86aa8]]) flower(K, flat(c, 0.7), [x, y, 0.05], 0.032, { dir: [0, 0.2, 1], cup: 0.5, eye: flat(0xf4f0ff) });
    } else if (kind === 'bonsai') {
      // a twisting little pine: trunk, two limbs, flat needle pads
      const bark = stone(0x5a3a24, 0.12);
      K.tube(bark, [[0, H - 0.03, 0], [0.02, H + 0.08, 0], [-0.03, H + 0.16, 0.01], [0.01, H + 0.24, 0]], 0.02, 6, { radii: [0.024, 0.018, 0.013, 0.008] });
      K.tube(bark, [[0.02, H + 0.08, 0], [0.11, H + 0.12, 0.01]], 0.009, 5, { r1: 0.005 });
      leaves(K, (t, F) => { for (const [x, y, r] of [[0.12, H + 0.14, 0.07], [-0.07, H + 0.2, 0.08], [0.01, H + 0.27, 0.09]]) F.crown(t, x, y, 0, r, r * 0.45, r * 0.85, { kind: 'pine', flat: -0.2, card: 0.08, density: 3, seed: Math.round(x * 100) }); });
    } else {
      // tomatoes: two stems on canes, leaves, fruit from green to red
      for (const sx of [-0.08, 0.08]) {
        K.cyl(wood(0xc8b070), sx - 0.02, H - 0.03, -0.02, 0.005, 0.38, 6);
        K.tube(matte(0x4a8a34), [[sx, H - 0.03, 0], [sx + 0.01, H + 0.15, 0.01], [sx, H + 0.32, 0]], 0.006, 5);
        leaves(K, (t, F) => F.vine(t, sx, H + 0.02, H + 0.34, 0.0, sx > 0 ? 5 : 2, { kind: 'leaf', card: 0.11 }));
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
  g.add(vmesh('gbStand', () => {
    const v = vm(0.03), W = 0x8a6038, D = 0x6a4428;
    box(v, -1, 1, 0, 30, -1, 1, W);
    box(v, -6, 6, 0, 1, -5, 5, D);
    for (let y = 30; y <= 33; y++) box(v, -9, 9, y, y, -6 + (y - 30) * 2, 4 + (y - 30) * 2, (x) => (Math.abs(x) === 9 ? D : W));
    return v;
  }, 0.03));
  // the open book: two page planes on a slanted cover (pages are drawn by the guestbook module)
  return g;
}

// ------------------------------------------------------------------ pigeons
const PIGEON = () => {
  const v = vm(0.02), G = 0x8a8e98, L = 0xa8acb6, D = 0x5a5e68, N1 = 0x4a8a6a, N2 = 0x7a4a8a, K = 0x2a2a2e, E = 0xe87a2a, F = 0xd87a7a;
  ell(v, [0, 4, 0], [3, 2.6, 5], (x, y, z) => (y < 3 ? L : z < -3 ? D : G));
  for (let z = -9; z <= -5; z++) box(v, -1, 1, 4, 4, z, z, D);
  ell(v, [0, 7, 4], [1.8, 2, 1.8], (x, y, z) => (y < 7 ? (hash(x, y, z) > 0.5 ? N1 : N2) : D));
  v.set(0, 7, 6, K).set(0, 6, 6, 0xd8c8b8);
  v.set(1, 8, 5, E).set(-1, 8, 5, E);
  box(v, -1, -1, 0, 1, 0, 0, F); box(v, 1, 1, 0, 1, 0, 0, F);
  return v;
};
const WING = () => { const v = vm(0.02); box(v, 0, 0, 0, 1, -4, 3, (x, y, z) => (z < -2 ? 0x4a4e58 : z === 0 ? 0x3a3e48 : 0x7a7e88)); return v; };

/** A small flock that pecks around a point, scatters when you rush at it, and lands again. */
export class Flock {
  constructor(game, n = 5, center = new THREE.Vector3()) {
    this.game = game;
    this.center = center.clone();
    this.group = new THREE.Group();
    this.group.name = 'pigeons';
    game.scene.add(this.group);
    this.birds = [];
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group();
      const body = vmesh('pigeon', PIGEON, 0.022, [0, 0, 0]);
      b.add(body);
      const wings = [-1, 1].map((s) => { const w = vmesh('pigeonWing', WING, 0.022); w.position.set(s * 0.06, 0.1, 0); b.add(w); return w; });
      b.position.set(center.x + (Math.random() - 0.5) * 2, 0, center.z + (Math.random() - 0.5) * 1.6);
      b.rotation.y = Math.random() * 6.28;
      this.group.add(b);
      this.birds.push({ b, body, wings, t: Math.random() * 5, peck: 0, hop: 0, fly: 0, vy: 0, target: null, wait: Math.random() * 2 });
    }
    this.visible = true;
  }
  setVisible(on) { this.group.visible = on; this.visible = on; }
  /** Throw crumbs: they all come running to point p. */
  feed(p) { for (const B of this.birds) { B.target = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.9, 0, (Math.random() - 0.5) * 0.9)); B.wait = Math.random() * 0.4; } }
  scatter() {
    let any = false;
    for (const B of this.birds) if (!B.fly) { B.fly = 1; B.vy = 2.4 + Math.random(); B.dir = Math.random() * 6.28; any = true; }
    if (any) { try { audio.play('flutter', { pos: this.birds[0].b.position, vol: 0.7 }); } catch { /* audio not ready */ } }
    return any;
  }
  update(dt) {
    if (!this.visible) return;
    const pl = this.game.player, cam = this.game.camera;
    const d = Math.hypot(pl.pos.x - this.center.x, pl.pos.z - this.center.z);
    if (d > 40) return;
    const fast = Math.hypot(pl.vel.x, pl.vel.z) > 3;
    for (const B of this.birds) {
      const b = B.b;
      B.t += dt;
      if (B.fly) {
        B.fly += dt;
        b.position.y += B.vy * dt; B.vy -= dt * 0.6;
        b.position.x += Math.sin(B.dir) * 2.2 * dt; b.position.z += Math.cos(B.dir) * 2.2 * dt;
        b.rotation.y = B.dir;
        const f = Math.sin(B.t * 34) * 0.9;
        B.wings[0].rotation.z = f; B.wings[1].rotation.z = -f;
        if (B.fly > 6) { B.fly = 0; b.position.set(this.center.x + (Math.random() - 0.5) * 2, 0, this.center.z + (Math.random() - 0.5) * 1.6); B.wings[0].rotation.z = B.wings[1].rotation.z = 0; }
        continue;
      }
      if (fast && Math.hypot(pl.pos.x - b.position.x, pl.pos.z - b.position.z) < 1.4) { this.scatter(); break; }
      // peck, hop toward crumbs, little turns
      B.wait -= dt;
      if (B.target) {
        const dx = B.target.x - b.position.x, dz = B.target.z - b.position.z, dd = Math.hypot(dx, dz);
        if (dd < 0.08) B.target = null;
        else if (B.wait <= 0) { b.rotation.y = Math.atan2(dx, dz); const s = Math.min(dd, 0.9 * dt); b.position.x += dx / dd * s; b.position.z += dz / dd * s; B.hop += dt * 14; }
      } else if (B.wait <= 0) {
        B.wait = 0.6 + Math.random() * 2.2;
        if (Math.random() < 0.5) B.peck = 1; else b.rotation.y += (Math.random() - 0.5) * 1.6;
      }
      B.peck = Math.max(0, B.peck - dt * 3);
      b.position.y = Math.abs(Math.sin(B.hop)) * 0.02;
      B.body.rotation.x = Math.sin(B.peck * Math.PI) * 0.6;
      void cam;
    }
  }
  dispose() { this.group.removeFromParent(); }
}

// ------------------------------------------------------------------ yokai
const YOKAI = {
  /** Kappa: green, beaked, a shell on the back and the water dish on top of the head (voxel 4 cm, ~1 m). */
  kappa() {
    const v = vm(0.04), G = 0x5aa04a, D = 0x3a7a34, Y = 0xe8c040, S = 0x8a6a3a, S2 = 0x6a4a2a, W = 0xf0f0ea, A = gloss(0x7ac0e8), H = 0x2a4a2a, K = 0x1a1a1a;
    ell(v, [0, 9, 0], [4.5, 5.5, 3.6], (x, y, z) => (z > 2 && y < 10 ? 0xd8d890 : G)); // body + belly
    ell(v, [0, 9, -3.4], [4.8, 5.2, 2.4], (x, y, z) => ((x + y) % 3 === 0 ? S2 : S)); // shell
    ell(v, [0, 18, 0.5], [4, 3.8, 3.8], G); // head
    box(v, -2, 2, 16, 18, 4, 6, (x, y, z) => (z === 6 && y === 16 ? D : Y)); // beak
    v.set(-2, 19, 4, W).set(2, 19, 4, W).set(-2, 19, 5, K).set(2, 19, 5, K);
    for (let a = 0; a < 6.3; a += 0.25) v.set(Math.round(Math.cos(a) * 3.6), 21, Math.round(0.5 + Math.sin(a) * 3.6), H); // hair fringe
    ell(v, [0, 22, 0.5], [2.6, 0.8, 2.6], (x, y) => (y > 22 ? A : W)); // the dish
    for (const sx of [-1, 1]) { box(v, sx * 4, sx * 6, 10, 11, -1, 1, G); box(v, sx * 6, sx * 7, 8, 10, 0, 2, D); box(v, sx * 2, sx * 3, 0, 4, -1, 1, G); box(v, sx * 1, sx * 4, 0, 0, 0, 3, D); }
    return v;
  },
  /** Kitsune: a white fox with red markings, sitting up (the three tails are separate meshes). */
  kitsune() {
    const v = vm(0.03), W = 0xf4f0ea, C = 0xe8e0d4, R = 0xc83030, K = 0x1a1418, O = 0xe8a020;
    ell(v, [0, 7, 0], [3.6, 6, 3.2], (x, y, z) => (z > 1.5 && y > 6 ? C : W));
    ell(v, [0, 15, 1], [3, 3, 3.2], W);
    box(v, -1, 1, 13, 15, 3, 6, (x, y, z) => (z === 6 && y === 14 ? K : W));
    for (const sx of [-1, 1]) { box(v, sx * 1, sx * 3, 18, 21, 0, 1, (x, y) => (y > 19 && Math.abs(x) === 2 ? R : W)); v.set(sx * 2, 16, 3, O); v.set(sx * 2, 16, 4, K); v.set(sx * 3, 15, 3, R); }
    box(v, -2, 2, 0, 3, 2, 3, W);
    v.set(0, 18, 3, R).set(0, 17, 4, R);
    return v;
  },
  kitsuneTail() {
    const v = vm(0.03);
    for (let i = 0; i <= 12; i++) { const r = 1.2 + Math.sin(i / 12 * Math.PI) * 1.4; ell(v, [0, i, -Math.sin(i * 0.2) * 1.5], [r, 0.8, r], i > 10 ? 0xc83030 : 0xf4f0ea); }
    return v;
  },
  /** Tanuki: the round-bellied Shigaraki statue (straw hat, sake bottle, a ledger). */
  tanuki() {
    const v = vm(0.035), B = 0x8a6a4a, D = 0x5a4232, L = 0xd8c8a8, K = 0x1a1418, H = 0xc8a050, H2 = 0xa88038, T = 0xe8e0d0;
    ell(v, [0, 8, 0], [6, 7, 5.2], (x, y, z) => (z > 2.5 && Math.hypot(x, y - 7) < 5 ? L : B)); // the belly
    ell(v, [0, 18, 0.5], [4.2, 3.8, 3.8], B);
    for (const sx of [-1, 1]) { ell(v, [sx * 1.8, 18.5, 3.6], [1.4, 1.2, 0.6], D); v.set(sx * 2, 19, 4, T).set(sx * 2, 18, 4, K); ell(v, [sx * 3, 22, 0], [1, 1.2, 0.8], D); }
    box(v, -1, 1, 16, 17, 4, 4, L); v.set(0, 17, 5, K);
    for (let y = 21; y <= 24; y++) ell(v, [0, y, 0.5], [6.5 - (y - 21) * 1.6, 0.5, 6.5 - (y - 21) * 1.6], (x, yy, z) => ((x + z) % 2 ? H : H2)); // straw hat
    box(v, 5, 7, 6, 12, 1, 3, (x, y) => (y > 10 ? T : 0x8a3a2a)); // sake bottle
    box(v, -7, -5, 6, 9, 1, 4, 0xe8e0c0); // the ledger
    for (const sx of [-1, 1]) box(v, sx * 2, sx * 4, 0, 1, -1, 3, D);
    ell(v, [0, 6, -5], [2, 2, 1.6], (x, y) => ((y + 9) % 3 ? B : D)); // tail
    return v;
  },
  /** Kasa-obake: an old paper umbrella with one eye, a tongue, one leg and a geta sandal. */
  kasa() {
    const v = vm(0.03), P = [0xb8323a, 0xa02a32], R = 0x6a3a24, W = 0xf4f0ea, K = 0x1a1418, T = 0xe8606a, L = 0xe0c0a0, G = 0x8a6a4a;
    for (let y = 10; y <= 34; y++) {
      const r = (34 - y) * 0.42 + 1;
      for (let a = 0; a < 6.3; a += 0.12) {
        const rr = r * (1 + 0.12 * Math.abs(Math.sin(a * 4)));
        const x = Math.round(Math.cos(a) * rr), z = Math.round(Math.sin(a) * rr);
        v.set(x, y, z, Math.floor((a / 6.3) * 8) % 2 ? P[0] : P[1]);
      }
    }
    ell(v, [0, 22, 7], [3, 3, 1], W); v.set(0, 22, 8, K).set(1, 22, 8, K).set(0, 23, 8, K).set(1, 21, 8, 0x4a3a2a);
    box(v, 0, 1, 14, 18, 8, 9, T); v.set(0, 13, 9, T).set(1, 13, 9, T);
    box(v, 0, 0, 34, 37, 0, 0, R);
    box(v, -1, 1, 0, 9, -1, 1, L);
    box(v, -3, 3, -1, -1, -4, 4, G); box(v, -3, 3, -3, -2, -3, -2, G); box(v, -3, 3, -3, -2, 2, 3, G);
    return v;
  },
};

// Yokai are faintly self-lit after dark (flat, from their own colours: readable in an unlit lane, never a halo)
export const yokaiSelfLit = { value: 0 };
let _ymats = null;
function yokaiMaterials() {
  if (_ymats) return _ymats;
  _ymats = voxelMaterials('normal').map((m, i) => {
    if (i > 2) return m;
    const c = m.clone();
    c.onBeforeCompile = (sh) => {
      sh.uniforms.uSelf = yokaiSelfLit;
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uSelf;\nvoid main() {')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * uSelf;');
    };
    c.customProgramCacheKey = () => 'yokai-self-' + i;
    return c;
  });
  return _ymats;
}

/** An animated voxel yokai with the Human-like API the lane uses. kind: kappa | kitsune | tanuki | kasa. */
export class Creature {
  constructor(kind) {
    this.kind = kind;
    this.spec = null;
    const vox = { kappa: 0.04, kitsune: 0.03, tanuki: 0.035, kasa: 0.03 }[kind];
    this.root = new THREE.Group();
    this.root.name = 'yokai:' + kind;
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.mesh = vmesh('yokai:' + kind, YOKAI[kind], vox);
    this.body.add(this.mesh);
    this.tails = [];
    if (kind === 'kitsune') for (let i = 0; i < 3; i++) { const t = vmesh('kitsuneTail', YOKAI.kitsuneTail, vox); t.position.set((i - 1) * 0.08, 0.1, -0.1); t.rotation.set(-0.9, (i - 1) * 0.5, 0); this.body.add(t); this.tails.push(t); }
    this.body.traverse((o) => { if (o.isMesh) o.material = yokaiMaterials(); });
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
