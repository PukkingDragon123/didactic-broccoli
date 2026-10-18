// Dev preview for the old-shop wall signage (src/gfx/shopArt.js).
// URL params:  ?only=noren,calendar   paint only these pieces    &scale=4   display scale (default 3)
import '@fontsource/dotgothic16/400.css';
import { Pix } from '../gfx/pix.js';
import { SHOP_ART, SHOP_TEXT } from '../gfx/shopArt.js';

const errBox = document.getElementById('err');
window.addEventListener('error', (e) => { errBox.textContent += (e.message || e) + '\n'; });
window.addEventListener('unhandledrejection', (e) => { errBox.textContent += String(e.reason?.stack || e.reason) + '\n'; });

const params = new URLSearchParams(location.search);
const only = params.get('only')?.split(',').filter(Boolean);
const scale = +(params.get('scale') || 3);
const ids = (only?.length ? only : Object.keys(SHOP_ART)).filter((id) => SHOP_ART[id]);

// record every glyph actually drawn so a missing SHOP_TEXT entry shows up as a console warning
const drawn = new Set();
const origText = Pix.prototype.text;
Pix.prototype.text = function (str, ...rest) { for (const ch of String(str)) drawn.add(ch); return origText.call(this, str, ...rest); };

try {
  await document.fonts.load('12px "DotGothic16"', SHOP_TEXT);
  await document.fonts.load('16px "DotGothic16"', SHOP_TEXT);
  const grid = document.getElementById('grid');
  for (const id of ids) {
    const { w, h, paint } = SHOP_ART[id];
    const p = new Pix(w, h, 7);
    const t0 = performance.now();
    paint(p);
    p.flush();
    const ms = (performance.now() - t0).toFixed(0);
    // flag any transparent pixels (the art must be opaque)
    let clear = 0;
    for (let i = 3; i < p.d.length; i += 4) if (p.d[i] < 255) clear++;
    const cell = document.createElement('div');
    cell.className = 'cell';
    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.innerHTML = `<b>${id}</b><span>${w}×${h} · ${ms}ms${clear ? ` · <i style="color:#c00">${clear} transparent px</i>` : ''}</span>`;
    p.canvas.style.width = `${w * scale}px`;
    p.canvas.style.height = `${h * scale}px`;
    cell.append(lbl, p.canvas);
    grid.append(cell);
  }
  const missing = [...drawn].filter((ch) => ch.trim() && !SHOP_TEXT.includes(ch));
  if (missing.length) console.warn('SHOP_TEXT is missing:', missing.join(''));
} catch (e) {
  errBox.textContent += String(e.stack || e);
}
window.__ready = true;
