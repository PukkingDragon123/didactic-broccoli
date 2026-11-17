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

import { LP_WORLD } from '../kit/lowpixWorld.js';

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
  // ================================================================ real furniture (lowpix conversions of Poly Haven / Sketchfab
  // models, art/lowpix/world; model: { lp: id in src/kit/lowpixWorld.js, h: height (m) | scale, ry }); loaded when needed
  // ---------------------------------------------------------------- chairs and sofas
  { id: 'lp_chair_folding', name: 'Folding Chair', jp: 'パイプ椅子', price: 1200, category: 'furniture', unlock: null, mount: 'floor', feature: 'seat', quality: 0.05, block: true,
    desc: 'A grey steel folding chair, the kind stacked at every community hall.', does: 'Sit down. Customers sit here too.', model: { lp: 'chair_folding', h: 0.8 }, box: [0.46, 0.2, 0.5] },
  { id: 'lp_stool_wood', name: 'Wooden Stool', jp: '木の丸椅子', price: 1500, category: 'furniture', unlock: null, mount: 'floor', feature: 'seat', quality: 0.06, block: true, top: true,
    desc: 'A sturdy little stool, handy for reaching the top shelf.', does: 'Sit down, or stand a small thing on it.', model: { lp: 'stool_wood', h: 0.46 }, box: [0.36, 0.2, 0.36] },
  { id: 'lp_chair_school', name: 'School Chair', jp: '学校の椅子', price: 1800, category: 'furniture', unlock: null, mount: 'floor', feature: 'seat', quality: 0.07, block: true,
    desc: 'Plywood and steel tube, from the primary school that closed last spring.', does: 'Sit down. Kids love it.', model: { lp: 'chair_school' }, box: [0.42, 0.2, 0.46] },
  { id: 'lp_chair_painted', name: 'Painted Kitchen Chair', jp: 'ペンキ塗りの椅子', price: 2800, category: 'furniture', unlock: null, mount: 'floor', feature: 'seat', quality: 0.1, block: true,
    desc: 'A wooden chair with chipped blue paint and a woven seat.', does: 'Sit down. Customers sit here too.', model: { lp: 'chair_painted' }, box: [0.48, 0.2, 0.48] },
  { id: 'lp_chair_wood', name: 'Bentwood Chair', jp: '曲げ木の椅子', price: 3200, category: 'furniture', unlock: null, mount: 'floor', feature: 'seat', quality: 0.12, block: true,
    desc: 'Steamed and bent beech, the café chair of every kissaten.', does: 'Sit down. Customers sit here too.', model: { lp: 'chair_wood' }, box: [0.48, 0.2, 0.5] },
  { id: 'lp_ottoman', name: 'Ottoman', jp: 'オットマン', price: 4200, category: 'furniture', unlock: null, mount: 'floor', feature: 'seat', quality: 0.12, block: true, top: true,
    desc: 'A plump buttoned footstool.', does: 'Sit down, or rest your feet.', model: { lp: 'ottoman' }, box: [0.56, 0.24, 0.56] },
  { id: 'lp_chair_green', name: 'Green Armchair', jp: '緑のアームチェア', price: 8800, category: 'furniture', unlock: 'decor:retro', mount: 'floor', feature: 'seat', quality: 0.24, block: true,
    desc: 'Bottle-green upholstery and wooden arms.', does: 'Sit down and rest your legs. Customers love it.', model: { lp: 'chair_green' }, box: [0.7, 0.3, 0.7] },
  { id: 'lp_chair_rocking', name: 'Rocking Chair', jp: 'ロッキングチェア', price: 9800, category: 'furniture', unlock: 'decor:retro', mount: 'floor', feature: 'seat', quality: 0.26, block: true,
    desc: "Grandpa-approved. It creaks in a friendly way.", does: 'Sit down and rock. Customers love it.', model: { lp: 'chair_rocking' }, box: [0.7, 0.3, 0.9] },
  { id: 'lp_armchair', name: 'Club Armchair', jp: 'クラブチェア', price: 11000, category: 'furniture', unlock: 'decor:retro', mount: 'floor', feature: 'seat', quality: 0.28, block: true,
    desc: 'Deep, soft and a little worn on the arms.', does: 'Sit down and rest your legs. Customers love it.', model: { lp: 'armchair' }, box: [0.86, 0.3, 0.8] },
  { id: 'lp_armchair_cn', name: 'Rosewood Armchair', jp: '紫檀の肘掛け椅子', price: 14000, category: 'furniture', unlock: 'decor:retro', mount: 'floor', feature: 'seat', quality: 0.3, block: true,
    desc: 'A carved hardwood armchair from an antique dealer in Kobe.', does: 'Sit down. It makes the shop look established.', model: { lp: 'armchair_cn' }, box: [0.66, 0.3, 0.6] },
  { id: 'lp_chair_lounge', name: 'Lounge Chair', jp: 'ラウンジチェア', price: 16000, category: 'furniture', unlock: 'decor:retro', mount: 'floor', feature: 'seat', quality: 0.32, block: true,
    desc: 'Moulded plywood and leather, very 1960s.', does: 'Sit down and rest your legs. Customers love it.', model: { lp: 'chair_lounge' }, box: [0.84, 0.3, 0.84] },
  { id: 'lp_chair_barber', name: 'Barber Chair', jp: '床屋の椅子', price: 24000, category: 'fun', unlock: 'decor:retro', mount: 'floor', feature: 'seat', quality: 0.38, block: true,
    desc: 'Chrome, leather and a pump pedal, rescued from a closed barber shop.', does: 'Sit down like a regular. Customers line up to try it.', model: { lp: 'chair_barber' }, box: [0.7, 0.4, 0.9] },
  { id: 'lp_sofa_wood', name: 'Painted Settle', jp: '木のベンチソファ', price: 9000, category: 'furniture', unlock: null, mount: 'floor', feature: 'seat', quality: 0.24, block: true, seats: 2,
    desc: 'A painted wooden two-seater with a high back.', does: 'Sit down. Customers sit and chat here.', model: { lp: 'sofa_wood' }, box: [1.2, 0.3, 0.6] },
  { id: 'lp_sofa_03', name: 'Corduroy Sofa', jp: 'コーデュロイのソファ', price: 15000, category: 'furniture', unlock: 'decor:retro', mount: 'floor', feature: 'seat', quality: 0.36, block: true, seats: 2,
    desc: 'Soft brown corduroy, room for two.', does: 'Sit down. Customers sit and chat here (and stay longer).', model: { lp: 'sofa_03' }, box: [1.4, 0.4, 0.8] },
  { id: 'lp_sofa_02', name: 'Three-seat Sofa', jp: '三人掛けソファ', price: 18000, category: 'furniture', unlock: 'decor:retro', mount: 'floor', feature: 'seat', quality: 0.4, block: true, seats: 3,
    desc: 'A long sofa with loose cushions.', does: 'Three can sit and chat here (and stay longer).', model: { lp: 'sofa_02' }, box: [1.6, 0.4, 0.8] },
  { id: 'lp_daybed', name: 'Day Bed', jp: 'デイベッド', price: 22000, category: 'furniture', unlock: 'decor:retro', mount: 'floor', feature: 'seat', quality: 0.4, block: true, seats: 2,
    desc: 'A turned-wood day bed for an afternoon nap.', does: 'Sit down. Customers sit and chat here.', model: { lp: 'daybed' }, box: [1.6, 0.4, 0.8] },
  // ---------------------------------------------------------------- tables and desks
  { id: 'lp_chabudai', name: 'Chabudai', jp: 'ちゃぶ台', price: 3800, category: 'furniture', unlock: null, mount: 'floor', feature: 'table', quality: 0.14, block: true, top: true, short: 'chabudai',
    desc: 'A low round table with folding legs. Every Shōwa dinner happened at one.', does: 'Put small things on top. Wipe it now and then.', model: { lp: 'chabudai', h: 0.3 }, box: [0.7, 0.14, 0.7] },
  { id: 'lp_kotatsu', name: 'Kotatsu', jp: 'こたつ', price: 8800, category: 'furniture', unlock: null, mount: 'floor', feature: 'table', quality: 0.22, block: true, top: true, short: 'kotatsu',
    desc: 'A low table with a quilt and a heater underneath. Nobody ever leaves.', does: 'Put small things on top. Wipe it now and then.', model: { lp: 'kotatsu', h: 0.42 }, box: [0.9, 0.24, 0.9] },
  { id: 'lp_table_side', name: 'Side Table', jp: 'サイドテーブル', price: 2600, category: 'furniture', unlock: null, mount: 'floor', feature: 'table', quality: 0.08, block: true, top: true,
    desc: 'A small wooden table for beside a chair.', does: 'Put small things on top. Wipe it now and then.', model: { lp: 'table_side' }, box: [0.46, 0.24, 0.46] },
  { id: 'lp_desk_school', name: 'School Desk', jp: '学校の机', price: 2400, category: 'furniture', unlock: null, mount: 'floor', feature: 'table', quality: 0.08, block: true, top: true, short: 'desk',
    desc: 'Initials carved in the lid, gum under the top.', does: 'A little counter: put small things on top.', model: { lp: 'desk_school' }, box: [0.66, 0.24, 0.5] },
  { id: 'lp_table_coffee', name: 'Coffee Table', jp: 'コーヒーテーブル', price: 5200, category: 'furniture', unlock: null, mount: 'floor', feature: 'table', quality: 0.14, block: true, top: true,
    desc: 'A round low table, perfect in front of a sofa.', does: 'Put small things on top. Wipe it now and then.', model: { lp: 'table_coffee' }, box: [0.86, 0.24, 0.86] },
  { id: 'lp_table_round', name: 'Round Table', jp: '丸テーブル', price: 6400, category: 'furniture', unlock: null, mount: 'floor', feature: 'table', quality: 0.16, block: true, top: true,
    desc: 'A round wooden table on a pedestal.', does: 'Put small things on top. Wipe it now and then.', model: { lp: 'table_round' }, box: [0.9, 0.3, 0.9] },
  { id: 'lp_table_tea_cn', name: 'Tea Table', jp: '茶卓', price: 7800, category: 'furniture', unlock: 'decor:retro', mount: 'floor', feature: 'table', quality: 0.2, block: true, top: true,
    desc: 'A dark carved tea table with a shelf underneath.', does: 'Put small things on top. Wipe it now and then.', model: { lp: 'table_tea_cn' }, box: [0.9, 0.3, 0.6] },
  { id: 'lp_desk_office', name: 'Steel Desk', jp: 'スチール机', price: 8800, category: 'furniture', unlock: null, mount: 'floor', feature: 'table', quality: 0.12, block: true, top: true, short: 'desk',
    desc: 'A grey steel office desk with drawers: the post office threw it out.', does: 'A counter for small things. Wipe it now and then.', model: { lp: 'desk_office' }, box: [1.2, 0.3, 0.7] },
  { id: 'lp_table_wood', name: 'Farmhouse Table', jp: '木のテーブル', price: 9800, category: 'furniture', unlock: null, mount: 'floor', feature: 'table', quality: 0.2, block: true, top: true,
    desc: 'Thick planks on turned legs.', does: 'A big top for displays. Wipe it now and then.', model: { lp: 'table_wood' }, box: [1.3, 0.3, 0.8] },
  // ---------------------------------------------------------------- shelves and cabinets
  { id: 'lp_nightstand', name: 'Nightstand', jp: 'ナイトテーブル', price: 3400, category: 'storage', unlock: null, mount: 'floor', feature: 'table', quality: 0.1, block: true, top: true, short: 'nightstand',
    desc: 'A small cabinet with a drawer.', does: 'Put small things on top. Wipe it now and then.', model: { lp: 'nightstand' }, box: [0.5, 0.24, 0.44] },
  { id: 'lp_shelf_steel', name: 'Steel Shelving', jp: 'スチール棚', price: 5400, category: 'storage', unlock: null, mount: 'floor', feature: 'decor', quality: 0.08, block: true,
    desc: 'Bolt-together grey shelves from the hardware store.', does: 'Fills a bare wall. The stock room look.', look: 'Bolted together with a lot of patience.', model: { lp: 'shelf_steel' }, box: [0.9, 0.24, 0.5] },
  { id: 'lp_tool_chest', name: 'Tool Chest', jp: 'ツールチェスト', price: 6800, category: 'storage', unlock: null, mount: 'floor', feature: 'table', quality: 0.1, block: true, top: true, short: 'chest',
    desc: 'A red steel chest with an open lid and a tray of drawers.', does: 'Put small things on top. A proper workshop corner.', model: { lp: 'tool_chest' }, box: [0.66, 0.3, 0.44] },
  { id: 'lp_bookshelf', name: 'Worn Bookshelf', jp: '古い本棚', price: 6800, category: 'storage', unlock: null, mount: 'floor', feature: 'decor', quality: 0.18, block: true,
    desc: 'A tall pine bookshelf, its paint rubbed through.', does: 'Customers browse it while they wait.', look: 'Somebody left a pressed flower in the dictionary.', model: { lp: 'bookshelf' }, box: [0.9, 0.3, 0.4] },
  { id: 'lp_cabinet_drawer', name: 'Drawer Cabinet', jp: '引き出し棚', price: 7200, category: 'storage', unlock: null, mount: 'floor', feature: 'table', quality: 0.16, block: true, top: true, short: 'cabinet',
    desc: 'Rows of little drawers with brass pulls.', does: 'Put small things on top. Wipe it now and then.', model: { lp: 'cabinet_drawer' }, box: [0.8, 0.3, 0.46] },
  { id: 'lp_shelf_display', name: 'Display Shelves', jp: '飾り棚', price: 7800, category: 'storage', unlock: null, mount: 'floor', feature: 'decor', quality: 0.2, block: true,
    desc: 'Open wooden shelves for showing things off.', does: 'Makes a wall look like a shop.', look: 'Dust it once a week, grandpa said.', model: { lp: 'shelf_display' }, box: [1.0, 0.3, 0.44] },
  { id: 'lp_cabinet_vintage', name: 'Glass Cabinet', jp: 'ガラス戸棚', price: 12800, category: 'storage', unlock: 'decor:retro', mount: 'floor', feature: 'decor', quality: 0.28, block: true,
    desc: 'A wooden cabinet with glass doors and a carved top.', does: 'Makes the shop look established.', look: 'The glass is wavy: it is older than the shop.', model: { lp: 'cabinet_vintage' }, box: [0.9, 0.3, 0.5] },
  { id: 'lp_tansu', name: 'Tansu Chest', jp: '箪笥', price: 19800, category: 'storage', unlock: 'decor:retro', mount: 'floor', feature: 'table', quality: 0.34, block: true, top: true, short: 'tansu',
    desc: 'A Meiji-era chest of drawers with iron fittings.', does: 'Put small things on top. It makes the shop look established.', model: { lp: 'tansu' }, box: [1.0, 0.3, 0.5] },
  { id: 'lp_cabinet_cn', name: 'Lacquer Cabinet', jp: '漆の飾り棚', price: 16000, category: 'storage', unlock: 'decor:retro', mount: 'floor', feature: 'decor', quality: 0.32, block: true,
    desc: 'Black and red lacquer with brass hinges.', does: 'Makes the shop look established.', look: 'A tiny brass lock with no key.', model: { lp: 'cabinet_cn' }, box: [0.9, 0.3, 0.5] },
  // ---------------------------------------------------------------- lamps and lanterns
  { id: 'lp_chochin', name: 'Paper Lantern', jp: '提灯', price: 1800, category: 'signs', unlock: null, mount: 'surface', feature: 'lamp', quality: 0.12, glow: 0.55, short: 'lantern',
    desc: 'A red paper chōchin on a bamboo frame.', does: 'Glows warm after dark. Click to switch.', model: { lp: 'chochin' }, box: [0.36, 0.2, 0.36] },
  { id: 'lp_lantern', name: 'Hurricane Lantern', jp: 'ランタン', price: 2400, category: 'signs', unlock: null, mount: 'surface', feature: 'lamp', quality: 0.1, glow: 0.3, short: 'lantern',
    desc: 'A tin lantern with a glass chimney (electric now).', does: 'Glows warm after dark. Click to switch.', model: { lp: 'lantern' }, box: [0.24, 0.2, 0.24] },
  { id: 'lp_desk_lamp', name: 'Arm Desk Lamp', jp: 'デスクライト', price: 2800, category: 'signs', unlock: null, mount: 'surface', feature: 'lamp', quality: 0.08, glow: 0.14, short: 'lamp',
    desc: 'A sprung arm lamp you can point anywhere.', does: 'Lights the counter. Click to switch.', model: { lp: 'desk_lamp' }, box: [0.3, 0.2, 0.3] },
  { id: 'lp_lamp_oil', name: 'Oil Lamp', jp: 'ランプ', price: 3600, category: 'signs', unlock: null, mount: 'surface', feature: 'lamp', quality: 0.12, glow: 0.4, short: 'lamp',
    desc: 'A brass oil lamp with a frosted globe (wired for a bulb).', does: 'Glows warm after dark. Click to switch.', model: { lp: 'lamp_oil' }, box: [0.26, 0.2, 0.26] },
  { id: 'lp_lantern_wood', name: 'Wooden Lantern', jp: '行灯', price: 4200, category: 'signs', unlock: null, mount: 'floor', feature: 'lamp', quality: 0.16, glow: 0.4, short: 'lantern', block: true,
    desc: 'A wooden floor lantern with paper sides.', does: 'Glows warm after dark. Click to switch.', model: { lp: 'lantern_wood' }, box: [0.36, 0.3, 0.36] },
  { id: 'lp_lamp_pipe', name: 'Pipe Lamp', jp: 'パイプランプ', price: 4800, category: 'signs', unlock: null, mount: 'surface', feature: 'lamp', quality: 0.12, glow: 0.2, short: 'lamp',
    desc: 'Plumbing pipe and an Edison bulb: very garage.', does: 'Lights the counter. Click to switch.', model: { lp: 'lamp_pipe' }, box: [0.3, 0.2, 0.3] },
  // ---------------------------------------------------------------- plants
  { id: 'lp_plant_pot1', name: 'Rubber Plant', jp: 'ゴムの木', price: 1600, category: 'decor', unlock: 'decor:plants', mount: 'floor', feature: 'plant', quality: 0.16, block: true,
    desc: 'Glossy dark leaves in a plain pot.', does: 'Makes the shop feel alive.', model: { lp: 'plant_pot1' }, box: [0.36, 0.3, 0.36] },
  { id: 'lp_plant_pot2', name: 'Leafy Plant', jp: '観葉植物', price: 1800, category: 'decor', unlock: 'decor:plants', mount: 'floor', feature: 'plant', quality: 0.17, block: true,
    desc: 'A bushy green plant in a clay pot.', does: 'Makes the shop feel alive.', model: { lp: 'plant_pot2' }, box: [0.4, 0.3, 0.4] },
  { id: 'lp_plant_pot4', name: 'Palm in a Pot', jp: '鉢植えのヤシ', price: 2200, category: 'decor', unlock: 'decor:plants', mount: 'floor', feature: 'plant', quality: 0.2, block: true,
    desc: 'Arching fronds, a little holiday in the corner.', does: 'Makes the shop feel alive.', model: { lp: 'plant_pot4' }, box: [0.46, 0.3, 0.46] },
  { id: 'lp_plant_anthurium', name: 'Anthurium', jp: 'アンスリウム', price: 2400, category: 'decor', unlock: 'decor:plants', mount: 'surface', feature: 'plant', quality: 0.18,
    desc: 'Waxy red flowers that last for weeks.', does: 'Brightens a counter.', model: { lp: 'plant_anthurium' }, box: [0.3, 0.3, 0.3] },
  { id: 'lp_plant_calathea', name: 'Calathea', jp: 'カラテア', price: 2400, category: 'decor', unlock: 'decor:plants', mount: 'floor', feature: 'plant', quality: 0.18, block: true,
    desc: 'Striped round leaves that fold up at night.', does: 'Makes the shop feel alive.', model: { lp: 'plant_calathea' }, box: [0.4, 0.3, 0.4] },
  { id: 'lp_plant_pachira', name: 'Money Tree', jp: 'パキラ', price: 3800, category: 'decor', unlock: 'decor:plants', mount: 'floor', feature: 'plant', quality: 0.26, block: true,
    desc: 'A braided pachira: shopkeepers say it brings money in.', does: 'Makes the shop feel alive (and lucky).', model: { lp: 'plant_pachira' }, box: [0.5, 0.4, 0.5] },
  // ---------------------------------------------------------------- appliances
  { id: 'lp_boombox', name: 'Silver Boombox', jp: 'ラジカセ', price: 4200, category: 'electric', unlock: null, mount: 'surface', feature: 'radio', quality: 0.16,
    desc: 'Twin speakers, twin decks, a long chrome aerial.', does: 'Plays the radio stations. Music keeps customers browsing.', model: { lp: 'boombox' }, box: [0.56, 0.24, 0.2] },
  { id: 'lp_cassette_player', name: 'Cassette Recorder', jp: 'カセットレコーダー', price: 2200, category: 'electric', unlock: null, mount: 'surface', feature: 'radio', quality: 0.1,
    desc: 'A little upright tape recorder with a built-in speaker.', does: 'Plays the radio stations, quietly.', model: { lp: 'cassette_player' }, box: [0.2, 0.26, 0.12] },
  { id: 'lp_thermos', name: 'Air-pot Thermos', jp: '魔法瓶', price: 1800, category: 'electric', unlock: null, mount: 'surface', feature: 'tea', quality: 0.06, verb: 'Pour a cup of tea', done: 'Hot barley tea. Ahh.',
    desc: 'A pump-top thermos of hot tea for the long afternoons.', does: 'Pour a cup: a little energy back.', model: { lp: 'thermos' }, box: [0.22, 0.4, 0.22] },
  { id: 'lp_kettle_electric', name: 'Electric Kettle', jp: '電気ケトル', price: 2600, category: 'electric', unlock: null, mount: 'surface', feature: 'tea', quality: 0.06, verb: 'Boil the kettle', done: 'The kettle clicks off. Tea time.',
    desc: 'A chrome kettle with a bakelite handle.', does: 'Make tea: a little energy back.', model: { lp: 'kettle_electric' }, box: [0.26, 0.3, 0.2] },
  { id: 'lp_rice_cooker', name: 'Rice Cooker', jp: '炊飯器', price: 6800, category: 'electric', unlock: null, mount: 'surface', feature: 'tea', quality: 0.08, verb: 'Eat a rice ball', busy: 'Keeping warm', done: 'A warm onigiri from the cooker.',
    desc: 'A flowered rice cooker that keeps rice warm all day.', does: 'A rice ball when you are flagging: energy back.', model: { lp: 'rice_cooker' }, box: [0.34, 0.3, 0.3] },
  { id: 'lp_microwave', name: 'Microwave', jp: '電子レンジ', price: 9800, category: 'electric', unlock: null, mount: 'surface', feature: 'tea', quality: 0.08, verb: 'Heat up a snack', busy: 'Still warm', done: 'Ding! A warm snack.',
    desc: 'A chunky beige microwave with a dial timer.', does: 'Heat up a snack: energy back.', model: { lp: 'microwave' }, box: [0.56, 0.4, 0.44] },
  { id: 'lp_tv_wood', name: 'Console Television', jp: '家具調テレビ', price: 9800, category: 'electric', unlock: null, mount: 'surface', feature: 'tv', quality: 0.26, block: true,
    desc: 'A wood-grain television with chunky dials.', does: 'Five channels. Waiting customers watch it.', model: { lp: 'tv_wood', screen: [-0.11, 0.27, 0.31, 0.24] }, box: [0.66, 0.5, 0.52] },
  // ---------------------------------------------------------------- decor
  { id: 'lp_vase_ceramic', name: 'Antique Vase', jp: '古い花瓶', price: 3200, category: 'decor', unlock: null, mount: 'surface', feature: 'decor', quality: 0.12, look: 'A crackle glaze, a tiny chip on the lip.',
    desc: 'A glazed ceramic vase from the flea market.', does: 'Dresses a counter.', model: { lp: 'vase_ceramic' }, box: [0.24, 0.3, 0.24] },
  { id: 'lp_vase_brass', name: 'Brass Vase', jp: '真鍮の花瓶', price: 2800, category: 'decor', unlock: null, mount: 'surface', feature: 'decor', quality: 0.1, look: 'Polished by somebody, years ago.',
    desc: 'A heavy brass vase.', does: 'Dresses a counter.', model: { lp: 'vase_brass' }, box: [0.22, 0.3, 0.22] },
  { id: 'lp_basket', name: 'Wicker Basket', jp: '籐のかご', price: 1200, category: 'decor', unlock: null, mount: 'floor', feature: 'decor', quality: 0.06, look: 'Good for umbrellas, or sleeping cats.',
    desc: 'A woven basket with handles.', does: 'Dresses a corner.', model: { lp: 'basket' }, box: [0.4, 0.3, 0.4] },
  { id: 'lp_clock_alarm', name: 'Alarm Clock', jp: '目覚まし時計', price: 1400, category: 'decor', unlock: null, mount: 'surface', feature: 'decor', quality: 0.05, look: 'Twin bells. It has never once been on time.',
    desc: 'A twin-bell wind-up alarm clock.', does: 'Dresses a counter.', model: { lp: 'clock_alarm' }, box: [0.16, 0.2, 0.12] },
  { id: 'lp_clock_mantel', name: 'Mantel Clock', jp: '置き時計', price: 4600, category: 'decor', unlock: null, mount: 'surface', feature: 'decor', quality: 0.14, look: 'It ticks louder in the evening.',
    desc: 'A wooden mantel clock with a brass face.', does: 'Dresses a counter.', model: { lp: 'clock_mantel' }, box: [0.36, 0.3, 0.2] },
  { id: 'lp_chess', name: 'Chess Set', jp: 'チェス盤', price: 3400, category: 'fun', unlock: null, mount: 'surface', feature: 'decor', quality: 0.1, look: 'White to move. It has been white to move for a week.',
    desc: 'A wooden board, set up mid-game.', does: 'Customers stop to look at the position.', model: { lp: 'chess' }, box: [0.46, 0.14, 0.46] },
  { id: 'lp_ukulele', name: 'Ukulele', jp: 'ウクレレ', price: 4800, category: 'fun', unlock: null, mount: 'surface', feature: 'decor', quality: 0.1, look: 'Three strings in tune. Close enough.',
    desc: 'A little koa ukulele.', does: 'Dresses a shelf.', model: { lp: 'ukulele' }, box: [0.6, 0.12, 0.2] },
  { id: 'lp_dartboard', name: 'Dartboard', jp: 'ダーツボード', price: 3800, category: 'fun', unlock: null, mount: 'surface', feature: 'decor', quality: 0.1, look: 'Somebody has been aiming for the bull and hitting the wall.',
    desc: 'A bristle dartboard in a cabinet.', does: 'Dresses a wall corner.', model: { lp: 'dartboard' }, box: [0.5, 0.14, 0.5] },
  { id: 'lp_cat_statue', name: 'Concrete Cat', jp: '猫の置物', price: 3600, category: 'decor', unlock: null, mount: 'floor', feature: 'decor', quality: 0.12, look: 'Mikan does not trust it.',
    desc: 'A sitting cat in cast concrete.', does: 'Guards the door.', model: { lp: 'cat_statue' }, box: [0.36, 0.3, 0.36] },
  { id: 'lp_elephant', name: 'Carved Elephant', jp: '木彫りの象', price: 4200, category: 'decor', unlock: null, mount: 'surface', feature: 'decor', quality: 0.12, look: 'Trunk up: that means luck.',
    desc: 'A hand-carved wooden elephant.', does: 'Dresses a counter.', model: { lp: 'elephant' }, box: [0.3, 0.24, 0.2] },
  { id: 'lp_bust_marble', name: 'Marble Bust', jp: '大理石の胸像', price: 28000, category: 'decor', unlock: 'decor:retro', mount: 'surface', feature: 'decor', quality: 0.36, look: 'He strikes a pose whenever you look away. Probably.',
    desc: 'A classical marble bust with a very dramatic expression.', does: 'Makes the shop look bizarrely distinguished.', model: { lp: 'bust_marble' }, box: [0.4, 0.4, 0.34] },
  { id: 'lp_mirror', name: 'Ornate Mirror', jp: '飾り鏡', price: 9800, category: 'decor', unlock: 'decor:retro', mount: 'floor', feature: 'decor', quality: 0.22, block: true, look: 'You look like a shopkeeper now.',
    desc: 'A tall mirror in a gilt frame.', does: 'Customers check their hair in it.', model: { lp: 'mirror' }, box: [0.8, 0.3, 0.3] },
  { id: 'lp_screen_folding', name: 'Folding Screen', jp: '屏風', price: 14000, category: 'decor', unlock: 'decor:retro', mount: 'floor', feature: 'decor', quality: 0.3, block: true, look: 'Hide the mess behind it. Everyone does.',
    desc: 'Carved panels that fold in a zig-zag.', does: 'Hides the stock room. Makes the shop look established.', model: { lp: 'screen_folding' }, box: [1.2, 0.3, 0.4] },
  { id: 'lp_clock_grandfather', name: 'Grandfather Clock', jp: '大時計', price: 38000, category: 'decor', unlock: 'decor:retro', mount: 'floor', feature: 'decor', quality: 0.4, block: true, look: 'Tick. Tock. It has been in three shops before yours.',
    desc: 'A tall case clock with a brass pendulum.', does: 'Makes the shop look very established.', model: { lp: 'clock_grandfather' }, box: [0.6, 0.4, 0.5] },
];

// real-model pieces: their credit (title, author, licence) in the hint, and in the shop listing
for (const f of CATALOGUE) if (f.model?.lp && LP_WORLD[f.model.lp]) f.credit = LP_WORLD[f.model.lp].credit;

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
