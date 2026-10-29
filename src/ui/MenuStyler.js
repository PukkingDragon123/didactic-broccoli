// Quick styling on the main menu: pixel arrows right beside your character. The pair at your head cycles your
// hairstyle, the pair at your chest your top, the pair at your legs your bottoms; the little swatches to the right
// cycle hair colour, skin, top colour and body type. Every click saves at once (state.avatar + the 'avatar'
// event) and you show the new look off. The closet (click yourself) still has the full wardrobe and cosmetics.
//   const st = new MenuStyler(game, crew);  st.update(visible) every menu frame;  st.dispose()
import * as THREE from 'three';
import './styler.css';
import { iconHTML } from '../gfx/icons.js';
import { LOOK, normalizeAvatar } from '../people/avatar.js';
import { audio } from '../core/audio.js';

const hexCss = (c) => '#' + c.toString(16).padStart(6, '0');
// where each pair sits on the body (fraction of your height) and what it changes
const ROWS = [
  { id: 'head', y: 0.93, key: 'hair', name: 'Hair', sw: ['hairCol', 'skin'] },
  { id: 'chest', y: 0.68, key: 'top', name: 'Top', sw: ['topCol'] },
  { id: 'legs', y: 0.3, key: 'bottom', name: 'Bottoms', sw: ['body'] },
];
const SW_NAME = { hairCol: 'Hair colour', skin: 'Skin', topCol: 'Colour', body: 'Body' };
const _v = new THREE.Vector3(), _r = new THREE.Vector3();

export class MenuStyler {
  constructor(game, crew) {
    this.game = game; this.crew = crew;
    this.el = document.createElement('div');
    this.el.id = 'styler';
    this.rows = ROWS.map((r) => {
      const row = { ...r };
      row.L = this.button('arrow_left', `Previous ${r.name.toLowerCase()}`, () => this.step(r.key, -1, r.id));
      row.R = this.button('arrow_right', `Next ${r.name.toLowerCase()}`, () => this.step(r.key, 1, r.id));
      row.S = r.sw.map((k) => this.swatch(k, r.id));
      return row;
    });
    this.tag = document.createElement('div');
    this.tag.className = 'st-tag';
    this.el.appendChild(this.tag);
    this.hint = document.createElement('div');
    this.hint.className = 'st-hint';
    this.hint.textContent = 'Style yourself';
    this.el.appendChild(this.hint);
    document.body.appendChild(this.el);
    this.tagT = 0; this.reactT = 0; this.shown = 0;
    this.paint();
  }

  get look() { return normalizeAvatar(this.game.state.avatar); }

  button(icon, label, fn) {
    const b = document.createElement('button');
    b.className = 'st-arrow';
    b.setAttribute('aria-label', label);
    b.innerHTML = iconHTML(icon, 2);
    this.bind(b, fn);
    this.el.appendChild(b);
    return b;
  }

  swatch(key, at) {
    const b = document.createElement('button');
    b.className = 'st-swatch' + (key === 'body' ? ' st-body' : '');
    b.setAttribute('aria-label', SW_NAME[key]);
    this.bind(b, () => this.step(key, 1, at));
    this.el.appendChild(b);
    return b;
  }

  /** Clicks here must not reach the menu's own pointer handlers on window (signs, opening the closet). */
  bind(b, fn) {
    for (const ev of ['pointerdown', 'pointerup', 'click']) b.addEventListener(ev, (e) => { e.stopPropagation(); if (ev === 'click') fn(); });
  }

  step(key, dir, at) {
    const list = LOOK[key], A = this.look;
    const i = Math.max(0, list.findIndex((o) => o.id === A[key]));
    const next = list[(i + dir + list.length) % list.length];
    const look = this.game.state.avatar = normalizeAvatar({ ...A, [key]: next.id });
    this.crew.setLook(look);
    this.game.save();
    this.game.events.emit('avatar', look);
    this.paint();
    try { audio.play('uiClick', { vol: 0.6 }); } catch { /* audio not ready */ }
    // say what it is now, by the part you changed
    this.tag.textContent = key === 'body' ? (next.id === 'f' ? 'Body B' : 'Body A') : next.name || SW_NAME[key];
    this.tagAt = at; this.tagT = 1.6;
    this.tag.classList.remove('pop'); void this.tag.offsetWidth; this.tag.classList.add('pop');
    // show it off (not on every click when you're flicking through)
    if (this.reactT <= 0) { this.crew.react(false); this.reactT = 2.2; }
    this.hint.classList.add('gone');
  }

  /** Swatch colours follow the saved look. */
  paint() {
    const A = this.look;
    for (const r of this.rows) {
      for (const [i, b] of r.S.entries()) {
        const key = r.sw[i];
        if (key === 'body') { b.textContent = A.body === 'f' ? 'B' : 'A'; continue; }
        b.style.background = hexCss((LOOK[key].find((o) => o.id === A[key]) || LOOK[key][0]).col);
      }
    }
  }

  /** Place everything around your character in screen space; visible = the menu is idle (not the closet etc.). */
  update(dt, visible) {
    this.tagT -= dt; this.reactT -= dt;
    const me = this.crew?.me, cam = this.game.camera;
    this.shown += ((visible && me ? 1 : 0) - this.shown) * Math.min(1, dt * 6);
    this.el.style.opacity = this.shown.toFixed(3);
    this.el.style.pointerEvents = this.shown > 0.6 ? '' : 'none';
    this.el.style.visibility = this.shown < 0.02 ? 'hidden' : '';
    if (this.shown < 0.02 || !me) return;
    const h = me.h, H = h.height || 1.7, W = innerWidth, Hs = innerHeight;
    // "right" as seen by the camera, so the arrows sit either side of you whatever way you face
    _r.set(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize();
    const proj = (p) => { p.project(cam); return [(p.x * 0.5 + 0.5) * W, (0.5 - p.y * 0.5) * Hs]; };
    const base = h.root.getWorldPosition(new THREE.Vector3());
    for (const r of this.rows) {
      const half = r.id === 'legs' ? 0.36 : r.id === 'chest' ? 0.5 : 0.36;
      const y = H * r.y;
      const [lx, ly] = proj(_v.copy(base).addScaledVector(_r, -half).setY(y));
      const [rx, ry] = proj(_v.copy(base).addScaledVector(_r, half).setY(y));
      place(r.L, lx - 18, ly - 18);
      place(r.R, rx - 18, ry - 18);
      r.S.forEach((b, i) => place(b, rx + 24 + i * 30, ry - 12));
      if (this.tagAt === r.id) { this.tagX = (lx + rx) / 2; this.tagY = ly - 46; }
    }
    if (this.tagT > 0) place(this.tag, this.tagX, this.tagY, true);
    this.tag.style.display = this.tagT > 0 ? '' : 'none';
    const [fx, fy] = proj(_v.copy(base).setY(-0.05));
    place(this.hint, fx, fy + 6, true);
  }

  dispose() { this.el.remove(); }
}

function place(el, x, y, center = false) {
  el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)${center ? ' translateX(-50%)' : ''}`;
}
