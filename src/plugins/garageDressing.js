// Grandpa's garage, lived in for forty years: the dressing round the edges of the shop that the player never has to
// buy, all real models (src/data/props/garage_lp.js, lowpix conversions; credits in CREDITS.md). The middle of the floor,
// the machine slots, the wall shelves' slots and the walls' attach zones stay free for what you build: everything here
// is in a corner, under the work table or high on the back wall (ATTACH.wallBlock in src/world/Garage.js lists it).
//   front-left corner   his workbench: tin toys he was fixing, screw jars, the old radio, a toolbox, a jar shelf on the
//                       wall over it, a hanging work lamp, a stool, the tool chest underneath, and three of his figures
//   the work table      boxes of toys and a crate of capsules on its low shelf
//   the back wall       his kamidana (the shelf your lucky charms stand on, src/game/shop.js), a bucket by the sink
//   the right wall      the old electric fan and crates of capsule stock in the gaps between the wall shelves' slots
// Drawn through the town's prop instancer (one InstancedMesh per model, culled to the view), like src/plugins/worldDressing.js.
// Debug (with ?debug / ?autotest): dbg.garage.charms(['maneki', 'daruma', ...]) puts charms on the kamidana.
import { hasProp, maskPropMaterials } from '../world/props.js';
import { ensureKamidana, placeCharms } from '../game/shop.js';
import { makeItemMesh } from '../game/collectibles.js';
import { ITEMS } from '../data/series/index.js';
import { isLowpix } from '../figures/lowpix.js';

const H = Math.PI / 2;
// the workbench along the left wall in the front corner (top at 0.8 m), clear of the pink phone, the customers' way to
// the machines and the umbrella stand by the shutter
const BENCH = { x: -3.7, z: 3.62, top: 0.8 };
const T = 0.1925; // the work table's low shelf (src/world/Garage.js buildFurniture)
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
  ['gg_work_lamp', -3.5, 3.2 - 0.95, 3.55, 0.4],
  ['gg_stool', -3.12, 0, 3.45, 0.35, { block: true, shadow: true }],
  ['gg_toy_box', -0.4, T, 0.12, 0.08],
  ['gg_crate', 0.15, T, 0.1, H],
  ['gg_bundle', 0.65, T, 0.12, 0.1],
  ['gg_bucket', 1.85, 0, -4.72, 0.4, { block: true }],
  // along the right wall in the gaps between the wall shelves' slots (src/world/Garage.js SHELF_SLOTS, 1.3 m each):
  // the old electric fan, and two crates of capsule stock
  ['gg_fan', 3.72, 0, 2.15, -H + 0.25, { block: true, shadow: true }],
  ['gg_crate', 3.83, 0, 0.35, 0.04, { block: true }],
  ['gg_crate', 3.83, 0.264, 0.36, -0.06],
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
