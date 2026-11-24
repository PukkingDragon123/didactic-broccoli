// Tiling surface textures for the town and the garage at the architecture density (128 px/m), made from CC0 Poly Haven
// photos stylised by lowpix (art/lowpix/world_arch/tex/make_tex.py -> public/textures/lowpix/world_arch/<name>.png).
//   surfaceTex(name, tileMetres)  a repeating texture (nearest up close, mipmapped far away) for world-metre UVs:
//                                 asphalt, park_ground, sand, paving (4 m tiles), plywood (3.64 m), detail_* (2 m)
//   detailize(material, kind)     gives a plain vertex-tinted material real surface detail: a neutral grey detail map
//                                 ('paint' | 'metal' | 'wood', mean 0.85, so the colour is lifted to match), in place
//   boxUV(geometry)               world-metre UVs projected along each face's main axis (for geometry that has none)
// Each has an HD version at 256 px/m (art/lowpix/world_arch/hd/make_hd.py, key 'sf_<name>', same metres per repeat:
// src/gfx/hdtex.js), used whenever it exists; the 128 px/m PNGs stay as the fallback.
import * as THREE from 'three';
import { hasHD, hdTexture } from '../gfx/hdtex.js';

const cache = new Map();
const url = (name) => new URL(`${import.meta.env.BASE_URL}textures/lowpix/world_arch/${name}.png`, document.baseURI).href;
const loader = new THREE.TextureLoader();

export function surfaceTex(name, tile = 4) {
  const k = name + '|' + tile;
  if (cache.has(k)) return cache.get(k);
  const t = hasHD('sf_' + name) ? hdTexture('sf_' + name) : loader.load(url(name));
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  t.repeat.set(1 / tile, 1 / tile);
  cache.set(k, t);
  return t;
}

/** Real surface detail for a plain (vertex-tinted) material, in place; returns it. */
export function detailize(m, kind = 'paint') {
  if (!m || m.map || m.userData.detail) return m;
  m.map = surfaceTex('detail_' + kind, 2);
  m.color.multiplyScalar(1 / 0.85);
  m.userData.detail = kind;
  m.needsUpdate = true;
  return m;
}

/** World-metre UVs, projected along each triangle's dominant normal axis (non-indexed or indexed geometry). */
export function boxUV(g) {
  const p = g.attributes.position, n = g.attributes.normal || (g.computeVertexNormals(), g.attributes.normal);
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay >= ax && ay >= az) { uv[i * 2] = x; uv[i * 2 + 1] = z; } else if (ax >= az) { uv[i * 2] = z; uv[i * 2 + 1] = y; } else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
