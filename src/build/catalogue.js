// The shop furniture and decor catalogue: everything here is bought (online, delivered in a box), placed with the
// builder and has a FEATURE that does something. The Off-Hobby marketplace and the furniture web store list these.
//
// Each entry:
//   id, name, jp, price (¥), category (CATEGORIES), unlock (an id from src/data/unlocks.js, or null = always),
//   mount: 'floor' | 'surface' (table, desk, rack, shelf, another box... or the floor) | 'wall'
//   feature: the behaviour id (src/build/features.js), quality: 0..1 how much it lifts the shop's decor score,
//   desc: shop blurb, does: one line on what the feature does, model: how it is built (src/build/models.js),
//   box: delivery box size [w, h, d] (m), block: true when people bump into it, top: it has a flat top (height above
//   its base, m) that small things can go on, seat: it seats people ([{ x, z, rotY }] local), stack: storage boxes.
// For other systems:
//   CATALOGUE (array), FURNITURE (by id), CATEGORIES,
//   catalogueList(game?) -> [{ id, kind: 'furniture', name, jp, price, category, categoryName, unlock, locked, desc, does }]
//   furnitureBox(id, extra) -> the delivery data: game.delivery.order(furnitureBox('tip_jar'))
//   orderFurniture(game, id, { pay = 'bank' | 'cash' | 'free' }) -> { ok, msg }  (charges the bank by default)

export const CATEGORIES = { money: 'Money', fun: 'Fun', decor: 'Decor', signs: 'Signs & lights', furniture: 'Furniture', electric: 'Electronics', storage: 'Storage', cleaning: 'Cleaning' };

export const CATALOGUE = [
  // ---------------------------------------------------------------- money
  { id: 'piggy_bank', name: 'Piggy Bank', jp: '豚の貯金箱', price: 1200, category: 'money', unlock: null, mount: 'surface', feature: 'piggy', quality: 0.15,
    desc: 'A pink glazed piggy bank with painted flowers.', does: 'Drop cash in for later, shake it out when you need it. In co-op it is the shared wallet.', model: { prop: 'piggy_bank' }, box: [0.24, 0.2, 0.22] },
  { id: 'cash_tray', name: 'Coin Tray', jp: 'カルトン', price: 400, category: 'money', unlock: null, mount: 'surface', feature: 'register', quality: 0.05,
    desc: "Grandpa's rubber coin tray.", does: "Customers' cash goes here when they pay at the counter. Click to take it.", model: { prop: 'coin_tray' }, box: [0.24, 0.1, 0.18] },
  { id: 'cash_register', name: 'Showa Cash Register', jp: 'レジスター', price: 6800, category: 'money', unlock: null, mount: 'surface', feature: 'register', quality: 0.35,
    desc: 'A heavy cream register with a drawer that rings.', does: "Customers' money goes in the drawer. Ring it open to take the takings.", model: { prop: 'cash_register' }, box: [0.46, 0.34, 0.44] },
  { id: 'tip_jar', name: 'Tip Jar', jp: 'チップ瓶', price: 800, category: 'money', unlock: null, mount: 'surface', feature: 'tipjar', quality: 0.1,
    desc: 'A glass jar with a hand-written TIPS label.', does: 'Happy customers drop coins in. Empty it into your wallet.', model: { prop: 'tip_jar' }, box: [0.2, 0.22, 0.2] },
  // ---------------------------------------------------------------- fun
  { id: 'gumball_machine', name: 'Gumball Machine', jp: 'ガムボールマシン', price: 4800, category: 'fun', unlock: null, mount: 'floor', feature: 'gumball', quality: 0.3, block: true,
    desc: 'A red cast-iron gumball machine on a chrome stand.', does: 'Customers (and you) buy ¥20 gumballs: turn the knob, catch it, chew. Empty its coin box.', model: { gumball: true }, box: [0.42, 0.5, 0.42] },
  { id: 'counter_bell', name: 'Counter Bell', jp: '呼び鈴', price: 500, category: 'fun', unlock: null, mount: 'surface', feature: 'bell', quality: 0.04,
    desc: 'Ding!', does: 'Ring it and every customer in the shop turns to look.', model: { prop: 'call_bell' }, box: [0.16, 0.12, 0.16] },
  // ---------------------------------------------------------------- decor
  { id: 'photo_poster', name: 'Photo Poster', jp: 'ポスター', price: 600, category: 'decor', unlock: 'decor:posters', mount: 'wall', feature: 'poster', quality: 0.12,
    desc: 'A random photo print in a frame. You never know which one you get.', does: 'Brightens a wall. Click to read who took the photo.', model: { poster: true }, box: [0.62, 0.48, 0.06] },
  { id: 'wall_clock', name: 'Wall Clock', jp: '掛け時計', price: 1500, category: 'decor', unlock: null, mount: 'wall', feature: 'clock', quality: 0.1,
    desc: 'A round wooden clock. It chimes on the hour.', does: 'Shows the time, chimes the hours.', model: { clock: true }, box: [0.34, 0.34, 0.1] },
  { id: 'wall_calendar', name: 'Wall Calendar', jp: 'カレンダー', price: 300, category: 'decor', unlock: null, mount: 'wall', feature: 'calendar', quality: 0.06,
    desc: 'This month on a page, special days circled.', does: 'Shows the date, rent day and holidays. Click for what is coming up.', model: { calendar: true }, box: [0.36, 0.5, 0.04] },
  { id: 'rug_asanoha', name: 'Hemp-leaf Rug', jp: '麻の葉ラグ', price: 2000, category: 'decor', unlock: null, mount: 'floor', feature: 'rug', quality: 0.15, flat: true,
    desc: 'An indigo rug with the asanoha pattern.', does: 'Softens the floor. Shake it out to get the dust out of the shop.', model: { rug: 'asanoha' }, box: [0.6, 0.22, 0.22] },
  { id: 'rug_wave', name: 'Wave Rug', jp: '青海波ラグ', price: 2000, category: 'decor', unlock: null, mount: 'floor', feature: 'rug', quality: 0.15, flat: true,
    desc: 'A red rug with seigaiha waves.', does: 'Softens the floor. Shake it out to get the dust out of the shop.', model: { rug: 'wave' }, box: [0.6, 0.22, 0.22] },
  { id: 'plant_pothos', name: 'Pothos', jp: 'ポトス', price: 1500, category: 'decor', unlock: 'decor:plants', mount: 'floor', feature: 'plant', quality: 0.18, block: true,
    desc: 'A trailing pothos on a little stand.', does: 'Makes the shop feel alive. (Growing comes later.)', model: { prop: 'plant_pothos', scale: 0.85 }, box: [0.36, 0.4, 0.36] },
  { id: 'plant_monstera', name: 'Monstera', jp: 'モンステラ', price: 2600, category: 'decor', unlock: 'decor:plants', mount: 'floor', feature: 'plant', quality: 0.25, block: true,
    desc: 'Big split leaves in a terracotta pot.', does: 'Makes the shop feel alive. (Growing comes later.)', model: { prop: 'plant_monstera', scale: 0.7 }, box: [0.46, 0.5, 0.46] },
  { id: 'bonsai', name: 'Pine Bonsai', jp: '松の盆栽', price: 3800, category: 'decor', unlock: 'decor:plants', mount: 'surface', feature: 'plant', quality: 0.3,
    desc: 'A little black pine, older than you.', does: 'A calm corner. (Growing comes later.)', model: { prop: 'bonsai', scale: 0.7 }, box: [0.36, 0.3, 0.3] },
  // ---------------------------------------------------------------- signs & lights
  { id: 'neon_open', name: 'Neon Sign: OPEN', jp: 'ネオン', price: 9800, category: 'signs', unlock: 'decor:lights', mount: 'wall', feature: 'neon', quality: 0.35,
    desc: 'Pink and blue tubes on a black board.', does: 'Glows after dark: a lit shop looks open and pulls people in. Click to switch, E to change the design.', model: { neon: 0 }, box: [0.7, 0.32, 0.1] },
  { id: 'neon_gacha', name: 'Neon Sign: GACHA', jp: 'ネオン', price: 9800, category: 'signs', unlock: 'decor:lights', mount: 'wall', feature: 'neon', quality: 0.35,
    desc: 'ガチャ in warm yellow neon with a capsule.', does: 'Glows after dark: a lit shop looks open and pulls people in. Click to switch, E to change the design.', model: { neon: 1 }, box: [0.7, 0.32, 0.1] },
  // ---------------------------------------------------------------- furniture
  { id: 'shop_bench', name: 'Shopfront Bench', jp: '縁台', price: 3500, category: 'furniture', unlock: null, mount: 'floor', feature: 'seat', quality: 0.2, block: true, top: true,
    desc: 'A low wooden bench, the kind outside every dagashi shop.', does: 'Sit down. Customers sit and chat here (and stay longer).', model: { prop: 'shop_bench', scale: 0.9 }, box: [0.7, 0.28, 0.3], seats: 2 },
  { id: 'sofa', name: 'Retro Sofa', jp: 'レトロソファ', price: 12000, category: 'furniture', unlock: 'decor:retro', mount: 'floor', feature: 'seat', quality: 0.4, block: true,
    desc: 'Mustard velvet, wooden legs, 1972.', does: 'Sit down and rest your legs. Customers love it.', model: { prop: 'sofa_retro', scale: 0.8 }, box: [0.8, 0.5, 0.5], seats: 2 },
  { id: 'cat_cushion', name: 'Cat Cushion', jp: '猫ベッド', price: 1800, category: 'furniture', unlock: null, mount: 'floor', feature: 'catbed', quality: 0.12, flat: true,
    desc: 'A round orange donut cushion.', does: 'Mikan naps in it. A shop cat sells capsules.', model: { prop: 'cat_cushion' }, box: [0.46, 0.2, 0.46] },
  // ---------------------------------------------------------------- electronics
  { id: 'radio', name: 'Radio-Cassette', jp: 'ラジカセ', price: 3200, category: 'electric', unlock: null, mount: 'surface', feature: 'radio', quality: 0.15,
    desc: 'A silver boombox with two speakers.', does: 'Plays the radio stations. Music keeps customers browsing.', model: { prop: 'radio', scale: 0.85 }, box: [0.5, 0.26, 0.2] },
  { id: 'electric_fan', name: 'Electric Fan', jp: '扇風機', price: 2400, category: 'electric', unlock: null, mount: 'floor', feature: 'fan', quality: 0.1, block: true,
    desc: 'A cream fan with four coloured keys.', does: 'Three speeds and a swing. In summer a cool shop is a full shop.', model: { fan: true }, box: [0.36, 0.5, 0.36] },
  { id: 'crt_tv', name: 'Wooden CRT TV', jp: 'ブラウン管テレビ', price: 7500, category: 'electric', unlock: null, mount: 'surface', feature: 'tv', quality: 0.25, block: true,
    desc: 'A 14-inch set in a wood cabinet, with a lace doily.', does: 'Five channels (baseball, cooking, weather...). Waiting customers watch it.', model: { prop: 'crt_tv', scale: 0.85 }, box: [0.52, 0.46, 0.44] },
  // ---------------------------------------------------------------- storage and cleaning
  { id: 'storage_box', name: 'Cardboard Box', jp: '段ボール箱', price: 300, category: 'storage', unlock: null, mount: 'surface', feature: 'storage', quality: 0, stack: true, top: true,
    desc: 'A sturdy box with flaps. Write a label on it.', does: 'Put anything in it (8 things), stack boxes, carry them around.', model: { storage: true }, box: [0.44, 0.3, 0.34] },
  { id: 'robot_vacuum', name: 'Robot Vacuum "Kuru-kun"', jp: 'ロボット掃除機', price: 19800, category: 'cleaning', unlock: null, mount: 'floor', feature: 'vacuum', quality: 0.1,
    desc: 'It goes round and round. With a charging dock.', does: 'Cleans the floor by itself: dust, empty capsules, spilt milk. Goes home to charge.', model: { vacuum: true }, box: [0.42, 0.18, 0.42] },
];

export const FURNITURE = Object.fromEntries(CATALOGUE.map((f) => [f.id, f]));

/** Listing for shops / the marketplace. */
export function catalogueList(game = null) {
  return CATALOGUE.map((f) => ({
    id: f.id, kind: 'furniture', name: f.name, jp: f.jp, price: f.price, category: f.category, categoryName: CATEGORIES[f.category],
    unlock: f.unlock, locked: !!(game?.progress && f.unlock && !game.progress.unlocked(f.unlock)), desc: f.desc, does: f.does, mount: f.mount,
  }));
}

/** The delivery data for one piece (a box that arrives by the shutter). extra: { uid, st } to deliver a used one. */
export function furnitureBox(id, extra = {}) {
  const f = FURNITURE[id];
  if (!f) return null;
  return { type: 'furniture', id, name: f.name, label: f.name, boxSize: f.box, ...extra };
}

/** Buy a piece and have it delivered (bank by default: it's an online order). */
export function orderFurniture(game, id, { pay = 'bank', delay } = {}) {
  const f = FURNITURE[id];
  if (!f) return { ok: false, msg: 'Unknown item' };
  if (f.unlock && game.progress && !game.progress.unlocked(f.unlock)) return { ok: false, msg: 'Reach a higher shop level to unlock this' };
  if (pay === 'bank') { if (!(game.sim?.payDigital ? game.sim.payDigital(f.price, `Furniture: ${f.name}`) : game.spend(f.price))) return { ok: false, msg: 'Not enough money in the bank' }; }
  else if (pay === 'cash') { if (!game.wallet.via('cash', () => game.spend(f.price, f.name))) return { ok: false, msg: 'Not enough cash' }; }
  game.delivery.order(furnitureBox(id), delay !== undefined ? { delay } : {});
  game.events.emit('furnitureBought', { id, price: f.price });
  game.save?.();
  return { ok: true, msg: `${f.name} is on its way to the shutter` };
}
