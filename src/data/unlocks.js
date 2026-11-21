// What each shop level unlocks (game.progress, src/sim/progress.js). Ids are `kind:what`:
//   machine:<type>     buy that machine model           series:<id>   buy that series' distribution licence
//   slots:<n>          room for n machines              shelf:<n>     the n-th wall shelf
//   opener:<tier>      capsule opener tier              charm:<id>    lucky charm on the shrine shelf
//   goods:<id>         shop goods (src/game/goods.js)   decor:<cat>   shop furniture / decor category
//   market:<what>      Off-Hobby (src/market): buy, sell, auction, grading and the shop's categories
//                      (clothes, tipjar, display, junk, charms)            staff:<n>     hire the n-th employee
//   museum, museum:expand<n>                            the warehouse museum and its expansions
//   estate:<what>      property on Ota Real Estate's site (src/growth): home103 (the flat next door), hobby (its hobby
//                      room), annex (the old tobacco shop), mall (the Gacha Kaikan building), mall2..mall4 (its floors)
//   furn:<id>          a piece of furniture without its own gate (src/build/catalogue.js), by price: FURN_LEVEL / furnLevel
//   wear:<id>          a closet (wardrobe shop) piece, by price and rarity: WEAR_LEVEL / closetLevel
//   app:<id>           a Capsule 98 program on the garage PC: not by level but by play (APPS: tutorial steps, days the
//                      shop has been open, customers, Grandpa leaving); game.unlocks (src/sim/unlocks.js) checks them
// Ids that are not in the table are never locked. This module is the one place to tune the pacing: something new every
// short while early on (the first levels come in minutes, each with a series and a few small things), slower later.
import { SERIES } from './series/index.js';

const NAMES = {
  'machine:retro': 'Used Showa Retro 100 machine', 'machine:standard': 'Gacha Station machine', 'machine:deluxe': 'Deluxe 500 machine', 'machine:royal': 'Royal Kirakira machine',
  'slots:2': 'Room for 2 machines', 'slots:3': 'Room for 3 machines', 'slots:4': 'Room for 4 machines', 'slots:5': 'Room for 5 machines', 'slots:6': 'Room for 6 machines',
  'shelf:1': 'Wall collection shelf', 'shelf:2': 'Second wall shelf', 'shelf:3': 'Third wall shelf',
  'opener:1': 'Capsule Opener', 'opener:2': 'Pro Twister opener', 'opener:3': 'Golden Cracker opener',
  'charm:maneki': 'Maneki-neko charm', 'charm:daruma': 'Lucky Daruma charm', 'charm:omamori': 'Gacha Omamori charm', 'charm:goldneko': 'Golden Maneki-neko charm',
  'goods:capsule_bin': 'Capsule Recycling Bin', 'goods:neon_open': 'Neon OPEN sign',
  'goods:tip_jar': 'Museum tip jar', 'goods:furin': 'Museum wind chime', 'goods:ticket_machine': 'Museum ticket machine',
  'decor:posters': 'Posters and signs', 'decor:plants': 'Potted plants', 'decor:lights': 'Lamps and string lights', 'decor:retro': 'Showa furniture', 'decor:premium': 'Premium fittings',
  'market:buy': 'Second-hand figure market', 'market:sell': 'Sell to collectors', 'market:auction': 'Collector auctions',
  'market:clothes': 'Off-Hobby thrift clothes', 'market:tipjar': 'Off-Hobby tip jars', 'market:display': 'Off-Hobby shelves and stands',
  'market:junk': 'Off-Hobby junk lots', 'market:charms': 'Off-Hobby luck charms', 'market:grading': 'KGS figure grading',
  'staff:1': 'Hire a part-timer', 'staff:2': 'Hire a second helper', 'staff:3': 'Hire a third helper',
  'estate:home103': 'Rent flat 103 next door (kitchen + bath)', 'estate:hobby': 'Hobby room in flat 103', 'estate:annex': 'Buy the old tobacco shop (shop annex)',
  'estate:mall': 'Buy the Gacha Kaikan building', 'estate:mall2': 'Kaikan 2F fit-out', 'estate:mall3': 'Kaikan 3F fit-out', 'estate:mall4': 'Kaikan 4F fit-out',
  museum: 'Museum licence (back warehouse)', 'museum:expand1': 'Museum expansion I', 'museum:expand2': 'Museum expansion II', 'museum:expand3': 'Museum expansion III',
};

const KINDS = { furn: 'Furniture', wear: 'Wardrobe', app: 'Program', machine: 'Machine', slots: 'Space', shelf: 'Furniture', opener: 'Tool', charm: 'Charm', goods: 'Goods', decor: 'Decor', market: 'Market', staff: 'Staff', museum: 'Museum', series: 'Series', estate: 'Property' };

// level -> ids (series licences are added below: a series' `order` is its level)
const TABLE = {
  1: ['machine:retro', 'slots:2', 'shelf:1'],
  2: ['goods:capsule_bin', 'decor:posters', 'market:clothes', 'market:tipjar'],
  3: ['machine:standard', 'slots:3', 'opener:1', 'market:display', 'market:junk'],
  4: ['shelf:2', 'market:buy'],
  5: ['charm:maneki', 'decor:plants', 'market:charms'],
  6: ['slots:4', 'goods:neon_open', 'market:sell', 'estate:home103'],
  7: ['decor:lights', 'market:grading'],
  8: ['machine:deluxe', 'charm:daruma'],
  9: ['shelf:3', 'opener:2', 'estate:hobby'],
  10: ['slots:5', 'staff:1'],
  11: ['decor:retro'],
  12: ['charm:omamori', 'estate:annex'],
  13: ['museum', 'goods:tip_jar', 'goods:furin', 'goods:ticket_machine'],
  14: ['slots:6', 'market:auction'],
  15: ['machine:royal'],
  16: ['decor:premium', 'museum:expand1'],
  17: ['staff:2'],
  18: ['opener:3'],
  19: ['museum:expand2'],
  20: ['charm:goldneko', 'estate:mall'],
  22: ['museum:expand3', 'estate:mall2'],
  24: ['staff:3'],
  25: ['estate:mall3'],
  28: ['estate:mall4'],
};

export const UNLOCKS = [];
for (const [lv, ids] of Object.entries(TABLE)) for (const id of ids) UNLOCKS.push({ id, level: +lv, kind: id.split(':')[0], name: NAMES[id] || id });
// series licences: one a level, in catalogue order (the series' `order` is a sort key, not a level); the starter
// licence (state.licenses) is owned from the start whatever its place here
const STARTER = 'teruteru';
SERIES.filter((s) => !s.hidden && s.id !== STARTER).forEach((s, i) => UNLOCKS.push({ id: `series:${s.id}`, level: 2 + i, kind: 'series', name: `${s.name} licence` }));
for (const s of SERIES) if (s.hidden) UNLOCKS.push({ id: `series:${s.id}`, level: 30, kind: 'series', name: `${s.name} licence` });
{ const st = SERIES.find((s) => s.id === STARTER); if (st) UNLOCKS.push({ id: `series:${STARTER}`, level: 1, kind: 'series', name: `${st.name} licence` }); }
UNLOCKS.sort((a, b) => a.level - b.level);
export const UNLOCK_BY_ID = Object.fromEntries(UNLOCKS.map((u) => [u.id, u]));

/** Add a gated id at run time (furniture and closet pieces register themselves from their catalogues). */
export function addUnlock(id, level, kind, name) {
  if (UNLOCK_BY_ID[id]) return UNLOCK_BY_ID[id];
  const u = { id, level, kind, name };
  let i = UNLOCKS.findIndex((x) => x.level > level);
  if (i < 0) i = UNLOCKS.length;
  UNLOCKS.splice(i, 0, u);
  UNLOCK_BY_ID[id] = u;
  return u;
}

// ------------------------------------------------------------------ furniture and the closet, by price
/** Furniture levels set by hand (the rest: furnLevel, cheapest first, three a level). */
export const FURN_LEVEL = { counter_bell: 1, wall_calendar: 1, storage_box: 1, cash_tray: 1, lp_chair_folding: 1, shop_bench: 2, wall_clock: 2, piggy_bank: 3, robot_vacuum: 14 };
/** A gate level for furniture with no gate of its own: rank among them by price (cheapest first), three a level. */
export function furnLevel(f, rank) { return FURN_LEVEL[f.id] ?? Math.min(24, 2 + Math.floor(rank / 3)); }
/** Wardrobe pieces set by hand (the rest: closetLevel). */
export const WEAR_LEVEL = { dino: 5, shark: 6, cx_suit: 3, cx_randoseru: 4, cx_shiba: 8 };
/** A closet piece's stocking level: six cheap commons from the start, then about two new pieces a level. */
export function closetLevel(c, rank) {
  if (WEAR_LEVEL[c.id]) return WEAR_LEVEL[c.id];
  if (rank < 6 && (c.rarity || 'common') === 'common') return 1;
  const floor = { common: 2, uncommon: 2, rare: 4, ultra: 8, secret: 12 }[c.rarity] || 2;
  return Math.min(30, Math.max(floor, 2 + Math.floor((rank - 6) / 2)));
}

// ------------------------------------------------------------------ Capsule 98 programs: unlocked by play
// A new game's PC has just the two the first jobs need (the Navigator for shopping, Pichat for messages); the rest
// install themselves as you go (a "new program installed" moment on the PC). Conditions (all must hold):
//   step: '<story step>'   that step of the opening has come up (or the opening is over)
//   done: '<story step>'   that step is done
//   open: true             the shop has reopened;  days: n   ...and been open n days (in-game days since)
//   customers: n           that many customers served;  level: n   shop level;  left: true   Grandpa has gone to Atami
// Old saves keep every program they had. System pieces (Control Panel, dialogs) are never gated.
export const SYSTEM_APPS = new Set(['settings', 'compose', 'popup']);
export const START_APPS = ['browser', 'messenger'];
export const APPS = {
  browser: {}, messenger: {},
  // the opening: the bank when it's time to buy a machine, the phone when Grandpa leaves (he rings)
  bank: { step: 'buymachine' }, offhobby: { step: 'buymachine' },
  phone: { left: true },
  // then about one a day once the shop is open
  mail: { open: true },
  calendar: { open: true, days: 1 },
  notepad: { open: true, days: 2 }, recycle: { open: true, days: 2 },
  achievements: { open: true, days: 3 },
  codex: { open: true, days: 4 },
  guestbook: { open: true, customers: 25 },
  signstudio: { open: true, days: 5 },
  kirakira: { open: true, days: 6 },
  inspired: { open: true, days: 7 }, rota: { open: true, days: 7 },
};
/** Unknown programs (registered by later features): a while after the reopening. */
export const APP_DEFAULT = { open: true, days: 5 };
export const appRule = (id) => APPS[id] || APP_DEFAULT;
export const kindLabel = (kind) => KINDS[kind] || kind;

/** Level an id needs (1 when it is not gated). */
export function unlockLevel(id) { return UNLOCK_BY_ID[id]?.level ?? 1; }
/** Everything that unlocks exactly at `level`. */
export function unlocksAt(level) { return UNLOCKS.filter((u) => u.level === level); }
/** Machines the shop has room for at a level. */
export function machineSlotsAt(level) {
  let n = 0;
  for (const u of UNLOCKS) if (u.kind === 'slots' && u.level <= level) n = Math.max(n, +u.id.split(':')[1]);
  return n;
}
