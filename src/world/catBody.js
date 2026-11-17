// The cats: Mikan the calico and the dark tabby stray. Real anatomy from a CC BY cat sculpt ("Calico Cat" by
// AaronRydning, Sketchfab), converted with lowpix and repainted as a detailed pixel-art coat (art/lowpix/animals/make.py:
// public/models/lowpix/animals/<id>.glb), then rigged here to CatRig's skeleton:
//   - the joints were fitted to the model by the build script (node extras, metres; rest pose standing, facing +z,
//     paws on y = 0, +x her left);
//   - every vertex skinned by distance to the spine, tail, leg and ear chains (src/animals/fit.js);
//   - a face that is modelled, not painted: eyeballs (glossy, the iris and pupil a pixel-art frame on the front; the
//     frame swaps for a slit, narrow, normal or round pupil), upper and lower eyelids that close over them (their edges
//     tilted, so the opening is an almond), a jaw that opens, and the open mouth: a lens on the muzzle along the lip
//     line that opens with the jaw onto a painted inside (palate, throat, tongue, fangs), and a tongue that slides out.
// catAssets(coat) -> { geometry (skinned attributes, groups: coat 0, eyes 1, mouth 2), map, frames, eyeUV, J, eyes, rows }
// The models load before anything else is built (top-level await): CatRig stays synchronous.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { skinByChains, mixToward, writeWeights } from '../animals/fit.js';

const MODELS = { calico: 'mikan', tabby: 'stray' };
const RAW = {};
const url = (id) => `${import.meta.env?.BASE_URL ?? '/'}models/lowpix/animals/${id}.glb`;
async function load(id) {
  const g = await new GLTFLoader().loadAsync(url(id));
  let mesh = null;
  g.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  const map = mesh.material.map;
  map.magFilter = THREE.NearestFilter; map.minFilter = THREE.LinearMipmapLinearFilter; map.generateMipmaps = true;
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; map.needsUpdate = true;
  return { geometry: mesh.geometry, map, x: mesh.userData };
}
if (typeof document !== 'undefined') {
  await Promise.all(Object.entries(MODELS).map(async ([coat, id]) => {
    try { RAW[coat] = await load(id); } catch (e) { if (coat === 'calico') console.warn('cat model failed to load', e); }
  }));
}
const BASE = RAW.calico;
const JT = BASE?.x.joints || {};
const j = (k) => JT[k] || [0, 0, 0];

// [bone, parent, rest joint (m)]
export const CAT_BONES = [
  ['body', null, j('body')],
  ['chest', 'body', j('chest')],
  ['head', 'chest', j('head')],
  ['jaw', 'head', j('jaw')],
  ['tongue', 'jaw', BASE?.x.tongue.base || j('jaw')],
  ['earL', 'head', j('earL')], ['earR', 'head', j('earR')],
  ['eyeL', 'head', BASE?.x.eyes.L.c || j('head')], ['eyeR', 'head', BASE?.x.eyes.R.c || j('head')],
  ['lidUL', 'head', BASE?.x.eyes.L.c || j('head')], ['lidDL', 'head', BASE?.x.eyes.L.c || j('head')],
  ['lidUR', 'head', BASE?.x.eyes.R.c || j('head')], ['lidDR', 'head', BASE?.x.eyes.R.c || j('head')],
  ['legFL', 'chest', j('legFL')], ['legFR', 'chest', j('legFR')],
  ['armFL', 'legFL', j('armFL')], ['armFR', 'legFR', j('armFR')],
  ['pawFL', 'armFL', j('pawFL')], ['pawFR', 'armFR', j('pawFR')],
  ['legBL', 'body', j('legBL')], ['legBR', 'body', j('legBR')],
  ['shinBL', 'legBL', j('shinBL')], ['shinBR', 'legBR', j('shinBR')],
  ['pawBL', 'shinBL', j('pawBL')], ['pawBR', 'shinBR', j('pawBR')],
  ['tail0', 'body', j('tail0')], ['tail1', 'tail0', j('tail1')], ['tail2', 'tail1', j('tail2')],
  ['tail3', 'tail2', j('tail3')], ['tail4', 'tail3', j('tail4')],
];
export const TAIL_N = 5;
/** Each tail bone's pitch at rest relative to its parent (the model's tail hangs; CatRig poses a tail that is level
 *  at rest, so it takes these off). Positive = the segment points up from the one before (or from level, backward). */
export const TAIL_REST = (() => {
  const pts = ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', '_tailTip'].map(j);
  const pitch = (a, b) => Math.atan2(b[1] - a[1], -(b[2] - a[2]));
  const out = []; let prev = 0;
  for (let i = 0; i < 5; i++) { const p = pitch(pts[i], pts[i + 1]); out.push(p - prev); prev = p; }
  return out;
})();
export const CAT_JOINT = Object.fromEntries(CAT_BONES.map(([n, , p]) => [n, p]));
/** Where each paw touches the floor at rest (root space). */
export const CAT_FOOT = { FL: j('_footFL'), FR: j('_footFR'), BL: j('_footBL'), BR: j('_footBR') };
/** The face: eye centres, axes, lid hinge axes (head space = rest root space), the iris frames. */
export const CAT_FACE = BASE ? { eyes: BASE.x.eyes, frames: BASE.x.frames, tongue: BASE.x.tongue } : null;
const BI = Object.fromEntries(CAT_BONES.map(([n], i) => [n, i]));

function chains(J) {
  const v = (k, d = [0, 0, 0]) => [J[k][0] + d[0], J[k][1] + d[1], J[k][2] + d[2]];
  const leg = (s, a, m, p, top, r) => ({ pts: [[J[a][0] * 0.4, J[a][1] + 0.035, J[a][2]], J[a], J[m], J[p], J['_foot' + s]], bones: [BI[top], BI[a], BI[m], BI[p]], r, blend: [0.03, 0.016, 0.012] });
  return [
    // the trunk and head: rump -> hips -> chest -> neck -> nose
    { pts: [J._rump, J.body, J.chest, J.head, J._nose], bones: [BI.body, BI.body, BI.chest, BI.head], r: 0.07, blend: [0.03, 0.05, 0.03] },
    { pts: [v('tail0', [0, 0, 0.022]), J.tail0, J.tail1, J.tail2, J.tail3, J.tail4, J._tailTip], bones: [BI.body, BI.tail0, BI.tail1, BI.tail2, BI.tail3, BI.tail4], r: 0.018, blend: 0.02 },
    leg('FL', 'legFL', 'armFL', 'pawFL', 'chest', 0.03), leg('FR', 'legFR', 'armFR', 'pawFR', 'chest', 0.03),
    leg('BL', 'legBL', 'shinBL', 'pawBL', 'body', 0.036), leg('BR', 'legBR', 'shinBR', 'pawBR', 'body', 0.036),
    // the ears: from their base up to the tip, only above the crown
    ...['L', 'R'].map((s) => ({ pts: [v('ear' + s, [0, -0.006, 0]), v('ear' + s, [(s === 'L' ? 1 : -1) * 0.008, 0.03, -0.002])], bones: [BI['ear' + s]], r: 0.012,
      where: (p) => p.y > J['ear' + s][1] - 0.002 && Math.sign(p.x) === (s === 'L' ? 1 : -1) && Math.abs(p.x) > 0.008 })),
  ];
}

const CACHE = {};
export function catAssets(coat = 'calico') {
  if (CACHE[coat]) return CACHE[coat];
  const R = RAW[coat] || BASE;
  const src = R.geometry, x = R.x, J = x.joints;
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) g.setAttribute(k, src.attributes[k]);
  g.setIndex(src.index);
  const pos = g.attributes.position, part = src.attributes._part, jaw = src.attributes._jaw;
  const W = skinByChains(pos, chains(J));
  const P = x.parts, PB = { [P.eyeL]: 'eyeL', [P.eyeR]: 'eyeR', [P.lidUL]: 'lidUL', [P.lidDL]: 'lidDL', [P.lidUR]: 'lidUR', [P.lidDR]: 'lidDR', [P.tongue]: 'tongue' };
  for (let i = 0; i < pos.count; i++) {
    const pt = Math.round(part.getX(i));
    if (PB[pt]) { writeWeights(W.skinIndex, W.skinWeight, i, new Map([[BI[PB[pt]], 1]])); continue; }
    mixToward(W.skinIndex, W.skinWeight, i, BI.jaw, jaw.getX(i));
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(W.skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(W.skinWeight, 4));
  const [e0, e1] = x.eyeTris, [m0, m1] = x.mouthTris || [e1, e1];
  g.addGroup(0, e0 * 3, 0); g.addGroup(e0 * 3, (e1 - e0) * 3, 1);
  if (m1 > m0) g.addGroup(m0 * 3, (m1 - m0) * 3, 2);           // the open mouth, drawn over the lips
  g.computeBoundingBox(); g.computeBoundingSphere();
  // the eyeballs' uv inside their iris frame (0..1), to re-point them at another pupil frame
  const uv = src.attributes.uv, F = x.frames.normal, eyeUV = [];
  for (let i = 0; i < pos.count; i++) {
    const pt = Math.round(part.getX(i));
    if (pt === P.eyeL || pt === P.eyeR) eyeUV.push(i, (uv.getX(i) - F[0]) / F[2], (uv.getY(i) - F[1]) / F[3]);
  }
  CACHE[coat] = { geometry: g, map: R.map, frames: x.frames, eyeUV, J, eyes: x.eyes };
  return CACHE[coat];
}

/** Point the eyeballs at an iris frame ('round' | 'normal' | 'narrow' | 'slit'). */
export function setPupil(uvAttr, A, name) {
  const F = A.frames[name] || A.frames.normal, E = A.eyeUV;
  for (let k = 0; k < E.length; k += 3) uvAttr.setXY(E[k], F[0] + E[k + 1] * F[2], F[1] + E[k + 2] * F[3]);
  uvAttr.needsUpdate = true;
}
