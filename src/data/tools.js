// Things you can carry in the 5-slot inventory besides capsules, figures and delivery boxes.
// Each tool has a 2D icon (src/gfx/icons.js) and a blocky voxel prop (src/data/props/*.js) shown while held.
//   kind 'tool' items carry data { id } (+ optional fields such as uses left).

export const TOOLS = {
  notebook: { name: "Grandpa's Notebook", icon: 'notebook', prop: 'grandpa_notebook', desc: 'His letter and a to-do list. Select it and click to read.', keep: true, scale: 1 },
  key: { name: 'Garage Key', icon: 'key', prop: 'garage_key', desc: 'Opens the shutter of the old garage.', keep: true, scale: 1.4 },
  milk: { name: 'Milk', icon: 'milk', prop: 'milk_carton', desc: 'Fresh milk. Pour it into the cat bowl.', scale: 1 },
  broom: { name: 'Broom', icon: 'broom', prop: 'broom', desc: 'Click a mess to sweep it up.', keep: true, scale: 0.55, pose: 'broom' },
  batteries: { name: 'Batteries', icon: 'battery', prop: 'battery_pack', desc: "Fresh AA batteries for Grandpa's radio.", scale: 1 },
  toolkit: { name: 'Tool Kit', icon: 'toolkit', prop: 'toolkit_case', desc: 'Hold click on a broken machine to repair it.', keep: true, scale: 0.8 },
  tube: { name: 'Fluorescent Tube', icon: 'tube', prop: 'tube_box', desc: 'Replaces the dead ceiling light.', scale: 0.8 },
  trash_bag: { name: 'Trash Bag', icon: 'trash_bag', prop: 'trash_bag', desc: 'Take it out to the garbage station across the lane.', scale: 0.7, pose: 'box' },
  flyers: { name: 'Flyers', icon: 'flyer', prop: 'flyer_stack', desc: 'Hand one to people on the street to bring in customers.', scale: 1 },
  cash_tin: { name: "Grandpa's Cash Tin", icon: 'cash_tin', prop: 'cash_tin', desc: 'Savings for supplies.', scale: 1 },
};

export const toolName = (id) => TOOLS[id]?.name || id;
