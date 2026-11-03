// game.growth: renting and buying property to grow the home and the shop (the owner's wish: "more rooms, buy the
// nearby empty building, upgrade to a shop with an escalator and elevator, mall level").
//
//   Listings (src/growth/data.js) are on Ota Real Estate's website (src/growth/site.js) and Mrs. Ota will talk you
//   through them at her gate. Each one unlocks at a shop level (src/data/unlocks.js, 'estate:*'), needs the one before
//   it, and is sealed with a paper contract (src/growth/paper.js). Then:
//     home103  flat 103 next door joins yours: kitchen (cook), bathroom (ofuro), back room (src/places/room/Extension.js)
//     hobby    the back room becomes a hobby room for your collection
//     annex    the old tobacco shop: renovate it in small physical steps, then 6 machine spots and its own customers
//              (src/growth/annex/Annex.js)
//     mall     GACHA KAIKAN by the station: four floors (each its own zone) joined by escalators and a lift; machine
//              spots you fill, walls of route machines (commission), crowds (src/growth/mall/Mall.js); mall2..mall4 fit
//              out the floors above
//   Money: down payments / key money now (bank); leases, mortgage instalments and building fees become monthly bills
//   (game.bills: issued on the 20th, due the 27th). A shop whose payments are two weeks late is closed by the bank
//   until they're paid.
//
//   growth.status(id) -> { state: 'locked' | 'needs' | 'available' | 'done', why, level }
//   growth.apply(id) -> Promise<bool>       the contract, payment and handover
//   growth.loans() -> [{ id, prop, name, monthly, left, months, paid }]     growth.payoff(loanId) -> { ok, msg }
//   growth.monthly() -> [{ name, amount }]  what you pay every month          growth.has(id) -> bool
//   growth.machineRecords() -> { annex: [data], mall1: [data], ... }   the machines outside the garage, as save records
//       (for staff later: restock data.stock / empty data.cash; a built machine also has .updateCoins() / .updateSoldOut())
// Events: 'growth' { type: 'signed', id } | { type: 'annexStep', id, step } | { type: 'annexOpen' }; 'zonePlay' (a customer's turn on an
// annex / Kaikan machine), 'cooked', 'bath'. Save: game.state.growth.
import { ensureState } from '../game/stateExt.js';
import { registerBillKind } from '../sim/bills.js';
import { LISTINGS, LISTING, BILLS, AGENT, BANK, SITE_URL, instalment, downPayment, yen } from './data.js';
import { contract } from './paper.js';
import { sfx } from './kit.js';
import { bgm } from '../core/bgm.js';

export const ACHIEVEMENTS = [
  { id: 'gr_103', name: 'Room to Breathe', desc: 'Rent the flat next door', icon: 'os_star' },
  { id: 'gr_bath', name: 'Ii Yu Da Na', desc: 'Take a hot bath at home', icon: 'os_star' },
  { id: 'gr_cook', name: 'Home Cooking', desc: 'Cook a meal in your own kitchen', icon: 'os_star' },
  { id: 'gr_hobby', name: 'The Collection Room', desc: 'Open your hobby room', icon: 'os_trophy' },
  { id: 'gr_annex', name: 'Sold As Seen', desc: 'Buy the old tobacco shop', icon: 'os_trophy' },
  { id: 'gr_annex_open', name: 'Second Shop', desc: 'Renovate and open the shop annex', icon: 'os_trophy', reward: 3000 },
  { id: 'gr_mall', name: 'Gacha Kaikan', desc: 'Buy the building by the station', icon: 'os_trophy', reward: 10000 },
  { id: 'gr_escalator', name: 'Going Up', desc: 'Ride an escalator in your own building', icon: 'os_star' },
  { id: 'gr_elevator', name: 'Muzak Appreciator', desc: 'Take the lift in your own building', icon: 'os_star' },
  { id: 'gr_floors', name: 'Department Store', desc: 'Open all four floors of the Kaikan', icon: 'os_trophy', reward: 50000 },
  { id: 'gr_crowd', name: 'Rush Hour', desc: '40 customers in the Kaikan in one day', icon: 'os_trophy', max: 40 },
  { id: 'gr_debt', name: 'Free and Clear', desc: 'Pay off a mortgage', icon: 'os_trophy' },
];

export class Growth {
  constructor(game) {
    this.game = game;
    game.growth = this;
    this.s = ensureState(game, 'growth', {
      v: 1, done: {}, leases: {}, loans: [], nextLoan: 1, lastDay: 0, mailed: {}, ach: {},
      annex: { step: 0, tasks: {}, open: false, customers: 0 },
      mall: { floors: 0, elev: 1, customers: 0, today: 0, commission: 0 },
      home: { cooked: {}, bathDay: 0, bathFull: false },
      machines: {}, stats: {},
    });
    for (const [kind, b] of Object.entries(BILLS)) registerBillKind(kind, b.name, b.from);
    const ev = game.events;
    ev.on('newDay', ({ day }) => this.onDay(day));
    ev.on('levelUp', () => this.mailNew());
    ev.on('bill', (e) => this.onBill(e));
    this.onDay(game.clock?.day ?? 1);
    game.calendar?.addSource?.((day) => this.calendarEntries(day));
  }

  get day() { return this.game.clock?.day ?? 1; }
  has(id) { return !!this.s.done[id]; }
  machineRecords() { return this.s.machines; }

  // ------------------------------------------------------------------ listings
  status(id) {
    const L = LISTING[id], g = this.game;
    if (!L) return { state: 'locked', why: 'Not for sale' };
    if (this.has(id)) return { state: 'done', why: L.kind === 'lease' ? 'Leased' : L.kind === 'buy' ? 'Owned' : 'Done' };
    const lv = g.progress?.levelFor(L.unlock) ?? 1;
    if (g.progress && !g.progress.unlocked(L.unlock)) return { state: 'locked', why: `From shop level ${lv}`, level: lv };
    const need = (L.need || []).find((n) => !this.has(n));
    if (need) return { state: 'needs', why: `First: ${LISTING[need].name}`, level: lv };
    return { state: 'available', why: '', level: lv };
  }

  /** Contract rows for a listing. */
  terms(L) {
    const rows = [];
    const now = downPayment(L);
    if (L.kind === 'lease') { rows.push(['Key money (reikin)', yen(L.price)], ['Monthly rent', `${yen(L.monthly)} / month`]); }
    if (L.kind === 'buy') {
      const rest = L.price - now;
      rows.push(['Purchase price', yen(L.price)], [`Down payment (${Math.round(L.down * 100)}%)`, yen(now)], [`Mortgage, ${BANK}`, yen(rest)],
        [`${L.months} instalments at ${Math.round(L.rate * 100)}%`, `${yen(instalment(rest, L.rate, L.months))} / month`]);
      if (L.fees) rows.push(['Building fees', `${yen(L.fees)} / month`]);
    }
    if (L.kind === 'renovate' || L.kind === 'fitout') rows.push(['Works', yen(L.price)]);
    return { rows, now };
  }

  /** Show the contract; on your seal, pay and hand over. */
  async apply(id) {
    const g = this.game, L = LISTING[id], st = this.status(id);
    if (!L || st.state !== 'available') { g.news?.(L?.name || 'Not available', st.why || ''); return false; }
    if (this.busy) return false;
    this.busy = true;
    try {
      const { rows, now } = this.terms(L);
      const party = L.kind === 'fitout' ? 'Morio Interior Works' : L.kind === 'buy' ? `${AGENT} (for the seller) and ${BANK}` : L.id === 'hobby' ? 'Ota Real Estate (works by Kenji Ota, carpenter)' : AGENT;
      const bank = () => (g.wallet ? g.wallet.bank : g.state.money);
      const ok = await contract(g, {
        kind: L.kind, title: L.name, jp: L.jp, party, rows, total: now, clauses: L.terms, note: L.short,
        check: () => (bank() < now ? `Your bank account is short: ${yen(now)} needed, ${yen(bank())} in the bank. Deposit cash at the ATM.` : null),
      });
      if (!ok) return false;
      if (!g.sim?.payDigital(now, `estate:${id}`)) { g.news?.('The bank declined the transfer', `${yen(now)} needed`); sfx('error', { vol: 0.4 }); return false; }
      this.complete(id);
      return true;
    } finally { this.busy = false; }
  }

  /** Hand the property over (also used by the debug helpers). */
  complete(id) {
    const g = this.game, L = LISTING[id];
    if (this.has(id)) return;
    this.s.done[id] = this.day;
    if (L.kind === 'lease') this.s.leases[id] = { monthly: L.monthly, since: this.day, kind: 'lease103' };
    if (L.kind === 'buy') {
      const rest = L.price - downPayment(L);
      const monthly = instalment(rest, L.rate, L.months);
      this.s.loans.push({ id: `M${this.s.nextLoan++}`, prop: id, kind: id === 'annex' ? 'annexLoan' : 'mallLoan', principal: rest, rate: L.rate, months: L.months, monthly, left: Math.round(rest * (1 + L.rate)), taken: this.day });
      if (L.fees) this.s.leases[id] = { monthly: L.fees, since: this.day, kind: 'mallFees' };
    }
    if (id === 'mall') this.s.mall.floors = Math.max(1, this.s.mall.floors);
    if (L.floor) this.s.mall.floors = Math.max(this.s.mall.floors, L.floor);
    g.progress?.addXP(L.kind === 'buy' ? 400 : 150, 'estate');
    try { bgm.stinger('jingle_task'); } catch { /* no music */ }
    const ach = { home103: 'gr_103', hobby: 'gr_hobby', annex: 'gr_annex', mall: 'gr_mall' }[id];
    if (ach) this.give(ach);
    if (this.s.mall.floors >= 4) this.give('gr_floors');
    this.mail(id);
    this.mailNew(); // the next listing may be open now
    g.events.emit('growth', { type: 'signed', id });
    g.save?.();
  }

  // ------------------------------------------------------------------ money: leases, mortgages, fees
  loans() { return this.s.loans.map((l) => ({ ...l, name: LISTING[l.prop]?.name || l.prop, paid: l.closed || null })); }
  monthly() {
    const out = [];
    for (const [id, l] of Object.entries(this.s.leases)) out.push({ id, name: BILLS[l.kind]?.name || id, amount: l.monthly, kind: l.kind });
    for (const l of this.s.loans) if (!l.closed) out.push({ id: l.id, name: BILLS[l.kind]?.name || l.prop, amount: Math.min(l.monthly, l.left), kind: l.kind, loan: l.id });
    return out;
  }

  onDay(day) {
    const cal = this.game.calendar, B = this.game.bills;
    if (!cal || !B) return;
    for (let d = Math.max(this.s.lastDay + 1, 2); d <= day; d++) {
      const dt = cal.dateOf(d);
      if (dt.date !== 20) continue;
      const due = cal.dayOf(dt.year, dt.month, 27);
      for (const [id, l] of Object.entries(this.s.leases)) if (l.since < d) B.issue(l.kind, l.monthly, d, due, `${LISTING[id]?.name || id}, ${monthName(dt.month)}`, { estate: id });
      for (const l of this.s.loans) {
        if (l.closed || l.taken >= d) continue;
        const amount = Math.min(l.monthly, l.left - this.pendingFor(l));
        if (amount > 0) B.issue(l.kind, amount, d, due, `Instalment, ${LISTING[l.prop]?.name || l.prop}`, { estate: l.prop, loan: l.id });
      }
    }
    this.s.lastDay = Math.max(this.s.lastDay, day);
    this.checkLate(day);
  }
  /** Instalments issued but not paid yet. */
  pendingFor(l) { return (this.game.bills?.s.list || []).filter((b) => b.loan === l.id && !b.paid).reduce((a, b) => a + b.amount, 0); }

  onBill({ type, bill }) {
    if (type !== 'paid' || !bill) return;
    const raw = this.game.bills?.s.list.find((b) => b.id === bill.id);
    if (!raw?.loan) return;
    const l = this.s.loans.find((x) => x.id === raw.loan);
    if (!l || l.closed) return;
    l.left = Math.max(0, l.left - raw.amount);
    if (l.left <= 0) this.closeLoan(l);
  }
  closeLoan(l) {
    l.closed = this.day;
    l.left = 0;
    this.give('gr_debt');
    this.game.os?.mail?.send?.({ from: BANK, subject: 'Your mortgage is paid off', body: `Congratulations! The mortgage on ${LISTING[l.prop]?.name || 'your property'} is fully repaid. The building is yours, free and clear.\n\n${BANK}, Morio Station branch` });
    this.game.news?.('Mortgage paid off!', LISTING[l.prop]?.name || '', 6000);
  }
  /** Pay the rest of a mortgage now (bills already issued for it are settled too). */
  payoff(id) {
    const g = this.game, l = this.s.loans.find((x) => x.id === id && !x.closed);
    if (!l) return { ok: false, msg: 'No such mortgage' };
    if (!g.sim?.payDigital(l.left, 'Mortgage payoff')) return { ok: false, msg: `Not enough in the bank (${yen(l.left)})` };
    for (const b of g.bills?.s.list || []) if (b.loan === l.id && !b.paid) { b.paid = this.day; b.lateFeePaid = 0; }
    this.closeLoan(l);
    g.save?.();
    return { ok: true, msg: `Paid off: ${yen(l.principal)} mortgage closed` };
  }

  /** Two weeks late on a shop's payments: the bank closes it until they're paid. */
  closedByBank(prop) {
    const day = this.day;
    return (this.game.bills?.s.list || []).some((b) => b.estate === prop && !b.paid && day - b.due >= 14);
  }
  checkLate(day) {
    for (const b of this.game.bills?.s.list || []) {
      if (!b.estate || b.paid || day - b.due < 14) continue;
      const k = `late:${b.id}`;
      if (this.s.mailed[k]) continue;
      this.s.mailed[k] = true;
      const name = LISTING[b.estate]?.name || b.estate;
      if (b.estate === 'home103') this.game.os?.mail?.send?.({ from: AGENT, subject: 'About the rent for 103', body: 'The rent for 103 is two weeks late. I am not a charity.\n\nOta' });
      else this.game.os?.mail?.send?.({ from: BANK, subject: `NOTICE: ${name} is closed`, body: `Your payments for ${name} are more than two weeks overdue. The premises are closed to customers until every outstanding payment is settled.\n\n${BANK}` });
    }
  }

  calendarEntries(day) {
    // (own date math: calendar.dateOf asks the sources for specials, which would come back here)
    if (ymd(day).date !== 20 || !this.monthly().length) return [];
    return [{ id: 'estate', name: 'Property bills arrive', kind: 'bill', note: yen(this.monthly().reduce((a, m) => a + m.amount, 0)), quiet: true }];
  }

  // ------------------------------------------------------------------ mail, achievements
  /** Ota Real Estate writes when a listing becomes available. */
  mailNew() {
    const g = this.game;
    for (const L of LISTINGS) {
      if (this.status(L.id).state !== 'available' || this.s.mailed['new:' + L.id]) continue;
      this.s.mailed['new:' + L.id] = true;
      const body = L.kind === 'fitout'
        ? `The fitters can start on the ${L.floor}F of the Kaikan whenever you're ready: ${yen(L.price)}. ${L.blurb}\n\nSee ${SITE_URL}`
        : `${L.name}: ${L.blurb}\n\n${L.kind === 'lease' ? `Key money ${yen(L.price)}, rent ${yen(L.monthly)} a month.` : L.kind === 'buy' ? `${yen(L.price)} (${Math.round(L.down * 100)}% down, the rest on a mortgage).` : yen(L.price)}\nRead the details on our website: ${SITE_URL}\nOr ring my bell. I'm always home.\n\nK. Ota, Ota Real Estate`;
      g.os?.mail?.send?.({ from: AGENT, subject: L.kind === 'fitout' ? `Kaikan ${L.floor}F: ready to fit out` : `New for you: ${L.name}`, body });
      if (!g.os?.mail?.send) g.news?.(`New listing: ${L.name}`, 'Ota Real Estate (on the computer)', 6000);
    }
  }
  mail(id) {
    const L = LISTING[id], g = this.game;
    const bodies = {
      home103: 'The connecting door to 103 is in. It\'s where the old bath door was, in your kitchen. Keep it shut in winter.\nRent is on the 27th, with the garage. Don\'t forget.\n\nOta',
      hobby: 'Kenji finished the cabinets in your back room. Glass cleaned, lights in. It looks like a museum. A very small one.\n\nOta',
      annex: 'The keys to the old tobacco shop are under the vending machine. Mr. Sugimoto says good luck and sorry about the junk.\nMorio Shinkin will send you the mortgage papers.\n\nOta',
      mall: 'Congratulations on your purchase of the Kaikan building by Morio Station. The ground floor is ready to trade. The lift has been inspected (sticker inside).\nTake the east underpass towards the station to get there.\n\nMorio Station Building Co.',
    };
    const body = bodies[id] || `${L.name}: the works are finished. ${L.blurb}`;
    g.os?.mail?.send?.({ from: id === 'mall' || L.kind === 'fitout' ? 'Morio Station Building Co.' : AGENT, subject: `${L.name}: ${L.kind === 'buy' ? 'the keys' : L.kind === 'lease' ? 'welcome' : 'finished'}`, body });
    g.news?.(`${L.name}`, { home103: 'Flat 103 joins yours: the door is in your kitchen', hobby: 'Your hobby room in 103 is ready', annex: 'The old tobacco shop is yours. Time to clear it out.', mall: 'GACHA KAIKAN is yours: east underpass, toward the station', mall2: 'The 2nd floor is open', mall3: 'The 3rd floor is open', mall4: 'The 4th floor is open' }[id] || '', 7000);
  }

  give(id) {
    if (this.s.ach[id] || this.game.visiting) return;
    this.s.ach[id] = this.day;
    const A = this.game.os?.achievements;
    if (A?.unlock) { try { A.unlock(id); } catch (e) { console.warn('achievement', e); } }
  }
  /** Progress toward an achievement with a max (when the cabinet supports progress bars). */
  count(id, n) { try { this.game.os?.achievements?.count?.(id, n); } catch { /* older cabinet */ } }
  defineAchievements() {
    const A = this.game.os?.achievements;
    if (!A?.define) return;
    for (const a of ACHIEVEMENTS) A.define(a);
    for (const id of Object.keys(this.s.ach)) if (!A.has?.(id)) A.unlock(id);
  }

  // ------------------------------------------------------------------ Mrs. Ota at her gate (src/npc/doors.js)
  /** Add the property talk to her chat, without touching doors.js: wrap the resident she's built from. */
  hookOta() {
    const D = this.game.doors;
    if (!D?.resident || D._growthHooked) return;
    D._growthHooked = true;
    const orig = D.resident.bind(D);
    D.resident = (H) => {
      const n = orig(H);
      if (n && H.res === 'ota' && !n._growth) {
        n._growth = true;
        const R = n.res;
        n.res = { ...R, chat: (L, nn, first) => this.otaChat(R.chat(L, nn, first)) };
      }
      return n;
    };
  }
  otaChat(sc) {
    try {
      const start = sc?.start;
      const last = Array.isArray(start) ? start[start.length - 1] : null;
      if (last?.choose) last.choose.unshift({ text: 'Any more space to rent?', then: this.otaLines() });
    } catch (e) { console.warn('ota chat', e); }
    return sc;
  }
  otaLines() {
    const g = this.game;
    const offer = (id, lines) => [...lines, { choose: [
      { text: 'Show me the papers.', then: [{ do: () => this.apply(id).then((ok) => { this._otaOk = ok; }) }, { if: () => this._otaOk, then: [pickLine(id)], else: ['Hmph. Changed your mind. Typical.'] }] },
      { text: 'Let me think about it.', then: ['Don\'t think too long. Places go.'] },
    ] }];
    const pickLine = (id) => ({ home103: 'There. 103 is yours too. Kenji will put the door in today. Don\'t scuff my walls.', hobby: 'Glass cabinets. For TOYS. Well, it\'s your money.', annex: 'There. Sugimoto-san will be glad. Mind the junk in there. And the rats.' }[id] || 'Good.');
    for (const id of ['home103', 'hobby', 'annex']) {
      const st = this.status(id);
      if (st.state === 'available') {
        if (id === 'home103') return offer(id, ['103, next to yours, is empty. Has been since the student left.', 'My nephew Kenji can put a door through the old bath wall. Kitchen with gas, a real tiled bath.', `${yen(LISTING.home103.price)} key money, ${yen(LISTING.home103.monthly)} a month on top of your rent.`]);
        if (id === 'hobby') return offer(id, ['That back room in 103. Kenji could fit glass cabinets for your little toys.', `${yen(LISTING.hobby.price)}. Lights included. Don't ask me to dust them.`]);
        if (id === 'annex') return offer(id, ['The old Sugimoto tobacco shop. I manage it for the family. They want to sell.', `${yen(LISTING.annex.price)}. A quarter down, Morio Shinkin lends the rest. It's full of junk. That's free.`]);
      }
      if (st.state === 'locked' && !this.has(id)) {
        return [{ say: id === 'home103' ? 'More space? You can barely run one garage. Come back when that shop is doing properly.' : 'Not now. Get that shop of yours doing better first.' }, { say: `(Needs shop level ${st.level})`, style: 'think' }];
      }
    }
    if (this.status('mall').state === 'available') return ['The big empty building by the station? Not mine. The bank\'s.', 'It\'s on my website though. I list it for them. www.ota-fudosan.co.jp. Yes, I have a website.'];
    if (this.has('mall')) return ['You bought the station building. A gacha DEPARTMENT STORE. Your grandfather would have laughed for a week.', 'Pay your rent anyway.'];
    return ['Everything I have is on my website. www.ota-fudosan.co.jp.', 'Yes, I have a website. It\'s 1999. Even landladies have websites.'];
  }
}

const BASE = Date.UTC(1999, 3, 1);
function ymd(day) { const t = new Date(BASE + (day - 1) * 86400000); return { month: t.getUTCMonth() + 1, date: t.getUTCDate() }; }
function monthName(m) { return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][(m - 1) % 12]; }
