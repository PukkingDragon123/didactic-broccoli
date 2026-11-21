// Small worn and carried pieces for the special NPCs (lane regulars, staff kinds): modelled shapes (lathes, lofted
// tubes, bevelled slabs) with their own little hand-painted pixel-art textures (nearest-filtered texels, mipmapped, no
// vertex colours), lit like the people. Used where a piece has to be its own mesh (shown / hidden, recoloured, held);
// what a person always wears is modelled into the person itself (src/people/acc.js, hair.js).
//   paintTex(key, w, h, f)        cached CanvasTexture: f(u, v, i, j) -> [r, g, b] or [r, g, b, a] (u, v 0..1)
//   kitMat(key, w, h, f, o)       cached MeshStandardMaterial over it ({ rough, metal, alpha, side })
//   lathe(prof, mat, o)           [[r, y], ...] bottom to top round +y ({ N, phi0, phiLen }); uv: u round, v along
//   loft(path, mat, o)            [{ c: [x, y, z], rx, rz }] an elliptic tube ({ N, up, caps }); uv: u round, v along
//   slab(shape, depth, mat, o)    [[x, y], ...] outline (+ o.holes) extruded along z with a bevel; uv planar on x / y
//   piece(...meshes)              a group of them, castShadow, no raycast
import * as THREE from 'three';

const hh = (i, j, s = 0) => { let x = Math.imul((i | 0) * 374761393 + (j | 0) * 668265263 + s * 1442695041, 1274126177); x ^= x >>> 13; return ((Math.imul(x, 1103515245) >>> 0) % 1000) / 1000; };
/** Pixel-art quantise (clean steps, closer in the darks). */
const q8 = (v) => { const st = v < 70 ? 4 : v < 150 ? 6 : 8; v = Math.round(v / st) * st; return v < 0 ? 0 : v > 255 ? 255 : v; };
export const tone = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export { hh };

const texCache = new Map();
export function paintTex(key, w, h, f) {
  let t = texCache.get(key);
  if (t) return t;
  if (typeof document === 'undefined') { t = new THREE.Texture(); texCache.set(key, t); return t; }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'), im = g.createImageData(w, h), d = im.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const c = f((i + 0.5) / w, (j + 0.5) / h, i, j), p = (j * w + i) * 4, n = 1 + (hh(i, j, 7) - 0.5) * 0.05; // a touch of texel grain
    d[p] = q8(c[0] * n); d[p + 1] = q8(c[1] * n); d[p + 2] = q8(c[2] * n); d[p + 3] = c[3] ?? 255;
  }
  g.putImageData(im, 0, 0);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  t.wrapS = THREE.RepeatWrapping;
  texCache.set(key, t);
  return t;
}
const matCache = new Map();
export function kitMat(key, w, h, f, { rough = 0.8, metal = 0, alpha = false, side = THREE.FrontSide } = {}) {
  let m = matCache.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({ map: paintTex(key, w, h, f), roughness: rough, metalness: metal, alphaTest: alpha ? 0.5 : 0, side });
  m.name = 'worn:' + key;
  matCache.set(key, m);
  return m;
}

const prep = (g) => { g.computeVertexNormals(); g.computeBoundingSphere(); return g; };
const geoCache = new Map();
const cached = (key, make) => { if (!key) return make(); let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };

export function lathe(prof, mat, { N = 18, phi0 = 0, phiLen = Math.PI * 2, key } = {}) {
  const g = cached(key, () => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-5), y)), N, phi0, phiLen));
  return new THREE.Mesh(g, mat);
}

/** An elliptic tube along a path (sections perpendicular to it), smooth normals, optional end caps. */
export function loft(path, mat, { N = 10, up = [0, 1, 0], caps = true, key } = {}) {
  const g = cached(key, () => {
    const pos = [], uv = [], idx = [], n = path.length, U = new THREE.Vector3(...up);
    const T = new THREE.Vector3(), X = new THREE.Vector3(), Z = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
    let len = 0;
    const L = [0];
    for (let i = 1; i < n; i++) { len += a.fromArray(path[i].c).distanceTo(b.fromArray(path[i - 1].c)); L.push(len); }
    for (let i = 0; i < n; i++) {
      a.fromArray(path[Math.max(0, i - 1)].c); b.fromArray(path[Math.min(n - 1, i + 1)].c);
      T.subVectors(b, a).normalize();
      Z.copy(U).addScaledVector(T, -U.dot(T)); if (Z.lengthSq() < 1e-8) Z.set(0, 0, 1).addScaledVector(T, -T.z); Z.normalize();
      X.crossVectors(T, Z);
      const P = path[i];
      for (let k = 0; k <= N; k++) {
        const t = (k / N) * Math.PI * 2, s = Math.sin(t), c = Math.cos(t);
        pos.push(P.c[0] + X.x * s * P.rx + Z.x * c * P.rz, P.c[1] + X.y * s * P.rx + Z.y * c * P.rz, P.c[2] + X.z * s * P.rx + Z.z * c * P.rz);
        uv.push(k / N, len ? L[i] / len : 0);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < N; k++) {
      const p = i * (N + 1) + k, q = p + N + 1;
      idx.push(p, p + 1, q, p + 1, q + 1, q); // (outward: the sides wind with T x d/dt)
    }
    if (caps) for (const [i, flip] of [[0, true], [n - 1, false]]) {
      if (path[i].rx < 1e-5 && path[i].rz < 1e-5) continue;
      const c = pos.length / 3;
      pos.push(...path[i].c); uv.push(0.5, i ? 1 : 0);
      const base = i * (N + 1);
      for (let k = 0; k < N; k++) flip ? idx.push(c, base + k + 1, base + k) : idx.push(c, base + k, base + k + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return prep(geo);
  });
  return new THREE.Mesh(g, mat);
}

/** A flat shape with thickness and a rounded bevel (pins, patches, leaves, nibs); uv planar over its outline's box. */
export function slab(shape, depth, mat, { bevel = 0.25, holes = [], curve = 10, key } = {}) {
  const g = cached(key, () => {
    const s = new THREE.Shape(shape.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    const bv = depth * bevel;
    const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-5, depth - bv * 2), bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: curve });
    geo.translate(0, 0, -depth / 2 + bv);
    geo.computeBoundingBox();
    const bb = geo.boundingBox, p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x || 1), (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y || 1));
    return prep(geo);
  });
  return new THREE.Mesh(g, mat);
}

/** Group meshes into one worn piece: shadows on, never in the way of raycasts. */
export function piece(...meshes) {
  const g = new THREE.Group();
  for (const m of meshes) { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; g.add(m); }
  return g;
}
/** Points of a circle / ellipse outline (for slabs). */
export const ellipse = (rx, ry, n = 20, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
