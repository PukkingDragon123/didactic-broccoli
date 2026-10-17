// Collects every series module in this folder (each file default-exports one series).
const mods = import.meta.glob('./*.js', { eager: true });

export const SERIES = Object.entries(mods)
  .filter(([p]) => !p.endsWith('/index.js'))
  .map(([, m]) => m.default)
  .filter(Boolean)
  .sort((a, b) => a.order - b.order);

export const SERIES_BY_ID = Object.fromEntries(SERIES.map((s) => [s.id, s]));

for (const s of SERIES) {
  for (const it of s.items) {
    it.series = s.id;
    it.key = `${s.id}/${it.id}`;
  }
}

export const ITEMS = SERIES.flatMap((s) => s.items);
export const ITEMS_BY_KEY = Object.fromEntries(ITEMS.map((i) => [i.key, i]));

export function getItem(key) {
  return ITEMS_BY_KEY[key] || null;
}
