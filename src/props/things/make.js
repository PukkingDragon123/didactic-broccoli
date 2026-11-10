// Things that are not prop-library entries (coins, the coin bag, the PCs, Grandpa's cane, the packing gear, what
// people carry on the lane) built with the same prop kit (../kit/kit.js) on their own atlas pages, so they share the
// look, the materials and the merge rules of the props.
//   thingGeometry(family, id, box, build, o) -> BufferGeometry (cached by id; userData.page, .lowPoly, .size)
//   thingMesh(family, id, box, build, o)     -> Mesh drawn with the page's five-slot materials
// box: [x0, y0, z0, x1, y1, z1] in metres (the thing's frame); build(K, B) as for src/props/models/*.js.
// o: { slot: material slot for everything built (2 = the old voxel "metal" slot, for geometry that callers still draw
//      with the voxel material set), crease }
import * as THREE from 'three';
import { Kit } from '../kit/kit.js';
import { pageFor } from '../kit/page.js';

const cache = new Map();

export function boxB(b) {
  return { x0: b[0], y0: b[1], z0: b[2], x1: b[3], y1: b[4], z1: b[5], w: +(b[3] - b[0]).toFixed(4), h: +(b[4] - b[1]).toFixed(4), d: +(b[5] - b[2]).toFixed(4), cx: (b[0] + b[3]) / 2, cz: (b[2] + b[5]) / 2 };
}

export function thingGeometry(family, id, box, build, o = {}) {
  const key = family + ':' + id;
  if (cache.has(key)) return cache.get(key);
  const B = boxB(box);
  let geo = null;
  for (let attempt = 0; attempt < 2 && !geo; attempt++) {
    const page = pageFor(family, { fresh: attempt > 0 }), mark = page.mark();
    try {
      const K = new Kit(page, id, B, 1);
      if (o.crease) K.crease = o.crease;
      if (o.slot != null) K.G.g = o.slot;
      build(K, B);
      geo = K.finish();
    } catch (e) {
      page.rollback(mark);
      if (attempt || !/atlas full/.test(e?.message || '')) { console.warn('thing failed:', key, e); break; }
    }
  }
  if (geo) geo.computeBoundingSphere();
  cache.set(key, geo);
  return geo;
}

export function thingMaterials(geo) { return geo.userData.page.mats(); }

export function thingMesh(family, id, box, build, o = {}) {
  const geo = thingGeometry(family, id, box, build, o);
  const m = new THREE.Mesh(geo, geo.userData.page.mats());
  m.castShadow = o.castShadow ?? true; m.receiveShadow = o.receiveShadow ?? true;
  m.name = o.name || id;
  for (const x of geo.userData.extras || []) { const c = new THREE.Mesh(x.geometry, x.material); c.castShadow = m.castShadow; m.add(c); }
  return m;
}

/** The moving parts of a thing built with K.part(): { body, parts: [{ name, pivot, axis, geometry }] } (or null). */
export function thingRig(geo) { return geo?.userData.rig?.() || null; }
