// Getting cosmetics outside the shop (achievement and quest rewards, capsule bonuses, web orders) and the paper "unlock
// card" that announces them: a taped-up card with the piece's picture, its name, a rarity stamp and where it came from.
//   game.cosmetics.grant(id, { from, kind, quiet }) -> true the first time (owned; saved; 'cosmetic' event)
//   game.cosmetics.owns(id), .wear(id), .card(id, from)       (kind: 'ach' | 'quest' | 'capsule' | 'web' | 'gift')
import './unlock.css';
import { COSMETIC_BY_ID } from '../people/cosmetics.js';
import { normalizeAvatar } from '../people/avatar.js';
import { RARITIES } from '../data/rarity.js';
import { audio } from '../core/audio.js';
import { cosmeticThumbAsync } from './thumbs.js';
import { loadPrint, hasPrint } from './prints.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const rarityOf = (c) => RARITIES[c?.rarity] || RARITIES.common;

export function installGrants(game) {
  const g = game;
  const el = document.createElement('div');
  el.id = 'cx-unlock';
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  const queue = [];
  let busy = false;

  const avatar = () => (g.state.avatar = normalizeAvatar(g.state.avatar));
  const api = g.cosmetics = {
    owns: (id) => (g.state.avatar?.owned || []).includes(id),
    grant(id, { from = '', kind = 'gift', quiet = false } = {}) {
      const c = COSMETIC_BY_ID[id];
      if (!c || g.visiting) return false;
      const A = avatar();
      if (A.owned.includes(id)) return false;
      A.owned = [...A.owned, id];
      if (hasPrint(id)) loadPrint(id);
      g.save?.();
      if (!quiet) api.card(id, from, kind); // (before the event: a reward it triggers queues behind this one)
      g.events.emit('cosmetic', { id, from, kind });
      return true;
    },
    wear(id) {
      const c = COSMETIC_BY_ID[id];
      if (!c) return;
      const A = avatar();
      if (!A.owned.includes(id)) A.owned = [...A.owned, id];
      A[c.slot] = id;
      const go = () => { g.events.emit('avatar', A); g.save?.(); };
      if (hasPrint(id)) loadPrint(id).then(go); else go();
    },
    card(id, from = '', kind = 'gift') { queue.push({ id, from, kind }); if (!busy) next(); },
    cardMs: 5200, // how long a card stays up
  };

  async function next() {
    const it = queue.shift();
    if (!it) { busy = false; return; }
    busy = true;
    const c = COSMETIC_BY_ID[it.id], R = rarityOf(c);
    let pic = '';
    try { pic = await cosmeticThumbAsync(g, it.id, { size: 80 }); } catch { /* no thumbnail */ }
    const how = { ach: 'Achievement', quest: 'Side quest', capsule: 'Found in a capsule', web: 'Delivered', gift: 'Gift' }[it.kind] || '';
    el.innerHTML = `<div class="cxu-card" style="--rc:${R.color}">
      <div class="cxu-pic">${pic ? `<img src="${pic}" alt="" width="160" height="160" draggable="false">` : ''}</div>
      <div class="cxu-txt"><small>New in your closet</small><b>${esc(c.name)}</b>
        <span class="cxu-rar">${esc(R.name)}</span>
        ${how || it.from ? `<em>${esc(how)}${how && it.from ? ': ' : ''}${esc(it.from)}</em>` : ''}
        <i>Wear it from the closet: the mirror in your room, or click yourself on the title screen.</i></div></div>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    try { audio.play(c.rarity === 'secret' || c.rarity === 'ultra' ? 'complete' : 'newItem', { vol: 0.6 }); } catch { /* audio not ready */ }
    setTimeout(() => { el.classList.remove('show'); setTimeout(next, 450); }, api.cardMs);
  }
  return api;
}
