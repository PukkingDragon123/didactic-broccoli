// Shinkin Online: the shop's bank on the computer. A statement of every yen in and out (game.addMoney / game.spend
// are wrapped, nothing else changes about them; pass a reason as their last argument to label the line), the bills
// (game.bills: list / pay), and business loans (game.sim.loans when the simulation has it, else a small local
// stand-in with the same calls: offer / list / take / repay).
// When money splits into cash and bank (game.wallet: { cash, bank }), the summary shows both.
//   game.os.bank.record(delta, label)   add a line yourself (for money that moves without addMoney / spend)
//   game.os.bank.label(text)            label the next addMoney / spend that comes without a reason
//   game.os.bank.history()              [{ t (stamp), d (delta), label, bal, n }] newest last
import { h, esc, ic, btn, tabs, table, group, loading } from './ui.js';
import { yen } from '../OS.js';
import { now, stampDate, stampText } from '../time.js';

const MAX_TX = 400;

export function installBank(game, os) {
  const st = os.st.bank ||= { tx: [], bal: null };
  if (st.bal == null) st.bal = game.state.money;
  let nextLabel = null;
  const bank = os.bank = {
    ctx: null, // set while a store page is open ('GACHA-MART web order')
    history: () => st.tx,
    label(t) { nextLabel = t; },
    record(d, label) {
      d = Math.round(d);
      if (!d) return;
      const t = now(game).stamp;
      // money that moved without addMoney / spend (old code paths): one adjustment line keeps the balance honest
      const drift = game.state.money - d - st.bal;
      if (Math.abs(drift) >= 1) push(t, drift, 'Balance adjustment');
      push(t, d, label);
      st.bal = game.state.money;
      if (os.wins.some((w) => w.app === 'bank')) bank.refresh?.();
    },
    sync() {
      const drift = game.state.money - st.bal;
      if (Math.abs(drift) >= 1) push(now(game).stamp, drift, 'Balance adjustment');
      st.bal = game.state.money;
    },
    cash: () => (game.wallet ? num(game.wallet.cash) : null),
    balance: () => (game.wallet ? num(game.wallet.bank ?? game.wallet.balance) : game.state.money),
  };
  function push(t, d, label) {
    const last = st.tx[st.tx.length - 1];
    if (last && last.label === label && Math.sign(last.d) === Math.sign(d) && t - last.t < 60 && Math.abs(d) < 5000) {
      last.d += d; last.n = (last.n || 1) + 1; last.t = t; last.bal = game.state.money;
    } else st.tx.push({ t, d, label, bal: game.state.money });
    if (st.tx.length > MAX_TX) st.tx.splice(0, st.tx.length - MAX_TX);
  }
  // wrap the two money functions (whatever they are by now) without changing what they do
  const add0 = game.addMoney.bind(game), spend0 = game.spend.bind(game);
  game.addMoney = (v, quiet, reason) => {
    const r = add0(v, quiet, reason);
    if (v) bank.record(v, (typeof reason === 'string' && reason) || take() || (v > 0 ? 'Shop takings' : 'Withdrawal'));
    return r;
  };
  game.spend = (v, reason) => {
    const ok = spend0(v, reason);
    if (ok && v) bank.record(-v, (typeof reason === 'string' && reason) || take() || bank.ctx || 'Purchase');
    return ok;
  };
  function take() { const l = nextLabel; nextLabel = null; return l; }

  bank.loans = () => game.sim?.loans || localLoans(game, os);

  bank.app = {
    id: 'bank', name: 'Shinkin Online', label: 'Shinkin Bank', icon: 'os_bank', group: 'Shop', w: 640, h: 470, minW: 520, minH: 360,
    about: 'Morio Shinkin Bank online banking client, version 2.1. "Your neighbourhood bank since 1952."',
    badge: () => (game.bills?.due?.() || []).filter((b) => b.due - (game.clock?.day ?? 1) <= 2).length,
    open(win, args) {
      win.body.classList.add('bk');
      let tabsApi = null;
      const build = () => {
        win.body.textContent = '';
        const head = h('div', { class: 'bk-head', html: `${ic('os_bank', 2)}<div><b>Morio Shinkin Bank</b><small>Online Banking</small></div><span class="bk-user">${ic('os_lock', 1)} Secure session - GACHA GARAGE</span>` });
        win.body.append(head);
        tabsApi = tabs(win.body, [
          { id: 'sum', label: 'Summary', render: summary },
          { id: 'stmt', label: 'Statement', render: statement },
          { id: 'bills', label: 'Bills', render: bills },
          { id: 'loans', label: 'Loans', render: loans },
        ], args.tab || 'sum');
        bank.sync();
      };
      bank.refresh = () => { if (tabsApi && win.el.isConnected) tabsApi.show(tabsApi.cur); };
      win.onArgs = (a) => { if (a?.tab && tabsApi) tabsApi.show(a.tab); };
      win.status('Connected', `${ic('os_lock', 1)} 40-bit`);
      loading(win, 'Connecting to Shinkin Online...', 700, build);
      win.onClose(() => { bank.refresh = null; });
    },
  };

  function money(n, cls = '') { return `<span class="bk-amt ${n < 0 ? 'neg' : ''} ${cls}">${yen(n)}</span>`; }

  function summary(p) {
    const cash = bank.cash();
    const t = now(game);
    p.append(h('div', { class: 'bk-acct' },
      h('div', { html: `<small>Business account</small><b>GACHA GARAGE</b><small>No. 0042-1999-0777 &middot; Ordinary deposit</small>` }),
      h('div', { class: 'bk-bal', html: `<small>Balance</small>${money(bank.balance(), 'big')}` })));
    if (cash !== null) p.append(h('div', { class: 'bk-acct', html: `<div><small>Cash on hand (wallet + register)</small></div><div class="bk-bal">${money(cash, 'big')}</div>` }));
    const due = game.bills?.due?.() || [];
    const L = bank.loans(), owed = L.outstanding?.() || 0;
    const rows = st.tx.slice(-6).reverse().map((x) => [stampText(game, x.t, t), esc(x.label) + (x.n > 1 ? ` <span class="c98-dim">(x${x.n})</span>` : ''), money(x.d)]);
    p.append(group('Recent activity', table([{ label: 'Date' }, { label: 'Description' }, { label: 'Amount', cls: 'num' }], rows, { cls: 'bk-t', empty: 'No transactions yet.' })));
    const notes = h('ul', { class: 'bk-notes' });
    if (due.length) notes.append(h('li', { html: `${ic('os_bill', 1)} ${due.length} bill${due.length > 1 ? 's' : ''} to pay: ${money(due.reduce((a, b) => a + b.amount, 0))}, next due ${esc(game.calendar?.format?.(due[0].due) || 'soon')}` }));
    if (owed) notes.append(h('li', { html: `${ic('wallet', 1)} Loans outstanding: ${money(owed)}` }));
    if (game.bills && !game.bills.powerOn) notes.append(h('li', { class: 'bad', html: `${ic('os_warn', 1)} Electricity supply suspended - pay the electricity bill to reconnect` }));
    if (!notes.children.length) notes.append(h('li', { html: `${ic('check', 1)} Nothing due. Have a nice day!` }));
    p.append(group('Notices', notes));
  }

  function statement(p) {
    bank.sync();
    const rows = st.tx.slice().reverse().map((x) => [stampDate(game, x.t), esc(x.label) + (x.n > 1 ? ` <span class="c98-dim">(x${x.n})</span>` : ''), x.d < 0 ? money(-x.d) : '', x.d > 0 ? money(x.d) : '', money(x.bal)]);
    const bar = h('div', { class: 'bk-bar' }, h('span', { text: `${st.tx.length} transactions` }), btn('Print...', () => os.alert('No printer is installed. To install a printer, open the Printers folder in Control Panel.', 'Print', 'warn'), { cls: 'small' }));
    p.append(bar, table([{ label: 'Date' }, { label: 'Description' }, { label: 'Withdrawals', cls: 'num' }, { label: 'Deposits', cls: 'num' }, { label: 'Balance', cls: 'num' }], rows, { cls: 'bk-t tall', empty: 'No transactions yet.' }));
  }

  function bills(p) {
    const B = game.bills;
    if (!B?.list) { p.append(h('p', { text: 'No bills are registered with this account.' })); return; }
    const day = game.clock?.day ?? 1, cal = game.calendar;
    const list = B.list().filter((b) => !b.paid || day - (b.paidDay ?? b.due) < 40).sort((a, b) => (a.paid - b.paid) || a.due - b.due);
    const rows = list.map((b) => {
      const status = b.paid ? '<span class="bk-ok">Paid</span>' : b.overdue || b.daysLate > 0 ? `<span class="bk-late">${b.daysLate || ''} days late</span>` : b.due - day <= 2 ? '<span class="bk-soon">Due soon</span>' : 'Open';
      const pay = b.paid ? '' : btn('Pay', async () => {
        const ok = await os.confirm(`Pay ${b.name} of ${yen(b.amount)} from account 0042-1999-0777?`, 'Confirm payment');
        if (!ok) return;
        const r = B.pay(b.id) || {};
        if (r.ok) { os.sound('osCoin'); bank.refresh?.(); } else os.alert(r.msg || 'The payment could not be made.', 'Payment failed', 'error');
      }, { cls: 'small' });
      return [esc(b.name), cal?.format?.(b.issued) || b.issued, cal?.format?.(b.due) || b.due, money(b.amount) + (b.lateFee ? ` <span class="c98-dim">incl. ${yen(b.lateFee)} late fee</span>` : ''), status, pay];
    });
    const total = B.total?.() || 0;
    p.append(h('div', { class: 'bk-bar' }, h('span', { html: `To pay: ${money(total)}` }), B.usage ? h('span', { class: 'c98-dim', text: `Electricity this period: ${Math.round(B.usage().kwh || 0)} kWh (about ${yen(B.usage().yen || 0)})` }) : null));
    p.append(table([{ label: 'Bill' }, { label: 'Issued' }, { label: 'Due' }, { label: 'Amount', cls: 'num' }, { label: 'Status' }, { label: '' }], rows, { cls: 'bk-t', empty: 'No bills. Rent is due on the 27th, electricity on the 20th.' }));
    if (!B.powerOn) p.append(h('p', { class: 'bk-late', html: `${ic('os_warn', 1)} The electricity has been cut off. Pay every electricity bill to reconnect.` }));
  }

  function loans(p) {
    const L = bank.loans();
    const o = L.offer();
    const list = L.list().filter((l) => l.status !== 'closed' || l.left > 0).slice(-8);
    const cal = game.calendar;
    const rows = list.map((l) => [cal?.format?.(l.taken) || l.taken, cal?.format?.(l.due) || l.due, money(l.owed), money(l.paid || 0), money(l.left),
      l.daysLate > 0 ? `<span class="bk-late">${l.daysLate} days late</span>` : esc(l.status || 'open'),
      l.left > 0 ? btn('Repay...', () => repay(L, l), { cls: 'small' }) : '']);
    p.append(group('Your loans', table([{ label: 'Taken' }, { label: 'Due' }, { label: 'Owed', cls: 'num' }, { label: 'Paid', cls: 'num' }, { label: 'Left', cls: 'num' }, { label: 'Status' }, { label: '' }], rows, { cls: 'bk-t', empty: 'You have no loans.' })));
    const g2 = group('Business loan application');
    if (o.blocked) g2.append(h('p', { class: 'bk-late', text: `${o.blocked}. New loans are not available.` }));
    else if (o.max < (o.min || 5000)) g2.append(h('p', { text: 'Your credit limit is used up. Repay a loan, or grow your shop to borrow more.' }));
    else {
      const sel = h('select', { class: 'c98-field' });
      for (let a = o.min || 5000; a <= o.max; a += a < 50000 ? 5000 : 25000) sel.append(h('option', { value: a, text: yen(a) }));
      const terms = h('p', { class: 'c98-dim' });
      const upd = () => { const a = +sel.value; terms.textContent = `Repay ${yen(Math.round(a * (1 + o.rate)))} within ${o.term} days (${Math.round(o.rate * 100)}% flat fee). Late repayments cost 1% a day.`; };
      sel.addEventListener('change', upd); upd();
      g2.append(h('div', { class: 'bk-row' }, h('label', { text: 'Amount:' }), sel, btn('Apply', async () => {
        const a = +sel.value;
        if (!(await os.confirm(`Borrow ${yen(a)} from the Lane Credit Union?\nYou will owe ${yen(Math.round(a * (1 + o.rate)))} in ${o.term} days.`, 'Loan agreement'))) return;
        const r = L.take(a) || {};
        if (r.ok) { os.sound('osCoin'); os.alert(r.msg || `${yen(a)} has been paid into your account.`, 'Loan approved', 'info'); bank.refresh?.(); }
        else os.alert(r.msg || 'Your application was declined.', 'Loan declined', 'error');
      }, { cls: 'def' })), terms, h('p', { class: 'c98-dim', text: `Credit limit available: ${yen(o.max)}` }));
    }
    p.append(g2);
  }

  async function repay(L, l) {
    const r = await os.dialog({ title: 'Repay loan', icon: 'question', text: `Left to repay: ${yen(l.left)}\nHow much do you want to repay now?`, input: { value: String(Math.min(l.left, Math.max(0, Math.floor(bank.balance())))) }, buttons: [{ label: 'Repay', value: 'ok', default: true }, { label: 'Cancel', value: null, cancel: true }] });
    if (!r || r.value !== 'ok') return;
    const a = Math.round(+String(r.input).replace(/[^0-9]/g, ''));
    if (!(a > 0)) return;
    const res = L.repay(l.id, Math.min(a, l.left)) || {};
    if (res.ok) { os.sound('osCoin'); bank.refresh?.(); } else os.alert(res.msg || 'Not enough money in the account.', 'Repayment failed', 'error');
  }
}

const num = (v) => (typeof v === 'function' ? v() : Number(v) || 0);

/** Loans without the simulation: same calls as game.sim.loans (5% for 14 days, 1% a day late). */
function localLoans(game, os) {
  if (os._localLoans) return os._localLoans;
  const s = os.st.loans ||= { list: [], nextId: 1 };
  const day = () => now(game).day;
  const left = (l) => Math.max(0, Math.round(l.owed * (1 + Math.min(0.3, Math.max(0, day() - l.due) * 0.01)) - l.paid));
  const view = (l) => ({ ...l, left: left(l), daysLate: Math.max(0, day() - l.due), status: left(l) <= 0 ? 'closed' : day() > l.due ? 'late' : 'open' });
  const L = os._localLoans = {
    offer: () => ({ max: Math.max(0, 30000 - L.outstanding()), min: 5000, rate: 0.05, term: 14, blocked: s.list.some((l) => left(l) > 0 && day() > l.due) ? 'You have a late loan' : null }),
    list: () => s.list.map(view),
    outstanding: () => s.list.reduce((a, l) => a + left(l), 0),
    take(amount) {
      const o = L.offer();
      if (o.blocked || amount > o.max) return { ok: false, msg: 'This amount is over your credit limit.' };
      const l = { id: s.nextId++, principal: amount, owed: Math.round(amount * 1.05), paid: 0, taken: day(), due: day() + 14 };
      s.list.push(l);
      game.addMoney(amount, false, 'Business loan');
      return { ok: true, msg: `${yen(amount)} has been paid into your account.`, loan: view(l) };
    },
    repay(id, amount = null) {
      const l = s.list.find((x) => x.id === id);
      if (!l) return { ok: false, msg: 'No such loan.' };
      const a = Math.min(amount ?? left(l), left(l));
      if (!game.spend(a, 'Loan repayment')) return { ok: false, msg: 'Not enough money in the account.' };
      l.paid += a;
      if (left(l) <= 0) game.events.emit('loan', { type: 'repaid', loan: view(l) });
      return { ok: true, msg: `${yen(a)} repaid.` };
    },
  };
  return L;
}
