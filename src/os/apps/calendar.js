// Calendar: a month view with today, holidays and festivals, bill and loan due dates (from game.calendar when the
// simulation has it, else a built-in list), and your own reminders (double-click a day).
import { h, esc, ic, btn } from './ui.js';
import { now, dateOfDay, dayOfDate, MONTHS, WEEKDAYS, SPECIAL_DAYS } from '../time.js';

const KIND_ICON = { holiday: 'flag', festival: 'sparkle', event: 'heart', school: 'book', shop: 'capsule', bill: 'os_bill', note: 'os_note' };

export function installCalendar(game, os) {
  const st = os.st.cal ||= { notes: {} };
  /** Specials of a day number: [{ name, kind, note }] */
  const specials = (day) => {
    let list = [];
    if (game.calendar?.special) { try { list = game.calendar.special(day) || []; } catch { list = []; } } else {
      const d = dateOfDay(game, day);
      list = SPECIAL_DAYS.filter(([m, dd]) => m === d.month && dd === d.date).map(([, , name, kind]) => ({ name, kind }));
    }
    if (st.notes[day]) list = [...list, { name: st.notes[day], kind: 'note' }];
    return list;
  };

  os.registerApp({
    id: 'calendar', name: 'Calendar', icon: 'os_cal', group: 'Accessories', w: 640, h: 450, minW: 520, minH: 380,
    about: 'Capsule Calendar 2.0. Never miss a festival (or a bill) again.',
    open(win) {
      win.body.classList.add('cal');
      const t0 = now(game);
      let y = t0.year, m = t0.month, sel = t0.day;
      const head = h('div', { class: 'cal-head' });
      const grid = h('div', { class: 'cal-grid' });
      const side = h('div', { class: 'cal-side c98-list' });
      win.body.append(head, h('div', { class: 'c98-split' }, h('div', { class: 'cal-left' }, grid), side));
      const prev = btn('<', () => { m--; if (m < 0) { m = 11; y--; } draw(); }, { cls: 'small' });
      const next = btn('>', () => { m++; if (m > 11) { m = 0; y++; } draw(); }, { cls: 'small' });
      const todayB = btn('Today', () => { const t = now(game); y = t.year; m = t.month; sel = t.day; draw(); }, { cls: 'small' });
      const title = h('b', { class: 'cal-title' });
      head.append(prev, title, next, h('span', { class: 'grow' }), todayB);
      const draw = () => {
        const t = now(game);
        title.textContent = `${MONTHS[m]} ${y}`;
        grid.textContent = '';
        for (const w of WEEKDAYS) grid.append(h('div', { class: 'cal-wd', text: w.slice(0, 3) }));
        const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
        for (let i = 0; i < first; i++) grid.append(h('div', { class: 'cal-c empty' }));
        for (let d = 1; d <= days; d++) {
          const day = dayOfDate(game, y, m, d);
          const sp = specials(day);
          const wd = (first + d - 1) % 7;
          const cell = h('div', { class: `cal-c${day === t.day ? ' today' : ''}${day === sel ? ' sel' : ''}${day < t.day ? ' past' : ''}${wd === 0 || sp.some((s) => s.kind === 'holiday') ? ' red' : wd === 6 ? ' blue' : ''}` },
            h('span', { class: 'cal-n', text: d }),
            h('div', { class: 'cal-tags' }, ...sp.slice(0, 2).map((s) => h('span', { class: `cal-tag k-${s.kind || 'event'}`, text: s.name }))),
            sp.length > 2 ? h('span', { class: 'cal-more', text: `+${sp.length - 2}` }) : null);
          cell.addEventListener('click', () => { sel = day; draw(); });
          cell.addEventListener('dblclick', () => note(day));
          grid.append(cell);
        }
        drawSide();
        win.status(`Today: ${WEEKDAYS[t.weekday]}, ${MONTHS[t.month]} ${t.date}, ${t.year} (day ${t.day})`, game.calendar?.season ? `${game.calendar.season()}` : '');
      };
      const drawSide = () => {
        side.textContent = '';
        const d = dateOfDay(game, sel);
        side.append(h('div', { class: 'cal-sd', html: `<b>${WEEKDAYS[d.weekday]}</b><span>${MONTHS[d.month]} ${d.date}, ${d.year}</span>` }));
        const sp = specials(sel);
        if (!sp.length) side.append(h('p', { class: 'c98-dim', text: 'Nothing special on this day.' }));
        for (const s of sp) side.append(h('div', { class: 'cal-ev', html: `${ic(KIND_ICON[s.kind] || 'star', 1)}<div><b>${esc(s.name)}</b>${s.note ? `<small>${esc(s.note)}</small>` : ''}${s.busy && s.busy > 1.05 ? `<small>Busy day: about ${Math.round((s.busy - 1) * 100)}% more customers</small>` : ''}</div>` }));
        side.append(btn(st.notes[sel] ? 'Edit reminder...' : 'Add reminder...', () => note(sel), { cls: 'small' }));
      };
      const note = async (day) => {
        const r = await os.dialog({ title: 'Reminder', icon: 'os_cal', text: `Reminder for ${game.calendar?.format?.(day, true) || 'day ' + day}:`, input: { value: st.notes[day] || '' }, buttons: [{ label: 'OK', value: 'ok', default: true }, { label: 'Cancel', value: null, cancel: true }] });
        if (!r || r.value !== 'ok') return;
        const s = String(r.input || '').trim().slice(0, 40);
        if (s) st.notes[day] = s; else delete st.notes[day];
        draw();
      };
      win.onKey = (e) => { if (e.code === 'PageUp') { prev.click(); return true; } if (e.code === 'PageDown') { next.click(); return true; } return false; };
      draw();
    },
  });
  // reminders show up as balloons on their morning
  game.events.on('newDay', ({ day }) => { if (st.notes[day]) os.notify({ app: 'calendar', title: 'Reminder', body: st.notes[day], icon: 'os_cal', news: true }); });
}
