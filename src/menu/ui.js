// The title screen's paper UI: the enamel sign hanging from the top of the picture on two wires, and a strand of twine
// tied under it with the menu's manila price tags threaded on it. Hover (or keyboard focus): the tag swings on the twine,
// lifts a texel, gets a red-pen tick and a pencil underline, and blips an 8-bit note. Pick: a 済 hanko stamps it.
// Layout picks whole-number pixel scales for the viewport; when the strand would run off the bottom it splits into two
// strands (landscape phones); in portrait the sign hangs in the middle.
//   const ui = new MenuUI(root, { onPick(id), onHover(id) });  ui.setItems([{ id, label, note, icon }]);
//   ui.show(on)  ui.stamp(id) -> Promise  ui.leave()  ui.focus(id)  ui.dispose()
//   confirmSlip({ title, body, yes, no }) -> Promise<boolean>
import { audio } from '../core/audio.js';
import { paintLogo } from './logo.js';
import { paintTag, tagMetrics, HOLE } from './tags.js';

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
    const L = this.logo;
    const tagS = W >= 1800 && H >= 1000 ? 3 : 2;
    const M = tagMetrics(this.items);
    const tagH = M.h * tagS, gap = Math.round(tagS * 4.5);
    // the sign: as big as fits a third of the height (portrait: most of the width)
    let logoS = Math.max(2, Math.min(6, Math.floor(portrait ? (W * 0.8) / L.w : Math.min((H * 0.42) / (L.board.y + L.board.h), (W * 0.36) / L.w))));
    if (!portrait && H < 560) logoS = Math.max(2, Math.min(logoS, Math.floor((H * 0.3) / (L.board.y + L.board.h))));
    const signW = L.w * logoS, signH = (L.board.y + L.board.h) * logoS;
    const pad = Math.max(16, Math.round(Math.min(W, H) * 0.035));
    const left = portrait ? Math.round((W - signW) / 2) : pad + Math.round(W * 0.01);
    L.art.canvas(logoS, this.signCanvas || (this.signCanvas = this.signEl.appendChild(document.createElement('canvas'))));
    this.signEl.style.left = `${left}px`;
    this.signEl.style.setProperty('--px', `${logoS}px`);
    this.signEl.style.transformOrigin = `${L.pivot[0] * logoS}px 0`;
    // one strand from an eyelet under the left of the sign, or two side by side when one won't fit the height (the
    // second hangs from above the picture); small screens drop the pencilled notes to keep the tags narrow
    let top0 = signH + Math.round(logoS * 3) + gap;
    const n = this.tags.length;
    const colH = (k) => k * (tagH + gap) - gap;
    const cols = colH(n) > H - top0 - pad && n > 3 && !portrait ? 2 : 1;
    const per = Math.ceil(n / cols);
    let M2 = M;
    const compact = cols === 2 ? 2 * M.w * tagS > W * 0.62 : M.w * tagS > W * 0.75;
    if (compact) M2 = tagMetrics(this.items.map((it) => ({ ...it, note: '' })));
    const tagW = M2.w * tagS;
    // portrait: the tags hang low, under the shop, so the sign and the shot stay clear in the middle
    if (portrait) top0 = Math.max(top0, H - pad - colH(per) - Math.round(H * 0.02));
    this.cols = cols;
    // repaint the tags at this scale (only when it changed)
    for (const t of this.tags) {
      const note = compact ? '' : t.it.note;
      if (t.s !== tagS || t.w !== M2.w || t.note !== note) {
        t.s = tagS; t.w = M2.w; t.note = note;
        const P = t.b.querySelector('.tm-paper');
        P.innerHTML = '';
        const opts = { label: t.it.label, note, icon: t.it.icon, w: M2.w, h: M2.h, seed: 31 + t.i * 17, ring: !!t.it.primary, stock: t.it.stock || 'manila', dog: t.i % 3 === 1 };
        P.appendChild(paintTag(opts).canvas(tagS)).className = 'a';
        P.appendChild(paintTag({ ...opts, hot: true }).canvas(tagS)).className = 'b';
      }
    }
    // twines (DOM strips through the holes) and tag positions
    for (const tw of this.twines) tw.remove();
    this.twines = [];
    const holeY = Math.floor(M2.h / 2) * tagS + tagS / 2;
    const x0 = left + Math.round(L.board.w * (portrait ? 0.3 : 0.2)) * logoS + Math.floor(logoS / 2);
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * (tagW + tagS * 4);
      const list = this.tags.slice(c * per, (c + 1) * per);
      const tw = document.createElement('i');
      tw.className = 'tm-twine';
      const yEnd = top0 + (list.length - 1) * (tagH + gap) + holeY + tagS * 9;
      const yTop = x < left + signW - logoS * 4 ? signH - logoS : 0;
      tw.style.cssText = `left:${x - tagS}px;top:${yTop}px;height:${yEnd - yTop}px;width:${tagS * 2}px`;
      this.el.insertBefore(tw, this.nav);
      this.twines.push(tw);
      list.forEach((t, k) => {
        const tx = x - Math.round((HOLE.x + 0.5) * tagS), ty = top0 + k * (tagH + gap);
        t.b.style.left = `${tx}px`; t.b.style.top = `${ty}px`;
        t.b.style.width = `${tagW}px`; t.b.style.height = `${tagH}px`;
        t.b.style.setProperty('--ox', `${Math.round((HOLE.x + 0.5) * tagS)}px`);
        t.b.style.setProperty('--oy', `${holeY}px`);
        t.b.style.setProperty('--s', `${tagS}px`);
      });
    }
    this.el.style.setProperty('--tag-s', `${tagS}px`);
    this.el.classList.toggle('portrait', portrait);
    this.box = { left, signW, signH, right: Math.max(left + signW, ...this.tags.map((t) => parseFloat(t.b.style.left) + tagW)), top: top0, bottom: top0 + colH(per) };
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
