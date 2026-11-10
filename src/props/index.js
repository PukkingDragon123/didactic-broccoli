// The low-poly prop models: id -> geometry built with the prop kit (src/props/kit), on its family's atlas page.
// src/world/props.js asks here first and falls back to the old voxel model for a prop that has not been remade.
//   lowPolyGeometry(id) -> BufferGeometry | null     hasModel(id)
// Models live in src/props/models/<data file>.js: `export default { family, models: { id: (K, B) => { ... } } }`
// (K: the kit builder, B: the prop's box in metres, see src/props/bounds.js).
import { Kit } from './kit/kit.js';
import { pageFor } from './kit/page.js';
import { BOUNDS } from './bounds.js';

const MODELS = {};
const cache = new Map();

/** Register a model file. */
export function register(lib) {
  for (const [id, m] of Object.entries(lib.models)) MODELS[id] = { fn: typeof m === 'function' ? m : m.build, box: m.box || null, family: m.family || lib.family };
}
export function hasModel(id) { return !!MODELS[id]; }
export function modelIds() { return Object.keys(MODELS); }

export function boxOf(id) {
  const b = MODELS[id]?.box || BOUNDS[id];
  if (!b) return null;
  return { x0: b[0], y0: b[1], z0: b[2], x1: b[3], y1: b[4], z1: b[5], w: +(b[3] - b[0]).toFixed(4), h: +(b[4] - b[1]).toFixed(4), d: +(b[5] - b[2]).toFixed(4), cx: (b[0] + b[3]) / 2, cz: (b[2] + b[5]) / 2 };
}

export function lowPolyGeometry(id) {
  if (cache.has(id)) return cache.get(id);
  const M = MODELS[id], B = M && boxOf(id);
  let geo = null;
  if (M && B) {
    for (let attempt = 0; attempt < 2 && !geo; attempt++) {
      const page = pageFor(M.family, { fresh: attempt > 0 }), mark = page.mark();
      try {
        const K = new Kit(page, id, B, 1);
        M.fn(K, B);
        geo = K.finish();
      } catch (e) {
        page.rollback(mark);
        if (attempt || !/atlas full/.test(e?.message || '')) { console.warn('prop model failed, using the voxel one:', id, e); break; }
      }
    }
  }
  cache.set(id, geo);
  return geo;
}

const lodCache = new Map();
/** The far level of detail of a remade prop: the same model built coarse (fewer segments, plain edges), on the same atlas page. */
export function lodGeometry(id) {
  if (lodCache.has(id)) return lodCache.get(id);
  const near = lowPolyGeometry(id);
  let geo = near;
  if (near) {
    const page = near.userData.page, mark = page.mark();
    try { const K = new Kit(page, id, boxOf(id), 0); MODELS[id].fn(K, K.B); geo = K.finish(); page.props--; } catch (e) { page.rollback(mark); geo = near; }
  }
  lodCache.set(id, geo);
  return geo;
}
