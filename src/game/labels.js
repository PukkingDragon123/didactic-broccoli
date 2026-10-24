// Diegetic label cards (held-item tag, shelf plaques) drawn as pixel-art canvases.
// Text uses the pixel fonts at their crisp sizes: Grandstander 8/16 px, GG Display 28 px.
import * as THREE from 'three';
import { Pix, FONT_EN, FONT_DISPLAY } from '../gfx/pix.js';
import { iconCanvas } from '../gfx/icons.js';
import { getItem, SERIES_BY_ID } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { FINISHES } from '../data/finishes.js';

const hex = (s) => parseInt(s.slice(1), 16);
const cache = new Map();

/** Trim `str` with an ellipsis until it fits `max` px. */
export function fitText(p, str, max, size, font = FONT_EN) {
  if (p.measure(str, size, font) <= max) return str;
  while (str.length > 1 && p.measure(str + '...', size, font) > max) str = str.slice(0, -1);
  return str.trimEnd() + '...';
}

/** Greedy word wrap into at most `lines` lines (the last one ellipsised if needed). */
export function wrapText(p, str, max, size, font = FONT_EN, lines = 2) {
  const out = [];
  let cur = '';
  for (const w of String(str).split(/\s+/)) {
    const t = cur ? `${cur} ${w}` : w;
    if (!cur || p.measure(t, size, font) <= max) cur = t;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; out[lines - 1] += '...'; }
  return out.map((l) => fitText(p, l, max, size, font));
}

function icon(p, name, scale, x, y) {
  p.flush();
  p.ctx.drawImage(iconCanvas(name, scale), x, y);
  p.pull();
}

/** Offset from the text y (textBaseline 'top') to the top of the capitals, and the cap height. */
export function capBox(p, size, font = FONT_EN) {
  const g = p.ctx;
  g.save(); g.font = `${size}px ${font}`; g.textBaseline = 'top';
  const m = g.measureText('H');
  g.restore();
  return { off: Math.round(-m.actualBoundingBoxAscent), h: Math.round(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) };
}

/** A hanging paper tag shown next to the item you are holding. */
export function tagCard(key, finish = 'normal', isNew = false) {
  const ck = `tag|${key}|${finish}|${isNew}`;
  if (cache.has(ck)) return cache.get(ck).clone();
  const it = getItem(key);
  const s = SERIES_BY_ID[it.series];
  const R = RARITIES[it.rarity];
  const F = FINISHES[finish];
  const W = 288, H = 176;
  const p = new Pix(W, H, 7);
  p.fill(0xfbf6ea);
  for (let y = 0; y < H; y += 2) for (let x = (y / 2) % 3; x < W; x += 3) if (p.r() < 0.12) p.px(x, y, 0xf0e8d6);
  // series band (+ NEW badge)
  p.rect(0, 0, W, 28, hex(s.card.accent));
  p.rect(0, 26, W, 2, 0x000000, 40);
  const right = isNew ? 100 : 34;
  p.text(fitText(p, s.name.toUpperCase(), W - 10 - right, 16), 10, 6, { size: 16, color: 0xffffff, font: FONT_EN });
  if (isNew) {
    p.rect(W - 92, 3, 56, 22, 0xffffff);
    p.rect(W - 90, 5, 52, 18, 0xe5383b);
    p.text('NEW', W - 64, 5, { size: 16, color: 0xffffff, align: 'center', font: FONT_EN });
  }
  // item name in GG Display: big when it fits on two lines
  let size = 56, lines = wrapText(p, it.name, W - 20, 56, FONT_DISPLAY, 2);
  if (lines.some((l) => l.endsWith('...'))) { size = 28; lines = wrapText(p, it.name, W - 20, 28, FONT_DISPLAY, 2); }
  const cap = capBox(p, size, FONT_DISPLAY);
  const lh = size === 56 ? 42 : 24, starsH = 12, gap = size === 56 ? 12 : 8;
  const blockH = (lines.length - 1) * lh + cap.h + gap + starsH;
  let top = 30 + Math.max(4, Math.round((H - 34 - 30 - blockH) / 2));
  lines.forEach((l, i) => p.text(l, 10, top + i * lh - cap.off, { size, color: 0x2a2220, font: FONT_DISPLAY }));
  const y0 = top + (lines.length - 1) * lh + cap.h + gap;
  // stars + rarity
  const rc = hex(R.color) === 0xc9c2b4 ? 0x8a8070 : hex(R.color);
  for (let i = 0; i < 5; i++) p.sprite(['..X..', '.XXX.', 'XXXXX', '.XXX.', '.X.X.'], { X: i < R.stars ? hex(R.color) : 0xd8d0c0 }, 10 + i * 14, y0, 2);
  const c16 = capBox(p, 16);
  p.text(R.name.toUpperCase(), 86, y0 - c16.off, { size: 16, color: rc, font: FONT_EN });
  if (finish !== 'normal') {
    p.rect(6, H - 32, W - 12, 26, hex(F.color));
    p.rect(6, H - 8, W - 12, 2, 0x000000, 40);
    icon(p, 'sparkle', 1, 12, H - 32 + 3);
    p.text(`${F.name.toUpperCase()} FINISH`, W / 2 + 10, H - 24 - c16.off, { size: 16, color: 0x2a2220, align: 'center', font: FONT_EN });
  } else {
    p.rect(8, H - 28, W - 16, 2, 0xd8d0c0);
    p.text(`NO.${String(s.items.indexOf(it) + 1).padStart(2, '0')} / ${s.items.length}`, W - 10, H - 20 - c16.off, { size: 16, color: 0x9a8a7a, align: 'right', font: FONT_EN });
  }
  p.frame(0, 0, W, H, 0xc8b8a0);
  p.frame(1, 1, W - 2, H - 2, 0xe8dcc6);
  // punch hole
  p.circle(W - 14, 13, 5, 0xfbf6ea);
  p.circle(W - 14, 13, 3, 0xb8a890);
  const tex = p.texture();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.072, 0.044), mat);
  mesh.userData.noRim = true;
  cache.set(ck, mesh);
  return mesh.clone();
}

/** Tiny museum-style plaque under a displayed item. */
export function plaque(key, finish = 'normal') {
  const ck = `plq|${key}|${finish}`;
  if (cache.has(ck)) return cache.get(ck).clone();
  const it = getItem(key);
  const R = RARITIES[it.rarity];
  const p = new Pix(96, 32, 9);
  p.fill(finish === 'normal' ? 0x2a2220 : 0x3a2a10);
  p.frame(0, 0, 96, 32, finish === 'normal' ? 0x8a7a6a : hex(FINISHES[finish].color));
  p.text(fitText(p, it.name.toUpperCase(), 88, 8), 48, 6, { size: 8, color: 0xf3e9d2, align: 'center', font: FONT_EN });
  for (let i = 0; i < R.stars; i++) p.sprite(['.X.', 'XXX', '.X.'], { X: hex(R.color) }, 48 - R.stars * 3 + i * 6, 21, 1);
  const mat = new THREE.MeshStandardMaterial({ map: p.texture(), roughness: 0.6, metalness: 0.2 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.016, 0.002), [null, null, null, null, mat, null].map((m) => m || new THREE.MeshStandardMaterial({ color: 0x2a2220 })));
  mesh.userData.noRim = true;
  mesh.castShadow = false;
  cache.set(ck, mesh);
  return mesh.clone();
}
