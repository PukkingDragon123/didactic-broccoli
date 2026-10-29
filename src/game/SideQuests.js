// Side quests: small optional stories next to the main objective card. Each quest has a giver, a title and a list of
// steps; a step completes by a check (polled), by a game event (game.events) or by code calling advance(). Rewards
// pay out on completion. A compact list sits under the goal card, banners announce new / finished quests.
//
//   game.sideQuests.define({
//     id, title, giver: 'rohan', giverName: 'Rohan', color: '#7fd17f', desc,
//     steps: [{ text, sub?, check?(game, q), on?: 'buy', test?(payload, game, q), talk?: 'npcId' }],
//     reward: { money, text, fn?(game, q) }, onStart?(game, q), onStep?(game, q, stepIndex), onComplete?(game, q),
//   })
//   start(id) / advance(id) / complete(id) / isDone(id) / isActive(id) / step(id) / data(id) / list()
//   q = { step, data, t }: the live record (q.data is saved: put quest-local progress there)
// Saved in game.state.quests = { v, active: { id: q }, done: { id: time }, order: [id] }. Emits 'sideQuest'
// { id, state: 'start' | 'step' | 'done' } on game.events.
import '../ui/sidequests.css';
import { audio } from '../core/audio.js';
import { formatYen } from '../core/util.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class SideQuests {
  constructor(game) {
    this.game = game;
    this.defs = new Map();
    const old = game.state.quests;
    this.s = game.state.quests = { v: 1, active: {}, done: {}, order: [], ...(old && typeof old === 'object' ? old : {}) };
    for (const k of ['active', 'done']) if (!this.s[k] || typeof this.s[k] !== 'object') this.s[k] = {};
    if (!Array.isArray(this.s.order)) this.s.order = Object.keys(this.s.active);
    this.events = new Set();
    this.checkT = 0;
    this.collapsed = false;
    this.buildHUD();
    this.banners = [];
    game.sideQuests = this;
  }

  // ------------------------------------------------------------------ definitions & queries
  define(def) {
    if (!def?.id) throw new Error('side quest needs an id');
    def.steps = (def.steps || []).map((st, i) => ({ id: 's' + i, ...st }));
    this.defs.set(def.id, def);
    for (const st of def.steps) if (st.on && !this.events.has(st.on)) {
      this.events.add(st.on);
      this.game.events.on(st.on, (payload) => this.onEvent(st.on, payload));
    }
    // a quest saved as active whose definition changed shape: clamp its step
    const q = this.s.active[def.id];
    if (q && q.step >= def.steps.length) q.step = Math.max(0, def.steps.length - 1);
    this.dirty = true;
    return def;
  }
  get(id) { return this.defs.get(id); }
  isDone(id) { return !!this.s.done[id]; }
  isActive(id) { return !!this.s.active[id]; }
  data(id) { return this.s.active[id]?.data || null; }
  stepIndex(id) { return this.s.active[id]?.step ?? -1; }
  step(id) { const q = this.s.active[id], d = this.defs.get(id); return q && d ? d.steps[q.step] : null; }
  /** Active quests (defined ones), oldest first. */
  list() { return this.s.order.filter((id) => this.s.active[id] && this.defs.has(id)); }
  /** The step of any active quest that asks you to talk to npc (its quest id + step), or null. */
  talkStep(npc) {
    for (const id of this.list()) { const st = this.step(id); if (st?.talk === npc) return { id, step: st }; }
    return null;
  }

  // ------------------------------------------------------------------ progress
  start(id, { quiet = false } = {}) {
    const d = this.defs.get(id);
    if (!d || this.isActive(id) || this.isDone(id)) return false;
    const q = this.s.active[id] = { step: 0, data: {}, t: Date.now() };
    this.s.order = this.s.order.filter((x) => x !== id).concat(id);
    d.onStart?.(this.game, q);
    if (!quiet) this.banner('New side quest', d.title, d.giverName ? `from ${d.giverName}` : '', d.color, 'new');
    this.game.events.emit('sideQuest', { id, state: 'start' });
    this.dirty = true;
    this.flash = id;
    this.game.save();
    this.poll(id);
    return true;
  }

  /** Finish the current step (or jump to step `to`); finishing the last one completes the quest. */
  advance(id, to = null) {
    const d = this.defs.get(id), q = this.s.active[id];
    if (!d || !q) return false;
    const done = q.step;
    q.step = to ?? q.step + 1;
    d.onStep?.(this.game, q, done);
    if (q.step >= d.steps.length) return this.complete(id);
    try { audio.play('task', { vol: 0.5 }); } catch { /* audio not ready */ }
    this.game.events.emit('sideQuest', { id, state: 'step', step: q.step });
    this.dirty = true;
    this.flash = id;
    this.game.save();
    this.poll(id);
    return true;
  }

  complete(id) {
    const d = this.defs.get(id), q = this.s.active[id];
    if (!d || !q) return false;
    delete this.s.active[id];
    this.s.order = this.s.order.filter((x) => x !== id);
    this.s.done[id] = Date.now();
    const r = d.reward || {};
    if (r.money) this.game.addMoney(r.money);
    r.fn?.(this.game, q);
    d.onComplete?.(this.game, q);
    const bits = [r.money ? `+${formatYen(r.money)}` : '', r.text || ''].filter(Boolean).join('  ·  ');
    this.banner('Side quest complete', d.title, bits, d.color, 'done');
    try { audio.play('complete', { vol: 0.75 }); } catch { /* audio not ready */ }
    this.game.events.emit('sideQuest', { id, state: 'done' });
    this.dirty = true;
    this.game.save();
    return true;
  }

  /** Forget a quest (debug / replays). */
  reset(id) { delete this.s.active[id]; delete this.s.done[id]; this.s.order = this.s.order.filter((x) => x !== id); this.dirty = true; }

  poll(id) {
    const d = this.defs.get(id), q = this.s.active[id];
    if (!d || !q) return;
    const st = d.steps[q.step];
    if (st?.check?.(this.game, q)) this.advance(id);
  }

  onEvent(ev, payload) {
    for (const id of this.list()) {
      const st = this.step(id), q = this.s.active[id];
      if (st?.on === ev && (!st.test || st.test(payload, this.game, q))) this.advance(id);
    }
  }

  update(dt) {
    if ((this.checkT -= dt) <= 0) { this.checkT = 0.3; for (const id of this.list()) this.poll(id); }
    this.updateHUD(dt);
  }

  // ------------------------------------------------------------------ HUD: the list under the goal card
  buildHUD() {
    const el = document.createElement('div');
    el.id = 'sidequests';
    el.innerHTML = '<div class="sq-card"><div class="sq-head"><span class="sq-lbl">Side quests</span><span class="sq-key">J</span></div><div class="sq-list"></div></div>';
    (document.getElementById('hud') || document.body).appendChild(el);
    this.el = el;
    this.listEl = el.querySelector('.sq-list');
    new ResizeObserver(() => document.body.style.setProperty('--sq-h', `${el.offsetHeight}px`)).observe(el);
    const bn = document.createElement('div');
    bn.id = 'sq-banner';
    document.body.appendChild(bn);
    this.bannerEl = bn;
  }

  updateHUD() {
    const g = this.game, ids = this.list();
    const vis = ids.length > 0 && !g.cutscene?.active && !g.visiting;
    if (g.input?.keyPressed?.('KeyJ') && g.input.locked && !g.uiOpen) { this.collapsed = !this.collapsed; this.dirty = true; try { audio.play('uiClick', { vol: 0.4 }); } catch { /* */ } }
    this.el.classList.toggle('on', vis);
    if (document.body.classList.contains('has-sq') !== vis) document.body.classList.toggle('has-sq', vis);
    this.el.classList.toggle('collapsed', this.collapsed);
    if (!this.dirty) return;
    this.dirty = false;
    this.el.querySelector('.sq-lbl').textContent = this.collapsed ? `Side quests (${ids.length})` : 'Side quests';
    this.listEl.innerHTML = ids.map((id) => {
      const d = this.defs.get(id), q = this.s.active[id], st = d.steps[q.step] || {};
      const text = typeof st.text === 'function' ? st.text(this.game, q) : st.text;
      const sub = typeof st.sub === 'function' ? st.sub(this.game, q) : st.sub;
      return `<div class="sq-q${this.flash === id ? ' flash' : ''}" style="--qc:${d.color || '#ffd23f'}"><i class="sq-dot"></i><div class="sq-txt">`
        + `<div class="sq-t">${esc(d.title)}${d.giverName ? `<span class="sq-g">${esc(d.giverName)}</span>` : ''}</div>`
        + `<div class="sq-s">${esc(text || '')}${sub ? `<span class="sq-sub">${esc(sub)}</span>` : ''}</div></div>`
        + `<span class="sq-n">${q.step + 1}/${d.steps.length}</span></div>`;
    }).join('');
    this.flash = null;
  }
  /** Ask the HUD to re-render (a step text depending on game state changed). */
  refresh() { this.dirty = true; }

  // ------------------------------------------------------------------ banners
  banner(label, title, sub = '', color = '#ffd23f', kind = 'new') {
    this.banners.push({ label, title, sub, color, kind });
    if (!this.bannerBusy) this.nextBanner();
  }
  nextBanner() {
    const b = this.banners.shift();
    if (!b) { this.bannerBusy = false; return; }
    this.bannerBusy = true;
    const el = this.bannerEl;
    el.className = `sq-b-${b.kind}`;
    el.style.setProperty('--qc', b.color);
    el.innerHTML = `<div class="sq-b-in"><div class="sq-b-l">${esc(b.label)}</div><div class="sq-b-t">${esc(b.title)}</div>${b.sub ? `<div class="sq-b-s">${esc(b.sub)}</div>` : ''}</div>`;
    void el.offsetWidth;
    el.classList.add('show');
    if (b.kind === 'new') { try { audio.play('newItem', { vol: 0.45 }); } catch { /* */ } }
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => this.nextBanner(), 450); }, 3600);
  }
}
