// The commuter train's cars: the lowpix Kamiyama Electric Railway EMU (art/lowpix/world_arch/_src/train.py: a driving
// car with the cab at +z and a motor car with the pantograph), coupled into a train for src/world/Town.js.
//   trainCars(n, len, gap) -> { group, mats } | null   n cars (driving car at each end, motor cars between), the group's
//       +z forward, y = 0 the rail top; mats = the train's own materials (night glow: window glass and lamps light up
//       through an emissive map made from the atlas, intensity set by the caller). null if the models are not loaded.
import * as THREE from 'three';
import { archReady } from './archModels.js';
import { assetNow } from '../kit/assets.js';
import { archAsset } from '../kit/lowpixArch.js';

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

export function trainCars(n = 3, len = 18, gap = 0.5) {
  if (!archReady('train_cab') || !archReady('train_mid')) return null;
  const group = new THREE.Group();
  group.name = 'train';
  for (let i = 0; i < n; i++) {
    const end = i === 0 || i === n - 1, c = car(end ? 'train_cab' : 'train_mid');
    if (!c) return null;
    c.position.z = (i - (n - 1) / 2) * (len + gap);
    if (i === 0) c.rotation.y = Math.PI; // the rear driving car faces backwards
    // the middle motor cars alternate so the pantographs are not all at one end
    else if (!end && i % 2 === 0) c.rotation.y = Math.PI;
    group.add(c);
  }
  return { group, mats: [...new Set(GLOW.values())] };
}
