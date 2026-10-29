// The giant steel electricity transmission tower (鉄塔) on the hill beyond the railway, east-south-east of the lane:
// a ~61 m double-circuit lattice pylon on a 13 m rise, clearly visible down the lane past the east underpass and
// over the embankment from the park. Cross-arms with insulator strings, sagging conductors running north and south
// to two more (hazier) towers and on toward the horizon, a chain-link fence with warning plates at its base and —
// the joke — somebody's tiny makeshift home (platform, shack, ladder, laundry, TV aerial) built inside the lattice.
//
// Everything is static and merged: one steel mesh shared by the three towers (instanced), one mesh for the hut /
// fence / plates, one for the porcelain insulators, one LineSegments for all the wires, the hill (one mesh) and its
// trees (instanced). Distant things are given a lighter fog (FOG_K) so the silhouette still reads at 70–100 m.
//   buildPylon(town) -> { group, main: { x, z, base } }
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash2 } from '../core/util.js';

export const PYLON = { x: 68, z: -24, base: 13 }; // the main tower (world x/z, height of the ground under it)
const NEIGHBOURS = [{ x: 77, z: 52, base: 0, ry: 0.12 }, { x: 59, z: -102, base: 0, ry: 0.1 }];
const HILL = { x: 70, z: -28, r: 38, top: 13, flat: 9 };
const FOG_K = 0.5;

// tower shape (local metres): body half-width by height, panel levels, cross-arms
const LEVELS = [0, 4.6, 8.8, 12.6, 16, 19.2, 22.4, 25.4, 28.4, 31.4, 34.4, 37.6, 40.6, 44, 47.4, 51, 54.4, 57.4];
const ARMS = [{ y: 40.6, len: 6.4 }, { y: 47.4, len: 7.2 }, { y: 54.4, len: 6.4 }];
const PEAK = 61.2;
const hw = (y) => (y <= 30 ? 5.2 - (5.2 - 2.0) * (y / 30) : 2.0 - (y - 30) * 0.022);

/** Patch a material's fog to FOG_K strength (keeps the tunnel-darkness patch in the shared chunk). */
function lightFog(m, key) {
  m.onBeforeCompile = (sh) => {
    const chunk = THREE.ShaderChunk.fog_fragment.replace('smoothstep( fogNear, fogFar, vFogDepth )', `smoothstep( fogNear, fogFar, vFogDepth ) * ${FOG_K.toFixed(2)}`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', chunk);
  };
  m.customProgramCacheKey = () => 'lightfog-' + key;
  return m;
}

/** Tiny geometry collector: boxes and beams with vertex colours, merged at the end. */
class Parts {
  constructor() { this.list = []; }
  col(g, tint) {
    const n = g.attributes.position.count, c = new THREE.Color(tint), a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('uv');
    this.list.push(g);
    return g;
  }
  /** Box with its bottom at y. */
  box(w, h, d, x, y, z, tint, ry = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y + h / 2, z);
    return this.col(g, tint);
  }
  /** Square-section member between two points. */
  beam(a, b, t, tint) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    if (len < 1e-4) return null;
    const g = new THREE.BoxGeometry(t, t, len);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return this.col(g, tint);
  }
  merge() { const g = this.list.length ? mergeGeometries(this.list, false) : null; for (const x of this.list) x.dispose(); this.list = []; if (g) g.computeBoundingSphere(); return g; }
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STEEL = 0x9aa2a8, STEEL_D = 0x7e868c;

/** The lattice tower itself (local, ground at y=0, line along z, arms along ±x). */
function towerSteel() {
  const S = new Parts();
  const corner = (y, sx, sz) => V(sx * hw(y), y, sz * hw(y));
  const C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < LEVELS.length - 1; i++) {
    const y0 = LEVELS[i], y1 = LEVELS[i + 1], legT = 0.5 - i * 0.018;
    for (const [sx, sz] of C4) S.beam(corner(y0, sx, sz), corner(y1, sx, sz), legT, STEEL_D);
    for (let f = 0; f < 4; f++) {
      const [ax, az] = C4[f], [bx, bz] = C4[(f + 1) % 4];
      // girt at the panel top + X bracing on the face
      S.beam(corner(y1, ax, az), corner(y1, bx, bz), 0.22, STEEL);
      S.beam(corner(y0, ax, az), corner(y1, bx, bz), 0.17, STEEL);
      S.beam(corner(y0, bx, bz), corner(y1, ax, az), 0.17, STEEL);
      // secondary redundants in the tall lower panels
      if (y1 - y0 > 3.5 && i < 4) {
        const ym = (y0 + y1) / 2;
        S.beam(V((ax + bx) / 2 * hw(ym), ym, (az + bz) / 2 * hw(ym)), corner(ym, ax, az), 0.1, STEEL);
      }
    }
    // plan bracing (diaphragms) every few panels
    if (i % 3 === 2) { S.beam(corner(y1, -1, -1), corner(y1, 1, 1), 0.14, STEEL); S.beam(corner(y1, 1, -1), corner(y1, -1, 1), 0.14, STEEL); }
  }
  // peak (earth-wire support) on top of the body
  const yT = LEVELS[LEVELS.length - 1];
  for (const [sx, sz] of C4) S.beam(corner(yT, sx, sz), V(sx * 0.35, PEAK, sz * 0.35), 0.24, STEEL_D);
  S.beam(V(-0.35, PEAK, -0.35), V(0.35, PEAK, 0.35), 0.12, STEEL); S.beam(V(0.35, PEAK, -0.35), V(-0.35, PEAK, 0.35), 0.12, STEEL);
  for (const sx of [-1, 1]) { S.beam(V(sx * 0.35, PEAK, 0), V(sx * 3.0, PEAK - 0.5, 0), 0.18, STEEL); S.beam(V(sx * 0.35, PEAK - 2.2, 0), V(sx * 3.0, PEAK - 0.5, 0), 0.14, STEEL); }
  // cross-arms: triangular trusses (two bottom chords, one top chord, diagonals) on both sides
  for (const { y, len } of ARMS) for (const sx of [-1, 1]) {
    const w = hw(y), tip = V(sx * (w + len), y, 0), tipT = V(sx * (w + len), y + 0.4, 0);
    const bF = V(sx * w, y, -w), bB = V(sx * w, y, w), top = V(sx * w, y + 2.6, 0);
    S.beam(bF, tip, 0.24, STEEL_D); S.beam(bB, tip, 0.24, STEEL_D); S.beam(top, tipT, 0.2, STEEL_D);
    const n = 4;
    for (let k = 1; k < n; k++) {
      const t = k / n, pF = bF.clone().lerp(tip, t), pB = bB.clone().lerp(tip, t), pT = top.clone().lerp(tipT, t);
      S.beam(pF, pB, 0.12, STEEL); S.beam(pF, pT, 0.12, STEEL); S.beam(pB, pT, 0.12, STEEL);
      const qT = top.clone().lerp(tipT, (k - 1) / n);
      S.beam(pF, qT, 0.1, STEEL); S.beam(pB, qT, 0.1, STEEL);
    }
    S.box(0.5, 0.3, 0.5, tip.x, y - 0.25, 0, STEEL_D);
  }
  // concrete footings
  for (const [sx, sz] of C4) S.box(1.6, 0.9, 1.6, sx * hw(0), -0.3, sz * hw(0), 0xb8b4aa);
  return S.merge();
}

/** Insulator strings hanging from the arm tips (and the earth-wire clamps). Returns geometry + conductor points. */
function insulators() {
  const S = new Parts(), pts = [];
  for (const { y, len } of ARMS) for (const sx of [-1, 1]) {
    const x = sx * (hw(y) + len);
    S.box(0.08, 0.5, 0.08, x, y - 0.5, 0, 0x5a5e62);
    for (let k = 0; k < 9; k++) S.box(0.42, 0.1, 0.42, x, y - 0.65 - k * 0.3, 0, k % 2 ? 0x8a6a52 : 0x9a7a60);
    S.box(0.06, 2.8, 0.06, x, y - 3.3, 0, 0x5a5e62);
    S.box(0.5, 0.12, 0.2, x, y - 3.45, 0, 0x4a4e52);
    pts.push(V(x, y - 3.4, 0));
  }
  for (const sx of [-1, 1]) pts.push(V(sx * 3.0, PEAK - 0.6, 0));
  return { geo: S.merge(), pts };
}

/** Fence, warning plates, anti-climb guards and the makeshift home in the lattice (main tower only). */
function towerDressing(S) {
  const W = 8.2, fenceH = 2.2;
  // chain-link fence around the base (posts, rails, a dark mesh skin), the gate with plates
  for (const [ax, az, bx, bz] of [[-W, -W, W, -W], [W, -W, W, W], [W, W, -W, W], [-W, W, -W, -W]]) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 2.4);
    for (let i = 0; i <= n; i++) { const t = i / n; S.box(0.12, fenceH + 0.3, 0.12, ax + (bx - ax) * t, 0, az + (bz - az) * t, 0x6a7a6a); }
    S.beam(V(ax, fenceH, az), V(bx, fenceH, bz), 0.08, 0x6a7a6a);
    S.beam(V(ax, fenceH + 0.3, az), V(bx, fenceH + 0.3, bz), 0.03, 0x4a4a4a);
    const g = new THREE.PlaneGeometry(len, fenceH - 0.1);
    g.rotateY(-Math.atan2(bz - az, bx - ax)); g.translate((ax + bx) / 2, (fenceH - 0.1) / 2 + 0.05, (az + bz) / 2);
    S.col(g, 0x5a6a5c);
  }
  // anti-climb spike rings and the guard plates on each leg
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const y = 4.0, x = sx * hw(y), z = sz * hw(y);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; S.beam(V(x, y, z), V(x + Math.cos(a) * 0.7, y + 0.25, z + Math.sin(a) * 0.7), 0.06, 0x3a3a3a); }
    S.box(0.9, 0.12, 0.9, x, y - 0.1, z, 0xd8c82a);
  }
  // ---- Superfly's home: a plank platform in the lattice, a shack, a ladder, laundry, a TV aerial
  const PY = 19.2, side = -1; // on the town side (-x)
  const px = side * 0.6;
  S.box(3.6, 0.18, 3.4, px, PY - 0.18, 0, 0x9a7a52);
  for (let i = 0; i < 7; i++) S.box(3.6, 0.03, 0.04, px, PY + 0.001, -1.6 + i * 0.5, 0x6a5238);
  for (const sz of [-1, 1]) S.beam(V(px - 1.8, PY + 0.9, sz * 1.7), V(px + 1.8, PY + 0.9, sz * 1.7), 0.06, 0xb8b2a2);
  S.beam(V(px - 1.8, PY + 0.9, -1.7), V(px - 1.8, PY + 0.9, 1.7), 0.06, 0xb8b2a2);
  // the shack: plywood walls, blue tarp roof, a window with a warm light, a door, a stovepipe
  const hx = px + 0.4;
  S.box(2.0, 1.9, 1.8, hx, PY, -0.5, 0xc8a878);
  S.box(2.3, 0.12, 2.2, hx, PY + 1.9, -0.5, 0x3a6ab8);
  S.box(2.3, 0.1, 0.2, hx, PY + 2.0, -0.5, 0x2a4a8a);
  S.box(0.04, 0.6, 0.7, hx - 1.01, PY + 0.9, -0.9, 0xffd890);
  S.box(0.05, 0.08, 0.8, hx - 1.02, PY + 1.52, -0.9, 0x5a4030);
  S.box(0.04, 1.5, 0.6, hx - 1.01, PY, 0.15, 0x7a5a3a);
  S.box(0.12, 0.9, 0.12, hx + 0.6, PY + 2.0, -1.1, 0x4a4a4a);
  // a TV aerial and a small dish on the roof, a potted plant and a bucket on the deck
  S.box(0.05, 1.6, 0.05, hx - 0.6, PY + 2.0, 0.1, 0xb8bcc0);
  for (let i = 0; i < 4; i++) S.box(0.7 - i * 0.12, 0.04, 0.04, hx - 0.6, PY + 3.2 + i * 0.12, 0.1, 0xc8ccd0);
  S.box(0.5, 0.5, 0.08, hx + 0.3, PY + 2.1, 0.3, 0xe8e8e0);
  S.box(0.35, 0.35, 0.35, px - 1.4, PY, 1.2, 0xb85a3a); S.box(0.5, 0.5, 0.5, px - 1.4, PY + 0.35, 1.2, 0x4a8a3a);
  S.box(0.3, 0.35, 0.3, px - 1.3, PY, 0.5, 0x5a8ab8);
  // laundry line from the shack to a leg, with shirts, socks and a towel
  const lA = V(px - 1.7, PY + 1.6, -1.6), lB = V(px - 1.7, PY + 1.6, 1.6);
  S.beam(lA, lB, 0.025, 0xe8e4d8);
  const cols = [0xfbf8f0, 0xe86a7a, 0x6a9ad8, 0xffd23f, 0xfbf8f0, 0x5aa86a, 0xf2a0b8];
  for (let i = 0; i < cols.length; i++) { const z = -1.4 + i * 0.44, h = 0.35 + hash2(i, 3) * 0.35; S.box(0.03, h, 0.3 + hash2(i, 5) * 0.12, px - 1.7, PY + 1.58 - h, z, cols[i]); }
  // a ladder up a leg from the ground to the deck, and a rope with a basket hanging off the edge
  const lx = side * hw(0) + 0.6, lz = -hw(0) + 0.6, tx = side * hw(PY) + 0.4, tz = -hw(PY) + 0.4;
  for (const o of [-0.25, 0.25]) S.beam(V(lx + o, 0, lz), V(tx + o, PY + 1.0, tz), 0.07, 0xa8743e);
  for (let k = 1; k < 34; k++) { const t = k / 34; S.beam(V(lx - 0.25 + (tx - lx) * t, PY * t, lz + (tz - lz) * t), V(lx + 0.25 + (tx - lx) * t, PY * t, lz + (tz - lz) * t), 0.05, 0x8a5a2e); }
  S.beam(V(px - 1.8, PY, -1.0), V(px - 1.8, PY - 6, -1.0), 0.03, 0xd8c8a0);
  S.box(0.4, 0.3, 0.4, px - 1.8, PY - 6.3, -1.0, 0x8a6a3a);
}

/** Smooth rise beyond the tracks (world coords). */
export function hillHeight(x, z) {
  const r = Math.hypot(x - HILL.x, z - HILL.z);
  const t = Math.min(1, Math.max(0, (HILL.r - r) / (HILL.r - HILL.flat)));
  const s = t * t * (3 - 2 * t);
  return HILL.top * s + (x > 40 ? Math.sin(x * 0.11 + z * 0.07) * 0.8 + Math.sin(z * 0.19) * 0.4 : 0) * s;
}

function buildHill(group) {
  const x0 = 37.2, x1 = 112, z0 = -78, z1 = 18, nx = 36, nz = 42;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    // keep clear of the houses beyond the east underpass
    const nearHouses = x < 48 && z > -2 && z < 20;
    pos.setY(i, nearHouses ? -0.05 : hillHeight(x, z) - 0.05);
  }
  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  const p = flat.attributes.position, n = p.count, c = new Float32Array(n * 3), col = new THREE.Color();
  for (let i = 0; i < n; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const k = hash2(Math.round(x * 0.7), Math.round(z * 0.7));
    const dTower = Math.hypot(x - PYLON.x, z - PYLON.z);
    if (dTower < 9.5) col.setHex(0xa89a7a); // trampled gravel pad under the tower
    else if (Math.abs((x - PYLON.x) * 0.55 + (z - PYLON.z) * 0.84) < 1.2 && z > PYLON.z) col.setHex(0xb0a080); // the path up
    else col.setHex(k < 0.15 ? 0x5e7a3a : k < 0.55 ? 0x6e8a44 : k < 0.85 ? 0x7a9a4c : 0x8aa258);
    for (let j = 0; j < 3; j++) { c[(i + j) * 3] = col.r; c[(i + j) * 3 + 1] = col.g; c[(i + j) * 3 + 2] = col.b; }
  }
  flat.setAttribute('color', new THREE.BufferAttribute(c, 3));
  flat.computeBoundingSphere();
  const mat = lightFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), 'hill');
  const mesh = new THREE.Mesh(flat, mat);
  mesh.receiveShadow = false; mesh.matrixAutoUpdate = false;
  group.add(mesh);
  // trees on the slopes (one instanced low-poly tree), clear of the tower pad and its path
  const T = new Parts();
  T.box(0.35, 1.6, 0.35, 0, 0, 0, 0x5a4a3a);
  const cone = (r, h, y, tint) => { const cg = new THREE.ConeGeometry(r, h, 6); cg.translate(0, y + h / 2, 0); T.col(cg, tint); };
  cone(1.9, 2.8, 1.0, 0x4a7a34); cone(1.5, 2.4, 2.4, 0x5a8a3a); cone(1.0, 1.9, 3.8, 0x6a9a42);
  const tgeo = T.merge();
  const spots = [];
  for (let i = 0; i < 400 && spots.length < 70; i++) {
    const x = 39 + hash2(i, 41) * 70, z = -74 + hash2(i, 43) * 88;
    if (Math.hypot(x - PYLON.x, z - PYLON.z) < 11 || (x < 49 && z > -4 && z < 21)) continue;
    if (Math.abs((x - PYLON.x) * 0.55 + (z - PYLON.z) * 0.84) < 3 && z > PYLON.z) continue;
    for (const nb of NEIGHBOURS) if (Math.hypot(x - nb.x, z - nb.z) < 8) continue;
    // clumps: denser away from the crest
    if (hash2(Math.round(x / 6), Math.round(z / 6)) < 0.35) continue;
    spots.push([x, z, 0.8 + hash2(i, 47) * 0.9]);
  }
  const tm = new THREE.InstancedMesh(tgeo, lightFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), 'trees'), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  spots.forEach(([x, z, k], i) => { q.setFromAxisAngle(V(0, 1, 0), hash2(x, z) * 6); tm.setMatrixAt(i, m4.compose(V(x, hillHeight(x, z) - 0.1, z), q, s.set(k, k * (0.9 + hash2(z, x) * 0.4), k))); });
  tm.computeBoundingSphere();
  tm.receiveShadow = false;
  group.add(tm);
}

/** Sagging conductor polyline between two world points (parabola), appended as line segments. */
function wire(out, a, b, sag, n = 28) {
  let prev = a.clone();
  for (let k = 1; k <= n; k++) {
    const t = k / n, p = a.clone().lerp(b, t);
    p.y -= 4 * sag * t * (1 - t);
    out.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
    prev = p;
  }
}

export function buildPylon(town) {
  const group = new THREE.Group();
  group.name = 'pylon';
  const towers = [{ ...PYLON, ry: 0.08 }, ...NEIGHBOURS];
  // steel (instanced: the three towers share one geometry)
  const steel = towerSteel();
  const steelM = lightFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.55 }), 'steel');
  const ins = insulators();
  const insM = lightFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.0 }), 'ins');
  const steelI = new THREE.InstancedMesh(steel, steelM, towers.length), insI = new THREE.InstancedMesh(ins.geo, insM, towers.length);
  const mats = towers.map((t) => new THREE.Matrix4().compose(V(t.x, t.base, t.z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), t.ry), V(1, 1, 1)));
  mats.forEach((m4, i) => { steelI.setMatrixAt(i, m4); insI.setMatrixAt(i, m4); });
  for (const im of [steelI, insI]) { im.computeBoundingSphere(); im.receiveShadow = false; im.castShadow = false; group.add(im); }
  // the main tower's fence, plates and the home in the lattice
  const D = new Parts();
  towerDressing(D);
  const dGeo = D.merge();
  dGeo.applyMatrix4(mats[0]);
  dGeo.computeBoundingSphere();
  const dress = new THREE.Mesh(dGeo, lightFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), 'dress'));
  dress.matrixAutoUpdate = false;
  group.add(dress);
  // warning plates (sign atlas: one quad each, on the fence and the legs)
  const B = town.batch();
  const plate = (key, w, h, lx, ly, lz, ry) => {
    const p = V(lx, ly, lz).applyMatrix4(mats[0]);
    town.signInto(B, key, w, h, p.x, p.y, p.z, { ry: ry + towers[0].ry });
  };
  for (const z of [-3, 3]) plate('danger', 0.5, 0.66, -8.26, 1.0, z, -Math.PI / 2);
  plate('danger', 0.5, 0.66, 0, 1.0, 8.26, 0);
  plate('danger', 0.5, 0.66, 0, 1.0, -8.26, Math.PI);
  plate('pylonPlate', 0.9, 0.27, -hw(2.5) - 0.3, 2.4, -hw(2.5) + 0.6, -Math.PI / 2);
  plate('danger', 0.6, 0.8, -hw(5.2) - 0.25, 5.0, hw(5.2) - 0.7, -Math.PI / 2);
  B.build(group, { receive: false });
  // conductors: each tower's attachment points to the next, and on toward the horizon (north and south)
  const attach = (t, i) => ins.pts.map((p) => p.clone().applyMatrix4(mats[i]));
  const A = towers.map(attach);
  const seg = [];
  const span = (pa, pb, sag) => pa.forEach((p, k) => wire(seg, p, pb[k], k >= pa.length - 2 ? sag * 0.8 : sag));
  span(A[0], A[1], 2.6); span(A[0], A[2], 2.8);
  const far = (pts, dx, dz) => pts.map((p) => V(p.x + dx, p.y - 6, p.z + dz));
  span(A[1], far(A[1], 9, 78), 2.6); span(A[2], far(A[2], -8, -80), 2.8);
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  lg.computeBoundingSphere();
  const lines = new THREE.LineSegments(lg, lightFog(new THREE.LineBasicMaterial({ color: 0x2a2c30 }), 'wire'));
  lines.matrixAutoUpdate = false;
  group.add(lines);
  buildHill(group);
  group.traverse((o) => { o.userData.noRim = true; });
  town.group.add(group);
  return { group, main: { ...PYLON } };
}
