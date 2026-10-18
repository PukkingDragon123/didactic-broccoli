// Dev preview for the gachapon banner background scenes (src/gfx/bannerScenes3.js).
// URL params:
//   ?only=mochi,kasa   paint only these scenes
//   &scale=4           display scale (default 2)
//   &cols=2            grid columns (default 3, or 1 when a single scene is shown)
//   &guides=1          overlay the title zone / figure floor band of the composition contract
//   &mock=1            rough stand-ins for the compositor's title, catchphrase and figures
// Also warns in the console if a scene draws a glyph missing from SCENE_TEXT,
// or leaves any pixel of its region transparent.
import '@fontsource/dotgothic16/400.css';
import { Pix } from '../gfx/pix.js';
import { SCENES, BANNER_TEXT, SCENE_TEXT } from '../gfx/bannerScenes3.js';
import { SERIES_BY_ID } from '../data/series/index.js';

const errBox = document.getElementById('err');
window.addEventListener('error', (e) => { errBox.textContent += (e.message || e) + '\n'; });
window.addEventListener('unhandledrejection', (e) => { errBox.textContent += String(e.reason?.stack || e.reason) + '\n'; });

const params = new URLSearchParams(location.search);
const only = params.get('only')?.split(',').filter(Boolean);
const ids = (only?.length ? only : Object.keys(SCENES)).filter((id) => SCENES[id]);
const scale = +(params.get('scale') || 2);
const cols = +(params.get('cols') || (ids.length === 1 ? 1 : 3));
const guides = params.has('guides');
const mock = params.has('mock');

const labelText = Object.values(BANNER_TEXT).map((t) => t.catch + t.sub).join('');
await Promise.all([
  document.fonts.load('12px "DotGothic16"', SCENE_TEXT),
  document.fonts.load('13px "DotGothic16"', labelText + 'abcdefghijklmnopqrstuvwxyz'),
  mock ? document.fonts.load('32px "DotGothic16"', Object.values(SERIES_BY_ID).map((s) => s.jp).join('')) : null,
]);

// record every glyph the scenes draw, to validate the exported preload strings
const drawn = new Set();
const origText = Pix.prototype.text;
Pix.prototype.text = function (str, ...rest) { if (!this.__mock) for (const ch of String(str)) drawn.add(ch); return origText.call(this, str, ...rest); };

const grid = document.getElementById('grid');
grid.style.gridTemplateColumns = `repeat(${cols}, ${320 * scale}px)`;

for (const id of ids) {
  const s = SERIES_BY_ID[id];
  const p = new Pix(320, 200, 7);
  const t0 = performance.now();
  SCENES[id](p, 0, 0, 320, 200, s);
  p.flush();
  let holes = 0;
  for (let i = 3; i < p.d.length; i += 4) if (p.d[i] !== 255) holes++;
  if (holes) console.warn(`scene ${id}: ${holes} non-opaque pixels`);
  const ms = (performance.now() - t0).toFixed(0);
  const colours = new Set();
  for (let i = 0; i < p.d.length; i += 4) colours.add((p.d[i] << 16) | (p.d[i + 1] << 8) | p.d[i + 2]);
  p.__mock = true;
  if (mock) {
    // rough stand-ins for what the card compositor puts on top: title, catchphrase and figures
    const bt = BANNER_TEXT[id];
    const outline = parseInt(s.card.text.slice(1), 16);
    p.text(s.jp, 160, 6, { size: 32, color: 0xffffff, outline, align: 'center' });
    p.text(bt.catch, 160, 44, { size: 12, color: parseInt(s.card.accent.slice(1), 16), outline: 0xffffff, align: 'center' });
    const c = p.ctx;
    p.flush();
    [[64, 186, 44], [124, 176, 52], [190, 182, 48], [252, 188, 40]].forEach(([fx, fy, fh], i) => {
      c.fillStyle = ['#ffffffdd', '#ffe0a0dd', '#a0e0ffdd', '#ffb0c8dd'][i];
      c.strokeStyle = '#2a2220'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(fx, fy - fh / 2, 18, fh / 2, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(fx, fy, 16, 3, 0, 0, Math.PI * 2); c.fill();
    });
    p.pull();
  }
  if (guides) {
    const c = p.ctx;
    c.fillStyle = 'rgba(255,0,255,0.18)'; c.fillRect(0, 0, 320, 70);
    c.fillStyle = 'rgba(0,255,255,0.15)'; c.fillRect(0, 150, 320, 45);
  }
  const cell = document.createElement('div');
  cell.className = 'cell';
  const lbl = document.createElement('div');
  lbl.className = 'lbl';
  const bt = BANNER_TEXT[id] || { catch: '', sub: '' };
  lbl.innerHTML = `<b>${id}</b>${bt.catch}<span>${bt.sub} · ${ms}ms · ${colours.size}c</span>`;
  lbl.dataset.colours = colours.size;
  lbl.dataset.id = id;
  p.canvas.style.width = `${320 * scale}px`;
  p.canvas.style.height = `${200 * scale}px`;
  cell.append(lbl, p.canvas);
  grid.append(cell);
}

const known = new Set(SCENE_TEXT);
const missing = [...drawn].filter((ch) => !known.has(ch) && ch.trim());
if (missing.length) console.warn('glyphs drawn but missing from SCENE_TEXT:', missing.join(''));
window.__missingGlyphs = missing.join('');

window.__ready = true;
