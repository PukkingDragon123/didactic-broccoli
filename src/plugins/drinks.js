// Drinks from real labels as pixel art (src/drinks/drinks.js): every vending drink and the ramune bottle are drawn as a
// low-poly can / bottle wearing its pixel wrap wherever the game makes one through propMesh (the can out of the
// vending machine, the drink in your hands, the corner shop, the market), and the vending machines' window samples and
// close-up labels use the same wraps (src/places/vending/canArt.js). The voxel builds stay as the props' sizes.
// Patched in at import time (before the world is built), so nothing else needs to know.
import { PROPS } from '../world/props.js';
import { FOODS, DRINK_IDS } from '../needs/foods.js';
import { drinkMesh } from '../drinks/drinks.js';

for (const id of DRINK_IDS) {
  const def = PROPS[FOODS[id]?.prop];
  if (def) def.mesh = () => drinkMesh(FOODS[id]);
}
if (PROPS.ramune_bottle && FOODS.ramune) PROPS.ramune_bottle.mesh = () => drinkMesh(FOODS.ramune);

export function install() { /* (patched at import: see above) */ }
