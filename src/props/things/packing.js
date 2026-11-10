// The packing gear on the work table (src/game/packaging.js): the acrylic display stand, the packing station (an
// impulse heat sealer with its hinged arm, a stack of blister backing cards, a box of stands) and the thermoformed
// PET bubble of a blister card.
//   standMesh()    bottom centre, the figure stands on its top at y = 0.0315 (front +z)
//   stationMesh()  bottom centre, 0.29 x 0.14 x 0.16 (the card stack at x -0.085, the sealer on the right)
//   bubbleGeometry(w, h, d) a blister bubble: a rounded tray w x h, d deep, its open back at z = 0, with a flange
import * as THREE from 'three';
import { thingMesh } from './make.js';
import { sweep, rrect } from './form.js';
import { paint, plastic, metal, chrome, matte, rubber, flat, darken, lighten } from '../kit/kit.js';
import { kana, smallPrint, framed } from '../kit/prints.js';
import { stack } from '../kit/shapes.js';

// ------------------------------------------------------------------ the acrylic stand (0.072 x 0.0315 x 0.072)
function stand(K, B) {
  const clear = K.tint(0xe6f2f6, 70, 0.06), edge = K.tint(0xc4e0e8, 150, 0.08);
  // the base plate: polished edges read greener than the faces
  K.glass(() => {
    K.prism(clear, rrect(0.072, 0.064, 0.006, 3), { plane: 'xz', a: 0, b: 0.006, side: edge });
    // the riser block, its front sloped where the name plate sits
    const sec = [[-0.023, 0.006], [0.017, 0.006], [0.023, 0.0115], [0.023, 0.0315], [-0.023, 0.0315]];
    K.prism(clear, sec.map(([z, y]) => [z - 0.004, y]), { plane: 'zy', a: -0.027, b: 0.027, side: edge });
  });
  // the printed plate on the slope: black with a gold rule and a little label
  const lab = K.patch('plate', 48, 12, (V) => { V.fill(0x1e1c22); V.box(0, 1, 48, 2, 0xc8a040); V.box(0, 10, 48, 11, 0xc8a040); V.text5('NO.', 4, 8, 0xe6d8a8); V.box(20, 4, 44, 5, 0x6a6470); }, { rough: 0.35 });
  const z0 = 0.013, z1 = 0.019, y0 = 0.0062, y1 = 0.0112;
  K.quadUV(lab, [-0.024, y0, z1 + 0.0004], [0.024, y0, z1 + 0.0004], [0.024, y1, z0 + 0.0004], [-0.024, y1, z0 + 0.0004], [0, 0.64, 0.77]);
  // four clear bumpers underneath
  for (const x of [-0.03, 0.03]) for (const z of [-0.026, 0.026]) K.cyl(rubber(0x3a3a3e), x, -0.0004, z, 0.003, 0.0008, 8, { caps: true });
}
export function standMesh() {
  const m = thingMesh('pack', 'stand', [-0.036, 0, -0.036, 0.036, 0.0315, 0.036], stand);
  m.userData.noRim = true;
  return m;
}
export const STAND_TOP = 0.0315;

// ------------------------------------------------------------------ the packing station (0.29 x 0.14 x 0.16)
function station(K, B) {
  // a stack of blister backing cards, cream with the red header printed, slightly fanned
  const card = K.patch('card', 36, 50, (V) => {
    V.fill(0xeee4cc); V.box(0, 38, 36, 50, 0xc8352a); V.box(0, 37, 36, 38, 0x8a2a22);
    V.box(14, 44, 22, 47, 0x6a2018); // the hang slot
    kana(K, V, 'ガチャ', 18, 39, 0xf2e6c4, { size: 8, align: 'center' });
    V.box(6, 10, 30, 33, 0xf8f2e2); V.frame(6, 10, 30, 33, 0xd8c8a8);
    smallPrint(V, 4, 7, 28, 2, 0x9a8a72);
  }, { rough: 0.8 });
  const cx = -0.085, cz = -0.004;
  for (let k = 0; k < 7; k++) {
    K.at([cx + (k % 3 - 1) * 0.0012, 0.0006 + k * 0.0021, cz + ((k * 5) % 3 - 1) * 0.0012], () => {
      K.box(matte(k % 2 ? 0xe6dcc2 : 0xddd2b8, 0), -0.036, 0, -0.051, 0.036, 0.0018, 0.051);
    }, { ry: (k % 2 ? 0.02 : -0.015) });
  }
  K.at([cx, 0.0006 + 7 * 0.0021, cz], () => K.face(card, '+y', -0.036, -0.051, 0.036, 0.051, 0.0001), { ry: 0.01 });
  // the impulse sealer: a moulded grey base with a teflon strip, the hinged arm with its red grip, the timer dial
  const body = plastic(0x5a6068, 0.18), dark = plastic(0x3a3e44, 0.12), sx0 = 0.0, sx1 = 0.142;
  K.box(body, sx0, 0, -0.07, sx1, 0.042, 0.04, { bevel: 0.008 });
  K.box(body, sx0 + 0.004, 0.042, -0.07, sx1 - 0.004, 0.058, -0.03, { bevel: 0.006 }); // the hinge housing
  K.box(flat(0x7a4a2a, 0.5), sx0 + 0.006, 0.042, -0.026, sx1 - 0.006, 0.0445, -0.014); // the brown PTFE strip over the wire
  K.box(dark, sx0 + 0.002, 0.0, 0.034, sx1 - 0.002, 0.03, 0.056, { bevel: 0.006 }); // the front control lip
  const face = K.patch('panel', 40, 10, (V) => { V.fill(0x2e3238); V.text5('SEAL', 3, 8, 0xd8dce0); for (let i = 0; i < 8; i++) V.px(22 + i * 2, 3, 0xd8dce0); V.box(34, 3, 38, 7, 0x3cae5a); }, { rough: 0.5 });
  K.face(face, '+z', sx0 + 0.006, 0.006, sx1 - 0.006, 0.026, 0.0562);
  K.cyl(plastic(0x2a2c30, 0.2), 0.03, 0.015, 0.056, 0.008, 0.007, 12, { axis: 'z' });
  K.box(plastic(0xe8eaec), 0.0295, 0.019, 0.063, 0.0305, 0.023, 0.0635);
  K.cyl(flat(0x48d86a, 0.4), 0.118, 0.016, 0.056, 0.0028, 0.002, 8, { axis: 'z' });
  // the arm, closed: a bar with its silicone pad and a red moulded grip at the front
  K.part('arm', [0.071, 0.052, -0.05], 'x', () => {
    K.box(paint(0x8a9098, 0.3), sx0 + 0.008, 0.046, -0.056, sx1 - 0.008, 0.06, -0.012, { bevel: 0.004 });
    K.box(rubber(0x8a2a22), sx0 + 0.012, 0.0445, -0.026, sx1 - 0.012, 0.047, -0.014);
    K.box(plastic(0xc8352a, 0.25), sx0 + 0.03, 0.05, -0.016, sx1 - 0.03, 0.068, 0.004, { bevel: 0.007 });
  });
  K.box(rubber(), sx0 + 0.006, -0.0004, -0.066, sx0 + 0.016, 0.001, 0.05);
  K.box(rubber(), sx1 - 0.016, -0.0004, -0.066, sx1 - 0.006, 0.001, 0.05);
  // the mains cord out of the back
  K.tube(rubber(0x26262a), [[0.12, 0.012, -0.07], [0.124, 0.006, -0.077], [0.13, 0.002, -0.079]], 0.0025, 6);
  // a clear box of acrylic stands (lid off, leaning on it), behind the cards
  const bx = -0.115, bz = -0.062, clear = K.tint(0xdceaf0, 80, 0.06), edge = K.tint(0xb8d8e0, 160, 0.08);
  K.glass(() => {
    K.box(clear, bx - 0.024, 0, bz - 0.016, bx + 0.024, 0.002, bz + 0.016);
    for (const [x0, z0, x1, z1] of [[-0.024, -0.016, 0.024, -0.0145], [-0.024, 0.0145, 0.024, 0.016], [-0.024, -0.016, -0.0225, 0.016], [0.0225, -0.016, 0.024, 0.016]]) K.box(edge, bx + x0, 0.002, bz + z0, bx + x1, 0.045, bz + z1);
    for (let k = 0; k < 4; k++) K.box(edge, bx - 0.02, 0.003, bz - 0.012 + k * 0.007, bx + 0.02, 0.04, bz - 0.0075 + k * 0.007);
  });
  const sticker = K.patch('lbl', 24, 10, (V) => { framed(V, 0xf2c21c, 0x2a2420); V.text5('STAND', 12, 8, 0x2a2420, { align: 'center' }); }, { rough: 0.6 });
  K.face(sticker, '+z', bx - 0.017, 0.012, bx + 0.017, 0.026, bz + 0.0162);
  // a roll of tape and a pencil, used
  K.ring(matte(0xd8c69a, 0.1), 0.115, 0, 0.012 + 0.04, 0.019, 0.012, 0.016, 16, { inside: flat(0xb89a6a) });
  void stack; void chrome; void metal; void lighten; void darken;
}
export function stationMesh() {
  const m = thingMesh('pack', 'station', [-0.145, 0, -0.08, 0.145, 0.14, 0.08], station);
  return m;
}

// ------------------------------------------------------------------ the blister bubble
const bubbles = new Map();
/** A PET blister: open back at z = 0 (on the card), a 3 mm flange, walls drafted in, the face's edges rounded over. */
export function bubbleGeometry(w, h, d) {
  const key = [w, h, d].map((v) => v.toFixed(4)).join(':');
  if (bubbles.has(key)) return bubbles.get(key);
  const fl = 0.003, r = Math.min(0.01, w * 0.18, h * 0.18), rr = Math.min(d * 0.45, 0.006), steps = 5, n = 4;
  // rings from the flange's outer edge in, then up the wall and over the rounded front edge
  const rings = [[fl, 0, 0.0002], [0, 0, 0.0002]];
  for (let k = 0; k <= steps; k++) {
    const a = (k / steps) * (Math.PI / 2), inset = 0.0015 + (1 - Math.cos(a)) * rr, z = d - rr + Math.sin(a) * rr;
    rings.push([-inset, z * (k === 0 ? 0 : 1), 0]);
  }
  rings[2][1] = 0.0004;
  const pos = [], idx = [];
  const ring = (grow) => rrect(w + grow * 2, h + grow * 2, Math.max(0.001, r + grow), n);
  const loops = rings.map(([g, z]) => ring(g).map(([x, y]) => [x, y, z]));
  const L = loops[0].length;
  for (const lp of loops) for (const p of lp) pos.push(p[0], p[1], p[2]);
  for (let k = 0; k + 1 < loops.length; k++) for (let i = 0; i < L; i++) {
    const a = k * L + i, b = k * L + ((i + 1) % L), c = (k + 1) * L + ((i + 1) % L), e = (k + 1) * L + i;
    idx.push(a, b, c, a, c, e);
  }
  // the front face
  const front = loops[loops.length - 1], base = pos.length / 3;
  const fz = front[0][2];
  pos.push(0, 0, fz);
  for (let i = 0; i < L; i++) idx.push(base, (loops.length - 1) * L + i, (loops.length - 1) * L + ((i + 1) % L));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.translate(0, h / 2, 0);
  bubbles.set(key, g);
  return g;
}
void sweep;
