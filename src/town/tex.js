// The town's surfaces come from the shared texture library (src/kit/photoTex.js: real scans and photos as HD pixel
// art), see src/town/mats.js. The one texture drawn here is a painted marking, not a material: the yellow and black
// hazard stripes on poles, guards and clearance beams (uvs in metres, 0.4 m per repeat), pixelled by hand: 45-degree
// bands stepped one texel a row, each yellow band with a lit upper edge and a worn lower one, the black a touch
// lighter where the paint is thin along its edge.
import * as THREE from 'three';
import { pixelCanvas } from '../kit/photoTex.js';

let HZ = null;
export function hazardTexture() {
  if (HZ) return HZ;
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S;  // 160 texels a metre
  const x = c.getContext('2d');
  const Y = ['#e4bf3a', '#f0d258', '#c8a02c'], K = ['#2c2c30', '#3a3a3e'];
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const d = (i + j) % S;            // distance along the stripe's normal, in texels
    let col;
    if (d < 32) col = d === 0 ? Y[1] : d === 31 ? Y[2] : Y[0];
    else col = d === 32 || d === 63 ? K[1] : K[0];
    x.fillStyle = col; x.fillRect(i, j, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 0.4, 1 / 0.4); t.name = 'town:hazard';
  return (HZ = pixelCanvas(t));
}
