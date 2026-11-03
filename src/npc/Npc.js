// One named person of the lane: a Human (or a voxel creature) with a name, a voice (8-bit blips + a real-voice
// profile), floating lines, waypoint walking (politely waiting when you're in the way), look-at, a default idle
// gesture, a click target (LMB talk, RMB slap) and a memory (src/npc/memory.js). Behaviour (where to be, what to say)
// lives in src/npc/Lane.js + roster.js; a chat or a cutscene takes over with npc.talkLock / npc.script.
// Cheap when far: hidden people cost nothing, people far away or off screen animate at a few frames per second.
import * as THREE from 'three';
import { talk } from '../people/voice.js';
import { createCharacter } from './looks.js';
import { profileOf } from '../talk/speech.js';

const _d = new THREE.Vector3(), _p = new THREE.Vector3(), _lookTmp = new THREE.Vector3();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

export class Npc {
  /**
   * def: { id, name, color, voice: { base, duty, vol }, tts: { pitch, rate, gender }, base: idle gesture,
   *        speed, build(): Human | { root, headTop, update } (default: createCharacter(def.look || id)), seed, height }
   */
  constructor(game, group, def) {
    this.game = game;
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.color = def.color || '#ffd23f';
    this.h = def.build ? def.build(def) : createCharacter(def.look || def.id, { seed: def.seed ?? 7, height: def.height });
    this.h.ownSlapLines = true; // the lane (Lane.onSlap) gives them their own reaction to a slap
    this.isHuman = !!this.h.spec;
    this.h.root.name = 'npc:' + def.id;
    group.add(this.h.root);
    this.voice = talk(this.isHuman ? this.h : null, { ...(def.voice || {}) });
    this.tts = { ...(this.isHuman ? profileOf(this.h) : { gender: 'x', pitch: 1, rate: 1, seed: 5 }), ...(def.tts || {}) };
    this.h.tts = this.tts; // the speech hook on game.bubbles reads it
    this.baseGesture = def.base || null;
    this.speed = def.speed || 1.15;
    this.path = [];
    this.wait = 0;
    this.moving = 0;
    this.look = null; // Vector3 | 'player' | Npc | null
    this.faceYaw = null;
    this.script = false; // a cutscene drives this one
    this.talkLock = false; // a chat is running with them
    this.present = true;
    this.onArrive = null;
    this.acc = 0; // LOD dt accumulator
    this.lodT = Math.random() * 0.3;
    // click target: a simple box (cheaper and steadier to hit than the skinned mesh)
    const H = this.h.height || def.hitH || 1.6;
    const box = new THREE.Mesh(new THREE.BoxGeometry(def.hitW || 0.56, H * 0.96, def.hitW || 0.5), proxyMat);
    box.position.y = H * 0.48;
    box.name = 'npc-hit';
    if (this.isHuman) box.userData.human = this.h; // FPBody's slap finds who it hit through this
    box.userData.npc = this;
    this.h.root.add(box);
    this.hit = box;
    this.h.root.userData.npc = this;
    if (this.isHuman) this.h.mesh.raycast = () => {};
  }

  get pos() { return this.h.root.position; }
  get yaw() { return this.h.root.rotation.y; }
  get busy() { return this.talkLock || this.script; }

  /** A floating line in this character's voice. style: 'say' | 'shout' | 'think'. */
  say(text, { dur, style = 'say' } = {}) {
    const b = this.game.bubbles;
    if (!b || !this.present) return null;
    return b.say(this.h, text, { dur: dur ?? Math.max(2.4, 1.2 + String(text).length * 0.055), style, onChar: this.voice });
  }
  get talking() { return !!this.game.bubbles?.isTalking?.(this.h); }

  /** Walk through points (Vector3 / [x, z]); then() when the last one is reached. */
  walk(points, { speed, then = null, face = null } = {}) {
    this.path = points.map((p) => (p.isVector3 ? p.clone().setY(0) : new THREE.Vector3(p[0], 0, p[1])));
    this.walkSpeed = speed || this.speed;
    this.onArrive = then;
    this.faceYaw = face;
  }
  stop() { this.path = []; this.onArrive = null; }
  get walking() { return this.path.length > 0; }

  place(pos, yaw = this.yaw) { this.h.root.position.set(pos.x, pos.y || 0, pos.z); this.h.root.rotation.y = yaw; this.faceYaw = yaw; this.path = []; this.h.hasPrev = false; }
  /** Turn toward a point (or a yaw) while standing. */
  faceTo(p) { this.faceYaw = typeof p === 'number' ? p : Math.atan2(p.x - this.pos.x, p.z - this.pos.z); }

  gesture(name, opts) { this.h.gesture?.(name, opts); }
  expr(name, hold = 2.5) { this.h.setExpression?.(name, hold); }
  clearGesture() { this.h.clearGesture?.(); }

  distTo(p) { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }
  get playerDist() { return this.distTo(this.game.player.pos); }

  /** Show / hide (at home, indoors): hidden people are skipped entirely. */
  setPresent(on) {
    if (this.present === on) return;
    this.present = on;
    this.h.root.visible = on;
    this.hit.userData.disabled = !on;
    this.hit.layers.set(on ? 0 : 31); // hidden people can't be clicked or slapped (rays only test layer 0)
    if (!on) { this.stop(); this.game.bubbles?.clear(this.h); }
    this.h.hasPrev = false;
  }

  /** On screen and near enough to be worth animating every frame? */
  lod(dt) {
    const g = this.game, d = this.playerDist;
    if (this.talkLock || d < 9) return dt;
    this.lodT -= dt;
    this.acc += dt;
    _p.copy(this.pos); _p.y += 1;
    const v = _p.project(g.camera);
    const onScreen = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.2;
    const every = !onScreen ? 0.5 : d > 30 ? 0.25 : d > 18 ? 0.1 : 0.05;
    if (this.lodT > 0) return 0;
    this.lodT = every;
    const a = this.acc; this.acc = 0;
    return Math.min(a, 0.1);
  }

  update(dt) {
    if (!this.present) return;
    const g = this.game, r = this.h.root, pl = g.player.pos;
    this.wait = Math.max(0, this.wait - dt);
    let speed = 0;
    const tgt = this.talkLock ? null : this.path[0];
    if (tgt && !this.wait) {
      _d.subVectors(tgt, r.position).setY(0);
      const d = _d.length();
      // don't walk through the player: pause (and the lane may make them say sorry)
      const ahead = Math.hypot(pl.x - (r.position.x + (_d.x / (d || 1)) * 0.55), pl.z - (r.position.z + (_d.z / (d || 1)) * 0.55));
      if (ahead < 0.5 && !this.script && !g.cutscene?.active && !this.ghost) { this.wait = 0.5; this.blocked = (this.blocked || 0) + 0.5; }
      else if (d < 0.12) {
        this.path.shift();
        if (!this.path.length) { const f = this.onArrive; this.onArrive = null; f?.(this); }
      } else {
        this.blocked = 0;
        speed = this.walkSpeed || this.speed;
        const step = Math.min(d, speed * dt);
        r.position.addScaledVector(_d.normalize(), step);
        const want = Math.atan2(_d.x, _d.z);
        r.rotation.y += wrap(want - r.rotation.y) * Math.min(1, dt * 7);
      }
    } else if (this.faceYaw !== null && !tgt) {
      r.rotation.y += wrap(this.faceYaw - r.rotation.y) * Math.min(1, dt * 4);
    }
    this.moving = speed;
    // animation: full rate near / in a chat, a few frames a second far away or off screen
    const adt = this.lod(dt);
    if (adt <= 0) return;
    if (this.baseGesture && this.isHuman && !this.h.currentGesture && !this.noBase && !speed) this.h.gesture(this.baseGesture);
    let look = null;
    if (this.talkLock) look = _lookTmp.set(pl.x, g.player.eye, pl.z);
    else if (this.look === 'player') look = g.camera.position;
    else if (this.look?.isVector3) look = this.look;
    else if (this.look?.h?.headTop) look = this.look.h.headTop(_lookTmp);
    this.h.update(adt, { speed, lookAt: look, talking: this.talking });
  }

  dispose() { this.game.interaction.remove(this.hit); this.h.dispose?.(); }
}
