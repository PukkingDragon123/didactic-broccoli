// The lane regulars' everyday life (dialogue scenes and quests are in story.js):
//   Josuke & Okuyasu hang out by the vending machines (or wherever the town's spots say), bicker in speech bubbles,
//   look at you, greet you (with a bizarre pose and some ゴゴゴ the first time), and every minute or two go on an
//   outing: a snack run to Mikawa-ya, a turn on your gacha machines (they pay like customers) or the park.
//   Kishibe Rohan sketches by the posted block wall, mutters, glares, sometimes goes home to his villa, and every so
//   often pops up right behind you to stare (turn around and... ゴゴゴ).
//   Throw a capsule at Josuke's hair and find out.
// Spots come from game.garage.town.spots when the town has them ({ name: { pos: Vector3, rotY, via?: [Vector3] } }),
// else from the fallbacks on the lane below.
import * as THREE from 'three';
import { Npc } from './Npc.js';
import './poses.js';
import { BIZARRE } from '../people/bizarre.js';
import { menace } from '../ui/menacing.js';
import { audio } from '../core/audio.js';
import { GARAGE, MACHINE_SLOTS } from '../world/Garage.js';
import { capsuleCost } from '../game/economy.js';
import { formatYen } from '../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

/** Where they hang out on the old lane (used until the town provides its own spots). */
export const FALLBACK_SPOTS = {
  rohan_sketch: { pos: V(-5.45, 0, 14.0), rotY: Math.PI + 0.25 }, // in front of the posted block wall, facing the garage
  rohan_gate: { pos: V(9.55, 0, 6.05), rotY: 0.2 }, // the mouth of alley A2
  josuke_hang: { pos: V(1.6, 0, 13.75), rotY: Math.PI - 0.55 }, // by FE2's vending machines
  okuyasu_hang: { pos: V(2.5, 0, 13.55), rotY: Math.PI + 0.65 },
  park_bench: null,
  park_swings: null,
};
/** In front of the garage (the trio's meeting) and where you stand to watch it. */
export const MEET = { rohan: V(-1.5, 0, 6.75), josuke: V(0.75, 0, 6.55), okuyasu: V(1.95, 0, 7.05), watch: V(0.2, 0, 8.9) };

export const LINES = {
  rohanMutter: ['Hmm. The light on that roof is... acceptable.', 'No. No, no, no. Again.', 'That passer-by has a fascinating nose.', 'Reality is the best reference.', 'The shadow under that eave. Perfect.', 'Deadline? What deadline.'],
  rohanNear: ["You're blocking my light.", "Don't move. Your silhouette is interesting.", '...What?', "Don't talk to me while I work.", 'Your shoelace is untied. Kidding. But you looked.'],
  rohanSeen: ["...Don't mind me. That expression just now. Perfect.", 'Hold that face. HOLD IT.', 'Oh? You noticed me. Your reaction time is... average.'],
  rohanUnseen: ['...Turn around, would you? I need the front.', 'Hmph. Not even a glance. Rude.'],
  rohanHome: ['Back to the desk. Twenty pages by morning.', 'My ink is calling.'],
  duoGreet: [['josuke', 'Yo.'], ['okuyasu', 'Oi! Got any snacks?'], ['josuke', "Hey, it's the gacha kid."], ['okuyasu', 'Heyyy! Over here!']],
  eating: ['MMM! Melon bread!', "This is SO good! Wanna bite? ...Too late, it's gone.", 'Snack time is the best time!'],
  gachaWin: ['YES! Look at that!', 'No way! A rare one!', 'This must be the work of fate!', 'GREAT!'],
  gachaMeh: ['Aw, a double.', 'Yare yare... a duplicate.', "It's not even edible."],
};
// Josuke & Okuyasu bickering by the vending machines: [who, line] (j = Josuke, o = Okuyasu)
export const BANTER = [
  [['o', "Josuke! I'm starving!"], ['j', 'You just ate, Okuyasu.'], ['o', 'That was TEN MINUTES ago!']],
  [['o', "Hey, why's that guy always drawing?"], ['j', "Don't look at him. He'll put you in his manga."]],
  [['j', 'Heard the gacha garage is open again.'], ['o', 'Gacha? Is that a kind of bread?']],
  [['o', 'What if the capsules had food inside?'], ['j', '...They don\'t.'], ['o', 'But what IF.']],
  [['j', 'That alley by Mikawa-ya gives me the creeps.'], ['o', 'Never look back, man. NEVER.']],
  [['o', 'Josuke, your hair looks extra great today!'], ['j', 'Heh. I know.']],
  [['j', 'Okuyasu, think before you talk.'], ['o', 'Think? About what?']],
  [['o', "I'd buy every capsule if I had the money!"], ['j', 'You have thirty yen.'], ['o', 'Exactly! THIRTY yen!']],
  [['j', 'Mikawa-ya got new snacks in.'], ['o', 'WHAT. Why are we still standing here?!']],
  [['o', 'I had a dream I was a vending machine.'], ['j', '...Did you have any drinks?'], ['o', 'Only corn soup.']],
];

/** Can a point be stood on without walking through houses? (the lane, the sidewalks, the garage floor) */
function walkable(p) {
  if (Math.abs(p.x) < GARAGE.maxX - 0.5 && p.z > GARAGE.minZ + 0.6 && p.z < GARAGE.maxZ - 0.3) return true;
  return p.z > 5.75 && p.z < 13.5 && Math.abs(p.x) < 24;
}

export class Cast {
  constructor(game) {
    this.game = game;
    const old = game.state.npcs;
    this.s = game.state.npcs = { v: 1, met: {}, days: 1, ...(old && typeof old === 'object' ? old : {}) };
    if (!this.s.met || typeof this.s.met !== 'object') this.s.met = {};
    this.group = new THREE.Group();
    this.group.name = 'regulars';
    game.scene.add(this.group);
    this.rohan = new Npc(game, this.group, { id: 'rohan', name: 'Rohan', color: '#4fd0a8', voice: { base: 236, duty: 0.125 }, base: 'hold_book', speed: 1.2 });
    this.josuke = new Npc(game, this.group, { id: 'josuke', name: 'Josuke', color: '#ff6fb0', voice: { base: 168, duty: 0.25 }, base: null, speed: 1.15 });
    this.okuyasu = new Npc(game, this.group, { id: 'okuyasu', name: 'Okuyasu', color: '#ff9a4a', voice: { base: 132, duty: 0.5, vol: 1.15 }, base: null, speed: 1.15 });
    this.list = [this.rohan, this.josuke, this.okuyasu];
    this.byId = { rohan: this.rohan, josuke: this.josuke, okuyasu: this.okuyasu };
    this.time = 0;
    this.tasks = {}; // name -> { gen, cur }
    this.duo = { banterT: rnd(5, 9), outingT: rnd(60, 110), greetT: 0, near: false };
    this.ro = { muttT: rnd(8, 16), nearT: 0, popT: rnd(80, 140), homeT: rnd(200, 320) };
    this.madUntil = 0;
    // start at their spots
    this.rohan.place(this.spot('rohan_sketch').pos, this.spot('rohan_sketch').rotY);
    this.josuke.place(this.spot('josuke_hang').pos, this.spot('josuke_hang').rotY);
    this.okuyasu.place(this.spot('okuyasu_hang').pos, this.spot('okuyasu_hang').rotY);
    this.rohan.mode = 'sketch';
    this.josuke.gesture('pockets');
    game.events.on('newDay', () => { this.s.days = (this.s.days || 1) + 1; });
    game.events.on('discover', (d) => this.onDiscover(d));
    this.buildMarkers();
  }

  // ------------------------------------------------------------------ places
  spot(name) {
    const sp = this.game.garage?.town?.spots?.[name];
    if (sp?.pos) return { pos: sp.pos.isVector3 ? sp.pos : V(sp.pos.x ?? sp.pos[0], 0, sp.pos.z ?? sp.pos[2]), rotY: sp.rotY ?? 0, via: sp.via };
    return FALLBACK_SPOTS[name] || null;
  }
  /** Mikawa-ya's door: out on the sidewalk and just inside. */
  shopDoor() {
    const d = this.game.garage?.town?.cornerShop?.door;
    const x = d ? (d.x0 + d.x1) / 2 : -12.4, z = d?.z ?? 14.9;
    return { out: V(x + 0.3, 0, z - 1.2), in: V(x, 0, z + 1.4) };
  }

  /** Waypoints from a to b: straight if both are on the lane, else via the lane / the garage door / a spot's via-points. */
  route(a, b, viaB = null) {
    const pts = [];
    const lane = (p) => V(p.x, 0, Math.min(13.2, Math.max(6.3, p.z)));
    const inGarage = (p) => Math.abs(p.x) < GARAGE.maxX && p.z < GARAGE.maxZ;
    const onLane = (p) => p.z > 5.9 && p.z < 13.5;
    const door = [V(0.4, 0, GARAGE.maxZ - 0.6), V(0.4, 0, GARAGE.maxZ + 1.2)];
    if (inGarage(a)) pts.push(door[0], door[1]);
    else if (!onLane(a)) pts.push(lane(a));
    if (inGarage(b)) { pts.push(V(0.4, 0, GARAGE.maxZ + 1.2), V(0.4, 0, GARAGE.maxZ - 0.6)); }
    else if (viaB?.length) { pts.push(lane(viaB[0]), ...viaB.map((p) => (p.isVector3 ? p : V(p.x, 0, p.z)))); }
    else if (!onLane(b)) pts.push(lane(b));
    pts.push(b.clone().setY(0));
    return pts;
  }
  goTo(npc, target, opts = {}) {
    const sp = typeof target === 'string' ? this.spot(target) : null;
    const pos = sp ? sp.pos : target;
    npc.walk(this.route(npc.pos, pos, sp?.via), { face: sp ? sp.rotY : opts.face ?? null, speed: opts.speed, then: opts.then });
  }
  home(npc) {
    const name = npc === this.rohan ? 'rohan_sketch' : npc === this.josuke ? 'josuke_hang' : 'okuyasu_hang';
    this.goTo(npc, name);
  }
  atHome(npc) {
    const name = npc === this.rohan ? 'rohan_sketch' : npc === this.josuke ? 'josuke_hang' : 'okuyasu_hang';
    return npc.distTo(this.spot(name).pos) < 0.4;
  }

  // ------------------------------------------------------------------ little coroutines for outings
  run(name, gen) { this.tasks[name] = { gen, cur: null }; }
  busy(name) { return !!this.tasks[name]; }
  cancel(name) { delete this.tasks[name]; }
  wait(sec) { const until = this.time + sec; return () => this.time >= until; }
  tick() {
    for (const [k, t] of Object.entries(this.tasks)) {
      for (let guard = 0; guard < 6; guard++) {
        if (t.cur && !t.cur()) break;
        const n = t.gen.next();
        if (n.done) { delete this.tasks[k]; break; }
        t.cur = n.value || null;
      }
    }
  }

  /** A cutscene takes these characters over: stop their outings, freeze their logic until released. */
  claim(...npcs) {
    for (const n of npcs) { n.script = true; n.stop(); }
    if (npcs.includes(this.josuke) || npcs.includes(this.okuyasu)) this.cancel('duo');
    if (npcs.includes(this.rohan)) this.cancel('rohan');
  }
  release(...npcs) {
    for (const n of npcs) { n.script = false; n.look = null; n.h.clearGesture(); n.noBase = false; }
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    this.time += dt;
    const scene = g.cutscene?.active;
    if (!scene) this.tick();
    if (!scene && !g.timeStop?.frozen) {
      this.updateDuo(dt);
      this.updateRohan(dt);
      this.checkHairHits();
    }
    const frozen = g.timeStop?.frozen; // the pocket watch: they hold still too (but the scene can still run)
    for (const n of this.list) if (!frozen || n.script) n.update(dt);
    this.updateMarkers();
  }

  get playerOutside() {
    const p = this.game.player.pos;
    return walkable(p);
  }

  // ------------------------------------------------------------------ Josuke & Okuyasu
  updateDuo(dt) {
    const J = this.josuke, O = this.okuyasu, D = this.duo, g = this.game;
    if (J.script || O.script) return;
    const pd = Math.min(J.playerDist, O.playerDist);
    const busy = this.busy('duo');
    if (!busy) {
      // drift home if they were moved
      if (!J.walking && !this.atHome(J)) this.home(J);
      if (!O.walking && !this.atHome(O)) this.home(O);
      const atHome = this.atHome(J) && this.atHome(O);
      // looks: you when you're close, otherwise each other (and the lane now and then)
      J.look = pd < 6 ? 'player' : atHome ? O : null;
      O.look = pd < 6 ? 'player' : atHome ? J : null;
      if (atHome && !J.h.currentGesture && Math.random() < dt * 0.05) J.gesture(pick(['pockets', 'pockets', 'arms_crossed', 'comb']));
      if (atHome && !O.h.currentGesture && Math.random() < dt * 0.03) O.gesture(pick(['scratch', 'arms_crossed', 'shrug']));
      // greet you when you walk up (the first time ever: poses and menace)
      D.greetT -= dt;
      const near = pd < 4.2;
      if (near && !D.near && D.greetT <= 0 && atHome) {
        D.greetT = 45;
        if (!this.s.met.duoPose) {
          this.s.met.duoPose = true;
          J.gesture('pose_point'); O.gesture('pose_cross');
          this.menaceOver(J, 'go'); setTimeout(() => this.menaceOver(O, 'go'), 250);
          setTimeout(() => this.say(J, this.s.met.duo ? 'Yo.' : 'Huh? Who are you supposed to be?'), 600);
        } else {
          const [who, line] = pick(LINES.duoGreet);
          this.say(who === 'josuke' ? J : O, line);
          if (Math.random() < 0.3) (who === 'josuke' ? J : O).gesture(pick(BIZARRE));
        }
      }
      D.near = near;
      // bicker
      D.banterT -= dt;
      if (D.banterT <= 0 && atHome) {
        D.banterT = rnd(14, 26);
        if (pd < 18 && !J.talking && !O.talking) this.run('banter', this.banter(pick(BANTER)));
      }
      // an outing
      D.outingT -= dt;
      if (D.outingT <= 0 && atHome && pd > 3 && !this.busy('banter')) {
        D.outingT = rnd(70, 140) * (this.s.regulars ? 0.75 : 1);
        const opts = ['shop'];
        if (this.gachaMachine() && (this.s.regulars || Math.random() < 0.6)) opts.push('gacha', 'gacha');
        if (this.spot('park_bench')) opts.push('park');
        const o = pick(opts);
        this.run('duo', o === 'gacha' ? this.gachaTrip() : o === 'park' ? this.parkTrip() : this.shopTrip());
      }
    }
  }

  *banter(lines) {
    for (const [w, text] of lines) {
      const n = w === 'j' ? this.josuke : this.okuyasu;
      if (n.script || this.busy('duo')) return;
      this.say(n, text);
      n.h.setExpression(/!|\?!/.test(text) ? 'surprised' : 'smile', 2);
      yield this.wait(1.2 + text.length * 0.055);
    }
  }

  say(npc, text, o) { npc.say(text, o); }

  *shopTrip() {
    const J = this.josuke, O = this.okuyasu, door = this.shopDoor();
    this.say(O, pick(['Snack run! Mikawa-ya!', "I'm getting melon bread. You coming?", 'Food. NOW.']));
    yield this.wait(1.2);
    this.goTo(O, door.out);
    this.goTo(J, door.out.clone().add(V(1.3, 0, -0.5)), { face: Math.PI * 0.5 });
    yield () => !O.walking && !J.walking;
    O.walk([door.in]);
    J.faceTo(door.in);
    yield () => !O.walking;
    yield this.wait(rnd(3, 5));
    try { audio.play('register', { vol: 0.25, pos: door.in }); } catch { /* */ }
    O.walk([door.out]);
    yield () => !O.walking;
    O.gesture('eat');
    this.say(O, pick(LINES.eating));
    yield this.wait(4.5);
    O.h.clearGesture();
    if (Math.random() < 0.5) { this.say(J, pick(['You got crumbs everywhere.', 'Did you get me anything? ...Of course not.'])); yield this.wait(2.5); }
    this.home(J); this.home(O);
    yield () => !O.walking && !J.walking;
  }

  /** A machine they can play (story done, stocked, working, not in use). */
  gachaMachine() {
    const g = this.game;
    if (!g.story?.done && !g.state.story?.complete) return null;
    const ok = g.machines.filter((m) => !m.data.broken && !m.data.fallen && m.data.stock.length > 0 && !(g.pedestrians?.list || []).some((p) => p.machine === m && (p.state === 'goIn' || p.state === 'play')));
    return ok.length ? pick(ok) : null;
  }

  *gachaTrip() {
    const g = this.game, J = this.josuke, O = this.okuyasu;
    const m = this.gachaMachine();
    if (!m) return;
    this.say(J, pick(['Wanna try the gacha garage?', "Let's do a turn at the garage.", 'One capsule. Just one.']));
    yield this.wait(1.2);
    const slot = MACHINE_SLOTS[m.data.slot] || { x: -3.42, z: 0 };
    const player = Math.random() < 0.5 ? O : J, other = player === O ? J : O;
    const stand = V(slot.x + 0.95, 0, slot.z), watch = V(slot.x + 1.7, 0, slot.z + (slot.z > 1 ? -0.7 : 0.7));
    this.goTo(player, stand, { face: (m.root.rotation.y || slot.rotY) + Math.PI });
    yield this.wait(0.6);
    this.goTo(other, watch);
    yield () => !player.walking && !other.walking;
    other.faceTo(stand);
    player.faceYaw = (slot.rotY ?? Math.PI / 2) + Math.PI;
    if (m.data.broken || !m.data.stock.length) { this.say(player, 'Sold out?! Aw, man.'); yield this.wait(2); }
    else {
      player.gesture('browse');
      player.look = m.local ? m.local(0, 1.2, 0.3) : null;
      this.say(player, pick(['Here goes...', 'Come on, come on...', 'Something tasty, please.']));
      const pos = m.local ? m.local(0, 1.0, (m.L?.front || 0.3) + 0.1) : stand;
      yield this.wait(1.3);
      try { audio.play('coinInsert', { pos, vol: 0.6 }); } catch { /* */ }
      for (let i = 0; i < 4; i++) { yield this.wait(0.28); try { audio.play('crankTick', { pos, vol: 0.5 }); } catch { /* */ } }
      yield this.wait(0.4);
      if (m.data.stock.length) {
        const series = takeCapsule(m);
        const price = capsuleCost(series) * 2;
        g.addMoney(price);
        g.state.stats.customers = (g.state.stats.customers || 0) + 1;
        try { audio.play('gachan', { pos, vol: 0.7 }); } catch { /* */ }
        g.effects.coinBurst({ pos: pos.clone().add(V(0, 0.3, 0)), count: 6, up: 1.2, spread: 0.3, life: 1 });
        m.openFlap?.();
        if (!this.s.firstPlay) { this.s.firstPlay = true; g.news(`${player.name} played your machine! +${formatYen(price)}`, 'The regulars pay like any customer'); }
        player.h.clearGesture();
        player.look = 'player';
        yield this.wait(0.6);
        if (Math.random() < 0.4) { player.gesture(pick(BIZARRE)); this.menaceOver(player, 'go'); this.say(player, pick(LINES.gachaWin)); if (Math.random() < 0.5) other.gesture(pick(BIZARRE)); }
        else { player.gesture('shrug'); this.say(player, pick(LINES.gachaMeh)); }
        yield this.wait(3.4);
      }
    }
    player.h.clearGesture(); player.look = null;
    this.home(player);
    yield this.wait(0.8);
    this.home(other);
    yield () => !player.walking && !other.walking;
  }

  *parkTrip() {
    const J = this.josuke, O = this.okuyasu, a = this.spot('park_bench'), b = this.spot('park_swings') || a;
    this.say(O, pick(["Let's go to the park!", 'Park! Swings! GO!']));
    yield this.wait(1);
    this.goTo(J, 'park_bench');
    yield this.wait(0.7);
    this.goTo(O, b === a ? a.pos.clone().add(V(0.9, 0, 0.3)) : 'park_swings');
    yield () => !O.walking && !J.walking;
    J.gesture('pockets');
    yield this.wait(rnd(30, 50));
    this.home(J); this.home(O);
    yield () => !O.walking && !J.walking;
  }

  // ------------------------------------------------------------------ Rohan
  updateRohan(dt) {
    const R = this.rohan, Ro = this.ro, g = this.game;
    if (R.script || this.busy('rohan')) return;
    if (!R.walking && !this.atHome(R)) { this.home(R); return; }
    if (R.walking) { R.look = null; return; }
    const pd = R.playerDist;
    // sketching: whoever is interesting nearby (you, the duo, a passer-by)
    if (R.h.currentGesture !== 'sketch' && !R.h.currentGesture?.startsWith('pose')) R.gesture('sketch');
    R.look = pd < 9 ? 'player' : this.subjectFor(R);
    Ro.muttT -= dt;
    if (Ro.muttT <= 0) { Ro.muttT = rnd(16, 30); if (pd < 14) R.say(pick(LINES.rohanMutter), { style: 'think' }); }
    Ro.nearT -= dt;
    if (pd < 3 && Ro.nearT <= 0) { Ro.nearT = 35; R.say(pick(LINES.rohanNear)); }
    // a dramatic pose every so often
    if (Math.random() < dt / 90 && pd < 12) { R.gesture(Math.random() < 0.5 ? 'flourish' : pick(BIZARRE)); if (pd < 8) this.menaceOver(R, 'go'); }
    // pop up behind you
    Ro.popT -= dt;
    if (Ro.popT <= 0) {
      Ro.popT = rnd(110, 200);
      if (this.canPop()) this.run('rohan', this.popup());
    }
    // home to the villa for a while
    Ro.homeT -= dt;
    if (Ro.homeT <= 0) {
      Ro.homeT = rnd(260, 420);
      if (this.game.garage?.town?.spots?.rohan_gate && pd > 6) this.run('rohan', this.gateTrip());
    }
  }

  subjectFor(R) {
    let best = null, bd = 12;
    for (const n of [this.josuke, this.okuyasu]) { const d = R.distTo(n.pos); if (d < bd) { bd = d; best = n; } }
    for (const p of this.game.pedestrians?.list || []) { const d = R.distTo(p.h.root.position); if (d < bd) { bd = d; best = { h: p.h, pos: p.h.root.position }; } }
    return best;
  }

  canPop() {
    const g = this.game;
    if (!(this.s.met.rohan || g.story?.done)) return false;
    if (g.cutscene?.active || g.uiOpen || g.pc?.active || g.held.reading || !this.playerOutside) return false;
    if (g.ghostAlley?.state === 'lead') return false;
    return !this.onScreen(this.rohan.pos.clone().setY(1.2)) || this.rohan.playerDist > 25;
  }
  onScreen(p, m = 0.95) {
    const v = _v.copy(p).project(this.game.camera);
    return v.z < 1 && Math.abs(v.x) < m && Math.abs(v.y) < m;
  }

  *popup() {
    const g = this.game, R = this.rohan, P = g.player;
    // a spot about 1.5 m behind you, out of sight
    g.camera.getWorldDirection(_w).setY(0).normalize();
    let at = null;
    for (const side of [0, 0.6, -0.6, 1.1, -1.1]) {
      const c = P.pos.clone().addScaledVector(_w, -1.45).add(V(-_w.z * side, 0, _w.x * side));
      if (walkable(c) && !this.onScreen(c.clone().setY(1.2), 1.1) && this.list.every((n) => n === R || n.distTo(c) > 1)) { at = c; break; }
    }
    if (!at) return;
    R.place(at, Math.atan2(P.pos.x - at.x, P.pos.z - at.z));
    R.gesture('stare');
    R.look = 'player';
    let seen = false;
    const t0 = this.time;
    yield () => (seen = this.onScreen(R.pos.clone().setY(R.h.height * 0.8), 0.7) && R.playerDist < 4.5) || this.time - t0 > 13 || R.playerDist > 9;
    if (seen) {
      this.menaceOver(R, 'go');
      try { audio.play('menace', { kind: 'go' }); } catch { /* */ }
      R.h.setExpression('stare', 2);
      yield this.wait(0.7);
      R.say(pick(LINES.rohanSeen));
      R.gesture('sketch');
      yield this.wait(4.2);
      if (Math.random() < 0.5) { R.gesture('flourish'); yield this.wait(2.4); }
      R.say('Hmph. Carry on.');
      yield this.wait(1.2);
    } else {
      if (R.playerDist < 9) R.say(pick(LINES.rohanUnseen));
      yield this.wait(2);
    }
    R.h.clearGesture();
    this.home(R);
    yield () => !R.walking;
  }

  *gateTrip() {
    const R = this.rohan;
    R.say(pick(LINES.rohanHome));
    yield this.wait(1.5);
    this.goTo(R, 'rohan_gate');
    yield () => !R.walking;
    R.gesture('arms_crossed');
    yield this.wait(rnd(45, 80));
    R.h.clearGesture();
    this.home(R);
    yield () => !R.walking;
  }

  // ------------------------------------------------------------------ reactions
  /** Menacing katakana beside someone's head, if they're on screen. */
  menaceOver(npc, kind = 'go') {
    const v = npc.h.headTop(_v).project(this.game.camera);
    if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) return;
    menace({ kind, at: [(v.x * 0.5 + 0.5) * innerWidth + 34, (0.5 - v.y * 0.5) * innerHeight + 70], n: kind === 'don' ? 1 : 3, dur: 2.4 });
  }

  /** Josuke loses it (someone mentioned / hit the hair). Outside cutscenes: a shout, a punch rush, a camera shake. */
  rage(why = 'say') {
    const g = this.game, J = this.josuke, O = this.okuyasu;
    this.madUntil = this.time + 45;
    this.s.hairInsults = (this.s.hairInsults || 0) + 1;
    J.stop(); J.faceTo(g.player.pos); J.look = 'player';
    J.gesture('dora');
    J.h.setExpression('furious', 4);
    J.say(why === 'hit' ? 'DID YOU JUST THROW SOMETHING AT MY HAIR?!' : 'WHAT DID YOU SAY ABOUT MY HAIR?!', { style: 'shout', dur: 3.2 });
    this.menaceOver(J, 'do');
    try { audio.play('menace', { kind: 'do' }); } catch { /* */ }
    this.shake(1.2, 0.02);
    setTimeout(() => { if (!O.script) { O.say('Uh-oh. You did it now...'); O.h.setExpression('surprised', 2); } }, 1600);
    setTimeout(() => { if (!J.script) { J.say('...Hah... hah... NOBODY insults this hair.', { dur: 3 }); J.h.setExpression('angry', 6); } }, 3800);
  }
  get mad() { return this.time < this.madUntil; }

  /** A short shake of your view (outside cutscenes). */
  shake(dur = 1, amp = 0.02) {
    const g = this.game, P = g.player;
    let t = 0;
    const base = { yaw: 0, pitch: 0 };
    const fn = (game, dt) => {
      t += dt;
      const k = Math.max(0, 1 - t / dur) * amp;
      const ny = (Math.random() - 0.5) * k, np = (Math.random() - 0.5) * k;
      P.yaw += ny - base.yaw; P.pitch += np - base.pitch; base.yaw = ny; base.pitch = np;
      if (t >= dur) { P.yaw -= base.yaw; P.pitch -= base.pitch; this.shakers.splice(this.shakers.indexOf(fn), 1); }
    };
    (this.shakers ||= []).push(fn);
  }
  updateShake(dt) { for (const fn of [...(this.shakers || [])]) fn(this.game, dt); }

  /** A tossed capsule bouncing off the pompadour. */
  checkHairHits() {
    const g = this.game, J = this.josuke;
    if (J.script || g.time - (g.held.tossed ?? -99) > 2.5) return;
    J.h.b.head.getWorldPosition(_v);
    _v.y += J.h.P.hu * 0.45;
    _w.set(Math.sin(J.yaw), 0, Math.cos(J.yaw));
    _v.addScaledVector(_w, J.h.P.hu * 0.25);
    for (const e of g.items.list) {
      if (e.kind !== 'capsule' || !e.body || e.hitHair) continue;
      if (e.body.pos.distanceTo(_v) < 0.4 && e.body.vel.length() > 0.4) {
        e.hitHair = true;
        e.body.vel.set(-e.body.vel.x * 0.5 + _w.x * 1.2, 1.4, -e.body.vel.z * 0.5 + _w.z * 1.2);
        try { audio.play('pop', { pos: _v, vol: 0.8 }); } catch { /* */ }
        this.rage('hit');
        this.game.events.emit('hairHit');
        break;
      }
    }
  }

  onDiscover(d) {
    if (this.game.cutscene?.active) return;
    const it = d?.key ? d.key.split('/') : null;
    if (!it) return;
    const R = this.rohan, O = this.okuyasu;
    if (!R.script && R.playerDist < 6 && Math.random() < 0.7) { R.say(pick(['Wait. Show me that.', 'Hm. The paint on that one is lazy.', 'That pose is anatomically impossible. I love it.'])); R.look = 'player'; }
    else if (!O.script && O.playerDist < 6 && Math.random() < 0.6) O.say(pick(['Whoa! Can you eat it?', 'Lucky! Do me next!', 'OOOH!']));
  }

  // ------------------------------------------------------------------ ! / ? markers over their heads
  buildMarkers() {
    const layer = document.createElement('div');
    layer.id = 'sq-marks';
    document.body.appendChild(layer);
    this.marks = {};
    for (const n of this.list) { const el = document.createElement('div'); el.className = 'mk'; layer.appendChild(el); this.marks[n.id] = el; }
  }
  updateMarkers() {
    const g = this.game, st = this.story;
    for (const n of this.list) {
      const el = this.marks[n.id];
      const kind = st && !g.cutscene?.active && !n.script ? st.marker(n) : null;
      let show = !!kind && n.playerDist < 26;
      if (show) {
        n.h.headTop(_v); _v.y += 0.22;
        const v = _v.project(g.camera);
        show = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        if (show) el.style.transform = `translate(${((v.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((0.5 - v.y * 0.5) * innerHeight).toFixed(1)}px)`;
      }
      if (show && el.textContent !== kind) { el.textContent = kind; el.classList.toggle('q', kind === '?'); }
      el.classList.toggle('on', show);
    }
  }
}

/** A customer's turn: one capsule leaves the machine's stock (and its window pile). Returns its series. */
export function takeCapsule(m) {
  const st = m.data.stock;
  const series = st.splice(Math.floor(Math.random() * st.length), 1)[0];
  if (m.pile?.length) {
    let best = 0;
    for (let i = 1; i < m.pile.length; i++) if (m.pile[i].pos.y < m.pile[best].pos.y) best = i;
    const b = m.pile.splice(best, 1)[0];
    m.pileWorld?.removeBody(b);
    for (const o of m.pile) o.wake?.();
    m.pileActive = 2;
    if (st.length > m.pile.length && m.pile.length < m.maxVisible) m.addPileCapsule?.(st[m.pile.length]);
  }
  return series;
}
