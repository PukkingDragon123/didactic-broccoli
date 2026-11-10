// The yokai's models, built ahead of time (performance): a worker (src/npc/yokaiWorker.js) sculpts them in the background
// a few seconds after boot, so the first one to step out at nightfall costs nothing to build. Until a model has arrived
// (or if workers are unavailable) yokaiGeometry() builds it on the spot, as before.
//   prebuildYokai()          start (once; no-op when already started)
//   yokaiGeometry(kind)      the cached geometry (kappa | kitsune | kitsuneTail | tanuki | kasa)
import * as THREE from 'three';
import { YOKAI } from '../peoplekit/yokai.js';

const cache = new Map();
let worker = null;

/** Rebuild a kit geometry from the worker's arrays (the same thing YOKAI[kind]() returns). */
function fromWorker(m) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(m.uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(m.col, 3));
  g.setIndex(new THREE.BufferAttribute(m.index, 1));
  for (const [s, c, i] of m.groups) g.addGroup(s, c, i);
  g.computeBoundingSphere(); g.computeBoundingBox();
  g.userData.kit = true;
  if (m.extra.length) g.userData.extra = m.extra.map((x) => {
    const cv = document.createElement('canvas'); cv.width = x.w; cv.height = x.h;
    if (x.data) cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(x.data.buffer || x.data), x.w, x.h), 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return { key: x.key, tex, rough: x.rough, metal: x.metal };
  });
  return g;
}

export function prebuildYokai(kinds = ['kasa', 'tanuki', 'kitsune', 'kitsuneTail', 'kappa']) {
  if (worker || typeof Worker === 'undefined') return;
  try {
    worker = new Worker(new URL('./yokaiWorker.js', import.meta.url), { type: 'module' });
  } catch (e) { worker = null; return; }
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.error) { console.warn('yokai prebuild:', m.kind, m.error); return; }
    if (!cache.has(m.kind)) cache.set(m.kind, fromWorker(m));
  };
  worker.onerror = (e) => { console.warn('yokai prebuild worker failed', e.message || e); };
  worker.postMessage({ kinds: kinds.filter((k) => !cache.has(k)) });
}

export function yokaiGeometry(kind) {
  let g = cache.get(kind);
  if (!g) { g = YOKAI[kind](); cache.set(kind, g); }
  return g;
}
