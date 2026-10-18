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

// Mini decos (src/data/minis.js): little diorama pieces bought in the shop and placed in display slots like
// figures. They live in a hidden pseudo-series so every item lookup works, but never appear in gacha lists.
const miniMods = import.meta.glob('../minis.js', { eager: true });
const MINIS = Object.values(miniMods)[0]?.MINIS || {};
export const MINI_SERIES = {
  id: 'mini', order: 999, name: 'Mini Decos', jp: 'ミニデコ', price: 100, hidden: true, themes: [],
  card: { bg: '#fff6e8', accent: '#3fae8a', text: '#2a3a30', accent2: '#ffd23f', pattern: 'dots' },
  items: Object.entries(MINIS).map(([id, m]) => ({ ...m, id, key: `mini/${id}`, series: 'mini', rarity: 'common', mini: true, desc: m.desc || '' })),
};
SERIES_BY_ID.mini = MINI_SERIES;
for (const it of MINI_SERIES.items) ITEMS_BY_KEY[it.key] = it;

export function getItem(key) {
  return ITEMS_BY_KEY[key] || null;
}
