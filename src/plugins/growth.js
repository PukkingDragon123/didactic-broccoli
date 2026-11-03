// Growing the home and the shop (game.growth, src/growth/): Ota Real Estate's listings on the computer and at Mrs. Ota's
// gate, paper contracts, leases and mortgages as monthly bills; flat 103 next door (kitchen, bath, hobby room:
// src/places/room/Extension.js), the old tobacco shop renovated into the shop annex (src/growth/annex/), and GACHA
// KAIKAN, the four-floor capsule-toy department store by the station with escalators and a lift (src/growth/mall/).
// Installs after the places (src/plugins/needs.js builds game.places in a late step of its own).
// Debug / tests: window.dbg.growth (see below).
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { Growth } from '../growth/Growth.js';
import { installEstateSite } from '../growth/site.js';
import { Extension } from '../places/room/Extension.js';
import { Annex, ANNEX_STEPS } from '../growth/annex/Annex.js';
import { Mall } from '../growth/mall/Mall.js';
import { LISTING } from '../growth/data.js';
import { GAPS } from '../growth/mall/layout.js';
import { closePaper } from '../growth/paper.js';
import { ITEMS } from '../data/series/index.js';
import '../growth/sfx.js';

export function install(game) {
  if (game.visiting) return;
  // twice deferred: needs.js queues its late step while the plugins install, ours goes in after it
  Game.late.push(() => { Game.late.push(lateInstall); });
}

function lateInstall(game) {
  const g = game;
  if (!g.places || g.growth) return;
  const G = new Growth(g);
  const make = (name, fn) => { try { return fn(); } catch (e) { console.error(`growth: ${name} failed`, e); return null; } };
  make('site', () => installEstateSite(g, G));
  G.defineAchievements();
  G.hookOta();
  const t0 = performance.now();
  G.home = g.places.home103 = make('flat 103', () => new Extension(g, g.places));
  const t1 = performance.now();
  G.annex = make('annex', () => new Annex(g, G));
  const t2 = performance.now();
  G.mall = make('kaikan', () => new Mall(g, G));
  G.buildMs = { home: Math.round(t1 - t0), annex: Math.round(t2 - t1), kaikan: Math.round(performance.now() - t2) };
  G.mailNew();
  let last = g.clock?.stamp ?? 0;
  Game.updaters.push((gg, dt) => {
    G.mall?.update(dt);
    G.annex?.updateLane(dt);
    // shop time going by: the annex's and the Kaikan's customers while you're not looking
    const now = gg.clock?.stamp ?? 0, dm = now - last;
    last = now;
    if (dm > 0 && dm <= 240) { G.annex?.simulate(dm); G.mall?.simulate(dm); }
  });
  g.growthDebug = debug(g, G);
  setTimeout(() => { if (g.debug) g.debug.growth = g.growthDebug; }, 0);
}

// ------------------------------------------------------------------ debug / tests (window.dbg.growth)
function debug(g, G) {
  const P = () => g.places;
  const D = {
    G,
    /** Shop level (default high enough for everything). */
    level(n = 30) { const p = g.progress; if (p && p.level < n) { p.s.level = n; p.s.xp = 0; g.events.emit('levelUp', { level: n, unlocks: [] }); } return p?.level; },
    bank(n = 10000000) { g.wallet?.addBank?.(n, 'test'); return g.wallet?.bank; },
    status() { return Object.fromEntries(Object.keys(LISTING).map((id) => [id, G.status(id).state])); },
    /** Hand a property over without the paperwork. */
    own(...ids) { for (const id of ids) G.complete(id); return D.status(); },
    /** The real thing: the contract comes up (stamp it with dbg.growth.stamp()). */
    apply(id) { G.apply(id).then((ok) => { D.last = ok; }); return true; },
    stamp() { document.querySelector('#growth-paper [data-v="ok"]')?.click(); return true; },
    close: () => closePaper(),
    /** Go somewhere (instantly): 'room' 'home103' 'annex' 'mall1'..'mall4' or null (the lane). x, z zone-local. */
    go(where, x = null, z = null, yaw = null, pitch = -0.05) {
      G.mall?.cancelRide();
      if (where === null) { P().setWhere(null); return null; }
      if (/^mall\d$/.test(where)) G.mall.ensureFloor(+where.slice(4));
      if (where === 'annex') G.annex.build();
      if (where === 'home103') G.home.build();
      P().setWhere(where);
      const zone = { home103: G.home?.zone, annex: G.annex?.zone, ...Object.fromEntries([1, 2, 3, 4].map((n) => ['mall' + n, G.mall?.zones[n]])) }[where];
      const d = P().list[where];
      const pl = g.player;
      if (zone && x !== null) pl.pos.copy(zone.L(x, 0, z)); else pl.pos.set(d.spawn.x, 0, d.spawn.z);
      pl.yaw = yaw ?? d.spawn.yaw ?? 0; pl.pitch = pitch; pl.vel.set(0, 0, 0); pl.eye = 1.58;
      return where;
    },
    /** Finish the annex renovation up to step n (0..5: 5 = open). */
    annex(n = 5) {
      const A = G.annex, t = A.s.tasks;
      if (!G.has('annex')) G.complete('annex');
      const ids = ANNEX_STEPS.map((s) => s.id);
      for (let i = 0; i < Math.min(n, 4); i++) { t[ids[i]] = t[ids[i]].map(() => true); }
      A.s.step = Math.min(n, 4);
      if (n >= 1) t.bagsOut = 6;
      if (n >= 5) { A.s.open = true; A.s.step = 5; }
      A.apply();
      return A.step;
    },
    /** Machines in every free spot of a zone ('annex', 'mall1'..), stocked. */
    fill(key = 'annex', type = 'standard', series = 'mochi', frac = 0.8) {
      const S = key === 'annex' ? (G.annex.build(), G.annex.spots) : (G.mall.ensureFloor(+key.slice(4)), G.mall.spots[+key.slice(4)]);
      S.ensureBuilt();
      const types = Array.isArray(type) ? type : [type];
      for (const i of S.free()) {
        const ty = types[i % types.length];
        const d = { id: `t${key}${i}`, type: ty, slot: i, stock: [], series, price: 200, cash: Math.round(Math.random() * 6) * 100 };
        const cap = { retro: 10, standard: 16, deluxe: 24, royal: 36 }[ty] || 16;
        d.stock = Array(Math.round(cap * frac)).fill(series);
        S.data.push(d);
        S.spawn(d);
      }
      S.refreshMarkers();
      return S.list.length;
    },
    /** Pretend you've pulled n different figures (the hobby room's cabinet). */
    discover(n = 70) { const d = g.state.discovered ||= {}; for (let i = 0; i < ITEMS.length && i < n * 3; i += 3) d[ITEMS[i].key] = 1; if (G.home) G.home.cabN = -1; return Object.keys(d).length; },
    crowd(n = 1, k = 8) { G.mall.ensureFloor(n); const C = G.mall.crowds[n]; C.max = Math.max(C.max, k); C.prefill(k); return C.count; },
    annexCrowd(k = 3) { G.annex.build(); G.annex.crowd.prefill(k); return G.annex.crowd.count; },
    /** Ride an escalator from where it starts. */
    ride(gap = 1, lane = 'up') {
      const M = G.mall, Gp = GAPS[gap];
      D.go('mall' + (lane === 'up' ? gap : gap + 1), lane === 'up' ? Gp.up : Gp.down, lane === 'up' ? Gp.z0 - Gp.dir * 0.4 : Gp.z1 + Gp.dir * 0.4, lane === 'up' ? (Gp.dir > 0 ? Math.PI : 0) : (Gp.dir > 0 ? 0 : Math.PI));
      M.startRide(gap, lane);
      return !!M.ride;
    },
    rideState() { const R = G.mall.ride; return R ? { u: +R.u.toFixed(2), swapped: R.swapped, where: P().where, eye: +g.player.eye.toFixed(2) } : { where: P().where, eye: g.player.eye }; },
    /** Stand in the lift on floor n, press k. */
    lift(n = 1, k = 2) {
      const E = G.mall.elevator;
      D.go('mall' + n, -11.8, 0.0, -Math.PI / 2, -0.05);
      E.car.floor = n; E.car.k = 1; E.car.state = 'open'; E.car.t = 0;
      E.press(k);
      return E.car.state;
    },
    liftState() { const c = G.mall.elevator.car; return { floor: c.floor, state: c.state, k: +c.k.toFixed(2), target: c.target, where: P().where }; },
    /** Simulate n hours of shop time away from the annex / Kaikan. */
    sim(hours = 2) { for (let i = 0; i < hours * 6; i++) { G.annex?.simulate(10); G.mall?.simulate(10); } return { annex: G.annex.spots?.totals() || null, mall: [1, 2, 3, 4].map((n) => G.mall.spots[n]?.totals() || null), commission: Math.round(G.mall.s.commission), today: G.mall.s.today }; },
    bills() { return g.bills?.list().filter((b) => /lease103|annexLoan|mallLoan|mallFees/.test(b.kind)).map((b) => [b.name, b.amount, b.status]); },
    look(x, y, z) { const v = new THREE.Vector3(x, y, z); g.camera.lookAt(v); return true; },
  };
  return D;
}
