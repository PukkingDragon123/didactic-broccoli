// The Dressing Room: your character on a rag rug in a small walk-in closet on a spring afternoon (src/dressing/stage.js,
// room.js), and a paper mail-order catalogue beside it: index tabs for every category, cards with crisp pixel pictures,
// rarity stamps, prices and "how to get it" slips, paint chips for colours, and a slip at the bottom for whatever you're
// looking at.
//
// Hover a card (or move to it with the keys / a pad) and it's tried on; click it and it's yours to wear: saved at once
// (state.avatar, game.events 'avatar'), with a little puff of cloth dust, a hop and a rustle (a rare piece adds a few
// sparkles and a soft note). Pieces you don't own yet are ink silhouettes under a hanko padlock; you can still try them on
// ("not yours yet") and the slip says how to get them, with progress where it can be counted. Shop pieces are bought
// right here with yen; the Duck Head's slip has a "Follow on itch.io" button (src/cosmetics/itch.js). New arrivals wear a
// NEW sticker until you've looked at them (save: 'dressing').
//   const room = new DressingRoom(game);  room.open({ from: 'menu' | 'mirror' }) -> Promise (resolves on close)
import './dressing.css';
import { audio } from '../core/audio.js';
import { iconHTML } from '../gfx/icons.js';
import { COSMETIC_BY_ID, SLOTS } from '../people/cosmetics.js';
import { normalizeAvatar, avatarSpec } from '../people/avatar.js';
import { RARITIES } from '../data/rarity.js';
import { hasPrint, printOf, loadPrint } from '../cosmetics/prints.js';
import { ensureState } from '../game/stateExt.js';
import { talk } from '../people/voice.js';
import { Stage, REST_YAW } from './stage.js';
import { TABS, TAB_BY_ID, TAB_OF, AT_KEY, sections, itemsOf, status, howTo, counts } from './catalog.js';
import { thumbFor, silhouette, THUMB } from './thumbs.js';
import { pixText } from './pixtext.js';
import { idle, equipPoof, denied } from './fx.js';
import { claimItch, DUCK_ID } from '../cosmetics/itch.js';
import { installDressSounds } from './sounds.js';
import { installDressIcons } from './icons.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const yen = (n) => '¥' + Math.max(0, Math.floor(n)).toLocaleString('en-US');
const ic = (n, s = 2, c = '') => iconHTML(n, s, c);
const hexCss = (c) => '#' + (c ?? 0).toString(16).padStart(6, '0');
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const LOOK_KEYS = ['body', 'skin', 'hair', 'hairCol', 'top', 'topCol', 'bottom', 'botCol', 'eyes', 'brows', 'cheeks', 'eyeCol', ...SLOTS.map((s) => s.id)];
const lookOf = (a) => Object.fromEntries(LOOK_KEYS.map((k) => [k, a[k] ?? null]));
const sameLook = (a, b) => LOOK_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null));
const LINES = ['Ooh!', 'Hmm, nice.', 'Fits!', 'Looking good.', 'Is this too much?', 'Not bad at all.', 'Grandpa would laugh.', 'Snug.', 'Very 1999.', "I'll keep it."];
const ITEM_LINES = { dino: 'Rawr!', chicken: 'Bawk!', frog: 'Ribbit.', shark: 'Chomp chomp.', banana: 'I am bananas.', cone: 'Road work ahead.', box: 'Beep boop.', groucho: 'Nobody will know.', happi: 'Wasshoi!', bear: 'Grr. Cute grr.', nigiri: 'Fresh!', kitsune: 'Festival time!', stars: 'Superstar!', cx_crown: 'Bow, lane!', cx_pigeon: 'Poppo.', cx_cow: 'Moo.', cx_shiba: 'Wan!', cx_calico: 'Nya.', cx_pompadour: 'Nobody touch it.', cx_goldkicks: 'Shiny!', cx_paperbag: "Don't look at me.", cx_ranger: 'Henshin!', cx_astro: 'One small step...',
  cx_duck: 'Quack.', cx_tengu: 'My nose!', cx_daruma: 'Wish granted.', cx_kabuto: 'Banzai!', cx_hachimaki: 'Hisshō!', cx_tanuki: 'Pon-poko!', cx_tanukitail: 'Pon-poko!', cx_chonmage: 'Gozaru.', cx_kagami: 'Akemashite!', cx_santa: 'Cake! Cake for sale!', cx_kogal: 'Cho-kawaii!', cx_overtime: 'One more beer.', cx_toilet: 'Un ga tsuku.', cx_capsulehat: 'Gacha gacha!', cx_kaiser: 'Hmm. Quite.', cx_jersey: 'Gym class.', cx_furoshiki: 'Not a thief. Promise.' };
const KEY_HELP = 'Arrows · Enter wear · Q/E tabs · Z/X zoom · Esc';
const HOW_ICON = { ach: 'os_trophy', quest: 'star', capsule: 'machine', web: 'cart', level: 'upgrade', itch: 'heart' };

export class DressingRoom {
  constructor(game) {
    this.game = game;
    installDressSounds();
    installDressIcons();
    this.isOpen = false;
    this.tab = 'tops';
    this.sticky = {}; // try-ons that stay (a clicked piece you don't own)
    this.hover = {}; // the piece under the pointer / keyboard focus
    this.sel = null; // the item in the slip
    this.allOwned = false; // debug: show everything as yours (screenshots)
    this.S = ensureState(game, 'dressing', { v: 1, seen: null, tab: 'tops' });
    if (!Array.isArray(this.S.seen)) this.S.seen = [...(game.state.avatar?.owned || [])]; // an older save: what you had is not new
    this.thumbQ = [];
    this.pads = {};
    game.events.on('cosmetic', () => { if (this.isOpen) this.render(); });
    game.events.on('wallet', () => { if (this.isOpen) this.renderWallet(); });
  }

  // ------------------------------------------------------------------------------------------ state helpers
  get saved() {
    const a = this.game.state.avatar;
    if (!a || !Array.isArray(a.owned) || !a.body) this.game.state.avatar = normalizeAvatar(a);
    return this.game.state.avatar;
  }
  get owned() { return new Set(this.allOwned ? Object.keys(COSMETIC_BY_ID) : this.saved.owned); }
  get shown() { return normalizeAvatar({ ...this.saved, ...this.sticky, ...this.hover }); }
  isNew(id) { return !this.allOwned && this.saved.owned.includes(id) && !this.S.seen.includes(id); }
  markSeen(id) {
    if (!id || this.S.seen.includes(id)) return;
    this.S.seen.push(id);
    const el = this.book?.querySelector(`[data-uid="cos:${CSS.escape(id)}"] .dr-new`);
    if (el) { el.classList.add('peel'); setTimeout(() => el.remove(), 360); }
    this.renderTabs();
  }
  sfx(n, v = 0.5) { try { audio.init(); audio.play(n, { vol: v }); } catch { /* audio not ready */ } }

  // ------------------------------------------------------------------------------------------ open / close
  open({ from = 'menu' } = {}) {
    const g = this.game;
    if (this.isOpen) return this.done;
    if (g.visiting) { g.news?.("Your closet's at home", 'You can change clothes in your own shop.', 4000); return Promise.resolve(g.state.avatar); }
    this.from = from;
    this.isOpen = true;
    this.sticky = {}; this.hover = {}; this.sel = null;
    this.tab = TAB_BY_ID[this.S.tab] ? this.S.tab : 'tops';
    this.done = new Promise((res) => { this.resolve = res; });
    if (from === 'mirror') {
      // in the game: hold still, hands down, mouse free (put back on close)
      this.prev = { frozen: g.player?.frozen, anchor: g.held?.anchor?.visible, uiOpen: g.uiOpen };
      g.uiOpen = true; g.uiCine = true;
      if (g.player) g.player.frozen = true;
      if (g.held?.anchor) g.held.anchor.visible = false;
      g.interaction?.setHint?.(null);
      g.input?.unlock?.();
    }
    this.build();
    this.root.classList.remove('hidden', 'closing');
    this.root.dataset.from = from;
    document.body.classList.add('dressing-on');
    this.layout();
    const st = this.stage;
    // from the menu the room fades up in steps; through the mirror the glass dissolves on the room
    st.fade = from === 'mirror' ? 1 : 0;
    st.mirror = from === 'mirror' ? 1 : 0;
    this.root.querySelector('.dr-back-t').textContent = from === 'mirror' ? 'Step away' : 'Back';
    st.yaw = REST_YAW; st.yawVel = 0; st.poseYaw = null; st.idleT = 0;
    st.setLook(this.shown);
    this.lastLook = lookOf(this.shown);
    st.zoomTo('full', true);
    st.fx.clear();
    this.render();
    this.covering = false;
    this.introDone = false;
    this.openT = 0;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    const loop = (now) => {
      if (!this.isOpen && !this.closing) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
      this.last = Math.max(this.last, now);
      this.frame(dt);
    };
    this.raf = requestAnimationFrame(loop);
    g.events.emit('dressing', { open: true, from });
    return this.done;
  }

  close() {
    if (!this.isOpen || this.closing) return;
    this.closing = true;
    this.sfx('drHover', 0.5);
    this.root.classList.add('closing');
    this.bubble(null);
    this.stampShow(false);
    setTimeout(() => this.finish(), 560);
  }

  finish() {
    const g = this.game;
    this.isOpen = false; this.closing = false; this.covering = false;
    cancelAnimationFrame(this.raf);
    this.sticky = {}; this.hover = {};
    this.root.classList.add('hidden');
    document.body.classList.remove('dressing-on');
    this.S.tab = this.tab;
    g.save?.();
    if (this.from === 'mirror') {
      const p = this.prev || {};
      g.uiOpen = false; g.uiCine = false;
      if (g.player) g.player.frozen = p.frozen || false;
      if (g.held?.anchor) g.held.anchor.visible = p.anchor ?? true;
      g.input?.lock?.();
    }
    g.events.emit('dressing', { open: false, from: this.from });
    this.resolve?.(g.state.avatar);
  }

  // ------------------------------------------------------------------------------------------ DOM
  build() {
    if (this.root) return;
    const root = this.root = document.createElement('div');
    root.className = 'dr hidden';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Dressing room');
    root.innerHTML = `
      <div class="dr-stagehost"></div>
      <div class="dr-ui">
        <div class="dr-top">
          <button class="dr-back pp-tag" data-act="close">${ic('back', 2)}<span class="dr-back-t">Back</span></button>
          <div class="dr-title"><b>Dressing Room</b><i lang="ja">衣装部屋</i></div>
        </div>
        <div class="dr-bubble" aria-live="polite"></div>
        <div class="dr-stamp" aria-hidden="true"><span class="dr-stamp-in">${pixText('NOT YOURS YET', { s: 3, col: '#2f5a9a' })}</span></div>
        <div class="dr-zoom">
          <div class="dr-zchips" role="group" aria-label="Zoom">
            <button data-zoom="face">Face</button><button data-zoom="full">Full</button><button data-zoom="feet">Feet</button>
          </div>
          <div class="dr-hint">Drag to turn · Scroll to zoom</div>
        </div>
        <aside class="dr-book" aria-label="Catalogue">
          <nav class="dr-tabs" role="tablist" aria-label="Categories"></nav>
          <div class="dr-page">
            <header class="dr-head">
              <div class="dr-h-l"><h2 class="dr-h-name"></h2><div class="dr-h-count"></div></div>
              <div class="dr-h-r"><div class="dr-wallet"></div><div class="dr-all"></div></div>
            </header>
            <div class="dr-scroll" tabindex="-1"></div>
            <div class="dr-slip" aria-live="polite"></div>
            <footer class="dr-keys">${esc(KEY_HELP)}</footer>
          </div>
        </aside>
      </div>`;
    document.body.appendChild(root);
    const $ = (s) => root.querySelector(s);
    this.book = $('.dr-book'); this.tabsEl = $('.dr-tabs'); this.scroll = $('.dr-scroll'); this.slipEl = $('.dr-slip');
    this.nameEl = $('.dr-h-name'); this.countEl = $('.dr-h-count'); this.walletEl = $('.dr-wallet'); this.allEl = $('.dr-all');
    this.bubbleEl = $('.dr-bubble'); this.stampEl = $('.dr-stamp'); this.hintEl = $('.dr-hint');
    this.stage = new Stage(this.game, $('.dr-stagehost'));
    this.bindInput();
    this.ro = new ResizeObserver(() => { if (this.isOpen) this.layout(); });
    this.ro.observe(root);
    addEventListener('resize', () => { if (this.isOpen) this.layout(); });
  }

  /** The stage gets whatever the catalogue leaves free. */
  layout() {
    const tsz = innerWidth < 560 ? 42 : THUMB;
    if (tsz !== this.tsz) { this.tsz = tsz; this.root.style.setProperty('--th', `${tsz * 2}px`); if (this.items) this.renderPage(); }
    // (layout boxes, not the on-screen ones: the book may still be sliding in)
    const b = this.book, W = innerWidth, H = innerHeight;
    const r = { left: b.offsetLeft, top: b.offsetTop, width: b.offsetWidth };
    const portrait = r.top > H * 0.25 && r.width > W * 0.8;
    const rect = portrait ? { x: 0, y: 0, w: W, h: Math.max(160, r.top) } : { x: 0, y: 0, w: Math.max(200, r.left), h: H };
    this.rect = rect;
    this.root.style.setProperty('--stage-w', `${rect.w}px`);
    this.root.style.setProperty('--stage-h', `${rect.h}px`);
    this.stage.layout(rect);
  }

  render() {
    this.renderTabs();
    this.renderPage();
    this.renderWallet();
    this.renderSlip();
  }

  renderTabs() {
    if (!this.tabsEl) return;
    const own = this.owned, C = counts(this.game, own);
    const newIn = (t) => (t.slot ? [...own].filter((id) => COSMETIC_BY_ID[id]?.slot === t.slot && this.isNew(id)).length : 0);
    this.tabsEl.innerHTML = TABS.map((t) => {
      const c = C[t.id], n = newIn(t);
      const label = `${t.name}${c ? `, ${c.own} of ${c.total} collected` : ''}${n ? `, ${n} new` : ''}`;
      return `<button class="dr-tab${t.id === this.tab ? ' on' : ''}" role="tab" aria-selected="${t.id === this.tab}" data-tab="${t.id}" aria-label="${esc(label)}" title="${esc(t.name)}">
        ${ic(t.icon, 2)}<span class="dr-tab-t">${esc(t.short || t.name)}</span>${n ? `<i class="dr-tab-new">${pixText('NEW', { s: 1, col: '#fff4d8' })}</i>` : ''}</button>`;
    }).join('');
    this.allEl.innerHTML = `<span>Collection</span><b>${C.all.own}</b><span>/ ${C.all.total}</span>`;
  }

  renderWallet() { if (this.walletEl) this.walletEl.innerHTML = `${ic('coin', 1)}<b>${yen(this.game.state.money)}</b>`; }

  renderPage() {
    const t = TAB_BY_ID[this.tab], own = this.owned, look = this.saved;
    const secs = this.secs = sections(this.tab, look, this.game, own);
    this.items = new Map(itemsOf(secs).map((it) => [it.uid, it]));
    const C = counts(this.game, own)[this.tab];
    this.nameEl.textContent = t.name;
    this.countEl.innerHTML = C ? `<span>${C.own} / ${C.total} collected</span><i class="dr-bar"><i style="width:${Math.round((C.own / Math.max(1, C.total)) * 25) * 4}%"></i></i>` : '<span>Free to change, any time</span>';
    const shown = this.shown;
    this.scroll.innerHTML = secs.map((s) => `<section class="dr-sec dr-sec-${s.kind}"><h3><span>${esc(s.title)}</span></h3>
      <div class="${s.kind === 'chips' ? 'dr-chips' : 'dr-grid'}">${s.items.map((it) => (s.kind === 'chips' ? this.chipHTML(it, look, shown) : this.cardHTML(it, look, shown, own))).join('')}</div></section>`).join('');
    // pictures: from the cache now, the rest a few per frame
    this.thumbQ = [];
    for (const img of this.scroll.querySelectorAll('img[data-th]')) this.thumbQ.push(img);
  }

  cardHTML(it, look, shown, own) {
    const worn = (look[it.key] ?? null) === it.value, trying = !worn && (shown[it.key] ?? null) === it.value;
    const st = status(this.game, it, own), c = it.c;
    const R = c ? RARITIES[c.rarity] || RARITIES.common : null;
    let foot = '';
    if (it.kind === 'cos' && st === 'shop') foot = `<span class="dr-price">${esc(yen(c.price))}</span>`;
    else if (st === 'locked') {
      const h = howTo(this.game, c);
      const short = { ach: 'Trophy', quest: 'Quest', capsule: 'Capsule', web: 'Web shop', level: `Level ${h.prog?.max}`, thrift: 'Thrift', itch: 'Free!' }[h.kind] || h.label;
      foot = `<span class="dr-how">${ic(HOW_ICON[h.kind] || 'lock', 1)}<span>${esc(short)}</span></span>${h.prog ? `<i class="dr-bar sm"><i style="width:${Math.round((h.prog.n / h.prog.max) * 10) * 10}%"></i></i>` : ''}`;
    } else if (worn) foot = '<span class="dr-worn">Wearing</span>';
    else if (it.kind === 'cos') foot = '<span class="dr-own">Yours</span>';
    const pic = it.kind === 'none'
      ? `<span class="dr-none">${ic(TAB_BY_ID[TAB_OF[it.key]]?.icon || 'close', 3)}</span><i class="dr-x"></i>`
      : `<img data-th="${esc(it.uid)}" alt="" width="${this.tsz * 2}" height="${this.tsz * 2}" draggable="false">`;
    const isNew = it.kind === 'cos' && this.isNew(it.value);
    return `<button class="dr-card st-${st}${worn ? ' worn' : ''}${trying ? ' trying' : ''}${this.sel === it.uid ? ' sel' : ''}" data-uid="${esc(it.uid)}" style="${R ? `--rc:${R.color}` : ''}" aria-label="${esc(`${it.name}${worn ? ', wearing' : st === 'locked' ? ', locked' : st === 'shop' ? `, ${yen(c.price)}` : ''}`)}">
      <span class="dr-pic">${pic}${st === 'locked' ? `<i class="dr-seal">${ic('dr_seal', 2)}</i>` : ''}</span>
      ${R ? `<i class="dr-rar" style="--rc:${R.color}">${pixText(R.name.toUpperCase(), { s: 1, col: '#241a1e' })}</i>` : ''}
      ${isNew ? `<i class="dr-new">${pixText('NEW', { s: 2, col: '#fff4d8' })}</i>` : ''}
      <span class="dr-name">${esc(it.name)}</span>
      <span class="dr-foot">${foot}</span>
    </button>`;
  }

  chipHTML(it, look, shown) {
    const worn = (look[it.key] ?? null) === it.value, trying = !worn && (shown[it.key] ?? null) === it.value;
    const col = it.col == null ? null : hexCss(it.col);
    return `<button class="dr-chip${worn ? ' worn' : ''}${trying ? ' trying' : ''}" data-uid="${esc(it.uid)}" aria-label="${esc(it.name)}${worn ? ', wearing' : ''}">
      <span class="dr-chip-c${col ? '' : ' auto'}" style="${col ? `--c:${col}` : ''}"></span>
      <span class="dr-chip-n">${pixText(it.name.toUpperCase(), { s: 1 })}</span>
    </button>`;
  }

  /** The slip at the bottom: what you're looking at, and what you can do with it. */
  renderSlip() {
    const it = this.sel ? this.items?.get(this.sel) : null;
    const el = this.slipEl;
    if (!it) {
      const t = TAB_BY_ID[this.tab];
      el.className = 'dr-slip idle';
      el.innerHTML = `<div class="dr-slip-idle">${ic(t.icon, 2)}<span>${t.slot ? 'Hover to try it on. Click to wear it.' : 'Hover to try it on. Click to keep it.'}</span></div>`;
      return;
    }
    const look = this.saved, own = this.owned, st = status(this.game, it, own), c = it.c;
    const worn = (look[it.key] ?? null) === it.value;
    const R = c ? RARITIES[c.rarity] || RARITIES.common : null;
    let how = '', act = '';
    if (it.kind === 'cos' && st !== 'owned') {
      const h = howTo(this.game, c);
      const bar = h.prog ? `<div class="dr-prog"><i class="dr-bar"><i style="width:${Math.round((h.prog.n / h.prog.max) * 20) * 5}%"></i></i><span>${h.prog.unit === 'level' ? `Level ${h.prog.n} of ${h.prog.max}` : h.prog.unit === 'steps' ? `Step ${h.prog.n + 1} of ${h.prog.max}` : `${h.prog.n.toLocaleString('en-US')} / ${h.prog.max.toLocaleString('en-US')}`}</span></div>` : '';
      if (st === 'shop') {
        const short = this.game.state.money < c.price;
        how = `<div class="dr-how-slip shop"><b>${pixText('IN THE CLOSET', { s: 1, col: '#c8322c' })}</b><span class="dr-how-t">${esc(yen(c.price))}</span><small>${short ? `You need ${esc(yen(c.price - this.game.state.money))} more.` : 'Pay at the counter and put it on.'}</small></div>`;
        act = `<button class="dr-act buy${short ? ' off' : ''}" data-act="buy">${ic('cart', 2)}<span>Buy ${esc(yen(c.price))}</span></button>`;
      } else if (h.kind === 'itch') {
        how = `<div class="dr-how-slip itch"><b>${pixText(h.label.toUpperCase(), { s: 1, col: '#c8322c' })}</b><span class="dr-how-t">${esc(h.text)}</span><small>${esc(h.sub)}</small></div>`;
        act = `<button class="dr-act itch" data-act="itch">${ic('heart', 2)}<span>Follow on itch.io</span></button>`;
      } else {
        how = `<div class="dr-how-slip"><b>${pixText(h.label.toUpperCase(), { s: 1, col: '#c8322c' })}</b><span class="dr-how-t">${esc(h.text)}</span>${h.sub ? `<small>${esc(h.sub)}</small>` : ''}${bar}</div>`;
        act = '<span class="dr-act no">Not yours yet</span>';
      }
    } else if (it.kind === 'cos' || it.kind === 'none') {
      act = worn ? (it.kind === 'cos' ? '<button class="dr-act" data-act="off"><span>Take off</span></button>' : '<span class="dr-act is">As you are</span>') : `<button class="dr-act go" data-act="wear"><span>${it.kind === 'none' ? 'Take it off' : 'Wear it'}</span></button>`;
    } else act = worn ? '<span class="dr-act is">Wearing</span>' : '<button class="dr-act go" data-act="wear"><span>Keep it</span></button>';
    const desc = c?.desc || (it.kind === 'none' ? 'Nothing at all. A bold choice.' : it.kind === 'swatch' ? 'A colour. Free, like the wind.' : 'Part of your everyday look. Free to change.');
    el.className = `dr-slip st-${st}`;
    el.innerHTML = `
      <div class="dr-slip-l"><span class="dr-name-big">${esc(it.name)}</span>
        <span class="dr-slip-tags">${R ? `<i class="dr-rar" style="--rc:${R.color}">${pixText(R.name.toUpperCase(), { s: 1, col: '#241a1e' })}</i>` : ''}${worn ? '<i class="dr-tick"></i>' : ''}</span>
        <small class="dr-desc">${esc(desc)}</small>${how}</div>
      <div class="dr-slip-r">${act}</div>`;
  }

  // ------------------------------------------------------------------------------------------ actions
  /** Put a piece on for real (or keep a base option): saved, the 'avatar' event, a puff of cloth dust and a hop. */
  commit(change, { at = 0.5, rarity = 'common', item = null, sound = true } = {}) {
    const g = this.game;
    const A = g.state.avatar = normalizeAvatar({ ...this.saved, ...change });
    for (const k of Object.keys(change)) { delete this.sticky[k]; delete this.hover[k]; }
    // a try-on that's now yours stays on (it's saved); anything still not yours stays tried on
    for (const k of Object.keys(this.sticky)) if (this.sticky[k] === A[k]) delete this.sticky[k];
    g.save?.();
    g.events.emit('avatar', A);
    if (item?.c && hasPrint(item.value) && !printOf(item.value)) loadPrint(item.value).then(() => { g.events.emit('avatar', g.state.avatar); this.refreshModel(); });
    this.refreshModel('equip', { at, rarity });
    if (sound) this.sfx(rarity === 'secret' ? 'drSecret' : rarity === 'rare' || rarity === 'ultra' ? 'drRare' : 'drRustle', 0.8);
    if (Math.random() < 0.3 || ITEM_LINES[item?.value]) this.say(ITEM_LINES[item?.value] || pick(LINES));
    this.render();
  }

  /** Click / Enter on an item. */
  choose(it) {
    if (!it) return;
    const g = this.game, look = this.saved, own = this.owned, st = status(g, it, own);
    this.sel = it.uid;
    const at = AT_KEY[it.key] ?? 0.5;
    if (it.kind === 'cos') this.markSeen(it.value);
    if (it.kind === 'base' || it.kind === 'swatch') {
      if ((look[it.key] ?? null) === it.value && !this.sticky[it.key]) { this.stage.react('pose'); this.sfx('drHover', 0.6); this.renderSlip(); return; }
      const change = { [it.key]: it.value };
      // an outfit hides the everyday top (and some hide the bottoms): picking one takes the outfit off
      if ((it.key === 'top' || it.key === 'topCol') && look.outfit) change.outfit = null;
      if ((it.key === 'bottom' || it.key === 'botCol') && look.outfit && this.outfitHidesBottoms({ ...look, ...change })) change.outfit = null;
      this.commit(change, { at, item: it });
      return;
    }
    if (it.kind === 'none') {
      if (look[it.key] == null && !this.sticky[it.key]) { this.stage.react('pose'); this.renderSlip(); this.markCards(); return; }
      this.commit({ [it.key]: null }, { at, item: it });
      return;
    }
    const c = it.c;
    if (st === 'owned') {
      if (look[it.key] === it.value && !this.sticky[it.key]) { this.stage.react('pose'); this.sfx('drHover', 0.6); this.renderSlip(); this.markCards(); return; }
      this.commit({ [it.key]: it.value }, { at, rarity: c.rarity, item: it });
      return;
    }
    // not yours: it stays tried on; shop pieces can be bought from the slip, the rest say how you get them
    this.sticky[it.key] = it.value;
    delete this.hover[it.key];
    this.refreshModel(st === 'locked' ? 'denied' : 'try', { at });
    if (st === 'locked') { this.sfx('drDenied', 0.6); this.stampShow(true); } else this.sfx('drHover', 0.7);
    if (this.tryPose(it)) { /* turned to show it */ }
    this.renderSlip();
    this.markCards();
  }

  buy() {
    const it = this.sel ? this.items.get(this.sel) : null;
    if (!it?.c) return;
    const g = this.game, c = it.c, own = this.owned;
    if (status(g, it, own) !== 'shop') return;
    if (g.state.money < c.price) {
      this.sfx('error', 0.45);
      const b = this.slipEl.querySelector('.dr-act.buy');
      b?.classList.remove('shake'); void b?.offsetWidth; b?.classList.add('shake');
      return;
    }
    if (!g.spend(c.price, `Closet: ${c.name}`)) { this.sfx('error', 0.45); return; }
    this.sfx('drBuy', 0.7);
    this.markSeen(c.id);
    this.commit({ owned: [...new Set([...this.saved.owned, c.id])], [c.slot]: c.id }, { at: AT_KEY[c.slot], rarity: c.rarity, item: it });
    this.stampShow(false);
  }

  /** The Duck Head's slip: the itch.io page opens in a new tab and the duck is yours (we can't check: honour system). */
  followItch() {
    const got = claimItch(this.game);
    if (!got) return;
    this.S.seen = this.S.seen.filter((x) => x !== DUCK_ID); // it arrives with its NEW sticker, like any new piece
    this.sfx('drRustle', 0.6);
    this.refreshModel('try', { at: 1 });
    this.render();
    setTimeout(() => { if (this.isOpen) this.say('Quack! Thank you!'); }, 400);
  }

  /** Would these bottoms be hidden by the outfit you're wearing? */
  outfitHidesBottoms(look) {
    try {
      const a = avatarSpec(look), b = avatarSpec({ ...look, outfit: null });
      return a.bottom?.kind !== b.bottom?.kind || String(a.bottom?.col) !== String(b.bottom?.col);
    } catch { return false; }
  }

  /** Turn to show a piece (bags from behind, the rest from the front). */
  tryPose(it) {
    const t = TAB_BY_ID[TAB_OF[it.key]];
    if (t?.pose != null) { this.stage.pose(t.pose, 3); return true; }
    this.stage.pose(0.3, 2.4);
    return true;
  }

  /** Hover / keyboard focus: try it on for a moment. */
  preview(it) {
    if (this.hoverUid === it?.uid) return;
    this.hoverUid = it?.uid || null;
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => {
      const prev = JSON.stringify(this.hover);
      this.hover = it && it.kind !== 'none' ? { [it.key]: it.value } : it?.kind === 'none' ? { [it.key]: null } : {};
      if (it?.kind === 'cos') this.markSeen(it.value);
      if (JSON.stringify(this.hover) === prev) return;
      if (it) { this.refreshModel('hover', { at: AT_KEY[it.key] ?? 0.5 }); this.tryPose(it); }
      else this.refreshModel();
      this.markCards();
      if (it) this.showSlipFor(it);
    }, it ? 70 : 140);
  }

  /** The slip follows what you point at (and stays on it when you move to its button). */
  showSlipFor(it) {
    if (this.sel === it.uid) return;
    this.sel = it.uid;
    this.renderSlip();
  }

  /** Rebuild the model if what you'd see changed; kind: 'equip' | 'hover' | 'try' | 'denied' | null. */
  refreshModel(kind = null, { at = 0.5, rarity = 'common' } = {}) {
    const look = this.shown, st = this.stage;
    const changed = !this.lastLook || !sameLook(look, this.lastLook);
    if (changed) {
      this.lastLook = lookOf(look);
      const id = SLOTS.map((s) => look[s.id]).find((x) => x && hasPrint(x) && !printOf(x));
      if (id) loadPrint(id).then(() => { if (this.isOpen) { this.lastLook = null; this.refreshModel(); } });
      st.setLook(look, { pop: kind === 'equip' ? (rarity === 'ultra' || rarity === 'secret' ? 'big' : true) : false });
    }
    if (kind === 'equip') {
      if (!changed) st.squash(0.55);
      st.hop(at < 0.15 ? 0.6 : 1);
      equipPoof(st, at, rarity);
      if (Math.random() < 0.45) st.react(rarity === 'ultra' || rarity === 'secret' ? 'pose' : 'look');
    }
    else if (kind === 'hover' && changed) { if (audio.canPlay('dr-hover', 0.12)) this.sfx('drHover', 0.45); }
    else if (kind === 'denied') denied(st, at);
    // the "not yours yet" stamp shows while anything you don't own is on
    const own = this.owned;
    this.stampShow(SLOTS.some((s) => look[s.id] && !own.has(look[s.id])));
  }

  /** Update the worn / trying marks on the cards without redrawing the page. */
  markCards() {
    const look = this.saved, shown = this.shown;
    for (const el of this.scroll.querySelectorAll('[data-uid]')) {
      const it = this.items.get(el.dataset.uid);
      if (!it) continue;
      const worn = (look[it.key] ?? null) === it.value;
      el.classList.toggle('worn', worn);
      el.classList.toggle('trying', !worn && (shown[it.key] ?? null) === it.value);
      el.classList.toggle('sel', this.sel === it.uid);
    }
  }

  setTab(id, { focus = false } = {}) {
    if (!TAB_BY_ID[id]) return;
    if (id !== this.tab) {
      this.tab = id;
      this.sel = null;
      // try-ons belong to the page they were tried on from
      this.hover = {}; this.hoverUid = null; this.sticky = {};
      this.sfx('page', 0.5);
      this.render();
      this.scroll.scrollTop = 0;
      this.refreshModel();
    }
    const t = TAB_BY_ID[id];
    this.stage.zoomTo(t.focus);
    if (t.pose != null) this.stage.pose(t.pose, 3.5); else this.stage.pose(0.3, 1.8);
    if (focus) this.scroll.querySelector('[data-uid]')?.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------------------------------ feedback bits
  stampShow(on) {
    if (!this.stampEl) return;
    if (on === this.stampOn) return;
    this.stampOn = on;
    this.stampEl.classList.toggle('on', on);
  }

  say(text) {
    const h = this.stage.me;
    if (!h || !text) return;
    this.bubble(text);
    const onChar = talk(h, { vol: 0.55 });
    let i = 0;
    clearInterval(this.typeT);
    this.bubbleEl.querySelector('span').textContent = '';
    this.typeT = setInterval(() => {
      const s = this.bubbleEl.querySelector('span');
      if (!s || i >= text.length) { clearInterval(this.typeT); return; }
      s.textContent += text[i]; onChar(text[i]); i++;
    }, 42);
    clearTimeout(this.bubbleT);
    this.bubbleT = setTimeout(() => this.bubble(null), 1800 + text.length * 50);
  }

  bubble(text) {
    const el = this.bubbleEl;
    if (!el) return;
    if (!text) { el.classList.remove('on'); clearInterval(this.typeT); return; }
    el.innerHTML = '<span></span>';
    el.classList.add('on');
  }

  // ------------------------------------------------------------------------------------------ per frame
  frame(dt) {
    const st = this.stage;
    this.frames = (this.frames || 0) + 1;
    this.openT += dt;
    // opening: the room fades up in steps (from the menu), or the mirror's glass dissolves away in eight dithered steps
    if (!this.closing) {
      if (this.from === 'mirror') {
        st.mirror = Math.max(0, 1 - Math.floor(Math.max(0, this.openT - 0.25) * 10) / 8);
        st.fade = 1;
      } else st.fade = Math.min(1, Math.floor(this.openT * 8) / 2.4);
      if (this.openT > (this.from === 'mirror' ? 0.6 : 0.2) && !this.introDone) { this.introDone = true; this.sfx('drOpen', 0.6); setTimeout(() => { if (this.isOpen && !this.closing) { st.react('wave'); this.say(this.from === 'mirror' ? 'What to wear...' : pick(['What to wear...', 'Hmm, today...', 'Right then.'])); } }, 500); }
      if (st.fade >= 1) this.covering = true;
    } else {
      st.fade = Math.max(0, st.fade - dt * 3);
      this.covering = false;
    }
    this.pollPad(dt);
    if (st.focus !== this.zoomShown) {
      this.zoomShown = st.focus;
      for (const b of this.root.querySelectorAll('[data-zoom]')) b.classList.toggle('on', b.dataset.zoom === st.focus);
    }
    idle(st, dt);
    st.frame(dt);
    this.placeBubble();
    // card pictures: as many as fit in a few milliseconds
    const t0 = performance.now();
    while (this.thumbQ.length && performance.now() - t0 < 10) {
      const img = this.thumbQ.shift();
      if (!img.isConnected) continue;
      const it = this.items?.get(img.dataset.th);
      if (!it) continue;
      const url = thumbFor(this.game, it, this.saved, this.tsz);
      if (!url) { this.thumbQ.push(img); if (this.thumbQ.length === 1) break; continue; }
      const st2 = status(this.game, it, this.owned);
      if (st2 === 'locked') silhouette(url).then((u) => { img.src = u; });
      else img.src = url;
    }
  }

  placeBubble() {
    if (!this.bubbleEl?.classList.contains('on')) return;
    const p = this.stage.headScreen();
    this.bubbleEl.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
  }

  // ------------------------------------------------------------------------------------------ input
  bindInput() {
    const root = this.root, st = this.stage;
    root.addEventListener('click', (e) => {
      const tab = e.target.closest('.dr-tab');
      if (tab) { this.setTab(tab.dataset.tab); return; }
      const z = e.target.closest('[data-zoom]');
      if (z) { st.zoomTo(z.dataset.zoom); this.sfx('uiClick', 0.4); this.hintDone(); return; }
      const a = e.target.closest('[data-act]');
      if (a) {
        const act = a.dataset.act;
        if (act === 'close') { this.sfx('uiClick', 0.6); this.close(); }
        else if (act === 'buy') this.buy();
        else if (act === 'itch') this.followItch();
        else if (act === 'wear') { const it = this.items.get(this.sel); if (it) { this.sticky = {}; this.choose(it); } }
        else if (act === 'off') { const it = this.items.get(this.sel); if (it) this.commit({ [it.key]: null }, { at: AT_KEY[it.key], item: it }); }
        return;
      }
      const card = e.target.closest('[data-uid]');
      if (card && this.scroll.contains(card)) this.choose(this.items.get(card.dataset.uid));
    });
    // hover previews (mouse / pen only: a tap is a click)
    this.scroll.addEventListener('pointerover', (e) => {
      if (e.pointerType === 'touch') return;
      const card = e.target.closest('[data-uid]');
      if (card) this.preview(this.items.get(card.dataset.uid));
    });
    this.scroll.addEventListener('pointerleave', () => this.preview(null));
    this.scroll.addEventListener('focusin', (e) => {
      const card = e.target.closest('[data-uid]');
      if (card && card.matches(':focus-visible')) this.preview(this.items.get(card.dataset.uid));
    });
    // the stage: drag to spin (vertical drag pans when zoomed in), wheel / pinch to zoom, tap yourself for a pose
    const cv = st.canvas, ptrs = new Map();
    let drag = null, pinch = null;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture?.(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; drag = null; st.dragging = false; return; }
      drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), v: 0, moved: 0 };
      st.dragging = true;
    });
    cv.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 10) { st.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.d / d); pinch.d = d; this.hintDone(); }
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
      const k = 0.011;
      st.yaw += dx * k;
      st.poseYaw = null;
      const dtm = Math.max(1, now - drag.t) / 1000;
      drag.v = drag.v * 0.6 + ((dx * k) / dtm) * 0.4;
      if (Math.abs(dy) > Math.abs(dx) * 0.8) st.panBy(-dy);
      drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
      if (drag.moved > 6) this.hintDone();
    });
    const up = (e) => {
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (!drag) return;
      st.dragging = false;
      if (drag.moved < 8 && st.pick(e.clientX, e.clientY)) { st.react('pose'); this.sfx('drHover', 0.6); this.say(pick(LINES)); }
      else st.fling(performance.now() - drag.t < 120 ? drag.v : 0);
      drag = null;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); st.zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0012)); this.hintDone(); }, { passive: false });
    // keys (captured while open, so the game underneath never sees them)
    this.onKey = (e) => {
      if (!this.isOpen || this.closing) return;
      const k = e.key;
      e.stopPropagation();
      if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); this.close(); return; }
      if (k === 'q' || k === 'Q' || k === 'PageUp' || k === '[') { e.preventDefault(); this.tabStep(-1); return; }
      if (k === 'e' || k === 'E' || k === 'PageDown' || k === ']') { e.preventDefault(); this.tabStep(1); return; }
      if (k === 'z' || k === 'Z' || k === '+' || k === '=') { e.preventDefault(); this.zoomStep(1); return; }
      if (k === 'x' || k === 'X' || k === '-') { e.preventDefault(); this.zoomStep(-1); return; }
      if (k === 'b' || k === 'B') { e.preventDefault(); this.buy(); return; }
      const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] }[k];
      if (dir) { e.preventDefault(); this.moveFocus(dir); return; }
      if (k === 'Enter' || k === ' ') {
        const card = document.activeElement?.closest?.('[data-uid]');
        if (card && this.scroll.contains(card)) { e.preventDefault(); this.choose(this.items.get(card.dataset.uid)); }
      }
    };
    addEventListener('keydown', this.onKey, true);
  }

  /** Scroll the page (only the page) so a card is in view. */
  reveal(el, center = false) {
    const sc = this.scroll, r = el.getBoundingClientRect(), b = sc.getBoundingClientRect();
    if (center) sc.scrollTop += r.top + r.height / 2 - (b.top + b.height / 2);
    else if (r.top < b.top + 8) sc.scrollTop -= b.top + 8 - r.top;
    else if (r.bottom > b.bottom - 8) sc.scrollTop += r.bottom - (b.bottom - 8);
  }

  hintDone() { if (!this.hintEl.classList.contains('done')) this.hintEl.classList.add('done'); }

  tabStep(d) {
    const i = TABS.findIndex((t) => t.id === this.tab);
    this.setTab(TABS[(i + d + TABS.length) % TABS.length].id, { focus: true });
  }

  zoomStep(d) {
    const order = ['feet', 'legs', 'full', 'body', 'face'];
    const st = this.stage, cur = order.indexOf(st.focus);
    const i = cur < 0 ? 2 : cur;
    st.zoomTo(order[Math.max(0, Math.min(order.length - 1, d > 0 ? (i < 2 ? 3 : i + 1) : i > 2 ? 2 : i - 1))]);
    this.sfx('uiClick', 0.35);
  }

  /** Spatial focus moves across the cards and chips (works for keys and the pad alike). */
  moveFocus([dx, dy]) {
    const els = [...this.scroll.querySelectorAll('[data-uid]')];
    if (!els.length) return;
    const cur = document.activeElement?.closest?.('[data-uid]');
    if (!cur || !this.scroll.contains(cur)) { els[0].focus(); return; }
    const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bs = Infinity;
    for (const el of els) {
      if (el === cur) continue;
      const q = el.getBoundingClientRect(), qx = q.left + q.width / 2, qy = q.top + q.height / 2;
      const along = (qx - cx) * dx + (qy - cy) * dy, across = Math.abs((qx - cx) * dy) + Math.abs((qy - cy) * dx);
      if (along <= 4) continue;
      const s = along + across * 2.5;
      if (s < bs) { bs = s; best = el; }
    }
    if (!best) { if (dy < 0) this.tabsEl.querySelector('.on')?.focus(); return; }
    best.focus({ preventScroll: true });
    this.reveal(best);
    this.sfx('uiHover', 0.25);
  }

  /** Gamepad: d-pad / left stick move, A wears, B backs out, X takes off, Y buys, bumpers switch tabs, triggers zoom,
   *  right stick spins (and pans up and down when zoomed in). */
  pollPad(dt) {
    const pads = navigator.getGamepads?.() || [];
    const p = [...pads].find((x) => x && x.connected);
    if (!p) return;
    const B = (i) => !!p.buttons[i]?.pressed, prev = this.pads;
    const edge = (i) => B(i) && !prev[i];
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0, rx = p.axes[2] || 0, ry = p.axes[3] || 0;
    this.padRep = Math.max(0, (this.padRep || 0) - dt);
    const dir = B(14) || ax < -0.6 ? [-1, 0] : B(15) || ax > 0.6 ? [1, 0] : B(12) || ay < -0.6 ? [0, -1] : B(13) || ay > 0.6 ? [0, 1] : null;
    if (dir && this.padRep <= 0) { this.moveFocus(dir); this.padRep = this.padHeld ? 0.11 : 0.3; this.padHeld = true; }
    if (!dir) this.padHeld = false;
    if (edge(0)) { const c = document.activeElement?.closest?.('[data-uid]'); if (c && this.scroll.contains(c)) this.choose(this.items.get(c.dataset.uid)); }
    if (edge(1)) this.close();
    if (edge(2)) { const it = this.items.get(this.sel); if (it && it.kind === 'cos' && this.saved[it.key] === it.value) this.commit({ [it.key]: null }, { at: AT_KEY[it.key], item: it }); }
    if (edge(3)) this.buy();
    if (edge(4)) this.tabStep(-1);
    if (edge(5)) this.tabStep(1);
    if (edge(6)) this.zoomStep(-1);
    if (edge(7)) this.zoomStep(1);
    if (Math.abs(rx) > 0.2) { this.stage.yaw += rx * dt * 3; this.stage.poseYaw = null; this.stage.yawVel = 0; }
    if (Math.abs(ry) > 0.3) this.stage.panBy(-ry * dt * 400);
    this.pads = Object.fromEntries(p.buttons.map((b, i) => [i, b.pressed]));
  }

  dispose() {
    removeEventListener('keydown', this.onKey, true);
    this.ro?.disconnect();
    this.stage?.dispose();
    this.root?.remove();
    this.root = null;
  }
}
