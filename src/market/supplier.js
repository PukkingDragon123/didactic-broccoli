// Where new stock comes from now that GACHA-MART has closed its web store:
//   daikoku-toys.co.jp   Daikoku Toy Wholesale's order desk: new machines, capsule cartons and series licences,
//                        packing supplies (blister packs, acrylic stands, shipping boxes), capsule openers, wall
//                        shelves, shop goods and shrine charms. Express: Gen-san brings it within the hour.
//                        (Mr. Daikoku's bulk deals are still on Pichat, src/os/apps/content.js.)
//   museum-works.jp      Kura Museum Works: the museum licence and fittings (the old store's museum pages)
//   gacha-mart.co.jp     a "we have closed" notice pointing to the above (old links and bookmarks still land)
import { esc, ic } from '../os/apps/ui.js';
import { portrait } from '../os/art.js';
import { ShopUI } from '../ui/ShopUI.js';
import { SERIES } from '../data/series/index.js';
import { MACHINE_TYPES, MACHINE_ORDER, machinePrice, capsuleCost, licensePrice, licenseLevel, OPENERS, CHARMS, SHELF_PRICES } from '../game/economy.js';
import { GOODS } from '../game/goods.js';
import { SHELF_SLOTS } from '../world/Garage.js';
import * as shop from '../game/shop.js';
import { photo, photoReady, pumpPhotos, machineObject } from './models.js';
import { marketState, yen, whenText, stamp, bankBalance } from './util.js';
import { STYLES as POP_STYLES } from '../display/models.js';

const DK = 'http://www.daikoku-toys.co.jp';
const SUPPLIES = [
  { id: 'blister10', name: 'Blister packs x10', desc: 'Seal a figure in a card: it sells for more.', price: 250, packs: 10 },
  { id: 'blister30', name: 'Blister packs x30', desc: 'The shop roll.', price: 650, packs: 30 },
  { id: 'stands3', name: 'Acrylic display stands x3', desc: 'Show a figure anywhere, with a price tag.', price: 450, stands: 3 },
  { id: 'boxes10', name: 'Shipping boxes x10', desc: 'For parcels you send (Off-Hobby sales, grading).', price: 300, boxes: 10 },
  { id: 'boxes30', name: 'Shipping boxes x30', desc: 'A whole bale of flat-packed boxes.', price: 780, boxes: 30 },
];

export function installSupplier(g, mk) {
  const os = g.os, browser = os?.browser;
  if (!browser) return;
  const S = marketState(g);
  const lv = (id) => !g.progress || g.progress.unlocked(id);
  const lvl = (id) => g.progress?.levelFor(id) ?? 1;
  const thumbURLs = new Map();
  const itemThumb = (key) => { if (!thumbURLs.has(key)) { try { thumbURLs.set(key, g.thumbs.item(key, { size: 48 }).toDataURL()); } catch { thumbURLs.set(key, ''); } } return thumbURLs.get(key); };
  const mins = () => 30 + Math.random() * 25;
  const pay = (amt, why) => (g.sim?.payDigital ? g.sim.payDigital(amt, why) : g.spend(amt));
  /** Order something for express delivery: pay, queue it for the van. */
  function express(price, why, data) {
    if (!pay(price, `Daikoku Toys: ${why}`)) return { ok: false, msg: `Your bank declined the payment (${yen(price)})` };
    g.delivery.order({ from: 'Daikoku Toys', ...data }, { minutes: mins() });
    const eta = g.delivery.queue[g.delivery.queue.length - 1]?.eta ?? stamp(g) + 40;
    g.save();
    return { ok: true, msg: `Ordered! Gen-san brings it ${whenText(g, eta)}.` };
  }
  const pendingMachines = (type) => g.delivery.queue.filter((q) => q.data.type === 'install' && q.data.what === 'machine' && (!type || q.data.mtype === type)).length;
  const pendingShelves = () => g.delivery.queue.filter((q) => q.data.type === 'install' && q.data.what === 'shelf').length;
  const pending = (what, id) => g.delivery.queue.some((q) => q.data.type === 'install' && q.data.what === what && (q.data.id === id || q.data.tier === id));

  const ACTIONS = {
    machine(type) {
      if (!lv(`machine:${type}`)) return { ok: false, msg: `Reach shop level ${lvl(`machine:${type}`)} first` };
      if (mk.machineRoom() <= 0) return { ok: false, msg: 'No room for another machine at your shop level' };
      const owned = g.state.machines.filter((m) => m.type === type).length + pendingMachines(type);
      const T = MACHINE_TYPES[type];
      return express(machinePrice(type, owned), T.name, { type: 'install', what: 'machine', mtype: type, name: `a new ${T.name}`, used: type === 'retro', price: machinePrice(type, owned) });
    },
    refill(series, n) {
      if (!g.state.licenses.includes(series)) return { ok: false, msg: 'You need the distribution licence first' };
      const se = SERIES.find((s) => s.id === series);
      return express(capsuleCost(series) * n, `${se.name} x${n}`, { type: 'refill', series, count: n, stage: 0, label: `${se.name} x${n}` });
    },
    licence(series) { return shop.buyLicense(g, series); },
    supply(id) { const s = SUPPLIES.find((x) => x.id === id); return express(s.price, s.name, { type: 'install', what: 'supply', packs: s.packs, stands: s.stands, boxes: s.boxes, name: s.name }); },
    opener(tier) {
      if (g.state.opener >= tier || pending('opener', tier)) return { ok: false, msg: 'Already yours (or on its way)' };
      if (tier > g.state.opener + 1) return { ok: false, msg: 'You need the previous model first' };
      if (!lv(`opener:${tier}`)) return { ok: false, msg: `Reach shop level ${lvl(`opener:${tier}`)} first` };
      return express(OPENERS[tier].price, OPENERS[tier].name, { type: 'install', what: 'opener', tier, name: OPENERS[tier].name });
    },
    shelf() {
      const n = g.state.shelves.length + pendingShelves();
      if (n >= SHELF_SLOTS.length) return { ok: false, msg: 'No wall space left' };
      if (!lv(`shelf:${n + 1}`)) return { ok: false, msg: `Reach shop level ${lvl(`shelf:${n + 1}`)} first` };
      return express(SHELF_PRICES[n], 'Wall collection shelf', { type: 'install', what: 'shelf', name: 'a wall shelf' });
    },
    goods(id) {
      const d = GOODS[id];
      if (g.state.goods?.[id] || pending('goods', id)) return { ok: false, msg: 'Already yours (or on its way)' };
      if (!lv(`goods:${id}`)) return { ok: false, msg: `Reach shop level ${lvl(`goods:${id}`)} first` };
      if (d.museum && !g.museum?.data?.owned) return { ok: false, msg: 'For museums only' };
      return express(d.price, d.name, { type: 'install', what: 'goods', id, name: d.name });
    },
    // a machine-top POP display (src/display/): comes in its box, you fit it on a machine yourself
    poptop(style) {
      const P = POP_STYLES[style];
      if (!P) return { ok: false, msg: 'Sold out' };
      return express(P.price, P.name, { type: 'poptop', style, label: P.name, name: P.name });
    },
    charm(id) {
      if (g.state.charms.includes(id) || pending('charm', id)) return { ok: false, msg: 'Already on your shrine shelf (or on its way)' };
      if (!lv(`charm:${id}`)) return { ok: false, msg: `Reach shop level ${lvl(`charm:${id}`)} first` };
      return express(CHARMS[id].price, CHARMS[id].name, { type: 'install', what: 'charm', id, name: CHARMS[id].name });
    },
  };

  const row = (cells, act, label, why = null) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}<td>${why ? `<span class="dk-lock">${ic('os_lock', 1)} ${esc(why)}</span>` : `<button class="c98-btn small" data-act="${esc(act)}">${esc(label)}</button>`}</td></tr>`;
  const head = (path) => `<div class="dk-head">${portrait({ bg: 0xffd23f, hair: 'bald', glasses: 0x2a2220, mouth: 'grin', shirt: 0x2a5aa8 }, 2)}<div><b>Daikoku Toy Wholesale</b><small>Capsule toys by the box since 1971 - Asakusabashi, Tokyo</small></div></div>
    <div class="dk-nav">${[['/', 'Order desk'], ['/machines', 'Machines'], ['/capsules', 'Capsules'], ['/supplies', 'Supplies & tools'], ['/fittings', 'Shelves, displays & charms']].map(([p, t]) => `<a href="${p}" class="${path === p ? 'on' : ''}">${t}</a>`).join('')}<span>${ic('os_bank', 1)} ${yen(bankBalance(g))}</span></div>`;

  function pageFor(path) {
    if (path === '/machines') {
      const room = mk.machineRoom();
      return `<h2>Gacha machines</h2><p>New machines, delivered and set up in your garage by our courier. ${room > 0 ? `Room for ${room} more at your shop level.` : '<b>Your garage is full at this shop level.</b>'} Want something cheaper with character? Try <a href="http://www.off-hobby.jp/c/machines">Off-Hobby</a>.</p>
        <table class="dk-t2"><tr><th></th><th>Machine</th><th>Holds</th><th>Price</th><th></th></tr>${MACHINE_ORDER.map((t) => {
          const T = MACHINE_TYPES[t], owned = g.state.machines.filter((m) => m.type === t).length + pendingMachines(t), price = machinePrice(t, owned);
          const u = photo(g, `dk|${t}`, () => machineObject(t, null), { size: 96, bg: 'studio' });
          return row([`<img class="oh-ph" data-ph="dk|${t}" width="48" height="48"${u ? ` src="${u}"` : ''}>`, `<b>${esc(T.name)}</b>${t === 'retro' ? ' (refurbished)' : ''}<br><small>${esc(T.desc)}</small>`, T.baseCap, yen(price)], `machine:${t}`, 'Order', !lv(`machine:${t}`) ? `Level ${lvl(`machine:${t}`)}` : room <= 0 ? 'No room' : null);
        }).join('')}</table>`;
    }
    if (path === '/capsules') {
      return `<h2>Capsule cartons</h2><p>Sealed cartons of capsules for your machines, per series. A distribution licence is needed once per series. Prices per capsule.</p>
        <table class="dk-t2"><tr><th></th><th>Series</th><th>Per capsule</th><th colspan="3">Order</th></tr>${SERIES.filter((s) => !s.hidden).map((se) => {
          const lic = g.state.licenses.includes(se.id), cc = capsuleCost(se.id), u = itemThumb(se.items[0].key);
          const locked = !lic && g.progress && !g.progress.unlocked(`series:${se.id}`);
          const btns = lic ? [10, 25, 50].map((n) => `<td><button class="c98-btn small" data-act="refill:${se.id}:${n}">x${n} ${yen(cc * n)}</button></td>`).join('')
            : locked ? `<td colspan="3"><span class="dk-lock">${ic('os_lock', 1)} Licence at level ${licenseLevel(se.id)}</span></td>`
              : `<td colspan="3"><button class="c98-btn small" data-act="licence:${se.id}">Get licence ${licensePrice(se.id) ? yen(licensePrice(se.id)) : '(free)'}</button></td>`;
          return `<tr><td>${u ? `<img class="oh-ph" src="${u}" width="32" height="32">` : ''}</td><td><b>${esc(se.name)}</b><br><small>${yen(se.price)} a pull</small></td><td>${yen(cc)}</td>${btns}</tr>`;
        }).join('')}</table>`;
    }
    if (path === '/supplies') {
      const P = g.packing?.state;
      return `<h2>Packing supplies</h2><p>In stock now: ${P ? `${P.packs} blister packs, ${P.stands} acrylic stands, ` : ''}${S.shipBoxes} shipping boxes.</p>
        <table class="dk-t2"><tr><th>Item</th><th>Price</th><th></th></tr>${SUPPLIES.map((s) => row([`<b>${esc(s.name)}</b><br><small>${esc(s.desc)}</small>`, yen(s.price)], `supply:${s.id}`, 'Order')).join('')}</table>
        <h2>Capsule openers</h2><table class="dk-t2"><tr><th>Tool</th><th>Price</th><th></th></tr>${OPENERS.map((o, i) => (i === 0 ? '' : row([`<b>${esc(o.name)}</b><br><small>${esc(o.desc)} Opens in ${o.time}s.</small>`, yen(o.price)], `opener:${i}`, g.state.opener >= i ? 'Owned' : 'Order', g.state.opener >= i ? 'Owned' : !lv(`opener:${i}`) ? `Level ${lvl(`opener:${i}`)}` : g.state.opener < i - 1 ? `Needs the ${OPENERS[i - 1].name}` : null))).join('')}</table>`;
    }
    if (path === '/fittings') {
      const n = g.state.shelves.length + pendingShelves();
      return `<h2>Wall shelves</h2><table class="dk-t2"><tr><th>Item</th><th>Price</th><th></th></tr>${n < SHELF_SLOTS.length ? row([`<b>Wall collection shelf</b> (${g.state.shelves.length} of ${SHELF_SLOTS.length} up)<br><small>48 spots with lights, put up by our courier.</small>`, yen(SHELF_PRICES[n])], 'shelf', 'Order', !lv(`shelf:${n + 1}`) ? `Level ${lvl(`shelf:${n + 1}`)}` : null) : '<tr><td colspan="3">Your wall is full.</td></tr>'}</table>
        <h2>Machine-top displays</h2><p class="c98-dim">Real shops show the samples on top of the machine. Fit one on a machine's lid and fill it with that series' figures: customers notice.</p><table class="dk-t2"><tr><th>Display</th><th>Price</th><th></th></tr>${Object.entries(POP_STYLES).map(([id, P]) => row([`<b>${esc(P.name)}</b> <small>${esc(P.jp)}</small><br><small>${esc(P.desc)}</small>`, yen(P.price)], `poptop:${id}`, 'Order')).join('')}</table>
        <h2>Shop goods</h2><table class="dk-t2"><tr><th>Item</th><th>Price</th><th></th></tr>${Object.entries(GOODS).map(([id, d]) => row([`<b>${esc(d.name)}</b><br><small>${esc(d.desc)}</small>`, yen(d.price)], `goods:${id}`, 'Order', g.state.goods?.[id] ? 'Installed' : !lv(`goods:${id}`) ? `Level ${lvl(`goods:${id}`)}` : d.museum && !g.museum?.data?.owned ? 'Museum only' : null)).join('')}</table>
        <h2>Shrine charms (new)</h2><p class="c98-dim">For the little shrine shelf in your garage. Second-hand charms of every kind are on <a href="http://www.off-hobby.jp/c/charms">Off-Hobby</a>.</p><table class="dk-t2"><tr><th>Charm</th><th>Price</th><th></th></tr>${Object.entries(CHARMS).map(([id, c]) => row([`<b>${esc(c.name)}</b><br><small>${esc(c.desc)}</small>`, yen(c.price)], `charm:${id}`, 'Order', g.state.charms.includes(id) ? 'On your shelf' : !lv(`charm:${id}`) ? `Level ${lvl(`charm:${id}`)}` : null)).join('')}</table>`;
    }
    return `<p class="dk-note">${ic('os_info', 1)} <b>Express delivery:</b> order before 8pm and our courier Gen-san brings it the same day, usually within the hour. (Yes, his van says FREE CANDY.)</p>
      <p>We supply capsule toy shops all over Kanto: brand-new machines, sealed capsule cartons and everything a shop needs.</p>
      <ul><li><a href="/machines">Gacha machines</a> - Showa Retro, Gacha Station, Deluxe 500, Royal Kirakira</li><li><a href="/capsules">Capsule cartons and series licences</a></li><li><a href="/supplies">Packing supplies and capsule openers</a></li><li><a href="/fittings">Wall shelves, machine-top displays, shop goods and shrine charms</a></li></ul>
      <p><b>Bulk deals:</b> our sales manager Mr. Daikoku sends weekly offers on Pichat (<a data-act="pichat" href="#">daikoku_toys</a>, tel. 03-3866-1971). Haggle with him. He respects it.</p>
      <p class="c98-dim">Daikoku Toy Wholesale is not responsible for capsules opened by cats.</p>`;
  }

  browser.registerSite({
    domain: 'daikoku-toys.co.jp', title: 'Daikoku Toy Wholesale - Order Desk', keywords: 'wholesale supplier capsules bulk toys daikoku machines licence refill supplies blister stands shipping boxes shelves charms opener',
    blurb: 'New machines, capsule cartons and shop supplies. Express delivery.',
    render(page, path, nav, ctx) {
      if (!['/', '/index.html', '/machines', '/capsules', '/supplies', '/fittings'].includes(path)) { ctx.notFound(); return; }
      page.innerHTML = `<div class="st-dk2">${head(path === '/index.html' ? '/' : path)}${pageFor(path)}</div>`;
      let raf = 0;
      const pump = () => { if (!page.isConnected) return; pumpPhotos(6); let left = 0; for (const el of page.querySelectorAll('img[data-ph]:not([src])')) { const u = photoReady(el.dataset.ph); if (u) el.src = u; else left++; } if (left) raf = requestAnimationFrame(pump); };
      raf = requestAnimationFrame(pump);
      page.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        e.preventDefault(); e.stopPropagation();
        const [act, a, c] = b.dataset.act.split(':');
        if (act === 'pichat') { os.open('messenger', { thread: 'daikoku' }); return; }
        const fn = ACTIONS[act];
        if (!fn) return;
        const r = act === 'refill' ? fn(a, +c) : act === 'opener' ? fn(+a) : fn(a);
        os.sound(r.ok ? 'osCoin' : 'osError');
        await os.alert(r.msg || (r.ok ? 'Done!' : 'Sorry, that did not work.'), 'Daikoku Toys', r.ok ? 'info' : 'warn');
        ctx.nav(path);
      });
      return () => cancelAnimationFrame(raf);
    },
  });

  // ---- the museum fittings (the old store's museum pages, now their own little site)
  browser.registerSite({
    domain: 'museum-works.jp', title: 'Kura Museum Works', keywords: 'museum fittings display cases decor sheets expansion licence warehouse exhibition collection',
    blurb: 'Exhibition fittings for small museums: cases, decor, sheets, expansions.',
    render(page, path, nav, ctx) {
      ctx.full(true);
      const p = path.replace(/^\/|\/$/g, '') || 'museum';
      const ui = ShopUI.embed(g, page, {
        page: p, pages: ['museum', 'book'],
        brand: { name: 'KURA MUSEUM WORKS', slogan: 'Fittings for small museums.<br>Delivered to your garage!', icon: 'museum', marquee: 'Display cases   *   Mini decos   *   Theme sheets   *   Expansions   *   Your collection book   *   Ask about our museum licence!   *' },
        onNav: (pg) => ctx.replace(pg === 'museum' ? '/' : `/${pg}/`),
        onStatus: (s) => ctx.status(s),
      });
      browser.storePage = () => ui.page;
      return () => { ui.destroy(); browser.storePage = () => null; };
    },
  });

  // ---- GACHA-MART: closed
  browser.registerSite({
    domain: 'gacha-mart.co.jp', title: 'GACHA-MART - Thank you!', keywords: 'gacha-mart closed store moved',
    render(page, path) {
      const p = path.replace(/^\/|\/$/g, '');
      const hint = { machines: 'machines', capsules: 'capsules', goods: 'supplies', used: 'off-hobby', sell: 'off-hobby', museum: 'museum', book: 'museum' }[p] || '';
      page.innerHTML = `<div class="st-gm"><h1>GACHA-MART</h1><h2>Our web store has closed. Thank you for 25 years!</h2>
        <p>Dear shop owners, after a quarter of a century we have closed the GACHA-MART web store. Our friends will look after you:</p>
        <ul><li>${hint === 'machines' || hint === 'capsules' || hint === 'supplies' ? '<b>' : ''}<a href="${DK}/${hint === 'machines' ? 'machines' : hint === 'capsules' ? 'capsules' : hint === 'supplies' ? 'supplies' : ''}">Daikoku Toy Wholesale</a>${hint && hint !== 'off-hobby' && hint !== 'museum' ? '</b>' : ''}: new machines, capsule cartons and licences, supplies. Express delivery.</li>
          <li>${hint === 'off-hobby' ? '<b>' : ''}<a href="http://www.off-hobby.jp/">Off-Hobby</a>${hint === 'off-hobby' ? '</b>' : ''}: used machines, figures, charms and oddities. Sell your duplicates there too.</li>
          <li>${hint === 'museum' ? '<b>' : ''}<a href="http://www.museum-works.jp/">Kura Museum Works</a>${hint === 'museum' ? '</b>' : ''}: museum licences and fittings, and your collection book.</li></ul>
        <p class="c98-dim">GACHA-MART Co., Ltd. 1974-1999. Keep turning those handles!</p></div>`;
    },
  });
}
