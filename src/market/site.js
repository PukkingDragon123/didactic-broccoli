// The Off-Hobby website (off-hobby.jp) and the Kanto Grading Service (kgs-grading.jp) in Capsule Navigator, plus the
// Off-Hobby desktop shortcut. Plain 1999 pages: a category list, a grid of listings with real photos of the actual
// item (rendered lazily from its 3D model, stickers and all, on the seller's tatami / table / bedsheet), listing pages
// with grade, flaws and the seller's profile, Buy now / Message seller / bidding, and My Off-Hobby (orders, claims,
// selling, things to ship, the instant buyback).
import { h, esc, ic } from '../os/apps/ui.js';
import { getItem, SERIES_BY_ID } from '../data/series/index.js';
import { portrait } from '../os/art.js';
import { RARITIES } from '../data/rarity.js';
import { FINISHES } from '../data/finishes.js';
import { itemValue } from '../game/economy.js';
import * as shop from '../game/shop.js';
import { CATS, CAT_BY_ID, catOpen, catLevel, GRADES, seller, sellerRating, variantLines, gradeColor, itemTitle, CHARM_DEFS, TIPJAR_DEFS } from './catalog.js';
import { itemObject, photo, photoReady, pumpPhotos, gradeWord } from './models.js';
import { descTitle } from './selling.js';
import { TIERS } from './grading.js';
import { marketState, yen, stamp, whenText, today, bankBalance } from './util.js';
import { luckText } from './world.js';
import { defineIcon } from '../gfx/icons.js';
import './site.css';

export const OH = 'http://www.off-hobby.jp';
const stars = (r) => { const n = Math.round(r); return `<span class="oh-stars">${'*'.repeat(n)}<i>${'*'.repeat(5 - n)}</i></span>`; };
const ago = (g, st) => { const m = Math.max(0, stamp(g) - st); return m < 60 ? `${Math.max(1, Math.round(m))} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

defineIcon('os_offhobby', { rows: [
  '................',
  '..KKKKKKKKKKK...',
  '.KOOOOOOOOOOOK..',
  '.KOWWWOOOOOOOOK.',
  '.KOWOWOOOOOOOOOK',
  '.KOWWWOWOWOOOOK.',
  '.KOOOOOWWWOOOK..',
  '.KOOOOOWOWOOK...',
  '.KOOOOOOOOOK....',
  '.KKKKKKKKKK.....',
  '...YY...........',
  '..Y..Y..........',
  '..Y..Y..........',
  '...YY...........',
  '................',
  '................',
] });

export function installSites(g, mk) {
  const os = g.os, browser = os?.browser;
  if (!browser) return;
  const S = marketState(g);

  // ---- desktop shortcut + bookmarks
  os.registerApp({ id: 'offhobby', name: 'Off-Hobby', label: 'Off-Hobby', icon: 'os_offhobby', group: 'Internet', about: 'Shortcut to http://www.off-hobby.jp/ - pre-loved toys, machines & oddities.', open: () => {} });
  const open0 = os.open.bind(os);
  os.open = (id, args = {}) => (id === 'offhobby' ? open0('browser', { url: `${OH}/` }) : open0(id, args));
  const bm = os.st.web.bookmarks;
  if (bm && !bm.some(([, u]) => u.includes('off-hobby'))) bm.splice(1, 0, ['Off-Hobby', `${OH}/`]);

  // ---- lazy photos: an <img data-ph> gets its src once rendered
  const photoOf = (l, size = 96) => {
    const s = seller(g, l.seller);
    return photo(g, l.id, () => itemObject(g, l.item), { size, bg: s.photo, thumb: s.thumb && l.cat !== 'machines', blur: s.pers === 'kid' });
  };
  const img = (key, w, cls = '', src = '') => `<img class="oh-ph ${cls}" data-ph="${esc(key)}" width="${w}" height="${w}" alt="" draggable="false"${src ? ` src="${src}"` : ''}>`;
  function hydrate(page) {
    let raf = 0;
    const pump = () => {
      if (!page.isConnected) return;
      pumpPhotos(6);
      let left = 0;
      for (const el of page.querySelectorAll('img[data-ph]:not([src])')) { const u = photoReady(el.dataset.ph, +el.dataset.size || 96); if (u) el.src = u; else left++; }
      if (left) raf = requestAnimationFrame(pump);
    };
    raf = requestAnimationFrame(pump);
    return () => cancelAnimationFrame(raf);
  }
  const listingImg = (l, w = 96) => { const u = photoOf(l, 96); return img(l.id, w, '', u); };
  const descPhoto = (d) => {
    const key = `own|${d.kind}|${d.key}|${d.finish}|${d.score || ''}`;
    const u = photo(g, key, () => itemObject(g, d.kind === 'slab' ? { t: 'slab', ...d } : { t: 'figure', ...d }), { size: 96, bg: 'studio' });
    return img(key, 64, '', u);
  };

  // ---- page chrome
  const unreadMsgs = () => Object.values(os.st.msgr?.threads || {}).filter((d) => (d.id.startsWith('oh_') || d.id.startsWith('ob_')) && d.unread).reduce((a, d) => a + d.unread, 0);
  function chrome(inner, ctx, active = '') {
    const tr = S.orders.filter((o) => o.status === 'shipped' || o.status === 'paid').length;
    const ship = (S.ship || []).filter((s) => s.status === 'topack').length;
    const cats = CATS.map((c) => {
      const open = catOpen(g, c.id), n = open ? mk.listings(c.id).filter((l) => !l.sold).length : 0;
      return `<li class="${active === c.id ? 'on' : ''}${open ? '' : ' lock'}">${open ? `<a href="/c/${c.id}">${esc(c.name)}</a> <small>(${n})</small>` : `${ic('os_lock', 1)} ${esc(c.name)} <small>Lv ${catLevel(c.id)}</small>`}</li>`;
    }).join('');
    return `<div class="st-oh">
      <div class="oh-top"><a href="/" class="oh-logo">${ic('os_offhobby', 2)}<b>Off<i>-</i>Hobby</b></a><span class="oh-tag">pre-loved toys, machines &amp; oddities</span>
        <form class="oh-search"><input class="c98-field" name="q" placeholder="Search Off-Hobby" value="${esc(ctx.url.query.get('q') || '')}"><button class="c98-btn small" type="submit">Search</button></form></div>
      <div class="oh-bar"><a href="/">Home</a><a href="/my?tab=orders">My orders${tr ? ` <b>${tr}</b>` : ''}</a><a href="/my?tab=selling">Selling</a><a href="/my?tab=ship">To ship${ship ? ` <b>${ship}</b>` : ''}</a><a href="/my?tab=sell">Sell an item</a><a href="/auctions">Auctions</a><a href="/help">Help</a>
        <span class="oh-acct">${ic('os_bank', 1)} ${yen(bankBalance(g))}${unreadMsgs() ? ` &middot; <a data-pichat="1">${unreadMsgs()} message${unreadMsgs() > 1 ? 's' : ''}</a>` : ''}</span></div>
      <div class="oh-cols"><ul class="oh-cats"><li class="oh-ch">Categories</li>${cats}</ul><div class="oh-main">${inner}</div></div>
      <p class="oh-foot">Off-Hobby (C) 1999 Off-Hobby K.K. &middot; Deliveries by Lane Express (Gen-san) &middot; Never pay outside Off-Hobby &middot; <a href="http://www.kgs-grading.jp/">KGS grading</a></p></div>`;
  }
  function card(l) {
    const it = l.item, s = seller(g, l.seller);
    const auction = l.auction ? `<span class="oh-auc">${l.done ? 'ENDED' : `BID ${yen(l.bid)} &middot; ${l.bids.length} bid${l.bids.length === 1 ? '' : 's'}`}</span>` : '';
    const newL = stamp(g) - l.posted < 90 ? '<span class="oh-new">NEW!</span>' : '';
    return `<a class="oh-card${l.sold ? ' sold' : ''}" href="/item/${l.id}"><span class="oh-pw">${listingImg(l)}${l.sold ? '<i class="oh-soldst">SOLD</i>' : ''}</span>
      <span class="oh-ct">${newL}${esc(l.title)}</span><span class="oh-cp">${l.auction ? auction : yen(l.price)}</span>
      <span class="oh-cg" style="--gc:${gradeColor(it.grade)}">${it.t === 'junk' ? '?' : esc(it.grade)}</span><span class="oh-cs">${esc(s.name)}</span></a>`;
  }
  const grid = (list, empty = 'Nothing here today. Check back tomorrow!') => (list.length ? `<div class="oh-grid">${list.map(card).join('')}</div>` : `<p class="oh-empty">${esc(empty)}</p>`);

  // ---- pages
  function home(ctx) {
    mk.refresh();
    const all = mk.listings();
    const picks = all.filter((l) => !l.sold && !l.auction).sort((a, b) => b.posted - a.posted).slice(0, 12);
    const auctions = all.filter((l) => l.auction && !l.done).sort((a, b) => a.ends - b.ends).slice(0, 4);
    const sold = all.filter((l) => l.sold).slice(-5);
    const C = g.courier?.state;
    return chrome(`<div class="oh-hero"><b>Today on Off-Hobby</b><span>${all.filter((l) => !l.sold).length} items from ${new Set(all.map((l) => l.seller)).size} sellers. New listings every morning, more at noon and 6pm.</span></div>
      <h2>Just listed</h2>${grid(picks)}
      ${auctions.length ? `<h2>Auctions ending soon</h2>${grid(auctions)}` : ''}
      ${sold.length ? `<p class="oh-ticker">Just sold: ${sold.map((l) => esc(l.title)).join(' &middot; ')}</p>` : ''}
      <div class="oh-gen">${ic('os_info', 1)} <b>Delivered by Gen-san's FREE CANDY van.</b> Yes, really. He has delivered on this lane since 1979${C?.visits ? `, and to you ${C.visits} time${C.visits > 1 ? 's' : ''}` : ''}. Orders arrive in 1-3 days; your parcels to buyers go with him too.</div>`, ctx);
  }
  function category(ctx, cat) {
    const c = CAT_BY_ID[cat];
    if (!c) { ctx.notFound(); return ''; }
    if (!catOpen(g, cat)) return chrome(`<h2>${esc(c.name)}</h2><p class="oh-empty">${ic('os_lock', 2)} This category opens at shop level ${catLevel(cat)}.</p>`, ctx, cat);
    mk.refresh();
    const sort = ctx.url.query.get('sort') || 'new';
    let list = mk.listings(cat);
    list = sort === 'cheap' ? list.sort((a, b) => a.price - b.price) : sort === 'grade' ? list.sort((a, b) => 'SABCJ'.indexOf(a.item.grade) - 'SABCJ'.indexOf(b.item.grade)) : list.sort((a, b) => b.posted - a.posted);
    list.sort((a, b) => (a.sold ? 1 : 0) - (b.sold ? 1 : 0));
    ctx.title(`${c.name} - Off-Hobby`);
    return chrome(`<h2>${esc(c.name)}</h2><p class="oh-blurb">${esc(c.blurb)} Sort: ${['new', 'cheap', 'grade'].map((s) => (s === sort ? `<b>${s}</b>` : `<a href="/c/${cat}?sort=${s}">${s}</a>`)).join(' | ')}</p>${grid(list)}`, ctx, cat);
  }
  function itemPage(ctx, id) {
    const l = mk.get(id);
    if (!l) return chrome('<h2>Listing not found</h2><p class="oh-empty">This listing has ended or was removed. <a href="/">Back to Off-Hobby</a></p>', ctx);
    const it = l.item, s = seller(g, l.seller), why = mk.canBuy(l);
    const banned = S.sellers[s.id]?.banned;
    ctx.title(`${l.title} - Off-Hobby`);
    const facts = [];
    if (it.t === 'figure') { const R = RARITIES[getItem(it.key)?.rarity] || RARITIES.common; facts.push(`Rarity: <b style="color:${R.color}">${esc(R.name)}</b>`, `Series: ${esc(SERIES_BY_ID[getItem(it.key)?.series]?.name || '')}`); if (it.finish !== 'normal') facts.push(`Finish: <b>${esc(FINISHES[it.finish]?.name || it.finish)}</b>`); }
    if (it.t === 'charm') facts.push(esc(CHARM_DEFS[it.id]?.desc || ''), esc(luckText({ ...it })));
    if (it.t === 'tipjar') facts.push(esc(TIPJAR_DEFS[it.id]?.desc || ''));
    if (it.t === 'carton') facts.push(`Says ${it.count} capsules on the box.`);
    if (it.t === 'machine') facts.push('Gen-san wheels it in and sets it up in a free spot.');
    if (it.t === 'junk') facts.push('Contents unknown. That is the fun part.');
    const flaws = [...(it.flaws || []).map((f) => f[0].toUpperCase() + f.slice(1)), ...variantLines(it.variant)];
    const rating = sellerRating(g, S, s);
    let buy;
    if (l.auction) {
      const min = l.bids.length ? l.bid + Math.max(10, Math.round(l.bid * 0.06 / 10) * 10) : l.start;
      const top = l.bids[l.bids.length - 1];
      buy = l.done ? `<p class="oh-big">Auction ended${top ? ` at ${yen(top.v)} (${esc(top.who === 'you' ? 'you won!' : top.who)})` : ''}</p>`
        : `<p class="oh-big">Current bid: ${yen(l.bids.length ? l.bid : l.start)}</p><p>${l.bids.length} bid${l.bids.length === 1 ? '' : 's'} &middot; ends ${esc(whenText(g, l.ends))}${top?.who === 'you' ? ' &middot; <b class="oh-ok">you are the top bidder</b>' : ''}</p>
          <form class="oh-bid">Your bid: <input class="c98-field" name="amt" type="number" min="${min}" step="10" value="${min}"> <button class="c98-btn def" type="submit">Place bid</button></form>
          <p class="c98-dim">${l.bids.slice(-4).reverse().map((b) => `${esc(b.who)} ${yen(b.v)}`).join(' &middot; ')}</p>`;
    } else if (l.sold) buy = `<p class="oh-big oh-soldtxt">SOLD${l.soldTo === 'you' ? ' to you!' : ''}</p>${l.soldTo === 'you' ? '<p><a href="/my?tab=orders">Track your order</a></p>' : ''}`;
    else buy = `<p class="oh-big">${yen(l.price)}</p><p class="c98-dim">+ free delivery by Gen-san (${l.ship} day${l.ship > 1 ? 's' : ''})</p>
      ${why ? `<p class="oh-why">${ic('os_warn', 1)} ${esc(why)}</p>` : ''}
      <p><button class="c98-btn def" data-act="buy"${why || banned ? ' disabled' : ''}>Buy now</button> <button class="c98-btn" data-act="msg"${banned ? ' disabled' : ''}>Message seller</button></p>`;
    return chrome(`<div class="oh-item"><div class="oh-ipic">${img(l.id, 192, 'big', photoOf(l, 96))}<small>Photo by the seller</small></div>
      <div class="oh-iinfo"><h1>${esc(l.title)}</h1>
        <p><span class="oh-cg big" style="--gc:${gradeColor(it.grade)}">${it.t === 'junk' ? '?' : esc(it.grade)}</span> <b>Condition:</b> ${esc(it.t === 'junk' ? 'Junk (sold as is)' : GRADES[it.grade]?.name || it.grade)} <span class="c98-dim">${esc(GRADES[it.grade]?.desc || '')}</span></p>
        ${facts.length ? `<p>${facts.join('<br>')}</p>` : ''}
        <div class="oh-flaws"><b>Notes &amp; flaws:</b>${flaws.length ? `<ul>${flaws.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ' none listed'}</div>
        <p class="oh-quote">"${esc(l.note)}"</p>${buy}</div>
      <div class="oh-seller">${portrait(s.look, 2)}<b>${esc(s.name)}</b><br>${rating ? stars(rating) : '<span class="c98-dim">no ratings yet</span>'} <small>(${s.sales} sales)</small><br><small>${esc(s.area)} &middot; member since ${s.since}</small><p class="oh-sbl">${esc(s.blurb)}</p>${banned ? '<p class="oh-why">This account is suspended.</p>' : ''}<small>${l.views} views &middot; ${l.watchers} watching &middot; listed ${esc(ago(g, l.posted))}</small></div></div>`, ctx, l.cat);
  }
  function auctions(ctx) {
    mk.refresh();
    const list = mk.listings().filter((l) => l.auction).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || a.ends - b.ends);
    const lock = g.progress && !g.progress.unlocked('market:auction');
    return chrome(`<h2>Collector auctions</h2><p class="oh-blurb">Rare figures, misprints and gold charms. Bids rise as the day goes on; other collectors snipe in the last hour.${lock ? ` <b>Bidding and auction listings open at shop level ${g.progress.levelFor('market:auction')}.</b>` : ''}</p>${grid(list, 'No auctions right now.')}`, ctx);
  }
  function search(ctx) {
    const q = (ctx.url.query.get('q') || '').toLowerCase().trim();
    mk.refresh();
    const list = q ? mk.listings().filter((l) => l.title.toLowerCase().includes(q) || seller(g, l.seller).name.toLowerCase().includes(q)) : [];
    return chrome(`<h2>Search: "${esc(q)}"</h2>${grid(list, 'No matches. Try "maneki", "gold" or a series name.')}`, ctx);
  }
  function help(ctx) {
    return chrome(`<h2>Help &amp; safety</h2><dl class="oh-dl">
      <dt>Grades</dt><dd>${Object.values(GRADES).map((x) => `<b>${esc(x.id)}</b> ${esc(x.name.split(' - ')[1] || x.name)}`).join(' &middot; ')}. Sellers grade their own items. Ask about flaws before you buy.</dd>
      <dt>Haggling</dt><dd>Message the seller and make an offer. Some will meet you halfway, some won't move a yen, and some sell to whoever answers first.</dd>
      <dt>Delivery</dt><dd>Everything comes by Lane Express: Gen-san and his van (it says FREE CANDY; he means it). He drops it at your shutter and takes your outgoing parcels.</dd>
      <dt>Selling</dt><dd>List a figure from your shop (storage bin, shelves, your hands). When it sells, put it in the OUTGOING crate by your shutter with a shipping box. You get paid the day after it ships, minus a 10% fee.</dd>
      <dt>Grading</dt><dd>Send figures to <a href="http://www.kgs-grading.jp/">KGS</a>. A slab with a high grade sells for several times more.</dd>
      <dt>Scams</dt><dd>Never pay a seller directly. Never ship before you're paid. Nobody needs your PIN. If your item never arrives, or it's a brick, file a claim within 3 days of the delivery date (My orders).</dd></dl>`, ctx);
  }

  // ---- My Off-Hobby
  function my(ctx) {
    const tab = ctx.url.query.get('tab') || 'orders';
    const tabs = [['orders', 'Orders'], ['selling', 'Selling'], ['ship', 'To ship'], ['sell', 'Sell an item'], ['buyback', 'Instant buyback']].map(([id, t]) => (id === tab ? `<b>${t}</b>` : `<a href="/my?tab=${id}">${t}</a>`)).join(' | ');
    let body = '';
    if (tab === 'orders') {
      body = S.orders.length ? `<table class="oh-t"><tr><th>Item</th><th>Paid</th><th>Seller</th><th>Status</th><th></th></tr>${S.orders.slice(0, 20).map((o) => {
        const st = { paid: 'Paid, waiting to ship', shipped: `Shipped: arrives ${whenText(g, o.eta)}${o.fakeTrack ? ` (tracking ${o.fakeTrack})` : ''}`, delivered: 'Delivered', lost: 'Never arrived', refunded: 'Refunded' }[o.status] || o.status;
        const canClaim = !o.claimed && (o.status === 'lost' || (o.status === 'delivered' && o.scam) || (o.scam === 'noship' && stamp(g) > o.eta));
        return `<tr><td>${esc(o.title)}</td><td>${yen(o.price)}</td><td>${esc(o.sname)}</td><td>${esc(st)}</td><td>${canClaim ? `<button class="c98-btn small" data-claim="${o.id}">File a claim</button>` : ''}</td></tr>`;
      }).join('')}</table>` : '<p class="oh-empty">No orders yet.</p>';
    } else if (tab === 'selling') {
      const list = mk.mine();
      body = `<p>Your seller rating: ${mk.rating() ? `${stars(mk.rating())} (${S.rating.n})` : 'no ratings yet'} &middot; earned so far ${yen(S.stats.earned)}</p>` + (list.length ? `<table class="oh-t"><tr><th></th><th>Item</th><th>Price</th><th>Status</th><th></th></tr>${list.slice(0, 20).map((l) => {
        const st = l.status === 'live' ? (l.auction ? `Auction: ${l.bids.length ? `${yen(l.bid)} (${l.bids.length} bids)` : 'no bids'}, ends ${whenText(g, l.ends)}` : `Live &middot; ${l.views} views`) : l.status === 'sold' ? `<b class="oh-ok">SOLD</b> to ${esc(l.buyer)}: pack it!` : l.status === 'shipped' ? 'Shipped: payout soon' : l.status === 'done' ? `Done: ${yen(Math.round(l.sold * 0.9))} paid` : esc(l.status);
        return `<tr><td>${descPhoto(l.item)}</td><td>${esc(l.title)}${l.text ? `<br><small class="c98-dim">${esc(l.text.slice(0, 60))}</small>` : ''}</td><td>${yen(l.auction ? l.start : l.price)}${l.auction ? '<br><small>start</small>' : ''}</td><td>${st}</td><td>${['live', 'sold'].includes(l.status) ? `<button class="c98-btn small" data-cancel="${l.id}">${l.status === 'sold' ? 'Cancel sale' : 'Remove'}</button>` : ''}</td></tr>`;
      }).join('')}</table>` : '<p class="oh-empty">You are not selling anything. <a href="/my?tab=sell">Sell an item</a></p>');
    } else if (tab === 'ship') {
      const list = (S.ship || []).filter((s) => ['topack', 'packed', 'shipped'].includes(s.status));
      body = `<p>${ic('os_info', 1)} Hold the item and click the <b>OUTGOING</b> crate by your shutter. Gen-san collects packed parcels on his next visit. Shipping boxes left: <b>${S.shipBoxes}</b> (<a href="http://www.daikoku-toys.co.jp/supplies">order more</a>).</p>` + (list.length ? `<table class="oh-t"><tr><th></th><th>Item</th><th>To</th><th>Status</th></tr>${list.map((s) => `<tr><td>${descPhoto(s.item)}</td><td>${esc(descTitle(s.item))}</td><td>${esc(s.buyer)}</td><td>${s.status === 'topack' ? `<b class="oh-why">Pack it</b> (by ${esc(whenText(g, s.due))})` : s.status === 'packed' ? 'In the crate: waiting for Gen-san' : 'With Gen-san'}</td></tr>`).join('')}</table>` : '<p class="oh-empty">Nothing to ship.</p>');
    } else if (tab === 'sell') {
      const lock = g.progress && !g.progress.unlocked('market:sell');
      const own = mk.owned();
      body = lock ? `<p class="oh-empty">${ic('os_lock', 2)} Selling opens at shop level ${g.progress.levelFor('market:sell')}. Until then, try the <a href="/my?tab=buyback">instant buyback</a>.</p>`
        : own.length ? `<p>Pick something to sell. Figures in your storage bin, on your shelves and stands, or in your hands all count.</p><table class="oh-t"><tr><th></th><th>Item</th><th>Where</th><th>Collectors pay about</th><th></th></tr>${own.slice(0, 30).map((e, i) => `<tr><td>${descPhoto(e.desc)}</td><td>${esc(descTitle(e.desc))}${e.n > 1 ? ` x${e.n}` : ''}</td><td><small>${esc(e.where.join(', '))}</small></td><td>${yen(mk.suggest(e.desc).market)}</td><td><a class="c98-btn small" href="/sell?i=${i}">Sell</a></td></tr>`).join('')}</table>`
          : '<p class="oh-empty">You have no figures to sell yet. Pull some capsules first!</p>';
    } else if (tab === 'buyback') {
      const st = Object.entries(g.state.storage || {}).filter(([k, c]) => c > 0 && getItem(k.split('|')[0]));
      const total = st.reduce((a, [k, c]) => { const [key, f] = k.split('|'); return a + itemValue(key, f) * c; }, 0);
      body = `<p>Need money now? The <b>Off-Hobby Buyback Counter</b> pays the dealer price for figures in your storage bin, straight to your bank. (Selling to collectors pays more, but takes longer.)</p>
        <p><button class="c98-btn def" data-bb="all"${st.length ? '' : ' disabled'}>Sell all stored (${yen(total)})</button> <button class="c98-btn" data-bb="dupes">Sell duplicates on display</button></p>
        ${st.length ? `<table class="oh-t"><tr><th>Figure</th><th>Each</th><th>Have</th><th></th></tr>${st.map(([k, c]) => { const [key, f] = k.split('|'); return `<tr><td>${esc(getItem(key)?.name || key)}${f !== 'normal' ? ` <small>(${esc(FINISHES[f]?.name || f)})</small>` : ''}</td><td>${yen(itemValue(key, f))}</td><td>${c}</td><td><button class="c98-btn small" data-bb1="${esc(k)}">Sell 1</button></td></tr>`; }).join('')}</table>` : '<p class="oh-empty">Your storage bin is empty.</p>'}`;
    }
    ctx.title('My Off-Hobby');
    return chrome(`<h2>My Off-Hobby</h2><p class="oh-tabs">${tabs}</p>${body}`, ctx);
  }
  function sellForm(ctx) {
    const own = mk.owned(), e = own[+ctx.url.query.get('i')];
    if (!e) return chrome('<p class="oh-empty">That item is no longer available. <a href="/my?tab=sell">Back</a></p>', ctx);
    const sg = mk.suggest(e.desc);
    const canAuc = !g.progress || g.progress.unlocked('market:auction');
    ctx.title('Sell an item - Off-Hobby');
    return chrome(`<h2>Sell: ${esc(descTitle(e.desc))}</h2><div class="oh-sell">${descPhoto(e.desc)}<form class="oh-sf">
      <p>Dealer price ${yen(sg.dealer)} &middot; collectors usually pay about <b>${yen(sg.market)}</b>.</p>
      <p>Your price: ¥<input class="c98-field" name="price" type="number" min="10" step="10" value="${sg.steps[1]?.price || sg.market}"> ${sg.steps.map((s) => `<button class="c98-btn small" type="button" data-step="${s.price}">x${s.m}</button>`).join(' ')}</p>
      <p class="c98-dim">The x buttons are the same price tags as your shop's stands (multiples of the dealer price).</p>
      <p>Description:<br><textarea class="c98-field" name="text" rows="3" maxlength="200">${esc(e.desc.kind === 'slab' ? `Graded ${e.desc.score} by KGS. Mint slab.` : e.desc.kind === 'packaged' ? 'Sealed in its blister card. Never opened.' : 'From my gacha shop. Pulled it myself!')}</textarea></p>
      ${canAuc ? '<p><label><input type="checkbox" name="auc"> Sell by auction (your price is the starting bid), running for <select class="c98-field" name="days"><option value="1">1 day</option><option value="2">2 days</option><option value="3">3 days</option></select></label></p>' : ''}
      <p><button class="c98-btn def" type="submit">Post listing</button> <a href="/my?tab=sell">Cancel</a></p></form></div>`, ctx);
  }

  browser.registerSite({
    domain: 'off-hobby.jp', title: 'Off-Hobby - pre-loved toys, machines & oddities', keywords: 'off-hobby second hand used marketplace buy sell auction figures machines capsules charms clothes thrift junk',
    blurb: 'The second-hand marketplace for toys, gacha machines and oddities.',
    render(page, path, nav, ctx) {
      let html;
      const m = /^\/(c|item)\/(\w+)/.exec(path);
      if (m?.[1] === 'c') html = category(ctx, m[2]);
      else if (m?.[1] === 'item') html = itemPage(ctx, m[2]);
      else if (path.startsWith('/my')) html = my(ctx);
      else if (path.startsWith('/sell')) html = sellForm(ctx);
      else if (path.startsWith('/auctions')) html = auctions(ctx);
      else if (path.startsWith('/help')) html = help(ctx);
      else if (path.startsWith('/search')) html = search(ctx);
      else if (path === '/' || path === '/index.html') html = home(ctx);
      else { ctx.notFound(); return; }
      if (html === '') return;
      page.innerHTML = html;
      const stop = hydrate(page);
      const reload = () => ctx.nav(ctx.url.path + (ctx.url.search || ''));
      page.querySelector('.oh-search')?.addEventListener('submit', (e) => { e.preventDefault(); const q = e.target.q.value.trim(); if (q) nav(`/search?q=${encodeURIComponent(q)}`); });
      page.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-act], [data-claim], [data-cancel], [data-bb], [data-bb1], [data-step], [data-pichat]');
        if (!t) return;
        e.preventDefault(); e.stopPropagation();
        if (t.dataset.pichat) { os.open('messenger'); return; }
        if (t.dataset.step) { page.querySelector('input[name="price"]').value = t.dataset.step; return; }
        if (t.dataset.claim) { const r = mk.claim(t.dataset.claim); await os.alert(r.msg, 'Off-Hobby buyer protection', r.ok ? 'info' : 'warn'); reload(); return; }
        if (t.dataset.cancel) { const ok = await os.confirm('Remove this listing?', 'Off-Hobby'); if (!ok) return; const r = mk.cancel(t.dataset.cancel); if (!r.ok) os.alert(r.msg, 'Off-Hobby', 'warn'); reload(); return; }
        if (t.dataset.bb) { const r = t.dataset.bb === 'all' ? shop.sellAllStored(g) : shop.sellDisplayedDupes(g); os.alert(r.msg, 'Buyback counter', r.ok ? 'info' : 'warn'); reload(); return; }
        if (t.dataset.bb1) { const r = shop.sellStored(g, t.dataset.bb1, 1); os.sound(r.ok ? 'osCoin' : 'osError'); reload(); return; }
        const id = (/^\/item\/(\w+)/.exec(ctx.url.path) || [])[1];
        const l = id && mk.get(id);
        if (t.dataset.act === 'buy' && l) {
          if (!(await os.confirm(`Buy "${l.title}" for ${yen(l.price)}?\nPaid from your bank account.`, 'Off-Hobby'))) return;
          const r = mk.buy(l);
          os.sound(r.ok ? 'osCoin' : 'osError');
          await os.alert(r.msg, 'Off-Hobby', r.ok ? 'info' : 'warn');
          reload();
        }
        if (t.dataset.act === 'msg' && l) mk.chat.open(l.id);
      });
      page.querySelector('.oh-bid')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = (/^\/item\/(\w+)/.exec(ctx.url.path) || [])[1];
        const r = mk.bid(id, e.target.amt.value);
        os.sound(r.ok ? 'osCoin' : 'osError');
        await os.alert(r.msg, 'Off-Hobby auction', r.ok ? 'info' : 'warn');
        reload();
      });
      page.querySelector('.oh-sf')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target, own = mk.owned(), en = own[+ctx.url.query.get('i')];
        if (!en) return;
        const r = mk.list({ desc: en.desc, price: f.price.value, text: f.text.value, auction: !!f.auc?.checked, days: +(f.days?.value || 1) });
        os.sound(r.ok ? 'osSend' : 'osError');
        await os.alert(r.msg, 'Off-Hobby', r.ok ? 'info' : 'warn');
        if (r.ok) nav('/my?tab=selling');
      });
      return stop;
    },
  });

  // ================================================================== KGS: the grading service
  browser.registerSite({
    domain: 'kgs-grading.jp', title: 'KGS Kanto Grading Service', keywords: 'kgs grading grade slab psa figure mint authenticate',
    blurb: 'Professional grading for capsule figures. Every capsule tells the truth.',
    render(page, path, nav, ctx) {
      const lock = g.progress && !g.progress.unlocked('market:grading');
      const jobs = mk.grading?.jobs() || [];
      const own = (mk.owned?.() || []).filter((e) => e.desc.kind === 'toy');
      const tier = ctx.url.query.get('tier') || 'standard';
      const st = (j) => ({ topack: 'Pack it in your OUTGOING crate', packed: 'Waiting for the courier', grading: `Being graded: back ${mk.grading.whenBack(j)}`, returning: `Graded <b>${j.score ?? '-'}</b>: on its way back`, done: `Returned: <b>${j.score ?? 'not graded'}</b>` }[j.status] || j.status);
      page.innerHTML = `<div class="st-kgs"><div class="kg-head"><b>KGS</b><span>Kanto Grading Service<small>Every capsule tells the truth. Since 1994.</small></span></div>
        ${lock ? `<p class="oh-empty">${ic('os_lock', 2)} Submissions open to shops of level ${g.progress.levelFor('market:grading')} and up.</p>` : `
        <h2>Submit a figure</h2><p>Service: ${Object.entries(TIERS).map(([id, T]) => (id === tier ? `<b>${T.name} (${T.days} day${T.days > 1 ? 's' : ''}, ${yen(T.fee)})</b>` : `<a href="/?tier=${id}">${T.name} (${T.days}d, ${yen(T.fee)})</a>`)).join(' | ')}</p>
        ${own.length ? `<table class="kg-t"><tr><th></th><th>Figure</th><th>Where</th><th></th></tr>${own.slice(0, 20).map((e, i) => `<tr><td>${descPhoto(e.desc)}</td><td>${esc(descTitle(e.desc))}</td><td><small>${esc(e.where.join(', '))}</small></td><td><button class="c98-btn small" data-sub="${i}">Submit (${yen(TIERS[tier].fee)})</button></td></tr>`).join('')}</table>` : '<p class="oh-empty">No loose figures to send.</p>'}`}
        <h2>Your submissions</h2>${jobs.length ? `<table class="kg-t"><tr><th>Cert</th><th>Figure</th><th>Status</th></tr>${jobs.slice(0, 12).map((j) => `<tr><td>${esc(j.cert)}</td><td>${esc(getItem(j.item.key)?.name || '')}</td><td>${st(j)}</td></tr>`).join('')}</table>` : '<p class="c98-dim">None yet.</p>'}
        <h2>The KGS scale</h2><p class="kg-scale">${[10, 9.5, 9, 8.5, 8, 7, 5, 3, 1].map((s) => `<span><b>${s}</b> ${gradeWord(s)}</span>`).join('')}</p>
        <p class="c98-dim">Stickers, marker and crayon count as alterations (max 6). Factory misprints receive the ERROR label. We do not grade counterfeits.</p></div>`;
      const stop = hydrate(page);
      page.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-sub]');
        if (!b) return;
        e.preventDefault();
        const en = own[+b.dataset.sub];
        if (!en) return;
        if (!(await os.confirm(`Send ${descTitle(en.desc)} for ${TIERS[tier].name} grading (${yen(TIERS[tier].fee)})?`, 'KGS'))) return;
        const r = mk.grading.submit(en.desc, tier);
        os.sound(r.ok ? 'osCoin' : 'osError');
        await os.alert(r.msg, 'KGS', r.ok ? 'info' : 'warn');
        ctx.nav(ctx.url.path + (ctx.url.search || ''));
      });
      return stop;
    },
  });
}
export { itemTitle, today };
