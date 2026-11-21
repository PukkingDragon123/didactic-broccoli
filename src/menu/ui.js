// The title screen's UI, as real things hanging in the lane: the 3D hand-painted GACHA GARAGE title on two chains from
// the top of the picture (a pendulum that sways, tilts toward the cursor, gets nudged when the cursor brushes it and
// swings hard when clicked, its kana plate swinging under it), and a strand of twine tied under it with the menu's
// wooden fuda threaded on it (src/menu/tags.js). Each fuda is three layers moved apart for depth: its hard shadow
// slides with the cursor (parallax), its thick side shows under it, the face leans toward the cursor. Hover (mouse,
// keyboard or pad focus): the plank swings on the twine and settles, turns toward you and its lettering warms, with a
// wooden tap and an 8-bit note. Press: the face sinks into its side, a clack, a puff of pixel dust. Pick: a 済 hanko.
// Never a glow or outline. One rAF loop moves everything with springs (src/ui/phys.js), transforms only.
//   const ui = new MenuUI(root, { onPick(id), onHover(id) });  ui.setItems([{ id, label, note, icon, primary }]);
//   ui.show(on)  ui.stamp(id) -> Promise  ui.leave()  ui.focus(id)  ui.dispose()
//   confirmSlip({ title, body, yes, no }) -> Promise<boolean>
import { audio } from '../core/audio.js';
import { loadTitle, pickTitle, paintChain, paintKanaPlate } from './logo.js';
import { paintTag, paintSide, paintShadow, tagMetrics, HOLE, DEPTH, TAG_H } from './tags.js';
import { Spring, dust, knock, pointer, installPhys } from '../ui/phys.js';

const NOTES = [72, 74, 76, 79, 81, 84, 86, 88]; // a pentatonic run: each fuda has its own blip
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const sfx = (n, o = {}) => { try { audio.init(); audio.play(n, o); } catch { /* audio not ready */ } };
const WOOD = ['hinoki', 'keyaki', 'sugi'];
const q = (v, step) => Math.round(v / step) * step;

export class MenuUI {
  constructor(root, opts = {}) {
    installPhys();
    this.root = root;
    this.opts = opts;
    this.el = document.createElement('div');
    this.el.className = 'tm';
    this.el.innerHTML = `<div class="tm-sign" aria-hidden="true"><canvas class="tm-chain"></canvas><canvas class="tm-chain"></canvas>
      <div class="tm-kana"><canvas></canvas></div><div class="tm-title"><img class="sh" alt="" draggable="false"><img class="tt" alt="Gacha Garage" draggable="false"></div></div>
      <nav class="tm-tags" aria-label="Main menu"></nav>`;
    root.appendChild(this.el);
    this.signEl = this.el.querySelector('.tm-sign');
    this.titleEl = this.el.querySelector('.tm-title');
    this.kanaEl = this.el.querySelector('.tm-kana');
    this.chains = [...this.el.querySelectorAll('.tm-chain')];
    this.nav = this.el.querySelector('.tm-tags');
    this.kana = paintKanaPlate();
    try { document.fonts?.load('16px "DotGothic16"', 'ガチャ・ガレージ').then(() => { this.kana = paintKanaPlate(); this.kanaS = 0; this.layout(); }, () => {}); } catch { /* no font loading API */ }
    this.meta = { sizes: [] };
    loadTitle().then((m) => { this.meta = m; this.layout(); });
    this.items = [];
    this.tags = [];
    this.hot = -1;
    this.enabled = true;
    // the sign's pendulum (degrees), its kana plate's, and the tilt toward the cursor
    this.sw = new Spring(14, 1.6); this.kw = new Spring(30, 2.4); this.tiltX = new Spring(60, 11); this.tiltY = new Spring(60, 11);
    this.t = 0; this.last = performance.now();
    this.onResize = () => this.layout();
    addEventListener('resize', this.onResize);
    this.onKey = (e) => this.key(e);
    addEventListener('keydown', this.onKey);
    // the sign answers the pointer: brushing it pushes it, a click swings it on its chains
    this.onSignDown = (e) => {
      if (!this.enabled || !this.overSign(e.clientX, e.clientY)) return;
      this.sw.v += (e.clientX < this.signMid() ? 1 : -1) * 38;
      knock('chain', 0.9);
      dust(e.clientX, e.clientY, { n: 2, chips: 2, spread: 20 });
    };
    addEventListener('pointerdown', this.onSignDown);
    this.loop = () => { this.raf = requestAnimationFrame(this.loop); this.tick(); };
    this.raf = requestAnimationFrame(this.loop);
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
      const rest = [-1.2, 0.8, -0.4, 1.1, -0.9, 0.5, -0.6, 0.9][i % 8];
      b.innerHTML = '<span class="tm-swing"><span class="sh"></span><span class="sd"></span><span class="tm-face"></span><i class="tm-stamp"></i></span>';
      const t = { it, b, i, rest, rot: new Spring(70, 5.5, rest), yaw: new Spring(80, 10), press: new Spring(420, 30), swing: b.firstChild, key: '' };
      t.face = b.querySelector('.tm-face'); t.side = b.querySelector('.sd'); t.shadow = b.querySelector('.sh');
      b.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') this.setHot(i, true); });
      b.addEventListener('pointerleave', () => { if (this.hot === i && document.activeElement !== b) this.setHot(-1); });
      b.addEventListener('focus', () => this.setHot(i, true));
      b.addEventListener('blur', () => { if (this.hot === i) this.setHot(-1); });
      b.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.pressTag(t, true); });
      b.addEventListener('pointerup', (e) => { e.stopPropagation(); this.pressTag(t, false); });
      b.addEventListener('pointercancel', () => this.pressTag(t, false));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.pick(i); });
      this.nav.appendChild(b);
      return t;
    });
    this.twines = [];
    this.layout();
  }

  /** Whole-number pixel scales and positions for the viewport (tags and sign are redrawn at the new scale). */
  layout() {
    const W = innerWidth, H = innerHeight, portrait = H > W * 1.15;
    const pad = Math.max(16, Math.round(Math.min(W, H) * 0.03));
    const tagS = W >= 1800 && H >= 1000 ? 3 : 2;
    // the title: as big as fits about a third of the height (portrait: most of the width)
    const P = pickTitle(this.meta, portrait ? W * 0.9 : Math.min(W * 0.42, 760), portrait ? H * 0.24 : H * (H < 560 ? 0.3 : 0.34));
    const s = P?.s || 2, size = P?.size;
    const tw = size ? size.w * s : 300, th = size ? size.h * s : 120;
    const left = portrait ? Math.round((W - tw) / 2) : pad;
    const top = Math.round(Math.max(pad * 0.8, H * 0.03));
    this.signBox = { x: left, y: top, w: tw, h: th };
    const sg = this.signEl.style;
    sg.left = `${left}px`; sg.top = '0px'; sg.width = `${tw}px`; sg.height = `${top + th}px`;
    if (size) {
      for (const im of this.titleEl.querySelectorAll('img')) { if (im.src !== size.url) im.src = size.url; im.style.width = `${tw}px`; im.style.height = `${th}px`; }
      this.titleEl.style.cssText = `left:0;top:${top}px;width:${tw}px;height:${th}px;--ts:${s}px`;
      // the chains: from the top of the picture to the hooks in the top line (5 texels wide, at least 2 px a texel)
      const cs = Math.max(2, s);
      size.hooks.forEach(([hx, hy], k) => {
        const len = Math.ceil((top + (hy + 3) * s) / cs);
        const a = paintChain(len);
        a.canvas(cs, this.chains[k]);
        this.chains[k].style.cssText = `left:${Math.round(hx * s - 2.5 * cs)}px;top:${top + (hy + 3) * s - len * cs}px`;
      });
    }
    // the kana plate hangs on two S-hooks from GARAGE, toward the right
    const ks = Math.max(1, Math.min(3, s)), K = this.kana, kw = K.art.w * ks, kh = K.art.h * ks;
    if (this.kanaS !== ks) { this.kanaS = ks; K.art.canvas(ks, this.kanaEl.firstChild); }
    const kx = Math.round(tw * (portrait ? 0.5 : 0.7) - kw / 2), ky = top + th - Math.round(4 * s);
    this.kanaEl.style.cssText = `left:${kx}px;top:${ky}px;width:${kw}px;height:${kh}px;transform-origin:${Math.round(kw / 2)}px 0`;
    this.signEl.style.transformOrigin = `${Math.round(tw / 2)}px 0`;
    this.titleEl.style.transformOrigin = `${Math.round(tw / 2)}px ${Math.round(th * 0.3)}px`;

    // the strand of fuda: from an eyelet under the title's left, or two strands side by side when one won't fit
    const M = tagMetrics(this.items);
    const tagH = M.h * tagS, gap = Math.round(tagS * 5);
    let top0 = ky + kh + gap * 2;
    const n = this.tags.length;
    const colH = (k) => k * (tagH + DEPTH * tagS + gap) - gap;
    const cols = colH(n) > H - top0 - pad && n > 3 && !portrait ? 2 : 1;
    const per = Math.ceil(n / cols);
    let M2 = M, bare = false;
    const compact = cols === 2 ? 2 * M.w * tagS > W * 0.62 : M.w * tagS > W * 0.75;
    if (compact) M2 = tagMetrics(this.items.map((it) => ({ ...it, note: '' })));
    if (compact && cols === 2 && 2 * M2.w * tagS > W * 0.5) { bare = true; M2 = tagMetrics(this.items.map((it) => ({ ...it, note: '', icon: null })), true); }
    const tagW = M2.w * tagS;
    if (portrait) top0 = Math.max(top0, H - pad - colH(per) - Math.round(H * 0.02));
    this.cols = cols;
    for (const t of this.tags) {
      const note = compact ? '' : t.it.note, icon = bare ? null : t.it.icon;
      if (t.s !== tagS || t.w !== M2.w || t.note !== note || t.icon !== icon) {
        t.s = tagS; t.w = M2.w; t.note = note; t.icon = icon;
        const o = { label: t.it.label, note, icon, w: M2.w, h: M2.h, seed: 31 + t.i * 17, primary: !!t.it.primary, wood: WOOD[t.i % 3] };
        t.face.innerHTML = '';
        t.face.appendChild(paintTag(o).canvas(tagS)).className = 'a';
        t.face.appendChild(paintTag({ ...o, hot: true }).canvas(tagS)).className = 'b';
        t.side.innerHTML = ''; t.side.appendChild(paintSide(o).canvas(tagS));
        t.shadow.innerHTML = ''; t.shadow.appendChild(paintShadow(o).canvas(tagS));
        t.key = '';
      }
    }
    for (const tw2 of this.twines) tw2.remove();
    this.twines = [];
    const holeY = Math.floor(M2.h / 2) * tagS + tagS / 2;
    const x0 = portrait ? Math.round((W - tagW) / 2) + Math.round((HOLE.x + 0.5) * tagS) : left + Math.round(tw * 0.1);
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * (tagW + tagS * 6);
      const list = this.tags.slice(c * per, (c + 1) * per);
      const twine = document.createElement('i');
      twine.className = 'tm-twine';
      const yEnd = top0 + (list.length - 1) * (tagH + DEPTH * tagS + gap) + holeY + tagS * 9;
      const yTop = x < left + tw - 8 ? top + Math.round(th * 0.82) : 0;
      twine.style.cssText = `left:${x - tagS}px;top:${yTop}px;height:${yEnd - yTop}px;width:${tagS * 2}px`;
      this.el.insertBefore(twine, this.nav);
      this.twines.push(twine);
      list.forEach((t, k) => {
        const tx = x - Math.round((HOLE.x + 0.5) * tagS), ty = top0 + k * (tagH + DEPTH * tagS + gap);
        const st = t.b.style;
        st.left = `${tx}px`; st.top = `${ty}px`; st.width = `${tagW}px`; st.height = `${tagH}px`;
        st.setProperty('--ox', `${Math.round((HOLE.x + 0.5) * tagS)}px`);
        st.setProperty('--oy', `${holeY}px`);
        st.setProperty('--s', `${tagS}px`);
        t.cx = tx + tagW / 2; t.cy = ty + tagH / 2; t.px = tx + (HOLE.x + 0.5) * tagS; t.tw = tagW;
        t.swing.style.transformOrigin = `${Math.round((HOLE.x + 0.5) * tagS)}px ${holeY}px`;
        t.key = '';
      });
    }
    this.el.style.setProperty('--tag-s', `${tagS}px`);
    this.el.classList.toggle('portrait', portrait);
    this.tagS = tagS;
  }

  overSign(x, y) { const S = this.signBox; return !!S && x >= S.x && x <= S.x + S.w && y >= S.y && y <= S.y + S.h; }
  signMid() { const S = this.signBox; return S ? S.x + S.w / 2 : 0; }

  /** One frame: springs for the sign, its plate and every fuda; transforms written only when they change. */
  tick() {
    const now = performance.now(), dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000)); this.last = now; this.t += dt;
    if (this.el.classList.contains('off') && !this.el.classList.contains('leaving')) return;
    const S = this.signBox, px = pointer.x, py = pointer.y;
    // the sign: a slow idle sway, a push from a cursor that brushes past, a tilt toward the cursor
    if (S) {
      this.sw.to = Math.sin(this.t * 0.55) * 0.5;
      if (this.enabled && this.overSign(px, py) && performance.now() - pointer.t < 80) this.sw.v += Math.max(-60, Math.min(60, pointer.vx * 0.004));
      this.sw.step(dt);
      const near = this.enabled ? Math.max(0, 1 - Math.hypot(px - (S.x + S.w / 2), py - (S.y + S.h / 2)) / (Math.max(innerWidth, innerHeight) * 0.6)) : 0;
      this.tiltY.to = ((px - (S.x + S.w / 2)) / innerWidth) * 16 * near;
      this.tiltX.to = -((py - (S.y + S.h / 2)) / innerHeight) * 10 * near;
      this.tiltX.step(dt); this.tiltY.step(dt);
      this.kw.to = -this.sw.v * 0.05; this.kw.step(dt);
      const a = q(this.sw.x, 0.1), ry = q(this.tiltY.x, 0.25), rx = q(this.tiltX.x, 0.25), k = q(this.kw.x, 0.25);
      const key = `${a}|${ry}|${rx}|${k}`;
      if (key !== this.signKey) {
        this.signKey = key;
        this.signEl.style.transform = `rotate(${a}deg)`;
        this.titleEl.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        // the hard shadow falls away from the cursor (the light is where you are)
        const ts = parseFloat(this.titleEl.style.getPropertyValue('--ts')) || 1;
        const sx = Math.round(5 * ts - ((px / innerWidth) * 2 - 1) * 4 * ts), sy = Math.round(7 * ts - ((py / innerHeight) * 2 - 1) * 3 * ts);
        this.titleEl.style.setProperty('--sx', `${sx}px`); this.titleEl.style.setProperty('--sy', `${sy}px`);
        this.kanaEl.style.transform = `rotate(${k}deg)`;
      }
    }
    // the fuda
    const s = this.tagS || 2;
    for (const t of this.tags) {
      const hot = this.hot === t.i && this.enabled;
      const dx = px - t.px, dy = py - t.cy;
      t.rot.to = t.rest + (hot ? Math.max(-4, Math.min(4, -dy / (s * 30) * 2)) : 0);
      t.yaw.to = hot ? Math.max(-14, Math.min(14, (dx - t.tw / 2) / t.tw * 18)) : 0;
      t.rot.step(dt); t.yaw.step(dt); t.press.step(dt);
      const r = q(t.rot.x, 0.25), y = q(t.yaw.x, 0.5), p = Math.round(t.press.x * DEPTH * 0.75) * s;
      // shadow parallax: away from the cursor, a texel per step, longer when the plank is lifted (hot) and short when pressed
      const lift = hot ? 1.5 : 1;
      const sx = Math.round((3 - Math.max(-2, Math.min(2, dx / 300)) ) * lift - t.press.x * 2) * s;
      const sy = Math.round((4 - Math.max(-2, Math.min(2, dy / 200))) * lift - t.press.x * 3) * s;
      const key = `${r}|${y}|${p}|${sx}|${sy}|${hot ? 1 : 0}`;
      if (key === t.key) continue;
      t.key = key;
      t.swing.style.transform = `perspective(700px) rotate(${r}deg) rotateY(${y}deg) translateY(${hot ? -s : 0}px)`;
      t.face.style.transform = p ? `translateY(${p}px)` : '';
      t.shadow.style.transform = `translate(${sx}px, ${sy}px)`;
    }
  }

  pressTag(t, down) {
    if (!this.enabled) return;
    t.press.to = down ? 1 : 0;
    if (down) {
      knock('press', 0.9);
      const R = t.b.getBoundingClientRect();
      dust(R.left + R.width * (0.3 + Math.random() * 0.5), R.bottom + 2, { n: 3, chips: 2, spread: R.width * 0.2, s: this.tagS || 2 });
    }
  }

  setHot(i, sound = false) {
    if (i === this.hot) return;
    const prev = this.tags[this.hot];
    if (prev) prev.b.classList.remove('hot');
    this.hot = i;
    const t = this.tags[i];
    if (!t) { this.opts.onHover?.(null); return; }
    t.b.classList.add('hot');
    // a knock on the plank: it swings on the twine and settles (keyboard and pad too)
    t.rot.v += (pointer.vx > 0 ? -1 : 1) * (40 + Math.min(80, Math.abs(pointer.vx) * 0.04));
    if (sound && this.enabled) {
      sfx('uiBeep', { f: midi(NOTES[i % NOTES.length]), vol: 0.45 });
      knock('wood', 0.7);
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
    } else if ((k === 'Enter' || k === ' ') && this.hot >= 0) {
      // the keyboard presses the plank in too (the click follows from the focused button, or from here)
      const t = this.tags[this.hot];
      this.pressTag(t, true); setTimeout(() => this.pressTag(t, false), 110);
      if (document.activeElement !== t.b) { e.preventDefault(); this.pick(this.hot); }
    }
  }

  pick(i) {
    const t = this.tags[i];
    if (!t || !this.enabled) return;
    this.opts.onPick?.(t.it.id, t);
  }

  /** The 済 hanko comes down on a fuda. */
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
    if (on) { this.el.classList.remove('leaving'); for (const t of this.tags) t.key = ''; this.signKey = ''; }
    if (!on) this.setHot(-1);
  }

  /** Off the top: the sign is hauled up on its chains and the fuda drop away. */
  leave() { this.enabled = false; this.setHot(-1); this.el.classList.add('leaving'); knock('chain', 1); }

  dispose() {
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.onResize);
    removeEventListener('keydown', this.onKey);
    removeEventListener('pointerdown', this.onSignDown);
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
