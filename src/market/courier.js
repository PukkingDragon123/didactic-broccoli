// Gen-san and his FREE CANDY van: every delivery comes this way. When orders are due (src/game/Delivery.js queue) or
// parcels wait in the OUTGOING crate, the van drives out of the west underpass and stops by the garage. Gen-san hops
// out, opens the back, carries the boxes to your shutter (inside if it's up), has a short chat that shows he remembers
// you (how many deliveries, what came last time, the state of the shop), hands you a free candy, picks up anything
// you're sending, and drives off through the east underpass.
//   game.courier: update(dt), busy, visit (current), state (save: 'courier'), nextVisit(), summon() (debug: come now)
// Events: 'courier' { phase: 'arrive' | 'drop' | 'leave', items }.
import * as THREE from 'three';
import { buildVan, makeDriver, VanEngine } from './van.js';
import { courierState, marketState, stamp, pick } from './util.js';
import { TOOLS } from '../data/tools.js';
import { SERIES_BY_ID, getItem } from '../data/series/index.js';
import { boxLabel } from '../game/Delivery.js';
import { audio } from '../core/audio.js';
import { SOUNDS } from '../core/audio.js';

const LANE_Z = 8.75, START_X = -37, STOP_X = 4.3, END_X = 38;
export const FLAVORS = { melon: 'melon', ume: 'sour plum', milk: 'milk', cola: 'cola', ramune: 'ramune', yuzu: 'yuzu', strawberry: 'strawberry', matcha: 'matcha' };

// his candy: a carried snack you eat with a click
Object.assign(TOOLS, { gen_candy: { name: 'Free Candy', icon: 'candy', prop: 'candy_piece', desc: "Gen-san's free candy. Click to eat it.", hand: 0.07 } });
Object.assign(SOUNDS, {
  candyWrapper(a, t, o) { for (let i = 0; i < 5; i++) a.burst(o, t + i * 0.05 + Math.random() * 0.02, { dur: 0.04, vol: 0.12, f: 3000 + Math.random() * 2500, q: 3 }); },
  candyCrunch(a, t, o) { for (let i = 0; i < 3; i++) a.burst(o, t + 0.12 + i * 0.16, { dur: 0.07, vol: 0.2, type: 'lowpass', f: 1600 - i * 200 }); },
  vanHorn(a, t, o) { a.tone(o, t, { type: 'square', f: 392, dur: 0.22, vol: 0.06 }); a.tone(o, t, { type: 'square', f: 494, dur: 0.22, vol: 0.05 }); a.tone(o, t + 0.28, { type: 'square', f: 392, dur: 0.32, vol: 0.06 }); a.tone(o, t + 0.28, { type: 'square', f: 494, dur: 0.32, vol: 0.05 }); },
  vanDoor(a, t, o) { a.burst(o, t, { dur: 0.08, vol: 0.35, type: 'lowpass', f: 500 }); a.tone(o, t, { f: 120, f2: 70, dur: 0.1, vol: 0.2, type: 'triangle' }); },
});

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = new THREE.Vector3();

export class Courier {
  constructor(game) {
    this.game = game;
    this.S = courierState(game);
    this.M = marketState(game);
    this.van = null;
    this.driver = null;
    this.engine = new VanEngine();
    this.visit = null;
    this.task = null;
    this.gen = null;
    this.checkT = 2;
    this.hSpeed = 0;
    this.lookAt = null;
  }
  get busy() { return !!this.visit; }
  get state() { return this.S; }

  /** When the van comes next (stamp) or null. */
  nextVisit() {
    const n = this.game.delivery.next();
    const p = this.M.pickupAt ?? null;
    if (n === null) return p;
    return p === null ? n : Math.min(n, p);
  }
  /** Debug: everything due now. */
  summon() { for (const q of this.game.delivery.queue) { q.eta = 0; q.realDue = 0; } this.M.pickupAt = 0; this.checkT = 0; }

  canDrive() {
    const g = this.game, c = g.clock;
    if (g.cutscene?.active || g.visiting) return false;
    if (!c) return true;
    const h = c.hours;
    return c.pauseReason?.() === 'opening' || (h >= 7 && h < 21);
  }

  update(dt) {
    if (this.visit) { this.step(dt); return; }
    this.checkT -= dt;
    if (this.checkT > 0) return;
    this.checkT = 1;
    if (!this.canDrive()) return;
    const due = this.game.delivery.due();
    const pickups = this.outbox();
    const pickNow = pickups.length && (this.M.pickupAt ?? Infinity) <= stamp(this.game);
    if (due.length || pickNow) this.start(due);
  }

  outbox() { return (this.M.ship || []).filter((s) => s.status === 'packed'); }

  // ------------------------------------------------------------------ the visit
  start(entries) {
    const g = this.game;
    if (!this.van) {
      this.van = buildVan();
      this.driver = makeDriver();
      this.driver.root.visible = false;
    }
    for (const e of entries) e.onVan = true;
    this.visit = { entries, items: entries.map((e) => e.data), names: entries.map((e) => nameOf(e.data)), x: START_X, v: 0, t: 0, dist: 0, honked: false, talked: false };
    const V = this.van;
    V.root.position.set(START_X, 0, LANE_Z);
    V.door.rotation.y = 0; V.hatch.rotation.z = 0;
    // a few boxes in the back
    V.cargo.clear();
    const n = Math.min(4, entries.length + this.outbox().length + 1);
    for (let i = 0; i < n; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.3), cargoMat);
      b.position.set((i % 2) * 0.36, 0.12 + Math.floor(i / 2) * 0.25, (i % 3 - 1) * 0.32);
      b.rotation.y = (i * 0.37) % 0.3;
      V.cargo.add(b);
    }
    g.scene.add(V.root);
    this.engine.start(V.root.position);
    this.gen = this.run();
    this.task = null;
    g.events.emit('courier', { phase: 'arrive', items: this.visit.items });
  }

  step(dt) {
    const v = this.visit;
    v.t += dt;
    // the driver breathes, walks and looks around every frame he's out
    const D = this.driver;
    if (D.root.visible) {
      D.update(dt, { speed: this.hSpeed, lookAt: this.lookAt || null });
    }
    if (this.task && !this.task.update(dt)) return;
    const n = this.gen.next();
    if (n.done) { this.finish(); return; }
    this.task = n.value;
  }

  finish() {
    const g = this.game, V = this.van;
    V.root.removeFromParent();
    this.driver.root.removeFromParent();
    this.driver.root.visible = false;
    this.engine.stop();
    if (this.ob) { g.player.removeObstacle(this.ob); this.ob = null; }
    g.events.emit('courier', { phase: 'leave', items: this.visit.items });
    this.visit = null;
    this.task = null;
    this.checkT = 5;
    g.save?.();
  }

  // ------------------------------------------------------------------ tasks
  wait(sec) { let t = 0; return { update: (dt) => (t += dt) >= sec }; }
  until(fn) { return { update: (dt) => fn(dt) }; }
  tween(dur, fn) { let t = 0; return { update: (dt) => { t = Math.min(dur, t + dt); fn(t / dur); return t >= dur; } }; }

  /** Drive along the lane to x (eased to a stop, waits if you're standing in the road). */
  drive(toX, { stop = true, cruise = 7 } = {}) {
    const V = this.van, v = this.visit, g = this.game;
    return {
      update: (dt) => {
        const rem = toX - v.x;
        let want = cruise;
        if (stop) want = Math.min(cruise, Math.sqrt(Math.max(0, 2 * 2.4 * rem)) + 0.3);
        // somebody in the road in front: brake (and toot the horn once)
        const P = g.player.pos;
        const ahead = P.x - (v.x + V.frontX);
        if (ahead > -0.2 && ahead < 3.2 && Math.abs(P.z - LANE_Z) < 1.3) {
          want = 0;
          if (!v.honked) { v.honked = true; audio.play('vanHorn', { pos: V.root.position.clone().setY(1), vol: 1 }); }
        } else if (ahead > 6 || ahead < -1) v.honked = false;
        const a = want > v.v ? 2.6 : 5;
        v.v += Math.sign(want - v.v) * Math.min(Math.abs(want - v.v), a * dt);
        const dx = Math.min(v.v * dt, stop ? Math.max(0, rem) : Infinity);
        v.x += dx; v.dist += dx;
        V.root.position.x = v.x;
        V.root.position.y = Math.abs(Math.sin(v.dist * 2.1)) * 0.006 * Math.min(1, v.v); // old suspension
        V.root.rotation.x = Math.sin(v.dist * 1.3) * 0.004;
        V.setWheels(v.dist);
        this.engine.move(_v.copy(V.root.position).setY(0.8), v.v);
        return stop ? rem <= 0.01 && v.v < 0.6 : v.x >= toX;
      },
    };
  }

  /** Walk the driver through points (world x, z). */
  walk(points, speed = 1.15) {
    const D = this.driver;
    let i = 0;
    return {
      update: (dt) => {
        const p = points[i];
        if (!p) { this.hSpeed = 0; return true; }
        const r = D.root.position;
        const dx = p[0] - r.x, dz = p[1] - r.z, d = Math.hypot(dx, dz);
        if (d < 0.05) { i++; return i >= points.length && (this.hSpeed = 0, true); }
        const want = Math.atan2(dx, dz);
        let dr = want - D.root.rotation.y;
        dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        D.root.rotation.y += dr * Math.min(1, dt * 10);
        const s = Math.min(d, speed * dt);
        r.x += (dx / d) * s; r.z += (dz / d) * s;
        this.hSpeed = speed;
        return false;
      },
    };
  }
  face(x, z) { const D = this.driver; return this.tween(0.35, (k) => { const want = Math.atan2(x - D.root.position.x, z - D.root.position.z); let dr = want - D.root.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); D.root.rotation.y += dr * k; }); }

  // ------------------------------------------------------------------ the script of a stop
  *run() {
    const g = this.game, V = this.van, D = this.driver, v = this.visit, S = this.S;
    yield this.drive(STOP_X);
    v.x = STOP_X;
    this.ob = g.player.addObstacle(STOP_X + V.rearX - 0.1, STOP_X + V.frontX + 0.1, LANE_Z - V.width / 2 - 0.1, LANE_Z + V.width / 2 + 0.1);
    yield this.wait(0.5);
    // the driver's door, and out he hops
    audio.play('vanDoor', { pos: V3(STOP_X + V.doorX, 1, LANE_Z + 0.8), vol: 0.9 });
    yield this.tween(0.45, (k) => { V.door.rotation.y = k * 1.15; });
    const sideZ = LANE_Z + V.sideZ + 0.38;
    D.root.position.set(STOP_X + V.doorX, 0, LANE_Z + V.sideZ - 0.1);
    D.root.rotation.y = Math.PI / 2;
    g.scene.add(D.root);
    D.root.visible = true;
    yield this.walk([[STOP_X + V.doorX - 0.1, sideZ]], 1.4);
    yield this.tween(0.35, (k) => { V.door.rotation.y = 1.15 * (1 - k); });
    audio.play('vanDoor', { pos: V3(STOP_X + V.doorX, 1, LANE_Z + 0.8), vol: 0.7 });
    // round the back, open the hatch
    const rx = STOP_X + V.rearX - 0.55;
    yield this.walk([[rx, sideZ], [rx - 0.1, LANE_Z + 0.2]]);
    yield this.face(STOP_X, LANE_Z);
    if (v.entries.length) {
      yield this.tween(0.6, (k) => { V.hatch.rotation.z = -1.8 * k; });
      yield this.wait(0.35);
      D.gesture('carry', { hold: true });
      V.cargo.clear();
      yield this.wait(0.45);
    }
    // to the shutter
    const G = g.garage, open = (G.shutterOpen ?? 1) > 0.6;
    const DS = G.deliverySpot;
    const drop = open ? V3(DS.x, 0, DS.z) : V3(DS.x, 0, 5.72);
    const front = [drop.x + 0.1, 6.4];
    // (a pickup-only stop: he just comes to the shutter)
    yield this.walk(!v.entries.length ? [[rx - 0.2, 7.0], [drop.x + 0.05, 6.2]] : open ? [[rx - 0.2, 7.0], front, [drop.x + 0.05, drop.z + 0.55]] : [[rx - 0.2, 7.0], [drop.x + 0.05, drop.z + 0.5]]);
    if (v.entries.length) {
      yield this.face(drop.x, drop.z);
      D.clearGesture();
      yield this.wait(0.3);
      this.dropAll(drop);
      audio.play('drop', { pos: drop, vol: 0.8 });
      if (!open) audio.play('doorbell', { pos: V3(1.5, 1.6, 4.9), vol: 0.9 });
      yield this.wait(0.4);
    }
    // the chat (if you're around) and the candy
    yield* this.greet(drop);
    // parcels going out
    const out = this.outbox();
    if (out.length) {
      const ob = g.market?.outboxPos?.();
      if (ob) {
        yield this.walk([[ob.x + 0.05, ob.z + 0.6]]);
        yield this.face(ob.x, ob.z);
        yield this.wait(0.3);
        g.market.collectOutbox();
        D.gesture('carry', { hold: true });
        this.bubble(out.length > 1 ? `${out.length} parcels going out. Leave it to me!` : 'One parcel going out. Leave it to me!');
        S.pickups += out.length;
        yield this.wait(0.4);
        yield this.walk([[ob.x + 0.05, 6.3], [rx - 0.2, 7.0], [rx - 0.1, LANE_Z + 0.2]]);
        if (V.hatch.rotation.z > -0.5) yield this.tween(0.5, (k) => { V.hatch.rotation.z = -1.8 * k; });
        yield this.face(STOP_X, LANE_Z);
        D.clearGesture();
        yield this.wait(0.4);
      }
    }
    // back to the cab
    const bx = STOP_X + V.rearX - 0.55;
    if (V.hatch.rotation.z < -0.2) {
      yield this.walk([[bx - 0.1, LANE_Z + 0.2]]);
      yield this.tween(0.5, (k) => { V.hatch.rotation.z = -1.8 * (1 - k); });
      audio.play('vanDoor', { pos: V3(STOP_X + V.rearX, 1, LANE_Z), vol: 0.8 });
    }
    yield this.walk([[bx, sideZ], [STOP_X + V.doorX - 0.1, sideZ]]);
    yield this.tween(0.35, (k) => { V.door.rotation.y = k * 1.15; });
    D.root.visible = false;
    D.root.removeFromParent();
    yield this.tween(0.35, (k) => { V.door.rotation.y = 1.15 * (1 - k); });
    audio.play('vanDoor', { pos: V3(STOP_X + V.doorX, 1, LANE_Z + 0.8), vol: 0.9 });
    if (this.ob) { g.player.removeObstacle(this.ob); this.ob = null; }
    yield this.wait(0.6);
    audio.play('vanHorn', { pos: V.root.position.clone().setY(1), vol: 0.6 });
    v.v = 0;
    yield this.drive(END_X, { stop: false, cruise: 8 });
  }

  /** Stack the delivered boxes at the drop point and hand them to the world. */
  dropAll(at) {
    const g = this.game, v = this.visit, S = this.S;
    const SLOTS = [[0, 0], [0.45, 0.05], [-0.45, 0.02], [0.02, -0.42], [0.47, -0.38], [-0.43, -0.4]];
    let i = 0;
    const tops = [];
    for (const e of v.entries) {
      const s = SLOTS[i % SLOTS.length], layer = Math.floor(i / SLOTS.length);
      const pos = V3(at.x + s[0], layer * 0.3, at.z + s[1]);
      const ent = g.delivery.drop(e.data, pos, (Math.random() - 0.5) * 0.5);
      g.delivery.remove(e);
      if (ent) tops.push(ent);
      i++;
    }
    const names = v.names.filter(Boolean);
    S.visits++;
    S.delivered += v.entries.length;
    if (names.length) { S.last = { name: names[0], n: names.length, day: g.clock?.day ?? 1 }; S.items = [...names, ...(S.items || [])].slice(0, 8); }
    S.lastVisit = stamp(g);
    v.tops = tops;
    g.events.emit('courier', { phase: 'drop', items: v.items });
    g.news(v.entries.length > 1 ? `${v.entries.length} deliveries!` : 'Delivery!', 'Gen-san left it by the shutter', 4500);
    g.save?.();
  }

  bubble(text) { try { this.game.bubbles?.say?.(this.driver, text, { name: 'Gen-san', color: '#ff7aa8' }); } catch { /* bubbles busy */ } }

  playerNear(r = 9) {
    const g = this.game;
    if (g.pc?.active || g.cutscene?.active) return false;
    const P = g.player.pos, D = this.driver.root.position;
    return Math.hypot(P.x - D.x, P.z - D.z) < r;
  }

  *greet(drop) {
    const g = this.game, S = this.S, v = this.visit, D = this.driver;
    let near = this.playerNear(13);
    if (!near) {
      // look around for you a moment
      this.bubble(pick(['Hello-o? Delivery!', 'Anybody home? Lane Express!', 'Parcel for the gacha shop!']));
      if (g.pc?.active) g.os?.notify?.({ title: 'Ding-dong!', body: 'Gen-san is at the shutter with a delivery.', icon: 'os_info', news: true });
      let t = 0;
      yield this.until((dt) => { t += dt; near = this.playerNear(7); return near || t > 9; });
    }
    if (!near) {
      this.leaveCandy(drop);
      S.missed = (S.missed || 0) + 1;
      yield this.wait(0.6);
      return;
    }
    this.lookAt = g.camera.position;
    const P = g.player.pos;
    yield this.face(P.x, P.z);
    D.gesture('wave');
    const flavor = pick(Object.keys(FLAVORS));
    const L = lines(g, this, v, FLAVORS[flavor]);
    let done = false;
    const give = () => this.giveCandy(flavor, drop);
    if (g.talk?.start && !g.pc?.active) {
      const who = { h: D, name: 'Gen-san', id: 'gensan', color: '#ff7aa8' };
      const p = g.talk.start(who, async (t) => {
        for (const s of L.open) await t.say(s);
        const opts = ['Thanks, Gen-san!'];
        if (!S.flags.askedSign) opts.push('Why does your van say FREE CANDY?');
        else opts.push(pick(['How is your back?', 'Any news on the lane?', 'Busy day?']));
        const i = await t.choose(opts, { time: 9 });
        if (i === 1 && !S.flags.askedSign) { S.flags.askedSign = true; for (const s of SIGN_STORY) await t.say(s); }
        else if (i === 1) await t.say(pick(SMALLTALK));
        await t.say(L.candy, { gesture: 'point' });
        give();
        await t.say(pick(['Right, the lane waits for no one. See you!', 'Off I go. Mind the cat!', 'See you next time, shopkeeper!']));
      }, { leave: true });
      if (p?.then) p.then((r) => { done = true; if (!this._gave) give(); return r; }); else done = true;
      yield this.until(() => done);
    } else {
      // no cinematic chat: speech bubbles over his head
      const all = [...L.open, L.candy];
      for (const s of all) { this.bubble(s); yield this.wait(Math.min(4, 1.6 + s.length * 0.035)); }
      give();
      yield this.wait(0.8);
    }
    this._gave = false;
    this.lookAt = null;
    S.met = true;
  }

  giveCandy(flavor, drop) {
    const g = this.game;
    this._gave = true;
    this.S.candies++;
    if (g.held.giveTool('gen_candy', { flavor })) { audio.play('candyWrapper', { vol: 0.6 }); g.news(`A ${FLAVORS[flavor]} candy from Gen-san`, 'Click to eat it', 3500); return; }
    this.leaveCandy(drop, flavor);
  }
  leaveCandy(drop, flavor = pick(Object.keys(FLAVORS))) {
    const g = this.game;
    const top = this.visit.tops?.[0];
    let p = V3(drop.x - 0.2, 0, drop.z + 0.3);
    if (top?.obj) { const b = new THREE.Box3().setFromObject(top.obj); p = V3((b.min.x + b.max.x) / 2, b.max.y + 0.005, (b.min.z + b.max.z) / 2); }
    g.items.spawnTool({ id: 'gen_candy', flavor }, p, Math.random() * 6);
    this.S.candies++;
  }
}
const cargoMat = new THREE.MeshStandardMaterial({ color: 0xc89a5f, roughness: 0.95 });

function nameOf(d) {
  if (!d) return '';
  if (d.type === 'refill') return `${SERIES_BY_ID[d.series]?.name || 'capsule'} capsules`;
  if (d.type === 'install') return d.name || 'a big box';
  if (d.type === 'single') return getItem(d.key)?.name || 'a figure';
  return d.label || boxLabel(d) || 'a parcel';
}

const SIGN_STORY = [
  'Ha! Everybody asks. I bought this van off a sweets wholesaler in 1979. It already said FREE CANDY.',
  'I meant to repaint it. Forty years later... well. The paint shop says it is "iconic".',
  'So now I carry candy. If the van says it, a man should honour it!',
];
const SMALLTALK = [
  'My back? Older than your machines, and twice as creaky.',
  "Mrs. Tanaka's hydrangeas are out. She made me look at every single one.",
  'A mother called the police on the van again last week. Third time. They know me by name now.',
  'The pigeons by the station have learned the sound of my engine. They want candy too.',
  'Kids wave at the van. Their parents... wave less.',
];
const CANDY_LINES = (f) => [`Here, a ${f} one. Don't tell your dentist.`, `Have a candy. ${f[0].toUpperCase() + f.slice(1)}, today's special.`, `One ${f} candy for the shopkeeper. The van says FREE, so it's free!`];

/** What Gen-san says this stop: he remembers your deliveries, your last order and the shop. */
function lines(g, C, v, flavor) {
  const S = C.S, n = S.visits, h = g.clock?.hours ?? 12, out = [];
  if (!S.met) {
    out.push("Good day! Lane Express. I'm Genzo... everybody calls me Gen-san.");
    out.push("So you're the grandkid! Your granddad was on my route for thirty years. Always had tea ready.");
  } else {
    out.push(pick([
      n % 10 === 0 ? `That's delivery number ${n}! You keep an old man busy.` : `Delivery number ${n}, if I'm counting right. And I always am.`,
      h < 10 ? 'Up with the crows, eh? Me too.' : h >= 18 ? "Last stop of the day, then it's home to my wife's curry." : 'Afternoon! Hot one today, or is it just the van?',
      `There's my favourite gacha shop!`,
    ]));
    const last = S.last;
    if (last?.name && v.names[0] && last.name !== v.names[0] && last.day !== (g.clock?.day ?? 1)) out.push(`Last time it was ${last.name}. Today: ${v.names[0]}. Busy shop!`);
  }
  // about what he's bringing
  const it = v.items.find((d) => d.type === 'parcel' && d.contents?.some((c) => c.d?.variant?.smell)) ;
  const smell = it?.contents.find((c) => c.d?.variant?.smell)?.d.variant.smell;
  if (smell) out.push(`Is it me, or does this box smell like ${smell}?`);
  else if (v.items.some((d) => d.type === 'install' && d.what === 'machine')) out.push('A whole machine! Mind your back... oh wait, I carried it. Mind MY back.');
  else if (v.items.some((d) => d.junk)) out.push("This one rattles. I didn't shake it. Much.");
  else if (v.items.some((d) => d.from === 'KGS')) out.push('Something back from the grading people. Fancy!');
  else if (v.items.some((d) => d.type === 'refill')) out.push("Capsules! The kids'll be lining up.");
  else if (!v.items.length && C.outbox().length) out.push('Just a pickup today? Easy money.');
  // the shop
  const ms = g.machines || [];
  if (!ms.length) out.push('No machines yet? Your granddad had six in here. Six! And a cat.');
  else if (ms.some((m) => !m.data.stock?.length)) out.push('One of your machines is empty, you know. The kids notice.');
  else if (ms.length >= 4 && Math.random() < 0.5) out.push('Look at this place. Just like the old days.');
  return { open: out.slice(0, 3), candy: pick(CANDY_LINES(flavor)) };
}
