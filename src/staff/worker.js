// One member of staff (or an applicant come for an interview) in the world: an Npc (src/npc/Npc.js: name, 8-bit voice,
// floating lines, waypoint walking, LOD) built from their look, plus a small coroutine runner for the job at hand
// (tasks.js), the things they carry (a carton on the chest, a broom or a trash bag in the hand), their shift (walk in
// from the lane, work, walk home) and the quirks that make each one themselves.
//
//   new Worker(staff, rec, { visitor })   rec: the staff (or applicant) record in game.state.staff
//   w.spawn(pos, yaw) / w.despawn()       w.present   w.npc   w.h (Human)
//   w.run(generator)  w.goTo(vec3, yaw) -> waiter   w.wait(sec) -> waiter   w.until(fn) -> waiter
//   w.carry(obj) / w.drop() (in front, both hands)  w.hold(obj, how) / w.unhold() (right hand)
//   w.say(text, opts)  w.log(text)  w.slow (task time multiplier)  w.speed (m/s)
import * as THREE from 'three';
import { Npc } from '../npc/Npc.js';
import { buildPerson } from './looks.js';
import { route, inGarage } from './nav.js';
import { audio } from '../core/audio.js';

const _v = new THREE.Vector3();
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Worker {
  constructor(staff, rec, { visitor = false } = {}) {
    this.staff = staff;
    this.game = staff.game;
    this.rec = rec;
    this.visitor = visitor;
    this.npc = null;
    this.state = 'off'; // off | coming | working | leaving | waiting (interview) | gone
    this.gen = null; this.cur = null;
    this.time = 0;
    this.job = null;
    this.carried = null; this.inHand = null;
    this.nextT = 1;
    this.mood = null; // current idle behaviour { kind, until }
  }

  get id() { return this.rec.id; }
  get name() { return this.rec.given || this.rec.name; }
  get present() { return !!this.npc?.present; }
  get h() { return this.npc?.h || null; }
  get pos() { return this.npc.pos; }
  /** Walking speed (m/s): quick people, sleepy people, a kappa with a dry dish. */
  get speed() {
    const st = this.rec.stats || {};
    let v = 0.95 + (st.speed || 3) * 0.12;
    if (this.rec.quirks?.includes('ninja')) v *= 1.25;
    if (this.dry) v *= 0.7;
    if (this.rec.quirks?.includes('sleepy')) v *= 0.85;
    return v;
  }
  /** Multiplier on how long each step of a job takes. */
  get slow() {
    const st = this.rec.stats || {};
    let k = 1.45 - (st.speed || 3) * 0.1;
    for (const q of this.rec.quirks || []) k += this.staff.quirkFx(q).slow || 0;
    if (this.dry) k *= 1.35;
    return k;
  }
  /** A kappa whose dish has dried out. */
  get dry() { return this.rec.quirks?.includes('dish') && (this.rec.dish ?? 1) < 0.3; }

  // ------------------------------------------------------------------ in the world
  spawn(pos, yaw = 0) {
    if (this.npc) return this.npc;
    const g = this.game, r = this.rec;
    const def = {
      id: r.id, name: r.given ? `${r.given} ${r.family}` : r.name, color: r.color || '#ffd23f',
      voice: r.voice || {}, tts: r.tts || {}, speed: this.speed,
      build: () => buildPerson(r.look, { uniform: !this.visitor }),
    };
    const n = this.npc = new Npc(g, this.staff.group, def);
    n.def = def;
    n.mem = this.staff.mem(r.id);
    n.staff = this;
    n.place(pos, yaw);
    n.setPresent(true);
    n.ghost = r.quirks?.includes('ghost') || r.quirks?.includes('ninja'); // they don't wait for you to step aside
    g.interaction.add(n.hit, {
      reach: 2.4,
      hint: () => this.hint(),
      use: () => { this.staff.clicked(this); return false; },
      alt: () => { g.fp?.slap?.(); },
      noHighlight: true,
    });
    this.state = 'coming';
    if (this.rec.quirks?.includes('dish')) this.h.staffRig?.setDish?.(r.dish ?? 1);
    return n;
  }

  despawn() {
    const n = this.npc;
    if (!n) return;
    this.drop(true); this.unhold();
    this.gen = null; this.cur = null; this.job = null;
    this.game.bubbles?.clear(n.h);
    this.game.interaction.remove(n.hit);
    n.h.root.removeFromParent();
    n.dispose();
    this.npc = null;
    this.state = 'off';
  }

  hint() {
    const g = this.game, n = this.npc;
    if (!n?.present || n.busy || g.talk?.active) return null;
    if (this.visitor) return { key: 'LMB', text: `Interview ${this.rec.given}`, sub: `Here about the ${this.staff.roleName(this.rec.role)} job · RMB: slap` };
    const r = this.rec;
    const doing = this.job?.label || (this.mood?.label) || 'on shift';
    return { key: 'LMB', text: `Talk to ${r.given}`, sub: `${r.title ? r.title + ' ' : ''}${this.staff.roleName(r.role)} · ${doing} · RMB: slap` };
  }

  // ------------------------------------------------------------------ coroutines
  run(gen) { this.gen = gen; this.cur = null; }
  stopJob() {
    this.gen = null; this.cur = null; this.job = null;
    this.npc?.stop();
    this.npc?.clearGesture();
  }
  wait(sec) { const until = this.time + sec; return () => this.time >= until; }
  until(fn) { return fn; }
  goTo(p, yaw = null) {
    const n = this.npc;
    if (!n) return () => true;
    const pts = route(n.pos, p);
    n.walk(pts, { speed: this.speed, face: yaw });
    this.goal = p.clone();
    let lastT = this.time;
    const last = n.pos.clone();
    return () => {
      if (!n.present) return true;
      if (!n.walking) return true;
      // stuck behind something (or someone) for a long time: give up and pop through
      if (n.pos.distanceToSquared(last) > 0.0025) { last.copy(n.pos); lastT = this.time; }
      else if (this.time - lastT > 7) { n.place(p, yaw ?? n.yaw); return true; }
      return false;
    };
  }
  face(p) { if (this.npc) this.npc.faceTo(p); }

  tick(dt) {
    const n = this.npc;
    if (!n || n.talkLock || n.script) return;
    this.time += dt;
    if (!this.gen) return;
    for (let guard = 0; guard < 6; guard++) {
      if (this.cur && !this.cur()) break;
      let nx;
      try { nx = this.gen.next(); } catch (e) { console.error('staff task', this.id, e); this.gen = null; this.cleanupJob(); break; }
      if (nx.done) { this.gen = null; this.cur = null; this.cleanupJob(); break; }
      this.cur = typeof nx.value === 'function' ? nx.value : null;
    }
  }
  cleanupJob() {
    for (const c of this.job?.claims || []) if (c && c._staffClaim === this.id) c._staffClaim = null;
    this.job = null;
    if (this.npc && !this.carried) { this.npc.clearGesture(); this.npc.noBase = false; }
  }
  /** Claim a machine / carton / customer so nobody else starts the same job. */
  claim(job, ...things) { job.claims ||= []; for (const t of things) if (t) { t._staffClaim = this.id; job.claims.push(t); } }

  // ------------------------------------------------------------------ carrying
  /** Hold an object in front with both hands (on the chest bone, at the carry point). */
  carry(obj, { y = 0, z = 0, scale = 1 } = {}) {
    const h = this.h;
    if (!h) return;
    this.drop(true);
    const C = h.boxPos;
    obj.position.set(0, C[1] - 0.06 + y, C[2] + z);
    obj.rotation.set(0, 0, 0);
    obj.scale.multiplyScalar(scale);
    obj.traverse((o) => { if (o.isMesh) o.raycast = () => {}; });
    h.b.chest.add(obj);
    this.carried = obj;
    this.npc.gesture('haul');
    this.npc.noBase = true;
  }
  /** Let go of what's carried: removed (dispose = true) or handed back to the caller. */
  drop(dispose = false) {
    const o = this.carried;
    if (!o) return null;
    this.carried = null;
    o.removeFromParent();
    if (this.npc) { this.npc.clearGesture(); this.npc.noBase = false; }
    if (dispose) return null;
    return o;
  }
  /** Something in the right hand: 'broom' (held low, bristles down) or 'bag' (hanging at the side). */
  hold(obj, how = 'bag') {
    const h = this.h;
    if (!h) return;
    this.unhold();
    obj.traverse((o) => { if (o.isMesh) { o.raycast = () => {}; o.castShadow = true; } });
    if (how === 'broom') { obj.position.set(0, -0.36, 0.02); obj.rotation.set(0.25, 0, 0.12); }
    else { obj.position.set(0, -0.14, 0); obj.rotation.set(0, 0, 0); }
    h.b.handR.add(obj);
    this.inHand = obj;
    this.inHandKind = how;
  }
  unhold() { if (this.inHand) { this.inHand.removeFromParent(); this.inHand = null; this.inHandKind = null; } }

  // ------------------------------------------------------------------ talking
  say(text, opts = {}) {
    if (!this.npc?.present || this.npc.talkLock || !text) return null;
    if (this.npc.playerDist > 14 && !opts.always) return null;
    return this.npc.say(text, opts);
  }
  log(text) {
    const L = this.rec.log ||= [];
    L.push({ t: this.game.clock?.stamp ?? 0, text });
    if (L.length > 24) L.splice(0, L.length - 24);
  }
  stat(k, n = 1) { const s = this.rec.done ||= {}; s[k] = (s[k] || 0) + n; const d = this.rec.today ||= {}; d[k] = (d[k] || 0) + n; }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const n = this.npc;
    if (!n) return;
    if (!this.game.timeStop?.frozen || n.script) n.update(dt);
    this.tick(dt);
  }

  /** A little puff of pixel smoke (the ninja's exits and entrances). */
  puff(at = this.pos) {
    try { this.game.effects.puff({ pos: _v.copy(at).setY(0.9), count: 9, color: 0xb8b0a8, size: 0.09, speed: 0.6, radius: 0.3 }); } catch { /* */ }
    try { audio.play('whoosh', { pos: at, vol: 0.5 }); } catch { /* */ }
  }
  /** Step out of sight instantly (despawn with a puff) or appear somewhere. */
  blinkTo(p, yaw) {
    const n = this.npc;
    if (!n) return;
    this.puff(n.pos);
    n.place(p, yaw ?? n.yaw);
    this.puff(p);
  }
  /** Lines of their kind (data.js tables). */
  line(table) { return pick(table[this.rec.arch] || table.local); }
  /** Is this worker inside the garage now? */
  get inside() { return this.npc ? inGarage(this.npc.pos) : false; }
}
