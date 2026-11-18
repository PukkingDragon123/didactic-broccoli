// The 1998 line-up (36 series, retired): every old item key and its rarity, and the one-time save migration that swaps
// what a player owned for this season's figures. loadState (src/game/state.js) runs migrateLineup on every save; a save
// carrying old keys gets each one mapped to a new item of the same rarity, deterministically (the same old key always
// becomes the same new key): the old series' nearest new series first (THEME), any series with that rarity after.
// Inventory, shelves, displays, the museum, market listings, the collection book, licences and machines are all just
// strings in the save, so the walk covers every system: item keys ("series/id") anywhere, series ids under `series`
// fields and in `licenses`. state.flags.lineupSwap marks a migrated save (src/plugins/figures.js shows Grandpa's note).
import { SERIES, SERIES_BY_ID } from './index.js';

const R = { c: 'common', u: 'uncommon', r: 'rare', x: 'ultra', s: 'secret' };
/** Old series -> old item id -> rarity letter. */
export const OLD_ITEMS = {
  bizarre: { pointer: 'c', salaryman: 'c', gogo_cat: 'c', pompadour: 'u', tbc: 'u', phantom: 'r', watch: 'x', alley: 's' },
  bukatsu: { yakyu: 'c', bando: 'c', kendo: 'c', bijutsu: 'u', rikujo: 'r', housou: 'x', kitaku: 's' },
  bungu: { eraser: 'c', tape: 'c', stapler: 'u', sharpener: 'r', compass: 'x', abacus: 's' },
  chibitto: { kagero: 'c', aoi: 'c', goda: 'c', sayo: 'u', kei: 'u', ren: 'r', mimi: 'r', kirara: 'x', puchi: 's' },
  dajare: { mikan: 'c', neko: 'c', kaeru: 'c', tako: 'u', ika: 'u', panda: 'r', futon: 'x', samui: 's' },
  densha: { loop: 'c', tram: 'c', ekiben: 'c', ekicho: 'u', dango: 'u', fumikiri: 'r', mujineki: 'x', yellow: 's' },
  gecen: { street: 'c', shooter: 'c', crane: 'c', purikura: 'u', rhythm: 'r', medal: 'x', owner: 's' },
  haniwa: { inu: 'c', tori: 'c', neko: 'u', buta: 'r', uma: 'x', dogu: 's' },
  hataraku: { yubin: 'c', demae: 'c', koban: 'c', yakiimo: 'u', shobo: 'r', chindon: 'x', kamishibai: 's' },
  heya: { chabudai: 'c', zabuton: 'c', tansu: 'c', futon: 'u', hondana: 'u', tsukue: 'r', ofuro: 'x', nekosawagi: 's' },
  hoshitate: { towel: 'c', sock: 'c', octo: 'u', futon: 'r', shirt: 'x', wani: 's' },
  hyakki: { karakasa: 'c', chochin: 'c', kappa: 'c', rokurokubi: 'u', nekomata: 'r', tengu: 'x', nurarihyon: 's' },
  kaden: { suihanki: 'c', senpuki: 'c', iron: 'u', toaster: 'r', terebi: 'x', heater: 's' },
  kaiju: { taiyaki: 'c', dango: 'c', ramune: 'c', purin: 'u', buriki: 'u', tower: 'r', parfait: 'x', mecha: 's' },
  kasa: { vinyl: 'c', kaeru: 'c', tatami: 'c', janome: 'u', uragaeri: 'u', nodate: 'r', amefuri: 'x', obake: 's' },
  konbini: { onigiri: 'c', melonsoda: 'c', cancoffee: 'c', oden: 'u', bento: 'u', nikuman: 'r', storefront: 'x', nekotenin: 's' },
  lanepals: { tokuzo: 'c', mikawa: 'c', sensei: 'u', senpai: 'u', scarbrow: 'r', gyaru: 'x', yabuki: 's' },
  matsuri: { kingyo: 'c', yoyo: 'c', kitsune: 'c', chocoban: 'u', wataame: 'u', takoyaki: 'r', yagura: 'x', gyakuten: 's' },
  mochi: { shiba: 'c', mike: 'c', hamu: 'c', pen: 'u', lesser: 'u', tanuki: 'r', tsukiusa: 'x', kagami: 's' },
  neko_cafe: { tora: 'c', shiro: 'c', kuro: 'c', mike: 'u', hachi: 'u', morning: 'r', store: 'x', latte: 's' },
  obake_yashiki: { bikkuri: 'c', konnyaku: 'c', chochin: 'c', rokurokubi: 'u', reizoko: 'u', okiku: 'r', yashiki: 'x', kyukei: 's' },
  oden: { daikon: 'c', tamago: 'c', chikuwa: 'u', konnyaku: 'r', kinchaku: 'x', nabe: 's' },
  omamori: { pouch: 'c', ema: 'c', omikuji: 'c', daruma: 'u', maneki: 'u', kitsune: 'r', jinja: 'x', takarabune: 's' },
  omocha: { squishy: 'c', superball: 'c', koma: 'c', yoyo: 'u', robot: 'u', kendama: 'r', dartgun: 'x', lcdgame: 's' },
  onsen: { yuzucapy: 'c', saru: 'c', penguin: 'c', tanukimilk: 'u', kaeru: 'u', kawauso: 'r', rotenburo: 'x', kinkapi: 's' },
  pachimon: { chibikuma: 'c', wareneko: 'c', wahoousa: 'c', gogomochi: 'u', standsan: 'u', roadroller: 'r', kinusa: 'x', tokitome: 's' },
  sentai: { red: 'c', blue: 'c', yellow: 'c', pink: 'u', grunt: 'u', bakuhatsu: 'r', robo: 'x', break: 's' },
  sento: { noren: 'c', bandai: 'c', fuji: 'c', sauna: 'u', milk: 'r', kaeri: 'x', kamisama: 's' },
  shokudo: { onigiri: 'c', tamago: 'c', takoyaki: 'c', ramen: 'u', soba: 'u', omurice: 'r', sushi: 'x', yatai: 's' },
  shotengai: { taiyaki: 'c', kuji: 'c', sakana: 'u', hanaya: 'r', kissa: 'x', sento: 's' },
  showa: { suihanki: 'c', kurodenwa: 'c', senpuki: 'c', terebi: 'u', sentakuki: 'u', rajikase: 'r', kotatsu: 'x', massage: 's' },
  sumo: { shiko: 'c', shio: 'c', chanko: 'c', gyoji: 'u', dohyoiri: 'r', yokozuna: 'x', oyakata: 's' },
  uchu: { astro: 'c', nap: 'c', rocket: 'c', ufo: 'u', usagi: 'u', station: 'r', saturn: 'x', cosmic: 's' },
  umi: { mendako: 'c', chinanago: 'c', clione: 'c', manbou: 'u', gusokumushi: 'u', kurage: 'r', irukashow: 'x', jinbei: 's' },
  wagashi: { dango: 'c', taiyaki: 'c', ichigo: 'c', dorayaki: 'u', sakura: 'u', kakigori: 'r', chakai: 'x', shiruko: 's' },
  yokai: { chochin: 'c', kappa: 'c', hitotsume: 'c', kitsune: 'u', tengu: 'u', zashiki: 'r', nekomata: 'x', nurikabe: 's' },
};
/** Figures cut from this season's line-up after release (series -> item id -> rarity letter): a save holding one gets a
 *  same-rarity figure, from the same series while it still exists. */
export const RETIRED = {
  rojineko: { postbox: 'c', wall: 'c', box: 'c', laundry: 'u', kittens: 'u', boss: 'r', stalker: 'x', moon: 's' },
  asobi: { robot: 'u' }, sampuru: { soda: 'u' }, daikaiju: { anky: 'c', tetsujin: 'x', golden: 's' }, hikidashi: { soroban: 'u', randoseru: 'x' },
  inusanpo: { pug: 'u', corgi: 'u', terrier: 'r' }, machikado: { gaito: 'r', busstop: 'x' }, norimono: { van: 'c', golden: 's' },
  shinkai: { goblin: 'r', oarfish: 'x', isopod: 'c', angler: 'u', coela: 's' }, shugorei: { golden: 's' }, tsukumo: { parade: 'x', golden: 's', chochin: 'c', kasa: 'c', geta: 'c', kettle: 'u', broom: 'u', mon: 's' },
  yacho: { menfukuro: 'r', uzura: 'c', kinkei: 's', karasu: 'c', kiji: 's' }, yatai: { wataame: 'u', yoyo: 'u', kingyo: 'c', omen: 'c', takoyaki: 'c', taiko: 'r', stall: 'x', golden: 's' },
  yudono: { capy: 'c', penguin: 'c', family: 'r', rotenburo: 'x', kinkapi: 's', frog: 'c', otter: 'u', duck: 'u' }, kaiun: { jinja: 'x', goldneko: 's' },
  konchu: { tento: 'c', semi: 'c', larva: 'r' }, okashi: { kagami: 'x', dorayaki: 'c', matcha: 'r', momo: 's' },
};
/** The new series each old one hands its stock to (if it exists). */
const THEME = {
  rojineko: 'nuigurumi', mochi: 'nuigurumi', hoshitate: 'nuigurumi', neko_cafe: 'nuigurumi', lanepals: 'machikado', shotengai: 'machikado', konbini: 'machikado',
  shokudo: 'sampuru', oden: 'sampuru', wagashi: 'okashi', dajare: 'okashi', showa: 'denka', kaden: 'denka', heya: 'denka',
  omocha: 'asobi', gecen: 'asobi', pachimon: 'asobi', kasa: 'yokaiya', yokai: 'yokaiya', hyakki: 'yokaiya', obake_yashiki: 'yokaiya',
  umi: 'shinkai', onsen: 'furoba', sento: 'furoba', kaiju: 'daikaiju', uchu: 'daikaiju', sentai: 'shugorei', bizarre: 'shugorei',
  chibitto: 'shugorei', sumo: 'shugorei', bungu: 'hikidashi', bukatsu: 'hikidashi', densha: 'norimono', hataraku: 'norimono',
  omamori: 'kaiun', haniwa: 'kaiun', matsuri: 'yokaiya',
  tsukumo: 'yokaiya',
  yatai: 'yokaiya',
  yudono: 'furoba',
};
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const live = () => SERIES.filter((s) => !s.hidden);

/** The new series an old series id maps to. */
export function newSeriesFor(oldId) {
  if (SERIES_BY_ID[oldId] && !OLD_ITEMS[oldId]) return oldId;
  let t = THEME[oldId];
  for (let i = 0; i < 4 && t && !SERIES_BY_ID[t] && THEME[t]; i++) t = THEME[t]; // (a series that was itself retired hands on)
  if (t && SERIES_BY_ID[t]) return t;
  const L = live();
  return L[hash(oldId) % L.length]?.id || L[0]?.id;
}
/** The new item key an old item key maps to (same rarity, deterministic); null if it isn't an old key. */
export function newKeyFor(oldKey) {
  const [sid, iid] = String(oldKey).split('/');
  const r = R[OLD_ITEMS[sid]?.[iid] || RETIRED[sid]?.[iid]];
  if (!r || SERIES_BY_ID[sid]?.items.some((it) => it.id === iid)) return null;
  const first = SERIES_BY_ID[newSeriesFor(sid)];
  const same = first?.items.find((it) => it.id === iid && it.rarity === r); // (playable toys keep their ids)
  if (same) return same.key;
  const pool = first?.items.filter((it) => it.rarity === r) || [];
  if (pool.length) return pool[hash(oldKey) % pool.length].key;
  const all = live().flatMap((s) => s.items.filter((it) => it.rarity === r)).sort((a, b) => (a.key < b.key ? -1 : 1));
  return all.length ? all[hash(oldKey) % all.length].key : null;
}

const isOldKey = (s) => {
  if (typeof s !== 'string' || !s.includes('/')) return false;
  const [sid, iid] = s.split('/');
  return !!(OLD_ITEMS[sid]?.[iid] || RETIRED[sid]?.[iid]) && !SERIES_BY_ID[sid]?.items.some((it) => it.id === iid);
};
const isOldSeries = (s) => typeof s === 'string' && !!(OLD_ITEMS[s] || RETIRED[s]) && !SERIES_BY_ID[s];

/** Swap every old item key / series id in a save for the new line-up. Returns the number of swaps. */
export function migrateLineup(state) {
  if (!state || typeof state !== 'object') return 0;
  let n = 0;
  const seen = new Set();
  const walk = (o, field) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length; i++) {
        const v = o[i];
        if (isOldKey(v)) { o[i] = newKeyFor(v); n++; } else if (field === 'licenses' && isOldSeries(v)) { o[i] = newSeriesFor(v); n++; } else walk(v, field);
      }
      if (field === 'licenses') { const u = [...new Set(o)]; o.length = 0; o.push(...u); }
      return;
    }
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (isOldKey(k)) { // maps keyed by item (the collection book, counts)
        const nk = newKeyFor(k);
        delete o[k];
        if (nk) o[nk] = (typeof v === 'number' && typeof o[nk] === 'number') ? o[nk] + v : (o[nk] ?? v);
        n++;
        walk(o[nk], k);
        continue;
      }
      if (isOldKey(v)) { o[k] = newKeyFor(v); n++; } else if ((k === 'series' || k === 'cardSeries' || k === 'capsule') && isOldSeries(v)) { o[k] = newSeriesFor(v); n++; } else walk(v, k);
    }
  };
  walk(state, '');
  if (n) { state.flags = state.flags || {}; state.flags.lineupSwap = (state.flags.lineupSwap || 0) + n; }
  return n;
}
