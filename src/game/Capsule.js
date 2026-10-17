// Gacha capsules: two glossy hemispheres (clear top, coloured bottom), seam lip, tab and a folded mini-book inside.
import * as THREE from 'three';
import { SERIES_BY_ID } from '../data/series/index.js';
import { Pix } from '../gfx/pix.js';

export function capsuleRadius(seriesId) {
  const p = SERIES_BY_ID[seriesId]?.price || 100;
  return p <= 200 ? 0.036 : p <= 500 ? 0.041 : 0.047;
}

const geoCache = new Map();
function geos(r) {
  const k = r.toFixed(4);
  if (geoCache.has(k)) return geoCache.get(k);
  const top = new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const bottom = new THREE.SphereGeometry(r * 0.985, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const lip = new THREE.CylinderGeometry(r * 1.015, r * 1.015, r * 0.16, 28, 1, true);
  const tab = new THREE.BoxGeometry(r * 0.32, r * 0.14, r * 0.12);
  const inner = new THREE.CircleGeometry(r * 0.97, 24);
  const paper = new THREE.BoxGeometry(r * 1.0, r * 0.05, r * 0.7);
  const bag = new THREE.SphereGeometry(r * 0.62, 10, 8);
  const g = { top, bottom, lip, tab, inner, paper, bag };
  geoCache.set(k, g);
  return g;
}

const matCache = new Map();
function colorMat(color) {
  if (!matCache.has(color)) {
    matCache.set(color, new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.2 }));
  }
  return matCache.get(color);
}
let clearMat = null, innerMat = null, bagMat = null;
const paperMats = new Map();
function shared() {
  if (!clearMat) {
    clearMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4fbff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.26,
      clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8, depthWrite: false, side: THREE.DoubleSide,
      specularIntensity: 1, ior: 1.5,
    });
    innerMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5, side: THREE.DoubleSide });
    bagMat = new THREE.MeshPhysicalMaterial({ color: 0xe8f0ff, roughness: 0.3, transparent: true, opacity: 0.55, clearcoat: 0.5 });
  }
}
function paperMat(seriesId) {
  if (paperMats.has(seriesId)) return paperMats.get(seriesId);
  const s = SERIES_BY_ID[seriesId];
  const p = new Pix(32, 24, 3);
  const bg = parseInt((s?.card?.bg || '#ffffff').slice(1), 16);
  const ac = parseInt((s?.card?.accent || '#e5383b').slice(1), 16);
  p.fill(bg);
  p.rect(0, 0, 32, 6, ac);
  p.rect(3, 9, 26, 2, 0x666666); p.rect(3, 13, 20, 2, 0x888888); p.rect(3, 17, 24, 2, 0x888888);
  p.rect(26, 15, 4, 6, ac);
  const m = new THREE.MeshStandardMaterial({ map: p.texture(), roughness: 0.9 });
  paperMats.set(seriesId, m);
  return m;
}

/**
 * Build a capsule group. Returns { group, top, bottom, r }.
 * top/bottom are sub-groups that can be animated apart when opening.
 */
export function makeCapsule(seriesId, color, opts = {}) {
  shared();
  const r = opts.radius || capsuleRadius(seriesId);
  const g = geos(r);
  const group = new THREE.Group();
  const top = new THREE.Group();
  const bottom = new THREE.Group();
  group.add(top, bottom);
  const topShell = new THREE.Mesh(g.top, clearMat);
  topShell.renderOrder = 2;
  top.add(topShell);
  const botShell = new THREE.Mesh(g.bottom, colorMat(color));
  botShell.castShadow = true;
  botShell.receiveShadow = true;
  bottom.add(botShell);
  const lip = new THREE.Mesh(g.lip, colorMat(color));
  lip.position.y = -r * 0.04;
  lip.castShadow = true;
  bottom.add(lip);
  const tab = new THREE.Mesh(g.tab, colorMat(color));
  tab.position.set(0, -r * 0.02, r * 1.02);
  bottom.add(tab);
  // contents seen through the clear dome: folded mini-book + bagged toy
  const paper = new THREE.Mesh(g.paper, paperMat(seriesId));
  paper.position.set(0, r * 0.06, 0);
  paper.rotation.set(0.15, 0.4, 0.05);
  bottom.add(paper);
  const bag = new THREE.Mesh(g.bag, bagMat);
  bag.scale.set(1, 0.6, 0.9);
  bag.position.set(0, -r * 0.25, 0);
  bottom.add(bag);
  const disc = new THREE.Mesh(g.inner, innerMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -r * 0.5;
  disc.visible = false;
  bottom.add(disc);
  // a capsule is a sphere: seam faces sideways when lying, randomise orientation
  group.userData.capsule = true;
  return { group, top, bottom, r, paper };
}

/** Pick a capsule colour for a series. */
export function capsuleColor(seriesId, rnd = Math.random) {
  const cols = SERIES_BY_ID[seriesId]?.capsule?.colors || [0xff9eb5, 0x9ed8ff, 0xfff09e];
  return cols[Math.floor(rnd() * cols.length)];
}

// Shared instanced geometry for capsules piled inside machine windows
export function pileGeometries(r) {
  const g = geos(r);
  return { top: g.top, bottom: g.bottom, clearMat: (shared(), clearMat) };
}
