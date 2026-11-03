// Small helpers shared by the market modules: seeded randomness, the clock (with a stand-in while the opening chores
// hold it), yen, dates for delivery estimates and the per-system save keys.
import { rng, hash2 } from '../core/util.js';
import { ensureState } from '../game/stateExt.js';

export { rng, hash2 };
export const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
export const rint = (a, b, r = Math.random) => a + Math.floor(r() * (b - a + 1));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const yen = (n) => (n < 0 ? '-' : '') + '¥' + Math.abs(Math.round(n)).toLocaleString('en-US');
/** Round a price to a "real" price: ¥10 steps under ¥1,000, ¥50 under ¥5,000, then ¥100. */
export function nicePrice(v) {
  v = Math.max(10, v);
  const step = v < 1000 ? 10 : v < 5000 ? 50 : 100;
  return Math.max(step, Math.round(v / step) * step);
}
/** Weighted pick: list of [value, weight]. */
export function wpick(list, r = Math.random) {
  let t = 0;
  for (const [, w] of list) t += w;
  let x = r() * t;
  for (const [v, w] of list) { if (x < w) return v; x -= w; }
  return list[list.length - 1][0];
}

/** Minutes since day 1 00:00 (the clock's stamp; 0 before the sim exists). */
export const stamp = (g) => g.clock?.stamp ?? 0;
export const today = (g) => g.clock?.day ?? 1;
export const hourNow = (g) => g.clock?.hours ?? 12;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** "Thu 4/3" for a day number. */
export function dayText(g, day) {
  const d = g.calendar?.dateOf?.(day);
  if (!d) return `Day ${day}`;
  return `${WD[d.weekday]} ${d.month + 1}/${d.date}`;
}
/** "today 14:30", "tomorrow morning", "Thu 4/3" for a stamp. */
export function whenText(g, st) {
  const day = Math.floor(st / 1440) + 1, m = st % 1440, h = Math.floor(m / 60);
  const d0 = today(g);
  const hm = `${String(h).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  if (day === d0) return st - stamp(g) < 90 ? 'within the hour' : `today ${hm}`;
  if (day === d0 + 1) return `tomorrow ${part}`;
  return `${dayText(g, day)} ${part}`;
}

/** The market's save data (one key) and the courier's (another). */
export function marketState(g) {
  return ensureState(g, 'market', {
    v: 1, day: 0, listings: [], seq: 1, orders: [], mine: [], ship: [], grading: [], loose: [], watch: [],
    sellers: {}, stats: { bought: 0, sold: 0, scammed: 0, haggled: 0, spent: 0, earned: 0, graded: 0 },
    rating: { n: 0, sum: 0 }, shipBoxes: 5, seed: (Math.random() * 1e9) | 0, seenCats: {}, flags: {},
  });
}
export function courierState(g) {
  return ensureState(g, 'courier', { visits: 0, met: false, delivered: 0, items: [], last: null, candies: 0, eaten: 0, pickups: 0, lastVisit: -1, missed: 0, flags: {} });
}
export const nextId = (S, p = 'x') => `${p}${(S.seq++).toString(36)}`;
/** The bank balance online payments come out of (game.wallet splits cash and bank; older builds have one purse). */
export const bankBalance = (g) => g.wallet?.bank ?? g.state.money ?? 0;
/** Money into the bank without counting as takings (tests, refunds). */
export function addBank(g, v, why = '') { if (g.wallet?.addBank) g.wallet.addBank(v, why); else g.addMoney(v, true, why); }
