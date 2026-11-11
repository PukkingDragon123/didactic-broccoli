// Your shop's own logo and name (src/logo/): a sketchbook on the PC desk opens the pixel editor (and so does the Sign
// Studio program on the PC). Saved as game.state.logo (ensureState); 'logo:changed' repaints the noren over the
// shutter, the projecting sign on the right pier, the seals and tape on new capsules (src/game/capsuleSeals.js), the
// sketchbook's cover and the day's receipt. Friends who visit see it too (it travels in the save like every state key).
// Debug: dbg.logo.open(), .demo(name), .draw([[x, y, ink], ...]), .reset(), .state(), .receipt()
import * as THREE from 'three';
import { readLogo, setActiveLogo, writeLogo, logoURL, crestPixels, INKS, DEFAULT_NAME } from '../logo/logo.js';
import { openLogoEditor, logoEditorOpen } from '../logo/editor.js';
import { buildSketchbook, PAD } from '../logo/sketchbook.js';
import { paintNoren, paintSign, NOREN, SIGN } from '../logo/shopArt.js';
import { Pix } from '../gfx/pix.js';
import { GARAGE } from '../world/Garage.js';
import { summaryHTML } from '../sim/summary.js';
import { defineIcon } from '../gfx/icons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// where the pad lies: on the PC desk, square to its front edge, clear of the keyboard and the monitor
const SPOT = { x: 3.42, z: -3.39, y: 0.741, rotY: -Math.PI / 2 + 0.1 };

/** The noren's three panels get a texture each (the town paints one for all three). */
function norenPanels(game) {
  const town = game.garage?.town, openG = town?.shop?.openG;
  const mat = town?.mats?.get('t:noren24x400falsefalse');
  if (!openG || !mat) return null;
  const panels = [];
  openG.traverse((o) => { if (o.isMesh && o.material === mat) panels.push(o); });
  if (panels.length !== 3) return null;
  panels.sort((a, b) => a.position.x - b.position.x);
  let out = null;
  return {
    paint(L) {
      out ||= panels.map((m, i) => {
        const part = 'LCR'[i], pix = new Pix(NOREN.w, NOREN.h, 5 + i), tex = pix.texture();
        const mm = mat.clone(); mm.map = tex; m.material = mm;
        return { part, pix, tex };
      });
      for (const o of out) { paintNoren(o.pix, o.part, L).flush(); o.tex.needsUpdate = true; }
    },
  };
}

/** The projecting sign on the right pier: a cream enamel board in a steel frame on two brackets, both faces printed. */
function projectingSign(game) {
  const town = game.garage?.town, openG = town?.shop?.openG;
  if (!town) return null;
  const H = GARAGE.height, pix = new Pix(SIGN.w, SIGN.h, 9), tex = pix.texture();
  const g = new THREE.Group();
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.05 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.55, metalness: 0.6 });
  const W = SIGN.w / 100, Ht = SIGN.h / 100, T = 0.035;
  // the board: printed both sides, a steel edge round it
  const board = new THREE.Mesh(new THREE.BoxGeometry(T, Ht, W), [face, face, steel, steel, steel, steel]); // (±x: up and down the lane)
  g.add(board);
  // two flat-bar brackets into the pier, with a bolt plate
  for (const y of [Ht / 2 - 0.08, -Ht / 2 + 0.08]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.12), steel); bar.position.set(0, y, -W / 2 - 0.06); g.add(bar);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.008), steel); plate.position.set(0, y, -W / 2 - 0.12); g.add(plate);
  }
  for (const o of g.children) { o.castShadow = true; o.receiveShadow = true; }
  g.position.set(3.93, H - 1.2, 5.28 + 0.12 + W / 2);
  (openG?.parent || game.scene).add(g);
  g.updateMatrixWorld(true);
  return { group: g, paint(L) { paintSign(pix, L).flush(); tex.needsUpdate = true; } };
}

export function install(game) {
  setActiveLogo(readLogo(game));
  let noren = null, sign = null, pad = null;
  try { noren = norenPanels(game); } catch (e) { console.warn('logo: noren', e); }
  try { sign = projectingSign(game); } catch (e) { console.warn('logo: sign', e); }
  const refresh = () => {
    const L = setActiveLogo(readLogo(game));
    // (the noren keeps the town's own diamonds until there is a logo or a name of your own)
    try { if (noren && (L.custom || L.named || noren.painted)) { noren.paint(L); noren.painted = true; } sign?.paint(L); } catch (e) { console.warn('logo: paint', e); }
    pad?.repaint();
  };
  // the DotGothic16 glyphs of the name must be in before the first paint
  const paintSoon = () => { try { document.fonts.load('16px "DotGothic16"', readLogo(game).jp).then(refresh, refresh); } catch { refresh(); } };
  paintSoon();
  game.events.on('logo:changed', paintSoon);

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
    sign, noren,
  };

  // ---- the sketchbook on the desk
  if (!game.visiting) {
    try {
      pad = buildSketchbook();
      const g = pad.group;
      g.position.set(SPOT.x, SPOT.y, SPOT.z);
      g.rotation.y = SPOT.rotY;
      game.scene.add(g);
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

  // ---- Sign Studio on the PC: shows the logo, opens the same sketchbook
  defineIcon('os_sign', { rows: ['................', '.KKKKKKKKKKKKKK.', '.KwwwwwwwwwwwwK.', '.KwRRRwwwwwwwwK.', '.KRwwRwKKwKwKwK.', '.KRwwRwwwwwwwwK.', '.KwRRRwKKKwKKwK.', '.KwwwwwwwwwwwwK.', '.KKKKKKKKKKKKKK.', '.....KK..KK.....', '.....KK..KK.....', '..TTTTTTTTTTTT..', '..TtttttttttTT..', '..TTTTTTTTTTTT..', '................', '................'] });
  const os = game.os;
  if (os?.registerApp) {
    try {
      os.registerApp({
        id: 'signstudio', name: 'Sign Studio', icon: 'os_sign', group: 'Accessories', w: 360, h: 300,
        open(win) {
          const draw = () => {
            const L = readLogo(game);
            win.body.innerHTML = `<div style="padding:10px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
              <img src="${logoURL(L, L.custom && L.size === 64 ? 2 : 4, L.custom ? L.size : 32)}" width="128" height="128" style="image-rendering:pixelated;background:#f6efdc;box-shadow:inset 0 0 0 2px #808080">
              <b style="font-family:'DotGothic16',monospace;font-size:16px">${esc(L.jp)}</b><span>${esc(L.en)}</span>
              <button class="c98-btn" data-open>Open the sketchbook...</button>
              <small class="c98-dim">${L.custom ? 'Your own logo is on the noren, the sign, capsule seals and receipts.' : 'Using Grandpa\'s crest. Draw your own!'}</small></div>`;
            win.body.querySelector('[data-open]').onclick = () => openLogoEditor(game, { from: 'pc' }).then(draw);
          };
          draw();
          win.onClose?.(game.events.on('logo:changed', draw));
        },
      });
    } catch (e) { console.warn('sign studio', e); }
  }

  // ---- debug helpers
  const dbg = {
    open: () => { openLogoEditor(game, { from: 'debug' }); return true; },
    close: (save = true) => { const ed = logoEditorOpen(); if (ed) ed.close(save); return !!ed; },
    editor: () => logoEditorOpen(),
    draw(pts = [], { size = 32, jp = null, en = null, base = 'blank' } = {}) {
      const px = base === 'crest' ? crestPixels(size) : new Uint8Array(size * size);
      for (const [x, y, c] of pts) if (x >= 0 && y >= 0 && x < size && y < size) px[y * size + x] = c;
      return writeLogo(game, { size, px, jp, en });
    },
    /** A ready-made test logo: a red capsule split by its seam over a sunburst; name fields too. */
    demo(jp = 'ほしやガチャ', en = 'HOSHIYA GACHA') {
      const n = 32, px = new Uint8Array(n * n), set = (x, y, c) => { if (x >= 0 && y >= 0 && x < n && y < n) px[y * n + x] = c; };
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const dx = x - 15.5, dy = y - 15.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        if (d <= 15.5 && d > 13.6) set(x, y, 22);
        else if (d <= 13.6 && Math.cos(a * 8) > 0.35) set(x, y, 12);
        else if (d <= 13.6) set(x, y, 5);
        if (d <= 9.5) set(x, y, dy < 0 ? 6 : 4);
        if (d <= 9.5 && d > 8.4) set(x, y, 1);
        if (Math.abs(dy) < 1 && d <= 9.5) set(x, y, 1);
      }
      for (const [x, y] of [[12, 10], [13, 10], [12, 11]]) set(x, y, 4);
      return writeLogo(game, { size: n, px, jp, en });
    },
    reset: () => writeLogo(game, { px: null }),
    receipt(on = true) {
      let el = document.getElementById('daysum');
      if (!el) { el = document.createElement('div'); el.id = 'daysum'; document.body.appendChild(el); }
      if (!on) { el.classList.remove('on', 'show'); return false; }
      el.innerHTML = summaryHTML(game, game.sim?.daySummary?.() || { day: 1, customers: 0, plays: 0, coins: 0, sold: 0, earned: 0, spent: 0, complaints: 0, xp: 0, level: 1 });
      el.classList.add('on', 'show');
      return true;
    },
    state: () => ({ ...game.state.logo }),
    inks: INKS.length - 1,
    names: DEFAULT_NAME,
  };
  setTimeout(() => { if (game.debug) game.debug.logo = dbg; }, 0);
}
