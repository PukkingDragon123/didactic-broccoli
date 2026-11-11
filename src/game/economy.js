// Prices, values and the E-Mart catalogue. All economy tuning lives here.
//
// The money loop: buy capsule boxes wholesale (capsuleCost), customers pay the machine's price plate into its coin box
// (collect it by hand), and the real profit is in the figures: open capsules and sell the good pulls (itemValue).
// There are no machine upgrades any more; shop levels (src/data/unlocks.js, game.progress) unlock machines, series,
// furniture and the rest.
import { SERIES, SERIES_BY_ID, getItem } from '../data/series/index.js';
import { RARITIES, RARITY_ORDER } from '../data/rarity.js';
import { FINISHES, rollFinish } from '../data/finishes.js';
import { unlockLevel, machineSlotsAt } from '../data/unlocks.js';

/** Cash in your pocket on a brand-new save (the drive ate the rest). Grandpa's tin adds ¥2,000 for supplies during the
 *  opening, and the first machine costs more than both: the neighbours' odd jobs (src/life/jobs.js) make up the rest. */
export const START_MONEY = 1500;

/** Dealer buy-back price of one collectible (the sell box). Rare tiers are worth many times the pull price. */
export function itemValue(key, finish = 'normal') {
  const it = getItem(key);
  if (!it) return 0;
  if (it.mini) return Math.max(10, Math.round((it.price * 0.5) / 10) * 10);
  const s = SERIES_BY_ID[it.series];
  const base = s.price * (RARITIES[it.rarity].sell ?? 0.25) * (FINISHES[finish]?.mult || 1);
  return Math.max(5, Math.round(base / 5) * 5);
}

/** Price to buy a specific single in the second-hand shop. */
export function singlePrice(key, finish = 'normal') {
  return Math.round(itemValue(key, finish) * 4.5 / 10) * 10;
}

/** Wholesale cost per capsule when refilling a machine with a series. */
export function capsuleCost(seriesId) {
  return Math.round(SERIES_BY_ID[seriesId].price * 0.3);
}

/** Series "distribution licence" (lets you order refills). The starter series is free. */
export function licensePrice(seriesId) {
  const s = SERIES_BY_ID[seriesId];
  if (s.order === 1) return 0;
  return Math.round((s.price * 15 * Math.pow(1.25, s.order - 1)) / 100) * 100;
}

/** Shop level a series licence needs (src/data/unlocks.js). */
export function licenseLevel(seriesId) { return unlockLevel(`series:${seriesId}`); }

/** Old discovered-figures requirement: series are gated by shop level now (licenseLevel), so this is always 0. */
export function licenseRequirement() { return 0; }

// price = the used / new price of the first one of a type (more of the same cost more, see machinePrice)
export const MACHINE_TYPES = {
  retro: { id: 'retro', name: 'Showa Retro 100', jp: '昭和レトロ', price: 4200, used: true, baseCap: 10, crank: 1.7, power: 0, desc: 'A second-hand dagashi-ya machine. Rusty, mechanical, full of character.', color: '#d8453a' },
  standard: { id: 'standard', name: 'Gacha Station', jp: 'ガチャステーション', price: 6800, baseCap: 16, crank: 1.35, power: 0.015, desc: 'Modern two-tone machine with a lit display card.', color: '#3f86e8' },
  deluxe: { id: 'deluxe', name: 'Deluxe 500', jp: 'デラックス500', price: 26000, baseCap: 24, crank: 1.1, power: 0.05, desc: 'Black & gold, LED trim, premium vibes. Customers pay more for it.', color: '#d4a83a' },
  royal: { id: 'royal', name: 'Royal Kirakira', jp: 'ロイヤルきらきら', price: 98000, baseCap: 36, crank: 0.9, power: 0.12, desc: 'Chrome tower with neon. Luck +5%.', color: '#d94fb0', luck: 0.05 },
};
export const MACHINE_ORDER = ['retro', 'standard', 'deluxe', 'royal'];
/** Machine spots in the garage (MACHINE_SLOTS); how many you may fill depends on your level (maxMachines). */
export const MAX_MACHINES = 6;
/** How many machines the shop has room for at a level. */
export function maxMachines(level = 1) { return Math.min(MAX_MACHINES, Math.max(1, machineSlotsAt(level))); }
/** Shop level a machine model needs. */
export function machineLevel(type) { return unlockLevel(`machine:${type}`); }

export function machinePrice(type, owned) {
  const base = MACHINE_TYPES[type].price;
  return Math.round(base * Math.pow(1.45, owned) / 100) * 100;
}

// Machine upgrades were removed (levels unlock better machines instead). These stubs keep older imports working:
// nothing to list, nothing to buy.
export const UPGRADES = {};
export function upgradeCost() { return null; }

/** Capsules a machine holds. */
export function capacityFor(machine) {
  return machine ? MACHINE_TYPES[machine.type]?.baseCap ?? 10 : 10;
}

/** Seconds for one full turn of the handle. */
export function crankTime(machine) {
  return MACHINE_TYPES[machine?.type]?.crank ?? 1.5;
}

export const OPENERS = [
  { name: 'Bare hands', jp: 'ゆびさき', time: 1.05, luck: 0, price: 0 },
  { name: 'Capsule Opener', jp: 'カプセルオープナー', time: 0.55, luck: 0, price: 1500, desc: 'An orange wedge that pops the seam.' },
  { name: 'Pro Twister', jp: 'プロ仕様ツイスター', time: 0.3, luck: 0.1, price: 9000, desc: 'Chrome grips. +10% special finish luck.' },
  { name: 'Golden Cracker', jp: '黄金カプセルクラッカー', time: 0.12, luck: 0.3, price: 48000, desc: 'Instant pop. +30% special finish luck.' },
];

export const CHARMS = {
  maneki: { name: 'Maneki-neko', jp: '招き猫', price: 3200, finishLuck: 0.12, rareLuck: 0, desc: 'Beckons special finishes. +12% finish luck.' },
  daruma: { name: 'Lucky Daruma', jp: '必勝だるま', price: 7500, finishLuck: 0, rareLuck: 0.15, desc: 'Rare+ pulls 15% more likely.' },
  omamori: { name: 'Gacha Omamori', jp: 'ガチャ守', price: 19000, finishLuck: 0.15, rareLuck: 0.1, desc: 'Shrine charm for collectors.' },
  goldneko: { name: 'Golden Maneki-neko', jp: '金の招き猫', price: 75000, finishLuck: 0.35, rareLuck: 0.25, desc: 'Ridiculously lucky. Glows a bit.' },
};

/** Machine-top POP displays (src/display/): a display holding figures of the machine's own series draws customers.
 *  pick: extra weight when a customer chooses between free machines (1 + pick x fill); visit: extra chance a passer-by
 *  with no mind to come in turns in anyway, per fully filled display (capped at visitMax); bonusChance: a display coupon
 *  in a capsule you open (at most one a day). */
export const POP_DISPLAY = { pick: 1.5, visit: 0.06, visitMax: 0.18, bonusChance: 0.03 };
/** 0..1: the share of a display's spots that hold figures of `series` (items: [{ k, f } | null]). */
export function displayDraw(items, series) {
  if (!items?.length) return 0;
  let n = 0;
  for (const it of items) if (it && SERIES_BY_ID[series]?.items.some((x) => x.key === it.k)) n++;
  return n / items.length;
}

/** Wall shelves: the n-th shelf costs SHELF_PRICES[n] (a fresh shop has none). */
export const SHELF_PRICES = [800, 2400, 7200];
export const MUSEUM_PRICE = 30000;
export const MUSEUM_REQ_COMPLETE = 1;
export const MUSEUM_EXPANSIONS = [
  { w: 10, d: 10, price: 0 },
  { w: 14, d: 12, price: 60000 },
  { w: 18, d: 15, price: 220000 },
  { w: 22, d: 18, price: 700000 },
];

/** Roll the contents of one capsule from a series. */
export function rollCapsule(seriesId, rnd, { finishLuck = 0, rareLuck = 0 } = {}) {
  const s = SERIES_BY_ID[seriesId];
  const byRarity = {};
  for (const it of s.items) (byRarity[it.rarity] ||= []).push(it);
  let total = 0;
  const weights = RARITY_ORDER.filter((r) => byRarity[r]).map((r) => {
    let w = RARITIES[r].weight;
    if (r !== 'common' && r !== 'uncommon') w *= 1 + rareLuck;
    total += w;
    return [r, w];
  });
  let x = rnd() * total;
  let rarity = weights[weights.length - 1][0];
  for (const [r, w] of weights) { if (x < w) { rarity = r; break; } x -= w; }
  const pool = byRarity[rarity];
  const item = pool[Math.floor(rnd() * pool.length)];
  const finish = rollFinish(rnd, 1 + finishLuck);
  return { key: item.key, rarity, finish };
}

export function seriesList() { return SERIES; }
