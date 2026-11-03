// Style & feel (phase 3): the bigger wardrobe and how you get it, more achievements, and the minimal HUD.
//  - cosmetics: ~80 more pieces (src/cosmetics/catalog.js: voxel hats, glasses and festival masks, outfits and kigurumi,
//    big photo-print tees from pixelated CC-BY photos, bags, shoes) with rarities; rewards from achievements, side
//    quests and rare capsule bonuses with a paper unlock card (grant.js, rewards.js); the kirakira-closet.jp web shop
//    (shop.js); a mirror in your room that opens the closet in-game (wardrobe.js)
//  - achievements: the silly, the life milestones with progress counters, the wardrobe ones (src/style/achievements.js)
//  - the minimal HUD (src/style/hud.js) and the first-person wallet + wristwatch check on Tab (src/style/check.js)
import { installGrants } from '../cosmetics/grant.js';
import { installRewards } from '../cosmetics/rewards.js';
import { installWebShop } from '../cosmetics/shop.js';
import { installWardrobe } from '../cosmetics/wardrobe.js';
import { ensurePrints, hasPrint } from '../cosmetics/prints.js';
import { installStyleAchievements } from '../style/achievements.js';
import { installMinimalHud } from '../style/hud.js';
import { installCheck } from '../style/check.js';
import { COSMETICS } from '../people/cosmetics.js';
import { cosmeticThumb } from '../cosmetics/thumbs.js';

export function install(game) {
  const g = game;
  const safe = (name, fn) => { try { return fn(); } catch (e) { console.warn(name, e); return null; } };
  safe('cosmetics', () => installGrants(g));
  safe('style achievements', () => installStyleAchievements(g));
  safe('cosmetic rewards', () => installRewards(g));
  safe('web shop', () => installWebShop(g));
  // the mirror needs your room, which is built after every plugin has installed (src/plugins/needs.js)
  g.constructor.late.push(() => safe('wardrobe', () => installWardrobe(g)));
  safe('minimal hud', () => installMinimalHud(g));
  safe('check', () => installCheck(g));

  // photo prints for the pieces you own; whoever wears one rebuilds once it's in
  const A = g.state.avatar || {};
  const mine = [...(A.owned || []), A.outfit].filter((id) => id && hasPrint(id));
  if (mine.length) {
    ensurePrints(mine).then(() => {
      if (!hasPrint(g.state.avatar?.outfit)) return;
      g.events.emit('avatar', g.state.avatar);
      if (g.menuCrew && !g.menuCrew.busy) g.menuCrew.setLook(g.state.avatar);
    });
  }

  // test helpers
  g.cosmeticsDebug = {
    ...(g.cosmeticsDebug || {}),
    grant: (id, kind = 'gift', from = 'Debug') => g.cosmetics?.grant(id, { kind, from }),
    wear: (id) => g.cosmetics?.wear(id),
    all: () => COSMETICS.map((c) => c.id),
    thumb: (id) => !!cosmeticThumb(g, id, { size: 192, look: g.state.avatar }),
    prewarm(slot) { let n = 0; for (const c of COSMETICS) if (!slot || c.slot === slot) n += cosmeticThumb(g, c.id, { size: 192, look: g.state.avatar }) ? 1 : 0; return n; },
    ownAll() { const a = g.state.avatar; a.owned = [...new Set([...(a.owned || []), ...COSMETICS.map((c) => c.id)])]; g.events.emit('avatar', a); return a.owned.length; },
  };
}
