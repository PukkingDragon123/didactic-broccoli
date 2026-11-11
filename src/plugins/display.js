// Machine-top POP displays (src/display/): machines come bare; buy a display top from Daikoku Toys (Shelves, displays
// & charms) or find a coupon in a capsule, carry the box to a machine, fit it, fill it with figures you own. A display
// full of the machine's own series draws customers to that machine (economy POP_DISPLAY) and people inside look up at it.
// Debug: dbg.display.give(style), .fit(i, style), .fill(i, n), .empty(i), .remove(i), .state(), .look(i)
import * as THREE from 'three';
import { PopDisplays, topBox } from '../display/index.js';
import { STYLE_IDS } from '../display/models.js';
import { POP_DISPLAY } from '../game/economy.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { MACHINE_SLOTS } from '../world/Garage.js';
import { makeItemMesh } from '../game/collectibles.js';

export function install(game) {
  let P;
  try { P = new PopDisplays(game); } catch (e) { console.warn('pop displays', e); return; }

  // ---- customers: a filled display draws people in, and draws them to its machine
  const hook = () => {
    const Ped = game.pedestrians;
    if (!Ped?.enterShop || !Ped.routeIn || Ped._popHooked) return !!Ped?._popHooked;
    Ped._popHooked = true;
    const enter = Ped.enterShop.bind(Ped), route = Ped.routeIn.bind(Ped);
    Ped.enterShop = (p) => {
      if (!p.wantsIn && (Ped.shopOpen?.() ?? true)) {
        const pull = game.machines.reduce((a, m) => a + P.draw(m), 0);
        if (pull > 0 && Math.random() < Math.min(POP_DISPLAY.visitMax, pull * POP_DISPLAY.visit)) { p.wantsIn = true; p.popDrawn = true; }
      }
      Ped._popPick = true;
      try { return enter(p); } finally { Ped._popPick = false; }
    };
    Ped.routeIn = (p, m) => {
      if (Ped._popPick && m) {
        // the shop front picked a free machine at random: weigh the free ones by their displays instead
        const free = game.machines.filter((x) => x === m || (Ped.machineOk?.(x) && !x.lidOpen && !Ped.userOf?.(x) && !(x._queue?.length) && !Ped.npcUsing?.(x)));
        if (free.length > 1 && free.some((x) => P.draw(x) > 0)) {
          const w = free.map((x) => P.weight(x)), tot = w.reduce((a, b) => a + b, 0);
          let r = Math.random() * tot;
          for (let i = 0; i < free.length; i++) { r -= w[i]; if (r <= 0) { m = free[i]; break; } }
        }
      }
      return route(p, m);
    };
    return true;
  };
  if (!hook()) { let n = 0; const t = setInterval(() => { if (hook() || ++n > 30) clearInterval(t); }, 1000); }

  // ---- debug helpers
  const dbg = {
    styles: STYLE_IDS,
    /** Order a display top from Daikoku Toys (pays like the order desk) and have it land by the shutter now. */
    buy(style = 'cube', fund = true) {
      let r = game.daikoku?.poptop?.(style);
      if (r && !r.ok && fund) { game.sim?.receiveDigital?.(5000, 'debug', { income: false }); r = game.daikoku.poptop(style); }
      if (!r?.ok) return r;
      const q = game.delivery.queue.findLast((e) => e.data.type === 'poptop');
      if (q) { game.delivery.remove(q); game.delivery.arrive(q.data); }
      return r;
    },
    /** A display top's box in your hands. */
    give(style = 'cube') {
      const data = topBox(style), mesh = game.delivery.meshFor(data);
      mesh.position.copy(game.camera.getWorldPosition(new THREE.Vector3()));
      game.scene.add(mesh);
      return game.held.take('box', data, mesh);
    },
    /** Fit a display on machine i straight away (no box). */
    fit(i = 0, style = 'cube') {
      const m = game.machines[i];
      if (!m) return false;
      P.s.fitted[P.idOf(m)] = { style, items: [] };
      P.attach(m);
      return P.of(m).items.length;
    },
    /** Fill machine i's display with n figures of its own series (one with a special finish). */
    fill(i = 0, n = 99, series = null) {
      const m = game.machines[i], L = P.live.get(m);
      if (!L) return 0;
      const S = SERIES_BY_ID[series || P.seriesOf(m)], items = S.items.filter((x) => x.rarity !== 'secret');
      const max = Math.min(n, L.rec.items.length);
      for (let k = 0; k < max; k++) { L.rec.items[k] = { k: items[k % items.length].key, f: k === 1 ? 'gold' : k === 3 ? 'metallic' : 'normal' }; P.showFig(L, k); }
      return max;
    },
    /** A figure of the machine's series in your hands, then clicked into machine i's display (the player's path). */
    put(i = 0, key = null, finish = 'normal') {
      const m = game.machines[i];
      key ||= SERIES_BY_ID[P.seriesOf(m)].items[0].key;
      const holder = new THREE.Group();
      holder.add(makeItemMesh(key, finish));
      holder.position.copy(game.camera.getWorldPosition(new THREE.Vector3()));
      game.scene.add(holder);
      game.held.take('toy', { key, finish }, holder);
      return P.machineUse(m, game.held.item);
    },
    empty(i = 0) { const L = P.live.get(game.machines[i]); if (!L) return 0; L.rec.items.fill(null); L.rec.items.forEach((_, k) => P.showFig(L, k)); return L.rec.items.length; },
    remove(i = 0) { const m = game.machines[i]; delete P.s.fitted[P.idOf(m)]; P.detach(m); return true; },
    state: () => JSON.parse(JSON.stringify(P.s)),
    draws: () => game.machines.map((m) => +P.draw(m).toFixed(2)),
    /** Stand in front of machine i, looking at its top. */
    look(i = 0, dist = 0.9, pitch = 0.1, side = 0) {
      const s = MACHINE_SLOTS[game.machines[i]?.data.slot ?? i];
      game.player.pos.set(s.x + dist, 0, s.z + side);
      game.player.yaw = Math.PI / 2 + Math.atan2(side, dist);
      game.player.pitch = pitch;
      game.player.vel.set(0, 0, 0);
    },
    /** Pick-weights a customer at the door would use now. */
    weights: () => game.machines.map((m) => +P.weight(m).toFixed(2)),
  };
  setTimeout(() => { if (game.debug) game.debug.display = dbg; }, 0);
}
