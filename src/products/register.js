// Hands the props library the models this folder makes for props that are defined elsewhere: the carton of milk, the
// card of batteries, the boxed tube, the broom and the cup noodles (src/data/props/quest.js, garage.js, room.js keep
// their voxel shapes as sized stand-ins; propMesh() returns ours). Imported once, by Mikawa-ya (src/places/mikawaya).
import { PROPS } from '../world/props.js';
import { goodsMesh } from './goods.js';

for (const id of ['milk_carton', 'battery_pack', 'tube_box', 'broom', 'room_cupnoodle']) {
  if (PROPS[id] && !PROPS[id].mesh) PROPS[id].mesh = (opts) => goodsMesh(id, opts);
}
export const REGISTERED = true;
