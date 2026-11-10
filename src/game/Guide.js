// The guide: one clear goal at a time in the top-left card, and a marker floating over the place to go (pinned to the
// screen edge with an arrow when it's off-screen). During the opening the card is Grandpa's to-do list: each goal comes
// from one of his notes and quotes him (src/game/Story.js goal()); while he's there in person (src/grandpa/) the card is
// headed "Grandpa" and carries his own short line under the job (goal.say). A side job you've taken (src/life/jobs.js) comes
// first while it runs; once the shop is open, the daily routine (open up in the morning, close up at night,
// src/life/routine.js) and a few first steps of running the shop.
import * as THREE from 'three';
import { iconHTML, hasIcon } from '../gfx/icons.js';
import { SHELF_PRICES } from './economy.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export class Guide {
  constructor(game) {
    this.game = game;
    const hud = document.getElementById('hud');
    const el = document.createElement('div');
    el.id = 'guide';
    el.innerHTML = '<div class="g-card"><div class="g-head"><span class="g-lbl">Goal</span><span class="g-n"></span></div>'
      + '<div class="g-row"><span class="g-ico"></span><div class="g-txt"><div class="g-t"></div><div class="g-s"></div></div><span class="g-tick"></span></div>'
      + '<div class="g-say"></div><div class="g-bar"><i></i></div></div>';
    hud.appendChild(el);
    const wp = document.createElement('div');
    wp.id = 'waypoint';
    wp.innerHTML = '<div class="wp-in"><div class="wp-pin"></div><div class="wp-d"></div></div><div class="wp-arrow"></div>';
    hud.appendChild(wp);
    this.el = el;
    this.card = el.querySelector('.g-card');
    this.lbl = el.querySelector('.g-lbl');
    this.wp = wp;
    this.wpD = wp.querySelector('.wp-d');
    this.wpArrow = wp.querySelector('.wp-arrow');
    el.querySelector('.g-tick').innerHTML = iconHTML('check', 2);
    this.shown = null; // goal on the card
    this.n = '';
    this.swapT = 0; // >0 while the card shows "done" before the next goal slides in
    this.v = new THREE.Vector3();
    this.label = '';
    // toasts stack under the card (hud.css reads --goal-h)
    new ResizeObserver(() => document.body.style.setProperty('--goal-h', `${el.offsetHeight}px`)).observe(el);
  }

  get flags() { return this.game.state.story; }
  get touch() { return document.body.classList.contains('touchmode'); }
  click() { return this.touch ? 'tap' : 'click'; }
  pick(id) { const i = this.game.held.find(id); return i < 0 ? '' : this.touch ? ` (slot ${i + 1})` : ` (press ${i + 1})`; }

  /** Bounce the card to draw the eye (after a cutscene). */
  pulse() { this.card.classList.remove('pulse'); void this.card.offsetWidth; this.card.classList.add('pulse'); }

  nearest(objs, at) {
    const p = this.game.player.pos;
    let best = null, bd = Infinity;
    for (const o of objs) { const q = at(o); const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < bd) { bd = d; best = q; } }
    return best;
  }

  // ------------------------------------------------------------------ what to do next
  goal() {
    const g = this.game, S = g.story, L = g.life;
    if (!S) return null;
    const job = L?.jobs?.goal();
    if (job) { this.label = 'Odd job'; return job; }
    if (!S.done) { const goal = S.goal(); this.label = goal?.say ? 'Grandpa' : "Grandpa's list"; return goal; }
    const day = L?.routine?.goal();
    if (day) { this.label = 'Today'; return day; }
    this.label = 'Goal';
    return this.shopGoal();
  }

  shopGoal() {
    const g = this.game, s = g.state, H = g.held, F = s.flags;
    if (F.guideDone) return null;
    const town = g.garage.town;
    const counter = () => (town?.cornerShop?.counter ? town.cornerShop.counter.getWorldPosition(this.v).clone().setY(1.25) : null);
    const c = this.click();
    const D = g.garage.pcDesk;
    const pc = D ? () => V(D.x, D.h + 0.55, D.z) : null;
    // a machine sold out: order more capsules
    const empty = g.machines.find((m) => !m.data.stock.length);
    if (empty && !g.delivery.queue?.length && ![...g.items.list].some((e) => e.kind === 'box' && e.data?.type === 'refill')) return { id: 'restock', icon: 'box', text: 'A machine is sold out', sub: 'Order capsules on the computer: Daikoku Toys or Off-Hobby', at: pc };
    const flyers = s.promo?.flyers || 0;
    if (flyers < 3) {
      if (!H.has('flyers')) return { id: 'buyflyers', icon: 'flyer', text: 'Spread the word', sub: 'Buy flyers at Mikawa-ya', at: counter };
      const peds = (g.pedestrians?.list || []).filter((p) => !p.flyer && p.state === 'stroll');
      return { id: 'flyers', icon: 'flyer', text: `Hand out flyers (${flyers}/3)`, sub: H.holding('flyers') ? `${cap(c)} people walking in the lane` : `Hold the flyers${this.pick('flyers')}, ${c} a passer-by`, at: peds.length ? () => this.nearest(peds, (p) => p.h.root.position.clone().setY(p.h.height + 0.35)) : null };
    }
    const m = g.machines.find((x) => !x.data.broken && x.data.stock.length);
    if (!(s.stats.opened > 0) && m) return { id: 'pull', icon: 'machine', text: 'Try a machine yourself', sub: `Hold ${this.touch ? 'the use button' : 'left click'} on the handle, then twist the capsule open`, at: () => m.root.getWorldPosition(new THREE.Vector3()).add(V(0, 1.0, 0)) };
    const shelved = s.shelves.some((sh) => sh.items.some(Boolean));
    if (!g.shelves.length && !F.guideShelf) {
      if (s.money >= SHELF_PRICES[0]) return { id: 'buyshelf', icon: 'shelf', text: 'Buy a wall shelf', sub: 'For showing off your figures: Daikoku Toys, Shelves', at: pc };
    } else if (!shelved && !F.guideShelf) {
      const sh = g.shelves[0]?.root;
      return { id: 'shelf', icon: 'shelf', text: 'Show off a figure', sub: `Hold a figure and ${c} the shelf. Doubles sell in the box by the PC`, at: sh ? () => sh.getWorldPosition(this.v).clone().add(V(0, 1.3, 0)) : null };
    }
    if (!F.guideEnd) F.guideEnd = g.time;
    if (g.time - F.guideEnd > 9) { F.guideDone = true; return null; }
    return { id: 'end', icon: 'star', text: "You're all set!", sub: 'Collect every figure. Grandpa would be proud.' };
  }

  doneTotal() {
    const S = this.game.story;
    if (!S || S.done || (this.label !== "Grandpa's list" && this.label !== 'Grandpa')) return [0, 0];
    const t = S.todo();
    return [t.filter((x) => x.done).length, t.length];
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    const on = g.state.settings.hints !== false && !g.cutscene.active && !g.visiting;
    const vis = on && !!this.shown;
    this.el.classList.toggle('on', vis);
    if (document.body.classList.contains('has-goal') !== vis) document.body.classList.toggle('has-goal', vis);
    if (!on) { this.marker(null); return; }
    // the goal is worked out a few times a second (it walks the whole to-do list)
    this.gT = (this.gT || 0) - dt;
    if (this.gT <= 0 || this.swapT > 0) { this.gT = 0.2; this.cur = this.goal(); }
    const goal = this.cur;
    if (this.lbl.textContent !== this.label) this.lbl.textContent = this.label;
    const [done, total] = this.doneTotal();
    const n = total ? `${Math.min(done + 1, total)}/${total}` : '';
    const gid = goal?.id || null;
    if (this.swapT > 0) this.swapT -= dt;
    else if (gid !== (this.shown?.id || null)) {
      // the old goal is finished: tick it off first (not when you've just lost an item and must shop again)
      if (this.shown && !this.card.classList.contains('done') && !/^(shop|buyflyers)/.test(gid || '') && gid?.split(':')[0] !== this.shown.id.split(':')[0]) { this.card.classList.add('done'); this.swapT = 0.9; }
      else this.show(goal, n, total ? done / total : 0);
    } else if (goal && (goal.text !== this.shown.text || goal.sub !== this.shown.sub || goal.say !== this.shown.say || n !== this.n)) {
      this.el.querySelector('.g-t').textContent = goal.text;
      this.el.querySelector('.g-s').textContent = goal.sub || '';
      this.say(goal.say);
      this.el.querySelector('.g-n').textContent = this.n = n;
      this.el.querySelector('.g-bar i').style.transform = `scaleX(${total ? done / total : 0})`;
      this.shown = goal;
    }
    this.marker(this.swapT <= 0 ? this.shown : null);
  }

  show(goal, n, frac) {
    this.card.classList.remove('done', 'in');
    this.shown = goal;
    this.n = n;
    if (!goal) return;
    this.el.querySelector('.g-ico').innerHTML = goal.icon && hasIcon(goal.icon) ? iconHTML(goal.icon, 2) : '';
    this.el.querySelector('.g-t').textContent = goal.text;
    this.el.querySelector('.g-s').textContent = goal.sub || '';
    this.say(goal.say);
    this.el.querySelector('.g-n').textContent = n;
    this.el.querySelector('.g-bar').style.display = n ? '' : 'none';
    this.el.querySelector('.g-bar i').style.transform = `scaleX(${frac})`;
    void this.card.offsetWidth;
    this.card.classList.add('in');
  }

  /** Grandpa's line on the card (while he's with you): "Grandpa: <line>". */
  say(line) {
    const el = this.el.querySelector('.g-say');
    if (!line) { if (el.textContent) el.textContent = ''; delete el.dataset.line; return; }
    if (el.dataset.line === line) return;
    el.dataset.line = line;
    el.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = 'Grandpa: ';
    el.append(b, document.createTextNode(`"${line}"`));
  }

  marker(goal) {
    const g = this.game, wp = this.wp;
    const at = goal?.at?.();
    const pl = g.player.pos;
    const dist = at ? Math.hypot(at.x - pl.x, at.z - pl.z) : 0;
    if (!at || dist < 1.4 || g.held.reading || g.uiOpen) { wp.classList.remove('on'); return; }
    const v = this.v.copy(at).project(g.camera);
    let x = v.x, y = v.y;
    const behind = v.z > 1;
    if (behind) { x = -x; y = -y; if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) y = -1; }
    const mx = 0.9, my = 0.8;
    const off = behind || Math.abs(x) > mx || Math.abs(y) > my;
    if (off) { const k = Math.min(mx / Math.max(Math.abs(x), 1e-4), my / Math.max(Math.abs(y), 1e-4)); x *= k; y *= k; }
    const W = innerWidth, H = innerHeight;
    const px = (x * 0.5 + 0.5) * W, py = (0.5 - y * 0.5) * H;
    wp.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
    wp.classList.add('on');
    wp.classList.toggle('off', off);
    // looking right at it: the hover hint under the crosshair says it all, so the marker steps aside
    wp.classList.toggle('center', !off && Math.abs(px - W / 2) < 170 && Math.abs(py - H / 2) < 110);
    if (off) this.wpArrow.style.transform = `rotate(${Math.atan2(-y, x)}rad)`;
    this.wpD.textContent = `${Math.round(dist)} m`;
  }
}
