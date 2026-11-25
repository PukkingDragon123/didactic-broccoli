// Grandpa's garage, lived in for forty years: the dressing round the edges of the shop that the player never has to
// buy, all real models (src/data/props/garage_lp.js, lowpix conversions; credits in CREDITS.md). The middle of the floor,
// the machine slots, the wall shelves' slots and the walls' attach zones stay free for what you build: everything here
// is in a corner, under the work table or high on the back wall (ATTACH.wallBlock in src/world/Garage.js lists it).
//   front-left corner   his workbench: tin toys he was fixing, screw jars, the old radio, a toolbox, a jar shelf on the
//                       wall over it, a hanging work lamp, a stool, the tool chest underneath, and three of his figures
//   the work table      boxes of toys and a crate of capsules on its low shelf
//   the back wall       his kamidana (the shelf your lucky charms stand on, src/game/shop.js), a bucket by the sink
//   the right wall      the old electric fan and crates of capsule stock in the gaps between the wall shelves' slots;
//                       a jar shelf, the calendar and a mirror by the sell box, posters between the slots, a steel
//                       shelving unit of boxed stock and the old tyres in the front corner, his jacket on the pier
//   the left wall       stock (cartons, jars, bottles, toy boxes, cup noodles) on plank shelves over the machine row,
//                       his bicycle hung over the workbench
//   the ceiling         bare bulbs on their flexes; the corners: a rice sack, Mikan's cardboard bed by the heater
// Drawn through the town's prop instancer (one InstancedMesh per model, culled to the view), like src/plugins/worldDressing.js.
// Debug (with ?debug / ?autotest): dbg.garage.charms(['maneki', 'daruma', ...]) puts charms on the kamidana.
import * as THREE from 'three';
import { hasProp, maskPropMaterials } from '../world/props.js';
import { GARAGE } from '../world/Garage.js';
import { printHas, printRegionTexture } from '../gfx/printAtlas.js';
import { ensureKamidana, placeCharms } from '../game/shop.js';
import { makeItemMesh } from '../game/collectibles.js';
import { ITEMS } from '../data/series/index.js';
import { isLowpix } from '../figures/lowpix.js';

const H = Math.PI / 2;
// the workbench along the left wall in the front corner (top at 0.8 m), clear of the pink phone, the customers' way to
// the machines and the umbrella stand by the shutter
const BENCH = { x: -3.7, z: 3.62, top: 0.8 };
const S = 1.975; // the left wall's plank shelves (src/world/GarageDetail.js dressing)
// [prop id, x, y, z, ry, opts?] (opts: block (the player bumps into it), shadow)
const PIECES = [
  ['gg_workbench', BENCH.x, 0, BENCH.z, H, { block: true, shadow: true }],
  ['gg_tool_chest', -3.74, 0, 3.8, H, { shadow: true }],
  ['gg_toolbox', -3.775, BENCH.top, 3.86, H, { shadow: true }],
  ['gg_radio', -3.84, BENCH.top, 3.25, H],
  ['gg_screw_jars', -3.86, BENCH.top, 3.52, 0.3],
  ['gg_tin_robot', -3.55, BENCH.top, 3.3, H - 0.4],
  ['gg_tin_train', -3.6, BENCH.top, 3.58, 0.3],
  ['gg_plant_small', -3.82, BENCH.top, 4.19, 0.5],
  ['gg_jar_shelf', -3.892, 1.42, 3.85, H],
  ['gg_work_lamp', -3.15, 3.2 - 0.95, 3.6, 0.4],
  ['gg_stool', -3.12, 0, 3.45, 0.35, { block: true, shadow: true }],
  ['gg_bucket', 1.85, 0, -4.72, 0.4, { block: true }],
  // along the right wall in the gaps between the wall shelves' slots (src/world/Garage.js SHELF_SLOTS, 1.3 m each):
  // the old electric fan, and two crates of capsule stock
  ['gg_fan', 3.66, 0, 2.15, -H + 0.25, { block: true, shadow: true }],
  ['gg_crate', 3.83, 0, 0.35, 0.04, { block: true }],
  ['gg_crate', 3.83, 0.264, 0.36, -0.06],
  // ---- round 3: every wall run dressed at eye level, the ceiling, the corners
  // left wall: his bicycle hung over the workbench, stock on the plank shelves over the machine row (board top 1.975)
  ['gg_bicycle', -3.744, 2.02, 3.9, H],
  ['gg_carton', -3.87, S, -4.25, H], ['gg_screw_jars', -3.86, S, -3.98, 0.2], ['gg_screw_jars', -3.85, S, -3.82, -0.4],
  ['gg_puff', -3.87, S, -3.64, H],
  ['gg_bottle', -3.86, S, -3.16, 0.3], ['gg_bottle', -3.86, S, -3.07, -0.5], ['gg_bottle', -3.85, S, -2.98, 1.2],
  ['gg_toy_box', -3.88, S, -2.62, H], ['gg_carton', -3.87, S, -2.2, H + 0.1], ['gg_noodle', -3.86, S, -1.9, 0.4], ['gg_noodle', -3.86, S, -1.77, -0.3],
  // right wall: a jar shelf and a mirror by the sell box; the steel shelving unit of boxed stock in the front corner,
  // the old tyres and the fire alarm beside it; his jacket on the front pier with the hand truck and a jerrycan
  ['gg_jar_shelf', 3.892, 1.25, -2.75, -H],
  ['gg_mirror', 3.98, 1.1, -1.6, -H],
  ['gg_shelf_unit', 3.73, 0, 4.7, -H, { block: true, shadow: true }],
  ['gg_crate2', 3.735, 0.15, 4.7, -H], ['gg_toy_box', 3.755, 0.6, 4.58, -H], ['gg_puff', 3.735, 0.6, 4.86, -H + 0.2],
  ['gg_boxes', 3.745, 1.1, 4.7, -H], ['gg_crate', 3.735, 1.55, 4.58, -H], ['gg_carton', 3.755, 1.55, 4.86, -H],
  ['gg_box', 3.745, 2.0, 4.6, -H + 0.1], ['gg_cap', 3.735, 2.3, 4.6, 0.6], // (his cap on the top box)
  ['gg_tyres', 3.62, 0, 4.05, 0.3, { block: true, shadow: true, scale: 0.9 }],
  ['lp_fire_alarm', 3.97, 1.45, 3.95, -H],
  ['gg_jacket', 3.83, 1.05, 2.15, -H], // (on a hook over the old fan)
  ['lp_hand_truck', -2.65, 0, 4.6, 0.1, { block: true, shadow: true }],
  ['lp_jerrycan_metal', 3.33, 0, 4.8, H, { shadow: true }],
  ['lp_dustpan', 3.05, 0, 3.95, 0.4],
  // back wall: the dartboard over the PC desk's end (the poster beside it is a print, below)
  ['gg_dartboard', 3.15, 1.92, -4.975, 0],
  // the ceiling: bare bulbs on their flexes
  ['gg_bulb', -2.95, 2.7, -1.95, 0], ['gg_bulb', 2.95, 2.7, -2.0, 0.7], ['gg_bulb', -1.3, 2.7, 4.35, 1.4],
  // the corners: a sack of rice by the workbench, Mikan's cardboard bed by the heater
  ['gg_sack', -3.1, 0, 4.45, 0.5, { block: true }],
  ['gg_cat_bed', -1.55, 0, 1.75, 0.2],
];
// printed things on the walls (the baked print sheets, src/gfx/printAtlas.js): [sheet, key, face, u, y (centre), w, h, tilt]
const PRINTS = [
  ['shop', 'mk:calendar', '-x', -2.1, 1.47, 0.36, 0.54, 0.01], // April 1999, the cherry blossom month
  ['shop', 'mk:poster1', '-x', 0.35, 1.42, 0.4, 0.6, -0.015], // the ice cream poster
  ['shop', 'mk:poster5', '+z', 1.62, 1.68, 0.3, 0.45, 0.012], // the kaiju film, over the fridge
  ['lane', 'lane:travel:0', '+z', 2.1, 2.15, 0.4, 0.6, 0.01], // a railway travel poster over the sink
];
// three of his figures on the front of the bench (real figure models: the first lowpix one of each series)
const FIGURE_SERIES = ['tabigame', 'kanikan', 'sento'];
const FIGURE_SPOTS = [[-3.5, 3.74, H - 0.3], [-3.48, 3.9, H], [-3.52, 4.05, H + 0.35]];

export function install(game) {
  const town = game.garage?.town;
  if (town?.prop) {
    const shadowed = new Set();
    for (const [id, x, y, z, ry, o = {}] of PIECES) {
      if (!hasProp(id)) continue;
      town.prop(id, x, y, z, ry, o);
      if (o.shadow) shadowed.add('props:' + id);
    }
    town.flushProps();
    town.group.traverse((o) => { if (o.isInstancedMesh && shadowed.has(o.name)) o.castShadow = true; });
    maskPropMaterials(town.group);
  }
  try { ensureKamidana(game); } catch (e) { console.warn('garageDressing: kamidana', e); }
  // the prints: flat sheets a few millimetres off the wall
  const G = game.garage;
  if (G?.group) for (const [sheet, key, face, u, y, w, h, tilt] of PRINTS) {
    if (!printHas(sheet, key)) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: printRegionTexture(sheet, key), roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    if (face === '-x') { m.position.set(GARAGE.maxX - 0.004, y, u); m.rotation.y = -Math.PI / 2; }
    else if (face === '+x') { m.position.set(GARAGE.minX + 0.004, y, u); m.rotation.y = Math.PI / 2; }
    else { m.position.set(u, y, GARAGE.minZ + 0.004); }
    m.rotateZ(tilt);
    m.receiveShadow = true;
    m.name = 'garage-print:' + key;
    G.group.add(m);
  }
  // the figures
  const group = game.garage?.group;
  if (group) FIGURE_SERIES.forEach((sid, i) => {
    const it = ITEMS.find((x) => x.key.startsWith(sid + '/') && isLowpix(x));
    if (!it) return;
    try {
      const m = makeItemMesh(it.key);
      const [x, z, ry] = FIGURE_SPOTS[i];
      m.position.set(x, BENCH.top, z);
      m.rotation.y = ry;
      m.name = 'grandpa-figure';
      group.add(m);
    } catch (e) { console.warn('garageDressing: figure', it.key, e); }
  });
  const helpers = { charms(ids = ['maneki', 'daruma', 'omamori', 'goldneko']) { for (const id of ids) if (!game.state.charms.includes(id)) game.state.charms.push(id); placeCharms(game); return game.state.charms; } };
  let tries = 0;
  const attach = () => { if (game.debug) { game.debug.garage = helpers; return; } if (++tries < 50) setTimeout(attach, 200); };
  setTimeout(attach, 0);
}
