// game.dressing: the Dressing Room (src/dressing/DressingRoom.js), opened from the main menu (click yourself, or
// Wardrobe) and from the mirror in your room.
//   game.dressing.open({ from: 'menu' | 'mirror' }) -> Promise<avatar> (resolves when it closes)
//   game.dressing.close(), game.dressing.isOpen
// While it covers the screen the game's own frame isn't drawn (its canvas is hidden under the room anyway).
// Test helpers: window.dbg.dressing (open, tab, hover, choose, equip, unlockAll, zoom, spin, poof, itch, state).
import { DressingRoom } from './DressingRoom.js';
import { TABS } from './catalog.js';
import { equipPoof } from './fx.js';
import { COSMETIC_BY_ID } from '../people/cosmetics.js';

export function installDressing(game) {
  const g = game;
  let room = null;
  const get = () => (room ||= new DressingRoom(g));
  const api = g.dressing = {
    open: (opts = {}) => get().open(opts),
    close: () => room?.close(),
    get isOpen() { return !!room?.isOpen; },
    get room() { return room; },
  };
  // skip drawing the world while the room covers it
  const render0 = g.render.bind(g);
  g.render = (dt) => { if (room?.covering) return; render0(dt); };

  const D = {
    open: (from = 'menu') => { api.open({ from }); return true; },
    close: () => { api.close(); return true; },
    /** Switch tab (hair, hairCol, face, skin, tops, bottoms, shoes, hats, glasses, bags, body). */
    tab: (id) => { get().setTab(id); return get().tab; },
    tabs: () => TABS.map((t) => t.id),
    /** Hover a card by uid ('cos:cx_beret', 'base:hair:bob', 'sw:hairCol:pink', 'none:hat') or cosmetic id. */
    hover: (uid) => { const r = get(); const it = item(r, uid); r.preview(it); return !!it; },
    /** Click a card (wear / try on / select). */
    choose: (uid) => { const r = get(); const it = item(r, uid); if (it) r.choose(it); return r.sel; },
    /** Put a cosmetic on (owned or not: owns it first). */
    equip: (id) => { const c = COSMETIC_BY_ID[id]; const r = get(); if (!c) return false; const A = g.state.avatar; if (!A.owned.includes(id)) A.owned.push(id); r.setTab({ hat: 'hats', outfit: 'tops', face: 'glasses', bag: 'bags', shoes: 'shoes' }[c.slot]); r.choose(item(r, `cos:${id}`)); return true; },
    buy: () => { get().buy(); return true; },
    /** Show everything as owned (for screenshots; nothing is saved). */
    unlockAll: (on = true) => { const r = get(); r.allOwned = on; if (r.isOpen) r.render(); return on; },
    zoom: (name) => { get().stage?.zoomTo(name); return true; },
    zoomNow: (name) => { get().stage?.zoomTo(name, true); return true; },
    spin: (rad = 1) => { get().stage?.spinBy(rad); return true; },
    fling: (v = 6) => { get().stage?.fling(v); return true; },
    /** Lock someone out of a piece again (for screenshots of a locked slip). */
    lose: (id) => { const A = g.state.avatar; A.owned = A.owned.filter((x) => x !== id); for (const s of ['hat', 'outfit', 'face', 'bag', 'shoes']) if (A[s] === id) A[s] = null; if (g.state.itch && id === 'cx_duck') g.state.itch.followed = false; const r = get(); if (r.isOpen) { r.lastLook = null; r.render(); r.refreshModel(); } return true; },
    poof: (rarity = 'common', at = 0.6) => { const st = get().stage; if (st) { equipPoof(st, at, rarity); st.hop(); } return true; },
    /** Press the Duck Head slip's "Follow on itch.io" button (opens the itch page, grants the duck once). */
    itch: () => { const r = get(); r.setTab('hats'); r.choose(item(r, 'cos:cx_duck')); r.slipEl?.querySelector('[data-act="itch"]')?.click(); return g.state.avatar.owned.includes('cx_duck'); },
    /** Turn to a yaw (0 = facing you) and stop there. */
    face: (yaw = 0) => { const st = get().stage; if (st) { st.yaw = yaw; st.yawVel = 0; st.poseYaw = null; st.idleT = 0; } return true; },
    focus: (uid) => { const r = get(); const el = r.scroll?.querySelector(`[data-uid="${CSS.escape(uid)}"]`); el?.focus({ preventScroll: true }); if (el) r.reveal(el); return !!el; },
    key: (key) => { dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); return true; },
    /** Mark a cosmetic as newly arrived (owned, not seen yet). */
    makeNew: (id) => { const A = g.state.avatar; if (!A.owned.includes(id)) A.owned.push(id); const r = get(); r.S.seen = r.S.seen.filter((x) => x !== id); if (r.isOpen) r.render(); return true; },
    state: () => { const r = get(); return { open: r.isOpen, tab: r.tab, sel: r.sel, sticky: r.sticky, hover: r.hover, fx: r.stage?.fx.count ?? 0, covering: r.covering, size: r.stage?.size }; },
    /** Run the room for `sec` seconds of game time right now (drawing only the last frame): headless screenshots. */
    step: (sec = 1, dt = 1 / 30) => { const r = get(); if (!r.isOpen) return 0; const n = Math.max(1, Math.round(sec / dt)); for (let i = 0; i < n; i++) { r.stage.noRender = i < n - 1; r.frame(dt); } r.stage.noRender = false; return r.frames; },
    frames: () => get().frames || 0,
    scrollTo: (uid) => { const r = get(), el = r.scroll?.querySelector(`[data-uid="${CSS.escape(uid)}"]`); if (el) r.reveal(el, true); return !!el; },
  };
  const item = (r, uid) => { if (!uid) return null; if (!r.items) return null; return r.items.get(uid) || r.items.get(`cos:${uid}`) || null; };
  setTimeout(() => { if (window.dbg) window.dbg.dressing = D; }, 0);
  g.dressingDebug = D;
  return api;
}
