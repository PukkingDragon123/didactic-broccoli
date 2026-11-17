// Pre-simplify a very dense scan before lowpix converts it (lowpix runs out of memory on 500k+ triangle scans):
//   node art/lowpix/figures/simplify.mjs <in.gltf|glb> <out.gltf> <target triangles>
// meshoptimizer simplification, UV seams kept; textures and node transforms are left as they are.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const [inp, out, target] = process.argv.slice(2);
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
let tris = 0;
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() || p.getAttribute('POSITION').getCount()) / 3;
const ratio = Math.min(1, +target / Math.max(tris, 1));
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.05 }), prune());
let after = 0;
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) after += (p.getIndices()?.getCount() || p.getAttribute('POSITION').getCount()) / 3;
// write beside the source without touching its files: new names for the buffer and the images
const tag = out.split('/').pop().replace(/\.gltf$/, '');
doc.getRoot().listBuffers().forEach((b, i) => b.setURI(`${tag}_${i}.bin`));
doc.getRoot().listTextures().forEach((t, i) => t.setURI(`${tag}_tex${i}.${t.getMimeType() === 'image/png' ? 'png' : 'jpg'}`));
await io.write(out, doc);
console.log(`simplified ${Math.round(tris)} -> ${Math.round(after)} triangles`);
