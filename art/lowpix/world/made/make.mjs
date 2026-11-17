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
  parts({ quad, tri, box, cyl });
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
console.log('ok');
