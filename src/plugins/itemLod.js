// Collectible level of detail: the 2x up-res figure meshes are only used close to the camera (see collectibles.js).
import { enableItemLod, updateItemLod } from '../game/collectibles.js';

export function install(game) {
  enableItemLod(true);
  let t = 0;
  game.constructor.updaters.push((g, dt) => {
    t -= dt;
    if (t > 0) return;
    t = 0.1;
    updateItemLod(g.camera.getWorldPosition(g._lodCam || (g._lodCam = g.camera.position.clone())), 2);
  });
}
