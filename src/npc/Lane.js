// The people of the lane (game.lane): named neighbours with homes and daily routines driven by game.clock. They come
// out of their front doors in the morning, go about their day (Rohan sketches by the wall, the pigeon man feeds his
// pigeons, the guy in the bush spies on the street...), drop into your shop for a turn on the machines, come and knock
// on your shutter when they want something, and go home at night (when the yokai come out). Click someone to chat
// (src/talk/Talk.js); RMB slaps them, and they (and everyone they tell) remember it.
//   game.lane.npc(id) -> Npc   game.lane.list   game.lane.chat(npc, script?)   game.lane.mem (src/npc/memory.js)
//   game.lane.goTo(npc, [x, z] | Vector3 | spotName, opts)   game.lane.run(npc, generator)   game.lane.wait(sec)
// Characters, their routines, lines, chats and quests: src/npc/roster.js.
import * as THREE from 'three';
import { Npc } from './Npc.js';
import './poses.js';
import { laneMemory } from './memory.js';
import { ROSTER, SPOTS, greetingFor } from './roster.js';
import { GARAGE, MACHINE_SLOTS } from '../world/Garage.js';
import { audio } from '../core/audio.js';
import { BIZARRE } from '../people/bizarre.js';
import { menace } from '../ui/menacing.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
export const LANE_Z0 = 6.35, LANE_Z1 = 13.2;

/** Is p on the lane (the road and the sidewalks) or inside the garage? */
export function walkable(p) {
  if (Math.abs(p.x) < GARAGE.maxX - 0.5 && p.z > GARAGE.minZ + 0.6 && p.z < GARAGE.maxZ - 0.3) return true;
  return p.z > 5.75 && p.z < 14.6 && Math.abs(p.x) < 25;
}

export class Lane {
  constructor(game) {
    this.game = game;
    this.mem = laneMemory(game);
    this.group = new THREE.Group();
    this.group.name = 'lane-people';
    game.scene.add(this.group);
    this.list = [];
    this.byId = {};
    this.pending = ROSTER.filter((d) => !d.disabled);
    this.spawnT = 0.2;
    this.checkT = 0;
    this.time = 0;
    this.tasks = new Map(); // npc -> { gen, cur }
    this.extras = []; // per-frame hooks of characters (flocks, props)
    game.events.on('slap', (e) => this.onSlap(e));
    game.events.on('discover', (d) => this.onDiscover(d));
    game.events.on('newDay', () => { this.mem.state.days = (this.mem.state.days || 1) + 1; for (const n of this.list) n.today = null; });
  }

  npc(id) { return this.byId[id] || null; }

  // ------------------------------------------------------------------ building people (a few per second, no hitch)
  spawnNext() {
    const def = this.pending.shift();
    if (!def) return;
    const n = new Npc(this.game, this.group, def);
    n.def = def;
    n.mem = this.mem.person(def.id);
    n.activity = null;
    n.setPresent(false);
    this.list.push(n);
    this.byId[def.id] = n;
    this.game.interaction.add(n.hit, {
      reach: 2.4,
      hint: (held) => {
        if (!n.present || n.busy || this.game.talk?.active) return null;
        if (def.hint) { const h = def.hint(this, n, held); if (h !== undefined) return h; }
        const met = this.mem.met(def.id);
        return { key: 'LMB', text: `Talk to ${met ? n.name : def.stranger || 'the stranger'}`, sub: def.role ? `${met ? def.role + ' · ' : ''}RMB: slap` : 'RMB: slap' };
      },
      use: () => { if (n.present && !n.busy) this.chat(n); return false; },
      alt: () => { this.game.fp?.slap?.(); },
      noHighlight: true,
    });
    def.setup?.(this, n);
  }

  // ------------------------------------------------------------------ places and walking
  /** A spot name, [x, z] or a Vector3 -> { pos, rotY }. */
  spot(s) {
    if (!s) return null;
    if (typeof s === 'string') { const sp = SPOTS[s]; return sp ? { pos: V(sp[0], sp[1]), rotY: sp[2] ?? 0 } : null; }
    if (Array.isArray(s)) return { pos: V(s[0], s[1]), rotY: s[2] ?? null };
    return { pos: s.clone().setY(0), rotY: null };
  }

  /** Waypoints from a to b along the lane (through the shop door when either end is inside the garage). */
  route(a, b) {
    const pts = [];
    const inGarage = (p) => Math.abs(p.x) < GARAGE.maxX && p.z < GARAGE.maxZ;
    const onLane = (p) => p.z > 5.9 && p.z < 14.7 && Math.abs(p.x) < 27;
    const toLane = (p) => V(p.x, Math.min(LANE_Z1, Math.max(LANE_Z0, p.z)));
    if (inGarage(a) && !inGarage(b)) pts.push(V(0.4, GARAGE.maxZ - 0.6), V(0.4, GARAGE.maxZ + 1.2));
    else if (!inGarage(a) && !onLane(a)) pts.push(toLane(a));
    if (inGarage(b) && !inGarage(a)) pts.push(V(0.4, GARAGE.maxZ + 1.2), V(0.4, GARAGE.maxZ - 0.6));
    else if (!inGarage(b) && !onLane(b)) pts.push(toLane(b));
    pts.push(b.clone().setY(0));
    return pts;
  }

  /** Walk npc to a place; returns a waiter (true once there). */
  goTo(npc, target, { speed, face } = {}) {
    const sp = this.spot(target);
    if (!sp) return () => true;
    npc.walk(this.route(npc.pos, sp.pos), { speed, face: face ?? sp.rotY });
    return () => !npc.walking || !npc.present;
  }

  // ------------------------------------------------------------------ coroutines (per person)
  run(npc, gen) { this.tasks.set(npc, { gen, cur: null }); }
  busy(npc) { return this.tasks.has(npc); }
  cancel(npc) { this.tasks.delete(npc); }
  wait(sec) { const until = this.time + sec; return () => this.time >= until; }
  tick() {
    for (const [npc, t] of this.tasks) {
      if (npc.talkLock || npc.script) continue; // a chat pauses whatever they were doing
      for (let guard = 0; guard < 6; guard++) {
        if (t.cur && !t.cur()) break;
        let nx;
        try { nx = t.gen.next(); } catch (e) { console.error('lane task', npc.id, e); this.tasks.delete(npc); break; }
        if (nx.done) { this.tasks.delete(npc); break; }
        t.cur = typeof nx.value === 'function' ? nx.value : null;
      }
    }
  }

  // ------------------------------------------------------------------ routines
  /** The hour as a float, the day and whether it is night. */
  get hour() { return this.game.clock?.hours ?? 15; }
  get night() { const h = this.hour; return h >= 20 || h < 5; }
  get shopOpen() { const g = this.game; return !!(g.state.story?.complete || g.story?.done) && (!g.sim?.isOpen || g.sim.isOpen()); }

  /** What someone wants to be doing now: 'home' | 'spot' | 'wander' | 'visit' | custom act names. */
  want(n) {
    const d = n.def, h = this.hour;
    if (d.afterOpening && !this.game.story?.done && !this.game.state.story?.complete) return 'home';
    if (n.today?.override && this.time < n.today.until) return n.today.override;
    for (const [a, b, act] of d.hours || []) if (a <= b ? h >= a && h < b : h >= a || h < b) return act;
    return 'home';
  }

  checkRoutines() {
    for (const n of this.list) {
      if (n.busy || this.busy(n) || n.activity === 'debug' || n.activity === 'door') continue;
      const w = this.want(n);
      if (w === n.activity && (w !== 'spot' || n.present)) {
        // idle at the spot: maybe pop into the shop or come to knock on your shutter
        if (n.present && w === 'spot') this.maybeOuting(n);
        continue;
      }
      n.activity = w;
      const act = n.def.acts?.[w] || ACTS[w] || ACTS.spot;
      this.run(n, act.call(this, n));
    }
  }

  maybeOuting(n) {
    const d = n.def;
    n.outT = (n.outT ?? rnd(40, 90)) - 1;
    if (n.outT > 0) return;
    n.outT = rnd(70, 150);
    // something to come and tell you (a quest, a thank-you): they come to your shop front
    const why = d.knock?.(this, n);
    if (why && this.game.player.pos.z < GARAGE.maxZ + 3 && !this.list.some((o) => o !== n && o.activity === 'knock')) { n.activity = 'knock'; this.run(n, ACTS.knock.call(this, n, why)); return; }
    if (d.visit && this.shopOpen && Math.random() < d.visit && this.machineFor()) { n.activity = 'visit'; this.run(n, ACTS.visit.call(this, n)); }
  }

  /** A machine someone can play (stocked, working, not in use). */
  machineFor() {
    const g = this.game;
    const ok = g.machines.filter((m) => !m.data.broken && !m.data.fallen && m.data.stock.length > 0 && !(g.pedestrians?.list || []).some((p) => p.machine === m && (p.state === 'goIn' || p.state === 'play')) && !this.list.some((n) => n.machine === m));
    return ok.length ? pick(ok) : null;
  }

  /** Appear at one's own front door (stepping out of it). */
  appear(n) {
    if (n.present) return;
    const d = n.def, door = d.door ? this.spot(d.door) : null;
    const at = door?.pos || this.spot(d.spot)?.pos || V(0, 9);
    n.place(at, door?.rotY ?? 0);
    n.setPresent(true);
    if (d.door) { try { audio.play('slideDoor', { pos: at.clone().setY(1), vol: 0.4 }); } catch { /* */ } }
  }

  // ------------------------------------------------------------------ chats
  /** Talk to someone (their own chat, or a given script). */
  async chat(n, script) {
    const g = this.game;
    if (!g.talk || g.talk.active) return;
    const first = this.mem.meet(n.id);
    if (first) g.os?.codex && setTimeout(() => g.os?.notify?.({ app: 'codex', title: 'New person in the Codex', body: n.name, icon: 'os_codex' }), 400);
    if (n.knocking) n.mem.flags['knock_' + n.knocking.id] = true; // you came out to see them
    const sc = script || n.def.chat?.(this, n, { first }) || greetingFor(this, n);
    this.cancelOuting(n);
    n.clearGesture();
    await g.talk.start(n, sc, { id: n.id });
    n.mem.seen = g.clock?.stamp ?? 0;
    n.def.afterChat?.(this, n);
  }
  cancelOuting(n) { if (n.activity === 'visit' || n.activity === 'knock') { /* keep: the task resumes after the chat */ } }

  // ------------------------------------------------------------------ reactions
  onSlap({ human }) {
    if (!human) return;
    const n = this.list.find((x) => x.h === human);
    if (!n) return;
    const g = this.game, d = n.def;
    n.mem.slaps = (n.mem.slaps || 0) + 1;
    this.mem.rel(n.id, -2);
    this.mem.gossip('slap', { who: n.name, id: n.id });
    try { g.effects.mark({ sprite: 'anger', pos: n.h.headTop(new THREE.Vector3()), color: 0xe5383b, life: 1.6, size: 0.05 }); } catch { /* */ }
    const lines = d.lines?.slapped || ['OW!', 'Hey!'];
    const line = n.mem.slaps > 2 && d.lines?.slappedAgain ? pick(d.lines.slappedAgain) : pick(lines);
    // (FPBody's generic "Ow!" makes way for their own reaction)
    setTimeout(() => { if (n.present) { g.bubbles.clear(n.h); n.say(line, { style: 'shout', dur: 2.8 }); } }, 120);
    d.onSlap?.(this, n);
    g.events.emit('npcSlapped', { id: n.id, slaps: n.mem.slaps });
  }

  onDiscover(d) {
    const g = this.game;
    if (g.cutscene?.active || g.talk?.active) return;
    const it = d?.key;
    if (!it) return;
    for (const n of this.list) {
      if (!n.present || n.busy || n.playerDist > 6) continue;
      const l = n.def.lines?.discover;
      if (l && Math.random() < 0.6) { n.say(pick(l)); n.look = 'player'; break; }
    }
  }

  /** Menacing ゴゴゴ beside someone's head, if they're on screen. */
  menaceOver(n, kind = 'go') {
    const v = n.h.headTop(_v).project(this.game.camera);
    if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) return;
    menace({ kind, at: [(v.x * 0.5 + 0.5) * innerWidth + 34, (0.5 - v.y * 0.5) * innerHeight + 70], n: kind === 'don' ? 1 : 3, dur: 2.4 });
  }
  onScreen(p, m = 0.95) { const v = _w.copy(p).project(this.game.camera); return v.z < 1 && Math.abs(v.x) < m && Math.abs(v.y) < m; }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    this.time += dt;
    if (this.pending.length && (this.spawnT -= dt) <= 0) { this.spawnT = 0.35; this.spawnNext(); }
    const scene = g.cutscene?.active, frozen = g.timeStop?.frozen;
    if ((this.checkT -= dt) <= 0) { this.checkT = 1; if (!scene) this.checkRoutines(); }
    if (!scene && !frozen) this.tick();
    for (const n of this.list) {
      if (!n.present) continue;
      if (!scene && !frozen && !n.busy && n.activity === 'spot' && !this.busy(n)) n.def.idle?.(this, n, dt);
      if (!frozen || n.script) n.update(dt);
    }
    for (const fn of this.extras) fn(dt);
  }
}

// ------------------------------------------------------------------ the generic activities (generators, this = Lane)
const ACTS = {
  /** Go home: walk to the front door and step inside. */
  *home(n) {
    if (!n.present) return;
    const d = n.def;
    n.clearGesture(); n.look = null;
    if (d.lines?.home && n.playerDist < 10) n.say(pick(d.lines.home));
    yield this.wait(0.8);
    const door = this.spot(d.door);
    if (door) { yield this.goTo(n, door.pos); try { audio.play('slideDoor', { pos: n.pos.clone().setY(1), vol: 0.35 }); } catch { /* */ } }
    n.setPresent(false);
  },
  /** Out to one's usual spot and stay there (the idle behaviour runs while the activity is 'spot'). */
  *spot(n) {
    const d = n.def;
    this.appear(n);
    const sp = this.spot(d.spot);
    if (!sp) return;
    if (n.distTo(sp.pos) > 0.3) { n.clearGesture(); yield this.goTo(n, sp.pos, { face: sp.rotY }); }
    n.faceYaw = sp.rotY ?? n.faceYaw;
    if (d.base) n.gesture(d.base);
  },
  /** Stroll up and down the lane. */
  *wander(n) {
    this.appear(n);
    for (let i = 0; i < 3; i++) {
      const p = V(rnd(-22, 22), rnd(LANE_Z0 + 0.3, LANE_Z1 - 0.3));
      yield this.goTo(n, p, { speed: n.speed * 0.8 });
      yield this.wait(rnd(2, 6));
      if (Math.random() < 0.4 && n.def.lines?.idle && n.playerDist < 10) n.say(pick(n.def.lines.idle));
    }
    n.activity = null; // pick again
  },
  /** Drop into your shop and play a machine (they pay like any customer), then back to whatever they were doing. */
  *visit(n) {
    const g = this.game, d = n.def;
    const m = this.machineFor();
    if (!m) { n.activity = null; return; }
    n.machine = m;
    this.appear(n);
    if (d.lines?.visit && n.playerDist < 12) n.say(pick(d.lines.visit));
    const slot = MACHINE_SLOTS[m.data.slot] || { x: -3.42, z: 0 };
    const stand = V(slot.x + 0.95, slot.z);
    n.clearGesture();
    yield this.goTo(n, stand, { face: (m.root.rotation.y || Math.PI / 2) + Math.PI });
    n.faceYaw = (slot.rotY ?? Math.PI / 2) + Math.PI;
    n.look = m.local ? m.local(0, 1.2, 0.3) : null;
    if (n.isHuman) n.gesture('browse');
    yield this.wait(1.4);
    let r = null;
    if (!m.data.broken && m.data.stock.length) {
      if (g.sim?.playChance && Math.random() > Math.max(0.5, g.sim.playChance(m))) {
        const line = g.sim.complaint?.(m, { count: true }) || 'Hmm. Pricey.';
        n.say(line); n.expr('sad', 2.5);
        g.events.emit('complaint', { machine: m, text: line, who: n.h, npc: n.id });
        this.mem.gossip('overpriced', { who: n.name, id: n.id });
        yield this.wait(2.6);
      } else {
        if (m.customerPlay) r = m.customerPlay();
        g.state.stats.customers = (g.state.stats.customers || 0) + 1;
        yield this.wait(2.2);
        n.clearGesture();
        n.look = 'player';
        const lucky = Math.random() < 0.4;
        if (lucky && n.isHuman && Math.random() < 0.5) { n.gesture(pick(BIZARRE)); this.menaceOver(n); } else n.gesture(lucky ? 'cheer' : 'shrug');
        n.say(pick((lucky ? d.lines?.win : d.lines?.meh) || (lucky ? ['Yes!'] : ['Aww.'])));
        if (r) { n.mem.flags.played = (n.mem.flags.played || 0) + 1; this.mem.gossip('played', { who: n.name, id: n.id }); }
        yield this.wait(2.6);
        // the empty shell goes in the return box
        if (g.shells?.customerBin) g.shells.customerBin();
      }
    }
    n.clearGesture(); n.look = null; n.machine = null;
    n.activity = null; // back to the routine
  },
  /** Come to your shop front, knock and call for you; wait a while for you to come and talk. */
  *knock(n, why) {
    const g = this.game;
    this.appear(n);
    n.clearGesture();
    yield this.goTo(n, 'shutter');
    n.faceYaw = Math.PI;
    n.knocking = why;
    const sp = SPOTS.shutter;
    for (let i = 0; i < 3 && !n.talkLock; i++) {
      if (n.isHuman) n.gesture('knock');
      for (let k = 0; k < 3; k++) { try { audio.play('thud', { pos: V(sp[0], sp[1] - 0.4).setY(1.3), vol: 0.55 }); } catch { /* */ } yield this.wait(0.22); }
      n.say(why.call || 'Hello? Anyone home?', { style: i ? 'shout' : 'say' });
      if (i === 0) g.news(`${this.mem.met(n.id) ? n.name : 'Someone'} is at your shop front`, why.sub || 'They want to talk to you');
      yield this.wait(rnd(9, 12));
      if (n.mem.flags['knock_' + why.id]) break; // you came and talked
    }
    if (!n.mem.flags['knock_' + why.id] && why.leave) n.say(why.leave);
    n.knocking = null;
    yield this.wait(1.5);
    n.activity = null;
  },
};
export { ACTS };
