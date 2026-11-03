// game.bills: the garage's rent, electricity and water.
//
//   rent         ¥15,000 a month, due on the 27th (notice a week before)
//   electricity  issued on the 10th for the metered use since the last bill, due on the 20th. Use scales with the
//                lit ceiling tubes, powered machines, the shop sign and lanterns in open hours, the PC, the museum...
//   water        issued on the 5th of every other month (Jun, Aug, ...), due on the 20th
// Reminders arrive as mail (game.os.mail.send when the computer has it, else a news toast): when a bill is issued, two
// days before it is due, on the due day, and when late. Late bills get a late fee (5%, +5% a week, capped at 25%).
// Unpaid electricity: warning letter 3 days late, final notice at 7, power cut at 10 days late (lights, the shop sign
// and powered machines go dark until every electricity bill is paid; machines check game.bills.powerOn).
// Unpaid rent: warning letters, and the landlord's patience is tracked (bills.s.strikes) for later consequences.
//
//   bills.list() -> [{ id, kind, name, amount, base, lateFee, issued, due, paid, overdue, daysLate, status }]
//   bills.due()  -> the unpaid ones, soonest first          bills.pay(id) -> { ok, msg }    bills.total()
//   bills.powerOn (bool)   bills.usage() -> this period's { kwh, yen, parts }   bills.kw() -> current draw (kW)
// Every payment goes through game.sim.payDigital (bank transfer). Events: 'bill' { type, bill }, 'power' { on }.
import { ensureState } from '../game/stateExt.js';
import { MACHINE_TYPES } from '../game/economy.js';
import { formatYen } from '../core/util.js';

export const RENT = 15000;
const RENT_DUE = 27, ELEC_ISSUE = 10, ELEC_DUE = 20, WATER_ISSUE = 5, WATER_DUE = 20;
const KWH_YEN = 26, ELEC_BASE = 780, WATER_BASE = 1100, WATER_PER_HOUR = 8;
const NAMES = { rent: 'Garage rent', electricity: 'Electricity', water: 'Water' };
const FROM = { rent: 'Ota Real Estate', electricity: 'Kanto Electric Power', water: 'City Waterworks' };

export class Bills {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'bills', { list: [], nextId: 1, meter: { kwh: 0, openHours: 0, waterHours: 0, since: 1 }, lastDay: 0, cut: false, strikes: 0, sent: {} });
    game.calendar?.addSource((day) => this.calendarEntries(day));
  }

  get powerOn() { return !this.s.cut; }

  /** Current electrical draw in kW (what's switched on right now). */
  kw() {
    return this.drawParts().reduce((a, p) => a + p.kw, 0);
  }

  drawParts() {
    const g = this.game, out = [];
    if (this.s.cut) return out;
    out.push({ id: 'base', name: 'Fridge, radio, little things', kw: 0.05 });
    const tubes = g.garage?.lights?.tubes || [];
    const lit = g.garage?.lightsOn ? tubes.filter((t) => !t.dead).length : 0;
    if (lit) out.push({ id: 'lights', name: 'Ceiling lights', kw: lit * 0.045 });
    let mk = 0;
    for (const m of g.machines || []) mk += MACHINE_TYPES[m.data.type]?.power || 0;
    if (mk) out.push({ id: 'machines', name: 'Machine lights', kw: mk });
    if (g.sim?.isOpen?.()) out.push({ id: 'sign', name: 'Shop sign and lanterns', kw: 0.06 });
    if (g.state.goods?.neon_open) out.push({ id: 'neon', name: 'Neon OPEN sign', kw: 0.07 });
    if (g.pc?.active || g.os?.isOpen) out.push({ id: 'pc', name: 'Computer', kw: 0.12 });
    if (g.museum?.data?.owned) out.push({ id: 'museum', name: 'Museum lighting', kw: 0.15 });
    return out;
  }

  /** Called with in-game minutes elapsed (from the clock's hours). */
  meter(minutes) {
    const h = minutes / 60;
    this.s.meter.kwh += this.kw() * h;
    if (this.game.sim?.isOpen?.()) { this.s.meter.openHours += h; this.s.meter.waterHours = (this.s.meter.waterHours || 0) + h; }
  }

  usage() {
    const kwh = this.s.meter.kwh;
    return { kwh, yen: Math.round(ELEC_BASE + kwh * KWH_YEN), openHours: this.s.meter.openHours, parts: this.drawParts() };
  }

  // ------------------------------------------------------------------ issuing
  /** Run at every new day (and once at load to catch up). */
  onDay(day) {
    const cal = this.game.calendar;
    if (!cal) return;
    for (let d = Math.max(this.s.lastDay + 1, 2); d <= day; d++) {
      const dt = cal.dateOf(d);
      if (dt.date === 20 && d >= 7) this.issue('rent', RENT, d, cal.dayOf(dt.year, dt.month, RENT_DUE), `Rent for ${nextMonthName(dt)}`);
      if (dt.date === ELEC_ISSUE && d > 9) {
        const u = this.usage();
        this.issue('electricity', u.yen, d, d + (ELEC_DUE - ELEC_ISSUE), `${Math.round(u.kwh)} kWh used`, { kwh: Math.round(u.kwh) });
        this.s.meter = { ...this.s.meter, kwh: 0, openHours: 0, since: d };
      }
      if (dt.date === WATER_ISSUE && dt.month % 2 === 0 && d > 40) {
        const yen = Math.round((WATER_BASE + (this.s.meter.waterHours || 0) * WATER_PER_HOUR) / 10) * 10;
        this.issue('water', yen, d, d + (WATER_DUE - WATER_ISSUE), 'Two months of water');
        this.s.meter.waterHours = 0;
      }
    }
    this.s.lastDay = Math.max(this.s.lastDay, day);
    this.checkLate(day);
  }

  issue(kind, amount, issued, due, note, extra = {}) {
    if (this.s.list.some((b) => b.kind === kind && b.issued === issued)) return;
    const b = { id: `b${this.s.nextId++}`, kind, amount: Math.round(amount), issued, due, paid: null, note, late: 0, ...extra };
    this.s.list.push(b);
    if (this.s.list.length > 60) this.s.list.splice(0, this.s.list.length - 60);
    const cal = this.game.calendar;
    this.letter(b, 'issued', `${NAMES[kind]}: ${formatYen(b.amount)}`, `${note}. Please pay by ${cal.format(due, true)} (Bank on the computer).`);
    this.game.events.emit('bill', { type: 'issued', bill: this.view(b) });
  }

  // ------------------------------------------------------------------ status
  lateFee(b, day = this.game.clock?.day ?? 1) {
    if (b.paid) return b.lateFeePaid || 0;
    const late = day - b.due;
    if (late <= 0) return 0;
    const pct = Math.min(0.25, 0.05 * (1 + Math.floor((late - 1) / 7)));
    return Math.round((b.amount * pct) / 10) * 10;
  }

  view(b) {
    const day = this.game.clock?.day ?? 1;
    const fee = this.lateFee(b, day);
    const daysLate = b.paid ? 0 : Math.max(0, day - b.due);
    const status = b.paid ? 'paid' : daysLate > 0 ? 'late' : day === b.due ? 'due today' : 'due';
    return { id: b.id, kind: b.kind, name: NAMES[b.kind] || b.kind, from: FROM[b.kind] || '', note: b.note, amount: b.amount + fee, base: b.amount, lateFee: fee, issued: b.issued, due: b.due, paid: b.paid, overdue: daysLate > 0, daysLate, status, kwh: b.kwh };
  }

  list() { return this.s.list.map((b) => this.view(b)); }
  due() { return this.s.list.filter((b) => !b.paid).sort((a, b) => a.due - b.due).map((b) => this.view(b)); }
  total() { return this.due().reduce((a, b) => a + b.amount, 0); }
  /** Unpaid bills due within `days` days (for the summary card). */
  dueSoon(days = 3) { const d = this.game.clock?.day ?? 1; return this.due().filter((b) => b.due - d <= days); }

  pay(id) {
    const b = this.s.list.find((x) => x.id === id);
    if (!b) return { ok: false, msg: 'No such bill' };
    if (b.paid) return { ok: false, msg: 'Already paid' };
    const v = this.view(b);
    const pay = this.game.sim?.payDigital ? (n, r) => this.game.sim.payDigital(n, r) : (n) => this.game.spend(n);
    if (!pay(v.amount, `bill:${b.kind}`)) return { ok: false, msg: `Not enough money (${formatYen(v.amount)})` };
    b.paid = this.game.clock?.day ?? 1;
    b.lateFeePaid = v.lateFee;
    if (!v.overdue) this.game.progress?.addXP(20, 'bill');
    this.game.events.emit('bill', { type: 'paid', bill: this.view(b) });
    if (b.kind === 'electricity' && this.s.cut && !this.s.list.some((x) => x.kind === 'electricity' && !x.paid)) this.setPower(true);
    this.game.save?.();
    return { ok: true, msg: `${v.name} paid: ${formatYen(v.amount)}` };
  }

  checkLate(day) {
    for (const b of this.s.list) {
      if (b.paid) continue;
      const late = day - b.due;
      const once = (tag, fn) => { const k = `${b.id}:${tag}`; if (this.s.sent[k]) return; this.s.sent[k] = true; fn(); };
      if (late === -2) once('soon', () => this.letter(b, 'reminder', `${NAMES[b.kind]} due in 2 days`, `${formatYen(this.view(b).amount)}, due ${this.game.calendar.format(b.due, true)}.`));
      if (late === 0) once('today', () => this.letter(b, 'reminder', `${NAMES[b.kind]} is due today`, `${formatYen(this.view(b).amount)}. Pay it on the computer's Bank to avoid a late fee.`));
      if (late >= 1) once('late', () => this.letter(b, 'late', `${NAMES[b.kind]} is overdue`, `A late fee has been added: now ${formatYen(this.view(b).amount)}.`));
      if (b.kind === 'electricity') {
        if (late >= 3) once('warn', () => this.letter(b, 'warning', 'Warning: unpaid electricity', 'Please pay within a week or your supply will be suspended.'));
        if (late >= 7) once('final', () => this.letter(b, 'warning', 'FINAL NOTICE: electricity', 'Supply will be cut off in 3 days unless the bill is paid.'));
        if (late >= 10 && !this.s.cut) this.setPower(false);
      }
      if (b.kind === 'rent' && late >= 5) once('rentwarn', () => { this.s.strikes++; this.letter(b, 'warning', 'About the garage rent', 'The rent is late. Please pay as soon as possible, or we will have to talk about the lease.'); });
      if (b.kind === 'water' && late >= 10) once('waterwarn', () => this.letter(b, 'warning', 'Unpaid water bill', 'Please pay your water bill.'));
    }
  }

  setPower(on) {
    this.s.cut = !on;
    this.game.events.emit('power', { on });
    if (!on) this.game.news?.('The power has been cut off!', 'Pay the electricity bill on the computer to get it back', 9000);
    else this.game.news?.('The power is back on', '', 5000);
  }

  /** A letter or e-mail about a bill. */
  letter(b, type, subject, body) {
    const g = this.game;
    const msg = { from: FROM[b.kind] || 'Shop office', subject, body, kind: 'bill', bill: b.id, type };
    if (g.os?.mail?.send) { try { g.os.mail.send(msg); return; } catch (e) { console.warn('mail', e); } }
    g.news?.(subject, body.length > 90 ? body.slice(0, 88) + '...' : body, 7000);
  }

  /** Calendar entries: bill due dates. */
  calendarEntries(day) {
    const out = [];
    for (const b of this.s.list) if (b.due === day && !b.paid) out.push({ id: `due:${b.id}`, name: `${NAMES[b.kind]} due`, kind: 'bill', bill: b.id, amount: b.amount, note: formatYen(b.amount) });
    const { date, month } = ymdOf(day);
    if (date === RENT_DUE && !out.some((o) => o.name.startsWith('Garage rent'))) out.push({ id: 'rentday', name: 'Rent day', kind: 'bill', note: formatYen(RENT) });
    if (date === ELEC_ISSUE) out.push({ id: 'elecday', name: 'Electricity bill arrives', kind: 'bill', note: '', quiet: true });
    if (date === WATER_ISSUE && month % 2 === 0) out.push({ id: 'waterday', name: 'Water bill arrives', kind: 'bill', note: '', quiet: true });
    return out;
  }
}

// the calendar's own date math, without recursing into special() (which calls back into calendarEntries)
const BASE = Date.UTC(1999, 3, 1);
function ymdOf(day) { const t = new Date(BASE + (day - 1) * 86400000); return { month: t.getUTCMonth() + 1, date: t.getUTCDate() }; }
function nextMonthName(dt) { const m = dt.month % 12; return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m]; }
