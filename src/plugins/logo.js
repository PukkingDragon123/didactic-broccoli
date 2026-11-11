// Your shop's own logo and name (src/logo/): a sketchbook on the PC desk opens the pixel editor (and so does the
// Sign Studio program on the Capsule 98 PC). Saved as game.state.logo; 'logo:changed' repaints the sign and the noren,
// every capsule print, the machines' price plates, the sketchbook's cover and the day's receipt. Friends who visit or
// join see it too (it travels in the save / world snapshot like every other state key).
// Debug: dbg.logo.open(), .demo(name), .draw([[x, y, ink], ...]), .reset(), .state()
import * as THREE from 'three';
import { readLogo, setActiveLogo, writeLogo, logoURL, crestPixels, INKS, DEFAULT_NAME } from '../logo/logo.js';
import { openLogoEditor, logoEditorOpen } from '../logo/editor.js';
import { buildSketchbook, PAD } from '../logo/sketchbook.js';
import { refreshShopPrints } from '../gfx/garageArt.js';
import { refreshLogoPrints, seriesSheet, sealSheet } from '../gachakit/capsulePrint.js';
import { summaryHTML } from '../sim/summary.js';
import { defineIcon, iconHTML } from '../gfx/icons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// where the pad lies: on the PC desk, square to its front edge, clear of the keyboard and the monitor
const SPOT = { x: 3.42, z: -3.39, y: 0.741, rotY: -Math.PI / 2 + 0.1 };

export function install(game) {
  const L0 = setActiveLogo(readLogo(game));
  const refresh = () => {
    try { refreshShopPrints(); } catch (e) { console.warn('logo: sign', e); }
    try { refreshLogoPrints(); } catch (e) { console.warn('logo: prints', e); }
    for (const m of game.machines || []) try { m.drawPrice(); } catch { /* a machine mid-rebuild */ }
    pad?.repaint();
  };
  // a save with its own logo: the sign was painted before we were here
  if (L0.custom || L0.named) { refreshShopPrints(); refreshLogoPrints(); for (const m of game.machines || []) m.drawPrice?.(); }
  game.events.on('logo:changed', refresh);

  game.logo = {
    open: (from = 'desk') => openLogoEditor(game, { from }),
    get isOpen() { return !!logoEditorOpen(); },
    read: () => readLogo(game),
    write: (o) => writeLogo(game, o),
    /** The shop's header on a printed receipt (HTML). */
    receiptHead() {
      const L = readLogo(game);
      return `<div class="ds-shop"><img src="${logoURL(L, 2, L.custom ? L.size : 32)}" alt=""><div><b>${esc(L.jp)}</b><small>${esc(L.en)} &middot; Showa-cho 2-chome</small></div></div>`;
    },
  };

  // ---- the sketchbook on the desk
  let pad = null;
  if (!game.visiting) {
    try {
      pad = buildSketchbook();
      const g = pad.group;
      g.position.set(SPOT.x, SPOT.y, SPOT.z);
      g.rotation.y = SPOT.rotY;
      game.scene.add(g);
      // the click target: a slab over the pad (the pencil and wire are part of it)
      const hit = new THREE.Mesh(new THREE.BoxGeometry(PAD.w + 0.02, 0.03, PAD.d + 0.02), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 0.012;
      g.add(hit);
      game.interaction.add(g, {
        noHighlight: true,
        hint: (held) => (held && held.kind !== 'tool' ? null : { key: 'LMB', text: 'Open the sketchbook', sub: readLogo(game).custom ? 'Redraw your shop\'s logo and name' : 'Draw your shop\'s own logo and name' }),
        use: () => { openLogoEditor(game, { from: 'desk' }); return false; },
      });
    } catch (e) { console.warn('sketchbook', e); }
  }

  // ---- Sign Studio on the Capsule 98 PC: shows the logo, opens the same sketchbook
  defineIcon('os_sign', { rows: ['................', '.KKKKKKKKKKKKKK.', '.KwwwwwwwwwwwwK.', '.KwRRRwwwwwwwwK.', '.KRwwRwKKwKwKwK.', '.KRwwRwwwwwwwwK.', '.KwRRRwKKKwKKwK.', '.KwwwwwwwwwwwwK.', '.KKKKKKKKKKKKKK.', '.....KK..KK.....', '.....KK..KK.....', '..TTTTTTTTTTTT..', '..TtttttttttTT..', '..TTTTTTTTTTTT..', '................', '................'] });
  const os = game.os;
  if (os?.registerApp) {
    os.registerApp({
      id: 'signstudio', name: 'Sign Studio', icon: 'os_sign', group: 'Accessories', w: 360, h: 300,
      open(win) {
        const draw = () => {
          const L = readLogo(game);
          win.body.innerHTML = `<div style="padding:10px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
            <img src="${logoURL(L, L.custom && L.size === 64 ? 2 : 4, L.custom ? L.size : 32)}" width="128" height="128" style="image-rendering:pixelated;background:#f6efdc;box-shadow:inset 0 0 0 2px #808080">
            <b style="font-family:'DotGothic16',monospace;font-size:16px">${esc(L.jp)}</b><span>${esc(L.en)}</span>
            <button class="c98-btn" data-open>Open the sketchbook...</button>
            <small class="c98-dim">${L.custom ? 'Your own logo is on the sign, the noren, capsule prints, price plates and receipts.' : 'Using Grandpa\'s crest. Draw your own!'}</small></div>`;
          win.body.querySelector('[data-open]').onclick = () => openLogoEditor(game, { from: 'pc' }).then(draw);
        };
        draw();
        win.status?.(`${DEFAULT_NAME.en === readLogo(game).en ? 'Default name' : 'Custom name'}`);
        win.onClose?.(game.events.on('logo:changed', draw));
      },
    });
  }

  // ---- debug helpers
  const dbg = {
    open: () => { openLogoEditor(game, { from: 'debug' }); return true; },
    close: (save = true) => { const ed = logoEditorOpen(); if (ed) ed.close(save); return !!ed; },
    editor: () => logoEditorOpen(),
    /** Write a logo straight from a list of [x, y, ink] (size 32 or 64) and a name. */
    draw(pts = [], { size = 32, jp = null, en = null, base = 'blank' } = {}) {
      const px = base === 'crest' ? crestPixels(size) : new Uint8Array(size * size);
      for (const [x, y, c] of pts) if (x >= 0 && y >= 0 && x < size && y < size) px[y * size + x] = c;
      return writeLogo(game, { size, px, jp, en });
    },
    /** A ready-made test logo: a red capsule split by its seam over a sunburst, a star; name fields too. */
    demo(jp = 'ほしやガチャ', en = 'HOSHIYA GACHA') {
      const n = 32, px = new Uint8Array(n * n), set = (x, y, c) => { if (x >= 0 && y >= 0 && x < n && y < n) px[y * n + x] = c; };
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const dx = x - 15.5, dy = y - 15.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        if (d <= 15.5 && d > 13.6) set(x, y, 22); // the indigo ring
        else if (d <= 13.6 && Math.cos(a * 8) > 0.35) set(x, y, 12); // sun rays
        else if (d <= 13.6) set(x, y, 5);
        if (d <= 9.5) set(x, y, dy < 0 ? 6 : 4); // the capsule: red top, white bottom
        if (d <= 9.5 && d > 8.4) set(x, y, 1);
        if (Math.abs(dy) < 1 && d <= 9.5) set(x, y, 1); // the seam
      }
      for (const [x, y] of [[12, 10], [13, 10], [12, 11]]) set(x, y, 4); // a glint
      return writeLogo(game, { size: n, px, jp, en });
    },
    reset: () => writeLogo(game, { px: null }),
    /** Show the day's receipt card as it would print now (screenshots). */
    receipt(on = true) {
      let el = document.getElementById('daysum');
      if (!el) { el = document.createElement('div'); el.id = 'daysum'; document.body.appendChild(el); }
      if (!on) { el.classList.remove('on', 'show'); return false; }
      el.innerHTML = summaryHTML(game, game.sim?.daySummary?.() || { day: 1, customers: 0, plays: 0, coins: 0, sold: 0, earned: 0, spent: 0, complaints: 0, xp: 0, level: 1 });
      el.classList.add('on', 'show');
      return true;
    },
    /** Lay a series' capsule print sheet (and the shared seals) over the screen at 2x (screenshots). */
    sheet(series = 'mochi', on = true) {
      document.getElementById('logo-dbg-sheet')?.remove();
      if (!on) return false;
      const d = document.createElement('div');
      d.id = 'logo-dbg-sheet';
      d.style.cssText = 'position:fixed;inset:0;z-index:60;background:#3a3238;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center';
      for (const cv of [seriesSheet(series).pix.canvas, sealSheet().pix.canvas]) { const c = cv.cloneNode(); c.getContext('2d').drawImage(cv, 0, 0); c.style.cssText = 'width:1024px;height:512px;image-rendering:pixelated;background:#8a8a8a'; d.appendChild(c); }
      document.body.appendChild(d);
      return true;
    },
    state: () => ({ ...game.state.logo }),
    inks: INKS.length - 1,
  };
  setTimeout(() => { if (game.debug) game.debug.logo = dbg; }, 0);
  void iconHTML;
}
