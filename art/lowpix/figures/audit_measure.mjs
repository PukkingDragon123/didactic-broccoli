// Measure the shipped figure GLBs for art/lowpix/figures/audit.py:
//   node art/lowpix/figures/audit_measure.mjs <outDir> <series/id> [<series/id> ...]
// For every figure: decodes public/models/lowpix/figures/<series>/<id>.glb (meshopt + quantization), and writes
// <outDir>/<series>/<id>/measure.json: per part (the top-level node: "base*", "model_<name>" or another spec part)
// its world area (mm²), its texture's pixel area, triangle count, world bounds and its UV triangles in texture pixels,
// plus every texture as tex<i>.png, so the audit can compute texel density, flatness, noise and fill.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '../../..');
const [outDir, ...keys] = process.argv.slice(2);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

function mat4(n) { // local matrix of a gltf-transform Node (column-major)
  return n.getMatrix();
}
function mul(a, b) { // column-major 4x4
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
const xf = (m, p) => [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);

for (const key of keys) {
  const glb = resolve(ROOT, 'public/models/lowpix/figures', key + '.glb');
  const dir = resolve(outDir, key);
  mkdirSync(dir, { recursive: true });
  if (!existsSync(glb)) { writeFileSync(join(dir, 'measure.json'), JSON.stringify({ key, missing: true })); continue; }
  const doc = await io.read(glb);
  await doc.transform(dequantize());
  const root = doc.getRoot();
  const texs = root.listTextures();
  const sizes = [];
  for (let i = 0; i < texs.length; i++) {
    const t = texs[i];
    const png = await sharp(Buffer.from(t.getImage())).png().toBuffer();
    writeFileSync(join(dir, `tex${i}.png`), png);
    sizes.push(t.getSize());
  }
  const parts = {};
  const sep = new Set((JSON.parse(readFileSync(resolve(ROOT, 'src/figures/lowpix.manifest.json'), 'utf8'))[key] || {}).separate || []);
  const scene = root.listScenes()[0];
  const verts = []; // [x, y, z] of every triangle corner (for the shelf contact) and the surface centroid
  const com = [0, 0, 0];
  let comA = 0;
  const walk = (node, M, top) => {
    const W = mul(M, mat4(node));
    const name = top || node.getName();
    if (sep.has(node.getName())) return; // a separate moving part (a dart, a key) is not part of the standing toy
    const mesh = node.getMesh();
    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION'), uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices();
        const mat = prim.getMaterial();
        const texInfo = mat?.getBaseColorTextureInfo();
        const tex = mat?.getBaseColorTexture();
        const ti = tex ? texs.indexOf(tex) : -1;
        const tt = texInfo?.getExtension('KHR_texture_transform');
        const off = tt ? tt.getOffset() : [0, 0], sc = tt ? tt.getScale() : [1, 1];
        const P = (part) => parts[part] || (parts[part] = { name: part, area: 0, uvpx: 0, tris: 0, tex: {}, lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9], uvtris: {} });
        const p = P(name);
        const n = idx ? idx.getCount() : pos.getCount();
        const a = [], b = [], c = [], ua = [], ub = [], uc = [];
        const [tw, th] = ti >= 0 ? sizes[ti] : [1, 1];
        for (let i = 0; i < n; i += 3) {
          const i0 = idx ? idx.getScalar(i) : i, i1 = idx ? idx.getScalar(i + 1) : i + 1, i2 = idx ? idx.getScalar(i + 2) : i + 2;
          const A = xf(W, pos.getElement(i0, a)), B = xf(W, pos.getElement(i1, b)), C = xf(W, pos.getElement(i2, c));
          for (const V of [A, B, C]) for (let k = 0; k < 3; k++) { p.lo[k] = Math.min(p.lo[k], V[k]); p.hi[k] = Math.max(p.hi[k], V[k]); }
          const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
          const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
          const area = 0.5 * Math.hypot(...cr);
          p.area += area; p.tris++;
          verts.push(A, B, C);
          for (let k = 0; k < 3; k++) com[k] += area * (A[k] + B[k] + C[k]) / 3;
          comA += area;
          if (uv && ti >= 0) {
            const q = [uv.getElement(i0, ua), uv.getElement(i1, ub), uv.getElement(i2, uc)].map((t) => [(t[0] * sc[0] + off[0]) * tw, (t[1] * sc[1] + off[1]) * th]);
            const uva = 0.5 * Math.abs((q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1]));
            p.uvpx += uva;
            p.tex[ti] = (p.tex[ti] || 0) + area;
            (p.uvtris[ti] || (p.uvtris[ti] = [])).push(q.flat().map((v) => Math.round(v * 10) / 10));
          }
        }
      }
    }
    for (const ch of node.listChildren()) walk(ch, W, name === 'lay' ? null : name);
  };
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const n of scene.listChildren()) walk(n, I, null);
  // what touches the shelf: the corners within 0.8 mm of the lowest point (a slightly uneven bottom still sits) (x, z rounded to 0.1 mm)
  const minY = Math.min(...verts.map((v) => v[1]));
  const contact = [...new Set(verts.filter((v) => v[1] < minY + 0.8).map((v) => `${Math.round(v[0] * 10) / 10},${Math.round(v[2] * 10) / 10}`))].map((s) => s.split(',').map(Number));
  writeFileSync(join(dir, 'measure.json'), JSON.stringify({ key, textures: sizes, parts: Object.values(parts), minY, contact, com: com.map((v) => v / Math.max(comA, 1e-9)) }));
}
