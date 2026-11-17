// Model-only props: real models (Poly Haven CC0, Sketchfab CC BY) converted to the game's pixel-art style with lowpix
// (art/lowpix/world/world.json -> tools/lowpix-world.mjs -> public/models/lowpix/world/<id>.glb, credits in CREDITS.md).
// No voxel build: src/world/props.js sizes each by `asset.h` (height, m) or `asset.size`, else the model's own metres.
// These are the ones the lane and the shop are dressed with at boot (src/plugins/worldDressing.js), so they load with
// the prop library; the furniture catalogue and the interiors load theirs on demand (src/build/models.js, the plugin).
const M = (id, o = {}) => ({ asset: { id: 'lowpix/world/' + id, ...o } });

export default {
  // ---------------------------------------------------------------- the lane
  lp_bicycle_old: M('bicycle_old', { h: 1.0 }),
  lp_scooter: { asset: { id: 'lowpix/world_arch/scooter', h: 1.05 } }, // hand-made (art/lowpix/world_arch), the AI source is gone
  lp_gas_cylinder: M('gas_cylinder', { h: 1.2 }),
  lp_trash_jp: M('trash_jp', { h: 0.85 }),
  lp_plant_pot1: M('plant_pot1', { h: 0.7 }),
  lp_plant_pot2: M('plant_pot2', { h: 0.55 }),
  lp_plant_pot4: M('plant_pot4', { h: 0.9 }),
  lp_planter_clay: M('planter_clay', { h: 0.3 }),
  lp_planter_box: M('planter_box', { h: 0.35 }),
  lp_tyre: M('tyre'),
  lp_beer_crates: M('beer_crates', { h: 0.62 }),
  lp_bucket_wood: M('bucket_wood', { h: 0.3 }),
  lp_crate_plastic: M('crate_plastic'),
  lp_crate_plastic2: M('crate_plastic2'),
  lp_crate_wood: M('crate_wood'),
  lp_crate_wood2: M('crate_wood2'),
  lp_utility_box2: M('utility_box2'),
  lp_lpg_small: M('lpg_small'),
  // ---------------------------------------------------------------- the shop
  lp_tool_chest: M('tool_chest'),
  lp_dustpan: M('dustpan'),
  lp_bin_metal: M('bin_metal', { h: 0.62 }),
  lp_box_cardboard: M('box_cardboard'),
  lp_shelf_steel: M('shelf_steel', { h: 1.8 }),
  lp_rack_worn: M('rack_worn'),
  lp_fire_alarm: M('fire_alarm'),
  lp_hand_truck: M('hand_truck'),
  lp_jerrycan_metal: M('jerrycan_metal'),
  lp_jerrycan_plastic: M('jerrycan_plastic'),
  lp_clock_wall: M('clock_wall', { h: 0.3 }),
  lp_lamp_caged: M('lamp_caged'),
  lp_chalkboard: M('chalkboard', { h: 0.9 }),
};
