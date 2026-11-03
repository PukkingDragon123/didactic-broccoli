// Capsule 98: the desktop operating system on the garage PC. It lives ON the monitor: src/pc/PC.js warps this DOM
// layer onto the 3D screen quad every frame while you sit at the desk (and hides it, costing nothing, when you don't).
//
// ================================================================== platform API (game.os)
//   game.os.registerApp({ id, name, icon, open(win, args), unlocked?(), group?, desktop?, multi?, w?, h?, menu? })
//       Adds a program (desktop icon + Start > Programs > group). open() builds the window body: win.body is a
//       plain DOM element. win: setTitle(s), setIcon(n), menubar([{ label, items: [menu items] }]), status(...parts),
//       busy(on), close(), focus(), onClose(fn), onResize(fn), onArgs = fn(args) (re-open of a single-instance app),
//       flash() (taskbar blink), el, body, w, h.
//   game.os.open(id, args)                      -> win | null   (powers the PC's desktop only while it is on)
//   game.os.notify({ app, title, body, icon, onClick, sound, news })   tray balloon (queued while you're away from
//       the PC; news: true also posts a HUD toast then)
//   game.os.dialog({ title, icon: 'info'|'warn'|'error'|'question', text | html, buttons: [{ label, value, default,
//       cancel }], input?: { value, placeholder } })  -> Promise<value | { value, input }>
//   game.os.alert(text, title?, icon?), game.os.confirm(text, title?) -> Promise<boolean>
//   game.os.qte({ title, prompt, choices: [{ label, value }], seconds, icon })  -> Promise<value | null on timeout>
//       a timed choice with a countdown bar (waits until you sit at the PC if you aren't there yet)
//   game.os.menu(items, { x, y })              context menu; items: { label, icon, action, disabled, checked, sub, sep }
//   game.os.sound(name)                         OS sound (respects Settings > Sounds)
//   game.os.on(evt, fn) / off                   'power' (on|off), 'seat' (true|false), 'app' ({ id, win })
//   sub-systems (each documented in its own module under src/os/apps/):
//     game.os.browser.registerSite({ domain, title, favicon, render(page, path, nav, ctx) }), .open(url)
//     game.os.messenger.thread({ id, name, avatar, kind }) -> thread (.post, .onReply, .choose, .unread)
//     game.os.mail.send({ from, subject, body, spam?, attachments? })
//     game.os.phone.register(number, { name, onCall(call) }), game.os.phone.call(number)
//     game.os.achievements.define({ id, name, desc, icon, reward?, hidden? }), .unlock(id)
//     game.os.bank (statement + bills + loans), game.os.codex (people / yokai entries)
// Money lines on the Bank statement get their label from an optional last argument:
//   game.spend(v, 'Electricity bill'), game.addMoney(v, quiet, 'Museum tickets').
// Save data: game.state.os (ensureState), one sub-key per app.
import './os.css';
import { ensureState } from '../game/stateExt.js';
import { registerOSIcons, ic, glyph, glyphURL, wallpaperURL, WALLPAPERS } from './art.js';
import { registerOSSounds, osSound } from './sounds.js';
import { now, clockText, dateText } from './time.js';

// ------------------------------------------------------------------ tiny DOM helpers
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape for HTML and keep to glyphs the pixel fonts have. */
export const esc = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[—–]/g, '-').replace(/…/g, '...').replace(/[&<>"']/g, (c) => ESC[c]);
export function h(tag, props = null, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
export const yen = (n) => (n < 0 ? '-' : '') + '¥' + Math.abs(Math.round(n)).toLocaleString('en-US');

export const TASKBAR_H = 30;
const DEFAULTS = {
  v: 1, wallpaper: 'teal', saver: 'capsules', scanlines: true, sounds: true, volume: 1, h24: true, keyclicks: true,
  icons: {}, flags: {},
};

// ------------------------------------------------------------------ pixel cursors
const CURSORS = {
  arrow: { hot: [0, 0], rows: ['K...........', 'KK..........', 'KWK.........', 'KWWK........', 'KWWWK.......', 'KWWWWK......', 'KWWWWWK.....', 'KWWWWWWK....', 'KWWWWWWWK...', 'KWWWWWWWWK..', 'KWWWWWWWWWK.', 'KWWWWWWKKKKK', 'KWWWKWWK....', 'KWWKKWWK....', 'KWK..KWWK...', 'KK...KWWK...', 'K.....KWWK..', '......KWWK..', '.......KK...'] },
  hand: { hot: [5, 0], rows: ['.....KK.........', '....KWWK........', '....KWWK........', '....KWWK........', '....KWWKKK......', '....KWWKWWKKK...', '....KWWKWWKWWKK.', 'KKK.KWWKWWKWWKWK', 'KWWKKWWWWWWWWKWK', 'KWWWKWWWWWWWWWWK', '.KWWKWWWWWWWWWWK', '..KWWWWWWWWWWWWK', '..KWWWWWWWWWWWK.', '...KWWWWWWWWWWK.', '...KWWWWWWWWWK..', '....KWWWWWWWWK..', '....KKKKKKKKKK..'] },
  text: { hot: [3, 8], rows: ['KKK.KKK', '...K...', '...K...', '...K...', '...K...', '...K...', '...K...', '...K...', '...K...', '...K...', '...K...', '...K...', '...K...', '...K...', '...K...', 'KKK.KKK'] },
  wait: { hot: [6, 10], rows: ['KKKKKKKKKKKKK', 'KWWWWWWWWWWWK', '.KKKKKKKKKKK.', '.KWWWWWWWWWK.', '.KWYWYWYWYWK.', '..KWYWYWYWK..', '...KWYWYWK...', '....KWYWK....', '.....KYK.....', '.....KYK.....', '....KWWWK....', '...KWWYWWK...', '..KWWWWWWWK..', '.KWWWYWYWWWK.', '.KWYWYWYWYWK.', '.KYYYYYYYYYK.', '.KKKKKKKKKKK.', 'KWWWWWWWWWWWK', 'KKKKKKKKKKKKK'] },
  move: { hot: [7, 7], rows: ['.......K.......', '......KWK......', '.....KWWWK.....', '....KKKWKKK....', '...K...W...K...', '..KK...W...KK..', '.KWK...W...KWK.', 'KWWWWWWWWWWWWWK', '.KWK...W...KWK.', '..KK...W...KK..', '...K...W...K...', '....KKKWKKK....', '.....KWWWK.....', '......KWK......', '.......K.......'] },
  ns: { hot: [4, 8], rows: ['....K....', '...KWK...', '..KWWWK..', '.KWWWWWK.', 'KKKKWKKKK', '....W....', '....W....', '....W....', '....W....', '....W....', '....W....', '....W....', 'KKKKWKKKK', '.KWWWWWK.', '..KWWWK..', '...KWK...', '....K....'] },
  ew: { hot: [8, 4], rows: ['....K.......K....', '...KK.......KK...', '..KWK.......KWK..', '.KWWKWWWWWWWKWWK.', 'KWWWWWWWWWWWWWWWK', '.KWWKWWWWWWWKWWK.', '..KWK.......KWK..', '...KK.......KK...', '....K.......K....'] },
  nwse: { hot: [6, 6], rows: ['KKKKKK.......', 'KWWWK........', 'KWWK.........', 'KWKWK........', 'KK.KWK.......', 'K...KWK......', '.....KWK.....', '......KWK...K', '.......KWK.KK', '........KWKWK', '.........KWWK', '........KWWWK', '.......KKKKKK'] },
  nesw: { hot: [6, 6], rows: ['.......KKKKKK', '........KWWWK', '.........KWWK', '........KWKWK', '.......KWK.KK', '......KWK...K', '.....KWK.....', 'K...KWK......', 'KK.KWK.......', 'KWKWK........', 'KWWK.........', 'KWWWK........', 'KKKKKK.......'] },
};
const FALLBACK_CUR = { arrow: 'default', hand: 'pointer', text: 'text', wait: 'wait', move: 'move', ns: 'ns-resize', ew: 'ew-resize', nwse: 'nwse-resize', nesw: 'nesw-resize' };
function cursorCSS(name, s) {
  const c = CURSORS[name];
  const cv = document.createElement('canvas');
  cv.width = Math.max(...c.rows.map((r) => r.length)) * s; cv.height = c.rows.length * s;
  const g = cv.getContext('2d');
  c.rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = ch === 'K' ? '#141010' : ch === 'Y' ? '#e8b830' : '#fbf6ea';
    g.fillRect(x * s, y * s, s, s);
  }));
  return `url(${cv.toDataURL()}) ${c.hot[0] * s} ${c.hot[1] * s}, ${FALLBACK_CUR[name]}`;
}

// ------------------------------------------------------------------ the OS
export class CapsuleOS {
  constructor(game) {
    this.game = game;
    registerOSIcons();
    registerOSSounds();
    this.st = ensureState(game, 'os', DEFAULTS);
    this.apps = new Map();
    this.order = [];
    this.wins = [];
    this.z = 10;
    this.active = null;
    this.power = 'off'; // 'off' | 'boot' | 'on' | 'halt'
    this.seated = false;
    this.W = 800; this.H = 600; // logical resolution (set by the PC from the window size)
    this.zoom = 1;
    this.inv = null; // client -> local inverse homography (3x3 row-major), set by the PC
    this.pending = []; // notifications waiting for you to sit down
    this.listeners = {};
    this.menus = [];
    this.buildDOM();
    this.setResolution(800, 600, 1);
    this.applyWallpaper();
    this.installInput();
    this.mirrorNews();
  }

  // ------------------------------------------------------------------ events
  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return () => this.off(evt, fn); }
  off(evt, fn) { const l = this.listeners[evt]; if (l) l.splice(l.indexOf(fn) >>> 0, 1); }
  emit(evt, data) { for (const fn of [...(this.listeners[evt] || [])]) { try { fn(data); } catch (e) { console.warn('os event', evt, e); } } }
  sound(name, opts) { osSound(this.game, name, opts); }

  // ------------------------------------------------------------------ DOM
  buildDOM() {
    const layer = this.layer = h('div', { class: 'c98-layer hidden' });
    const root = this.root = h('div', { class: 'c98', 'data-power': 'off' });
    this.deskEl = h('div', { class: 'c98-desk' });
    this.iconsEl = h('div', { class: 'c98-icons' });
    this.winsEl = h('div', { class: 'c98-wins' });
    this.deskEl.append(this.iconsEl, this.winsEl);
    // taskbar
    this.startBtn = h('button', { class: 'c98-start', html: `${ic('os_logo', 1)}<b>Start</b>` });
    this.quickEl = h('div', { class: 'c98-quick' });
    this.tasksEl = h('div', { class: 'c98-tasks' });
    this.trayIcons = h('div', { class: 'c98-tray-ic' });
    this.clockEl = h('span', { class: 'c98-clock', title: '' });
    this.tray = h('div', { class: 'c98-tray' }, this.trayIcons, this.clockEl);
    this.task = h('div', { class: 'c98-task' }, this.startBtn, h('i', { class: 'c98-tsep' }), this.quickEl, h('i', { class: 'c98-tsep' }), this.tasksEl, this.tray);
    this.menusEl = h('div', { class: 'c98-menus' });
    this.balloonsEl = h('div', { class: 'c98-balloons' });
    this.toastsEl = h('div', { class: 'c98-toasts' });
    this.modalEl = h('div', { class: 'c98-modal hidden' });
    this.bootEl = h('div', { class: 'c98-boot' });
    this.crtEl = h('div', { class: 'c98-crt' });
    root.append(this.deskEl, this.task, this.balloonsEl, this.toastsEl, this.menusEl, this.modalEl, this.bootEl, this.crtEl);
    layer.append(root);
    document.body.appendChild(layer);
    for (const [k, g] of [['up', 'g_up'], ['down', 'g_down'], ['left', 'g_left'], ['right', 'g_right']]) root.style.setProperty(`--g-${k}`, `url(${glyphURL(g, '#1a1416')})`);

    this.startBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (this.startMenu) this.closeMenus(); else this.openStart(); });
    this.clockEl.addEventListener('dblclick', () => this.open('calendar'));
    this.deskEl.addEventListener('pointerdown', (e) => {
      if (e.target === this.deskEl || e.target === this.iconsEl || e.target === this.winsEl) { this.selectIcon(null); this.focus(null); }
    });
    this.deskEl.addEventListener('contextmenu', (e) => {
      if (e.target !== this.deskEl && e.target !== this.iconsEl && e.target !== this.winsEl) return;
      e.preventDefault();
      const p = this.local(e);
      this.menu([
        { label: 'Arrange Icons', action: () => { this.st.icons = {}; this.renderIcons(); } },
        { label: 'Refresh', action: () => this.renderIcons() },
        { sep: true },
        { label: 'New', sub: [{ label: 'Text Document', icon: 'os_txt', action: () => this.open('notepad', { new: true }) }] },
        { sep: true },
        { label: 'Properties', action: () => this.open('settings', { tab: 'display' }) },
      ], p);
    });
    this.task.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!e.target.closest('.c98-taskb')) this.menu([{ label: 'Minimize All Windows', action: () => this.wins.forEach((w) => w.minimize(true)) }, { label: 'Properties', action: () => this.open('settings', { tab: 'display' }) }], this.local(e)); });
  }

  /** Logical screen size (px) and its zoom on the real screen; called by the PC on resize. */
  setResolution(W, H, zoom = 1) {
    const changed = W !== this.W || H !== this.H;
    this.W = W; this.H = H;
    this.layer.style.width = `${W}px`; this.layer.style.height = `${H}px`;
    if (zoom !== this.zoom || !this._curZoom) this.setZoom(zoom);
    if (changed) {
      for (const w of this.wins) { if (w.maxed) w.applyMax(); else w.clamp(); w.place(); }
      this.renderIcons();
      this.applyWallpaper();
    }
  }
  setZoom(z) {
    this.zoom = z;
    const s = Math.max(1, Math.round(z * (window.devicePixelRatio || 1) >= 3 ? 2 : 1));
    if (this._curZoom === s) return;
    this._curZoom = s;
    for (const n of Object.keys(CURSORS)) this.root.style.setProperty(`--cur-${n}`, cursorCSS(n, s));
  }
  get deskH() { return this.H - TASKBAR_H; }

  /** Client (window) coordinates -> local screen pixels. */
  local(e) {
    const x = e.clientX, y = e.clientY, M = this.inv;
    if (!M) { const r = this.layer.getBoundingClientRect(); return { x: (x - r.left) / (r.width / this.W || 1), y: (y - r.top) / (r.height / this.H || 1) }; }
    const w = M[6] * x + M[7] * y + M[8];
    return { x: (M[0] * x + M[1] * y + M[2]) / w, y: (M[3] * x + M[4] * y + M[5]) / w };
  }

  applyWallpaper() {
    const id = this.st.wallpaper;
    const k = Math.max(1, Math.ceil(Math.max(this.W / 320, this.deskH / 240)));
    this.deskEl.style.backgroundImage = id === 'plain' ? 'none' : `url(${wallpaperURL(id)})`;
    this.deskEl.style.backgroundSize = `${320 * k}px ${240 * k}px`;
  }

  // ------------------------------------------------------------------ apps + desktop icons
  registerApp(def) {
    if (!def?.id) throw new Error('registerApp: id required');
    const app = { group: 'Programs', desktop: true, icon: 'os_doc', ...def };
    if (!this.apps.has(app.id)) this.order.push(app.id);
    this.apps.set(app.id, app);
    if (this.power === 'on') this.renderIcons();
    return app;
  }

  renderIcons() {
    const ids = this.order.filter((id) => { const a = this.apps.get(id); return a.desktop && (!a.unlocked || a.unlocked() || a.showLocked); });
    const rowH = 74, colW = 78, rows = Math.max(1, Math.floor((this.deskH - 8) / rowH));
    this.iconsEl.textContent = '';
    ids.forEach((id, i) => {
      const a = this.apps.get(id);
      const pos = this.st.icons[id] || [6 + Math.floor(i / rows) * colW, 6 + (i % rows) * rowH];
      const b = h('div', { class: 'c98-ico', tabindex: '0', 'data-app': id, style: { left: `${pos[0]}px`, top: `${pos[1]}px` } },
        h('span', { class: 'c98-ico-i', html: ic(typeof a.deskIcon === 'function' ? a.deskIcon() : a.icon, 2) }),
        h('span', { class: 'c98-ico-l', text: a.label || a.name }),
        a.badge ? h('i', { class: 'c98-badge hidden', 'data-badge': id }) : null);
      b.addEventListener('pointerdown', (e) => this.iconDown(e, b, id));
      b.addEventListener('dblclick', () => { this.selectIcon(null); this.open(id); });
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.open(id); });
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.selectIcon(b);
        const extra = a.iconMenu ? a.iconMenu(this) : [];
        this.menu([{ label: 'Open', bold: true, action: () => this.open(id) }, ...extra, { sep: true }, { label: 'Properties', action: () => this.properties(a) }], this.local(e));
      });
      this.iconsEl.append(b);
    });
    this.updateBadges();
  }

  iconDown(e, b, id) {
    if (e.button !== 0) return;
    e.stopPropagation();
    this.closeMenus();
    this.selectIcon(b);
    if (this.game.input.touch) { this.open(id); return; }
    const p0 = this.local(e), x0 = parseFloat(b.style.left), y0 = parseFloat(b.style.top);
    let moved = false;
    b.setPointerCapture(e.pointerId);
    const mv = (ev) => {
      const p = this.local(ev), dx = p.x - p0.x, dy = p.y - p0.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      b.classList.add('drag');
      b.style.left = `${Math.round(x0 + dx)}px`; b.style.top = `${Math.round(y0 + dy)}px`;
    };
    const up = () => {
      b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
      b.classList.remove('drag');
      if (!moved) return;
      const x = Math.max(0, Math.min(this.W - 76, Math.round((parseFloat(b.style.left) - 6) / 78) * 78 + 6));
      const y = Math.max(0, Math.min(this.deskH - 72, Math.round((parseFloat(b.style.top) - 6) / 74) * 74 + 6));
      b.style.left = `${x}px`; b.style.top = `${y}px`;
      this.st.icons[id] = [x, y];
    };
    b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  }

  selectIcon(b) {
    for (const x of this.iconsEl.querySelectorAll('.c98-ico.sel')) if (x !== b) x.classList.remove('sel');
    b?.classList.add('sel');
  }

  updateBadges() {
    for (const id of this.order) {
      const a = this.apps.get(id);
      if (!a.badge) continue;
      const n = a.badge();
      for (const el of this.root.querySelectorAll(`[data-badge="${id}"]`)) { el.textContent = n || ''; el.classList.toggle('hidden', !n); }
    }
    this.renderTray();
  }

  properties(a) {
    this.dialog({ title: `${a.name} Properties`, icon: a.icon, html: `<p><b>${esc(a.name)}</b></p><p>${esc(a.about || 'Capsule 98 application')}</p><p class="c98-dim">Type: Application<br>Location: C:\\CAPSULE\\PROGRAMS<br>Size: ${(a.id.length * 37 + 120)} KB</p>` });
  }

  // ------------------------------------------------------------------ windows
  open(id, args = {}) {
    const app = this.apps.get(id);
    if (this.power !== 'on') return null;
    if (!app) { this.alert(`Cannot find '${id}'. Make sure you typed the name correctly, and then try again.`, 'Run', 'error'); return null; }
    if (app.unlocked && !app.unlocked()) { this.alert(app.lockedText || `${app.name} is not installed on this computer yet.`, app.name, 'warn'); return null; }
    this.closeMenus();
    if (!app.multi) {
      const ex = this.wins.find((w) => w.app === id);
      if (ex) { ex.restore(); this.focus(ex); try { ex.onArgs?.(args); } catch (e) { console.error(e); } return ex; }
    }
    const win = new Win(this, app, args);
    this.wins.push(win);
    this.winsEl.append(win.el);
    this.focus(win);
    this.sound('osOpen');
    try { app.open(win, args || {}, this); } catch (e) {
      console.error(e);
      win.body.innerHTML = `<div class="c98-pad">${ic('os_error', 2)} This program has performed an illegal operation and will be shut down.</div>`;
    }
    this.renderTasks();
    this.emit('app', { id, win });
    return win;
  }

  focus(w) {
    if (w && w.minimized) w.restore();
    if (this.active === w) return;
    this.active?.el.classList.remove('active');
    this.active = w || null;
    if (w) { w.el.style.zIndex = ++this.z; w.el.classList.add('active'); w.flashing = false; w.el.classList.remove('flash'); }
    this.renderTasks();
  }

  topWin() { return this.wins.filter((w) => !w.minimized).sort((a, b) => +b.el.style.zIndex - +a.el.style.zIndex)[0] || null; }

  closeWin(w) {
    const i = this.wins.indexOf(w);
    if (i < 0) return;
    for (const fn of w._close) { try { fn(); } catch (e) { console.warn(e); } }
    this.wins.splice(i, 1);
    w.el.remove();
    if (this.active === w) { this.active = null; this.focus(this.topWin()); }
    this.renderTasks();
    this.sound('osClose');
  }

  renderTasks() {
    this.tasksEl.textContent = '';
    for (const w of this.wins) {
      const b = h('button', { class: `c98-taskb${w === this.active && !w.minimized ? ' on' : ''}${w.flashing ? ' flash' : ''}`, html: `${ic(w.icon, 1)}<span>${esc(w.title)}</span>` });
      b.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        this.closeMenus();
        if (w === this.active && !w.minimized) w.minimize(); else { w.restore(); this.focus(w); }
      });
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.menu([
          { label: 'Restore', disabled: !w.minimized && !w.maxed, action: () => { w.restore(); if (w.maxed) w.toggleMax(); this.focus(w); } },
          { label: 'Minimize', disabled: w.minimized, action: () => w.minimize() },
          { label: 'Maximize', disabled: w.maxed || !w.def.resizable, action: () => { w.restore(); w.toggleMax(); this.focus(w); } },
          { sep: true }, { label: 'Close', bold: true, key: 'Alt+F4', action: () => w.close() },
        ], this.local(e));
      });
      this.tasksEl.append(b);
    }
  }

  renderQuick() {
    this.quickEl.textContent = '';
    for (const id of ['browser', 'messenger', 'mail']) {
      const a = this.apps.get(id);
      if (!a) continue;
      const b = h('button', { class: 'c98-qb', title: a.name, html: ic(a.icon, 1) });
      b.addEventListener('click', () => this.open(id));
      this.quickEl.append(b);
    }
  }

  // tray: little status icons (unread messages / mail), volume, the clock
  renderTray() {
    const items = [];
    for (const id of this.order) {
      const a = this.apps.get(id);
      const n = a.tray?.();
      if (n) items.push({ id, icon: a.trayIcon || a.icon, tip: typeof n === 'string' ? n : `${a.name}: ${n} new` });
    }
    const key = items.map((i) => i.id + i.tip).join('|') + this.st.sounds;
    if (key === this._trayKey) return;
    this._trayKey = key;
    this.trayIcons.textContent = '';
    for (const it of items) {
      const b = h('button', { class: 'c98-ti blink', title: it.tip, html: ic(it.icon, 1) });
      b.addEventListener('click', () => this.open(it.id));
      this.trayIcons.append(b);
    }
    const vol = h('button', { class: 'c98-ti', title: this.st.sounds ? 'Volume' : 'Muted', html: ic(this.st.sounds ? 'sound_on' : 'sound_off', 1) });
    vol.addEventListener('click', () => { this.st.sounds = !this.st.sounds; this.renderTray(); });
    this.trayIcons.append(vol);
  }

  tickClock() {
    const t = now(this.game);
    const s = clockText(t, this.st.h24);
    if (s !== this._clock) { this._clock = s; this.clockEl.textContent = s; this.clockEl.title = dateText(t, true); }
  }

  // ------------------------------------------------------------------ menus
  /** A popup menu at local (x, y). Returns the menu element. */
  menu(items, { x = 0, y = 0, parent = null, cls = '', above = false, onClose = null } = {}) {
    if (!parent) this.closeMenus();
    const m = h('div', { class: `c98-menu ${cls}`, role: 'menu' });
    m._items = items;
    m._parent = parent;
    m._onClose = onClose;
    for (const it of items) {
      if (it.sep) { m.append(h('div', { class: 'c98-msep' })); continue; }
      const sub = typeof it.sub === 'function' ? it.sub() : it.sub;
      const row = h('div', { class: `c98-mi${it.disabled ? ' dis' : ''}${it.bold ? ' bold' : ''}`, role: 'menuitem' },
        h('span', { class: 'c98-mi-c', html: it.checked ? glyph('g_check', '#1a1416') : it.radio ? glyph('g_dot', '#1a1416') : it.icon ? ic(it.icon, 1) : '' }),
        h('span', { class: 'c98-mi-l', text: it.label }),
        h('span', { class: 'c98-mi-k', text: it.key || '' }),
        h('span', { class: 'c98-mi-s', html: sub ? glyph('g_right', '#1a1416') : '' }));
      row.addEventListener('pointerenter', () => {
        for (const r of m.children) r.classList.remove('hot');
        row.classList.add('hot');
        clearTimeout(m._subT);
        m._subT = setTimeout(() => this.openSub(m, row, sub), sub ? 180 : 120);
      });
      row.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        if (it.disabled) return;
        if (sub) { this.openSub(m, row, sub); return; }
        this.closeMenus();
        this.sound('osMenu');
        try { it.action?.(); } catch (err) { console.error(err); }
      });
      row.addEventListener('pointerdown', (e) => e.stopPropagation());
      m.append(row);
    }
    this.menusEl.append(m);
    this.menus.push(m);
    // keep it on screen
    const r = { w: m.offsetWidth, h: m.offsetHeight };
    let mx = x, my = above ? y - r.h : y;
    if (mx + r.w > this.W) mx = parent ? x - r.w - (parent.offsetWidth - 6) : this.W - r.w - 2;
    if (my + r.h > this.H - 2) my = Math.max(2, this.H - r.h - 2);
    m.style.left = `${Math.max(0, Math.round(mx))}px`; m.style.top = `${Math.max(0, Math.round(my))}px`;
    return m;
  }

  openSub(m, row, sub) {
    // close deeper menus of this one
    while (this.menus.length && this.menus[this.menus.length - 1] !== m) this.menus.pop().remove();
    if (!sub || row.classList.contains('dis')) return;
    const x = parseFloat(m.style.left) + m.offsetWidth - 4, y = parseFloat(m.style.top) + row.offsetTop - 3;
    this.menu(sub, { x, y, parent: m });
  }

  closeMenus() {
    if (!this.menus.length && !this.startMenu) return;
    for (const m of this.menus) { m.remove(); try { m._onClose?.(); } catch { /* */ } }
    this.menus = [];
    if (this.startMenu) { this.startMenu = null; this.startBtn.classList.remove('on'); }
    for (const b of this.root.querySelectorAll('.c98-mb.on')) b.classList.remove('on');
  }

  openStart() {
    this.closeMenus();
    this.sound('osMenu');
    const groups = {};
    for (const id of this.order) {
      const a = this.apps.get(id);
      if (a.hidden || (a.unlocked && !a.unlocked())) continue;
      (groups[a.group] ||= []).push({ label: a.name, icon: a.icon, action: () => this.open(id) });
    }
    const progs = [];
    for (const [g, list] of Object.entries(groups)) if (g !== 'Programs') progs.push({ label: g, icon: 'os_folder', sub: list });
    progs.push(...(groups.Programs || []));
    const docs = (this.st.notes?.docs || []).slice(-8).map((d) => ({ label: d.name, icon: 'os_txt', action: () => this.open('notepad', { doc: d.id }) }));
    const items = [
      { label: 'Programs', icon: 'os_folder', sub: progs },
      { label: 'Documents', icon: 'os_folder', sub: docs.length ? docs : [{ label: '(Empty)', disabled: true }] },
      { label: 'Settings', icon: 'gear', sub: [{ label: 'Control Panel', icon: 'gear', action: () => this.open('settings') }, { label: 'Wallpaper', icon: 'os_pc', action: () => this.open('settings', { tab: 'display' }) }, { label: 'Sounds', icon: 'sound_on', action: () => this.open('settings', { tab: 'sound' }) }] },
      { label: 'Find', icon: 'os_find', action: () => this.open('browser', { url: 'http://www.capsule.ne.jp/search' }) },
      { label: 'Help', icon: 'os_help', action: () => this.open('browser', { url: 'http://www.capsule98.co.jp/help' }) },
      { label: 'Run...', icon: 'os_run', action: () => this.runDialog() },
      { sep: true },
      { label: 'Stand Up', icon: 'exit', action: () => this.standUp() },
      { label: 'Shut Down...', icon: 'os_power', action: () => this.shutdownDialog() },
    ];
    const m = this.menu(items, { x: 2, y: this.H - TASKBAR_H + 2, above: true, cls: 'c98-startmenu' });
    m.prepend(h('div', { class: 'c98-sm-side', html: '<span>Capsule<b>98</b></span>' }));
    m.style.top = `${this.H - TASKBAR_H - m.offsetHeight + 2}px`;
    this.startMenu = m;
    this.startBtn.classList.add('on');
  }

  async runDialog() {
    const r = await this.dialog({ title: 'Run', icon: 'os_run', text: 'Type the name of a program, folder, document, or Internet resource, and Capsule 98 will open it for you.', input: { value: this.st.lastRun || '', placeholder: '' }, buttons: [{ label: 'OK', value: 'ok', default: true }, { label: 'Cancel', value: null, cancel: true }] });
    if (!r || r.value !== 'ok') return;
    const s = (r.input || '').trim();
    if (!s) return;
    this.st.lastRun = s;
    const low = s.toLowerCase().replace(/\.exe$/, '');
    const alias = { notepad: 'notepad', calc: null, iexplore: 'browser', navigator: 'browser', browser: 'browser', mail: 'mail', bank: 'bank', control: 'settings', msgr: 'messenger', messenger: 'messenger', pichat: 'messenger', phone: 'phone', dialer: 'phone', calendar: 'calendar', codex: 'codex' };
    if (/^(https?:\/\/|www\.)|\.(jp|com|net|biz|org)\b/.test(low)) { this.open('browser', { url: s }); return; }
    if (alias[low]) { this.open(alias[low]); return; }
    if (this.apps.has(low)) { this.open(low); return; }
    if (low === 'doom' || low === 'cmd' || low === 'command') { this.alert(`${s.toUpperCase()}.EXE is not a valid Capsule 98 application.`, s.toUpperCase(), 'error'); return; }
    this.alert(`Cannot find the file '${s}' (or one of its components). Make sure the path and filename are correct and that all required libraries are available.`, s, 'error');
  }

  // ------------------------------------------------------------------ dialogs
  /** Modal message box. Resolves with the clicked button's value (or { value, input } when it has a text field). */
  dialog({ title = 'Capsule 98', icon = 'info', text = '', html = '', buttons = null, input = null, width = 0, sound = true, cls = '' } = {}) {
    return new Promise((resolve) => {
      const btns = buttons || [{ label: 'OK', value: true, default: true, cancel: true }];
      const iconName = { info: 'os_info', warn: 'os_warn', error: 'os_error', question: 'os_question' }[icon] || icon;
      const win = h('div', { class: `c98-win c98-dlg active ${cls}`, role: 'dialog' });
      const tb = h('div', { class: 'c98-tb' }, h('span', { class: 't', text: title }), h('button', { class: 'c98-tbb', html: glyph('g_close', '#1a1416') }));
      const field = input ? h('input', { class: 'c98-field', type: 'text', value: input.value || '', placeholder: input.placeholder || '', spellcheck: 'false' }) : null;
      const row = h('div', { class: 'c98-dlg-b' });
      const body = h('div', { class: 'c98-dlg-m' }, h('span', { class: 'c98-dlg-i', html: ic(iconName, 2) }), h('div', { class: 'c98-dlg-t', html: html || esc(text).replace(/\n/g, '<br>') }));
      win.append(tb, h('div', { class: 'c98-dlg-c' }, body, field ? h('div', { class: 'c98-dlg-f' }, field) : null, row));
      const done = (v) => {
        if (win._done) return;
        win._done = true;
        win.remove();
        this.dialogs = (this.dialogs || []).filter((d) => d !== win);
        if (!this.dialogs.length) this.modalEl.classList.add('hidden');
        resolve(field ? { value: v, input: field.value } : v);
      };
      win._cancel = () => done(btns.find((b) => b.cancel)?.value ?? null);
      win._accept = () => done(btns.find((b) => b.default)?.value ?? btns[0].value);
      for (const b of btns) {
        const el = h('button', { class: `c98-btn${b.default ? ' def' : ''}`, text: b.label });
        el.addEventListener('click', () => done(b.value));
        row.append(el);
      }
      tb.lastChild.addEventListener('click', () => win._cancel());
      if (field) field.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); win._accept(); } });
      this.modalEl.append(win);
      this.modalEl.classList.remove('hidden');
      (this.dialogs ||= []).push(win);
      if (width) win.style.width = `${width}px`;
      const ww = win.offsetWidth, wh = win.offsetHeight;
      win.style.left = `${Math.round((this.W - ww) / 2)}px`; win.style.top = `${Math.round((this.deskH - wh) / 2.3)}px`;
      dragBy(this, tb, win);
      setTimeout(() => (field || row.querySelector('.def'))?.focus(), 30);
      if (sound) this.sound({ error: 'osError', warn: 'osDing', question: 'osQuestion' }[icon] || 'osDing');
      win._resolve = done;
    });
  }
  alert(text, title = 'Capsule 98', icon = 'info') { return this.dialog({ title, icon, text }); }
  async confirm(text, title = 'Capsule 98', icon = 'question') {
    return (await this.dialog({ title, icon, text, buttons: [{ label: 'Yes', value: true, default: true }, { label: 'No', value: false, cancel: true }] })) === true;
  }
  error(text, title = 'Error') { return this.dialog({ title, icon: 'error', text }); }

  /** A timed choice: answer before the bar runs out. Resolves with the choice value, or null on timeout. */
  qte({ title = 'Hurry!', prompt = '', choices = [], seconds = 8, icon = 'os_warn' } = {}) {
    const start = () => new Promise((resolve) => {
      const win = h('div', { class: 'c98-win c98-dlg c98-qte active', role: 'dialog' });
      const tb = h('div', { class: 'c98-tb' }, h('span', { class: 't', text: title }));
      const bar = h('div', { class: 'c98-prog c98-qte-bar' }, h('i'));
      const left = h('span', { class: 'c98-qte-n' });
      const row = h('div', { class: 'c98-qte-ch' });
      win.append(tb, h('div', { class: 'c98-dlg-c' },
        h('div', { class: 'c98-dlg-m' }, h('span', { class: 'c98-dlg-i', html: ic(icon, 2) }), h('div', { class: 'c98-dlg-t', html: esc(prompt).replace(/\n/g, '<br>') })),
        h('div', { class: 'c98-qte-t' }, bar, left), row));
      const t0 = performance.now(), dur = seconds * 1000;
      let raf = 0, lastS = -1;
      const done = (v) => {
        if (win._done) return;
        win._done = true;
        cancelAnimationFrame(raf);
        win.remove();
        this.dialogs = (this.dialogs || []).filter((d) => d !== win);
        if (!this.dialogs.length) this.modalEl.classList.add('hidden');
        this.sound(v === null ? 'osError' : 'osMenu');
        resolve(v);
      };
      win._cancel = () => {}; // Esc can't dodge a QTE
      choices.forEach((c, i) => {
        const el = h('button', { class: 'c98-btn', html: `<u>${i + 1}</u> ${esc(c.label)}` });
        el.addEventListener('click', () => done(c.value));
        row.append(el);
      });
      win._key = (e) => { const n = +e.key; if (n >= 1 && n <= choices.length) { done(choices[n - 1].value); return true; } return false; };
      const tick = () => {
        const k = 1 - (performance.now() - t0) / dur;
        if (k <= 0) { done(null); return; }
        const blocks = Math.ceil(k * 20);
        bar.firstChild.style.width = `${blocks * 5}%`;
        bar.classList.toggle('low', k < 0.3);
        const s = Math.ceil(k * seconds);
        if (s !== lastS) { lastS = s; left.textContent = `${s}s`; if (s <= 3) this.sound('osMenu'); }
        raf = requestAnimationFrame(tick);
      };
      this.modalEl.append(win);
      this.modalEl.classList.remove('hidden');
      (this.dialogs ||= []).push(win);
      win.style.left = `${Math.round((this.W - win.offsetWidth) / 2)}px`; win.style.top = `${Math.round((this.deskH - win.offsetHeight) / 2.4)}px`;
      this.sound('osQuestion');
      tick();
    });
    if (this.seated && this.power === 'on') return start();
    return new Promise((res) => { const off = this.on('ready', () => { off(); start().then(res); }); });
  }

  // ------------------------------------------------------------------ notifications
  /** Tray balloon. While you're away from the PC it waits (and news: true also shows a HUD toast). */
  notify({ app = null, title = '', body = '', icon = null, onClick = null, sound = 'osNotify', news = false } = {}) {
    const n = { app, title, body, icon: icon || this.apps.get(app)?.icon || 'os_info', onClick, sound };
    if (!this.seated || this.power !== 'on') {
      this.pending.push(n);
      if (this.pending.length > 4) this.pending.shift();
      if (news && this.game.news && !this.game.cutscene?.active && (!this._newsT || performance.now() - this._newsT > 20000)) {
        this._newsT = performance.now();
        this.game.news(`PC: ${title}`, body.length > 60 ? body.slice(0, 57) + '...' : body, 5000);
      }
      return;
    }
    this.balloon(n);
  }

  balloon(n) {
    const b = h('div', { class: 'c98-balloon' },
      h('div', { class: 'c98-bl-h', html: `${ic(n.icon, 1)}<b>${esc(n.title)}</b>` }),
      h('div', { class: 'c98-bl-b', text: n.body }),
      h('button', { class: 'c98-bl-x', html: glyph('g_close', '#1a1416') }));
    b.addEventListener('click', (e) => {
      b.remove();
      if (e.target.closest('.c98-bl-x')) return;
      if (n.onClick) n.onClick(); else if (n.app) this.open(n.app);
    });
    this.balloonsEl.append(b);
    while (this.balloonsEl.children.length > 3) this.balloonsEl.firstChild.remove();
    if (n.sound) this.sound(n.sound);
    setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 300); }, 6500);
  }

  /** Bottom-right slide-up toast (achievements). */
  toast(html, ms = 4200, sound = 'osCoin') {
    if (!this.seated) return false;
    const t = h('div', { class: 'c98-toast', html });
    this.toastsEl.append(t);
    if (sound) this.sound(sound);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
    return true;
  }

  /** While you sit at the PC the HUD is hidden: show the game's own news toasts as balloons instead. */
  mirrorNews() {
    const el = document.getElementById('news');
    if (!el || typeof MutationObserver === 'undefined') return;
    new MutationObserver((list) => {
      if (!this.seated || this.power !== 'on') return;
      for (const r of list) for (const n of r.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        const t = n.querySelector('.t')?.textContent || n.textContent;
        if (!t || t.startsWith('PC: ')) continue;
        this.balloon({ title: t, body: n.querySelector('.sub')?.textContent || '', icon: 'megaphone', sound: 'osNotify' });
      }
    }).observe(el, { childList: true });
  }

  // ------------------------------------------------------------------ power
  /** Switch on: the BIOS, the splash, the jingle, then the desktop (instant = skip straight to the desktop). */
  powerOn({ instant = false } = {}) {
    if (this.power === 'on' || this.power === 'boot') return;
    this.power = 'boot';
    this.root.dataset.power = 'boot';
    this.root.classList.remove('crt-off');
    this.root.classList.add('crt-on');
    setTimeout(() => this.root.classList.remove('crt-on'), 700);
    const b = this.bootEl;
    b.className = 'c98-boot';
    b.textContent = '';
    if (instant) { this.finishBoot(true); return; }
    const t = now(this.game);
    const lines = [
      'Capsule Modular BIOS v4.51PG, An Energy Star Ally',
      'Copyright (C) 1984-98, Capsule Systems Inc.',
      '',
      'CAPSULE 486DX4-100 CPU at 100MHz',
      'Memory Test :      @K OK',
      '',
      'Detecting IDE Primary Master ... CAPSULE DISK 1.2GB',
      'Detecting IDE Secondary Master ... CD-ROM 8X',
      'Floppy A: 1.44M, 3.5 in.',
      '',
      `Date: ${dateText(t)}   Garage PC No. 1`,
      '',
      'Starting Capsule 98...',
    ];
    const bios = h('pre', { class: 'c98-bios' });
    const star = h('div', { class: 'c98-bios-logo', html: ic('os_logo', 3) + '<span>Energy<br>Ally</span>' });
    const foot = h('div', { class: 'c98-bios-f', text: 'Press DEL to enter SETUP' });
    b.append(star, bios, foot);
    let i = 0, mem = 0;
    const t0 = performance.now();
    this.sound('hddSeek', { vol: 0.6 });
    const step = () => {
      if (this.power !== 'boot') return;
      const tt = performance.now() - t0;
      if (tt < 2200) {
        while (i < lines.length && tt > i * 150) {
          i++;
        }
        mem = Math.min(65536, Math.round((tt / 900) * 65536));
        bios.textContent = lines.slice(0, i).join('\n').replace('@', String(mem).padStart(5, ' '));
        this._bootRaf = requestAnimationFrame(step);
        return;
      }
      if (!b.classList.contains('splash')) {
        b.classList.add('splash');
        b.textContent = '';
        b.append(h('div', { class: 'c98-splash' },
          h('div', { class: 'c98-sp-logo', html: ic('os_logo', 6) }),
          h('div', { class: 'c98-sp-t', html: 'Capsule<b>98</b>' }),
          h('div', { class: 'c98-sp-s', text: 'Second Edition' }),
          h('div', { class: 'c98-sp-bar' }, h('i')),
          h('div', { class: 'c98-sp-c', text: 'Copyright (C) 1981-1998 Capsule Systems Inc.' })));
        this.sound('hddSeek', { vol: 0.5 });
      }
      if (tt > 4300) { this.finishBoot(); return; }
      this._bootRaf = requestAnimationFrame(step);
    };
    this._bootRaf = requestAnimationFrame(step);
    b.onpointerdown = () => this.finishBoot();
  }

  finishBoot(quiet = false) {
    if (this.power !== 'boot') return;
    cancelAnimationFrame(this._bootRaf);
    this.power = 'on';
    this.root.dataset.power = 'on';
    this.bootEl.className = 'c98-boot hidden';
    this.bootEl.textContent = '';
    this.renderIcons();
    this.renderQuick();
    this.renderTasks();
    this.tickClock();
    this.root.classList.add('fresh');
    setTimeout(() => this.root.classList.remove('fresh'), 900);
    if (!quiet) this.sound('osBoot', { vol: 0.9 });
    this.emit('power', 'on');
    setTimeout(() => this.ready(), quiet ? 0 : 900);
  }

  /** Desktop up and you're sitting: show what came in while you were away. */
  ready() {
    if (this.power !== 'on' || !this.seated) return;
    const list = this.pending.splice(0);
    list.forEach((n, i) => setTimeout(() => this.balloon(n), 400 + i * 700));
    if (!this.st.flags.welcomed) {
      this.st.flags.welcomed = true;
      setTimeout(() => this.balloon({ title: 'Welcome to Capsule 98', body: 'Double-click an icon to start a program. Press Esc or the power button on the taskbar to stand up.', icon: 'os_logo', sound: 'osNotify' }), 600 + list.length * 700);
    }
    this.emit('ready');
  }

  async shutdownDialog() {
    this.closeMenus();
    const opts = [['stand', 'Stand up (leave the computer on)'], ['off', 'Shut down the computer'], ['restart', 'Restart the computer']];
    let pick = 'stand';
    const html = `<p>What do you want the computer to do?</p>${opts.map(([v, l]) => `<label class="c98-radio"><input type="radio" name="c98sd" value="${v}"${v === pick ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}`;
    const p = this.dialog({ title: 'Shut Down Capsule 98', icon: 'os_power', html, sound: false, buttons: [{ label: 'OK', value: 'ok', default: true }, { label: 'Cancel', value: null, cancel: true }] });
    for (const r of this.modalEl.querySelectorAll('input[name="c98sd"]')) r.addEventListener('change', () => { pick = r.value; });
    const v = await p;
    if (v !== 'ok') return;
    if (pick === 'stand') this.standUp();
    else this.shutdown(pick === 'restart');
  }

  /** Close everything, play the shutdown screens, switch off (restart = boot again). */
  shutdown(restart = false) {
    if (this.power !== 'on') return;
    this.closeMenus();
    for (const w of [...this.wins]) { for (const fn of w._close) { try { fn(); } catch { /* */ } } w.el.remove(); }
    this.wins = []; this.active = null; this.renderTasks();
    this.power = 'halt';
    this.root.dataset.power = 'halt';
    this.sound('osOff');
    const b = this.bootEl;
    b.className = 'c98-boot splash';
    b.innerHTML = `<div class="c98-splash"><div class="c98-sp-logo">${ic('os_logo', 6)}</div><div class="c98-sp-t">Capsule<b>98</b></div><div class="c98-sp-s">${restart ? 'Capsule 98 is restarting...' : 'Capsule 98 is shutting down...'}</div></div>`;
    this.game.save?.();
    setTimeout(() => {
      if (restart) { this.power = 'off'; this.powerOn(); return; }
      b.className = 'c98-boot safe';
      b.innerHTML = '<p>It\'s now safe to turn off<br>your computer.</p>';
      setTimeout(() => {
        this.power = 'off';
        this.root.dataset.power = 'off';
        this.root.classList.add('crt-off');
        this.sound('crtOff', { force: true });
        this.emit('power', 'off');
        setTimeout(() => this.standUp(), 700);
      }, 1500);
    }, 1600);
  }

  standUp() { this.closeMenus(); this.game.pc?.exit?.(); }

  // ------------------------------------------------------------------ seat (called by the PC)
  seat(on) {
    if (on === this.seated) return;
    this.seated = on;
    this.layer.classList.toggle('hidden', !on);
    if (on) {
      this.tickClock();
      this.updateBadges();
      if (this.power === 'on') setTimeout(() => this.ready(), 500);
    } else {
      this.closeMenus();
      this.inv = null;
    }
    this.emit('seat', on);
  }

  /** Per-frame while seated (the PC calls it): clock, badges, app ticks. */
  tick(dt) {
    if (!this.seated || this.power !== 'on') return;
    this._t = (this._t || 0) + dt;
    if (this._t > 0.5) {
      this._t = 0;
      this.tickClock();
      this.updateBadges();
      for (const w of this.wins) if (!w.minimized && w.onTick) { try { w.onTick(); } catch (e) { console.warn(e); } }
    }
  }

  // ------------------------------------------------------------------ input (only acts while seated)
  installInput() {
    window.addEventListener('keydown', (e) => {
      if (!this.seated) return;
      if (this.st.keyclicks && !e.repeat && (!this._kT || performance.now() - this._kT > 35)) { this._kT = performance.now(); this.sound('kbdKey', { space: e.code === 'Space', vol: 0.5 }); }
      if (this.power === 'boot' && e.code !== 'Escape') { this.finishBoot(); e.preventDefault(); return; }
      const dlg = this.dialogs?.[this.dialogs.length - 1];
      if (dlg?._key?.(e)) { e.preventDefault(); return; }
      if (e.code === 'Escape') {
        e.preventDefault();
        if (this.menus.length || this.startMenu) { this.closeMenus(); return; }
        if (dlg) { dlg._cancel(); return; }
        this.standUp();
        return;
      }
      if (e.code === 'F4' && e.altKey && this.active) { e.preventDefault(); this.active.close(); return; }
      if ((e.code === 'MetaLeft' || e.code === 'MetaRight' || (e.ctrlKey && e.code === 'Escape')) && this.power === 'on') { e.preventDefault(); this.openStart(); return; }
      if (dlg && e.key === 'Enter' && !e.target.closest?.('textarea')) { e.preventDefault(); dlg._accept?.(); return; }
      if (this.active?.onKey && !e.target.closest?.('input, textarea, [contenteditable]')) { try { if (this.active.onKey(e) === true) e.preventDefault(); } catch (err) { console.warn(err); } }
    }, true);
    this.root.addEventListener('pointerdown', (e) => {
      if (e.button === 0 || e.button === 2) this.sound('mouseClick', { vol: 0.6 });
      if (!e.target.closest('.c98-menu, .c98-mb')) this.closeMenus();
      const w = e.target.closest('.c98-win');
      if (w && !w.classList.contains('c98-dlg')) this.focus(this.wins.find((x) => x.el === w));
    });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    this.root.addEventListener('pointermove', (e) => { if (this.onPointer) { const p = this.local(e); this.onPointer(p.x / this.W, p.y / this.H); } }, { passive: true });
  }
}

// ------------------------------------------------------------------ drag helper (title bars)
function dragBy(os, handle, el, onMove = null) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const p0 = os.local(e), x0 = parseFloat(el.style.left) || 0, y0 = parseFloat(el.style.top) || 0;
    handle.setPointerCapture(e.pointerId);
    const mv = (ev) => {
      const p = os.local(ev);
      let x = Math.round(x0 + p.x - p0.x), y = Math.round(y0 + p.y - p0.y);
      x = Math.max(60 - el.offsetWidth, Math.min(os.W - 60, x)); y = Math.max(0, Math.min(os.deskH - 20, y));
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      onMove?.(x, y);
    };
    const up = () => { handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); };
    handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
  });
}

// ------------------------------------------------------------------ a window
class Win {
  constructor(os, app, args) {
    this.os = os;
    this.app = app.id;
    this.def = { resizable: true, ...app };
    this.icon = app.icon;
    this.title = args.title || app.title || app.name;
    this._close = [];
    this._resize = [];
    this.minimized = false;
    this.maxed = false;
    const el = this.el = h('div', { class: `c98-win${app.cls ? ' ' + app.cls : ''}` });
    this.iconEl = h('span', { class: 'c98-tb-i', html: ic(this.icon, 1) });
    this.titleEl = h('span', { class: 't', text: this.title });
    const bMin = h('button', { class: 'c98-tbb', title: 'Minimize', html: glyph('g_min', '#1a1416') });
    const bMax = h('button', { class: 'c98-tbb', title: 'Maximize', html: glyph('g_max', '#1a1416') });
    const bX = h('button', { class: 'c98-tbb x', title: 'Close', html: glyph('g_close', '#1a1416') });
    this.bMax = bMax;
    if (!this.def.resizable) bMax.disabled = true;
    this.tb = h('div', { class: 'c98-tb' }, this.iconEl, this.titleEl, bMin, bMax, bX);
    this.menuEl = h('div', { class: 'c98-menubar hidden' });
    this.body = h('div', { class: 'c98-body' });
    this.statusEl = h('div', { class: 'c98-status hidden' });
    el.append(this.tb, this.menuEl, this.body, this.statusEl);
    if (this.def.resizable) for (const d of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) el.append(h('i', { class: `c98-rz ${d}`, 'data-d': d }));
    bMin.addEventListener('click', () => this.minimize());
    bMax.addEventListener('click', () => this.toggleMax());
    bX.addEventListener('click', () => this.close());
    this.tb.addEventListener('dblclick', (e) => { if (!e.target.closest('button') && this.def.resizable) this.toggleMax(); });
    this.iconEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const r = this.iconEl.getBoundingClientRect();
      const p = os.local({ clientX: r.left, clientY: r.bottom });
      this.os.menu([
        { label: 'Restore', disabled: !this.maxed, action: () => this.toggleMax() },
        { label: 'Minimize', action: () => this.minimize() },
        { label: 'Maximize', disabled: this.maxed || !this.def.resizable, action: () => this.toggleMax() },
        { sep: true }, { label: 'Close', bold: true, key: 'Alt+F4', action: () => this.close() },
      ], { x: p.x, y: p.y });
    });
    this.tb.addEventListener('contextmenu', (e) => { e.preventDefault(); this.iconEl.dispatchEvent(new PointerEvent('pointerdown')); });
    // size + cascade
    const W = os.W, H = os.deskH;
    this.w = Math.min(args.w || app.w || 520, W - 8);
    this.h = Math.min(args.h || app.h || 380, H - 8);
    const n = os.wins.length % 6;
    this.x = Math.round(Math.max(4, Math.min(W - this.w - 4, (W - this.w) / 2 - 60 + n * 24)));
    this.y = Math.round(Math.max(4, Math.min(H - this.h - 4, (H - this.h) / 2.4 - 40 + n * 22)));
    this.place();
    this.dragify();
    if (this.def.resizable) this.resizify();
    if (args.max || app.max) this.toggleMax(true);
  }

  place() {
    const s = this.el.style;
    s.left = `${this.x}px`; s.top = `${this.y}px`; s.width = `${this.w}px`; s.height = `${this.h}px`;
  }
  clamp() {
    const W = this.os.W, H = this.os.deskH;
    this.w = Math.min(this.w, W); this.h = Math.min(this.h, H);
    this.x = Math.max(60 - this.w, Math.min(W - 60, this.x));
    this.y = Math.max(0, Math.min(H - 22, this.y));
  }
  setTitle(s) { this.title = s; this.titleEl.textContent = s; this.os.renderTasks(); }
  setIcon(n) { this.icon = n; this.iconEl.innerHTML = ic(n, 1); this.os.renderTasks(); }
  onClose(fn) { this._close.push(fn); }
  onResize(fn) { this._resize.push(fn); }
  close() { this.os.closeWin(this); }
  focus() { this.os.focus(this); }
  busy(on) { this.el.classList.toggle('busy', !!on); }
  flash() { if (this.os.active === this && !this.minimized) return; this.flashing = true; this.os.renderTasks(); }
  minimize(quiet = false) {
    if (this.minimized) return;
    this.minimized = true;
    this.el.classList.add('min');
    if (!quiet) this.os.sound('osMin');
    if (this.os.active === this) { this.os.active = null; this.el.classList.remove('active'); this.os.focus(this.os.topWin()); }
    this.os.renderTasks();
  }
  restore() {
    if (!this.minimized) return;
    this.minimized = false;
    this.el.classList.remove('min');
    this.os.sound('osMax');
    this.os.renderTasks();
  }
  toggleMax(force) {
    const on = force ?? !this.maxed;
    if (on === this.maxed) return;
    this.maxed = on;
    if (on) { this.prev = [this.x, this.y, this.w, this.h]; this.applyMax(); } else if (this.prev) { [this.x, this.y, this.w, this.h] = this.prev; this.place(); }
    this.el.classList.toggle('max', on);
    this.bMax.innerHTML = glyph(on ? 'g_rest' : 'g_max', '#1a1416');
    this.bMax.title = on ? 'Restore' : 'Maximize';
    if (force === undefined) this.os.sound(on ? 'osMax' : 'osMin');
    this.resized();
  }
  applyMax() { this.x = 0; this.y = 0; this.w = this.os.W; this.h = this.os.deskH; this.place(); }
  resized() { for (const fn of this._resize) { try { fn(this.w, this.h); } catch (e) { console.warn(e); } } }

  /** Menu bar: [{ label, items: [...] | () => [...] }] */
  menubar(defs) {
    this.menuEl.textContent = '';
    this.menuEl.classList.remove('hidden');
    for (const d of defs) {
      const b = h('button', { class: 'c98-mb', text: d.label });
      const openIt = () => {
        const os = this.os;
        os.closeMenus();
        b.classList.add('on');
        const r = b.getBoundingClientRect();
        const p = os.local({ clientX: r.left, clientY: r.bottom });
        os.menu(typeof d.items === 'function' ? d.items() : d.items, { x: p.x, y: p.y, onClose: () => b.classList.remove('on') });
      };
      b.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (b.classList.contains('on')) this.os.closeMenus(); else openIt(); });
      b.addEventListener('pointerenter', () => { if (this.menuEl.querySelector('.c98-mb.on') && !b.classList.contains('on')) openIt(); });
      this.menuEl.append(b);
    }
  }

  /** Status bar with sunken panes: status('Done', 'Internet'). */
  status(...parts) {
    this.statusEl.classList.remove('hidden');
    const html = parts.map((p, i) => `<span class="c98-sp${i === 0 ? ' grow' : ''}">${p}</span>`).join('') + `<span class="c98-grip">${glyph('g_grip', '#8c8474')}</span>`;
    if (html !== this._st) { this._st = html; this.statusEl.innerHTML = html; }
  }

  dragify() {
    const os = this.os;
    this.tb.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button, .c98-tb-i') || this.maxed) return;
      const p0 = os.local(e), x0 = this.x, y0 = this.y;
      this.tb.setPointerCapture(e.pointerId);
      const mv = (ev) => { const p = os.local(ev); this.x = Math.round(x0 + p.x - p0.x); this.y = Math.round(y0 + p.y - p0.y); this.clamp(); this.place(); };
      const up = () => { this.tb.removeEventListener('pointermove', mv); this.tb.removeEventListener('pointerup', up); this.tb.removeEventListener('pointercancel', up); };
      this.tb.addEventListener('pointermove', mv); this.tb.addEventListener('pointerup', up); this.tb.addEventListener('pointercancel', up);
    });
  }

  resizify() {
    const os = this.os;
    const minW = this.def.minW || 220, minH = this.def.minH || 140;
    for (const hd of this.el.querySelectorAll('.c98-rz')) {
      hd.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || this.maxed) return;
        e.stopPropagation();
        const d = hd.dataset.d, p0 = os.local(e), r0 = [this.x, this.y, this.w, this.h];
        hd.setPointerCapture(e.pointerId);
        const mv = (ev) => {
          const p = os.local(ev), dx = p.x - p0.x, dy = p.y - p0.y;
          let [x, y, w, hh] = r0;
          if (d.includes('e')) w = Math.max(minW, r0[2] + dx);
          if (d.includes('s')) hh = Math.max(minH, r0[3] + dy);
          if (d.includes('w')) { w = Math.max(minW, r0[2] - dx); x = r0[0] + r0[2] - w; }
          if (d.includes('n')) { hh = Math.max(minH, r0[3] - dy); y = Math.max(0, r0[1] + r0[3] - hh); hh = r0[1] + r0[3] - y; }
          this.x = Math.round(x); this.y = Math.round(y); this.w = Math.round(Math.min(w, os.W)); this.h = Math.round(Math.min(hh, os.deskH));
          this.place();
        };
        const up = () => { hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up); this.resized(); };
        hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
      });
    }
  }
}

export { ic, glyph, WALLPAPERS };
