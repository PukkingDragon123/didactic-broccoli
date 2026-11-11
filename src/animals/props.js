// The prop library's animals (src/world/props.js ids pigeon, pigeon_fly, stray_cat, stray_cat_sit, stray_cat_held) drawn
// with the real models: PROPS[id].mesh hands the town / garage batchers a finished mesh (they instance its parts). The
// birds are the pigeon geometry without its morphs (perched, or gliding with the wings out); the strays are the cat rig
// baked into a static mesh in the pose (a dark tabby: Mikan herself is the calico).
// Imported for its side effect by src/world/Street.js (before the town is built).
import * as THREE from 'three';
import { PROPS } from '../world/props.js';
import { pigeonGeometry, pigeonMaterial } from './pigeon.js';
import { CatRig } from '../world/CatRig.js';

const mk = (geo, mat, o = {}) => { const m = new THREE.Mesh(geo, mat); m.castShadow = o.castShadow ?? true; m.receiveShadow = o.receiveShadow ?? true; return m; };

/** A CatRig posed for a while, its skinning baked into a plain geometry (positions, normals, the face's current UVs). */
const baked = new Map();
export function bakeCat(pose, coat = 'tabby', sec = 2.5) {
  const key = pose + ':' + coat;
  if (baked.has(key)) return baked.get(key);
  const r = new CatRig({ coat, lod: 1 });
  r.setPose(pose === 'stand' ? 'walk' : pose);
  r.glanceT = 99; r.glance = [0, 0]; r.blinkT = 99;
  for (let t = 0; t < sec; t += 1 / 30) r.update(1 / 30, 0);
  r.say(pose === 'held' ? 'wide' : 'open', 'w', 1); r.update(1 / 60, 0);
  r.root.updateMatrixWorld(true);
  r.mesh.skeleton.update();
  const src = r.mesh.geometry, P = src.attributes.position, N = src.attributes.normal, n = P.count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), v = new THREE.Vector3(), w = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(P, i); w.fromBufferAttribute(N, i).multiplyScalar(0.002).add(v);
    r.mesh.applyBoneTransform(i, v); r.mesh.applyBoneTransform(i, w);
    w.sub(v).normalize();
    pos.set([v.x, v.y, v.z], i * 3); nrm.set([w.x, w.y, w.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', r.uv.clone());
  g.setIndex(src.index);
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.size = g.boundingBox.getSize(new THREE.Vector3());
  const out = { geo: g, mat: r.mat };
  baked.set(key, out);
  return out;
}

const set = (id, fn) => { if (PROPS[id]) PROPS[id].mesh = fn; };
set('pigeon', (o) => mk(pigeonGeometry('perched'), pigeonMaterial(), o));
set('pigeon_fly', (o) => mk(pigeonGeometry('flying'), pigeonMaterial(), o));
set('stray_cat', (o) => { const B = bakeCat('stand'); return mk(B.geo, B.mat, o); });
set('stray_cat_sit', (o) => { const B = bakeCat('sit'); return mk(B.geo, B.mat, o); });
set('stray_cat_held', (o) => { const B = bakeCat('held'); return mk(B.geo, B.mat, o); });
