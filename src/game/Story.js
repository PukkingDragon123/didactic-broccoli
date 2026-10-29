// The new-game story: you arrive with the garage key; the objective card in the corner tells you what's next. Behind the shutter the shop is
// a mess — dust piles, trash bags, a knocked-over machine, broken ones, a dead light, a radio without
// batteries and a hungry stray cat. Buy supplies at Mikawa-ya across the lane, clean up, fix everything,
// feed the cat, and the shop reopens (sign lights up, customers start wandering in).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { radio } from '../core/music.js';
import { bgm, TRACKS } from '../core/bgm.js';
import { ease } from '../core/util.js';
import { propMesh } from '../world/props.js';
import { GARAGE } from '../world/Garage.js';
import { TOOLS } from '../data/tools.js';
import { formatYen } from '../core/util.js';
import { createHuman, GESTURES } from '../people/index.js';

const TIN_MONEY = 2500;

// the mess (floor positions inside the garage)
const PILES = [
  { id: 'p1', prop: 'dust_pile', x: -1.7, z: 3.4, r: 0.4 },
  { id: 'p2', prop: 'rubbish_pile', x: 1.25, z: 2.7, r: 1.2 },
  { id: 'p3', prop: 'cardboard_mess', x: 2.55, z: 0.95, r: 2.6 },
  { id: 'p4', prop: 'dust_pile', x: -1.0, z: -2.3, r: 4.1 },
  { id: 'p5', prop: 'rubbish_pile', x: 0.7, z: -3.5, r: 5.3 },
  { id: 'p6', prop: 'dust_pile', x: 2.35, z: -1.3, r: 0.9 },
];
const BAGS = [
  { id: 'b1', x: -2.35, z: -3.85, r: 0.3 },
  { id: 'b2', x: 2.65, z: 3.95, r: 2.1, prop: 'b' },
  { id: 'b3', x: -0.55, z: 4.3, r: 4.4 },
];
const BOWL = new THREE.Vector3(-0.95, 0, 2.38);
const BED = new THREE.Vector3(-1.55, 0, 2.15);
const TIN = new THREE.Vector3(-1.52, 1.712, -4.66);

const dustColors = [0x9a8a78, 0x7a6e62, 0xb8a894, 0x5a5048];

export class Story {
  constructor(game) {
    this.game = game;
    this.piles = new Map();
    this.covers = new Map();
    this.t = 0;
  }

  get flags() { return this.game.state.story; }
  get done() { return !!this.flags.complete; }

  /** Called once everything (garage, town, machines, PC, museum) exists. */
  init() {
    const g = this.game, f = this.flags;
    const G = g.garage;
    if (this.done) {
      G.setShutter(1, true);
      g.garage.town?.setShopOpen?.(true);
      // Mikan's corner by the heater
      this.bed = G.prop('cat_bed', BED.x, 0, BED.z, 0.5, { fallbackSize: [0.5, 0.22, 0.4], fallbackColor: 0xb89068 });
      this.setBowl(true);
      return;
    }
    // shutter
    G.setShutter(f.shutter ? 1 : 0, true);
    g.interaction.add(G.shutterMesh, { hint: (held) => this.shutterHint(held), use: () => this.useShutter(), noHighlight: false });
    g.garage.town?.setShopOpen?.(!!f.opened);
    // piles of dust & rubbish
    for (const p of PILES) if (!f.swept.includes(p.id)) this.addPile(p);
    // trash bags still lying around (not thrown out and not in your pockets)
    const carried = new Set(g.held.slots.filter((s) => s?.data?.bag).map((s) => s.data.bag));
    for (const b of BAGS) if (!f.bags.includes(b.id) && !carried.has(b.id)) g.items.spawnTool({ id: 'trash_bag', story: true, bag: b.id }, new THREE.Vector3(b.x, 0, b.z), b.r);
    this.setupGarbage();
    // machines: knocked over and broken
    for (const m of g.machines) this.setupMachine(m);
    // the cat's corner by the heater
    this.bed = G.prop('cat_bed', BED.x, 0, BED.z, 0.5, { fallbackSize: [0.5, 0.22, 0.4], fallbackColor: 0xb89068 });
    this.bowl = null;
    this.setBowl(f.fed);
    // Grandpa's cash tin on the steel rack
    if (!f.cash) {
      this.tin = G.prop('cash_tin', TIN.x, TIN.y, TIN.z, 0.2, { fallbackSize: [0.18, 0.08, 0.14], fallbackColor: 0x3a6aa8 });
      g.interaction.add(this.tin, { hint: () => ({ key: 'LMB', text: "Open Grandpa's cash tin" }), use: () => { if (!this.flags.cash) g.cutscene.play((c) => this.cashScene(c)); return false; } });
    }
    // the dead fluorescent tube
    const tube = G.lights.tubes[1];
    if (!f.tube && tube) {
      tube.dead = true;
      G.setLights(G.lightsOn);
      g.interaction.add(tube.fix, {
        reach: 2.6,
        hint: (held) => (g.held.holding('tube') ? { key: 'LMB', text: 'Replace the tube' } : { key: '', text: 'This light is dead', sub: 'Needs a new fluorescent tube' }),
        use: () => { if (g.held.holding('tube')) g.cutscene.play((c) => this.tubeScene(c)); return false; },
      });
    }
    if (!f.radio) g.state.radio = -1;
  }

  // ------------------------------------------------------------------ to-do list (progress for the objective card)
  todo() {
    const f = this.flags, g = this.game;
    if (this.done) return [{ text: 'Reopen the garage', done: true }, { text: 'Find every figure!', done: false }];
    const fixed = g.machines.filter((m) => !m.data.broken && !m.data.fallen).length;
    return [
      { text: 'Open the shutter with the key', done: f.shutter },
      { text: 'Find the cash tin on the steel rack', done: f.cash },
      { text: 'Buy milk and feed the cat', done: f.fed },
      { text: `Sweep up the mess (${f.swept.length}/${PILES.length})`, done: f.swept.length >= PILES.length },
      { text: `Take out the trash bags (${f.bags.length}/${BAGS.length})`, done: f.bags.length >= BAGS.length },
      { text: `Fix my old machines (${fixed}/${g.machines.length})`, done: fixed >= g.machines.length },
      { text: 'New tube for the dead light', done: f.tube },
      { text: 'Batteries for the radio', done: f.radio },
      { text: 'Grand reopening!', done: f.opened },
    ];
  }

  coreDone() {
    const f = this.flags, g = this.game;
    return f.shutter && f.fed && f.swept.length >= PILES.length && f.bags.length >= BAGS.length && g.machines.every((m) => !m.data.broken && !m.data.fallen);
  }

  task(text) {
    audio.play('task', { vol: 0.7 });
    this.game.news(text, 'Objective complete');
    this.game.save();
  }

  // ------------------------------------------------------------------ tool hints & clicks (nothing targeted)
  toolHint(it) {
    const id = it.data.id;
    const f = this.flags;
    const H = {
      key: f.shutter ? { key: '', text: 'Garage key' } : { key: '', text: 'Garage key', sub: 'Use it on the shutter' },
      milk: { key: '', text: 'Milk', sub: 'Pour it into the cat bowl by the heater' },
      broom: { key: 'Hold LMB', text: 'Sweep', sub: 'Point at a mess to clean it up' },
      batteries: { key: '', text: 'Batteries', sub: 'For the radio on the fridge' },
      toolkit: { key: '', text: 'Tool kit', sub: 'Hold LMB on a broken machine' },
      tube: { key: '', text: 'Fluorescent tube', sub: 'For the dead ceiling light' },
      trash_bag: { key: '', text: 'Trash bag', sub: 'Garbage station across the lane, left of the shop' },
      flyers: { key: '', text: `Flyers (${it.data.uses || 0} left)`, sub: 'Hand them to people on the street' },
    };
    return H[id] || { key: 'Q', text: `Put down ${TOOLS[id]?.name || ''}` };
  }

  toolPrimary(it) {
    const id = it.data.id;
    if (id === 'broom') { this.game.held.swing = 1; audio.play('sweep', { vol: 0.5 }); }
  }

  // ------------------------------------------------------------------ shutter
  shutterHint(held) {
    if (this.flags.shutter) return null;
    if (this.game.held.holding('key')) return { key: 'LMB', text: 'Unlock the shutter' };
    return { key: '', text: 'Locked', sub: this.game.held.has('key') ? "Select Grandpa's key (2) and click" : 'It needs a key' };
  }

  useShutter() {
    if (this.flags.shutter || !this.game.held.holding('key')) return false;
    this.game.cutscene.play((c) => this.openShutterScene(c));
    return false;
  }

  *openShutterScene(c) {
    const g = this.game, G = g.garage, z = GARAGE.maxZ;
    const V = (x, y, zz) => new THREE.Vector3(x, y, zz);
    // the key in the old lock
    yield c.cam({ pos: V(0.9, 1.45, z + 1.1), look: V(0.2, 0.7, z), dur: 0.7, fov: 50 });
    audio.play('keyTurn', { pos: V(0, 0.6, z), vol: 1 });
    yield c.all(c.wait(1.0), c.say("It's been years since anyone opened this.", 0.6));
    // from inside the dark garage: the shutter rolls up and the evening pours in
    yield c.fade(1, 0.25);
    c.hideSay();
    yield c.cam({ pos: V(-1.3, 0.5, 0.6), look: V(0.2, 1.0, z), fov: 64 });
    yield c.fade(0, 0.25);
    audio.play('shutterRoll', { pos: V(0, 2, z), dur: 2.8, vol: 1 });
    let t = 0;
    yield {
      update: (dt) => {
        t = Math.min(1, t + dt / 2.8);
        G.setShutter(ease.inOutQuad(t));
        c.pos.set(-1.3 + t * 0.4, 0.5 + t * 0.35, 0.6 + t * 0.5);
        if (Math.random() < dt * 18) g.effects.sparks({ pos: V((Math.random() - 0.5) * 5.5, 0.2 + t * 2, z - 0.2 - Math.random() * 2), count: 3, colors: dustColors, speed: 0.15, size: 0.035, gravity: -0.05, life: 2.2, star: 0, drag: 1, radius: 1.2 });
        return t >= 1;
      },
    };
    this.flags.shutter = true;
    g.player.pos.set(0.4, 0, z + 1.6);
    g.player.yaw = 0; g.player.pitch = -0.05;
    // the cat bolts deeper into the dark garage
    g.street?.scareCat?.();
    audio.play('meow', { pos: V(-1, 0.3, 1), vol: 0.6, pitch: 1.2 });
    yield c.cam({ pos: V(0.4, 1.5, z + 2.4), look: V(-0.3, 0.9, 0), fov: 62 });
    yield c.all(c.cam({ pos: V(0.4, 1.55, z + 1.8), look: V(-0.6, 0.7, 0.5), dur: 3.0 }), c.say('Dusty... and something just ran under the table.', 1.4));
    c.hideSay();
    yield c.toPlayer(0.8);
    this.task('Shutter open!');
  }

  // ------------------------------------------------------------------ dust piles
  addPile(p) {
    const g = this.game;
    const m = propMesh(p.prop, { fallbackSize: [0.6, 0.08, 0.5], fallbackColor: 0x8a7a66 });
    m.position.set(p.x, 0.002, p.z);
    m.rotation.y = p.r;
    g.garage.add(m);
    const pile = { def: p, mesh: m, k: 0 };
    this.piles.set(p.id, pile);
    g.interaction.add(m, {
      hint: () => (g.held.holding('broom')
        ? { key: 'Hold LMB', text: 'Sweep up', sub: pile.k > 0 ? `${Math.round(pile.k * 100)}%` : '' }
        : { key: '', text: 'Dust and rubbish', sub: 'Sweep it with a broom (Mikawa-ya)' }),
      use: () => (g.held.holding('broom') ? undefined : false),
      hold: {
        canStart: () => g.held.holding('broom'),
        start: () => { pile.next = 0; },
        update: (dt) => this.sweep(pile, dt),
        done: () => pile.k >= 1,
      },
    });
  }

  sweep(pile, dt) {
    const g = this.game;
    pile.k = Math.min(1, pile.k + dt / 1.8);
    pile.next -= dt;
    const p = pile.mesh.position;
    if (pile.next <= 0) {
      pile.next = 0.42;
      g.held.swing = 1;
      audio.play('sweep', { pos: p, vol: 0.8 });
      g.effects.sparks({ pos: p.clone().add(new THREE.Vector3(0, 0.1, 0)), count: 10, colors: dustColors, speed: 0.35, size: 0.03, gravity: -0.08, life: 1.4, star: 0, drag: 1.4, radius: 0.4 });
    }
    const s = 1 - pile.k * 0.85;
    pile.mesh.scale.set(s, s * s, s);
    if (pile.k >= 1) {
      g.interaction.remove(pile.mesh);
      pile.mesh.parent?.remove(pile.mesh);
      this.piles.delete(pile.def.id);
      this.flags.swept.push(pile.def.id);
      audio.play('dust', { pos: p, vol: 0.8 });
      g.effects.sparks({ pos: p.clone().add(new THREE.Vector3(0, 0.15, 0)), count: 18, colors: [0xffffff, 0xfff0c0], speed: 0.4, size: 0.015, gravity: -0.1, life: 0.8, star: 1 });
      const left = PILES.length - this.flags.swept.length;
      this.task(left ? `Swept! ${left} more to go` : 'The floor is clean!');
    }
  }

  // ------------------------------------------------------------------ trash bags -> garbage station
  setupGarbage() {
    const g = this.game;
    const town = g.garage.town;
    let st = town?.garbageStation;
    if (!st) town?.group.traverse((o) => { if (!st && o.userData.propId === 'garbage_station') st = o; });
    if (!st) return;
    this.station = st;
    g.interaction.add(st, {
      hint: () => (g.held.holding('trash_bag') ? { key: 'LMB', text: 'Throw out the trash bag' } : null),
      use: () => { if (g.held.holding('trash_bag')) this.throwBag(); return false; },
      reach: 2.6,
    });
  }

  throwBag() {
    const g = this.game, it = g.held.item;
    const target = this.station.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.5, 0.1));
    g.held.putTo(target, new THREE.Quaternion(), (obj) => {
      obj.parent?.remove(obj);
      audio.play('thud', { pos: target, v: 0.4 });
      if (it.data.bag && !this.flags.bags.includes(it.data.bag)) this.flags.bags.push(it.data.bag);
      const left = BAGS.length - this.flags.bags.length;
      if (it.data.story) this.task(left ? `Trash out! ${left} bag${left > 1 ? 's' : ''} left` : 'All the trash is out!');
    }, { dur: 0.45, arc: 0.3, scale: 0.6 });
  }

  // ------------------------------------------------------------------ machines
  setupMachine(m) {
    const d = m.data;
    if (!d.broken && !d.fallen) return;
    const g = this.game;
    if (d.fallen) this.layDown(m, 1);
    if (d.broken && !m.sign) {
      const s = propMesh('out_of_order', { fallbackSize: [0.2, 0.15, 0.01], fallbackColor: 0xf4f0e0 });
      s.position.set(0, m.L.slot.y + 0.16, m.L.front + 0.004);
      s.rotation.z = 0.06;
      m.root.add(s);
      m.sign = s;
    }
    this.cover(m);
    void g;
  }

  /** Tip a machine onto its side (k = 1) or stand it up (k = 0). */
  layDown(m, k) {
    const slot = m.root.userData.slot || (m.root.userData.slot = { pos: m.root.position.clone(), q: m.root.quaternion.clone() });
    const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (Math.PI / 2 - 0.06) * k);
    m.root.quaternion.copy(slot.q).multiply(roll);
    m.root.position.copy(slot.pos).add(new THREE.Vector3(0, (m.L.w / 2) * Math.sin(k * Math.PI / 2), 0));
    m.root.updateMatrixWorld(true);
    const hide = k > 0.01;
    if (m.rope) { m.rope.mesh.visible = !hide; for (const c of m.rope.coins) c.visible = !hide; }
  }

  /** An invisible box over a machine that takes the clicks while it's fallen / broken. */
  cover(m) {
    const g = this.game;
    this.uncover(m);
    const bb = new THREE.Box3().setFromObject(m.model).expandByScalar(0.03);
    const size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    const box = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshBasicMaterial({ visible: false }));
    box.position.copy(c);
    g.scene.add(box);
    const ob = m.data.fallen ? g.player.addObstacle(bb.min.x, bb.max.x, bb.min.z, bb.max.z) : null;
    const st = { box, ob, k: 0, next: 0 };
    this.covers.set(m, st);
    g.interaction.add(box, {
      highlight: m.model,
      hint: () => {
        const d = m.data;
        if (d.fallen) return { key: 'Hold LMB', text: 'Lift the machine back up', sub: st.k > 0 ? `${Math.round(st.k * 100)}%` : '' };
        if (g.held.holding('toolkit')) return { key: 'Hold LMB', text: 'Repair the machine', sub: st.k > 0 ? `${Math.round(st.k * 100)}%` : '' };
        return { key: '', text: 'Out of order', sub: 'Needs a tool kit (Mikawa-ya)' };
      },
      use: () => (m.data.fallen || g.held.holding('toolkit') ? undefined : false),
      hold: {
        canStart: () => m.data.fallen || g.held.holding('toolkit'),
        start: () => { st.next = 0; },
        update: (dt) => (m.data.fallen ? this.lift(m, st, dt) : this.repair(m, st, dt)),
        done: () => st.k >= 1 || st.anim,
        end: () => { if (!st.anim && st.k < 1) st.k = 0; },
      },
    });
  }

  uncover(m) {
    const st = this.covers.get(m);
    if (!st) return;
    const g = this.game;
    g.interaction.remove(st.box);
    st.box.parent?.remove(st.box);
    if (st.ob) g.player.removeObstacle(st.ob);
    this.covers.delete(m);
  }

  lift(m, st, dt) {
    const g = this.game;
    st.k = Math.min(1, st.k + dt / 1.1);
    g.player.shake = Math.max(g.player.shake, 0.25);
    if (st.k < 1 || st.anim) return;
    st.anim = true;
    audio.play('crankGrind', { pos: m.root.position, vol: 1 });
    let t = 0;
    g.tweens.add({
      dur: 0.9, ease: ease.outBack,
      update: (k) => { t = k; this.layDown(m, 1 - k); },
      done: () => {
        void t;
        this.layDown(m, 0);
        m.data.fallen = false;
        audio.play('thud', { pos: m.root.position, v: 0.9 });
        g.player.shake = 0.6;
        g.effects.sparks({ pos: m.root.position.clone().add(new THREE.Vector3(0.3, 0.1, 0)), count: 26, colors: dustColors, speed: 0.6, size: 0.04, gravity: -0.05, life: 1.8, star: 0, drag: 1.2, radius: 0.6 });
        this.cover(m);
        this.task('Machine back on its feet. Now it needs fixing.');
      },
    });
  }

  repair(m, st, dt) {
    const g = this.game;
    st.k = Math.min(1, st.k + dt / 3.2);
    st.next -= dt;
    const front = m.local(0, m.L.slot.y, m.L.front + 0.05);
    if (st.next <= 0) {
      st.next = 0.45;
      audio.play(Math.random() < 0.3 ? 'zap' : 'wrench', { pos: front, vol: 0.9 });
      g.effects.sparks({ pos: front, count: 8, colors: [0xfff4a0, 0xffb040, 0xffffff], speed: 0.9, size: 0.012, gravity: 1.2, life: 0.5, star: 0.6 });
      g.held.swing = 0.6;
    }
    if (st.k < 1) return;
    m.data.broken = false;
    this.uncover(m);
    if (m.sign) {
      const s = m.sign; m.sign = null;
      const p0 = s.position.clone();
      g.tweens.add({ dur: 0.7, ease: ease.inQuad, update: (k) => { s.position.set(p0.x + k * 0.15, p0.y - k * 0.9, p0.z + k * 0.25); s.rotation.z = 0.06 + k * 2.4; }, done: () => s.parent?.remove(s) });
    }
    audio.play('upgrade', { pos: front, vol: 0.9 });
    g.effects.sparks({ pos: front, count: 40, colors: [0xffd23f, 0xffffff, 0x9fe0ff], speed: 0.9, size: 0.012, star: 1 });
    const left = g.machines.filter((x) => x.data.broken || x.data.fallen).length;
    this.task(left ? 'Fixed! It turns like new.' : 'Every machine works again!');
  }

  // ------------------------------------------------------------------ the cat
  setBowl(full) {
    const g = this.game, G = g.garage;
    if (this.bowl) { g.interaction.remove(this.bowl); this.bowl.parent?.remove(this.bowl); }
    this.bowl = G.prop(full ? 'cat_bowl_milk' : 'cat_bowl', BOWL.x, 0, BOWL.z, 0.3, { fallbackSize: [0.16, 0.05, 0.16], fallbackColor: full ? 0xf4f0e8 : 0xd86a4a });
    g.interaction.add(this.bowl, {
      hint: () => {
        if (g.held.holding('milk')) return { key: 'LMB', text: 'Pour the milk' };
        if (!this.flags.fed) return { key: '', text: 'An empty cat bowl', sub: 'She looks hungry. Milk from Mikawa-ya?' };
        return null;
      },
      use: () => { if (g.held.holding('milk')) this.pourMilk(); return false; },
    });
  }

  pourMilk() {
    const g = this.game;
    g.held.consume();
    audio.play('milk', { pos: BOWL, vol: 1 });
    this.setBowl(true);
    if (!this.flags.fed) g.cutscene.play((c) => this.feedScene(c));
  }

  *feedScene(c) {
    const g = this.game;
    const st = g.street;
    yield c.cam({ pos: new THREE.Vector3(BOWL.x + 1.3, 0.75, BOWL.z + 1.1), look: new THREE.Vector3(BOWL.x - 0.1, 0.12, BOWL.z), dur: 1.0 });
    // she peeks out from behind the heater and trots over
    if (st?.cat) { const cp = st.cat.pos; if (Math.hypot(cp.x - BOWL.x, cp.z - BOWL.z) > 2.6) cp.set(BOWL.x - 1.9, 0, BOWL.z - 1.1); }
    st?.catComeTo?.(BOWL);
    c.say('Psst... come on. It is for you.', 1.4);
    let waited = 0;
    yield c.until((dt) => !st || st.catArrived?.() || (waited += dt) > 7);
    yield c.wait(0.4);
    st?.catDrink?.(4);
    audio.play('purr', { pos: BOWL, vol: 0.8 });
    yield c.cam({ pos: new THREE.Vector3(BOWL.x + 0.75, 0.42, BOWL.z + 0.55), look: new THREE.Vector3(BOWL.x - 0.1, 0.12, BOWL.z - 0.05), dur: 2.2 });
    g.effects.sparks({ pos: BOWL.clone().add(new THREE.Vector3(0, 0.45, 0)), count: 10, colors: [0xff9fae, 0xff6f91], speed: 0.2, size: 0.03, gravity: -0.4, life: 1.6, star: 0 });
    c.say("Grandpa used to call her Mikan. Looks like she's staying.", 2);
    yield c.wait(3.4);
    this.flags.fed = true;
    st?.befriendCat?.();
    c.hideSay();
    yield c.toPlayer(0.9);
    this.task('Mikan the cat trusts you now!');
  }

  // ------------------------------------------------------------------ cash, tube, radio
  takeCash(keepTin = false) {
    const g = this.game;
    if (this.flags.cash) return;
    this.flags.cash = true;
    g.interaction.remove(this.tin);
    const p = this.tin.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0.05));
    audio.play('boxOpen', { pos: p, vol: 0.7 });
    g.effects.coinBurst({ pos: p, count: 14, up: 1.4, spread: 0.4, life: 1.2 });
    g.addMoney(TIN_MONEY);
    if (!keepTin) this.dropTin();
    this.task(`${formatYen(TIN_MONEY)} for supplies. Thanks, Grandpa.`);
  }

  dropTin() {
    const t = this.tin;
    if (t) this.game.tweens.add({ dur: 0.5, ease: ease.inQuad, update: (k) => t.scale.setScalar(1 - k), done: () => t.parent?.remove(t) });
  }

  fixTube() {
    const g = this.game, G = g.garage, tube = G.lights.tubes[1];
    g.held.consume();
    g.interaction.remove(tube.fix);
    this.flags.tube = true;
    audio.play('zap', { pos: tube.light.position, vol: 0.8 });
    // the new tube strikes with a couple of flickers
    let t = 0;
    g.tweens.add({ dur: 1.4, update: (k) => { t = k; const on = k > 0.9 || Math.sin(k * 40) > 0.4; tube.dead = !on; G.setLights(G.lightsOn); }, done: () => { void t; tube.dead = false; G.setLights(G.lightsOn); if (!G.lightsOn) G.setLights(true); g.state.lightsOn = true; } });
    this.task('Let there be light!');
  }

  radioHint() {
    const g = this.game;
    if (this.done || this.flags.radio) return undefined;
    if (g.held.holding('batteries')) return { key: 'LMB', text: 'Put the batteries in' };
    return { key: '', text: "Grandpa's radio", sub: 'Dead. It takes AA batteries' };
  }

  useRadio() {
    const g = this.game;
    if (this.done || this.flags.radio) return false;
    if (!g.held.holding('batteries')) return true;
    g.held.consume();
    this.flags.radio = true;
    audio.play('relay', { vol: 0.6 });
    g.cutscene.play((c) => this.radioScene(c));
    return false;
  }

  // ------------------------------------------------------------------ little cinematic moments
  /** Meeting the shopkeeper of Mikawa-ya the first time you walk up to the counter. */
  *meetKeeperScene(c) {
    const g = this.game, P = g.pedestrians, k = P?.keeper;
    if (!k) return;
    const kp = k.h.root.position, V = (x, y, z) => new THREE.Vector3(x, y, z);
    const head = V(kp.x, k.h.height - 0.08, kp.z);
    yield c.cam({ pos: V(kp.x + 1.7, 1.45, kp.z - 2.0), look: head, dur: 1.0, fov: 48 });
    k.look = c.pos;
    k.h.gesture('bow');
    P.say(k.h, 'Irasshaimase! Oh my... you have his eyes. You must be his grandkid!', 4.2);
    yield c.cam({ pos: V(kp.x + 1.2, 1.5, kp.z - 1.7), look: head, dur: 4.2 });
    k.h.gesture('point');
    P.say(k.h, 'Milk is in the fridge, brooms by the door. Tell me what you need, dear.', 4.0);
    yield c.cam({ pos: V(kp.x - 0.9, 1.55, kp.z - 1.5), look: V(kp.x - 0.4, 1.3, kp.z), dur: 4.0 });
    k.look = null;
    yield c.toPlayer(0.7);
  }

  /** Grandpa's biscuit tin: a close-up, the lid comes off, coins and a note. */
  *cashScene(c) {
    const g = this.game, t = this.tin;
    if (!t) return;
    const p = t.getWorldPosition(new THREE.Vector3());
    yield c.cam({ pos: p.clone().add(new THREE.Vector3(0.55, 0.32, 0.75)), look: p, dur: 0.9, fov: 42 });
    yield c.cam({ pos: p.clone().add(new THREE.Vector3(0.32, 0.26, 0.48)), look: p.clone().add(new THREE.Vector3(0, 0.03, 0)), dur: 1.1 });
    this.takeCash(true);
    yield c.all(c.cam({ pos: p.clone().add(new THREE.Vector3(0.22, 0.34, 0.5)), look: p.clone().add(new THREE.Vector3(0, 0.02, 0)), dur: 3.0 }), c.say(`${formatYen(TIN_MONEY)} and a note: "For brooms and milk. NOT capsules. - Gramps"`, 1.4));
    c.hideSay();
    this.dropTin();
    yield c.toPlayer(0.7);
  }

  /** The new fluorescent tube strikes and the garage fills with light. */
  *tubeScene(c) {
    const g = this.game, tube = g.garage.lights.tubes[1];
    const p = tube.light.position.clone();
    yield c.cam({ pos: new THREE.Vector3(p.x + 1.6, 1.1, p.z + 1.8), look: p, dur: 0.9, fov: 58 });
    this.fixTube();
    yield c.wait(1.6);
    yield c.all(c.cam({ pos: new THREE.Vector3(p.x + 0.4, 1.5, p.z + 3.2), look: new THREE.Vector3(p.x - 0.5, 1.0, p.z - 1.5), dur: 2.2 }), c.say('Much better. I can finally see the mess.', 1.0));
    c.hideSay();
    yield c.toPlayer(0.7);
  }

  /** Batteries in: the radio crackles, finds a station, and the garage has music again. */
  *radioScene(c) {
    const g = this.game, p = g.garage.radio.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.12, 0));
    yield c.cam({ pos: p.clone().add(new THREE.Vector3(0.6, 0.15, 0.7)), look: p, dur: 0.9, fov: 46 });
    yield c.wait(0.8);
    g.state.radio = 0;
    radio.setStation(0);
    yield c.all(c.cam({ pos: p.clone().add(new THREE.Vector3(0.9, 0.35, 1.1)), look: p, dur: 2.8 }), c.say('The old radio still works! Grandpa never turned this station off.', 1.0));
    c.hideSay();
    yield c.toPlayer(0.7);
    this.task('The radio crackles back to life.');
  }

  // ------------------------------------------------------------------ grand reopening
  update(dt) {
    if (this.done) return;
    this.t += dt;
    const f = this.flags;
    if (!f.opened && this.coreDone() && !this.game.cutscene.active && !this.game.notebook?.open) {
      this.readyT = (this.readyT || 0) + dt;
      if (this.readyT > 1.5) { f.opened = true; this.game.cutscene.play((c) => this.reopenScene(c)); }
    }
  }

  *reopenScene(c) {
    const g = this.game, z = GARAGE.maxZ, town = g.garage.town;
    const V = (x, y, zz) => new THREE.Vector3(x, y, zz);
    const crowd = [];
    const BPM = TRACKS.party?.bpm || 120;
    yield c.fade(1, 0.6);
    // the lane's passers-by step out of shot; the neighbours gather on the apron, facing the shutter
    const peds = g.pedestrians;
    for (const p of peds?.list || []) p.h.root.visible = false;
    const cast = [['grandma', 3, -2.2, z + 2.6], ['kid', 8, -1.1, z + 1.9], ['schoolgirl', 11, 0.1, z + 2.3], ['salaryman', 5, 1.3, z + 2.8],
      ['otaku', 2, 2.4, z + 2.1], ['mom', 6, -3.1, z + 3.6], ['construction', 4, 3.3, z + 3.4], ['schoolboy', 9, -0.6, z + 3.5], ['tourist', 13, 0.9, z + 4.1]];
    for (const [preset, seed, x, zz] of cast) crowd.push(this.actor(c, preset, seed, x, zz, Math.PI + Math.atan2(-x * 0.25, 1.2)));
    const cat = g.street?.cat;
    if (cat && !cat.held) { cat.pos.set(0.6, 0, z + 1.1); cat.heading = Math.PI; g.street.setCatState?.('sit', 30); }
    yield c.cam({ pos: V(2.6, 1.35, z + 7.6), look: V(0, 1.9, z), fov: 58 });
    yield c.fade(0, 0.9);
    yield c.all(c.cam({ pos: V(1.4, 1.55, z + 6.2), look: V(0, 2.2, z), dur: 3.2 }), c.say('Grandpa... the garage is ready.', 1.0));
    c.hideSay();
    // the lanterns flicker on
    yield c.cam({ pos: V(0.6, 1.0, z + 4.6), look: V(0, 2.9, z), dur: 1.4, fov: 62 });
    audio.play('lightsOn', { vol: 1 });
    for (let i = 0; i < 4; i++) { town?.setShopOpen?.(i % 2 === 0); yield c.wait(0.12 + i * 0.05); }
    town?.setShopOpen?.(true);
    audio.play('complete', { vol: 0.9 });
    g.effects.confetti({ pos: V(0, 3.4, z + 0.8), count: 260, speed: 3.2 });
    for (const a of crowd) a.h.gesture(Math.random() < 0.5 ? 'cheer' : 'clap');
    yield c.title('OPEN FOR BUSINESS', '', 2.4);
    // party: everybody dances, the camera circles the crowd
    bgm.play('party', { fade: 0.6 });
    // everyone on the same beat: the song's own clock when it plays, else the scene's
    let songT = 0;
    c.every((dt) => { songT += dt; });
    const beat0 = TRACKS.party?.beat0 || 0;
    const clock = () => (bgm.time ?? songT) - beat0;
    const dance = (a) => a.h.gesture(GESTURES.dance ? 'dance' : 'cheer', { bpm: BPM, clock });
    crowd.forEach(dance);
    g.street?.setCatState?.('groove', 30, { bpm: BPM, clock });
    let t = 0;
    yield c.until((dt) => {
      t += dt;
      // from the shop doorway, looking out at the dancing crowd in the lane
      const k = t / 7.5;
      c.pos.set(-1.6 + k * 3.2, 1.55 + Math.sin(t * 0.6) * 0.1, z - 0.4 + Math.sin(k * Math.PI) * 0.5);
      c.look.set(-0.3 + k * 0.6, 1.05, z + 3.0);
      return t > 7.5;
    });
    const keeper = g.pedestrians?.keeper;
    yield c.all(c.cam({ pos: V(1.1, 1.5, z + 6.6), look: V(0, 1.5, z + 2.5), dur: 2.2 }), c.say('Now spread the word! Flyers from Mikawa-ya will bring customers in.', 1.6));
    c.hideSay();
    yield c.fade(1, 0.7);
    this.dropActors(crowd);
    for (const p of peds?.list || []) p.h.root.visible = true;
    if (keeper) keeper.look = null;
    g.street?.setCatState?.('sit', 4);
    bgm.play('garage', { fade: 2 });
    yield c.toPlayer(0);
    yield c.fade(0, 0.7);
    this.flags.complete = true;
    g.pedestrians?.setOpen?.(true);
    this.task('The shop is open for business!');
  }

  // ------------------------------------------------------------------ intro (new game)
  /** A person for a cutscene: placed, painted and kept animated until the scene ends. */
  actor(c, preset, seed, x, z, rotY, look = null) {
    const h = createHuman({ preset, seed });
    h.finishPaint?.();
    h.root.position.set(x, 0, z);
    h.root.rotation.y = rotY;
    this.game.scene.add(h.root);
    const a = { h, look };
    c.every((dt) => a.h && a.h.update(dt, { speed: 0, lookAt: a.look, talking: this.game.bubbles?.isTalking?.(a.h) }));
    return a;
  }

  dropActors(list) {
    for (const a of list) { this.game.bubbles?.clear?.(a.h); a.h.root.parent?.remove(a.h.root); a.h.dispose?.(); a.h = null; }
    list.length = 0;
  }

  /** Dress the lane as it was in Grandpa's day (true) or put the dusty present back (false). */
  memorySet(on) {
    const g = this.game, G = g.garage, f = this.flags;
    G.setShutter(on || f.shutter ? 1 : 0, true);
    G.town?.setShopOpen?.(on || !!f.opened);
    const tube = G.lights.tubes[1];
    if (tube && !f.tube) tube.dead = !on;
    G.setLights(on ? true : g.state.lightsOn !== false);
    for (const p of this.piles.values()) p.mesh.visible = !on;
    for (const e of g.items.list) if (e.data?.bag) e.obj.visible = !on;
    for (const m of g.machines) {
      if (m.data.fallen) this.layDown(m, on ? 0 : 1);
      if (m.sign) m.sign.visible = !on;
    }
    if (g.street?.cat) g.street.cat.g.visible = !on;
  }

  /** Footsteps for a walking camera: a little bob on the cutscene's camera offset, a step sound per stride. */
  walkBob(c, amp = 0.035) {
    let t = 0;
    this.bobOn = true;
    c.every((dt) => {
      const prev = Math.sin(t * Math.PI * 1.9);
      t += dt;
      const s = Math.sin(t * Math.PI * 1.9);
      c.offset.y = this.bobOn ? Math.abs(s) * amp : c.offset.y * Math.max(0, 1 - dt * 6);
      if (this.bobOn && prev * s < 0) audio.play('footstep', { vol: 0.35 });
    });
  }

  *introScene(c) {
    const g = this.game, z = GARAGE.maxZ;
    const town = g.garage.town;
    const V = (x, y, zz) => new THREE.Vector3(x, y, zz);
    const actors = [];
    c.setFade(1);
    bgm.play('intro', { loop: false, fade: 1.2 });
    // 1. the lane at golden hour; a train rumbles over the west underpass
    yield c.cam({ pos: V(-16.5, 2.3, z + 5.8), look: V(-29, 4.6, z + 4.6), fov: 55 });
    const tr = town?.trains?.find((t) => t.s < 0);
    if (tr) {
      town.runTrain(-1, 1);
      const len = new THREE.Box3().setFromObject(tr.g).getSize(new THREE.Vector3()).z;
      tr.z = 9.6 - len / 2 - 12.5 * 0.8;
      tr.played = false;
    }
    yield c.wait(0.3);
    yield c.all(c.fade(0, 2.2), c.cam({ pos: V(-17.6, 2.05, z + 5.2), look: V(-28, 4.4, z + 4.8), dur: 5.0, ease: (k) => k }), c.say('Grandpa always said our old garage had a little magic in it.', 1.0));
    // 2. walking down the lane; the shopkeeper at Mikawa-ya waves from behind the counter
    const keeper = g.pedestrians?.keeper;
    yield c.cam({ pos: V(-23, 1.62, z + 4.3), look: V(-10, 1.55, z + 3.8), fov: 62 });
    c.hideSay();
    this.walkBob(c);
    yield c.cam({ pos: V(-14.6, 1.62, z + 4.3), look: V(-12.6, 1.5, z + 12), dur: 3.6, ease: (k) => k });
    // the shopkeeper spots you and waves
    this.bobOn = false;
    if (keeper) {
      keeper.look = c.pos;
      keeper.h.gesture('wave');
      g.pedestrians.say(keeper.h, "Oh! Aren't you his grandkid? Welcome home!", 3.4);
    }
    const kp = keeper ? keeper.h.root.position : V(-12.6, 0, z + 14.4);
    yield c.cam({ pos: V(-13.4, 1.6, z + 5.4), look: V(kp.x, 1.45, kp.z), dur: 3.2, fov: 50 });
    this.bobOn = true;
    yield c.cam({ pos: V(-6.5, 1.62, z + 4.4), look: V(0, 1.6, z), dur: 3.4, fov: 62, ease: (k) => k });
    if (keeper) keeper.look = null;
    // 3. the shutter, closed for years
    yield c.cam({ pos: V(-1.2, 1.62, z + 5.8), look: V(0, 1.9, z), dur: 2.4 });
    this.bobOn = false;
    yield c.all(c.cam({ pos: V(0.2, 1.55, z + 4.4), look: V(0, 1.75, z), dur: 3.6 }), c.say("Grandpa's capsule toy shop. It's been shut for years.", 0.8));
    // 4. a memory: the shutter up, the lanterns lit, kids crowding his machines
    yield c.flash(() => {
      c.memory(true);
      c.hideSay();
      this.memorySet(true);
      actors.push(
        this.actor(c, 'grandpa', 41, 0.9, 3.7, 0.15),
        this.actor(c, 'kid', 12, -2.35, 0.35, -Math.PI / 2),
        this.actor(c, 'schoolgirl', 7, -2.1, 1.45, -Math.PI / 2 - 0.35),
        this.actor(c, 'schoolboy', 3, -1.55, -0.55, -Math.PI / 2 + 0.4),
        this.actor(c, 'kid', 29, 2.1, z + 1.2, -2.6));
      c.pos.set(2.6, 1.55, z + 5.6); c.look.set(-1.0, 1.0, 1.6);
    });
    const [gp, k1, k2, k3, k4] = actors;
    k1.h.gesture('browse'); k3.h.gesture('point');
    yield c.all(c.cam({ pos: V(1.9, 1.5, z + 3.3), look: V(-0.4, 1.15, 1.8), dur: 4.4 }), c.say('After school, kids lined up around the block for his machines.', 0.8),
      c.call(() => { k2.h.gesture('cheer'); audio.play('gachan', { pos: V(-3.2, 0.5, 0.8), vol: 0.8 }); }));
    gp.look = c.pos; gp.h.gesture('wave');
    k4.h.gesture('wave');
    g.pedestrians?.say(gp.h, 'One coin, one turn. Good luck!', 3.2);
    yield c.cam({ pos: V(1.6, 1.55, z + 1.4), look: V(0.85, 1.5, 3.7), dur: 2.6 });
    yield c.say('He knew every one of them by name.', 1.4);
    // 5. back to now: dust, a locked shutter... and something moving behind it
    yield c.flash(() => {
      c.memory(false);
      c.hideSay();
      this.dropActors(actors);
      this.memorySet(false);
      c.pos.set(0.9, 0.55, z + 1.6); c.look.set(0, 0.25, z);
    });
    yield c.wait(0.6);
    audio.play('meow', { pos: V(-0.3, 0.3, z - 0.6), vol: 0.7, pitch: 1.15 });
    audio.play('thud', { pos: V(-0.3, 0.4, z), v: 0.25 });
    yield c.say('...Was that a cat?', 0.9);
    // 6. back to your own eyes: the key
    g.player.pos.set(0.4, 0, z + 4.2);
    g.player.yaw = 0; g.player.pitch = 0.1;
    yield c.all(c.cam({ pos: V(0.4, 1.62, z + 4.2), look: V(0.3, 2.0, z - 1), dur: 2.0 }), c.say('He left me his key. Time to wake this place up.', 1.2));
    c.hideSay();
    bgm.play('garage', { fade: 4 });
    yield c.toPlayer(0.8);
    this.flags.intro = true;
    g.guide?.pulse();
  }
}
