// Leaves for the prop models, the town's way (src/town/foliage.js): crowns of alpha-cut sprig cards over a dark core,
// shaded as one soft mass, instead of faceted blobs. The cards live on the town's shared foliage materials, not on the
// prop's atlas page, so they ride along as extra meshes: K.finish() puts them in geo.userData.extras
// ([{ geometry, material }]) and propMesh() hangs them under the prop's mesh.
//   leaves(K, (t, F) => { F.shrub(t, x, y, z, r, 'small'); F.crown(t, x, y, z, rx, ry, rz, { kind: 'pine' }); })
// Positions are in the prop's frame (the current K.at() frame applies). Anything else the town helpers draw (a
// hedge's kerb, its stems) is dropped: the prop models those itself.
import * as THREE from 'three';
import { Batch } from '../../town/batch.js';
import * as F from '../../town/foliage.js';

const DROP = new THREE.MeshBasicMaterial();
const M = new Proxy({}, { get: () => DROP });

export function leaves(K, fn) {
  if (!K.leafBatch) {
    K.leafBatch = new Batch();
    (K.onFinish ||= []).push((geo) => {
      const out = [];
      for (const [mat, L] of K.leafBatch.lists) {
        if (mat === DROP || !L.p.length) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(L.p, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(L.n, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(L.t, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(L.c, 3));
        g.computeBoundingSphere();
        out.push({ geometry: g, material: mat });
        geo.userData.tris += L.p.length / 9;
      }
      geo.userData.extras = out;
      K.leafBatch = null;
    });
  }
  const B = K.leafBatch;
  if (K.G.m) B.pushM(K.G.m);
  try { fn({ B, m: M }, F); } finally { if (K.G.m) B.pop(); }
  return K;
}
export { F };
