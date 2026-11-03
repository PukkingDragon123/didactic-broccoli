// Cardboard storage boxes (the 'storage' furniture feature): put anything you carry in (up to 8 things), take them
// out again (last in, first out), the top few peek out of the open flaps, write a label on the front (T), stack boxes
// on top of each other, carry a full box around (RMB packs it into your hands with everything still inside).
// Saved in the piece's st: { items: [{ kind, d }], label }.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { makeItemMesh } from '../game/collectibles.js';
import { makeCapsule, makeShell } from '../game/Capsule.js';
import { makeToolMesh } from '../game/Held.js';
import { TOOLS } from '../data/tools.js';
import { getItem } from '../data/series/index.js';
import { boxLabelCanvas, setFlaps } from './models.js';

export const BOX_CAP = 8;

/** A short name for anything you can hold. */
export function itemName(kind, d) {
  if (kind === 'toy') return getItem(d?.key)?.name || 'figure';
  if (kind === 'capsule') return 'capsule';
  if (kind === 'shell') return 'empty capsule';
  if (kind === 'tool') return TOOLS[d?.id]?.name || 'thing';
  if (kind === 'packaged') return (getItem(d?.key)?.name || 'figure') + ' (boxed)';
  if (kind === 'box') return d?.name || 'box';
  return kind;
}

/** A mesh for something in a box (also used to hand it back to you). */
export function itemMesh(game, kind, d) {
  if (kind === 'toy') { const g = new THREE.Group(); g.add(makeItemMesh(d.key, d.finish)); return g; }
  if (kind === 'capsule') { const cap = makeCapsule(d.series, d.color); cap.group.userData.capRef = cap; return cap.group; }
  if (kind === 'shell') return makeShell(d.series, d.color).group;
  if (kind === 'tool' && TOOLS[d.id]) return makeToolMesh(d.id);
  if (kind === 'box') return game.delivery.meshFor(d);
  if (kind === 'packaged' && game.packaging?.meshFor) return game.packaging.meshFor(d);
  return null;
}

const storable = (it) => it && it.kind !== 'cat' && !(it.kind === 'box' && it.data?.id === 'storage_box') && !(it.kind === 'tool' && it.data?.story);

export const STORAGE = {
  init(p, g) {
    const s = p.data.st;
    s.items ??= [];
    s.label ??= '';
    STORAGE.refresh(p, g);
  },

  /** Peeking contents and flaps (closed when something sits on top). */
  refresh(p, g, covered = null) {
    const s = p.data.st, peek = p.parts.peek;
    if (!peek) return;
    peek.clear();
    if (covered === null) covered = (g.decor?.stackedOn(p).length || 0) > 0;
    setFlaps(p.parts, !covered);
    if (covered) return;
    s.items.slice(-3).forEach((it, i, a) => {
      let m = null;
      try { m = itemMesh(g, it.kind, it.d); } catch { m = null; }
      if (!m) return;
      const b = new THREE.Box3().setFromObject(m), size = b.getSize(new THREE.Vector3());
      const k = Math.min(1.2, 0.13 / Math.max(size.x, size.y, size.z, 0.01));
      m.scale.multiplyScalar(k);
      const n = a.length;
      m.position.set((i - (n - 1) / 2) * 0.12, 0.01 + (i % 2) * 0.015, (i % 2 ? 0.04 : -0.03));
      m.rotation.set(0.25 * (i % 2 ? 1 : -1), i * 1.3, 0.15 * (i - 1));
      m.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.raycast = () => {}; } });
      peek.add(m);
    });
  },

  hint(p, held, g) {
    const s = p.data.st, n = s.items.length, name = s.label ? `"${s.label}"` : 'Cardboard box';
    if (g.decor.stackedOn(p).length) return { key: '', text: name, sub: 'Something is stacked on it' };
    if (held) {
      if (!storable(held)) return { key: '', text: name, sub: held.kind === 'box' && held.data?.id === 'storage_box' ? 'Stack it on top instead' : "That won't go in" };
      if (n >= BOX_CAP) return { key: '', text: `${name} is full`, sub: `${n}/${BOX_CAP}` };
      return { key: 'LMB', text: `Put the ${itemName(held.kind, held.data)} in`, sub: `${name} · ${n}/${BOX_CAP} · T write a label` };
    }
    if (!n) return { key: '', text: name, sub: 'Empty · T write a label · RMB carry it' };
    const top = s.items[n - 1];
    const list = s.items.slice(-4).reverse().map((it) => itemName(it.kind, it.d)).join(', ');
    return { key: 'LMB', text: `Take out the ${itemName(top.kind, top.d)}`, sub: `${name} · ${n} inside: ${list}${n > 4 ? '...' : ''} · T label` };
  },

  use(p, held, g) {
    const s = p.data.st;
    if (g.decor.stackedOn(p).length) return;
    const H = g.held;
    if (held) {
      if (!storable(held) || s.items.length >= BOX_CAP || H.busy) return;
      const target = p.root.localToWorld(new THREE.Vector3(0, 0.28, 0));
      const entry = { kind: held.kind, d: held.data };
      H.putTo(target, new THREE.Quaternion(), (obj) => {
        obj.parent?.remove(obj);
        s.items.push(entry);
        audio.play('boxPack', { pos: target, vol: 0.5 });
        STORAGE.refresh(p, g);
        g.events.emit('boxStore', { uid: p.data.uid, item: entry });
        g.save();
      }, { dur: 0.35, arc: 0.12, scale: 0.6 });
      return;
    }
    if (!s.items.length) return;
    if (!H.canTake()) { g.news('Your hands are full'); return; }
    const it = s.items.pop();
    const obj = itemMesh(g, it.kind, it.d);
    if (!obj) { g.news("Couldn't take that out"); return; }
    obj.position.copy(p.root.localToWorld(new THREE.Vector3(0, 0.28, 0)));
    g.scene.add(obj);
    H.take(it.kind, it.d, obj);
    audio.play('pickup', { vol: 0.7 });
    STORAGE.refresh(p, g);
    g.save();
  },

  /** Write a label on the front (a little text prompt; Enter to keep, Esc to cancel). */
  label(p, g) {
    if (document.querySelector('.box-label')) return;
    const s = p.data.st;
    const el = document.createElement('div');
    el.className = 'box-label';
    el.innerHTML = '<span>Label:</span><input maxlength="14" spellcheck="false"><small>Enter</small>';
    document.body.appendChild(el);
    const inp = el.querySelector('input');
    inp.value = s.label || '';
    const P = g.player, prev = { frozen: P.frozen, ui: g.uiOpen };
    P.frozen = true; g.uiOpen = true; g.held.reading = true;
    audio.play('marker', { vol: 0.5 });
    const done = (keep) => {
      el.remove();
      P.frozen = prev.frozen; g.uiOpen = prev.ui; g.held.reading = false;
      if (keep) {
        s.label = inp.value.trim().slice(0, 14);
        const c = boxLabelCanvas(s.label);
        p.parts.labelTex.image = c;
        p.parts.labelTex.needsUpdate = true;
        audio.play('marker', { pos: p.root.position, vol: 0.7 });
        g.save();
      }
      g.input.keys.clear();
      if (!g.input.locked) g.input.lock();
    };
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') done(true);
      else if (e.key === 'Escape') done(false);
    });
    inp.addEventListener('blur', () => { if (el.isConnected) done(true); });
    setTimeout(() => inp.focus(), 30);
  },

  quality: () => 0,
};
