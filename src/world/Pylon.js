// The steel electricity transmission tower (鉄塔) on the hill beyond the railway, east-south-east of the lane: a ~61 m
// double-circuit square lattice tower modelled member by member in angle steel (four L-section legs tapering to a
// waist, X bracing below and zig-zag bracing above, horizontal girts, plan diaphragms, three pairs of tapering truss
// arms, two earth-wire horns), painted in the red and white bands of a tower over 60 m, with suspension insulator
// strings, six sagging conductors and two earth wires running to the next towers, a fenced gravel pad, warning
// plates, an anti-climb collar on each leg and — the joke — somebody's tiny makeshift home built inside the lattice.
// The hill is a flat-toned cartoon rise terraced with small houses: no trees anywhere in the backdrop.
//
// Everything is static and merged: the steel and insulators of the three towers are instanced from one geometry, the
// wires are thin tubes (one mesh), the hill one mesh, its houses one instanced mesh. Distant things get a lighter fog
// (FOG_K) so the silhouette still reads at 70-100 m.
//   buildPylon(town) -> { group, main: { x, z, base } }
import * as THREE from 'three';
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
const RED = 0xcf5a3c, WHITE = 0xe9e5dc, GALV = 0xa9b1b5;
const band = (y) => (Math.floor(Math.max(0, Math.min(6.999, (y / PEAK) * 7))) % 2 ? WHITE : RED);

/** Patch a material's fog to FOG_K strength (keeps the tunnel-darkness patch in the shared chunk). */
function lightFog(m, key) {
  m.onBeforeCompile = (sh) => {
    const chunk = THREE.ShaderChunk.fog_fragment.replace('smoothstep( fogNear, fogFar, vFogDepth )', `smoothstep( fogNear, fogFar, vFogDepth ) * ${FOG_K.toFixed(2)}`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', chunk);
  };
  m.customProgramCacheKey = () => 'lightfog-' + key;
  return m;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _d = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Vector3();

/** An angle-steel member from a to b: two flat legs of width s meeting along the line, opening toward the tower's axis. */
function angle(B, mat, a, b, s, tint) {
  _d.subVectors(b, a);
  if (_d.lengthSq() < 1e-6) return;
  _d.normalize();
  _c.set(-(a.x + b.x) / 2, 0, -(a.z + b.z) / 2); // toward the axis
  if (_c.lengthSq() < 0.01) _c.set(1, 0, 0.3);
  _u.crossVectors(_d, _c);
  if (_u.lengthSq() < 1e-6) _u.set(0, 0, 1);
  _u.normalize(); _v.crossVectors(_u, _d).normalize();
  const A = [a.x, a.y, a.z], Bp = [b.x, b.y, b.z], col = tint ?? band((a.y + b.y) / 2);
  for (const w of [_u, _v]) B.face(mat, A, Bp, [b.x + w.x * s, b.y + w.y * s, b.z + w.z * s], [a.x + w.x * s, a.y + w.y * s, a.z + w.z * s], { tint: col, both: true });
}

/** The lattice tower itself (local, ground at y=0, line along z, arms along ±x). Returns the conductor points. */
function towerSteel(B, M) {
  const corner = (y, sx, sz) => V(sx * hw(y), y, sz * hw(y));
  const C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < LEVELS.length - 1; i++) {
    const y0 = LEVELS[i], y1 = LEVELS[i + 1], legS = 0.42 - i * 0.012;
    for (const [sx, sz] of C4) angle(B, M, corner(y0, sx, sz), corner(y1, sx, sz), legS);
    for (let f = 0; f < 4; f++) {
      const [ax, az] = C4[f], [bx, bz] = C4[(f + 1) % 4];
      angle(B, M, corner(y1, ax, az), corner(y1, bx, bz), 0.2);
      if (i < 7) { // X bracing with a redundant to its crossing in the tall panels
        angle(B, M, corner(y0, ax, az), corner(y1, bx, bz), 0.17); angle(B, M, corner(y0, bx, bz), corner(y1, ax, az), 0.17);
        if (i < 4) { const ym = (y0 + y1) / 2, mid = V((ax + bx) / 2 * hw(ym), ym, (az + bz) / 2 * hw(ym)); angle(B, M, mid, corner(ym, ax, az), 0.1); angle(B, M, mid, corner(ym, bx, bz), 0.1); }
      } else if ((i + f) % 2) angle(B, M, corner(y0, ax, az), corner(y1, bx, bz), 0.15); else angle(B, M, corner(y0, bx, bz), corner(y1, ax, az), 0.15);
    }
    if (i % 3 === 2 || ARMS.some((a) => a.y === y1)) { angle(B, M, corner(y1, -1, -1), corner(y1, 1, 1), 0.12); angle(B, M, corner(y1, 1, -1), corner(y1, -1, 1), 0.12); }
  }
  // the top: two horns for the earth wires
  const yT = LEVELS[LEVELS.length - 1];
  for (const [sx, sz] of C4) angle(B, M, corner(yT, sx, sz), V(sx * 0.35, PEAK, sz * 0.35), 0.2);
  angle(B, M, V(-0.35, PEAK, -0.35), V(0.35, PEAK, 0.35), 0.1); angle(B, M, V(0.35, PEAK, -0.35), V(-0.35, PEAK, 0.35), 0.1);
  for (const sx of [-1, 1]) { angle(B, M, V(sx * 0.35, PEAK, 0), V(sx * 3.0, PEAK - 0.5, 0), 0.16); angle(B, M, V(sx * 0.35, PEAK - 2.2, 0), V(sx * 3.0, PEAK - 0.5, 0), 0.13); angle(B, M, V(sx * 1.6, PEAK - 1.45, 0), V(sx * 1.6, PEAK - 0.26, 0), 0.08); }
  // cross-arms: tapering trusses (two bottom chords, one top chord, posts and diagonals)
  const pts = [];
  for (const { y, len } of ARMS) for (const sx of [-1, 1]) {
    const w = hw(y), tip = V(sx * (w + len), y, 0), tipT = V(sx * (w + len), y + 0.4, 0);
    const bF = V(sx * w, y, -w), bB = V(sx * w, y, w), top = V(sx * w, y + 2.6, 0);
    angle(B, M, bF, tip, 0.22); angle(B, M, bB, tip, 0.22); angle(B, M, top, tipT, 0.18); angle(B, M, tip, tipT, 0.14);
    const n = 4;
    for (let k = 1; k < n; k++) {
      const t = k / n, pF = bF.clone().lerp(tip, t), pB = bB.clone().lerp(tip, t), pT = top.clone().lerp(tipT, t), qT = top.clone().lerp(tipT, (k - 1) / n);
      angle(B, M, pF, pB, 0.1); angle(B, M, pF, pT, 0.1); angle(B, M, pB, pT, 0.1); angle(B, M, pF, qT, 0.09); angle(B, M, pB, qT, 0.09);
    }
    // the suspension string: a hanger, eleven porcelain discs, the clamp
    const x = tip.x;
    B.box(M, 0.1, 0.5, 0.1, x, y - 0.5, 0, { tint: 0x6a6e72 });
    const prof = [];
    for (let k = 0; k < 11; k++) prof.push([0.03, k * 0.17], [0.15, k * 0.17 + 0.05], [0.13, k * 0.17 + 0.09], [0.03, k * 0.17 + 0.12]);
    B.lathe(M, prof, x, y - 0.5 - 11 * 0.17, 0, { tint: 0x9a6a52, sides: 6 });
    B.box(M, 0.6, 0.12, 0.16, x, y - 2.55, 0, { tint: 0x55595d });
    pts.push(V(x, y - 2.5, 0));
  }
  for (const sx of [-1, 1]) pts.push(V(sx * 3.0, PEAK - 0.5, 0));
  // concrete footings
  for (const [sx, sz] of C4) B.box(M, 1.6, 0.9, 1.6, sx * hw(0), -0.3, sz * hw(0), { tint: 0xbcb8ae, bevel: 0.08 });
  return pts;
}

/** Fence, anti-climb collars and the makeshift home in the lattice (main tower only), in the tower's frame. */
function towerDressing(B, M, town) {
  const W = 8.2, fenceH = 2.2;
  for (const [ax, az, bx, bz] of [[-W, -W, W, -W], [W, -W, W, W], [W, W, -W, W], [-W, W, -W, -W]]) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 2.4);
    for (let i = 0; i <= n; i++) { const t = i / n; B.cyl(M, 0.05, 0.05, fenceH + 0.3, ax + (bx - ax) * t, 0, az + (bz - az) * t, { tint: 0x7a8a7a, sides: 6 }); }
    B.rod(M, [ax, fenceH, az], [bx, fenceH, bz], 0.03, { tint: 0x7a8a7a, sides: 5 });
    for (const dy of [0.12, 0.26]) B.rod(M, [ax, fenceH + dy, az], [bx, fenceH + dy, bz], 0.012, { tint: 0x4a4a4a, sides: 3 });
    B.push((ax + bx) / 2, 0, (az + bz) / 2, -Math.atan2(bz - az, bx - ax));
    B.quadUV(town.fence, len, fenceH - 0.1, 0, 0.05, 0, [0, 0, len, fenceH - 0.1], { tint: 0x9ab89a });
    B.pop();
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const y = 4.0, x = sx * hw(y), z = sz * hw(y);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; B.rod(M, [x, y, z], [x + Math.cos(a) * 0.75, y + 0.28, z + Math.sin(a) * 0.75], 0.025, { tint: 0x3a3a3a, sides: 3 }); }
    B.box(M, 0.9, 0.1, 0.9, x, y - 0.1, z, { tint: 0xe2c234 });
  }
  // ---- somebody's home: a plank platform in the lattice, a shack, a ladder, laundry, a TV aerial
  const PY = 19.2, px = -0.6, hx = px + 0.4;
  B.box(M, 3.6, 0.18, 3.4, px, PY - 0.18, 0, { tint: 0xb8946a });
  for (let i = 0; i < 7; i++) B.box(M, 3.6, 0.03, 0.04, px, PY + 0.001, -1.6 + i * 0.5, { tint: 0x8a6a4a });
  for (const sz of [-1, 1]) B.rod(M, [px - 1.8, PY + 0.9, sz * 1.7], [px + 1.8, PY + 0.9, sz * 1.7], 0.03, { tint: 0xc8c2b2, sides: 4 });
  B.rod(M, [px - 1.8, PY + 0.9, -1.7], [px - 1.8, PY + 0.9, 1.7], 0.03, { tint: 0xc8c2b2, sides: 4 });
  B.box(M, 2.0, 1.9, 1.8, hx, PY, -0.5, { tint: 0xd8b888 });
  B.face(M, [hx - 1.2, PY + 1.9, 0.6], [hx + 1.2, PY + 1.9, 0.6], [hx + 1.2, PY + 2.2, -1.6], [hx - 1.2, PY + 2.2, -1.6], { tint: 0x4a7ac8, both: true });
  B.box(town.G, 0.04, 0.6, 0.7, hx - 1.01, PY + 0.9, -0.9, { tint: 0xffd890 });
  B.box(M, 0.04, 1.5, 0.6, hx - 1.01, PY, 0.15, { tint: 0x9a7a5a });
  B.cyl(M, 0.06, 0.06, 0.9, hx + 0.6, PY + 2.0, -1.1, { tint: 0x5a5a5a, sides: 6 });
  B.rod(M, [hx - 0.6, PY + 2.0, 0.1], [hx - 0.6, PY + 3.7, 0.1], 0.025, { tint: 0xc0c4c8, sides: 4 });
  for (let i = 0; i < 4; i++) B.box(M, 0.7 - i * 0.12, 0.04, 0.04, hx - 0.6, PY + 3.2 + i * 0.12, 0.1, { tint: 0xc8ccd0 });
  B.blob(M, px - 1.4, PY + 0.62, 1.2, 0.3, 0.3, 0.3, { tint: 0x5a9a44 }); B.cyl(M, 0.16, 0.2, 0.35, px - 1.4, PY, 1.2, { tint: 0xb86a48, sides: 7 });
  B.rod(M, [px - 1.7, PY + 1.6, -1.6], [px - 1.7, PY + 1.6, 1.6], 0.012, { tint: 0xe8e4d8, sides: 3 });
  const cols = [0xfbf8f0, 0xe8808a, 0x7aa0d0, 0xffdc6a, 0xfbf8f0, 0x6ab07a, 0xf2a0b8];
  for (let i = 0; i < cols.length; i++) { const z = -1.4 + i * 0.44, h = 0.35 + hash2(i, 3) * 0.35; B.box(M, 0.03, h, 0.3 + hash2(i, 5) * 0.12, px - 1.7, PY + 1.58 - h, z, { tint: cols[i] }); }
  const lx = -hw(0) + 0.6, lz = -hw(0) + 0.6, tx = -hw(PY) + 0.4, tz = -hw(PY) + 0.4;
  for (const o of [-0.25, 0.25]) B.rod(M, [lx + o, 0, lz], [tx + o, PY + 1.0, tz], 0.035, { tint: 0xb8844e, sides: 4 });
  for (let k = 1; k < 34; k++) { const t = k / 34; B.rod(M, [lx - 0.25 + (tx - lx) * t, PY * t, lz + (tz - lz) * t], [lx + 0.25 + (tx - lx) * t, PY * t, lz + (tz - lz) * t], 0.025, { tint: 0x9a6a3e, sides: 3 }); }
}

/** Smooth rise beyond the tracks (world coords). */
export function hillHeight(x, z) {
  const r = Math.hypot(x - HILL.x, z - HILL.z);
  const t = Math.min(1, Math.max(0, (HILL.r - r) / (HILL.r - HILL.flat)));
  const s = t * t * (3 - 2 * t);
  return HILL.top * s + (x > 40 ? Math.sin(x * 0.11 + z * 0.07) * 0.8 + Math.sin(z * 0.19) * 0.4 : 0) * s;
}

function buildHill(group, town) {
  const x0 = 37.2, x1 = 112, z0 = -78, z1 = 18, nx = 30, nz = 36;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), nearHouses = x < 48 && z > -2 && z < 20;
    pos.setY(i, nearHouses ? -0.05 : hillHeight(x, z) - 0.05);
  }
  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  const p = flat.attributes.position, n = p.count, c = new Float32Array(n * 3), col = new THREE.Color();
  for (let i = 0; i < n; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const dTower = Math.hypot(x - PYLON.x, z - PYLON.z);
    if (dTower < 9.5) col.setHex(0xb9ab8c); // the gravel pad under the tower
    else if (Math.abs((x - PYLON.x) * 0.55 + (z - PYLON.z) * 0.84) < 1.2 && z > PYLON.z) col.setHex(0xc0b092); // the path up
    else col.setHex(y > 10.5 ? 0x9cb86a : y > 6 ? 0x8fae62 : y > 2.5 ? 0x84a45c : 0x93a878); // flat cartoon bands of grass by height
    for (let j = 0; j < 3; j++) { c[(i + j) * 3] = col.r; c[(i + j) * 3 + 1] = col.g; c[(i + j) * 3 + 2] = col.b; }
  }
  flat.setAttribute('color', new THREE.BufferAttribute(c, 3));
  flat.computeBoundingSphere();
  const mesh = new THREE.Mesh(flat, lightFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), 'hill'));
  mesh.receiveShadow = false; mesh.matrixAutoUpdate = false; mesh.name = 'pylon:hill';
  group.add(mesh);
  // terraces of houses on the slopes (one little house, instanced and tinted): roofs and walls, no trees
  const B = town.batch(), HM = lightFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 'hillhouse');
  B.box(HM, 6, 3.2, 5, 0, 0, 0, { tint: 0xe4dccc, skip: 'ny py' });
  B.face(HM, [-3.3, 3.1, 2.9], [3.3, 3.1, 2.9], [3.3, 4.5, 0], [-3.3, 4.5, 0], { tint: 0x8a94a4 }); B.face(HM, [3.3, 3.1, -2.9], [-3.3, 3.1, -2.9], [-3.3, 4.5, 0], [3.3, 4.5, 0], { tint: 0x7a8494 });
  for (const s of [-1, 1]) B.poly(HM, s > 0 ? [[3, 3.2, 2.5], [3, 3.2, -2.5], [3, 4.5, 0]] : [[-3, 3.2, -2.5], [-3, 3.2, 2.5], [-3, 4.5, 0]], { tint: 0xd8d0c0 });
  B.box(HM, 6.4, 1.6, 0.3, 0, -1.6, 3.4, { tint: 0xb4b0a6 }); // its retaining wall
  // three terraces of houses facing the town, set by hand along the slope
  const tmp = new THREE.Group(), hg = B.build(tmp)[0].geometry;
  const spots = [[45, -8], [46, -17], [44.5, -26], [46, -35], [45, -44], [47, -53], [53, -6], [54, -15], [52.5, -24], [54, -33], [53, -42], [55, -51], [56, -60],
    [61, -4], [62, -13], [61, -45], [63, -54], [64, -63], [72, -66], [81, -64], [90, -58], [97, -49], [101, -38], [102, -26], [99, -14], [93, -4], [84, 2], [74, 4]].map(([x, z]) => [x, z, hillHeight(x, z)]);
  const im = new THREE.InstancedMesh(hg, HM, spots.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const tints = [0xffffff, 0xf0e4d4, 0xdce4ec, 0xf4ecd8, 0xe0dcd0];
  spots.forEach(([x, z, y], i) => { q.setFromAxisAngle(V(0, 1, 0), Math.atan2(x - HILL.x, z - HILL.z) + (hash2(i, 7) - 0.5) * 0.5); const k = 0.85 + hash2(i, 9) * 0.4; im.setMatrixAt(i, m4.compose(V(x, y + 0.6, z), q, s.set(k, 0.9 + hash2(i, 11) * 0.5, k))); im.setColorAt(i, new THREE.Color(tints[i % 5])); });
  im.computeBoundingSphere(); im.receiveShadow = false; im.name = 'pylon:houses';
  group.add(im);
}

export function buildPylon(town) {
  const group = new THREE.Group();
  group.name = 'pylon';
  const towers = [{ ...PYLON, ry: 0.08 }, ...NEIGHBOURS];
  const mats = towers.map((t) => new THREE.Matrix4().compose(V(t.x, t.base, t.z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), t.ry), V(1, 1, 1)));
  // steel and insulators: one geometry, three towers
  const steelM = lightFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.1 }), 'steel');
  const S = town.batch(), pts = towerSteel(S, steelM), tmp = new THREE.Group();
  for (const mesh of S.build(tmp)) {
    const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, towers.length);
    mats.forEach((m4, i) => im.setMatrixAt(i, m4));
    im.computeBoundingSphere(); im.receiveShadow = false; im.castShadow = false; im.name = 'pylon:steel';
    group.add(im);
  }
  // the main tower's fence, plates and the home in the lattice; the wires
  const D = town.batch(), dressM = lightFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), 'dress');
  D.pushM(mats[0]);
  towerDressing(D, dressM, town);
  for (const z of [-3, 3]) { D.push(-8.26, 0, z, -Math.PI / 2); town.signInto(D, 'danger', 0, 1.0, 0, {}); D.pop(); }
  D.push(0, 0, 8.26, 0); town.signInto(D, 'danger', 0, 1.0, 0, {}); D.pop();
  D.push(0, 0, -8.26, Math.PI); town.signInto(D, 'danger', 0, 1.0, 0, {}); D.pop();
  D.push(-hw(2.5) - 0.3, 0, -hw(2.5) + 0.6, -Math.PI / 2); town.signInto(D, 'pylonPlate', 0, 2.4, 0, {}); D.pop();
  D.pop();
  const A = towers.map((t, i) => pts.map((p) => p.clone().applyMatrix4(mats[i])));
  const wireM = lightFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), 'wire');
  const span = (pa, pb, sag) => pa.forEach((p, k) => D.wire(wireM, [p.x, p.y, p.z], [pb[k].x, pb[k].y, pb[k].z], k >= pa.length - 2 ? sag * 0.8 : sag, k >= pa.length - 2 ? 0.035 : 0.055, { seg: 14, sides: 3, tint: 0x34363a }));
  span(A[0], A[1], 2.6); span(A[0], A[2], 2.8);
  const far = (ps, dx, dz) => ps.map((p) => V(p.x + dx, p.y - 6, p.z + dz));
  span(A[1], far(A[1], 9, 78), 2.6); span(A[2], far(A[2], -8, -80), 2.8);
  for (const mesh of D.build(group, { receive: false, name: 'pylon' })) mesh.frustumCulled = true;
  buildHill(group, town);
  group.traverse((o) => { o.userData.noRim = true; });
  town.group.add(group);
  return { group, main: { ...PYLON } };
}
