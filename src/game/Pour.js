// Milk: pouring from the carton (hold LMB with the milk in hand), the cat bowl's milk level and spilt milk.
// The carton tips further the longer you hold (an emptier carton needs more tilt before it flows); milk leaves the
// spout (whichever top corner is lowest) with the carton's own swing plus a push along its tilt, and falls as pixel-art
// drops (src/gfx/pixfx.js) under gravity: into the bowl (the level rises; it plips), off the rim or onto the floor
// (splashes, and puddles that spread, slowly dry, and that Mikan laps up). Saved: the bowl level (state.milk) and what
// is left in the carton (its item data: ml). The first time the bowl holds enough, the feeding scene plays.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ensureState } from './stateExt.js';
import './sfx.js';

export const CARTON = 1.0; // litres in a fresh carton
export const BOWL_CAP = 0.25; // litres the bowl holds
const FLOW = 0.14; // litres / s at full tilt
const FED_AT = 0.1; // litres in the bowl that count as feeding her
// the bowl (cat_bowl prop, metres, from its base): inner floor, rim height, inner radius at a height, outer radius
const B_FLOOR = 0.012, B_TOP = 0.051, B_OUT = 0.068;
const bowlIn = (y) => (12 + (Math.max(0, Math.min(17, y / 0.003))) * 7 / 17) * 0.003;
const MILK = 0xfdfaf0;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _e = new THREE.Euler();
const Zaxis = new THREE.Vector3(0, 0, 1), _at = new THREE.Vector3(), _aim = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();

/** A milky puddle in pixels (32 x 32, a few merged blobs, a wet highlight). */
function puddleTexture() {
  const N = 32, d = new Uint8Array(N * N * 4);
  const blobs = [[16, 16, 11], [10, 12, 6], [22, 20, 7], [19, 9, 5], [9, 21, 4.5]];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let inside = 0;
    for (const [cx, cy, r] of blobs) inside = Math.max(inside, 1 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r);
    const o = (y * N + x) * 4;
    if (inside <= 0) continue;
    const rim = inside < 0.14, hi = (x - y > 4 && x - y < 7 && inside > 0.3 && inside < 0.6);
    const c = hi ? [255, 255, 255] : rim ? [228, 222, 206] : [250, 246, 234];
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  const t = new THREE.DataTexture(d, N, N);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  return t;
}

export class Pour {
  constructor(game) {
    this.game = game;
    const fed = !!game.state.story?.fed;
    this.s = ensureState(game, 'milk', { bowl: fed ? BOWL_CAP * 0.7 : 0 });
    this.tilt = 0;
    this.flow = 0;
    this.emitAcc = 0; this.pending = 0;
    this.bowl = null;
    this.spout = new THREE.Vector3(); this.lastSpout = new THREE.Vector3(); this.spoutVel = new THREE.Vector3(); this.hasSpout = false;
    this.drip = 0; this.sfx = { plip: 0, splat: 0, pour: 0 };
    this.puddles = [];
    const MAXP = 16;
    this.pmesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({
      map: puddleTexture(), alphaTest: 0.5, roughness: 0.12, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }), MAXP);
    this.pmesh.count = 0; this.pmesh.frustumCulled = false; this.pmesh.receiveShadow = true; this.pmesh.name = 'milk-puddles';
    this.pmesh.raycast = () => {};
    this.pmax = MAXP;
    game.scene.add(this.pmesh);
  }

  get bowlLevel() { return this.s.bowl / BOWL_CAP; }

  /** Story's bowl prop (base at its position): gets a milk surface that rises and falls with the level. */
  attachBowl(bowl) {
    this.bowl = bowl;
    const geo = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2);
    this.surface = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: MILK, roughness: 0.18, metalness: 0 }));
    this.surface.raycast = () => {};
    this.surface.receiveShadow = true;
    bowl.add(this.surface);
    this.setLevel(this.s.bowl);
  }

  setLevel(ml) {
    this.s.bowl = clamp(ml, 0, BOWL_CAP);
    if (!this.surface) return;
    const k = this.s.bowl / BOWL_CAP;
    this.surface.visible = k > 0.01;
    const y = B_FLOOR + 0.001 + k * (B_TOP - 0.005 - B_FLOOR);
    this.surface.position.y = y;
    this.surface.scale.setScalar(bowlIn(y) - 0.0015);
  }

  /** The cat drinking: litres per second out of the bowl. Returns false when it's empty. */
  drink(rate, dt) { if (this.s.bowl <= 0) return false; this.setLevel(this.s.bowl - rate * dt); return this.s.bowl > 0; }

  // ------------------------------------------------------------------ holding the carton (called from Held.update)
  /** Whether a press of LMB pours here (aiming at nothing, or at the bowl, or at something with no action). */
  canPour() {
    const hv = this.game.interaction.hover;
    return !hv || hv.obj === this.bowl || !hv.hint?.key;
  }

  hint(it) {
    const ml = it.data.ml ?? CARTON;
    if (ml <= 0.001) return { key: 'Q', text: 'Empty milk carton', sub: 'Put it down' };
    return { key: 'Hold LMB', text: 'Pour milk', sub: `${Math.round(ml / CARTON * 100)}% left · for the cat bowl by the heater` };
  }

  /** Tip the carton while LMB is held: base pose -> lifted a touch and rolled towards the middle of the view. */
  poseCarton(it, P, dt) {
    const g = this.game, inp = g.input, held = g.held;
    const ml = it.data.ml ?? CARTON;
    const want = inp.locked && inp.button(0) && !g.uiOpen && !g.pc?.active && !g.cutscene.active && !held.reading && !held.busy && this.canPour() && ml > 0.001;
    this.tilt = clamp(this.tilt + (want ? dt * (this.tilt < 0.45 ? 1.8 : 0.55) : -dt * 2.4), 0, 1);
    this.it = it;
    if (held.trans) return;
    if (this.tilt <= 0) { if (this.posed) { this.posed = false; it.obj.position.copy(P.pos); it.obj.quaternion.setFromEuler(_e.copy(P.rot)); } return; }
    this.posed = true;
    const o = it.obj, k = smooth(Math.min(1, this.tilt * 2.2)), roll = this.tilt * 2.0;
    o.position.set(P.pos.x - 0.045 * k, P.pos.y + 0.05 * k + Math.sin(g.time * 11) * 0.0012 * this.flow / FLOW, P.pos.z - 0.03 * k);
    o.quaternion.setFromEuler(_e.copy(P.rot)).premultiply(_q.setFromAxisAngle(Zaxis, roll));
  }

  // ------------------------------------------------------------------ per frame: the stream, drops, puddles
  update(dt) {
    const g = this.game, held = g.held, it = held.item;
    const milk = it?.kind === 'tool' && it.data.id === 'milk' && it.obj.visible && it === this.it;
    if (!milk) { this.tilt = 0; this.flow = 0; this.hasSpout = false; }
    if (milk && this.tilt > 0) this.stream(it, dt);
    else if (this.flow > 0) { this.flow = 0; this.drip = 0.7; }
    // a few last drips off the spout
    if (this.drip > 0 && this.hasSpout) {
      this.drip -= dt;
      if (Math.random() < dt * 5) this.drop(this.spout, _v.set(0, -0.1, 0), 0.0004);
    }
    this.updatePuddles(dt);
    // enough in the bowl, the carton tipped back up: she comes to eat (the first time)
    const st = g.state.story;
    if (st && !st.fed && !this.feeding && this.s.bowl >= FED_AT && this.tilt < 0.2 && !g.cutscene.active && g.story?.feedScene) {
      this.feeding = true;
      g.cutscene.play((c) => g.story.feedScene(c)).then?.(() => { this.feeding = false; });
    }
    for (const k in this.sfx) this.sfx[k] = Math.max(0, this.sfx[k] - dt);
  }

  /** Where the milk leaves the carton: the lowest corner of its top. */
  findSpout(o, out) {
    let box = o.userData.pourBox;
    if (!box) { o.updateWorldMatrix(true, true); box = o.userData.pourBox = new THREE.Box3(); const inv = _m.copy(o.matrixWorld).invert(); o.traverse((m) => { if (m.isMesh) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))); } }); }
    o.updateWorldMatrix(true, false);
    let best = Infinity;
    for (const [u, w] of [[0.08, 0.5], [0.92, 0.5], [0.5, 0.08], [0.5, 0.92], [0.15, 0.15], [0.85, 0.85], [0.15, 0.85], [0.85, 0.15]]) {
      _v2.set(box.min.x + (box.max.x - box.min.x) * u, box.max.y - (box.max.y - box.min.y) * 0.04, box.min.z + (box.max.z - box.min.z) * w).applyMatrix4(o.matrixWorld);
      if (_v2.y < best) { best = _v2.y; out.copy(_v2); }
    }
    return out;
  }

  stream(it, dt) {
    const o = it.obj, ml = it.data.ml ?? CARTON;
    this.findSpout(o, this.spout);
    if (this.hasSpout) this.spoutVel.subVectors(this.spout, this.lastSpout).divideScalar(Math.max(dt, 1e-3)).clampLength(0, 3);
    this.lastSpout.copy(this.spout); this.hasSpout = true;
    // flow: none until it's tipped far enough (further when it's emptier)
    const th = 0.36 + 0.36 * (1 - ml / CARTON);
    const f = smooth((this.tilt - th) / 0.22);
    this.flow = ml > 0 ? FLOW * f : 0;
    if (this.flow <= 0) return;
    const out = Math.min(ml, this.flow * dt);
    it.data.ml = Math.max(0, ml - out);
    if (it.data.ml <= 0.001) { this.empty(it); return; }
    if (this.sfx.pour <= 0) { this.sfx.pour = 2.2; audio.play('milk', { pos: this.spout, vol: 0.8 }); }
    // the milk leaves along the carton's tilted top with its swing, steered (most of the way) to land where you aim
    o.updateWorldMatrix(true, false);
    const up = _v2.set(0, 1, 0).transformDirection(o.matrixWorld);
    const aim = this.aimPoint(_aim);
    this.pending += out;
    this.emitAcc += 140 * f * dt;
    const n = Math.floor(this.emitAcc);
    if (!n) return;
    this.emitAcc -= n;
    const each = this.pending / n;
    this.pending = 0;
    for (let i = 0; i < n; i++) {
      const v = _v.copy(up).multiplyScalar(0.35 + 0.45 * f).addScaledVector(this.spoutVel, 0.8);
      if (aim) {
        const h = this.spout.y - aim.y, T = (v.y + Math.sqrt(Math.max(0, v.y * v.y + 19.62 * Math.max(0.02, h)))) / 9.81;
        const ax = (aim.x - this.spout.x) / T, az = (aim.z - this.spout.z) / T, L = Math.hypot(ax, az), cap = L > 1.4 ? 1.4 / L : 1;
        // onto the bowl: all the way (a little of the carton's swing still bends it); onto the floor: most of the way
        const k = this.locked ? 1 : 0.75, sw = this.locked ? 0.25 : 0.5;
        v.x += (ax * cap + this.spoutVel.x * sw - v.x) * k; v.z += (az * cap + this.spoutVel.z * sw - v.z) * k;
      }
      const j = this.locked ? 0.02 : 0.04;
      v.x += (Math.random() - 0.5) * j; v.z += (Math.random() - 0.5) * j;
      this.drop(_at.copy(this.spout).addScaledVector(v, (i / n) * dt * 0.5), v, each);
    }
  }

  /** Where you're aiming the stream: the bowl you look at, else the floor under the crosshair (null: not at the floor). */
  aimPoint(out) {
    const g = this.game, hv = g.interaction.hover, cam = g.camera;
    this.locked = false;
    cam.getWorldPosition(_v3); cam.getWorldDirection(_v4);
    // the bowl locks the stream onto its middle when you look at it or anywhere near it
    if (this.bowl) {
      this.bowl.getWorldPosition(out);
      const by = out.y + B_TOP;
      const t = _v4.y < -0.05 ? (_v3.y - by) / -_v4.y : -1;
      const nearRay = t > 0 && t < 3 && Math.hypot(_v3.x + _v4.x * t - out.x, _v3.z + _v4.z * t - out.z) < 0.4;
      if ((hv && hv.obj === this.bowl) || nearRay) { out.y += B_FLOOR + 0.01; this.locked = true; return out; }
    }
    if (_v4.y > -0.15) return null;
    const t = _v3.y / -_v4.y;
    if (t > 3) return null;
    out.copy(_v3).addScaledVector(_v4, t);
    out.y = g.groundAt(out.x, out.z, 0.3);
    return out;
  }

  /** The carton ran dry: put it away (the hands crumple it away). */
  empty(it) {
    this.tilt = 0; this.flow = 0; this.drip = 0.8;
    this.game.news('That was the last of the milk.');
    const i = this.game.held.slots.indexOf(it);
    setTimeout(() => { if (this.game.held.slots[i] === it) this.game.held.consume(i); }, 350);
  }

  /** One drop of milk (pixel sprite) carrying `ml` litres, falling until it lands. */
  drop(pos, vel, ml) {
    const p = this.game.effects.fx.emit({ sprite: 'drop', pos, vel, life: 2, size: 0.012, color: MILK, anim: 'hold', frame: 0, fade: 0, update: this.dropStep });
    if (p) p.ml = ml;
  }

  /** (one shared function for every drop: no per-drop closures) */
  dropStep = (p, dt) => {
    p.vy -= 9.81 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.frame = p.vy < -0.9 ? 1 : 0; // stretched when it falls fast
    if (this.collide(p)) p.age = p.life;
  };

  /** Did drop p hit the bowl, its rim or the floor? Handles it and returns true. */
  collide(p) {
    const g = this.game, b = this.bowl;
    if (b) {
      b.getWorldPosition(_v);
      const dx = p.x - _v.x, dz = p.z - _v.z, r = Math.hypot(dx, dz), y = p.y - _v.y;
      if (r < B_OUT && y < B_TOP + 0.003) {
        const surf = B_FLOOR + (this.s.bowl / BOWL_CAP) * (B_TOP - 0.005 - B_FLOOR);
        if (r < bowlIn(Math.max(y, B_FLOOR)) + 0.012) {
          if (y > surf + 0.002) return false; // still falling inside the bowl
          this.intoBowl(p.ml, p, surf + _v.y);
          return true;
        }
        // the rim / the outside: it splashes off onto the floor just outside
        this.spill(p.ml, _v.x + dx / (r || 1) * (B_OUT + 0.03), _v.z + dz / (r || 1) * (B_OUT + 0.03), p);
        return true;
      }
    }
    const gy = g.groundAt(p.x, p.z, p.y + 0.05);
    if (p.y > gy + 0.003) return false;
    this.spill(p.ml, p.x, p.z, p, gy);
    return true;
  }

  intoBowl(ml, p, surfY) {
    const before = this.s.bowl;
    this.setLevel(before + ml);
    if (before + ml > BOWL_CAP) {
      // full: it runs over the rim
      const a = Math.random() * Math.PI * 2, b = this.bowl.getWorldPosition(_v2);
      this.spill(before + ml - BOWL_CAP, b.x + Math.cos(a) * (B_OUT + 0.04), b.z + Math.sin(a) * (B_OUT + 0.04), null);
    }
    if (this.sfx.plip <= 0) {
      this.sfx.plip = 0.09;
      audio.play('plip', { pos: _v.set(p.x, surfY, p.z), vol: 0.9 });
      if (Math.random() < 0.5) this.game.effects.emit({ sprite: 'bead', x: p.x, y: surfY + 0.004, z: p.z, vx: (Math.random() - 0.5) * 0.3, vy: 0.5 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.3, gravity: 9.81, life: 0.18, size: 0.006, color: MILK, fade: 0.3 });
    }
  }

  /** Milk on the floor at x, z: a splash (now and then) and into a puddle. */
  spill(ml, x, z, p, gy = null) {
    const g = this.game;
    const y = gy ?? g.groundAt(x, z, 0.2);
    if (this.sfx.splat <= 0) {
      this.sfx.splat = 0.12;
      g.effects.splash({ pos: _v.set(x, y + 0.004, z), color: MILK, size: 0.05, count: 3, speed: 0.7 });
      audio.play('splat', { pos: _v, vol: 0.9, v: 0.8 });
    }
    // join the nearest puddle, or start one
    let best = null, bd = Infinity;
    for (const q of this.puddles) { const d = Math.hypot(q.x - x, q.z - z) - q.r; if (d < bd && Math.abs(q.y - y) < 0.05) { bd = d; best = q; } }
    if (best && bd < 0.05) { best.ml += ml; best.x += (x - best.x) * 0.06; best.z += (z - best.z) * 0.06; }
    else {
      if (this.puddles.length >= this.pmax) { const old = this.puddles.shift(); ml += old.ml * 0.2; }
      this.puddles.push({ x, y, z, ml, r: 0, rot: Math.random() * Math.PI * 2 });
    }
    void p;
  }

  updatePuddles(dt) {
    const P = this.puddles, M = this.pmesh;
    for (let i = P.length - 1; i >= 0; i--) {
      const q = P[i];
      q.ml -= dt * 0.00025; // drying
      if (q.ml <= 0.0015) { P.splice(i, 1); continue; }
      const want = clamp(0.62 * Math.sqrt(q.ml), 0.035, 0.32);
      q.r += (want - q.r) * Math.min(1, dt * 3); // spreading out
    }
    M.count = P.length;
    for (let i = 0; i < P.length; i++) {
      const q = P[i], s = q.r * 2;
      _m.compose(_v.set(q.x, q.y + 0.002, q.z), _q.setFromAxisAngle(_v2.set(0, 1, 0), q.rot), _v2.set(s, 1, s));
      M.setMatrixAt(i, _m);
    }
    if (P.length) M.instanceMatrix.needsUpdate = true;
  }

  /** The nearest puddle within `range` of p (for the cat), or null. */
  nearestPuddle(p, range = 4) {
    let best = null, bd = range;
    for (const q of this.puddles) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd && q.ml > 0.004 && q.y < 0.05) { bd = d; best = q; } } // (on the floor: she can't reach the table)
    return best;
  }

  /** The cat lapping puddle q: litres per second; false once it's gone. */
  lap(q, rate, dt) {
    q.ml -= rate * dt;
    if (q.ml > 0.0015) return true;
    const i = this.puddles.indexOf(q);
    if (i >= 0) this.puddles.splice(i, 1);
    return false;
  }
}
