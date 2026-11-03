// Empty capsule shells. After a reveal the two halves stay with you (they go into a free inventory slot); drop them
// and they're physical litter on the floor, sweep litter up with the broom, or put shells in the capsule return box
// at the machine row (customers will bin theirs there too). game.items.spawnShell(pos, data, vel) for other systems.
// Also wires the held-item hooks for the 'shell' kind into game.held (pose, hint, drop) without touching Held.js.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { makeShell, capsuleColor } from './Capsule.js';
import { ensureState } from './stateExt.js';

const RETURN_BOX = { x: -3.45, z: -0.725, w: 0.32, h: 0.62, d: 0.3 };
let uid = 1;

export function installInto(game) {
  const g = game;
  const S = ensureState(g, 'shells', { returned: 0, swept: 0 });
  const shells = { list: new Set(), state: S };
  g.shells = shells;

  /** A loose empty shell (physics litter). data: { series, color } */
  g.items.spawnShell = (pos, data = {}, vel = null) => {
    const d = { series: data.series || 'mochi', color: data.color ?? capsuleColor(data.series || 'mochi') };
    const cap = makeShell(d.series, d.color);
    cap.group.position.copy(pos);
    cap.group.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    g.scene.add(cap.group);
    const ent = { id: 'sh' + uid++, kind: 'shell', data: d, obj: cap.group, cap, body: null };
    ent.body = g.physics.addBody({
      radius: cap.r * 0.85, position: pos, velocity: vel || new THREE.Vector3(), object: cap.group, restitution: 0.3, friction: 0.5, rollDamping: 3,
      onImpact: (speed, mat) => { if (speed > 0.3 && audio.canPlay('shell' + ent.id, 0.06)) audio.play('capsuleHit', { pos: ent.body.pos, speed: speed * 0.7, mat: mat === 'concrete' ? 'capsule' : mat, vol: 0.5 }); },
    });
    g.interaction.add(ent.obj, {
      hint: () => {
        if (g.held.holding('broom')) return { key: 'LMB', text: 'Sweep up the empty capsule' };
        if (!g.held.canTake()) return { key: '', text: 'Empty capsule', sub: 'Hands full · a broom sweeps it up' };
        return { key: 'LMB', text: 'Pick up the empty capsule', sub: 'Litter: bin it in the capsule return box' };
      },
      use: () => {
        if (g.held.holding('broom')) { sweep(ent); return false; }
        if (!g.held.canTake()) return false;
        detach(ent);
        audio.play('pickup', { vol: 0.6 });
        g.held.take('shell', ent.data, ent.obj, { pose: 'capsule' });
        return false;
      },
    });
    shells.list.add(ent);
    return ent;
  };

  const detach = (ent) => {
    if (ent.body) { g.physics.removeBody(ent.body); ent.body = null; }
    g.interaction.remove(ent.obj);
    shells.list.delete(ent);
  };

  /** Broom sweep: the shell (and any next to it) skitters into the dustpan and is gone. */
  const sweep = (ent) => {
    g.held.swing = 1;
    audio.play('sweep', { pos: ent.obj.position, vol: 0.7 });
    const near = [...shells.list].filter((e) => e.obj.position.distanceTo(ent.obj.position) < 0.4);
    for (const e of near) {
      detach(e);
      const o = e.obj, p0 = o.position.clone(), dir = new THREE.Vector3().subVectors(p0, g.player.pos).setY(0).normalize();
      g.tweens.add({ dur: 0.35, update: (k) => { o.position.copy(p0).addScaledVector(dir, k * 0.25); o.rotation.y += 0.3; o.scale.setScalar(1 - k * 0.9); }, done: () => o.parent?.remove(o) });
      S.swept++;
    }
    g.effects.puff?.({ pos: ent.obj.position.clone().add(new THREE.Vector3(0, 0.03, 0)), count: 5, color: 0xb8ab98 });
  };

  /** A shell for the player's inventory (into a free slot, staying pocketed); none free: it drops at your feet. */
  shells.give = (data) => {
    const H = g.held;
    const d = { series: data.series, color: data.color };
    const cap = makeShell(d.series, d.color);
    const free = H.slots.findIndex((x) => !x);
    if (free < 0) {
      const p = g.player.pos.clone().add(new THREE.Vector3(0, 0.9, 0)).addScaledVector(new THREE.Vector3(-Math.sin(g.player.yaw), 0, -Math.cos(g.player.yaw)), 0.3);
      g.items.spawnShell(p, d, new THREE.Vector3(0, 0.5, 0));
      g.tip?.('shellDrop', 'Your hands were full: the empty capsule dropped', 'Sweep it up or bin it in the capsule return box');
      return;
    }
    H.anchor.add(cap.group);
    cap.group.visible = false;
    H.slots[free] = { kind: 'shell', data: d, obj: cap.group, ent: null };
    g.events.emit('slot', H.sel);
    g.tip?.('shellKeep', `The empty capsule is in slot ${free + 1}`, 'Q drops it (litter!), or put it in the capsule return box by the machines');
  };

  // the capsule return box at the machine row
  const hitBox = new THREE.Mesh(new THREE.BoxGeometry(RETURN_BOX.w, RETURN_BOX.h, RETURN_BOX.d), new THREE.MeshBasicMaterial({ visible: false }));
  hitBox.position.set(RETURN_BOX.x, RETURN_BOX.h / 2, RETURN_BOX.z);
  g.scene.add(hitBox);
  g.interaction.add(hitBox, {
    hint: (held) => {
      if (held?.kind === 'shell') return { key: 'LMB', text: 'Put the empty capsule in the return box', sub: `${S.returned} returned` };
      if (held) return null;
      return { key: '', text: 'Capsule return box', sub: 'Empty capsules go in here' };
    },
    use: (held) => {
      if (held?.kind !== 'shell') return false;
      const target = hitBox.position.clone().add(new THREE.Vector3(0, RETURN_BOX.h / 2 + 0.05, 0));
      g.held.putTo(target, new THREE.Quaternion(), (obj) => {
        obj.parent?.remove(obj);
        S.returned++;
        audio.play('capsuleHit', { pos: target, speed: 1.2, mat: 'capsule', vol: 0.7 });
        g.events.emit('shellReturned', { count: S.returned });
        g.save();
      }, { dur: 0.35, arc: 0.12, scale: 0.8 });
      return false;
    },
  });
  shells.returnBox = hitBox;
  /** A customer drops their empty capsule into the return box (people code: call when they bin it). */
  shells.customerBin = () => {
    S.returned++;
    audio.play('capsuleHit', { pos: hitBox.position.clone().add(new THREE.Vector3(0, RETURN_BOX.h / 2, 0)), speed: 1, mat: 'capsule', vol: 0.6 });
    g.events.emit('shellReturned', { count: S.returned, customer: true });
  };
  /** World position of the return box's slot (where people walk to bin a shell). */
  shells.binPos = () => hitBox.position.clone().add(new THREE.Vector3(0, RETURN_BOX.h / 2, 0));

  // ---- held-item hooks for the 'shell' kind (instance-level wrappers, Held.js untouched)
  const H = g.held;
  const poseFor = H.poseFor.bind(H), scaleFor = H.scaleFor.bind(H), hint = H.hint.bind(H), drop = H.drop.bind(H);
  H.poseFor = (it) => (it?.kind === 'shell' ? 'capsule' : poseFor(it));
  H.scaleFor = (it, pose) => (it?.kind === 'shell' ? 1.25 : scaleFor(it, pose));
  H.hint = () => (H.item?.kind === 'shell' && !H.busy ? { key: 'Q', text: 'Empty capsule', sub: 'Drop it, or put it in the capsule return box' } : hint());
  H.drop = () => {
    const it = H.item;
    if (it?.kind !== 'shell') return drop();
    const rel = H.release();
    const p = rel.obj.getWorldPosition(new THREE.Vector3());
    rel.obj.parent?.remove(rel.obj);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
    g.items.spawnShell(p, rel.data, fwd.multiplyScalar(1.2).add(new THREE.Vector3(0, 0.5, 0)));
    audio.play('whoosh', { vol: 0.5, v: 0.1 });
    H.tossed = g.time;
  };

  // shells that were in your inventory when the game was saved (Game.restoreInventory skips unknown kinds)
  (g.state.inventory || []).forEach((it, i) => {
    if (it?.kind !== 'shell' || H.slots[i]) return;
    const cap = makeShell(it.d.series, it.d.color);
    H.anchor.add(cap.group);
    cap.group.visible = i === H.sel;
    H.slots[i] = { kind: 'shell', data: it.d, obj: cap.group, ent: null };
    if (i === H.sel) { H.pose = 'capsule'; H.holdScale = 1.25; H.startTrans('capsule', 0.01); }
  });
}
