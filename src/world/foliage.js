// Leaves for the world: hand-pixelled sprig cards from the foliage sheet (public/img/foliage.png, src/voxel/cards.js:
// the same sprigs as the lane's hedges) scattered over leaf masses, so trees, climbers and potted plants read as dense,
// bushy, crisp foliage instead of painted balls or green boxes.
//
//   foliageMaterial({ fog })               the alpha-cut card material (shared; wind sway; fog = fog factor scale)
//   foliageTick(dt)                         advance the wind (Town.update calls it)
//   treeInstances(kind, parent, list, o)    lowpix trees (art/lowpix/world_arch/_src/trees.py: the wood and the dark
//       inner crown) + their sprig crowns (src/data/treeCrowns.json), instanced: list = [{ x, y, z, ry, s }],
//       o = { cast, lod (0 near / 1 far: fewer, bigger sprigs), fog }; kinds keyaki | sakura | pine | kaki.
//       Returns the meshes added, or null if the wood model is not loaded (the caller draws its fallback).
//   new Leaves()                            a batch of world-space sprigs for one area (one draw call):
//       leaves.bush(m4, c, r, o)            a leaf mass (ellipsoid c = [x,y,z], r = [rx,ry,rz]) in the frame m4
//       leaves.ivy(m4, x0, x1, y0, y1, o)   ivy / creeper climbing a wall plane (local z = 0, facing +z)
//       leaves.climber(m4, x, y0, y1, z, o) sprigs up a string or post (morning glory, loofah, bitter melon)
//       leaves.hang(m4, x0, x1, y, z, o)    trailing sprigs hanging down from a ledge, trellis or balcony
//       leaves.build(parent, { cast })      -> Mesh | null
//   o: { kind (a CELLS name), mix: [kind2, share], size (m), density, seed, tint: [r,g,b], shade }
import * as THREE from 'three';
import { leafTexture, patchCard, cellUV, CELLS } from '../voxel/cards.js';
import { archInstances } from './archModels.js';
import CROWNS from '../data/treeCrowns.json';

// ------------------------------------------------------------------ material
const WIND = { value: 0 };
const MATS = new Map();
export function foliageTick(dt) { WIND.value += dt; }

export function foliageMaterial({ fog = 1 } = {}) {
  const key = 'f' + fog;
  if (MATS.has(key)) return MATS.get(key);
  const m = new THREE.MeshStandardMaterial({ map: leafTexture(), vertexColors: true, roughness: 0.85, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    patchCard(sh);
    sh.uniforms.uWind = WIND;
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'uniform float uWind;\nvoid main() {')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  {
    #ifdef USE_INSTANCING
      vec3 wp = (instanceMatrix * vec4(transformed, 1.0)).xyz;
    #else
      vec3 wp = transformed;
    #endif
    float sway = max(vdet.z, 0.0) * 0.035;
    transformed.x += sin(uWind * 1.6 + wp.x * 0.9 + wp.y * 0.6) * sway;
    transformed.z += cos(uWind * 1.25 + wp.z * 0.8 + wp.y * 0.5) * sway;
    transformed.y += sin(uWind * 2.1 + wp.x * 1.3) * sway * 0.4;
  }`);
    if (fog !== 1) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>',
        THREE.ShaderChunk.fog_fragment.replace('smoothstep( fogNear, fogFar, vFogDepth )', `smoothstep( fogNear, fogFar, vFogDepth ) * ${fog.toFixed(2)}`));
    }
  };
  m.customProgramCacheKey = () => 'foliage' + fog;
  m.name = 'foliage';
  MATS.set(key, m);
  return m;
}

// ------------------------------------------------------------------ helpers
function rng(seed) {
  let s = (Math.floor(seed * 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _a = V();

/** One sprig: foot point, grow direction (up), blade direction (side), lighting normal, size, shade, kind. */
function card(out, foot, up, side, n, size, shade, kind, tint) {
  out.push({ foot: foot.clone(), up: up.clone().normalize(), side: side.clone().normalize(), n: n.clone().normalize(), size, shade, kind, tint });
}
/** A blade direction across `up`, turned at random about it. */
function bladeAcross(up, r) {
  const a = r() * Math.PI * 2;
  _a.set(Math.cos(a), (r() - 0.5) * 0.6, Math.sin(a));
  const s = V().crossVectors(up, _a);
  if (s.lengthSq() < 1e-4) s.set(1, 0, 0);
  return s.normalize();
}
function pickKind(o, r) { return o.mix && r() < o.mix[1] ? o.mix[0] : o.kind; }

/** Quads for a list of sprigs: position, normal, colour (shade x tint, the foot a touch darker), uv + vdet (uv, sway). */
function quads(cards) {
  const n = cards.length, pos = new Float32Array(n * 12), nrm = new Float32Array(n * 12), col = new Float32Array(n * 12);
  const uv = new Float32Array(n * 8), vd = new Float32Array(n * 12), idx = new Uint32Array(n * 6);
  cards.forEach((c, i) => {
    const [u0, v0, u1, v1] = cellUV(c.kind);
    const h = c.size, w = c.size * 0.5, f = c.foot, s = c.side, u = c.up;
    const P = [
      [f.x - s.x * w, f.y - s.y * w, f.z - s.z * w], [f.x + s.x * w, f.y + s.y * w, f.z + s.z * w],
      [f.x + s.x * w + u.x * h, f.y + s.y * w + u.y * h, f.z + s.z * w + u.z * h], [f.x - s.x * w + u.x * h, f.y - s.y * w + u.y * h, f.z - s.z * w + u.z * h],
    ];
    const UV = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const t = c.tint || [1, 1, 1];
    for (let k = 0; k < 4; k++) {
      const o = (i * 4 + k) * 3;
      pos[o] = P[k][0]; pos[o + 1] = P[k][1]; pos[o + 2] = P[k][2];
      nrm[o] = c.n.x; nrm[o + 1] = c.n.y; nrm[o + 2] = c.n.z;
      const sh = c.shade * (k < 2 ? 0.84 : 1);
      col[o] = sh * t[0]; col[o + 1] = sh * t[1]; col[o + 2] = sh * t[2];
      uv[(i * 4 + k) * 2] = UV[k][0]; uv[(i * 4 + k) * 2 + 1] = UV[k][1];
      vd[o] = UV[k][0]; vd[o + 1] = UV[k][1]; vd[o + 2] = k < 2 ? 0.15 : 1;
    }
    const b = i * 4, j = i * 6;
    idx[j] = b; idx[j + 1] = b + 1; idx[j + 2] = b + 2; idx[j + 3] = b; idx[j + 4] = b + 2; idx[j + 5] = b + 3;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('vdet', new THREE.BufferAttribute(vd, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------------ leaf masses
/**
 * Sprigs over a set of ellipsoid leaf masses (a crown): a full outer layer (feet tucked inside, tips out), a sparser
 * inner layer in shade, fewer underneath, none buried inside a neighbouring mass. Each sprig is lit with the soft
 * normal of the whole crown, so the crown shades as one form (like the hedges).
 */
function scatterCrown(out, clumps, o, m4 = null) {
  const r = rng(o.seed ?? 7), size = o.size ?? CELLS[o.kind]?.[2] ?? 0.4, dens = o.density ?? 1, tint = o.tint;
  // the crown's centre and half-extents
  const lo = V(Infinity, Infinity, Infinity), hi = V(-Infinity, -Infinity, -Infinity);
  for (const [x, y, z, rx, ry, rz] of clumps) { lo.min(_a.set(x - rx, y - ry, z - rz)); hi.max(_a.set(x + rx, y + ry, z + rz)); }
  const C = lo.clone().add(hi).multiplyScalar(0.5), R = hi.clone().sub(lo).multiplyScalar(0.5).max(V(0.05, 0.05, 0.05));
  const inside = (p, skip) => clumps.some((c, j) => j !== skip && ((p.x - c[0]) / c[3]) ** 2 + ((p.y - c[1]) / c[4]) ** 2 + ((p.z - c[2]) / c[5]) ** 2 < 0.62);
  const rot = m4 ? new THREE.Matrix3().setFromMatrix4(m4) : null;
  clumps.forEach(([x, y, z, rx, ry, rz], ci) => {
    const p = (a, b) => (a * b) ** 1.6;
    const area = 4 * Math.PI * ((p(rx, ry) + p(rx, rz) + p(ry, rz)) / 3) ** (1 / 1.6);
    const n = Math.max(4, Math.round(area * dens / (size * size * 0.42)));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, phi = Math.acos(1 - 2 * t), th = k * 2.39996 + r() * 0.9;
      const d = V(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
      d.x += (r() - 0.5) * 0.25; d.y += (r() - 0.5) * 0.25; d.z += (r() - 0.5) * 0.25; d.normalize();
      const innerL = r() < 0.2;
      const shell = innerL ? 0.55 + r() * 0.2 : 0.84 + r() * 0.16;
      const pt = V(x + d.x * rx * shell, y + d.y * ry * shell, z + d.z * rz * shell);
      if (!innerL && inside(pt, ci)) continue;
      if (d.y < -0.45 && r() < 0.45) continue; // thinner underneath
      const outN = V(d.x / rx, d.y / ry, d.z / rz).normalize();
      // grow direction: outwards and up; underneath the sprigs lean out and hang a little
      let up;
      if (o.flat) up = V(outN.x * 0.9, Math.max(outN.y, 0) * 0.5 + 0.45, outN.z * 0.9);
      else if (outN.y < -0.3) up = V(outN.x * 0.9, outN.y * 0.4 + 0.1, outN.z * 0.9);
      else up = V(outN.x * 0.85, outN.y * 0.6 + 0.5, outN.z * 0.85);
      up.x += (r() - 0.5) * 0.5; up.y += (r() - 0.5) * 0.3; up.z += (r() - 0.5) * 0.5; up.normalize();
      const sz = size * (0.8 + r() * 0.45) * (innerL ? 0.85 : 1);
      const foot = pt.clone().addScaledVector(up, -sz * (innerL ? 0.4 : 0.32));
      const soft = V((pt.x - C.x) / R.x, (pt.y - C.y) / R.y, (pt.z - C.z) / R.z).normalize().multiplyScalar(0.65).addScaledVector(outN, 0.35);
      soft.y += 0.3;
      const hgt = Math.min(1, Math.max(0, 0.5 + (pt.y - C.y) / (2 * R.y)));
      let shade = (o.shade ?? 1) * (0.66 + hgt * 0.3 + r() * 0.08) * (innerL ? 0.72 : 1) * (outN.y < -0.3 ? 0.82 : 1);
      shade = Math.min(1.05, shade);
      const side = bladeAcross(up, r);
      if (m4) { foot.applyMatrix4(m4); up.applyMatrix3(rot); side.applyMatrix3(rot); soft.applyMatrix3(rot); }
      card(out, foot, up, side, soft, sz, shade, pickKind(o, r), tint);
    }
  });
}

// ------------------------------------------------------------------ trees
const TREE_GEO = new Map();
export function treeCardGeometry(kind, lod = 0) {
  const key = kind + lod;
  if (TREE_GEO.has(key)) return TREE_GEO.get(key);
  const c = CROWNS[kind];
  if (!c) return null;
  const cards = [];
  scatterCrown(cards, c.clumps, { kind: c.leaf, mix: c.mix, size: c.size * (lod ? 1.7 : 1), density: c.density * (lod ? 0.62 : 1), seed: kind.length * 13 + lod, tint: c.tint, flat: c.flat });
  const g = quads(cards);
  TREE_GEO.set(key, g);
  return g;
}

export function treeInstances(kind, parent, list, { cast = false, lod = 0, fog = 1 } = {}) {
  if (!list.length) return [];
  const wood = archInstances('tree_' + kind, parent, list, { cast });
  if (!wood) return null;
  const g = treeCardGeometry(kind, lod);
  if (!g) return wood;
  const im = new THREE.InstancedMesh(g, foliageMaterial({ fog }), list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), sc = V();
  list.forEach((it, i) => im.setMatrixAt(i, m4.compose(V(it.x, it.y ?? 0, it.z), q.setFromAxisAngle(up, it.ry ?? 0), sc.setScalar(it.s ?? 1))));
  im.castShadow = cast; im.receiveShadow = true;
  im.computeBoundingSphere();
  im.name = 'leaves:' + kind;
  im.matrixAutoUpdate = false;
  im.userData.noRim = true;
  parent.add(im);
  return [...wood, im];
}

// ------------------------------------------------------------------ batches of sprigs (bushes, ivy, climbers)
export class Leaves {
  constructor(seed = 1) { this.cards = []; this.seed = seed; this.n = 0; }
  _r(o) { return rng((o.seed ?? 0) * 7.13 + this.seed * 3.7 + ++this.n * 0.618); }

  /** A leaf mass: an ellipsoid (or a list of them: o.clumps) in the frame m4 (a Matrix4 or null = world). */
  bush(m4, c, r, o = {}) {
    const clumps = o.clumps || [[c[0], c[1], c[2], r[0], r[1], r[2] ?? r[0]]];
    scatterCrown(this.cards, clumps, { ...o, seed: (o.seed ?? 0) + this.seed * 11 + ++this.n }, m4);
    return this;
  }

  /** Ivy climbing a wall from the ground (local frame: the wall is the plane z = 0 facing +z; x0..x1 wide, y0..y1). */
  ivy(m4, x0, x1, y0, y1, o = {}) {
    const r = this._r(o), kind = o.kind || 'ivy', size = o.size ?? 0.36, rot = m4 ? new THREE.Matrix3().setFromMatrix4(m4) : null;
    const step = size * 0.42 / Math.sqrt(o.density ?? 1);
    // a ragged top edge: two waves of noise, tallest where the ivy found the wall first
    const ph1 = r() * 6, ph2 = r() * 6, w = x1 - x0;
    const top = (x) => y0 + (y1 - y0) * Math.min(1, 0.55 + 0.3 * Math.sin(ph1 + x / Math.max(0.6, w) * 5.1) + 0.2 * Math.sin(ph2 + x * 3.3));
    for (let x = x0; x <= x1; x += step) for (let y = y0; y < y1; y += step) {
      const tx = x + (r() - 0.5) * step, ty = y + (r() - 0.5) * step, tp = top(tx);
      if (ty > tp) continue;
      const edge = (tp - ty) / Math.max(0.2, tp - y0); // 0 at the top edge
      if (r() > 0.55 + edge * 0.6) continue;
      const up = V((r() - 0.5) * 0.7, 1, 0.12 + r() * 0.35).normalize();
      if (r() < 0.25) up.set((r() - 0.5) * 1.6, 0.6, 0.15).normalize(); // runners heading sideways
      const side = V(1, (r() - 0.5) * 0.5, 0);
      side.addScaledVector(up, -side.dot(up)).normalize();
      const foot = V(tx, ty - size * 0.3, 0.015 + r() * 0.06);
      const n = V((r() - 0.5) * 0.4, 0.35, 1).normalize();
      const shade = (o.shade ?? 1) * (0.68 + Math.min(1, (ty - y0) / Math.max(0.5, y1 - y0)) * 0.22 + r() * 0.12) * (edge > 0.6 ? 0.9 : 1);
      const sz = size * (0.75 + r() * 0.5);
      if (m4) { foot.applyMatrix4(m4); up.applyMatrix3(rot); side.applyMatrix3(rot); n.applyMatrix3(rot); }
      card(this.cards, foot, up, side, n, sz, shade, pickKind({ kind, mix: o.mix }, r), o.tint);
    }
    return this;
  }

  /** Sprigs up a string or post from y0 to y1 at (x, z), facing +z (local frame m4). */
  climber(m4, x, y0, y1, z, o = {}) {
    const r = this._r(o), kind = o.kind || 'asagao', size = o.size ?? 0.34, rot = m4 ? new THREE.Matrix3().setFromMatrix4(m4) : null;
    const step = size * 0.38 / Math.sqrt(o.density ?? 1), reach = o.reach ?? 0.08;
    for (let y = y0; y < y1 - size * 0.4; y += step * (0.7 + r() * 0.6)) {
      const lean = (r() - 0.5) * 1.2;
      const up = V(lean, 1, (r() - 0.3) * 0.5).normalize();
      const side = V(1, -lean * 0.3, (r() - 0.5) * 0.6).normalize();
      const foot = V(x + (r() - 0.5) * reach, y, z + (r() - 0.2) * reach);
      const n = V((r() - 0.5) * 0.5, 0.3, 1).normalize();
      const shade = (o.shade ?? 1) * (0.72 + (y - y0) / Math.max(0.5, y1 - y0) * 0.22 + r() * 0.1);
      if (m4) { foot.applyMatrix4(m4); up.applyMatrix3(rot); side.applyMatrix3(rot); n.applyMatrix3(rot); }
      card(this.cards, foot, up, side, n, size * (0.8 + r() * 0.4), shade, pickKind({ kind, mix: o.mix }, r), o.tint);
    }
    return this;
  }

  /** Trailing sprigs hanging down from a ledge along x0..x1 at height y, the ledge's front at z (local frame m4). */
  hang(m4, x0, x1, y, z, o = {}) {
    const r = this._r(o), kind = o.kind || 'pothos', size = o.size ?? 0.34, rot = m4 ? new THREE.Matrix3().setFromMatrix4(m4) : null;
    const step = size * 0.4 / Math.sqrt(o.density ?? 1), drop = o.drop ?? 0.8;
    for (let x = x0; x <= x1; x += step) {
      const len = drop * (0.3 + r() * 0.7);
      for (let d = 0; d < len; d += size * 0.5) {
        const up = V((r() - 0.5) * 0.4, -1, 0.15 + r() * 0.3).normalize();
        const side = V(1, 0, (r() - 0.5) * 0.4).normalize();
        const foot = V(x + (r() - 0.5) * step, y + size * 0.15 - d, z + 0.02 + r() * 0.05);
        const n = V((r() - 0.5) * 0.4, 0.2, 1).normalize();
        const shade = (o.shade ?? 1) * (0.92 - d / Math.max(0.3, drop) * 0.25 + r() * 0.1);
        if (m4) { foot.applyMatrix4(m4); up.applyMatrix3(rot); side.applyMatrix3(rot); n.applyMatrix3(rot); }
        card(this.cards, foot, up, side, n, size * (0.8 + r() * 0.4), shade, pickKind({ kind, mix: o.mix }, r), o.tint);
      }
    }
    return this;
  }

  build(parent, { cast = false, fog = 1, name = 'leaves' } = {}) {
    if (!this.cards.length) return null;
    const mesh = new THREE.Mesh(quads(this.cards), foliageMaterial({ fog }));
    mesh.castShadow = cast; mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.name = name;
    mesh.userData.noRim = true;
    parent.add(mesh);
    this.cards = [];
    return mesh;
  }
}

/** A terracotta (or glazed) flower pot as a lathe: a rolled rim, a tapered body, a foot band (local frame, base at y). */
export function potGeometry(rTop = 0.13, h = 0.2, seg = 10) {
  const pts = [[0, 0], [rTop * 0.68, 0], [rTop * 0.7, h * 0.08], [rTop * 0.88, h * 0.82], [rTop * 1.04, h * 0.84], [rTop * 1.06, h], [rTop * 0.9, h], [rTop * 0.86, h * 0.9], [0, h * 0.9]];
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
}
