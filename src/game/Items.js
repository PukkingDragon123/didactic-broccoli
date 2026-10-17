// Loose physical items in the world (capsules, toys, delivery boxes) that can be picked up.
import * as THREE from 'three';
import { makeCapsule, capsuleColor } from './Capsule.js';
import { makeItemMesh } from './collectibles.js';
import { audio } from '../core/audio.js';
import { itemValue } from './economy.js';

let uid = 1;

export class Items {
  constructor(game) {
    this.game = game;
    this.list = new Set();
  }

  /** Spawn a capsule with physics. data: {series, key, finish, rarity, color} */
  spawnCapsule(data, pos, vel = null, opts = {}) {
    const g = this.game;
    const color = data.color ?? capsuleColor(data.series);
    data.color = color;
    const cap = makeCapsule(data.series, color);
    cap.group.position.copy(pos);
    cap.group.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    g.scene.add(cap.group);
    const ent = { id: uid++, kind: 'capsule', data, obj: cap.group, cap, body: null };
    ent.body = g.physics.addBody({
      radius: cap.r, position: pos, velocity: vel || new THREE.Vector3(), object: cap.group, restitution: 0.42, friction: 0.3, rollDamping: 1.2,
      onImpact: (speed, mat) => {
        if (speed < 0.25 || !audio.canPlay('cap' + ent.id, 0.05)) return;
        audio.play('capsuleHit', { pos: ent.body.pos, speed, mat, vol: Math.min(1, speed / 2) });
      },
    });
    this.registerPickup(ent);
    this.list.add(ent);
    if (data.rarity === 'secret' || data.rarity === 'ultra') ent.glint = 0;
    return ent;
  }

  /** Spawn a loose collectible standing on a surface (or dropped). */
  spawnToy(data, pos, opts = {}) {
    const g = this.game;
    const mesh = makeItemMesh(data.key, data.finish);
    const holder = new THREE.Group();
    holder.add(mesh);
    holder.position.copy(pos);
    if (opts.rotY !== undefined) holder.rotation.y = opts.rotY;
    g.scene.add(holder);
    const size = mesh.geometry.userData.size;
    const r = Math.max(0.015, Math.min(size.x, size.z) * 0.45);
    mesh.position.y = -r; // body centre sits r above the ground
    const ent = { id: uid++, kind: 'toy', data, obj: holder, mesh, body: null };
    if (opts.physics !== false) {
      ent.body = g.physics.addBody({
        radius: r, position: pos.clone().add(new THREE.Vector3(0, r, 0)), object: holder, roll: false, restitution: 0.15, friction: 0.8, rollDamping: 6,
        onImpact: (speed) => { if (speed > 0.4 && audio.canPlay('toy' + ent.id, 0.08)) audio.play('place', { pos: ent.body.pos, vol: Math.min(0.8, speed / 2) }); },
      });
    } else {
      mesh.position.y = 0;
    }
    this.registerPickup(ent);
    this.list.add(ent);
    return ent;
  }

  /** Delivery box entity. data: {type, ...} */
  spawnBox(data, pos, mesh) {
    const g = this.game;
    mesh.position.copy(pos);
    g.scene.add(mesh);
    const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
    const ent = { id: uid++, kind: 'box', data, obj: mesh, size, body: null };
    this.registerPickup(ent);
    this.list.add(ent);
    return ent;
  }

  registerPickup(ent) {
    const g = this.game;
    g.interaction.add(ent.obj, {
      hint: (held) => {
        if (held) return null;
        if (ent.kind === 'capsule') return { key: 'L', text: '拾う · Pick up capsule' };
        if (ent.kind === 'toy') return { key: 'L', text: '拾う · Pick up', sub: `¥${itemValue(ent.data.key, ent.data.finish).toLocaleString()}` };
        return { key: 'L', text: '持つ · Pick up box', sub: ent.data.label || '' };
      },
      use: () => this.pickUp(ent),
    });
  }

  pickUp(ent) {
    const g = this.game;
    if (g.held.item) return false;
    this.detach(ent);
    audio.play('pickup', { vol: 0.8 });
    g.held.take(ent.kind, ent.data, ent.obj, { ent });
    return true;
  }

  /** Remove physics + interactivity, keep the object in the scene (caller takes ownership). */
  detach(ent) {
    const g = this.game;
    if (ent.body) { g.physics.removeBody(ent.body); ent.body = null; }
    g.interaction.remove(ent.obj);
    this.list.delete(ent);
  }

  destroy(ent) {
    this.detach(ent);
    ent.obj.parent?.remove(ent.obj);
  }

  update(dt) {
    // rare capsules occasionally glint through the clear dome
    for (const ent of this.list) {
      if (ent.glint === undefined) continue;
      ent.glint -= dt;
      if (ent.glint <= 0) {
        ent.glint = 1.2 + Math.random() * 2.5;
        const p = ent.obj.getWorldPosition(new THREE.Vector3());
        this.game.effects.sparks({ pos: p, count: 2, color: ent.data.rarity === 'secret' ? 0xffd23f : 0xff8af0, speed: 0.05, size: 0.012, life: 0.6, gravity: 0, star: 1 });
      }
    }
  }

  serialize() {
    const out = [];
    for (const e of this.list) {
      const p = e.obj.position;
      if (e.kind === 'capsule') out.push({ kind: 'capsule', d: e.data, p: [p.x, p.y, p.z] });
      else if (e.kind === 'toy') out.push({ kind: 'toy', d: e.data, p: [p.x, p.y - (e.body ? e.body.radius : 0), p.z], r: e.obj.rotation.y });
      else if (e.kind === 'box') out.push({ kind: 'box', d: e.data, p: [p.x, p.y, p.z] });
    }
    return out;
  }
}
