// The lowpix toy figures in play (src/figures/lowpix.js):
//  - loading: the figures of the series you stock (licences, machines) and whatever is in your hand are fetched in the
//    background after boot, a few at a time; every figure mesh made before its GLB arrives fills in when it does;
//  - gimmicks: with a figure in your hand that has a gimmick clip (a lid, a head turn, a hop...), left click plays it
//    (also while you inspect it); the figure goes back to its resting pose when the clip ends.
// Hooks game.held the way src/game/toys.js does (Held.js is untouched); toys.js keeps its own playable toys.
import { setFigureEvents, preloadSeries, loadFigure, playFigureClip, stopFigureClip, figureClipPlaying, updateFigureClips, isLowpix } from '../figures/lowpix.js';
import { SERIES_BY_ID, getItem } from '../data/series/index.js';
import { audio } from '../core/audio.js';

export function install(game) {
  setFigureEvents(game.events);
  const H = game.held;
  const meshOf = (it) => (it?.kind === 'toy' ? it.obj?.children.find((c) => c.userData.itemKey && isLowpix(getItem(c.userData.itemKey))) || null : null);
  const gimmickOf = (m) => { const item = m && getItem(m.userData.itemKey); return item && !item.toy && m.userData.gimmick ? m.userData.gimmick : null; };
  const play = (m) => {
    if (figureClipPlaying(m)) return;
    if (playFigureClip(m, 'gimmick')) { try { audio.play('flap', { vol: 0.3 }); } catch { /* no such sound */ } }
  };
  if (H) {
    const hint = H.hint.bind(H), primary = H.primary.bind(H);
    H.hint = () => {
      const h = hint(), m = !H.busy && meshOf(H.item), gm = gimmickOf(m);
      return gm && h && h.key === 'RMB' ? { key: 'LMB', text: gm.text || 'Work the gimmick', sub: 'RMB inspect · Q set it down' } : h;
    };
    H.primary = () => { const m = !H.busy && !H.inspecting && meshOf(H.item); if (gimmickOf(m)) play(m); else primary(); };
  }
  let down = false, last = null;
  game.constructor.updaters.push((g, dt) => {
    updateFigureClips(dt);
    if (!H) return;
    const m = meshOf(H.item);
    const b = !!g.input?.button?.(0);
    if (b && !down && H.inspecting && !H.busy && gimmickOf(m)) play(m); // while inspecting, the click goes to the figure
    down = b;
    if (last && last !== m) stopFigureClip(last);
    last = m;
    // the figure inside the capsule you are holding loads before you open it
    const cap = H.item?.kind === 'capsule' ? H.item.data?.key : null;
    if (cap) { const it = getItem(cap); if (isLowpix(it)) loadFigure(it); }
  });
  // what you stock loads in the background, a few at a time
  try {
    const want = new Set([...(game.state.licenses || []), ...(game.state.machines || []).map((mm) => mm.series)]);
    for (const id of want) preloadSeries(SERIES_BY_ID[id]);
  } catch (e) { console.warn('figure preload', e); }
  game.figures = { play: () => { const m = meshOf(H?.item); if (m) play(m); return !!m; } };
  // a save from before this season: its figures were swapped for the new line-up (src/data/series/legacy.js)
  if (game.state.flags?.lineupSwap) {
    const note = () => game.tip?.('lineup', "Grandpa swapped the old stock for this season's line-up", 'Your old figures are new ones of the same rarity');
    if (game.tweens?.wait) game.tweens.wait(4, note); else setTimeout(note, 4000);
  }
}
