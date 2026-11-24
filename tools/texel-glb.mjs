// Texel density of every model file (no browser): for each GLB under public/models/lowpix/<set>/, the area-weighted
// median of texture px per metre over its triangles (UV area x atlas size vs world area, in the file's own metres),
// its atlas size and GPU bytes. Lists the ones under the standard (docs/ART.md: 256 px/m close; props are close).
// Usage: node tools/texel-glb.mjs [set=world] [min=230] [--json out.json]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const [set = 'world', minS = '230'] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--json');
const dir = resolve(import.meta.dirname, '..', 'public/models/lowpix', set);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const rows = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.glb')).sort()) {
  let doc;
  try { doc = await io.read(join(dir, f)); } catch (e) { rows.push({ id: f, err: e.message.slice(0, 60) }); continue; }
  const samples = [];
  let texW = 0, texH = 0;
  const nodes = doc.getRoot().listNodes().filter((n) => n.getMesh());
  for (const node of nodes) for (const prim of node.getMesh().listPrimitives()) {
    const M = node.getWorldMatrix(); // quantized positions: the node's transform brings them back to metres
    const tex = prim.getMaterial()?.getBaseColorTexture();
    if (!tex) continue;
    const size = tex.getSize() || (await sharp(Buffer.from(tex.getImage())).metadata().then((m) => [m.width, m.height]));
    [texW, texH] = size;
    const pos = prim.getAttribute('POSITION'), uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices();
    if (!pos || !uv) continue;
    const n = idx ? idx.getCount() : pos.getCount();
    const P = [0, 0, 0].map(() => [0, 0, 0]), U = [0, 0, 0].map(() => [0, 0]);
    for (let t = 0; t + 2 < n; t += 3) {
      for (let k = 0; k < 3; k++) {
        const v = idx ? idx.getScalar(t + k) : t + k; pos.getElement(v, P[k]); uv.getElement(v, U[k]);
        const [x, y, z] = P[k];
        P[k][0] = M[0] * x + M[4] * y + M[8] * z + M[12]; P[k][1] = M[1] * x + M[5] * y + M[9] * z + M[13]; P[k][2] = M[2] * x + M[6] * y + M[10] * z + M[14];
      }
      const ax = P[1][0] - P[0][0], ay = P[1][1] - P[0][1], az = P[1][2] - P[0][2], bx = P[2][0] - P[0][0], by = P[2][1] - P[0][1], bz = P[2][2] - P[0][2];
      const area = Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2;
      const ua = Math.abs((U[1][0] - U[0][0]) * (U[2][1] - U[0][1]) - (U[2][0] - U[0][0]) * (U[1][1] - U[0][1])) / 2;
      if (area > 1e-8 && ua > 0) samples.push([Math.sqrt(ua * texW * texH / area), area]);
    }
  }
  if (!samples.length) { rows.push({ id: f.replace('.glb', ''), d: 0, area: 0, tex: [texW, texH] }); continue; }
  samples.sort((a, b) => a[0] - b[0]);
  const tot = samples.reduce((s, r) => s + r[1], 0);
  let c = 0, med = samples[samples.length - 1][0];
  for (const [d, a] of samples) { c += a; if (c >= tot / 2) { med = d; break; } }
  rows.push({ id: f.replace('.glb', ''), d: Math.round(med), area: +tot.toFixed(3), tex: [texW, texH], mb: +(texW * texH * 4 * 4 / 3 / 1048576).toFixed(2) });
}
const min = +minS, bad = rows.filter((r) => !r.err && r.d < min).sort((a, b) => a.d - b.d);
console.log(`${set}: ${rows.length} models, ${bad.length} under ${min} px/m, atlases ${rows.reduce((s, r) => s + (r.mb || 0), 0).toFixed(1)} MB`);
for (const r of bad) console.log(`  ${String(r.d).padStart(5)} px/m  ${String(r.area).padStart(8)} m²  ${r.tex.join('x').padEnd(10)} ${r.id}`);
for (const r of rows.filter((x) => x.err)) console.log('  ERR', r.id, r.err);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
