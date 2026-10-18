// The 5-slot inventory bar: detailed 2D sprites of what you carry (pixel icons for tools, rendered
// thumbnails for figures and capsules), the selected slot raised, the item's name popping up on change.
import './hud.css';
import { iconURL } from '../gfx/icons.js';
import { TOOLS } from '../data/tools.js';
import { getItem } from '../data/series/index.js';
import { makeCapsule } from '../game/Capsule.js';
import { SLOTS } from '../game/Held.js';

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
      const k = `${it.data.series}:${it.data.color}`;
      if (!this.capCache.has(k)) {
        const cap = makeCapsule(it.data.series, it.data.color);
        this.capCache.set(k, g.thumbs.renderObject(cap.group, 64, { side: 0.5, up: 0.4 }).toDataURL());
      }
      return this.capCache.get(k);
    }
    if (it.kind === 'cat') return iconURL('cat', 2);
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
    return it.data?.labelEn || it.data?.label || 'Box';
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
