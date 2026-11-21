// The physical UI kit (src/ui/phys.js): textures, cursor parallax, press clacks and dust, panel swings and pad focus for
// the whole game (the title menu installs it too, earlier); and the pixel-art scene transitions (src/ui/trans.js).
import { installPhys } from '../ui/phys.js';
import { installTransitions } from '../ui/trans.js';

export function install(game) {
  installPhys();
  installTransitions(game);
}
