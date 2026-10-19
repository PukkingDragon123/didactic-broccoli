// Rarity tiers. weight = relative pull weight of the TIER; items inside a tier share it equally.
// `name` is the display name; `jp` is kept as an alias for older call sites (English too now).
export const RARITIES = {
  common: { id: 'common', name: 'Common', jp: 'Common', stars: 1, weight: 56, value: 1, color: '#c9c2b4' },
  uncommon: { id: 'uncommon', name: 'Uncommon', jp: 'Uncommon', stars: 2, weight: 27, value: 2.2, color: '#7fd17f' },
  rare: { id: 'rare', name: 'Rare', jp: 'Rare', stars: 3, weight: 12, value: 5, color: '#5cb8ff' },
  ultra: { id: 'ultra', name: 'Ultra Rare', jp: 'Ultra Rare', stars: 4, weight: 4.2, value: 16, color: '#ff8af0' },
  secret: { id: 'secret', name: 'Super Secret', jp: 'Super Secret', stars: 5, weight: 0.8, value: 70, color: '#ffd23f' },
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'ultra', 'secret'];
