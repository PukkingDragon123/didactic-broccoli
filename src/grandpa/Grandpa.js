// Grandpa in person: a low-poly old man (the people system's 'gramps' preset: flat cap, thick glasses, a white
// moustache, a brown cardigan, slacks, sandals, a stoop) with his own voxel cane in the left hand (its rubber foot
// planted on the ground, tilting as he walks), a paper fan for the heat, a stool he sits on while he waits, an old
// man's pace along A* paths round whatever is in the way (src/grandpa/nav.js), a slow low 8-bit voice and a real one.
//   gp.goTo(pos, { face, speed }) -> Promise (true once there)   gp.sitDown() / gp.standUp() -> Promise
//   gp.say(text, { dur, wait }) -> Promise   gp.act(name, dur)   gp.lookAt = Vector3 | 'player' | null
//   gp.hold(propMesh | null) (something in his right hand)   gp.place(pos, yaw)   gp.setVisible(on)
import * as THREE from 'three';
import { createHuman, Human } from '../people/index.js';
import { makeSpec } from '../people/presets.js';
import { audio } from '../core/audio.js';
import { caneMesh, fanMesh, CANE_LEN } from './props.js';
import { VOICE, TTS, NAME_TAG } from './data.js';
import './poses.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

/** His slow, low chiptune voice: a chirp every third letter, the odd one a little lower (he mumbles). */
export function gpVoice(vol = 1) {
  let n = 0;
  return (ch) => {
    if (!/[a-z0-9]/i.test(ch)) return;
    if (n++ % 3) return;
    try { audio.play('voice', { ch, base: VOICE.base - (n % 7 === 0 ? 14 : 0), duty: VOICE.duty, vol: VOICE.vol * vol }); } catch { /* audio not ready */ }
  };
}

/** The 'gramps' preset; young = the shop owner of 1978 in the flashback (dark hair, straight back, no cane). */
export function buildGrandpaHuman({ young = false } = {}) {
  if (!young) { const h = createHuman({ preset: 'gramps', seed: 1937 }); h.finishPaint?.(); return h; }
  const spec = makeSpec('gramps', 1937);
  spec.hair = { ...spec.hair, col: [52, 46, 44], grey: 0, hi: [120, 118, 130] };
  spec.face = { ...spec.face, wrinkles: 0, spots: 0 };
  spec.walk = { style: 'normal' };
  spec.top = { kind: 'polo', col: [214, 206, 182], sleeve: 'short' };
  spec.acc = [{ kind: 'apron', col: [52, 64, 96], col2: [236, 232, 220] }];
  spec.H = 1.66;
  const h = new Human(spec, { lazy: false });
  return h;
}

export class Grandpa {
  constructor(game) {
    this.game = game;
    this.name = NAME_TAG;
    this.color = '#e8c070';
    const h = this.h = buildGrandpaHuman();
    h.ownSlapLines = true;
    h.tts = TTS;
    h.root.name = 'grandpa';
    game.scene.add(h.root);
    this.tts = TTS;
    this.voice = gpVoice();
    // the cane (in the world, solved each frame from his left hand to the ground) and the fan (in his right hand)
    this.cane = caneMesh();
    this.cane.name = 'grandpa-cane';
    game.scene.add(this.cane);
    this.caneMode = 'hand'; // 'hand' | 'lean' (propped somewhere: caneAt = { pos, dir })
    this.caneAt = null;
    this.fan = fanMesh();
    this.fan.visible = false;
    this.fan.rotation.set(Math.PI / 2, 0, 0);
    this.fan.position.set(0, -0.06 * h.P.H / 1.72, -0.035);
    h.b.handR.add(this.fan);
    this.handProp = null;
    // a click / slap target (steadier than the skinned mesh)
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.56, h.height * 0.96, 0.5), proxyMat);
    box.position.y = h.height * 0.48;
    box.name = 'grandpa-hit';
    box.userData.human = h;
    box.userData.grandpa = this;
    h.root.add(box);
    this.hit = box;
    h.mesh.raycast = () => {};
    // movement
    this.path = [];
    this.speed = 0.58;
    this.moving = 0;
    this.faceYaw = null;
    this.onArrive = null;
    this.waitT = 0;
    this.blockedT = 0;
    this.lookAt = null; // Vector3 | 'player' | null
    // pose
    this.po = { k: 0, act: null, at: 0, prev: null, pt: 0, walking: false, cane: 'hand', fan: false, target: null, seat: 0.45 };
    this.actLeft = 0;
    this.sitting = false; // on (or getting onto) the stool
    this.sitT = 0;
    this.pose = null;
    this.setPose('gp_stand');
    this.stepD = 0;
    this.visible = true;
  }

  get pos() { return this.h.root.position; }
  get yaw() { return this.h.root.rotation.y; }
  get walking() { return this.path.length > 0; }
  headTop(out = new THREE.Vector3()) { return this.h.headTop(out); }
  head(out = new THREE.Vector3()) { this.h.headTop(out); out.y -= 0.3; return out; }
  distTo(p) { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }
  get playerDist() { return this.distTo(this.game.player.pos); }

  setPose(name) {
    if (this.pose === name) return;
    this.pose = name;
    this.h.gesture(name, this.po);
  }

  setVisible(on) {
    this.visible = on;
    this.h.root.visible = on;
    this.cane.visible = on;
    this.hit.layers.set(on ? 0 : 31);
    if (!on) this.game.bubbles?.clear(this.h);
  }

  place(pos, yaw = this.yaw) {
    this.h.root.position.set(pos.x, 0, pos.z);
    this.h.root.rotation.y = yaw;
    this.faceYaw = yaw;
    this.path = [];
    this.onArrive?.(false);
    this.onArrive = null;
    this.h.hasPrev = false;
    this.h.prevYaw = null;
  }

  faceTo(p) { this.faceYaw = typeof p === 'number' ? p : Math.atan2(p.x - this.pos.x, p.z - this.pos.z); }

  /** Walk there along a path (resolves true on arrival, false when interrupted). */
  goTo(target, { face = null, speed = null, direct = false } = {}) {
    if (this.sitting) this.standUp();
    const nav = this.game.grandpa?.nav;
    const to = target.clone().setY(0);
    const pts = direct || !nav ? [to] : nav.path(this.pos, to);
    this.onArrive?.(false);
    this.path = pts;
    this.walkSpeed = speed || this.speed;
    this.faceYaw = face;
    this.blockedT = 0;
    return new Promise((res) => { this.onArrive = res; });
  }

  stop() { this.path = []; const f = this.onArrive; this.onArrive = null; f?.(false); }

  /** Sit down on whatever is behind him (his stool): eases down over ~1.2 s. */
  sitDown({ seat = 0.45 } = {}) {
    this.stop();
    this.po.seat = seat;
    this.sitting = true;
    this.setPose('gp_sit');
    audio.play('stoolCreak', { pos: this.pos, vol: 0.7, delay: 0.7 });
    return this.game.grandpa.wait(1.3);
  }

  standUp() {
    if (!this.sitting) return Promise.resolve();
    this.sitting = false;
    this.po.fan = false;
    return this.game.grandpa.wait(1.1);
  }

  /** A right-arm action for `dur` seconds (Infinity: until the next one; null: back to rest). */
  act(name, dur = 2.2, target = null) {
    const o = this.po;
    if (o.act !== name) { o.prev = o.act; o.pt = o.at; o.at = 0; }
    o.act = name;
    if (target) o.target = target.clone ? target.clone() : target;
    this.actLeft = dur;
    if (name === 'fan') this.fan.visible = true;
  }

  expr(name, hold = 2.5) { this.h.setExpression(name, hold); }

  /** Something in his right hand (a key ring, his notebook...), or null. */
  hold(obj, { pos = [0, -0.07, 0.02], rot = [0, 0, 0] } = {}) {
    if (this.handProp) this.handProp.removeFromParent();
    this.handProp = obj || null;
    if (obj) { obj.position.set(...pos); obj.rotation.set(...rot); this.h.b.handR.add(obj); }
  }

  /** A floating line over his head in his voice (and his real voice when nobody else is talking). */
  say(text, { dur, wait = false, big = false, style = 'say' } = {}) {
    const g = this.game, B = g.bubbles;
    if (!B || !this.visible) return Promise.resolve();
    const d = dur ?? Math.max(2.6, 1.4 + String(text).length * 0.06);
    B.say(this.h, text, { dur: d, style, onChar: this.voice, cps: 26, big, name: big ? this.name : undefined, color: big ? this.color : undefined });
    // (lines in the lane are voiced by the bubbles' own speech hook; cutscene lines here)
    if (big && g.speech?.enabled && !g.talk?.active) g.speech.speak(text, TTS, { priority: 'talk' });
    this.talkT = d;
    return wait ? g.grandpa.wait(Math.min(d, 1 + text.length / 26 + 0.8)) : Promise.resolve();
  }

  get talking() { return !!this.game.bubbles?.isTalking?.(this.h) || this.talkT > 0; }

  update(dt) {
    if (!this.visible) return;
    const g = this.game, r = this.h.root, pl = g.player.pos, o = this.po;
    this.talkT = Math.max(0, (this.talkT || 0) - dt);
    // the arm action runs out
    o.at += dt;
    if (this.actLeft !== Infinity) { this.actLeft -= dt; if (this.actLeft <= 0 && o.act) { o.prev = o.act; o.pt = o.at; o.at = 0; o.act = null; } }
    // the fan's out while he fans himself (an act, or idling on his stool)
    this.fan.visible = o.act === 'fan' || (o.fan && this.sitT > 0.5 && !o.act) || (o.prev === 'fan' && o.at < 0.3);
    // sitting: ease down / up; standing back up switches to the standing pose once he's up
    this.sitT = THREE.MathUtils.clamp(this.sitT + (this.sitting ? dt : -dt) / 1.1, 0, 1);
    o.k = this.sitT;
    if (!this.sitting && this.sitT <= 0 && this.pose === 'gp_sit') this.setPose('gp_stand');
    // walking
    let speed = 0;
    const tgt = this.talkLock || this.sitT > 0 ? null : this.path[0];
    this.waitT = Math.max(0, this.waitT - dt);
    if (tgt && !this.waitT) {
      _v.subVectors(tgt, r.position).setY(0);
      const d = _v.length();
      const ahead = Math.hypot(pl.x - (r.position.x + (_v.x / (d || 1)) * 0.5), pl.z - (r.position.z + (_v.z / (d || 1)) * 0.5));
      if (ahead < 0.42 && !g.cutscene?.active && !this.ghost && this.blockedT < 2.5) { this.waitT = 0.4; this.blockedT += 0.4; if (this.blockedT > 1.1 && this.blockedT < 1.6) this.game.grandpa?.director?.blocked(); }
      else if (d < 0.08) {
        this.path.shift();
        if (!this.path.length) { const f = this.onArrive; this.onArrive = null; f?.(true); }
      } else {
        const want = Math.atan2(_v.x, _v.z), turn = wrap(want - r.rotation.y);
        r.rotation.y += turn * Math.min(1, dt * 5);
        // an old man turns before he walks off
        const go = Math.max(0, Math.cos(turn)) ** 2;
        speed = (this.walkSpeed || this.speed) * go;
        r.position.addScaledVector(_v.normalize(), Math.min(d, speed * dt));
      }
    } else if (this.faceYaw !== null && !tgt) {
      r.rotation.y += wrap(this.faceYaw - r.rotation.y) * Math.min(1, dt * 3.5);
    }
    this.moving = speed;
    o.walking = speed > 0.05;
    // the cane taps as he walks
    if (speed > 0.05) { this.stepD += speed * dt; if (this.stepD > 0.62) { this.stepD = 0; audio.play('caneTap', { pos: this.pos, vol: 0.5 }); } }
    // look: you, a point, or ahead
    let look = null;
    if (this.talkLock || this.lookAt === 'player') look = _w.set(pl.x, g.player.eye, pl.z);
    else if (this.lookAt?.isVector3) look = this.lookAt;
    // a mild smile is his resting face
    const h = this.h;
    if (h.expr === 'neutral' && !(h.exprHold > 0)) h.setExpression('smile', 0);
    this.h.update(dt, { speed, lookAt: look, talking: this.talking });
    this.updateCane(dt);
  }

  /** The cane: from his left hand's grip to a foot planted on the ground (forward-left of him), or propped up. */
  updateCane() {
    const c = this.cane;
    if (this.caneMode === 'lean' && this.caneAt) {
      c.position.copy(this.caneAt.pos);
      _w.copy(this.caneAt.dir).normalize();
      _q.setFromUnitVectors(DOWN, _w);
      _q2.setFromAxisAngle(_up, this.caneAt.yaw || 0);
      c.quaternion.copy(_q).multiply(_q2);
      return;
    }
    const h = this.h, hand = h.b.handL;
    hand.updateWorldMatrix(true, false);
    const grip = hand.localToWorld(_v.set(0, -0.055 * h.P.H / 1.72, 0.01));
    const yaw = this.yaw;
    const L = CANE_LEN;
    const y = Math.max(0.05, grip.y);
    // where the foot goes: forward and out to his left
    _w.set(Math.sin(yaw) * 0.55 + Math.cos(yaw) * 0.45, 0, Math.cos(yaw) * 0.55 - Math.sin(yaw) * 0.45).normalize();
    let dir;
    if (y >= L) dir = DOWN;
    else { const r = Math.sqrt(L * L - y * y); dir = _w.multiplyScalar(r).setY(-y).normalize(); }
    c.position.copy(grip);
    _q.setFromUnitVectors(DOWN, dir);
    _q2.setFromAxisAngle(_up, yaw);
    c.quaternion.copy(_q).multiply(_q2);
  }

  dispose() {
    this.game.interaction.remove(this.hit);
    this.cane.removeFromParent();
    this.h.dispose();
  }
}
