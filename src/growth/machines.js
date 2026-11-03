// Gacha machines outside the garage: the annex's and the Kaikan's machine spots. They are ordinary GachaMachines
// (src/game/GachaMachine.js: restock in small steps, price plate, coin box you empty by hand, your own test turns)
// placed with data.at, kept OUT of game.machines / state.machines (so the garage's customers, staff and chores never
// look for them) and saved in game.state.growth.machines[key].
//
//   new MachineSpots(game, zone, { key, slots: [[x, z, rotY]], first, label, types })
//     spots.ensureBuilt()      the 3D machines (built lazily, the first time you walk in: a fade hides the cost)
//     spots.update(dt)         per frame while you're in the zone      spots.list -> ZoneMachine[]   spots.data -> records
//     spots.simulate(min, k)   customers while you're away: plays straight on the records (coins, stock), k = rate
//     spots.playable() -> [machine]   spots.free() -> slot indices with no machine
// A free spot shows a taped square with a power point; click it for the order slip (machines are paid from the bank and
// arrive at once, empty: restock them with capsule cartons as usual).
import * as THREE from 'three';
import { GachaMachine } from '../game/GachaMachine.js';
import { MACHINE_TYPES, MACHINE_ORDER } from '../game/economy.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { slip } from './paper.js';
import { yen } from './data.js';

const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* audio not ready */ } };

/** A machine in one of the growth zones: plays don't ring the garage's tip jars (a 'zonePlay' event instead). */
export class ZoneMachine extends GachaMachine {
  customerPlay() {
    if (!this.canPlay()) return null;
    const g = this.game, price = this.price, n = Math.max(1, Math.round(price / 100));
    this.data.cash = this.cash + price;
    const series = this.takeCapsule();
    const slotP = this.local(this.L.slot.x, this.L.slot.y, this.L.front + 0.02);
    for (let i = 0; i < Math.min(n, 6); i++) g.tweens.wait(i * 0.13, () => audio.play('coinInsert', { pos: slotP, vol: 0.45 }));
    const t0 = Math.min(n, 6) * 0.13 + 0.2;
    g.tweens.wait(t0, () => { this.spin = { t: 0, dur: 0.85 }; });
    g.tweens.wait(t0 + 0.9, () => { audio.play('gachan', { pos: this.local(0, this.L.handle.y, this.L.front), vol: 0.7 }); this.openFlap(); });
    this.updateCoins();
    this.updateSoldOut();
    g.events.emit('zonePlay', { machine: this, price, series, zone: this.data.zone });
    return { series, price, coins: n };
  }
}

export class MachineSpots {
  constructor(game, zone, o) {
    this.game = game;
    this.zone = zone;
    this.key = o.key;
    this.slots = o.slots;
    this.first = o.first || 1;
    this.label = o.label || 'machine spot';
    this.types = o.types || MACHINE_ORDER;
    this.active = o.active || (() => true);
    const st = game.growth.s.machines;
    this.data = st[o.key] ||= [];
    this.list = [];
    this.built = false;
    this.markers = [];
    this.acc = new Map(); // record -> fractional plays waiting (the simulation)
    this.convT = 0;
  }

  // ------------------------------------------------------------------ 3D
  ensureBuilt() {
    if (this.built) return;
    this.built = true;
    for (const d of this.data) this.spawn(d);
    this.slots.forEach((_, i) => this.marker(i));
    this.refreshMarkers();
  }

  spawn(d) {
    const z = this.zone, s = this.slots[d.slot];
    if (!s) return null;
    const p = z.L(s[0], 0, s[1]);
    d.at = { x: p.x, z: p.z, rotY: s[2] };
    d.zone = this.key;
    d.no = this.first + d.slot;
    d.up ||= { speed: 0, cap: 0, coins: 0 };
    const m = new ZoneMachine(this.game, d);
    z.group.attach(m.root);
    // the coin on its rope lives in the scene: keep it with the zone (hidden with it)
    if (m.rope) { m.rope.scene = z.group; z.group.attach(m.rope.mesh); for (const c of m.rope.coins || []) z.group.attach(c); }
    const I = this.game.interaction, h = m.root.userData.handler;
    I.remove(m.root);
    z.target(m.root, h);
    z.convert(m.root);
    this.list.push(m);
    return m;
  }

  /** The taped square and the power point of a free spot (click: order a machine). */
  marker(i) {
    const z = this.zone, s = this.slots[i];
    const g = new THREE.Group();
    const tape = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.8 });
    const t = z.mat(tape);
    const W = 0.62, D = 0.56;
    for (const [w, d, x, zz] of [[W, 0.05, 0, -D / 2], [W, 0.05, 0, D / 2], [0.05, D, -W / 2, 0], [0.05, D, W / 2, 0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, d), t); m.position.set(x, 0.004, zz); g.add(m);
    }
    const plug = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.03), z.mat(new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.6 })));
    plug.position.set(0, 0.35, -D / 2 - 0.2); g.add(plug);
    g.position.copy(z.L(s[0], 0, s[1]));
    g.rotation.y = s[2]; // like the machine: its front is local +z, the power point behind it
    z.group.add(g);
    const hb = z.hit(W, 0.9, D, s[0], 0.45, s[1], {
      reach: 2.6,
      hint: () => (this.at(i) || !this.active() ? null : { key: 'LMB', text: `Empty ${this.label}`, sub: 'Order a machine for it (paid from the bank)' }),
      use: () => { if (this.active()) this.order(i); return false; },
    });
    this.markers[i] = { g, hb };
  }
  refreshMarkers() { this.markers.forEach((mk, i) => { if (mk) mk.g.visible = !this.at(i); }); }
  at(i) { return this.data.find((d) => d.slot === i) || null; }
  free() { return this.slots.map((_, i) => i).filter((i) => !this.at(i)); }

  async order(i) {
    const g = this.game;
    if (this.at(i) || this.ordering) return;
    this.ordering = true;
    try {
      const opts = this.types.map((type) => {
        const T = MACHINE_TYPES[type], ok = !g.progress || g.progress.unlocked(`machine:${type}`);
        return { label: `${T.name} ${T.jp}`, sub: ok ? `${T.baseCap} capsules · ${T.desc}` : `Shop level ${g.progress.levelFor(`machine:${type}`)}`, price: T.price, disabled: !ok, value: type };
      });
      const type = await slip(g, { title: 'Machine order', jp: '機械発注書', note: `For ${this.label} No.${this.first + i}. Delivered and plugged in today. Paid by bank transfer.`, options: opts });
      if (!type) return;
      const T = MACHINE_TYPES[type];
      if (!g.sim?.payDigital(T.price, `machine:${type}`)) { g.news?.('The bank declined the transfer', `${yen(T.price)} needed`); sfx('error', { vol: 0.4 }); return; }
      const series = g.state.licenses[g.state.licenses.length - 1] || 'mochi';
      const d = { id: 'z' + Date.now().toString(36) + i, type, slot: i, stock: [], series, price: Math.max(100, Math.round((SERIES_BY_ID[series]?.price || 100) / 100) * 100), cash: 0 };
      if (g.sim?.recommendedPrice) d.price = g.sim.recommendedPrice({ data: d });
      this.data.push(d);
      const m = this.spawn(d);
      this.refreshMarkers();
      if (m) {
        const r = m.model, y0 = r.position.y;
        r.position.y = 2.2;
        g.tweens.add({ dur: 0.6, ease: ease.outBounce, update: (k) => { r.position.y = 2.2 + (y0 - 2.2) * k; }, done: () => { sfx('thud', { pos: m.root.position, v: 1 }); g.player.shake = 0.2; } });
      }
      g.progress?.addXP(30, 'machine');
      g.events.emit('zoneMachineBought', { machine: m, zone: this.key }); // (not 'machineBought': that one means the garage)
      g.news?.(`${T.name} installed`, 'Fill it with a capsule carton: lift the lid, cut the tape, pour');
      g.save?.();
    } finally { this.ordering = false; }
  }

  // ------------------------------------------------------------------ per frame (only while you're in the zone)
  update(dt) {
    for (const m of this.list) m.update(dt, this.game.time);
    this.convT -= dt;
    if (this.convT <= 0) { this.convT = 1; for (const m of this.list) this.zone.convert(m.root); } // new cards / capsules after a restock
  }

  playable() { return this.list.filter((m) => m.canPlay()); }

  // ------------------------------------------------------------------ while you're away
  /** minutes of shop time; k = plays per machine per hour at full footfall. Returns { plays, yen }. */
  simulate(minutes, k) {
    const g = this.game, out = { plays: 0, yen: 0 };
    if (!(minutes > 0) || !this.data.length) return out;
    const foot = g.sim?.footfall?.() ?? 1;
    for (const d of this.data) {
      if (!d.stock?.length || d.broken) continue;
      const m = this.list.find((x) => x.data === d);
      if (m && (m.lidOpen || m.drawer.open)) continue;
      const chance = g.sim?.playChance ? g.sim.playChance({ data: d }) : 0.6;
      let a = (this.acc.get(d) || 0) + k * foot * chance * minutes / 60;
      while (a >= 1 && d.stock.length) {
        a -= 1;
        if (m) m.takeCapsule(); else d.stock.splice(Math.floor(Math.random() * d.stock.length), 1);
        d.cash = (d.cash || 0) + d.price;
        out.plays++; out.yen += d.price;
      }
      this.acc.set(d, Math.min(a, 3));
      if (m) { m.updateCoins(); m.updateSoldOut(); }
    }
    if (out.plays) g.state.stats.customers = (g.state.stats.customers || 0) + out.plays;
    return out;
  }

  /** Coins waiting in all the coin boxes, capsules left. */
  totals() { return { cash: this.data.reduce((a, d) => a + (d.cash || 0), 0), stock: this.data.reduce((a, d) => a + (d.stock?.length || 0), 0), n: this.data.length }; }
}

