// Parked vehicles from the converted, repainted models (art/lowpix/world_arch/_src/vehicles.py: real hand-made CC BY
// models, every maker's badge painted out by retouch_vehicles.mjs), with the lane's own number plates: kei yellow,
// set in the game's high-res pixel font (src/gfx/pixfont.js), the town (上山) and a made-up number.
//   parkedCar(id, parent, { x, z, ry, plate: { town, cls, kana, num }, cast }) -> Group | null (null: not loaded)
import * as THREE from 'three';
import { archPlace } from './archModels.js';
import { LP_ARCH } from '../kit/lowpixArch.js';
import { drawPx, PX_LINE } from '../gfx/pixfont.js';

const PLATES = [];
if (typeof document !== 'undefined' && document.fonts) {
  Promise.all(['16px "Alagard"', '16px "DotGothic16"'].map((f) => document.fonts.load(f, '上山 480 さ 12-34').catch(() => null)))
    .then(() => { for (const d of PLATES) d(); }).catch(() => {});
}

/** A kei number plate (yellow, dark green ink, a pressed rim and two bolts) as a quad 0.33 x 0.165 m facing +z. */
function plate({ town = '上山', cls = '480', kana = 'さ', num = '12-34' } = {}) {
  const ph = PX_LINE * 2 + 8, pw = Math.round(ph * 2);
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const draw = () => {
    g.fillStyle = '#e8c93c'; g.fillRect(0, 0, pw, ph);
    g.fillStyle = '#b89a2a'; g.fillRect(0, 0, pw, 1); g.fillRect(0, ph - 1, pw, 1); g.fillRect(0, 0, 1, ph); g.fillRect(pw - 1, 0, 1, ph);
    g.fillStyle = '#f4e27a'; g.fillRect(1, 1, pw - 2, 1);
    for (const bx of [Math.round(pw * 0.2), Math.round(pw * 0.8)]) { g.fillStyle = '#8a8a80'; g.fillRect(bx, 3, 2, 2); }
    drawPx(g, `${town} ${cls}`, Math.round(pw / 2), 4, { col: '#1e2a1e', align: 'center', max: pw - 4 });
    drawPx(g, `${kana} ${num}`, Math.round(pw / 2), 4 + PX_LINE, { col: '#1e2a1e', align: 'center', max: pw - 4 });
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

export function parkedCar(id, parent, { x = 0, z = 0, ry = 0, plate: pl = {}, cast = true, front = 0.42, rear = 0.5 } = {}) {
  const g = archPlace(id, null, { cast });
  if (!g) return null;
  const box = LP_ARCH[id];
  const wrap = new THREE.Group();
  wrap.name = 'car:' + id;
  wrap.add(g);
  g.position.set(0, 0, 0); g.rotation.y = 0; g.updateMatrix(); g.matrixAutoUpdate = false;
  const f = plate(pl), r = plate(pl);
  f.position.set(0, front, box.max[2] + 0.012);
  r.position.set(0, rear, box.min[2] - 0.012); r.rotation.y = Math.PI;
  wrap.add(f, r);
  wrap.position.set(x, 0, z); wrap.rotation.y = ry;
  wrap.updateMatrixWorld(true);
  parent.add(wrap);
  return wrap;
}
