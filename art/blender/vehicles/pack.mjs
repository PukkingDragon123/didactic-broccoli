// Pack the Blender-modelled vehicles for the game: node art/blender/vehicles/pack.mjs [id ...]  (default: packer_truck
// packer_truck_lod). Reads art/blender/vehicles/out/<id>.glb (packer.py), keeps the parts as they are (each moving part
// has its own material, src/kit/assets.js bakes one mesh per material), dedups, quantizes + meshopt, lossless WebP
// textures (none in a _lod: it borrows the full model's materials by name); writes
// public/models/lowpix/world_arch/<id>.glb and its manifest entry (our own model: no credit line).
// Then `node art/lowpix/world_arch/pack.mjs` regenerates src/kit/lowpixArch.js from the manifest.
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { webpTextures } from '../../../tools/webp-glb.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const OUT = resolve(ROOT, 'public/models/lowpix/world_arch');
const NAMES = { packer_truck: '2-ton packer garbage truck (our own model, Blender, art/blender/vehicles/packer.py)', packer_truck_lod: 'packer truck, far LOD', candy_kit: "Gen-san's FREE CANDY van kit: roof sign, side panels, tray of sweets (our own model, Blender, art/blender/vehicles/van_kit.py)" };
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['packer_truck', 'packer_truck_lod'];
const manPath = join(OUT, 'manifest.json');
const man = JSON.parse(readFileSync(manPath, 'utf8'));
for (const id of ids) {
  const doc = await io.read(resolve(ROOT, 'art/blender/vehicles/out', id + '.glb'));
  const root = doc.getRoot();
  // the LOD carries no textures: the game gives its meshes the full model's materials, by name (one atlas download)
  if (id.endsWith('_lod')) for (const m of root.listMaterials()) m.setBaseColorTexture(null);
  await doc.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }), prune(),  // (materials stay apart: the moving parts are found by them)
    reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await webpTextures(doc);
  const outPath = join(OUT, id + '.glb');
  await io.write(outPath, doc);
  const b = getBounds(root.listScenes()[0]);
  let tris = 0;
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
  const texs = await Promise.all(root.listTextures().map((t) => sharp(Buffer.from(t.getImage())).metadata()));
  const tex = texs.reduce((m, x) => (x.width * x.height > m[0] * m[1] ? [x.width, x.height] : m), [0, 0]);
  man[id] = { id, name: NAMES[id] || id, min: b.min.map((v) => +v.toFixed(3)), max: b.max.map((v) => +v.toFixed(3)), tris, tex, bytes: statSync(outPath).size, ppm: 256 };
  console.log(`packed ${id}: ${tris} tris, ${root.listMaterials().length} materials, ${(man[id].bytes / 1024).toFixed(0)} KB`);
}
writeFileSync(manPath, JSON.stringify(Object.fromEntries(Object.entries(man).sort()), null, 1) + '\n');
