// The people's worn extras are painted segments (hats: src/people/hair.js, bags and props: src/people/acc.js, shoes:
// src/people/body.js feet), textured through the person's own atlas like the rest of the body. No separately modelled
// gear: it kept each person inside the triangle budget (person <= 2.5k tris). The sets below name the kinds that
// would be modelled; they are empty, so every kind takes its painted-segment path.
export const GEAR_HATS = new Set();
export const GEAR_BAGS = new Set();
export const CLOSED_SHOES = new Set();
export const OPEN_SHOES = new Set();
/** No modelled gear (see above). */
export function buildGear() { return null; }
