// The bizarre homage, all in one place (an affectionate nod to a certain manga's style: dramatic poses, menacing
// lettering, colour-flipped impact panels, "to be continued"; every character, line and pose here is original).
//   game.jojo.kana      pixel-art ゴゴゴ / ドドド / ドン! floating in 3D (src/jojo/kana.js)
//   game.jojo.impact    impact frames and the photo filters (src/jojo/impact.js)
//   game.jojo.menu      the pose tags, V (src/jojo/pose.js)        game.jojo.pose(name)  strike one
//   game.jojo.rival     Gōda Tetsuzan and the pose-off (src/jojo/rival.js)
//   the Sanchōme Pose Society on the lane (src/jojo/society.js)
// Tense moments get their lettering here too: a customer haggling (ゴゴゴ over them), a timed question, a slap on
// someone (a sideways impact frame), a big sale (ドン!). The old screen-edge lettering (src/ui/menacing.js) is
// redrawn as the same pixel sprites. Save: game.state.jojo = { learned, seen, posed, rival }.
import './jojo.css';
import * as THREE from 'three';
import { ensureState } from '../game/stateExt.js';
import { Kana } from './kana.js';
import { Impact } from './impact.js';
import { PoseMenu, START_POSES, strikePose } from './pose.js';
import { Rival } from './rival.js';
import { registerSociety } from './society.js';
import { sting } from '../cinema/stings.js';

const KIND_OF = { 'ゴ': 'go', 'ド': 'do', 'ドン!': 'don' };

export class JoJo {
  constructor(game) {
    const g = this.game = game;
    this.s = ensureState(g, 'jojo', { learned: [...START_POSES], seen: {}, posed: 0, rival: { visits: 0, wins: 0, losses: 0, draws: 0, next: 3, done: false } });
    for (const p of START_POSES) if (!this.s.learned.includes(p)) this.s.learned.push(p);
    this.kana = new Kana(g);
    this.impact = new Impact(g);
    this.menu = new PoseMenu(g, this);
    this.rival = new Rival(g, this);
    this.societyOn = false;
    this.cool = { slap: 0, sale: 0, haggle: 0, timed: 0 };
    this.hook();
    this.adoptMenace();
  }

  pose(name) { return strikePose(this.game, name); }

  hook() {
    const g = this.game, ev = g.events;
    // a slap that lands on someone: a sideways impact frame (not every time: it's a punchline, not a filter)
    ev.on('slap', (e) => {
      if (!e?.human || this.cool.slap > 0 || g.cutscene?.active) return;
      this.cool.slap = 40;
      const at = e.point?.isVector3 ? e.point.clone() : null;
      setTimeout(() => this.impact.frame({ at, lines: 'side', dir: Math.random() < 0.5 ? 1 : -1, palette: ['blood', 'violet'], dur: 0.34, pix: 3, clear: 0 }), 60);
    });
    // a timed answer in a chat: the pressure is on
    ev.on('talk:timed', (e) => {
      const h = e?.who?.h;
      if (!h || this.cool.timed > 0 || Math.random() < 0.4) return;
      this.cool.timed = 25;
      this.kana.spawn({ kind: 'do', at: h, n: 3, dur: Math.min(3.2, (e.time || 4) * 0.6), side: -1, size: 0.8 });
    });
    // a big sale: ドン!
    ev.on('figureSold', (e) => {
      if (e?.staff || !(e?.price >= 3000) || this.cool.sale > 0) return;
      this.cool.sale = 60;
      this.impact.frame({ at: [0.5, 0.45], palette: ['acid', 'violet'], dur: 0.6, freeze: true });
      this.kana.spawn({ kind: 'don', screen: [0.5, 0.24], dur: 1.8, sound: false });
      sting('impact');
    });
  }

  /** A customer haggles at a stand: ゴゴゴ over them as the chat starts. */
  hookHaggle() {
    const P = this.game.pedestrians;
    if (!P || P._jojo || !P.haggleScript) return;
    P._jojo = true;
    const orig = P.haggleScript.bind(P);
    P.haggleScript = (p) => {
      if (p?.h && this.cool.haggle <= 0) {
        this.cool.haggle = 12;
        setTimeout(() => this.kana.spawn({ kind: Math.random() < 0.7 ? 'go' : 'do', at: p.h, n: 3, dur: 3.2, side: 1 }), 900);
      }
      return orig(p);
    };
  }

  /** Redraw the old screen-edge lettering (src/ui/menacing.js) as pixel sprites: same moments, one look. The layer is
   *  made on its first use, so watch for it, then turn every glyph it gets into a sprite at the same place and size. */
  adoptMenace() {
    // one menace() call appends its glyphs in one go: a column at each screen edge (or one at a point). Rebuild each
    // column as one rising sprite column, from its lowest glyph, in the direction the column leaned.
    const take = (els) => {
      const fresh = els.filter((el) => el instanceof HTMLElement && el.classList.contains('mn') && !el.dataset.jj);
      if (!fresh.length) return;
      for (const el of fresh) el.dataset.jj = '1';
      const cols = [];
      for (const el of fresh) {
        const x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
        const col = cols.find((c) => c.txt === el.textContent && Math.abs(c.x0 - x) < innerWidth * 0.3);
        if (col) { col.els.push(el); col.x1 = x; } else cols.push({ txt: el.textContent, els: [el], x0: x, y0: y, x1: x });
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      for (const c of cols) {
        const el = c.els[0], txt = c.txt, kind = KIND_OF[txt] || 'go';
        const fontPx = el.classList.contains('don') ? 128 : el.classList.contains('small') ? 32 : innerWidth <= 560 ? 48 : 64;
        const dur = parseFloat(el.style.getPropertyValue('--d')) || 2.6;
        const px = Math.max(1, Math.round((fontPx * dpr) / 42));
        if (c.els.length > 1 && (kind === 'go' || kind === 'do')) {
          const side = c.x1 >= c.x0 ? 1 : -1;
          this.kana.spawn({ kind, n: c.els.length, screen: [(c.x0 + (side > 0 ? 0 : fontPx)) / innerWidth, (c.y0 + fontPx) / innerHeight], side, px, dur, sound: false });
        } else {
          const x = c.x0 + (fontPx * [...txt].length) / 2, y = c.y0 + fontPx / 2;
          this.kana.spawn({ kind, text: txt, screen: [x / innerWidth, y / innerHeight], px, dur, sound: false });
        }
      }
    };
    const attach = (L) => {
      if (this.menaceObs) return;
      L.classList.add('jj-adopted');
      this.menaceObs = new MutationObserver((muts) => take(muts.flatMap((m) => [...m.addedNodes])));
      this.menaceObs.observe(L, { childList: true });
      take([...L.children]);
    };
    const L0 = document.getElementById('menace');
    if (L0) { attach(L0); return; }
    this.bodyObs = new MutationObserver(() => { const L = document.getElementById('menace'); if (L) { attach(L); this.bodyObs.disconnect(); } });
    this.bodyObs.observe(document.body, { childList: true });
  }

  update(dt) {
    for (const k in this.cool) this.cool[k] = Math.max(0, this.cool[k] - dt);
    if (!this.societyOn && this.game.lane && this.game.sideQuests) this.societyOn = registerSociety(this.game);
    this.hookHaggle();
    this.menu.update(dt);
    this.rival.update(dt);
    this.impact.update(dt);
    this.kana.update(dt);
  }
}
void THREE;
