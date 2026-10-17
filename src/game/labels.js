// Diegetic label cards (held-item tag, shelf plaques) drawn as pixel-art canvases.
import * as THREE from 'three';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { getItem, SERIES_BY_ID } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { FINISHES } from '../data/finishes.js';

const hex = (s) => parseInt(s.slice(1), 16);
const cache = new Map();

/** A hanging paper tag shown next to the item you are holding. */
export function tagCard(key, finish = 'normal', isNew = false) {
  const ck = `tag|${key}|${finish}|${isNew}`;
  if (cache.has(ck)) return cache.get(ck).clone();
  const it = getItem(key);
  const s = SERIES_BY_ID[it.series];
  const R = RARITIES[it.rarity];
  const F = FINISHES[finish];
  const p = new Pix(144, 88, 7);
  p.fill(0xfbf6ea);
  p.rect(0, 0, 144, 14, hex(s.card.accent));
  p.text(s.jp, 4, 1, { size: 12, color: 0xffffff });
  p.text(it.jp, 6, 18, { size: 16, color: 0x2a2220 });
  p.text(it.name, 6, 38, { size: 11, color: 0x6a5a50, font: FONT_EN });
  // stars
  for (let i = 0; i < 5; i++) {
    const on = i < R.stars;
    p.sprite(['..X..', '.XXX.', 'XXXXX', '.XXX.', '.X.X.'], { X: on ? hex(R.color) : 0xd8d0c0 }, 6 + i * 8, 56, 1);
  }
  p.text(R.jp, 48, 53, { size: 11, color: hex(R.color) === 0xc9c2b4 ? 0x8a8070 : hex(R.color), outline: undefined });
  if (finish !== 'normal') {
    p.rect(4, 70, 136, 14, hex(F.color));
    p.text(`★ ${F.jp} ${F.name}`, 72, 71, { size: 10, color: 0x2a2220, align: 'center' });
  } else {
    p.rect(4, 74, 136, 1, 0xd8d0c0);
    p.text(`No.${String(s.items.indexOf(it) + 1).padStart(2, '0')} / ${s.items.length}`, 140, 76, { size: 9, color: 0x9a8a7a, align: 'right', font: FONT_EN });
  }
  if (isNew) {
    p.rect(108, 16, 32, 14, 0xe5383b);
    p.text('NEW', 124, 16, { size: 11, color: 0xffffff, align: 'center', font: FONT_EN });
  }
  p.frame(0, 0, 144, 88, 0xc8b8a0);
  // punch hole
  p.circle(136, 7, 2, 0xd8d0c0);
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
  p.text(it.jp, 48, 2, { size: 12, color: 0xf3e9d2, align: 'center' });
  for (let i = 0; i < R.stars; i++) p.sprite(['.X.', 'XXX', '.X.'], { X: hex(R.color) }, 48 - R.stars * 3 + i * 6, 22, 1);
  const mat = new THREE.MeshStandardMaterial({ map: p.texture(), roughness: 0.6, metalness: 0.2 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.016, 0.002), [null, null, null, null, mat, null].map((m) => m || new THREE.MeshStandardMaterial({ color: 0x2a2220 })));
  mesh.userData.noRim = true;
  mesh.castShadow = false;
  cache.set(ck, mesh);
  return mesh.clone();
}
