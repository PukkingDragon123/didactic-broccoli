// game.sim: the shop simulation that ties the clock, calendar, bills and levels to the customers.
//
//   sim.shopQuality() -> { score 0..1, grade, parts: [{ id, label, value 0..1, weight, tip }] }
//   sim.recommendedPrice(machine) -> yen (series value x machine x shop quality, rounded to ¥100)
//   sim.playChance(machine) -> 0..1   chance a customer at this machine actually plays (steep drop above the
//                                      recommended price, a little higher below it, 0 when it can't be played)
//   sim.complaint(machine, { count = true }) -> a short line when it's overpriced (else null); counts toward the day
//   sim.footfall() -> customer multiplier now (hour x day x promotion; > 1 on busy holidays)
//   sim.isOpen()   -> the shop is open for business (after the reopening, in shop hours, shutter up)
//   sim.hours      -> { open, close } shop hours
//   sim.payDigital(amount, reason) -> bool   the ONE function for bank-side charges (bills, loans, online orders)
//   sim.receiveDigital(amount, reason)      money into the bank (online sales, loans)
//   sim.record(kind, n)   add to today's numbers: 'coins' (collected from a coin box), 'complaints', 'plays', ...
//   sim.daySummary() -> today's numbers so far + bills due soon + tomorrow's special day; sim.history (last 30 days)
//   sim.endDay(reason) -> close the shop day: 'daySummary' event, the dusk fly-out and the summary card
//   sim.adBoost() -> 0..1.5 extra customers from promotion (the 'promo' event: { reach, days })
//   sim.loans -> src/sim/loans.js
// Events listened to: 'promo' { reach, days }, 'coinsCollected' { amount }, 'complaint', 'hour', 'newDay', 'xp'.
import { ensureState } from '../game/stateExt.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { MACHINE_TYPES } from '../game/economy.js';
import { formatYen } from '../core/util.js';
import { Loans } from './loans.js';
import { OPEN_HOUR, CLOSE_HOUR } from './clock.js';
// machine-top displays (src/display/): +4% footfall per fully filled, matching display, at most +12%
const POP_FOOTFALL = { per: 0.04, max: 0.12 };

const TYPE_MULT = { retro: 1, standard: 1.1, deluxe: 1.3, royal: 1.6 };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const DAY_KEYS = ['customers', 'plays', 'coins', 'sold', 'complaints', 'xp', 'earned', 'spent'];
const blankDay = (day) => ({ day, customers: 0, plays: 0, coins: 0, sold: 0, complaints: 0, xp: 0, earned: 0, spent: 0 });

export class Sim {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'sim', { hours: { open: OPEN_HOUR, close: CLOSE_HOUR }, dirt: 0, ads: [], today: blankDay(1), history: [], seen: null });
    this.loans = new Loans(game, this);
    this._q = null; this._qT = -1;
    const ev = game.events;
    ev.on('promo', (p) => this.addAd(p || {}));
    ev.on('coinsCollected', (p) => this.record('coins', typeof p === 'number' ? p : p?.amount || 0));
    ev.on('complaint', () => this.record('complaints'));
    ev.on('xp', (p) => { this.s.today.xp += p.n || 0; });
  }

  get hours() { return this.s.hours; }
  get history() { return this.s.history; }

  // ------------------------------------------------------------------ money (the few named places)
  /** A bank-side charge: bills, loan repayments, online orders. Returns false if you can't afford it. */
  payDigital(amount, reason = '') {
    amount = Math.round(amount);
    if (!(amount > 0)) return true;
    const g = this.game, ok = g.wallet ? g.wallet.via('bank', () => g.spend(amount, reason)) : g.spend(amount, reason);
    if (ok) this.s.today.spent += amount;
    return ok;
  }
  /** Money into the bank: online sales, loans. income: false for money that isn't takings (a loan): it then doesn't
   *  count toward XP, the day's "money in" or the lifetime earnings. */
  receiveDigital(amount, reason = '', { income = true } = {}) {
    amount = Math.round(amount);
    if (!(amount > 0)) return;
    const g = this.game;
    if (g.wallet) g.wallet.via('bank', () => g.addMoney(amount, false, reason)); else g.addMoney(amount, false, reason);
    if (!income) {
      g.state.earned = Math.max(0, (g.state.earned || 0) - amount);
      if (this.s.seen) this.s.seen.earned = g.state.earned;
      if (g.progress?.s?.seen) g.progress.s.seen.earned = Math.min(g.progress.s.seen.earned, g.state.earned);
    }
  }

  // ------------------------------------------------------------------ open / footfall / promotion
  isOpen() {
    const g = this.game;
    if (!g.story?.done) return false;
    if (g.life && !g.life.signOpen) return false; // the OPEN sign on its hook (src/life/sign.js)
    const h = g.clock?.hours ?? 12;
    return h >= this.s.hours.open && h < this.s.hours.close && (g.garage?.shutterOpen ?? 1) > 0.5;
  }

  addAd({ reach = 0.3, days = 1 } = {}) {
    const r = reach > 5 ? reach / 100 : reach;
    const now = this.game.clock?.stamp ?? 0;
    this.s.ads.push({ reach: Math.max(0, Math.min(1.5, r)), until: now + Math.max(0.05, days) * 1440 });
    this.game.news?.('Your ad is running', `About ${Math.round(r * 100)}% more customers for ${days} day${days === 1 ? '' : 's'}`, 6000);
  }
  adBoost() {
    const now = this.game.clock?.stamp ?? 0;
    if (this.s.ads.length && this.s.ads[0].until < now) this.s.ads = this.s.ads.filter((a) => a.until >= now);
    return Math.min(1.5, this.s.ads.reduce((a, b) => a + b.reach, 0));
  }

  /** Customer multiplier right now. */
  footfall() {
    const g = this.game, c = g.clock, cal = g.calendar;
    if (!c || !g.story?.done) return 1;
    const base = c.traffic() * (cal?.busy() ?? 1) * (1 + this.adBoost() * 0.6);
    // a well-kept shop draws people in; so do machine-top displays full of their machine's series (src/display/)
    const pop = Math.min(POP_FOOTFALL.max, (g.popTops?.totalDraw?.() || 0) * POP_FOOTFALL.per);
    return base * (0.85 + 0.35 * this.shopQuality().score) * (1 + pop);
  }

  // ------------------------------------------------------------------ quality
  shopQuality() {
    const g = this.game;
    const t = g.time || 0;
    if (this._q && t - this._qT < 1) return this._q;
    const parts = [];
    const add = (id, label, value, weight, tip) => parts.push({ id, label, value: clamp01(value), weight, tip });
    // cleanliness: the opening's mess, trash, things left on the floor, everyday dirt
    const G = { minX: -4, maxX: 4, minZ: -5, maxZ: 5 };
    let loose = 0;
    for (const e of g.items?.list || []) {
      const p = e.obj?.position;
      if (p && p.y < 0.35 && p.x > G.minX && p.x < G.maxX && p.z > G.minZ && p.z < G.maxZ) loose += e.data?.bag ? 3 : 1;
    }
    const piles = g.story?.piles?.size || 0;
    add('clean', 'Cleanliness', 1 - piles * 0.14 - loose * 0.05 - this.s.dirt * 0.6 - (g.life?.dirt?.() || 0) * 0.6, 0.2, 'Sweep up, empty the trash can, keep the floor clear'); // life.dirt: src/life/Life.js
    // lighting: the ceiling lights (if there's power) or daylight through the open shutter
    const tubes = g.garage?.lights?.tubes || [];
    const working = tubes.length ? tubes.filter((x) => !x.dead).length / tubes.length : 0;
    const lamps = g.garage?.lightsOn && g.bills?.powerOn !== false ? working : 0;
    const day = (g.clock?.daylight?.() ?? 1) * Math.max(0, g.garage?.shutterOpen ?? 1);
    add('light', 'Lighting', Math.max(lamps, day * 0.7), 0.2, 'Turn the lights on, especially after dark');
    // decor: goods, charms, museum decor
    const nDecor = Object.keys(g.state.goods || {}).length + (g.state.charms?.length || 0) + Object.keys(g.state.decorOwned || {}).length;
    add('decor', 'Decor', Math.max(1 - Math.exp(-nDecor / 4), g.decor?.quality?.() ?? 0), 0.15, 'Furniture, posters, plants, charms and shop goods'); // game.decor: src/build/Decor.js
    // displays: figures on show
    let shown = 0;
    for (const sh of g.state.shelves || []) for (const it of sh.items || []) if (it) shown++;
    add('display', 'Displays', (g.state.shelves?.length ? 0.15 : 0) + Math.min(0.85, shown / 24), 0.15, 'Put figures on the wall shelves');
    // machines: working and stocked
    const ms = g.machines || [];
    const okM = ms.filter((m) => !m.data.broken && !m.data.fallen && m.data.stock?.length > 0);
    add('machines', 'Machines', ms.length ? okM.length / ms.length * Math.min(1, 0.55 + ms.length * 0.15) : 0, 0.2, 'Keep every machine stocked');
    // variety: different series on offer
    const series = new Set(okM.map((m) => m.data.series));
    add('variety', 'Variety', [0, 0.35, 0.6, 0.8, 1][Math.min(4, series.size)], 0.1, 'Offer more than one series');
    const score = clamp01(parts.reduce((a, p) => a + p.value * p.weight, 0) / parts.reduce((a, p) => a + p.weight, 0));
    const grade = score >= 0.85 ? 'S' : score >= 0.7 ? 'A' : score >= 0.5 ? 'B' : score >= 0.3 ? 'C' : 'D';
    this._q = { score, grade, parts };
    this._qT = t;
    return this._q;
  }

  /** The series a machine is mostly stocked with. */
  machineSeries(machine) {
    const d = machine?.data || machine;
    const st = d?.stock || [];
    if (!st.length) return d?.series;
    const n = {};
    let best = st[0];
    for (const s of st) { n[s] = (n[s] || 0) + 1; if (n[s] > n[best]) best = s; }
    return best;
  }

  recommendedPrice(machine) {
    const d = machine?.data || machine;
    const se = SERIES_BY_ID[this.machineSeries(machine)] || SERIES_BY_ID[d?.series];
    const P = se?.price || 100;
    const q = this.shopQuality().score;
    const v = P * (TYPE_MULT[d?.type] || 1) * (0.75 + 0.55 * q);
    return Math.max(100, Math.round(v / 100) * 100);
  }

  priceOf(machine) { const d = machine?.data || machine; return d?.price ?? this.recommendedPrice(machine); }

  playChance(machine) {
    const g = this.game, d = machine?.data || machine;
    if (!d || d.broken || d.fallen || !(d.stock?.length > 0)) return 0;
    if (g.bills?.powerOn === false && (MACHINE_TYPES[d.type]?.power || 0) > 0.03) return 0; // the electric ones are dead
    const rec = this.recommendedPrice(machine), r = this.priceOf(machine) / rec;
    const q = this.shopQuality().score;
    const base = 0.55 + 0.35 * q;
    const mult = r <= 1 ? Math.min(1.4, 1 + 0.4 * (1 - r)) : Math.exp(-3.2 * Math.pow(r - 1, 1.4));
    return clamp01(Math.min(0.98, base * mult));
  }

  complaint(machine, { count = true } = {}) {
    const rec = this.recommendedPrice(machine), p = this.priceOf(machine), r = p / rec;
    if (r < 1.15) return null;
    const se = SERIES_BY_ID[this.machineSeries(machine)];
    const P = formatYen(p), R = formatYen(rec), name = se?.name || 'these';
    const lines = r < 1.5
      ? [`${P} a turn? Bit pricey...`, `Hmm, ${P}. I'll think about it.`, `These are usually ${R}.`, `${P}? Maybe next time.`]
      : r < 2.2
        ? [`${P}?! For ${name}? No way.`, `The shop by the station charges ${R}!`, `What a rip-off.`, `${P}... my allowance can't take that.`]
        : [`Are you kidding? ${P}?!`, `Grandpa never charged this much!`, `${P}?! I'm telling everyone about this place.`];
    if (count) this.record('complaints');
    return pick(lines);
  }

  // ------------------------------------------------------------------ the day's numbers
  record(kind, n = 1) {
    const T = this.s.today;
    if (T[kind] === undefined) T[kind] = 0;
    T[kind] += n;
  }

  /** Per frame: today's numbers from the save's counters. */
  update() {
    const st = this.game.state, T = this.s.today;
    const cur = { customers: st.stats?.customers || 0, sold: st.stats?.sold || 0, pulls: st.pulls || 0, earned: st.earned || 0 };
    const seen = this.s.seen || (this.s.seen = { ...cur });
    if (cur.customers > seen.customers) {
      T.customers += cur.customers - seen.customers; T.plays += cur.customers - seen.customers;
      this.s.dirt = Math.min(1, this.s.dirt + (cur.customers - seen.customers) * 0.006); // shoes, wrappers, capsule tabs
    }
    if (cur.sold > seen.sold) T.sold += cur.sold - seen.sold;
    if (cur.pulls > seen.pulls) T.plays += cur.pulls - seen.pulls;
    if (cur.earned > seen.earned) T.earned += cur.earned - seen.earned;
    this.s.seen = cur;
    // a sweep of the broom inside the garage cleans up a little
    const H = this.game.held, P = this.game.player?.pos;
    if (H?.holding?.('broom') && H.swing > 0.9 && P && Math.abs(P.x) < 4 && Math.abs(P.z) < 5) {
      if (!this._swung) { this._swung = true; this.s.dirt = Math.max(0, this.s.dirt - 0.05); }
    } else if (!(H?.swing > 0.5)) this._swung = false;
  }

  /** Overnight: a little everyday dust settles. */
  onNewDay() { this.s.dirt = Math.min(1, this.s.dirt + 0.03); }

  daySummary() {
    const g = this.game, T = this.s.today, day = g.clock?.day ?? T.day;
    const out = {};
    for (const k of DAY_KEYS) out[k] = Math.round(T[k] || 0);
    const tomorrow = g.calendar?.headline(day + 1) || [];
    return {
      ...out, day, date: g.calendar?.dateOf(day), level: g.progress?.level, levelFrac: g.progress?.frac,
      quality: this.shopQuality(),
      billsDue: g.bills?.dueSoon(4) || [],
      loansDue: this.loans.list().filter((l) => !l.closed && l.due - day <= 4),
      tomorrow, tomorrowDate: g.calendar?.dateOf(day + 1),
    };
  }

  /** Close the shop day: archive the numbers, emit 'daySummary', play the summary (src/sim/summary.js). */
  endDay(reason = 'close') {
    const g = this.game;
    const data = { ...this.daySummary(), reason };
    this.s.history.push({ day: data.day, customers: data.customers, plays: data.plays, coins: data.coins, sold: data.sold, earned: data.earned, spent: data.spent, complaints: data.complaints, xp: data.xp });
    if (this.s.history.length > 30) this.s.history.shift();
    this.s.today = blankDay(g.clock?.day ?? 1);
    g.events.emit('daySummary', data);
    this.onSummary?.(data);
    return data;
  }

  /** Called from the clock's events. */
  onHour({ hour }) {
    if (hour === this.s.hours.close && this.game.story?.done && !this.game.visiting) this.endDay('close');
    if (hour === this.s.hours.open && this.game.story?.done) {
      const head = this.game.calendar?.headline() || [];
      this.game.news?.('The shop is open!', head.length ? `${head.map((s) => s.name).join(', ')}${head[0].note ? ': ' + head[0].note : ''}` : `${this.game.calendar?.format(undefined, true) || ''}`, 6500);
    }
  }
}
