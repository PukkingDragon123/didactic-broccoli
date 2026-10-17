// Display slots: physically place collectibles on shelves / in cases. Shared by the garage shelves and
// every museum exhibit. Each slot shows a ghost preview while you aim with a toy in hand.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { makeItemMesh } from './collectibles.js';
import { plaque } from './labels.js';
import { getItem } from '../data/series/index.js';
import { itemValue } from './economy.js';

const ghostMat = new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0.28, depthWrite: false });
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

export class DisplaySlots {
  /**
   * @param owner Object3D the slots are parented to (local space)
   * @param defs  [{pos:Vector3, rotY?:number, size?:[w,h,d], plaque?:boolean}]
   * @param items persistent array (same length as defs) of {k,f}|null
   */
  constructor(game, owner, defs, items, opts = {}) {
    this.game = game;
    this.owner = owner;
    this.defs = defs;
    this.items = items;
    this.opts = opts;
    this.slots = defs.map((d, i) => this.makeSlot(d, i));
    this.ghost = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat);
    this.ghost.visible = false;
    this.ghost.userData.noRim = true;
    this.ghost.raycast = () => {};
    owner.add(this.ghost);
    this.ghostFrame = -1;
    for (let i = 0; i < defs.length; i++) if (items[i]) this.showItem(i, items[i], false);
  }

  makeSlot(d, i) {
    const ghostRef = () => (this.ghost.visible ? this.ghost : new THREE.Group());
    const [w, h, dd] = d.size || [0.12, 0.13, 0.12];
    const hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), hitMat);
    hit.position.copy(d.pos).add(new THREE.Vector3(0, h / 2, 0));
    hit.rotation.y = d.rotY || 0;
    this.owner.add(hit);
    const slot = { i, def: d, hit, mesh: null, plaque: null };
    this.game.interaction.add(hit, {
      reach: 2.6,
      noHighlight: false,
      get highlight() { return slot.mesh || ghostRef(); },
      hint: (held) => this.hint(slot, held),
      use: (held) => this.use(slot, held),
    });
    return slot;
  }

  hint(slot, held) {
    const it = this.items[slot.i];
    if (held) {
      if (held.kind !== 'toy' || this.game.held.busy) return null;
      this.showGhost(slot, held.data.key);
      return it ? { key: 'L', text: '入れ替え · Swap', sub: getItem(it.k)?.name } : { key: 'L', text: '飾る · Display here' };
    }
    if (!it) return null;
    const item = getItem(it.k);
    return { key: 'L', text: `取る · Take ${item?.name || ''}`, sub: `¥${itemValue(it.k, it.f).toLocaleString()}` };
  }

  showGhost(slot, key) {
    const g = makeItemMesh(key).geometry;
    this.ghost.geometry = g;
    this.ghost.position.copy(slot.def.pos);
    this.ghost.rotation.y = slot.def.rotY || 0;
    this.ghost.visible = !this.items[slot.i];
    this.ghostFrame = this.game.frame;
  }

  use(slot, held) {
    const g = this.game;
    const cur = this.items[slot.i];
    if (held) {
      if (held.kind !== 'toy') return false;
      const data = { k: held.data.key, f: held.data.finish };
      const wpos = this.owner.localToWorld(slot.def.pos.clone());
      const wq = this.owner.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), slot.def.rotY || 0));
      // swap: take the current one into the hand afterwards
      const prev = cur ? { ...cur } : null;
      if (prev) this.clearItem(slot.i);
      this.items[slot.i] = data;
      g.held.putTo(wpos, wq, (obj) => {
        obj.parent?.remove(obj);
        this.showItem(slot.i, data, true);
        audio.play('place', { pos: wpos, mat: this.opts.glass ? 'glass' : 'wood' });
        g.effects.sparks({ pos: wpos.clone().add(new THREE.Vector3(0, 0.03, 0)), count: 8, colors: [0xfff4d8], speed: 0.25, size: 0.006, life: 0.5 });
        g.onDisplayChanged(data.k, this, slot);
        if (prev) {
          const m = makeItemMesh(prev.k, prev.f);
          const holder = new THREE.Group(); holder.add(m);
          holder.position.copy(wpos); g.scene.add(holder);
          g.held.take('toy', { key: prev.k, finish: prev.f }, holder);
        }
      }, { dur: 0.32, arc: 0.04 });
      return false;
    }
    if (!cur) return false;
    // take from the shelf
    const m = slot.mesh;
    const wpos = m.getWorldPosition(new THREE.Vector3());
    this.clearItem(slot.i);
    const mesh = makeItemMesh(cur.k, cur.f);
    const holder = new THREE.Group(); holder.add(mesh);
    holder.position.copy(wpos);
    holder.quaternion.copy(this.owner.getWorldQuaternion(new THREE.Quaternion()));
    g.scene.add(holder);
    g.held.take('toy', { key: cur.k, finish: cur.f }, holder);
    audio.play('pickup', { vol: 0.7 });
    g.onDisplayChanged(cur.k, this, slot);
    return false;
  }

  showItem(i, data, pop) {
    const slot = this.slots[i];
    if (slot.mesh) this.owner.remove(slot.mesh);
    const m = makeItemMesh(data.k, data.f);
    m.position.copy(slot.def.pos);
    m.rotation.y = slot.def.rotY || 0;
    m.castShadow = this.opts.shadows ?? true;
    this.owner.add(m);
    slot.mesh = m;
    if (this.opts.plaques !== false && slot.def.plaque !== false) {
      if (slot.plaque) this.owner.remove(slot.plaque);
      const p = plaque(data.k, data.f);
      const off = new THREE.Vector3(0, 0.008, (slot.def.plaqueZ ?? 0.05)).applyAxisAngle(new THREE.Vector3(0, 1, 0), slot.def.rotY || 0);
      p.position.copy(slot.def.pos).add(off);
      p.rotation.set(-0.35, slot.def.rotY || 0, 0, 'YXZ');
      this.owner.add(p);
      slot.plaque = p;
    }
    if (pop) {
      m.scale.setScalar(0.6);
      this.game.tweens.add({ dur: 0.35, ease: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2), update: (k) => m.scale.setScalar(0.6 + 0.4 * k) });
    }
  }

  clearItem(i) {
    const slot = this.slots[i];
    if (slot.mesh) { this.owner.remove(slot.mesh); slot.mesh = null; }
    if (slot.plaque) { this.owner.remove(slot.plaque); slot.plaque = null; }
    this.items[i] = null;
  }

  update() {
    if (this.ghost.visible && this.ghostFrame !== this.game.frame) this.ghost.visible = false;
  }

  /** keys currently displayed here */
  keys() { return this.items.filter(Boolean).map((x) => x.k); }

  dispose() {
    for (const s of this.slots) { this.game.interaction.remove(s.hit); this.owner.remove(s.hit); this.clearItem(s.i); }
    this.owner.remove(this.ghost);
  }
}
