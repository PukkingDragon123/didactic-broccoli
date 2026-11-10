// Progression achievements for the computer's Achievements app (game.os.achievements.define / unlock). Everything is
// guarded: with no OS (yet) nothing happens, and the ones you earned meanwhile unlock once it shows up.
import { ensureState } from '../game/stateExt.js';
import { getItem } from '../data/series/index.js';

export const ACHIEVEMENTS = [
  { id: 'sim_first_machine', name: 'Back in Business', desc: 'Buy your first gacha machine', icon: 'machine' },
  { id: 'sim_first_customer', name: 'Irasshaimase!', desc: 'Your first customer plays a machine', icon: 'people' },
  { id: 'sim_first_open', name: 'First Turn', desc: 'Open your first capsule', icon: 'star' },
  { id: 'sim_first_rare', name: 'Ooh, Shiny', desc: 'Pull a Rare figure', icon: 'star' },
  { id: 'sim_first_ultra', name: 'Ultra!', desc: 'Pull an Ultra Rare figure', icon: 'sparkle' },
  { id: 'sim_first_secret', name: 'Super Secret', desc: 'Pull a Super Secret figure (1 in 500)', icon: 'crown' },
  { id: 'sim_first_finish', name: 'Something Special', desc: 'Pull a special finish', icon: 'sparkle' },
  { id: 'sim_gold', name: 'Solid Gold', desc: 'Pull a Gold finish or better', icon: 'crown', hidden: true },
  { id: 'sim_day_10k', name: 'A ¥10,000 Day', desc: 'Take in ¥10,000 in one shop day', icon: 'coin' },
  { id: 'sim_day_50k', name: 'Golden Day', desc: 'Take in ¥50,000 in one shop day', icon: 'yen' },
  { id: 'sim_customers_100', name: 'Regulars', desc: 'Serve 100 customers', icon: 'people' },
  { id: 'sim_customers_1000', name: 'Neighbourhood Legend', desc: 'Serve 1,000 customers', icon: 'people' },
  { id: 'sim_level_5', name: 'Shop Level 5', desc: 'Reach shop level 5', icon: 'upgrade' },
  { id: 'sim_level_10', name: 'Shop Level 10', desc: 'Reach shop level 10', icon: 'upgrade' },
  { id: 'sim_level_20', name: 'Shop Level 20', desc: 'Reach shop level 20', icon: 'crown' },
  { id: 'sim_three_machines', name: 'Gacha Corner', desc: 'Have 3 machines in the garage', icon: 'machine' },
  { id: 'sim_full_garage', name: 'Wall to Wall', desc: 'Fill all 6 machine spots', icon: 'machine' },
  { id: 'sim_series', name: 'Complete Set', desc: 'Complete a series on display', icon: 'book' },
  { id: 'sim_good_tenant', name: 'Good Tenant', desc: 'Pay a bill on time', icon: 'check' },
  { id: 'sim_debt_free', name: 'Debt Free', desc: 'Repay a loan', icon: 'wallet' },
  { id: 'sim_holiday_rush', name: 'Holiday Rush', desc: 'Serve 25 customers on a holiday or festival', icon: 'flag' },
  { id: 'sim_night_owl', name: 'Night Owl', desc: 'Still at it at 2 in the morning', icon: 'clock', hidden: true },
  { id: 'sim_week', name: 'One Week Open', desc: 'Run the shop for 7 days', icon: 'clock' },
];

export class SimAchievements {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'simAch', { got: {} });
    this.defined = false;
    this.t = 0;
    const ev = game.events;
    ev.on('machineBought', () => { this.give('sim_first_machine'); if ((game.state.machines?.length || 0) >= 3) this.give('sim_three_machines'); if ((game.state.machines?.length || 0) >= 6) this.give('sim_full_garage'); });
    ev.on('discover', ({ key, finish }) => {
      const r = getItem(key)?.rarity;
      if (r === 'rare' || r === 'ultra' || r === 'secret') this.give('sim_first_rare');
      if (r === 'ultra' || r === 'secret') this.give('sim_first_ultra');
      if (r === 'secret') this.give('sim_first_secret');
      if (finish && finish !== 'normal') this.give('sim_first_finish');
      if (['gold', 'aurora', 'diamond'].includes(finish)) this.give('sim_gold');
    });
    ev.on('levelUp', ({ level }) => { if (level >= 5) this.give('sim_level_5'); if (level >= 10) this.give('sim_level_10'); if (level >= 20) this.give('sim_level_20'); });
    ev.on('bill', ({ type, bill }) => { if (type === 'paid' && !bill.overdue && !bill.lateFee) this.give('sim_good_tenant'); });
    ev.on('loan', ({ type }) => { if (type === 'repaid') this.give('sim_debt_free'); });
    ev.on('daySummary', (d) => {
      if (d.earned >= 10000) this.give('sim_day_10k');
      if (d.earned >= 50000) this.give('sim_day_50k');
      if (d.customers >= 25 && (d.date?.specials || []).some((s) => ['holiday', 'festival'].includes(s.kind))) this.give('sim_holiday_rush');
    });
  }

  /** Earn one (remembered, and passed on to the OS when it's there). */
  give(id) {
    if (this.s.got[id] || this.game.visiting) return;
    this.s.got[id] = this.game.clock?.day ?? 1;
    this.flush();
  }

  flush() {
    const A = this.game.os?.achievements;
    if (!A?.unlock) return;
    if (!this.defined && A.define) { for (const a of ACHIEVEMENTS) { try { A.define(a); } catch (e) { console.warn('achievement', e); } } this.defined = true; }
    for (const id of Object.keys(this.s.got)) if (!this.s.sentToOS?.[id]) { try { A.unlock(id); (this.s.sentToOS ||= {})[id] = true; } catch (e) { console.warn('achievement', e); } }
  }

  /** A slow poll (every 2 s) for the counters. */
  update(dt) {
    this.t += dt;
    if (this.t < 2) return;
    this.t = 0;
    const g = this.game, st = g.state;
    if (this.game.os?.achievements && !this.defined) this.flush();
    if ((st.stats?.customers || 0) >= 1) this.give('sim_first_customer');
    if ((st.stats?.customers || 0) >= 100) this.give('sim_customers_100');
    if ((st.stats?.customers || 0) >= 1000) this.give('sim_customers_1000');
    if ((st.stats?.opened || 0) >= 1) this.give('sim_first_open');
    if (Object.keys(st.completed || {}).length) this.give('sim_series');
    if (g.clock && g.story?.done && g.clock.hour === 2) this.give('sim_night_owl');
    if (g.clock && g.clock.day >= 8 && g.story?.done) this.give('sim_week');
  }
}
