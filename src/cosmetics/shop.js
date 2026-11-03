// Kirakira Closet (kirakira-closet.jp): the fashion mail-order site in Capsule Navigator. New clothes and accessories
// that the closet doesn't stock (big photo-print tees, kigurumi, glasses, bags, shoes...), paid from the bank and
// brought by Gen-san's van like any parcel: open it, take the folded piece out and click to put it on.
// Rewards (achievements, quests, capsule bonuses) are never sold; the page says where they come from instead.
//   installWebShop(game)
import './shop.css';
import { esc, ic } from '../os/apps/ui.js';
import { COSMETICS, COSMETIC_BY_ID } from '../people/cosmetics.js';
import { RARITIES } from '../data/rarity.js';
import { ensureState } from '../game/stateExt.js';
import { cosmeticThumb } from './thumbs.js';
import { hasPrint, printOf, loadPrint } from './prints.js';
import { RARITY_RANK } from './catalog.js';
import { defineIcon } from '../gfx/icons.js';

const KK = 'http://www.kirakira-closet.jp';
const yen = (n) => '¥' + Math.round(n).toLocaleString('en-US');
const CATS = [
  { id: 'new', name: 'New in', test: (c) => c.photoTee },
  { id: 'outfit', name: 'Outfits', test: (c) => c.slot === 'outfit' && !c.photoTee },
  { id: 'hat', name: 'Hats', test: (c) => c.slot === 'hat' },
  { id: 'face', name: 'Glasses', test: (c) => c.slot === 'face' },
  { id: 'bag', name: 'Bags', test: (c) => c.slot === 'bag' },
  { id: 'shoes', name: 'Shoes', test: (c) => c.slot === 'shoes' },
];
const FREE_SHIP = 2000, SHIP = 300;

defineIcon('os_kirakira', { rows: [
  '................',
  '.....KKKKKK.....',
  '....K......K....',
  '....K......K....',
  '..KKKKKKKKKKKK..',
  '.KPPPPPPPPPPPPK.',
  '.KPSSPPPPPPPPpK.',
  '.KPSPPPKKPPPPpK.',
  '.KPPPPKWWKPPPpK.',
  '.KPPPPKWWKPPPpK.',
  '.KPPPPPKKPPPPpK.',
  '.KPPPPPPPPPPPpK.',
  '.KPpppppppppppK.',
  '..KKKKKKKKKKKK..',
  '................',
  '................',
] });

export function installWebShop(game) {
  const g = game, os = g.os, browser = os?.browser;
  if (!browser) return;
  const S = ensureState(g, 'kirakira', { orders: [] });
  const owns = (id) => (g.state.avatar?.owned || []).includes(id);
  const pending = (id) => S.orders.find((o) => o.id === id && !owns(id) && !o.done);
  const stock = () => COSMETICS.filter((c) => c.web);
  const stamp = () => g.clock?.stamp ?? 0;
  const dayName = (st) => { const d = Math.floor(st / 1440) + 1; return d <= (g.clock?.day ?? 1) ? 'today' : d === (g.clock?.day ?? 1) + 1 ? 'tomorrow' : g.calendar?.format?.(d, true) || `day ${d}`; };

  // bookmark + desktop shortcut
  const bm = os.st.web?.bookmarks;
  if (bm && !bm.some(([, u]) => u.includes('kirakira-closet'))) bm.push(['Kirakira Closet', `${KK}/`]);
  os.registerApp?.({ id: 'kirakira', name: 'Kirakira Closet', label: 'Kirakira', icon: 'os_kirakira', group: 'Internet', about: `Shortcut to ${KK}/ - fashion by mail order.`, open: () => {} });
  const open0 = os.open.bind(os);
  os.open = (id, args = {}) => (id === 'kirakira' ? open0('browser', { url: `${KK}/` }) : open0(id, args));

  function card(c) {
    const R = RARITIES[c.rarity] || RARITIES.common, p = pending(c.id);
    const btn = owns(c.id) ? `<span class="kk-own">${ic('check', 1)} In your closet</span>`
      : p ? `<span class="kk-way">On its way: ${esc(dayName(p.eta))}</span>`
        : `<button class="c98-btn def kk-buy" data-buy="${c.id}">Order ${yen(c.price)}</button>`;
    return `<div class="kk-card" style="--rc:${R.color}"><div class="kk-pic"><img data-cx="${c.id}" alt="" width="128" height="128"></div>
      <b>${esc(c.name)}</b><span class="kk-rar">${esc(R.name)}</span><small>${esc(c.desc)}</small>${btn}</div>`;
  }

  function page(cat) {
    const C = CATS.find((x) => x.id === cat) || CATS[0];
    const items = stock().filter(C.test).sort((a, b) => (RARITY_RANK[a.rarity] ?? 0) - (RARITY_RANK[b.rarity] ?? 0) || a.price - b.price);
    return `<h2>${esc(C.name)}</h2>${cat === 'new' ? '<p class="kk-blurb">Photo prints, pixel-stitched in Koenji from real snapshots. Big prints, small runs.</p>' : ''}
      <div class="kk-grid">${items.map(card).join('') || '<p>Sold out! Check back next season.</p>'}</div>`;
  }

  function orders() {
    const list = S.orders.slice(0, 20);
    return `<h2>My orders</h2>${list.length ? `<table class="kk-t"><tr><th>Item</th><th>Ordered</th><th>Status</th></tr>${list.map((o) => {
      const c = COSMETIC_BY_ID[o.id];
      const st = owns(o.id) ? 'In your closet' : o.eta <= stamp() ? 'Delivered: open the parcel' : `Arrives ${dayName(o.eta)}`;
      return `<tr><td>${esc(c?.name || o.id)}</td><td>${esc(dayName(o.placed))}</td><td>${esc(st)}</td></tr>`;
    }).join('')}</table>` : '<p>No orders yet.</p>'}`;
  }

  async function buy(id, reload) {
    const c = COSMETIC_BY_ID[id];
    if (!c || owns(id) || pending(id)) return;
    const ship = c.price >= FREE_SHIP ? 0 : SHIP, total = c.price + ship;
    if (!(await os.confirm(`Order the ${c.name} for ${yen(c.price)}${ship ? ` + ${yen(ship)} delivery` : ' (free delivery)'}?\nPaid from your bank account. Gen-san brings it tomorrow morning.`, 'Kirakira Closet'))) return;
    const paid = g.sim?.payDigital ? g.sim.payDigital(total, `Kirakira Closet: ${c.name}`) : g.spend(total);
    if (!paid) { os.sound('osError'); await os.alert(`Your bank says no: you need ${yen(total)}.`, 'Kirakira Closet', 'warn'); return; }
    const day = g.clock?.day ?? 1, eta = day * 1440 + 9 * 60 + Math.floor(Math.random() * 180);
    g.delivery.order({ type: 'parcel', size: 'S', from: 'Kirakira Closet', label: c.name, contents: [{ kind: 'mkt', d: { t: 'garment', cid: id } }] }, { eta });
    S.orders.unshift({ id, eta, placed: stamp() });
    if (S.orders.length > 40) S.orders.length = 40;
    if (hasPrint(id)) loadPrint(id);
    g.events.emit('webOrder', { site: 'kirakira', id, price: total });
    g.save?.();
    os.sound('osCoin');
    await os.alert(`Thank you for your order!\n${c.name} will arrive ${dayName(eta)} with Lane Express.`, 'Kirakira Closet');
    reload();
  }

  browser.registerSite({
    domain: 'kirakira-closet.jp', title: 'Kirakira Closet - fashion by mail order', keywords: 'kirakira closet fashion clothes tee shirt photo print hat glasses mask shoes bag kigurumi onesie harajuku shop',
    blurb: 'Harajuku fashion by mail order: photo-print tees, kigurumi, hats, glasses, bags and shoes.',
    render(pg, path, nav, ctx) {
      const cat = ctx.url.query?.get?.('c') || 'new';
      const body = path.startsWith('/orders') ? orders() : page(cat);
      pg.innerHTML = `<div class="kk">
        <div class="kk-top"><div class="kk-logo"><span>KIRAKIRA</span><i>CLOSET</i></div><small>Harajuku fashion by mail order. Est. 1996.</small></div>
        <div class="kk-nav">${CATS.map((c) => `<a href="/?c=${c.id}"${!path.startsWith('/orders') && c.id === cat ? ' class="on"' : ''}>${esc(c.name)}</a>`).join('')}<a href="/orders"${path.startsWith('/orders') ? ' class="on"' : ''}>My orders</a></div>
        <div class="kk-strip">Free delivery on orders over ${yen(FREE_SHIP)}! Brought to your door by Lane Express.</div>
        <div class="kk-body">${body}</div>
        <div class="kk-foot">Kirakira Closet K.K. · Harajuku 1-chome · Tel 03-0000-0000 · Best viewed in Capsule Navigator at 640x480</div></div>`;
      pg.addEventListener('click', (e) => {
        const b = e.target.closest('[data-buy]');
        if (!b) return;
        e.preventDefault(); e.stopPropagation();
        buy(b.dataset.buy, () => ctx.nav(ctx.url.path + (ctx.url.search || '')));
      });
      // product photos, one per frame (outfits are rendered on your own look)
      let live = true;
      const imgs = [...pg.querySelectorAll('img[data-cx]')];
      const pump = () => {
        if (!live || !pg.isConnected) return;
        const img = imgs.find((i) => !i.src && !i.dataset.wait);
        if (!img) return;
        const id = img.dataset.cx;
        if (hasPrint(id) && !printOf(id)) { img.dataset.wait = '1'; loadPrint(id).then(() => { delete img.dataset.wait; requestAnimationFrame(pump); }); requestAnimationFrame(pump); return; }
        const u = cosmeticThumb(g, id, { size: 128 });
        if (u) img.src = u; else img.dataset.wait = '1';
        requestAnimationFrame(pump);
      };
      requestAnimationFrame(pump);
      return () => { live = false; };
    },
  });
  // delivered (worn) orders drop off the "on its way" list
  g.events.on('avatar', () => { for (const o of S.orders) if (owns(o.id)) o.done = true; });
}
