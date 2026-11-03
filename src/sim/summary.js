// The end of a shop day: the camera pulls out of your eyes, out through the shutter and up over the lane and the
// rooftops toward the last light, then a pixel summary card: customers, plays, coins, sales, complaints, XP, the
// bills due soon and tomorrow's special day. "Call it a day" sleeps till morning; "Keep going" hands you back the
// evening. Hold Space / Enter to skip (keeps going).
import * as THREE from 'three';
import { iconHTML } from '../gfx/icons.js';
import { formatYen } from '../core/util.js';
import { audio } from '../core/audio.js';
import { GARAGE } from '../world/Garage.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const WAKE_HOUR = 8;

let el = null;
function cardEl() {
  if (el) return el;
  el = document.createElement('div');
  el.id = 'daysum';
  document.body.appendChild(el);
  return el;
}

/** The card's HTML for a summary (game.sim.daySummary() data). */
export function summaryHTML(game, d) {
  const cal = game.calendar;
  const row = (icon, label, value, cls = '') => `<div class="${cls}">${iconHTML(icon, 2)}<span>${esc(label)}</span><em>${esc(value)}</em></div>`;
  const bills = [...(d.billsDue || []).map((b) => `${b.name} ${formatYen(b.amount)} - ${b.overdue ? `${b.daysLate} day${b.daysLate === 1 ? '' : 's'} late` : b.due === d.day ? 'due today' : `due ${cal.format(b.due)}`}`),
    ...(d.loansDue || []).map((l) => `Loan ${formatYen(l.left)} - ${l.daysLate ? 'late' : `due ${cal.format(l.due)}`}`)];
  const tm = d.tomorrowDate;
  const tomorrow = d.tomorrow?.length ? d.tomorrow.map((s) => s.name).join(', ') : `An ordinary ${tm?.weekdayName || 'day'}`;
  const note = d.tomorrow?.find((s) => s.note)?.note || '';
  return `<div class="ds-card"><div class="ds-h"><b>Closing time</b><span>Day ${d.day} - ${esc(cal.format(d.day, true))}</span></div>
    <div class="ds-grid">
      ${row('people', 'Customers', d.customers)}${row('capsule', 'Turns played', d.plays)}
      ${row('coin', 'Coins collected', formatYen(d.coins))}${row('sell', 'Figures sold', d.sold)}
      ${row('yen', 'Money in', formatYen(d.earned), d.earned > 0 ? 'pos' : '')}${row('wallet', 'Money out', formatYen(d.spent), d.spent > 0 ? 'neg' : '')}
      ${row('chat', 'Complaints', d.complaints, d.complaints > 0 ? 'neg' : '')}${row('star', 'XP gained', `+${d.xp} (Lv ${d.level})`)}
    </div>
    <div class="ds-sec"><small>Bills due soon</small>${bills.length ? bills.map((b) => `<div class="warn">${esc(b)}</div>`).join('') : '<div>Nothing due. Nice.</div>'}</div>
    <div class="ds-sec"><small>Tomorrow - ${esc(tm ? cal.format(tm.day, true) : '')}</small><div class="${d.tomorrow?.length ? 'gold' : ''}">${esc(tomorrow)}</div>${note ? `<div>${esc(note)}</div>` : ''}</div>
    <div class="ds-sec"><small>Shop rating</small><div>${esc(d.quality?.grade || '-')} - ${d.quality?.parts?.slice().sort((a, b) => a.value - b.value)[0]?.tip || ''}</div></div>
    <div class="ds-btns"><button class="alt" data-v="keep">Keep going<kbd>2</kbd></button><button data-v="sleep">Call it a day<kbd>1</kbd></button></div></div>`;
}

export function playDaySummary(game, data) {
  if (game.visiting || !game.cutscene) return;
  const start = () => game.cutscene.play((c) => script(game, c, data), { skippable: true });
  if (game.cutscene.active) { const t = setInterval(() => { if (!game.cutscene.active) { clearInterval(t); start(); } }, 500); return; }
  start();
}

function* script(g, c, data) {
  const P = g.player;
  const sun = g.clock.sun().dir;
  const h = V(sun.x, 0, sun.z);
  if (h.lengthSq() < 1e-4) h.set(-0.5, 0, 0.85);
  h.normalize();
  // out through the shutter (if you're inside), up over the lane, then high above the garage looking at the last light
  const end = V(0.6 - h.x * 3.2, 11.5, 1.5 - h.z * 3.2);
  const look = end.clone().addScaledVector(h, 40).add(V(0, -8, 0));
  const inside = P.pos.z < GARAGE.maxZ && Math.abs(P.pos.x) < GARAGE.maxX;
  const path = inside ? [V(0.4, 1.75, 3.6), V(0.4, 2.3, GARAGE.maxZ + 2.5), V(1.2, 6.5, GARAGE.maxZ + 3.2)] : [V(P.pos.x, 3.2, P.pos.z + 0.8), V(1.2, 6.5, GARAGE.maxZ + 3.2)];
  const lookMid = V(0.4, 3.5, GARAGE.maxZ + 12);
  yield c.all(c.cam({ pos: path[0], look: lookMid, dur: inside ? 1.6 : 1.2, fov: 62 }));
  yield c.cam({ pos: end, look, dur: 4.6, fov: 58, path: path.slice(1) });
  try { audio.play('task', { vol: 0.5 }); } catch { /* */ }
  // the card
  const box = cardEl();
  box.innerHTML = summaryHTML(g, data);
  box.classList.add('on');
  requestAnimationFrame(() => box.classList.add('show'));
  const prevUi = g.uiOpen;
  g.uiOpen = true; // releasing the pointer must not open the pause menu
  g.input.unlock?.();
  let choice = null;
  const pickV = (v) => { if (choice) return; choice = v; try { audio.play('uiClick', { vol: 0.6 }); } catch { /* */ } g.input.lock?.(); };
  box.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); pickV(b.dataset.v); }));
  const onKey = (e) => { if (e.code === 'Digit1') pickV('sleep'); if (e.code === 'Digit2' || e.code === 'Escape') pickV('keep'); };
  window.addEventListener('keydown', onKey);
  let drift = 0;
  yield c.until((dt) => {
    drift += dt;
    c.pos.copy(end).addScaledVector(h, Math.min(drift, 30) * 0.05);
    return choice || c.skipping;
  });
  window.removeEventListener('keydown', onKey);
  box.classList.remove('show');
  setTimeout(() => box.classList.remove('on'), 400);
  g.uiOpen = prevUi;
  if (!g.input.locked) g.input.lock?.();
  // if the browser refused the pointer (no click to go on), fall back to the pause menu's Resume
  setTimeout(() => { if (!g.input.locked && !g.uiOpen) g.input.onLockChange?.(false); }, 600);
  if (choice === 'sleep') {
    yield c.fade(1, 0.9);
    g.clock.skipTo(WAKE_HOUR, { nextDay: true });
    g.lighting?.refresh();
    g.lighting?.update(0, g.time);
    yield c.wait(0.4);
    yield c.toPlayer(0);
    const d = g.calendar.dateOf(g.clock.day);
    yield c.fade(0, 0.9);
    const head = g.calendar.headline(g.clock.day);
    yield c.title(`Day ${g.clock.day}`, `${d.weekdayName}, ${d.monthName} ${d.date}${head.length ? ' - ' + head[0].name : ''}`, 1.8);
  } else yield c.toPlayer(1.4);
}
