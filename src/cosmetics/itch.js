// The free Duck Head for following the game on itch.io. We can't check a follow, so it's the honour system: the
// "Follow on itch.io" button (the Duck Head's slip in the dressing room, the little tag on the title screen) opens the
// itch page in a new tab and hands the duck over at once, with the normal unlock card (src/cosmetics/grant.js) and a NEW
// sticker in the closet. Saved once per save file (ensureState 'itch'); the page can be opened again any time.
//   claimItch(game) -> true when the duck was given now       itchClaimed(game) -> bool
//   DUCK_ID, ITCH_URL (src/data/links.js: the owner sets the real page there)
import { ITCH_URL } from '../data/links.js';
import { ensureState } from '../game/stateExt.js';

export { ITCH_URL };
export const DUCK_ID = 'cx_duck';

const state = (game) => ensureState(game, 'itch', { followed: false, day: null });
export const itchClaimed = (game) => !!(game.state?.itch?.followed || (game.state?.avatar?.owned || []).includes(DUCK_ID));

export function claimItch(game) {
  // (straight from the click, so the browser lets the tab open)
  try { window.open(ITCH_URL, '_blank', 'noopener'); } catch { /* no window (tests) */ }
  if (game.visiting) { game.news?.('Thanks for following!', 'Claim your Duck Head from your own shop.', 4500); return false; }
  const S = state(game);
  S.followed = true;
  S.day ??= game.clock?.day ?? null;
  let got = false;
  if (game.cosmetics) got = game.cosmetics.grant(DUCK_ID, { from: 'Thanks for following us on itch.io!', kind: 'itch' });
  else { // (no closet system yet: put it in the wardrobe quietly)
    const A = game.state.avatar;
    if (A && Array.isArray(A.owned) && !A.owned.includes(DUCK_ID)) { A.owned.push(DUCK_ID); got = true; game.events?.emit('cosmetic', { id: DUCK_ID, kind: 'itch' }); }
  }
  game.save?.();
  game.events?.emit('itch', { followed: true, got });
  return got;
}
