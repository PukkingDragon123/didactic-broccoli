// The Kaikan's escalators: one pair (UP lane, DOWN lane) per gap between floors (layout.js GAPS), built into BOTH
// floors' zones: the lower floor sees the bottom landings and the pair rising into a well in the ceiling (with a slice
// of the floor above beyond it), the upper floor sees the top landings at the edge of a railed well in its floor and
// the pair going down to a slice of the floor below. The steps are instanced and move (only on the floor you're on).
//   buildEscalators(zone, gap, yo, opts) -> { gap, update(dt), steps }     yo: the lower floor's height in this zone
//     (0 on the lower floor, -FH on the upper one)
import * as THREE from 'three';
import { GAPS, FH, CH, FLAT, RUN, PATH, STEP, SPEED, stepY, pathZ } from './layout.js';

const _m = new THREE.Matrix4(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);
let stepGeo = null;
/** One step: the grooved tread (yellow edges), the riser hanging from its back edge. Local +z = the way it travels. */
function stepGeometry() {
  if (stepGeo) return stepGeo;
  const parts = [];
  const add = (w, h, d, x, y, z, col) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(x, y, z);
    const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    parts.push(g);
  };
  add(0.8, 0.04, 0.36, 0, -0.02, 0, 0x4a4c52);
  for (let i = 0; i < 9; i++) add(0.012, 0.006, 0.34, -0.36 + i * 0.09, 0.002, 0, 0x2a2c30); // grooves
  add(0.8, 0.01, 0.04, 0, 0.001, 0.16, 0xf2c230); // the yellow line at the front edge
  for (const x of [-0.39, 0.39]) add(0.02, 0.01, 0.36, x, 0.001, 0, 0xf2c230);
  add(0.8, 0.22, 0.02, 0, -0.13, -0.18, 0x3a3c42); // riser
  const g = new THREE.BufferGeometry();
  const pos = [], nor = [], col = [];
  for (const p of parts) { pos.push(...p.attributes.position.array); nor.push(...p.attributes.normal.array); col.push(...p.attributes.color.array); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  stepGeo = g;
  return g;
}

/** A strip along a lane's path (flat, incline, flat) between heights a and b above the step line, at x. */
function sideStrip(G, x, yo, a, b) {
  const us = [0, FLAT, FLAT + RUN, PATH];
  const pos = [], idx = [];
  us.forEach((u, i) => { const z = pathZ(G, u), y = yo + stepY(u); pos.push(x, y + a, z, x, y + b, z); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildEscalators(zone, gap, yo, { open = () => true } = {}) {
  const G = GAPS[gap], Z = zone, B = Z.B;
  const metal = Z.mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.6 }));
  const paint = Z.mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  const glass = Z.mat(new THREE.MeshStandardMaterial({ color: 0xcfe8ee, roughness: 0.1, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
  const rubber = Z.mat(new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.5 }));
  const ys = (u) => yo + stepY(u);
  const lanes = [G.up, G.down];
  const xs = [G.up - 0.52, (G.up + G.down) / 2, G.down + 0.52];
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.position.copy(Z.o); Z.group.add(m); return m; };
  // balustrades: glass between the skirting and the handrail, a black handrail on top, steel skirting at the steps
  for (const x of xs) {
    add(sideStrip(G, x, yo, 0.14, 0.88), glass);
    add(sideStrip(G, x + 0.03, yo, 0.88, 0.97), rubber);
    add(sideStrip(G, x - 0.03, yo, 0.88, 0.97), rubber);
    add(sideStrip(G, x + 0.06, yo, -0.02, 0.14), metal);
    add(sideStrip(G, x - 0.06, yo, -0.02, 0.14), metal);
    // the newel ends: the handrail curls down at both landings
    for (const u of [0.05, PATH - 0.05]) B.box(rubber, 0.08, 0.95, 0.12, x, ys(u), pathZ(G, u), {});
  }
  // the truss: cladding under the incline (seen from the floor below) and on the outer sides
  const pos = [];
  for (const [u0, u1] of [[0, FLAT], [FLAT, FLAT + RUN], [FLAT + RUN, PATH]]) {
    const za = pathZ(G, u0), zb2 = pathZ(G, u1), ya = ys(u0) - 0.95, yb = ys(u1) - 0.95;
    const x0 = xs[0] - 0.1, x1 = xs[2] + 0.1;
    pos.push(x0, ya, za, x1, ya, za, x1, yb, zb2, x0, ya, za, x1, yb, zb2, x0, yb, zb2);
  }
  const ug = new THREE.BufferGeometry(); ug.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ug.computeVertexNormals();
  add(ug, Z.mat(new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide })));
  for (const x of [xs[0] - 0.1, xs[2] + 0.1]) add(sideStrip(G, x, yo, -0.95, -0.02), Z.mat(new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.4, metalness: 0.4, side: THREE.DoubleSide })));
  // landing plates and comb plates at both ends
  for (const [u0, u1] of [[0, FLAT * 0.55], [PATH - FLAT * 0.55, PATH]]) {
    const z = (pathZ(G, u0) + pathZ(G, u1)) / 2, d = Math.abs(pathZ(G, u1) - pathZ(G, u0));
    for (const lx of lanes) B.box(metal, 0.86, 0.02, d, lx, ys(u0), z, { tint: 0xb8bcc2 });
    for (const lx of lanes) B.box(metal, 0.86, 0.025, 0.06, lx, ys(u0), pathZ(G, u0 < 1 ? u1 : u0), { tint: 0xf2c230 });
  }
  // the steps (instanced; animated on the floor you're on)
  const mat = Z.mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.5 }));
  const N = Math.ceil(PATH / STEP);
  const steps = lanes.map(() => {
    const im = new THREE.InstancedMesh(stepGeometry(), mat, N);
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    Z.group.add(im);
    return im;
  });
  const rot = new THREE.Quaternion().setFromAxisAngle(_Y, G.dir > 0 ? 0 : Math.PI);
  let phase = 0;
  const place = () => {
    steps.forEach((im, li) => {
      const sgn = li === 0 ? 1 : -1, lx = lanes[li];
      for (let i = 0; i < N; i++) {
        let u = (i * STEP + sgn * phase) % PATH;
        if (u < 0) u += PATH;
        let y = ys(u);
        if (u < 0.22 || u > PATH - 0.22) y -= 0.08; // under the comb plates
        _p.set(Z.o.x + lx, y, Z.o.z + pathZ(G, u));
        im.setMatrixAt(i, _m.compose(_p, rot, _s)); // both lanes' risers hang from the downhill edge
      }
      im.instanceMatrix.needsUpdate = true;
    });
  };
  place();
  // a chain barrier at the bottom of the UP lane while the floor above isn't open yet
  const barrier = new THREE.Group();
  const bz = pathZ(G, 0.25);
  for (const dx of [-0.42, 0.42]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.9, 6), paint); p.position.set(Z.o.x + G.up + dx, yo + 0.45, Z.o.z + bz); barrier.add(p); }
  const chain = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.04, 0.02), Z.mat(new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.5 })));
  chain.position.set(Z.o.x + G.up, yo + 0.75, Z.o.z + bz); barrier.add(chain);
  Z.group.add(barrier);
  return {
    gap, G, steps, barrier,
    update(dt) { phase = (phase + dt * SPEED) % STEP; place(); barrier.visible = yo === 0 && !open(); },
    refresh() { barrier.visible = yo === 0 && !open(); },
  };
}

/** The well in the ceiling of the lower floor (and the slab edge around it). */
export function ceilingWell(zone, gap, mat) {
  const W = GAPS[gap].well, B = zone.B;
  for (const [w, d, x, z] of [[W.x1 - W.x0 + 0.2, 0.1, (W.x0 + W.x1) / 2, W.z0], [W.x1 - W.x0 + 0.2, 0.1, (W.x0 + W.x1) / 2, W.z1], [0.1, W.z1 - W.z0, W.x0, (W.z0 + W.z1) / 2], [0.1, W.z1 - W.z0, W.x1, (W.z0 + W.z1) / 2]]) {
    B.box(mat, w, FH - CH, d, x, CH, z, { tint: 0xf4f4f0 });
  }
}

export { CH };
