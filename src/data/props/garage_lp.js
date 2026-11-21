// Model-only props for Grandpa's garage (src/plugins/garageDressing.js): real models (Poly Haven CC0, Sketchfab CC BY)
// converted to the game's pixel-art style with lowpix (art/lowpix/world, credits in CREDITS.md / src/kit/lowpixWorld.js).
// No voxel build: sized by `asset.h` (height, m) or `asset.size` [w, h, d] (with fit), else the model's own metres.
const M = (id, o = {}) => ({ asset: { id: 'lowpix/world/' + id, ...o } });

export default {
  // Grandpa's workbench in the front-left corner, and what lives on, under and over it
  gg_workbench: M('table_wood', { size: [1.25, 0.8, 0.56], fit: 'stretch', tint: 0xb89a74 }), // (aged: forty years of oil)
  gg_toolbox: M('toolbox', { h: 0.3 }),
  gg_tool_chest: M('tool_chest', { h: 0.62 }),
  gg_screw_jars: M('screw_jars', { h: 0.15 }),
  gg_radio: M('radio_old', { h: 0.2 }),
  gg_tin_robot: M('toy_robot', { h: 0.22 }),
  gg_tin_train: M('toy_train', { h: 0.12 }),
  gg_plant_small: M('plant_pot4', { h: 0.26 }),
  gg_jar_shelf: M('wall_shelf_jars', { h: 0.56 }),
  gg_work_lamp: M('lamp_hanging', { h: 0.95 }),
  gg_stool: M('stool_wood', { h: 0.44 }),
  // stock under the work table: toy boxes and a crate of capsules
  gg_toy_box: M('toy_box2', { h: 0.34 }),
  gg_crate: M('crate_plastic', { h: 0.26 }),
  gg_bundle: M('cardboard_bundle', { h: 0.15 }),
  // by the sink; the old electric fan and spare stock along the right wall, between the slots for the wall shelves
  gg_bucket: M('bucket', { h: 0.29 }),
  gg_fan: M('fan_floor', { h: 0.75 }),
};
