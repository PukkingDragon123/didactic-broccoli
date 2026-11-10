// The town's surfaces come from the shared photo texture library (src/kit/photoTex.js: real photographs cleaned into
// cartoon paint), see src/town/mats.js. The one texture drawn here is a painted marking, not a material: the yellow
// and black hazard stripes on poles, guards and clearance beams (uvs in metres, 0.4 m per repeat).
import * as THREE from 'three';

let HZ = null;
export function hazardTexture() {
  if (HZ) return HZ;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#e4bf3a'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#2c2c30';
  for (let i = -2; i < 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128 + 64, 0); x.lineTo(i * 128 + 64 + 256, 256); x.lineTo(i * 128 + 256, 256); x.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(1 / 0.4, 1 / 0.4); t.name = 'town:hazard';
  return (HZ = t);
}
