// Buying on Off-Hobby (and installing what Gen-san brings): today's listings, paying, the seller shipping it, the
// delivery that rolls up in the van, scams and buyer-protection claims, and the installs for big things (machines,
// shelves, shop goods, supplies) that don't come in a parcel.
//   mk.refresh(), mk.listings(cat), mk.get(id), mk.canBuy(l) -> reason | null, mk.buy(l, price, via) -> { ok, msg, order }
//   mk.orders(), mk.claim(orderId) -> { ok, msg }, mk.install(data, pos), mk.installMachine(...)
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { GachaMachine } from '../game/GachaMachine.js';
import { GarageShelf } from '../game/Shelf.js';
import { placeCharms, placeOpenerTool } from '../game/shop.js';
import { maxMachines, MACHINE_TYPES, OPENERS, CHARMS } from '../game/economy.js';
import { MACHINE_SLOTS, SHELF_SLOTS } from '../world/Garage.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { generateDay, makeListing, seller, catOpen, junkContents, itemTitle, CAT_BY_ID } from './catalog.js';
import { marketState, nextId, stamp, today, rng, rint, yen, whenText, pick } from './util.js';

export function installOrders(g, mk) {
  const S = marketState(g);

  // ================================================================== listings
  mk.refresh = (force = false) => {
    const day = today(g);
    if (S.day === day && !force && S.listings.length) return;
    // yesterday's unsold things go (auctions you're bidding on stay until they end)
    S.listings = S.listings.filter((l) => l.auction && !l.done && l.ends > stamp(g) && l.mine);
    S.listings.push(...generateDay(g, S, day));
    S.day = day;
    S.topups = 0;
  };
  mk.topUp = (n = 4) => { const r = rng((S.seed ^ (stamp(g) * 7919)) >>> 0); for (let i = 0; i < n; i++) { const l = makeListing(g, S, r); if (l) { l.posted = stamp(g) - Math.floor(r() * 30); S.listings.push(l); } } };
  g.events.on('newDay', () => mk.refresh());
  g.events.on('hour', ({ hour }) => { if ((hour === 12 || hour === 18) && S.day === today(g)) mk.topUp(4); });
  mk.listings = (cat = null) => S.listings.filter((l) => (!cat || l.cat === cat) && catOpen(g, l.cat));
  mk.get = (id) => S.listings.find((l) => l.id === id) || null;

  /** Machines the garage can still take (bought ones on their way count). */
  const pendingMachines = () => g.delivery.queue.filter((q) => q.data.type === 'install' && q.data.what === 'machine').length;
  mk.machineRoom = () => Math.min(MACHINE_SLOTS.length, maxMachines(g.progress?.level ?? 99)) - g.state.machines.length - pendingMachines();
  const pendingShelves = () => g.delivery.queue.filter((q) => q.data.type === 'install' && q.data.what === 'shelf').length;

  /** Why you can't buy a listing right now (null = you can). */
  mk.canBuy = (l) => {
    if (!l) return 'Listing not found';
    if (l.sold) return 'Sold';
    if (!catOpen(g, l.cat)) return `Unlocks at shop level ${g.progress?.levelFor(CAT_BY_ID[l.cat].gate)}`;
    const it = l.item;
    if (it.t === 'machine') {
      if (g.progress && !g.progress.unlocked(`machine:${it.mtype}`)) return `Reach shop level ${g.progress.levelFor(`machine:${it.mtype}`)} to run this machine`;
      if (mk.machineRoom() <= 0) return 'No room for another machine at your level';
    }
    if (it.t === 'shelf' && g.state.shelves.length + pendingShelves() >= SHELF_SLOTS.length) return 'No wall space for another shelf';
    if (it.t === 'shelf' && g.progress && !g.progress.unlocked(`shelf:${g.state.shelves.length + pendingShelves() + 1}`)) return `Reach shop level ${g.progress.levelFor(`shelf:${g.state.shelves.length + pendingShelves() + 1}`)} for another shelf`;
    if ((it.t === 'mdecor' || it.t === 'mdisplay') && !g.museum?.data?.owned) return 'You need a museum for this';
    if (it.t === 'goods' && g.state.goods?.[it.id]) return 'You already have one';
    if (it.t === 'garment' && (g.state.avatar?.owned || []).includes(it.cid)) return 'Already in your closet';
    return null;
  };

  // ================================================================== buying
  mk.orders = () => S.orders;
  /** Pay for a listing (at its price or a haggled one) and let the seller ship it. */
  mk.buy = (l, price = l?.price, via = 'buy') => {
    const why = mk.canBuy(l);
    if (why) return { ok: false, msg: why };
    if (!g.sim?.payDigital ? !g.spend(price) : !g.sim.payDigital(price, `Off-Hobby: ${l.title}`)) return { ok: false, msg: `Your bank says no: you need ${yen(price)}` };
    l.sold = true;
    l.soldTo = 'you';
    const s = seller(g, l.seller);
    const o = { id: nextId(S, 'o'), lid: l.id, title: l.title, cat: l.cat, price, list: l.price, seller: l.seller, sname: s.name, placed: stamp(g), status: 'paid', scam: l.scam || null, via, item: l.item };
    // a lucky charm against bad luck: sometimes the scammer gets cold feet and sends the real thing
    if (o.scam && Math.random() < (mk.luck?.().ward || 0)) o.scam = null;
    S.orders.unshift(o);
    if (S.orders.length > 60) S.orders.length = 60;
    S.stats.bought++; S.stats.spent += price;
    if (via === 'haggle' && price <= l.price * 0.7) g.os?.achievements?.unlock('mkt_haggler');
    if (S.stats.bought === 1) g.os?.achievements?.unlock('mkt_first');
    if (l.item.variant?.misprint) g.os?.achievements?.unlock('mkt_misprint');
    shipOrder(o, l);
    g.progress?.addXP(10, 'market');
    g.events.emit('marketBuy', { order: o, listing: l });
    g.save();
    return { ok: true, msg: o.status === 'paid' ? 'Paid! The seller will ship it soon.' : `On its way: Gen-san brings it ${whenText(g, o.eta)}`, order: o };
  };

  function shipOrder(o, l) {
    if (o.scam === 'noship') {
      // the money's gone and nothing will ever come; it shows as "shipped" with a fake tracking number for a while
      o.eta = stamp(g) + (l.ship || 2) * 1440;
      o.status = 'shipped';
      o.fakeTrack = `OH-${rint(1000, 9999)}-${rint(100, 999)}`;
      return;
    }
    const day = today(g) + (l.ship || 1);
    o.eta = (day - 1) * 1440 + rint(9 * 60, 16 * 60);
    o.status = 'shipped';
    const data = deliveryFor(l, o);
    g.delivery.order(data, { eta: o.eta });
  }

  /** What Gen-san brings for a listing. */
  function deliveryFor(l, o) {
    const it = l.item, from = seller(g, l.seller).name;
    const base = { from, label: l.title.slice(0, 40), order: o.id };
    if (o.scam === 'brick') return { type: 'parcel', size: 'M', contents: [{ kind: 'mkt', d: { t: 'brick' } }], ...base };
    const v = o.scam === 'bootleg' ? { ...(it.variant || {}), bootleg: true } : it.variant || null;
    const parcel = (contents, size = 'S') => ({ type: 'parcel', size, contents, ...base });
    const extra = [];
    // grandmas tuck something in
    if (seller(g, l.seller).pers === 'grandma' && Math.random() < 0.6) extra.push({ kind: 'tool', d: { id: 'gen_candy', flavor: pick(['matcha', 'ume', 'milk']) } });
    switch (it.t) {
      case 'figure': return parcel([{ kind: 'toy', d: { key: it.key, finish: it.finish, grade: it.grade, ...(v ? { variant: v } : {}) } }, ...extra]);
      case 'set': return parcel([...it.keys.map((k, i) => ({ kind: 'toy', d: { key: k, finish: it.finishes?.[i] || 'normal', grade: it.grade, ...(i === 0 && v ? { variant: v } : {}) } })), ...extra], 'M');
      case 'machine': return { type: 'install', what: 'machine', mtype: it.mtype, variant: v, grade: it.grade, used: true, name: `a used ${MACHINE_TYPES[it.mtype]?.name || ''} machine`, ...base };
      case 'carton': {
        const lost = (it.flaws.includes('a few capsules cracked') ? rint(1, 3) : 0) + (it.flaws.includes('count not checked') && Math.random() < 0.5 ? rint(1, 4) : 0);
        return { type: 'refill', series: it.series, count: Math.max(1, it.count - lost), stage: 0, ...base, label: `${SERIES_BY_ID[it.series]?.name || ''} x${it.count}` };
      }
      case 'charm': return parcel([{ kind: 'mkt', d: { t: 'charm', id: it.id, grade: it.grade, ...(v ? { variant: v } : {}) } }, ...extra]);
      case 'tipjar': return parcel([{ kind: 'mkt', d: { t: 'tipjar', id: it.id, grade: it.grade, cash: 0, ...(v ? { variant: v } : {}) } }, ...extra]);
      case 'garment': return parcel([{ kind: 'mkt', d: { t: 'garment', cid: it.cid, smell: it.variant?.smell || null } }, ...extra]);
      case 'goods': return { type: 'install', what: 'goods', id: it.id, name: itemTitle(it), ...base };
      case 'shelf': return { type: 'install', what: 'shelf', name: 'a wall shelf', variant: v, ...base };
      case 'stands': return { type: 'install', what: 'supply', stands: it.n, name: `${it.n} acrylic stands`, ...base };
      case 'blister': return { type: 'install', what: 'supply', packs: it.n, name: `${it.n} blister packs`, ...base };
      case 'mdecor': case 'mdisplay': {
        const kind = it.t === 'mdisplay' ? 'display' : 'decor';
        const def = g.museum?.defOf?.(kind, it.id);
        const [w, d] = def?.footprint || [1, 1];
        return { type: 'decor', kind, id: it.id, label: def?.name || it.id, name: def?.name || it.id, rot: 0, boxSize: [Math.min(0.7, 0.3 + w * 0.2), Math.min(0.6, 0.25 + 0.15 * Math.max(w, d)), Math.min(0.6, 0.3 + d * 0.15)], order: o.id };
      }
      case 'junk': return { ...parcel([...junkContents(g, it), ...extra], it.size === 'L' ? 'L' : 'M'), junk: true };
      default: return parcel([...extra]);
    }
  }
  mk.deliveryFor = deliveryFor;

  // what the van brought: orders arrive; scams reveal themselves
  g.events.on('courier', ({ phase, items }) => {
    if (phase !== 'drop') return;
    for (const d of items) {
      const o = d.order && S.orders.find((x) => x.id === d.order);
      if (o && o.status !== 'delivered') { o.status = 'delivered'; o.got = stamp(g); }
    }
  });
  g.events.on('hour', () => {
    for (const o of S.orders) {
      if (o.scam === 'noship' && o.status === 'shipped' && stamp(g) > o.eta + 600) {
        o.status = 'lost';
        mk.chat?.scamVanish?.(o);
      }
    }
  });

  /** Buyer protection: within three days of the expected delivery you get your money back (half for "not as described"). */
  mk.claim = (id) => {
    const o = S.orders.find((x) => x.id === id);
    if (!o || o.claimed) return { ok: false, msg: 'Nothing to claim' };
    const late = stamp(g) - (o.eta || 0);
    if (late > 3 * 1440) return { ok: false, msg: 'Too late: claims must be filed within 3 days' };
    let refund = 0, why = '';
    if (o.status === 'lost' || (o.scam === 'noship' && late > 0)) { refund = o.price; why = 'Item never arrived'; }
    else if (o.scam && o.status === 'delivered') { refund = Math.round(o.price * 0.5 / 10) * 10; why = o.scam === 'brick' ? 'Received a brick' : 'Counterfeit item'; }
    else if (o.status === 'delivered') return { ok: false, msg: 'The seller sent what was listed. Off-Hobby cannot refund this.' };
    else return { ok: false, msg: 'Wait until the delivery date first' };
    o.claimed = true;
    o.status = 'refunded';
    g.sim?.receiveDigital ? g.sim.receiveDigital(refund, 'Off-Hobby buyer protection', { income: false }) : g.addMoney(refund);
    const sm = S.sellers[o.seller] ||= {};
    sm.banned = true;
    g.os?.mail?.send?.({ from: 'Off-Hobby Safety Team', addr: 'safety@off-hobby.jp', subject: `Claim approved: ${o.title}`, body: `Dear customer,\n\nWe reviewed your claim (${why}).\n\nWe have refunded ${yen(refund)} to your bank account and suspended the seller "${o.sname}".\n\nTip: prices that look too good to be true usually are. Sellers who ask you to pay outside Off-Hobby are always scammers.\n\nOff-Hobby - pre-loved toys, safely.` });
    g.save();
    return { ok: true, msg: `${yen(refund)} refunded (${why})` };
  };

  // ================================================================== installs (big things Gen-san sets up)
  mk.install = (d, pos) => {
    const o = d.order && S.orders.find((x) => x.id === d.order);
    if (o) { o.status = 'delivered'; o.got = stamp(g); }
    const refund = (why) => {
      const amt = o?.price || d.price || 0;
      if (amt) g.sim?.receiveDigital ? g.sim.receiveDigital(amt, `Refund: ${d.name || 'delivery'}`, { income: false }) : g.addMoney(amt);
      g.news('Gen-san took it back', `${why}${amt ? `: ${yen(amt)} refunded` : ''}`, 6000);
      if (o) o.status = 'refunded';
    };
    if (d.what === 'machine') { if (!mk.installMachine(d.mtype, { variant: d.variant, used: d.used, grade: d.grade })) refund('No room for the machine'); return; }
    if (d.what === 'shelf') {
      const n = g.state.shelves.length;
      if (n >= SHELF_SLOTS.length) { refund('No wall space'); return; }
      const used = new Set(g.state.shelves.map((s) => s.slot));
      const slot = SHELF_SLOTS.findIndex((_, i) => !used.has(i));
      const data = { slot, items: Array(48).fill(null) };
      g.state.shelves.push(data);
      const sh = new GarageShelf(g, data);
      g.shelves.push(sh);
      sh.root.scale.set(1, 0.01, 1);
      g.tweens.add({ dur: 0.6, ease: ease.outBack, update: (k) => sh.root.scale.set(1, Math.max(0.01, k), 1) });
      audio.play('upgrade', { pos: sh.root.position });
      g.progress?.addXP(20, 'shelf');
      g.news('Gen-san put up the shelf for you', 'On the right wall');
    } else if (d.what === 'goods') {
      if (g.state.goods?.[d.id]) { refund('You already had one'); return; }
      (g.state.goods ||= {})[d.id] = true;
      g.goods?.place?.(d.id, true);
      g.museum?.recompute?.();
      g.news(`Gen-san set up the ${d.name || d.id}`, '');
    } else if (d.what === 'charm') {
      if (!g.state.charms.includes(d.id)) { g.state.charms.push(d.id); placeCharms(g, d.id); }
      g.news(`${CHARMS[d.id]?.name || 'The charm'} is on the shrine shelf`, CHARMS[d.id]?.desc || '');
    } else if (d.what === 'opener') {
      if (g.state.opener < d.tier) { g.state.opener = d.tier; placeOpenerTool(g, true); }
      g.news(`New tool: ${OPENERS[d.tier]?.name}`, 'On the work table');
    } else if (d.what === 'supply') {
      if (d.packs) g.packing?.addPacks?.(d.packs);
      if (d.stands) g.packing?.addStands?.(d.stands);
      if (d.boxes) S.shipBoxes += d.boxes;
      const parts = [d.packs && `${d.packs} blister packs`, d.stands && `${d.stands} acrylic stands`, d.boxes && `${d.boxes} shipping boxes`].filter(Boolean);
      g.news('Supplies by the packing table', parts.join(', '));
      audio.play('place', { vol: 0.6 });
    }
    g.save();
  };

  /** Put a machine in the first free slot (the drop-in from the old store). Returns the machine or null. */
  mk.installMachine = (type, { variant = null, used = false, grade = null } = {}) => {
    const room = Math.min(MACHINE_SLOTS.length, maxMachines(g.progress?.level ?? 99));
    if (g.state.machines.length >= room) return null;
    const usedSlots = new Set(g.state.machines.map((m) => m.slot));
    const slot = MACHINE_SLOTS.findIndex((_, i) => !usedSlots.has(i));
    if (slot < 0) return null;
    const series = g.state.licenses[g.state.licenses.length - 1] || 'mochi';
    const data = { id: 'm' + Date.now().toString(36), type, slot, up: { speed: 0, cap: 0, coins: 0 }, stock: [], series, price: Math.max(100, Math.round(SERIES_BY_ID[series].price / 100) * 100) };
    if (variant) data.variant = variant;
    if (used) data.used = true;
    if (grade) data.grade = grade;
    if (g.sim?.recommendedPrice) data.price = g.sim.recommendedPrice({ data });
    g.state.machines.push(data);
    const m = new GachaMachine(g, data);
    g.machines.push(m);
    const root = m.root, y1 = root.position.y;
    root.position.y = 2.6;
    g.tweens.add({
      dur: 0.7, ease: ease.outBounce,
      update: (k) => { root.position.y = 2.6 + (y1 - 2.6) * k; },
      done: () => {
        audio.play('thud', { pos: root.position, v: 1 });
        audio.play('dust', { pos: root.position });
        g.effects.sparks({ pos: root.position.clone().add(new THREE.Vector3(0, 0.1, 0)), count: 60, colors: [0xd8ccb8, 0xb8a890], speed: 0.9, size: 0.03, gravity: 0.3, life: 1.2, star: 0 });
        g.player.shake = 0.25;
        root.updateMatrixWorld(true);
      },
    });
    g.news(`${MACHINE_TYPES[type].name} installed!`, used ? 'Second-hand, with character. Fill it with capsules' : 'It arrives empty: order capsules');
    g.progress?.addXP(g.state.machines.length === 1 ? 60 : 30, 'machine');
    g.events.emit('machineBought', { machine: m, type });
    g.save();
    return m;
  };
}
