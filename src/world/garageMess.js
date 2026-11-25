// Grandpa's garage shop, built from real models only: the structure and fittings (our own garage kit, art/lowpix/world/
// made/garage_kit.py) and forty years of mess (imported CC0 / CC BY models, lowpix: src/data/props/garage_kit.js).
// Everything is drawn instanced, one InstancedMesh per model (culled per instance with the town's InstanceCuller), and
// the printed things on the walls and boxes are merged into one mesh per print sheet.
//   const mess = new GarageMess(garage)   mess.put(id, x, y, z, { rx, ry, rz, s | sx/sy/sz, block, phys, shadow, mat })
//   mess.print(sheet, key, face, x, y, z, w, h, { tilt })   mess.flush(parent)   (once, after everything is placed)
// put(): a kit piece (gk_*) is placed by its modelling origin (the coordinates garage_kit.py built it in: KIT_BB), any
// other prop by its bottom centre. Rotations are applied z, then x, then y. dbg.garageMess.audit() lists overlaps and
// anything floating among the placements (tools: shots/assets/garage_remake.png was checked with it).
import * as THREE from 'three';
import { propGeometry, hasProp, maskedMaterials } from './props.js';
import { voxelMaterials } from '../voxel/materials.js';
import { InstanceCuller } from './propCull.js';
import { printTexture, printUV, printHas } from '../gfx/printAtlas.js';

// garage_kit.py's BBOX lines (game axes): min x, y, z, max x, y, z of each piece as modelled
export const KIT_BB = {
  gk_joist: [-2.5, 0, -0.025, 2.5, 0.102, 0.025], gk_hbeam: [-2, -0.014, -0.1, 2, 0.246, 0.1], gk_column: [-0.005, 0, -0.11, 0.2, 3.1, 0.11],
  gk_channel: [-2.5, 0, 0, 2.5, 0.1, 0.06], gk_fluoro: [-0.656, -0.118, -0.12, 0.656, 0.08, 0.12], gk_tube: [-0.618, -0.014, -0.0133, 0.618, 0.014, 0.0133],
  gk_conduit: [-0.5, -0.03, 0, 0.5, 0.03, 0.0291], gk_knob: [-0.011, -0.028, -0.0105, 0.5001, 0, 0.014], gk_jbox: [-0.0573, -0.032, -0.0439, 0.063, 0, 0.0439],
  gk_outlet: [-0.0375, 0, 0, 0.0375, 0.11, 0.0385], gk_cordlamp: [0.7425, 0, -4.995, 1.2154, 0.7936, -0.2898], gk_switch: [-0.04, -0.06, 0, 0.04, 0.06, 0.016],
  gk_toggle: [-0.011, -0.018, 0, 0.011, 0.018, 0.018], gk_door: [-0.011, 0, -0.083, 1.2, 2.1, 0.083], gk_doorframe: [-0.66, 0, -0.06, 0.66, 2.16, 0.06],
  gk_window: [-0.86, -0.09, -0.05, 0.86, 0.85, 0.16], gk_curtain: [-0.896, 0.05, -0.0001, 0.896, 0.886, 0.152], gk_lightbox: [-0.825, 0, -0.1407, 0.825, 0.7025, 0.1],
  gk_lanterns: [-3.518, 2.6642, -3.408, -3.502, 2.8699, 2.208], gk_plank: [-0.6, 0, 0, 0.6, 0.205, 0.27], gk_hookpole: [-0.014, 0, -0.0133, 0.077, 2.156, 0.0133],
  gk_bin: [-0.265, 0, -0.265, 0.265, 0.427, 0.265], gk_cordchanger: [-3.9835, 0.0011, -4.865, -3.7351, 0.457, -4.306],
};
// the lanterns' cord over the machine row (garage_kit.py gk_lanterns): tied under the beams at z -3.4 and 2.2, the
// lanterns hang from points 1..7
export const LANTERN_PTS = Array.from({ length: 9 }, (_, i) => [-3.51, 2.866 - Math.sin(i * Math.PI / 8) * 0.16 - (i % 2) * 0.02, -3.4 + 0.7 * i]);
/** Where the converter put a kit piece's origin (the bottom centre of its box), in its modelling coordinates. */
export function kitOrigin(id) {
  const b = KIT_BB[id];
  return b ? new THREE.Vector3((b[0] + b[3]) / 2, b[1], (b[2] + b[5]) / 2) : new THREE.Vector3();
}
/** A single mesh of a kit piece placed by its modelling origin (for the things that move or get clicked). */
export function kitMesh(id, material = null) {
  const geo = propGeometry(id);
  if (!geo) return null;
  const m = new THREE.Mesh(geo, material || maskedMaterials(geo, voxelMaterials('normal')));
  m.userData.propId = id;
  m.castShadow = false; m.receiveShadow = true;
  return m;
}
/** The texture a model is painted with (its first material's map). */
export function propMap(id) {
  const geo = propGeometry(id);
  const i = geo?.groups?.[0]?.materialIndex;
  return i != null ? voxelMaterials('normal')[i]?.map || null : null;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const FACE = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+z': [0, 0, 1], '-z': [0, 0, -1], '+y': [0, 1, 0] };

export class GarageMess {
  constructor(garage) {
    this.garage = garage;
    this.game = garage.game;
    this.sets = new Map(); // key -> { id, mat, shadow, list: [Matrix4] }
    this.placed = []; // { id, box, o } for the audit
    this.prints = new Map(); // sheet -> [geometry]
    this.meshes = new Map(); // key -> InstancedMesh (after flush)
  }

  /** Place a model. y is its bottom (a kit piece: its modelling origin goes to (x, y, z)). */
  put(id, x, y, z, o = {}) {
    if (!hasProp(id)) return null;
    const geo = propGeometry(id);
    if (!geo) return null;
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
    _q.setFromEuler(_e);
    const s = o.s ?? 1;
    _s.set(o.sx ?? s, o.sy ?? s, o.sz ?? s);
    _p.set(x, y, z);
    if (KIT_BB[id]) _p.add(kitOrigin(id).multiply(_s).applyQuaternion(_q));
    const m = new THREE.Matrix4().compose(_p, _q, _s);
    const key = id + (o.mat ? '#' + o.mat.uuid : '') + (o.shadow ? ':s' : '');
    if (!this.sets.has(key)) this.sets.set(key, { id, mat: o.mat || null, shadow: !!o.shadow, list: [] });
    const list = this.sets.get(key).list;
    list.push(m);
    if (!geo.boundingBox) geo.computeBoundingBox();
    const box = geo.boundingBox.clone().applyMatrix4(m);
    this.placed.push({ id, box, o, x, y, z, key, idx: list.length - 1 });
    const pad = o.pad ?? 0.02;
    if (o.block) this.game.player.addObstacle(box.min.x - pad, box.max.x + pad, box.min.z - pad, box.max.z + pad);
    if (o.phys) {
      const c = box.getCenter(new THREE.Vector3()), h = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      this.game.physics.addBox({ center: c, half: h, material: o.material || 'wood' });
    }
    return box;
  }

  /** Height of a placed model at scale s (or its y scale). */
  h(id, s = 1) { const g = propGeometry(id); if (!g) return 0; if (!g.boundingBox) g.computeBoundingBox(); return (g.boundingBox.max.y - g.boundingBox.min.y) * s; }
  size(id, s = 1) { const g = propGeometry(id); if (!g) return new THREE.Vector3(); if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(s); }

  /** Stack models on top of each other from y: [[id, o]...] at (x, z); returns the top. */
  stack(x, y, z, items) {
    for (const [id, o = {}] of items) {
      this.put(id, x + (o.dx || 0), y, z + (o.dz || 0), o);
      y += this.h(id, o.sy ?? o.s ?? 1);
    }
    return y;
  }

  /** A print from a baked sheet (src/gfx/printAtlas.js) flat on a wall or a box side: face = its normal, (x, y, z) its
   *  centre, w x h metres, tilt about the normal; or o.u / o.v (THREE.Vector3) for any orientation. */
  print(sheet, key, face, x, y, z, w, h, o = {}) {
    if (!printHas(sheet, key)) return;
    let U, V;
    if (o.u) { U = o.u.clone(); V = o.v.clone(); }
    else {
      const n = new THREE.Vector3(...FACE[face]);
      if (face === '+y') { U = new THREE.Vector3(1, 0, 0); V = new THREE.Vector3(0, 0, -1); }
      else { U = new THREE.Vector3(0, 1, 0).cross(n); V = new THREE.Vector3(0, 1, 0); }
      const t = o.tilt || 0, c = Math.cos(t), sn = Math.sin(t);
      const U2 = U.clone().multiplyScalar(c).add(V.clone().multiplyScalar(sn)), V2 = V.clone().multiplyScalar(c).sub(U.clone().multiplyScalar(sn));
      U = U2; V = V2;
    }
    const [u0, v0, u1, v1] = printUV(sheet, key);
    const C = new THREE.Vector3(x, y, z), a = U.multiplyScalar(w / 2), b = V.multiplyScalar(h / 2);
    const P = [C.clone().sub(a).sub(b), C.clone().add(a).sub(b), C.clone().add(a).add(b), C.clone().sub(a).add(b)];
    const nrm = a.clone().cross(b).normalize();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap((p) => p.toArray()), 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([...nrm.toArray(), ...nrm.toArray(), ...nrm.toArray(), ...nrm.toArray()], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    if (!this.prints.has(sheet)) this.prints.set(sheet, []);
    this.prints.get(sheet).push(g);
  }

  flush(parent) {
    const town = this.garage.town;
    const cull = town ? (town.cull ||= new InstanceCuller()) : null;
    for (const [key, { id, mat, shadow, list }] of this.sets) {
      const geo = propGeometry(id);
      const im = new THREE.InstancedMesh(geo, mat || maskedMaterials(geo, voxelMaterials('normal')), list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = shadow; im.receiveShadow = !mat || !mat.isMeshBasicMaterial;
      im.computeBoundingSphere();
      im.matrixAutoUpdate = false;
      im.name = 'garageMess:' + id;
      im.userData.noRim = true;
      parent.add(im);
      cull?.add(im);
      this.meshes.set(key, im);
    }
    this.sets.clear();
    for (const [sheet, list] of this.prints) {
      const g = mergeQuads(list);
      const mat = new THREE.MeshStandardMaterial({ map: printTexture(sheet), roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, side: THREE.DoubleSide });
      const m = new THREE.Mesh(g, mat);
      m.name = 'garageMess:prints-' + sheet;
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      m.userData.noRim = true;
      parent.add(m);
    }
    this.prints.clear();
  }

  /** Overlaps between placements (boxes sharing more than `tol` m on every axis, minus what is meant to touch) and
   *  placements resting on nothing (a ray down from their bottom finds nothing within `gap` m). */
  audit({ tol = 0.015, gap = 0.03 } = {}) {
    const P = this.placed, over = [];
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const a = P[i].box, b = P[j].box;
      const dx = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x), dy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y), dz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
      if (dx > tol && dy > tol && dz > tol && !P[i].o.overlapOk && !P[j].o.overlapOk) over.push(`${P[i].id}@${P[i].x.toFixed(2)},${P[i].y.toFixed(2)},${P[i].z.toFixed(2)} x ${P[j].id}@${P[j].x.toFixed(2)},${P[j].y.toFixed(2)},${P[j].z.toFixed(2)} (${dx.toFixed(2)} ${dy.toFixed(2)} ${dz.toFixed(2)})`);
    }
    const scene = this.game.scene, ray = new THREE.Raycaster(), floating = [];
    // every instance back in its buffer (the culler keeps only what the camera sees)
    for (const e of this.garage.town?.cull?.list || []) { if (!e.im.name.startsWith('garageMess:')) continue; e.im.instanceMatrix.array.set(e.base); e.im.count = e.base.length / 16; e.im.instanceMatrix.needsUpdate = true; e.shown = null; e.im.computeBoundingSphere(); }
    scene.updateMatrixWorld(true);
    const meshes = [];
    scene.traverseVisible((o) => { if (o.isMesh && o.geometry && !o.material?.isShaderMaterial && !o.material?.transparent) meshes.push(o); });
    for (const p of P) {
      if (p.o.hang) continue; // fixed to a wall or a ceiling (checked by eye)
      const b = p.box, c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
      let best = Infinity;
      const k = p.o.rim ? 0.46 : 0.3; // (stacked on an open crate: it rests on the rims)
      for (const [fx, fz] of [[0, 0], [k, k], [-k, k], [k, -k], [-k, -k]]) {
        ray.set(new THREE.Vector3(c.x + fx * sz.x, b.min.y + 0.01, c.z + fz * sz.z), new THREE.Vector3(0, -1, 0)); ray.far = 1.5;
        const own = this.meshes.get(p.key);
        const hits = ray.intersectObjects(meshes, false).filter((h) => !(h.object === own && h.instanceId === p.idx));
        if (hits[0]) best = Math.min(best, hits[0].distance - 0.01);
      }
      if (best > gap) floating.push(`${p.id}@${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} gap ${best === Infinity ? '>1.5' : best.toFixed(3)}`);
    }
    return { placed: P.length, overlaps: over, floating };
  }
}

function mergeQuads(list) {
  const pos = [], nrm = [], uv = [], idx = [];
  let base = 0;
  for (const g of list) {
    pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array);
    for (const i of g.index.array) idx.push(base + i);
    base += g.attributes.position.count;
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
