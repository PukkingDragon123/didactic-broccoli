// Rarity tiers. weight = relative pull weight of the TIER (the weights sum to 100, so weight = percent); items inside a
// tier share it equally. Odds per capsule: rare 1 in 25, ultra 1 in 150, super secret 1 in 500.
// value = relative prestige (museum appeal, visitor reactions); sell = dealer buy-back price as a multiple of the
// series' pull price (see itemValue in src/game/economy.js): commons are worth less than the capsule cost, the
// rare tiers are where the money is.
// `name` is the display name; `jp` is kept as an alias for older call sites (English too now).
export const RARITIES = {
  common: { id: 'common', name: 'Common', jp: 'Common', stars: 1, weight: 66.13, value: 1, sell: 0.25, color: '#c9c2b4' },
  uncommon: { id: 'uncommon', name: 'Uncommon', jp: 'Uncommon', stars: 2, weight: 29, value: 2.2, sell: 0.6, color: '#7fd17f' },
  rare: { id: 'rare', name: 'Rare', jp: 'Rare', stars: 3, weight: 4, value: 5, sell: 3, color: '#5cb8ff' },
  ultra: { id: 'ultra', name: 'Ultra Rare', jp: 'Ultra Rare', stars: 4, weight: 0.67, value: 16, sell: 15, color: '#ff8af0' },
  secret: { id: 'secret', name: 'Super Secret', jp: 'Super Secret', stars: 5, weight: 0.2, value: 70, sell: 75, color: '#ffd23f' },
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'ultra', 'secret'];

/** "1 in N" odds of pulling a tier (before luck), e.g. oddsOf('secret') = 500. */
export function oddsOf(rarity) {
  const total = RARITY_ORDER.reduce((a, r) => a + RARITIES[r].weight, 0);
  return Math.round(total / RARITIES[rarity].weight);
}
