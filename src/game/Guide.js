// The guide: one clear goal at a time in the top-right card (with how to do it), and a marker floating over
// the place to go (pinned to the screen edge with an arrow when it's off-screen). Goals follow the story's
// to-do list in a sensible order, then a few first steps of running the shop, then it bows out.
import * as THREE from 'three';
import { GARAGE } from '../world/Garage.js';
import { iconHTML } from '../gfx/icons.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const list = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export class Guide {
  constructor(game) {
    this.game = game;
    const hud = document.getElementById('hud');
    const el = document.createElement('div');
    el.id = 'guide';
    el.innerHTML = '<div class="g-card"><div class="g-head"><span class="g-lbl">Goal</span><span class="g-n"></span></div>'
      + '<div class="g-row"><span class="g-ico"></span><div class="g-txt"><div class="g-t"></div><div class="g-s"></div></div><span class="g-tick"></span></div>'
      + '<div class="g-bar"><i></i></div></div>';
    hud.appendChild(el);
    const wp = document.createElement('div');
    wp.id = 'waypoint';
    wp.innerHTML = '<div class="wp-in"><div class="wp-pin"></div><div class="wp-d"></div></div><div class="wp-arrow"></div>';
    hud.appendChild(wp);
    this.el = el;
    this.card = el.querySelector('.g-card');
    this.wp = wp;
    this.wpD = wp.querySelector('.wp-d');
    this.wpArrow = wp.querySelector('.wp-arrow');
    el.querySelector('.g-tick').innerHTML = iconHTML('check', 2);
    this.shown = null; // goal on the card
    this.n = '';
    this.swapT = 0; // >0 while the card shows "done" before the next goal slides in
    this.v = new THREE.Vector3();
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
    const g = this.game, S = g.story;
    if (!S) return null;
    if (!S.done) return this.storyGoal();
    return this.shopGoal();
  }

  storyGoal() {
    const g = this.game, S = g.story, f = this.flags, H = g.held;
    const has = (id) => H.has(id), holding = (id) => H.holding(id);
    const town = g.garage.town;
    const counter = () => (town?.cornerShop?.counter ? town.cornerShop.counter.getWorldPosition(this.v).clone().setY(1.25) : null);
    const station = () => (S.station ? S.station.getWorldPosition(this.v).clone().setY(1.3) : null);
    const piles = [...S.piles.values()];
    const bags = [...g.items.list].filter((e) => e.data?.bag);
    const fallen = g.machines.filter((m) => m.data.fallen);
    const broken = g.machines.filter((m) => m.data.broken && !m.data.fallen);
    const top = (m) => m.root.getWorldPosition(new THREE.Vector3()).add(V(0, m.data.fallen ? 0.6 : 1.2, 0));
    const c = this.click();
    if (!f.shutter) return { id: 'shutter', icon: 'key', text: 'Unlock the garage', sub: `Hold the key${this.pick('key')} and ${c} the shutter`, at: () => V(0, 1.15, GARAGE.maxZ + 0.05) };
    if (has('trash_bag')) return { id: 'bagout', icon: 'trash_bag', text: 'Take the bag out', sub: holding('trash_bag') ? `${cap(c)} the garbage station across the lane` : `Hold the bag${this.pick('trash_bag')}, ${c} the garbage station`, at: station };
    if (!f.cash) return { id: 'cash', icon: 'cash_tin', text: "Find Grandpa's cash tin", sub: 'On the steel rack at the back', at: () => S.tin?.getWorldPosition(this.v).clone().add(V(0, 0.15, 0)) };
    const need = [];
    if (!f.fed && !has('milk')) need.push('milk');
    if (piles.length && !has('broom')) need.push('a broom');
    if (broken.length && !has('toolkit')) need.push('a tool kit');
    if (need.length) return { id: 'shop:' + need.join(), icon: 'shop', text: 'Shop at Mikawa-ya', sub: `Buy ${list(need)} at the little store across the lane`, at: counter };
    if (!f.fed) return { id: 'feed', icon: 'bowl', text: 'Feed the stray cat', sub: holding('milk') ? `${cap(c)} the bowl by the heater` : `Hold the milk${this.pick('milk')}, ${c} the bowl by the heater`, at: () => S.bowl?.getWorldPosition(this.v).clone().add(V(0, 0.3, 0)) };
    if (piles.length) return { id: 'sweep', icon: 'broom', text: `Sweep up the mess (${piles.length} left)`, sub: holding('broom') ? `Point at the dust and hold ${this.touch ? 'the use button' : 'left click'}` : `Hold the broom${this.pick('broom')}`, at: () => this.nearest(piles, (p) => p.mesh.position.clone().setY(0.45)) };
    if (fallen.length) return { id: 'lift', icon: 'machine', text: 'Lift the fallen machine', sub: `Hold ${this.touch ? 'the use button' : 'left click'} on it`, at: () => top(fallen[0]) };
    if (bags.length) return { id: 'bags', icon: 'trash_bag', text: `Take out the trash (${bags.length} left)`, sub: 'Pick up a bag, carry it to the garbage station', at: () => this.nearest(bags, (e) => e.obj.position.clone().setY(0.7)) };
    if (broken.length) return { id: 'repair', icon: 'toolkit', text: `Repair the machines (${broken.length} left)`, sub: holding('toolkit') ? `Hold ${this.touch ? 'the use button' : 'left click'} on a machine` : `Hold the tool kit${this.pick('toolkit')}`, at: () => this.nearest(broken, top) };
    return { id: 'ready', icon: 'sparkle', text: 'The garage is ready!', sub: 'Stand back and take a look...' };
  }

  shopGoal() {
    const g = this.game, s = g.state, H = g.held, F = s.flags;
    if (F.guideDone) return null;
    const town = g.garage.town;
    const counter = () => (town?.cornerShop?.counter ? town.cornerShop.counter.getWorldPosition(this.v).clone().setY(1.25) : null);
    const c = this.click();
    const flyers = s.promo?.flyers || 0;
    if (flyers < 3) {
      if (!H.has('flyers')) return { id: 'buyflyers', icon: 'flyer', text: 'Spread the word', sub: 'Buy flyers at Mikawa-ya', at: counter };
      const peds = (g.pedestrians?.list || []).filter((p) => !p.flyer && p.state === 'stroll');
      return { id: 'flyers', icon: 'flyer', text: `Hand out flyers (${flyers}/3)`, sub: H.holding('flyers') ? `${cap(c)} people walking in the lane` : `Hold the flyers${this.pick('flyers')}, ${c} a passer-by`, at: peds.length ? () => this.nearest(peds, (p) => p.h.root.position.clone().setY(p.h.height + 0.35)) : null };
    }
    const m = g.machines.find((x) => !x.data.broken && x.data.stock.length);
    if (!(s.stats.opened > 0) && m) return { id: 'pull', icon: 'capsule', text: 'Try a machine yourself', sub: `Hold ${this.touch ? 'the use button' : 'left click'} on the handle, then twist the capsule open`, at: () => m.root.getWorldPosition(new THREE.Vector3()).add(V(0, 1.0, 0)) };
    const shelved = s.shelves.some((sh) => sh.items.some(Boolean));
    if (!shelved && !F.guideShelf) {
      const sh = g.shelves[0]?.root;
      return { id: 'shelf', icon: 'shelf', text: 'Show off a figure', sub: `Hold a figure and ${c} the shelf. Doubles sell in the box by the PC`, at: sh ? () => sh.getWorldPosition(this.v).clone().add(V(0, 1.3, 0)) : null };
    }
    if (!F.guideEnd) F.guideEnd = g.time;
    if (g.time - F.guideEnd > 9) { F.guideDone = true; return null; }
    return { id: 'end', icon: 'star', text: "You're all set!", sub: 'Collect every figure. Grandpa would be proud.' };
  }

  doneTotal() {
    const S = this.game.story;
    if (!S) return [0, 0];
    if (!S.done) { const t = S.todo(); return [t.filter((x) => x.done).length, t.length]; }
    return [0, 0];
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    const on = g.state.settings.hints !== false && !g.cutscene.active && !g.visiting;
    const vis = on && !!this.shown;
    this.el.classList.toggle('on', vis);
    if (document.body.classList.contains('has-goal') !== vis) document.body.classList.toggle('has-goal', vis);
    if (!on) { this.marker(null); return; }
    const goal = this.goal();
    const [done, total] = this.doneTotal();
    const n = total ? `${Math.min(done + 1, total)}/${total}` : '';
    const gid = goal?.id || null;
    if (this.swapT > 0) this.swapT -= dt;
    else if (gid !== (this.shown?.id || null)) {
      // the old goal is finished: tick it off first (not when you've just lost an item and must shop again)
      if (this.shown && !this.card.classList.contains('done') && !/^(shop|buyflyers)/.test(gid || '')) { this.card.classList.add('done'); this.swapT = 0.9; }
      else this.show(goal, n, total ? done / total : 0);
    } else if (goal && (goal.text !== this.shown.text || goal.sub !== this.shown.sub || n !== this.n)) {
      this.el.querySelector('.g-t').textContent = goal.text;
      this.el.querySelector('.g-s').textContent = goal.sub || '';
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
    this.el.querySelector('.g-ico').innerHTML = goal.icon ? iconHTML(goal.icon, 2) : '';
    this.el.querySelector('.g-t').textContent = goal.text;
    this.el.querySelector('.g-s').textContent = goal.sub || '';
    this.el.querySelector('.g-n').textContent = n;
    this.el.querySelector('.g-bar').style.display = n ? '' : 'none';
    this.el.querySelector('.g-bar i').style.transform = `scaleX(${frac})`;
    void this.card.offsetWidth;
    this.card.classList.add('in');
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
    if (off) this.wpArrow.style.transform = `rotate(${Math.atan2(-y, x)}rad)`;
    this.wpD.textContent = `${Math.round(dist)} m`;
  }
}
