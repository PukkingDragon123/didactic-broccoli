// The closet: a simple shop + wardrobe for your character, opened from the main menu by clicking yourself (and from
// the mirror in your room, src/cosmetics/wardrobe.js, with a stage of its own instead of the menu crew).
// Tabs for hats / outfits / face items / bags / shoes (cards with a rendered thumbnail, a rarity stamp, price, Buy /
// Wear / Take off) and your free base look (body, skin, hair, clothes). Clicking a card tries it on (preview, not
// saved); buying spends yen (state.money) and puts it on. Pieces the closet doesn't sell say how you get them
// (an achievement, a side quest, a capsule bonus, the kirakira-closet.jp web shop, a thrift find). Every saved change
// emits game.events 'avatar'. Drag the 3D view to turn.
import './closet.css';
import { iconHTML, defineIcon } from '../gfx/icons.js';
import { audio } from '../core/audio.js';
import { COSMETICS, COSMETIC_BY_ID, SLOTS, cosmeticPreview } from '../people/cosmetics.js';
import { LOOK, normalizeAvatar } from '../people/avatar.js';
import { sourceOf, RARITY_RANK } from '../cosmetics/catalog.js';
import { cosmeticThumb } from '../cosmetics/thumbs.js';
import { hasPrint, printOf, loadPrint } from '../cosmetics/prints.js';
import { RARITIES } from '../data/rarity.js';
import { SERIES_BY_ID } from '../data/series/index.js';

defineIcon('cos_hat', { rows: [
  '................',
  '.......YY.......',
  '......YZZy......',
  '.......yy.......',
  '.....RRRRRR.....',
  '....RQQRRRRr....',
  '...RQRRRRRRRr...',
  '...RRRRRRRRRr...',
  '..RRRRRRRRRRRr..',
  '..RRRRRRRRRRRr..',
  '..wWWWWWWWWWWu..',
  '..wWuWuWuWuWuu..',
  '..wuuuuuuuuuuu..',
  '................',
  '................',
  '................',
] });
defineIcon('cos_shirt', { rows: [
  '................',
  '................',
  '....EEe..eEE....',
  '..EEFEeeeeEEEe..',
  '.EFFEEEEEEEEEEe.',
  '.EFEEEEEEEEEEEe.',
  '.eEEEEEEEEEEEee.',
  '..eeEEEEEEEEee..',
  '....EEEEEEEEe...',
  '....EYYEEEEEe...',
  '....EEEEEEEEe...',
  '....EEEEEEEEe...',
  '....EEEEEEEEe...',
  '....eeeeeeeee...',
  '................',
  '................',
] });
defineIcon('cos_glasses', { rows: [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.KKKKKKKKKKKKKK.',
  '.KDDDDDKKDDDDDK.',
  '.KDCDDDKKDCDDDK.',
  '.KDDDDDK.KDDDDK.',
  '..KDDDK...KDDK..',
  '...KKK.....KK...',
  '................',
  '................',
  '................',
  '................',
  '................',
] });
defineIcon('cos_hanger', { rows: [
  '................',
  '.......gg.......',
  '......g..g......',
  '.........g......',
  '........g.......',
  '.......gg.......',
  '......glLg......',
  '.....gL..lg.....',
  '....gL....lg....',
  '...gL......lg...',
  '..gL........lg..',
  '.gLllllllllllgg.',
  '.gGGGGGGGGGGGGG.',
  '................',
  '................',
  '................',
] });

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const yen = (n) => '¥' + Math.max(0, Math.floor(n)).toLocaleString('en-US');
const ic = (n, s = 2, c = '') => iconHTML(n, s, c);
const hexCss = (c) => '#' + c.toString(16).padStart(6, '0');
const TABS = [...SLOTS, { id: 'look', name: 'Look', icon: 'people' }];

export class Closet {
  constructor(game, crew) {
    this.game = game;
    this.crew = crew;
    this.tab = 'outfit';
    this.filter = 'all';
    this.isOpen = false;
    this.thumbs = new Map(); // key -> data URL
    this.queue = [];
    const root = this.root = document.createElement('div');
    root.className = 'cl hidden';
    root.innerHTML = `
      <div class="cl-hint">${ic('rotate', 2)}<span class="cl-hint-t">Drag to turn around</span></div>
      <div class="cl-panel" role="dialog" aria-label="Closet">
        <div class="cl-head">
          <div class="cl-title">${ic('cos_hanger', 2)}<span>Closet</span></div>
          <div class="cl-wallet">${ic('coin', 2)}<span class="cl-yen"></span></div>
        </div>
        <div class="cl-tabs" role="tablist"></div>
        <div class="cl-body"></div>
        <div class="cl-foot">
          <div class="cl-note"></div>
          <button class="cl-back">${ic('back', 2)}<span>Back</span></button>
        </div>
      </div>`;
    document.body.appendChild(root);
    this.panel = root.querySelector('.cl-panel');
    this.body = root.querySelector('.cl-body');
    this.tabsEl = root.querySelector('.cl-tabs');
    this.yenEl = root.querySelector('.cl-yen');
    this.noteEl = root.querySelector('.cl-note');
    this.hintEl = root.querySelector('.cl-hint');
    this.tabsEl.innerHTML = TABS.map((t) => `<button class="cl-tab" data-tab="${t.id}" role="tab">${ic(t.icon, 2)}<span>${t.name}</span></button>`).join('');
    root.querySelector('.cl-back').addEventListener('click', () => { this.sfx('uiClick'); this.close(); });
    this.panel.addEventListener('click', (e) => this.onClick(e));
    this.panel.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse' && e.target.closest('button:not(.off)') && e.target.closest('button') !== this._hov) { this._hov = e.target.closest('button'); this.sfx('uiHover', 0.2); } });
    // drag the 3D view to turn yourself around; a tap on yourself does a little trick
    this.onDown = (e) => {
      if (!this.isOpen || e.target.closest?.('.cl-panel') || e.button > 0) return;
      if (e.target !== game.renderer.renderer.domElement && !e.target.closest?.('.cl')) return;
      this.drag = { x: e.clientX, y: e.clientY, x0: e.clientX, moved: 0 };
      crew.dragging = true;
    };
    this.onMove = (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x;
      this.drag.x = e.clientX; this.drag.moved = Math.max(this.drag.moved, Math.abs(e.clientX - this.drag.x0) + Math.abs(e.clientY - this.drag.y));
      crew.dragYaw = (crew.dragYaw || 0) + dx * 0.012;
      if (Math.abs(dx) > 0) this.hintEl.classList.add('done');
    };
    this.onUp = (e) => {
      if (!this.drag) return;
      const tap = this.drag.moved < 8;
      this.drag = null; crew.dragging = false;
      if (tap) {
        const ndc = [(e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1];
        crew.ray.setFromCamera({ x: ndc[0], y: ndc[1] }, game.camera);
        if (crew.ray.intersectObject(crew.proxy, false).length) crew.react();
      }
    };
    this.onKey = (e) => { if (this.isOpen && e.key === 'Escape') { e.preventDefault(); this.close(); } };
    window.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.onKey);
  }

  /** The saved avatar record (state.avatar), completed if an old save lacks fields. */
  get saved() {
    const a = this.game.state.avatar;
    if (!a || !Array.isArray(a.owned) || !a.body) this.game.state.avatar = normalizeAvatar(a);
    return this.game.state.avatar;
  }
  sfx(n, v = 0.5) { try { audio.play(n, { vol: v }); } catch { /* audio not ready */ } }

  /** Screen rectangle the panel leaves free (the character is framed inside it). */
  freeRect() {
    const W = innerWidth, H = innerHeight;
    const r = this.isOpen ? this.panel.getBoundingClientRect() : null;
    if (r && r.width) {
      if (r.top > H * 0.3 && r.width > W * 0.8) return { x: 0, y: 0, w: W, h: Math.max(120, r.top) }; // bottom sheet
      return { x: 0, y: 0, w: Math.max(160, r.left), h: H };
    }
    return W < 700 && H > W ? { x: 0, y: 0, w: W, h: H * 0.46 } : { x: 0, y: 0, w: W * 0.55, h: H };
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.preview = { ...this.saved };
    this.root.classList.remove('hidden', 'closing');
    this.hintEl.classList.remove('done');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hintEl.classList.add('done'), 7000);
    document.body.classList.add('closet-on');
    this.render();
    this.sfx('page', 0.5);
    const loop = () => {
      if (!this.isOpen) return;
      this.raf = requestAnimationFrame(loop);
      this.tickThumbs();
    };
    loop();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    cancelAnimationFrame(this.raf);
    // anything only tried on comes off again
    if (JSON.stringify(this.lookOf(this.preview)) !== JSON.stringify(this.lookOf(this.saved))) this.crew.setLook(this.saved);
    this.root.classList.add('closing');
    document.body.classList.remove('closet-on');
    setTimeout(() => { if (!this.isOpen) this.root.classList.add('hidden'); }, 220);
    this.crew.closeCloset();
  }

  lookOf(a) { const { owned, ...rest } = a; return rest; }

  // ------------------------------------------------------------------ rendering
  render() {
    for (const b of this.tabsEl.children) b.classList.toggle('on', b.dataset.tab === this.tab);
    this.yenEl.textContent = yen(this.game.state.money);
    this.body.innerHTML = this.tab === 'look' ? this.lookHTML() : this.itemsHTML(this.tab);
    this.body.querySelectorAll('img[data-th]').forEach((img) => { const u = this.thumbs.get(img.dataset.th); if (u) img.src = u; else this.queue.push(img.dataset.th); });
    this.renderNote();
  }

  itemsHTML(slot) {
    const S = this.saved, P = this.preview, money = this.game.state.money;
    const own = (c) => S.owned.includes(c.id);
    // thrift finds only once you own them (Off-Hobby); everything else shows, the locked ones with how to get them
    const all = COSMETICS.filter((c) => c.slot === slot && (!c.thrift || own(c)));
    const rank = (c) => (S[slot] === c.id ? 0 : own(c) ? 1 : c.shop || (!c.web && !c.exclusive && !c.thrift) ? 2 : c.web ? 3 : 4);
    const items = all.filter((c) => this.filter !== 'owned' || own(c))
      .sort((a, b) => rank(a) - rank(b) || (RARITY_RANK[a.rarity] ?? 0) - (RARITY_RANK[b.rarity] ?? 0) || a.price - b.price);
    const cards = items.map((c) => {
      const owned = own(c), worn = S[slot] === c.id, trying = P[slot] === c.id && !worn;
      const R = RARITIES[c.rarity] || RARITIES.common;
      const sellable = c.shop || (!c.web && !c.exclusive && !c.thrift);
      let btn;
      if (worn) btn = `<button class="cl-btn" data-act="off" data-id="${c.id}">${ic('minus', 2)}<span>Take off</span></button>`;
      else if (owned) btn = `<button class="cl-btn go" data-act="wear" data-id="${c.id}">${ic('check', 2)}<span>Wear</span></button>`;
      else if (sellable) btn = `<button class="cl-btn buy${money < c.price ? ' off' : ''}" data-act="buy" data-id="${c.id}">${ic('cart', 2)}<span>Buy</span><b>${yen(c.price)}</b></button>`;
      else btn = `<div class="cl-how">${this.howHTML(c)}</div>`;
      const tag = worn ? `<i class="cl-tag on">Wearing</i>` : trying ? `<i class="cl-tag try">Trying on</i>` : owned ? `<i class="cl-tag own">${ic('check', 1)}Owned</i>` : !sellable ? `<i class="cl-tag lock">${ic('lock', 1)}</i>` : '';
      return `<div class="cl-card${worn ? ' worn' : ''}${trying ? ' trying' : ''}${!owned && !sellable ? ' locked' : ''}" data-id="${c.id}" style="--rc:${R.color}">
        <button class="cl-pic" data-act="try" data-id="${c.id}" aria-label="Try on ${esc(c.name)}"><img data-th="${this.thumbKey(c.id)}" alt="" width="160" height="160" draggable="false">${tag}<i class="cl-rar">${esc(R.name)}</i></button>
        <div class="cl-name">${esc(c.name)}</div>
        <div class="cl-desc">${esc(c.desc)}</div>
        ${btn}
        <div class="cl-why"></div>
      </div>`;
    }).join('');
    const n = all.filter(own).length;
    const tip = slot === 'hat' ? 'Hats sit on top of your hair or hood.' : slot === 'bag' ? 'Bags show from behind: drag to turn around.' : slot === 'shoes' ? 'Look down in first person to admire them.' : '';
    return `<div class="cl-tools"><span class="cl-tip">Tap a card to try it on. ${tip}</span>
      <span class="cl-filt"><button class="cl-chip${this.filter === 'all' ? ' on' : ''}" data-act="filter" data-v="all">All ${all.length}</button><button class="cl-chip${this.filter === 'owned' ? ' on' : ''}" data-act="filter" data-v="owned">Owned ${n}</button></span></div>
      <div class="cl-grid">${cards || '<div class="cl-empty">Nothing here yet. Earn some!</div>'}</div>`;
  }

  /** Where a piece the closet doesn't sell comes from. */
  howHTML(c) {
    const g = this.game, s = sourceOf(c);
    if (s.kind === 'ach') {
      const a = g.os?.achievements?.list?.().find((x) => x.id === s.id);
      const hidden = a?.hidden && a.got == null;
      return `${ic('os_trophy', 1)}<span>Achievement<b>${esc(hidden ? 'Hidden: keep playing' : a?.name || 'Secret')}</b></span>`;
    }
    if (s.kind === 'quest') {
      const q = g.sideQuests?.get?.(s.id);
      return `${ic('star', 1)}<span>Side quest<b>${esc(q ? `${q.title}${q.giverName ? ` (${q.giverName})` : ''}` : 'Ask around the lane')}</b></span>`;
    }
    if (s.kind === 'capsule') return `${ic('capsule', 1)}<span>Rare capsule bonus<b>${esc(SERIES_BY_ID[s.id]?.name || 'a gacha series')}</b></span>`;
    if (s.kind === 'web') return `${ic('cart', 1)}<span>Online, ${yen(c.price)}<b>kirakira-closet.jp</b></span>`;
    return `${ic('cart', 1)}<span>Second-hand<b>Off-Hobby thrift</b></span>`;
  }

  lookHTML() {
    const S = this.saved;
    const chips = (key, list) => `<div class="cl-chips">${list.map((o) => `<button class="cl-chip${S[key] === o.id ? ' on' : ''}" data-act="base" data-k="${key}" data-v="${o.id}">${esc(o.name)}</button>`).join('')}</div>`;
    const sw = (key, list) => `<div class="cl-swatches">${list.map((o) => `<button class="cl-sw${S[key] === o.id ? ' on' : ''}" data-act="base" data-k="${key}" data-v="${o.id}" style="--c:${hexCss(o.col)}" aria-label="${esc(o.id)}"></button>`).join('')}</div>`;
    const row = (label, html) => `<div class="cl-row"><div class="cl-lbl">${label}</div>${html}</div>`;
    return `<div class="cl-tip">Your base look is free to change any time.</div>
      ${row('Body', chips('body', LOOK.body))}
      ${row('Skin', sw('skin', LOOK.skin))}
      ${row('Hair', chips('hair', LOOK.hair))}
      ${row('Hair colour', sw('hairCol', LOOK.hairCol))}
      ${row('Top', chips('top', LOOK.top))}
      ${row('Top colour', sw('topCol', LOOK.topCol))}
      ${row('Bottoms', chips('bottom', LOOK.bottom))}
      <button class="cl-btn dice" data-act="random">${ic('sparkle', 2)}<span>Surprise me</span></button>`;
  }

  renderNote() {
    const S = this.saved, P = this.preview;
    const trying = SLOTS.map((s) => P[s.id] !== S[s.id] && P[s.id] ? COSMETIC_BY_ID[P[s.id]] : null).filter(Boolean);
    if (!trying.length) { this.noteEl.innerHTML = ''; this.noteEl.classList.remove('show'); return; }
    this.noteEl.classList.add('show');
    this.noteEl.innerHTML = `<span>Trying on: <b>${trying.map((c) => esc(c.name)).join(', ')}</b></span><button class="cl-mini" data-act="reset">${ic('close', 1)}Take off</button>`;
  }

  // ------------------------------------------------------------------ thumbnails
  thumbKey(id) {
    const c = COSMETIC_BY_ID[id];
    if (c.slot === 'hat' || c.slot === 'face') return id;
    const S = this.saved;
    return `${id}|${S.body}|${S.skin}|${S.hair}|${S.hairCol}|${S.top}|${S.topCol}|${S.bottom}`;
  }

  tickThumbs() {
    // one new render per frame (cached ones go straight in)
    for (let n = 0; n < 12; n++) {
      const key = this.queue.shift();
      if (!key) return;
      const id = key.split('|')[0];
      let fresh = false;
      if (!this.thumbs.has(key)) {
        // photo-print tees wait for their print
        if (hasPrint(id) && !printOf(id)) { loadPrint(id).then(() => { if (this.isOpen) this.queue.push(key); }); continue; }
        const t0 = performance.now();
        const url = cosmeticThumb(this.game, id, { size: 192, look: this.saved });
        fresh = performance.now() - t0 > 4;
        if (url) this.thumbs.set(key, url);
      }
      const u = this.thumbs.get(key);
      if (u) this.body.querySelectorAll(`img[data-th="${CSS.escape(key)}"]`).forEach((img) => { img.src = u; });
      if (fresh) return;
    }
  }

  // ------------------------------------------------------------------ actions
  onClick(e) {
    const tab = e.target.closest('.cl-tab');
    if (tab) { if (tab.dataset.tab !== this.tab) { this.tab = tab.dataset.tab; this.sfx('uiClick', 0.5); this.render(); this.body.scrollTop = 0; } return; }
    const b = e.target.closest('[data-act]');
    if (!b || !this.panel.contains(b)) return;
    const act = b.dataset.act, id = b.dataset.id, c = COSMETIC_BY_ID[id];
    if (act === 'try') this.tryOn(c);
    else if (act === 'buy') this.buy(c, b);
    else if (act === 'wear') this.wear(c);
    else if (act === 'off') { this.commit({ [c.slot]: null }); this.sfx('pickup', 0.5); }
    else if (act === 'filter') { this.filter = b.dataset.v; this.sfx('uiClick', 0.5); this.render(); }
    else if (act === 'reset') { this.preview = { ...this.saved }; this.crew.setLook(this.preview); this.sfx('uiClick'); this.render(); }
    else if (act === 'base') { this.commit({ [b.dataset.k]: b.dataset.v }, false); this.sfx('uiClick', 0.5); }
    else if (act === 'random') {
      const r = (l) => l[Math.floor(Math.random() * l.length)].id;
      this.commit({ body: r(LOOK.body), skin: r(LOOK.skin), hair: r(LOOK.hair), hairCol: r(LOOK.hairCol), top: r(LOOK.top), topCol: r(LOOK.topCol), bottom: r(LOOK.bottom) }, 'spin');
      this.sfx('pop', 0.6);
    }
  }

  tryOn(c) {
    const P = this.preview, S = this.saved;
    P[c.slot] = P[c.slot] === c.id ? (S[c.slot] === c.id ? null : S[c.slot]) : c.id;
    this.crew.setLook(P);
    if (hasPrint(c.id) && !printOf(c.id)) loadPrint(c.id).then(() => { if (this.isOpen && this.preview[c.slot] === c.id) this.crew.setLook(this.preview); });
    if (P[c.slot] === c.id) this.crew.react(c.id);
    this.sfx('pickup', 0.5);
    this.render();
  }

  wear(c) {
    this.commit({ [c.slot]: c.id }, c.id);
    this.sfx('pickup', 0.6);
    if (hasPrint(c.id) && !printOf(c.id)) loadPrint(c.id).then(() => this.game.events.emit('avatar', this.game.state.avatar));
  }

  buy(c, btn) {
    const S = this.saved, g = this.game;
    if (S.owned.includes(c.id)) { this.wear(c); return; }
    if (!(c.shop || (!c.web && !c.exclusive && !c.thrift))) return; // rewards and web / thrift pieces aren't sold here
    if (g.state.money < c.price) {
      const why = btn.parentElement.querySelector('.cl-why');
      why.textContent = `You need ${yen(c.price - g.state.money)} more`;
      why.classList.remove('shake'); void why.offsetWidth; why.classList.add('shake');
      this.sfx('error', 0.45);
      return;
    }
    g.spend(c.price);
    this.commit({ owned: [...S.owned, c.id], [c.slot]: c.id }, c.id);
    this.sfx('purchase', 0.6);
    this.root.querySelector('.cl-wallet').classList.remove('flash'); void this.root.offsetWidth; this.root.querySelector('.cl-wallet').classList.add('flash');
  }

  /** Save a change to your look (and keep any other try-ons). react: an item id / 'spin' to celebrate, false = no. */
  commit(change, react = null) {
    const A = this.game.state.avatar = normalizeAvatar({ ...this.saved, ...change });
    const P = this.preview = { ...this.preview, ...change };
    // the preview follows the saved look, except for slots where you're still trying on something you don't own
    for (const sl of SLOTS) { const id = P[sl.id]; if (!(id && id !== A[sl.id] && !A.owned.includes(id))) P[sl.id] = A[sl.id]; }
    for (const k of ['body', 'skin', 'hair', 'hairCol', 'top', 'topCol', 'bottom']) P[k] = A[k];
    this.crew.setLook(P);
    if (react !== false && react !== null) this.crew.react(react);
    else if (react === null) this.crew.react('spin');
    this.game.save();
    this.game.events.emit('avatar', this.game.state.avatar);
    this.render();
  }

  dispose() {
    this.isOpen = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('keydown', this.onKey);
    document.body.classList.remove('closet-on');
    this.root.remove();
  }
}
