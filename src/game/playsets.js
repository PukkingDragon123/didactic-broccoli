// Playset parts (art/blender/toys/GIMMICKS.md, "playset"): figures that come with a piece of a bigger set (a ladder
// section, a track, a stall) snap together when you display them next to each other. item.playset:
//   { set: 'hashigo', in: 'in', out: 'out' }   in / out: the GLB points (pt_in, pt_out) where a part sits on the
//   previous part and where the next part goes on it.
// On a display (garage shelf board, museum case), parts of one set in neighbouring slots of the same board join up
// in slot order: the leftmost stays put and each next one slides over and clicks onto the one before it, its pt_in
// on that part's pt_out (a ladder grows upwards, a track along the board), while the assembly fits the slot's
// height. Take one away and the rest re-join. Pressing a part still plays its own gimmick where it now stands.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { getItem } from '../data/series/index.js';
import { figurePoint, figureReady, loadFigure } from '../figures/lowpix.js';
import { DisplaySlots } from './Display.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
export const playsetOf = (key) => getItem(key)?.playset || null;

export class Playsets {
  constructor(game) {
    this.game = game;
    const P = this;
    for (const fn of ['showItem', 'clearItem']) {
      const orig = DisplaySlots.prototype[fn];
      if (orig.__playset) continue;
      DisplaySlots.prototype[fn] = function playsetAware(...a) { const r = orig.apply(this, a); if (fn === 'showItem' && a[2] && this.slots[a[0]]?.mesh) this.slots[a[0]].mesh.userData.psPop = true; P.queue(this); return r; };
      DisplaySlots.prototype[fn].__playset = true;
    }
    this.dirty = new Set();
    game.events?.on?.('figureReady', () => { for (const d of game.allDisplays?.() || []) this.queue(d); });
    for (const d of game.allDisplays?.() || []) this.queue(d);
  }
  queue(d) { this.dirty.add(d); }

  update() {
    for (const d of this.dirty) this.layout(d);
    this.dirty.clear();
  }

  /** Join the playset parts of one display. */
  layout(d) {
    const S = d.slots, I = d.items;
    let prev = null; // { slot, item, ps, base }
    for (let i = 0; i < S.length; i++) {
      const s = S[i], cur = I[i], ps = cur && playsetOf(cur.k);
      if (!s.mesh) { prev = null; continue; }
      const home = s.def.pos;
      if (!ps) { prev = null; this.move(s, home, false); continue; }
      const it = getItem(cur.k);
      if (!figureReady(it.key)) { loadFigure(it); prev = null; continue; }
      const joins = prev && prev.ps.set === ps.set && prev.slot.i === i - 1 && Math.abs(prev.slot.def.pos.y - home.y) < 0.002 && (prev.slot.def.rotY || 0) === (s.def.rotY || 0);
      if (joins) {
        // this part's pt_in onto the previous part's pt_out (both in the owner's space)
        const out = figurePoint(prev.item, prev.ps.out || 'out', _a).applyAxisAngle(THREE.Object3D.DEFAULT_UP, prev.slot.def.rotY || 0).add(prev.at);
        const inn = figurePoint(it, ps.in || 'in', _b).applyAxisAngle(THREE.Object3D.DEFAULT_UP, s.def.rotY || 0);
        const at = out.sub(inn);
        const top = at.y + (s.mesh.geometry.userData.size?.y || 0.05);
        const room = prev.base.def.pos.y + (prev.base.def.size?.[1] || 0.13) + 0.012;
        if (top <= room) {
          this.move(s, at, true);
          prev = { slot: s, item: it, ps, base: prev.base, at: at.clone() };
          continue;
        }
      }
      this.move(s, home, false);
      prev = { slot: s, item: it, ps, base: s, at: home.clone() };
    }
  }

  /** Slide a slot's figure to a spot (a click when it joins). */
  move(s, to, joined) {
    const m = s.mesh;
    if (m.userData.psAt && m.userData.psAt.distanceTo(to) < 1e-5) return;
    const first = !m.userData.psAt;
    m.userData.psAt = to.clone();
    if (first && !joined) return; // (where DisplaySlots put it)
    const from = m.position.clone(), g = this.game;
    if (!g.tweens || (first && !m.userData.psPop)) { m.position.copy(to); return; } // (a save loading: already joined)
    g.tweens.add({ dur: 0.35, update: (k) => { m.position.lerpVectors(from, to, k); m.position.y += Math.sin(k * Math.PI) * 0.015; }, done: () => {
      if (joined) audio.play('toySnap', { pos: m.getWorldPosition(new THREE.Vector3()), v: 0.7, f: 1900 });
    } });
  }
}
