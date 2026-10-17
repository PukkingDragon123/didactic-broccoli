// Persistent game state (localStorage) + helpers.
import { START_MONEY } from './economy.js';

const KEY = 'gacha-garage-save-v1';

export function defaultState() {
  return {
    v: 1,
    money: START_MONEY,
    earned: 0,
    pulls: 0,
    playTime: 0,
    machines: [
      { id: 'm1', type: 'retro', slot: 0, up: { speed: 0, cap: 0, coins: 0 }, stock: Array(10).fill('mochi'), series: 'mochi' },
    ],
    licenses: ['mochi'],
    opener: 0,
    charms: [],
    discovered: {}, // key -> { n, f: {finish: count} }
    shelves: [{ slot: 0, items: Array(40).fill(null) }],
    storage: {}, // "key|finish" -> count
    completed: {}, // seriesId -> true
    deliveries: [], // pending boxes: {id, type, ...}
    loose: [], // items lying around in the world
    museum: { owned: false, level: 0, floor: {}, walls: {}, placed: [], materials: ['wood', 'plaster'], ticket: 0, visitors: 0, income: 0 },
    decorOwned: {},
    stats: { secrets: 0, best: null, sold: 0, opened: 0 },
    flags: {},
    settings: { quality: null, master: 0.8, music: 0.55, ambience: 0.7, sens: 1, fov: 72, hints: true },
    radio: 0,
    lightsOn: true,
    seed: Math.floor(Math.random() * 1e9),
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    const d = defaultState();
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

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
}

export function clearState() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
