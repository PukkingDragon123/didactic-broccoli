// The Staff Rota: a little Capsule 98 program for the team. The week at a glance (who works when, days off, sick days,
// today's column), and a card per person: portrait, job, hours, day off, wage, morale, what they did today, what they
// asked for, and the buttons (a raise, a promotion, letting them go). Changes here are the same as telling them in
// person (game.staff.setRole / setHours / setDayOff / raise / promote / fire).
import { h, esc, ic, btn } from '../os/apps/ui.js';
import { formatYen } from '../core/util.js';
import { ROLES, HOURS, WEEKDAY, QUIRKS, shiftText, weekdayOf } from './data.js';
import { starsFor } from './applicants.js';
import { portraitLater, portraitCached } from './looks.js';
import { INSPIRED } from './Staff.js';
import './staff.css';

const yen = formatYen;
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function installRota(game, staff) {
  const os = game.os;
  if (!os?.registerApp) return;
  os.registerApp({
    id: 'rota', name: 'Staff Rota', label: 'Staff Rota', icon: 'os_rota', group: 'Shop', w: 700, h: 520, minW: 520, minH: 360,
    unlocked: () => staff.unlocked(), lockedText: `You have no staff yet. Hiring opens at shop level ${game.progress?.levelFor('staff:1') ?? 10} (Inspired).`,
    about: 'Staff Rota 2.1 - shifts, jobs and payroll for small shops. (c) 1999 Tanaka Soft',
    badge: () => staff.list().filter((r) => r.request).length,
    open(win) { rota(game, staff, os, win); },
  });
}

function rota(game, staff, os, win) {
  win.body.classList.add('rt');
  let sel = staff.list()[0]?.id || null;
  const draw = () => {
    const B = win.body;
    const scroll = B.querySelector('.rt-cards')?.scrollTop || 0;
    B.textContent = '';
    const team = staff.list(), bill = staff.wageBill(), day = game.clock?.day ?? 1;
    const cal = game.calendar;
    win.status(`${team.length} of ${staff.slots()} staff`, `Wages so far this week: ${yen(bill.total)}`, `Payday: ${bill.inDays === 7 ? 'today' : WEEKDAY[weekdayOf(bill.payday)]} (${bill.inDays} d)`);
    if (!team.length) {
      B.append(h('div', { class: 'rt-empty' }, h('div', { html: ic('os_rota', 4) }), h('p', { text: 'No staff yet.' }), h('p', { class: 'rt-dim', text: 'Post a job ad on Inspired, interview the applicants at your shop, and hire someone.' }), btn('Open Inspired', () => os.browser?.open(INSPIRED), { icon: 'os_inspired' })));
      return;
    }
    // the week: today and the six days after it
    const days = Array.from({ length: 7 }, (_, i) => day + i);
    const grid = h('table', { class: 'rt-week' });
    grid.append(h('tr', null, h('th', { text: '' }), ...days.map((d, i) => { const dt = cal?.dateOf(d); return h('th', { class: i === 0 ? 'today' : '', html: `${WD[dt?.weekday ?? 0]}<br><small>${dt ? `${dt.month}/${dt.date}` : d}</small>` }); })));
    for (const r of team) {
      grid.append(h('tr', { class: r.id === sel ? 'sel' : '', onclick: () => { sel = r.id; draw(); } }, h('td', { class: 'rt-n', text: r.given }), ...days.map((d, i) => {
        const wd = weekdayOf(d);
        const off = wd === r.dayOff, sick = (r.offDays || []).includes(d), before = (r.start || 0) > d;
        const txt = before ? '-' : off ? 'OFF' : sick ? (d === day ? 'SICK' : 'OFF') : shiftText(r.hours).replace(':00', '').replace(':00', '');
        return h('td', { class: `${i === 0 ? 'today ' : ''}${off || sick ? 'off' : before ? 'na' : 'on'} r-${r.role}`, text: txt });
      })));
    }
    B.append(h('div', { class: 'rt-top' }, grid));
    // the cards
    const cards = h('div', { class: 'rt-cards' });
    for (const r of team) cards.append(card(r));
    B.append(cards);
    cards.scrollTop = scroll;
  };

  const card = (r) => {
    const g = game, w = staff.worker(r.id);
    const img = h('img', { class: 'rt-ph', alt: '' });
    const hit = portraitCached(r.look, { size: 48, uniform: true });
    if (hit) img.src = hit; else portraitLater(g, r.look, (u) => { img.src = u; }, { size: 48, uniform: true });
    const sel1 = (opts, val, on) => { const s = h('select', { class: 'c98-field' }, ...opts.map(([v, t]) => h('option', { value: v, selected: v === val ? true : undefined, text: t }))); s.addEventListener('change', () => { on(s.value); draw(); }); return s; };
    const roleSel = sel1(Object.values(ROLES).map((x) => [x.id, `${x.name}  ${'*'.repeat(Math.round(starsFor(r, x.id)))}`]), r.role, (v) => staff.setRole(r.id, v));
    const hourSel = sel1(Object.values(HOURS).filter((x) => !r.nightOnly || ['evening', 'night'].includes(x.id)).map((x) => [x.id, `${x.name} ${shiftText(x.id)}`]), r.hours, (v) => staff.setHours(r.id, v));
    const offSel = sel1(WEEKDAY.map((d, i) => [String(i), d]), String(r.dayOff), (v) => staff.setDayOff(r.id, +v));
    const m = Math.round(r.morale ?? 60);
    const mood = m >= 75 ? 'Happy' : m >= 50 ? 'Okay' : m >= 25 ? 'Fed up' : 'Miserable';
    const doing = w ? (w.job?.label || w.mood?.label || (w.state === 'coming' ? 'on the way in' : w.state === 'leaving' ? 'going home' : 'at their post')) : staff.onShift(r) ? 'on the way' : 'off shift';
    const log = (r.log || []).slice(-4).reverse().map((e) => h('li', { text: `${clock(e.t)} ${e.text}` }));
    const quirk = (r.quirks || []).map((q) => QUIRKS[q]?.name).filter(Boolean).join(', ');
    const el = h('div', { class: `rt-card${r.id === sel ? ' sel' : ''}` },
      h('div', { class: 'rt-l' }, h('span', { class: 'rt-phw', style: { background: r.color || '#e8dcc0' } }, img), h('div', { class: `rt-mood m${Math.min(3, Math.floor(m / 25))}`, text: mood }), h('div', { class: 'rt-mbar' }, h('i', { style: { width: `${m}%` } }))),
      h('div', { class: 'rt-m' },
        h('div', { class: 'rt-name', html: `<b>${esc(r.name)}</b>${r.title ? ` <span class="rt-title">${esc(r.title)}</span>` : ''} <span class="rt-dim">${r.age > 120 ? 'age ' + r.age : r.age}${quirk ? ' &middot; ' + esc(quirk) : ''}</span>` }),
        h('div', { class: 'rt-now', html: `${ic(w ? 'os_star' : 'os_info', 1)} ${esc(doing)} &middot; ${yen(r.wage)}/h &middot; ${(r.hoursWeek || 0).toFixed(1)} h this week (${yen(Math.round((r.hoursWeek || 0) * r.wage / 10) * 10)})${r.owed ? ` &middot; <b class="rt-bad">owed ${yen(r.owed)}</b>` : ''}` }),
        h('div', { class: 'rt-row' }, h('label', { text: 'Job' }), roleSel, h('label', { text: 'Hours' }), hourSel, h('label', { text: 'Day off' }), offSel),
        r.request ? h('div', { class: 'rt-req', html: `${ic('os_chat', 1)} <b>${esc(r.given)} asked:</b> "${esc(r.request.ask)}" <span class="rt-dim">(answer in person)</span>` }) : null,
        log.length ? h('ul', { class: 'rt-log' }, ...log) : h('div', { class: 'rt-dim', text: 'Nothing logged yet.' }),
        h('div', { class: 'rt-btns' },
          btn(`Raise +${yen(50)}/h`, () => { staff.raise(r.id, 50); draw(); }),
          btn('Promote', async () => { if (await os.confirm(`Promote ${r.name} to ${r.arch === 'salaryman' ? 'Deputy Section Chief' : 'shift leader'}? (+${yen(100)}/h)`, 'Staff Rota')) { staff.promote(r.id); draw(); } }, { disabled: !!r.title }),
          btn('Let go...', async () => { if (await os.confirm(`Let ${r.name} go? They'll be paid what they're owed and leave today.`, 'Staff Rota')) { staff.fire(r.id); sel = staff.list()[0]?.id || null; draw(); } }, { cls: 'rt-fire' }))));
    el.addEventListener('click', (e) => { if (e.target.closest('select,button')) return; if (sel !== r.id) { sel = r.id; draw(); } });
    return el;
  };

  const clock = (t) => { const m = t % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`; };
  draw();
  // keep it current while it's open (not while a select is open)
  const iv = setInterval(() => { if (!win.el.isConnected) { clearInterval(iv); return; } if (document.activeElement?.tagName !== 'SELECT') draw(); }, 4000);
  win.onClose?.(() => clearInterval(iv));
  const off = [];
  for (const e of ['staffHired', 'staffFired', 'staffQuit', 'staffPaid']) off.push(game.events.on?.(e, () => win.el.isConnected && draw()));
  win.onClose?.(() => { for (const f of off) if (typeof f === 'function') f(); });
}
