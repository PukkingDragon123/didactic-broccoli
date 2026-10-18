// Prices, values and the E-Mart catalogue. All economy tuning lives here.
import { SERIES, SERIES_BY_ID, getItem } from '../data/series/index.js';
import { RARITIES, RARITY_ORDER } from '../data/rarity.js';
import { FINISHES, rollFinish } from '../data/finishes.js';

export const START_MONEY = 300;

/** Sell value of one collectible. */
export function itemValue(key, finish = 'normal') {
  const it = getItem(key);
  if (!it) return 0;
  if (it.mini) return Math.max(10, Math.round((it.price * 0.5) / 10) * 10);
  const s = SERIES_BY_ID[it.series];
  const base = s.price * 0.3 * RARITIES[it.rarity].value * (FINISHES[finish]?.mult || 1);
  return Math.max(5, Math.round(base / 5) * 5);
}

/** Price to buy a specific single in the second-hand shop. */
export function singlePrice(key, finish = 'normal') {
  return Math.round(itemValue(key, finish) * 4.5 / 10) * 10;
}

/** Cost per capsule when refilling a machine with a series. */
export function capsuleCost(seriesId) {
  return Math.round(SERIES_BY_ID[seriesId].price * 0.3);
}

/** Series "distribution licence" (lets you order refills). The first series is free. */
export function licensePrice(seriesId) {
  const s = SERIES_BY_ID[seriesId];
  if (s.order === 1) return 0;
  return Math.round((s.price * 18 * Math.pow(1.32, s.order - 1)) / 100) * 100;
}

/** Discovered-item requirement before a series licence can be bought. */
export function licenseRequirement(seriesId) {
  const s = SERIES_BY_ID[seriesId];
  return Math.max(0, Math.floor((s.order - 1) * 4.5));
}

export const MACHINE_TYPES = {
  retro: { id: 'retro', name: 'Shōwa Retro 100', jp: '昭和レトロ', price: 0, baseCap: 10, crank: 1.7, desc: 'A rusty dagashi-ya machine. Character!', color: '#d8453a' },
  standard: { id: 'standard', name: 'Gacha Station', jp: 'ガチャステーション', price: 2400, baseCap: 16, crank: 1.35, desc: 'Modern two-tone machine with a display card.', color: '#3f86e8' },
  deluxe: { id: 'deluxe', name: 'Deluxe 500', jp: 'デラックス500', price: 16000, baseCap: 24, crank: 1.1, desc: 'Black & gold, LED trim, premium vibes.', color: '#d4a83a' },
  royal: { id: 'royal', name: 'Royal Kirakira', jp: 'ロイヤルきらきら', price: 85000, baseCap: 36, crank: 0.9, desc: 'Chrome tower with neon. Luck +5%.', color: '#d94fb0', luck: 0.05 },
};
export const MACHINE_ORDER = ['retro', 'standard', 'deluxe', 'royal'];
export const MAX_MACHINES = 6;

export function machinePrice(type, owned) {
  const base = MACHINE_TYPES[type].price;
  return Math.round(base * Math.pow(1.45, owned) / 100) * 100;
}

export const UPGRADES = {
  speed: {
    name: 'Crank Gearbox', jp: 'ハンドルギア', max: 5,
    desc: (l) => (l >= 5 ? 'Motorised crank — it turns itself!' : `Crank turns faster (lv ${l + 1})`),
    cost: [180, 650, 2000, 6000, 18000],
  },
  cap: {
    name: 'Capsule Hopper', jp: 'カプセル容量', max: 5,
    desc: (l) => `Holds ${capacityFor(null, l + 1)} capsules`,
    cost: [260, 900, 2800, 8000, 24000],
  },
  coins: {
    name: 'Rope Coins', jp: 'ロープのコイン', max: 4,
    desc: (l) => `${l + 2} coins on the rope = ${l + 2} capsules per crank`,
    cost: [900, 3600, 12000, 38000],
  },
};

export function upgradeCost(kind, level, type = 'retro') {
  const mult = { retro: 1, standard: 1.4, deluxe: 2.2, royal: 3.5 }[type] || 1;
  const c = UPGRADES[kind].cost[level];
  return c === undefined ? null : Math.round((c * mult) / 10) * 10;
}

export function capacityFor(machine, capLevel = machine?.up?.cap || 0) {
  const base = machine ? MACHINE_TYPES[machine.type].baseCap : 10;
  return Math.round(base * [1, 1.5, 2, 3, 4, 6][capLevel]);
}

export function crankTime(machine) {
  const base = MACHINE_TYPES[machine.type].crank;
  return base * [1, 0.78, 0.6, 0.45, 0.33, 0.3][machine.up.speed || 0];
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

export const SHELF_PRICES = [0, 1800, 6500];
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
