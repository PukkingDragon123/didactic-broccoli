// What you carry: a 5-slot inventory. The selected slot's item is held in front of the camera (your hands grip it,
// see FPBody.js), sways with movement, can be inspected (RMB), dropped (Q), and handed over to targets with smooth arcs.
// Switch slots with 1-5, the mouse wheel or by tapping the hotbar: the old item dips out, the new one comes up.
// Everything on `anchor` is drawn by the renderer's viewmodel pass (on top, never inside walls).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { damp, ease } from '../core/util.js';
import { tagCard } from './labels.js';
import { OPENERS } from './economy.js';
import { TOOLS } from '../data/tools.js';
import { propMesh } from '../world/props.js';

export const SLOTS = 5;

export const POSES = {
  capsule: { pos: new THREE.Vector3(0.14, -0.13, -0.37), rot: new THREE.Euler(0.25, 0.4, 0.1) },
  toy: { pos: new THREE.Vector3(0.13, -0.12, -0.36), rot: new THREE.Euler(0.12, -0.35, 0) },
  box: { pos: new THREE.Vector3(0.02, -0.3, -0.55), rot: new THREE.Euler(0.15, 0.2, 0) },
  tool: { pos: new THREE.Vector3(0.2, -0.26, -0.46), rot: new THREE.Euler(-0.75, 0.55, 0.3) },
  inspect: { pos: new THREE.Vector3(0, -0.005, -0.24), rot: new THREE.Euler(0.1, 0, 0) },
  reveal: { pos: new THREE.Vector3(0, -0.05, -0.39), rot: new THREE.Euler(0.05, 0, 0) },
  twist: { pos: new THREE.Vector3(0.03, -0.12, -0.37), rot: new THREE.Euler(0.35, 0.15, 0.05) },
  pet: { pos: new THREE.Vector3(0.02, -0.34, -0.55), rot: new THREE.Euler(0.1, Math.PI + 0.3, 0) },
  item: { pos: new THREE.Vector3(0.14, -0.14, -0.4), rot: new THREE.Euler(0.2, -0.45, 0.05) },
  broom: { pos: new THREE.Vector3(0.17, -0.27, -0.615), rot: new THREE.Euler(1.0, 0, 0.73) },
  long: { pos: new THREE.Vector3(0.12, -0.24, -0.5), rot: new THREE.Euler(0.1, -1.2, 0.35) },
  read: { pos: new THREE.Vector3(0, -0.035, -0.3), rot: new THREE.Euler(0.25, 0, 0) },
};

/** A carried tool's mesh, centred on its holder so poses rotate it nicely. */
export function makeToolMesh(id) {
  const T = TOOLS[id] || {};
  const holder = new THREE.Group();
  const m = propMesh(T.prop || id, { fallbackSize: [0.12, 0.12, 0.12], fallbackColor: 0xc8a070 });
  const box = new THREE.Box3().setFromObject(m);
  const c = box.getCenter(new THREE.Vector3());
  m.position.sub(c);
  holder.add(m);
  const sz = box.getSize(new THREE.Vector3());
  holder.userData.tool = id;
  holder.userData.handScale = (T.hand || 0.13) / Math.max(sz.x, sz.y, sz.z, 0.01);
  return holder;
}

export class Held {
  constructor(game) {
    this.game = game;
    this.anchor = new THREE.Group();
    game.camera.add(this.anchor);
    game.renderer.vmRoots.add(this.anchor);
    this.slots = Array(SLOTS).fill(null); // {kind, data, obj, ent?}
    this.sel = 0;
    this.sway = new THREE.Vector2();
    this.swayV = new THREE.Vector2();
    this.trans = null;
    this.twist = 0;
    this.twisting = false;
    this.inspecting = false;
    this.inspectRot = new THREE.Euler();
    this.pose = 'capsule';
    this.tag = null;
    this.busy = false; // during reveal animations
    this.spin = 0;
  }

  /** The selected slot's item. */
  get item() { return this.slots[this.sel]; }
  set item(v) { this.slots[this.sel] = v; }
  get kind() { return this.item?.kind || null; }

  canTake() { return this.slots.some((x) => !x); }
  has(toolId) { return this.slots.some((x) => x?.kind === 'tool' && x.data.id === toolId); }
  find(toolId) { return this.slots.findIndex((x) => x?.kind === 'tool' && x.data.id === toolId); }
  holding(toolId) { const it = this.item; return it?.kind === 'tool' && it.data.id === toolId; }

  /** Put an item into the selected slot (or the first free one, which becomes selected). Returns false when full. */
  take(kind, data, obj, opts = {}) {
    if (this.item) {
      const free = this.slots.findIndex((x) => !x);
      if (free < 0) { obj.parent?.remove(obj); return false; }
      this.pocket(this.item);
      this.sel = free;
    }
    this.item = { kind, data, obj, ent: opts.ent || null };
    obj.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    this.anchor.attach(obj);
    obj.visible = true;
    this.pose = this.poseFor(this.item);
    // miniatures are shown a little larger in hand so you can admire the detail
    this.holdScale = this.scaleFor(this.item, opts.pose);
    // picked up from the world: it waits a moment for the hand to reach out and grab it
    const far = this.game.fp?.live && obj.position.distanceTo(POSES[opts.pose || this.pose].pos) > 0.25;
    this.startTrans(opts.pose || this.pose, far ? 0.4 : opts.dur ?? 0.32, far ? 0.12 : 0);
    this.twist = 0;
    if (kind === 'toy') this.attachTag(data, opts.isNew);
    else this.removeTag();
    this.game.events.emit('held', this.item);
    return true;
  }

  /** Give a tool (bought, found...) straight into the inventory. */
  giveTool(id, extra = {}) {
    if (!this.canTake()) return false;
    const obj = makeToolMesh(id);
    obj.position.set(0, -0.5, -0.4);
    this.anchor.add(obj);
    return this.take('tool', { id, ...extra }, obj);
  }

  poseFor(it) {
    const k = it.kind;
    if (k === 'tool') return TOOLS[it.data.id]?.pose || 'item';
    return k === 'capsule' ? 'capsule' : k === 'toy' ? 'toy' : k === 'cat' ? 'pet' : 'box';
  }

  scaleFor(it, pose) {
    const k = it.kind;
    if (k === 'tool') return it.obj.userData.handScale || 1;
    return k === 'toy' ? 1.7 : k === 'capsule' ? 1.3 : pose === 'tool' ? 0.6 : 1;
  }

  /** Hide an item in its slot (it stays parented to the camera anchor). */
  pocket(it) {
    if (!it) return;
    it.obj.visible = false;
    this.removeTag();
    this.inspecting = false;
    this.trans = null;
  }

  /** Switch to slot i with a little dip-and-rise animation. */
  select(i) {
    i = ((i % SLOTS) + SLOTS) % SLOTS;
    if (i === this.sel || this.busy || this.twisting) return false;
    const cur = this.item;
    if (this.inspecting) { this.inspecting = false; this.game.player.lookLocked = false; this.game.renderer.grade.uniforms.uVignette.value = 0.32; }
    if (cur?.kind === 'cat') this.drop(); // the cat won't go in your pocket
    else if (cur) { const pose = this.pose; this.pocket(cur); if (cur.obj.parent === this.anchor) this.lowering = { obj: cur.obj, it: cur, pose, t: 0, from: cur.obj.position.clone() }; cur.obj.visible = !!this.lowering; }
    this.sel = i;
    const it = this.item;
    if (it) {
      if (this.lowering?.obj === it.obj) this.lowering = null;
      it.obj.visible = true;
      this.pose = this.poseFor(it);
      this.holdScale = this.scaleFor(it);
      const P = POSES[this.pose];
      it.obj.position.copy(P.pos).add(new THREE.Vector3(0, -0.3, 0.06));
      it.obj.quaternion.setFromEuler(P.rot);
      this.startTrans(this.pose, 0.26, this.lowering ? 0.09 : 0);
      if (it.kind === 'toy') this.attachTag(it.data);
    }
    audio.play('whoosh', { vol: 0.25, dur: 0.12, v: 0.05 });
    this.game.events.emit('held', it);
    this.game.events.emit('slot', i);
    return true;
  }

  /** Remove a pocketed/selected tool entirely (used up). */
  consume(slotIndex = this.sel) {
    const it = this.slots[slotIndex];
    if (!it) return;
    // the hands may play it out (pour the milk...) and remove it themselves
    if (!(slotIndex === this.sel && this.game.fp?.consumed(it))) it.obj.parent?.remove(it.obj);
    this.slots[slotIndex] = null;
    if (slotIndex === this.sel) { this.removeTag(); this.trans = null; this.game.events.emit('held', null); }
    this.game.events.emit('slot', this.sel);
  }

  serialize() {
    return this.slots.map((it) => (it && it.kind !== 'cat' ? { kind: it.kind, d: it.data } : null));
  }

  attachTag(data, isNew = false) {
    this.removeTag();
    const t = tagCard(data.key, data.finish, isNew);
    t.position.set(0.035, -0.105, -0.3);
    t.rotation.set(-0.05, 0.3, 0.06);
    this.anchor.add(t);
    this.tag = t;
    this.tagT = 0;
  }

  removeTag() { if (this.tag) { this.anchor.remove(this.tag); this.tag = null; } }

  startTrans(poseName, dur = 0.3, delay = 0) {
    const obj = this.item.obj;
    const P = POSES[poseName];
    this.trans = {
      fromP: obj.position.clone(), fromQ: obj.quaternion.clone(), fromS: obj.scale.x,
      toP: P.pos.clone(), toQ: new THREE.Quaternion().setFromEuler(P.rot), toS: (poseName === 'inspect' ? 1.25 : 1) * (this.holdScale || 1), t: 0, dur, delay,
    };
    this.pose = poseName;
  }

  /** Remove the item from the hand and return it (world transform preserved). */
  release() {
    if (!this.item) return null;
    const it = this.item;
    this.game.scene.attach(it.obj);
    it.obj.traverse((m) => { if (m.isMesh && !m.userData.isRim) m.castShadow = true; });
    it.obj.visible = true;
    this.item = null;
    this.trans = null;
    this.inspecting = false;
    this.twist = 0;
    this.removeTag();
    this.game.player.lookLocked = false;
    this.game.events.emit('held', null);
    this.game.events.emit('slot', this.sel);
    return it;
  }

  /**
   * Fly the held object to a world transform, then call done(obj). parent: optional Object3D to attach to.
   */
  putTo(worldPos, worldQuat, done, { dur = 0.38, arc = 0.08, parent = null, scale = null } = {}) {
    const pose = this.pose;
    const it = this.release();
    if (!it) return;
    const obj = it.obj;
    this.flight = { obj, kind: it.kind, data: it.data, pose, dur, t: 0 }; // the hands follow it out
    const fromP = obj.position.clone(), fromQ = obj.quaternion.clone(), fromS = obj.scale.clone();
    const toS = new THREE.Vector3().setScalar(scale ?? 1);
    this.game.tweens.add({
      dur, ease: ease.inOutCubic,
      update: (k) => {
        obj.position.lerpVectors(fromP, worldPos, k);
        obj.position.y += Math.sin(k * Math.PI) * arc;
        obj.quaternion.slerpQuaternions(fromQ, worldQuat, k);
        obj.scale.lerpVectors(fromS, toS, k);
      },
      done: () => {
        if (parent) parent.attach(obj);
        done?.(obj, it);
      },
    });
    return it;
  }

  hint() {
    const it = this.item;
    if (!it || this.busy) return null;
    if (it.kind === 'capsule') return { key: 'Hold LMB', text: 'Twist open', sub: 'Q to drop' };
    if (it.kind === 'toy') return { key: 'RMB', text: 'Inspect', sub: 'Put it on a shelf, sell it, or Q to set it down' };
    if (it.kind === 'box') return this.game.placement?.boxHint(it) || { key: 'Q', text: 'Put down' };
    if (it.kind === 'cat') return { key: 'LMB', text: 'Pet', sub: 'Q to put down' };
    if (it.kind === 'tool') return this.game.story?.toolHint?.(it) ?? { key: 'Q', text: `Put down ${TOOLS[it.data.id]?.name || ''}` };
    return null;
  }

  /** left click with nothing targeted: boxes (furniture, roller) act on the world, tools do their thing */
  primary() {
    const it = this.item;
    if (it?.kind === 'box' && !this.busy) this.game.placement.primary?.(it);
    if (it?.kind === 'cat') this.game.street?.pet();
    if (it?.kind === 'tool' && !this.busy) this.game.story?.toolPrimary?.(it);
  }

  update(dt) {
    const g = this.game;
    const inp = g.input;
    // sway from look movement + walking
    const tx = -inp.mouse.dx * 0.00035, ty = inp.mouse.dy * 0.00035;
    this.swayV.x += (tx - this.sway.x) * 30 * dt; this.swayV.y += (ty - this.sway.y) * 30 * dt;
    this.swayV.multiplyScalar(Math.max(0, 1 - 9 * dt));
    this.sway.addScaledVector(this.swayV, dt * 12);
    this.sway.clampScalar(-0.03, 0.03);
    const bob = g.player.bobT, t = g.time;
    const moving = Math.min(1, Math.hypot(g.player.vel.x, g.player.vel.z) / 2.4);
    // look-lag, walk bob and a slow breath; the hands tilt a little into turns
    this.anchor.position.set(this.sway.x + Math.cos(bob) * 0.004 * moving + Math.sin(t * 0.83) * 0.0012, this.sway.y + Math.abs(Math.sin(bob)) * 0.006 * moving + Math.sin(t * 1.7) * 0.0022, 0);
    this.anchor.rotation.set(this.sway.y * 1.6, 0, this.sway.x * 2.2 + Math.sin(t * 0.7) * 0.004);

    // slot switching: 1-5, mouse wheel (unless zooming an inspected figure)
    if (inp.locked && !g.pc?.active && !g.uiOpen && !this.reading) {
      for (let i = 0; i < SLOTS; i++) if (inp.keyPressed('Digit' + (i + 1))) this.select(i);
      if (inp.mouse.wheel && !this.inspecting) this.select(this.sel + Math.sign(inp.mouse.wheel));
    }
    if (this.swing !== undefined) this.swing = Math.max(0, this.swing - dt * 2.2);
    // the previous slot's item dipping out of view
    const lo = this.lowering;
    if (lo) {
      lo.t += dt / 0.12;
      const k = Math.min(1, lo.t);
      lo.obj.position.set(lo.from.x + 0.02 * k, lo.from.y - 0.32 * k * k, lo.from.z + 0.06 * k);
      if (k >= 1) { if (this.item?.obj !== lo.obj) lo.obj.visible = false; this.lowering = null; }
    }

    const it = this.item;
    if (!it) return;
    const obj = it.obj;

    if (this.trans?.delay > 0) this.trans.delay -= dt;
    else if (this.trans) {
      const tr = this.trans;
      tr.t += dt;
      const k = ease.outCubic(Math.min(1, tr.t / tr.dur));
      obj.position.lerpVectors(tr.fromP, tr.toP, k);
      obj.quaternion.slerpQuaternions(tr.fromQ, tr.toQ, k);
      if (!this.busy) obj.scale.setScalar(tr.fromS + (tr.toS - tr.fromS) * k);
      if (tr.t >= tr.dur) this.trans = null;
    }
    // broom sweeps: a quick side-to-side swish on top of the pose
    if (it.kind === 'tool' && this.swing > 0 && !this.trans) {
      const P = POSES[this.pose], k = Math.sin(this.swing * Math.PI * 3) * this.swing;
      obj.position.set(P.pos.x - k * 0.12, P.pos.y + Math.abs(k) * 0.03, P.pos.z);
      obj.rotation.set(P.rot.x, P.rot.y, P.rot.z + k * 0.6);
    }
    if (this.busy || !inp.locked || g.pc?.active || this.reading) return;

    // drop
    if (inp.keyPressed('KeyQ') || inp.keyPressed('KeyG')) { this.drop(); return; }

    if (it.kind === 'capsule') this.updateTwist(dt);
    else if (it.kind === 'toy') this.updateInspect(dt);
    else if (it.kind === 'box' && inp.buttonDown(2)) g.placement?.boxSecondary(it);

    if (this.tag) {
      this.tagT += dt;
      this.tag.rotation.z = 0.06 + Math.sin(this.tagT * 2.2) * 0.04;
      this.tag.visible = !this.inspecting;
    }
  }

  updateTwist(dt) {
    const g = this.game;
    const inp = g.input;
    const it = this.item;
    const want = inp.button(2) || (inp.button(0) && !g.interaction.hover);
    const openTime = OPENERS[g.state.opener].time;
    if (want) {
      if (!this.twisting) {
        this.twisting = true;
        audio.play('twist', { dur: openTime, vol: 0.8 });
        g.reveal.startTool(it);
        // both hands: bring it in to the middle
        if (g.fp?.live && this.pose === 'capsule') this.startTrans('twist', 0.2);
      }
      this.twist += dt / openTime;
    } else {
      if (this.twisting) g.reveal.stopTool();
      this.twisting = false;
      this.twist = Math.max(0, this.twist - dt * 2.5);
      if (this.twist <= 0 && this.pose === 'twist' && !this.trans) this.startTrans('capsule', 0.25);
    }
    const cap = it.ent?.cap || it.obj.userData.capRef;
    const k = Math.min(1, this.twist);
    if (cap) {
      cap.top.rotation.y = k * 1.4;
      cap.bottom.rotation.y = -k * 0.6;
      cap.top.position.y = k * 0.004;
    }
    // shake (more for rarer contents — anticipation!)
    const rar = it.data.rarity;
    const intensity = rar === 'secret' ? 3.5 : rar === 'ultra' ? 2 : rar === 'rare' ? 1.2 : 1;
    const sh = k * 0.003 * intensity;
    const base = POSES[this.pose];
    if (!this.trans) {
      it.obj.position.set(base.pos.x + (Math.random() - 0.5) * sh, base.pos.y + (Math.random() - 0.5) * sh, base.pos.z);
    }
    if (rar === 'secret' && k > 0.3 && Math.random() < dt * 30 * k) {
      // light leaking from the seam
      const p = it.obj.getWorldPosition(new THREE.Vector3());
      g.effects.sparks({ pos: p, count: 1, color: 0xfff0a0, speed: 0.35, size: 0.01, life: 0.4, gravity: 0, radius: 0.04, star: 1 });
    }
    if (this.twist >= 1) {
      this.twisting = false;
      g.reveal.stopTool();
      g.reveal.open(it);
    }
  }

  updateInspect(dt) {
    const g = this.game;
    const inp = g.input;
    const want = inp.button(2);
    if (want && !this.inspecting) {
      this.inspecting = true;
      g.player.lookLocked = true;
      this.startTrans('inspect', 0.28);
      this.inspectRot.set(0.1, 0, 0);
      this.inspectZoom = 0;
      this.idleT = 0;
      audio.play('whoosh', { vol: 0.5, dur: 0.2, v: 0.08 });
      g.reveal.caption?.(this.item.data, false);
      // a soft studio key light rides along so every detail reads
      if (!this.keyLight) { this.keyLight = new THREE.PointLight(0xfff4e8, 0, 1.2, 2); this.keyLight.position.set(0.12, 0.1, -0.05); this.anchor.add(this.keyLight); }
      g.renderer.grade.uniforms.uVignette.value = 0.65;
    } else if (!want && this.inspecting) {
      this.inspecting = false;
      g.player.lookLocked = false;
      this.startTrans('toy', 0.28);
      g.renderer.grade.uniforms.uVignette.value = 0.32;
    }
    if (this.keyLight) this.keyLight.intensity += ((this.inspecting ? 1.6 : 0) - this.keyLight.intensity) * Math.min(1, dt * 8);
    if (this.inspecting && !this.trans) {
      // drag to turn it over, wheel to zoom, let go of the mouse and it spins on its own
      const moved = Math.abs(inp.mouse.dx) + Math.abs(inp.mouse.dy) > 0.5;
      this.idleT = moved ? 0 : this.idleT + dt;
      this.inspectRot.y += inp.mouse.dx * 0.008 + (this.idleT > 0.8 ? dt * 0.9 : 0);
      this.inspectRot.x = Math.max(-1.2, Math.min(1.2, this.inspectRot.x + inp.mouse.dy * 0.008));
      if (inp.mouse.wheel) this.inspectZoom = Math.max(-0.08, Math.min(0.1, this.inspectZoom - inp.mouse.wheel * 0.02));
      const P = POSES.inspect.pos;
      this.item.obj.position.set(P.x, P.y, P.z + this.inspectZoom);
      this.item.obj.quaternion.setFromEuler(this.inspectRot);
    } else if (!this.inspecting && !this.trans) {
      this.spin += dt;
      this.item.obj.rotation.y = POSES.toy.rot.y + Math.sin(this.spin * 0.6) * 0.25;
    }
  }

  drop() {
    const g = this.game;
    const it = this.item;
    if (!it) return;
    const cam = g.camera;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    if (it.kind === 'tool') {
      if (TOOLS[it.data.id]?.keep) { g.news(`Better keep the ${TOOLS[it.data.id].name.toLowerCase()} with you.`); audio.play('error', { vol: 0.3 }); return; }
      const hit = g.placement.surfaceHit(2.2);
      const target = hit && hit.point.y < 1.3 ? hit.point.clone() : g.player.pos.clone().add(new THREE.Vector3(fwd.x, 0, fwd.z).normalize().multiplyScalar(0.6));
      if (!hit) target.y = 0;
      const yaw = g.player.yaw;
      this.putTo(target, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), (obj, rel) => {
        obj.parent?.remove(obj);
        g.items.spawnTool(rel.data, target, yaw);
        audio.play('drop', { vol: 0.5 });
      }, { arc: 0.05, scale: 1 });
      return;
    }
    if (it.kind === 'capsule') {
      const rel = this.release();
      const p = rel.obj.getWorldPosition(new THREE.Vector3());
      rel.obj.parent?.remove(rel.obj);
      g.items.spawnCapsule(rel.data, p, fwd.multiplyScalar(1.4).add(new THREE.Vector3(0, 0.6, 0)));
      audio.play('whoosh', { vol: 0.6, v: 0.1 });
      this.tossed = g.time;
      return;
    }
    // place on the surface under the crosshair if one is close, otherwise in front of the feet
    const hit = g.placement.surfaceHit(2.2);
    if (it.kind === 'toy') {
      const target = hit ? hit.point.clone() : g.player.pos.clone().add(new THREE.Vector3(fwd.x, 0, fwd.z).normalize().multiplyScalar(0.6));
      if (!hit) target.y = 0;
      const yaw = Math.atan2(cam.position.x - target.x, cam.position.z - target.z);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      this.putTo(target, q, (obj, rel) => {
        obj.parent?.remove(obj);
        g.items.spawnToy(rel.data, target, { rotY: yaw, physics: false });
        audio.play('place', { vol: 0.7 });
      });
      return;
    }
    if (it.kind === 'cat') {
      const target = g.player.pos.clone().add(new THREE.Vector3(fwd.x, 0, fwd.z).normalize().multiplyScalar(0.7));
      this.putTo(target, new THREE.Quaternion(), (obj) => { obj.parent?.remove(obj); g.street?.releaseCat(target); }, { arc: 0.05 });
      return;
    }
    if (it.kind === 'box') {
      const target = hit && hit.point.y < 1.2 ? hit.point.clone() : g.player.pos.clone().add(new THREE.Vector3(fwd.x, 0, fwd.z).normalize().multiplyScalar(0.7));
      if (!hit) target.y = 0;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), g.player.yaw);
      this.putTo(target, q, (obj, rel) => {
        g.items.spawnBox(rel.data, target, obj);
        audio.play('drop', { vol: 0.6 });
      }, { arc: 0.05 });
    }
  }
}
