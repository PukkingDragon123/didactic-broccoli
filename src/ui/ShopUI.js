// ShopUI: the DOM shop overlays.
//   'emart'  — GACHA-MART, the capsule-toy web store on the garage PC (old browser window, big clear cards)
//   'corner' — MIKAWA-YA, the little general store across the lane (wooden menu board, paper price tags)
// open(store, page) / close(). While open the pointer is released and game.uiOpen is true, so main.js
// must not treat that unlock as "pause". Every purchase goes through shop.js / goods / museum and returns {ok, msg}.
import './shopui.css';
import { iconHTML } from '../gfx/icons.js';
import { audio } from '../core/audio.js';
import { SERIES, SERIES_BY_ID, ITEMS, getItem, MINI_SERIES } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { FINISHES } from '../data/finishes.js';
import {
  MACHINE_TYPES, MACHINE_ORDER, MAX_MACHINES, machinePrice, UPGRADES, upgradeCost, capsuleCost, licensePrice,
  licenseRequirement, OPENERS, CHARMS, SHELF_PRICES, singlePrice, itemValue, crankTime,
  MUSEUM_PRICE, MUSEUM_REQ_COMPLETE, MUSEUM_EXPANSIONS,
} from '../game/economy.js';
import * as shop from '../game/shop.js';
import { GOODS } from '../game/goods.js';
import { buildMachineModel } from '../world/machineModels.js';
import { bannerTexture, bannerCanvas } from '../gfx/banner.js';
import { propMesh } from '../world/props.js';
import { DISPLAYS, decorList, THEME_NAMES } from '../museum/catalog.js';
import { DISPLAY_STYLES, STYLE_ORDER, styleTile } from '../museum/styles.js';
import { SHELF_SLOTS } from '../world/Garage.js';
import { SUPPLIES } from '../data/supplies.js';
import { TOOLS } from '../data/tools.js';

// ------------------------------------------------------------------ helpers
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape for HTML, and keep to glyphs the pixel fonts have (no macrons, em dashes...). */
const esc = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[—–]/g, '-').replace(/…/g, '...').replace(/[&<>"']/g, (c) => ESC[c]);
const yen = (n) => '¥' + Math.max(0, Math.floor(n)).toLocaleString('en-US');
const ic = (name, scale = 1, cls = '') => iconHTML(name, scale, cls);
const CJK = /[　-ヿ㐀-鿿＀-￯]/;
/** English part of a result message ("JP · EN" or plain), else the fallback. */
function enMsg(msg, fallback = '') {
  const en = String(msg || '').split(' · ').find((p) => p.trim() && !CJK.test(p));
  return en || fallback;
}
const themeName = (t) => THEME_NAMES[t]?.[1] || t;
/** Scroll `box` just enough to show `el` (scrollIntoView would also scroll the page behind). */
function reveal(box, el) {
  const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
  if (r.top < b.top) box.scrollTop -= b.top - r.top + 6; else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 6;
  if (r.left < b.left) box.scrollLeft -= b.left - r.left + 6; else if (r.right > b.right) box.scrollLeft += r.right - b.right + 6;
}
const rarityOf = (it) => RARITIES[it.rarity] || RARITIES.common;

const PAGES = [
  { id: 'home', label: 'Home', icon: 'home', tip: 'Welcome! Everything you order is delivered to the garage shutter.' },
  { id: 'machines', label: 'Machines', icon: 'machine', tip: 'New machines are installed right away and come half full.' },
  { id: 'capsules', label: 'Capsules', icon: 'capsule', tip: 'Carry a refill box to a machine and click to pour the capsules in.' },
  { id: 'upgrades', label: 'Upgrades', icon: 'upgrade', tip: 'Upgrades are fitted to your machine instantly.' },
  { id: 'goods', label: 'Goods & Tools', icon: 'wrench', tip: 'Shop goods, capsule openers, lucky charms and shelves.' },
  { id: 'museum', label: 'Museum', icon: 'museum', tip: 'Turn the empty warehouse behind the garage into a museum.' },
  { id: 'used', label: 'Used Figures', icon: 'figure', tip: 'Missing one figure? Buy it second-hand (premium prices).' },
  { id: 'sell', label: 'Sell', icon: 'sell', tip: 'Sell figures from your storage bin, or the duplicates on display.' },
  { id: 'book', label: 'Collection', icon: 'book', tip: 'Every figure you have discovered, series by series.' },
];
const PAGE_BY_ID = Object.fromEntries(PAGES.map((p) => [p.id, p]));
const OLD_PAGES = { top: 'home', refill: 'capsules', upgrade: 'upgrades', tools: 'goods' }; // canvas-site names

const GOODS_EN = {
  tip_jar: { desc: 'Museum visitors tip 1.5x more.', icon: 'coin' },
  furin: { desc: 'A cool summer chime. Makes the museum prettier.', icon: 'music' },
  capsule_bin: { desc: 'Earn ¥5 for every capsule you open.', icon: 'refill' },
  ticket_machine: { desc: 'Museum tickets sell for 20% more.', icon: 'ticket' },
  neon_open: { desc: 'A glowing OPEN sign: 15% more visitors.', icon: 'bulb' },
};
const UP_ICON = { speed: 'speed', cap: 'capacity', coins: 'coin' };
const MUSEUM_TABS = [['displays', 'Displays', 'display'], ['minis', 'Mini Decos', 'sparkle'], ['decor', 'Decor', 'deco'], ['sheets', 'Sheets', 'flag'], ['expand', 'Expand', 'map'], ['stats', 'Rating', 'star']];
const REVIEW = ['Nothing to see yet...', 'Kind of cute.', 'Pretty fun!', 'I want to come back!', 'I was moved!!', 'A legendary gacha museum...!'];

// ------------------------------------------------------------------ thumbnails (rendered on demand, cached as data URLs)
const URLS = new Map();
const BANNER_PICK = { retro: 'mochi', standard: 'konbini', deluxe: 'dajare', royal: 'omamori' };

function makeThumb(game, key) {
  const [kind, a, b, c, d] = key.split('|');
  const T = game.thumbs;
  if (kind === 'i') return T.item(a, { size: +b, silhouette: c === '1', finish: d || 'normal' });
  if (kind === 'b') return bannerCanvas(a, T);
  if (kind === 's') return styleTile(a).canvas;
  if (kind === 'm') {
    const { group } = buildMachineModel(a, { banner: bannerTexture(BANNER_PICK[a] || 'mochi', T, { faded: a === 'retro' }) });
    return T.renderObject(group, +b, { side: 0.6, up: 0.15 });
  }
  if (kind === 'p') return T.renderObject(propMesh(a), +b, { side: 0.6, up: 0.3 });
  if (kind === 'd') return T.renderObject(game.museum.displayPreview(a), +b, { side: 0.6, up: 0.35 });
  return null;
}

function thumb(key, w, h = w, cls = '') {
  const src = URLS.get(key);
  return `<img class="th ${cls}" data-th="${esc(key)}" width="${w}" height="${h}" alt="" draggable="false"${src ? ` src="${src}"` : ''}>`;
}
const itemTh = (key, { size = 48, px = 2, sil = false, finish = 'normal', cls = '' } = {}) => thumb(`i|${key}|${size}|${sil ? 1 : 0}|${finish}`, size * px, size * px, cls);

// ------------------------------------------------------------------ the overlay
export class ShopUI {
  constructor(game) {
    this.game = game;
    this.onClose = null;
    this.store = null;
    this.page = 'home';
    this.hist = [];
    this.sub = { used: null, museum: 'displays' };
    this.h = []; // click handlers of the current page (data-h index)
    this.queue = [];
    this._open = false;
    this._built = null;
    this.raf = 0;
    this.counter = 12345 + Math.floor(Math.random() * 400);

    const root = document.createElement('div');
    root.className = 'sui hidden';
    root.innerHTML = '<div class="sui-backdrop"></div><div class="sui-frame"></div><div class="sui-toasts" aria-live="polite"></div>';
    document.body.appendChild(root);
    this.root = root;
    this.frame = root.querySelector('.sui-frame');
    this.toasts = root.querySelector('.sui-toasts');

    // a click-to-continue catcher, in case the browser refuses to re-lock the pointer on close
    this.resumeEl = document.createElement('button');
    this.resumeEl.className = 'sui-resume hidden';
    this.resumeEl.innerHTML = `<span>${ic('play', 2)}Click to continue</span>`;
    this.resumeEl.addEventListener('click', () => { this.resumeEl.classList.add('hidden'); this.game.input.lock(); });
    document.body.appendChild(this.resumeEl);
    document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement) this.resumeEl.classList.add('hidden'); });

    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const b = e.target.closest('button');
      if (!b || b === this._hov || b.classList.contains('off')) return;
      this._hov = b;
      if (audio.canPlay('suiHover', 0.06)) audio.play('uiHover', { vol: 0.25 });
    });
    root.addEventListener('pointerout', (e) => { if (e.target.closest('button') === this._hov && !this._hov.contains(e.relatedTarget)) this._hov = null; });
    window.addEventListener('keydown', (e) => {
      if (!this._open) return;
      if (e.code === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.code === 'Backspace' && this.store === 'emart') { e.preventDefault(); this.back(); }
    });
  }

  get isOpen() { return this._open; }

  /** Open a store. opts: { delay (ms) before the window pops in, onClose (called once) }. */
  open(store = 'emart', page = null, opts = {}) {
    const g = this.game;
    if (this._open) {
      if (store === this.store) { if (page) this.go(page); return; }
      this.close(true);
    }
    this.store = store;
    this._opts = opts;
    this._open = true;
    g.uiOpen = true;
    clearTimeout(this._hideT);
    this.resumeEl.classList.add('hidden');
    document.body.classList.add('sui-on');
    g.interaction?.setHint?.(null);
    this.build(store);
    this.root.style.setProperty('--sui-delay', `${opts.delay || 0}ms`);
    this.root.classList.remove('hidden', 'closing');
    this.root.dataset.store = store;
    if (store === 'emart') { this.hist = []; this.go(page || 'home', { push: false, sound: false }); }
    else this.renderCorner();
    g.input.unlock();
    this.lastMoney = null;
    this.shownMoney = null;
    if (!this.raf) this.raf = requestAnimationFrame(() => this.pump());
    setTimeout(() => { try { audio.play(store === 'emart' ? 'uiBeep' : 'doorbell', { f: 1180, vol: 0.4 }); } catch { /* audio not ready */ } }, opts.delay || 0);
  }

  /** Close the store; re-locks the pointer unless `silent` (switching stores). */
  close(silent = false) {
    if (!this._open) return;
    const g = this.game;
    this._open = false;
    g.uiOpen = false;
    this.root.classList.add('closing');
    this._hideT = setTimeout(() => { this.root.classList.add('hidden'); this.root.classList.remove('closing'); }, 200);
    document.body.classList.remove('sui-on');
    const cb = this._opts?.onClose;
    this._opts = null;
    if (!silent) audio.play('uiClick', { vol: 0.5 });
    cb?.(this.store);
    this.onClose?.(this.store);
    if (!silent) this.relock();
  }

  relock() {
    const inp = this.game.input;
    if (inp.locked) return;
    inp.lock();
    if (inp.touch) return;
    clearTimeout(this._lockT);
    this._lockT = setTimeout(() => { if (!inp.locked && !this._open) this.resumeEl.classList.remove('hidden'); }, 450);
  }

  // ------------------------------------------------------------------ events
  onClick(e) {
    const t = e.target.closest('[data-h], [data-go], [data-act]');
    if (!t || !this.root.contains(t)) return;
    if (t.classList.contains('off')) {
      audio.play('error', { vol: 0.4 });
      const why = t.parentElement?.querySelector('.sui-why');
      if (why) { why.classList.remove('shake'); void why.offsetWidth; why.classList.add('shake'); }
      return;
    }
    if (t.dataset.go) { this.go(t.dataset.go, { sub: t.dataset.sub }); return; }
    if (t.dataset.act === 'close') { this.close(); return; }
    if (t.dataset.act === 'back') { this.back(); return; }
    // a double click must not buy twice: the page re-renders a fresh button under the cursor
    if (t.dataset.h && performance.now() - (this._ranAt || 0) > 350) { audio.play('uiClick', { vol: 0.45 }); this.h[+t.dataset.h]?.(t); }
  }

  on(fn) { this.h.push(fn); return this.h.length - 1; }

  /** Run a purchase/sale and report it. text: { ok, fail, title } overrides. */
  run(fn, text = {}) {
    let res;
    try { res = fn(); } catch (err) { console.error(err); res = { ok: false, msg: 'Something went wrong' }; }
    if (!res) return;
    if (res.ok) {
      audio.play('purchase', { vol: 0.8 });
      this.toast(true, text.title || 'Thank you!', text.ok || enMsg(res.msg, 'Done!'), text.icon);
    } else {
      audio.play('error', { vol: 0.6 });
      this.toast(false, 'Sorry!', enMsg(res.msg, text.fail || 'That did not work'));
    }
    if (this.store === 'emart') this.refresh(); else this.renderCorner(true);
    this.flashMoney();
    this._ranAt = performance.now();
  }

  toast(ok, title, msg, icon) {
    const el = document.createElement('div');
    el.className = `sui-toast ${ok ? 'ok' : 'bad'}`;
    el.innerHTML = `${ic(icon || (ok ? 'check' : 'warning'), 2)}<div><b>${esc(title)}</b><span>${esc(msg)}</span></div>`;
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ok ? 2600 : 3200);
  }

  flashMoney() {
    for (const el of this.root.querySelectorAll('.sui-wallet')) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  }

  // ------------------------------------------------------------------ per-frame: wallet, affordability, thumbnails
  pump() {
    if (!this._open) { this.raf = 0; return; }
    this.raf = requestAnimationFrame(() => this.pump());
    const g = this.game;
    const shown = Math.round(g.shownMoney ?? g.state.money);
    if (shown !== this.shownMoney) {
      this.shownMoney = shown;
      for (const v of this.root.querySelectorAll('[data-money]')) v.textContent = yen(shown);
    }
    if (g.state.money !== this.lastMoney) this.updateAfford();
    if (!this.queue.length) return;
    const t0 = performance.now();
    while (this.queue.length && performance.now() - t0 < 9) {
      const key = this.queue.shift();
      if (!URLS.has(key)) {
        let url = '';
        try { url = makeThumb(g, key)?.toDataURL() || ''; } catch (err) { console.warn('shop thumb', key, err); }
        URLS.set(key, url);
      }
      const src = URLS.get(key);
      for (const img of this.root.querySelectorAll(`img[data-th="${CSS.escape(key)}"]`)) if (src) img.src = src;
    }
  }

  /** Fill cached thumbnails now; queue the rest in page order (drops whatever the last page still wanted). */
  hydrate() {
    const q = [], seen = new Set();
    for (const img of this.root.querySelectorAll('img[data-th]:not([src])')) {
      const k = img.dataset.th;
      if (URLS.has(k)) { if (URLS.get(k)) img.src = URLS.get(k); continue; }
      if (!seen.has(k)) { seen.add(k); q.push(k); }
    }
    this.queue = q;
  }

  updateAfford() {
    const m = this.game.state.money;
    this.lastMoney = m;
    for (const b of this.root.querySelectorAll('.sui-buy[data-price]:not([data-block])')) {
      const p = +b.dataset.price;
      const off = m < p;
      b.classList.toggle('off', off);
      b.setAttribute('aria-disabled', off);
      const why = b.parentElement.querySelector('.sui-why');
      if (why) why.innerHTML = off ? `${ic('wallet')}Need ${yen(p - m)} more` : '';
    }
  }

  // ------------------------------------------------------------------ widgets
  /** Purchase button with its reason line. block = why it can't be bought (other than money). */
  buy(fn, { price = 0, label = 'Buy', icon = 'cart', block = null, blockLabel = 'Locked', text = {}, cls = '' } = {}) {
    const id = this.on(() => this.run(fn, text));
    const money = this.game.state.money;
    const off = !!block || money < price;
    const why = block ? `${ic('lock')}${esc(block)}` : off ? `${ic('wallet')}Need ${yen(price - money)} more` : '';
    return `<div class="sui-bw ${cls}"><button class="sui-buy${off ? ' off' : ''}" data-h="${id}"${price ? ` data-price="${price}"` : ''}${block ? ' data-block="1"' : ''} aria-disabled="${off}">`
      + `${ic(block ? 'lock' : icon)}<span class="l">${esc(block ? blockLabel : label)}</span>`
      + `${price ? `<span class="p">${yen(price)}</span>` : block ? '' : '<span class="p">Free</span>'}</button><div class="sui-why">${why}</div></div>`;
  }

  btn(label, fn, { icon = null, cls = '' } = {}) {
    return `<button class="sui-btn ${cls}" data-h="${this.on(fn)}">${icon ? ic(icon) : ''}<span>${esc(label)}</span></button>`;
  }

  tag(label, icon = 'check', cls = 'ok') { return `<span class="sui-tag ${cls}">${ic(icon)}${esc(label)}</span>`; }

  pips(n, max, cls = '') { let s = ''; for (let i = 0; i < max; i++) s += `<i class="${i < n ? 'on' : ''}"></i>`; return `<span class="sui-pips ${cls}">${s}</span>`; }

  stars(n, max = 5) { let s = ''; for (let i = 0; i < max; i++) s += ic('star', 1, i < n ? 'lit' : 'dim'); return `<span class="sui-stars">${s}</span>`; }

  head(title, sub = '', right = '') {
    return `<header class="sui-ph"><div class="sui-ph-t"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${right ? `<div class="sui-ph-r">${right}</div>` : ''}</header>`;
  }

  // ------------------------------------------------------------------ frames
  build(store) {
    if (this._built === store) return;
    this._built = store;
    this.frame.innerHTML = store === 'emart' ? this.emartFrame() : this.cornerFrame();
    this.el = {
      main: this.frame.querySelector('.em-main, .cn-board'),
      page: this.frame.querySelector('.em-page, .cn-items'),
      url: this.frame.querySelector('.em-url'),
      status: this.frame.querySelector('.em-st'),
      nav: this.frame.querySelector('.em-nav'),
    };
  }

  emartFrame() {
    const nav = PAGES.map((p) => `<button class="em-nb" data-go="${p.id}">${ic(p.icon)}<span>${esc(p.label)}</span><i class="em-badge" data-badge="${p.id}"></i></button>`).join('');
    const wallet = `<div class="sui-wallet" title="Your money">${ic('coin')}<span class="v" data-money>${yen(this.game.state.money)}</span></div>`;
    return `<div class="sui-win em" role="dialog" aria-modal="true" aria-label="GACHA-MART web store">
      <div class="em-title">${ic('capsule')}<span class="em-tt">GACHA-MART <em>- Capsule Toy Web Store</em></span>${wallet}
        <button class="em-x" data-act="close" aria-label="Close" title="Close (Esc)">${ic('close')}</button></div>
      <div class="em-tool">
        <button class="em-tb em-back" data-act="back" aria-label="Back" title="Back (Backspace)">${ic('arrow_left')}<span>Back</span></button>
        <button class="em-tb" data-go="home" aria-label="Home" title="Home">${ic('home')}</button>
        <div class="em-addr">${ic('share')}<span class="em-url">http://www.gacha-mart.co.jp/</span></div>
        ${wallet}
      </div>
      <div class="em-brand">
        <div class="em-logo">${ic('capsule', 2)}<b>GACHA-MART</b></div>
        <div class="em-slogan">Capsule toys, machines &amp; more.<br>Delivered to your garage!</div>
        <div class="em-marq"><span>${esc(this.marquee())}</span></div>
      </div>
      <div class="em-body">
        <nav class="em-nav" aria-label="Categories">${nav}
          <div class="em-counter"><small>You are visitor No.</small><b class="em-digits"></b></div></nav>
        <main class="em-main"><div class="em-page"></div></main>
      </div>
      <div class="em-status">${ic('info')}<span class="em-st">Done</span><span class="em-zone">${ic('people')}Internet</span></div>
    </div>`;
  }

  marquee() {
    const s = this.game.state;
    return `Welcome to GACHA-MART!   *   Your collection: ${Object.keys(s.discovered).length} / ${ITEMS.length} figures   *   Rope coins can be used again and again (the manager pretends not to know)   *   Got duplicates? Sell them here!   *   Complete a series for a big bonus   *   Museum owners wanted!   *`;
  }

  // ------------------------------------------------------------------ navigation
  go(page, { push = true, sound = true, focus = null, sub = null } = {}) {
    page = OLD_PAGES[page] || page;
    if (!PAGE_BY_ID[page]) page = 'home';
    if (this.store !== 'emart') return;
    if (sub && page === 'museum') this.sub.museum = sub;
    if (push && this.page !== page) this.hist.push(this.page);
    if (sound && this.page !== page) audio.play('uiClick', { vol: 0.5 });
    this.page = page;
    this.render(true);
    if (focus) {
      const el = this.el.page.querySelector(`[data-focus="${CSS.escape(focus)}"]`);
      if (el) { this.el.main.scrollTop = el.offsetTop - (this.el.main.clientHeight - el.offsetHeight) / 2; el.classList.add('focus'); }
    }
  }

  back() {
    const p = this.hist.pop();
    if (p) this.go(p, { push: false });
  }

  refresh() { if (this.store === 'emart') this.render(false); }

  render(anim) {
    const g = this.game, s = g.state, el = this.el;
    this.h = [];
    let html = '';
    try { html = this[`p_${this.page}`](); } catch (err) { console.error(err); html = this.head('Page not found', 'Sorry, this page is under construction.'); }
    el.page.innerHTML = html;
    if (anim) {
      el.main.scrollTop = 0;
      el.page.classList.remove('in'); void el.page.offsetWidth; el.page.classList.add('in');
    }
    for (const b of el.nav.querySelectorAll('.em-nb')) {
      const on = b.dataset.go === this.page;
      b.classList.toggle('on', on);
      if (on && anim) reveal(el.nav, b);
    }
    // little nav badges: stored figures to sell, sold-out machines
    const stored = Object.values(s.storage).reduce((a, b) => a + b, 0);
    const empty = g.machines.filter((m) => m.data.stock.length === 0).length;
    const badges = { sell: stored || '', capsules: empty ? '!' : '' };
    for (const b of el.nav.querySelectorAll('[data-badge]')) { const v = badges[b.dataset.badge] ?? ''; b.textContent = v; b.classList.toggle('show', v !== ''); }
    el.url.textContent = `http://www.gacha-mart.co.jp/${this.page === 'home' ? '' : this.page + '/'}`;
    el.status.textContent = PAGE_BY_ID[this.page].tip;
    const d = this.frame.querySelector('.em-digits');
    if (d) d.innerHTML = String(this.counter + s.pulls).padStart(7, '0').split('').map((c) => `<i>${c}</i>`).join('');
    this.frame.querySelector('.em-back')?.classList.toggle('dim', !this.hist.length);
    this.hydrate();
    this.updateAfford();
  }

  // ------------------------------------------------------------------ pages
  p_home() {
    const g = this.game, s = g.state;
    const disc = Object.keys(s.discovered).length;
    const comp = Object.keys(s.completed).length;
    const feat = SERIES.find((se) => !s.licenses.includes(se.id)) || SERIES[Math.floor(g.time / 30) % SERIES.length];
    const licensed = s.licenses.includes(feat.id);
    const req = licenseRequirement(feat.id);
    const cta = this.btn('See capsule packs', () => this.go('capsules', { focus: feat.id }), { icon: 'arrow_right', cls: 'primary' });
    const strip = feat.items.slice(0, 5).map((it) => {
      const known = !!s.discovered[it.key];
      return `<span class="hero-fig" style="--rc:${rarityOf(it).color}">${itemTh(it.key, { px: 1, sil: !known && (it.rarity === 'secret' || it.rarity === 'ultra') })}</span>`;
    }).join('');
    let out = `<section class="sui-hero" style="--bg:${feat.card.bg};--ac:${feat.card.accent};--tx:${feat.card.text}">
      <div class="hero-art">${thumb(`b|${feat.id}`, 320, 280)}</div>
      <div class="hero-body">
        <span class="sui-badge blink">${licensed ? 'Best seller' : 'New arrival'}</span>
        <h2>${esc(feat.name)}</h2>
        <p>${esc(feat.tagline || '')}</p>
        <div class="hero-meta">${ic('coin')}${yen(feat.price)} per pull<span>${ic('figure')}${feat.items.length} figures</span></div>
        <div class="hero-figs">${strip}</div>
        <div class="hero-cta">${cta}${!licensed && disc < req ? `<span class="hero-lock">${ic('lock')}Unlocks at ${req} figures discovered</span>` : ''}</div>
      </div></section>`;
    const stat = (icon, label, val, page) => `<button class="sui-stat" data-go="${page}">${ic(icon, 2)}<span><small>${esc(label)}</small><b>${val}</b></span></button>`;
    out += `<div class="sui-stats">${stat('wallet', 'Wallet', `<span data-money>${yen(s.money)}</span>`, 'sell')}${stat('book', 'Figures found', `${disc} / ${ITEMS.length}`, 'book')}${stat('crown', 'Series complete', `${comp} / ${SERIES.length}`, 'book')}${stat('machine', 'Machines', `${s.machines.length} / ${MAX_MACHINES}`, 'machines')}</div>`;
    const recs = this.recommendations();
    if (recs.length) {
      out += `<h3 class="sui-h">${ic('star')}Recommended for you</h3><div class="sui-grid recs">`;
      for (const r of recs) {
        out += `<article class="sui-card rec">${r.img}<div class="rec-t"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></div>${this.buy(r.buy, { price: r.price, label: r.btn || 'Buy', text: r.text })}</article>`;
      }
      out += '</div>';
    }
    const tips = [
      ['megaphone', `Your collection: ${disc} of ${ITEMS.length} figures discovered, ${comp} series complete.`],
      ['coin', 'The coin on the rope can be used again and again. The manager pretends not to know.'],
      ['sell', 'Duplicates? Drop them in the sell box by the PC, or store them and sell them here later.'],
      ['crown', 'Display every figure of a series on your shelves for a big completion bonus.'],
      ['upgrade', 'Machine upgrades: faster cranks, bigger hoppers, more coins on the rope.'],
      ['museum', `Turn the warehouse into a museum: ${yen(MUSEUM_PRICE)} (complete ${MUSEUM_REQ_COMPLETE} series first).`],
      ['bulb', 'Switch off the lights: glow-in-the-dark finishes really glow.'],
    ];
    out += `<h3 class="sui-h">${ic('megaphone')}Shop notices</h3><ul class="sui-news">${tips.map(([i, t]) => `<li>${ic(i)}<span>${esc(t)}</span></li>`).join('')}</ul>`;
    return out;
  }

  recommendations() {
    const g = this.game, s = g.state;
    const out = [];
    const ms = g.machines.slice().sort((a, b) => a.data.stock.length / a.capacity - b.data.stock.length / b.capacity);
    const m = ms.find((mm) => s.licenses.includes(mm.data.series));
    if (m) {
      const se = SERIES_BY_ID[m.data.series];
      const n = Math.max(5, m.capacity - m.data.stock.length);
      out.push({
        title: `${se.name} refill`, sub: `${n} capsules for machine No.${g.machines.indexOf(m) + 1}`, price: capsuleCost(se.id) * n,
        img: itemTh(se.items[0].key, { px: 1, cls: 'rec-img' }), btn: 'Order',
        buy: () => shop.buyRefill(g, se.id, n), text: { ok: `${n} capsules are on their way to the shutter.` },
      });
    }
    let best = null;
    g.machines.forEach((mm, i) => {
      for (const k of Object.keys(UPGRADES)) {
        const c = upgradeCost(k, mm.data.up[k] || 0, mm.data.type);
        if (c !== null && (!best || c < best.price)) best = { title: UPGRADES[k].name, sub: `${UPGRADES[k].desc(mm.data.up[k] || 0)} - No.${i + 1}`, price: c, img: thumb(`m|${mm.data.type}|64`, 64, 64, 'rec-img'), buy: () => shop.buyUpgrade(g, mm, k), btn: 'Upgrade' };
      }
    });
    if (best) out.push(best);
    const nextOpen = OPENERS[s.opener + 1];
    if (nextOpen) out.push({ title: nextOpen.name, sub: `Opens capsules in ${nextOpen.time}s`, price: nextOpen.price, img: `<span class="rec-img ic">${ic('opener', 2)}</span>`, buy: () => shop.buyOpener(g, s.opener + 1) });
    else if (s.machines.length < MAX_MACHINES) {
      const t = MACHINE_ORDER.find((tt) => MACHINE_TYPES[tt].price > 0);
      const price = machinePrice(t, s.machines.filter((x) => x.type === t).length);
      out.push({ title: MACHINE_TYPES[t].name, sub: 'A new gacha machine', price, img: thumb(`m|${t}|64`, 64, 64, 'rec-img'), buy: () => shop.buyMachine(g, t) });
    }
    return out.slice(0, 3);
  }

  p_machines() {
    const g = this.game, s = g.state;
    const used = s.machines.length, full = used >= MAX_MACHINES;
    let out = this.head('Gacha Machines', 'Brand-new machines are installed in your garage right away and come half full of capsules.',
      `<div class="sui-slots"><small>Machine slots</small><b>${used} / ${MAX_MACHINES}</b>${this.pips(used, MAX_MACHINES, full ? 'full' : '')}</div>`);
    out += '<div class="sui-list">';
    for (const type of MACHINE_ORDER) {
      const T = MACHINE_TYPES[type];
      const owned = s.machines.filter((m) => m.type === type).length;
      const price = machinePrice(type, owned);
      const specs = [
        `${ic('capacity')}Holds ${T.baseCap}`, `${ic('speed')}${T.crank.toFixed(1)}s crank`,
        T.luck ? `${ic('sparkle')}Luck +${Math.round(T.luck * 100)}%` : '', `${ic('home')}Owned: ${owned}`,
      ].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
      const action = T.price === 0
        ? `<div class="sui-na">${this.tag('Not for sale', 'heart', 'soft')}<small>Grandpa's original machine</small></div>`
        : this.buy(() => shop.buyMachine(g, type), { price, label: 'Buy & install', block: full ? 'No free machine slot' : null, blockLabel: 'Garage full', text: { ok: `${T.name} installed in your garage!`, icon: 'machine' } });
      out += `<article class="sui-card row" style="--ac:${T.color}"><div class="row-art">${thumb(`m|${type}|64`, 128, 128)}</div>
        <div class="row-body"><h2>${esc(T.name)}</h2><p>${esc(T.desc)}</p><div class="sui-specs">${specs}</div></div>
        <div class="row-buy">${action}</div></article>`;
    }
    return out + '</div>';
  }

  p_capsules() {
    const g = this.game, s = g.state;
    const disc = Object.keys(s.discovered).length;
    let out = this.head('Capsule Refills', 'Packs arrive as a box at the garage shutter. Carry it to a machine and click to pour the capsules in.');
    out += '<div class="sui-list">';
    for (const se of SERIES) {
      const licensed = s.licenses.includes(se.id);
      const req = licenseRequirement(se.id);
      const locked = !licensed && disc < req;
      const got = se.items.filter((it) => s.discovered[it.key]).length;
      const dots = se.items.map((it) => `<i style="--rc:${s.discovered[it.key] ? rarityOf(it).color : 'transparent'}" title="${esc(s.discovered[it.key] ? it.name : '???')}"></i>`).join('');
      let action;
      if (licensed) {
        const cc = capsuleCost(se.id);
        action = `<div class="packs"><small>${yen(cc)} per capsule</small>${[10, 25, 50].map((n) => this.buy(() => shop.buyRefill(g, se.id, n), { price: cc * n, label: `${n} pack`, icon: 'box', cls: 'pack', text: { ok: `${n} ${se.name} capsules are on their way to the shutter.`, icon: 'box' } })).join('')}</div>`;
      } else if (locked) {
        action = `<div class="sui-lockbox">${ic('lock', 2)}<b>Locked</b><small>Discover ${req} figures to unlock</small><div class="sui-bar"><i style="width:${Math.min(100, (disc / req) * 100)}%"></i></div><small>${disc} / ${req} discovered</small></div>`;
      } else {
        const lp = licensePrice(se.id);
        action = `<div class="licence"><small>Distribution licence</small>${this.buy(() => shop.buyLicense(g, se.id), { price: lp, label: lp ? 'Get licence' : 'Get it free', icon: 'unlock', text: { ok: `You can now order ${se.name} refills!`, icon: 'unlock' } })}</div>`;
      }
      out += `<article class="sui-card series${locked ? ' locked' : ''}${s.completed[se.id] ? ' done' : ''}" data-focus="${se.id}" style="--ac:${se.card.accent};--bg:${se.card.bg}">
        <div class="series-art">${thumb(`b|${se.id}`, 160, 140)}${locked ? `<span class="art-lock">${ic('lock', 3)}</span>` : ''}</div>
        <div class="series-body"><h2>${esc(se.name)}</h2><p>${esc(se.tagline || '')}</p>
          <div class="sui-specs"><span>${ic('coin')}${yen(se.price)} a pull</span><span>${ic('figure')}${se.items.length} figures</span></div>
          <div class="sui-dots" aria-label="Collected ${got} of ${se.items.length}">${dots}<small>${got} / ${se.items.length}</small>${s.completed[se.id] ? this.tag('Complete', 'crown', 'gold') : ''}</div>
          <div class="sui-themes">${se.themes.map((t) => `<span>${esc(themeName(t))}</span>`).join('')}</div></div>
        <div class="series-buy">${action}</div></article>`;
    }
    return out + '</div>';
  }

  p_upgrades() {
    const g = this.game;
    let out = this.head('Machine Upgrades', 'Parts are fitted to your machine the moment you buy them.');
    if (!g.machines.length) return out + `<div class="sui-empty">${ic('machine', 3)}<p>You have no machines yet.</p>${this.btn('Shop machines', () => this.go('machines'), { icon: 'arrow_right', cls: 'primary' })}</div>`;
    out += '<div class="sui-list">';
    g.machines.forEach((m, idx) => {
      const T = MACHINE_TYPES[m.data.type];
      const se = SERIES_BY_ID[m.data.series];
      const tiles = Object.entries(UPGRADES).map(([k, U]) => {
        const lvl = m.data.up[k] || 0;
        const cost = upgradeCost(k, lvl, m.data.type);
        const act = cost === null ? `<div class="up-max">${ic('crown')}MAX LEVEL</div>` : this.buy(() => shop.buyUpgrade(g, m, k), { price: cost, label: 'Upgrade', icon: 'upgrade', text: { ok: `${U.name} fitted to machine No.${idx + 1}!`, icon: 'upgrade' } });
        return `<div class="up-tile${cost === null ? ' max' : ''}"><div class="up-h">${ic(UP_ICON[k] || 'upgrade', 2)}<b>${esc(U.name)}</b></div>
          <div class="up-lv"><small>Level ${lvl} / ${U.max}</small>${this.pips(lvl, U.max)}</div>
          <p>${cost === null ? 'Fully upgraded!' : `Next: ${esc(U.desc(lvl))}`}</p>${act}</div>`;
      }).join('');
      out += `<article class="sui-card mach"><div class="mach-h">${thumb(`m|${m.data.type}|64`, 64, 64)}<div><h2><span class="no">No.${idx + 1}</span> ${esc(T.name)}</h2>
        <div class="sui-specs"><span>${ic('capsule')}${esc(se?.name || '-')}</span><span>${ic('capacity')}${m.data.stock.length} / ${m.capacity} capsules</span><span>${ic('speed')}${crankTime(m.data).toFixed(2)}s crank</span></div></div></div>
        <div class="up-tiles">${tiles}</div></article>`;
    });
    return out + '</div>';
  }

  p_goods() {
    const g = this.game, s = g.state;
    const museum = !!g.museum?.data.owned;
    const row = (icon, name, desc, right, cls = '') => `<article class="sui-card line ${cls}"><span class="line-ic">${ic(icon, 2)}</span><div class="line-body"><b>${esc(name)}</b><p>${esc(desc)}</p></div><div class="line-buy">${right}</div></article>`;
    let out = this.head('Goods & Tools', 'Handy things for the shop. Everything shows up in your garage.');
    out += `<h3 class="sui-h">${ic('bag')}Shop goods</h3><div class="sui-list tight">`;
    for (const [id, d] of Object.entries(GOODS)) {
      const en = GOODS_EN[id] || {};
      const owned = !!s.goods?.[id];
      const right = owned ? this.tag('Installed') : this.buy(() => g.goods.buy(id), { price: d.price, block: d.museum && !museum ? 'Needs the museum' : null, text: { ok: `${d.name} installed!`, fail: 'Not enough money' } });
      out += row(en.icon || 'bag', d.name, en.desc || '', right, owned ? 'owned' : '');
    }
    out += `</div><h3 class="sui-h">${ic('opener')}Capsule openers</h3><div class="sui-list tight">`;
    OPENERS.forEach((o, i) => {
      if (i === 0) return;
      const owned = s.opener >= i;
      const right = owned ? this.tag('Owned') : this.buy(() => shop.buyOpener(g, i), { price: o.price, block: s.opener < i - 1 ? `Needs the ${OPENERS[i - 1].name} first` : null, text: { ok: `${o.name}: capsules open faster!`, icon: 'opener' } });
      out += row('opener', o.name, `${o.desc} Opens in ${o.time}s.`, right, owned ? 'owned' : '');
    });
    out += `</div><h3 class="sui-h">${ic('charm')}Lucky charms</h3><p class="sui-note">Kept on the little shrine shelf in the garage. Rare pulls and special finishes come more often.</p><div class="sui-list tight">`;
    for (const [id, c] of Object.entries(CHARMS)) {
      const owned = s.charms.includes(id);
      out += row('charm', c.name, c.desc, owned ? this.tag('Blessing you', 'sparkle', 'gold') : this.buy(() => shop.buyCharm(g, id), { price: c.price, text: { ok: `${c.name} is on the shrine shelf. Good luck!`, icon: 'charm' } }), owned ? 'owned' : '');
    }
    const n = s.shelves.length, max = SHELF_SLOTS.length;
    out += `</div><h3 class="sui-h">${ic('shelf')}Collection shelves</h3><div class="sui-list tight">`;
    out += row('shelf', 'Wall Collection Shelf', `48 spots with LED lights. Installed: ${n} / ${max}.`,
      n < max ? this.buy(() => shop.buyShelf(g), { price: SHELF_PRICES[n], text: { ok: 'A new shelf is up on the wall!', icon: 'shelf' } }) : this.tag('Wall is full', 'check', 'soft'));
    return out + '</div>';
  }

  p_museum() {
    const g = this.game, s = g.state, M = g.museum;
    if (!M) return this.head('Museum', 'Coming soon.');
    if (!M.data.owned) {
      const comp = Object.keys(s.completed).length;
      const ok = comp >= MUSEUM_REQ_COMPLETE;
      return this.head('Open your own museum') + `<section class="sui-card promo">
        <div class="promo-art">${ic('museum', 4)}</div>
        <div class="promo-body"><h2>Turn the empty warehouse behind your garage into a gacha museum!</h2>
          <ul><li>${ic('coin')}Visitors pay for tickets - money while you play</li><li>${ic('display')}Furnish it with display cases, sheets and decor</li><li>${ic('star')}Match the themes of your series for a better rating</li></ul>
          <div class="promo-req ${ok ? 'met' : ''}">${ic(ok ? 'check' : 'lock')}Requirement: complete ${MUSEUM_REQ_COMPLETE} series (you have ${comp})</div></div>
        <div class="promo-buy"><span class="sui-price big">${yen(MUSEUM_PRICE)}</span>${this.buy(() => M.buyMuseum(), { price: MUSEUM_PRICE, label: 'Open the museum', icon: 'museum', block: ok ? null : `Complete ${MUSEUM_REQ_COMPLETE} series first`, text: { ok: 'Your museum is open. The back door is unlocked!', icon: 'museum', fail: 'Complete a series first' } })}</div></section>`;
    }
    const sub = this.sub.museum;
    const tabs = MUSEUM_TABS.map(([id, label, icon]) => `<button class="sui-chip${sub === id ? ' on' : ''}" data-h="${this.on(() => { this.sub.museum = id; this.render(true); })}">${ic(icon)}${esc(label)}</button>`).join('');
    let out = this.head('Museum Shop', 'Furniture is delivered to the garage shutter. Carry the box into the museum to place it.',
      `<div class="sui-slots"><small>Rating</small>${this.stars(M.score.stars)}</div>`);
    out += `<div class="sui-chips">${tabs}</div>`;
    const order = { ok: 'Ordered! The box will arrive at the garage shutter.', icon: 'box', fail: 'Not enough money' };
    if (sub === 'displays') {
      out += '<div class="sui-grid cards">';
      for (const d of Object.values(DISPLAYS)) {
        out += `<article class="sui-card prod">${thumb(`d|${d.id}|64`, 128, 128)}<h2>${esc(d.name)}</h2><p>${esc(d.desc)}</p>
          <div class="sui-specs"><span>${ic('map')}${d.footprint[0]} x ${d.footprint[1]} m</span><span>${ic('figure')}${d.slots} spots</span></div>
          <div class="sui-themes">${d.themes.map((t) => `<span>${esc(themeName(t))}</span>`).join('')}</div>${this.buy(() => M.buyFurniture('display', d.id), { price: d.price, label: 'Order', text: order })}</article>`;
      }
      out += '</div>';
    } else if (sub === 'decor') {
      out += '<div class="sui-grid cards small">';
      for (const p of decorList()) {
        out += `<article class="sui-card prod">${thumb(`p|${p.id}|64`, 128, 128)}<h2>${esc(p.name || p.id)}</h2>
          <div class="sui-themes">${(p.themes || []).map((t) => `<span>${esc(themeName(t))}</span>`).join('')}</div>
          <div class="prod-beauty"><small>Beauty</small>${this.stars(Math.min(5, Math.ceil(p.beauty / 2)))}</div>${this.buy(() => M.buyFurniture('decor', p.id), { price: p.price, label: 'Order', text: order })}</article>`;
      }
      out += '</div>';
    } else if (sub === 'minis') {
      out += '<p class="sui-note">Tiny diorama pieces. Put them in display spots next to your figures to theme a display.</p><div class="sui-grid cards small">';
      for (const it of MINI_SERIES.items) {
        out += `<article class="sui-card prod">${itemTh(it.key)}<h2>${esc(it.name)}</h2><div class="sui-themes">${(it.themes || []).map((t) => `<span>${esc(themeName(t))}</span>`).join('')}</div>
          ${this.buy(() => M.buyMini(it.key), { price: it.price, label: 'Order', text: { ...order, ok: `${it.name} will arrive at the garage shutter.` } })}</article>`;
      }
      out += '</div>';
    } else if (sub === 'sheets') {
      out += '<p class="sui-note">Themed mats for the shelves of a display. Look at a display and press R to change its sheet. Matching a series theme raises your rating.</p><div class="sui-grid cards small">';
      for (const id of STYLE_ORDER.filter((x) => x !== 'plain')) {
        const m = DISPLAY_STYLES[id];
        const own = M.data.styles.includes(id);
        out += `<article class="sui-card prod sheet"><div class="swatch">${thumb(`s|${id}`, 128, 128)}</div><h2>${esc(m.name)}</h2>
          <div class="sui-themes">${m.themes.map((t) => `<span>${esc(themeName(t))}</span>`).join('')}</div>
          ${own ? this.tag('Owned') : this.buy(() => M.buyStyle(id), { price: m.price, text: { ok: `${m.name}: look at a display and press R to lay it.`, icon: 'flag', fail: 'Not enough money' } })}</article>`;
      }
      out += '</div>';
    } else if (sub === 'expand') {
      const lvl = M.data.level || 0;
      out += '<div class="sui-list tight">';
      MUSEUM_EXPANSIONS.forEach((e, i) => {
        const right = i <= lvl ? this.tag('Done') : i === lvl + 1
          ? this.buy(() => M.expand(), { price: e.price, label: 'Build', icon: 'wrench', text: { ok: `Your museum is now ${e.w} x ${e.d} m!`, icon: 'map', fail: 'Not enough money' } })
          : this.tag('Expand step by step', 'lock', 'soft');
        out += `<article class="sui-card line${i <= lvl ? ' owned' : ''}"><span class="line-ic">${ic('map', 2)}</span><div class="line-body"><b>${i === 0 ? 'Basic hall' : `Expansion ${i}`}: ${e.w} x ${e.d} m</b><p>Floor area ${e.w * e.d} m2</p></div><div class="line-buy">${right}</div></article>`;
      });
      out += '</div>';
    } else {
      const sc = M.score;
      const row = (k, v) => `<div><small>${esc(k)}</small><b>${v}</b></div>`;
      out += `<section class="sui-card rating"><div class="rating-top">${this.stars(sc.stars)}<q>${esc(REVIEW[sc.stars] || '')}</q></div>
        <div class="rating-score"><small>Total score</small><b>${sc.total}</b>${sc.nextAt ? `<span>${sc.nextAt - sc.total} to the next star</span>` : '<span>Top rating!</span>'}</div>
        <div class="rating-grid">${row('Exhibits', sc.exhibits)}${row('Theme match', '+' + sc.themes)}${row('Beauty', '+' + sc.beauty)}${row('Full sets', '+' + sc.sets)}
        ${row('Visitors / min', sc.rate.toFixed(1))}${row('Ticket price', yen(sc.ticket))}${row('Figures shown', sc.museumKeys)}${row('Total visitors', M.data.visitors || 0)}${row('Total income', yen(M.data.income || 0))}</div></section>
        <ul class="sui-news"><li>${ic('bulb')}<span>Place figures near sheets and decor that share their series themes (Cute, Food, Space...) to raise the rating.</span></li>
        <li>${ic('star')}<span>The Spotlight Pedestal doubles a rare figure's appeal. A whole series in the museum earns a set bonus.</span></li></ul>`;
    }
    return out;
  }

  p_used() {
    const g = this.game, s = g.state;
    const avail = SERIES.filter((se) => s.licenses.includes(se.id));
    if (!this.sub.used || !avail.find((a) => a.id === this.sub.used)) this.sub.used = avail[0]?.id;
    let out = this.head('Used Figures', 'Pick out the exact figure you are missing. Opened, but in mint condition. Premium prices!');
    out += `<div class="sui-chips">${avail.map((se) => `<button class="sui-chip${this.sub.used === se.id ? ' on' : ''}" style="--ac:${se.card.accent}" data-h="${this.on(() => { this.sub.used = se.id; this.render(false); })}">${esc(se.name)}</button>`).join('')}</div>`;
    const se = SERIES_BY_ID[this.sub.used];
    if (!se) return out + `<div class="sui-empty">${ic('lock', 3)}<p>Get a series licence first.</p></div>`;
    out += '<div class="sui-grid cards small">';
    for (const it of se.items) {
      const known = !!s.discovered[it.key];
      const R = rarityOf(it);
      out += `<article class="sui-card prod fig" style="--rc:${R.color}">${itemTh(it.key, { sil: !known })}<h2>${known ? esc(it.name) : '???'}</h2>
        <div class="fig-r">${this.stars(R.stars)}<small>${esc(R.name)}</small></div>
        ${this.buy(() => shop.buySingle(g, it.key), { price: singlePrice(it.key), text: { ok: `${known ? it.name : 'Your figure'} will arrive at the garage shutter.`, icon: 'box' } })}</article>`;
    }
    return out + '</div>';
  }

  p_sell() {
    const g = this.game, s = g.state;
    const entries = Object.entries(s.storage).filter(([k, c]) => c > 0 && getItem(k.split('|')[0]));
    const count = entries.reduce((a, [, c]) => a + c, 0);
    const total = entries.reduce((a, [k, c]) => { const [key, f] = k.split('|'); return a + itemValue(key, f) * c; }, 0);
    let out = this.head('Sell Your Collection', 'We buy figures from your storage bin (the blue-lid box in the garage).');
    out += `<section class="sui-card sellsum"><div class="sellsum-t">${ic('storage', 2)}<div><small>In storage</small><b>${count} figure${count === 1 ? '' : 's'}</b></div><div><small>Total value</small><b class="sui-price">${yen(total)}</b></div></div>
      <div class="sellsum-b">${count ? this.btn(`Sell all stored (${yen(total)})`, () => this.run(() => shop.sellAllStored(g), { title: 'Sold!', icon: 'coin' }), { icon: 'sell', cls: 'primary' }) : ''}
      ${this.btn('Sell duplicates on display', () => this.run(() => shop.sellDisplayedDupes(g), { title: 'Sold!', icon: 'coin' }), { icon: 'figure' })}</div>
      <small class="sellsum-n">Selling duplicates on display keeps your best copy of every figure.</small></section>`;
    if (!entries.length) return out + `<div class="sui-empty">${ic('storage', 3)}<p>Your storage bin is empty. Put figures in the blue-lid box in the garage to sell them here.</p></div>`;
    out += '<div class="sui-list tight">';
    for (const [k, c] of entries) {
      const [key, f] = k.split('|');
      const it = getItem(key), R = rarityOf(it), F = FINISHES[f] || FINISHES.normal;
      const v = itemValue(key, f);
      const sell1 = this.btn('Sell 1', () => this.run(() => shop.sellStored(g, k, 1), { title: 'Sold!', icon: 'coin' }), { icon: 'sell', cls: 'primary' });
      const take = this.btn('Take out', () => {
        const ok = g.takeFromStorage(k);
        this.run(() => (ok ? { ok: true, msg: 'Taken out of storage.' } : { ok: false, msg: 'Nothing left to take out' }), { title: 'Done!', icon: 'hand' });
      }, { icon: 'hand' });
      out += `<article class="sui-card line sell" style="--rc:${R.color}"><span class="line-th">${itemTh(key, { px: 1, finish: f })}</span>
        <div class="line-body"><b>${esc(it.name)}</b><p><span class="rdot"></span>${esc(R.name)}${f !== 'normal' ? ` <span class="fin" style="--fc:${F.color}">${esc(F.name)}</span>` : ''} <span class="cnt">x${c}</span></p></div>
        <div class="line-buy sellbtns"><span class="sui-price">${yen(v)}</span>${sell1}${take}</div></article>`;
    }
    return out + '</div>';
  }

  p_book() {
    const g = this.game, s = g.state;
    const disc = Object.keys(s.discovered).length;
    const shown = g.displayedKeys();
    let out = this.head('Collection Book', `${s.pulls} capsules pulled, ${s.stats?.secrets || 0} secrets found.`,
      `<div class="sui-slots"><small>Discovered</small><b>${disc} / ${ITEMS.length}</b><div class="sui-bar"><i style="width:${(disc / ITEMS.length) * 100}%"></i></div></div>`);
    for (const se of SERIES) {
      const got = se.items.filter((it) => s.discovered[it.key]).length;
      const done = !!s.completed[se.id];
      const cells = se.items.map((it) => {
        const d = s.discovered[it.key];
        const R = rarityOf(it);
        const fins = d ? Object.keys(d.f).filter((f) => f !== 'normal' && FINISHES[f]).map((f) => `<i style="--fc:${FINISHES[f].color}" title="${esc(FINISHES[f].name)}"></i>`).join('') : '';
        return `<div class="bk-cell${d ? '' : ' unk'}${shown.has(it.key) ? ' shown' : ''}" style="--rc:${R.color}" title="${esc(d ? `${it.name} - ${R.name}` : `??? - ${R.name}`)}">
          ${itemTh(it.key, { px: 1, sil: !d })}<span class="bk-n">${d ? esc(it.name) : '???'}</span>
          <span class="bk-f">${fins}${d ? `<em>x${d.n}</em>` : ''}</span></div>`;
      }).join('');
      out += `<section class="sui-card book${done ? ' done' : ''}" style="--ac:${se.card.accent}"><div class="book-h"><h2>${esc(se.name)}</h2><span class="book-c">${got} / ${se.items.length}</span>${done ? this.tag('Complete', 'crown', 'gold') : ''}</div><div class="bk-grid">${cells}</div></section>`;
    }
    out += `<p class="sui-note legend">${Object.values(RARITIES).map((R) => `<span style="--rc:${R.color}"><i></i>${esc(R.name)}</span>`).join('')}<span class="shown-l"><i></i>On display</span></p>`;
    return out;
  }

  // ------------------------------------------------------------------ MIKAWA-YA, the corner store
  cornerFrame() {
    return `<div class="sui-win cn" role="dialog" aria-modal="true" aria-label="MIKAWA-YA General Store">
      <div class="cn-eave"></div>
      <div class="cn-noren" aria-hidden="true"><span>MI</span><span>KA</span><span>WA</span><span>YA</span></div>
      <button class="cn-x" data-act="close" aria-label="Leave the shop" title="Leave (Esc)">${ic('door', 2)}<span>Leave</span></button>
      <div class="cn-board">
        <header class="cn-head"><div><h1>Price List</h1><p>MIKAWA-YA General Store &middot; odds and ends since 1962</p></div>
          <div class="sui-wallet cn-wallet">${ic('wallet', 2)}<span class="v" data-money>${yen(this.game.state.money)}</span></div></header>
        <div class="cn-items"></div>
        <p class="cn-note">"Take your time, dear. Everything is cash only." <span>- Mrs. Mikawa</span></p>
      </div>
    </div>`;
  }

  renderCorner(keep = false) {
    const g = this.game;
    this.h = [];
    const can = typeof g.buySupply === 'function';
    this.el.page.innerHTML = SUPPLIES.map((sp, i) => {
      const T = TOOLS[sp.tool] || {};
      const fn = () => (can ? g.buySupply(sp.id) : { ok: false, msg: 'The shopkeeper is out. Please come back later.' });
      return `<article class="cn-tag" style="--tilt:${[-1.2, 0.8, -0.5, 1.1, -0.9, 0.6][i % 6]}deg">
        <span class="cn-pin"></span><div class="cn-ic">${ic(T.icon || 'bag')}</div>
        <div class="cn-txt"><h2>${esc(sp.name)}</h2><p>${esc(sp.desc)}</p>${sp.uses ? `<span class="cn-uses">${sp.uses} in a pack</span>` : ''}</div>
        <div class="cn-price">${yen(sp.price)}</div>${this.buy(fn, { price: sp.price, label: 'Buy', icon: 'bag', text: { title: 'Thank you!', icon: T.icon } })}</article>`;
    }).join('');
    if (!keep) { this.el.page.classList.remove('in'); void this.el.page.offsetWidth; this.el.page.classList.add('in'); }
    this.updateAfford();
  }
}
