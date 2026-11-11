// The 6-slot inventory bar: detailed 2D sprites of what you carry (pixel icons for tools, rendered
// thumbnails for figures and capsules), the selected slot raised, the item's name popping up on change.
import './hud.css';
import { iconURL } from '../gfx/icons.js';
import { TOOLS } from '../data/tools.js';
import { getItem } from '../data/series/index.js';
import { bannerCanvas, BANNER_W, BANNER_H } from '../gfx/banner.js';
import { SLOTS } from '../game/Held.js';
import { boxLabel } from '../game/Delivery.js';
import { CatRig } from '../world/CatRig.js';

export class Hotbar {
  constructor(game) {
    this.game = game;
    const el = document.createElement('div');
    el.id = 'hotbar';
    el.innerHTML = `<div class="label"></div><div class="slots">${Array.from({ length: SLOTS }, (_, i) => `<div class="slot" data-i="${i}"><span class="key">${i + 1}</span><img class="ico" alt="" draggable="false"><span class="count"></span></div>`).join('')}</div>`;
    document.getElementById('hud').appendChild(el);
    this.el = el;
    this.slots = [...el.querySelectorAll('.slot')];
    this.label = el.querySelector('.label');
    this.capCache = new Map();
    this.sig = '';
    // tap / click a slot to select it (touch devices have no number keys)
    for (const s of this.slots) {
      s.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); game.held.select(+s.dataset.i); });
    }
    game.events.on('slot', () => this.refresh(true));
    game.events.on('held', () => this.refresh(false));
    this.refresh(false);
  }

  iconFor(it) {
    const g = this.game;
    if (!it) return null;
    if (it.kind === 'tool') return iconURL(TOOLS[it.data.id]?.icon || 'box', 2);
    if (it.kind === 'toy') return g.thumbs.item(it.data.key, { size: 64, finish: it.data.finish }).toDataURL();
    if (it.kind === 'capsule') {
      // never a picture of the ball itself (owner's rule): the slot shows the series' display card in miniature
      const k = it.data.series;
      if (!this.capCache.has(k)) {
        let url = iconURL('box', 2);
        try {
          const src = bannerCanvas(k, g.thumbs);
          const c = document.createElement('canvas');
          c.width = c.height = 64;
          const x = c.getContext('2d');
          x.imageSmoothingEnabled = true;
          const h = 60, w = Math.round(h * BANNER_W / BANNER_H);
          x.fillStyle = '#1a1216'; x.fillRect((64 - w) / 2 - 1, 1, w + 2, h + 2); // an ink rim round the card
          x.drawImage(src, (64 - w) / 2, 2, w, h);
          url = c.toDataURL();
        } catch { /* the card isn't ready: keep the box icon */ }
        this.capCache.set(k, url);
      }
      return this.capCache.get(k);
    }
    if (it.kind === 'cat') {
      if (!this.catURL) {
        const rig = new CatRig();
        rig.setPose('sit');
        for (let i = 0; i < 40; i++) rig.update(0.05, 0);
        this.catURL = g.thumbs.renderObject(rig.root, 96, { side: 0.8, up: 0.25, outline: false }).toDataURL();
      }
      return this.catURL;
    }
    return iconURL('box', 2);
  }

  nameFor(it) {
    if (!it) return '';
    if (it.kind === 'tool') {
      const T = TOOLS[it.data.id];
      return (T?.name || it.data.id) + (it.data.uses ? ` (${it.data.uses})` : '');
    }
    if (it.kind === 'toy') return getItem(it.data.key)?.name || 'Figure';
    if (it.kind === 'capsule') return 'Capsule';
    if (it.kind === 'cat') return 'Mikan';
    return boxLabel(it.data) || 'Box';
  }

  refresh(announce) {
    const h = this.game.held;
    const sig = h.slots.map((it) => (it ? `${it.kind}:${it.data?.id || it.data?.key || it.data?.series || it.data?.type}:${it.data?.uses ?? ''}:${it.data?.finish || ''}` : '-')).join('|') + '#' + h.sel;
    if (sig === this.sig && !announce) return;
    this.sig = sig;
    h.slots.forEach((it, i) => {
      const s = this.slots[i];
      s.classList.toggle('sel', i === h.sel);
      s.classList.toggle('full', !!it);
      const img = s.querySelector('.ico');
      const url = this.iconFor(it);
      if (url) { if (img.src !== url) img.src = url; img.style.display = ''; } else img.style.display = 'none';
      img.classList.toggle('photo', it?.kind === 'cat');
      s.querySelector('.count').textContent = it?.data?.uses ? it.data.uses : '';
    });
    const it = h.item;
    if (announce || it) this.say(this.nameFor(it));
  }

  say(text) {
    if (!text) { this.label.classList.remove('show'); return; }
    this.label.textContent = text;
    this.label.classList.remove('show'); void this.label.offsetWidth; this.label.classList.add('show');
    clearTimeout(this._t);
    this._t = setTimeout(() => this.label.classList.remove('show'), 1800);
  }
}
