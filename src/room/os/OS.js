// CAPSULE OS 98: the desktop on your room's PC, a DOM overlay in a chunky CRT bezel. Pixel icons, draggable
// windows, a taskbar with a start menu and a tray (mail, music, the in-game day and the clock), a boot screen the
// first time you switch it on. Apps register with { id, title, icon, w, h, create(win, os) -> { tick, onKey, onClose } }.
//   os.open({ delay, onClose }) / os.close() / os.launch(id, arg) / os.notify(text, icon)
import './os.css';
import { iconHTML, iconURL, defineIcon } from '../../gfx/icons.js';
import { sfx } from '../sfx.js';
import { dateOf } from '../textures.js';
import { ICONS_OS } from './icons.js';
import { wallpaperURL, WALLPAPERS } from './wallpaper.js';

for (const [k, def] of Object.entries(ICONS_OS)) defineIcon(k, def);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[—–]/g, '-').replace(/…/g, '...').replace(/[&<>"']/g, (c) => ESC[c]);
export const ic = (name, scale = 1, cls = '') => iconHTML(name, scale, cls);

export class CapsuleOS {
  constructor(room) {
    this.room = room;
    this.game = room.game;
    this.apps = new Map();
    this.order = []; // desktop icon order
    this.wins = [];
    this.z = 10;
    this.isOpen = false;
    this.booted = false;
    this.raf = 0;
    this.last = 0;
    const el = document.createElement('div');
    el.className = 'cos hidden';
    el.innerHTML = `<div class="cos-back"></div>
      <div class="cos-bezel">
        <div class="cos-screen">
          <div class="cos-desk"><div class="cos-icons"></div><div class="cos-wins"></div></div>
          <div class="cos-task">
            <button class="cos-start" data-act="start">${ic('cos_logo', 1)}<span>Start</span></button>
            <div class="cos-tasks"></div>
            <div class="cos-tray"><span class="cos-tray-mail hidden" data-act="mail" title="New mail">${ic('cos_mail', 1)}</span><span class="cos-tray-music hidden" data-act="music">${ic('music', 1)}</span><span class="cos-clock"></span></div>
            <button class="cos-power" data-act="off" title="Stand up (Esc)">${ic('cos_power', 1)}</button>
          </div>
          <div class="cos-startmenu hidden"><div class="cos-sm-side"><span>Capsule</span><b>OS 98</b></div><div class="cos-sm-items"></div></div>
          <div class="cos-balloons"></div>
          <div class="cos-boot hidden"></div>
          <div class="cos-fx"></div>
        </div>
        <div class="cos-brand"><span class="cos-led"></span>CAPSULE-PC 98</div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.screen = el.querySelector('.cos-screen');
    this.desk = el.querySelector('.cos-desk');
    this.iconsEl = el.querySelector('.cos-icons');
    this.winsEl = el.querySelector('.cos-wins');
    this.tasksEl = el.querySelector('.cos-tasks');
    this.clockEl = el.querySelector('.cos-clock');
    this.smEl = el.querySelector('.cos-startmenu');
    this.bootEl = el.querySelector('.cos-boot');
    this.balloonsEl = el.querySelector('.cos-balloons');
    this.mailTray = el.querySelector('.cos-tray-mail');
    this.musicTray = el.querySelector('.cos-tray-music');

    // a click-to-continue catcher in case the browser refuses to re-lock the pointer when you stand up
    this.resumeEl = document.createElement('button');
    this.resumeEl.className = 'cos-resume hidden';
    this.resumeEl.innerHTML = `<span>${ic('play', 2)}Click to continue</span>`;
    this.resumeEl.addEventListener('click', () => { this.resumeEl.classList.add('hidden'); this.game.input.lock(); });
    document.body.appendChild(this.resumeEl);
    document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement) this.resumeEl.classList.add('hidden'); });

    el.addEventListener('click', (e) => this.onClick(e));
    el.addEventListener('dblclick', (e) => {
      const ico = e.target.closest('.cos-ico');
      if (ico) this.launch(ico.dataset.app);
    });
    el.addEventListener('pointerdown', (e) => {
      const w = e.target.closest('.cos-win');
      if (w) this.focus(this.wins.find((x) => x.el === w));
      if (!e.target.closest('.cos-startmenu, .cos-start')) this.toggleStart(false);
      if (!e.target.closest('.cos-ico')) for (const i of this.iconsEl.children) i.classList.remove('sel');
      sfx('osClick', { vol: 0.6 });
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKey(e, true), true);
    window.addEventListener('keyup', (e) => this.onKey(e, false), true);
    window.addEventListener('resize', () => { if (this.isOpen) for (const w of this.wins) this.clampWin(w); });
  }

  // ------------------------------------------------------------------ registry
  register(def) {
    this.apps.set(def.id, def);
    if (def.desktop !== false) this.order.push(def.id);
    this.renderIcons();
    this.renderStart();
  }

  renderIcons() {
    this.iconsEl.innerHTML = this.order.map((id) => {
      const a = this.apps.get(id);
      return `<button class="cos-ico" data-app="${id}">${ic(a.icon, 2)}<span>${esc(a.label || a.title)}</span>${a.badge ? `<i class="cos-badge hidden" data-badge="${id}"></i>` : ''}</button>`;
    }).join('');
    this.updateBadges();
  }

  renderStart() {
    const groups = [['Programs', this.order.filter((id) => !this.apps.get(id).game)], ['Games', this.order.filter((id) => this.apps.get(id).game)]];
    this.smEl.querySelector('.cos-sm-items').innerHTML = groups.map(([g, ids]) => `<div class="cos-sm-h">${g}</div>` + ids.map((id) => {
      const a = this.apps.get(id);
      return `<button class="cos-sm-i" data-launch="${id}">${ic(a.icon, 1)}<span>${esc(a.title)}</span></button>`;
    }).join('')).join('') + `<div class="cos-sm-sep"></div>
      <button class="cos-sm-i" data-act="wall">${ic('cos_wall', 1)}<span>Change wallpaper</span></button>
      <button class="cos-sm-i" data-act="off">${ic('cos_power', 1)}<span>Stand up</span></button>`;
  }

  updateBadges() {
    for (const id of this.order) {
      const a = this.apps.get(id), b = this.iconsEl.querySelector(`[data-badge="${id}"]`);
      if (!b || !a.badge) continue;
      const n = a.badge(this);
      b.textContent = n || '';
      b.classList.toggle('hidden', !n);
    }
    const unread = this.room.mail?.unread() || 0;
    this.mailTray.classList.toggle('hidden', !unread);
    this.musicTray.classList.toggle('hidden', !this.room.player?.playing);
  }

  // ------------------------------------------------------------------ open / close
  open({ delay = 0, onClose = null } = {}) {
    if (this.isOpen) return;
    const g = this.game;
    this.isOpen = true;
    this.onCloseCb = onClose;
    g.uiOpen = true;
    document.body.classList.add('cos-on');
    this.resumeEl.classList.add('hidden');
    this.applyWallpaper();
    this.el.style.setProperty('--cos-delay', `${delay}ms`);
    this.el.classList.remove('hidden', 'closing');
    g.input.unlock();
    this.updateBadges();
    this.tickClock();
    if (!this.booted) this.boot(delay);
    else setTimeout(() => sfx('osOpen'), delay);
    this.last = performance.now();
    if (!this.raf) this.raf = requestAnimationFrame((t) => this.loop(t));
    this.room.events?.emit?.('osOpen');
  }

  close() {
    if (!this.isOpen) return;
    const g = this.game;
    for (const w of [...this.wins]) this.closeWin(w, true);
    this.isOpen = false;
    g.uiOpen = false;
    this.toggleStart(false);
    this.el.classList.add('closing');
    setTimeout(() => { if (!this.isOpen) this.el.classList.add('hidden'); this.el.classList.remove('closing'); }, 220);
    document.body.classList.remove('cos-on');
    sfx('osOff', { vol: 0.8 });
    const cb = this.onCloseCb; this.onCloseCb = null;
    cb?.();
    this.relock();
  }

  relock() {
    const inp = this.game.input;
    if (inp.locked) return;
    inp.lock();
    if (inp.touch) return;
    clearTimeout(this._lockT);
    this._lockT = setTimeout(() => { if (!inp.locked && !this.isOpen && !this.game.uiOpen) this.resumeEl.classList.remove('hidden'); }, 450);
  }

  boot(delay) {
    this.booted = true;
    const b = this.bootEl;
    b.classList.remove('hidden');
    const s = this.game.state;
    const lines = ['CAPSULE BIOS v1.06  (C) 1998 Capsule Systems', '', 'CPU : Capsule 486DX2-66', `Memory Test : 8192K OK`, 'Detecting drives ... FLOPPY A: CD-ROM D:', `Figures found : ${Object.keys(s.discovered || {}).length}`, '', 'Starting CAPSULE OS 98 ...'];
    b.innerHTML = '<div class="cos-bios"></div><div class="cos-logo hidden"><div class="cos-logo-cap"></div><div class="cos-logo-t">Capsule<b>OS 98</b></div><div class="cos-logo-bar"><i></i></div></div>';
    const bios = b.querySelector('.cos-bios'), logo = b.querySelector('.cos-logo'), bar = logo.querySelector('i');
    let i = 0, t0 = performance.now() + delay;
    const done = () => { b.classList.add('hidden'); clearInterval(this._bootT); sfx('osBoot'); };
    this._bootT = setInterval(() => {
      const t = performance.now() - t0;
      if (t < 0) return;
      if (i < lines.length && t > i * 110) { bios.textContent += lines[i] + '\n'; if (i === 2) sfx('chipSelect', { vol: 0.5 }); i++; }
      if (t > 1000) { bios.classList.add('hidden'); logo.classList.remove('hidden'); bar.style.width = `${Math.min(100, (t - 1000) / 9)}%`; }
      if (t > 2050) done();
    }, 40);
    b.onclick = done;
    this._skipBoot = done;
  }

  applyWallpaper() {
    const k = this.room.state.wallpaper || 0;
    if (this._wall === k) return;
    this._wall = k;
    this.desk.style.backgroundImage = `url(${wallpaperURL(k)})`;
  }

  // ------------------------------------------------------------------ windows
  launch(id, arg) {
    const def = this.apps.get(id);
    if (!def) return null;
    this.toggleStart(false);
    if (def.single !== false) {
      const ex = this.wins.find((w) => w.app === id);
      if (ex) { ex.min = false; ex.el.classList.remove('min'); this.focus(ex); ex.inst?.onArg?.(arg); return ex; }
    }
    sfx('osOpen');
    const el = document.createElement('div');
    el.className = 'cos-win' + (def.cls ? ' ' + def.cls : '');
    el.innerHTML = `<div class="cos-tb">${ic(def.icon, 1)}<span class="t">${esc(def.title)}</span>
      <button class="cos-tbb" data-w="min" title="Minimise">${ic('minus', 1)}</button><button class="cos-tbb" data-w="x" title="Close (Esc)">${ic('close', 1)}</button></div>
      <div class="cos-body"></div>`;
    this.winsEl.appendChild(el);
    const sr = this.desk.getBoundingClientRect();
    const fit = def.size ? def.size(sr.width, sr.height - 4) : [def.w || 480, def.h || 340];
    const w = { app: id, def, el, body: el.querySelector('.cos-body'), title: el.querySelector('.t'), min: false };
    w.w = Math.min(fit[0], sr.width - 8); w.h = Math.min(fit[1], sr.height - 8);
    el.style.width = `${w.w}px`; el.style.height = `${w.h}px`;
    const n = this.wins.length;
    w.x = Math.round((sr.width - w.w) / 2 + (n % 4) * 26 - 30); w.y = Math.round((sr.height - w.h) / 2.4 + (n % 4) * 22 - 20);
    this.clampWin(w);
    w.setTitle = (s) => { w.title.textContent = s; this.renderTasks(); };
    w.close = () => this.closeWin(w);
    this.wins.push(w);
    this.dragify(w);
    this.focus(w);
    try { w.inst = def.create(w, this, arg) || {}; } catch (e) { console.error(e); w.body.textContent = 'This program has performed an illegal operation.'; w.inst = {}; }
    this.renderTasks();
    return w;
  }

  closeWin(w, silent = false) {
    const i = this.wins.indexOf(w);
    if (i < 0) return;
    try { w.inst?.onClose?.(); } catch (e) { console.warn(e); }
    this.wins.splice(i, 1);
    w.el.classList.add('closing');
    setTimeout(() => w.el.remove(), 140);
    if (!silent) sfx('osClose');
    this.focus(this.wins.filter((x) => !x.min).sort((a, b) => b.zi - a.zi)[0] || null);
    this.renderTasks();
  }

  focus(w) {
    if (this.active === w && w) return;
    this.active?.el.classList.remove('active');
    this.active?.inst?.onBlur?.();
    this.active = w || null;
    if (!w) { this.renderTasks(); return; }
    w.zi = ++this.z;
    w.el.style.zIndex = w.zi;
    w.el.classList.add('active');
    w.inst?.onFocus?.();
    this.renderTasks();
  }

  minimise(w) {
    w.min = true;
    w.el.classList.add('min');
    w.inst?.onBlur?.();
    if (this.active === w) { this.active = null; this.focus(this.wins.filter((x) => !x.min).sort((a, b) => b.zi - a.zi)[0] || null); }
    this.renderTasks();
  }

  clampWin(w) {
    const sr = this.desk.getBoundingClientRect();
    w.x = Math.max(0, Math.min(sr.width - Math.min(w.w, sr.width), w.x));
    w.y = Math.max(0, Math.min(sr.height - 30, w.y));
    w.el.style.left = `${w.x}px`; w.el.style.top = `${w.y}px`;
  }

  dragify(w) {
    const tb = w.el.querySelector('.cos-tb');
    tb.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.cos-tbb')) return;
      const sx = e.clientX, sy = e.clientY, ox = w.x, oy = w.y;
      tb.setPointerCapture(e.pointerId);
      const mv = (ev) => { w.x = ox + ev.clientX - sx; w.y = oy + ev.clientY - sy; this.clampWin(w); };
      const up = () => { tb.removeEventListener('pointermove', mv); tb.removeEventListener('pointerup', up); tb.removeEventListener('pointercancel', up); };
      tb.addEventListener('pointermove', mv); tb.addEventListener('pointerup', up); tb.addEventListener('pointercancel', up);
    });
  }

  renderTasks() {
    this.tasksEl.innerHTML = this.wins.map((w, i) => `<button class="cos-taskb${w === this.active ? ' on' : ''}" data-task="${i}">${ic(w.def.icon, 1)}<span>${esc(w.title.textContent)}</span></button>`).join('');
  }

  toggleStart(on = this.smEl.classList.contains('hidden')) {
    this.smEl.classList.toggle('hidden', !on);
    this.el.querySelector('.cos-start').classList.toggle('on', on);
  }

  // ------------------------------------------------------------------ input
  onClick(e) {
    const t = e.target;
    const b = t.closest('[data-act], [data-launch], [data-task], [data-w], .cos-ico');
    if (!b) return;
    if (b.classList.contains('cos-ico')) {
      // single click selects, a second click (or a tap) opens
      if (b.classList.contains('sel') || this.game.input.touch) { this.launch(b.dataset.app); b.classList.remove('sel'); return; }
      for (const i of this.iconsEl.children) i.classList.remove('sel');
      b.classList.add('sel');
      clearTimeout(this._selT); this._selT = setTimeout(() => b.classList.remove('sel'), 1600);
      return;
    }
    if (b.dataset.launch) { this.launch(b.dataset.launch); return; }
    if (b.dataset.task !== undefined) {
      const w = this.wins[+b.dataset.task];
      if (!w) return;
      if (w === this.active && !w.min) this.minimise(w);
      else { w.min = false; w.el.classList.remove('min'); this.focus(w); }
      return;
    }
    if (b.dataset.w) {
      const w = this.wins.find((x) => x.el.contains(b));
      if (!w) return;
      if (b.dataset.w === 'x') this.closeWin(w); else this.minimise(w);
      return;
    }
    const act = b.dataset.act;
    if (act === 'start') { this.toggleStart(); sfx('chipSelect', { vol: 0.5 }); }
    else if (act === 'off') this.close();
    else if (act === 'mail') this.launch('mail');
    else if (act === 'music') this.launch('music');
    else if (act === 'wall') {
      this.room.state.wallpaper = ((this.room.state.wallpaper || 0) + 1) % WALLPAPERS.length;
      this.applyWallpaper();
      this.notify(`Wallpaper: ${WALLPAPERS[this.room.state.wallpaper].name}`, 'cos_wall');
      this.toggleStart(false);
    }
  }

  onKey(e, down) {
    if (!this.isOpen) return;
    if (down && this._skipBoot && !this.bootEl.classList.contains('hidden')) { this._skipBoot(); e.preventDefault(); return; }
    const w = this.active && !this.active.min ? this.active : null;
    if (e.code === 'Escape') {
      if (!down) return;
      e.preventDefault(); e.stopPropagation();
      if (!this.smEl.classList.contains('hidden')) { this.toggleStart(false); return; }
      if (w && w.inst?.onEsc?.() === true) return; // the app handled it (e.g. pause)
      if (w) { this.closeWin(w); return; }
      this.close();
      return;
    }
    // keys typed into a text field stay there
    if (e.target?.closest?.('input, textarea')) return;
    if (w?.inst?.onKey) {
      const used = w.inst.onKey(e, down);
      if (used !== false && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    }
  }

  // ------------------------------------------------------------------ loop + bits
  loop(t) {
    this.raf = 0;
    if (!this.isOpen) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    for (const w of this.wins) if (!w.min) { try { w.inst?.tick?.(dt, w === this.active); } catch (e) { console.warn(e); } }
    this.clockT = (this.clockT || 0) - dt;
    if (this.clockT <= 0) { this.clockT = 1; this.tickClock(); this.updateBadges(); }
    this.raf = requestAnimationFrame((tt) => this.loop(tt));
  }

  tickClock() {
    const d = new Date(), day = this.game.state.day || 1, { wdName } = dateOf(day);
    this.clockEl.innerHTML = `<span class="d">${wdName} · Day ${day}</span><span class="h">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span>`;
  }

  /** A balloon tip from the tray. */
  notify(text, icon = 'info', ms = 3200) {
    const b = document.createElement('div');
    b.className = 'cos-balloon';
    b.innerHTML = `${ic(icon, 1)}<span>${esc(text)}</span>`;
    this.balloonsEl.appendChild(b);
    setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 300); }, ms);
    while (this.balloonsEl.children.length > 3) this.balloonsEl.firstChild.remove();
  }

  /** Low-res picture of the desktop for the 3D monitor while the camera glides in and out. */
  drawPreview(g, W, H, t) {
    const img = wallpaperImage(this.room.state.wallpaper || 0);
    if (img?.complete) { g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, W, H - 28); } else { g.fillStyle = '#2a6a7a'; g.fillRect(0, 0, W, H - 28); }
    // icons (little tiles + labels)
    let i = 0;
    for (const id of this.order) {
      const a = this.apps.get(id);
      const x = 16 + Math.floor(i / 6) * 84, y = 14 + (i % 6) * 70;
      const ico = iconImage(a.icon);
      if (ico?.complete) g.drawImage(ico, x + 16, y, 52, 52); else { g.fillStyle = '#ffd23f'; g.fillRect(x + 22, y + 4, 40, 40); }
      g.fillStyle = '#fff'; g.font = '16px Alagard, monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText((a.label || a.title).slice(0, 10), x + 42, y + 52);
      i++;
    }
    // open windows as rectangles
    for (const w of this.wins) {
      if (w.min) continue;
      const sr = this.desk.getBoundingClientRect();
      const kx = W / Math.max(1, sr.width), ky = (H - 28) / Math.max(1, sr.height);
      g.fillStyle = '#d8d0c0'; g.fillRect(w.x * kx, w.y * ky, w.w * kx, w.h * ky);
      g.fillStyle = w === this.active ? '#d8463a' : '#8a8478'; g.fillRect(w.x * kx + 3, w.y * ky + 3, w.w * kx - 6, 20);
      g.fillStyle = '#f4f0e6'; g.fillRect(w.x * kx + 6, w.y * ky + 28, w.w * kx - 12, w.h * ky - 34);
    }
    // taskbar
    g.fillStyle = '#d8d0c0'; g.fillRect(0, H - 28, W, 28);
    g.fillStyle = '#fff'; g.fillRect(0, H - 28, W, 2);
    g.fillStyle = '#e5383b'; g.fillRect(4, H - 24, 70, 20);
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText('Start', 20, H - 23);
    const d = new Date();
    g.fillStyle = '#2a2220'; g.textAlign = 'right'; g.fillText(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, W - 10, H - 23);
  }
}

const imgCache = new Map();
function wallpaperImage(k) {
  const key = 'w' + k;
  if (!imgCache.has(key)) { const im = new Image(); im.src = wallpaperURL(k); imgCache.set(key, im); }
  return imgCache.get(key);
}
function iconImage(name) {
  const key = 'i' + name;
  if (!imgCache.has(key)) { const im = new Image(); im.src = iconURL(name, 2); imgCache.set(key, im); }
  return imgCache.get(key);
}
