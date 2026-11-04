// The trash loop. The shop has its own trash can by the shutter: customers bin their empty capsules in it (the
// shells' customerBin hook), so do you; it fills up visibly, and once it's full people drop their shells on the floor
// instead (a dirtier shop: life.dirt()). Tie the bag off, carry it across to the neighbourhood garbage station, and on
// collection days (burnable: Monday and Thursday, bags out by 8:30) the garbage truck comes down the lane playing its
// little tune, the crew hop off, sling every bag into the hopper, the packer blade crunches, and off it goes.
//   trash.level / trash.cap   trash.dirt() -> 0..1   trash.callTruck() (debug)   trash.isCollectionDay(day)
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { propMesh, propGeometry } from '../world/props.js';
import { voxelMaterials } from '../voxel/materials.js';
import { garbageTruckParts, TRUCK } from '../vehicles/garbageTruck.js';
import { createHuman } from '../people/index.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const CAN = { x: -0.95, z: 4.6, top: 0.56, cap: 24 };
export const STATION = { x: -6.6, z: 5.82 };
const COLLECT_DAYS = [1, 4]; // Monday, Thursday (burnable)
const COLLECT_MIN = 8 * 60 + 30;
const TRUCK_Z = 8.4, TRUCK_STOP = -3.9;
// where bags sit on the station's pad (local to its centre)
const SLOTS = [[-0.5, -0.25], [-0.1, -0.28], [0.3, -0.22], [-0.52, 0.15], [-0.12, 0.12], [0.28, 0.16], [0.6, -0.05], [-0.3, -0.05, 0.3], [0.1, 0.0, 0.3], [0.45, -0.1, 0.32], [-0.6, 0.35], [0.0, 0.36], [0.5, 0.36], [-0.25, 0.25, 0.3]];
const ACCEPT = { trash_bag: 1, cardboard: 1, junk_box: 1, poop_bag_full: 1 };

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3(), _e = new THREE.Euler();

export class Trash {
  constructor(game, life) {
    this.game = game;
    this.life = life;
    this.s = life.s;
    this.truck = null;
    this.t = 0;
    this.buildCan();
    this.buildStation();
    this.hookShells();
    game.calendar?.addSource((day) => (this.isCollectionDay(day) ? [{ id: 'garbage', name: 'Burnable garbage day', kind: 'event', quiet: true, note: 'Bags out at the station by 8:30' }] : []));
  }

  get level() { return this.s.trash.level; }
  get cap() { return CAN.cap; }
  /** Day 1 (1 April 1999) was a Thursday; weekdays straight from the day number (the calendar's dateOf asks us back). */
  isCollectionDay(day) { return COLLECT_DAYS.includes((day + 3) % 7); }

  /** Shop quality: an overflowing can (spilled shells are counted as floor litter by life.dirt). */
  dirt() {
    const f = this.level / CAN.cap;
    return Math.max(0, Math.min(0.35, (f - 0.75) * 1.4));
  }

  // ------------------------------------------------------------------ the shop's trash can
  buildCan() {
    const g = this.game;
    const can = propMesh('shop_trash_can', { fallbackSize: [0.36, 0.56, 0.36], fallbackColor: 0x2f6fb8 });
    can.position.set(CAN.x, 0, CAN.z);
    can.rotation.y = 0.15;
    g.scene.add(can);
    this.can = can;
    g.player.addObstacle(CAN.x - 0.2, CAN.x + 0.2, CAN.z - 0.2, CAN.z + 0.2);
    g.physics.addBox({ center: V(CAN.x, 0.28, CAN.z), half: V(0.18, 0.28, 0.18), material: 'wood' });
    const fill = propMesh('can_fill', { fallbackSize: [0.3, 0.06, 0.3] });
    fill.position.set(CAN.x, 0.02, CAN.z);
    fill.rotation.y = 0.4;
    fill.castShadow = false;
    g.scene.add(fill);
    this.fill = fill;
    this.setFill();
    g.interaction.add(can, {
      hint: (held) => this.canHint(held),
      use: (held) => this.canUse(held),
      hold: {
        canStart: () => !this.game.held.item && this.level > 0,
        start: () => { this.tie = 0; },
        update: (dt) => this.tieBag(dt),
        done: () => this.tie >= 1,
        end: () => { if (this.tie < 1) this.tie = 0; },
      },
    });
  }

  setFill() {
    const f = Math.min(1, this.level / CAN.cap);
    this.fill.visible = f > 0.01;
    this.fill.scale.y = Math.max(0.05, f * 8);
  }

  canHint(held) {
    const g = this.game, H = g.held, n = this.level;
    const lvl = `${n}/${CAN.cap}${n >= CAN.cap ? ' - FULL' : ''}`;
    if (held?.kind === 'shell') return { key: 'LMB', text: 'Bin the empty capsule', sub: lvl };
    if (H.holding('poop_bag_full')) return { key: 'LMB', text: 'Bin the poop bag', sub: lvl };
    if (H.item) return { key: '', text: 'Shop trash can', sub: lvl };
    if (n <= 0) return { key: '', text: 'Shop trash can', sub: 'Empty. Customers bin their capsules here' };
    return { key: 'Hold LMB', text: 'Tie up the bag and take it out', sub: this.tie > 0 ? `${Math.round(this.tie * 100)}%` : lvl };
  }

  canUse(held) {
    const g = this.game, H = g.held;
    const top = V(CAN.x, CAN.top + 0.05, CAN.z);
    if (held?.kind === 'shell' || H.holding('poop_bag_full')) {
      const isShell = held?.kind === 'shell';
      H.putTo(top, new THREE.Quaternion(), (obj) => {
        obj.parent?.remove(obj);
        this.add(isShell ? 1 : 2);
        audio.play(isShell ? 'capsuleHit' : 'plop', { pos: top, speed: 1.2, mat: 'capsule', vol: 0.7 });
        if (!isShell) g.events.emit('trashOut', { item: { id: 'poop_bag_full' }, can: true });
        g.save();
      }, { dur: 0.35, arc: 0.15, scale: 0.8 });
      return false;
    }
    if (!H.item && this.level > 0) return undefined; // hold to tie up
    return false;
  }

  add(n = 1, customer = false) {
    const s = this.s.trash;
    if (s.level >= CAN.cap && customer) {
      // no room: it ends up on the floor next to the can
      s.spilled++;
      const a = Math.random() * Math.PI * 2;
      this.game.items.spawnShell?.(V(CAN.x + Math.cos(a) * 0.3, 0.45, CAN.z + Math.sin(a) * 0.3 - 0.1), {}, V(Math.cos(a) * 0.6, 0.4, Math.sin(a) * 0.6));
      if (!this.s.trash.warned) { this.s.trash.warned = true; this.game.news('The trash can is overflowing!', 'Tie the bag and take it to the garbage station', 6500); }
      return;
    }
    s.level = Math.min(CAN.cap, s.level + n);
    if (s.level < CAN.cap * 0.75) s.warned = false;
    this.setFill();
    this.can.rotation.z = 0.04; this.wobble = 0.3;
  }

  tieBag(dt) {
    const g = this.game;
    this.tie += dt / 1.1;
    this.tieNext = (this.tieNext || 0) - dt;
    if (this.tieNext <= 0) { this.tieNext = 0.35; audio.play('bagRustle', { pos: this.can.position, vol: 0.8 }); g.held.swing = 0.5; }
    if (this.tie < 1) return;
    const n = this.level;
    this.s.trash.level = 0;
    this.setFill();
    const data = { bag: 'can', fill: n };
    if (!g.held.giveTool('trash_bag', data)) g.items.spawnTool({ id: 'trash_bag', ...data }, V(CAN.x + 0.35, 0, CAN.z - 0.2), 0.5);
    g.tip('canBag', 'Bag tied off', 'Take it to the garbage station, left of the shop. Collection: Monday and Thursday mornings');
    g.save();
  }

  /** Customers bin their shells in our can (shells.js calls customerBin when they do). */
  hookShells() {
    const sh = this.game.shells;
    if (!sh || sh._lifeHooked) return;
    sh._lifeHooked = true;
    sh.customerBin = () => {
      sh.state.returned = (sh.state.returned || 0) + 1;
      this.add(1, true);
      audio.play('capsuleHit', { pos: V(CAN.x, CAN.top, CAN.z), speed: 1, mat: 'capsule', vol: 0.6 });
      this.game.events.emit('shellReturned', { count: sh.state.returned, customer: true });
    };
    sh.binPos = () => V(CAN.x, CAN.top, CAN.z);
  }

  // ------------------------------------------------------------------ the garbage station across the lane
  buildStation() {
    const g = this.game, town = g.garage.town;
    // the town's station has a pile of bags baked into it: swap it for the bare pad + rules board, bags drawn by us
    const st = town?.garbageStation;
    if (st) st.visible = false;
    const pad = propMesh('garbage_station_empty', { fallbackSize: [1.5, 0.05, 1.0], fallbackColor: 0xb4b0a8 });
    pad.position.set(STATION.x, 0, STATION.z);
    g.scene.add(pad);
    this.pad = pad;
    // up to 14 bags as two instanced meshes (two bag shapes)
    const mats = voxelMaterials('normal');
    this.bagMeshes = ['trash_bag', 'trash_bag_b'].map((id) => {
      const geo = propGeometry(id);
      const im = new THREE.InstancedMesh(geo, mats, SLOTS.length);
      im.count = 0;
      im.castShadow = true; im.receiveShadow = true;
      im.frustumCulled = false;
      g.scene.add(im);
      return im;
    });
    this.layBags();
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.1), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(STATION.x, 0.6, STATION.z);
    g.scene.add(hit);
    this.stationHit = hit;
    g.interaction.add(hit, {
      reach: 2.6,
      hint: () => {
        const it = g.held.item, id = it?.kind === 'tool' ? it.data.id : null;
        if (ACCEPT[id]) return { key: 'LMB', text: id === 'trash_bag' ? 'Throw out the trash bag' : id === 'poop_bag_full' ? 'Throw out the poop bag' : `Put out the ${id === 'junk_box' ? 'box of junk' : 'cardboard'}`, sub: this.nextPickupText() };
        return { key: '', text: 'Garbage station', sub: `${this.s.station.n} bag${this.s.station.n === 1 ? '' : 's'} out · ${this.nextPickupText()}` };
      },
      use: () => { this.throwOut(); return false; },
    });
  }

  nextPickupText() {
    const g = this.game, day = g.clock?.day ?? 1;
    for (let d = day; d < day + 8; d++) {
      if (!this.isCollectionDay(d)) continue;
      if (d === day && (this.s.lastPickup === day || (g.clock?.minuteOfDay ?? 0) > COLLECT_MIN + 60)) continue;
      return d === day ? 'Truck this morning' : d === day + 1 ? 'Truck tomorrow morning' : `Truck ${g.calendar.dateOf(d).weekdayName} morning`;
    }
    return '';
  }

  layBags() {
    const n = Math.min(SLOTS.length, this.s.station.n);
    const [a, b] = this.bagMeshes;
    let ia = 0, ib = 0;
    for (let i = 0; i < n; i++) {
      const [x, z, y = 0] = SLOTS[i];
      const im = i % 3 === 2 ? b : a;
      _e.set(0, i * 1.7, (i % 2 ? 0.08 : -0.06));
      _q.setFromEuler(_e);
      _m.compose(_p.set(STATION.x + x, 0.03 + y, STATION.z + z), _q, _s.setScalar(i % 3 === 2 ? 1 : 0.92));
      im.setMatrixAt(im === a ? ia++ : ib++, _m);
    }
    a.count = ia; b.count = ib;
    a.instanceMatrix.needsUpdate = true; b.instanceMatrix.needsUpdate = true;
  }

  throwOut() {
    const g = this.game, it = g.held.item;
    const id = it?.kind === 'tool' ? it.data.id : null;
    if (!ACCEPT[id]) return;
    const i = Math.min(SLOTS.length - 1, this.s.station.n);
    const target = V(STATION.x + SLOTS[i][0], 0.2, STATION.z + SLOTS[i][1]);
    const data = it.data;
    g.held.putTo(target, new THREE.Quaternion(), (obj) => {
      obj.parent?.remove(obj);
      audio.play('thud', { pos: target, v: 0.4 });
      audio.play('bagRustle', { pos: target, vol: 0.6 });
      this.s.station.n++;
      this.layBags();
      g.events.emit('trashOut', { item: data });
      g.save();
    }, { dur: 0.45, arc: 0.3, scale: 0.8 });
  }

  // ------------------------------------------------------------------ the garbage truck
  update(dt) {
    const g = this.game;
    this.t += dt;
    if (this.wobble > 0) { this.wobble = Math.max(0, this.wobble - dt * 2); this.can.rotation.z = Math.sin(this.t * 30) * 0.03 * this.wobble; }
    const c = g.clock;
    if (c && !this.truck && g.story?.done && this.isCollectionDay(c.day) && this.s.lastPickup !== c.day && c.minuteOfDay >= COLLECT_MIN && !g.courier?.busy) {
      this.s.lastPickup = c.day;
      if (c.minuteOfDay < 12 * 60 && !g.cutscene.active) this.callTruck();
      else this.collect(); // it came while you weren't looking
    }
    if (this.truck) this.updateTruck(dt);
  }

  /** Everything at the station goes. */
  collect() {
    const n = this.s.station.n;
    this.s.station.n = 0;
    this.layBags();
    this.game.events.emit('garbageCollected', { bags: n });
  }

  callTruck() {
    const g = this.game;
    if (this.truck) return;
    if (!this.truckModel) this.truckModel = buildTruck();
    const T = this.truckModel;
    T.root.position.set(-36, 0, TRUCK_Z);
    T.root.rotation.y = Math.PI / 2;
    T.root.visible = true;
    if (!T.root.parent) g.scene.add(T.root);
    this.truck = { phase: 'in', t: 0, x: -36, v: 7, crew: [], flying: [], bagsLeft: this.s.station.n };
    if (audio.ready) {
      this.truck.tune = audio.loop('truckTune', { pos: V(-6, 2, TRUCK_Z), ref: 6 });
      this.truck.tune?.set(0.8, 1.5);
      this.truck.engine = audio.loop('diesel', { pos: V(-6, 1, TRUCK_Z), ref: 4 });
      this.truck.engine?.set(0.5, 0.8);
    }
    g.news('The garbage truck is coming', 'Collection day: burnable trash', 5000);
  }

  updateTruck(dt) {
    const g = this.game, tr = this.truck, T = this.truckModel;
    tr.t += dt;
    const move = (x) => { const d = x - tr.x; tr.x = x; T.root.position.x = x; T.roll(d); };
    if (tr.phase === 'in') {
      // roll in, braking for the station
      const dist = TRUCK_STOP - tr.x;
      tr.v = Math.max(0.6, Math.min(7, dist * 0.9));
      move(Math.min(TRUCK_STOP, tr.x + tr.v * dt));
      if (dist < 0.02) { tr.phase = 'stop'; tr.t = 0; audio.play('airBrake', { pos: V(tr.x, 1, TRUCK_Z), vol: 0.9 }); T.body.rotation.x = 0.03; }
    } else if (tr.phase === 'stop') {
      T.body.rotation.x *= Math.max(0, 1 - dt * 4);
      if (tr.t > 0.8) {
        // the crew hop off the back step
        for (let i = 0; i < 2; i++) {
          const h = createHuman({ preset: 'construction', seed: 301 + i });
          h.finishPaint?.();
          h.root.position.set(tr.x - 2.55, 0.32, TRUCK_Z + (i ? 0.45 : -0.45));
          h.root.rotation.y = -Math.PI / 2;
          g.scene.add(h.root);
          tr.crew.push({ h, home: V(STATION.x + (i ? 0.7 : -0.2), 0, STATION.z + 1.0), speed: 0 });
        }
        tr.phase = 'hop'; tr.t = 0;
      }
    } else if (tr.phase === 'hop') {
      const k = Math.min(1, tr.t / 0.5);
      for (const c of tr.crew) c.h.root.position.y = 0.32 * (1 - k) + Math.sin(k * Math.PI) * 0.12;
      if (k >= 1) { tr.phase = 'walk'; tr.t = 0; }
    } else if (tr.phase === 'walk' || tr.phase === 'back') {
      let arrived = 0;
      for (const [i, c] of tr.crew.entries()) {
        const to = tr.phase === 'walk' ? c.home : V(tr.x - 2.55, 0, TRUCK_Z + (i ? 0.45 : -0.45));
        const p = c.h.root.position, d = Math.hypot(to.x - p.x, to.z - p.z);
        if (d < 0.08) { arrived++; c.speed = 0; continue; }
        const sp = Math.min(1.6, d * 3);
        p.x += (to.x - p.x) / d * sp * dt; p.z += (to.z - p.z) / d * sp * dt;
        c.h.root.rotation.y = Math.atan2(to.x - p.x, to.z - p.z);
        c.speed = sp;
      }
      if (arrived === tr.crew.length) {
        if (tr.phase === 'walk') { tr.phase = 'load'; tr.t = 0; tr.next = 0.3; for (const c of tr.crew) c.h.root.rotation.y = Math.PI; }
        else { tr.phase = 'hopOn'; tr.t = 0; }
      }
    } else if (tr.phase === 'load') {
      // bag after bag slung into the hopper
      tr.next -= dt;
      if (tr.next <= 0 && this.s.station.n > 0) {
        tr.next = 0.75;
        const i = this.s.station.n - 1;
        const [x, z, y = 0] = SLOTS[Math.min(i, SLOTS.length - 1)];
        this.s.station.n--;
        this.layBags();
        const bag = propMesh(i % 3 === 2 ? 'trash_bag_b' : 'trash_bag');
        const from = V(STATION.x + x, 0.05 + y, STATION.z + z), to = V(tr.x - 2.35, 0.9, TRUCK_Z);
        bag.position.copy(from);
        g.scene.add(bag);
        const c = tr.crew[i % 2];
        c.h.gesture('carry');
        audio.play('bagRustle', { pos: from, vol: 0.7 });
        g.tweens.add({ dur: 0.6, ease: ease.inOutQuad, update: (k) => { bag.position.lerpVectors(from, to, k); bag.position.y += Math.sin(k * Math.PI) * 1.1; bag.rotation.z = k * 4; }, done: () => { bag.parent?.remove(bag); audio.play('thud', { pos: to, v: 0.3 }); c.h.clearGesture?.(); } });
        if (i % 3 === 0) g.tweens.wait(0.7, () => this.packer());
      }
      if (this.s.station.n <= 0 && tr.t > 1.2) {
        tr.phase = 'pack'; tr.t = 0; this.packer();
        g.events.emit('garbageCollected', { bags: tr.bagsLeft });
        if (tr.bagsLeft) g.news('Trash collected', `${tr.bagsLeft} bag${tr.bagsLeft === 1 ? '' : 's'} gone. The lane's clean again`, 4500);
      }
    } else if (tr.phase === 'pack') {
      if (tr.t > 2.2) { tr.phase = 'back'; tr.t = 0; }
    } else if (tr.phase === 'hopOn') {
      const k = Math.min(1, tr.t / 0.45);
      for (const c of tr.crew) { c.h.root.position.y = 0.32 * k + Math.sin(k * Math.PI) * 0.12; c.h.root.rotation.y = Math.PI / 2; }
      if (k >= 1) { tr.phase = 'out'; tr.t = 0; tr.v = 0; }
    } else if (tr.phase === 'out') {
      tr.v = Math.min(7, tr.v + dt * 2.2);
      move(tr.x + tr.v * dt);
      for (const [i, c] of tr.crew.entries()) c.h.root.position.set(tr.x - 2.55, 0.32, TRUCK_Z + (i ? 0.45 : -0.45));
      if (tr.x > 36) this.endTruck();
    }
    // the packer blade sweeps while it's working
    if (T.blade) T.blade.rotation.x = tr.packT > 0 ? Math.sin((2.2 - tr.packT) / 2.2 * Math.PI) * 1.1 : 0;
    if (tr.packT > 0) tr.packT -= dt;
    for (const c of tr.crew) c.h.update(dt, { speed: c.speed || 0, lookAt: null });
  }

  packer() {
    const tr = this.truck;
    if (!tr) return;
    tr.packT = 2.2;
    audio.play('packer', { pos: V(tr.x - 2.3, 1, TRUCK_Z), vol: 0.9 });
  }

  endTruck() {
    const g = this.game, tr = this.truck;
    for (const c of tr.crew) { c.h.root.parent?.remove(c.h.root); c.h.dispose?.(); }
    tr.tune?.stopAll(); tr.engine?.stopAll();
    this.truckModel.root.visible = false;
    this.truck = null;
    void g;
  }
}

// ------------------------------------------------------------------ the truck model (src/vehicles/garbageTruck.js)
/** The packer truck: root (faces +z), body (dips when it brakes), blade (the rotating packer plate), wheels, roll(d). */
function buildTruck() {
  const P = garbageTruckParts(), M = P.mats, T = TRUCK;
  const root = new THREE.Group();
  root.name = 'garbageTruck';
  const body = new THREE.Group();
  root.add(body);
  const bm = new THREE.Mesh(P.body, M.body);
  bm.castShadow = true; bm.receiveShadow = true;
  body.add(bm);
  const gl = new THREE.Mesh(P.glass, M.glass);
  gl.renderOrder = 2; gl.raycast = () => {};
  body.add(gl);
  const blade = new THREE.Mesh(P.blade, M.body);
  blade.position.set(0, T.BLADE.y, T.BLADE.z);
  body.add(blade);
  const wheels = [];
  for (const [x, z, front] of [[-T.TRACKF, T.AXF, 1], [T.TRACKF, T.AXF, 1], [-T.TRACKR, T.AXR, 0], [T.TRACKR, T.AXR, 0]]) {
    const geo = (front ? P.wheelF : P.wheelR)[x > 0 ? 0 : 1];
    const wm = new THREE.Mesh(geo, M.body);
    wm.position.set(x, T.WR, z);
    wm.castShadow = true;
    root.add(wm);
    wheels.push(wm);
  }
  let dist = 0;
  return { root, body, blade, wheels, roll: (d) => { dist += d; for (const w of wheels) w.rotation.x = dist / T.WR; } };
}
