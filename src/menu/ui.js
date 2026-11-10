// The title screen's paper UI: the enamel sign hanging from the top of the picture on two wires, and a strand of twine
// tied under it with the menu's paper tags threaded on it (src/menu/tags.js: a tall cream ticket for the way in, manila
// tags, short kraft ones; words only, no icons). Hover (or keyboard focus): the tag swings on the twine, lifts a texel,
// gets a red-pen tick and a pencil underline, and blips an 8-bit note. Pick: a 済 hanko stamps it.
// Layout picks whole-number pixel scales for the viewport; when the strand would run off the bottom it goes compact
// (no notes, no tall ticket), then splits into two strands (landscape phones); in portrait the sign hangs in the middle.
//   const ui = new MenuUI(root, { onPick(id), onHover(id) });  ui.setItems([{ id, label, note, sub, primary, tier }]);
//   ui.show(on)  ui.stamp(id) -> Promise  ui.leave()  ui.focus(id)  ui.dispose()
//   confirmSlip({ title, body, yes, no }) -> Promise<boolean>
import { audio } from '../core/audio.js';
import { paintLogo } from './logo.js';
import { paintTag, tagSpec, HOLE, paintItchTag } from './tags.js';

const NOTES = [72, 74, 76, 79, 81, 84, 86, 88]; // a pentatonic run: each tag has its own blip
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const sfx = (n, o = {}) => { try { audio.init(); audio.play(n, o); } catch { /* audio not ready */ } };

export class MenuUI {
  constructor(root, opts = {}) {
    this.root = root;
    this.opts = opts;
    this.el = document.createElement('div');
    this.el.className = 'tm';
    this.el.innerHTML = '<div class="tm-sign" aria-hidden="true"></div><nav class="tm-tags" aria-label="Main menu"></nav>';
    root.appendChild(this.el);
    this.signEl = this.el.querySelector('.tm-sign');
    this.nav = this.el.querySelector('.tm-tags');
    this.logo = paintLogo();
    this.items = [];
    this.tags = [];
    this.hot = -1;
    this.enabled = true;
    this.onResize = () => this.layout();
    addEventListener('resize', this.onResize);
    this.onKey = (e) => this.key(e);
    addEventListener('keydown', this.onKey);
  }

  setItems(items) {
    this.items = items;
    this.nav.innerHTML = '';
    for (const tw of this.twines || []) tw.remove();
    this.tags = items.map((it, i) => {
      const b = document.createElement('button');
      b.className = 'tm-tag';
      b.type = 'button';
      b.dataset.id = it.id;
      b.setAttribute('aria-label', it.label);
      b.style.setProperty('--i', i);
      b.style.setProperty('--rest', `${[-1.2, 0.8, -0.4, 1.1, -0.9, 0.5, -0.6, 0.9][i % 8]}deg`);
      b.innerHTML = '<span class="tm-swing"><span class="tm-paper"></span><i class="tm-stamp"></i></span>';
      const t = { it, b, i };
      b.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') this.setHot(i, true); });
      b.addEventListener('pointerleave', () => { if (this.hot === i && document.activeElement !== b) this.setHot(-1); });
      b.addEventListener('focus', () => this.setHot(i, true));
      b.addEventListener('blur', () => { if (this.hot === i) this.setHot(-1); });
      b.addEventListener('click', (e) => { e.stopPropagation(); this.pick(i); });
      for (const ev of ['pointerdown', 'pointerup']) b.addEventListener(ev, (e) => e.stopPropagation());
      this.nav.appendChild(b);
      return t;
    });
    this.twines = [];
    this.layout();
  }

  /** Whole-number pixel scales and positions for the viewport (tags and sign are redrawn at the new scale). */
  layout() {
    const W = innerWidth, H = innerHeight, portrait = H > W * 1.15;
    const L = this.logo, items = this.items, n = this.tags.length;
    const tagS = W >= 1800 && H >= 1000 ? 3 : 2;
    const gap = Math.round(tagS * 3.5), group = tagS * 3; // between tags, and a little more between the three weights
    // the sign: as big as fits a third of the height (portrait: most of the width)
    let logoS = Math.max(2, Math.min(6, Math.floor(portrait ? (W * 0.8) / L.w : Math.min((H * 0.42) / (L.board.y + L.board.h), (W * 0.36) / L.w))));
    if (!portrait && H < 560) logoS = Math.max(2, Math.min(logoS, Math.floor((H * 0.3) / (L.board.y + L.board.h))));
    const signW = L.w * logoS, signH = (L.board.y + L.board.h) * logoS;
    const pad = Math.max(16, Math.round(Math.min(W, H) * 0.035));
    const left = portrait ? Math.round((W - signW) / 2) : pad + Math.round(W * 0.01);
    L.art.canvas(logoS, this.signCanvas || (this.signCanvas = this.signEl.appendChild(document.createElement('canvas'))));
    this.signEl.style.left = `${left}px`;
    this.signBox = { x: left, w: signW, h: signH };
    this.signEl.style.transformOrigin = `${L.pivot[0] * logoS}px 0`;
    // the tags' sizes: the manila tags share one width, the kraft ones a shorter one, the ticket is as wide as its words.
    // When the strand won't fit under the sign: the compact set (no notes, no tall ticket), then two strands side by
    // side (a phone held sideways; the second hangs from above the picture)
    let top0 = signH + Math.round(logoS * 3) + gap;
    const tier = (it) => (it.primary ? 1 : it.tier || 2);
    const sizes = (compact) => {
      const sp = items.map((it) => tagSpec(it, { compact }));
      const of = (n) => Math.max(0, ...sp.map((q, i) => (tier(items[i]) === n ? q.w : 0)));
      const wide = of(2), short = of(3);
      sp.forEach((q, i) => { const n = tier(items[i]); q.w = n === 3 ? short : n === 2 ? wide : Math.max(q.w, wide); q.compact = compact; });
      return sp;
    };
    const step = (i, a) => (i > a ? gap + (tier(items[i]) !== tier(items[i - 1]) ? group : 0) : 0);
    const colH = (sp, a, b) => { let y = 0; for (let i = a; i < b; i++) y += step(i, a) + sp[i].h * tagS; return y; };
    const room = H - top0 - pad;
    let sp = sizes(false);
    if (colH(sp, 0, n) > room || Math.max(...sp.map((q) => q.w)) * tagS > W * (portrait ? 0.92 : 0.6)) sp = sizes(true);
    const cols = !portrait && n > 3 && colH(sp, 0, n) > room ? 2 : 1;
    const per = Math.ceil(n / cols);
    const colW = Math.max(...sp.map((q) => q.w)) * tagS;
    // portrait: the tags hang low, under the shop, so the sign and the shot stay clear in the middle
    if (portrait) top0 = Math.max(top0, H - pad - colH(sp, 0, n) - Math.round(H * 0.02));
    this.cols = cols;
    // repaint the tags at this scale (only when something changed)
    this.tags.forEach((t, i) => {
      const q = sp[i], note = q.compact ? '' : t.it.note || '';
      const key = `${tagS}|${q.w}|${q.h}|${q.k}|${note}`;
      if (t.key === key) return;
      t.key = key;
      const P = t.b.querySelector('.tm-paper');
      P.innerHTML = '';
      const opts = { label: t.it.label, note, sub: t.it.sub || '', k: q.k, w: q.w, h: q.h, seed: 31 + t.i * 17, stock: t.it.stock || (t.it.primary ? 'cream' : tier(t.it) === 3 ? 'kraft' : 'manila'), dog: t.i % 3 === 1 };
      P.appendChild(paintTag(opts).canvas(tagS)).className = 'a';
      P.appendChild(paintTag({ ...opts, hot: true }).canvas(tagS)).className = 'b';
    });
    // twines (DOM strips through the holes) and tag positions
    for (const tw of this.twines) tw.remove();
    this.twines = [];
    const holeX = Math.round((HOLE.x + 0.5) * tagS), holeY = (q) => Math.floor(q.h / 2) * tagS + tagS / 2;
    // the strand ties on under the sign's left; in portrait the tags hang centred under it
    const x0 = portrait ? Math.min(Math.max(left + logoS * 6, Math.round((W - colW) / 2) + holeX), W - 8 - colW + holeX)
      : left + Math.round(L.board.w * 0.2) * logoS + Math.floor(logoS / 2);
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * (colW + tagS * 4), a = c * per, b = Math.min(n, a + per);
      if (b <= a) continue;
      let y = top0;
      for (let i = a; i < b; i++) {
        const t = this.tags[i], q = sp[i];
        y += step(i, a);
        t.b.style.left = `${x - holeX}px`; t.b.style.top = `${y}px`;
        t.b.style.width = `${q.w * tagS}px`; t.b.style.height = `${q.h * tagS}px`;
        t.b.style.setProperty('--ox', `${holeX}px`);
        t.b.style.setProperty('--oy', `${holeY(q)}px`);
        t.b.style.setProperty('--s', `${tagS}px`);
        t.b.classList.toggle('big', q.k === 2);
        y += q.h * tagS;
      }
      const tw = document.createElement('i');
      tw.className = 'tm-twine';
      const yEnd = y - sp[b - 1].h * tagS + holeY(sp[b - 1]) + tagS * 9;
      const yTop = x < left + signW - logoS * 4 ? signH - logoS : 0;
      tw.style.cssText = `left:${x - tagS}px;top:${yTop}px;height:${yEnd - yTop}px;width:${tagS * 2}px`;
      this.el.insertBefore(tw, this.nav);
      this.twines.push(tw);
    }
    this.el.style.setProperty('--tag-s', `${tagS}px`);
    this.el.classList.toggle('portrait', portrait);
    this.placeItch(tagS);
  }

  /** The little itch.io tag (free Duck Head for following), hung off the Wardrobe tag on a short thread. on: show it. */
  setItch(on, onPick) {
    this.itchOn = !!on;
    if (onPick) this.itchPick = onPick;
    if (!this.itchEl && on) {
      const b = this.itchEl = document.createElement('button');
      b.type = 'button';
      b.className = 'tm-itch';
      b.setAttribute('aria-label', 'Follow us on itch.io: free Duck Head');
      b.innerHTML = '<i class="tm-itch-thread"></i><span class="tm-itch-swing"><span class="tm-paper"></span></span>';
      b.addEventListener('click', (e) => { e.stopPropagation(); if (this.enabled) { sfx('paper', { vol: 0.6 }); this.itchPick?.(); } });
      for (const ev of ['pointerdown', 'pointerup']) b.addEventListener(ev, (e) => e.stopPropagation());
      b.addEventListener('pointerenter', () => { if (this.enabled) { b.classList.remove('hot'); void b.offsetWidth; b.classList.add('hot'); sfx('paper', { vol: 0.2 }); } });
      b.addEventListener('pointerleave', () => b.classList.remove('hot'));
      this.el.appendChild(b);
      this.itchS = 0;
    }
    if (this.itchEl) this.itchEl.hidden = !on;
    this.placeItch();
  }

  placeItch(tagS = this.itchS || 2) {
    const b = this.itchEl;
    if (!b || !this.itchOn) return;
    const t = this.tags.find((x) => x.it.id === 'wardrobe');
    if (!t) { b.hidden = true; return; }
    b.hidden = false;
    if (this.itchS !== tagS) {
      this.itchS = tagS;
      const P = b.querySelector('.tm-paper');
      P.innerHTML = '';
      P.appendChild(paintItchTag().canvas(tagS)).className = 'a';
      P.appendChild(paintItchTag({ hot: true }).canvas(tagS)).className = 'b';
    }
    // tied to the right end of the Wardrobe tag by a short thread; where there's no room for it there (a phone held
    // upright), it hangs on a thread from under the sign instead
    const tl = parseFloat(t.b.style.left), tt = parseFloat(t.b.style.top), tw = parseFloat(t.b.style.width), th = parseFloat(t.b.style.height);
    const iw = b.querySelector('canvas')?.offsetWidth || 119 * tagS;
    let x = tl + tw + 7 * tagS, y = tt + th / 2 - 3 * tagS - tagS / 2, below = false;
    if (x + iw > innerWidth - 8 && this.signBox) {
      const S = this.signBox;
      x = Math.min(innerWidth - 8 - iw, S.x + S.w - iw - 8 * tagS);
      y = S.h + 8 * tagS;
      below = true;
    }
    b.classList.toggle('below', below);
    b.style.left = `${Math.round(x)}px`; b.style.top = `${Math.round(y)}px`;
    b.style.setProperty('--s', `${tagS}px`);
  }

  setHot(i, sound = false) {
    if (i === this.hot) return;
    const prev = this.tags[this.hot];
    if (prev) prev.b.classList.remove('hot');
    this.hot = i;
    const t = this.tags[i];
    if (!t) { this.opts.onHover?.(null); return; }
    t.b.classList.remove('hot'); void t.b.offsetWidth; t.b.classList.add('hot');
    if (sound && this.enabled) {
      sfx('uiBeep', { f: midi(NOTES[i % NOTES.length]), vol: 0.5 });
      sfx('paper', { vol: 0.25 });
    }
    this.opts.onHover?.(t.it.id);
  }

  focus(id) { const t = this.tags.find((x) => x.it.id === id); t?.b.focus({ preventScroll: true }); }

  key(e) {
    if (!this.enabled || this.el.classList.contains('off')) return;
    if (document.querySelector('.overlay:not(.hidden):not(.menu)') || document.querySelector('.tm-modal')) return;
    const k = e.key;
    const n = this.tags.length;
    if (['ArrowDown', 'ArrowUp', 's', 'w', 'S', 'W'].includes(k)) {
      e.preventDefault();
      const d = k === 'ArrowDown' || k.toLowerCase() === 's' ? 1 : -1;
      const i = this.hot < 0 ? (d > 0 ? 0 : n - 1) : (this.hot + d + n) % n;
      this.tags[i].b.focus({ preventScroll: true });
    } else if ((k === 'ArrowRight' || k === 'ArrowLeft') && this.cols === 2 && this.hot >= 0) {
      e.preventDefault();
      const per = Math.ceil(n / 2), i = Math.min(n - 1, (this.hot + per) % (per * 2));
      this.tags[i].b.focus({ preventScroll: true });
    } else if ((k === 'Enter' || k === ' ') && this.hot >= 0 && document.activeElement !== this.tags[this.hot].b) {
      e.preventDefault();
      this.pick(this.hot);
    }
  }

  pick(i) {
    const t = this.tags[i];
    if (!t || !this.enabled) return;
    sfx('uiClick', { vol: 0.7 });
    this.opts.onPick?.(t.it.id, t);
  }

  /** The 済 hanko comes down on a tag. */
  stamp(id) {
    const t = this.tags.find((x) => x.it.id === id);
    if (!t) return Promise.resolve();
    t.b.classList.add('stamped');
    sfx('thud', { v: 0.18 });
    return new Promise((res) => setTimeout(res, 260));
  }

  unstamp() { for (const t of this.tags) t.b.classList.remove('stamped'); }

  /** Shown (the idle menu), or tucked away (a panel, the dressing room, the transition into the game). */
  show(on) {
    this.enabled = on;
    this.el.classList.toggle('off', !on);
    if (on) this.el.classList.remove('leaving');
    if (!on) this.setHot(-1);
  }

  /** Off the top: the sign is hauled up and the tags fall away. */
  leave() { this.enabled = false; this.setHot(-1); this.el.classList.add('leaving'); }

  dispose() {
    removeEventListener('resize', this.onResize);
    removeEventListener('keydown', this.onKey);
    this.el.remove();
  }
}

/** A pink carbon-copy slip with two answers. Resolves true for yes. */
export function confirmSlip({ title, body, yes = 'Yes', no = 'No', danger = true } = {}) {
  return new Promise((res) => {
    const wrap = document.createElement('div');
    wrap.className = 'tm-modal';
    wrap.innerHTML = `<div class="tm-slip${danger ? ' danger' : ''}" role="dialog" aria-modal="true">
      <div class="tm-slip-no">No. 0401</div>
      <div class="tm-slip-t"></div><p class="tm-slip-b"></p>
      <div class="tm-slip-btns"><button class="tm-btn no"></button><button class="tm-btn yes"></button></div></div>`;
    wrap.querySelector('.tm-slip-t').textContent = title;
    wrap.querySelector('.tm-slip-b').textContent = body;
    wrap.querySelector('.no').textContent = no;
    wrap.querySelector('.yes').textContent = yes;
    document.body.appendChild(wrap);
    sfx('paper', { vol: 0.6 });
    const done = (v) => {
      removeEventListener('keydown', onKey, true);
      wrap.classList.add('out');
      setTimeout(() => wrap.remove(), 200);
      sfx(v ? 'uiClick' : 'paper', { vol: 0.6 });
      res(v);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } };
    addEventListener('keydown', onKey, true);
    for (const ev of ['pointerdown', 'pointerup']) wrap.addEventListener(ev, (e) => e.stopPropagation());
    wrap.addEventListener('click', (e) => { if (e.target === wrap) done(false); });
    wrap.querySelector('.no').addEventListener('click', () => done(false));
    wrap.querySelector('.yes').addEventListener('click', () => done(true));
    setTimeout(() => wrap.querySelector('.no').focus({ preventScroll: true }), 60);
  });
}
