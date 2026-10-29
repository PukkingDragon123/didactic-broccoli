// One lane regular: a Human with a voice, speech bubbles, a home spot, waypoint walking (politely waiting when you're
// in the way), look-at, a default "carry" gesture and a talk handler. Behaviour (where to go, what to say) lives in
// Cast.js; cutscenes take over with npc.script = true (the controller then only animates).
import * as THREE from 'three';
import { talk } from '../people/voice.js';
import { createCharacter } from './looks.js';

const _d = new THREE.Vector3();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Npc {
  /** o: { id, name, color, voice: { base, duty }, base: gesture name kept up while idle, speed } */
  constructor(game, group, o) {
    this.game = game;
    this.id = o.id;
    this.name = o.name;
    this.color = o.color;
    this.h = createCharacter(o.id);
    this.h.root.name = 'npc:' + o.id;
    group.add(this.h.root);
    this.voice = talk(this.h, { ...(o.voice || {}) });
    this.baseGesture = o.base || null;
    this.speed = o.speed || 1.15;
    this.path = [];
    this.wait = 0;
    this.moving = 0; // current walking speed (for the gait)
    this.look = null; // Vector3 | 'player' | null
    this.faceYaw = null; // yaw to turn toward when standing
    this.script = false; // a cutscene drives this one
    this.excused = 0;
    this.onArrive = null;
  }

  get pos() { return this.h.root.position; }
  get yaw() { return this.h.root.rotation.y; }

  /** Speech bubble with this character's voice. style: 'say' | 'shout' | 'think'. */
  say(text, { dur, style = 'say' } = {}) {
    const b = this.game.bubbles;
    if (!b) return;
    b.say(this.h, text, { dur: dur ?? Math.max(2.4, 1.2 + text.length * 0.055), style, onChar: this.voice });
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

  place(pos, yaw) { this.h.root.position.set(pos.x, 0, pos.z); this.h.root.rotation.y = yaw; this.faceYaw = yaw; this.path = []; this.h.hasPrev = false; }
  /** Turn toward a point (or a yaw) while standing. */
  faceTo(p) { this.faceYaw = typeof p === 'number' ? p : Math.atan2(p.x - this.pos.x, p.z - this.pos.z); }

  gesture(name, opts) { this.h.gesture(name, opts); }
  expr(name, hold = 2.5) { this.h.setExpression(name, hold); }

  distTo(p) { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }
  get playerDist() { return this.distTo(this.game.player.pos); }

  update(dt) {
    const g = this.game, r = this.h.root, pl = g.player.pos;
    this.wait = Math.max(0, this.wait - dt);
    let speed = 0;
    const tgt = this.path[0];
    if (tgt && !this.wait) {
      _d.subVectors(tgt, r.position).setY(0);
      const d = _d.length();
      // don't walk through the player: pause, say sorry (once in a while)
      const ahead = Math.hypot(pl.x - (r.position.x + (_d.x / (d || 1)) * 0.55), pl.z - (r.position.z + (_d.z / (d || 1)) * 0.55));
      if (ahead < 0.5 && !this.script && !g.cutscene?.active) { this.wait = 0.5; this.blocked = (this.blocked || 0) + 0.5; }
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
    // keep the default carry / stance going while nothing else plays
    if (this.baseGesture && !this.h.currentGesture && !this.noBase) this.h.gesture(this.baseGesture);
    let look = null;
    if (this.look === 'player') look = g.camera.position;
    else if (this.look?.isVector3) look = this.look;
    else if (this.look?.h) look = this.look.h.headTop(_lookTmp).setY(this.look.h.height - 0.1 + this.look.pos.y);
    this.h.update(dt, { speed, lookAt: look, talking: this.talking });
  }

  dispose() { this.game.interaction.remove(this.h.root); this.h.dispose(); }
}
const _lookTmp = new THREE.Vector3();
