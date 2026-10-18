// The one item you carry: floats in front of the camera (no hands), sways with movement,
// can be inspected (RMB), dropped (Q), and handed over to targets with smooth arcs.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { damp, ease } from '../core/util.js';
import { tagCard } from './labels.js';
import { OPENERS } from './economy.js';

const POSES = {
  capsule: { pos: new THREE.Vector3(0.15, -0.135, -0.34), rot: new THREE.Euler(0.25, 0.4, 0.1) },
  toy: { pos: new THREE.Vector3(0.13, -0.13, -0.32), rot: new THREE.Euler(0.12, -0.35, 0) },
  box: { pos: new THREE.Vector3(0.02, -0.3, -0.55), rot: new THREE.Euler(0.15, 0.2, 0) },
  tool: { pos: new THREE.Vector3(0.2, -0.26, -0.46), rot: new THREE.Euler(-0.75, 0.55, 0.3) },
  inspect: { pos: new THREE.Vector3(0, -0.005, -0.24), rot: new THREE.Euler(0.1, 0, 0) },
  reveal: { pos: new THREE.Vector3(0, -0.01, -0.3), rot: new THREE.Euler(0.05, 0, 0) },
  pet: { pos: new THREE.Vector3(0.02, -0.34, -0.55), rot: new THREE.Euler(0.1, Math.PI + 0.3, 0) },
};

export class Held {
  constructor(game) {
    this.game = game;
    this.anchor = new THREE.Group();
    game.camera.add(this.anchor);
    this.item = null; // {kind, data, obj, ent?}
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

  get kind() { return this.item?.kind || null; }

  take(kind, data, obj, opts = {}) {
    this.item = { kind, data, obj, ent: opts.ent || null };
    obj.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    this.anchor.attach(obj);
    this.pose = kind === 'capsule' ? 'capsule' : kind === 'toy' ? 'toy' : kind === 'tool' ? 'tool' : kind === 'cat' ? 'pet' : 'box';
    // miniatures are shown a little larger in hand so you can admire the detail
    this.holdScale = kind === 'toy' ? 1.55 : kind === 'capsule' ? 1.2 : opts.pose === 'tool' ? 0.6 : 1;
    this.startTrans(opts.pose || this.pose, opts.dur ?? 0.32);
    this.twist = 0;
    if (kind === 'toy') this.attachTag(data, opts.isNew);
    else this.removeTag();
    this.game.events.emit('held', this.item);
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

  startTrans(poseName, dur = 0.3) {
    const obj = this.item.obj;
    const P = POSES[poseName];
    this.trans = {
      fromP: obj.position.clone(), fromQ: obj.quaternion.clone(), fromS: obj.scale.x,
      toP: P.pos.clone(), toQ: new THREE.Quaternion().setFromEuler(P.rot), toS: (poseName === 'inspect' ? 1.25 : 1) * (this.holdScale || 1), t: 0, dur,
    };
    this.pose = poseName;
  }

  /** Remove the item from the hand and return it (world transform preserved). */
  release() {
    if (!this.item) return null;
    const it = this.item;
    this.game.scene.attach(it.obj);
    it.obj.traverse((m) => { if (m.isMesh && !m.userData.isRim) m.castShadow = true; });
    this.item = null;
    this.trans = null;
    this.inspecting = false;
    this.twist = 0;
    this.removeTag();
    this.game.player.lookLocked = false;
    this.game.events.emit('held', null);
    return it;
  }

  /**
   * Fly the held object to a world transform, then call done(obj). parent: optional Object3D to attach to.
   */
  putTo(worldPos, worldQuat, done, { dur = 0.38, arc = 0.08, parent = null, scale = null } = {}) {
    const it = this.release();
    if (!it) return;
    const obj = it.obj;
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
    if (it.kind === 'capsule') return { key: 'Hold L', text: 'ひねって開ける · Twist open', sub: 'Q drop' };
    if (it.kind === 'toy') return { key: 'R', text: 'じっくり見る · Inspect', sub: 'Place it on a shelf, sell it, or Q to set down' };
    if (it.kind === 'box') return this.game.placement?.boxHint(it) || { key: 'Q', text: '置く · Put down' };
    if (it.kind === 'cat') return { key: 'L', text: 'なでる ・ Q おろす' };
    return null;
  }

  /** left click with nothing targeted: boxes (furniture, roller) act on the world */
  primary() {
    const it = this.item;
    if (it?.kind === 'box' && !this.busy) this.game.placement.primary?.(it);
    if (it?.kind === 'cat') this.game.street?.pet();
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
    const bob = g.player.bobT;
    const moving = Math.min(1, Math.hypot(g.player.vel.x, g.player.vel.z) / 2.4);
    this.anchor.position.set(this.sway.x + Math.cos(bob) * 0.004 * moving, this.sway.y + Math.abs(Math.sin(bob)) * 0.006 * moving, 0);

    const it = this.item;
    if (!it) return;
    const obj = it.obj;

    if (this.trans) {
      const tr = this.trans;
      tr.t += dt;
      const k = ease.outCubic(Math.min(1, tr.t / tr.dur));
      obj.position.lerpVectors(tr.fromP, tr.toP, k);
      obj.quaternion.slerpQuaternions(tr.fromQ, tr.toQ, k);
      if (!this.busy) obj.scale.setScalar(tr.fromS + (tr.toS - tr.fromS) * k);
      if (tr.t >= tr.dur) this.trans = null;
    }
    if (this.busy || !inp.locked || g.pc?.active) return;

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
      }
      this.twist += dt / openTime;
    } else {
      if (this.twisting) g.reveal.stopTool();
      this.twisting = false;
      this.twist = Math.max(0, this.twist - dt * 2.5);
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
    if (it.kind === 'capsule') {
      const rel = this.release();
      const p = rel.obj.getWorldPosition(new THREE.Vector3());
      rel.obj.parent?.remove(rel.obj);
      g.items.spawnCapsule(rel.data, p, fwd.multiplyScalar(1.4).add(new THREE.Vector3(0, 0.6, 0)));
      audio.play('whoosh', { vol: 0.6, v: 0.1 });
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
