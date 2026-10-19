// Pixel icons + pixel textures for the static HTML (index.html): any element with data-icon="name"
// (optional data-scale="2") gets the icon painted by CSS through a `--icon` custom property, so later
// textContent changes never wipe it. Also: generated paper/wood panel textures, the loading bar and
// filled slider tracks.
import { iconURL, iconCanvas } from '../gfx/icons.js';

/** Paint the icon of one element (or change it: setIcon(el, 'play')). */
export function setIcon(el, name = el.dataset.icon, scale = +(el.dataset.scale || 1)) {
  if (!name) return;
  const id = `${name}@${scale}`;
  if (el._icon === id) return;
  el._icon = id;
  if (String(scale) !== (el.dataset.scale || '1')) el.dataset.scale = scale;
  if (el.dataset.icon !== name) el.dataset.icon = name;
  const c = iconCanvas(name, scale);
  el.style.setProperty('--icon', `url(${iconURL(name, scale)})`);
  el.style.setProperty('--icon-w', `${c.width}px`);
  el.style.setProperty('--icon-h', `${c.height}px`);
}

/** Set a button's text and (optionally) its icon without losing the icon. */
export function setLabel(el, text, icon = null) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return;
  el.textContent = text;
  if (icon) setIcon(el, icon);
}

export function applyIcons(root = document) {
  if (root.matches?.('[data-icon]')) setIcon(root);
  for (const el of root.querySelectorAll?.('[data-icon]') || []) setIcon(el);
}

// small seeded noise so textures are identical every run
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Tileable pixel texture (paper / dark wood) as a data URL, painted at 1 px = 1 texel. */
function texture(kind) {
  const W = 32, H = 32;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const r = rnd(kind === 'paper' ? 7 : 11);
  const base = kind === 'paper' ? [243, 233, 210] : kind === 'wood' ? [58, 40, 30] : [36, 28, 30];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let k = 1 + (r() - 0.5) * (kind === 'paper' ? 0.05 : 0.12);
    if (kind === 'paper' && r() < 0.035) k -= 0.06; // fibres
    if (kind === 'wood') k += Math.sin((y + Math.sin(x * 0.4) * 1.5) * 1.7) * 0.05; // grain
    const i = (y * W + x) * 4;
    img.data[i] = base[0] * k; img.data[i + 1] = base[1] * k; img.data[i + 2] = base[2] * k; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

function fillRanges() {
  for (const el of document.querySelectorAll('.panel input[type=range]')) {
    const k = (el.value - el.min) / ((el.max - el.min) || 1);
    el.style.setProperty('--fill', `${Math.round(k * 100)}%`);
  }
}

let installed = false;
export function installStaticIcons() {
  if (installed) return;
  installed = true;
  const root = document.documentElement.style;
  root.setProperty('--tex-paper', `url(${texture('paper')})`);
  root.setProperty('--tex-wood', `url(${texture('wood')})`);
  root.setProperty('--tex-dark', `url(${texture('dark')})`);
  for (const [v, name] of [['--ic-check', 'check'], ['--ic-down', 'arrow_down'], ['--ic-star', 'star']]) root.setProperty(v, `url(${iconURL(name, 1)})`);
  applyIcons();
  // icons on elements added later (hints, news, panels built from JS)
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'attributes') { if (m.target.dataset.icon) setIcon(m.target); continue; }
      for (const n of m.addedNodes) if (n.nodeType === 1) applyIcons(n);
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-icon'] });
  // loading bar follows the "42%" text main.js writes
  const pct = document.getElementById('load-pct'), loading = document.getElementById('loading');
  if (pct && loading) {
    const sync = () => loading.style.setProperty('--p', `${Math.max(0, Math.min(100, parseFloat(pct.textContent) || 0))}%`);
    new MutationObserver(sync).observe(pct, { childList: true, characterData: true, subtree: true });
    sync();
  }
  // slider tracks fill up to the thumb
  document.addEventListener('input', (e) => { if (e.target.matches?.('.panel input[type=range]')) fillRanges(); });
  const pause = document.getElementById('pause');
  if (pause) new MutationObserver(fillRanges).observe(pause, { attributes: true, attributeFilter: ['class'] });
  fillRanges();
}
