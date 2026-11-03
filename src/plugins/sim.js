// The shop simulation (src/sim/): day/night clock, calendar, bills, levels, pricing and demand, loans, the day summary.
// The core objects (game.clock, calendar, bills, progress, sim) already exist (src/game/Lighting.js creates them);
// this adds the per-frame update, the HUD and the customer hooks once the whole game is built.
import { Game } from '../game/Game.js';
import { installSim } from '../sim/index.js';

export function install(game) {
  const step = installSim(game);
  Game.updaters.push(step);
}
