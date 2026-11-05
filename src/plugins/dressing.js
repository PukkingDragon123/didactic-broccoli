// The Dressing Room (src/dressing/): character customisation in a small walk-in closet of its own. Your character stands
// on a rag rug in the afternoon sun (drag to turn them); a paper catalogue beside it has every category, with locked
// pieces shown as ink silhouettes and a slip that says how to get them.
// game.dressing.open({ from: 'menu' | 'mirror' }) -> Promise (resolves on close). Debug: window.dbg.dressing.
import { installDressing } from '../dressing/index.js';

export function install(game) {
  try { installDressing(game); } catch (e) { console.warn('dressing room', e); }
}
