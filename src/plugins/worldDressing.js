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
import { hasProp } from '../world/props.js';

// [prop id, x, y, z, ry, opts?]  (opts: block (the player bumps into it), scale)
const LANE = [];
const SHOP = [];
// interiors: [lowpix model id, x, y, z (world), ry, height (m) | null for the model's own size]
const INSIDE = {};

export function install(game) {
  const town = game.garage?.town;
  if (town?.prop) {
    const shadowed = new Set();
    for (const [id, x, y, z, ry, o = {}] of [...LANE, ...SHOP]) {
      if (!hasProp(id)) continue;
      town.prop(id, x, y, z, ry, o);
      if (o.shadow) shadowed.add('props:' + id);
    }
    town.flushProps();
    // the shop's pieces sit under the garage lights: let them cast (the lane's stay cheap)
    if (shadowed.size) town.group.traverse((o) => { if (o.isInstancedMesh && shadowed.has(o.name)) o.castShadow = true; });
  }
  const P = game.places, done = new Set();
  game.events.on('place', ({ where }) => {
    if (!where || done.has(where) || !INSIDE[where] || !P?.list[where]?.group) return;
    done.add(where);
    const group = P.list[where].group;
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
