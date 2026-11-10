// HUD for the shop sim: a pixel clock (weekday, date, time, sun / moon) and the shop level with its XP bar above the
// money counter, small "+XP" pops, and the LEVEL UP card listing what just unlocked.
import './sim.css';
import { iconHTML, defineIcon } from '../gfx/icons.js';
import { audio } from '../core/audio.js';
import { kindLabel } from '../data/unlocks.js';

defineIcon('sun', { rows: [
  '.......Y.......',
  '..Y....Y....Y..',
  '...Y.......Y...',
  '......ZZY......',
  '.....ZZYYy.....',
  '....ZZYYYYy....',
  'YY..ZYYYYYy..YY',
  '....ZYYYYYy....',
  '.....YYYyy.....',
  '......yyy......',
  '...Y.......Y...',
  '..Y....Y....Y..',
  '.......Y.......',
] });
defineIcon('moon', { rows: [
  '....ZZZZ....',
  '..ZZYY......',
  '.ZYY........',
  '.ZYy........',
  'ZYy.........',
  'ZYy.........',
  'ZYy.........',
  'ZYYy........',
  '.ZYyy.....y.',
  '.ZYYyyy.yy..',
  '..ZYYyyyy...',
  '....yyyy....',
] });

const KIND_ICON = { machine: 'machine', series: 'box', slots: 'machine', shelf: 'shelf', opener: 'opener', charm: 'charm', goods: 'bag', decor: 'deco', market: 'cart', staff: 'people', museum: 'museum' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class SimHud {
  constructor(game) {
    this.game = game;
    const hud = document.getElementById('hud') || document.body;
    const el = document.createElement('div');
    el.id = 'simclock';
    el.innerHTML = '<div class="sc-row"><span class="sc-ic"></span><span class="sc-time">--:--</span><span class="sc-date"></span></div>'
      + '<div class="sc-day"></div><div class="sc-lv"><b>Lv 1</b><span class="sc-bar"><i></i></span></div><div class="sc-pops"></div>';
    hud.appendChild(el);
    this.el = el;
    this.$ = (s) => el.querySelector(s);
    this.t = 0;
    this.last = {};
    this.xpAcc = 0; this.xpT = 0;
    // the level-up card
    const lu = document.createElement('div');
    lu.id = 'levelup';
    document.body.appendChild(lu);
    this.lu = lu;
    this.queue = [];
    game.events.on('xp', ({ n }) => { this.xpAcc += n; });
    game.events.on('levelUp', (e) => { this.queue.push(e); });
  }

  update(dt) {
    const g = this.game, c = g.clock;
    if (!c) return;
    this.t -= dt;
    // XP pops, batched
    this.xpT -= dt;
    if (this.xpAcc > 0 && this.xpT <= 0) { this.pop(`+${this.xpAcc} XP`); this.xpAcc = 0; this.xpT = 0.6; }
    if (this.queue.length && !this.lu.classList.contains('show') && !g.cutscene?.active) this.showLevel(this.queue.shift());
    if (this.t > 0) return;
    this.t = 0.25;
    const L = this.last, set = (k, sel, v, html = false) => { if (L[k] === v) return; L[k] = v; const e = this.$(sel); if (html) e.innerHTML = v; else e.textContent = v; };
    const d = g.calendar.dateOf(c.day);
    set('time', '.sc-time', c.time);
    set('date', '.sc-date', `${d.wd} ${d.date} ${d.monthName.slice(0, 3).toUpperCase()}`);
    const sunUp = c.sun().alt > -2;
    set('ic', '.sc-ic', iconHTML(sunUp ? 'sun' : 'moon', 2), true);
    // today's headline special, or the shop's state
    const head = g.calendar.headline(c.day).filter((s) => s.kind !== 'bill' || /due/.test(s.name))[0];
    const open = g.sim?.isOpen?.();
    const status = !g.story?.done ? '' : head ? head.name : open ? 'Open' : c.hours < (g.sim?.hours.open ?? 9) ? `Opens at ${g.sim?.hours.open ?? 9}:00` : 'Closed for the night';
    set('day', '.sc-day', status);
    this.el.classList.toggle('special', !!head);
    this.el.classList.toggle('off', g.bills?.powerOn === false);
    const P = g.progress;
    set('lv', '.sc-lv b', `Lv ${P.level}`);
    const w = Math.round(P.frac * 100);
    if (L.w !== w) { L.w = w; this.$('.sc-bar i').style.width = `${w}%`; }
    this.el.classList.toggle('pre', !g.story?.done);
  }

  pop(text) {
    const p = document.createElement('span');
    p.className = 'sc-pop';
    p.textContent = text;
    this.$('.sc-pops').appendChild(p);
    setTimeout(() => p.remove(), 1500);
    while (this.$('.sc-pops').children.length > 3) this.$('.sc-pops').firstChild.remove();
  }

  showLevel({ level, unlocks }) {
    const list = (unlocks || []).slice(0, 6).map((u) => `<li>${iconHTML(KIND_ICON[u.kind] || 'unlock', 2)}<span><small>${esc(kindLabel(u.kind))}</small>${esc(u.name)}</span></li>`).join('');
    this.lu.innerHTML = `<div class="lu-card"><div class="lu-h">${iconHTML('star', 3)}<div><b>LEVEL UP!</b><span>Shop level ${level}</span></div></div>`
      + (list ? `<ul>${list}</ul>` : '<p>Keep it up!</p>') + '</div>';
    this.lu.classList.remove('show'); void this.lu.offsetWidth;
    this.lu.classList.add('show');
    try { audio.play('complete', { vol: 0.7 }); } catch { /* no audio yet */ }
    clearTimeout(this._luT);
    this._luT = setTimeout(() => this.lu.classList.remove('show'), 5200);
  }
}
