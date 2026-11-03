// game.calendar: dates, weekdays, holidays and the shop's special days.
//
// Day 1 (the day you arrive) is Thursday 1 April 1999, a spring start; days run on from there (leap years and all).
// Holidays follow the Japanese calendar of the time, plus the lane's own days: rent day, bill days, the new capsule
// release day and the summer festival. Bills and loans add their due dates (see bills.js / loans.js).
//
//   calendar.today()            -> date (below) for the current day
//   calendar.dateOf(day)        -> { day, year, month (1-12), month0, date, weekday (0 = Sun), weekdayName, wd, monthName, specials }
//   calendar.dayOf(year, month, date) -> day number (month 1-12)
//   calendar.list(month?, year?) -> every date of that month (default: this month), each with .specials, .isToday, .past
//   calendar.special(date)      -> [{ id, name, kind, busy, note }] for a day number or a { year, month, date }
//   calendar.busy(day?)         -> customer multiplier for that day (weekends and holidays are busier)
//   calendar.season(day?)       -> 'spring' | 'summer' | 'autumn' | 'winter'
// Event: 'specialDay' { day, date, special } for each special of a new day (from the clock's 'newDay').
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const BASE = Date.UTC(1999, 3, 1); // day 1
const DAY_MS = 86400000;

// kinds: holiday (national, shops busy, schools out), festival, event, school (school holidays), shop (release day),
// bill (rent / bills / loans, added at runtime)
const FIXED = [
  [1, 1, 'newyear', "New Year's Day", 'holiday', 0.7, 'Families visit shrines; the lane is quiet until the afternoon'],
  [1, 2, 'shogatsu2', 'New Year holidays', 'school', 1.7, 'Kids have their otoshidama money to spend!'],
  [1, 3, 'shogatsu3', 'New Year holidays', 'school', 1.6, 'Kids have their otoshidama money to spend!'],
  [1, 15, 'seijin', 'Coming of Age Day', 'holiday', 1.25, ''],
  [2, 3, 'setsubun', 'Setsubun', 'festival', 1.15, 'Bean throwing: oni out, luck in'],
  [2, 11, 'kenkoku', 'National Foundation Day', 'holiday', 1.3, ''],
  [2, 14, 'valentine', "Valentine's Day", 'event', 1.1, ''],
  [3, 3, 'hina', 'Hina Matsuri', 'festival', 1.15, "Girls' Day"],
  [3, 14, 'whiteday', 'White Day', 'event', 1.05, ''],
  [3, 21, 'shunbun', 'Vernal Equinox Day', 'holiday', 1.3, ''],
  [4, 29, 'midori', 'Greenery Day', 'holiday', 1.5, 'Golden Week begins'],
  [5, 3, 'kenpo', 'Constitution Memorial Day', 'holiday', 1.6, 'Golden Week'],
  [5, 4, 'kokumin', "Citizens' Holiday", 'holiday', 1.6, 'Golden Week'],
  [5, 5, 'kodomo', "Children's Day", 'holiday', 1.9, 'Koinobori everywhere. Kids rule the lane today!'],
  [7, 7, 'tanabata', 'Tanabata', 'festival', 1.35, 'Wishes on bamboo; kids in yukata'],
  [7, 20, 'umi', 'Marine Day', 'holiday', 1.4, ''],
  [8, 13, 'obon1', 'Obon', 'festival', 1.3, 'Families home for Obon; grandkids with pocket money'],
  [8, 14, 'obon2', 'Obon', 'festival', 1.35, 'Families home for Obon'],
  [8, 15, 'obon3', 'Obon', 'festival', 1.35, 'Families home for Obon'],
  [8, 16, 'obon4', 'Obon ends', 'festival', 1.2, 'Okuribi: the spirits go home'],
  [9, 15, 'keiro', 'Respect for the Aged Day', 'holiday', 1.3, ''],
  [9, 23, 'shubun', 'Autumnal Equinox Day', 'holiday', 1.3, ''],
  [10, 10, 'taiiku', 'Sports Day', 'holiday', 1.35, ''],
  [10, 31, 'halloween', 'Halloween', 'event', 1.25, 'Costumes in the lane'],
  [11, 3, 'bunka', 'Culture Day', 'holiday', 1.3, ''],
  [11, 15, 'shichigosan', 'Shichi-Go-San', 'festival', 1.15, ''],
  [11, 23, 'kinro', 'Labour Thanksgiving Day', 'holiday', 1.3, ''],
  [12, 23, 'tenno', "Emperor's Birthday", 'holiday', 1.35, ''],
  [12, 24, 'xmaseve', 'Christmas Eve', 'event', 1.6, 'Last-minute presents: capsule toys count!'],
  [12, 25, 'xmas', 'Christmas', 'event', 1.45, ''],
  [12, 31, 'omisoka', "New Year's Eve", 'event', 0.85, 'Toshikoshi soba and the temple bells'],
];
const FIXED_BY = new Map();
for (const [m, d, id, name, kind, busy, note] of FIXED) FIXED_BY.set(m * 100 + d, { id, name, kind, busy, note });

const ymd = (day) => { const t = new Date(BASE + (day - 1) * DAY_MS); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() }; };
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const isHoliday = (m, d) => FIXED_BY.get(m * 100 + d)?.kind === 'holiday';

/** Specials from the fixed calendar rules (no bills). */
function ruleSpecials(day) {
  const { y, m, d, wd } = ymd(day);
  const out = [];
  const fx = FIXED_BY.get(m * 100 + d);
  if (fx) out.push({ ...fx });
  // substitute holiday: a national holiday on a Sunday moves to the Monday
  if (wd === 1 && !fx) { const prev = ymd(day - 1); if (isHoliday(prev.m, prev.d)) out.push({ id: 'furikae', name: 'Substitute holiday', kind: 'holiday', busy: 1.3, note: '' }); }
  // the lane summer festival: the last Saturday of July
  if (m === 7 && wd === 6 && d + 7 > 31) out.push({ id: 'matsuri', name: 'Lane Summer Festival', kind: 'festival', busy: 2.1, note: 'Yatai stalls, taiko and lanterns all along the lane. The busiest night of the year!' });
  // new capsule release day: the first Saturday of every month
  if (wd === 6 && d <= 7) out.push({ id: 'release', name: 'New capsule release day', kind: 'shop', busy: 1.3, note: 'New series lineups: collectors come early' });
  // school holidays (kids out all day): spring break, summer, winter
  const school = (m === 3 && d >= 25) || (m === 4 && d <= 6) || (m === 7 && d >= 21) || m === 8 || (m === 12 && d >= 25) || (m === 1 && d <= 7);
  if (school && !out.some((s) => s.kind === 'school')) out.push({ id: 'schoolhol', name: m >= 7 && m <= 8 ? 'Summer holidays' : m === 12 || m === 1 ? 'Winter holidays' : 'Spring break', kind: 'school', busy: 1.2, note: 'No school: kids all day long', quiet: true });
  void y;
  return out;
}

export class Calendar {
  constructor(game) {
    this.game = game;
    this.extra = []; // providers: (day) => [specials] (bills, loans)
    this._cache = new Map();
  }

  get day() { return this.game.clock?.day ?? 1; }

  /** Add a source of runtime specials (bill due dates...). fn(day) -> array. */
  addSource(fn) { this.extra.push(fn); }

  dateOf(day = this.day) {
    const { y, m, d, wd } = ymd(day);
    return { day, year: y, month: m, month0: m - 1, date: d, weekday: wd, weekdayName: WEEKDAYS[wd], wd: WD[wd], monthName: MONTHS[m - 1], specials: this.special(day) };
  }

  dayOf(year, month, date) { return Math.round((Date.UTC(year, month - 1, date) - BASE) / DAY_MS) + 1; }

  today() { return { ...this.dateOf(this.day), isToday: true }; }

  /** Specials of a day number or a { year, month, date } / { day }. */
  special(date) {
    const day = typeof date === 'number' ? date : date?.day ?? (date ? this.dayOf(date.year, date.month, date.date) : this.day);
    let base = this._cache.get(day);
    if (!base) { base = ruleSpecials(day); if (this._cache.size > 800) this._cache.clear(); this._cache.set(day, base); }
    const out = base.slice();
    for (const fn of this.extra) { try { out.push(...(fn(day) || [])); } catch (e) { console.warn('calendar source', e); } }
    return out;
  }

  list(month, year) {
    const now = ymd(this.day);
    const m = month ?? now.m, y = year ?? now.y;
    const out = [];
    for (let d = 1; d <= daysIn(y, m); d++) {
      const day = this.dayOf(y, m, d);
      const o = this.dateOf(day);
      o.isToday = day === this.day; o.past = day < this.day;
      out.push(o);
    }
    return out;
  }

  /** Customer multiplier for a day: weekends, holidays, festivals (the biggest special wins, weekends stack a bit). */
  busy(day = this.day) {
    const { wd } = ymd(day);
    const week = wd === 0 || wd === 6 ? 1.3 : wd === 5 ? 1.1 : 1;
    let best = 1, quiet = 1;
    for (const s of this.special(day)) if (s.busy) { best = Math.max(best, s.busy); quiet = Math.min(quiet, s.busy); }
    if (quiet < 1) return quiet; // a quiet day (New Year's Day) stays quiet
    return Math.max(week, best) + (week > 1 && best > 1 ? 0.1 : 0);
  }

  season(day = this.day) {
    const { m } = ymd(day);
    return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  }

  /** Day of the year (1..366) for the sun's path. */
  yearDay(day = this.day) { const { y, m, d } = ymd(day); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / DAY_MS) + 1; }

  /** "Thu 1 Apr" / long: "Thursday, April 1". */
  format(day = this.day, long = false) {
    const o = this.dateOf(day);
    return long ? `${o.weekdayName}, ${o.monthName} ${o.date}` : `${o.wd.slice(0, 1)}${o.wd.slice(1).toLowerCase()} ${o.date} ${o.monthName.slice(0, 3)}`;
  }

  /** The specials worth announcing for a day (not the quiet ones like school holidays every day). */
  headline(day = this.day) { return this.special(day).filter((s) => !s.quiet); }

  /** Called by the clock at midnight. */
  onNewDay(day) {
    const date = this.dateOf(day);
    for (const s of date.specials) this.game.events.emit('specialDay', { day, date, special: s });
  }
}
