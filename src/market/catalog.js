// Off-Hobby's item generator: every listing is a random second-hand thing with a grade (S / A / B / C / Junk), flaws,
// a funny variant (stickers, doodles, a misprint, signed by a kid, sun-faded, smells like curry...) that is visible on
// the 3D item, a seller with a personality, and a price. Listings are rolled per in-game day from the save's seed.
//
//   CATS                                   the site's categories, each gated by an unlock id (src/data/unlocks.js)
//   CHARM_DEFS, TIPJAR_DEFS, THRIFT        the luck charms, tip jars and thrift-tee designs
//   generateDay(game, day) -> [listing]    a fresh batch (also used for the noon / evening top-ups)
//   seller(game, id) -> seller             the persistent seller cast (personality, rating, portrait)
//   itemTitle(item), itemValue2(item)      what it's called, what collectors pay for it
//   ownedValue(desc)                       market value of something you own (selling)
// Item descriptors: { t: 'figure' | 'set' | 'machine' | 'carton' | 'charm' | 'tipjar' | 'garment' | 'goods' | 'mdecor'
//   | 'shelf' | 'stands' | 'blister' | 'mdisplay' | 'junk', grade, flaws: [], variant: {...}, ... }
import { SERIES, SERIES_BY_ID, getItem } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { FINISHES, rollFinish } from '../data/finishes.js';
import { itemValue, capsuleCost, MACHINE_TYPES, SHELF_PRICES } from '../game/economy.js';
import { GOODS } from '../game/goods.js';
import { COSMETICS } from '../people/cosmetics.js';
import { DISPLAYS, decorList } from '../museum/catalog.js';
import { unlockLevel } from '../data/unlocks.js';
import { rng, pick, rint, wpick, nicePrice, clamp, hash2 } from './util.js';

// ------------------------------------------------------------------ categories
export const CATS = [
  { id: 'machines', name: 'Gacha Machines', icon: 'machine', gate: null, blurb: 'Retired machines from closed shops, basements and one very confused grandma.' },
  { id: 'capsules', name: 'Capsule Stock', icon: 'capsule', gate: null, blurb: 'Surplus capsule cartons. Count them when they arrive.' },
  { id: 'figures', name: 'Figures & Sets', icon: 'figure', gate: 'market:buy', blurb: 'Loose figures and whole sets, from every series ever made.' },
  { id: 'charms', name: 'Luck & Charms', icon: 'charm', gate: 'market:charms', blurb: 'Maneki-neko, daruma, omamori, kumade, tanuki... real luck, slightly used.' },
  { id: 'display', name: 'Display & Shelves', icon: 'shelf', gate: 'market:display', blurb: 'Shelves, stands and cases. Some assembly required.' },
  { id: 'decor', name: 'Shop Decor', icon: 'deco', gate: 'decor:posters', blurb: 'Signs, bins and odd bits that make a shop a shop.' },
  { id: 'tipjars', name: 'Tip Jars', icon: 'coin', gate: 'market:tipjar', blurb: 'Put one on the table. Customers feel generous.' },
  { id: 'clothes', name: 'Thrift Clothes', icon: 'cos_shirt', gate: 'market:clothes', blurb: 'Pre-loved fits. Washed (probably).' },
  { id: 'junk', name: 'Junk & Mystery Lots', icon: 'box', gate: 'market:junk', blurb: 'Sold as is. Could be treasure. Could be a brick.' },
];
export const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]));
export const catOpen = (g, id) => { const c = CAT_BY_ID[id]; return !c?.gate || !g.progress || g.progress.unlocked(c.gate); };
export const catLevel = (id) => (CAT_BY_ID[id]?.gate ? unlockLevel(CAT_BY_ID[id].gate) : 1);

// ------------------------------------------------------------------ grades
export const GRADES = {
  S: { id: 'S', name: 'S - Like new', mult: 1, desc: 'Practically mint. Did they even play with it?' },
  A: { id: 'A', name: 'A - Very good', mult: 0.82, desc: 'Light signs of love.' },
  B: { id: 'B', name: 'B - Used', mult: 0.62, desc: 'Clearly used. Works fine.' },
  C: { id: 'C', name: 'C - Worn', mult: 0.45, desc: 'Has been through things.' },
  J: { id: 'J', name: 'Junk', mult: 0.22, desc: 'Sold as is. No returns. No questions.' },
};
const GRADE_ROLL = [['S', 8], ['A', 22], ['B', 35], ['C', 24], ['J', 11]];

// ------------------------------------------------------------------ luck charms (traditional Japanese good-luck items)
// luck: finish / rare (capsule luck), foot (more customers), ward (fewer scams), tips (tip jars). Potency: grade.
export const CHARM_DEFS = {
  maneki_white: { name: 'Maneki-neko (white)', jp: '招き猫', prop: 'manekineko', price: 2600, luck: { finish: 0.08 }, desc: 'The beckoning cat. Special finishes come a little more often.' },
  maneki_gold: { name: 'Golden Maneki-neko', jp: '金の招き猫', prop: 'manekineko', mat: 'gold', price: 14000, luck: { finish: 0.14, rare: 0.06 }, desc: 'Money luck. Rare pulls and shiny finishes.', rare: true },
  maneki_black: { name: 'Black Maneki-neko', jp: '黒招き猫', prop: 'manekineko', tint: 0x2a2428, price: 3800, luck: { ward: 0.5 }, desc: 'Wards off bad luck. Scammers find you less often.' },
  maneki_red: { name: 'Red Maneki-neko', jp: '赤招き猫', prop: 'manekineko', tint: 0xc8302a, price: 3200, luck: { rare: 0.05 }, desc: 'Good health and rare pulls.' },
  daruma: { name: 'Daruma', jp: 'だるま', prop: 'daruma', price: 1800, luck: { rare: 0.07 }, desc: 'Make a wish, paint an eye. Rare pulls come more often.' },
  omamori: { name: 'Kin-un Omamori', jp: '金運守', item: 'omamori/pouch', price: 1500, luck: { finish: 0.05, rare: 0.04 }, desc: 'A shrine charm for money luck.' },
  kumade: { name: 'Kumade Rake', jp: '熊手', prop: 'mk_kumade', price: 4200, luck: { foot: 0.08 }, desc: 'A bamboo rake that rakes in customers.' },
  tanuki: { name: 'Shigaraki Tanuki', jp: '信楽焼たぬき', prop: 'tanuki_statue', scale: 0.42, price: 5200, luck: { foot: 0.05, finish: 0.03 }, desc: 'Big belly, big hat, big business.' },
  hamaya: { name: 'Hamaya Arrow', jp: '破魔矢', prop: 'mk_hamaya', price: 2200, luck: { ward: 0.6 }, desc: 'A demon-breaking arrow. Scams bounce off.' },
  ema: { name: 'Ema Plaque', jp: '絵馬', prop: 'mk_ema', price: 900, luck: { rare: 0.04 }, desc: 'Somebody already wrote a wish on it. It says "more capsules".' },
  koban: { name: 'Lucky Koban', jp: '小判', prop: 'mk_koban', price: 2800, luck: { tips: 0.5 }, desc: 'A gold oval coin. Tip jars fill up faster.' },
  hyotan: { name: 'Six Gourds', jp: '六瓢箪', prop: 'mk_hyotan', price: 1600, luck: { finish: 0.05 }, desc: 'Mubyo: six gourds for good health and shiny finishes.' },
  kitsune: { name: 'Inari Fox', jp: 'お稲荷さん', prop: 'mk_kitsune', price: 3400, luck: { rare: 0.06 }, desc: 'A little fox from an Inari shrine. Rare pulls.' },
};
export const TIPJAR_DEFS = {
  pickle: { name: 'Pickle Jar Tip Jar', prop: 'mk_jar_pickle', price: 600, rate: 1, desc: 'Still smells faintly of umeboshi.' },
  kappa: { name: 'Kappa Tip Jar', prop: 'mk_jar_kappa', price: 1400, rate: 1.25, desc: 'Coins go in the dish on its head.' },
  ramen: { name: 'Ramen Bowl Tip Jar', prop: 'mk_jar_ramen', price: 1100, rate: 1.15, desc: 'A bowl from a closed ramen shop. "TIPS" written on in marker.' },
  daruma: { name: 'Daruma Coin Bank', prop: 'mk_jar_daruma', price: 1800, rate: 1.35, desc: 'A tip bank shaped like a daruma. Wobbles when it is full.' },
};
// thrift tees: registered as cosmetics (see src/market/thrift.js); prints are pixelated CC-BY photos or pixel motifs
export const THRIFT = [
  { id: 'thrift_sakura', name: 'Sakura Photo Tee', photo: 'sakura', col: 0xf2f0ea, price: 900 },
  { id: 'thrift_galaxy', name: 'Galaxy Tee', photo: 'galaxy', col: 0x1e2034, price: 1200 },
  { id: 'thrift_milkyway', name: 'Milky Way Tee', photo: 'milky_way', col: 0x2a3658, price: 1100 },
  { id: 'thrift_fireworks', name: 'Hanabi Tee', photo: 'fireworks', col: 0x14141c, price: 1000 },
  { id: 'thrift_neon', name: 'Neon Night Tee', photo: 'neon_night', col: 0x3a3a3e, price: 1300 },
  { id: 'thrift_skyline', name: 'Skyline Tee', photo: 'skyline', col: 0xf2f0ea, price: 800 },
  { id: 'thrift_rain', name: 'Rainy Lane Tee', photo: 'rainy_lane', col: 0x6a7480, price: 700 },
  { id: 'thrift_clouds', name: 'Cumulus Tee', photo: 'cumulus', col: 0x6aa6dc, price: 600 },
  { id: 'thrift_akiba', name: 'Akiba Dusk Tee', photo: 'akiba_dusk', col: 0x2a2428, price: 1400 },
  { id: 'thrift_gacha', name: 'Gacha Wall Tee', photo: 'gacha_wall', col: 0xffd23f, price: 1500 },
  { id: 'thrift_hinomaru', name: 'Rising Sun Tee', print: 'circle', col: 0xf2f0ea, col2: 0xc8302a, price: 500 },
  { id: 'thrift_star', name: 'Lucky Star Tee', print: 'star', col: 0x2a3658, col2: 0xffd23f, price: 500 },
  { id: 'thrift_heart', name: 'Big Heart Tee', print: 'heart', col: 0xf2f0ea, col2: 0xe85a7a, price: 500 },
  { id: 'thrift_breton', name: 'Breton Stripe Tee', print: 'border', col: 0xf2f0ea, col2: 0x2a3658, price: 600 },
  { id: 'thrift_candy', name: 'Candy Stripe Tee', print: 'stripes', col: 0xff9ab8, col2: 0xf2f0ea, price: 600 },
];
export const THRIFT_BY_ID = Object.fromEntries(THRIFT.map((t) => [t.id, t]));

// ------------------------------------------------------------------ flaws & funny variants
const FLAWS = {
  figure: ['scuffed paint on the nose', 'missing the capsule paper', 'tiny chip on the base', 'a bit sticky (nobody knows why)', 'loose arm', 'no box', 'faint bite marks (the dog)', 'dusty'],
  machine: ['rusty coin slot', 'cracked dome (taped)', 'sticky crank', 'key lost, lock drilled out', 'dented side panel', 'coin box jams', 'smells like a basement', 'one wobbly leg'],
  carton: ['crushed corner', 'box got damp once', 'a few capsules cracked', 'tape already cut and re-taped', 'count not checked'],
  charm: ['chipped ear', 'faded paint', 'repaired with glue', 'from a temple jumble sale', 'a little dusty'],
  garment: ['tiny hole near the hem', 'collar a bit stretched', 'faded from the wash', 'faint stain on the sleeve', 'smells of mothballs'],
  decor: ['scratched', 'wobbly', 'missing one screw', 'faded in the sun', 'dusty'],
  junk: ['unchecked', 'heavy', 'rattles', 'sold as is'],
};
export const STICKERS = ['star', 'heart', 'smiley', 'kitty', 'price', 'band', 'onigiri', 'skull', 'rainbow', 'ghost', 'flower', 'bolt'];
export const DOODLES = ['moustache', 'glasses', 'niku', 'brows', 'scribble', 'heart'];
const KIDS = ['KENTA', 'YUKI', 'SHO', 'MIKU', 'TARO', 'HANA', 'RIKU', 'AOI', 'SORA', 'NAO'];
const SMELLS = ['curry', 'mothballs', 'grandma perfume', 'ramen', 'cat', 'incense', 'new tatami', 'cigarettes (sorry)'];

/** A funny variant for an item (or null). The 3D item shows it (see src/market/variants.js). */
export function rollVariant(r, kind, grade) {
  const v = {};
  const p = grade === 'S' ? 0.25 : grade === 'A' ? 0.45 : 0.7;
  if (r() > p) return null;
  const n = wpick([['stickers', 32], ['doodle', 18], ['faded', 16], ['signed', 12], ['smell', 14], ['misprint', 5], ['stain', 8]], r);
  if (n === 'stickers' || r() < 0.18) {
    const k = rint(1, kind === 'machine' ? 5 : 3, r);
    v.stickers = Array.from({ length: k }, () => ({ id: pick(STICKERS, r), u: 0.15 + r() * 0.7, v: 0.2 + r() * 0.6, rot: (r() - 0.5) * 1.2, s: 0.8 + r() * 0.5 }));
  }
  if (n === 'doodle' && kind !== 'garment') v.doodle = pick(kind === 'figure' ? DOODLES : ['scribble', 'heart', 'niku'], r);
  if (n === 'faded') v.faded = 0.3 + r() * 0.35;
  if (n === 'signed' && kind !== 'garment') v.signed = pick(KIDS, r);
  if (n === 'smell' || (r() < 0.12 && !v.smell)) v.smell = pick(SMELLS, r);
  if (n === 'misprint' && (kind === 'figure' || kind === 'charm')) v.misprint = pick(['swap', 'swap2', 'pale'], r);
  if (n === 'stain') v.stain = pick(['curry', 'coffee', 'ink'], r);
  return Object.keys(v).length ? v : null;
}
/** Plain-English lines for a variant ("Covered in stickers (3)", "Signed by KENTA in crayon"...). */
export function variantLines(v) {
  if (!v) return [];
  const out = [];
  if (v.stickers?.length) out.push(v.stickers.length > 1 ? `Covered in stickers (${v.stickers.length}): ${[...new Set(v.stickers.map((s) => s.id))].join(', ')}` : `Has a ${v.stickers[0].id} sticker on it`);
  if (v.doodle) out.push({ moustache: 'Somebody drew a moustache on it', glasses: 'Doodled-on glasses (marker)', niku: 'Has 肉 written on its forehead', brows: 'Thick marker eyebrows', scribble: 'Crayon scribbles all over', heart: 'A little heart drawn on in pen' }[v.doodle] || 'Doodled on');
  if (v.faded) out.push(v.faded > 0.5 ? 'Very sun-faded (it lived in a window)' : 'Sun-faded');
  if (v.signed) out.push(`Signed by ${v.signed} in crayon`);
  if (v.misprint) out.push(v.misprint === 'pale' ? 'MISPRINT: printed without one ink' : 'MISPRINT: factory colour error (collectors love these)');
  if (v.smell) out.push(`Smells like ${v.smell}`);
  if (v.stain) out.push(`${v.stain === 'curry' ? 'Curry' : v.stain === 'coffee' ? 'Coffee' : 'Ink'} stain`);
  if (v.bootleg) out.push('Hmm. The colours look... off. Is this real?');
  return out;
}
export function variantMult(v) {
  if (!v) return 1;
  let m = 1;
  if (v.misprint) m *= 1.9;
  if (v.stickers?.length) m *= 0.85;
  if (v.doodle) m *= 0.7;
  if (v.faded) m *= 1 - v.faded * 0.5;
  if (v.signed) m *= 0.8;
  if (v.smell) m *= 0.92;
  if (v.stain) m *= 0.8;
  if (v.bootleg) m *= 0.15;
  return m;
}

// ------------------------------------------------------------------ sellers
// Personalities: friendly, stubborn, desperate, scammy, collector, kid, grandma, chatty
const HANDLES = [
  ['kappa_dad', 'friendly'], ['GachaQueen88', 'collector'], ['mochi_mochi', 'friendly'], ['Uncle_Tetsu', 'stubborn'], ['NekoNekoShop', 'friendly'],
  ['retro_rinko', 'collector'], ['CapsuleKid_Sho', 'kid'], ['obaachan_fumiko', 'grandma'], ['XxDEALSxX', 'scammy'], ['shibuya_flipper', 'stubborn'],
  ['hoarder_hiro', 'desperate'], ['moving_out_sale', 'desperate'], ['collector_K', 'collector'], ['SAMURAI_TOYS', 'stubborn'], ['yokai_yuki', 'chatty'],
  ['otaku_okamoto', 'collector'], ['kenta_and_mom', 'kid'], ['quiet_rabbit', 'friendly'], ['DEFINITELY_LEGIT', 'scammy'], ['best_price_4u', 'scammy'],
  ['tanuki_trader', 'chatty'], ['salaryman_sato', 'desperate'], ['granny_haru', 'grandma'], ['pachinko_pete', 'desperate'], ['dagashi_dan', 'friendly'],
  ['lucky_lucky_7', 'scammy'], ['mecha_maki', 'collector'], ['bento_boy', 'kid'], ['ume_shop', 'chatty'], ['old_man_ogawa', 'stubborn'],
  ['capsule_closet', 'friendly'], ['FLIPKING', 'stubborn'], ['sora_sells', 'chatty'], ['nana_no_mise', 'grandma'], ['broke_student', 'desperate'],
];
const AREAS = ['Morio-cho', 'Asakusa', 'Nakano', 'Koenji', 'Akihabara', 'Kichijoji', 'Shimokita', 'Yanaka', 'Kawasaki', 'Omiya', 'Chiba', 'Yokohama'];
const PHOTO_BG = ['tatami', 'table', 'sheet', 'news', 'carpet', 'floor'];
export const PERSONA = {
  friendly: { floor: 0.8, step: 0.5, priceF: [0.85, 1.1], ship: [1, 2], honest: 1, scam: 0 },
  stubborn: { floor: 0.95, step: 0.15, priceF: [1.05, 1.3], ship: [1, 2], honest: 0.9, scam: 0 },
  desperate: { floor: 0.55, step: 0.8, priceF: [0.55, 0.85], ship: [1, 1], honest: 1, scam: 0 },
  scammy: { floor: 0.3, step: 1, priceF: [0.32, 0.6], ship: [2, 3], honest: 0.2, scam: 0.65 },
  collector: { floor: 0.9, step: 0.3, priceF: [1.1, 1.4], ship: [1, 2], honest: 1, scam: 0 },
  kid: { floor: 0.6, step: 0.6, priceF: [0.4, 1.3], ship: [2, 3], honest: 0.8, scam: 0 },
  grandma: { floor: 0.7, step: 0.5, priceF: [0.5, 1.0], ship: [2, 3], honest: 1, scam: 0 },
  chatty: { floor: 0.82, step: 0.45, priceF: [0.85, 1.15], ship: [1, 2], honest: 0.95, scam: 0 },
};
const SKINS = ['fair', 'tan', 'warm'];
const HAIRS = ['short', 'spiky', 'pomp', 'bun', 'long', 'bald', 'perm'];
const sellerCache = new Map();
/** The persistent seller cast (index -> seller). Stats that change (sales, rating) live in market.sellers. */
export function seller(g, id) {
  if (sellerCache.has(id)) return sellerCache.get(id);
  const i = +String(id).replace(/\D/g, '') || 0;
  const [name, pers] = HANDLES[i % HANDLES.length];
  const r = rng(9001 + i * 7919);
  const scam = pers === 'scammy';
  const s = {
    id, i, name, pers, area: pick(AREAS, r), photo: pick(PHOTO_BG, r), thumb: r() < (pers === 'kid' || pers === 'grandma' ? 0.6 : 0.12),
    rating: scam ? (r() < 0.5 ? 0 : 2.4 + r() * 1.2) : clamp(3.6 + r() * 1.5 - (pers === 'kid' ? 0.6 : 0), 3.1, 5),
    sales: scam ? rint(0, 3, r) : rint(3, pers === 'collector' ? 900 : 240, r), since: scam ? 1999 : rint(1996, 1999, r),
    look: pers === 'kid' ? { bg: 0xa8e0ff, hair: pick(['short', 'spiky'], r), hairCol: 0x2a2428, shirt: 0xe5383b, mouth: 'grin' }
      : pers === 'grandma' ? { bg: 0xf0d8e8, hair: pick(['bun', 'perm'], r), hairCol: 0xb8b0b8, hairHi: 0xd8d0d8, shirt: 0x8a6ab0, glasses: 0x8a3a3a, blush: true }
        : scam ? { bg: 0x222222, sil: true, shirt: 0x222222 }
          : { bg: [0xffd2a0, 0xa8d8b8, 0xd8c8f0, 0xffe08a, 0xb8d0f0][i % 5], skin: pick(SKINS, r), hair: pick(HAIRS, r), hairCol: pick([0x2a2428, 0x5a3626, 0x8a5632, 0xc4c0ba], r), shirt: pick([0x3f86e8, 0x2a5aa8, 0xe5383b, 0x3fae4f, 0x8a6ab0, 0x2a2a2e], r), glasses: r() < 0.3 ? 0x2a2220 : null, cap: r() < 0.2, capCol: 0x2a5aa8, mouth: pick(['grin', null, 'o'], r) },
    blurb: {
      friendly: 'Selling my old stuff. Fast and careful shipping!', stubborn: 'Prices are firm. Do NOT lowball me.', desperate: 'Moving out!! Everything must go!! Make an offer!!',
      scammy: 'BEST PRICE. 100% REAL. Payment by bank transfer only.', collector: 'Serious collector. Accurate grading. No trades.', kid: 'my mom said i can sell my toys. i need money for a game',
      grandma: 'My grandson set this up for me. I hope I am doing it right.', chatty: 'Hi hi!! Ask me anything about my items, I love to chat :)',
    }[pers],
  };
  sellerCache.set(id, s);
  return s;
}
export const SELLER_COUNT = HANDLES.length;
export function sellerRating(g, S, s) { const m = S.sellers[s.id]; return m?.rating ?? s.rating; }

// ------------------------------------------------------------------ item rolls
const FIG_RARITY = [['common', 45], ['uncommon', 28], ['rare', 17], ['ultra', 7], ['secret', 3]];
function rollFigure(r, seriesId = null) {
  const se = seriesId ? SERIES_BY_ID[seriesId] : pick(SERIES.filter((s) => !s.hidden), r);
  const rar = wpick(FIG_RARITY, r);
  const pool = se.items.filter((it) => it.rarity === rar);
  const it = pick(pool.length ? pool : se.items, r);
  return { key: it.key, finish: rollFinish(r, 1.6) };
}
const unlockedSeries = (g) => SERIES.filter((s) => !s.hidden && (!g.progress || g.progress.unlocked(`series:${s.id}`)));
const unlockedMachines = (g) => ['retro', 'standard', 'deluxe', 'royal'].filter((t) => !g.progress || g.progress.unlocked(`machine:${t}`));

/** Roll the thing a listing sells, for a category. */
export function rollItem(g, r, cat) {
  const grade = wpick(GRADE_ROLL, r);
  const flawPool = (k) => { const n = grade === 'S' ? 0 : grade === 'A' ? rint(0, 1, r) : grade === 'B' ? rint(1, 2, r) : rint(2, 3, r); const a = [...FLAWS[k]]; const out = []; for (let i = 0; i < n && a.length; i++) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; };
  if (cat === 'machines') {
    const types = unlockedMachines(g);
    const t = wpick(types.map((x) => [x, x === 'retro' ? 5 : x === 'standard' ? 3 : x === 'deluxe' ? 1.5 : 0.6]), r);
    return { t: 'machine', mtype: t, grade, flaws: flawPool('machine'), variant: rollVariant(r, 'machine', grade) };
  }
  if (cat === 'capsules') {
    const se = pick(unlockedSeries(g).length ? unlockedSeries(g) : SERIES.slice(0, 1), r);
    const count = pick([8, 10, 12, 15, 20, 24, 30], r);
    return { t: 'carton', series: se.id, count, grade: grade === 'J' ? 'C' : grade, flaws: flawPool('carton') };
  }
  if (cat === 'figures') {
    if (r() < 0.22) {
      const se = pick(SERIES.filter((s) => !s.hidden), r);
      const n = rint(3, Math.min(6, se.items.length), r);
      const keys = [...new Set(Array.from({ length: n + 2 }, () => rollFigure(r, se.id).key))].slice(0, n);
      return { t: 'set', series: se.id, keys, finishes: keys.map(() => (r() < 0.08 ? rollFinish(r, 3) : 'normal')), grade, flaws: flawPool('figure'), variant: rollVariant(r, 'figure', grade) };
    }
    const f = rollFigure(r);
    return { t: 'figure', ...f, grade, flaws: flawPool('figure'), variant: rollVariant(r, 'figure', grade) };
  }
  if (cat === 'charms') {
    const ids = Object.keys(CHARM_DEFS).filter((id) => !CHARM_DEFS[id].rare || r() < 0.25);
    return { t: 'charm', id: pick(ids, r), grade, flaws: flawPool('charm'), variant: rollVariant(r, 'charm', grade) };
  }
  if (cat === 'tipjars') return { t: 'tipjar', id: pick(Object.keys(TIPJAR_DEFS), r), grade, flaws: flawPool('decor'), variant: rollVariant(r, 'decor', grade) };
  if (cat === 'clothes') {
    const owned = new Set(g.state.avatar?.owned || []);
    const pool = [...THRIFT.map((x) => x.id), ...COSMETICS.filter((c) => !c.thrift).map((c) => c.id)].filter((id) => !owned.has(id));
    if (!pool.length) return null;
    return { t: 'garment', cid: pick(pool, r), grade: grade === 'J' ? 'C' : grade, flaws: flawPool('garment'), variant: r() < 0.45 ? { smell: pick(SMELLS, r) } : null };
  }
  if (cat === 'decor') {
    const museum = !!g.museum?.data?.owned;
    const goods = Object.keys(GOODS).filter((id) => !g.state.goods?.[id] && (!GOODS[id].museum || museum));
    const deco = museum ? decorList() : [];
    if (deco.length && (r() < 0.6 || !goods.length)) return { t: 'mdecor', id: pick(deco, r).id, grade, flaws: flawPool('decor') };
    if (!goods.length) return { t: 'stands', n: rint(2, 5, r), grade, flaws: [] };
    return { t: 'goods', id: pick(goods, r), grade, flaws: flawPool('decor') };
  }
  if (cat === 'display') {
    const museum = !!g.museum?.data?.owned;
    const n = g.state.shelves?.length || 0;
    const roll = wpick([['shelf', n < 3 ? 3 : 0], ['stands', 4], ['blister', 3], ['mdisplay', museum ? 3 : 0]], r);
    if (roll === 'shelf') return { t: 'shelf', grade, flaws: flawPool('decor'), variant: rollVariant(r, 'decor', grade) };
    if (roll === 'mdisplay') return { t: 'mdisplay', id: pick(Object.keys(DISPLAYS), r), grade, flaws: flawPool('decor') };
    if (roll === 'blister') return { t: 'blister', n: pick([10, 20, 30], r), grade: 'A', flaws: [] };
    return { t: 'stands', n: rint(2, 6, r), grade, flaws: grade === 'S' ? [] : ['a few scratches'] };
  }
  if (cat === 'junk') return { t: 'junk', seed: (r() * 1e9) | 0, size: pick(['S', 'M', 'L'], r), grade: 'J', flaws: flawPool('junk') };
  return null;
}

/** The surprise inside a junk lot (rolled when it arrives). */
export function junkContents(g, item) {
  const r = rng(item.seed || 1);
  const n = item.size === 'S' ? rint(2, 3, r) : item.size === 'M' ? rint(3, 4, r) : rint(4, 6, r);
  const out = [];
  if (r() < 0.12) out.push({ kind: 'mkt', d: { t: 'brick' } });
  for (let i = 0; i < n; i++) {
    const k = wpick([['figure', 6], ['charm', 1.2], ['candy', 1.5], ['junk', 2], ['garment', 0.8]], r);
    if (k === 'figure') { const f = rollFigure(r); const grade = wpick([['A', 2], ['B', 4], ['C', 4], ['J', 2]], r); out.push({ kind: 'toy', d: { key: f.key, finish: f.finish, grade, variant: rollVariant(r, 'figure', grade) } }); }
    else if (k === 'charm') out.push({ kind: 'mkt', d: { t: 'charm', id: pick(['daruma', 'ema', 'omamori', 'hyotan', 'maneki_white'], r), grade: 'C', variant: rollVariant(r, 'charm', 'C') } });
    else if (k === 'candy') out.push({ kind: 'tool', d: { id: 'gen_candy', flavor: pick(['melon', 'ume', 'milk', 'cola', 'ramune'], r) } });
    else if (k === 'garment') { const it = rollItem(g, r, 'clothes'); if (it) out.push({ kind: 'mkt', d: { t: 'garment', cid: it.cid } }); }
    else out.push({ kind: 'mkt', d: { t: 'trinket', id: pick(['button', 'spoon', 'cassette', 'keychain', 'batteries', 'marble'], r) } });
  }
  return out;
}

// ------------------------------------------------------------------ names & values
const MNAME = { retro: 'Showa Retro 100', standard: 'Gacha Station', deluxe: 'Deluxe 500', royal: 'Royal Kirakira' };
const GOOD_NAME = { tip_jar: 'Museum Tip Jar', furin: 'Glass Wind Chime', capsule_bin: 'Capsule Recycling Bin', ticket_machine: 'Ticket Machine', neon_open: 'Neon OPEN Sign' };
export function itemTitle(it) {
  if (!it) return '?';
  const fin = (f) => (f && f !== 'normal' ? `${FINISHES[f]?.name || f} ` : '');
  switch (it.t) {
    case 'figure': return `${fin(it.finish)}${getItem(it.key)?.name || 'Figure'}${it.variant?.misprint ? ' (MISPRINT)' : ''}`;
    case 'set': return `${SERIES_BY_ID[it.series]?.name || ''} lot x${it.keys.length}`;
    case 'machine': return `Used ${MNAME[it.mtype] || it.mtype} gacha machine`;
    case 'carton': return `${SERIES_BY_ID[it.series]?.name || ''} capsules x${it.count}`;
    case 'charm': return CHARM_DEFS[it.id]?.name || 'Lucky charm';
    case 'tipjar': return TIPJAR_DEFS[it.id]?.name || 'Tip jar';
    case 'garment': return THRIFT_BY_ID[it.cid]?.name || COSMETICS.find((c) => c.id === it.cid)?.name || 'Clothes';
    case 'goods': return GOOD_NAME[it.id] || it.id;
    case 'mdecor': return `Museum decor: ${decorList().find((d) => d.id === it.id)?.name || it.id}`;
    case 'mdisplay': return `Museum case: ${DISPLAYS[it.id]?.name || it.id}`;
    case 'shelf': return 'Wall collection shelf (used)';
    case 'stands': return `Acrylic display stands x${it.n}`;
    case 'blister': return `Blister packs x${it.n} (half a roll)`;
    case 'junk': return `Mystery junk box (${{ S: 'small', M: 'medium', L: 'LARGE' }[it.size]})`;
    case 'slab': return `KGS ${it.score} ${getItem(it.key)?.name || ''}`;
    case 'packaged': return `Sealed ${getItem(it.key)?.name || ''}`;
    default: return it.name || it.t;
  }
}

/** What the thing would cost new / is worth to collectors before grade and variant. */
function baseValue(g, it) {
  switch (it.t) {
    case 'figure': return itemValue(it.key, it.finish) * 2.1 + 40;
    case 'set': return it.keys.reduce((a, k, i) => a + itemValue(k, it.finishes?.[i] || 'normal') * 2.1 + 40, 0) * 0.9;
    case 'machine': return MACHINE_TYPES[it.mtype].price * 0.72;
    case 'carton': return capsuleCost(it.series) * it.count * 0.92;
    case 'charm': return CHARM_DEFS[it.id]?.price || 1000;
    case 'tipjar': return TIPJAR_DEFS[it.id]?.price || 800;
    case 'garment': return (THRIFT_BY_ID[it.cid]?.price || COSMETICS.find((c) => c.id === it.cid)?.price || 600) * 0.75;
    case 'goods': return (GOODS[it.id]?.price || 1000) * 0.75;
    case 'mdecor': return (decorList().find((d) => d.id === it.id)?.price || 2000) * 0.7;
    case 'mdisplay': return (DISPLAYS[it.id]?.price || 5000) * 0.7;
    case 'shelf': return SHELF_PRICES[Math.min(2, g?.state?.shelves?.length || 0)] * 0.75;
    case 'stands': return it.n * 140;
    case 'blister': return it.n * 22;
    case 'junk': return { S: 400, M: 900, L: 1600 }[it.size] || 600;
    default: return 500;
  }
}
/** What collectors pay for it (grade x variant). */
export function itemWorth(g, it) {
  const gm = it.t === 'junk' ? 1 : GRADES[it.grade]?.mult ?? 1;
  return Math.max(10, baseValue(g, it) * gm * variantMult(it.variant));
}

/** Market value of something you own and might sell: { kind: 'toy'|'packaged'|'slab', key, finish, score?, variant? }. */
export function ownedValue(d) {
  const v = itemValue(d.key, d.finish || 'normal');
  let m = 2.2;
  if (d.kind === 'packaged') m *= 1.35;
  if (d.kind === 'slab') m *= d.score >= 10 ? 4.2 : d.score >= 9.5 ? 3 : d.score >= 9 ? 2.4 : d.score >= 8 ? 1.7 : d.score >= 7 ? 1.3 : 1;
  if (d.grade && d.kind === 'toy') m *= GRADES[d.grade]?.mult ?? 1;
  return Math.max(30, Math.round((v * m * variantMult(d.variant) + 30) / 10) * 10);
}

// ------------------------------------------------------------------ listings
const CAT_MIX = [['figures', 7], ['machines', 3], ['capsules', 4], ['charms', 3], ['display', 2], ['decor', 2], ['tipjars', 1.5], ['clothes', 3], ['junk', 2]];
/** One listing in a category (or a random one). */
export function makeListing(g, S, r, cat = null, opts = {}) {
  cat ||= wpick(CAT_MIX, r);
  const item = rollItem(g, r, cat);
  if (!item) return null;
  const sid = `s${Math.floor(r() * SELLER_COUNT)}`;
  const s = seller(g, sid);
  const P = PERSONA[s.pers];
  const worth = itemWorth(g, item);
  const scam = r() < P.scam ? pick(['noship', 'brick', 'bootleg', 'noship'], r) : null;
  const pf = P.priceF[0] + r() * (P.priceF[1] - P.priceF[0]);
  const price = nicePrice(worth * pf * (scam ? 0.7 : 1));
  const day = opts.day ?? g.clock?.day ?? 1;
  // the auction house: rare pieces only (the 'market:auction' level)
  const rareFig = (item.t === 'figure' && (['ultra', 'secret'].includes(getItem(item.key)?.rarity) || item.finish !== 'normal' || item.variant?.misprint)) || (item.t === 'charm' && CHARM_DEFS[item.id]?.rare);
  const auction = !scam && rareFig && r() < 0.55 && (!g.progress || g.progress.unlocked('market:auction'));
  const l = {
    id: `L${(S.seq++).toString(36)}`, day, cat, item, seller: sid, price, worth: Math.round(worth), scam,
    posted: (g.clock?.stamp ?? 0) - Math.floor(r() * 600), ship: P.ship[0] + Math.floor(r() * (P.ship[1] - P.ship[0] + 1)),
    views: rint(2, 240, r), watchers: rint(0, 14, r), seed: (r() * 1e9) | 0, sold: false,
    title: itemTitle(item), note: listingNote(s, item, r),
  };
  if (auction) {
    const ends = (g.clock?.stamp ?? 0) + rint(6, 30, r) * 60;
    Object.assign(l, { auction: true, start: nicePrice(worth * 0.45), bid: nicePrice(worth * 0.45), bids: [], ends, max: Math.round(worth * (0.9 + r() * 0.7)) });
    l.price = l.bid;
  }
  return l;
}

function listingNote(s, it, r) {
  const fl = it.flaws?.length ? ` ${it.flaws[0][0].toUpperCase()}${it.flaws[0].slice(1)}.` : '';
  const P = {
    friendly: ['Well looked after. Ships in a sturdy box.', 'From my shelf to yours!', 'Smoke-free home (cat-full home).'],
    stubborn: ['Price is FIRM.', 'No lowballers. I know what I have.', 'Read the description before messaging.'],
    desperate: ['MOVING OUT. MAKE AN OFFER.', 'Need gone by Friday!!', 'Cheap cheap cheap. Please.'],
    scammy: ['100% REAL. Ship worldwide. Bank transfer only.', 'Best price on the internet!!! Contact me direct for discount', 'Brand new genuine. Photo is example.'],
    collector: ['Graded honestly. See photos.', 'From my personal collection. Displayed in a glass case.', 'Duplicate from my set.'],
    kid: ['its good. i dont play with it anymore', 'my mom said i have too many', 'pls buy so i can get the new game'],
    grandma: ['This belonged to my grandson. He is in university now.', 'I am not sure what this is but it is cute.', 'Found it in the cupboard. Very clean.'],
    chatty: ['Long story about this one, ask me!!', 'Found at a flea market in Saitama :)', 'My cat approves of this item.'],
  }[s.pers];
  return pick(P, r) + (s.honest !== false ? fl : '');
}

/** A whole day's batch (deterministic per save seed and day). */
export function generateDay(g, S, day, n = 24, salt = 0) {
  const r = rng((S.seed ^ (day * 2654435761) ^ (salt * 40503)) >>> 0);
  const out = [];
  // a couple of everything open, then the random mix
  const open = CATS.filter((c) => catOpen(g, c.id)).map((c) => c.id);
  for (const c of open) { const l = makeListing(g, S, r, c, { day }); if (l) out.push(l); }
  while (out.length < n) { const c = wpick(CAT_MIX.filter(([id]) => open.includes(id)), r); const l = makeListing(g, S, r, c, { day }); if (l) out.push(l); }
  // the newest few were "just listed"
  for (const l of out) l.posted = (g.clock?.stamp ?? 0) - Math.floor(hash2(day, l.seed % 1000) * 900);
  return out;
}

/** Rarity / grade colour for badges. */
export const gradeColor = (gr) => ({ S: '#e8b830', A: '#3fae4f', B: '#3f86e8', C: '#8a6ab0', J: '#7a6e72' }[gr] || '#7a6e72');
export const rarityOfKey = (key) => RARITIES[getItem(key)?.rarity] || RARITIES.common;
