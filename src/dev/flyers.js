// Dev page: every meme flyer design (src/gfx/flyers.js).   flyers.html?only=much,nope &w=600 (display width)
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
const list = Q.get('only') ? FLYERS.filter((f) => Q.get('only').split(',').includes(f.id)) : FLYERS;
for (const f of list) {
  const c = await whenFlyer(f.id);
  const fig = document.createElement('figure');
  const cap = document.createElement('figcaption');
  cap.textContent = `${f.id} - ${f.name}`;
  fig.append(c, cap);
  grid.append(fig);
}
window.__ready = true;
