// In-game date and time for Capsule 98 (taskbar clock, calendar, mail dates, bank statements).
// Reads the simulation clock / calendar (game.clock, game.calendar) when those systems exist, and falls back to a
// gentle stand-in otherwise: the real time of day on day 1 + (in-game days played).
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BASE = { y: 1999, m: 3, d: 1 }; // fallback calendar: day 1 = Thursday 1 April 1999 (a fresh spring start)

const num = (v) => (typeof v === 'function' ? v() : v);
const pick = (o, ...keys) => { for (const k of keys) { const v = num(o?.[k]); if (typeof v === 'number' && Number.isFinite(v)) return v; } return undefined; };

/**
 * { day, hour, minute, year, month (0-11), date (1-31), weekday (0-6), stamp } for "now" in the game.
 * stamp = minutes since day 1 00:00 (sortable; stored on mails, messages and bank lines).
 */
export function now(game) {
  const c = game.clock;
  let day, hour, minute;
  if (c) {
    day = pick(c, 'day', 'dayIndex', 'days');
    hour = pick(c, 'hour', 'hours', 'h');
    minute = pick(c, 'minute', 'minutes', 'min', 'm');
    if (hour === undefined) {
      const tod = pick(c, 'timeOfDay', 'tod', 'dayFraction', 'frac');
      if (tod !== undefined) { const mins = tod <= 1.0001 ? tod * 1440 : tod; hour = Math.floor(mins / 60); minute = Math.floor(mins % 60); }
      const m = pick(c, 'minuteOfDay', 'minutesOfDay');
      if (m !== undefined) { hour = Math.floor(m / 60); minute = Math.floor(m % 60); }
    }
  }
  if (day === undefined) day = game.state.day ?? game.state.npcs?.days ?? 1;
  if (hour === undefined) { const d = new Date(); hour = d.getHours(); minute = d.getMinutes(); }
  hour = Math.floor(hour) % 24; minute = Math.floor(minute || 0) % 60;
  const cal = dateOfDay(game, day);
  return { day, hour, minute, ...cal, stamp: (day - 1) * 1440 + hour * 60 + minute };
}

/** Calendar date of an in-game day number. */
export function dateOfDay(game, day) {
  const cal = game.calendar;
  if (cal) {
    try {
      const d = typeof cal.dateOf === 'function' ? cal.dateOf(day) : typeof cal.date === 'function' ? cal.date(day) : null;
      if (d) {
        const year = d.year ?? d.y, month = d.month ?? d.m, date = d.date ?? d.day ?? d.d;
        if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(date)) {
          const m0 = d.month0 ?? (month >= 1 && month <= 12 && d.monthBase !== 0 ? month - 1 : month);
          return { year, month: m0, date, weekday: d.weekday ?? new Date(year, m0, date).getDay() };
        }
      }
    } catch { /* fall through */ }
  }
  const js = new Date(BASE.y, BASE.m, BASE.d + (day - 1));
  return { year: js.getFullYear(), month: js.getMonth(), date: js.getDate(), weekday: js.getDay() };
}

/** In-game day number of a calendar date (inverse of dateOfDay, for the fallback calendar). */
export function dayOfDate(game, year, month, date) {
  const cal = game.calendar;
  if (cal && typeof cal.dayOf === 'function') { try { const d = cal.dayOf(year, month + 1, date); if (Number.isFinite(d)) return d; } catch { /* */ } }
  const ms = new Date(year, month, date) - new Date(BASE.y, BASE.m, BASE.d);
  return Math.round(ms / 86400000) + 1;
}

export const pad2 = (n) => String(n).padStart(2, '0');
export function clockText(t, h24 = true) {
  if (h24) return `${pad2(t.hour)}:${pad2(t.minute)}`;
  const h = t.hour % 12 || 12;
  return `${h}:${pad2(t.minute)} ${t.hour < 12 ? 'AM' : 'PM'}`;
}
export function dateText(t, long = false) {
  return long ? `${WEEKDAYS[t.weekday]}, ${MONTHS[t.month]} ${t.date}, ${t.year}` : `${pad2(t.month + 1)}/${pad2(t.date)}/${String(t.year).slice(2)}`;
}
/** Short label for a stored stamp (minutes since day 1): "14:05" today, "Tue 14:05" this week, else "04/12/99". */
export function stampText(game, stamp, nowT = now(game)) {
  if (stamp == null) return '';
  const day = Math.floor(stamp / 1440) + 1, h = Math.floor((stamp % 1440) / 60), m = stamp % 60;
  if (day === nowT.day) return `${pad2(h)}:${pad2(m)}`;
  const d = dateOfDay(game, day);
  if (nowT.day - day < 7 && nowT.day > day) return `${WEEKDAYS[d.weekday].slice(0, 3)} ${pad2(h)}:${pad2(m)}`;
  return `${pad2(d.month + 1)}/${pad2(d.date)}/${String(d.year).slice(2)}`;
}
export function stampDate(game, stamp) {
  const day = Math.floor(stamp / 1440) + 1, h = Math.floor((stamp % 1440) / 60), m = stamp % 60;
  const d = dateOfDay(game, day);
  return `${pad2(d.month + 1)}/${pad2(d.date)}/${String(d.year).slice(2)} ${pad2(h)}:${pad2(m)}`;
}

/** Japanese holidays and lane festivals for the fallback calendar: [month0, date, name, kind]. */
export const SPECIAL_DAYS = [
  [0, 1, "New Year's Day", 'holiday'], [1, 3, 'Setsubun (bean throwing)', 'festival'], [1, 14, "Valentine's Day", 'event'],
  [2, 3, 'Hina Matsuri', 'festival'], [2, 14, 'White Day', 'event'], [3, 1, "April Fools' Day", 'event'], [3, 5, 'Hanami in the park', 'festival'],
  [3, 29, 'Greenery Day', 'holiday'], [4, 3, 'Constitution Day', 'holiday'], [4, 4, "Citizens' Holiday", 'holiday'], [4, 5, "Children's Day", 'holiday'],
  [6, 7, 'Tanabata', 'festival'], [6, 20, 'Marine Day', 'holiday'], [7, 13, 'Obon begins', 'festival'], [7, 15, 'Obon', 'festival'], [7, 16, 'Obon ends', 'festival'],
  [7, 24, 'Lane summer festival', 'festival'], [8, 15, 'Respect for the Aged Day', 'holiday'], [8, 23, 'Autumnal Equinox', 'holiday'], [8, 24, 'Tsukimi (moon viewing)', 'festival'],
  [9, 10, 'Sports Day', 'holiday'], [9, 31, 'Halloween', 'event'], [10, 3, 'Culture Day', 'holiday'], [10, 15, 'Shichi-Go-San', 'festival'], [10, 23, 'Labour Thanksgiving', 'holiday'],
  [11, 23, "Emperor's Birthday", 'holiday'], [11, 24, 'Christmas Eve', 'event'], [11, 25, 'Christmas', 'event'], [11, 31, "New Year's Eve", 'event'],
];
