// Debug / automated-test helpers (enabled with ?debug or ?autotest).
import * as THREE from 'three';
import { rollCapsule } from './game/economy.js';
import { ITEMS } from './data/series/index.js';

export function installDebug(game, params) {
  if (params.get('q')) game.renderer.setQuality(params.get('q'));
  if (params.has('autotest')) {
    game.input.locked = true; // pretend pointer lock so every system runs headless
    document.getElementById('title').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
  }
  const d = {
    view(x, z, yaw = 0, pitch = 0) {
      game.player.pos.set(x, 0, z);
      game.player.yaw = yaw; game.player.pitch = pitch;
      game.player.vel.set(0, 0, 0);
    },
    money(n) { game.addMoney(n); },
    capsule(series = 'mochi', rarity = null, finish = null) {
      let roll;
      for (let i = 0; i < 5000; i++) { roll = rollCapsule(series, Math.random); if ((!rarity || roll.rarity === rarity)) break; }
      const data = { series, key: roll.key, finish: finish || roll.finish, rarity: roll.rarity };
      const p = game.camera.getWorldPosition(new THREE.Vector3());
      const ent = game.items.spawnCapsule(data, p.add(new THREE.Vector3(0, -0.2, -0.3)));
      game.items.pickUp(ent);
      return data;
    },
    open() { const it = game.held.item; if (it?.kind === 'capsule') game.reveal.open(it); },
    insert(i = 0) { game.machines[i].insertCoin(); },
    crank(i = 0) { const m = game.machines[i]; if (m.state === 'ready') m.startMotor(); },
    /** fast-forward the simulation without rendering */
    step(sec, dt = 1 / 60) { const n = Math.round(sec / dt); for (let i = 0; i < n; i++) { game.update(dt); game.scene.updateMatrixWorld(); } return game.time; },
    pc(page = 'top', mx = 320, my = 240) { game.pc.enter(); game.pc.site.booted = true; game.pc.site.page = page; game.pc.site.mouse.x = mx; game.pc.site.mouse.y = my; game.player.camBlend = 1; },
    museum(fill = true) {
      game.state.completed.mochi = true;
      game.addMoney(200000);
      const M = game.museum;
      if (!M.data.owned) M.buyMuseum();
      if (!fill) return;
      const all = ITEMS.map((it) => it.key);
      {
        const place = (kind, id, x, z, rot = 0) => {
          const data = { uid: 'dbg' + Math.random().toString(36).slice(2), kind, id, x, z, rot, items: null };
          M.data.placed.push(data);
          const e = M.spawnPlaced(data, false);
          if (e?.display) e.display.items.forEach((_, i) => { const k = all[Math.floor(Math.random() * all.length)]; e.display.items[i] = { k, f: Math.random() < 0.2 ? 'gold' : 'normal' }; e.display.showItem(i, e.display.items[i], false); });
        };
        place('display', 'cabinet_tall', -4.25, -6.0, 1);
        place('display', 'hinadan', -3.25, -9.0, 1);
        place('display', 'pedestal', 0, -8.5, 0);
        place('display', 'case_glass', 2.0, -6.5, 2);
        place('display', 'space_pod', 3.5, -10.0, 3);
        place('display', 'diorama_table', -2.75, -13.0, 0);
        place('display', 'capsule_tower', 4.25, -7.25, 3);
        place('decor', 'sakura_tree', -3.5, -11.0, 0);
        place('decor', 'stone_lantern', -1.25, -10.75, 0);
        place('decor', 'lollipop', 4.25, -12.25, 0);
        place('decor', 'rocket', 4.0, -13.75, 0);
        place('decor', 'plant_monstera', 1.75, -5.75, 0);
        M.data.floor['1,3'] = 'grass'; M.data.floor['2,3'] = 'grass'; M.data.floor['1,4'] = 'grass';
        for (let i = 6; i < 10; i++) for (let j = 3; j < 8; j++) M.data.floor[i + ',' + j] = 'space';
        M.data.walls['E:3'] = 'cosmos'; M.data.walls['E:4'] = 'cosmos'; M.data.walls['E:5'] = 'cosmos'; M.data.walls['W:5'] = 'sakura'; M.data.walls['W:6'] = 'sakura';
        M.rebuildSurfaces();
        M.recompute();
        for (let i = 0; i < 10; i++) M.visitors.spawn();
      }
    },
    lights(on) { game.garage.setLights(on); },
    state() { return JSON.parse(JSON.stringify({ money: game.state.money, pulls: game.state.pulls, held: game.held.item?.kind, machines: game.machines.map((m) => [m.state, m.data.stock.length]) })); },
  };
  game.debug = d;
  window.dbg = d;
}
