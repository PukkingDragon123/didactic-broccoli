// The free Duck Head: a thank-you gift (the owner: no "follow on itch" call-to-action anywhere). The Duck Head's slip in
// the dressing room has a "Take it" button that hands the duck over at once, with the normal unlock card
// (src/cosmetics/grant.js) and a NEW sticker in the closet; no page is opened. Saved once per save file (ensureState
// 'itch', kept under its old key so old saves load and a duck already claimed stays claimed).
//   claimItch(game) -> true when the duck was given now       itchClaimed(game) -> bool
//   DUCK_ID, ITCH_URL (src/data/links.js: the owner sets the real page there)
import { ITCH_URL } from '../data/links.js';
import { ensureState } from '../game/stateExt.js';

export { ITCH_URL };
export const DUCK_ID = 'cx_duck';

const state = (game) => ensureState(game, 'itch', { followed: false, day: null });
export const itchClaimed = (game) => !!(game.state?.itch?.followed || (game.state?.avatar?.owned || []).includes(DUCK_ID));

export function claimItch(game) {
  if (game.visiting) { game.news?.('A gift for you!', 'Claim your Duck Head from your own shop.', 4500); return false; }
  const S = state(game);
  S.followed = true;
  S.day ??= game.clock?.day ?? null;
  let got = false;
  if (game.cosmetics) got = game.cosmetics.grant(DUCK_ID, { from: 'A little thank-you gift from us!', kind: 'itch' });
  else { // (no closet system yet: put it in the wardrobe quietly)
    const A = game.state.avatar;
    if (A && Array.isArray(A.owned) && !A.owned.includes(DUCK_ID)) { A.owned.push(DUCK_ID); got = true; game.events?.emit('cosmetic', { id: DUCK_ID, kind: 'itch' }); }
  }
  game.save?.();
  game.events?.emit('itch', { followed: true, got });
  return got;
}
