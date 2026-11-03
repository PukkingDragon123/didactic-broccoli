// Selling on Off-Hobby: list a figure you own (loose, sealed in a blister card, or graded in a slab) with your own price
// and description, or put it up for auction. Over in-game time buyers find it: some just buy, some haggle on Pichat,
// some lowball you, and some try to scam you ("ship first, I pay later"). A sale has to be packed in the OUTGOING crate
// and picked up by Gen-san; the money (minus Off-Hobby's 10% fee) reaches your bank the day after it ships.
// Auctions run both ways: bids rise on yours, and you can bid on rare pieces against other collectors.
//   mk.owned() -> [{ desc, n, where }]   things you could list;  mk.list({ desc, price, text, auction, days }) -> res
//   mk.mine(), mk.cancel(id), mk.toShip(), mk.bid(listingId, amount) -> res, mk.suggest(desc)
import { getItem } from '../data/series/index.js';
import { PRICE_STEPS } from '../game/Display.js';
import { itemValue } from '../game/economy.js';
import { ownedValue, itemTitle, CHARM_DEFS } from './catalog.js';
import { marketState, nextId, stamp, today, yen, nicePrice, pick, rint, clamp, whenText, bankBalance } from './util.js';
import { portraitURL } from '../os/art.js';

const FEE = 0.1;
const BUYERS = ['gacha_hunter_99', 'mika_collects', 'TOYBOX_TARO', 'shelf_queen', 'kaiju_kid', 'nostalgia_nori', 'capsule_carl', 'retro_rei', 'the_completionist', 'yuki_buys', 'sunday_flea', 'MINT_ONLY'];
const SCAMMERS = ['quick_cash_buyer', 'intl_collector_usa', 'PAYPAL_PRINCE', 'trusted_buyer_100'];
const look = (name) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return { bg: [0xffd2a0, 0xa8d8b8, 0xd8c8f0, 0xffe08a, 0xb8d0f0][h % 5], hair: ['short', 'spiky', 'long', 'bun', 'pomp'][h % 5], hairCol: [0x2a2428, 0x5a3626, 0xc4c0ba][h % 3], shirt: [0x3f86e8, 0xe5383b, 0x3fae4f, 0x8a6ab0][h % 4], mouth: 'grin' }; };

export const descTitle = (d) => (d.kind === 'slab' ? itemTitle({ t: 'slab', ...d }) : d.kind === 'packaged' ? `Sealed ${getItem(d.key)?.name || ''}` : `${d.finish && d.finish !== 'normal' ? d.finish[0].toUpperCase() + d.finish.slice(1) + ' ' : ''}${getItem(d.key)?.name || 'Figure'}`);
const same = (a, b) => a.kind === b.kind && a.key === b.key && (a.finish || 'normal') === (b.finish || 'normal') && (a.kind !== 'slab' || a.score === b.score);

export function installSelling(g, mk) {
  const S = marketState(g);
  S.mine ||= []; S.ship ||= [];
  const hooked = new Set();

  // ================================================================== what you own (that could be listed)
  mk.owned = () => {
    const out = [];
    const add = (desc, where) => { const e = out.find((x) => same(x.desc, desc)); if (e) { e.n++; if (!e.where.includes(where)) e.where.push(where); } else out.push({ desc, n: 1, where: [where] }); };
    for (const [k, c] of Object.entries(g.state.storage || {})) { const [key, finish] = k.split('|'); if (getItem(key) && !getItem(key).mini) for (let i = 0; i < c; i++) add({ kind: 'toy', key, finish: finish || 'normal' }, 'storage bin'); }
    for (const s of g.held.slots) {
      if (s?.kind === 'toy') add({ kind: 'toy', key: s.data.key, finish: s.data.finish || 'normal' }, 'your hands');
      if (s?.kind === 'packaged') add({ kind: 'packaged', key: s.data.key, finish: s.data.finish || 'normal' }, 'your hands');
      if (s?.kind === 'mkt' && s.data.t === 'slab') add({ kind: 'slab', key: s.data.key, finish: s.data.finish || 'normal', score: s.data.score }, 'your hands');
    }
    for (const d of g.allDisplays()) for (const it of d.items) if (it?.k && !getItem(it.k)?.mini) add({ kind: 'toy', key: it.k, finish: it.f || 'normal' }, 'on display');
    for (const e of g.items.list) if (e.kind === 'toy') add({ kind: 'toy', key: e.data.key, finish: e.data.finish || 'normal' }, 'on the floor');
    for (const r of g.packing?.state?.loose || []) add({ kind: 'packaged', key: r.key, finish: r.finish || 'normal' }, 'set down');
    for (const r of S.loose) if (r.d.t === 'slab') add({ kind: 'slab', key: r.d.key, finish: r.d.finish || 'normal', score: r.d.score }, 'set down');
    // minus what's already listed or sold and waiting to ship
    for (const l of S.mine) if (['live', 'sold'].includes(l.status)) { const e = out.find((x) => same(x.desc, l.item)); if (e) e.n--; }
    for (const s of S.ship) if (s.status === 'topack') { const e = out.find((x) => same(x.desc, s.item)); if (e && s.kind === 'grading') e.n--; }
    return out.filter((e) => e.n > 0).sort((a, b) => ownedValue(b.desc) - ownedValue(a.desc));
  };
  /** Price-tag steps (the same multiples of the dealer price as your shop's price tags) and the collector value. */
  mk.suggest = (desc) => {
    const dealer = itemValue(desc.key, desc.finish || 'normal');
    return { dealer, market: ownedValue(desc), steps: PRICE_STEPS.filter((x) => x > 0).map((m) => ({ m, price: Math.max(10, Math.round(dealer * m * (desc.kind === 'packaged' ? 1.3 : desc.kind === 'slab' ? 2 : 1) / 10) * 10) })) };
  };

  // ================================================================== listing
  mk.mine = () => S.mine;
  mk.list = ({ desc, price, text = '', auction = false, days = 1 }) => {
    if (g.progress && !g.progress.unlocked('market:sell')) return { ok: false, msg: `Selling unlocks at shop level ${g.progress.levelFor('market:sell')}` };
    if (auction && g.progress && !g.progress.unlocked('market:auction')) return { ok: false, msg: `Auctions unlock at shop level ${g.progress.levelFor('market:auction')}` };
    price = Math.round(+price);
    if (!(price >= 10)) return { ok: false, msg: 'Set a price of at least ¥10' };
    if (!mk.owned().some((e) => same(e.desc, desc))) return { ok: false, msg: "You don't have that one (or it's already listed)" };
    const l = { id: nextId(S, 'm'), item: { ...desc }, title: descTitle(desc), price, text: String(text).slice(0, 200), posted: stamp(g), status: 'live', views: 0, watchers: 0 };
    if (auction) Object.assign(l, { auction: true, start: price, bid: 0, bids: [], ends: stamp(g) + Math.max(1, Math.min(3, days)) * 1440 });
    S.mine.unshift(l);
    g.events.emit('marketListed', { listing: l });
    g.save();
    return { ok: true, msg: auction ? `Auction started: ends ${whenText(g, l.ends)}` : 'Listed! Buyers will find it over the next hours.', listing: l };
  };
  mk.cancel = (id) => {
    const l = S.mine.find((x) => x.id === id);
    if (!l) return { ok: false, msg: 'Not found' };
    if (l.status === 'live' && l.auction && l.bids.length) return { ok: false, msg: "There are bids on it: an auction can't be stopped now" };
    if (l.status === 'live') { l.status = 'cancelled'; g.save(); return { ok: true, msg: 'Listing removed' }; }
    if (l.status === 'sold') {
      // backing out of a sale costs you your good name
      l.status = 'cancelled';
      const s = S.ship.find((x) => x.ref === l.id && x.status === 'topack');
      if (s) s.status = 'cancelled';
      rate(1);
      g.save();
      return { ok: true, msg: 'Sale cancelled. The buyer left you 1 star.' };
    }
    return { ok: false, msg: "It's already on its way" };
  };
  mk.toShip = () => S.ship.filter((s) => s.status === 'topack' || s.status === 'packed');
  const rate = (stars) => { S.rating.n++; S.rating.sum += stars; };
  mk.rating = () => (S.rating.n ? S.rating.sum / S.rating.n : 0);

  function sold(l, price, buyer, opts = {}) {
    l.status = 'sold'; l.sold = price; l.buyer = buyer; l.soldAt = stamp(g);
    S.ship.push({ id: nextId(S, 'p'), kind: 'sale', ref: l.id, item: { ...l.item }, buyer, price, status: 'topack', due: stamp(g) + 2 * 1440, noPay: !!opts.noPay });
    g.os?.notify?.({ app: 'browser', title: 'Off-Hobby: SOLD!', body: `${l.title} sold to ${buyer} for ${yen(price)}. Pack it in the OUTGOING crate by the shutter.`, icon: 'os_cart', news: true, onClick: () => g.os.browser.open('http://www.off-hobby.jp/my?tab=ship') });
    g.events.emit('marketSold', { listing: l, price, buyer });
    if (!S.stats.sold) g.os?.achievements?.unlock('mkt_first_sale');
    S.stats.sold++;
    g.save();
  }

  // shipping + payout
  mk.onShipped = (s) => {
    if (s.kind === 'sale') { s.payAt = stamp(g) + rint(10, 22) * 60; const l = S.mine.find((x) => x.id === s.ref); if (l) l.status = 'shipped'; }
    mk.grading?.onShipped?.(s);
  };

  // ================================================================== buyers over time
  const thread = (name) => {
    const t = g.os.messenger.thread({ id: `ob_${name}`, name, avatar: look(name), kind: SCAMMERS.includes(name) ? 'spam' : 'npc', about: SCAMMERS.includes(name) ? 'New Off-Hobby member.' : `Off-Hobby buyer. ${rint(3, 400)} purchases.` });
    if (!hooked.has(t.id)) { hooked.add(t.id); t.onReply((v) => buyerReply(name, t, v)); }
    return t;
  };
  function buyerReply(name, t, v) {
    const [act, id, amt] = String(v).split(':');
    const l = S.mine.find((x) => x.id === id);
    if (!l || l.status !== 'live') { if (act !== 'no') t.post({ text: 'Oh, it is gone already? OK!', delay: 2 }); return; }
    const mv = ownedValue(l.item);
    if (act === 'acc') { t.post({ text: pick(['Thank you!! Paying now.', 'Great, paid!', 'Yay!']), delay: 2 }); sold(l, +amt, name); }
    else if (act === 'ctr') {
      const want = +amt;
      if (want <= mv * (0.9 + Math.random() * 0.5)) { t.post({ text: `OK, ${yen(want)} it is. Paid!`, delay: 2.5 }); sold(l, want, name); }
      else t.post({ text: pick(['Too much for me. Good luck with it!', 'Hmm, no thanks.', 'I will pass. Bye!']), delay: 3 });
    } else if (act === 'no') t.post({ text: pick(['OK, no problem.', 'Worth a try!', ':(']), delay: 2 });
    else if (act === 'shipfirst') {
      // the scam: you ship, nobody pays
      t.post({ text: 'great!! ship today please. payment comes in 3 business days :)', delay: 1.5 });
      sold(l, +amt, name, { noPay: true });
    } else if (act === 'pin') {
      const loss = Math.min(Math.round(bankBalance(g) * 0.3 / 100) * 100, 9000);
      if (loss > 0) { g.sim?.payDigital ? g.sim.payDigital(loss, 'Unknown withdrawal') : g.spend(loss); S.stats.scammed++; }
      t.post({ text: 'thx :)', delay: 1.2 });
      t.post({ from: 'system', text: `${name} has left Pichat. Your bank shows an unknown withdrawal of ${yen(loss)}.`, delay: 5 });
      g.os?.achievements?.unlock('mkt_scammed');
    } else if (act === 'report') {
      t.post({ from: 'system', text: `You reported ${name}. Off-Hobby removed the account. Thank you!` });
      t.block?.();
      g.os?.achievements?.unlock('mkt_scam_spotter');
    }
  }

  let lastTick = stamp(g);
  function tick() {
    const now = stamp(g);
    if (now < lastTick) lastTick = now; // the clock was set back (debug)
    const steps = Math.min(30, Math.floor((now - lastTick) / 20));
    if (steps <= 0) return;
    lastTick += steps * 20;
    for (let i = 0; i < steps; i++) step(now - (steps - 1 - i) * 20);
  }
  function step(now) {
    const traffic = g.clock?.traffic?.((now % 1440) / 60) ?? 0.6;
    const ward = mk.luck?.().ward || 0;
    const rf = S.rating.n ? clamp(mk.rating() / 4.2, 0.4, 1.2) : 1;
    for (const l of S.mine) {
      if (l.status !== 'live') continue;
      const mv = ownedValue(l.item);
      if (l.auction) { auctionStep(l, now, mv, traffic); continue; }
      const ratio = l.price / mv;
      const interest = Math.pow(clamp(1.7 - ratio, 0.03, 1.5), 1.6) * (l.text.length > 20 ? 1.15 : 1) * rf;
      l.views += Math.random() < traffic ? rint(0, 3) : 0;
      if (Math.random() > 0.07 * interest * (0.3 + traffic)) continue;
      const r = Math.random();
      const name = pick(BUYERS);
      if (r < 0.08 && Math.random() > ward) { scamAttempt(l, now); continue; }
      if (ratio <= 1.25 && r < 0.6) { sold(l, l.price, name); continue; }
      if (r < 0.9) {
        const off = nicePrice(l.price * (0.6 + Math.random() * 0.3));
        const t = thread(name);
        t.post({ text: pick([`Hi! Would you take ${yen(off)} for the ${l.title}?`, `${yen(off)}? I can pay right now.`, `Hello, is ${yen(off)} OK for ${l.title}? I'm a student...`]), choices: [{ label: `Accept ${yen(off)}`, value: `acc:${l.id}:${off}` }, { label: `Counter: ${yen(nicePrice((off + l.price) / 2))}`, value: `ctr:${l.id}:${nicePrice((off + l.price) / 2)}` }, { label: 'No thanks', value: `no:${l.id}` }], ...(Math.random() < 0.3 ? { qte: { seconds: 8, timeout: `no:${l.id}` } } : {}) });
      } else {
        thread(name).post({ text: pick([`Is the ${l.title} still available?`, `Does it smell like anything? Asking for my wife.`, `What a nice ${l.title}. My grandpa had one!`, `Any chance you have the rest of the set?`]) });
      }
    }
    // sales that never got packed are cancelled; shipped ones pay out
    for (const s of S.ship) {
      if (s.kind !== 'sale') continue;
      if (s.status === 'topack' && now > s.due) { s.status = 'cancelled'; const l = S.mine.find((x) => x.id === s.ref); if (l) l.status = 'cancelled'; rate(1); g.os?.notify?.({ app: 'browser', title: 'Off-Hobby', body: `You didn't ship ${s.item && descTitle(s.item)} in time. The sale was cancelled (1 star).`, icon: 'os_warn', news: true }); }
      if (s.status === 'shipped' && s.payAt && now >= s.payAt) {
        s.status = 'done';
        const l = S.mine.find((x) => x.id === s.ref);
        if (l) l.status = 'done';
        if (s.noPay) { g.os?.notify?.({ app: 'browser', title: 'Off-Hobby', body: `${s.buyer} never paid for ${descTitle(s.item)}. You shipped first... it was a scam.`, icon: 'os_warn', news: true }); S.stats.scammed++; g.os?.achievements?.unlock('mkt_scammed'); continue; }
        const net = Math.round(s.price * (1 - FEE));
        g.sim?.receiveDigital ? g.sim.receiveDigital(net, `Off-Hobby sale: ${descTitle(s.item)}`) : g.addMoney(net);
        S.stats.earned += net;
        rate(Math.random() < 0.8 ? 5 : 4);
        g.progress?.addXP(15, 'market');
        g.os?.notify?.({ app: 'bank', title: 'Off-Hobby payout', body: `${yen(net)} for ${descTitle(s.item)} (after the 10% fee). ${s.buyer} left 5 stars!`, icon: 'os_bank', news: true });
      }
    }
    // auctions you are bidding on
    for (const l of S.listings) if (l.auction && !l.done) npcAuctionStep(l, now);
  }
  function scamAttempt(l, now) {
    const name = pick(SCAMMERS), t = thread(name);
    if (Math.random() < 0.5) {
      const amt = nicePrice(l.price * 2);
      t.post({ text: `hello I buy ${l.title} for ${yen(amt)} (DOUBLE!!). my bank needs you ship first, then payment comes in 3 business day. deal?`, choices: [{ label: `OK, I'll ship first (${yen(amt)})`, value: `shipfirst:${l.id}:${amt}` }, { label: 'Pay through Off-Hobby please', value: `no:${l.id}` }, { label: 'Report this buyer', value: `report:${l.id}` }], qte: { seconds: 8, timeout: `no:${l.id}` } });
    } else {
      t.post({ text: `hi i want buy ${l.title} now. to send payment please tell me your bank PIN number. fast please`, choices: [{ label: 'Send my PIN', value: `pin:${l.id}` }, { label: 'Report this buyer', value: `report:${l.id}` }, { label: 'Ignore', value: `no:${l.id}` }] });
    }
  }

  // ---- auctions on your own listings
  function auctionStep(l, now, mv, traffic) {
    l.views += rint(0, 2);
    const left = l.ends - now;
    if (left <= 0) {
      if (l.bids.length) { const b = l.bids[l.bids.length - 1]; sold(l, b.v, b.who); }
      else { l.status = 'ended'; g.os?.notify?.({ app: 'browser', title: 'Off-Hobby auction ended', body: `No bids on ${l.title}. Try a lower start price?`, icon: 'os_info' }); }
      return;
    }
    l.bidders ||= Array.from({ length: rint(1, 4) }, () => ({ who: pick(BUYERS), max: mv * (0.55 + Math.random() * 1.0) }));
    const cur = l.bids.length ? l.bid : l.start;
    const inc = Math.max(10, nicePrice(cur * 0.06));
    const sniping = left < 90;
    for (const b of l.bidders) {
      const next = l.bids.length ? cur + inc : l.start;
      if (b.max < next || l.bids[l.bids.length - 1]?.who === b.who) continue;
      if (Math.random() < (sniping ? 0.5 : 0.05 + 0.08 * traffic)) {
        l.bid = next; l.bids.push({ who: b.who, v: next, t: now });
        if (l.bids.length === 1) g.os?.notify?.({ app: 'browser', title: 'Off-Hobby auction', body: `First bid on ${l.title}: ${yen(next)}`, icon: 'os_cart' });
        break;
      }
    }
  }

  // ---- auctions you bid on (other collectors bid against you)
  mk.bid = (lid, amount) => {
    const l = mk.get(lid);
    if (!l?.auction || l.done) return { ok: false, msg: 'This auction is over' };
    if (g.progress && !g.progress.unlocked('market:auction')) return { ok: false, msg: `Auctions unlock at shop level ${g.progress.levelFor('market:auction')}` };
    const min = l.bids.length ? l.bid + Math.max(10, nicePrice(l.bid * 0.06)) : l.start;
    amount = Math.round(+amount);
    if (!(amount >= min)) return { ok: false, msg: `Bid at least ${yen(min)}` };
    if (bankBalance(g) < amount) return { ok: false, msg: "Your bank balance can't cover that bid" };
    l.mine = true;
    l.myMax = amount;
    l.bids.push({ who: 'you', v: amount, t: stamp(g) });
    l.bid = amount; l.price = amount;
    // the other collectors answer at once if they want it more
    rebid(l, stamp(g));
    g.save();
    const top = l.bids[l.bids.length - 1];
    return top.who === 'you' ? { ok: true, msg: `You're the top bidder at ${yen(amount)}` } : { ok: false, msg: `Outbid at once by ${top.who} (${yen(top.v)})!` };
  };
  function rebid(l, now) {
    const top = l.bids[l.bids.length - 1];
    if (!top || top.who !== 'you') return;
    const inc = Math.max(10, nicePrice(l.bid * 0.06));
    if (l.max >= l.bid + inc) {
      const v = Math.min(l.max, l.bid + inc * (1 + Math.floor(Math.random() * 2)));
      l.bid = v; l.price = v;
      const who = pick(BUYERS);
      l.bids.push({ who, v, t: now + 1 });
      g.os?.notify?.({ app: 'browser', title: 'Outbid!', body: `${who} bid ${yen(v)} on ${l.title}. Raise your bid on Off-Hobby before it ends (${whenText(g, l.ends)}).`, icon: 'os_warn', news: true, onClick: () => g.os.browser.open(`http://www.off-hobby.jp/item/${l.id}`) });
    }
  }
  function npcAuctionStep(l, now) {
    if (now >= l.ends) {
      l.done = true;
      const top = l.bids[l.bids.length - 1];
      if (top?.who === 'you') {
        l.sold = false; // let buy() pass
        const r = mk.buy(l, top.v, 'auction');
        if (r.ok) { g.os?.notify?.({ app: 'browser', title: 'You won the auction!', body: `${l.title} for ${yen(top.v)}. Gen-san brings it ${whenText(g, r.order.eta)}.`, icon: 'os_trophy', news: true }); g.os?.achievements?.unlock('mkt_auction'); }
        else { l.sold = true; g.os?.notify?.({ app: 'browser', title: 'Auction payment failed', body: `${r.msg}. ${l.title} went to the next bidder.`, icon: 'os_error', news: true }); rate(2); }
      } else l.sold = true;
      return;
    }
    // other collectors keep bidding (and snipe at the end)
    const left = l.ends - now;
    const cur = l.bid, inc = Math.max(10, nicePrice(cur * 0.06));
    if (l.bids[l.bids.length - 1]?.who === 'you') { if (Math.random() < (left < 60 ? 0.6 : 0.12)) rebid(l, now); return; }
    if (cur + inc <= l.max && Math.random() < (left < 60 ? 0.3 : 0.04)) { l.bid = cur + inc; l.price = l.bid; l.bids.push({ who: pick(BUYERS), v: l.bid, t: now }); }
  }

  g.constructor.updaters.push(() => tick());
  for (const id of Object.keys(g.os?.st?.msgr?.threads || {})) if (id.startsWith('ob_')) thread(id.slice(3));
  mk.charmName = (id) => CHARM_DEFS[id]?.name;
  mk.portrait = (name) => portraitURL(look(name));
}
