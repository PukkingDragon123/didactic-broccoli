// Machine-top POP displays: bought from Daikoku Toys (Goods & Tools), or found in a capsule now and then, carried in
// their box to a machine and fitted on its lid, then filled with figures you own. Machines come bare (the old sample
// hood on the lid is put away: hideTopper). A display full of the machine's own series
// draws customers to that machine and makes people inside glance up at it.
//   game.popTops: attach(machine) / detach(machine) / refresh(machine)
//                 machineHint(machine, held) / machineUse(machine, held)  (a box or a figure in your hands, aimed at a machine)
//                 of(machine) -> the fitted record { style, items } | null,  draw(machine) -> 0..1,  styles
// Save: ensureState(game, 'popDisplay', { v, fitted: { [machine id]: { style, items: [{ k, f } | null] } }, bonusDay })
// The box: a delivery { type: 'poptop', style, label } (a plain labelled carton that lies, carries and saves like any).
import * as THREE from 'three';
import { ensureState } from '../game/stateExt.js';
import { makeItemMesh } from '../game/collectibles.js';
import { getItem, SERIES_BY_ID } from '../data/series/index.js';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { buildDisplay, STYLES, STYLE_IDS } from './models.js';

/** How much a display sells: pick (extra weight on its machine when full), visit (the chance a passer-by comes in, per
 *  full display), visitMax (cap), bonusChance (a capsule holds a coupon for one). */
export const POP_DISPLAY = { pick: 1.5, visit: 0.06, visitMax: 0.18, bonusChance: 0.03 };
/** 0..1: the share of a display's spots that hold figures of `series` (items: [{ k, f } | null]). */
export function displayDraw(items, series) {
  if (!items?.length) return 0;
  let n = 0;
  for (const it of items) if (it && SERIES_BY_ID[series]?.items.some((x) => x.key === it.k)) n++;
  return n / items.length;
}

const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* audio not ready */ } };

export const isTopBox = (it) => it?.kind === 'box' && it.data?.type === 'poptop' && !!STYLES[it.data.style];
export const topBox = (style, extra = {}) => ({ type: 'poptop', style, label: STYLES[style]?.name || 'Display', name: STYLES[style]?.name, ...extra });

export class PopDisplays {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'popDisplay', { v: 1, fitted: {}, bonusDay: -1, told: false });
    this.live = new Map(); // machine -> { rec, built, figs: [Mesh|null], group, handlerObj }
    this.t = 0;
    game.popTops = this;
    for (const m of game.machines || []) this.attach(m);
    game.constructor.updaters.push((g, dt) => this.update(dt));
    // a capsule now and then holds a 当 coupon for a display top
    game.events.on('discover', () => this.maybeBonus());
    game.events.on('held', (it) => { if (isTopBox(it) && !this.s.told) { this.s.told = true; game.tip?.('poptop', 'A display top for a machine', 'Carry it to a machine and click it to fit it on top. Then fill it with figures.'); } });
  }

  styles() { return STYLES; }
  idOf(m) { if (!m.data.id) m.data.id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); return m.data.id; }
  of(m) { return this.s.fitted[this.idOf(m)] || null; }
  seriesOf(m) { return m.data.series || m.cardSeries || 'mochi'; }
  /** The sum of every display's draw (sim footfall: src/sim/sim.js). */
  totalDraw() { let t = 0; for (const L of this.live.values()) t += this.draw(L.m); return t; }
  /** How well the display sells this machine: the share of its spots holding figures of the machine's series. */
  draw(m) { const r = this.of(m); return r ? displayDraw(r.items, this.seriesOf(m)) : 0; }

  // ------------------------------------------------------------------ building
  attach(m) {
    if (!m?.parts?.lid) return;
    this.hideTopper(m);
    this.detach(m);
    const rec = this.of(m);
    if (!rec || !STYLES[rec.style]) return;
    const D = this.sizeOf(m), series = this.seriesOf(m);
    let built;
    try { built = buildDisplay(rec.style, series, { w: D.w, d: D.d, trim: m.spec.style?.header ?? m.spec.style?.trim }, this.game.thumbs); } catch (e) { console.warn('pop display', e); return; }
    const g = built.group;
    g.userData.popTop = true;
    g.position.set(0, m.spec.capH, D.z);
    m.parts.lid.add(g);
    rec.items.length = built.slots.length; // (a style's spot count is fixed; old records are padded or trimmed)
    for (let i = 0; i < rec.items.length; i++) rec.items[i] ??= null;
    // the click target: the display's own box (it sits in the machine's root, so it wins over the machine)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(D.w, built.height, D.d), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, built.height / 2, 0);
    g.add(hit);
    const L = { m, rec, built, series, group: g, figs: [], hit };
    this.live.set(m, L);
    this.game.interaction.add(g, { noHighlight: true, hint: (held) => this.hint(L, held), use: (held) => this.use(L, held) });
    rec.items.forEach((it, i) => this.showFig(L, i));
  }
  /** The lid's sample hood, its topper, sample figures and crown: put away (a display top takes their place). */
  hideTopper(m) {
    const lid = m.parts.lid, capH = m.spec.capH;
    for (const o of lid.children) if (o.position.y > capH * 0.9 && !o.userData.popTop) o.visible = false;
  }
  detach(m) {
    const L = this.live.get(m);
    if (!L) return;
    this.game.interaction.remove(L.group);
    L.group.parent?.remove(L.group);
    L.built.dispose();
    this.live.delete(m);
  }
  /** The display's footprint on a machine: wider than the old sample hood (nearly the lid's width, as real tops are)
   *  and deeper toward the back, so the front stays clear of the machine's own header. */
  sizeOf(m) {
    const w = m.spec.w - 0.02, d = m.spec.d - 0.03;
    return { w, d, z: m.L.dome?.z ?? 0 };
  }
  /** The machine's series changed: a new back card and header. */
  refresh(m) { const L = this.live.get(m); if (L && L.series !== this.seriesOf(m)) this.attach(m); }

  showFig(L, i) {
    const old = L.figs[i];
    if (old) { old.parent?.remove(old); L.figs[i] = null; }
    const it = L.rec.items[i], s = L.built.slots[i];
    if (!it || !s) return null;
    const fig = makeItemMesh(it.k, it.f || 'normal');
    const sz = fig.geometry?.userData?.size || new THREE.Box3().setFromObject(fig).getSize(new THREE.Vector3());
    const sc = Math.min(2.2, s.maxH / Math.max(0.005, sz.y), (s.cell - 0.006) / Math.max(0.005, sz.x, sz.z * 0.8), (s.depth - 0.004) / Math.max(0.005, sz.z));
    fig.scale.setScalar(sc);
    fig.position.set(s.x, s.y, s.z);
    fig.rotation.y = s.rot || 0;
    fig.castShadow = true; fig.receiveShadow = true;
    fig.raycast = () => {};
    L.group.add(fig);
    L.figs[i] = fig;
    return fig;
  }

  // ------------------------------------------------------------------ interaction
  nameOf(it) { return getItem(it?.k || it?.key)?.name || 'figure'; }
  hint(L, held) {
    const it = held, rec = L.rec, n = rec.items.filter(Boolean).length, max = rec.items.length, S = SERIES_BY_ID[L.series];
    const st = STYLES[rec.style];
    if (isTopBox(it)) return { key: '', text: st.name, sub: 'This machine already has a display' };
    if (it?.kind === 'toy') {
      if (n >= max) return { key: '', text: st.name, sub: `Full (${n}/${max}). Take one out first` };
      const match = getItem(it.data.key)?.series === L.series;
      return { key: 'LMB', text: `Put ${this.nameOf(it.data)} in the display`, sub: `${n + 1}/${max} · ${match ? `${S?.name || ''}: draws customers to this machine` : `Not ${S?.name || 'this machine\'s'} series: only for show`}` };
    }
    if (it && it.kind !== 'tool') return null;
    if (n) {
      const last = rec.items.map((x, i) => [x, i]).filter(([x]) => x).pop()[0];
      const pct = Math.round(this.draw(L.m) * 100);
      return { key: 'LMB', text: `Take ${this.nameOf(last)} out`, sub: `${st.name} · ${n}/${max} figures · ${pct ? `drawing customers (${pct}%)` : 'no figures of this series yet'}` };
    }
    return { key: 'LMB', text: 'Take the display down', sub: `Empty ${st.name.toLowerCase()} · fill it with ${S?.name || 'this series'} figures to draw customers` };
  }
  use(L, held) {
    const g = this.game, H = g.held, rec = L.rec;
    if (held?.kind === 'toy') { this.putFigure(L); return false; }
    if (held && held.kind !== 'tool') return false;
    const idx = rec.items.map((x, i) => (x ? i : -1)).filter((i) => i >= 0).pop();
    if (idx !== undefined) {
      if (!H.canTake()) { g.news?.('Hands full', 'Free a slot first', 2500); return false; }
      const it = rec.items[idx];
      rec.items[idx] = null;
      const fig = L.figs[idx];
      const holder = new THREE.Group();
      holder.add(makeItemMesh(it.k, it.f || 'normal'));
      (fig || L.group).getWorldPosition(holder.position);
      fig?.parent?.remove(fig); L.figs[idx] = null;
      g.scene.add(holder);
      H.take('toy', { key: it.k, finish: it.f || 'normal' }, holder);
      sfx('pickup', { vol: 0.5 });
      g.events.emit('popDisplay', { type: 'take', machine: L.m, key: it.k });
      g.save?.();
      return false;
    }
    // empty: lift it off its rails and back into its box
    if (!H.canTake()) { g.news?.('Hands full', 'Free a slot first', 2500); return false; }
    const data = topBox(rec.style);
    delete this.s.fitted[this.idOf(L.m)];
    const at = L.group.getWorldPosition(new THREE.Vector3());
    this.detach(L.m);
    const box = g.delivery.meshFor(data);
    box.position.copy(at);
    g.scene.add(box);
    H.take('box', data, box);
    sfx('boxOpen', { vol: 0.6 });
    g.events.emit('popDisplay', { type: 'down', machine: L.m });
    g.save?.();
    return false;
  }
  putFigure(L) {
    const g = this.game, H = g.held, it = H.item, rec = L.rec;
    if (it?.kind !== 'toy') return false;
    const i = rec.items.findIndex((x) => !x);
    if (i < 0) { sfx('error', { vol: 0.4 }); return false; }
    const s = L.built.slots[i], d = { k: it.data.key, f: it.data.finish || 'normal' };
    rec.items[i] = d; // reserve the spot at once (a second click picks the next)
    const to = L.group.localToWorld(_v.set(s.x, s.y + 0.01, s.z).clone());
    L.group.getWorldQuaternion(_q);
    H.putTo(to, _q.clone(), (obj) => {
      obj.parent?.remove(obj);
      if (this.live.get(L.m) !== L) return;
      this.showFig(L, i);
      sfx('place', { vol: 0.55 });
      g.events.emit('popDisplay', { type: 'put', machine: L.m, key: d.k, match: getItem(d.k)?.series === L.series });
      g.save?.();
    }, { dur: 0.36, arc: 0.06 });
    return true;
  }

  /** Called by the machine: a display box or a figure in hand, aimed at the machine's body. */
  machineHint(m, held) {
    if (isTopBox(held)) {
      const st = STYLES[held.data.style];
      if (this.of(m)) return { key: '', text: 'This machine already has a display', sub: 'Empty it and take it down first' };
      if (m.lidOpen) return { key: '', text: `Fit the ${st.name.toLowerCase()} on top`, sub: 'Close the lid first' };
      return { key: 'LMB', text: `Fit the ${st.name.toLowerCase()} on top`, sub: `Then fill it with ${SERIES_BY_ID[this.seriesOf(m)]?.name || ''} figures: it draws customers` };
    }
    const L = this.live.get(m);
    if (L && held?.kind === 'toy') return this.hint(L, held);
    return null;
  }
  machineUse(m, held) {
    if (isTopBox(held)) {
      if (this.of(m) || m.lidOpen) { sfx('error', { vol: 0.4 }); return true; }
      this.fit(m, held);
      return true;
    }
    const L = this.live.get(m);
    if (L && held?.kind === 'toy') { this.putFigure(L); return true; }
    return false;
  }
  fit(m, held) {
    const g = this.game, H = g.held, style = held.data.style;
    const top = m.parts.lid.localToWorld(_v.set(0, m.spec.capH + 0.08, m.L.dome?.z ?? 0).clone());
    m.parts.lid.getWorldQuaternion(_q);
    H.putTo(top, _q.clone(), (obj) => {
      obj.parent?.remove(obj);
      this.s.fitted[this.idOf(m)] = { style, items: [] };
      this.attach(m);
      const L = this.live.get(m);
      if (L) {
        // set down on its rails: a short drop and a settle
        const gp = L.group, y1 = gp.position.y;
        gp.scale.set(1, 0.02, 1);
        g.tweens.add({ dur: 0.45, ease: ease.outBack, update: (k) => { gp.scale.set(1, Math.max(0.02, k), 1); gp.position.y = y1 + (1 - k) * 0.03; }, done: () => { gp.scale.set(1, 1, 1); gp.position.y = y1; } });
      }
      sfx('place', { vol: 0.8 });
      g.player && (g.player.shake = Math.max(g.player.shake || 0, 0.05));
      g.progress?.addXP?.(10, 'display');
      g.events.emit('popDisplay', { type: 'fit', machine: m, style });
      g.news?.(`${STYLES[style].name} fitted`, 'Put figures of this machine\'s series in it to draw customers', 5000);
      g.save?.();
    }, { dur: 0.42, arc: 0.12 });
  }

  // ------------------------------------------------------------------ the shop
  maybeBonus() {
    const g = this.game, day = g.clock?.day ?? 0;
    if (this.s.bonusDay === day || Math.random() > POP_DISPLAY.bonusChance) return;
    const owned = Object.keys(this.s.fitted).length + [...(g.items?.list || [])].filter((e) => isTopBox({ kind: e.kind, data: e.data })).length;
    if (owned >= (g.machines?.length || 0) + 1) return;
    this.s.bonusDay = day;
    const style = STYLE_IDS[Math.floor(Math.random() * STYLE_IDS.length)];
    g.delivery?.order?.(topBox(style, { from: 'a capsule coupon' }), { delay: 0.6 });
    g.news?.('当たり! A display coupon', `There was a coupon in the capsule: a free ${STYLES[style].name.toLowerCase()} is by the shutter`, 7000);
    sfx('jingleSmall', { vol: 0.6 });
  }

  /** People in the shop glance up at a display that has figures in it (src/people aware: a soft "noise"). */
  update(dt) {
    if ((this.t -= dt) > 0 || !this.live.size) return;
    this.t = 2.5;
    const A = this.game.aware;
    if (!A?.noise) return;
    for (const L of this.live.values()) {
      const k = this.draw(L.m), n = L.rec.items.filter(Boolean).length;
      if (!n || Math.random() > 0.25 + k * 0.5) continue;
      L.group.getWorldPosition(_v);
      _v.y += L.built.height * 0.6;
      A.noise(_v, 'display', { r: 2.2 + k * 2, chance: 0.3 + k * 0.4, dur: [0.9, 1.9] });
    }
  }

  /** A customer's pick among machines: weight a machine by its display (economy: POP_DISPLAY.pick). */
  weight(m) { return 1 + POP_DISPLAY.pick * this.draw(m); }
}
