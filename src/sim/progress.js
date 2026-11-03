// game.progress: shop level and XP. Levels unlock machines, series licences, furniture, the marketplace, staff and the
// museum (the table is src/data/unlocks.js). The first levels come quickly (within the first in-game day or two).
//
//   progress.level, progress.xp (into this level), progress.next (XP this level needs), progress.total
//   progress.addXP(n, reason)      progress.unlocked(id) -> bool       progress.unlocks(level) -> [{ id, name, kind, level }]
//   progress.levelFor(id) -> level  progress.frac -> 0..1 toward the next level
// Events: 'xp' { n, reason, level, xp, next }, 'levelUp' { level, unlocks }.
//
// XP comes from: customers playing (stats.customers), money earned once the shop is open (selling figures, collecting
// coins: 1 XP per ¥20), new figures and finishes (discover), completed series, bought machines / licences / shelves,
// bills paid on time; other systems call addXP directly.
import { ensureState } from '../game/stateExt.js';
import { UNLOCKS, unlockLevel, unlocksAt } from '../data/unlocks.js';

/** XP needed to go from `level` to `level + 1`. */
export function xpForLevel(level) {
  return Math.round((40 + 36 * Math.pow(level, 1.5)) / 10) * 10;
}
export const MAX_LEVEL = 50;

export class Progress {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'progress', { level: 1, xp: 0, total: 0, seen: { customers: 0, earned: 0 } });
    this.queue = 0; // XP waiting to be granted (batched each frame)
  }

  get level() { return this.s.level; }
  get xp() { return this.s.xp; }
  get total() { return this.s.total; }
  get next() { return xpForLevel(this.s.level); }
  get frac() { return this.s.level >= MAX_LEVEL ? 1 : Math.min(1, this.s.xp / this.next); }

  unlocked(id) { return unlockLevel(id) <= this.s.level; }
  levelFor(id) { return unlockLevel(id); }
  unlocks(level = this.s.level) { return unlocksAt(level); }
  /** Everything still locked, soonest first. */
  upcoming(n = 6) { return UNLOCKS.filter((u) => u.level > this.s.level).slice(0, n); }

  addXP(n, reason = '') {
    n = Math.round(n);
    if (!(n > 0) || this.game.visiting) return;
    const s = this.s;
    s.xp += n; s.total += n;
    const ups = [];
    while (s.level < MAX_LEVEL && s.xp >= xpForLevel(s.level)) {
      s.xp -= xpForLevel(s.level);
      s.level++;
      ups.push(s.level);
    }
    this.game.events.emit('xp', { n, reason, level: s.level, xp: s.xp, next: this.next });
    for (const lv of ups) this.game.events.emit('levelUp', { level: lv, unlocks: unlocksAt(lv) });
    if (ups.length) this.game.save?.();
  }

  /** Per frame: XP from customers and income (polled from the save so every source counts). */
  update() {
    const st = this.game.state, seen = this.s.seen;
    const cust = st.stats?.customers || 0;
    if (cust > seen.customers) { this.addXP((cust - seen.customers) * 6, 'customer'); }
    seen.customers = cust;
    const earned = st.earned || 0;
    // money only counts once the shop is open (Grandpa's tin and the opening chores don't level you up)
    if (this.game.story?.done) {
      const d = earned - seen.earned;
      if (d >= 20) { this.addXP(Math.floor(d / 20), 'income'); seen.earned += Math.floor(d / 20) * 20; }
      else if (d < 0) seen.earned = earned;
    } else seen.earned = earned;
  }
}
