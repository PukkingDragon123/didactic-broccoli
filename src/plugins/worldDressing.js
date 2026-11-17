// World dressing: real models (Poly Haven CC0, Sketchfab CC BY) converted to the game's pixel-art style with lowpix
// (art/lowpix/world, credits in CREDITS.md) set about the lane, the shop and the interiors.
//   lane + shop: model-only props (src/data/props/lowpix.js) through the town's prop instancer: one InstancedMesh per
//                model, culled to the view (src/world/propCull.js), loaded with the prop library at boot. Big ones block
//                the player.
//   interiors:   loaded the first time you walk in (the 'place' event), never at boot; drawn with the interior lamp
//                materials (places.mat) and added to the place's group (shown only while you're inside).
// Every spot was picked by eye in the game (shots/assets13): on pavements, against walls, never on a walking line, a
// door, a build spot or a machine slot.
import * as THREE from 'three';
import { asset } from '../kit/assets.js';
import { lpAsset } from '../kit/lowpixWorld.js';
import { hasProp, maskPropMaterials } from '../world/props.js';

const PI = Math.PI, H = PI / 2;
// [prop id, x, y, z, ry, opts?]  (opts: block (the player bumps into it), scale, shadow). Near side: the strip in front
// of the houses (building line z = 5.3); far side: z = 14.9 (src/world/Town.js layout).
const LANE = [
  // near side
  ['lp_plant_pot2', -11.4, 0, 5.55, 0.4],
  ['lp_plant_pot1', -11.78, 0, 5.52, -0.3],
  ['lp_planter_clay', 4.55, 0, 5.52, 0],
  ['lp_gas_cylinder', 5.08, 0, 5.52, 0.3, { block: true }],
  ['lp_gas_cylinder', 5.4, 0, 5.5, -0.9, { block: true }],
  ['lp_tyre', 11.55, 0, 5.55, 0.5],
  ['lp_crate_plastic', 12.25, 0, 5.62, 0.08],
  ['lp_crate_plastic', 12.25, 0.3, 5.62, -0.05],
  ['lp_crate_plastic2', 12.85, 0, 5.6, 0.2],
  // far side
  ['lp_trash_jp', 4.32, 0, 14.48, PI, { block: true }],
  ['lp_scooter', 5.6, 0, 14.35, -H + 0.12, { block: true }],
  ['lp_bicycle_old', 8.75, 0, 14.5, PI + 0.06, { block: true }],
  ['lp_plant_pot4', -2.95, 0, 14.5, 0.6],
  ['lp_planter_box', -5.6, 0, 14.55, PI],
  ['lp_crate_plastic', -9.3, 0, 14.5, PI + 0.1],
  ['lp_crate_plastic', -9.3, 0.3, 14.5, PI - 0.05],
  ['lp_crate_plastic2', -9.3, 0.6, 14.52, PI + 0.12],
  ['lp_bucket_wood', -16.9, 0, 14.5, 0.3],
  ['lp_crate_wood', 18.3, 0, 14.45, PI + 0.05],
  ['lp_lpg_small', 18.95, 0, 14.55, 0.4],
];
// the shop: only the dead corners and the back wall, never a build spot or a machine slot
const SHOP = [
  ['lp_tool_chest', -1.55, 0, -4.68, 0, { block: true, shadow: true }],
  ['lp_box_cardboard', -0.95, 0, -4.72, 0.15, { shadow: true }],
  ['lp_box_cardboard', -0.95, 0.27, -4.74, -0.2, { shadow: true }],
  ['lp_jerrycan_metal', 3.62, 0, 4.55, -0.4, { shadow: true }],
  ['lp_dustpan', 3.15, 0, 4.72, 0.3],
  ['lp_hand_truck', 3.72, 0, 3.95, -H, { shadow: true }],
  ['lp_fire_alarm', 3.97, 1.35, 4.4, -H],
];
// interiors: [lowpix model id, x, y, z (world), ry, height (m) | null for the model's own size]
const INSIDE = {
  // Ramen Yamada (origin 120, 0, -80; the customers' side is z > -80): crates of empties in the corner by the door
  ramen: [
    ['beer_crates', 117.42, 0, -77.85, 0.15, 0.62],
    ['crate_plastic', 117.38, 0, -78.5, -0.12, null],
    ['crate_plastic', 117.38, 0.3, -78.5, 0.06, null],
  ],
};

export function install(game) {
  const town = game.garage?.town;
  if (town?.prop) {
    const shadowed = new Set();
    const doors = (town.doors || []).flatMap((d) => [d.pos, d.gate]).filter(Boolean);
    for (const [id, x, y, z, ry, o = {}] of [...LANE, ...SHOP]) {
      if (!hasProp(id)) continue;
      // never in front of a door or a gate (a safety net: the spots were checked by eye)
      if (doors.some((p) => Math.abs(p.x - x) < 0.75 && Math.abs(p.z - z) < 0.9)) { console.warn?.('worldDressing: spot by a door skipped', id, x, z); continue; }
      town.prop(id, x, y, z, ry, o);
      if (o.shadow) shadowed.add('props:' + id);
    }
    town.flushProps();
    // the shop's pieces sit under the garage lights: let them cast (the lane's stay cheap)
    if (shadowed.size) town.group.traverse((o) => { if (o.isInstancedMesh && shadowed.has(o.name)) o.castShadow = true; });
  }
  // model-drawn props everywhere: only their own material slots (no voxel-era leftovers on the mesh)
  maskPropMaterials(game.scene);
  setTimeout(() => maskPropMaterials(game.scene), 4000);
  const P = game.places, done = new Set();
  game.events.on('place', ({ where }) => { const gr = where && P?.list[where]?.group; if (gr) setTimeout(() => maskPropMaterials(gr), 0); });
  game.events.on('place', ({ where }) => {
    if (!where || done.has(where) || !INSIDE[where] || !P?.list[where]?.group) return;
    done.add(where);
    const group = P.list[where].group;
    group.updateMatrixWorld(true);
    for (const [id, x, y, z, ry, h] of INSIDE[where]) {
      asset(lpAsset(id)).then((m) => {
        if (h) m.scale.multiplyScalar(h / m.userData.size.y);
        // the group may sit at the place's origin: the spots are world positions
        const local = group.worldToLocal(new THREE.Vector3(x, y, z));
        m.position.copy(local);
        m.rotation.y = ry;
        m.traverse((o) => { if (o.isMesh) { o.material = P.mat(o.material); o.castShadow = false; } });
        group.add(m);
      }).catch(() => {});
    }
  });
}
