// What the dressing room shows: the categories (paper tabs), their sections and items, which you own, and how you get
// the ones you don't (with progress where it can be measured).
//   TABS                          [{ id, name, icon, focus, at, pose }]
//   sections(tabId, look, game)   [{ title, kind: 'cards' | 'chips', items: [item] }]
//   item = { uid, kind: 'base' | 'swatch' | 'cos' | 'none', key, value, name, c?, col? }
//   status(game, item, all)       'owned' | 'shop' | 'locked'
//   howTo(game, c)                { kind, label, text, sub, prog: { n, max } | null, price }
//   counts(game, all)             { [tabId]: { own, total } , all: { own, total } }
import { COSMETICS } from '../people/cosmetics.js';
import { LOOK } from '../people/avatar.js';
import { sourceOf, RARITY_RANK } from '../cosmetics/catalog.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { CAPSULE_ODDS } from '../cosmetics/rewards.js';

export const TABS = [
  { id: 'hair', name: 'Hair', icon: 'dr_hair', focus: 'hat', at: 0.95 },
  { id: 'hairCol', name: 'Hair colour', icon: 'dr_dye', focus: 'hat', at: 0.95 },
  { id: 'face', name: 'Face', icon: 'dr_face', focus: 'face', at: 0.92 },
  { id: 'skin', name: 'Skin', icon: 'dr_skin', focus: 'body', at: 0.7 },
  { id: 'tops', name: 'Tops', icon: 'cos_shirt', focus: 'body', at: 0.66, slot: 'outfit' },
  { id: 'bottoms', name: 'Bottoms', icon: 'dr_pants', focus: 'legs', at: 0.36 },
  { id: 'shoes', name: 'Shoes', icon: 'cos_shoe', focus: 'feet', at: 0.05, slot: 'shoes' },
  { id: 'hats', name: 'Hats', icon: 'cos_hat', focus: 'hat', at: 1.0, slot: 'hat' },
  { id: 'glasses', name: 'Glasses & masks', short: 'Glasses', icon: 'cos_glasses', focus: 'face', at: 0.92, slot: 'face' },
  { id: 'bags', name: 'Bags', icon: 'cos_bag', focus: 'back', at: 0.66, slot: 'bag', pose: Math.PI - 0.35 },
  { id: 'body', name: 'Body', icon: 'dr_body', focus: 'full', at: 0.5 },
];
export const TAB_BY_ID = Object.fromEntries(TABS.map((t) => [t.id, t]));
/** Which tab a cosmetic slot or base key lives in. */
export const TAB_OF = { hat: 'hats', outfit: 'tops', face: 'glasses', bag: 'bags', shoes: 'shoes', hair: 'hair', hairCol: 'hairCol', skin: 'skin', top: 'tops', topCol: 'tops', bottom: 'bottoms', botCol: 'bottoms', body: 'body', eyes: 'face', brows: 'face', cheeks: 'face', eyeCol: 'face' };
/** Where on you a change shows (fraction of your height), for the magic. */
export const AT_KEY = { hair: 0.95, hairCol: 0.95, eyes: 0.9, brows: 0.92, cheeks: 0.88, eyeCol: 0.9, skin: 0.6, top: 0.66, topCol: 0.66, bottom: 0.36, botCol: 0.36, body: 0.5, hat: 1.0, face: 0.91, outfit: 0.62, bag: 0.66, shoes: 0.05 };

const NAMES = {
  skin: { fair: 'Fair', light: 'Light', medium: 'Medium', warm: 'Warm', tan: 'Tan', brown: 'Brown', deep: 'Deep' },
  hairCol: { black: 'Black', brown: 'Brown', chestnut: 'Chestnut', blonde: 'Blonde', ginger: 'Ginger', silver: 'Silver', pink: 'Sakura pink', blue: 'Midnight blue', chapatsu: 'Chapatsu', bleach: 'Bleached', lilac: 'Lilac rinse' },
  topCol: { tomato: 'Tomato', mustard: 'Mustard', mint: 'Mint', sky: 'Sky', navy: 'Navy', plum: 'Plum', white: 'Chalk', charcoal: 'Charcoal' },
  botCol: { auto: 'As made', denim: 'Denim', khaki: 'Khaki', olive: 'Olive', black: 'Black', navy: 'Navy', brick: 'Brick', cream: 'Cream', grey: 'Grey' },
  eyeCol: { brown: 'Brown', dark: 'Dark', hazel: 'Hazel', grey: 'Grey', green: 'Green', blue: 'Blue', violet: 'Violet' },
};
const nameOf = (key, o) => o.name || NAMES[key]?.[o.id] || o.id;

const base = (key, o) => ({ uid: `base:${key}:${o.id}`, kind: 'base', key, value: o.id, name: nameOf(key, o) });
const swatch = (key, o) => ({ uid: `sw:${key}:${o.id}`, kind: 'swatch', key, value: o.id, name: nameOf(key, o), col: o.col });
const none = (slot, name) => ({ uid: `none:${slot}`, kind: 'none', key: slot, value: null, name });
const cos = (c) => ({ uid: `cos:${c.id}`, kind: 'cos', key: c.slot, value: c.id, name: c.name, c });

/** The order cosmetics sit in on a page (stable, so buying something doesn't shuffle the page). */
const GROUPS = [
  { id: 'shop', title: 'In the closet', test: (c) => sourceOf(c).kind === 'shop' },
  { id: 'web', title: 'Kirakira Closet (mail order)', test: (c) => sourceOf(c).kind === 'web' },
  { id: 'reward', title: 'Earned, found, given', test: (c) => ['ach', 'quest', 'capsule', 'itch'].includes(sourceOf(c).kind) },
  { id: 'thrift', title: 'Thrift finds', test: (c) => sourceOf(c).kind === 'thrift' },
];
const order = (a, b) => (RARITY_RANK[a.rarity] ?? 0) - (RARITY_RANK[b.rarity] ?? 0) || a.price - b.price || a.name.localeCompare(b.name);

/** Every cosmetic you could see in a slot (thrift finds only once they're yours). */
export function cosmeticsFor(slot, owned) {
  return COSMETICS.filter((c) => c.slot === slot && (!c.thrift || owned.has(c.id)));
}

function cosmeticSections(slot, owned, noneName, groupsTitle = '') {
  const all = cosmeticsFor(slot, owned);
  const out = [];
  GROUPS.forEach((g, i) => {
    const items = all.filter(g.test).sort(order).map(cos);
    if (i === 0 && noneName) items.unshift(none(slot, noneName));
    if (items.length) out.push({ title: `${groupsTitle}${g.title}`, kind: 'cards', items, group: g.id });
  });
  return out;
}

export function sections(tab, look, game, owned) {
  switch (tab) {
    case 'hair': return [{ title: 'Hairstyles', kind: 'cards', items: LOOK.hair.map((o) => base('hair', o)) }];
    case 'hairCol': return [{ title: 'Hair dye', kind: 'chips', items: LOOK.hairCol.map((o) => swatch('hairCol', o)) }];
    case 'face': return [
      { title: 'Eyes', kind: 'cards', items: LOOK.eyes.map((o) => base('eyes', o)) },
      { title: 'Eye colour', kind: 'chips', items: LOOK.eyeCol.map((o) => swatch('eyeCol', o)) },
      { title: 'Brows', kind: 'cards', items: LOOK.brows.map((o) => base('brows', o)) },
      { title: 'Cheeks', kind: 'cards', items: LOOK.cheeks.map((o) => base('cheeks', o)) },
    ];
    case 'skin': return [{ title: 'Skin tone', kind: 'chips', items: LOOK.skin.map((o) => swatch('skin', o)) }];
    case 'tops': return [
      { title: 'Everyday tops', kind: 'cards', items: LOOK.top.map((o) => base('top', o)) },
      { title: 'Top colour', kind: 'chips', items: LOOK.topCol.map((o) => swatch('topCol', o)) },
      ...cosmeticSections('outfit', owned, null, 'Outfits: '),
    ];
    case 'bottoms': return [
      { title: 'Bottoms', kind: 'cards', items: LOOK.bottom.map((o) => base('bottom', o)) },
      { title: 'Cloth colour', kind: 'chips', items: LOOK.botCol.map((o) => swatch('botCol', o)) },
    ];
    case 'shoes': return cosmeticSections('shoes', owned, 'Lane sneakers');
    case 'hats': return cosmeticSections('hat', owned, 'No hat');
    case 'glasses': return cosmeticSections('face', owned, 'Nothing');
    case 'bags': return cosmeticSections('bag', owned, 'No bag');
    case 'body': return [{ title: 'Build', kind: 'cards', items: LOOK.body.map((o) => base('body', o)) }];
    default: return [];
  }
}

/** Every item on a tab, flat. */
export const itemsOf = (secs) => secs.flatMap((s) => s.items);

/** Is a cosmetic in the shop's stock right now (sold for yen in the dressing room)? */
export function inShop(game, c) {
  const s = sourceOf(c);
  if (s.kind !== 'shop') return false;
  return !(s.level && (game.progress?.level ?? 1) < s.level);
}

export function status(game, item, owned) {
  if (item.kind !== 'cos') return 'owned';
  if (owned.has(item.value)) return 'owned';
  return inShop(game, item.c) ? 'shop' : 'locked';
}

const yen = (n) => '¥' + Math.max(0, Math.floor(n)).toLocaleString('en-US');

/** How you get a piece you don't own: what to do, and how far along you are. */
export function howTo(game, c) {
  const g = game, s = sourceOf(c);
  if (s.kind === 'ach') {
    const a = g.os?.achievements?.list?.().find((x) => x.id === s.id);
    const lv = /^sim_level_(\d+)$/.exec(s.id);
    if (lv) {
      const L = +lv[1], now = g.progress?.level ?? 1;
      return { kind: 'ach', label: 'Achievement', text: a?.name || `Shop Level ${L}`, sub: `Reach shop level ${L}.`, prog: { n: Math.min(now, L), max: L, unit: 'level' } };
    }
    const hidden = a?.hidden && a.got == null;
    return {
      kind: 'ach', label: 'Achievement', text: hidden ? '???' : a?.name || 'A secret',
      sub: hidden ? 'A secret achievement. Keep living your life on the lane.' : a?.desc || '',
      prog: !hidden && a?.max > 1 ? { n: Math.min(a.n || 0, a.max), max: a.max } : null,
    };
  }
  if (s.kind === 'quest') {
    const SQ = g.sideQuests, q = SQ?.get?.(s.id);
    const who = q?.giverName ? ` (${q.giverName})` : '';
    if (q && SQ.isActive(s.id)) {
      const i = SQ.stepIndex(s.id), n = q.steps.length, st = SQ.step(s.id);
      return { kind: 'quest', label: 'Side quest', text: `${q.title}${who}`, sub: st?.text ? `Now: ${st.text}` : 'In progress.', prog: { n: i, max: n, unit: 'steps' } };
    }
    return { kind: 'quest', label: 'Side quest', text: q ? `${q.title}${who}` : 'Someone on the lane', sub: q?.giverName ? `Talk to ${q.giverName} around the lane.` : 'Ask around the lane: somebody needs a hand.', prog: null };
  }
  if (s.kind === 'capsule') {
    const name = SERIES_BY_ID[s.id]?.name || 'a gacha series';
    return { kind: 'capsule', label: 'Capsule bonus', text: name, sub: `Sometimes folded inside a ${name} capsule (about 1 in ${Math.round(1 / CAPSULE_ODDS)}).`, prog: null };
  }
  if (s.kind === 'web') {
    const o = (g.state.kirakira?.orders || []).find((x) => x.id === c.id && !x.done);
    return { kind: 'web', label: 'Web shop', text: `kirakira-closet.jp ${yen(c.price)}`, sub: o ? 'Ordered! Gen-san brings the parcel.' : "Order it on Grandpa's computer. Gen-san delivers.", prog: null, price: c.price, ordered: !!o };
  }
  if (s.kind === 'thrift') return { kind: 'thrift', label: 'Thrift find', text: c.secondhand ? 'Off-Hobby, second-hand' : 'Off-Hobby', sub: c.secondhand ? 'Nobody sells these new any more. Keep an eye on the junk market.' : 'Second-hand, one of a kind.', prog: null };
  if (s.kind === 'itch') return { kind: 'itch', label: 'Follow us on itch.io', text: 'Free, for following the game', sub: "We can't check, so it's on your honour. Thank you!", prog: null };
  if (s.level && (g.progress?.level ?? 1) < s.level) {
    const now = g.progress?.level ?? 1;
    return { kind: 'level', label: 'Shop level', text: `Reach level ${s.level}`, sub: `The closet stocks it once the shop grows. ${yen(c.price)} then.`, prog: { n: now, max: s.level, unit: 'level' }, price: c.price };
  }
  return { kind: 'shop', label: 'In the closet', text: yen(c.price), sub: 'Pay at the counter and put it on.', prog: null, price: c.price };
}

/** Collection counts per tab (cosmetics only: the base look is all yours) and overall. */
export function counts(game, owned) {
  const out = {}, all = { own: 0, total: 0 };
  for (const t of TABS) {
    if (!t.slot) { out[t.id] = null; continue; }
    const list = cosmeticsFor(t.slot, owned);
    const own = list.filter((c) => owned.has(c.id)).length;
    out[t.id] = { own, total: list.length };
    all.own += own; all.total += list.length;
  }
  out.all = all;
  return out;
}
