// Life & story (phase 2): Grandpa's notes, the van, the opening's many small chores, the OPEN sign, the trash loop with
// the garbage truck, side jobs and the daily open / close routine. Everything lives in src/life/ (game.life).
import { Life } from '../life/Life.js';

export function install(game) {
  if (game.life) return;
  game.life = new Life(game);
  game.life.install();
}
