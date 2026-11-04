// Pixel art for the drive: Grandpa's chalk marks on the road where the van goes (a van-sized box with corner ticks and
// an arrow pointing the way in), white chalk on transparent, painted when the drive starts and disposed with it.
//   chalkTexture() -> Texture (40 x 80 px for a 2 m x 4 m patch of road; the arrow points to the texture's top)
import * as THREE from 'three';
import { Pix } from '../gfx/pix.js';
import { hash2 } from '../core/util.js';

export function chalkTexture() {
  const W = 40, H = 80, p = new Pix(W, H, 405);
  // chalk goes on unevenly: most strokes solid, the odd gap, a greyer smudge here and there
  const c = (x, y) => { if (hash2(x * 7, y * 3) < 0.84) p.px(x, y, hash2(x, y) < 0.25 ? 0xd8d4c8 : 0xf4f2ea); };
  for (let x = 2; x < W - 2; x++) { c(x, 2); c(x, 3); c(x, H - 3); c(x, H - 4); }
  for (let y = 2; y < H - 2; y++) { c(2, y); c(3, y); c(W - 3, y); c(W - 4, y); }
  // corner ticks, drawn twice like someone going over them again
  for (const [cx, cy, dx, dy] of [[6, 6, 1, 1], [W - 7, 6, -1, 1], [6, H - 7, 1, -1], [W - 7, H - 7, -1, -1]]) for (let k = 0; k < 5; k++) { c(cx + dx * k, cy); c(cx, cy + dy * k); }
  // the arrow: nose first, this way
  for (let y = 20; y < 56; y++) { c(19, y); c(20, y); }
  for (let k = 0; k < 8; k++) { c(19 - k, 20 + k); c(18 - k, 20 + k); c(20 + k, 20 + k); c(21 + k, 20 + k); }
  // a little "stop" bar across the nose end
  for (let x = 12; x < W - 12; x++) { c(x, 10); c(x, 11); }
  const t = new THREE.CanvasTexture(p.flush().canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}
