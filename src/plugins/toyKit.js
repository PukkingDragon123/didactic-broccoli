// The Blender toy line's gimmick kit (art/blender/toys/GIMMICKS.md): keychain versions on ball chains (hooks, display
// slots, your bag), light-up parts, playset parts that snap together on a shelf, and pull-back runs (toys.js).
// The press behaviours plug into src/game/figureGimmicks.js (onFigurePress), the figure meshes into lowpix.js.
import * as THREE from 'three';
import { onFigureMesh, playFigureClip, stopFigureClip } from '../figures/lowpix.js';
import { onFigurePress } from '../game/figureGimmicks.js';
import { getItem } from '../data/series/index.js';
import { Keychains, keychainOf, chainOf } from '../game/keychains.js';
import { LightUp } from '../game/lightup.js';
import { Playsets } from '../game/playsets.js';
import { DisplaySlots } from '../game/Display.js';

export function install(game) {
  const K = new Keychains(game), L = new LightUp(game), P = new Playsets(game);
  game.keychains = K; game.lightUp = L; game.playsets = P;
  onFigureMesh((mesh, item) => {
    K.adopt(mesh, item);
    L.adopt(mesh, item);
    if (item.pullback && !mesh.userData.gimmick) mesh.userData.gimmick = { text: item.pullback.text || 'Pull it back' };
  });
  onFigurePress((mesh, item) => {
    let d = L.press(mesh);
    if (item?.pullback) {
      const H = game.held;
      let inHand = false;
      for (let o = mesh; o; o = o.parent) if (o === H?.item?.obj) inHand = true;
      if (inHand) { // LMB in hand: set it down and let it go (a click while inspecting plays its press clip instead)
        if (H.inspecting || !game.toys) return d;
        game.toys.pullBack(H.item);
        return Math.max(d, 1);
      }
      const ent = [...(game.items?.list || [])].find((e) => e.mesh === mesh && e.kind === 'toy');
      if (ent && game.toys) { // lying loose: it runs off across the floor
        const p = ent.obj.position.clone(), yaw = ent.obj.rotation.y, data = ent.data;
        game.items.destroy(ent);
        const holder = new THREE.Group(), inner = mesh.clone();
        inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0); delete inner.userData.figLive;
        holder.add(inner); holder.position.copy(p); holder.rotation.y = yaw; game.scene.add(holder);
        game.toys.startRun(holder, inner, data, item.pullback, p.y);
        d = Math.max(d, 2);
      } else { // on a shelf: it revs in place for a moment
        playFigureClip(mesh, item.pullback.clip || 'run', { loop: true });
        game.tweens?.wait?.(1.4, () => stopFigureClip(mesh));
        d = Math.max(d, 1.4);
      }
    }
    return d;
  });
  // keychains on display slots hang from a cup hook under the board above (when they fit)
  const show = DisplaySlots.prototype.showItem, clear = DisplaySlots.prototype.clearItem;
  if (!show.__kc) {
    DisplaySlots.prototype.showItem = function showKeychain(i, data, pop) {
      const r = show.call(this, i, data, pop), s = this.slots[i];
      if (s.kcHook) { s.kcHook.parent?.remove(s.kcHook); s.kcHook = null; }
      if (chainOf(s.mesh)) {
        const h = (s.def.size?.[1] ?? 0.13), chain = keychainOf(getItem(data.k)).chain * 0.001, fig = s.mesh.geometry.userData.size?.y || 0.05;
        if (fig + chain + 0.006 <= h + 0.008) {
          // the cup hook's collar against the underside of the board above, the chain in the bottom of its curl
          const local = s.def.pos.clone().add(new THREE.Vector3(0, h + 0.014, -0.012)), at = local.clone().add(new THREE.Vector3(0, -0.0052, 0));
          const hang = () => { s.kcHook ||= K.hookMesh(this.owner, local); this.owner.updateWorldMatrix(true, false); K.setHook(s.mesh, this.owner.localToWorld(at), s.def.rotY || 0); };
          if (chainOf(s.mesh).built) hang(); else game.tweens?.wait?.(0.5, hang);
        }
      }
      return r;
    };
    DisplaySlots.prototype.showItem.__kc = true;
    DisplaySlots.prototype.clearItem = function clearKeychain(i) { const s = this.slots[i]; if (s?.kcHook) { s.kcHook.parent?.remove(s.kcHook); s.kcHook = null; } return clear.call(this, i); };
  }
  // in your hand: LMB clips a keychain to your bag (F when it also has a gimmick)
  const H = game.held;
  if (H) {
    const kcIn = () => (H.item?.kind === 'toy' && !H.busy ? keychainOf(getItem(H.item.data.key)) : null);
    const gim = () => { const it = getItem(H.item?.data?.key); return !!(it && (it.gimmick || it.light || it.pullback)); };
    const hint = H.hint.bind(H), primary = H.primary.bind(H);
    H.hint = () => {
      const h = hint();
      if (!kcIn() || H.inspecting) return h;
      if (!gim()) return { key: 'LMB', text: 'Clip it to your bag', sub: 'RMB inspect · Q put down' };
      return h ? { ...h, sub: `F clip to bag · ${h.sub || ''}` } : h;
    };
    H.primary = () => { if (kcIn() && !gim() && !H.inspecting) { K.clipToBag(); return; } primary(); };
  }
  game.constructor.updaters.push((g, dt) => {
    if (kcHeld(g) && g.input?.keyPressed?.('KeyF') && g.input.locked && !g.uiOpen) K.clipToBag();
    P.update(); L.update(dt); K.update(dt);
  });
  const kcHeld = (g) => g.held?.item?.kind === 'toy' && !!keychainOf(getItem(g.held.item.data.key));
  K.syncBag();
  // what was built before this plugin: re-show display slots holding kit figures, adopt loose ones
  for (const d of game.allDisplays?.() || []) d.items.forEach((it, i) => { const item = it && getItem(it.k); if (item && (keychainOf(item) || item.light)) d.showItem(i, it, false); });
  for (const e of game.items?.list || []) { const item = e.kind === 'toy' && getItem(e.data?.key); if (item && e.mesh) { K.adopt(e.mesh, item); L.adopt(e.mesh, item); } }
}
