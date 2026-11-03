// Persistent game state (localStorage) + helpers.
//
// Save format v2 (key gacha-garage-save-v2): the shop-sim progression (clock, calendar, bills, levels). A fresh v2
// save starts with an empty garage: no machines, no shelves, only the starter series licence and a little cash.
// Saves from v1 are not carried over (the new progression starts fresh) except for the settings and your avatar.
import { START_MONEY } from './economy.js';

export const STORY_START_MONEY = START_MONEY;
/** Story flags for a brand-new game (see src/game/Story.js). */
export function newStoryState() {
  return { v: 1, intro: false, shutter: false, cash: false, fed: false, swept: [], bags: [], tube: false, radio: false, opened: false };
}

const KEY = 'gacha-garage-save-v2';
const OLD_KEYS = ['gacha-garage-save-v1'];
export const SAVE_VERSION = 2;

export function defaultState() {
  return {
    v: SAVE_VERSION,
    money: START_MONEY,
    earned: 0,
    pulls: 0,
    playTime: 0,
    // an empty garage: you buy (and stock) your first machine yourself
    machines: [],
    story: newStoryState(),
    inventory: [{ kind: 'tool', d: { id: 'key' } }, null, null, null, null],
    promo: { flyers: 0, level: 0 },
    licenses: ['mochi'],
    opener: 0,
    charms: [],
    discovered: {}, // key -> { n, f: {finish: count} }
    shelves: [], // wall shelves are bought on the PC (SHELF_PRICES)
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
    // the player's character (src/people/avatar.js): base look + equipped (hat / outfit / face) and owned cosmetics
    avatar: { v: 1, seed: 7, body: 'm', skin: 'light', hair: 'messy', hairCol: 'black', top: 'tee', topCol: 'tomato', bottom: 'jeans', hat: null, outfit: null, face: null, owned: [] },
  };
}

const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

/** A fresh v2 save that keeps the settings and the avatar of an older save (if there is one). */
function freshFromOld() {
  const d = defaultState();
  for (const k of OLD_KEYS) {
    const old = readJSON(k);
    if (!old) continue;
    if (old.settings) d.settings = { ...d.settings, ...old.settings };
    if (old.avatar) { d.avatar = { ...d.avatar, ...old.avatar }; if (!Array.isArray(d.avatar.owned)) d.avatar.owned = []; }
    break;
  }
  return d;
}

export function loadState() {
  try {
    // visiting a friend's shop: their save is loaded read-only for this tab
    let visit = null;
    try { visit = sessionStorage.getItem(VISIT_KEY); } catch { /* storage blocked */ }
    const own = readJSON(KEY);
    if (!visit && !own) return freshFromOld();
    const s = visit ? JSON.parse(visit) : own;
    if (visit) { s.__visit = true; const mine = own || freshFromOld(); if (mine?.settings) s.settings = mine.settings; }
    const d = defaultState();
    // shop codes from before the story: the shop is already up and running
    if (s.story === undefined) s.story = { ...newStoryState(), intro: true, shutter: true, cash: true, fed: true, tube: true, radio: true, opened: true, complete: true };
    if (s.inventory === undefined) s.inventory = [null, null, null, null, null];
    // Grandpa's notebook is gone (the objective card guides you): drop it from older saves
    s.inventory = s.inventory.map((it) => (it?.d?.id === 'notebook' ? null : it));
    // shallow-merge new fields for forward compatibility
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    s.settings = { ...d.settings, ...s.settings };
    s.museum = { ...d.museum, ...s.museum };
    s.stats = { ...d.stats, ...s.stats };
    s.avatar = { ...d.avatar, ...s.avatar };
    if (!Array.isArray(s.avatar.owned)) s.avatar.owned = [];
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
