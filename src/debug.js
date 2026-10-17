// Debug / automated-test helpers (enabled with ?debug or ?autotest).
import * as THREE from 'three';
import { rollCapsule } from './game/economy.js';

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
    step(sec, dt = 1 / 60) { const n = Math.round(sec / dt); for (let i = 0; i < n; i++) game.update(dt); return game.time; },
    pc(page = 'top', mx = 320, my = 240) { game.pc.enter(); game.pc.site.booted = true; game.pc.site.page = page; game.pc.site.mouse.x = mx; game.pc.site.mouse.y = my; game.player.camBlend = 1; },
    lights(on) { game.garage.setLights(on); },
    state() { return JSON.parse(JSON.stringify({ money: game.state.money, pulls: game.state.pulls, held: game.held.item?.kind, machines: game.machines.map((m) => [m.state, m.data.stock.length]) })); },
  };
  game.debug = d;
  window.dbg = d;
}
