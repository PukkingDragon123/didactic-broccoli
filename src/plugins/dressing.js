// The Dressing Room (src/dressing/): character customisation on a magical little stage of its own. Your character
// spins on a floating gacha-capsule dais under a starry pixel sky between velvet curtains; a paper catalogue beside it
// has every category, with locked pieces shown as ink silhouettes and a slip that says how to get them.
// game.dressing.open({ from: 'menu' | 'mirror' }) -> Promise (resolves on close). Debug: window.dbg.dressing.
import { installDressing } from '../dressing/index.js';

export function install(game) {
  try { installDressing(game); } catch (e) { console.warn('dressing room', e); }
}
