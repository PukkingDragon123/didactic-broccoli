// Purchase / sale actions behind the GACHA-MART store (src/ui/ShopUI.js, the PC) and the museum. Each returns { ok, msg }.
//
// Money flows: everything bought online (machines, capsule boxes, licences, shelves, tools, charms, used figures) is
// a digital charge through payOnline (game.sim.payDigital: the bank balance once cash and bank are split); selling
// from the storage bin on the PC is a digital payment in (game.sim.receiveDigital). Levels gate what you may buy
// (game.progress.unlocked, src/data/unlocks.js); there are no machine upgrades any more.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import {
  MACHINE_TYPES, maxMachines, machinePrice, capsuleCost, licensePrice, licenseLevel,
  OPENERS, CHARMS, SHELF_PRICES, singlePrice, itemValue,
} from './economy.js';
import { unlockLevel } from '../data/unlocks.js';
import { MACHINE_SLOTS, SHELF_SLOTS } from '../world/Garage.js';
import { GachaMachine } from './GachaMachine.js';
import { GarageShelf } from './Shelf.js';
import { SERIES_BY_ID, getItem } from '../data/series/index.js';
import { propMesh } from '../world/props.js';
import { voxelMaterials } from '../voxel/materials.js';
import { makeItemMesh } from './collectibles.js';

const fail = (msg) => ({ ok: false, msg });
const okr = (msg) => ({ ok: true, msg });

/** A digital (online) charge: the one place shop purchases take money. */
export function payOnline(g, amount, reason) {
  return g.sim?.payDigital ? g.sim.payDigital(amount, reason) : g.spend(amount);
}
/** A digital payment in (selling on the PC). */
export function receiveOnline(g, amount, reason) {
  if (g.sim?.receiveDigital) g.sim.receiveDigital(amount, reason); else g.addMoney(amount);
}
const level = (g) => g.progress?.level ?? 99;
/** null when `id` is unlocked at the current level, else the "Reach level N" message. */
function gate(g, id) {
  if (!g.progress || g.progress.unlocked(id)) return null;
  return `Reach shop level ${unlockLevel(id)} to unlock this`;
}
const xp = (g, n, why) => g.progress?.addXP(n, why);

export function discoveredCount(g) { return Object.keys(g.state.discovered).length; }

/** Machines the garage has room for right now (by shop level). */
export function machineRoom(g) { return maxMachines(level(g)); }

export function buyMachine(g, type) {
  const T = MACHINE_TYPES[type];
  if (!T) return fail('Unknown machine');
  const lock = gate(g, `machine:${type}`);
  if (lock) return fail(lock);
  const owned = g.state.machines.filter((m) => m.type === type).length;
  const price = machinePrice(type, owned);
  const room = machineRoom(g);
  if (g.state.machines.length >= room) return fail(room < MACHINE_SLOTS.length ? `Room for ${room} machines at this level` : 'No free machine slot in the garage');
  const used = new Set(g.state.machines.map((m) => m.slot));
  const slot = MACHINE_SLOTS.findIndex((_, i) => !used.has(i));
  if (slot < 0) return fail('No free machine slot in the garage');
  if (!payOnline(g, price, `machine:${type}`)) return fail('Not enough money');
  const series = g.state.licenses[g.state.licenses.length - 1] || 'mochi';
  // machines arrive empty: order a capsule box and pour it in. `up` stays at zero (upgrades are gone; older code
  // still reads it). price = the coin price on the machine's price plate.
  const data = { id: 'm' + Date.now().toString(36), type, slot, up: { speed: 0, cap: 0, coins: 0 }, stock: [], series, price: Math.max(100, Math.round(SERIES_BY_ID[series].price / 100) * 100) };
  if (g.sim?.recommendedPrice) data.price = g.sim.recommendedPrice({ data });
  g.state.machines.push(data);
  const m = new GachaMachine(g, data);
  g.machines.push(m);
  // drop-in install animation
  const root = m.root;
  const y1 = root.position.y;
  root.position.y = 2.6;
  g.tweens.add({
    dur: 0.7, ease: ease.outBounce,
    update: (k) => { root.position.y = 2.6 + (y1 - 2.6) * k; },
    done: () => {
      audio.play('thud', { pos: root.position, v: 1 });
      audio.play('dust', { pos: root.position });
      g.effects.sparks({ pos: root.position.clone().add(new THREE.Vector3(0, 0.1, 0)), count: 60, colors: [0xd8ccb8, 0xb8a890], speed: 0.9, size: 0.03, gravity: 0.3, life: 1.2, star: 0 });
      g.player.shake = 0.25;
      root.updateMatrixWorld(true);
    },
  });
  g.news(`${T.name} installed!`, 'It arrives empty: order capsules on the PC');
  xp(g, g.state.machines.length === 1 ? 60 : 30, 'machine');
  g.events.emit('machineBought', { machine: m, type });
  g.save();
  return okr(`${T.name} installed in your garage`);
}

export function buyRefill(g, series, count) {
  if (!g.state.licenses.includes(series)) return fail('You need the licence for this series first');
  const price = capsuleCost(series) * count;
  if (!payOnline(g, price, `capsules:${series}`)) return fail('Not enough money');
  g.delivery.order({ type: 'refill', series, count, label: `${SERIES_BY_ID[series].name} x${count}` });
  g.save();
  return okr(`${count} capsules are on their way to the shutter`);
}

export function buyLicense(g, series) {
  if (g.state.licenses.includes(series)) return fail('You already have this licence');
  if (g.progress && !g.progress.unlocked(`series:${series}`)) return fail(`Reach shop level ${licenseLevel(series)} to unlock this series`);
  if (!payOnline(g, licensePrice(series), `licence:${series}`)) return fail('Not enough money');
  g.state.licenses.push(series);
  g.news(`New series: ${SERIES_BY_ID[series].name}!`, 'You can now order its refills on the PC');
  xp(g, 40, 'licence');
  g.save();
  return okr(`You can now order ${SERIES_BY_ID[series].name} refills`);
}

export function buyOpener(g, tier) {
  if (g.state.opener >= tier) return fail('You already have this');
  if (tier > g.state.opener + 1) return fail('You need the previous model first');
  const lock = gate(g, `opener:${tier}`);
  if (lock) return fail(lock);
  if (!payOnline(g, OPENERS[tier].price, `opener:${tier}`)) return fail('Not enough money');
  g.state.opener = tier;
  placeOpenerTool(g, true);
  g.news(`New tool: ${OPENERS[tier].name}`, 'Capsules open faster');
  g.save();
  return okr(`${OPENERS[tier].name}: capsules open faster`);
}

export function buyCharm(g, id) {
  if (g.state.charms.includes(id)) return fail('You already have this charm');
  const lock = gate(g, `charm:${id}`);
  if (lock) return fail(lock);
  if (!payOnline(g, CHARMS[id].price, `charm:${id}`)) return fail('Not enough money');
  g.state.charms.push(id);
  placeCharms(g, id);
  g.news(`${CHARMS[id].name} on the shrine shelf`, CHARMS[id].desc);
  g.save();
  return okr(`${CHARMS[id].name} is on the shrine shelf. Good luck!`);
}

export function buyShelf(g) {
  const n = g.state.shelves.length;
  if (n >= SHELF_SLOTS.length) return fail('No wall space left');
  const lock = gate(g, `shelf:${n + 1}`);
  if (lock) return fail(lock);
  if (!payOnline(g, SHELF_PRICES[n], 'shelf')) return fail('Not enough money');
  const used = new Set(g.state.shelves.map((s) => s.slot));
  const slot = SHELF_SLOTS.findIndex((_, i) => !used.has(i));
  const data = { slot, items: Array(48).fill(null) };
  g.state.shelves.push(data);
  const sh = new GarageShelf(g, data);
  g.shelves.push(sh);
  sh.root.scale.set(1, 0.01, 1);
  g.tweens.add({ dur: 0.6, ease: ease.outBack, update: (k) => sh.root.scale.set(1, Math.max(0.01, k), 1) });
  audio.play('upgrade', { pos: sh.root.position });
  xp(g, 20, 'shelf');
  g.save();
  return okr('A new shelf is up on the wall');
}

export function buySingle(g, key, finish = 'normal') {
  const lock = gate(g, 'market:buy');
  if (lock) return fail(lock);
  const price = singlePrice(key, finish);
  if (!payOnline(g, price, `single:${key}`)) return fail('Not enough money');
  g.delivery.order({ type: 'single', key, finish, label: getItem(key)?.name });
  g.save();
  return okr(`${getItem(key)?.name || 'Your figure'} is on its way to the shutter`);
}

/** Bookkeeping for every figure sale (the sell box, the PC, sell-all): stats, XP, the day's summary. */
export function noteSale(g, n, value, via = 'pc') {
  g.state.stats.sold += n;
  g.events.emit('sold', { n, value, via });
}

export function sellStored(g, k, n = 1) {
  const have = g.state.storage[k] || 0;
  if (!have) return fail('None left in storage');
  const take = Math.min(n, have);
  const [key, finish] = k.split('|');
  const v = itemValue(key, finish) * take;
  g.state.storage[k] = have - take;
  if (g.state.storage[k] <= 0) delete g.state.storage[k];
  receiveOnline(g, v, 'sell');
  noteSale(g, take, v);
  g.save();
  return okr(`Sold ${take} for ¥${v.toLocaleString('en-US')}`);
}

export function sellAllStored(g) {
  let total = 0, n = 0;
  for (const [k, c] of Object.entries(g.state.storage)) {
    const [key, finish] = k.split('|');
    total += itemValue(key, finish) * c; n += c;
  }
  if (!n) return fail('Your storage bin is empty');
  g.state.storage = {};
  receiveOnline(g, total, 'sell');
  noteSale(g, n, total);
  g.save();
  return okr(`Sold ${n} figure${n === 1 ? '' : 's'} for ¥${total.toLocaleString('en-US')}`);
}

/** Sell every displayed duplicate (keeps the best finish of each item on display). */
export function sellDisplayedDupes(g) {
  const seen = new Map();
  const entries = [];
  for (const d of g.allDisplays()) d.items.forEach((it, i) => { if (it) entries.push({ d, i, it }); });
  // keep highest-value copy of each key
  entries.sort((a, b) => itemValue(b.it.k, b.it.f) - itemValue(a.it.k, a.it.f));
  let total = 0, n = 0;
  for (const e of entries) {
    if (!seen.has(e.it.k)) { seen.set(e.it.k, true); continue; }
    total += itemValue(e.it.k, e.it.f); n++;
    e.d.clearItem(e.i);
  }
  if (!n) return fail('No duplicates on display');
  receiveOnline(g, total, 'sell');
  noteSale(g, n, total);
  g.save();
  return okr(`Sold ${n} duplicate${n === 1 ? '' : 's'} for ¥${total.toLocaleString('en-US')}`);
}

// ------------------------------------------------------------------ visible tools & charms
export function placeOpenerTool(g, animate) {
  if (g._toolMesh) g.scene.remove(g._toolMesh);
  const tier = g.state.opener;
  if (tier <= 0) return;
  const T = g.garage.table;
  const tool = g.reveal.buildTool(tier);
  tool.position.set(T.x + 0.35, T.h + 0.012, T.z + 0.28);
  tool.rotation.set(Math.PI / 2, 0, 0.5);
  tool.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.scene.add(tool);
  g._toolMesh = tool;
  if (animate) {
    g.effects.sparks({ pos: tool.position, count: 30, colors: [0xffffff, 0xffd23f], speed: 0.5, size: 0.01 });
    audio.play('upgrade', { pos: tool.position, vol: 0.7 });
  }
}

/** A little kamidana (household shrine shelf) on the back wall holds the lucky charms. */
export function placeCharms(g, newId = null) {
  const charms = g.state.charms;
  if (!charms.length) return;
  if (!g._kamidana) {
    const grp = new THREE.Group();
    grp.position.set(-0.95, 2.25, -4.86);
    const wood = new THREE.MeshStandardMaterial({ color: 0xe8d4a8, roughness: 0.6 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.26), wood);
    shelf.position.z = 0.13; shelf.castShadow = true; grp.add(shelf);
    for (const sx of [-0.4, 0.4]) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.2), wood); br.position.set(sx, -0.07, 0.1); grp.add(br); }
    // shimenawa rope with shide paper
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.92, 8), new THREE.MeshStandardMaterial({ color: 0xd8c080, roughness: 0.9 }));
    rope.rotation.z = Math.PI / 2; rope.position.set(0, 0.03, 0.26); grp.add(rope);
    for (let i = 0; i < 4; i++) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.09), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })); sh.position.set(-0.3 + i * 0.2, -0.02, 0.265); grp.add(sh); }
    g.scene.add(grp);
    g._kamidana = grp;
    g._charmMeshes = {};
  }
  const order = ['maneki', 'daruma', 'omamori', 'goldneko'];
  for (const id of charms) {
    if (g._charmMeshes[id]) continue;
    let m;
    if (id === 'maneki') m = propMesh('manekineko', { fallbackSize: [0.15, 0.22, 0.13] });
    else if (id === 'daruma') m = propMesh('daruma', { fallbackSize: [0.16, 0.18, 0.15] });
    else if (id === 'goldneko') { m = propMesh('manekineko', { fallbackSize: [0.15, 0.22, 0.13] }); m.material = voxelMaterials('gold'); m.scale.setScalar(1.25); }
    else { m = makeItemMesh('omamori/pouch'); m.scale.setScalar(2.6); }
    m.position.set(-0.32 + order.indexOf(id) * 0.21, 0.015, 0.12);
    g._kamidana.add(m);
    g._charmMeshes[id] = m;
    if (id === newId) {
      const wp = m.getWorldPosition(new THREE.Vector3());
      g.effects.sparks({ pos: wp, count: 50, colors: [0xffd23f, 0xffffff], speed: 0.7, size: 0.012 });
      g.effects.flash({ pos: wp, color: 0xffd080, intensity: 3, distance: 2, dur: 0.8 });
      audio.play('finishGold', { pos: wp, vol: 0.6 });
    }
  }
}
