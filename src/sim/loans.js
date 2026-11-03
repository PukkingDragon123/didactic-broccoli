// game.sim.loans: borrow from the Lane Credit Union.
//
// A loan is paid into your bank, costs a flat 6% for its 28-day term, and can be repaid in parts at any time. How much
// you can borrow grows with your shop level. Reminders come by mail a few days before the due date and on the day.
// Late: 1% of what's left is added every day (up to +30%), warning letters, no new loans, and from a week late the
// union collects what it can from your money every morning.
//
//   loans.offer() -> { max, rate, term }                 loans.take(amount) -> { ok, msg, loan }
//   loans.list() -> [{ id, principal, owed, paid, left, taken, due, daysLate, status }]
//   loans.repay(id, amount = everything left) -> { ok, msg }     loans.outstanding()
// Payments go through game.sim.payDigital / receiveDigital. Events: 'loan' { type, loan } (taken, repaid, late, collected).
import { ensureState } from '../game/stateExt.js';
import { formatYen } from '../core/util.js';

const RATE = 0.06, TERM = 28, LATE_DAILY = 0.01, LATE_CAP = 0.3, MIN = 5000;
const FROM = 'Lane Credit Union';

export class Loans {
  constructor(game, sim) {
    this.game = game;
    this.sim = sim;
    this.s = ensureState(game, 'loans', { list: [], nextId: 1, sent: {}, lastDay: 0 });
    game.calendar?.addSource((day) => this.s.list.filter((l) => !l.closed && l.due === day).map((l) => ({ id: `loan:${l.id}`, name: 'Loan repayment due', kind: 'bill', loan: l.id, note: formatYen(this.left(l)) })));
  }

  get day() { return this.game.clock?.day ?? 1; }
  limit() { return Math.min(2000000, 20000 + (this.game.progress?.level || 1) * 15000); }
  outstanding() { return this.s.list.filter((l) => !l.closed).reduce((a, l) => a + this.left(l), 0); }
  offer() { return { max: Math.max(0, Math.floor((this.limit() - this.outstanding()) / 1000) * 1000), min: MIN, rate: RATE, term: TERM, blocked: this.anyLate() ? 'You have a late loan' : null }; }
  anyLate() { return this.s.list.some((l) => !l.closed && this.day > l.due); }

  left(l) { return Math.max(0, Math.round(l.owed + (l.penalty || 0) - l.paid)); }

  view(l) {
    const late = l.closed ? 0 : Math.max(0, this.day - l.due);
    return { id: l.id, principal: l.principal, rate: l.rate, owed: Math.round(l.owed + (l.penalty || 0)), penalty: Math.round(l.penalty || 0), paid: l.paid, left: this.left(l), taken: l.taken, due: l.due, daysLate: late, closed: !!l.closed, status: l.closed ? 'repaid' : late ? 'late' : this.day === l.due ? 'due today' : 'open' };
  }
  list() { return this.s.list.map((l) => this.view(l)); }

  take(amount) {
    amount = Math.round(amount / 1000) * 1000;
    const o = this.offer();
    if (o.blocked) return { ok: false, msg: o.blocked };
    if (!(amount >= MIN)) return { ok: false, msg: `The smallest loan is ${formatYen(MIN)}` };
    if (amount > o.max) return { ok: false, msg: `You can borrow up to ${formatYen(o.max)} right now` };
    const l = { id: `L${this.s.nextId++}`, principal: amount, rate: RATE, owed: Math.round(amount * (1 + RATE)), paid: 0, penalty: 0, taken: this.day, due: this.day + TERM };
    this.s.list.push(l);
    this.sim.receiveDigital(amount, 'Loan from the Lane Credit Union', { income: false });
    this.mail(`Loan of ${formatYen(amount)} approved`, `The money is in your account. Please repay ${formatYen(l.owed)} by ${this.game.calendar?.format(l.due, true) || 'day ' + l.due}. You can pay it back early, in parts, on the computer.`);
    this.game.events.emit('loan', { type: 'taken', loan: this.view(l) });
    this.game.save?.();
    return { ok: true, msg: `${formatYen(amount)} borrowed`, loan: this.view(l) };
  }

  repay(id, amount = null) {
    const l = this.s.list.find((x) => x.id === id && !x.closed);
    if (!l) return { ok: false, msg: 'No such loan' };
    const left = this.left(l);
    const n = Math.min(left, Math.round(amount ?? left));
    if (!(n > 0)) return { ok: false, msg: 'Nothing to pay' };
    if (!this.sim.payDigital(n, 'Loan repayment')) return { ok: false, msg: 'Not enough money' };
    l.paid += n;
    const done = this.left(l) <= 0;
    if (done) { l.closed = this.day; if (this.day <= l.due) this.game.progress?.addXP(40, 'loan'); }
    this.game.events.emit('loan', { type: done ? 'repaid' : 'payment', loan: this.view(l) });
    this.game.save?.();
    return { ok: true, msg: done ? 'Loan repaid in full. Thank you!' : `Paid ${formatYen(n)}, ${formatYen(this.left(l))} left` };
  }

  /** Every new day: penalties, reminders, collection. */
  onDay(day) {
    for (const l of this.s.list) {
      if (l.closed) continue;
      const late = day - l.due;
      const once = (tag, fn) => { const k = `${l.id}:${tag}`; if (this.s.sent[k]) return; this.s.sent[k] = true; fn(); };
      if (late === -3) once('soon', () => this.mail('Loan repayment in 3 days', `${formatYen(this.left(l))} is due on ${this.game.calendar?.format(l.due, true)}.`));
      if (late === 0) once('today', () => this.mail('Loan repayment due today', `${formatYen(this.left(l))} is due today.`));
      if (late > 0 && day > (l.lastPenalty || l.due)) {
        const days = day - Math.max(l.lastPenalty || l.due, l.due);
        l.penalty = Math.min(l.owed * LATE_CAP, (l.penalty || 0) + (l.owed - l.paid) * LATE_DAILY * days);
        l.lastPenalty = day;
      }
      if (late >= 1) once('late', () => { this.mail('Your loan is overdue', `Late interest of 1% a day is being added. You now owe ${formatYen(this.left(l))}.`); this.game.events.emit('loan', { type: 'late', loan: this.view(l) }); });
      if (late >= 4) once('warn', () => this.mail('Second notice', 'Please repay your loan. From a week late we will collect payments from your account.'));
      if (late >= 7) {
        // collection: whatever you have, every morning
        const take = Math.min(this.left(l), Math.max(0, Math.floor((this.game.wallet?.bank ?? this.game.state.money) * 0.5)));
        if (take > 0 && this.sim.payDigital(take, 'Loan collection')) {
          l.paid += take;
          if (this.left(l) <= 0) l.closed = day;
          this.game.news?.('The credit union collected a payment', `${formatYen(take)} for your overdue loan`, 7000);
          this.game.events.emit('loan', { type: 'collected', loan: this.view(l), amount: take });
        }
      }
    }
  }

  mail(subject, body) {
    const g = this.game;
    if (g.os?.mail?.send) { try { g.os.mail.send({ from: FROM, subject, body, kind: 'loan' }); return; } catch (e) { console.warn('mail', e); } }
    g.news?.(subject, body.length > 90 ? body.slice(0, 88) + '...' : body, 7000);
  }
}
