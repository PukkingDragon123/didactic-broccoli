// The shop simulation core: time, calendar, bills, levels, pricing and demand, loans, the day summary.
//   createSim(game)   -> game.calendar, game.clock, game.bills, game.progress, game.sim (+ game.sim.loans); called by
//                        src/game/Lighting.js as soon as the world exists, so everything later can rely on them
//   installSim(game)  -> the per-frame update, the HUD clock / level bar, the summary card and the customer hooks;
//                        run from src/plugins/sim.js once the whole game is built
import { Calendar } from './calendar.js';
import { Clock } from './clock.js';
import { Bills } from './bills.js';
import { Progress } from './progress.js';
import { Sim } from './sim.js';
import { SimAchievements } from './achievements.js';
import { SimHud } from './hud.js';
import { playDaySummary } from './summary.js';
import { getItem } from '../data/series/index.js';

export function createSim(game) {
  if (game.sim) return game.sim;
  game.calendar = new Calendar(game);
  game.clock = new Clock(game);
  game.bills = new Bills(game);
  game.progress = new Progress(game);
  game.sim = new Sim(game);
  game.simAchievements = new SimAchievements(game);
  const ev = game.events;
  ev.on('newDay', ({ day }) => { game.bills.onDay(day); game.sim.loans.onDay(day); game.sim.onNewDay(day); });
  ev.on('hour', (e) => game.sim.onHour(e));
  ev.on('clockSkip', () => game.lighting?.refresh());
  // XP for discoveries and completed series
  ev.on('discover', ({ key, finish, isNew }) => {
    const r = getItem(key)?.rarity;
    const bonus = { rare: 30, ultra: 80, secret: 250 }[r] || 0;
    if (isNew) game.progress.addXP(15 + bonus, 'discover');
    else if (bonus) game.progress.addXP(bonus / 2, 'pull');
    if (finish && finish !== 'normal') game.progress.addXP(20, 'finish');
  });
  ev.on('display', () => {
    const n = Object.keys(game.state.completed || {}).length;
    if (n > (game.progress.s.seriesDone || 0)) { game.progress.s.seriesDone = n; game.progress.addXP(300, 'series'); }
  });
  // catch up on bills when a save is loaded
  game.bills.onDay(game.clock.day);
  return game.sim;
}

export function installSim(game) {
  const sim = createSim(game);
  game.simHud = new SimHud(game);
  sim.onSummary = (data) => playDaySummary(game, data);
  hookPedestrians(game);
  let last = game.clock.stamp, acc = 0;
  game.progress.s.seriesDone ??= Object.keys(game.state.completed || {}).length;
  const step = (g, dt) => {
    g.clock.update(dt);
    const now = g.clock.stamp, dm = now - last;
    last = now;
    // the meter reads what's switched on every couple of in-game minutes (a night skipped asleep counts too)
    if (dm > 0 && dm < 5 * 1440) acc += dm;
    if (acc >= 2) { g.bills.meter(acc); acc = 0; }
    g.progress.update();
    g.sim.update();
    g.simAchievements.update(dt);
    g.simHud.update(dt);
  };
  return step;
}

/**
 * More (and fewer) people in the lane with the time of day, the calendar and promotion; nobody turns in after shop
 * hours. Wraps three Pedestrians methods on the instance (src/world/Pedestrians.js is untouched).
 */
function hookPedestrians(game) {
  const P = game.pedestrians;
  if (!P || P._simHooked) return;
  P._simHooked = true;
  const baseLevel = P.level.bind(P);
  const sim = game.sim;
  // promotion level (walk-in chance 18% + 10% a level): flyers and the neon sign (Pedestrians) + the lane's curiosity
  // about the reopened shop + running ads + busy days
  P.level = () => (sim.isOpen() ? Math.min(7, baseLevel() + 2 + Math.round(sim.adBoost() * 2) + ((game.calendar?.busy() ?? 1) >= 1.3 ? 1 : 0)) : -10);
  P.interval = () => {
    if (!P.open) return 45;
    const lv = Math.max(0, P.level());
    return Math.max(2.5, (22 / (1 + 0.6 * lv)) / (0.15 + 1.6 * sim.footfall()));
  };
  P.maxPeople = () => {
    if (!P.open) return 1;
    const lv = Math.max(0, P.level());
    return Math.max(1, Math.round((3 + lv * 2) * Math.min(2.4, 0.35 + sim.footfall())));
  };
}
