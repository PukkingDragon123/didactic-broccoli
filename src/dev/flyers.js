// Dev page: every flyer and promo poster (src/gfx/flyers.js).
//   flyers.html?only=much,nope &w=600 (display width) &kind=promo|meme  (sheets are 150 x 212 px, shown pixelated)
import '@fontsource/grandstander/400.css';
import '@fontsource/grandstander/600.css';
import '@fontsource/grandstander/700.css';
import '../ui/fonts.css';
import * as THREE from 'three';
import { Thumbs } from '../gfx/thumbs.js';
import { FLYERS, initFlyers, whenFlyer } from '../gfx/flyers.js';

const err = document.getElementById('err');
window.addEventListener('error', (e) => { err.textContent += (e.message || e) + '\n'; });
window.addEventListener('unhandledrejection', (e) => { err.textContent += String(e.reason?.stack || e.reason) + '\n'; });
const Q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(8, 8);
initFlyers(renderer, { thumbs: new Thumbs(renderer) });
const grid = document.getElementById('grid');
grid.style.setProperty('--w', (Q.get('w') || 300) + 'px');
let list = Q.get('only') ? FLYERS.filter((f) => Q.get('only').split(',').includes(f.id)) : FLYERS;
if (Q.get('kind')) list = list.filter((f) => f.kind === Q.get('kind'));
for (const f of list) {
  const c = await whenFlyer(f.id);
  c.dataset.id = f.id;
  const fig = document.createElement('figure');
  const cap = document.createElement('figcaption');
  cap.textContent = `${f.id} - ${f.name} (${f.kind})`;
  fig.append(c, cap);
  grid.append(fig);
}
window.__ready = true;
