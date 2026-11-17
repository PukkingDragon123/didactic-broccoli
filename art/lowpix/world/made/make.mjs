// Self-made source models for props no CC model covers (Japanese road signs, a shaved-ice nobori flag): simple true-to-
// size geometry with painted textures (textures.py), written as .glb and then converted by lowpix like everything else
// (art/lowpix/world/world.json: src = art/lowpix/world/made/<name>.glb). Run: node art/lowpix/world/made/make.mjs
import { Document, NodeIO } from '@gltf-transform/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const H = import.meta.dirname;
function model(name, png, parts) {
  const doc = new Document(), buf = doc.createBuffer();
  const tex = doc.createTexture(name).setImage(readFileSync(resolve(H, png))).setMimeType('image/png');
  const mat = doc.createMaterial(name).setBaseColorTexture(tex).setRoughnessFactor(0.8);
  const P = [], N = [], U = [], I = [];
  const quad = (a, b, c, d, n, uv) => { const o = P.length / 3; for (const p of [a, b, c, d]) P.push(...p); for (let i = 0; i < 4; i++) N.push(...n); U.push(...uv.flat()); I.push(o, o + 1, o + 2, o, o + 2, o + 3); };
  const tri = (a, b, c, n, uv) => { const o = P.length / 3; for (const p of [a, b, c]) P.push(...p); for (let i = 0; i < 3; i++) N.push(...n); U.push(...uv.flat()); I.push(o, o + 1, o + 2); };
  // a box [x0,y0,z0]..[x1,y1,z1], every face mapped to the uv rect r = [u0, v0, u1, v1]
  const box = (x0, y0, z0, x1, y1, z1, r) => {
    const uv = [[r[0], r[3]], [r[2], r[3]], [r[2], r[1]], [r[0], r[1]]];
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], uv); quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], uv);
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], uv); quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], uv);
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], uv); quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], uv);
  };
  // an upright cylinder (n sides) from y0 to y1, mapped to the uv rect r
  const cyl = (cx, cz, rad, y0, y1, n, r) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, u0 = r[0] + (r[2] - r[0]) * i / n, u1 = r[0] + (r[2] - r[0]) * (i + 1) / n;
      const p = (a, y) => [cx + Math.sin(a) * rad, y, cz + Math.cos(a) * rad], am = (a0 + a1) / 2;
      quad(p(a0, y0), p(a1, y0), p(a1, y1), p(a0, y1), [Math.sin(am), 0, Math.cos(am)], [[u0, r[3]], [u1, r[3]], [u1, r[1]], [u0, r[1]]]);
      tri([cx, y1, cz], p(a0, y1), p(a1, y1), [0, 1, 0], [[(r[0] + r[2]) / 2, r[1]], [u0, r[1]], [u1, r[1]]]);
    }
  };
  // a lumpy mound over an ellipse (w x d, peak h), its top mapped to the uv rect r
  const mound = (cx, cz, w, d, h, r, seed = 1, n = 14) => {
    const rnd = (i, j) => { const v = Math.sin((i * 127.1 + j * 311.7 + seed * 74.7)) * 43758.5453; return v - Math.floor(v); };
    const H = (u, v) => { const q = 1 - (u * u + v * v); return q <= 0 ? 0 : h * Math.pow(q, 0.8) * (0.75 + 0.5 * rnd(Math.round(u * 9), Math.round(v * 9))); };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const u0 = -1 + 2 * i / n, u1 = -1 + 2 * (i + 1) / n, v0 = -1 + 2 * j / n, v1 = -1 + 2 * (j + 1) / n;
      if (Math.min(u0 * u0, u1 * u1) + Math.min(v0 * v0, v1 * v1) >= 1) continue;
      const P = (u, v) => { const rr = Math.hypot(u, v); if (rr > 1) { u /= rr; v /= rr; } return [cx + u * w / 2, H(u * 0.999, v * 0.999) + 0.002, cz + v * d / 2]; };
      const T = (u, v) => [r[0] + (r[2] - r[0]) * (u + 1) / 2, r[1] + (r[3] - r[1]) * (v + 1) / 2];
      quad(P(u0, v1), P(u1, v1), P(u1, v0), P(u0, v0), [0, 1, 0], [T(u0, v1), T(u1, v1), T(u1, v0), T(u0, v0)]);
    }
  };
  // a crumpled lump (a jittered octahedron sphere), mapped to r
  const blob = (cx, cy, cz, rad, r, seed = 1) => {
    const rnd = (k) => { const v = Math.sin(k * 91.7 + seed * 13.1) * 43758.5453; return v - Math.floor(v); };
    const nu = 8, nv = 6, pts = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const th = (i / nu) * Math.PI * 2, ph = (j / nv) * Math.PI, k = 0.7 + 0.5 * rnd(i % nu + j * 17);
      pts.push([cx + Math.sin(ph) * Math.cos(th) * rad * k, cy + Math.cos(ph) * rad * k * 0.8, cz + Math.sin(ph) * Math.sin(th) * rad * k]);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = pts[j * (nu + 1) + i], b = pts[j * (nu + 1) + i + 1], c = pts[(j + 1) * (nu + 1) + i + 1], e = pts[(j + 1) * (nu + 1) + i];
      const T = (ii, jj) => [r[0] + (r[2] - r[0]) * ii / nu, r[1] + (r[3] - r[1]) * jj / nv];
      const n = [a[0] - cx, a[1] - cy, a[2] - cz], L = Math.hypot(...n) || 1;
      quad(a, b, c, e, n.map((x) => x / L), [T(i, j), T(i + 1, j), T(i + 1, j + 1), T(i, j + 1)]);
    }
  };
  // a bent sheet (paper, newspaper, cardboard) lying on the ground: w x d, raised h along its middle, turned ry
  const sheet = (cx, cy, cz, w, d, h, ry, r, t = 0.003) => {
    const c = Math.cos(ry), sn = Math.sin(ry), n = 6;
    const P = (u, v, up) => { const x = (u - 0.5) * w, z = (v - 0.5) * d; return [cx + x * c - z * sn, cy + h * Math.sin(u * Math.PI) * 0.6 + h * 0.4 * Math.sin(v * 3.1) + up, cz + x * sn + z * c]; };
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, T = (u, v) => [r[0] + (r[2] - r[0]) * u, r[1] + (r[3] - r[1]) * v];
      quad(P(u0, 1, t), P(u1, 1, t), P(u1, 0, t), P(u0, 0, t), [0, 1, 0], [T(u0, 1), T(u1, 1), T(u1, 0), T(u0, 0)]);
      quad(P(u0, 0, 0), P(u1, 0, 0), P(u1, 1, 0), P(u0, 1, 0), [0, -1, 0], [T(u0, 0), T(u1, 0), T(u1, 1), T(u0, 1)]);
    }
  };
  parts({ quad, tri, box, cyl, mound, blob, sheet });
  const prim = doc.createPrimitive().setMaterial(mat)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(P)).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(N)).setBuffer(buf))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(U)).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(I)).setBuffer(buf));
  doc.createScene().addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  return new NodeIO().write(resolve(H, name + '.glb'), doc);
}
const GREY = [0.02, 0.9, 0.48, 0.98], CONC = [0.52, 0.9, 0.98, 0.98];
// 止まれ: an inverted triangle (0.8 m a side) on a galvanised pole, a concrete foot
await model('tomare', 'tomare.png', ({ tri, quad, box, cyl }) => {
  box(-0.13, 0, -0.13, 0.13, 0.08, 0.13, CONC);
  cyl(0, -0.03, 0.03, 0.08, 2.2, 12, GREY);
  const y1 = 2.24, s = 0.8, h = s * Math.sqrt(3) / 2, z = 0.01, t = 0.012;
  const A = [-s / 2, y1], B = [s / 2, y1], C = [0, y1 - h];
  const uvA = [8 / 512, 8 / 512], uvB = [504 / 512, 8 / 512], uvC = [256 / 512, 440 / 512];
  tri([A[0], A[1], z + t], [C[0], C[1], z + t], [B[0], B[1], z + t], [0, 0, 1], [uvA, uvC, uvB]);
  tri([A[0], A[1], z], [B[0], B[1], z], [C[0], C[1], z], [0, 0, -1], [[0.1, 0.92], [0.4, 0.92], [0.25, 0.97]]);
  for (const [p, q] of [[A, B], [B, C], [C, A]]) quad([p[0], p[1], z], [q[0], q[1], z], [q[0], q[1], z + t], [p[0], p[1], z + t], [0, 1, 0], [[0.1, 0.92], [0.4, 0.92], [0.4, 0.97], [0.1, 0.97]]);
  box(-0.05, 1.86, -0.045, 0.05, 1.9, 0.01, GREY); box(-0.05, 2.16, -0.045, 0.05, 2.2, 0.01, GREY); // the clamps
});
// かき氷 nobori: a cloth hung from a crossbar on a steel pole in a weighted stand
await model('kakigori', 'kakigori.png', ({ quad, box, cyl }) => {
  cyl(0, 0, 0.13, 0, 0.12, 14, [0.76, 0.0, 1.0, 1.0]);
  cyl(0, 0, 0.012, 0.12, 1.55, 8, [0.52, 0.0, 0.74, 1.0]);
  box(-0.012, 1.5, -0.012, 0.012 + 0.44, 1.52, 0.012, [0.52, 0.0, 0.74, 0.05]);
  const x0 = 0.015, x1 = 0.45, y0 = 0.4, y1 = 1.5, z = 0.016;
  quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, 1], [[0, 1], [0.5, 1], [0.5, 0], [0, 0]]);
  quad([x1, y0, z - 0.004], [x0, y0, z - 0.004], [x0, y1, z - 0.004], [x1, y1, z - 0.004], [0, 0, -1], [[0.5, 1], [0, 1], [0, 0], [0.5, 0]]);
});
// 消火用 fire buckets: three red buckets on a two-tier steel stand (fire_buckets)
await model('firebuckets', 'firebucket.png', ({ box, cyl }) => {
  const RED = [0.52, 0.0, 0.74, 1.0], STEEL = [0.76, 0.0, 1.0, 1.0];
  for (const x of [-0.36, 0.36]) for (const z of [-0.12, 0.12]) box(x - 0.012, 0, z - 0.012, x + 0.012, 0.62, z + 0.012, RED);
  box(-0.38, 0.6, -0.14, 0.38, 0.625, 0.14, RED); box(-0.38, 0.24, -0.14, 0.38, 0.26, 0.14, RED);
  for (const x of [-0.24, 0, 0.24]) {
    cyl(x, 0, 0.11, 0.625, 0.86, 14, [0.0, 0.0, 0.5, 1.0]);
    cyl(x, 0, 0.115, 0.85, 0.87, 14, STEEL);
  }
});
// バス停: round sign, timetable, pole and a concrete foot (bus_stop)
await model('busstop', 'busstop.png', ({ quad, tri, box, cyl }) => {
  cyl(0, 0, 0.22, 0, 0.12, 16, [0.5, 0.64, 1.0, 1.0]);
  cyl(0, 0, 0.028, 0.12, 2.3, 10, [0.0, 0.64, 0.5, 1.0]);
  const z = 0.03, R = 0.24, y = 2.05, n = 24;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, u = (a) => 0.25 + Math.sin(a) * 0.235, v = (a) => 0.25 - Math.cos(a) * 0.235;
    tri([0, y, z], [Math.sin(a0) * R, y + Math.cos(a0) * R, z], [Math.sin(a1) * R, y + Math.cos(a1) * R, z], [0, 0, 1], [[0.25, 0.25], [u(a0), v(a0)], [u(a1), v(a1)]]);
    tri([0, y, z - 0.035], [Math.sin(a1) * R, y + Math.cos(a1) * R, z - 0.035], [Math.sin(a0) * R, y + Math.cos(a0) * R, z - 0.035], [0, 0, -1], [[0.15, 0.95], [0.2, 0.9], [0.1, 0.9]]);
    const am = (a0 + a1) / 2; // the rim band
    quad([Math.sin(a1) * R, y + Math.cos(a1) * R, z - 0.035], [Math.sin(a0) * R, y + Math.cos(a0) * R, z - 0.035], [Math.sin(a0) * R, y + Math.cos(a0) * R, z], [Math.sin(a1) * R, y + Math.cos(a1) * R, z], [Math.sin(am), Math.cos(am), 0], [[0.1, 0.9], [0.2, 0.9], [0.2, 0.95], [0.1, 0.95]]);
  }
  box(-0.17, 0.95, 0.03, 0.17, 1.55, 0.04, [0.53, 0.02, 0.98, 0.6]);
});
// standing ashtray: a red drum with a sand-filled top on a short leg (mk_stand_ashtray)
await model('ashtray', 'ashtray.png', ({ cyl }) => {
  cyl(0, 0, 0.14, 0, 0.03, 16, [0.0, 0.5, 0.5, 1.0]);
  cyl(0, 0, 0.03, 0.03, 0.42, 10, [0.0, 0.5, 0.5, 1.0]);
  cyl(0, 0, 0.13, 0.42, 0.66, 18, [0.0, 0.0, 1.0, 0.5]);
  cyl(0, 0, 0.128, 0.66, 0.665, 18, [0.5, 0.5, 1.0, 1.0]);
});
// junk piles in the old garage (Story.js: sweep them up): real debris, not blotches
const C = (i) => [(i % 4) / 4 + 0.004, Math.floor(i / 4) / 4 + 0.004, (i % 4 + 1) / 4 - 0.004, (Math.floor(i / 4) + 1) / 4 - 0.004];
await model('dustpile', 'debris.png', ({ mound, sheet, blob, cyl }) => {
  mound(0, 0, 0.6, 0.45, 0.045, C(6), 3);
  mound(0.12, 0.04, 0.3, 0.22, 0.03, C(0), 5);
  mound(-0.18, -0.08, 0.16, 0.14, 0.02, C(7), 7);
  sheet(0.2, 0.01, -0.12, 0.12, 0.08, 0.01, 0.6, C(2));
  sheet(-0.22, 0.012, 0.12, 0.1, 0.07, 0.008, -0.4, C(3));
  blob(-0.05, 0.035, 0.1, 0.025, C(2), 4);
});
await model('rubbishpile', 'debris.png', ({ mound, sheet, blob, cyl }) => {
  mound(0, 0, 0.58, 0.34, 0.07, C(0), 11);
  sheet(-0.12, 0.05, 0.02, 0.3, 0.22, 0.03, 0.3, C(1));
  sheet(0.14, 0.06, -0.05, 0.16, 0.12, 0.02, -0.7, C(3));
  for (const [x, y, z, rr, k] of [[0.05, 0.12, 0.06, 0.06, 2], [-0.15, 0.1, -0.08, 0.05, 2], [0.18, 0.09, 0.08, 0.045, 3], [0.0, 0.16, -0.05, 0.05, 1], [-0.05, 0.19, 0.04, 0.04, 2]]) blob(x, y, z, rr, C(k), x * 99 + z * 7);
  cyl(0.22, -0.1, 0.033, 0.0, 0.11, 10, C(4));
  sheet(-0.24, 0.02, 0.12, 0.12, 0.06, 0.01, 1.2, C(7));
});
await model('cardboardmess', 'debris.png', ({ sheet, mound, blob }) => {
  mound(0, 0, 0.7, 0.5, 0.02, C(0), 21);
  for (const [x, y, z, w, d, h, ry] of [[-0.12, 0.02, 0.0, 0.5, 0.36, 0.05, 0.2], [0.1, 0.06, 0.05, 0.42, 0.3, 0.07, -0.5], [-0.05, 0.11, -0.06, 0.36, 0.26, 0.06, 0.9], [0.18, 0.15, -0.02, 0.26, 0.2, 0.05, 2.1]])
    sheet(x, y, z, w, d, h, ry, C(5), 0.008);
  sheet(-0.25, 0.03, 0.18, 0.14, 0.1, 0.01, 0.4, C(1));
  blob(0.25, 0.04, 0.2, 0.035, C(2), 9);
});
// a mini fridge (fridge): cream enamel body, the door with stickers, a chrome handle, the grille at the back
await model('minifridge', 'fridge.png', ({ box }) => {
  const W = 0.49, H = 0.85, D = 0.51, BODY = [0.52, 0.02, 0.98, 0.72];
  box(-W / 2, 0.03, -D / 2, W / 2, H, D / 2 - 0.03, BODY);
  box(-W / 2 + 0.005, 0.04, D / 2 - 0.03, W / 2 - 0.005, H - 0.01, D / 2, [0.01, 0.01, 0.49, 0.99]);
  box(W / 2 - 0.07, 0.45, D / 2, W / 2 - 0.05, 0.75, D / 2 + 0.03, [0.52, 0.91, 0.98, 0.99]);
  for (const x of [-W / 2 + 0.04, W / 2 - 0.06]) for (const z of [-D / 2 + 0.04, D / 2 - 0.08]) box(x, 0, z, x + 0.03, 0.03, z + 0.03, [0.52, 0.77, 0.98, 0.88]);
});
// an instant gas water heater on the wall over the sink (water_heater)
await model('waterheater', 'waterheater.png', ({ box, cyl }) => {
  box(-0.15, 0.12, -0.2, 0.15, 0.68, 0.18, [0.52, 0.02, 0.98, 0.48]);
  box(-0.14, 0.13, 0.18, 0.14, 0.67, 0.2, [0.01, 0.01, 0.49, 0.99]);
  for (const x of [-0.08, 0.08]) cyl(x, 0.0, 0.012, 0.0, 0.13, 8, [0.52, 0.76, 0.98, 0.98]);
  cyl(0.0, -0.05, 0.03, 0.68, 0.74, 10, [0.52, 0.51, 0.98, 0.74]);
});
// a corner cobweb: a curved card (alpha) from the corner
await model('cobwebcard', 'cobweb.png', ({ quad }) => {
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a0 = i / n, a1 = (i + 1) / n, P = (u, v) => [u * 0.39, 0.39 - v * 0.39, Math.sin(Math.PI * Math.min(1, Math.hypot(u, v))) * 0.012];
    quad(P(a0, 0), P(a1, 0), P(a1, 1), P(a0, 1), [0, 0, 1], [[a0, 0], [a1, 0], [a1, 1], [a0, 1]]);
  }
});
// the rubber coin tray (coin_tray, the catalogue's Coin Tray)
await model('cointray', 'cointray.png', ({ box }) => {
  const W = 0.168, D = 0.12, F = [0.02, 0.02, 0.98, 0.76], R = [0.02, 0.8, 0.98, 0.98];
  box(-W / 2, 0, -D / 2, W / 2, 0.006, D / 2, F);
  box(-W / 2, 0, -D / 2, W / 2, 0.024, -D / 2 + 0.008, R); box(-W / 2, 0, D / 2 - 0.008, W / 2, 0.024, D / 2, R);
  box(-W / 2, 0, -D / 2, -W / 2 + 0.008, 0.024, D / 2, R); box(W / 2 - 0.008, 0, -D / 2, W / 2, 0.024, D / 2, R);
});
// 縁台: the low slatted bench outside every dagashi shop (shop_bench)
await model('engawabench', 'bench.png', ({ box }) => {
  const W = 0.95, D = 0.35, H = 0.525, TOP = [0.0, 0.0, 1.0, 0.5], LEG = [0.0, 0.5, 0.5, 1.0];
  for (let i = 0; i < 4; i++) { const z0 = -D / 2 + i * (D / 4) + 0.004; box(-W / 2, H - 0.03, z0, W / 2, H, z0 + D / 4 - 0.008, [0, i / 4, 1, (i + 1) / 4 - 0.01]); }
  for (const x of [-W / 2 + 0.05, W / 2 - 0.1]) for (const z of [-D / 2 + 0.02, D / 2 - 0.07]) box(x, 0, z, x + 0.05, H - 0.03, z + 0.05, LEG);
  for (const x of [-W / 2 + 0.05, W / 2 - 0.1]) box(x, 0.12, -D / 2 + 0.02, x + 0.05, 0.16, D / 2 - 0.02, LEG);
  box(-W / 2 + 0.05, H - 0.09, -D / 2 + 0.03, W / 2 - 0.05, H - 0.03, -D / 2 + 0.06, LEG);
  box(-W / 2 + 0.05, H - 0.09, D / 2 - 0.06, W / 2 - 0.05, H - 0.03, D / 2 - 0.03, LEG);
});
// the pink phone (ピンク電話) on its wooden stand (pink_phone)
await model('pinkphone', 'pinkphone.png', ({ box, cyl }) => {
  const S = [0.02, 0.52, 0.48, 0.98], S2 = [0.52, 0.52, 0.98, 0.98], P = [0.52, 0.02, 0.98, 0.48], F = [0.01, 0.01, 0.49, 0.49];
  box(-0.17, 0.0, -0.14, 0.17, 0.04, 0.14, S2);
  for (const x of [-0.15, 0.12]) for (const z of [-0.12, 0.09]) box(x, 0.04, z, x + 0.03, 0.66, z + 0.03, S);
  box(-0.17, 0.66, -0.14, 0.17, 0.7, 0.14, S2); box(-0.15, 0.3, -0.12, 0.15, 0.32, 0.12, S2);
  box(-0.13, 0.7, -0.11, 0.13, 0.9, 0.08, P);
  box(-0.12, 0.7, 0.08, 0.12, 0.89, 0.1, F);
  box(-0.14, 0.9, -0.08, 0.14, 0.95, -0.02, P); cyl(-0.12, -0.05, 0.03, 0.9, 0.96, 8, P); cyl(0.12, -0.05, 0.03, 0.9, 0.96, 8, P);
});
// a residential street light: a galvanised pole, the arm and the fluorescent lamp head (street_light)
await model('streetlight', 'streetlight.png', ({ box, cyl }) => {
  const G = [0.02, 0.02, 0.98, 0.48], DIF = [0.04, 0.54, 0.46, 0.96], PL = [0.52, 0.52, 0.98, 0.98];
  cyl(0, 0, 0.065, 0, 0.25, 10, G); cyl(0, 0, 0.05, 0.25, 3.95, 10, G);
  box(-0.05, 3.88, -0.02, 0.58, 3.93, 0.02, G);
  box(0.12, 3.84, -0.08, 0.66, 3.93, 0.08, G); box(0.14, 3.81, -0.07, 0.64, 3.84, 0.07, DIF);
  box(-0.06, 2.2, 0.05, 0.06, 2.42, 0.052, PL);
});
// Mikawa-ya's fixtures and the gacha corner's coin changer / capsule return box (mikawaya.png, 4x4 cells)
const M = (i, a = 0, b = 0, c = 1, e = 1) => { const x = (i % 4) / 4, y = Math.floor(i / 4) / 4; return [x + 0.004 + a * 0.242, y + 0.004 + b * 0.242, x + 0.004 + c * 0.242, y + 0.004 + e * 0.242]; };
const WOOD = M(0), LWOOD = M(1), STEEL = M(2);
await model('coinchanger', 'mikawaya.png', ({ box }) => {
  box(-0.2, 0.08, -0.17, 0.2, 1.28, 0.17, STEEL);
  box(-0.19, 0.6, 0.17, 0.19, 1.24, 0.185, M(3));
  box(-0.12, 0.62, 0.185, 0.12, 0.66, 0.24, STEEL);
  for (const x of [-0.17, 0.13]) for (const z of [-0.15, 0.11]) box(x, 0, z, x + 0.04, 0.08, z + 0.04, STEEL);
});
await model('capsulereturn', 'mikawaya.png', ({ box }) => {
  box(-0.16, 0, -0.14, 0.16, 0.6, 0.12, M(4, 0, 0, 1, 0.2));
  box(-0.155, 0.02, 0.12, 0.155, 0.58, 0.14, M(4));
  box(-0.17, 0.6, -0.15, 0.17, 0.62, 0.15, M(4, 0, 0, 1, 0.2));
  box(-0.06, 0.5, 0.14, 0.06, 0.53, 0.16, STEEL);
});
await model('dairycase', 'mikawaya.png', ({ box }) => {
  const W = 0.9, H = 1.72, D = 0.58;
  box(-W / 2, 0, -D / 2, W / 2, 0.25, D / 2, M(6, 0, 0.3, 1, 1));
  box(-W / 2, 0.25, -D / 2, -W / 2 + 0.04, H, D / 2, M(6)); box(W / 2 - 0.04, 0.25, -D / 2, W / 2, H, D / 2, M(6));
  box(-W / 2, H - 0.22, -D / 2, W / 2, H, D / 2, M(6, 0, 0, 1, 0.3));
  box(-W / 2 + 0.04, 0.25, -D / 2, W / 2 - 0.04, H - 0.22, -D / 2 + 0.04, M(5));
  for (let i = 0; i < 4; i++) { const y = 0.27 + i * 0.31; box(-W / 2 + 0.04, y, -D / 2 + 0.04, W / 2 - 0.04, y + 0.02, D / 2 - 0.06, STEEL); box(-W / 2 + 0.06, y + 0.02, -D / 2 + 0.08 + i * 0.03, W / 2 - 0.06, y + 0.26, -D / 2 + 0.1 + i * 0.03, M(5, 0, 1 - (i + 1) * 0.25, 1, 1 - i * 0.25)); }
});
await model('kamidana', 'mikawaya.png', ({ box, tri, quad }) => {
  box(-0.37, 0, -0.14, 0.37, 0.03, 0.14, LWOOD);
  box(-0.13, 0.03, -0.1, 0.13, 0.25, 0.08, M(7, 0, 0, 1, 0.5));
  box(-0.06, 0.06, 0.08, 0.06, 0.2, 0.085, M(7, 0, 0.5, 0.5, 1));
  const y = 0.25, r = M(7, 0, 0, 1, 0.5);
  quad([-0.17, y, 0.12], [0.17, y, 0.12], [0.17, y + 0.1, 0], [-0.17, y + 0.1, 0], [0, 0.8, 0.6], [[r[0], r[3]], [r[2], r[3]], [r[2], r[1]], [r[0], r[1]]]);
  quad([0.17, y, -0.12], [-0.17, y, -0.12], [-0.17, y + 0.1, 0], [0.17, y + 0.1, 0], [0, 0.8, -0.6], [[r[0], r[3]], [r[2], r[3]], [r[2], r[1]], [r[0], r[1]]]);
  for (const x of [-0.3, 0.26]) { box(x, 0.03, -0.03, x + 0.05, 0.12, 0.02, M(7, 0, 0.5, 0.5, 1)); box(x - 0.02, 0.12, -0.05, x + 0.07, 0.3, 0.04, M(7, 0.5, 0.5, 1, 0.75)); }
  box(-0.37, 0.38, 0.12, 0.37, 0.4, 0.14, M(7, 0.5, 0.75, 1, 1));
});
await model('watchcase', 'mikawaya.png', ({ box }) => {
  box(-0.105, 0, -0.08, 0.105, 0.14, 0.08, WOOD);
  box(-0.095, 0.14, -0.07, 0.095, 0.17, 0.07, M(8));
});
await model('puffbox', 'mikawaya.png', ({ box }) => {
  box(-0.105, 0, -0.07, 0.105, 0.16, 0.07, M(9, 0, 0, 1, 0.5));
  box(-0.1, 0.16, -0.065, 0.1, 0.23, 0.065, M(9, 0, 0.5, 1, 1));
  box(-0.105, 0.16, 0.06, 0.105, 0.23, 0.07, M(9, 0, 0, 1, 0.5));
});
await model('dagashirack', 'mikawaya.png', ({ box }) => {
  const W = 0.99, D = 0.495;
  for (const x of [-W / 2, W / 2 - 0.04]) box(x, 0, -D / 2, x + 0.04, 1.215, D / 2, WOOD);
  for (let i = 0; i < 4; i++) {
    const y = 0.1 + i * 0.28, z1 = D / 2 - i * 0.1;
    box(-W / 2 + 0.04, y, -D / 2, W / 2 - 0.04, y + 0.03, z1, LWOOD);
    box(-W / 2 + 0.05, y + 0.03, z1 - 0.2, W / 2 - 0.05, y + 0.22, z1 - 0.02, M(10, 0, i * 0.25, 1, (i + 1) * 0.25));
  }
  box(-W / 2 + 0.04, 0, -D / 2, W / 2 - 0.04, 1.215, -D / 2 + 0.02, WOOD);
});
await model('showcase', 'mikawaya.png', ({ box }) => {
  const W = 1.6, H = 0.96, D = 0.56;
  box(-W / 2, 0, -D / 2, W / 2, 0.42, D / 2, WOOD);
  box(-W / 2 + 0.03, 0.42, D / 2 - 0.02, W / 2 - 0.03, H - 0.04, D / 2, M(11));
  box(-W / 2 + 0.03, H - 0.04, -D / 2 + 0.02, W / 2 - 0.03, H - 0.02, D / 2, M(11, 0, 0, 1, 0.3));
  for (const x of [-W / 2, W / 2 - 0.03]) box(x, 0.42, -D / 2, x + 0.03, H, D / 2, WOOD);
  box(-W / 2, H - 0.02, -D / 2, W / 2, H, -D / 2 + 0.05, WOOD); box(-W / 2, H - 0.02, D / 2 - 0.03, W / 2, H, D / 2, WOOD);
  box(-W / 2 + 0.03, 0.42, -D / 2, W / 2 - 0.03, H - 0.04, -D / 2 + 0.02, WOOD);
});
await model('milkcarton', 'mikawaya.png', ({ box, quad }) => {
  box(-0.035, 0, -0.0385, 0.035, 0.18, 0.0385, M(12));
  const r = M(12, 0, 0, 1, 0.3);
  quad([-0.035, 0.18, 0.0385], [0.035, 0.18, 0.0385], [0.035, 0.205, 0], [-0.035, 0.205, 0], [0, 0.8, 0.6], [[r[0], r[3]], [r[2], r[3]], [r[2], r[1]], [r[0], r[1]]]);
  quad([0.035, 0.18, -0.0385], [-0.035, 0.18, -0.0385], [-0.035, 0.205, 0], [0.035, 0.205, 0], [0, 0.8, -0.6], [[r[0], r[3]], [r[2], r[3]], [r[2], r[1]], [r[0], r[1]]]);
  box(-0.036, 0.2, -0.004, 0.036, 0.21, 0.004, r);
});
await model('tubebox', 'mikawaya.png', ({ box }) => { box(-0.61, 0, -0.0225, 0.61, 0.04, 0.0225, M(13)); });
await model('broombin', 'mikawaya.png', ({ box, cyl }) => {
  cyl(0, 0, 0.15, 0, 0.3, 14, M(14));
  for (const [x, z, a] of [[-0.05, 0.02, 0.06], [0.05, -0.03, -0.08], [0.0, 0.06, 0.1]]) {
    box(x - 0.012 + a, 0.3, z - 0.012, x + 0.012 + a, 0.96, z + 0.012, M(15, 0.5, 0, 1, 1));
    box(x - 0.05, 0.12, z - 0.03, x + 0.05, 0.36, z + 0.03, M(15, 0, 0, 0.5, 1));
  }
});
console.log('ok');
