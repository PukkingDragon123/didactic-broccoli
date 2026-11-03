// A part-time shift at Mikawa-ya's register while the old man naps on the tatami. Five customers come in, put their
// basket on the counter; for each thing in it you punch its price on the old register's keys (hundreds column, tens
// column; the front row is 1, the back row 5; the red key clears), then click the thing to ring it up into the paper
// bag. They pay with a note: click it into the till, count the change out of the drawer (¥1000 / 500 / 100 / 50 / 10),
// click the customer to hand it over. Quick and right = happy (a tip now and then); slow or wrong = grumbles and a
// smaller wage. Pays cash at the end (¥1,500 + ¥100 a happy customer + tips, minus anything you gave away).
//   cashier.available() -> true | reason     cashier.start()     cashier.active
import * as THREE from 'three';
import { audio } from '../../core/audio.js';
import { createHuman } from '../../people/index.js';
import { propMesh } from '../../world/props.js';
import { noteMesh } from '../../money/cashfx.js';
import { yenCoinGeometry } from '../../world/machineModels.js';
import { voxelMaterials } from '../../voxel/materials.js';
import { draw5 } from '../../gfx/font5x7.js';
import { pixCanvas, hitBox, walkStep, turnTo, paperFill } from '../util.js';
import { earnCash, yen } from '../money.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const REG = { x: -12.45, y: 0.96, z: 17.42 }; // the register (faces +z, toward you)
const SPOT = new THREE.Vector3(-12.32, 0, 17.9);
const BASKET = new THREE.Vector3(-12.17, 0.965, 17.19);
const BAG = new THREE.Vector3(-12.76, 0.965, 17.22);
const DOOR_OUT = V(-12.42, 0, 13.6), DOOR_IN = V(-12.42, 0, 15.5), FRONT = V(-12.2, 0, 16.72);
const GOODS = [
  ['food_onigiri_tuna', 130, 'Onigiri'], ['food_onigiri_ume', 120, 'Onigiri'], ['food_melonpan', 130, 'Melon bread'], ['food_anpan', 120, 'Anpan'],
  ['ramune_bottle', 80, 'Ramune'], ['puff_stick', 10, 'Puff stick'], ['room_cupnoodle', 180, 'Cup noodles'], ['milk_carton', 150, 'Milk'],
  ['battery_pack', 300, 'Batteries'], ['candy_piece', 10, 'Fruit candy'], ['food_purin', 150, 'Pudding'],
];
const SHIFT = 5, WAGE = 1500;

export class Cashier {
  constructor(game, mk) {
    this.game = game;
    this.mk = mk;
    this.active = false;
    this.gear = null;
  }

  available() {
    const g = this.game, c = g.clock, S = this.mk.s;
    if (this.active) return 'You\'re already on the register.';
    const h = c?.hours ?? 12;
    if (h < 9 || h >= 20) return 'Shifts are in the daytime, kid. Come back tomorrow.';
    if (S.lastShift === (c?.day ?? 1)) return 'One shift a day. Your back will thank me.';
    return true;
  }

  // ------------------------------------------------------------------ start / end
  start() {
    const g = this.game;
    if (this.active || g.cutscene.active) return;
    this.active = true;
    this.mk.s.lastShift = g.clock?.day ?? 1;
    this.stats = { served: 0, happy: 0, tips: 0, lost: 0, mistakes: 0 };
    this.queue = SHIFT;
    this.cust = null;
    this.nextT = 2.5;
    this.entry = 0;
    this.failsafe = 420;
    const self = this;
    g.cutscene.play(function* (c) {
      yield c.fade(1, 0.4);
      self.buildGear();
      self.napOldMan(true);
      g.places.lockAt(SPOT, { yaw: 0.02, pitch: -0.72 });
      for (const u of self.mk.units) if (u.entry.id === 'flyers') u.mesh.visible = false;
      yield c.wait(0.2);
      yield c.fade(0, 0.5);
    }, { letterbox: false, skippable: false }).then(() => {
      g.news('On the register at Mikawa-ya', 'Punch the price (hundreds / tens columns), click the item, take the money, count the change', 7000);
    });
  }

  finish() {
    const g = this.game, st = this.stats;
    const pay = Math.max(300, WAGE + st.happy * 100 - st.lost);
    const self = this;
    g.cutscene.play(function* (c) {
      yield c.fade(1, 0.4);
      self.napOldMan(false);
      self.clearCustomer();
      self.dropGear();
      g.places.unlock();
      const P = g.player;
      P.pos.set(-12.1, 0, 16.55); P.yaw = Math.PI; P.pitch = -0.05;
      yield c.wait(0.2);
      yield c.fade(0, 0.5);
    }, { letterbox: false, skippable: false }).then(() => {
      this.active = false;
      for (const u of this.mk.units) if (u.entry.id === 'flyers') u.mesh.visible = !u.gone;
      const line = st.happy >= 4 ? 'Hm! Not bad at all, kid. You\'ve got the hands for it.' : st.happy >= 2 ? 'Hm. The register\'s still in one piece. Good enough.' : 'Hohoho... we\'ll call that "practice".';
      this.mk.line(line, 4);
      g.tweens.wait(1.2, () => earnCash(g, pay + st.tips, { from: this.mk.oldman.h.root.position.clone().setY(1.2), label: `Mikawa-ya shift: ${st.served} customers, ${st.happy} happy${st.tips ? `, ${yen(st.tips)} in tips` : ''}` }));
      g.needs?.work(10, 'shift');
      g.progress?.addXP?.(25 + st.happy * 5, 'job');
      this.mk.s.shifts = (this.mk.s.shifts || 0) + 1;
      g.events.emit('jobDone', { id: 'cashier', pay: pay + st.tips, where: 'mikawaya' });
      g.save();
    });
  }

  napOldMan(on) {
    const om = this.mk.oldman, h = om.h;
    if (on) {
      h.setExpression('sleepy', 1e6);
      for (let i = 0; i < 6; i++) h.update(0.1, { speed: 0 });
      h.root.position.set(-12.05, 0.55, 18.55);
      h.root.rotation.set(-Math.PI / 2, 0, Math.PI / 2, 'XYZ');
      h.root.updateMatrixWorld(true);
      this.napState = true;
      this.mk.napState = true;
      this.zzT = 1;
    } else {
      h.root.position.copy(this.mk.home.pos);
      h.root.rotation.set(0, this.mk.home.rotY, 0);
      h.setExpression('neutral');
      this.napState = false;
      this.mk.napState = false;
    }
  }

  // ------------------------------------------------------------------ the gear: keys, display, drawer, basket, bag
  buildGear() {
    const g = this.game, town = g.garage.town, mats = town.indoorVoxel();
    const G = this.gear = { group: new THREE.Group(), hits: [] };
    g.scene.add(G.group);
    const add = (obj, handler) => { G.group.add(obj); g.interaction.add(obj, handler); G.hits.push(obj); return obj; };
    // the display over the register's number window
    G.disp = pixCanvas(96, 28);
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.05), new THREE.MeshBasicMaterial({ map: G.disp.tex, color: 0xd8d8d8 }));
    dm.position.set(REG.x - 0.005, REG.y + 0.247, REG.z - 0.028);
    G.group.add(dm);
    this.drawDisplay();
    // number keys: hundreds and tens columns, rows 1..5 (front to back)
    const rows = [[13, 0.12], [10, 0.09], [7, 0.06], [4, 0.03], [1, 0]];
    const capY = (zc) => { const top = (z) => 9 + Math.round((14 - z) * 0.7); return (top(zc - 1) + 2.5) * 0.01; };
    for (const [col, place, cx] of [['hundreds', 100, -4], ['tens', 10, 0]]) {
      rows.forEach(([zc, z], r) => {
        const v = place * (r + 1);
        const hb = hitBox(0.034, 0.03, 0.028, REG.x + (cx + 0.5) * 0.01, REG.y + capY(zc), REG.z + z);
        add(hb, {
          reach: 1.6,
          hint: () => (this.active ? { key: 'LMB', text: `Punch +${yen(v)}`, sub: `${col} column, key ${r + 1}  ·  punched: ${yen(this.entry)}` } : null),
          use: () => { this.punch(v, hb); return false; },
        });
      });
    }
    const red = hitBox(0.05, 0.03, 0.03, REG.x + 0.105, REG.y + capY(13), REG.z + 0.12);
    add(red, { reach: 1.6, hint: () => (this.active ? { key: 'LMB', text: 'Clear (C)', sub: this.cust?.state === 'change' ? 'Put the change back and count again' : 'Start the price again' } : null), use: () => { this.clearKey(red); return false; } });
    // the basket the customer sets down, the paper bag the things go into
    const bm = this.basketMesh();
    bm.position.copy(BASKET); bm.visible = false;
    G.group.add(bm); G.basket = bm;
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.09).translate(0, 0.1, 0), town.indoor(new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.95 })));
    bag.position.copy(BAG); bag.visible = false;
    G.group.add(bag); G.bag = bag;
    // the cash drawer (slides out when they pay): notes and coins in their compartments
    const dr = new THREE.Group();
    dr.position.set(REG.x, REG.y + 0.02, REG.z + 0.16);
    const wood = town.indoor(new THREE.MeshStandardMaterial({ color: 0x4e2e1c, roughness: 0.7 }));
    dr.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.14), wood));
    G.drawer = dr; dr.visible = false;
    G.group.add(dr);
    const coinMat = voxelMaterials('normal');
    const comp = [[1000, -0.105], [500, -0.05], [100, 0.0], [50, 0.045], [10, 0.09]];
    for (const [v, x] of comp) {
      if (v >= 1000) { const n = noteMesh(1000); n.position.set(x, 0.022, 0); n.rotation.set(-Math.PI / 2, 0, Math.PI / 2); n.scale.setScalar(0.55); dr.add(n); }
      else for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(yenCoinGeometry(), coinMat); c.position.set(x + (i % 2) * 0.01, 0.02 + i * 0.004, (i - 1.5) * 0.02); c.scale.setScalar(v >= 500 ? 1.15 : v === 50 || v === 100 ? 1 : 0.95); dr.add(c); }
      const hb = hitBox(0.045, 0.04, 0.13, x, 0.02, 0);
      dr.add(hb);
      g.interaction.add(hb, { reach: 1.6, hint: () => (this.active && this.cust?.state === 'change' ? { key: 'LMB', text: `Take out ${yen(v)}`, sub: `Change due ${yen(this.cust.change)}  ·  counted ${yen(this.cust.give)}` } : null), use: () => { this.takeChange(v); return false; } });
      G.hits.push(hb);
    }
  }

  basketMesh() {
    const town = this.game.garage.town;
    const m = town.indoor(new THREE.MeshStandardMaterial({ color: 0xc8302a, roughness: 0.6 }));
    const g = new THREE.Group();
    const b = (w, h, d, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); g.add(o); };
    b(0.36, 0.01, 0.24, 0, 0, 0);
    b(0.36, 0.11, 0.012, 0, 0, -0.12); b(0.36, 0.11, 0.012, 0, 0, 0.12);
    b(0.012, 0.11, 0.24, -0.18, 0, 0); b(0.012, 0.11, 0.24, 0.18, 0, 0);
    b(0.012, 0.03, 0.2, -0.05, 0.11, 0); b(0.012, 0.03, 0.2, 0.05, 0.11, 0);
    return g;
  }

  dropGear() {
    const g = this.game, G = this.gear;
    if (!G) return;
    for (const h of G.hits) g.interaction.remove(h);
    G.group.parent?.remove(G.group);
    this.gear = null;
  }

  drawDisplay() {
    const G = this.gear;
    if (!G) return;
    const c = this.cust;
    G.disp.redraw((ctx, w, h) => {
      ctx.fillStyle = '#0e1410'; ctx.fillRect(0, 0, w, h);
      const green = '#7aff8a', dim = '#2a5a32', amber = '#ffd23f';
      if (!c || c.state === 'walk') { draw5(ctx, 'MIKAWA-YA', w / 2, 10, { s: 1, col: dim, align: 'center' }); return; }
      if (c.state === 'change' || c.state === 'paid') {
        draw5(ctx, `CHANGE ${c.change}`, 3, 3, { s: 1, col: amber });
        draw5(ctx, `${c.give}`, w - 3, 13, { s: 2, col: c.give === c.change ? green : '#ff8a6a', align: 'right' });
        return;
      }
      draw5(ctx, `TOTAL ${c.total}`, 3, 3, { s: 1, col: dim });
      draw5(ctx, `${this.entry}`, w - 3, 13, { s: 2, col: green, align: 'right' });
      draw5(ctx, '¥', 3, 13, { s: 2, col: green });
    });
  }

  // ------------------------------------------------------------------ the keys
  press(obj) { const y = obj.position.y; this.game.tweens.add({ dur: 0.12, update: (k) => { obj.position.y = y - Math.sin(k * Math.PI) * 0.006; }, done: () => { obj.position.y = y; } }); }
  punch(v, obj) {
    if (!this.active) return;
    const c = this.cust;
    audio.play('regKey', { vol: 0.6 });
    this.press(obj);
    if (!c || c.state !== 'ring') return;
    this.entry += v;
    this.drawDisplay();
  }
  clearKey(obj) {
    if (!this.active) return;
    audio.play('regKey', { vol: 0.6 });
    this.press(obj);
    const c = this.cust;
    if (c?.state === 'change') c.give = 0;
    this.entry = 0;
    this.drawDisplay();
  }

  /** Clicking a thing in the basket: rings it up if the punched price is right. */
  ring(item) {
    const g = this.game, c = this.cust;
    if (!this.active || !c || c.state !== 'ring' || item.done) return;
    if (this.entry !== item.price) {
      audio.play('vendNo', { vol: 0.6 });
      this.stats.mistakes++;
      c.patience -= 4; c.wrong = (c.wrong || 0) + 1;
      g.pedestrians?.say?.(c.h, this.entry === 0 ? pick(['You have to ring it up first.', 'Um, the register?']) : pick([`That's ${yen(item.price)}, not ${yen(this.entry)}!`, 'That\'s not the price...', 'Are you new here?']));
      c.h.setExpression('angry', 1.5);
      this.entry = 0; this.drawDisplay();
      return;
    }
    item.done = true;
    c.total += item.price;
    this.entry = 0;
    audio.play('register', { vol: 0.35 });
    const m = item.mesh, from = m.position.clone(), to = BAG.clone().add(V(0, 0.16, 0));
    g.tweens.add({ dur: 0.35, update: (k) => { m.position.lerpVectors(from, to, k); m.position.y += Math.sin(k * Math.PI) * 0.08; }, done: () => { m.visible = false; this.gear.bag.visible = true; audio.play('bagRustle', { vol: 0.5 }); } });
    g.interaction.remove(m);
    this.drawDisplay();
    if (c.items.every((i) => i.done)) this.askPay();
  }

  askPay() {
    const c = this.cust;
    const t = c.total;
    c.paid = t > 1000 ? 5000 : Math.random() < 0.18 ? Math.ceil(t / 100) * 100 + (Math.random() < 0.5 ? 0 : 0) : 1000;
    if (c.paid < t) c.paid = 5000;
    c.change = c.paid - t;
    c.give = 0;
    c.state = 'pay';
    this.gear.basket.visible = false;
    this.game.pedestrians?.say?.(c.h, pick([`${yen(c.paid)}, please.`, 'Here you go.', `Sorry, only a ${yen(c.paid)} note.`]));
    // the note on the counter
    const n = noteMesh(c.paid >= 5000 ? 5000 : 1000);
    n.position.copy(BASKET).add(V(0, 0.005, -0.02)); n.rotation.set(-Math.PI / 2, 0, 0.3);
    if (c.paid < 1000) { n.scale.setScalar(0.001); }
    this.gear.group.add(n);
    const hb = hitBox(0.18, 0.05, 0.12, BASKET.x, BASKET.y + 0.02, BASKET.z - 0.02);
    this.gear.group.add(hb);
    this.game.interaction.add(hb, { reach: 1.8, hint: () => (this.active && c.state === 'pay' ? { key: 'LMB', text: `Take the ${yen(c.paid)}`, sub: `Total ${yen(c.total)}` } : null), use: () => { this.takeMoney(n, hb); return false; } });
    this.gear.hits.push(hb);
    c.note = n;
  }

  takeMoney(n, hb) {
    const g = this.game, c = this.cust;
    if (!c || c.state !== 'pay') return;
    n.parent?.remove(n);
    g.interaction.remove(hb);
    audio.play('registerDrawer', { vol: 0.6 });
    this.gear.drawer.visible = true;
    const dr = this.gear.drawer, z0 = REG.z + 0.12;
    g.tweens.add({ dur: 0.25, update: (k) => { dr.position.z = z0 + k * 0.12; } });
    if (c.change === 0) { c.state = 'paid'; this.done(true); return; }
    c.state = 'change';
    this.drawDisplay();
  }

  takeChange(v) {
    const c = this.cust;
    if (!this.active || !c || c.state !== 'change') return;
    c.give += v;
    audio.play(v >= 1000 ? 'notePaper' : 'coinClink', { vol: 0.5 });
    this.drawDisplay();
  }

  handOver() {
    const g = this.game, c = this.cust;
    if (!c || c.state !== 'change') return;
    if (c.give === 0) { g.pedestrians?.say?.(c.h, 'My change?'); return; }
    if (c.give < c.change) {
      audio.play('vendNo', { vol: 0.5 });
      g.pedestrians?.say?.(c.h, pick([`That's short! It should be ${yen(c.change)}.`, 'Hey, count it again.']));
      c.h.setExpression('angry', 1.5);
      c.patience -= 5; this.stats.mistakes++;
      return;
    }
    if (c.give > c.change) { this.stats.lost += c.give - c.change; g.pedestrians?.say?.(c.h, pick(['Oh! ...Thanks!', 'Heh. Lucky day.'])); }
    this.done(c.give === c.change);
  }

  /** The till prints a slip: a strip of receipt paper curling out of the top of the register. */
  receipt(c) {
    const G = this.gear;
    if (!G) return;
    if (!G.rc) {
      G.rc = pixCanvas(40, 64);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.096).translate(0, 0.048, 0), new THREE.MeshStandardMaterial({ map: G.rc.tex, roughness: 0.9, side: THREE.DoubleSide }));
      m.position.set(REG.x + 0.05, REG.y + 0.29, REG.z - 0.05); m.rotation.x = 0.35;
      G.group.add(m); G.rcMesh = m;
    }
    G.rcMesh.visible = true;
    audio.play('receiptPrint', { vol: 0.5 });
    G.rc.redraw((ctx, w, h) => {
      paperFill(ctx, 0, 0, w, h, { base: '#f6f1e4', seed: (c.total + c.paid) % 97 });
      ctx.fillStyle = '#d8cfba'; for (let x = 0; x < w; x += 4) ctx.fillRect(x, h - 2, 2, 2); // the torn edge
      draw5(ctx, 'MIKAWA', w / 2, 2, { s: 1, col: '#241a1e', align: 'center' });
      let y = 12;
      for (const it of c.items.slice(0, 4)) { draw5(ctx, `${it.price}`, w - 2, y, { s: 1, col: '#5e5046', align: 'right' }); ctx.fillStyle = '#5e5046'; ctx.fillRect(2, y + 3, 10, 1); y += 9; }
      ctx.fillStyle = '#241a1e'; ctx.fillRect(2, y, w - 4, 1); y += 3;
      draw5(ctx, `${c.total}`, w - 2, y, { s: 1, col: '#c8322c', align: 'right' });
      draw5(ctx, `${c.paid - c.total}`, w - 2, y + 9, { s: 1, col: '#241a1e', align: 'right' });
    });
  }

  done(exact) {
    const g = this.game, c = this.cust, st = this.stats;
    audio.play('register', { vol: 0.45 });
    this.receipt(c);
    const dr = this.gear.drawer, z0 = dr.position.z;
    g.tweens.add({ dur: 0.25, update: (k) => { dr.position.z = z0 - k * 0.12; }, done: () => { dr.visible = false; } });
    const fast = c.patience > c.patience0 * 0.45;
    const happy = exact && fast && !c.wrong;
    st.served++;
    if (happy) { st.happy++; if (Math.random() < 0.35) { const tip = pick([50, 100, 100]); st.tips += tip; g.pedestrians?.say?.(c.h, 'Keep the change. ...Wait. That\'s your job. Here, a tip.'); } else g.pedestrians?.say?.(c.h, pick(['Thanks!', 'Thank you!', 'See you!', 'Quick hands!'])); c.h.gesture?.('bow'); }
    else if (!happy && exact) g.pedestrians?.say?.(c.h, pick(['Finally. Thanks.', 'Thanks... I guess.']));
    c.state = 'leave';
    c.path = [FRONT.clone().add(V(-0.1, 0, -0.3)), DOOR_IN.clone(), DOOR_OUT.clone()];
    g.tweens.wait(0.8, () => { if (this.gear) this.gear.bag.visible = false; });
    this.entry = 0;
    this.drawDisplay();
  }

  // ------------------------------------------------------------------ customers
  spawnCustomer() {
    const g = this.game;
    const h = createHuman({ seed: (Math.random() * 1e9) | 0 });
    h.root.position.copy(DOOR_OUT);
    g.scene.add(h.root);
    const n = 1 + Math.floor(Math.random() * 3) + (Math.random() < 0.2 ? 1 : 0);
    const items = [];
    for (let i = 0; i < n; i++) { const [p, price, name] = pick(GOODS); items.push({ prop: p, price, name, done: false }); }
    const c = { h, items, total: 0, state: 'walk', path: [DOOR_IN.clone(), FRONT.clone()], patience: 26 + n * 7, give: 0, change: 0 };
    c.patience0 = c.patience;
    const hb = hitBox(0.6, 1.7, 0.5, 0, 0.85, 0);
    h.root.add(hb);
    g.interaction.add(hb, { reach: 2.4, hint: () => (this.active && c.state === 'change' ? { key: 'LMB', text: `Hand over ${yen(c.give)}`, sub: `Change due ${yen(c.change)}` } : this.active && c.state === 'ring' ? { key: '', text: 'A customer', sub: `${c.items.filter((i) => !i.done).length} thing(s) left to ring up` } : null), use: () => { this.handOver(); return false; } });
    c.hit = hb;
    this.cust = c;
    audio.play('chimeEntrance', { vol: 0.5 });
  }

  placeItems() {
    const g = this.game, c = this.cust, town = g.garage.town;
    this.gear.basket.visible = true;
    audio.play('place', { vol: 0.5 });
    c.items.forEach((it, i) => {
      const m = propMesh(it.prop, { castShadow: false });
      if (Array.isArray(m.material)) m.material = town.indoorVoxel();
      m.position.copy(BASKET).add(V(-0.11 + (i % 3) * 0.11, 0.012, (i < 3 ? -0.04 : 0.06)));
      m.rotation.y = rnd(-0.4, 0.4) + Math.PI;
      if (it.prop === 'room_cupnoodle') m.scale.setScalar(0.8);
      this.gear.group.add(m);
      it.mesh = m;
      g.interaction.add(m, {
        reach: 1.8,
        hint: () => (this.active && c.state === 'ring' && !it.done ? { key: 'LMB', text: `Ring up: ${it.name}  ${yen(it.price)}`, sub: this.entry === it.price ? 'Punched right: click it into the bag' : `Punched ${yen(this.entry)}: punch ${yen(it.price)} on the keys first` } : null),
        use: () => { this.ring(it); return false; },
      });
      this.gear.hits.push(m);
    });
    c.state = 'ring';
    this.drawDisplay();
    g.pedestrians?.say?.(c.h, pick(['Just these, please.', 'Hello! These.', 'Good afternoon.', '...']));
  }

  clearCustomer() {
    const c = this.cust;
    if (!c) return;
    this.game.interaction.remove(c.hit);
    c.h.root.parent?.remove(c.h.root);
    c.h.dispose?.();
    this.cust = null;
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game;
    // the old man snores on the tatami
    if (this.napState) {
      this.zzT -= dt;
      if (this.zzT <= 0) { this.zzT = rnd(1.8, 2.8); const h = this.mk.oldman.h; const p = h.headTop(new THREE.Vector3()); g.effects.mark({ sprite: 'zz', pos: p, color: 0xdce8ff, size: 0.05, life: 2.2, rise: 0.16, dx: 0.06 }); audio.play('snore', { pos: p, vol: 0.35 }); }
    }
    if (!this.gear || g.cutscene.active) return;
    this.failsafe -= dt;
    const c = this.cust;
    if (!c) {
      if (this.queue <= 0 || this.failsafe <= 0) { this.finish(); this.queue = -1; this.gear.done = true; return; }
      this.nextT -= dt;
      if (this.nextT <= 0) { this.queue--; this.spawnCustomer(); }
      return;
    }
    if (c.state === 'walk') { if (walkStep(c.h, c.path, dt, 1.15)) { c.state = 'arrived'; c.t = 0; } return; }
    if (c.state === 'arrived') { c.t += dt; turnTo(c.h, 0, dt); c.h.update(dt, { speed: 0, lookAt: g.camera.position }); if (c.t > 0.6) this.placeItems(); return; }
    if (c.state === 'leave') { if (walkStep(c.h, c.path, dt, 1.2)) { this.clearCustomer(); this.nextT = rnd(1.5, 3.5); this.drawDisplay(); } return; }
    // waiting at the counter: patience runs down, they say so
    c.h.update(dt, { speed: 0, lookAt: g.camera.position, talking: !!g.bubbles?.isTalking(c.h) });
    turnTo(c.h, 0, dt);
    const was = c.patience;
    c.patience -= dt;
    const p0 = c.patience0;
    if (was > p0 * 0.5 && c.patience <= p0 * 0.5) { g.pedestrians?.say?.(c.h, pick(['Um...', 'Excuse me?', 'Take your time... I guess.'])); c.h.gesture?.('_watch'); }
    if (was > p0 * 0.2 && c.patience <= p0 * 0.2) { g.pedestrians?.say?.(c.h, pick(['I\'m in a bit of a hurry!', 'Is the old man here?', 'Hello?!'])); c.h.setExpression('angry', 3); }
  }
}
