// The capsule-opening ritual: crack the seal, peel the tape, twist in rhythm (src/game/ritual.js), with the seals
// dressed on every capsule (src/game/capsuleSeals.js). dbg: game.ritual (state), game.ritual.skip() opens the held one.
import { installRitual, capOf } from '../game/ritual.js';

export function install(game) {
  if (!game.held || !game.reveal) return;
  const R = installRitual(game);
  /** Debug: jump the capsule in hand to step i (0 crack, 1 peel, 2 twist). */
  R.toStep = (i) => { const it = game.held.item, cap = capOf(it); if (!cap) return false; it.data.seal = i; cap._ritual = null; return true; };
}
