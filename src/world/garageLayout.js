// Forty years of Grandpa's mess in the garage shop: stock on the racks, refill cartons piled by the shutter, opened
// boxes and packing, the cluttered counter, tools, the step ladder, cleaning things, plants, bins, notices and price
// tags. Every piece is a real model (src/data/props/garage_kit.js) placed through garage.mess (src/world/garageMess.js);
// the prints come from the baked print sheets. What the player builds with (ATTACH in src/world/Garage.js) and the
// people's ways through (ATTACH.keepClear) stay free; Grandpa's own dressing is src/plugins/garageDressing.js.
import * as THREE from 'three';
import { GARAGE } from './Garage.js';

const R = Math.PI / 2;
// the steel racks' board tops (Garage.js RACK_Y + 1.25 cm) and the fifth, top board
const RL = [0.0925, 0.6325, 1.1725, 1.7125, 2.2237];

export function dressGarage(garage) {
  const M = garage.mess, G = GARAGE;
  const put = (id, x, y, z, o) => M.put(id, x, y, z, o);
  const T = garage.table, top = T.h;

  // ------------------------------------------------------------------ the racks (back wall, left of the door)
  // rack 0 (x -3.25): cartons of capsule stock at the bottom, tins and jars in the middle, boxes up to the joists
  put('gm_carton', -3.55, RL[0], -4.7, { ry: 0.05 });
  put('gm_crate2', -3.04, RL[0], -4.69, { ry: -0.04 });
  put('gm_paint', -3.5, RL[2], -4.7, { ry: R, s: 0.6 });
  put('gm_books', -3.08, RL[2], -4.69, { ry: 0.1 });
  put('gm_screwjars', -2.76, RL[2], -4.58, { ry: 0.5 });
  put('gm_screwjars', -2.74, RL[2], -4.8, { ry: -0.3 });
  // its second board: a box of spare parts, bags of snacks for the kids, cup noodles; the fourth: his hard hat, a bear
  put('gm_boxc', -3.55, RL[1], -4.7, { ry: 0.04, s: 0.8 });
  put('gm_puff', -3.24, RL[1], -4.64, { ry: 0.2 });
  put('gm_puff', -2.98, RL[1], -4.75, { ry: -0.3 });
  M.stack(-2.8, RL[1], -4.6, [['gm_noodlecup', { ry: 0.4 }], ['gm_noodlecup', { ry: 1.1 }]]);
  put('gm_noodlecup', -2.79, RL[1], -4.78, { ry: -0.6 });
  put('gm_helmet', -3.55, RL[3], -4.7, { ry: 0.3 });
  put('gm_teddy', -3.2, RL[3], -4.68, { ry: 0.25 });
  put('gm_books2', -2.9, RL[3], -4.7, { ry: -0.1 });
  M.stack(-3.5, RL[4], -4.7, [['gm_boxc', { ry: R + 0.04 }], ['gm_carton', { ry: 0.12, dx: 0.03 }]]);
  put('gm_cbflat', -3.06, RL[4], -4.68, { ry: 0.2 });
  // rack 1 (x -1.85): crates of capsules, the toolbox, batteries and a spray; boxes on top (Grandpa's cash tin waits
  // on the fourth board: src/game/Story.js)
  put('gm_crate', -2.23, RL[0], -4.7, { ry: 0.03 });
  put('gm_crate', -1.9, RL[0], -4.7, { ry: -0.05 });
  put('gm_carton', -1.48, RL[0], -4.7, { ry: R + 0.06 });
  put('gm_toolbox', -2.12, RL[2], -4.7, { ry: 0.06 });
  put('gm_batteries', -1.7, RL[2], -4.6, { ry: 0.3 });
  put('gm_batteries', -1.6, RL[2], -4.62, { ry: -0.2 });
  put('gm_spray', -1.42, RL[2], -4.68, { ry: 1.1 });
  put('gm_crate2', -2.12, RL[1], -4.7, { ry: 0.02 });
  put('gm_puff', -2.2, RL[1] + 0.012, -4.7, { ry: R, overlapOk: true }); // (in the crate)
  put('gm_boxc', -1.58, RL[1], -4.7, { ry: -0.05, s: 0.75 });
  put('gm_kettle', -2.27, RL[3], -4.7, { ry: 0.6 });
  put('gm_jar', -1.95, RL[3], -4.65, { ry: 0.2 });
  put('gm_boxes', -1.6, RL[4], -4.7, { s: 0.88 });
  put('gm_cbbundle', -2.13, RL[4], -4.7, { ry: 0.1 });
  // on the floor in front: tied newspapers and flattened boxes, a carton with a plush left on it, the brooms
  M.stack(-3.15, 0, -4.22, [['gm_news', { ry: 1.52, s: 0.5, block: true }], ['gm_cbflat', { ry: 0.4, dx: 0.04 }]]);
  M.stack(-1.55, 0, -4.2, [['gm_boxc', { ry: 0.25, s: 0.85, block: true }], ['gm_teddy2', { ry: 0.6 }]]);
  put('gm_broombin', -0.98, 0, -4.8, { ry: 0.4, block: true });

  // ------------------------------------------------------------------ back wall, right of the door
  put('gm_jerry', 2.42, 0, -4.78, { ry: 0.1 });                 // the heater's kerosene, under the sink
  put('gm_watering', 2.8, 0, -4.74, { ry: R + 0.2 });
  put('gm_wastebin', 2.98, 0, -4.32, { block: true });
  put('gm_paper', 2.72, 0, -4.3, { ry: 1.2 });

  // ------------------------------------------------------------------ the counter (the work table): cluttered
  put('gm_register', 0.88, top, 0.33, { ry: -0.3, s: 0.5 });
  put('gm_maneki', 1.0, top, 0.02, { ry: -0.6 });
  put('gm_cointray', 0.6, top, 0.1, { ry: 0.15 });
  put('gm_ledger', -0.27, top, 0.43, { ry: 0.25 });
  put('gm_soroban', -0.55, top + 0.016, 0.45, { rx: -R, ry: 0.1 });
  put('gm_mug', -0.42, top, 0.18, { ry: 1.0 });
  put('gm_thermos', -0.62, top, 0.0, { ry: 0.4 });
  put('gm_clock', 0.32, top, -0.27, { ry: 0.2 });
  put('gm_fan', 0.04, top, -0.24, { ry: 0.3, s: 0.45 });
  put('gm_cupnoodle', -0.24, top, -0.24, { ry: 0.5 });
  put('gm_paper', 0.48, top, -0.06, { ry: 0.3 });
  put('gm_paper', 0.42, top, 0.04, { ry: 2.1, s: 0.8 });
  // round the counter: the waste bin and what missed it, a bar stool, a crate of toy stock
  put('gm_wastebin', -0.95, 0, 0.0, { ry: 0.2, block: true });
  put('gm_paper', -1.18, 0, 0.12, { ry: 0.8 });
  put('gm_paper', -0.82, 0, 0.26, { ry: 2.4, s: 0.9 });
  put('gm_stool', 1.35, 0, 0.78, { ry: 0.5, block: true });
  put('gm_carton', 1.38, 0, 0.37, { ry: 0.1, block: true });
  put('gm_crate2', 1.45, 0, -0.05, { ry: R + 0.08, s: 0.85, block: true });
  put('gm_teddy', 1.45, 0.012, -0.05, { ry: -1.0, s: 0.9, overlapOk: true }); // (sat in the crate)

  // ------------------------------------------------------------------ right wall (in the gaps between the shelf slots)
  put('gm_crate', 3.75, 0, -1.6, { ry: R, block: true });
  put('gm_crate', 3.75, 0.264, -1.6, { ry: R + 0.04, rim: true });
  put('gm_daruma', 3.75, 0.276, -1.6, { ry: -R - 0.3, overlapOk: true }); // (in the top crate)
  // the high shelf: spare tubes in their sleeves, a box of bulbs, old books (the rest of it is yours: ATTACH)
  const HS = 2.475;
  for (const [x, z] of [[3.84, -0.45], [3.89, -0.43]]) put('gm_tubebox', x, HS, z, { ry: R + 0.01 });
  put('gm_books2', 3.86, HS, 0.3, { ry: -R + 0.1 });
  put('gm_boxc', 3.86, HS, 0.66, { ry: 0.05, s: 0.6 });
  // the PC corner shelf: books, the cassette player, the old camera
  const D = garage.pcDesk;
  put('gm_books', 3.86, 1.8, D.z - 0.28, { ry: -R });
  put('gm_cassette', 3.88, 1.8, D.z + 0.12, { ry: -R + 0.2 });
  put('gm_camera', 3.86, 1.8, D.z + 0.4, { ry: -R - 0.4 });

  // ------------------------------------------------------------------ the front: refill cartons by the shutter
  put('gm_boxc', -1.25, 0, 4.66, { ry: 0.08, block: true });
  put('gm_boxc', -1.72, 0, 4.68, { ry: -0.05, block: true });
  put('gm_boxc', -1.5, 0.342, 4.66, { ry: R + 0.05 });
  put('gm_cbbundle', -1.48, 0.684, 4.68, { ry: 0.2 });
  put('gm_carton', -2.13, 0, 4.7, { ry: -0.1, block: true });
  put('gm_plant', -0.76, 0, 4.76, { s: 0.65, block: true });
  // an opened box with its packing, flattened cardboard beside it
  put('gm_openbox', -0.5, 0, 2.62, { ry: 0.35, s: 0.55, block: true });
  put('gm_paper', -0.47, 0.012, 2.64, { ry: 0.2, overlapOk: true });
  put('gm_cbflat', 0.05, 0, 2.72, { ry: 0.7, block: true });
  // front right: the step ladder, the kerosene can moved over
  put('gm_ladder', 2.75, 0, 4.72, { ry: 0, block: true, shadow: true });
  // front left: paint tins by the workbench
  put('gm_paint', -2.65, 0, 3.95, { ry: 0.4, s: 0.6, block: true });

  // ------------------------------------------------------------------ the machine row (left wall, between the slots)
  put('gm_trash', -3.78, 0, 0.325, { ry: R, block: true });
  put('gm_jerry', -3.8, 0, 1.375, { ry: R - 0.1, block: true });
  put('gm_bucketm', -3.76, 0, 2.29, { ry: 0.5, block: true });
  put('gm_broombin', -3.72, 0, -1.775, { ry: 0.9, block: true });
  put('gm_crate', -3.75, 0, -2.825, { ry: R, block: true });
  put('gm_puff', -3.75, 0.012, -2.83, { ry: R + 0.1, overlapOk: true }); // (in the crate)
  // the window sill: a cactus and a clay pot
  put('gm_cactus', -3.91, 1.75, 1.3, { ry: 0.4, s: 0.45, overlapOk: true });
  put('gm_planter', -3.91, 1.75, 2.33, { ry: 1.2, s: 0.5, overlapOk: true });

  // ------------------------------------------------------------------ the middle of the floor, right of the counter
  // refill cartons waiting to go into the machines (their labels to the room), an opened one spilling its packing
  put('gm_boxc', 2.55, 0, -0.2, { ry: 1.4, block: true });
  put('gm_boxc', 2.57, 0.342, -0.18, { ry: 1.52 });
  put('gm_carton', 3.06, 0, -0.12, { ry: 0.3, block: true });
  put('gm_cbmess', 2.0, 0, 1.85, { ry: 0.4, block: true });
  put('gm_paper', 1.5, 0, 1.33, { ry: 0.6 });
  M.stack(1.9, 0, 2.95, [['gm_news', { ry: 0.3, s: 0.55, block: true }], ['gm_news', { ry: 0.42, s: 0.55, dx: 0.02 }], ['gm_cbflat', { ry: -0.4 }]]);
  put('gm_crate2', 2.5, 0, 2.62, { ry: 0.25, block: true });
  put('gm_milk', 2.41, 0.012, 2.57, { ry: 0.4, overlapOk: true });
  put('gm_milk', 2.55, 0.012, 2.69, { ry: 1.3, overlapOk: true });

  // ------------------------------------------------------------------ between the machine row and the counter
  M.stack(-1.62, 0, -1.55, [['gm_boxes', { ry: 0.18, block: true }], ['gm_boxc', { ry: 0.1, s: 0.7 }]]);
  M.stack(-1.62, 0, -2.75, [['gm_boxc', { block: true }], ['gm_boxc', { ry: 0.05 }], ['gm_tv', { ry: 0.15, s: 0.75 }]]); // (the old telly, waiting)

  // ------------------------------------------------------------------ the back, between the fridge and the PC corner
  M.stack(1.85, 0, -3.25, [['gm_boxes', { ry: -0.12, block: true }], ['gm_carton', { ry: 0.2 }]]);
  M.stack(1.9, 0, -2.5, [['gm_boxc', { ry: R + 0.06, block: true }], ['gm_radio', { ry: -0.9 }]]);
  put('gm_bag', 2.2, 0, -4.15, { ry: 0.7, block: true });

  // ------------------------------------------------------------------ prints: tin signs, notices, price tags, carton labels
  const W = 0.004; // off the wall
  M.print('misc', 'shop:tin_tanuki_katori', '-x', G.maxX - W, 2.12, -0.55, 0.54, 0.18, { tilt: 0.01 });
  M.print('misc', 'shop:tin_neko_shoyu', '+x', G.minX + W, 2.2, 0.66, 0.2, 0.6, { tilt: -0.012 });
  M.print('shop', 'mk:manbiki', '+z', 3.55, 2.55, G.minZ + W, 0.45, 0.096, { tilt: 0.008 });
  M.print('shop', 'mk:tsuke', '+z', -0.95, 1.85, G.minZ + W, 0.4, 0.075, { tilt: -0.01 });
  M.print('misc', 'shop:tin_milk_caramel', '-x', G.maxX - W, 2.12, 3.05, 0.48, 0.16, { tilt: -0.008 });
  // hand-written price tags on the shelf edges
  const tag = (k, face, x, y, z, t = 0) => M.print('shop', 'mk:tag' + k, face, x, y, z, 0.06, 0.04, { tilt: t });
  for (const [k, x, y] of [[0, -3.55, RL[0]], [1, -3.04, RL[0]], [2, -2.2, RL[0]], [3, -1.48, RL[0]], [1, -3.1, RL[2]], [0, -2.12, RL[2]]]) tag(k, '+z', x, y - 0.025, -4.474, (x * 7 % 1) * 0.1);
  for (const [k, x, y] of [[2, -3.4, RL[1]], [0, -2.9, RL[1]], [3, -2.1, RL[1]], [1, -1.58, RL[1]], [3, -3.5, RL[3]], [2, -2.25, RL[3]]]) tag(k, '+z', x, y - 0.025, -4.474, 0.03);
  for (const [k, z] of [[2, -4.2], [3, -3.9], [0, -3.05], [1, -2.55], [2, -1.95]]) tag(k, '+x', G.minX + 0.271, 1.95, z, 0.05);
  for (const [k, z] of [[1, -0.6], [0, 0.3], [3, 0.66]]) tag(k, '-x', G.maxX - 0.271, HS - 0.02, z, -0.04);
  // posters and notices round the walls (the old print sheets: festival, the zoo, a Showa poster)
  M.print('lane', 'lane:festival:0', '+x', G.minX + W, 2.55, -4.0, 0.3, 0.42, { tilt: 0.015 });
  M.print('lane', 'lane:zoo:0', '+x', G.minX + W, 2.55, -2.45, 0.3, 0.42, { tilt: -0.02 });
  M.print('misc', 'shop:poster_showa', '+z', 2.65, 2.25, G.minZ + W, 0.3, 0.42, { tilt: 0.01 });
  M.print('lane', 'lane:lost:cat0', '+x', G.minX + W, 1.55, 3.2, 0.25, 0.35, { tilt: 0.03 });
  M.print('shop', 'mk:kuji', '-z', -3.8, 1.62, G.maxZ - W, 0.3, 0.39, { tilt: -0.015 });
  // the refill cartons by the shutter carry their series' carton labels on the room side
  /** A label on the room-side (local -z) face of a box at (x, z) turned by ry, d = half its depth, centred at height y. */
  const label = (key, x, y, z, ry, d, w, h) => {
    const n = new THREE.Vector3(-Math.sin(ry), 0, -Math.cos(ry));
    const u = new THREE.Vector3(0, 1, 0).cross(n);
    M.print('misc', key, null, x + n.x * (d + 0.004), y, z + n.z * (d + 0.004), w, h, { u, v: new THREE.Vector3(0, 1, 0) });
  };
  label('carton:henshin', -1.25, 0.18, 4.66, 0.08, 0.26, 0.3, 0.175);
  label('carton:daikaiju', -1.72, 0.18, 4.68, -0.05, 0.26, 0.3, 0.175);
  label('carton:shinkai', -1.55, 0.16, -4.2, 0.25 + Math.PI, 0.26 * 0.85, 0.26, 0.15);
  label('carton:yokaiya', 2.55, 0.17, -0.2, 1.4, 0.26, 0.3, 0.175);
  label('carton:nuigurumi', 2.57, 0.342 + 0.17, -0.18, 1.52, 0.26, 0.3, 0.175);
}
