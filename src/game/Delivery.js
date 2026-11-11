// Deliveries. Everything you order (Daikoku Toys, Off-Hobby, the grading service, museum fittings...) comes by Gen-san's
// FREE CANDY van (src/market/courier.js): an order waits in `queue` until its time, then the van drives into the lane
// and he carries the boxes to the shutter. Only a figure that didn't fit in your hands still slides in under the shutter
// at once (an "instant" drop), as do orders made before the van exists.
//   delivery.order(data, { eta (clock stamp) | minutes (from now) | delay (s, < 1 = instant) })
//   delivery.queue          [{ data, eta, realDue, instant, delay }] (saved as state.deliveries, ETA kept in data._eta)
//   delivery.due()          queue entries the van should bring now;  delivery.drop(data, pos) puts one in the world
//   delivery.meshFor(data)  the box for a data record (refill carton, parcel, mailer, furniture box)
// data.type: 'refill' { series, count } | 'single' { key, finish } | 'decor' { kind, id } | 'parcel' { contents, from }
//   | 'install' { what, ... } (machines, shelves... installed on arrival by src/market/orders.js)
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { SERIES_BY_ID, getItem } from '../data/series/index.js';
import { ease } from '../core/util.js';
import { DISPLAYS } from '../museum/catalog.js';
import { PROPS, propMesh } from '../world/props.js';
import { makeCapsuleBox } from './capsuleBox.js';
import { makeParcelMesh } from '../market/models.js';
import { sealedBox } from '../props/things/carton.js';

let nextId = 1;

/** English label for a held / delivered box (old saves may carry a Japanese `label`). */
export function boxLabel(d) {
  if (!d) return '';
  if (d.type === 'refill') { const se = SERIES_BY_ID[d.series]; return se ? `${se.name} x${d.count}` : ''; }
  if (d.type === 'single') return getItem(d.key)?.name || '';
  if (d.type === 'decor') return (d.kind === 'display' ? DISPLAYS[d.id]?.name : PROPS[d.id]?.name) || d.name || '';
  if (d.type === 'parcel') return `Parcel from ${d.from || 'Off-Hobby'}${d.label ? `: ${d.label}` : ''}`;
  if (d.t === 'slab') return `Graded slab: ${getItem(d.key)?.name || ''} (${d.score})`;
  if (d.t === 'garment' || d.t === 'charm' || d.t === 'tipjar' || d.t === 'brick' || d.t === 'trinket') return d.name || '';
  if (d.key && d.pack) return `Sealed ${getItem(d.key)?.name || ''}`;
  return d.name || d.label || '';
}

export function makeBoxMesh(kind, info, size = [0.36, 0.24, 0.28]) {
  // a real cardboard box (Poly Haven, CC0) at this size, with a printed shipping label (src/props/things/carton.js)
  const single = kind === 'single';
  const title = single ? getItem(info.key)?.name || 'Figure' : info.name || boxLabel({ type: 'decor', ...info }) || 'Delivery';
  const group = sealedBox(size, { title, sub: single ? (info.finish && info.finish !== 'normal' ? info.finish : 'figure') : 'fragile', kind: single ? 'single' : 'decor' });
  group.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  group.userData.size = size;
  return group;
}

/** Paint roller (museum remodel tool). */
export function makeRoller() {
  // the modelled paint roller (src/props/models/growth.js gr_roller)
  const g = new THREE.Group();
  g.add(propMesh('gr_roller', { fallbackSize: [0.2, 0.36, 0.08] }));
  return g;
}

export class Delivery {
  constructor(game) {
    this.game = game;
    this.queue = [];
    this.busyT = 0;
  }

  /** Queue a delivery. data: { type, ... }. opts: { eta, minutes, delay (< 1 s: slide in under the shutter now) }. */
  order(data, opts = {}) {
    const g = this.game;
    data.oid ??= nextId++;
    const instant = !!opts.instant || (opts.delay !== undefined && opts.delay < 1 && data._eta === undefined);
    const now = g.clock?.stamp ?? 0;
    let eta = opts.eta ?? data._eta;
    if (eta === undefined && !instant) eta = now + (opts.minutes ?? 25 + Math.random() * 20);
    if (!instant) data._eta = eta;
    // while the clock stands still (the opening chores) real seconds stand in for in-game minutes
    const realDue = (g.state.playTime || 0) + Math.max(15, ((eta ?? now) - now) * 0.9);
    this.queue.push({ data, delay: opts.delay ?? 2.2, eta, realDue, instant });
    g.events?.emit('deliveryOrdered', { data, eta });
  }

  /** Entries due for the van now. */
  due() {
    const g = this.game, now = g.clock?.stamp ?? 0, pt = g.state.playTime || 0;
    const frozen = g.clock?.pauseReason?.() === 'opening' || !g.clock;
    return this.queue.filter((q) => !q.instant && !q.onVan && (now >= q.eta || (frozen && pt >= q.realDue)));
  }
  /** Soonest pending van delivery (stamp) or null. */
  next() { let m = null; for (const q of this.queue) if (!q.instant && (m === null || q.eta < m)) m = q.eta; return m; }
  remove(entry) { const i = this.queue.indexOf(entry); if (i >= 0) this.queue.splice(i, 1); }

  spawnRefillBox(series, count, pos) {
    const data = { type: 'refill', series, count, stage: 2, label: `${SERIES_BY_ID[series].name} x${count}` };
    const mesh = makeCapsuleBox(data);
    return this.game.items.spawnBox(data, pos, mesh);
  }

  sizeFor(data) {
    if (data.type === 'refill') { const s = Math.min(1.25, 0.8 + data.count / 60); return [0.36 * s, 0.22 * s, 0.28 * s]; }
    if (data.type === 'single') return [0.16, 0.05, 0.12];
    if (data.type === 'decor') return data.boxSize || [0.5, 0.4, 0.45];
    return [0.3, 0.25, 0.25];
  }

  meshFor(data) {
    if (data.type === 'roller') return makeRoller();
    if (data.type === 'refill') return makeCapsuleBox(data); // sealed carton (tape, flaps, capsules inside)
    if (data.type === 'parcel') return makeParcelMesh(this.game, data);
    const kind = data.type === 'single' ? 'single' : 'decor';
    return makeBoxMesh(kind, data, this.sizeFor(data));
  }

  /** Put one delivered thing in the world at pos (installs go through the market). Returns the box entity or null. */
  drop(data, pos, rotY = 0) {
    const g = this.game;
    delete data._eta;
    if (data.type === 'install') { g.market?.install?.(data, pos); return null; }
    const mesh = this.meshFor(data);
    mesh.rotation.y = rotY;
    return g.items.spawnBox(data, pos, mesh);
  }

  /** The old drop: the box slides in under the shutter after a doorbell. */
  arrive(data) {
    const g = this.game;
    const DS = g.garage.deliverySpot;
    const target = new THREE.Vector3(DS.x + (Math.random() - 0.5) * 0.5, 0, DS.z + (Math.random() - 0.5) * 0.4);
    if (data.type === 'install') { g.market?.install?.(data, target); return; }
    const start = new THREE.Vector3(target.x + (Math.random() - 0.5) * 0.4, 0, 7.2);
    const mesh = this.meshFor(data);
    mesh.position.copy(start);
    mesh.rotation.y = (Math.random() - 0.5) * 0.6;
    g.scene.add(mesh);
    g.tweens.wait(0.2, () => audio.play('doorbell', { pos: new THREE.Vector3(1.5, 1.6, 4.9), vol: 0.9 }));
    g.tweens.add({
      delay: 0.9, dur: 1.0, ease: ease.outCubic,
      update: (k) => { mesh.position.lerpVectors(start, target, k); mesh.rotation.z = Math.sin(k * Math.PI * 3) * 0.04 * (1 - k); },
      done: () => {
        audio.play('drop', { pos: target, vol: 0.7 });
        g.scene.remove(mesh);
        delete data._eta;
        g.items.spawnBox(data, target, mesh);
      },
    });
  }

  update(dt) {
    if (this.busyT > 0) this.busyT -= dt;
    for (const q of this.queue) q.delay -= dt;
    // the van (src/market/courier.js) collects everything else; without it, things arrive the old way
    const courier = this.game.courier;
    const i = this.queue.findIndex((q) => (q.instant || !courier) && q.delay <= 0);
    if (this.busyT <= 0 && i >= 0) {
      const q = this.queue.splice(i, 1)[0];
      this.arrive(q.data);
      this.busyT = 0.9;
      if (!this.queue.some((x) => x.instant)) this.game.news('Delivery!', 'A box is waiting by the shutter');
    }
  }
}
