// Staff paperwork in the world (outside the computer), on the game's paper kit (src/ui/paper.js + paper.css):
//   showCV(game, p)            the CV (rirekisho) an applicant hands you at the interview: a cream sheet, their photo
//                              taped on, the experience they wrote down, their stats ticked in boxes, Inspired's stamp
//   hideCV()
//   showCard(game, r, head)    a kraft staff card when someone is hired or given a new job / hours (name, job, shift,
//                              wage, a red hanko)
//   showSlip(game, rows, sum)  the weekly wage slip: a till receipt, one line per person, PAID (or NOT PAID) stamped
import { formatYen } from '../core/util.js';
import { ROLES, HOURS, QUIRKS, shiftText } from './data.js';
import { portrait } from './looks.js';
import './paper.css';

const yen = formatYen;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const boxes = (n) => `<span class="sp-box">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'x' : ''}"></i>`).join('')}</span>`;

function layer() {
  let el = document.getElementById('staff-paper');
  if (!el) { el = document.createElement('div'); el.id = 'staff-paper'; document.body.appendChild(el); }
  return el;
}

let cvEl = null;
export function showCV(game, p) {
  hideCV();
  let photo = '';
  try { photo = portrait(game, p.look, { size: 48 }); } catch { photo = ''; }
  const el = cvEl = document.createElement('div');
  el.className = 'sp-paper sp-cv';
  el.innerHTML = `<i class="sp-tape"></i>
    <div class="sp-cvh"><b>CV</b><span>履歴書</span><small>via Inspired</small></div>
    <div class="sp-cvtop"><span class="sp-photo" style="background:${esc(p.color || '#e8dcc0')}">${photo ? `<img src="${photo}" alt="">` : ''}<i class="sp-clip"></i></span>
      <table><tr><th>Name</th><td>${esc(p.name)}</td></tr><tr><th>Age</th><td>${p.age > 120 ? `${p.age}(!)` : p.age}</td></tr>
      <tr><th>From</th><td>${esc(p.from)}</td></tr><tr><th>For</th><td>${esc(ROLES[p.role]?.name || '')}</td></tr><tr><th>Wants</th><td>${yen(p.want)}/h</td></tr></table></div>
    <div class="sp-sec">Experience</div><ul>${p.cv.slice(0, 3).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <div class="sp-sec">About me</div><p class="sp-stats">Speed ${boxes(p.stats.speed)} Honesty ${boxes(p.stats.honesty)}<br>Charm ${boxes(p.stats.charm)} Reliable ${boxes(p.stats.reliability)}</p>
    <p class="sp-q">${(p.quirks || []).map((q) => esc(QUIRKS[q]?.name)).join(', ') || 'No quirks declared'}${p.nightOnly ? ' &middot; <b>nights only</b>' : ''}</p>
    <i class="sp-hanko"></i>`;
  layer().appendChild(el);
  return el;
}
export function hideCV() {
  const el = cvEl;
  cvEl = null;
  if (!el) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 300);
}

/** The kraft staff card (hired, new job, new hours). */
export function showCard(game, r, head = 'Staff card', ms = 6500) {
  let photo = '';
  try { photo = portrait(game, r.look, { size: 48, uniform: true }); } catch { photo = ''; }
  const el = document.createElement('div');
  el.className = 'sp-paper sp-card';
  el.innerHTML = `<i class="sp-hole"></i><div class="sp-cardh">${esc(head)}</div>
    <div class="sp-cvtop"><span class="sp-photo sm" style="background:${esc(r.color || '#e8dcc0')}">${photo ? `<img src="${photo}" alt="">` : ''}</span>
    <div><b class="sp-name">${esc(r.name)}</b>${r.title ? `<br><span class="sp-red">${esc(r.title)}</span>` : ''}<br>${esc(ROLES[r.role]?.name || '')}<br>${shiftText(r.hours)} <small>(${esc(HOURS[r.hours]?.name || '')})</small><br>${yen(r.wage)} / hour</div></div>
    <div class="sp-foot">GACHA GARAGE &middot; Morio-cho</div><i class="sp-hanko"></i>`;
  const L = layer();
  for (const o of L.querySelectorAll('.sp-card')) o.remove();
  L.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
  return el;
}

/** The weekly wage slip: rows [{ name, hours, wage, amount, paid }]. */
export function showSlip(game, rows, { total = 0, short = 0, date = '' } = {}, ms = 10000) {
  const el = document.createElement('div');
  el.className = 'sp-paper sp-slip';
  el.innerHTML = `<div class="sp-sliph"><b>GACHA GARAGE</b><span>WAGE SLIP</span><small>${esc(date)}</small></div>
    <table>${rows.map((r) => `<tr class="${r.paid ? '' : 'unpaid'}"><td>${esc(r.name)}<br><small>${r.hours.toFixed(1)} h x ${yen(r.wage)}</small></td><td>${yen(r.amount)}</td></tr>`).join('')}</table>
    <div class="sp-tot"><span>TOTAL</span><b>${yen(total + short)}</b></div>
    ${short ? `<div class="sp-red">NOT PAID: ${yen(short)} (bank too low)</div>` : ''}
    <div class="sp-stamp ${short ? 'bad' : ''}">${short ? 'UNPAID' : 'PAID'}</div>`;
  const L = layer();
  for (const o of L.querySelectorAll('.sp-slip')) o.remove();
  L.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
  return el;
}
