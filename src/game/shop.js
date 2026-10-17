// Purchase / sale actions shared by the E-Mart website and the museum.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import {
  MACHINE_TYPES, MAX_MACHINES, machinePrice, upgradeCost, UPGRADES, capsuleCost, licensePrice, licenseRequirement,
  OPENERS, CHARMS, SHELF_PRICES, singlePrice, itemValue, capacityFor,
} from './economy.js';
import { MACHINE_SLOTS, SHELF_SLOTS } from '../world/Garage.js';
import { GachaMachine } from './GachaMachine.js';
import { GarageShelf } from './Shelf.js';
import { SERIES_BY_ID, getItem } from '../data/series/index.js';
import { propMesh } from '../world/props.js';
import { voxelMaterials } from '../voxel/materials.js';
import { makeItemMesh } from './collectibles.js';

const fail = (msg) => ({ ok: false, msg });
const okr = (msg) => ({ ok: true, msg });

export function discoveredCount(g) { return Object.keys(g.state.discovered).length; }

export function buyMachine(g, type) {
  const owned = g.state.machines.filter((m) => m.type === type).length;
  const price = machinePrice(type, owned);
  if (g.state.machines.length >= MAX_MACHINES) return fail('設置スペースがありません · No space left in the garage');
  if (!g.spend(price)) return fail('お金が足りません · Not enough money');
  const used = new Set(g.state.machines.map((m) => m.slot));
  const slot = MACHINE_SLOTS.findIndex((_, i) => !used.has(i));
  const series = g.state.licenses[g.state.licenses.length - 1] || 'mochi';
  const data = { id: 'm' + Date.now().toString(36), type, slot, up: { speed: 0, cap: 0, coins: 0 }, stock: [], series };
  const startStock = Math.round(capacityFor(data) / 2);
  data.stock = Array(startStock).fill(series);
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
  g.news(`${MACHINE_TYPES[type].jp} 設置完了！`, `New machine installed: ${MACHINE_TYPES[type].name}`);
  g.save();
  return okr('設置しました');
}

export function buyRefill(g, series, count) {
  if (!g.state.licenses.includes(series)) return fail('取扱いがありません');
  const price = capsuleCost(series) * count;
  if (!g.spend(price)) return fail('お金が足りません · Not enough money');
  g.delivery.order({ type: 'refill', series, count, label: `${SERIES_BY_ID[series].jp} ×${count}` });
  g.save();
  return okr('ご注文ありがとうございます');
}

export function buyLicense(g, series) {
  if (g.state.licenses.includes(series)) return fail('取扱い中');
  if (discoveredCount(g) < licenseRequirement(series)) return fail(`図鑑 ${licenseRequirement(series)}種 以上が必要`);
  if (!g.spend(licensePrice(series))) return fail('お金が足りません · Not enough money');
  g.state.licenses.push(series);
  g.news(`🆕 ${SERIES_BY_ID[series].jp} 取扱開始！`, `You can now order ${SERIES_BY_ID[series].name} refills`);
  g.save();
  return okr('取扱開始！');
}

export function buyUpgrade(g, machine, kind) {
  const lvl = machine.data.up[kind] || 0;
  if (lvl >= UPGRADES[kind].max) return fail('MAX');
  const cost = upgradeCost(kind, lvl, machine.data.type);
  if (!g.spend(cost)) return fail('お金が足りません · Not enough money');
  machine.data.up[kind] = lvl + 1;
  machine.applyUpgrades(true);
  g.save();
  return okr('改造完了！');
}

export function buyOpener(g, tier) {
  if (g.state.opener >= tier) return fail('購入済み');
  if (tier > g.state.opener + 1) return fail('前のモデルが必要');
  if (!g.spend(OPENERS[tier].price)) return fail('お金が足りません · Not enough money');
  g.state.opener = tier;
  placeOpenerTool(g, true);
  g.news(`🔧 ${OPENERS[tier].jp}`, `${OPENERS[tier].name} — capsules open faster`);
  g.save();
  return okr('購入しました');
}

export function buyCharm(g, id) {
  if (g.state.charms.includes(id)) return fail('購入済み');
  if (!g.spend(CHARMS[id].price)) return fail('お金が足りません · Not enough money');
  g.state.charms.push(id);
  placeCharms(g, id);
  g.news(`⛩ ${CHARMS[id].jp}`, `${CHARMS[id].name}: ${CHARMS[id].desc}`);
  g.save();
  return okr('ご利益がありますように');
}

export function buyShelf(g) {
  const n = g.state.shelves.length;
  if (n >= SHELF_SLOTS.length) return fail('壁がいっぱい · No wall space');
  if (!g.spend(SHELF_PRICES[n])) return fail('お金が足りません · Not enough money');
  const data = { slot: n, items: Array(48).fill(null) };
  g.state.shelves.push(data);
  const sh = new GarageShelf(g, data);
  g.shelves.push(sh);
  sh.root.scale.set(1, 0.01, 1);
  g.tweens.add({ dur: 0.6, ease: ease.outBack, update: (k) => sh.root.scale.set(1, Math.max(0.01, k), 1) });
  audio.play('upgrade', { pos: sh.root.position });
  g.save();
  return okr('設置しました');
}

export function buySingle(g, key, finish = 'normal') {
  const price = singlePrice(key, finish);
  if (!g.spend(price)) return fail('お金が足りません · Not enough money');
  g.delivery.order({ type: 'single', key, finish, label: getItem(key)?.jp });
  g.save();
  return okr('ご注文ありがとうございます');
}

export function sellStored(g, k, n = 1) {
  const have = g.state.storage[k] || 0;
  if (!have) return fail('在庫なし');
  const take = Math.min(n, have);
  const [key, finish] = k.split('|');
  const v = itemValue(key, finish) * take;
  g.state.storage[k] = have - take;
  if (g.state.storage[k] <= 0) delete g.state.storage[k];
  g.addMoney(v);
  g.state.stats.sold += take;
  g.save();
  return okr(`+¥${v.toLocaleString()}`);
}

export function sellAllStored(g) {
  let total = 0, n = 0;
  for (const [k, c] of Object.entries(g.state.storage)) {
    const [key, finish] = k.split('|');
    total += itemValue(key, finish) * c; n += c;
  }
  if (!n) return fail('在庫なし');
  g.state.storage = {};
  g.addMoney(total);
  g.state.stats.sold += n;
  g.save();
  return okr(`${n}点 +¥${total.toLocaleString()}`);
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
  if (!n) return fail('ダブりなし · No duplicates on display');
  g.addMoney(total);
  g.state.stats.sold += n;
  g.save();
  return okr(`${n}点 +¥${total.toLocaleString()}`);
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
