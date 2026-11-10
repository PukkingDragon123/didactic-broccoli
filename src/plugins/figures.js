// The sculpted figures (src/figures) in play:
//  - their rigs: with one in your hand, left click works its gimmick (a lid, a drawer, a head that turns), also while
//    you inspect it; and while you turn it over, the joints marked `idle` sway a little (a tail, an ear, a head);
//  - their baking: the figures of the series you stock are painted in idle time (src/core/idle.js) after the game has
//    started, light versions first, and the figure inside a capsule the moment you pick the capsule up.
// Hooks game.held the way src/game/toys.js does (Held.js is untouched).
import { playGimmick, stopGimmick, gimmickRest, isFigure, prebakeFigure, figureJoints } from '../figures/index.js';
import { SERIES_BY_ID, getItem } from '../data/series/index.js';
import { audio } from '../core/audio.js';

const ease = (k) => k * k * (3 - 2 * k);

export function install(game) {
  const H = game.held;
  const meshOf = (it) => (it?.kind === 'toy' ? it.obj?.children.find((c) => c.userData.itemKey && isFigure(getItem(c.userData.itemKey))) || null : null);
  let live = null; // { mesh, from, to, k, rest, idle: [[joint, amp, phase]] }
  const start = (mesh) => {
    const rest = gimmickRest(mesh), J = figureJoints(getItem(mesh.userData.itemKey));
    return { mesh, from: rest, to: rest, k: 1, rest, idle: Object.entries(J).filter(([, d]) => d.idle).map(([n, d], i) => [n, d.idle, i * 1.7]) };
  };
  const toggle = (mesh) => {
    if (!mesh.userData.gimmick) return;
    if (!live || live.mesh !== mesh) { if (live) stopGimmick(live.mesh); live = start(mesh); }
    const at = live.from + (live.to - live.from) * ease(live.k), other = live.rest < 0.5 ? 1 : 0;
    live.from = at; live.to = live.to !== live.rest ? live.rest : other; live.k = 0;
    try { audio.play('flap', { vol: 0.35 }); } catch { /* no such sound: silent */ }
  };
  const hint = H.hint.bind(H), primary = H.primary.bind(H);
  H.hint = () => {
    const h = hint(), m = !H.busy && meshOf(H.item);
    return m && m.userData.gimmick && h && h.key === 'RMB' ? { key: 'LMB', text: m.userData.gimmick.text || 'Move it', sub: 'RMB inspect · Q set it down' } : h;
  };
  H.primary = () => { const m = !H.busy && !H.inspecting && meshOf(H.item); if (m && m.userData.gimmick) toggle(m); else primary(); };
  let down = false, capsule = null;
  game.constructor.updaters.push((g, dt) => {
    const b = !!g.input.button(0), m = meshOf(H.item);
    if (b && !down && H.inspecting && !H.busy && m) toggle(m); // while inspecting, the click goes to the figure
    down = b;
    // the figure in the capsule you just picked up is baked next
    const cap = H.item?.kind === 'capsule' ? H.item.data?.key : null;
    if (cap && cap !== capsule) { const it = getItem(cap); if (isFigure(it)) prebakeFigure(it); }
    capsule = cap;
    if (live && live.mesh !== m) { stopGimmick(live.mesh); live = null; } // it left your hand: back to rest
    if (!live && m && H.inspecting && !H.busy) live = start(m);
    if (!live) return;
    live.k = Math.min(1, live.k + dt * 2.4);
    const t = live.from + (live.to - live.from) * ease(live.k), sway = H.inspecting && live.idle.length;
    if (!sway && live.k >= 1 && live.to === live.rest) { stopGimmick(live.mesh); live = null; return; }
    let add = null;
    if (sway) { add = {}; for (const [n, amp, ph] of live.idle) add[n] = amp * Math.sin(g.time * 2.1 + ph); }
    playGimmick(live.mesh, t, add);
  });
  // paint what you stock, in idle time: light versions first, then the full ones
  try {
    const want = new Set([...(game.state.licenses || []), ...(game.state.machines || []).map((mm) => mm.series)]), list = [];
    for (const id of want) for (const it of SERIES_BY_ID[id]?.items || []) if (isFigure(it)) list.push(it);
    for (const it of list) prebakeFigure(it, true);
    for (const it of list) prebakeFigure(it, false);
  } catch (e) { console.warn('figure prebake', e); }
  game.figureGimmick = { toggle: () => { const m = meshOf(H.item); if (m) toggle(m); return !!m; }, get live() { return live; } };
}
