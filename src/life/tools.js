// The life features' carried tools, registered into src/data/tools.js's TOOLS (and two hand poses into Held's POSES) at
// import time, so saves that hold them restore cleanly. Icons: src/life/icons.js; props: src/data/props/life.js.
import * as THREE from 'three';
import { TOOLS } from '../data/tools.js';
import { POSES } from '../game/Held.js';
import './icons.js';

Object.assign(TOOLS, {
  rag: { name: 'Rag', icon: 'rag', prop: 'rag', desc: 'Wet it at the sink, then hold click on dust to wipe it off.', hand: 0.15 },
  bin_bags: { name: 'Bin Bags', icon: 'bin_bags', prop: 'bin_bags', desc: 'Hold click on a heap of rubbish to bag it up.', hand: 0.18, keep: true },
  coin_float: { name: 'Change Float', icon: 'coin_float', prop: 'coin_float', desc: "Grandpa's float of ¥100 coins for the cash tray on the counter.", hand: 0.11 },
  junk_box: { name: 'Box of Old Parts', icon: 'junk_box', prop: 'junk_box_open', desc: 'Junk. Out to the garbage station across the lane.', hand: 0.42, pose: 'box' },
  cardboard: { name: 'Flattened Cardboard', icon: 'cardboard', prop: 'cardboard_flat', desc: 'Tied up for collection: the garbage station.', hand: 0.42, pose: 'box' },
  open_sign: { name: 'OPEN Sign', icon: 'open_sign', prop: 'open_sign_prop', desc: "Grandpa's old sign. It hangs on the hook by the shutter.", hand: 0.36, pose: 'box', keep: true },
  leash: { name: "Pochi's Leash", icon: 'leash', prop: 'leash_handle', desc: 'Walk Pochi round the lane and back to her gate.', hand: 0.11, pose: 'bag', keep: true },
  poop_bags: { name: 'Poop Bags', icon: 'poop_bag', prop: 'poop_bags', desc: 'Click a mess to scoop it.', hand: 0.07, keep: true },
  poop_bag_full: { name: 'Full Poop Bag', icon: 'poop_bag', prop: 'poop_bag_full', desc: 'Bin it: a trash can or the garbage station.', hand: 0.08, pose: 'bag' },
  sponge: { name: 'Sponge', icon: 'sponge', prop: 'sponge', desc: 'Dip it in the bucket, then hold click on the dirt.', hand: 0.12, keep: true },
  ladle: { name: 'Water Ladle', icon: 'ladle', prop: 'ladle', desc: 'Scoop water from the bucket and rinse the soap off.', hand: 0.3, pose: 'squeegee', keep: true },
  squeegee: { name: 'Squeegee', icon: 'squeegee', prop: 'squeegee', desc: 'Hold click and drag across wet glass.', hand: 0.27, pose: 'squeegee', keep: true },
  spray: { name: 'Spray Bottle', icon: 'spray', prop: 'spray_bottle', desc: 'Click a dirty window to wet it.', hand: 0.17, keep: true },
});

// held upright in front and to the right (handles, a squeegee, the ladle)
POSES.squeegee = { pos: new THREE.Vector3(0.17, -0.16, -0.44), rot: new THREE.Euler(0.25, -0.35, 0.08) };

/** Grips for these tools borrowed from things FPBody already knows how to hold (see src/plugins/life.js). */
export const GRIP_AS = {
  junk_box: { kind: 'box' },
  cardboard: { kind: 'box' },
  open_sign: { kind: 'box' },
  leash: { tool: 'trash_bag' },
  poop_bag_full: { tool: 'trash_bag' },
};
