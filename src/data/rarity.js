// Rarity tiers. weight = relative pull weight of the TIER; items inside a tier share it equally.
export const RARITIES = {
  common: { id: 'common', name: 'Common', jp: 'ノーマル', stars: 1, weight: 56, value: 1, color: '#c9c2b4' },
  uncommon: { id: 'uncommon', name: 'Uncommon', jp: 'アンコモン', stars: 2, weight: 27, value: 2.2, color: '#7fd17f' },
  rare: { id: 'rare', name: 'Rare', jp: 'レア', stars: 3, weight: 12, value: 5, color: '#5cb8ff' },
  ultra: { id: 'ultra', name: 'Ultra Rare', jp: 'ウルトラレア', stars: 4, weight: 4.4, value: 16, color: '#ff8af0' },
  secret: { id: 'secret', name: 'Super Secret', jp: 'シークレット', stars: 5, weight: 0.6, value: 70, color: '#ffd23f' },
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'ultra', 'secret'];
