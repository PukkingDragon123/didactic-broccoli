// Parked vehicles from the converted, repainted models (art/lowpix/world_arch/_src/vehicles.py: real hand-made CC BY
// models, every maker's badge painted out by retouch_vehicles.mjs), with the lane's own number plates: kei yellow,
// set in the game's high-res pixel font (src/gfx/pixfont.js), the town (上山) and a made-up number.
//   parkedCar(id, parent, { x, z, ry, plate: { town, cls, kana, num }, cast }) -> Group | null (null: not loaded)
import * as THREE from 'three';
import { archPlace, archReady, archSlot } from './archModels.js';
import { LP_ARCH } from '../kit/lowpixArch.js';
import { drawPx, PX_LINE } from '../gfx/pixfont.js';

const PLATES = [];
if (typeof document !== 'undefined' && document.fonts) {
  Promise.all(['16px "Alagard"', '16px "DotGothic16"'].map((f) => document.fonts.load(f, '上山 480 さ 12-34').catch(() => null)))
    .then(() => { for (const d of PLATES) d(); }).catch(() => {});
}

/** A kei number plate (yellow, dark green ink, a pressed rim and two bolts) as a quad 0.33 x 0.165 m facing +z. */
function plate({ town = '上山', cls = '480', kana = 'さ', num = '12-34', bg = '#e8c93c', ink = '#1e2a1e', rim = '#b89a2a', hi = '#f4e27a' } = {}) {
  const ph = PX_LINE * 2 + 8, pw = Math.round(ph * 2);
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const draw = () => {
    g.fillStyle = bg; g.fillRect(0, 0, pw, ph);
    g.fillStyle = rim; g.fillRect(0, 0, pw, 1); g.fillRect(0, ph - 1, pw, 1); g.fillRect(0, 0, 1, ph); g.fillRect(pw - 1, 0, 1, ph);
    g.fillStyle = hi; g.fillRect(1, 1, pw - 2, 1);
    for (const bx of [Math.round(pw * 0.2), Math.round(pw * 0.8)]) { g.fillStyle = '#8a8a80'; g.fillRect(bx, 3, 2, 2); }
    drawPx(g, `${town} ${cls}`, Math.round(pw / 2), 4, { col: ink, align: 'center', max: pw - 4 });
    drawPx(g, `${kana} ${num}`, Math.round(pw / 2), 4 + PX_LINE, { col: ink, align: 'center', max: pw - 4 });
    tex.needsUpdate = true;
  };
  draw();
  PLATES.push(draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  m.name = 'numberPlate';
  const q = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.165), m);
  q.userData.noRim = true;
  return q;
}

// the imported models' materials, by their source names: real glass (see-through, the sky and the street in it),
// chrome, the paint with a little clear-coat sheen; and where each one's plates go (front / rear height, metres)
const GLASS = /glass|window|blinn1SG|Material\.00[2-7]$/i, CHROME = /chrome|^crown(\.0\d\d)?$|caders/i, PAINT = /^(body|lambert2SG|Fix0101Mtl)$/i;
export const CAR_PLATES = { mini_truck: [0.36, 0.5], kei_van: [0.38, 0.52], taxi_sedan: [0.42, 0.62] };
const GLASS_M = new Map();
function dress(g) {
  g.traverse((o) => {
    if (!o.isMesh) return;
    o.material = [].concat(o.material).map((m) => {
      const n = m.name || '';
      if (!/wheel|tire|tyre|rim|hub/i.test(n) && (GLASS.test(n) || (m.transparent && !/light|lamp/i.test(n)))) {
        // (a source's alpha-blended wheel is not glass)
        if (!GLASS_M.has(n)) {
          GLASS_M.set(n, new THREE.MeshPhysicalMaterial({ name: 'car-glass', color: 0x8fa3ad, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.3,
            depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.7, specularIntensity: 1 }));
        }
        o.renderOrder = 2;
        return GLASS_M.get(n);
      }
      if (CHROME.test(n)) { m.metalness = 0.85; m.roughness = 0.22; m.envMapIntensity = 1.3; }
      else if (PAINT.test(n)) { m.roughness = 0.42; m.metalness = 0.05; m.envMapIntensity = 0.9; }
      else { m.metalness = Math.min(m.metalness, 0.25); m.roughness = Math.max(m.roughness, 0.5); } // painted pixel art, not CG metal
      if (/wheel|tire|tyre/i.test(n) && m.transparent) { m.transparent = false; m.opacity = 1; m.alphaTest = 0.5; m.depthWrite = true; }
      return m;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
  return g;
}

/** The imported model alone (materials dressed, its plates on), local frame: for vehicles the game drives itself.
 *  The models load lazily (they are big): the group is returned at once and fills in; onLoad() runs when it has. */
export function carBody(id, { plate: pl = {}, cast = true, onLoad = null } = {}) {
  if (!LP_ARCH[id]) return null;
  let g = archReady(id) ? archPlace(id, null, { cast }) : null;
  if (g) { dress(g); if (onLoad) queueMicrotask(onLoad); } else {
    g = archSlot(id, null, { cast });
    g.addEventListener?.('assetloaded', () => { dress(g); onLoad?.(); });
  }
  const box = LP_ARCH[id], [fy, ry] = CAR_PLATES[id] || [0.42, 0.5];
  const wrap = new THREE.Group();
  wrap.name = 'car:' + id;
  g.position.set(0, 0, 0); g.rotation.y = 0; g.updateMatrix(); g.matrixAutoUpdate = false;
  const f = plate(pl), r = plate(pl);
  f.position.set(0, fy, box.max[2] + 0.012);
  r.position.set(0, ry, box.min[2] - 0.012); r.rotation.y = Math.PI;
  wrap.add(g, f, r);
  if (id === 'mini_truck') { const gr = grilleSlats(0.5, 0.15); gr.position.set(0, 0.79, 1.672); wrap.add(gr); } // where the maker's badge was
  return wrap;
}

/** A grille of dark horizontal slats with a lit top lip (pixel art), as a quad facing +z: covers a removed badge. */
function grilleSlats(w, h) {
  const W = Math.round(w * 256), H = Math.round(h * 256), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#3c4044'; g.fillRect(0, 0, W, H);
  for (let y = 3; y < H - 2; y += 6) { g.fillStyle = '#16181a'; g.fillRect(2, y, W - 4, 3); g.fillStyle = '#8a9094'; g.fillRect(2, y - 1, W - 4, 1); }
  g.fillStyle = '#9aa0a4'; g.fillRect(0, 0, W, 1); g.fillStyle = '#202326'; g.fillRect(0, H - 1, W, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  m.name = 'grilleSlats';
  const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  q.userData.noRim = true;
  return q;
}

export function parkedCar(id, parent, { x = 0, z = 0, ry = 0, plate: pl = {}, cast = true } = {}) {
  const wrap = carBody(id, { plate: pl, cast });
  if (!wrap) return null;
  wrap.position.set(x, 0, z); wrap.rotation.y = ry;
  wrap.updateMatrixWorld(true);
  parent.add(wrap);
  return wrap;
}

/** Lettering painted on a body panel (a cut-out quad facing +z, w x h metres): lines in the game's pixel font at its
 *  native 16 px grid, e.g. a taxi company's name and number on the doors. */
export function lettering(lines, w, h, { ink = '#1e3a24' } = {}) {
  const ph = PX_LINE * lines.length + 4, pw = Math.max(16, Math.round(ph * w / h));
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const draw = () => { g.clearRect(0, 0, pw, ph); lines.forEach((t, k) => drawPx(g, t, Math.round(pw / 2), 3 + k * PX_LINE, { col: ink, align: 'center', max: pw - 2 })); tex.needsUpdate = true; };
  draw();
  PLATES.push(draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  m.name = 'carLettering';
  const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  q.userData.noRim = true;
  return q;
}
