// Stacking racks: the painted angle-iron frame Japanese shops stack two capsule machines in (art/lowpix/machines/_src/
// rack.py). Bought on the PC shop's Gacha Machines page ("Stack on rack"): it goes round one of your garage machines
// (a Showa Retro or a Gacha Station), which drops onto the rack's floor tray, and a new machine of the chosen type is
// installed on the shelf above. Each tier is a full GachaMachine (own series, stock, price, coin box, crank, chute):
// the top one at chest height, the bottom one played crouching / looking down. A racked slot holds two machines and
// does not count against the garage's machine room. Machines in a rack stay put (the builder won't move them).
// Save: game.state.racks = { slots: [garage slot index] }; the machines carry data.stack = { tier, y }.
import * as THREE from 'three';
import { ensureState } from '../game/stateExt.js';
import { GachaMachine } from '../game/GachaMachine.js';
import { MACHINE_SLOTS } from '../world/Garage.js';
import { MACHINE_TYPES, machinePrice } from '../game/economy.js';
import { payOnline } from '../game/shop.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { preloadLP, lpReady, lpMesh } from '../gachakit/lowpix.js';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';

// keep in step with art/lowpix/machines/_src/rack.py (mm there)
export const RACK = { base: 0.06, shelf: 1.01, halfW: 0.257, halfD: 0.227, price: 3800, types: ['retro', 'standard'] };

if (typeof document !== 'undefined' && !/[?&]voxelmachines\b/.test(location.search)) await preloadLP(['stack_rack']);

export function install(game) {
  const st = ensureState(game, 'racks', { slots: [] });
  const racks = new Map(); // slot -> { root, obstacle }
  const inGarage = (m) => !m.data.at && MACHINE_SLOTS[m.data.slot];
  // a save from before: machines that say they're racked keep their rack
  for (const m of game.machines) if (m.data.stack && inGarage(m) && !st.slots.includes(m.data.slot)) st.slots.push(m.data.slot);

  function build(slot) {
    if (racks.has(slot) || !lpReady('stack_rack')) return;
    const S = MACHINE_SLOTS[slot];
    const root = new THREE.Group();
    root.name = 'stack-rack';
    const mesh = lpMesh('stack_rack', 'body');
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.noRim = true;
    root.add(mesh);
    root.position.set(S.x, 0, S.z);
    root.rotation.y = S.rotY;
    game.scene.add(root);
    root.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(root);
    const obstacle = game.player.addObstacle?.(bb.min.x, bb.max.x, bb.min.z, bb.max.z);
    racks.set(slot, { root, obstacle });
  }
  for (const s of st.slots) build(s);

  /** The garage machine a new rack could go round for a `type` top machine (null if none). */
  const baseFor = () => game.machines.find((m) => inGarage(m) && !m.data.stack && RACK.types.includes(m.data.type)
    && !st.slots.includes(m.data.slot) && m.state === 'idle' && !m.lidOpen && !m.drawer?.open && !m.spin && !m.data.fallen) || null;

  function price(type) {
    return machinePrice(type, game.state.machines.filter((d) => d.type === type).length) + RACK.price;
  }

  function buy(type) {
    const T = MACHINE_TYPES[type];
    if (!T || !RACK.types.includes(type)) return { ok: false, msg: 'Only Retro and Gacha Station machines stack' };
    if (game.progress && !game.progress.unlocked(`machine:${type}`)) return { ok: false, msg: 'Not unlocked yet' };
    const base = baseFor();
    if (!base) return { ok: false, msg: 'Needs a Retro or Gacha Station in the garage to stack on' };
    if (!payOnline(game, price(type), `rack:${type}`)) return { ok: false, msg: 'Not enough money' };
    const slot = base.data.slot;
    st.slots.push(slot);
    build(slot);
    // the machine already there drops into the rack's floor tray
    base.data.stack = { tier: 0, y: RACK.base };
    base.rebuild();
    const series = game.state.licenses[game.state.licenses.length - 1] || 'teruteru';
    const data = {
      id: 'm' + Date.now().toString(36), type, slot, no: 10 + slot, stack: { tier: 1, y: RACK.shelf },
      up: { speed: 0, cap: 0, coins: 0 }, stock: [], series, price: Math.max(100, Math.round((SERIES_BY_ID[series]?.price || 100) / 100) * 100),
    };
    if (game.sim?.recommendedPrice) data.price = game.sim.recommendedPrice({ data });
    game.state.machines.push(data);
    const m = new GachaMachine(game, data);
    game.machines.push(m);
    // lowered onto the shelf
    const root = m.root, y1 = root.position.y;
    root.position.y = y1 + 0.5;
    game.tweens.add({
      dur: 0.6, ease: ease.outBounce,
      update: (k) => { root.position.y = y1 + 0.5 * (1 - k); },
      done: () => { root.position.y = y1; root.updateMatrixWorld(true); audio.play('thud', { pos: root.position, v: 0.8 }); game.player.shake = 0.15; },
    });
    game.news(`${T.name} stacked!`, 'Two machines, one spot: it arrives empty, order capsules on the PC');
    game.progress?.addXP(30, 'machine');
    game.events.emit('machineBought', { machine: m, type, stacked: true });
    game.save();
    return { ok: true, msg: `${T.name} stacked on a rack` };
  }

  game.stackRack = { RACK, buy, price, canStack: () => !!baseFor(), racks };
}
