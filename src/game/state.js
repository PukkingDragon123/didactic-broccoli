// Persistent game state (localStorage) + helpers.
export const STORY_START_MONEY = 300;
/** Story flags for a brand-new game (see src/game/Story.js). */
export function newStoryState() {
  return { v: 1, intro: false, shutter: false, cash: false, fed: false, swept: [], bags: [], tube: false, radio: false, opened: false };
}

const KEY = 'gacha-garage-save-v1';

export function defaultState() {
  return {
    v: 1,
    money: STORY_START_MONEY,
    earned: 0,
    pulls: 0,
    playTime: 0,
    // Grandpa's old machines: one broken, one knocked over (and broken)
    machines: [
      { id: 'm1', type: 'retro', slot: 0, up: { speed: 0, cap: 0, coins: 0 }, stock: Array(10).fill('mochi'), series: 'mochi', broken: true },
      { id: 'm2', type: 'standard', slot: 1, up: { speed: 0, cap: 0, coins: 0 }, stock: Array(8).fill('mochi'), series: 'mochi', broken: true, fallen: true },
    ],
    story: newStoryState(),
    inventory: [{ kind: 'tool', d: { id: 'notebook' } }, { kind: 'tool', d: { id: 'key' } }, null, null, null],
    promo: { flyers: 0, level: 0 },
    licenses: ['mochi'],
    opener: 0,
    charms: [],
    discovered: {}, // key -> { n, f: {finish: count} }
    shelves: [{ slot: 0, items: Array(48).fill(null) }],
    storage: {}, // "key|finish" -> count
    completed: {}, // seriesId -> true
    deliveries: [], // pending boxes: {id, type, ...}
    loose: [], // items lying around in the world
    museum: { owned: false, level: 0, placed: [], styles: ['plain', 'felt'], ticket: 0, visitors: 0, income: 0 },
    decorOwned: {},
    stats: { secrets: 0, best: null, sold: 0, opened: 0 },
    flags: {},
    settings: { quality: null, master: 0.8, music: 0.55, ambience: 0.7, sens: 1, fov: 72, hints: true },
    radio: -1,
    lightsOn: false,
    seed: Math.floor(Math.random() * 1e9),
  };
}

export function loadState() {
  try {
    // visiting a friend's shop: their save is loaded read-only for this tab
    let visit = null;
    try { visit = sessionStorage.getItem(VISIT_KEY); } catch { /* storage blocked */ }
    const own = (() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } })();
    const raw = visit || localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (visit) { s.__visit = true; if (own?.settings) s.settings = own.settings; }
    const d = defaultState();
    // saves from before the story: the shop is already up and running
    if (s.story === undefined) s.story = { ...newStoryState(), intro: true, shutter: true, cash: true, fed: true, tube: true, radio: true, opened: true, complete: true };
    if (s.inventory === undefined) s.inventory = [{ kind: 'tool', d: { id: 'notebook' } }, null, null, null, null];
    // shallow-merge new fields for forward compatibility
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    s.settings = { ...d.settings, ...s.settings };
    s.museum = { ...d.museum, ...s.museum };
    s.stats = { ...d.stats, ...s.stats };
    return s;
  } catch (e) {
    console.warn('save load failed', e);
    return defaultState();
  }
}

export const VISIT_KEY = 'gacha-garage-visit';

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
}

export function clearState() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
