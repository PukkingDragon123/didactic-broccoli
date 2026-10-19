// Things you can carry in the 5-slot inventory besides capsules, figures and delivery boxes.
// Each tool has a 2D icon (src/gfx/icons.js) and a blocky voxel prop (src/data/props/*.js) shown while held.
//   kind 'tool' items carry data { id } (+ optional fields such as uses left).
//   hand: the size (largest dimension, metres) the prop is shown at in front of the camera.

export const TOOLS = {
  notebook: { name: "Grandpa's Notebook", icon: 'notebook', prop: 'grandpa_notebook', desc: 'His letter and a to-do list. Select it and click to read.', keep: true, hand: 0.15 },
  key: { name: 'Garage Key', icon: 'key', prop: 'garage_key', desc: 'Opens the shutter of the old garage.', keep: true, hand: 0.08 },
  milk: { name: 'Milk', icon: 'milk', prop: 'milk_carton', desc: 'Fresh milk. Pour it into the cat bowl.', hand: 0.11 },
  broom: { name: 'Broom', icon: 'broom', prop: 'broom', desc: 'Click a mess to sweep it up.', keep: true, hand: 0.75, pose: 'broom' },
  batteries: { name: 'Batteries', icon: 'battery', prop: 'battery_pack', desc: "Fresh AA batteries for Grandpa's radio.", hand: 0.13 },
  toolkit: { name: 'Tool Kit', icon: 'toolkit', prop: 'toolkit_case', desc: 'Hold click on a broken machine to repair it.', keep: true, hand: 0.2 },
  tube: { name: 'Fluorescent Tube', icon: 'tube', prop: 'tube_box', desc: 'Replaces the dead ceiling light.', hand: 0.55, pose: 'long' },
  trash_bag: { name: 'Trash Bag', icon: 'trash_bag', prop: 'trash_bag', desc: 'Take it out to the garbage station across the lane.', hand: 0.3, pose: 'box' },
  flyers: { name: 'Flyers', icon: 'flyer', prop: 'flyer_stack', desc: 'Hand one to people on the street to bring in customers.', hand: 0.13 },
  cash_tin: { name: "Grandpa's Cash Tin", icon: 'cash_tin', prop: 'cash_tin', desc: 'Savings for supplies.', hand: 0.13 },
};

export const toolName = (id) => TOOLS[id]?.name || id;
