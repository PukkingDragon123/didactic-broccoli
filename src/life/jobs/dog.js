// Side job: walk Mrs. Sato's shiba, Pochi. She waits tied at her gate (the house with the carport). Take the leash
// (and the poop bags), walk her to the west tunnel and back. On the way she stops to sniff poles and weeds (wait, or
// click to tug her along), loses her mind at Kuro the black shiba across the lane (hold click to rein her in: she
// drags you towards him), and does her business: scoop it with a poop bag and bin it. Then tie her back at her gate.
// Pochi is voxel art with a small rig (head, tail, four legs); the leash is a little verlet rope of blocks.
import * as THREE from 'three';
import { VoxelModel } from '../../voxel/VoxelModel.js';
import { meshVoxels } from '../../voxel/mesher.js';
import { voxelMaterials } from '../../voxel/materials.js';
import { propMesh } from '../../world/props.js';
import { audio } from '../../core/audio.js';
import { ease } from '../../core/util.js';

const VS = 0.016;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GATE = V(8.78, 0, 5.78);
const TURN = V(-21.5, 0, 9.4); // the walk's far end, by the west tunnel
const KURO = V(-18.6, 0, 14.25);
const SNIFF = [[-6.3, 14.0], [2.6, 14.0], [10.0, 14.0], [-12.0, 6.0], [-24.0, 6.4], [5.4, 5.6], [-16.3, 13.9]];
const LEASH = 2.3, NSEG = 12;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 0, 1);

// ------------------------------------------------------------------ the shiba model (parts with their own pivots)
const PAL = {
  pochi: { fur: 0xe08a3a, furD: 0xc06a2a, cream: 0xfff1df, nose: 0x1e1a1a, collar: 0xd8282a },
  kuro: { fur: 0x2a2626, furD: 0x1a1818, cream: 0xe8c89a, nose: 0x101010, collar: 0x2f6fd6 },
};
const geoCache = {};
function dogGeos(kind) {
  if (geoCache[kind]) return geoCache[kind];
  const P = PAL[kind];
  const h = (x, y, z) => ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & 7;
  const fur = (x, y, z) => (h(x, y, z) === 0 ? P.furD : P.fur);
  const mk = (build, pivot) => { const v = new VoxelModel(); v.jitter = 0.03; build(v); v.pivot = pivot; return meshVoxels(v, { voxelSize: VS }); };
  const G = {
    // torso: orange back, cream chest and belly, the collar at the front
    body: mk((v) => {
      v.shape(-7, 14, -14, 7, 27, 14, (x, y, z) => ((x / 7.4) ** 2 + ((y - 20.5) / 7) ** 2 <= 1 + (Math.abs(z) > 11 ? -0.25 : 0)), (x, y, z) => (y < 18 || (z > 8 && y < 23 && Math.abs(x) < 5) ? P.cream : fur(x, y, z)));
      v.shape(-5, 20, 10, 5, 30, 16, (x, y, z) => (x / 5.4) ** 2 + ((y - 25) / 5.5) ** 2 <= 1, (x, y, z) => (z > 13 && y < 26 ? P.cream : fur(x, y, z))); // neck
      v.torus(0, 26, 13, 4.6, 0.8, P.collar, 'y');
      v.set(0, 23, 17, 0xf2d23a); // the tag
    }, { x: 0, y: 0, z: 0 }),
    head: mk((v) => {
      v.shape(-6, -2, -4, 6, 9, 7, (x, y, z) => (x / 6.4) ** 2 + ((y - 3.5) / 6) ** 2 + ((z - 1.5) / 6.4) ** 2 <= 1, (x, y, z) => (y < 2 && z > 1 ? P.cream : (Math.abs(x) >= 3 && y < 4 && z > 2 ? P.cream : fur(x, y, z))));
      v.box(-3, -1, 6, 3, 3, 11, (x, y, z) => (y > 2 && z < 9 ? P.fur : P.cream)); // snout
      v.box(-1, 2, 11, 1, 3, 12, P.nose);
      v.box(-1, -1, 10, 1, -1, 11, 0x5a2a2a); // mouth
      for (const s of [-1, 1]) {
        v.box(s * 3, 5, 6, s * 3, 6, 6, 0x1a1414); // eyes
        v.set(s * 3, 6, 6, 0x1a1414);
        v.set(s * 4, 8, 4, P.cream); // eyebrow dots (shibas have them)
        for (let i = 0; i < 5; i++) v.box(s * (2 + (i >> 1)), 8 + i, 0, s * (6 - (i >> 1) - (i === 4 ? 1 : 0)), 8 + i, 2, i > 2 ? P.furD : P.fur); // ears
        v.box(s * 4, 9, 2, s * 4, 11, 2, 0xf0b0a0);
      }
    }, { x: 0, y: 0, z: 0 }),
    tail: mk((v) => {
      v.torus(0, 5, 0, 3.6, 1.6, (x, y, z) => (y < 4 ? P.cream : P.fur), 'z');
      v.shape(-2, 0, -2, 2, 2, 2, () => true, P.fur);
    }, { x: 0, y: 0, z: 0 }),
    leg: mk((v) => {
      v.box(-1, -13, -1, 1, 0, 1, (x, y, z) => (y < -10 ? P.cream : fur(x, y, z)));
      v.box(-1, -14, -1, 1, -14, 2, P.cream);
    }, { x: 0, y: 0, z: 0 }),
  };
  geoCache[kind] = G;
  return G;
}

/** A shiba with a little rig: walk cycle, tail wag, sniffing, sitting, squatting, barking. */
export class Shiba {
  constructor(game, kind = 'pochi') {
    this.game = game;
    const G = dogGeos(kind), mats = voxelMaterials('normal');
    const mesh = (geo) => { const m = new THREE.Mesh(geo, mats); m.castShadow = true; return m; };
    this.root = new THREE.Group();
    this.hips = new THREE.Group(); // body pitch / height
    this.root.add(this.hips);
    this.body = mesh(G.body);
    this.hips.add(this.body);
    this.headP = new THREE.Group(); this.headP.position.set(0, 27 * VS, 14 * VS); this.hips.add(this.headP);
    this.headP.add(mesh(G.head));
    this.tailP = new THREE.Group(); this.tailP.position.set(0, 25 * VS, -13 * VS); this.tailP.rotation.x = -0.35; this.hips.add(this.tailP);
    this.tailP.add(mesh(G.tail));
    this.legs = [];
    for (const [x, z, hind] of [[-4, 9, 0], [4, 9, 0], [-4, -9, 1], [4, -9, 1]]) {
      const p = new THREE.Group(); p.position.set(x * VS, 15 * VS, z * VS);
      p.add(mesh(G.leg));
      this.hips.add(p);
      this.legs.push({ p, hind });
    }
    this.pos = this.root.position;
    this.heading = 0;
    this.phase = 0;
    this.speed = 0;
    this.pose = 'stand'; // stand | sit | sniff | squat | bark
    this.wag = 0.5;
    this.t = Math.random() * 10;
    this.barkT = 0;
    game.scene.add(this.root);
  }

  /** World position of the collar (where the leash clips on). */
  collar(out = new THREE.Vector3()) { return this.headP.localToWorld(out.set(0, -1.5 * VS, -1.5 * VS)); }
  nose(out = new THREE.Vector3()) { return this.headP.localToWorld(out.set(0, 2.5 * VS, 12 * VS)); }

  bark(pitch = 1) {
    this.barkT = 0.35;
    audio.play('bark', { pos: this.nose(_v), vol: 0.9, pitch });
    this.game.effects.mark({ pos: this.nose(_v2).add(V(0, 0.12, 0)), sprite: 'bang', size: 0.05, life: 0.6 });
  }

  update(dt) {
    this.t += dt;
    const sp = this.speed, k = Math.min(1, sp / 1.6);
    this.phase += dt * (3 + sp * 7);
    this.root.rotation.y = this.heading;
    const pose = this.pose;
    // legs: a trot when moving; folded when sitting or squatting
    for (const [i, L] of this.legs.entries()) {
      const off = i === 0 || i === 3 ? 0 : Math.PI;
      let a = Math.sin(this.phase + off) * 0.55 * k;
      if (pose === 'sit' && L.hind) a = -1.25;
      if (pose === 'squat' && L.hind) a = -0.9;
      if (pose === 'sit' && !L.hind) a = 0.15;
      L.p.rotation.x += (a - L.p.rotation.x) * Math.min(1, dt * 14);
    }
    const sit = pose === 'sit' ? 1 : pose === 'squat' ? 0.7 : 0;
    this.hips.rotation.x += (-sit * 0.38 - this.hips.rotation.x) * Math.min(1, dt * 8);
    this.hips.position.y = -sit * 0.05 + Math.abs(Math.sin(this.phase)) * 0.012 * k;
    // the head: nose to the ground when sniffing, up and jerking when barking, looking about when idle
    this.barkT = Math.max(0, this.barkT - dt);
    const hx = pose === 'sniff' ? 0.75 + Math.sin(this.t * 9) * 0.06 : this.barkT > 0 ? -0.35 : sp > 0.2 ? 0.08 : Math.sin(this.t * 0.7) * 0.1;
    const hy = pose === 'sniff' ? Math.sin(this.t * 1.7) * 0.35 : sp > 0.2 ? 0 : Math.sin(this.t * 0.45) * 0.5;
    this.headP.rotation.x += (hx - this.headP.rotation.x) * Math.min(1, dt * 10);
    this.headP.rotation.y += (hy - this.headP.rotation.y) * Math.min(1, dt * 4);
    // tail: wags when happy, straight up when squatting
    this.tailP.rotation.z = Math.sin(this.t * (8 + this.wag * 10)) * 0.35 * this.wag;
    this.tailP.rotation.x += ((pose === 'squat' ? -1.0 : -0.35) - this.tailP.rotation.x) * Math.min(1, dt * 6);
  }

  dispose() { this.root.parent?.remove(this.root); }
}

// ------------------------------------------------------------------ the leash (verlet points drawn as blocks)
class Leash {
  constructor(game) {
    this.game = game;
    this.p = Array.from({ length: NSEG + 1 }, () => ({ x: 0, y: 0, z: 0, ox: 0, oy: 0, oz: 0 }));
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.014, 1), new THREE.MeshStandardMaterial({ color: 0xd8282a, roughness: 0.6 }), NSEG);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    game.scene.add(this.mesh);
    this.init = false;
  }

  update(dt, a, b) {
    const P = this.p, n = P.length, seg = LEASH / NSEG;
    if (!this.init) { this.init = true; for (let i = 0; i < n; i++) { const t = i / (n - 1); const q = P[i]; q.x = q.ox = a.x + (b.x - a.x) * t; q.y = q.oy = a.y + (b.y - a.y) * t; q.z = q.oz = a.z + (b.z - a.z) * t; } }
    const g = 9.8 * dt * dt;
    for (let i = 1; i < n - 1; i++) {
      const q = P[i], vx = (q.x - q.ox) * 0.96, vy = (q.y - q.oy) * 0.96, vz = (q.z - q.oz) * 0.96;
      q.ox = q.x; q.oy = q.y; q.oz = q.z;
      q.x += vx; q.y += vy - g; q.z += vz;
    }
    for (let it = 0; it < 6; it++) {
      P[0].x = a.x; P[0].y = a.y; P[0].z = a.z;
      P[n - 1].x = b.x; P[n - 1].y = b.y; P[n - 1].z = b.z;
      for (let i = 0; i < n - 1; i++) {
        const q = P[i], r = P[i + 1];
        const dx = r.x - q.x, dy = r.y - q.y, dz = r.z - q.z, d = Math.hypot(dx, dy, dz) || 1e-6;
        if (d <= seg) continue;
        const c = (d - seg) / d * 0.5;
        const wq = i === 0 ? 0 : 1, wr = i + 1 === n - 1 ? 0 : 1, s = wq + wr || 1;
        q.x += dx * c * 2 * wq / s; q.y += dy * c * 2 * wq / s; q.z += dz * c * 2 * wq / s;
        r.x -= dx * c * 2 * wr / s; r.y -= dy * c * 2 * wr / s; r.z -= dz * c * 2 * wr / s;
      }
      for (let i = 1; i < n - 1; i++) if (P[i].y < 0.012) P[i].y = 0.012;
    }
    for (let i = 0; i < NSEG; i++) {
      const q = P[i], r = P[i + 1];
      _v.set(q.x, q.y, q.z); _v2.set(r.x - q.x, r.y - q.y, r.z - q.z);
      const len = _v2.length() || 1e-4;
      _q.setFromUnitVectors(_up, _v2.multiplyScalar(1 / len));
      _m.compose(_v.set((q.x + r.x) / 2, (q.y + r.y) / 2, (q.z + r.z) / 2), _q, _s.set(1, 1, len));
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() { this.mesh.parent?.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

// ------------------------------------------------------------------ the job
export class DogWalk {
  constructor(game, jobs, def) {
    this.game = game;
    this.jobs = jobs;
    this.def = def;
    this.stage = 'pickup'; // pickup -> out -> poop -> back -> done
    this.sniffed = new Set();
    this.t = 0;
  }

  start() {
    const g = this.game;
    this.dog = new Shiba(g, 'pochi');
    this.dog.pos.copy(GATE);
    this.dog.heading = 0; // facing the lane
    this.dog.pose = 'sit';
    this.kuro = new Shiba(g, 'kuro');
    this.kuro.pos.copy(KURO);
    this.kuro.heading = Math.PI;
    this.kuro.pose = 'sit';
    this.kuro.wag = 0.2;
    // clicking Pochi: take her leash / tie her back up
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.set(0, 0.25, 0);
    this.dog.root.add(this.hit);
    g.interaction.add(this.hit, {
      reach: 2.4,
      hint: () => this.dogHint(),
      use: () => { if (this.stage === 'pull') return undefined; this.useDog(); return false; },
      hold: { canStart: () => this.stage === 'pull' && g.held.holding('leash'), start: () => { this.rein = 0; }, update: (dt) => { this.rein += dt; }, done: () => this.rein > 1.2 },
    });
    this.leash = null;
  }

  dogHint() {
    const g = this.game;
    if (this.stage === 'pickup') return g.held.slots.filter((s) => !s).length >= 2 ? { key: 'LMB', text: "Take Pochi's leash", sub: 'She wags the whole back half of herself' } : { key: '', text: 'Pochi', sub: 'Free up two hands (slots) for the leash and the bags' };
    if (this.stage === 'pull') return { key: 'Hold LMB', text: 'Rein her in', sub: g.held.holding('leash') ? 'Hold on!' : 'Hold the leash first' };
    if (this.stage === 'back' && this.dog.pos.distanceTo(GATE) < 1.6) return g.held.has('poop_bag_full') ? { key: '', text: 'Bin the poop bag first', sub: 'Mrs. Sato will check' } : { key: 'LMB', text: 'Tie Pochi back up at her gate', sub: 'Walk done!' };
    if (this.dog.pose === 'sniff') return { key: 'LMB', text: 'Tug the leash', sub: 'She is reading the neighbourhood news' };
    return { key: 'LMB', text: 'Pet Pochi', sub: 'Good girl' };
  }

  useDog() {
    const g = this.game, d = this.dog;
    if (this.stage === 'pickup') {
      if (g.held.slots.filter((s) => !s).length < 2) return;
      g.held.giveTool('poop_bags', { job: 'dog' });
      g.held.giveTool('leash', { job: 'dog' });
      this.leash = new Leash(g);
      this.stage = 'out';
      d.pose = 'stand'; d.wag = 1;
      d.bark(1.1);
      return;
    }
    if (this.stage === 'back' && d.pos.distanceTo(GATE) < 1.6) { if (!g.held.has('poop_bag_full')) this.finish(); return; }
    if (d.pose === 'sniff') { this.tug(); return; }
    // a pat on the head
    d.wag = 1;
    g.effects.hearts({ pos: d.nose(_v).add(V(0, 0.15, 0)), count: 2, size: 0.035 });
    audio.play('whine', { pos: d.pos, vol: 0.6 });
  }

  tug() {
    const d = this.dog;
    d.pose = 'stand';
    this.sniffT = 0;
    d.speed = 1.2;
    audio.play('whine', { pos: d.pos, vol: 0.6 });
  }

  /** Where the leash starts: the handle in your hand (or at your hip if it's pocketed). */
  hand(out) {
    const g = this.game, H = g.held;
    const it = H.slots.find((s) => s?.kind === 'tool' && s.data.id === 'leash');
    if (it && it.obj.visible && it === H.item) return it.obj.getWorldPosition(out).add(_v2.set(0, -0.02, 0));
    const p = g.player;
    return out.set(p.pos.x + Math.cos(p.yaw) * 0.22, 0.9, p.pos.z - Math.sin(p.yaw) * 0.22);
  }

  hasLeash() { return this.game.held.has('leash'); }

  goal() {
    const g = this.game, d = this.dog;
    const at = (v, y = 0.6) => () => v.clone().setY(y);
    if (this.stage === 'pickup') return { id: 'dog:pickup', icon: 'dog', text: "Pick up Pochi at Mrs. Sato's gate", sub: 'The house with the carport, right of the shop', at: () => d.pos.clone().setY(0.7) };
    if (this.stage === 'pull') return { id: 'dog:pull', icon: 'leash', text: 'Rein Pochi in!', sub: `Hold ${g.held.holding('leash') ? 'click on her' : 'the leash, then hold click on her'} - she wants Kuro`, at: () => d.pos.clone().setY(0.7) };
    if (this.stage === 'poop' && this.poop) return { id: 'dog:poop', icon: 'poop_bag', text: 'Scoop the poop', sub: g.held.holding('poop_bags') ? 'Click it' : `Hold the poop bags${this.pick('poop_bags')}`, at: () => this.poop.position.clone().setY(0.25) };
    if (this.stage === 'back' && g.held.has('poop_bag_full')) return { id: 'dog:bin', icon: 'poop_bag', text: 'Walk Pochi home, bin the bag on the way', sub: 'The garbage station is on your way', at: () => V(-6.6, 1.2, 5.8) };
    if (d.pose === 'sniff') return { id: 'dog:sniff', icon: 'dog', text: 'Pochi is sniffing...', sub: 'Wait for her, or click her to tug the leash', at: () => d.pos.clone().setY(0.7) };
    if (this.stage === 'out') return { id: 'dog:out', icon: 'dog', text: 'Walk Pochi to the west tunnel', sub: 'She sets the pace', at: at(TURN, 1) };
    return { id: 'dog:back', icon: 'dog', text: 'Walk Pochi home', sub: 'Tie her up at the Sato gate', at: at(GATE, 0.7) };
  }

  pick(id) { const i = this.game.held.find(id); return i < 0 ? '' : ` (press ${i + 1})`; }

  toolHint(it) {
    const id = it.data.id;
    if (id === 'leash') return { key: '', text: "Pochi's leash", sub: this.stage === 'pull' ? 'Hold click on her to rein her in' : 'Walk; she follows (mostly)' };
    if (id === 'poop_bags') return { key: '', text: 'Poop bags', sub: this.poop ? 'Click the mess to scoop it' : 'Just in case' };
    return null;
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game, d = this.dog, P = g.player;
    this.t += dt;
    d.update(dt);
    this.kuro.update(dt);
    if (this.stage === 'pickup' || !this.leash) { d.wag = 0.7; return; }
    // lost the leash (dropped it)? She waits where she is
    const held = this.hasLeash();
    const hand = this.hand(_v);
    const collar = d.collar(new THREE.Vector3());
    const pp = P.pos;
    const toP = _v2.set(pp.x - d.pos.x, 0, pp.z - d.pos.z), dist = toP.length();
    let want = null, speed = 0;
    // Kuro across the lane: Pochi spots him
    const kd = d.pos.distanceTo(KURO);
    if (!this.metKuro && kd < 7 && this.stage === 'out') {
      this.metKuro = true; this.stage = 'pull'; this.rein = 0;
      d.bark(1.2); this.kuro.pose = 'stand'; this.kuro.wag = 1; g.tweens.wait(0.4, () => this.kuro.bark(0.8));
      g.news('Pochi has seen Kuro!', 'Hold click on her to rein her in', 4000);
    }
    if (this.stage === 'pull') {
      // straining towards Kuro, barking; dragging you along
      want = KURO; speed = 1.7;
      if (Math.random() < dt * 1.6) d.bark(1.15 + Math.random() * 0.1);
      if (Math.random() < dt * 0.9) this.kuro.bark(0.8);
      if (held && dist > LEASH - 0.1) { const pull = _v.set(d.pos.x - pp.x, 0, d.pos.z - pp.z).normalize(); pp.x += pull.x * 0.9 * dt; pp.z += pull.z * 0.9 * dt; P.collide(); }
      if (this.rein > 1.2) {
        this.stage = 'out'; this.rein = 0;
        this.kuro.pose = 'sit'; this.kuro.wag = 0.2; d.wag = 0.6;
        audio.play('whine', { pos: d.pos, vol: 0.7 });
        g.news('Good girl', 'Pochi calms down', 2500);
      }
    } else if (d.pose === 'sniff') {
      this.sniffT -= dt;
      if (Math.random() < dt * 1.5) audio.play('sniff', { pos: d.nose(_v), vol: 0.5 });
      if (this.sniffT <= 0) d.pose = 'stand';
    } else if (d.pose === 'squat') {
      this.squatT -= dt;
      if (this.squatT <= 0) { d.pose = 'stand'; this.dropPoop(); }
    } else {
      // following you, a little to the side, and wandering off to sniff things on the way
      const spot = SNIFF.find(([x, z], i) => !this.sniffed.has(i) && Math.hypot(d.pos.x - x, d.pos.z - z) < 2.2);
      if (spot) {
        const i = SNIFF.indexOf(spot);
        want = V(spot[0], 0, spot[1]); speed = 1.6;
        if (Math.hypot(d.pos.x - spot[0], d.pos.z - spot[1]) < 0.55) { this.sniffed.add(i); d.pose = 'sniff'; this.sniffT = 2.4 + Math.random(); }
      } else if (dist > 0.9) {
        want = _v.set(pp.x, 0, pp.z).addScaledVector(toP.normalize(), -0.7); speed = Math.min(3.2, 0.6 + (dist - 0.9) * 1.8);
      }
      // business, out by the tunnel
      if (this.stage === 'out' && !this.pooped && d.pos.x < -18 && d.pose === 'stand') { this.pooped = true; d.pose = 'squat'; this.squatT = 2.4; audio.play('whine', { pos: d.pos, vol: 0.4 }); }
    }
    // move (when posed for sniffing / squatting she stays put; the leash holds her within reach of you)
    if (want && d.pose !== 'sniff' && d.pose !== 'squat') {
      const dx = want.x - d.pos.x, dz = want.z - d.pos.z, dd = Math.hypot(dx, dz);
      if (dd > 0.05) {
        const st = Math.min(dd, speed * dt);
        d.pos.x += dx / dd * st; d.pos.z += dz / dd * st;
        const h = Math.atan2(dx, dz);
        d.heading += Math.atan2(Math.sin(h - d.heading), Math.cos(h - d.heading)) * Math.min(1, dt * 8);
        d.speed = st / Math.max(dt, 1e-4);
      } else d.speed = 0;
    } else d.speed = 0;
    // the leash: she can't get further than its length from your hand (unless you let go of it)
    if (held) {
      const dd = Math.hypot(d.pos.x - pp.x, d.pos.z - pp.z);
      if (dd > LEASH) {
        if (d.pose === 'sniff' || d.pose === 'squat' || this.stage === 'pull') {
          // you're the one held back
          const k = (dd - LEASH) / dd;
          pp.x -= (pp.x - d.pos.x) * k; pp.z -= (pp.z - d.pos.z) * k;
          P.vel.multiplyScalar(0.5);
        } else {
          const k = (dd - LEASH) / dd;
          d.pos.x += (pp.x - d.pos.x) * k; d.pos.z += (pp.z - d.pos.z) * k;
        }
      }
    }
    this.collide(d.pos);
    d.wag = Math.max(0.3, d.wag - dt * 0.05);
    if (held) this.leash.update(dt, hand, collar);
    this.leash.mesh.visible = held;
  }

  /** Keep the dog out of walls (the player's collision boxes). */
  collide(p) {
    const r = 0.18;
    for (const o of this.game.player.obstacles) {
      if (!o.enabled) continue;
      const cx = Math.max(o.minX, Math.min(p.x, o.maxX)), cz = Math.max(o.minZ, Math.min(p.z, o.maxZ));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += dx / d * (r - d); p.z += dz / d * (r - d); }
    }
  }

  dropPoop() {
    const g = this.game, d = this.dog;
    const p = d.root.localToWorld(V(0, 0, -0.3));
    const m = propMesh('dog_poop', { fallbackSize: [0.08, 0.06, 0.08], fallbackColor: 0x6a4422 });
    m.position.set(p.x, 0.003, p.z);
    g.scene.add(m);
    this.poop = m;
    audio.play('plop', { pos: p, vol: 0.7 });
    g.effects.puff({ pos: p.clone().setY(0.1), count: 3, color: 0x8a9a6a, size: 0.03, speed: 0.1, up: 0.15 });
    this.stage = 'poop';
    g.interaction.add(m, {
      reach: 2.4,
      hint: () => (g.held.holding('poop_bags') ? { key: 'LMB', text: 'Scoop it up', sub: 'Hand in the bag, grab, turn it inside out' } : { key: '', text: "Pochi's business", sub: 'Hold the poop bags' }),
      use: () => {
        if (!g.held.holding('poop_bags')) return false;
        g.interaction.remove(m); m.parent?.remove(m);
        this.poop = null;
        g.held.consume();
        g.held.giveTool('poop_bag_full', { job: 'dog' });
        audio.play('bagRustle', { vol: 0.8 });
        this.stage = 'back';
        return false;
      },
    });
  }

  finish() {
    const g = this.game, d = this.dog;
    // the leash goes back on the gate
    for (let i = 0; i < g.held.slots.length; i++) { const s = g.held.slots[i]; if (s?.kind === 'tool' && ['leash', 'poop_bags', 'poop_bag_full'].includes(s.data.id)) g.held.consume(i); }
    this.leash?.dispose(); this.leash = null;
    this.stage = 'done';
    d.pos.copy(GATE); d.heading = 0; d.pose = 'sit'; d.wag = 1;
    d.bark(1.2);
    g.effects.hearts({ pos: d.nose(_v).add(V(0, 0.2, 0)), count: 3 });
    audio.play('page', { vol: 0.7 });
    this.jobs.finish(this.def.pay, V(8.95, 1.0, 5.4));
  }

  dispose() {
    const g = this.game;
    this.leash?.dispose();
    if (this.poop) { g.interaction.remove(this.poop); this.poop.parent?.remove(this.poop); }
    g.interaction.remove(this.hit);
    for (let i = 0; i < g.held.slots.length; i++) { const s = g.held.slots[i]; if (s?.kind === 'tool' && ['leash', 'poop_bags'].includes(s.data.id) && s.data.job === 'dog') g.held.consume(i); }
    // Pochi stays home (a while), Kuro goes back to his porch
    const dog = this.dog, kuro = this.kuro;
    g.tweens.wait(this.stage === 'done' ? 20 : 0.1, () => { dog.dispose(); kuro.dispose(); });
    this.stage = 'done';
  }
}
