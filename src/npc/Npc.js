// One named person of the lane: a Human (or a voxel creature) with a name, a voice (8-bit blips + a real-voice
// profile), floating lines, waypoint walking (politely waiting when you're in the way), look-at, a default idle
// gesture, a click target (LMB talk, RMB slap) and a memory (src/npc/memory.js). They steer round people and things
// (src/people/crowd.js: smooth starts, stops and turns, no walking through anyone), glance at you and at noises, and
// greet you by the time of day (by name once you've met: src/people/aware.js). Behaviour (where to be, what to say)
// lives in src/npc/Lane.js + roster.js; a chat or a cutscene takes over with npc.talkLock / npc.script.
// Cheap when far: hidden people cost nothing, people far away or off screen animate at a few frames per second.
import * as THREE from 'three';
import { talk } from '../people/voice.js';
import { createCharacter } from './looks.js';
import { profileOf } from '../talk/speech.js';
import { crowdOf } from '../people/crowd.js';
import { awareOf } from '../people/aware.js';

const _p = new THREE.Vector3(), _lookTmp = new THREE.Vector3();
const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// how the cast greet you in passing ({w}: the word for the hour, {name}: yours); false: they have their own hello
const GREET = {
  rohan: ['Hm.', null, null, '...{name}.'], josuke: false, okuyasu: false,
  hatoda: ['{w} {name}-kun. Coo.', 'Ah, {name}-kun! {w}'], kuromaru: ['...{w}, mortal {name}.', 'The shadows greet you, {name}.'],
  gomuzo: ['Yo! {name}!', 'Oi, {name}! Got any meat?'], yabuki: ['(...act natural, {name}.)', null], kusaka: ['{w}, {name}-san!', '{w}! Lovely day for moss.'],
  gonta: ['Hey {name}! I didn\'t do it!', '{w}! Hehehe.'], tanaka: ['Ara, {name}-chan! {w}!', 'Oh, {name}-chan! Have you eaten?'], ota: ['{w}. Rent\'s on the 27th.', 'Hmph. {w}, {name}-san.'],
  mori: ['{W}, {NAME}-SAN!'], kimura: ['{w}, {name}-san! Neighbour!'], officer: false,
};

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
    // steering + awareness
    this.crowd = crowdOf(game);
    this.a = this.crowd.agent(this.h.root.position, { r: def.yokai ? 0.3 : 0.25, kind: 'npc', owner: this });
    const r = this.h.root, gr = GREET[def.id];
    this.aw = awareOf(game).add({
      h: this.isHuman ? this.h : null, pos: r.position, yaw: () => r.rotation.y, npc: true, local: !def.yokai, polite: false,
      young: ['josuke', 'okuyasu', 'gonta'].includes(def.id),
      busy: () => !this.present || this.busy || !!this.staff || this.activity === 'door' || !!def.yokai,
      say: (text, style) => this.say(text, { style }),
      canGesture: () => this.isHuman && !this.h.currentGesture,
      met: () => !!game.state.npcs?.met?.[def.id],
      greetChance: gr === false ? 0 : undefined,
      greet: (w, name, met) => {
        if (gr === false) return null;
        if (!met) return pick([w, null]); // a stranger: the word for the hour, or just a nod
        const t = pick(Array.isArray(gr) ? gr : ['{w}, {name}-san.', 'Ah, {name}-san. {w}', '{w}']);
        return t ? t.replace('{w}', w).replace('{name}', name).replace('{W}', w.toUpperCase()).replace('{NAME}', name.toUpperCase()) : null;
      },
    });
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

  place(pos, yaw = this.yaw) { this.h.root.position.set(pos.x, pos.y || 0, pos.z); this.h.root.rotation.y = yaw; this.faceYaw = yaw; this.path = []; this.h.hasPrev = false; if (this.a) { this.a.vel.x = this.a.vel.z = 0; this.a.speed = 0; } }
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
    if (this.a) { this.a.hidden = !on; this.a.vel.x = this.a.vel.z = 0; this.a.speed = 0; }
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
    const g = this.game, r = this.h.root, pl = g.player.pos, C = this.crowd, a = this.a;
    this.wait = Math.max(0, this.wait - dt);
    let speed = 0;
    const tgt = this.talkLock ? null : this.path[0];
    if (tgt && !this.wait) {
      // scripted (a cutscene) or a ghost: no avoidance, but still smooth
      const inside = Math.abs(r.position.x) < 4 && r.position.z < 5.1 && r.position.z > -5;
      // front gardens and passages off the lane: their own way home (no crowd there to steer round)
      const P0 = r.position, mk = P0.x < -9.4 && P0.x > -15.5 && P0.z > 14.8;
      const yard = !inside && !mk && (P0.z < 5.5 || P0.z > 14.75) && Math.abs(P0.x) < 26;
      // a cutscene or a ghost / ninja on the staff: straight through; a garden gate, a bush: through things only
      const free = this.script || g.cutscene?.active || this.staff && this.ghost ? true : this.ghost || yard || this.inBush ? 'things' : false;
      const res = C.step(a, dt, { target: tgt, final: this.path.length === 1, speed: this.walkSpeed || this.speed, ghost: free, tight: inside, arrive: 0.12, corner: inside ? 0.35 : 0.5 });
      if (res.corner || res.arrived) {
        this.path.shift();
        if (!this.path.length) { const f = this.onArrive; this.onArrive = null; f?.(this); }
      }
      if (res.blockedBy === C.playerAgent) this.blocked = (this.blocked || 0) + dt; else this.blocked = 0;
      speed = a.speed;
      a.mobile = true;
    } else { C.idle(a, dt); speed = a.speed > 0.05 ? a.speed : 0; a.mobile = a.speed > 0.15; }
    a.anchor = !!(this.talkLock || this.script || this.inBush || this.h.seated || this.knocking || this.machine);
    a.noPush = !!this.inBush || !!this.h.seated;
    C.turn(a, r, dt, tgt && !this.wait ? null : this.faceYaw);
    this.moving = speed;
    // animation: full rate near / in a chat, a few frames a second far away or off screen
    const adt = this.lod(dt);
    if (adt <= 0) return;
    if (this.baseGesture && this.isHuman && !this.h.currentGesture && !this.noBase && !speed) this.h.gesture(this.baseGesture);
    let look = null;
    const gl = this.talkLock || this.script ? null : g.aware?.glance(this.aw);
    if (this.talkLock) look = _lookTmp.set(pl.x, g.player.eye, pl.z);
    else if (gl && (this.aw.glPri >= 1 || !this.look || this.look === 'player')) look = gl;
    else if (this.look === 'player') look = g.camera.position;
    else if (this.look?.isVector3) look = this.look;
    else if (this.look?.h?.headTop) look = this.look.h.headTop(_lookTmp);
    this.h.update(adt, { speed, lookAt: look, talking: this.talking });
  }

  dispose() { this.game.interaction.remove(this.hit); this.crowd.remove(this.a); this.game.aware?.remove(this.aw); this.h.dispose?.(); }
}
