// Capsule Navigator: the web browser, and the platform for every website in the game.
//   game.os.browser.registerSite({ domain, title, favicon, render(page, path, nav, ctx), keywords?, listed? })
//       domain without "www." ('morio-shimbun.jp'); render builds DOM into `page` (a plain div) for `path`
//       ('/', '/article/3', ...). nav(url) navigates (absolute 'http://...', or '/path' on the same site).
//       ctx: { game, os, browser, win, url: { href, host, domain, path, query (URLSearchParams) },
//              title(t), status(text), replace(path) (change the address without reloading), full(on) (the page fills
//              the view with its own scrolling), onLeave(fn), notFound(), newWindow(url) }
//       Links in pages: <a href="http://www.x.jp/y"> or <a href="/y"> or any element with data-href.
//       Return a function from render to clean up when the page is left (or use ctx.onLeave).
//   game.os.browser.open(url)  opens a browser window on url;  .sites (Map)  .parse(url)
import { h, esc, ic, btn } from './ui.js';
import { glyph } from '../art.js';
import { installSites } from './sites.js';
import './apps.css';
import './sites.css';

export function parseUrl(s) {
  s = String(s || '').trim();
  if (!/^[a-z]+:\/\//i.test(s)) s = 'http://' + s;
  const m = /^([a-z]+):\/\/([^/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(s) || [];
  const host = (m[2] || '').toLowerCase(), domain = host.replace(/^www\./, '');
  const path = m[3] || '/', search = m[4] || '';
  return { href: `http://${host}${path}${search}`, host, domain, path, search, query: new URLSearchParams(search.slice(1)) };
}
const looksLikeUrl = (s) => /^[a-z]+:\/\//i.test(s) || (/^[^\s]+\.[a-z]{2,}([/?].*)?$/i.test(s) && !/\s/.test(s));

export function installBrowser(game, os) {
  const st = os.st.web ||= { bookmarks: null, visited: {}, history: [], dialed: false };
  st.bookmarks ||= [
    ['CapsuleNet', 'http://www.capsule.ne.jp/'], ['GACHA-MART', 'http://www.gacha-mart.co.jp/'], ['Morio Shimbun', 'http://www.morio-shimbun.jp/'],
    ['Tenki Net Weather', 'http://www.tenki.ne.jp/'], ['BuzzLane Ads', 'http://www.buzzlane.jp/'], ['Daikoku Toy Wholesale', 'http://www.daikoku-toys.co.jp/'],
  ];
  const sites = new Map();
  const browser = os.browser = {
    sites, parse: parseUrl, home: 'http://www.capsule.ne.jp/',
    registerSite(def) { if (!def?.domain || !def.render) throw new Error('registerSite: domain + render'); sites.set(def.domain.toLowerCase().replace(/^www\./, ''), def); },
    open(url) { return os.open('browser', { url, fresh: true }); },
    storePage: () => null,
    visited: (href) => !!st.visited[href],
  };

  os.registerApp({
    id: 'browser', name: 'Capsule Navigator', label: 'Navigator', icon: 'os_globe', group: 'Internet', w: 780, h: 560, minW: 420, minH: 300, multi: true,
    about: 'Capsule Navigator 4.06 - the friendly way to surf the information superhighway.',
    open(win, args) {
      // one window per call to browser.open(); the desktop icon re-uses an existing window
      new BrowserWin(game, os, browser, st, win, args);
    },
  });
  // the desktop icon focuses the open browser instead of stacking new ones
  const openApp = os.open.bind(os);
  os.open = (id, args = {}) => {
    if (id === 'browser' && !args.fresh) {
      const w = os.wins.find((x) => x.app === 'browser');
      if (w) { w.restore(); os.focus(w); if (args.url) w.nav?.(args.url); return w; }
    }
    return openApp(id, args);
  };
  installSites(game, os, browser);
}

class BrowserWin {
  constructor(game, os, browser, st, win, args) {
    Object.assign(this, { game, os, browser, st, win });
    this.back = []; this.fwd = [];
    this.cur = null; this.leave = [];
    this.loadId = 0;
    win.body.classList.add('br');
    win.menubar([
      { label: 'File', items: [
        { label: 'New Window', key: 'Ctrl+N', action: () => browser.open(this.cur?.href || browser.home) },
        { label: 'Open Location...', key: 'Ctrl+L', action: () => this.loc.select() },
        { sep: true }, { label: 'Close', action: () => win.close() }] },
      { label: 'Edit', items: [{ label: 'Find in Page...', disabled: true }, { label: 'Preferences...', action: () => os.alert('Navigator preferences are managed by your Internet service provider (CapsuleNet).', 'Preferences') }] },
      { label: 'View', items: [
        { label: 'Reload', key: 'F5', action: () => this.reload() }, { label: 'Stop', key: 'Esc', action: () => this.stop() },
        { sep: true }, { label: 'Page Source', action: () => this.source() }] },
      { label: 'Go', items: () => [
        { label: 'Back', disabled: !this.back.length, action: () => this.goBack() }, { label: 'Forward', disabled: !this.fwd.length, action: () => this.goFwd() },
        { label: 'Home', action: () => this.nav(browser.home) }, { sep: true },
        ...st.history.slice(-9).reverse().map(([t, u]) => ({ label: t.slice(0, 40), action: () => this.nav(u) }))] },
      { label: 'Bookmarks', items: () => [
        { label: 'Add Bookmark', key: 'Ctrl+D', action: () => this.addBookmark() }, { sep: true },
        ...st.bookmarks.map(([t, u]) => ({ label: t, icon: 'os_star', action: () => this.nav(u) }))] },
      { label: 'Help', items: [
        { label: 'Capsule Navigator Help', action: () => this.nav('http://www.capsule98.co.jp/help') },
        { label: 'About Capsule Navigator', action: () => os.dialog({ title: 'About Capsule Navigator', icon: 'os_globe', html: '<p><b>Capsule Navigator</b> 4.06</p><p>Copyright (C) 1994-1998 Capsule Systems Inc.<br>All rights reserved.</p><p class="c98-dim">This product includes 40-bit encryption for use in Japan.</p>' }) }] },
    ]);
    const tbtn = (icon, label, fn) => { const b = h('button', { class: 'c98-tbtn', html: `${icon}<span>${label}</span>` }); b.addEventListener('click', fn); return b; };
    const G = (n) => glyph(n, '#1a1416', 2);
    this.bBack = tbtn(G('g_back'), 'Back', () => this.goBack());
    this.bFwd = tbtn(G('g_fwd'), 'Forward', () => this.goFwd());
    this.bStop = tbtn(G('g_stop'), 'Stop', () => this.stop());
    this.throb = h('div', { class: 'br-throb', html: ic('os_logo', 2) });
    const tools = h('div', { class: 'c98-toolbar' }, this.bBack, this.bFwd, tbtn(G('g_reload'), 'Reload', () => this.reload()), tbtn(G('g_home'), 'Home', () => this.nav(browser.home)),
      tbtn(ic('os_find', 1), 'Search', () => this.nav('http://www.capsule.ne.jp/search')), h('i', { class: 'sep' }), this.bStop, h('div', { class: 'grow' }), this.throb);
    this.loc = h('input', { class: 'c98-field br-loc', type: 'text', spellcheck: 'false' });
    this.loc.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.go(this.loc.value); } });
    this.loc.addEventListener('focus', () => setTimeout(() => this.loc.select(), 0));
    const locRow = h('div', { class: 'br-locrow' }, h('span', { class: 'br-lbl', text: 'Location:' }), this.loc, btn('Go', () => this.go(this.loc.value), { cls: 'small' }));
    this.links = h('div', { class: 'br-links' });
    this.view = h('div', { class: 'br-view' });
    win.body.append(tools, locRow, this.links, this.view);
    this.renderLinks();
    win.status('Document: Done', '<span class="br-pg"><i></i></span>', `${ic('os_lock', 1)}`);
    this.view.addEventListener('click', (e) => this.onClick(e));
    this.view.addEventListener('mouseover', (e) => {
      const a = e.target.closest('a[href], [data-href]');
      const href = a ? this.resolve(a.getAttribute('href') || a.dataset.href) : null;
      if (href !== this._hover) { this._hover = href; this.setStatus(href || this.doneText()); }
    });
    win.onKey = (e) => {
      if (e.code === 'F5') { this.reload(); return true; }
      if (e.altKey && e.code === 'ArrowLeft') { this.goBack(); return true; }
      if (e.altKey && e.code === 'ArrowRight') { this.goFwd(); return true; }
      if (e.ctrlKey && e.code === 'KeyL') { this.loc.focus(); return true; }
      if (e.ctrlKey && e.code === 'KeyD') { this.addBookmark(); return true; }
      if (e.code === 'Backspace') { this.goBack(); return true; }
      return false;
    };
    win.nav = (u) => this.nav(u);
    win.onArgs = (a) => { if (a?.url) this.nav(a.url); };
    win.onClose(() => this.cleanup());
    this.nav(args.url || browser.home);
  }

  doneText() { return this.loading ? this._stText : 'Document: Done'; }
  setStatus(t) {
    const sp = this.win.statusEl.firstChild;
    if (sp) sp.textContent = t;
  }
  setProgress(k) {
    const i = this.win.statusEl.querySelector('.br-pg i');
    if (i) i.style.width = `${Math.round(k * 20) * 5}%`;
  }
  renderLinks() {
    this.links.textContent = '';
    this.links.append(h('span', { class: 'br-lbl', text: 'Links:' }));
    for (const [t, u] of this.st.bookmarks.slice(0, 6)) {
      const b = h('button', { class: 'c98-btn flat small', html: `${ic('os_star', 1)} ${esc(t)}` });
      b.addEventListener('click', () => this.nav(u));
      this.links.append(b);
    }
  }
  resolve(href) {
    if (!href) return null;
    if (/^[a-z]+:\/\//i.test(href)) return href;
    const c = this.cur ? parseUrl(this.cur.href) : parseUrl(this.browser.home);
    if (href.startsWith('?')) return `http://${c.host}${c.path}${href}`;
    if (href.startsWith('/')) return `http://${c.host}${href}`;
    if (href.startsWith('#')) return null;
    if (/^[^/]+\.[a-z]{2,}/i.test(href)) return 'http://' + href;
    return `http://${c.host}${c.path.replace(/[^/]*$/, '')}${href}`;
  }
  onClick(e) {
    const a = e.target.closest('a[href], [data-href]');
    if (!a || !this.view.contains(a)) return;
    e.preventDefault();
    const href = this.resolve(a.getAttribute('href') || a.dataset.href);
    if (!href) return;
    if (a.getAttribute('target') === '_blank') { this.browser.open(href); return; }
    this.nav(href);
  }
  go(text) {
    const s = String(text || '').trim();
    if (!s) return;
    this.nav(looksLikeUrl(s) ? s : `http://www.capsule.ne.jp/search?q=${encodeURIComponent(s)}`);
  }
  goBack() { if (!this.back.length) { this.os.sound('osError'); return; } this.fwd.push(this.cur.href); this.nav(this.back.pop(), { push: false }); }
  goFwd() { if (!this.fwd.length) return; this.back.push(this.cur.href); this.nav(this.fwd.pop(), { push: false }); }
  reload() { if (this.cur) this.nav(this.cur.href, { push: false }); }
  stop() {
    if (!this.loading) return;
    this.loadId++;
    this.loading = false;
    this.endLoad('Transfer interrupted!');
  }
  addBookmark() {
    if (!this.cur) return;
    if (this.st.bookmarks.some(([, u]) => u === this.cur.href)) { this.os.alert('This page is already in your bookmarks.', 'Bookmarks'); return; }
    this.st.bookmarks.push([this.cur.title || this.cur.href, this.cur.href]);
    this.renderLinks();
    this.os.notify({ title: 'Bookmark added', body: this.cur.title || this.cur.href, icon: 'os_star' });
  }
  source() {
    const t = this.cur?.title || 'Untitled';
    const src = `<HTML>\n<HEAD>\n<TITLE>${t}</TITLE>\n<META NAME="GENERATOR" CONTENT="Capsule HomePage Builder 2.0">\n</HEAD>\n<BODY BGCOLOR="#FFFFFF" TEXT="#000000" LINK="#0000EE" VLINK="#551A8B">\n<CENTER>\n<!-- best viewed in Capsule Navigator 4 at 800x600 -->\n<TABLE WIDTH=600 BORDER=0>\n<TR><TD>\n${(this.page?.innerText || '').split('\n').filter(Boolean).slice(0, 30).map((l) => '<P>' + l.slice(0, 70)).join('\n')}\n</TD></TR>\n</TABLE>\n</CENTER>\n</BODY>\n</HTML>\n`;
    this.os.open('notepad', { text: src, name: `${parseUrl(this.cur?.href || '').domain || 'page'}.htm`, readOnly: true });
  }

  cleanup() {
    for (const fn of this.leave.splice(0)) { try { fn(); } catch (e) { console.warn(e); } }
    if (this.browser._storeWin === this) this.browser._storeWin = null;
  }

  endLoad(text = 'Document: Done') {
    this.throb.classList.remove('on');
    this.win.busy(false);
    this.bStop.disabled = true;
    this.setProgress(0);
    this.setStatus(text);
  }

  /** Load a page: the fake network wait (a dial-up the first time), then the site renders. */
  nav(url, { push = true } = {}) {
    const u = parseUrl(url);
    if (push && this.cur && this.cur.href !== u.href) { this.back.push(this.cur.href); this.fwd = []; }
    const id = ++this.loadId;
    this.loading = true;
    this.loc.value = u.href;
    this.throb.classList.add('on');
    this.win.busy(true);
    this.bStop.disabled = false;
    this.bBack.disabled = !this.back.length; this.bFwd.disabled = !this.fwd.length;
    const site = this.browser.sites.get(u.domain);
    const steps = [];
    if (!this.st.dialed) {
      this.st.dialed = true;
      this.os.sound('modem', { vol: 0.8 });
      steps.push(['Dialing CapsuleNet (03-5555-0198)...', 900], ['Verifying user name and password...', 500], ['Logging on to network...', 400]);
    }
    steps.push([`Looking up host: ${u.host}...`, 120 + Math.random() * 120]);
    if (site) steps.push([`Connecting to host ${u.host}...`, 150 + Math.random() * 200], [`Host contacted. Waiting for reply...`, site.slow ? 700 : 160 + Math.random() * 260]);
    let t = 0;
    const total = steps.reduce((a, s) => a + s[1], 0);
    const run = (i) => {
      if (id !== this.loadId) return;
      if (i >= steps.length) { this.render(u, site, id); return; }
      this._stText = steps[i][0];
      this.setStatus(steps[i][0]);
      this.setProgress(t / total);
      t += steps[i][1];
      setTimeout(() => run(i + 1), steps[i][1]);
    };
    run(0);
  }

  render(u, site, id) {
    this.cleanup();
    const page = h('div', { class: 'br-page' });
    this.page = page;
    this.view.classList.remove('full');
    this.view.textContent = '';
    this.view.append(page);
    this.view.scrollTop = 0;
    let title = site?.title || u.host;
    const ctx = {
      game: this.game, os: this.os, browser: this.browser, win: this.win, url: u,
      title: (t) => { title = t; if (this.cur) this.cur.title = t; this.win.setTitle(`${t} - Capsule Navigator`); },
      status: (s) => this.setStatus(s),
      replace: (path) => {
        const nu = parseUrl(`http://${u.host}${path}`);
        if (this.cur && nu.href !== this.cur.href) { this.back.push(this.cur.href); this.fwd = []; }
        this.cur = { href: nu.href, title };
        this.loc.value = nu.href;
        this.st.visited[nu.href] = 1;
        this.bBack.disabled = !this.back.length; this.bFwd.disabled = !this.fwd.length;
      },
      full: (on = true) => this.view.classList.toggle('full', on),
      onLeave: (fn) => this.leave.push(fn),
      notFound: () => { page.textContent = ''; errorPage(page, '404', u); title = '404 Not Found'; },
      newWindow: (url) => this.browser.open(url),
      nav: (url) => this.nav(this.resolve(url)),
      bw: this,
    };
    this.cur = { href: u.href, title };
    try {
      if (!site) { errorPage(page, 'dns', u); title = 'Server not found'; } else {
        const cleanup = site.render(page, u.path, (url) => this.nav(this.resolve(url)), ctx);
        if (typeof cleanup === 'function') this.leave.push(cleanup);
      }
    } catch (e) {
      console.error(e);
      page.textContent = '';
      errorPage(page, '500', u);
      title = 'Error';
    }
    if (id !== this.loadId) return;
    this.cur.title = title;
    this.win.setTitle(`${title} - Capsule Navigator`);
    this.st.visited[u.href] = 1;
    this.st.history.push([title, u.href]);
    if (this.st.history.length > 60) this.st.history.splice(0, 20);
    for (const a of page.querySelectorAll('a[href]')) { const r = this.resolve(a.getAttribute('href')); if (r && this.st.visited[r]) a.classList.add('v'); }
    this.loading = false;
    this.bBack.disabled = !this.back.length; this.bFwd.disabled = !this.fwd.length;
    this.endLoad();
    this.game.events.emit('os:web', { href: u.href, domain: u.domain });
  }
}

function errorPage(page, kind, u) {
  if (kind === 'dns') {
    page.innerHTML = `<div class="br-err">${ic('os_warn', 2)}<div><h2>Server not found</h2>
      <p>Capsule Navigator is unable to locate the server <b>${esc(u.host)}</b>.</p><p>The server does not have a DNS entry. Check the server name in the Location (URL) and try again.</p>
      <p><a href="http://www.capsule.ne.jp/search?q=${encodeURIComponent(u.domain.split('.')[0])}">Search CapsuleNet for "${esc(u.domain.split('.')[0])}"</a></p></div></div>`;
  } else if (kind === '404') {
    page.innerHTML = `<div class="br-404"><h1>Not Found</h1><p>The requested URL ${esc(u.path)} was not found on this server.</p><hr><address>Apache/1.3.6 Server at ${esc(u.host)} Port 80</address></div>`;
  } else {
    page.innerHTML = `<div class="br-err">${ic('os_error', 2)}<div><h2>The page cannot be displayed</h2><p>The page you are looking for is currently unavailable. The Web site might be experiencing technical difficulties.</p><p>Please try the <a href="${esc(u.href)}">Reload</a> button, or try again later.</p></div></div>`;
  }
}
