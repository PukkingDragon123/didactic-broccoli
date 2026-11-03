// Special finishes ("variants") that can roll on top of any collectible.
// chance = base probability per capsule (before luck). mult = sell value multiplier.
// Odds: clear 1 in 40, metallic 1 in 90, glow 1 in 200, gold 1 in 500, aurora 1 in 2,000, diamond 1 in 8,000.
// `name` is the display name; `jp` is kept as an alias for older call sites (English too now).
export const FINISHES = {
  normal: { id: 'normal', name: 'Standard', jp: 'Standard', mult: 1, chance: 0, tier: 0, color: '#d8d0c0' },
  clear: { id: 'clear', name: 'Clear', jp: 'Clear', mult: 2, chance: 1 / 40, tier: 1, color: '#9fe3ff' },
  metallic: { id: 'metallic', name: 'Metallic', jp: 'Metallic', mult: 3, chance: 1 / 90, tier: 2, color: '#c9d3e6' },
  glow: { id: 'glow', name: 'Glow-in-the-Dark', jp: 'Glow-in-the-Dark', mult: 5, chance: 1 / 200, tier: 3, color: '#b6ffb0' },
  gold: { id: 'gold', name: 'Gold', jp: 'Gold', mult: 10, chance: 1 / 500, tier: 4, color: '#ffd04a' },
  aurora: { id: 'aurora', name: 'Aurora', jp: 'Aurora', mult: 25, chance: 1 / 2000, tier: 5, color: '#f0b8ff' },
  diamond: { id: 'diamond', name: 'Diamond', jp: 'Diamond', mult: 80, chance: 1 / 8000, tier: 6, color: '#e8fbff' },
};

export const FINISH_ORDER = ['diamond', 'aurora', 'gold', 'glow', 'metallic', 'clear'];

/** Roll a finish. luck multiplies every chance (1 = base). */
export function rollFinish(rng, luck = 1) {
  const r = rng();
  let acc = 0;
  for (const id of FINISH_ORDER) {
    acc += FINISHES[id].chance * luck;
    if (r < acc) return id;
  }
  return 'normal';
}
