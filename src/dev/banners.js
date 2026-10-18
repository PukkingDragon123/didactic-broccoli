// Dev page: every series banner. banners.html?scale=2[&only=mochi][&faded=1]
import '@fontsource/dotgothic16/400.css';
import '@fontsource/pixelify-sans/400.css';
import * as THREE from 'three';
import { bannerCanvas, bannerGlyphs } from '../gfx/banner.js';
import { Thumbs } from '../gfx/thumbs.js';
import { SERIES } from '../data/series/index.js';

const params = new URLSearchParams(location.search);
const scale = +(params.get('scale') || 2);
await document.fonts.load('16px "DotGothic16"', bannerGlyphs());
await document.fonts.load('16px "Pixelify Sans"', 'ABC123');
const thumbs = new Thumbs(new THREE.WebGLRenderer({ antialias: true }));
const g = document.getElementById('g');
for (const s of SERIES) {
  if (params.get('only') && params.get('only') !== s.id) continue;
  const src = bannerCanvas(s.id, thumbs, { faded: !!params.get('faded') });
  const c = document.createElement('canvas');
  c.width = src.width * scale; c.height = src.height * scale;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  const d = document.createElement('div'); d.className = 'c';
  d.append(c, Object.assign(document.createElement('div'), { textContent: s.id }));
  g.append(d);
}
window.__ready = true;
