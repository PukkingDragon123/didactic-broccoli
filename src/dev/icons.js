// Dev preview for the pixel icons (src/gfx/icons.js): every icon at several scales on light and dark UI backgrounds.
// URL params:  ?group=ui|items   &only=key,milk   &scales=1,2,4 (default)   &demo=0 hides the hotbar/shop mock-ups
import '@fontsource/dotgothic16/400.css';
import { ICONS, ICON_GROUPS, iconHTML, hasIcon } from '../gfx/icons.js';

const errBox = document.getElementById('err');
window.addEventListener('error', (e) => { errBox.textContent += (e.message || e) + '\n'; });

// names other modules rely on
const REQUIRED = {
  ui: 'gear close check lock unlock star heart hand mouse_left mouse_right drop rotate move pause play home cart bag arrow_left arrow_right arrow_up arrow_down plus minus info warning music radio bulb trash book map chat clock people flag megaphone sparkle upgrade museum refill sell new crown sound_on sound_off eye coin yen shop storage wrench speed capacity charm opener deco wallet door exit host join share copy back keyboard touch',
  items: 'notebook key milk broom battery toolkit tube trash_bag flyer cash_tin capsule figure box cat bowl machine shelf display ticket camera',
};

const params = new URLSearchParams(location.search);
const only = params.get('only')?.split(',').filter(Boolean);
const scales = (params.get('scales') || '1,2,4').split(',').map(Number);
const groups = params.get('group') ? [params.get('group')] : ['ui', 'items'];
const root = document.getElementById('root');

const missing = Object.values(REQUIRED).join(' ').split(' ').filter((n) => !hasIcon(n));
if (missing.length) {
  document.getElementById('missing').textContent = `Missing icons (${missing.length}): ${missing.join(', ')}`;
  console.warn('missing icons', missing);
}

function demo() {
  const wrap = document.createElement('div');
  const items = ['notebook', 'key', 'milk', 'broom', 'capsule'];
  wrap.innerHTML = `<h2>In context<span>hotbar 2x, shop card 3x, buttons 2x</span></h2>
    <div class="bar">
      ${items.map((n, i) => `<div class="slot${i === 1 ? ' sel' : ''}">${iconHTML(n, 2)}</div>`).join('')}
      <div style="width:24px"></div>
      ${['battery', 'toolkit', 'tube', 'flyer'].map((n) => `<div class="shopcard">${iconHTML(n, 3)}<span>${n}</span><span class="price">${iconHTML('yen', 1)}300</span></div>`).join('')}
    </div>
    <div class="bar" style="margin-top:14px">
      ${['gear', 'close', 'check', 'cart', 'museum', 'host', 'join', 'copy', 'sound_on', 'exit'].map((n) => `<span class="btn">${iconHTML(n, 2)}${n}</span>`).join('')}
    </div>`;
  root.appendChild(wrap);
}

try {
  if (params.get('demo') !== '0' && !only) demo();
  for (const g of groups) {
    const names = (ICON_GROUPS[g] || []).filter((n) => !only || only.includes(n));
    if (!names.length) continue;
    const h = document.createElement('h2');
    h.innerHTML = `${g === 'ui' ? 'UI glyphs' : 'Items'}<span>${names.length} icons</span>`;
    root.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const n of names) {
      const rows = ICONS[n].rows;
      const card = document.createElement('div');
      card.className = 'card';
      const strip = (cls) => `<div class="bg ${cls}">${scales.map((s) => iconHTML(n, s)).join('')}</div>`;
      card.innerHTML = `<div class="name">${n} <span style="opacity:.55">${Math.max(...rows.map((r) => r.length))}x${rows.length}</span></div><div class="row">${strip('light')}${strip('dark')}</div>`;
      grid.appendChild(card);
    }
    root.appendChild(grid);
  }
  await document.fonts.ready;
} catch (e) {
  errBox.textContent += String(e.stack || e);
}
window.__ready = true;
