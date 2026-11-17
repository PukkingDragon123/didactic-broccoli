// Grandpa's walking cane and his round paper fan as modelled, hand-painted pixel-art props (they replace the old voxel
// ones; same origins and sizes):
//   caneMesh(): origin = the grip, the shaft runs down -y (CANE_LEN), the crook curls up and over the front (+z)
//   fanMesh():  origin = the bottom of the handle, the paper disc faces +z
import * as THREE from 'three';

export const CANE_LEN = 0.86;
const h2 = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const q = (v) => { const st = v < 70 ? 4 : v < 150 ? 6 : 8; return Math.max(0, Math.min(255, Math.round(v / st) * st)); };

function canvasTex(w, h, paint) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const o = [0, 0, 0, 255];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    o[3] = 255; paint(i, j, o);
    const p = (j * w + i) * 4; d[p] = q(o[0]); d[p + 1] = q(o[1]); d[p + 2] = q(o[2]); d[p + 3] = o[3];
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  return t;
}

// ------------------------------------------------------------------ the cane: dark varnished wood, brass ferrule, rubber foot
let caneGeo = null, caneMat = null;
function buildCane() {
  // the path: from the grip up and over the crook, then down the shaft to the foot (u runs along it)
  const R = 0.058, pts = [];
  pts.push(new THREE.Vector3(0, -0.045, 2 * R));
  for (let i = 0; i <= 12; i++) { const t = Math.PI - (i / 12) * Math.PI; pts.push(new THREE.Vector3(0, Math.sin(t) * R, R - Math.cos(t) * R)); }
  pts.push(new THREE.Vector3(0, -0.2, -0.002), new THREE.Vector3(0, -0.5, -0.003), new THREE.Vector3(0, -CANE_LEN + 0.03, 0));
  const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const tube = new THREE.TubeGeometry(path, 64, 0.0115, 8, false);
  // the rubber foot and the ferrule above it (u > 0.97 of the canvas)
  const foot = new THREE.CylinderGeometry(0.0145, 0.0135, 0.034, 10, 1, false);
  foot.translate(0, -CANE_LEN + 0.017, 0);
  const fu = foot.attributes.uv;
  for (let i = 0; i < fu.count; i++) fu.setXY(i, 0.975 + fu.getY(i) * 0.024, fu.getX(i));
  const g = mergeGeos([tube, foot]);
  const len = path.getLength();
  const map = canvasTex(512, 16, (i, j, o) => {
    const u = (i + 0.5) / 512, a = (j + 0.5) / 16;
    if (u > 0.974) { // rubber foot: black with moulded rings
      const k = 0.78 + 0.22 * ((i % 3) === 0 ? 0.6 : 1) + (h2(i, j, 4) - 0.5) * 0.1;
      o[0] = 34 * k; o[1] = 30 * k; o[2] = 30 * k; return;
    }
    const along = u * len;
    if (along > len - 0.04 && along < len - 0.026) { // brass ferrule
      const k = 0.8 + 0.5 * Math.max(0, Math.cos((a - 0.3) * Math.PI * 2)) + (h2(i, j, 5) - 0.5) * 0.1;
      o[0] = 176 * k; o[1] = 142 * k; o[2] = 78 * k; return;
    }
    // walnut-dark varnished wood: grain streaks along, the odd knot, the grip worn lighter by his hand
    const grain = vn(i * 0.08, j * 1.2, 7), fine = vn(i * 0.5, j * 2.1, 8);
    let k = 0.78 + 0.24 * grain + 0.1 * (fine - 0.5) + (h2(i, j, 9) - 0.5) * 0.05;
    const knot = Math.hypot((i - 300) * 0.4, (j - 6) * 1.6);
    if (knot < 3) k *= 0.7 + knot * 0.06;
    const grip = along < 0.24 ? Math.max(0, 1 - Math.abs(along - 0.14) / 0.1) : 0;
    let c = [92, 52, 26];
    c = c.map((v, n) => v + ([150, 104, 66][n] - v) * grip * 0.35);
    // varnish highlight: a broken streak along the lit side
    const hl = Math.max(0, Math.cos((a - 0.25) * Math.PI * 2)) ** 6 * (fine > 0.35 ? 1 : 0.4);
    o[0] = c[0] * k + 70 * hl; o[1] = c[1] * k + 50 * hl; o[2] = c[2] * k + 32 * hl;
  });
  return { g, mat: new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0 }) };
}
export function caneMesh() {
  if (!caneGeo) ({ g: caneGeo, mat: caneMat } = buildCane());
  const m = new THREE.Mesh(caneGeo, caneMat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------ the uchiwa: a round paper fan with a goldfish
let fanParts = null;
const FISH = [
  '......rr........',
  '....rrRRrr....rr',
  '..rrRRRRRRr..rRr',
  '.rRwkRRRRRRrrRr.',
  'rRRRRRRRRRRRRr..',
  '.rRRRRRRRRRrrRr.',
  '..rrRRRRRRr..rRr',
  '....rrRRrr....rr',
  '......rr........',
];
function buildFan() {
  const R = 0.092, cy = 0.212, S = 96;
  const disc = new THREE.CircleGeometry(R, 28);
  disc.translate(0, cy, 0);
  const handle = new THREE.CylinderGeometry(0.0055, 0.0065, cy - R + 0.03, 6, 1);
  handle.translate(0, (cy - R + 0.03) / 2, 0);
  const hu = handle.attributes.uv;
  for (let i = 0; i < hu.count; i++) hu.setXY(i, 0.9 + hu.getX(i) * 0.09, 0.02 + hu.getY(i) * 0.06);
  const map = canvasTex(S, S, (i, j, o) => {
    const x = (i + 0.5) / S * 2 - 1, y = 1 - (j + 0.5) / S * 2, r = Math.hypot(x, y);
    if (j > S - 9 && i > S * 0.88) { const k = 0.85 + 0.25 * vn(i * 0.5, j * 0.3, 3); o[0] = 196 * k; o[1] = 156 * k; o[2] = 92 * k; return; } // bamboo handle
    if (r > 1) { o[0] = 230; o[1] = 222; o[2] = 204; return; }
    // washi paper: fibres + the bamboo ribs showing through
    let k = 0.94 + 0.08 * vn(i * 0.35, j * 0.35, 11) + (h2(i, j, 12) - 0.5) * 0.04;
    const ang = Math.atan2(x, y + 1.15), rib = Math.abs(((ang / 0.12) % 1 + 1) % 1 - 0.5);
    if (rib < 0.06 && r < 0.96) k *= 0.88;
    let c = [240, 232, 214];
    // ripples low on the paper
    if (y < -0.25 && Math.abs(Math.sin(x * 7 + y * 3) + Math.sin(y * 13)) < 0.18) c = [138, 172, 214];
    // the goldfish (pixel art)
    const fx = Math.floor((x + 0.55) / 1.1 * 16), fy = Math.floor((0.42 - y) / 0.6 * 9);
    const ch = fy >= 0 && fy < 9 && fx >= 0 && fx < 16 ? FISH[fy][fx] : '.';
    if (ch === 'R') c = [214, 64, 40]; else if (ch === 'r') c = [176, 46, 34]; else if (ch === 'w') c = [250, 246, 236]; else if (ch === 'k') c = [26, 20, 20];
    if (ch === 'R' && h2(fx, fy, 5) > 0.7) c = [236, 120, 64];
    // the blue rim
    if (r > 0.9) { c = [47, 90, 154]; k = 0.9 + 0.12 * vn(i * 0.6, j * 0.6, 14); }
    o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k;
  });
  const paper = new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide });
  return { g: mergeGeos([disc, handle]), mat: paper };
}
export function fanMesh() {
  if (!fanParts) fanParts = buildFan();
  const m = new THREE.Mesh(fanParts.g, fanParts.mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function mergeGeos(gs) {
  const pos = [], nrm = [], uv = [], idx = [];
  let base = 0;
  for (let g of gs) {
    if (!g.index) g = g.toNonIndexed().setIndex([...Array(g.attributes.position.count).keys()]);
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u.getX(i), u.getY(i)); }
    for (const i of g.index.array) idx.push(base + i);
    base += p.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
