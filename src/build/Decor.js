// game.decor: the furniture and decor placed in the shop (bought from the catalogue, placed with the builder).
//   decor.pieces (Map uid -> piece), decor.list(), decor.count(), decor.byFeature(name)
//   decor.quality() -> 0..1          what the furniture adds to the shop (game.sim.shopQuality's 'decor' part)
//   decor.seats() -> [{ pos, rotY, piece, index, height, taken }]   benches and sofas people can sit on;
//   decor.takeSeat(uid, index, on)   mark one taken / free (People: route there, sit, chat)
//   decor.tip(amount, fromPos)       a happy customer tips into the nearest tip jar (false when there is none)
//   decor.toRegister(amount, fromPos) a customer pays at the counter: into the register / coin tray (the wallet's
//                                    register balance); false when there is no register
//   decor.place(id, pose, { uid, st }) / decor.remove(piece) / decor.pack(piece) (into a box in your hands)
//   decor.sit(piece) / decor.standUp()
// Pieces are interactive: LMB uses the feature, E its second action, RMB packs it into its box (carry it),
// F moves it in place (the builder), T labels a cardboard box.
// Save: game.state.decor = { v, placed: [{ uid, id, x, y, z, rot, wall, on, st }], seq, starter }.
// Events: 'decor' { type: 'placed' | 'removed' | 'packed', id, uid }, plus the features' own (bellRing, eat...).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ensureState } from '../game/stateExt.js';
import { FURNITURE, furnitureBox } from './catalogue.js';
import { buildPiece } from './models.js';
import { FEATURES } from './features.js';
import { STORAGE } from './storage.js';

const _v = new THREE.Vector3();

export class Decor {
  constructor(game) {
    this.game = game;
    game.decor = this; // (features look each other up while the saved pieces spawn)
    this.s = ensureState(game, 'decor', { v: 1, placed: [], seq: 1, starter: false });
    this.pieces = new Map();
    this.sitting = null;
    for (const d of [...this.s.placed]) {
      if (!FURNITURE[d.id]) continue;
      try { this.spawn(d); } catch (e) { console.warn('decor spawn failed', d.id, e); }
    }
    // pieces that sit on other pieces need those to exist first (second pass refreshes stacks)
    for (const p of this.pieces.values()) if (p.feature === STORAGE) STORAGE.refresh(p, game);
  }

  /** A fresh uid. */
  uid() { return 'f' + (this.s.seq++).toString(36) + Math.floor(Math.random() * 1296).toString(36); }

  // ------------------------------------------------------------------ spawning
  spawn(data, { animate = false } = {}) {
    const g = this.game, def = FURNITURE[data.id];
    data.st ||= {};
    const b = buildPiece(def, data.st);
    const p = { data, def, root: b.root, parts: b.parts, box: b.box, game: g, feature: FEATURES[def.feature] || null };
    b.root.position.set(data.x, data.y || 0, data.z);
    b.root.rotation.y = data.rot || 0;
    b.root.userData.piece = p;
    g.scene.add(b.root);
    b.root.updateMatrixWorld(true);
    this.pieces.set(data.uid, p);
    this.collide(p);
    p.feature?.init?.(p, g);
    g.interaction.add(b.root, {
      reach: 2.4,
      hint: (held, hit) => this.hint(p, held, hit),
      use: (held, hit) => { this.use(p, held, hit); return false; },
      alt: () => this.pack(p),
    });
    if (animate) {
      const s0 = b.root.scale.clone();
      g.tweens.add({ dur: 0.45, update: (k) => { const e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); b.root.scale.copy(s0).multiplyScalar(Math.max(0.05, e)); } });
    }
    return p;
  }

  /** Player obstacle, physics box and a top surface for small things (from the piece's rotated bounds). */
  collide(p) {
    const g = this.game, d = p.data, def = p.def;
    this.uncollide(p);
    const wb = new THREE.Box3().setFromObject(p.root);
    p.aabb = wb;
    if (d.wall) return;
    if (def.block && !d.on) p.obstacle = g.player.addObstacle(wb.min.x, wb.max.x, wb.min.z, wb.max.z, 'decor');
    if (!def.flat) {
      const c = wb.getCenter(new THREE.Vector3()), h = wb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      p.collider = g.physics.addBox({ center: c, half: h.max(_v.set(0.01, 0.01, 0.01)), material: 'wood' });
    }
    if (def.top) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(wb.max.x - wb.min.x, 0.004, wb.max.z - wb.min.z), new THREE.MeshBasicMaterial({ visible: false }));
      top.position.set((wb.min.x + wb.max.x) / 2, wb.max.y - 0.002, (wb.min.z + wb.max.z) / 2);
      top.userData.pieceTop = p;
      g.scene.add(top);
      top.updateMatrixWorld(true);
      g.placement.addSurface(top);
      p.top = top;
    }
  }
  uncollide(p) {
    const g = this.game;
    if (p.obstacle) { g.player.removeObstacle(p.obstacle); p.obstacle = null; }
    if (p.collider) { g.physics.removeCollider(p.collider); p.collider = null; }
    if (p.top) { const i = g.placement.surfaces.indexOf(p.top); if (i >= 0) g.placement.surfaces.splice(i, 1); p.top.parent?.remove(p.top); p.top = null; }
  }

  /** Remove a piece from the world (and from the save). */
  remove(p, { keepData = false } = {}) {
    const g = this.game;
    if (this.sitting?.piece === p) this.standUp();
    p.feature?.dispose?.(p, g);
    p.unsub?.();
    this.uncollide(p);
    g.interaction.remove(p.root);
    p.root.parent?.remove(p.root);
    this.pieces.delete(p.data.uid);
    if (!keepData) { const i = this.s.placed.indexOf(p.data); if (i >= 0) this.s.placed.splice(i, 1); }
    g.events.emit('decor', { type: 'removed', id: p.def.id, uid: p.data.uid });
  }

  /** Rebuild a piece in place (a new look: neon design...). */
  rebuild(p) { const d = p.data; this.remove(p, { keepData: true }); return this.spawn(d); }

  /** Place a new piece (or a packed one coming back). pose: { x, y, z, rot, wall, on } */
  place(id, pose, { uid = null, st = null, animate = true } = {}) {
    const data = { uid: uid || this.uid(), id, x: pose.x, y: pose.y || 0, z: pose.z, rot: pose.rot || 0, wall: pose.wall || null, on: pose.on || null, st: st || {} };
    this.s.placed.push(data);
    const p = this.spawn(data, { animate });
    if (pose.on) { const under = this.pieces.get(pose.on); if (under?.feature === STORAGE) STORAGE.refresh(under, this.game); }
    this.game.events.emit('decor', { type: 'placed', id, uid: data.uid });
    this.game.save();
    return p;
  }

  /** Move a piece to a new pose (the builder's F). */
  move(p, pose) {
    const d = p.data, oldOn = d.on;
    Object.assign(d, { x: pose.x, y: pose.y || 0, z: pose.z, rot: pose.rot || 0, wall: pose.wall || null, on: pose.on || null });
    p.root.position.set(d.x, d.y, d.z);
    p.root.rotation.y = d.rot;
    p.root.visible = true;
    p.root.updateMatrixWorld(true);
    this.collide(p);
    p.feature?.moved?.(p, this.game);
    for (const uid of [oldOn, d.on]) { const u = uid && this.pieces.get(uid); if (u?.feature === STORAGE) STORAGE.refresh(u, this.game); }
    this.game.save();
  }

  /** RMB: pack it into its box, into your hands. */
  pack(p) {
    const g = this.game, H = g.held;
    if (!H.canTake()) { g.news('Your hands are full', 'Free a slot to carry it'); return; }
    if (this.stackedOn(p).length) { g.news('Take what is on top of it first'); audio.play('error', { vol: 0.4 }); return; }
    if (p.def.feature === 'vacuum' && p.data.st.mode !== 'docked' && p.bot) { p.feature.dock(p, g); }
    const data = furnitureBox(p.def.id, { uid: p.data.uid, st: p.data.st });
    const under = p.data.on;
    const pos = p.root.getWorldPosition(new THREE.Vector3());
    this.remove(p);
    if (under) { const u = this.pieces.get(under); if (u?.feature === STORAGE) STORAGE.refresh(u, g); }
    const mesh = this.boxMesh(data);
    mesh.position.copy(pos);
    g.scene.add(mesh);
    audio.play('boxPack', { pos, vol: 0.7 });
    g.effects.puff({ pos: pos.clone().add(new THREE.Vector3(0, 0.1, 0)), count: 5, colors: [0xc8b8a0, 0xd8c8b0], size: 0.05 });
    H.take('box', data, mesh);
    g.events.emit('decor', { type: 'packed', id: p.def.id, uid: p.data.uid });
    g.save();
  }

  /** What a furniture box looks like in your hands / on the floor: a storage box is itself, the rest a labelled carton. */
  boxMesh(data) {
    const def = FURNITURE[data.id];
    if (def?.feature === 'storage') {
      const b = buildPiece(def, data.st || {});
      const g = new THREE.Group(); g.add(b.root); g.userData.size = def.box;
      // what's inside peeks out of the carried box too
      const items = data.st?.items || [];
      if (items.length) STORAGE.refresh({ data: { st: data.st }, parts: b.parts, root: b.root }, this.game, false);
      return g;
    }
    return this.game.delivery.meshFor({ ...data, type: 'decor', kind: 'furniture', boxSize: def?.box || [0.3, 0.25, 0.25] });
  }

  // ------------------------------------------------------------------ interaction
  hint(p, held, hit) {
    const g = this.game;
    if (g.builder?.moving) return null;
    // carrying a furniture box: the builder places it (LMB), so the piece stays quiet
    if (held?.kind === 'box' && held.data?.type === 'furniture') return null;
    const f = p.feature;
    const h = f?.hint?.(p, held, g, hit);
    if (h === null && held) return null;
    const base = h || { key: '', text: p.def.name };
    if (held) return base;
    const extra = 'RMB carry · F move';
    return { ...base, sub: base.sub ? `${base.sub} · ${extra}` : extra };
  }

  use(p, held, hit) {
    const f = p.feature;
    if (!f?.use) return;
    f.use(p, held, this.game, hit);
    this.game.events.emit('decorUse', { id: p.def.id, uid: p.data.uid });
  }

  /** The piece under the crosshair (from the interaction hover). */
  hovered() {
    const o = this.game.interaction.hover?.obj;
    return o?.userData?.piece || null;
  }

  // ------------------------------------------------------------------ queries
  list() { return [...this.pieces.values()]; }
  count() { return this.pieces.size; }
  byFeature(name) { return this.list().filter((p) => p.def.feature === name); }
  stackedOn(p) { return this.list().filter((q) => q.data.on === p.data.uid); }

  quality() {
    let sum = 0;
    for (const p of this.pieces.values()) sum += p.feature?.quality ? p.feature.quality(p, this.game) : (p.def.quality || 0);
    return 1 - Math.exp(-sum);
  }

  /** Seats for customers (benches, sofas): world position, the way the sitter faces, and whether it's taken. */
  seats() {
    const out = [];
    for (const p of this.byFeature('seat')) {
      const n = p.def.seats || 1, w = p.box.max.x - p.box.min.x;
      for (let i = 0; i < n; i++) {
        const lx = n === 1 ? 0 : (i / (n - 1) - 0.5) * w * 0.55;
        const pos = p.root.localToWorld(new THREE.Vector3(lx, 0, 0.02));
        const taken = (this.sitting?.piece === p && this.sitting.i === i) || !!p.taken?.[i];
        out.push({ pos, rotY: p.root.rotation.y, piece: p.data.uid, index: i, height: p.box.max.y * 0.5, taken });
      }
    }
    return out;
  }

  /** Mark a seat taken / free (people code: when someone sits down or gets up). */
  takeSeat(uid, index = 0, on = true) {
    const p = this.pieces.get(uid);
    if (!p) return false;
    p.taken ||= [];
    p.taken[index] = on;
    return true;
  }

  nearest(feature, pos) {
    let best = null, bd = Infinity;
    for (const p of this.byFeature(feature)) { const d = p.root.position.distanceToSquared(pos || this.game.player.pos); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  tip(amount, from = null) {
    const p = this.nearest('tipjar', from);
    if (!p) return false;
    p.feature.tip(p, amount, from, this.game);
    return true;
  }

  toRegister(amount, from = null) {
    const g = this.game, p = this.nearest('register', from);
    if (!p) return false;
    g.wallet.toRegister(amount);
    const to = p.root.localToWorld(new THREE.Vector3(0, 0.12, 0));
    if (from) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshStandardMaterial({ color: 0xe8eaee, metalness: 0.9, roughness: 0.3 }));
      c.position.copy(from);
      g.scene.add(c);
      g.tweens.add({ dur: 0.45, update: (k) => { c.position.lerpVectors(from, to, k); c.position.y += Math.sin(k * Math.PI) * 0.2; }, done: () => c.parent?.remove(c) });
    }
    g.tweens.wait(0.45, () => audio.play(p.def.id === 'cash_register' ? 'registerDrawer' : 'coinClink', { pos: to, vol: 0.7, v: 0.8 }));
    return true;
  }

  // ------------------------------------------------------------------ sitting
  sit(p) {
    const g = this.game, P = g.player;
    const seats = this.seats().filter((s) => s.piece === p.data.uid && !s.taken);
    if (!seats.length) { g.news('Someone is sitting there'); return; }
    let s = seats[0];
    for (const q of seats) if (q.pos.distanceToSquared(P.pos) < s.pos.distanceToSquared(P.pos)) s = q;
    this.sitting = { piece: p, i: s.index, pos: s.pos.clone(), eye: P.eye, t: 0 };
    P.vel.set(0, 0, 0);
    const y0 = P.yaw, want = s.rotY;
    let dy = want - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const p0 = P.pos.clone(), e0 = P.eye, e1 = Math.max(0.95, s.height + 0.75);
    g.tweens.add({ dur: 0.45, update: (k) => { const e = k * k * (3 - 2 * k); P.pos.lerpVectors(p0, s.pos, e); P.pos.y = 0; P.eye = e0 + (e1 - e0) * e; P.yaw = y0 + dy * e; } });
    audio.play('place', { vol: 0.5 });
    g.events.emit('sit', { piece: p.data.uid, id: p.def.id });
    g.tip?.('sit', 'Sitting down', 'Walk to stand up');
  }
  standUp() {
    const S = this.sitting;
    if (!S) return;
    const P = this.game.player;
    this.sitting = null;
    const e0 = P.eye;
    this.game.tweens.add({ dur: 0.3, update: (k) => { P.eye = e0 + (S.eye - e0) * k; } });
    this.game.events.emit('stand', { piece: S.piece.data.uid });
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game, inp = g.input;
    for (const p of this.pieces.values()) p.feature?.update?.(p, dt, g);
    // sitting: stay put until you walk
    const S = this.sitting;
    if (S) {
      S.t += dt;
      if (S.t > 0.5 && (inp.key('KeyW') || inp.key('KeyA') || inp.key('KeyS') || inp.key('KeyD') || inp.axis.x || inp.axis.z)) this.standUp();
      else if (S.t > 0.45) { g.player.pos.x = S.pos.x; g.player.pos.z = S.pos.z; }
    }
    if (!inp.locked || g.uiOpen || g.pc?.active || g.held.reading || g.builder?.moving || g.talk?.active || g.cutscene?.active) return;
    const p = this.hovered();
    if (!p) return;
    if (inp.keyPressed('KeyE') && p.feature?.secondary && !(g.held.item?.kind === 'box' && g.held.item.data?.type === 'furniture')) { p.feature.secondary(p, g); g.events.emit('decorUse', { id: p.def.id, uid: p.data.uid, alt: true }); }
    if (inp.keyPressed('KeyT') && p.feature === STORAGE) STORAGE.label(p, g);
  }
}
