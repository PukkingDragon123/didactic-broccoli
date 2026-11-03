// What each shop level unlocks (game.progress, src/sim/progress.js). Ids are `kind:what`:
//   machine:<type>     buy that machine model           series:<id>   buy that series' distribution licence
//   slots:<n>          room for n machines              shelf:<n>     the n-th wall shelf
//   opener:<tier>      capsule opener tier              charm:<id>    lucky charm on the shrine shelf
//   goods:<id>         shop goods (src/game/goods.js)   decor:<cat>   shop furniture / decor category
//   market:<what>      Off-Hobby (src/market): buy, sell, auction, grading and the shop's categories
//                      (clothes, tipjar, display, junk, charms)            staff:<n>     hire the n-th employee
//   museum, museum:expand<n>                            the warehouse museum and its expansions
// Ids that are not in the table are never locked.
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
  museum: 'Museum licence (back warehouse)', 'museum:expand1': 'Museum expansion I', 'museum:expand2': 'Museum expansion II', 'museum:expand3': 'Museum expansion III',
};

const KINDS = { machine: 'Machine', slots: 'Space', shelf: 'Furniture', opener: 'Tool', charm: 'Charm', goods: 'Goods', decor: 'Decor', market: 'Market', staff: 'Staff', museum: 'Museum', series: 'Series' };

// level -> ids (series licences are added below: a series' `order` is its level)
const TABLE = {
  1: ['machine:retro', 'slots:2', 'shelf:1'],
  2: ['goods:capsule_bin', 'decor:posters', 'market:clothes', 'market:tipjar'],
  3: ['machine:standard', 'slots:3', 'opener:1', 'market:display', 'market:junk'],
  4: ['shelf:2', 'market:buy'],
  5: ['charm:maneki', 'decor:plants', 'market:charms'],
  6: ['slots:4', 'goods:neon_open', 'market:sell'],
  7: ['decor:lights', 'market:grading'],
  8: ['machine:deluxe', 'charm:daruma'],
  9: ['shelf:3', 'opener:2'],
  10: ['slots:5', 'staff:1'],
  11: ['decor:retro'],
  12: ['charm:omamori'],
  13: ['museum', 'goods:tip_jar', 'goods:furin', 'goods:ticket_machine'],
  14: ['slots:6', 'market:auction'],
  15: ['machine:royal'],
  16: ['decor:premium', 'museum:expand1'],
  17: ['staff:2'],
  18: ['opener:3'],
  19: ['museum:expand2'],
  20: ['charm:goldneko'],
  22: ['museum:expand3'],
  24: ['staff:3'],
};

export const UNLOCKS = [];
for (const [lv, ids] of Object.entries(TABLE)) for (const id of ids) UNLOCKS.push({ id, level: +lv, kind: id.split(':')[0], name: NAMES[id] || id });
for (const s of SERIES) UNLOCKS.push({ id: `series:${s.id}`, level: Math.max(1, s.order), kind: 'series', name: `${s.name} licence` });
UNLOCKS.sort((a, b) => a.level - b.level);
export const UNLOCK_BY_ID = Object.fromEntries(UNLOCKS.map((u) => [u.id, u]));
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
