// Daily needs and the places you go: your energy and appetite (game.needs, src/needs/), eating and drinking from your
// hands, and the places around the lane (game.places, src/places/): Mikawa-ya run for real (physical goods, the old man,
// cashier shifts), the working vending machines, the ramen shop (and its sink), your room at Sakura Heights, potted
// plants, and the pigeons' contribution to the neighbourhood. Installs after every other plugin (it uses game.talk,
// game.lane, game.monologue, the sim HUD).
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { Needs } from '../needs/Needs.js';
import { installEating, consumeHeld } from '../needs/eat.js'; // (registers the food tools before the save loads)
import { FOODS } from '../needs/foods.js';
import { Places } from '../places/Places.js';
import { Mikawaya } from '../places/mikawaya/Mikawaya.js';
import { Vending } from '../places/vending/Vending.js';
import { Ramen } from '../places/ramen/Ramen.js';
import { Room } from '../places/room/Room.js';
import { Plants } from '../places/plants.js';
import { Droppings } from '../places/pigeons.js';
import { makeToolMesh } from '../game/Held.js';

export function install(game) {
  if (game.visiting) return;
  Game.late.push(lateInstall); // runs after the rest of the plugins (people, sim)
}

function lateInstall(game) {
  const g = game;
  new Needs(g);
  installEating(g);
  const places = new Places(g);
  const tryMake = (name, fn) => { try { return fn(); } catch (e) { console.error(`places: ${name} failed`, e); return null; } };
  places.mikawaya = tryMake('mikawaya', () => new Mikawaya(g, places));
  places.vending = tryMake('vending', () => new Vending(g, places));
  places.ramen = tryMake('ramen', () => new Ramen(g, places));
  places.room = tryMake('room', () => new Room(g, places));
  places.plants = tryMake('plants', () => new Plants(g, places));
  places.pigeons = tryMake('pigeons', () => new Droppings(g, places));
  Game.updaters.push((gg, dt) => {
    places.mikawaya?.update(dt);
    places.vending?.update(dt);
    places.ramen?.update(dt);
    places.room?.update(dt);
    places.plants?.update(dt);
    places.pigeons?.update(dt);
  });
  wrapSummary(g, places);
  benches(g, places);
  g.needsDebug = debug(g, places);
  setTimeout(() => { if (g.debug) g.debug.needs = g.needsDebug; }, 0);
}

/** The end-of-day fly-out starts from where you stand: when you're in a room off the lane, step out first (and going to
 *  bed in your own room plays the bedroom version: src/places/room/Room.js). */
function wrapSummary(g, places) {
  const sim = g.sim;
  if (!sim || sim._placesWrapped) return;
  sim._placesWrapped = true;
  const orig = sim.onSummary;
  sim.onSummary = (data) => {
    if (places.where === 'room' && data.reason === 'sleep' && places.room?.sleepSummary) { places.room.sleepSummary(data); return; }
    if (places.where) places.exit({ instant: true });
    orig?.(data);
  };
}

/** The bench out front of the shop (Town.js, shown while the shop is open): sit and rest your legs. */
function benches(g, places) {
  const town = g.garage.town;
  const hb = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.42), new THREE.MeshBasicMaterial({ visible: false }));
  hb.position.set(2.75, 0.25, 5.52);
  g.scene.add(hb);
  g.interaction.add(hb, {
    reach: 2.2,
    hint: () => (places.seat || town?.shop?.openG?.visible === false ? null : { key: 'LMB', text: 'Sit on the bench', sub: 'Rest your legs: energy comes back slowly (walk to stand up)' }),
    use: () => { places.sitAt({ pos: new THREE.Vector3(2.75, 0, 5.66), yaw: Math.PI, eye: 1.05, rest: 1.1 }); return false; },
  });
}

// ------------------------------------------------------------------ debug / tests (window.dbg.needs)
function debug(g, places) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  return {
    state: () => g.needs.snapshot(),
    energy(n) { g.needs.s.energy = n; return g.needs.snapshot(); },
    drunk(n) { g.needs.s.drunk = n; g.needs.s.peak = Math.max(g.needs.s.peak, n); return g.needs.snapshot(); },
    /** Put a food / drink in your hands. */
    give(id) { const obj = makeToolMesh(id); obj.position.copy(g.camera.localToWorld(V(0.1, -0.2, -0.4))); g.scene.add(obj); return g.held.take('tool', { id }, obj); },
    eat(id) { if (id) this.give(id); return consumeHeld(g); },
    consume(id) { return !!g.needs.consume(id); },
    foods: () => Object.keys(FOODS),
    where: () => places.where,
    enter(id) { places.setWhere(id); const d = places.list[id]; g.player.pos.set(d.spawn.x, 0, d.spawn.z); g.player.yaw = d.spawn.yaw ?? 0; return id; },
    exit() { places.exit({ instant: true }); return places.where; },
    vend(i = 0, sel = 0) { const V2 = places.vending, m = V2.list[i]; V2.sel = sel; V2.open(m); g.player.camBlend = 1; return m.id; },
    places,
  };
}
