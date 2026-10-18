// Geometry/material helpers for architecture: world-scaled UV boxes with pixel-art materials.
import * as THREE from 'three';
import { tex } from './textures.js';

/** BoxGeometry whose UVs are in metres (so textures tile at a constant pixel density). */
export function worldBox(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  }
  uv.needsUpdate = true;
  return g;
}

export function worldPlane(w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  uv.needsUpdate = true;
  return g;
}

const matCache = new Map();
/**
 * Pixel-art PBR material from a texture recipe. The texture repeats once per its natural size in metres.
 * opts: roughness, metalness, bump (scale), color tint, emissive...
 */
export function pixMat(key, opts = {}) {
  const ck = key + JSON.stringify(opts);
  if (matCache.has(ck)) return matCache.get(ck);
  const t = tex(key);
  const map = t.map.clone();
  map.needsUpdate = true;
  // opts.ppm: pixels per metre (default 32, the garage's base density)
  const k = (opts.ppm || 32) / 32;
  map.repeat.set(1 / (t.size[0] * k), 1 / (t.size[1] * k));
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const bump = t.bump.clone();
  bump.needsUpdate = true;
  bump.repeat.copy(map.repeat);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({
    map,
    bumpMap: opts.bump === 0 ? null : bump,
    bumpScale: opts.bump ?? 1.2,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0,
    color: opts.color ?? 0xffffff,
    envMapIntensity: opts.env ?? 1,
  });
  matCache.set(ck, m);
  return m;
}

export function boxMesh(w, h, d, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(worldBox(w, h, d), mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/** Plain colour material (cached). */
export function colMat(color, opts = {}) {
  const ck = 'c' + color + JSON.stringify(opts);
  if (matCache.has(ck)) return matCache.get(ck);
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.7, metalness: opts.metalness ?? 0, ...opts.extra });
  matCache.set(ck, m);
  return m;
}
