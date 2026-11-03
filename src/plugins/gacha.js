// Gacha corner extras: capsule shells as litter, interactive toys, figure packaging and acrylic stands, the held-item
// hooks they need, and debug helpers (game.gachaDebug). See src/game/shells.js, toys.js, packaging.js.
import * as THREE from 'three';
import { GachaMachine } from '../game/GachaMachine.js';
import { MACHINE_SLOTS } from '../world/Garage.js';
import { capacityFor } from '../game/economy.js';
import { openBoxStep } from '../game/capsuleBox.js';
import { SERIES_BY_ID } from '../data/series/index.js';

let extras = [];
try { extras = Object.values(import.meta.glob('../game/{shells,toys,packaging}.js', { eager: true })); } catch { /* none yet */ }

export function install(game) {
  for (const m of extras) m.installInto?.(game);
  cartonHooks(game);
  game.gachaDebug = debugHelpers(game);
}

/** A capsule carton in your hands: open it anywhere, one step per click (tape, then flaps). */
function cartonHooks(g) {
  const H = g.held;
  const isCarton = (it) => it?.kind === 'box' && it.data?.type === 'refill';
  const hint = H.hint.bind(H), primary = H.primary.bind(H);
  H.hint = () => {
    const it = H.item;
    if (!isCarton(it) || H.busy) return hint();
    const name = SERIES_BY_ID[it.data.series]?.name || '';
    const st = it.data.stage ?? 0;
    if (st === 0) return { key: 'LMB', text: 'Cut the tape', sub: `${name} x${it.data.count} · or take it to a machine` };
    if (st === 1) return { key: 'LMB', text: 'Fold the flaps open', sub: `${name} x${it.data.count}` };
    return { key: 'Q', text: `${name} x${it.data.count}`, sub: 'Take it to a machine and lift the lid' };
  };
  H.primary = () => {
    const it = H.item;
    if (isCarton(it) && !H.busy && (it.data.stage ?? 0) < 2) { openBoxStep(it, g.camera.getWorldPosition(new THREE.Vector3())); return; }
    primary();
  };
}

function debugHelpers(g) {
  return {
    /** Put one machine of each type (or `types`) in the first free slots, filled with `series`. */
    setup(types = ['retro', 'standard', 'deluxe', 'royal'], series = 'mochi', fill = 0.7) {
      for (const m of [...g.machines]) { m.dispose(); }
      g.machines.length = 0;
      g.state.machines = [];
      types.forEach((type, i) => {
        const data = { id: 'dbg' + i, type, slot: i, up: { speed: 0, cap: 0, coins: 0 }, stock: [], series, price: undefined, cash: 0 };
        data.stock = Array(Math.round(capacityFor({ type }) * fill)).fill(series);
        g.state.machines.push(data);
        g.machines.push(new GachaMachine(g, data));
      });
      g.garage?.setLights?.(true);
      return g.machines.length;
    },
    /** Stand in front of machine i (looking at it). */
    look(i = 0, dist = 0.95, pitch = -0.25, side = 0) {
      const s = MACHINE_SLOTS[g.machines[i]?.data.slot ?? i];
      g.player.pos.set(s.x + dist, 0, s.z + side);
      g.player.yaw = Math.PI / 2 + Math.atan2(side, dist) * 0;
      g.player.pitch = pitch;
      g.player.vel.set(0, 0, 0);
    },
    /** Hand the player a capsule carton. */
    carton(series = 'mochi', count = 20, stage = 0) {
      const data = { type: 'refill', series, count, stage };
      const mesh = g.delivery.meshFor(data);
      mesh.position.copy(g.camera.getWorldPosition(new THREE.Vector3()));
      g.scene.add(mesh);
      return g.held.take('box', data, mesh);
    },
    /** n customer turns on machine i. */
    customers(i = 0, n = 3) { const m = g.machines[i]; const out = []; for (let k = 0; k < n; k++) { m.state = 'idle'; m.spin = null; out.push(m.customerPlay()); } return out; },
  };
}
