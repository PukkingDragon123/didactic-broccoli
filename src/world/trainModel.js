// The commuter train's cars: the lowpix Kamiyama Electric Railway EMU (art/lowpix/world_arch/_src/train.py: a driving
// car with the cab at +z and a motor car with the pantograph), coupled into a train for src/world/Town.js.
//   trainCars(n, len, gap) -> { group, mats } | null   n cars (driving car at each end, motor cars between), the group's
//       +z forward, y = 0 the rail top; mats = the train's own materials (night glow: window glass and lamps light up
//       through an emissive map made from the atlas, intensity set by the caller). null if the models are not loaded.
import * as THREE from 'three';
import { archReady } from './archModels.js';
import { assetNow } from '../kit/assets.js';
import { archAsset } from '../kit/lowpixArch.js';
import { drawPx, textWPx, PX_LINE } from '../gfx/pixfont.js';

const GLOW = new Map();

/** An emissive map from a lowpix atlas: window glass (the cool blue-grey ramp) as warm interior light; everything else
 *  black. */
function glowMap(map) {
  const im = map?.image;
  if (!im || !im.width) return null;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i], gg = a[i + 1], b = a[i + 2];
    const glass = b > r + 12 && b > gg + 4 && r < 140 && b < 190;
    const out = glass ? [255, 226, 170] : [0, 0, 0];
    a[i] = out[0]; a[i + 1] = out[1]; a[i + 2] = out[2]; a[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = map.flipY; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

/** One car (a fresh clone of the model with the train's glowing material). */
function car(id) {
  const g = assetNow(archAsset(id), { cast: false, receive: true });
  if (!g) return null;
  g.traverse((o) => {
    if (!o.isMesh) return;
    let m = GLOW.get(o.material);
    if (!m) {
      m = o.material.clone();
      const em = glowMap(m.map); // the atlas keeps its mip chain: the train is seen moving, from 10 to 60 m
      if (em) Object.assign(m, { emissive: new THREE.Color(0xffffff), emissiveMap: em, emissiveIntensity: 0 });
      m.name = 'train';
      GLOW.set(o.material, m);
    }
    o.material = m;
    o.userData.noRim = true;
  });
  return g;
}

// ------------------------------------------------------------------ lettering (the game's high-res pixel font)
const BOARDS = []; // { canvas, tex, draw } redrawn once the pixel fonts have loaded
/** A lettered plate as a quad: text drawn at the font's native 16 px grid (px per metre from the plate's height). */
function letterQuad(lines, w, h, { bg = null, ink = '#1c1c1e' } = {}) {
  const ph = PX_LINE * lines.length + 6, pw = Math.max(16, Math.ceil(ph * w / h));
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const draw = () => {
    g.clearRect(0, 0, pw, ph);
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, pw, ph); }
    lines.forEach((t, k) => drawPx(g, t, Math.round(pw / 2), 3 + k * PX_LINE + 2, { col: ink, align: 'center', max: pw - 4 }));
    tex.needsUpdate = true;
  };
  draw();
  BOARDS.push(draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: bg ? 0 : 0.5, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  m.name = 'trainLettering';
  const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  q.userData.noRim = true;
  return q;
}
if (typeof document !== 'undefined' && document.fonts) {
  Promise.all(['16px "Alagard"', '16px "DotGothic16"'].map((f) => document.fonts.load(f, 'OKUNO 奥野 KD 1021').catch(() => null)))
    .then(() => { for (const d of BOARDS) d(); }).catch(() => {});
}
void textWPx;

/** The lettering of one car (local frame: cab at +z): the car numbers on both sides; on a driving car the roll sign
 *  (奥野 / OKUNO, the line's terminus) and the run number. */
function letter(carGroup, cab, num) {
  const HW = 1.4, L = 18, zf = L / 2 + 0.012;
  for (const s of [-1, 1]) for (const e of [-1, 1]) {
    const q = letterQuad([num], 0.62, 0.15, { ink: '#eeece4' });
    q.position.set(s * (HW + 0.004), 1.55, e * 7.7);
    q.rotation.y = s * Math.PI / 2;
    carGroup.add(q);
  }
  if (!cab) return;
  const dest = letterQuad(['奥野  OKUNO'], 0.84, 0.21, { bg: '#eeece4' });
  dest.position.set(0, 3.135, zf + 0.032);
  carGroup.add(dest);
  const run = letterQuad(['21'], 0.32, 0.2, { bg: '#1c1c1e', ink: '#eeece4' });
  run.position.set(-1.0, 2.7, zf + 0.048);
  carGroup.add(run);
}

export function trainCars(n = 3, len = 18, gap = 0.5) {
  if (!archReady('train_cab') || !archReady('train_mid')) return null;
  const group = new THREE.Group();
  group.name = 'train';
  for (let i = 0; i < n; i++) {
    const end = i === 0 || i === n - 1, c = car(end ? 'train_cab' : 'train_mid');
    if (!c) return null;
    c.position.z = (i - (n - 1) / 2) * (len + gap);
    letter(c, end, `KD ${end ? 1021 + i : 1121 + i}`);
    if (i === 0) c.rotation.y = Math.PI; // the rear driving car faces backwards
    // the middle motor cars alternate so the pantographs are not all at one end
    else if (!end && i % 2 === 0) c.rotation.y = Math.PI;
    group.add(c);
  }
  return { group, mats: [...new Set(GLOW.values())] };
}
