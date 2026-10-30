// Per-feature save data without touching src/game/state.js: each system owns one top-level key of game.state.
//   const s = ensureState(game, 'room', { day: 1, scores: {} });   // creates it, or fills fields missing from older saves
export function ensureState(game, key, defaults) {
  const st = game.state;
  if (!st[key] || typeof st[key] !== 'object') st[key] = structuredClone(defaults);
  else for (const k of Object.keys(defaults)) if (st[key][k] === undefined) st[key][k] = structuredClone(defaults[k]);
  return st[key];
}
