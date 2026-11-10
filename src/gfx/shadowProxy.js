// Shadow-only stand-ins (performance). The town and the garage are merged per material for the colour pass, which still
// leaves 50-odd separate meshes to draw into the sun's shadow map every time it is redrawn. Here the static, opaque
// casters among them are merged once more, by position only, into a few spatial chunks: the shadow map draws a
// handful of chunks (only those its frustum touches) instead of every material, and the originals stop casting.
// The chunks are never drawn in the colour passes: the renderer shows them only while it draws shadow maps
// (Renderer.addShadowProxy). Alpha-cut materials (foliage, cut-out boards) keep casting themselves: a stand-in has no
// texture to cut with.
//   shadowProxy(meshes, renderer, parent, { cell }) -> the chunk meshes (added to parent); the meshes stop casting
import * as THREE from 'three';

const MATS = new Map();
const matFor = (side, shadowSide) => { const k = side + '|' + shadowSide; if (!MATS.has(k)) { const m = new THREE.MeshBasicMaterial({ side, colorWrite: false }); m.shadowSide = shadowSide; m.name = 'shadow-proxy'; MATS.set(k, m); } return MATS.get(k); };
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

/** Can this mesh's shadow be drawn by a plain position-only stand-in? (static, opaque, not alpha-cut, not skinned) */
export function proxyable(m) {
  const M = m.material;
  return m.isMesh && !m.isInstancedMesh && !m.isSkinnedMesh && m.castShadow && !Array.isArray(M) && !M.transparent && !(M.alphaTest > 0) && !M.alphaMap
    && m.matrixAutoUpdate === false && !m.geometry.morphAttributes?.position && !!m.geometry.attributes.position;
}

export function shadowProxy(meshes, renderer, parent, { cell = 12, name = 'shadow' } = {}) {
  const chunks = new Map();
  for (const m of meshes) {
    if (!proxyable(m)) continue;
    m.updateWorldMatrix(true, false);
    const W = m.matrixWorld, P = m.geometry.attributes.position, I = m.geometry.index;
    const r = m.geometry.drawRange, n = I ? I.count : P.count;
    const i0 = Math.max(0, r.start), i1 = Math.min(n, r.start + r.count);
    const side = m.material.side, sh = m.material.shadowSide ?? null;
    for (let i = i0; i + 2 < i1; i += 3) {
      const ia = I ? I.getX(i) : i, ib = I ? I.getX(i + 1) : i + 1, ic = I ? I.getX(i + 2) : i + 2;
      _a.fromBufferAttribute(P, ia).applyMatrix4(W); _b.fromBufferAttribute(P, ib).applyMatrix4(W); _c.fromBufferAttribute(P, ic).applyMatrix4(W);
      const key = Math.floor((_a.x + _b.x + _c.x) / 3 / cell) + ',' + Math.floor((_a.z + _b.z + _c.z) / 3 / cell) + ',' + side + ',' + sh;
      let L = chunks.get(key);
      if (!L) chunks.set(key, L = { side, sh, p: [] });
      L.p.push(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z, _c.x, _c.y, _c.z);
    }
    m.castShadow = false;
  }
  const out = [];
  for (const [key, L] of chunks) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L.p), 3));
    g.computeBoundingSphere();
    const s = new THREE.Mesh(g, matFor(L.side, L.sh));
    s.name = `${name}-proxy:${key}`;
    s.castShadow = true; s.receiveShadow = false;
    s.matrixAutoUpdate = false;
    s.raycast = () => {}; // (never picked)
    parent.add(s);
    renderer?.addShadowProxy?.(s);
    out.push(s);
  }
  return out;
}
