// Keychain figures (art/blender/toys/GIMMICKS.md, "keychain"): a figure whose item (or series) says `keychain` comes
// on a modelled ball chain (the Blender kit art/blender/toys/_kit/keychain.py: bead, clasp, cup hook) clipped to the
// screw eye at its pt_chain point. The chain is a little verlet rope of beads (one instanced draw per chain):
//  - lying loose or standing on a shelf: the chain hangs from the screw eye and drapes onto the surface;
//  - in your hand: it dangles from the figure and swings with your hand;
//  - on a display slot (garage shelves, museum cases): a cup hook is screwed in under the board above and the figure
//    hangs from it on its chain, swinging when it is put there and settling (springy, with a little twist);
//  - on your bag: LMB with a keychain in hand clips it to your bag (up to 3, saved), where it hangs at your hip and
//    swings as you walk (you see it when you look down); aim at it with empty hands and LMB to take it off;
//  - world hooks: game.keychains.addHook(id, object3d, localPos) makes any hook (pegboard, key rack) hang one (saved).
import * as THREE from 'three';
import { audio, SOUNDS } from '../core/audio.js';
import { getItem, SERIES_BY_ID } from '../data/series/index.js';
import { loadFigure, figurePartMesh, figurePoint, figureReady, lowpixManifest } from '../figures/lowpix.js';
import { ensureState } from './stateExt.js';
import { makeItemMesh } from './collectibles.js';

const KIT = { key: '_kit/keychain' };
const PITCH = 0.0031; // m between bead centres (2.4 mm beads)
const GRAV = new THREE.Vector3(0, -9.8, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _m = new THREE.Matrix4(), _inv = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

Object.assign(SOUNDS, {
  /** A ball chain rattling (tiny bright ticks). */
  chainJingle(a, t, o, p) {
    const n = p.n || 7;
    for (let i = 0; i < n; i++) a.burst(o, t + i * 0.022 + Math.random() * 0.012, { dur: 0.008, vol: 0.12 * (p.v ?? 1), type: 'highpass', f: 5200 + Math.random() * 2600 });
  },
});

/** The item comes as a keychain: item.keychain, or its series' keychain. Returns its settings or null. */
export function keychainOf(item) {
  if (!item) return null;
  const k = item.keychain ?? SERIES_BY_ID[item.series]?.keychain;
  if (!k || !lowpixManifest[item.key]) return null;
  return { chain: 95, ...(typeof k === 'object' ? k : {}) };
}

let kitMats = null;
function kitPart(name) {
  if (!figureReady(KIT.key)) return null;
  const m = figurePartMesh(KIT, name, { own: true });
  m.castShadow = true; m.receiveShadow = true; m.raycast = () => {};
  m.userData.noRim = true;
  kitMats ||= m.material;
  return m;
}

/** One chain: verlet points in world space, drawn as instanced beads under the figure mesh. */
class Chain {
  constructor(mesh, item, opts) {
    this.mesh = mesh; this.item = item; this.len = opts.chain * 0.001;
    this.n = Math.max(6, Math.round(this.len / PITCH));
    this.p = Array.from({ length: this.n + 1 }, () => new THREE.Vector3());
    this.o = Array.from({ length: this.n + 1 }, () => new THREE.Vector3());
    this.pin = new THREE.Vector3(); // pt_chain, figure-local
    this.init = false; this.still = 0; this.twist = 0; this.twistV = 0; this.hang = null;
    this.group = new THREE.Group(); this.group.name = 'keychain'; this.group.userData.noRim = true;
    mesh.add(this.group);
    this.built = false;
  }
  build() {
    const bead = kitPart('bead'), clasp = kitPart('clasp');
    if (!bead || !figureReady(this.item.key)) return false;
    figurePoint(this.item, 'chain', this.pin);
    if (!lowpixManifest[this.item.key]?.pts?.chain) { const sz = this.mesh.geometry.userData.size; if (sz) this.pin.set(0, sz.y, 0); }
    this.beads = new THREE.InstancedMesh(bead.geometry, bead.material, this.n);
    this.beads.castShadow = true; this.beads.raycast = () => {}; this.beads.frustumCulled = false;
    this.clasp = clasp; this.clasp.frustumCulled = false;
    this.group.add(this.beads, this.clasp);
    this.built = true;
    return true;
  }
  dispose() { this.group.parent?.remove(this.group); }

  /** World-space step. hook: world point the chain hangs from (the figure hangs below) or null (it drapes). */
  step(dt, ws) {
    const m = this.mesh, P = this.p, O = this.o, n = this.n, pitch = PITCH * ws;
    const pinW = m.localToWorld(_a.copy(this.pin));
    if (!this.init) {
      for (let i = 0; i <= n; i++) { P[i].copy(this.hang ? this.hang : pinW).addScaledVector(UP, this.hang ? -i * pitch : -i * pitch * 0.2); O[i].copy(P[i]); }
      this.init = true;
    }
    const floor = this.hang ? -Infinity : this.floor;
    const h = Math.min(dt, 1 / 30) / 2;
    for (let sub = 0; sub < 2; sub++) {
      for (let i = 0; i <= n; i++) {
        const v = _b.subVectors(P[i], O[i]).multiplyScalar(0.982);
        O[i].copy(P[i]);
        P[i].add(v).addScaledVector(GRAV, h * h);
      }
      for (let it = 0; it < 8; it++) {
        if (this.hang) P[0].copy(this.hang); else P[0].copy(pinW);
        for (let i = 0; i < n; i++) {
          const d = _b.subVectors(P[i + 1], P[i]), l = d.length() || 1e-6, e = (l - pitch) / l;
          if (e < 0) continue; // a ball chain slackens, it never pushes
          const wa = i === 0 ? 0 : (this.hang && i + 1 === n ? 0.9 : 0.5), wb = 1 - wa; // (the figure is the heavy end)
          P[i].addScaledVector(d, e * wa); P[i + 1].addScaledVector(d, -e * wb);
        }
        for (let i = 1; i <= n; i++) if (P[i].y < floor + 0.0012 * ws) P[i].y = floor + 0.0012 * ws;
      }
    }
    if (this.hang) P[0].copy(this.hang); else P[0].copy(pinW);
    // follow the leader: no link ends up longer than the chain's pitch (a ball chain does not stretch)
    for (let i = 1; i <= n; i++) {
      const d = _b.subVectors(P[i], P[i - 1]), l = d.length();
      if (l > pitch) { P[i].copy(P[i - 1]).addScaledVector(d, pitch / l); O[i].addScaledVector(d, (pitch - l) / l * 0.5); }
    }
  }

  /** Place the hanging figure: its screw eye on the chain's end, its up axis along the last links. */
  pose(dt, base) {
    const m = this.mesh, P = this.p, n = this.n;
    const up = _b.subVectors(P[Math.max(0, n - 4)], P[n]).normalize();
    this.twistV += (-this.twist * 18 - this.twistV * 1.6) * dt;
    this.twist += this.twistV * dt;
    const q = _q.setFromUnitVectors(UP, up).multiply(new THREE.Quaternion().setFromAxisAngle(UP, base + this.twist));
    m.parent.updateWorldMatrix(true, false);
    _inv.copy(m.parent.matrixWorld).invert();
    const pq = new THREE.Quaternion(); m.parent.getWorldQuaternion(pq);
    m.quaternion.copy(pq.invert().multiply(q));
    m.updateMatrix();
    // where the pin would be with the mesh at the origin, then shift the mesh so the pin sits on P[n]
    const pinW = _c.copy(this.pin).multiply(m.scale).applyQuaternion(q);
    const ps = new THREE.Vector3(); m.parent.getWorldScale(ps);
    const at = _a.copy(P[n]).sub(pinW.multiply(ps));
    m.position.copy(at.applyMatrix4(_inv));
  }

  draw(ws) {
    const m = this.mesh;
    m.updateWorldMatrix(true, false);
    _inv.copy(m.matrixWorld).invert();
    _s.setScalar(ws);
    for (let i = 1; i <= this.n; i++) {
      _m.compose(this.p[i], _q.identity(), _s).premultiply(_inv);
      this.beads.setMatrixAt(i - 1, _m);
    }
    this.beads.instanceMatrix.needsUpdate = true;
    // the clasp: on the hook when hanging, at the free end when draped
    const a = this.hang ? this.p[0] : this.p[this.n], b = this.hang ? this.p[2] : this.p[this.n - 2];
    _q.setFromUnitVectors(UP, this.hang ? _b.subVectors(b, a).normalize() : _b.subVectors(a, b).normalize()); // (down the chain from the hook / on past the end)
    _m.compose(a, _q, _s).premultiply(_inv);
    _m.decompose(this.clasp.position, this.clasp.quaternion, this.clasp.scale);
    this.beads.layers.mask = this.clasp.layers.mask = m.layers.mask;
  }
}

export class Keychains {
  constructor(game) {
    this.game = game;
    this.chains = new Set();
    this.hooks = new Map(); // id -> { obj, local, hookMesh, mesh, data }
    this.st = ensureState(game, 'keychains', { bag: [], hooks: {} });
    this.bag = []; // { data, mesh, holder, chain }
    loadFigure(KIT).then(() => { for (const c of this.chains) c.built || c.build(); this.syncBag(); });
  }

  /** (lowpix mesh hook) a figure mesh of a keychain item gets its chain. */
  adopt(mesh, item) {
    const kc = keychainOf(item);
    if (!kc || mesh.userData.chain) return;
    const c = new Chain(mesh, item, kc);
    mesh.userData.chain = c;
    this.chains.add(c);
    if (!figureReady(item.key)) loadFigure(item).then(() => c.built || c.build()); else c.build();
  }

  /** Hang a figure mesh from a world point (or null: back to draping). */
  setHook(mesh, worldPoint, yaw = 0) {
    const c = mesh?.userData.chain;
    if (!c) return;
    c.hang = worldPoint ? worldPoint.clone() : null;
    c.yaw = yaw; c.init = false; c.still = 0; c.twistV = 1.2 * (Math.random() - 0.5) + 1.5;
  }

  update(dt) {
    const held = this.game.held?.item?.obj;
    for (const c of this.chains) {
      const m = c.mesh;
      if (!m.parent) { if (!c.gone) { c.gone = this.game.time ?? 0; } if ((this.game.time ?? 0) - c.gone > 2) { c.dispose(); this.chains.delete(c); } continue; }
      c.gone = 0;
      if (!c.built && !c.build()) continue;
      m.updateWorldMatrix(true, false);
      const ws = m.getWorldScale(_s).y;
      let inHand = false;
      for (let o = m; o; o = o.parent) if (o === held) inHand = true;
      if (!c.hang) {
        // the surface it stands on: the mesh's own origin (bottom-centre), unless it is in your hand
        c.floor = inHand ? -Infinity : m.getWorldPosition(_c).y;
      }
      // sleep once settled and the anchor holds still
      const anchor = c.hang || m.localToWorld(_c.copy(c.pin));
      if (c.last && c.last.distanceToSquared(anchor) < 1e-10 && c.still > (c.hang ? 6 : 2) && !inHand) continue;
      c.still = c.last && c.last.distanceToSquared(anchor) < 1e-10 ? c.still + dt : 0;
      (c.last ||= new THREE.Vector3()).copy(anchor);
      c.step(dt, ws);
      if (c.hang) c.pose(dt, c.yaw || 0);
      c.draw(ws);
    }
    this.updateBag(dt);
  }

  // ------------------------------------------------------------------ hooks (display slots, world hooks)
  /** A hook mesh (the kit's cup hook) at a point of an object, screwed in from above. */
  hookMesh(parent, local) {
    const h = kitPart('hook');
    if (!h) return null;
    h.position.copy(local);
    parent.add(h);
    return h;
  }

  /** A world hook: with a keychain in hand, LMB hangs it there (saved under id). */
  addHook(id, obj, local) {
    const g = this.game;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(local).add(new THREE.Vector3(0, -0.06, 0));
    obj.add(hit);
    const H = { obj, local: local.clone(), hit, mesh: null };
    this.hooks.set(id, H);
    const show = () => {
      if (H.mesh) { H.mesh.parent?.remove(H.mesh); H.mesh = null; }
      const d = this.st.hooks[id];
      if (!d) return;
      H.mesh = makeItemMesh(d.k, d.f);
      obj.add(H.mesh);
      H.mesh.position.copy(local);
      this.setHook(H.mesh, obj.localToWorld(local.clone()));
    };
    g.interaction.add(hit, {
      reach: 2.4,
      hint: (held) => {
        if (this.st.hooks[id]) return held ? null : { key: 'LMB', text: 'Take the keychain', sub: getItem(this.st.hooks[id].k)?.name || '' };
        return held?.kind === 'toy' && keychainOf(getItem(held.data.key)) ? { key: 'LMB', text: 'Hang it on the hook' } : null;
      },
      use: (held) => {
        if (this.st.hooks[id] && !held) {
          const d = this.st.hooks[id]; delete this.st.hooks[id]; show();
          this.give(d.k, d.f, obj.localToWorld(local.clone()));
          return;
        }
        if (!held || held.kind !== 'toy' || !keychainOf(getItem(held.data.key)) || this.st.hooks[id]) return;
        const rel = g.held.release(); if (!rel) return;
        rel.obj.parent?.remove(rel.obj);
        this.st.hooks[id] = { k: rel.data.key, f: rel.data.finish };
        show(); audio.play('chainJingle', { pos: obj.localToWorld(local.clone()) }); g.save?.();
      },
    });
    if (!H.hookMesh) loadFigure(KIT).then(() => { H.hookMesh = this.hookMesh(obj, local); show(); });
    return H;
  }

  give(k, f, pos) {
    const g = this.game;
    const mesh = makeItemMesh(k, f), holder = new THREE.Group(); holder.add(mesh);
    holder.position.copy(pos); g.scene.add(holder);
    g.held.take('toy', { key: k, finish: f }, holder);
    audio.play('chainJingle', { pos });
  }

  // ------------------------------------------------------------------ the bag
  /** With a keychain in hand: clip it to your bag. */
  clipToBag() {
    const g = this.game, it = g.held?.item;
    if (!it || it.kind !== 'toy' || !keychainOf(getItem(it.data.key))) return false;
    if (this.st.bag.length >= 3) { g.tip?.('bagfull', 'Your bag has three keychains already', 'Take one off first (look down, LMB)'); return true; }
    const rel = g.held.release(); if (!rel) return false;
    rel.obj.parent?.remove(rel.obj);
    this.st.bag.push({ k: rel.data.key, f: rel.data.finish });
    this.syncBag();
    audio.play('chainJingle', { n: 10 });
    g.save?.();
    return true;
  }
  syncBag() {
    const g = this.game;
    for (const B of this.bag) { B.holder.parent?.remove(B.holder); g.interaction.remove(B.mesh); }
    this.bag = this.st.bag.map((d, i) => {
      const holder = new THREE.Group(), mesh = makeItemMesh(d.k, d.f);
      holder.add(mesh); g.scene.add(holder);
      g.interaction.add(mesh, {
        reach: 1.2,
        hint: (held) => (held ? null : { key: 'LMB', text: 'Take it off your bag', sub: getItem(d.k)?.name || '' }),
        use: (held) => { if (held) return; const j = this.st.bag.indexOf(d); if (j < 0) return; this.st.bag.splice(j, 1); this.syncBag(); this.give(d.k, d.f, mesh.getWorldPosition(new THREE.Vector3())); g.save?.(); },
      });
      return { data: d, holder, mesh, i };
    });
  }
  updateBag() {
    const g = this.game, P = g.player;
    if (!this.bag.length || !P) return;
    const on = g.fp?.active !== false && !g.pc?.active;
    const yaw = P.yaw || 0, sin = Math.sin(yaw), cos = Math.cos(yaw);
    for (const B of this.bag) {
      B.holder.visible = on;
      // at your right hip, a little apart from each other (where a shoulder bag hangs)
      const side = 0.2 + B.i * 0.018, fwd = 0.02 - B.i * 0.03;
      const x = P.pos.x + cos * side - sin * fwd, z = P.pos.z - sin * side - cos * fwd;
      const pt = _a.set(x, (P.pos.y || 0) + 0.9, z);
      if (!B.mesh.userData.chain) continue;
      if (!B.mesh.userData.chain.hang) this.setHook(B.mesh, pt, yaw);
      else B.mesh.userData.chain.hang.copy(pt);
      B.mesh.userData.chain.yaw = yaw + Math.PI / 2;
    }
  }
}
